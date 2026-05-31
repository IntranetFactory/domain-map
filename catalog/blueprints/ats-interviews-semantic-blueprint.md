---
artifact: semantic-blueprint
fact_sheet_version: "2.0"
system_name: ATS-INTERVIEWS
system_description: Interviews
system_slug: ats-interviews
domain_modules:
  - ats-interviews
domain_code: ATS
related_modules: [ats-candidate-crm, ats-recruitment-pipeline, hcm-lifecycle-workflows, hiring-starter, pa-workforce-metrics, talent-performance-mgmt, talent-succession-career]
created_at: 2026-05-31
---

# Interviews

## 1. Overview

### 1.1 Analyst overview

Interview scheduling, panel coordination, scorecards, and structured assessments. Realizes INTERVIEW-MGMT. Realizes the `interviewing` lifecycle state on `job_applications` (state pruned when this module is not installed).

## 2. Entity summary

| Name | Description |
| --- | --- |
| Assessments | Skills, cognitive, technical, or personality test result attached to an application. Often sourced from an external assessment provider and referenced here. |
| Candidate Assessment Templates | Library item for assessments (coding challenge, work sample, take-home, skills test). Carries title, vendor, time limit, scoring rubric. Materializes into candidate_assessments when assigned. |
| Interview Kits | Reusable interview template per role / stage. Bundles assigned questions, target competencies, recommended scorecard, expected duration. Greenhouse's core authoring unit. |
| Interview Panels | Composition of interviewers assigned to a specific interview, including their role on the panel (lead, technical, behavioral, debrief moderator) and weighting on the consolidated scorecard. |
| Interview Questions | Question bank entry tied to competencies. Carries question text, type (behavioral / technical / situational), competency tags, suggested follow-ups, rubric. |
| Interview Scorecards | Structured interviewer feedback against a defined rubric: per-competency ratings, written notes, and a hire/no-hire recommendation. |
| Interviewer Availability Slots | Bookable time window an interviewer has marked available. Drives self-serve scheduling (Goodtime / Modern Hire / Calendly for Recruiting). Carries interviewer, start, end, allowed interview types. |
| Interviews | Scheduled assessment event between a candidate and one or more interviewers. Carries time, location/medium, panel, interview kit, and outcome. |
| Applications | A candidate's submission against a specific requisition. Carries pipeline stage, status (active / rejected / withdrawn / hired), source, and the full evaluation history. |
| Candidates | Person known to the recruiting org, with or without an active application. Carries contact details, resume, tags, GDPR consent, and source. Distinct from Employee until hired. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef embedded_master fill:#fff4cc,stroke:#c79100,color:#5b4500;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  interviews["Interviews"]
  interview_scorecards["Interview Scorecards"]
  candidates["Candidates"]
  job_applications["Applications"]
  candidate_assessments["Assessments"]
  interview_kits["Interview Kits"]
  interview_panels["Interview Panels"]
  candidate_assessment_templates["Candidate Assessment Templates"]
  interview_questions["Interview Questions"]
  interviewer_availability_slots["Interviewer Availability Slots"]
  users["Users"]
  interview_kits -->|"shapes (opt)"| interviews
  interview_kits -->|"includes (opt)"| interview_questions
  interviews -->|"convenes"| interview_panels
  interview_panels -->|"produces (opt)"| interview_scorecards
  candidate_assessment_templates -->|"instantiates_as (opt)"| candidate_assessments
  interviewer_availability_slots -->|"booked_for (opt)"| interviews
  candidates -->|"submits"| job_applications
  job_applications -->|"schedules"| interviews
  interviews -->|"is scored via"| interview_scorecards
  job_applications -->|"requires"| candidate_assessments
  candidates -->|"has owning recruiter (opt)"| users
  candidate_assessments -->|"has invitation author"| users
  job_applications -->|"has owning recruiter"| users
  interviews -->|"has coordinator and panelists"| users
  interview_scorecards -->|"has interviewer as author"| users
  class interviews master;
  class interview_scorecards master;
  class candidates embedded_master;
  class job_applications embedded_master;
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

| # | data_object | role | mastered in | label | necessity | pattern flags | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | `candidate_assessments` (Assessments) | master | - | - | required | submit_lock | - |
| 2 | `candidate_assessment_templates` (Candidate Assessment Templates) | master | - | - | required | - | - |
| 3 | `interview_kits` (Interview Kits) | master | - | - | required | - | - |
| 4 | `interview_panels` (Interview Panels) | master | - | - | required | - | - |
| 5 | `interview_questions` (Interview Questions) | master | - | - | required | - | - |
| 6 | `interview_scorecards` (Interview Scorecards) | master | - | - | required | personal_content, submit_lock | - |
| 7 | `interviewer_availability_slots` (Interviewer Availability Slots) | master | - | - | optional | - | - |
| 8 | `interviews` (Interviews) | master | - | - | required | - | - |
| 9 | `job_applications` (Applications) | embedded_master | `ats-recruitment-pipeline` | Recruitment Pipeline | required | personal_content | - |
| 10 | `candidates` (Candidates) | embedded_master | `ats-candidate-crm` | Candidate CRM | required | personal_content | - |

## 4. Aliases and industry synonyms

_(no industry-scoped aliases or non-synonym alias types loaded for this scope; generic synonyms are omitted as common knowledge.)_

## 5. Relationships

### 5.1 Intra-scope edges

| from | verb | to | cardinality | kind | necessity | owner_side | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `interview_kits` | shapes | `interviews` | one_to_many | reference | optional | source | - |
| `interview_kits` | includes | `interview_questions` | many_to_many | reference | optional | source | - |
| `interviews` | convenes | `interview_panels` | one_to_one | composition | required | source | - |
| `interview_panels` | produces | `interview_scorecards` | one_to_many | composition | optional | source | - |
| `candidate_assessment_templates` | instantiates_as | `candidate_assessments` | one_to_many | reference | optional | source | - |
| `interviewer_availability_slots` | booked_for | `interviews` | one_to_one | reference | optional | source | - |
| `candidates` | submits | `job_applications` | one_to_many | reference | required | target | - |
| `job_applications` | schedules | `interviews` | one_to_many | reference | required | source | - |
| `interviews` | is scored via | `interview_scorecards` | one_to_many | reference | required | source | - |
| `job_applications` | requires | `candidate_assessments` | one_to_many | reference | required | source | - |

### 5.2 Built-in edges (`users` and other platform built-ins)

| from | verb | to | cardinality | necessity | owner_side | notes |
| --- | --- | --- | --- | --- | --- | --- |
| `candidates` | has owning recruiter | `users` | many_to_many | optional | source | - |
| `candidate_assessments` | has invitation author | `users` | many_to_many | required | source | - |
| `job_applications` | has owning recruiter | `users` | many_to_many | required | source | - |
| `interviews` | has coordinator and panelists | `users` | many_to_many | required | source | - |
| `interview_scorecards` | has interviewer as author | `users` | many_to_many | required | source | - |

### 5.3 Cross-scope edges

#### 5.3a Outbound from this scope's masters and contributors

_Edges this scope drives: the in-scope endpoint has `role` of `master` or `contributor`._

_(no outbound cross-scope edges from this scope's masters or contributors.)_

#### 5.3b Context edges on embedded shells and consumed entities

_Edges the canonical owner drives, shown for context: the in-scope endpoint has `role` of `embedded_master`, `consumer`, or `derived`._

<details>
<summary>28 context edges</summary>

| from | verb | to | cardinality | necessity | notes |
| --- | --- | --- | --- | --- | --- |
| `candidates` | engaged_via | `candidate_engagements` | one_to_many | optional | - |
| `candidates` | attends_via | `recruiting_event_attendances` | one_to_many | required | - |
| `candidates` | noted_via | `recruiter_interactions` | one_to_many | optional | - |
| `candidates` | consents_via | `candidate_consents` | one_to_many | required | - |
| `candidates` | member_of_via | `talent_pool_memberships` | one_to_many | required | - |
| `candidates` | discloses_via | `fcra_disclosures` | one_to_many | required | - |
| `job_applications` | transitions_via | `application_stage_transitions` | one_to_many | required | - |
| `job_applications` | answers_via | `application_screening_answers` | one_to_many | optional | - |
| `candidates` | self_identifies_via | `eeo_responses` | one_to_many | optional | - |
| `candidates` | submits_via | `data_subject_requests` | one_to_many | optional | - |
| `candidates` | self_ids_via | `voluntary_self_identifications` | one_to_many | optional | - |
| `candidates` | acknowledges_via | `fcra_summary_of_rights_acknowledgements` | one_to_many | optional | - |
| `job_applications` | disposed_via | `application_dispositions` | one_to_many | optional | - |
| `job_applications` | logged_via | `applicant_flow_records` | one_to_one | required | - |
| `candidates` | documented_via | `candidate_documents` | one_to_many | optional | - |
| `candidates` | annotated_via | `candidate_notes` | one_to_many | optional | - |
| `candidates` | tagged_via | `candidate_tag_assignments` | one_to_many | optional | - |
| `skill_profiles` | feeds | `candidates` | one_to_many | optional | - |
| `job_requisitions` | receives | `job_applications` | one_to_many | required | - |
| `job_postings` | is applied to via | `job_applications` | one_to_many | required | - |
| `candidate_referrals` | introduces | `candidates` | one_to_many | required | - |
| `recruitment_sources` | attributes | `candidates` | one_to_many | required | - |
| `recruitment_agencies` | sources | `candidates` | one_to_many | required | - |
| `recruitment_events` | attracts | `candidates` | one_to_many | required | - |
| `talent_pools` | groups | `candidates` | many_to_many | required | - |
| `job_applications` | results in | `job_offers` | one_to_many | required | - |
| `candidates` | becomes | `employees` | one_to_one | required | - |
| `candidates` | becomes pre-employee | `pre_employees` | one_to_one | required | - |

</details>

## 6. Cross-domain context

### 6.1 Master consumers (other modules / domains that embed this scope's masters)

| data_object | other module / domain | role | necessity | notes |
| --- | --- | --- | --- | --- |
| `candidate_assessments` | HCM-LIFECYCLE-WORKFLOWS (Employee Lifecycle Workflows) - HCM | consumer | required | - |
| `candidate_assessments` | TALENT-PERFORMANCE-MGMT (Performance and Goal Management) - TALENT-MGMT | consumer | optional | - |
| `interview_scorecards` | HIRING-STARTER (Hiring Starter) - ATS | embedded_master | optional | - |
| `interviews` | HIRING-STARTER (Hiring Starter) - ATS | embedded_master | required | - |

### 6.2 Outbound handoffs (events this scope publishes)

| source module | target domain | target module | trigger_event | payload | integration | friction | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ATS-INTERVIEWS | HCM | HCM-LIFECYCLE-WORKFLOWS | `candidate_assessment.passed` | `candidate_assessments` | event_stream | medium | Passing an assessment advances the candidate; on eventual hire, HCM uses the assessment result as the first data point for the new-hire skill profile. |
| ATS-INTERVIEWS | HCM | HCM-LIFECYCLE-WORKFLOWS | `candidate_assessment.failed` | `candidate_assessments` | event_stream | low | Failed-assessment outcomes close the candidate's loop in ATS and propagate to HCM only if the candidate is an internal-mobility applicant whose profile should reflect the development gap. |
| ATS-INTERVIEWS | ATS | ATS-RECRUITMENT-PIPELINE | `interview.completed` | `job_applications` | lifecycle_progression | low | - |
| ATS-INTERVIEWS | ATS | ATS-RECRUITMENT-PIPELINE | `candidate_assessment.failed` | `job_applications` | lifecycle_progression | low | - |
| ATS-INTERVIEWS | ATS | ATS-RECRUITMENT-PIPELINE | `candidate_assessment.passed` | `job_applications` | lifecycle_progression | low | - |
| ATS-INTERVIEWS | TALENT-MGMT | TALENT-SUCCESSION-CAREER | `candidate_assessment.passed` | `candidate_assessments` | api_call | medium | Completed assessment scores seed the talent-management skill profile for hired candidates and a structured talent pool for non-hires. |
| ATS-INTERVIEWS | PA | PA-WORKFORCE-METRICS | `interview_scorecard.submitted` | `interview_scorecards` | event_stream | low | - |

### 6.3 Inbound handoffs (events this scope reacts to)

| target module | source domain | source module | trigger_event | payload | integration | friction | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ATS-INTERVIEWS | ATS | ATS-RECRUITMENT-PIPELINE | `job_application.advanced` | `interviews` | lifecycle_progression | low | - |

### 6.4 Master providers (modules / domains that own masters this scope embeds)

| data_object | role here | necessity | canonical owner(s) | slice notes |
| --- | --- | --- | --- | --- |
| `candidates` | embedded_master | required | ATS-CANDIDATE-CRM (ATS) | - |
| `job_applications` | embedded_master | required | ATS-RECRUITMENT-PIPELINE (ATS) | - |

## 7. Lifecycle states (per touched entity)

### `candidate_assessment_templates` (Candidate Assessment Template)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | - | - | Template being authored / validated. |
| 2 | `active` | - | - | - | - | Template assignable to candidates. |
| 3 | `retired` | - | ✓ | - | - | Template no longer assignable. |

### `candidate_assessments` (Assessment)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `invited` | ✓ | - | - | - | Assessment invitation sent to the candidate by the partner system. |
| 2 | `in_progress` | - | - | - | - | Candidate is actively taking the assessment. |
| 3 | `completed` | - | ✓ | - | - | Candidate finished the assessment and a score/result is recorded. |
| 4 | `expired` | - | ✓ | - | - | Invitation lapsed before the candidate completed the assessment. |
| 5 | `cancelled` | - | ✓ | - | - | Assessment withdrawn before completion. |

### `candidates` (Candidate)

_This scope holds `candidates` as **embedded_master**; the canonical state machine is owned by `ATS-CANDIDATE-CRM`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `prospect` | ✓ | - | - | - | Person known to the recruiting org with no active application. |
| 2 | `active` | - | - | - | - | Candidate has at least one open application or is actively engaged. |
| 3 | `hired` | - | ✓ | ✓ | `ats-candidate-crm:hire_candidate` | Candidate accepted an offer and converted to employee. |
| 4 | `do_not_hire` | - | ✓ | ✓ | `ats-candidate-crm:flag_do_not_hire` | Candidate flagged as ineligible for future consideration; gated decision. |
| 5 | `archived` | - | ✓ | - | - | Candidate kept in the database but not active in any pipeline. |

### `interview_kits` (Interview Kit)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | - | - | Kit being authored. |
| 2 | `active` | - | - | - | - | Kit in use for live interviews. |
| 3 | `archived` | - | ✓ | - | - | Kit retired; no new interviews schedule against it. |

### `interview_panels` (Interview Panel)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `forming` | ✓ | - | - | - | Recruiter assembling the panel. |
| 2 | `assembled` | - | - | - | - | All panel members confirmed; interview can proceed. |
| 3 | `completed` | - | ✓ | - | - | Interview held; consolidated debrief done. |
| 4 | `cancelled` | - | ✓ | - | - | Panel disbanded before interview. |

### `interview_scorecards` (Interview Scorecard)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | - | - | Interviewer is filling in ratings and notes against the rubric. |
| 2 | `submitted` | - | ✓ | ✓ | `ats-interviews:submit_scorecard` | Scorecard submitted and locked; hire/no-hire recommendation recorded. |

### `interviewer_availability_slots` (Interviewer Availability Slot)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `available` | ✓ | - | - | - | Slot bookable. |
| 2 | `booked` | - | - | - | - | Slot reserved for an interview. |
| 3 | `released` | - | ✓ | - | - | Booking cancelled; slot freed. |
| 4 | `past` | - | ✓ | - | - | Slot expired without booking. |

### `interviews` (Interview)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `scheduled` | ✓ | - | - | - | Interview booked with candidate, panel, time, and medium. |
| 2 | `confirmed` | - | - | - | - | Candidate and panel confirmed attendance. |
| 3 | `completed` | - | ✓ | - | - | Interview took place; scorecards are being collected. |
| 4 | `no_show` | - | ✓ | - | - | Candidate or panel did not attend; interview did not occur. |
| 5 | `cancelled` | - | ✓ | - | - | Interview cancelled before it took place. |
| 6 | `rescheduled` | - | ✓ | - | - | Original slot abandoned in favor of a new scheduled interview record. |

### `job_applications` (Application)

_This scope holds `job_applications` as **embedded_master**; the canonical state machine is owned by `ATS-RECRUITMENT-PIPELINE`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `applied` | ✓ | - | - | - | Candidate submitted an application against the requisition. |
| 2 | `screening` | - | - | - | - | Recruiter is reviewing resume and qualifications. |
| 3 | `interviewing` | - | - | - | - | Candidate is progressing through interview loops. |
| 4 | `offer_extended` | - | - | - | - | An offer has been generated and is in flight for this application. |
| 5 | `hired` | - | ✓ | ✓ | `ats-pre-employee-record:hire_candidate` | Candidate accepted the offer and was hired; gated transition. |
| 6 | `rejected` | - | ✓ | - | - | Application closed without progression by recruiter or hiring manager. |
| 7 | `withdrawn` | - | ✓ | - | - | Candidate withdrew their application. |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `ats-interviews:read` | baseline-read | Read access to every entity in the module | ✓ |
| `ats-interviews:manage` | baseline-manage | Edit operational records | ✓ |
| `ats-interviews:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `ats-interviews:submit_scorecard` | workflow-gate (lifecycle) | Transition `interview_scorecards` into state `submitted` | ✓ |
| `ats-interviews:view_all_interview_scorecards` | override (personal_content) | View all `interview_scorecards` rows beyond row-scope | ✓ |
| `ats-interviews:manage_all_interview_scorecards` | override (personal_content) | Manage all `interview_scorecards` rows beyond row-scope | ✓ |
| `ats-interviews:submit_interview_scorecard` | override (submit_lock) | Submit and lock a `interview_scorecards` row (post-submit edits gated) | ✓ |
| `ats-interviews:submit_assessment` | override (submit_lock) | Submit and lock a `candidate_assessments` row (post-submit edits gated) | ✓ |

### 8.2 Business rules

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `interview_scorecard_edit_scope` | `interview_scorecards` | has_personal_content | Row-scope by default; override via `ats-interviews:view_all_interview_scorecards` / `ats-interviews:manage_all_interview_scorecards` |
| `submit_restricted_to_interview_scorecard_owner` | `interview_scorecards` | has_submit_lock | Only the row's authoring user can submit; post-submit the row is read-only except via `ats-interviews:manage_all_interview_scorecards` |
| `submit_restricted_to_assessment_owner` | `candidate_assessments` | has_submit_lock | Only the row's authoring user can submit; post-submit the row is read-only except via `ats-interviews:manage_all_assessments` |
