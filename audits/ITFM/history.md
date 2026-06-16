# ITFM (IT Financial Management / TBM) audit history

New-domain candidate. The domain does not yet exist in the catalog. This directory holds
the Phase 0 research and the create/shape decisions for the user.

## 2026-06-16 — Phase 0 (new-domain research)

### Summary
- Trigger: cluster-audit engagement on the ITAM family ("ERP for IT, 50-250 users"); ITFM/TBM
  surfaced as a genuine missing market in the budget/cost-allocation space that FINOPS (cloud only)
  and FIN (general ledger) do not cover.
- Method: Phase 0 vendor-surface research (read-only, no catalog writes). Full report:
  `.tmp_deploy/ITFM-phase0-2026-06-16.md`.
- Verdict: ITFM/TBM PASSES the Rule #2 point-solution test as a distinct top-level domain.

### Point-solution verdict
Four independent pure-plays sell this as their flagship product: Apptio (an IBM company, the
category definer; ApptioOne), Nicus Software (M-ITFM), MagicOrange (allocation engine), and
Serviceware Financial (EU). The category has its own standards body (TBM Council, which owns the
TBM taxonomy: Cost Pools -> IT Towers -> Services -> Business Units, the "Bill of IT") and its own
analyst category (Gartner IT Financial Management Tools). ServiceNow ships a suite ITFM module,
confirming the mainline. FIN vendors (NetSuite, SAP S/4, Workday Financials, Sage Intacct) master
none of cost pools, IT towers, the TBM taxonomy, or the Bill of IT, so ITFM is not a sub-feature of FIN.

### Boundaries (what ITFM masters that neighbors do not), by name
- vs FINOPS (id 41): FINOPS (Cloudability, CloudHealth) is cloud-only cost optimization; ITFM
  allocates the WHOLE IT estate (data center, network, labor, software, plus cloud) via the TBM
  taxonomy. Apptio sells both as separate products (Cloudability = FINOPS, ApptioOne = ITFM),
  proving they are distinct surfaces inside one vendor.
- vs FIN (id 65): FIN is the system of record (GL, AP/AR, close). ITFM masters no journal entries;
  it consumes FIN actuals as a cost source and produces management-accounting allocations FIN never holds.
- vs SPEND-MGMT (id 133): SPEND masters employee-initiated card/expense/bill-pay transactions; ITFM
  allocates already-incurred cost. No shared mastered entities.
- vs ITAM (id 3): ITAM/portfolio-reporting masters per-asset TCO; ITFM masters the service/business-unit
  cost view (the Bill of IT). ITFM consumes asset cost as a source, does not master assets.

### Segment honesty (carried into the create decision)
ITFM/TBM is an ENTERPRISE market and does NOT serve the 50-250-user segment this engagement started
from. Apptio/Nicus/Serviceware buyers are large IT organizations (six-figure licensing, multi-month
TBM-taxonomy modeling). For the mid-market the "IT budget" need is met by the general ledger (FIN)
plus spreadsheets. Proposed metadata reflects this: min_org_size = 50 xl 10000+, cost_band = $$$$.

### Proposed shape (full detail in the Phase 0 report)
- 3 full modules: cost-allocation-modeling, cost-transparency-showback, it-budgeting-and-planning.
- Telecom/Technology Expense Management (TEM: Tangoe, Calero, Brightfin, Sakon) flagged as a SEPARATE
  candidate domain, not an ITFM module.
- Owning function: a new "IT Financial Management" sub-function under Finance (sibling of Cloud
  Financial Operations and FP&A).
- ~8 capabilities drafted; Rule #8 metadata drafted (domain_code ITFM, crud_percentage 70,
  certification_required FALSE, usa_market_size_usd_m ~900 / 2024 TRIANGULATED, source confirmation pending).

### Open decisions
See `state.yaml` (b2 items) and `q-ITFM.md`. Nothing has been written to the live catalog (Rule #21
research carve-out: a new domain is surfaced in a q-file first and loaded only after the a-file approves).
