# TELEMATICS audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- Current footprint: 8 master data_objects (`vehicle_trips`, `driver_behavior_events`, `eld_logs`, `dashcam_events`, `gps_waypoints`, `idle_events`, `geofence_events`, `driver_safety_scorecards`) + 2 consumer rows (`fleet_vehicles`, `fleet_drivers` from FLEET-MGMT); 6 capabilities; 9 solutions (8 primary + 1 secondary); 0 regulations; 0 `domain_modules` rows (M1 hard fail); 8 `trigger_events`; 8 outbound + 3 inbound `handoffs` (all 11 with NULL module FKs); 0 `data_object_relationships`; 0 `data_object_aliases`; 0 `data_object_lifecycle_states`; 1 legacy `domain_id`-scoped system skill (`telematics-system`, id 112) with 8 platform-tier query tools.
- Vendor-surface basis: Samsara (Connected Operations Platform), Geotab (MyGeotab), Motive (Fleet Platform), Verizon Connect (Reveal), Lytx (DriveCam, video-telematics + driver-coaching specialist anchoring the FMCSA / DOT compliance leg). Trimble, Webfleet, Omnitracs, Azuga also linked but not enumerated as flagships for this audit.
- **Bucket 1 (in-scope, agent fixable):** 14 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 4 items.

Structural pass: A passes except A4 (catalog UX fields empty); M is a hard fail (zero modules); B has wide gaps (no relationships, no aliases, no lifecycle states, no pattern-flag re-eval, no module attribution on handoffs); C passes; E vacuously skipped (no modules to wire roles against); F1 / F2 both fail (legacy domain-scoped system skill, no module-scoped skill); H1 fails (1 of 11 handoffs tagged, source is `discovery_substring`, no `agent_curated` proposals on the other 10). Domain Semantius score: uncomputable per-module (F5 rollup) because no module exists; the legacy skill itself reports 8 / 8 = 100% strict on the platform-tier query tools but the per-module rollup the score is designed for cannot be computed.

The entire audit downstream of the M-band gates on resolving the modularization gap first. Bucket 1 enumerates the fix items assuming a 2-module split per the proposal in B2-1; if the user adopts a different split, every B-band and F-band fix needs the module assignment revisited.

### Vendor surface basis

- **Samsara** (samsara.com) - reference connected-operations vendor, broad surface: vehicle gateway, GPS, dashcam AI, ELD, driver-behavior scoring, asset tracking, environmental sensors, equipment monitoring. Public API docs / Schema reference.
- **Geotab** (geotab.com) - data-first telematics vendor, MyGeotab API exposes vehicles, devices, trips, exception rules, fault data, fuel transactions, IOX add-ons. Strong on data quality and rule-based exception engine.
- **Motive** (gomotive.com, formerly KeepTruckin) - ELD-first vendor with strong FMCSA / HOS posture, dashcam AI, fuel monitoring, driver coaching workflows. Strongest US-specific HOS / IFTA / DVIR posture among the flagships.
- **Verizon Connect** (verizonconnect.com, Reveal) - enterprise carrier-aligned vendor, vehicle, driver, route, geofence, alerts, maintenance, scorecards.
- **Lytx** (lytx.com, DriveCam) - video-telematics specialist and compliance leg, the DriveCam SaaS includes risky-event triggering, video review queues, coaching sessions, and event taxonomies aligned to fleet-safety insurance underwriting.

Compliance basis: FMCSA Part 395 (HOS / ELD mandate), FMCSA Part 396 (DVIR), FMCSA Part 391 (driver qualification), IFTA (jurisdictional fuel-tax), ISO 39001 (RTS), GDPR / CCPA (driver behavior data carries personal content), insurance-claims first-notice-of-loss workflow (dashcam evidence).

### Pass 3 - Neighbor discovery

Edges discovered from `handoffs` + cross-domain DMDO consumption:

| Neighbor | Handoffs out | Handoffs in | DMDO deps | Weight | Boundary depth |
|---|---|---|---|---|---|
| FLEET-MGMT (147, parent) | 3 (`vehicle_trip.completed`, `driver_behavior_event.triggered`, `safety_scorecard.updated`) | 1 (`fleet_vehicle.assigned`) | 2 (consumer on `fleet_vehicles` + `fleet_drivers`) | 6 | full (>=3) |
| GRC (15) | 2 (`eld_log.violation_detected`, `safety_scorecard.updated`) | 0 | 0 | 2 | summary only |
| FLEET-MAINT (149) | 2 (`preventive_maintenance.due`, `fleet_vehicle.mileage_milestone_reached`) | 0 | 0 (note: `preventive_maintenance_schedules` is FLEET-MAINT-mastered) | 2 | summary only |
| INS-CLAIMS (44) | 1 (`dashcam_event.collision`) | 0 | 0 | 1 | summary only |
| FMIS (154, Farm Mgmt Info Sys) | 0 | 2 (`variable_rate_prescription.published`, `machinery_telemetry_record.captured`) | 0 | 2 | summary only |

FLEET-MGMT is the only weight-3+ neighbor and gets the full pairwise pass below; the rest are one-line summaries.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 / M2 / M6 (hard) | Zero `domain_modules` rows exist for TELEMATICS. The domain has 6 capabilities and 8 mastered data_objects but ships no deployable units. Every downstream B, E, F band is blocked on this. | Author the module set; see B2-1 for the proposed split. Default is 2 full modules (`TELEMATICS-FLEET-TRACKING` covering GPS / trips / geofencing / idle; `TELEMATICS-COMPLIANCE-SAFETY` covering ELD / DVIR / dashcam / driver-behavior / scorecards). Load via standard Phase A loader. |
| B1-S2 | A4 | `domains.catalog_tagline` and `catalog_description` both empty. | Draft buyer-voice copy per Rule #20; surface to user for review before write. Recommended tagline shape: "Live vehicle tracking, HOS compliance, and driver-safety telemetry from one connected fleet platform." |
| B1-S3 | B4 (pattern flags) | All 8 masters have `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false` at the schema default; no positive re-evaluation recorded. `driver_behavior_events`, `dashcam_events`, `driver_safety_scorecards`, `eld_logs` all touch driver-identifiable behavior; the personal-content flag is plausibly `true` on the four driver-attributed masters. | PATCH `has_personal_content=true` on rows 376, 378, 734, 377 after user confirmation. The other four (vehicle_trips, gps_waypoints, idle_events, geofence_events) are arguably also personal-by-association; surface as Bucket 2 #2. |
| B1-S4 | B6 | Zero intra-domain `data_object_relationships` rows. With 8 mastered entities and a workflow chain (GPS waypoints compose into trips, trips emit idle / geofence / driver-behavior events, events feed scorecards, ELD logs sit alongside trips), the catalog is silent on every edge. | Author the 10-edge baseline below (B1-R1..R10) via a focused loader. |
| B1-S5 | B7 (users edges) | Zero edges from any TELEMATICS master to the `users` platform built-in (id 748). At minimum `dashcam_events` (reviewer / coach), `driver_behavior_events` (reviewer), `driver_safety_scorecards` (coached_driver, coach), `eld_logs` (driver) need a user-typed actor edge. | Author 4 `data_object_relationships` rows per Rule #10. See B1-U1..U4 below. |
| B1-S6 | B10b (hard, audit-blocker) | All 11 handoffs touching TELEMATICS carry NULL on both `source_domain_module_id` and `target_domain_module_id`. This is a derived consequence of B1-S1 (no modules), but every fact sheet emitted from this domain over-attributes its events across every (yet-to-exist) module. | After modules land (B1-S1), run the standard B10b derivation: source side = the new TELEMATICS module that masters the trigger event's data_object; target side = whichever module on the partner holds the payload. For partners that themselves have no modules (FLEET-MGMT, FLEET-MAINT, GRC, INS-CLAIMS, FMIS all have zero modules), the `target_domain_module_id` stays NULL pending the partner's modularization, surfaced as a report-only follow-up per neighbor. |
| B1-S7 | B11 | Zero `data_object_aliases`. `eld_logs` -> `HOS Logs / Driver Logs`, `dashcam_events` -> `Video Events / Risk Triggers`, `driver_behavior_events` -> `Safety Events / DriveCam Events`, `vehicle_trips` -> `Drives / Routes` are all live in the vendor lexicon. | Author 8-12 alias rows; bundle with the cluster-drafts loader. |
| B1-S8 | B12 (hard) | Zero `data_object_lifecycle_states` rows. Several masters have workflow-bearing state (`dashcam_events` move `flagged -> reviewed -> coached -> archived`; `driver_behavior_events` similar; `eld_logs` move `active -> certified -> auditor_locked`; `driver_safety_scorecards` recompute on a cadence). Without states the workflow-gate permission derivation (Rule #12) is empty and the per-module permission catalog is hollow. | Draft state machines for the 4 workflow-bearing masters; the other 4 (`gps_waypoints`, `idle_events`, `geofence_events`, `vehicle_trips`) are append-only telemetry and qualify for the config-shape exemption. Surface the 4 exemptions to the user without writing `data_objects.notes` (Rule #15). |
| B1-S9 | B9 (trigger events) | Five trigger events (994, 995, 996, 997, 998) have empty `event_category`. Allowed values are `lifecycle`, `state_change`, `threshold`, `signal`. Suggested mapping: `gps_waypoint.recorded` -> `lifecycle`; `idle_event.detected`, `geofence.crossed` -> `threshold`; `safety_scorecard.updated` -> `state_change`; `fleet_vehicle.mileage_milestone_reached` -> `threshold`. | PATCH 5 rows. |
| B1-S10 | F1 (legacy cleanup) | A legacy domain-level system skill `telematics-system` (id 112, `domain_id=148`, `domain_module_id=NULL`) carries 8 `skill_tools` (all platform-tier `query_*`). Per F1 this must be retired once module-level system skills exist; per F2 each new module needs exactly one `<module_code_lower>_agent` system skill with the proper tool set. | After modules land, author 2 module-scoped system skills per Rule #17 (one per module), re-link the 8 existing tools to the right module's skill, and DELETE legacy skill 112. Rename convention: `telematics_fleet_tracking_agent`, `telematics_compliance_safety_agent`. |
| B1-S11 | F (skill naming) | Legacy `telematics-system` uses kebab + `-system` suffix; the catalog convention per Phase-S is snake + `_agent`. Carries forward to the rename in B1-S10. | Combined with S10. |

#### BOUNDARY findings per neighbor

| ID | Neighbor | Finding | Fix |
|---|---|---|---|
| B1-B1 | FLEET-MGMT | Existing handoff 312 has trigger_event 304 (`preventive_maintenance.due`) on payload 380 (`preventive_maintenance_schedules`), but `preventive_maintenance_schedules` is mastered in FLEET-MAINT (149), not TELEMATICS. TELEMATICS doesn't master nor consume that data_object; the trigger event sits awkwardly. The likely intent: a TELEMATICS-generated mileage threshold (`fleet_vehicle.mileage_milestone_reached`, event 998 / handoff 881) is what should fire into FLEET-MAINT; handoff 312 should be retired or re-pointed. | Defer to user judgment in Bucket 2 #7 (modularization decision affects which module owns the event). |
| B1-B2 | FLEET-MAINT (149) | Outbound handoff 312 + 881 both target FLEET-MAINT; FLEET-MAINT has zero modules so `target_domain_module_id` stays NULL until that domain modularizes. | Report-only on FLEET-MAINT side (its own M1 fix); on TELEMATICS side, no action beyond the source-module FK once TELEMATICS modules land. |
| B1-B3 | INS-CLAIMS (44) | Outbound handoff 315 (`dashcam_event.collision`) targets INS-CLAIMS for first-notice-of-loss. Friction level `high`, integration `manual_handoff`. INS-CLAIMS has zero modules; target FK NULL stays until its modularization. | Report-only on INS-CLAIMS side. |
| B1-B4 | GRC (15) | Outbound handoffs 314 + 882 target GRC for compliance reporting (HOS violations + safety scorecards). GRC has zero modules in scope visible here; same story as INS-CLAIMS. | Report-only on GRC side. |
| B1-B5 | FMIS (154) | Two inbound handoffs from FMIS exist on payloads (`variable_rate_prescriptions`, `machinery_telemetry_records`) that TELEMATICS does NOT declare any role on in `domain_data_objects`. This is a B10b sub-case 2 ("no candidate"): the handoff names a payload the target domain doesn't model. Likely modeling confusion: agricultural-machinery telemetry sits between agronomy / FMIS and a hypothetical AG-TELEMATICS sibling; routing it into vehicle telematics is questionable. | Surface to user in Bucket 2 #6. Possibilities: (a) drop the inbound rows as mis-routed, (b) add `consumer` DMDOs on TELEMATICS so the dependency is captured, (c) queue AG-TELEMATICS as a candidate domain. |

#### APQC TAGGING

11 cross-domain handoffs touch TELEMATICS (8 outbound + 3 inbound). 1 currently tagged (handoff 312, `discovery_substring`, `record_status=new`, pointing at PCF 823 "Plan for preventive maintenance" - that tag is questionable since handoff 312 itself is questionable per B1-B1).

Proposed `agent_curated` tags (record_status defaults to `new`, proposal_source `agent_curated`):

| ID | handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
|---|---|---|---|---|---|---|---|
| B1-A1 | 314 | TELEMATICS -> GRC | `eld_log.violation_detected` | `eld_logs` | Compile and communicate internal and regulatory compliance reports | 1607 | confident L4 |
| B1-A2 | 315 | TELEMATICS -> INS-CLAIMS | `dashcam_event.collision` | `dashcam_events` | (defer to Discover Pass 3 - no clean PCF cross-industry match; FNOL workflow is industry-specific to P&C insurance) | - | defer |
| B1-A3 | 319 | TELEMATICS -> FLEET-MGMT | `driver_behavior_event.triggered` | `driver_behavior_events` | Manage transportation fleet | 862 | confident L4 |
| B1-A4 | 321 | TELEMATICS -> FLEET-MGMT | `vehicle_trip.completed` | `vehicle_trips` | Manage transportation fleet | 862 | confident L4 |
| B1-A5 | 312 | TELEMATICS -> FLEET-MAINT | `preventive_maintenance.due` | `preventive_maintenance_schedules` | Plan for preventive maintenance | 823 | confident L4 (existing `discovery_substring`; up-grade to `agent_curated` provenance or leave alone) |
| B1-A6 | 880 | TELEMATICS -> FLEET-MGMT | `safety_scorecard.updated` | `driver_safety_scorecards` | Manage transportation fleet | 862 | confident L4 |
| B1-A7 | 881 | TELEMATICS -> FLEET-MAINT | `fleet_vehicle.mileage_milestone_reached` | `fleet_vehicles` | Analyze assets and predict maintenance requirements | 1543 | confident L4 |
| B1-A8 | 882 | TELEMATICS -> GRC | `safety_scorecard.updated` | `driver_safety_scorecards` | Compile and communicate internal and regulatory compliance reports | 1607 | confident L4 |
| B1-A9 | 966 | FMIS -> TELEMATICS | `variable_rate_prescription.published` | `variable_rate_prescriptions` | (defer to Discover Pass 3 - agricultural prescription is industry-specific; PCF cross-industry has no precise match; also pending Bucket 2 #6 routing decision) | - | defer |
| B1-A10 | 968 | FMIS -> TELEMATICS | `machinery_telemetry_record.captured` | `machinery_telemetry_records` | (defer - same reason as A9; ag-machinery telemetry should arguably route to an AG-TELEMATICS candidate, see Bucket 3 #1) | - | defer |
| B1-A11 | 874 | FLEET-MGMT -> TELEMATICS | `fleet_vehicle.assigned` | `fleet_vehicles` | Manage transportation fleet | 862 | confident L4 |

Tag volume: 7 confident new `agent_curated` proposals + 1 pre-existing (upgrade decision in Bucket 2) + 3 defer-to-Discover-Pass-3 entries. 11 of 11 handoffs accounted for; H1 coverage gate clears after the 7 inserts + 3 deferrals are recorded.

#### MISSING entities (compliance / FMCSA-mandated)

| ID | Entity | Proposed module | Regulation / vendor evidence |
|---|---|---|---|
| B1-M1 | `dvir_inspections` (Driver Vehicle Inspection Reports) | TELEMATICS-COMPLIANCE-SAFETY | FMCSA Part 396 mandates pre-trip / post-trip DVIR; 5/5 flagship vendors expose it. Note collision risk with FLEET-MGMT `vehicle_inspections` (id 374) which already exists - decide canonical ownership in Bucket 2 #3. |
| B1-M2 | `hos_certifications` (HOS log driver certifications) | TELEMATICS-COMPLIANCE-SAFETY | FMCSA Part 395.20 requires the driver to certify each day's HOS log. Distinct workflow from `eld_logs` (the raw log) - this is the daily certification record. |
| B1-M3 | `driver_coaching_sessions` | TELEMATICS-COMPLIANCE-SAFETY | Lytx, Samsara, Motive all formalize the coaching workflow that follows a `driver_behavior_event.triggered`. Joins `driver_behavior_events` -> `users` (coach) with a date, outcome, video evidence. Compliance: not regulator-mandated but underwriter-required for ISO 39001 / fleet-insurance discount programs. |
| B1-M4 | `ifta_jurisdiction_summaries` | TELEMATICS-FLEET-TRACKING | IFTA (International Fuel Tax Agreement) requires quarterly per-jurisdiction mile / fuel summaries; Geotab, Samsara, Verizon Connect, Motive all derive this from GPS traces + fuel transactions. Bridges TELEMATICS GPS with FLEET-MGMT's `fuel_transactions`. |
| B1-M5 | `fault_codes` (vehicle DTCs / engine fault codes) | TELEMATICS-FLEET-TRACKING (or TELEMATICS-COMPLIANCE-SAFETY) | 5/5 flagship vendors expose engine / DTC fault data via OBD-II / J1939; trigger for preventive maintenance and reliability analytics. |

#### Intra-domain relationship edges (B6 fix, 10 baseline rows)

| ID | Edge | verb / inverse | cardinality | required | owner_side |
|---|---|---|---|---|---|
| B1-R1 | `gps_waypoints` -> `vehicle_trips` | `composes` / `composed_of` | many_to_one | true | source |
| B1-R2 | `vehicle_trips` -> `driver_behavior_events` | `surfaces` / `surfaced_by` | one_to_many | false | source |
| B1-R3 | `vehicle_trips` -> `idle_events` | `surfaces` / `surfaced_by` | one_to_many | false | source |
| B1-R4 | `vehicle_trips` -> `geofence_events` | `surfaces` / `surfaced_by` | one_to_many | false | source |
| B1-R5 | `vehicle_trips` -> `eld_logs` | `composes` / `composed_of` | many_to_one | true | source |
| B1-R6 | `driver_behavior_events` -> `driver_safety_scorecards` | `feeds` / `fed_by` | many_to_one | true | source |
| B1-R7 | `dashcam_events` -> `driver_safety_scorecards` | `feeds` / `fed_by` | many_to_one | true | source |
| B1-R8 | `dashcam_events` -> `driver_behavior_events` | `corroborates` / `corroborated_by` | many_to_one | false | source |
| B1-R9 | `eld_logs` -> `driver_safety_scorecards` | `informs` / `informed_by` | many_to_one | false | source |
| B1-R10 | `geofence_events` -> `vehicle_trips` | `qualifies` / `qualified_by` | many_to_one | false | source |

#### Users-edge baseline (B7 fix, 4 rows)

| ID | Edge | verb |
|---|---|---|
| B1-U1 | `dashcam_events` -> `users` | `reviewed_by` (single safety reviewer) |
| B1-U2 | `driver_behavior_events` -> `users` | `attributed_to` (driver) |
| B1-U3 | `driver_safety_scorecards` -> `users` | `attributed_to` (driver scored) |
| B1-U4 | `eld_logs` -> `users` | `attributed_to` (driver) |

#### Cross-domain outbound relationship rows (B8 fix, 3 rows)

| ID | Edge | verb | source |
|---|---|---|---|
| B1-X1 | `vehicle_trips` -> `fuel_transactions` (FLEET-MGMT 372) | `reconciles_with` | many_to_many |
| B1-X2 | `driver_behavior_events` -> `fleet_drivers` (FLEET-MGMT 371) | `attributed_to` | many_to_one |
| B1-X3 | `driver_safety_scorecards` -> `fleet_drivers` (FLEET-MGMT 371) | `summarizes_behavior_of` | many_to_one |

### Bucket 2 - Surface-for-user (judgment calls)

1. **Module split shape (gates everything in Bucket 1).** Proposed: 2 full modules.
   - **`TELEMATICS-FLEET-TRACKING`** masters `vehicle_trips`, `gps_waypoints`, `idle_events`, `geofence_events`. Realizes capabilities `TEL-GPS-TRACKING`, `TEL-GEOFENCING`, `TEL-VEHICLE-DIAG`. Embedded-masters `fleet_vehicles`, `fleet_drivers` from FLEET-MGMT.
   - **`TELEMATICS-COMPLIANCE-SAFETY`** masters `eld_logs`, `dashcam_events`, `driver_behavior_events`, `driver_safety_scorecards`. Realizes `TEL-ELD-HOS`, `TEL-DRIVER-BEHAVIOR`, `TEL-DASHCAM-VIDEO`. Embedded-masters `fleet_drivers`. Hosts the regulated compliance surface (FMCSA Part 395 HOS, Part 396 DVIR, Lytx-style video review).
   Alternative: single module (would violate Rule #14's 2-module floor for >=3-capability domains - 6 capabilities here clearly cross the threshold). Or 3-module split spinning `TELEMATICS-VIDEO-COACHING` out from compliance-safety (matches Lytx as a pure-play but probably too granular at this catalog scale).
2. **Pattern-flag scope for `vehicle_trips`, `gps_waypoints`, `idle_events`, `geofence_events`.** Position telemetry is personal data under GDPR / CCPA when tied to an identified driver. Should `has_personal_content` be true on these four as well as the four driver-attributed masters in B1-S3? Options: (a) all 8 = true (privacy-strict reading), (b) only the 4 driver-attributed = true, (c) only the dashcam + behavior pair = true (operational reading).
3. **DVIR canonical ownership.** FLEET-MGMT already masters `vehicle_inspections` (id 374). Vendor practice is that DVIR (driver-completed pre/post-trip inspection) is a distinct workflow from periodic vehicle inspections (mechanic-completed PMI). Options: (a) add `dvir_inspections` separately under TELEMATICS-COMPLIANCE-SAFETY and keep `vehicle_inspections` for PMI, (b) rename `vehicle_inspections` to `vehicle_inspections` covering both with a `kind` discriminator, (c) move `vehicle_inspections` ownership into TELEMATICS. Recommended: (a).
4. **Cross-catalog: `notify_team` coverage_tier.** Same issue flagged in ATS audit and elsewhere: TELEMATICS skills will plausibly link `notify_person` (safety-manager alert on collision) and `notify_team` (broadcast HOS-violation alert to dispatch + manager). Need to confirm catalog-wide `notify_team.coverage_tier` status before authoring Phase-S for TELEMATICS modules.
5. **B9 / B1-S9 event_category mapping.** Final values on the 5 empty categories above? Suggested `lifecycle` / `threshold` / `state_change` mapping is mine, not from observed vendor docs.
6. **FMIS inbound routing (handoffs 966 + 968).** Agricultural-machinery telemetry from FMIS lands on TELEMATICS with payloads (`variable_rate_prescriptions`, `machinery_telemetry_records`) that TELEMATICS does not declare any role on. Options: (a) drop both as mis-routed (FMIS's intended subscriber was probably a hypothetical AG-TELEMATICS, see Bucket 3 #1), (b) add `consumer` DMDOs on TELEMATICS modules so the dependency is captured but tag the relationship as cross-vertical, (c) queue AG-TELEMATICS as a candidate and re-route the inbounds. Coordinated decision: this drives Bucket 3 #1.
7. **Handoff 312 retire / re-point.** Handoff 312 ties trigger_event 304 (`preventive_maintenance.due` on payload 380 `preventive_maintenance_schedules`) into TELEMATICS as source. The payload is FLEET-MAINT-mastered; TELEMATICS doesn't model preventive-maintenance schedules. Likely the intended event is `fleet_vehicle.mileage_milestone_reached` (event 998 / handoff 881) which already exists. Options: (a) DELETE handoff 312 and trigger_event 304, (b) re-point trigger_event 304's `data_object_id` to a TELEMATICS-mastered entity, (c) leave alone but note the modeling debt.

### Bucket 3 - Phase 0 pending (speculative; vendor-research vetting needed)

| Candidate | Recommendation | Vendor evidence basis |
|---|---|---|
| **AG-TELEMATICS** (candidate new domain) - agricultural-machinery telemetry / precision-agriculture data layer | Phase 0 vendor research (John Deere Operations Center, Trimble Ag, AGCO Fuse, Topcon Ag, CNH Industrial AFS Connect). Coordinated with Bucket 2 #6. | FMIS inbound handoffs (966, 968) on `variable_rate_prescriptions` + `machinery_telemetry_records` suggest the FMIS subscriber was probably an AG-TELEMATICS sibling, not vehicle telematics. The candidate may already be queued by other audits; helper run below. |
| `driver_messages` / dispatch messaging | Phase 0 vendor research; possible scope-creep into a `FLEET-DISPATCH` candidate | Samsara, Motive, Verizon Connect all surface driver-dispatch chat. May be a TMS / dispatch concern rather than TELEMATICS. |
| `vehicle_environmental_sensors` (cargo temperature, door open, asset trailer) | Phase 0 vendor research | Samsara, Geotab promote IoT / cold-chain telemetry as a tier. Often a separate module rather than a sibling of `gps_waypoints`. |
| `route_executions` (planned-vs-actual route reconciliation) | Phase 0 vendor research; ambiguous between TELEMATICS and a TMS / FLEET-DISPATCH candidate | Verizon Connect Reveal, Samsara surface route planning + execution comparisons; canonical owner unclear in the cross-vendor landscape. |

### Cross-bucket dependencies

- **B1-S1 (module split) gates everything in B-band, F-band, and BOUNDARY findings.** Until Bucket 2 #1 resolves, none of B1-S4, S5, S6, S7, S8, S10, S11 can be loaded - each needs the module FK assignment.
- **B1-S3 (pattern flags) intersects with Bucket 2 #2.** The four position-telemetry masters' privacy posture changes the PATCH scope.
- **Bucket 2 #3 (DVIR ownership) gates B1-M1.** If the user prefers option (b) or (c), the missing-entity row resolves differently.
- **Bucket 2 #6 (FMIS routing) gates B1-A9 / A10 and Bucket 3 #1.** Same root question routes three findings.
- **Bucket 2 #7 (handoff 312 fate) gates B1-A5.** If 312 is retired, the existing `discovery_substring` tag is moot.
- **Bucket 3 #1 (AG-TELEMATICS) and Bucket 2 #6 share the same root question.** Vetted Phase 0 on AG-TELEMATICS resolves both. Eyeball-mode answer to Bucket 2 #6 short-circuits Bucket 3 #1.

### Per-bucket prompts

After the gap report is surfaced, the orchestrator should prompt the user with the following per-bucket asks:

- **Bucket 1:** "14 in-scope items. Approve all, approve some (name the IDs), or skip? Note that S4..S11 and the M-, R-, U-, X-, A- subgroups all depend on Bucket 2 #1 resolving the module split first."
- **Bucket 2:** "7 judgment items. Please answer each in turn: (1) module split shape, (2) pattern-flag scope, (3) DVIR ownership, (4) `notify_team` coverage_tier resolution, (5) event_category mapping, (6) FMIS inbound routing, (7) handoff 312 fate."
- **Bucket 3:** "4 speculative candidates. Vet via Phase 0 research (recommended for AG-TELEMATICS specifically, since it's a possible new domain), or eyeball-mode (name which to treat as confirmed)?"

### Report-only follow-ups (owed by other domains)

- **FLEET-MGMT (147) M1 owes:** FLEET-MGMT itself has zero `domain_modules`. All 4 outbound handoffs from TELEMATICS into FLEET-MGMT plus the 1 inbound from FLEET-MGMT will keep `target_domain_module_id` / `source_domain_module_id` NULL on the FLEET-MGMT side until that domain modularizes. Schedule a FLEET-MGMT Validate b1 to clear this.
- **FLEET-MAINT (149) M1 owes:** same shape; 2 outbound TELEMATICS handoffs have NULL target module pending FLEET-MAINT modularization.
- **GRC (15) M1 owes (partial):** GRC may already have modules elsewhere but the 2 inbound handoffs from TELEMATICS show NULL target module. Verify on a GRC Validate pass.
- **INS-CLAIMS (44) M1 owes:** 1 inbound from TELEMATICS shows NULL target module pending INS-CLAIMS modularization. The friction-level=high / manual_handoff pattern also suggests this boundary is genuinely under-integrated and may deserve its own bilateral pass.
- **FMIS (154) cross-domain mis-routing:** inbound handoffs 966 + 968 may be mis-routed (see Bucket 2 #6 / Bucket 3 #1). The fix may live on the FMIS side (re-pointing the subscriber to AG-TELEMATICS once that domain exists) or on TELEMATICS (accepting the consumer dependency).
- **FLEET-MGMT B8 owes (inbound mirror):** once relationship B1-X1 / X2 / X3 are loaded outbound from TELEMATICS, the symmetric inbound rows live on FLEET-MGMT's B8 (not authored from this audit per Rule #11 / B8 asymmetry).

## 2026-05-31, Continuation: B1 technical fixes

Subagent continuation under domain-map-analyst. Applied only the truly-technical B1 fixes from the 2026-05-30 audit. All judgment items remain open for the user.

Loader: `.tmp_deploy/fix_telematics_b1_technical_2026_05_31.ts` (run from project root).

### Applied (16 writes across 3 fix types)

- **B1-S9 (5 PATCH):** `trigger_events.event_category` backfilled to the audit-recommended values: 994 `gps_waypoint.recorded` -> `lifecycle`, 995 `idle_event.detected` -> `threshold`, 996 `geofence.crossed` -> `threshold`, 997 `safety_scorecard.updated` -> `state_change`, 998 `fleet_vehicle.mileage_milestone_reached` -> `threshold`. All five were live-verified empty before write.
- **B1-U1..U4 (4 INSERT):** `data_object_relationships` user-edges per Rule #10, all four pre-specified tuples in the audit. New IDs 1920 (`dashcam_events reviewed by users`), 1921 (`driver_behavior_events attributed to users`), 1922 (`driver_safety_scorecards attributed to users`), 1923 (`eld_logs attributed to users`). Pattern (`many_to_many` / `reference` / `owner_side=source` / `is_required=false`) matches the catalog convention from existing user-edges (ids 1854..1856, etc.). `record_status` and `notes` omitted, falling back to defaults `'new'` and `''`.
- **B1-A1, A3, A4, A6, A7, A8, A11 (7 INSERT):** `handoff_processes` for the seven "confident L4" tuples with pre-specified `handoff_id` and a resolvable PCF `process_id`. New IDs 785..791. All seven handoffs + processes (862, 1543, 1607) verified live before insert. `proposal_source=agent_curated`, `record_status` and `notes` defaulted.

### Deferred (everything else)

- **B1-S1, S2, S6, S7, S8, S10, S11, M1..M5, R1..R10, X1..X3, B1..B5:** out of scope per task constraints (new entities / modules / DMDOs; B10b FK PATCHes gated on B1-S1; aliases without exact tuples; lifecycle states require user judgment on the four config-shape exemptions; skill rename gated on modules; intra-domain and cross-domain `data_object_relationships` are not user-edges).
- **B1-S3 (pattern flag flips):** task constraints exclude pattern-flag flips; also intersects Bucket 2 #2 (scope question on the position-telemetry masters).
- **B1-A2, A9, A10, A5:** A2 / A9 / A10 are marked "defer" in the audit (no resolvable PCF); A5 is an upgrade decision on the existing `discovery_substring` tag and depends on Bucket 2 #7 (handoff 312 retire / re-point), which is a judgment call.

### Live verification

- Pre-flight reads confirmed: tenant `ma@adenin.com`, module 1001 `domain_map`, all five trigger_events had `event_category=""`, all four source data_objects (376/377/378/734) exist, `users` platform_builtin id 748 present, no pre-existing user-edges on the four masters, no pre-existing `handoff_processes` rows for the seven candidate handoffs, PCFs 862 / 1543 / 1607 all live.
- No JWT errors. No `notes` writes. No `record_status` overrides.

### What still gates the rest of the audit

Bucket 2 #1 (module split shape) blocks every remaining B / E / F item. Until the user resolves the 2-module vs alternative split, B1-S6 handoff FKs, B1-S10/S11 skill rename, B1-S8 lifecycle states, B1-B1..B5 boundary fixes, B1-M1..M5 new entity inserts, B1-R*/X* relationship edges, and B1-A5 retire decision all stay open.

## 2026-05-31, Audit

### Summary

- Current footprint: domain id 148, 8 master data_objects (`vehicle_trips` 375, `driver_behavior_events` 376, `eld_logs` 377, `dashcam_events` 378, `gps_waypoints` 731, `idle_events` 732, `geofence_events` 733, `driver_safety_scorecards` 734) + 2 consumer rows (`fleet_vehicles` 370, `fleet_drivers` 371 from FLEET-MGMT); 6 capabilities (TEL-GPS-TRACKING, TEL-ELD-HOS, TEL-DRIVER-BEHAVIOR, TEL-DASHCAM-VIDEO, TEL-GEOFENCING, TEL-VEHICLE-DIAG); 9 solutions (8 primary: Samsara, Geotab, Motive, Verizon Connect, Webfleet, Trimble Transportation, Omnitracs One, Lytx DriveCam + 1 secondary: Azuga Fleet); 0 regulations; **0 `domain_modules` rows (M1 hard fail persists)**; 8 `trigger_events` (all 8 carry non-empty `event_category` after the 2026-05-31 continuation); 11 cross-domain `handoffs` touching TELEMATICS (8 outbound + 3 inbound; all 11 NULL on both module FKs); 4 `data_object_relationships` (all four user-edges loaded by the continuation; **zero intra-domain edges; zero cross-domain outbound edges**); 0 `data_object_aliases`; 0 `data_object_lifecycle_states`; 1 legacy `domain_id`-scoped system skill `telematics-system` (id 112) with 8 platform-tier query tools; 8 `handoff_processes` rows covering 8 of 11 handoffs (7 `agent_curated` from the continuation + 1 pre-existing `discovery_substring`; 3 handoffs untagged per the prior audit's deferral list: 315 dashcam-collision → INS-CLAIMS, 966 + 968 inbound from FMIS).
- Structural pass: A1/A2/A3 pass; A4 fails (catalog UX both empty). M1/M2/M6 hard fail (zero modules; the 6-capability domain is owed at least 2 full modules per Rule #14). B1/B2/B5/B9 pass; B6/B8/B11/B12 fail (zero relationships, aliases, lifecycle states); B7 passes after the 4 user-edges from the continuation; B4 fails (pattern flags all default false with no positive re-evaluation); B10b fails (all 11 handoffs NULL both module FKs). C1 passes (Logistics owner + Security / GRC contributors + HR consumer). D1 not run (no module-level UI to spot-check). E1-E6 vacuous (single legacy skill, no modules to wire roles against). F1 fails (legacy `telematics-system` still present). F2 fails (zero module-scoped system skills). F4 passes on the 8 legacy tools (all `query` with `data_object_id` set). F5 uncomputable per-module. H1 partial: 8 of 11 cross-domain handoffs covered; the 3 untagged (315, 966, 968) are the same defer-to-Discover-Pass-3 set called out on 2026-05-30 (FNOL workflow + agricultural payloads).
- **Bucket 1 (in-scope, agent fixable):** 0 items net-new (everything Bucket-1-fixable from the prior audit either (a) was applied on 2026-05-31 or (b) gates on Bucket 2 #1 module-split decision).
- **Bucket 2 (surface-for-user, judgment):** 7 items carried forward from 2026-05-30, all unresolved.
- **Bucket 3 (Phase 0 pending, speculative):** 4 candidates carried forward from 2026-05-30 (AG-TELEMATICS, driver_messages, vehicle_environmental_sensors, route_executions).

The domain remains structurally gated on the M-band (M1 zero-module hard fail). Until Bucket 2 #1 resolves the module split, every B-band/E-band/F-band remediation that needs a module FK stays parked. The 2026-05-31 continuation has cleared the trigger_event_category backfill (B1-S9), the four user-edges (B1-U1..U4), and the confident APQC tag set (B1-A1/A3/A4/A6/A7/A8/A11). The remaining `discovery_substring` row on handoff 312 is gated on Bucket 2 #7 (handoff 312 retire/re-point) so it stays as-is.

### Vendor surface basis

Carried forward from 2026-05-30: Samsara, Geotab, Motive, Verizon Connect, Lytx (DriveCam, video-telematics + driver-coaching specialist anchoring FMCSA / DOT compliance). Trimble Transportation, Webfleet, Omnitracs One, Azuga Fleet also linked but not enumerated as flagships. Compliance basis unchanged: FMCSA Part 395 (HOS / ELD), Part 396 (DVIR), Part 391 (driver qualification), IFTA, ISO 39001 (RTS), GDPR / CCPA on driver-attributed behavior data, insurance FNOL.

### Pass 3 - Neighbor discovery

Neighbor edges unchanged from 2026-05-30 (no new handoffs loaded since). FLEET-MGMT (147) remains the only weight-3+ neighbor; FLEET-MAINT (149), GRC (15), INS-CLAIMS (44), FMIS (154) summary-only. **Live check confirms every neighbor still has zero `domain_modules`**, so the entire NULL-module-FK story on handoffs continues to be owed by the neighbors as well.

### Bucket 1 - In-scope confirmed gaps

No new in-scope gaps emerged in this pass. The Bucket-1 backlog is the same set from 2026-05-30 minus the 16 writes applied 2026-05-31:

- **Applied 2026-05-31 (clear, no carry-forward):** B1-S9 (5 event_category PATCHes), B1-U1..U4 (4 user-edges), B1-A1/A3/A4/A6/A7/A8/A11 (7 APQC tags).
- **Carried forward but gated on Bucket 2 #1 (module split):** B1-S1 (module load itself), B1-S6 (handoff module FKs derive once modules exist), B1-S8 (lifecycle states need module assignment), B1-S10/S11 (skill rename to module-scoped agents).
- **Carried forward but gated on Bucket 2 #3 (DVIR ownership) / Bucket 2 #7 (handoff 312 fate):** B1-M1 DVIR, B1-A5 retire/upgrade of `discovery_substring` tag.
- **Carried forward, independently actionable:** B1-S2 (A4 catalog UX draft - draft and surface text to user per Rule #20 before write), B1-S3 (B4 pattern flag re-eval - PATCH four driver-attributed masters after user judgment on Bucket 2 #2), B1-S4 (10-edge intra-domain relationship baseline), B1-S5 already cured via B1-U1..U4, B1-S7 (8-12 alias rows), B1-M2 / M3 / M4 / M5 new entity inserts gated on Bucket 2 #1 + #3.

A4 / B1-S2 catalog UX is independently actionable because the buyer-voice draft does not depend on the module split (it's the domain-level landing copy, not module copy). Surfacing the draft for user review is the prerequisite per Rule #20.

### Bucket 2 - Surface-for-user (judgment calls)

All 7 items from 2026-05-30 remain unresolved and carry forward:

1. **Module split shape** - 2-module proposal (TELEMATICS-FLEET-TRACKING + TELEMATICS-COMPLIANCE-SAFETY) vs. alternatives. Gates everything in Bucket 1 that needs a module FK.
2. **Pattern-flag scope** on `vehicle_trips`, `gps_waypoints`, `idle_events`, `geofence_events` for `has_personal_content` (GDPR / CCPA reading on position telemetry tied to identifiable drivers).
3. **DVIR canonical ownership** - separate `dvir_inspections` under TELEMATICS-COMPLIANCE-SAFETY vs. extend FLEET-MGMT `vehicle_inspections` with a `kind` discriminator vs. move ownership.
4. **Cross-catalog `notify_team.coverage_tier`** resolution before Phase-S authoring for TELEMATICS modules.
5. **Final `event_category` values** for the 5 backfilled rows - the 2026-05-31 continuation applied the recommended mapping (lifecycle / threshold / threshold / state_change / threshold) but Bucket 2 #5 was framed as a confirmation ask; if the user dissents, the PATCH reverts.
6. **FMIS inbound routing** (handoffs 966 + 968 on `variable_rate_prescriptions` + `machinery_telemetry_records`) - drop as mis-routed vs. add `consumer` DMDOs vs. queue AG-TELEMATICS.
7. **Handoff 312 fate** - DELETE vs. re-point vs. leave-with-debt-flag.

### Bucket 3 - Phase 0 pending (speculative)

All 4 candidates from 2026-05-30 carry forward with no change:

| Candidate | Recommendation | Vendor evidence basis |
|---|---|---|
| AG-TELEMATICS (candidate new domain) | Phase 0 vendor research (John Deere Operations Center, Trimble Ag, AGCO Fuse, Topcon Ag, CNH Industrial AFS Connect); coordinated with Bucket 2 #6 | FMIS inbound handoffs 966 + 968 suggest the intended subscriber was a hypothetical AG-TELEMATICS sibling |
| `driver_messages` / dispatch messaging | Phase 0 research; possible scope-creep into a FLEET-DISPATCH candidate | Samsara, Motive, Verizon Connect all surface driver-dispatch chat |
| `vehicle_environmental_sensors` (cargo temperature, door open, asset trailer) | Phase 0 research | Samsara, Geotab promote IoT / cold-chain telemetry as a tier |
| `route_executions` (planned-vs-actual reconciliation) | Phase 0 research; ambiguous between TELEMATICS and a TMS / FLEET-DISPATCH candidate | Verizon Connect Reveal, Samsara surface route planning + execution comparisons |

### Cross-bucket dependencies

- Bucket 2 #1 (module split) gates B1-S1, S6, S8, S10, S11 and all Bucket-1 M-band entity inserts (M1-M5).
- Bucket 2 #2 (pattern-flag scope) gates B1-S3 patch scope.
- Bucket 2 #3 (DVIR ownership) gates B1-M1.
- Bucket 2 #6 (FMIS routing) gates B1-A9 / A10 deferral resolution and Bucket 3 #1.
- Bucket 2 #7 (handoff 312 fate) gates B1-A5 (the existing `discovery_substring` tag becomes moot if 312 retires).

### Report-only follow-ups (owed by other domains)

All five carried forward from 2026-05-30. Live check confirms each neighbor still has zero `domain_modules`:

- **FLEET-MGMT (147) M1 owes:** zero modules; 4 outbound TELEMATICS handoffs into 147 plus 1 inbound from 147 carry NULL on the FLEET-MGMT side of `target_domain_module_id` / `source_domain_module_id` pending its modularization.
- **FLEET-MAINT (149) M1 owes:** zero modules; 2 outbound TELEMATICS handoffs have NULL target module.
- **GRC (15) M1 owes:** zero modules in scope here; 2 inbound to GRC have NULL target module.
- **INS-CLAIMS (44) M1 owes:** zero modules; 1 inbound from TELEMATICS has NULL target module.
- **FMIS (154) cross-domain mis-routing:** the 966 + 968 routing question may be a fix on FMIS rather than TELEMATICS (see Bucket 2 #6 + Bucket 3 #1).
- **FLEET-MGMT B8 owes (inbound mirror):** symmetric to B1-X1 / X2 / X3 from the prior audit (intra-FLEET-MGMT side of `vehicle_trips ↔ fuel_transactions` and `driver_behavior_events / driver_safety_scorecards ↔ fleet_drivers`).

## 2026-06-02 Audit (modularization)

### Summary

Scope was deliberately narrow: build the `domain_modules` set and wire the existing capabilities and data_objects into it. No new data_objects, capabilities, lifecycle states, relationships, aliases, skills, tools, or handoffs were created. The long-standing M1 / M2 / M6 hard fail (zero modules) is now cleared; the domain is structurally deployable for the first time.

The 2026-05-30 / 05-31 audits proposed a 2-module split and parked it on Bucket 2 #1 (B2-MODULE-SPLIT). That split is adopted here as authored by this modularization pass. The user can still re-cut it (the 3-module TELEMATICS-VIDEO-COACHING variant) but the 2-module shape is now live and consistent with the prior proposal and the FLEET-MGMT adjacency.

### Modules authored (both `module_kind=full`)

- **TELEMATICS-FLEET-TRACKING** (id 306) - "Fleet Tracking and Telemetry". Position-and-utilization data layer.
  - Capabilities: TEL-GPS-TRACKING (410), TEL-GEOFENCING (414), TEL-VEHICLE-DIAG (415).
  - Masters: `vehicle_trips` (375), `gps_waypoints` (731), `idle_events` (732), `geofence_events` (733).
  - Consumers: `fleet_vehicles` (370, FLEET-MGMT-mastered), `fleet_drivers` (371, FLEET-MGMT-mastered).
- **TELEMATICS-COMPLIANCE-SAFETY** (id 307) - "Compliance and Driver Safety". FMCSA HOS leg + video-and-coaching surface.
  - Capabilities: TEL-ELD-HOS (411), TEL-DRIVER-BEHAVIOR (412), TEL-DASHCAM-VIDEO (413).
  - Masters: `eld_logs` (377), `dashcam_events` (378), `driver_behavior_events` (376), `driver_safety_scorecards` (734).
  - Consumers: `fleet_drivers` (371, FLEET-MGMT-mastered).

### Catalog-wide master pre-check (M7, MANDATORY)

Ran `/domain_module_data_objects?data_object_id=eq.<id>&role=eq.master` for all 10 footprint data_objects before any write:

- The 8 in-domain masters (375, 731, 732, 733, 377, 378, 376, 734) had ZERO pre-existing master rows catalog-wide. All assigned `master` here, each in exactly one TELEMATICS module. No demotions to `embedded_master` were needed.
- `fleet_vehicles` (370) is mastered by FLEET-MGMT-VEHICLE-LIFECYCLE (module 204); `fleet_drivers` (371) by FLEET-MGMT-DRIVER-OPS (module 205). Both preserved at their existing `consumer` / `required` role here. No master promotion.

Post-write re-check confirms exactly 8 master rows across the two modules (one per in-domain master), each catalog-wide-unique.

### Structural verification

- Rule #14: 5-capability domain => >=2 full modules. Two `full` modules authored. PASS.
- M4: every capability placed in >=1 module (5/5, no overlap). PASS.
- M6 / no-empty-module: each module has >=1 capability AND >=1 data_object. PASS.
- M7 single-master in-domain AND catalog-wide: every master appears once. PASS.
- Non-master roles preserved: both consumer rows unchanged. PASS.

### Loader

`.tmp_deploy/modularize_telematics_2026-06-02.ts` (idempotent; re-reads modules after insert for the code->id map; run from project root). Writes: 2 `domain_modules`, 6 `domain_module_capabilities`, 11 `domain_module_data_objects`. No `record_status`, no `notes`, no `catalog_*` on modules.

### What this pass did NOT touch (deferred, owned by a future full Validate)

Everything outside modules + entity assignment stays open and is re-keyed in state.yaml against the now-live module ids:

- B1B-S1-MODULE-LOAD and B2-MODULE-SPLIT are RESOLVED by this pass (modules now exist; the prior B1A-BUILD triage item is likewise satisfied).
- Still owed, now unblocked on the module FK but out of this pass's scope: handoff module-FK backfill (11 handoffs), intra-domain relationship edges (10), cross-domain outbound edges (3), aliases (8-12), lifecycle states (4 workflow masters + 4 config-shape exemptions), pattern-flag re-eval, missing compliance entities (dvir_inspections, hos_certifications, driver_coaching_sessions, ifta_jurisdiction_summaries, fault_codes).
- New this pass: per-module system skills (Rule #17 -> F2 / F3) are now owed - two module-scoped `<module>_agent` skills must replace legacy `telematics-system` (skill 112). Module-level catalog UX copy (M8) is owed on both new `domain_modules.catalog_*`, and the domain-level A4 tagline/description remain empty.

### Report-only follow-ups (unchanged, owed by neighbors)

FLEET-MGMT, FLEET-MAINT, GRC, INS-CLAIMS, FMIS module-FK obligations on the 11 TELEMATICS-touching handoffs persist. The source-side FK is now derivable (TELEMATICS modules exist); the target-side stays NULL pending each neighbor's modularization.

## 2026-06-06 - b1a execution

Executed both pending b1a items against the live `domain_map` module for TELEMATICS (domain 148). Both are FULLY RESOLVED and removed from state.yaml.

### B1A-F2-MODULE-SYSTEM-SKILLS - DONE

Phase S, Rule #17. Authored one module-scoped system skill per module and retired the legacy domain-level skill.

- `skills` inserts (record_status defaulted to `new`, omitted on insert):
  - id **314** `telematics_fleet_tracking_agent` (skill_type=system, domain_id=148, domain_module_id=306)
  - id **315** `telematics_compliance_safety_agent` (skill_type=system, domain_id=148, domain_module_id=307)
- `skill_tools` re-link (PATCH `skill_id` only; row ids, tool_ids, requirement_level=`required` all preserved). The 8 platform-tier `query_*` tools (tool ids 717-720, 847-850) were re-pointed from legacy skill 112 to the module that masters each tool's data_object:
  - st 864 (query_vehicle_trips, do 375): skill 112 -> 314
  - st 1010 (query_geofence_events, do 733): skill 112 -> 314
  - st 1011 (query_gps_waypoints, do 731): skill 112 -> 314
  - st 1012 (query_idle_events, do 732): skill 112 -> 314
  - st 865 (query_driver_behavior_events, do 376): skill 112 -> 315
  - st 866 (query_eld_logs, do 377): skill 112 -> 315
  - st 867 (query_dashcam_events, do 378): skill 112 -> 315
  - st 1013 (query_driver_safety_scorecards, do 734): skill 112 -> 315
  - Result: skill 314 holds 4 skill_tools (fleet-tracking masters), skill 315 holds 4 (compliance-safety masters). All 8 tools are `operation_kind=query` with non-null data_object_id and `coverage_tier=platform`, so F4 holds.
- `skills` DELETE: legacy skill **112** `telematics-system` deleted after its skill_tools were re-linked (zero remaining). Prior values snapshotted for reversibility: `{id:112, skill_name:"telematics-system", skill_type:"system", domain_id:148, domain_module_id:null, record_status:"new", description:"System skill for Vehicle Telematics - runtime workflows over the domain's master data, derived from masters + cross-domain handoffs."}`.
- Note on the task brief's `extra_tool_ids` / "skill_tools ids 717..850": those numbers are the `tools.id` values (one query tool per master), not the `skill_tools.id` values. The actual skill_tools rows on legacy skill 112 were ids 864-867 and 1010-1013; those are the rows that were PATCHed.
- F1/F2/F3 now pass for TELEMATICS: legacy domain-level system skill gone, exactly one system skill per module, each with >=1 skill_tools.

### B1A-M8-MODULE-CATALOG-UX - DONE

Rule #20 (revised) / Rule #6 of the task brief: wrote buyer-voice copy directly into the EMPTY catalog fields with an empty-guard per field (write only where current value was empty). All three rows had both fields empty, so all six fields were written. record_status on each row carries the review signal; no draft parked in this file as a stand-in. PATCH (no prior non-empty value overwritten):

- `domains` id 148: wrote `catalog_tagline` + `catalog_description` (was empty/empty).
- `domain_modules` id 306 (TELEMATICS-FLEET-TRACKING): wrote `catalog_tagline` + `catalog_description` (was empty/empty).
- `domain_modules` id 307 (TELEMATICS-COMPLIANCE-SAFETY): wrote `catalog_tagline` + `catalog_description` (was empty/empty).

Copy is buyer voice (workflow + value), no vendor/product names, no em-dashes, American English.

### Skipped / blocked

Nothing in b1a was skipped (no `user_decision` blockers on the two b1a items). All b1b items remain blocked as previously keyed (relationship-authoring / alias / lifecycle passes out of scope, user-decision gates, neighbor modularization).

### Post-execution next_action_by

b1a is now empty; b2 carries open user-judgment items (B2-PERSONAL-CONTENT-SCOPE, B2-LIFECYCLE-EXEMPTIONS, B2-DVIR-OWNERSHIP, B2-NOTIFY-TEAM-COVERAGE-TIER, B2-EVENT-CATEGORY-CONFIRMATION, B2-FMIS-INBOUND-ROUTING, B2-HANDOFF-312-FATE). `next_action_by: user`.

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELLED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.
