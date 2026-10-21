# Phase 0 — Vendor surface: Short-Term / Vacation Rental Management (STR-MGMT)

Date: 2026-06-14. Produced as the forcing step before drafting Phase A/B for a net-new domain (Rule #22).

## Point-solution test verdict

PASS, decisively. Independent vendors sell short-term/vacation rental management as their flagship product, and the vendor set barely overlaps with long-term residential PM (AppFolio/Buildium/Yardi). The market is channel-distribution + guest-experience + revenue-management shaped, not lease-and-screen shaped. Distinct enough from the existing `RE-PROP-MGMT` (Residential Property Management) to be its own domain, not a capability under it.

## Boundary decisions (vs already-loaded neighbors)

| Concept | STR-MGMT models | Already mastered elsewhere | Resolution |
|---|---|---|---|
| The rented unit | `str_listings` (a marketed, channel-published unit: amenities, capacity, house rules, photos) | `rental_units` (357, RE-PROP-MGMT, long-term lease unit) | Distinct objects, distinct lifecycle. STR masters `str_listings`. |
| The booking | `str_reservations` (nightly stay, channel-sourced) | `room_reservations` (591, IWMS corporate desk/room booking) | Distinct. Prefix avoids collision. |
| The for-sale listing | n/a | `real_estate_listings` (352, RE-BROKERAGE) | Out of scope. |
| The occupant | `str_guests` (transient guest) | `property_tenants` (358, RE-PROP-MGMT lease tenant) | Distinct: guest ≠ tenant. |

All STR data_objects carry the `str_` / explicit prefix per Rule #9 (default-prefix; no canonical bare-word claim).

## Flagship vendors (surveyed)

| Vendor | Tier / focus | Notable surface emphasis |
|---|---|---|
| Guesty | Market leader; mid-market → enterprise PMs | Full PMS + channel manager + unified inbox + automation + accounting |
| Hostaway | Mid-market | Channel manager + PMS + automation + marketplace |
| Lodgify | SMB / direct-booking | Website builder + booking engine + channel manager |
| OwnerRez | SMB / prosumer | Strong owner trust accounting + statements + channel mgmt |
| Hospitable (ex-Smartbnb) | SMB / automation | Guest messaging automation, team tasks |
| Streamline | Enterprise vacation rental | Full PMS + trust accounting + call center |
| Track (TRACK Hospitality) | Enterprise | CRM + call center + PMS |
| Escapia (Expedia) | Enterprise vacation rental | PMS + trust accounting + distribution |
| Hostfully | SMB/mid | PMS + digital guidebooks |
| Compliance/adjacent: Avalara MyLodgeTax, Granicus Host Compliance | Lodging-tax / permit specialists | Occupancy-tax remittance, local STR permit registration |
| Pricing specialists: PriceLabs, Beyond, Wheelhouse | Dynamic-pricing point tools | Demand-based nightly rate optimization |

## Entity surface matrix

Classification: Core (≈all vendors) / Common (most) / Specialist (some) / Compliance (regulated).

| Entity (proposed) | Class | Guesty | Hostaway | Lodgify | OwnerRez | Streamline | entity_type |
|---|---|---|---|---|---|---|---|
| `str_listings` | Core | ✅ | ✅ | ✅ | ✅ | ✅ | operational_workflow |
| `str_reservations` | Core | ✅ | ✅ | ✅ | ✅ | ✅ | operational_workflow |
| `str_guests` | Core | ✅ | ✅ | ✅ | ✅ | ✅ | operational_record |
| `str_channel_connections` | Core | ✅ | ✅ | ✅ | ✅ | ✅ | operational_workflow |
| `str_rate_plans` | Core | ✅ | ✅ | ✅ | ✅ | ✅ | catalog |
| `str_guest_messages` | Common | ✅ | ✅ | ✅ | ✅ | ✅ | operational_record |
| `str_housekeeping_tasks` | Common | ✅ | ✅ | ◻ | ✅ | ✅ | operational_workflow |
| `str_owner_statements` | Common | ✅ | ✅ | ◻ | ✅ | ✅ | operational_workflow |
| `str_property_owners` | Common | ✅ | ✅ | ◻ | ✅ | ✅ | operational_record |
| `str_reviews` | Common | ✅ | ✅ | ✅ | ◻ | ✅ | operational_record |
| `str_permits` | Compliance | ◻ | ◻ | ◻ | ✅ | ✅ | operational_record (optional) |
| `str_lodging_tax_records` | Compliance | ✅ | ◻ | ◻ | ✅ | ✅ | operational_workflow (optional) |

`◻` = not a first-class master in that vendor. Per Rule #16: `str_housekeeping_tasks`, `str_owner_statements`, `str_property_owners`, `str_reviews` show ≥1 flagship vendor without the entity → ship `master + optional` (case C). `str_permits` + `str_lodging_tax_records` are jurisdiction-conditional → `master + optional` (case B). The workflow-halts-without-it required masters: `str_listings`, `str_reservations`, `str_guests`, `str_channel_connections`, `str_rate_plans`.

## Modularization hypothesis (4 full modules)

Matches how vendors package and how point-tools carve out (Breezeway/Turno for ops, PriceLabs/Beyond for pricing, OwnerRez for owner accounting):

1. **STR-MGMT-LISTINGS-CHANNELS** — Listings, Channel Distribution, Dynamic Pricing. Masters: `str_listings`, `str_channel_connections`, `str_rate_plans`.
2. **STR-MGMT-RESERVATIONS-GUEST** — Reservations + Guest Experience. Masters: `str_reservations`, `str_guests`, `str_guest_messages`, `str_reviews`.
3. **STR-MGMT-OPERATIONS** — Turnover and Field Ops. Master: `str_housekeeping_tasks`; embeds `str_listings`/`str_reservations`.
4. **STR-MGMT-TRUST-ACCOUNTING** — Owner Trust Accounting + Compliance. Masters: `str_property_owners`, `str_owner_statements`, `str_permits` (opt), `str_lodging_tax_records` (opt).

## Compliance entities required for regulated scope

- Lodging / occupancy / transient-occupancy tax collection + remittance → `str_lodging_tax_records` (jurisdiction-conditional, optional).
- Local STR registration / permit numbers + expiry tracking → `str_permits` (jurisdiction-conditional, optional).
No FCRA/HIPAA/PCI first-class masters (payment processing is delegated to a tool/connector, not mastered).

## Open market-shape decisions (for the q-file / user)

- D1 (gate): 4-module split as above vs folding Operations into Reservations and Trust-Accounting into a single back-office module (2-3 modules). Recommended: 4, because the operations and owner-accounting halves are exactly where the standalone point tools (Breezeway/Turno; OwnerRez) prove the surface is separately deployable.
- D2: dynamic pricing as a capability inside LISTINGS-CHANNELS vs its own module. Recommended: capability inside LISTINGS-CHANNELS (PriceLabs/Beyond are integrations, not a separate buyer-deployed module within a PMS).
- D3: domain name "Short-Term and Vacation Rental Management". Code `STR-MGMT`.
