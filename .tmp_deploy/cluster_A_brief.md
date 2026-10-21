# Cluster A brief — People

**Domains in scope (6):** HCM, ONBOARDING, LMS, BEN-ADMIN, EMP-EXP, HRSD

**Your job:** for EACH of the 6 domains, author one markdown section following the OUTPUT TEMPLATE below. Write the full set to `.tmp_deploy/cluster_A_draft.md`. Do NOT call semantius or any database tool — drafts only. The draft will be reviewed by the user before any load happens.

---

## Domain details

### HCM — Human Capital Management

**Description:** Core HR system of record covering worker data, organisation and position management, self-service, and lifecycle workflows. The HRIS / system-of-record layer of the HR stack.

**Business logic:** Org-chart and headcount calculations, FTE roll-ups, and span-of-control analytics — calc layer over master HR data.

**Data objects (13):**

| role | data_object_name | singular | plural |
|---|---|---|---|
| master | `employees` | Employee | Employees |
| master | `employment_contracts` | Employment Contract | Employment Contracts |
| master | `employment_events` | Employment Event | Employment Events |
| master | `hcm_positions` | Position | Positions |
| master | `job_profiles` | Job Profile | Job Profiles |
| master | `org_units` | Org Unit | Org Units |
| contributor | `asset_lifecycle_events` | Asset Lifecycle Event | Asset Lifecycle Events |
| contributor | `cost_centers` | Cost Center | Cost Centers |
| consumer | `absence_requests` | Absence Request | Absence Requests |
| consumer | `contingent_workers` | Contingent Worker | Contingent Workers |
| consumer | `engagement_drivers` | Engagement Driver | Engagement Drivers |
| consumer | `people_kpis` | People KPI | People KPIs |
| consumer | `skill_profiles` | Skill Profile | Skill Profiles |

### ONBOARDING — Employee Onboarding

**Description:** Orchestration of pre-boarding, Day-1, and 30/60/90 workflows for new hires — task lists, welcome experiences, documentation, e-signature, buddy assignments, and downstream provisioning coordination. Distinct point-solution market (Enboarder, Talmundo, ClickBoarding, Appical, Kallidus/Sapling) although onboarding capabilities are commonly bundled inside ATS (iCIMS Onboard, Greenhouse Onboarding, SmartRecruiters Onboarding), HCM (Workday Journeys, BambooHR, HiBob, Rippling), and HRSD platforms. Operates primarily as a downstream-trigger pattern: offer.accepted (ATS) and employee.created (HCM) drive journey instantiation, which then fans out events to ITSM (provisioning), IWMS (facilities), Payroll (activation), LMS (compliance training), HRSD (case escalation), and IGA (access provisioning) — making it the textbook case for the cross_domain_handoffs analytic.

**Business logic:** Conditional task generation based on role, location, and employment type; cross-system orchestration to HCM, IGA, and Payroll.

**Data objects (14):**

| role | data_object_name | singular | plural |
|---|---|---|---|
| master | `buddy_assignments` | Buddy Assignment | Buddy Assignments |
| master | `onboarding_cohorts` | Onboarding Cohort | Onboarding Cohorts |
| master | `onboarding_document_collections` | Onboarding Document Collection | Onboarding Document Collections |
| master | `onboarding_journeys` | Onboarding Journey | Onboarding Journeys |
| master | `onboarding_plans` | Onboarding Plan | Onboarding Plans |
| master | `onboarding_stages` | Onboarding Stage | Onboarding Stages |
| master | `onboarding_tasks` | Onboarding Task | Onboarding Tasks |
| master | `welcome_communications` | Welcome Communication | Welcome Communications |
| embedded_master | `employees` | Employee | Employees |
| embedded_master | `hcm_positions` | Position | Positions |
| embedded_master | `org_units` | Org Unit | Org Units |
| contributor | `asset_lifecycle_events` | Asset Lifecycle Event | Asset Lifecycle Events |
| contributor | `service_requests` | Service Request | Service Requests |
| consumer | `hardware_assets` | Hardware Asset | Hardware Assets |

### LMS — Learning Management

**Description:** Course authoring, content delivery, compliance training, certifications, and learning paths for employees and extended audiences.

**Business logic:** Learning-path recommendation engines; otherwise pure content, enrolment, and tracking records.

**Data objects (12):**

| role | data_object_name | singular | plural |
|---|---|---|---|
| master | `compliance_assignments` | Compliance Training Assignment | Compliance Training Assignments |
| master | `course_enrollments` | Course Enrollment | Course Enrollments |
| master | `courses` | Course | Courses |
| master | `learner_certifications` | Certification | Certifications |
| master | `learning_paths` | Learning Path | Learning Paths |
| master | `learning_records` | Learning Record | Learning Records |
| master | `skill_profiles` | Skill Profile | Skill Profiles |
| embedded_master | `cost_centers` | Cost Center | Cost Centers |
| embedded_master | `employees` | Employee | Employees |
| embedded_master | `hcm_positions` | Position | Positions |
| embedded_master | `job_profiles` | Job Profile | Job Profiles |
| embedded_master | `org_units` | Org Unit | Org Units |

### BEN-ADMIN — Benefits Administration

**Description:** Open enrolment, life-event handling, carrier connectivity, ACA compliance, and benefits decision support.

**Business logic:** Eligibility rules that determine which benefits a worker can elect; declarative and well-suited to a rules engine.

**Data objects (11):**

| role | data_object_name | singular | plural |
|---|---|---|---|
| master | `benefit_carriers` | Benefit Carrier | Benefit Carriers |
| master | `benefit_dependents` | Benefit Dependent | Benefit Dependents |
| master | `benefit_enrollments` | Benefit Enrollment | Benefit Enrollments |
| master | `benefit_open_enrollments` | Open Enrollment Window | Open Enrollment Windows |
| master | `benefit_plans` | Benefit Plan | Benefit Plans |
| master | `carrier_feeds` | Carrier Feed | Carrier Feeds |
| master | `life_events` | Life Event | Life Events |
| embedded_master | `employees` | Employee | Employees |
| embedded_master | `org_units` | Org Unit | Org Units |
| contributor | `deduction_codes` | Deduction Code | Deduction Codes |
| consumer | `legal_entities` | Legal Entity | Legal Entities |

### EMP-EXP — Employee Experience and Engagement

**Description:** Engagement and pulse surveys, 360 feedback, lifecycle (onboarding, exit) listening, and action planning. Distinct from HRSD case management.

**Data objects (7):**

| role | data_object_name | singular | plural |
|---|---|---|---|
| master | `action_plans` | Engagement Action Plan | Engagement Action Plans |
| master | `engagement_drivers` | Engagement Driver | Engagement Drivers |
| master | `pulse_questions` | Pulse Question Library | Pulse Question Libraries |
| master | `survey_campaigns` | Survey Campaign | Survey Campaigns |
| master | `survey_responses` | Survey Response | Survey Responses |
| embedded_master | `employees` | Employee | Employees |
| embedded_master | `org_units` | Org Unit | Org Units |

### HRSD — HR Service Delivery

**Description:** Employee case management, knowledge, journeys, and document management for the HR function.

**Data objects (5):**

| role | data_object_name | singular | plural |
|---|---|---|---|
| master | `case_categories` | HR Case Category | HR Case Categories |
| master | `hr_cases` | HR Case | HR Cases |
| consumer | `employees` | Employee | Employees |
| consumer | `knowledge_articles` | Knowledge Article | Knowledge Articles |
| consumer | `service_requests` | Service Request | Service Requests |

---

## Cross-domain handoffs touching this cluster (134)

Convert each row to a cross-domain relationship edge (section 4 of each domain's draft) where there is a clean payload→target mapping. The payload's data_object is the **from** side; pick a natural recipient in the target_domain as the **to** side.

| source_domain | payload (data_object) | trigger_event | target_domain | integration_pattern | friction | description |
|---|---|---|---|---|---|---|
| GRC | `policy_attestations` | `compliance_policy.updated` | HRSD | manual_handoff | high | Policy update (leave, harassment) → HRSD exception handling; no standardised machine-readable payload. |
| GRC | `policy_attestations` | `policy_attestation.required` | HCM | event_stream | medium | Policy attestation task routed to employee via HCM. |
| GRC | `policy_attestations` | `compliance_policy.updated` | LMS | api_call | medium | Policy version triggers LMS compliance-training requirement for scoped users. |
| HRSD | `service_requests` | `case.it_assistance_required` | ITSM | api_call | medium | HR case that needs IT action (lost laptop replacement, app access for a new role, account lockout) routes a service request into ITSM. Friction sits in the case-to-SR field mapping |
| HRSD | `case_categories` | `case_category.updated` | KMS | event_stream | low | Case-category taxonomy changes drive KMS knowledge-base remapping. |
| HRSD | `hr_cases` | `case.access_required` | IGA | api_call | high | HR cases requiring app or system access (e.g. role change, special-project access) escalate to IGA. Identity-reconciliation pattern: HR case context (employee_id, role, department) |
| HRSD | `hr_cases` | `case.access_required` | HCM | event_stream | medium | HR cases involving data changes flow back to HCM for authoritative updates. |
| HRSD | `case_categories` | `case_category.updated` | HCM | event_stream | low | Taxonomy changes affect HCM employee-portal self-service routing. |
| IWMS | `workplace_experience_feedback` | `workplace_feedback.submitted` | HCM | event_stream | low | Workplace feedback fed into employee experience metrics. |
| VIS-MGMT | `host_assignments` | `host_notification.sent` | HCM | event_stream | low | Host notifications trigger employee engagement signals. |
| LSD | `legal_holds` | `legal_hold.issued` | HCM | api_call | medium | Custodian identification for legal holds depends on current HCM employee status and reporting relationships. |
| LSD | `legal_advice_records` | `legal_advice_record.employee_related` | HCM | manual_handoff | high | Employee-related advice is referenced from the HR case without exposing privileged content; the handoff is deliberately gated through counsel. |
| KMS | `knowledge_base_articles` | `knowledge_base_article.published` | HRSD | event_stream | low | HR service delivery picks up new HR knowledge articles for employee self-service. |
| IGA | `iga_access_requests` | `iga_access_request.submitted` | HRSD | event_stream | low | Access-related HR questions can spawn HRSD cases for context. |
| RET-STORE | `store_audits` | `store_audit.failed` | HCM | api_call | medium | A failed store audit triggers HCM coaching/performance review for store leadership. |
| HCM | `service_requests` | `employee.terminated` | ITSM | api_call | medium | Termination in HCM creates a fan-out of offboarding service requests in ITSM: workspace cleanup, mail-forwarding setup, equipment-return tracking, exit-interview scheduling. Failur |
| HCM | `asset_lifecycle_events` | `employee.terminated` | ITAM | api_call | high | Employee termination triggers asset-recall events: assigned laptops, mobile devices, badges, software licences must be reclaimed. High friction — recall rates rarely hit 100%, and  |
| HCM | `employees` | `employee.terminated` | ITAM | api_call | high | Termination triggers asset-recall workflow (laptop, badge, hardware tokens). Leaver-recall friction shape; assets in remote-work era frequently missing. |
| HCM | `employees` | `employee.terminated` | HRSD | event_stream | medium | Termination kicks off offboarding case (exit interview, knowledge transfer, paperwork). Multiple downstream HRSD tasks created. |
| HCM | `employees` | `employee.created` | IGA | api_call | high | New employee in HCM triggers directory account creation and birthright-role assignment in IGA. High friction because role-to-entitlement mappings drift per business unit, and IGA f |
| HCM | `employees` | `employee.terminated` | IGA | api_call | high | Termination in HCM must immediately revoke identity access in IGA: disable account, remove group memberships, terminate app-level entitlements. Failure modes: contractor terminatio |
| HCM | `employees` | `employee.promoted` | IGA | event_stream | high | Promotion (mover event) requires entitlement re-evaluation: add new role access, revoke prior-role access. SoD risk window during transition. |
| HCM | `employment_events` | `employment_event.recorded` | IGA | event_stream | high | Transfer, leave-start, leave-return, and FTE changes all require IGA re-evaluation. Mover events are the highest-volume IGA workload. |
| HCM | `employment_contracts` | `employment_contract.expired` | IGA | event_stream | high | Contractor/fixed-term contract expiry must trigger access deprovisioning. Often missed when the term-end is silently extended without IGA notification. |
| HCM | `org_units` | `org_unit.created` | IGA | event_stream | medium | New org unit drives IGA group/role provisioning. Group-name conventions and ownership must be encoded; otherwise orphan groups proliferate. |
| HCM | `org_units` | `org_unit.merged` | IGA | event_stream | high | Org-unit merge consolidates IGA groups: members migrate, entitlements deduplicated, SoD revalidated. Often runs as a batch project rather than event. |
| HCM | `org_units` | `org_unit.disbanded` | IGA | event_stream | high | Org-unit disbandment requires IGA group cleanup; orphan-group risk if employees re-assigned slowly. |
| HCM | `employees` | `employee.created` | PAYROLL | api_call | medium | New employee in HCM triggers comp profile activation in Payroll: gross-to-net rules selected by jurisdiction, deductions initialised, bank account and tax setup collected via Onboa |
| HCM | `employees` | `employee.terminated` | PAYROLL | event_stream | high | Termination drives final pay (severance, accrued PTO payout, prorated bonus). Cross-vendor stack when HCM and PAYROLL are different vendors; retro-adjustments are common. |
| HCM | `employees` | `employee.promoted` | PAYROLL | event_stream | medium | Promotion typically includes salary change. Effective-dated change must flow to PAYROLL with retroactive handling. |
| HCM | `employment_events` | `employment_event.recorded` | PAYROLL | event_stream | medium | Any employment-change event (transfer, FTE change, leave) needs PAYROLL processing for proration and effective dating. |
| HCM | `employment_contracts` | `employment_contract.executed` | PAYROLL | event_stream | medium | New contract terms (salary, allowances, currency, country) must be processed by PAYROLL with effective date alignment. |
| HCM | `employment_contracts` | `employment_contract.expired` | PAYROLL | event_stream | medium | Contract expiry stops compensation; final-pay processing similar to termination. |
| HCM | `job_requisitions` | `employee.terminated` | ATS | api_call | low | Employee termination in HCM optionally triggers backfill requisition consideration in ATS. Low friction when SWP-driven; some orgs auto-open a backfill req on regrettable losses, o |
| HCM | `hcm_positions` | `hcm_position.approved_for_creation` | ATS | event_stream | medium | Approved position flows to ATS as the basis for a requisition. Approval state must be in sync to avoid requisitions opened against unapproved positions. |
| HCM | `job_profiles` | `job_profile.published` | ATS | event_stream | low | Canonical job profile feeds ATS posting templates and screening criteria. |
| HCM | `employees` | `employee.created` | LMS | event_stream | low | New-hire creation provisions required-training assignments (compliance, role-based). Drives day-one and 30-day learning workflows. |
| HCM | `job_profiles` | `job_profile.published` | LMS | event_stream | low | Job profile competencies drive LMS skill-profile expectations and required-training assignments. |
| HCM | `employees` | `employee.created` | TALENT-MGMT | api_call | low | New employee triggers talent-profile initialisation in Talent Management: career aspirations, mobility preferences, skills profile stubs. Same employee.created trigger as Onboardin |
| HCM | `employees` | `employee.promoted` | TALENT-MGMT | event_stream | low | Promotion updates succession-plan slots and 9-box placement context. |
| HCM | `employees` | `employee.created` | WFM | event_stream | low | New employee provisioned in HCM becomes a schedulable resource in WFM — identity, position, base FTE. Mid-shift onboarding and badge-binding are typical edge cases. |
| HCM | `employees` | `employee.promoted` | COMP-MGMT | event_stream | low | Promotion event triggers off-cycle compensation review (eligibility, band placement, increase recommendation) in COMP-MGMT. |
| HCM | `employees` | `employee.created` | COMP-MGMT | event_stream | low | New-hire creation provides compensation basis. Bands and grades attach via job profile. |
| HCM | `employment_contracts` | `employment_contract.executed` | COMP-MGMT | event_stream | low | Executed contract carries comp basis; COMP-MGMT links compensation statement and ongoing-cycle eligibility. |
| HCM | `hcm_positions` | `hcm_position.approved_for_creation` | COMP-MGMT | event_stream | low | Approved position carries grade/band, anchoring offer-comp generation. |
| HCM | `job_profiles` | `job_profile.published` | COMP-MGMT | event_stream | low | Job profile links to salary bands; COMP-MGMT mapping authoritative. |
| HCM | `benefit_enrollments` | `employee.terminated` | BEN-ADMIN | event_stream | medium | Termination triggers COBRA event handling in BEN-ADMIN (US) or local statutory leaver process. Failure modes: late termination dates cause overpayment of employer premium. |
| HCM | `employees` | `employee.terminated` | BEN-ADMIN | event_stream | high | Termination triggers benefits termination, COBRA / equivalent notices, and dependent coverage decisions. Late notifications cause coverage gaps. |
| HCM | `employees` | `employee.created` | BEN-ADMIN | event_stream | medium | New-hire creation seeds benefits eligibility (waiting periods, default elections). Drives carrier feed setup at end of new-hire window. |
| HCM | `employment_events` | `employment_event.recorded` | BEN-ADMIN | event_stream | medium | Status changes (FTE, leave) impact benefits eligibility. Carrier feeds may need refresh. |
| HCM | `employment_events` | `employment_event.recorded` | PA | event_stream | low | HCM publishes employment events (hire, promotion, transfer, leave, termination) onto a stream that PA consumes to refresh KPIs (tenure, time-in-level, mobility rate, attrition). Lo |
| HCM | `org_units` | `org_unit.created` | ERP-FIN | api_call | medium | New org unit usually maps to cost-center; ERP-FIN must reflect the structure for budgeting and labor allocation. |
| HCM | `employees` | `employee.terminated` | EXPENSE | event_stream | medium | Termination triggers EXPENSE corporate-card deactivation and outstanding-report close-out. |
| HCM | `onboarding_journeys` | `employee.created` | ONBOARDING | api_call | medium | HCM creates the canonical employee record (typically on or near Day-1, or earlier for pre-boarding access). Onboarding binds the journey to the new employee_id so task ownership an |
| HCM | `employees` | `employee.created` | ONBOARDING | event_stream | medium | New-hire creation triggers onboarding plan instantiation. Template selection driven by position attributes that may be late-bound. |
| HCM | `headcount_plans` | `headcount.actuals_updated` | SWP | batch_sync | medium | Actual headcount changes (hires, terminations, transfers, leaves) from HCM flow to SWP for plan-vs-actual reconciliation. Usually nightly batch; some orgs run weekly. Friction sits |
| HCM | `agency_time_entries` | `employee.terminated` | AGENCY-MGMT | event_stream | medium | Agency staff member terminated in HCM; AGENCY-MGMT must reassign open job tasks, freeze the employee's time entry capability (but preserve historical entries for billing), and trig |
| PAYROLL | `garnishment_orders` | `garnishment_order.received` | HRSD | manual_handoff | medium | Confidential garnishment case opened in HRSD; sensitive PII routing required. |
| PAYROLL | `pay_slips` | `pay_cycle.closed` | HCM | event_stream | low | Pay slips published; HCM employee-self-service reflects. |
| PAYROLL | `benefit_enrollments` | `pay_cycle.closed` | BEN-ADMIN | batch_sync | medium | Per-employee deduction totals reconciled against active benefit_enrollments to detect election drift. Discrepancies require manual carrier_feed correction and retro-pay calculation |
| PAYROLL | `pay_slips` | `pay_cycle.closed` | BEN-ADMIN | batch_sync | medium | Benefit deductions reconciled per pay cycle; mismatches drive carrier-feed exceptions. |
| ATS | `background_checks` | `background_check.flagged` | HRSD | manual_handoff | high | Adverse-action workflow requires HR-legal review; manual escalation common. Friction shape: alert/escalation without feedback loop. |
| ATS | `employees` | `candidate.hired` | HCM | event_stream | medium | Candidate-to-employee conversion: hired candidate from ATS triggers employee-record creation in HCM. Field mapping (candidate → employee) is rarely perfect; missing fields (legal n |
| ATS | `candidates` | `candidate.hired` | HCM | event_stream | high | Hired-candidate event publishes the hiring outcome to HCM, which must create the employee record. Identifier mapping (candidate_id -> employee_id) is the canonical reconciliation g |
| ATS | `job_offers` | `job_offer.accepted` | HCM | event_stream | medium | Offer acceptance signals firm hiring intent; HCM creates pending-employee record. |
| ATS | `job_requisitions` | `requisition.filled` | HCM | event_stream | low | Requisition fill closes headcount slot; HCM headcount-plan updates. |
| ATS | `job_requisitions` | `headcount.approved` | HCM | event_stream | low | Headcount approval (often originating from HCM/SWP) confirmed back to HCM; gives ATS green light to source. |
| ATS | `candidate_assessments` | `candidate_assessment.passed` | HCM | event_stream | medium | Passing an assessment advances the candidate; on eventual hire, HCM uses the assessment result as the first data point for the new-hire skill profile. |
| ATS | `candidate_assessments` | `candidate_assessment.failed` | HCM | event_stream | low | Failed-assessment outcomes close the candidate's loop in ATS and propagate to HCM only if the candidate is an internal-mobility applicant whose profile should reflect the developme |
| ATS | `benefit_enrollments` | `job_offer.accepted` | BEN-ADMIN | event_stream | medium | Offer acceptance opens the new-hire benefit-enrollment window in BEN-ADMIN, gated by the actual employee.created event from HCM. |
| ATS | `candidates` | `candidate.hired` | BEN-ADMIN | event_stream | low | Hired candidate triggers eligibility window in BEN-ADMIN. |
| ATS | `candidate_referrals` | `candidate_referral.submitted` | EMP-EXP | event_stream | low | Referral submission is an engagement signal; EMP-EXP recognition flows pick up. |
| ATS | `onboarding_journeys` | `job_offer.accepted` | ONBOARDING | event_stream | high | Candidate accepts offer in ATS; ATS publishes the offer-accepted event with offer details, position, hiring manager, location, start date. Onboarding instantiates a journey by sele |
| ATS | `candidates` | `candidate.hired` | ONBOARDING | event_stream | medium | Hired candidate drives onboarding-plan kickoff with role/location/manager context from ATS payload. |
| ATS | `job_offers` | `job_offer.accepted` | ONBOARDING | event_stream | medium | Offer acceptance triggers pre-boarding (paperwork, welcome packet, day-one logistics). |
| LMS | `compliance_assignments` | `compliance_assignment.overdue` | GRC | event_stream | high | Compliance training overdue is a control failure; GRC tracks obligation status, IGA may suspend high-risk access. |
| LMS | `compliance_assignments` | `compliance_assignment.overdue` | IGA | api_call | high | Severe overdue (PCI, HIPAA, SOX-relevant) may auto-suspend system access pending completion. Alert-without-feedback-loop common. |
| LMS | `employees` | `compliance_training.lapsed` | HCM | manual_handoff | high | Lapsed compliance certifications (anti-harassment, AML, OSHA) often require role-block or access-block enforcement that crosses LMS, HCM, and IGA — rarely event-driven; commonly di |
| LMS | `learning_records` | `learning_record.posted` | HCM | event_stream | low | Authoritative learning transcript visible in HCM employee record. |
| LMS | `compliance_assignments` | `compliance_training.lapsed` | HCM | event_stream | medium | Lapsed mandatory training surfaces on employee record and manager dashboard. |
| LMS | `skill_profiles` | `skill_profile.updated` | ATS | event_stream | medium | Internal-candidate skill data flows into ATS for internal mobility sourcing. |
| LMS | `skill_profiles` | `learner_certification.earned` | TALENT-MGMT | event_stream | medium | Cert / course completion updates the worker skill_profile (Skills Cloud), which feeds talent-mobility matching and succession bench analysis. Friction: cross-vendor LMS↔TALENT stac |
| LMS | `course_enrollments` | `course_enrollment.completed` | TALENT-MGMT | event_stream | low | Course completion updates skill-profile; TALENT-MGMT reflects in dev-plans and succession. |
| LMS | `skill_profiles` | `skill_profile.updated` | TALENT-MGMT | event_stream | medium | Skill-profile refresh drives internal mobility, succession, and dev-plan suggestions. |
| LMS | `people_kpis` | `training.completed` | PA | event_stream | low | Training completion events from LMS update PA's L&D KPIs (completion rate, learning hours per employee, skill-gap closure). Also feeds skills_gap_analyses in SWP via PA. |
| TALENT-MGMT | `succession_plans` | `succession_plan.published` | HCM | event_stream | low | Succession plan visible on employee/role records in HCM. |
| TALENT-MGMT | `performance_goals` | `performance_goal.completed` | HCM | event_stream | low | Completed goal updates HCM performance history. |
| TALENT-MGMT | `workforce_segments` | `high_potential.identified` | HCM | event_stream | low | Hi-Po identification visible to HR-business-partner workflows in HCM. |
| TALENT-MGMT | `performance_goals` | `performance_goal.set` | LMS | event_stream | low | Goal setting drives learning-path suggestions for capability gaps. |
| WFM | `work_shifts` | `work_shift.no_show` | HRSD | event_stream | medium | No-show triggers HRSD case for attendance follow-up. |
| WFM | `absence_requests` | `absence.approved` | HCM | event_stream | medium | Approved absence_requests update PTO balances in HCM; tenure-based accruals and country-specific carry-over rules apply (US PTO, UK statutory, German Urlaub, French Congés Payés). |
| WFM | `absence_balances` | `absence_balance.recalculated` | HCM | event_stream | low | Updated balances visible in HCM employee self-service. |
| COMP-MGMT | `employees` | `merit_cycle.approved` | HCM | event_stream | low | Cycle-close pay-rate changes post to the worker record (base salary, bonus target, equity guideline). |
| COMP-MGMT | `merit_recommendations` | `merit_cycle.approved` | HCM | event_stream | medium | Approved merit changes update employee compensation in HCM with effective dates. |
| BEN-ADMIN | `carrier_feeds` | `carrier_feed.reconciled` | HRSD | manual_handoff | high | Carrier reconciliation exceptions become HR-cases for impacted employees. Alert-without-feedback-loop friction shape. |
| BEN-ADMIN | `life_events` | `life_event.approved` | HCM | event_stream | low | Approved life event may update HCM dependents and emergency contacts. |
| BEN-ADMIN | `benefit_carriers` | `open_enrollment.closed` | PAYROLL | file_drop | high | Open-enrollment close produces large carrier_feed batches (834 EDI) plus mass payroll deduction-code updates. Identity-reconciliation pattern: per-carrier member-id schemes diverge |
| BEN-ADMIN | `benefit_enrollments` | `enrollment.changed` | PAYROLL | event_stream | medium | Election change (life event or open-enrollment) triggers mid-cycle deduction adjustment in payroll. Failure modes: retro adjustments crossing pay-period boundaries; tax-treatment c |
| BEN-ADMIN | `payroll_journal_entries` | `enrollment.changed` | PAYROLL | batch_sync | low | Benefit enrollment changes in BEN-ADMIN (open enrollment, life events, plan election changes) must update payroll deductions for the affected pay period. Failure modes: late-bound  |
| BEN-ADMIN | `life_events` | `life_event.approved` | PAYROLL | event_stream | medium | Life event approval re-rates deductions; effective-date handling and proration are common bugs. |
| BEN-ADMIN | `payroll_journal_entries` | `enrollment.changed` | ERP-FIN | batch_sync | low | Employer-side benefit cost accrual posts to GL as part of personnel-cost rollup. |
| BEN-ADMIN | `carrier_feeds` | `carrier_feed.transmitted` | ERP-FIN | batch_sync | low | Carrier premium accruals flow to ERP-FIN for AP processing. |
| EMP-EXP | `employees` | `attrition_risk.high` | HCM | api_call | high | Attrition-risk inference from engagement signals surfaces to managers via HCM dashboards. Probabilistic-signal → deterministic-action pattern: a risk score is not a directive; inte |
| EMP-EXP | `engagement_drivers` | `survey.cycle_closed` | HCM | event_stream | low | Engagement survey results visible to HR-business-partners and managers in HCM. |
| EMP-EXP | `survey_responses` | `survey_response.received` | TALENT-MGMT | event_stream | medium | Negative-sentiment responses can trigger TALENT-MGMT flight-risk review. |
| EMP-EXP | `engagement_drivers` | `survey.cycle_closed` | PA | event_stream | low | Cycle-close driver scores feed people-analytics cohorts for cross-cutting analyses (engagement × attrition, engagement × DEI, engagement × performance). |
| EMP-EXP | `survey_responses` | `survey_response.received` | PA | batch_sync | low | Survey responses feed people-analytics engagement models. |
| EMP-EXP | `action_plans` | `action_plan.created` | WORK-MGMT | api_call | medium | Engagement action plans often tracked as work items in WORK-MGMT for execution visibility. |
| PA | `employees` | `attrition_risk.high` | HCM | event_stream | high | Flight-risk score flagged on employee; HR-business-partner motion required. Probabilistic-signal-to-deterministic-action friction shape; false-positive volume drives mistrust. |
| PA | `workforce_plans` | `attrition.forecast_updated` | HCM | event_stream | medium | Refreshed attrition forecast informs HCM headcount-plan and hiring-demand recalibration. |
| VMS | `contingent_workers` | `worker.tenure_threshold` | HCM | manual_handoff | high | Contingent worker crossing co-employment-risk tenure threshold (typically 18-24 months) must be reclassified, off-boarded, or converted. Cross-vendor stack with same logical entity |
| EPM | `financial_plans` | `financial_plan.approved` | HCM | batch_sync | medium | Approved plans set headcount budgets visible in HCM and SWP. |
| PSA | `project_assignments` | `project_assignment.confirmed` | HCM | event_stream | medium | Confirmed assignments decrement available capacity in HCM and link the consultant's calendar to the engagement. Friction stems from PSA and HCM frequently being separate vendors wi |
| PSA | `project_resource_allocations` | `project_resource_allocation.committed` | HCM | event_stream | medium | Committed allocations book named hours in HCM's capacity view, locking the resource against other demand. |
| PSA | `resource_skill_inventories` | `resource_skill_inventory.updated` | HCM | api_call | medium | Updated skill inventory enriches the HCM talent profile so non-billable internal moves and career planning use the same skill graph. |
| MDM | `employees` | `employee_golden_record.created` | HCM | api_call | medium | Resolved identity → HCM links operational HR record. |
| MDM | `source_records` | `source_record.merged_to_golden` | HCM | event_stream | medium | Employee record merge updates HCM canonical employee identity used downstream by payroll and IGA. |
| ONBOARDING | `onboarding_tasks` | `task.it_provisioning_required` | ITSM | api_call | medium | Onboarding emits the IT-provisioning task for a new hire (laptop, peripherals, baseline software access). ITSM creates the corresponding service request(s); ITSM masters the fulfil |
| ONBOARDING | `onboarding_tasks` | `task.workplace_setup_required` | ITSM | api_call | medium | Workspace, desk, badge requests fulfilled by ITSM/IWMS. |
| ONBOARDING | `onboarding_tasks` | `task.escalation_required` | HRSD | api_call | medium | When an onboarding task is blocked, overdue, or contested (missing document, declined accommodation, pre-boarding question), an HR case is opened in HRSD. HRSD masters the case lif |
| ONBOARDING | `onboarding_tasks` | `task.workplace_setup_required` | IWMS | manual_handoff | high | Onboarding flags physical-workplace tasks: badge issuance, desk allocation, parking, building access, ergonomic kit. IWMS systems are rarely event-driven; in practice the handoff i |
| ONBOARDING | `onboarding_tasks` | `task.access_provisioning_required` | IGA | api_call | high | Onboarding flags the access-provisioning task for a new hire. IGA orchestrates the role/entitlement assignment via birthright-access policies and triggers provisioning to downstrea |
| ONBOARDING | `onboarding_tasks` | `task.it_provisioning_required` | IGA | api_call | high | Onboarding task requests IT provisioning; IGA must orchestrate downstream accounts and entitlements. SLA pressure on day-one readiness. |
| ONBOARDING | `onboarding_document_collections` | `onboarding_document_collection.completed` | HCM | event_stream | low | All new-hire docs collected; HCM finalizes the employee record. |
| ONBOARDING | `onboarding_journeys` | `journey.day_one_reached` | PAYROLL | batch_sync | medium | Day-1 milestone on the journey activates the new hire in Payroll. Direct-deposit, tax-withholding, and country-specific forms collected during the journey feed into Payroll's maste |
| ONBOARDING | `onboarding_document_collections` | `onboarding_document_collection.completed` | PAYROLL | event_stream | low | Tax forms, direct-deposit info, and I-9 verified; PAYROLL finalizes setup. |
| ONBOARDING | `onboarding_tasks` | `task.compliance_training_required` | LMS | api_call | medium | Compliance training items (security awareness, anti-harassment, HIPAA, country-specific code-of-conduct, role-specific certifications) trigger LMS enrollments. LMS masters the enro |
| ONBOARDING | `onboarding_journeys` | `journey.day_one_reached` | EMP-EXP | event_stream | low | Day-one milestone fires onboarding-experience survey and welcome flows. |
| SWP | `org_designs` | `hcm_position.approved_for_creation` | HCM | api_call | high | Org-design changes (new positions, restructures, eliminated positions, reporting-line changes) trigger position-master updates in HCM. HCM masters positions operationally; SWP desi |
| SWP | `position_demand_forecasts` | `position_demand_forecast.updated` | HCM | event_stream | medium | Refreshed demand drives HCM headcount-plan and position-creation cadence. |
| SWP | `workforce_scenarios` | `workforce_scenario.approved` | HCM | event_stream | medium | Adopted scenario drives org changes, headcount targets, and role retirements in HCM. |
| SWP | `org_designs` | `org_design.published` | HCM | manual_handoff | high | New org design cascades org-unit moves and reporting changes in HCM. Often done via project rollout rather than event-driven. |
| SWP | `skills_gap_analyses` | `skills_gap_analysis.completed` | LMS | event_stream | medium | Identified gaps drive LMS curriculum updates and assignment campaigns. |
| REAL-EST | `property_spaces` | `property_space.allocated` | HCM | api_call | low | Seat-assignment binding; low friction if shared employee master. |

---

## Cross-cluster reference (data_objects in OTHER clusters that handoffs reach into)

Use these names when authoring section 4 (cross-domain edges) of any domain in this cluster.

- **ITSM** (IT Service Management): `service_incidents`, `service_requests`, `service_problems`, `service_changes`, `knowledge_articles`, `service_catalog_items`, `service_slas`
- **SWP** (Strategic Workforce Planning): `workforce_plans`, `headcount_plans`, `position_demand_forecasts`, `skills_gap_analyses`, `workforce_scenarios`, `org_designs`, `labor_market_benchmarks`, `workforce_cost_projections`, `job_requisitions`
- **WORK-MGMT** (Work Management): `work_items`, `work_projects`, `work_automations`, `okr_objectives`
- **REAL-EST** (Real Estate and Workplace Management): `real_estate_properties`, `property_leases`, `floor_plans`, `property_spaces`, `occupancy_records`, `facility_work_orders`, `utility_meter_readings`, `capital_projects`
- **GRC** (Governance, Risk and Compliance): `compliance_risks`, `compliance_controls`, `control_assessments`, `compliance_policies`, `policy_attestations`, `compliance_obligations`, `compliance_evidence`, `audit_issues`, `remediation_plans`, `risk_assessments`
- **AGENCY-MGMT** (Agency Management Software): `agency_jobs`, `agency_time_entries`, `agency_retainers`, `media_plans`, `insertion_orders`, `creative_briefs`, `creative_deliverables`, `agency_estimates`
- **IWMS** (Workplace and Space Management): `desk_bookings`, `room_reservations`, `workplace_service_requests`, `space_utilization_reports`, `workplace_experience_feedback`
- **VIS-MGMT** (Visitor Management): `visitor_registrations`, `visitor_check_ins`, `visitor_badges`, `host_assignments`, `visitor_evacuation_lists`, `visitor_nda_acknowledgements`, `visitor_watchlist_screenings`, `visitor_audit_logs`
- **LSD** (Legal Service Delivery): `in_house_legal_matters`, `legal_intake_requests`, `legal_holds`, `ediscovery_requests`, `outside_counsel_engagements`, `legal_advice_records`, `regulatory_inquiries`, `legal_case_dockets`
- **ITAM** (IT Asset Management): `asset_contracts`, `asset_lifecycle_events`
- **KMS** (Knowledge Management): `knowledge_base_articles`, `knowledge_categories`, `article_revisions`, `article_feedback`, `knowledge_search_queries`, `knowledge_collections`
- **IGA** (Identity Governance and Administration): `employees`, `saas_app_assignments`, `iga_access_requests`, `iga_access_certifications`, `iga_entitlement_definitions`, `iga_sod_violations`, `iga_provisioning_events`
- **RET-STORE** (Retail Store Operations): `store_tasks`, `retail_labour_schedules`, `store_audits`, `mystery_shopper_records`, `planogram_compliance_records`, `store_associate_checklists`
- **PAYROLL** (Payroll Management): `employees`, `pay_runs`, `pay_slips`, `earning_codes`, `deduction_codes`, `tax_authorities`, `tax_filings`, `garnishment_orders`, `payroll_journal_entries`, `hcm_positions`, `org_units`, `cost_centers`
- **ATS** (Applicant Tracking and Recruiting): `job_postings`, `candidates`, `job_applications`, `recruitment_sources`, `candidate_referrals`, `talent_pools`, `interviews`, `interview_scorecards`, `candidate_assessments`, `job_offers`, `background_checks`, `recruitment_agencies`, `recruitment_events`, `job_requisitions`, `employees`, `hcm_positions`, `job_profiles`, `org_units`, `cost_centers`
- **TALENT-MGMT** (Talent Management): `employees`, `performance_reviews`, `performance_goals`, `succession_plans`, `talent_calibrations`, `nine_box_placements`, `career_aspirations`, `feedback_records`, `okr_objectives`, `hcm_positions`, `org_units`
- **WFM** (Workforce Management): `work_schedules`, `work_shifts`, `time_entries`, `absence_requests`, `absence_balances`, `time_off_policies`, `meal_break_records`, `job_profiles`, `org_units`, `employees`, `cost_centers`, `hcm_positions`
- **COMP-MGMT** (Compensation Management): `compensation_plans`, `salary_bands`, `merit_cycles`, `merit_recommendations`, `compensation_statements`, `equity_grants`, `compensation_benchmarks`, `employees`, `hcm_positions`, `job_profiles`, `cost_centers`
- **PA** (People Analytics): `attrition_forecasts`, `people_kpis`, `workforce_segments`, `engagement_surveys`, `predictive_models`
- **VMS** (Vendor Management System): `contingent_workers`, `pm_work_orders`, `staffing_suppliers`, `rate_cards`, `contingent_timesheets`, `contingent_invoices`
- **ERP-FIN** (Core ERP Financial Management): `journal_entries`, `general_ledger_accounts`, `cost_centers`, `legal_entities`, `accounting_periods`, `bank_accounts`, `cash_transactions`, `fixed_assets`, `asset_depreciation_schedules`, `intercompany_transactions`, `revenue_recognition_records`
- **EPM** (Enterprise Performance Management): `financial_plans`, `financial_budgets`, `financial_forecasts`, `financial_scenarios`, `variance_analyses`
- **EXPENSE** (Expense Management): `expense_reports`, `expense_lines`, `expense_policies`, `travel_bookings`, `corporate_cards`, `card_transactions`
- **PSA** (Professional Services Automation): `service_projects`, `project_tasks`, `project_assignments`, `project_billing_milestones`, `resource_skill_inventories`, `project_resource_allocations`
- **MDM** (Master Data Management): `customer_golden_records`, `supplier_golden_records`, `employee_golden_records`, `match_rules`, `merge_rules`, `source_records`, `customers`, `suppliers`, `employees`

---

## Platform built-in

Reference `users` (data_object_id=748, kind=platform_builtin) for any assignee / owner / approver / creator relationship. Always section 3.

---

## OUTPUT TEMPLATE — repeat once per domain (replace the example rows)

## Domain: <DOMAIN_CODE> — <Domain Name>

### 1. Mermaid graph (intra-domain only — visualize the entity-cluster shape)

```mermaid
graph LR
  %% use snake_case data_object_name for every node; use --|verb|--> for edges
  job_postings -->|publishes| job_applications
```

### 2. Intra-domain relationships

| from | verb | to | cardinality | kind | required | owner_side | inverse_verb | notes |
|---|---|---|---|---|---|---|---|---|
| job_postings | publishes | job_applications | one_to_many | composition | true | source | is published from | each application belongs to one posting |

### 3. Users edges (platform_builtin)

| from | verb | to | cardinality | kind | required | owner_side | inverse_verb | notes |
|---|---|---|---|---|---|---|---|---|
| job_applications | assigned_to | users | many_to_one | reference | false | target | hiring manager for | recruiter ownership |

### 4. Cross-domain edges (clean payload→target only)

| from | verb | to | cardinality | kind | required | owner_side | inverse_verb | notes |
|---|---|---|---|---|---|---|---|---|
| job_offers | becomes | employees | one_to_one | reference | false | target | onboarded from | only when offer accepted |

### 5. Aliases (≥1 per non-self-explanatory master)

| data_object | alias_name | alias_type | is_preferred | notes |
|---|---|---|---|---|
| job_applications | application | synonym | false | common short form |
| job_applications | candidate submission | industry_term | false | HR vendor terminology |


---

## Schema reference

### data_object_relationships schema

| Column | Type / values | Notes |
|---|---|---|
| data_object_id | reference→data_objects | The **source / subject** side. Use the data_object_name (the loader will resolve to id). |
| related_data_object_id | reference→data_objects | The **target / object** side. |
| relationship_verb | text | Parent-voice verb. Conventions: `owns`, `manages`, `schedules`, `places`, `is_assigned_to`, `extends`, `groups`, `contains`, `triggers`, `approves`, `fulfills`, `closes`, `spawns`, `becomes`. Use snake_case. |
| inverse_verb | text | Reverse phrasing for navigation: `is owned by`, `reports to`, `is scheduled by`. Natural prose, no snake_case required. |
| relationship_type | enum | `one_to_one` / `one_to_many` / `many_to_many` |
| relationship_kind | enum | `composition` (parent owns child, cascade), `reference` (loose link, no cascade), `association` (peer-to-peer M:N), `inheritance` (subtype / IS-A) |
| owner_side | enum | `source` = the row identified by data_object_id cascades into the related object on delete; `target` = the related object owns the lifecycle. Drives delete-mode derivation downstream. |
| is_required | boolean | true if mandatory in typical implementations (every Order has a Customer); false if optional. |
| notes | text | Free-form. |

### data_object_aliases schema

| Column | Type / values | Notes |
|---|---|---|
| data_object_id | reference→data_objects | The aliased entity (by data_object_name). |
| alias_name | text | The alternative term. |
| alias_type | enum | `synonym` (general alt term), `industry_term` (specific to an industry — set industry_id), `solution_term` (specific to a vendor product — set solution_id). For Step 5 only `synonym` and `industry_term` are expected; `industry_term` rows without an industry_id will be skipped by the loader. |
| is_preferred | boolean | True if this alias is more common than the canonical name in its context. Usually false. |

### Guardrails

1. **Use data_object_name (snake_case) everywhere in tables**, not labels. Loader resolves names → ids.
2. **Only reference data_objects that exist** in your cluster's domain list OR `users` (the only platform_builtin) OR data_objects that belong to other domains shown in the **cross-cluster reference list** below. Do not invent new entity names.
3. **Intra-domain edges**: every edge's both ends are data_objects belonging to a single domain in this cluster (could be the same domain). Aim for completeness — every master/embedded_master should have at least one edge unless it is a true root entity.
4. **Users edges**: cover assignee / owner / created_by / approver style relationships. Every entity that has any user-shaped role gets a users edge. Use distinct verbs (`is_owned_by`, `is_assigned_to`, `is_created_by`, `is_approved_by`).
5. **Cross-domain edges**: ONLY include where there is a clean, deterministic payload→target mapping (e.g. `candidates → becomes → employees` when a hire happens, `job_offers → spawns → onboarding_journeys`). Do NOT speculate. The cross_domain_handoffs in your brief are an existing source of truth; convert each row to a relationship edge where the payload (data_object_id) is the **from** side and the target_domain has a master data_object that is the natural recipient.
6. **Aliases**: focus on non-self-explanatory masters. A master named `hcm_employees` doesn't need an alias for "employee" because the singular is obvious. But `itsm_incidents` could alias to "ticket"; `crm_opportunities` to "deal"; `cmdb_configuration_items` to "CI". 1-3 aliases per master that benefits, none for those that don't.
7. **Avoid duplicate edges**: do not author both A→B and B→A; pick the natural source side (the side that *owns the action* in the verb). E.g. for "publishes" the publisher is source; for "is_assigned_to" the assignee-holder is source.
8. **Use `composition` sparingly**: only when delete-cascade is the obvious correct behavior (an order_line cannot exist without its order). Most edges are `reference`.
9. **`owner_side='source'`** is the right answer when the source row's lifecycle drives the related row (composition pattern). **`owner_side='target'`** is correct for "reference upward" relationships (a job_application references a job_posting; the posting is the lifecycle owner).
10. **Output is markdown only.** Do NOT call semantius or PostgREST. Write the draft to the path your prompt specifies.
