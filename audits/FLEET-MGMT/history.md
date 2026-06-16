# FLEET-MGMT audit history

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
| FIN (65) | 2 (`fuel_transaction.posted`, `fleet_vehicle.retired`) | 0 | 0 | 2 | summary only |
| FSM (31) | 0 | 2 (`vehicle.dispatched`, `service_work_order.assigned`) | 0 | 2 | summary only |
| HCM (54) | 0 | 0 | 1 (FLEET-MGMT contributor on `employees`, id 31; driver hire/separation events on HCM side) | 1 | summary only |

TELEMATICS (parent neighbor weight 6) and FLEET-MAINT (weight 4) both get the full pairwise pass below. FIN, FSM, HCM get one-line summaries.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 / M2 / M6 (hard) | Zero `domain_modules` rows exist for FLEET-MGMT. The domain has 6 capabilities and 5 mastered data_objects but ships no deployable units. Every downstream B, E, F band is blocked. The legacy `domain_data_objects` rollup carries the master rows but there is no modular layer to attribute permissions, system skills, or handoff FKs against. | Author the module set per the proposal in B2-1. Default: 3 full modules (`FLEET-VEHICLE-LIFECYCLE` covering vehicle inventory + assignments + retirement; `FLEET-DRIVER-OPS` covering drivers + inspections + assignment to driver; `FLEET-FUEL-COMPLIANCE` covering fuel transactions + IFTA + DOT compliance rollups). Load via the standard Phase A loader pattern. |
| B1-S2 | A4 | `domains.catalog_tagline` and `domains.catalog_description` both empty. | Draft buyer-voice copy per Rule #20 (workflow + value, NOT analyst voice). Surface to the user for review BEFORE writing. Recommended tagline shape: "Track every vehicle, driver, and fuel dollar across the fleet, with built-in DOT and IFTA compliance from day one." |
| B1-S3 | B4 (pattern flags) | All 5 masters have `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false` at the schema default; no positive re-evaluation recorded. `fleet_drivers` clearly carries personal data (license number, medical card, HOS status, drug-screen results); `vehicle_inspections` carries driver signatures + photos; `fleet_assignments` ties identified drivers to time-and-location data. `has_personal_content=true` is plausibly correct on at least `fleet_drivers`, `vehicle_inspections`, and `fleet_assignments`. | PATCH `has_personal_content=true` on rows 371, 374, 373 after user confirmation. The other two (`fleet_vehicles`, `fuel_transactions`) are arguably also personal-by-association via the driver linkage; surface as Bucket 2 #2. |
| B1-S4 | B6 | Zero intra-domain `data_object_relationships` rows. With 5 mastered entities forming a chain (vehicles + drivers compose assignments, assignments scope inspections, fuel transactions tie back to vehicles + drivers + assignments), the catalog is silent on every edge. | Author the 8-edge baseline below (B1-R1..R8) via a focused loader. |
| B1-S5 | B7 (users edges) | Zero edges from any FLEET-MGMT master to the `users` platform built-in. At minimum `fleet_drivers` (the user account behind the driver record), `vehicle_inspections` (inspector), `fleet_assignments` (dispatcher who created the assignment), `fuel_transactions` (driver who fueled), and `fleet_vehicles` (assigned_driver, primary_operator) need user-typed actor edges per Rule #10. | Author 5 `data_object_relationships` rows per Rule #10. See B1-U1..U5 below. |
| B1-S6 | B8 (outbound cross-domain rels) | Zero outbound cross-domain `data_object_relationships` rows. The 5 outbound `handoffs` (to TELEMATICS, FLEET-MAINT, FIN) each imply a payload->target relationship on the receiving domain's master where one exists. | Author the 3 outbound edges in B1-X1..X3 below. Inbound edges (FSM, TELEMATICS, FLEET-MAINT publishing into FLEET-MGMT) are report-only per B8 asymmetry. |
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
| B1-B3 | FIN | Outbound 317 (`fuel_transaction.posted`) + 876 (`fleet_vehicle.retired`) target FIN with NULL module FKs. FIN has its own modules (verify in a separate FIN audit). | Once B1-S1 lands, source-side FK resolves locally. Target-side patch needs the FIN modular layout (likely `FIN-AP` for fuel and `FIN-FIXED-ASSETS` for vehicle retirement). Surface as a report-only follow-up to FIN's audit. |
| B1-B4 | FSM | 2 inbound (318 `vehicle.dispatched`, 884 `service_work_order.assigned`). Handoff 884 carries `source_domain_module_id=161` (FSM has done partial modular attribution) but `target_domain_module_id=NULL` on the FLEET-MGMT side, awaiting B1-S1. Handoff 318 has both NULL. | Once B1-S1 lands, target-side patch on both rows. Report-only on FSM side for handoff 318's source NULL. |
| B1-B5 | HCM | No handoffs exist between FLEET-MGMT and HCM, but FLEET-MGMT is `contributor` on `employees` (id 31), meaning driver records pull from the HCM employee master. Driver-hire and driver-separation events likely originate on HCM's side (`employee.hired` -> driver activation, `employee.terminated` -> driver deactivation). | Surface to user (Bucket 2 #7). If the user wants the catalog to model this transition, the inbound handoffs are owed by HCM's B9; FLEET-MGMT side adds `consumer` DMDOs on the relevant module once B1-S1 lands. |

#### APQC TAGGING

11 cross-domain handoffs touch FLEET-MGMT (5 outbound + 6 inbound). 0 currently tagged in `handoff_processes`.

Proposed `agent_curated` tags (record_status defaults to `new`, proposal_source `agent_curated`):

| ID | handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
|---|---|---|---|---|---|---|---|
| B1-A1 | 875 | FLEET-MGMT -> FLEET-MAINT | `fleet_vehicle.acquired` | `fleet_vehicles` | Process and record fixed-asset additions and retires | 1389 | confident L4 |
| B1-A2 | 313 | FLEET-MGMT -> FLEET-MAINT | `vehicle_inspection.failed` | `vehicle_inspections` | Manage asset maintenance | 352 | confident L3 |
| B1-A3 | 317 | FLEET-MGMT -> FIN | `fuel_transaction.posted` | `fuel_transactions` | Process accounts payable (AP) | 315 | confident L3 |
| B1-A4 | 876 | FLEET-MGMT -> FIN | `fleet_vehicle.retired` | `fleet_vehicles` | Process and record fixed-asset additions and retires | 1389 | confident L4 |
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
| B1-X3 | `fuel_transactions` -> `ap_invoices` (FIN-mastered, when batched) | `posts_to` | many_to_one |

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
| B3-3 | **FREIGHT-AUDIT** (candidate new domain, newly queued) - Freight Audit and Payment | Phase 0 vendor research (Cass Information Systems, U.S. Bank Freight Payment, A3 Freight Payment, Trax Technologies, Transporeon). | The `fuel_transaction.posted` -> FIN handoff is one side of a broader freight-bill-audit workflow that's a distinct buyer concern (validating carrier invoices, GL coding by lane, dispute mgmt). Cass + U.S. Bank are pure-plays. |
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
- **FIN (65) B10b owes:** target-side module FKs on outbound handoffs 317 (`fuel_transaction.posted` -> FIN-AP) and 876 (`fleet_vehicle.retired` -> FIN-FIXED-ASSETS) cannot resolve until FIN's audit confirms its modular layout. Report-only on FIN side.
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
  - A3: handoff 317 (`fuel_transaction.posted` -> FIN) -> PCF 315 ("Process accounts payable (AP)"), new row id 829.
  - A4: handoff 876 (`fleet_vehicle.retired` -> FIN) -> PCF 1389, new row id 830.
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

## 2026-05-31, Audit

### Summary

- Structural Validate b1 pass over A / M / B (B5,B7,B9,B9b,B10b,B11,B12) / C / D / E (E1-E5) / F (F1-F5) / H bands. No subagent market-surface pass this run; the 2026-05-30 Bucket 3 candidates carry forward unchanged.
- Current footprint (live re-pull): 5 master `data_objects` (`fleet_vehicles` 370, `fleet_drivers` 371, `fuel_transactions` 372, `fleet_assignments` 373, `vehicle_inspections` 374) + 1 contributor (`employees` 31 from HCM); 6 capabilities (FLEET-VEHICLE-INVENTORY, FLEET-DRIVER-MGMT, FLEET-FUEL-MGMT, FLEET-DISPATCH, FLEET-UTILIZATION, FLEET-COMPLIANCE); 10 solutions (8 primary, 2 secondary); 4 `business_function_domains` rows (Logistics owner, Field Service Operations + GRC contributors, Accounting consumer); **0 `domain_modules` rows**; 0 `domain_module_host_domains` rows; 0 `domain_module_data_objects` rows; 10 `trigger_events` on the 5 masters; 11 `handoffs` (5 outbound + 6 inbound), all 11 still NULL on `target_domain_module_id`, 9 NULL on `source_domain_module_id` (2 FSM inbounds carry `source_domain_module_id=161`); 5 `data_object_relationships` (the 2026-05-31 users-edges U1-U5, rows 1942-1946); 0 `data_object_aliases`; 0 `data_object_lifecycle_states`; 0 `domain_regulations`; 1 legacy `domain_id`-scoped system skill (`fleet-mgmt-system` id 60) with 7 `skill_tools` (5 `query_*`, `send_email`, `sign_document`); 11/11 cross-domain handoffs tagged in `handoff_processes` (all `agent_curated`, all `record_status=new`).
- Bucket 1 (in-scope, agent fixable): 0 items. Every previously-identified b1a item is either already applied (5 APQC + 5 users-edges in the 2026-05-31 Continuation) or gated by a Bucket 2 user-judgment item (the 3-module split decision) or by an upstream load gap (`regulations` table missing 5 FMCSA / IFTA / IRP rows). No agent-solvable work remains in this audit; everything pending is b1b, b2, or b3.
- Bucket 2 (surface-for-user, judgment): 8 items carry forward from 2026-05-30, 3 new items this audit (event-category enum violation, catalog copy under Rule #20, alias picks per master), 11 total; none answered yet.
- Bucket 3 (Phase 0 pending, speculative): 7 items carry forward from 2026-05-30.
- `next_action_by`: user. The blocking decision is Bucket 2 #1 (module split shape). Until that resolves, every B-band module-FK fix, every F-band module-scoped-skill restructure, every BOUNDARY module-FK patch on the FLEET-MGMT side, and the lifecycle states + intra-domain handoffs remain blocked.

### Band-by-band findings

| Band | Verdict | Detail |
|---|---|---|
| **A1-A3** (core metadata) | pass | `domain_code`, `domain_name`, `description`, `crud_percentage=75`, `business_logic`, `min_org_size=10 xs <50`, `cost_band=$$`, `certification_required=false`, `usa_market_size_usd_m=4500`, `market_size_source_year=2024` all populated. `record_status=new` per Rule #1. |
| **A4** (catalog copy) | fail | `catalog_tagline=""`, `catalog_description=""`. Authoring blocked on Rule #20 (no `catalog_*` writes without user-approved buyer-voice text). b2-CATALOG-COPY. |
| **M1 / M2 / M6** (modules) | hard fail | 0 `domain_modules` rows; 0 cross-host rows. Rule #14 floor unmet for a 6-capability domain (requires >=2 full modules). Gates B-band, E-band, F-band, and BOUNDARY module-FK fixes. b1b-MODULES-PENDING (blocked on b2-MODULE-SPLIT user decision). |
| **B5** (multi-master) | pass | No other domain masters any of the 5 FLEET-MGMT data_objects. Clean. |
| **B7** (users edges, Rule #10) | pass | 5/5 audit-pre-specified user-typed edges present (rows 1942-1946) covering `fleet_drivers`, `vehicle_inspections`, `fleet_assignments`, `fuel_transactions`, `fleet_vehicles`. Tick. |
| **B9** (trigger events tied to handoffs) | partial | 10 events, 10 covered by `handoffs` (5 outbound + via 5 inbound on neighbor events). But 5 events (ids 985, 986, 987, 988, 989, 990) carry `event_category=""` (empty string) instead of one of `lifecycle` / `state_change` / `threshold` / `signal`. Rule #13 enum violation. b1a-EVENT-CATEGORIES would normally be agent-solvable, however the correct category per event is a judgment call (acquired/assigned/reassigned/retired are lifecycle vs state_change boundary cases). Routed to b2 as judgment-with-recommendation. |
| **B9b** (cross-module intra-domain handoffs) | vacuous | Skipped: no modules to derive intra-domain handoffs against. Blocked on b1b-MODULES-PENDING. |
| **B10b** (handoff module FKs) | hard fail | All 11 handoffs touching FLEET-MGMT carry NULL on the FLEET-MGMT-side `target_domain_module_id` (6 inbound) or `source_domain_module_id` (5 outbound). On the partner side: TELEMATICS (148) has zero modules so 4 cross-edges stay NULL on TELEMATICS side; FLEET-MAINT (149) has zero modules so 3 cross-edges stay NULL on FLEET-MAINT side; FSM (31) partially populated (2 inbound carry `source_domain_module_id=161`); FIN (65) module shape unknown to this audit. b1b-HANDOFF-MODULE-FKS (blocked on b1b-MODULES-PENDING + the 2 partner-domain module audits). |
| **B11** (aliases) | fail | 0 `data_object_aliases` rows. Vendor-lexicon enumeration available in 2026-05-30 audit S9 (Asset / Unit / Truck / Power Unit / Tractor, etc.) but bulk alias loads need user picks per option per master. b2-ALIASES (judgment: which lexicon options to load). |
| **B12** (lifecycle states + pattern flags) | hard fail | 0 `data_object_lifecycle_states` rows on the 4 workflow-bearing masters. 4 of 5 masters carry default-false pattern flags despite plausible `has_personal_content=true` candidacy (`fleet_drivers`, `vehicle_inspections`, `fleet_assignments` at minimum; `fleet_vehicles` and `fuel_transactions` by association under GDPR/CCPA-strict reading). `fuel_transactions` is config-shape-exempt per Rule #12 (append-only telemetry). b1b-LIFECYCLE-STATES (state authoring depends on module split for `domain_module_id` per Rule #14's permission-materialization scoping); b2-PATTERN-FLAGS (judgment on personal-content scope). |
| **C** (commerce) | pass | 10 solutions covering FLEET-MGMT (8 primary, 2 secondary). Solutions / vendors layer populated. `domain_regulations` is 0 but routed to b1b-REGULATIONS-UPSTREAM since 5 floor regulations are missing from `regulations` (verified live: zero of `FMCSA Part 391`, `FMCSA Part 395`, `FMCSA Part 396`, `IFTA`, `IRP` present). |
| **D** (business functions) | pass | 4 `business_function_domains` rows: Logistics (owner), Field Service Operations (contributor), Governance Risk and Compliance (contributor), Accounting (consumer). Shape matches a cross-industry operational domain. |
| **E1-E5** (roles / permissions) | vacuous | No modules to attach roles or permissions to. Blocked on b1b-MODULES-PENDING. |
| **F1** (legacy domain-scoped skills retired) | fail | `fleet-mgmt-system` skill id 60 still present at `domain_id=147, domain_module_id=NULL`. Per F1 must be retired once module-scoped skills exist; can't be retired before modules exist. b1b-LEGACY-SKILL (blocked on b1b-MODULES-PENDING). |
| **F2** (one system skill per module) | vacuous | No modules. Blocked on b1b-MODULES-PENDING. |
| **F3** (>=1 `skill_tools` per system skill) | n/a | Legacy skill 60 has 7 `skill_tools`; new module-scoped skills will inherit the 5 `query_*` tools after redistribution. |
| **F4** (operation_kind invariants) | pass | All 7 legacy `skill_tools` invariants tick: 5 `query` ops have `data_object_id` set; 2 `side_effect` ops (`send_email`, `sign_document`) have `data_object_id=NULL`. |
| **F5** (Semantius score) | n/a | Uncomputable per-module rollup until modules exist. Legacy skill 60 strict score = 6/7 = 0.857 (the `sign_document` external tool drops it off 1.00); not the metric the rollup is designed for. |
| **F7** (channel primitives) | fail | `send_email` (a channel primitive) is linked to legacy skill 60 without per-skill workflow rationale. Substitution to `notify_person` is the standard fix and will fold into the F1 + F2 restructure once modules exist. b1b-CHANNEL-PRIMITIVE (blocked on b1b-MODULES-PENDING). |
| **H1** (APQC tagging coverage) | pass | 11/11 cross-domain handoffs carry a `handoff_processes` row (100% coverage). All `proposal_source=agent_curated`, all `record_status=new`. Side-bar metric: 0/11 approved (reviewer signoff pending). The 6 inbound-mirror rows (handoffs 318, 319, 321, 880, 884, 874) were created by neighbor-domain audits; the 5 net-new agent_curated rows (827-831) from the 2026-05-31 Continuation cover the 5 outbound + 1 inbound (handoff 877). Quality headline: 0 approved. |

### Bucket 1, In-scope confirmed gaps

Empty for this audit. Every gap surfaced in 2026-05-30 is either (a) already applied in the 2026-05-31 Continuation (B1-A1..A5 + B1-U1..U5, 10 rows) or (b) gated by Bucket 2 #1 (3-module split decision) or by an upstream load gap (b1b-REGULATIONS-UPSTREAM). No agent-solvable work remains until the user resolves the Bucket 2 #1 module split.

The B9 event-category enum-violation finding (5 rows with `event_category=""`) is borderline-agent-solvable but routed to b2 as judgment-with-recommendation since `lifecycle` vs `state_change` is non-mechanical for the lifecycle events (`acquired`, `assigned`, `reassigned`, `retired`, `hired`, `terminated`).

### Bucket 2, Surface-for-user (judgment calls)

Carrying forward unchanged from 2026-05-30 (8 items: module split shape; pattern-flag scope; drivers-vs-employees master pattern; vehicle_inspections DVIR overlap with TELEMATICS; sign_document workflow rationale; regulation set scope; HCM driver-lifecycle handoffs; motor-pool as module-or-feature). Adding two new items from this audit:

9. **Trigger-event category for 5 lifecycle-shaped events** (B9 enum violation). Events 985 (`fleet_vehicle.acquired`), 986 (`fleet_vehicle.assigned`), 987 (`fleet_vehicle.reassigned`), 988 (`fleet_vehicle.retired`), 989 (`fleet_driver.hired`), 990 (`fleet_driver.terminated`) all carry `event_category=""`. Recommended: `lifecycle` for all 6 (acquisition / retirement / hire / termination are canonical lifecycle transitions; assigned / reassigned could plausibly be `state_change` if the user reads them as state-machine transitions on the vehicle's current assignment vs lifecycle stage). Pick: (a) all 6 `lifecycle`, (b) `lifecycle` for acquired/retired/hired/terminated + `state_change` for assigned/reassigned, (c) other split.
10. **Catalog tagline + description copy** (A4 fail). Rule #20 forbids `catalog_tagline` / `catalog_description` writes without user-approved buyer-voice text. Recommended tagline shape carried over from 2026-05-30 S2: "Track every vehicle, driver, and fuel dollar across the fleet, with built-in DOT and IFTA compliance from day one." User to approve / rewrite.

### Bucket 3, Phase 0 pending (speculative)

Carrying forward unchanged from 2026-05-30 (7 items): TMS, EV-CHARGING-MGMT, FREIGHT-AUDIT (the 3 already queued via `append_missing_domain.ts`); `vehicle_telematics_devices` ownership (FLEET-MGMT vs TELEMATICS); `driver_messages` placement; `accidents` / `incident_reports` ownership; `vehicle_lease_agreements` vs `vehicle_insurance_policies` shape.

### Cross-bucket dependencies

Carrying forward from 2026-05-30 (the cross-domain dependency chain). The 2026-05-31 Continuation cleared the agent-solvable APQC + users-edges work; everything else still gates on Bucket 2 #1 (module split) or on partner-domain audits (TELEMATICS, FLEET-MAINT, FIN module shapes).

### Fixes applied

None this pass. Structural-audit-only run.

### Report-only follow-ups (owed by other domains)

Same as 2026-05-30: TELEMATICS M1, FLEET-MAINT M1, FIN B10b, FSM B10b on handoff 318, HCM B9 on driver-lifecycle events (conditional on Bucket 2 #7).

## 2026-06-02 - Audit (modularization)

### Summary

Phase M modularization pass. FLEET-MGMT went from 0 `domain_modules` to 3 `module_kind='full'` modules, clearing the M1 / M2 / M6 hard fail (Rule #14 floor of >=2 full modules for a 6-capability domain is now met). Scope was modules + entity assignment only: no new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships were created. The split adopts the 2026-05-30 / 2026-05-31 recommended 3-module shape (B2-MODULE-SPLIT option a), restricted to the entities that exist live today.

All 6 capabilities were placed (each realized by exactly one module, M4 tick). All 5 masters were placed in exactly one module each (M7 single-master tick). The lone contributor (`employees`, id 31) was assigned to DRIVER-OPS preserving its existing `role=contributor`, `necessity=required`. No module is empty (each holds >=1 capability and >=1 data_object). `notes` left empty on every DMC and DMDO row (Rule #15). `record_status` omitted on all inserts (defaulted to `new`, Rule #1). No vendor/product names in any module name or description (Rule #18).

Loader: `.tmp_deploy/modularize_fleet_mgmt_2026-06-02.ts`, idempotent (re-read by natural key before each insert), verified safe to re-run (second run inserted 0 rows).

### Module split

| Module code | id | Capabilities | Data_objects (role / necessity) |
|---|---|---|---|
| `FLEET-MGMT-VEHICLE-LIFECYCLE` | 204 | 404 FLEET-VEHICLE-INVENTORY, 408 FLEET-UTILIZATION | `fleet_vehicles` 370 (master / required) |
| `FLEET-MGMT-DRIVER-OPS` | 205 | 405 FLEET-DRIVER-MGMT, 407 FLEET-DISPATCH | `fleet_drivers` 371 (master / required); `fleet_assignments` 373 (master / required); `vehicle_inspections` 374 (master / required); `employees` 31 (contributor / required) |
| `FLEET-MGMT-FUEL-COMPLIANCE` | 206 | 406 FLEET-FUEL-MGMT, 409 FLEET-COMPLIANCE | `fuel_transactions` 372 (master / required) |

Master -> module mapping (M7, each master in exactly one module): `fleet_vehicles` -> VEHICLE-LIFECYCLE; `fleet_drivers`, `fleet_assignments`, `vehicle_inspections` -> DRIVER-OPS; `fuel_transactions` -> FUEL-COMPLIANCE.

### Counts created

- 3 `domain_modules` (ids 204, 205, 206), all `module_kind='full'`.
- 6 `domain_module_capabilities` (2 per module): 204 -> {404, 408}; 205 -> {405, 407}; 206 -> {406, 409}.
- 6 `domain_module_data_objects`: 1 on 204 (370); 4 on 205 (371, 373, 374, 31); 1 on 206 (372).
- 0 `domain_module_host_domains` (all 3 modules are single-domain on 147; no cross-host hosting required this pass).

### Deferred gaps (out of scope this pass)

- **M8 / A4 catalog UX copy backfill (now per-module).** All 3 new modules carry empty `catalog_tagline` + `catalog_description`; the domains-row `catalog_tagline` + `catalog_description` remain empty too. Rule #20 gates these writes on user-approved buyer-voice text. Recorded as b1a-CATALOG-UX-COPY (agent-solvable once wording is approved; the wording itself rides B2-CATALOG-COPY).
- **Phase-S system skills now required per module (Rule #17 -> F2 / F3).** Each of the 3 new modules now needs exactly one `<module_code_lower>_agent` system skill with >=1 `skill_tools` row, and legacy domain-scoped skill `fleet-mgmt-system` (id 60) must be retired and its 7 tools redistributed. Recorded as b1a-SYSTEM-SKILLS. This unblocks the previously-blocked B1B-LEGACY-SKILL and B1B-CHANNEL-PRIMITIVE (the gating `module-split` prerequisite is now satisfied).
- **Handoff module-FK PATCHes now unblocked on the FLEET-MGMT side.** With modules present, the 11 cross-domain handoffs can take their FLEET-MGMT-side module FK per the master->module mapping above (vehicle events -> 204; assignment / inspection / driver events -> 205; fuel events -> 206). Partner-side NULLs (TELEMATICS, FLEET-MAINT, FIN) remain report-only. Tracked under the existing B1B-HANDOFF-MODULE-FKS (its `prerequisite_entity` gate is now cleared).
- **Lifecycle states now scopable.** The 4 workflow-bearing masters can now have `data_object_lifecycle_states` authored with a `domain_module_id` (370 -> 204; 371, 373, 374 -> 205). Tracked under the existing B1B-LIFECYCLE-STATES (gate cleared).
- **No missing-master candidates added this pass.** The 2026-05-30 audit's B1-M1..M9 missing entities (`driver_qualification_files`, `vehicle_registrations`, `ifta_quarterly_returns`, `vehicle_insurance_policies`, `fuel_cards`, `vehicle_telematics_devices`, `driver_clearinghouse_queries`, `motor_pool_reservations`, `parking_violations`) remain deferred new-entity authoring; they continue to live in b3 and are not blockers for this modularization. Target modules per the split: VEHICLE-LIFECYCLE for `vehicle_registrations` / `vehicle_insurance_policies` / `vehicle_telematics_devices`; DRIVER-OPS for `driver_qualification_files` / `driver_clearinghouse_queries` / `motor_pool_reservations`; FUEL-COMPLIANCE for `ifta_quarterly_returns` / `fuel_cards` / `parking_violations`.

### Fixes applied

- 3 modules + 6 DMC + 6 DMDO inserted via the idempotent loader. Verified live: 3 full modules, all 6 capabilities placed once, all 5 masters mastered once, no empty module, all `notes` empty, all `record_status=new`.

## 2026-06-06 - b1a execution

Executed the agent-solvable b1a items for FLEET-MGMT under the revised Rule #20 / task-prompt rule #6 (write buyer-voice catalog copy directly into empty fields). Loader: `.tmp_deploy/fleet_mgmt_catalog_ux_2026-06-06.ts` (PATCH, empty-guard per field, prior values snapshotted below).

### B1A-CATALOG-UX-COPY - DONE

Wrote buyer-voice `catalog_tagline` + `catalog_description` into the EMPTY fields on the domains row and all 3 modules. Empty-guard fired correctly: every target field was empty before the write, so all 8 fields were written and none overwritten.

Tables + rows written (8 fields across 4 rows, all PATCH):

| Table | id | catalog_tagline | catalog_description | prior values |
|---|---|---|---|---|
| `domains` | 147 | written (127 chars) | written (693 chars) | both `""` |
| `domain_modules` | 204 (FLEET-MGMT-VEHICLE-LIFECYCLE) | written (110 chars) | written (473 chars) | both `""` |
| `domain_modules` | 205 (FLEET-MGMT-DRIVER-OPS) | written (109 chars) | written (501 chars) | both `""` |
| `domain_modules` | 206 (FLEET-MGMT-FUEL-COMPLIANCE) | written (108 chars) | written (491 chars) | both `""` |

Prior value for every field on every row was the empty string `""` (reversible: restore by setting each field back to `""`). Copy is buyer-voice (workflow + value), contains no vendor/product names, no em-dashes, American English. `record_status` left untouched (carries the review signal per Rule #20). Verified live: all 4 rows now report non-empty tagline + description.

This resolves A4 (domain grain) and M8 (per-module grain) for FLEET-MGMT.

### B1A-SYSTEM-SKILLS - SKIPPED (blocked by user_decision B2-SIGN-DOCUMENT)

Not executed. The item's `action` is a single atomic sequence that ends in "...then DELETE skill 60", and the DELETE is explicitly gated on resolving `sign_document per B2-SIGN-DOCUMENT`. B2-SIGN-DOCUMENT is a b2 `user_decision`: whether `sign_document` (skill_tools row 554, tool 42, external side_effect) stays and on which module's skill (DRIVER-OPS for driver onboarding paperwork vs VEHICLE-LIFECYCLE for purchase/lease/title docs vs both), or is dropped as vestigial, has not been decided. Per task rules #7 (skip b1a blocked by a user_decision) and #12 (do not guess on master data), the legacy skill cannot be safely retired and its tools redistributed without that decision.

Executing only the head of the action (author the 3 module-scoped skills + redistribute the 5 `query_*` tools + substitute `send_email`/row 553 with `notify_person`) while leaving skill 60 undeleted would leave the skills layer in a worse transient state than today: two parallel system-skill sets (legacy 60 plus 3 new), F1 and F2 failing in new ways, and an orphaned `sign_document` link. So the whole item is held, not partially executed.

State verified unchanged: skill 60 (`fleet-mgmt-system`, domain_id=147, domain_module_id=NULL) still present with all 7 `skill_tools` rows (548-554) intact; no module-scoped system skills exist on 204/205/206. `notify_person` (tool id 913, coverage_tier=platform) confirmed present in the catalog for when the substitution can proceed.

Dependent b1b items remain blocked behind this: B1B-LEGACY-SKILL (`prerequisite_entity: B1A-SYSTEM-SKILLS`) and B1B-CHANNEL-PRIMITIVE (`depends_on: B1B-LEGACY-SKILL`). No writes made for any of them.

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

## 2026-06-13 - b1a execution + B9d + corrective backfill

Executed every agent-doable item this pass; the domain stays `feedback_needed` (only b2 user decisions and partner-domain-gated b1b items remain).

### B9d (handoff payload realization, BOTH directions) - DONE
Ran `scripts/analytics/b9d_resolver.ts FLEET-MGMT --write`. 11 boundary payload tags, 7 distinct (process, owner) findings, all ORPHAN (no ROLL-UP, no MIS-TAG, so no destructive work). Additive owner-side b2 + q edits applied to whichever side owns each payload (Rule #1, all `record_status='new'`, no catalog writes):
- FLEET-MGMT: confirmed pre-existing B2-B9D-OWN-315 (q13, "Process accounts payable (AP)"), B2-B9D-OWN-352 (q15, "Manage asset maintenance"), B2-B9D-OWN-1389 (q14, "fixed-asset additions and retires"); **added new B2-B9D-OWN-862** (q17, "Manage transportation fleet", owner FLEET-MGMT masters fleet_assignments + fleet_vehicles).
- Neighbor files written (cross-domain B9d carve-out): FLEET-MAINT (B2-B9D-OWN-352), TELEMATICS (B2-B9D-OWN-862), FSM (B2-B9D-OWN-862).
- B2-B9D-OWN-1543 ("Analyze assets and predict maintenance requirements", pid 1543) is NOT surfaced by the FLEET-MGMT boundary walk because its handoff (881) is TELEMATICS->FLEET-MAINT and does not touch FLEET-MGMT; it is correctly owned by FLEET-MGMT (masters the `fleet_vehicles` payload) and was pre-seeded by the earlier FLEET-MAINT pass. Left in place as a valid open b2.
- This resolves the former b1a-B9D-VERIFY (deleted from state.yaml).

### B13 entity_type classification - DONE
All 5 masters were `unclassified` (B13 fail). Classified grounded in the domain review: fleet_vehicles 370, fleet_drivers 371, fleet_assignments 373, vehicle_inspections 374 -> `operational_workflow`; fuel_transactions 372 -> `operational_record` (config-shape, the Rule #12 lifecycle exemption is now structural via entity_type, not a notes write). Additive PATCH, record_status untouched. Loader `.tmp_deploy/fleet_mgmt_entity_type_2026_06_13.ts`.

### B1B-HANDOFF-MODULE-FKS (FLEET-MGMT side) - DONE for the 6 resolvable rows
Backfilled the FLEET-MGMT-side module FK where the FLEET-MGMT-side data_object resolves to a single mastering module (loader `.tmp_deploy/fleet_mgmt_handoff_module_fks_2026_06_13.ts`): outbound `source_domain_module_id` 313->205, 317->206, 874/875/876->204; inbound `target_domain_module_id` 318->205. Remaining NULLs are NOT FLEET-MGMT-side agent work: partner-side stays NULL until TELEMATICS / FLEET-MAINT / FIN modularize (report-only on their audits), and the 5 foreign-payload inbounds (319 driver_behavior_events, 321 vehicle_trips, 877 maintenance_defects, 880 driver_safety_scorecards, 884 service_work_orders) have no FLEET-MGMT module candidate because FLEET-MGMT declares no DMDO role on those payloads - filling them needs a consumer-DMDO modeling decision entangled with B2-VEHICLE-INSPECTIONS-DVIR, so the item stays open (re-scoped, not removed).

### B1B-LIFECYCLE-STATES - DONE for the 2 unentangled workflow masters
Authored lifecycle states (loader `.tmp_deploy/fleet_mgmt_lifecycle_states_2026_06_13.ts`):
- fleet_vehicles (370, module 204): acquired (initial) -> in_service -> assigned -> maintenance -> retired (gate `retire_vehicle`) -> sold (terminal, gate `sell_vehicle`).
- fleet_assignments (373, module 205): scheduled (initial) -> active -> completed (terminal) -> cancelled (terminal).
Both well-formed (one initial, >=1 terminal, monotonic unique state_order, record_status=new). fleet_drivers (371) and vehicle_inspections (374) lifecycle states stay deferred - each is gated on an open b2 that relocates / reshapes its state machine (B2-DRIVERS-VS-EMPLOYEES + B2-HCM-DRIVER-LIFECYCLE for the driver machine; B2-VEHICLE-INSPECTIONS-DVIR for the inspection machine). The item is re-scoped to those two masters with the gating b2s recorded.

### B6 intra-domain relationships - DONE (8 baseline edges)
Authored the R1-R8 baseline from the 2026-05-30 audit (loader `.tmp_deploy/fleet_mgmt_intra_rels_2026_06_13.ts`), all one_to_many / owner_side=source / relationship_kind=reference, active/passive verb convention: fleet_vehicles->fleet_assignments, fleet_drivers->fleet_assignments, fleet_assignments->vehicle_inspections, fleet_vehicles->vehicle_inspections, fleet_drivers->vehicle_inspections, fleet_vehicles->fuel_transactions, fleet_drivers->fuel_transactions, fleet_assignments->fuel_transactions. Combined with the 2026-05-31 users-edges, B6 + B7 now populated.

### Superseded items removed from state.yaml (Rule #22 hygiene)
The per-module `<module>_agent` system-skill grain is RETIRED (per the supersession note at the head of state.yaml / `plans/per-domain-skill-restoration.md`). The three skill-layer items framed around it are superseded and deleted from state.yaml; the real remaining work (author `domain_module_tools` onto modules 204/205/206, retire legacy skill 60, derive the one domain-grain system skill) is catalog-backlog-tracked in `audits/_modularization-backlog.md` (FLEET-MGMT is enrolled there as one of the "12 un-authored multi-module domains"), not as per-domain state:
- B1A-SYSTEM-SKILLS (author 3 per-module skills) - superseded.
- B1B-LEGACY-SKILL (retire skill 60 after per-module skills land) - superseded.
- B1B-CHANNEL-PRIMITIVE (send_email -> notify_person on a per-module skill) - superseded.

### Still open (waiting on user / other domains)
- b2: 17 questions in q-FLEET-MGMT.md (q1 drivers-vs-employees gate; q2 pattern flags; q3 DVIR scope; q4 event categories; q5 sign_document; q6 HCM driver-lifecycle; q7 motor pool; q8 regulation scope; q9 catalog copy approval; q10 aliases; q13-q17 B9d owner assignments). Plus optional b3 q11/q12.
- b1b: B1B-HANDOFF-MODULE-FKS (partner-side NULLs + consumer-DMDO decision), B1B-LIFECYCLE-STATES (driver + inspection machines, b2-gated), B1B-REGULATIONS-UPSTREAM (upstream transportation-regulations seed + B2-REGULATION-SCOPE).

### Fixes applied
- B9d: additive owner b2 + q edits in audit files only (no catalog writes).
- Catalog: 5 entity_type PATCH, 6 handoff module-FK PATCH, 10 lifecycle states inserted, 8 intra-domain relationships inserted. All `record_status='new'`. No deletions, no overwrites of non-empty values, no record_status flips.

`next_action_by`: user. No agent-executable work remains; everything open is a b2 user decision or a b1b blocked on another domain / upstream seed.

## 2026-06-15 - a-file processed

Answers applied (q-FLEET-MGMT.md renamed to a-FLEET-MGMT.md; "process them"):
- **a1 = a (B2-DRIVERS-VS-EMPLOYEES)**: keep current shape - FLEET masters fleet_drivers, contributor on employees (US-trucking contractor reality). Decision recorded; unblocks the fleet_drivers state machine subject to a6 below.
- **a2 = a (B2-PATTERN-FLAGS)**: all 5 masters has_personal_content=true (user chose the privacy-strict reading over the recommended 3).
- **a4 = a (B2-EVENT-CATEGORIES)**: 6 lifecycle events (985-990) event_category=lifecycle.
- **a7 = b (B2-MOTOR-POOL)**: motor_pool_reservations will ship as its own FLEET-MGMT-MOTOR-POOL sub-module when the entity is authored (user chose separate over the recommended embed). Recorded; no entity authored yet.
- **a9 = yes (B2-CATALOG-COPY)**: catalog copy confirmed (already written at record_status=new; nothing to write).
- **a13-a17 = a (B2-B9D-OWN-315/1389/352/862/...)**: FLEET owns the 5 B9d-surfaced processes (AP, fixed-asset, asset-maintenance, predictive-maintenance, transportation-fleet). FLEET has 0 personas (Phase-P deferred), so these are recorded as owned-but-awaiting-a-named-owner (b1b blocked on Phase-P), not realized yet.

Looped into the regenerated q-FLEET-MGMT.md (questions/requests, NOT executed):
- **a3 (B2-VEHICLE-INSPECTIONS-DVIR)** "would embedded master be a more flexible option": yes - re-asked as embedded_master vs unified-with-discriminator vs split.
- **a5 (B2-SIGN-DOCUMENT)** "explain": explained the tool's purpose; re-asked which workflow (if any) keeps it.
- **a6 (B2-HCM-DRIVER-LIFECYCLE)** "explain": explained the HCM->FLEET driver-lifecycle handoffs; re-asked.
- **a8 (B2-REGULATION-SCOPE)** "can these be optional, so EU does not need to import US and vice versa": yes - confirmed regulations ship as conditional/optional applicability; re-asked to confirm the floor+stretch set on that basis.
- **a10 (B2-ALIASES)** blank -> recommendation b (load a curated subset) needs the actual picks; re-asked.

b3 research (a11/a12 = yes): the deeper fleet entities and the 3 adjacent-domain candidates (TMS, EV-CHARGING-MGMT, FREIGHT-AUDIT) are greenlit for research, parked non-blocking. Loader: .tmp_deploy/process_afiles_mechanical_2026_06_15.ts.
