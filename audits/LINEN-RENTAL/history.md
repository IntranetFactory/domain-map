# LINEN-RENTAL audit history

## 2026-06-15 - Research (Phase 0, new-domain candidate)

### Summary

LINEN-RENTAL (Commercial Linen & Uniform Rental Management) is a NEW candidate domain covering the B2B industrial/commercial laundry, linen-supply, uniform-rental, RFID linen/garment tracking, and route-delivery (direct-store-delivery, DSD) software market. The user has NOT yet approved creating it. This pass produced the Phase 0 vendor-surface research and the market-shape decisions, and wrote the `q-LINEN-RENTAL.md` companion file. Nothing was written to the live catalog: this is research and drafting only, awaiting q-file answers.

### Classification verdict (point-solution-market test, Rule #2)

PASS. At least three independent vendors sell a flagship product whose entire purpose IS this market:

- ABS (ABSSolute): a dedicated textile-rental ERP with 600+ installs, covering contracts, rental, logistics, RFID, route accounting, and plant production.
- LinenTech: cloud commercial linen-rental management used by 250+ laundries, with par billing, RFID, a routes/driver app, and production scheduling.
- Textile Technologies (RouteManager): route accounting "built exclusively for textile rental since 1993," serving uniform, linen, and mat rental.

Two further independent confirmations: LinenMaster (multi-segment SaaS: healthcare, hospitality, route accounting, industrial/uniform, sterile pack) and Positek RFID (TextileTrack, a RAIN/UHF linen-and-uniform tracking specialist). This is dedicated software, not a generic rental tool repurposed, so the market clears the domain bar.

### Flagship vendors (5)

ABS (ABSSolute), Positek RFID (TextileTrack), LinenTech, LinenMaster, Textile Technologies (RouteManager). Full surface matrix (39 market entities + 6 compliance entities, classified Core / Common / Specialist / Compliance) saved to `.tmp_deploy/LINEN-RENTAL-phase0-2026-06-15.md`. Vendors dropped after failing verification: SPSL / Spindle Live, eLaundr, Laundrylux business systems, Image Apparel Solutions. Adjacent verified-but-unused names: Mobile Computing Corp (M-LINX), Alliant Systems by TEXO, Bundle Laundry, InTempo.

### Proposed module shape

Three FULL modules plus one OPTIONAL fourth (Rule #14: 3 capabilities present, so >=2 full modules required; each module owns >=1 master):

1. rental_contracts: masters customer accounts, rental contracts, par-level definitions, rental orders, billing/invoicing, and rate templates (the agreement, par, and money surface).
2. linen_tracking: masters linen items, garment items, RFID tags, scan events, and inventory stock levels (physical item identity, RFID reads, soil/clean counts, loss).
3. route_delivery: masters delivery routes, route stops, driver runs, and route settlements (DSD execution and driver compliance).
4. OPTIONAL production_operations: masters wash batches, sort operations, finishing operations, and plant work orders.

The fourth module is genuinely optional because vendor packaging splits cleanly: ABS and LinenTech ship plant/production modules, while Textile Technologies and LinenMaster sell route-accounting/management without a wash-floor, and Positek is tracking-only.

### Key market-shape findings (named-vendor grounded)

- Production sub-scope is a real, vendor-grounded split (ABS, LinenTech have plant modules; Textile Technologies, LinenMaster do not; Positek is tracking-only). It is OPTIONAL; the core domain stands on contracts + tracking + route.
- Route execution is MASTERED here, not consumed: every full-suite vendor ships its own route module (ABS "Route Accounting"/"Product Delivery"; LinenTech own Routes/Driver App; Textile Technologies' entire product is RouteManager). Route settlement (driver-level cash/billing reconciliation) and par-replenishment are textile-rental-specific and would be lost if consuming a generic FLEET-MGMT/FSM route capability. (Industry-term collision noted: WorkWave also markets a product called RouteManager; the textile vendors do not integrate it.)
- Uniform rental and flat-linen rental are ONE domain. The B2B majors (Cintas, UniFirst, Aramark, Alsco) rent uniforms AND flat linen (plus mats) to the same accounts; the software mirrors this (ABS covers Linen Supply and Garment Services in one product; Textile Technologies' RouteManager serves uniform, linen, and mat in one system; LinenMaster lists both Industrial/Uniform and Healthcare/Hospitality). Modeled as item-category variants (garment_items vs linen_items), not two domains.

### Boundary with LAUNDROMAT-MGMT (sibling candidate, researched in parallel)

Clean line. LINEN-RENTAL is B2B: contract/par billing, DSD routes, RFID item-level rental, and plant production for hospital/hotel/uniform accounts (all five flagship vendors sit here). LAUNDROMAT-MGMT is retail/B2C: self-service POS, coin/card machine management, and walk-in wash-dry-fold orders (Cents, CleanCloud class of product). The distinguishing entities are rental_contracts + par_level_definitions + route_settlements (B2B only) versus machine POS sessions and consumer wash-dry-fold tickets (B2C only). No flagship vendor in this study sells laundromat POS, which confirms the boundary; the shared "laundry plant" concept does not merge them because the customer relationship (rental contract versus walk-in transaction) is categorically different.

### Catalog grounding (read-only checks performed this pass)

- No existing laundry/linen/uniform/textile domain (`/domains` ilike scan returned empty). LSD in the catalog is Legal Service Delivery, unrelated. Adjacent existing domains: FSM (id 31), FLEET-MGMT (id 147), FLEET-MAINT (id 149).
- No cross-cutting route-optimization capability exists to consume: every route/delivery/dispatch capability in the catalog is domain-scoped (FDS-ROUTE-OPTIMIZATION for DTC food delivery, FSM-DISPATCH-OPT for field service, FLEET-DISPATCH for fleet). This reinforces the "master, do not consume" route decision.
- Data-object name collisions noted for the proposed masters: `customers` is the canonical bare word (CRM-mastered); `invoices` is canonically owned by S2P; `delivery_routes` already exists (FDS food-delivery, not canonical/bare); `rental_units`, `rental_leases`, `rental_applications` exist (real-estate/property). Generic nouns (`work_orders`, `assets`, `inventory`, `contracts`) are uniformly scope-prefixed across the catalog. LINEN-RENTAL masters must therefore be scope-qualified at load time (e.g. `linen_rental_*` / `linen_*` prefixes; consume `customers` and `invoices` rather than re-master). This is a Phase B / Rule #9 concern recorded for when the domain is approved; it is not a q-file question.

### Outcome

Nothing written to the live catalog. The domain does not exist yet. The gate question (create LINEN-RENTAL at all) and the five market-shape decisions are in `q-LINEN-RENTAL.md` awaiting user answers. `state.yaml` set to `status: feedback_needed`, `next_action_by: user`.
