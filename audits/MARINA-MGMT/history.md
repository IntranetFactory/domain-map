# MARINA-MGMT — audit history

## 2026-06-15 — Initial build (Phase 0 -> A/M/B/C/E/S)

New domain created from a "is this a domain?" classification that the user promoted to a full research + initial build. Marina and boatyard operations software passed the point-solution-market test easily (Dockwa, Molo/Storable, DockMaster/Valsoft, Marina Master/IRM, MarinaOffice/Scribble are independent pure-plays). Framed by the user as "Marina Slip & Boat Storage Reservation Hubs"; loaded as the broader marina-and-boatyard-management market, with slip/storage reservation as one capability inside it.

**Phase 0 (vendor surface).** `.tmp_deploy/MARINA-MGMT-phase0-2026-06-15.md` — 5 flagship vendors, ~54-entity union surface matrix, 7 genuine compliance entities (no FCRA/HIPAA/SOX analogs; marina is lightly regulated), and a 6-module hypothesis with 7 open market-shape forks.

**Build (domain_id=183, modules 374-379).** Loader `.tmp_deploy/load_marina_mgmt_2026_06_15.ts` (idempotent, modern modular shape, mirrors load_str_mgmt). Loaded:
- Phase A: domain (crud 80, `$$`, xs, US TAM $150M/2024); 8 capabilities; 6 full modules; 8 `domain_module_capabilities`; 5 vendors; 5 solutions (all primary coverage); 2 regulations (Clean Vessel Act, EPA SPCC) + 2 `domain_regulations` (conditional).
- Phase B: 27 masters; 36 `domain_module_data_objects` (27 master + 9 embedded_master shells); 42 lifecycle states across 9 workflow masters; 4 trigger events; 5 intra-domain handoffs; 33 `data_object_relationships` (incl. 5 `users` edges); 58 aliases.
- Phase C: 4 `business_function_domains` (Business Operations owner; Customer Service + Sales contributors; Finance consumer); 2 `business_function_capabilities` overrides (Finance -> billing, Field Service Ops -> boatyard).
- Phase E: 5 personas (Harbormaster, Dockmaster, Office Manager, Service Yard Manager, Bookkeeper) + 18 `role_modules` reach rows. RACI (`process_raci` + lifecycle `process_id` wiring) deferred (see B1B-RACI-LAYER).
- Phase S: 1 domain system skill (`marina-mgmt-system`); 57 distinct tools; 62 `domain_module_tools`. Semantius strict score 0.95 (54/57 platform; non-platform = notify_team, execute_payment, sign_document).

**Modules:** INVENTORY (slips/moorings/racks/storage/size-classes/assignments), RESERVATIONS (reservations + waitlist; embeds slip/boater/vessel), CRM (boaters/vessels/insurance/registration), BILLING (contracts/recurring/utilities/meters/invoices/house-accounts; embeds slip/boater/reservation), SERVICE (work orders/estimates/haul-outs/dry-stack launches/pump-out logs; embeds vessel/slip), FUEL-RETAIL (fuel sales/tanks/inventory logs/ship-store sales; embeds boater).

**Fixes applied during the build:**
- Dropped legacy `display_label` from the data_objects insert (column retired).
- Trigger-event name collisions: `reservation.confirmed` / `reservation.checked_out` already belong to STR-MGMT (point at `str_reservations`) and `work_order.completed` to FSM (`field_visits`). Renamed marina events to entity-scoped (`slip_reservation.confirmed`, `slip_reservation.checked_out`, `slip_contract.activated`, `boatyard_work_order.completed`); deleted the 5 mis-pointed handoffs and recreated them against the correct events (now handoffs 1498-1502).
- `utility_meters` (id 661) pre-existed with `entity_type=operational_workflow` and zero lifecycle states (a latent B12 fail predating this load). MARINA-MGMT is now its sole master (M7 verified); reclassified to `operational_record` (a submeter is record data, no workflow). No lifecycle states lost.

**Completeness checklist (verify_marina_2026_06_15.ts):** A1, A4, M4, M6, M8, B12, B13, B15, E2, F4 all PASS. M7 single-master clean across all 27. S-band FK coverage non-zero on every expected table.

**State after build:** `feedback_needed`. Everything written at `record_status='new'`, awaiting review. 8 market-shape / confirmation decisions in the q-file (module split is the gate); compliance + peripheral entities parked as non-blocking b3; RACI layer parked as b1b.
