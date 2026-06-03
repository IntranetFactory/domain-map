# Plan 3: Personas, RACI, and RBAC extraction (research and design)

Scope: give the catalog a real, self-contained, deployment-visible persona and responsibility
layer, and remove the `_core` RBAC pollution. This is the largest plan and the only one with
a standing-research component. Decisions in [model-map-rework-plan.md](model-map-rework-plan.md).

Depends on Plan 2 (the per-entity write tiers feed the role/permission derivations). Skill
actors (R = agent) are schema-ready now but populated only when the process-skills layer
exists (B7, deferred).

Out of scope: the process-skills layer itself (deferred); the B3 score reconciliation (postponed).

## Resolved decisions
- **B5.** Catalog-owned RBAC inputs replace the `_core` pollution. The operational persona IS
  a `domain_roles` row, not a separate archetype entity.
- **AI-native RACI actor.** The RACI actor is polymorphic: a persona OR an agent skill. Bake
  the shape in now; populate persona actors now, skill actors when process-skills land.
- **Process-to-permission edge.** `process_id` on the gated lifecycle transition is sufficient
  for the gate layer, PROVIDED baseline read/manage/admin keep deriving from `role_modules`
  reach (module-level). The two axes compose: reach gives the baseline tier, RACI gives gates.
- **C/I realization (no new RBAC tier).** R -> permission (persona) or `skill_tools` coverage
  (skill); A -> approval gate (persona, or skill for autonomous); C -> a consultation lifecycle
  state when input is required (`consultation_blocking=true`) else a read grant; I -> a
  notification side effect (`trigger_event` / `webhook_receiver`) to a persona or skill.
- **M9 = SELF-CONTAINMENT (revised 2026-06-02).** The original "hard closure = embedded_master +
  role_modules" was WRONG: `embedded_master` is precisely the mechanism that makes a module deploy
  STANDALONE (the canonical owner is optional, deferred-to-if-installed, never required), and
  persona `role_modules` reach is relatedness, not a deploy requirement. A correctly-modeled module
  therefore has NO hard prerequisites, so there is no "deployable closure / required modules"
  output. Instead: (a) self-containment is an AUDIT check (M9 in the band: a `contributor` or a
  required non-embedded `consumer` of another module's entity is a violation; fix by embedding or
  making it optional), and (b) merely-related modules (data coupling + handoffs + shared personas)
  are the informational `related_modules` front-matter hint, never a requirement.
- **M13.** Default role grant from market RACI: owner -> `admin`, contributor -> `manage`,
  consumer -> `read`, for the functions owning/contributing/consuming the module's domain.
- **`_core` roles are throwaway.** The 104 catalog roles are unreviewed and rotted: DELETE,
  do NOT migrate. Persona research is authored FRESH.
- **Standing process.** Personas + operational RACI become a research phase (FUNCTION-ANCHORED
  discovery, per-domain coverage; see step C and references/roles.md section 7) plus a review band
  (replacing the E-band), so the layer cannot re-rot. `entity_type` classification (deferred from
  Plan 2) folds into the same per-domain review.
- **Legacy flags.** `has_single_approver` ("A = exactly one") and `has_submit_lock` (ownership)
  are the data-object-level human-only RACI fragments this generalizes; coexist short term with
  a consistency invariant, long term derivable from `process_raci`.

## Sequenced steps

### A. New catalog entities and columns (store, module 1001)
STORE only what is AUTHORED. The permission bundle, hierarchy, and permission-name mirror are
DERIVED and EMITTED (step B), NOT stored: storing derived RBAC is exactly what rotted `_core`,
so we do not recreate it. Create only:
- `domain_roles` (authored persona): `role_code`, `role_name`, `description`, `business_function_id` (nullable, function-scoping), `record_status`.
- `process_raci` (authored RACI): `process_id` -> `processes`; `actor_role_id` -> `domain_roles` (nullable); `actor_skill_id` -> `skills` (nullable); `raci` enum (responsible/accountable/consulted/informed); `consultation_blocking` bool. Enforce exactly-one-actor as a hard `validation_rules` (JsonLogic) entry on the entity, NOT a SQL CHECK: the platform compiles `validation_rules` into `BEFORE INSERT/UPDATE` triggers and rejects the write atomically (see [use-semantius data-modeling.md, "Computed fields and validation rules"](../.agents/skills/use-semantius/references/data-modeling.md)), so this is a real write-time constraint. Expression: `or(and(actor_role_id != null, actor_skill_id == null), and(actor_role_id == null, actor_skill_id != null))`.
- Re-point `role_modules.role_id` to `domain_roles` (authored reach; see A1 for the 387 existing rows + ordering).
- Add `data_object_lifecycle_states.process_id` (reference to `processes`, nullable): the process-to-permission edge.
- NOT created as stored entities (revises the earlier draft): `domain_permissions`, `domain_role_permissions`, `domain_permission_hierarchy`. A persona's bundle = f(its `role_modules` reach, its `process_raci` gates, the tier policy); the hierarchy = f(tiers); the permission names are the §8-derived codes. All computed in step B and emitted into the blueprint; the deployer provisions the tenant from the blueprint, so the catalog stores none of it.

Live preconditions (re-confirm at run time, Policy 4): `processes` and `skills` exist with the columns `process_raci` FKs; the delete-set counts in step D.

### A1. role_modules disposition and delete / re-FK ordering (resolves the headline blocker)

All 387 `role_modules` rows FK-reference the 104 `_core` roles being deleted, so the plan must
say what happens to them and in what order, or the re-FK (step A) and the step-F check fail.

KEY DISTINCTION (refines the earlier "delete, do not migrate"): what ROTTED is the permission
BUNDLE (`role_permissions` references dead permission names like `publish_cours`). The role
IDENTITY (`role_code` / `role_name` / `business_function_id`) and the module REACH
(`role_modules`, e.g. RECRUITING-RECRUITER on ATS-CANDIDATE-CRM) are candidate research, not
obviously rotted. Full throwaway discards real reach research; full migration imports
unreviewed data.

DECIDED: (a) full throwaway. The existing roles were never surfaced in audits and carry zero
reviewer confidence, so their reach is not trusted as a starting point. Decisive reason: ZERO
personas is a detectable absence a coverage check fires on and can only clear by authoring,
whereas migrated drafts PASS existence checks and invite rubber-stamping, the exact mechanism
that let the `_core` roles rot invisibly. Deleting converts silent-pass-on-stale-data into
loud-fail-needs-authoring.

So: delete the 102 researched-persona `_core` roles (model/model_master with non-empty `role_code`; the 2 empty-`role_code` master-module scaffold roles are PRESERVED), their `role_permissions` / `permission_hierarchy`, AND the
387 `role_modules` rows. Author personas + reach FRESH in Phase P from the domain's own
structure (modules, capabilities, processes). The pre-delete `.tmp_deploy/` snapshot is a
ROLLBACK net only, NOT a research input to copy from (copying would reintroduce the anchoring).

CRITICAL: this only works if Phase P carries a positive coverage EXPECTATION that fires on
absence (see step C). Without it, zero personas is silently "done", the same invisibility that
hid the old roles (their E-band check passed because stale rows existed).

ORDERING:
1. Create the new entities (step A); `domain_roles` starts empty.
2. Delete the 387 `role_modules` rows (they reference roles about to be deleted).
3. Re-point `role_modules.role_id` FK to the (empty) `domain_roles`. EXECUTED 2026-06-02: `update_field` re-targets `reference_table` (roles -> domain_roles) directly; the format stays `parent`/cascade and the drop+recreate fallback was not needed. ALSO repoint the `role_modules.role_module_label` computed_field's `set_record` lookup from `roles` to `domain_roles` (it composes `<role_code> on <domain_module_code>`), or the label resolves against the wrong table once rows are re-authored. Safe because step 2 already emptied the column.
4. Delete the `_core` catalog roles + their `role_permissions` + `permission_hierarchy` (step D).

### B. Derivations and emission (runbook)
Anchors current as of the post-Plan-1/2 code: sections render at `emit_fact_sheet.ts` §3=609,
§5=662, §7=741, §8=828; model the new pure functions after `deriveWriteTier` (965) and
`deriveDeleteMode` (989). New sections §9 and §10 are appended after the §8 push (~828).

- **B0 (prerequisite): extend `catalog.ts` loads.** The emitter loads NO persona/RACI/function data today (verified: only data-object `scopeRoles`). Add to `loadCatalogIndex` (~184-203) and `loadAllRelationships` (~283-298): `domain_roles`, `role_modules`, `process_raci`, `business_functions`, `business_function_domains`, `processes`; and add `process_id` to the `data_object_lifecycle_states` SELECT (~288). Realizes the B1 audit finding for this layer. Without B0, B1-B5 have no inputs.
- **B1 `deriveBaselineRoles(module, moduleEntities)` -> Role[]** (model after `deriveWriteTier`). Three roles per module: `<slug>_viewer`/read, `<slug>_manager`/manage, `<slug>_admin`/admin; emit the admin role only if the module has an admin-tier entity (any `entity_type=catalog`, via `deriveWriteTier`). Emit in §9. No storage.
- **B2 `derivePermissionHierarchy(modulePermissions)` -> Edge[].** From the §8-derived permission set: `admin ⊃ manage ⊃ read` plus `admin ⊃` each workflow gate / override. Emit in §9. No storage.
- **B3 `deriveRaciRealization(processRaci, lifecycleByProcess, skills)` -> {grants, consultationStates, notifications}** (model near `deriveGate`). Per `process_raci` row, branch on letter and actor: R+persona -> grant the process's gates (lifecycle states with `process_id=P`) + the gated entities' write tier; R+skill -> require/emit `skill_tools` coverage of the process's mutating ops; A+persona -> approval gate; A+skill -> autonomous note; C -> mark the `consultation_blocking` state or a read grant; I -> a `trigger_event`/`webhook_receiver` to the actor. Emit personas + their RACI assignments + the derived bundle (persona -> permission codes) as per-module fragments in §9.
- **B4 REMOVED (2026-06-02 review).** The `deriveDeployableClosure` / §10 idea was dropped: it inverted `embedded_master` semantics (treated self-sufficiency shells as requirements) and conflated persona reach with dependency. Replaced by (a) the persona-aware `related_modules` front-matter hint (catalog.ts `relatedModuleIds` now also unions `role_modules` reach), and (b) the M9 self-containment audit check. No §10 is emitted.
- **B5 market RACI (M11) + default grant (M13).** From `business_function_domains` for the module's domain: emit owner/contributor/consumer (functional ownership) + the default role-grant table (owner->admin, contributor->manage, consumer->read) in §9.
- New emitter section: **§9 Roles, RACI, and responsibilities** (B1 baseline roles, B2 hierarchy, B3 personas+RACI+bundle, B5 functional ownership + default grants), appended after §8. (§10 Deployable closure was dropped, see B4 above.) §9 iterates per module (the `modules.forEach` branch), emitting baseline-roles / hierarchy / RACI per module plus one functional-ownership block per scope. Emitted headings carry no internal step-codes (B1/B2/... live in code comments only).
- Invariants (review band, soft-warn per Plan 1 Policy 1, never hard-throw): `has_single_approver` agrees with the process's Accountable; a function-scoped `domain_roles` row's function (or ancestor/descendant) is owner/contributor for >=1 domain its modules touch (M11).

### C. Standing process (the anti-rot mechanism)
- Add a persona/RACI research phase (Phase P) to the domain workflow, alongside A/B/C/M/S. DISCOVERY is FUNCTION-ANCHORED, not domain-anchored (personas are function-scoped): for each `business_functions` row author its personas, with `role_modules` reach spanning whatever domains `business_function_domains` says the function owns / contributes-to / consumes, so a cross-domain persona's reach falls out naturally. Cross-functional personas (NULL `business_function_id`, e.g. Hiring Manager) have no home function: discover them at the cross-domain SEAMS (the `handoffs` graph) plus a catalog-wide cross-functional reconciliation backstop. Dedup by `role_code` (natural key): a cross-domain persona is authored once and its reach ACCRETES (one `role_modules` row per touched module) as each domain it touches is researched, never duplicated. The per-domain coverage check (below) is the VERIFIER, not the discoverer. See references/roles.md section 7.
- Replace the E-band (SKILL.md Phase E, checks E2-E6) with a persona/RACI review band: persona reach coverage, RACI coverage per process, the single_approver-to-Accountable consistency check, reach reconciliation against derived permissions, and the `entity_type` classification check (B13, folded in from Plan 2).
- COVERAGE EXPECTATION (the forcing function for A1 option a): the band asserts that a domain past the persona threshold (>= 2 capabilities / multi-module workflows) has >= 1 persona, and FIRES a finding on zero. It must be RUN every per-domain review and must assert quality, not mere existence. The old E-band failed exactly here: its coverage check passed because stale `_core` rows existed, so absence was never forced. Post-throwaway, zero personas makes this fire loudly until a domain is authored.
- DOC CASCADE (committed docs are the only source of truth, per CLAUDE.md): rewrite the docs that describe the superseded `_core` role layer to describe the new catalog entities. Named targets: `references/roles.md` (the 2-module floor, function-scoped naming, Path A/B agreement, re-homed to `domain_roles` / `process_raci`), the `module-shape.md` Role-layer section (field shapes, including `role_modules` post-re-FK: `role_id` -> `domain_roles`, with `interaction_level` still authored per reach row), and SKILL.md Phase E (E2-E6). Leaving these describing the old layer is a consistency gap, not optional.

### D. `_core` cleanup (corrected successor to extract-role-permission-catalog.md)
- Snapshot `_core.roles` / `permissions` / `role_permissions` / `permission_hierarchy` to `.tmp_deploy/` first.
- DELETE the catalog rows: roles with origin in (model, model_master) AND non-empty `role_code` (the researched personas only; EXCLUDE the master module's empty-`role_code` scaffold roles, e.g. `Domain Map Viewer`/`Manager`, which are the catalog app's own RBAC, not personas, and are referenced by `modules.default_*_role_id`), permissions with `domain_module_id` set, and their role_permissions and permission_hierarchy edges. Do NOT migrate (rotted). Re-derive each delete set from the LIVE tables at run time and confirm against the snapshot before deleting; the audit's counts (~104 roles, ~895 permissions) are expectations to confirm, not values to assume (mirrors Plan 1 Policy 4). These are the highest-stakes writes in the effort, so the confirm-before-delete gate is mandatory.
- INBOUND-FK guard (before deleting): enumerate every table with an FK to `roles.id` and to `permissions.id` (at least `user_roles`, `role_modules`, `role_permissions`, `permission_hierarchy`, AND `modules.default_viewer_role_id` / `default_manager_role_id` / `default_admin_role_id` -- this last set was MISSED in the first execution and blocked the initial roles delete with a 23503 FK violation) and confirm NO surviving row references a to-be-deleted id. `role_modules` is cleared by A1; verify `user_roles` and any other junction hold no model-origin role ids. Re-derive the inbound references live (Policy 4); ABORT the delete if any orphan would result.
- Preserve the platform rows: roles id 1/2 + origin=user + the master module's empty-`role_code` scaffold roles (e.g. `Domain Map Viewer`/`Manager`, referenced by `modules.default_*_role_id`), permissions with `domain_module_id` NULL, and the joins among them.
- Stop every catalog loader from writing to the `_core` RBAC tables; add a hard rule to SKILL.md.

### E. Persona research (FRESH, ongoing)
- Authoring is FUNCTION-ANCHORED (see Phase P, step C): for the domain, iterate its owner/contributor/consumer functions (`business_function_domains`) and author each function's personas that touch the domain; create-if-absent by `role_code` so a cross-domain persona authored under another domain is EXTENDED with a new `role_modules` row here, not duplicated; discover cross-functional / cross-seam personas from the domain's inbound/outbound `handoffs`. Then author their per-process RACI assignments (`process_raci`).
- WIRE the process-to-permission edge: populate `data_object_lifecycle_states.process_id` on the domain's gated lifecycle transitions. Step A only ADDS this column (nullable, starts NULL everywhere); authoring the values is a Phase E/P task, not a schema task. This is the SECOND edge B3 joins on (`data_object_lifecycle_states.process_id`, "which gate realizes process P"), distinct from `process_raci.process_id` ("which RACI row is about process P"). It is a hard prerequisite: without it, B3's R+persona branch derives no gates and the F-post end-to-end traversal resolves empty. Author it alongside the RACI assignments for the same processes.
- DECIDED: PILOT ATS first (its `entity_type` is already classified). Validate the full persona-to-RACI-to-permission traversal end to end on that one domain, then run a per-domain pass as part of the standing Phase P. The full sweep IS the standing review, not a one-shot.

### F. Verification (two gates, because B is built after A/D)
F-pre (runs right after A + D, no emitter dependency):
- `domain_roles` and `process_raci` exist; `role_modules.role_id` re-FK resolves (trivially, the table was cleared then re-pointed); `data_object_lifecycle_states.process_id` column exists.
- `_core` reduced to platform-only + master-scaffold counts (roles 19 = 2 system + 15 user + 2 master scaffold; permissions 6; plus their joins), re-derived live.
- No inbound-FK orphans (the step-D guard passed).
F-post (runs after B0-B5 are built and the pilot is authored in E):
- `catalog.ts` loads the new tables without error; the emitter renders §9; regenerate the pilot (ATS) blueprints and byte-review.
- For the ATS pilot: the persona -> process -> permission -> RACI traversal resolves end to end.
- Do NOT check the derived bundle/hierarchy for stored population: they are emitted, not stored (step A).

## Live-write inventory (high stakes; snapshot + gated)
- Create the 2 new stored entities (`domain_roles` + `process_raci`); add `data_object_lifecycle_states.process_id`. (The earlier draft's `domain_permissions` / `domain_role_permissions` / `domain_permission_hierarchy` are DERIVED + emitted, not stored, per step A's store-vs-derive decision.)
- Delete the 387 `role_modules` rows, then re-FK `role_modules.role_id` to the (empty) `domain_roles` (A1 option a).
- DELETE the `_core` catalog RBAC rows AFTER the re-FK (re-derived at run time per Policy 4, the audit's ~104 roles + ~895 permissions + their `role_permissions` / `permission_hierarchy` edges are expectations to confirm).
- Author / validate persona + RACI rows per domain (ongoing, Phase P).
All `_core` deletes and the role_modules change are reversible from the `.tmp_deploy/` snapshots.

## Downstream impact
Logs rows 3 (market RACI), 4 (personas + polymorphic `process_raci` + bundles + hierarchy
edges), 5 (module self-containment + the `related_modules` hint; the old "deployable closure"
framing was dropped) in [downstream-updates.md](downstream-updates.md).

## Status
Plan 2 is executed (2026-06-01), so the dependency is satisfied. Resolved since the C- review:
E is decided (pilot ATS first); the role_modules disposition + delete/re-FK ordering is
specified (A1); the doc cascade (roles.md, module-shape.md, SKILL.md Phase E) is folded into
steps C/D. A1 is DECIDED: (a) full throwaway, with a Phase P coverage check that fires on
missing personas as the forcing function. No open decisions remain. Step B is now a RUNBOOK
(B0 `catalog.ts` loads + B1-B5 with current anchors and named functions); step A is simplified
via store-vs-derive (only `domain_roles` + `process_raci` stored); F is split into F-pre/F-post;
the step-D inbound-FK guard and the live preconditions are added. So A, B, C, D, and F are
executable. The ONLY non-runbook part is the irreducible research tail E (authoring personas
per domain), which is ongoing by nature, not a one-shot run. Skill-actor population waits on the deferred process-skills layer; the polymorphic
shape is baked in now to avoid a later migration.

## Execution log
- **2026-06-02: Step A + A1 + D + F-pre EXECUTED** on the live tenant (module 1001, `domain_map`).
  - Created `domain_roles` (role_code, role_name, description, business_function_id -> business_functions nullable, record_status enum) and `process_raci` (process_id -> processes parent/cascade, actor_role_id -> domain_roles nullable, actor_skill_id -> skills nullable, raci enum, consultation_blocking bool). Added `data_object_lifecycle_states.process_id` -> processes (nullable).
  - The exactly-one-actor invariant is enforced as a live `validation_rules` (JsonLogic) entry, smoke-tested: rejects neither/both actors with a 23514 check_violation, accepts exactly one. A polymorphic computed label (`process_raci_label`) composes process / raci / actor and was verified for both the role and skill branches.
  - Snapshot saved to `.tmp_deploy/plan3_predelete/` (roles 121, permissions 901, role_permissions 1386, permission_hierarchy 92, role_modules 387) as the rollback net.
  - Deleted 387 role_modules; re-pointed `role_modules.role_id` -> `domain_roles` and repointed its computed-label lookup; deleted 102 researched personas (PRESERVING the 2 empty-`role_code` master scaffold roles 10001/10002) and 895 module permissions. Cascade reduced role_permissions 1386 -> 9 and permission_hierarchy 92 -> 2. Final survivors: 19 roles, 6 permissions, 0 orphans. F-pre PASSED.
  - GOTCHA committed: `is_nullable` is a GENERATED column on `fields` -- never pass it to `create_field` (it errors 428C9); nullability derives from `input_type` (`required` -> NOT NULL) and `format` (enum/text always NOT NULL; only reference/date/date-time honor optional -> nullable).
- **2026-06-02: Step C (standing process + doc cascade) DONE.** SKILL.md Phase E rewritten into the "Personas, RACI & responsibilities" review band (E1 zero-persona coverage expectation; E4 RACI coverage; E5 single_approver<->Accountable; E6 reach-vs-derived + entity_type); roles.md (incl. new section 7 function-anchored + seam-driven persona discovery), module-shape.md Role-layer, and modules.md section 4 re-homed to domain_roles/process_raci + derive-not-store; "no _core RBAC writes" hard rule added. Naming: band stays "E" (refocused); Phase P realized as the refocused Phase E.
- **2026-06-02: Step B (emitter) DONE.** catalog.ts loads domain_roles / role_modules / process_raci / business_functions / business_function_domains / processes + lifecycle.process_id (threaded through AllRelationships maps + the disk cache); emit_fact_sheet.ts derives B1 baseline roles, B2 hierarchy, B3 RACI realization, B4 deployable closure, B5 market RACI, emitted as new §9 + §10. All 18 existing blueprints regenerated (per-module, NO new files); downstream-updates rows 3/4/5 -> blueprint-done. GOTCHA: `role_modules` has no `record_status` column.
- **2026-06-02: Step E pilot (ATS) DONE + F-post PASSED.** Authored FRESH via scripts/loaders/load_ats_personas_pilot.ts (idempotent): 6 personas (RECRUITING-RECRUITER/SOURCER/COORDINATOR/MANAGER, cross-functional HIRING-MANAGER, LEGAL-COMPLIANCE-SPECIALIST), 32 role_modules reach, 6 lifecycle.process_id wirings (gates -> PCF processes 220/1014/1017/1019/222), 17 process_raci rows. Regenerated the 8 ATS blueprints; §9.1 B3 now resolves the full traversal end to end (e.g. ATS-OFFERS: RECRUITING-RECRUITER responsible -> grant [ats-offers:approve_offer]; HIRING-MANAGER accountable -> approval gate; RECRUITING-MANAGER consulted -> advisory read). All four RACI letters realize distinctly.
- **2026-06-03: §9 "Processes wired" reference table added (B3 companion).** catalog.ts `/processes` SELECT now also loads `process_code` + `description`; emit_fact_sheet.ts `deriveWiredProcesses` renders, per module, a `**Processes wired:**` table (process / PCF code / level / description) listing each distinct process that appears in the RACI realization table (wired to a gated lifecycle state AND carrying >=1 `process_raci` row), in the same first-seen order. Self-contains the blueprint so a reader sees the APQC definition behind each gated process without a separate `processes` lookup. Only the hiring-starter blueprint was regenerated to demonstrate the section (`--module HIRING-STARTER --no-cache`); the rest of the corpus is unchanged and will pick the section up on its next routine `--all` regeneration.
- **Remaining:** the standing per-domain Phase P sweep (personas for the other multi-module domains; ongoing by design, not a one-shot); optional ATS pilot expansion (requisition-approval + FCRA/adverse-action sub-flows).
