# MARINA-MGMT Phase 0 — Vendor Surface

Market: marina and boatyard operations software ("Marina Slip & Boat Storage Reservation Hubs"). Live-catalog check confirmed no existing `*marina*`/`*boat*` domain. Five flagship pure-plays selected; Snag-A-Slip used as a marketplace cross-check (transient surface only).

## Flagship vendors

| Vendor | URL | Specialist in | Why included |
|---|---|---|---|
| Dockwa | https://marinas.dockwa.com/ | Online slip reservations + transient-booking marketplace, boater app | Transient-marketplace flavor; reservations, contracts, fuel, dry stack, service in one cloud product |
| Molo (Storable Marine) | https://getmolo.com/ | Space management (slips/racks/drystack/moorings), contracts, billing, work orders, fuel | Modern all-in-one; strong dry-stack launch workflow and boatyard service |
| DockMaster (Valsoft/ASA) | https://www.dockmaster.com/ | Full marine ERP: marina + boatyard + dealership, accounting, inventory, POS | Full ERP-style boatyard suite (service estimating, parts, AP/AR, boat sales) |
| Marina Master (IRM) | https://www.marina-master.com/ | Berth management, interactive reservations, CRM, accounting, boatyard, yacht club | Strong international all-in-one; movement control, dock walk, CCTV, loyalty |
| MarinaOffice / MARINAGO (Scribble) | https://www.marinaoffice.net/ | Metered utility billing, Visual Marina, fuel POS (PureFuel), yacht clubs | Deepest metered-utility (electric/water/Wi-Fi, wireless meter reads) and fuel-POS depth |

## Surface matrix

Vendors: D = Dockwa, M = Molo, DM = DockMaster, MM = Marina Master, MO = MarinaOffice. Classification: Core (>=3), Common (2), Specialist (1), Compliance.

| Entity | Category | D | M | DM | MM | MO | Classification | Proposed module |
|---|---|---|---|---|---|---|---|---|
| marinas | Master | x | x | x | x | x | Core | inventory |
| docks | Master | x | x | x | x | x | Core | inventory |
| slips | Master | x | x | x | x | x | Core | inventory |
| moorings | Master | x | x | x | x | x | Core | inventory |
| dry_stack_racks | Master | x | x | x | x | x | Core | inventory |
| storage_units | Master | x | x | x | x | x | Core | inventory |
| utility_meters | Master |  | x | x | x | x | Core | billing |
| boaters | Master | x | x | x | x | x | Core | crm |
| vessels | Master | x | x | x | x | x | Core | crm |
| service_technicians | Master |  | x | x | x | x | Core | service |
| inventory_parts | Master |  | x | x |  | x | Core | service |
| products | Master |  | x | x | x | x | Core | retail-pos |
| fuel_tanks | Master |  | x | x | x | x | Core | fuel |
| fuel_dispensers | Master |  | x | x | x | x | Core | fuel |
| reservations | Junction | x | x | x | x | x | Core | reservations |
| transient_bookings | Junction | x | x | x | x | x | Core | reservations |
| slip_assignments | Junction | x | x | x | x | x | Core | inventory |
| storage_agreements | Junction | x | x | x | x | x | Core | billing |
| waitlist_entries | Junction | x | x | x | x | x | Core | reservations |
| invoices | Junction | x | x | x | x | x | Core | billing |
| payments | Junction | x | x | x | x | x | Core | billing |
| recurring_charges | Junction |  | x | x | x | x | Core | billing |
| meter_readings | Audit |  | x | x | x | x | Core | billing |
| utility_charges | Junction |  | x | x | x | x | Core | billing |
| work_orders | Junction |  | x | x | x | x | Core | service |
| service_estimates | Junction |  | x | x | x | x | Core | service |
| labor_time_entries | Audit |  | x | x | x | x | Core | service |
| haul_out_jobs | Junction |  | x | x | x | x | Core | service |
| launch_schedules | Junction | x | x | x | x | x | Core | service |
| fuel_sales | Junction |  | x | x | x | x | Core | fuel |
| pos_transactions | Junction |  | x | x | x | x | Core | retail-pos |
| house_accounts | Junction |  | x | x | x | x | Core | billing |
| contracts | Junction | x | x | x | x | x | Core | billing |
| esignatures | Audit | x | x | x |  | x | Core | billing |
| purchase_orders | Junction |  | x | x |  | x | Common | service |
| boat_sales_deals | Junction |  |  | x |  |  | Specialist | (out: BOAT-DEALER) |
| customer_messages | Engagement | x | x | x | x | x | Core | crm |
| reservation_offers | Engagement | x | x |  | x | x | Core | reservations |
| gate_access_credentials | Master |  | x | x | x | x | Core | access |
| gate_access_events | Audit |  | x | x | x | x | Core | access |
| vessel_movements | Audit |  |  | x | x | x | Common | inventory |
| dock_walk_logs | Audit |  |  | x | x | x | Common | inventory |
| insurance_documents | Audit | x | x | x | x | x | Compliance | crm |
| vessel_registrations | Audit | x | x | x | x | x | Compliance | crm |
| pump_out_logs | Audit |  | x | x | x | x | Compliance | service |
| spill_prevention_plans | Compliance |  |  | x |  | x | Compliance | fuel |
| fuel_inventory_logs | Audit |  | x | x | x | x | Compliance | fuel |
| liveaboard_permits | Compliance |  |  | x | x | x | Compliance | billing |
| clean_marina_certifications | Compliance |  |  |  |  | x | Compliance | inventory |
| rate_plans | Config | x | x | x | x | x | Core | billing |
| utility_rate_schedules | Config |  | x | x | x | x | Core | billing |
| contract_templates | Config | x | x | x | x | x | Core | billing |
| labor_rate_codes | Config |  | x | x | x | x | Core | service |
| slip_size_classes | Config | x | x | x | x | x | Core | inventory |

## Compliance / regulatory entities

Marinas are lightly regulated vs HR/health/finance. Only genuinely-tracked items below (no FCRA/HIPAA/SOX analogs).

| Entity | What drives it | Proposed module |
|---|---|---|
| insurance_documents | Slip/storage contracts require proof of current liability insurance on file per vessel | crm |
| vessel_registrations | State/USCG/BoatUS registration verification; documented-vessel numbers | crm |
| pump_out_logs | Clean Vessel Act / state pump-out mandates; CVA-grant reporting on sewage pump-out usage | service |
| spill_prevention_plans | EPA SPCC rule (>1,320 gal aboveground fuel); 5-year review records with signatures | fuel |
| fuel_inventory_logs | Underground/aboveground storage-tank reconciliation and leak-detection records | fuel |
| liveaboard_permits | Local liveaboard caps, sanitation and occupancy ordinances | billing |
| clean_marina_certifications | Voluntary state Clean Marina program certification and renewal checklists | inventory |

## Modularization hypothesis

Six full modules, each with >=1 master (Rule #14). **inventory** masters the physical estate (marinas, docks, slips, moorings, dry-stack racks, storage units) plus assignment and dock-walk movement. **reservations** masters short-stay demand: reservations, transient bookings, waitlists, and one-click offers. **billing** masters the money relationship: long-term contracts/agreements, recurring charges, metered-utility readings/charges, invoices, payments, house accounts, rate/contract templates. **service** masters boatyard work: work orders, estimates, labor time, parts, haul-out and launch scheduling, pump-out logs. **fuel** masters the fuel dock: tanks, dispensers, fuel sales, fuel-inventory and SPCC records. **retail-pos** masters non-fuel store/POS products and transactions. A cross-cutting **crm** masters boaters/vessels with insurance and registration docs; **access** masters gate credentials and access events.

## Open market-shape forks (for the q-file)

- **Boatyard service module vs separate domain.** Service/work-orders/haul-out is its own module here, but DockMaster treats it as a near-equal ERP pillar. Fork: keep `service` inside MARINA-MGMT, or split a generic FLEET-MAINT / asset-service domain that MARINA-MGMT consumes.
- **Fuel dock POS: master vs consume.** `fuel` and `retail-pos` overlap with a generic retail-POS / payments domain. Fork: master fuel-dock specifics here (tanks, dispensers, pay-at-pump) and consume only generic `products`/`pos_transactions`, or master both.
- **Transient-booking marketplace as its own module.** Dockwa and Snag-A-Slip are marketplace-first; the boater-facing booking/discovery surface may warrant its own module (or even a separate MARINE-TRAVEL domain) distinct from operator-side `reservations`.
- **Boat sales / dealership scope.** DockMaster includes boat-sales deals and dealership inventory. Fork: explicitly out-of-scope (separate BOAT-DEALER domain) vs a thin in-scope module.
- **CRM ownership.** Boaters/vessels/insurance/registration could be a marina-local `crm` module or promoted to a shared master consumed by reservations, billing, and service.
- **Metered utilities granularity.** Whether `utility_meters`/`meter_readings` live in `billing` or split into a dedicated `utilities` module (electric/water/Wi-Fi/pump-out metering) is a borderline Rule-14 call.
- **Yacht-club / membership scope.** Marina Master and MarinaOffice bundle yacht-club membership/loyalty. Fork: in-scope membership module vs out-of-scope (separate CLUB-MGMT domain).
