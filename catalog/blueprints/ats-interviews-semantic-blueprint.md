---
artifact: semantic-blueprint
version: "3.1"
license: MIT
system_name: Candidate Interviews
tagline: Run consistent, structured interviews and collect comparable feedback.
description: Schedule interviews against panel availability, equip interviewers with kits and question banks, and gather scorecards and assessments in a single structured record. Consistent inputs make hiring decisions easier to defend and faster to reach.
system_slug: ats-interviews
domain_modules:
  - ats-interviews
domain_code: ATS
icon_name: user-plus
related_modules: [ats-candidate-crm, ats-offers, ats-pre-employee-record, ats-recruitment-pipeline, ats-referrals, ats-talent-pools, ben-enrollment, cwm-worker-sourcing, hcm-core-worker, hcm-lifecycle-workflows, hcm-org-positions, hiring-starter, onb-journey-mgmt, pa-workforce-metrics, talent-performance-mgmt, talent-succession-career]
persona: [HIRING-MANAGER, LEGAL-COMPLIANCE-SPECIALIST, RECRUITING-COORDINATOR, RECRUITING-MANAGER, RECRUITING-RECRUITER]
supports_raci: false
created_at: 2026-11-04
---

# Candidate Interviews

## 1. Overview

Interview scheduling, panel coordination, scorecards, and structured assessments. Realizes INTERVIEW-MGMT. Realizes the `interviewing` lifecycle state on `job_applications` (state pruned when this module is not installed).

## 2. Entity summary

| Name | data_object | Description |
| --- | --- | --- |
| Assessments | `candidate_assessments` | Skills, cognitive, technical, or personality test results attached to an application, often sourced from an external assessment provider. |
| Candidate Assessment Templates | `candidate_assessment_templates` | Reusable assessment definitions such as coding challenges, work samples, and skills tests, with time limit and scoring rubric, assigned to candidates. |
| Interview Kits | `interview_kits` | Reusable interview templates per role and stage, bundling questions, target competencies, recommended scorecard, and expected duration. |
| Interview Panels | `interview_panels` | Interviewers assigned to a specific interview, with each person's role on the panel and weight on the consolidated scorecard. |
| Interview Questions | `interview_questions` | Reusable interview questions tied to competencies, with question type, suggested follow-ups, and scoring rubric. |
| Interview Scorecards | `interview_scorecards` | Structured interviewer feedback against a rubric: per-competency ratings, written notes, and a hire or no-hire recommendation. |
| Interviewer Availability Slots | `interviewer_availability_slots` | Bookable time windows an interviewer has marked available, with allowed interview types, driving self-serve scheduling. |
| Interviews | `interviews` | Scheduled assessment events between a candidate and one or more interviewers, with time, location, panel, and outcome. |
| Applications | `job_applications` | Candidate submissions for a specific job, with pipeline stage, status, and source. |
| Candidates | `candidates` | People known to the recruiting organization, with or without an active application, carrying contact details, resume, tags, consent, and source. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef embedded_master fill:#fff4cc,stroke:#c79100,color:#5b4500;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  candidates["Candidates"]
  job_applications["Applications"]
  interviews["Interviews"]
  interview_scorecards["Interview Scorecards"]
  candidate_assessments["Assessments"]
  interview_kits["Interview Kits"]
  interview_panels["Interview Panels"]
  candidate_assessment_templates["Candidate Assessment Templates"]
  interview_questions["Interview Questions"]
  interviewer_availability_slots["Interviewer Availability Slots"]
  users["Users"]
  candidates -->|"submits"| job_applications
  job_applications -->|"schedules"| interviews
  interviews -->|"is scored via"| interview_scorecards
  job_applications -->|"requires"| candidate_assessments
  interview_kits -->|"shapes"| interviews
  interview_kits -->|"includes"| interview_questions
  interviews -->|"convenes"| interview_panels
  interview_panels -->|"produces"| interview_scorecards
  candidate_assessment_templates -->|"instantiates_as"| candidate_assessments
  interviews -->|"occupies"| interviewer_availability_slots
  users -->|"owns as recruiter"| job_applications
  users -->|"coordinates"| interviews
  users -->|"authors"| interview_scorecards
  users -->|"owns as recruiter"| candidates
  users -->|"invites"| candidate_assessments
  users -->|"owns"| interviewer_availability_slots
  users -->|"sits on"| interview_panels
  class candidates embedded_master;
  class job_applications embedded_master;
  class interviews master;
  class interview_scorecards master;
  class candidate_assessments master;
  class interview_kits master;
  class interview_panels master;
  class candidate_assessment_templates master;
  class interview_questions master;
  class interviewer_availability_slots master;
  class users platform_builtin;
  style interviewer_availability_slots stroke-dasharray:5 5;
```

## 3. Entities catalog

| # | data_object | catalog code | singular | plural | held_as | mastered in | mastered label | install_optional | personal_content | entity_type | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `candidate_assessments` | `candidate_assessments` | Assessment | Assessments | master | - | - | - | - | operational_workflow | `:manage` | - |
| 2 | `candidate_assessment_templates` | `candidate_assessment_templates` | Candidate Assessment Template | Candidate Assessment Templates | master | - | - | - | - | catalog | `:admin` | - |
| 3 | `interview_kits` | `interview_kits` | Interview Kit | Interview Kits | master | - | - | - | - | catalog | `:admin` | - |
| 4 | `interview_panels` | `interview_panels` | Interview Panel | Interview Panels | master | - | - | - | - | junction | `:manage` | - |
| 5 | `interview_questions` | `interview_questions` | Interview Question | Interview Questions | master | - | - | - | - | catalog | `:admin` | - |
| 6 | `interview_scorecards` | `interview_scorecards` | Interview Scorecard | Interview Scorecards | master | - | - | - | yes | operational_workflow | `:manage` | - |
| 7 | `interviewer_availability_slots` | `interviewer_availability_slots` | Interviewer Availability Slot | Interviewer Availability Slots | master | - | - | yes | - | operational_workflow | `:manage` | - |
| 8 | `interviews` | `interviews` | Interview | Interviews | master | - | - | - | yes | operational_workflow | `:manage` | - |
| 9 | `job_applications` | `job_applications` | Application | Applications | embedded_master | `ats-recruitment-pipeline` | Recruitment Pipeline | - | yes | operational_workflow | `:manage` | - |
| 10 | `candidates` | `candidates` | Candidate | Candidates | embedded_master | `ats-candidate-crm` | Candidate CRM | - | yes | operational_workflow | `:manage` | - |

## 4. Aliases and industry synonyms

_(none: no industry-scoped aliases for this scope)_

## 5. Relationships

_`field_required` applies only when both entities are installed. It never makes an entity required._

### 5.1 Relationships between entities in this blueprint

| from | verb | to | cardinality | kind | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `candidates` | submits | `job_applications` | one_to_many | reference | yes | restrict | reference | - |
| `job_applications` | schedules | `interviews` | one_to_many | reference | yes | restrict | reference | - |
| `interviews` | is scored via | `interview_scorecards` | one_to_many | reference | yes | restrict | reference | - |
| `job_applications` | requires | `candidate_assessments` | one_to_many | reference | yes | restrict | reference | - |
| `interview_kits` | shapes | `interviews` | one_to_many | reference | no | clear | reference | - |
| `interview_kits` | includes | `interview_questions` | many_to_many | reference | - | cascade | parent | - |
| `interviews` | convenes | `interview_panels` | one_to_many | composition | yes | cascade | parent | - |
| `interview_panels` | produces | `interview_scorecards` | one_to_many | reference | no | clear | reference | - |
| `candidate_assessment_templates` | instantiates_as | `candidate_assessments` | one_to_many | reference | no | clear | reference | - |
| `interviews` | occupies | `interviewer_availability_slots` | one_to_many | reference | no | clear | reference | - |

### 5.2 Relationships to platform built-ins (`users`)

| from | verb | to | cardinality | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `users` | owns as recruiter | `job_applications` | one_to_many | no | clear | reference | - |
| `users` | coordinates | `interviews` | one_to_many | yes | restrict | reference | - |
| `users` | authors | `interview_scorecards` | one_to_many | yes | restrict | reference | - |
| `users` | owns as recruiter | `candidates` | one_to_many | no | clear | reference | - |
| `users` | invites | `candidate_assessments` | one_to_many | yes | restrict | reference | - |
| `users` | owns | `interviewer_availability_slots` | one_to_many | yes | restrict | reference | - |
| `users` | sits on | `interview_panels` | one_to_many | no | clear | reference | - |

### 5.3 Relationships to entities outside this blueprint

_External entities are optional: this blueprint never installs them. If one exists at install, the relationship is proposed. A many-to-many relationship is listed under outgoing and proposed as a new junction table._

#### 5.3a Outgoing relationships: this blueprint's entity points to the external entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `skill_profiles` | feeds | `candidates` | one_to_many | no | - |
| `job_requisitions` | receives | `job_applications` | one_to_many | no | - |
| `job_postings` | is applied to via | `job_applications` | one_to_many | no | - |
| `recruitment_sources` | attributes | `candidates` | one_to_many | no | - |
| `recruitment_agencies` | sources | `candidates` | one_to_many | no | - |
| `recruitment_events` | attracts | `candidates` | one_to_many | no | - |
| `talent_pools` | groups | `candidates` | many_to_many | - | - |
| `employees` | applies_as | `candidates` | one_to_many | no | - |
| `recruitment_sources` | attributes | `job_applications` | one_to_many | no | - |

#### 5.3b Incoming relationships: the external entity points to this blueprint's entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `candidates` | is referred through | `candidate_referrals` | one_to_many | yes | - |
| `job_applications` | results in | `job_offers` | one_to_many | yes | - |
| `candidates` | becomes | `employees` | one_to_one | no | - |
| `candidates` | becomes pre-employee | `pre_employees` | one_to_one | yes | - |
| `candidates` | engaged_via | `candidate_engagements` | one_to_many | no | - |
| `candidates` | attends_via | `recruiting_event_attendances` | one_to_many | yes | - |
| `candidates` | consents_via | `candidate_consents` | one_to_many | yes | - |
| `candidates` | member_of_via | `talent_pool_memberships` | one_to_many | yes | - |
| `candidates` | discloses_via | `fcra_disclosures` | one_to_many | yes | - |
| `job_applications` | transitions_via | `application_stage_transitions` | one_to_many | yes | - |
| `job_applications` | answers_via | `application_screening_answers` | one_to_many | yes | - |
| `candidates` | self_identifies_via | `eeo_responses` | one_to_many | yes | - |
| `candidates` | submits_via | `data_subject_requests` | one_to_many | yes | - |
| `candidates` | self_ids_via | `voluntary_self_identifications` | one_to_many | yes | - |
| `candidates` | acknowledges_via | `fcra_summary_of_rights_acknowledgments` | one_to_many | yes | - |
| `job_applications` | disposed_via | `application_dispositions` | one_to_many | yes | - |
| `job_applications` | logged_via | `applicant_flow_records` | one_to_one | yes | - |
| `candidates` | documented_via | `candidate_documents` | one_to_many | yes | - |
| `candidates` | annotated_via | `candidate_notes` | one_to_many | yes | - |
| `candidates` | tagged_via | `candidate_tag_assignments` | one_to_many | yes | - |
| `candidates` | corresponds_via | `candidate_emails` | one_to_many | no | - |
| `candidates` | screened_via | `drug_health_screenings` | one_to_many | no | - |
| `candidates` | verified_via | `right_to_work_verifications` | one_to_many | no | - |
| `candidates` | submitted_via | `agency_submissions` | one_to_many | no | - |

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
| `candidates` | embedded_master | - | ATS-CANDIDATE-CRM (ATS) | - |
| `job_applications` | embedded_master | - | ATS-RECRUITMENT-PIPELINE (ATS) | - |

## 7. Lifecycle states

### `candidate_assessment_templates` (Candidate Assessment Template)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | _(always)_ | - | - | - | Template being authored / validated. |
| 2 | `active` | - | - | _(always)_ | - | - | - | Template assignable to candidates. |
| 3 | `retired` | - | ✓ | _(always)_ | - | - | - | Template no longer assignable. |

### `candidate_assessments` (Assessment)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `invited` | ✓ | - | _(always)_ | - | - | - | Assessment invitation sent to the candidate by the partner system. |
| 2 | `in_progress` | - | - | _(always)_ | - | - | - | Candidate is actively taking the assessment. |
| 3 | `completed` | - | ✓ | _(always)_ | - | - | - | Candidate finished the assessment and a score/result is recorded. |
| 4 | `expired` | - | ✓ | _(always)_ | - | - | - | Invitation lapsed before the candidate completed the assessment. |
| 5 | `canceled` | - | ✓ | _(always)_ | - | - | - | Assessment withdrawn before completion. |

### `candidates` (Candidate)

_This scope holds `candidates` as **embedded_master**; the canonical state machine is owned by `ATS-CANDIDATE-CRM`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `prospect` | ✓ | - | _(always)_ | - | - | - | Person known to the recruiting org with no active application. |
| 2 | `active` | - | - | _(always)_ | - | - | - | Candidate has at least one open application or is actively engaged. |
| 3 | `hired` | - | - | `ATS-CANDIDATE-CRM` | ✓ | - | `ats-candidate-crm:hire_candidate` | Candidate accepted an offer and converted to employee; a new application moves the person back to active. |
| 4 | `do_not_hire` | - | ✓ | `ATS-CANDIDATE-CRM` | ✓ | - | `ats-candidate-crm:flag_do_not_hire` | Candidate flagged as ineligible for future consideration; gated decision. |
| 5 | `archived` | - | - | _(always)_ | - | - | - | Candidate kept in the database but not active in any pipeline; a new application moves the candidate back to active. |

### `interview_kits` (Interview Kit)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | _(always)_ | - | - | - | Kit being authored. |
| 2 | `active` | - | - | _(always)_ | - | - | - | Kit in use for live interviews. |
| 3 | `archived` | - | ✓ | _(always)_ | - | - | - | Kit retired; no new interviews schedule against it. |

### `interview_panels` (Interview Panel)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `forming` | ✓ | - | _(always)_ | - | - | - | Recruiter assembling the panel. |
| 2 | `assembled` | - | - | _(always)_ | - | - | - | All panel members confirmed; interview can proceed. |
| 3 | `completed` | - | ✓ | _(always)_ | - | - | - | Interview held; consolidated debrief done. |
| 4 | `canceled` | - | ✓ | _(always)_ | - | - | - | Panel disbanded before interview. |

### `interview_scorecards` (Interview Scorecard)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | _(always)_ | - | - | - | Interviewer is filling in ratings and notes against the rubric. |
| 2 | `submitted` | - | ✓ | `ATS-INTERVIEWS` | - | - | - | Scorecard submitted and locked; hire/no-hire recommendation recorded. |

### `interviewer_availability_slots` (Interviewer Availability Slot)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `available` | ✓ | - | _(always)_ | - | - | - | Slot bookable. |
| 2 | `booked` | - | - | _(always)_ | - | - | - | Slot reserved for an interview. |
| 3 | `released` | - | ✓ | _(always)_ | - | - | - | Booking canceled; slot freed. |
| 4 | `past` | - | ✓ | _(always)_ | - | - | - | Slot expired without booking. |

### `interviews` (Interview)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `scheduled` | ✓ | - | _(always)_ | - | - | - | Interview booked with candidate, panel, time, and medium. |
| 2 | `confirmed` | - | - | _(always)_ | - | - | - | Candidate and panel confirmed attendance. |
| 3 | `completed` | - | ✓ | _(always)_ | - | - | - | Interview took place; feedback is being collected. |
| 4 | `no_show` | - | ✓ | _(always)_ | - | - | - | Candidate or panel did not attend; interview did not occur. |
| 5 | `canceled` | - | ✓ | _(always)_ | - | - | - | Interview canceled before it took place. |
| 6 | `rescheduled` | - | ✓ | _(always)_ | - | - | - | Original slot abandoned in favor of a new scheduled interview record. |

### `job_applications` (Application)

_This scope holds `job_applications` as **embedded_master**; the canonical state machine is owned by `ATS-RECRUITMENT-PIPELINE`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `applied` | ✓ | - | _(always)_ | - | - | - | Candidate submitted an application for the job. |
| 2 | `screening` | - | - | _(always)_ | - | - | - | Recruiter is reviewing resume and qualifications. |
| 3 | `interviewing` | - | - | `ATS-INTERVIEWS` | - | - | - | Candidate is progressing through interview loops. |
| 4 | `offer_extended` | - | - | `ATS-OFFERS` | - | - | - | An offer has been generated and is in flight for this application. |
| 5 | `hired` | - | ✓ | `ATS-PRE-EMPLOYEE-RECORD` | ✓ | - | `ats-pre-employee-record:hire_candidate` | Candidate accepted the offer and was hired; gated transition. |
| 6 | `rejected` | - | ✓ | _(always)_ | - | - | - | Application closed without progression by recruiter or hiring manager. |
| 7 | `withdrawn` | - | ✓ | _(always)_ | - | - | - | Candidate withdrew their application. |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `ats-interviews:read` | baseline-read | Read access to every entity in the module | ✓ |
| `ats-interviews:manage` | baseline-manage | Edit operational records | ✓ |
| `ats-interviews:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `ats-candidate-crm:read_candidates` | entity-read | Read Candidates | ✓ |
| `ats-candidate-crm:write_candidates` | entity-write | Write Candidates | ✓ |
| `ats-recruitment-pipeline:read_job_applications` | entity-read | Read Applications | ✓ |
| `ats-recruitment-pipeline:write_job_applications` | entity-write | Write Applications | ✓ |
| `ats-interviews:read_interviews` | entity-read | Read Interviews | ✓ |
| `ats-interviews:write_interviews` | entity-write | Write Interviews | ✓ |
| `ats-interviews:read_interview_scorecards` | entity-read | Read Interview Scorecards | ✓ |
| `ats-interviews:write_interview_scorecards` | entity-write | Write Interview Scorecards | ✓ |
| `ats-interviews:read_candidate_assessments` | entity-read | Read Assessments | ✓ |
| `ats-interviews:write_candidate_assessments` | entity-write | Write Assessments | ✓ |
| `ats-interviews:read_interview_kits` | entity-read | Read Interview Kits | ✓ |
| `ats-interviews:write_interview_kits` | entity-write | Write Interview Kits | ✓ |
| `ats-interviews:read_interview_panels` | entity-read | Read Interview Panels | ✓ |
| `ats-interviews:write_interview_panels` | entity-write | Write Interview Panels | ✓ |
| `ats-interviews:read_candidate_assessment_templates` | entity-read | Read Candidate Assessment Templates | ✓ |
| `ats-interviews:write_candidate_assessment_templates` | entity-write | Write Candidate Assessment Templates | ✓ |
| `ats-interviews:read_interview_questions` | entity-read | Read Interview Questions | ✓ |
| `ats-interviews:write_interview_questions` | entity-write | Write Interview Questions | ✓ |
| `ats-interviews:read_interviewer_availability_slots` | entity-read | Read Interviewer Availability Slots | ✓ |
| `ats-interviews:write_interviewer_availability_slots` | entity-write | Write Interviewer Availability Slots | ✓ |
| `ats-candidate-crm:hire_candidate` | workflow-gate (lifecycle) | Transition `candidates` into state `hired` | ✓ |
| `ats-candidate-crm:flag_do_not_hire` | workflow-gate (lifecycle) | Transition `candidates` into state `do_not_hire` | ✓ |
| `ats-pre-employee-record:hire_candidate` | workflow-gate (lifecycle) | Transition `job_applications` into state `hired` | ✓ |
| `ats-candidate-crm:view_all_candidates` | override (personal_content) | View all `candidates` rows beyond row-scope | ✓ |
| `ats-candidate-crm:manage_all_candidates` | override (personal_content) | Manage all `candidates` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:view_all_applications` | override (personal_content) | View all `job_applications` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:manage_all_applications` | override (personal_content) | Manage all `job_applications` rows beyond row-scope | ✓ |
| `ats-interviews:view_all_interviews` | override (personal_content) | View all `interviews` rows beyond row-scope | ✓ |
| `ats-interviews:manage_all_interviews` | override (personal_content) | Manage all `interviews` rows beyond row-scope | ✓ |
| `ats-interviews:view_all_interview_scorecards` | override (personal_content) | View all `interview_scorecards` rows beyond row-scope | ✓ |
| `ats-interviews:manage_all_interview_scorecards` | override (personal_content) | Manage all `interview_scorecards` rows beyond row-scope | ✓ |

_Gates with no process: `ats-candidate-crm:flag_do_not_hire`. No Accountable can hold them, so this blueprint does not support `raci`._

### 8.2 Business rules

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `candidate_edit_scope` | `candidates` | has_personal_content | Row-scope by default; override via `ats-candidate-crm:view_all_candidates` / `ats-candidate-crm:manage_all_candidates` |
| `application_edit_scope` | `job_applications` | has_personal_content | Row-scope by default; override via `ats-recruitment-pipeline:view_all_applications` / `ats-recruitment-pipeline:manage_all_applications` |
| `interview_edit_scope` | `interviews` | has_personal_content | Row-scope by default; override via `ats-interviews:view_all_interviews` / `ats-interviews:manage_all_interviews` |
| `interview_scorecard_edit_scope` | `interview_scorecards` | has_personal_content | Row-scope by default; override via `ats-interviews:view_all_interview_scorecards` / `ats-interviews:manage_all_interview_scorecards` |

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `ATS-INTERVIEWS`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `ats-interviews_viewer` | `ats-interviews:read` |
| `ats-interviews_manager` | `ats-interviews:manage` |
| `ats-interviews_admin` | `ats-interviews:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `ats-interviews:admin` | `ats-interviews:manage` |
| `ats-interviews:manage` | `ats-interviews:read` |
| `ats-interviews:read` | `ats-candidate-crm:read_candidates` |
| `ats-interviews:read` | `ats-recruitment-pipeline:read_job_applications` |
| `ats-interviews:read` | `ats-interviews:read_interviews` |
| `ats-interviews:read` | `ats-interviews:read_interview_scorecards` |
| `ats-interviews:read` | `ats-interviews:read_candidate_assessments` |
| `ats-interviews:read` | `ats-interviews:read_interview_kits` |
| `ats-interviews:read` | `ats-interviews:read_interview_panels` |
| `ats-interviews:read` | `ats-interviews:read_candidate_assessment_templates` |
| `ats-interviews:read` | `ats-interviews:read_interview_questions` |
| `ats-interviews:read` | `ats-interviews:read_interviewer_availability_slots` |
| `ats-interviews:manage` | `ats-candidate-crm:write_candidates` |
| `ats-candidate-crm:write_candidates` | `ats-candidate-crm:read_candidates` |
| `ats-interviews:manage` | `ats-recruitment-pipeline:write_job_applications` |
| `ats-recruitment-pipeline:write_job_applications` | `ats-recruitment-pipeline:read_job_applications` |
| `ats-interviews:manage` | `ats-interviews:write_interviews` |
| `ats-interviews:write_interviews` | `ats-interviews:read_interviews` |
| `ats-interviews:manage` | `ats-interviews:write_interview_scorecards` |
| `ats-interviews:write_interview_scorecards` | `ats-interviews:read_interview_scorecards` |
| `ats-interviews:manage` | `ats-interviews:write_candidate_assessments` |
| `ats-interviews:write_candidate_assessments` | `ats-interviews:read_candidate_assessments` |
| `ats-interviews:admin` | `ats-interviews:write_interview_kits` |
| `ats-interviews:write_interview_kits` | `ats-interviews:read_interview_kits` |
| `ats-interviews:manage` | `ats-interviews:write_interview_panels` |
| `ats-interviews:write_interview_panels` | `ats-interviews:read_interview_panels` |
| `ats-interviews:admin` | `ats-interviews:write_candidate_assessment_templates` |
| `ats-interviews:write_candidate_assessment_templates` | `ats-interviews:read_candidate_assessment_templates` |
| `ats-interviews:admin` | `ats-interviews:write_interview_questions` |
| `ats-interviews:write_interview_questions` | `ats-interviews:read_interview_questions` |
| `ats-interviews:manage` | `ats-interviews:write_interviewer_availability_slots` |
| `ats-interviews:write_interviewer_availability_slots` | `ats-interviews:read_interviewer_availability_slots` |
| `ats-interviews:admin` | `ats-candidate-crm:hire_candidate` |
| `ats-interviews:admin` | `ats-candidate-crm:flag_do_not_hire` |
| `ats-interviews:admin` | `ats-pre-employee-record:hire_candidate` |
| `ats-interviews:admin` | `ats-candidate-crm:view_all_candidates` |
| `ats-interviews:admin` | `ats-candidate-crm:manage_all_candidates` |
| `ats-interviews:admin` | `ats-recruitment-pipeline:view_all_applications` |
| `ats-interviews:admin` | `ats-recruitment-pipeline:manage_all_applications` |
| `ats-interviews:admin` | `ats-interviews:view_all_interviews` |
| `ats-interviews:admin` | `ats-interviews:manage_all_interviews` |
| `ats-interviews:admin` | `ats-interviews:view_all_interview_scorecards` |
| `ats-interviews:admin` | `ats-interviews:manage_all_interview_scorecards` |

**Processes wired:**

| process_key | process_name | PCF code | PCF ID | level | description |
| --- | --- | --- | --- | --- | --- |
| `hire_candidate` | Hire candidate | 7.2.4.3 | 10465 | 4 | Wrapping up the process for hiring candidates. Agree to all hiring terms and conditions. Have the candidate accept and sign the job offer. |
| `interview_candidates` | Interview candidates | 7.2.3.2 | 10457 | 4 | Assessing the candidates by their performance in the interviews. Conduct HR interview, technical interview, hiring manager interview, etc. Understand the mindset of the candidate, and comprehend his/her personal and professional lives. |

**RACI realization:**

| actor | kind | raci | process_key | realization |
| --- | --- | --- | --- | --- |
| `RECRUITING-RECRUITER` | persona | responsible | `hire_candidate` | the gated entities' write tier |
| `HIRING-MANAGER` | persona | accountable | `hire_candidate` | grant gates [ats-candidate-crm:hire_candidate, ats-pre-employee-record:hire_candidate] + the gated entities' write tier |
| `LEGAL-COMPLIANCE-SPECIALIST` | persona | informed | `hire_candidate` | notify on trigger_events [candidate.hired] |
| `HIRING-MANAGER` | persona | responsible | `interview_candidates` | the gated entities' write tier |
| `RECRUITING-MANAGER` | persona | accountable | `interview_candidates` | the gated entities' write tier |
| `RECRUITING-RECRUITER` | persona | consulted | `interview_candidates` | advisory read grant |
| `RECRUITING-COORDINATOR` | persona | responsible | `interview_candidates` | the gated entities' write tier |

### 9.2 Functional ownership and default grants

| responsibility | business function | default role | default tier |
| --- | --- | --- | --- |
| owner | Recruiting | `admin` | `:admin` |
| contributor | Human Resources | `manager` | `:manage` |
| contributor | Legal | `manager` | `:manage` |
| consumer | Finance | `viewer` | `:read` |
