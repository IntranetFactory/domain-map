# Laundromat & Wash-Dry-Fold Management (LAUNDROMAT-MGMT): questions waiting for you

## What this domain is

Software for retail / B2C laundry businesses: self-service laundromats, drop-off wash-dry-fold (WDF) service, and residential laundry pickup-and-delivery. It runs the in-store point of sale, the washer/dryer machine fleet, the wash-dry-fold order lifecycle (intake to ready-for-pickup), and the courier routing that collects and returns a customer's own garments. The buyer is the laundromat or laundry-service owner who cleans and returns the customer's own items, distinct from a commercial linen-rental provider who owns and rents out its own linens.

---

q1: Create LAUNDROMAT-MGMT (retail / B2C self-service laundromat, wash-dry-fold, and laundry pickup-and-delivery software) as a new domain? (answer this first) (yes/no)

Recommended: yes. Five independent pure-play vendors compete in this market as a recognized software category, each with it as the flagship product: CleanCloud, Cents, Turns, Curbside Laundries, and Wash-Dry-Fold POS. None is a feature of a larger suite; each sells laundromat / WDF / pickup-delivery as its whole product. Rule #2 needs three independent flagships; this market has five. No laundry/linen/wash domain exists in the catalog today.

a1:

---

q2: How many full modules should the domain have, and at what scope?

- a) three full modules: Store POS and self-service machine operations; Wash-dry-fold order management; Pickup and delivery
- b) two full modules: fold machine ops into Store POS and combine WDF into Pickup-and-delivery
- c) one full module: a single all-in-one

Recommended: a) three full modules. The flagship vendors package the market into exactly these three product surfaces. CleanCloud sells distinct POS / wash-and-fold, pickup-and-delivery, and floor machine surfaces; Cents separates its in-store POS + machine management (Cents Connect) platform from a separate pickup-and-delivery platform (drivers, routes, online orders); Wash-Dry-Fold POS leads with POS + machine-repair tracking and adds delivery software as a distinct surface; Turns and Curbside both ship WDF order management plus a separate driver/route delivery product. The WDF order lifecycle (intake, wash, dry, fold, ready, picked up) is modeled as its own stage machine by CleanCloud, Turns and Wash-Dry-Fold POS, distinct from both the POS and the delivery route plan. All three modules are master-bearing in every flagship.

a2:

---

q3: Should LAUNDROMAT-MGMT master its own delivery orders, routes, route stops, and driver assignments, rather than consume a cross-cutting route-optimization capability shared with FSM or FLEET-MGMT?

- a) master its own routing (laundry_delivery_routes, route_stops, drivers), and optionally consume a third-party courier connector for on-demand
- b) consume a shared cross-cutting route-optimization capability from FSM or FLEET-MGMT

Recommended: a) master its own routing. All five flagships master their own native delivery routes, route stops, and drivers in-app: CleanCloud ships smart route planning with a live driver map; Cents has a dedicated pickup-and-delivery platform that adds drivers, manages routes and accepts online orders; Wash-Dry-Fold POS masters delivery routes + drivers; Curbside does in-house route creation and optimization with service areas. The two on-demand options (Turns 1-click DoorDash, Curbside DoorDash) are an optional courier-fulfillment layer on top of their own route entities, not a replacement. No flagship outsources its core routing to a generic shared engine. In the catalog there is no neutral consumable route-optimization capability: FSM-DISPATCH-OPT (FSM technician dispatch), FLEET-DISPATCH (FLEET-MGMT vehicle assignment) and FDS-ROUTE-OPTIMIZATION (FARMER-DIRECT-SALES DTC delivery) are each domain-owned. FARMER-DIRECT-SALES, a vertical retail/DTC domain, already masters its own delivery_routes and authors its own route-optimization capability; LAUNDROMAT-MGMT should follow that precedent and master its own.

a3:

---

q4: Confirm the boundary with the sibling LINEN-RENTAL candidate, keeping them as two separate domains?

- a) keep separate: LAUNDROMAT-MGMT = retail/B2C own-garment service; LINEN-RENTAL = B2B provider-owned rental + exchange
- b) merge into one laundry domain

Recommended: a) keep separate. The flagship vendor sets do not overlap and the master records differ. LAUNDROMAT-MGMT vendors (CleanCloud, Cents, Turns, Curbside, Wash-Dry-Fold POS) all model the customer's own garments being cleaned and returned (laundry_orders, garments, WDF tickets, per-order or membership revenue). Commercial linen/uniform rental is served by a different vendor set whose product masters provider-owned inventory under rental agreements with par-level exchange routes (rental_agreements, linen_inventory, par_levels, loss/replacement accounting). The shared nouns diverge: a LAUNDROMAT route returns a specific customer's order to that customer, whereas a LINEN-RENTAL route circulates provider-owned stock on a soiled-for-clean par-replenishment exchange. Two distinct point-solution markets, hence two domains.

a4:

---

q5: Should LAUNDROMAT-MGMT master the washer/dryer machine fleet, machine usage sessions, machine maintenance tickets, and real-time machine telemetry / remote-start? (yes/no)

Recommended: yes. Machine operations are first-class in the laundromat-anchored flagships. CleanCloud monitors washer and dryer usage in real time, logs maintenance issues, and assigns orders to specific washer/dryer stations; Wash-Dry-Fold POS masters individual washer/dryer units with utilization data plus machine-repair tickets (parts and failure history); Cents ships Cents Connect IoT hardware that masters real-time machine telemetry, remote machine start, and utilization insights. The delivery-first flagships (Turns, Curbside) de-emphasize machine ops but do not contradict the cluster. Self-service machine operations is exactly what separates a laundromat product from a pure WDF/courier product, so the domain should master it.

a5:

---

## Optional (will not hold up the build)

- Loyalty + memberships: master loyalty_accounts, loyalty_transactions, memberships, and subscription_plans as additive sub-areas inside the Store POS module (CleanCloud, Cents, Turns, Curbside all ship these; not a separate product).
- PCI handling: add card_data_access_logs and pci_scope_attestations as a compliance overlay inside Store POS (PCI-DSS card-present + stored card data; CleanCloud advertises PCI-compliant card storage).
- Marketing/engagement: master marketing_campaigns, customer_notifications, and customer_reviews as additive engagement entities inside Store POS / Pickup-and-delivery (every flagship ships SMS/email and on-the-way notifications).
- Third-party on-demand courier connector: a DoorDash-style courier integration in the commerce/tool layer on top of native routing (Turns and Curbside both integrate DoorDash); not a master and not a new module.

<!-- agent map, ignore: q1=B2-CREATE q2=B2-MODULES q3=B2-ROUTING q4=B2-BOUNDARY-LINEN q5=B2-MACHINES | domain_id=NEW (not yet created) -->
