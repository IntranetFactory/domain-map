# Supply Chain Risk Management (SCRM): questions waiting for you

## What this domain is

Map your supply chain beyond your direct suppliers, down through the tiers, and watch it for trouble. Continuously monitor external disruption signals (weather, geopolitics, financial distress, cyber, forced labor) across the suppliers and sites you depend on but often have no direct relationship with, score the risk, and orchestrate a response when a disruption hits.

This is a NEW domain, just promoted from the candidate queue. Nothing is loaded yet. These four questions decide its shape; once you answer (rename this file to `a-SCRM.md`), I run the build (Phase 0 vendor research is already done at `.tmp_deploy/SCRM-phase0-2026-06-19.md`).

---

q1: Should SCRM map its own supply-chain network (its own node records for indirect and sub-tier entities), or just read your existing supplier list? (answer this first)

- a) Master a `supply_chain_nodes` graph (including indirect / sub-tier entities you have no direct record of) and embed your SRM suppliers into it.
- b) Only consume SRM `suppliers`; no separate network-node records.

Recommended: a. Resilinc, Interos, Everstream, and Sayari all persist N-tier graph nodes that include sub-tier and indirect entities the buyer has no direct relationship with (the Interos network, Sayari Map, Resilinc multi-tier part-site map). Those sub-tier nodes have no SRM supplier record by definition, so option b cannot represent the graph these vendors sell. Option a masters a node entity distinct from the direct-supplier master and links the known direct suppliers back to SRM, so the SRM supplier master stays the single master for direct suppliers (Rule M7) while SCRM adds the indirect nodes.

a1:

---

q2: How many modules should SCRM ship as?

- a) Three modules: network mapping, risk intelligence (monitoring + scoring), and disruption response.
- b) Two modules: fold disruption response into risk intelligence.

Recommended: a. The pure-plays productize three separable surfaces: the N-tier MAP (Resilinc part-site mapping, Interos relationship graph, Sayari Map, Everstream multi-tier visibility); the MONITORING/SCORING engine (Resilinc EventWatchAI, Interos multi-model scoring, Everstream predictive scores, Prewave AI alerts, Sphera risk radar); and RESPONSE (Resilinc WhatIf revenue-at-risk simulation, Everstream exposure analytics, Sphera response). Resilinc and Everstream sell mapping, monitoring, and response/what-if as distinct capabilities, which is the case for three modules; Prewave and Sayari are thinner on the response surface, which is the case for folding response into risk-intelligence (option b).

a2:

---

q3: Should SCRM track forced-labor / ESG exposure itself, or leave that to the ESG domain?

- a) SCRM masters a `forced_labor_exposures` record (tier-level, monitored as a signal).
- b) Defer to the ESG domain; SCRM only consumes it.

Recommended: a. Prewave, Sayari, and Sphera SCRM (SupplyShift) treat forced-labor / UFLPA exposure as a continuously monitored, tier-level supply-chain signal (news, social, customs, ownership), which is a different record from the ESG domain's per-supplier scorecard (`supplier_esg_assessments`, mastered by ESG). Option a lets SCRM master the event-shaped cross-tier exposure while still consuming the ESG scorecard; option b folds it wholly into ESG and loses the cross-tier monitoring surface every SCRM pure-play sells.

a3:

---

q4: Which business function owns SCRM?

- a) Supply Chain (owner), with Procurement and GRC as contributors.
- b) Procurement (owner), with Supply Chain and GRC as contributors.
- c) GRC (owner), with Supply Chain and Procurement as contributors.

Recommended: a. Resilinc, Interos, Everstream, and Prewave position primarily to Chief Supply Chain Officers and supply-chain risk teams, with procurement as the day-to-day user of supplier alerts and GRC consuming elevated risk into the enterprise register. Option a matches that buyer; option b fits orgs where supplier risk sits under the CPO; option c fits a risk-register-first framing but understates the operational supply-chain buyer.

a4:

---

<!-- agent map, ignore: q1=B2-SCRM-NODE-IDENTITY q2=B2-SCRM-MODULES q3=B2-SCRM-FORCED-LABOR q4=B2-SCRM-OWNER-FN | domain_id=new (unbuilt) | phase0=.tmp_deploy/SCRM-phase0-2026-06-19.md -->
