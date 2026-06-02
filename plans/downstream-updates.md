# Downstream update ledger (architect / analyst / deployer)

Purpose: the per-module blueprint is the contract the customer ARCHITECT refines, the
ANALYST turns into a delta spec versus the customer's existing Semantius model, and the
DEPLOYER provisions into a tenant. Whenever a model-map or emitter change alters what the
blueprint carries, those downstream consumers must adapt. This file is the running ledger
of required downstream changes, accumulated across the model-map rework plans (see
[model-map-rework-plan.md](model-map-rework-plan.md)). It is consumed when we extend the
architect and analyst, which is the phase AFTER the model is coherent.

Status legend: planned / blueprint-done / downstream-done.

| # | Contract change (new or changed blueprint fact) | Origin | Architect impact | Analyst impact | Deployer impact | Status |
|---|---|---|---|---|---|---|
| 1 | Per-entity write tier (read tier + mutate tier derived from `entity_type`) emitted as the section-3 "write tier" column (section-8 effect is the M6 override-suppression guard, not a per-entity column) | B2 / Plan 2 | surface per-entity tier, allow override | stop re-deriving edit tier in Stage 9/10, consume the emitted tier, emit only the delta | already writes `entities.edit_permission`, now sourced from the blueprint, not re-derived | blueprint-done |
| 2 | Resolved delete-mode plus Semantius FK format (parent vs reference) per relationship edge, section 5 | B4 / Plan 2 | allow FK-shape refinement | consume FK format, stop reconstructing | select FK shape instead of inferring | blueprint-done |
| 3 | Functional ownership section (market RACI: owner / contributor / consumer for the module's domain) | M11 / Plan 3 | display ownership, let customer adjust | carry RACI into the spec | provision default role grants from it | planned |
| 4 | Operational personas, `process_raci` (polymorphic persona-or-skill actor), derived role bundles, and emitted `permission_hierarchy` edges | B5, M10 / Plan 3 | select and assemble personas across slices (fragment merge on assembly) | emit persona plus bundle delta | provision personas as tenant roles plus grants; wire agent-actor (R=skill) responsibilities | planned |
| 5 | Deployable module closure ("required / companion modules" advisory list) | M9 / Plan 3 | DETECT dangling companions, then ask the user or record the gap | include closure in the spec | provision a closed set or flag gaps | planned |
| 6 | Cross-module gate ownership (which module realizes each gate) | M8 / Plan 1-2 | show realizing module | note the cross-module dependency | prune or realize gates by closure | planned |
| 7 | §6 handoff tables carry a new `transition` column: the trigger's `from_state → to_state` plus `event_category` | m8b / Plan 1 | display the transition, not just the event name | carry from/to state into the handoff / integration delta | wire the trigger to the source/target lifecycle states | blueprint-done |
| 8 | `has_single_approver` rule (§8.2) now names the entity's ACTUAL approve gate via `permission_verb_override` (e.g. `approve_offer`, not the phantom `approve_offer_approval`) | M3 / Plan 1 | none (display) | reference the correct gate; the named permission is now one that is actually minted | grant the real existing gate, not a phantom permission | blueprint-done |
| 9 | §7 lifecycle tables carry soft data-quality annotations: `⚠ state-machine shape` (M4) and `⚠ unresolved gate` (M2) | M4-emit, M2 / Plan 1 | treat as data-quality flags; do NOT conform to a malformed state machine | surface the flag; expect the source data fixed, not modeled around | skip / fail loudly on annotated anomalies rather than provisioning them | blueprint-done |
| 10 | Presence-conditional `is_required`: a required relationship edge means "mandatory FK only when the target entity is installed", and never forces the target to be installed. Reconciles relationship-requiredness with entity install-`necessity` (Rule #16) so jurisdiction / size / selection-optional entities (GDPR, currencies, locations) are not dragged in by a required edge. | is_required x necessity reconcile (plan TBD) | per edge, see whether a required link is hard (target always present) or conditional (only when installed); include or exclude optional entities without breaking required links | emit the conditional-required distinction; stop treating every `is_required=true` as unconditional; a required edge to an un-installed target carries no constraint in the delta | required edge to a non-installed entity emits NO column or constraint (today it would emit a broken non-null restrict); presence stays governed by `necessity` | planned |
| 11 | Starter kits as validated entity selections: a `module_kind='starter'` is a curated, possibly cross-domain selection of embedded entities; each included entity carries its FULL inherited lifecycle; gated transitions re-prefix to the installing unit instead of being pruned when the canonical realizing module is absent; deployability = the selection is closed under hard-required needs, conditional edges may dangle (row 10) | starter coherence audit (plan TBD) | assemble a starter as an entity selection; upgrade = expand the selection; see which gates re-prefix | emit the selection plus inherited lifecycle plus re-prefixed gates as the starter delta; no thinned-entity variants | learn `module_kind='starter'` (zero handling today); materialize inherited lifecycle onto embedded shells; re-prefix gates; conditional FKs per row 10; no-migration upgrade via shared `data_object_id` | planned |

Notes:
- The permission CODES themselves (baseline read/manage/admin plus workflow gates plus
  overrides) are ALREADY emitted in section 8 and ALREADY consumed by the deployer. No
  downstream change is needed for those beyond the per-entity tier (row 1).
- Consulted / Informed RACI need NO new permission tier (resolved). Realization by layer:
  Responsible/Accountable -> permissions; Consulted -> a consultation lifecycle state (analyst
  provisions the state plus a read/comment grant) or an advisory read; Informed -> a
  notification side effect (a notify tool with operation_kind=side_effect, or a trigger_event;
  the deployer wires the notify action). `process_raci` stores the assignment with a
  POLYMORPHIC actor (persona via actor_role_id OR agent skill via actor_skill_id), restoring
  the AI-native twist (R can be an agent while A is a human). The derivation fans out to the
  permission, lifecycle-state, and notification layers, branching on persona-vs-skill for R.
  See [model-map-rework-plan.md](model-map-rework-plan.md).
- Rows 10-11 share one design (presence-conditional requiredness; not yet written up as its own plan file). Mechanism: `is_required` means "mandatory FK when the target is installed", never "force the target to be installed". Entity presence stays governed by `necessity` (Rule #16) plus starter selection. A live scan found 531 `is_required=true` edges; 143 point at an entity that is `necessity=optional` in at least one module and 19 at an entity optional in every module it appears (e.g. `users --grants_consent_in--> gdpr_consent_records`). Under the current unconditional reading those silently force the optional entity to install, which is why "optional" entities (GDPR, currencies, locations) are not actually optional today and why no subset / starter deployment is buildable. The starter kit (row 11) is the most visible consumer; same fix covers both.
