# TRAVEL-MGMT audit history

## 2026-06-14 - Build

### Summary

Built and loaded TRAVEL-MGMT (Corporate Travel Management, `domain_id=172`) into the live `domain_map` catalog at `record_status='new'`. Phase 0 (`.tmp_deploy/TRAVEL-MGMT-phase0-2026-06-14.md`) returned `promote-as-domain`: corporate travel management is a distinct enterprise-software market with a core entity surface (trips, itineraries, bookings, fare/hotel inventory, traveler profiles, travel policies, duty-of-care alerts) that exists in no current catalog domain and is not reducible to EXPENSE (which only consumes the resulting charges) or SPEND-MGMT (card authorization). The point-solution test passes: at least four independent vendors field a flagship travel product, including a pure-play infrastructure vendor (Spotnana) with no expense functionality.

A prior partial build had already landed most of Phase A and Phase B. This pass completed the remaining Phase A items, the rest of Phase B, and all of Phases C, S, and E, then wrote the audit artifacts.

### Phases loaded

**Phase A - Market shape** (domain + 4 modules + 8 capabilities + 5 solutions were pre-existing; this pass added regulations):
- `domains` row 172 carries all 7 metadata fields (`crud_percentage=65`, `business_logic` populated, `min_org_size='20 s <500'`, `cost_band='$$$'`, `certification_required=false`, `usa_market_size_usd_m=3500`, `market_size_source_year=2025`) and both catalog UX fields in buyer voice. The `usa_market_size_usd_m` is a Phase-0 placeholder, surfaced as B2-MARKET-SIZE.
- 4 full modules: `TRAVEL-MGMT-BOOKING-SOURCING` (346), `TRAVEL-MGMT-TRIP-ITINERARY` (347), `TRAVEL-MGMT-PROFILE-POLICY` (348), `TRAVEL-MGMT-DUTY-OF-CARE` (349). 8 capabilities, every capability realized by >=1 module, every module realizing >=1 capability (M4/M6 pass). 4 modules for 8 capabilities satisfies M2.
- 5 solutions, all `coverage_level='primary'`: Navan Travel, SAP Concur Travel, Spotnana Travel-as-a-Service, Amex GBT Egencia, BCD Travel Program Management. Vendors reused by `vendor_name` (Navan 190, SAP SE 18, Spotnana 733, American Express Global Business Travel 734, BCD Travel 735) per Rule #4.
- `domain_regulations` (2 added this pass): GDPR `mandatory` (traveler profiles hold passport/visa/loyalty/dietary/location personal data, special-category and cross-border), SOX `recommended` (travel-spend controls and approval evidence). PCI-DSS deferred to B2-PCIDSS (conditional). Duty-of-care is a legal obligation captured in `business_logic`, not a named regulation row in the catalog.

**Phase B - Data-object footprint** (masters + DMDO + most relationships/aliases/lifecycle/events were pre-existing; this pass added the intra-domain and HCM handoffs):
- 9 mastered data_objects (`business_trips` 1057, `trip_itineraries` 1058, `trip_bookings` 1059, `trip_search_results` 1060, `unused_ticket_credits` 1061, `traveler_profiles` 1062, `travel_policies` 1063, `trip_approvals` 1064, `duty_of_care_alerts` 1065), plus `employees` (31) embedded_master in the PROFILE and DUTY modules and `users` (748) consumer in every module.
- `entity_type` classified on every master: `operational_workflow` (business_trips, trip_itineraries, trip_bookings, unused_ticket_credits, trip_approvals, duty_of_care_alerts), `computed` (trip_search_results), `operational_record` (traveler_profiles), `catalog` (travel_policies). Pattern flags considered: `trip_bookings.has_submit_lock=true`, `trip_approvals.has_single_approver=true`, `traveler_profiles.has_personal_content=true`.
- Single-master integrity (M7) clean: no travel master has a `role='master'` row in more than one module.
- 20 `data_object_relationships`: intra-domain edges (trip > itinerary > booking; policy filters search results; approval authorizes trip; booking produces credit; trip monitored by alert), 6 `users` edges (traveler, arranger, approver, booker, responder, policy owner), the HCM edge `employees identifies traveler_profiles`, and 3 cross-domain edges mirroring the outbound handoffs (booking generates charges for `expense_reports`; trip imported as `travel_bookings`; approval pre-commits `spend_requests`).
- 14 `data_object_aliases` (trip, journey, reservation, PNR, itinerary, traveler, etc.).
- `data_object_lifecycle_states` on all 6 operational_workflow masters, each with exactly one initial and >=1 terminal state (B12 pass); workflow gates set `requires_permission=true` (e.g. `trip_bookings.ticketed`/`cancelled`, `unused_ticket_credits.reapplied`, `trip_approvals.approved`/`rejected`, `duty_of_care_alerts.acknowledged`), each carrying `domain_module_id` for the realizing module (M5).
- 9 `trigger_events` (event_category set; Rule #13 valid values).
- 7 `handoffs` touching the domain: 3 outbound to EXPENSE/SPEND (pre-existing; module FKs set), 3 intra-domain cross-module B9b rows added this pass (`trip_approval.approved` PROFILE->BOOKING, `trip_booking.ticketed` BOOKING->TRIP, `business_trip.booked` TRIP->DUTY; all `lifecycle_progression`, `friction_level=low`), and 1 outbound to HCM (`duty_of_care_alert.raised` DUTY -> HCM, `event_stream`, `friction_level=medium`). B9b is satisfied for the 4-module domain.

**Phase C - Functional ownership:**
- `business_function_domains` (4 rows): Business Operations `owner` (the travel program is run by the travel / business-operations function), Finance `contributor` (travel-spend governance and approval policy), Security `contributor` (duty-of-care / traveler-risk obligation), Human Resources `consumer` (worker safety and trip data). C1 passes (>=1 owner).

**Phase S - System skill + tools:**
- 1 `skills` row: `travel-mgmt-system` (`skill_type='system'`, `domain_id=172`, `domain_module_id` NULL) per Rule #17. F2 passes (exactly one domain-grain system skill).
- 21 distinct `tools` linked across the 4 modules via 24 `domain_module_tools`: query/mutate per master (`coverage_tier='platform'`), 3 `fetch` tools for external content Semantius does not master (`fetch_air_inventory`, `fetch_hotel_inventory`, `fetch_destination_risk_intelligence`, `coverage_tier='external'`), and the `notify_person`/`notify_team` abstractions (linked rather than channel-specific primitives, per the channel-vs-capability rule). F4 invariant holds on all tools (0 violations).
- Semantius score computable (F5): strict 17/21 = 0.81, operational 17/21 = 0.81. The 4 non-platform tools are the 3 external fetch tools and the notify abstraction; they flip to platform when Semantius ships native outbound and external-fetch primitives.

**Phase E - Personas + RACI:**
- 3 `domain_roles`: `BUSINESS-OPERATIONS-TRAVEL-MANAGER` (Travel Manager, owns policy + approvals + duty-of-care readiness), `BUSINESS-OPERATIONS-TRAVEL-ARRANGER` (Travel Arranger, books on behalf of travelers), and cross-functional `TRAVELER` (`business_function_id` NULL, self-service). 11 `role_modules` rows; every persona reaches >=2 modules (E2 pass), with `interaction_level` set on every row (E3 pass).
- `process_raci` NOT authored: the cross-industry APQC PCF has no corporate-travel process node (closest rows are expense-reimbursement processes 9.6 / 9.6.2, which do not gate pre-trip booking, approval, or duty-of-care). Authoring a custom travel process is net-new structure, surfaced as B2-RACI-PROCESS rather than auto-loaded (Rule #21 research carve-out).

### Decisions

- Reused all 5 vendors and the 4 adjacent-domain ids (EXPENSE 67, SPEND-MGMT 133, HCM 54) from live state; no vendor or domain rows hard-coded.
- Duty of Care kept as its own full module (matches Phase 0 Module D and four-of-five flagship modeling); the fold-in alternative is surfaced as B2-DOC-MODULE.
- GDPR + SOX loaded; PCI-DSS held as conditional (B2-PCIDSS).
- No `process_raci` invented without a gated process behind it; the custom-process question is B2-RACI-PROCESS.

### Open items (carried to state.yaml / q-TRAVEL-MGMT.md)

- B2-DOC-MODULE: duty-of-care as its own module vs folded in (q1, recommended: keep separate).
- B2-PCIDSS: attach PCI-DSS or not (q2, recommended: no, it is conditional).
- B2-MARKET-SIZE: accept the ~$3,500M placeholder vs re-source (q3, recommended: accept + flag).
- B2-RACI-PROCESS: author custom travel processes for RACI gate-wiring vs leave open (q4, recommended: author).
- B3-EXPANDED-SUBSTRATE: discretionary additive substrate, non-blocking (q5).

The build is agent-finished at `record_status='new'`, awaiting user review and the four decisions above. No `record_status` was set to anything other than the `new` default; no git commit; no notes populated; no em-dashes; no Python; all reads/writes via the `semantius` CLI.
