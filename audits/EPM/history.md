# EPM audit history

## 2026-05-30 (Validate b1, full 4-pass)

### Summary

- **Current footprint:** **0 modules** (M1 hard fail, the dominant audit blocker), 6 capabilities (BUDGET-PLAN, FORECAST, DRIVER-MODEL, SCENARIO-MODEL, MGMT-REPORT, WORKFORCE-PLAN-EPM), 14 solutions linked (11 primary + 3 secondary), 5 masters (`financial_plans`, `financial_budgets`, `financial_forecasts`, `financial_scenarios`, `variance_analyses`) + 2 contributors (`org_units`, `cost_centers`) + 1 consumer (`journal_entries`), 8 trigger_events on the 5 masters (4 with empty `event_category`), 8 outbound + 19 inbound cross-domain handoffs (27 total), 0 lifecycle states, 0 aliases, 4 intra-domain `data_object_relationships` rows (3 inbound, 1 outbound, none between EPM masters), 1 legacy `domain_id`-scoped system skill `epm-system` with 9 `skill_tools` rows (no module anchor), 1 role (`FPA-WORKFORCE-PARTNER`) grounded entirely on SWP modules (no EPM modules to attach to).
- **Flagship-vendor basis** (Bucket 3 below): Workday Adaptive Planning, Anaplan, Oracle EPM Cloud, OneStream, SAP Analytics Cloud Planning, Pigment, Vena, Planful, Board, Prophix. Pure-play FP&A specialists, the leader quadrant per the live `solution_domains` rows.
- **Bucket 1 (in-scope, agent fixable):** 11 structural items + 1 APQC TAGGING line (22 individual tags proposed below) = **12 items**.
- **Bucket 2 (surface-for-user, judgment):** **4 items**.
- **Bucket 3 (Phase 0 pending, speculative, full market surface gated on Bucket 1 modularization):** **3 items**.
- **Candidates queued (`audits/_missing-domains.md`):** 6 (`CCM`, `TRM`, `TAX-PROVISION`, `FIN-CONSOL` re-surfaced from the prior 2026-05-30 EPM pass; `PCM` and `DISCLOSURE-MGMT` new this pass).

**Pass 3 neighbor discovery** (auto-derived from `handoffs` + cross-domain DMDO and cross-domain `data_object_relationships`, ranked by edge weight):

| Neighbor | Out | In | DMDO touching EPM | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| ERP-FIN | 2 (561, 563) | 6 (124, 133, 532, 534, 535, 540) | EPM consumes `journal_entries`; EPM contributes to `cost_centers` | 0 | 8 | Pairwise (full) |
| SWP | 2 (27, 10) | 2 (458, 16) | SWP contributor on `financial_plans` (optional) | 1 (`workforce_cost_projections feeds financial_plans`) | 6 | Pairwise (full) |
| SPM | 1 (562) | 4 (245, 246, 792, 795) | SPM consumer on `financial_scenarios` | 0 | 5 | Pairwise (full) |
| AUDIT | 2 (199, 564) | 1 (256) | AUDIT consumer on `financial_forecasts` | 2 (`audit_findings reviews financial_forecasts`, `audit_findings reviews variance_analyses`, `audit_recommendations feeds financial_scenarios`) | 5 | Pairwise (full) |
| SEM | 0 | 2 (1207, 1208) | 0 | 0 | 2 | Lightweight |
| HCM | 1 (601) | 0 | EPM contributor on `org_units` (HCM-mastered) | 0 | 2 | Lightweight |
| ESG | 0 | 0 | ESG consumer on `financial_plans` (required) | 0 | 1 | Lightweight |
| COMP-MGMT | 0 | 0 | COMP-PLANNING module consumer on `financial_plans` (optional) | 0 | 1 | Lightweight |
| PA | 0 | 1 (1104) | 0 | 0 | 1 | Lightweight |
| SPEND-MGMT | 0 | 1 (172) | 0 | 0 | 1 | Lightweight |
| VSDP | 0 | 1 (777) | 0 | 0 | 1 | Lightweight |
| PSA | 0 | 1 (1021) | 0 | 0 | 1 | Lightweight |
| APM | 0 | 1 (1197) | 0 | 0 | 1 | Lightweight |

The dominant cross-cutting finding is that **EPM owns zero deployable modules**, so every cross-domain handoff (outbound and inbound) is also a B10b failure on EPM's side (`source_domain_module_id` or `target_domain_module_id` NULL on EPM). The pairwise pass cannot draft module-to-module wiring until M1 is cured; it is collapsed below into a "post-modularization wiring sketch" rather than per-neighbor full diffs.

Structural pass bands: **M1 hard-fail** (zero modules, single most important finding), **M2/M4/M6 cascading fail** (6 capabilities with zero realizing modules), **B12 hard-fail** (zero lifecycle states on any of the 5 masters), **B11 hard-fail** (zero aliases on any master), **B7 hard-fail** (zero `users` edges on EPM masters; expected approver, plan_owner, scenario_modeler, forecast_owner, fp_analyst, controller edges), **B6 hard-fail** (zero intra-domain `data_object_relationships` between the 5 EPM masters; `financial_plans` ought to compose `financial_budgets`, `financial_forecasts`, and `financial_scenarios`, and `variance_analyses` ought to compare actuals against `financial_budgets` / `financial_forecasts`), **B9 partial-fail** (4 of 8 trigger_events have empty `event_category` per Rule #13), **F1 hard-fail** (legacy domain-level system skill `epm-system` with `domain_module_id=null`), **F2/F3/F5 vacuous-fail** (no modules so no per-module skills), **B10b hard-fail** (8 outbound handoffs all carry NULL `source_domain_module_id`), **H1 hard-fail** (only 7 of 27 cross-domain handoffs tagged, all 7 `discovery_substring`, zero `agent_curated`).

Bands passing: **A1** (7 domain-metadata fields populated; note: `business_logic` and one `domain_data_objects.notes` row carry em-dashes per the project no-em-dash rule, surfaced as B1-S11), **A2** (6 capabilities, above floor), **A3** (14 solutions, ≥1 primary), **B1** (5 masters loaded), **B2** (all masters have singular/plural labels), **B3** (all 5 master names are prefixed `financial_*` / `variance_*`, no canonical-bare-word claim required), **B5** (no `embedded_master` rows in EPM, vacuously passes), **C1** (FP&A function 43 owns), **C2** vacuous, **E2/E3/E4/E5/E6** vacuously pass since E1 has nothing to attach to (one role exists but lives on SWP modules, not EPM).

Domain Semantius score (strict, from legacy `epm-system` skill): **8 / 9 = 88.9%** platform-tier; 1 `external` (the `generate_text` compute tool, expected). Operational score also 88.9%. The score is informational only; F1 says retire the legacy skill once module-level skills exist, so the headline number is provisional pending M1.

### Bucket 1 (in-scope confirmed gaps)

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 (hard fail, dominant blocker)** | **Zero `domain_modules` rows for EPM (`domain_id=66`).** No `domain_modules.domain_id=66` rows; no `domain_module_host_domains.domain_id=66` rows. Rule #14 requires every `domains` row to have ≥1 `module_kind='full'` module; EPM has zero. This blocks F2, M4, M6, E1, B9b, B10b on EPM's side, and B12's permission-materialization (workflow gates need a realizing module for the permission prefix). The shape of the split is itself a Bucket-3 question (single EPM-PLATFORM vs. EPM-BUDGET-PLAN + EPM-FORECAST + EPM-VARIANCE + EPM-SCENARIO-MODEL + EPM-WORKFORCE-PLAN, etc.); the gate is "draft and load any coherent module set" first. Recommended minimum (matches Rule #14 M2 floor for 6-capability domains): three modules, `EPM-PLAN-BUDGET` (masters `financial_plans` + `financial_budgets`, realizes BUDGET-PLAN + DRIVER-MODEL + WORKFORCE-PLAN-EPM), `EPM-FORECAST-SCENARIO` (masters `financial_forecasts` + `financial_scenarios`, realizes FORECAST + SCENARIO-MODEL), `EPM-VARIANCE-REPORT` (masters `variance_analyses`, realizes MGMT-REPORT). | Author the 3-module shape, load via a focused loader, then load `domain_module_capabilities` + `domain_module_data_objects` and migrate the existing `domain_data_objects` rows to the matching `domain_module_data_objects` rows. Pre-flight every payload per Rules #14 and #17. |
| B1-S2 | **M2/M4/M6 cascading** | 6 capabilities currently have zero realizing modules (M4 / M6 cannot be evaluated until M1 is fixed); EPM is above the 3-capability floor so Rule #14 mandates ≥2 modules (M2). Resolution rides on B1-S1. | Solved by B1-S1; record cap → module mapping at load time. |
| B1-S3 | **B12 (hard fail)** | **Zero rows in `data_object_lifecycle_states` for any of the 5 EPM masters.** Each master has a real workflow: `financial_plans` (draft → in_review → approved → published → locked → archived); `financial_budgets` (draft → submitted → approved → locked → variance_tracked → closed); `financial_forecasts` (draft → refreshed → published → superseded); `financial_scenarios` (draft → modeled → reviewed → selected → archived); `variance_analyses` (draft → analyzed → reviewed → escalated_for_material_variance → closed). Each state with `requires_permission=true` becomes a `<module>:<verb>_<entity>` permission once a realizing module exists (Rule #14 permission materialization). No config-shape exemption applies; none of these masters are author-once. | Draft the 5 state machines, attach `domain_module_id` to gates per the realizing module decided in B1-S1, load via a focused lifecycle loader. |
| B1-S4 | **B11 (hard fail)** | **Zero `data_object_aliases` rows for any of the 5 EPM masters.** Vendor terminology diverges: `financial_plans` is `Plan` / `Strategic Plan` in Anaplan, `Form` in Oracle EPM, `Pages` in Pigment; `financial_budgets` is `Budget` everywhere but `Annual Operating Plan (AOP)` in many enterprises; `financial_forecasts` is `Reforecast` / `Rolling Forecast` / `LE` (Latest Estimate); `financial_scenarios` is `What-If` / `Driver Scenario` / `Sensitivity` in different platforms; `variance_analyses` is `Variance` / `Plan-vs-Actuals` / `Flux Analysis` (the close-management term). | Draft alias rows (alias_name + alias_type), load via the cluster-drafts loader. |
| B1-S5 | **B7 (hard fail)** | **Zero `data_object_relationships` edges between any of the 5 EPM masters and `users` (id 748)**, despite real user-typed actors on every master: `financial_plans` (plan_owner, approver, controller), `financial_budgets` (budget_owner, submitter, approver), `financial_forecasts` (forecast_owner, fp_analyst), `financial_scenarios` (scenario_modeler, reviewer), `variance_analyses` (analyst, reviewer, accountable_manager). Rule #10 makes built-in edges first-class; the architect cannot render the actor view without them. | Author 5–10 user edges per master (verb-shape: `owns_plan`, `approves_budget`, `models_scenario`, etc.); load via the cluster-drafts loader. |
| B1-S6 | **B6 (hard fail)** | **Zero intra-domain `data_object_relationships` rows between the 5 EPM masters.** Expected edges per the descriptions in `data_objects.description`: `financial_plans` composes `financial_budgets` (one_to_many, owner_side=parent), `financial_plans` composes `financial_forecasts` (one_to_many), `financial_plans` composes `financial_scenarios` (one_to_many), `variance_analyses` compares `financial_budgets` (many_to_one), `variance_analyses` compares `financial_forecasts` (many_to_one). Without these edges the architect renderer shows 5 disconnected masters; the deployer cannot infer composition; the fact-sheet emitter renders a placeholder where the intra-domain DAG should be. | Draft 5 intra-domain edges (verb, inverse_verb, relationship_kind, relationship_type, is_required, owner_side), load via cluster-drafts. |
| B1-S7 | **B9 partial fail (event_category enum)** | 4 of 8 trigger_events on EPM masters have **empty `event_category`** (Rule #13 enum vocabulary: `lifecycle` / `state_change` / `threshold` / `signal`): id 583 `financial_plan.published`, id 584 `financial_plan.approved`, id 585 `financial_scenario.modeled`, id 586 `variance_analysis.completed`. | PATCH: 583, 584, 586 → `state_change`; 585 → `state_change` (a scenario modeling completion is a published state transition the consumers react to). |
| B1-S8 | **F1 (hard fail)** | Legacy domain-scoped system skill `epm-system` (id 4) with `skill_type='system'` and `domain_module_id=null`. F1 requires this row to be retired once module-anchored system skills exist; B1-S1 (M1 fix) creates those module-anchored skills, at which point this legacy row must DELETE. Today it is the only system skill EPM has, so the row also satisfies a transitional ghost-pass of F2 (one system skill exists, even if at the wrong scope). | At the same load that authors the per-module system skills (one per `EPM-PLAN-BUDGET`, `EPM-FORECAST-SCENARIO`, `EPM-VARIANCE-REPORT`), DELETE skill id 4 and its 9 `skill_tools` rows; redistribute the tools to the per-module skills per Phase S. |
| B1-S9 | **B10b (hard fail, EPM-owned side only)** | All 8 outbound handoffs from EPM (199, 27, 10, 561, 562, 563, 564, 601) carry **NULL `source_domain_module_id`**. Per B10b, this is EPM's side to fix once modules exist. Source-module per the proposed shape (resolving by which EPM module masters the trigger_event's data_object): handoff 199, 27 (event `financial_forecast.refreshed` on data_object_id=39 `financial_forecasts`) → EPM-FORECAST-SCENARIO; handoff 10 (event `financial_budget.cycle_started` on 38 `financial_budgets`) → EPM-PLAN-BUDGET; handoffs 561, 601 (event `financial_plan.approved` on 37 `financial_plans`) → EPM-PLAN-BUDGET; handoff 562 (event `financial_scenario.modeled` on 40 `financial_scenarios`) → EPM-FORECAST-SCENARIO; handoffs 563, 564 (event `variance_analysis.material_variance` on 41 `variance_analyses`) → EPM-VARIANCE-REPORT. | Backfill `source_domain_module_id` on all 8 outbound handoffs once B1-S1's modules are loaded; the target-side `target_domain_module_id` is each target domain's own B10b problem and is surfaced in "Report-only follow-ups" below. |
| B1-S10 | **B9b (vacuous fail, structurally important)** | EPM has 0 modules so no cross-module intra-domain handoffs can exist. Once B1-S1's three modules ship, the following intra-domain handoffs become required (per the cross-module data_object_relationships drafted in B1-S6): EPM-PLAN-BUDGET → EPM-FORECAST-SCENARIO on `financial_plan.published` (Forecast module picks up new plan baselines); EPM-PLAN-BUDGET → EPM-VARIANCE-REPORT on `financial_budget.approved` (Variance module starts tracking actuals against the approved budget); EPM-FORECAST-SCENARIO → EPM-VARIANCE-REPORT on `financial_forecast.refreshed` (Variance module rebases comparison points). All `integration_pattern='lifecycle_progression'`, `friction_level='low'`. | Load 3 intra-domain handoff rows alongside B1-S9's source-module backfill. |
| B1-S11 | **STRUCTURAL (project hygiene, Rule #15 / em-dash)** | Two pre-existing em-dashes (U+2014) in EPM catalog content violate the project's no-em-dash rule (CLAUDE.md). (1) `domains.business_logic` for EPM (id 66) contains the substring `eliminations) <U+2014> the calc kernel is the product`. (2) `domain_data_objects.notes` for the EPM contributor row on `cost_centers` (data_object_id=196) contains the substring `alignment slice <U+2014> how cost_centers map to planning hierarchies`. The second row is also a Rule #15 violation (`notes` populated without user approval) and should be reverted to empty string regardless of the em-dash. | (1) PATCH `domains` id=66, replace ` <U+2014> ` with `; ` or `, `. (2) PATCH `domain_data_objects` row (domain_id=66, data_object_id=196), set `notes=''` per Rule #15 (no replacement wording, the structured `role`/`necessity` columns already carry the load-bearing facts). |

#### APQC TAGGING (Rule H1: zero `agent_curated`, only 7 weak `discovery_substring` rows out of 27 cross-domain handoffs)

EPM has **27 cross-domain handoffs** (8 outbound + 19 inbound). **Only 7 carry `handoff_processes` rows; all 7 are `proposal_source='discovery_substring'`, zero `agent_curated`.** Volume target per the H-band: 0.5N to 0.8N agent_curated tags for N=27, i.e. 14–22. I propose **22 high-confidence agent_curated tags below**, of which 7 overlap with existing `discovery_substring` rows (those existing rows should be re-classified as `agent_curated` overrides per Discover Pass 1.5; the substring rows are kept-or-replaced per the loader rule).

| B1 ID | handoff_id | source → target | trigger_event | payload | Proposed PCF (`process_name` / `external_id` / L) | Confidence |
|---|---|---|---|---|---|---|
| B1-H1-01 | 199 | EPM → AUDIT | `financial_forecast.refreshed` | `financial_forecasts` | Prepare periodic financial forecasts / `10773` / L4 (id 1324) | confident L4 (existing substring row; keep PCF, flip source to agent_curated) |
| B1-H1-02 | 27 | EPM → SWP | `financial_forecast.refreshed` | `workforce_plans` | Prepare periodic financial forecasts / `10773` / L4 (id 1324) | confident L4 (existing substring row; keep) |
| B1-H1-03 | 10 | EPM → SWP | `financial_budget.cycle_started` | `workforce_plans` | Prepare periodic budgets and plans / `10772` / L4 (id 1322) | confident L4 |
| B1-H1-04 | 561 | EPM → ERP-FIN | `financial_plan.approved` | `financial_plans` | Operationalize and implement plans to achieve budget / `20135` / L4 (id 1323) | confident L4 |
| B1-H1-05 | 562 | EPM → SPM | `financial_scenario.modeled` | `financial_scenarios` | Perform planning/budgeting/forecasting / `10738` / L3 (id 297) | confident L3 (modeling spans budget/forecast/plan; L3 parent preferred over a too-specific L4) |
| B1-H1-06 | 563 | EPM → ERP-FIN | `variance_analysis.material_variance` | `variance_analyses` | Perform variance analysis against forecasts and budgets / `20136` / L4 (id 1325) | confident L4 (existing substring; keep) |
| B1-H1-07 | 564 | EPM → AUDIT | `variance_analysis.material_variance` | `variance_analyses` | Perform variance analysis against forecasts and budgets / `20136` / L4 (id 1325) | confident L4 (existing substring; keep) |
| B1-H1-08 | 601 | EPM → HCM | `financial_plan.approved` | `financial_plans` | Prepare periodic budgets and plans / `10772` / L4 (id 1322) | confident L4 (HCM consumes the approved plan for headcount lock) |
| B1-H1-09 | 1104 | PA → EPM | `people_kpi.snapshot_published` | `people_kpis` | Develop workforce analytics / `21441` / L3 (id 247) | confident L3 |
| B1-H1-10 | 124 | ERP-FIN → EPM | `payroll_period.closed` | `payroll_journal_entries` | Process journal entries / `10820` / L4 (id 1379) | confident L4 |
| B1-H1-11 | 133 | ERP-FIN → EPM | `accounting_period.closed` | `journal_entries` | Process period end adjustments / `10822` / L4 (id 1381) | confident L4 |
| B1-H1-12 | 172 | SPEND-MGMT → EPM | `spend_commitment.created` | `spend_requests` | Operationalize and implement plans to achieve budget / `20135` / L4 (id 1323) | confident L4 (commitments draw down on the approved budget envelope) |
| B1-H1-13 | 256 | AUDIT → EPM | `recommendation.accepted` | `audit_recommendations` | Perform variance analysis against forecasts and budgets / `20136` / L4 (id 1325) | medium L4 (existing substring row points at warranty-recommendations 16817 which is the wrong fit; replace with 20136 if the recommendation is variance-driven, otherwise defer) |
| B1-H1-14 | 245 | SPM → EPM | `initiative.completed` | `strategic_initiatives` | Develop and measure strategic initiatives / `10016` / L2 (id 16) | confident L2 (existing substring; keep) |
| B1-H1-15 | 246 | SPM → EPM | `scenario_plan.evaluated` | `scenario_plans` | Perform planning/budgeting/forecasting / `10738` / L3 (id 297) | confident L3 |
| B1-H1-16 | 458 | SWP → EPM | `workforce_scenario.approved` | `workforce_scenarios` | Perform strategic workforce planning / `21693` / L4 (id 980) | confident L4 |
| B1-H1-17 | 532 | ERP-FIN → EPM | `accounting_period.closed` | `accounting_periods` | Process period end adjustments / `10822` / L4 (id 1381) | confident L4 |
| B1-H1-18 | 534 | ERP-FIN → EPM | `gl_account.mapping_changed` | `general_ledger_accounts` | Process journal entries / `10820` / L4 (id 1379) | medium L4 (the mapping change ripples into journal classifications; alternative L3 candidate is 10728 "Perform planning and management accounting", flag for user) |
| B1-H1-19 | 535 | ERP-FIN → EPM | `cost_center.created` | `cost_centers` | Perform planning and management accounting / `10728` / L2 (id 54) | confident L2 (cost-center seeding into planning dimensions) |
| B1-H1-20 | 540 | ERP-FIN → EPM | `depreciation.posted` | `asset_depreciation_schedules` | Calculate and record depreciation expense / `10833` / L4 (id 1392) | confident L4 (existing substring; keep) |
| B1-H1-21 | 777 | VSDP → EPM | `value_stream_metric.threshold_breached` | `value_stream_metrics` | Perform variance analysis against forecasts and budgets / `20136` / L4 (id 1325) | medium L4 (value-stream metric breach feeds variance commentary; defer if VSDP develops its own custom-process row) |
| B1-H1-22 | 792 + 795 | SPM → EPM | `benefits_tracking_record.realized` / `.at_risk` | `benefits_tracking_records` | Perform planning and management accounting / `10728` / L2 (id 54) | medium L2 (benefits realization rolls up to actuals review; flag for user, possible defer-to-Discover if SPM owns a more specific process) |

Deferred to Discover Pass 3 (no clean cross-industry PCF match in this audit):

- handoff 16 `cost_projection.approved` (SWP → EPM): workforce cost projection inflow; could map to 10728 ("Perform planning and management accounting") at L2 but the cost-projection lifecycle is itself a Discover candidate (the strategic workforce planning slice).
- handoff 1021 `project_billing_milestone.slipped` (PSA → EPM): services-project revenue slip impacting forecast; PSA-specific revenue-recognition process is not in the cross-industry framework. Defer for PSA's audit / Discover.
- handoff 1197 `application_cost.updated` (APM → EPM): application TCO recalc feeding the IT cost line. The relevant PCF (`20893` "Plan and budget IT license usage volumes" L4, or 20660 "Manage IT portfolio strategy" L3) is borderline; defer to APM-side (APM owns its own H1 audit pending APM-TECH-RISK modularization).
- handoffs 1207, 1208 (SEM → EPM): strategic initiative / objective cascades; SEM-side discovery owns the classification since the events fire on SEM-mastered records and the EPM impact is downstream.

**H-band measure summary:**

| Measure | Column | Current | Audit-proposed delta |
|---|---|---|---|
| **Catalog quality (headline)** | `handoff_processes.record_status='approved'` count | **0 of 27 = 0%** | unchanged (approval is human-only per Rule #1) |
| **Process health (side-bar)** | `handoff_processes.proposal_source='agent_curated'` count | **0 of 27 = 0%** | **+22 agent_curated** if user approves the table above |

#### Bucket 1 finding-type rollup

| Finding type | Count |
|---|---|
| STRUCTURAL (M1, M2/M4/M6 cascade, B12, B11, B7, B6, B9 event_category, F1, B10b, B9b, em-dash hygiene) | 11 |
| APQC TAGGING (per H1 rule, one Bucket 1 item with 22 sub-tags) | 1 |
| MISSING | 0 (deferred to Bucket 3, gated on Bucket 1 modularization) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| BOUNDARY | (rolled into B1-S9 / B1-S10) |
| MODULARIZATION ISSUES | 0 in Bucket 1 (the module set itself is the Bucket 3 conversation) |
| **Bucket 1 total** | **12** |

### Bucket 2 (surface-for-user, judgment calls)

| ID | Question | Why agent cannot answer alone | Options |
|---|---|---|---|
| B2-S1 | **Module-split shape (drives B1-S1).** The recommended 3-module split (`EPM-PLAN-BUDGET` + `EPM-FORECAST-SCENARIO` + `EPM-VARIANCE-REPORT`) follows the natural lifecycle clusters of the 5 masters and the Rule #14 ≥2-module floor (EPM has 6 capabilities, well above floor). Alternatives: (a) finer split per capability, 5 modules `EPM-BUDGET`, `EPM-FORECAST`, `EPM-SCENARIO`, `EPM-WORKFORCE-PLAN`, `EPM-VARIANCE` (more granular, more deploy-time choice, more permission surface); (b) a single `EPM-PLATFORM` module hosting all 5 masters (matches the Workday Adaptive / Anaplan "one-cube" mental model but violates the ≥2-module floor); (c) 2-module split `EPM-PLAN` (plans + budgets + forecasts + scenarios) + `EPM-REPORT` (variances only); (d) the recommended 3-module split. | The split affects every downstream load and the role / skill / permission shape. The user picks the deployability story. | Pick (a) / (b) / (c) / (d) / a custom alternative. |
| B2-S2 | **Workforce-planning capability scope (WORKFORCE-PLAN-EPM).** EPM's WORKFORCE-PLAN-EPM capability overlaps SWP's domain. The capability_code is domain-prefixed already, signalling the intent that EPM owns the financial-headcount slice while SWP owns the strategic-workforce slice. But the existing role `FPA-WORKFORCE-PARTNER` (id 10042) is grounded entirely on SWP modules (`SWP-COST-PROJECTIONS` primary, `SWP-DEMAND-FORECAST` + `SWP-SCENARIO-MODELING` secondary), with zero EPM modules to attach to. Once EPM modules exist, should this role gain primary on EPM-PLAN-BUDGET (the headcount-spend slice of the budget) and demote to secondary on the SWP side? Or stay as an SWP-side persona that consumes EPM publications via `data_object_relationships`? | Editorial decision about which module owns the persona's primary workflow. | (a) FPA-WORKFORCE-PARTNER becomes primary on EPM-PLAN-BUDGET + secondary on SWP-COST-PROJECTIONS. (b) Keep entirely on SWP, surface the EPM consumption via permission grants only. (c) Split into two roles, one EPM-scoped and one SWP-scoped. |
| B2-S3 | **B4 pattern-flag positive re-evaluation per Rule #12.** All 5 EPM masters have `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false` (default). Audit requires positive confirmation that false-by-default is correct. Specifically: should `financial_plans.has_submit_lock=true` (approved plans should freeze)? `financial_budgets.has_submit_lock=true` (locked budgets shouldn't be edited post-approval)? `financial_forecasts.has_submit_lock=false` (rolling forecasts are explicitly editable cycle-to-cycle, this answer is "no" by design)? `financial_plans.has_single_approver=true` (typically the CFO or controller, single-approver workflow)? `variance_analyses.has_single_approver=false` (variance commentary is shared across cost-center owners, multi-approver by design)? | Pattern-flag judgments are workflow-shape decisions the user owns. Rule #12 mandates positive consideration; defaults are not the same as "considered". | Per-flag yes/no from user; decisions get captured here (not in `data_objects.notes` per Rule #15). |
| B2-S4 | **Rule #15 notes pollution on EPM's `domain_data_objects.notes`.** Three EPM-owned `domain_data_objects` rows carry populated `notes` text: row (domain_id=66, data_object_id=34, role=contributor, on `org_units`) ("Cost-center alignment slice. EPM contributes the financial mapping that org_units need..."); row (domain_id=66, data_object_id=196, role=contributor, on `cost_centers`) ("EPM contributes the planning-dimension alignment slice, how cost_centers map to planning hierarchies..."); row (domain_id=66, data_object_id=194, role=consumer, on `journal_entries`) ("EPM consumes period-actuals from ERP-FIN for variance reporting against budgets / forecasts."). Rule #15 mandates `notes` is empty by default and only ever populated with explicit per-row user-approved wording. The cost_centers note ALSO contains an em-dash (CLAUDE.md violation, already surfaced as B1-S11 (2)). Were these notes user-approved at load time, or were they auto-populated by the loader? | Cannot tell from audit alone whether the notes were explicitly approved at load time. The audit obligation under Rule #15, when in doubt and the wording restates structured columns, is to revert. | (a) Confirm these were explicitly user-approved at load time; leave the 2 non-em-dash rows in place, fix the em-dash on cost_centers (B1-S11 already proposes PATCH to empty). (b) Confirm auto-population; PATCH all 3 notes to empty string and append a Rule #15 incident entry to `references/skill-changelog.md`. |

### Bucket 3 (Phase 0 pending, speculative)

Bucket 3 is intentionally light for EPM because the meaningful market-surface conversation is gated on B1-S1 (the module shape). Once modules exist, a focused Phase 0 vendor research pass against Workday Adaptive, Anaplan, OneStream, Oracle EPM, SAP Analytics Cloud Planning will surface the MISSING / WRONG-OWNERSHIP / SCOPE-CREEP triple. Pre-modularization, only these three high-confidence items are visible:

| ID | Candidate | Vendor knowledge basis | Recommended verification path |
|---|---|---|---|
| B3-S1 | **Allocations entity (`cost_allocations` or `allocation_rules`).** Every flagship EPM platform (Oracle EPM, Anaplan, OneStream, SAP SAC, Workday Adaptive, Pigment) ships an allocation engine. The records (the allocation rule definitions and their per-period executions) are first-class in the platform but absent from EPM's current footprint. This is the `crud_percentage=50` slice EPM's domain row signals (the calc kernel beyond simple JsonLogic). Without `cost_allocations` modelled, the catalog cannot distinguish EPM-as-planning-platform from "any forms-and-workflow tool". | Phase 0 against Oracle EPM Allocations, Anaplan Allocation, OneStream Allocations after B1-S1 lands. |
| B3-S2 | **Headcount-plan entity, separate from `financial_plans`.** Vendor evidence: every flagship has a headcount/position-level plan distinct from the dollar plan (Workday Adaptive Workforce, Anaplan Connected Workforce, Pigment People). Today the EPM footprint conflates this into `financial_plans` via the WORKFORCE-PLAN-EPM capability, and the line-item flow comes from SWP (`workforce_cost_projections feeds financial_plans`). The Bucket 2 question B2-S2 partly arbitrates this; the market surface adds a likely missing `headcount_plans` master (or moves the responsibility wholly to SWP). | Phase 0 verification + the B2-S2 decision. |
| B3-S3 | **MODULARIZATION refactor candidate, a fourth `EPM-CONSOL` or `EPM-DISCLOSURE` module.** OneStream and Oracle EPM both bundle close / consolidation / disclosure narrative onto the same platform. EPM in our catalog currently has zero close / consolidation / disclosure surface, and the missing-domains queue carries `CCM` and `FIN-CONSOL` and `DISCLOSURE-MGMT` as candidates. The market-audit recommendation is: keep CCM / FIN-CONSOL / DISCLOSURE-MGMT as candidate domains for now (do not absorb into EPM); revisit after they receive triage in `audits/_missing-domains.md`. | Triage `CCM`, `FIN-CONSOL`, `DISCLOSURE-MGMT` in `_missing-domains.md` first. If promoted, EPM stays scoped to plan + budget + forecast + scenario + variance + headcount-plan. If folded into EPM, then EPM gets a 4th module `EPM-CONSOL`. |

**Bucket 3 prompt:** vet via formal Phase 0 vendor research (a follow-up subagent producing `c:/tmp/EPM-phase0-<date>.md` with vendor entity surfaces per row, gated on B1-S1 landing so the proposed_module column has real targets), or eyeball-mode (you name which of the 3 to treat as confirmed and we add them via Phase B once modules exist)?

The strongest signal in the diff is **B3-S1 (Allocations)**: every flagship vendor masters allocation rules and their per-period runs, and the absence is what makes the catalog read EPM as "another forms tool" rather than "a calc-kernel platform". If you only commit to one Bucket 3 item, that is the highest leverage.

### Cross-bucket dependencies

- **B1-S1 (M1, the module split) is the catalog gate**: B1-S2 (M2/M4/M6 cascade), B1-S3 lifecycle-state realizers, B1-S8 (F1 retire + per-module skills), B1-S9 (B10b source_domain_module_id backfill), B1-S10 (B9b intra-domain handoffs) all depend on it. B2-S1 (the split shape) IS the question that resolves B1-S1.
- **B2-S2 (WORKFORCE-PLAN-EPM role scoping) depends on B1-S1 + Bucket 3 B3-S2 (headcount-plan entity).** Hold this Bucket 2 item until the module split lands and the headcount-plan candidate is vetted.
- **B2-S3 (pattern flags) is independent** of all other items.
- **B2-S4 (Rule #15 notes pollution on EPM-owned DDO rows) is independent**; resolve immediately on user response.
- **B3-S3 (4th module decision) depends on the `_missing-domains.md` triage of `CCM` / `FIN-CONSOL` / `DISCLOSURE-MGMT`.**
- **B1-H1 (APQC tagging)** is independent of every other item; the proposals are confident and can be loaded as `agent_curated` without waiting for the module split.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or a list (e.g. `S1, S3, H1-all, H1-01..H1-22`), or `skip`. Note the cascade: doing S1 first unblocks S2 / S3 / S8 / S9 / S10. APQC tags (H1-01..H1-22) can ship in parallel.

- **B1-S1 (M1 module split, the dominant fix):** depends on B2-S1 first. Pick the split shape, then I author the loader.
- **B1-S2 / S3 / S8 / S9 / S10 (cascading on S1):** load in the same loader once the split is picked.
- **B1-S4 (B11 aliases):** structural; load independently anytime after B1-S1 (aliases attach to data_objects, not modules).
- **B1-S5 / S6 (B7 + B6 relationship edges):** structural; load independently anytime.
- **B1-S7 (event_category PATCH on 4 events):** trivial; one PATCH each.
- **B1-S11 (em-dash hygiene):** two trivial PATCHes; the second also folds into B2-S4's Rule #15 decision (revert to empty either way).
- **B1-H1 (APQC tagging, 22 tags):** load now or in a follow-up batch?

**Bucket 2, what is your call on each?** I will wait for per-item decisions before acting.

- **B2-S1 (module split shape):** pick a/b/c/d/custom.
- **B2-S2 (WORKFORCE-PLAN-EPM role scoping):** hold until B1-S1 + B3-S2 land, or answer now provisionally?
- **B2-S3 (pattern flags):** per-flag yes/no on the 5 candidates (financial_plans submit_lock, financial_plans single_approver, financial_budgets submit_lock, financial_forecasts submit_lock explicitly "no", variance_analyses single_approver explicitly "no").
- **B2-S4 (Rule #15 notes on 3 EPM-owned DDO rows):** (a) approved at load time, leave non-em-dash rows; (b) auto-populated, revert all 3 to empty + log incident.

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball, name which of the 3 candidates (`cost_allocations`, `headcount_plans`, `EPM-CONSOL` 4th module) to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items the audit identified, but the fix lives on another domain's side. They are NOT in EPM's Bucket 1 and do not block EPM's audit going green.

| Owner domain | Owed work | Evidence |
|---|---|---|
| AUDIT | B10b: `target_domain_module_id` NULL on handoff 199 (EPM `financial_forecast.refreshed` → AUDIT) and handoff 564 (EPM `variance_analysis.material_variance` → AUDIT). B10b: `source_domain_module_id` NULL on handoff 256 (AUDIT `recommendation.accepted` → EPM). DMDO: AUDIT consumer on `financial_forecasts` is at domain level (no `domain_module_data_objects` row); AUDIT-side audit will resolve. | `/handoffs?id=in.(199,564,256)` |
| ERP-FIN | B10b: `target_domain_module_id` NULL on handoffs 561, 563 (EPM → ERP-FIN). `source_domain_module_id` NULL on 6 inbound handoffs 124, 133, 532, 534, 535, 540 (ERP-FIN → EPM); these become EPM-side `target_domain_module_id` once EPM modules exist (B1-S9 covers EPM's side of those). | `/handoffs?id=in.(561,563,124,133,532,534,535,540)` |
| SPM | B10b: `target_domain_module_id` NULL on handoff 562 (EPM → SPM). `source_domain_module_id` NULL on handoffs 245, 246, 792, 795 (SPM → EPM). | `/handoffs?id=in.(562,245,246,792,795)` |
| HCM | B10b: `target_domain_module_id` NULL on handoff 601 (EPM `financial_plan.approved` → HCM). HCM-side has its own audit; this is a small B10b fix when that audit lands. | `/handoffs?id=eq.601` |
| SEM | B10b: `target_domain_module_id` NULL on handoffs 1207, 1208 (SEM → EPM; the `target_domain_module_id` is also EPM's side once modules exist, B1-S9 covers it). The deferred APQC tagging on 1207 / 1208 also owes SEM-side discovery. | `/handoffs?id=in.(1207,1208)` |
| PA | B10b: `target_domain_module_id` NULL on handoff 1104 (PA → EPM; EPM-side will resolve via B1-S9 once modules exist). PA's audit landed 2026-05-30 and the inbound visibility is captured there. | `/handoffs?id=eq.1104` |
| SPEND-MGMT | B10b: `source_domain_module_id` NULL on handoff 172 (SPEND-MGMT → EPM). | `/handoffs?id=eq.172` |
| VSDP | B10b: `source_domain_module_id` NULL on handoff 777 (VSDP → EPM). | `/handoffs?id=eq.777` |
| PSA | B10b: `source_domain_module_id` NULL on handoff 1021 (PSA → EPM). APQC tagging for `project_billing_milestone.slipped` deferred to PSA-side. | `/handoffs?id=eq.1021` |
| APM | B10b: `source_domain_module_id` populated (104) but the per-module APQC classification for `application_cost.updated` is on APM's H1 backlog. EPM-side `target_domain_module_id` covered by B1-S9. | `/handoffs?id=eq.1197` |
| ESG | Rule #15 notes on the DDO row (domain_id=21, data_object_id=37, role=consumer, on `financial_plans`): notes reads "Reads revenue / headcount for intensity-ratio calc". Surface in ESG's next audit. Same shape on COMP-MGMT, SWP, AUDIT, SPM DDO rows pointing at EPM masters. | `/domain_data_objects?data_object_id=in.(37,39,40)&domain_id=neq.66` |
| COMP-MGMT | Rule #15 notes on DDO row (domain_id=60, data_object_id=37): "COMP-MGMT consumes the approved financial_plan to validate merit-cycle budget envelope...". Surface in COMP-MGMT's next audit. | same query as above |
| SWP | Rule #15 notes on DDO row (domain_id=100, data_object_id=37): "Workforce cost contribution, workforce_cost_projections feed the people-cost line of the financial plan via the cost_projection.approved handoff." (also contains an em-dash). Surface in SWP's next audit. | same query as above |

Schedule b1 audits on ERP-FIN, SWP, SPM, AUDIT, SEM, HCM, PSA to derive their `source_domain_module_id` / `target_domain_module_id` per the standard B10b backfill, and to clean up the Rule #15 notes pollution on the DDO rows pointing at EPM masters. None of these are EPM's fix to make.

## 2026-05-31, Continuation: B1 technical fixes

Scope of this pass: apply only truly-technical Bucket 1 fixes that do not require user judgment. All judgment-bearing fixes (module-set shape per B2-S1, lifecycle states, aliases without pre-specified tuples, user-edges Rule #10 without exhaustive verb-shape pre-spec, intra-domain edges without full (verb, inverse_verb, kind, type, is_required, owner_side) pre-spec, pattern flags, role authoring, catalog UX) remain deferred to the prior buckets and to user response on B2-S1..S4 and B3-S1..S3.

### Applied

| ID | Action | Result |
|---|---|---|
| B1-S7 | PATCH `trigger_events.event_category` on the 4 EPM events with empty category, all to `state_change` per the audit and Rule #13 enum vocabulary. Rows: 583 `financial_plan.published`, 584 `financial_plan.approved`, 585 `financial_scenario.modeled`, 586 `variance_analysis.completed`. | 4 of 4 patched (each had `event_category=''` pre-write). |
| B1-S11 (1) | PATCH `domains.business_logic` id=66, replace ` — ` (em-dash with surrounding spaces) with `; ` per CLAUDE.md no-em-dash rule. | After: `...allocation, currency translation, eliminations); the calc kernel is the product.` |
| B1-S11 (2) | PATCH `domain_data_objects.notes` row id=334 (domain_id=66, data_object_id=196, role=contributor on `cost_centers`), set `notes=''` per Rule #15. Audit pre-specified the row by id + composite key. The reverted text restated the structured `role`/`necessity` columns and additionally carried an em-dash. | Row 334 notes set to empty string. |
| B1-H1 | INSERT 12 `handoff_processes` rows with `proposal_source='agent_curated'` and `record_status` omitted (DB default `'new'` per Rule #1). Each (handoff_id, process_id) pair pre-specified by the audit's "confident" H1 mappings AND with no pre-existing handoff_processes row on that pair. Inserted (handoff_id -> process_id): 10 -> 1322, 561 -> 1323, 562 -> 297, 601 -> 1322, 1104 -> 247, 124 -> 1379, 133 -> 1381, 172 -> 1323, 246 -> 297, 458 -> 980, 532 -> 1381, 535 -> 54. | 12 of 12 inserted; pre-flight verified all 12 handoffs exist, all 8 distinct PCFs resolve and carry `source_framework='apqc_pcf_cross_industry'`, no pre-existing (handoff_id, process_id) collisions. |

Loader: [.tmp_deploy/fix_epm_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_epm_b1_technical_2026_05_31.ts). Run from project root only.

H-band coverage after this pass: agent_curated `handoff_processes` rises from 0 of 27 cross-domain handoffs to 12 of 27 (44%). Still below the H1 target floor (0.5N = 14, 0.8N = 22); the remaining 4 confident proposals already carry a `discovery_substring` row on the same PCF (handoffs 199, 27, 540, 563, 564, 245), so reaching the floor requires either PATCHing those rows' `proposal_source` to `agent_curated` (a flip the technical pass does not authorize) or surfacing them for explicit user approval.

### Deferred (and why)

| ID | Reason for deferral |
|---|---|
| B1-S1 | M1 module split. New `domain_modules` rows; the shape itself is the B2-S1 user-pick (4 options a/b/c/d). Out of scope: new entities and gated on user judgment. |
| B1-S2 | M2/M4/M6 cascade. Resolved as a side-effect of B1-S1; nothing to do until the module set lands. |
| B1-S3 | B12 lifecycle states for 5 masters. Authoring new state-machine rows is gated on B1-S1 (state.domain_module_id needs a realizing module) and on B2-S3 pattern-flag judgments. Out of scope for technical pass. |
| B1-S4 | B11 aliases. Audit lists vendor terminology in prose but does not pre-specify exact `(alias_name, alias_type)` tuples per master; the technical pass does not bulk-insert aliases without exact pre-spec. |
| B1-S5 | B7 user-edges (Rule #10). Audit gives partial verb shapes ("owns_plan", "approves_budget", "models_scenario", ..., "etc.") for 5-10 edges per master but does not pre-specify the exact (relationship_verb, inverse_verb) per row exhaustively. Defer until edges are enumerated. |
| B1-S6 | B6 intra-domain edges between the 5 EPM masters. Audit names composition patterns ("financial_plans composes financial_budgets") but does not pre-specify the full `(relationship_verb, inverse_verb, relationship_kind, relationship_type, is_required, owner_side)` tuple per row. Defer until tuples are written out. |
| B1-S8 | F1 legacy `epm-system` skill retirement. Requires per-module system skills to exist first (per Rule #17), which requires the B1-S1 modules to land. Cascading deferral. |
| B1-S9 | B10b `source_domain_module_id` backfill on 8 outbound EPM handoffs. The prompt allows this PATCH "derivable from existing modules"; EPM currently has zero modules, so no source_module_id can be derived. Cascading deferral on B1-S1. |
| B1-S10 | B9b intra-domain handoffs between EPM modules. New `handoffs` rows that require the modules to exist first. Cascading deferral on B1-S1. |
| B1-H1 (medium-confidence, 4 of 22) | H1-13 (handoff 256, AUDIT recommendation.accepted): audit flags the existing `discovery_substring` row points at the wrong PCF (16817 warranty-recommendations); replacing it is a judgment call. H1-18 (handoff 534, ERP-FIN gl_account.mapping_changed): audit flags alternative L3 candidate 10728; flag for user. H1-21 (handoff 777, VSDP threshold_breached): audit suggests VSDP-side custom process may be preferable. H1-22 (handoffs 792, 795, SPM benefits_tracking_record.realized / at_risk): audit flags possible SPM-side specific process; defer to Discover. All four are explicitly judgment in the audit. |
| B1-H1 (confident-overlapping, 6 of 22) | H1-01 (199), H1-02 (27), H1-06 (563), H1-07 (564), H1-14 (245), H1-20 (540) each already carry a `discovery_substring` row pointing at the audit's proposed PCF. The audit asks to flip `proposal_source` to `agent_curated`; the technical pass authorizes INSERTs only, not source-flip PATCHes. Surface for user approval. |

### Not applicable to this pass

The TECHNICAL surface in the prompt also covers `domain_regulations` inserts (none named in this audit), stale-row DELETEs with named IDs (none named), naming renames (none named), `permission_verb_override` PATCHes (no lifecycle states exist), and additional `notes=''` reverts (only row id=334 is pre-specified for revert; rows id=54 and id=335 in B2-S4 are the user-judgment branch on whether the original notes were approved at load time).

Status frontmatter left as-is; the audit is still in `feedback_needed` pending Buckets 2 and 3 decisions on the dominant B1-S1 module-split blocker and on the cascading items above.

## 2026-05-31, Audit

### Summary

Structural Validate b1 pass (no market subagent). Bands re-checked against live state after the 2026-05-31 technical continuation:

- A1 PASS (domain row complete; `business_logic` em-dash cured; `notes` empty). A2 PASS (6 capabilities). A3 PASS (14 solutions linked, 11 primary).
- M1 HARD FAIL (still 0 `domain_modules` rows for `domain_id=66` and 0 `domain_module_host_domains.domain_id=66`). Dominant blocker, cascades to M2/M4/M6, B9b, B10b source side, B12 realizer column, E-band, F2-F5.
- B5 vacuous PASS (no `embedded_master` rows). B6 HARD FAIL (0 intra-EPM-master `data_object_relationships`; expected `financial_plans` composes `financial_budgets` / `_forecasts` / `_scenarios`, `variance_analyses` compares `financial_budgets` / `_forecasts`). B7 HARD FAIL (0 `users` (id 748) edges on EPM masters). B9 PARTIAL FAIL: trigger_event id 587 `variance_analysis.material_variance` still carries `event_category=''` (the prior PATCH set 583, 584, 585, 586 to `state_change` but missed 587). B9b cascade fail. B10b HARD FAIL (all 8 outbound EPM handoffs still NULL `source_domain_module_id`). B11 HARD FAIL (0 aliases on 5 masters). B12 HARD FAIL (0 lifecycle states on 5 masters).
- C1 PASS (5 mandatory regulations linked: SOX, IFRS, US GAAP, SEC Climate, ASC 606). C2 PASS (applicability=`mandatory` populated on each).
- D PASS modulo B11 already counted.
- E1-E5 vacuous fail (no EPM-module-anchored roles; `roles` schema scopes via `module_id` and there are no EPM modules).
- F1 HARD FAIL (legacy `epm-system` skill id=4 still domain-scoped, `domain_module_id=null`, 9 `skill_tools`). F2-F5 vacuous fail.
- H1 measure update: 22 of 28 cross-domain handoffs now tagged (18 `agent_curated`, 4 `discovery_substring`, plus the 256 `discovery_substring` row that points at the wrong PCF 16817). Above 0.5N=14 floor, near 0.8N=22 ceiling for process health. Catalog-quality headline (`record_status=approved`) remains 0 of 28 (human-approval only per Rule #1).

### Bucket 1 (in-scope confirmed gaps)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 | EPM has 0 `domain_modules` rows (re-confirmed live). Cascades to B1-S2 / S3 / S8 / S9 / S10. Gated on B2-S1 (split shape pick). | Author module loader after B2-S1 is answered. |
| B1-S2 | M2/M4/M6 | 6 capabilities without realizing modules; resolves as a side effect of B1-S1. | Cap-to-module mapping loaded with B1-S1. |
| B1-S3 | B12 | 0 lifecycle states on `financial_plans`, `financial_budgets`, `financial_forecasts`, `financial_scenarios`, `variance_analyses`. | Author state machines with `domain_module_id` set once B1-S1 lands. |
| B1-S4 | B11 | 0 aliases on the 5 masters; vendor terminology divergence enumerated in the 2026-05-30 audit narrative remains unresolved. | Load (alias_name, alias_type) tuples once specified by user. |
| B1-S5 | B7 | 0 `users` edges (Rule #10) on any of the 5 masters. Expected actor verbs: `plan_owner`, `approver`, `controller` on `financial_plans`; `budget_owner`, `submitter`, `approver` on `financial_budgets`; `forecast_owner`, `fp_analyst` on `financial_forecasts`; `scenario_modeler`, `reviewer` on `financial_scenarios`; `analyst`, `reviewer`, `accountable_manager` on `variance_analyses`. | Author user-edge rows once exact (relationship_verb, inverse_verb) tuples are written out. |
| B1-S6 | B6 | 0 intra-domain edges between EPM masters. Expected: `financial_plans` composes `financial_budgets` / `_forecasts` / `_scenarios` (one_to_many, parent owner_side); `variance_analyses` compares `financial_budgets` / `_forecasts` (many_to_one). | Author 5 intra-domain edges once full tuples specified. |
| B1-S7b | B9 | Trigger_event id 587 `variance_analysis.material_variance` still carries `event_category=''`. The prior PATCH covered 583, 584, 585, 586 but missed 587. Per Rule #13, set to `state_change` or `threshold` per workflow semantics (user pick: B2-S7b). | Trivial PATCH once enum value is picked. |
| B1-S8 | F1 | Legacy `epm-system` skill id=4 still `domain_module_id=null`. Retire once per-module system skills exist (cascaded on B1-S1). | DELETE skill 4 + redistribute 9 `skill_tools` rows. |
| B1-S9 | B10b | All 8 outbound EPM handoffs (10, 27, 199, 561, 562, 563, 564, 601) still carry NULL `source_domain_module_id`. Resolution cascaded on B1-S1. | Backfill `source_domain_module_id` once modules land. |
| B1-S10 | B9b | 0 intra-domain handoffs between EPM modules; cascade on B1-S1. | Author 3 lifecycle_progression handoffs once modules land. |
| B1-H1-flip | H1 | 4 confident-overlap handoffs still carry `discovery_substring` rows on the PCFs the audit calls out as the right map: handoff 199 -> 1324, 563 -> 1325, 564 -> 1325, 540 -> 1392. The 2026-05-31 technical pass INSERTed only on (handoff, PCF) pairs without a pre-existing row; flipping `proposal_source` to `agent_curated` is a PATCH that the technical pass did not authorize. | User approves the flip; PATCH 4 rows. |
| B1-H1-mediums | H1 | 4 medium-confidence H1 proposals remain unresolved: handoff 256 (existing `discovery_substring` row points at wrong PCF 16817 warranty-recommendations; audit proposes 20136 or defer), handoff 534 (no row yet; choose 1379 vs 10728), handoff 777 (no row yet; defer to VSDP custom process candidate), handoffs 792 / 795 (no rows yet; defer to SPM-specific). | Per-item user pick. |

Bucket 1 finding-type rollup: STRUCTURAL = 10 (S1, S2, S3, S4, S5, S6, S7b, S8, S9, S10), APQC TAGGING = 2 (H1-flip, H1-mediums). Total = 12. MISSING / WRONG-OWNERSHIP / SCOPE-CREEP / BOUNDARY / MODULARIZATION-ISSUES = 0 in Bucket 1 (gated on Bucket 3 vendor surface, or routed to Bucket 2 design conversation).

### Bucket 2 (surface-for-user, judgment calls)

| ID | Question | Why agent cannot answer alone | Options |
|---|---|---|---|
| B2-S1 | Module-split shape (drives B1-S1). | Affects every downstream load and the role / skill / permission shape. | (a) 5-module per-capability split; (b) 1-module `EPM-PLATFORM` (violates M2 floor); (c) 2-module `EPM-PLAN` + `EPM-REPORT`; (d) recommended 3-module `EPM-PLAN-BUDGET` + `EPM-FORECAST-SCENARIO` + `EPM-VARIANCE-REPORT`; (e) custom alternative. |
| B2-S2 | `WORKFORCE-PLAN-EPM` role scoping (`FPA-WORKFORCE-PARTNER`). | Editorial: which module owns the persona primary workflow once EPM modules exist. Depends on B1-S1 and B3-S2. | (a) primary on EPM-PLAN-BUDGET, secondary on SWP-COST-PROJECTIONS; (b) keep entirely on SWP; (c) split into two roles. |
| B2-S3 | B4 pattern-flag positive confirmation per Rule #12 for the 5 masters. | Rule #12 mandates positive consideration of `has_submit_lock`, `has_single_approver`, `has_personal_content`; defaults are not "considered". | Per-flag yes/no per master: `financial_plans.has_submit_lock`, `financial_plans.has_single_approver`, `financial_budgets.has_submit_lock`, `financial_forecasts.has_submit_lock` (likely explicit no), `variance_analyses.has_single_approver` (likely explicit no). |
| B2-S4 | Rule #15 notes pollution on EPM-owned DDO rows. | Cannot tell from audit alone whether the surviving notes were explicitly approved at load time. After the 2026-05-31 technical pass row id=334 was reverted to empty; row id=54 (`org_units` contributor) and row id=335 (`journal_entries` consumer) still carry text. | (a) Confirm approved at load time, leave both; (b) confirm auto-populated, PATCH both to empty + append Rule #15 incident entry to `references/skill-changelog.md`. |
| B2-S7b | B1-S7b enum pick. | Workflow-semantics decision on event 587 `variance_analysis.material_variance`: reads naturally as either a `threshold` event (variance crossed the materiality threshold) or a `state_change` event (the variance row transitioned into the `material` state). | Pick `threshold` or `state_change`. |

### Bucket 3 (Phase 0 pending, speculative)

| ID | Candidate | Vendor knowledge basis | Recommended verification path |
|---|---|---|---|
| B3-S1 | `cost_allocations` master (allocation rule definitions + per-period executions). | Every flagship platform (Oracle EPM, Anaplan, OneStream, SAP SAC, Workday Adaptive, Pigment) ships an allocation engine; the absence is what makes the catalog read EPM as "another forms tool" rather than a calc-kernel platform. The 50% `crud_percentage` on EPM signals exactly this slice. | Phase 0 against Oracle EPM Allocations, Anaplan Allocation, OneStream Allocations after B1-S1 lands. |
| B3-S2 | `headcount_plans` master, separate from `financial_plans`. | Every flagship has a headcount / position-level plan distinct from the dollar plan (Workday Adaptive Workforce, Anaplan Connected Workforce, Pigment People). Today EPM conflates this into `financial_plans` via the `WORKFORCE-PLAN-EPM` capability with line-item flow from SWP. | Phase 0 verification plus the B2-S2 decision. |
| B3-S3 | 4th `EPM-CONSOL` / `EPM-DISCLOSURE` module candidate, gated on `_missing-domains.md` triage of `CCM`, `FIN-CONSOL`, `DISCLOSURE-MGMT`. | OneStream and Oracle EPM bundle close / consolidation / disclosure narrative onto the same platform; EPM in our catalog has zero close / consolidation / disclosure surface today. | Triage candidates in `_missing-domains.md` first. |

### Cross-bucket dependencies

- B1-S1 (M1, module split) is the catalog gate for B1-S2 / S3 / S8 / S9 / S10. Bucket 2 B2-S1 IS the question that resolves B1-S1.
- B2-S2 (role scoping) depends on B1-S1 and Bucket 3 B3-S2. Hold until both land.
- B2-S3 (pattern flags), B2-S4 (Rule #15 notes), and B2-S7b (event 587 category) are independent.
- B3-S3 depends on `_missing-domains.md` triage of CCM / FIN-CONSOL / DISCLOSURE-MGMT.
- B1-H1-flip and B1-H1-mediums are independent of every other item.

### No fixes applied this pass

This was a structural Validate b1 pass only; no catalog writes were issued.

## 2026-06-02 Audit (modularization)

### Summary

Scope of this pass: modules plus entity assignment only. Built EPM's `domain_modules` set from zero, linked the 6 existing capabilities, and assigned the 8 existing `domain_module_data_objects` at their existing roles. No new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships were created. This resolves the dominant M1 blocker (B1B-S1) using option (d), the recommended 3-module split that the 2026-05-30 and 2026-05-31 audits proposed, plus the implicit M2/M4/M6 cascade (B1B-S2).

The module-split shape question B2-S1 was the gating user pick in the prior buckets. This pass adopted option (d) (the audit-recommended 3-module split) because it is the option the prior audit narratives recommended and matches the natural lifecycle clusters of the 5 masters and the Rule #14 floor (6 capabilities require >=2 full modules). If the user prefers an alternative split shape (a/c/custom), this is reversible: the modules and their junction rows can be rebuilt.

### Modules created (all module_kind=full, domain_id=66)

| id | code | name | capabilities | masters | borrowed |
|---|---|---|---|---|---|
| 239 | EPM-PLAN-BUDGET | Planning and Budgeting | BUDGET-PLAN (66), DRIVER-MODEL (68), WORKFORCE-PLAN-EPM (71) | financial_plans (37), financial_budgets (38) | org_units (34, contributor, HCM-mastered), cost_centers (196, contributor) |
| 240 | EPM-FORECAST-SCENARIO | Forecasting and Scenario Modeling | FORECAST (67), SCENARIO-MODEL (69) | financial_forecasts (39), financial_scenarios (40) | journal_entries (194, consumer, ERP-FIN) |
| 241 | EPM-VARIANCE-REPORT | Variance and Management Reporting | MGMT-REPORT (70) | variance_analyses (41) | journal_entries (194, consumer), cost_centers (196, contributor) |

### Master pre-check (M7 catalog-wide)

Ran the mandatory catalog-wide master pre-check on all 5 intended masters (37, 38, 39, 40, 41) plus the 3 borrowed entities (34, 196, 194) before any `role='master'` write:

- financial_plans (37), financial_budgets (38), financial_forecasts (39), financial_scenarios (40), variance_analyses (41): zero pre-existing `role='master'` rows anywhere in the catalog. EPM masters all 5. No demotions.
- org_units (34): already mastered by HCM-ORG-POSITIONS (module 55, domain 54). Assigned `contributor` here. NOT promoted.
- cost_centers (196): no `master` row anywhere (only the EPM legacy contributor row); a Finance/GL domain would be its eventual master. Assigned `contributor` here, no promotion.
- journal_entries (194): no `master` row anywhere; ERP-FIN owns it. Assigned `consumer` here, no promotion.

No demotions were required (no second-master collision occurred).

### Verification (live)

- domain_module_capabilities for modules 239/240/241: 6 rows, every EPM capability (66, 67, 68, 69, 70, 71) placed in exactly one module. M4 satisfied. Every module has >=1 capability (M6).
- domain_module_data_objects for modules 239/240/241: 10 rows. Every module has >=1 data_object (no empty module). Each of the 5 masters appears exactly once in-domain AND exactly once catalog-wide (re-queried `data_object_id=in.(37,38,39,40,41)&role=eq.master`, all 5 resolve to a single EPM module). M7 satisfied.
- Rule #14 floor satisfied: 3 full modules >= the 2-module floor for a 6-capability domain.

### Cascade now unblocked (deferred, out of this pass's scope)

The module landing converts several B1B items from blocked to agent-actionable on the next technical pass:
- B1B-S8 (F1): retire legacy domain-scoped `epm-system` skill (id 4, 9 skill_tools); author one per-module system skill on each of 239/240/241 (Rule #17). Now technically unblocked.
- B1B-S9 (B10b source side): backfill `source_domain_module_id` on 8 outbound EPM handoffs (10, 561, 601 -> 239; 27, 199, 562 -> 240; 563, 564 -> 241).
- B1B-S10 (B9b): author 3 intra-domain lifecycle_progression handoffs (239 -> 240 on financial_plan.published; 239 -> 241 on financial_budget.approved; 240 -> 241 on financial_forecast.refreshed).
- B1B-S3 (B12 lifecycle states), B1B-S5/S6 (B7/B6 edges), B1B-S4 (B11 aliases): the realizer `domain_module_id` column now has targets, but each still awaits its own user-pick tuples (and B2-S3 pattern flags for the lifecycle shapes). Left as b1b.

### Catalog UX (M8/A4)

Modules were created without `catalog_tagline` / `catalog_description` per the insert shape for this pass (omitted). These are a follow-up catalog-UX item (surfaced in state.yaml b1a B1A-CATALOG-UX).

### No other writes

No lifecycle states, aliases, relationships, skills, tools, handoffs, regulations, or trigger_event PATCHes were issued. Genuine gaps (cost_allocations B3-S1, headcount_plans B3-S2, the 4th consol/disclosure module B3-S3) remain flagged in b3, unfilled.

