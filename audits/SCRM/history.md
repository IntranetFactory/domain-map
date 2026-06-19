# SCRM audit history

## 2026-06-19 — Domain promoted + Phase 0 (new domain, unbuilt)

SCRM (Supply Chain Risk Management) was promoted from `audits/_missing-domains.md` on 2026-06-19, resolving the SRM audit's b2 item **B2-S4** (the user answered q1 = `a`, "promote SCRM as its own new domain", in `a-SRM.md`). SCRM is the supply-chain-disruption-intelligence overlay: N-tier / sub-tier supplier mapping plus continuous monitoring of external disruption signals (weather, geopolitics, financial, cyber, forced-labor / ESG) across suppliers the buyer often has no direct relationship with. Distinct from SRM (operational risk on the buyer's own supplier master, gating qualification) and TPRM (engagement / contract-gated diligence on direct third parties).

### Phase 0 — vendor surface

Ran Phase 0 (research only, no catalog writes): `.tmp_deploy/SCRM-phase0-2026-06-19.md`. Flagship pure-plays: Resilinc, Interos, Everstream Analytics, Prewave, Sphera SCRM (ex-riskmethods + SupplyShift), Sayari. The union surface matrix clusters into three candidate modules:

- **SCRM-NETWORK-MAPPING** — `supply_chain_nodes`, `supply_chain_links`, `supplier_facilities`, `sub_tier_discoveries` (embeds SRM `suppliers`).
- **SCRM-RISK-INTELLIGENCE** — `monitored_entities`, `risk_events`, `risk_alerts`, `supply_chain_risk_scores`, `risk_indicators`, `corporate_ownership_records`, `forced_labor_exposures`, `source_signals`.
- **SCRM-DISRUPTION-RESPONSE** — `disruption_incidents`, `impact_assessments`, `mitigation_actions`.

Eight candidate capabilities (>= the Rule #14 >=2-full-module floor). Boundary verdict (fixed in Phase 0, not re-asked): SCRM consumes SRM `suppliers` (embedded_master), does NOT re-master `supplier_risk_assessments` (730) or `supplier_esg_assessments` (327); SRM / TPRM / GRC / S2P consume SCRM's elevated risk via handoff.

### Status: gated on market-shape decisions (Rule #21 / #22)

A new domain is an expansive addition: surfaced in `q-SCRM.md` FIRST, loaded only after `a-SCRM.md` approves the shape. Four `b2` decisions are open (full text + named-vendor `evidence` in `state.yaml`):

- **B2-SCRM-NODE-IDENTITY** (gate) — master `supply_chain_nodes` + embed SRM suppliers, vs consume suppliers only. Recommended: master (the graph holds sub-tier entities with no SRM record).
- **B2-SCRM-MODULES** — 3 modules vs 2 (fold response into risk-intelligence). Recommended: 3.
- **B2-SCRM-FORCED-LABOR** — master `forced_labor_exposures` vs defer to ESG. Recommended: master (event-shaped cross-tier signal, distinct from the ESG scorecard).
- **B2-SCRM-OWNER-FN** — Supply Chain vs Procurement vs GRC owner. Recommended: Supply Chain.

`status: feedback_needed`, `next_action_by: user`. No catalog rows loaded; the build (Phase A-S) runs on answers.

### JWT errors

None.
