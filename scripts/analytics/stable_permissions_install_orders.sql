-- Stable permission names: plan checks V2, V5, V6, V7 and V8 against the real platform.
-- plans/stable-permission-names-plan.md section 10. Everything runs in one transaction that rolls back.
--
--   for o in starter_first owner_first; do
--     docker exec -i postgres18-ext psql -U postgres -d appdb -v order=$o -f - \
--       < scripts/analytics/stable_permissions_install_orders.sql > /tmp/$o.txt 2>&1
--   done
--   diff <(grep '^SNAP' /tmp/starter_first.txt) <(grep '^SNAP' /tmp/owner_first.txt)   # V2: no output
--   grep -h FAIL /tmp/starter_first.txt /tmp/owner_first.txt                           # no output
--
-- Run it against a local stack only, never a catalog or customer tenant.
-- zz_deploy_* stand in for the modeler: they write the rows the blueprints show, following Stage 2a's
-- holder table. So this proves the platform honors the design, not that the modeler's prose does.
\set QUIET on
\pset format unaligned
\pset tuples_only on
BEGIN;

CREATE FUNCTION public.zz_auth(ext text) RETURNS void LANGUAGE plpgsql AS $f$
DECLARE u record;
BEGIN
  RESET ROLE;
  SELECT email, display_name, first_name, last_name INTO u FROM public.users WHERE external_id = ext;
  PERFORM set_config('role', 'semantius_user', true);
  PERFORM set_config('request.jwt.claim.sub', ext, true);
  PERFORM set_config('request.jwt.claim.email', u.email, true);
  PERFORM set_config('request.jwt.claim.name', coalesce(u.display_name, ''), true);
  PERFORM set_config('request.jwt.claim.given_name', coalesce(u.first_name, ''), true);
  PERFORM set_config('request.jwt.claim.family_name', coalesce(u.last_name, ''), true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.aud', '', true);
  PERFORM set_config('app.current_user_id', NULL, false);
  PERFORM set_config('app.current_external_id', NULL, false);
  PERFORM set_config('app.user_permissions', NULL, false);
  PERFORM set_config('app.context_initialized', NULL, false);
  PERFORM set_config('app.oauth_scopes', NULL, false);
END $f$;

-- Runs a statement in a subtransaction and reports whether it did what the check expects.
CREATE FUNCTION public.zz_try(label text, stmt text, expect_ok boolean) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE outcome text;
BEGIN
  BEGIN
    EXECUTE stmt;
    IF expect_ok THEN
      RETURN 'PASS ' || label;
    END IF;
    RAISE EXCEPTION 'zz_succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'zz_succeeded' THEN
      RETURN 'FAIL ' || label || ' [it succeeded]';
    END IF;
    outcome := CASE WHEN expect_ok THEN 'FAIL ' ELSE 'PASS ' END;
    RETURN outcome || label || ' [' || left(SQLERRM, 100) || ']';
  END;
END $f$;

CREATE FUNCTION public.zz_has(label text, perm text, expect boolean) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE got boolean;
BEGIN
  got := public.has_permission(perm);
  RETURN CASE WHEN got = expect THEN 'PASS ' ELSE 'FAIL ' END || label || ' (' || perm || ' -> ' || got || ')';
END $f$;

-- The caller's effective names on these two modules, sorted.
CREATE FUNCTION public.zz_list() RETURNS text LANGUAGE plpgsql AS $f$
DECLARE names text[] := ARRAY['hiring-starter:read','hiring-starter:manage','hiring-starter:admin',
  'ats-candidate-crm:read','ats-candidate-crm:manage','ats-candidate-crm:admin',
  'ats-candidate-crm:read_candidates','ats-candidate-crm:write_candidates','ats-candidate-crm:hire_candidate',
  'ats-candidate-crm:view_all_candidates','ats-candidate-crm:read_candidate_notes','ats-candidate-crm:write_candidate_notes'];
BEGIN
  RETURN (SELECT string_agg(n, ' ' ORDER BY n) FROM unnest(names) n WHERE public.has_permission(n));
END $f$;

-- Stage 2a's holder table.
CREATE FUNCTION public.zz_perm(pname text, descr text, mod_id bigint, entity_lives_here boolean) RETURNS void LANGUAGE plpgsql AS $f$
DECLARE holder bigint; holder_slug text; this_slug text; prefix text := split_part(pname, ':', 1);
BEGIN
  SELECT module_slug INTO this_slug FROM public.modules WHERE id = mod_id;
  SELECT p.module_id, m.module_slug INTO holder, holder_slug FROM public.permissions p JOIN public.modules m ON m.id = p.module_id WHERE p.permission_name = pname;
  IF holder IS NULL THEN
    INSERT INTO public.permissions (permission_name, description, module_id) VALUES (pname, descr, mod_id);
  ELSIF holder <> mod_id THEN
    IF prefix = this_slug THEN
      UPDATE public.permissions SET module_id = mod_id, description = descr WHERE permission_name = pname;
    ELSIF entity_lives_here AND holder_slug <> prefix THEN
      UPDATE public.permissions SET module_id = mod_id WHERE permission_name = pname;
    END IF;
  END IF;
END $f$;

CREATE FUNCTION public.zz_incl(a text, b text) RETURNS void LANGUAGE sql AS $f$
  INSERT INTO public.permission_hierarchy (including_permission_name, included_permission_name) VALUES (a, b)
  ON CONFLICT DO NOTHING;
$f$;

CREATE FUNCTION public.zz_role(rslug text, rname text, mod_id bigint, perm text) RETURNS bigint LANGUAGE plpgsql AS $f$
DECLARE rid bigint;
BEGIN
  SELECT id INTO rid FROM public.roles WHERE slug = rslug;
  IF rid IS NULL THEN
    INSERT INTO public.roles (role_name, slug, module_id) VALUES (rname, rslug, mod_id) RETURNING id INTO rid;
  END IF;
  INSERT INTO public.role_permissions (role_id, permission_name) VALUES (rid, perm) ON CONFLICT DO NOTHING;
  RETURN rid;
END $f$;

CREATE FUNCTION public.zz_module(slug text, name text) RETURNS bigint LANGUAGE plpgsql AS $f$
DECLARE mid bigint;
BEGIN
  SELECT id INTO mid FROM public.modules WHERE module_slug = slug;
  IF mid IS NULL THEN
    INSERT INTO public.modules (module_name, module_slug, description) VALUES (name, slug, name) RETURNING id INTO mid;
  END IF;
  RETURN mid;
END $f$;

-- The gate rule both specs carry, identical JSON under one name.
CREATE FUNCTION public.zz_rule() RETURNS jsonb LANGUAGE sql AS $f$
  SELECT '[{"code":"99101","name":"hire_requires_gate","message":"Only a holder of the hire gate can move a candidate to hired.",
    "jsonlogic":{"if":[{"==":[{"var":"workflow_state"},"hired"]},{"require_permission":"ats-candidate-crm:hire_candidate"},true]}}]'::jsonb;
$f$;

CREATE FUNCTION public.zz_candidates(mod_id bigint) RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
  INSERT INTO public.entities (table_name, singular, singular_label, plural_label, description, module_id, view_permission, edit_permission, id_column, label_column)
  VALUES ('candidates', 'candidate', 'Candidate', 'Candidates', 'V-check entity', mod_id, 'ats-candidate-crm:read_candidates', 'ats-candidate-crm:write_candidates', 'id', 'label');
  INSERT INTO public.fields (table_name, field_name, title, format, field_order) VALUES ('candidates', 'workflow_state', 'State', 'text', 20);
  UPDATE public.entities SET validation_rules = public.zz_rule() WHERE table_name = 'candidates';
END $f$;

CREATE FUNCTION public.zz_deploy_starter() RETURNS void LANGUAGE plpgsql AS $f$
DECLARE m bigint := public.zz_module('hiring-starter', 'Hiring Starter');
  lives boolean;
BEGIN
  lives := NOT EXISTS (SELECT 1 FROM public.entities WHERE table_name = 'candidates') OR EXISTS (SELECT 1 FROM public.entities WHERE table_name = 'candidates' AND module_id = m);
  PERFORM public.zz_perm('hiring-starter:read', 'Read access to every entity in the module', m, true);
  PERFORM public.zz_perm('hiring-starter:manage', 'Edit operational records', m, true);
  PERFORM public.zz_perm('hiring-starter:admin', 'Edit reference data', m, true);
  PERFORM public.zz_perm('ats-candidate-crm:read_candidates', 'Read Candidates', m, lives);
  PERFORM public.zz_perm('ats-candidate-crm:write_candidates', 'Write Candidates', m, lives);
  PERFORM public.zz_perm('ats-candidate-crm:hire_candidate', 'Transition candidates into hired', m, lives);
  PERFORM public.zz_perm('ats-candidate-crm:view_all_candidates', 'View all candidates', m, lives);
  PERFORM public.zz_incl('hiring-starter:admin', 'hiring-starter:manage');
  PERFORM public.zz_incl('hiring-starter:manage', 'hiring-starter:read');
  PERFORM public.zz_incl('hiring-starter:read', 'ats-candidate-crm:read_candidates');
  PERFORM public.zz_incl('hiring-starter:manage', 'ats-candidate-crm:write_candidates');
  PERFORM public.zz_incl('ats-candidate-crm:write_candidates', 'ats-candidate-crm:read_candidates');
  PERFORM public.zz_incl('hiring-starter:admin', 'ats-candidate-crm:hire_candidate');
  PERFORM public.zz_incl('hiring-starter:admin', 'ats-candidate-crm:view_all_candidates');
  PERFORM public.zz_role('hiring_starter_viewer', 'Starter Viewer', m, 'hiring-starter:read');
  PERFORM public.zz_role('hiring_starter_manager', 'Starter Manager', m, 'hiring-starter:manage');
  PERFORM public.zz_role('hiring_starter_admin', 'Starter Admin', m, 'hiring-starter:admin');
  IF NOT EXISTS (SELECT 1 FROM public.entities WHERE table_name = 'candidates') THEN PERFORM public.zz_candidates(m); END IF;
END $f$;

CREATE FUNCTION public.zz_deploy_crm() RETURNS void LANGUAGE plpgsql AS $f$
DECLARE m bigint := public.zz_module('ats-candidate-crm', 'Candidate CRM');
BEGIN
  PERFORM public.zz_perm('ats-candidate-crm:read', 'Read access to every entity in the module', m, true);
  PERFORM public.zz_perm('ats-candidate-crm:manage', 'Edit operational records', m, true);
  PERFORM public.zz_perm('ats-candidate-crm:admin', 'Edit reference data', m, true);
  PERFORM public.zz_perm('ats-candidate-crm:read_candidates', 'Read Candidates (owner)', m, true);
  PERFORM public.zz_perm('ats-candidate-crm:write_candidates', 'Write Candidates (owner)', m, true);
  PERFORM public.zz_perm('ats-candidate-crm:hire_candidate', 'Transition candidates into hired (owner)', m, true);
  PERFORM public.zz_perm('ats-candidate-crm:view_all_candidates', 'View all candidates (owner)', m, true);
  PERFORM public.zz_perm('ats-candidate-crm:read_candidate_notes', 'Read Candidate Notes', m, true);
  PERFORM public.zz_perm('ats-candidate-crm:write_candidate_notes', 'Write Candidate Notes', m, true);
  PERFORM public.zz_incl('ats-candidate-crm:admin', 'ats-candidate-crm:manage');
  PERFORM public.zz_incl('ats-candidate-crm:manage', 'ats-candidate-crm:read');
  PERFORM public.zz_incl('ats-candidate-crm:read', 'ats-candidate-crm:read_candidates');
  PERFORM public.zz_incl('ats-candidate-crm:read', 'ats-candidate-crm:read_candidate_notes');
  PERFORM public.zz_incl('ats-candidate-crm:manage', 'ats-candidate-crm:write_candidates');
  PERFORM public.zz_incl('ats-candidate-crm:manage', 'ats-candidate-crm:write_candidate_notes');
  PERFORM public.zz_incl('ats-candidate-crm:write_candidates', 'ats-candidate-crm:read_candidates');
  PERFORM public.zz_incl('ats-candidate-crm:write_candidate_notes', 'ats-candidate-crm:read_candidate_notes');
  PERFORM public.zz_incl('ats-candidate-crm:admin', 'ats-candidate-crm:hire_candidate');
  PERFORM public.zz_incl('ats-candidate-crm:admin', 'ats-candidate-crm:view_all_candidates');
  PERFORM public.zz_role('ats_candidate_crm_viewer', 'CRM Viewer', m, 'ats-candidate-crm:read');
  PERFORM public.zz_role('ats_candidate_crm_manager', 'CRM Manager', m, 'ats-candidate-crm:manage');
  PERFORM public.zz_role('ats_candidate_crm_admin', 'CRM Admin', m, 'ats-candidate-crm:admin');
  IF EXISTS (SELECT 1 FROM public.entities WHERE table_name = 'candidates') THEN
    UPDATE public.entities SET module_id = m WHERE table_name = 'candidates' AND module_id <> m; -- adoption: columns untouched
  ELSE
    PERFORM public.zz_candidates(m);
  END IF;
  INSERT INTO public.entities (table_name, singular, singular_label, plural_label, description, module_id, view_permission, edit_permission, id_column, label_column)
  VALUES ('candidate_notes', 'candidate_note', 'Candidate Note', 'Candidate Notes', 'V-check entity only the CRM has', m, 'ats-candidate-crm:read_candidate_notes', 'ats-candidate-crm:write_candidate_notes', 'id', 'label');
END $f$;

INSERT INTO public.users (id, external_id, email, display_name, first_name, last_name) VALUES
  (9101, 'v-starter-viewer', 'v-starter-viewer@test.com', 'Starter Viewer', 'S', 'V'),
  (9102, 'v-starter-manager', 'v-starter-manager@test.com', 'Starter Manager', 'S', 'M'),
  (9103, 'v-starter-admin', 'v-starter-admin@test.com', 'Starter Admin', 'S', 'A'),
  (9104, 'v-crm-admin', 'v-crm-admin@test.com', 'CRM Admin', 'C', 'A'),
  (9105, 'v-crm-manager', 'v-crm-manager@test.com', 'CRM Manager', 'C', 'M');

\echo === :order
SELECT public.zz_deploy_starter() WHERE :'order' = 'starter_first';
SELECT public.zz_deploy_crm() WHERE :'order' = 'owner_first';

INSERT INTO public.user_roles (user_id, role_id) SELECT 9101, id FROM public.roles WHERE slug = 'hiring_starter_viewer' AND :'order' = 'starter_first';
INSERT INTO public.user_roles (user_id, role_id) SELECT 9102, id FROM public.roles WHERE slug = 'hiring_starter_manager' AND :'order' = 'starter_first';
INSERT INTO public.user_roles (user_id, role_id) SELECT 9103, id FROM public.roles WHERE slug = 'hiring_starter_admin' AND :'order' = 'starter_first';

-- V7, the before half: effective names of the starter's roles before the second module deploys.
SELECT public.zz_auth('v-starter-manager') WHERE :'order' = 'starter_first';
SELECT 'BEFORE manager: ' || public.zz_list() WHERE :'order' = 'starter_first';
SELECT public.zz_auth('v-starter-viewer') WHERE :'order' = 'starter_first';
SELECT 'BEFORE viewer: ' || public.zz_list() WHERE :'order' = 'starter_first';
RESET ROLE;

-- V8, first half. A module holding a permission that an entity in ANOTHER module names cannot be deleted:
-- entities.edit_permission is ON DELETE RESTRICT, and permissions.module_id cascades into it. (The module
-- that hosts the entity is a different case: the entity goes with it, so nothing blocks that delete.)
SELECT public.zz_module('zz-holder', 'Holder only') WHERE :'order' = 'starter_first';
SELECT public.zz_try('V8 a module holding a permission an entity elsewhere names cannot be deleted', $s$
  UPDATE public.permissions SET module_id = (SELECT id FROM public.modules WHERE module_slug = 'zz-holder') WHERE permission_name = 'ats-candidate-crm:write_candidates';
  DELETE FROM public.modules WHERE module_slug = 'zz-holder'$s$, false)
WHERE :'order' = 'starter_first';
DELETE FROM public.modules WHERE module_slug = 'zz-holder';

-- The second module deploys.
SELECT public.zz_deploy_crm() WHERE :'order' = 'starter_first';
SELECT public.zz_deploy_starter() WHERE :'order' = 'owner_first';

INSERT INTO public.user_roles (user_id, role_id) SELECT 9101, id FROM public.roles WHERE slug = 'hiring_starter_viewer' AND :'order' = 'owner_first';
INSERT INTO public.user_roles (user_id, role_id) SELECT 9102, id FROM public.roles WHERE slug = 'hiring_starter_manager' AND :'order' = 'owner_first';
INSERT INTO public.user_roles (user_id, role_id) SELECT 9103, id FROM public.roles WHERE slug = 'hiring_starter_admin' AND :'order' = 'owner_first';
INSERT INTO public.user_roles (user_id, role_id) SELECT 9104, id FROM public.roles WHERE slug = 'ats_candidate_crm_admin';
INSERT INTO public.user_roles (user_id, role_id) SELECT 9105, id FROM public.roles WHERE slug = 'ats_candidate_crm_manager';

-- V7, the after half.
SELECT public.zz_auth('v-starter-manager');
SELECT 'AFTER manager: ' || public.zz_list();
SELECT public.zz_auth('v-starter-viewer');
SELECT 'AFTER viewer: ' || public.zz_list();

-- V6: the starter's manager writes candidates and nothing else of the CRM.
SELECT public.zz_auth('v-starter-manager');
SELECT public.zz_try('V6 starter manager can write candidates', $s$INSERT INTO public.candidates (label, workflow_state) VALUES ('from starter manager', 'prospect')$s$, true);
SELECT public.zz_try('V6 starter manager cannot write an entity only the CRM has', $s$INSERT INTO public.candidate_notes (label) VALUES ('nope')$s$, false);
SELECT public.zz_has('V6 starter manager does not hold the CRM manage bundle', 'ats-candidate-crm:manage', false);
SELECT public.zz_has('V6 starter manager does not hold the gate', 'ats-candidate-crm:hire_candidate', false);

-- V5: the gate rule. The manager fails it; both admins pass it, one through each module's bundle.
SELECT public.zz_try('V5 starter manager cannot move a candidate to hired', $s$INSERT INTO public.candidates (label, workflow_state) VALUES ('m', 'hired')$s$, false);
SELECT public.zz_auth('v-starter-admin');
SELECT public.zz_try('V5 starter admin passes the gate rule', $s$INSERT INTO public.candidates (label, workflow_state) VALUES ('sa', 'hired')$s$, true);
SELECT public.zz_auth('v-crm-admin');
SELECT public.zz_try('V5 owner admin passes the gate rule', $s$INSERT INTO public.candidates (label, workflow_state) VALUES ('ca', 'hired')$s$, true);
SELECT public.zz_try('V5 owner admin writes the CRM-only entity', $s$INSERT INTO public.candidate_notes (label) VALUES ('ok')$s$, true);

-- Viewer: reads candidates, not the CRM-only entity.
SELECT public.zz_auth('v-starter-viewer');
SELECT 'starter viewer sees candidates rows: ' || (SELECT (count(*) > 0)::text FROM public.candidates);
SELECT 'starter viewer sees candidate_notes rows: ' || (SELECT (count(*) > 0)::text FROM public.candidate_notes);
SELECT public.zz_try('starter viewer cannot write candidates', $s$INSERT INTO public.candidates (label, workflow_state) VALUES ('v', 'prospect')$s$, false);
RESET ROLE;
SELECT public.zz_auth('v-crm-admin');
SELECT 'owner admin sees candidate_notes rows: ' || (SELECT (count(*) > 0)::text FROM public.candidate_notes);
RESET ROLE;

-- V2: everything a deploy leaves behind, comparable across the two orders.
SELECT 'SNAP perm ' || p.permission_name || ' held by ' || m.module_slug
FROM public.permissions p JOIN public.modules m ON m.id = p.module_id
WHERE p.permission_name LIKE 'hiring-starter:%' OR p.permission_name LIKE 'ats-candidate-crm:%' ORDER BY 1;
SELECT 'SNAP incl ' || including_permission_name || ' -> ' || included_permission_name
FROM public.permission_hierarchy
WHERE including_permission_name LIKE 'hiring-starter:%' OR including_permission_name LIKE 'ats-candidate-crm:%' ORDER BY 1;
SELECT 'SNAP entity ' || e.table_name || ' in ' || m.module_slug || ' view ' || e.view_permission || ' edit ' || e.edit_permission || ' rules ' || coalesce((SELECT string_agg(x->>'name', ',') FROM jsonb_array_elements(e.validation_rules) x), '-')
FROM public.entities e JOIN public.modules m ON m.id = e.module_id
WHERE e.table_name IN ('candidates', 'candidate_notes') ORDER BY 1;
SELECT 'SNAP grant ' || r.slug || ' ' || rp.permission_name
FROM public.role_permissions rp JOIN public.roles r ON r.id = rp.role_id
WHERE r.slug LIKE 'hiring_starter_%' OR r.slug LIKE 'ats_candidate_crm_%' ORDER BY 1;

-- V8, second half: after adoption the starter can go; the owner's rows and access survive.
DELETE FROM public.modules WHERE module_slug = 'hiring-starter';
SELECT 'V8 starter gone, its rows gone: ' || (SELECT count(*)::text FROM public.permissions WHERE permission_name LIKE 'hiring-starter:%');
SELECT 'V8 owner-named rows kept: ' || (SELECT count(*)::text FROM public.permissions WHERE permission_name LIKE 'ats-candidate-crm:%');
SELECT public.zz_auth('v-crm-admin');
SELECT public.zz_try('V8 owner admin still passes the gate after the starter is deleted', $s$INSERT INTO public.candidates (label, workflow_state) VALUES ('after delete', 'hired')$s$, true);
RESET ROLE;

ROLLBACK;
