# ACTIVITY-BOOKING audit history

## 2026-06-22 — Built (new domain, established_market)

New domain for the **Tours, Activities & Experiences Booking** market ("restech": reservation
technology for tour and activity operators). Triggered by research on **Origin**
(exploreorigin.com), an all-in-one operating system for outdoor / guided-adventure operators.

**Classification.** Passed the point-solution-market test (Rule #2): independent flagship vendors
compete in it as a recognized category (FareHarbor, Peek Pro, Rezdy/Checkfront/Regiondo, Bokun,
Xola) plus an adventure/outfitter sub-segment (The Flybook, Resmark, Origin). Single domain, not a
split: adventure is a buyer segment and feature emphasis (guide scheduling, multi-day itineraries),
not a distinct object model. Nearest existing neighbors are adjacencies only: FSM (technician
dispatch), TRAVEL-MGMT (corporate buyer side), STR-MGMT (lodging inventory).

**Phase 0** vendor surface: `.tmp_deploy/ACTIVITY-BOOKING-phase0-2026-06-22.md` (10 vendors, entity
surface matrix, 3-module hypothesis; distribution split into a 4th optional module here because
Rezdy/Bokun are distribution-first and Origin/Flybook do not model OTA at all).

**Loaded (all record_status='new'):**
- Phase A: domain 193; 7 capabilities; 4 full modules (AB-RESERVATION-CORE 418, AB-RESOURCE-SCHED
  419, AB-WAIVERS 420, AB-CHANNEL-DIST 421); 8 vendors; 10 solutions (all primary on ACTIVITY-BOOKING;
  Checkfront + The Flybook also secondary on STR-MGMT).
- Phase B: 23 masters; 31 domain_module_data_objects (incl. embedded_master `customers` on CORE and
  cross-module embedded shells of activity_bookings/departures/participants on SCHED/WAIVERS/DIST);
  14 aliases; 27 lifecycle states across 6 operational_workflow masters; 9 trigger_events; 9 handoffs
  (3 cross-domain outbound to CRM/ESIGN/FIN + 6 intra-domain lifecycle_progression); 28 relationships
  (intra-domain + 3 users edges). Two Rule #9 collisions avoided by prefixing: payment_transactions ->
  `booking_payments`, trip_itineraries -> `activity_itineraries`.
- Phase C: 4 business_function_domains (owner Business Operations; contributors Sales + Marketing;
  consumer Customer Service).
- Phase S: domain skill `activity-booking` (skill_type=domain, brand-free trigger description +
  keywords); 24 tools (reusing notify_person, query_customers, sign_document); 26 domain_module_tools.
- Phase E: 4 personas (Reservations Manager, Booking Agent, Guide and Trip Leader, Distribution
  Manager) + 10 role_modules reach (each persona >=2 modules).

**Checklist verification (this pass):** A1-A4 pass; M1/M2/M4/M6/M7/M8 pass (4 modules, single-master
integrity clean, capability<->module bipartite closed); B1/B2/B3/B12/B13 pass (6 workflow masters all
have well-formed state machines: exactly one initial, >=1 terminal, no duplicate order; 0 unclassified);
C1 pass; F2/F3/F8 pass. Open: catalog-copy confirmation (B1B-CATALOG-COPY-CONFIRM), TAM sourcing
(B1B-TAM-SOURCE), RACI realization (B1B-PERSONAS-RACI), cross-domain handoff target module FKs
(B1B-HANDOFF-MODULE-FK, owed by the target domains).

Blueprint emission NOT run (explicit user-triggered step only).
