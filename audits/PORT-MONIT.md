---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 32
---

# PORT-MONIT - Audit History

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- Current footprint: 7 masters + 1 embedded master (`funds`) across 4 full modules (`PORT-MONIT-PORTCO-DATA`, `PORT-MONIT-VALUATIONS`, `PORT-MONIT-FUND-PERF`, `PORT-MONIT-LP-REPORTING`); 6 capabilities; 10 solutions; **0 regulations**; 1 trigger event (`portco_valuation.final`); 1 outbound + 3 inbound cross-domain handoffs; 0 intra-domain handoffs; 0 system skills; 0 roles; 11 `data_object_relationships` rows (mostly intra-domain composition edges); 3 lifecycle states (only on `portfolio_companies`); 2 aliases (only on `portfolio_companies`); **0 APQC handoff_processes rows on any of the 4 cross-domain handoffs.**
- Vendor-surface basis: 6 flagship vendors enumerated covering PE/VC portfolio monitoring across GP-side (Chronograph, Allvue, Vestberry, eFront), VC-specialist (Standard Metrics, Visible.vc), and LP-analytics (Cobalt LP). All 10 catalog `solution_domains` rows fall inside this surface.
- **Bucket 1 (in-scope, agent fixable):** 19 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.
- Candidates queued to `audits/_missing-domains.md`: 0 (every flagship vendor in the surface fits an existing catalog domain; no orphan markets surfaced).

Structural pass headline: A (mostly), M, C pass; A4 (catalog UX), B-band, E-band, F-band, H-band all fail. F2-F5 cascade fail (no system skills exist on any module, so Semantius score is uncomputable). E1-E6 cascade fail (no roles touch any PORT-MONIT module). H1 fails on all 4 cross-domain handoffs (zero `handoff_processes` rows). B10b passes (zero NULL module FKs on the 4 handoffs). M7 passes (no within-domain ownership conflicts; `funds` embed in modules 18 + 19 is the canonical pattern). B5 passes (every embedded_master has a canonical owner: `portfolio_companies` masters in PORT-MONIT-PORTCO-DATA, `funds` masters in FUND-ADMIN-FUND-LEDGER).

### Vendor surface basis

Pure-play PE/VC portfolio-monitoring specialists chosen over diversified suites:

- **Chronograph** - LP-side reference for portfolio monitoring; rich KPI + valuation schema; ILPA-shaped LP reporting.
- **Allvue** - full private-capital suite with strong PM module + LP reporting (covers both GP and LP sides; Cobalt LP is its LP-analytics product).
- **Vestberry** - modern VC/PE portfolio monitoring; KPI templates and benchmarking emphasis.
- **eFront** (BlackRock) - enterprise alternatives investment management; ASC 820 / SFDR / AIFMD reporting reference.
- **Standard Metrics** (formerly Quaestor) - VC-side automated KPI collection from portfolio companies; data-room / accounting-connector ingestion.
- **Visible.vc** - VC-portfolio communications + KPI tracking; lighter weight than the four above.

Compliance specialists implicit in the surface: eFront and Allvue anchor the EU-side regulated leg (SFDR Article 8/9, AIFMD Annex IV); both Allvue and Standard Metrics anchor US Form PF / Advisers Act for registered advisers (>= $150M AUM threshold).

### Pass 3 - Neighbor discovery (auto-derived)

Auto-discovered from `handoffs` + cross-domain DMDO + `domain_module_data_objects` dependencies. Edge weight = handoff count + dependency count.

| Neighbor | Outbound | Inbound | DMDO deps | Edge weight | Pass-4 depth |
| --- | --- | --- | --- | --- | --- |
| FUND-ADMIN (160) | 1 (1043, portco_valuation.final -> pcap_statements) | 1 (1042, fund_distribution.executed -> fund_performance_periods) | embedded_master `funds` (mastered in FUND-ADMIN-FUND-LEDGER) | 3 | full 5-section diff |
| INV-CRM (159) | 0 | 1 (1039, vc_deal.closed -> portfolio_companies) | none | 1 | one-line summary |
| CAP-TABLE (162) | 0 | 1 (1045, exit_scenario.executed -> portfolio_companies) | none | 1 | one-line summary |
| ESG (21) | 0 | 0 | none (but `portco_esg_records` clearly semantic neighbor) | 0 (latent) | latent - flagged in Bucket 2 |

### Pass 4 - Pairwise handoff reconciliation per neighbor

#### PORT-MONIT ↔ FUND-ADMIN (edge weight 3)

**Section 1 - Existing handoffs, fully wired.**

- Outbound 1043: `portco_valuation.final` (trigger event 1188, source module 17 PORT-MONIT-VALUATIONS) -> FUND-ADMIN-LP-COMMITMENTS (13), payload `pcap_statements` (760). Both module FKs resolved. Pattern: `batch_sync`, friction `medium`. Mirror relationship 876 (`portco_valuations updates pcap_statements`) present and correctly oriented (owner_side=source).
- Inbound 1042: `fund_distribution.executed` (trigger event 1187, source module 15 FUND-ADMIN-DISTRIBUTIONS) -> PORT-MONIT-FUND-PERF (18), payload `fund_performance_periods` (768). Both module FKs resolved. Pattern: `batch_sync`, friction `low`.

**Section 2 - Existing handoffs with NULL module FK.** None.

**Section 3 - Missing handoffs the catalog implies should exist.**

- Candidate: `pcap_statement.locked` from FUND-ADMIN-LP-COMMITMENTS into PORT-MONIT-LP-REPORTING, payload `lp_quarterly_reports`. FUND-ADMIN owes the trigger_event and the source side (B9 on FUND-ADMIN). LP-reporting cannot freeze without the matching PCAP lock.
- Candidate: `fund_distribution.recorded` -> fund_position_returns (rather than fund_performance_periods only). The current 1042 handoff goes to module 18's aggregate; the per-position return needs the same payload routing.

**Section 4 - Boundary integrity gaps.** None on PORT-MONIT's side.

**Section 5 - Cross-domain `data_object_relationships` mirror check.**

- Outbound 1043: mirror rel 876 exists. PASS.
- Inbound 1042: NO mirror `data_object_relationships` row exists in the direction `fund_distributions impacts fund_performance_periods` (source `fund_distributions` (368), target `fund_performance_periods` (768)). This is a B8 gap owed by FUND-ADMIN (the source domain owns the outbound rel side). Report-only.

#### PORT-MONIT ↔ INV-CRM (edge weight 1)

Mirror rel 873 (`vc_deals becomes portfolio_companies`) exists, covering inbound handoff 1039. Both module FKs resolved on the handoff. Clean.

#### PORT-MONIT ↔ CAP-TABLE (edge weight 1)

Inbound handoff 1045 (`exit_scenario.executed` -> `portfolio_companies`) has both module FKs resolved. NO mirror `data_object_relationships` row exists in the direction `exit_scenarios concludes portfolio_companies` (source 777, target 763). Report-only B8 gap owed by CAP-TABLE.

### Bucket 1 - In-scope confirmed gaps

#### Sub-totals (by finding type)

| Finding type | Count |
| --- | --- |
| MISSING (entity gap) | 8 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (S / A / M / B / C / E / F band) | 9 |
| BOUNDARY (NULL FK or missing handoff) | 1 |
| APQC TAGGING (per-handoff PCF activity) | 1 (covers 4 handoffs) |
| MODULARIZATION (Bucket 2 only) | 0 |

#### STRUCTURAL

| ID | Band | Finding | Fix |
| --- | --- | --- | --- |
| B1-S1 | A4 | `catalog_tagline` and `catalog_description` empty on `domains.id=161`. | Draft buyer-voice tagline + 1-3 paragraph description per Rule #20; surface to user BEFORE write. |
| B1-S2 | F2 / F3 / F4 / F5 | Zero system skills exist on any of the 4 modules. `/skills?domain_module_id=in.(16,17,18,19)` returns `[]`; `/skills?domain_id=eq.161` also returns `[]`. Semantius score is uncomputable for every module. | Phase-S load: author 4 `skills` rows (`port_monit_portco_data_agent`, `port_monit_valuations_agent`, `port_monit_fund_perf_agent`, `port_monit_lp_reporting_agent`), each `skill_type='system'`, `domain_module_id` set; author ~5-12 `tools` + `skill_tools` rows per module (query / mutate per master, plus compute primitives for `compute_irr_moic_tvpi_dpi` on FUND-PERF, `compute_fair_value_mark` on VALUATIONS, `parse_kpi_packet` and `parse_esg_packet` on PORTCO-DATA, `render_lp_report` on LP-REPORTING, plus `notify_person` for share-with-LP intent). |
| B1-S3 | E1 / E2 / E3 / E4 / E5 / E6 | Zero `roles` rows have `role_modules` rows on any of the 4 modules. `/role_modules?domain_module_id=in.(16,17,18,19)` returns `[]`. The domain has 4 modules (>= 2) so the 2-module floor for role authoring is met; the E-band is unsatisfied. | Author >= 3 roles function-scoped to Investment Management: `INVESTMENT-PORTFOLIO-ANALYST` (primary on PORTCO-DATA + VALUATIONS, secondary on FUND-PERF), `INVESTMENT-FUND-CONTROLLER` (primary on FUND-PERF + LP-REPORTING, secondary on VALUATIONS), `INVESTMENT-INVESTOR-RELATIONS` (primary on LP-REPORTING, secondary on FUND-PERF + PORTCO-DATA). Each carries 4-8 `role_permissions` rows. |
| B1-S4 | A / regulations | Zero `domain_regulations` rows on PORT-MONIT despite explicit business-logic anchors to ASC 820 (in `domains.business_logic`) and SFDR for EU. None of ASC 820, SFDR, ILPA Quarterly Reporting Standards, AIFMD Annex IV, Form PF, or Investment Advisers Act exist in `regulations` at all. | Add 5 `regulations` rows + 5 `domain_regulations` links (applicability per regulation; scope to confirm in Bucket 2 #1). |
| B1-S5 | B7 | 5 of 7 masters lack explicit `users` edges. Only `portfolio_companies` (rel 885) and `portco_valuations` (rel 886) have edges in the direction `users -> master`. Missing: `portco_kpi_periods` (uploader / submitter), `portco_esg_records` (uploader), `fund_position_returns` (computed by analyst), `fund_performance_periods` (period_owner), `lp_quarterly_reports` (report_author + report_approver). | Author 5 `data_object_relationships` rows per Rule #10 (users -> master, owner_side=target, relationship_kind=reference). |
| B1-S6 | B11 | 6 of 7 masters lack any `data_object_aliases` row. Only `portfolio_companies` has 2 aliases (`portcos`, `investments`). | Draft >= 1 alias per non-self-explanatory master: `portco_kpi_periods` (`portco_metrics`, `kpi_packets`), `portco_esg_records` (`esg_packets`, `sustainability_reports`), `portco_valuations` (`fair_value_marks`, `quarterly_marks`), `fund_position_returns` (`position_returns`, `position_irr_records`), `fund_performance_periods` (`fund_quarterly_metrics`), `lp_quarterly_reports` (`lp_quarterly_packets`, `gp_reports`). |
| B1-S7 | B12 | 6 of 7 masters lack lifecycle states. Only `portfolio_companies` has 3 (`active` / `exited` / `written_off` - all `requires_permission=false`, all `domain_module_id=null`). `portco_valuations` has `has_submit_lock=true` AND `has_single_approver=true` so an explicit workflow with `requires_permission=true` transitions is implied; `lp_quarterly_reports` has `has_submit_lock=true` so a `published` workflow gate is implied. | Author lifecycle states (initial + workflow gates + terminal) on `portco_kpi_periods` (draft / submitted / accepted), `portco_esg_records` (draft / submitted / accepted), `portco_valuations` (proposed / review / approved / locked), `fund_position_returns` (computed / locked), `fund_performance_periods` (computing / computed / locked), `lp_quarterly_reports` (draft / review / published / archived). Apply `requires_permission=true` to `submitted` / `accepted` / `approved` / `locked` / `published` states. Set `domain_module_id` per master's home module. |
| B1-S8 | B9 | 1 of 7 masters has any `trigger_events` row (`portco_valuation.final` only). Missing events the lifecycle states above imply: `portco_kpi_period.submitted`, `portco_kpi_period.accepted`, `portco_esg_record.submitted`, `portco_valuation.proposed`, `portco_valuation.approved`, `fund_performance_period.computed`, `fund_performance_period.locked`, `lp_quarterly_report.published`, `portfolio_company.exited`, `portfolio_company.written_off`. | Author 10 `trigger_events` rows; for each, decide cross-domain vs intra-domain handoff via B1-S9 below. |
| B1-S10 | M5 | All 3 lifecycle states on `portfolio_companies` (`active` / `exited` / `written_off`) have `domain_module_id=null`. PORT-MONIT-PORTCO-DATA (16) is the canonical home; permission materialization will mis-prefix if left null. | PATCH `domain_module_id=16` on the 3 states. |

#### BOUNDARY

| ID | Finding | Fix |
| --- | --- | --- |
| B1-S9 | B9b - 4-module domain with zero intra-domain handoffs. Expected pairs derived from B1-S8 events + master-resolution:  (a) `portco_valuation.final` (VALUATIONS 17) -> FUND-PERF (18) on `fund_position_returns` and FUND-PERF (18) on `fund_performance_periods` for re-aggregation; (b) `portco_kpi_period.accepted` (PORTCO-DATA 16) -> FUND-PERF (18) on `fund_performance_periods`; (c) `portco_esg_record.accepted` (PORTCO-DATA 16) -> LP-REPORTING (19) on `lp_quarterly_reports`; (d) `fund_performance_period.locked` (FUND-PERF 18) -> LP-REPORTING (19) on `lp_quarterly_reports`. | Draft 4 `handoffs` rows (`source_domain_id = target_domain_id = 161`, `integration_pattern='lifecycle_progression'`, `friction_level='low'`, `source_domain_module_id` and `target_domain_module_id` set per master-resolution). |

#### MISSING (universal-vendor entities, non-regulatory)

| ID | Entity | Proposed module | Vendor evidence |
| --- | --- | --- | --- |
| B1-M1 | `valuation_methodologies` | PORT-MONIT-VALUATIONS | Universal lookup for ASC 820 typing: DCF / public-comp / transaction-comp / option-pricing / cost. Chronograph, Allvue, eFront, Vestberry all model. |
| B1-M2 | `kpi_definitions` | PORT-MONIT-PORTCO-DATA | Per-fund or per-thesis KPI template library (revenue, gross margin, burn, runway, ARR, ACV, NDR). Standard Metrics, Vestberry, Visible.vc, Chronograph all model. |
| B1-M6 | `portco_documents` | PORT-MONIT-PORTCO-DATA | Document drops from portfolio companies (financial statements, board decks, audited financials). Universal. |
| B1-M7 | `pme_benchmarks` | PORT-MONIT-FUND-PERF | Public Market Equivalent benchmark series (Kaplan-Schoar / direct alpha). Vendor-bundled by Chronograph, eFront. Required by ILPA standards. |
| B1-M8 | `valuation_committee_decisions` | PORT-MONIT-VALUATIONS | Single-approver record explaining `portco_valuations.has_single_approver=true`. Audit trail of methodology choice + override rationale per quarter. eFront, Chronograph, Allvue. |

#### MISSING (compliance-mandated entities, non-optional)

| ID | Entity | Proposed module | Regulation | Notes |
| --- | --- | --- | --- | --- |
| B1-M3 | `sfdr_disclosures` | PORT-MONIT-LP-REPORTING | SFDR (EU) | Article 8/9 fund classifications + Principal Adverse Impact indicators per fund. eFront and Allvue mandatory for EU. |
| B1-M4 | `aifmd_annex_iv_reports` | PORT-MONIT-LP-REPORTING | AIFMD (EU) | EU Alternative Investment Fund Managers Directive Annex IV quarterly / annual reporting. |
| B1-M5 | `form_pf_reports` | PORT-MONIT-LP-REPORTING | Form PF (US Advisers Act) | US-registered PE advisers >= $150M AUM. Required regardless of vendor coverage. |

#### APQC TAGGING (per-handoff PCF classification)

| ID | Finding | Fix |
| --- | --- | --- |
| B1-H1 | All 4 cross-domain handoffs (1 outbound, 3 inbound) carry zero `handoff_processes` rows. Per-handoff proposals below. | Author 4 `handoff_processes` rows: `proposal_source='agent_curated'`, `record_status='new'`. |

Per-handoff `agent_curated` proposals:

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1043 | PORT-MONIT -> FUND-ADMIN | portco_valuation.final | pcap_statements | Process and record fixed-asset adjustments, enhancements, revaluations, and transfers | 1390 (ext 10831) | confident L4 |
| 1042 | FUND-ADMIN -> PORT-MONIT | fund_distribution.executed | fund_performance_periods | Produce quarterly/annual filings and shareholder reports | 1401 (ext 10842) | confident L4 |
| 1039 | INV-CRM -> PORT-MONIT | vc_deal.closed | portfolio_companies | Develop merger/demerger/acquisition/exit strategy | 491 (ext 16805) | confident L4 |
| 1045 | CAP-TABLE -> PORT-MONIT | exit_scenario.executed | portfolio_companies | Develop exit strategy | 354 (ext 10952) | confident L3 |

Deferred-to-Discover-Pass-3: none. All 4 handoffs have clean PCF matches at L3 or L4.

### Bucket 2 - Surface-for-user (judgment calls)

1. **Regulation scoping (B1-S4 + B1-M3/M4/M5).** Which of the 5 candidate regulations should the audit add as `regulations` + `domain_regulations` rows? Options: (a) all 5 with applicability flags (ASC 820 = mandatory US accounting standard; SFDR = mandatory EU; AIFMD Annex IV = mandatory EU; Form PF = mandatory US >= $150M AUM; ILPA QRS = industry-best-practice not statutory); (b) US-only first (ASC 820 + Form PF + ILPA); (c) EU-only first; (d) defer SFDR / AIFMD until an EU-only PORT-MONIT split is ever modeled. Independent of Buckets 1 and 3, but the answer drives which of B1-M3 / B1-M4 / B1-M5 to load.

2. **Verb correctness on rels 885 + 886.** Rel 885 (`users observes portfolio_companies`, owner_side=target, is_required=false) and rel 886 (`users computes portco_valuations`, owner_side=target, is_required=false). Verbs `observes` and `computes` read more like role-side (`analyst observes`) than user-side; the more standard catalog verbs are `views` / `monitors` / `produces`. Options: (a) keep as-is, the verbs are intentional analyst-flavor and read fine in the architect view; (b) PATCH to `monitors` (for 885) and `produces` (for 886); (c) PATCH to `manages` for both, matching the convention used by most other domains. Independent of other items.

3. **`funds` embedding architecture.** `funds` (755) is mastered by FUND-ADMIN-FUND-LEDGER (12). PORT-MONIT-FUND-PERF (18) AND PORT-MONIT-LP-REPORTING (19) both embed it as `embedded_master + required`. Per Rule #16 (infrastructure masters), if a smaller PE shop could plausibly run PORT-MONIT-FUND-PERF without deploying FUND-ADMIN, the `embedded_master` shape is right and necessity should stay `required` (workflow blocks without the local shell). If FUND-ADMIN is universally co-deployed with PORT-MONIT, downgrade both DMDOs to `consumer` (the master is always present). Options: (a) keep `embedded_master + required` (current; deployability-first); (b) downgrade both to `consumer + required` (tightly-coupled cluster assumption); (c) downgrade only FUND-PERF to `consumer` and keep LP-REPORTING as embedded (LP-REPORTING may ship as a lite standalone). Independent of other items.

4. **Modularization recommendation: `lp_quarterly_reports` placement.** Vendor practice splits: Chronograph and Cobalt LP make LP-reporting LP-side (separate buyer); Allvue and eFront keep it bundled GP-side. Options: (a) keep `lp_quarterly_reports` in PORT-MONIT-LP-REPORTING (current); (b) propose splitting `LP-REPORTING` into a separate domain `LP-ANALYTICS-PLATFORM` (Cobalt LP, Chronograph LP shape) and queue via `_missing-domains.md`; (c) move `lp_quarterly_reports` mastery to FUND-ADMIN-LP-COMMITMENTS (closer to commitment / PCAP / capital-account ledger). Has a Bucket 3 dependency: if option (b), several Bucket-3 candidates (`peer_benchmarks`, `lp_capital_call_notices` cross-reference) shift to the new domain.

5. **`PORTMONIT-ESG-DIVERSITY-TRACKING` cross-cutting promotion.** Currently domain-prefixed (capability 504, single-domain). ESG (id 21) exists as a separate domain. Per the cross-cutting capability convention, if vendors market the same ESG-collection shape across PORT-MONIT + ESG + SFDR-reporting + REIT, promote to a domain-neutral `ESG-METRIC-COLLECTION`. Options: (a) keep domain-prefixed; (b) rename to `ESG-METRIC-COLLECTION` and add `capability_domains` row to ESG (21). Independent of other items.

6. **Compliance scope per regulation row (depends on B2-1 answer).** For each `regulations` row loaded, what applicability text? `mandatory` (no exception), `mandatory_for_us_advisors_above_150m_aum` (Form PF), `mandatory_for_eu_aifms` (SFDR + AIFMD), `industry_best_practice` (ILPA QRS), `mandatory_us_gaap_reporters` (ASC 820). Per Rule #15, the audit does not draft the applicability text; user supplies wording.

### Bucket 3 - Phase 0 pending (speculative)

| ID | Candidate | Proposed module | Vendor knowledge basis | Verification path |
| --- | --- | --- | --- | --- |
| B3-1 | `co_investment_positions` | PORT-MONIT-FUND-PERF (or FUND-ADMIN) | Allvue, eFront. Co-invest position tracking distinct from main fund position. | Phase 0: Allvue + eFront schema docs; alternative is FUND-ADMIN authorship. |
| B3-2 | `peer_benchmarks` / `portco_peer_groups` | PORT-MONIT-FUND-PERF | Vestberry, Standard Metrics, Chronograph emphasize vendor-provided benchmark cohorts (revenue bands, sector, stage). | Phase 0: confirm whether vendors bundle the benchmark dataset as a service or as a catalog data object. |
| B3-3 | `gp_attribution_analyses` | PORT-MONIT-FUND-PERF | eFront, Chronograph: attribution decomposition (market alpha vs. operational alpha vs. leverage). | Phase 0: vendor-specific feature; possibly tier-2 leaf. |
| B3-4 | `valuation_committee_meetings` | PORT-MONIT-VALUATIONS | Institutional PE platforms (eFront, Allvue): full meeting record vs. the per-quarter `valuation_committee_decisions` already in Bucket 1. | Phase 0: confirm shape (full meeting record vs. just the decision row). |
| B3-5 | `portco_management_metrics` | PORT-MONIT-PORTCO-DATA | Visible.vc, Standard Metrics partial: executive performance metrics tracked alongside financial KPIs (NPS, employee count, ESG scoring of mgmt practices). | Phase 0: separate from `portco_kpi_periods` if vendors model it as its own stream. |
| B3-6 | Cross-reference to `lp_capital_call_notices` (mastered in FUND-ADMIN-CAPITAL-CALLS) | PORT-MONIT-LP-REPORTING | Cobalt LP: LP-side composited report references the capital-call notice. | Phase 0: confirm whether this is a `consumer` DMDO row or a runtime cross-reference. |
| B3-7 | `currency_fx_rates` (likely shared master, candidate to live in a `MULTI-CURRENCY` master module or in FUND-ADMIN) | shared (out of PORT-MONIT) | All flagship vendors. PE global funds need multi-currency normalization. | Phase 0: catalog-wide master decision; affects FUND-ADMIN, INV-CRM, ESG, CAP-TABLE too. |

### Cross-bucket dependencies

- **Bucket 1 + Bucket 2 #1 dependency.** B1-M3 / B1-M4 / B1-M5 (the three compliance entities) are agent-fixable, BUT depend on the user's Bucket 2 #1 regulation-scoping choice. If user picks (a) all 5, all three B1-M load. If (b) US-only, only B1-M5 (Form PF) loads. If (d) defer EU, B1-M3 + B1-M4 do not load. The user must answer Bucket 2 #1 before B1-M3 / B1-M4 / B1-M5 are scheduled.
- **Bucket 2 #4 (LP-REPORTING modularization) cascades into Bucket 3 #6.** If the user splits LP-REPORTING into a separate LP-side domain, B3-6 (`lp_capital_call_notices` cross-reference) reshapes against that new domain rather than PORT-MONIT-LP-REPORTING.
- **Bucket 2 #3 (`funds` embedding) does not depend on or unblock anything else.** It is a standalone architectural call.
- **Bucket 3 #7 (`currency_fx_rates`) is catalog-wide.** Schedule a master-promotion conversation across all PE/VC + FX-touching domains rather than fixing inside PORT-MONIT alone.
- **B1-H1 (APQC tagging) is independent.** The 4 PCF proposals don't depend on any Bucket 2 or Bucket 3 outcome.

### Per-bucket prompts

**After Bucket 1 surface:** *"Fix these 19 items now? Reply 'all', 'just S1-S2-S3' (high-impact structural first), 'M1-M2 plus regulations' (entity gaps + compliance), 'H1 only' (APQC tagging in a focused load), or 'skip'. Items B1-M3 / B1-M4 / B1-M5 wait on Bucket 2 #1; flag if you want them auto-deferred."*

**After Bucket 2 surface:** *"Six judgment calls. Please answer each:* (1) *which regulations get loaded?* (2) *PATCH verbs on rels 885 + 886 or keep?* (3) *`funds` embedding shape stays / downgrades?* (4) *LP-REPORTING modularization keep / split / migrate?* (5) *promote ESG-DIVERSITY-TRACKING to a cross-cutting capability?* (6) *for the regulations you accept in (1), supply the applicability wording per Rule #15.* *I'll wait on per-item decisions before acting; no batch defaults."*

**After Bucket 3 surface:** *"Seven speculative candidates from market knowledge. Vet via formal Phase 0 vendor research (subagent reads Allvue / Chronograph / eFront / Vestberry / Standard Metrics public docs), or eyeball-mode (name which ring true)? If eyeball, are any worth promoting now?"*

### Report-only follow-ups (owed by other domains)

These items are NOT in PORT-MONIT's scope; they route to the named source domain's next audit.

- **FUND-ADMIN B8 owes** `data_object_relationships` row: `fund_distributions impacts fund_performance_periods` (data_object_id=368, related_data_object_id=768, owner_side=source). Mirror of inbound handoff 1042. Without this, the relationship graph in the architect view leaves the inbound edge un-rendered.
- **FUND-ADMIN B9 candidate (unverified):** the proposed `pcap_statement.locked` event from FUND-ADMIN-LP-COMMITMENTS into PORT-MONIT-LP-REPORTING on `lp_quarterly_reports` (Pairwise Section 3 finding). Surfaces when FUND-ADMIN is next validated.
- **FUND-ADMIN B9 candidate (unverified):** the proposed `fund_distribution.recorded` -> `fund_position_returns` routing variant of handoff 1042. Surfaces when FUND-ADMIN is next validated.
- **FUND-ADMIN H1 owes** an `agent_curated` proposal for handoff 1042 (inbound from its side). The same B1-H1 proposal can be authored from either side; documenting it here so FUND-ADMIN's H1 pass picks it up rather than re-discovering.
- **CAP-TABLE B8 owes** `data_object_relationships` row: `exit_scenarios concludes portfolio_companies` (data_object_id=777, related_data_object_id=763, owner_side=source). Mirror of inbound handoff 1045.
- **CAP-TABLE H1 owes** an `agent_curated` proposal for handoff 1045 from its side (PCF id 354 or 491).
- **INV-CRM H1 owes** an `agent_curated` proposal for handoff 1039 from its side (PCF id 491).
- **ESG (21) latency:** no `handoffs` or DMDO edges exist between PORT-MONIT and ESG, despite `portco_esg_records` (765) being semantically ESG-scoped. Not a defect on either side, but worth a note when ESG is next validated: should the cross-domain edge exist?

## 2026-05-31, Continuation: B1 technical fixes

Applied the strict technical subset of Bucket 1 via loader `.tmp_deploy/fix_port_monit_b1_technical_2026_05_31.ts`. All 19 B1 items reviewed; 3 applied, 16 deferred.

### Applied (3)

- **B1-S5 (B7 user-edges):** inserted 5 `data_object_relationships` rows per Rule #10. `data_object_id=748` (users) → master, `owner_side='target'`, `relationship_kind='reference'`, `relationship_type='one_to_many'`, mirroring the existing PORT-MONIT pattern on rels 885 + 886. New ids 1831–1835 covering `portco_kpi_periods` (submits), `portco_esg_records` (submits), `fund_position_returns` (computes), `fund_performance_periods` (owns), `lp_quarterly_reports` (authors). Verbs are short action prose consistent with the catalog's user-edge convention; user may PATCH if a different verb is preferred (treated as part of the open Bucket 2 #2 verb-correctness discussion).
- **B1-S10 (M5 lifecycle states):** PATCHed `domain_module_id=16` (PORT-MONIT-PORTCO-DATA) on states 476 (`active`), 477 (`exited`), 478 (`written_off`). Workflow-gate permission prefixing will now resolve to the canonical module.
- **B1-H1 (APQC PCF tagging):** inserted 3 of 4 audit-proposed `handoff_processes` rows. New ids 633 (handoff 1043 → process 1390), 634 (handoff 1042 → process 1401), 635 (handoff 1045 → process 354). Handoff 1039 was **NOT** loaded: it already carries `handoff_processes` row 572 with `process_id=409` (a PCF different from the audit's proposed 491). Whether to replace 409 with 491, keep 409, or add 491 as a second tag is a judgment call; surfacing for user decision rather than silently double-tagging.

### Deferred (16) and why

- **B1-S1 (A4 catalog_tagline / catalog_description):** Rule #20 prose — author-then-confirm with the user.
- **B1-S2 (F2/F3/F4/F5 system skills + tools):** new entities; skill/tool authoring is judgment-heavy (which tools, how many, naming, `operation_kind`).
- **B1-S3 (E1–E6 roles):** new entities; role bundling spans modules and needs user input on scope.
- **B1-S4 (regulations) and B1-M3/M4/M5 (compliance entities):** audit itself gates these on Bucket 2 #1 (regulation-scoping choice).
- **B1-S6 (B11 aliases):** audit lists option-bundles (`portco_metrics, kpi_packets`, etc.) rather than exact pre-specified tuples; rule against bulk alias inserts without exact tuples.
- **B1-S7 (B12 lifecycle states):** state-machine authoring requires per-master judgment on state names and which states get `requires_permission=true`.
- **B1-S8 (B9 trigger_events):** new entity rows; depends on S7's state names.
- **B1-S9 (B9b intra-domain handoffs):** new entity rows; depends on S8.
- **B1-M1, B1-M2, B1-M6, B1-M7, B1-M8 (5 universal-vendor entities):** new data_objects + DMDOs.

### Open follow-ups for user

1. Handoff 1039 PCF tag (409 vs 491 vs both) — see B1-H1 above.
2. Verb correctness on rels 1831–1835 (and existing 885 + 886, already in Bucket 2 #2).
3. All other Bucket 1 items above marked Deferred remain queued for the user-judgment pass.

No JWT errors during the run. UI: https://tests.semantius.app/domain_map/data_object_relationships and https://tests.semantius.app/domain_map/handoff_processes for spot-check.

