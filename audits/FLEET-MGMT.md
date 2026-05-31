---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 32
---

# FLEET-MGMT - Audit History

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- Current footprint: 5 master `data_objects` (`fleet_vehicles`, `fleet_drivers`, `fuel_transactions`, `fleet_assignments`, `vehicle_inspections`) + 1 contributor (`employees`, id 31, from HCM); 6 capabilities; 10 solutions (8 primary + 2 secondary); 4 `business_function_domains` rows (Logistics owner, Field Service Operations + GRC contributors, Accounting consumer); 0 `domain_modules` rows (M1 hard fail); 0 `domain_module_data_objects` rows (legacy `domain_data_objects` rollup only); 10 `trigger_events` on the 5 masters; 5 outbound + 6 inbound `handoffs` (all 11 carry NULL on both module FKs); 0 `data_object_relationships`; 0 `data_object_aliases`; 0 `data_object_lifecycle_states`; 0 `domain_regulations`; 1 legacy `domain_id`-scoped system skill (`fleet-mgmt-system`, id 60) with 7 `skill_tools` (5 platform `query_*`, `send_email` platform, `sign_document` external); 0 `handoff_processes` rows on any of the 11 handoffs.
- Vendor-surface basis: Samsara (Connected Operations Platform), Geotab (MyGeotab), Motive (Fleet Platform, formerly KeepTruckin), Verizon Connect (Reveal), Fleetio (pure-play fleet ops + maintenance specialist), AssetWorks FleetFocus (public-sector compliance specialist). Trimble, Webfleet, Omnitracs, Azuga also linked but not enumerated as flagships.
- **Bucket 1 (in-scope, agent fixable):** 17 items.
- **Bucket 2 (surface-for-user, judgment):** 8 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.
- Candidates queued via `append_missing_domain.ts`: TMS (Transportation Management System, mention bumped to 2), EV-CHARGING-MGMT (new), FREIGHT-AUDIT (new).

Structural pass: A passes except A4 (`catalog_tagline` + `catalog_description` both empty); M is a **hard fail** (zero `domain_modules`); B has wide gaps (zero relationships, zero aliases, zero lifecycle states, zero pattern-flag re-eval, NULL module FKs on every handoff, zero domain regulations despite a heavily regulated market); C passes; E vacuously skipped (no modules to wire roles against); F1 + F2 + F3 all fail (legacy domain-scoped system skill, no module-scoped skills, `send_email` channel-primitive linked without workflow-specific justification); H1 fails (0 of 11 cross-domain handoffs tagged). The domain Semantius score is uncomputable per-module (F5 rollup) because no module exists; the legacy skill itself reports 6 of 7 = 0.857 strict (the `sign_document` external tool drops it off 1.00) but the per-module rollup the score is designed for cannot be computed.

The entire audit downstream of the M-band gates on resolving the modularization gap first. Bucket 1 enumerates the fix items assuming the 3-module split in B2-1; if the user adopts a different split, every B-band and F-band fix needs the module assignment revisited.

### Vendor surface basis

- **Samsara** (samsara.com) - reference connected-operations vendor, broad surface: vehicle gateway, GPS, dashcam AI, ELD, driver-behavior scoring, asset tracking, fuel cards, charging integration, equipment monitoring. Public API docs (developers.samsara.com).
- **Geotab** (geotab.com) - data-first telematics + fleet-ops, MyGeotab API exposes vehicles, devices, trips, exception rules, fault data, fuel transactions, IOX add-ons, EV battery telemetry. Strong rule-engine + IOX hardware extensibility.
- **Motive** (gomotive.com, formerly KeepTruckin) - ELD-first vendor with the strongest US-specific FMCSA / HOS / IFTA / DVIR posture among the flagships; fuel monitoring, driver coaching, vehicle health.
- **Verizon Connect** (verizonconnect.com, Reveal product) - enterprise carrier-aligned: vehicle, driver, route, geofence, alerts, maintenance, scorecards.
- **Fleetio** (fleetio.com) - pure-play fleet ops + maintenance specialist; mid-market and SMB shape; strong on vehicle inventory lifecycle and parts/PO workflows.
- **AssetWorks FleetFocus** (assetworks.com) - public-sector / municipal-fleet compliance specialist, anchors FTA / GASB / state-DOT reporting workflows; includes motor-pool reservation and fuel-island integration.

Compliance basis: FMCSA Part 391 (driver qualification files), FMCSA Part 395 (HOS / ELD), FMCSA Part 396 (DVIR + maintenance records), IFTA (jurisdictional fuel tax), DOT-clearinghouse drug-and-alcohol queries, IRP (International Registration Plan / apportioned plates), GASB 87 (lease accounting for vehicles), SOX (fixed-asset controls). EU equivalents include EU Mobility Package (tachograph + posted-worker), ADR (dangerous-goods transport), and Eurovignette.

### Pass 3 - Neighbor discovery

Edges discovered from `handoffs` + `domain_data_objects` cross-references:

| Neighbor | Handoffs out | Handoffs in | DMDO / DDO deps | Weight | Boundary depth |
|---|---|---|---|---|---|
| TELEMATICS (148) | 1 (`fleet_vehicle.assigned` -> TELEMATICS) | 3 (`vehicle_trip.completed`, `driver_behavior_event.triggered`, `safety_scorecard.updated`) | 2 (TELEMATICS consumer on `fleet_vehicles` + `fleet_drivers`; reciprocal from FLEET-MGMT side: 0) | 6 | full (>=3) |
| FLEET-MAINT (149) | 2 (`fleet_vehicle.acquired`, `vehicle_inspection.failed`) | 1 (`maintenance_defect.reported`) | 1 (FLEET-MAINT consumer on `fleet_vehicles`) | 4 | full (>=3) |
| ERP-FIN (65) | 2 (`fuel_transaction.posted`, `fleet_vehicle.retired`) | 0 | 0 | 2 | summary only |
| FSM (31) | 0 | 2 (`vehicle.dispatched`, `service_work_order.assigned`) | 0 | 2 | summary only |
| HCM (54) | 0 | 0 | 1 (FLEET-MGMT contributor on `employees`, id 31; driver hire/separation events on HCM side) | 1 | summary only |

TELEMATICS (parent neighbor weight 6) and FLEET-MAINT (weight 4) both get the full pairwise pass below. ERP-FIN, FSM, HCM get one-line summaries.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 / M2 / M6 (hard) | Zero `domain_modules` rows exist for FLEET-MGMT. The domain has 6 capabilities and 5 mastered data_objects but ships no deployable units. Every downstream B, E, F band is blocked. The legacy `domain_data_objects` rollup carries the master rows but there is no modular layer to attribute permissions, system skills, or handoff FKs against. | Author the module set per the proposal in B2-1. Default: 3 full modules (`FLEET-VEHICLE-LIFECYCLE` covering vehicle inventory + assignments + retirement; `FLEET-DRIVER-OPS` covering drivers + inspections + assignment to driver; `FLEET-FUEL-COMPLIANCE` covering fuel transactions + IFTA + DOT compliance rollups). Load via the standard Phase A loader pattern. |
| B1-S2 | A4 | `domains.catalog_tagline` and `domains.catalog_description` both empty. | Draft buyer-voice copy per Rule #20 (workflow + value, NOT analyst voice). Surface to the user for review BEFORE writing. Recommended tagline shape: "Track every vehicle, driver, and fuel dollar across the fleet, with built-in DOT and IFTA compliance from day one." |
| B1-S3 | B4 (pattern flags) | All 5 masters have `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false` at the schema default; no positive re-evaluation recorded. `fleet_drivers` clearly carries personal data (license number, medical card, HOS status, drug-screen results); `vehicle_inspections` carries driver signatures + photos; `fleet_assignments` ties identified drivers to time-and-location data. `has_personal_content=true` is plausibly correct on at least `fleet_drivers`, `vehicle_inspections`, and `fleet_assignments`. | PATCH `has_personal_content=true` on rows 371, 374, 373 after user confirmation. The other two (`fleet_vehicles`, `fuel_transactions`) are arguably also personal-by-association via the driver linkage; surface as Bucket 2 #2. |
| B1-S4 | B6 | Zero intra-domain `data_object_relationships` rows. With 5 mastered entities forming a chain (vehicles + drivers compose assignments, assignments scope inspections, fuel transactions tie back to vehicles + drivers + assignments), the catalog is silent on every edge. | Author the 8-edge baseline below (B1-R1..R8) via a focused loader. |
| B1-S5 | B7 (users edges) | Zero edges from any FLEET-MGMT master to the `users` platform built-in. At minimum `fleet_drivers` (the user account behind the driver record), `vehicle_inspections` (inspector), `fleet_assignments` (dispatcher who created the assignment), `fuel_transactions` (driver who fueled), and `fleet_vehicles` (assigned_driver, primary_operator) need user-typed actor edges per Rule #10. | Author 5 `data_object_relationships` rows per Rule #10. See B1-U1..U5 below. |
| B1-S6 | B8 (outbound cross-domain rels) | Zero outbound cross-domain `data_object_relationships` rows. The 5 outbound `handoffs` (to TELEMATICS, FLEET-MAINT, ERP-FIN) each imply a payload->target relationship on the receiving domain's master where one exists. | Author the 3 outbound edges in B1-X1..X3 below. Inbound edges (FSM, TELEMATICS, FLEET-MAINT publishing into FLEET-MGMT) are report-only per B8 asymmetry. |
| B1-S7 | B9 / B9b | Trigger events on the 5 masters: 10 rows. All 10 published events have at least one `handoffs` row (B9 ticks). But B9b is non-skippable on a multi-module domain (which FLEET-MGMT will become once B1-S1 lands): every cross-module lifecycle progression needs an explicit intra-domain `handoffs` row. Once the 3-module split lands, at minimum `fleet_vehicle.assigned` (vehicle lifecycle -> driver ops), `fleet_driver.hired` -> vehicle eligibility, and `vehicle_inspection.failed` -> driver-ops side need intra-domain `handoffs` rows with `integration_pattern: lifecycle_progression`. | After B1-S1, author intra-domain handoffs per the module-pair derivation in the B9b query family. Estimated 4-6 rows. |
| B1-S8 | B10b (hard, audit-blocker) | All 11 handoffs touching FLEET-MGMT carry NULL on both `source_domain_module_id` and `target_domain_module_id`. The 6 outbound from FLEET-MGMT cannot resolve source side until B1-S1 lands. The 6 inbound have source-side NULLs owed by partner domains (FSM, TELEMATICS, FLEET-MAINT - the last two also have zero modules); target side cannot resolve until B1-S1 lands. | After modules land, run the standard B10b derivation: source side = the new FLEET-MGMT module that masters the trigger event's data_object (vehicle lifecycle, fuel, or driver ops). Target-side NULLs on outbounds toward FLEET-MAINT + TELEMATICS stay NULL until those domains modularize (report-only on their side). |
| B1-S9 | B11 | Zero `data_object_aliases` rows. Vendor lexicon usage: `fleet_vehicles` -> "Asset / Unit / Truck / Power Unit / Tractor", `fleet_drivers` -> "Operator / Driver / CDL Holder", `fuel_transactions` -> "Fuel Card Posting / Fueling Event / Charge Session (EV)", `fleet_assignments` -> "Vehicle Assignment / Dispatch / Driver Pairing", `vehicle_inspections` -> "DVIR / Pre-Trip Inspection / Walkaround". | Author 10-15 alias rows; bundle with the cluster-drafts loader. |
| B1-S10 | B12 (hard) | Zero `data_object_lifecycle_states` rows. Several masters carry workflow-bearing state: `fleet_vehicles` (`acquired -> in_service -> assigned -> maintenance -> retired -> sold`), `fleet_drivers` (`applicant -> qualified -> active -> on_leave -> separated`), `vehicle_inspections` (`scheduled -> in_progress -> passed | failed -> repair_completed`), `fleet_assignments` (`scheduled -> active -> completed -> cancelled`). `fuel_transactions` is append-only telemetry and qualifies for the config-shape exemption. | Draft state machines for the 4 workflow-bearing masters; surface the `fuel_transactions` config-shape exemption to the user without writing `data_objects.notes` (Rule #15). The hire/separate states on `fleet_drivers` need `requires_permission=true` + `permission_verb_override` (`active -> activate_driver`, `separated -> separate_driver`). |
| B1-S11 | F1 / F2 / F3 (legacy + missing modular skills) | A legacy domain-level system skill `fleet-mgmt-system` (id 60, `domain_id=147`, `domain_module_id=NULL`) exists with 7 `skill_tools`. Per F1 this must be retired once module-scoped skills exist. Per F2 each new module needs exactly one `<module_code_lower>_agent` system skill. Per F3 each needs >=1 `skill_tools` row. The current 7 tools span all 5 masters via `query_*` + `send_email` + `sign_document` - they will redistribute across the 3 modules per ownership. | After B1-S1, author 3 module-scoped system skills (`fleet_vehicle_lifecycle_agent`, `fleet_driver_ops_agent`, `fleet_fuel_compliance_agent`), redistribute the 5 existing `query_*` tools by mastered entity, author 4-6 new tools per module (create/update for masters, workflow gates like `retire_vehicle`, `pass_inspection`, `match_fuel_transaction`), and DELETE legacy skill 60. |
| B1-S12 | F (skill naming) | Legacy `fleet-mgmt-system` uses kebab + `-system` suffix; the catalog convention per Phase-S is snake + `_agent`. Folds into B1-S11. | Combined with S11. |
| B1-S13 | F7 (channel primitives) | Skill 60 links `send_email` (a channel primitive) with no `skill_tools.notes` justification. Per Rule (Channel vs capability) the workflow default is `notify_person` / `notify_team` so the deployment can substitute the channel without a per-skill rewrite. The fleet domain's email use is generic operational notification (inspection-due reminders, license-expiry alerts, fuel-exception alerts) and not channel-bound. | PATCH the `skill_tools` row pointing at `send_email` to point at `notify_person` instead, OR DELETE the row if the new module-scoped skills already link `notify_person`. Idempotency-safe per the F7 fix recipe. |
| B1-S14 | F4 (operation_kind invariant) | `sign_document` linked from skill 60: `operation_kind=side_effect`, `coverage_tier=external`, `data_object_id=null`. The invariant ticks (`side_effect` requires NULL `data_object_id`), so this is a positive sanity-check, not a violation. **Bigger question:** the fleet system needs `sign_document` for what workflow? Driver-license attestation, vehicle-purchase paperwork, lease docs? The link is suspect without an explicit workflow rationale and may be cargo-culted from another domain's loader. | Surface in Bucket 2 #5. If the workflow is real (driver onboarding paperwork, vehicle purchase agreements), the tool stays and gets redistributed in B1-S11 to the appropriate module's skill. If it's vestigial, DELETE the `skill_tools` row. |
| B1-S15 | Missing `domain_regulations` (C-band-adjacent gap) | Zero `domain_regulations` rows for FLEET-MGMT. The market is heavily regulated (FMCSA Parts 391/395/396, IFTA, DOT clearinghouse, GASB 87 for leased vehicles, SOX for fixed-asset controls). | Author 6-8 `domain_regulations` rows once the regulations table has the right `regulation_name` entries. Surface as a Bucket 1 fix the user approves; if any regulation rows are missing from `regulations`, that's an upstream load gap (separate fix). |

#### BOUNDARY findings per neighbor

| ID | Neighbor | Finding | Fix |
|---|---|---|---|
| B1-B1 | TELEMATICS | Existing outbound handoff 874 (`fleet_vehicle.assigned` -> TELEMATICS) and 3 inbound from TELEMATICS (rows 319, 321, 880) all carry NULL on both module FKs. TELEMATICS itself has zero `domain_modules`, so the inbound source side stays NULL pending TELEMATICS modularization. Outbound target side similarly. | Defer until both domains modularize. Report-only on TELEMATICS side; in-scope blocked by B1-S1 here. |
| B1-B2 | FLEET-MAINT | Outbound 875 (`fleet_vehicle.acquired`) + 313 (`vehicle_inspection.failed`) target FLEET-MAINT; 1 inbound 877 (`maintenance_defect.reported`). All 3 NULL on module FKs. FLEET-MAINT has zero modules. | Same shape as B1-B1. |
| B1-B3 | ERP-FIN | Outbound 317 (`fuel_transaction.posted`) + 876 (`fleet_vehicle.retired`) target ERP-FIN with NULL module FKs. ERP-FIN has its own modules (verify in a separate ERP-FIN audit). | Once B1-S1 lands, source-side FK resolves locally. Target-side patch needs the ERP-FIN modular layout (likely `ERP-FIN-AP` for fuel and `ERP-FIN-FIXED-ASSETS` for vehicle retirement). Surface as a report-only follow-up to ERP-FIN's audit. |
| B1-B4 | FSM | 2 inbound (318 `vehicle.dispatched`, 884 `service_work_order.assigned`). Handoff 884 carries `source_domain_module_id=161` (FSM has done partial modular attribution) but `target_domain_module_id=NULL` on the FLEET-MGMT side, awaiting B1-S1. Handoff 318 has both NULL. | Once B1-S1 lands, target-side patch on both rows. Report-only on FSM side for handoff 318's source NULL. |
| B1-B5 | HCM | No handoffs exist between FLEET-MGMT and HCM, but FLEET-MGMT is `contributor` on `employees` (id 31), meaning driver records pull from the HCM employee master. Driver-hire and driver-separation events likely originate on HCM's side (`employee.hired` -> driver activation, `employee.terminated` -> driver deactivation). | Surface to user (Bucket 2 #7). If the user wants the catalog to model this transition, the inbound handoffs are owed by HCM's B9; FLEET-MGMT side adds `consumer` DMDOs on the relevant module once B1-S1 lands. |

#### APQC TAGGING

11 cross-domain handoffs touch FLEET-MGMT (5 outbound + 6 inbound). 0 currently tagged in `handoff_processes`.

Proposed `agent_curated` tags (record_status defaults to `new`, proposal_source `agent_curated`):

| ID | handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
|---|---|---|---|---|---|---|---|
| B1-A1 | 875 | FLEET-MGMT -> FLEET-MAINT | `fleet_vehicle.acquired` | `fleet_vehicles` | Process and record fixed-asset additions and retires | 1389 | confident L4 |
| B1-A2 | 313 | FLEET-MGMT -> FLEET-MAINT | `vehicle_inspection.failed` | `vehicle_inspections` | Manage asset maintenance | 352 | confident L3 |
| B1-A3 | 317 | FLEET-MGMT -> ERP-FIN | `fuel_transaction.posted` | `fuel_transactions` | Process accounts payable (AP) | 315 | confident L3 |
| B1-A4 | 876 | FLEET-MGMT -> ERP-FIN | `fleet_vehicle.retired` | `fleet_vehicles` | Process and record fixed-asset additions and retires | 1389 | confident L4 |
| B1-A5 | 874 | FLEET-MGMT -> TELEMATICS | `fleet_vehicle.assigned` | `fleet_vehicles` | Manage transportation fleet | 862 | confident L4 |
| B1-A6 | 318 | FSM -> FLEET-MGMT | `vehicle.dispatched` | `fleet_assignments` | Manage transportation fleet | 862 | confident L4 |
| B1-A7 | 319 | TELEMATICS -> FLEET-MGMT | `driver_behavior_event.triggered` | `driver_behavior_events` | Manage transportation fleet | 862 | confident L4 |
| B1-A8 | 321 | TELEMATICS -> FLEET-MGMT | `vehicle_trip.completed` | `vehicle_trips` | Manage transportation fleet | 862 | confident L4 |
| B1-A9 | 877 | FLEET-MAINT -> FLEET-MGMT | `maintenance_defect.reported` | `maintenance_defects` | Manage asset maintenance | 352 | confident L3 |
| B1-A10 | 880 | TELEMATICS -> FLEET-MGMT | `safety_scorecard.updated` | `driver_safety_scorecards` | Manage transportation fleet | 862 | confident L4 |
| B1-A11 | 884 | FSM -> FLEET-MGMT | `service_work_order.assigned` | `service_work_orders` | Manage transportation fleet | 862 | confident L4 |

Tag volume: 11 confident new `agent_curated` proposals + 0 deferred. 11 of 11 handoffs accounted for; H1 coverage gate clears after the 11 inserts. Within the 0.5N-0.8N expected band (N=11, expecting 5-8 new tags), this audit is on the upper end because "Manage transportation fleet" (PCF 862) is a clean catch-all L4 for fleet-as-asset workflows.

Notable: handoffs to/from TELEMATICS that the TELEMATICS audit already proposed tags for (handoffs 874, 319, 321, 880) get re-confirmed here from the FLEET-MGMT side; the `(handoff_id, process_id)` natural key prevents duplicate inserts.

#### MISSING entities (compliance + workflow substrate)

| ID | Entity | Proposed module | Regulation / vendor evidence |
|---|---|---|---|
| B1-M1 | `driver_qualification_files` | FLEET-DRIVER-OPS | FMCSA Part 391 mandates a DQ file per driver: license verification, MVR, drug-test history, medical certificate, road-test certificate, application. 5/5 flagship vendors expose this; Motive and Samsara include FMCSA-clearinghouse query integration. |
| B1-M2 | `vehicle_registrations` | FLEET-VEHICLE-LIFECYCLE | DOT registration, IRP apportioned plates, state title and registration renewal cycles. Tracked separately from `fleet_vehicles` because a single vehicle has many registration records over its lifetime (renewal, state-of-registration changes, lease transitions). All 6 flagships expose this; AssetWorks specifically for public-sector compliance. |
| B1-M3 | `ifta_quarterly_returns` | FLEET-FUEL-COMPLIANCE | IFTA requires quarterly per-jurisdiction mile / fuel summaries filed by carrier; derived from `fuel_transactions` + telematics mileage. Geotab, Samsara, Motive, Verizon Connect all surface this; the data_object models the filed return (one row per carrier per quarter per jurisdiction set). |
| B1-M4 | `vehicle_insurance_policies` | FLEET-VEHICLE-LIFECYCLE | Per-vehicle insurance: policy number, carrier, premium, coverage limits, claims history, certificate-of-insurance docs. Tracked separately from `fleet_vehicles` because policy boundaries and certificates have their own lifecycle. Verizon Connect, Fleetio, AssetWorks all expose. |
| B1-M5 | `fuel_cards` | FLEET-FUEL-COMPLIANCE | Issued fuel card master (card number, assigned driver or vehicle, vendor, expiration, PIN, status). Distinct from `fuel_transactions` (which is per-charge). WEX, Comdata, Fleetcor card-management integrations on Samsara, Motive, Fleetio. |
| B1-M6 | `vehicle_telematics_devices` | FLEET-VEHICLE-LIFECYCLE | Per-vehicle device install record: device serial, install date, device firmware, removal date. Distinct from TELEMATICS-mastered trip / behavior data; this is the device asset record on the FLEET-MGMT side (who owns the box). 5/5 flagships expose. |
| B1-M7 | `driver_clearinghouse_queries` | FLEET-DRIVER-OPS | FMCSA Drug-and-Alcohol Clearinghouse: annual + pre-employment queries per driver, query receipt records, violation hits. Motive and Samsara include native Clearinghouse integration; regulator-mandated for CDL drivers. |
| B1-M8 | `motor_pool_reservations` | FLEET-DRIVER-OPS (or new sub-module) | Public-sector + corporate-fleet reservation workflow: who reserved which vehicle for what window. AssetWorks FleetFocus + Agile Fleet specialize here; common in municipal fleets and corporate motor pools. May be sub-feature of B2-1 module set or its own sub-module. |
| B1-M9 | `parking_violations` / `toll_assignments` | FLEET-FUEL-COMPLIANCE | Inbound feed from toll networks and parking enforcement: tickets attributed to vehicle, then re-attributed to driver via `fleet_assignments`. Fleetio, AssetWorks, Verizon Connect all expose. |

#### Intra-domain relationship edges (B6 fix, 8 baseline rows)

| ID | Edge | verb / inverse | cardinality | required | owner_side |
|---|---|---|---|---|---|
| B1-R1 | `fleet_vehicles` -> `fleet_assignments` | `assigned_via` / `assigns` | one_to_many | true | source |
| B1-R2 | `fleet_drivers` -> `fleet_assignments` | `operates_via` / `operated_by` | one_to_many | true | source |
| B1-R3 | `fleet_assignments` -> `vehicle_inspections` | `scopes` / `scoped_by` | one_to_many | false | source |
| B1-R4 | `fleet_vehicles` -> `vehicle_inspections` | `subject_of` / `inspects` | one_to_many | true | source |
| B1-R5 | `fleet_drivers` -> `vehicle_inspections` | `performs` / `performed_by` | one_to_many | true | source |
| B1-R6 | `fleet_vehicles` -> `fuel_transactions` | `fueled_via` / `fuels` | one_to_many | true | source |
| B1-R7 | `fleet_drivers` -> `fuel_transactions` | `charges` / `charged_by` | one_to_many | false | source |
| B1-R8 | `fleet_assignments` -> `fuel_transactions` | `attributes` / `attributed_via` | one_to_many | false | source |

#### Users-edge baseline (B7 fix, 5 rows)

| ID | Edge | verb |
|---|---|---|
| B1-U1 | `fleet_drivers` -> `users` | `represents` (driver record links to user account) |
| B1-U2 | `vehicle_inspections` -> `users` | `performed_by` (inspecting driver) |
| B1-U3 | `fleet_assignments` -> `users` | `dispatched_by` (dispatcher) |
| B1-U4 | `fuel_transactions` -> `users` | `fueled_by` (driver who swiped the card) |
| B1-U5 | `fleet_vehicles` -> `users` | `primary_operator` (default assigned driver, nullable) |

#### Cross-domain outbound relationship rows (B8 fix, 3 rows)

| ID | Edge | verb | cardinality |
|---|---|---|---|
| B1-X1 | `fleet_vehicles` -> `maintenance_work_orders` (FLEET-MAINT-mastered) | `triggers` | one_to_many |
| B1-X2 | `vehicle_inspections` -> `maintenance_work_orders` (FLEET-MAINT-mastered, when failed) | `escalates_to` | one_to_many |
| B1-X3 | `fuel_transactions` -> `ap_invoices` (ERP-FIN-mastered, when batched) | `posts_to` | many_to_one |

(Inbound mirrors are report-only per B8 asymmetry; they live on the source domains' B8 passes.)

### Bucket 2 - Surface-for-user (judgment calls)

1. **Module split shape (gates everything in Bucket 1).** Proposed: 3 full modules.
   - **`FLEET-VEHICLE-LIFECYCLE`** masters `fleet_vehicles`. Realizes capabilities `FLEET-VEHICLE-INVENTORY`, `FLEET-UTILIZATION`. Embedded-masters `fleet_drivers` (assigned), `vehicle_registrations`, `vehicle_insurance_policies`, `vehicle_telematics_devices`. The vehicle-as-asset module: acquisition, registration, insurance, telematics install, retirement.
   - **`FLEET-DRIVER-OPS`** masters `fleet_drivers`, `fleet_assignments`, `vehicle_inspections`. Realizes `FLEET-DRIVER-MGMT`, `FLEET-DISPATCH`. Embedded-masters `fleet_vehicles`, `driver_qualification_files`, `driver_clearinghouse_queries`, `motor_pool_reservations`. The driver-and-operations module: qualification, assignment, DVIR, dispatch.
   - **`FLEET-FUEL-COMPLIANCE`** masters `fuel_transactions`. Realizes `FLEET-FUEL-MGMT`, `FLEET-COMPLIANCE`. Embedded-masters `fuel_cards`, `ifta_quarterly_returns`, `parking_violations`, `vehicle_registrations` (for DOT compliance overlap). The cost + regulatory rollup module: fuel cards, IFTA, toll/parking attribution, DOT-clearinghouse reporting.
   Alternative: 2-module split (`FLEET-VEHICLE-OPS` merging lifecycle + driver-ops; `FLEET-FUEL-COMPLIANCE` standalone). 2 modules still satisfies Rule #14's >=2-module floor for the 6-capability domain. Recommended: 3 modules; the driver-ops scope is large enough to deserve its own module and matches Samsara / Motive's product-line split.
2. **Pattern-flag scope for `fleet_vehicles` + `fuel_transactions`.** Are these "personal content" by association to drivers? Options: (a) all 5 = true (privacy-strict reading aligned with GDPR/CCPA for any data tied to identifiable drivers), (b) only the 3 driver-attributed masters in B1-S3 = true, (c) all 5 = true except `fleet_vehicles` because vehicle data is not by itself personal (operational reading). Recommended: (a) for EU/CCPA-exposed buyers; document the reasoning out-of-band (Rule #15 forbids the notes write).
3. **`fleet_drivers` master overlap with HCM `employees`.** Two patterns are observable in the market: (a) drivers ARE employees, so HCM-master + FLEET-MGMT-embedded shell + FLEET-MGMT-mastered "driver_profile" carrying CDL/medical/HOS data (the Samsara model); (b) drivers are a distinct master at FLEET-MGMT level because they include contractors, owner-operators, and W-9 carriers who never sit in HCM (the Motive / Fleetio model). Currently FLEET-MGMT masters `fleet_drivers` AND is `contributor` on `employees` (id 31), which is the (b) pattern. Confirm intent? If (a), the embedded shell on HCM's master + a smaller `fleet_drivers` derivation is more correct. Recommended: keep (b); the contractor / owner-operator population in the US trucking market is non-trivial and that pattern is the dominant flagship-vendor model.
4. **`vehicle_inspections` scope and DVIR overlap with TELEMATICS audit's B1-M1.** The TELEMATICS audit 2026-05-30 surfaced `dvir_inspections` as a missing entity under `TELEMATICS-COMPLIANCE-SAFETY` and flagged collision with FLEET-MGMT's existing `vehicle_inspections`. Question: should `vehicle_inspections` cover both DVIR (driver-completed pre/post-trip) and PMI (mechanic-completed periodic) with a `kind` discriminator, OR split? Options: (a) split (FLEET-MGMT owns PMI, TELEMATICS adds DVIR), (b) keep unified at FLEET-MGMT with discriminator, (c) move all inspection workflows to TELEMATICS. Recommended: (b); the current name `vehicle_inspections` is general enough, and the data shape (vehicle + driver + checklist + defects + signature) is identical regardless of pre-trip vs PMI. The TELEMATICS audit can amend its B1-M1 accordingly.
5. **`sign_document` workflow rationale on legacy skill 60.** Why is `sign_document` linked? Driver-onboarding paperwork (W-4, I-9, CDL attestation), vehicle-purchase agreements, lease docs, or vestigial from a cargo-cult? Options: (a) keep, redistribute to FLEET-DRIVER-OPS skill for driver onboarding workflow, (b) keep, redistribute to FLEET-VEHICLE-LIFECYCLE for purchase/lease/title docs, (c) keep on both modules' skills (driver paperwork is genuinely a per-driver workflow; vehicle paperwork is per-acquisition), (d) DELETE as vestigial. Recommended: (c) if user confirms both workflows are real.
6. **Regulation set scope for B1-S15.** Which `regulations` rows should `domain_regulations` carry? Floor set: FMCSA Part 391, FMCSA Part 395, FMCSA Part 396, IFTA, IRP, FMCSA Drug-and-Alcohol Clearinghouse. Stretch set adds: GASB 87 (lease accounting), SOX (fixed-asset controls), EU Mobility Package, ADR (dangerous goods), Eurovignette. Which to load? Recommended: floor set as required; stretch as optional (`applicability='conditional'` on the junction). Verify each is already a row in `regulations`; if missing, surface as upstream gap.
7. **HCM <-> FLEET-MGMT driver-lifecycle handoffs.** Should the catalog model `employee.hired` -> `driver_activation` and `employee.terminated` -> `driver_separation` as cross-domain handoffs from HCM to FLEET-MGMT? Options: (a) yes, author the inbound `trigger_events` on HCM's `employees` master + 2 handoffs targeting FLEET-MGMT (owed by HCM's B9); FLEET-MGMT side adds the `consumer` DMDOs after B1-S1, (b) no, the driver-record creation is manual in fleet products and shouldn't be modeled as automatic, (c) only model the termination direction (HOS auto-deactivation on separation is regulator-relevant), not the hire direction. Recommended: (a). HCM B9 owes the outbound.
8. **`motor_pool_reservations` as separate module or feature.** Should B1-M8 be its own sub-module (`FLEET-MOTOR-POOL`, primarily for public-sector and corporate-fleet buyers) or just embedded inside `FLEET-DRIVER-OPS`? AssetWorks and Agile Fleet treat it as a discrete buyer journey; the broader flagships embed it. Options: (a) embed in `FLEET-DRIVER-OPS` (recommended for catalog parsimony), (b) split into its own module (matches AssetWorks shape but probably over-modularized for this catalog scale).

### Bucket 3 - Phase 0 pending (speculative; vendor-research vetting needed)

| ID | Candidate | Recommendation | Vendor knowledge basis |
|---|---|---|---|
| B3-1 | **TMS** (candidate new domain, mention bumped to 2 via append helper) - Transportation Management System | Phase 0 vendor research (Manhattan TMS, Oracle OTM, SAP TM, Blue Yonder TMS, MercuryGate, Alvys, McLeod LoadMaster, project44). Already queued. | Multiple FLEET-MGMT outbound and inbound handoffs blur into load planning / carrier selection / freight rating territory that flagship vendors split between fleet-ops and TMS. Specifically `fleet_assignments` looks more like a sub-feature of TMS (load-to-truck pairing) than a fleet-ops primitive. |
| B3-2 | **EV-CHARGING-MGMT** (candidate new domain, newly queued) - EV Charging Infrastructure Management | Phase 0 vendor research (ChargePoint Fleet, Geotab EV Suite, Samsara EV Charging, Driivz, Sparkion, AMPECO). | As EV adoption accelerates, depot energy management + charge-session economics becomes a distinct buyer market separate from generic fuel management. Samsara and Geotab already split this in their product lines. |
| B3-3 | **FREIGHT-AUDIT** (candidate new domain, newly queued) - Freight Audit and Payment | Phase 0 vendor research (Cass Information Systems, U.S. Bank Freight Payment, A3 Freight Payment, Trax Technologies, Transporeon). | The `fuel_transaction.posted` -> ERP-FIN handoff is one side of a broader freight-bill-audit workflow that's a distinct buyer concern (validating carrier invoices, GL coding by lane, dispute mgmt). Cass + U.S. Bank are pure-plays. |
| B3-4 | `vehicle_telematics_devices` as a master in TELEMATICS instead of FLEET-MGMT | Eyeball decision: depends on whether device asset ownership sits on the operations side (FLEET-MGMT owns the hardware) or the data side (TELEMATICS owns the device because it produces the telemetry). Recommended: FLEET-MGMT (matches B1-M6). | Samsara documents devices in both surfaces. |
| B3-5 | `driver_messages` / driver-app messaging | Phase 0; possible scope-creep into a TMS candidate or its own communications layer | Samsara, Motive, Verizon Connect all surface driver-dispatch chat + safety nudge messaging. May not belong in FLEET-MGMT proper. |
| B3-6 | `accidents` / `incident_reports` master | Phase 0; verify whether this is a FLEET-MGMT entity or routes to TELEMATICS (dashcam-triggered) + INS-CLAIMS | Lytx, Samsara, Verizon Connect all formalize collision/incident workflows that join dashcam evidence, driver behavior, and FNOL to insurance. Ownership unclear in cross-vendor landscape. |
| B3-7 | `vehicle_lease_agreements` as separate master vs `vehicle_insurance_policies` shape (B1-M4) | Eyeball decision; lease lifecycle is distinct from insurance | Element Fleet, LeasePlan, ARI / Holman all surface this; in lease-back commercial-fleet scenarios it's a major workflow. |

### Cross-bucket dependencies

- **B1-S1 (module split) gates everything in B-band, F-band, and BOUNDARY findings.** Until Bucket 2 #1 resolves, none of B1-S4..S14 can be loaded with the right module FK assignments.
- **Bucket 2 #3 (`fleet_drivers` master shape) gates B1-M1 + B1-M7 module placement.** If the user picks (a) pattern, `driver_qualification_files` and `driver_clearinghouse_queries` are embedded on HCM's `employees` instead.
- **Bucket 2 #4 (`vehicle_inspections` DVIR overlap) intersects with the TELEMATICS audit 2026-05-30 Bucket 2 #3.** Coordinated decision; resolving here cascades into TELEMATICS' B1-M1.
- **Bucket 2 #7 (HCM <-> FLEET-MGMT driver-lifecycle handoffs) gates new inbound handoffs from HCM.** Authoring is owed by HCM B9; nothing to load from this audit's side beyond the `consumer` DMDOs after B1-S1.
- **Bucket 3 #1 (TMS), #3 (FREIGHT-AUDIT) intersect with Bucket 2 #1 module split.** If TMS / FREIGHT-AUDIT become separate domains, some of B1-A3 (fuel posting to AP) routes to FREIGHT-AUDIT instead, and B1-A6 + A11 (FSM dispatch) routes through a TMS module instead. Vetted Phase 0 routes change.
- **Bucket 3 #2 (EV-CHARGING-MGMT) intersects with B1-M5 (`fuel_cards`).** If EV-CHARGING-MGMT lands, charge-session-card workflows split out, and `fuel_cards` either stays generic with a `fuel_type` discriminator (ICE / EV / hybrid) or splits into `fuel_cards` + `charging_session_credentials`.
- **Buckets 2 and 3 are otherwise independent of each other; the user can resolve them in any order.**

### Per-bucket prompts

After the gap report is surfaced, the orchestrator should prompt the user with the following per-bucket asks:

- **Bucket 1:** "17 in-scope items. Approve all, approve some (name the IDs), or skip? Note that S3..S14 + R-, U-, X-, A-, M-, B-subgroups all depend on Bucket 2 #1 resolving the module split first."
- **Bucket 2:** "8 judgment items. Please answer each in turn: (1) module split shape, (2) pattern-flag scope, (3) drivers-vs-employees master pattern, (4) vehicle_inspections DVIR overlap with TELEMATICS, (5) sign_document workflow rationale, (6) regulation set scope, (7) HCM driver-lifecycle handoffs, (8) motor-pool reservations as module-or-feature."
- **Bucket 3:** "7 speculative candidates. Three already queued via append_missing_domain.ts (TMS, EV-CHARGING-MGMT, FREIGHT-AUDIT). Vet via Phase 0 research (recommended for TMS specifically since it's likely a real adjacent domain), or eyeball-mode (name which to treat as confirmed)?"

### Report-only follow-ups (owed by other domains)

- **TELEMATICS (148) M1 owes:** TELEMATICS itself has zero `domain_modules` per its own 2026-05-30 audit. All 4 cross-edges between TELEMATICS and FLEET-MGMT (1 outbound + 3 inbound for this domain) will keep their TELEMATICS-side module FK NULL until TELEMATICS modularizes per its B1-S1.
- **FLEET-MAINT (149) M1 owes:** FLEET-MAINT has zero `domain_modules`. Both outbound from FLEET-MGMT and 1 inbound stay NULL on the FLEET-MAINT-side module FK until it modularizes. Schedule a FLEET-MAINT Validate b1 pass to clear this.
- **ERP-FIN (65) B10b owes:** target-side module FKs on outbound handoffs 317 (`fuel_transaction.posted` -> ERP-FIN-AP) and 876 (`fleet_vehicle.retired` -> ERP-FIN-FIXED-ASSETS) cannot resolve until ERP-FIN's audit confirms its modular layout. Report-only on ERP-FIN side.
- **FSM (31) B10b owes:** handoff 318 (`vehicle.dispatched` -> FLEET-MGMT) has source-side module FK NULL on FSM's side. Handoff 884 already carries `source_domain_module_id=161` so FSM's side is partially clean. Report-only on FSM side for handoff 318.
- **HCM (54) B9 owes (potential):** if Bucket 2 #7 resolves "yes", HCM owes 2 new outbound handoffs (`employee.hired` and `employee.terminated`) targeting FLEET-MGMT for driver activation / separation. The FLEET-MGMT side adds `consumer` DMDOs on the relevant module post-B1-S1; the outbound trigger_events + handoffs themselves are HCM's load.
- **TELEMATICS B8 owes (inbound mirror):** the 3 inbound from TELEMATICS to FLEET-MGMT each imply a TELEMATICS-side outbound `data_object_relationships` row that lives on TELEMATICS' own B8 pass (the TELEMATICS 2026-05-30 audit already enumerates B1-X1..X3 covering these).
- **FLEET-MAINT B8 owes (inbound mirror):** the 1 inbound from FLEET-MAINT (`maintenance_defect.reported`) implies a FLEET-MAINT-side relationship row from `maintenance_defects` to the FLEET-MGMT-mastered subject. Lives on FLEET-MAINT's own B8 once that domain is audited.
- **FSM B8 owes (inbound mirror):** the 2 inbound from FSM (`vehicle.dispatched`, `service_work_order.assigned`) imply FSM-side outbound relationship rows. Lives on FSM's B8.

## 2026-05-31, Continuation: B1 technical fixes

Applied the truly-technical B1 slice of the 2026-05-30 audit via `.tmp_deploy/fix_fleet_mgmt_b1_technical_2026_05_31.ts`. 10 rows inserted, 0 skipped.

### Applied

- **B1-A1..A11** - APQC tagging via `handoff_processes`. 11 handoffs total; 6 already carried PCF 862 ("Manage transportation fleet") from the TELEMATICS / FSM audits (A5, A6, A7, A8, A10, A11). 5 net-new inserts:
  - A1: handoff 875 (`fleet_vehicle.acquired` -> FLEET-MAINT) -> PCF 1389 ("Process and record fixed-asset additions and retires"), new row id 827.
  - A2: handoff 313 (`vehicle_inspection.failed` -> FLEET-MAINT) -> PCF 352 ("Manage asset maintenance"), new row id 828.
  - A3: handoff 317 (`fuel_transaction.posted` -> ERP-FIN) -> PCF 315 ("Process accounts payable (AP)"), new row id 829.
  - A4: handoff 876 (`fleet_vehicle.retired` -> ERP-FIN) -> PCF 1389, new row id 830.
  - A9: handoff 877 (`maintenance_defect.reported` FLEET-MAINT -> FLEET-MGMT) -> PCF 352, new row id 831.
  - All 5 written with `proposal_source='agent_curated'`, `record_status='new'` (default), `role='implements'` (default). H1 coverage gate now ticks for the 11 cross-domain handoffs touching FLEET-MGMT.

- **B1-U1..U5** - users-edges per Rule #10 via `data_object_relationships`. All 5 audit-pre-specified rows inserted (none existed):
  - U1: `fleet_drivers` (371) represents `users` (748). `one_to_one`, `reference`, `owner_side=source`, `is_required=false`, new row id 1942.
  - U2: `vehicle_inspections` (374) performed by `users`. `many_to_many`, `reference`, `is_required=true`, new row id 1943.
  - U3: `fleet_assignments` (373) dispatched by `users`. `many_to_many`, `reference`, `is_required=true`, new row id 1944.
  - U4: `fuel_transactions` (372) fueled by `users`. `many_to_many`, `reference`, `is_required=false`, new row id 1945.
  - U5: `fleet_vehicles` (370) primary operator `users`. `many_to_many`, `reference`, `is_required=false`, new row id 1946.
  - Verbs normalized to the active / passive space-separated convention seen on existing `users`-edges in the catalog ("owned by" / "owns", "created by" / "creates").

### Deferred (still owed by future passes)

- **B1-S1** - 3-module split (`FLEET-VEHICLE-LIFECYCLE`, `FLEET-DRIVER-OPS`, `FLEET-FUEL-COMPLIANCE`). Bucket 2 #1 judgment call; gates B1-S7, S8, S11, S12 + all BOUNDARY findings.
- **B1-S2** - `catalog_tagline` + `catalog_description`. Rule #20 buyer-voice authoring; surface for user wording.
- **B1-S3** - pattern flag flips on `fleet_drivers` / `vehicle_inspections` / `fleet_assignments`. Pattern-flag flips deferred per task scope; Bucket 2 #2 scope (vehicles + fuel as personal-by-association) is judgment.
- **B1-S4** - intra-domain `data_object_relationships` R1-R8. Task scope limits B7 fixes to users-edges only; R-edges left for a future pass paired with the cluster-drafts loader.
- **B1-S6** - cross-domain outbound rels X1-X3. Same scope limit; mirrors handoffs that themselves still have NULL module FKs.
- **B1-S7, B1-S8, B1-B1..B5** - intra-domain handoffs + B10b module-FK PATCHes. All gated on B1-S1; no FLEET-MGMT module exists to PATCH against.
- **B1-S9** - `data_object_aliases`. Audit enumerates vendor lexicon options ("Asset / Unit / Truck / Power Unit / Tractor", etc.) but not as exact `(data_object_id, alias_name)` tuples; bulk alias loads need user picks per option.
- **B1-S10** - `data_object_lifecycle_states` + `permission_verb_override` for `active`/`separated` on `fleet_drivers`. The audit names the override target states, but the underlying lifecycle-state rows don't exist yet, can't PATCH an override on a non-existent state row. Author the states first (Phase B work, deferred).
- **B1-S11..S14** - skill restructure (3 module-scoped system skills, redistribute 7 existing tools, retire legacy skill 60), `send_email` -> `notify_person` channel substitution, `sign_document` rationale. All gated on B1-S1 (need the new modules to attach skills to) or on Bucket 2 judgment.
- **B1-S15** - `domain_regulations` floor set (FMCSA Part 391/395/396, IFTA, IRP, FMCSA Drug-and-Alcohol Clearinghouse). VERIFIED LIVE: zero of the 5 base regulations checked (`FMCSA Part 391`, `FMCSA Part 395`, `FMCSA Part 396`, `IFTA`, `IRP`) exist in the `regulations` table. Cannot author junction rows pointing at non-existent regulations; this is an upstream load gap (separate fix, owed by a transportation-regulations seed). Surface to user.
- **B1-M1..M9** - missing entities (`driver_qualification_files`, `vehicle_registrations`, `ifta_quarterly_returns`, `vehicle_insurance_policies`, `fuel_cards`, `vehicle_telematics_devices`, `driver_clearinghouse_queries`, `motor_pool_reservations`, `parking_violations` / `toll_assignments`). New-entity authoring deferred per task scope; some are also gated on Bucket 2 #3 (drivers-vs-employees pattern) and Bucket 2 #8 (motor-pool as module-or-feature).

### Net B1 progress

- 56 B1 items in the original audit (15 S + 5 B + 11 A + 9 M + 8 R + 5 U + 3 X).
- 10 applied this pass (5 A + 5 U).
- 46 deferred to module-split-resolution, user-judgment, upstream load gaps, or future Phase-B work. None of the deferrals are silent: each is enumerated above with the reason it cannot land in a technical-only pass.
