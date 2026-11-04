---
artifact: semantic-blueprint
version: "3.1"
license: MIT
system_name: Course Delivery
tagline: Build, publish, and deliver online courses, then track every enrollment through to completion.
description: Create courses from lessons, content assets, and assessments, and publish new versions when material changes. Enroll learners, deliver self-paced training in the browser, and grade quizzes and exams as they go. Watch progress and completion in real time, and keep a clean record of who finished what.
system_slug: lms-course-delivery
domain_modules:
  - lms-course-delivery
domain_code: LMS
icon_name: graduation-cap
related_modules: [ats-candidate-crm, ats-recruitment-pipeline, ben-enrollment, comp-planning, emp-exp-continuous-listen, fin-gl-close, hcm-core-worker, hcm-lifecycle-workflows, hcm-org-positions, hrsd-case-mgmt, iga-access-request, lms-automation, lms-compliance-training, lms-credentials, lms-ilt-delivery, lms-paths, pa-predictive-models, payroll-run, psa-project-delivery, psa-resource-mgmt, skills-mgmt-profile, talent-performance-mgmt, talent-succession-career, training-records-starter]
persona: [HR-BUSINESS-PARTNER, HR-HRIS-ADMIN, HR-ORG-DESIGN-ANALYST, HR-PEOPLE-OPS-SPECIALIST, LD-INSTRUCTIONAL-DESIGNER, LD-INSTRUCTOR, LD-LEARNING-ADMIN, PEOPLE-MANAGER]
supports_raci: false
created_at: 2026-11-04
---

# Course Delivery

## 1. Overview

The core LMS workflow: course authoring, content delivery, enrollment, completion tracking, and transcript posting. Masters `courses`, `course_enrollments`, `learning_records`. Realizes COURSE-AUTHOR and CONTENT-DELIVERY capabilities. The backbone module every LMS deployment installs first; the other LMS modules embedded_master courses to reference content.

## 2. Entity summary

| Name | data_object | Description |
| --- | --- | --- |
| Assessment Attempts | `assessment_attempts` | Per-learner, per-attempt records of an assessment: start time, score, pass or fail, and time on task, retained as compliance evidence. |
| Assessment Questions | `assessment_questions` | Item-bank questions with their stem, answer choices, scoring, and metadata for randomization. |
| cmi5 Assignable Units | `cmi5_assignable_units` | Assignable units in the cmi5 standard, launched against a learning record store as the modern successor to SCORM. |
| Course Assessments | `course_assessments` | Quiz or exam definitions tied to a course or lesson, with passing score and attempt policy. |
| Course Catalogs | `course_catalogs` | Scoped catalog views surfacing a subset of courses to a specific audience, branch, or domain. |
| Course Categories | `course_categories` | Hierarchical taxonomy for browsing and reporting on the course catalog. |
| Course Completions | `course_completions` | Terminal completion records per learner per course version, marking the course as finished. |
| Course Discussions | `course_discussions` | Forum-style discussion threads attached to a course or lesson, supporting collaborative learning. |
| Course Enrollments | `course_enrollments` | Per-learner per-course records tracking assigned and due dates, attempts, status, and score. |
| Course Modules | `course_modules` | Units within a course that group related lessons, supporting completion tracking below course level. |
| Course Ratings | `course_ratings` | Numeric ratings per learner per course, feeding aggregate analytics. |
| Course Reviews | `course_reviews` | Learner-authored qualitative reviews of a course written after completion. |
| Course Tags | `course_tags` | Free-form tags alongside categories that support faceted search of courses. |
| Course Versions | `course_versions` | Versioned snapshots of a course's content, required to record which version each learner completed for compliance. |
| Courses | `courses` | Learning units such as e-learning modules, videos, live sessions, or blended programs, with format, duration, and prerequisites. |
| Learning Content Assets | `learning_content_assets` | Reusable content assets (video, PDF, image, audio) referenced by lessons and modules. |
| Learning Records | `learning_records` | Granular completion events for a course or activity (actor, verb, object, result, timestamp) feeding skill profiles and certifications. |
| Lessons | `lessons` | Individual lessons inside a course module: a video, document, SCORM block, or live activity. |
| LRS Statement Endpoints | `lrs_statement_endpoints` | External Learning Record Store endpoints that xAPI learning statements are routed to. |
| Observation Checklist Results | `observation_checklist_results` | Scored learner results against observation checklists, with observer signoff. |
| Observation Checklists | `observation_checklists` | On-the-job competency checklists that an observer scores against for field-skill assessment. |
| Question Banks | `question_banks` | Reusable pools of assessment questions independent of any single test, drawn from for randomized quizzes and recertification exams. |
| Quiz Responses | `quiz_responses` | Item-level learner responses to quiz questions, captured for per-question review and psychometric analysis. |
| SCORM Packages | `scorm_packages` | Imported e-learning content packages in standard formats, carrying the content manifest and runtime tracking state. |
| xAPI Statements | `xapi_statements` | Experience-API event log entries capturing actor-verb-object learning activity inside or outside the learning system. |
| Cost Centers | `cost_centers` | Organizational units for cost allocation, with code, manager, hierarchy, and currency, driving variance and departmental reporting. |
| Employees | `employees` | Canonical records of people currently or formerly employed, carrying identity, employment metadata, and relationships to position, manager, and org unit. |
| Org Units | `org_units` | Nodes in the organizational hierarchy such as divisions, departments, and teams, with manager, cost center alignment, geographic scope, and parent-child relationships. |
| Positions | `hcm_positions` | Approved org slots with role definition, cost center, reporting line, location, and FTE allocation. Each can be open, filled, or eliminated. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef embedded_master fill:#fff4cc,stroke:#c79100,color:#5b4500;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  employees["Employees"]
  hcm_positions["Positions"]
  org_units["Org Units"]
  courses["Courses"]
  course_enrollments["Course Enrollments"]
  learning_records["Learning Records"]
  cost_centers["Cost Centers"]
  course_versions["Course Versions"]
  course_modules["Course Modules"]
  lessons["Lessons"]
  learning_content_assets["Learning Content Assets"]
  scorm_packages["SCORM Packages"]
  xapi_statements["xAPI Statements"]
  course_completions["Course Completions"]
  course_assessments["Course Assessments"]
  assessment_questions["Assessment Questions"]
  assessment_attempts["Assessment Attempts"]
  quiz_responses["Quiz Responses"]
  course_categories["Course Categories"]
  course_tags["Course Tags"]
  course_catalogs["Course Catalogs"]
  course_discussions["Course Discussions"]
  course_reviews["Course Reviews"]
  course_ratings["Course Ratings"]
  question_banks["Question Banks"]
  cmi5_assignable_units["cmi5 Assignable Units"]
  lrs_statement_endpoints["LRS Statement Endpoints"]
  observation_checklists["Observation Checklists"]
  observation_checklist_results["Observation Checklist Results"]
  users["Users"]
  org_units -->|"groups"| employees
  org_units -->|"contains"| hcm_positions
  cost_centers -->|"funds"| org_units
  employees -->|"enrolls_in"| course_enrollments
  org_units -->|"maps_to"| cost_centers
  employees -->|"fills"| hcm_positions
  courses -->|"enrolled_via"| course_enrollments
  course_enrollments -->|"produces"| learning_records
  employees -->|"learns_via"| course_enrollments
  cost_centers -->|"funds"| course_enrollments
  employees -->|"reflects"| learning_records
  org_units -->|"parent of"| org_units
  courses -->|"has_version"| course_versions
  course_versions -->|"contains"| course_modules
  course_modules -->|"contains"| lessons
  lessons -->|"uses"| learning_content_assets
  course_versions -->|"imports"| scorm_packages
  course_versions -->|"completed_via"| course_completions
  course_enrollments -->|"yields"| course_completions
  course_assessments -->|"contains"| assessment_questions
  course_assessments -->|"attempted_by"| assessment_attempts
  assessment_attempts -->|"produces"| quiz_responses
  courses -->|"classified_as"| course_categories
  courses -->|"tagged_with"| course_tags
  course_catalogs -->|"lists"| courses
  courses -->|"reviewed_via"| course_reviews
  courses -->|"rated_via"| course_ratings
  courses -->|"discussed_in"| course_discussions
  users -->|"represents"| employees
  users -->|"manages"| hcm_positions
  users -->|"leads"| org_units
  users -->|"owns"| cost_centers
  users -->|"authors"| courses
  users -->|"owns"| courses
  users -->|"enrolls in"| course_enrollments
  users -->|"assigns"| course_enrollments
  users -->|"earns"| learning_records
  org_units -->|"has members"| users
  users -->|"attempts"| assessment_attempts
  users -->|"answers"| quiz_responses
  users -->|"completes"| course_completions
  users -->|"posts_in"| course_discussions
  users -->|"authors"| course_reviews
  users -->|"rates_via"| course_ratings
  class employees embedded_master;
  class hcm_positions embedded_master;
  class org_units embedded_master;
  class courses master;
  class course_enrollments master;
  class learning_records master;
  class cost_centers embedded_master;
  class course_versions master;
  class course_modules master;
  class lessons master;
  class learning_content_assets master;
  class scorm_packages master;
  class xapi_statements master;
  class course_completions master;
  class course_assessments master;
  class assessment_questions master;
  class assessment_attempts master;
  class quiz_responses master;
  class course_categories master;
  class course_tags master;
  class course_catalogs master;
  class course_discussions master;
  class course_reviews master;
  class course_ratings master;
  class question_banks master;
  class cmi5_assignable_units master;
  class lrs_statement_endpoints master;
  class observation_checklists master;
  class observation_checklist_results master;
  class users platform_builtin;
  style hcm_positions stroke-dasharray:5 5;
  style org_units stroke-dasharray:5 5;
  style cost_centers stroke-dasharray:5 5;
  style question_banks stroke-dasharray:5 5;
  style cmi5_assignable_units stroke-dasharray:5 5;
  style lrs_statement_endpoints stroke-dasharray:5 5;
  style observation_checklists stroke-dasharray:5 5;
  style observation_checklist_results stroke-dasharray:5 5;
```

## 3. Entities catalog

| # | data_object | catalog code | singular | plural | held_as | mastered in | mastered label | install_optional | personal_content | entity_type | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `assessment_attempts` | `assessment_attempts` | Assessment Attempt | Assessment Attempts | master | - | - | - | yes | operational_workflow | `:manage` | - |
| 2 | `assessment_questions` | `assessment_questions` | Assessment Question | Assessment Questions | master | - | - | - | - | catalog | `:admin` | - |
| 3 | `cmi5_assignable_units` | `cmi5_assignable_units` | cmi5 Assignable Unit | cmi5 Assignable Units | master | - | - | yes | - | catalog | `:admin` | - |
| 4 | `course_assessments` | `course_assessments` | Course Assessment | Course Assessments | master | - | - | - | - | operational_workflow | `:manage` | - |
| 5 | `course_catalogs` | `course_catalogs` | Course Catalog | Course Catalogs | master | - | - | - | - | catalog | `:admin` | - |
| 6 | `course_categories` | `course_categories` | Course Category | Course Categories | master | - | - | - | - | catalog | `:admin` | - |
| 7 | `course_completions` | `course_completions` | Course Completion | Course Completions | master | - | - | - | yes | operational_record | `:manage` | - |
| 8 | `course_discussions` | `course_discussions` | Course Discussion | Course Discussions | master | - | - | - | yes | operational_record | `:manage` | - |
| 9 | `course_enrollments` | `course_enrollments` | Course Enrollment | Course Enrollments | master | - | - | - | yes | operational_workflow | `:manage` | - |
| 10 | `course_modules` | `course_modules` | Course Module | Course Modules | master | - | - | - | - | catalog | `:admin` | - |
| 11 | `course_ratings` | `course_ratings` | Course Rating | Course Ratings | master | - | - | - | yes | operational_record | `:manage` | - |
| 12 | `course_reviews` | `course_reviews` | Course Review | Course Reviews | master | - | - | - | yes | operational_record | `:manage` | - |
| 13 | `course_tags` | `course_tags` | Course Tag | Course Tags | master | - | - | - | - | catalog | `:admin` | - |
| 14 | `course_versions` | `course_versions` | Course Version | Course Versions | master | - | - | - | - | operational_workflow | `:manage` | - |
| 15 | `courses` | `courses` | Course | Courses | master | - | - | - | - | operational_workflow | `:manage` | - |
| 16 | `learning_content_assets` | `learning_content_assets` | Learning Content Asset | Learning Content Assets | master | - | - | - | - | catalog | `:admin` | - |
| 17 | `learning_records` | `learning_records` | Learning Record | Learning Records | master | - | - | - | yes | operational_record | `:manage` | - |
| 18 | `lessons` | `lessons` | Lesson | Lessons | master | - | - | - | - | catalog | `:admin` | - |
| 19 | `lrs_statement_endpoints` | `lrs_statement_endpoints` | LRS Statement Endpoint | LRS Statement Endpoints | master | - | - | yes | - | catalog | `:admin` | - |
| 20 | `observation_checklist_results` | `observation_checklist_results` | Observation Checklist Result | Observation Checklist Results | master | - | - | yes | yes | operational_workflow | `:manage` | - |
| 21 | `observation_checklists` | `observation_checklists` | Observation Checklist | Observation Checklists | master | - | - | yes | - | catalog | `:admin` | - |
| 22 | `question_banks` | `question_banks` | Question Bank | Question Banks | master | - | - | yes | - | catalog | `:admin` | - |
| 23 | `quiz_responses` | `quiz_responses` | Quiz Response | Quiz Responses | master | - | - | - | yes | operational_record | `:manage` | - |
| 24 | `scorm_packages` | `scorm_packages` | SCORM Package | SCORM Packages | master | - | - | - | - | operational_workflow | `:manage` | - |
| 25 | `xapi_statements` | `xapi_statements` | xAPI Statement | xAPI Statements | master | - | - | - | yes | operational_record | `:manage` | - |
| 26 | `cost_centers` | `cost_centers` | Cost Center | Cost Centers | embedded_master | `fin-gl-close` | General Ledger and Close | yes | - | catalog | `:admin` | - |
| 27 | `employees` | `employees` | Employee | Employees | embedded_master | `hcm-core-worker` | Core Worker Record | - | yes | operational_workflow | `:manage` | - |
| 28 | `org_units` | `org_units` | Org Unit | Org Units | embedded_master | `hcm-org-positions` | Organization and Position Management | yes | - | operational_workflow | `:manage` | - |
| 29 | `hcm_positions` | `hcm_positions` | Position | Positions | embedded_master | `hcm-org-positions` | Organization and Position Management | yes | - | operational_workflow | `:manage` | - |

## 4. Aliases and industry synonyms

_(none: no industry-scoped aliases for this scope)_

## 5. Relationships

_`field_required` applies only when both entities are installed. It never makes an entity required._

### 5.1 Relationships between entities in this blueprint

| from | verb | to | cardinality | kind | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `org_units` | groups | `employees` | one_to_many | reference | yes | restrict | reference | - |
| `org_units` | contains | `hcm_positions` | one_to_many | reference | yes | restrict | reference | - |
| `cost_centers` | funds | `org_units` | one_to_many | reference | yes | restrict | reference | - |
| `employees` | enrolls_in | `course_enrollments` | one_to_many | reference | no | clear | reference | - |
| `org_units` | maps_to | `cost_centers` | one_to_one | reference | no | clear | reference | - |
| `employees` | fills | `hcm_positions` | one_to_one | reference | no | clear | reference | - |
| `courses` | enrolled_via | `course_enrollments` | one_to_many | reference | yes | restrict | reference | - |
| `course_enrollments` | produces | `learning_records` | one_to_many | composition | yes | cascade | parent | - |
| `employees` | learns_via | `course_enrollments` | one_to_many | reference | yes | restrict | reference | - |
| `cost_centers` | funds | `course_enrollments` | one_to_many | reference | no | clear | reference | - |
| `employees` | reflects | `learning_records` | one_to_many | reference | no | clear | reference | - |
| `org_units` | parent of | `org_units` | one_to_many | reference | no | clear | reference | - |
| `courses` | has_version | `course_versions` | one_to_many | composition | yes | cascade | parent | - |
| `course_versions` | contains | `course_modules` | one_to_many | composition | yes | cascade | parent | - |
| `course_modules` | contains | `lessons` | one_to_many | composition | yes | cascade | parent | - |
| `lessons` | uses | `learning_content_assets` | many_to_many | association | - | cascade | parent | - |
| `course_versions` | imports | `scorm_packages` | one_to_many | reference | no | clear | reference | - |
| `course_versions` | completed_via | `course_completions` | one_to_many | reference | yes | restrict | reference | - |
| `course_enrollments` | yields | `course_completions` | one_to_many | composition | yes | cascade | parent | - |
| `course_assessments` | contains | `assessment_questions` | one_to_many | composition | yes | cascade | parent | - |
| `course_assessments` | attempted_by | `assessment_attempts` | one_to_many | reference | no | clear | reference | - |
| `assessment_attempts` | produces | `quiz_responses` | one_to_many | composition | yes | cascade | parent | - |
| `courses` | classified_as | `course_categories` | many_to_many | association | - | cascade | parent | - |
| `courses` | tagged_with | `course_tags` | many_to_many | association | - | cascade | parent | - |
| `course_catalogs` | lists | `courses` | many_to_many | association | - | cascade | parent | - |
| `courses` | reviewed_via | `course_reviews` | one_to_many | reference | no | clear | reference | - |
| `courses` | rated_via | `course_ratings` | one_to_many | reference | no | clear | reference | - |
| `courses` | discussed_in | `course_discussions` | one_to_many | reference | no | clear | reference | - |

### 5.2 Relationships to platform built-ins (`users`)

| from | verb | to | cardinality | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `users` | represents | `employees` | one_to_one | no | clear | reference | - |
| `users` | manages | `hcm_positions` | one_to_many | no | clear | reference | - |
| `users` | leads | `org_units` | one_to_many | no | clear | reference | - |
| `users` | owns | `cost_centers` | one_to_many | no | clear | reference | - |
| `users` | authors | `courses` | one_to_many | no | clear | reference | - |
| `users` | owns | `courses` | one_to_many | no | clear | reference | - |
| `users` | enrolls in | `course_enrollments` | one_to_many | yes | restrict | reference | - |
| `users` | assigns | `course_enrollments` | one_to_many | no | clear | reference | - |
| `users` | earns | `learning_records` | one_to_many | yes | restrict | reference | - |
| `org_units` | has members | `users` | one_to_many | no | clear | reference | - |
| `users` | attempts | `assessment_attempts` | one_to_many | yes | restrict | reference | - |
| `users` | answers | `quiz_responses` | one_to_many | no | clear | reference | - |
| `users` | completes | `course_completions` | one_to_many | yes | restrict | reference | - |
| `users` | posts_in | `course_discussions` | one_to_many | no | clear | reference | - |
| `users` | authors | `course_reviews` | one_to_many | no | clear | reference | - |
| `users` | rates_via | `course_ratings` | one_to_many | no | clear | reference | - |

### 5.3 Relationships to entities outside this blueprint

_External entities are optional: this blueprint never installs them. If one exists at install, the relationship is proposed. A many-to-many relationship is listed under outgoing and proposed as a new junction table._

#### 5.3a Outgoing relationships: this blueprint's entity points to the external entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `job_profiles` | defines | `hcm_positions` | one_to_many | yes | - |
| `job_profiles` | maps_to | `courses` | many_to_many | - | - |
| `salary_bands` | anchors | `hcm_positions` | one_to_many | no | - |
| `onboarding_tasks` | spawns | `course_enrollments` | one_to_many | no | - |
| `courses` | sequenced_into | `learning_paths` | many_to_many | - | - |
| `skill_profiles` | updated by | `course_enrollments` | one_to_many | no | - |
| `org_units` | sponsors | `benefit_plans` | many_to_many | - | - |
| `survey_campaigns` | targets | `employees` | many_to_many | - | - |
| `survey_campaigns` | targets | `org_units` | many_to_many | - | - |
| `case_categories` | drives | `employees` | one_to_many | no | - |
| `legal_holds` | identifies_custodians_from | `employees` | many_to_many | - | - |
| `legal_advice_records` | references | `employees` | many_to_many | - | - |
| `candidates` | becomes | `employees` | one_to_one | no | - |
| `pre_employees` | promotes to | `employees` | one_to_one | no | - |
| `workforce_scenarios` | drives | `hcm_positions` | one_to_many | no | - |
| `org_designs` | proposes | `hcm_positions` | one_to_many | no | - |
| `courses` | grants | `certification_definitions` | many_to_many | - | - |
| `courses` | yields_credits_via | `continuing_education_credits` | many_to_many | - | - |
| `learning_path_steps` | references | `courses` | one_to_many | no | - |
| `automated_enrollment_rules` | creates | `course_enrollments` | one_to_many | no | - |
| `contingent_workers` | converts_to | `employees` | one_to_one | no | - |

#### 5.3b Incoming relationships: the external entity points to this blueprint's entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `employees` | signs | `employment_contracts` | one_to_many | yes | - |
| `employees` | generates | `employment_events` | one_to_many | yes | - |
| `employees` | triggers | `asset_lifecycle_events` | one_to_many | no | - |
| `employees` | requests | `absence_requests` | one_to_many | no | - |
| `employees` | holds | `skill_profiles` | one_to_one | no | - |
| `org_units` | engages | `contingent_workers` | one_to_many | no | - |
| `org_units` | is_scored_by | `engagement_drivers` | one_to_many | no | - |
| `org_units` | is_measured_by | `people_kpis` | one_to_many | no | - |
| `employees` | triggers | `service_requests` | one_to_many | no | - |
| `employees` | triggers | `iga_provisioning_events` | one_to_many | no | - |
| `org_units` | triggers | `iga_entitlement_definitions` | one_to_many | no | - |
| `employees` | triggers | `pay_runs` | one_to_many | no | - |
| `hcm_positions` | spawns | `job_requisitions` | one_to_many | no | - |
| `employees` | becomes | `career_aspirations` | one_to_one | no | - |
| `employees` | becomes | `work_shifts` | one_to_many | no | - |
| `employees` | becomes | `compensation_statements` | one_to_one | no | - |
| `employees` | triggers | `benefit_enrollments` | one_to_many | no | - |
| `employees` | triggers | `corporate_cards` | one_to_many | no | - |
| `employees` | spawns | `onboarding_journeys` | one_to_one | no | - |
| `employees` | spawns | `hr_cases` | one_to_many | no | - |
| `employees` | feeds | `headcount_plans` | one_to_many | no | - |
| `employees` | feeds | `agency_time_entries` | one_to_many | no | - |
| `employees` | onboarded by | `onboarding_journeys` | one_to_many | yes | - |
| `employees` | finalized by | `onboarding_document_collections` | one_to_many | no | - |
| `courses` | fulfills | `compliance_assignments` | one_to_many | no | - |
| `courses` | grants | `learner_certifications` | one_to_many | no | - |
| `hcm_positions` | requires | `compliance_assignments` | one_to_many | no | - |
| `org_units` | sponsors | `compliance_assignments` | one_to_many | no | - |
| `employees` | reflected on | `compliance_assignments` | one_to_many | no | - |
| `course_enrollments` | updates | `career_aspirations` | one_to_many | no | - |
| `learning_records` | feeds | `people_kpis` | one_to_many | no | - |
| `employees` | enrolls_in | `benefit_enrollments` | one_to_many | yes | - |
| `employees` | declares | `life_events` | one_to_many | no | - |
| `employees` | updated by | `life_events` | one_to_many | no | - |
| `org_units` | owns | `action_plans` | one_to_many | no | - |
| `employees` | submits | `survey_responses` | one_to_many | no | - |
| `employees` | flagged on | `engagement_drivers` | one_to_many | no | - |
| `employees` | reflected on | `engagement_drivers` | one_to_many | no | - |
| `employees` | raises | `hr_cases` | one_to_many | yes | - |
| `employees` | updated by | `hr_cases` | one_to_many | no | - |
| `employees` | is host for | `host_assignments` | one_to_many | yes | - |
| `employees` | reclassifies | `contingent_workers` | one_to_one | no | - |
| `courses` | scheduled_as | `course_offerings` | one_to_many | no | - |
| `employees` | receives | `merit_recommendations` | one_to_one | no | - |
| `employees` | holds | `equity_grants` | one_to_one | no | - |
| `employees` | receives | `compensation_statements` | one_to_one | no | - |
| `employees` | has | `emergency_contacts` | one_to_many | yes | - |
| `employees` | has | `work_eligibility_documents` | one_to_many | yes | - |
| `employees` | has | `national_ids` | one_to_many | yes | - |
| `employees` | has | `worker_addresses` | one_to_many | yes | - |
| `employees` | has | `employee_dependents` | one_to_many | yes | - |
| `employees` | has | `worker_change_requests` | one_to_many | yes | - |
| `employees` | applies_as | `candidates` | one_to_many | no | - |
| `employees` | is the worker behind | `traveler_profiles` | one_to_one | no | - |
| `employees` | is assessed by | `exit_risk_assessments` | one_to_one | no | - |
| `employees` | is subject of | `insider_risk_cases` | one_to_many | no | - |
| `employees` | is recognized in | `frontline_recognitions` | one_to_many | yes | - |
| `employees` | is enrolled as | `advocate_profiles` | one_to_one | yes | - |
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
| `cost_centers` | embedded_master | yes | FIN-GL-CLOSE (FIN) | - |
| `employees` | embedded_master | - | HCM-CORE-WORKER (HCM) | - |
| `hcm_positions` | embedded_master | yes | HCM-ORG-POSITIONS (HCM) | - |
| `org_units` | embedded_master | yes | HCM-ORG-POSITIONS (HCM) | - |

## 7. Lifecycle states

### `assessment_attempts` (Assessment Attempt)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `in_progress` | ✓ | - | `LMS-COURSE-DELIVERY` | - | - | - | - |
| 2 | `submitted` | - | - | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:submit` | - |
| 3 | `graded` | - | - | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:grade` | - |
| 4 | `passed` | - | ✓ | `LMS-COURSE-DELIVERY` | - | - | - | - |
| 5 | `failed` | - | ✓ | `LMS-COURSE-DELIVERY` | - | - | - | - |

### `course_assessments` (Course Assessment)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | `LMS-COURSE-DELIVERY` | - | - | - | - |
| 2 | `published` | - | - | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:publish` | - |
| 3 | `retired` | - | ✓ | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:retire` | - |

### `course_completions` (Course Completion)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `recorded` | ✓ | - | `LMS-COURSE-DELIVERY` | - | - | - | - |
| 2 | `validated` | - | - | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:validate` | - |
| 3 | `voided` | - | ✓ | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:void` | - |

### `course_discussions` (Course Discussion)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `open` | ✓ | - | `LMS-COURSE-DELIVERY` | - | - | - | - |
| 2 | `closed` | - | - | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:close` | - |
| 3 | `archived` | - | ✓ | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:archive` | - |

### `course_enrollments` (Course Enrollment)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `enrolled` | ✓ | - | _(always)_ | - | - | - | Learner enrolled in the course but has not started. |
| 2 | `in_progress` | - | - | _(always)_ | - | - | - | Learner has begun the course content or activities. |
| 3 | `completed` | - | ✓ | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:complete` | Learner met all completion criteria with a passing score. |
| 4 | `failed` | - | ✓ | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:fail` | Learner did not meet the passing criteria within allowed attempts. |
| 5 | `expired` | - | ✓ | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:expire` | Enrollment closed unmet at the due date or content expiry. |
| 6 | `withdrawn` | - | ✓ | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:withdraw` | Learner withdrew or was unenrolled before completion. |

### `course_reviews` (Course Review)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `submitted` | ✓ | - | `LMS-COURSE-DELIVERY` | - | - | - | - |
| 2 | `published` | - | - | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:publish` | - |
| 3 | `flagged` | - | - | `LMS-COURSE-DELIVERY` | - | - | - | - |
| 4 | `removed` | - | ✓ | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:remove` | - |

### `course_versions` (Course Version)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | `LMS-COURSE-DELIVERY` | - | - | - | - |
| 2 | `in_review` | - | - | `LMS-COURSE-DELIVERY` | - | - | - | - |
| 3 | `published` | - | - | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:publish` | - |
| 4 | `retired` | - | ✓ | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:retire` | - |

### `courses` (Course)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | _(always)_ | - | - | - | Course being authored by an instructional designer or SME. |
| 2 | `in_review` | - | - | _(always)_ | - | - | - | Content under review by L&D or compliance reviewers. |
| 3 | `published` | - | - | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:publish` | Course released to the catalog and available for enrollment. |
| 4 | `retired` | - | ✓ | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:retire` | Course removed from the catalog and kept for historical transcripts. |

### `employees` (Employee)

_This scope holds `employees` as **embedded_master**; the canonical state machine is owned by `HCM-CORE-WORKER`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | `HCM-CORE-WORKER` | - | - | - | Pre-hire stub created during requisition or onboarding handoff; not yet a worker of record. |
| 2 | `active` | - | - | `HCM-CORE-WORKER` | ✓ | - | `hcm-core-worker:active_employee` | Worker is currently employed and appears in headcount, payroll eligibility, and directory feeds. |
| 3 | `on_leave` | - | - | `HCM-CORE-WORKER` | ✓ | - | `hcm-core-worker:on_leave_employee` | Employee is on approved leave (parental, medical, sabbatical); active record but suppressed from some downstream feeds. |
| 4 | `suspended` | - | - | `HCM-CORE-WORKER` | ✓ | - | `hcm-core-worker:suspended_employee` | Employment temporarily halted (investigation, disciplinary); pay and access may be paused. |
| 5 | `terminated` | - | ✓ | `HCM-CORE-WORKER` | ✓ | - | `hcm-core-worker:terminated_employee` | Employment ended (voluntary or involuntary); final pay processed, access deprovisioned. |

### `hcm_positions` (Position)

_This scope holds `hcm_positions` as **embedded_master**; the canonical state machine is owned by `HCM-ORG-POSITIONS`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `proposed` | ✓ | - | `HCM-ORG-POSITIONS` | - | - | - | Position has been designed but not yet approved against the headcount plan. |
| 2 | `approved` | - | - | `HCM-ORG-POSITIONS` | ✓ | - | `hcm-org-positions:approved_position` | Cleared by headcount/finance owner; eligible to spawn a requisition. |
| 3 | `open` | - | - | `HCM-ORG-POSITIONS` | ✓ | - | `hcm-org-positions:open_position` | Approved and actively being recruited against; not yet filled. |
| 4 | `filled` | - | - | `HCM-ORG-POSITIONS` | ✓ | - | `hcm-org-positions:filled_position` | An employee occupies the position. |
| 5 | `frozen` | - | - | `HCM-ORG-POSITIONS` | ✓ | - | `hcm-org-positions:frozen_position` | Temporarily not fillable (hiring freeze, budget hold); retains the slot. |
| 6 | `eliminated` | - | ✓ | `HCM-ORG-POSITIONS` | ✓ | - | `hcm-org-positions:eliminated_position` | Removed from the org structure permanently. |

### `learning_content_assets` (Learning Content Asset)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `uploaded` | ✓ | - | `LMS-COURSE-DELIVERY` | - | - | - | - |
| 2 | `active` | - | - | `LMS-COURSE-DELIVERY` | - | - | - | - |
| 3 | `deprecated` | - | - | `LMS-COURSE-DELIVERY` | - | - | - | - |
| 4 | `archived` | - | ✓ | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:archive` | - |

### `learning_records` (Learning Record)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `recorded` | ✓ | - | _(always)_ | - | - | - | Statement captured from the content runtime or external source. |
| 2 | `validated` | - | ✓ | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:validate` | Record validated against schema and posted to the learner transcript. |
| 3 | `voided` | - | ✓ | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:void` | Record voided due to data error, duplicate, or content reset. |

### `observation_checklist_results` (Observation Checklist Result)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `in_progress` | ✓ | - | `LMS-COURSE-DELIVERY` | - | - | - | - |
| 2 | `submitted` | - | - | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:submit` | - |
| 3 | `signed_off` | - | ✓ | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:sign_off` | - |

### `observation_checklists` (Observation Checklist)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | `LMS-COURSE-DELIVERY` | - | - | - | - |
| 2 | `published` | - | - | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:publish` | - |
| 3 | `retired` | - | ✓ | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:retire` | - |

### `org_units` (Org Unit)

_This scope holds `org_units` as **embedded_master**; the canonical state machine is owned by `HCM-ORG-POSITIONS`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | `HCM-ORG-POSITIONS` | - | - | - | Org unit defined as part of a future structure; not yet operational. |
| 2 | `active` | - | - | `HCM-ORG-POSITIONS` | ✓ | - | `hcm-org-positions:active_org_unit` | Operational unit; carries headcount, cost-center relationship, and reporting lines. |
| 3 | `reorganized` | - | ✓ | `HCM-ORG-POSITIONS` | ✓ | - | `hcm-org-positions:reorganized_org_unit` | Unit folded into or replaced by a new structure; references remain for history. |
| 4 | `closed` | - | ✓ | `HCM-ORG-POSITIONS` | ✓ | - | `hcm-org-positions:closed_org_unit` | Unit dissolved; no employees or positions reside in it. |

### `scorm_packages` (SCORM Package)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `uploaded` | ✓ | - | `LMS-COURSE-DELIVERY` | - | - | - | - |
| 2 | `validated` | - | - | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:validate` | - |
| 3 | `active` | - | - | `LMS-COURSE-DELIVERY` | - | - | - | - |
| 4 | `deprecated` | - | ✓ | `LMS-COURSE-DELIVERY` | ✓ | - | `lms-course-delivery:deprecate` | - |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `lms-course-delivery:read` | baseline-read | Read access to every entity in the module | ✓ |
| `lms-course-delivery:manage` | baseline-manage | Edit operational records | ✓ |
| `lms-course-delivery:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `hcm-core-worker:read_employees` | entity-read | Read Employees | ✓ |
| `hcm-core-worker:write_employees` | entity-write | Write Employees | ✓ |
| `hcm-org-positions:read_hcm_positions` | entity-read | Read Positions | ✓ |
| `hcm-org-positions:write_hcm_positions` | entity-write | Write Positions | ✓ |
| `hcm-org-positions:read_org_units` | entity-read | Read Org Units | ✓ |
| `hcm-org-positions:write_org_units` | entity-write | Write Org Units | ✓ |
| `lms-course-delivery:read_courses` | entity-read | Read Courses | ✓ |
| `lms-course-delivery:write_courses` | entity-write | Write Courses | ✓ |
| `lms-course-delivery:read_course_enrollments` | entity-read | Read Course Enrollments | ✓ |
| `lms-course-delivery:write_course_enrollments` | entity-write | Write Course Enrollments | ✓ |
| `lms-course-delivery:read_learning_records` | entity-read | Read Learning Records | ✓ |
| `lms-course-delivery:write_learning_records` | entity-write | Write Learning Records | ✓ |
| `fin-gl-close:read_cost_centers` | entity-read | Read Cost Centers | ✓ |
| `fin-gl-close:write_cost_centers` | entity-write | Write Cost Centers | ✓ |
| `lms-course-delivery:read_course_versions` | entity-read | Read Course Versions | ✓ |
| `lms-course-delivery:write_course_versions` | entity-write | Write Course Versions | ✓ |
| `lms-course-delivery:read_course_modules` | entity-read | Read Course Modules | ✓ |
| `lms-course-delivery:write_course_modules` | entity-write | Write Course Modules | ✓ |
| `lms-course-delivery:read_lessons` | entity-read | Read Lessons | ✓ |
| `lms-course-delivery:write_lessons` | entity-write | Write Lessons | ✓ |
| `lms-course-delivery:read_learning_content_assets` | entity-read | Read Learning Content Assets | ✓ |
| `lms-course-delivery:write_learning_content_assets` | entity-write | Write Learning Content Assets | ✓ |
| `lms-course-delivery:read_scorm_packages` | entity-read | Read SCORM Packages | ✓ |
| `lms-course-delivery:write_scorm_packages` | entity-write | Write SCORM Packages | ✓ |
| `lms-course-delivery:read_xapi_statements` | entity-read | Read xAPI Statements | ✓ |
| `lms-course-delivery:write_xapi_statements` | entity-write | Write xAPI Statements | ✓ |
| `lms-course-delivery:read_course_completions` | entity-read | Read Course Completions | ✓ |
| `lms-course-delivery:write_course_completions` | entity-write | Write Course Completions | ✓ |
| `lms-course-delivery:read_course_assessments` | entity-read | Read Course Assessments | ✓ |
| `lms-course-delivery:write_course_assessments` | entity-write | Write Course Assessments | ✓ |
| `lms-course-delivery:read_assessment_questions` | entity-read | Read Assessment Questions | ✓ |
| `lms-course-delivery:write_assessment_questions` | entity-write | Write Assessment Questions | ✓ |
| `lms-course-delivery:read_assessment_attempts` | entity-read | Read Assessment Attempts | ✓ |
| `lms-course-delivery:write_assessment_attempts` | entity-write | Write Assessment Attempts | ✓ |
| `lms-course-delivery:read_quiz_responses` | entity-read | Read Quiz Responses | ✓ |
| `lms-course-delivery:write_quiz_responses` | entity-write | Write Quiz Responses | ✓ |
| `lms-course-delivery:read_course_categories` | entity-read | Read Course Categories | ✓ |
| `lms-course-delivery:write_course_categories` | entity-write | Write Course Categories | ✓ |
| `lms-course-delivery:read_course_tags` | entity-read | Read Course Tags | ✓ |
| `lms-course-delivery:write_course_tags` | entity-write | Write Course Tags | ✓ |
| `lms-course-delivery:read_course_catalogs` | entity-read | Read Course Catalogs | ✓ |
| `lms-course-delivery:write_course_catalogs` | entity-write | Write Course Catalogs | ✓ |
| `lms-course-delivery:read_course_discussions` | entity-read | Read Course Discussions | ✓ |
| `lms-course-delivery:write_course_discussions` | entity-write | Write Course Discussions | ✓ |
| `lms-course-delivery:read_course_reviews` | entity-read | Read Course Reviews | ✓ |
| `lms-course-delivery:write_course_reviews` | entity-write | Write Course Reviews | ✓ |
| `lms-course-delivery:read_course_ratings` | entity-read | Read Course Ratings | ✓ |
| `lms-course-delivery:write_course_ratings` | entity-write | Write Course Ratings | ✓ |
| `lms-course-delivery:read_question_banks` | entity-read | Read Question Banks | ✓ |
| `lms-course-delivery:write_question_banks` | entity-write | Write Question Banks | ✓ |
| `lms-course-delivery:read_cmi5_assignable_units` | entity-read | Read cmi5 Assignable Units | ✓ |
| `lms-course-delivery:write_cmi5_assignable_units` | entity-write | Write cmi5 Assignable Units | ✓ |
| `lms-course-delivery:read_lrs_statement_endpoints` | entity-read | Read LRS Statement Endpoints | ✓ |
| `lms-course-delivery:write_lrs_statement_endpoints` | entity-write | Write LRS Statement Endpoints | ✓ |
| `lms-course-delivery:read_observation_checklists` | entity-read | Read Observation Checklists | ✓ |
| `lms-course-delivery:write_observation_checklists` | entity-write | Write Observation Checklists | ✓ |
| `lms-course-delivery:read_observation_checklist_results` | entity-read | Read Observation Checklist Results | ✓ |
| `lms-course-delivery:write_observation_checklist_results` | entity-write | Write Observation Checklist Results | ✓ |
| `hcm-core-worker:active_employee` | workflow-gate (lifecycle) | Transition `employees` into state `active` | ✓ |
| `hcm-core-worker:on_leave_employee` | workflow-gate (lifecycle) | Transition `employees` into state `on_leave` | ✓ |
| `hcm-core-worker:suspended_employee` | workflow-gate (lifecycle) | Transition `employees` into state `suspended` | ✓ |
| `hcm-core-worker:terminated_employee` | workflow-gate (lifecycle) | Transition `employees` into state `terminated` | ✓ |
| `hcm-org-positions:approved_position` | workflow-gate (lifecycle) | Transition `hcm_positions` into state `approved` | ✓ |
| `hcm-org-positions:open_position` | workflow-gate (lifecycle) | Transition `hcm_positions` into state `open` | ✓ |
| `hcm-org-positions:filled_position` | workflow-gate (lifecycle) | Transition `hcm_positions` into state `filled` | ✓ |
| `hcm-org-positions:frozen_position` | workflow-gate (lifecycle) | Transition `hcm_positions` into state `frozen` | ✓ |
| `hcm-org-positions:eliminated_position` | workflow-gate (lifecycle) | Transition `hcm_positions` into state `eliminated` | ✓ |
| `hcm-org-positions:active_org_unit` | workflow-gate (lifecycle) | Transition `org_units` into state `active` | ✓ |
| `hcm-org-positions:reorganized_org_unit` | workflow-gate (lifecycle) | Transition `org_units` into state `reorganized` | ✓ |
| `hcm-org-positions:closed_org_unit` | workflow-gate (lifecycle) | Transition `org_units` into state `closed` | ✓ |
| `lms-course-delivery:publish` | workflow-gate (lifecycle) | Transition `courses` into state `published`, `course_versions` into state `published`, `course_assessments` into state `published`, `course_reviews` into state `published` or `observation_checklists` into state `published` | ✓ |
| `lms-course-delivery:retire` | workflow-gate (lifecycle) | Transition `courses` into state `retired`, `course_versions` into state `retired`, `course_assessments` into state `retired` or `observation_checklists` into state `retired` | ✓ |
| `lms-course-delivery:complete` | workflow-gate (lifecycle) | Transition `course_enrollments` into state `completed` | ✓ |
| `lms-course-delivery:fail` | workflow-gate (lifecycle) | Transition `course_enrollments` into state `failed` | ✓ |
| `lms-course-delivery:expire` | workflow-gate (lifecycle) | Transition `course_enrollments` into state `expired` | ✓ |
| `lms-course-delivery:withdraw` | workflow-gate (lifecycle) | Transition `course_enrollments` into state `withdrawn` | ✓ |
| `lms-course-delivery:validate` | workflow-gate (lifecycle) | Transition `learning_records` into state `validated`, `scorm_packages` into state `validated` or `course_completions` into state `validated` | ✓ |
| `lms-course-delivery:void` | workflow-gate (lifecycle) | Transition `learning_records` into state `voided` or `course_completions` into state `voided` | ✓ |
| `lms-course-delivery:archive` | workflow-gate (lifecycle) | Transition `learning_content_assets` into state `archived` or `course_discussions` into state `archived` | ✓ |
| `lms-course-delivery:deprecate` | workflow-gate (lifecycle) | Transition `scorm_packages` into state `deprecated` | ✓ |
| `lms-course-delivery:submit` | workflow-gate (lifecycle) | Transition `assessment_attempts` into state `submitted` or `observation_checklist_results` into state `submitted` | ✓ |
| `lms-course-delivery:grade` | workflow-gate (lifecycle) | Transition `assessment_attempts` into state `graded` | ✓ |
| `lms-course-delivery:close` | workflow-gate (lifecycle) | Transition `course_discussions` into state `closed` | ✓ |
| `lms-course-delivery:remove` | workflow-gate (lifecycle) | Transition `course_reviews` into state `removed` | ✓ |
| `lms-course-delivery:sign_off` | workflow-gate (lifecycle) | Transition `observation_checklist_results` into state `signed_off` | ✓ |
| `hcm-core-worker:view_all_employees` | override (personal_content) | View all `employees` rows beyond row-scope | ✓ |
| `hcm-core-worker:manage_all_employees` | override (personal_content) | Manage all `employees` rows beyond row-scope | ✓ |
| `lms-course-delivery:view_all_course_enrollments` | override (personal_content) | View all `course_enrollments` rows beyond row-scope | ✓ |
| `lms-course-delivery:manage_all_course_enrollments` | override (personal_content) | Manage all `course_enrollments` rows beyond row-scope | ✓ |
| `lms-course-delivery:view_all_learning_records` | override (personal_content) | View all `learning_records` rows beyond row-scope | ✓ |
| `lms-course-delivery:manage_all_learning_records` | override (personal_content) | Manage all `learning_records` rows beyond row-scope | ✓ |
| `lms-course-delivery:view_all_xapi_statements` | override (personal_content) | View all `xapi_statements` rows beyond row-scope | ✓ |
| `lms-course-delivery:manage_all_xapi_statements` | override (personal_content) | Manage all `xapi_statements` rows beyond row-scope | ✓ |
| `lms-course-delivery:view_all_course_completions` | override (personal_content) | View all `course_completions` rows beyond row-scope | ✓ |
| `lms-course-delivery:manage_all_course_completions` | override (personal_content) | Manage all `course_completions` rows beyond row-scope | ✓ |
| `lms-course-delivery:view_all_assessment_attempts` | override (personal_content) | View all `assessment_attempts` rows beyond row-scope | ✓ |
| `lms-course-delivery:manage_all_assessment_attempts` | override (personal_content) | Manage all `assessment_attempts` rows beyond row-scope | ✓ |
| `lms-course-delivery:view_all_quiz_responses` | override (personal_content) | View all `quiz_responses` rows beyond row-scope | ✓ |
| `lms-course-delivery:manage_all_quiz_responses` | override (personal_content) | Manage all `quiz_responses` rows beyond row-scope | ✓ |
| `lms-course-delivery:view_all_course_discussions` | override (personal_content) | View all `course_discussions` rows beyond row-scope | ✓ |
| `lms-course-delivery:manage_all_course_discussions` | override (personal_content) | Manage all `course_discussions` rows beyond row-scope | ✓ |
| `lms-course-delivery:view_all_course_reviews` | override (personal_content) | View all `course_reviews` rows beyond row-scope | ✓ |
| `lms-course-delivery:manage_all_course_reviews` | override (personal_content) | Manage all `course_reviews` rows beyond row-scope | ✓ |
| `lms-course-delivery:view_all_course_ratings` | override (personal_content) | View all `course_ratings` rows beyond row-scope | ✓ |
| `lms-course-delivery:manage_all_course_ratings` | override (personal_content) | Manage all `course_ratings` rows beyond row-scope | ✓ |
| `lms-course-delivery:view_all_observation_checklist_results` | override (personal_content) | View all `observation_checklist_results` rows beyond row-scope | ✓ |
| `lms-course-delivery:manage_all_observation_checklist_results` | override (personal_content) | Manage all `observation_checklist_results` rows beyond row-scope | ✓ |

_Gates with no process: `hcm-core-worker:suspended_employee`, `hcm-org-positions:open_position`, `hcm-org-positions:filled_position`, `hcm-org-positions:frozen_position`, `hcm-org-positions:eliminated_position`, `hcm-org-positions:closed_org_unit`, `lms-course-delivery:retire`, `lms-course-delivery:fail`, `lms-course-delivery:expire`, `lms-course-delivery:withdraw`, `lms-course-delivery:validate`, `lms-course-delivery:void`, `lms-course-delivery:archive`, `lms-course-delivery:deprecate`, `lms-course-delivery:submit`, `lms-course-delivery:close`, `lms-course-delivery:remove`, `lms-course-delivery:sign_off`. No Accountable can hold them, so this blueprint does not support `raci`._

### 8.2 Business rules

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `employee_edit_scope` | `employees` | has_personal_content | Row-scope by default; override via `hcm-core-worker:view_all_employees` / `hcm-core-worker:manage_all_employees` |
| `course_enrollment_edit_scope` | `course_enrollments` | has_personal_content | Row-scope by default; override via `lms-course-delivery:view_all_course_enrollments` / `lms-course-delivery:manage_all_course_enrollments` |
| `learning_record_edit_scope` | `learning_records` | has_personal_content | Row-scope by default; override via `lms-course-delivery:view_all_learning_records` / `lms-course-delivery:manage_all_learning_records` |
| `xapi_statement_edit_scope` | `xapi_statements` | has_personal_content | Row-scope by default; override via `lms-course-delivery:view_all_xapi_statements` / `lms-course-delivery:manage_all_xapi_statements` |
| `course_completion_edit_scope` | `course_completions` | has_personal_content | Row-scope by default; override via `lms-course-delivery:view_all_course_completions` / `lms-course-delivery:manage_all_course_completions` |
| `assessment_attempt_edit_scope` | `assessment_attempts` | has_personal_content | Row-scope by default; override via `lms-course-delivery:view_all_assessment_attempts` / `lms-course-delivery:manage_all_assessment_attempts` |
| `quiz_response_edit_scope` | `quiz_responses` | has_personal_content | Row-scope by default; override via `lms-course-delivery:view_all_quiz_responses` / `lms-course-delivery:manage_all_quiz_responses` |
| `course_discussion_edit_scope` | `course_discussions` | has_personal_content | Row-scope by default; override via `lms-course-delivery:view_all_course_discussions` / `lms-course-delivery:manage_all_course_discussions` |
| `course_review_edit_scope` | `course_reviews` | has_personal_content | Row-scope by default; override via `lms-course-delivery:view_all_course_reviews` / `lms-course-delivery:manage_all_course_reviews` |
| `course_rating_edit_scope` | `course_ratings` | has_personal_content | Row-scope by default; override via `lms-course-delivery:view_all_course_ratings` / `lms-course-delivery:manage_all_course_ratings` |
| `observation_checklist_result_edit_scope` | `observation_checklist_results` | has_personal_content | Row-scope by default; override via `lms-course-delivery:view_all_observation_checklist_results` / `lms-course-delivery:manage_all_observation_checklist_results` |

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `LMS-COURSE-DELIVERY`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `lms-course-delivery_viewer` | `lms-course-delivery:read` |
| `lms-course-delivery_manager` | `lms-course-delivery:manage` |
| `lms-course-delivery_admin` | `lms-course-delivery:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `lms-course-delivery:admin` | `lms-course-delivery:manage` |
| `lms-course-delivery:manage` | `lms-course-delivery:read` |
| `lms-course-delivery:read` | `hcm-core-worker:read_employees` |
| `lms-course-delivery:read` | `hcm-org-positions:read_hcm_positions` |
| `lms-course-delivery:read` | `hcm-org-positions:read_org_units` |
| `lms-course-delivery:read` | `lms-course-delivery:read_courses` |
| `lms-course-delivery:read` | `lms-course-delivery:read_course_enrollments` |
| `lms-course-delivery:read` | `lms-course-delivery:read_learning_records` |
| `lms-course-delivery:read` | `fin-gl-close:read_cost_centers` |
| `lms-course-delivery:read` | `lms-course-delivery:read_course_versions` |
| `lms-course-delivery:read` | `lms-course-delivery:read_course_modules` |
| `lms-course-delivery:read` | `lms-course-delivery:read_lessons` |
| `lms-course-delivery:read` | `lms-course-delivery:read_learning_content_assets` |
| `lms-course-delivery:read` | `lms-course-delivery:read_scorm_packages` |
| `lms-course-delivery:read` | `lms-course-delivery:read_xapi_statements` |
| `lms-course-delivery:read` | `lms-course-delivery:read_course_completions` |
| `lms-course-delivery:read` | `lms-course-delivery:read_course_assessments` |
| `lms-course-delivery:read` | `lms-course-delivery:read_assessment_questions` |
| `lms-course-delivery:read` | `lms-course-delivery:read_assessment_attempts` |
| `lms-course-delivery:read` | `lms-course-delivery:read_quiz_responses` |
| `lms-course-delivery:read` | `lms-course-delivery:read_course_categories` |
| `lms-course-delivery:read` | `lms-course-delivery:read_course_tags` |
| `lms-course-delivery:read` | `lms-course-delivery:read_course_catalogs` |
| `lms-course-delivery:read` | `lms-course-delivery:read_course_discussions` |
| `lms-course-delivery:read` | `lms-course-delivery:read_course_reviews` |
| `lms-course-delivery:read` | `lms-course-delivery:read_course_ratings` |
| `lms-course-delivery:read` | `lms-course-delivery:read_question_banks` |
| `lms-course-delivery:read` | `lms-course-delivery:read_cmi5_assignable_units` |
| `lms-course-delivery:read` | `lms-course-delivery:read_lrs_statement_endpoints` |
| `lms-course-delivery:read` | `lms-course-delivery:read_observation_checklists` |
| `lms-course-delivery:read` | `lms-course-delivery:read_observation_checklist_results` |
| `lms-course-delivery:manage` | `hcm-core-worker:write_employees` |
| `hcm-core-worker:write_employees` | `hcm-core-worker:read_employees` |
| `lms-course-delivery:manage` | `hcm-org-positions:write_hcm_positions` |
| `hcm-org-positions:write_hcm_positions` | `hcm-org-positions:read_hcm_positions` |
| `lms-course-delivery:manage` | `hcm-org-positions:write_org_units` |
| `hcm-org-positions:write_org_units` | `hcm-org-positions:read_org_units` |
| `lms-course-delivery:manage` | `lms-course-delivery:write_courses` |
| `lms-course-delivery:write_courses` | `lms-course-delivery:read_courses` |
| `lms-course-delivery:manage` | `lms-course-delivery:write_course_enrollments` |
| `lms-course-delivery:write_course_enrollments` | `lms-course-delivery:read_course_enrollments` |
| `lms-course-delivery:manage` | `lms-course-delivery:write_learning_records` |
| `lms-course-delivery:write_learning_records` | `lms-course-delivery:read_learning_records` |
| `lms-course-delivery:admin` | `fin-gl-close:write_cost_centers` |
| `fin-gl-close:write_cost_centers` | `fin-gl-close:read_cost_centers` |
| `lms-course-delivery:manage` | `lms-course-delivery:write_course_versions` |
| `lms-course-delivery:write_course_versions` | `lms-course-delivery:read_course_versions` |
| `lms-course-delivery:admin` | `lms-course-delivery:write_course_modules` |
| `lms-course-delivery:write_course_modules` | `lms-course-delivery:read_course_modules` |
| `lms-course-delivery:admin` | `lms-course-delivery:write_lessons` |
| `lms-course-delivery:write_lessons` | `lms-course-delivery:read_lessons` |
| `lms-course-delivery:admin` | `lms-course-delivery:write_learning_content_assets` |
| `lms-course-delivery:write_learning_content_assets` | `lms-course-delivery:read_learning_content_assets` |
| `lms-course-delivery:manage` | `lms-course-delivery:write_scorm_packages` |
| `lms-course-delivery:write_scorm_packages` | `lms-course-delivery:read_scorm_packages` |
| `lms-course-delivery:manage` | `lms-course-delivery:write_xapi_statements` |
| `lms-course-delivery:write_xapi_statements` | `lms-course-delivery:read_xapi_statements` |
| `lms-course-delivery:manage` | `lms-course-delivery:write_course_completions` |
| `lms-course-delivery:write_course_completions` | `lms-course-delivery:read_course_completions` |
| `lms-course-delivery:manage` | `lms-course-delivery:write_course_assessments` |
| `lms-course-delivery:write_course_assessments` | `lms-course-delivery:read_course_assessments` |
| `lms-course-delivery:admin` | `lms-course-delivery:write_assessment_questions` |
| `lms-course-delivery:write_assessment_questions` | `lms-course-delivery:read_assessment_questions` |
| `lms-course-delivery:manage` | `lms-course-delivery:write_assessment_attempts` |
| `lms-course-delivery:write_assessment_attempts` | `lms-course-delivery:read_assessment_attempts` |
| `lms-course-delivery:manage` | `lms-course-delivery:write_quiz_responses` |
| `lms-course-delivery:write_quiz_responses` | `lms-course-delivery:read_quiz_responses` |
| `lms-course-delivery:admin` | `lms-course-delivery:write_course_categories` |
| `lms-course-delivery:write_course_categories` | `lms-course-delivery:read_course_categories` |
| `lms-course-delivery:admin` | `lms-course-delivery:write_course_tags` |
| `lms-course-delivery:write_course_tags` | `lms-course-delivery:read_course_tags` |
| `lms-course-delivery:admin` | `lms-course-delivery:write_course_catalogs` |
| `lms-course-delivery:write_course_catalogs` | `lms-course-delivery:read_course_catalogs` |
| `lms-course-delivery:manage` | `lms-course-delivery:write_course_discussions` |
| `lms-course-delivery:write_course_discussions` | `lms-course-delivery:read_course_discussions` |
| `lms-course-delivery:manage` | `lms-course-delivery:write_course_reviews` |
| `lms-course-delivery:write_course_reviews` | `lms-course-delivery:read_course_reviews` |
| `lms-course-delivery:manage` | `lms-course-delivery:write_course_ratings` |
| `lms-course-delivery:write_course_ratings` | `lms-course-delivery:read_course_ratings` |
| `lms-course-delivery:admin` | `lms-course-delivery:write_question_banks` |
| `lms-course-delivery:write_question_banks` | `lms-course-delivery:read_question_banks` |
| `lms-course-delivery:admin` | `lms-course-delivery:write_cmi5_assignable_units` |
| `lms-course-delivery:write_cmi5_assignable_units` | `lms-course-delivery:read_cmi5_assignable_units` |
| `lms-course-delivery:admin` | `lms-course-delivery:write_lrs_statement_endpoints` |
| `lms-course-delivery:write_lrs_statement_endpoints` | `lms-course-delivery:read_lrs_statement_endpoints` |
| `lms-course-delivery:admin` | `lms-course-delivery:write_observation_checklists` |
| `lms-course-delivery:write_observation_checklists` | `lms-course-delivery:read_observation_checklists` |
| `lms-course-delivery:manage` | `lms-course-delivery:write_observation_checklist_results` |
| `lms-course-delivery:write_observation_checklist_results` | `lms-course-delivery:read_observation_checklist_results` |
| `lms-course-delivery:admin` | `hcm-core-worker:active_employee` |
| `lms-course-delivery:admin` | `hcm-core-worker:on_leave_employee` |
| `lms-course-delivery:admin` | `hcm-core-worker:suspended_employee` |
| `lms-course-delivery:admin` | `hcm-core-worker:terminated_employee` |
| `lms-course-delivery:admin` | `hcm-org-positions:approved_position` |
| `lms-course-delivery:admin` | `hcm-org-positions:open_position` |
| `lms-course-delivery:admin` | `hcm-org-positions:filled_position` |
| `lms-course-delivery:admin` | `hcm-org-positions:frozen_position` |
| `lms-course-delivery:admin` | `hcm-org-positions:eliminated_position` |
| `lms-course-delivery:admin` | `hcm-org-positions:active_org_unit` |
| `lms-course-delivery:admin` | `hcm-org-positions:reorganized_org_unit` |
| `lms-course-delivery:admin` | `hcm-org-positions:closed_org_unit` |
| `lms-course-delivery:admin` | `lms-course-delivery:publish` |
| `lms-course-delivery:admin` | `lms-course-delivery:retire` |
| `lms-course-delivery:admin` | `lms-course-delivery:complete` |
| `lms-course-delivery:admin` | `lms-course-delivery:fail` |
| `lms-course-delivery:admin` | `lms-course-delivery:expire` |
| `lms-course-delivery:admin` | `lms-course-delivery:withdraw` |
| `lms-course-delivery:admin` | `lms-course-delivery:validate` |
| `lms-course-delivery:admin` | `lms-course-delivery:void` |
| `lms-course-delivery:admin` | `lms-course-delivery:archive` |
| `lms-course-delivery:admin` | `lms-course-delivery:deprecate` |
| `lms-course-delivery:admin` | `lms-course-delivery:submit` |
| `lms-course-delivery:admin` | `lms-course-delivery:grade` |
| `lms-course-delivery:admin` | `lms-course-delivery:close` |
| `lms-course-delivery:admin` | `lms-course-delivery:remove` |
| `lms-course-delivery:admin` | `lms-course-delivery:sign_off` |
| `lms-course-delivery:admin` | `hcm-core-worker:view_all_employees` |
| `lms-course-delivery:admin` | `hcm-core-worker:manage_all_employees` |
| `lms-course-delivery:admin` | `lms-course-delivery:view_all_course_enrollments` |
| `lms-course-delivery:admin` | `lms-course-delivery:manage_all_course_enrollments` |
| `lms-course-delivery:admin` | `lms-course-delivery:view_all_learning_records` |
| `lms-course-delivery:admin` | `lms-course-delivery:manage_all_learning_records` |
| `lms-course-delivery:admin` | `lms-course-delivery:view_all_xapi_statements` |
| `lms-course-delivery:admin` | `lms-course-delivery:manage_all_xapi_statements` |
| `lms-course-delivery:admin` | `lms-course-delivery:view_all_course_completions` |
| `lms-course-delivery:admin` | `lms-course-delivery:manage_all_course_completions` |
| `lms-course-delivery:admin` | `lms-course-delivery:view_all_assessment_attempts` |
| `lms-course-delivery:admin` | `lms-course-delivery:manage_all_assessment_attempts` |
| `lms-course-delivery:admin` | `lms-course-delivery:view_all_quiz_responses` |
| `lms-course-delivery:admin` | `lms-course-delivery:manage_all_quiz_responses` |
| `lms-course-delivery:admin` | `lms-course-delivery:view_all_course_discussions` |
| `lms-course-delivery:admin` | `lms-course-delivery:manage_all_course_discussions` |
| `lms-course-delivery:admin` | `lms-course-delivery:view_all_course_reviews` |
| `lms-course-delivery:admin` | `lms-course-delivery:manage_all_course_reviews` |
| `lms-course-delivery:admin` | `lms-course-delivery:view_all_course_ratings` |
| `lms-course-delivery:admin` | `lms-course-delivery:manage_all_course_ratings` |
| `lms-course-delivery:admin` | `lms-course-delivery:view_all_observation_checklist_results` |
| `lms-course-delivery:admin` | `lms-course-delivery:manage_all_observation_checklist_results` |

**Processes wired:**

| process_key | process_name | PCF code | PCF ID | level | description |
| --- | --- | --- | --- | --- | --- |
| `manage_maintain_employee_data` | Manage and maintain employee data | 7.7.3 | 10524 | 3 | Capturing and updating employee information and data and information on the employees. |
| `manage_leave_absence` | Manage leave of absence | 7.6.2.2 | 10515 | 4 | Managing the period of time that an employee must be away from their primary job, while maintaining the status of employee (i.e., paid and unpaid leave of absence but not vacations, holidays, hiatuses, sabbaticals, and work-from-home programs). |
| `manage_separation` | Manage separation | 7.6.2 | 10513 | 3 | Managing the process of employee separation, including leaves of absence, resignations, discharges, and layoffs. Inform the employee of the termination. Complete paperwork for continuation of benefits. Enter employment status change into system. |
| `create_organizational_design` | Create organizational design | 1.2.5 | 10041 | 3 | Formulating a design for the organization's resources that allow it to meet its objectives. Develop a new framework for molding the organization's various processes into a coherent and seamless whole. |
| `conduct_organization` | Conduct organization restructuring opportunities | 1.1.5 | 16792 | 3 | Examining the scope and contingencies for restructuring based on market situation and internal realities. Map the market forces over which any and all probabilities can be probed for utility and viability. Once the restructuring options have been analyzed and the due-diligence performed, execute the deal. Consider seeking professional services for assistance in formalizing these opportunities. |
| `develop_conduct_manage_employee` | Develop, conduct, and manage employee training programs | 7.3.4.5 | 10493 | 4 | Creating, implementing, and managing the programs for training employees. Create and design sessions on the basis of the needs and the availability of the skills. Conduct the sessions in person or virtually. Manage all aspects related to the training programs. Consider including literacy training, interpersonal skills training, technical training, problem-solving training, diversity or sensitivity training, etc. |
| `evaluate_training_effectiveness` | Evaluate training effectiveness | 5.2.3.7 | 12135 | 4 | Eliciting feedback from various sources to evaluate the training provided. This can be achieved through testing and the practical application of skills. Additionally, manager or student feedback can be garnered to evaluate training effectiveness. |

**RACI realization:**

| actor | kind | raci | process_key | realization |
| --- | --- | --- | --- | --- |
| `HR-PEOPLE-OPS-SPECIALIST` | persona | responsible | `manage_maintain_employee_data` | the gated entities' write tier |
| `HR-BUSINESS-PARTNER` | persona | accountable | `manage_maintain_employee_data` | grant gates [hcm-core-worker:active_employee] + the gated entities' write tier |
| `HR-HRIS-ADMIN` | persona | consulted | `manage_maintain_employee_data` | advisory read grant |
| `PEOPLE-MANAGER` | persona | informed | `manage_maintain_employee_data` | notify on trigger_events [employee.applied_internally] |
| `HR-PEOPLE-OPS-SPECIALIST` | persona | responsible | `manage_leave_absence` | the gated entities' write tier |
| `PEOPLE-MANAGER` | persona | accountable | `manage_leave_absence` | grant gates [hcm-core-worker:on_leave_employee] + the gated entities' write tier |
| `HR-BUSINESS-PARTNER` | persona | consulted | `manage_leave_absence` | blocking consultation state |
| `HR-HRIS-ADMIN` | persona | informed | `manage_leave_absence` | ⚠ no event wired |
| `HR-PEOPLE-OPS-SPECIALIST` | persona | responsible | `manage_separation` | the gated entities' write tier |
| `HR-BUSINESS-PARTNER` | persona | accountable | `manage_separation` | grant gates [hcm-core-worker:terminated_employee] + the gated entities' write tier |
| `PEOPLE-MANAGER` | persona | consulted | `manage_separation` | advisory read grant |
| `HR-HRIS-ADMIN` | persona | informed | `manage_separation` | notify on trigger_events [employee.terminated] |
| `HR-ORG-DESIGN-ANALYST` | persona | responsible | `create_organizational_design` | the gated entities' write tier |
| `HR-BUSINESS-PARTNER` | persona | accountable | `create_organizational_design` | grant gates [hcm-org-positions:approved_position, hcm-org-positions:active_org_unit] + the gated entities' write tier |
| `PEOPLE-MANAGER` | persona | consulted | `create_organizational_design` | advisory read grant |
| `HR-HRIS-ADMIN` | persona | informed | `create_organizational_design` | notify on trigger_events [hcm_position.approved] |
| `HR-ORG-DESIGN-ANALYST` | persona | responsible | `conduct_organization` | the gated entities' write tier |
| `HR-BUSINESS-PARTNER` | persona | accountable | `conduct_organization` | grant gates [hcm-org-positions:reorganized_org_unit] + the gated entities' write tier |
| `PEOPLE-MANAGER` | persona | consulted | `conduct_organization` | advisory read grant |
| `LD-INSTRUCTIONAL-DESIGNER` | persona | responsible | `develop_conduct_manage_employee` | the gated entities' write tier |
| `LD-LEARNING-ADMIN` | persona | accountable | `develop_conduct_manage_employee` | grant gates [lms-course-delivery:publish, lms-course-delivery:complete] + the gated entities' write tier |
| `LD-INSTRUCTOR` | persona | consulted | `develop_conduct_manage_employee` | advisory read grant |
| `PEOPLE-MANAGER` | persona | informed | `develop_conduct_manage_employee` | notify on trigger_events [course.published, course_enrollment.completed] |
| `LD-INSTRUCTIONAL-DESIGNER` | persona | responsible | `evaluate_training_effectiveness` | the gated entities' write tier |
| `LD-LEARNING-ADMIN` | persona | accountable | `evaluate_training_effectiveness` | grant gates [lms-course-delivery:publish, lms-course-delivery:grade] + the gated entities' write tier |
| `LD-INSTRUCTOR` | persona | consulted | `evaluate_training_effectiveness` | advisory read grant |

### 9.2 Functional ownership and default grants

| responsibility | business function | default role | default tier |
| --- | --- | --- | --- |
| owner | Learning and Development | `admin` | `:admin` |
| contributor | Governance, Risk and Compliance | `manager` | `:manage` |
| contributor | Legal | `manager` | `:manage` |
| consumer | Manufacturing Operations | `viewer` | `:read` |
| consumer | Sales | `viewer` | `:read` |
| consumer | Software Engineering | `viewer` | `:read` |
