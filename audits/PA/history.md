# PA audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 4 full modules (`PA-WORKFORCE-METRICS` 81, `PA-ENGAGEMENT-SURVEYS` 82, `PA-PREDICTIVE-MODELS` 83, `PA-DEI-ANALYTICS` 84). No starters. No cross-host. 5 masters: `attrition_forecasts` (42, on PA-PREDICTIVE-MODELS), `people_kpis` (43, on PA-WORKFORCE-METRICS), `workforce_segments` (44, on PA-WORKFORCE-METRICS), `engagement_surveys` (45, on PA-ENGAGEMENT-SURVEYS), `predictive_models` (46, on PA-PREDICTIVE-MODELS). Module 84 (PA-DEI-ANALYTICS) masters ZERO data_objects (only derived/consumer rows). 4 capabilities (`HR-METRICS`, `ATTRITION-PREDICT`, `DEI-ANALYTICS`, `WORKFORCE-COMP`). 6 solutions (5 primary: Workday Prism Analytics, Visier People, Crunchr, ChartHop, OneModel; 1 secondary: Workday Talent Optimization). 3 regulations (EU GDPR, EU Pay Transparency Directive, EU AI Act). 12 trigger_events on PA masters (64, 397-401, 1219-1224). 22 outbound cross-domain handoffs and 16 inbound cross-domain handoffs (total ~38 cross-domain handoffs); 4 intra-domain `lifecycle_progression` handoffs (1114-1117). ZERO data_object_lifecycle_states on any PA master. ZERO permissions on any of the 4 modules. ZERO `role_modules` rows touching PA modules. ZERO `data_object_aliases` rows on any PA master. ZERO module-level system skills (the only PA skill is legacy id=5 `pa-system` with `domain_module_id=NULL`). ZERO `skill_tools` rows on the legacy skill. Existing APQC `handoff_processes` rows: 8 (all `discovery_substring`, all `record_status='new'`, 0 `agent_curated`, 0 `approved`).

- **Vendor-surface basis (Pass 2 flagship enumeration):** Visier People (pure-play people-analytics specialist; the category-defining vendor), Crunchr (pure-play, Dutch market origin), ChartHop (org chart + people analytics blend), OneModel (data warehouse for HR), Workday Prism Analytics / Workday People Analytics (the suite-bundled flagship), Microsoft Viva Insights (productivity + engagement analytics with Microsoft 365 signals), SAP SuccessFactors People Analytics. Adjacent / sub-feature: Eightfold AI (talent-intelligence specialist; overlaps but primary market is talent-matching), Sapience (work pattern analytics), Plai (objectives + analytics), Orgvue (organisational design analytics, overlaps SWP), SplashBI HR, Sisense for HR. Compliance specialists (separate categories that consume PA outputs): Trusaic and Syndio (pay-equity analytics, EU Pay Transparency Directive filing), Diversio (DEI analytics SaaS). Engagement-survey specialists that the PA category absorbs as a sub-feature: Culture Amp, Lattice, Glint (Microsoft), Peakon (Workday), Qualtrics EmployeeXM. These engagement-survey vendors arguably live primarily under EMP-EXP; surfaced as B2-S7 below.

- **Bucket 1 (in-scope, agent fixable):** 12 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 9 items.
- **Candidates queued in `_missing-domains.md`:** 2 (people-listening / employee-listening as distinct from EMP-EXP, talent-intelligence-platform).

**Neighbor discovery** (ranked by edge weight: outbound + inbound + DMDO touch points + cross-relationships):

| Neighbor | Out | In | DMDO touch | Weight | Pass shape |
|---|---|---|---|---|---|
| TALENT-MGMT | 4 (high_potential.identified, engagement.declining, attrition_risk.elevated, attrition_risk.high, predictive_model.deployed) | 0 | none | 5 | Pairwise (full) |
| HCM | 3 (attrition_risk.elevated, attrition_risk.high, people_kpi.snapshot_published) | 1 (employment_event.recorded) | 4 derived (employees, employment_events, absence_requests, performance_reviews, learning_records, pay_slips, engagement_drivers) | 8 | Pairwise (full) |
| EMP-EXP | 1 (engagement.declining) | 3 (survey.cycle_closed engagement_drivers, survey_response.received, action_plan.completed) | engagement_drivers derived, survey_responses consumer | 6 | Pairwise (full) |
| SWP | 2 (workforce_segment.composition_changed, attrition_forecast.published, attrition.forecast_updated) | 0 | none | 3 | Pairwise (full) |
| ATS | 1 (predictive_model.scored) | 3 (recruitment_source.attributed, interview_scorecard.submitted, requisition.filled) | recruitment_sources consumer | 5 | Pairwise (full) |
| COMP-MGMT | 1 (pay_equity.gap_detected) | 2 (merit_cycle.closed compensation_statements, the compensation_plans/merit_recommendations consumer linkage) | compensation_plans, merit_recommendations consumer (optional) | 4 | Pairwise (full) |
| PAYROLL | 0 | 3 (pay_cycle.closed x2 different payloads, pay_run.disbursed) | pay_slips derived | 4 | Pairwise (full) |
| SKILLS-MGMT | 1 (skill_gap.identified) | 0 | none | 1 | Lightweight |
| LMS | 0 | 0 | course_enrollments consumer, learning_records derived | 2 | Lightweight |
| EPM | 1 (people_kpi.snapshot_published) | 0 | none | 1 | Lightweight |
| HRSD | 1 (engagement.declining) | 0 | none | 1 | Lightweight |
| WFM | 0 | 0 | absence_requests derived, time_entries consumer | 2 | Lightweight |
| PSA | 0 | 1 (project_assignment.utilization_low) | none | 1 | Lightweight |
| BEN-ADMIN | 0 | 0 | benefit_enrollments consumer | 1 | Lightweight |
| (others touched via consumer/derived but no handoff) | | | saas_usage_metrics, customers, call_recordings , see B2-S5 | | Lightweight |

**Structural pass bands.** **S-band sweep:** S1 surfaces zero rows on `skills`/`role_modules`/`permissions` against `domain_modules.id IN (81,82,83,84)`, which routes to F2 / E1 / E4. S2 shows PA-DEI-ANALYTICS (84) has zero `domain_module_data_objects.role='master'` and only 1 `domain_module_capabilities` row , routes to M6 borderline + B1 borderline. S3 shows every PA master has zero lifecycle_states + zero aliases + the master also has only 1-2 trigger_events , routes to B11 + B12. **A-band passes** (A1 metadata complete; A2 4 capabilities; A3 6 solutions with coverage_level). **C-band passes** (C1 has owner = People Analytics business function). **D-band** not run (no UI spot-check in agent-only audit). **M-band:** M1 passes (4 full modules). M2 passes (4 capabilities, 4 modules). M4 passes (every capability realized by ≥1 module, modulo capability DEI-ANALYTICS in module 84 with no master). M6 passes (every module realizes ≥1 capability). M7 passes (5 masters each on exactly one module catalog-wide; module 84 has zero masters which is borderline-but-allowed: derived-only DEI view). **B-band:** B1 passes (5 masters). B2 passes (every master has singular_label + plural_label). B3 passes (all prefixed names, no canonical-bare-word claims needed). B4 passes vacuously (all 5 masters at `false / false / false`; pattern flags were not positively re-evaluated, see B2-S3). B5 not applicable (no embedded_master rows). **B6 partial-fail** (limited intra-PA relationship coverage: only 1 inter-PA-master relationship , `engagement_drivers feeds people_kpis` id 161; the master pairs `attrition_forecasts ↔ workforce_segments`, `predictive_models ↔ attrition_forecasts`, `engagement_surveys ↔ engagement_drivers`, `predictive_models ↔ workforce_segments` have no explicit `data_object_relationships` rows). **B7 fail** (zero `users` edges from any of the 5 PA masters , at minimum `predictive_models` has a creator/owner, `engagement_surveys` has a launcher, `people_kpis` has a publisher). **B8 partial-fail** (no outbound `data_object_relationships` rows for PA masters → other-domain masters for the 22 outbound handoffs , only id 13 `org_units is_measured_by people_kpis` and id 832 `customers feeds people_kpis` cover related edges, both with owner_side targeting PA; the canonical 'PA outbound writes ANALYTICS view' relationship rows are not authored). **B9 partial-fail** (5 trigger_events with empty `event_category` , 397, 398, 399, 400, 401 , Rule #13 enum violation). **B9 attribution defect** (trigger_events 10 `attrition_risk.high` data_object_id=31 employees, mastered by HCM not PA; and 11 `attrition.forecast_updated` data_object_id=23 workforce_plans, mastered by SWP , both are used by PA-published outbound handoffs 449/450/451/13 even though the event's data_object is NOT PA-mastered). **B9b fail** (4 intra-domain handoffs loaded 1114/1115/1116/1117 , but a 4-module domain has more expected pairs; the audit cannot quantify all expected pairs without lifecycle states authored, so the deeper B9b finding folds into B12). **B10b in-scope fail** (10 outbound rows have NULL `target_domain_module_id`: 1104 to EPM, 1105 to COMP-MGMT, 1107 to EMP-EXP, 1108 to TALENT-MGMT, 1110 to TALENT-MGMT, 1111 to HCM, 1113 to TALENT-MGMT, 451 to HCM, 450 to TALENT-MGMT , note these target-FK NULLs are owed by the target domains' B10b, NOT by PA; see report-only). On the inbound side, 10 of 16 inbound rows have NULL `target_domain_module_id` , these IS PA's fix: rows 25, 102, 1077, 1130, 444, 1155, 107, 115 plus untracked. **B11 fail** (zero aliases on all 5 masters , Visier-style "Headcount", "FTE", "Span of Control", "Engagement Score" / OneModel "Metric" / Workday "Workforce Insights" , should be aliased). **B12 hard fail** (zero `data_object_lifecycle_states` rows on any of the 5 masters; every master has a real workflow , engagement_surveys cycles open / launched / closed / scored / archived; attrition_forecasts cycles draft / published / refreshed / superseded; predictive_models cycles trained / validated / deployed / retired). **F1 fail** (legacy domain-level skill id=5 `pa-system` with `domain_module_id=NULL`; no module-level skills authored yet, so the legacy row is currently the ONLY skill , F1 is in its transitional state. Once module-level system skills are authored per F2, this legacy row must be DELETED). **F2 hard fail** (zero module-level system skills on any of the 4 PA modules; expected 4). **F3 hard fail** (zero `skill_tools` rows, transitive from F2). **F4 vacuous** (no rows to violate). **F5 uncomputable** (Semantius score requires a system skill per module; gap reports the literal "uncomputable, see F2 / F3"). **F7 vacuous**. **E1 fail** (zero roles touching any PA module; expected ≥3 for a 4-module domain). **E2-E6 vacuous** (no roles to evaluate). **H1 hard fail** (catalog quality: 0 of ~38 cross-domain handoffs `record_status='approved'`; 0 `agent_curated`; 8 tagged `discovery_substring`/all `record_status='new'`; 30 untagged). H1 volume target for N=38: ~19 to ~30 `agent_curated` proposals. The audit produces 30 candidate rows in the B1-H1 table below. **Rule #15 pollution audit:** all `notes` columns on the 5 PA masters, all PA `domain_module_data_objects`, all PA `domain_data_objects`, and all PA `data_object_relationships` rows checked are empty. No Rule #15 incident on PA.

PA Semantius score (strict, PA proper): **uncomputable** because no module-level system skills exist. The legacy `pa-system` skill (id 5) carries zero `skill_tools` rows so neither the strict nor operational score is defined.

### Bucket 1, In-scope confirmed gaps

#### Sub-category counts

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (S/A/M/B/C/E/F band failures) | 10 |
| BOUNDARY (NULL FK or missing handoff) | 1 |
| APQC TAGGING | 1 |
| MODULARIZATION ISSUES | 0 (routes to Bucket 2) |

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **B12 (hard fail)** | Zero `data_object_lifecycle_states` rows on any of the 5 PA masters. `attrition_forecasts` 42, `people_kpis` 43, `workforce_segments` 44, `engagement_surveys` 45, `predictive_models` 46 , all empty. Each has a real workflow: `engagement_surveys` cycles `draft → launched → closing → closed → results_published → archived` (and id 398 `engagement_survey.launched` + 399 `engagement_survey.closed` are already in `trigger_events`, so the state machine is implied); `attrition_forecasts` cycles `draft → published → superseded`; `predictive_models` cycles `training → validated → deployed → retired` (and 400 `predictive_model.deployed` + 401 `predictive_model.scored` exist as events); `people_kpis` cycles `draft → snapshot_published → archived` (1219 already exists); `workforce_segments` cycles `draft → composition_baseline → composition_changed → archived`. | Draft state machines per the implied state-name set above (one state per existing trigger_event verb suffix + initial + terminal). Mark `requires_permission=true` on the gated transitions (`engagement_survey.launched`, `predictive_model.deployed`, `attrition_forecast.published`); set `domain_module_id` to the master's home module (per M5). Load via a focused loader. |
| B1-S2 | **B9 (Rule #13 enum)** | 5 trigger_events have empty `event_category`: 397 `attrition_forecast.published`, 398 `engagement_survey.launched`, 399 `engagement_survey.closed`, 400 `predictive_model.deployed`, 401 `predictive_model.scored`. Allowed values per Rule #13: `lifecycle / state_change / threshold / signal`. | PATCH each row: 397 → `state_change` (publish is a state transition on attrition_forecasts); 398 → `lifecycle` (survey opening is a lifecycle stage on engagement_surveys); 399 → `state_change` (survey closing is a state transition); 400 → `state_change` (model deployment is a state transition on predictive_models); 401 → `signal` (scoring batch is an emission event, not a state change). |
| B1-S3 | **F1 / F2 / F3 / F5 cluster (hard fail)** | F2 returns zero module-level `skill_type='system'` rows on any of the 4 PA modules; F3 trivially fails (no `skill_tools` rows); F5 Semantius score is uncomputable. The only PA skill is legacy id=5 `pa-system` with `domain_module_id=NULL` and zero `skill_tools` rows. The Rule #17 contract (one `system` skill per `domain_modules` row, ≥1 `skill_tools` row per skill, 5–20 tools typical) is fully unmet. | Author 4 module-level system skills: `pa_workforce_metrics_agent` (module 81), `pa_engagement_surveys_agent` (82), `pa_predictive_models_agent` (83), `pa_dei_analytics_agent` (84). Each gets ≥5 `skill_tools` rows per the Phase-S authoring procedure (a `query_<master>` per mastered entity, a `mutate_<master>` per gated state transition, `notify_person` for engagement / attrition outreach abstraction, `compute_*` primitives for the analytics workload). Once module-level skills exist, DELETE the legacy id=5 row per F1. The PA scope is heavily compute-shaped (predictive models, KPI calculations, DEI scoring); expect a higher-than-average `coverage_tier='external'` share on `skill_tools` because compute primitives often delegate to an ML platform. |
| B1-S4 | **E1 / E2 / E4 / E5 cluster (hard fail)** | Zero `role_modules` rows touching any of the 4 PA modules; zero PA-scoped roles at all. Multi-module domain (4 modules) requires ≥3 roles per E1 with 2-module floor per E2. | Author 3-5 PA-scoped roles bundled under the People Analytics business function (id 80): `HR-PA-ANALYST` (primary user, multi-module read + dashboard authoring), `HR-PA-LEAD` (model deployment approver, DEI report sign-off), `HR-PA-DATA-SCIENTIST` (predictive model author, DEI cohort analysis). Each role gets ≥2 `role_modules` rows (interaction_level set) and a populated `role_permissions` bundle. Pair with the workflow-gate permissions emerging from B1-S1's lifecycle states. |
| B1-S5 | **Permissions: zero rows on any of the 4 PA modules** | `/permissions?domain_module_id=in.(81,82,83,84)` returns empty. Rule #14 module-permission derivation (3 baseline per module: `:read / :manage / :admin`, plus workflow-gate per lifecycle state with `requires_permission=true`) implies at least 12 baseline rows expected, plus workflow-gate rows once B1-S1 lands. | Author baseline permissions (3 per module = 12 rows). Author workflow-gate permissions once lifecycle states from B1-S1 are loaded: each gated state at minimum 1 permission. Couple with B1-S4 role bundles. |
| B1-S6 | **B7 (users edges)** | Zero `data_object_relationships` rows between PA masters and `users`. Every master has a user-typed actor: `engagement_surveys` has a launcher / closer / survey_administrator; `attrition_forecasts` has a publisher / data_scientist; `predictive_models` has a model_author / approver; `people_kpis` has a publisher / kpi_owner; `workforce_segments` has a segment_author. | Author 5+ `data_object_relationships` rows: `users → engagement_surveys` (launches), `users → attrition_forecasts` (publishes), `users → predictive_models` (authors / approves), `users → people_kpis` (publishes), `users → workforce_segments` (authors). Per Rule #10. |
| B1-S7 | **B6 (intra-PA relationships)** | Only 1 in-PA-master relationship row exists (id 161 `engagement_drivers feeds people_kpis`, and `engagement_drivers` is derived not master). The 5 PA masters lack relationships between themselves: `predictive_models scores attrition_forecasts`, `predictive_models scores workforce_segments`, `attrition_forecasts segments workforce_segments`, `engagement_surveys publishes engagement_drivers` (existing 161 covers the derived edge), `workforce_segments aggregates_into people_kpis`. | Draft 4-5 intra-PA `data_object_relationships` rows per the cluster-drafts pattern. Verb + inverse_verb + cardinality + necessity + owner_side. |
| B1-S8 | **B11 (aliases)** | Zero `data_object_aliases` rows on any PA master. PA is a market with strong vendor terminology: Visier's "Workforce Insight" / "People Strategy" terms, OneModel's "HR Metric", Workday's "People Analytics Visualisation", ChartHop's "Headcount Card", Microsoft Viva's "Productivity Score" / "Wellbeing Score". | Draft 2-4 aliases per master (alias_name + alias_type), e.g. `people_kpis → "HR Metric" (vendor)`, `people_kpis → "Headcount Insight" (industry)`, `engagement_surveys → "Pulse Survey" (industry)`, `engagement_surveys → "Employee Listening Cycle" (vendor)`, `attrition_forecasts → "Flight Risk Score" (vendor)`, `predictive_models → "ML Model" (industry)`, `workforce_segments → "People Cohort" (vendor)`. |
| B1-S9 | **B9 attribution defect** | trigger_events 10 (`attrition_risk.high`, data_object_id=31 employees) and 11 (`attrition.forecast_updated`, data_object_id=23 workforce_plans) are used by PA-published outbound handoffs 449/450 (event 10) and 13/451 (event 11), yet neither data_object is mastered by PA. Event 10 should fire on a PA-mastered surrogate (a `attrition_risk_assessments` or use existing 1221 `attrition_risk.elevated`); event 11 should fire on `attrition_forecasts` (PA-mastered id 42, which already has 397 `attrition_forecast.published` , duplicate semantics). | Two options for the user: (a) REPLACE handoffs 449/450/13/451 to use PA-mastered events (1221 for 449/450, 397 for 13/451) and retire events 10 + 11 if they have no other publisher; (b) PATCH events 10 + 11's data_object_id to point to PA-mastered rows. Surface decision in B2 since the choice affects upstream catalog rows beyond PA. |
| B1-S10 | **B4 pattern flags not positively re-evaluated** | All 5 masters carry `has_personal_content=false, has_submit_lock=false, has_single_approver=false`. Rule #12 + Rule #15 disallow notes annotations, but B4 requires positive re-evaluation in the audit transcript. Re-evaluating: `engagement_surveys` SHOULD be `has_personal_content=true` (survey responses are personal data subject to GDPR Art. 9, special categories likely); `engagement_surveys` SHOULD be `has_submit_lock=true` (a closed survey cycle locks the response window); `predictive_models` SHOULD be `has_single_approver=true` (EU AI Act Article 14 requires single human accountable for high-risk AI deployment); `attrition_forecasts` SHOULD be `has_personal_content=true` (individual-level attrition scores are personal data per GDPR + EU AI Act profiling). | PATCH the flags: `engagement_surveys`: `has_personal_content=true, has_submit_lock=true`; `predictive_models`: `has_single_approver=true, has_personal_content=true`; `attrition_forecasts`: `has_personal_content=true`. Leave `people_kpis` + `workforce_segments` flags at false (aggregate metrics, no per-employee linkage). |

#### BOUNDARY findings

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-B1 | **B10b (in-scope), NULL target_domain_module_id on inbound handoffs** | 10 inbound cross-domain handoffs carry NULL `target_domain_module_id` where PA owns the fix. Mapping is mechanical from the payload data_object → mastering PA module: payload `people_kpis` (43) → module 81; payload `engagement_drivers` (183, PA-derived not mastered) → module 82; payload `pay_runs` (138, PAYROLL-mastered) → module 81 (consumed for cost KPIs); payload `compensation_statements` (157) → module 81; payload `action_plans` (184) → module 82; payload `survey_responses` (182) → module 82; payload `engagement_drivers` (183) → module 82; payload `pay_slips` (139) → module 81; payload `project_assignments` (218) → module 81 (utilization KPI); payload `interview_scorecards` (9) → module 81 (recruiter-quality KPI). The 10 candidate IDs: 25 (PAYROLL pay_cycle.closed → people_kpis), 102 (PAYROLL pay_cycle.closed → pay_slips), 1077 (EMP-EXP action_plan.completed → action_plans), 1130 (PSA project_assignment.utilization_low → project_assignments), 444 (EMP-EXP survey_response.received → survey_responses), 1155 (PAYROLL pay_run.disbursed → pay_runs), 107 (COMP-MGMT merit_cycle.closed → compensation_statements), 115 (EMP-EXP survey.cycle_closed → engagement_drivers), 1281 (ATS interview_scorecard.submitted → interview_scorecards). | PATCH each row's `target_domain_module_id` per the payload-derived map. Mechanical loader pattern (matches HCM B1-S2). |

#### B1-H1 APQC TAGGING (proposed candidates)

H1 is a single Bucket 1 item even though it proposes ~30 row inserts. Counts as one B1 row in the bucket summary.

**Strategy.** PA's cross-domain handoffs cluster into three PCF families: (a) workforce metrics / KPI publication (PCF 10544 "Manage workforce metrics" L3 under 10532 "Develop and train employees" parent), (b) employee engagement / listening (PCF 10545 "Manage employee engagement" L3 or 16944 "Conduct employee engagement surveys" L3 , both candidates exist), (c) talent intelligence / predictive (PCF 10547 "Manage talent" L3 + 10548 "Develop and counsel employees" L3 children). For DEI / pay-equity outputs, 16437 "Manage business unit ethics and compliance" L3 is the right family. The 8 existing tags are all `discovery_substring` and several are mismatched: 451/13 mapped to 10175 "Analyze customer attrition and retention rates" (wrong family , customer-CRM attrition, not workforce attrition); 115 mapped to 10018 "Survey market and determine customer needs and wants" (wrong family , marketing, not employee engagement). These need REPLACE.

**Outbound (PA-published, target = downstream domain):**

| handoff_id | source → target (module → domain) | trigger_event | Proposed PCF row | Confidence |
|---|---|---|---|---|
| 26 | PA-WORKFORCE-METRICS → TALENT-MGMT | `high_potential.identified` | Manage talent (10547 L3) | confident L3 |
| 1104 | PA-WORKFORCE-METRICS → EPM | `people_kpi.snapshot_published` | Manage workforce metrics (10544 L3) | confident L3 |
| 1105 | PA-DEI-ANALYTICS → COMP-MGMT | `pay_equity.gap_detected` | Manage business unit ethics and compliance (16437 L3) | confident L3 |
| 1107 | PA-ENGAGEMENT-SURVEYS → EMP-EXP | `engagement.declining` | Manage employee engagement (10545 L3) , REPLACE existing 16944 if reviewer prefers the parent | confident L3 |
| 1108 | PA-ENGAGEMENT-SURVEYS → TALENT-MGMT | `engagement.declining` | Manage talent (10547 L3) | confident L3 |
| 1106 | PA-DEI-ANALYTICS → SKILLS-MGMT | `skill_gap.identified` | Develop and manage employee skills and capabilities (10545 L3) | medium |
| 1109 | PA-ENGAGEMENT-SURVEYS → HRSD | `engagement.declining` | Manage HR service delivery / Manage employee inquiries (10550 L3) | medium |
| 1110 | PA-PREDICTIVE-MODELS → TALENT-MGMT | `attrition_risk.elevated` | Manage talent (10547 L3) | confident L3 |
| 1111 | PA-PREDICTIVE-MODELS → HCM | `attrition_risk.elevated` | Manage workforce metrics (10544 L3) | confident L3 |
| 1112 | PA-WORKFORCE-METRICS → SWP | `workforce_segment.composition_changed` | Manage workforce planning (10532 L3) | confident L3 |
| 1113 | PA-PREDICTIVE-MODELS → TALENT-MGMT | `predictive_model.deployed` | Manage talent (10547 L3) | confident L3 |
| 451 | PA-PREDICTIVE-MODELS → HCM | `attrition.forecast_updated` | Manage workforce metrics (10544 L3) , REPLACE existing 10175 (wrong family, customer-CRM) | confident L3 |
| 13 | PA-PREDICTIVE-MODELS → SWP | `attrition.forecast_updated` | Manage workforce planning (10532 L3) , REPLACE existing 10175 (wrong family) | confident L3 |
| 449 | PA-PREDICTIVE-MODELS → HCM | `attrition_risk.high` | Manage workforce metrics (10544 L3) | confident L3 |
| 450 | PA-PREDICTIVE-MODELS → TALENT-MGMT | `attrition_risk.high` | Manage talent (10547 L3) | confident L3 |
| 452 | PA-PREDICTIVE-MODELS → SWP | `attrition_forecast.published` | Manage workforce planning (10532 L3) | confident L3 |
| 453 | PA-PREDICTIVE-MODELS → ATS | `predictive_model.scored` | Recruit employees (10539 L3) , predictive hire-success scoring is a recruiting-quality signal | confident L3 |
| 1103 | PA-WORKFORCE-METRICS → HCM | `people_kpi.snapshot_published` | Manage workforce metrics (10544 L3) | confident L3 |

**Inbound (PA-received, source = upstream domain):**

| handoff_id | source → target (domain → module) | trigger_event | Proposed PCF row | Confidence |
|---|---|---|---|---|
| 25 | PAYROLL → PA-WORKFORCE-METRICS | `pay_cycle.closed` (payload people_kpis) | Manage workforce metrics (10544 L3) | confident L3 |
| 23 | ATS → PA-WORKFORCE-METRICS | `requisition.filled` (payload people_kpis) | (existing 21698 "Manage employee requisitions" looks reasonable; REPLACE with `agent_curated` confirmation OR raise to 10544 for better workforce-metrics family alignment , flag to user) | medium |
| 21 | HCM → PA-WORKFORCE-METRICS | `employment_event.recorded` | Manage workforce metrics (10544 L3) | confident L3 |
| 102 | PAYROLL → PA-WORKFORCE-METRICS | `pay_cycle.closed` (payload pay_slips) | Manage workforce metrics (10544 L3) | confident L3 |
| 1077 | EMP-EXP → PA-ENGAGEMENT-SURVEYS | `action_plan.completed` | Manage employee engagement (10545 L3) | confident L3 |
| 1130 | PSA → PA-WORKFORCE-METRICS | `project_assignment.utilization_low` | Manage project resources (10773 L3) , utilization signal IS a PSA-side process, the workforce-metrics consumer side maps to 10544 | medium L3 |
| 403 | ATS → PA-WORKFORCE-METRICS | `recruitment_source.attributed` | Manage workforce metrics (10544 L3) , recruiting-source quality is a workforce metric | confident L3 |
| 444 | EMP-EXP → PA-ENGAGEMENT-SURVEYS | `survey_response.received` | Conduct employee engagement surveys (16944 L3) | confident L3 |
| 1155 | PAYROLL → PA-WORKFORCE-METRICS | `pay_run.disbursed` | Manage workforce metrics (10544 L3) | confident L3 |
| 107 | COMP-MGMT → PA-WORKFORCE-METRICS | `merit_cycle.closed` | Develop and manage rewards, recognition, and motivation programs (10511 L3) | confident L3 |
| 115 | EMP-EXP → PA-WORKFORCE-METRICS | `survey.cycle_closed` (payload engagement_drivers) | Manage employee engagement (10545 L3) , REPLACE existing 10018 (wrong family, marketing surveys) | confident L3 |
| 1281 | ATS → PA-WORKFORCE-METRICS | `interview_scorecard.submitted` | Recruit employees (10539 L3) , interview-scorecard quality is a recruiting metric | confident L3 |

**Intra-domain (lifecycle_progression , APQC tagging optional but proposed):**

| handoff_id | source → target (module → module) | trigger_event | Proposed PCF row | Confidence |
|---|---|---|---|---|
| 1114 | PA-ENGAGEMENT-SURVEYS → PA-WORKFORCE-METRICS | `engagement_survey.closed` | Conduct employee engagement surveys (16944 L3) | confident L3 |
| 1115 | PA-WORKFORCE-METRICS → PA-DEI-ANALYTICS | `people_kpi.snapshot_published` | Manage workforce metrics (10544 L3) | confident L3 |
| 1116 | PA-WORKFORCE-METRICS → PA-PREDICTIVE-MODELS | `workforce_segment.composition_changed` | Manage workforce metrics (10544 L3) | confident L3 |
| 1117 | PA-PREDICTIVE-MODELS → PA-WORKFORCE-METRICS | `attrition_forecast.published` | Manage workforce metrics (10544 L3) | confident L3 |

### Bucket 2, Surface-for-user (judgment calls)

1. **B2-S1: Is PA-DEI-ANALYTICS (module 84) intended to master ZERO data_objects, or is the master missing?** Module 84 has only consumer + derived DMDO rows and 1 capability (DEI-ANALYTICS). The Visier / Trusaic / Syndio / Diversio market builds around a `pay_equity_analyses` or `dei_cohorts` or `representation_snapshots` master. Options: (a) ADD a `pay_equity_analyses` master to module 84 (loads from B-band fix-loop); (b) ADD a `dei_cohorts` master (closer to representation analytics); (c) confirm DEI-Analytics is intentionally a derived-only landing module (consumes `workforce_segments` from 81 + `compensation_plans` from external and produces only views , no new entities) and document the design. Recommend (a) or (b) since real vendors do master pay-equity analyses as first-class entities with their own lifecycle (drafted, computed, reviewed, remediated). Independent of Bucket 3.

2. **B2-S2: B1-S9 attribution defect resolution (events 10 + 11 use non-PA-mastered data_objects).** Three sub-questions for the user: (a) REPLACE handoff rows 449/450/13/451 to use PA-mastered events (1221 / 397) and retire events 10 + 11, OR PATCH events 10 + 11's data_object_id to point to PA-mastered rows. (b) If retiring, do events 10 + 11 have other publishers we shouldn't break? (c) Why were they originally authored against non-PA-mastered objects? Possibly a pre-modular load that pre-dates the master-event-publisher rule. Independent.

3. **B2-S3: B1-S10 pattern flags re-evaluation , confirm the proposed flag changes.** The audit proposes flipping `engagement_surveys.has_personal_content=true, has_submit_lock=true`; `predictive_models.has_single_approver=true, has_personal_content=true`; `attrition_forecasts.has_personal_content=true`. These flags drive downstream materializer behavior (RBAC, audit-trail emission). Confirm or modify per row. Independent.

4. **B2-S4: How aggressive on the engagement-survey scope ambiguity? PA-ENGAGEMENT-SURVEYS (module 82) vs EMP-EXP , duplicate or distinct?** EMP-EXP owns `survey_responses` (182) and `engagement_drivers` (183) and publishes `survey.cycle_closed`, `survey_response.received`, `action_plan.completed` INTO PA. PA-ENGAGEMENT-SURVEYS (module 82) ALSO masters `engagement_surveys` (45) and publishes `engagement_survey.closed` + `engagement_survey.launched` + `engagement.declining`. Vendors: Culture Amp / Lattice / Peakon are typically classified under EMP-EXP not PA. Options: (a) keep both, with clear scope boundary (EMP-EXP runs the survey, PA scores / aggregates / serves dashboards); (b) MOVE `engagement_surveys` master to EMP-EXP and demote PA module 82 to consumer/derived only; (c) MERGE modules , PA-ENGAGEMENT-SURVEYS becomes part of EMP-EXP. (a) is the current state , confirm intent. Depends on whether B3-C2 surfaces "people-listening" as a distinct domain. Cross-bucket dependency.

5. **B2-S5: PA module 81 carries 4 cross-domain consumer/derived rows on data_objects that have no associated handoff INTO PA: `saas_usage_metrics` (64, IT-ASSET-MGMT-mastered), `customers` (97, CRM-mastered), `call_recordings` (122, CCaaS-mastered).** Why is PA consuming these? Defensible cases: (a) workforce productivity correlation analytics (SaaS-usage vs attrition); (b) contact-centre rep performance metrics (call_recordings → engagement / attrition); (c) revenue-per-employee KPIs (customers count → people_kpis). Or they may be SCOPE-CREEP from a prior multi-source ingest design that never landed. Decide: keep with notes for the audit trail OR drop the DMDO rows. Independent.

6. **B2-S6: PA inbound `data_object_relationships` row 832 , `customers feeds people_kpis` (owner_side=target).** Was this intended? It says customers are an input to people_kpis (revenue-per-employee, customer-per-headcount). Likely valid in a "people performance vs customer outcomes" context but worth surfacing because CRM is not a neighbor in any normal HR-analytics blueprint. Independent.

7. **B2-S7: Domain naming , should we surface "PA" as "People Analytics" only, or is it actually two markets (Workforce Analytics + People Listening)?** Visier and OneModel position as broad "people analytics platforms". Culture Amp / Glint / Peakon / Lattice position as "employee listening platforms". The two converge in product but ship as distinct buyer profiles (HRBP / People Ops vs People Analytics teams). Options: (a) keep PA as the unified market (the current state); (b) PROMOTE People Listening as a distinct domain (PL or EMP-LISTENING) with `engagement_surveys` as its master, leaving PA = pure analytics (KPIs + attrition + DEI + ML). This couples with B2-S4. Cross-bucket dependency with B3 (depends on whether vendor research vets the People Listening / Employee Listening sub-market as Phase-0-confirmed).

### Bucket 3, Phase 0 pending (speculative)

1. **B3-C1: `pay_equity_analyses` master.** Surfaced by Trusaic / Syndio / Diversio / Visier pay-equity dashboard. EU Pay Transparency Directive Article 9 makes pay-equity gap reporting mandatory for orgs ≥100. Vendor knowledge basis: Trusaic / Syndio flagship products. Likely home: PA-DEI-ANALYTICS (resolves B2-S1 option a). Phase 0 path: confirm against Trusaic, Syndio, Visier Pay-Equity, Aequitas docs to verify the entity shape.

2. **B3-C2: `dei_cohorts` master (representation snapshots).** Surfaced by Diversio + Visier DEI. EU AI Act Annex III + EEO-1 reporting need representation-by-demographics first-class. Vendor knowledge basis: Diversio, Visier DEI, ChartHop. Possible home: PA-DEI-ANALYTICS (alt to B3-C1). Phase 0 path: confirm Diversio + Visier DEI entity shapes; reconcile against existing `workforce_segments` (44) to decide whether DEI cohorts are a slice of workforce_segments or a distinct master.

3. **B3-C3: `attrition_risk_assessments` master (per-employee score, distinct from segment-level `attrition_forecasts`).** Currently PA publishes `attrition_risk.high` (event 10) on data_object_id=31 employees, which is HCM-mastered (B1-S9 attribution defect). A first-class `attrition_risk_assessments` master on PA-PREDICTIVE-MODELS would fix the publisher attribution and surface per-employee scoring as a queryable entity. Vendor knowledge basis: Visier Flight Risk, Workday People Analytics flight risk, Eightfold retention. Phase 0 path: confirm shape across Visier + Workday + Eightfold.

4. **B3-C4: `dashboards` master (visualization layer).** Visier / ChartHop / OneModel / Workday Discovery all master a dashboard entity (with widgets, filters, owners, audience). It's a CRUD master with a lifecycle (draft, published, archived). Not currently in PA. Phase 0 path: confirm shape vs ChartHop / Visier / Tableau-for-HR.

5. **B3-C5: `data_quality_audits` master.** A core people-analytics workflow is data quality monitoring (gap analysis, source reconciliation between HRIS / payroll / talent systems). Visier and OneModel flagship "Data Reconciliation Reports". Phase 0 path: confirm against Visier Data Hub, OneModel pipelines.

6. **B3-C6: `benchmark_datasets` master (industry benchmarks).** Visier Benchmarks, Mercer, Gartner-source comparators. PA layers in industry benchmarks for context on internal KPIs. Phase 0 path: confirm Visier Benchmarks and Mercer integration shape.

7. **B3-C7: `employee_listening_cycles` master.** If People Listening is split from PA (B2-S7 / B3-C-DOMAIN), this becomes the master in the People-Listening domain. If PA absorbs it, becomes a master on PA-ENGAGEMENT-SURVEYS (alongside `engagement_surveys`). Vendor knowledge basis: Culture Amp Cycle, Lattice Engagement Cycle.

8. **B3-C8: Talent Intelligence Platform , separate domain candidate.** Eightfold AI, Phenom, Beamery, SeekOut, Plum. Vendors operate a distinct buyer profile from People Analytics (talent acquisition + internal mobility + skills graph) and have flagship products. The audit queues this as a candidate via `append_missing_domain.ts` (entry below). Phase 0 path: confirm Eightfold + Phenom + Beamery scope, then decide promote-as-domain vs fold-into ATS / SKILLS-MGMT.

9. **B3-C9: People Listening / Employee Listening , separate domain candidate** (linked to B2-S4, B2-S7). Culture Amp, Lattice, Glint, Peakon, Qualtrics EmployeeXM. Surveys as the core, plus action plans + manager nudges. The audit queues this as a candidate (entry below). Phase 0 path: confirm Culture Amp / Glint / Peakon scope, then decide promote vs fold into PA-ENGAGEMENT-SURVEYS or EMP-EXP.

### Cross-bucket dependencies

- **B2-S1 ↔ B3-C1 / B3-C2:** the decision on DEI module 84's master shape (Bucket 2) depends on which DEI entity Phase 0 research vets (Bucket 3). Recommend resolving B2-S1 only after Bucket 3 is run on B3-C1 + B3-C2 (or eyeballed).
- **B2-S4 ↔ B2-S7 ↔ B3-C9:** the engagement-survey scope (B2-S4), the PA domain-naming question (B2-S7), and the People Listening domain candidate (B3-C9) are tightly coupled. Recommend resolving as a single discussion thread.
- **B1-S9 (B1) ↔ B2-S2 (B2):** the trigger_events 10 + 11 attribution defect (Bucket 1) cannot be silently fixed because the resolution depends on user judgment (Bucket 2). B1-S9 is parked until B2-S2 lands.
- **B1-S3 / B1-S4 / B1-S5 ↔ B1-S1:** the F-band / E-band / permissions cluster depends on B1-S1 (lifecycle states) because workflow-gate permissions derive from lifecycle states. Recommend B1-S1 lands first; the rest cascades.

### Per-bucket prompts

- **After Bucket 1:** Fix these now? Reply with the IDs to apply (all, just B1-S1 + B1-S2 + B1-S3, etc.) or skip. Recommended starting order: B1-S2 (5-row PATCH, fastest); B1-S1 (lifecycle states draft, blocks B1-S3 / B1-S4 / B1-S5); B1-S3 → B1-S4 → B1-S5 (chain); B1-S6 / B1-S7 / B1-S8 (parallel); B1-S10 (after B2-S3 confirms flags); B1-B1 (10-row PATCH); B1-H1 (30-row APQC inserts).
- **After Bucket 2:** What's your call on each of the 7 items? I'll wait for your decision per item before acting. B2-S1, S2, S5, S6 are independent. B2-S3 only blocks B1-S10. B2-S4, S7 couple with Bucket 3 , flag whether to defer.
- **After Bucket 3:** Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates (B3-C1 through B3-C9) to treat as confirmed Bucket-1 items. B3-C8 and B3-C9 are already queued in `audits/_missing-domains.md` for triage as candidate domains.

### Report-only follow-ups (owed by other domains)

These items the audit surfaced where the symmetric fix lives on another domain. PA does NOT author these; the user can schedule the source domains' b1 audits to pick them up. Per Rule #10, NONE of these block PA's green status.

- **HCM B9 owes outbound on `employment_events` (id 36) → PA**: handoff 21 already exists with both FKs populated (source 54 → target 81), so this is actually covered.
- **HCM B10b owes target_domain_module_id PATCH on outbound to PA**: outbound row 1103 (HCM publishes people_kpi.snapshot_published TO PA, currently target_domain_module_id=54 wait that's the SOURCE , actually row 1103 has source=HCM and target=PA's WORKFORCE-METRICS module 54... re-read: source_domain_module_id=81 source_domain=PA. So this is PA outbound TO HCM, with target_domain_module_id=54. HCM's B10b should verify 54 is the right HCM target module). For row 1111 PA-PREDICTIVE-MODELS → HCM, target_domain_module_id is NULL. **HCM B10b owes target FK patch on 1111, 1110 (TALENT-MGMT), 1113 (TALENT-MGMT), 1108 (TALENT-MGMT), 451 (HCM), 450 (TALENT-MGMT), 1104 (EPM), 1105 (COMP-MGMT), 1107 (EMP-EXP).** Total 9 target-NULLs on PA-outbound rows owed by the target domains.
- **EMP-EXP B8 owes outbound `data_object_relationships` rows** (engagement_drivers → people_kpis or similar) , currently only edge 161 exists (engagement_drivers feeds people_kpis with owner_side=source pointing at engagement_drivers, which means EMP-EXP authored it , actually fine). Schedule EMP-EXP b1 to verify B8 coverage.
- **PAYROLL B8 owes outbound `data_object_relationships`** for `pay_runs feeds people_kpis` (currently no such edge in the DB; should be authored on PAYROLL side). Same for `pay_slips feeds people_kpis`.
- **PSA B8 owes outbound `data_object_relationships`** for `project_assignments feeds people_kpis` (utilization KPI). No such edge.
- **COMP-MGMT B8 owes outbound `data_object_relationships`** for `compensation_statements feeds people_kpis`. No such edge.
- **ATS B8 owes outbound `data_object_relationships`** for `recruitment_sources feeds people_kpis` and `interview_scorecards feeds people_kpis`. Edge for interview_scorecards → people_kpis does not exist; the closest is row 832 `customers feeds people_kpis` which is a different concept.
- **TALENT-MGMT** receives 4 outbound handoffs from PA (1108, 1110, 1113, 450) with NULL target_domain_module_id and presumably no `domain_module_data_objects` consumer row declaring the dependency. TALENT-MGMT b1's B10b + B8-reverse will surface this.
- **Pairwise reconciliation** with HCM, TALENT-MGMT, EMP-EXP, COMP-MGMT, ATS recommended after both sides' B-band work lands. None of these are blockers for PA's green status; they are scheduling hints.

**Candidates queued to `audits/_missing-domains.md`:**

1. TALENT-INTEL-PLATFORM (Talent Intelligence Platform) , surfaced by PA audit 2026-05-30, evidence Eightfold AI / Phenom / Beamery / SeekOut, adjacency PA / ATS / TALENT-MGMT / SWP / SKILLS-MGMT, capabilities talent-rediscovery / internal-mobility matching / skills-graph inference / career-pathway recommendation.
2. EMP-LISTENING (Employee Listening Platform) , surfaced by PA audit 2026-05-30, evidence Culture Amp / Lattice Engagement / Glint / Peakon / Qualtrics EmployeeXM, adjacency PA / EMP-EXP / HCM / TALENT-MGMT, capabilities pulse-survey-design / engagement-driver-modeling / manager-action-planning / employee-NPS.

### Pairwise reconciliation (deferred, scheduling only)

This audit's neighbor discovery surfaces 6 neighbors at edge weight ≥3 (TALENT-MGMT, HCM, EMP-EXP, SWP, ATS, COMP-MGMT, PAYROLL). Full pairwise four-leg reconciliation per SKILL.md § "Pairwise handoff reconciliation" is recommended but NOT executed in this audit because:

- The F-band / E-band on PA is unfinished (B1-S3 / B1-S4), and pairwise needs both sides to have at least baseline structural completeness to be useful.
- Most boundary findings are already captured in B1-B1, B1-H1, and the report-only section.
- Pairwise reconciliation per SKILL.md is "targeted, never routine" , recommend invoking after B1-S1 / B1-S3 / B1-S4 land.

Light-touch summary of the deferred pairs:

| Neighbor | Direction | Status | Recommendation |
|---|---|---|---|
| PA ↔ HCM | mostly handled by HCM's own audit 2026-05-30 (see audits/HCM.md) | B10b NULL target on row 1111 owed by HCM; PA inbound 21 employment_event.recorded is covered | reconcile after PA B1-S3 lands |
| PA ↔ TALENT-MGMT | 4 outbound from PA all target_domain_module_id=NULL; no inbound | TALENT-MGMT b1 owes the target-FK patches + consumer DMDO rows on attrition_forecasts / workforce_segments / engagement_surveys / predictive_models | schedule TALENT-MGMT b1 |
| PA ↔ EMP-EXP | 3 inbound from EMP-EXP all target_domain_module_id=NULL on PA side (handled in B1-B1); 1 outbound from PA already wired | reconcile after B1-B1 + B2-S4 lands | schedule EMP-EXP b1 |
| PA ↔ SWP | 2 outbound from PA both fully wired; 0 inbound | clean | none |
| PA ↔ ATS | 1 outbound from PA fully wired (1112 to SWP, scratch , actually 453 to ATS fully wired); 3 inbound from ATS (23, 403, 1281), 2 of 3 carry NULL target_domain_module_id (handled in B1-B1) | reconcile after B1-B1 lands | schedule ATS b1 already exists at audits/ATS.md |
| PA ↔ COMP-MGMT | 1 outbound from PA (1105) NULL target FK owed by COMP-MGMT; 2 inbound (107, 422 wait 422 not in this audit) , 107 NULL target FK on PA side handled in B1-B1 | reconcile after B1-B1 lands | schedule COMP-MGMT b1 |
| PA ↔ PAYROLL | 0 outbound; 3 inbound all NULL target FK (25, 102, 1155 all in B1-B1) | reconcile after B1-B1 lands | schedule PAYROLL b1 already exists at audits/PAYROLL.md |

## 2026-05-31, Continuation: B1 technical fixes

Applied truly-technical Bucket-1 items only; all judgment items deferred to user.

### Applied (18 rows changed)

- **B1-S2** (5 PATCHes on `trigger_events.event_category`, Rule #13 enum backfill): 397 `attrition_forecast.published` -> `state_change`, 398 `engagement_survey.launched` -> `lifecycle`, 399 `engagement_survey.closed` -> `state_change`, 400 `predictive_model.deployed` -> `state_change`, 401 `predictive_model.scored` -> `signal`. Audit pre-specified the per-id mapping.
- **B1-S6** (5 INSERTs on `data_object_relationships`, Rule #10 user-edges): inserted edges users(748) -> engagement_surveys(45) `launches`, -> attrition_forecasts(42) `publishes`, -> predictive_models(46) `authors`, -> people_kpis(43) `publishes`, -> workforce_segments(44) `authors`. Shape `many_to_many` / `reference` / `owner_side='target'` / `is_required=false`. New row IDs 1595-1599.
- **B1-B1** (8 PATCHes on `handoffs.target_domain_module_id`, B10b derivable from existing PA modules): 25 -> 81, 102 -> 81, 107 -> 81, 115 -> 82, 444 -> 82, 1077 -> 82, 1130 -> 81, 1155 -> 81. The 9th audit-listed row 1281 was already wired to 81 in live state; no-op.

### Deferred (with reason per parent-task defer rules)

- **B1-S1** (lifecycle states on all 5 PA masters): new entity inserts; per-row state machines need user authoring decisions, not pre-specified per row. Blocks B1-S3 / B1-S4 / B1-S5 cascade.
- **B1-S3** (4 module-level system skills + skill_tools rows): new entities; explicit defer rule.
- **B1-S4** (3-5 PA-scoped roles + role_modules + role_permissions): new entities; explicit defer rule.
- **B1-S5** (12+ baseline permissions + workflow-gate permissions): new entities; gated on B1-S1.
- **B1-S7** (4-5 intra-PA `data_object_relationships`): not Rule #10 user-edges; TECHNICAL clause only licenses user-edge inserts pre-specified by the audit. Verb prose only; defer.
- **B1-S8** (aliases): proposal text "draft 2-4 per master" with example alias names but no exact pre-specified tuples (alias_type unspecified, no per-row authoritative list). Bulk inserts not in TECHNICAL scope unless audit pre-specifies exact tuples.
- **B1-S9** (trigger_events 10 + 11 attribution defect): audit explicitly routes to B2-S2 with two user-judgment options; cross-bucket dependency.
- **B1-S10** (pattern flag flips on 3 masters): explicit "pattern flag flips" defer rule; routes to B2-S3.
- **B1-H1** (~30 `handoff_processes` INSERT/REPLACE candidates): TECHNICAL clause requires resolvable PCF. Verified live `processes` table: audit-proposed external_ids 10544, 10545, 10547, 10548, 10550, 10539 do NOT resolve. The 8 that do resolve (10532, 10018, 10175, 16944, 21698, 10773, 10511, 16437) have semantic mismatches with audit prose (e.g. 10532 = "Deliver employee communications" in live catalog, but audit labels it "Manage workforce planning"; 10547/10544 referenced as "Manage talent" / "Manage workforce metrics" but neither external_id exists). All H1 inserts and REPLACEs deferred for user PCF re-resolution.

### Loader

- `c:/dev/domain-map/.tmp_deploy/fix_pa_b1_technical_2026_05_31.ts`
- Run from project root: `bun run "c:/dev/domain-map/.tmp_deploy/fix_pa_b1_technical_2026_05_31.ts"`
- Exit code 0; 18 rows changed, 0 skipped, 0 errors.

### Outcome counts

- TECHNICAL applied: 3 fix types, 18 rows (5 + 5 + 8).
- Deferred: 9 Bucket-1 items (S1, S3, S4, S5, S7, S8, S9, S10, H1) + all Bucket 2 (7) and Bucket 3 (9).
- JWT errors: none.

## 2026-05-31, Audit

Structural Validate b1 audit, post-Continuation. Confirms which 2026-05-30 findings were resolved by the 2026-05-31 technical pass and surfaces what still remains. Live read against `domain_id=eq.63` and `domain_module_id=in.(81,82,83,84)`. No writes.

### Summary

- **Current footprint:** 4 full modules (PA-WORKFORCE-METRICS 81, PA-ENGAGEMENT-SURVEYS 82, PA-PREDICTIVE-MODELS 83, PA-DEI-ANALYTICS 84); 0 starters; 0 cross-host. 5 masters: people_kpis (43, mod 81), workforce_segments (44, mod 81), engagement_surveys (45, mod 82), attrition_forecasts (42, mod 83), predictive_models (46, mod 83). Module 84 still masters ZERO data_objects. 4 capabilities (HR-METRICS 50, ATTRITION-PREDICT 51, DEI-ANALYTICS 52, WORKFORCE-COMP 53). 6 solutions (5 primary, 1 secondary). 3 regulations (EU GDPR, EU Pay Transparency Directive, EU AI Act, all `mandatory`).
- **Bucket 1 (in-scope, agent-fixable):** 7 items (down from 10 last audit, 3 cleared by 2026-05-31 Continuation).
- **Bucket 2 (surface-for-user, judgment):** 7 items (same as last audit, none resolved).
- **Bucket 3 (Phase 0 pending, speculative):** 9 items (same as last audit, none resolved).

### Resolved since 2026-05-30 audit (do NOT carry into state.yaml)

- **B1-S2 (B9 Rule #13 enum backfill)** RESOLVED. All 12 trigger_events on PA masters now carry a valid `event_category`: 397/399/400 `state_change`, 398 `lifecycle`, 401/64/1222/1224 `signal`, 1221/1223 `threshold`, 1219 `lifecycle`, 1220 `state_change`.
- **B1-S6 (B7 users edges)** RESOLVED. 5 user-edge rows now exist (relationships 1595-1599): users -> engagement_surveys `launches`, users -> attrition_forecasts `publishes`, users -> predictive_models `authors`, users -> people_kpis `publishes`, users -> workforce_segments `authors`.
- **B1-B1 (B10b inbound NULL target_domain_module_id)** RESOLVED. All 12 PA-inbound cross-domain handoffs now carry a non-NULL `target_domain_module_id` (mapped to 81 for KPI/workforce flows, 82 for engagement flows). Audit-listed row 1281 was already wired; rows 25, 102, 107, 115, 444, 1077, 1130, 1155 patched.

### Structural bands

- **A1-A3** PASS. Domain row id=63 carries `crud_percentage=60`, `min_org_size='30 m <2500'`, `cost_band='$$'`, `certification_required=false`, `usa_market_size_usd_m=700`, `market_size_source_year=2025`, `business_logic` populated.
- **M1** PASS (4 full modules, ≥1 floor met). **M2** PASS (4 capabilities, 4 modules, ≥2 floor met since cap count ≥3). **M-mod-84 issue** carries to Bucket 2 (B2-S1, master shape).
- **B1** PASS (5 masters, ≥1 floor). **B2** PASS (all 5 masters have singular_label + plural_label). **B3** PASS (no canonical-bare-word collisions; all 5 names prefixed in a domain sense). **B4 partial** (pattern flags on all 5 masters still all-false; B1-S10 flip proposals from 2026-05-30 routed to B2-S3, not yet resolved).
- **B5** N/A (no `embedded_master` rows anywhere on the 4 PA modules).
- **B7** PASS (5 users edges now exist; Rule #10 obligation met for all 5 masters).
- **B9** PASS (event_category enum cleanup applied).
- **B9b** PASS (4 intra-domain `lifecycle_progression` handoffs 1114-1117 exist).
- **B10b** PASS for PA-owned fixes (12 inbound rows non-NULL). Report-only: 5 of 18 PA-outbound rows still carry NULL `target_domain_module_id` (1104, 1105, 1107, 1111, 450) — these are owed by the target domains (EPM 1104, COMP-MGMT 1105, EMP-EXP 1107, HCM 1111, TALENT-MGMT 450), NOT by PA.
- **B11 (aliases)** HARD FAIL. Zero `data_object_aliases` rows on any of the 5 PA masters.
- **B12 (lifecycle states)** HARD FAIL. Zero `data_object_lifecycle_states` rows on any of the 5 PA masters. Workflow-bearing masters (engagement_surveys, predictive_models, attrition_forecasts, people_kpis) all have implied state machines that trigger_events 397/398/399/400/1219 reference but no states have been authored.
- **C1** PASS (People Analytics business function carries owner).
- **D** SKIPPED (agent-only audit, no UI spot-check).
- **E1 (≥3 PA-scoped roles for 4-module domain)** HARD FAIL. Zero `role_modules` rows touching modules 81/82/83/84; zero PA-scoped roles. E2 / E3 / E4 / E5 vacuous (no roles to evaluate).
- **F1 (legacy skill cleanup)** TRANSITIONAL. Legacy `pa-system` skill id=5 with `domain_module_id=NULL` still present; must be DELETED after F2 lands.
- **F2 (1 system skill per module)** HARD FAIL. Zero `skill_type='system'` skills on any of the 4 PA modules; expected 4.
- **F3 (≥1 skill_tools per system skill)** HARD FAIL (transitive from F2).
- **F4 (operation_kind ↔ data_object_id invariants)** VACUOUS (no rows to violate).
- **F5 (Semantius score computable)** UNCOMPUTABLE (rolls up F2 / F3).
- **H1 (catalog permissions)** HARD FAIL. Zero `permissions` rows with `domain_module_id IN (81,82,83,84)`. Rule #14 baseline derivation implies ≥12 baseline rows expected (3 per module: `:read / :manage / :admin`), plus workflow-gate rows once B12 lifecycle states land.

### Rule-#15 pollution check

All `notes` columns on PA masters (data_objects 42/43/44/45/46), PA DMDO rows (29 rows on modules 81/82/83/84), and PA-scoped data_object_relationships rows (1595-1599) checked. All empty. No Rule #15 incident.

### Bucket 1, In-scope confirmed gaps

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | B12 hard fail | Zero `data_object_lifecycle_states` on all 5 PA masters. State machines implied by existing trigger_events: engagement_surveys (draft -> launched -> closing -> closed -> results_published -> archived), attrition_forecasts (draft -> published -> superseded), predictive_models (training -> validated -> deployed -> retired), people_kpis (draft -> snapshot_published -> archived), workforce_segments (draft -> composition_baseline -> composition_changed -> archived). | Draft state rows per master with `requires_permission=true` on gated transitions (engagement_survey.launched, predictive_model.deployed, attrition_forecast.published); set `domain_module_id` to the master's home module. New entity inserts: user authoring required. |
| B1-S3 | F1 / F2 / F3 / F5 cluster | Zero module-level `system` skills on modules 81/82/83/84; legacy `pa-system` skill id=5 still NULL-module. | Author 4 module-level system skills (one per module) with ≥5 `skill_tools` rows each per Phase-S authoring procedure. DELETE legacy id=5 after F2 lands. New entity inserts: user authoring required. |
| B1-S4 | E1 hard fail | Zero PA-scoped roles, zero `role_modules` rows on PA modules. | Author 3-5 PA-scoped roles bundled under People Analytics business function (e.g. PA-ANALYST, PA-LEAD, PA-DATA-SCIENTIST). New entity inserts: user authoring required. |
| B1-S5 | Permissions hard fail (Rule #14) | Zero `permissions` rows with `domain_module_id IN (81,82,83,84)`. | Author baseline permissions (3 per module = 12 rows); author workflow-gate permissions once B1-S1 lifecycle states land. Gated on B1-S1 for workflow-gate slice; baseline slice is unblocked. New entity inserts: user authoring required. |
| B1-S7 | B6 partial fail | Only the 5 user edges (Rule #10) plus 5 derivation feeds (org_units / employment_events / learning_records / engagement_drivers / survey_responses / customers all `feeds people_kpis`) exist among PA-master relationships. Intra-PA master-to-master edges missing: predictive_models scores attrition_forecasts, predictive_models scores workforce_segments, attrition_forecasts segments workforce_segments. | Draft 3-4 intra-PA `data_object_relationships` rows (relationship_verb + inverse_verb + relationship_type + relationship_kind + is_required + owner_side). New entity inserts: user authoring required. |
| B1-S8 | B11 hard fail | Zero `data_object_aliases` on any PA master. Strong vendor-terminology market. | Draft 2-4 aliases per master with `alias_type` per Rule #18 (industry / vendor / regulatory). New entity inserts: user authoring required; exact alias names + types not pre-specified. |
| B1-H1 | APQC TAGGING | 8 existing `handoff_processes` rows all `discovery_substring` / `record_status='new'`, 0 `agent_curated`, 0 `approved`. 30+ candidate tags identified in 2026-05-30 audit. Continuation flagged that audit-proposed external_ids (10544, 10545, 10547, 10548, 10550, 10539) DO NOT resolve in the live `processes` table. | Re-resolve audit-proposed PCF activities against live `/processes?source_framework=eq.apqc_pcf_cross_industry` before any INSERT. Bulk-insert path requires verified IDs. |

### Bucket 2, Surface-for-user (judgment calls)

1. **B2-S1: Module 84 (PA-DEI-ANALYTICS) masters ZERO data_objects.** Carryover from 2026-05-30. Options: (a) ADD a `pay_equity_analyses` master, (b) ADD a `dei_cohorts` master, (c) confirm derived-only design. Independent unless Bucket 3 vendor research vets one of B3-C1 / B3-C2.
2. **B2-S2: Trigger_events 10 + 11 attribution defect.** Carryover. Events 10 (`attrition_risk.high`, data_object_id=31 employees, HCM-mastered) and 11 (`attrition.forecast_updated`, data_object_id=23 workforce_plans, SWP-mastered) are used by PA-published handoffs 449/450/13/451. Options: (a) REPLACE handoffs to use PA-mastered events (1221 / 397), (b) PATCH events to point to PA-mastered data_objects. Cross-bucket: choice affects rows beyond PA.
3. **B2-S3: Pattern flag re-evaluation.** Carryover. Proposed flips: engagement_surveys.has_personal_content=true + has_submit_lock=true; predictive_models.has_single_approver=true + has_personal_content=true; attrition_forecasts.has_personal_content=true. Confirm or modify per row.
4. **B2-S4: PA-ENGAGEMENT-SURVEYS vs EMP-EXP scope ambiguity.** Carryover. Couples with B2-S7 and B3-C9.
5. **B2-S5: PA module 81 consumes cross-domain data_objects with no inbound handoff** (saas_usage_metrics 64 via DMDO not currently present in live read — re-verify; original audit cited customers 97 and call_recordings 122 with no inbound). Live read shows module 81 carries `customers` as related via row 832 only (data_object_relationships), not DMDO. Re-evaluate: is the customers feed scoped correctly?
6. **B2-S6: data_object_relationships row 832 (`customers feeds people_kpis`, owner_side=target).** Carryover. CRM input into people_kpis defensible for revenue-per-employee KPIs but worth confirming.
7. **B2-S7: PA naming / market split (People Analytics vs People Listening).** Carryover. Cross-bucket dependency with B3-C9.

### Bucket 3, Phase 0 pending (speculative)

1. **B3-C1: `pay_equity_analyses` master** — Trusaic / Syndio / Visier Pay-Equity; EU Pay Transparency Directive Article 9.
2. **B3-C2: `dei_cohorts` master** — Diversio / Visier DEI / ChartHop; EU AI Act Annex III + EEO-1.
3. **B3-C3: `attrition_risk_assessments` master** — Visier Flight Risk / Workday flight risk / Eightfold retention. Resolves B2-S2 attribution defect by giving event 10 a PA-mastered publisher.
4. **B3-C4: `dashboards` master** — Visier / ChartHop / OneModel / Workday Discovery.
5. **B3-C5: `data_quality_audits` master** — Visier Data Hub / OneModel pipelines.
6. **B3-C6: `benchmark_datasets` master** — Visier Benchmarks / Mercer comparators.
7. **B3-C7: `employee_listening_cycles` master** — Culture Amp Cycle / Lattice Engagement Cycle. Routes to PA-ENGAGEMENT-SURVEYS or to a split People-Listening domain.
8. **B3-C8: Talent Intelligence Platform domain candidate** — Eightfold / Phenom / Beamery / SeekOut / Plum. Already queued in `_missing-domains.md`.
9. **B3-C9: People Listening / Employee Listening domain candidate** — Culture Amp / Lattice / Glint / Peakon / Qualtrics EmployeeXM. Already queued in `_missing-domains.md`.

### Cross-bucket dependencies

- **B1-S5 depends on B1-S1** for the workflow-gate permission slice (baseline slice is unblocked).
- **B1-S3 / B1-S4 reference B1-S1** (system skills' mutate tools and roles' workflow-gate permissions both reference lifecycle states).
- **B1-H1 blocked** by PCF external_id re-resolution before any insert.
- **B2-S1 ↔ B3-C1 / B3-C2** still coupled.
- **B2-S4 ↔ B2-S7 ↔ B3-C9** still coupled.

### Report-only follow-ups (owed by other domains)

- **5 PA-outbound handoffs with NULL `target_domain_module_id`** still owed by target domains: 1104 (EPM), 1105 (COMP-MGMT), 1107 (EMP-EXP), 1111 (HCM), 450 (TALENT-MGMT). NOT a PA blocker.
- **B8 outbound relationships** owed by source domains for `pay_runs feeds people_kpis` (PAYROLL), `pay_slips feeds people_kpis` (PAYROLL), `project_assignments feeds people_kpis` (PSA), `compensation_statements feeds people_kpis` (COMP-MGMT), `recruitment_sources feeds people_kpis` (ATS), `interview_scorecards feeds people_kpis` (ATS). NOT a PA blocker.

### JWT errors

None.
