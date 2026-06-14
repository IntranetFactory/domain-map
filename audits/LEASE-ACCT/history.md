# LEASE-ACCT audit history

## 2026-06-14 - Build

### Summary

Promoted **LEASE-ACCT (Lease Accounting and Administration)** from the triage queue and built it live at `record_status='new'`. Domain id **175**, two full modules: **LEASE-ACCT-ACCOUNTING** (356) and **LEASE-ACCT-ADMINISTRATION** (357).

VERDICT: **promote-as-domain**. Phase 0 report at `.tmp_deploy/LEASE-ACCT-phase0-2026-06-14.md`. The point-solution-market test PASSES: there are at least three independent vendors whose flagship product is lease accounting, not a module of an RE/IWMS/ERP suite:

- **FinQuery (product: LeaseQuery)** - independent pure-play; lease accounting is the founding/anchor product. M&A note: the company LeaseQuery rebranded to FinQuery on 2024-02-08 (NOT "FinQuent" as the triage note suggested); the product is still sold as LeaseQuery.
- **Trullion** - independent, AI-native; lease accounting is the flagship (revenue recognition is the second pillar).
- **Occupier** - independent pure-play (raised $16M from Unbundled Capital, June 2025); tenant lease lifecycle with lease accounting as a core pillar.

M&A flagged during research: Visual Lease was acquired by CoStar Group (closed 2024-11-01) and is no longer an independent pure-play; EZLease and LeaseAccelerator rolled into insightsoftware (2024-07-11); Accruent (Lucernex) owned by Fortive; AMTdirect now part of MRI Software (2021); Nakisa go-to-market is tightly SAP-bound. The market is consolidating upward into RE-data and finance-reporting platforms, but the three-independent-flagship bar still clears.

Overlap resolution: the accounting kernel (ASC 842 / IFRS 16 ROU assets, lease liabilities, amortization schedules, classification, modification/remeasurement, journal entries, disclosures, SOX controls) is a certification-grade financial-compliance surface that NO existing domain owns. REAL-EST (141) treats leases as workplace-occupancy records (`property_leases` 345), RE-CRE (145) is landlord-side CAM/escalations/leasing pipeline (`commercial_leases` 363), FINOPS (41) is cloud spend (unrelated), and ACCT-PLAN (105) is strategic account planning (pure name collision, "account" = customer account not GL account). The ADMINISTRATION layer genuinely overlaps REAL-EST/RE-CRE and is surfaced as the two open `b2` decisions.

### Phase A - Market shape

- `domains`: 1 row. crud_percentage 70, business_logic populated (amortization/classification/remeasurement engines beyond the JsonLogic slice), min_org_size `30 m <2500`, cost_band `$$$`, certification_required **true** (audited financial-statement output, external auditor + SOX 404 sign-off), usa_market_size_usd_m 900 (2024), catalog_tagline + catalog_description in buyer voice.
- `capabilities` (7) + `capability_domains` (7): ASC 842 Compliance, IFRS 16 Compliance, Lease Classification, Right-of-Use Asset and Liability Calculation, Lease Modification Accounting, Disclosure Reporting, Lease Administration.
- `domain_modules` (2 full) + `domain_module_capabilities` (7): six accounting capabilities realize in LEASE-ACCT-ACCOUNTING; Lease Administration realizes in LEASE-ACCT-ADMINISTRATION. Rule #14 satisfied (>=3 capabilities -> >=2 full modules).
- `vendors`: 4 new (FinQuery, Trullion, Occupier, Nakisa) + reused existing (insightsoftware 382, Accruent 568, CoStar Group 581).
- `solutions` (7) + `solution_domains` (7): LeaseQuery, Trullion Lease Accounting, Occupier, Nakisa Lease Administration, CoStar Real Estate Manager, EZLease, Accruent Lucernex. Predecessor/M&A notes recorded in `solutions.notes` (the one allowed commerce-layer exception to Rule #18).

### Phase B - Data-object footprint

- `data_objects` (10 masters). All `entity_type` classified (no `unclassified`): rou_assets, lease_liabilities, lease_classifications, lease_modifications, lease_disclosures, asc842_journal_entries, lease_agreements, lease_critical_dates = `operational_workflow`; lease_payment_schedules, lease_documents = `operational_record`. Pattern flags: lease_classifications/lease_modifications `has_single_approver=true`; lease_disclosures `has_submit_lock=true`; asc842_journal_entries `has_submit_lock=true` + `has_single_approver=true`.
- Naming arbitration (Rule #9): `journal_entries` (194) already exists in the catalog, so the lease GL entry is `asc842_journal_entries` (statute-prefixed, distinct). `lease_*` prefix avoids collision with REAL-EST/RE-CRE `property_leases`/`commercial_leases`/`rental_leases`. `lease_disclosures` distinct from `disclosure_documents`/`esg_disclosures`.
- `domain_module_data_objects` (10 master rows). Rule #16 necessity: `asc842_journal_entries` is `master + optional` (statute-prefixed, SOX-conditional); the rest are `master + required` (workflow-bearing universal masters for a lessee under ASC 842/IFRS 16).
- `data_object_relationships`: 12 intra-domain edges + 7 `users` edges (Rule #10: approver on classifications/modifications, preparer/approver on journal entries, preparer on disclosures, administrator on agreements, alert recipient on critical dates) + 3 cross-domain edges (lease_agreements `accounts for` commercial_leases and property_leases; asc842_journal_entries `posts to` the GL journal_entries). Cross-domain edges are reference/association, required-if-present.
- `data_object_aliases` (11): ROU Asset, Lease Obligation, Amortization Schedule, Remeasurement, Lease Footnote Disclosure, Lease Journal Entry, Lease Contract, Critical Date, Lease Abstract, etc.
- `data_object_lifecycle_states` (28) on the 8 operational_workflow masters, each with `domain_module_id` set to the realizing module; workflow gates (`requires_permission=true`) on the approval/file/post transitions.
- `regulations` (2 new) + `domain_regulations` (3): ASC-842 (accounting_standard, US), IFRS-16 (accounting_standard, INTL), SOX (reused id 5). All `conditional` applicability (ASC 842 for US GAAP filers, IFRS 16 for IFRS filers, SOX for SEC registrants).
- `trigger_events` (7): lease.commenced, lease.modified, lease.remeasured, lease.terminated, lease_journal_entry.posted, lease_disclosure.filed, critical_date.due.
- `handoffs` (5): intra-domain lease.commenced (ADMIN->ACCT: ROU + liability recognition) and lease.remeasured (ACCT->ACCT: disclosure update), both `lifecycle_progression`; cross-domain asc842_journal_entries -> FINOPS GL (`lease_journal_entry.posted`), lease_critical_dates -> REAL-EST (`critical_date.due`), lease_disclosures -> ACCT-PLAN consolidated statements (`lease_disclosure.filed`).

### Phase C - Organisational-function coverage

- `business_function_domains` (3): Accounting = **owner**, Facilities and Real Estate = **contributor**, Internal Audit = **consumer**.

### Phase S - System skill + tools

- `tools` (10 new: 5 query, 5 mutate) + the abstraction notify tools (notify_person platform-covered, notify_team external). coverage_tier `platform` on query/mutate (Semantius-native CRUD), `external` on notify_team.
- `domain_module_tools` (14): each module carries its query + mutate floor (Rule #17: >=1 query, >=1 mutate, workflow gates present across modules).
- `skills` (1): `lease-acct-system` (id 462, skill_type=system, domain_id=175, domain_module_id NULL). Exactly one domain-grain system skill (Rule #17).

### Phase E - Personas + RACI

- `domain_roles` (3): ACCOUNTING-LEASE-ACCOUNTANT (Lease Accountant), FACILITIES-LEASE-ADMINISTRATOR (Lease Administrator), ACCOUNTING-CONTROLLER (Controller).
- `role_modules` (6): every persona has 2 module reaches (2-module floor satisfied).
- `process_raci` (10) on real cross-industry APQC PCF finance/accounting nodes (no custom-process carve-out needed): 9.3.1.2 Establish accounting policies (Controller A), 9.3.2.2 Process journal entries (Lease Accountant R, Controller A, Administrator I), 9.3.2.6 Reconcile GL accounts (Controller A), 9.3.3.4 Fixed-asset adjustments/revaluations (Lease Accountant R, Administrator C), 9.3.3.6 Calculate/record depreciation (Lease Accountant R), 9.3.4.2 Prepare consolidated financial statements (Controller A, Lease Accountant C-blocking). Exactly-one-actor satisfied on every row.

### Open items

Two market-shape `b2` decisions surfaced to the user (the build did not gate on them; the accounting kernel is unambiguous):

- **B2-SCOPE**: keep LEASE-ACCT-ADMINISTRATION mastering the lease record (current build, matches the pure-play tenant-side shape), or thin it to embedded_master/consume the REAL-EST/RE-CRE lease records (matches the CoStar/Nakisa suite shape).
- **B2-OVERLAP**: reference edges only (current build), or add LEASE-ACCT consumer DMDO rows on REAL-EST `property_leases` and RE-CRE `commercial_leases` to make the lessee-vs-occupancy silo explicit.

One non-blocking `b3` (additive substrate masters: renewals, terminations, payment terms, components, leased_assets, GL/discount/index rate tables, accounting_period_closes, sox_control_evidences).

### Loader

`.tmp_deploy/load_lease_acct_2026_06_14.ts` (single idempotent Bun loader, all phases). Run from project root. Two schema gotchas fixed at build time, both undocumented in module-shape.md: (1) `data_objects` pattern-flag booleans are NOT-NULL with DB defaults but the bulk-insert uniformizer sends null on omitted keys, so all three flags are set explicitly per row; (2) `tools.coverage_tier` has a check constraint requiring `'platform'` when `operation_kind` is query/mutate (it defaults to `'external'`). The live `data_objects` table has NO `display_label` column (module-shape doc is stale) - confirmed and only singular_label/plural_label used.
