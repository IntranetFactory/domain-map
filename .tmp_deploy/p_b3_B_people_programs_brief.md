# Phase B3 cluster brief — B_people_programs

**Domains:** COMP-MGMT, BEN-ADMIN, LMS — author lifecycle states + pattern flags for every master+required data_object listed below.

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

### Domain COMP-MGMT — Compensation Management (id 60)

> Compensation planning cycles, pay-equity analysis, bonus and incentive plans, market benchmarking, and equity administration.

#### compensation_benchmarks

- **Plural label:** Compensation Benchmarks · **Singular:** Compensation Benchmark
- **Description:** Imported market salary data for a job-level-geography combination, sourced from a survey provider (Radford, Mercer, Willis Towers Watson, Payscale). Drives salary_bands maintenance.

#### compensation_plans

- **Plural label:** Compensation Plans · **Singular:** Compensation Plan
- **Description:** Total-rewards package definition per role, level, location: base structure, bonus target, equity guideline, allowances. Distinct from sales-incentive plans (those live in Sales Performance Management).

#### compensation_statements

- **Plural label:** Compensation Statements · **Singular:** Compensation Statement
- **Description:** Personalised total-rewards letter delivered to a worker showing the value of base, bonus, equity, benefits, and perks. Generated on hire, merit cycle close, and annually.
- **Relationships (≤12):** employees —becomes→ compensation_statements (one_to_one)

#### equity_grants

- **Plural label:** Equity Grants · **Singular:** Equity Grant
- **Description:** RSU, option, or PSU award tied to a vesting schedule. Carries grant date, type, share count, strike (if option), vesting cadence, performance metrics, and forfeiture rules. Integrates with equity-administration platforms (Carta, Shareworks).

#### merit_cycles

- **Plural label:** Merit Cycles · **Singular:** Merit Cycle
- **Description:** Periodic compensation review cycle (annual, semi-annual, focal): budget pool, eligibility, calibration step, approval chain, effective date. The recurring operating model of comp management.

#### merit_recommendations

- **Plural label:** Merit Recommendations · **Singular:** Merit Recommendation
- **Description:** Per-employee per-cycle proposed merit increase, bonus, and equity refresh from manager, with calibration adjustments and final approval. Approved values become the pay-rate change posted to payroll.

#### salary_bands

- **Plural label:** Salary Bands · **Singular:** Salary Band
- **Description:** Pay-range structure by grade and geographic zone with minimum, midpoint, maximum, and benchmarking source. Drives offer guidance, merit eligibility, and pay-equity gap analysis.
- **Relationships (≤12):** salary_bands —anchors→ hcm_positions (one_to_many); salary_bands —bands→ job_profiles (one_to_many)

### Domain BEN-ADMIN — Benefits Administration (id 61)

> Open enrolment, life-event handling, carrier connectivity, ACA compliance, and benefits decision support.

#### benefit_carriers

- **Plural label:** Benefit Carriers · **Singular:** Benefit Carrier
- **Description:** Insurance provider, 401(k) recordkeeper, or COBRA administrator that fulfils a benefit_plan. Drives the carrier_feeds integration.
- **Aliases:** insurance carrier (synonym); benefits provider (synonym)
- **Relationships (≤12):** benefit_carriers —underwrites→ benefit_plans (one_to_many, req); benefit_carriers —receives→ carrier_feeds (one_to_many, req); users —manages→ benefit_carriers (one_to_many); benefit_carriers —triggers→ pay_runs (one_to_many)

#### benefit_dependents

- **Plural label:** Benefit Dependents · **Singular:** Benefit Dependent
- **Description:** Person covered under an employee's benefit plan (spouse, domestic partner, child, disabled adult). Carries relationship, DOB, SSN, dependent-eligibility documents.
- **Aliases:** covered dependent (synonym); dependent (synonym)
- **Relationships (≤12):** benefit_enrollments —covers→ benefit_dependents (one_to_many); users —declares→ benefit_dependents (one_to_many, req)

#### benefit_enrollments

- **Plural label:** Benefit Enrollments · **Singular:** Benefit Enrollment
- **Description:** Per-employee per-plan elected coverage record with effective dates, covered dependents, contribution amounts, and beneficiary designations. The source of truth for deduction calculation in payroll.
- **Aliases:** benefit election (synonym); coverage selection (synonym)
- **Relationships (≤12):** employees —triggers→ benefit_enrollments (one_to_many); employment_events —triggers→ benefit_enrollments (one_to_many); benefit_plans —elected_via→ benefit_enrollments (one_to_many, req); benefit_open_enrollments —opens→ benefit_enrollments (one_to_many); benefit_enrollments —covers→ benefit_dependents (one_to_many); life_events —drives→ benefit_enrollments (one_to_many); employees —enrolls_in→ benefit_enrollments (one_to_many, req); users —enrolls→ benefit_enrollments (one_to_many, req); users —approves→ benefit_enrollments (one_to_many); benefit_enrollments —adjusts→ pay_runs (one_to_many); benefit_enrollments —posts_to→ payroll_journal_entries (one_to_many); benefit_enrollments —posts_to→ journal_entries (one_to_many)

#### benefit_open_enrollments

- **Plural label:** Open Enrollment Windows · **Singular:** Open Enrollment Window
- **Description:** Annual employer-defined window during which employees may elect or change benefit_plans for the next plan year. Drives mass campaign communications, decision-support tooling, and a synchronous load on the carrier_feeds layer at close.
- **Aliases:** open enrollment (synonym); annual enrollment window (synonym)
- **Relationships (≤12):** benefit_open_enrollments —offers→ benefit_plans (many_to_many, req); benefit_open_enrollments —opens→ benefit_enrollments (one_to_many); users —manages→ benefit_open_enrollments (one_to_many)

#### benefit_plans

- **Plural label:** Benefit Plans · **Singular:** Benefit Plan
- **Description:** Configurable employer-sponsored benefit offering: medical, dental, vision, life, disability, 401(k), HSA/FSA, voluntary. Carries eligibility rules, contribution structure, plan year, carrier and coverage tiers.
- **Aliases:** benefit offering (synonym); benefits product (synonym)
- **Relationships (≤12):** benefit_carriers —underwrites→ benefit_plans (one_to_many, req); benefit_open_enrollments —offers→ benefit_plans (many_to_many, req); benefit_plans —elected_via→ benefit_enrollments (one_to_many, req); benefit_plans —deducts_via→ deduction_codes (many_to_many); org_units —sponsors→ benefit_plans (many_to_many); legal_entities —sponsors→ benefit_plans (one_to_many); users —owns→ benefit_plans (one_to_many)

#### carrier_feeds

- **Plural label:** Carrier Feeds · **Singular:** Carrier Feed
- **Description:** Outbound integration to a benefit_carrier (EDI 834 enrolment, 820 remittance, custom API, file_drop). Mostly weekly batch; failures cause coverage discrepancies between HR system of record and carrier of record.
- **Aliases:** 834 feed (synonym); benefits eligibility feed (synonym)
- **Relationships (≤12):** benefit_carriers —receives→ carrier_feeds (one_to_many, req); users —monitors→ carrier_feeds (one_to_many); carrier_feeds —spawns→ hr_cases (one_to_many); carrier_feeds —posts_to→ journal_entries (one_to_many)

#### life_events

- **Plural label:** Life Events · **Singular:** Life Event
- **Description:** Qualifying event (marriage, birth, adoption, divorce, dependent loss-of-coverage, employment change) that opens a mid-year enrollment window. Triggers benefit_enrollments changes outside open enrollment.
- **Aliases:** qualifying life event (synonym); QLE (synonym)
- **Relationships (≤12):** life_events —drives→ benefit_enrollments (one_to_many); employees —declares→ life_events (one_to_many); users —declares→ life_events (one_to_many, req); users —approves→ life_events (one_to_many); employees —updated by→ life_events (one_to_many); life_events —adjusts→ pay_runs (one_to_many)

### Domain LMS — Learning Management (id 57)

> Course authoring, content delivery, compliance training, certifications, and learning paths for employees and extended audiences.

#### compliance_assignments

- **Plural label:** Compliance Training Assignments · **Singular:** Compliance Training Assignment
- **Description:** Mandatory training assignment tied to a regulation, role, location, or hire-event (anti-harassment, AML, GDPR, OSHA, HIPAA). Carries due date, escalation policy, audit log.
- **Aliases:** mandatory training assignment (synonym); regulatory training (synonym)
- **Relationships (≤12):** courses —fulfills→ compliance_assignments (one_to_many); hcm_positions —requires→ compliance_assignments (one_to_many); org_units —sponsors→ compliance_assignments (one_to_many); users —must complete→ compliance_assignments (one_to_many, req); users —owns→ compliance_assignments (one_to_many); compliance_obligations —tracked by→ compliance_assignments (one_to_many); compliance_assignments —triggers→ iga_provisioning_events (one_to_many); employees —reflected on→ compliance_assignments (one_to_many)

#### course_enrollments

- **Plural label:** Course Enrollments · **Singular:** Course Enrollment
- **Description:** Per-learner per-course state record: assigned date, due date, attempts, status (not_started, in_progress, completed, expired), score. The operational unit of learning tracking.
- **Aliases:** training registration (synonym); learner enrollment (synonym)
- **Relationships (≤12):** employees —enrolls_in→ course_enrollments (one_to_many); onboarding_tasks —spawns→ course_enrollments (one_to_many); courses —enrolled_via→ course_enrollments (one_to_many, req); course_enrollments —produces→ learning_records (one_to_many, req); skill_profiles —updated by→ course_enrollments (one_to_many); employees —learns_via→ course_enrollments (one_to_many, req); cost_centers —funds→ course_enrollments (one_to_many); users —enrolls in→ course_enrollments (one_to_many, req); users —assigns→ course_enrollments (one_to_many); course_enrollments —updates→ career_aspirations (one_to_many)

#### courses

- **Plural label:** Courses · **Singular:** Course
- **Description:** Atomic learning unit: e-learning module, video, live session, blended programme, external content. Carries content reference, duration, format, language, prerequisites, certification award.
- **Aliases:** training course (synonym); learning module (synonym)
- **Relationships (≤12):** job_profiles —maps_to→ courses (many_to_many); courses —sequenced_into→ learning_paths (many_to_many); courses —enrolled_via→ course_enrollments (one_to_many, req); courses —fulfills→ compliance_assignments (one_to_many); courses —grants→ learner_certifications (one_to_many); users —authors→ courses (one_to_many); users —owns→ courses (one_to_many)

#### learner_certifications

- **Plural label:** Certifications · **Singular:** Certification
- **Description:** Issued credential against a worker (internal certification, vendor cert, regulatory cert) with issue date, expiry, issuing body, and renewal rules. Drives recertification campaigns.
- **Aliases:** credential (synonym); training certificate (synonym)
- **Relationships (≤12):** users —holds→ learner_certifications (one_to_many, req); courses —grants→ learner_certifications (one_to_many); skill_profiles —updated by→ learner_certifications (one_to_many)

#### learning_paths

- **Plural label:** Learning Paths · **Singular:** Learning Path
- **Description:** Curated sequence of courses targeting a role, skill, or certification. Drives ordered enrolment and progress tracking across multiple courses.
- **Aliases:** curriculum (synonym); development path (synonym)
- **Relationships (≤12):** courses —sequenced_into→ learning_paths (many_to_many); job_profiles —requires→ learning_paths (many_to_many); users —curates→ learning_paths (one_to_many)

#### learning_records

- **Plural label:** Learning Records · **Singular:** Learning Record
- **Description:** Granular completion event for a course or activity, often xAPI / SCORM / cmi5 statement: actor, verb, object, result, timestamp. Feeds skill_profiles and certifications.
- **Aliases:** transcript entry (synonym); learning activity record (synonym)
- **Relationships (≤12):** course_enrollments —produces→ learning_records (one_to_many, req); users —earns→ learning_records (one_to_many, req); employees —reflects→ learning_records (one_to_many); learning_records —feeds→ people_kpis (one_to_many)

#### skill_profiles

- **Plural label:** Skill Profiles · **Singular:** Skill Profile
- **Description:** Per-worker collection of skills with self-assessed and validated proficiency levels, derived from completed courses, certifications, performance signals, and inferred peer-comparison. The Workday Skills Cloud central artifact and equivalents (SuccessFactors Skills, Cornerstone Capabilities, Eightfold Talent DNA).
- **Master slice notes:** Skills-cloud central artifact. TALENT-MGMT and ATS co-contribute via assessment / interview-rating signals; HCM consumes for worker-profile surfaces.
- **Aliases:** competency profile (synonym); skills passport (synonym)
- **Relationships (≤12):** employees —holds→ skill_profiles (one_to_one); job_profiles —maps_to→ skill_profiles (many_to_many); skill_profiles —updated by→ learner_certifications (one_to_many); skill_profiles —updated by→ course_enrollments (one_to_many); job_profiles —expects→ skill_profiles (many_to_many); users —holds→ skill_profiles (one_to_many, req); skill_profiles —feeds→ candidates (one_to_many); skill_profiles —feeds→ career_aspirations (one_to_many)
