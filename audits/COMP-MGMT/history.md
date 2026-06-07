# COMP-MGMT audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 4 full modules (`COMP-PLANNING` 78, `COMP-INCENTIVES` 79, `COMP-BENCHMARKING` 80, `COMP-STATEMENTS` 85). No starters. No cross-host. 7 masters: `compensation_plans` (153, COMP-PLANNING), `salary_bands` (154, COMP-BENCHMARKING), `merit_cycles` (155, COMP-PLANNING), `merit_recommendations` (156, COMP-PLANNING), `compensation_statements` (157, COMP-STATEMENTS), `equity_grants` (158, COMP-INCENTIVES), `compensation_benchmarks` (159, COMP-BENCHMARKING). 1 contributor (`earning_codes` 140 on COMP-PLANNING), 2 consumers (`performance_reviews` 174, `financial_plans` 37 on COMP-PLANNING; `job_offers` 11 on COMP-STATEMENTS), and 5 embedded_master slices reused per module (`employees` 31, `hcm_positions` 32, `job_profiles` 33, `org_units` 34, `cost_centers` 196, `locations` 795). Cross-module contributors include `compensation_plans` and `merit_recommendations` (both on COMP-STATEMENTS) and `equity_grants` (consumer on COMP-STATEMENTS). 5 capabilities (`COMP-PLANNING`, `PAY-EQUITY`, `INCENTIVE-MGMT`, `COMP-BENCHMARK`, `EQUITY-MGMT`); 6 `domain_module_capabilities` rows tied to the 4 modules (COMP-PLANNING module realizes only the planning capability; the PAY-EQUITY capability realizes only on COMP-BENCHMARKING). 10 `solution_domains` rows (8 primary, 2 secondary) covering Workday, Payscale, beqom (3 duplicate solution rows: ids 259 "beqom", 414 "beqom Pay", 497 "Beqom Compensation"), Pave, Carta Total Comp, SAP SuccessFactors Compensation, Aon Radford, Sequoia One. 2 regulations (ERISA mandatory, EU Pay Transparency Directive mandatory). 19 trigger_events on the 7 masters. 17 outbound cross-domain handoffs (to PAYROLL x5, HCM x3, ATS x2, ERP-FIN x2, PA, TALENT-MGMT, EMP-EXP, HRSD, SWP), 12 inbound cross-domain handoffs (HCM x5, ATS x3, TALENT-MGMT x2, SWP, PA), 5 intra-domain `lifecycle_progression` rows (1142-1145, 1150). 25 lifecycle states across the 7 masters with 18 `requires_permission=true` gates. **0 permissions on any COMP-MGMT module** (F-band hard fail). **0 roles linked to COMP-MGMT modules** (E-band hard fail). **1 legacy domain-level system skill** (skill_id 38 `comp-mgmt-system`, `domain_id=60`, `domain_module_id=null`) with 9 `skill_tools` rows; no module-level system skills (F2 hard fail per Rule #17). **0 data_object_aliases** across the 7 masters. 3 business_function_domains (owner: Compensation; contributors: Finance, FP&A). 4 of 29 cross-domain handoffs APQC-tagged (4/29 = 14%); all `discovery_*`, zero `agent_curated`, zero `approved`.

- **Vendor-surface basis (Pass 2 flagship enumeration):** Workday Compensation, SAP SuccessFactors Compensation, Oracle HCM Compensation Workbench, UKG Pro Compensation, Pave, beqom, Payfactors / Payscale Marketpay, HRSoft CompXL, CompTool, Mercer Comptryx, Aeqium, Assemble, OpenComp. Equity / cap-table adjacent: Carta Total Comp, Shareworks (Morgan Stanley at Work), Pulley. Pay-equity specialists: Trusaic, Syndio, Salary.com Pay Equity Suite. The COMP-MGMT current solution list covers planning (Workday, SuccessFactors, beqom, Pave), benchmarking (Payscale, Aon Radford), and equity (Carta), but is missing: HRSoft, OpenComp, Pulley, Shareworks, and pay-equity specialists Trusaic / Syndio.

- **Bucket 1 (in-scope, agent fixable):** 9 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 6 items.

**Neighbor discovery** (ranked by edge weight = outbound + inbound; DMDO touch noted separately):

| Neighbor | Out | In | DMDO touch | Weight | Pass shape |
|---|---|---|---|---|---|
| HCM | 3 (compensation_plan.published → employees, merit_cycle.approved → merit_recommendations on HCM, merit_cycle.approved → employees) | 5 (employee.created, employee.promoted, employment_contract.executed → COMP-PLANNING; hcm_position.approved_for_creation, job_profile.published) | employees, hcm_positions, job_profiles, org_units, cost_centers (embedded_master on multiple COMP-MGMT modules) | 8 | Pairwise (full) |
| PAYROLL | 5 (merit_cycle.approved → merit_recommendations, merit_cycle.approved → pay_slips, equity_grant.vested → equity_grants, compensation_plan.published → compensation_plans, earning_code.created → earning_codes) | 0 | none | 5 | Pairwise (full) |
| ATS | 2 (salary_band.updated → salary_bands, compensation_benchmark.refreshed → compensation_benchmarks) | 3 (job_offer.signed → compensation_statements, job_offer.signed → job_offers, job_offer.rescinded → compensation_statements) | job_offers consumer on COMP-STATEMENTS | 5 | Pairwise (full) |
| TALENT-MGMT | 1 (merit_cycle.closed → merit_cycles) | 2 (calibration.complete → performance_reviews, nine_box_placement.updated → nine_box_placements) | performance_reviews consumer on COMP-PLANNING | 3 | Pairwise (full) |
| PA | 1 (merit_cycle.closed → compensation_statements) | 1 (pay_equity.gap_detected → workforce_segments) | none | 2 | Lightweight |
| SWP | 1 (compensation_benchmark.refreshed → compensation_benchmarks) | 1 (labor_market_benchmark.refreshed → labor_market_benchmarks) | none | 2 | Lightweight |
| ERP-FIN | 2 (equity_grant.granted → equity_grants, earning_code.created → earning_codes) | 0 | financial_plans consumer on COMP-PLANNING | 2 | Lightweight |
| EMP-EXP | 1 (compensation_statement.issued → compensation_statements) | 0 | none | 1 | Lightweight |
| HRSD | 1 (compensation_statement.issued → compensation_statements) | 0 | compensation_statements declared consumer on HRSD-CASE-MGMT | 1 | Lightweight |

**Structural pass bands:**

- **A1 pass:** all 7 metadata fields populated on `domains` row 60.
- **A2 pass:** 5 capabilities (within the 5-8 typical band).
- **A3 partial-fail:** 10 solutions linked but 3 (ids 259, 414, 497) are duplicate beqom entries with mild casing/name variation; 1 secondary (Sequoia One id 502) is a benefits broker rather than a comp-planning platform and likely SCOPE-CREEP. Aon Radford eReward (id 498) is a benchmarking data source, secondary placement is correct.
- **M1 pass:** 4 full modules (well over the floor).
- **M2 pass:** 5 capabilities, 4 modules (well over the ≥2 floor for ≥3-capability domains).
- **M4 partial-fail:** capability `COMP-PLANNING` realizes on COMP-PLANNING (78) AND COMP-STATEMENTS (85); capability `PAY-EQUITY` realizes only on COMP-BENCHMARKING (80) but pay-equity analysis is intrinsic to compensation planning too and should also realize on COMP-PLANNING (78) (judgment).
- **M5 pass:** every `requires_permission=true` lifecycle state carries a `domain_module_id`.
- **M6 pass:** every module realizes ≥1 capability.
- **M7 HARD FAIL (catalog-wide single-master):** `equity_grants` (id 158) is mastered TWICE: COMP-INCENTIVES module 79 (COMP-MGMT domain) AND CAP-TABLE-GRANTS module 21 (CAP-TABLE domain 162). The blueprint emitter cannot pick a canonical owner. The cleanest resolution: CAP-TABLE-GRANTS (the equity-administration market for the cap-table layer: cap-table tracking, 409A valuations, employee equity portals) is the canonical master for `equity_grants`; COMP-INCENTIVES should demote to `embedded_master` (its master role exists for standalone deployments where the comp module is the only place equity grants live). Surface for user.
- **B1 pass:** 7 masters (well over the floor).
- **B2 pass:** every master has singular_label and plural_label.
- **B3 pass:** no bare-word masters in this domain (all prefixed `compensation_*`, `merit_*`, `salary_*`, `equity_*`; `compensation_benchmarks` competes with the generic noun but is prefixed enough to be safe).
- **B4 considered:** pattern flags populated coherently (`merit_recommendations` and `compensation_statements` carry `has_personal_content=true` for individual pay data; `merit_recommendations` and `equity_grants` carry `has_single_approver=true`; submit_lock set on `merit_recommendations` and `employment_contracts` consumer). `compensation_plans` and `salary_bands` carry no personal content flag (config-shaped, correct). Possible gap: `compensation_benchmarks` has no flags (vendor-bought datasets, plausibly config-shaped, correct).
- **B5 pass:** every embedded_master row has a canonical master elsewhere (employees, hcm_positions, job_profiles, org_units, cost_centers, locations canonical masters exist in HCM / IWMS).
- **B6 partial-fail:** several COMP-MGMT masters have NO intra-domain `data_object_relationships`. Specifically: `compensation_plans` (153) has zero in-domain edges to other COMP-MGMT masters; `merit_cycles` (155) has zero in-domain edges; `merit_recommendations` (156) has zero in-domain edges; `compensation_benchmarks` (159) has zero in-domain edges. The only edges within COMP-MGMT are `salary_bands → job_profiles` (43, cross-domain to HCM), `salary_bands → hcm_positions` (42, cross-domain to HCM), `equity_grants → vesting_schedules` (863, intra-cluster). The natural intra-domain edges are missing (e.g. `merit_cycles contains merit_recommendations`, `compensation_plans seeds merit_cycles`, `compensation_statements composes merit_recommendations / equity_grants`).
- **B7 HARD FAIL:** **0 `users` edges across all 7 COMP-MGMT masters**. Rule #10 requires every master with a user-typed actor to have ≥1 edge to `users` (id 748). Every COMP-MGMT master has user-typed actors (compensation_plans owner / approver, merit_cycles owner / approver, merit_recommendations submitter (manager) / approver, compensation_statements recipient (employee), equity_grants grantee (employee) / approver, salary_bands owner). Expected edges: `users (approves) compensation_plans`, `users (owns) merit_cycles`, `users (submits) merit_recommendations`, `users (approves) merit_recommendations`, `users (receives) compensation_statements`, `users (grants) equity_grants`, `users (receives) equity_grants`, `users (maintains) salary_bands`, `users (maintains) compensation_benchmarks`.
- **B8 partial-fail (outbound):** several outbound cross-domain handoffs lack mirror `data_object_relationships` edges (e.g. `merit_recommendations → employees` mirroring handoff 106; `equity_grants → employees` mirroring handoff 423 vested; `compensation_statements → employees` mirroring 1136). The two existing cross-domain edges (`employees becomes compensation_statements` 41, `job_offers seeds compensation_statements` 829) are inbound, not outbound, so they're owned by HCM and ATS B8 passes per the asymmetry rule.
- **B9 partial-fail (event_category):** 12 of 19 trigger_events on COMP-MGMT masters carry empty `event_category` (Rule #13 must be one of `lifecycle / state_change / threshold / signal`). The 12: 423 `compensation_plan.published`, 424 `salary_band.updated`, 425 `compensation_statement.issued`, 426 `equity_grant.granted`, 427 `equity_grant.vested`, 428 `compensation_benchmark.refreshed`, plus pre-existing rows where the `state_change` patch is missing on the older Phase A events. Conventional cuts: all `*.published`, `*.updated`, `*.issued`, `*.granted`, `*.vested`, `*.refreshed` events read as `state_change` on the publishing master (events fire when the master row changes state, even when the wider business semantics are lifecycle-shaped).
- **B9b pass:** 5 intra-domain `lifecycle_progression` handoffs already loaded (1142, 1143, 1144, 1145, 1150), modeled correctly for a 4-module domain. Pattern: COMP-PLANNING → COMP-STATEMENTS on cycle approval / close; COMP-BENCHMARKING → COMP-PLANNING on benchmark refresh / salary band update; COMP-INCENTIVES → COMP-STATEMENTS on grant issued.
- **B10b (in-scope) partial-fail:** 5 of 17 outbound cross-domain handoffs carry NULL `target_domain_module_id` where COMP-MGMT can resolve from the inbound DMDO map. The 5: handoff 105 (target = PAYROLL, payload `merit_recommendations`), 107 (PA, payload `compensation_statements`), 422 (HCM, payload `merit_recommendations`), 423 (PAYROLL, payload `equity_grants`), 424 (ERP-FIN, payload `equity_grants`), 1125 (HCM, payload `compensation_plans`), 1126 (PAYROLL, payload `compensation_plans`), 1141 (ERP-FIN, payload `earning_codes`). Recount: 8 rows. Some target modules are unresolvable from COMP-MGMT alone (the PAYROLL / HCM / ERP-FIN side owns the consumer DMDO decision); those route to B1-S3 report-only.
- **B10b report-only (NULL source on inbound):** all 12 inbound rows carry source_domain_module_id populated; no source-side NULLs to surface.
- **B11 HARD FAIL:** 0 `data_object_aliases` rows across all 7 COMP-MGMT masters. Aliases expected: `compensation_plans → comp_plans`, `merit_cycles → comp_cycles / planning_cycles`, `merit_recommendations → comp_recommendations / pay_increases`, `compensation_statements → total_rewards_statements / trs`, `equity_grants → stock_grants / rsu_grants / option_grants`, `salary_bands → pay_bands / grade_bands`, `compensation_benchmarks → market_benchmarks / comp_market_data`.
- **B12 pass:** lifecycle states authored on all 6 workflow-bearing masters (compensation_plans 3, merit_cycles 6, merit_recommendations 5, compensation_statements 4, equity_grants 7, salary_bands has none but is plausibly config-shape exempt, see B2-S5). `compensation_benchmarks` has no states (config-shape, externally sourced dataset).
- **C1 pass:** 3 business_function_domains (owner Compensation, contributors FP&A and Finance).
- **D1 pass (informational):** APQC coverage runs in H1 below.
- **E1-E6 HARD FAIL:** 0 permissions on any COMP-MGMT module (78, 79, 80, 85). Rule #14 requires baseline permissions (`<module>:read`, `:manage`, `:admin`) per module; Rule #12 requires workflow-gate permissions for each `requires_permission=true` lifecycle state. Expected count: 12 baseline (3 per module x 4 modules) plus 18 workflow-gate (one per `requires_permission=true` lifecycle state). 0 `roles` rows linked to any COMP-MGMT module via `role_modules`. The HR cluster carries roles for Compensation (e.g. HR-COMPENSATION-ANALYST, HR-COMPENSATION-MANAGER) but they have not been authored / linked to these modules. Without permissions + roles, the modules cannot be deployed.
- **F1-F5 HARD FAIL:** 0 `skill_type='system'` skills with `domain_module_id` set across the 4 modules. Legacy domain-level skill 38 (`comp-mgmt-system`, `domain_id=60`, `domain_module_id=null`) exists from the pre-modular era with 9 skill_tools rows (7 query primitives + send_email + sign_document); per Rule #17 transitional note this is a migration target, not the modular pattern. Expected: 4 system skills (one per module). The Semantius score is **uncomputable per-module** until the migration. For the legacy domain-level skill the strict score reads as 8/9 = 89% platform-tier (only `sign_document` external).
- **F7 channel-primitive justification:** `sign_document` and `send_email` on legacy skill 38 are the externals; both notes columns are empty (clean), but no workflow-aligned justification exists on the row. Once modular system skills land, the e-signature requirement for `equity_grant_agreement` and `compensation_statement.acknowledged` workflows will need a `sign_document` link with rationale tracked outside `skill_tools.notes` (Rule #15).
- **H1 HARD FAIL (APQC tagging):** 4 of 29 cross-domain handoffs carry `handoff_processes` rows. All 4 are `discovery_*`; zero `agent_curated`; zero `record_status='approved'`. Catalog quality (the headline): 0 approved of 29 = 0%. Process health side-bar: 0 `agent_curated`. The 2 `discovery_override` rows (handoffs 123 and 372, both HCM → COMP-MGMT on `employee.promoted` / `employee.created`) point at PCF L2 20599 "Manage employee onboarding, training, and development" which is too coarse (the right L3 is "Develop and manage rewards, recognition, and motivation programs" 10511). Volume expectation per H1: 0.5N to 0.8N for N=29 → 15 to 24 `agent_curated` rows. The audit proposes ~26 candidates in the H1 sub-table.
- **Rule #15 audit:** the legacy `domain_data_objects` rollup has populated `notes` on rows 249 (`earning_codes`), 269 (`employees`), 300 (`performance_reviews`), 884 (`hcm_positions`), 885 (`job_profiles`), 886 (`cost_centers`), 887 (`financial_plans`), 1150 (`locations`), 1141 (`org_units`). On `domain_module_data_objects`, row 588 (`employment_contracts` consumer on COMP-PLANNING) carries text. 10 polluted rows total. Were these user-approved at load time, or auto-populated? Surfaced as B2-S2.

COMP-MGMT Semantius score (strict, legacy domain skill 38 only): **89%** (8/9 skill_tools rows on `platform`). Per-module score is uncomputable until F2 hard fail is fixed.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M7 hard fail (catalog-wide single-master on `equity_grants`)** | `equity_grants` (id 158) is mastered in COMP-INCENTIVES (module 79) AND CAP-TABLE-GRANTS (module 21, domain CAP-TABLE 162). The blueprint emitter cannot pick a canonical owner. Two `master` rows in `domain_module_data_objects` for the same `data_object_id` is a hard violation. | Surface to user (B2-S1). Default proposal: CAP-TABLE-GRANTS keeps `master` (the equity-administration market is the canonical home: cap-table mgmt, 409A valuations, employee equity portals); COMP-INCENTIVES demotes to `embedded_master` (preserves standalone-deploy story when COMP-MGMT is installed without CAP-TABLE). Lifecycle states on COMP-INCENTIVES (rows 112-118) re-anchor to the embedded shell, no DDOLS deletion needed since states 112-118 belong to the cap-table domain not the comp domain per the demotion contract. Alternative: keep COMP-INCENTIVES as canonical master and demote CAP-TABLE-GRANTS to `embedded_master` (needs user call on which market the entity primarily lives in). |
| B1-S2 | **F1-F5 hard fail (no module-level system skills)** | 0 `skills` with `skill_type='system'` AND `domain_module_id IN (78,79,80,85)`. The legacy domain-level skill 38 (`comp-mgmt-system`, `domain_id=60`, `domain_module_id=null`) carries 9 skill_tools but does not satisfy Rule #17 (one system skill per module). Per-module Semantius score uncomputable. | INSERT 4 new `skills` rows (one per module) with `skill_type='system'`, `domain_module_id` set, names like `comp_planning_agent`, `comp_incentives_agent`, `comp_benchmarking_agent`, `comp_statements_agent`. Then migrate the 9 existing skill_tools rows from skill 38 to the 4 new skills per their target masters (query_compensation_plans → comp_planning_agent; query_salary_bands / query_compensation_benchmarks → comp_benchmarking_agent; query_merit_cycles / query_merit_recommendations → comp_planning_agent; query_compensation_statements → comp_statements_agent; query_equity_grants → comp_incentives_agent; send_email / sign_document fanned out per module workflow). Then DELETE the legacy skill 38 and its 9 skill_tools rows (or leave with a deprecation flag if such a flag exists, per the SKILL.md transitional note). Hand-author each skill's `skill_tools` set to include the relevant verb-first primitives (create / update / approve / submit / generate / deliver / acknowledge / grant / vest / forfeit etc.) plus shared notifications (`notify_person` default per Rule #17 channel rule). |
| B1-S3 | **E1-E6 hard fail (no permissions / roles on COMP-MGMT modules)** | 0 `permissions` rows with `domain_module_id IN (78,79,80,85)`; 0 `role_modules` rows on these modules. Modules cannot be deployed. | INSERT 12 baseline permissions (3 per module): `comp_planning:read / manage / admin`, `comp_incentives:read / manage / admin`, `comp_benchmarking:read / manage / admin`, `comp_statements:read / manage / admin`. INSERT 18 workflow-gate permissions per the lifecycle states with `requires_permission=true` (activate / archive on compensation_plans; open / calibrate / approve / close / post on merit_cycles; submit / approve / finalize / reject on merit_recommendations; generate / deliver on compensation_statements; approve / grant / forfeit on equity_grants). INSERT 3-4 roles in `roles` table with function `Compensation` (HR-COMPENSATION-ANALYST, HR-COMPENSATION-PARTNER, HR-EQUITY-ADMIN, HR-COMP-BENCHMARK-ANALYST), plus the cross-functional `HIRING-MANAGER` (already exists) and `PEOPLE-MANAGER` (already exists) extended to touch COMP-PLANNING for merit_recommendation submission. Link `role_modules` and `role_permissions` for each. |
| B1-S4 | **B7 hard fail (zero `users` edges)** | All 7 COMP-MGMT masters lack `data_object_relationships` rows linking to `users` (id 748) per Rule #10. Architect renders incomplete graphs. | INSERT relationship rows: `compensation_plans (owned_by) users`, `compensation_plans (approved_by) users`, `merit_cycles (owned_by) users`, `merit_cycles (approved_by) users`, `merit_recommendations (submitted_by) users`, `merit_recommendations (approved_by) users`, `compensation_statements (issued_to) users`, `equity_grants (granted_to) users`, `equity_grants (approved_by) users`, `salary_bands (maintained_by) users`, `compensation_benchmarks (maintained_by) users`. Use the cluster-drafts loader pattern. |
| B1-S5 | **B6 partial-fail (intra-domain relationships missing)** | `merit_cycles`, `merit_recommendations`, `compensation_plans`, `compensation_benchmarks` have no intra-domain edges to other COMP-MGMT masters. Architect navigation hints incomplete. | INSERT: `merit_cycles contains merit_recommendations` (one_to_many, composition, required, owner=source); `compensation_plans seeds merit_cycles` (one_to_many, reference, required, owner=source); `compensation_statements composes merit_recommendations` (one_to_many, composition, optional, owner=source); `compensation_statements composes equity_grants` (one_to_many, composition, optional, owner=source); `salary_bands references compensation_benchmarks` (many_to_one, reference, optional, owner=source); `compensation_plans includes salary_bands` (many_to_many, reference, optional, owner=source). |
| B1-S6 | **B9 partial-fail (12 trigger_events have empty event_category)** | Rule #13 requires `event_category` to be `lifecycle / state_change / threshold / signal`. Empty values on: 423 `compensation_plan.published`, 424 `salary_band.updated`, 425 `compensation_statement.issued`, 426 `equity_grant.granted`, 427 `equity_grant.vested`, 428 `compensation_benchmark.refreshed`. (The 6 newer rows 1228, 1230-1239 already carry `state_change`.) | PATCH each row's `event_category` to `state_change`. Rationale: every row is a status transition on the publishing master (plan published, salary band updated, statement issued, grant granted, grant vested, benchmark refreshed). |
| B1-S7 | **B10b (in-scope) partial-fail (8 outbound handoffs with NULL `target_domain_module_id`)** | Outbound rows where COMP-MGMT can resolve target module from the inbound DMDO map: 105 (target PAYROLL, payload `merit_recommendations` → PAYROLL-EARNINGS-DEDUCTIONS 92), 107 (target PA, payload `compensation_statements` → PA-DEI-ANALYTICS 84 likely; needs PA-side check), 422 (target HCM, payload `merit_recommendations` → HCM-CORE-WORKER 54), 423 (target PAYROLL, payload `equity_grants` → PAYROLL-RUN 90 likely), 424 (target ERP-FIN, payload `equity_grants` → ERP-FIN journal-entry module if it exists), 1125 (target HCM, payload `compensation_plans` → HCM-CORE-WORKER 54), 1126 (target PAYROLL, payload `compensation_plans` → PAYROLL-EARNINGS-DEDUCTIONS 92), 1141 (target ERP-FIN, payload `earning_codes` → ERP-FIN journal-entry module). The rows where target module exists in catalog and consumer DMDO is declared can be patched mechanically; others route to B1-S8 report-only. | PATCH `target_domain_module_id` per the derived map. Where target module doesn't exist or consumer DMDO isn't declared on the target side, leave NULL and route to B1-S8. |
| B1-S8 | **B10b report-only (NULL target FK on COMP-MGMT outbound, owed by target domains)** | Rows from B1-S7 where the target side has not declared the consumer DMDO row: 107 (PA), 423 (PAYROLL on `equity_grants`), 424 (ERP-FIN on `equity_grants`), 1141 (ERP-FIN on `earning_codes`), 1138 outbound to SWP-COST-PROJECTIONS already populated (97) so not in this list. The remaining route to the respective domains' Phase B / b1 audits. | Schedule b1 audits on PA, ERP-FIN, PAYROLL to declare consumer DMDOs on `compensation_statements` / `equity_grants` / `earning_codes`. Not COMP-MGMT's fix to make. |
| B1-S9 | **H1 APQC tagging (single Bucket 1 item proposing ~26 row inserts)** | Of 29 cross-domain handoffs only 4 carry `handoff_processes` rows. All 4 are `discovery_*`; zero `agent_curated`; zero `record_status='approved'`. The 2 `discovery_override` rows (123, 372) point at PCF L2 20599 which is too coarse; the right L3 is 10511 "Develop and manage rewards, recognition, and motivation programs". Volume expectation: 0.5N to 0.8N for N=29 → 15 to 24 `agent_curated`. Audit proposes ~26 candidates in the sub-table below. | INSERT / REPLACE `handoff_processes` rows per the candidate table. Each new row: `(handoff_id, process_id, proposal_source='agent_curated', record_status='new', role='implements')`. PCF `process_id` resolved at fix time via `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry`. |

#### B1-S9 APQC TAGGING (proposed candidates)

H1 is one Bucket 1 item even though it proposes ~26 row inserts. Counts as one B1 row in the bucket summary.

**Strategy.** The L2 parent for nearly every COMP-MGMT cross-domain row is 20599 "Manage employee onboarding, training, and development" (the existing `discovery_override` default), and within that the dominant L3 is 10511 "Develop and manage rewards, recognition, and motivation programs". Equity-related rows lean on the L3 children of 10511. Earning-codes-to-PAYROLL is "Manage payroll" 10539. Benchmark rows to SWP / ATS lean on workforce-planning L3 10532.

**Outbound (COMP-MGMT published, target = downstream domain):**

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | Confidence |
|---|---|---|---|---|---|
| 105 | COMP-PLANNING → PAYROLL | merit_cycle.approved | merit_recommendations | Manage payroll (10539 L3) | confident L3 |
| 106 | COMP-PLANNING → HCM | merit_cycle.approved | employees | Develop and manage rewards (10511 L3) | confident L3 |
| 107 | COMP-PLANNING → PA | merit_cycle.closed | compensation_statements | Manage workforce metrics (10544 L3) | confident L3 |
| 187 | COMP-PLANNING → PAYROLL | merit_cycle.approved | pay_slips | Manage payroll (10539 L3) | confident L3 |
| 421 | COMP-PLANNING → TALENT-MGMT | merit_cycle.closed | merit_cycles | Manage talent (10547 L3) | medium |
| 422 | COMP-PLANNING → HCM | merit_cycle.approved | merit_recommendations | Develop and manage rewards (10511 L3) | confident L3 |
| 423 | COMP-INCENTIVES → PAYROLL | equity_grant.vested | equity_grants | Manage payroll (10539 L3) | confident L3 |
| 424 | COMP-INCENTIVES → ERP-FIN | equity_grant.granted | equity_grants | Perform general accounting (10742 L3) or Manage stock-based compensation expense (subprocess) | medium |
| 425 | COMP-BENCHMARKING → ATS | salary_band.updated | salary_bands | Recruit employees / Negotiate offer (10539 L3 ancestor) | medium |
| 1125 | COMP-PLANNING → HCM | compensation_plan.published | compensation_plans | Develop and manage rewards (10511 L3); REPLACE existing `discovery_substring` 1049 at L4 with `agent_curated` confirmation | confident L3 |
| 1126 | COMP-PLANNING → PAYROLL | compensation_plan.published | compensation_plans | Manage payroll (10539 L3); REPLACE existing `discovery_substring` 1049 at L4 with `agent_curated` correction | confident L3 |
| 1136 | COMP-STATEMENTS → EMP-EXP | compensation_statement.issued | compensation_statements | Manage employee engagement (subprocess of 10545 or 10550) | medium |
| 1137 | COMP-STATEMENTS → HRSD | compensation_statement.issued | compensation_statements | Manage HR service delivery (subprocess of 10550 Manage employee inquiries) | confident L4 |
| 1138 | COMP-BENCHMARKING → SWP | compensation_benchmark.refreshed | compensation_benchmarks | Manage workforce planning (10532 L3) | confident L3 |
| 1139 | COMP-BENCHMARKING → ATS | compensation_benchmark.refreshed | compensation_benchmarks | Recruit employees (10539 L3) | medium |
| 1140 | COMP-PLANNING → PAYROLL | earning_code.created | earning_codes | Manage payroll (10539 L3) | confident L3 |
| 1141 | COMP-PLANNING → ERP-FIN | earning_code.created | earning_codes | Perform general accounting (10742 L3) | confident L3 |

**Inbound (COMP-MGMT received, source = upstream domain):**

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | Confidence |
|---|---|---|---|---|---|
| 113 | TALENT-MGMT → COMP-PLANNING | calibration.complete | performance_reviews | Manage employee performance (10549 L3) | confident L3 |
| 121 | ATS → COMP-STATEMENTS | job_offer.signed | compensation_statements | Develop and manage rewards (10511 L3) | confident L3 |
| 123 | HCM → COMP-PLANNING | employee.promoted | employees | Develop and manage rewards (10511 L3); REPLACE existing `discovery_override` at L2 20599 with `agent_curated` at L3 10511 | confident L3 |
| 372 | HCM → COMP-PLANNING | employee.created | employees | Develop and manage rewards (10511 L3); REPLACE existing `discovery_override` at L2 20599 with `agent_curated` at L3 10511 | confident L3 |
| 381 | HCM → COMP-PLANNING | employment_contract.executed | employment_contracts | Develop and manage rewards (10511 L3) | confident L3 |
| 385 | HCM → COMP-PLANNING | hcm_position.approved_for_creation | hcm_positions | Manage workforce planning (10532 L3) | confident L3 |
| 387 | HCM → COMP-BENCHMARKING | job_profile.published | job_profiles | Develop and manage skills and capabilities (10545 L3) | medium |
| 398 | ATS → COMP-STATEMENTS | job_offer.signed | job_offers | Develop and manage rewards (10511 L3) | confident L3 |
| 439 | TALENT-MGMT → COMP-PLANNING | nine_box_placement.updated | nine_box_placements | Manage talent (10547 L3) | confident L3 |
| 460 | SWP → COMP-BENCHMARKING | labor_market_benchmark.refreshed | labor_market_benchmarks | Manage workforce planning (10532 L3) | confident L3 |
| 1076 | ATS → COMP-STATEMENTS | job_offer.rescinded | compensation_statements | Develop and manage rewards (10511 L3) | confident L3 |
| 1105 | PA → COMP-BENCHMARKING | pay_equity.gap_detected | workforce_segments | Manage pay equity (subprocess of 10511 or specifically Manage workforce metrics 10544) | medium |

**Intra-domain handoffs (lifecycle_progression, source_domain = target_domain = 60):** 5 rows (1142, 1143, 1144, 1145, 1150). Intra-domain handoffs typically don't require PCF tagging (no cross-domain process to map). Excluded from H1 count.

**Total H1 candidates:** approximately 17 outbound + 12 inbound = 29 rows. 4 of these are REPLACE candidates (123, 372, 1125, 1126 where existing `discovery_*` rows warrant correction or confirmation). The other 25 are INSERT candidates.

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| STRUCTURAL (M7, F2, E1, B6, B7, B9 fixes) | 6 (B1-S1, B1-S2, B1-S3, B1-S4, B1-S5, B1-S6) |
| BOUNDARY (B10b in-scope) | 1 (B1-S7) |
| BOUNDARY report-only | 1 (B1-S8) |
| APQC TAGGING (H1) | 1 (B1-S9, with sub-table covering ~26 row inserts) |
| MODULARIZATION ISSUES | 0 (route to Bucket 2) |
| **Bucket 1 total** | **9 items** |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **M7 resolution on `equity_grants` (catalog-wide single-master conflict).** Two `master` rows on the same data_object id 158: COMP-INCENTIVES (module 79) and CAP-TABLE-GRANTS (module 21). Which market owns canonical mastery? | Architectural call. CAP-TABLE-GRANTS is the equity-administration market (cap table, valuations, employee equity portal: Carta, Shareworks, Pulley); COMP-INCENTIVES manages the compensation aspect (bonus + equity component of total rewards). The cleaner answer points at CAP-TABLE-GRANTS as canonical owner since the entity lives there post-grant for its full lifecycle (vesting, exercise, forfeiture, expiration tied to equity admin). COMP-INCENTIVES could demote to `embedded_master` and rely on lifecycle state mirroring through CAP-TABLE-GRANTS once installed. | (a) CAP-TABLE-GRANTS keeps `master`, COMP-INCENTIVES demotes to `embedded_master` (recommended). (b) COMP-INCENTIVES keeps `master`, CAP-TABLE-GRANTS demotes (less coherent: equity admin is a richer scope than the comp side). (c) Defer, both masters stay, accept hard fail until next audit. |
| B2-S2 | **Rule #15 notes-pollution on 9 `domain_data_objects` rows + 1 `domain_module_data_objects` row.** DDO 249 (`earning_codes`), 269 (`employees`), 300 (`performance_reviews`), 884 (`hcm_positions`), 885 (`job_profiles`), 886 (`cost_centers`), 887 (`financial_plans`), 1150 (`locations`), 1141 (`org_units`); DMDO 588 (`employment_contracts` consumer on COMP-PLANNING). Notes are descriptive mechanical-context strings ("COMP-MGMT consumes performance_reviews ratings as input to merit_recommendations", "COMP-MGMT local-masters positions for salary-band assignment"). Were these user-approved at load time or auto-populated? | Cannot tell from audit alone; load-time approval status unknown. | (a) Confirm user-approved; leave in place. (b) Confirm auto-populated; PATCH all 10 rows' `notes` to empty string and append a Rule #15 incident to `references/skill-changelog.md`. |
| B2-S3 | **A3 SCOPE-CREEP: solution Sequoia One (id 502, secondary).** Sequoia One is a PEO / benefits-broker bundle (HR-as-a-service for startups), not a comp-planning platform. The `solution_domains` row places it as secondary on COMP-MGMT, which over-includes. Sequoia's relevance to COMP-MGMT is incidental (they touch comp via their HRIS bundle, but they don't compete in the comp-planning market). | Editorial; user owns the call. | (a) Delete `solution_domains` row 502→60 (scope creep). (b) Keep as secondary (broker-touches-comp narrative). (c) Move primary placement to HRIS or BEN-ADMIN where Sequoia is a better fit. |
| B2-S4 | **A3 solution-row duplication: beqom appears 3 times.** Solutions 259 ("beqom"), 414 ("beqom Pay"), 497 ("Beqom Compensation"), all `coverage_level=primary`. beqom is one vendor with one flagship product; 3 rows is duplication. | Catalog hygiene; user picks the canonical name and whether to delete the others or merge `solution_domains` rows. | (a) Keep id 259 "beqom" (oldest, simplest name), delete `solution_domains` rows for 414 and 497 (and the solutions rows themselves if not referenced elsewhere). (b) Promote "Beqom Compensation" (id 497) since it matches the product name pattern of other compensation entries (SAP SuccessFactors Compensation, Workday Compensation). (c) Keep all three (each represents a distinct module of beqom's product line). |
| B2-S5 | **B12 config-shape exemption for `salary_bands` and `compensation_benchmarks`.** `salary_bands` has no lifecycle_states authored, plausibly config-shape (curve of comp ranges per job profile, edited periodically, no workflow). `compensation_benchmarks` is externally-sourced market data refreshed periodically (no workflow). Per Rule #12 the config-shape exemption used to be recorded in `data_objects.notes` but Rule #15 rescinded that license. The audit needs to surface this as an editorial note. | Architectural judgment; user owns the call. | (a) Confirm both are config-shape exempt (recommended); the exemption is recorded in this audit log, not in `data_objects.notes`. (b) Author lifecycle states for `salary_bands` (e.g. `draft / active / archived` mirroring `compensation_plans` 153) if salary_bands have a defined approval workflow at the user's org. |
| B2-S6 | **M4 PAY-EQUITY capability not realized on COMP-PLANNING module.** Capability `PAY-EQUITY` realizes only on COMP-BENCHMARKING (module 80), but pay-equity analysis is also intrinsic to the COMP-PLANNING workflow (pay-equity gap detection during merit cycle calibration, EU Pay Transparency reporting). Should `domain_module_capabilities` add a row for `(78, PAY-EQUITY)`? | Editorial call. | (a) Yes, add `(78, PAY-EQUITY)` to realize the capability on COMP-PLANNING too. (b) Leave; benchmarking is the structural home and planning consumes the analysis as input. |
| B2-S7 | **B4 pattern-flag re-evaluation.** Current flags: `compensation_plans.has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false`; `salary_bands` all false; `merit_cycles` all false; `merit_recommendations.has_personal_content=true`, `has_submit_lock=true`, `has_single_approver=true` (correct); `compensation_statements.has_personal_content=true`, others false; `equity_grants.has_personal_content=true`, `has_submit_lock=false`, `has_single_approver=true`; `compensation_benchmarks` all false. Questions: (a) `compensation_plans.has_single_approver` is currently false but plans are typically board-approved at issuance, should be true? (b) `equity_grants.has_submit_lock` is currently false but most equity-grant flows lock the grant once approved, should be true? (c) `compensation_statements.has_submit_lock` is currently false but statements lock once delivered, could be true. | Pattern flags are workflow-shape judgments the user owns. | Per-flag yes/no from user; capture in Decisions. |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran semantic enumeration against Workday Compensation, SAP SuccessFactors Compensation, Oracle HCM Compensation Workbench, UKG Pro Compensation, Pave, beqom, Payfactors / Payscale Marketpay, HRSoft CompXL, CompTool, Mercer Comptryx, Aeqium, Assemble, OpenComp, plus pay-equity specialists Trusaic, Syndio, Salary.com Pay Equity Suite, and equity-side overlap with Carta, Shareworks, Pulley. Statutory coverage today: 2 regulations (ERISA mandatory, EU Pay Transparency Directive mandatory). Notable additional regulations to consider: Dodd-Frank 953(b) CEO Pay-Ratio (US SEC, public companies), Dodd-Frank 956 (financial-services deferred compensation), IRC Section 409A (equity valuations), IRC Section 162(m) (executive compensation deduction limit), state pay-transparency laws (CA, CO, NY, WA, narrower than EU Pay Trans Directive). Did not spawn a subagent (single-pass audit per orchestrator instruction); candidates below come from analyst flagship-vendor knowledge.

#### MISSING entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `pay_equity_assessments` | EU Pay Transparency Directive (2026 enforcement) and US state laws (CA, CO, NY, WA) require structured pay-equity assessments with gap calculations per protected class. Trusaic "Pay Equity Reports", Syndio "PayEQ", Workday "Pay Equity Audit", SuccessFactors "Pay Insights" all model these as first-class. The current model has 0 entities for pay equity; the only signal is the inbound `pay_equity.gap_detected` handoff 1105 from PA. | COMP-BENCHMARKING (master) or new HCM-side `HCM-PAY-EQUITY` module |
| `incentive_plans` | Distinct from `compensation_plans`: where comp plans define base + bonus targets, incentive plans (commissions, sales incentive plans, SPIFFs, MBOs) carry quota structures, accelerators, threshold conditions. Xactly, CaptivateIQ, Performio, SAP SuccessFactors Incentive Mgmt master these. Currently absent. | COMP-INCENTIVES (master) |
| `bonus_pools` | Workday "Bonus Plan Pool", SAP SuccessFactors "Variable Pay Pool", beqom "Pool Management" all model budget pools as separate first-class records with allocation and consumption tracking. Currently absent (rolled into compensation_plans). | COMP-PLANNING (master) |
| `commission_statements` | A specific kind of compensation statement for sales reps: tracks commission accrual, draws, claw-backs, dispute states. Distinct lifecycle from total-rewards `compensation_statements`. Xactly, CaptivateIQ, Spiff, Performio model these. Possibly belongs in SALES-PERF or ICM (Incentive Compensation Management) rather than COMP-MGMT. | new domain ICM or COMP-INCENTIVES (master) |
| `total_rewards_offers` | Workday, SuccessFactors model the rewards aspect of the offer (sign-on bonus, equity grant, relocation allowance, deferred comp) as a structured rewards offer separate from the ATS-side `job_offers`. The current `job_offers` consumer on COMP-STATEMENTS shows the lookup pattern but no first-class "rewards offer" entity exists. | COMP-STATEMENTS (master) or COMP-INCENTIVES |
| `pay_transparency_disclosures` | EU Pay Transparency Directive requires structured disclosure records (pay range, gender gap report, individual right-to-know responses). The directive's compliance artifact is data, not a process. Currently absent. | COMP-BENCHMARKING (master) or new HCM-PAY-EQUITY module |

#### MODULARIZATION candidates

- **ICM (Incentive Compensation Management) as a separate domain.** The COMP-INCENTIVES module currently bundles bonus + equity + commission. In practice, sales-incentive management (Xactly, Spiff, CaptivateIQ, Performio, SAP Commissions, Varicent) is a distinct point-solution market separate from equity admin and bonus planning. If `incentive_plans`, `commission_statements`, `quota_assignments` get added, splitting COMP-INCENTIVES into COMP-BONUS-EQUITY + ICM (or making ICM a new domain) is the cleaner shape.
- **HCM-PAY-EQUITY module candidate.** Pay equity has gone from a specialty service (Trusaic, Syndio) to a near-mandated capability in EU and several US states. A dedicated COMP-MGMT module (COMP-PAY-EQUITY) or an HCM module hosting `pay_equity_assessments` + `pay_transparency_disclosures` would consolidate the new entities under one deployable unit.

#### Compliance regulation candidates

- **Dodd-Frank 953(b) CEO Pay-Ratio** (US SEC, public companies, statutory disclosure requirement).
- **Dodd-Frank 956** (US financial services, deferred compensation for risk-takers).
- **IRC Section 409A** (US, equity valuation regime for non-public stock-based comp).
- **IRC Section 162(m)** (US, executive comp deduction limit).
- **State pay-transparency laws** (CA Senate Bill 1162, CO Equal Pay for Equal Work Act, NY Pay Transparency Act, WA HB 1696). Discrete from the EU directive; mainly affects job postings and salary range disclosure.

### Cross-bucket dependencies

- **B1-S1 (M7 equity_grants resolution) precedes B1-S2 (system skills).** The decision on which module canonically masters `equity_grants` informs which system skill carries the `query_equity_grants` / `grant_equity_grants` / etc. tools (comp_incentives_agent or, if the master moves entirely to CAP-TABLE-GRANTS, a CAP-TABLE-GRANTS system skill). Resolve B1-S1 first.
- **Bucket 3 incentive_plans / commission_statements / ICM modularization (B3-#2, #4) interacts with B1-S2 + B1-S3.** If the user chooses to spin ICM into its own domain or split COMP-INCENTIVES, the system skills + roles + permissions B1-S2 / B1-S3 author should target the post-split shape. If the user defers Bucket 3, author B1-S2 / B1-S3 against the current 4-module layout and revisit at next audit.
- **B2-S4 (beqom duplication) is independent.**
- **B2-S6 (PAY-EQUITY capability on COMP-PLANNING) is informed by B3 pay_equity_assessments + COMP-PAY-EQUITY module discussion.** If the user spins up a COMP-PAY-EQUITY module, the capability realizes there and the COMP-PLANNING question becomes moot.
- **B1-S9 (APQC tagging) is independent.** Tag now; tags survive any subsequent modularization (the handoff IDs and their PCF semantics don't change).

### Per-bucket prompts

- **After Bucket 1:** *"Fix these now? Reply 'all', 'just 1, 3, 5', or 'skip'."* Note B1-S1 (M7 resolution) requires the B2-S1 answer first.
- **After Bucket 2:** *"What's your call on each of these? I'll wait for your decision per item before acting."* B2-S1 (M7) and B2-S4 (beqom dedup) block their dependent B1 items.
- **After Bucket 3:** *"Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates to treat as confirmed."* Recommend Phase 0 verification for incentive_plans / commission_statements / ICM-as-domain since the boundary between COMP-MGMT-bonus and ICM-commissions is non-trivial and affects deeper-cluster decisions.

### Report-only follow-ups (owed by other domains)

- **B1-S8 (NULL `target_domain_module_id` on outbound from COMP-MGMT, owed by target domains).** Handoffs needing consumer DMDO declaration on the target side: 107 (PA, payload `compensation_statements`), 423 (PAYROLL, payload `equity_grants`), 424 (ERP-FIN, payload `equity_grants`), 1141 (ERP-FIN, payload `earning_codes`). Schedule b1 audits on PA, PAYROLL, ERP-FIN. None of these are COMP-MGMT's fix to make.
- **Cross-domain `data_object_relationships` missing on the inbound side, owed by other domains' B8 outbound pass.** The 12 inbound cross-domain handoffs imply corresponding `data_object_relationships` rows on the source domain's side (per B8 asymmetry rule). For example: HCM → COMP-PLANNING on `employee.promoted` payload `employees` should carry an HCM-side relationship `employees triggers merit_recommendation_review`. Each source domain's next b1 audit picks these up.
- **B5 integrity (consumer DMDOs declared by COMP-MGMT against masters in other domains).** All COMP-MGMT consumer / contributor / embedded_master rows pointing at HCM, ATS, ERP-FIN, TALENT-MGMT, PAYROLL masters check clean. No B5 failures owed by COMP-MGMT to other domains.
- **Bucket 2 B2-S3 SCOPE-CREEP on Sequoia One.** If the user removes the row, no follow-up on other domains. If the user moves the primary placement to BEN-ADMIN / HRIS, that decision interacts with those domains' b1 audits.
- **Cross-domain inbound `pay_equity.gap_detected` from PA (handoff 1105).** Currently target_domain_module_id is NULL. Routes to PA's b1 audit to populate target FK (target = COMP-BENCHMARKING module 80 once the inbound DMDO is declared) and to COMP-BENCHMARKING's own consumer-DMDO authoring on `workforce_segments` if PA owns that master. Surface for PA's owner.

## 2026-05-31, Continuation: B1 technical fixes

Applied the truly-technical subset of the 9 B1 items via loader `c:/dev/domain-map/.tmp_deploy/fix_comp_mgmt_b1_technical_2026_05_31.ts`.

### Applied (3 of 9 B1 items)

- **B1-S6 (B9 event_category backfill):** PATCHed `trigger_events.event_category='state_change'` on rows 423, 424, 425, 426, 427, 428 per the audit's pre-specified verb anchors (`*.published`, `*.updated`, `*.issued`, `*.granted`, `*.vested`, `*.refreshed` are all state transitions on the publishing master). Verified all 6 rows now read `state_change`.
- **B1-S4 (B7 user-edges per Rule #10):** INSERTed 11 `data_object_relationships` rows from `users` (748) to each of the 7 COMP-MGMT masters with the verb / cardinality / actor the audit pre-specified. New row ids 1539-1549. Pattern: `users <verb> <plural_label>`, `owner_side='source'`, `record_status` omitted (Rule #1 default `new`), `notes` omitted (Rule #15).
- **B1-S5 (B6 intra-domain edges):** INSERTed 6 `data_object_relationships` rows among COMP-MGMT masters per the audit's pre-specified verb / kind / cardinality. New row ids 1550-1555 covering `merit_cycles contains merit_recommendations` (composition), `compensation_plans seeds merit_cycles` (reference), `compensation_statements composes merit_recommendations` (composition), `compensation_statements composes equity_grants` (composition), `salary_bands references compensation_benchmarks` (many_to_many reference), `compensation_plans includes salary_bands` (many_to_many reference). `notes` omitted (Rule #15).

### Deferred (6 of 9 B1 items)

- **B1-S1 (M7 equity_grants single-master conflict):** Defer; gated on B2-S1 user-call on which market canonically masters `equity_grants` (CAP-TABLE-GRANTS vs COMP-INCENTIVES). New decisions/options outside the technical scope.
- **B1-S2 (F1-F5 module-level system skills + 9 skill_tools migration):** Defer; new entities (4 `skills` rows + skill_tools rows + legacy skill 38 retirement) and gated on B1-S1's master-of-equity_grants decision. Out of technical-only scope.
- **B1-S3 (E1-E6 permissions + roles):** Defer; new entities (12 baseline + 18 workflow-gate permissions, 3-4 new roles, role_modules + role_permissions junctions) and gated on B1-S1. Out of technical-only scope.
- **B1-S7 (B10b outbound `target_domain_module_id` PATCHes):** Defer. Verified live that the target side has not declared consumer DMDOs for the relevant payloads on the target modules the audit named, or has multiple consumer modules with no canonical pick: handoff 105 (PAYROLL on `merit_recommendations` 156) has no PAYROLL consumer DMDO at all; 422 (HCM on `merit_recommendations`) has no HCM consumer DMDO; 423/424 (PAYROLL/ERP-FIN on `equity_grants`) and 1141 (ERP-FIN on `earning_codes`) have no target consumer DMDOs (ERP-FIN has zero modules in the catalog); 1125/1126 (HCM/PAYROLL on `compensation_plans`) have no target consumer DMDOs. Without a declared consumer DMDO on the target module, the patch is not "derivable from existing modules" per the technical-fix rule. All route to B1-S8.
- **B1-S8 (NULL `target_domain_module_id`, owed by other domains):** Defer; report-only, not COMP-MGMT's fix to make. The expanded list now subsumes 105, 107, 422, 423, 424, 1125, 1126, 1141.
- **B1-S9 (H1 APQC `handoff_processes`, ~26 candidate rows):** Defer entire batch. Pre-flight against `/processes?source_framework=eq.apqc_pcf_cross_industry&external_id=in.(10511,10539,10544,10532,10547,10742,10549,10545,10550)` shows the audit's PCF id assertions do not resolve to the named processes: `external_id` 10511 resolves to "Review compensation plan" (L4), not the L3 "Develop and manage rewards"; 10532 resolves to "Deliver employee communications" (L3); 10742 resolves to "Process customer credit" (L3); 10539, 10544, 10547, 10549, 10545, 10550 do not exist as `external_id` values. Per the technical-fix rule ("verify the PCF id resolves in live `/processes` BEFORE insert"), every proposed `handoff_processes` row is blocked until the audit re-derives the correct PCF ids. Defer to a follow-up audit pass that maps APQC processes by name and re-asserts.

### Loader

`c:/dev/domain-map/.tmp_deploy/fix_comp_mgmt_b1_technical_2026_05_31.ts` (run from project root via `bun run`).

### Spot-check links

- https://tests.semantius.app/domain_map/data_object_relationships
- https://tests.semantius.app/domain_map/trigger_events

## 2026-05-31, Audit

### Summary

Structural Validate b1 audit re-run after the 2026-05-31 technical-fix loader closed 3 of the prior 9 Bucket-1 items (B1-S4 users edges, B1-S5 intra-domain relationships, B1-S6 trigger_event categories). Six structural / catalog-UX bands remain failing; two new gaps surface (A4 + M8 Rule #20 catalog UX never authored). H1 now sits at 6 of 29 tagged (2 new agent_curated since prior pass: 1136 / 1137); the prior B1-S9 batch remains blocked by the audit's broken PCF id assertions (the prior 2026-05-31 Continuation log recorded the pre-flight failure on external_id values 10511 / 10532 / 10742 / 10539 / 10544 / 10547 / 10549 / 10545 / 10550). Net: 3 prior Bucket 1 items closed, 6 remain; 4 new b1a items added (A4, M8, B11, B8 outbound) plus the existing B1A-S9 and B1A-S8 routing entry.

- Current footprint unchanged from 2026-05-30: 4 full modules (78 COMP-PLANNING, 79 COMP-INCENTIVES, 80 COMP-BENCHMARKING, 85 COMP-STATEMENTS); 7 masters (153 compensation_plans, 154 salary_bands, 155 merit_cycles, 156 merit_recommendations, 157 compensation_statements, 158 equity_grants, 159 compensation_benchmarks); 5 capabilities; 10 solution_domains; 19 trigger_events on the 7 masters.
- Bucket 1 (in-scope, agent fixable): 6 PENDING (was 9 in 2026-05-30; 3 closed in the 2026-05-31 Continuation; 4 new added against A4 / M8 / B11 / B8-outbound).
- Bucket 2 (surface-for-user, judgment): 7 PENDING (all of B2-S1 through B2-S7 carry forward).
- Bucket 3 (Phase 0 pending, speculative): 6 MISSING entity candidates + 2 MODULARIZATION candidates + 5 regulation candidates carry forward.

### Structural pass deltas vs 2026-05-30

- **A1 pass:** unchanged.
- **A2 pass:** unchanged.
- **A3 partial-fail:** unchanged (10 solution_domains: 3 beqom duplicates 259 / 414 / 497 plus Sequoia One 502 SCOPE-CREEP). Routes to B2-S3 (Sequoia) and B2-S4 (beqom).
- **A4 NEW HARD FAIL (Rule #20):** `domains.catalog_tagline` and `domains.catalog_description` are both empty on row 60. Not surfaced in the 2026-05-30 pass.
- **M1, M2, M5, M6 pass:** unchanged.
- **M4 partial-fail:** unchanged (B2-S6 PAY-EQUITY only realizes on COMP-BENCHMARKING).
- **M7 HARD FAIL unchanged:** `equity_grants` (158) still mastered in COMP-INCENTIVES (79) AND CAP-TABLE-GRANTS (21, CAP-TABLE 162). Two `master` rows confirmed live.
- **M8 NEW HARD FAIL (Rule #20):** all 4 modules (78 / 79 / 80 / 85) have empty `catalog_tagline` and `catalog_description`. Not surfaced in the 2026-05-30 pass.
- **B1, B2, B3 pass:** unchanged.
- **B4 considered:** unchanged. B2-S7 still pending.
- **B5 pass:** unchanged.
- **B6 PASS (was partial-fail):** the 6 intra-domain `data_object_relationships` rows from B1-S5 are live (1550-1555: `merit_cycles contains merit_recommendations`, `compensation_plans seeds merit_cycles`, `compensation_statements composes merit_recommendations`, `compensation_statements composes equity_grants`, `salary_bands references compensation_benchmarks`, `compensation_plans includes salary_bands`). Closed.
- **B7 PASS (was hard fail):** 11 `users` rows (1539-1549) cover every master. Closed.
- **B8 partial-fail unchanged:** cross-domain outbound payload-target relationships still missing (`merit_recommendations becomes employees` payload edge mirroring handoff 106 / 422, `equity_grants becomes employees` mirroring 423 vested, `compensation_statements becomes employees` mirroring 1136). Surfaces as B1A-B8.
- **B9 PASS (was partial-fail):** 18 of 19 trigger_events on COMP-MGMT masters carry `event_category=state_change`; only event 427 `equity_grant.vested` reads `lifecycle` which is defensible (vesting is the canonical lifecycle progression on an equity grant). Closed against the B1-S6 batch scope.
- **B9b pass:** unchanged (5 intra-domain `lifecycle_progression` rows 1142-1145, 1150).
- **B10b in-scope partial-fail (REDUCED):** outbound NULLs on `target_domain_module_id` now: 422 (HCM, `merit_recommendations`), 424 (ERP-FIN, `equity_grants`), 1125 (HCM, `compensation_plans`), 1136 (EMP-EXP, `compensation_statements`), 1141 (ERP-FIN, `earning_codes`). Inbound NULL: 1105 (PA, `workforce_segments`). All route to B1A-S8 report-only since the target domains have not declared consumer DMDOs; COMP-MGMT cannot patch derivatively.
- **B11 HARD FAIL unchanged:** 0 `data_object_aliases` across the 7 masters.
- **B12 pass with surface:** lifecycle states authored on 5 of 7 workflow-bearing masters; `salary_bands` and `compensation_benchmarks` carry no states (config-shape candidate exemption per B2-S5).
- **C1, C2 pass:** unchanged.
- **D1 pass.**
- **E1-E6 HARD FAIL unchanged:** 0 permissions and 0 role_modules on any of 78 / 79 / 80 / 85.
- **F1-F5 HARD FAIL unchanged:** 0 module-level system skills; legacy skill 38 (`comp-mgmt-system`, `domain_id=60`, `domain_module_id=null`) persists. Per-module Semantius score uncomputable.
- **F7:** unchanged surface (will activate once F2 lands).
- **H1 partial fix:** APQC coverage now 6 of 29 (was 4). Two new `agent_curated` rows: 1136 to process 1046 (Administer compensation and rewards to employees, L4 external_id 10502), 1137 to process 242 (Manage employee inquiry process, L3 external_id 10523). The two `discovery_override` rows (123 / 372 at L2 20599) are unchanged and remain coarse. The prior B1-S9 ~26-row batch is still blocked by the audit-asserted PCF external_ids failing the live-`/processes` pre-flight (logged in the 2026-05-31 Continuation deferral). Carries as B1A-S9 with the explicit need to re-derive PCF ids by name lookup before any insert pass.
- **Rule #15 audit unchanged:** 10 polluted notes rows persist (9 DDO: 249, 269, 300, 884, 885, 886, 887, 1141, 1150; 1 DMDO: 588). B2-S2 still pending.

### Bucket 1, In-scope confirmed gaps (PENDING)

| ID | Band | Finding | Action |
|---|---|---|---|
| B1A-A4 | A4 (Rule #20) | `domains.catalog_tagline` and `domains.catalog_description` empty on row 60. | Draft both fields in buyer voice (workflow + value), surface to user BEFORE writing per Rule #20. |
| B1A-M8 | M8 (Rule #20) | All 4 COMP-MGMT modules (78 / 79 / 80 / 85) have empty `catalog_tagline` and `catalog_description`. | Draft 4 module taglines and descriptions in buyer voice (workflow + value), surface to user BEFORE writing per Rule #20. |
| B1A-B11 | B11 | 0 `data_object_aliases` rows across the 7 masters. Expected aliases per 2026-05-30 audit: `compensation_plans` to `comp_plans`; `merit_cycles` to `comp_cycles`, `planning_cycles`; `merit_recommendations` to `comp_recommendations`, `pay_increases`; `compensation_statements` to `total_rewards_statements`, `trs`; `equity_grants` to `stock_grants`, `rsu_grants`, `option_grants`; `salary_bands` to `pay_bands`, `grade_bands`; `compensation_benchmarks` to `market_benchmarks`, `comp_market_data`. | INSERT alias rows via the cluster-drafts loader pattern. Aliases ship without `notes` (Rule #15). |
| B1A-B8 | B8 (outbound only) | Cross-domain outbound payload-target `data_object_relationships` missing: `merit_recommendations` to `employees` (mirror handoff 106 / 422), `equity_grants` to `employees` (mirror handoff 423 vested), `compensation_statements` to `employees` (mirror handoff 1136). | INSERT outbound-direction relationship rows; inbound rows are owed by source domains (B10 report-only). |
| B1A-S9 | H1 (APQC, blocked-on-PCF id) | 6 of 29 cross-domain handoffs tagged; volume target 15 to 24 `agent_curated`. Prior batch blocked because audit-asserted PCF external_ids did not resolve in live `/processes` (10511 was L4 "Review compensation plan", 10532 was "Deliver employee communications", 10742 was "Process customer credit", and 10539 / 10544 / 10545 / 10547 / 10549 / 10550 did not exist). | Re-derive PCF ids by name lookup (`process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry`) BEFORE any insert; then propose `(handoff_id, process_id, proposal_source='agent_curated', record_status='new')` rows. Also REPLACE handoffs 123 and 372 (currently at coarse L2 20599) with confident L3 / L4 rows by name. |
| B1A-S8 | B10b report-only routing | 5 outbound NULL `target_domain_module_id` rows route to target domains (1125 HCM, 1136 EMP-EXP, 1141 ERP-FIN, 422 HCM, 424 ERP-FIN) plus 1 inbound NULL (1105 PA on `workforce_segments`). Schedule b1 audits on PA, HCM, EMP-EXP, ERP-FIN; not COMP-MGMT's fix. | Surface in cross-domain queue. |

### Bucket 2, Surface-for-user (judgment, PENDING)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | M7 resolution on `equity_grants`: which market canonically masters it (CAP-TABLE-GRANTS module 21 vs COMP-INCENTIVES module 79)? | Architectural call; both are defensible. Recommended default: CAP-TABLE-GRANTS keeps `master` (cap-table is the canonical equity-administration market), COMP-INCENTIVES demotes to `embedded_master`. | (a) CAP-TABLE-GRANTS keeps master, COMP-INCENTIVES demotes (recommended). (b) COMP-INCENTIVES keeps, CAP-TABLE-GRANTS demotes. (c) Defer. |
| B2-S2 | Rule #15 notes-pollution on 10 rows (9 DDO: 249, 269, 300, 884, 885, 886, 887, 1141, 1150; 1 DMDO: 588). Were these user-approved at load time, or auto-populated? | Cannot tell from audit alone. | (a) Confirm user-approved; leave. (b) Confirm auto-populated; PATCH all 10 to empty string and append a Rule #15 incident to `references/skill-changelog.md`. |
| B2-S3 | A3 SCOPE-CREEP candidate: solution Sequoia One (id 502, secondary) is a PEO / benefits broker, not a comp-planning platform. Remove? | Editorial call. | (a) Delete `solution_domains` row 502 to 60. (b) Keep as secondary. (c) Move primary to BEN-ADMIN / HRIS. |
| B2-S4 | A3 duplication: beqom present 3 times (259 "beqom", 414 "beqom Pay", 497 "Beqom Compensation"). Canonical row choice? | Catalog hygiene; user picks. | (a) Keep 259, delete 414 and 497 (and their `solution_domains` rows). (b) Keep 497 (matches product-name pattern). (c) Keep all (treat as distinct product lines). |
| B2-S5 | B12 config-shape exemption for `salary_bands` (154) plus `compensation_benchmarks` (159): no lifecycle states authored. Per Rule #15 the prior notes-anchored exemption surface is rescinded; surface for editorial decision. | Architectural judgment. | (a) Confirm both config-shape exempt (recorded in this audit log). (b) Author lifecycle states (`draft / active / archived` for `salary_bands`; periodic-refresh for `compensation_benchmarks`). |
| B2-S6 | M4 PAY-EQUITY capability realizes only on COMP-BENCHMARKING (80). Should it also realize on COMP-PLANNING (78) since pay-equity gap detection feeds merit calibration and EU Pay Transparency reporting? | Editorial call. | (a) Add `(78, PAY-EQUITY)`. (b) Leave; benchmarking is the structural home. |
| B2-S7 | B4 pattern-flag re-evaluation. (a) `compensation_plans.has_single_approver` is false; plans are typically board-approved at issuance, should be true? (b) `equity_grants.has_submit_lock` is false; most equity-grant flows lock once approved, should be true? (c) `compensation_statements.has_submit_lock` is false; statements lock once delivered, could be true. | Workflow-shape judgments. | Per-flag yes / no from user. |

### Bucket 1b, Blocked (waiting on Bucket 2 / catalog work)

| ID | Band | Finding | Blocked by |
|---|---|---|---|
| B1B-M7 | M7 hard fail (catalog-wide single-master on `equity_grants`) | `equity_grants` (158) mastered twice (CAP-TABLE-GRANTS 21 + COMP-INCENTIVES 79). Blueprint emitter cannot pick a canonical owner. | B2-S1 user decision. Once chosen, demote the losing side to `embedded_master`; lifecycle states on COMP-INCENTIVES (`approved / granted / vesting / exercised / forfeited / expired`) re-anchor to whichever module carries the demoted shell, or stay on the master per the demotion contract. |
| B1B-F2 | F1-F5 module-level system skills | 0 `skills` with `skill_type=system` and `domain_module_id IN (78, 79, 80, 85)`. Legacy skill 38 (`comp-mgmt-system`, `domain_module_id=null`, 9 skill_tools) persists. Per-module Semantius score uncomputable. | B1B-M7 (the `equity_grants` master decision determines which module's system skill carries the `query_equity_grants` / `grant_equity_grants` tools). Once unblocked: INSERT 4 `skills` rows (`comp_planning_agent`, `comp_incentives_agent`, `comp_benchmarking_agent`, `comp_statements_agent`); migrate 9 legacy `skill_tools` to the 4 new skills per target master; DELETE legacy skill 38. |
| B1B-E1 | E1-E6 permissions and roles | 0 permissions with `domain_module_id IN (78, 79, 80, 85)`; 0 `role_modules` on these modules. Modules cannot be deployed. | B1B-M7 + B1B-F2 (system-skill author drives which permissions appear in role bundles). Once unblocked: INSERT 12 baseline permissions (3 per module) + 18 workflow-gate permissions per the `requires_permission=true` lifecycle states; INSERT 3 to 4 roles (HR-COMPENSATION-ANALYST, HR-COMPENSATION-PARTNER, HR-EQUITY-ADMIN, HR-COMP-BENCHMARK-ANALYST) plus extend HIRING-MANAGER + PEOPLE-MANAGER to touch COMP-PLANNING; link `role_modules` and `role_permissions`. |

### Bucket 3, Phase 0 pending (speculative, PENDING)

Carries forward from 2026-05-30 verbatim; no fresh Phase 0 research in this pass.

- **MISSING entity candidates** (6): `pay_equity_assessments`, `incentive_plans`, `bonus_pools`, `commission_statements`, `total_rewards_offers`, `pay_transparency_disclosures`. Vendor basis: Workday, SuccessFactors, beqom, Trusaic, Syndio, Xactly, CaptivateIQ, Carta. Proposed modules: COMP-BENCHMARKING or new HCM-PAY-EQUITY (pay_equity_assessments); COMP-INCENTIVES (incentive_plans); COMP-PLANNING (bonus_pools); new ICM domain or COMP-INCENTIVES (commission_statements); COMP-STATEMENTS or COMP-INCENTIVES (total_rewards_offers); COMP-BENCHMARKING or new HCM-PAY-EQUITY (pay_transparency_disclosures).
- **MODULARIZATION candidates** (2): ICM as a separate domain (split COMP-INCENTIVES into COMP-BONUS-EQUITY + ICM if commission entities land); HCM-PAY-EQUITY module candidate consolidating pay-equity entities under one deployable unit.
- **Compliance regulation candidates** (5): Dodd-Frank 953(b) CEO Pay-Ratio, Dodd-Frank 956, IRC 409A, IRC 162(m), state pay-transparency laws (CA, CO, NY, WA).

### Cross-bucket dependencies

- B2-S1 (M7 equity_grants) gates B1B-M7, B1B-F2, B1B-E1 transitively, plus any B1A-S9 row that points at handoffs on `equity_grants`. Resolve B2-S1 first.
- B3 ICM modularization interacts with future B1B-F2 / B1B-E1 once those go from blocked to in-scope.
- B2-S6 (PAY-EQUITY capability on COMP-PLANNING) is informed by B3 `pay_equity_assessments` candidate.
- B1A-A4, B1A-M8, B1A-B11, B1A-B8 are independent.
- B1A-S9 is independent (tags survive any subsequent modularization).

### Per-bucket prompts

- After Bucket 1: "Fix these now? Reply 'all', 'just B1A-A4 and B1A-M8', or 'skip'." Note B1A-A4 and B1A-M8 need the user to review the drafts BEFORE write.
- After Bucket 2: "What's your call on each of these? I'll wait for your decision per item before acting." B2-S1 (M7) and B2-S4 (beqom dedup) block downstream b1b items.
- After Bucket 3: "Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates to treat as confirmed."

### Report-only follow-ups (owed by other domains)

- B1A-S8 expansion: schedule b1 audits on PA, HCM, EMP-EXP, ERP-FIN to declare consumer DMDOs on `workforce_segments`, `merit_recommendations`, `compensation_plans`, `compensation_statements`, `equity_grants`, `earning_codes`.
- Cross-domain `data_object_relationships` missing on the inbound side, owed by other domains' B8 outbound passes (12 inbound rows imply matching source-side relationships on HCM, ATS, TALENT-MGMT, SWP, PA).
- B5 integrity: clean from COMP-MGMT side.

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.

---

## 2026-06-07 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate pass against the open items in `audits/COMP-MGMT/state.yaml`. The snapshot (last_audit 2026-05-31) was stale: H1 had already advanced from 6/29 to 22/29 cross-domain tagged via prior agent_curated work, and the 7 masters were all still `entity_type='unclassified'`. Re-verified every recorded item live (domain 60; modules 78/79/80/85; masters 153-159) before writing. Executed the agent-solvable additive/corrective items; surfaced every destructive step and judgment call; left the superseded skill-grain item and the b3 backlog. Loader: `.tmp_deploy/comp_mgmt_b1a_2026-06-07.ts` (run via `bun run`, idempotent, re-run clean).

C1 note: `business_function_domains` for domain 60 already carries an owner (function 78 Compensation) plus two contributors (FP&A 43, Finance 4). C1 PASSES; no owner row was added (the generic "owner = Human Resources" template did not apply, the live owner is the Compensation function and adding a second owner would have been wrong).

### Executed (record_status='new', verified live)

- **B1A-ENTITY-TYPE (7 rows PATCHed):** classified all 7 masters off their lifecycle evidence. `operational_workflow`: compensation_plans (153), merit_cycles (155), merit_recommendations (156), compensation_statements (157), equity_grants (158). `catalog`: salary_bands (154), compensation_benchmarks (159) — both carry zero lifecycle states and are config / reference shaped (this also resolves the structural side of B2-S5).
- **B1A-A4 (2 fields):** domain 60 `catalog_tagline` + `catalog_description` backfilled in buyer voice (workflow + value, no vendor names, no em-dash, American English). Per-field empty-guard; nothing overwritten.
- **B1A-M8 (8 fields):** all 4 modules (78 COMP-PLANNING, 79 COMP-INCENTIVES, 80 COMP-BENCHMARKING, 85 COMP-STATEMENTS) `catalog_tagline` + `catalog_description` backfilled in buyer voice. Per-field empty-guard.
- **B1A-B11 (14 rows):** `data_object_aliases` inserted across the 7 masters (alias_type='synonym', industry_id null, notes omitted). compensation_plans→comp_plans; salary_bands→pay_bands, grade_bands; merit_cycles→comp_cycles, planning_cycles; merit_recommendations→comp_recommendations, pay_increases; compensation_statements→total_rewards_statements, trs; equity_grants→stock_grants, rsu_grants, option_grants; compensation_benchmarks→market_benchmarks, comp_market_data.
- **B1A-B8 (3 rows):** outbound payload-target `data_object_relationships` inserted to employees (31): `merit_recommendations applies to employees` (one_to_one, mirrors handoff 106/422), `equity_grants granted to employees` (one_to_one, mirrors handoff 423), `compensation_statements issued to employees` (one_to_one, mirrors handoff 1136). owner_side='source', is_required=false, notes omitted.
- **B1A-S9 insert side (6 rows):** `handoff_processes` agent_curated (role='implements') for the 6 untagged cross-domain handoffs with a clean PCF match, resolved by live name lookup: 107→1046 (Administer compensation and rewards to employees, L4), 113→1028 (Review employee performance, L4), 421→1046, 439→225 (Manage employee performance, L3), 460→216 (Develop and implement workforce planning, policies, and strategies, L3), 1138→216. **H1 now 28/29 cross-domain tagged.**

### Surfaced (NOT written; user decision or destructive)

- **B2-S1** (M7 equity_grants dual-master: CAP-TABLE-GRANTS 21 vs COMP-INCENTIVES 79). Gates B1B-M7 + B1B-E1.
- **B2-S2** (Rule #15 notes-pollution on 10 rows; PATCH-to-empty is destructive).
- **B2-S3** (Sequoia One 502 scope-creep; deletion destructive).
- **B2-S4** (beqom 3-row duplication 259/414/497; deletion destructive).
- **B2-S5** (salary_bands + compensation_benchmarks now classified `catalog`; confirm no lifecycle states needed — option (a) is the classification-consistent default).
- **B2-S6** (PAY-EQUITY capability also on COMP-PLANNING 78; editorial placement call).
- **B2-S7** (3 pattern-flag flips on compensation_plans / equity_grants / compensation_statements; each overwrites an existing flag value, destructive).
- **B1A-S9-RESIDUAL destructive:** 4 REPLACE candidates that overwrite existing handoff_processes rows — 123 + 372 (currently process 41 / L2 20599 onboarding, recommend 1046 / L4 comp-admin), 1125 + 1126 (currently process 1049 / L4 Review compensation plan via discovery_substring, recommend 1046 / L4 Administer compensation and rewards). Recommended only; not applied.
- **B1A-SELF-CONTAIN (M9):** 3 required cross-domain consumer/contributor DMDO rows break standalone self-containment (374 earning_codes contributor/required; 588 consumer/required; 516 job_offers consumer/required). Fix rewrites role/necessity on an existing row (destructive). Recommended: embedded_master or necessity=optional per row.
- **B1A-PHASE-P (personas/RACI):** DEFERRED per Rule #21 (personas not authored in state-driven execute). Candidate personas: HR-COMPENSATION-ANALYST, HR-COMPENSATION-PARTNER, HR-EQUITY-ADMIN, HR-COMP-BENCHMARK-ANALYST.

### Left (untouched)

- **B1A-S9 1105** (PA pay_equity.gap_detected → COMP-BENCHMARKING): no clean APQC PCF match (PCF cross-industry has no pay-equity / workforce-metric L3/L4 process) → deferred to a Discover pass.
- **B1A-S8** report-only: schedule b1 audits on PA, HCM, EMP-EXP, ERP-FIN to declare consumer DMDOs (422, 424, 1125, 1136, 1141 outbound + 1105 inbound NULL target_domain_module_id). Not COMP-MGMT's fix.
- **B1B-M7 / B1B-E1** blocked (B2-S1 + persona layer).
- **B1B-F2 RETIRED** (per-module system-skill grain superseded 2026-06-06 / Plan 3; tracked in audits/_modularization-backlog.md).
- **b3 backlog** (6 entity candidates + ICM split + 5 compliance regs) carries forward.

### Spot-check links

- https://tests.semantius.app/domain_map/data_objects
- https://tests.semantius.app/domain_map/domains
- https://tests.semantius.app/domain_map/domain_modules
- https://tests.semantius.app/domain_map/data_object_aliases
- https://tests.semantius.app/domain_map/data_object_relationships
- https://tests.semantius.app/domain_map/handoff_processes
