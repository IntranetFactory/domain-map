# FLEET-MAINT audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- Current footprint: 4 mastered `data_objects` (`vehicle_work_orders`, `preventive_maintenance_schedules`, `vehicle_parts_inventory`, `maintenance_defects`); 2 consumer DMDOs (`fleet_vehicles` id 370 from FLEET-MGMT, `vehicle_inspections` id 374 from FLEET-MGMT); 2 embedded_master infrastructure rows (`org_units` id 34, `locations` id 795); 6 capabilities (PM scheduling, work-order mgmt, parts inventory, mechanic/shop mgmt, warranty/recall, inspection/DVIR); 6 solutions (3 primary: Fleetio, AssetWorks FleetFocus, Whip Around; 3 secondary: Samsara, Geotab, Trimble); 4 `business_function_domains` rows (Logistics owner, Indirect Procurement + Accounting contributors, Field Service Operations consumer); 0 `domain_modules` rows (M1 hard fail); 0 `domain_module_data_objects` rows (legacy `domain_data_objects` rollup only); 5 `trigger_events` on the masters; 5 outbound + 4 inbound `handoffs` (8 of 9 carry NULL on both module FKs, 1 has partial target attribution to ITSM-INCIDENT-MGMT id 38); 1 `data_object_relationships` row (EAM `eam_work_orders` aggregates `vehicle_work_orders`, owner_side=target, inbound from EAM side); 0 `data_object_aliases`; 0 `data_object_lifecycle_states`; 0 `domain_regulations`; 1 legacy `domain_id`-scoped system skill (`fleet-maint-system`, id 59) with 6 `skill_tools` (4 platform `query_*`, `send_email` platform, `sign_document` external); 1 `handoff_processes` row (handoff 312 tagged via `discovery_substring`, PCF 823 "Plan for preventive maintenance", `record_status=new`).
- Vendor-surface basis: Fleetio (pure-play fleet maintenance specialist), AssetWorks FleetFocus (public-sector compliance specialist with motor-pool + FTA reporting), Whip Around (DVIR + inspection specialist), Samsara Connected Operations (broad telematics + maintenance), Geotab MyGeotab (rule-engine + fault-code-driven PM), Trimble Transportation TMT Service Management (heavy-duty shop management leader). Compliance basis: FMCSA Part 396 (DVIR + periodic inspection records), FMCSA Part 393 (parts and accessories), NHTSA recall registry (49 CFR Part 573), EPA emissions inspection mandates, OSHA shop safety (29 CFR 1910), FAVR (IRS fixed-and-variable-rate reimbursement) for owner-operator parts charge-back.
- **Bucket 1 (in-scope, agent fixable):** 16 items.
- **Bucket 2 (surface-for-user, judgment):** 9 items.
- **Bucket 3 (Phase 0 pending, speculative):** 8 items.
- Candidates queued via `append_missing_domain.ts`: TIRE-MGMT (Fleet Tire Management, newly queued), VEHICLE-RECALL-MGMT (Vehicle Recall Management, newly queued). EV-CHARGING-MGMT (already queued from FLEET-MGMT audit) re-confirmed.

Structural pass: A passes except A4 (`catalog_tagline` + `catalog_description` both empty); M is a **hard fail** (zero `domain_modules` against 6 capabilities, so both M1 and M2 fail); B has wide gaps (only 1 inbound relationship from EAM, zero intra-domain relationships, zero `users` edges, zero aliases, zero lifecycle states, zero pattern-flag re-eval, NULL module FKs on every handoff except handoff 878's partial ITSM target attribution, zero domain regulations despite a regulated market); C passes; E vacuously skipped (no modules to wire roles against); F1 + F2 + F3 all fail (legacy domain-scoped system skill, no module-scoped skills, `send_email` channel-primitive linked without workflow-specific justification); H1 partially passes (1 of 9 cross-domain handoffs tagged but via `discovery_substring`, none `agent_curated`). The legacy skill reports `strict_score=5/6=0.833` (the `sign_document` external tool drops it off 1.00) but the per-module rollup the score is designed for cannot be computed. There is one B9 attribution defect candidate: handoff 312 sources from TELEMATICS (148) but its `trigger_event 304` publishes on FLEET-MAINT's master `preventive_maintenance_schedules` (id 380), so the event is mis-attributed at source (TELEMATICS does not master this entity).

The entire audit downstream of the M-band gates on resolving the modularization gap first. Bucket 1 enumerates the fix items assuming the 3-module split in B2-1; if the user adopts a different split, every B-band and F-band fix needs the module assignment revisited.

### Vendor surface basis

- **Fleetio** (fleetio.com) - pure-play fleet maintenance and operations specialist; flagship surface includes vehicles, work_orders, service_tasks, service_programs (PM), parts inventory, vendors, contacts (mechanics), fuel entries, inspections, recalls, comments. Strong on small/mid-fleet self-service maintenance.
- **AssetWorks FleetFocus** (assetworks.com) - public-sector / municipal heavy-fleet leader; M5 platform masters work orders, PM templates, technician labor, parts/PO, motor-pool, fuel-island, warranty, recall.
- **Whip Around** (whiparound.com) - DVIR-first inspection specialist; masters inspection forms, faults/defects, action items, vehicle health snapshots, maintenance routing.
- **Samsara Connected Operations** (samsara.com) - broad telematics + maintenance: vehicle gateway diagnostics, fault codes, maintenance work orders, parts integration, service program.
- **Geotab MyGeotab** (geotab.com) - rule-engine-driven PM via fault data + engine-hour milestones; partners with maintenance back-ends (Fleetio integration, native maintenance reminders).
- **Trimble Transportation TMT Service Management** (trimble.com) - heavy-duty truck shop floor specialist (formerly TMW); work orders, labor units, parts BOM, vendor invoices, warranty, accounting integration.

Compliance basis: FMCSA Part 396 (commercial vehicle DVIR + maintenance recordkeeping), FMCSA Part 393 (parts and accessories standards), NHTSA recall registry (49 CFR 573) for OEM recall ingestion + VIN match, EPA emissions inspection mandates (state-specific I/M programs), OSHA 29 CFR 1910 for shop safety, plus contract-level warranty terms with OEMs.

### Pass 3 - Neighbor discovery

Edges discovered from `handoffs` + `domain_data_objects` cross-references:

| Neighbor | Handoffs out | Handoffs in | DMDO / DDO deps | Weight | Boundary depth |
|---|---|---|---|---|---|
| FLEET-MGMT (147) | 1 (`maintenance_defect.reported`) | 2 (`fleet_vehicle.acquired`, `vehicle_inspection.failed`) | 2 (FLEET-MAINT consumer on `fleet_vehicles` + `vehicle_inspections`, both FLEET-MGMT-mastered) | 5 | full (>=3) |
| TELEMATICS (148) | 0 | 2 (`preventive_maintenance.due` from event mis-attribution, `fleet_vehicle.mileage_milestone_reached`) | 0 | 2 | summary only |
| EAM (53) | 1 (`vehicle_work_order.completed`) | 0 | 1 (data_object_relationships row: EAM `eam_work_orders` aggregates FLEET-MAINT `vehicle_work_orders`) | 2 | summary only |
| AP-AUTO (29) | 1 (`vehicle_work_order.completed`) | 0 | 0 | 1 | summary only |
| FIN (65) | 1 (`parts_inventory.adjusted`) | 0 | 0 | 1 | summary only |
| ITSM (1) | 1 (`maintenance_defect.reported` to ITSM-INCIDENT-MGMT id 38, target_domain_module_id partially set) | 0 | 0 | 1 | summary only |

FLEET-MGMT (parent + weight 5) gets the full pairwise pass below. TELEMATICS, EAM, AP-AUTO, FIN, ITSM get one-line summaries.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 / M2 / M6 (hard) | Zero `domain_modules` rows exist for FLEET-MAINT. The domain has 6 capabilities and 4 mastered data_objects but ships no deployable units. Every downstream B, E, F band is blocked. The legacy `domain_data_objects` rollup carries the master rows but there is no modular layer to attribute permissions, system skills, or handoff FKs against. | Author the module set per the proposal in B2-1. Default: 3 full modules (`FLEET-MAINT-WORK-ORDER` covering work orders + maintenance defects + mechanic assignment; `FLEET-MAINT-PM` covering preventive maintenance schedules + PM triggers + inspections-as-trigger; `FLEET-MAINT-PARTS` covering parts inventory + parts BOM + warranty/recall). Load via the standard Phase A loader pattern. |
| B1-S2 | A4 | `domains.catalog_tagline` and `domains.catalog_description` both empty. | Draft buyer-voice copy per Rule #20 (workflow + value, NOT analyst voice). Surface to the user for review BEFORE writing. Recommended tagline shape: "Keep every vehicle on the road. Schedule preventive maintenance from telematics, dispatch mechanics to defects, and track parts cost-per-mile in one place." |
| B1-S3 | B4 (pattern flags) | All 4 masters have `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false` at the schema default; no positive re-evaluation recorded. `vehicle_work_orders` may carry mechanic identity + customer signatures on completion; `maintenance_defects` may carry photos from DVIR (driver signature + photo). `has_submit_lock=true` is plausibly correct on `vehicle_work_orders` once completed (the completion event freezes parts + labor + invoice for AP posting); `has_single_approver=true` plausibly on warranty-claim sub-flows. | PATCH `has_submit_lock=true` on `vehicle_work_orders` (id 379) after user confirmation. The `maintenance_defects` row arguably carries DVIR-photo personal content; surface as Bucket 2 #2. The other two (`preventive_maintenance_schedules`, `vehicle_parts_inventory`) are config-shaped and arguably do not need pattern-flag changes. |
| B1-S4 | B6 | Zero intra-domain `data_object_relationships` rows. With 4 mastered entities forming a chain (PM schedules generate work orders, work orders consume parts and resolve defects, defects route to work orders), the catalog is silent on every edge. | Author the 5-edge baseline below (B1-R1..R5) via a focused loader. |
| B1-S5 | B7 (users edges) | Zero edges from any FLEET-MAINT master to the `users` platform built-in (id 748). At minimum `vehicle_work_orders` (assigned mechanic, work-order author), `maintenance_defects` (reporter, resolver), `vehicle_parts_inventory` (parts manager who adjusts stock), and `preventive_maintenance_schedules` (schedule author/owner) need user-typed actor edges per Rule #10. | Author 4 `data_object_relationships` rows per Rule #10. See B1-U1..U4 below. |
| B1-S6 | B8 (outbound cross-domain rels) | Only 1 cross-domain `data_object_relationships` row exists (EAM `eam_work_orders` aggregates `vehicle_work_orders`, owner_side=target, so it is technically an inbound from EAM's perspective and outbound from FLEET-MAINT's). Missing: the work-order-completed -> AP-invoice edge, parts-adjusted -> GL-posting edge, and the defect-to-work-order spawning edge across the maintenance-defect-from-FLEET-MGMT inbound. | Author the 3 outbound cross-domain edges in B1-X1..X3 below. Inbound edges (FLEET-MGMT vehicle.acquired, vehicle_inspection.failed publishing into FLEET-MAINT) are report-only per B8 asymmetry. |
| B1-S7 | B9 / B9b | Trigger events on the 4 masters: 5 rows (`preventive_maintenance.due`, `vehicle_work_order.completed`, `maintenance_defect.reported`, `maintenance_defect.resolved`, `parts_inventory.adjusted`). The 5 events have 5 outbound + 0 implicit-self handoffs (1 outbound for PM.due is missing; PM.due fires but no outbound handoff row exists, only an inbound row from TELEMATICS publishes against this event, which is the attribution defect). `maintenance_defect.resolved` has zero handoff rows. Once 3-module split (B1-S1) lands, B9b kicks in: PM.due (FLEET-MAINT-PM) -> work-order generation (FLEET-MAINT-WORK-ORDER), defect.reported (FLEET-MAINT-WORK-ORDER) -> parts-consumption (FLEET-MAINT-PARTS), work-order.completed (FLEET-MAINT-WORK-ORDER) -> warranty-claim-eligibility (FLEET-MAINT-PARTS) all need intra-domain handoff rows with `integration_pattern: lifecycle_progression`. | After B1-S1, author intra-domain handoffs per the module-pair derivation in the B9b query family. Estimated 4-6 rows. Also: author the missing outbound `maintenance_defect.resolved` handoff (likely target=AP-AUTO or FIN for repair invoice posting). |
| B1-S8 | B9 (event attribution defect) | Trigger event 304 (`preventive_maintenance.due`, data_object_id 380=`preventive_maintenance_schedules`) is published by FLEET-MAINT (the master domain). Handoff 312 has `source_domain_id=148` (TELEMATICS) for this event, which mis-attributes the event source: TELEMATICS does not master `preventive_maintenance_schedules`. The event should fire FROM FLEET-MAINT (or, semantically, the PM schedule triggers from telematics signals but the event row is published by the FLEET-MAINT module that owns the schedule). | Two options surface to user (Bucket 2 #4): (a) PATCH handoff 312 to swap source and target (the actual data flow is TELEMATICS publishes `engine_hours.threshold_reached` -> FLEET-MAINT, then FLEET-MAINT publishes `preventive_maintenance.due` -> downstream), requiring a new TELEMATICS-owned trigger event, OR (b) leave handoff 312 as a self-handoff (source=target=FLEET-MAINT) once modules land, treating TELEMATICS as the upstream signal. Recommended (a) on cleanliness grounds. |
| B1-S9 | B10b (hard, audit-blocker) | All 9 handoffs touching FLEET-MAINT carry NULL on `source_domain_module_id`. 8 of 9 also carry NULL on `target_domain_module_id`; the exception is handoff 878 which has `target_domain_module_id=38` (ITSM-INCIDENT-MGMT) properly resolved. The 5 outbound from FLEET-MAINT cannot resolve source side until B1-S1 lands. The 4 inbound have source-side NULLs owed by partner domains (FLEET-MGMT has 0 modules, TELEMATICS has 0 modules per its own audit). | After modules land, run the standard B10b derivation: source side = the new FLEET-MAINT module that masters the trigger event's data_object (work-order, PM, or parts). Target-side NULLs on outbounds toward FLEET-MGMT, EAM, AP-AUTO, FIN stay NULL until those domains modularize (report-only on their side). |
| B1-S10 | B11 | Zero `data_object_aliases` rows. Vendor lexicon usage: `vehicle_work_orders` -> "Repair Order / RO / Service Order / Job Card / Shop Ticket", `preventive_maintenance_schedules` -> "Service Program / PM Plan / Maintenance Service / Service Task Template", `vehicle_parts_inventory` -> "Parts Stock / Parts Bin / Shop Parts / Stockroom Item", `maintenance_defects` -> "Defect / Fault / DVIR Item / Action Item / Non-Conformance". | Author 12-16 alias rows; bundle with the cluster-drafts loader. |
| B1-S11 | B12 (hard) | Zero `data_object_lifecycle_states` rows. Several masters carry workflow-bearing state: `vehicle_work_orders` (`draft -> assigned -> in_progress -> on_hold -> completed -> invoiced -> closed -> cancelled`), `maintenance_defects` (`reported -> triaged -> in_progress -> resolved -> deferred`), `preventive_maintenance_schedules` (`draft -> active -> due_soon -> overdue -> disabled` though arguably config-shape per next note). `vehicle_parts_inventory` is config-shape with `record_status` (stock count is a quantitative field, not a state machine) and qualifies for the config-shape exemption. | Draft state machines for `vehicle_work_orders` and `maintenance_defects`; surface the `vehicle_parts_inventory` config-shape exemption to the user without writing `data_objects.notes` (Rule #15). The completion + closure states on `vehicle_work_orders` need `requires_permission=true` + `permission_verb_override` (`completed -> complete_work_order`, `closed -> close_work_order`, `cancelled -> cancel_work_order`). |
| B1-S12 | F1 / F2 / F3 (legacy + missing modular skills) | A legacy domain-level system skill `fleet-maint-system` (id 59, `domain_id=149`, `domain_module_id=NULL`) exists with 6 `skill_tools`. Per F1 this must be retired once module-scoped skills exist. Per F2 each new module needs exactly one `<module_code_lower>_agent` system skill. Per F3 each needs >=1 `skill_tools` row. The current 6 tools span all 4 masters via `query_*` + `send_email` + `sign_document` and will redistribute across the 3 modules per ownership. | After B1-S1, author 3 module-scoped system skills (`fleet_maint_work_order_agent`, `fleet_maint_pm_agent`, `fleet_maint_parts_agent`), redistribute the 4 existing `query_*` tools by mastered entity, author 4-6 new tools per module (create/update for masters, workflow gates like `complete_work_order`, `assign_mechanic`, `resolve_defect`, `adjust_parts_stock`, `apply_warranty_credit`, `schedule_pm`), and DELETE legacy skill 59. |
| B1-S13 | F (skill naming) | Legacy `fleet-maint-system` uses kebab + `-system` suffix; the catalog convention per Phase-S is snake + `_agent`. Folds into B1-S12. | Combined with S12. |
| B1-S14 | F7 (channel primitives) | Skill 59 links `send_email` (a channel primitive) with no `skill_tools.notes` justification. Per the channel-vs-capability authoring rule the workflow default is `notify_person` / `notify_team` so the deployment can substitute the channel. The FLEET-MAINT email use is generic operational notification (PM-due reminders, defect-escalation alerts, work-order-completion notifications, parts-low alerts) and not channel-bound. | PATCH the `skill_tools` row pointing at `send_email` to point at `notify_person` instead, OR DELETE the row if the new module-scoped skills already link `notify_person`. Idempotency-safe per the F7 fix recipe. |
| B1-S15 | F4 (operation_kind invariant) | `sign_document` linked from skill 59: `operation_kind=side_effect`, `coverage_tier=external`, `data_object_id=null`. The invariant ticks (`side_effect` requires NULL `data_object_id`), so this is a positive sanity-check, not a violation. **Bigger question:** the maintenance system needs `sign_document` for what workflow? Customer-signed work-order receipt on completion, warranty-claim attestation, owner-paid-repair authorization, or vestigial from a cargo-cult? | Surface in Bucket 2 #6. If the workflow is real (customer signature on shop receipt, OEM warranty submission), the tool stays and gets redistributed in B1-S12 to the appropriate module's skill. If it is vestigial, DELETE the `skill_tools` row. |
| B1-S16 | Missing `domain_regulations` (C-band-adjacent gap) | Zero `domain_regulations` rows for FLEET-MAINT. The market is moderately regulated (FMCSA Part 396 maintenance recordkeeping, FMCSA Part 393 parts/accessories, NHTSA recall ingestion under 49 CFR 573, EPA emissions inspection mandates, OSHA shop safety 29 CFR 1910). | Author 4-6 `domain_regulations` rows once the regulations table has the right `regulation_name` entries. Surface as a Bucket 1 fix the user approves; if any regulation rows are missing from `regulations`, that is an upstream load gap (separate fix). |

#### BOUNDARY findings per neighbor

| ID | Neighbor | Finding | Fix |
|---|---|---|---|
| B1-B1 | FLEET-MGMT (147) | Outbound 877 (`maintenance_defect.reported` -> FLEET-MGMT) and 2 inbound from FLEET-MGMT (875 `fleet_vehicle.acquired`, 313 `vehicle_inspection.failed`) all carry NULL on both module FKs. FLEET-MGMT itself has zero `domain_modules` per its own 2026-05-30 audit. Outbound source side blocked by B1-S1 here; inbound source side blocked by FLEET-MGMT's B1-S1. | Defer until both domains modularize. Report-only on FLEET-MGMT side; in-scope blocked by B1-S1 here. Once both land: source = FLEET-MAINT-WORK-ORDER (for defect.reported); inbound target = FLEET-MAINT-WORK-ORDER (for vehicle.acquired triggering PM template seeding) + FLEET-MAINT-WORK-ORDER (for inspection.failed triggering work-order auto-creation). |
| B1-B2 | TELEMATICS (148) | Inbound handoff 312 (`preventive_maintenance.due`, src=148, tgt=149, payload=380 `preventive_maintenance_schedules`) is a B9 attribution defect candidate (B1-S8 above): the event publishes on FLEET-MAINT's master, not TELEMATICS's. Inbound handoff 881 (`fleet_vehicle.mileage_milestone_reached`, src=148, tgt=149, payload=370 `fleet_vehicles`) is correctly attributed (TELEMATICS publishes vehicle.mileage events). TELEMATICS itself has zero modules. | B1-B2 resolution depends on Bucket 2 #4 decision. If user picks option (a), DELETE handoff 312 and re-create as TELEMATICS-published engine-hours-threshold-reached event with new outbound to FLEET-MAINT. If option (b), patch handoff 312 to swap source-and-target after modules land. Handoff 881 stays as-is, FLEET-MAINT target module = FLEET-MAINT-PM after B1-S1. |
| B1-B3 | AP-AUTO (29) | Outbound 316 (`vehicle_work_order.completed` -> AP-AUTO, NULL module FKs both sides). AP-AUTO has its own modules (verify in a separate AP-AUTO audit). | Once B1-S1 lands, source-side FK resolves locally to FLEET-MAINT-WORK-ORDER. Target-side patch needs the AP-AUTO modular layout. Surface as a report-only follow-up to AP-AUTO's audit. |
| B1-B4 | EAM (53) | Outbound 320 (`vehicle_work_order.completed` -> EAM, NULL module FKs both sides). EAM has zero modules. The fact that EAM aggregates work orders is also encoded in `data_object_relationships` (id row visible in B6 query: `eam_work_orders aggregates vehicle_work_orders`, owner_side=target). This is the only existing cross-domain relationship row for FLEET-MAINT. | Once B1-S1 lands, source-side FK resolves to FLEET-MAINT-WORK-ORDER. Target-side NULL stays until EAM modularizes. Report-only on EAM side. |
| B1-B5 | FIN (65) | Outbound 879 (`parts_inventory.adjusted` -> FIN, NULL module FKs both sides). FIN has zero modules. | Once B1-S1 lands, source-side resolves to FLEET-MAINT-PARTS. Target-side NULL stays until FIN modularizes (likely `FIN-INVENTORY-ACCOUNTING` per PCF 1326). Report-only on FIN side. |
| B1-B6 | ITSM (1) | Outbound 878 (`maintenance_defect.reported` -> ITSM-INCIDENT-MGMT id 38, src NULL, tgt=38). Source-side NULL pending B1-S1; target side already attributed correctly to ITSM-INCIDENT-MGMT (the partial attribution observed). The payload `data_object_id=47` (an ITSM incident-shaped entity) differs from the trigger event's payload (id 703 `maintenance_defects`), which is the expected "payload swap" pattern (event source data_object differs from handoff payload). | Once B1-S1 lands, source-side resolves to FLEET-MAINT-WORK-ORDER. Target side already done. Verify payload swap is intentional (the defect spawns an ITSM incident on the partner side); this is informational. |

#### APQC TAGGING

9 cross-domain handoffs touch FLEET-MAINT (5 outbound + 4 inbound). 1 currently tagged in `handoff_processes` (handoff 312 via `discovery_substring` to PCF 823 "Plan for preventive maintenance", record_status=new, not yet approved). Headline catalog quality: 0 of 9 `record_status=approved`. Process-health: 0 `agent_curated` rows on FLEET-MAINT's surface today (the 1 existing tag is substring-derived).

Proposed `agent_curated` tags (record_status defaults to `new`, proposal_source `agent_curated`):

| ID | handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
|---|---|---|---|---|---|---|---|
| B1-A1 | 316 | FLEET-MAINT -> AP-AUTO | `vehicle_work_order.completed` | `vehicle_work_orders` | Process and record fixed-asset maintenance and repair expenses | 1391 | confident L4 |
| B1-A2 | 320 | FLEET-MAINT -> EAM | `vehicle_work_order.completed` | `vehicle_work_orders` | Manage asset maintenance | 352 | confident L3 |
| B1-A3 | 877 | FLEET-MAINT -> FLEET-MGMT | `maintenance_defect.reported` | `maintenance_defects` | Report maintenance issues | 828 | confident L4 |
| B1-A4 | 878 | FLEET-MAINT -> ITSM | `maintenance_defect.reported` | (ITSM incident id 47) | Manage asset maintenance | 352 | confident L3 |
| B1-A5 | 879 | FLEET-MAINT -> FIN | `parts_inventory.adjusted` | `vehicle_parts_inventory` | Perform inventory accounting | 1326 | confident L4 |
| B1-A6 | 875 | FLEET-MGMT -> FLEET-MAINT | `fleet_vehicle.acquired` | `fleet_vehicles` | Maintain fixed-asset master data files | 1388 | confident L4 |
| B1-A7 | 313 | FLEET-MGMT -> FLEET-MAINT | `vehicle_inspection.failed` | `vehicle_inspections` | Request unplanned maintenance | 824 | confident L4 |
| B1-A8 | 881 | TELEMATICS -> FLEET-MAINT | `fleet_vehicle.mileage_milestone_reached` | `fleet_vehicles` | Analyze assets and predict maintenance requirements | 1543 | confident L4 |

Handoff 312 is **deferred** pending Bucket 2 #4 resolution: if the user picks option (a) (re-attribute the event to a new TELEMATICS-published trigger like `engine_hours.threshold_reached`), the audit re-tags the new handoff in a follow-up pass. If the user picks (b) (self-handoff after modularization), the existing PCF 823 tag holds and should be promoted via `agent_curated` re-confirmation. Either way the existing `discovery_substring` row stays as-is until the attribution question resolves.

Tag volume: 8 confident new `agent_curated` proposals + 1 deferred = 9 of 9 handoffs accounted for. H1 coverage gate clears after the 8 inserts (+ resolution of handoff 312). Within the 0.5N-0.8N expected band (N=9, expecting 5-7 new tags), this audit is on the upper end because the FLEET-MAINT verbs map cleanly to APQC's "Manage asset maintenance" cluster (352) and the AP/inventory/fixed-asset cluster (1326, 1388, 1389, 1391).

Notable: PCF 352 ("Manage asset maintenance") appears twice (B1-A2 and B1-A4), both legitimate (work-order completion to EAM and defect-to-ITSM-incident both implement the same L3 process via different downstream surfaces). The `(handoff_id, process_id)` natural key keeps the inserts distinct.

#### MISSING entities (compliance + workflow substrate)

| ID | Entity | Proposed module | Vendor / regulation evidence |
|---|---|---|---|
| B1-M1 | `parts_orders` (POs to parts vendors) | FLEET-MAINT-PARTS | Fleetio, AssetWorks, Trimble TMT all model parts purchase orders separately from inventory rows. Vendor PO, expected delivery date, receipt confirmation, line-item part numbers. Distinct from `vehicle_parts_inventory` (which is on-hand stock). |
| B1-M2 | `vehicle_warranty_claims` | FLEET-MAINT-PARTS | OEM warranty claim master: per-vehicle, per-part, claim number, submission date, OEM disposition, credit amount. Fleetio, AssetWorks, Trimble surface this. Warranty claims often follow a work-order-completed event when the failed part is under coverage. Regulator-adjacent (FTC magnuson-moss warranty act). |
| B1-M3 | `vehicle_recall_campaigns` | FLEET-MAINT-WORK-ORDER (or new sub-module) | NHTSA recall ingestion (49 CFR 573): per-VIN recall match, OEM campaign code, fix-deadline tracking, completion attestation. Fleetio + AssetWorks include this; CDK Global Recall, Recall Masters are pure-plays (separately queued as VEHICLE-RECALL-MGMT). May be sub-feature of B2-1 module set or its own domain. |
| B1-M4 | `mechanic_labor_entries` | FLEET-MAINT-WORK-ORDER | Per-mechanic time entries on a work order: clock-in / clock-out, labor code, billing rate. AssetWorks and Trimble TMT center their shop-floor workflow on this. Distinct from a generic `users` edge: this is a work-order line item, not just an assignment. |
| B1-M5 | `service_tasks` (PM task catalog) | FLEET-MAINT-PM | Catalog of standard service tasks (oil change, brake pad replacement, tire rotation) with default labor units and parts BOM. PM schedules reference these as building blocks. Fleetio, AssetWorks, Trimble all separate this from PM schedules (which are per-vehicle-class assemblies of service tasks). |
| B1-M6 | `mechanic_certifications` | FLEET-MAINT-WORK-ORDER | ASE certifications + manufacturer-specific (Diesel Cummins, EV high-voltage, etc.) for skill-matching mechanics to work orders. Trimble TMT surfaces this for shop scheduling; AssetWorks similar. |
| B1-M7 | `shops` (or `service_bays` / `service_centers`) | FLEET-MAINT-WORK-ORDER | Physical shop master (in-house garage, external dealer, mobile mechanic). Distinct from `locations` (embedded_master) because shops have capacity, hours, bay count, certification scope. Fleetio + AssetWorks treat this as a discrete entity. |
| B1-M8 | `meter_readings` | FLEET-MAINT-PM | Mileage / engine-hours / DTC fault-code readings ingested from telematics or manual entry. PM trigger basis. All 6 flagships expose this; distinct from telematics trip rows because these are PM-trigger points-of-truth, not trip telemetry. |

#### Intra-domain relationship edges (B6 fix, 5 baseline rows)

| ID | Edge | verb / inverse | cardinality | required | owner_side |
|---|---|---|---|---|---|
| B1-R1 | `preventive_maintenance_schedules` -> `vehicle_work_orders` | `generates` / `generated_by` | one_to_many | false | source |
| B1-R2 | `maintenance_defects` -> `vehicle_work_orders` | `routes_to` / `resolves` | one_to_many | false | target |
| B1-R3 | `vehicle_work_orders` -> `vehicle_parts_inventory` | `consumes` / `consumed_by` | many_to_many | false | source |
| B1-R4 | `preventive_maintenance_schedules` -> `vehicle_parts_inventory` | `requires` / `required_by` | many_to_many | false | source |
| B1-R5 | `maintenance_defects` -> `preventive_maintenance_schedules` | `triggers_revision` / `revised_via` | many_to_one | false | source |

#### Users-edge baseline (B7 fix, 4 rows)

| ID | Edge | verb |
|---|---|---|
| B1-U1 | `vehicle_work_orders` -> `users` | `assigned_to` (mechanic on the job) |
| B1-U2 | `maintenance_defects` -> `users` | `reported_by` (driver or inspector who flagged the defect) |
| B1-U3 | `vehicle_parts_inventory` -> `users` | `adjusted_by` (parts manager who last reconciled stock) |
| B1-U4 | `preventive_maintenance_schedules` -> `users` | `authored_by` (maintenance planner who created the schedule) |

#### Cross-domain outbound relationship rows (B8 fix, 3 rows)

| ID | Edge | verb | cardinality |
|---|---|---|---|
| B1-X1 | `vehicle_work_orders` -> `ap_invoices` (AP-AUTO-mastered when batched) | `posts_to` | many_to_one |
| B1-X2 | `vehicle_parts_inventory` -> `gl_inventory_postings` (FIN-mastered on stock adjustment) | `posts_to` | one_to_many |
| B1-X3 | `vehicle_work_orders` -> `eam_work_orders` (EAM-mastered, aggregation rollup) | `rolls_up_to` | many_to_one |

(Inbound mirrors are report-only per B8 asymmetry; they live on the source domains' B8 passes. The existing inbound row `eam_work_orders aggregates vehicle_work_orders` is the inverse of B1-X3 and was loaded from EAM's side.)

### Bucket 2 - Surface-for-user (judgment calls)

1. **Module split shape (gates everything in Bucket 1).** Proposed: 3 full modules.
   - **`FLEET-MAINT-WORK-ORDER`** masters `vehicle_work_orders`, `maintenance_defects`. Realizes capabilities `FM-WORK-ORDER`, `FM-MECHANIC-MGMT`, `FM-INSPECTION-DVIR`. Embedded-masters `fleet_vehicles`, `vehicle_inspections`, `users` (mechanics), `shops`, `mechanic_certifications`. The shop-floor module: work order lifecycle, defect triage, mechanic assignment, customer signature.
   - **`FLEET-MAINT-PM`** masters `preventive_maintenance_schedules`. Realizes `FM-PM-SCHEDULING`. Embedded-masters `fleet_vehicles`, `service_tasks`, `meter_readings`. The planning module: PM templates, trigger generation, schedule-to-work-order conversion.
   - **`FLEET-MAINT-PARTS`** masters `vehicle_parts_inventory`. Realizes `FM-PARTS-INV`, `FM-WARRANTY`. Embedded-masters `parts_orders`, `vehicle_warranty_claims`, `vehicle_recall_campaigns`. The parts and supplier module: stock management, PO workflow, warranty claim filing, recall campaign tracking.
   Alternative: 2-module split (`FLEET-MAINT-OPS` merging work-order + PM; `FLEET-MAINT-PARTS` standalone). 2 modules still satisfies Rule #14's >=2-module floor for the 6-capability domain. Recommended: 3 modules; the PM-planning scope is large enough to deserve its own module and matches AssetWorks and Trimble's product-line split.
2. **Pattern-flag scope for `maintenance_defects`.** Should `has_personal_content=true` because DVIR photos and reporter identity are present? Options: (a) yes, the photos + driver-signature flow through this entity, (b) no, the entity is structural and the personal content rides on inbound DVIR rows (`vehicle_inspections`) instead. Recommended: (a) for GDPR/CCPA-exposed buyers; document the reasoning out-of-band (Rule #15 forbids the notes write).
3. **`vehicle_inspections` master ownership intersects with FLEET-MGMT audit Bucket 2 #4.** FLEET-MGMT currently masters `vehicle_inspections`; FLEET-MAINT consumes. The FLEET-MGMT audit raised whether DVIR + PMI (mechanic-completed periodic) should split or unify. From FLEET-MAINT's side: PMI completion is a work-order outcome (mechanic signs off), DVIR is a driver activity. Options: (a) FLEET-MGMT keeps unified `vehicle_inspections` master with `inspection_kind` discriminator (recommended; matches Whip Around and Fleetio), (b) FLEET-MAINT masters a separate `mechanic_periodic_inspections` for PMI. Recommended: (a). Cross-coordinate with FLEET-MGMT audit's Bucket 2 #4.
4. **`preventive_maintenance.due` event attribution (B1-S8).** Handoff 312 mis-attributes the event to TELEMATICS. Options: (a) PATCH handoff 312 to swap source/target after introducing a new TELEMATICS-owned trigger event like `engine_hours.threshold_reached` that fires FROM TELEMATICS, and FLEET-MAINT then publishes `preventive_maintenance.due` as the downstream lifecycle event (clean, two events, accurate ownership), (b) leave handoff 312 with `source=target=FLEET-MAINT` once modules land (FLEET-MAINT-PM publishes preventive_maintenance.due, FLEET-MAINT-WORK-ORDER consumes), and remove TELEMATICS from the picture entirely (FLEET-MAINT subscribes to TELEMATICS trip / fault rows directly via DMDO consumer, not via handoff), (c) accept the current shape as-is (informal documentation that the trigger originates in TELEMATICS). Recommended: (a). Cleanest model; the FLEET-MAINT audit will then surface the new TELEMATICS-owned trigger event as a B9 owe on TELEMATICS' side.
5. **`maintenance_defect.resolved` outbound handoff missing.** The event fires (trigger_event 992 exists) but no `handoffs` row consumes it. Options: (a) FLEET-MAINT-WORK-ORDER consumes internally (intra-domain handoff once modules land), (b) outbound to AP-AUTO for repair invoice posting, (c) outbound to FIN for fixed-asset depreciation adjustment, (d) outbound to FLEET-MGMT for vehicle-status update (return-to-service). Recommended: (a) intra-domain + (b) outbound to AP-AUTO when external invoice involved + (d) outbound to FLEET-MGMT for the vehicle status flip. Three new handoff rows in total.
6. **`sign_document` workflow rationale on legacy skill 59.** Why is `sign_document` linked? Customer-signed work-order receipt on shop completion, OEM warranty-claim attestation, owner-paid-repair authorization, or vestigial? Options: (a) keep, redistribute to FLEET-MAINT-WORK-ORDER skill (customer signature on completion), (b) keep, redistribute to FLEET-MAINT-PARTS for warranty claim attestation, (c) keep on both modules' skills, (d) DELETE as vestigial. Recommended: (c) if user confirms both workflows are real.
7. **Regulation set scope for B1-S16.** Which `regulations` rows should `domain_regulations` carry? Floor set: FMCSA Part 396, FMCSA Part 393, NHTSA 49 CFR 573 (recalls), EPA emissions inspections, OSHA 29 CFR 1910. Stretch set adds: FTC Magnuson-Moss Warranty Act, RCRA hazardous-waste handling for used oil + tires + batteries, state lemon laws (relevant when customer paid for repair). Which to load? Recommended: floor set as required; stretch as optional (`applicability='conditional'` on the junction). Verify each is already a row in `regulations`; if missing, surface as upstream gap.
8. **`vehicle_recall_campaigns` (B1-M3) as separate module or feature.** Should B1-M3 be its own sub-module (`FLEET-MAINT-RECALL`) or just embedded inside `FLEET-MAINT-WORK-ORDER`? Recall Masters and CDK Global Recall treat it as a discrete buyer journey (queued as VEHICLE-RECALL-MGMT candidate domain); the broader flagships embed it. Options: (a) embed in `FLEET-MAINT-WORK-ORDER` (recommended for catalog parsimony), (b) split into its own sub-module within FLEET-MAINT, (c) promote VEHICLE-RECALL-MGMT to its own domain after Phase 0 research. Recommended: (a) for now; revisit if VEHICLE-RECALL-MGMT Phase 0 surfaces a distinct buyer journey.
9. **`shops` master (B1-M7) overlap with `locations` (id 795, embedded_master) and IWMS canonical authority.** The new `shops` master is more specific than `locations` (has bay capacity, mechanic roster, certification scope). Options: (a) author `shops` as a FLEET-MAINT-WORK-ORDER-mastered child of `locations` with the FK to `locations`, (b) leave shop attributes on `locations` and skip `shops` (overloads `locations` with maintenance-specific columns), (c) push `shops` to IWMS as the canonical owner with FLEET-MAINT embedded_master (consistent with IWMS's `locations` mastery but adds an IWMS dependency). Recommended: (a). FLEET-MAINT masters `shops` because the operational metadata (bay count, hours, mechanic certification scope) is maintenance-specific.

### Bucket 3 - Phase 0 pending (speculative; vendor-research vetting needed)

| ID | Candidate | Recommendation | Vendor knowledge basis |
|---|---|---|---|
| B3-1 | **TIRE-MGMT** (candidate new domain, newly queued) - Fleet Tire Management | Phase 0 vendor research (Bridgestone Webfleet Tire Management, Goodyear Tirewise, IDSC Tire Operations, Hankook Tire Management, Continental ContiConnect). Already queued via append helper. | Tires are routinely the single largest parts-cost line item in commercial trucking; a dedicated tire-mgmt buyer journey exists. Bridgestone and Goodyear sell standalone tire-program suites. May warrant promotion to its own domain or fold into FLEET-MAINT-PARTS as a sub-feature. |
| B3-2 | **VEHICLE-RECALL-MGMT** (candidate new domain, newly queued) - Vehicle Recall Management | Phase 0 vendor research (Recall Masters, AutoAp, MotorTrace, CDK Global Recall, Stoneeagle). Already queued via append helper. | Distinct buyer journey from PM/work-orders: VIN-level OEM recall ingestion, owner-notification, repair-completion attestation, OEM reimbursement. Pure-play vendors exist; major dealers buy specifically for this. May warrant promotion to its own domain. |
| B3-3 | **EV-CHARGING-MGMT** (candidate already queued from FLEET-MGMT audit, mention bumped) | Phase 0 vendor research (ChargePoint Fleet, Geotab EV Suite, Samsara EV Charging, Driivz, Sparkion, AMPECO). | FLEET-MAINT will get more complex on EV adoption: high-voltage technician certification, battery-state-of-health tracking, regen-brake wear patterns, charging-station maintenance. Some of this routes through EV-CHARGING-MGMT; some stays in FLEET-MAINT. |
| B3-4 | `service_tasks` (B1-M5) vs. existing `processes` master (APQC PCF) | Eyeball decision: depends on whether the catalog wants vendor-specific maintenance task definitions (oil change, tire rotation) as a FLEET-MAINT-mastered entity vs. a generic `processes` row. | Trimble, AssetWorks, Fleetio all expose this. The data shape is industry-specific (parts BOM + labor units) so FLEET-MAINT mastery is appropriate; `processes` is the wrong granularity. |
| B3-5 | `vehicle_diagnostic_codes` master (DTC code dictionary + vehicle-specific occurrence) | Phase 0; verify whether this belongs in FLEET-MAINT or TELEMATICS | Samsara, Geotab, Motive all expose fault-code feeds. The dictionary side (SAE J1939 / J2012) is reference data; the occurrence side (which vehicle threw which DTC when) is a TELEMATICS entity. FLEET-MAINT consumes both. |
| B3-6 | `mechanic_skill_inventory` separate from `mechanic_certifications` (B1-M6) | Eyeball decision; the certifications side is regulated/credentialed, the skills side is informal (knows the F-150, knows EV high-voltage by experience). | AssetWorks and Trimble distinguish; Fleetio does not. Probably overkill for the catalog at this scale. |
| B3-7 | `lubrication_schedules` / `fluids_master` (engine oil, ATF, coolant, brake fluid types per vehicle) | Phase 0; verify whether this rolls into `vehicle_parts_inventory` or warrants its own entity | Trimble TMT and AssetWorks expose lubrication and fluid programs as separate from generic parts. Likely a sub-feature of `vehicle_parts_inventory` with a `parts_kind` discriminator (lubricant vs hardware vs consumable). |
| B3-8 | Mobile-mechanic / dispatch-to-vehicle workflows (FSM-adjacent) | Phase 0; verify whether mobile-mechanic dispatch is FLEET-MAINT or FSM | Wrench, YourMechanic, Bridgestone Roadside, Cummins Care all dispatch mechanics to vehicles in the field. From FLEET-MAINT's side this looks like a special case of work-order assignment; from FSM's side it looks like field dispatch. May warrant a sub-module or stay in FLEET-MAINT-WORK-ORDER. |

### Cross-bucket dependencies

- **B1-S1 (module split) gates everything in B-band, F-band, and BOUNDARY findings.** Until Bucket 2 #1 resolves, none of B1-S4..S15 can be loaded with the right module FK assignments.
- **Bucket 2 #3 (`vehicle_inspections` DVIR vs PMI overlap) intersects with FLEET-MGMT audit 2026-05-30 Bucket 2 #4.** Coordinated decision; resolving here cascades into FLEET-MGMT's `vehicle_inspections` master shape.
- **Bucket 2 #4 (`preventive_maintenance.due` attribution) gates B1-S8 + B1-B2 fixes.** TELEMATICS B9 owes a new trigger event under option (a); the FLEET-MAINT side change depends on user picking (a), (b), or (c).
- **Bucket 2 #5 (`maintenance_defect.resolved` outbound handoffs) adds 1-3 new outbound handoffs.** Each new handoff also needs an APQC tag in a follow-up pass (likely Process accounts payable (315) for the AP-AUTO outbound and Manage asset maintenance (352) for the FLEET-MGMT vehicle status update).
- **Bucket 2 #8 (recall management split) intersects with Bucket 3 #2 (VEHICLE-RECALL-MGMT candidate domain).** If VEHICLE-RECALL-MGMT promotes after Phase 0, `vehicle_recall_campaigns` (B1-M3) moves out of FLEET-MAINT entirely and B1-S1 module set may not need to embed it.
- **Bucket 3 #1 (TIRE-MGMT) intersects with B1-M1 / `vehicle_parts_inventory` mastery.** If TIRE-MGMT promotes, tire-specific PO and stock workflows split out; parts-inventory either stays generic with a `parts_kind` discriminator or splits.
- **Bucket 3 #5 (`vehicle_diagnostic_codes` master ownership) intersects with TELEMATICS audit's B-band findings.** Coordinated decision when both audits land.
- **Buckets 2 and 3 are otherwise independent of each other; the user can resolve them in any order.**

### Per-bucket prompts

After the gap report is surfaced, the orchestrator should prompt the user with the following per-bucket asks:

- **Bucket 1:** "16 in-scope items. Approve all, approve some (name the IDs), or skip? Note that S3..S15 + R-, U-, X-, A-, M-, B-subgroups all depend on Bucket 2 #1 resolving the module split first."
- **Bucket 2:** "9 judgment items. Please answer each in turn: (1) module split shape, (2) pattern-flag scope on maintenance_defects, (3) vehicle_inspections DVIR/PMI overlap with FLEET-MGMT, (4) preventive_maintenance.due attribution, (5) maintenance_defect.resolved outbound shape, (6) sign_document workflow rationale, (7) regulation set scope, (8) recall management module placement, (9) shops master shape."
- **Bucket 3:** "8 speculative candidates. Three already queued via append_missing_domain.ts (TIRE-MGMT, VEHICLE-RECALL-MGMT, EV-CHARGING-MGMT re-confirmed). Vet via Phase 0 research (recommended for TIRE-MGMT and VEHICLE-RECALL-MGMT since they look like real adjacent domains), or eyeball-mode (name which to treat as confirmed)?"

### Report-only follow-ups (owed by other domains)

- **FLEET-MGMT (147) M1 owes:** FLEET-MGMT itself has zero `domain_modules` per its own 2026-05-30 audit. The 1 outbound from FLEET-MAINT (877) and 2 inbound from FLEET-MGMT (875, 313) cannot resolve their FLEET-MGMT-side module FKs until FLEET-MGMT modularizes per its B1-S1.
- **TELEMATICS (148) M1 owes:** TELEMATICS has zero `domain_modules`. Inbound handoffs 312, 881 carry NULL source-side module FK until TELEMATICS modularizes. Schedule a TELEMATICS Validate b1 pass for full resolution.
- **TELEMATICS B9 owes (potential):** if Bucket 2 #4 resolves option (a), TELEMATICS owes a new outbound trigger event (`engine_hours.threshold_reached` or similar) and a new handoff to FLEET-MAINT.
- **AP-AUTO (29) M1 owes:** AP-AUTO has zero modules. Outbound 316 (`vehicle_work_order.completed` -> AP-AUTO) cannot resolve target-side module FK until AP-AUTO modularizes.
- **EAM (53) M1 owes:** EAM has zero modules. Outbound 320 (`vehicle_work_order.completed` -> EAM) cannot resolve target-side module FK until EAM modularizes.
- **FIN (65) M1 owes:** FIN has zero modules. Outbound 879 (`parts_inventory.adjusted` -> FIN) cannot resolve target-side module FK until FIN modularizes (target module likely `FIN-INVENTORY-ACCOUNTING` per PCF 1326).
- **FLEET-MGMT B8 owes (inbound mirror):** the 2 inbound from FLEET-MGMT (875 `fleet_vehicle.acquired`, 313 `vehicle_inspection.failed`) each imply a FLEET-MGMT-side outbound `data_object_relationships` row that lives on FLEET-MGMT's B8 pass (the FLEET-MGMT 2026-05-30 audit already enumerates B1-X1 + B1-X2 covering these in spirit).
- **TELEMATICS B8 owes (inbound mirror):** the 2 inbound from TELEMATICS (312, 881) imply TELEMATICS-side outbound relationship rows. Lives on TELEMATICS' B8 once that domain is audited.
- **EAM B8 owes (existing inbound, already partially loaded):** the EAM-side row `eam_work_orders aggregates vehicle_work_orders` is the inbound mirror of B1-X3; EAM may add a `is_required` or `owner_side` PATCH but the row exists.

## 2026-05-31, Continuation: B1 technical fixes

### Applied

- **B1-S4 (intra-domain `data_object_relationships`):** 4 of 5 audit-pre-specified rows inserted via [.tmp_deploy/fix_fleet_maint_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_fleet_maint_b1_technical_2026_05_31.ts). Row ids `1912` (R1: `preventive_maintenance_schedules generates vehicle_work_orders`), `1913` (R2: `maintenance_defects routes_to vehicle_work_orders`, owner_side=target), `1914` (R3: `vehicle_work_orders consumes vehicle_parts_inventory`, many_to_many association), `1915` (R4: `preventive_maintenance_schedules requires vehicle_parts_inventory`, many_to_many association). All `record_status=new`, `notes=''`.
- **B1-S5 (Rule #10 users edges):** 4 audit-pre-specified rows inserted in the same loader. Row ids `1916` (U1: `vehicle_work_orders assigned_to users`, many_to_many, owner=source), `1917` (U2: `maintenance_defects reported_by users`, owner=target), `1918` (U3: `vehicle_parts_inventory adjusted_by users`, owner=target), `1919` (U4: `preventive_maintenance_schedules authored_by users`, owner=target). All `record_status=new`, `notes=''`.

### Deferred

- **B1-S4 R5** (`maintenance_defects triggers_revision preventive_maintenance_schedules`, audit-specified `many_to_one`): the `data_object_relationships.relationship_type` enum is `one_to_one | one_to_many | many_to_many`, no `many_to_one`. Re-encoding by swapping source/target would drift from the audit's literal tuple shape. Surface for the user to either (a) approve swapped encoding (source=PM_schedules, related=defects, one_to_many, owner=target, verb=revised_via / inverse=triggers_revision), or (b) approve a different cardinality (e.g. one_to_many keeping audit verb direction).
- **B1-S1** (module split, 3 full modules): Bucket 2 #1 user pick.
- **B1-S2** (catalog_tagline / catalog_description): Rule #20, surface to user before write.
- **B1-S3** (pattern flags `has_submit_lock` on `vehicle_work_orders`, `has_personal_content` on `maintenance_defects`): audit says "after user confirmation" + Bucket 2 #2.
- **B1-S6** (B8 outbound cross-domain rels X1-X3): X1 (`ap_invoices`) and X2 (`gl_inventory_postings`) target data_objects do not exist in the catalog (`/data_objects?or=(data_object_name.eq.ap_invoices,data_object_name.eq.gl_inventory_postings)` returned `[]`). X3 (`vehicle_work_orders -> eam_work_orders`) is the inverse of the pre-existing row 640 (`eam aggregates vehicle_work_orders`, owner_side=target), already covered from EAM's side per the audit's report-only note.
- **B1-S7** (intra-domain handoffs after modules land), **B1-S9** (B10b FK PATCHes), **B1-S12** + **B1-S13** (module-scoped skills redistribute, legacy skill 59 DELETE), **B1-S14** (`send_email -> notify_person` PATCH or DELETE): all gated on B1-S1 (module split).
- **B1-S8** (handoff 312 event-attribution defect): Bucket 2 #4 user pick.
- **B1-S10** (`data_object_aliases`, 12-16 rows): rule "no bulk `data_object_aliases` inserts unless audit pre-specifies exact tuples" — audit gives vendor lexicon hints not exact tuples.
- **B1-S11** (lifecycle states + `permission_verb_override`): no lifecycle states authored yet; `permission_verb_override` PATCH would only apply once states exist. State machines themselves need user authoring per audit shape.
- **B1-S15** (`sign_document` rationale): Bucket 2 #6 user pick.
- **B1-S16** (`domain_regulations` floor set, 4-6 rows): the underlying `regulations` rows (FMCSA Part 396, FMCSA Part 393, NHTSA 49 CFR 573, EPA emissions, OSHA 29 CFR 1910) do not exist in the catalog (filters by `regulation_name ilike` and `regulation_code ilike` against `*FMCSA*`, `*NHTSA*`, `*EPA*`, `*OSHA*`, `*Magnuson*`, `*RCRA*`, `*396*`, `*393*`, `*573*`, `*1910*` all returned `[]`). Per audit: "if any regulation rows are missing from `regulations`, that is an upstream load gap (separate fix)."

### JWT errors

None.

### Loader

[`.tmp_deploy/fix_fleet_maint_b1_technical_2026_05_31.ts`](../.tmp_deploy/fix_fleet_maint_b1_technical_2026_05_31.ts), 8 inserts, 0 skips on first run.

## 2026-05-31, Audit

### Summary

- Current footprint: 4 mastered `data_objects` (`vehicle_work_orders` id 379, `preventive_maintenance_schedules` id 380, `vehicle_parts_inventory` id 702, `maintenance_defects` id 703); 2 consumer rollups (`fleet_vehicles` id 370, `vehicle_inspections` id 374, both FLEET-MGMT-mastered); 2 infra embedded_master rows (`org_units` id 34 optional, `locations` id 795 required); 6 capabilities (FM-PM-SCHEDULING 416, FM-WORK-ORDER 417, FM-PARTS-INV 418, FM-MECHANIC-MGMT 419, FM-WARRANTY 420, FM-INSPECTION-DVIR 421); 4 `business_function_domains` rows (Logistics owner, Indirect Procurement contributor, Accounting contributor, Field Service Operations consumer); 0 `domain_modules`; 0 `domain_module_data_objects`; 0 `domain_module_host_domains`; 9 `data_object_relationships` (5 intra-domain + 4 users edges loaded 2026-05-31 + 1 EAM inbound row 640); 0 `data_object_aliases`; 0 `data_object_lifecycle_states`; 0 `domain_regulations`; 1 legacy `domain_id`-scoped system skill (`fleet-maint-system` id 59) with 6 `skill_tools` (4 `query_*`, `send_email` id 37, `sign_document` id 42); 5 `trigger_events` on the 4 masters (304, 305, 991, 992, 993); 9 cross-domain handoffs (5 outbound + 4 inbound, 8 of 9 with NULL on both module FKs, handoff 878 has `target_domain_module_id=38`); 7 of 9 handoffs tagged in `handoff_processes` (handoff 312 via `discovery_substring` PCF 823; handoffs 313 PCF 352, 316 PCF 315, 320 PCF 1552, 875 PCF 1389, 877 PCF 352, 881 PCF 1543 all via `agent_curated`, all `record_status=new`); handoffs 878 and 879 remain untagged.
- Bucket 1 (in-scope, agent fixable): 12 items.
- Bucket 2 (surface-for-user, judgment): 9 items (unchanged from 2026-05-30).
- Bucket 3 (Phase 0 pending, speculative): 8 items (unchanged from 2026-05-30).
- Vendor surface unchanged from 2026-05-30: Fleetio, AssetWorks FleetFocus, Whip Around, Samsara, Geotab, Trimble TMT; compliance basis FMCSA Part 396 / 393, NHTSA 49 CFR 573, EPA emissions, OSHA 29 CFR 1910.

Structural pass: A passes except A4 (`catalog_tagline` and `catalog_description` both still empty). M is a **hard fail** (0 `domain_modules` against 6 capabilities, so M1 and M2 both fail; M6 / M7 cannot evaluate). B passes B5 partially (5 intra-domain + 4 user-edge relationships now loaded, but the deferred B1-S4 R5 row is still open, and the EAM inbound row 640 is the sole cross-domain edge so B8 remains broken). B7 covered by the 4 users edges loaded 2026-05-31. B9 attribution defect on handoff 312 still open. B9b cannot evaluate (no modules). B10b hard fail (8 of 9 handoffs NULL on `source_domain_module_id`, all 9 NULL except handoff 878's `target_domain_module_id=38`). B11 zero aliases. B12 zero lifecycle states. C passes. D passes (4 `business_function_domains` rows). E vacuous (no modules to attach roles to). F1 fails (legacy `fleet-maint-system` id 59 still present, `domain_id=149`, `domain_module_id=NULL`). F2 / F3 / F4 / F5 cannot evaluate (no module-scoped skills exist). H1 partial: 7 of 9 handoffs tagged (78% coverage), 0 `record_status=approved` (catalog quality), 6 `agent_curated` (process-health firing).

The entire B / E / F / H1 surface gates on B1-S1 (module split) per the 2026-05-30 audit. Bucket 1 carries forward all 2026-05-30 items not yet resolved plus 2 new fixable items (the 2 missing APQC tags on handoffs 878 and 879).

### Vendor surface basis

Carried forward from 2026-05-30, no re-research this run. The B-, F-, and module-split findings remain stable against the same vendor set.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures (carried forward)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 / M2 / M6 (hard) | 0 `domain_modules` rows for FLEET-MAINT; 6 capabilities, 4 mastered data_objects; every downstream B / E / F band blocked. | Author the module set per Bucket 2 #1 user pick. Default proposal: 3 full modules (FLEET-MAINT-WORK-ORDER, FLEET-MAINT-PM, FLEET-MAINT-PARTS) via standard Phase A loader pattern. |
| B1-S2 | A4 | `domains.catalog_tagline` and `domains.catalog_description` both empty. | Rule #20 forbids agent-authored copy without user approval; surface buyer-voice draft for user review before any write. |
| B1-S3 | B4 (pattern flags) | All 4 masters carry the schema default (`has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false`); plausibly `has_submit_lock=true` on `vehicle_work_orders` after completion freeze, and `has_personal_content=true` on `maintenance_defects` for DVIR photos / driver signature. | PATCH after user confirmation; Bucket 2 #2 carries the pattern-flag scope for `maintenance_defects`. |
| B1-S7 | B9b (intra-domain handoffs) | After B1-S1 lands: PM.due (FLEET-MAINT-PM) -> work-order generation (FLEET-MAINT-WORK-ORDER); defect.reported -> parts-consumption (FLEET-MAINT-PARTS); work-order.completed -> warranty-claim-eligibility (FLEET-MAINT-PARTS); plus the missing `maintenance_defect.resolved` outbound (likely AP-AUTO + FLEET-MGMT per Bucket 2 #5). | After B1-S1, derive intra-domain handoff rows with `integration_pattern: lifecycle_progression`. Author the missing `maintenance_defect.resolved` outbound (1-3 rows per Bucket 2 #5). |
| B1-S9 | B10b (hard) | 8 of 9 handoffs NULL on `source_domain_module_id`; all NULL on `target_domain_module_id` except handoff 878 (target=ITSM-INCIDENT-MGMT id 38). | After B1-S1, source-side FK = the new FLEET-MAINT module that masters the trigger event's data_object. Target-side NULLs on outbounds toward FLEET-MGMT, EAM, AP-AUTO, FIN, TELEMATICS remain NULL until those domains modularize. |
| B1-S10 | B11 | 0 `data_object_aliases` rows. | Audit gives vendor lexicon hints not exact tuples; bulk insert blocked per skill rule. Surface for the user to author exact tuples. |
| B1-S11 | B12 (hard) | 0 `data_object_lifecycle_states` rows. `vehicle_work_orders` and `maintenance_defects` carry workflow-bearing state; `preventive_maintenance_schedules` arguably workflow-bearing (`draft -> active -> due_soon -> overdue -> disabled`); `vehicle_parts_inventory` is config-shape (record_status only) and qualifies for the exemption. | Draft state machines for `vehicle_work_orders` and `maintenance_defects` (and `preventive_maintenance_schedules` if user confirms workflow-bearing); surface the `vehicle_parts_inventory` config-shape exemption to user without writing `data_objects.notes` (Rule #15). `vehicle_work_orders` completion / closure / cancellation states need `requires_permission=true` + `permission_verb_override`. |
| B1-S12 | F1 / F2 / F3 | Legacy `fleet-maint-system` skill 59 (domain-scoped) still present; 0 module-scoped system skills. After B1-S1, retire 59 and author 3 module-scoped skills (`fleet_maint_work_order_agent`, `fleet_maint_pm_agent`, `fleet_maint_parts_agent`), redistribute 4 existing `query_*` tools (470, 471, 807, 808) by mastered entity, add 4-6 new tools per module (workflow gates like `complete_work_order`, `assign_mechanic`, `resolve_defect`, `adjust_parts_stock`, `apply_warranty_credit`, `schedule_pm`), then DELETE skill 59. | After B1-S1 user pick. |
| B1-S14 | F7 (channel primitives) | Skill 59 links `send_email` (tool id 37, channel primitive) with no `skill_tools.notes` justification. The FLEET-MAINT email use is generic operational notification, not channel-bound. | PATCH the `skill_tools` row 546 to point at `notify_person` instead, OR DELETE row 546 if the new module-scoped skills already link `notify_person`. Combines into B1-S12. |
| B1-S16 | C-band-adjacent (`domain_regulations`) | 0 `domain_regulations` rows; floor set FMCSA Part 396, FMCSA Part 393, NHTSA 49 CFR 573, EPA emissions inspection, OSHA 29 CFR 1910. Per 2026-05-31 continuation, none of these underlying `regulations` rows exist in the catalog. | Upstream gap. Author the missing `regulations` rows first (separate load), then load `domain_regulations` junctions. |

#### BOUNDARY findings (carried forward)

All 6 BOUNDARY findings B1-B1 through B1-B6 from 2026-05-30 are unchanged. B1-B1 (FLEET-MGMT) blocked by FLEET-MGMT M1. B1-B2 (TELEMATICS) blocked by TELEMATICS M1 and Bucket 2 #4. B1-B3 (AP-AUTO), B1-B4 (EAM), B1-B5 (FIN) all blocked by partner M1. B1-B6 (ITSM) source-side blocked by FLEET-MAINT B1-S1; target side already resolved.

#### APQC TAGGING (delta)

Of the 8 `agent_curated` proposals in the 2026-05-30 audit, 6 landed and 2 remain pending:

| ID | handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | confidence | status |
|---|---|---|---|---|---|---|---|---|
| B1-A4 | 878 | FLEET-MAINT -> ITSM | `maintenance_defect.reported` | (ITSM `service_incidents` id 47) | Manage asset maintenance | 352 | confident L3 | pending |
| B1-A5b | 879 | FLEET-MAINT -> FIN | `parts_inventory.adjusted` | `vehicle_parts_inventory` | Perform inventory accounting | 1326 | confident L4 | pending |

Delta vs 2026-05-30 audit-proposed PCF ids: handoff 320 was proposed PCF 352 ("Manage asset maintenance") but the existing live row tags it to PCF 1552 ("Update work and asset records") via `agent_curated`. Handoff 875 was proposed PCF 1388 ("Maintain fixed-asset master data files"); live row uses PCF 1389 ("Process and record fixed-asset additions and retires"). Handoff 316 was proposed PCF 1391 ("Process and record fixed-asset maintenance and repair expenses"); live row uses PCF 315 ("Process accounts payable (AP)"). These three deltas are informational; the live tags are defensible AP / fixed-asset classifications and stand absent user direction otherwise.

#### MISSING entities (carried forward)

All 8 MISSING entities B1-M1 through B1-M8 from 2026-05-30 remain pending, blocked by B1-S1 module split:

| ID | Entity | Proposed module |
|---|---|---|
| B1-M1 | `parts_orders` | FLEET-MAINT-PARTS |
| B1-M2 | `vehicle_warranty_claims` | FLEET-MAINT-PARTS |
| B1-M3 | `vehicle_recall_campaigns` | FLEET-MAINT-WORK-ORDER (or sub-module per Bucket 2 #8) |
| B1-M4 | `mechanic_labor_entries` | FLEET-MAINT-WORK-ORDER |
| B1-M5 | `service_tasks` | FLEET-MAINT-PM |
| B1-M6 | `mechanic_certifications` | FLEET-MAINT-WORK-ORDER |
| B1-M7 | `shops` | FLEET-MAINT-WORK-ORDER (per Bucket 2 #9) |
| B1-M8 | `meter_readings` | FLEET-MAINT-PM |

#### B6 / B7 / B8 status (carried forward)

- B6 intra-domain relationships: 4 of 5 audit rows loaded (1912-1915). B1-S4 R5 (`maintenance_defects triggers_revision preventive_maintenance_schedules`) is deferred to user pick because the audit-specified `many_to_one` cardinality is not in the `relationship_type` enum (allowed: `one_to_one`, `one_to_many`, `many_to_many`). Carries into Bucket 2 as item #10.
- B7 users edges: 4 of 4 loaded (1916-1919). Closed.
- B8 cross-domain outbound: 3 audit rows (X1, X2, X3) all deferred: X1 (`ap_invoices`) and X2 (`gl_inventory_postings`) target entities do not exist in catalog (upstream gap); X3 (`vehicle_work_orders -> eam_work_orders`) is already encoded inbound from EAM as row 640. Open as report-only.

### Bucket 2 - Surface-for-user (judgment calls)

All 9 items from 2026-05-30 remain unanswered; one new item from the 2026-05-31 continuation:

1. Module split shape (3 vs 2 modules). Gates B-band, F-band, BOUNDARY fixes.
2. Pattern-flag scope on `maintenance_defects` (`has_personal_content=true`?).
3. `vehicle_inspections` DVIR vs PMI mastery (FLEET-MGMT Bucket 2 #4 coordinated).
4. `preventive_maintenance.due` attribution defect on handoff 312 (a/b/c).
5. `maintenance_defect.resolved` outbound shape (1-3 new handoff rows).
6. `sign_document` workflow rationale on legacy skill 59.
7. `domain_regulations` scope (floor vs stretch); blocked by missing `regulations` upstream rows.
8. `vehicle_recall_campaigns` placement (embed vs sub-module vs new domain).
9. `shops` master shape vs `locations` embedded_master vs IWMS authority.
10. **B1-S4 R5 encoding** (NEW from continuation): `maintenance_defects triggers_revision preventive_maintenance_schedules` was specified `many_to_one` but the enum only allows `one_to_one`, `one_to_many`, `many_to_many`. Options: (a) swap source/target (source=`preventive_maintenance_schedules`, related=`maintenance_defects`, `one_to_many`, owner=target, verb=`revised_via`, inverse=`triggers_revision`), (b) keep verb direction with `one_to_many` (logically inverted from audit text), (c) abandon the edge.

### Bucket 3 - Phase 0 pending (speculative)

All 8 candidates B3-1 through B3-8 from 2026-05-30 remain pending: TIRE-MGMT, VEHICLE-RECALL-MGMT (both newly queued via `append_missing_domain.ts`), EV-CHARGING-MGMT (queued via FLEET-MGMT audit), `service_tasks` vs `processes`, `vehicle_diagnostic_codes` ownership, `mechanic_skill_inventory` split, `lubrication_schedules`, mobile-mechanic dispatch overlap with FSM.

### JWT errors

None.

### Files written

- `audits/FLEET-MAINT/history.md` (this append)
- `audits/FLEET-MAINT/state.yaml` (rewrite to v2 with PENDING-only b1a / b1b / b2 / b3)

## 2026-06-02 Audit (modularization)

### Summary

FLEET-MAINT modularized: the M1 hard fail (zero `domain_modules` against 6 capabilities) carried since the 2026-05-30 audit is resolved. Adopted the 3-module split proposed in B2-1 (the recommended option). Scope of this pass was modules + capability links + data_object assignment ONLY: no new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships were created. Loader [.tmp_deploy/modularize_fleet_maint_2026-06-02.ts](../.tmp_deploy/modularize_fleet_maint_2026-06-02.ts), idempotent, 3 module inserts + 6 capability links + 10 DMDO rows on first run, 0 skips.

### Modules authored

| id | code | kind | capabilities | masters | other DMDO |
|---|---|---|---|---|---|
| 249 | FLEET-MAINT-WORK-ORDER | full | FM-WORK-ORDER (417), FM-MECHANIC-MGMT (419), FM-INSPECTION-DVIR (421) | `vehicle_work_orders` (379), `maintenance_defects` (703) | `fleet_vehicles` (370) consumer/required, `vehicle_inspections` (374) consumer/required, `org_units` (34) embedded_master/optional, `locations` (795) embedded_master/required |
| 250 | FLEET-MAINT-PM | full | FM-PM-SCHEDULING (416) | `preventive_maintenance_schedules` (380) | `fleet_vehicles` (370) consumer/required |
| 251 | FLEET-MAINT-PARTS | full | FM-PARTS-INV (418), FM-WARRANTY (420) | `vehicle_parts_inventory` (702) | `locations` (795) embedded_master/required |

### Catalog-wide master pre-check (M7)

Ran `/domain_module_data_objects?data_object_id=eq.<id>&role=eq.master` for all six in-domain assignable entities before writing any `role='master'`:

- `vehicle_work_orders` (379): no prior master anywhere -> FLEET-MAINT-WORK-ORDER masters.
- `maintenance_defects` (703): no prior master anywhere -> FLEET-MAINT-WORK-ORDER masters.
- `preventive_maintenance_schedules` (380): no prior master anywhere -> FLEET-MAINT-PM masters.
- `vehicle_parts_inventory` (702): no prior master anywhere -> FLEET-MAINT-PARTS masters.
- `fleet_vehicles` (370): mastered catalog-wide by FLEET-MGMT-VEHICLE-LIFECYCLE (module 204, domain 147). Assigned `consumer`/`required` here (legacy `domain_data_objects` role was already `consumer`). NO demotion needed.
- `vehicle_inspections` (374): mastered catalog-wide by FLEET-MGMT-DRIVER-OPS (module 205, domain 147). Assigned `consumer`/`required` here (legacy role already `consumer`). NO demotion needed.

No demotions were required: the two FLEET-MGMT-mastered entities were already `consumer` in the legacy rollup, so no legacy `master` role had to be downgraded to `embedded_master`. The four FLEET-MAINT-local masters are each mastered in exactly one module in-domain AND catalog-wide.

### Verification (post-load)

- M1 / M2 pass: 3 `full` modules exist against 6 capabilities.
- Rule #14 pass: 6 capabilities -> 3 modules (within the 2-3 target).
- M4 pass: all 6 capabilities placed, each in exactly one module (417/419/421 -> 249; 416 -> 250; 418/420 -> 251).
- M6 pass: every module has >=1 capability and >=1 data_object; no empty module.
- M7 pass (in-domain AND catalog-wide): each of the 4 local masters appears as `master` in exactly one module catalog-wide (re-pull confirmed 379->249, 703->249, 380->250, 702->251; no second master row anywhere).
- Roles + necessity for borrowed (non-master) entities preserved verbatim from the legacy `domain_data_objects` rollup.

### Downstream now unblocked (deferred, out of this pass scope)

The modules existing now satisfies the `{type: prerequisite_entity, ref: B1B-S1}` gate that previously blocked B1B-S7, S9 (FLEET-MAINT source-side handoff FKs), S11 (`permission_verb_override` scoping), S12 (module-scoped system skills + legacy skill 59 retirement), S14, S15, B1B-M1..M8 (missing-master loads), and the source-side FKs of B1B-B1..B6. These are NOT part of the modularization scope and remain open. Rule #17 (F2/F3) now requires one `<module_code_lower>_agent` system skill per new module (`fleet_maint_work_order_agent` on 249, `fleet_maint_pm_agent` on 250, `fleet_maint_parts_agent` on 251), each with >=1 `skill_tools` row; legacy domain-scoped skill `fleet-maint-system` (id 59, 6 skill_tools) must retire once those exist. M8/A4 catalog UX copy (`catalog_tagline` + `catalog_description`) is still empty on the domain (id 149) and now also on the 3 new modules; gated on user-approved buyer-voice wording (Rule #20).

### JWT errors

None.

### Files written

- `audits/FLEET-MAINT/history.md` (this append)
- `audits/FLEET-MAINT/state.yaml` (rewrite to v2; module FKs filled in on affected_masters, B1B-S1 resolved into history, new b1a system-skill + catalog-UX items added)
- `.tmp_deploy/modularize_fleet_maint_2026-06-02.ts` (idempotent loader)

## 2026-06-06 - b1a execution

Executed the agent-solvable b1a items for FLEET-MAINT (domain 149). Loader: `.tmp_deploy/fleet_maint_b1a.ts` (idempotent). No DELETE or PATCH of pre-existing rows beyond writing into empty fields; no prior values overwritten.

### B1A-SYSTEM-SKILLS - PARTIAL (agent-solvable portion DONE; remainder deferred, see below)

Authored 3 module-scoped `skill_type='system'` skills (Rule #17 F2), each `domain_id=149`, `record_status` defaulted to `new`:

- `skills` #291 `fleet_maint_work_order_agent` (domain_module_id 249)
- `skills` #292 `fleet_maint_pm_agent` (domain_module_id 250)
- `skills` #293 `fleet_maint_parts_agent` (domain_module_id 251)

Redistributed the 4 existing catalog-wide `query_*` tools plus `notify_person` via new `skill_tools` rows (Rule #17 F3/F4; `notes` left empty per Rule #15; `record_status` defaulted to `new`). Tools were reused, NOT re-created (all already existed: 470, 471, 807, 808, 913):

- `skill_tools` #2779 skill 291 -> tool 470 query_vehicle_work_orders (required)
- `skill_tools` #2780 skill 291 -> tool 808 query_maintenance_defects (required)
- `skill_tools` #2781 skill 291 -> tool 913 notify_person (optional)
- `skill_tools` #2782 skill 292 -> tool 471 query_preventive_maintenance_schedules (required)
- `skill_tools` #2783 skill 292 -> tool 913 notify_person (optional)
- `skill_tools` #2784 skill 293 -> tool 807 query_vehicle_parts_inventory (required)
- `skill_tools` #2785 skill 293 -> tool 913 notify_person (optional)

`notify_person` (tool 913, channel abstraction) substitutes the legacy `send_email` link (B1B-S14) per the channel-vs-capability rule: FLEET-MAINT email use is generic operational notification (PM-due reminders, defect alerts, work-order-completion, parts-low), distributed to the owning module skill.

DEFERRED (blocked, NOT executed):

- `sign_document` (skill_tools row 547, tool 42) resolution is blocked on user_decision B2-6 (per B1B-S15). Rule #7 forbids executing user_decision-gated work.
- DELETE of legacy skill 59 (`fleet-maint-system`, domain_module_id NULL) and its 6 skill_tools (544, 545, 546, 547, 969, 970) is gated by the b1a action on resolving send_email AND sign_document "last". Since sign_document is blocked on B2-6, the DELETE cannot proceed without pre-empting that user decision. Legacy skill 59 and its 6 skill_tools remain UNCHANGED. (This leaves an F1 transitional condition open: a `domain_id`-only legacy system skill coexists with the new module-level skills; it resolves when B2-6 lands and skill 59 is deleted.)

No prior row values changed for skill 59 or row 547; nothing to snapshot for reversal (no DELETE/PATCH performed on them).

### B1A-CATALOG-UX-COPY - DONE (Rule #20 empty-field backfill)

All 4 target catalog UX fields were empty before this pass (verified). Wrote buyer-voice copy (workflow + value; no vendor/product names; no em-dashes; American English) straight into the empty fields per the revised Rule #20 / Rule #6 of the task; empty-guard applied per field (write only when empty); no non-empty value overwritten. Rows carry their existing `record_status` as the review signal.

PATCH `domains` #149 (prior values: `catalog_tagline=""`, `catalog_description=""`):
- catalog_tagline: "Keep every vehicle on the road and control what each mile costs to maintain."
- catalog_description: "Run your whole maintenance operation from one place. ... See cost per mile and uptime by vehicle so you know when to keep fixing and when to replace."

PATCH `domain_modules` #249 (prior: both ""):
- catalog_tagline: "Turn every defect, fault, and driver report into a tracked repair from intake to sign-off."
- catalog_description: shop-floor work-order intake (inspection/telematics/driver), labor+parts lines, mechanic/shop assignment, defect triage, completion sign-off + quality check.

PATCH `domain_modules` #250 (prior: both ""):
- catalog_tagline: "Service every vehicle on time by mileage, hours, or calendar, and let the work orders write themselves."
- catalog_description: PM plans per vehicle class with mileage/engine-hour/calendar/fault-code triggers, auto-generated work orders, deferred-maintenance tracking.

PATCH `domain_modules` #251 (prior: both ""):
- catalog_tagline: "Keep the right parts on hand and claim every warranty and recall dollar you are owed."
- catalog_description: parts stock + reorder points by location, consumption tied to work orders, OEM-warranty eligibility, recall ingestion + completion tracking across the fleet.

### Verification (re-queried)

- `/skills?domain_module_id=in.(249,250,251)&skill_type=eq.system` -> 3 rows (F2 pass: exactly one per module).
- `/skill_tools?skill_id=in.(291,292,293)` -> 7 rows; F4 invariant holds (query tools carry data_object_id; notify_person has data_object_id NULL); all `notes=""`.
- `/domains?id=eq.149` and `/domain_modules?id=in.(249,250,251)` -> all 4 catalog_tagline + catalog_description now non-empty.
- Legacy skill 59: still present with 6 skill_tools (unchanged), as expected.

### JWT errors

None.

### Files written

- `audits/FLEET-MAINT/history.md` (this append)
- `audits/FLEET-MAINT/state.yaml` (rewrite: B1A-CATALOG-UX-COPY removed/resolved; B1A-SYSTEM-SKILLS kept with remaining-scope narrowed to the B2-6-blocked sign_document + skill-59 DELETE; `last_audit` 2026-06-06; `next_action_by` recomputed)
- `.tmp_deploy/fleet_maint_b1a.ts` (idempotent loader)

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
