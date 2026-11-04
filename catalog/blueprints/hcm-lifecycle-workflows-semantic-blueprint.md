---
artifact: semantic-blueprint
version: "3.1"
license: MIT
system_name: Employee Lifecycle Workflows
tagline: "Move people through the moments that matter: onboarding, job and leave changes, and a coordinated offboarding."
description: |
  The lifecycle workflows module orchestrates the transitions in an employee's journey. Reconcile new hires arriving from recruiting into active workers, route everyday change requests like transfers and leaves of absence, and coordinate a clean offboarding across IT, identity, and payroll.

  Employees and managers drive much of this themselves through self-service, while HR keeps oversight. Each step reads from and writes back to the authoritative worker record, so a completed onboarding, an approved leave, or a finished separation lands consistently everywhere it needs to without manual rekeying.
system_slug: hcm-lifecycle-workflows
domain_modules:
  - hcm-lifecycle-workflows
domain_code: HCM
icon_name: users
related_modules: [ats-candidate-crm, ats-interviews, ats-offers, ats-pre-employee-record, ben-enrollment, bgv-screening-orders, comp-planning, emp-exp-continuous-listen, hcm-core-worker, hcm-org-positions, hrsd-case-mgmt, itam-lifecycle, lms-automation, lms-compliance-training, lms-course-delivery, lms-credentials, lms-paths, lsd-legal-hold, pa-workforce-metrics, skills-mgmt-profile, talent-performance-mgmt, talent-succession-career, wfm-absence]
persona: [HR-BUSINESS-PARTNER, HR-HRIS-ADMIN, HR-PEOPLE-OPS-SPECIALIST, PEOPLE-MANAGER]
supports_raci: false
created_at: 2026-11-04
---

# Employee Lifecycle Workflows

## 1. Overview

Employee and manager self-service portal coordinating cross-domain lifecycle: onboarding intake from ATS, lifecycle change requests, leave/absence visibility, and offboarding handoffs to ITSM/IGA/PAYROLL. Workflow surface on top of HCM-CORE-WORKER and HCM-ORG-POSITIONS, no masters of its own.

## 2. Entity summary

| Name | data_object | Description |
| --- | --- | --- |
| Worker Change Requests | `worker_change_requests` | Self-service requests by an employee or manager to change worker data, routed through approval before committing to the worker record. |
| Pre-Employees | `pre_employees` | Pre-employment records covering the window between offer acceptance and start date, tracking paperwork, background checks, and pre-boarding tasks. |
| Asset Lifecycle Events | `asset_lifecycle_events` | Cross-cutting lifecycle log for hardware, software, and SaaS assets: procurement, deployment, transfer, retirement, and disposal. |
| Absence Balances | `absence_balances` | Per-worker running balances for a leave type: accrued, taken, scheduled, and available, reset each accrual cycle. |
| Absence Requests | `absence_requests` | Worker requests for time away (vacation, sick, parental, bereavement, jury duty), carrying eligibility, approval chain, and accrual deduction. |
| Assessments | `candidate_assessments` | Skills, cognitive, technical, or personality test results attached to an application, often sourced from an external assessment provider. |
| Candidates | `candidates` | People known to the recruiting organization, with or without an active application, carrying contact details, resume, tags, consent, and source. |
| Compensation Plans | `compensation_plans` | Total-rewards package definitions per role, level, and location, covering base, bonus target, equity, and allowances. |
| Compliance Training Assignments | `compliance_assignments` | Mandatory training assignments tied to a regulation, role, location, or hire event, with due dates and escalation policy. |
| Course Completions | `course_completions` | Terminal completion records per learner per course version, marking the course as finished. |
| Employees | `employees` | Canonical records of people currently or formerly employed, carrying identity, employment metadata, and relationships to position, manager, and org unit. |
| Employment Events | `employment_events` | Lifecycle events for an employee, such as hire, promotion, transfer, leave, comp change, and termination. The audit history of an employment. |
| Engagement Drivers | `engagement_drivers` | Calculated driver scores, such as growth, recognition, and leadership, at a team, department, or segment level. |
| HR Cases | `hr_cases` | Employee inquiries and service requests routed to HR operations, such as pay questions, benefits changes, leave requests, and complaints. |
| Learning Records | `learning_records` | Granular completion events for a course or activity (actor, verb, object, result, timestamp) feeding skill profiles and certifications. |
| Legal Holds | `legal_holds` | Litigation preservation notices, with matter reference, affected record types, custodian scope, and issued and lifting dates, enforced across data systems. |
| Life Events | `life_events` | Qualifying life events such as marriage, birth, adoption, or coverage loss that open a mid-year benefits enrollment window. |
| Merit Recommendations | `merit_recommendations` | Per-employee proposed merit increases, bonuses, and equity refreshes for a cycle, with calibration adjustments and final approval. |
| Offers | `job_offers` | Formal employment offers extended to candidates, with compensation, start date, terms, approval, and status. |
| Performance Goals | `performance_goals` | Individual performance goals with owner, period, metric, weight, and status, aligned to organizational objectives and reviewed within performance cycles. |
| Skill Profiles | `skill_profiles` | Per-worker collections of skills with self-assessed and validated proficiency, derived from courses, certifications, and performance signals. |
| Succession Plans | `succession_plans` | Bench plans for critical positions, listing identified successors, readiness ratings, development plans, and risk of loss. |
| Workforce Segments | `workforce_segments` | Named workforce cohort definitions used for analysis and intervention, such as high-potential, flight-risk, top-performer, and early-career. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef embedded_master fill:#fff4cc,stroke:#c79100,color:#5b4500;
  classDef contributor fill:#cfe8ff,stroke:#1976d2,color:#0d3a66;
  classDef consumer fill:#e8def8,stroke:#7b1fa2,color:#3a155d;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  candidates["Candidates"]
  candidate_assessments["Assessments"]
  job_offers["Offers"]
  employees["Employees"]
  employment_events["Employment Events"]
  workforce_segments["Workforce Segments"]
  asset_lifecycle_events["Asset Lifecycle Events"]
  life_events["Life Events"]
  compensation_plans["Compensation Plans"]
  merit_recommendations["Merit Recommendations"]
  absence_requests["Absence Requests"]
  absence_balances["Absence Balances"]
  learning_records["Learning Records"]
  skill_profiles["Skill Profiles"]
  compliance_assignments["Compliance Training Assignments"]
  performance_goals["Performance Goals"]
  succession_plans["Succession Plans"]
  engagement_drivers["Engagement Drivers"]
  hr_cases["HR Cases"]
  legal_holds["Legal Holds"]
  pre_employees["Pre-Employees"]
  course_completions["Course Completions"]
  worker_change_requests["Worker Change Requests"]
  users["Users"]
  employees -->|"generates"| employment_events
  employees -->|"triggers"| asset_lifecycle_events
  employees -->|"requests"| absence_requests
  employees -->|"holds"| skill_profiles
  employees -->|"spawns"| hr_cases
  employees -->|"reflects"| learning_records
  employees -->|"reflected on"| compliance_assignments
  skill_profiles -->|"feeds"| candidates
  employees -->|"declares"| life_events
  employees -->|"updated by"| life_events
  employees -->|"flagged on"| engagement_drivers
  employees -->|"reflected on"| engagement_drivers
  employees -->|"raises"| hr_cases
  employees -->|"updated by"| hr_cases
  legal_holds -->|"identifies_custodians_from"| employees
  candidates -->|"becomes"| employees
  pre_employees -->|"promotes to"| employees
  job_offers -->|"spawns pre-employee record"| pre_employees
  candidates -->|"becomes pre-employee"| pre_employees
  employees -->|"receives"| merit_recommendations
  employees -->|"has"| worker_change_requests
  employees -->|"applies_as"| candidates
  users -->|"represents"| employees
  users -->|"records"| employment_events
  users -->|"requests"| absence_requests
  users -->|"approves"| absence_requests
  users -->|"assigned"| asset_lifecycle_events
  users -->|"earns"| learning_records
  users -->|"must complete"| compliance_assignments
  users -->|"owns"| compliance_assignments
  users -->|"holds"| skill_profiles
  users -->|"declares"| life_events
  users -->|"approves"| life_events
  users -->|"owns"| engagement_drivers
  users -->|"raises"| hr_cases
  users -->|"works on"| hr_cases
  users -->|"owns"| hr_cases
  users -->|"approves"| hr_cases
  users -->|"logged events"| asset_lifecycle_events
  users -->|"issued hold"| legal_holds
  users -->|"approves"| job_offers
  users -->|"owns pre-employee record"| pre_employees
  users -->|"owns"| performance_goals
  users -->|"is_incumbent_in"| succession_plans
  users -->|"is_successor_in"| succession_plans
  users -->|"owns as recruiter"| candidates
  users -->|"invites"| candidate_assessments
  users -->|"completes"| course_completions
  users -->|"owns"| compensation_plans
  users -->|"approves"| compensation_plans
  users -->|"submits"| merit_recommendations
  users -->|"approves"| merit_recommendations
  users -->|"authors"| workforce_segments
  users -->|"tracks_balance_for"| absence_balances
  users -->|"submits"| life_events
  users -->|"approves"| life_events
  users -->|"processes"| life_events
  users -->|"requests"| worker_change_requests
  users -->|"owns as recruiter"| job_offers
  class candidates consumer;
  class candidate_assessments consumer;
  class job_offers consumer;
  class employees consumer;
  class employment_events consumer;
  class workforce_segments consumer;
  class asset_lifecycle_events contributor;
  class life_events consumer;
  class compensation_plans consumer;
  class merit_recommendations consumer;
  class absence_requests consumer;
  class absence_balances consumer;
  class learning_records consumer;
  class skill_profiles consumer;
  class compliance_assignments consumer;
  class performance_goals consumer;
  class succession_plans consumer;
  class engagement_drivers consumer;
  class hr_cases consumer;
  class legal_holds consumer;
  class pre_employees embedded_master;
  class course_completions consumer;
  class worker_change_requests master;
  class users platform_builtin;
  style candidates stroke-dasharray:5 5;
  style candidate_assessments stroke-dasharray:5 5;
  style job_offers stroke-dasharray:5 5;
  style workforce_segments stroke-dasharray:5 5;
  style asset_lifecycle_events stroke-dasharray:5 5;
  style life_events stroke-dasharray:5 5;
  style compensation_plans stroke-dasharray:5 5;
  style merit_recommendations stroke-dasharray:5 5;
  style absence_requests stroke-dasharray:5 5;
  style absence_balances stroke-dasharray:5 5;
  style learning_records stroke-dasharray:5 5;
  style skill_profiles stroke-dasharray:5 5;
  style compliance_assignments stroke-dasharray:5 5;
  style performance_goals stroke-dasharray:5 5;
  style succession_plans stroke-dasharray:5 5;
  style engagement_drivers stroke-dasharray:5 5;
  style hr_cases stroke-dasharray:5 5;
  style legal_holds stroke-dasharray:5 5;
  style course_completions stroke-dasharray:5 5;
```

## 3. Entities catalog

| # | data_object | catalog code | singular | plural | held_as | mastered in | mastered label | install_optional | personal_content | entity_type | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `worker_change_requests` | `worker_change_requests` | Worker Change Request | Worker Change Requests | master | - | - | - | yes | operational_workflow | `:manage` | - |
| 2 | `pre_employees` | `pre_employees` | Pre-Employee | Pre-Employees | embedded_master | `ats-pre-employee-record` | Pre-Employee Record | - | yes | operational_workflow | `:manage` | - |
| 3 | `asset_lifecycle_events` | `asset_lifecycle_events` | Asset Lifecycle Event | Asset Lifecycle Events | contributor | `itam-lifecycle` | Unified Asset Lifecycle Log | yes | - | operational_record | `:manage` | - |
| 4 | `absence_balances` | `absence_balances` | Absence Balance | Absence Balances | consumer | `wfm-absence` | Absence and Leave | yes | - | computed | read-only | - |
| 5 | `absence_requests` | `absence_requests` | Absence Request | Absence Requests | consumer | `wfm-absence` | Absence and Leave | yes | - | operational_workflow | `:manage` | - |
| 6 | `candidate_assessments` | `candidate_assessments` | Assessment | Assessments | consumer | `ats-interviews` | Candidate Interviews | yes | - | operational_workflow | `:manage` | - |
| 7 | `candidates` | `candidates` | Candidate | Candidates | consumer | `ats-candidate-crm` | Candidate CRM | yes | yes | operational_workflow | `:manage` | - |
| 8 | `compensation_plans` | `compensation_plans` | Compensation Plan | Compensation Plans | consumer | `comp-planning` | Compensation Planning Cycles | yes | - | operational_workflow | `:manage` | - |
| 9 | `compliance_assignments` | `compliance_assignments` | Compliance Training Assignment | Compliance Training Assignments | consumer | `lms-compliance-training` | Compliance Training | yes | yes | operational_workflow | `:manage` | - |
| 10 | `course_completions` | `course_completions` | Course Completion | Course Completions | consumer | `lms-course-delivery` | Course Delivery | yes | yes | operational_record | `:manage` | - |
| 11 | `employees` | `employees` | Employee | Employees | consumer | `hcm-core-worker` | Core Worker Record | - | yes | operational_workflow | `:manage` | - |
| 12 | `employment_events` | `employment_events` | Employment Event | Employment Events | consumer | `hcm-core-worker` | Core Worker Record | - | yes | operational_workflow | `:manage` | - |
| 13 | `engagement_drivers` | `engagement_drivers` | Engagement Driver | Engagement Drivers | consumer | `emp-exp-continuous-listen` | Continuous Listening | yes | - | computed | read-only | - |
| 14 | `hr_cases` | `hr_cases` | HR Case | HR Cases | consumer | `hrsd-case-mgmt` | HR Case Management | yes | yes | operational_workflow | `:manage` | - |
| 15 | `learning_records` | `learning_records` | Learning Record | Learning Records | consumer | `lms-course-delivery` | Course Delivery | yes | yes | operational_record | `:manage` | - |
| 16 | `legal_holds` | `legal_holds` | Legal Hold | Legal Holds | consumer | `lsd-legal-hold` | Legal Hold and eDiscovery | yes | - | operational_workflow | `:manage` | - |
| 17 | `life_events` | `life_events` | Life Event | Life Events | consumer | `ben-enrollment` | Enrollment and Life Events | yes | yes | operational_workflow | `:manage` | - |
| 18 | `merit_recommendations` | `merit_recommendations` | Merit Recommendation | Merit Recommendations | consumer | `comp-planning` | Compensation Planning Cycles | yes | yes | operational_workflow | `:manage` | - |
| 19 | `job_offers` | `job_offers` | Offer | Offers | consumer | `ats-offers` | Job Offers | yes | yes | operational_workflow | `:manage` | - |
| 20 | `performance_goals` | `performance_goals` | Performance Goal | Performance Goals | consumer | `talent-performance-mgmt` | Performance and Goal Management | yes | yes | operational_workflow | `:manage` | - |
| 21 | `skill_profiles` | `skill_profiles` | Skill Profile | Skill Profiles | consumer | `skills-mgmt-profile` | Worker Skill Profiles and Assessments | yes | yes | operational_workflow | `:manage` | - |
| 22 | `succession_plans` | `succession_plans` | Succession Plan | Succession Plans | consumer | `talent-succession-career` | Succession and Career Planning | yes | yes | operational_workflow | `:manage` | - |
| 23 | `workforce_segments` | `workforce_segments` | Workforce Segment | Workforce Segments | consumer | `pa-workforce-metrics` | Workforce Metrics | yes | - | computed | read-only | - |

## 4. Aliases and industry synonyms

_(none: no industry-scoped aliases for this scope)_

## 5. Relationships

_`field_required` applies only when both entities are installed. It never makes an entity required._

### 5.1 Relationships between entities in this blueprint

| from | verb | to | cardinality | kind | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `employees` | generates | `employment_events` | one_to_many | composition | yes | cascade | parent | - |
| `employees` | triggers | `asset_lifecycle_events` | one_to_many | reference | no | clear | reference | - |
| `employees` | requests | `absence_requests` | one_to_many | reference | no | clear | reference | - |
| `employees` | holds | `skill_profiles` | one_to_one | reference | no | clear | reference | - |
| `employees` | spawns | `hr_cases` | one_to_many | reference | no | clear | reference | - |
| `employees` | reflects | `learning_records` | one_to_many | reference | no | clear | reference | - |
| `employees` | reflected on | `compliance_assignments` | one_to_many | reference | no | clear | reference | - |
| `skill_profiles` | feeds | `candidates` | one_to_many | reference | no | clear | reference | - |
| `employees` | declares | `life_events` | one_to_many | reference | no | clear | reference | - |
| `employees` | updated by | `life_events` | one_to_many | reference | no | clear | reference | - |
| `employees` | flagged on | `engagement_drivers` | one_to_many | reference | no | clear | reference | - |
| `employees` | reflected on | `engagement_drivers` | one_to_many | reference | no | clear | reference | - |
| `employees` | raises | `hr_cases` | one_to_many | reference | yes | restrict | reference | - |
| `employees` | updated by | `hr_cases` | one_to_many | reference | no | clear | reference | - |
| `legal_holds` | identifies_custodians_from | `employees` | many_to_many | reference | - | cascade | parent | - |
| `candidates` | becomes | `employees` | one_to_one | reference | no | clear | reference | - |
| `pre_employees` | promotes to | `employees` | one_to_one | reference | no | clear | reference | - |
| `job_offers` | spawns pre-employee record | `pre_employees` | one_to_one | reference | yes | restrict | reference | - |
| `candidates` | becomes pre-employee | `pre_employees` | one_to_one | reference | yes | restrict | reference | - |
| `employees` | receives | `merit_recommendations` | one_to_one | reference | no | clear | reference | - |
| `employees` | has | `worker_change_requests` | one_to_many | reference | yes | restrict | reference | - |
| `employees` | applies_as | `candidates` | one_to_many | reference | no | clear | reference | - |

### 5.2 Relationships to platform built-ins (`users`)

| from | verb | to | cardinality | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `users` | represents | `employees` | one_to_one | no | clear | reference | - |
| `users` | records | `employment_events` | one_to_many | no | clear | reference | - |
| `users` | requests | `absence_requests` | one_to_many | yes | restrict | reference | - |
| `users` | approves | `absence_requests` | one_to_many | no | clear | reference | - |
| `users` | assigned | `asset_lifecycle_events` | one_to_many | no | clear | reference | - |
| `users` | earns | `learning_records` | one_to_many | yes | restrict | reference | - |
| `users` | must complete | `compliance_assignments` | one_to_many | yes | restrict | reference | - |
| `users` | owns | `compliance_assignments` | one_to_many | no | clear | reference | - |
| `users` | holds | `skill_profiles` | one_to_many | yes | restrict | reference | - |
| `users` | declares | `life_events` | one_to_many | yes | restrict | reference | - |
| `users` | approves | `life_events` | one_to_many | no | clear | reference | - |
| `users` | owns | `engagement_drivers` | one_to_many | no | clear | reference | - |
| `users` | raises | `hr_cases` | one_to_many | yes | restrict | reference | - |
| `users` | works on | `hr_cases` | one_to_many | no | clear | reference | - |
| `users` | owns | `hr_cases` | one_to_many | no | clear | reference | - |
| `users` | approves | `hr_cases` | one_to_many | no | clear | reference | - |
| `users` | logged events | `asset_lifecycle_events` | one_to_many | no | clear | reference | - |
| `users` | issued hold | `legal_holds` | one_to_many | yes | restrict | reference | - |
| `users` | approves | `job_offers` | one_to_many | yes | restrict | reference | - |
| `users` | owns pre-employee record | `pre_employees` | one_to_many | yes | restrict | reference | - |
| `users` | owns | `performance_goals` | one_to_many | yes | restrict | reference | - |
| `users` | is_incumbent_in | `succession_plans` | one_to_many | no | clear | reference | - |
| `users` | is_successor_in | `succession_plans` | many_to_many | - | cascade | parent | - |
| `users` | owns as recruiter | `candidates` | one_to_many | no | clear | reference | - |
| `users` | invites | `candidate_assessments` | one_to_many | yes | restrict | reference | - |
| `users` | completes | `course_completions` | one_to_many | yes | restrict | reference | - |
| `users` | owns | `compensation_plans` | one_to_many | yes | restrict | reference | - |
| `users` | approves | `compensation_plans` | one_to_many | no | clear | reference | - |
| `users` | submits | `merit_recommendations` | one_to_many | yes | restrict | reference | - |
| `users` | approves | `merit_recommendations` | one_to_many | no | clear | reference | - |
| `users` | authors | `workforce_segments` | one_to_many | no | clear | reference | - |
| `users` | tracks_balance_for | `absence_balances` | one_to_many | yes | restrict | reference | - |
| `users` | submits | `life_events` | one_to_many | no | clear | reference | - |
| `users` | approves | `life_events` | one_to_many | no | clear | reference | - |
| `users` | processes | `life_events` | one_to_many | no | clear | reference | - |
| `users` | requests | `worker_change_requests` | one_to_many | yes | restrict | reference | - |
| `users` | owns as recruiter | `job_offers` | one_to_many | no | clear | reference | - |

### 5.3 Relationships to entities outside this blueprint

_External entities are optional: this blueprint never installs them. If one exists at install, the relationship is proposed. A many-to-many relationship is listed under outgoing and proposed as a new junction table._

#### 5.3a Outgoing relationships: this blueprint's entity points to the external entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `org_units` | groups | `employees` | one_to_many | yes | - |
| `org_units` | is_scored_by | `engagement_drivers` | one_to_many | no | - |
| `job_profiles` | maps_to | `skill_profiles` | many_to_many | - | - |
| `onboarding_tasks` | triggers | `asset_lifecycle_events` | one_to_many | no | - |
| `hardware_assets` | delivered by | `asset_lifecycle_events` | one_to_many | no | - |
| `onboarding_tasks` | spawns | `hr_cases` | one_to_many | no | - |
| `course_enrollments` | produces | `learning_records` | one_to_many | yes | - |
| `courses` | fulfills | `compliance_assignments` | one_to_many | no | - |
| `hcm_positions` | requires | `compliance_assignments` | one_to_many | no | - |
| `job_profiles` | expects | `skill_profiles` | many_to_many | - | - |
| `org_units` | sponsors | `compliance_assignments` | one_to_many | no | - |
| `compliance_obligations` | tracked by | `compliance_assignments` | one_to_many | no | - |
| `carrier_feeds` | spawns | `hr_cases` | one_to_many | no | - |
| `survey_responses` | scores | `engagement_drivers` | many_to_many | - | - |
| `survey_campaigns` | targets | `employees` | many_to_many | - | - |
| `case_categories` | classifies | `hr_cases` | one_to_many | yes | - |
| `hr_cases` | references | `knowledge_articles` | many_to_many | - | - |
| `case_categories` | drives | `employees` | one_to_many | no | - |
| `service_changes` | generates | `asset_lifecycle_events` | one_to_many | no | - |
| `fixed_assets` | impacted by lifecycle | `asset_lifecycle_events` | one_to_many | no | - |
| `technology_platforms` | registers_as | `asset_lifecycle_events` | one_to_many | no | - |
| `asset_contracts` | governs | `asset_lifecycle_events` | one_to_many | no | - |
| `saas_applications` | lifecycle events for | `asset_lifecycle_events` | one_to_many | no | - |
| `fixed_assets` | updated by lifecycle | `asset_lifecycle_events` | one_to_many | no | - |
| `in_house_legal_matters` | places | `legal_holds` | one_to_many | yes | - |
| `legal_holds` | evidences | `audit_engagements` | many_to_many | - | - |
| `legal_advice_records` | references | `employees` | many_to_many | - | - |
| `content_documents` | triggers | `legal_holds` | one_to_many | no | - |
| `store_audits` | triggers | `employment_events` | one_to_many | no | - |
| `recruitment_sources` | attributes | `candidates` | one_to_many | no | - |
| `recruitment_agencies` | sources | `candidates` | one_to_many | no | - |
| `recruitment_events` | attracts | `candidates` | one_to_many | no | - |
| `talent_pools` | groups | `candidates` | many_to_many | - | - |
| `job_applications` | requires | `candidate_assessments` | one_to_many | yes | - |
| `job_applications` | results in | `job_offers` | one_to_many | yes | - |
| `performance_reviews` | evaluates | `performance_goals` | many_to_many | - | - |
| `succession_plans` | considers | `nine_box_placements` | many_to_many | - | - |
| `succession_plans` | considers | `career_aspirations` | many_to_many | - | - |
| `performance_goals` | aligns_to | `okr_objectives` | many_to_many | - | - |
| `skill_profiles` | assessed against | `competency_models` | many_to_many | - | - |
| `candidate_assessment_templates` | instantiates_as | `candidate_assessments` | one_to_many | no | - |
| `course_versions` | completed_via | `course_completions` | one_to_many | yes | - |
| `course_enrollments` | yields | `course_completions` | one_to_many | yes | - |
| `compliance_training_campaigns` | generates | `compliance_assignments` | one_to_many | yes | - |
| `automated_enrollment_rules` | creates | `compliance_assignments` | one_to_many | no | - |
| `knowledge_base_articles` | resolves | `hr_cases` | many_to_many | - | - |
| `merit_cycles` | contains | `merit_recommendations` | one_to_many | yes | - |
| `compensation_statements` | composes | `merit_recommendations` | one_to_many | no | - |
| `compensation_plans` | includes | `salary_bands` | many_to_many | - | - |
| `contingent_workers` | converts_to | `employees` | one_to_one | no | - |
| `time_off_policies` | governs | `absence_balances` | one_to_many | yes | - |
| `time_off_policies` | governs | `absence_requests` | one_to_many | yes | - |

#### 5.3b Incoming relationships: the external entity points to this blueprint's entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `employees` | signs | `employment_contracts` | one_to_many | yes | - |
| `employees` | triggers | `service_requests` | one_to_many | no | - |
| `employees` | triggers | `iga_provisioning_events` | one_to_many | no | - |
| `employment_events` | triggers | `iga_provisioning_events` | one_to_many | no | - |
| `employees` | triggers | `pay_runs` | one_to_many | no | - |
| `employment_events` | feeds | `pay_runs` | one_to_many | no | - |
| `employees` | enrolls_in | `course_enrollments` | one_to_many | no | - |
| `employees` | becomes | `career_aspirations` | one_to_one | no | - |
| `employees` | becomes | `work_shifts` | one_to_many | no | - |
| `employees` | becomes | `compensation_statements` | one_to_one | no | - |
| `employees` | triggers | `benefit_enrollments` | one_to_many | no | - |
| `employment_events` | triggers | `benefit_enrollments` | one_to_many | no | - |
| `employment_events` | feeds | `people_kpis` | one_to_many | no | - |
| `employees` | triggers | `corporate_cards` | one_to_many | no | - |
| `employees` | spawns | `onboarding_journeys` | one_to_one | no | - |
| `employees` | feeds | `headcount_plans` | one_to_many | no | - |
| `employees` | feeds | `agency_time_entries` | one_to_many | no | - |
| `employees` | onboarded by | `onboarding_journeys` | one_to_many | yes | - |
| `employees` | fills | `hcm_positions` | one_to_one | no | - |
| `employees` | finalized by | `onboarding_document_collections` | one_to_many | no | - |
| `skill_profiles` | updated by | `learner_certifications` | one_to_many | no | - |
| `skill_profiles` | updated by | `course_enrollments` | one_to_many | no | - |
| `employees` | learns_via | `course_enrollments` | one_to_many | yes | - |
| `compliance_assignments` | triggers | `iga_provisioning_events` | one_to_many | no | - |
| `skill_profiles` | feeds | `career_aspirations` | one_to_many | no | - |
| `learning_records` | feeds | `people_kpis` | one_to_many | no | - |
| `life_events` | drives | `benefit_enrollments` | one_to_many | no | - |
| `employees` | enrolls_in | `benefit_enrollments` | one_to_many | yes | - |
| `life_events` | adjusts | `pay_runs` | one_to_many | no | - |
| `engagement_drivers` | triggers | `action_plans` | one_to_many | no | - |
| `employees` | submits | `survey_responses` | one_to_many | no | - |
| `engagement_drivers` | feeds | `people_kpis` | one_to_many | no | - |
| `hr_cases` | spawns | `service_requests` | one_to_many | no | - |
| `hr_cases` | spawns | `iga_access_requests` | one_to_many | no | - |
| `asset_lifecycle_events` | hands_off_to | `hardware_disposal_records` | one_to_one | no | - |
| `legal_holds` | preserves | `ediscovery_requests` | one_to_many | no | - |
| `legal_holds` | freezes | `content_documents` | one_to_many | no | - |
| `employees` | is host for | `host_assignments` | one_to_many | yes | - |
| `employees` | reclassifies | `contingent_workers` | one_to_one | no | - |
| `candidates` | submits | `job_applications` | one_to_many | yes | - |
| `candidates` | is referred through | `candidate_referrals` | one_to_many | yes | - |
| `job_offers` | is contingent on | `background_checks` | one_to_many | no | - |
| `job_offers` | spawns | `onboarding_journeys` | one_to_many | no | - |
| `job_offers` | triggers | `benefit_enrollments` | one_to_many | no | - |
| `job_offers` | seeds | `compensation_statements` | one_to_many | no | - |
| `skill_profiles` | updated by | `skill_assessments` | one_to_many | no | - |
| `skill_profiles` | updated by | `skill_endorsements` | one_to_many | no | - |
| `skill_profiles` | updated by | `skill_inference_runs` | one_to_many | no | - |
| `skill_profiles` | compared via | `fit_scores` | one_to_many | yes | - |
| `skill_profiles` | feeds | `mobility_recommendations` | one_to_many | yes | - |
| `candidates` | engaged_via | `candidate_engagements` | one_to_many | no | - |
| `candidates` | attends_via | `recruiting_event_attendances` | one_to_many | yes | - |
| `candidates` | consents_via | `candidate_consents` | one_to_many | yes | - |
| `candidates` | member_of_via | `talent_pool_memberships` | one_to_many | yes | - |
| `candidates` | discloses_via | `fcra_disclosures` | one_to_many | yes | - |
| `candidates` | self_identifies_via | `eeo_responses` | one_to_many | yes | - |
| `job_offers` | evolves_through | `offer_versions` | one_to_many | yes | - |
| `job_offers` | gated_by | `offer_approvals` | one_to_many | yes | - |
| `candidates` | submits_via | `data_subject_requests` | one_to_many | yes | - |
| `candidates` | self_ids_via | `voluntary_self_identifications` | one_to_many | yes | - |
| `candidates` | acknowledges_via | `fcra_summary_of_rights_acknowledgments` | one_to_many | yes | - |
| `compliance_assignments` | evidenced_by | `compliance_audit_records` | one_to_many | no | - |
| `compliance_assignments` | acknowledged_via | `harassment_training_acknowledgments` | one_to_many | no | - |
| `compliance_assignments` | produces | `fda_part11_audit_trails` | one_to_many | no | - |
| `compliance_assignments` | escalates_via | `manager_nudges` | one_to_many | no | - |
| `candidates` | documented_via | `candidate_documents` | one_to_many | yes | - |
| `candidates` | annotated_via | `candidate_notes` | one_to_many | yes | - |
| `candidates` | tagged_via | `candidate_tag_assignments` | one_to_many | yes | - |
| `compensation_plans` | seeds | `merit_cycles` | one_to_many | yes | - |
| `employees` | holds | `equity_grants` | one_to_one | no | - |
| `employees` | receives | `compensation_statements` | one_to_one | no | - |
| `employees` | has | `emergency_contacts` | one_to_many | yes | - |
| `employees` | has | `work_eligibility_documents` | one_to_many | yes | - |
| `employees` | has | `national_ids` | one_to_many | yes | - |
| `employees` | has | `worker_addresses` | one_to_many | yes | - |
| `employees` | has | `employee_dependents` | one_to_many | yes | - |
| `candidates` | corresponds_via | `candidate_emails` | one_to_many | no | - |
| `candidates` | screened_via | `drug_health_screenings` | one_to_many | no | - |
| `employees` | is the worker behind | `traveler_profiles` | one_to_one | no | - |
| `employees` | is assessed by | `exit_risk_assessments` | one_to_one | no | - |
| `employees` | is subject of | `insider_risk_cases` | one_to_many | no | - |
| `employees` | is recognized in | `frontline_recognitions` | one_to_many | yes | - |
| `employees` | is enrolled as | `advocate_profiles` | one_to_one | yes | - |
| `candidates` | verified_via | `right_to_work_verifications` | one_to_many | no | - |
| `candidates` | submitted_via | `agency_submissions` | one_to_many | no | - |
| `compensation_plans` | governs | `incentive_awards` | one_to_many | no | - |
| `merit_recommendations` | produces | `incentive_awards` | one_to_many | no | - |
| `employees` | receives | `incentive_awards` | one_to_many | yes | - |

## 6. Cross-domain context

### 6.1 Master consumers (other modules / domains that embed this scope's masters)

_(none: no other module embeds this scope's masters)_

### 6.2 Outbound handoffs (events this scope publishes)

_(none: no outbound handoffs whose payload is in this scope)_

### 6.3 Inbound handoffs (events this scope reacts to)

_(none: no inbound handoffs whose payload is in this scope)_

### 6.4 Master providers (modules / domains that own masters this scope embeds)

| data_object | held_as | install_optional | catalog owner(s) | slice notes |
| --- | --- | --- | --- | --- |
| `pre_employees` | embedded_master | - | ATS-PRE-EMPLOYEE-RECORD (ATS) | - |
| `asset_lifecycle_events` | contributor | yes | ITAM-LIFECYCLE (ITAM) | - |
| `absence_balances` | consumer | yes | WFM-ABSENCE (WFM) | - |
| `absence_requests` | consumer | yes | WFM-ABSENCE (WFM) | - |
| `candidate_assessments` | consumer | yes | ATS-INTERVIEWS (ATS) | - |
| `candidates` | consumer | yes | ATS-CANDIDATE-CRM (ATS) | - |
| `compensation_plans` | consumer | yes | COMP-PLANNING (COMP-MGMT) | - |
| `compliance_assignments` | consumer | yes | LMS-COMPLIANCE-TRAINING (LMS) | - |
| `course_completions` | consumer | yes | LMS-COURSE-DELIVERY (LMS) | - |
| `employees` | consumer | - | HCM-CORE-WORKER (HCM) | - |
| `employment_events` | consumer | - | HCM-CORE-WORKER (HCM) | - |
| `engagement_drivers` | consumer | yes | EMP-EXP-CONTINUOUS-LISTEN (EMP-EXP) | - |
| `hr_cases` | consumer | yes | HRSD-CASE-MGMT (HRSD) | - |
| `job_offers` | consumer | yes | ATS-OFFERS (ATS) | - |
| `learning_records` | consumer | yes | LMS-COURSE-DELIVERY (LMS) | - |
| `legal_holds` | consumer | yes | LSD-LEGAL-HOLD (LSD) | - |
| `life_events` | consumer | yes | BEN-ENROLLMENT (BEN-ADMIN) | - |
| `merit_recommendations` | consumer | yes | COMP-PLANNING (COMP-MGMT) | - |
| `performance_goals` | consumer | yes | TALENT-PERFORMANCE-MGMT (TALENT-MGMT) | - |
| `skill_profiles` | consumer | yes | SKILLS-MGMT-PROFILE (SKILLS-MGMT) | - |
| `succession_plans` | consumer | yes | TALENT-SUCCESSION-CAREER (TALENT-MGMT) | - |
| `workforce_segments` | consumer | yes | PA-WORKFORCE-METRICS (PA) | - |

## 7. Lifecycle states

### `pre_employees` (Pre-Employee)

_This scope holds `pre_employees` as **embedded_master**; the canonical state machine is owned by `ATS-PRE-EMPLOYEE-RECORD`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `created` | ✓ | - | `ATS-PRE-EMPLOYEE-RECORD` | - | - | - | Record created when an offer is accepted. Paperwork packet not yet generated. |
| 2 | `paperwork_in_flight` | - | - | `ATS-PRE-EMPLOYEE-RECORD` | - | - | - | I-9 / W-4 / direct-deposit / banking forms issued; awaiting candidate completion. Background check may run in parallel. |
| 3 | `cleared` | - | - | `ATS-PRE-EMPLOYEE-RECORD` | - | - | - | All paperwork received and background check completed clear. Ready for HCM activation. |
| 4 | `activated` | - | ✓ | `ATS-PRE-EMPLOYEE-RECORD` | ✓ | - | `ats-pre-employee-record:activate_pre_employee` | Reconciliation handoff fired to HCM (pre_employee.activated event). Canonical employees row created downstream; ATS record becomes read-only. |
| 5 | `canceled` | - | ✓ | `ATS-PRE-EMPLOYEE-RECORD` | - | - | - | Offer rescinded or candidate withdrew before activation. Record retained for audit. |

### `worker_change_requests` (Worker Change Request)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | `HCM-LIFECYCLE-WORKFLOWS` | - | - | - | - |
| 2 | `submitted` | - | - | `HCM-LIFECYCLE-WORKFLOWS` | - | - | - | - |
| 3 | `approved` | - | - | `HCM-LIFECYCLE-WORKFLOWS` | ✓ | - | `hcm-lifecycle-workflows:approved_worker_change_request` | - |
| 4 | `applied` | - | ✓ | `HCM-LIFECYCLE-WORKFLOWS` | - | - | - | - |
| 5 | `rejected` | - | ✓ | `HCM-LIFECYCLE-WORKFLOWS` | - | - | - | - |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `hcm-lifecycle-workflows:read` | baseline-read | Read access to every entity in the module | ✓ |
| `hcm-lifecycle-workflows:manage` | baseline-manage | Edit operational records | ✓ |
| `hcm-lifecycle-workflows:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `ats-candidate-crm:read_candidates` | entity-read | Read Candidates | ✓ |
| `ats-interviews:read_candidate_assessments` | entity-read | Read Assessments | ✓ |
| `ats-offers:read_job_offers` | entity-read | Read Offers | ✓ |
| `hcm-core-worker:read_employees` | entity-read | Read Employees | ✓ |
| `hcm-core-worker:read_employment_events` | entity-read | Read Employment Events | ✓ |
| `pa-workforce-metrics:read_workforce_segments` | entity-read | Read Workforce Segments | ✓ |
| `itam-lifecycle:read_asset_lifecycle_events` | entity-read | Read Asset Lifecycle Events | ✓ |
| `itam-lifecycle:write_asset_lifecycle_events` | entity-write | Write Asset Lifecycle Events | ✓ |
| `ben-enrollment:read_life_events` | entity-read | Read Life Events | ✓ |
| `comp-planning:read_compensation_plans` | entity-read | Read Compensation Plans | ✓ |
| `comp-planning:read_merit_recommendations` | entity-read | Read Merit Recommendations | ✓ |
| `wfm-absence:read_absence_requests` | entity-read | Read Absence Requests | ✓ |
| `wfm-absence:read_absence_balances` | entity-read | Read Absence Balances | ✓ |
| `lms-course-delivery:read_learning_records` | entity-read | Read Learning Records | ✓ |
| `skills-mgmt-profile:read_skill_profiles` | entity-read | Read Skill Profiles | ✓ |
| `lms-compliance-training:read_compliance_assignments` | entity-read | Read Compliance Training Assignments | ✓ |
| `talent-performance-mgmt:read_performance_goals` | entity-read | Read Performance Goals | ✓ |
| `talent-succession-career:read_succession_plans` | entity-read | Read Succession Plans | ✓ |
| `emp-exp-continuous-listen:read_engagement_drivers` | entity-read | Read Engagement Drivers | ✓ |
| `hrsd-case-mgmt:read_hr_cases` | entity-read | Read HR Cases | ✓ |
| `lsd-legal-hold:read_legal_holds` | entity-read | Read Legal Holds | ✓ |
| `ats-pre-employee-record:read_pre_employees` | entity-read | Read Pre-Employees | ✓ |
| `ats-pre-employee-record:write_pre_employees` | entity-write | Write Pre-Employees | ✓ |
| `lms-course-delivery:read_course_completions` | entity-read | Read Course Completions | ✓ |
| `hcm-lifecycle-workflows:read_worker_change_requests` | entity-read | Read Worker Change Requests | ✓ |
| `hcm-lifecycle-workflows:write_worker_change_requests` | entity-write | Write Worker Change Requests | ✓ |
| `ats-pre-employee-record:activate_pre_employee` | workflow-gate (lifecycle) | Transition `pre_employees` into state `activated` | ✓ |
| `hcm-lifecycle-workflows:approved_worker_change_request` | workflow-gate (lifecycle) | Transition `worker_change_requests` into state `approved` | ✓ |
| `ats-pre-employee-record:view_all_pre_employees` | override (personal_content) | View all `pre_employees` rows beyond row-scope | ✓ |
| `ats-pre-employee-record:manage_all_pre_employees` | override (personal_content) | Manage all `pre_employees` rows beyond row-scope | ✓ |
| `hcm-lifecycle-workflows:view_all_worker_change_requests` | override (personal_content) | View all `worker_change_requests` rows beyond row-scope | ✓ |
| `hcm-lifecycle-workflows:manage_all_worker_change_requests` | override (personal_content) | Manage all `worker_change_requests` rows beyond row-scope | ✓ |

_Gates with no process: `ats-pre-employee-record:activate_pre_employee`. No Accountable can hold them, so this blueprint does not support `raci`._

### 8.2 Business rules

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `pre_employee_edit_scope` | `pre_employees` | has_personal_content | Row-scope by default; override via `ats-pre-employee-record:view_all_pre_employees` / `ats-pre-employee-record:manage_all_pre_employees` |
| `worker_change_request_edit_scope` | `worker_change_requests` | has_personal_content | Row-scope by default; override via `hcm-lifecycle-workflows:view_all_worker_change_requests` / `hcm-lifecycle-workflows:manage_all_worker_change_requests` |

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `HCM-LIFECYCLE-WORKFLOWS`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `hcm-lifecycle-workflows_viewer` | `hcm-lifecycle-workflows:read` |
| `hcm-lifecycle-workflows_manager` | `hcm-lifecycle-workflows:manage` |
| `hcm-lifecycle-workflows_admin` | `hcm-lifecycle-workflows:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `hcm-lifecycle-workflows:admin` | `hcm-lifecycle-workflows:manage` |
| `hcm-lifecycle-workflows:manage` | `hcm-lifecycle-workflows:read` |
| `hcm-lifecycle-workflows:read` | `ats-candidate-crm:read_candidates` |
| `hcm-lifecycle-workflows:read` | `ats-interviews:read_candidate_assessments` |
| `hcm-lifecycle-workflows:read` | `ats-offers:read_job_offers` |
| `hcm-lifecycle-workflows:read` | `hcm-core-worker:read_employees` |
| `hcm-lifecycle-workflows:read` | `hcm-core-worker:read_employment_events` |
| `hcm-lifecycle-workflows:read` | `pa-workforce-metrics:read_workforce_segments` |
| `hcm-lifecycle-workflows:read` | `itam-lifecycle:read_asset_lifecycle_events` |
| `hcm-lifecycle-workflows:read` | `ben-enrollment:read_life_events` |
| `hcm-lifecycle-workflows:read` | `comp-planning:read_compensation_plans` |
| `hcm-lifecycle-workflows:read` | `comp-planning:read_merit_recommendations` |
| `hcm-lifecycle-workflows:read` | `wfm-absence:read_absence_requests` |
| `hcm-lifecycle-workflows:read` | `wfm-absence:read_absence_balances` |
| `hcm-lifecycle-workflows:read` | `lms-course-delivery:read_learning_records` |
| `hcm-lifecycle-workflows:read` | `skills-mgmt-profile:read_skill_profiles` |
| `hcm-lifecycle-workflows:read` | `lms-compliance-training:read_compliance_assignments` |
| `hcm-lifecycle-workflows:read` | `talent-performance-mgmt:read_performance_goals` |
| `hcm-lifecycle-workflows:read` | `talent-succession-career:read_succession_plans` |
| `hcm-lifecycle-workflows:read` | `emp-exp-continuous-listen:read_engagement_drivers` |
| `hcm-lifecycle-workflows:read` | `hrsd-case-mgmt:read_hr_cases` |
| `hcm-lifecycle-workflows:read` | `lsd-legal-hold:read_legal_holds` |
| `hcm-lifecycle-workflows:read` | `ats-pre-employee-record:read_pre_employees` |
| `hcm-lifecycle-workflows:read` | `lms-course-delivery:read_course_completions` |
| `hcm-lifecycle-workflows:read` | `hcm-lifecycle-workflows:read_worker_change_requests` |
| `hcm-lifecycle-workflows:manage` | `itam-lifecycle:write_asset_lifecycle_events` |
| `itam-lifecycle:write_asset_lifecycle_events` | `itam-lifecycle:read_asset_lifecycle_events` |
| `hcm-lifecycle-workflows:manage` | `ats-pre-employee-record:write_pre_employees` |
| `ats-pre-employee-record:write_pre_employees` | `ats-pre-employee-record:read_pre_employees` |
| `hcm-lifecycle-workflows:manage` | `hcm-lifecycle-workflows:write_worker_change_requests` |
| `hcm-lifecycle-workflows:write_worker_change_requests` | `hcm-lifecycle-workflows:read_worker_change_requests` |
| `hcm-lifecycle-workflows:admin` | `ats-pre-employee-record:activate_pre_employee` |
| `hcm-lifecycle-workflows:admin` | `hcm-lifecycle-workflows:approved_worker_change_request` |
| `hcm-lifecycle-workflows:admin` | `ats-pre-employee-record:view_all_pre_employees` |
| `hcm-lifecycle-workflows:admin` | `ats-pre-employee-record:manage_all_pre_employees` |
| `hcm-lifecycle-workflows:admin` | `hcm-lifecycle-workflows:view_all_worker_change_requests` |
| `hcm-lifecycle-workflows:admin` | `hcm-lifecycle-workflows:manage_all_worker_change_requests` |

**Processes wired:**

| process_key | process_name | PCF code | PCF ID | level | description |
| --- | --- | --- | --- | --- | --- |
| `manage_maintain_employee_data` | Manage and maintain employee data | 7.7.3 | 10524 | 3 | Capturing and updating employee information and data and information on the employees. |

**RACI realization:**

| actor | kind | raci | process_key | realization |
| --- | --- | --- | --- | --- |
| `HR-PEOPLE-OPS-SPECIALIST` | persona | responsible | `manage_maintain_employee_data` | the gated entities' write tier |
| `HR-BUSINESS-PARTNER` | persona | accountable | `manage_maintain_employee_data` | grant gates [hcm-lifecycle-workflows:approved_worker_change_request] + the gated entities' write tier |
| `HR-HRIS-ADMIN` | persona | consulted | `manage_maintain_employee_data` | advisory read grant |
| `PEOPLE-MANAGER` | persona | informed | `manage_maintain_employee_data` | ⚠ no event wired |

### 9.2 Functional ownership and default grants

| responsibility | business function | default role | default tier |
| --- | --- | --- | --- |
| owner | Human Resources | `admin` | `:admin` |
| contributor | Finance | `manager` | `:manage` |
| contributor | IT Operations | `manager` | `:manage` |
| contributor | Legal | `manager` | `:manage` |
| contributor | Payroll | `manager` | `:manage` |
| consumer | Executive | `viewer` | `:read` |
| consumer | Governance, Risk and Compliance | `viewer` | `:read` |
