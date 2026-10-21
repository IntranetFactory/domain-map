# Phase B3 cluster brief — A_core_people

**Domains:** HCM, PAYROLL, ONBOARDING — author lifecycle states + pattern flags for every master+required data_object listed below.

## Task

For every entity in this brief, return: (a) lifecycle states (snake_case state_name; state_order; is_initial; is_terminal; requires_permission; permission_verb_override only when needed; one-line description), OR `(static-reference: no lifecycle)` if it's pure reference data (e.g. tax_authorities, recruitment_sources, salary_bands, pricing_rules); AND (b) pattern flags has_personal_content / has_submit_lock / has_single_approver (true/false with one-line justification).

## Output format (strict — the loader parses this)

Use this exact shape per entity:

````
### <data_object_name>

**Pattern flags:** has_personal_content=<true|false>; has_submit_lock=<true|false>; has_single_approver=<true|false>

**Justification:** <one-line rationale covering any flag set to true; if all false write `no behavioral pattern applies`>

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| <snake_case> | <int> | <true|false> | <true|false> | <true|false> | <verb or _> | <one line> |
````

Or, for reference data:

````
### <data_object_name>

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false
````

## Decision guidance

- **`has_personal_content=true`** when row content is per-user-scoped and visibility/edit is row-author-only by default (e.g. `interview_scorecards`, `csat_responses`, `merit_recommendations`, `pay_slips`).
- **`has_submit_lock=true`** when the entity follows draft → submit-then-lock (e.g. `interview_scorecards` lock on submit, `tax_filings` lock once filed, `merit_recommendations` lock on submit).
- **`has_single_approver=true`** when an explicit single approver gates a transition (e.g. `job_offers` need hiring-manager approval, `discount_approvals` need a deal-desk approver, `purchase_requisitions` need a budget approver).
- **`requires_permission=true`** on a lifecycle state when reaching that state needs a workflow gate (`approved`, `submitted`, `hired`, `resolved`, `closed`). The state's verb derives the permission name (`approved → ats:approve_<entity>`, `hired → ats:hire_<entity>`); set `verb_override` only when the natural verb differs from the state name.
- **State naming:** snake_case, past-tense or status-noun (`draft`, `submitted`, `approved`, `active`, `closed`, `cancelled`). Stay consistent across sibling entities in a domain.
- **Static-reference test:** if the entity has no meaningful state transitions beyond `active/inactive` and exists primarily to be referenced as configuration (codes, rules, catalogs, banded data), mark it `static-reference`. Don't invent CRUD states.

## Entities in scope

### Domain HCM — Human Capital Management (id 54)

> Core HR system of record covering worker data, organisation and position management, self-service, and lifecycle workflows. The HRIS / system-of-record layer of the HR stack.

#### employees

- **Plural label:** Employees · **Singular:** Employee
- **Description:** Canonical record of a person currently or formerly employed by the organization. Carries identity (legal name, contact, IDs), employment metadata (start date, end date, employment type, country), and pointers to position, job profile, org unit, manager, and life-event history. The most multi-mastered data object in the catalog: HCM masters the core HR slice, Payroll masters the comp/withholding slice, and IGA masters the identity/access slice. Onboarding, PA, and Talent Management consume or contribute.
- **Aliases:** worker (synonym); personnel (synonym)
- **Relationships (≤12):** org_units —groups→ employees (one_to_many, req); hcm_positions —is_filled_by→ employees (one_to_one); employees —signs→ employment_contracts (one_to_many, req); employees —generates→ employment_events (one_to_many, req); employees —triggers→ asset_lifecycle_events (one_to_many); employees —requests→ absence_requests (one_to_many); employees —holds→ skill_profiles (one_to_one); employees —is_linked_to→ users (one_to_one); employees —triggers→ service_requests (one_to_many); employees —feeds→ agency_time_entries (one_to_many); employees —triggers→ iga_provisioning_events (one_to_many); employees —triggers→ pay_runs (one_to_many)

#### employment_contracts

- **Plural label:** Employment Contracts · **Singular:** Employment Contract
- **Description:** Contractual terms of employment: contract type (permanent, fixed-term, contractor, intern), start and end dates, governing jurisdiction, working hours, notice period, IP and non-compete clauses, references to the signed document. HCM masters; HRSD contributes when employee-relations cases reference contract terms.
- **Aliases:** offer letter (synonym); employment agreement (synonym)
- **Relationships (≤12):** employees —signs→ employment_contracts (one_to_many, req); users —approves→ employment_contracts (one_to_many); employment_contracts —triggers→ iga_provisioning_events (one_to_many); employment_contracts —feeds→ pay_runs (one_to_many)

#### employment_events

- **Plural label:** Employment Events · **Singular:** Employment Event
- **Description:** Lifecycle event records for an employee: hire, promotion, transfer, leave start, leave return, comp change, termination. The audit history that drives plan-vs-actual analytics (PA consumer) and downstream system updates. HCM masters; PA derives metrics from the event stream.
- **Aliases:** personnel action (synonym); worker lifecycle event (synonym)
- **Relationships (≤12):** employees —generates→ employment_events (one_to_many, req); users —records→ employment_events (one_to_many); employment_events —triggers→ iga_provisioning_events (one_to_many); employment_events —feeds→ pay_runs (one_to_many); employment_events —triggers→ benefit_enrollments (one_to_many); employment_events —feeds→ people_kpis (one_to_many); store_audits —triggers→ employment_events (one_to_many)

#### hcm_positions

- **Plural label:** Positions · **Singular:** Position
- **Description:** Approved slot in the org — a 'chair' with role definition, cost center, reporting line, location, and FTE allocation. Distinct from job_profiles (the catalog definition) and from employees (the person filling the slot). A position can be open, filled, or eliminated. SWP designs future positions via org_designs; HCM operationalizes them once approved.
- **Aliases:** seat (synonym); headcount slot (synonym)
- **Relationships (≤12):** org_units —contains→ hcm_positions (one_to_many, req); hcm_positions —is_filled_by→ employees (one_to_one); job_profiles —defines→ hcm_positions (one_to_many, req); users —manages→ hcm_positions (one_to_many); hcm_positions —spawns→ job_requisitions (one_to_many); salary_bands —anchors→ hcm_positions (one_to_many); employees —fills→ hcm_positions (one_to_one); hcm_positions —requires→ compliance_assignments (one_to_many)

#### job_profiles

- **Plural label:** Job Profiles · **Singular:** Job Profile
- **Description:** Canonical role definition in the job catalog: title, family, level, responsibilities, required skills and competencies, pay range, FLSA classification. Distinct from positions (which are slots referencing a profile). Many positions share a single job profile.
- **Aliases:** role profile (synonym); job catalog entry (synonym)
- **Relationships (≤12):** job_profiles —defines→ hcm_positions (one_to_many, req); job_profiles —maps_to→ skill_profiles (many_to_many); users —owns→ job_profiles (one_to_many); job_profiles —feeds→ job_postings (one_to_many); job_profiles —maps_to→ courses (many_to_many); salary_bands —bands→ job_profiles (one_to_many); job_profiles —requires→ learning_paths (many_to_many); job_profiles —expects→ skill_profiles (many_to_many)

#### org_units

- **Plural label:** Org Units · **Singular:** Org Unit
- **Description:** Node in the organizational hierarchy: division, business unit, department, team. Carries manager, cost center alignment, geographic scope, and parent/child relationships. HCM masters the operational hierarchy; EPM contributes the cost-center mapping (which would be Finance-mastered once a Finance/GL domain is loaded).
- **Aliases:** department (synonym); cost-bearing unit (synonym)
- **Relationships (≤12):** org_units —groups→ employees (one_to_many, req); org_units —contains→ hcm_positions (one_to_many, req); cost_centers —funds→ org_units (one_to_many, req); org_units —engages→ contingent_workers (one_to_many); org_units —is_scored_by→ engagement_drivers (one_to_many); org_units —is_measured_by→ people_kpis (one_to_many); users —leads→ org_units (one_to_many); org_units —triggers→ iga_entitlement_definitions (one_to_many); org_units —maps_to→ cost_centers (one_to_one); org_units —sponsors→ compliance_assignments (one_to_many); org_units —sponsors→ benefit_plans (many_to_many); survey_campaigns —targets→ org_units (many_to_many)

### Domain PAYROLL — Payroll Management (id 55)

> Gross-to-net calculation, statutory tax filing, garnishments, pay distribution, and multi-country payroll execution.

#### deduction_codes

- **Plural label:** Deduction Codes · **Singular:** Deduction Code
- **Description:** Configurable definition of a deduction (pre-tax 401k, post-tax Roth, medical premium, HSA, garnishment, union dues) with priority, ceiling, and GL mapping. Drives net-pay arithmetic and benefits-payroll integration.
- **Relationships (≤12):** benefit_plans —deducts_via→ deduction_codes (many_to_many)

#### earning_codes

- **Plural label:** Earning Codes · **Singular:** Earning Code
- **Description:** Configurable definition of an earning type (regular, overtime, bonus, commission, severance, retro-pay) with tax treatment, GL mapping, accumulator rules, and country localisation. Foundation of the payroll calculation engine.

#### employees

- **Plural label:** Employees · **Singular:** Employee
- **Description:** Canonical record of a person currently or formerly employed by the organization. Carries identity (legal name, contact, IDs), employment metadata (start date, end date, employment type, country), and pointers to position, job profile, org unit, manager, and life-event history. The most multi-mastered data object in the catalog: HCM masters the core HR slice, Payroll masters the comp/withholding slice, and IGA masters the identity/access slice. Onboarding, PA, and Talent Management consume or contribute.
- **Master slice notes:** Comp / withholding / payable slice — gross-to-net rules, deductions, tax setup, bank account, pay history. HCM masters the core HR record, Payroll masters the payable view, IGA masters the identity view.
- **Aliases:** worker (synonym); personnel (synonym)
- **Relationships (≤12):** org_units —groups→ employees (one_to_many, req); hcm_positions —is_filled_by→ employees (one_to_one); employees —signs→ employment_contracts (one_to_many, req); employees —generates→ employment_events (one_to_many, req); employees —triggers→ asset_lifecycle_events (one_to_many); employees —requests→ absence_requests (one_to_many); employees —holds→ skill_profiles (one_to_one); employees —is_linked_to→ users (one_to_one); employees —triggers→ service_requests (one_to_many); employees —feeds→ agency_time_entries (one_to_many); employees —triggers→ iga_provisioning_events (one_to_many); employees —triggers→ pay_runs (one_to_many)

#### garnishment_orders

- **Plural label:** Garnishment Orders · **Singular:** Garnishment Order
- **Description:** Court-ordered or agency-issued instruction to withhold from an employee's wages (child support, tax levy, bankruptcy, student loan, creditor). Carries priority, ceiling, remit-to instructions, and lifecycle (active, released, exhausted).

#### pay_runs

- **Plural label:** Pay Runs · **Singular:** Pay Run
- **Description:** A single payroll cycle execution, scoped to pay group, country, and pay period. Drives gross-to-net calculation across the eligible employee population and produces pay_slips, payroll_journal_entries, and tax_filings. The atomic unit of payroll operations.
- **Relationships (≤12):** employees —triggers→ pay_runs (one_to_many); employment_events —feeds→ pay_runs (one_to_many); employment_contracts —feeds→ pay_runs (one_to_many); pay_runs —activated by→ onboarding_journeys (one_to_many); pay_runs —finalized by→ onboarding_document_collections (one_to_many); benefit_carriers —triggers→ pay_runs (one_to_many); benefit_enrollments —adjusts→ pay_runs (one_to_many); life_events —adjusts→ pay_runs (one_to_many); contingent_timesheets —feeds→ pay_runs (one_to_many); expense_lines —feeds→ pay_runs (many_to_many)

#### pay_slips

- **Plural label:** Pay Slips · **Singular:** Pay Slip
- **Description:** Per-employee per-cycle gross-to-net statement: earnings, pre/post-tax deductions, employer contributions, tax withholdings, net pay, YTD totals. Called Pay Stub (US), Payslip (UK/AU/IE), Bulletin de Paie (FR), Lohnzettel (DE), Holerite (BR). Worker-portal accessible; legally retained per jurisdiction.

#### payroll_journal_entries

- **Plural label:** Payroll Journal Entries · **Singular:** Payroll Journal Entry
- **Description:** GL posting produced by a pay_run, decomposed by cost_center / department / earning_code / deduction_code into debit and credit lines. The payroll-to-finance handoff payload.
- **Relationships (≤12):** benefit_enrollments —posts_to→ payroll_journal_entries (one_to_many)

#### tax_authorities

- **Plural label:** Tax Authorities · **Singular:** Tax Authority
- **Description:** Federal, state, provincial, or local taxing jurisdiction with rate tables, deposit schedules, and reporting forms. Includes US IRS/state/locals, UK HMRC, German Finanzamt, French URSSAF, Australian ATO.

#### tax_filings

- **Plural label:** Tax Filings · **Singular:** Tax Filing
- **Description:** Periodic statutory submission to a tax authority (US 941/W-2, UK FPS/EPS, German DEUEV/Lohnsteueranmeldung, French DSN, Australian STP). Includes payment and reporting; failure carries penalties.

### Domain ONBOARDING — Employee Onboarding (id 99)

> Orchestration of pre-boarding, Day-1, and 30/60/90 workflows for new hires — task lists, welcome experiences, documentation, e-signature, buddy assignments, and downstream provisioning coordination. Distinct point-solution market (Enboarder, Talmundo, ClickBoarding, Appical, Kallidus/Sapling) although onboarding capabilities are commonly bundled inside ATS (iCIMS Onboard, Greenhouse Onboarding, SmartRecruiters Onboarding), HCM (Workday Journeys, BambooHR, HiBob, Rippling), and HRSD platforms. Operates primarily as a downstream-trigger pattern: offer.accepted (ATS) and employee.created (HCM) drive journey instantiation, which then fans out events to ITSM (provisioning), IWMS (facilities), Payroll (activation), LMS (compliance training), HRSD (case escalation), and IGA (access provisioning) — making it the textbook case for the cross_domain_handoffs analytic.

#### buddy_assignments

- **Plural label:** Buddy Assignments · **Singular:** Buddy Assignment
- **Description:** Pairing of a new hire with an existing employee for the onboarding period — buddy, mentor, peer-coach, or sponsor depending on the program. Carries scope (peer / cross-functional), start and end dates, and meeting cadence.
- **Aliases:** onboarding mentor (synonym); new-hire buddy (synonym)
- **Relationships (≤12):** onboarding_journeys —assigns→ buddy_assignments (one_to_many); users —mentors→ buddy_assignments (one_to_many, req)

#### onboarding_cohorts

- **Plural label:** Onboarding Cohorts · **Singular:** Onboarding Cohort
- **Description:** Group of new hires onboarding together (campus intake class, training boot-camp batch, executive cohort, frontline class). Enables shared activities (group orientation, cohort meetings) and cohort-level analytics distinct from the per-journey view.
- **Aliases:** new-hire class (synonym); start cohort (synonym)
- **Relationships (≤12):** onboarding_cohorts —groups→ onboarding_journeys (one_to_many); users —manages→ onboarding_cohorts (one_to_many)

#### onboarding_document_collections

- **Plural label:** Onboarding Document Collections · **Singular:** Onboarding Document Collection
- **Description:** Record of paperwork collected from a new hire as part of the journey: I-9, NDA, handbook acknowledgement, direct-deposit form, country-specific tax forms, country-specific work-permit evidence. Captures signature state, provider-reference ids (DocuSign / Adobe Sign envelope ids), and audit metadata. Distinct from the canonical document templates, which would be mastered by a Document Management domain (not yet in catalog).
- **Aliases:** new-hire paperwork (synonym); day-one forms (synonym)
- **Relationships (≤12):** onboarding_journeys —collects→ onboarding_document_collections (one_to_many); users —approves→ onboarding_document_collections (one_to_many); employees —finalized by→ onboarding_document_collections (one_to_many); pay_runs —finalized by→ onboarding_document_collections (one_to_many)

#### onboarding_journeys

- **Plural label:** Onboarding Journeys · **Singular:** Onboarding Journey
- **Description:** Instance of an onboarding plan applied to a specific new hire. Materialized when offer.accepted (ATS) or employee.created (HCM) fires. Carries the bound employee_id, assigned tasks, completion state, current stage, and milestone timestamps (pre-boarding start, Day-1 reached, 30/60/90 completion).
- **Aliases:** new-hire journey (synonym); onboarding workflow (synonym)
- **Relationships (≤12):** employees —spawns→ onboarding_journeys (one_to_one); onboarding_plans —templates→ onboarding_journeys (one_to_many, req); onboarding_journeys —contains→ onboarding_stages (one_to_many, req); onboarding_journeys —collects→ onboarding_document_collections (one_to_many); onboarding_journeys —sends→ welcome_communications (one_to_many); onboarding_cohorts —groups→ onboarding_journeys (one_to_many); onboarding_journeys —assigns→ buddy_assignments (one_to_many); employees —onboarded by→ onboarding_journeys (one_to_many, req); users —onboards→ onboarding_journeys (one_to_many, req); users —owns→ onboarding_journeys (one_to_many); pay_runs —activated by→ onboarding_journeys (one_to_many); onboarding_journeys —spawns→ survey_campaigns (one_to_many)

#### onboarding_plans

- **Plural label:** Onboarding Plans · **Singular:** Onboarding Plan
- **Description:** Reusable template defining the stages, tasks, timing, and assignees that make up an onboarding journey for a class of new hire (e.g. engineering, sales, executive, hourly retail, contractor). Plans are versioned and selected based on role / location / employment type when a journey is instantiated.
- **Aliases:** onboarding template (synonym); new-hire program (synonym)
- **Relationships (≤12):** onboarding_plans —templates→ onboarding_journeys (one_to_many, req); users —maintains→ onboarding_plans (one_to_many)

#### onboarding_stages

- **Plural label:** Onboarding Stages · **Singular:** Onboarding Stage
- **Description:** Phase within a plan or journey (pre-boarding, Day-1, week-1, month-1, 30/60/90 day). Defines task grouping, expected duration, and gate conditions. Stages can be sequenced or run in parallel.
- **Aliases:** onboarding phase (synonym); journey milestone group (synonym)
- **Relationships (≤12):** onboarding_journeys —contains→ onboarding_stages (one_to_many, req); onboarding_stages —contains→ onboarding_tasks (one_to_many, req)

#### onboarding_tasks

- **Plural label:** Onboarding Tasks · **Singular:** Onboarding Task
- **Description:** Discrete to-do within a journey: sign I-9, attend orientation, complete compliance training, meet buddy, receive laptop. Carries assignee (new hire / manager / IT / facilities / HR), due date, completion state, evidence, and task type (form / training / meeting / provisioning / acknowledgement). Many tasks are local; a subset triggers cross-domain handoffs into ITSM, IWMS, Payroll, LMS, IGA, or HRSD.
- **Aliases:** onboarding to-do (synonym); new-hire checklist item (synonym)
- **Relationships (≤12):** onboarding_stages —contains→ onboarding_tasks (one_to_many, req); onboarding_tasks —emits→ service_requests (one_to_many); onboarding_tasks —triggers→ asset_lifecycle_events (one_to_many); users —performs→ onboarding_tasks (one_to_many); users —created→ onboarding_tasks (one_to_many); onboarding_tasks —emits→ service_incidents (one_to_many); onboarding_tasks —emits→ workplace_service_requests (one_to_many); onboarding_tasks —spawns→ hr_cases (one_to_many); onboarding_tasks —spawns→ iga_access_requests (one_to_many); onboarding_tasks —spawns→ course_enrollments (one_to_many)

#### welcome_communications

- **Plural label:** Welcome Communications · **Singular:** Welcome Communication
- **Description:** Email, video, push notification, or SMS sent to a new hire during the journey — pre-boarding nudges, Day-1 schedule, post-Day-1 check-ins, cohort announcements. Carries channel, template, scheduled send time, delivery state, and engagement metrics.
- **Aliases:** welcome email (synonym); new-hire announcement (synonym)
- **Relationships (≤12):** onboarding_journeys —sends→ welcome_communications (one_to_many); users —sends→ welcome_communications (one_to_many)
