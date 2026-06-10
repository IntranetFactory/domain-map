# SWP audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 4 full modules (`SWP-DEMAND-FORECAST` 94, `SWP-SUPPLY-PLANNING` 95, `SWP-SCENARIO-MODELING` 96, `SWP-COST-PROJECTIONS` 97). No starters. No cross-host modules. 8 SWP-mastered data_objects: `workforce_plans` (23, master on 96), `headcount_plans` (24, master on 94), `position_demand_forecasts` (25, master on 94), `skills_gap_analyses` (26, master on 94), `workforce_scenarios` (27, master on 96), `org_designs` (28, master on 96), `labor_market_benchmarks` (29, master on 96), `workforce_cost_projections` (30, master on 97). 1 contributor (`job_requisitions` 1, co-master with ATS, the canonical Signal-1 example). 2 contributor rows on cross-domain masters: `hcm_positions` (32, contributor at domain rollup, consumer at module level), `financial_plans` (37, contributor on SWP-COST-PROJECTIONS). 8 consumer rows on cross-domain masters: `employees` (31), `org_units` (34), `job_profiles` (33), `cost_centers` (196), `salary_bands` (154), `merit_cycles` (155), `attrition_forecasts` (42), `people_kpis` (43). 8 capabilities (`SWP-DEMAND-PLANNING`, `SWP-SUPPLY-MODELING`, `SWP-SCENARIO-MODELING`, `SWP-SKILLS-GAP-ANALYSIS`, `SWP-LABOR-MARKET-INTELLIGENCE`, `SWP-ORG-DESIGN`, `SWP-WORKFORCE-COSTING`, `SWP-PLAN-RECONCILIATION`). 9 solutions (3 primary: eQ8, OrgVue, Visier Plan; 6 secondary: Anaplan, Pigment, Workday Adaptive Planning, ChartHop, Visier People, Workday HCM). 0 regulations. 8 trigger_events on SWP masters (3 with `event_category='state_change'`, 5 with empty `event_category`). 14 outbound cross-domain handoffs (to HCM, ATS, EPM, COMP-MGMT, SKILLS-MGMT, plus 4 intra-domain `lifecycle_progression` rows 1146-1149). 14 inbound cross-domain handoffs (from HCM, ATS, EPM, PA, COMP-MGMT, WFM, PSA, SPM). 28 lifecycle states across 6 of 8 masters (25, 29 are config-shape per the populated `data_objects.notes`, Rule #12 vs Rule #15 boundary discussed under B2-S2). 23 permissions: 12 baseline (3 per module x 4) and 11 workflow-gate (3 on SWP-DEMAND-FORECAST, 6 on SWP-SCENARIO-MODELING, 2 on SWP-COST-PROJECTIONS, 0 on SWP-SUPPLY-PLANNING). 5 SWP-scoped roles (`WORKFORCE-PLANNING-PLANNER`, `WORKFORCE-PLANNING-LEAD`, `FPA-WORKFORCE-PARTNER`, `ORG-DESIGN-PRACTITIONER`, `WORKFORCE-LEADERSHIP-SPONSOR`). 1 LEGACY domain-level `system` skill (`swp-system`, id 7, `domain_module_id=NULL`) with 14 `skill_tools` rows. 0 module-level system skills (F1 + F2 hard fail). 6 aliases across masters 25, 26, 29, 30.

- **Vendor-surface basis (Pass 2 flagship enumeration):** flagship SWP pure-plays: eQ8, OrgVue (also a leader in org-design), Visier Workforce Planning / Visier Plan, Anaplan Workforce Planning (configured use case of Anaplan Connected Planning), Pigment Workforce. Adjacent suite modules: Workday Adaptive Planning (Workforce module), Workday HCM (native workforce planning surface), SAP SuccessFactors Workforce Planning, Oracle Strategic Workforce Planning Cloud, Beqom Workforce Planning (comp-led), ChartHop (org-planning + headcount), Orgvue (org design + planning). Specialist labor-intelligence inputs: TalentNeuron (Gartner-owned), Lightcast (formerly Emsi Burning Glass), Eightfold AI Talent Intelligence. People-analytics adjuncts feeding SWP: Visier People (analytics layer), HiBob Analytics. Pixentia is a SuccessFactors implementation partner rather than a flagship vendor; excluded from the primary list. Vendor-list excerpts here characterize the market, never the substrate per Rule #18; the 9 solutions in the catalog reflect commerce-layer placement.

- **Bucket 1 (in-scope, agent fixable):** 8 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 5 items.

**Neighbor discovery** (ranked by edge weight: outbound + inbound + DMDO touch points + co-mastering signal):

| Neighbor | Out | In | DMDO touch | Notes | Weight | Pass shape |
|---|---|---|---|---|---|---|
| ATS | 2 (position_demand_forecast.updated to ATS-RECRUITMENT-PIPELINE; headcount.approved on job_requisitions to ATS) | 2 (requisition.filled twice: targets position_demand_forecasts and job_requisitions) | SWP contributor on `job_requisitions` (co-master, Signal-1) | Signal-1 co-master, contract-bearing | 12 | Pairwise (full) |
| HCM | 4 (position_demand_forecast.updated, workforce_scenario.approved, org_design.published, hcm_position.approved_for_creation) | 1 (headcount.actuals_updated) | SWP consumer on `employees`, `org_units`, `job_profiles`, `hcm_positions` (4 modules) | 4-way DMDO touch; SWP plans roll up to HCM positions | 10 | Pairwise (full) |
| EPM | 2 (workforce_scenario.approved to EPM, cost_projection.approved to EPM) | 3 (financial_forecast.refreshed, financial_budget.cycle_started, both NULL source_module , EPM unmodularized) | SWP contributor on `financial_plans` | EPM unmodularized today; B1-S3 surfaces NULLs | 7 | Pairwise (full) |
| PA | 0 | 3 (attrition.forecast_updated, attrition_forecast.published, workforce_segment.composition_changed) | SWP consumer on `attrition_forecasts`, `people_kpis` | Heavy inbound, no outbound | 5 | Pairwise (full) |
| COMP-MGMT | 1 (labor_market_benchmark.refreshed to COMP-MGMT) | 1 (compensation_benchmark.refreshed to SWP-COST-PROJECTIONS) | SWP consumer on `salary_bands`, `merit_cycles` | Symmetric benchmark loop | 4 | Pairwise (full) |
| SKILLS-MGMT | 1 (skills_gap_analysis.completed) | 0 | none | Single outbound | 1 | Lightweight |
| WFM | 0 | 1 (actuals.posted on `time_entries`, NULL source_module) | none | Single inbound | 2 | Lightweight |
| PSA | 0 | 2 (project_assignment.released, resource_skill_inventory.gap_identified) | none | Inbound resource signals | 2 | Lightweight |
| SPM | 0 | 2 (initiative.kickoff, resource_allocation.committed, both NULL source_module) | none | Inbound from SPM, strategic-initiatives input | 2 | Lightweight |
| MDM | 0 | 0 | none | No edges. | 0 | n/a |

**Structural pass bands:**
- **A1 pass** (`crud_percentage=55`, `business_logic` non-empty, `min_org_size='30 m <2500'`, `cost_band='$$$'`, `usa_market_size_usd_m=800`, `market_size_source_year=2024`, `certification_required=false`).
- **A2 pass** (8 capabilities, all SWP-prefixed; B3 audit consideration: any candidate cross-cutting? See Cross-cutting capability convention. Probable candidates surface in Bucket 2.).
- **A3 pass** (9 solutions; 3 `primary` rows; coverage_level set on every row).
- **M-band passes** (4 modules; 8 capabilities >= 3 so M2 requires >= 2 modules, satisfied; M4 / M6 every capability has exactly one realizing module and every module realizes 1-3 capabilities; M5 every workflow-gate state has `domain_module_id` set; M7 every master is single-mastered catalog-wide).
- **B1 pass** (8 master rows).
- **B2 pass** (every master has `singular_label` and `plural_label`).
- **B3 pass** (every master name uses `<noun>_<plural>` shape, none claim canonical bare-word).
- **B4 partial-fail** (pattern flags considered, see B2-S3 for re-evaluation of `workforce_scenarios.has_personal_content` and `org_designs.has_personal_content` which carry compensation / RIF detail).
- **B5 pass** (no `embedded_master` rows in SWP).
- **B6 pass** (intra-domain relationships rich: 13 intra-master edges including the SWP backbone `workforce_plans ↦ headcount_plans ↦ position_demand_forecasts ↦ skills_gap_analyses` and `workforce_scenarios ↦ org_designs ↦ workforce_cost_projections`).
- **B7 pass** (every workflow-bearing master has a `users` actor edge: approves workforce_plans, sponsors headcount_plans, prepares forecasts / analyses, authors scenarios, designs org_designs, owns cost_projections. `labor_market_benchmarks` is config-shape so no human-actor edge expected).
- **B8 pass** (outbound cross-domain relationships present: `workforce_cost_projections feeds financial_plans` 1027, `workforce_scenarios drives hcm_positions` 1024, `org_designs proposes hcm_positions` 1025, `headcount_plans authorizes job_requisitions` 1022, `position_demand_forecasts triggers job_requisitions` 1023, `skills_gap_analyses prescribes learning_paths` 1026, `labor_market_benchmarks calibrates salary_bands` 1028).
- **B9 partial-fail** (5 trigger_events with empty `event_category` per Rule #13 enum: 384 `position_demand_forecast.updated`, 385 `skills_gap_analysis.completed`, 386 `workforce_scenario.approved`, 387 `org_design.published`, 388 `labor_market_benchmark.refreshed`. The 3 older events 11 / 40 / 61 carry `state_change`.).
- **B9b pass** (4 intra-domain `lifecycle_progression` handoffs loaded for the 4-module domain: 1146 demand-forecast to supply-planning, 1147 scenario-modeling to demand-forecast, 1148 scenario-modeling to cost-projections, 1149 demand-forecast to cost-projections via headcount.approved).
- **B10b in-scope partial-fail** (target_domain_module_id on inbound SWP rows: 0 NULLs , every SWP inbound row resolves a target module. SWP side clean; see B10b report-only below).
- **B10b report-only** (5 inbound handoffs carry NULL `source_domain_module_id` owed by source domains: 27, 10 (EPM), 136 (WFM), 241, 242 (SPM). 2 outbound carry NULL `target_domain_module_id` for EPM-side target (458, 16) because EPM is unmodularized , owed by EPM's b1 audit).
- **C1 pass** (Workforce Planning function owner; FP&A and Finance contributors).
- **C2 pass** (no business_function_capabilities overrides , capabilities align with the owner function).
- **D1 not run** (UI spot-check is per-fix; deferred to user).
- **E1 pass** (5 roles for a 4-module domain).
- **E2 pass** (every role spans >= 2 modules per the role_modules query).
- **E3 / E4 / E5 / E6 pass** (interaction_level set on every role_modules row; every role has a non-empty role_permissions bundle).
- **F1 + F2 hard fail.** SWP has 1 legacy domain-level system skill (`swp-system`, id 7, `domain_module_id=NULL`) and ZERO module-level system skills (Rule #17). Per F1 the legacy must retire once module skills exist; per F2 every `domain_modules` row needs exactly one `skill_type='system'` skill. Both are violated. The 14 skill_tools rows on the legacy skill (8 query, 3 mutate, 1 compute external `web_scrape`, plus 2 query rows on PA-mastered `people_kpis` and a `create_candidate` mutate) need to be re-anchored onto 4 new module-level system skills.
- **F3 pass via legacy only** (14 skill_tools on the legacy skill); F3 will need to pass per-module after F2 fix.
- **F4 pass** (all linked tools satisfy `operation_kind` invariants).
- **F5 uncomputable per-module** (F2 must be cured first).
- **F7 partial-fail.** 4 `skill_tools` rows carry populated notes (15 "Co-master with ATS"; 33 "Fires on headcount.approved -> ATS handoff"; 142 "Consumer from PA - attrition / fill-rate inputs"; 57 "Labor-market data ingestion fallback when no external_connector exists"). Per Rule #15 these are off-limits without per-row user approval. None of the 4 link a channel primitive (send_email / send_sms / etc.) so F7's specific channel-substitution rule does not apply; the issue is Rule #15 alone. Same boundary call as in HCM B2-S3.
- **H1 hard fail.** Of 28 cross-domain handoffs only 6 carry `handoff_processes` rows (12 `requisition.filled` -> 21698 substring; 400 same; 13 `attrition.forecast_updated` -> 10175 WRONG (Analyze customer attrition); 27 `financial_forecast.refreshed` -> 10773 substring; 241 `initiative.kickoff` -> 16 L2 too coarse; 242 `resource_allocation.committed` -> 10209 WRONG ("Determine sales resource allocation")). Catalog quality (headline): 0 approved. Process health side-bar: 0 `agent_curated`, layered-ownership process never fired on SWP. Volume expectation per H1: 0.5N to 0.8N for N=28 -> 14 to 22 agent_curated tags. Audit proposes 22 tags below in B1-S7. 2 of the existing 6 substring tags are flat-out wrong (13, 242) and queued for REPLACE.

SWP Semantius score (strict, current shape): cannot be computed per-module today (F2 fail). The legacy skill's tool slate is 13 of 14 `platform` and 1 `external` (`web_scrape`), so the score *would* be ~93% once F2 cures and the slate is split sensibly across the 4 modules.

**Rule #15 audit , broad pollution surface.** SWP carries the largest `notes` pollution surface yet seen in this audit batch:
- 11 `domain_data_objects` rows with populated `notes` (23-30 master rows clean; 31 job_requisitions, 53 hcm_positions, 57 financial_plans, 59 people_kpis, 906-912 employees / org_units / job_profiles / cost_centers / merit_cycles / salary_bands / attrition_forecasts).
- 9 `solution_domains` rows with populated `notes` (every loaded solution).
- 2 `data_objects.notes` populated: 25 `position_demand_forecasts` and 29 `labor_market_benchmarks` carry "Config-shaped; no workflow." style annotations. Per Rule #12 the config-shape exemption license to write `data_objects.notes` is RESCINDED.
- 6 `data_object_aliases` rows with populated `notes` (all 6 aliases on masters 25 / 26 / 29 / 30).
- 2 `handoffs.notes` populated (13 PA->SWP `attrition.forecast_updated`, 452 PA->SWP `attrition_forecast.published`; both annotate provenance / mastering context Rule #15 forbids).
- 4 `skill_tools.notes` populated (15, 33, 142, 57; see F7 above).
- 0 `domain_module_data_objects.notes` populated (clean).
**Total: 34 polluted notes rows.** Were any of these user-approved at load time? Surfaced as B2-S1.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **B9 missing event_category on 5 trigger_events** | trigger_events 384, 385, 386, 387, 388 have empty `event_category` (Rule #13 enum must be one of `lifecycle / state_change / threshold / signal`). All five are publication / completion / approval events on SWP masters. The convention used on `legal_contract.*`, `employment_contract.*`, and `hcm_position.*` is `state_change` for execute / approve / publish / refresh / expire transitions. | PATCH each: 384 `position_demand_forecast.updated` -> `state_change`; 385 `skills_gap_analysis.completed` -> `state_change`; 386 `workforce_scenario.approved` -> `state_change`; 387 `org_design.published` -> `state_change`; 388 `labor_market_benchmark.refreshed` -> `state_change`. Convention question on 388 surfaces in B2-S2 (refresh may also read as `threshold` if it gates assumption updates). |
| B1-S2 | **F1 + F2 hard fail: legacy domain-level system skill plus zero module skills** | `swp-system` (id 7, `domain_module_id=NULL`) sits at domain level with 14 `skill_tools` rows. None of the 4 SWP modules has a module-level system skill (F2 requires exactly one per module). The legacy skill is the only `skill_type='system'` row for SWP, blocking F2 and triggering F1 once module skills exist. | Author 4 new `skill_type='system'` skills, one per module: `swp_demand_forecast_agent` on 94, `swp_supply_planning_agent` on 95, `swp_scenario_modeling_agent` on 96, `swp_cost_projections_agent` on 97. Re-anchor the 14 existing `skill_tools` rows onto the new skills per the master each tool reads / writes (rows on `workforce_plans` 23 / `workforce_scenarios` 27 / `org_designs` 28 / `labor_market_benchmarks` 29 -> 96; rows on `headcount_plans` 24 / `position_demand_forecasts` 25 / `skills_gap_analyses` 26 / `job_requisitions` 1 / `people_kpis` 43 -> 94; rows for supply queries -> 95; row on `workforce_cost_projections` 30 -> 97). DELETE the legacy `swp-system` skill row after relocation. Loader: 4 system-skill inserts + 14 skill_tools relocate + 1 DELETE. |
| B1-S3 | **B10b report-only (NULLs owed by other domains)** | 5 inbound handoffs carry NULL `source_domain_module_id` owed by source domains: 27 (EPM, `financial_forecast.refreshed`), 10 (EPM, `financial_budget.cycle_started`), 136 (WFM, `actuals.posted`), 241 (SPM, `initiative.kickoff`), 242 (SPM, `resource_allocation.committed`). 2 outbound carry NULL `target_domain_module_id` owed by target domains: 458 (EPM, `workforce_scenario.approved`), 16 (EPM, `cost_projection.approved`). EPM is unmodularized today, so the EPM-side NULLs are pre-modularization defects, not SWP's fix to make. | Schedule b1 audits on EPM, WFM, SPM (or wait for catalog-wide b2 sweep) to populate these. Not SWP's fix. |
| B1-S4 | **Pairwise, downstream domains missing consumer DMDOs (report-only)** | SWP publishes 14 outbound cross-domain handoffs but the target side does not consistently declare consumer DMDOs on SWP-mastered payloads. HCM declares consumer on SWP `position_demand_forecasts` / `workforce_scenarios` / `org_designs` (already declared via DDO rollups), but the EPM consumer DMDOs on `workforce_scenarios` (458) and `workforce_cost_projections` (16) are NULL because EPM has no modules. ATS declares contributor / consumer on the `position_demand_forecasts` payload (455 -> ATS-RECRUITMENT-PIPELINE 4). SKILLS-MGMT side of 456 (`skills_gap_analyses` -> 174) needs verification. COMP-MGMT side of 460 (`labor_market_benchmarks` -> 80) declared via the existing consumer DMDO. | Schedule b1 audits on EPM and SKILLS-MGMT to confirm consumer DMDOs on SWP-mastered payloads. Not SWP's fix. |
| B1-S5 | **Rule #15 pollution on 34 rows across 6 tables (massive surface)** | 11 `domain_data_objects.notes` + 2 `data_objects.notes` (25, 29 with "Config-shaped" annotations per the rescinded Rule #12 license) + 9 `solution_domains.notes` (every loaded solution) + 6 `data_object_aliases.notes` + 2 `handoffs.notes` (13, 452) + 4 `skill_tools.notes` (15, 33, 142, 57). Per Rule #15 the default on every `notes` column is empty unless the user explicitly approved the specific text at load time. The DDO 31 (job_requisitions, Signal-1 narration), DDO 53 (hcm_positions contributor reasoning), and DDO 57 (financial_plans contributor reasoning) read like user-authored editorial; the others read like loader auto-populated mechanical context. | Surface to user (B2-S1). Default on auto-populated: PATCH all 34 rows' `notes` to empty string and append a Rule #15 incident entry to `references/skill-changelog.md`. |
| B1-S6 | **Cross-bucket dependency: B4 pattern-flag re-evaluation on `workforce_scenarios` and `org_designs`** | `workforce_scenarios.has_personal_content=false` and `org_designs.has_personal_content=false`. Both carry RIF / restructure detail that often includes named-position layoffs or named org leaders pre-announcement. `workforce_cost_projections.has_personal_content=false` is similar (compensation projections per role and band). The flag governs PII access controls. Per Rule #12 audit MUST positively re-evaluate, false-by-default is not the same as false-after-review. | Surface to user (B2-S3). Likely answer: flip `has_personal_content=true` on 27, 28, 30. PATCH only after user OK. |
| B1-S7 | **H1, APQC TAGGING** | Of 28 cross-domain handoffs only 6 carry `handoff_processes` rows; 0 `agent_curated`; 0 `record_status='approved'`. Two existing tags are wrong (13, 242) and need REPLACE; 4 existing tags (12, 400, 27, 241) are roughly correct but warrant `agent_curated` REPLACE for confidence. The remaining 22 need INSERT. Volume target per H1: 14 to 22 agent_curated tags for N=28; this audit proposes 22 + 2 REPLACE corrections. | INSERT / REPLACE `handoff_processes` rows per the table below. Each new row: `(handoff_id, process_id, proposal_source='agent_curated', record_status='new', role='implements')`. PCF `process_id` resolved at fix time via `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry`. |
| B1-S8 | **Pairwise, ATS co-mastering posture (Section 5 follow-up)** | ATS DMDO on `job_requisitions` is `master + required` on ATS-RECRUITMENT-PIPELINE; SWP DMDO is `contributor + required` on SWP-DEMAND-FORECAST. The two co-master on the same `data_object_id` via the Signal-1 contract (SWP authorizes, ATS executes). Per Rule #7 M7 single-master integrity, the catalog-wide constraint is "exactly one `role='master'` row" , having SWP at `contributor` is the correct resolution today. **However**: the `headcount.approved` event 62 has `data_object_id=1` (job_requisitions) and `source_domain_module_id=94` (SWP-DEMAND-FORECAST). The event publisher is SWP but the master is ATS , per Rule B10b the source attribution should be the module that *masters* the payload. **Question:** is this an exception that Signal-1 co-mastering legitimately licenses (SWP fires the event ON behalf of the soon-to-be-created requisition), or should the trigger_event re-anchor to ATS-RECRUITMENT-PIPELINE? Inverse argument: handoff 14 (SWP -> ATS on headcount.approved) implies the event MUST fire in SWP because ATS is the receiver. | Surface to user (B2-S4). Recommended posture: keep as-is, document the Signal-1 exception by adding the `headcount.approved` event description to the audit conversation log (not to `notes` per Rule #15). |

#### B1-S7 APQC TAGGING (proposed candidates)

H1 is a single Bucket 1 item even though it proposes ~24 row writes. Counts as one B1 row in the bucket summary.

**Strategy.** SWP's outbound cross-domain handoffs all fire from workforce-planning state changes; the right L2 ancestor is APQC PCF "Manage workforce planning" (10532 L3 under 10487 "Plan and acquire human capital" L2). For HCM-targeted rows the L3 cluster is "Manage workforce planning"; for ATS-targeted the L3 is "Recruit employees" (10539); for EPM the L3 is "Perform planning / management accounting" or "Manage workforce planning" depending on payload; for COMP-MGMT the L3 is "Develop and manage rewards" (10511); for SKILLS-MGMT the L3 is "Develop and manage skills and capabilities" (10545). Confidence levels per row.

**Outbound (SWP-published, target = downstream domain):**

| handoff_id | source -> target (module -> domain) | trigger_event | Proposed PCF row | Confidence |
|---|---|---|---|---|
| 14 | SWP-DEMAND-FORECAST -> ATS | `headcount.approved` | Recruit employees / Manage employee requisitions (10539 L3) | confident L3 |
| 15 | SWP-SCENARIO-MODELING -> HCM | `hcm_position.approved_for_creation` | Manage organisational changes (10519 L4) | confident L4 |
| 16 | SWP-COST-PROJECTIONS -> EPM | `cost_projection.approved` | Manage workforce planning (10532 L3) or Perform planning/management accounting (10742 L3) | medium |
| 454 | SWP-DEMAND-FORECAST -> HCM | `position_demand_forecast.updated` | Manage workforce planning (10532 L3) | confident L3 |
| 455 | SWP-DEMAND-FORECAST -> ATS | `position_demand_forecast.updated` | Recruit employees (10539 L3) | confident L3 |
| 456 | SWP-DEMAND-FORECAST -> SKILLS-MGMT | `skills_gap_analysis.completed` | Develop and manage skills and capabilities (10545 L3) | confident L3 |
| 457 | SWP-SCENARIO-MODELING -> HCM | `workforce_scenario.approved` | Manage workforce planning (10532 L3) | confident L3 |
| 458 | SWP-SCENARIO-MODELING -> EPM | `workforce_scenario.approved` | Manage workforce planning (10532 L3) | confident L3 |
| 459 | SWP-SCENARIO-MODELING -> HCM | `org_design.published` | Manage organisational changes (10519 L4) | confident L4 |
| 460 | SWP-SCENARIO-MODELING -> COMP-MGMT | `labor_market_benchmark.refreshed` | Develop and manage rewards, recognition, and motivation programs (10511 L3) | confident L3 |

**Inbound (SWP-received, source = upstream domain):**

| handoff_id | source -> target (domain -> module) | trigger_event | Proposed PCF row | Confidence |
|---|---|---|---|---|
| 11 | HCM -> SWP-DEMAND-FORECAST | `headcount.actuals_updated` | Manage workforce planning (10532 L3) | confident L3 |
| 12 | ATS -> SWP-DEMAND-FORECAST | `requisition.filled` (position_demand_forecasts payload) | existing 21698 `Manage employee requisitions` is reasonable; REPLACE as `agent_curated` to confirm | confident L3 |
| 400 | ATS -> SWP-DEMAND-FORECAST | `requisition.filled` (job_requisitions payload) | same as 12; REPLACE as `agent_curated` | confident L3 |
| 13 | PA -> SWP-DEMAND-FORECAST | `attrition.forecast_updated` | **REPLACE WRONG TAG**: existing `Analyze customer attrition and retention rates` (10175 L4) is wrong context (customer, not workforce). Correct: Manage workforce metrics / Track attrition (10544 L3) | confident L3 |
| 452 | PA -> SWP-DEMAND-FORECAST | `attrition_forecast.published` | Manage workforce metrics (10544 L3) | confident L3 |
| 27 | EPM -> SWP-DEMAND-FORECAST | `financial_forecast.refreshed` | existing 10773 `Prepare periodic financial forecasts` L4 reasonable; REPLACE as `agent_curated` | confident L4 |
| 10 | EPM -> SWP-DEMAND-FORECAST | `financial_budget.cycle_started` | Develop and maintain budgets (10741 L3) | confident L3 |
| 1138 | COMP-MGMT -> SWP-COST-PROJECTIONS | `compensation_benchmark.refreshed` | Develop and manage rewards (10511 L3) | confident L3 |
| 136 | WFM -> SWP-COST-PROJECTIONS | `actuals.posted` (time_entries) | Manage payroll (10539 L3) or Track time (subprocess of 10544) | medium |
| 241 | SPM -> SWP-SCENARIO-MODELING | `initiative.kickoff` | existing 16 L2 `Develop and measure strategic initiatives` too coarse; tighter: Develop and review business strategy (10018 L3) | medium L3 |
| 242 | SPM -> SWP-DEMAND-FORECAST | `resource_allocation.committed` | **REPLACE WRONG TAG**: existing `Determine sales resource allocation` (10209 L4) is wrong context. Correct: Manage workforce planning (10532 L3) | confident L3 |
| 1112 | PA -> SWP-SUPPLY-PLANNING | `workforce_segment.composition_changed` | Manage workforce planning (10532 L3) | confident L3 |
| 1018 | PSA -> SWP-SUPPLY-PLANNING | `project_assignment.released` | Manage project resources (10773 L3) | confident L3 |
| 1027 | PSA -> SWP-DEMAND-FORECAST | `resource_skill_inventory.gap_identified` | Develop and manage skills and capabilities (10545 L3) | confident L3 |

**Intra-domain (lifecycle_progression):** 4 rows (1146, 1147, 1148, 1149). Intra-domain handoffs typically don't require PCF tagging (no cross-domain process to map). Excluded from H1 count.

**Total H1 candidates:** 24 cross-domain rows (10 outbound + 14 inbound). Of these, 4 are REPLACE (12, 400, 27, 241 as `agent_curated` confirmation), 2 are REPLACE-CORRECTION (13, 242 with wrong existing tags), 18 are INSERT.

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| STRUCTURAL (B9 event_category) | 1 (B1-S1) |
| STRUCTURAL (F1 + F2 hard fail) | 1 (B1-S2) |
| B10b report-only (owed by other domains) | 1 (B1-S3) |
| Pairwise consumer DMDOs report-only | 1 (B1-S4) |
| Rule #15 incident (notes pollution) | 1 (B1-S5) |
| B4 pattern-flag re-evaluation | 1 (B1-S6) |
| APQC TAGGING (H1) | 1 (B1-S7) |
| Pairwise Signal-1 co-master attribution | 1 (B1-S8) |
| MODULARIZATION ISSUES | 0 (route to Bucket 2) |
| **Bucket 1 total** | **8** items |

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation)

**ATS <-> SWP (weight 12).** Wired pairs: 4 (2 outbound: 14, 455; 2 inbound: 12, 400). Section 2: clean (all module FKs populated on both sides). Section 3: Signal-1 contract intact , `headcount.approved` -> ATS authorizes requisition execution, `requisition.filled` -> SWP plan refresh on fill. Possible missing handoff: SWP -> ATS on `skills_gap_analysis.completed` for sourcing priority shift, currently fires to SKILLS-MGMT only via 456; surface as B2-S5. Section 4: ATS masters `job_requisitions` 1; SWP contributor on 1 (Signal-1 co-master). Section 5: `headcount_plans authorizes job_requisitions` 1022, `position_demand_forecasts triggers job_requisitions` 1023 , both wired as `data_object_relationships`. Clean.

**HCM <-> SWP (weight 10).** Wired pairs: 5 (4 outbound: 15, 454, 457, 459; 1 inbound: 11). Section 2: clean (all module FKs populated). Section 3: SWP consumer DMDOs on `employees`, `org_units`, `job_profiles`, `hcm_positions` all declared on the right modules. Section 4: SWP contributor on `hcm_positions` 32 (DDO 53), but module-level DMDO 424 (SWP-DEMAND-FORECAST), 430 (SWP-SUPPLY-PLANNING), 448 (SWP-COST-PROJECTIONS) all sit as `consumer + required`, not contributor. The contributor designation lives only at the DDO rollup. Acceptable per the rollup-vs-module-level pattern (contributor at domain reflects the org_design -> hcm_position proposal flow handoff 15); surface as a discussion only. Section 5: `workforce_scenarios drives hcm_positions` 1024, `org_designs proposes hcm_positions` 1025 , both wired. Clean.

**EPM <-> SWP (weight 7).** Wired pairs: 5 (2 outbound 16, 458; 3 inbound 27, 10 , wait, that is 2; plus financial_plans rollup). Section 2: 458 and 16 have NULL `target_domain_module_id` (B1-S3, EPM unmodularized). 27, 10 have NULL `source_domain_module_id` (same). Section 3: SWP contributor on `financial_plans` 37 (DMDO 443, contributor + optional) realized via handoff 16; clean. Section 4: SWP DMDO does not mirror EPM-mastered `financial_budgets` or `financial_forecasts` as consumer , handoffs 10 / 27 imply this DMDO should exist. Surface as B2-S5. Section 5: `workforce_cost_projections feeds financial_plans` 1027 wired.

**PA <-> SWP (weight 5).** Wired pairs: 3 (0 outbound, 3 inbound 13, 452, 1112). Section 2: 13, 452 are wired; 1112 wired. Section 3: SWP consumer on `attrition_forecasts` 42 (DMDO 423 SWP-DEMAND-FORECAST, 433 SWP-SUPPLY-PLANNING , required), consumer on `people_kpis` 43 (DMDO 441 SWP-SCENARIO-MODELING optional). Clean. Section 4: clean. Section 5: relationship rows on PA masters not modeled in SWP cross-relationships (PA is a downstream consumer of SWP signals); clean.

**COMP-MGMT <-> SWP (weight 4).** Wired pairs: 2 (1 outbound 460, 1 inbound 1138). Section 2: clean. Section 3: SWP consumer on `salary_bands` 154, `merit_cycles` 155 (DMDO 444, 445, 910, 911 , optional). Clean. Section 4: COMP-MGMT consumer on `labor_market_benchmarks` 29 declared via DMDO on COMP-MGMT side (target_domain_module_id=80 on handoff 460 implies the consumer row exists in COMP-MGMT module 80). Section 5: `labor_market_benchmarks calibrates salary_bands` 1028 wired.

**Lighter neighbors (weight 1-2, one-line summaries):**

- **SKILLS-MGMT <-> SWP (1).** Outbound 456 `skills_gap_analysis.completed` fully wired (target_module 174 set). Section 5: `skills_gap_analyses prescribes learning_paths` 1026 wired. Verify SKILLS-MGMT side declares consumer on `skills_gap_analyses` in its b1 audit.
- **WFM <-> SWP (2).** Inbound 136 NULL source_module; SWP-COST-PROJECTIONS consumer on `time_entries` not declared (could be intentional , WFM time data probably aggregated upstream of SWP). Surface as B2-S5.
- **SPM <-> SWP (2).** Inbounds 241, 242 NULL source_module; SWP DMDOs on SPM `strategic_initiatives` / `resource_allocations` not declared. B1-S3 covers source NULLs; consumer DMDO question surfaces in B2-S5.
- **PSA <-> SWP (2).** Inbounds 1018 (project_assignments -> SWP-SUPPLY-PLANNING) and 1027 (resource_skill_inventories -> SWP-DEMAND-FORECAST) wired on source side; SWP DMDOs not declared. Surface as B2-S5.

**In-scope mechanical adds derived from pairwise (Bucket 1):** none surface a clear mechanical INSERT this audit owns (the PSA / SPM / WFM consumer DMDO question is a judgment call per B2-S5).

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Rule #15 notes-pollution on 34 rows across 6 tables.** The polluted rows include: 11 `domain_data_objects` rows (5 of which read like user-authored Signal-1 context: DDO 31 job_requisitions, 53 hcm_positions, 57 financial_plans, 23 master rows already clean); 2 `data_objects.notes` (25, 29 with "Config-shaped; no workflow" annotations per the now-rescinded Rule #12 license); 9 `solution_domains.notes` (every solution row's coverage_level rationale); 6 `data_object_aliases.notes` (synonym-source context); 2 `handoffs.notes` (13, 452 provenance prose); 4 `skill_tools.notes` (F7-shaped justifications). Were these user-approved at load time, or auto-populated by the loaders? | Cannot tell from audit alone; load-time approval status unknown. The DDO 31 / 53 / 57 rows are detailed enough that they likely reflect user authoring. The 906-912 rows on cross-domain consumer DMDOs read more like loader auto-population (consistent template phrasing). The `data_objects.notes` "Config-shaped" annotations are categorically a Rule #12 rescinded license. | (a) Confirm user-approved at load time on specific rows; leave those in place, surface which to revert. (b) Confirm auto-populated; PATCH all 34 rows' `notes` to empty string and log the Rule #15 incident per the audit obligation in `references/skill-changelog.md`. (c) Hybrid: PATCH `data_objects.notes` on 25, 29 to empty (categorically off-limits per Rule #12 rescission); decide per-row on the other categories. |
| B2-S2 | **B9 event_category convention for `labor_market_benchmark.refreshed` (388).** The default proposal in B1-S1 is `state_change`. Alternative: `threshold` , labor-market data refresh is the trigger for re-evaluating compensation bands and plan assumptions, more like an external signal crossing a threshold than a state machine transition. The 388 event is published when the upstream data feed arrives, not when an internal state advances. | Convention-choice question; the right answer informs downstream tagging coherence with COMP-MGMT and EPM consumers. | (a) `state_change` (the default; refresh treated as a transition on `labor_market_benchmarks`). (b) `threshold` (refresh treated as an external-signal arrival, more accurate to the workflow). |
| B2-S3 | **B4 pattern-flag positive re-evaluation per Rule #12.** Current flags on SWP masters: `workforce_plans` has_submit_lock + has_single_approver = true; `headcount_plans` same; `position_demand_forecasts` all false (config-shape); `skills_gap_analyses` all false (questionable; the analysis often contains skill-by-skill named-employee gaps); `workforce_scenarios` has_submit_lock + has_single_approver = true, has_personal_content=false (questionable; RIF scenarios identify reduction candidates by name); `org_designs` has_submit_lock + has_single_approver = true, has_personal_content=false (questionable; pre-publication org redesigns often include named-position changes); `labor_market_benchmarks` all false (config-shape, correct); `workforce_cost_projections` has_submit_lock + has_single_approver = true, has_personal_content=false (questionable; projections per role and band can be reverse-engineered to named compensation). Per Rule #12 the audit MUST positively re-evaluate. | Pattern flags are workflow-shape judgments the user owns. | Per-flag yes/no from user. Likely answers: flip `has_personal_content=true` on 27 workforce_scenarios, 28 org_designs, 30 workforce_cost_projections; maybe also 26 skills_gap_analyses. Capture decisions; PATCH after OK. |
| B2-S4 | **Signal-1 co-master attribution on `headcount.approved` (event 62).** The trigger_event has `data_object_id=1` (job_requisitions, ATS-mastered) but `source_domain_module_id=94` (SWP-DEMAND-FORECAST) on handoffs 14, 1149. Per B10b derivation the source attribution should be the module that *masters* the payload (ATS-RECRUITMENT-PIPELINE). However Signal-1 co-mastering legitimately licenses SWP to fire requisition-creation events from its planning side. Two consistent shapes: (a) keep as-is (SWP authors the event because SWP gate-keeps the approval), (b) re-anchor source to ATS-RECRUITMENT-PIPELINE (the master, per the strict B10b rule). | Architectural intent on the Signal-1 contract; user owns the call. | (a) Keep as-is, formalize the Signal-1 exception in audit notes (not in `notes` column per Rule #15). (b) Re-anchor source to ATS-RECRUITMENT-PIPELINE; update handoff 14 source_module. Mechanical PATCH. |
| B2-S5 | **Missing consumer DMDOs on cross-domain payloads.** SWP receives 5 inbound handoffs whose payload data_objects are not declared at module level: 10 (`financial_plans` 38 -- wait, 10's payload is `workforce_plans` 23 itself, scratch); 27 (`workforce_plans` 23, scratch , also SWP-mastered); 136 (WFM `time_entries` 162 not declared); 241 (SPM `strategic_initiatives` 274 not declared); 242 (SPM `resource_allocations` 277 not declared); 1018 (PSA `project_assignments` 218 not declared); 1027 (PSA `resource_skill_inventories` 725 not declared). The first two have SWP-mastered payloads (legitimate intra-SWP signals from EPM), but the WFM / SPM / PSA payloads imply SWP should declare consumer DMDOs to capture the dependency. Additionally, SWP outbound to ATS on `skills_gap_analysis.completed` is not modeled (only fires to SKILLS-MGMT today). | Architectural intent on the dependency graph; user decides what's worth capturing. | Per-DMDO yes/no from user. Likely answer: declare consumer on `time_entries`, `strategic_initiatives`, `resource_allocations`, `project_assignments`, `resource_skill_inventories` where the dependency is durable, skip where the dependency is one-off. Also: author the SWP-DEMAND-FORECAST -> ATS handoff on `skills_gap_analysis.completed` if internal-sourcing prioritization is part of the contract. |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran semantic enumeration against eQ8 (pure-play), OrgVue (pure-play org-design + planning), Visier Plan (pure-play), Anaplan Workforce Planning (Connected Planning use case), Pigment Workforce, Workday Adaptive Planning (Workforce module), Workday HCM (native), SAP SuccessFactors Workforce Planning, Oracle Strategic Workforce Planning, ChartHop, Beqom Workforce Planning, plus labor-intel adjuncts TalentNeuron, Lightcast, Eightfold AI Talent Intelligence.

The subagent recipe was not spawned (single-pass audit per orchestrator instruction); the candidates below come from the analyst's flagship-vendor knowledge. Each is a candidate market gap for Phase 0 verification, not a vetted finding.

#### MISSING entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `workforce_segments` | Workday Adaptive Workforce, Visier Plan, eQ8 all model workforce segments (job family / location / tenure / persona) as first-class records that scenarios pivot against. PA partially carries it (handoff 1112 implies a PA-side `workforce_segments` master 44 exists). SWP likely needs a consumer DMDO if PA is the master, or its own consumer (B2-S5 covers part of this). | SWP-SUPPLY-PLANNING (consumer on PA-mastered 44) OR own master if PA segments are PA-analytics-specific |
| `attrition_drivers` | Visier Plan and eQ8 model attrition-driver scenarios separately from `attrition_forecasts` (the forecast itself), to support what-if modeling (e.g., "if we raise comp 5%, attrition forecast shifts X%"). Currently only `attrition_forecasts` exists in PA. | SWP-SCENARIO-MODELING (master, if SWP owns scenario-side driver modeling) |
| `succession_plans` (consumer or contributor) | Workday Talent Management and SAP SuccessFactors Succession & Development hold succession plans; SWP scenario modeling reads them as supply-side talent-pipeline signals (B-grade headcount + ready-now successor counts feed scenario assumptions). Today SWP has no edge to TALENT-MGMT. | SWP-SUPPLY-PLANNING (consumer on TALENT-MGMT-mastered `succession_plans`) |
| `internal_mobility_intents` | Eightfold AI, Workday Skills Cloud surface employee internal-mobility intent (employee-flagged interest in role X) as a planning input , supply side beyond current-role headcount. Currently no such entity in any SWP-adjacent domain. | SWP-SUPPLY-PLANNING (consumer if mastered elsewhere) OR new candidate market entity |
| `location_strategy_plans` (cost / geography) | OrgVue, eQ8 model location strategy (which cities, what mix of remote / onshore / nearshore / offshore) as a separate planning artifact distinct from `org_designs`. SWP carries `workforce_scenarios` and `org_designs` but no explicit location-strategy entity. | SWP-SCENARIO-MODELING (master), or surface in the `workforce_scenarios` shape itself |

#### MODULARIZATION candidates

- **SWP-WORKFORCE-INTEL or SWP-LABOR-MARKET module.** Currently `labor_market_benchmarks` is mastered inside SWP-SCENARIO-MODELING (DMDO 438), which is the right phasing for small loads. If `talent_intelligence_signals` / `external_workforce_indices` / `location_strategy_plans` get loaded, a fifth module dedicated to external workforce intelligence would isolate the externally-sourced data plane from internal scenario modeling. Probably premature today.
- **SWP-PLAN-RECONCILIATION as its own module candidate.** The capability `SWP-PLAN-RECONCILIATION` is hosted on SWP-SUPPLY-PLANNING (DMC for 95 declares it). The "plan-to-actual" surface (`plan_variances`, `forecast_accuracy_metrics`, `replan_triggers`) is conceptually distinct from supply modeling. If reconciliation grows beyond the supply module, surface as a candidate split.

#### Compliance regulation candidates (no entity proposed)

- **EU Pay Transparency Directive (2026 enforcement).** SWP-COST-PROJECTIONS produces compensation projections by job and band; the directive requires structured pay-equity analyses linked to planning artifacts. Currently SWP has zero regulations linked; the directive plausibly fits SWP via the projections layer (and is already linked to HCM in the HCM audit).
- **WARN Act (US).** Mass-layoff scenarios in `workforce_scenarios` (reduction-mode) trigger WARN-Act notification obligations at 100+ headcount cuts in a site. WARN is HCM-adjacent today but SWP scenarios are where the reduction is *modeled*; possibly a regulation linkage on SWP itself.
- **State workforce-disclosure requirements (CA SB 1162, NYC AI bias audits).** Pay-band publication and AI-decision bias audits touch SWP-COST-PROJECTIONS and SWP-SUPPLY-PLANNING (skills-gap analyses that drive hiring decisions). Speculative; verify in Phase 0.

#### Candidate-domain queue

This audit surfaced 0 domain-tier candidates for `audits/_missing-domains.md`. The MISSING entities above are all extensions of SWP or its existing neighbors (PA, TALENT-MGMT, SKILLS-MGMT) rather than new domains.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (producing a Phase 0 markdown at `c:/tmp/SWP-phase0-2026-05-30.md` confirming per-entity vendor coverage) or eyeball-mode (user names which of the 5 candidates + 3 regulation candidates + 2 modularization candidates to treat as confirmed and we proceed via Phase B inserts).

### Cross-bucket dependencies

- **B1-S1 (B9 event_category PATCH)** is independent of all other B1 items EXCEPT for the 388 row, which depends on B2-S2 (state_change vs threshold convention).
- **B1-S2 (F1 + F2 fix)** is the largest in-scope item and independent of every other bucket. Reshaping 14 skill_tools across 4 new system skills.
- **B1-S5 (Rule #15 pollution revert)** is gated on B2-S1 (per-row user approval status).
- **B1-S6 (B4 pattern-flag flips)** is gated on B2-S3 (per-flag user decision).
- **B1-S7 (APQC tagging)** is independent of B1-S1 (PCF L3 picks don't depend on event_category enum values).
- **B1-S8 (Signal-1 attribution)** is gated on B2-S4 (keep-as-is vs re-anchor decision).
- **B3 candidates** (`workforce_segments`, `attrition_drivers`, etc.) might inform B2-S5 (consumer DMDO question on PA-mastered `workforce_segments`). Surface-time callout per the discipline.
- Buckets 2 and 3 are otherwise independent of each other; you can resolve them in any order.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S1, S2, S7`), or `skip`.

- **S1 (B9 event_category PATCH on 5 events)** is structural; one PATCH each. Mostly mechanical except for 388 which depends on B2-S2.
- **S2 (F1 + F2 fix: 4 new system skills + 14 skill_tools relocate + 1 legacy DELETE)** is structural; medium-size loader. Independent.
- **S3 (B10b report-only inbound NULLs)** schedules 3 other-domain audits (EPM, WFM, SPM); not SWP's fix.
- **S4 (Pairwise consumer DMDOs on downstream domains)** schedules audits on EPM and SKILLS-MGMT; not SWP's fix.
- **S5 (Rule #15 notes-pollution on 34 rows)** is gated on B2-S1 decision.
- **S6 (B4 pattern-flag flips)** is gated on B2-S3 decision.
- **S7 (~24 APQC tags: 18 INSERT, 4 REPLACE confirmation, 2 REPLACE wrong-tag correction)** load now or in a follow-up batch?
- **S8 (Signal-1 attribution decision on headcount.approved)** is gated on B2-S4.

**Bucket 2, what's your call on each?** Wait for per-item decisions before acting.

- **B2-S1 (Rule #15 notes-pollution on 34 rows):** confirm auto-populated -> revert, or confirm user-approved -> leave in place per row.
- **B2-S2 (event_category convention for 388 `labor_market_benchmark.refreshed`):** (a) state_change, (b) threshold.
- **B2-S3 (pattern-flag re-evaluation on 4 masters):** per-flag yes/no on `workforce_scenarios.has_personal_content`, `org_designs.has_personal_content`, `workforce_cost_projections.has_personal_content`, `skills_gap_analyses.has_personal_content`.
- **B2-S4 (Signal-1 attribution on headcount.approved):** (a) keep as-is, (b) re-anchor source_module to ATS-RECRUITMENT-PIPELINE.
- **B2-S5 (missing consumer DMDOs + missing handoff to ATS on skills_gap):** per-DMDO yes/no on `time_entries` / `strategic_initiatives` / `resource_allocations` / `project_assignments` / `resource_skill_inventories`; plus go/no-go on the SWP -> ATS skills_gap handoff.

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 5 entity candidates + 3 regulation candidates + 2 modularization candidates to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| EPM | Populate `source_domain_module_id` on inbounds 27, 10 once EPM is modularized. Populate `target_domain_module_id` on outbounds 458, 16. Declare consumer DMDOs on `workforce_scenarios` (27) and `workforce_cost_projections` (30) when EPM ships its modules. |
| WFM | Populate `source_domain_module_id` on inbound 136 (`actuals.posted` -> SWP-COST-PROJECTIONS). |
| SPM | Populate `source_domain_module_id` on inbounds 241 (initiative.kickoff), 242 (resource_allocation.committed). Declare master on `resource_allocations` 277 and `strategic_initiatives` 274 if SPM holds them. |
| PSA | Confirm `source_domain_module_id` set on 1018 (87), 1027 (87) , looks populated. Verify SWP can declare consumer on `project_assignments` 218 and `resource_skill_inventories` 725 (gated on B2-S5). |
| PA | Confirm `source_domain_module_id` set on 13, 452, 1112 , all populated (83, 83, 81). Clean. |
| HCM | Confirm `source_domain_module_id` set on 11 (54) , populated. Clean. The headcount.actuals_updated inbound carries `target_module=94`, looks clean. |
| ATS | Confirm `source_domain_module_id` set on 12, 400 (4 on both) , populated. Clean. |
| COMP-MGMT | Confirm `source_domain_module_id` set on 1138 (80) , populated. Clean. |
| SKILLS-MGMT | Confirm consumer DMDO declared on `skills_gap_analyses` 26 in SKILLS-MGMT module 174 (target of handoff 456). Not visible from SWP's pass. |

## 2026-05-31, Continuation: B1 technical fixes

Loader: `.tmp_deploy/fix_swp_b1_technical_2026_05_31.ts` (run from project root).

### Applied (technical-only subset of Bucket 1)

- **B1-S1 (partial):** PATCHed `event_category='state_change'` on 4 of 5 trigger_events: 384 `position_demand_forecast.updated`, 385 `skills_gap_analysis.completed`, 386 `workforce_scenario.approved`, 387 `org_design.published`. Row 388 `labor_market_benchmark.refreshed` DEFERRED (gated on B2-S2 state_change vs threshold convention).
- **B1-S5 (Rule #15 notes-pollution revert):** PATCHed `notes=''` on 30 rows the audit pre-specifies with row IDs:
  - `domain_data_objects` 31, 53, 57, 59, 906, 907, 908, 909, 910, 911, 912 (11 rows).
  - `data_objects` 25, 29 (2 rows; Rule #12 config-shape license is RESCINDED so these are categorical reverts).
  - `data_object_aliases` 513, 514, 515, 516, 517, 518 (6 rows on masters 25/26/29/30).
  - `handoffs` 13, 452 (2 rows).
  - `solution_domains` 515, 516, 517, 518, 519, 520, 521, 522, 523 (9 rows).
  - Live verification reduced the audit's 34-row target to 30: `skill_tools` id 15 not present in the catalog; ids 33, 57, 142 had already-empty notes. F7 surface is therefore clean today; the audit pollution count for skill_tools should be recorded as 0, not 4.
- **B1-S7 (partial):** PATCHed `proposal_source='agent_curated'` on 3 existing `handoff_processes` rows where the live PCF link already matches the audit's recommendation:
  - id 48: handoff 12, process 219 (Manage employee requisitions).
  - id 49: handoff 400, process 219 (same).
  - id 115: handoff 27, process 1324 (Prepare periodic financial forecasts).

### Deferred (not in the technical-fix scope)

- **B1-S1 row 388** (gated on B2-S2 convention question).
- **B1-S2 (F1 + F2 fix):** new skills, skill_tools relocations, and a legacy-skill DELETE are out-of-scope for a technical-only pass; gated on user (introduces new entities).
- **B1-S3, B1-S4:** report-only NULLs owed by EPM, WFM, SPM, and downstream consumer DMDOs owed by EPM and SKILLS-MGMT. Not SWP's fix.
- **B1-S6 pattern-flag flips** on `workforce_scenarios`, `org_designs`, `workforce_cost_projections`, `skills_gap_analyses` (gated on B2-S3).
- **B1-S7 remaining 21 H1 rows** (18 INSERT + 2 REPLACE-CORRECTION on handoffs 13 and 242 + 1 REPLACE-CONFIRMATION on handoff 241). Reason: the audit's pre-specified APQC external_ids do not resolve to the named processes in the live `/processes` catalog. Verified resolutions:
  - 10532 -> "Deliver employee communications" (NOT "Manage workforce planning"). Live catalog has `Perform strategic workforce planning` at external 21693 (id 980, L4) and `Develop and implement workforce planning, policies, and strategies` at external 17045 (id 216, L3); audit names neither.
  - 10519, 10539, 10545, 10544 -> not found in catalog.
  - 10742 -> "Process customer credit" (NOT a workforce / management-accounting PCF).
  - 10511 -> "Review compensation plan" L4 (NOT L3 "Develop and manage rewards").
  - 10018 -> "Survey market and determine customer needs and wants" (NOT "Develop and review business strategy").
  - 10773 -> L4 "Prepare periodic financial forecasts" (already linked to handoff 27, used in the S-7 confirmation).
  Per the technical-fix rule "INSERT/PATCH handoff_processes only when audit pre-specifies handoff_id + resolvable PCF (verify before insert)", all 21 are deferred. Re-tagging requires either a fresh PCF lookup pass per handoff or user re-specification with correct external_ids.
- **B1-S8 Signal-1 attribution** on event 62 (gated on B2-S4).

### Verification (post-run)

- `/trigger_events?id=in.(384,385,386,387)&event_category=eq.state_change` returns 4 rows; 388 still `event_category=''`.
- Per-table `notes=neq.` queries on the 5 revert blocks return 0 rows.
- `/handoff_processes?id=in.(48,49,115)&proposal_source=eq.agent_curated` returns 3 rows.

UI spot-check entry points:
- https://tests.semantius.app/domain_map/trigger_events
- https://tests.semantius.app/domain_map/handoff_processes
- https://tests.semantius.app/domain_map/domain_data_objects
- https://tests.semantius.app/domain_map/solution_domains

## 2026-05-31, Audit

### Summary

- **Current footprint:** 4 full modules (94 SWP-DEMAND-FORECAST, 95 SWP-SUPPLY-PLANNING, 96 SWP-SCENARIO-MODELING, 97 SWP-COST-PROJECTIONS). 0 starters. 0 cross-host modules into SWP. 19 DDO rows: 9 `master` (incl. one M7-conflict `master` on `job_requisitions` id=1 alongside ATS DDO 1, see B1-S1), 2 `contributor` (`hcm_positions` 53, `financial_plans` 57), 8 `consumer`. 30 module-level DMDO rows across the 4 modules (DMDO 422 on `job_requisitions` is `contributor` , consistent with ATS being module-master, contradicting domain-rollup DDO 31). 8 capabilities (`SWP-DEMAND-PLANNING`, `SWP-SUPPLY-MODELING`, `SWP-SCENARIO-MODELING`, `SWP-SKILLS-GAP-ANALYSIS`, `SWP-LABOR-MARKET-INTELLIGENCE`, `SWP-ORG-DESIGN`, `SWP-WORKFORCE-COSTING`, `SWP-PLAN-RECONCILIATION`). 9 solutions (3 primary: eQ8, OrgVue, Visier Plan; 6 secondary: Anaplan, Pigment, Workday Adaptive Planning, ChartHop, Visier People, Workday HCM). 0 regulations. 10 trigger_events on SWP-mastered or co-mastered payloads (388 `labor_market_benchmark.refreshed` still empty `event_category`). 14 outbound + 14 inbound cross-domain handoffs; 4 intra-domain `lifecycle_progression` handoffs (1146-1149). 28 lifecycle states across 6 of 8 masters (25 `position_demand_forecasts` and 29 `labor_market_benchmarks` carry no states , config-shape). 23 permissions (12 baseline = 3 per module x 4; 11 workflow-gate matching the 11 `requires_permission=true` lifecycle states). 4 SWP-scoped roles (`Workforce Planner` 10040, `Workforce Planning Lead` 10041, `FP&A Workforce Partner` 10042, `Workforce Leadership Sponsor` 10044); the fifth `ORG-DESIGN-PRACTITIONER` referenced in the prior audit is not present in live state today. 1 legacy domain-level `system` skill (`swp-system` id 7, `domain_module_id=NULL`) with 14 `skill_tools` rows. 0 module-level system skills. 10 `handoff_processes` rows across SWP's 28 cross-domain handoffs; 0 `record_status='approved'`; 7 `agent_curated`, 3 `discovery_substring` (101 on handoff 13, 130 on 241, 132 on 242 , the latter two are mis-tagged sales-process matches).

- **Bucket 1 (in-scope, agent fixable):** 7 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 4 items.

### Structural pass bands

- **A1 pass.** Domain row populated: `crud_percentage=55`, `business_logic` non-empty, `min_org_size='30 m <2500'`, `cost_band='$$$'`, `usa_market_size_usd_m=800`, `market_size_source_year=2024`, `certification_required=false`. Description carries no vendor names (Rule #18 clean).
- **A2 pass.** 8 capabilities, all SWP-prefixed.
- **A3 pass.** 9 solutions; 3 `primary`; `coverage_level` set on every row; 0 polluted `solution_domains.notes` (cleared in 2026-05-31 continuation).
- **M1-M7 pass.** 4 full modules; every capability has a realizing `domain_module_capabilities` row (per prior audit, not re-queried); every workflow-gate lifecycle state has `domain_module_id` set. **M7 catalog-wide single-master integrity FAILS** at the domain-rollup layer: DDO 1 (ATS, master) and DDO 31 (SWP, master) both claim `role='master'` on `data_object_id=1` job_requisitions. Module-level DMDO 422 is `contributor` on SWP-DEMAND-FORECAST, which is correct; the rollup row is the defect.
- **B5 pass.** 0 `embedded_master` rows in SWP modules.
- **B7 pass.** 7 `users` actor edges in `data_object_relationships` (1015-1021) covering workforce_plans, headcount_plans, position_demand_forecasts, skills_gap_analyses, workforce_scenarios, org_designs, workforce_cost_projections. `labor_market_benchmarks` correctly has no human-actor edge (config-shape).
- **B9 partial-fail (carryover).** trigger_event 388 `labor_market_benchmark.refreshed` still has empty `event_category`; deferred from prior continuation pending B2-S1 convention decision. The other 5 SWP-published events (384-387 + 40 + 62 + 11 + 61 + 106) all carry `state_change`.
- **B9b pass.** 4 intra-domain `lifecycle_progression` handoffs loaded (1146-1149).
- **B10b in-scope pass.** 0 inbound SWP rows carry NULL `target_domain_module_id`.
- **B10b report-only (carryover, owed by other domains).** 5 inbound SWP rows carry NULL `source_domain_module_id`: 10 + 27 (EPM, unmodularized), 136 (WFM), 241 + 242 (SPM). 2 outbound rows carry NULL `target_domain_module_id`: 458 + 16 (both target EPM, unmodularized).
- **B11 pass.** Outbound DORs on SWP-mastered payloads to ATS / HCM / EPM / COMP-MGMT / SKILLS-MGMT all wired (1022-1028).
- **B12 pass.** Master-on-master relationships present (1007-1014); the SWP backbone `workforce_plans -> headcount_plans -> position_demand_forecasts -> skills_gap_analyses` and `workforce_scenarios -> org_designs -> workforce_cost_projections` is intact.
- **C1 hard fail.** `/business_function_capabilities?capability_id=in.(554..561)` returns 0 rows. SWP capabilities are not anchored to any business function. The prior audit logged C1 / C2 as pass; the rows have either been removed or never existed in live state.
- **D1 not run** (UI spot-check is per-fix).
- **E1 partial-fail.** 4 roles for a 4-module domain (>=2 satisfied) but prior audit referenced 5; `ORG-DESIGN-PRACTITIONER` is absent today. Either an intentional consolidation or drift, surface as B2-S4.
- **E2-E5 pass.** Every role spans >=2 modules (10040: 4; 10041: 4; 10042: 3; 10044: 3). `interaction_level` populated on all 14 `role_modules` rows (mix of `primary` / `secondary`). 21 `role_permissions` rows distributed across the 4 roles (10040: 7; 10041: 4; 10042: 5; 10044: 5).
- **F1 + F2 hard fail (carryover).** Legacy `swp-system` skill 7 still at `domain_module_id=NULL`; 0 module-level system skills. Same blocker as 2026-05-30; deferred from technical-fix pass.
- **F3 pass via legacy only** (14 skill_tools on skill 7).
- **F4 pass.** All 14 `skill_tools.tools` rows satisfy `operation_kind` invariants (8 `query` + 3 `mutate` carry `data_object_id`; 1 `compute` `web_scrape` has NULL `data_object_id`).
- **F5 uncomputable per-module** (F2 must cure).
- **H1 partial.** 10 of 28 cross-domain handoffs carry `handoff_processes`. Catalog-quality headline: 0 `approved`. Process side-bar: 7 `agent_curated` (48, 49, 115, 334, 486, 771, 780) + 3 `discovery_substring` (101, 130, 132). Two of the three discovery rows are mis-tagged sales-process matches (handoff 13 -> "Analyze customer attrition and retention rates"; handoff 242 -> "Determine sales resource allocation"); the third (handoff 241 -> "Develop and measure strategic initiatives") is over-coarse at L2. 18 cross-domain handoffs remain untagged.

### Rule #15 notes-pollution sweep

Live state shows 4 `skill_tools` rows still carry populated `notes` (different IDs than the prior audit's 15 / 33 / 142 / 57): rows 70 (`query_job_requisitions` -> "Co-master with ATS"), 73 (`create_candidate` -> "Fires on headcount.approved -> ATS handoff"), 74 (`query_people_kpis` -> "Consumer from PA, attrition / fill-rate inputs"), 75 (`web_scrape` -> "Labor-market data ingestion fallback when no external_connector exists"). All 4 are pure provenance / context narration that Rule #15 forbids without explicit user approval. No other notes pollution observed (`domain_data_objects.notes`, `data_objects.notes`, `data_object_aliases.notes`, `data_object_relationships.notes`, `handoffs.notes`, `solution_domains.notes`, `domain_module_data_objects.notes` all empty for SWP-scoped rows).

### Bucket 1, In-scope confirmed gaps

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M7 catalog-wide single-master integrity violation | DDO 1 (ATS, master + required) and DDO 31 (SWP, master + required) both claim `role='master'` on `data_object_id=1` job_requisitions at the domain-rollup layer. Module-level DMDO 422 correctly carries SWP as `contributor`, ATS DMDO 9 carries master. The rollup DDO 31 is inconsistent with the module-level reality and with the Signal-1 co-master contract (SWP authorizes, ATS executes, ATS owns the master). | PATCH DDO 31: `role='contributor'` (keep `necessity='required'`). One row, surgical CLI. |
| B1-S2 | B9 carryover, trigger_event 388 `labor_market_benchmark.refreshed` | `event_category` still empty (deferred 2026-05-31). Gated on B2-S1 convention question (state_change vs threshold). | PATCH 388.event_category once user picks. |
| B1-S3 | F1 + F2 hard fail (carryover from 2026-05-30) | Legacy `swp-system` skill 7 at `domain_module_id=NULL` with 14 `skill_tools`. 0 module-level system skills. Per Rule #17 every `domain_modules` row needs exactly one `skill_type='system'` skill. | Author 4 new module-level system skills (`swp_demand_forecast_agent` on 94, `swp_supply_planning_agent` on 95, `swp_scenario_modeling_agent` on 96, `swp_cost_projections_agent` on 97). Re-anchor the 14 existing `skill_tools` rows by master each tool reads / writes. DELETE legacy skill 7. Loader: 4 inserts + 14 relocates + 1 DELETE. Gated on user (introduces new entities). |
| B1-S4 | C1 hard fail, capability -> business function anchoring missing | `/business_function_capabilities?capability_id=in.(554,555,556,557,558,559,560,561)` returns 0 rows. SWP's 8 capabilities are not anchored to any business function. | INSERT BFC rows: capability 554-561 -> Workforce Planning (owner); plus FP&A / Finance / HR-Org-Design contributor rows per the prior audit's intent. Surface specific business_function_ids in fix-time loader. Gated on user (selects which BFs to anchor). |
| B1-S5 | Rule #15 pollution on 4 `skill_tools` rows | Rows 70, 73, 74, 75 (skill_id=7) carry provenance / context narration in `notes`. Per Rule #15 default is empty unless user-approved at load time. | PATCH `notes=''` on the 4 rows. Surgical CLI. |
| B1-S6 | B10b report-only (carryover, owed by other domains) | NULL FKs on handoffs 10, 27, 136, 241, 242, 458, 16. Not SWP's fix; queued for EPM, WFM, SPM b1 audits. | Schedule b1 audits on EPM, WFM, SPM. Not SWP's fix. |
| B1-S7 | H1 APQC TAGGING continuation | 18 of 28 SWP cross-domain handoffs remain untagged. 3 existing `discovery_substring` rows are wrong (101 on handoff 13 -> customer-attrition mis-match; 132 on handoff 242 -> sales-resource mis-match; 130 on handoff 241 -> L2 too coarse). | INSERT new `handoff_processes` for the 18 untagged + REPLACE-CORRECT the 3 mis-tagged. Per-handoff PCF lookup required (prior audit's external_ids did not resolve cleanly in the live `/processes` catalog). Each new row: `(handoff_id, process_id, proposal_source='agent_curated', record_status='new', role='implements')`. |

### Bucket 1 count summary

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 |
| WRONG-OWNERSHIP | 1 (B1-S1, DDO rollup vs module-level) |
| SCOPE-CREEP | 0 |
| STRUCTURAL (B9, F1+F2, C1, Rule #15) | 4 (B1-S2, B1-S3, B1-S4, B1-S5) |
| BOUNDARY (NULL FK owed by other domains) | 1 (B1-S6) |
| APQC TAGGING | 1 (B1-S7) |
| MODULARIZATION ISSUES | 0 |
| **Bucket 1 total** | **7** items |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | `event_category` for trigger_event 388 `labor_market_benchmark.refreshed`. Default proposal `state_change` (mirrors 384-387 / 40 / 62 / 11 / 61); alternative `threshold` (external-signal arrival framing). | Convention question; coherence with COMP-MGMT and EPM consumers. | (a) `state_change`. (b) `threshold`. |
| B2-S2 | Pattern-flag re-evaluation per Rule #12 on `workforce_scenarios` 27, `org_designs` 28, `workforce_cost_projections` 30, `skills_gap_analyses` 26. All four currently `has_personal_content=false`. RIF / restructure scenarios, pre-publication org redesigns, per-role compensation projections, and skill-by-skill gap analyses can each carry named-person content. | Pattern-flag judgments the user owns. | Per-flag yes/no. Likely: flip `has_personal_content=true` on 27, 28, 30; possibly 26. |
| B2-S3 | Signal-1 attribution on event 62 `headcount.approved` (handoffs 14, 1149). `source_domain_module_id=94` (SWP-DEMAND-FORECAST) on rows whose payload is ATS-mastered `job_requisitions`. Strict B10b says source should be the master's module. Signal-1 co-mastering arguably licenses SWP to publish from its side. | Architectural intent on the Signal-1 contract. | (a) Keep as-is (SWP authors because it gate-keeps approval). (b) Re-anchor to ATS-RECRUITMENT-PIPELINE. |
| B2-S4 | Role count drift. Prior audit listed 5 SWP-scoped roles (incl. `ORG-DESIGN-PRACTITIONER`); live state shows 4. Was the role deleted intentionally, or did it never deploy? | Editorial / scope question on role coverage. | (a) Confirm 4-role posture is intentional. (b) Re-author `ORG-DESIGN-PRACTITIONER` per prior design. |

### Bucket 3, Phase 0 pending (speculative)

Subagent not spawned this run (structural-only). Candidates carried forward from the 2026-05-30 audit's flagship-vendor pass; restated here for the open-items index.

| ID | Candidate | Vendor knowledge basis | Proposed module |
|---|---|---|---|
| B3-S1 | `workforce_segments` consumer | eQ8, Visier Plan, Workday Adaptive Workforce model segments as scenario-pivot records. PA already masters at id=44 (handoff 1112). | SWP-SUPPLY-PLANNING consumer |
| B3-S2 | `succession_plans` consumer | Workday Talent / SAP SuccessFactors Succession. SWP-SUPPLY-PLANNING reads ready-now successor counts as supply input. | SWP-SUPPLY-PLANNING consumer (on TALENT-MGMT master) |
| B3-S3 | `internal_mobility_intents` consumer | Eightfold AI, Workday Skills Cloud surface employee-flagged mobility intent. No SWP-adjacent master today. | SWP-SUPPLY-PLANNING consumer or new candidate market entity |
| B3-S4 | Regulation linkage candidates | EU Pay Transparency Directive (2026 enforcement) ties to SWP-COST-PROJECTIONS; WARN Act ties to RIF-mode workforce_scenarios; CA SB 1162 / NYC AI bias audit ties to skills-gap and cost projections. SWP has 0 regulations linked today. | `domain_regulations` rows pending Phase 0 vetting. |

### Cross-bucket dependencies

- B1-S2 (PATCH 388) is gated on B2-S1.
- B1-S5 (PATCH `skill_tools.notes`) is independent and mechanical.
- B1-S1 (PATCH DDO 31 rollup) is independent and surgical.
- B1-S3 (F1 + F2 module-skills load) is gated on user (introduces new entities, large loader).
- B1-S4 (C1 BFC anchoring) is gated on user (selects business_function ids).
- B1-S7 (APQC tagging) is independent of B1-S2; needs per-handoff PCF lookup at fix time.
- B2 and B3 are otherwise independent.

### Per-bucket prompts

- **Bucket 1, fix these now?** Reply `all`, list (e.g. `S1, S5`), or `skip`.
- **Bucket 2, what's your call on each item?** Wait for per-item decisions before acting.
- **Bucket 3, vet via formal Phase 0 vendor research, or eyeball-mode?** Name which of `workforce_segments` / `succession_plans` / `internal_mobility_intents` / regulation candidates to treat as confirmed.

### Report-only follow-ups (owed by other domains)

| Owing domain | Owed work |
|---|---|
| EPM | Modularize; populate source_module on inbounds 10, 27; populate target_module on outbounds 16, 458; declare consumer DMDOs on SWP-mastered `workforce_scenarios` and `workforce_cost_projections`. |
| WFM | Populate source_module on inbound 136. |
| SPM | Populate source_module on inbounds 241, 242; declare master on `strategic_initiatives` 274 and `resource_allocations` 277 if SPM holds them. |
| SKILLS-MGMT | Verify consumer DMDO on `skills_gap_analyses` 26 in module 174 (target of handoff 456). |

UI spot-check entry points:
- https://tests.semantius.app/domain_map/domain_data_objects
- https://tests.semantius.app/domain_map/trigger_events
- https://tests.semantius.app/domain_map/skill_tools
- https://tests.semantius.app/domain_map/business_function_capabilities
- https://tests.semantius.app/domain_map/handoff_processes

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

## 2026-06-07, Audit (state-driven execute, bulk batch)

Loader: `.tmp_deploy/fix_swp_state_execute_2026_06_07.ts` (run from project root; idempotent, re-run prints 0 writes).

### Summary

State-driven Validate pass (SKILL.md Rule #21) against `audits/SWP/state.yaml`. Worked only the open state items, classified each into EXECUTE / SURFACE / LEAVE. All EXECUTE-class additive/corrective items written at `record_status='new'`. No fresh from-scratch audit. Note: several open H1 items had already been cleared in live state since the snapshot (16 of the 18 "untagged" handoffs now carry `agent_curated` rows), and `business_function_domains` is already populated, so the live verify-first pass narrowed the EXECUTE surface considerably.

### Executed (additive / corrective; record_status='new')

- **B1A-ENTITY-TYPE (8 masters):** PATCHed `data_objects.entity_type` from `unclassified` to the Rule #12 enum. `operational_workflow` x6 (workforce_plans 23, headcount_plans 24, skills_gap_analyses 26, workforce_scenarios 27, org_designs 28, workforce_cost_projections 30, each carries a lifecycle state machine); `computed` x1 (position_demand_forecasts 25, a stateless derived forecast); `catalog` x1 (labor_market_benchmarks 29, external reference/config data, 0 states). All six operational_workflow masters already have lifecycle states, so B12 stays clean.
- **B1A-M7-DDO31-ROLLUP (1 row):** PATCHed `domain_data_objects` id=31 `role` master -> contributor (necessity stays required). Resolves the catalog-wide single-master conflict on `job_requisitions` (data_object_id=1): ATS is now sole `master` (module DMDO 9 / ATS-RECRUITMENT-PIPELINE), SWP is contributor at every layer. Pre-flight confirmed ATS still holds the module-level master before demoting, so 0 masters can never result. Corrective realignment of a derived rollup, not an editorial overwrite.
- **Catalog UX / Rule #20 (5 rows):** authored buyer-voice `catalog_tagline` + `catalog_description` on the SWP domain row (100) and all four modules (94 SWP-DEMAND-FORECAST, 95 SWP-SUPPLY-PLANNING, 96 SWP-SCENARIO-MODELING, 97 SWP-COST-PROJECTIONS). All five were empty; no non-empty value overwritten. No vendor names (Rule #18), no em-dash, American English.
- **B1A-H1-APQC-TAGGING (2 rows):** INSERTed `handoff_processes` (`proposal_source='agent_curated'`, `role='implements'`, record_status omitted->new) for the only two still-untagged SWP cross-domain handoffs: handoff 11 (HCM->SWP-DEMAND-FORECAST `headcount.actuals_updated`, plan-vs-actual reconciliation) -> PCF 980 "Perform strategic workforce planning" (21693, 7.1.2.1); handoff 16 (SWP-COST-PROJECTIONS->EPM `cost_projection.approved`) -> PCF 1322 "Prepare periodic budgets and plans" (10772, 9.1.2.2). PCF ids resolved live. The other 16 handoffs in the state's list were already `agent_curated` in live state.
- **B11 aliases (12 rows):** INSERTed generic-synonym `data_object_aliases` (`alias_type='synonym'`, no industry_id) on the four masters lacking coverage: workforce_plans 23 (Strategic Workforce Plan, Workforce Plan, Multi-Year People Plan), headcount_plans 24 (Headcount Plan, Hiring Plan, Staffing Plan), workforce_scenarios 27 (What-If Scenario, Workforce Scenario, Planning Scenario), org_designs 28 (Organization Design, Org Structure Design, Reorg Design). Masters 25/26/29/30 already carry synonyms. No vendor/product names (Rule #18).

### Surfaced (not written; user decision or sign-off required)

- **b2-S1** event_category convention for trigger_event 388 `labor_market_benchmark.refreshed` (state_change vs threshold). Still empty; blocks B1B-B9.
- **b2-S2** has_personal_content re-evaluation on workforce_scenarios 27, org_designs 28, workforce_cost_projections 30, skills_gap_analyses 26 (all currently false; RIF/restructure/named-person content). Flipping a flag = a write the user owns.
- **b2-S3** Signal-1 attribution on event 62 `headcount.approved` (keep SWP source vs re-anchor handoffs 14+1149 to ATS-RECRUITMENT-PIPELINE).
- **b2-S4** role-count drift: ORG-DESIGN-PRACTITIONER absent (4 vs prior 5 SWP-scoped roles). Editorial scope input for the deferred persona layer.
- **b2-S5** C1 per-capability business_function owner/contributor split (BFC empty; owner-exists precondition now satisfied via business_function_domains). Blocks B1B-C1.
- **b2-S6 (new, DESTRUCTIVE):** REPLACE-CORRECT 3 mis-tagged `discovery_substring` handoff_processes rows: id 101 (handoff 13 PA->SWP attrition.forecast_updated, currently process 671) -> recommend 980; id 130 (handoff 241 SPM->SWP initiative.kickoff, currently process 16 / L2 over-coarse) -> recommend tighter L3/L4; id 132 (handoff 242 SPM->SWP resource_allocation.committed, currently process 713 / sales context) -> recommend 980. Overwrite of non-empty rows -> gated on approval.
- **B1A-SELF-CONTAIN / M9 (DESTRUCTIVE):** 12 contributor/required-consumer DMDO rows break module self-containment; the fix (embed-as-shell or relax necessity) overwrites existing role/necessity values -> surfaced, not executed.
- **B1A-PHASE-P personas / RACI:** DEFERRED (not auto-authored). Candidate personas: Workforce Planner, Workforce Planning Lead, FP&A Workforce Partner, Workforce Leadership Sponsor, plus Org Design Practitioner pending B2-S4.

### Left (untouched)

- **b1b owed-by-others:** B1B-B9-EVENT388 (gated B2-S1), B1B-C1-BFC-ANCHORING (gated B2-S5), B1B-OTHER-DOMAIN-NULLS (7 NULL FKs owed by EPM/WFM/SPM modularizations).
- **b3 backlog:** workforce_segments, succession_plans, internal_mobility_intents, domain_regulations linkages.
- **RETIRED / superseded (2026-06-06):** B1A-RULE15-SKILL-TOOLS-NOTES and B1B-F1-F2-MODULE-SKILLS. `skill_tools` is dropped and per-module system skills are canceled under the per-domain-skill restoration supersession; reframed as a note only, no action. Per-module tool re-authoring tracked in `audits/_modularization-backlog.md`.

### Verification (post-run)

- `data_objects?id=in.(23..30)`: all 8 entity_type values match the table above; 0 `unclassified`.
- `domain_data_objects?id=eq.31`: role=contributor, necessity=required.
- `handoff_processes?handoff_id=in.(11,16)`: 2 rows, proposal_source=agent_curated, record_status=new.
- `domains?id=eq.100` and all 4 modules: catalog_tagline/catalog_description non-empty.
- Loader re-run: 0 patched / 0 inserted across every step (idempotent).

UI spot-check entry points:
- https://tests.semantius.app/domain_map/data_objects
- https://tests.semantius.app/domain_map/domains
- https://tests.semantius.app/domain_map/domain_modules
- https://tests.semantius.app/domain_map/domain_data_objects
- https://tests.semantius.app/domain_map/handoff_processes
- https://tests.semantius.app/domain_map/data_object_aliases

## 2026-06-10 — Review (B9d payload-realization pass)

### Summary

State-driven review (SKILL.md Rule #21). Verified the 2026-06-07 worklist against live state (no drift: B1B-C1 BFC still 0 rows, C1 owner/contributors intact, B2-S2 flags still false on 26/27/28/30, F2 = exactly one `swp-system` skill, B2-S6 tags 101/130/132 still mis-tagged, trigger_event 388 still empty category). The one outstanding agent-executable item — **B1A-B9D-VERIFY** (B9d had never run on SWP; the band was added 2026-06-09 and SWP was last audited before it) — was executed via `scripts/analytics/b9d_resolver.ts SWP --dry-run` in BOTH directions, then dispositioned. B1A-B9D-VERIFY moved out of `state.yaml`.

### B9d resolver result

26 boundary tags → 18 (process, owner) findings: **3 RESOLVED, 8 ORPHAN, 2 ROLL-UP, 1 RE-TAG, 1 MIS-TAG, 2 UNOWNED, 1 REFERENCE-READ.**

RESOLVED (no action): 97 "Create organizational design" (org_designs, h459); 219 "Manage employee requisitions" (job_requisitions, h14/400 ATS-owned; and position_demand_forecasts h12 SWP-owned).

Disposition of the rest (no blanket `--write`; the resolver has documented false-positives on unbuilt owners, and SWP has zero personas):

- **pid 980 ORPHAN(SWP)** "Perform strategic workforce planning" — already tracked as **q10 / B2-B9D-OWN-980** (added earlier 2026-06-10). Idempotent; no duplicate.
- **pid 671 ORPHAN(SWP)** "Analyze customer attrition and retention rates" — RESOLVER FALSE-POSITIVE. It is the **B2-S6 handoff-13 mis-tag** (tag 101, `discovery_substring`, process 671 → should be 980). Because SWP is unbuilt the resolver's MIS-TAG rule (which needs a positive realized home) could not fire, so it fell through to ORPHAN — a blind spot the resolver's own REVIEW comments document. NOT written as an owner question (would be "who owns customer-attrition analysis at SWP", incoherent). Folded into B2-S6; the re-point to 980 dissolves it.
- **pid 1038 / 1322 / 1324 ORPHAN(SWP)** (establish-training-needs on skills_gap_analyses; prepare-periodic-budgets / -forecasts on workforce_plans + workforce_cost_projections) — SWP-owned **cold-start** processes with no persona. Every SWP-owned process reads ownerless today because the persona layer is unbuilt, so these are facets of **B1A-PHASE-P**, not separate questions. Recorded under `B1A-PHASE-P.extra_b9d_owned_processes` so the persona work gives each a named R/A. 1322/1324 carry a SWP↔EPM-boundary caveat (the budget/forecast slice may be reassigned to EPM). No B2-B9D-OWN-1038/1322/1324 authored (q10 duplicates).
- **pid 980 ORPHAN(PA)** — input-feed mis-attribution. Handoffs 452 + 1112 (PA→SWP feeds, payloads attrition_forecasts + workforce_segments, PA-mastered) are `agent_curated` with tag 980, which is SWP's planning process, not PA's. The carried-entity ownership heuristic mis-fires on input feeds. NOT injected into PA. Open question (are tags 1167/1171 correct as 980, or re-point/drop) recorded under **B1B-B9D-CROSS-OWED.pa_980_misattribution**.
- **pid 106 ORPHAN(SEM)** "Execute strategic initiatives" (strategic_initiatives, h241) and **pid 923 ORPHAN(WFM)** "Track workforce utilization" (time_entries, h136) — genuine neighbor owner obligations. SEM/WFM are mid-build (`next_action_by: agent`) with rich open backlogs, so per proportionality these were NOT auto-injected into their files during a single-domain "review SWP" pass; recorded under **B1B-B9D-CROSS-OWED.owner_orphans** and offered to write when those domains are next reviewed (or on user request).
- **Destructive re-points (sign-off):** RE-TAG h241 (coarse tag 130/process 16 → DELETE; the precise 106/1.3.5 already exists on h241 as row 1186) folds into B2-S6. ROLL-UP COMP-MGMT h1138 (216 → 7.1.2.16) and ROLL-UP/MIS-TAG PSA h1027 (887 → 5.2.2) + h1018 (980 → 5.2.2) are owed by COMP-MGMT/PSA (their source) → **B1B-B9D-CROSS-OWED.source_repoints_owed**.
- **UNOWNED resource_allocations (h242, tags 713 + 905):** the payload has no `master` row anywhere in the catalog. Re-pointing tag 132 to a SWP process would be wrong (SWP doesn't master it either). B2-S6 updated: DELETE row 132 now and let SPM/PSA establish ownership upstream first.
- **REFERENCE-READ labor_market_benchmarks (h460):** config/reference data of SWP (`entity_type` catalog). Informational; recorded under B1B-B9D-CROSS-OWED.reference_read.

### Net effect on `state.yaml`

- Removed B1A-B9D-VERIFY (executed).
- Enriched B1A-PHASE-P with the 4 B9d-confirmed SWP-owned processes the persona layer must cover.
- Refined B2-S6 with B9d-precise mechanics (h13 re-point to 980; h241 DELETE coarse tag; h242 DELETE, payload unowned) + matching q6 rewrite.
- Added B1B-B9D-CROSS-OWED (SEM/WFM owner obligations, COMP-MGMT/PSA owed re-points, PA-980 mis-attribution, reference-read note).

No catalog rows written, no `record_status` touched (Rule #1). Domain stays `feedback_needed`; q-SWP.md unchanged at q1–q10 (B9d added no new SWP-facing questions — its SWP findings fold into existing q6/q10 + deferred persona work).
