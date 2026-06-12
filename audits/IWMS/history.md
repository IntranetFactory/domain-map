# IWMS audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 5 full modules (`IWMS-LOCATION-MASTER`, `IWMS-DESK-RESERVATION`, `IWMS-ROOM-RESERVATION`, `IWMS-WORKPLACE-SERVICE-DESK`, `IWMS-SPACE-ANALYTICS`) on host `IWMS` (id 23). 0 cross-cutting hosted modules via `domain_module_host_domains`. 6 masters (`locations`, `desk_bookings`, `room_reservations`, `workplace_service_requests`, `space_utilization_reports`, `workplace_experience_feedback`). 7 capabilities (`REAL-PROPERTY-MGMT`, `REAL-SPACE-OPTIM`, `REAL-LEASE-MGMT`, `REAL-MAINTENANCE`, `REAL-OCCUPANCY-ANALYTICS`, `REAL-UTILITY-TRACKING`, `REAL-CAPITAL-PROJECTS`). 12 solutions (8 primary, 4 secondary). 12 trigger_events (9 with empty `event_category`, 3 with `state_change`). 4 outbound + 4 inbound cross-domain handoffs (8 cross-domain total). 2 intra-domain cross-module handoffs (1167 ROOM->ANALYTICS, 1168 DESK->ANALYTICS). 14 aliases. 23 lifecycle states across the 3 workflow-bearing masters (`desk_bookings`, `room_reservations`, `workplace_service_requests`); 0 states across the 3 config-shaped / report-shaped masters (`locations`, `space_utilization_reports`, `workplace_experience_feedback`). 0 system skills + 0 `skill_tools` rows (Semantius score uncomputable). 4 IWMS roles (`FACILITIES-WORKPLACE-MANAGER`, `FACILITIES-SPACE-PLANNER`, `FACILITIES-WORKPLACE-COORDINATOR`, `EMPLOYEE-WORKPLACE-USER`), each meeting the 2-module floor.

- **Vendor-surface basis (Pass 2 flagship enumeration):** Eptura Workplace (consolidating Condeco, iOFFICE, SpaceIQ, Archibus), Planon Workplace, Robin, Envoy Workplace, IBM TRIRIGA, Archibus, Spacewell, MRI OnCore, Accruent Resolute, ServiceNow Workplace Service Delivery, Yardi Voyager (real-estate adjacency), Honeywell Forge Building Operations (BMS adjacency). Adjacent specialist coverage from Tactic, Officely, Zynq, SiQ (room/desk reservation pure-plays), Nuvolo (CMMS overlap), FM:Systems (Eptura-acquired), Tango (workplace planning), Rifiniti (occupancy analytics). Compliance anchors: OSHA workplace safety (US), local building / fire codes per jurisdiction, GDPR (employee booking data), CCPA (US employee data); none of these are loaded as `domain_regulations` rows on IWMS today.

- **Bucket 1 (in-scope, agent fixable):** 13 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 4 items.

**Neighbor discovery** (auto-derived from `handoffs` + cross-domain DMDO + cross-domain relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| REAL-EST | 1 | 1 | 0 (floor_plans consumed as `optional`, no master DMDO row on REAL-EST side) | 0 | 2 | Pairwise (full, weight equal to threshold) |
| IGA | 1 | 0 | 0 | 0 | 1 | Lightweight |
| HCM | 1 | 0 | 1 (employees consumed `optional` on DESK / ROOM) | 0 | 2 | Pairwise (full) |
| FIN | 1 | 0 | 1 (cost_centers embedded on DESK / WSD) | 0 | 2 | Pairwise (full) |
| ONBOARDING | 0 | 1 | 0 | 1 (onboarding_tasks emits workplace_service_requests row 75) | 2 | Pairwise (full) |
| VIS-MGMT | 0 | 0 | 0 | 0 | 0 (no edge today, expected based on flagship vendors, surfaced as boundary gap) | Lightweight |
| EAM | 0 | 0 | 0 | 0 | 0 (expected based on flagship vendors, surfaced as boundary gap) | Lightweight |
| ESG | 0 | 0 | 0 | 0 | 0 (expected based on ESG occupancy-signal handoff, surfaced as boundary gap) | Lightweight |

**Structural pass bands.**

- **A1 pass.** Domain row has all 7 business-metadata fields populated (`crud_percentage=85`, `business_logic` non-empty, `min_org_size='30 m <2500'`, `cost_band='$$$'`, `certification_required=false`, `usa_market_size_usd_m=1500`, `market_size_source_year=2025`).
- **A2 pass.** 7 capabilities linked.
- **A3 pass.** 12 solutions linked, 8 primary, every row has `coverage_level` set.
- **M1 pass.** 5 modules.
- **M2 pass.** Capability count 7 >= 3, module count 5 >= 2.
- **M4 partial-fail.** All 7 capabilities have a realizing module via `domain_module_capabilities`, but the assignment leaves `IWMS-ROOM-RESERVATION` (100) with zero realized capabilities, see M6.
- **M5 pass.** The two lifecycle states with `requires_permission=true` (660 triage_service_request on workplace_service_requests, 662 resolve_service_request) carry `domain_module_id=101`; correct.
- **M6 hard-fail.** Module `IWMS-ROOM-RESERVATION` (100) has zero rows in `domain_module_capabilities`. Every other IWMS module realizes >=1 capability.
- **M7 pass.** Catalog-wide single-master holds on all 6 masters. Within-domain coherence is clean (every `embedded_master` co-exists with a sibling-module `master`, no `consumer + master` collisions inside the domain).
- **B1 pass.** 6 masters in `domain_module_data_objects`.
- **B2 / B3 pass.** All masters have labels and pass naming-arbitration.
- **B4 partial.** Pattern flags are mostly set positively (`has_personal_content=true` on desk_bookings, room_reservations, workplace_service_requests, workplace_experience_feedback), but `has_submit_lock=false` everywhere and `has_single_approver=false` everywhere. The submit-lock flag deserves a positive re-evaluation per Rule #12 for `desk_bookings` / `room_reservations` (check-in locks the booking from edits), see B2-S4.
- **B5 pass.** Every `embedded_master` row (locations, cost_centers, org_units) has a canonical `master` row in the catalog. `locations` is canonically mastered in IWMS-LOCATION-MASTER (98); `cost_centers` and `org_units` are external masters with canonical rows elsewhere in the catalog.
- **B6 partial.** Intra-domain master-to-master edges exist (locations->desk_bookings 1030, locations->room_reservations 1031, locations->workplace_service_requests 1032, locations->space_utilization_reports 1033, locations->workplace_experience_feedback 1034 optional, plus the locations self-edge `rolls_up_to` 979). The graph is locations-centric only, no `desk_bookings <-> workplace_experience_feedback` or `room_reservations <-> space_utilization_reports` direct edges. Acceptable since the analytics master deliberately reads everything via locations.
- **B7 pass.** Every workflow-bearing master has a `users` edge (1035 books_desks, 1036 organizes_room_reservations, 1037 requests_workplace_services, 1038 assigned_to_workplace_services, 1039 authors_workplace_feedback). `locations` carries `houses` users edge (981).
- **B8 partial.** Outbound cross-domain relationship edges are missing for several outbound handoffs: handoff 869 (DESK->HCM workplace_feedback.submitted) needs a `workplace_experience_feedback flows_into <HCM master>` row; handoff 870 (ANALYTICS->REAL-EST space_utilization.measured) needs a `space_utilization_reports signals <REAL-EST master>` row; handoff 1166 (WSD->FIN workplace_service_request.resolved) needs a `workplace_service_requests chargebacks_to <FIN master>` row; handoff 1165 (DESK->IGA desk_booking.checked_in) needs a `desk_bookings provisions <IGA master>` row.
- **B9 partial-fail.** 9 of 12 `trigger_events` carry empty `event_category` (Rule #13 enum must be one of `lifecycle / state_change / threshold / signal`): 940 floor_plan.created, 941 floor_plan.updated, 968 desk_booking.created, 969 desk_booking.cancelled, 970 room_reservation.created, 971 workplace_service_request.submitted, 972 workplace_service_request.completed, 973 space_utilization.measured, 974 workplace_feedback.submitted. The 3 events created in the modularization pass (1249 desk_booking.checked_in, 1250 workplace_service_request.resolved, 1251 room_reservation.no_show) have `event_category='state_change'`.
- **B9b partial-fail.** Only 2 intra-domain cross-module handoffs loaded on a 5-module domain (1167 ROOM->ANALYTICS, 1168 DESK->ANALYTICS). Expected from the master relationship graph: (a) LOCATION-MASTER->all-modules on `location.created` so every module's spatial anchor stays in sync, (b) DESK->ANALYTICS on `desk_booking.cancelled` and `desk_booking.completed` (not just `.checked_in`), (c) ROOM->ANALYTICS on `room_reservation.completed`, (d) WSD->ANALYTICS on `workplace_service_request.resolved` (already an outbound to FIN, but ANALYTICS also wants this signal for time-to-resolve metrics). Surface 5 candidate intra-domain handoffs in Bucket 1.
- **B10b partial-fail.** 2 of 4 outbound handoffs and 1 of 4 inbound handoffs carry NULL on the cross-side module FK; routed to report-only.
- **B11 pass.** 14 aliases covering all workflow-bearing masters.
- **B12 partial.** `desk_bookings`, `room_reservations`, `workplace_service_requests` carry full lifecycle state machines. `locations`, `space_utilization_reports`, `workplace_experience_feedback` carry zero states; the exemption is recorded in `data_objects.notes` for all three. That recording violates Rule #15 (the prior license for config-shape exemption notes in `data_objects.notes` is RESCINDED), see B2-S2.
- **C1 pass.** `Facilities and Real Estate` owner + `Human Resources` contributor on `business_function_domains`.
- **C2.** Not assessed in this audit (capability spine review out of scope for the structural pass).
- **D1.** UI spot-check not performed in this audit pass.
- **E1 pass.** 4 distinct roles linked to IWMS modules.
- **E2 pass.** All 4 roles touch >=2 modules.
- **E3 pass.** Every `role_modules` row carries `interaction_level`.
- **E4.** Not enumerated in this audit; assumed clean since structural loaders populate bundles at insert time.
- **E5.** Not assessed in this audit.
- **E6.** No new workflow-gate permissions added; non-blocking.
- **F1 pass.** No legacy domain-level `system` skills on IWMS.
- **F2 hard-fail.** **0 system skills across all 5 modules** (`/skills?domain_module_id=in.(98,99,100,101,102)&skill_type=eq.system` returns `[]`). Rule #17 requires exactly one `system` skill per `domain_modules` row. This is a Phase-A obligation that was missed at load.
- **F3 hard-fail.** 0 `skill_tools` rows (cascading from F2).
- **F4.** N/A until F2 cures.
- **F5.** Semantius score uncomputable for every IWMS module (cascading from F2).
- **F7.** N/A until F2/F3 cure.
- **H1 hard-fail.** 1 of 8 cross-domain handoffs tagged (handoff 6 ONBOARDING->WSD on `task.workplace_setup_required`, `proposal_source='discovery_override'`, `record_status='new'`). 0 `agent_curated`. 0 `record_status='approved'`. Coverage 0 of 8 approved; volume expectation per H1 is 0.5N to 0.8N = 4 to 6 new `agent_curated` tags during this audit.

**Per-master S3 sweep:**

| data_object | states | events | aliases |
|---|---|---|---|
| locations | 0 (config-shape per `data_objects.notes`) | 0 | 6 |
| desk_bookings | 6 | 4 (created, cancelled, checked_in, plus state name reuse) | 3 |
| room_reservations | 6 | 2 (created, no_show) | 2 |
| workplace_service_requests | 5 | 2 (submitted, completed) + 1 (resolved) | 3 |
| space_utilization_reports | 0 (config-shape) | 1 (measured) | 0 |
| workplace_experience_feedback | 0 (store-and-forget) | 1 (submitted) | 0 |

IWMS Semantius score: **uncomputable** (0 `skill_tools` rows). F5 rollup reports the uncomputability rather than a low score; cure via F2 / F3.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M6 hard-fail, capability-orphaned module** | `IWMS-ROOM-RESERVATION` (100) has zero rows in `domain_module_capabilities`. Every other IWMS module realizes a capability; ROOM realizes none. The cleanest match is `REAL-SPACE-OPTIM` (374; already realized by DESK-RESERVATION and SPACE-ANALYTICS, fits since room booking is a space-allocation flow); the alternate is to author a new capability like `REAL-MEETING-MGMT` covering meeting-room operations distinct from open-space optimization. The audit default is the existing `REAL-SPACE-OPTIM` link to clear M6; the new-capability path is a Bucket 2 design call. | INSERT `domain_module_capabilities` (domain_module_id=100, capability_id=374). |
| B1-S2 | **F2 hard-fail (Rule #17), 0 system skills on 5 modules** | The catalog has zero `skill_type='system'` skills anchored on any IWMS module (`/skills?domain_module_id=in.(98,99,100,101,102)&skill_type=eq.system` returns `[]`). Rule #17 is a Phase-A obligation: one system skill per `domain_modules` row, each with >=1 `skill_tools` row. The Semantius score is uncomputable until this is cured. | Author 5 system skills: `iwms_location_master_agent`, `iwms_desk_reservation_agent`, `iwms_room_reservation_agent`, `iwms_workplace_service_desk_agent`, `iwms_space_analytics_agent`, each anchored on the matching `domain_module_id`. Bundle 5-12 `skill_tools` rows per skill, mix of `query` / `mutate` / workflow-gate (for WSD: `triage_service_request`, `resolve_service_request`) tools. Cures F2 / F3 / F4 / F5 / F7 together. |
| B1-S3 | **B9 missing event_category** | 9 trigger_events carry empty `event_category` (Rule #13 enum): 940 floor_plan.created, 941 floor_plan.updated, 968 desk_booking.created, 969 desk_booking.cancelled, 970 room_reservation.created, 971 workplace_service_request.submitted, 972 workplace_service_request.completed, 973 space_utilization.measured, 974 workplace_feedback.submitted. | PATCH: 940 -> `lifecycle`, 941 -> `state_change`, 968 -> `lifecycle`, 969 -> `state_change`, 970 -> `lifecycle`, 971 -> `lifecycle`, 972 -> `state_change`, 973 -> `signal`, 974 -> `lifecycle`. Note: 940 / 941 are emitted by `floor_plans` (id 346) which is mastered in REAL-EST, not IWMS; routing for the PATCH is still IWMS-side since these events were loaded into the IWMS audit perimeter, but flag as B2-S5 review whether `floor_plans` events should be owned by REAL-EST instead. |
| B1-S4 | **B9b partial-fail, missing intra-domain cross-module handoffs** | A 5-module domain has only 2 intra-domain cross-module handoffs (1167 ROOM->ANALYTICS on `room_reservation.no_show`, 1168 DESK->ANALYTICS on `desk_booking.checked_in`). Expected pairs from the relationship graph + lifecycle states: (a) LOCATION-MASTER->all (4 sibling modules) on `location.created` so every module's spatial anchor stays in sync, this needs a new `location.created` trigger event since `locations` has no event today; (b) DESK->ANALYTICS on `desk_booking.cancelled` (969) and `desk_booking.completed` (no event today, needs new); (c) ROOM->ANALYTICS on `room_reservation.completed` (no event today, needs new); (d) WSD->ANALYTICS on `workplace_service_request.resolved` (1250) for time-to-resolve metrics, parallel to the existing outbound to FIN. | Author up to 7 intra-domain handoff rows with `source_domain_id=target_domain_id=23`, `integration_pattern='lifecycle_progression'`, `friction_level='low'`, paired with up to 3 new `trigger_events` (`location.created`, `desk_booking.completed`, `room_reservation.completed`). The LOCATION-MASTER fan-out can be 1 event + 4 handoff rows (one per subscribing module). Total: 7 handoff rows + 3 event rows. |
| B1-S5 | **B10b report-only (outbound NULLs owed by other domains)** | 2 of 4 outbound handoffs carry NULL `target_domain_module_id`: 869 (HCM, `workplace_feedback.submitted`->workplace_experience_feedback), 870 (REAL-EST, `space_utilization.measured`->space_utilization_reports), 1166 (FIN, `workplace_service_request.resolved`->workplace_service_requests). Handoff 1165 (IGA, target_module 148 IGA-AUTO-PROVISIONING) is fully populated. Per B10b's asymmetry rule the target module is the target domain's audit work. IWMS's own side (`source_domain_module_id`) is populated on every outbound row. | Schedule b1 audits for HCM, REAL-EST, FIN to derive their `target_domain_module_id` per the standard B10b backfill procedure. |
| B1-S6 | **B10b report-only (inbound NULLs owed by source domains)** | 1 of 4 inbound handoffs carries NULL `source_domain_module_id`: 858 (REAL-EST, `floor_plan.updated`->floor_plans, target 102 ANALYTICS populated, source NULL). Handoffs 6 (ONBOARDING source 35), 1167, 1168 (IWMS self) are fully populated. | Schedule b1 audit for REAL-EST to populate `source_domain_module_id` on handoff 858. |
| B1-S7 | **Pairwise, missing consumer DMDOs on downstream domains** | Several IWMS outbound handoffs imply consumer DMDOs on the target side that do not exist (verified via `domain_module_data_objects` queries above): HCM consumes `workplace_experience_feedback` (handoff 869) but no HCM module declares; REAL-EST consumes `space_utilization_reports` (handoff 870) but no REAL-EST module declares; FIN consumes `workplace_service_requests` (handoff 1166) but no FIN module declares; IGA consumes `desk_bookings` (handoff 1165) but no IGA module declares (IGA-AUTO-PROVISIONING 148 is the target but lacks a DMDO row on `desk_bookings`). | Each target domain's b1 audit adds a `consumer` DMDO row on the relevant IWMS master in the receiving module. Not IWMS's fix to make; surface in this audit so the target audits can pick it up. |
| B1-S8 | **B8 missing cross-domain relationship rows** | 4 outbound handoffs lack a matching `data_object_relationships` edge in the payload->target direction (B8 outbound check): handoff 869 needs `workplace_experience_feedback flows_into <HCM master>`; 870 needs `space_utilization_reports signals <REAL-EST master>`; 1166 needs `workplace_service_requests chargebacks_to <FIN master>`; 1165 needs `desk_bookings provisions <IGA master>`. | Author 4 outbound cross-domain `data_object_relationships` rows once the target-side master FK is identifiable. The candidate target masters need a small lookup at fix time. |

#### APQC TAGGING

8 cross-domain handoffs total. 1 already tagged (handoff 6 with `proposal_source='discovery_override'`, on PCF 224 `Manage employee onboarding`, kept as-is). The remaining 7 are tagged below per the analyst's structural-pass model:

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id (lookup needed) | Confidence |
|---|---|---|---|---|---|---|
| 869 | IWMS-DESK-RESERVATION -> HCM | `workplace_feedback.submitted` | `workplace_experience_feedback` | Manage employee engagement / Manage employee voice | needs PCF lookup at fix time | confident L3 |
| 870 | IWMS-SPACE-ANALYTICS -> REAL-EST | `space_utilization.measured` | `space_utilization_reports` | Manage physical infrastructure / Manage real estate (10778 area) | needs PCF lookup | confident L3 |
| 1166 | IWMS-WORKPLACE-SERVICE-DESK -> FIN | `workplace_service_request.resolved` | `workplace_service_requests` | Process accounts payable / Manage facilities cost allocation | needs PCF lookup | medium |
| 1165 | IWMS-DESK-RESERVATION -> IGA | `desk_booking.checked_in` | `desk_bookings` | Manage user access controls / Provision and grant access | needs PCF lookup | confident L3 |
| 858 | REAL-EST -> IWMS-SPACE-ANALYTICS | `floor_plan.updated` | `floor_plans` | Manage real estate / Maintain facilities | needs PCF lookup | confident L3 |
| 1167 | IWMS-ROOM-RESERVATION -> IWMS-SPACE-ANALYTICS | `room_reservation.no_show` | `room_reservations` | Manage facilities operations / Optimize space utilization | needs PCF lookup | medium (intra-domain) |
| 1168 | IWMS-DESK-RESERVATION -> IWMS-SPACE-ANALYTICS | `desk_booking.checked_in` | `desk_bookings` | Manage facilities operations / Optimize space utilization | needs PCF lookup | medium (intra-domain) |

7 candidate APQC tags. The PCF id column requires `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry` lookups at fix time; the structural pass produced the proposed-row names and confidence ratings. Bucket 1 count for APQC TAGGING is 7 (the existing tag on handoff 6 is not counted as new work; it stays).

#### Bucket 1 count summary

| Finding type | Count |
| --- | --- |
| STRUCTURAL (M6 + F2 + B9 events + B9b + B10b report-only x2) | 6 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| BOUNDARY (Pairwise missing DMDOs + cross-relationship edges report-only / in-scope) | 2 |
| APQC TAGGING | 1 (H1 item: 7 individual tags inside) |
| MODULARIZATION ISSUES | 0 (always 0 in Bucket 1) |
| **Bucket 1 total (distinct B1-S* / B1-H1 items)** | 9 |

Note: F2 (B1-S2) is one item per the counting convention even though it cascades to 5 system skills + 25 to 60 `skill_tools` rows. APQC TAGGING (B1-H1) is one item even though it covers 7 individual tags. B1 distinct item count = 9. With cross-bucket dependencies + pairwise findings the per-bucket inventory below lists 13 individual fix surfaces, kept as separate IDs to keep the loader plan legible.

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation)

For each of the 5 in-graph neighbors (edge weight >=2; threshold relaxed to 2 for IWMS since no neighbor exceeds 2 in the cross-domain edge count) the 5-section pairwise diff produced the following per-neighbor findings.

**REAL-EST <-> IWMS (weight 2).** Wired pairs: 2 (870 IWMS-SPACE-ANALYTICS -> REAL-EST `space_utilization.measured`; 858 REAL-EST -> IWMS-SPACE-ANALYTICS `floor_plan.updated`). Section 2: 870 has NULL `target_domain_module_id` (REAL-EST's B10b); 858 has NULL `source_domain_module_id` (REAL-EST's B10b). Section 3: missing handoffs the catalog implies: (a) REAL-EST -> IWMS on `commercial_lease.executed` / `lease.renewed` (REAL-EST presumably masters leases, the IWMS-LOCATION-MASTER should subscribe to refresh occupancy and chargeback bases), (b) IWMS -> REAL-EST on `location.created` (IWMS-LOCATION-MASTER is the canonical master of locations, REAL-EST presumably consumes the registry to anchor lease records; one-event multi-subscriber pattern). Section 4: clean. Section 5: no cross-relationship rows currently linking IWMS masters to REAL-EST masters; `space_utilization_reports signals <REAL-EST>` and `floor_plans renders <IWMS locations>` are both missing. Flag B8-shaped follow-ups for both sides.

**HCM <-> IWMS (weight 2).** Wired pairs: 1 (869 DESK -> HCM `workplace_feedback.submitted`). Section 2: 869 has NULL `target_domain_module_id` (HCM's B10b). Section 3: missing handoffs: (a) HCM -> IWMS on `employee.terminated` (revoke desk bookings / room reservations), (b) HCM -> IWMS on `employee.hired` (provision workplace-user role), (c) HCM -> IWMS on `position.relocated` (move-orders surface, candidate B3 entity). Section 4: `employees` consumed `optional` on DESK / ROOM is clean (lite-flow plays without HCM). Section 5: no IWMS->HCM cross-relationship row exists for `workplace_experience_feedback flows_into <HCM employee feedback>`; B8 outbound gap.

**FIN <-> IWMS (weight 2).** Wired pairs: 1 (1166 WSD -> FIN `workplace_service_request.resolved`). Section 2: 1166 has NULL `target_domain_module_id` (FIN's B10b). Section 3: missing handoff IWMS -> FIN on `location.created` / `cost_center.allocated` would push a chargeback target list, but that may already live in `cost_centers` semantics; defer judgment to Phase 0 in Bucket 3. Section 4: `cost_centers` embedded `optional` on DESK / WSD is clean. Section 5: missing cross-relationship `workplace_service_requests chargebacks_to <FIN AP master>`; B8 outbound gap.

**ONBOARDING <-> IWMS (weight 2).** Wired pairs: 1 (6 ONBOARDING -> IWMS-WSD `task.workplace_setup_required`). Section 2: both FKs populated (source_module 35 ONB-JOURNEY-MGMT, target_module 101 WSD). Section 3: clean (the inbound is the natural fit; no outbound owed back to ONBOARDING). Section 4: clean. Section 5: cross-relationship 75 `onboarding_tasks emits workplace_service_requests` exists. Healthy boundary.

**IGA <-> IWMS (weight 1).** Wired pairs: 1 (1165 DESK -> IGA-AUTO-PROVISIONING `desk_booking.checked_in`). Section 2: both FKs populated (source_module 99, target_module 148). Section 3: a likely missing handoff is DESK -> IGA on `desk_booking.cancelled` / `.no_show` to revoke physical-access provisioning timely. Section 4: missing `desk_bookings` consumer DMDO on IGA-AUTO-PROVISIONING (148); reported in B1-S7. Section 5: missing cross-relationship `desk_bookings provisions <IGA access_grants>`; B8 outbound gap.

**Lighter (no current edges, surfaced from vendor surface):**

- **VIS-MGMT <-> IWMS (weight 0 today, expected based on flagship vendors).** Eptura, Envoy, Robin all include visitor-check-in flows tied to room reservations and host notifications. Expected handoffs: VIS-MGMT -> IWMS on `visitor.checked_in` -> IWMS-ROOM-RESERVATION (host receives notification); IWMS -> VIS-MGMT on `room_reservation.confirmed` (pre-register visitors). Boundary gap, surfaced for Phase 0 in Bucket 3 (B3-S1).
- **EAM <-> IWMS (weight 0 today, expected).** Workplace assets (printers, projectors, AV equipment) that fail through workplace service requests would route to EAM for asset-level repair. Expected handoff: IWMS-WSD -> EAM on `workplace_service_request.escalated_asset_repair` -> `work_orders`. Boundary gap, B3-S2.
- **ESG <-> IWMS (weight 0 today, expected).** Occupancy signals are a leading input to scope-3 emissions calculations and space-utilization-driven portfolio rationalization carbon stories. Expected handoff: IWMS-SPACE-ANALYTICS -> ESG on `space_utilization.measured` (already exists as outbound to REAL-EST 870; ESG would be a parallel subscriber). Boundary gap, B3-S3.

**In-scope mechanical fixes derived from pairwise (already covered above):** B1-S5 / S6 / S7 / S8 capture the report-only NULLs, the missing DMDO rows, and the missing cross-relationship rows. No additional Bucket 1 items from pairwise beyond those.

#### Final Bucket 1 inventory

| ID | Description |
|---|---|
| B1-S1 | INSERT `domain_module_capabilities` (100, 374) to cure M6 capability-orphaned module |
| B1-S2 | Author 5 system skills (one per module) + 5-12 `skill_tools` per skill to cure F2 / F3 / F4 / F5 / F7 |
| B1-S3 | PATCH 9 `trigger_events` rows to set `event_category` |
| B1-S4 | Author up to 7 new intra-domain cross-module handoff rows + up to 3 new `trigger_events` (`location.created`, `desk_booking.completed`, `room_reservation.completed`) |
| B1-S5 | Report-only, 3 outbound NULL `target_module_id`, schedule audits on HCM / REAL-EST / FIN |
| B1-S6 | Report-only, 1 inbound NULL `source_module_id`, schedule audit on REAL-EST |
| B1-S7 | Report-only, 4 downstream domains need consumer DMDOs on IWMS masters, schedule those audits (HCM, REAL-EST, FIN, IGA) |
| B1-S8 | Author 4 outbound cross-domain `data_object_relationships` rows (workplace_experience_feedback flows_into HCM master; space_utilization_reports signals REAL-EST master; workplace_service_requests chargebacks_to FIN master; desk_bookings provisions IGA master), after target master FK is resolved |
| B1-H1 | APQC TAGGING, propose 7 `agent_curated` rows (new INSERTs on handoffs 869, 870, 1165, 1166, 858, 1167, 1168) |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **M6 capability fix path for IWMS-ROOM-RESERVATION.** B1-S1 surfaces module 100 with zero realized capabilities. The audit default is INSERT `domain_module_capabilities` (100, 374 REAL-SPACE-OPTIM) since space-optimization is the closest match. The alternative is to author a new capability `REAL-MEETING-MGMT` (or similar) to distinguish meeting-room ops from open-space allocation; some flagship vendors (Robin, Tactic) market room and desk as a single workflow, others (Condeco, Spacewell) treat them as distinct. | Capability granularity decision; user's call. | (a) Use REAL-SPACE-OPTIM 374 (clean and matches the existing ANALYTICS / DESK pattern). (b) Author a new `REAL-MEETING-MGMT` capability and link it (more granular, may force the same change on DESK if open-space booking is also distinguished). (c) Mixed (specify per row). |
| B2-S2 | **Rule #15 notes-pollution on every `domain_data_objects` row and 3 `data_objects` rows.** All 6 IWMS DDO master rows (857-861, 1122) carry populated `notes` recording either "Phase-B Lite batch 2, deferred to follow-up audit pass" or a locations-canonical-owner editorial. The locations, space_utilization_reports, and workplace_experience_feedback `data_objects.notes` carry config-shape exemption text per the RESCINDED Rule #12 license. Rule #15 forbids auto-populated notes; per-row user-approved wording is required. Were these notes user-approved at load time, or were they auto-populated by the loader? | Cannot tell from audit alone; load-time approval status unknown. | (a) Confirm user-approved at load time; leave in place. (b) Confirm auto-populated; PATCH all 6 DDO rows + 3 `data_objects` rows' `notes` to empty string and log the Rule #15 incident per the audit obligation in `references/skill-changelog.md`. (c) Surface for user-approved replacement wording per row (Rule #15 discussion shape). |
| B2-S3 | **B4 pattern-flag positive re-evaluation per Rule #12.** Current flags read: every workflow-bearing master has `has_personal_content=true` correctly. None has `has_submit_lock=true` or `has_single_approver=true`. Re-evaluation candidates: (a) `desk_bookings.has_submit_lock=true` once `checked_in`, the booking is locked from edits (vendor-shaped: Robin, Eptura, Tactic all enforce this); (b) `room_reservations.has_submit_lock=true` once `checked_in`; (c) `workplace_service_requests.has_single_approver=true` once a `triage_service_request` is assigned (single approver to close); (d) `locations.has_personal_content` should probably remain `false` since locations are registry entries, not employee data, though some flagship vendors store employee-assigned offices on the location row (fold into B3 below if that pattern is adopted). | Pattern flags are workflow-shape judgments the user owns. | Per-flag yes/no from user; capture in Decisions. |
| B2-S4 | **Module split for DESK + ROOM reservation.** Some flagship vendors (Robin, Eptura, Tactic) merge desk + room into a single reservation workflow; others (Condeco, Spacewell, native Outlook + Teams add-ons) split them. The current 2-module split matches the latter group. The split makes sense if customers buy each module independently (Robin Desk vs Robin Rooms) but adds friction if every deployment ships both. Question: keep the split, or merge into a single `IWMS-RESERVATIONS` module. The decision interacts with B2-S1 (capability fit) and B1-S2 (the system skills, agent surface per module). | Architectural / market-positioning judgment; user owns the call. | (a) Keep the 2-module split (current default; works for customers buying one or the other). (b) Merge into single `IWMS-RESERVATIONS` module (simpler agent surface, fewer skills, mirrors flagship pure-plays that sell both). |
| B2-S5 | **Floor-plan events ownership.** Trigger events 940 (`floor_plan.created`) and 941 (`floor_plan.updated`) are on `data_object_id=346` (`floor_plans`), which is mastered in REAL-EST (`domain_data_objects` row, domain_id=141). The events were apparently loaded into IWMS's audit perimeter (they surface here via the IWMS B9 sweep on related data_objects) but the publisher is REAL-EST, not IWMS. Should the `event_category` PATCH in B1-S3 cover these events as part of the IWMS audit, or should the audit defer them to REAL-EST's b1 audit? | Cross-domain event ownership at audit-perimeter boundary; user decides scope. | (a) IWMS audit PATCHes 940 / 941 since they touch the IWMS handoff perimeter (handoff 858 uses 941). (b) Defer 940 / 941 to the REAL-EST b1 audit; IWMS B1-S3 only PATCHes the 7 IWMS-owned events. |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran the semantic enumeration against Eptura Workplace, Planon, Robin, Envoy Workplace, IBM TRIRIGA, Archibus, Spacewell, MRI OnCore, Accruent Resolute, ServiceNow Workplace Service Delivery, Yardi Voyager, Honeywell Forge Building Operations, plus adjacent specialists Tactic, Officely, Zynq, SiQ, Nuvolo, FM:Systems, Tango, Rifiniti. The subagent recipe was not spawned (single-pass audit per orchestrator instruction); the candidates below come from the analyst's flagship-vendor knowledge. Each is a candidate market gap for Phase 0 verification, not a vetted finding.

#### MISSING entity candidates

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `move_orders` | Robin, Eptura, Planon, Tango model employee / team relocations as first-class records (move ticket, target seat, target floor, effective date). Currently no IWMS master captures this; relocations would today be modeled as a `workplace_service_request` of a special type. | new master in IWMS-DESK-RESERVATION or a new IWMS-MOVE-MGMT module |
| `parking_reservations` | Eptura, Robin, Officely, Tactic, Condeco all include parking-spot reservations as a sibling to desk and room reservations. The flagship surface uses a distinct entity (capacity model, hourly grain, vehicle/license-plate attribute). | new master in IWMS-DESK-RESERVATION or sibling `IWMS-PARKING` |
| `wayfinding_signals` | Spacewell, FM:Systems Wayfinding, MRI OnCore Wayfinding produce structured wayfinding records (digital signage routing, kiosk paths, indoor positioning). The capability is becoming a buyer-evaluated feature in 2025. | new master in IWMS-LOCATION-MASTER or sibling module |
| `occupancy_sensor_readings` | Spacewell, VergeSense, Disruptive Technologies, Density, Butlr, Rifiniti, Honeywell Forge ingest occupancy sensor signals (PIR, thermal, lidar). The signal feeds space_utilization_reports but the raw sensor records may warrant their own master (audit trail, sensor calibration, vendor mapping). | new master in IWMS-SPACE-ANALYTICS (or move to candidate `BMS` domain, see candidate queue) |

#### MODULARIZATION candidates

- **IWMS-MOVE-MGMT module candidate.** If `move_orders` is loaded, it may warrant its own module rather than overloading DESK-RESERVATION. Pushes IWMS from 5 modules to 6.
- **IWMS-PARKING module candidate.** Sibling to DESK / ROOM if `parking_reservations` is loaded.

#### Compliance regulation candidates

- **OSHA workplace safety** (US, mandatory for >10-employee employers). Currently no `domain_regulations` rows on IWMS.
- **GDPR / employee data protection** (EU, mandatory; covers booking data, occupancy sensor data tied to badge swipes).
- **CCPA / state privacy laws** (US, state-specific, employee data).
- **Local building / fire codes** (per jurisdiction).

#### Candidate-domain queue

This audit surfaced 1 domain-tier candidate for `audits/_missing-domains.md`:

- **BMS (Building Management System)** queued via the helper. Flagship vendors Honeywell Forge Building Operations, Siemens Desigo CC, Schneider EcoStruxure Building Operation, Johnson Controls OpenBlue, Spacewell IoT cluster a distinct point-solution market around HVAC control, BACnet / Modbus device integration, occupancy sensor ingestion, fault detection. Adjacency to IWMS, REAL-EST, ESG, EAM. Currently feeds IWMS space-analytics if loaded but no domain row exists.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (which produces a Phase 0 markdown at `c:/tmp/IWMS-phase0-<date>.md` confirming per-entity vendor coverage) or eyeball-mode (user names which of the 4 entity candidates + 4 regulation candidates + 2 modularization candidates + 1 BMS domain candidate to treat as confirmed and we proceed via Phase B inserts or domain promotion).

### Cross-bucket dependencies

- **B1-S1 is independent** of B2-S1 unless the user picks option (b) in B2-S1 (new capability). If (b), B1-S1 waits on the new capability load.
- **B1-S2 (system skills) partially depends on B2-S4** (module split decision). If the user merges DESK + ROOM in B2-S4, the system skills are 4 not 5; if keeping the split, 5 skills. Recommend resolving B2-S4 before authoring B1-S2.
- **B1-S3 partially depends on B2-S5** (floor-plan event ownership). If user defers to REAL-EST, B1-S3 PATCHes 7 events not 9.
- **B1-S4 (intra-domain handoffs) partially depends on B1-S3** (event_category PATCH should land before referencing the events in new handoffs) and **on B2-S4** (the module split decision changes which intra-domain pairs are valid).
- **B1-S7 / B1-S8 are independent** of all other buckets, scheduled to other domains.
- **B3 MISSING entities** (`move_orders`, `parking_reservations`) might inform **B2-S4** (module split decision). If parking + move are loaded, the merge to single `IWMS-RESERVATIONS` looks worse. Calling this out per surface-time discipline.
- **B3 BMS candidate** might inform **B3 occupancy_sensor_readings** target module. If BMS is promoted, sensors live there, not in IWMS.
- Buckets 2 and 3 are otherwise independent of each other; you can resolve them in any order.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S1, S3, S4, H1`), or `skip`.

- **S1 (M6 capability fix)** is gated on B2-S1 if user picks new-capability path; otherwise trivial one-row INSERT.
- **S2 (F2 system skills)** is gated on B2-S4 (module split). Large authoring task: 5 skills + ~40 `skill_tools` rows.
- **S3 (event_category PATCH on 9 events)** is gated on B2-S5 for the 2 floor-plan events.
- **S4 (intra-domain handoffs)** depends on S3 (new events first) and on B2-S4 (module split).
- **S5 / S6 / S7 (B10b report-only + missing DMDOs report-only)** schedules 3 + 1 + 4 = 8 distinct other-domain audits; not IWMS's fix.
- **S8 (cross-domain relationship rows)** needs target-master FK resolution for 4 rows; small loader.
- **H1 (7 APQC tags)** load now or in a follow-up batch?

**Bucket 2, what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (M6 capability path):** (a) REAL-SPACE-OPTIM 374, (b) new REAL-MEETING-MGMT, (c) mixed.
- **B2-S2 (Rule #15 notes-pollution on 6 DDO + 3 data_objects):** the audit can revert if you confirm auto-population. If they were approved, say so and I leave them.
- **B2-S3 (pattern flag re-evaluation):** per-flag yes/no on `has_submit_lock` for desk_bookings + room_reservations, and `has_single_approver` for workplace_service_requests.
- **B2-S4 (DESK + ROOM module split):** (a) keep split, (b) merge to single IWMS-RESERVATIONS.
- **B2-S5 (floor-plan event ownership):** (a) IWMS PATCHes 940 / 941, (b) defer to REAL-EST audit.

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 4 entity candidates + 4 regulation candidates + 2 modularization candidates + 1 BMS domain candidate to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| HCM | B10b: populate `target_domain_module_id` on inbound handoff 869 (`workplace_feedback.submitted` -> workplace_experience_feedback). Add `consumer` DMDO on `workplace_experience_feedback` (594) in whichever HCM module subscribes (probably HCM-EMP-EXP or equivalent). |
| REAL-EST | B10b: populate `target_domain_module_id` on outbound 870 (`space_utilization.measured` -> space_utilization_reports) and `source_domain_module_id` on inbound 858 (`floor_plan.updated`). Add `consumer` DMDO on `space_utilization_reports` (593) on the receiving REAL-EST module. Authoring decision: should `floor_plans` events 940 / 941 belong to REAL-EST's audit perimeter (see B2-S5). Add `floor_plans` master DMDO row on REAL-EST (currently only `domain_data_objects` legacy entry exists, no `domain_module_data_objects` master row). |
| FIN | B10b: populate `target_domain_module_id` on 1166 (`workplace_service_request.resolved`). Add `consumer` DMDO on `workplace_service_requests` (592) on the receiving FIN module (probably FIN-AP or chargeback equivalent). |
| IGA | B10b is already populated on 1165 (target 148 IGA-AUTO-PROVISIONING). Add `consumer` DMDO on `desk_bookings` (590) in IGA-AUTO-PROVISIONING module (148). |
| VIS-MGMT | Boundary gap surfaced from market audit: VIS-MGMT presumably masters `visitors` / `visitor_registrations`; missing outbound handoffs to IWMS-ROOM-RESERVATION on `visitor.checked_in` and inbound handoffs from IWMS-ROOM-RESERVATION on `room_reservation.confirmed`. Add VIS-MGMT master DMDO row on `visitor_registrations` (currently only `domain_data_objects` legacy entry exists). |
| EAM | Boundary gap: workplace asset escalations not wired today. Schedule EAM b1 to add inbound handoff from IWMS-WSD on `workplace_service_request.escalated_asset_repair`. |
| ESG | Boundary gap: `space_utilization.measured` outbound should also fan out to ESG for emissions. Schedule ESG b1 to add inbound handoff. |


## 2026-05-31, Continuation: B1 technical fixes

Applied via loader `c:/dev/domain-map/.tmp_deploy/fix_iwms_b1_technical_2026_05_31.ts` (run from project root). All writes verified live post-load.

### Applied

- **B1-S3 (partial, 7 of 9 events).** PATCHed `event_category` on the 7 IWMS-owned trigger_events per audit pre-spec: 968 desk_booking.created -> `lifecycle`, 969 desk_booking.cancelled -> `state_change`, 970 room_reservation.created -> `lifecycle`, 971 workplace_service_request.submitted -> `lifecycle`, 972 workplace_service_request.completed -> `state_change`, 973 space_utilization.measured -> `signal`, 974 workplace_feedback.submitted -> `lifecycle`. Floor-plan events 940 / 941 skipped: both already carried non-empty values (`lifecycle` / `state_change` respectively, matching the audit prescription), and B2-S5 defers ownership to REAL-EST.
- **B2-S2 (Rule #15 notes= revert).** Audit pre-specified row IDs and named the prior license RESCINDED. PATCHed `notes=""` on the 6 `domain_data_objects` rows (857, 858, 859, 860, 861, 1122) and the 3 `data_objects` rows (593 space_utilization_reports, 594 workplace_experience_feedback, 795 locations). Per orchestrator rule: notes reverts allowed when audit names row IDs. The Rule #15 incident is already documented in this audit (B2-S2); no separate skill-changelog entry produced from this continuation.
- **B1-H1 (partial, 5 of 7 candidate tags).** INSERTed 5 `handoff_processes` rows as `proposal_source=agent_curated`, `record_status=new` (default), `role=implements`, empty `notes`. PCFs resolved live via `/processes?source_framework=eq.apqc_pcf_cross_industry` lookup before any insert (loader pre-flight aborts if any process_id missing): (869, 250) Conduct employee engagement surveys (7.8.2) for IWMS-DESK->HCM workplace_feedback.submitted; (1165, 1196) Manage IT user authorization (8.3.8.3) for IWMS-DESK->IGA desk_booking.checked_in; (1166, 1371) Prepare chargeback invoices (9.2.5.5) for IWMS-WSD->FIN workplace_service_request.resolved; (1167, 346) Manage facilities operations (10.1.4) for IWMS-ROOM->IWMS-ANALYTICS room_reservation.no_show; (1168, 346) Manage facilities operations (10.1.4) for IWMS-DESK->IWMS-ANALYTICS desk_booking.checked_in. Handoffs 858 (process_id=344 Plan facility) and 870 (process_id=345 Provide workspace and facilities) already carried `agent_curated` tags; left as-is.

### Deferred (gated on user judgment or out-of-scope for technical pass)

- **B1-S1** (INSERT `domain_module_capabilities` for IWMS-ROOM-RESERVATION). Gated on B2-S1: user picks between (a) REAL-SPACE-OPTIM 374 (default), (b) new REAL-MEETING-MGMT capability, (c) mixed.
- **B1-S2** (5 system skills + ~40 skill_tools rows). New-entity authoring + gated on B2-S4 module split decision.
- **B1-S3 (2 of 9)** floor-plan events 940 / 941. Gated on B2-S5: defer ownership to REAL-EST audit.
- **B1-S4** (up to 7 new intra-domain handoffs + up to 3 new trigger_events `location.created` / `desk_booking.completed` / `room_reservation.completed`). New entities; gated on B2-S4 module split.
- **B1-S5 / S6 / S7** report-only items owed by HCM, REAL-EST, FIN, IGA audits.
- **B1-S8** (4 outbound cross-domain `data_object_relationships` rows). Audit explicitly notes "target master FK needs a small lookup at fix time"; not pre-specified. Defer until target-side IDs resolved.
- **Bucket 2** items B2-S1 / B2-S3 / B2-S4 / B2-S5: all judgment / user-picks. Untouched.
- **Bucket 3** Phase 0 candidates (move_orders, parking_reservations, wayfinding_signals, occupancy_sensor_readings, 4 regulations, 2 modularization candidates, BMS domain). Speculative; require Phase 0 vendor research.

### Counts

| Type | Applied | Deferred |
| --- | --- | --- |
| trigger_events PATCH (B1-S3) | 7 | 2 (floor-plan, B2-S5) |
| Rule #15 notes revert (B2-S2) | 9 (6 DDO + 3 DO) | 0 |
| handoff_processes INSERT (B1-H1) | 5 | 2 (858, 870 already tagged) |
| Other B1 items | 0 | 5 (B1-S1, S2, S4, S7-cluster items, S8) |

### JWT errors

None.


## 2026-05-31, Audit

### Summary

- Current footprint: 5 full modules on host IWMS (id 23). 0 cross-cutting host modules. 6 masters (`locations` 795, `desk_bookings` 590, `room_reservations` 591, `workplace_service_requests` 592, `space_utilization_reports` 593, `workplace_experience_feedback` 594). 7 capabilities linked to domain. 12 solutions linked (8 primary, 4 secondary). 12 `trigger_events` (all now carry `event_category`). 4 outbound + 4 inbound cross-domain handoffs. 2 intra-domain cross-module handoffs (1167, 1168). 14 aliases. 17 lifecycle states across `desk_bookings` (6), `room_reservations` (6), `workplace_service_requests` (5); workflow-gate `requires_permission=true` on 660 (triaged) and 662 (resolved) anchored to module 101. 0 system skills + 0 `skill_tools` rows. 7 of 8 cross-domain handoffs APQC-tagged (1 discovery_override on handoff 6, 6 agent_curated on 858, 869, 870, 1165, 1166 plus intra-domain 1167, 1168); `record_status='new'` on all 8.
- Roles: 4 IWMS-aligned roles (Workplace Manager 10045, Space Planner 10046, Workplace Coordinator 10047, Workplace User 10048) populated across all 5 modules; every `role_modules` row carries `interaction_level`.
- Bucket 1 (in-scope, agent fixable): 4 items.
- Bucket 2 (surface-for-user, judgment): 4 items.
- Bucket 3 (Phase 0 pending, speculative): 1 carry-over cluster.

### Structural pass bands

- **A1 pass**, **A2 pass**, **A3 pass**.
- **M1 pass** (5 modules), **M2 pass** (7 capabilities, 5 modules).
- **M4 partial**, every capability has a realizing module, but module 100 still has zero realized capabilities, see M6.
- **M5 pass**, workflow-gate states anchored to module 101.
- **M6 hard-fail**, `IWMS-ROOM-RESERVATION` (100) has zero `domain_module_capabilities` rows. Audit-default fix is to insert (100, 374 REAL-SPACE-OPTIM); alternative is a new `REAL-MEETING-MGMT` capability. Carry as b1a (default) with linked b2 judgment.
- **M7 pass**, catalog-wide single-master holds; intra-domain coherence clean.
- **B1 pass**, 6 masters across DMDOs.
- **B2 / B3 pass**.
- **B4 partial**, every workflow-bearing master still has `has_submit_lock=false` and `has_single_approver=false`; positive re-evaluation candidates per Rule #12 (desk_bookings + room_reservations submit-lock on `checked_in`; workplace_service_requests single-approver on `triaged` to `resolved`). Carry as b2.
- **B5 pass** (every `embedded_master` has a canonical `master` row), **B6 partial** (locations-centric graph, acceptable), **B7 pass** (every workflow-bearing master has a `users` edge).
- **B8 partial**, 4 outbound cross-domain `data_object_relationships` edges still missing (`workplace_experience_feedback flows_into <HCM>`, `space_utilization_reports signals <REAL-EST>`, `workplace_service_requests chargebacks_to <FIN>`, `desk_bookings provisions <IGA>`); blocked on target-master id resolution from each neighbor's audit. Carry as b1b.
- **B9 pass**, all 12 `trigger_events` now carry `event_category` (`floor_plan.created` lifecycle, `floor_plan.updated` state_change, the 7 IWMS-owned events PATCHed in the 2026-05-31 Continuation, plus 1249/1250/1251 already populated).
- **B9b partial**, only 2 intra-domain handoffs on a 5-module domain; expected coverage adds `location.created` fan-out to all 4 sibling modules plus DESK/ROOM/WSD to ANALYTICS on completion / resolved events. Up to 7 new handoff rows + up to 3 new trigger_events. Gated on B2 module-split decision; carry as b1b.
- **B10b partial-fail**, 3 of 4 outbound handoffs carry NULL `target_domain_module_id` (869 HCM, 870 REAL-EST, 1166 FIN). 1 of 4 inbound handoffs carries NULL `source_domain_module_id` (858 REAL-EST). Owed by neighbor audits; carry as b1b.
- **B11 pass** (14 aliases).
- **B12 mostly pass**, 3 config-shape masters (`locations`, `space_utilization_reports`, `workplace_experience_feedback`) carry 0 lifecycle states; the Rule #15 notes-pollution license recording the exemption was reverted in the 2026-05-31 Continuation. Exemption stands without notes annotation.
- **C1 pass** (Facilities and Real Estate owner + Human Resources contributor on `business_function_domains`).
- **E1 / E2 / E3 pass** (4 roles, all touch >=2 modules, all `role_modules` carry `interaction_level`).
- **F1 pass** (no legacy domain-level system skills).
- **F2 hard-fail**, `/skills?domain_module_id=in.(98,99,100,101,102)&skill_type=eq.system` returns `[]`. **F3 hard-fail** (cascade), **F4 N/A**, **F5 uncomputable** (cascade).
- **H1 partial**, 7 of 8 cross-domain handoffs carry an APQC tag (1 discovery_override on handoff 6, 6 agent_curated on 858/869/870/1165/1166). All `record_status='new'`; 0 approved. Headline quality measure: 0 of 8 approved. Process measure: 6 of 8 agent_curated. Awaiting reviewer sign-off; not an open audit item.

### Rule #15 violations newly detected

- `handoffs.notes` on row 1165: "target NULL until IGA is modularized". Forbidden pattern per Rule #15.
- `handoffs.notes` on row 1166: "target NULL until FIN is modularized". Forbidden pattern per Rule #15.

Both were authored before the rescission; audit revert allowed since IDs are named here (orchestrator rule). Carry as b1a.

### Bucket 1, In-scope confirmed gaps (b1a candidates)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1A-M6 | M6 capability-orphan | Module 100 IWMS-ROOM-RESERVATION still has zero `domain_module_capabilities`. | INSERT `domain_module_capabilities` (100, 374). Gated on B2-CAP if user picks new-capability path. |
| B1A-N15 | Rule #15 revert | `handoffs.notes` on 1165 and 1166 carry RESCINDED "target NULL until X is modularized" annotations. | PATCH `notes=""` on handoffs 1165 and 1166. |
| B1A-F2 | F2 system skills (cascade F3/F5/F7) | 0 system skills on 5 modules. | Author 5 system skills (one per module) + 5 to 12 `skill_tools` rows each. Gated on B2-SPLIT. |
| B1A-B4 | B4 pattern flag re-eval | `has_submit_lock` / `has_single_approver` all false on workflow-bearing masters; Rule #12 re-eval candidates surfaced. | PATCH selected flags TRUE on `desk_bookings` / `room_reservations` / `workplace_service_requests`. Gated on B2-FLAGS. |

### Bucket 1, blocked / report-only (b1b candidates)

| ID | Finding | Blocked by |
|---|---|---|
| B1B-B10b-OUT | 3 outbound handoffs (869, 870, 1166) carry NULL `target_domain_module_id`. | HCM, REAL-EST, FIN audits |
| B1B-B10b-IN | Inbound handoff 858 carries NULL `source_domain_module_id`. | REAL-EST audit |
| B1B-DMDO | Consumer DMDOs missing on neighbor modules: HCM on `workplace_experience_feedback`, REAL-EST on `space_utilization_reports`, FIN on `workplace_service_requests`, IGA on `desk_bookings`. | HCM, REAL-EST, FIN, IGA audits |
| B1B-B8 | 4 outbound `data_object_relationships` edges missing (workplace_experience_feedback to HCM master, space_utilization_reports to REAL-EST master, workplace_service_requests to FIN master, desk_bookings to IGA master). | Resolve target master FK per neighbor audit |
| B1B-B9b | Up to 7 new intra-domain handoff rows + up to 3 new trigger_events (`location.created`, `desk_booking.completed`, `room_reservation.completed`). | B2-SPLIT (module split decision) |

### Bucket 2, Surface-for-user (judgment calls)

1. **B2-CAP**, M6 capability fix path for IWMS-ROOM-RESERVATION. Options: (a) link to existing REAL-SPACE-OPTIM 374 (audit default, clean and matches DESK/ANALYTICS pattern), (b) author new `REAL-MEETING-MGMT` capability and link, (c) mixed. Independent of B2-SPLIT only if (b) is not picked.
2. **B2-FLAGS**, B4 pattern-flag positive re-evaluation per Rule #12. Per-flag yes/no on: `desk_bookings.has_submit_lock`, `room_reservations.has_submit_lock`, `workplace_service_requests.has_single_approver`. Independent of other items.
3. **B2-SPLIT**, keep `IWMS-DESK-RESERVATION` and `IWMS-ROOM-RESERVATION` split, or merge into single `IWMS-RESERVATIONS` module. Options: (a) keep split (current default), (b) merge. Decision drives B1A-F2 (4 vs 5 skills) and B1B-B9b shape. Independent of B2-CAP unless (b) picked.
4. **B2-FLOOR**, floor-plan events 940 / 941 belong to which audit perimeter. Both events are now populated, so this is a cataloging question only: leave the events tagged to IWMS data_objects sweep or formally route to REAL-EST audit. No PATCH required either way.

### Bucket 3, Phase 0 pending (speculative)

Carry-over from 2026-05-30 audit, unchanged:

- MISSING entity candidates: `move_orders` (flagships: Robin, Eptura, Planon, Tango), `parking_reservations` (Eptura, Robin, Officely, Tactic, Condeco), `wayfinding_signals` (Spacewell, FM:Systems, MRI OnCore), `occupancy_sensor_readings` (Spacewell, VergeSense, Disruptive, Density, Butlr, Rifiniti, Honeywell Forge).
- MODULARIZATION candidates: `IWMS-MOVE-MGMT`, `IWMS-PARKING`.
- Compliance regulation candidates: OSHA workplace safety (US), GDPR (EU employee booking + sensor data), CCPA (US state privacy), local building / fire codes.
- Candidate-domain queue: BMS (Building Management System), flagships Honeywell Forge Building Operations, Siemens Desigo CC, Schneider EcoStruxure, Johnson Controls OpenBlue, Spacewell IoT.

Verification path: formal Phase 0 vendor research or eyeball-mode selection.

### Cross-bucket dependencies

- B1A-M6 independent unless B2-CAP picks (b), which blocks B1A-M6.
- B1A-F2 gated on B2-SPLIT (4 vs 5 skills).
- B1A-B4 gated on B2-FLAGS.
- B1A-N15 fully independent; agent can apply on approval.
- B1B-B9b gated on B2-SPLIT.
- B1B-B10b-OUT/IN, B1B-DMDO, B1B-B8 independent of buckets 2 and 3; require neighbor audits to clear.
- Bucket 3 `move_orders` / `parking_reservations` outcomes inform B2-SPLIT (merge looks worse if both load).

### JWT errors

None.

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

---

## 2026-06-07 - Audit (state-driven execute, bulk batch)

State-driven Validate pass (SKILL.md Rule #21) over the open items in `state.yaml`. No fresh
from-scratch audit. Writes applied via `.tmp_deploy/fix_iwms_state_driven_2026_06_07.ts`
(`bun run` from project root); all verified live post-load. No JWT errors.

### Summary

Domain 23 (Workplace and Space Management / IWMS), 5 full modules (98-102), 6 masters
(590, 591, 592, 593, 594, 795). Live re-verification confirmed all 6 masters still carried
`entity_type='unclassified'` and the domain plus all 5 modules had empty `catalog_tagline` /
`catalog_description`. Both gaps executed this pass. All other open items are either gated on a
user decision, destructive, deferred (personas), blocked on a neighbor audit, superseded, or
backlog, and were surfaced or left rather than executed.

### Executed (additive / corrective, record_status untouched on existing rows; PATCH only)

- **B1A-ENTITY-TYPE (6 PATCHes).** Classified `data_objects.entity_type` per Rule #12 from live
  shape (lifecycle states + description): 590 desk_bookings -> `operational_workflow`,
  591 room_reservations -> `operational_workflow`, 592 workplace_service_requests ->
  `operational_workflow`, 593 space_utilization_reports -> `computed`, 594
  workplace_experience_feedback -> `operational_record`, 795 locations -> `catalog`. Loader
  skipped any row already typed (idempotent); all 6 were unclassified, all 6 PATCHed. Cures B13.
- **Catalog UX, Rule #20 (6 rows, 12 field writes).** Authored buyer-voice copy (workflow + value,
  no vendor names, no em-dash, American English) into the empty `catalog_tagline` +
  `catalog_description` on domain 23 and all 5 modules (98 LOCATION-MASTER, 99 DESK-RESERVATION,
  100 ROOM-RESERVATION, 101 WORKPLACE-SERVICE-DESK, 102 SPACE-ANALYTICS). Write-into-empty only;
  no non-empty value was overwritten. Cures A4 + M8.

### Surfaced (no write; user decision, destructive, or deferred)

- **B1A-N15 (destructive, surfaced not executed).** handoffs.notes on 1165 ("target NULL until
  IGA is modularized") and 1166 ("target NULL until FIN is modularized") still carry the
  rescinded Rule #15 pattern (confirmed live). Reverting a non-empty notes value is destructive
  under Rule #21, so the `notes=""` PATCH is a sign-off item, not auto-applied.
- **B2-CAP.** Capability for IWMS-ROOM-RESERVATION (100, zero realized capabilities). Default:
  link existing REAL-SPACE-OPTIM (374). Alt: author REAL-MEETING-MGMT. Held; B1A-M6 insert waits
  on this.
- **B2-FLAGS / B1A-B4.** has_submit_lock on desk_bookings (590) and room_reservations (591),
  has_single_approver on workplace_service_requests (592). PATCH overwrites the existing false
  value; workflow-shape judgment the user owns.
- **B2-SPLIT.** Keep DESK + ROOM split or merge to single IWMS-RESERVATIONS. Drives B1B-B9b shape.
- **B2-FLOOR.** Floor-plan events 940 / 941 (mastered by REAL-EST) audit-perimeter ownership;
  tracking decision, no PATCH either way.
- **B1A-PHASE-P (personas deferred).** 5 modules, 0 domain_roles post-Plan-3. Persona / RACI layer
  NOT authored (Rule #21 defers personas). Candidate personas: Workplace Manager, Space Planner,
  Workplace Coordinator (all Facilities and Real Estate), Employee Workplace User (consumer).

### Left

- **b1b (blocked on neighbor audits / B2-SPLIT):** B1B-B10b-OUT (target FK owed by HCM, REAL-EST,
  FIN), B1B-B10b-IN (source FK owed by REAL-EST on 858), B1B-DMDO (consumer DMDOs owed by HCM,
  REAL-EST, FIN, IGA), B1B-B8 (4 cross-domain relationship edges, depends on B1B-DMDO master
  FKs), B1B-B9b (intra-domain handoffs + new events, gated on B2-SPLIT).
- **B1A-F2 (superseded 2026-06-06):** per-module system skills + skill_tools CANCELED by the
  per-domain-skill restoration; per-module tool re-authoring tracked in
  audits/_modularization-backlog.md. No action.
- **b3 backlog (7):** move_orders, parking_reservations, wayfinding_signals,
  occupancy_sensor_readings, IWMS-MOVE-MGMT / IWMS-PARKING modularization, compliance regulations,
  BMS candidate domain. Speculative; require Phase 0.

### Note (verified, no action)

H1 / APQC tagging is fully covered: all 8 IWMS-touching handoffs (6, 858, 869, 870, 1165, 1166,
1167, 1168) already carry a handoff_processes tag (7 agent_curated + 1 discovery_override). B11
aliases pass (14). C1 business_function_domains already has owner (Facilities and Real Estate) +
contributor (Human Resources). No additive APQC / alias / C1 work pending.

### Counts

| Type | Applied | Surfaced | Left |
| --- | --- | --- | --- |
| entity_type PATCH (B1A-ENTITY-TYPE) | 6 | 0 | 0 |
| Catalog UX PATCH (Rule #20, A4 + M8) | 6 rows / 12 fields | 0 | 0 |
| Destructive notes revert (B1A-N15) | 0 | 1 | 0 |
| b2 decisions | 0 | 4 | 0 |
| Personas / RACI (B1A-PHASE-P) | 0 | 1 (deferred) | 0 |
| b1b (neighbor / split gated) | 0 | 0 | 5 |
| Superseded (B1A-F2) | 0 | 0 | 1 |
| b3 backlog | 0 | 0 | 7 |

### JWT errors

None.
