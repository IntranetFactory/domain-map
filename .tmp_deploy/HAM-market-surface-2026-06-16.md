# HAM (Hardware Asset Management) — Market Surface Audit

- Domain: HAM (id 51) — "Inventory, lifecycle, and disposal management of physical IT hardware assets."
- Audit date: 2026-06-16
- Type: read-only market surface (zero inserts, zero commits)

## Current footprint (HAM-owned)

| Module | id | kind | Entities |
|---|---|---|---|
| HAM-ASSET-REGISTRY | 169 | full | hardware_assets (master), hardware_models (master) |
| HAM-WARRANTY-PARTS | 170 | full | hardware_warranties (master), hardware_disposal_records (master), spare_parts_inventory (master) |

HAM-owned entity count: **5** across 2 full modules.

Host-linked starter (NOT HAM-owned, see boundary finding): HVAC-SVC-MGMT (171, starter) carries 12 field-service embedded_master entities.

## Vendors

| Vendor | Specialist in | Why included |
|---|---|---|
| Lansweeper | Network discovery + IT hardware inventory, warranty enrichment, lifecycle | Discovery-first HAM/ITAM leader |
| Device42 | Data-center hardware discovery, racks/power, lifecycle, dependency mapping | Strongest data-center hardware model; mid-enterprise |
| Snipe-IT | Open-source ITAM: assets, models, components, consumables, check-in/out, audits | Reference open schema; explicit master/junction/audit shape |
| Asset Panda | Configurable fixed + IT asset tracking, custody, maintenance, depreciation | Mid-market configurable tracker |
| EZOfficeInventory / AssetSonar | Mid-market (50-250 user) IT/equipment AM: reservations, maintenance, procurement | Mid-market specialist (target tier) |
| ServiceNow HAM Pro | Enterprise HAM lifecycle: stockroom, transfer orders, asset states, disposal, refresh | Enterprise reference for lifecycle + disposal |

## Surface matrix (entity x classification x proposed module)

| Entity | Category | Classification | Proposed module | Compliance basis |
|---|---|---|---|---|
| hardware_assets | master | core | HAM-ASSET-REGISTRY | — |
| hardware_models | master | core | HAM-ASSET-REGISTRY | — |
| hardware_manufacturers | master | common | HAM-ASSET-REGISTRY | — |
| asset_categories | config | common | HAM-ASSET-REGISTRY | — |
| asset_status_labels | config | common | HAM-ASSET-REGISTRY | — |
| asset_locations | master | core | HAM-ASSET-REGISTRY | — |
| asset_assignments | junction | core | HAM-ASSET-REGISTRY | — |
| asset_checkout_events | junction | common | HAM-ASSET-REGISTRY | — |
| asset_audits | audit | core | HAM-ASSET-REGISTRY | SOX asset existence / physical inventory |
| asset_lifecycle_states | config | common | HAM-ASSET-REGISTRY | — |
| asset_depreciation_schedules | config | common | HAM-ASSET-REGISTRY | SOX / GAAP fixed-asset |
| purchase_orders | junction | common | HAM-ASSET-REGISTRY | — (possible PROC ownership) |
| stockrooms | master | common | HAM-WARRANTY-PARTS | — |
| stock_transfer_orders | junction | specialist | HAM-WARRANTY-PARTS | — |
| asset_maintenance_records | junction | common | HAM-WARRANTY-PARTS | — |
| hardware_warranties | master | core | HAM-WARRANTY-PARTS | — |
| hardware_disposal_records | compliance | compliance | HAM-WARRANTY-PARTS | WEEE / e-waste / R2v3 / ITAD |
| spare_parts_inventory | master | common | HAM-WARRANTY-PARTS | — |
| asset_consumables | master | common | HAM-WARRANTY-PARTS | — |
| asset_components | master | common | HAM-WARRANTY-PARTS | — |
| asset_disposal_certificates | compliance | compliance | HAM-WARRANTY-PARTS | Certificate of Destruction / R2v3 / NAID AAA |
| data_sanitization_records | compliance | compliance | HAM-WARRANTY-PARTS | NIST 800-88 / GDPR Art.17 / chain-of-custody |
| asset_chain_of_custody_events | compliance | compliance | HAM-WARRANTY-PARTS | ITAD chain-of-custody / e-waste tracking |

## Compliance entities (asset disposal / e-waste / chain-of-custody)

Non-optional regardless of vendor presence, all routing to HAM-WARRANTY-PARTS:

- **hardware_disposal_records** (present) — WEEE/e-waste/R2v3 disposal event.
- **data_sanitization_records** (MISSING) — NIST 800-88 wipe/destruction per data-bearing device; GDPR Art.17 erasure proof.
- **asset_chain_of_custody_events** (MISSING) — ITAD custody log collected->transported->received->destroyed; R2v3/NAID grade.
- **asset_disposal_certificates** (MISSING) — Certificate of Destruction / recycling certificate evidence artifact.
- **asset_audits** (MISSING) — physical-existence verification underpinning SOX asset assertion.

## Diff summary counts

| Bucket | Count |
|---|---|
| MISSING | 16 (5 compliance) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 1 (spare_parts_inventory dup on mis-hosted HVAC starter) |
| BOUNDARY (host-link) | 1 (HVAC-SVC-MGMT -> HAM) |

## Top 5 most-impactful MISSING

1. **asset_assignments** (HAM-ASSET-REGISTRY) — who holds an asset; the #1 HAM concept after the asset itself; in all 6 vendors. HAM currently cannot record custody.
2. **asset_locations** (HAM-ASSET-REGISTRY) — where an asset is; universal; required for "where is this asset".
3. **data_sanitization_records** (HAM-WARRANTY-PARTS) — NIST 800-88 / GDPR Art.17 erasure proof per disposed data-bearing device; compliance-mandatory.
4. **asset_chain_of_custody_events** (HAM-WARRANTY-PARTS) — ITAD chain-of-custody for certified disposal; R2v3/NAID-grade compliance.
5. **asset_audits** (HAM-ASSET-REGISTRY) — physical inventory verification event; SOX asset-existence basis.

## Modularization commentary

**Verdict: partial (structurally coherent, depth-thin).**

The 2-module split — HAM-ASSET-REGISTRY (identity / lifecycle / custody) vs HAM-WARRANTY-PARTS (warranty / disposal / spare-parts / maintenance) — is coherent and self-explaining. Both modules keep >=1 master; Rule #14 satisfied (2 modules for a >=3-capability domain, each with masters). The register-vs-post-deployment boundary is clean: every MISSING entity lands unambiguously in one module (custody/audit/taxonomy -> registry; compliance/disposal/parts -> warranty-parts). No merge/split/rename needed. The deficiency is **depth, not structure**: with only 5 entities HAM cannot record who holds an asset, where it is, or how it was sanitized at end of life.

### BOUNDARY / MODULARIZATION finding — HVAC-SVC-MGMT host link

Starter module **HVAC-SVC-MGMT (id 171)** is host-linked to HAM (domain_id=51). Its 12 embedded_master entities (customers, crm_contacts, customer_sites, installed_equipment, service_pm_schedules, service_work_orders, field_visits, dispatch_records, service_contracts, sales_quotes, customer_invoices, spare_parts_inventory) describe an **HVAC field-service business**, not IT hardware asset management. `installed_equipment`'s own catalog description: "Customer-owned equipment that the service organization installs and maintains ... the asset register that work orders are performed against" — a **field-service** asset register.

Module 171 is host-linked to **6 domains**: FSM (31), CRM (69), CPQ (73), SUB-MGMT (97), HAM (51), FIN (65). Its natural primary home is **FSM**. The **HAM link (51) is anomalous** and should be removed. This is a `domain_module_host_domains` row DELETE = **destructive, requires explicit user approval; NOT executed in this audit**. No HVAC entity is folded into HAM's hardware surface.

The lone SCOPE-CREEP item (`spare_parts_inventory` appearing twice) is a symptom of this mis-host, not independent HAM creep — it resolves with the host-link removal, not a HAM change.

## Boundary exclusions respected (NOT reported as HAM MISSING)

- cross_asset_contracts -> ITAM umbrella
- software_licenses -> SAM
- configuration_items (CIs) -> CMDB
