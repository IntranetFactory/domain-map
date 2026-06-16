# Commercial Linen & Uniform Rental Management (LINEN-RENTAL): questions waiting for you

## What this domain is
Run a commercial linen-supply and uniform-rental business end to end: rental contracts and the agreed stock level (par) each customer keeps, RFID item-level tracking of every linen and garment piece, and the delivery routes that pick up soiled stock and drop off clean.

This is the B2B side of laundry: hospitals, hotels, restaurants, and industrial accounts that rent uniforms, flat linen, and mats on a service contract, billed per item and replenished on a route. It covers the agreement and money surface (contracts, par levels, orders, invoices), the physical item surface (items, RFID tags, scan events, inventory, soil and clean counts, loss), and the route-delivery surface (routes, stops, driver runs, settlements), with an optional plant-production surface (wash, sort, finish) for operators that run their own laundry floor.

---

q1: (answer this first) Should we create LINEN-RENTAL as a new domain covering the B2B commercial/industrial linen-supply, uniform-rental, RFID linen-tracking, and route-delivery market? (yes/no)

Recommended: yes. Passes the point-solution-market test: at least three independent vendors sell a flagship product that IS this market: ABS (ABSSolute, a dedicated textile-rental ERP, 600+ installs), LinenTech (cloud commercial linen-rental management, 250+ laundries), and Textile Technologies (RouteManager, "built exclusively for textile rental since 1993"). LinenMaster (multi-segment laundry SaaS) and Positek RFID (TextileTrack linen/uniform tracking) add a fourth and fifth independent confirmation. This is dedicated software, not a generic rental tool, and no laundry/linen/uniform domain exists in the catalog yet.

a1:

---

q2: Should the domain include the industrial-laundry production floor (wash batches, sort, finishing, plant work orders), or cover only the rental, tracking, and route-delivery side?

- a) Include production as an optional fourth module (production_operations), deferrable after the core three
- b) Include production as a core module from the start
- c) Exclude the production floor entirely; rental plus tracking plus route only

Recommended: a. Vendor packaging splits cleanly, so production is a defensible optional sub-scope. ABS ships Production, Stockroom, Sort, and Finishing modules, and LinenTech ships Production Scheduling and Tracking plus rewash/reject/reclaim. Conversely, Textile Technologies (RouteManager, route accounting, no wash-floor module) and LinenMaster (route-accounting/management focus) sell the rental, tracking, and route surface without a plant module, and Positek is RFID-tracking-only. Two of five flagships master production, so including it is defensible, but the core domain stands on contracts, tracking, and route without it, so modeling it as an optional, deferrable fourth module fits how the vendors sell editions.

a2:

---

q3: How should LINEN-RENTAL be split into modules?

- a) Three full modules - rental_contracts (accounts, contracts, par levels, orders, billing), linen_tracking (items, RFID tags, scan events, inventory, soil/clean counts, loss), route_delivery (routes, stops, driver runs, settlements) - plus an optional fourth production_operations module
- b) Two full modules - fold linen_tracking into rental_contracts
- c) One module covering the whole market

Recommended: a. Flagship vendors package this market into exactly these surfaces. ABS sells separate Contract and Rental Management, RFID/item tracking, and Route Accounting / Product Delivery modules. Textile Technologies (RouteManager) and LinenMaster sell route accounting/management as a distinct product from the contract/billing surface. Positek (TextileTrack) sells the RFID tracking layer as a standalone product that integrates with the ERP, which is why linen_tracking earns its own module rather than folding into rental_contracts. Three vendor-mirrored capabilities are present (contracts/par, tracking, route), so the natural shape is three full modules, with the optional fourth (production_operations) decided in q2.

a3:

---

q4: Should LINEN-RENTAL master its own route delivery (routes, stops, driver runs, settlements), or consume a cross-cutting route-optimization capability shared with FLEET-MGMT and FSM?

- a) Master route delivery inside LINEN-RENTAL (its own route_delivery module)
- b) Consume a shared route-optimization capability from FLEET-MGMT / FSM

Recommended: a. Every full-suite vendor ships its own route module. ABS has "Route Accounting" and "Product Delivery"; LinenTech ships its own Routes App and Driver App with no third-party routing referenced; Textile Technologies' entire product is named RouteManager, with native route settlement, scanning, and GPS. Route settlement (driver-level cash/billing reconciliation) and par-replenishment are textile-rental-specific and are not a generic FLEET-MGMT/FSM concern, so consuming a cross-cutting route capability would lose the settlement and par-replenishment semantics. (Note: WorkWave also markets a product called RouteManager; the textile vendors do not integrate it, they ship their own.) Master route here; optionally expose vehicle/asset and driver hours-of-service edges to FLEET-MGMT, but do not consume route execution.

a4:

---

q5: Should uniform rental and flat-linen (hospitality/healthcare) rental live in one domain, or be split into two? (yes/no)

Note: yes = one combined domain; no = split into two.

Recommended: yes (one domain). The B2B majors serve both under one operation: Cintas, UniFirst, Aramark, and Alsco all rent uniforms and flat linen (plus mats) to the same accounts. The software mirrors this: ABS covers "Linen Supply" and "Garment Services" in one product; Textile Technologies' RouteManager explicitly serves "uniform rental, linen supply, and mat service" in one system; LinenMaster lists both "Industrial/Uniform" and "Healthcare/Hospitality." A split would fracture shared customer accounts, par-level definitions, routes, and invoices, so model uniform and flat-linen as item-category variants (garment_items vs linen_items) inside one domain.

a5:

---

q6: Where is the scope line between LINEN-RENTAL (B2B commercial linen/uniform rental) and the sibling candidate LAUNDROMAT-MGMT (retail/B2C self-service laundromat and wash-dry-fold)?

- a) Split on customer relationship - LINEN-RENTAL owns B2B rental contracts, par billing, DSD routes, RFID rental, and plant production; LAUNDROMAT-MGMT owns retail/B2C self-service POS, coin/card machines, and walk-in wash-dry-fold
- b) One combined laundry domain covering both B2B rental and B2C retail

Recommended: a. Clean line on the customer relationship. LINEN-RENTAL is B2B: contract/par billing, DSD routes, RFID item-level rental, and plant production for hospital/hotel/uniform accounts; vendors ABS, Positek, LinenTech, LinenMaster, and Textile Technologies all sit here. LAUNDROMAT-MGMT is retail/B2C: self-service POS, coin/card machine management, and walk-in wash-dry-fold (Cents, CleanCloud class of product). The distinguishing entities are rental_contracts plus par_level_definitions plus route_settlements (only B2B/LINEN-RENTAL) versus machine POS sessions and consumer wash-dry-fold tickets (only B2C/LAUNDROMAT). No flagship vendor in this study sells self-service laundromat POS, which confirms the boundary; the shared "laundry plant" concept does not merge them because the customer relationship (rental contract versus walk-in transaction) is categorically different.

a6:

---

## Optional (will not hold up the build)

q7: Should I research and add the healthcare-linen hygiene and driver/FR compliance entities flagship vendors model? (yes/no)

The candidates, all additive and fitting the existing module shape (never a split): healthcare-linen hygiene (bloodborne-pathogen handling records under OSHA 29 CFR 1910.1030, Hygienically Clean / HLAC certifications, and microbial test results, modeled by LinenMaster, ABS, and LinenTech); route-driver compliance (DOT/FMCSA hours-of-service logs under 49 CFR 395 and driver-qualification records under 49 CFR 391, which could alternatively be edges to FLEET-MGMT); and garment-repair / flame-resistant inspections (repair-and-charge records and FR/PPE garment inspections per NFPA 2112, modeled by ABS and LinenTech).

Recommended: yes, but additive and can happen after the modules exist. These are real compliance and lifecycle entities uniform across the regulated segments; they are non-blocking because the three-module skeleton can land first and absorb them per the surface matrix.

a7:

---

<!-- agent map, ignore: q1=B2-CREATE q2=B2-SCOPE-PRODUCTION q3=B2-MODULES q4=B2-ROUTE q5=B2-UNIFORM-VS-LINEN q6=B2-BOUNDARY-LAUNDROMAT q7=B3-HEALTHCARE-HYGIENE+B3-DRIVER-COMPLIANCE+B3-GARMENT-REPAIR-FR | domain_id=NEW (not yet created) | phase0=.tmp_deploy/LINEN-RENTAL-phase0-2026-06-15.md -->
