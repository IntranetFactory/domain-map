# LINEN-RENTAL Phase 0 - Vendor Surface

Scope: commercial/B2B linen-supply, uniform rental, RFID linen/garment tracking, and route delivery (DSD) for industrial/commercial laundries. Research only; no catalog writes.

## Flagship vendors

| Vendor | URL | Specialist in | Production floor? | Why included |
| --- | --- | --- | --- | --- |
| ABS (ABSSolute) | abslbs.com | Laundry ERP, contract/rental management, logistics for textile-rental laundries (600+ installs) | Yes (Production, Stockroom, Sort/Finish via plant modules) | World-leading dedicated textile-rental ERP; covers full surface incl. plant |
| Positek RFID (TextileTrack) | positekrfid.com | RAIN/UHF RFID linen and uniform tracking; sewn-in tags, unique item ID | No (tracking layer only; integrates with management/ERP) | Required RFID/tracking specialist; isolates the tracking surface |
| LinenTech | linentech.net | Cloud commercial laundry/linen-rental management (250+ laundries): par billing, RFID, routes | Yes (Production Scheduling & Tracking; rewash/reject/reclaim) | Modern full-surface pure-play incl. driver app and production |
| LinenMaster | linenmaster.com | SaaS laundry mgmt for healthcare, hospitality, route accounting, industrial/uniform, sterile pack | Partial (order/inventory/production support; route-accounting focus) | Broad multi-segment pure-play; confirms healthcare + sterile-pack surface |
| Textile Technologies (RouteManager) | textile-tech.com | Route accounting built only for uniform/linen/mat rental since 1993 | No (route accounting, no wash-floor module) | Pure route-accounting pure-play; grounds route master + uniform/linen/mat |

Dropped after search: SPSL / Spindle Live (could not verify any vendor/product by that name), eLaundr, Laundrylux business systems, Image Apparel Solutions (no verifiable product surface surfaced). Adjacent verified names noted but not used as columns: Mobile Computing Corp (M-LINX), Alliant Systems by TEXO, Bundle Laundry, InTempo.

## Surface matrix

| Entity | Category | ABS | Positek | LinenTech | LinenMaster | TextileTech | Classification | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | --- | --- |
| customer_accounts | Master | Y | Y | Y | Y | Y | Core | rental_contracts |
| service_addresses | Master | Y |  | Y | Y | Y | Core | route_delivery |
| rental_contracts | Master | Y |  | Y | Y | Y | Core | rental_contracts |
| par_level_definitions | Master | Y |  | Y | Y | Y | Core | rental_contracts |
| linen_items | Master | Y | Y | Y | Y | Y | Core | linen_tracking |
| garment_items | Master | Y | Y | Y | Y | Y | Core | linen_tracking |
| item_categories | Master | Y | Y | Y | Y | Y | Core | linen_tracking |
| merchandise_items | Master | Y |  | Y |  | Y | Common | rental_contracts |
| rfid_tags | Master | Y | Y | Y | Y | Y | Core | linen_tracking |
| scan_events | Junctions & transitions | Y | Y | Y | Y | Y | Core | linen_tracking |
| item_status_transitions | Junctions & transitions | Y | Y | Y | Y | Y | Core | linen_tracking |
| soil_intake_counts | Junctions & transitions | Y | Y | Y | Y | Y | Core | linen_tracking |
| clean_pack_counts | Junctions & transitions | Y | Y | Y | Y | Y | Core | linen_tracking |
| delivery_routes | Master | Y |  | Y | Y | Y | Core | route_delivery |
| route_stops | Junctions & transitions | Y |  | Y | Y | Y | Core | route_delivery |
| driver_runs | Junctions & transitions | Y |  | Y | Y | Y | Core | route_delivery |
| route_settlements | Junctions & transitions | Y |  | Y | Y | Y | Core | route_delivery |
| delivery_manifests | Junctions & transitions | Y |  | Y | Y | Y | Core | route_delivery |
| proof_of_delivery_records | Audit & compliance | Y |  | Y | Y | Y | Core | route_delivery |
| rental_orders | Junctions & transitions | Y |  | Y | Y | Y | Core | rental_contracts |
| standing_orders | Junctions & transitions | Y |  | Y |  | Y | Common | rental_contracts |
| invoices | Junctions & transitions | Y |  | Y | Y | Y | Core | rental_contracts |
| billing_charges | Junctions & transitions | Y |  | Y | Y | Y | Core | rental_contracts |
| replacement_charges | Junctions & transitions | Y |  | Y |  | Y | Common | rental_contracts |
| lost_item_charges | Junctions & transitions | Y |  | Y |  | Y | Common | linen_tracking |
| inventory_stock_levels | Master | Y | Y | Y | Y | Y | Core | linen_tracking |
| stockroom_locations | Master | Y |  | Y |  | Y | Common | linen_tracking |
| work_orders | Junctions & transitions | Y |  | Y |  | Y | Common | production_operations |
| pick_lists | Junctions & transitions | Y |  | Y |  | Y | Common | production_operations |
| wash_batches | Junctions & transitions | Y |  | Y |  |  | Common | production_operations |
| sort_operations | Junctions & transitions | Y |  | Y |  |  | Common | production_operations |
| finishing_operations | Junctions & transitions | Y |  | Y |  |  | Common | production_operations |
| rewash_reject_records | Audit & compliance | Y |  | Y |  |  | Common | production_operations |
| garment_repair_records | Junctions & transitions | Y |  | Y |  |  | Common | production_operations |
| customer_rejection_reports | Engagement & outreach | Y |  | Y | Y |  | Common | rental_contracts |
| customer_portal_requests | Engagement & outreach | Y |  | Y | Y | Y | Core | rental_contracts |
| usage_reports | Audit & compliance |  |  | Y | Y | Y | Common | route_delivery |
| billing_rate_templates | Configuration & templates | Y |  | Y | Y | Y | Core | rental_contracts |
| par_replenishment_rules | Configuration & templates | Y |  | Y |  | Y | Common | rental_contracts |

## Compliance entities (non-optional)

| Entity | Regulation | Proposed module |
| --- | --- | --- |
| bloodborne_pathogen_handling_records | OSHA 29 CFR 1910.1030 (soiled healthcare linen handling) | linen_tracking |
| hygienically_clean_certifications | TRSA Hygienically Clean / Clean Green; HLAC accreditation | production_operations |
| linen_microbial_test_results | HLAC / Hygienically Clean process-control sampling | production_operations |
| driver_hours_of_service_logs | DOT/FMCSA HOS (49 CFR 395), CDL route drivers | route_delivery |
| driver_qualification_records | FMCSA driver qualification file (49 CFR 391) | route_delivery |
| fr_garment_inspections | FR/PPE garment compliance (NFPA 2112 / OSHA PPE) | linen_tracking |

## Modularization hypothesis

Three FULL modules plus one OPTIONAL fourth. (1) **rental_contracts** masters customer_accounts, rental_contracts, par_level_definitions, rental_orders, invoices, and billing templates; it scopes the agreement, par, and money surface. (2) **linen_tracking** masters linen_items, garment_items, rfid_tags, scan_events, and inventory_stock_levels; it scopes physical item identity, RFID reads, soil/clean counts, and loss. (3) **route_delivery** masters delivery_routes, route_stops, driver_runs, and route_settlements; it scopes DSD execution and driver compliance. (4) OPTIONAL **production_operations** masters wash_batches, sort_operations, finishing_operations, and work_orders for the plant floor. Three capabilities are present (contracts/par, tracking, route), so Rule #14 is satisfied with >=2 full modules and each module owns >=1 master. The fourth module is genuinely optional because vendor packaging splits cleanly: ABS and LinenTech ship plant/production modules, while Textile Technologies and LinenMaster sell route-accounting/management without a wash-floor module, and Positek is tracking-only. This mirrors how vendors sell editions: ERP+plant (ABS, LinenTech) vs route-accounting-only (Textile Technologies, LinenMaster) vs RFID layer (Positek).

## Decision grounding (named-vendor, for the q-file)

**GATE (is this a real domain?)** Yes. At least three independent vendors' flagship product IS this market: ABS (ABSSolute, dedicated textile-rental ERP, 600+ installs), LinenTech (cloud commercial linen-rental management, 250+ laundries), and Textile Technologies (RouteManager, "built exclusively for textile rental since 1993"). LinenMaster and Positek add a fourth and fifth independent confirmation. The market has dedicated software, not just generic rental tools.

**PRODUCTION sub-scope (include wash-floor/plant or not).** Split is real and vendor-grounded. ABS ships Production, Stockroom, Sort, and Finishing modules; LinenTech ships Production Scheduling & Tracking plus rewash/reject/reclaim. Conversely, Textile Technologies (route accounting, no wash-floor module) and LinenMaster (route-accounting/management focus) sell the rental+tracking+route surface WITHOUT a plant module, and Positek is RFID-tracking-only. Recommendation: treat production_operations as an OPTIONAL sub-module that can be deferred; the core domain stands on contracts + tracking + route without it. Including it is defensible because two of five flagships master it.

**ROUTE master-vs-consume.** The domain MASTERS its own routes/stops/driver runs/settlements. Every full-suite vendor ships its OWN route module: ABS has "Route Accounting" and "Product Delivery"; LinenTech ships its own Routes App and Driver App (no third-party routing referenced); Textile Technologies' entire product is named RouteManager with native route settlement, scanning, and GPS. Route settlement (driver-level cash/billing reconciliation) is industry-specific to textile rental and is not a generic FLEET-MGMT/FSM concern, so consuming a cross-cutting route capability would lose the settlement and par-replenishment semantics. Note one industry term collision: WorkWave also sells a product called "RouteManager," but the textile vendors do not integrate it; they ship their own. Recommendation: master routes here; optionally expose vehicle/asset and HOS edges to FLEET-MGMT, but do not consume route execution.

**UNIFORM-vs-FLAT-LINEN (one domain or split).** One domain. The B2B majors serve both under one operation: Cintas, UniFirst, Aramark, and Alsco all rent uniforms AND flat linen (plus mats) to the same accounts. The software mirrors this: ABS covers "Linen Supply" and "Garment Services" in one product; Textile Technologies' RouteManager explicitly serves "uniform rental, linen supply, and mat service" in one system; LinenMaster lists both "Industrial/Uniform" and "Healthcare/Hospitality." A split would fracture shared customer_accounts, par_level_definitions, routes, and invoices. Keep uniform and flat-linen as item-category variants (garment_items vs linen_items) inside one domain, not two domains.

**BOUNDARY vs LAUNDROMAT-MGMT.** Clean line. LINEN-RENTAL is B2B: contract/par billing, routes/DSD, RFID item-level rental, plant production for hospital/hotel/uniform accounts; vendors ABS, Positek, LinenTech, LinenMaster, Textile Technologies all sit here. LAUNDROMAT-MGMT is retail/B2C: self-service POS, coin/card machine management, and wash-dry-fold orders for walk-in consumers (Cents, CleanCloud class of product). The distinguishing entities are rental_contracts + par_level_definitions + route_settlements (only on the B2B/LINEN-RENTAL side) vs machine POS sessions and consumer wash-dry-fold tickets (only on the B2C/LAUNDROMAT side). No flagship vendor in this report sells self-service laundromat POS, which confirms the boundary; the shared "laundry plant" idea does not merge them because the customer relationship (rental contract vs walk-in transaction) is categorically different.
