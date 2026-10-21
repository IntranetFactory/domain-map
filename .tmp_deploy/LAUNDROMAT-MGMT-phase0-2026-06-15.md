# LAUNDROMAT-MGMT Phase 0 — Vendor Surface

Market: retail / B2C self-service laundromat + wash-dry-fold (WDF) + laundry pickup-and-delivery software. Date: 2026-06-15. Research + drafting only; nothing written to the live catalog.

## Flagship vendors

| Vendor | URL | Specialist in | Why included |
| --- | --- | --- | --- |
| CleanCloud | cleancloudapp.com | All-in-one POS + pickup/delivery + machine ops for laundromats, WDF, dry cleaners | Pure-play category leader; widest public entity surface (POS, in-app routing, machines, garments, lockers, loyalty) |
| Cents | trycents.com | Laundromat business OS: POS + machine IoT (Cents Connect) + WDF + pickup/delivery + memberships | Pure-play; only flagship that ships its own machine hardware/IoT (remote start, real-time telemetry) |
| Turns | turnsapp.com | WDF + dry-clean POS + pickup/delivery built "by laundromat owners" | Pure-play; ships own driver app + route mgmt AND a 1-click DoorDash on-demand option (the consume-courier signal) |
| Curbside Laundries | curbsidelaundries.com | WDF + pickup/delivery platform, route creation/optimization, multi-location/franchise | Pure-play; in-house route optimization plus DoorDash on-demand fallback; franchise/multi-store depth |
| Wash-Dry-Fold POS | washdryfoldpos.com | Laundromat POS: drop-off orders, machine + repair tracking, drivers/routes, till/cash | Pure-play; strong floor-ops + machine-repair + cash-handling surface |

All five are independent pure-play specialists whose flagship product IS this market. The point-solution-market test (SKILL.md Rule #2: name >=3 independent vendors whose flagship product is this) passes comfortably with 5.

## Surface matrix

Vendors: CC = CleanCloud, CE = Cents, TU = Turns, CU = Curbside, WD = Wash-Dry-Fold POS.

| Entity | Category | CC | CE | TU | CU | WD | Classification | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | --- | --- |
| laundry_orders | Master | x | x | x | x | x | Core | WDF order mgmt |
| laundry_order_items | Master | x | x | x | x | x | Core | WDF order mgmt |
| laundry_customers | Master | x | x | x | x | x | Core | Store POS |
| laundry_payments | Master | x | x | x | x | x | Core | Store POS |
| laundry_machines | Master | x | x |   | x | x | Core | Store POS (machine ops) |
| machine_usage_sessions | Master/transition | x | x |   |   | x | Core | Store POS (machine ops) |
| machine_maintenance_tickets | Master | x | x |   |   | x | Core | Store POS (machine ops) |
| price_lists | Config | x | x | x | x | x | Core | Store POS |
| service_items | Config | x | x | x | x | x | Core | Store POS |
| pickup_delivery_orders | Master | x | x | x | x | x | Core | Pickup & delivery |
| delivery_routes | Master | x | x | x | x | x | Core | Pickup & delivery |
| route_stops | Master/transition | x | x | x | x | x | Core | Pickup & delivery |
| drivers | Master | x | x | x | x | x | Core | Pickup & delivery |
| service_areas | Config | x | x |   | x |   | Common | Pickup & delivery |
| recurring_pickup_schedules | Config | x | x |   | x |   | Common | Pickup & delivery |
| order_status_events | Junction/transition | x | x | x | x | x | Core | WDF order mgmt |
| garments | Master | x |   | x |   |   | Common | WDF order mgmt |
| garment_tags | Config | x |   | x |   |   | Common | WDF order mgmt |
| rack_locations | Master | x |   |   |   |   | Specialist | WDF order mgmt |
| locker_assignments | Master | x |   |   |   |   | Specialist | Store POS |
| memberships | Master | x | x |   |   |   | Common | Store POS |
| subscription_plans | Config | x | x |   |   |   | Common | Store POS |
| loyalty_accounts | Master | x | x | x | x | x | Core | Store POS |
| loyalty_transactions | Junction | x | x | x | x | x | Core | Store POS |
| promo_codes | Config | x | x | x | x | x | Core | Store POS |
| employees | Master | x | x | x | x | x | Core | Store POS |
| employee_shifts | Master/transition | x | x |   |   | x | Common | Store POS |
| attendant_checklists | Config | x |   |   |   | x | Common | Store POS |
| cash_drawer_sessions | Master/transition | x | x |   |   | x | Common | Store POS |
| store_locations | Master | x | x | x | x | x | Core | Store POS |
| customer_notifications | Engagement | x | x | x | x | x | Core | Pickup & delivery (+ POS) |
| marketing_campaigns | Engagement | x | x | x | x |   | Core | Store POS |
| customer_reviews | Engagement | x |   |   | x |   | Common | Store POS |
| commercial_accounts | Master | x |   |   |   | x | Common | WDF order mgmt |
| dry_clean_tickets | Master | x |   | x |   |   | Common | WDF order mgmt |

Notes on classification:
- The three highest-frequency clusters (Core across all/most vendors) are: store POS + machine operations, WDF order lifecycle, and pickup-and-delivery (routes + drivers + stops). Each is present in every flagship.
- `laundry_machines` + `machine_usage_sessions` + `machine_maintenance_tickets` are Core because CleanCloud, Cents, and Wash-Dry-Fold POS all model them as first-class; Cents additionally ships IoT hardware (Cents Connect) that masters real-time machine telemetry and remote-start. Turns/Curbside are delivery-first and de-emphasize machine ops but do not contradict the cluster.
- Pickup-and-delivery routing entities (`delivery_routes`, `route_stops`, `drivers`) are Core: all five master them in-app. Turns and Curbside ALSO offer a DoorDash on-demand option, but that is an optional courier-fulfillment integration layered on top of their own native route entities, not a replacement for them.

## Compliance entities (non-optional)

| Entity | Regulation | Proposed module |
| --- | --- | --- |
| card_data_access_logs | PCI-DSS (card-present + stored cards; CleanCloud advertises PCI-compliant card storage) | Store POS |
| pci_scope_attestations | PCI-DSS | Store POS |

This market is light on regulated-data exposure beyond payment-card handling. There is no FCRA/HIPAA/GDPR-class compliance core here (consumer laundry, not health/financial/EU-data). The PCI pair is the genuine compliance footprint and loads regardless of how explicitly any single vendor documents it. (Add this market segment "consumer laundry retail" to the compliance table in vendor-research-protocol.md as PCI-only.)

## Modularization hypothesis

Three full modules, matching how the flagship vendors package their products:

1. **Store POS and self-service machine operations** (master module). In-store point of sale, customers, payments, price lists, service items, the washer/dryer machine fleet, machine usage sessions, machine maintenance tickets, lockers, employees/shifts/cash drawers, loyalty, memberships, store locations. This is the "all-in-one POS" all five lead with; Cents and CleanCloud anchor it on the machine fleet.
2. **Wash-dry-fold order management** (master module). The WDF order lifecycle: orders, order items, order status events, garment-level tracking, racks/bins, dry-clean tickets, commercial accounts. The headline service-fulfillment workflow that CleanCloud, Turns and Wash-Dry-Fold POS each model as a distinct stage machine (intake -> wash -> dry -> fold -> ready -> picked up).
3. **Pickup and delivery** (master module). Pickup/delivery orders, delivery routes, route stops, drivers, service areas, recurring schedules, on-the-way notifications. Every flagship masters its own native routes + drivers; Turns/Curbside add an optional DoorDash courier layer on top.

This is a >=3-capability market, so Rule #14 requires >=2 full modules; the hypothesis proposes 3, all master-bearing. Loyalty/memberships and marketing are additive sub-areas inside Store POS, not their own modules (no flagship sells them as a separable laundry product). PCI handling is compliance overlay inside Store POS.

## Catalog grounding (live reads, 2026-06-15)

- No laundry/linen/wash domain exists (`/domains?or=(domain_name.ilike.*laundr*,...*linen*,...*wash*)` returns []). LAUNDROMAT-MGMT would be net-new.
- Name collisions exist for the bare masters and must be prefixed (Rule #9):
  - `customers` (id 97) is canonically mastered by CRM (69) and additionally by MDM, CDP, CSM, SUB-MGMT. A laundry customer concept must be `laundry_customers`, not `customers`.
  - `customer_invoices` (id 107) mastered by SUB-MGMT. Use `laundry_payments` / `laundry_invoices` if needed.
  - `delivery_routes` (id 518) is ALREADY mastered by FARMER-DIRECT-SALES (158), a vertical retail/DTC domain. `store_pickup_orders` (id 428) mastered by OMS (32). New laundry routing masters need prefixed names (`laundry_delivery_routes`).
- Cross-cutting routing/dispatch capabilities already exist but are each domain-scoped, not a shared service: FSM-DISPATCH-OPT (FSM technician dispatch), FLEET-DISPATCH (FLEET-MGMT vehicle assignment), FDS-ROUTE-OPTIMIZATION + FDS-DELIVERY-WINDOW-MGMT (FARMER-DIRECT-SALES DTC delivery). There is NO neutral, consumable route-optimization capability shared across domains; FARMER-DIRECT-SALES sets the precedent that a vertical retail/DTC domain masters its OWN delivery_routes and authors its OWN route-optimization capability rather than consuming FSM/FLEET. LAUNDROMAT-MGMT should follow that precedent.

## Boundary with the sibling candidate LINEN-RENTAL

LINEN-RENTAL (commercial / industrial / B2B linen and uniform rental) is being researched in parallel. The line:
- LAUNDROMAT-MGMT = retail / B2C. The customer owns the garments; the laundromat cleans and returns the customer's own items (self-service machines, drop-off WDF, residential pickup/delivery). Revenue is per-order / per-pound / membership.
- LINEN-RENTAL = commercial / B2B. The provider OWNS the linens/uniforms (sheets, towels, mats, scrubs), rents them on contract, and runs route-based exchange (soiled-for-clean) against par levels and rental agreements. Revenue is recurring rental contracts with inventory-circulation and loss/replacement accounting.
- Shared-noun divergence: both have "routes" and "customers", but LAUNDROMAT routes carry a specific customer's order back to that customer, whereas LINEN-RENTAL routes circulate provider-owned inventory on a par-replenishment exchange. The masters differ (laundry_orders vs rental_agreements + linen_inventory + par_levels). They are two distinct point-solution markets with non-overlapping flagship vendor sets, so they are separate domains, not one.
