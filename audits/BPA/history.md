# BPA audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- Current footprint: 0 `domain_modules`, 4 masters (per legacy `domain_data_objects` rollup only; none of the four is held as `role='master'` in any `domain_module_data_objects` row under BPA), 7 capabilities, 9 solutions, 0 regulations, 5 trigger events on BPA-claimed masters, 8 outbound + 3 inbound handoffs (11 total BPA-touching), 1 legacy `skill_type='system'` skill (`bpa-system`, id 34, `domain_module_id=null`) with 4 `skill_tools` rows (all `platform`-tier query primitives), 3 `data_object_relationships` rows touching BPA masters (all on capability_maps, two of which are near-duplicates), zero roles.
- Vendor-surface basis (flagship vendors enumerated): SAP Signavio, Software AG ARIS, MEGA HOPEX, BiZZdesign Horizzon, iGrafx Process360 Live, Bizagi Modeler, Trisotech Digital Enterprise Suite, Mavim. ARIS and Signavio anchor enterprise BPMN authoring; MEGA HOPEX and BiZZdesign anchor capability-map / enterprise-architecture overlap; Bizagi and iGrafx anchor mid-market modeling; Trisotech anchors BPMN+CMMN+DMN tri-spec. No regulated compliance specialist for this market (BPA is descriptive, not transactional).
- **Bucket 1 (in-scope, agent fixable):** 17 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 8 items.

**Structural verdict: catastrophic M-band failure.** BPA has zero `domain_modules` rows (M1 fails outright), which makes M2, M4, M5, M6 vacuously inapplicable and forces every B-band per-module check (B9b, B10b, F2-F5) into a structural void. The legacy `domain_data_objects` rollup claims BPA masters four entities, but the modular DMDO ground truth shows only `business_capability_maps` (248) has a `role='master'` row anywhere in the catalog, and that row is on **APM-PORTFOLIO-REGISTRY** (module 103, APM domain), not BPA. `business_process_models` (247), `value_streams` (249), and `process_simulation_runs` (250) have **zero `master` rows** anywhere in `domain_module_data_objects`. The capability `BUSINESS-CAPABILITY-MAP` (343) and `REFERENCE-FRAME-LIBRARY` (344) are similarly realized through APM module 103 instead of through any BPA module. The capability_map lifecycle states (`draft` -> `published` -> `superseded`) and the resulting workflow-gate permission (`apm-portfolio-registry:publish_business_capability_map`) are also living on APM module 103. The fact-sheet emitter, the deployer, and the Semantius score are all uncomputable for BPA as it stands. Modularization is the single Phase-M obligation that must land before any other fix.

### Pass 1 - Structural (per-domain completeness checklist)

#### S-band coverage sweep

**S1. Direct FK to `domains` coverage:**

| Table | FK column | BPA rows | Expected non-zero? | Verdict |
|---|---|---|---|---|
| `business_function_domains` | `domain_id` | 4 | yes (C1) | pass |
| `capability_domains` | `domain_id` | 7 | yes (A2) | pass |
| `domain_data_objects` | `domain_id` | 4 (claims master on 4) | yes (B1) | pass on count, **fails on M7** (no DMDO master rows back the claim) |
| `domain_modules` | `domain_id` | **0** | yes (M1) | **fail (blocking)** |
| `domain_module_host_domains` | `domain_id` | 0 | routinely zero | n/a |
| `domain_regulations` | `domain_id` | 0 | non-zero when applicable | pass (BPA is not regulated) |
| `domain_aliases` | `domain_id` | 0 | non-zero recommended | partial (search index thin) |
| `domains.parent_domain_id` | (self-FK on BPA's children) | 0 | routinely zero | n/a |
| `handoffs.source_domain_id` | `source_domain_id` | 8 | yes (B9) | pass on count |
| `handoffs.target_domain_id` | `target_domain_id` | 3 | yes (B10) | pass on count |
| `skills` | `domain_id` | 1 (legacy `domain_module_id=null`) | yes (F2) | fail (legacy-only, see F1/F2) |
| `solution_domains` | `domain_id` | 9 | yes (A3) | pass |

**S2. Per-module indirect coverage:** vacuously skipped (zero modules).

**S3. Per-master indirect coverage:**

| data_object | states | events | aliases |
|---|---|---|---|
| `business_process_models` (247) | 0 | 1 | 0 |
| `business_capability_maps` (248) | 3 | 1 | 2 |
| `value_streams` (249) | 0 | 1 | 0 |
| `process_simulation_runs` (250) | 0 | 2 | 0 |

Three of four masters have zero lifecycle states and zero aliases. The four masters publish five trigger events but only one (on capability_maps) has a state-machine anchor; the other four events fire from a master with no published lifecycle.

#### A-band

- **A1.** `domains` row 136 metadata: `crud_percentage=80`, `business_logic` populated, `min_org_size='40 l <10000'`, `cost_band='$$$'`, `certification_required=false`, `usa_market_size_usd_m=400`, `market_size_source_year=2024`. Pass.
- **A2.** 7 capabilities linked. Pass.
- **A3.** 9 solutions with `coverage_level` set; 8 primary, 1 secondary. Pass on count, but 4 of 9 solutions (MEGA HOPEX, BiZZdesign Horizzon, Software AG ARIS, SAP Signavio) also serve the Enterprise Architecture market (Bucket 2 #3).
- **A4.** `catalog_tagline` empty, `catalog_description` empty. **Fail.** Buyer-facing surface is blank.
- **A5.** Skipped (not requested).

#### M-band

- **M1.** **Hard fail.** Zero `domain_modules` rows for BPA (primary host count 0; `domain_module_host_domains` count 0). Every M2/M4/M5/M6/M7 check below either fails vacuously or fails by routing the master to the wrong domain.
- **M2.** Inapplicable (M1 fail). Capability count 7 (>=3), so the target shape under Rule #14 is >=2 full modules.
- **M4.** Inapplicable from BPA's side. Two of seven BPA capabilities (343 `BUSINESS-CAPABILITY-MAP`, 344 `REFERENCE-FRAME-LIBRARY`) are realized through APM module 103. Five capabilities (338 `BPA-BPMN-MODEL`, 339 `BPA-PROCESS-REPO`, 340 `BPA-SIMULATION`, 341 `BPA-VALUE-STREAM`, 342 `BPA-PUBLISH`) have **no realizing module at all** anywhere in the catalog.
- **M5.** Three lifecycle states on 248 carry `domain_module_id=103` (APM). The realizing module is APM, not BPA, which collides with M7.
- **M6.** Inapplicable (zero BPA modules).
- **M7.** **Hard fail (cross-domain master location).** `business_capability_maps` (248) has `role='master'` in **APM-PORTFOLIO-REGISTRY** (APM domain), while the legacy `domain_data_objects` rollup for BPA also claims it as master. Either APM legitimately owns it (then BPA should hold `embedded_master`, not `master`) or BPA owns it (then APM's master row demotes). The other three "BPA masters" (247, 249, 250) have **no `role='master'` row anywhere in DMDO**, meaning they are orphan masters with no canonical module owner.

#### B-band

- **B1.** Four "masters" in the legacy rollup; only one (`business_capability_maps`) has a DMDO master row, and that row is in APM. B1 fails: BPA's master count by the modular ground truth is zero.
- **B2.** All four data_objects have non-empty `singular_label` and `plural_label`. Pass.
- **B3.** All four names are prefixed forms (`business_*`, `value_streams`, `process_simulation_runs`); bare-word arbitration not required. Pass.
- **B4.** All three pattern flags are false-by-default on all four masters with no recorded audit consideration. Soft fail (re-evaluate; see Bucket 2 #4).
- **B5.** No `embedded_master` rows for BPA (because no BPA modules exist).
- **B6.** **Fail.** Zero intra-domain `data_object_relationships` rows between the four BPA masters. A flagship BPA load would carry at minimum `value_streams references business_process_models`, `business_capability_maps groups business_process_models`, and `process_simulation_runs simulates business_process_models`.
- **B7.** **Fail.** Only one master (`business_capability_maps`) has any `users` edges, and those are duplicated (relationship rows 226 and 1044 both express the user-owner edge with slightly different verbs, `"owned capability maps"` vs `"owns_business_capability_map"`). The other three masters have no `users` edges. Process models have authors; value streams have owners; simulation runs have requesters.
- **B8.** Inapplicable in detail because no BPA module masters anything modularly. All eight outbound `handoffs` rows have `source_domain_module_id=null`; the cross-domain relationship rows that would mirror them are also absent.
- **B9.** Five trigger events authored on BPA masters; eight outbound handoffs reference them. Outbound coverage looks reasonable in count but the trigger events themselves have no lifecycle anchors on three of four masters.
- **B9b.** Vacuously inapplicable (M1 fail). Once BPA is modularized into >=2 modules, B9b will need intra-domain handoffs (e.g., capability-map publication firing into process-repo, simulation results firing back into BPMN authoring).
- **B10.** Inbound: 3 rows (PROC-MIN sources `conformance.deviation_detected`, `discovered_process_model.published`, `process_variant.identified`). All three have `target_domain_module_id=null` (B10b fail).
- **B10b.** **Fail (every direction).** Outbound: 8 of 8 rows have `source_domain_module_id=null`; 6 of 8 outbound also have `target_domain_module_id=null` (only ids 181, 182, 184 carry the target module FK). Inbound: 3 of 3 have both module FKs null.
- **B11.** Aliases exist only for `business_capability_maps` (2 synonyms). The other three masters have zero aliases despite obvious vendor variants: `business_process_models` -> "BPMN diagram", "process map"; `value_streams` -> "lean value stream map", "VSM"; `process_simulation_runs` -> "Monte Carlo run", "what-if scenario".
- **B12.** Lifecycle states exist only on `business_capability_maps` (3 states). The other three masters have zero states. Three of the four would have workflow (process models: draft -> reviewed -> published -> retired; value streams: in-discovery -> baselined -> archived; simulation runs: queued -> running -> completed -> failed). Config-shape exemption does not apply to any of the four.

#### C-band

- **C1.** Four `business_function_domains` rows: owner Business Operations, contributor IT Operations, contributor Compliance Operations, consumer Executive. Pass.
- **C2.** No `business_function_capabilities` rows for any of the seven BPA capabilities. Acceptable only if every capability's RACI matches the domain RACI; reasonable given Business Operations is the consistent owner. Pass (no divergence to surface).

#### D-band

- **D1.** UI spot-check deferred (audit is read-only).

#### E-band

- **E1.** Zero roles touch BPA-attributable modules (because BPA has none). The three roles touching module 103 (`ENTERPRISE-ARCHITECT`, `IT-INFRA-APPLICATION-OWNER`, `IT-INFRA-PORTFOLIO-MANAGER`) are attributed to APM, not BPA. Vacuously passes only because the 2-module floor would block role authoring anyway; structurally **fail** once BPA is modularized.
- **E2 - E6.** Vacuously inapplicable.

#### F-band

- **F1.** **Fail.** One legacy `domain_id=136`, `domain_module_id=null`, `skill_type='system'` skill (`bpa-system`, id 34) is still present. Per Rule #17 and F2 the target shape is one `system` skill per `domain_modules` row, anchored by `domain_module_id`.
- **F2.** Inapplicable (zero modules). Once BPA is modularized, F2 will require exactly one `system` skill per module.
- **F3.** The legacy `bpa-system` skill has 4 `skill_tools` rows (`query_business_process_models`, `query_business_capability_maps`, `query_value_streams`, `query_process_simulation_runs`), all `platform`-tier. Once modularized, the per-module skills will inherit these plus need mutate / workflow-gate primitives.
- **F4.** All four linked tools are `operation_kind='query'` with `data_object_id` set: pass on the invariant.
- **F5.** Semantius score is **uncomputable per-module** because there are no modules. Domain-level rollup over the legacy skill: 4/4 = 100% strict. The score is misleading because the skill set covers only the query side, not the workflow gates the modular target state would include.
- **F7.** No channel primitives linked. Pass.

#### H-band

- **H1.** 11 BPA-touching cross-domain handoffs (8 outbound + 3 inbound). Only **1 of 11** carries any `handoff_processes` row (handoff 183, PROC-MIN -> BPA on `conformance.deviation_detected`, tagged `discovery_substring` -> `Manage non-conformance` (414), `record_status='new'`). Catalog-quality count: 0 `record_status='approved'`. Process-health count: 0 `agent_curated`. Both numbers are at floor. **The audit must propose roughly 0.5N to 0.8N = 5 to 9 new agent-curated rows.**

### Pass 2 - Domain market audit (semantic)

Subagent-style summary (analyst-direct here because BPA's catalog is so under-modularized that a subagent call would simply re-derive the four-master surface already in front of us):

- **MISSING (workflow substrate):** `process_documentation_pages` (Trisotech, Bizagi publishing portals), `process_review_cycles` / `process_governance_workflows` (Signavio, ARIS governance modules), `process_kpis` and `process_metric_definitions` (Signavio Process Intelligence), `archimate_models` (ARIS / BiZZdesign, though this leans Enterprise Architecture), `decision_models` (Trisotech, Signavio DMN), `model_revision_diffs` (every vendor's version-graph), `process_change_requests` (governance-layer artifact). All are speculative until Phase 0 vetted (Bucket 3).
- **MISSING (compliance):** none required at the catalog level. BPA itself is not regulated; downstream consumers (GRC, BCM) carry their own regulatory entities.
- **WRONG-OWNERSHIP:** `business_capability_maps` (248) is currently mastered in APM-PORTFOLIO-REGISTRY. Whether that is "wrong" depends on the Bucket 2 #2 decision; either way the catalog needs a single canonical owner.
- **SCOPE-CREEP:** 4 of 9 BPA solutions (MEGA HOPEX, BiZZdesign Horizzon, Software AG ARIS, SAP Signavio) are also Enterprise Architecture leaders. Not creep yet (BPA is their authentic surface), but once EA lands as a candidate domain (queued; see "Candidates queued") their `solution_domains` rows need splitting between BPA and EA.
- **MODULARIZATION ISSUE (severe):** the entire domain. Proposed module shape lives in Bucket 2 #1.

### Pass 3 - Neighbor discovery

Edge-weight table (handoffs only; cross-domain DMDO references on BPA's side are all currently null because no BPA modules exist):

| Neighbor | Outbound from BPA | Inbound to BPA | Total edge weight |
|---|---|---|---|
| PROC-MIN (40) | 2 (`process_model.published`, `process_simulation_run.completed`) | 3 (`conformance.deviation_detected`, `discovered_process_model.published`, `process_variant.identified`) | **5** |
| PROD-MGMT (101) | 2 (`value_stream.bottleneck_identified`, `process_simulation_run.bottleneck_identified`) | 0 | 2 |
| APM (10) | 2 (`process_model.published`, `capability_map.updated`) | 0 | 2 |
| SPM (9) | 1 (`process_simulation_run.completed`) | 0 | 1 |
| WORK-MGMT (135) | 1 (`process_simulation_run.bottleneck_identified`) | 0 | 1 |

Per the audit recipe, neighbors at edge weight >= 3 trigger the full 5-section pairwise reconciliation. Only **PROC-MIN** qualifies. Lighter neighbors get a one-line summary in Bucket 1 / Bucket 2 instead.

### Pass 4 - Pairwise reconciliation (BPA <-> PROC-MIN, weight 5)

The 5-leg analysis is unusually shallow on this boundary because BPA has no modules and PROC-MIN's coverage of BPA-mastered data_objects is fully captured by the `consumer + required` DMDO rows on PM-ROADMAP-DELIVERY and the existing trigger events.

1. **Existing handoffs, fully wired.** None on either direction. Every BPA-touching row has `source_domain_module_id=null` (BPA side) and most have `target_domain_module_id=null` too.
2. **Existing handoffs with NULL module FK (PATCH candidates once BPA modularizes).** All 5 in this direction: ids 180 (BPA->PROC-MIN `process_model.published`, payload `business_process_models`), 783 (BPA->PROC-MIN `process_simulation_run.completed`), 183 (PROC-MIN->BPA `conformance.deviation_detected`, payload `business_process_models`), 740 (PROC-MIN->BPA `discovered_process_model.published`, payload `discovered_process_models`), 741 (PROC-MIN->BPA `process_variant.identified`, payload `process_variants`). All five are blocked on BPA having modules; once BPA is split, the source-side module FK on the 2 outbound rows derives from `business_process_models` and `process_simulation_runs` master locations, and the target-side module FK on the 3 inbound rows derives from BPA's `business_process_models` consumer / contributor DMDO rows.
3. **Missing handoffs the catalog implies should exist.** BPA's `business_process_models` carries no published lifecycle states; PROC-MIN authors `discovered_process_model.published` against `discovered_process_models` (id 580), which BPA does **not** declare any role on. Candidate handoff: PROC-MIN should publish on `discovered_process_model.reconciled` once BPA's `business_process_models` is updated to absorb a discovered variant. Surfaced as Bucket 2 #5.
4. **Boundary integrity gaps.** No DMDO rows from BPA reference PROC-MIN-mastered data_objects (because BPA has no DMDO rows at all). The reciprocal direction (PROC-MIN consuming BPA-mastered data_objects) is captured by handoff payloads only; once BPA modularizes, PROC-MIN modules would benefit from `consumer` DMDO rows on `business_process_models` and `process_simulation_runs`. Routes to PROC-MIN B5 follow-up.
5. **Cross-domain `data_object_relationships` mirror check.** Zero `data_object_relationships` rows between BPA masters (247, 248, 249, 250) and PROC-MIN masters (580 `discovered_process_models`, 581, 582 `process_variants`). At minimum, `business_process_models` should have a relationship to `discovered_process_models` (with verbs like `reconciles_to` / `reconciled_from`) and to `process_variants` (with verbs like `accepts_variant` / `variant_of`).

### Bucket 1 - In-scope confirmed gaps

#### MODULARIZATION (M-band)

| ID | Finding | Fix |
|---|---|---|
| B1-M1 | Zero `domain_modules` rows. M1 hard fail. Capability count is 7 (>=3) so target shape is >=2 full modules. | Author the module set (shape vetoed in Bucket 2 #1). Default proposal: `BPA-PROCESS-REPO` (BPMN authoring + governance + publishing), `BPA-CAPABILITY-MAP` (capability maps + reference frameworks), `BPA-VALUE-STREAM` (value-stream + simulation). All three `module_kind='full'`. |
| B1-M2 | `business_process_models` (247), `value_streams` (249), `process_simulation_runs` (250) have no `role='master'` row anywhere in `domain_module_data_objects`. M7 / B1 fail by modular ground truth. | Author `domain_module_data_objects` master rows on the new BPA modules: 247 -> `BPA-PROCESS-REPO`, 249 -> `BPA-VALUE-STREAM`, 250 -> `BPA-VALUE-STREAM` (or split `BPA-SIMULATION` per Bucket 2 #1). |
| B1-M3 | `business_capability_maps` (248) is mastered in APM-PORTFOLIO-REGISTRY (module 103, APM domain). Cross-domain master-location collision with BPA's `domain_data_objects` rollup claim. | Resolve per Bucket 2 #2 decision: either DELETE the APM `master` row and re-INSERT under `BPA-CAPABILITY-MAP`, with APM downgrading to `embedded_master` or `consumer`; or formally accept APM as canonical owner and DELETE BPA's `domain_data_objects` claim (which would then leave BPA with three masters total). |
| B1-M4 | Three lifecycle states on `business_capability_maps` (673 draft, 674 published, 675 superseded) carry `domain_module_id=103` (APM). Workflow-gate permission `apm-portfolio-registry:publish_business_capability_map` is materialized under APM as a result. | PATCH `data_object_lifecycle_states.domain_module_id` to the new BPA `BPA-CAPABILITY-MAP` module id (post B1-M1 load). Drop the APM-prefixed permission row in `permissions` and re-derive the BPA-prefixed `bpa-capability-map:publish_business_capability_map` from the relocated state. Sequence after B1-M3. |
| B1-M5 | Capabilities `BUSINESS-CAPABILITY-MAP` (343) and `REFERENCE-FRAME-LIBRARY` (344) are realized through APM module 103 via `domain_module_capabilities`. The other five BPA capabilities (`BPA-BPMN-MODEL`, `BPA-PROCESS-REPO`, `BPA-SIMULATION`, `BPA-VALUE-STREAM`, `BPA-PUBLISH`) have zero realizing modules. | Author `domain_module_capabilities` rows linking all 7 capabilities to the new BPA modules per the proposed shape. Remove the APM rows once the BPA-side realizations land (sequence after B1-M3). |

#### STRUCTURAL

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | A4 | `catalog_tagline` and `catalog_description` empty. Buyer-facing surface is blank. | Draft both fields in buyer voice (workflow + value), surface to user per Rule #20 BEFORE writing. |
| B1-S2 | F1 | Legacy `bpa-system` skill (id 34) with `domain_module_id=null` will be obsolete once per-module system skills exist. | DELETE skill 34 (and its 4 `skill_tools` rows) AFTER per-module system skills land in Phase S. Cannot be done before B1-M1/B1-M2 because per-module skills need their module ids. |
| B1-S3 | B10b | 8 of 8 outbound handoffs have `source_domain_module_id=null`. | Derive source module per B10b rule (master holder of `trigger_events.data_object_id` on the BPA side; the new BPA modules become the holders). PATCH after B1-M1 / B1-M2 / B1-M3 land. Affected ids: 180, 181, 182, 184, 783, 784, 785, 786. |
| B1-S4 | B10b | 6 of 8 outbound have `target_domain_module_id=null` (180, 183 already counted on inbound, 783, 740, 741, 785, 786, 184 (wait 184=131 OK)). Inbound 3 of 3 have `target_domain_module_id=null` (183, 740, 741 all null). | Outbound NULL `target` rows: 180 (PROC-MIN target), 783 (PROC-MIN), 785 (SPM), 786 (WORK-MGMT 149 already set, so not in list — recheck) — actual outbound nulls: 180, 783, 785. Inbound NULL `target` (BPA side): 183, 740, 741. Six rows total. Derive target module from the handoff's `data_object_id` master location on the relevant side; some PATCHes route to other domains' audits (see Report-only). Inbound rows go onto a BPA module once B1-M1 lands. |
| B1-S5 | B9b | If BPA splits into >=2 modules per B1-M1, intra-domain handoff coverage will be needed (e.g., `BPA-CAPABILITY-MAP` -> `BPA-PROCESS-REPO` on `capability_map.updated`; `BPA-VALUE-STREAM` -> `BPA-PROCESS-REPO` on `value_stream.bottleneck_identified` once that triggers BPMN re-modeling; `BPA-VALUE-STREAM` -> `BPA-CAPABILITY-MAP` on simulation feedback). | Author 2-4 intra-domain `handoffs` rows with `source_domain_id = target_domain_id = 136` and `integration_pattern='lifecycle_progression'` (or `event_stream` where the message genuinely crosses module boundaries). Sequence after B1-M1. |
| B1-S6 | A2 / discoverability | BPA has zero `domain_aliases` rows. Catalog search and per-domain skill triggers miss obvious synonyms. | Author rows: `business process management`, `BPM`, `process modeling`, `process architecture`, `BPMN authoring`, `process design` (synonyms); `prozessmodellierung` (industry term, optional). |

#### BOUNDARY

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | B7 fail. Three of four BPA masters have no `users` edges (`business_process_models` -> author/owner; `value_streams` -> owner; `process_simulation_runs` -> requester). | Author 3 `data_object_relationships` rows from `users` to each master per Rule #10 (`users` is `kind='platform_builtin'`, id 748). |
| B1-B2 | Two near-duplicate `users` edges on `business_capability_maps`: row 226 (`"owned capability maps"`, verb space-form, legacy) and row 1044 (`"owns_business_capability_map"`, verb snake-form, newer). | DELETE the older row (226) once row 1044 is confirmed as the canonical edge. |
| B1-B3 | B6 fail. Zero intra-domain `data_object_relationships` rows between BPA masters. | Author edges: `value_streams maps_to business_process_models`; `business_capability_maps groups business_process_models`; `process_simulation_runs simulates business_process_models`; optionally `value_streams supports business_capability_maps`. 3-4 rows. |
| B1-B4 | B12 + B4 fail. Three of four BPA masters have zero lifecycle states and no Rule #12 pattern-flag audit. | Author lifecycle states: `business_process_models` (draft -> in_review -> published -> retired); `value_streams` (in_discovery -> baselined -> archived); `process_simulation_runs` (queued -> running -> completed | failed). Anchor `domain_module_id` to the new BPA module per state. Re-evaluate `has_submit_lock` (true on `business_process_models.published`), `has_single_approver` (true on `business_capability_maps.published`), `has_personal_content` (false on all four). Surface re-evaluation to user before writing flag PATCHes. |
| B1-B5 | B11 fail. Aliases exist only on `business_capability_maps`. Three masters have zero. | Author aliases: `business_process_models` -> "BPMN diagram", "process map"; `value_streams` -> "VSM", "lean value stream map"; `process_simulation_runs` -> "Monte Carlo simulation run", "what-if scenario". 6 rows. |

#### APQC TAGGING (H1)

11 BPA-touching cross-domain handoffs. 1 already tagged via `discovery_substring` (id 183 -> 414 `Manage non-conformance`). 10 new agent-curated proposals + 0 deferred:

| handoff_id | source -> target | trigger_event | payload | Proposed PCF | PCF id | external_id | confidence |
|---|---|---|---|---|---|---|---|
| 180 | BPA -> PROC-MIN | `process_model.published` | `business_process_models` | Manage business processes | 78 | 16378 | L2 confident |
| 181 | BPA -> APM | `capability_map.updated` | `business_capability_maps` | Develop and Manage Business Capabilities | 13 | 10013 | L1 confident (or `Define and maintain enterprise architecture` id 261 L3 as alternative) |
| 182 | BPA -> APM | `process_model.published` | `business_process_models` | Manage business processes | 78 | 16378 | L2 confident |
| 183 | PROC-MIN -> BPA | `conformance.deviation_detected` | `business_process_models` | Manage non-conformance | 414 | 17492 | L3 (already loaded via `discovery_substring`; promote to `agent_curated` or keep substring) |
| 184 | BPA -> PROD-MGMT | `value_stream.bottleneck_identified` | `value_streams` | Reengineer business processes and systems | 1708 | 11161 | L4 confident |
| 740 | PROC-MIN -> BPA | `discovered_process_model.published` | `discovered_process_models` | Manage business processes | 78 | 16378 | L2 confident |
| 741 | PROC-MIN -> BPA | `process_variant.identified` | `process_variants` | Manage business processes | 78 | 16378 | L2 confident |
| 783 | BPA -> PROC-MIN | `process_simulation_run.completed` | `process_simulation_runs` | Manage business processes | 78 | 16378 | L2 confident |
| 784 | BPA -> PROD-MGMT | `process_simulation_run.bottleneck_identified` | `process_simulation_runs` | Reengineer business processes and systems | 1708 | 11161 | L4 confident |
| 785 | BPA -> SPM | `process_simulation_run.completed` | `process_simulation_runs` | Manage business processes | 78 | 16378 | L2 confident |
| 786 | BPA -> WORK-MGMT | `process_simulation_run.bottleneck_identified` | `process_simulation_runs` | Reengineer business processes and systems | 1708 | 11161 | L4 confident |

All proposals: `proposal_source='agent_curated'`, `record_status='new'`. Counted as B1-H1 (single Bucket 1 item with the sub-table). 10 new tags + 1 promotion question (Bucket 2 #6 covers the promote-or-keep decision on 183).

### Bucket 2 - Surface-for-user (judgment calls)

1. **Module split shape.** The proposed BPA modularization is open. Three vetted options:
   - **(a) 3 modules:** `BPA-PROCESS-REPO` (BPMN authoring + governance + publish, masters `business_process_models`), `BPA-CAPABILITY-MAP` (masters `business_capability_maps` + realizes `REFERENCE-FRAME-LIBRARY`), `BPA-VALUE-STREAM` (masters `value_streams` + `process_simulation_runs`).
   - **(b) 4 modules:** split `BPA-SIMULATION` out of `BPA-VALUE-STREAM` (masters `process_simulation_runs` alone), reflecting that simulation is a distinct vendor surface (Trisotech, ARIS Aware) from value-stream modeling.
   - **(c) 2 modules:** collapse to `BPA-PROCESS-ARCH` (process_models + value_streams + simulation) and `BPA-CAPABILITY-MAP` (capability maps + reference frameworks). Defensible if the user wants a leaner footprint.
   Depends on Bucket 3 #1 / #3 vetting outcome.
2. **`business_capability_maps` canonical owner.** Today the DMDO master row is on APM-PORTFOLIO-REGISTRY (module 103). Options: (a) BPA owns canonically (move master to `BPA-CAPABILITY-MAP`, APM holds `embedded_master`); (b) APM owns canonically (BPA holds `embedded_master`, delete BPA's `domain_data_objects` master claim); (c) split-master is wrong, the entity belongs to a future EA domain (queued). Option (a) is the default given BPA-prefixed capability codes and BPA-anchored lifecycle states, but APM has a strong claim via portfolio-architecture coupling.
3. **Solution split with EA candidate.** 4 of 9 BPA solutions (MEGA HOPEX, BiZZdesign Horizzon, Software AG ARIS, SAP Signavio) are also EA leaders. Once the queued EA domain promotes, decide: (a) keep all 4 on BPA only and re-link to EA when it lands; (b) downgrade those 4 to `secondary` on BPA and create `primary` rows on EA; (c) split coverage on a per-solution basis (Signavio = BPA primary, ARIS = EA primary, etc.).
4. **Pattern-flag re-evaluation per Rule #12.** Three flags on four masters (12 cells). Defaults are all false. Proposed positive evaluations (need user confirmation): `business_process_models.has_submit_lock=true` (published models lock); `business_capability_maps.has_single_approver=true` (capability-map publication typically routes to one architect lead); `process_simulation_runs.has_submit_lock=true` (queued runs lock at start). All others stay false.
5. **PROC-MIN reconciliation reach.** Pass 4 surfaced a candidate handoff (`discovered_process_model.reconciled` from PROC-MIN -> BPA once `business_process_models` absorbs a variant). Author it now (after BPA modularizes), defer to a PROC-MIN audit, or skip entirely as overspecification.
6. **APQC tag for handoff 183 (already-substring-tagged).** Existing row: substring matcher proposed `Manage non-conformance` (414) at L3. Options: (a) promote the existing row by PATCHing `proposal_source='agent_curated'` and adding 78 `Manage business processes` (L2 parent) for clustering; (b) leave the substring row and add a sibling `agent_curated` row for 78 (the natural-key `(handoff_id, process_id)` prevents collision since process ids differ); (c) leave as-is.

### Bucket 3 - Phase 0 pending (speculative; vendor-research vetting needed)

Flagship-vendor entity candidates not yet anchored to a formal Phase 0 vendor-surface document:

| # | Candidate | Proposed module | Vendor knowledge basis |
|---|---|---|---|
| 1 | `process_documentation_pages` | `BPA-PROCESS-REPO` (publish slice) | Trisotech Process Publisher, Bizagi Process Documenter, Signavio Process Manager Publishing |
| 2 | `process_kpis` and `process_metric_definitions` | `BPA-PROCESS-REPO` or `BPA-VALUE-STREAM` | Signavio Process Intelligence, ARIS Performance Manager. Adjacent to PROC-MIN; verify ownership boundary. |
| 3 | `reference_framework_libraries` | `BPA-CAPABILITY-MAP` | APQC PCF imports, eTOM, SCOR, ITIL 4 capability libraries. Currently a capability (344), promotion to entity needed if vendors model imported framework versions as records. |
| 4 | `decision_models` (DMN) | new module `BPA-DMN-MODEL` or fold into `BPA-PROCESS-REPO` | Trisotech DMN modeler, Signavio Decision Manager, Camunda DMN. DMN sometimes lives in iBPMS (queued) instead of BPA. |
| 5 | `process_review_cycles` / `process_governance_workflows` | `BPA-PROCESS-REPO` | Signavio Governance, ARIS Designer governance workflows. |
| 6 | `model_revision_diffs` | `BPA-PROCESS-REPO` | Every vendor's version-graph diff/merge (mentioned in `domains.business_logic`). Promotion depends on whether tenants need a per-revision audit table. |
| 7 | `process_change_requests` | `BPA-PROCESS-REPO` | ARIS Connect, Signavio Collaboration Hub. Adjacent to ITSM Change but scope is BPA-internal. |
| 8 | `archimate_models` / `togaf_artifacts` | EA candidate (queued) rather than BPA | BiZZdesign Horizzon, ARIS ArchiMate. Likely a strong signal these belong on the queued `EA` domain once promoted, not on BPA. |

### Cross-bucket dependencies

- **Bucket 2 #1 depends on Bucket 3 #3 and #4.** Whether to split off `BPA-SIMULATION` from `BPA-VALUE-STREAM`, and whether to create `BPA-DMN-MODEL`, both depend on the Phase 0 vendor surface verifying whether vendors treat these as first-class.
- **Bucket 2 #2 depends on the queued EA candidate.** If EA promotes, capability maps may belong canonically there. Default to deciding option (a) or (b) now and revisit if EA promotes.
- **Bucket 2 #3 is fully gated on the EA candidate's promotion decision.** If EA stays in the queue, this Bucket 2 item is moot.
- **Bucket 1 sequencing is strictly linear:** B1-M1 first, then B1-M2 / B1-M3 in parallel, then B1-M4 / B1-M5 / B1-S3 / B1-S4 / B1-B1 / B1-B3 / B1-B4 in parallel (all need the new module ids), then B1-S2 (legacy skill retire) and B1-S5 (intra-domain handoffs) last.
- **Bucket 1 H1 (APQC tagging) is independent of the modularization sequence** and can land in parallel with B1-M1. Module FK columns on `handoff_processes` do not exist; the rows attach to the handoff id directly.

### Per-bucket prompts (orchestrator surfacing)

- **Bucket 1:** "BPA has 17 in-scope confirmed gaps. The dominant blocker is M1 (zero modules); 12 of the 17 items depend on B1-M1 landing first. Fix these now? Reply 'all', 'just M-band first', 'just H1', or 'skip'. If 'all', I will sequence the loaders per the Cross-bucket dependencies block above."
- **Bucket 2:** "Six judgment calls. The headline one is #1 (module split shape: 2 vs 3 vs 4 modules) which cascades into every M-band fix. #2 (capability_map canonical owner: BPA vs APM vs EA) also blocks the M3/M4 sequence. What's your call on each? I will wait for your decision per item before acting."
- **Bucket 3:** "Eight speculative entity candidates plus the EA and IBPMS domain queue entries. Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates to treat as confirmed and I will route them into the M-band fix loads (the new module IDs will be available once B1-M1 lands)."

### Report-only follow-ups (owed by other domains)

These items the BPA audit surfaced but the fix is owned by another domain. They do **not** block BPA's green status; they're observations the user can schedule as separate per-domain audits.

| Owner | Finding | Why owed |
|---|---|---|
| APM B10b | NULL `target_domain_module_id` on inbound handoffs from BPA where APM is the consumer (handoff ids 181, 182). Fix is on the APM side once their DMDO rows on `business_capability_maps` / `business_process_models` are set. | APM's audit pass owes `target_domain_module_id` derivation for inbound rows it consumes. |
| PROC-MIN B5 | `discovered_process_models` (580) and `process_variants` (582) have no BPA-side `embedded_master` / `consumer` DMDO declarations once BPA modularizes. PROC-MIN's master rows are healthy; missing BPA-side declarations route to BPA's own loads (already in Bucket 1 indirectly), but the reciprocal note here is that if PROC-MIN updates its `process_variants` schema, BPA needs to react. | Surfacing the dependency direction so PROC-MIN's next audit knows BPA consumes these. |
| PROC-MIN B10b | Outbound from PROC-MIN to BPA (handoffs 183, 740, 741) all have `source_domain_module_id=null` on the PROC-MIN side. Owed to PROC-MIN's B10b backfill. | These rows can be PATCHed only when both sides modularize; PROC-MIN's modular footprint already has primary modules, so the source FK is derivable today. |
| PROD-MGMT B10b | Outbound from BPA to PROD-MGMT (handoffs 184, 784) carry `target_domain_module_id=131` (PM-ROADMAP-DELIVERY) so target side is set, but if PROD-MGMT adds a `BPA-bottleneck` consumer DMDO row on a different module, the target FK may need re-routing. | Routine PROD-MGMT side maintenance. |
| SPM B10b | Outbound 785 (BPA -> SPM) has `target_domain_module_id=null`. Owed to SPM's B10b backfill once SPM determines which module consumes BPA simulation results. | SPM B10b. |
| WORK-MGMT (no defect) | Outbound 786 carries `target_domain_module_id=149` (WORK-MGMT-TASK-EXEC). Pass. | Informational. |
| APM B8 / B5 (severe, depends on Bucket 2 #2) | If the user picks option (a) on Bucket 2 #2 (BPA owns capability_maps), APM's existing master DMDO row on `business_capability_maps` (module 103) demotes to `embedded_master`, plus APM-prefixed permission `apm-portfolio-registry:publish_business_capability_map` needs to be deleted and re-derived under BPA. | The deeper cleanup of the existing scope-crossing into APM. |
| GRC / BCM / ITSM (potential SCOPE-CREEP) | None observed today; flag for future audits if BPA cross-edges drift. | No action. |

### Candidates queued

Two domain candidates surfaced or bumped during this audit (both via the helper):

1. **EA (Enterprise Architecture)** - new candidate. First mention. Vendor evidence: LeanIX (SAP), Ardoq, Software AG Alfabet, BiZZdesign Horizzon, MEGA HOPEX, Avolution ABACUS, Sparx EA. Adjacency: BPA, APM, SPM, ITSM, CMDB. Strong overlap signal: 4 of 9 BPA solutions are EA leaders. Promotion would force the Bucket 2 #3 solution split and potentially the Bucket 2 #2 capability-map owner.
2. **IBPMS (Intelligent Business Process Management Suite)** - existing candidate, mention count bumped to 2 (previously 1). Vendor evidence: Camunda Platform, Pega Platform, IBM Business Automation Workflow, Appian, Bonita. Adjacency: BPA, RPA, LCAP, WORK-MGMT. iBPMS is the execution-side counterpart to BPA's authoring-side; whether DMN belongs in BPA or iBPMS (Bucket 3 #4) depends on this candidate's status.

## 2026-05-31, Continuation: B1 technical fixes

Applied the truly-technical subset of Bucket 1 against the live catalog via loader `c:/dev/domain-map/.tmp_deploy/fix_bpa_b1_technical_2026_05_31.ts`. All judgment-bearing Bucket 1 items (module shape, capability_map canonical owner, catalog UX, pattern-flag flips, new lifecycle states, new domain_aliases, all M-band gated work, all B10b backfills) were deferred to the user. Audit row counts above are pre-fix; the live counts below reflect post-fix state.

### Fixes applied

| ID | Action | Result |
|---|---|---|
| B1-B1 | INSERT 3 users -> master `data_object_relationships` edges (Rule #10) | ids 1766 (247 owns_business_process_model), 1767 (249 owns_value_stream), 1768 (250 requests_process_simulation_run). Pattern: `data_object_id=748` source, snake_case verbs mirroring canonical row 1044 |
| B1-B2 | DELETE legacy near-duplicate row 226 | No-op: row 226 was already absent in live state. Only canonical row 1044 (users -> business_capability_maps, `owns_business_capability_map`) remains. Audit row count for row 226 was stale |
| B1-B3 | INSERT 3 intra-BPA master `data_object_relationships` | ids 1769 (249 maps_to_business_process_model 247), 1770 (248 groups_business_process_model 247), 1771 (250 simulates_business_process_model 247). All `one_to_many`, `reference`-kind. Audit's optional 4th edge (value_streams supports business_capability_maps) deferred |
| B1-B5 | INSERT 6 `data_object_aliases` (synonym) on 247/249/250 | ids 1003 (247 "BPMN diagram"), 1004 (247 "process map"), 1005 (249 "VSM"), 1006 (249 "lean value stream map"), 1007 (250 "Monte Carlo simulation run"), 1008 (250 "what-if scenario") |
| B1-H1 | INSERT 10 `handoff_processes` agent_curated tags | ids 551-560 across handoffs 180, 181, 182, 184, 740, 741, 783, 784, 785, 786. PCF resolution: external_id 16378 -> process 78 (Manage business processes) x7, 10013 -> process 13 (Develop and Manage Business Capabilities) x1, 11161 -> process 1708 (Reengineer business processes and systems) x3. Handoff 181 used the audit's primary recommendation (PCF 13); alt PCF 261 (Define and maintain enterprise architecture) deferred to user |

All inserts omitted `record_status` (DB default `new` per Rule #1) and `notes` (default `''` per Rule #15).

### Deferred items (12 of 17 Bucket 1)

| ID | Reason for deferral |
|---|---|
| B1-M1 | New `domain_modules` rows. Module split shape is Bucket 2 #1 user decision (3 vs 4 vs 2 modules) |
| B1-M2 | DMDO master rows on new BPA modules. Gated on B1-M1 |
| B1-M3 | `business_capability_maps` canonical owner is Bucket 2 #2 user decision (BPA vs APM vs EA) |
| B1-M4 | PATCH lifecycle states 673/674/675 `domain_module_id` to new BPA module. Gated on B1-M1 / B1-M3 |
| B1-M5 | New `domain_module_capabilities` rows. Gated on B1-M1 |
| B1-S1 | `catalog_tagline` / `catalog_description` drafts. Rule #20 surface-to-user before any write |
| B1-S2 | DELETE legacy `bpa-system` skill (id 34). Gated on per-module system skills landing first, which requires B1-M1 |
| B1-S3 | PATCH `source_domain_module_id` on 8 outbound handoffs. Gated on B1-M1 (new modules are the source masters' holders) |
| B1-S4 | PATCH `target_domain_module_id` on 3 inbound + 3 outbound handoffs. Inbound gated on B1-M1; outbound to PROC-MIN / SPM gated on those domains' B10b (Report-only follow-ups) |
| B1-S5 | New intra-BPA `handoffs` rows. Gated on B1-M1 |
| B1-S6 | New `domain_aliases` rows for BPA. Out of scope for the technical pass per the continuation prompt |
| B1-B4 | New `data_object_lifecycle_states` (on 247/249/250) + pattern-flag PATCHes on `data_objects`. New entities + flag flips, both deferred per prompt; Bucket 2 #4 still owes user confirmation on the three positive evaluations |

Bucket 2 #6 (promote-or-keep handoff 183 substring tag) was untouched; the existing discovery_substring row (id 102) remains.

### Live state after fix

- `data_object_relationships` touching BPA masters: 9 rows (was 3). Breakdown: 4 users->master edges (247/248/249/250 each have one canonical user edge), 3 intra-BPA edges (audit B6 satisfied for the 3 named tuples), 1 enterprise_applications->business_capability_maps edge (id 217, pre-existing, owned by APM substrate), 1 legacy is now redundant only on 248 (already absorbed).
- `data_object_aliases` on BPA masters: 8 rows (was 2). Coverage: 247 has 2, 248 has 2, 249 has 2, 250 has 2.
- `handoff_processes` on BPA-touching handoffs: 11 rows (was 1). Catalog quality count remains 0 `record_status='approved'`; all new rows are `agent_curated` per Rule #1.

### Loader

`c:/dev/domain-map/.tmp_deploy/fix_bpa_b1_technical_2026_05_31.ts`. Run from `c:/dev/domain-map` with `bun run`. Idempotent (each step re-checks live state before acting). JWT errors: none.

## 2026-05-31, Audit

### Summary

- Current footprint (live, post-2026-05-31 continuation): 0 `domain_modules`, 4 legacy `domain_data_objects` master rows (247, 248, 249, 250), 1 DMDO `role='master'` row catalog-wide on the four (248 on APM-PORTFOLIO-REGISTRY module 103), 7 capabilities, 9 solutions, 0 regulations, 4 trigger events on BPA masters with `event_category=''` plus 1 with `state_change`, 8 outbound + 3 inbound handoffs, 1 legacy `skill_type='system'` skill `bpa-system` (id 34, `domain_module_id=null`) with 4 query-tier `skill_tools`, 0 roles attributable to BPA, 9 `data_object_relationships` rows touching BPA masters (4 users-edges, 3 intra-BPA, 1 enterprise_applications cross-edge, 1 already-canonical row), 8 aliases on the four masters (2 per master), 3 lifecycle states on 248 with `domain_module_id=103`, 0 `domain_aliases`, 0 `business_function_capabilities` overrides, 11 `handoff_processes` rows covering all 11 BPA-touching handoffs (10 `agent_curated` + 1 `discovery_substring`, 0 `approved`).
- Bucket 1 (in-scope, agent fixable): 0 items. All five technical Bucket 1 items the 2026-05-30 audit identified (B1-B1, B1-B2, B1-B3, B1-B5, B1-H1) were applied in the 2026-05-31 continuation; the remaining 12 Bucket 1 items are gated on B1-M1 (modularization shape, Bucket 2 #1) or on policy decisions (Bucket 2 #2 for B1-M3, Rule #20 user surfacing for B1-S1, channel approval for lifecycle states / pattern flags). They are now reclassified as b1b (blocked).
- Bucket 2 (surface-for-user, judgment): 6 items, unchanged in substance from 2026-05-30. The dominant blocker remains module shape (2 vs 3 vs 4 modules).
- Bucket 3 (Phase 0 pending, speculative): 8 entity candidates, unchanged from 2026-05-30. EA candidate promotion would shift Bucket 2 #2 and Bucket 2 #3.

**Structural verdict: M-band still hard-fails.** M1 (zero modules), M2 (vacuous), M4 (five of seven capabilities have zero realizing modules; two are realized through APM), M5 (lifecycle states on 248 anchored to APM module 103), M6 (vacuous), M7 (catalog-wide single-master integrity is satisfied for 248 but three masters 247/249/250 still have zero DMDO master rows anywhere), M8 (vacuous). The B5/B7/B9b/B10b/B11/B12/F2-F5 bands all remain blocked on M1. A4 (catalog UX) still fails. H1 is the only band where the audit advanced state: full coverage on all 11 cross-domain handoffs.

### Pass 1, Structural (per-domain completeness checklist)

#### S-band

**S1.** Direct FK coverage unchanged from 2026-05-30 audit: `domain_modules` 0 (M1 hard fail blocking), `domain_module_host_domains` 0, `skills` 1 (legacy only), `solution_domains` 9, `capability_domains` 7, `business_function_domains` 4, `domain_data_objects` 4 (claims 4 masters; ground-truth DMDO master row count is 1 on a sibling domain), `handoffs.source_domain_id` 8, `handoffs.target_domain_id` 3.

**S2.** Vacuously skipped (zero modules).

**S3.** Per-master coverage:

| data_object | states | events | aliases |
|---|---|---|---|
| `business_process_models` (247) | 0 | 1 | 2 |
| `business_capability_maps` (248) | 3 (on APM module 103) | 1 | 2 |
| `value_streams` (249) | 0 | 1 | 2 |
| `process_simulation_runs` (250) | 0 | 2 | 2 |

Aliases band is now uniform (B11 passes per-master); states remain skewed.

#### A-band

- **A1.** Pass. All 7 metadata fields populated.
- **A2.** Pass (7 capabilities).
- **A3.** Pass (9 solutions, 8 primary).
- **A4.** Fail. `catalog_tagline=''`, `catalog_description=''`. Deferred to user per Rule #20 (B1-S1 from prior audit, still pending).
- **A5.** Skipped.

#### M-band

- **M1.** Hard fail. Zero `domain_modules` rows.
- **M2.** Inapplicable (M1 fail). Target shape under Rule #14 is >=2 modules (7 capabilities).
- **M4.** Inapplicable from BPA's side. 2 of 7 capabilities (343, 344) realized through APM-PORTFOLIO-REGISTRY. 5 of 7 (338-342) have zero realizing modules.
- **M5.** 3 lifecycle states on 248 carry `domain_module_id=103` (APM). Collides with M7 narrative.
- **M6.** Inapplicable.
- **M7.** **Mixed.** Catalog-wide single-master rule is satisfied for 248 (exactly one DMDO master row, on APM module 103); 247, 249, 250 have zero DMDO master rows anywhere (orphans). The original 2026-05-30 framing as a "cross-domain master location collision" was imprecise: the legacy `domain_data_objects` rollup is a separate concern from the DMDO master count. The Bucket 2 #2 decision (who canonically owns 248) is still required.
- **M8.** Vacuous (zero modules).

#### B-band

- **B5.** Vacuously inapplicable (no BPA modules to hold `embedded_master` rows).
- **B7.** **Pass after continuation.** All 4 BPA masters (247, 248, 249, 250) now have exactly one `users` edge each (ids 1766, 1767, 1768, 1044, all snake-case verbs). No near-duplicates remain.
- **B9.** Five trigger events on 4 masters; 8 outbound handoffs reference them. Coverage pattern unchanged.
- **B9b.** Vacuously inapplicable.
- **B10b.** **Fail.** Outbound: 8/8 rows have `source_domain_module_id=null`. Outbound `target_domain_module_id`: 184/181/182/784/786 have it set (5/8), 180/783/785 are null (3/8). Inbound: 3/3 have both module FKs null. All gated on B1-M1.
- **B11.** **Pass after continuation.** 8 aliases on the four masters (2 each).
- **B12.** **Fail on 3 of 4.** 247, 249, 250 carry zero lifecycle states. 248's 3-state machine is anchored to APM module 103. Pattern-flag re-evaluation (Bucket 2 #4) still owed.

#### C-band

- **C1.** Pass (4 rows: 1 owner, 2 contributors, 1 consumer).
- **C2.** Pass (no overrides; consistent ownership across capabilities).

#### D-band

- **D1.** UI spot-check deferred (audit is read-only).

#### E-band

- **E1.** Vacuously passes (single-module domains skip E1 by capability_count threshold, but BPA has zero modules so the floor is moot until B1-M1 lands). Zero BPA-attributable roles.
- **E2-E5.** Vacuously inapplicable.

#### F-band

- **F1.** **Fail.** Legacy `bpa-system` (id 34, `domain_module_id=null`) still present. Cannot be cured until per-module system skills land (B1-S2 from prior audit, gated on B1-M1).
- **F2.** Inapplicable.
- **F3.** Legacy skill has 4 `skill_tools` rows (all query, all `coverage_tier=platform`).
- **F4.** Pass invariant: all 4 tools are `operation_kind=query` with `data_object_id` set.
- **F5.** Per-module score uncomputable (no modules); legacy-skill rollup 4/4 = 100% strict (misleading per prior audit note).

#### H-band

- **H1.** **Pass on coverage.** All 11 BPA-touching cross-domain handoffs have `handoff_processes` rows (10 `agent_curated` + 1 `discovery_substring`). Catalog-quality headline: 0 `record_status='approved'` (review-triage signal). Process-health side-bar: 10 `agent_curated` rows (the 2026-05-30 continuation's Bucket 1 H1 fix landed cleanly). Bucket 2 #6 (handoff 183 substring promote vs leave) still open.

### Pass 2, Domain market audit (semantic)

No re-spawn of the market-surface subagent this run; the 2026-05-30 audit's Bucket 3 candidate list still stands and no Phase 0 vetting has occurred since. The MISSING / WRONG-OWNERSHIP / SCOPE-CREEP categorization carries over verbatim:

- **MISSING (workflow substrate, all speculative pending Phase 0):** `process_documentation_pages`, `process_review_cycles`, `process_governance_workflows`, `process_kpis`, `process_metric_definitions`, `archimate_models`, `decision_models`, `model_revision_diffs`, `process_change_requests`.
- **WRONG-OWNERSHIP:** `business_capability_maps` (248) DMDO master on APM module 103, pending Bucket 2 #2.
- **SCOPE-CREEP:** none confirmed today; 4 of 9 BPA solutions are EA-leaders, watch when EA candidate promotes.
- **MODULARIZATION ISSUE (severe):** entire domain. Awaiting Bucket 2 #1.

### Pass 3, Neighbor discovery

Edge weights unchanged: PROC-MIN 5, PROD-MGMT 2, APM 2, SPM 1, WORK-MGMT 1. Only PROC-MIN qualifies for the full pairwise pass (>=3).

### Pass 4, Pairwise reconciliation (BPA <-> PROC-MIN, weight 5)

No new findings since 2026-05-30. All 5 BPA<->PROC-MIN handoffs (180, 783, 183, 740, 741) still carry NULL `source_domain_module_id` on the BPA side; once BPA modularizes, the source-side module FK derives from 247 / 250 master locations and the target-side module FK on the 3 inbound rows derives from BPA's prospective `consumer` / `contributor` DMDO rows. The Bucket 2 #5 candidate (PROC-MIN -> BPA on `discovered_process_model.reconciled` once BPA absorbs a discovered variant) remains open.

### Bucket 1, In-scope confirmed gaps

**Zero items.** The five technical fixes from 2026-05-30 (B1-B1 user edges, B1-B2 legacy edge cleanup, B1-B3 intra-BPA relationships, B1-B5 aliases, B1-H1 APQC tags) all landed in the 2026-05-31 continuation. The remaining 12 Bucket 1 items from 2026-05-30 are all blocked: 11 on B1-M1 (zero modules) or B1-M3 (capability_map owner), 1 on Rule #20 user surfacing (B1-S1, catalog UX). They are reclassified as b1b (blocked) in state.yaml.

### Bucket 2, Surface-for-user (judgment calls)

Carried verbatim from 2026-05-30; none resolved in the continuation:

1. **Module split shape.** 2 vs 3 vs 4 modules. Default proposal: 3 modules (`BPA-PROCESS-REPO`, `BPA-CAPABILITY-MAP`, `BPA-VALUE-STREAM`). Cascades into every M-band fix.
2. **`business_capability_maps` canonical owner.** BPA vs APM vs queued EA. The DMDO master row sits on APM module 103 today; lifecycle states 673/674/675 anchored there too. Gates B1-M3, B1-M4, B1-S2 sequencing.
3. **Solution split with EA candidate.** 4 of 9 BPA solutions (MEGA HOPEX, BiZZdesign Horizzon, Software AG ARIS, SAP Signavio) also EA leaders. Decision deferred until EA promotes.
4. **Pattern-flag re-evaluation per Rule #12.** 12 cells (3 flags x 4 masters). Three positive evaluations proposed: 247 `has_submit_lock=true`, 248 `has_single_approver=true`, 250 `has_submit_lock=true`. User confirmation needed before PATCHing.
5. **PROC-MIN reconciliation reach.** Author candidate handoff `discovered_process_model.reconciled` now (post B1-M1), defer to PROC-MIN audit, or skip as overspecification.
6. **APQC tag for handoff 183.** Existing `discovery_substring` row (process 414 `Manage non-conformance`, L3). Options: (a) promote to `agent_curated` and add sibling tag on PCF 78 (`Manage business processes`, L2 parent), (b) leave substring + add sibling agent_curated, (c) leave as-is. The 2026-05-31 continuation chose (c) implicitly.

### Bucket 3, Phase 0 pending (speculative)

Carried verbatim from 2026-05-30; no Phase 0 vetting performed since:

| # | Candidate | Proposed module | Vendor knowledge basis |
|---|---|---|---|
| 1 | `process_documentation_pages` | `BPA-PROCESS-REPO` (publish slice) | Trisotech Process Publisher, Bizagi Process Documenter, Signavio Process Manager Publishing |
| 2 | `process_kpis` + `process_metric_definitions` | `BPA-PROCESS-REPO` or `BPA-VALUE-STREAM` | Signavio Process Intelligence, ARIS Performance Manager |
| 3 | `reference_framework_libraries` | `BPA-CAPABILITY-MAP` | APQC PCF, eTOM, SCOR, ITIL 4 capability libraries |
| 4 | `decision_models` (DMN) | new `BPA-DMN-MODEL` or fold into `BPA-PROCESS-REPO` | Trisotech DMN, Signavio Decision Manager |
| 5 | `process_review_cycles` / `process_governance_workflows` | `BPA-PROCESS-REPO` | Signavio Governance, ARIS Designer governance workflows |
| 6 | `model_revision_diffs` | `BPA-PROCESS-REPO` | Every vendor's version-graph diff/merge |
| 7 | `process_change_requests` | `BPA-PROCESS-REPO` | ARIS Connect, Signavio Collaboration Hub |
| 8 | `archimate_models` / `togaf_artifacts` | EA candidate (queued) rather than BPA | BiZZdesign Horizzon, ARIS ArchiMate |

### Cross-bucket dependencies

- Bucket 2 #1 depends on Bucket 3 #3 and #4 (DMN module decision, framework-library entity promotion).
- Bucket 2 #2 depends on EA candidate (Bucket 3 EA promotion).
- Bucket 2 #3 fully gated on EA candidate promotion.
- All b1b items are gated on Bucket 2 #1 (module shape) or Bucket 2 #2 (capability_map owner).

### Decisions

None this audit run. The 2026-05-30 audit's narrative continues to drive the open queue.

### Fixes applied

None this audit run. (The 2026-05-31 continuation applied the five technical Bucket 1 items already; this audit run is the Validate b1 structural re-check on the post-fix state.)

### Report-only follow-ups (owed by other domains)

Unchanged from 2026-05-30:

| Owner | Finding |
|---|---|
| APM B10b | NULL `target_domain_module_id` on inbound handoffs 181, 182 from BPA where APM is the consumer (currently 181 and 182 have `target_domain_module_id=103`; the BOTH-FK NULL claim was an artifact of the prior framing). Re-verified: those rows are clean on the target side. |
| PROC-MIN B10b | Outbound 183, 740, 741 (PROC-MIN to BPA) have `source_domain_module_id=null` on the PROC-MIN side. PROC-MIN's audit owes B10b backfill once PROC-MIN's modular footprint absorbs the source-side master attribution. |
| PROD-MGMT B10b | Outbound 184 / 784 (BPA to PROD-MGMT) carry `target_domain_module_id=131` (PM-ROADMAP-DELIVERY). Clean on PROD-MGMT side. |
| SPM B10b | Outbound 785 (BPA to SPM) has `target_domain_module_id=null`. Owed to SPM's B10b once SPM decides which module consumes BPA simulation results. |
| WORK-MGMT | Outbound 786 carries `target_domain_module_id=149` (WORK-MGMT-TASK-EXEC). Pass. Informational. |

### Candidates queued

Unchanged: EA (Enterprise Architecture) and IBPMS (Intelligent Business Process Management Suite). Both still pending promotion decisions.

JWT errors: none.

## 2026-06-02 Audit (modularization)

### Summary

BPA was an unbuilt domain (M1 hard fail: 0 `domain_modules`) carrying 7 capabilities and 4 master-claimed data_objects via the legacy `domain_data_objects` rollup. This pass executed the modularization-only scope: it authored the BPA module set, linked every capability, and assigned every existing data_object at its preserved role and necessity. No new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships were created. The default 3-module shape from the 2026-05-30 audit (Bucket 2 #1 option a) was adopted.

The single load-bearing structural decision: `business_capability_maps` (248) already holds its one catalog-wide `role='master'` DMDO row on **APM-PORTFOLIO-REGISTRY** (module 103, APM domain). Under M7 (single-master) and the "reuse existing entities, never promote to master" rule, 248 was assigned in BPA as **embedded_master / required**, NOT master. The B2-CAPMAP-OWNER user decision (relocate the master to BPA vs accept APM as canonical) remains open and untouched. Likewise capabilities 343 (BUSINESS-CAPABILITY-MAP) and 344 (REFERENCE-FRAME-LIBRARY) are now realized through the new BPA-CAPABILITY-MAP module **in addition to** their existing APM-103 realizations; the APM realizations were left in place (their removal is part of the deferred capmap-owner reconciliation, not this scope).

### Module split

| Module (id) | Capabilities | Data objects (role / necessity) |
|---|---|---|
| BPA-PROCESS-REPO (220) | 338 BPA-BPMN-MODEL, 339 BPA-PROCESS-REPO, 342 BPA-PUBLISH | 247 business_process_models (master / required) |
| BPA-CAPABILITY-MAP (221) | 343 BUSINESS-CAPABILITY-MAP, 344 REFERENCE-FRAME-LIBRARY | 248 business_capability_maps (embedded_master / required) |
| BPA-VALUE-STREAM (222) | 341 BPA-VALUE-STREAM, 340 BPA-SIMULATION | 249 value_streams (master / required), 250 process_simulation_runs (master / required) |

All three modules `module_kind='full'`, `record_status='new'`. `catalog_tagline` and `catalog_description` intentionally left empty on all three (M8 / A4 buyer-copy gap, owed back to Phase A and the user per Rule 20).

### Counts

- `domain_modules` for BPA: 0 -> 3.
- `domain_module_capabilities`: 7 new rows; all 7 BPA capabilities now realized by a BPA module (M4 satisfied). Capabilities 343, 344 also retain their pre-existing APM-103 realizations (deferred cleanup).
- `domain_module_data_objects`: 4 new rows (3 master, 1 embedded_master); `notes=''` on all (R15).
- Master single-location check (M7): 247 master only on 220, 249 + 250 master only on 222, 248 master only on APM-103 (untouched). Each master held in exactly one module.
- M6: every module realizes >=1 capability and holds >=1 data_object; no empty module.
- Rule #14: 7 capabilities (>=3) yield 3 full modules (within the 2-3 target).

### Loader

`c:/dev/domain-map/.tmp_deploy/modularize_bpa_2026-06-02.ts`. Idempotent (re-checks each module by `domain_module_code`, each DMC by `(domain_module_id, capability_id)`, each DMDO by `(domain_module_id, data_object_id)`; re-reads modules for the code->id map, no hard-coded module ids). Verified idempotent on a second run (all rows reported as already present). JWT errors: none.

### Deferred gaps (now owed by the modularization)

- **Per-module system skills (Rule #17 -> F2/F3).** Each of the 3 new modules now owes exactly one `skill_type='system'` skill anchored by `domain_module_id`. The legacy `bpa-system` skill (id 34, `domain_module_id=null`) with its 4 query-tier `skill_tools` (332/65/333/334) must be DELETEd once the per-module skills land. Captured as b1a B1A-SKILLS.
- **Catalog UX backfill (M8 / A4).** `domains.catalog_tagline` / `domains.catalog_description` on row 136, and `catalog_tagline` / `catalog_description` on the 3 new module rows, are all empty. Rule 20 requires user-approved buyer copy before any write. Captured as b1a B1A-SKILLS (UX backfill clause) and b2 B2-CATALOG-UX.
- **Missing-master candidate.** None genuinely missing from this scope. 248's master location is a user-decision (B2-CAPMAP-OWNER / B3-CAPMAP-RELOCATE), not a missing master: it is mastered by APM today and embedded by BPA here. Recorded as b3 B3-CAPMAP-RELOCATE so the relocate option stays visible.
- **Capability-realization cleanup.** Capabilities 343, 344 are now double-realized (new BPA-221 rows plus legacy APM-103 rows). The APM-103 DMC rows (190, 191) should be removed if and only if B2-CAPMAP-OWNER resolves BPA as canonical owner. Left in place by design.
- **Downstream M-band fixes now unblocked.** B1B-M2 (already satisfied for 247/249/250 by the new master rows), B1B-M4 (relocate lifecycle states 673/674/675 to BPA-221, gated on capmap-owner), B1B-M5 (capability links, now landed for the BPA side), B1B-S3/S4 (handoff source/target module FK backfill, now derivable), B1B-S5 (intra-domain handoffs), B1B-B4 (lifecycle states on 247/249/250). These remain in the b1b queue: they require entity creation or PATCHes outside this modules-and-assignment-only scope.

JWT errors: none.

## 2026-06-05 - b1a execution

Executed b1a item **B1A-SKILLS** (Phase S system skills + tools + skill_tools per Rule #17, plus legacy retirement). Catalog-UX clause (B2-CATALOG-UX) NOT executed: Rule #20 buyer copy is drafted for the user and left OPEN. Loader: `c:/dev/domain-map/.tmp_deploy/bpa_b1a_skills_2026-06-05.ts` (idempotent; re-reads live state before each write; dedupes tools by tool_name, skills by skill_name, skill_tools by (skill_id, tool_id)). Run from `c:/dev/domain-map` with `bun run ... --apply`.

### Three-source derivation (Rule #17)

- **Source 1 (masters -> query + representative mutate + workflow gate):** each module's master(s) keep their existing `query_<entity>` tool and gain `create`/`update` plus a publish/run gate keyed to the master's published trigger_event (`process_model.published` -> `publish_business_process_model`; `capability_map.updated` -> `publish_business_capability_map`; `process_simulation_run.completed` -> `run_process_simulation_run`).
- **Source 2 (consumer/contributor reads):** BPA modules hold no consumer/contributor DMDO rows yet (deferred B1B-S4), so no cross-domain query tools were required.
- **Source 3 (outbound handoffs -> mutate on receiving side):** all 8 BPA outbound handoffs (180/181/182/184/783/784/785/786) publish BPA's OWN masters as the event payload (publish/run gates on 247/249/250), already covered by Source 1. No foreign-domain mutate tool required.
- **Channel rule:** `notify_person` (abstraction, coverage_tier=platform) linked OPTIONAL on each skill; the workflow needs no specific channel, so no channel primitive and not required.

### Tools created (9 new, dedup by tool_name)

All `operation_kind='mutate'`, `coverage_tier='platform'`, `data_object_id` set, `record_status` omitted (default new). Domain-specific mutates on BPA masters (Rule #9):

| id | tool_name | data_object_id |
|---|---|---|
| 1579 | create_business_process_model | 247 |
| 1580 | update_business_process_model | 247 |
| 1581 | publish_business_process_model | 247 |
| 1582 | create_business_capability_map | 248 |
| 1583 | publish_business_capability_map | 248 |
| 1584 | create_value_stream | 249 |
| 1585 | update_value_stream | 249 |
| 1586 | create_process_simulation_run | 250 |
| 1587 | run_process_simulation_run | 250 |

Reused existing tools (no insert): 332 `query_business_process_models`, 65 `query_business_capability_maps`, 333 `query_value_streams`, 334 `query_process_simulation_runs`, 892 `update_business_capability_map`, 913 `notify_person`.

### Skills created (3 new, one system skill per module)

`skill_type='system'`, `domain_id=136` (required by platform rule `domain_required_when_skill_type_is_system`), `domain_module_id` set as the canonical anchor, `record_status` omitted.

| id | skill_name | domain_module_id |
|---|---|---|
| 261 | bpa_process_repo_agent | 220 (BPA-PROCESS-REPO) |
| 262 | bpa_capability_map_agent | 221 (BPA-CAPABILITY-MAP) |
| 263 | bpa_value_stream_agent | 222 (BPA-VALUE-STREAM) |

### skill_tools created (17 rows, ids 2638-2654)

- Skill 261: 4 required (332 query, 1579 create, 1580 update, 1581 publish) + 1 optional (913 notify_person). 4/4 required platform => 100% Semantius.
- Skill 262: 4 required (65 query, 1582 create, 892 update, 1583 publish) + 1 optional (913). 4/4 platform => 100%.
- Skill 263: 6 required (333 query, 1584 create, 1585 update, 334 query, 1586 create, 1587 run) + 1 optional (913). 6/6 platform => 100%.

`notes=''` on all (Rule #15). F2 (one system skill per module), F3 (>=1 skill_tools each), F4 (operation_kind <-> data_object_id invariant), F5 (per-module Semantius score 100% strict) now pass for all 3 BPA modules.

### Legacy retirement (DELETE, snapshots captured)

- DELETE `skills` id 34 (`bpa-system`). Prior row: `{skill_name:'bpa-system', skill_type:'system', domain_id:136, domain_module_id:null, process_id:null, role_id:null, record_status:'new', description:'System skill for Business Process Architecture (em-dash) runtime workflows over the domain master data, derived from masters + cross-domain handoffs.'}`.
- DELETE 4 `skill_tools` rows on skill 34 (ids 373/374/375/376, all `requirement_level='required'`, `record_status='new'`, `notes=''`): 373->tool 332, 374->tool 65, 375->tool 333, 376->tool 334. (state.yaml's `extra_legacy_skill_tools_ids: [332,65,333,334]` had listed the tool_ids, not the skill_tools row ids; the actual deleted skill_tools rows were 373-376.) The 4 underlying query tools (332/65/333/334) were left in place and are now reused by the new per-module skills.

F1 (legacy `domain_module_id=null` system skill present) now passes: no legacy BPA system skill remains.

### Verification counts (re-queried post-apply)

- `skills` where `domain_id=136`: 3 (261/262/263), each `skill_type='system'`, distinct `domain_module_id` in {220,221,222}. Legacy skill 34 absent.
- `skill_tools` on skills 261/262/263: 17 (5 + 5 + 7). skill_tools 373-376 absent.
- `tools` for BPA masters: 6 query/mutate pre-existing + 9 new = 15 BPA-master tools, all `coverage_tier='platform'`.

### Drafted for user (B2-CATALOG-UX, Rule #20 - NOT written)

Catalog UX backfill (A4 on domain row 136, M8 on module rows 220/221/222) is buyer-shaped copy; Rule #20 forbids writing it without explicit per-row user approval. Left OPEN under b1a B1A-SKILLS (catalog-UX clause) and b2 B2-CATALOG-UX. Proposed drafts (buyer voice, workflow + value; no vendor names; no em-dashes):

- **Domain 136 (BPA)**
  - `catalog_tagline`: "Design, document, and publish how your business actually runs."
  - `catalog_description`: "Map your end-to-end processes, capabilities, and value streams in one connected workspace. Author process models, keep a single source of truth for how work flows, and publish approved versions your teams can trust. Simulate changes before you commit to them and hand insights off to the teams that execute, improve, and govern the work."
- **Module 220 (BPA-PROCESS-REPO)**
  - `catalog_tagline`: "Author, review, and publish your process models from one repository."
  - `catalog_description`: "Build and maintain a governed library of business process models. Draft new versions, route them for review, and publish the approved model so every team works from the same picture. Notify stakeholders automatically when a process is published."
- **Module 221 (BPA-CAPABILITY-MAP)**
  - `catalog_tagline`: "See what your business can do, and where to invest next."
  - `catalog_description`: "Build capability maps that show what your organization does, independent of how it is structured today. Anchor them to reference frameworks, keep them current as the business evolves, and publish a shared view that planning, architecture, and leadership can align around."
- **Module 222 (BPA-VALUE-STREAM)**
  - `catalog_tagline`: "Model your value streams and test changes before you make them."
  - `catalog_description`: "Map how value flows to your customers, spot the bottlenecks that slow delivery, and model improvements with simulation before you roll them out. Run what-if scenarios, compare outcomes, and share the results with the teams that act on them."

JWT errors: none.

### 2026-06-05 catalog UX written (supersedes the "drafted, left open" note above)

The empty `catalog_tagline` / `catalog_description` on the BPA domain row and modules 220, 221, 222 were WRITTEN (not parked). Loader: `.tmp_deploy/backfill_catalog_ux_2026_06_05.ts` (empty-guard: only empty fields written, no overwrite). record_status on these rows is `new`, so the copy is reviewed in-record per the revised Rule #20. The prior note in this date section that left the UX "open" is superseded; the UX-only state.yaml items were removed.

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.
