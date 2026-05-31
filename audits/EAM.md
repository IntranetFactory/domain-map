---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 19
---

# EAM - Audit History

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- Current footprint: 3 masters (`industrial_assets`, `eam_work_orders`, `equipment_pm_schedules`), 2 embedded_masters (`org_units`, `locations`), 0 `domain_modules`, 0 `capabilities`, 5 solutions, 0 regulations, 6 trigger_events, 3 outbound + 5 inbound handoffs, 0 roles, 1 legacy domain-level `system` skill (`eam-system`) with 4 `skill_tools`. Empty `catalog_tagline` and `catalog_description`.
- Vendor-surface basis: IBM Maximo Application Suite (flagship, broad), Hexagon EAM (specialist, plant), IFS Cloud EAM (specialist, asset-intensive), AVEVA APM (predictive/reliability), SAP S/4HANA Asset Management (suite-aligned PM), ServiceNow EAM (workflow-aligned). Compliance specialists: Intelex / Sphera for OSHA permit-to-work, GE Digital APM for FDA 21 CFR Part 11 calibration.
- **Bucket 1 (in-scope, agent fixable):** 13 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 1 item (consolidated candidate list).
- Candidates queued in `audits/_missing-domains.md`: 3 (APM-RELIABILITY, IIOT-PLATFORM, PTW-LOTO).

Structural pass: **catastrophic M1 + A2 failure** (zero modules, zero capabilities). A4, A1 (regulations) also fail. B6 partial (3 intra edges present), B7 partial (user edges present on all 3 masters), B9 partial (6 events, 3 with handoffs), B10b fully fails (all 8 cross-domain handoffs have NULL `source_domain_module_id` or `target_domain_module_id` for EAM's side). B12 fully fails (zero lifecycle states). H1 fails (0 cross-domain handoffs have `agent_curated` / `human_curated` APQC tags; 2 have `discovery_substring`).

The catalog state is best characterized as **pre-modular legacy seeding**: the domain row, master data_objects, intra-domain relationships, aliases, and a legacy domain-level system skill are loaded; everything from Phase A modules onward is missing.

### Vendor surface basis

Pure-play asset-intensive EAM specialists chosen over diversified suites: IBM Maximo (asset-intensive industries; broadest reference schema for work orders, PM, condition monitoring), Hexagon EAM (formerly Infor EAM; manufacturing-plant heritage), IFS Cloud EAM (asset-intensive process and discrete manufacturing), AVEVA APM (the OSIsoft / Schneider line; APM and condition analytics on top of historian data), SAP PM (suite-aligned, embedded in S/4HANA, large install base). ServiceNow EAM included for workflow/CMDB-aligned coverage. Intelex / Sphera anchor the OSHA permit-to-work / LOTO regulated leg, GE Digital APM anchors the FDA Part 11 calibration leg.

### Pass 3 - Neighbor discovery

Auto-discovered from `handoffs` + cross-domain dependencies (none, since EAM has no `domain_module_data_objects` rows — the embedded_master rows on `org_units` and `locations` live only in legacy `domain_data_objects`).

| Neighbor | Outbound handoffs | Inbound handoffs | Total edge weight | Depth |
| --- | --- | --- | --- | --- |
| MFG-OPS | 1 (eam_work_order.completed) | 2 (production_downtime, production_schedule) | 3 | weight 3 - full diff |
| ITSM | 1 (eam_work_order.created -> service_incidents) | 0 | 1 | light |
| GRC | 1 (equipment_pm.due -> compliance_obligations) | 0 | 1 | light |
| REAL-EST | 0 | 1 (capital_project.completed) | 1 | light |
| FLEET-MAINT | 0 | 1 (vehicle_work_order.completed) | 1 | light |
| FSM | 0 | 1 (installed_equipment.decommissioned) | 1 | light |

Only **EAM <-> MFG-OPS** meets weight >= 3 for the full pairwise diff. Other neighbors get a one-line summary.

### Pass 4 - Pairwise reconciliation (weight >= 3)

**EAM <-> MFG-OPS (weight 3).** EAM publishes `eam_work_order.completed` to MFG-OPS (handoff 867) on payload `eam_work_orders` (the source's master) — target module FK NULL because MFG-OPS rendering of which module receives is not surfaced here. EAM receives `production_downtime_event.recorded` (handoff 949, payload 599 mastered by MFG-OPS) and `production_schedule.published` (handoff 953, payload 597). Both inbound rows have NULL `target_domain_module_id` (because EAM has no modules) and NULL `source_domain_module_id` (separate B10b failure on MFG-OPS' side). Relationship mirrors are in place (rows 634, 635, 638). Diff: every gap on EAM's side traces back to M1 (no modules to attribute to); resolving M1 (Bucket 1, B1-S1) immediately unblocks both source and target FKs on these three handoffs.

**Light-neighbor summary.** ITSM, GRC, REAL-EST, FLEET-MAINT, FSM each carry one handoff. All have NULL EAM-side module FK (B10b root cause: M1). ITSM and GRC outbound handoffs (866, 868) currently have target_domain_module_id resolved or partially resolved on the other side; the EAM side will resolve at modularization.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 | Zero `domain_modules` rows for EAM. Catastrophic structural gate failure: every downstream concern (DMDOs, module-level skill, role bundling, handoff module FKs) is blocked until modules ship. | Author 2 full `module_kind='full'` modules: `EAM-ASSETS` (mastering `industrial_assets`) and `EAM-MAINTENANCE-OPS` (mastering `eam_work_orders` and `equipment_pm_schedules`). Rule #14: <3 capabilities = exactly 1 full module; >=3 capabilities = >=2 full modules. The capability load in B1-S2 determines whether the floor is 1 or 2; the recommended split below assumes the 6-capability shape and therefore the 2-module floor. |
| B1-S2 | A2 | Zero `capability_domains` rows for EAM. The market has clearly nameable capabilities; the catalog is silent. | Load 6 capabilities and link to EAM: asset register management, preventive-maintenance scheduling, work-order execution, maintenance planning and resourcing, asset-lifecycle tracking, meter and condition data ingestion. Author `domain_module_capabilities` rows linking each capability to its realizing module (M4 / M6). |
| B1-S3 | A4 | Both `catalog_tagline` and `catalog_description` are empty. Rule #20 buyer-voice draft is needed and the audit cannot land a buyer-shaped value without user review of the wording. | Draft both fields per Rule #20, surface to the user BEFORE writing. Sample tagline (for user review): "Keep plant and equipment running. Plan preventive maintenance, dispatch work orders, and track every asset from commissioning to retirement." Sample description: 1-3 paragraphs covering preventive-maintenance scheduling, condition-based maintenance, work-order lifecycle, mobile technician execution, and the boundary to FLEET-MAINT / REAL-EST / HAM / FSM. Final wording per user approval. |
| B1-S4 | A1 / regulations | Zero `domain_regulations` rows. OSHA 29 CFR 1910.147 (LOTO), OSHA Process Safety Management (29 CFR 1910.119) for chemical plants, FDA 21 CFR Part 11 (calibration record integrity in regulated manufacturing), and ISO 55000 (asset management standard, voluntary but heavily referenced by IFS / Hexagon) are all material to flagship EAM deployments. | Add 3-4 `regulations` rows (OSHA-LOTO, OSHA-PSM, ISO-55000; consider FDA-21CFR-PART-11 if pharma/biotech is in scope) and corresponding `domain_regulations` links. ISO 55000 and OSHA-LOTO are mandatory; the rest depend on industry scope. |
| B1-S5 | F1 / F2 | Single legacy `eam-system` skill (id 53) with `domain_id=53`, `domain_module_id=NULL` — legacy pre-modular shape. Naming uses kebab `eam-system` not snake `<module_code>_agent`. Rule #14 / Rule #17 target state is one `system` skill per `domain_modules` row. | When B1-S1 modules ship: delete legacy skill id 53, author `eam_assets_agent` (anchored to `EAM-ASSETS`) and `eam_maintenance_ops_agent` (anchored to `EAM-MAINTENANCE-OPS`). Re-link existing skill_tools rows to whichever module-skill they belong to (query / mutate primitives on industrial_assets go to assets; query / mutate primitives on eam_work_orders + equipment_pm_schedules go to maintenance_ops). Add at minimum `notify_person` (per § channel vs capability rule) for assignment notifications. |
| B1-S6 | B12 | Zero `data_object_lifecycle_states` rows for any of the 3 masters. `eam_work_orders` and `industrial_assets` both have observable workflow (open / assigned / in_progress / completed / closed; commissioned / in_service / out_of_service / retired). `equipment_pm_schedules` is closer to config-shape (templates) and may qualify for the Rule #12 exemption. | Author state machines: `eam_work_orders` ~6 states (draft, scheduled, assigned, in_progress, completed_pending_review, closed) with the published verbs (`scheduled`, `assigned`, `completed`) gated on permissions; `industrial_assets` ~5 states (proposed, commissioned, in_service, out_of_service, retired); `equipment_pm_schedules` exemption per Rule #12 (config-shape, no workflow) — surface the exemption to the user, do NOT populate `notes` per Rule #15. Permission verbs auto-derive; surface any verb that reads awkwardly for user override. |
| B1-S7 | B9 | Six trigger_events exist on EAM masters; only 3 have `handoffs` rows. Untagged events: `industrial_asset.commissioned` (962), `industrial_asset.retired` (963), `equipment_pm_schedule.updated` (966). | Confirm whether each is a genuine leaf or has at least one cross-domain subscriber: `industrial_asset.commissioned` likely fires to ERP-FIN `fixed_assets` capitalization + GRC compliance_obligations; `industrial_asset.retired` likely fires to ERP-FIN disposal + GRC; `equipment_pm_schedule.updated` is plausibly intra-domain only (config change). Draft 4 handoffs (2 per asset event x 2 targets), defer schedule.updated as intra-domain (intra-module handoff under B9b once modules ship). |

#### BOUNDARY

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | B10b — all 3 outbound handoffs (866, 867, 868) have NULL `source_domain_module_id`. Cause: M1 (no modules). | Once B1-S1 modules ship: PATCH `source_domain_module_id` to `EAM-MAINTENANCE-OPS.id` for handoffs 866, 867 (both are `eam_work_order.*` events); PATCH to `EAM-MAINTENANCE-OPS.id` (or `EAM-ASSETS.id` depending on whether PM-due is anchored to assets or PM schedules) for handoff 868. |
| B1-B2 | B10b — 5 inbound handoffs (294, 320, 949, 953, 1260) have NULL `target_domain_module_id` (EAM's side). Cause: M1 + the receiving DMDO row hasn't been authored. | Once B1-S1 modules ship + B1-S2 DMDOs author `consumer` rows on `capital_projects` (351), `vehicle_work_orders` (379), `production_downtime_events` (599), `production_schedules` (597), `installed_equipment` (819): PATCH `target_domain_module_id` to `EAM-MAINTENANCE-OPS.id` on all 5. The required `consumer` DMDOs are themselves a B-band insert as part of the M1 fix bundle. |

#### MISSING (compliance-mandated entities)

| ID | Entity | Proposed module | Regulation | Notes |
|---|---|---|---|---|
| B1-M1 | `safety_permits_to_work` | EAM-MAINTENANCE-OPS | OSHA 29 CFR 1910.147 (LOTO) + 1910.146 (confined space) | Hazardous-energy isolation, confined-space entry, hot-work permits. Universal in heavy industry (Maximo, Hexagon, IFS). Specialist vendors compete here (Intelex, Sphera, Enablon) and PTW-LOTO has been queued in `audits/_missing-domains.md` as a potential standalone domain. The EAM-side row is the bare minimum; if PTW-LOTO becomes its own domain, this entity demotes to `embedded_master`. |
| B1-M2 | `equipment_calibrations` | EAM-MAINTENANCE-OPS | FDA 21 CFR Part 11 (pharma) + ISO 9001 (quality) | Calibration certificates, due-date tracking, accuracy records. Required in regulated manufacturing, life sciences, lab equipment. Maximo / Hexagon / IFS all carry it. |

#### MISSING (universal-vendor entities, non-regulatory)

| ID | Entity | Proposed module | Notes |
|---|---|---|---|
| B1-M3 | `meter_readings` | EAM-ASSETS | Runtime hours, cycles, fluid samples, temperature. Drives PM trigger thresholds. Universal across Maximo, Hexagon, IFS, AVEVA APM. Cannot model condition-based maintenance without this entity. |
| B1-M4 | `work_order_tasks` | EAM-MAINTENANCE-OPS | Line-item decomposition of a work order: discrete steps, labor lines, parts lines. Universal. Maximo's "task" table; Hexagon's "WO operations"; IFS's "Job steps". Cannot model crew assignment / time tracking without it. |
| B1-M5 | `asset_components` | EAM-ASSETS | Asset hierarchy: a generator has sub-components (alternator, engine, control panel). PM and failure tracking flow through the hierarchy. Maximo "child assets"; Hexagon BOM; IFS structures. |

#### APQC TAGGING

EAM publishes 3 cross-domain handoffs and receives 5. Two inbound (294, 953) already carry `discovery_substring` tags; the other 6 are untagged. Proposed `agent_curated` rows below.

| ID | handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
|---|---|---|---|---|---|---|---|
| B1-H1 | 866 | EAM -> ITSM | eam_work_order.created | service_incidents | Perform corrective asset maintenance and repairs | 1558 (19255) | confident L4 |
| B1-H2 | 867 | EAM -> MFG-OPS | eam_work_order.completed | eam_work_orders | Update work and asset records | 1552 (19249) | confident L4 |
| B1-H3 | 868 | EAM -> GRC | equipment_pm.due | equipment_pm_schedules | Perform preventative asset maintenance | 1556 (10947) | confident L4 |
| B1-H4 | 949 | MFG-OPS -> EAM | production_downtime_event.recorded | production_downtime_events | Identify unplanned maintenance requirements | 1559 (19256) | confident L4 |
| B1-H5 | 1260 | FSM -> EAM | installed_equipment.decommissioned | installed_equipment | Decommission productive assets | 355 (19258) | confident L3 |
| B1-H6 | 320 | FLEET-MAINT -> EAM | vehicle_work_order.completed | vehicle_work_orders | Update work and asset records | 1552 (19249) | confident L4 (cross-fleet aggregation) |

Deferred-to-Discover (no clean PCF match): none in this audit's set. The two existing `discovery_substring` rows (handoff 294 -> 311 capital project accounting; handoff 953 -> 158 master production schedule) are coherent enough to leave as discovery-tagged pending reviewer approval; not re-proposed here.

### Bucket 2 - Surface-for-user (judgment calls)

1. **Module split shape.** Recommended: `EAM-ASSETS` (masters `industrial_assets`, `asset_components`, `meter_readings`) + `EAM-MAINTENANCE-OPS` (masters `eam_work_orders`, `equipment_pm_schedules`, `work_order_tasks`, `safety_permits_to_work`, `equipment_calibrations`). Alternative: a 3-way split adding `EAM-PM-PLANNING` (masters `equipment_pm_schedules` separately) — adds module count but cleanly separates the planning verb from execution. Decide: 2-module or 3-module. Affects Rule #14 floor and the system-skill authoring shape.

2. **M7 cross-catalog watch — `eam_work_orders` (476) `escalates_to` `service_incidents` (47).** The relationship row (id 636) wires EAM work orders to ITSM service incidents. This is intentional in plant-OT environments where an EAM-detected fault escalates to a customer-visible IT outage. Confirm: keep as-is, or downgrade to a soft pointer? Relevant because ITSM masters `service_incidents` and the cross-domain handoff (866) currently has `eam_work_orders` (476) as its `data_object_id` and `service_incidents` (47) is reachable via the related_data_object_id only.

3. **Bare-word claim on `work_orders`.** Three domains carry work-order entities: EAM `eam_work_orders` (476), FLEET-MAINT `vehicle_work_orders` (379), REAL-EST `facility_work_orders`, and FSM has its own field-service work order shape. None claims `is_canonical_bare_word=true`. Decide: does any domain own the bare `work_orders` name catalog-wide (per Rule #9), or do all stay prefixed forever? Affects future loads (e.g. a generic `work_orders` for HRSD ticketing).

4. **`fixed_assets` embedding direction.** ERP-FIN masters `fixed_assets` (capitalization view of the same physical things EAM tracks). Should EAM-ASSETS embedded_master `fixed_assets` (so a smaller deployment can capitalize without ERP-FIN), or stay decoupled (ERP-FIN is a hard dependency, no embedded shell)? The same physical asset has two views (operational vs financial); the question is whether they're modeled as one entity with two roles or two entities with a relationship.

5. **Three queued candidate domains (`APM-RELIABILITY`, `IIOT-PLATFORM`, `PTW-LOTO`).** All three are independent point-solution markets per the Rule #2 test (>=3 flagship vendors each). Decide for each:
   - **APM-RELIABILITY** — fold into EAM as capabilities (`condition monitoring`, `predictive analytics`), or promote as a sibling domain? AVEVA, GE Digital APM, Aspen Mtell sell flagship products distinct from CMMS / EAM. Lean toward sibling domain.
   - **IIOT-PLATFORM** — fold as substrate of EAM (telemetry ingestion as a capability), or promote as a horizontal platform serving multiple domains (EAM, MFG-OPS, REAL-EST, FLEET-MAINT)? Lean toward promote.
   - **PTW-LOTO** — fold into EAM-MAINTENANCE-OPS (just one entity, `safety_permits_to_work`), or promote as a specialist GRC-adjacent domain? Lean toward fold; Intelex / Sphera are the specialists but the bulk of permit-to-work runs against the EAM work order.

### Bucket 3 - Phase 0 pending (speculative; vendor-research vetting needed)

The audit produced **no** formal Phase 0 vendor-surface document; the candidate list below is from cross-vendor recall (Maximo, Hexagon, IFS, SAP PM, AVEVA APM) and warrants a vetted Phase 0 pass before loading. Treating the whole speculative list as a single Bucket 3 item per the audit count convention.

| Bucket 3 sub-item | Candidate entities | Vendor knowledge basis |
|---|---|---|
| 1 | `condition_monitoring_readings`, `failure_codes`, `failure_modes_effects` (FMEA), `asset_warranties`, `vendor_service_contracts`, `technician_certifications`, `crews`, `inspection_checklists`, `oil_samples`, `regulatory_compliance_logs`, `as_built_drawings`, `asset_meter_groups`, `pm_task_libraries`, `failure_root_causes`, `mro_parts` (inventory bridge), `tool_crib_inventory` | Cross-recall across Maximo (work order schema), Hexagon EAM (asset hierarchy + BOM), IFS Cloud EAM (regulated industries), AVEVA APM (condition monitoring + FMEA), SAP PM (PM strategy + task lists). Recommend formal Phase 0 vendor-surface authoring against Maximo + Hexagon + IFS docs to filter the list. `mro_parts` is the boundary with INV-MGMT (164) — Phase 0 should decide embedded_master vs full delegation. |

### Cross-bucket dependencies

- **Bucket 1 is largely blocked on a single decision: Bucket 2 #1 (module split).** Until the module count is fixed, B1-S1 (modules), B1-S2 (capabilities), B1-S5 (system skills), and the B10b PATCHes (B1-B1, B1-B2) cannot land. The user should resolve Bucket 2 #1 FIRST; the rest of Bucket 1 cascades automatically.
- **Bucket 1 B1-S6 lifecycle states is independent** of the module split if the user accepts the `equipment_pm_schedules` config-shape exemption. If lifecycle states for PM schedules ARE wanted, they need module attribution and depend on Bucket 2 #1.
- **Bucket 2 #5 (queued candidate triage) feeds Bucket 3.** If PTW-LOTO promotes to a sibling domain, B1-M1 (`safety_permits_to_work`) becomes a domain-level master in PTW-LOTO with an `embedded_master` shell in EAM-MAINTENANCE-OPS, not a master in EAM. If IIOT-PLATFORM promotes, several Bucket 3 candidates (`condition_monitoring_readings`, `asset_meter_groups`) reroute there.
- **Bucket 3 Phase 0 vetting** is independent of Bucket 1 / Bucket 2 and can run in parallel; survivors land as Bucket 1 items in a follow-up audit pass.

### Per-bucket prompts

- **After Bucket 1:** *"This is mostly cascade-blocked on the module split (Bucket 2 #1). Once the module shape is set, would you like me to author the structural fixes B1-S1 through B1-S7 + B1-B1 + B1-B2 + the 5 MISSING entities + the 6 APQC tags as a single Phase A + Phase B fix load? Reply 'all', 'just structural', 'modules only', or name specific items."*
- **After Bucket 2:** *"Please answer items 1-5 individually. Item #1 (module split) is load-bearing for Bucket 1; the rest are independent. For #3 (bare-word `work_orders`) and #4 (`fixed_assets` embedding direction), feel free to answer 'defer'; both are catalog-wide questions that don't have to resolve today."*
- **After Bucket 3:** *"The candidate list is unvetted vendor-recall. Choose: (a) **vetted route** — I spawn a Phase 0 vendor-surface subagent against Maximo + Hexagon + IFS docs and return a confirmed-gap list as Bucket 1 items in a follow-up audit pass; or (b) **eyeball route** — name which candidates ring true and they become Bucket 1 items immediately. Default recommendation: vetted, because the EAM market schema is large and the cost of mis-loading is real (3 cross-domain seams already cite EAM masters)."*

### Report-only follow-ups (owed by other domains)

- **MFG-OPS B10b owes:** `source_domain_module_id` patches on handoffs 949 (`production_downtime_event.recorded`) and 953 (`production_schedule.published`). Surface for MFG-OPS audit.
- **ITSM B10b owes:** confirmation that handoff 866 lands on a specific ITSM module (ITSM-INCIDENT-MGMT presumably) — `target_domain_module_id=38` is currently set, indicating an ITSM module FK is already resolved on the inbound side. No B10b debt on ITSM side; surface to confirm.
- **GRC B10b owes:** `target_domain_module_id` on handoff 868 (`equipment_pm.due` -> GRC `compliance_obligations`). Surface for GRC audit.
- **REAL-EST B10b owes:** `source_domain_module_id` on handoff 294 (`capital_project.completed`) and target_domain_module_id once EAM modularizes. Source side belongs to REAL-EST.
- **FLEET-MAINT B10b owes:** `source_domain_module_id` on handoff 320 (`vehicle_work_order.completed`). FLEET-MAINT side.
- **FSM B10b owes:** source-side already resolved (`source_domain_module_id=162` on handoff 1260). Target side waits for EAM modularization (in-scope here).
- **MFG-OPS B8 mirror:** the `production_downtime_events spawns eam_work_orders` relationship (row 634) is correctly authored on MFG-OPS' B8 outbound side. No follow-up needed.
- **ITSM B8 inbound:** the `eam_work_orders escalates_to service_incidents` relationship (row 636) lives in the catalog. Surface to ITSM audit if they want to verify the mirror direction.

### Decisions

_(empty - awaiting user review on Bucket 1 / 2 / 3)_

### Fixes applied

_(none yet - this audit is read-only by construction; loads happen after user review per Rule #1)_

### `domains.notes` pointer (if updated)

_(none - requires user-approved wording per Rule #15)_

## 2026-05-31, Continuation: B1 technical fixes (residual)

Residual pass over `audits/EAM.md` Bucket 1 to apply ONLY truly-technical fixes that do not require user judgment or upstream entity authoring. Loader: `.tmp_deploy/fix_eam_b1_technical_2026_05_31.ts`.

### Inputs verified live

- EAM domain id 53 (re-confirmed).
- All 8 handoff ids cited in the audit (866, 867, 868, 949, 953, 1260, 320, 294) exist with matching `source_domain_id` / `target_domain_id` / payload `data_object_id` / `trigger_event_id`.
- 5 APQC PCF rows resolve by `external_id`: 19255 -> 1558 (Perform corrective asset maintenance and repairs, L4), 19249 -> 1552 (Update work and asset records, L4), 10947 -> 1556 (Perform preventative asset maintenance, L4), 19256 -> 1559 (Identify unplanned maintenance requirements, L4), 19258 -> 355 (Decommission productive assets, L3).
- Pre-existing `handoff_processes` rows on the 6 target handoffs: 1 (handoff 1260 already tagged to process 353 "Perform asset maintenance" by an earlier `agent_curated` pass; that row stays; the audit's recommendation of 355 "Decommission productive assets" is additive, more specific to the `installed_equipment.decommissioned` event, and composite-key-distinct).
- EAM regulations check: only FDA 21 CFR Part 11 (id 22) exists. OSHA-LOTO, OSHA-PSM, ISO 55000 are not in the catalog.

### Applied

| Audit ID | Action | Rows |
|---|---|---|
| B1-H1..H6 | INSERT 6 `handoff_processes` rows, `proposal_source='agent_curated'`, `record_status` defaulted to `'new'`. Composite-key idempotency was checked before insert. | 6 |

Per-handoff result (post-state):

| Audit ID | handoff_id | process_id | PCF ext | hierarchy | process_name |
|---|---|---|---|---|---|
| B1-H1 | 866  | 1558 | 19255 | L4 | Perform corrective asset maintenance and repairs |
| B1-H2 | 867  | 1552 | 19249 | L4 | Update work and asset records |
| B1-H3 | 868  | 1556 | 10947 | L4 | Perform preventative asset maintenance |
| B1-H4 | 949  | 1559 | 19256 | L4 | Identify unplanned maintenance requirements |
| B1-H5 | 1260 | 355  | 19258 | L3 | Decommission productive assets (additive; 353 "Perform asset maintenance" already on row) |
| B1-H6 | 320  | 1552 | 19249 | L4 | Update work and asset records |

All 6 target handoffs now carry at least one `agent_curated` APQC tag. Handoff 1260 carries two tags (353 + 355).

### Deferred (and why)

| Audit ID | Reason for deferral |
|---|---|
| B1-S1 | New `domain_modules` rows (`EAM-ASSETS`, `EAM-MAINTENANCE-OPS`). New entities / modules; gated on Bucket 2 #1 (module-split decision) per the audit's own cross-bucket-dependency note. |
| B1-S2 | New `capabilities` + `capability_domains` + `domain_module_capabilities`. New entities; depends on B1-S1. |
| B1-S3 | `catalog_tagline` / `catalog_description` — Rule #20 buyer-voice draft requires user review BEFORE write. |
| B1-S4 | `domain_regulations` to existing rows: only FDA Part 11 exists, and the audit conditions its applicability on pharma/biotech scope (user judgment). OSHA-LOTO, OSHA-PSM, ISO 55000 are new `regulations` rows (deferred as new entities). |
| B1-S5 | Module-level system skills. Gated on B1-S1 modules existing; DELETE of legacy skill 53 is user-confirmed cleanup, not residual-technical. |
| B1-S6 | `data_object_lifecycle_states` rows + `permission_verb_override`. The audit does not pre-specify (state_name, verb_override) tuples for any row; the `equipment_pm_schedules` exemption is a user decision per Rule #15. |
| B1-S7 | 4 new outbound handoffs from `industrial_asset.commissioned` / `industrial_asset.retired` events. New entities. |
| B1-B1 / B1-B2 | `handoffs.source_domain_module_id` / `target_domain_module_id` PATCHes — no module ids exist to PATCH to; gated on B1-S1. |
| B1-M1..M5 | 5 new master `data_objects` (`safety_permits_to_work`, `equipment_calibrations`, `meter_readings`, `work_order_tasks`, `asset_components`). New entities. |

### JWT errors

None.

### Loader

`c:/dev/domain-map/.tmp_deploy/fix_eam_b1_technical_2026_05_31.ts`

### UI

`https://tests.semantius.app/domain_map/handoff_processes`

