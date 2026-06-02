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
- **M9 = middle.** Hard closure = embedded_master + role_modules. Handoff counterparties
  emitted as an advisory companion list; the ARCHITECT detects dangling companions and asks
  the user or records the gap.
- **M13.** Default role grant from market RACI: owner -> `admin`, contributor -> `manage`,
  consumer -> `read`, for the functions owning/contributing/consuming the module's domain.
- **`_core` roles are throwaway.** The 104 catalog roles are unreviewed and rotted: DELETE,
  do NOT migrate. Persona research is authored FRESH.
- **Standing process.** Personas + operational RACI become a per-domain research phase plus a
  review band (replacing the E-band), so the layer cannot re-rot. `entity_type` classification
  (deferred from Plan 2) folds into the same per-domain review.
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

So: delete the 104 `_core` roles, their `role_permissions` / `permission_hierarchy`, AND the
387 `role_modules` rows. Author personas + reach FRESH in Phase P from the domain's own
structure (modules, capabilities, processes). The pre-delete `.tmp_deploy/` snapshot is a
ROLLBACK net only, NOT a research input to copy from (copying would reintroduce the anchoring).

CRITICAL: this only works if Phase P carries a positive coverage EXPECTATION that fires on
absence (see step C). Without it, zero personas is silently "done", the same invisibility that
hid the old roles (their E-band check passed because stale rows existed).

ORDERING:
1. Create the new entities (step A); `domain_roles` starts empty.
2. Delete the 387 `role_modules` rows (they reference roles about to be deleted).
3. Re-point `role_modules.role_id` FK to the (empty) `domain_roles`: change `reference_table` via `update_field` if the platform accepts re-targeting an existing `reference` field (the format stays `reference`, only the target table changes); if it rejects the re-target, DROP and recreate `role_modules.role_id` against `domain_roles` instead. Both paths are safe because step 2 already emptied the column, so no row is orphaned. Confirm which path the platform takes at run time (Policy 4).
4. Delete the `_core` catalog roles + their `role_permissions` + `permission_hierarchy` (step D).

### B. Derivations and emission (runbook)
Anchors current as of the post-Plan-1/2 code: sections render at `emit_fact_sheet.ts` §3=609,
§5=662, §7=741, §8=828; model the new pure functions after `deriveWriteTier` (965) and
`deriveDeleteMode` (989). New sections §9 and §10 are appended after the §8 push (~828).

- **B0 (prerequisite): extend `catalog.ts` loads.** The emitter loads NO persona/RACI/function data today (verified: only data-object `scopeRoles`). Add to `loadCatalogIndex` (~184-203) and `loadAllRelationships` (~283-298): `domain_roles`, `role_modules`, `process_raci`, `business_functions`, `business_function_domains`, `processes`; and add `process_id` to the `data_object_lifecycle_states` SELECT (~288). Realizes the B1 audit finding for this layer. Without B0, B1-B5 have no inputs.
- **B1 `deriveBaselineRoles(module, moduleEntities)` -> Role[]** (model after `deriveWriteTier`). Three roles per module: `<slug>_viewer`/read, `<slug>_manager`/manage, `<slug>_admin`/admin; emit the admin role only if the module has an admin-tier entity (any `entity_type=catalog`, via `deriveWriteTier`). Emit in §9. No storage.
- **B2 `derivePermissionHierarchy(modulePermissions)` -> Edge[].** From the §8-derived permission set: `admin ⊃ manage ⊃ read` plus `admin ⊃` each workflow gate / override. Emit in §9. No storage.
- **B3 `deriveRaciRealization(processRaci, lifecycleByProcess, skills)` -> {grants, consultationStates, notifications}** (model near `deriveGate`). Per `process_raci` row, branch on letter and actor: R+persona -> grant the process's gates (lifecycle states with `process_id=P`) + the gated entities' write tier; R+skill -> require/emit `skill_tools` coverage of the process's mutating ops; A+persona -> approval gate; A+skill -> autonomous note; C -> mark the `consultation_blocking` state or a read grant; I -> a `trigger_event`/`webhook_receiver` to the actor. Emit personas + their RACI assignments + the derived bundle (persona -> permission codes) as per-module fragments in §9.
- **B4 `deriveDeployableClosure(module, dmdo, roleModules, handoffs)` -> {required, companions}.** required = transitive `embedded_master` pull-ins (dmdo) plus `role_modules` reach; companions = cross-domain handoff counterparties (advisory). Emit §10 (required vs advisory companions); also emit cross-module gate ownership.
- **B5 market RACI (M11) + default grant (M13).** From `business_function_domains` for the module's domain: emit owner/contributor/consumer (functional ownership) + the default role-grant table (owner->admin, contributor->manage, consumer->read) in §9.
- New emitter sections: **§9 Roles, RACI, and responsibilities** (B1 baseline roles, B2 hierarchy, B3 personas+RACI+bundle, B5 functional ownership + default grants) and **§10 Deployable closure** (B4), both appended after §8. For composite (multi-module) blueprints, §9 and §10 iterate per module exactly as §8 does (the `modules.forEach` branch at ~855), emitting one fragment set per module; a single-module blueprint takes the §8 single-module path.
- Invariants (review band, soft-warn per Plan 1 Policy 1, never hard-throw): `has_single_approver` agrees with the process's Accountable; a function-scoped `domain_roles` row's function (or ancestor/descendant) is owner/contributor for >=1 domain its modules touch (M11).

### C. Standing process (the anti-rot mechanism)
- Add a per-domain persona/RACI research phase (Phase P) to the domain workflow, alongside A/B/C/M/S.
- Replace the E-band (SKILL.md Phase E, checks E2-E6) with a persona/RACI review band: persona reach coverage, RACI coverage per process, the single_approver-to-Accountable consistency check, reach reconciliation against derived permissions, and the `entity_type` classification check (B13, folded in from Plan 2).
- COVERAGE EXPECTATION (the forcing function for A1 option a): the band asserts that a domain past the persona threshold (>= 2 capabilities / multi-module workflows) has >= 1 persona, and FIRES a finding on zero. It must be RUN every per-domain review and must assert quality, not mere existence. The old E-band failed exactly here: its coverage check passed because stale `_core` rows existed, so absence was never forced. Post-throwaway, zero personas makes this fire loudly until a domain is authored.
- DOC CASCADE (committed docs are the only source of truth, per CLAUDE.md): rewrite the docs that describe the superseded `_core` role layer to describe the new catalog entities. Named targets: `references/roles.md` (the 2-module floor, function-scoped naming, Path A/B agreement, re-homed to `domain_roles` / `process_raci`), the `module-shape.md` Role-layer section (field shapes, including `role_modules` post-re-FK: `role_id` -> `domain_roles`, with `interaction_level` still authored per reach row), and SKILL.md Phase E (E2-E6). Leaving these describing the old layer is a consistency gap, not optional.

### D. `_core` cleanup (corrected successor to extract-role-permission-catalog.md)
- Snapshot `_core.roles` / `permissions` / `role_permissions` / `permission_hierarchy` to `.tmp_deploy/` first.
- DELETE the catalog rows: roles with origin in (model, model_master), permissions with `domain_module_id` set, and their role_permissions and permission_hierarchy edges. Do NOT migrate (rotted). Re-derive each delete set from the LIVE tables at run time and confirm against the snapshot before deleting; the audit's counts (~104 roles, ~895 permissions) are expectations to confirm, not values to assume (mirrors Plan 1 Policy 4). These are the highest-stakes writes in the effort, so the confirm-before-delete gate is mandatory.
- INBOUND-FK guard (before deleting): enumerate every table with an FK to `roles.id` and to `permissions.id` (at least `user_roles`, `role_modules`, `role_permissions`, `permission_hierarchy`) and confirm NO surviving row references a to-be-deleted id. `role_modules` is cleared by A1; verify `user_roles` and any other junction hold no model-origin role ids. Re-derive the inbound references live (Policy 4); ABORT the delete if any orphan would result.
- Preserve the platform rows: roles id 1/2 + origin=user, permissions with `domain_module_id` NULL, and the joins among them.
- Stop every catalog loader from writing to the `_core` RBAC tables; add a hard rule to SKILL.md.

### E. Persona research (FRESH, ongoing)
- Per-domain authoring: which operational personas exist, their `role_modules` reach, and their per-process RACI assignments.
- WIRE the process-to-permission edge: populate `data_object_lifecycle_states.process_id` on the domain's gated lifecycle transitions. Step A only ADDS this column (nullable, starts NULL everywhere); authoring the values is a Phase E/P task, not a schema task. This is the SECOND edge B3 joins on (`data_object_lifecycle_states.process_id`, "which gate realizes process P"), distinct from `process_raci.process_id` ("which RACI row is about process P"). It is a hard prerequisite: without it, B3's R+persona branch derives no gates and the F-post end-to-end traversal resolves empty. Author it alongside the RACI assignments for the same processes.
- DECIDED: PILOT ATS first (its `entity_type` is already classified). Validate the full persona-to-RACI-to-permission traversal end to end on that one domain, then run a per-domain pass as part of the standing Phase P. The full sweep IS the standing review, not a one-shot.

### F. Verification (two gates, because B is built after A/D)
F-pre (runs right after A + D, no emitter dependency):
- `domain_roles` and `process_raci` exist; `role_modules.role_id` re-FK resolves (trivially, the table was cleared then re-pointed); `data_object_lifecycle_states.process_id` column exists.
- `_core` reduced to platform-only counts (roles ~17, permissions ~6, plus their joins), re-derived live.
- No inbound-FK orphans (the step-D guard passed).
F-post (runs after B0-B5 are built and the pilot is authored in E):
- `catalog.ts` loads the new tables without error; the emitter renders §9 and §10; regenerate the pilot (ATS) blueprints and byte-review.
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
edges), 5 (deployable closure / architect detection) in
[downstream-updates.md](downstream-updates.md).

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
