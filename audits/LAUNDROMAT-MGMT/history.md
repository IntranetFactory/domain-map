# LAUNDROMAT-MGMT audit history

## 2026-06-15 - Research (Phase 0, new-domain candidate)

New-domain candidate research for LAUNDROMAT-MGMT (Laundromat and Wash-Dry-Fold Management): the retail / B2C self-service laundromat + wash-dry-fold + laundry pickup-and-delivery software market. The user has NOT approved creating this domain. This pass produces the Phase 0 vendor surface plus the q-file decisions and writes NOTHING to the live catalog.

### Classification verdict (point-solution-market test, Rule #2)

PASS. Five independent pure-play vendors compete here as a recognized software category, each with this market as its flagship product: CleanCloud, Cents, Turns, Curbside Laundries, and Wash-Dry-Fold POS. The test (name >=3 independent vendors whose flagship product IS this) is met with room to spare. Recommended verdict: create the domain.

### Flagship vendors

- CleanCloud (cleancloudapp.com): all-in-one POS + pickup/delivery + machine ops; widest entity surface (POS, in-app routing with live driver map, machines + maintenance, garment tracking, lockers, racks, loyalty, subscriptions).
- Cents (trycents.com): laundromat business OS; the only flagship that ships its own machine IoT hardware (Cents Connect: remote start, real-time machine telemetry) and masters machines as first-class; plus WDF, pickup/delivery, memberships, loyalty, marketing.
- Turns (turnsapp.com): WDF + dry-clean POS + pickup/delivery; ships its own driver app and route management AND offers a 1-click DoorDash on-demand courier option.
- Curbside Laundries (curbsidelaundries.com): WDF + pickup/delivery with in-house route creation/optimization, service areas, multi-location/franchise; also a DoorDash on-demand fallback.
- Wash-Dry-Fold POS (washdryfoldpos.com): laundromat POS with drop-off orders, machines + machine-repair tickets, drivers/routes, till/cash sessions, commercial accounts.

### Proposed module shape (Rule #14: >=3 capabilities => >=2 full modules)

Three full master-bearing modules, matching how flagship vendors package their products:
1. Store POS and self-service machine operations (POS, customers, payments, price lists, machine fleet, machine usage sessions, maintenance tickets, lockers, employees/shifts/cash, loyalty, memberships, store locations; PCI overlay).
2. Wash-dry-fold order management (WDF order lifecycle, order items, status events, garment tracking, racks, dry-clean tickets, commercial accounts).
3. Pickup and delivery (pickup/delivery orders, delivery routes, route stops, drivers, service areas, recurring schedules, on-the-way notifications).

### Routing master-vs-consume finding

All five flagships master their own native delivery routes + route stops + drivers in-app. Turns and Curbside add an OPTIONAL DoorDash on-demand courier layer on top of (not instead of) their own route entities. The live catalog has no neutral, consumable shared route-optimization capability: FSM-DISPATCH-OPT, FLEET-DISPATCH, and FDS-ROUTE-OPTIMIZATION are each domain-scoped. FARMER-DIRECT-SALES (a vertical retail/DTC domain) already masters its own `delivery_routes` (id 518) and authors its own route-optimization capability. Recommendation: LAUNDROMAT-MGMT MASTERS its own routing (prefixed `laundry_delivery_routes`), following the FARMER-DIRECT-SALES precedent, and optionally consumes a third-party courier connector for the on-demand case.

### Boundary with LINEN-RENTAL (sibling candidate)

LAUNDROMAT-MGMT is retail / B2C: the customer owns the garments; the business cleans and returns the customer's own items (self-service, drop-off WDF, residential pickup/delivery). LINEN-RENTAL is commercial / B2B: the provider owns the linens/uniforms and runs route-based exchange against rental contracts and par levels. The masters differ (laundry_orders vs rental_agreements + linen_inventory + par_levels) and the flagship vendor sets do not overlap, so these are two distinct domains, not one.

### Name-collision findings (Rule #9)

`customers` (id 97, CRM-canonical + 4 others), `customer_invoices` (id 107, SUB-MGMT), `delivery_routes` (id 518, FARMER-DIRECT-SALES), `store_pickup_orders` (id 428, OMS) all already exist. LAUNDROMAT-MGMT masters must use prefixed names (`laundry_customers`, `laundry_payments`, `laundry_delivery_routes`, `laundry_pickup_delivery_orders`).

### Compliance footprint

PCI-DSS only (card-present + stored card data; CleanCloud advertises PCI-compliant card storage). No FCRA/HIPAA/GDPR-class core. Compliance entities: `card_data_access_logs`, `pci_scope_attestations`, as an overlay inside Store POS.

### Nothing written to the live catalog

This pass wrote ONLY the Phase 0 report (.tmp_deploy/LAUNDROMAT-MGMT-phase0-2026-06-15.md) and these audit artifacts. No domains/capabilities/modules/data_objects/solutions rows were inserted. Creation is gated on the q-file answers (q-LAUNDROMAT-MGMT.md). The domain does not yet exist.
