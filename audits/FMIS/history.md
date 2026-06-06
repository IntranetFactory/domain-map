# FMIS audit history

## 2026-05-30  -  Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **0 `domain_modules` rows** (M1 hard fail); 8 masters (`farm_fields`, `crop_plans`, `planting_records`, `field_applications`, `harvest_records`, `ag_input_inventory`, `variable_rate_prescriptions`, `machinery_telemetry_records`); 8 capabilities (FIELD-MAPPING, CROP-PLANNING, PLANTING-RECORDS, INPUT-INVENTORY, HARVEST-TRACKING, VARIABLE-RATE-PRESCRIPTION, MACHINERY-TELEMETRY, YIELD-ANALYTICS); 8 solutions (8 primary, 0 secondary); 8 trigger_events; 10 outbound + 0 inbound cross-domain handoffs; **0 aliases**; **0 lifecycle states**; 1 legacy domain-level system skill (`fmis-system`, id 61) + 8 `skill_tools` rows; 0 roles; 0 regulations.
- **Vendor-surface basis:** primary-coverage solutions on this domain are Climate FieldView, Granular, Conservis, AgriWebb, Trimble Ag Software, John Deere Operations Center, Farmbrite, AgWorld. The vendor list is captured in `solution_domains`, not narrated here.
- **Bucket 1 (in-scope, agent fixable):** 16 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 3 items.

**Headline structural finding:** the M-band is collapsed. FMIS has 8 capabilities and 8 masters but zero `domain_modules` rows. Every downstream band that reads module attribution (F2-F5, M2-M7, B9b, B10b source side, E1-E6) is therefore unevaluable until Phase A is finished. This audit treats the M-band gap as the headline Bucket 1 item; the structural sweep beyond M1/M2 surfaces the additional gaps that will need attention once modules exist.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO, ranked by edge weight):

| Neighbor | Out | In | DMDO consumers on FMIS masters | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| FOOD-TRACE | 4 | 0 | 0 (no modules in target) | 0 | 4 | Pairwise (full) |
| TELEMATICS | 2 | 0 | 0 (no modules in target) | 0 | 2 | Lightweight |
| ERP-FIN | 2 | 0 | 0 (no modules in target) | 0 | 2 | Lightweight |
| FSQM | 1 | 0 | 0 (no modules in target) | 0 | 1 | Lightweight |
| FARMER-DIRECT-SALES | 1 | 0 | 1 (FDS-HARVEST-PLANNING consumes `harvest_records`) | 0 | 3 | Pairwise (full) |

The DMDO-consumer side of the boundary is empty for four of five neighbors because **those four neighbors have zero `domain_modules` rows themselves** (FOOD-TRACE, FSQM, TELEMATICS, ERP-FIN all return empty `/domain_modules?domain_id=eq.<id>`). Only FARMER-DIRECT-SALES is modularized: its `FDS-HARVEST-PLANNING` module (id 124) declares the only DMDO consumer row on any FMIS master (`harvest_records` → consumer + required). That row is the only fully-wired consumer FMIS has anywhere in the catalog.

Structural pass bands: **M1 / M2 hard-fail** (zero modules); **F1 partial-fail** (one legacy domain-level system skill, no module-level skills exist or can exist until M1 is fixed); **F2-F5 unevaluable**; **B6 hard-fail** (zero intra-domain `data_object_relationships` among 8 masters); **B7 hard-fail** (zero `users` edges to any master despite obvious actor roles, applicator, recorder, owner); **B8 hard-fail** (zero cross-domain `data_object_relationships` despite 10 outbound handoffs); **B9 partial-fail** (3 events with empty `event_category`); **B10b partial-fail** (10/10 outbound handoffs have NULL `source_domain_module_id` because FMIS has no modules; 9/10 also have NULL `target_domain_module_id` because the targets are unmodularized); **B11 hard-fail** (zero aliases across 8 masters); **B12 hard-fail** (zero lifecycle states across 8 masters); **H1 hard-fail** (0 of 10 cross-domain handoffs tagged, zero `agent_curated`); **A / C / D** pass. **E1-E6** vacuously pass (no modules ⇒ no role_modules can exist).

Domain Semantius score (strict): currently 100% across the 8 platform-tier `skill_tools` on the legacy `fmis-system` skill, but **the score itself is meaningful only once F2 is fixed** (skill anchored to a module per Rule #17). Until then F5 is uncomputable in the target-state sense.

### Vendor surface basis

The 8 primary-coverage solutions span the three vendor archetypes flagship FMIS authors compete in: (a) telemetry-heavy machinery-OEM platforms (John Deere Operations Center, Trimble Ag Software), (b) input-centric agronomy + sales platforms (Climate FieldView, Granular, AgWorld), (c) farm-record bookkeeping platforms aimed at smallholders and mixed operations (Conservis, AgriWebb, Farmbrite). The current 8-master footprint reads as union-of-archetypes rather than archetype-specific, which is appropriate for a master module; the modularization Bucket 3 surfaces argue for splitting the surface into 2-3 modules along those archetype lines.

### Bucket 1  -  In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 / M2 (hard fail)** | **Zero `domain_modules` rows for FMIS.** 8 capabilities, 8 masters, 8 trigger_events, 10 outbound handoffs, 1 legacy domain-level system skill, all attached at the domain level only. M1 requires ≥1 full module; M2 requires ≥2 full modules for any domain with ≥3 capabilities (FMIS has 8). Recommended split (subject to Bucket 3 vetting): (a) `FMIS-FIELD-OPS` covering `farm_fields`, `crop_plans`, `planting_records`, `field_applications`, `variable_rate_prescriptions`, `ag_input_inventory`; (b) `FMIS-HARVEST-YIELD` covering `harvest_records`; (c) `FMIS-MACHINERY-TELEMETRY` covering `machinery_telemetry_records`. A 3-module split matches the 3 flagship vendor archetypes (input-centric, harvest-centric, machinery-centric) and keeps the cross-vendor integration boundary (harvest_records → FOOD-TRACE, telemetry → TELEMATICS) clean on a single module. | Phase A loader inserting `domain_modules` rows + `domain_module_capabilities` + `domain_module_data_objects` (`master + required` for each entity in its home module, `embedded_master` for shared masters). Surfaces upgrade paths for F2/F3 (per-module system skills) and M4-M7 once modules exist. |
| B1-S2 | **M4 / M6 (hard fail, gated on B1-S1)** | Every capability is currently orphan-from-module by definition; every module that gets created will need ≥1 `domain_module_capabilities` row. M6 (every module realizes ≥1 capability) and M4 (every capability has ≥1 realizing module) are both 0/8 today. | Author 8 `domain_module_capabilities` rows in the same Phase A loader as B1-S1, mapping each capability to its home module. |
| B1-S3 | **F1 (partial fail)** | Legacy domain-level system skill `fmis-system` (id 61, `skill_type='system'`, `domain_id=154`, `domain_module_id=null`) exists with 8 `query_<entity>` `skill_tools` rows. Rule #17 requires one system skill per `domain_modules` row, anchored via `domain_module_id`. The legacy row is the pre-modular pattern that F1 expects to retire once module-level skills exist. | Once B1-S1 lands, retire `fmis-system` (DELETE) and author one `<module_code>_agent` per new module (e.g. `fmis_field_ops_agent`, `fmis_harvest_yield_agent`, `fmis_machinery_telemetry_agent`) with the appropriate `query_` / `create_` / `update_` tools per module's master set. The current 8 `query_` tools are all `coverage_tier='platform'` and can be reused on the new skills; only the `skills.domain_module_id` anchor needs to be set per-skill. |
| B1-S4 | **B11 (hard fail)** | Zero `data_object_aliases` rows across 8 masters. Several of these have well-known cross-vendor or cross-industry synonyms: `farm_fields` → "paddock" (livestock/pasture), "plot", "block" (orchard/vineyard); `field_applications` → "spray record", "application pass"; `crop_plans` → "rotation plan", "season plan"; `planting_records` → "seeding pass", "as-planted record"; `harvest_records` → "yield record", "as-harvested record"; `ag_input_inventory` → "farm bin inventory", "input stock"; `variable_rate_prescriptions` → "VR map", "prescription file", "Rx map"; `machinery_telemetry_records` → "task data", "ISOXML record". | Author ≥1 alias row per master with the most common cross-vendor synonym. Load via cluster-drafts loader pattern. |
| B1-S5 | **B12 (hard fail)** | Zero `data_object_lifecycle_states` rows across 8 masters. Most of these have non-trivial workflows: `crop_plans` (draft → committed → in-progress → harvested → archived); `planting_records` (in-progress → completed → reconciled); `field_applications` (planned → recorded → REI-cleared → verified); `harvest_records` (in-progress → completed → reconciled → invoiced); `variable_rate_prescriptions` (drafted → published → dispatched → consumed); `ag_input_inventory` (active → low → ordered → received). Two of the 8 may legitimately qualify for the config-shape exemption (`farm_fields` and `machinery_telemetry_records` are append-only history surfaces with no per-state permissions), but that's a per-entity judgment, see Bucket 2. | Author state machines per master; load via a focused loader. Use `requires_permission=true` on each gated state to derive the workflow-gate permissions that the role layer will eventually consume. `domain_module_id` per state set to whichever module from B1-S1 realizes the gate. |
| B1-S6 | **B9 (partial fail)** | 3 of 8 trigger_events have empty `event_category` (Rule #13 enum requires `lifecycle / state_change / threshold / signal`): event 1111 `farm_field.boundary_updated`, 1112 `crop_plan.committed`, 1113 `planting_record.completed`, 1114 `ag_input_inventory.low`, 1115 `variable_rate_prescription.published`, 1116 `machinery_telemetry_record.captured`. Six events with empty `event_category`, actually. (343 and 344 are populated as `lifecycle`.) | PATCH all 6 events: `1111` → `state_change`; `1112` → `state_change`; `1113` → `state_change`; `1114` → `threshold`; `1115` → `state_change`; `1116` → `signal` (or `lifecycle` if the read is "an instance of telemetry record was created"). Decide between `signal` vs `lifecycle` once. |
| B1-S7 | **B6 (hard fail)** | Zero intra-domain `data_object_relationships` rows among the 8 FMIS masters. Expected edges from the flagship-vendor workflow shape: `farm_fields` ←contains→ `crop_plans` (1:N, required, farm_fields-owner); `crop_plans` ←produces→ `planting_records` (1:N, required); `crop_plans` ←drives→ `field_applications` (1:N, required); `crop_plans` ←produces→ `harvest_records` (1:N, required); `farm_fields` ←scoped_to→ `field_applications`, `planting_records`, `harvest_records` (1:N each, required); `variable_rate_prescriptions` ←targets→ `farm_fields` (N:1, required); `variable_rate_prescriptions` ←drives→ `field_applications` (1:N, required); `field_applications` ←consumes_from→ `ag_input_inventory` (N:1, required); `planting_records` ←consumes_from→ `ag_input_inventory` (N:1, required); `machinery_telemetry_records` ←scoped_to→ `farm_fields` (N:1, required); `machinery_telemetry_records` ←documents→ `planting_records` / `field_applications` / `harvest_records` (1:N each, required). 11 edges; cluster-drafts shape. | Author the 11 intra-domain relationship rows with `relationship_verb` + `inverse_verb` + `relationship_type` + `relationship_kind=reference` + `is_required` + `owner_side`. Load via cluster-drafts loader pattern. |
| B1-S8 | **B7 (hard fail)** | Zero `data_object_relationships` rows between `users` (data_object id 748, `kind='platform_builtin'`) and any of the 8 FMIS masters. Per Rule #10, every actor relationship needs an explicit row. Expected user-edges: `farm_fields ← owns ← users` (farm-owner / operator); `crop_plans ← plans ← users` (agronomist / farm-manager); `planting_records ← records ← users` (operator); `field_applications ← applies ← users` (applicator, often with a license number FK); `field_applications ← supervises ← users` (responsible-applicator); `harvest_records ← records ← users` (operator); `ag_input_inventory ← manages ← users` (input-manager); `variable_rate_prescriptions ← authors ← users` (agronomist); `machinery_telemetry_records ← operates ← users` (operator). 9 edges minimum. | Author the user-edge rows per Rule #10. Load alongside B1-S7. |
| B1-S9 | **B8 (hard fail)** | Zero cross-domain `data_object_relationships` rows from any FMIS master outbound. 10 outbound handoffs imply at least 6 payload→target mappings worth recording as relationships: harvest_records → traceability_lots (FOOD-TRACE master, payload of handoffs 350 / 349); field_applications → key_data_events (FOOD-TRACE master, handoffs 351, 352 split payload to FOOD-TRACE and FSQM); planting_records → traceability_lots (FOOD-TRACE, handoff 965); variable_rate_prescriptions → equipment_tasks or machinery_jobs (TELEMATICS payload, handoff 966); machinery_telemetry_records → equipment_utilization (TELEMATICS, handoff 968); ag_input_inventory.low → purchase_requisitions (ERP-FIN, handoff 967); crop_plans → input_cost_projections (ERP-FIN, handoff 970); farm_fields → traceability_lots (FOOD-TRACE land-linkage, handoff 969). Target-side master rows aren't loaded everywhere yet (FOOD-TRACE, FSQM, TELEMATICS, ERP-FIN are unmodularized and may or may not declare these masters today), so some edges will need to be deferred until target-side audits are scheduled. | Surface to user; load the relationship rows once target-side masters are confirmed. The one row that already exists (`harvest_forecasts is_informed_by harvest_records`, id 1106) is inbound from FDS, not outbound; doesn't satisfy the B8 outbound rule from FMIS. |
| B1-S10 | **B10b (partial fail, source side)** | 10/10 outbound handoffs carry NULL `source_domain_module_id`. Cannot be resolved until B1-S1 lands (no modules to point at). The B10b backfill procedure runs cleanly once the modules exist. | Deferred  -  gated on B1-S1. After the Phase A load, run the B10b backfill: for each handoff, set `source_domain_module_id` to the module that masters the trigger_event's `data_object_id`. |
| B1-S11 | **H1 (hard fail)** | 0 of 10 cross-domain handoffs carry `handoff_processes` rows. Volume expectation per SKILL: 0.5N to 0.8N for N=10 → 5-8 `agent_curated` tags. Routine high-confidence tags below; some need PCF lookups deferred to fix-time because the APQC PCF cross-industry framework has very thin coverage of agricultural workflows. | Author the candidate tags below with `proposal_source='agent_curated'`, `record_status='new'`. The composed key (`handoff_id`, `process_id`) prevents duplicates. |

#### APQC TAGGING

10 cross-domain handoffs, zero existing tags. The APQC PCF cross-industry framework has thin coverage of agricultural workflows  -  no "harvest", "agriculture", "planting", or "field-application" L2/L3 entries surface in lookup. The best fits are general production / supply-chain processes, which is a known degradation of accuracy for primary-production industries. Defer the lowest-confidence cases to Discover Pass 3's custom-process authoring path.

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 350 | FMIS → FARMER-DIRECT-SALES | `harvest_record.created` | `harvest_records` | Maintain production records and manage lot traceability | 10370 (L3) | confident L3 |
| 349 | FMIS → FOOD-TRACE | `harvest_record.created` | `harvest_records` | Maintain production records and manage lot traceability | 10370 (L3) | confident L3 |
| 965 | FMIS → FOOD-TRACE | `planting_record.completed` | `planting_records` | Maintain production records and manage lot traceability | 10370 (L3) | confident L3 |
| 969 | FMIS → FOOD-TRACE | `farm_field.boundary_updated` | `farm_fields` | Maintain production records and manage lot traceability | 10370 (L3) | medium L3 (boundary-update is closer to land-record-keeping than lot traceability) |
| 970 | FMIS → ERP-FIN | `crop_plan.committed` | `crop_plans` | Create materials plan | 10223 (L3) | medium L3 (crop-plan-as-input-procurement-trigger fits the materials-plan shape) |
| 967 | FMIS → ERP-FIN | `ag_input_inventory.low` | `ag_input_inventory` | Order materials and services | 10279 (L3) | confident L3 |
| 351 | FMIS → FOOD-TRACE | `field_application.recorded` | `field_applications` | Maintain production records and manage lot traceability | 10370 (L3) | confident L3 |
| 352 | FMIS → FSQM | `field_application.recorded` | `field_applications` | Maintain production records and manage lot traceability | 10370 (L3) | medium L3 (food-safety regulatory record-keeping leans here) |
| 966 | FMIS → TELEMATICS | `variable_rate_prescription.published` | `variable_rate_prescriptions` | Schedule production | 10303 (L3) | low L3  -  defer to Discover custom-process; "dispatch a prescription map to machinery" is closer to a custom workflow than any PCF L3 |
| 968 | FMIS → TELEMATICS | `machinery_telemetry_record.captured` | `machinery_telemetry_records` | Manage asset maintenance | 19245 (L3) | low L3  -  defer to Discover custom-process; per-job telemetry capture is not maintenance per se |

8 high-confidence / medium-confidence proposals (handoffs 350, 349, 965, 969, 970, 967, 351, 352); 2 deferred-to-Discover (handoffs 966, 968).

| Finding type | Count |
|---|---|
| STRUCTURAL (M1/M2 + F1 + B6/B7/B8/B9/B11/B12 + B10b source-side + APQC TAGGING umbrella) | 11 |
| MISSING (entity gap) | 0  -  Bucket 3 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| BOUNDARY | 0 (the B10b target-side / pairwise consumer DMDOs all route to other domains, see Report-only) |
| APQC TAGGING (high / medium confidence to load now) | 5 (drop the 2 medium-low + 2 defer rows from immediate-load set) |
| **Bucket 1 total** | 16 |

### Bucket 2  -  Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Rule #15 notes-pollution on `domain_data_objects`**  -  all 8 FMIS `domain_data_objects` rows carry populated `notes` text (`"Geographic field boundary records owned by the FMIS."`, `"Per-season crop plan per field; rotation history."`, etc.). Rule #15 mandates `notes` columns are empty by default; populated text needs explicit per-row user-approved wording. Were these notes user-approved at load time, or auto-populated by the loader? | Cannot tell from audit alone; the notes might have been explicitly approved during the original FMIS load or auto-written. | (a) Confirm user-approved; leave in place. (b) Confirm auto-population; PATCH all 8 rows to empty string and log the Rule-#15 incident. |
| B2-S2 | **Rule #15 notes-pollution on `handoffs`**  -  2 handoff rows (349 and 350) carry populated `notes` text describing the cross-vendor integration friction (`"Cross-vendor stack: production-side and sales-side are virtually always separate vendors..."`, `"Cross-vendor stack with same logical entity: FMIS on the production side vs FOOD-TRACE on the processor side..."`). Both texts read as substantive editorial commentary, not mechanical schema restatement, so they may legitimately survive a Rule-#15 audit if the user approved the wording. | Same  -  load-time approval status unknown. | (a) User-approved at load time, leave. (b) Auto-written; PATCH to empty string. The texts are substantive enough that "approve and keep" is a reasonable outcome if the user remembers authoring them. |
| B2-S3 | **Rule #18 forbidden-zone prose in `domains.description` and `domains.business_logic`.** The current `domains.description` for FMIS reads: *"Records, plans, and analyzes farm operations: ... Distinct from generic ERP because operations are weather / soil / season-bound and depend on satellite-imagery, IoT-sensor, and machinery-telemetry feeds (ISOBUS, CAN-bus, **John Deere Operations Center API**)."* `John Deere Operations Center` is a specific vendor product. Similarly `business_logic` mentions `"John Deere Operations Center API"`. Per Rule #18, vendor names belong only in `vendors` / `solutions` / `data_object_aliases` / `tool_solutions` and statutory/standards-body names (HIPAA, GDPR, ISOBUS, CAN-bus). ISOBUS and CAN-bus are open standards (statutory-like), so those stay. The John Deere reference is the violation. | The fix has two correct shapes: strip the vendor reference and rewrite the sentence around the open standards, OR retain the vendor reference if it is the ONE legitimate exception (acknowledging the de-facto API-of-record). Rule #18 grants no such exception today. | (a) PATCH `description` and `business_logic` to strip "John Deere Operations Center API" and re-anchor on the open-standard list (ISOBUS, CAN-bus, plus generic "vendor-API integrations"). (b) Add to skill-changelog Incidents and PATCH per (a). (c) The user proposes the exact replacement wording. |
| B2-S4 | **B4 pattern-flag re-evaluation per Rule #12.** Every master has all three pattern flags `false`. Specific candidates that may need positive re-evaluation: `field_applications.has_submit_lock=true` (chemical/fertilizer application records are statutory evidence  -  once recorded, they should freeze, modifications require an explicit amendment workflow); `harvest_records.has_submit_lock=true` (yield records that feed traceability lots and direct-sales available-share are also evidence-bearing); `crop_plans.has_single_approver=true` (organic-certified operations require an approving agronomist on the plan); `farm_fields.has_personal_content=false` is correct (land records are not personal data in the GDPR sense even when the owner is a sole-trader natural person). | Pattern flags are workflow-shape judgments the user owns. Default false doesn't establish review. Per Rule #15, recording the consideration in `notes` is forbidden. | Per-flag yes/no from user; decisions are captured below. |

### Bucket 3  -  Phase 0 pending (speculative)

The audit's market-surface pass surfaced three speculative gaps, all centered on the modularization choice and the input-side scope. Vendor knowledge basis: each flagship vendor draws the boundary somewhere different, the diff is at the module-boundary level not at the entity level.

| # | Candidate finding | Vendor knowledge basis | Recommended verification |
|---|---|---|---|
| B3-S1 | **The 3-module split proposed in B1-S1 may be over-decomposed.** Conservis and AgriWebb actually present a single-module surface to smallholders (field + harvest + machinery in one app). Climate FieldView and JD Operations Center split into a "decision" surface (plan + Rx) and a "record" surface (as-planted, as-applied, as-harvested). Trimble splits along precision-ag-vs-general-FMIS lines. The 3-module split (FIELD-OPS / HARVEST-YIELD / MACHINERY-TELEMETRY) corresponds to the JD split. A 2-module split (FIELD-OPS / MACHINERY-TELEMETRY) lumping harvest into FIELD-OPS is also defensible. | Conservis docs, AgriWebb feature lists, FieldView platform overview, JD Operations Center module taxonomy. | Phase 0 vendor research subagent to enumerate the entity-by-vendor matrix and recommend the cleanest split. Or eyeball-mode: user picks 2-module or 3-module split and modules ship per pick. |
| B3-S2 | **Agronomic recommendations / agronomy as a possibly-separate module.** Climate FieldView and Granular both ship "agronomic advisor" surfaces (planting-window recommendations, spray-window recommendations, soil-zone recommendations) as distinct from the record-keeping master. The current FMIS footprint does not have an `agronomic_recommendations` or `soil_test_results` master; the recommendation surface is implicit in `variable_rate_prescriptions` (the result) but not in the upstream data (`soil_zones`, `weather_observations`, `agronomic_recommendations`). This may be a MISSING entity cluster worth surfacing in Phase 0. | FieldView's "Field Health Imagery" + "Nitrogen Advisor" + "Variety Selection". Granular's agronomy module. AgWorld's agronomy notes. | Phase 0 subagent to enumerate the agronomic-recommendation surface, decide if it's an FMIS sub-module or a separate adjacent domain (PRECISION-AG-AGRONOMY) worth queuing as a missing-domain candidate. |
| B3-S3 | **Livestock / cattle-grazing as out-of-scope vs. in-scope.** AgriWebb is primarily a livestock-FMIS (paddocks, mob movements, individual-animal records). The current FMIS footprint reads as crop-only. Either (a) FMIS is implicitly a crop-FMIS and a separate domain (`LIVESTOCK-MGMT` or similar) should be queued for the livestock surface, (b) FMIS is meant to cover both and the master list needs `livestock_records` / `pasture_assignments` / `animal_movements` added, (c) the AgriWebb solution_domain row should drop to `secondary` or `partial` coverage_level to reflect that FMIS doesn't really cover livestock today. | AgriWebb's entire schema. Cattle Manager, BeefCentral, Herdwatch as more specialized livestock alternatives. | Phase 0 subagent to clarify the boundary, decide between domain-split (option a  -  queue LIVESTOCK-MGMT in `audits/_missing-domains.md`) and entity-extension (option b  -  add livestock masters). Option (c) is a coverage-level PATCH and trivially loadable once decided. |

### Cross-bucket dependencies

- **B1-S1 (M1/M2 module split) is the upstream gate for B1-S2 (M4/M6), B1-S3 (F1 retirement), B1-S10 (B10b source-side), and indirectly for B1-S5 (B12  -  `data_object_lifecycle_states.domain_module_id` needs the new module ids).** Pick the module split first (Bucket 3 #B3-S1 informs this), then everything else falls into place.
- **B3-S1 (module split  -  2 vs 3 modules) informs B1-S1.** If you choose the eyeball route on B3-S1, B1-S1 picks up the chosen split. If you choose the Phase 0 route, B1-S1 waits for Phase 0 to land.
- **B3-S2 (agronomy module) informs B1-S1 only weakly**  -  the Phase A loader can ship a 2-or-3 module split today and accommodate an agronomic-recommendations 4th module later without rework.
- **B3-S3 (livestock scope) is independent** of the rest. Either route resolves it as a coverage-level PATCH and/or a missing-domain queue entry.
- **B2-S1 / B2-S2 / B2-S3 (Rule #15 / Rule #18 reverts) are independent** of the M-band gating; they're PATCHes that can run before or after the Phase A load.
- **B2-S4 (pattern flags) is independent** of the M-band gating; PATCHes on `data_objects` rows directly.

### Per-bucket prompts

**Bucket 1  -  fix these now?** Reply with: `all`, or list (e.g. `S1, S3, H1-top5`), or `skip`.

- **S1 (M1/M2  -  Phase A loader inserting 2 or 3 `domain_modules`):** decide split first (B3-S1).
- **S2 (M4/M6  -  author `domain_module_capabilities`):** ships with S1's loader.
- **S3 (F1  -  retire `fmis-system`, author per-module system skills):** gated on S1.
- **S4 (B11  -  load aliases for 8 masters):** independent; loadable now.
- **S5 (B12  -  load lifecycle states for 6 of 8 masters):** depends on S1 for `domain_module_id`. The 2 config-shape candidates (`farm_fields`, `machinery_telemetry_records`) decided in Bucket 2 #B2-S4.
- **S6 (B9  -  PATCH 6 trigger_event categories):** trivial; 6 PATCHes.
- **S7 (B6  -  load 11 intra-domain relationship rows):** independent; loadable now. Use cluster-drafts.
- **S8 (B7  -  load 9 user-edge rows per Rule #10):** independent; loadable now.
- **S9 (B8  -  load 6+ cross-domain relationship rows):** gated partially on target-side master existence; some rows defer to target-domain audits.
- **S10 (B10b source-side backfill):** gated on S1.
- **S11 (H1  -  load 8 APQC tags, defer 2):** independent; loadable now (uses live state).

**Bucket 2  -  what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 / B2-S2 (Rule #15 notes on DMDO and handoffs):** the audit can revert if you confirm auto-population. If they were approved, say so and I leave them.
- **B2-S3 (Rule #18 vendor reference in description / business_logic):** option (a), (b), or (c)?
- **B2-S4 (pattern flags):** per-flag yes/no on the 4 candidates listed.

**Bucket 3  -  Phase 0 pending  -  vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball, name which of the 3 candidates ring true.

The single highest-leverage Bucket 3 item is B3-S1 (module split) because it gates Bucket 1.

### Report-only follow-ups (owed by other domains)

These items the FMIS audit surfaced but cannot fix from this side. Each names the owing domain and the missing check ID on that side. The user can choose to also schedule b1 audits for those domains.

| Owing domain | What's missing | Check ID on that side |
|---|---|---|
| FOOD-TRACE | Zero `domain_modules` rows; cannot consume FMIS handoffs at the module level. 4 outbound FMIS handoffs target FOOD-TRACE with NULL `target_domain_module_id`. | FOOD-TRACE M1, B10b target-side, B8 inbound payload→target relationship rows. |
| FSQM | Zero `domain_modules` rows; identical pattern to FOOD-TRACE. 1 outbound FMIS handoff targets FSQM. | FSQM M1, B10b target-side, B8 inbound. |
| TELEMATICS | Zero `domain_modules` rows; 2 outbound FMIS handoffs target TELEMATICS (VR prescription, telemetry record) with NULL `target_domain_module_id`. | TELEMATICS M1, B10b target-side, B8 inbound. |
| ERP-FIN | Zero `domain_modules` rows on this slice; 2 outbound FMIS handoffs target ERP-FIN (input-low, crop-plan-committed). | ERP-FIN M1 (for the procurement / cost-allocation slice that consumes farm input), B10b target-side. ERP-FIN is a large existing domain; the M1 finding here is specific to the ag-input slice not the whole ERP-FIN. |
| FARMER-DIRECT-SALES | Has modules and 1 fully-wired consumer row (`FDS-HARVEST-PLANNING` consumes `harvest_records`). No outstanding report-only item from FMIS's side for this neighbor. | FDS-HARVEST-PLANNING side is clean; the corresponding cross-domain relationship row (`harvest_records spawns harvest_forecasts` or similar) is FMIS's B8 to author, not FDS's. |

The boundary integrity gap (FMIS publishes handoffs that the four unmodularized neighbors implicitly consume but cannot declare) is the single largest cross-domain finding from this audit. It is **not** an FMIS bug, it is a cluster-wide modularization debt on the food / production cluster.

## 2026-05-31, Continuation: B1 technical fixes

### Applied

Loader: [.tmp_deploy/fix_fmis_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_fmis_b1_technical_2026_05_31.ts). Applied the three B1 items the agent is licensed to land on its own (enum backfills, Rule #10 user-edges with pre-specified shape, APQC tags with pre-specified `handoff_id` + verified PCF `process_id`).

- **B1-S6 (B9 enum backfill).** PATCHed `trigger_events.event_category` on 6 rows: 1111 / 1112 / 1113 / 1115 → `state_change`; 1114 → `threshold`; 1116 → `signal`. All 6 previously empty; 0 skipped. B9 partial-fail is now clean for FMIS.
- **B1-S8 (B7 / Rule #10 user-edges).** INSERTed 9 `data_object_relationships` rows from `users` (data_object 748, `kind='platform_builtin'`) to each FMIS master, following the existing user-edge convention (`owner_side='source'`, `relationship_type='one_to_many'`, `relationship_kind='reference'`, `is_required=false`, empty `notes`). `field_applications` carries two verbs (applied + supervised) per the audit. B7 hard-fail is cured.
- **B1-S11 (H1 APQC tags).** INSERTed 8 `handoff_processes` rows for the high/medium-confidence handoffs (350, 349, 965, 969, 351, 352 → PCF id 171 "Maintain production records"; 970 → PCF id 157 "Create materials plan"; 967 → PCF id 166 "Order materials and services"). `proposal_source='agent_curated'`, `record_status` omitted so the DB default `new` kicks in. Handoffs 966 and 968 remain unloaded per the audit's defer-to-Discover decision.

### Deferred

- **B1-S1 / B1-S2 / B1-S3 (M1/M2 module split + M4/M6 capabilities + F1 retire `fmis-system`).** New modules. The 2-vs-3 module split is a user pick (Bucket 3 B3-S1).
- **B1-S4 (B11 aliases).** Audit lists alternative synonyms per master (2-3 candidates each), not exact tuples; bulk alias inserts deferred per skill rules.
- **B1-S5 (B12 lifecycle states).** Needs `domain_module_id` from B1-S1; also requires per-entity `requires_permission` decisions and the config-shape exemption call (Bucket 2 B2-S4).
- **B1-S7 (B6 intra-domain relationships).** 11 edges among the 8 FMIS masters. Not Rule #10 user-edges, so outside the technical-only license this run carried.
- **B1-S9 (B8 cross-domain relationships).** Target-side masters on FOOD-TRACE / FSQM / TELEMATICS / ERP-FIN are unverified (those domains have zero modules); rows would point at nothing.
- **B1-S10 (B10b source-side backfill).** Gated on B1-S1 (no FMIS modules to point at).

### Bucket 2 / Bucket 3

All untouched. The Rule #15 notes-pollution audit (B2-S1 / B2-S2), the Rule #18 vendor-prose audit (B2-S3), the pattern-flag re-evaluation (B2-S4), and all three Phase 0 candidates (B3-S1 / B3-S2 / B3-S3) still need user input.

### Post-load state

- Bucket 1 remaining: 13 items (3 of 16 cleared).
- Bucket 2: 4 open.
- Bucket 3: 3 open.
- M1 hard-fail unchanged (0 `domain_modules`), so F2-F5, M2-M7, E1-E6, B10b source-side all stay unevaluable until the module split lands.

## 2026-05-31, Audit

### Summary

- **Current footprint:** **0 `domain_modules` rows** (M1 hard fail, unchanged). 8 masters, 8 capabilities, 8 solutions (all `primary`), 8 trigger_events (all 8 categories now populated), 10 outbound + 0 inbound cross-domain handoffs, 9 `users`-edge `data_object_relationships` rows, 0 aliases, 0 lifecycle states, 0 intra-domain relationships, 0 cross-domain outbound relationships, 0 regulations, 0 roles, 1 legacy domain-level system skill (`fmis-system`, id 61, `domain_module_id=null`) with 8 `query_<entity>` `skill_tools` rows (all `coverage_tier=platform`).
- **Carryover from prior audits:** the 2026-05-31 Continuation already applied B1-S6 (B9 enum backfill, verified 8/8 categorized), B1-S8 (B7 user-edges, verified 9/9 rows), and B1-S11 (H1 APQC tags, verified 8 rows loaded with `agent_curated` + `record_status=new`, 2 deferred per defer-to-Discover). Those three items are now closed.
- **Bucket 1 (in-scope, agent fixable):** 9 items remaining (1 new: B1-A4 Rule #20 catalog UX backfill).
- **Bucket 2 (surface-for-user, judgment):** 4 items unchanged.
- **Bucket 3 (Phase 0 pending, speculative):** 3 items unchanged.

**Headline structural finding:** M1/M2 still collapsed. Until Phase A modules ship, F2-F5, M2-M7, E1-E6, B10b source-side stay unevaluable. The 3 items the agent could land on its own from the prior audit (B9 enums, B7 user-edges, H1 APQC tags) are now closed. Everything else is either gated on the module split (B3-S1 user-pick), needs user input (Bucket 2 judgment calls), or is Phase 0 speculative (Bucket 3).

### Structural bands re-checked (delta from prior audit)

| Band | Prior | Current |
|---|---|---|
| A1 | pass | pass |
| A4 (Rule #20) | not checked | **fail**, `domains.catalog_tagline` and `catalog_description` both empty |
| M1 / M2 | hard fail | hard fail (unchanged) |
| M4 / M6 / M7 / M8 | unevaluable | unevaluable (no modules) |
| B1 / B2 / B3 | pass | pass |
| B4 | hard fail (3 flags all false) | hard fail (no pattern flags flipped, B2-S4 still open) |
| B5 | pass (no embedded_master rows) | pass |
| B6 | hard fail (0 intra-domain rels) | hard fail (unchanged) |
| B7 | hard fail | **pass** (9 user-edge rows present) |
| B8 | hard fail | hard fail (0 cross-domain outbound rels) |
| B9 | partial fail (6 empty `event_category`) | **pass** (8/8 events categorized) |
| B9b | skipped (1 module) | skipped (0 modules) |
| B10b | partial fail (10/10 NULL) | partial fail, gated on M1 (10/10 still NULL source-side; 1 of 10 has target side set, the FDS-HARVEST-PLANNING row id 350 / module 124) |
| B11 | hard fail (0 aliases) | hard fail (unchanged) |
| B12 | hard fail (0 states) | hard fail (unchanged) |
| C1 | pass | pass (owner Business Operations + 2 contributors + 1 consumer) |
| C2 | n/a | n/a |
| D1 | pass | pass |
| E1 to E6 | vacuous | vacuous (no modules) |
| F1 | partial fail (legacy `fmis-system`) | partial fail (legacy `fmis-system` still present, retirement gated on F2) |
| F2 to F5 | unevaluable | unevaluable (no modules) |
| H1 | hard fail (0 of 10 tagged) | partial pass: 8 of 10 cross-domain handoffs tagged `agent_curated` + `record_status=new`; 2 deferred to Discover (966, 968); 0 approved yet, so catalog-quality headline is 0/10 approved. Process side: 8 `agent_curated` of 10 expected (target 0.5N to 0.8N is met at 80%) |

### Bucket 1, In-scope confirmed gaps (open)

| ID | Band | Finding | Fix surface |
|---|---|---|---|
| B1-S1 | M1 / M2 (hard fail) | Zero `domain_modules` rows. Phase A loader inserting 2 or 3 `domain_modules` plus `domain_module_capabilities` plus `domain_module_data_objects`. Split choice is user pick (Bucket 3 B3-S1, 2-module vs 3-module). | Phase A loader after split-decision. |
| B1-S2 | M4 / M6 (hard fail, gated on B1-S1) | All 8 capabilities orphan from modules. | Ship `domain_module_capabilities` in B1-S1's loader. |
| B1-S3 | F1 (partial fail, gated on B1-S1) | Retire legacy `fmis-system` (id 61) once per-module system skills are authored. The 8 `query_` `skill_tools` rows (all `coverage_tier=platform`) can rebind to the new skills. | Phase S loader after B1-S1. |
| B1-S4 | B11 (hard fail) | 0 aliases on 8 masters. Independent of M1; loadable now. Audit lists alternate synonyms per master (paddock / plot / block, spray record, rotation plan, seeding pass, yield record, farm bin inventory, VR map / prescription file, task data / ISOXML record) but not exact tuples; needs draft + user approval before insert. | Cluster-drafts loader after user approval. |
| B1-S5 | B12 (hard fail, gated on B1-S1 plus B2-S4) | 0 lifecycle states on 8 masters. Needs `domain_module_id` from B1-S1; 2 candidates may qualify for config-shape exemption (`farm_fields`, `machinery_telemetry_records`) per B2-S4. | Focused loader after B1-S1 and B2-S4. |
| B1-S7 | B6 (hard fail) | 0 intra-domain `data_object_relationships`. 11 expected edges (`farm_fields`-contains-`crop_plans`, `crop_plans`-produces-`planting_records` etc.). Independent of M1. | Cluster-drafts loader. |
| B1-S9 | B8 (hard fail, partial gating) | 0 cross-domain outbound relationships. 6 plus payload-target mappings expected. Target-side masters on FOOD-TRACE / FSQM / TELEMATICS / ERP-FIN are unverified (those domains have zero modules); rows would point at nothing. | Defer rows whose targets are unmodularized; load the remainder. |
| B1-S10 | B10b (partial fail, source side, gated on B1-S1) | 10 of 10 outbound handoffs carry NULL `source_domain_module_id`. | B10b backfill after Phase A. |
| B1-A4 | A4 (Rule #20, fail) | `domains.catalog_tagline` and `catalog_description` both empty. Drafts must be in buyer voice, surfaced to user before write. | Draft both, user-review per Rule #20, then PATCH. |

H1 stays in the audit transcript but is no longer a Bucket 1 fix item, 8 of 10 tagged, 2 deferred per defer-to-Discover. Reviewer approval flips the 8 from `record_status=new` to `approved` (separate user action). The 2 deferred handoffs (966 `variable_rate_prescription.published` to TELEMATICS, 968 `machinery_telemetry_record.captured` to TELEMATICS) need Discover Pass 3 custom-process authoring; not a b1 fix.

### Bucket 2, Surface-for-user, unchanged from prior audit

- **B2-S1**, Rule #15 notes-pollution on 8 `domain_data_objects` rows (`"Geographic field boundary records..."` etc.). Pending user call on auto-population vs approval at original load time. PATCH to empty string if auto-written.

## 2026-06-06 - b1a execution

Executed the agent-solvable `b1a` band against the live domain_map module (tenant adenin, domain_map id 1001), FMIS domain 154. All inserts omitted `record_status` (DB default `new`); no `notes` column written anywhere; no em-dashes; American English.

### B1A-B10B-BACKFILL - DONE

PATCHed `source_domain_module_id` on all 10 outbound FMIS handoffs (deterministic: module that masters the trigger_event's data_object). Prior value on every row was NULL.

| handoff_id | trigger_event | event data_object | source_domain_module_id (NULL -> set) |
|---|---|---|---|
| 349 | harvest_record.created | harvest_records (490) | NULL -> 253 |
| 350 | harvest_record.created | harvest_records (490) | NULL -> 253 |
| 351 | field_application.recorded | field_applications (489) | NULL -> 253 |
| 352 | field_application.recorded | field_applications (489) | NULL -> 253 |
| 965 | planting_record.completed | planting_records (488) | NULL -> 253 |
| 966 | variable_rate_prescription.published | variable_rate_prescriptions (492) | NULL -> 254 |
| 967 | ag_input_inventory.low | ag_input_inventory (491) | NULL -> 255 |
| 968 | machinery_telemetry_record.captured | machinery_telemetry_records (493) | NULL -> 254 |
| 969 | farm_field.boundary_updated | farm_fields (486) | NULL -> 252 |
| 970 | crop_plan.committed | crop_plans (487) | NULL -> 252 |

Verification: `/handoffs?source_domain_id=eq.154&source_domain_module_id=is.null` returns 0 rows. `target_domain_module_id` left as-is (target-side B10b for the receiving domains; out of scope).

### B1A-S7 - DONE

Inserted 15 intra-domain `data_object_relationships` rows among the 8 FMIS masters (rows 2041-2055). Every row normalized parent-first: `relationship_type=one_to_many`, `relationship_kind=reference`, `owner_side=source` (parent), `is_required=true`, non-empty `inverse_verb`. The action's "11 expected edges" expands to 15 because three lines each name three children (farm_fields scopes field_applications / planting_records / harvest_records; machinery_telemetry_records documents planting_records / field_applications / harvest_records). N:1 edges in the action (vrp targets farm_fields, field_applications/planting_records consumes_from ag_input_inventory, telemetry scoped_to farm_fields) were authored parent-first per B6b m5.

| id | edge |
|---|---|
| 2041 | farm_fields contains crop_plans |
| 2042 | crop_plans produces planting_records |
| 2043 | crop_plans drives field_applications |
| 2044 | crop_plans produces harvest_records |
| 2045 | farm_fields scopes field_applications |
| 2046 | farm_fields scopes planting_records |
| 2047 | farm_fields scopes harvest_records |
| 2048 | farm_fields is targeted by variable_rate_prescriptions |
| 2049 | variable_rate_prescriptions drives field_applications |
| 2050 | ag_input_inventory supplies field_applications |
| 2051 | ag_input_inventory supplies planting_records |
| 2052 | farm_fields scopes machinery_telemetry_records |
| 2053 | machinery_telemetry_records documents planting_records |
| 2054 | machinery_telemetry_records documents field_applications |
| 2055 | machinery_telemetry_records documents harvest_records |

Pre-existing user-edge rows (1567-1575, B7) and the inbound FDS row (1106) were left untouched. No master-master edge pre-existed, so 0 skipped.

### B1A-SYSTEM-SKILLS - DONE

Authored one `skill_type='system'` skill per module (Rule #17), each anchored via `domain_module_id`, each with >=1 `skill_tools` row:

| skill id | skill_name | module |
|---|---|---|
| 324 | fmis_field_crop_planning_agent | 252 |
| 325 | fmis_field_ops_records_agent | 253 |
| 326 | fmis_precision_ag_agent | 254 |
| 327 | fmis_input_inventory_analytics_agent | 255 |

Created 16 new catalog-wide `mutate` tools (ids 1670-1685), `coverage_tier=platform`, one `create_<stem>` + one `update_<stem>` per master, stems mirroring the existing query tool names (`fields`, `crop_plans`, `planting_records`, `field_applications`, `harvest_records`, `ag_input_inventory`, `variable_rate_prescriptions`, `machinery_telemetry_records`). Confirmed catalog-wide before insert that none of the 16 names existed.

Bound 24 `skill_tools` rows: each module skill gets query + create + update for each master it owns (252: farm_fields, crop_plans; 253: planting_records, field_applications, harvest_records; 254: variable_rate_prescriptions, machinery_telemetry_records; 255: ag_input_inventory). The 8 pre-existing platform query tools (477-484) were rebound onto the new module skills via these rows.

DELETE (snapshot first, reversible):
- `skills.id=61` (`fmis-system`, `skill_type=system`, `domain_id=154`, `domain_module_id=null`). Prior row snapshot: `{"id":61,"skill_name":"fmis-system","skill_type":"system","domain_id":154,"domain_module_id":null,"description":"System skill for Farm Management Information System ... runtime workflows over the domain's master data, derived from masters + cross-domain handoffs."}`
- `skill_tools` where `skill_id=61` (8 rows, ids 555-562, all `requirement_level=required`): (555,tool 477),(556,478),(557,479),(558,480),(559,481),(560,482),(561,483),(562,484).

Deletion guarded: ran only after confirming all 4 module skills exist and each has >=1 skill_tool. The 8 query tools themselves (477-484) were NOT deleted; only the legacy skill_tools links to skill 61 were removed, and the tools are now linked to the new module skills.

### B1A-CATALOG-UX - DONE

Per revised Rule #20, wrote buyer-voice `catalog_tagline` + `catalog_description` directly into the EMPTY fields (empty-guard applied per field; all 5 rows had both fields empty). Buyer voice (workflow + value), no vendor/product names, no em-dashes. PATCHed: domain 154, modules 252, 253, 254, 255. `record_status` on these rows unchanged (PATCH on existing rows); it carries the review signal.

### B1A-S4 - SKIPPED (user-approval gate in its own action)

Aliases NOT written. The item's `action` explicitly requires "Draft per-master alias rows (alias_name + alias_type), surface to user for approval per Rule #1, then load." The exact alias_name + alias_type tuples are not drafted in the finding, and Rule #1 master-data approval is a prerequisite the action embeds. Authoring and loading AI-drafted aliases without that approval would violate the action and Rule #1, so this is left open for user review (per task SKIP rules 7/12). `/data_object_aliases` for masters 486-493 remains 0 rows.

### Post-execution verification

- handoffs: 0/10 outbound with NULL source_domain_module_id (was 10/10).
- data_object_relationships (master-master, intra-FMIS): 15 (was 0).
- skills on domain 154: 4, all module-anchored (was 1 domain-level legacy).
- skill_tools on skills 324-327: 24 total (each skill >=1).
- tools (mutate, FMIS masters): 16 new.
- catalog UX: domain + 4 modules tagline + description populated (was empty).
- aliases: 0 (B1A-S4 skipped).
- **B2-S2**, Rule #15 notes on handoffs 349 and 350 (`"Cross-vendor stack..."`). Substantive editorial commentary; may survive Rule #15 if user approved wording.
- **B2-S3**, Rule #18 forbidden-zone prose in `domains.description` and `domains.business_logic` (both reference "John Deere Operations Center API"). Needs user-approved rewrite stripping the vendor reference.
- **B2-S4**, pattern flag re-evaluation per Rule #12. Candidates: `field_applications.has_submit_lock=true`, `harvest_records.has_submit_lock=true`, `crop_plans.has_single_approver=true`. Per-flag yes/no from user.

### Bucket 3, Phase 0 pending, unchanged from prior audit

- **B3-S1**, 2-vs-3 module split (FIELD-OPS / HARVEST-YIELD / MACHINERY-TELEMETRY vs FIELD-OPS / MACHINERY-TELEMETRY with harvest folded). Gates B1-S1.
- **B3-S2**, Agronomic recommendations as possibly-separate module (FieldView Nitrogen Advisor, Granular agronomy, AgWorld agronomy notes). Candidate MISSING entity cluster: `agronomic_recommendations`, `soil_zones`, `weather_observations`, `soil_test_results`.
- **B3-S3**, Livestock / cattle-grazing as out-of-scope vs in-scope. AgriWebb is primarily livestock; either drop AgriWebb to `secondary`/`partial`, or add `livestock_records`/`pasture_assignments`/`animal_movements` masters, or queue `LIVESTOCK-MGMT` as a separate domain.

### Cross-bucket dependencies

- B1-S1 (Phase A modules) gates B1-S2, B1-S3, B1-S5, B1-S10, and partially B1-S9 (target-side masters live elsewhere).
- B3-S1 (module split count) informs B1-S1.
- B3-S2 informs B1-S1 weakly (4th module is additive later).
- B2-S4 (pattern flags) informs B1-S5 (which states are workflow-gated).
- B1-A4, B1-S4, B1-S7, B2-S1, B2-S2, B2-S3 are independent of the M-band.

### Report-only follow-ups, owed by other domains

| Owing domain | What's missing | Check ID |
|---|---|---|
| FOOD-TRACE | Zero modules; cannot consume 4 FMIS outbound handoffs. | FOOD-TRACE M1, B10b target side, B8 inbound |
| FSQM | Zero modules; 1 outbound handoff (id 352). | FSQM M1, B10b target side, B8 inbound |
| TELEMATICS | Zero modules; 2 outbound handoffs (966, 968). | TELEMATICS M1, B10b target side, B8 inbound |
| ERP-FIN | Zero modules on the ag-input slice; 2 outbound handoffs (967, 970). | ERP-FIN M1 for the procurement / cost-allocation slice |
| FARMER-DIRECT-SALES | Has modules; 1 fully-wired consumer row on `harvest_records` (FDS-HARVEST-PLANNING, module 124). Clean. | n/a |

The cross-cluster modularization debt on FOOD-TRACE / FSQM / TELEMATICS / ERP-FIN is the largest single boundary integrity gap from FMIS's side; not an FMIS bug.

### Per-bucket prompts

- **Bucket 1**, fix open items now? Reply `all`, `just S4 / S7 / A4`, or `skip`. B1-S1 / B1-S2 / B1-S3 / B1-S5 / B1-S10 wait on the module-split decision (B3-S1). B1-A4 wants user-reviewed buyer-voice drafts before PATCH.
- **Bucket 2**, per-item decision needed on B2-S1 (Rule #15 DMDO notes), B2-S2 (Rule #15 handoff notes), B2-S3 (Rule #18 vendor reference), B2-S4 (pattern flags).
- **Bucket 3**, vet via Phase 0 vendor research, or eyeball-mode? B3-S1 is the highest-leverage item.

## 2026-06-02 Audit (modularization)

### Summary

Scope of this pass: modules + entity assignment only (reuse existing entities). No new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships were created. The long-standing M1/M2/M4/M6 collapse is now resolved: FMIS went from 0 to 4 `full` `domain_modules`.

Loader: [.tmp_deploy/modularize_fmis_2026-06-02.ts](../../.tmp_deploy/modularize_fmis_2026-06-02.ts), idempotent and safe to re-run.

### Modules created (4 full, all industry_id=22 Crop Production / NAICS 111)

| id | code | capabilities | masters |
|---|---|---|---|
| 252 | FMIS-FIELD-CROP-PLANNING | 447 FIELD-MAPPING, 448 CROP-PLANNING | farm_fields (486), crop_plans (487) |
| 253 | FMIS-FIELD-OPS-RECORDS | 449 PLANTING-RECORDS, 451 HARVEST-TRACKING | planting_records (488), field_applications (489), harvest_records (490) |
| 254 | FMIS-PRECISION-AG | 452 VARIABLE-RATE-PRESCRIPTION, 453 MACHINERY-TELEMETRY | variable_rate_prescriptions (492), machinery_telemetry_records (493) |
| 255 | FMIS-INPUT-INVENTORY-ANALYTICS | 450 INPUT-INVENTORY, 454 YIELD-ANALYTICS | ag_input_inventory (491) |

Industry resolution: `/industries` carries a clean single row id=22 "Crop Production" (NAICS 111); set on all four modules. The broader id=20 "Agriculture, Forestry, Fishing and Hunting" (NAICS 11) was rejected as too coarse. Livestock scope (B3-S3) remains undecided, which is consistent with a crop-production tagging.

### Capability placement (M4 / M6)

All 8 capabilities placed in exactly one module each; every module realizes exactly 2 capabilities. 8 `domain_module_capabilities` rows. M4 (every capability has a realizing module) and M6 (every module realizes a capability) now pass.

### Data_object assignment (M7)

14 `domain_module_data_objects` rows total. Master pre-check (catalog-wide) ran on all 8 masters (`/domain_module_data_objects?data_object_id=eq.<id>&role=eq.master`): zero pre-existing master rows for any, so all 8 are mastered in FMIS for the first time. No demotions to embedded_master were required. Each master is now mastered in exactly one module (in-domain and catalog-wide, verified):

- 486 farm_fields -> 252; 487 crop_plans -> 252
- 488 planting_records -> 253; 489 field_applications -> 253; 490 harvest_records -> 253
- 492 variable_rate_prescriptions -> 254; 493 machinery_telemetry_records -> 254
- 491 ag_input_inventory -> 255

In-domain `consumer` rows added to keep no module empty of context and to wire the analytics / per-field surfaces without a second master (all preserve a non-master role, none promoted): module 253 consumes farm_fields + crop_plans; module 254 consumes farm_fields; module 255 consumes harvest_records + field_applications + crop_plans (yield analytics + input-spend reconciliation + budget projection).

### Module split decision (resolves B3-S1)

Chose a 4-module split rather than the previously-floated 2-module or 3-module shapes. Rationale: with 8 capabilities the M2 floor is >=2 full modules and the skill aims for 3-4; the 4-way split keeps each module at 2 coherent capabilities and isolates the cross-vendor integration boundaries cleanly (FMIS-FIELD-OPS-RECORDS owns the FOOD-TRACE / FSQM record handoffs; FMIS-PRECISION-AG owns the TELEMATICS prescription / telemetry handoffs; FMIS-INPUT-INVENTORY-ANALYTICS owns the ERP-FIN input-low handoff). This refines (not contradicts) the prior 3-module proposal by splitting harvest into the records module and pulling yield-analytics next to input-inventory.

### Bands cleared this pass

- M1 / M2: hard fail -> pass (4 full modules).
- M4 / M6: hard fail -> pass.
- M7: now evaluable and passes (each master mastered once, in-domain and catalog-wide).

### Out of scope this pass (deferred, unchanged)

- B1B-S3 / F1: legacy domain-level system skill `fmis-system` (id 61, domain_module_id=null) still present; now unblocked (B1B-S1 prerequisite satisfied) but per-module system-skill authoring (Rule #17, one skill per module) is a Phase S job, not this modules-only pass.
- B1B-S5 / B12: 0 lifecycle states; now has `domain_module_id` anchors available but still gated on B2-S4 pattern-flag decisions.
- B1B-S10 / B10b source-side: 10/10 outbound handoffs still carry NULL `source_domain_module_id`; the backfill is now executable (modules exist) but was not run in this entity-assignment-only pass.
- B1A-S4 (aliases), B1A-S7 (intra-domain relationships), B1B-S9 (cross-domain relationships), B1A-A4 (catalog UX), and all Bucket 2 / Bucket 3 items remain open.

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
