# IT Financial Management (ITFM): questions waiting for you

## What this domain is

ITFM / TBM (Technology Business Management) is the market for whole-IT-estate cost transparency,
allocation, budgeting, and showback/chargeback. It models total IT spend (data center, network,
labor, software, and cloud) through a standardized cost-pool to IT-tower to service taxonomy to
produce per-service and per-business-unit cost views (the "Bill of IT"), plan-versus-actual IT
budgets, and unit-cost metrics. It is distinct from cloud-only cost optimization (FINOPS), the
accounting system of record (FIN), employee-initiated spend (SPEND-MGMT), and per-asset total cost
of ownership (ITAM). This domain does not exist in the catalog yet; these questions decide whether
and how to create it. Nothing has been written to the live catalog.

Note up front: this is an enterprise market. It does not serve the 50-250-user segment that started
this engagement (see q5). For a mid-market org the "IT budget" need is met by the general ledger plus
spreadsheets.

---

q1: Create a new top-level IT Financial Management (ITFM/TBM) domain? (answer this first) (yes/no)

Recommended: yes. Four independent pure-plays sell this as their flagship: Apptio (an IBM company; ApptioOne, the category definer), Nicus Software (M-ITFM), MagicOrange (allocation engine), and Serviceware Financial (EU). It has its own standards body (TBM Council, which owns the TBM taxonomy) and its own analyst category (Gartner IT Financial Management Tools); ServiceNow ships a suite ITFM module. It is not a sub-feature of FIN: general-ledger vendors (NetSuite, SAP S/4, Workday Financials, Sage Intacct) master no cost pools, IT towers, TBM taxonomy, or Bill of IT. That is the point-solution fingerprint Rule #2 requires.

a1:

---

q2: If created, ship which module shape?

- a) Three modules: cost-allocation-modeling + cost-transparency-showback + it-budgeting-and-planning
- b) Two modules (fold budgeting into transparency)
- c) Other (you propose the shape)

Recommended: a) three modules. Apptio (ApptioOne: Costing + Billing + Planning), Nicus, and Serviceware all separate the allocation engine (taxonomy-driven cost flow through pools and towers), the showback / Bill-of-IT output, and IT budgeting/forecasting as distinct product areas; MagicOrange is allocation-engine-centric. The three-way split mirrors how the flagships package the market and satisfies Rule #14 for the 8 proposed capabilities.

a2:

---

q3: Model Telecom/Technology Expense Management (TEM) as a separate domain, an ITFM module, or skip it?

- a) Separate TEM candidate domain (own Phase 0 later)
- b) A module inside ITFM
- c) Skip TEM for now

Recommended: a) separate domain. Tangoe, Calero, Brightfin, and Sakon are independent TEM pure-plays with their own market, distinct from the Apptio/Nicus/MagicOrange/Serviceware ITFM allocation market. TEM masters telecom inventory and telecom invoice-audit records that ITFM allocation/showback does not; folding it in would make ITFM carry a Tangoe/Calero vendor surface the ITFM pure-plays do not.

a3:

---

q4: Which business function owns ITFM?

- a) A new "IT Financial Management" sub-function under Finance (sibling of Cloud Financial Operations and FP&A)
- b) Financial Planning and Analysis directly
- c) IT Operations

Recommended: a) new sub-function under Finance. The buyer is the IT Finance Office / IT Business Management Office, a finance discipline (allocation, budgeting, chargeback), not infrastructure. The spine already places Cloud Financial Operations under Finance, so ITFM is its whole-estate sibling and the same placement keeps the spine consistent; IT Operations is a secondary contributor (consumes the showback, owns the IT towers being costed), not the owner.

a4:

---

q5: Set ITFM as enterprise-only (min_org_size = "50 xl 10000+", cost_band = "$$$$")? (yes/no)

Recommended: yes. Apptio, Nicus, and Serviceware buyers are large IT organizations: six-figure licensing plus multi-month TBM-taxonomy modeling, and the value (internal IT towers, shared-service chargeback, business-unit showback) only exists at scale. For a 50-250-user org the IT-budget need is met by the general ledger (FIN) plus spreadsheets. Marking it mid-market-reachable would fail the catalog's min_org_size versus solution-tier internal-consistency check.

a5:

---

## Optional (will not hold up the build)

- The proposed usa_market_size_usd_m (~900, 2024) is triangulated (US ~35-40% of a ~$2-3B global ITFM tools market), not a single hard Gartner/IDC cite. Worth confirming against a Gartner ITFM Market Guide or IDC figure before the domains row loads. Tracked as B3-ITFM-MARKET-SIZE-CONFIRM.
- If q3 = a (separate TEM domain), a dedicated TEM Phase 0 (Tangoe, Calero, Brightfin, Sakon) and an entry in audits/_missing-domains.md follow. Tracked as B3-ITFM-TEM-CANDIDATE.

<!-- agent map, ignore: q1=B2-ITFM-CREATE q2=B2-ITFM-MODULES q3=B2-ITFM-TEM q4=B2-ITFM-FUNCTION q5=B2-ITFM-SEGMENT | domain_id=none (new-domain proposal) -->
