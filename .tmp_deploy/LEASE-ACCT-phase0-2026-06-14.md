# LEASE-ACCT Phase 0: Vendor Surface Research

Domain candidate: Lease Accounting and Administration (LEASE-ACCT)
Date: 2026-06-14
Mode: RESEARCH ONLY (no loads, no inserts)

Central question: is the lease ACCOUNTING kernel (ASC 842 / IFRS 16) a distinct
point-solution market, or does it fold into REAL-EST / RE-CRE / a finance domain?

---

## 1. Flagship vendors (with M&A / rebrand notes)

The market splits cleanly into two camps: independent pure-play lease
accounting/administration specialists, and lease modules embedded in RE/IWMS/ERP
suites. M&A has been heavy 2021-2024, with two of the historical pure-plays now
rolled into larger parents.

| Vendor (product) | Flagship status | Standards | M&A / rebrand notes |
|---|---|---|---|
| FinQuery (product: LeaseQuery) | FLAGSHIP pure-play (lease accounting is the founding product) | ASC 842, IFRS 16, GASB 87/96, FRS 102, SFFAS 54 | LeaseQuery the COMPANY rebranded to FinQuery on 2024-02-08 (NOT "FinQuent"). The PRODUCT is still sold as LeaseQuery / "LeaseQuery powered by FinQuery". Acquired StackShine (SaaS spend); took $25M in 2024. Now positions as "contract and spend intelligence", but lease accounting remains the anchor. ~7,800 orgs. |
| Trullion | FLAGSHIP pure-play (AI-native lease + revenue accounting) | ASC 842, IFRS 16, GASB 87 | Independent. AI-first abstraction from PDFs/Excel to subledger journal entries; uses Alvarez & Marsal IBR engine. Lease accounting is the flagship; revenue recognition is the second pillar. |
| Occupier | FLAGSHIP pure-play (tenant-side lease lifecycle: admin + transaction + accounting) | ASC 842, IFRS 16 | Independent. Founded 2018. Raised $16M growth investment from Unbundled Capital in June 2025. Combines lease administration, RE transaction management (LOI -> execution), and lease accounting. |
| EZLease (insightsoftware) | Was flagship pure-play, now a portfolio product | ASC 842, IFRS 16, GASB 87/96 | Acquired by insightsoftware via the LeaseAccelerator deal (2024-07-11). insightsoftware now owns EZLease, LeaseAccelerator, PureLease, LeaseController. Still sold as a focused lease accounting product but under a finance-reporting roll-up parent. |
| Visual Lease (CoStar Group) | Was independent flagship, now a suite product | ASC 842, IFRS 16, GASB 87 | CoStar Group acquired Visual Lease 2024-11-01. Now sits alongside CoStar Real Estate Manager. NOT independent of CoStar anymore (important for the point-solution test). |
| Nakisa Lease Administration / SAP Lease Administration by Nakisa | Module-ish: co-developed and resold by SAP | FAS 13, IAS 17, ASC 842, IFRS 16, GASB 87 | SAP Solution Extension; the only equipment-leasing lease-accounting solution sold/supported by SAP. Independent company (Nakisa) but go-to-market is tightly SAP-bound. |
| CoStar Real Estate Manager | Module of an RE data/IWMS suite | ASC 842, IFRS 16, FRS 102 | CoStar Group's RE lifecycle platform. Lease accounting is one capability within total-lease-lifecycle + RE data. SOC 1 Type II. Now also owns Visual Lease. |
| Accruent Lucernex (Lx Contracts) | Module of an IWMS suite | ASC 842, IFRS 16, GASB 87 | Accruent owned by Fortive (acquired 2018, $2.0B). Lucernex acquired by Accruent 2017. Lease accounting is one of four Lucernex products inside the IWMS. |
| IBM TRIRIGA | Module of an IWMS suite | ASC 842, IFRS 16, GASB 87/96, ASC 840, IAS 17 | Real Estate Manager module turns TRIRIGA into a lease subledger. Lease accounting is a module of a large IWMS. |
| Oracle Fusion Cloud Lease Accounting | Module of an ERP | ASC 842, IFRS 16 (both simultaneously) | Native Fusion Financials module (25A docs). Daily compounding interest, daily amortization. A module of the ERP, not a standalone market. |
| SAP RE-FX | Module of an ERP | ASC 842, IFRS 16 | SAP's flexible real estate management; lease valuation lives here or via Nakisa. ERP module. |
| MRI Software (AMTdirect) | Module of an RE suite | FASB, IASB, GASB | MRI acquired AMTdirect 2021-01-27. Lease admin + accounting inside MRI's RE platform. |

Other names checked: Crunchafi (formerly LeaseCrunch), Spacebase, ProLease,
Prophix/Soft4Lease, NetSuite Fixed Assets lease module, Planon (Schneider Electric
took 80% in 2024; Planon is IWMS, lease accounting is a module). None of these change
the conclusion below.

---

## 2 + 3. Union surface matrix

Columns are the five chosen reference vendors. Three pure-plays (FinQuery/LeaseQuery,
Trullion, Occupier) and two suite leaders (CoStar REM, Nakisa). Marks = vendor masters
this entity. C = Compliance entity (required by ASC 842/IFRS 16/SOX regardless of vendor
surface). Class: Core (>=3), Common (2), Specialist (1).

| Entity (snake_case_plural, neutral) | FinQuery | Trullion | Occupier | CoStar REM | Nakisa | Class |
|---|:--:|:--:|:--:|:--:|:--:|---|
| **Master records** |||||||
| lease_agreements | X | X | X | X | X | Core |
| leased_assets | X | X | X | X | X | Core |
| lessor_parties | X |  | X | X | X | Core |
| lessee_entities | X | X | X | X | X | Core |
| rou_assets | X | X | X | X | X | Core / C |
| lease_liabilities | X | X | X | X | X | Core / C |
| lease_components | X | X |  | X | X | Core |
| lease_documents | X | X | X | X | X | Core |
| portfolio_locations | X |  | X | X | X | Core |
| **Junctions / transitions** |||||||
| lease_payment_schedules | X | X | X | X | X | Core / C |
| amortization_schedule_rows | X | X | X | X | X | Core / C |
| lease_classifications | X | X | X | X | X | Core / C |
| lease_classification_histories | X | X |  | X | X | Core |
| lease_modifications | X | X | X | X | X | Core |
| lease_remeasurements | X | X |  | X | X | Core |
| lease_reassessments | X | X |  |  | X | Common |
| lease_renewals | X |  | X | X | X | Core |
| lease_terminations | X | X | X | X | X | Core |
| lease_impairments | X |  |  |  | X | Common |
| **Audit / compliance** |||||||
| journal_entries | X | X | X | X | X | Core / C |
| gl_postings | X | X |  | X | X | Core |
| lease_disclosures | X | X | X | X | X | Core / C |
| disclosure_report_runs | X | X |  | X | X | Core |
| audit_trails | X | X | X | X | X | Core / C |
| sox_control_evidences |  |  |  | X | X | Common / C |
| accounting_period_closes | X |  |  | X | X | Core |
| **Engagement / outreach** |||||||
| critical_dates | X |  | X | X | X | Core |
| critical_date_alerts | X | X | X | X | X | Core |
| notifications | X | X | X | X | X | Core |
| approval_tasks | X | X | X | X | X | Core |
| **Configuration / templates** |||||||
| lease_templates |  | X |  | X |  | Common |
| gl_account_mappings | X | X |  | X | X | Core |
| discount_rate_tables | X | X | X | X | X | Core / C |
| chart_of_accounts_refs | X |  |  | X | X | Common |
| currencies | X | X |  | X | X | Core |
| lease_payment_terms | X | X | X | X | X | Core |
| index_rate_tables | X | X |  | X | X | Core |

Surface summary: ~30+ entities, of which the large majority are Core (>=3 vendors).
Every reference vendor masters the same accounting kernel: lease_agreements,
rou_assets, lease_liabilities, payment/amortization schedules, classifications,
modifications, journal_entries, disclosures, audit_trails, discount_rate_tables,
critical_date_alerts. Differences are at the margins (impairments, reassessments,
explicit SOX evidence objects), not the core.

---

## 4. Compliance entities (load regardless of vendor surface)

These are mandated by the standards / SOX, not optional product features.

### ASC 842 (US GAAP, FASB) - dual classification model
- rou_assets, lease_liabilities (both on balance sheet, including operating leases)
- lease_classifications: lessee = finance vs operating; lessor = operating,
  sales-type, direct-financing (three lessor buckets)
- lease_payment_schedules, amortization_schedule_rows
- lease_disclosures: quantitative + qualitative; weighted-average discount rate,
  weighted-average remaining term, maturity analysis of undiscounted cash flows,
  lease cost by type
- operating leases use a single straight-line lease cost (ROU drawn down as a
  plug / variable amount); finance leases split interest + amortization

### IFRS 16 (IASB) - single lessee model (differences vs ASC 842)
- Single lessee model: ALL lessee leases are treated like finance leases
  (no operating/finance lessee split). ROU asset depreciated systematically;
  interest unwound on the liability.
- Lessor model retains only TWO buckets (operating, finance) vs ASC 842's three.
- Low-value asset exemption exists under IFRS 16; ASC 842 sets no value threshold.
- Disclosure schedule differs: single-model presentation, different maturity-analysis
  and reconciliation requirements; no operating-lease-specific disclosures because
  there is no lessee operating class.
- Modeling impact: lease_classifications carries a standard discriminator
  (asc842 vs ifrs16) and finance/operating only applies fully under ASC 842 for
  lessees; the same lease can produce two parallel schedules (Oracle/Nakisa run
  both simultaneously).

### SOX (Sarbanes-Oxley, applies to SEC registrants regardless of standard)
- sox_audit_trails (immutable preparer/approver log with timestamps + user)
- sod_violations (segregation-of-duties: preparer != approver on journal entries)
- accounting_period_closes (close-process control, period locking)
- journal_entry_approvals (approval workflow, role-based access) - preventive ICFR
  control over the auto-generated entries
- control_evidences / control_test_results (ICFR 404 testing artifacts)

ASC-vs-IFRS one-liner: ASC 842 keeps the operating/finance distinction for lessees
and three lessor buckets; IFRS 16 is single-model for lessees (everything finance-like)
with two lessor buckets and a low-value exemption. The kernel entities are identical;
the classification and disclosure logic differs.

---

## 5. Point-solution-market test

QUESTION: are there >=3 INDEPENDENT vendors whose FLAGSHIP product is lease accounting
(not just a module of an RE/IWMS/ERP suite)?

ANSWER: YES.

Three independent flagship pure-plays as of 2026:
1. **FinQuery (LeaseQuery)** - lease accounting is the founding/anchor product;
   independent company (rebranded from LeaseQuery in 2024, NOT acquired into a suite).
2. **Trullion** - independent, AI-native; lease accounting is the flagship.
3. **Occupier** - independent (raised $16M June 2025); tenant lease lifecycle with
   lease accounting as a core pillar.

Note on consolidation pressure: two historical pure-plays are now inside parents
(Visual Lease -> CoStar 2024; EZLease/LeaseAccelerator -> insightsoftware 2024). The
market is real but consolidating upward into RE-data and finance-reporting platforms.
Even after that consolidation, the 3-independent-flagship bar is cleared comfortably.

---

## 6. Modularization hypothesis

Two modules, mirroring the accounting-vs-administration boundary that every vendor
exposes internally:

- **LEASE-ACCT-ACCOUNTING** (the ASC 842 / IFRS 16 / GASB kernel; the distinct,
  defensible point-solution core): rou_assets, lease_liabilities, lease_classifications,
  lease_payment_schedules, amortization_schedule_rows, lease_modifications,
  lease_remeasurements, lease_impairments, lease_disclosures, journal_entries,
  gl_postings, gl_account_mappings, discount_rate_tables, index_rate_tables,
  accounting_period_closes, audit_trails, sox_audit_trails, sod_violations.
  This is compliance-heavy, audited, certification-grade output. It is NOT owned by
  any real-estate domain today.

- **LEASE-ACCT-ADMINISTRATION** (records, dates, documents, payments admin):
  lease_agreements, leased_assets, lessor_parties, lessee_entities, lease_documents,
  critical_dates, critical_date_alerts, lease_renewals, lease_terminations,
  lease_payment_terms, notifications, approval_tasks, lease_templates,
  portfolio_locations.
  This OVERLAPS REAL-EST (properties/leases) and RE-CRE (CAM, escalations, LOI->lease)
  substantially. Administration is the contested layer; the accounting kernel is not.

---

## 7. Overlap analysis (vs REAL-EST / RE-CRE / FINOPS / ACCT-PLAN)

Live domain data pulled read-only this session:

- **REAL-EST** ("Real Estate and Workplace Management") - IWMS+CAFM umbrella covering
  "properties, leases, spaces, occupancy, maintenance, capital projects". It LISTS
  leases in scope, but as RECORDS for workplace management, NOT as an ASC 842 / IFRS 16
  audited subledger. REAL-EST owns the leased-property and lease-administration view.
  It does NOT own rou_assets, lease_liabilities, amortization schedules, journal entries,
  or disclosures. The ACCOUNTING KERNEL does not fold into REAL-EST: it is a finance
  compliance system whose buyer is the controller/accounting team, not facilities.
  LEASE-ACCT-ADMINISTRATION, by contrast, genuinely overlaps REAL-EST and is the part
  to deconflict.

- **RE-CRE** ("Commercial Real Estate Operations") - LANDLORD-side: CAM reconciliation,
  rent escalations, stacking plans, LOI->executed lease pipeline, tenant relations.
  This is the LESSOR/owner-operator perspective. LEASE-ACCT is predominantly the
  LESSEE/tenant compliance perspective (corporate occupiers recognizing ROU assets).
  Different buyer (CRE owner vs corporate controller), different jobs. The CRE leasing
  pipeline overlaps LEASE-ACCT-ADMINISTRATION only at the "executed lease" handoff;
  the accounting kernel is distinct.

- **FINOPS** ("Cloud Financial Operations") - cloud spend visibility/allocation.
  UNRELATED. No entity overlap. (Tangential: FinQuery now also does SaaS spend, but
  that is a separate FinQuery product, not lease accounting.)

- **ACCT-PLAN** ("Strategic Account Planning") - sales-side key-account planning.
  UNRELATED. Name collision only ("account" = customer account, not GL account).

Conclusion: the accounting kernel is distinct from all four. Administration overlaps
REAL-EST/RE-CRE and must be scoped to avoid duplicating those domains' lease records.

---

## 8. Triage recommendation

### VERDICT: promote-as-domain (LEASE-ACCT), modularized into ACCOUNTING + ADMINISTRATION

Rationale: the point-solution test passes (>=3 independent flagship pure-plays:
FinQuery/LeaseQuery, Trullion, Occupier). The accounting kernel (ASC 842 / IFRS 16
ROU assets, liabilities, amortization, classification, modification, disclosures,
journal entries, SOX controls) is a certification-grade financial-compliance surface
that NO existing domain owns: REAL-EST treats leases as workplace records, RE-CRE is
landlord-side CAM/escalations, FINOPS and ACCT-PLAN are unrelated. Administration
overlaps REAL-EST/RE-CRE and should be scoped narrowly (or cross-referenced) so it
does not duplicate those domains; the accounting kernel is the unique, defensible core.

### 7 domains-metadata estimates (for the promoted LEASE-ACCT domain)

1. **crud_percentage**: 70 (schedule/compliance-heavy: large CRUD surface of leases,
   schedules, and disclosures, but with material non-CRUD calculation logic in
   amortization, classification, and remeasurement engines that pulls it below the
   80 of pure-records domains).
2. **min_org_size**: "30 m <2500" (public companies and mid-market with material lease
   portfolios; mandatory once ASC 842 / IFRS 16 applies and a lease count outgrows
   spreadsheets, typically mid-market upward; smallest private firms stay in Excel).
3. **cost_band**: $$$ (specialist pure-plays priced per-lease/per-portfolio in the
   low-to-mid five figures annually; suite modules push toward $$$$, Excel-replacement
   entrants toward $$).
4. **certification_required**: true (output is audited financial-statement content;
   external auditor and SOX 404 sign-off required).
5. **tagline**: "Audit-ready ASC 842 and IFRS 16 lease accounting from contract to
   disclosure."
6. **description (buyer voice)**: "We need every lease, finance and operating, on the
   balance sheet with correct ROU assets, liabilities, and amortization schedules, plus
   one-click journal entries, disclosures, and a full audit trail our external auditors
   will accept. It must hold up to SOX controls and stay compliant under ASC 842 and
   IFRS 16 across our whole portfolio."
7. **typical_users / business_function owner**: Finance and Accounting (controller,
   technical-accounting / lease accounting team, financial reporting, internal audit /
   SOX). Lease administration sub-function shares with corporate real estate, but the
   domain owner is the office of the controller.

---

## Sources
- finquery.com (LeaseQuery rebrand press release; solution-features; products)
- globenewswire / insightfulaccountant / CPA Practice Advisor (FinQuery rebrand 2024-02-08)
- visuallease.com (compliance pages) ; costargroup.com / businesswire (CoStar acquires Visual Lease 2024-11-01)
- trullion.com (products/leases; IFRS 16 vs ASC 842 blog)
- occupier.com (platform) ; financialcontent (Occupier $16M June 2025)
- insightsoftware.com / globenewswire (acquires LeaseAccelerator + EZLease 2024-07-11)
- nakisa.com (ASC 842 product page; SAP Lease Administration by Nakisa)
- costarmanager.com (CoStar Real Estate Manager platform / ASC 842)
- accruent.com (Lucernex / Lx Contracts) ; gencap.com / fortive (Fortive acquires Accruent 2018)
- ibm.com docs (TRIRIGA lease accounting) ; docs.oracle.com (Fusion Lease Accounting 25A)
- mrisoftware.com (MRI acquires AMTdirect 2021-01-27)
- insightsoftware.com / netgain.tech / crunchafi (ASC 842 vs IFRS 16 vs GASB 87 differences and disclosures)
- FEI daily / Trullion (SOX controls for ASC 842; segregation of duties, journal-entry approval)
