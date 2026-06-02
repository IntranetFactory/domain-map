---
artifact: semantic-blueprint
fact_sheet_version: "2.0"
system_name: LMS-PATHS
system_description: Learning Paths
system_slug: lms-paths
domain_modules:
  - lms-paths
domain_code: LMS
related_modules: [hcm-core-worker, hcm-org-positions, lms-course-delivery, lms-credentials, skills-mgmt-profile, swp-demand-forecast, talent-performance-mgmt]
created_at: 2026-06-01
---

# Learning Paths

## 1. Overview

### 1.1 Analyst overview

Authors and assigns sequenced learning paths inside the LMS. Masters learning_paths; consumes skill_profiles (mastered by SKILLS-MGMT after migration) to recommend paths against skill gaps.

## 2. Entity summary

| Name | Description |
| --- | --- |
| Curricula | Grouped paths and courses targeting a role, function, or compliance scope. Used by Workday and Cornerstone as the primary noun for role-based learning. |
| Learning Path Assignments | Path-to-learner assignment row distinct from course_enrollments; tracks overall path progress and completion percentage. |
| Learning Path Steps | Ordered step inside a learning path: pointer to a course, sub-path, or external resource with sequencing rules. |
| Learning Paths | Curated sequence of courses targeting a role, skill, or certification. Drives ordered enrolment and progress tracking across multiple courses. |
| Learning Plans | Personalized plan composed of multiple paths or courses, often manager-curated or AI-recommended against skill gaps. |
| Prerequisite Rules | Gating logic that controls path progression: required completions, scores, certifications, or competencies. |
| Certifications | Issued credential against a worker (internal certification, vendor cert, regulatory cert) with issue date, expiry, issuing body, and renewal rules. Drives recertification campaigns. |
| Course Enrollments | Per-learner per-course state record: assigned date, due date, attempts, status (not_started, in_progress, completed, expired), score. The operational unit of learning tracking. |
| Employees | Canonical record of a person currently or formerly employed by the organization. Carries identity (legal name, contact, IDs), employment metadata (start date, end date, employment type, country), and pointers to position, job profile, org unit, manager, and life-event history. The most multi-mastered data object in the catalog: HCM masters the core HR slice, Payroll masters the comp/withholding slice, and IGA masters the identity/access slice. Onboarding, PA, and Talent Management consume or contribute. |
| Job Profiles | Canonical role definition in the job catalog: title, family, level, responsibilities, required skills and competencies, pay range, FLSA classification. Distinct from positions (which are slots referencing a profile). Many positions share a single job profile. |
| Org Units | Node in the organizational hierarchy: division, business unit, department, team. Carries manager, cost center alignment, geographic scope, and parent/child relationships. HCM masters the operational hierarchy; EPM contributes the cost-center mapping (which would be Finance-mastered once a Finance/GL domain is loaded). |
| Positions | Approved slot in the org - a 'chair' with role definition, cost center, reporting line, location, and FTE allocation. Distinct from job_profiles (the catalog definition) and from employees (the person filling the slot). A position can be open, filled, or eliminated. SWP designs future positions via org_designs; HCM operationalizes them once approved. |
| Performance Goals | Individual goal or OKR with owner, period, metric, weight, status, alignment to organisational objectives. Reviewed within performance_reviews cycles. |
| Skill Profiles | Per-worker collection of skills with self-assessed and validated proficiency levels, derived from completed courses, certifications, performance signals, and inferred peer-comparison. The central artifact of HCM-side skills-cloud and talent-intelligence offerings. |
| Skills Gap Analyses | Comparison of current-state skills inventory vs future-state demand by role, level, and geography. Drives build/buy/borrow strategy: which gaps to close via training (LMS), external hires (ATS), or contingent workforce. Outputs feed both SWP scenarios and LMS curriculum decisions. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef embedded_master fill:#fff4cc,stroke:#c79100,color:#5b4500;
  classDef consumer fill:#e8def8,stroke:#7b1fa2,color:#3a155d;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  learning_paths["Learning Paths"]
  employees["Employees"]
  hcm_positions["Positions"]
  org_units["Org Units"]
  course_enrollments["Course Enrollments"]
  learner_certifications["Certifications"]
  job_profiles["Job Profiles"]
  skills_gap_analyses["Skills Gap Analyses"]
  performance_goals["Performance Goals"]
  skill_profiles["Skill Profiles"]
  learning_path_steps["Learning Path Steps"]
  curricula["Curricula"]
  learning_path_assignments["Learning Path Assignments"]
  learning_plans["Learning Plans"]
  prerequisite_rules["Prerequisite Rules"]
  users["Users"]
  learning_paths -->|"contains"| learning_path_steps
  curricula -->|"comprises (opt)"| learning_paths
  learning_paths -->|"assigned_via (opt)"| learning_path_assignments
  learning_plans -->|"composes (opt)"| learning_paths
  learning_path_steps -->|"gated_by (opt)"| prerequisite_rules
  org_units -->|"groups"| employees
  org_units -->|"contains"| hcm_positions
  hcm_positions -->|"is_filled_by (opt)"| employees
  job_profiles -->|"defines"| hcm_positions
  employees -->|"holds (opt)"| skill_profiles
  job_profiles -->|"maps_to (opt)"| skill_profiles
  employees -->|"enrolls_in (opt)"| course_enrollments
  skill_profiles -->|"updated by (opt)"| learner_certifications
  skill_profiles -->|"updated by (opt)"| course_enrollments
  job_profiles -->|"requires (opt)"| learning_paths
  job_profiles -->|"expects (opt)"| skill_profiles
  employees -->|"fills (opt)"| hcm_positions
  employees -->|"learns_via"| course_enrollments
  org_units -->|"rolls_up_to (opt)"| org_units
  skills_gap_analyses -->|"prescribes (opt)"| learning_paths
  users -->|"curates (opt)"| learning_paths
  users -->|"assigned_path"| learning_path_assignments
  users -->|"owns_plan"| learning_plans
  employees -->|"is_linked_to (opt)"| users
  users -->|"manages (opt)"| hcm_positions
  users -->|"leads (opt)"| org_units
  users -->|"owns (opt)"| job_profiles
  users -->|"enrolls in"| course_enrollments
  users -->|"assigns (opt)"| course_enrollments
  users -->|"holds"| learner_certifications
  users -->|"holds"| skill_profiles
  users -->|"owns"| performance_goals
  org_units -->|"has members (opt)"| users
  users -->|"prepares (opt)"| skills_gap_analyses
  class learning_paths master;
  class employees embedded_master;
  class hcm_positions embedded_master;
  class org_units embedded_master;
  class course_enrollments embedded_master;
  class learner_certifications embedded_master;
  class job_profiles embedded_master;
  class skills_gap_analyses consumer;
  class performance_goals consumer;
  class skill_profiles consumer;
  class learning_path_steps master;
  class curricula master;
  class learning_path_assignments master;
  class learning_plans master;
  class prerequisite_rules master;
  class users platform_builtin;
  style hcm_positions stroke-dasharray:5 5;
  style org_units stroke-dasharray:5 5;
  style job_profiles stroke-dasharray:5 5;
  style skill_profiles stroke-dasharray:5 5;
```

## 3. Entities catalog

| # | data_object | role | mastered in | label | necessity | pattern flags | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `curricula` (Curricula) | master | - | - | required | - | `:manage` _(pending)_ | - |
| 2 | `learning_path_assignments` (Learning Path Assignments) | master | - | - | required | personal_content | `:manage` _(pending)_ | - |
| 3 | `learning_path_steps` (Learning Path Steps) | master | - | - | required | - | `:manage` _(pending)_ | - |
| 4 | `learning_paths` (Learning Paths) | master | - | - | required | - | `:manage` _(pending)_ | - |
| 5 | `learning_plans` (Learning Plans) | master | - | - | required | personal_content | `:manage` _(pending)_ | - |
| 6 | `prerequisite_rules` (Prerequisite Rules) | master | - | - | required | - | `:manage` _(pending)_ | - |
| 7 | `learner_certifications` (Certifications) | embedded_master | `lms-credentials` | Credentials, Badges and Continuing Education | required | personal_content, submit_lock | `:manage` _(pending)_ | - |
| 8 | `course_enrollments` (Course Enrollments) | embedded_master | `lms-course-delivery` | Course Delivery | required | personal_content | `:manage` _(pending)_ | - |
| 9 | `employees` (Employees) | embedded_master | `hcm-core-worker` | Core Worker Record | required | personal_content | `:manage` _(pending)_ | - |
| 10 | `job_profiles` (Job Profiles) | embedded_master | `hcm-org-positions` | Organisation and Position Management | optional | single_approver | `:manage` _(pending)_ | - |
| 11 | `org_units` (Org Units) | embedded_master | `hcm-org-positions` | Organisation and Position Management | optional | - | `:manage` _(pending)_ | - |
| 12 | `hcm_positions` (Positions) | embedded_master | `hcm-org-positions` | Organisation and Position Management | optional | single_approver | `:manage` _(pending)_ | - |
| 13 | `performance_goals` (Performance Goals) | consumer | `talent-performance-mgmt` | Performance and Goal Management | required | personal_content | `:manage` _(pending)_ | - |
| 14 | `skill_profiles` (Skill Profiles) | consumer | `skills-mgmt-profile` | Worker Skill Profiles and Assessments | optional | personal_content | `:manage` _(pending)_ | - |
| 15 | `skills_gap_analyses` (Skills Gap Analyses) | consumer | `swp-demand-forecast` | Demand Forecast | required | - | `:manage` _(pending)_ | - |

## 4. Aliases and industry synonyms

_(no industry-scoped aliases or non-synonym alias types loaded for this scope; generic synonyms are omitted as common knowledge.)_

## 5. Relationships

### 5.1 Intra-scope edges

| from | verb | to | cardinality | kind | necessity | owner_side | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `learning_paths` | contains | `learning_path_steps` | one_to_many | composition | required | source | cascade | parent | - |
| `curricula` | comprises | `learning_paths` | many_to_many | association | optional | source | clear | reference | - |
| `learning_paths` | assigned_via | `learning_path_assignments` | one_to_many | reference | optional | target | clear | reference | - |
| `learning_plans` | composes | `learning_paths` | many_to_many | association | optional | source | clear | reference | - |
| `learning_path_steps` | gated_by | `prerequisite_rules` | many_to_many | association | optional | source | clear | reference | - |
| `org_units` | groups | `employees` | one_to_many | reference | required | source | restrict | reference | - |
| `org_units` | contains | `hcm_positions` | one_to_many | reference | required | source | restrict | reference | - |
| `hcm_positions` | is_filled_by | `employees` | one_to_one | reference | optional | target | clear | reference | - |
| `job_profiles` | defines | `hcm_positions` | one_to_many | reference | required | source | restrict | reference | - |
| `employees` | holds | `skill_profiles` | one_to_one | reference | optional | source | clear | reference | - |
| `job_profiles` | maps_to | `skill_profiles` | many_to_many | association | optional | source | clear | reference | - |
| `employees` | enrolls_in | `course_enrollments` | one_to_many | reference | optional | source | clear | reference | - |
| `skill_profiles` | updated by | `learner_certifications` | one_to_many | reference | optional | source | clear | reference | - |
| `skill_profiles` | updated by | `course_enrollments` | one_to_many | reference | optional | source | clear | reference | - |
| `job_profiles` | requires | `learning_paths` | many_to_many | association | optional | source | clear | reference | - |
| `job_profiles` | expects | `skill_profiles` | many_to_many | association | optional | source | clear | reference | - |
| `employees` | fills | `hcm_positions` | one_to_one | reference | optional | source | clear | reference | - |
| `employees` | learns_via | `course_enrollments` | one_to_many | reference | required | source | restrict | reference | - |
| `org_units` | rolls_up_to | `org_units` | one_to_many | reference | optional | source | clear | reference | - |
| `skills_gap_analyses` | prescribes | `learning_paths` | one_to_many | reference | optional | source | clear | reference | - |

### 5.2 Built-in edges (`users` and other platform built-ins)

| from | verb | to | cardinality | necessity | owner_side | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `users` | curates | `learning_paths` | one_to_many | optional | source | clear | reference | - |
| `users` | assigned_path | `learning_path_assignments` | one_to_many | required | source | restrict | reference | - |
| `users` | owns_plan | `learning_plans` | one_to_many | required | source | restrict | reference | - |
| `employees` | is_linked_to | `users` | one_to_one | optional | target | clear | reference | - |
| `users` | manages | `hcm_positions` | one_to_many | optional | source | clear | reference | - |
| `users` | leads | `org_units` | one_to_many | optional | source | clear | reference | - |
| `users` | owns | `job_profiles` | one_to_many | optional | source | clear | reference | - |
| `users` | enrolls in | `course_enrollments` | one_to_many | required | source | restrict | reference | - |
| `users` | assigns | `course_enrollments` | one_to_many | optional | source | clear | reference | - |
| `users` | holds | `learner_certifications` | one_to_many | required | source | restrict | reference | - |
| `users` | holds | `skill_profiles` | one_to_many | required | source | restrict | reference | - |
| `users` | owns | `performance_goals` | one_to_many | required | target | restrict | reference | - |
| `org_units` | has members | `users` | one_to_many | optional | target | clear | reference | - |
| `users` | prepares | `skills_gap_analyses` | one_to_many | optional | source | clear | reference | - |

### 5.3 Cross-scope edges

#### 5.3a Outbound from this scope's masters and contributors

_Edges this scope drives: the in-scope endpoint has `role` of `master` or `contributor`._

| from | verb | to | cardinality | necessity | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `learning_path_steps` | references | `courses` | one_to_many | optional | clear | reference | - |
| `courses` | sequenced_into | `learning_paths` | many_to_many | optional | clear | reference | - |

#### 5.3b Context edges on embedded shells and consumed entities

_Edges the canonical owner drives, shown for context: the in-scope endpoint has `role` of `embedded_master`, `consumer`, or `derived`._

<details>
<summary>77 context edges</summary>

| from | verb | to | cardinality | necessity | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `employees` | triggers | `iga_provisioning_events` | one_to_many | optional | clear | reference | - |
| `employees` | finalized by | `onboarding_document_collections` | one_to_many | optional | clear | reference | - |
| `pre_employees` | promotes to | `employees` | one_to_one | required | restrict | reference | - |
| `legal_holds` | identifies_custodians_from | `employees` | many_to_many | optional | clear | reference | - |
| `legal_advice_records` | references | `employees` | many_to_many | optional | clear | reference | - |
| `employees` | is host for | `host_assignments` | one_to_many | required | restrict | reference | - |
| `job_profiles` | expects | `competency_models` | one_to_many | optional | clear | reference | - |
| `skill_profiles` | updated by | `skill_assessments` | one_to_many | optional | clear | reference | - |
| `skill_profiles` | updated by | `skill_endorsements` | one_to_many | optional | clear | reference | - |
| `skill_profiles` | updated by | `skill_inference_runs` | one_to_many | optional | clear | reference | - |
| `skill_profiles` | assessed against | `competency_models` | many_to_many | optional | clear | reference | - |
| `competency_models` | compared via | `skills_gap_analyses` | one_to_many | optional | clear | reference | - |
| `skill_profiles` | compared via | `fit_scores` | one_to_many | required | restrict | reference | - |
| `skill_profiles` | feeds | `mobility_recommendations` | one_to_many | required | restrict | reference | - |
| `course_enrollments` | yields | `course_completions` | one_to_many | optional | cascade | parent | - |
| `certification_definitions` | instantiated_as | `learner_certifications` | one_to_many | required | restrict | reference | - |
| `certificate_templates` | renders | `learner_certifications` | one_to_many | optional | clear | reference | - |
| `automated_enrollment_rules` | creates | `course_enrollments` | one_to_many | optional | clear | reference | - |
| `employees` | requests | `absence_requests` | one_to_many | optional | clear | reference | - |
| `employees` | signs | `employment_contracts` | one_to_many | required | cascade | parent | - |
| `employees` | generates | `employment_events` | one_to_many | required | cascade | parent | - |
| `cost_centers` | funds | `org_units` | one_to_many | required | restrict | reference | - |
| `employees` | triggers | `asset_lifecycle_events` | one_to_many | optional | clear | reference | - |
| `org_units` | engages | `contingent_workers` | one_to_many | optional | clear | reference | - |
| `org_units` | is_scored_by | `engagement_drivers` | one_to_many | optional | clear | reference | - |
| `org_units` | is_measured_by | `people_kpis` | one_to_many | optional | clear | reference | - |
| `employees` | triggers | `service_requests` | one_to_many | optional | clear | reference | - |
| `org_units` | triggers | `iga_entitlement_definitions` | one_to_many | optional | clear | reference | - |
| `employees` | triggers | `pay_runs` | one_to_many | optional | clear | reference | - |
| `hcm_positions` | spawns | `job_requisitions` | one_to_many | optional | clear | reference | - |
| `job_profiles` | feeds | `job_postings` | one_to_many | optional | clear | reference | - |
| `job_profiles` | maps_to | `courses` | many_to_many | optional | clear | reference | - |
| `employees` | becomes | `career_aspirations` | one_to_one | optional | clear | reference | - |
| `employees` | becomes | `work_shifts` | one_to_many | optional | clear | reference | - |
| `employees` | becomes | `compensation_statements` | one_to_one | optional | clear | reference | - |
| `salary_bands` | anchors | `hcm_positions` | one_to_many | optional | clear | reference | - |
| `salary_bands` | bands | `job_profiles` | one_to_many | optional | clear | reference | - |
| `employees` | triggers | `benefit_enrollments` | one_to_many | optional | clear | reference | - |
| `org_units` | maps_to | `cost_centers` | one_to_one | optional | clear | reference | - |
| `employees` | triggers | `corporate_cards` | one_to_many | optional | clear | reference | - |
| `employees` | spawns | `onboarding_journeys` | one_to_one | optional | clear | reference | - |
| `employees` | spawns | `hr_cases` | one_to_many | optional | clear | reference | - |
| `employees` | feeds | `headcount_plans` | one_to_many | optional | clear | reference | - |
| `employees` | feeds | `agency_time_entries` | one_to_many | optional | clear | reference | - |
| `employees` | onboarded by | `onboarding_journeys` | one_to_many | required | restrict | reference | - |
| `onboarding_tasks` | spawns | `course_enrollments` | one_to_many | optional | clear | reference | - |
| `courses` | enrolled_via | `course_enrollments` | one_to_many | required | restrict | reference | - |
| `course_enrollments` | produces | `learning_records` | one_to_many | required | cascade | parent | - |
| `courses` | grants | `learner_certifications` | one_to_many | optional | clear | reference | - |
| `hcm_positions` | requires | `compliance_assignments` | one_to_many | optional | clear | reference | - |
| `org_units` | sponsors | `compliance_assignments` | one_to_many | optional | clear | reference | - |
| `cost_centers` | funds | `course_enrollments` | one_to_many | optional | clear | reference | - |
| `employees` | reflects | `learning_records` | one_to_many | optional | clear | reference | - |
| `employees` | reflected on | `compliance_assignments` | one_to_many | optional | clear | reference | - |
| `skill_profiles` | feeds | `candidates` | one_to_many | optional | clear | reference | - |
| `skill_profiles` | feeds | `career_aspirations` | one_to_many | optional | clear | reference | - |
| `course_enrollments` | updates | `career_aspirations` | one_to_many | optional | clear | reference | - |
| `employees` | declares | `life_events` | one_to_many | optional | clear | reference | - |
| `org_units` | sponsors | `benefit_plans` | many_to_many | optional | clear | reference | - |
| `employees` | updated by | `life_events` | one_to_many | optional | clear | reference | - |
| `survey_campaigns` | targets | `org_units` | many_to_many | optional | clear | reference | - |
| `org_units` | owns | `action_plans` | one_to_many | optional | clear | reference | - |
| `employees` | submits | `survey_responses` | one_to_many | optional | clear | reference | - |
| `employees` | flagged on | `engagement_drivers` | one_to_many | optional | clear | reference | - |
| `employees` | reflected on | `engagement_drivers` | one_to_many | optional | clear | reference | - |
| `employees` | raises | `hr_cases` | one_to_many | required | restrict | reference | - |
| `employees` | updated by | `hr_cases` | one_to_many | optional | clear | reference | - |
| `case_categories` | drives | `employees` | one_to_many | optional | clear | reference | - |
| `contingent_workers` | reviewed_against | `employees` | one_to_one | optional | clear | reference | - |
| `candidates` | becomes | `employees` | one_to_one | required | restrict | reference | - |
| `employees` | enrolls_in | `benefit_enrollments` | one_to_many | required | restrict | reference | - |
| `survey_campaigns` | targets | `employees` | many_to_many | optional | clear | reference | - |
| `performance_reviews` | evaluates | `performance_goals` | one_to_many | optional | clear | reference | - |
| `performance_goals` | aligns_to | `okr_objectives` | many_to_many | optional | clear | reference | - |
| `position_demand_forecasts` | grounds | `skills_gap_analyses` | one_to_many | optional | clear | reference | - |
| `workforce_scenarios` | drives | `hcm_positions` | one_to_many | required | restrict | reference | - |
| `org_designs` | proposes | `hcm_positions` | one_to_many | required | restrict | reference | - |

</details>

## 6. Cross-domain context

### 6.1 Master consumers (other modules / domains that embed this scope's masters)


### 6.2 Outbound handoffs (events this scope publishes)

| source module | target domain | target module | trigger_event | transition | payload | integration | friction | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LMS-PATHS | LMS | LMS-COURSE-DELIVERY | `learning_path.assigned` | _(state_change)_ | `learning_paths` | lifecycle_progression | low | - |

### 6.3 Inbound handoffs (events this scope reacts to)

_(no inbound `handoffs` whose payload is in this scope.)_

### 6.4 Master providers (modules / domains that own masters this scope embeds)

| data_object | role here | necessity | canonical owner(s) | slice notes |
| --- | --- | --- | --- | --- |
| `course_enrollments` | embedded_master | required | LMS-COURSE-DELIVERY (LMS) | - |
| `employees` | embedded_master | required | HCM-CORE-WORKER (HCM), PAYROLL (Payroll Management), IGA (Identity Governance and Administration), MDM (Master Data Management) | - |
| `hcm_positions` | embedded_master | optional | HCM-ORG-POSITIONS (HCM) | - |
| `job_profiles` | embedded_master | optional | HCM-ORG-POSITIONS (HCM) | - |
| `learner_certifications` | embedded_master | required | LMS-CREDENTIALS (LMS) | - |
| `org_units` | embedded_master | optional | HCM-ORG-POSITIONS (HCM) | - |
| `performance_goals` | consumer | required | TALENT-PERFORMANCE-MGMT (TALENT-MGMT) | - |
| `skill_profiles` | consumer | optional | SKILLS-MGMT-PROFILE (SKILLS-MGMT) | - |
| `skills_gap_analyses` | consumer | required | SWP-DEMAND-FORECAST (SWP) | - |

## 7. Lifecycle states

### `course_enrollments` (Course Enrollment)

_This scope holds `course_enrollments` as **embedded_master**; the canonical state machine is owned by `LMS-COURSE-DELIVERY`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `enrolled` | ✓ | - | - | - | Learner enrolled in the course but has not started. |
| 2 | `in_progress` | - | - | - | - | Learner has begun the course content or activities. |
| 3 | `completed` | - | ✓ | ✓ | `lms-course-delivery:complete` | Learner met all completion criteria with a passing score. |
| 4 | `failed` | - | ✓ | ✓ | `lms-course-delivery:fail` | Learner did not meet the passing criteria within allowed attempts. |
| 5 | `expired` | - | ✓ | ✓ | `lms-course-delivery:expire` | Enrollment closed unmet at the due date or content expiry. |
| 6 | `withdrawn` | - | ✓ | ✓ | `lms-course-delivery:withdraw` | Learner withdrew or was unenrolled before completion. |

### `curricula` (Curriculum)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | - | - | - |
| 2 | `published` | - | - | ✓ | `lms-paths:publish` | - |
| 3 | `retired` | - | ✓ | ✓ | `lms-paths:retire` | - |

### `employees` (Employee)

_This scope holds `employees` as **embedded_master**; the canonical state machine is owned by `HCM-CORE-WORKER`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | - | - | Pre-hire stub created during requisition or onboarding handoff; not yet a worker of record. |
| 2 | `active` | - | - | ✓ | `hcm-core-worker:active_employee` | Worker is currently employed and appears in headcount, payroll eligibility, and directory feeds. |
| 3 | `on_leave` | - | - | ✓ | `hcm-core-worker:on_leave_employee` | Employee is on approved leave (parental, medical, sabbatical); active record but suppressed from some downstream feeds. |
| 4 | `suspended` | - | - | ✓ | `hcm-core-worker:suspended_employee` | Employment temporarily halted (investigation, disciplinary); pay and access may be paused. |
| 5 | `terminated` | - | ✓ | ✓ | `hcm-core-worker:terminated_employee` | Employment ended (voluntary or involuntary); final pay processed, access deprovisioned. |

### `hcm_positions` (Position)

_This scope holds `hcm_positions` as **embedded_master**; the canonical state machine is owned by `HCM-ORG-POSITIONS`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `proposed` | ✓ | - | - | - | Position has been designed but not yet approved against the headcount plan. |
| 2 | `approved` | - | - | ✓ | `hcm-org-positions:approved_position` | Cleared by headcount/finance owner; eligible to spawn a requisition. |
| 3 | `open` | - | - | ✓ | `hcm-org-positions:open_position` | Approved and actively being recruited against; not yet filled. |
| 4 | `filled` | - | - | ✓ | `hcm-org-positions:filled_position` | An employee occupies the position. |
| 5 | `frozen` | - | - | ✓ | `hcm-org-positions:frozen_position` | Temporarily not fillable (hiring freeze, budget hold); retains the slot. |
| 6 | `eliminated` | - | ✓ | ✓ | `hcm-org-positions:eliminated_position` | Removed from the org structure permanently. |

### `job_profiles` (Job Profile)

_This scope holds `job_profiles` as **embedded_master**; the canonical state machine is owned by `HCM-ORG-POSITIONS`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | - | - | Profile is being authored or revised; not yet available for position assignment. |
| 2 | `approved` | - | - | ✓ | `hcm-org-positions:approved_job_profile` | Cleared by the catalog owner; ready to be referenced by positions and postings. |
| 3 | `active` | - | - | ✓ | `hcm-org-positions:active_job_profile` | In production use; positions and postings can reference it. |
| 4 | `retired` | - | ✓ | ✓ | `hcm-org-positions:retired_job_profile` | No longer assignable to new positions; historical references preserved. |

### `learner_certifications` (Certification)

_This scope holds `learner_certifications` as **embedded_master**; the canonical state machine is owned by `LMS-CREDENTIALS`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `issued` | ✓ | - | ✓ | `lms-compliance-training:issue` | Credential awarded to the learner with issue and expiry dates. |
| 2 | `active` | - | - | - | - | Credential in force and valid for compliance or role requirements. |
| 3 | `renewing` | - | - | - | - | Recertification campaign engaged before expiry. |
| 4 | `renewed` | - | - | ✓ | `lms-compliance-training:renew` | Credential renewed with a fresh validity window. |
| 5 | `expired` | - | ✓ | - | - | Credential past its expiry date and no longer valid. |
| 6 | `revoked` | - | ✓ | ✓ | `lms-compliance-training:revoke` | Credential withdrawn by the issuing body or L&D for cause. |

### `learning_path_assignments` (Learning Path Assignment)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `assigned` | ✓ | - | - | - | - |
| 2 | `in_progress` | - | - | - | - | - |
| 3 | `completed` | - | ✓ | ✓ | `lms-paths:complete` | - |
| 4 | `expired` | - | ✓ | - | - | - |

### `learning_paths` (Learning Path)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | - | - | Path being curated by L&D with course sequencing. |
| 2 | `published` | - | - | ✓ | `lms-paths:publish` | Path released and assignable to roles, skills, or audiences. |
| 3 | `retired` | - | ✓ | ✓ | `lms-paths:retire` | Path removed from new assignments and kept for historical reference. |

### `learning_plans` (Learning Plan)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | - | - | - |
| 2 | `active` | - | - | ✓ | `lms-paths:activate` | - |
| 3 | `completed` | - | ✓ | ✓ | `lms-paths:complete` | - |
| 4 | `archived` | - | ✓ | ✓ | `lms-paths:archive` | - |

### `org_units` (Org Unit)

_This scope holds `org_units` as **embedded_master**; the canonical state machine is owned by `HCM-ORG-POSITIONS`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | - | - | Org unit defined as part of a future structure; not yet operational. |
| 2 | `active` | - | - | ✓ | `hcm-org-positions:active_org_unit` | Operational unit; carries headcount, cost-center linkage, and reporting lines. |
| 3 | `reorganized` | - | ✓ | ✓ | `hcm-org-positions:reorganized_org_unit` | Unit folded into or replaced by a new structure; references remain for history. |
| 4 | `closed` | - | ✓ | ✓ | `hcm-org-positions:closed_org_unit` | Unit dissolved; no employees or positions reside in it. |

### `performance_goals` (Performance Goal)

_This scope holds `performance_goals` as **consumer**; the canonical state machine is owned by `TALENT-PERFORMANCE-MGMT`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `drafted` | ✓ | - | - | - | Goal authored by employee or manager. |
| 2 | `approved` | - | - | ✓ | `talent-performance-mgmt:approve_performance_goal` | Manager approves the goal; it becomes part of the cycle. |
| 3 | `in_progress` | - | - | - | - | Goal is being worked. |
| 4 | `completed` | - | - | ✓ | `talent-performance-mgmt:complete_performance_goal` | Outcome recorded; counts toward review rating. |
| 5 | `cancelled` | - | ✓ | ✓ | `talent-performance-mgmt:cancel_performance_goal` | Goal abandoned (role change, priority shift, etc.). |

### `skill_profiles` (Skill Profile)

_This scope holds `skill_profiles` as **consumer**; the canonical state machine is owned by `SKILLS-MGMT-PROFILE`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `initialized` | ✓ | - | - | - | Profile seeded for the worker from role and prior signals. |
| 2 | `self_assessed` | - | - | - | - | Worker has captured self-assessed proficiency levels. |
| 3 | `validated` | - | - | ✓ | `skills-mgmt-profile:validate` | Manager or skills owner validated proficiency entries. |
| 4 | `inactive` | - | ✓ | ✓ | `skills-mgmt-profile:deactivate` | Profile retired (worker exit or role-change reset). |

### `skills_gap_analyses` (Skills Gap Analysis)

_This scope holds `skills_gap_analyses` as **consumer**; the canonical state machine is owned by `SWP-DEMAND-FORECAST`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | `draft` | ✓ | - | - | - | Analysis under construction. |
| 20 | `published` | - | - | ✓ | `swp-demand-forecast:publish_skills_gap_analysis` | Analysis published; LMS curricula refresh, ATS sourcing prioritization shifts. |
| 90 | `archived` | - | ✓ | - | - | Analysis superseded by a later cycle. |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `lms-paths:read` | baseline-read | Read access to every entity in the module | ✓ |
| `lms-paths:manage` | baseline-manage | Edit operational records | ✓ |
| `lms-paths:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `lms-paths:publish` | workflow-gate (lifecycle) | Transition `learning_paths` into state `published` | ✓ |
| `lms-paths:retire` | workflow-gate (lifecycle) | Transition `learning_paths` into state `retired` | ✓ |
| `lms-paths:publish` | workflow-gate (lifecycle) | Transition `curricula` into state `published` | ✓ |
| `lms-paths:retire` | workflow-gate (lifecycle) | Transition `curricula` into state `retired` | ✓ |
| `lms-paths:complete` | workflow-gate (lifecycle) | Transition `learning_path_assignments` into state `completed` | ✓ |
| `lms-paths:activate` | workflow-gate (lifecycle) | Transition `learning_plans` into state `active` | ✓ |
| `lms-paths:complete` | workflow-gate (lifecycle) | Transition `learning_plans` into state `completed` | ✓ |
| `lms-paths:archive` | workflow-gate (lifecycle) | Transition `learning_plans` into state `archived` | ✓ |
| `lms-paths:view_all_learning_path_assignments` | override (personal_content) | View all `learning_path_assignments` rows beyond row-scope | ✓ |
| `lms-paths:manage_all_learning_path_assignments` | override (personal_content) | Manage all `learning_path_assignments` rows beyond row-scope | ✓ |
| `lms-paths:view_all_learning_plans` | override (personal_content) | View all `learning_plans` rows beyond row-scope | ✓ |
| `lms-paths:manage_all_learning_plans` | override (personal_content) | Manage all `learning_plans` rows beyond row-scope | ✓ |

### 8.2 Business rules

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `learning_path_assignment_edit_scope` | `learning_path_assignments` | has_personal_content | Row-scope by default; override via `lms-paths:view_all_learning_path_assignments` / `lms-paths:manage_all_learning_path_assignments` |
| `learning_plan_edit_scope` | `learning_plans` | has_personal_content | Row-scope by default; override via `lms-paths:view_all_learning_plans` / `lms-paths:manage_all_learning_plans` |
