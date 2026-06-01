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
- `domain_roles`: `role_code`, `role_name`, `description`, `business_function_id` (nullable, function-scoping), `record_status`.
- `domain_permissions`: catalog-side mirror of derived permission names (populated by the emitter at materialization; the name still resolves from the realizing module's code), `record_status`.
- `domain_role_permissions`: `role_id` -> `domain_roles`, `permission_id` -> `domain_permissions`.
- `domain_permission_hierarchy`: `parent_permission_id`, `child_permission_id` (both -> `domain_permissions`).
- `process_raci`: `process_id` -> `processes`; `actor_role_id` -> `domain_roles` (nullable); `actor_skill_id` -> `skills` (nullable); `raci` enum (responsible/accountable/consulted/informed); `consultation_blocking` bool; CHECK exactly one of actor_role_id / actor_skill_id is set.
- Re-point `role_modules.role_id` to `domain_roles`.
- Add `data_object_lifecycle_states.process_id` (reference to `processes`, nullable), the process-to-permission edge.

### B. Derivations and emission
- **M10** Baseline-role derivation: every module yields three baseline roles from its baseline permission tiers; hand-authored cross-module personas layer on as additive refinement (the 2-module floor applies only to authored personas). Derive and emit the per-module `permission_hierarchy` edge set into `domain_permission_hierarchy`.
- **M11** Emit a "functional ownership (market RACI)" section from `business_function_domains`. Add the consistency invariant: a function-scoped `domain_roles` row's function (or an ancestor/descendant) is owner or contributor for at least one domain its modules touch.
- **M13** Default role-grant derivation (owner->admin / contributor->manage / consumer->read); emit the module's default role-grant table.
- **process_raci fan-out**: derive {permission, consultation-state, notify-tool} per assignment, branching on persona-vs-skill for R; emit personas and their RACI assignments. Emit role bundles as per-module fragments that merge on assembly.
- **M9** Deployable-closure derivation (embedded_master + role_modules) plus the advisory companion list (handoff counterparties); emit cross-module gate ownership.
- **Consistency invariant**: `has_single_approver` agrees with the process's Accountable assignment.

### C. Standing process (the anti-rot mechanism)
- Add a per-domain persona/RACI research phase (Phase P) to the domain workflow, alongside A/B/C/M/S.
- Replace the E-band with a persona/RACI review band: persona reach coverage, RACI coverage per process, the single_approver-to-Accountable consistency check, reach reconciliation against derived permissions, and the `entity_type` classification check (B13, folded in from Plan 2).

### D. `_core` cleanup (corrected successor to extract-role-permission-catalog.md)
- Snapshot `_core.roles` / `permissions` / `role_permissions` / `permission_hierarchy` to `.tmp_deploy/` first.
- DELETE the catalog rows: roles with origin in (model, model_master), permissions with `domain_module_id` set, and their role_permissions and permission_hierarchy edges. Do NOT migrate (rotted). Re-derive each delete set from the LIVE tables at run time and confirm against the snapshot before deleting; the audit's counts (~104 roles, ~895 permissions) are expectations to confirm, not values to assume (mirrors Plan 1 Policy 4). These are the highest-stakes writes in the effort, so the confirm-before-delete gate is mandatory.
- Preserve the platform rows: roles id 1/2 + origin=user, permissions with `domain_module_id` NULL, and the joins among them.
- Stop every catalog loader from writing to the `_core` RBAC tables; add a hard rule to SKILL.md.

### E. Persona research (FRESH, ongoing)
- Per-domain authoring: which operational personas exist, their `role_modules` reach, and their per-process RACI assignments.
- Recommended approach: PILOT one domain first (ATS, since its `entity_type` is already classified), validate the full persona-to-RACI-to-permission traversal end to end, then run a per-domain pass as part of the standing Phase P.

### F. Verification
- New entities present and visible; `role_modules.role_id` re-FK resolves; `data_object_lifecycle_states.process_id` populated for the pilot.
- Emitter emits the new sections (functional ownership, role bundles, RACI, companion list); regenerate and byte-review.
- `_core` reduced to platform-only counts (roles ~17, permissions ~6, plus their joins).
- The persona-to-process-to-permission-to-RACI traversal resolves for the pilot domain.

## Live-write inventory (high stakes; snapshot + gated)
- Create the 5 new entities + columns and re-FK `role_modules.role_id`.
- DELETE the `_core` catalog RBAC rows (104 roles + 895 permissions + their edges).
- Author persona / RACI rows per domain (ongoing).
All `_core` deletes are reversible from the `.tmp_deploy/` snapshots.

## Downstream impact
Logs rows 3 (market RACI), 4 (personas + polymorphic `process_raci` + bundles + hierarchy
edges), 5 (deployable closure / architect detection) in
[downstream-updates.md](downstream-updates.md).

## Status
Schema (A), derivations (B), standing process (C), and the `_core` cleanup (D) are designable
and runnable after Plan 2. The one remaining input is the persona-research approach in E
(pilot ATS first vs a full per-domain pass). Skill-actor population waits on the deferred
process-skills layer; the polymorphic shape is baked in now to avoid a later migration.
