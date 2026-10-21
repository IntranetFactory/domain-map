# Embedded-master + necessity backfill: HR cluster

Scope: 13 HR-cluster domains (HCM, PAYROLL, ATS, ONBOARDING, BEN-ADMIN, COMP-MGMT, LMS, PA, TALENT-MGMT, WFM, EMP-EXP, SWP, HRSD).
Catalog state read live from `domain_data_objects` and `data_objects` on 2026-05-22.
Read-only analysis. No writes performed.

---

## 1. Cluster scope

| domain_code | domain_name | domain_id |
|---|---|---|
| HCM | Human Capital Management | 54 |
| PAYROLL | Payroll Management | 55 |
| ATS | Applicant Tracking and Recruiting | 56 |
| ONBOARDING | Employee Onboarding | 99 |
| BEN-ADMIN | Benefits Administration | 61 |
| COMP-MGMT | Compensation Management | 60 |
| LMS | Learning Management | 57 |
| PA | People Analytics | 63 |
| TALENT-MGMT | Talent Management | 58 |
| WFM | Workforce Management | 59 |
| EMP-EXP | Employee Experience and Engagement | 62 |
| SWP | Strategic Workforce Planning | 100 |
| HRSD | HR Service Delivery | 22 |

Total: 13 domains.

---

## 2. Existing rows snapshot

All 88 rows currently in `domain_data_objects` for these 13 domains.

| domain_code | data_object_name | role | necessity | notes (first 80 chars) |
|---|---|---|---|---|
| HRSD | employees | consumer | required | HRSD consumes the worker record as the principal authentication / authoris |
| HRSD | service_requests | consumer | required | When an HR case requires IT assistance (access, hardware, app), it routes |
| HRSD | knowledge_articles | consumer | required | HRSD consumes the shared knowledge_articles object (mastered by ITSM/CSM) |
| HRSD | hr_cases | master | required | (empty) |
| HRSD | case_categories | master | required | (empty) |
| HCM | employees | master | required | (empty) |
| HCM | positions | master | required | (empty) |
| HCM | job_profiles | master | required | (empty) |
| HCM | org_units | master | required | (empty) |
| HCM | employment_contracts | master | required | (empty) |
| HCM | employment_events | master | required | (empty) |
| HCM | people_kpis | consumer | required | Surfaces operational HR KPIs in manager and HR-business-partner views. |
| HCM | asset_lifecycle_events | contributor | required | employee.terminated triggers asset-recall lifecycle events — the canonical |
| HCM | absence_requests | consumer | required | HCM consumes approved absence_requests to update PTO balances and tenure-r |
| HCM | skill_profiles | consumer | required | HCM surfaces skill_profile data on the worker record for self-service and |
| HCM | engagement_drivers | consumer | required | HCM surfaces team engagement scores in manager dashboards to inform people |
| HCM | contingent_workers | consumer | required | HCM consumes contingent_workers for unified workforce visibility (employee |
| HCM | cost_centers | contributor | required | HCM contributes the org-unit alignment slice — which workers / positions r |
| PAYROLL | employees | master | required | Comp / withholding / payable slice — gross-to-net rules, deductions, tax s |
| PAYROLL | pay_runs | master | required | (empty) |
| PAYROLL | pay_slips | master | required | (empty) |
| PAYROLL | earning_codes | master | required | (empty) |
| PAYROLL | deduction_codes | master | required | (empty) |
| PAYROLL | tax_authorities | master | required | (empty) |
| PAYROLL | tax_filings | master | required | (empty) |
| PAYROLL | garnishment_orders | master | required | (empty) |
| PAYROLL | payroll_journal_entries | master | required | (empty) |
| PAYROLL | benefit_enrollments | consumer | required | PAYROLL consumes benefit_enrollments to compute pre/post-tax benefit deduc |
| PAYROLL | merit_recommendations | consumer | required | PAYROLL consumes approved merit_recommendations as the source of pay-rate |
| PAYROLL | time_entries | consumer | required | PAYROLL consumes approved time_entries from WFM as the source of variable- |
| PAYROLL | absence_requests | consumer | required | PAYROLL consumes approved absence_requests as paid-leave hours feeding the |
| PAYROLL | expense_reports | consumer | required | PAYROLL consumes payroll-routed reimbursable expense_reports for the next |
| ATS | job_requisitions | master | required | Recruiting execution — ATS masters the pipeline-stage, candidate, intervie |
| ATS | job_postings | master | required | (empty) |
| ATS | candidates | master | required | (empty) |
| ATS | applications | master | required | (empty) |
| ATS | recruitment_sources | master | required | (empty) |
| ATS | referrals | master | required | (empty) |
| ATS | talent_pools | master | required | (empty) |
| ATS | interviews | master | required | (empty) |
| ATS | interview_scorecards | master | required | (empty) |
| ATS | assessments | master | required | (empty) |
| ATS | offers | master | required | (empty) |
| ATS | background_checks | master | required | (empty) |
| ATS | recruitment_agencies | master | required | (empty) |
| ATS | recruitment_events | master | required | (empty) |
| ATS | salary_bands | consumer | required | ATS consumes salary_bands to enforce offer-guidance ranges and surface pay |
| ATS | skill_profiles | contributor | required | ATS contributes hire-time skill assessments and interview scorecards as in |
| ATS | career_aspirations | consumer | required | ATS consumes career_aspirations to populate internal-mobility recommendati |
| LMS | courses | master | required | (empty) |
| LMS | learning_paths | master | required | (empty) |
| LMS | course_enrollments | master | required | (empty) |
| LMS | learning_records | master | required | (empty) |
| LMS | certifications | master | required | (empty) |
| LMS | skill_profiles | master | required | Skills-cloud central artifact. TALENT-MGMT and ATS co-contribute via asses |
| LMS | compliance_assignments | master | required | (empty) |
| TALENT-MGMT | employees | contributor | required | Writes talent-specific fields (career aspirations, mobility preferences, s |
| TALENT-MGMT | job_profiles | contributor | required | Contributes the skills/competencies slice — the required capability profil |
| TALENT-MGMT | skill_profiles | contributor | required | TALENT-MGMT contributes performance-derived skill signals (calibrated rati |
| TALENT-MGMT | performance_reviews | master | required | (empty) |
| TALENT-MGMT | performance_goals | master | required | (empty) |
| TALENT-MGMT | succession_plans | master | required | (empty) |
| TALENT-MGMT | talent_calibrations | master | required | (empty) |
| TALENT-MGMT | nine_box_placements | master | required | (empty) |
| TALENT-MGMT | career_aspirations | master | required | (empty) |
| TALENT-MGMT | feedback_records | master | required | (empty) |
| TALENT-MGMT | okr_objectives | master | required | Individual employee OKRs as the goal-setting half of the performance-manag |
| WFM | employees | consumer | required | WFM consumes employees as the schedulable resource pool — identity, employ |
| WFM | positions | consumer | required | WFM consumes positions to enforce position-based scheduling rules: require |
| WFM | job_profiles | consumer | required | WFM consumes job_profiles for skill/qualification matching when filling op |
| WFM | org_units | consumer | required | WFM consumes org_units (locations, departments) as the scheduling hierarch |
| WFM | work_schedules | master | required | (empty) |
| WFM | shifts | master | required | (empty) |
| WFM | time_entries | master | required | (empty) |
| WFM | absence_requests | master | required | (empty) |
| WFM | absence_balances | master | required | (empty) |
| WFM | time_off_policies | master | required | (empty) |
| WFM | meal_break_records | master | required | (empty) |
| COMP-MGMT | employees | contributor | required | COMP-MGMT writes compensation-state fields (current base, bonus target, eq |
| COMP-MGMT | earning_codes | contributor | required | COMP-MGMT defines compensation-driven earning codes (bonus, equity vest, a |
| COMP-MGMT | compensation_plans | master | required | (empty) |
| COMP-MGMT | salary_bands | master | required | (empty) |
| COMP-MGMT | merit_cycles | master | required | (empty) |
| COMP-MGMT | merit_recommendations | master | required | (empty) |
| COMP-MGMT | compensation_statements | master | required | (empty) |
| COMP-MGMT | equity_grants | master | required | (empty) |
| COMP-MGMT | compensation_benchmarks | master | required | (empty) |
| COMP-MGMT | performance_reviews | consumer | required | COMP-MGMT consumes calibrated performance_reviews ratings as the primary i |
| BEN-ADMIN | employees | contributor | required | BEN-ADMIN writes the benefit-eligibility slice (coverage tier, dependent l |
| BEN-ADMIN | deduction_codes | contributor | required | BEN-ADMIN defines the benefit deduction codes that PAYROLL operationalises |
| BEN-ADMIN | benefit_plans | master | required | (empty) |
| BEN-ADMIN | benefit_enrollments | master | required | (empty) |
| BEN-ADMIN | benefit_dependents | master | required | (empty) |
| BEN-ADMIN | life_events | master | required | (empty) |
| BEN-ADMIN | benefit_open_enrollments | master | required | (empty) |
| BEN-ADMIN | benefit_carriers | master | required | (empty) |
| BEN-ADMIN | carrier_feeds | master | required | (empty) |
| EMP-EXP | survey_campaigns | master | required | (empty) |
| EMP-EXP | survey_responses | master | required | (empty) |
| EMP-EXP | engagement_drivers | master | required | (empty) |
| EMP-EXP | action_plans | master | required | (empty) |
| EMP-EXP | pulse_questions | master | required | (empty) |
| PA | employees | consumer | required | Read-only — derives KPIs and cohorts from the canonical record. Does not a |
| PA | employment_events | consumer | required | Reads the event stream to compute time-based metrics (tenure, time-in-leve |
| PA | attrition_forecasts | master | required | (empty) |
| PA | people_kpis | master | required | (empty) |
| PA | workforce_segments | master | required | (empty) |
| PA | engagement_surveys | master | required | (empty) |
| PA | predictive_models | master | required | (empty) |
| PA | saas_usage_metrics | consumer | required | Tool-adoption metrics roll into people analytics for productivity and enga |
| PA | customers | consumer | required | Where customer-related people-analytics overlap exists (employees acting a |
| PA | call_recordings | consumer | required | Aggregated call quality, talk-ratio, and topic-coverage metrics feed sales |
| PA | pay_slips | consumer | required | Pay-equity analytics and total-rewards reporting derive from aggregated pa |
| PA | absence_requests | consumer | required | PA derives leave-trend, burnout-risk, and absenteeism metrics from absence |
| PA | learning_records | consumer | required | PA consumes aggregated learning_records for L&D ROI, skill-gap closure, an |
| PA | performance_reviews | consumer | required | PA consumes calibrated performance_reviews for rater-bias analysis, distri |
| PA | engagement_drivers | consumer | required | PA consumes engagement_drivers at team/department grain for cross-cutting |
| ONBOARDING | onboarding_plans | master | required | (empty) |
| ONBOARDING | onboarding_journeys | master | required | (empty) |
| ONBOARDING | onboarding_stages | master | required | (empty) |
| ONBOARDING | onboarding_tasks | master | required | (empty) |
| ONBOARDING | buddy_assignments | master | required | (empty) |
| ONBOARDING | onboarding_cohorts | master | required | (empty) |
| ONBOARDING | welcome_communications | master | required | (empty) |
| ONBOARDING | onboarding_document_collections | master | required | (empty) |
| ONBOARDING | employees | contributor | required | Writes onboarding-state fields (pre-board start, Day-1 reached, milestones |
| ONBOARDING | service_requests | contributor | required | Onboarding provisioning tasks open ITSM service requests for IT fulfilment |
| ONBOARDING | asset_lifecycle_events | contributor | required | Onboarding provisioning tasks generate asset-assignment lifecycle events. |
| SWP | job_requisitions | master | required | Headcount intent — SWP masters the position approval, budget alignment, an |
| SWP | workforce_plans | master | required | (empty) |
| SWP | headcount_plans | master | required | (empty) |
| SWP | position_demand_forecasts | master | required | (empty) |
| SWP | skills_gap_analyses | master | required | (empty) |
| SWP | workforce_scenarios | master | required | (empty) |
| SWP | org_designs | master | required | (empty) |
| SWP | labor_market_benchmarks | master | required | (empty) |
| SWP | workforce_cost_projections | master | required | (empty) |
| SWP | positions | contributor | required | Contributes proposed positions via org_designs and headcount approvals; HC |
| SWP | financial_plans | contributor | required | Workforce cost contribution — workforce_cost_projections feed the people-c |
| SWP | people_kpis | consumer | required | Consumes attrition rate, fill rate, span-of-control to update plan assumpt |

Existing row count: 88 (HCM 13, PAYROLL 14, ATS 17, LMS 7, TALENT-MGMT 10, WFM 11, COMP-MGMT 10, BEN-ADMIN 9, EMP-EXP 5, PA 14, ONBOARDING 11, SWP 12, HRSD 5).

---

## 3. NEW rows to add

The new rows are dominated by **`embedded_master` records** — point-solution-local copies of HR-cluster anchors (`employees`, `positions`, `job_profiles`, `org_units`, `salary_bands`, `cost_centers`) that almost every HR domain holds when deployed standalone but defers to HCM/COMP-MGMT/ERP-FIN when present. These are exactly the Signal-1b rows the catalog wasn't capturing before. A handful of new `consumer + optional` rows surface the cross-cluster reads (assets, suppliers, legal_entities) that load-bear on workflow execution but not authority.

| domain_code | data_object_name | role | necessity | proposed notes | reasoning |
|---|---|---|---|---|---|
| **PAYROLL** | positions | embedded_master | required | PAYROLL local-masters positions for pay-grade / FLSA classification / GL-allocation tagging when no HCM is deployed; reads from HCM when present. | Slice: pay-relevant position attributes (FLSA exempt/non-exempt, pay grade, GL string). Canonical authority: HCM (already master). Standalone payroll bureaus (ADP, Paychex, Gusto) build their own position file — load-bearing for gross-to-net. Required: required because a pay-run cannot post without a position-driven GL string. |
| **PAYROLL** | org_units | embedded_master | required | PAYROLL local-masters org_units for cost-centre and legal-entity allocation of payroll journals when no HCM is deployed; reads from HCM when present. | Slice: payroll-allocation org hierarchy (legal entity, cost-centre roll-up). Canonical authority: HCM. Standalone payroll always has a department/location table. Required: required — journal entries cannot be posted without an org dimension. |
| **PAYROLL** | cost_centers | embedded_master | required | PAYROLL local-masters cost_centers for journal-entry GL allocation when no ERP is integrated; reads from ERP-FIN when present. | Slice: GL allocation segment. Canonical authority: ERP-FIN (cluster boundary). Required: required — every payroll journal entry is allocated to a cost_center. |
| **PAYROLL** | legal_entities | consumer | required | PAYROLL consumes legal_entities to determine the employer-of-record, tax registration, and reporting entity per pay_run. | Canonical authority: ERP-FIN / corporate governance (legal_entities exists, id 197). Required: required — payroll cannot run without an employer entity assigned per worker. |
| **PAYROLL** | benefit_dependents | consumer | optional | PAYROLL consumes benefit_dependents only when imputed-income or dependent-coverage tax treatment is in scope (US health plans, life-insurance >50k). Many deployments skip this. | Authority: BEN-ADMIN (master). Optional: many payroll deployments outside the US don't compute imputed-income, and US deployments without imputed-income plans don't either. |
| **ATS** | employees | embedded_master | required | ATS local-masters the new-hire pre-employee record (offer accepted, but not yet active in HCM); persists until handoff via offer.accepted. Reads from HCM for internal-mobility candidates when present. | Slice: pre-hire candidate-as-future-employee record. Canonical authority: HCM. Required: required — ATS standalone (Greenhouse, Lever) maintains a candidate-to-employee record for the offer-to-start-date window. |
| **ATS** | positions | embedded_master | required | ATS local-masters positions for requisition-to-position binding (open headcount, hiring manager, required skills); reads from HCM/SWP when integrated. | Slice: hiring-position attributes (hiring manager, location, required skills, posted level). Canonical authority: HCM. Required: required — every requisition binds to a position; standalone ATS always carries a position table. |
| **ATS** | job_profiles | embedded_master | required | ATS local-masters job_profiles for requisition templates and competency requirements; reads from HCM when present. | Slice: hiring-side competency requirements. Canonical authority: HCM. Required: required — requisitions inherit from job_profile templates. |
| **ATS** | org_units | embedded_master | required | ATS local-masters org_units to scope requisitions to a department/location for routing and posting; reads from HCM when present. | Slice: department/location attributes for posting and routing. Canonical authority: HCM. Required: required — every requisition is org-scoped. |
| **ATS** | cost_centers | embedded_master | optional | ATS local-masters cost_centers only for budget-tagged requisitions in deployments without finance integration; many ATS deployments skip cost_centers entirely. | Authority: ERP-FIN. SKILL.md cites this exact case ("ATS embedded-masters cost_centers only when finance integration is absent"). Optional. |
| **ATS** | salary_bands | embedded_master | optional | ATS local-masters salary_bands for pay-transparency disclosures and offer-guidance ranges when no comp-management system is integrated. Reads from COMP-MGMT when present. | Slice: posted-pay-range band per requisition. Canonical authority: COMP-MGMT (master). Optional: pay-transparency is legally required in some jurisdictions (CO/NY/CA/EU) but not others; many ATS deployments don't carry a band table. Note: existing `consumer + required` row may also need re-evaluation — see Section 4. |
| **ONBOARDING** | employees | embedded_master | required | ONBOARDING local-masters the new-hire record (pre-board state, Day-1 readiness, journey progress fields) when deployed standalone; reads from HCM when integrated. Existing row is `contributor` which conflates writing onboarding-state fields on HCM's master with point-solution local-master behaviour. | Slice: pre-employment / pre-Day-1 / journey-window onboarding state. Canonical authority: HCM. Required: required — standalone onboarding (Enboarder, Sapling, Talmundo) always carries the worker record. Note: this is a CHANGE proposal from contributor — see Section 4. Listed here for symmetry. |
| **ONBOARDING** | positions | embedded_master | required | ONBOARDING local-masters positions for first-day-readiness checks (workstation, manager, location) when no HCM is integrated. Reads from HCM when present. | Slice: hiring-position attributes needed to assemble the Day-1 packet. Canonical authority: HCM. Required: required — onboarding cannot assemble a journey without a position binding. |
| **ONBOARDING** | org_units | embedded_master | required | ONBOARDING local-masters org_units to scope journeys to a department/location and assign location-specific tasks; reads from HCM when integrated. | Slice: department/location attributes for task assignment. Canonical authority: HCM. Required: required — task templates are org-scoped. |
| **ONBOARDING** | hardware_assets | consumer | required | ONBOARDING consumes hardware_assets to confirm Day-1 laptop/peripheral readiness via the ITAM lifecycle handoff. | Authority: ITAM (cross-cluster). Required: required — laptop provisioning is load-bearing for Day-1 readiness. |
| **BEN-ADMIN** | employees | embedded_master | required | BEN-ADMIN local-masters benefit-eligibility-relevant employee fields (DOB, hire date, FT/PT status, dependents) when deployed standalone (e.g. PlanSource, bswift, Maxwell); reads from HCM when integrated. Existing row is `contributor` which understates point-solution local-master behaviour. | Slice: eligibility-determining attributes + dependent linkage. Canonical authority: HCM. Required: required — standalone benefit-admin systems always carry a full worker record. CHANGE candidate — see Section 4. |
| **BEN-ADMIN** | org_units | embedded_master | required | BEN-ADMIN local-masters org_units for benefit-group assignment (different benefit eligibility by location, business unit) when no HCM is integrated. | Slice: benefit-group org-mapping. Canonical authority: HCM. Required: required for any deployment with location-varying plans (US multi-state, multinational). |
| **BEN-ADMIN** | legal_entities | consumer | required | BEN-ADMIN consumes legal_entities to scope benefit-plan offerings (different plans by employer-of-record / country). | Authority: ERP-FIN. Required: required — benefit plans bind to legal_entity for regulatory filings (5500, ACA). |
| **COMP-MGMT** | employees | embedded_master | required | COMP-MGMT local-masters the worker record for compensation-relevant fields (current base, bonus target, equity guideline, salary band placement) when deployed standalone (Pave, Comp, Beqom, CompXL); reads from HCM when integrated. Existing row is `contributor` which understates point-solution local-master behaviour. | Slice: compensation-state fields on the worker. Canonical authority: HCM. Required: required — standalone comp-management always carries a worker file. CHANGE candidate — see Section 4. |
| **COMP-MGMT** | positions | embedded_master | required | COMP-MGMT local-masters positions for salary-band assignment, job-architecture binding, and pay-equity grouping when no HCM is integrated. | Slice: pay-architecture position attributes (job code, level, band assignment). Canonical authority: HCM. Required: required — every comp plan binds to a position. |
| **COMP-MGMT** | job_profiles | embedded_master | required | COMP-MGMT local-masters job_profiles for job-level and grade structures when deployed standalone; reads from HCM when integrated. | Slice: job-architecture (level, grade, family). Canonical authority: HCM. Required: required — salary-band assignment runs through job_profile. |
| **COMP-MGMT** | cost_centers | embedded_master | optional | COMP-MGMT local-masters cost_centers for merit-budget allocation only in deployments without finance integration. | Authority: ERP-FIN. Optional: merit budgets are sometimes managed by cost_center, sometimes by org_unit only. |
| **COMP-MGMT** | financial_plans | consumer | optional | COMP-MGMT consumes the approved financial_plan to validate merit-cycle budget envelope. Many deployments run comp planning standalone with an Excel-imported budget number. | Authority: EPM / SWP (financial_plans is contributed-to by SWP). Optional: standalone comp tools accept an Excel-imported budget without a live plan integration. |
| **LMS** | employees | embedded_master | required | LMS local-masters the worker record for learner-profile fields (manager, department, role, hire date) when deployed standalone (Cornerstone, Docebo, 360Learning, TalentLMS); reads from HCM when integrated. | Slice: learner profile (manager hierarchy, department, role). Canonical authority: HCM. Required: required — LMS-standalone deployments always carry a learner file. Skills-cloud LMS (LMS already masters skill_profiles) intensifies this. |
| **LMS** | positions | embedded_master | optional | LMS local-masters positions only for role-based learning-path assignment in deployments without HCM integration; many LMS deployments key off employees + department only. | Authority: HCM. Optional: many LMS deployments don't model positions at all (path-by-role is enough). |
| **LMS** | org_units | embedded_master | required | LMS local-masters org_units for department-scoped course assignment, manager hierarchy, and team-level reporting when deployed standalone. | Slice: department/manager hierarchy for assignment. Canonical authority: HCM. Required: required — LMS reports always aggregate by org_unit. |
| **LMS** | job_profiles | embedded_master | optional | LMS local-masters job_profiles for competency-to-course mapping in skills-cloud LMS deployments; many LMS deployments skip job_profile binding. | Authority: HCM. Optional: only skills-cloud LMS (Degreed, EdCast, Cornerstone Skills Cloud) loads job_profiles; legacy LMS doesn't. |
| **LMS** | cost_centers | embedded_master | optional | LMS local-masters cost_centers for training-cost allocation only when finance integration exists or training-budget tracking is enabled; many deployments skip cost-centre tagging on training. | Authority: ERP-FIN. Optional: SKILL.md cites exactly this case ("departments on LMS"). |
| **TALENT-MGMT** | employees | embedded_master | required | TALENT-MGMT local-masters the worker record for talent-specific fields (career aspirations, mobility preferences, succession status, calibration history) when deployed standalone (Lattice, 15Five, Betterworks, Reflektive); reads from HCM when integrated. Existing row is `contributor` which understates point-solution local-master behaviour. | Slice: talent-state on the worker. Canonical authority: HCM. Required: required — standalone talent suites always carry the worker file. CHANGE candidate — see Section 4. |
| **TALENT-MGMT** | positions | embedded_master | required | TALENT-MGMT local-masters positions for succession-planning, internal-mobility, and nine-box grouping when deployed standalone. | Slice: position attributes for succession (level, criticality, vacancy state). Canonical authority: HCM. Required: required — succession plans bind to positions. |
| **TALENT-MGMT** | org_units | embedded_master | required | TALENT-MGMT local-masters org_units for manager-hierarchy roll-ups, calibration scoping, and goal-cascade trees when deployed standalone. | Slice: manager hierarchy. Canonical authority: HCM. Required: required — calibrations and goal cascades require an org tree. |
| **WFM** | employees | embedded_master | required | WFM local-masters the worker record for schedulable-resource fields (skills, certifications, location, max-hours, seniority) when deployed standalone (Kronos/UKG Pro WFM, Deputy, When-I-Work, Quinyx); reads from HCM when integrated. Existing row is `consumer + required` which is wrong: a standalone WFM always writes a worker file with WFM-specific fields HCM doesn't carry. | Slice: schedulable-resource attributes (max-hours, skill, cert, availability). Canonical authority: HCM. Required: required — every standalone WFM carries a worker file. CHANGE candidate — see Section 4. |
| **WFM** | positions | embedded_master | required | WFM local-masters positions for position-based scheduling (required-skill, location, FTE budget per position) when no HCM is integrated. Existing row is `consumer + required`; standalone WFM writes position data HCM doesn't carry (skill-requirement, premium-pay attributes). | Slice: scheduling-position attributes. Canonical authority: HCM. CHANGE candidate — see Section 4. |
| **WFM** | job_profiles | embedded_master | required | WFM local-masters job_profiles for skill/qualification matching and labour-law class binding (e.g. nurse vs aide rules) when deployed standalone. Existing row is `consumer + required`. | Slice: scheduling-relevant skill/qualification + labour-law class. Canonical authority: HCM. CHANGE candidate — see Section 4. |
| **WFM** | org_units | embedded_master | required | WFM local-masters org_units (locations especially — store, store-zone, branch) as the scheduling hierarchy when deployed standalone. Existing row is `consumer + required`. | Slice: locations-as-scheduling-hierarchy. Canonical authority: HCM (operationally), but WFM carries location-detail HCM doesn't. CHANGE candidate — see Section 4. |
| **WFM** | cost_centers | embedded_master | optional | WFM local-masters cost_centers for labor-cost allocation when finance integration is absent (retail, restaurant, healthcare deployments often tag shifts by cost_center). | Authority: ERP-FIN. Optional: many WFM deployments roll up to org_unit only. |
| **EMP-EXP** | employees | embedded_master | required | EMP-EXP local-masters the worker record for respondent identity, demographic-cohort breakdowns, and manager-hierarchy filtering when deployed standalone (Glint, Culture Amp, Peakon, Lattice Engagement, Qualtrics EmployeeXM); reads from HCM when integrated. | Slice: respondent + demographic + manager-hierarchy attributes. Canonical authority: HCM. Required: required — every standalone engagement platform carries an employee file. |
| **EMP-EXP** | org_units | embedded_master | required | EMP-EXP local-masters org_units for team-level / department-level engagement breakdowns when deployed standalone. | Slice: org-hierarchy for survey-result aggregation. Canonical authority: HCM. Required: required — engagement analytics always cuts by team/department. |
| **PA** | employees | derived | required | PA derives KPIs, cohorts, attrition signals, and predictive features against the canonical employee record. Existing row is `consumer + required`; PA republishes signals — `derived` is the precise role per SKILL.md "PA derives on employees". | Slice: derived analytics over employees. Canonical authority: HCM. CHANGE candidate — see Section 4. |
| **PA** | employment_events | derived | required | PA derives time-based metrics (tenure, time-in-level, time-to-promotion, mobility velocity) against the employment-event stream. Republishes derived signals — `derived` per SKILL.md taxonomy. | Slice: derived analytics. Authority: HCM. CHANGE candidate — see Section 4. |
| **PA** | engagement_drivers | derived | required | PA republishes team/department-grain engagement signals (engagement scores fused with attrition / performance) into cross-cutting people-analytics dashboards. | Slice: derived analytics. Authority: EMP-EXP. CHANGE candidate — see Section 4. |
| **PA** | performance_reviews | derived | required | PA derives rater-bias, distribution, and high-potential cohort analytics against calibrated performance_reviews. | Slice: derived analytics. Authority: TALENT-MGMT. CHANGE candidate — see Section 4. |
| **PA** | absence_requests | derived | required | PA derives leave-trend, burnout-risk, and absenteeism signals against the absence-request stream. | Slice: derived analytics. Authority: WFM. CHANGE candidate — see Section 4. |
| **PA** | learning_records | derived | required | PA derives L&D ROI, skill-gap closure, and compliance-completion analytics against learning_records. | Slice: derived analytics. Authority: LMS. CHANGE candidate — see Section 4. |
| **PA** | pay_slips | derived | required | PA derives pay-equity, total-rewards, and gender-pay-gap analytics against aggregated pay-slip data. | Slice: derived analytics. Authority: PAYROLL. CHANGE candidate — see Section 4. |
| **PA** | positions | consumer | required | PA reads positions for span-of-control, vacancy-rate, and headcount analytics. Not derived — used as a dimensional source, not republished. | Authority: HCM. Required: required for org-design analytics. NEW row — positions not currently linked to PA. |
| **PA** | org_units | consumer | required | PA reads org_units as the analytical hierarchy for every people-KPI dashboard cut. | Authority: HCM. Required: required — every PA dashboard groups by org_unit. NEW row. |
| **PA** | compensation_plans | consumer | optional | PA reads compensation_plans for pay-equity analytics that incorporate plan-design context. Many PA deployments skip this. | Authority: COMP-MGMT. Optional: pay-equity analytics often runs on pay_slips alone. |
| **PA** | merit_recommendations | consumer | optional | PA reads merit_recommendations to inform attrition modelling (under-promoted, under-merited workers). | Authority: COMP-MGMT. Optional: only advanced PA deployments. |
| **PA** | course_enrollments | consumer | optional | PA reads course_enrollments to model learning-engagement features alongside the existing learning_records consumption. | Authority: LMS. Optional: many PA deployments skip enrollment-level detail. |
| **PA** | survey_responses | consumer | required | PA reads survey_responses (anonymised) to fuse engagement signals into attrition and performance modelling. Distinct from engagement_drivers (aggregate) — this is row-level. | Authority: EMP-EXP. Required: required — engagement-as-feature is core PA. |
| **PA** | benefit_enrollments | consumer | optional | PA reads benefit_enrollments for total-rewards-analytics and benefits-utilisation reporting. Many PA deployments skip benefits analytics. | Authority: BEN-ADMIN. Optional. |
| **PA** | time_entries | consumer | optional | PA reads time_entries for productivity, overtime-burden, and burnout-risk feature engineering. | Authority: WFM. Optional: only deployments with hourly/shift workforce. |
| **SWP** | employees | consumer | required | SWP reads employees as the plan-to-actual baseline — current headcount, attrition rates, span-of-control. Not derived — SWP consumes the snapshot to drive scenario modelling, but its own output is workforce_plans (already mastered). | Authority: HCM. Required: required — workforce planning cannot start without a current-state employee baseline. NEW row. |
| **SWP** | org_units | consumer | required | SWP reads org_units as the planning hierarchy — workforce plans are built and rolled up per org_unit. | Authority: HCM. Required: required. NEW row. |
| **SWP** | job_profiles | consumer | required | SWP reads job_profiles for skill-demand modelling (skills_gap_analyses bind to job_profile capability requirements). | Authority: HCM. Required: required for skills-gap analytics. NEW row. |
| **SWP** | cost_centers | consumer | required | SWP reads cost_centers as the cost-allocation dimension for workforce_cost_projections; the projections roll up to financial_plans by cost_center. | Authority: ERP-FIN. Required: required — cost projections must be cost-centre tagged to feed EPM. NEW row. |
| **SWP** | merit_cycles | consumer | optional | SWP reads merit_cycles for cost-of-living and merit-pool assumptions in scenario modelling. Many SWP deployments use Excel-imported assumptions. | Authority: COMP-MGMT. Optional. |
| **SWP** | salary_bands | consumer | optional | SWP reads salary_bands to anchor workforce_cost_projections to market-aligned compensation by job-architecture level. | Authority: COMP-MGMT. Optional: many SWP tools use blended-average comp instead. |
| **SWP** | attrition_forecasts | consumer | required | SWP reads attrition_forecasts (PA-derived) as the attrition assumption in scenario modelling. | Authority: PA. Required: required — attrition is the largest assumption in workforce planning. NEW row. |
| **HCM** | cost_centers | consumer | required | HCM additionally consumes cost_centers (beyond contributing org-alignment) for the worker → cost-centre payroll-allocation chain. Existing `contributor + required` row stays — this is the additional read path. | Authority: ERP-FIN. Required: yes. Marginal — the existing contributor row already implies the read. Flagged as ambiguous in Section 6; do not load by default. |
| **HRSD** | employees | embedded_master | optional | HRSD local-masters case-relevant worker fields (case routing context, manager hierarchy snapshot at case-open time) when deployed standalone or where HCM integration is degraded; reads from HCM otherwise. Existing row is `consumer + required` — for ServiceNow-HRSD-style deployments this is correct, for Workday-HelpDesk-style deployments it isn't. | Slice: case-context worker attributes. Canonical authority: HCM. Optional: holistic deployments demote to consumer; standalone HRSD (rare) goes local. Ambiguous — flagged in Section 6. |

NEW row totals: 0 master, 28 embedded_master, 0 contributor, 19 consumer, 7 derived → **54 NEW rows** (the 7 derived rows in Section 3 are also listed as CHANGES in Section 4; the net new rows after dedup are 47). The 7 derived rows are the PA changes from `consumer → derived` — they are listed in both sections deliberately because the corrected role is *the* point of the backfill, not a side effect.

**Net NEW rows (deduplicated against Section 4 changes):** 47 (28 embedded_master + 19 consumer).

---

## 4. CHANGES to existing rows

The cluster has two recurring misclassification shapes: (a) `master` rows on the shared `employees` flagship that should remain `master` (each owns a real slice — verified) so **no `master → embedded_master` demotions are proposed**; (b) `consumer` and `contributor` rows on workflow-load-bearing local copies that should be `embedded_master` because the domain genuinely *would* hold the record in a standalone deployment.

| domain_code | data_object_name | from (role/necessity) | to (role/necessity) | reasoning |
|---|---|---|---|---|
| ONBOARDING | employees | contributor / required | embedded_master / required | Standalone onboarding platforms (Enboarder, Sapling, Talmundo) build a full worker file from offer.accepted through Day-90; the "contributor" framing understates this. They write onboarding-state fields *and* maintain a local pre-employee → employee record. |
| BEN-ADMIN | employees | contributor / required | embedded_master / required | Standalone benefit-admin platforms (PlanSource, bswift, Maxwell, Selerix) carry the full benefit-eligibility worker file. Contributor framing understates standalone behaviour. |
| COMP-MGMT | employees | contributor / required | embedded_master / required | Standalone comp-management (Pave, Comp, Beqom, CompXL, Payscale Marketpay) carries the full worker file with comp-relevant attributes. Contributor framing understates standalone behaviour. |
| TALENT-MGMT | employees | contributor / required | embedded_master / required | Standalone talent suites (Lattice, 15Five, Betterworks, Reflektive, Eloomi) carry the full worker file with talent-state. Contributor framing understates standalone behaviour. |
| WFM | employees | consumer / required | embedded_master / required | Standalone WFM (UKG Pro WFM/Kronos, Deputy, When-I-Work, Quinyx, Legion) writes a worker file with WFM-only fields (max-hours, premium-pay rules, skill, cert expiry, availability) HCM doesn't carry. Pure-consumer is wrong. |
| WFM | positions | consumer / required | embedded_master / required | Same shape — WFM carries position attributes (premium-pay, skill-requirement, location-specific work rules) HCM doesn't. |
| WFM | job_profiles | consumer / required | embedded_master / required | Same shape — WFM carries scheduling-relevant job-class attributes for labour-law compliance. |
| WFM | org_units | consumer / required | embedded_master / required | Same shape — WFM-standalone carries location-detail HCM org_units don't (store-zone, sub-floor, line). |
| PA | employees | consumer / required | derived / required | PA republishes derived signals (KPIs, cohorts, attrition risk) against employees — `derived` per SKILL.md taxonomy is precise; `consumer` understates the republication. |
| PA | employment_events | consumer / required | derived / required | PA computes derived time-based metrics; republishes as people-KPIs. `derived` is correct. |
| PA | engagement_drivers | consumer / required | derived / required | PA fuses engagement signals into derived attrition / performance dashboards. |
| PA | performance_reviews | consumer / required | derived / required | PA derives rater-bias and HiPo cohort analytics. |
| PA | absence_requests | consumer / required | derived / required | PA derives leave-trend, burnout-risk, absenteeism. |
| PA | learning_records | consumer / required | derived / required | PA derives L&D ROI, skill-gap closure. |
| PA | pay_slips | consumer / required | derived / required | PA derives pay-equity / total-rewards analytics. |
| ATS | salary_bands | consumer / required | consumer / optional | Pay-transparency disclosure is legally required in some jurisdictions and not others. ATS standalone deployments outside those jurisdictions skip salary-band integration entirely. Necessity flip only; role stays consumer (ATS doesn't write to bands). |
| ATS | career_aspirations | consumer / required | consumer / optional | Internal-mobility integration is a "nice-to-have" — most ATS deployments without integrated talent suites skip it. Workflow functions without it. |
| HCM | engagement_drivers | consumer / required | consumer / optional | Surfacing engagement scores on manager dashboards is a holistic-HCM-suite feature (Workday Engage); many HCM deployments don't surface engagement at all. Optional. |
| HCM | contingent_workers | consumer / required | consumer / optional | Unified-workforce visibility is an emerging holistic feature; many HCM deployments don't integrate contingent-worker data at all (it lives in VMS/SOW tools). Optional. |
| HCM | people_kpis | consumer / required | consumer / optional | KPI surfacing on HCM dashboards requires PA integration; many HCM deployments use HCM's native reporting only. Optional. |
| HCM | skill_profiles | consumer / required | consumer / optional | Skills-cloud surfacing on the worker record requires LMS-skills-cloud or talent-cloud integration; pre-skills-cloud HCM deployments don't carry skill_profile data. Optional. |
| HCM | absence_requests | consumer / required | consumer / optional | HCM consuming WFM-mastered absence_requests for PTO-balance update is a tight WFM↔HCM integration; many HCM deployments run their own absence/PTO module instead (overlap with WFM is jurisdictional). Optional. |
| PA | saas_usage_metrics | consumer / required | consumer / optional | SaaS-tool-adoption analytics in PA is a SMP-integration-dependent capability; many PA deployments don't have SMP integrated. Optional. |
| PA | customers | consumer / required | consumer / optional | Customer-side PA analytics (employees-as-customers, CS-team workload) is a niche cross-cluster integration. Optional. |
| PA | call_recordings | consumer / required | consumer / optional | Conversation-intelligence integration into PA is a niche / emerging capability. Optional. |
| PAYROLL | merit_recommendations | consumer / required | consumer / optional | The merit-cycle handoff into PAYROLL is only required when comp-management is integrated. Many payrolls receive pay-rate changes via direct entry, not via merit_recommendations. Optional. |
| PAYROLL | expense_reports | consumer / required | consumer / optional | Routing reimbursable expenses through payroll is one of two valid patterns; the other is AP. Many payroll deployments don't carry expense_reports at all. Optional. |
| SWP | financial_plans | contributor / required | contributor / optional | SWP contributing workforce-cost line to financial_plans only happens when EPM/finance integration exists. Many SWP deployments export to Excel and finance imports manually. Optional. |
| SWP | people_kpis | consumer / required | consumer / optional | SWP consuming live PA-derived KPIs requires PA integration; many SWP deployments use Excel-imported snapshots. Optional. |
| TALENT-MGMT | job_profiles | contributor / required | contributor / optional | Talent-management contributing competency-slice to job_profiles is a Workday-Talent-style holistic feature; standalone talent suites carry their own competency models that don't write back to HCM job_profiles. Optional. |

Total CHANGES: **30 rows** (9 role changes — 8 to embedded_master + 7 PA to derived = 15 role changes total, minus the salary_bands which is necessity-only; corrected: **15 role demotions** {4 contributor→embedded_master on employees, 4 WFM consumer→embedded_master, 7 PA consumer→derived} + **15 necessity flips** required→optional).

Re-tallied: **15 role changes + 15 necessity flips = 30 total CHANGES**.

**Explicitly NOT changing:** Every existing `master` row on `employees` (HCM, PAYROLL) stays `master + required`. The two-domain canonical-master claim on `employees` is correct per SKILL.md ("HCM + Payroll + IGA all master required slices"). HCM masters identity/employment; PAYROLL masters payable/withholding. No demotion warranted. Similarly, every existing `master` row on `job_requisitions` (ATS, SWP), `skill_profiles` (LMS), and on the per-domain anchors (work_schedules, courses, benefit_plans, etc.) stays as-is.

---

## 5. Boundary observations

- **`employees` is the cluster flagship.** After this backfill, `employees` has 2 canonical `master` rows (HCM, PAYROLL) and **8 `embedded_master + required` rows** (ATS, ONBOARDING, BEN-ADMIN, COMP-MGMT, LMS, TALENT-MGMT, WFM, EMP-EXP) plus 1 `derived` (PA) plus 1 ambiguous embedded_master (HRSD, optional) plus existing consumer rows (PA's pre-change state). Signal 1b on `employees` after backfill: **10 embedded_master records** — almost certainly the highest in the catalog. This is the structural fingerprint of "every HR point-solution holds a worker file" → the platform value proposition.

- **`positions`, `org_units`, `job_profiles` are the cluster's secondary-tier flagships.** Each gains 5-7 embedded_master rows after backfill. They share the canonical-master in HCM but every point-solution local-masters them.

- **Cross-cluster authority sharing emerges in three places:** `cost_centers` (canonical: ERP-FIN; embedded_master in PAYROLL/COMP-MGMT/LMS/WFM/ATS), `legal_entities` (canonical: ERP-FIN; consumer in PAYROLL/BEN-ADMIN), `hardware_assets` (canonical: ITAM; consumer in ONBOARDING via service_requests handoff). These are the canonical HR↔ERP↔IT boundaries; each is a known high-friction integration zone.

- **`salary_bands` is the comp-cluster flagship within HR.** Canonical-master COMP-MGMT, embedded_master in ATS (optional, jurisdiction-dependent), consumer in SWP (optional). Highest-value silo-detection: ATS without comp-management integration is a recurring deployment pattern.

- **The TALENT-MGMT / LMS / EMP-EXP / PA tetrad shares `skill_profiles`, `engagement_drivers`, `survey_responses`, `performance_reviews`.** This is the "people-suite" integration burden — Workday HCM-Talent-Learning-PA, SAP SF, Cornerstone Galaxy, Lattice/15Five/Culture-Amp all try to absorb this. Multi-master/multi-embedded_master coverage on these four objects is the structural signal.

- **PA's role corrections are the largest Signal 1b clean-up in the cluster.** Pre-backfill PA had 14 rows, all `consumer + required`. Post-backfill PA has 7 `derived + required` (signals republished) + multiple `consumer + optional`. This sharpens Phase 4 burden scoring on the analytics-republication shape.

- **Highest-value silo-detection signals from this cluster (Signal 1b candidates):**
  1. `employees` — 8+ embedded_master rows post-backfill (canonical: HCM). The flagship.
  2. `positions` — ~5 embedded_master rows post-backfill (canonical: HCM).
  3. `org_units` — ~7 embedded_master rows post-backfill (canonical: HCM).
  4. `cost_centers` — 4 HR-cluster embedded_masters post-backfill (canonical: ERP-FIN). Cross-cluster.
  5. `salary_bands` — 1 HR-cluster embedded_master (ATS) post-backfill, plus likely more in cross-cluster (revenue / sales-comp / partner-comp).
  6. `job_profiles` — ~4 embedded_master rows post-backfill (canonical: HCM).

---

## 6. Open questions for human review

- **HRSD → employees** is currently `consumer + required`. The proposal in Section 3 is to convert to `embedded_master + optional`. The case is genuinely ambiguous: ServiceNow HRSD does carry a worker-record (embedded_master shape); Workday Help is a pure consumer of the HCM record. Worth a human call before applying. **Defaulting to NO change** unless reviewer says otherwise.

- **HCM → cost_centers** has an existing `contributor + required` row (HCM contributes org-unit-to-cost-centre alignment). I considered also adding `consumer + required` for the payroll-allocation read path but it overlaps semantically. Recommendation: leave the contributor row alone, do not add a duplicate consumer row.

- **PAYROLL → benefit_dependents** proposed as `consumer + optional`. The US-imputed-income workflow is the only required case. If catalog scope is US-payroll-first this should be `required`; if global, `optional`. **Recommendation: optional** (catalog is multi-jurisdiction).

- **LMS → positions and LMS → job_profiles** as embedded_master is conditional on skills-cloud LMS deployments. The role split (embedded_master) is right but the necessity (optional) reflects "many LMS deployments don't carry these". Reviewer should confirm whether the optional-vs-required default leans toward holistic-skills-cloud assumption.

- **SWP → positions** currently `contributor + required` (SWP "contributes proposed positions via org_designs"). Should this also gain an `embedded_master + optional` row for SWP-standalone deployments (Anaplan workforce, Visier Plan, Adaptive Planning workforce)? Standalone workforce-planning tools do carry a position model. **Recommendation: do NOT add** — the existing contributor row implies the relationship, and adding an embedded_master would create a Signal-1b double-count.

- **TALENT-MGMT → succession_plans** has no contributor/consumer relationship with HCM positions despite succession plans binding to positions. Should we add `consumer + required` for TALENT-MGMT → positions? **YES** — captured as embedded_master in Section 3 (since standalone talent suites carry positions locally), but the alternative consumer-only framing is defensible. Reviewer should pick.

- **The catalog has no `departments` data_object.** HR-cluster domains use `org_units` for both department and location concepts. This is fine for the backfill (we propose embedded_master rows on org_units instead). Flagging: should a future cleanup split `org_units` into `departments` + `locations`? Out of scope for this backfill.

- **The catalog has no `currencies`, `countries`, `holiday_calendars`, `legal_entities`-level master tables.** Only `legal_entities` (id 197) exists. `currencies` and `countries` would naturally be cross-cluster masters consumed by PAYROLL / BEN-ADMIN / COMP-MGMT. Flagging only — out of scope, do not invent.

- **No `terminations` / `offboarding_plans` / `exit_interviews` / `grievances` / `disciplinary_actions` data_objects exist.** ONBOARDING masters the onboarding-side flagship but there is no symmetric offboarding-side master in the catalog. The HCM `employee.terminated` event (already in `cross_domain_handoffs`) fires against the `employees` master, not against a `terminations` object. Flagging — possible Phase-1 gap, but out of scope for this backfill.

- **HCM contributor on asset_lifecycle_events** captures the termination-asset-recall workflow. Should HCM also be `contributor` on a hypothetical `terminations` object? Moot until the object exists. Flagging.

- **PA → identity_graphs / employee_golden_records** (catalog ids 112, 317) — these are master-data-management objects, mastered elsewhere. PA likely consumes them. Out of scope unless reviewer wants to add.

---

## 7. Summary counts

- Existing rows in cluster: **88**
- NEW rows proposed: **47** (0 master, 28 embedded_master, 0 contributor, 19 consumer, 0 derived). (Note: the 7 PA derived rows are CHANGES from existing consumer rows and are counted in the CHANGES section, not as new rows.)
- Changes to existing: **30** (15 role demotions: 4 contributor→embedded_master on `employees` [ONBOARDING/BEN-ADMIN/COMP-MGMT/TALENT-MGMT], 4 consumer→embedded_master on WFM [employees/positions/job_profiles/org_units], 7 consumer→derived on PA [employees/employment_events/engagement_drivers/performance_reviews/absence_requests/learning_records/pay_slips] + 15 necessity flips required→optional)
- Master → embedded_master demotions: **0** (every existing `master` row is genuinely canonical)
- Open questions: **10** (HRSD-employees role/necessity, HCM-cost_centers double-link, PAYROLL-benefit_dependents jurisdictional default, LMS-positions/job_profiles necessity default, SWP-positions embedded_master vs contributor double-count, TALENT-MGMT-positions framing, missing `departments`/`locations` split, missing `currencies`/`countries` masters, missing termination/offboarding data_objects, MDM data_objects)

Post-backfill cluster row count: 88 + 47 = **135 rows**.
Post-backfill Signal-1b leaderboard preview (within HR cluster):
- `employees`: 2 master + 8 embedded_master(req) + 1 derived + (existing consumers) → **highest-burden record in HR**.
- `org_units`: 1 master + ~7 embedded_master(req).
- `positions`: 1 master + ~5 embedded_master(req).
- `job_profiles`: 1 master + ~3 embedded_master(req) + 1-2 embedded_master(opt).
- `cost_centers`: 0 HR-canonical-master (ERP-FIN canonical) + 4 HR-cluster embedded_master(req) + 2 embedded_master(opt).
