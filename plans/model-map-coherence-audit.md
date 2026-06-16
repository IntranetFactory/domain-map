# Model-map coherence audit

Audit target: the Semantius `domain_map` uber-model (module slug `domain_map`, id 1001), judged on its own logic for completeness, consistency, logicalness, and self-containment. Altitude boundary (settled, not re-litigated): ordinary fields are an analyst implementation detail and out of scope; workflow/lifecycle states are in scope; the audit altitude is semantic-skeleton plus behavior plus RBAC/persona/RACI/process. Settled direction factored in: permissions and baseline roles are DERIVED (never stored as names); operational personas and operational RACI are GAPS to be added; the catalog must own its RBAC-derivation inputs and never materialize permissions into platform `_core`.

## 1. Verdict

The model-map is **not currently complete, consistent, logical, or self-contained** at the agreed altitude. It is closest on logicalness (most derivations the model already owns are total), but it fails the acid test in several load-bearing slices at once. The single deepest failure is that the **emitted blueprint, which the extraction plan designates as the byte-stable contract every downstream skill consumes, omits whole load-bearing layers**: the per-entity write tier (`entity_type` is stored but never loaded, never read by the emitter, never emitted), the system-skill / tool / Semantius-score surface (`computeCoverage` is dead code, no skills/tools/roles/business_functions are loaded at all), market RACI, role/persona bundles, and the not-yet-existent operational personas and operational RACI. Because the architect/analyst/deployer are conformed to that blueprint, conforming them guarantees a deployable that is missing those layers. Consistency fails on multiple self-contradictions inside the model's own documents (the Semantius score is defined three incompatible ways; `operation_kind` is 4 values in the manifest and 6 in the skill; stale prose still mandates a notes-based exemption that two rules rescinded; the delete-mode derivation has two contradictory specs referencing columns that do not exist). Logicalness fails where named derivations are non-total (junction write tier has no stored endpoints; delete-mode does not cover `inheritance`/`association`; several requires_permission states can resolve to no permission with no error; `unclassified` `entity_type` has no defined tier). Self-containment fails most broadly: roles/permissions/hierarchy live in `_core` as pollution, operational RACI has no table, and the rollups/closures a turnkey deploy needs are reconstructed downstream rather than selected from the model.

## 2. Per-layer scorecard

| Layer | Complete | Consistent | Logical | Self-contained |
|---|---|---|---|---|
| Entities, entity_type, pattern flags | FAIL | FAIL | PARTIAL | FAIL |
| Lifecycle / workflow states | MOSTLY | PARTIAL | FAIL (non-total) | FAIL |
| Entity relationships (delete behavior) | PARTIAL | FAIL | FAIL (non-total) | FAIL |
| Modules, capabilities, starter kits | MOSTLY | FAIL | PASS | FAIL |
| Permission derivation (generator) | FAIL | PARTIAL | FAIL (non-total) | FAIL |
| Personas, roles, operational RACI | FAIL | PARTIAL | FAIL (non-total) | FAIL |
| Business functions and market RACI | MOSTLY | PARTIAL | PARTIAL (non-total) | FAIL |
| Processes and APQC | PARTIAL | FAIL | PARTIAL | FAIL |
| Handoffs and integration | MOSTLY | MOSTLY | FAIL (non-total) | FAIL |
| System skills and tools, Semantius score | PARTIAL | FAIL | PARTIAL | FAIL |
| Catalog UX fields | PASS (1 gap) | FAIL | PASS (1 gap) | FAIL |

## 3. Consolidated gap list (ranked by severity)

Duplicate gaps that several layers or critics raised are merged into one entry, with all merged sources cited in the evidence.

### Blockers

**B1. The blueprint, the designated byte-stable deploy contract, omits whole load-bearing layers (write tier, skills/score, market RACI, role/persona bundles, operational personas/RACI, permission_hierarchy edges, deployable closure).**
- Property: self-contained (also complete)
- Kind: emit
- Evidence: `plans/extract-role-permission-catalog.md` (lines 28, 264-275) makes the emitted blueprint the single black-box contract every downstream skill consumes ("they consume blueprint artifacts, not the raw catalog tables") with a byte-identical guarantee. But `scripts/lib/catalog.ts` `loadCatalogIndex` (lines 181-203) loads only domains, data_objects, industries, modules, and `loadAllRelationships` (lines 282-291) loads dmdo/ddo/aliases/relationships/lifecycle/handoffs/host-domains, never roles, permissions, permission_hierarchy, skills, skill_tools, tools, business_functions, or business_function_domains. `scripts/generate_blueprints.ts` emits only sections 1-8 (overview, entities, aliases, relationships, cross-domain, lifecycle, permissions plus rules), never roles, market RACI, personas, skills, or a Semantius score. `computeCoverage` (line 414) is defined and never called (grep returns the definition only). Conforming downstream to this contract enshrines the missing layers, and adding them later breaks the byte-identical freeze.
- Fix: Treat blueprint completeness as a precondition of the freeze. Extend `lib/catalog.ts` and `generate_blueprints.ts` to load and emit the per-entity write tier, the derived per-module role bundle, the module's market-RACI ownership, the system skill plus skill_tools plus per-module Semantius score, the derived permission_hierarchy edges, the deployable module closure, and (once added) operational personas plus operational RACI. Re-baseline the snapshot, and sequence the RBAC-extraction freeze AFTER the emitter is complete.

**B2. entity_type-to-write-tier derivation is unrealized end to end: stored, never loaded, never read, never emitted.**
- Property: self-contained, complete, logical (raised independently by the entities, lifecycle, permission-generator, and persona layers)
- Kind: derive plus emit
- Evidence: `plans/entity-type-permission-possibilities.md` (lines 7-15) defines the per-entity write tier (operational_workflow and operational_record give `:manage`, catalog gives `:admin`, junction gives `:admin` if an endpoint is catalog else `:manage`, computed gives no write). `scripts/lib/catalog.ts` line 188 SELECT omits `entity_type`; the `DataObject` type (lines 43-54) has no `entity_type` field; `deriveWorkflowGatesAndRules` (lines 873-875) pushes only module-wide `:read`/`:manage`/`:admin` baselines for every module and never reads `entity_type`. The emitted blueprint (e.g. `catalog/blueprints/ats-candidate-crm-semantic-blueprint.md`) shows `:manage` and `:admin` as module-wide tiers with no per-entity assignment. The mapping lives only in a loose plan file, absent from SKILL.md Rule #12 and from `references/modules.md` section 4.
- Fix: Add `entity_type` to the `data_objects` SELECT and the `DataObject` type, implement a total `deriveWriteTier(entity_type, endpoints)` returning `{read, writeTier|null}` defined for every enum value including `unclassified`, promote the mapping into Rule #12 (or a new RBAC rule) and `references/modules.md` section 4 as the canonical derivation, and emit a per-entity write-tier column into the section 3 entities table and the section 8 permissions surface so the deployer selects rather than reconstructs.

**B3. The Semantius score is defined three incompatible ways across the model's own sources, and `operation_kind` and `coverage_tier` disagree across the manifest, skill, and analytics.**
- Property: consistent, self-contained
- Kind: invariant plus store
- Evidence: `SKILL.md` lines 562-583 define the score with an all-rows denominator reading `tools.coverage_tier`; `references/semantius-coverage-rollup.md` (lines 21-40) and `scripts/analytics/coverage_rollup.ts` (lines 4, 28, 71-72) use a required-only denominator with numerator `operation_kind IN {query, mutate}`; `SKILL.md` line 1619 uses required-only plus `coverage_tier='platform'`. Three formulas, three numerators, two denominators. `operation_kind` is 6 values in SKILL.md (line 553, Rule #17 line 392: query/mutate/fetch/side_effect/compute/inbound) but 4 in `references/module-shape.md` line 325 (query/mutate/side_effect/compute) and in `coverage_rollup.ts`. `tools.coverage_tier`, named as the score's data source, is not a column in `module-shape.md` at all (the tools block, lines 320-329, omits it; lines 368-373 assert coverage is intrinsic to `operation_kind`). `computeCoverage` in `generate_blueprints.ts` (line 405, lines 417-421) reads `operation_kind`, contradicting the `coverage_tier` mandate, and is dead code.
- Fix: Pick one canonical score definition and one canonical coverage source. If `coverage_tier` is the source of truth, add it to `module-shape.md` (enum platform/external/integration, default external) with its flip rule, switch `coverage_rollup.ts` and the rewritten `computeCoverage` to read it, and use the all-rows denominator. Expand the `module-shape.md` `operation_kind` enum to the six values with the `fetch`/`inbound` `data_object_id` rules. Append a `skill-changelog` Decisions entry recording both reconciliations.

**B4. Delete-mode (cascade/restrict/clear/set-null) is reconstructed downstream, never derived in the model, and the two specs that exist contradict each other and reference columns that do not exist.**
- Property: self-contained, consistent, logical
- Kind: derive plus invariant
- Evidence: `data_object_relationships.owner_side` field description ("Drives the architect's delete-mode derivation downstream") delegates the output to the architect, which is reconstruction. No cascade/restrict computation exists in `scripts/` (`generate_blueprints.ts` only prints `owner_side` as a column; `catalog.ts` only selects it at line 287). Two specs disagree: `plan-generate-blueprints.md` line 82 derives from `kind` plus `necessity` ("parent gives cascade; reference plus required gives restrict; reference plus optional gives clear"), while the live `owner_side` description derives delete direction from `owner_side`. The `plan-generate-blueprints.md` formula keys on a `necessity` column and a `parent` kind value that do not exist (the real column is `is_required` boolean; the `relationship_kind` enum is composition/reference/association/inheritance). `inheritance` (0 rows) and `association` (104 rows) have no defined delete or structural behavior, so the kind-to-behavior map is non-total.
- Fix: Pick one canonical derivation (owner_side-based, since that column is NOT NULL and fully populated). Write a total rule mapping `(relationship_kind, owner_side, is_required)` to `reference_delete_mode` for every input combination including `association` and `inheritance` (or remove `inheritance` from the enum if supertyping is out of altitude). Delete the stale `kind+necessity` formula. Emit the resolved delete-mode and the Semantius FK format (composition/parent-owner gives `parent`, reference gives `reference`) as columns in blueprint section 5 so the deployer selects the FK shape rather than reconstructing it for all 1545 reference plus 180 composition plus 104 association edges. Add the canonical mapping to `module-shape.md`.

**B5. Operational personas have no catalog home and operational RACI has no table; the three proposed new stores have no defined join key tying persona to process to permission.**
- Property: self-contained, complete
- Kind: store
- Evidence: `SKILL.md` lines 591-594 and `module-shape.md` lines 478, 502, 513 treat roles/permissions/role_permissions as platform built-ins; `plans/extract-role-permission-catalog.md` lines 5-19 confirm catalog-origin rows in `_core` are pollution and the only legitimate `_core.roles` rows are id 1 (User) and id 2 (Administrator). No persona-by-process responsibility table exists; only market RACI on `business_function_domains` (owner/contributor/consumer). `processes` link only to handoffs (`handoff_processes`) and to themselves (`parent_process_id`); there is no edge from a process to a permission, so persona-to-process and persona-to-permission are two unconnected subgraphs that never meet at the process node.
- Fix: Add catalog-owned `domain_roles`, `domain_permissions`, `domain_role_permissions`, `domain_permission_hierarchy` in module 1001 and re-point `role_modules.role_id` at `domain_roles`. Make the operational persona equal a `roles` row (not a 4th entity). Add `role_process_raci` keyed `(role_id, process_id, raci)` with raci enum responsible/accountable/consulted/informed. Add the missing process-to-permission edge (a `process_id` on the gated lifecycle transition or on `handoff_processes`) so "persona is Responsible for process P" deterministically resolves to the permission gates P touches. Document the full persona-to-process-to-permission-to-RACI traversal as one model-resident derivation.

**B6. `handoff_processes.proposal_source` enum lacks `agent_curated`, yet the audit procedure and authoring steps write exactly that value.**
- Property: consistent
- Kind: store
- Evidence: `scripts/loaders/add_handoff_processes_proposal_source_2026_05_29.ts` line 81 declares the enum as `['human_curated', 'discovery_override', 'discovery_substring']`. `SKILL.md` lines 1086-1087, 1094, 1096 and line 663, plus `domain-audit-procedure.md` lines 110, 121, 123, 216, all instruct `proposal_source='agent_curated'`. A literal write of the instructed value is rejected by the enum.
- Fix: Add `agent_curated` to the `handoff_processes.proposal_source` enum via a one-field ALTER loader, or retarget every H-band and APQC-tagging instruction to one existing value (most likely `human_curated` for analyst-authored rows). Pick one and make all four files agree.

**B7. `skills.process_id` is called load-bearing for APQC linkage but is undocumented and unset.**
- Property: self-contained
- Kind: store
- Evidence: `discover-cross-domain-processes.md` line 5 ("`skills.process_id` became a load-bearing FK for APQC linkage") and lines 105-108 (the 3 loaded process skills sit with `process_id=NULL`). `module-shape.md` lines 331-340 list only description/skill_type/domain_id/record_status, with no `process_id`. `load_p25b_process_skills.ts` lines 171-177 inserts process skills without it.
- Fix: Add `process_id` (reference to `processes`, nullable) to the documented `skills` schema in `module-shape.md`, create the field via a loader if it does not exist live, and backfill the 3 process skills to their L2/L3 PCF rows. This is the only column that closes process-skill to APQC.

### Major

**M1. The emitter has multiple independent, divergent derivations of the realizing-module permission prefix, with no shared function.**
- Property: self-contained, consistent
- Kind: derive
- Evidence: The `<realizing module>:<verb>` prefix is computed in at least three places that disagree on the fallback: `generate_blueprints.ts` section-7 render (lines 744-752: `gateModule` is the realizing module else the master's owning module), `deriveWorkflowGatesAndRules` (lines 882-896: `realizingId === thisModuleId` else null-and-mastered-here, otherwise dropped at line 885), and the prose in `modules.md` lines 78-91 / `module-shape.md` line 470. Section 7 falls back to the master's owning module when `domain_module_id` is NULL, while section 8 requires the state's data_object to be mastered in THIS module, so for an embedded_master in scope, section 7 can emit a gate that section 8 omits.
- Fix: Factor a single `deriveGate(state, scope, module)` used by both renderers, assert that every requires_permission gate shown in section 7 for an in-scope master appears in section 8.1 with the same code, and document the one canonical fallback (NULL `domain_module_id` gives the master's owning module) in `modules.md`.

**M2. Several requires_permission lifecycle states can resolve to no permission, with no error.**
- Property: logical
- Kind: invariant
- Evidence: `generate_blueprints.ts` line 752 emits an empty gate when `gateModule` is undefined; `deriveWorkflowGatesAndRules` lines 880-885 `continue` past a requires_permission state when `realizingId` is NULL and the data_object is not in `moduleMasterIds`. Neither path errors, so a true `requires_permission` flag can produce zero permissions undetected.
- Fix: Make the derivation total: when `requires_permission=true` and no prefix resolves, throw a catalog-integrity error (the way `masteredIn()` throws on multi-master) rather than emitting an empty gate.

**M3. The `has_single_approver` business rule hardcodes `approve_<entity_singular>` and ignores the approve-state `permission_verb_override`, naming a gate that does not exist.**
- Property: consistent
- Kind: derive
- Evidence: `generate_blueprints.ts` lines 939-945 always derive `approve_${entitySingular}`. In `catalog/blueprints/ats-offers-semantic-blueprint.md` the `offer_approvals` rule names `ats-offers:approve_offer_approval`, while the actual lifecycle gate for `offer_approvals.approved` is `ats-offers:approve_offer` via `permission_verb_override`. The emitted business rule references a permission that is never minted.
- Fix: When emitting the `has_single_approver` rule, look up the entity's approve-class lifecycle state and use its `permission_verb_override`-resolved gate name instead of the unconditional `approve_<entity_singular>`.

**M4. No enforced invariant for the state-machine shape: exactly one initial state, at least one terminal state, monotonic state_order.**
- Property: self-contained, logical
- Kind: invariant
- Evidence: `module-shape.md` line 463 states "exactly one state per data_object should have `is_initial=true`" as prose only; `SKILL.md` B12 (lines 968-971) checks only existence of at least one row; `load_p...`/`fix_ats_modules.ts` `upsertLifecycleStates` defaults `is_initial`/`is_terminal` to false with no count check. A data_object with zero or two initial states, or no terminal state, passes every audit. `module-shape.md` line 462 calls `state_order` non-topological and no validation flags duplicate or gapped orders.
- Fix: Add an audit invariant and a loader pre-flight asserting exactly one `is_initial=true` and at least one `is_terminal=true` per data_object that has lifecycle rows, and a soft invariant that `state_order` is unique and monotonic within a state set; assert the same at emit time.

**M5. The `operational_workflow` if-and-only-if `requires_permission` lifecycle biconditional holds in neither direction.**
- Property: consistent
- Kind: invariant (raised by entities, lifecycle, and permission-generator layers)
- Evidence: `SKILL.md` line 219 makes lifecycle required for `operational_workflow` (forward only); B12 (lines 968-971) checks only existence, not `requires_permission`. The reverse is unchecked: an entity classified `operational_record`/`catalog`/`junction`/`computed` carrying a `requires_permission` lifecycle state passes B12 and B13. `backfill_ats_entity_type_2026_05_31.ts` lines 30-34 classifies 5 entities as `operational_workflow` WITHOUT lifecycle (the explicit "B12 gap"), and `SKILL.md` lines 221-222 permit catalog (`offer_letter_templates`) and junction (`talent_pool_memberships`) to carry `requires_permission` lifecycle.
- Fix: Decide and document which biconditional the model guarantees. If the if-and-only-if is intended, add an invariant: every `requires_permission` lifecycle state belongs to an `operational_workflow` entity, and every `operational_workflow` entity has at least one `requires_permission` state. If catalog/junction templates legitimately gate transitions, relax the brief's if-and-only-if to an implication and reconcile `SKILL.md` lines 221-222. Wire it as an emitter-time assertion plus an audit check.

**M6. No invariant forbids write pattern flags or write overrides on computed (or catalog/junction) entities.**
- Property: consistent
- Kind: invariant
- Evidence: `generate_blueprints.ts` lines 899-947 derive `view_all`/`manage_all`/`submit`/`approve` overrides and edit-scope rules for any `role='master'` row with `has_personal_content`/`has_submit_lock`/`has_single_approver` set, with no guard on `entity_type`. A computed entity (no write per the plan) flagged `has_submit_lock` would emit a submit gate over an entity that has no write tier. No B-band check cross-validates flags against `entity_type`.
- Fix: Add an invariant and a generator guard: pattern flags are valid only on `entity_type='operational_workflow'` and MUST be false on computed/catalog/junction/operational_record; `entity_type='computed'` implies all three flags false. Flag a violation as an audit failure and guard the emitter so no write override is emitted on a no-write entity.

**M7. Composition edges disagree on which side is the parent, and composition is never cross-checked against the master/child ownership it implies.**
- Property: consistent
- Kind: invariant
- Evidence: 16 rows have `relationship_kind=composition` AND `owner_side=target` with `one_to_many` cardinality authored child-first (e.g. 966 to 245 `belongs_to`/`has_key_results`; 980 to 243 `belongs_to`/`has_comments`). Composition implies the source composes the child, `owner_side=target` says the target owns the lifecycle, the verb reads child-to-parent, and `one_to_many` says the source is the "one" side: four signals point at different parents. No B6 check (`SKILL.md` lines 882-885) cross-checks composition edges against `domain_module_data_objects` master/child roles, so a composition edge can point a master at a child mastered by an unrelated module.
- Fix: Add a loader and audit invariant: for `relationship_kind=composition`, `owner_side` must equal the cardinality "one" side and the forward verb must read parent-to-child; normalize the 16 offending rows. Add a B6 sub-check that the composed child is mastered by the same module/domain that masters the composing parent or is a non-shared dependent.

**M8. Cross-module permission collision: a master in module A whose lifecycle is realized by module B yields a gate that A omits and B emits for an entity it does not master, with no closure invariant.**
- Property: consistent
- Kind: invariant
- Evidence: Permissions are prefixed by the realizing module (`SKILL.md` line 272, `modules.md` line 78) while the write tier and lifecycle live on the master. `generate_blueprints.ts` lines 744-757 and `deriveWorkflowGatesAndRules` lines 880-885 emit a gate only when `ownsAsRealizer` OR `ownsAsMaster` for this module. A deploy of A alone yields a master with `requires_permission` states whose gating permission belongs to an uninstalled B. No invariant guarantees the realizing module is in the master's deployable closure. Within an installed closure there is also no guarantee that a derived permission string maps to exactly one (realizing module, write tier, gated transition), so two modules can mint the same `verb_<entity>` with different meanings.
- Fix: Add a closure-level invariant that for every `requires_permission` state the realizing module and the master's owning module are the same or both present in the deployable closure, and that within any deployable set each derived permission string maps to exactly one (realizing module, tier, transition). Emit cross-module gate ownership so a single-module deploy knows whether its masters' gates are realizable.

**M9. The model has no concept of a deployable bundle or dependency closure: which modules a starter or persona transitively pulls in.**
- Property: complete
- Kind: derive
- Evidence: `references/modules.md` line 114 states "transitive embedded_master pull-in is sufficient, no requires_modules column" and that the deployer prunes states whose `domain_module_id` references an uninstalled module at deploy time; `generate_blueprints.ts` lines 755-757 render "(needs install)" for an out-of-scope realizing module. No model entity states the install closure; `role_modules` and `domain_module_host_domains` each capture only a slice.
- Fix: Add a derivation (and emit it) for the deployable closure: for a starter or persona, compute the transitive set of modules required via embedded_master pull-ins plus `role_modules` plus cross-domain handoff counterparties, and surface it as a "required modules" list so the deployer provisions a closed set rather than discovering missing masters at install time.

**M10. Baseline roles (read/manage/admin role-per-module) are not derived, and the permission_hierarchy edges that make role bundles work are not emitted.**
- Property: self-contained
- Kind: derive
- Evidence: `roles.md` sections 2-4 and `SKILL.md` lines 596-602 require every `roles` row to satisfy a 2-module floor and be hand-authored; there is no derivation yielding the per-module baseline read/manage/admin role bundle. The emitter derives baseline permissions (lines 873-875) but never baseline roles. `roles.md` lines 69-73 and `modules.md` lines 100-106 say bundles rely on `permission_hierarchy` auto-expansion (admin superset manage superset read, admin superset every gate/override), but those edges live in `_core` (pollution) and are never emitted; blueprint section 8.1 shows only an "included in :admin?" checkmark.
- Fix: Define a total derivation: every module yields three baseline roles from its baseline permission tiers, with hand-authored cross-module roles layered as additive refinement (the 2-module floor applies only to authored personas). Derive and emit the per-module `permission_hierarchy` edge set (admin-to-manage-to-read chain plus admin-to-each-gate/override) into the catalog-owned `domain_permission_hierarchy` so the deployer selects edges rather than recomputing the closure.

**M11. Market RACI is never emitted into per-module blueprints, and no invariant ties a function-scoped role to its domain's RACI owner.**
- Property: self-contained, consistent
- Kind: emit plus invariant
- Evidence: `generate_blueprints.ts` renders no business_function content (grep finds `business_function` only in loaders and analytics), and the blueprints carry no owner/contributor/consumer section. No rule cross-checks `roles.business_function_id` against `business_function_domains.responsibility_type` for the domains the role's modules touch, though the audit brief names exactly that cross-check.
- Fix: Add a "functional ownership (market RACI)" section to the emitter sourced from the stored junctions. Add a consistency invariant: for a function-scoped role, at least one domain reachable via `role_modules` must have a `business_function_domains` row for that function (or an ancestor/descendant) with `responsibility_type` in (owner, contributor); surface divergence as a drift warning.

**M12. Domain function-ownership is not total; uncovered domains have no owner function, and there is no single-owner invariant.**
- Property: logical, consistent
- Kind: derive plus invariant
- Evidence: `load_business_functions.ts` lines 378-384 only `console.log` a warning for domains with no RACI map entry; they get no `business_function_domains` rows, so "owner function of domain X" is undefined for uncovered domains. C1 (`SKILL.md` line 987) passes on at least one owner row but nothing forbids 2+ owner rows for the same domain. Line 162 also writes a deliberate `COLLAB` placeholder owner ("IT Operations") superseded by `COLLAB-GOV`.
- Fix: Make ownership total (fail the loader on uncovered domains, or document a default-owner derivation, e.g. inherit from the domain's cluster). Add an invariant (loader pre-flight plus audit) that each `domain_id` has at most one owner row, mirrored per `capability_id`. Delete the `COLLAB` placeholder entry.

**M13. No default persona-to-baseline-role binding at deploy time: a deployed module has no stored or derived "who gets which baseline role out of the box," though market RACI already encodes it.**
- Property: complete
- Kind: derive
- Evidence: The deployer provisions three default roles per module, and baseline roles are proposed for derivation, but nothing maps which operational persona gets which tier on a fresh single-module deploy. `business_function_domains.responsibility_type` (owner/contributor/consumer) already encodes the answer and is never connected to a default role-grant.
- Fix: Define a total derivation from `responsibility_type` to a default baseline tier (owner gives admin, contributor gives manage, consumer gives read) for the functions that own/contribute-to/consume the module's domain, and emit it as the module's default role-grant table.

**M14. trigger_events state fields and the lifecycle state machine are two unjoined models of the same transitions.**
- Property: consistent
- Kind: invariant
- Evidence: `trigger_events.from_state`/`to_state` are free text (`module-shape.md` lines 150-153), while authoritative transitions live in `data_object_lifecycle_states.state_name`. A handoff fires on a trigger_event whose `to_state` should equal a real lifecycle `state_name` with `requires_permission` (the four-leg premise), but nothing constrains `to_state` to an actual state_name of `trigger_events.data_object_id`. No stored invariant binds the handoff payload, the publisher data_object, and the publisher lifecycle state; the four-leg coherence is reconstructed at audit time only.
- Fix: Constrain or derive `trigger_events.to_state` to resolve to a `data_object_lifecycle_states.state_name` on the same data_object, and add an invariant that a gated-transition event corresponds to a `requires_permission` state and that the event's payload is mastered on the source module's side. Either FK the event's state to the lifecycle row or add an audit cross-check.

**M15. Schema-shape documentation drift on load-bearing skill columns: `skills` system-skill anchor and `tools` enums disagree between `module-shape.md` and SKILL.md.**
- Property: consistent
- Kind: store
- Evidence: `module-shape.md` lines 333-338 anchor system skills on `domain_id` with validation rule `domain_required_when_skill_type_is_system` and omit `domain_module_id`; `SKILL.md` Rule #17, at-a-glance line 554, and F2 require exactly one system skill per `domain_modules` row via `skills.domain_module_id`. The `tools.operation_kind` enum and `data_object_id` rules (see B3) also drift. `handoff_processes` has no field-shape section in `module-shape.md` at all (its schema lives only in `create_handoff_processes.ts`), and is excluded from the at-a-glance entity count.
- Fix: Add `domain_module_id` (required-when-system) to the `skills` manifest and demote `domain_id` to transitional; add a `handoff_processes` field-shape section (handoff_id parent, process_id reference, the `role` enum value `implements`, `proposal_source`) and count it in the at-a-glance inventory; reconcile `tools.operation_kind`/`coverage_tier` per B3. Append a `skill-changelog` entry for each.

**M16. No persona-to-process link exists, so the persona-to-process-to-APQC chain is not modelable.**
- Property: complete
- Kind: store
- Evidence: `roles` (the persona layer) joins only to `domain_modules` (`role_modules`) and permissions (`role_permissions`); `processes` link only to handoffs and self. There is no `role_processes`/`persona_processes` junction. (Subsumed by the join-key fix in B5; tracked here for the process-layer view.)
- Fix: Add the operational-RACI junction from B5 (`role_process_raci`), or route the chain through process skills (`role` to `skill` to `process_id`) once `skills.process_id` exists. Document persona-to-process-to-APQC in `module-shape.md` and SKILL.md.

**M17. The blueprint does not emit `catalog_tagline`/`catalog_description` on `domain_modules` from any committed loader, and `domain_aliases` is authored but never read with a divergent shape.**
- Property: self-contained, consistent
- Kind: store plus emit
- Evidence: `add_catalog_ux_schema.ts` (lines 85-101) creates `catalog_tagline`/`catalog_description` only on `domains`; `catalog.ts` (lines 81-82, 193) reads them from `domain_modules` and `generate_blueprints.ts` consumes them, but no committed loader creates the module-grain columns, so the module-grain UX schema cannot be regenerated from the repo. `Rule #20` claims `domain_aliases` feeds the search index and skill triggers, but `catalog.ts` line 286 reads only `data_object_aliases`; `domain_aliases` is read nowhere and its loader shape (`alias`, enum synonym/industry_term/solution_term) diverges from `data_object_aliases` (`alias_name`, is_preferred, industry_id, solution_id).
- Fix: Add the two `ensureField('domain_modules', ...)` steps to a committed loader. Decide whether the emitter reads `domain_aliases` (then reconcile its column shape with `data_object_aliases`) or downgrade Rule #20's claim to "reserved, not yet consumed."

### Minor

**m1. Stale notes-based lifecycle exemption in SKILL.md line 662 contradicts Rule #12 and Rule #15.**
- Property: consistent. Kind: invariant.
- Evidence: `SKILL.md` line 662 still reads "Config-shaped masters with no workflow are exempt only when annotated in `data_objects.notes`," directly contradicting line 226 ("there is no notes-based exemption surface") and Rule #15, and the changelog (lines 514-517) recording that the notes exemption was rescinded in favor of `entity_type`.
- Fix: Rewrite line 662 to say config/record/catalog/junction/computed masters are exempt structurally by carrying the matching `entity_type` value, dropping the notes-annotation clause.

**m2. `entity_type='unclassified'` leaves the write-tier derivation undefined for a value that legitimately occurs in stored data.**
- Property: logical. Kind: derive.
- Evidence: `module-shape.md` line 135 and `skill-changelog.md` line 513 define `unclassified` as the NOT-NULL default; B13 flags it as an audit failure but it can sit on un-audited masters; the write-tier table gives no row for it.
- Fix: Define `unclassified` in the write-tier function (no write tier plus a hard emitter error mirroring B13) so the function is total over every enum value.

**m3. The pattern-flag "consideration" in B4 is not a storable fact, so a re-audit cannot tell a considered-false flag from an unconsidered default.**
- Property: self-contained. Kind: store.
- Evidence: `SKILL.md` B4 (lines 872-876) requires positively re-evaluating the three flags each pass and recording the pass in chat/PR, not in notes (Rule #15). Nothing in the model stores that the flags were reviewed.
- Fix: Either accept false as the answer of record (drop the per-pass re-evaluation), or add a stored `pattern_flags_reviewed` signal so the consideration is a model fact.

**m4. `data_object_relationships` field manifest omits `owner_side` and `inverse_verb` is unaudited despite being required.**
- Property: complete. Kind: emit plus invariant.
- Evidence: `module-shape.md` lines 283-293 list every relationship column except `owner_side`, the very column that drives delete behavior (NOT NULL, default source, rendered by the emitter). `inverse_verb` is marked required (line 290) but 6 rows are empty and B6 does not check it.
- Fix: Add `owner_side` to the manifest with its delete-mode semantics. Add `inverse_verb`-non-empty to the B6 pass test and the cluster-drafts loader pre-flight.

**m5. `relationship_type` direction is not constrained relative to `owner_side`, leaving cardinality and ownership ambiguous.**
- Property: logical. Kind: invariant.
- Evidence: After `load_cluster_drafts.ts` auto-flips `many_to_one` to `one_to_many`, a `one_to_many` edge can carry `owner_side=source` OR `target` with no rule saying which is canonical (509 rows are `owner_side=target`, many authored child-first). A consumer cannot deterministically identify the "one"/parent side from stored data.
- Fix: Enforce that for `one_to_many` edges the "one"/parent side is fixed (owner_side names the parent, forward verb reads parent-to-child) in the loader auto-flip and the B6 audit.

**m6. No stored discriminator distinguishes an intentionally-empty leadership-tier landing module from an under-loaded one; M-band skips M3; the borderline-3-capabilities case is prose only.**
- Property: complete, consistent, logical. Kind: store.
- Evidence: Rule #14, M1 fix, and B1 exception describe legitimately-empty leadership-tier modules; `domain_modules` carries no tier/landing flag, so S2 must guess. The M-band is numbered M1, M2, M4-M8 (no M3). M2 records the borderline single-module exception only as free text in `description`.
- Fix: Add a typed discriminator on `domain_modules` (extend `module_kind` with `landing`, or a boolean) and a typed `single_module_justified` signal for the borderline-3 case. Renumber the M-band contiguously or note M3's retirement in the changelog.

**m7. friction_level / integration_pattern have prose-only defaults with no total derivation; B10b module-attribution has explicit undefined tie and no-candidate cases; cross-domain is a query-time filter not a stored property.**
- Property: logical, consistent. Kind: derive plus invariant.
- Evidence: `module-shape.md` lines 271-272 give defaults but no total function mapping context to `integration_pattern` to `friction_level`. `SKILL.md` lines 952-957 leave attribution NULL on ties and split no-candidate into human-decision sub-cases. `source_domain_id`/`target_domain_id` are denormalized and derivable from the module FKs and can drift.
- Fix: Either define deterministic default tables or document these as analyst-authored stored facts. Add a deterministic attribution tiebreaker and make no-candidate a hard insert-time invariant. Make the domain FKs a generated projection of the module FKs, or add an invariant that they agree.

**m8. trigger_events from/to_state, event_category, and `proposal_source`/`role` enums are stored but never emitted, and the Rule #13 enum table omits the `handoff_processes` enums.**
- Property: self-contained, complete. Kind: emit.
- Evidence: `catalog.ts` line 289 selects only `event_name`/`description` from trigger_events; `renderHandoffTable` renders only the event name, dropping the state transition that defines the event. Rule #13 enumerates several catalog enums but not `handoff_processes.proposal_source` or `role` (value `implements`).
- Fix: Carry `from_state`/`to_state` (and optionally `event_category`) into section 6, and add the `handoff_processes` enum rows to the Rule #13 table.

**m9. The emitter aborts the whole blueprint corpus on the first integrity violation, so a non-regenerable catalog produces zero output instead of a localized gap.**
- Property: logical. Kind: invariant.
- Evidence: `generate_blueprints.ts` `masteredIn` (lines 344-356) throws on multi-master, and the `--all` driver (lines 982-991) rethrows and aborts on the first failing module, making the acid test all-or-nothing.
- Fix: Collect per-module integrity errors and emit a blueprint-with-error-banner (or machine-readable gap list) per failing module while still producing the rest of the corpus.

**m10. Multi-parent-domain starters get no buyer overview and an arbitrary tagline; `catalog_description` empty is indistinguishable from un-backfilled.**
- Property: complete, logical, self-contained. Kind: emit plus store.
- Evidence: `generate_blueprints.ts` lines 535-549 leave `buyerOverview=''` for the multiple-parent-domain branch (Rule #19 cross-domain starters), and the tagline falls to `modules[0]` (lines 485-487). Section 1.2 is emitted only when non-empty (line 559), so a deliberately-empty buyer surface looks identical to an un-authored one.
- Fix: Derive `buyerOverview`/tagline from the starter module's own `catalog_*` (or concatenate parent domains) for the multi-parent case. Either fail A4/M8 on empty `catalog_description` or add a typed `buyer_copy_status` so "reviewed, intentionally empty" is a model fact.

**m11. The `domain_data_objects` rollup is declared derived but nothing regenerates it; the `processes`/`handoff_processes`/`skills.domain_module_id` documentation surface and APQC coverage state are incomplete.**
- Property: self-contained, logical. Kind: derive plus invariant.
- Evidence: `modules.md` line 157 and `module-shape.md` line 439 call `domain_data_objects` a derived rollup, but no script recomputes it; `catalog.ts` (lines 284-285) loads it as an independent input, so a stale rollup silently diverges. The H1 coverage obligation (every cross-domain handoff tagged or deferred) is procedural with the deferral recorded only in audit prose, not in a model field.
- Fix: Add an emitter/loader that recomputes `domain_data_objects` from `domain_module_data_objects` (strongest role wins) plus an invariant that the stored rollup matches, or derive it on read. Add a stored deferral signal (a handoff-level `apqc_deferred` flag or sentinel `handoff_processes` row) so H1 coverage is a checkable invariant.

**m12. C2 capability divergence has no loader and no spine guidance; sub-function altitude for RACI participants is undefined; Rule #20 / A4 / M8 have no changelog entry; minor manifest omissions.**
- Property: complete, consistent. Kind: derive plus invariant.
- Evidence: `load_business_functions.ts` writes zero `business_function_capabilities` rows; C2 gives one worked example and no enumeration rule. The RACI map mixes a sub-function consumer with top-level owners while `SKILL.md` line 1312 does not state the required altitude. A grep of `skill-changelog.md` finds no entry for Rule #20, `catalog_tagline`, `domain_aliases`, A4, or M8. `domains.catalog_tagline`/`catalog_description` are absent from the `module-shape.md` domains field table though A4 audits them.
- Fix: Add a Phase-C divergence derivation rule plus a reference loader for `business_function_capabilities`; state the owner-altitude rule explicitly; append a `skill-changelog` Decisions entry for the catalog-UX layer; add the two columns to the `module-shape.md` domains field table.

**m13. PII/sensitivity footprint of a deployable is reconstructed from a single permission-shaping boolean; source-state-conditional gating cannot be expressed.**
- Property: complete. Kind: store.
- Evidence: `has_personal_content` is consumed only to emit `view_all`/`manage_all` permissions and an edit-scope rule; no PII classification distinct from the permission flag exists, and `domain_regulations` links to domains not to the specific data_objects that hold regulated content, so a GDPR-erasure entity set cannot be answered from the model. Lifecycle `requires_permission` is destination-state-only (`module-shape.md` lines 465-466); `trigger_events` carry from/to_state but lifecycle states do not.
- Fix: Either elevate `has_personal_content` into a sensitivity classification (none/personal/sensitive) the blueprint emits, or add a data_object-to-regulation junction. If source-conditional gating is in altitude, add an optional `from_state` qualifier to the gate model; otherwise document destination-only as an explicit decision.

## 4. Model-map extension spec

This section turns the store, derive, emit, and invariant gaps into a concrete proposal. It respects the altitude boundary (ordinary fields excluded; workflow states included) and the settled direction (permissions and baseline roles derived, never stored as names; personas and operational RACI added as catalog content; no catalog writes to `_core`).

### 4.1 New entities and fields in the `domain_map` module (kind: store)

Catalog-owned RBAC and persona inputs (replaces `_core` pollution; `_core` keeps only platform rows id 1/2):

- `domain_roles` (the operational persona): `role_code`, `role_name`, `description`, optional `business_function_id` (function-scoping), `record_status`. The operational persona IS a `domain_roles` row, not a separate archetype entity.
- `domain_permissions`: catalog-side mirror of derived permission names, populated by the emitter at materialization time (the name still resolves from the realizing module's code), `record_status`.
- `domain_role_permissions`: `(role_id -> domain_roles, permission_id -> domain_permissions)`; grants are tier-level (read/manage/admin plus gates), consistent with hierarchy auto-expansion.
- `domain_permission_hierarchy`: `(parent_permission_id, child_permission_id)` edges (admin superset manage superset read, admin superset each gate/override), derived per module and emitted, not hand-maintained.
- Re-point `role_modules.role_id` at `domain_roles`.

Operational RACI (the redesign-target gap):

- `role_process_raci`: `(role_id -> domain_roles, process_id -> processes, raci)` where `raci` is an enum responsible/accountable/consulted/informed. This is the operational-execution axis; market RACI on `business_function_domains` (owner/contributor/consumer) stays the org-buyer axis.

New columns on existing entities:

- `data_objects.entity_type`: already stored; ensure it is loaded (see 4.2). Add `pattern_flags_reviewed` (boolean or timestamp) so the B4 consideration is a model fact (m3). Optionally add a `sensitivity` enum (none/personal/sensitive) for governance (m13).
- `data_object_relationships`: document `owner_side` in the manifest (m4); optionally store junction endpoint data_object_ids or a resolved `any_endpoint_is_catalog` boolean to make the junction write tier total (B2 logical leg).
- `data_object_lifecycle_states`: optional `from_state` qualifier if source-conditional gating is in altitude (m13); otherwise document destination-only.
- `skills`: add `process_id` (reference to `processes`, nullable) (B7) and `domain_module_id` (required-when-system) (M15).
- `tools`: add `coverage_tier` (enum platform/external/integration, default external) and expand `operation_kind` to six values with the `fetch`/`inbound` `data_object_id` rules (B3).
- `domain_modules`: add a typed landing/empty discriminator (extend `module_kind` with `landing`, or a boolean) and a `single_module_justified` signal (m6); add committed-loader creation of `catalog_tagline`/`catalog_description` (M17).
- `handoffs`: optional `apqc_deferred` flag for total H1 coverage (m11).
- `handoff_processes.proposal_source`: add `agent_curated` to the enum (B6).

### 4.2 New derivations for the emitter (kind: derive)

- `deriveWriteTier(entity_type, endpoints)` returning `{read, writeTier|null}`, total over every enum value: operational_workflow and operational_record give manage, catalog gives admin, junction gives admin-if-an-endpoint-is-catalog-else-manage (resolved from stored endpoints or a stored boolean), computed gives no write, unclassified gives no write plus a hard emitter error mirroring B13. Add `entity_type` to the `catalog.ts` SELECT and `DataObject` type first (B2).
- A single shared `deriveGate(state, scope, module)` used by both the section-7 renderer and the section-8 permission deriver, with one canonical fallback (NULL `domain_module_id` gives the master's owning module), throwing when a `requires_permission` state resolves to no module (M1, M2).
- Baseline-role derivation: each module yields three baseline roles from its baseline permission tiers; the `permission_hierarchy` edge set is derived and emitted (M10).
- Default role-grant derivation from market RACI: owner gives admin, contributor gives manage, consumer gives read for the functions owning/contributing/consuming the module's domain (M13).
- Delete-mode derivation: a total `(relationship_kind, owner_side, is_required)` to `reference_delete_mode` function, plus the Semantius FK format mapping (B4).
- Deployable-closure derivation: transitive embedded_master plus role_modules plus cross-domain handoff counterparties (M9).
- `domain_data_objects` rollup recomputation from `domain_module_data_objects`, strongest role wins (m11).
- `business_function_capabilities` divergence derivation (a capability gets an override row when its realizing module's owning function differs from its home-domain owner) (m12).
- Rewrite `computeCoverage` to the canonical Semantius-score definition and wire it in (B3).

### 4.3 New facts the blueprint must emit (kind: emit)

The blueprint, as the byte-stable contract (B1), must additionally carry, per module:

- A per-entity write-tier column in section 3 and section 8 (B2).
- The system skill, its `skill_tools` with operation_kind and coverage_tier, and the per-module Semantius score (B1, B3).
- A "functional ownership (market RACI)" section: owner/contributor/consumer functions for the module's domain plus any capability-divergence rows (M11).
- The derived per-module role bundle (baseline read/manage/admin plus authored cross-module roles with their `role_modules` reach) and the emitted `permission_hierarchy` edge set (M10).
- Operational personas and the `role_process_raci` assignments (once added) (B5).
- The resolved delete-mode and FK format per relationship edge (B4).
- The deployable module closure ("required modules" list) (M9).
- `trigger_events.from_state`/`to_state` and `event_category` in section 6 (m8).
- Cross-module gate ownership (which module realizes each gate) (M8).

### 4.4 New consistency invariants for the review bands

- `entity_type=operational_workflow` if-and-only-if it has at least one `requires_permission` lifecycle state (close the biconditional in both directions, decide and document the catalog/junction template exception) (M5).
- Pattern flags valid only on `operational_workflow`; `computed` implies all three flags false; no write override emitted on a no-write entity (M6).
- Exactly one `is_initial=true` and at least one `is_terminal=true` per data_object with lifecycle rows; `state_order` unique and monotonic within a state set (M4).
- For `relationship_kind=composition`: `owner_side` equals the cardinality "one" side, the forward verb reads parent-to-child, and the composed child is mastered by the same module/domain as the parent or is a non-shared dependent (M7). For `one_to_many` edges, the parent side is fixed (m5). `inverse_verb` non-empty (m4).
- For every `requires_permission` state: the realizing module and the master's owning module are the same or both in the deployable closure; within a closure each derived permission string maps to exactly one (realizing module, tier, transition) (M8).
- For a function-scoped `domain_roles` row: its function (or an ancestor/descendant) is owner or contributor for at least one domain its modules touch (M11).
- At most one `business_function_domains` owner row per domain (and per capability); domain ownership total (no uncovered domains) (M12).
- `trigger_events.to_state` resolves to a real `data_object_lifecycle_states.state_name` on the same data_object; a gated-transition event corresponds to a `requires_permission` state; handoff payload mastered on the source module's side (M14, m7).
- `source_domain_id`/`target_domain_id` agree with the module FKs (generated projection or invariant) (m7).
- Single canonical Semantius-score and `operation_kind`/`coverage_tier` definitions across SKILL.md, `module-shape.md`, and `coverage_rollup.ts` (B3); the `data_object_id` rule total over all six `operation_kind` values (M15).
- The emitter degrades gracefully on per-module integrity violations instead of aborting the corpus (m9).
- Documentation invariants: rewrite SKILL.md line 662 to the structural `entity_type` exemption (m1); add the missing `handoff_processes` and `owner_side` manifest sections (m4, M15); append `skill-changelog` Decisions entries for every reconciliation above (m12, M15, B3, B6).
