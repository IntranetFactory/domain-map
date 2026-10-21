# ITAM (IT Asset Management) — Cross-Asset Umbrella Market Surface — 2026-06-16

ITAM is an **umbrella** domain (domain_id=3). Children HAM (hardware), SAM (software), SMP (SaaS), FINOPS (cloud cost) own the asset-class specifics. This audit covers **only the genuinely cross-asset layer** the umbrella must master: the unified contract/renewal register, the cross-asset lifecycle log, normalized catalog/SKU records, the portfolio/TCO rollup, and cross-type asset disposal. Hardware warranties/spare parts (HAM), license entitlements/true-ups (SAM), SaaS discovery/shadow-IT (SMP), and cloud budgets/anomalies (FINOPS) are out of scope and are NOT reported as MISSING.

## Current footprint (live, modules 57-60)

| Module | Masters | Other roles | State |
|---|---|---|---|
| 57 ITAM-NORMALIZATION-CATALOG | (none) | (none) | **EMPTY — Rule #14 violation** |
| 58 ITAM-CONTRACTS | `asset_contracts` | — | thin (header only) |
| 59 ITAM-LIFECYCLE | `asset_lifecycle_events` | embedded: `locations`, `org_units`; consumer: `purchase_orders` | partial |
| 60 ITAM-PORTFOLIO-REPORTING | (none) | consumer: `saas_applications` | **zero masters — Rule #14 violation** |

Cross-asset masters actually present on the umbrella: only `asset_contracts` and `asset_lifecycle_events`.

## Vendors (cross-asset umbrella)

| Vendor | Cross-asset specialty | Why included |
|---|---|---|
| Flexera One (ITAM) | Unified ITAM/SAM/SaaS/cloud; Technopedia normalization catalog | Reference umbrella; Technopedia defines the normalized catalog/SKU master. |
| Ivanti Neurons for ITAM | Unified HW+SW lifecycle, contracts, stockroom, reconciliation | Mid-to-enterprise unified ITAM; strong cross-asset lifecycle + contract register. |
| ServiceNow ITAM | HAM Pro + SAM Pro + Cloud + SaaS on one asset/CMDB model | Defines cross-asset contract/lifecycle/TCO on a shared asset table; the IT-ERP reference. |
| USU IT Asset Management | Enterprise SAM + cross-asset contract/obligation/cost; Technology Catalog | European enterprise; strong unified obligation + cost-allocation surface. |
| Lansweeper | Mid-market unified discovery + asset register (HW/SW/cloud/OT) | The 50-250-user "single what-do-we-own register" representative. |

## Surface matrix (21 cross-asset entities)

| Entity | Category | Module | Class | In ≥4 vendors | Compliance |
|---|---|---|---|---|---|
| asset_contracts | master | ITAM-CONTRACTS | core | yes | — |
| contract_renewals | junction | ITAM-CONTRACTS | core | yes | — |
| contract_obligations | compliance | ITAM-CONTRACTS | core | no (3) | obligation/audit-defense |
| contract_line_items | junction | ITAM-CONTRACTS | common | no (3) | — |
| vendor_relationships | master | ITAM-CONTRACTS | core | yes | — |
| renewal_alerts | engagement | ITAM-CONTRACTS | common | yes | — |
| asset_lifecycle_events | master | ITAM-LIFECYCLE | core | yes | — |
| asset_dispositions | junction | ITAM-LIFECYCLE | core | yes | ITAD chain-of-custody (NIST 800-88) |
| asset_assignments | junction | ITAM-LIFECYCLE | common | yes | — |
| asset_audits | compliance | ITAM-LIFECYCLE | common | yes | SOX asset existence |
| asset_records | master | ITAM-NORMALIZATION-CATALOG | core | yes | — |
| asset_models | master | ITAM-NORMALIZATION-CATALOG | core | yes | — |
| normalized_catalog_entries | master | ITAM-NORMALIZATION-CATALOG | core | yes | — |
| asset_categories | config | ITAM-NORMALIZATION-CATALOG | common | yes | — |
| manufacturers | master | ITAM-NORMALIZATION-CATALOG | common | yes | — |
| reconciliation_rules | config | ITAM-NORMALIZATION-CATALOG | specialist | no (3) | — |
| asset_cost_records | master | ITAM-PORTFOLIO-REPORTING | core | yes | — |
| tco_rollups | master | ITAM-PORTFOLIO-REPORTING | core | no (3) | — |
| cost_allocations | junction | ITAM-PORTFOLIO-REPORTING | common | no (3) | — |
| depreciation_schedules | compliance | ITAM-PORTFOLIO-REPORTING | common | no (2) | GAAP/IFRS, SOX fixed-asset register |
| portfolio_reports | config | ITAM-PORTFOLIO-REPORTING | common | yes | — |

## Diff summary counts

- **MISSING:** 13
- **WRONG-OWNERSHIP:** 0
- **SCOPE-CREEP:** 0 to delete (4 cross-domain consumer/embedded rows flagged keep — all correct shapes)

## Top 5 most-impactful missing entities

1. **`contract_renewals` (ITAM-CONTRACTS)** — The single most-wanted umbrella surface for the mid-market IT-ERP buyer: a dated, statused projection of every cross-asset contract coming up for renewal. The `asset_contracts` header exists but the renewal lifecycle that answers "what renews when, owned by whom" is absent. All four enterprise vendors model it first-class.
2. **`tco_rollups` (ITAM-PORTFOLIO-REPORTING)** — The reporting module masters nothing. The headline umbrella value ("what do we own and what does it cost") has no entity to hold it. Rule #14 violation plus the core value gap.
3. **`normalized_catalog_entries` (ITAM-NORMALIZATION-CATALOG)** — The normalization module is entirely empty. Its reason to exist (Technopedia / ServiceNow Content Library / USU Technology Catalog) is wholly unbuilt.
4. **`asset_cost_records` (ITAM-PORTFOLIO-REPORTING)** — Per-asset cross-asset cost line that feeds the TCO rollup. Without it the rollup has no inputs.
5. **`contract_obligations` (ITAM-CONTRACTS)** — Cross-asset obligation register (true-up dates, notice periods, audit clauses, minimum commitments) for audit-defense. Distinct from the contract header in Flexera/ServiceNow/USU.

## Modularization verdict: **PARTIAL**

The 4-module split is the **right** decomposition and the names self-explain to a first-time deployer; do not merge/split. But it is **not coherent in practice**: 2 of the 4 modules fail Rule #14 — NORMALIZATION-CATALOG (57) is empty and PORTFOLIO-REPORTING (60) masters nothing — and CONTRACTS lacks its renewal + obligation surface. The umbrella does not yet deliver the single "what do we own and what does it cost" view. Fix is **fill**, not refactor: populate modules 57 and 60 with their core masters and add the renewal/obligation register to 58.
