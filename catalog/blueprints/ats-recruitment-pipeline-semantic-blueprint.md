---
artifact: semantic-blueprint
version: "3.1"
license: MIT
system_name: Recruitment Pipeline
tagline: Move applicants from requisition to decision on a structured, auditable pipeline.
description: |
  Open and approve requisitions, distribute postings, collect applications, and advance candidates through configurable stages, with screening questions, stage transitions, and hiring-team assignments captured as you go.

  Applicant-flow and disposition records are built in, so equal-opportunity reporting is a by-product of normal work rather than a separate project.
system_slug: ats-recruitment-pipeline
domain_modules:
  - ats-recruitment-pipeline
domain_code: ATS
icon_name: user-plus
related_modules: [ats-candidate-crm, ats-interviews, ats-offers, ats-pre-employee-record, ats-referrals, ats-talent-pools, ben-enrollment, comp-benchmarking, comp-planning, cwm-worker-sourcing, hcm-core-worker, hcm-lifecycle-workflows, hcm-org-positions, hiring-starter, iga-access-request, iwms-location-master, lms-compliance-training, lms-ct-gdpr, onb-journey-mgmt, psa-resource-mgmt, skills-mgmt-profile, swp-demand-forecast, tlnt-intel-mobility]
persona: [HIRING-MANAGER, HR-BUSINESS-PARTNER, HR-HRIS-ADMIN, HR-ORG-DESIGN-ANALYST, LEGAL-COMPLIANCE-SPECIALIST, PEOPLE-MANAGER, RECRUITING-MANAGER, RECRUITING-RECRUITER, RECRUITING-SOURCER]
supports_raci: false
created_at: 2026-11-04
---

# Recruitment Pipeline

## 1. Overview

Requisitions → postings → applications with pipeline-stage lifecycle. Realizes REQ-MGMT and CANDIDATE-EXP (application flow slice). Embedded-masters `candidates`, optionally `hcm_positions` and `org_units` for canonical position/org context.

## 2. Entity summary

| Name | data_object | Description |
| --- | --- | --- |
| Applicant Flow Records | `applicant_flow_records` | OFCCP-mandated logs of every internet applicant against a requisition, capturing demographics, expressed interest, qualifications, and disposition for audit. |
| Application Dispositions | `application_dispositions` | Categorized reasons a job application was not selected, driving OFCCP applicant-flow reporting and internal hiring analytics. |
| Application Screening Answers | `application_screening_answers` | Candidate answers to screening questions on a specific job application, used to auto-disqualify on knockout rules. |
| Application Screening Questions | `application_screening_questions` | Custom screening questions attached to a job posting or template, including knockout and qualifying questions with their answer type and rules. |
| Application Stage Transitions | `application_stage_transitions` | Audit-trail records of an application moving between stages, with from-stage, to-stage, actor, timestamp, and reason for cycle-time analytics. |
| Application Stages | `application_stages` | Configured stages in the recruiting pipeline (sourced, applied, screened, onsite, offer, hired) that define a job application's lifecycle. |
| Applications | `job_applications` | Candidate submissions for a specific job, with pipeline stage, status, and source. |
| EEO Responses | `eeo_responses` | Voluntary self-identification submitted by applicants for equal-employment reporting, stored separately from candidate records per regulation. |
| Hiring Team Assignments | `hiring_team_assignments` | Assignments of specific users to recruiter, hiring manager, coordinator, interviewer, and reviewer roles on a single requisition. |
| Job Posting Distributions | `job_posting_distributions` | Syndications of a job posting to external boards, with board name, post and expiry times, cost, and applicant attribution. |
| Job Postings | `job_postings` | Published, candidate-facing versions of a job on a career site or job board, one job possibly having many postings. |
| Job Requisitions | `job_requisitions` | Requests to hire for a specific role, carrying headcount, level, location, hiring manager, recruiter, and status. |
| OFCCP Audit Trails | `ofccp_audit_trails` | Immutable, append-only audit logs of every applicant-flow event for federal contractors, carrying the actor, timestamp, and compliance-relevant fields. |
| Requisition Approvals | `requisition_approvals` | Approval steps that gate opening a job requisition, each recording the approver, decision, timestamp, and rationale. |
| Voluntary Self-Identifications | `voluntary_self_identifications` | Voluntary candidate disclosures of protected-class membership per EEOC and OFCCP requirements, recording the offer or decline-to-answer decision and audit metadata. |
| Candidates | `candidates` | People known to the recruiting organization, with or without an active application, carrying contact details, resume, tags, consent, and source. |
| Job Profiles | `job_profiles` | Canonical role definitions in the job catalog: title, family, level, responsibilities, required skills, pay range, and FLSA class. Many positions share one profile. |
| Locations | `locations` | Physical or organizational locations referenced across the system, used to place and group other records. |
| Org Units | `org_units` | Nodes in the organizational hierarchy such as divisions, departments, and teams, with manager, cost center alignment, geographic scope, and parent-child relationships. |
| Positions | `hcm_positions` | Approved org slots with role definition, cost center, reporting line, location, and FTE allocation. Each can be open, filled, or eliminated. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef embedded_master fill:#fff4cc,stroke:#c79100,color:#5b4500;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  job_requisitions["Job Requisitions"]
  job_postings["Job Postings"]
  candidates["Candidates"]
  job_applications["Applications"]
  hcm_positions["Positions"]
  job_profiles["Job Profiles"]
  org_units["Org Units"]
  locations["Locations"]
  application_stages["Application Stages"]
  application_stage_transitions["Application Stage Transitions"]
  requisition_approvals["Requisition Approvals"]
  job_posting_distributions["Job Posting Distributions"]
  application_screening_questions["Application Screening Questions"]
  application_screening_answers["Application Screening Answers"]
  eeo_responses["EEO Responses"]
  applicant_flow_records["Applicant Flow Records"]
  application_dispositions["Application Dispositions"]
  voluntary_self_identifications["Voluntary Self-Identifications"]
  ofccp_audit_trails["OFCCP Audit Trails"]
  hiring_team_assignments["Hiring Team Assignments"]
  users["Users"]
  org_units -->|"contains"| hcm_positions
  job_profiles -->|"defines"| hcm_positions
  hcm_positions -->|"spawns"| job_requisitions
  job_profiles -->|"feeds"| job_postings
  job_requisitions -->|"is advertised through"| job_postings
  job_requisitions -->|"receives"| job_applications
  job_postings -->|"is applied to via"| job_applications
  candidates -->|"submits"| job_applications
  org_units -->|"parent of"| org_units
  locations -->|"parent of"| locations
  job_requisitions -->|"defines_pipeline"| application_stages
  job_applications -->|"transitions_via"| application_stage_transitions
  application_stages -->|"receives"| application_stage_transitions
  job_requisitions -->|"gated_by"| requisition_approvals
  job_postings -->|"syndicates_via"| job_posting_distributions
  job_postings -->|"asks"| application_screening_questions
  job_applications -->|"answers_via"| application_screening_answers
  application_screening_questions -->|"answered_by"| application_screening_answers
  candidates -->|"self_identifies_via"| eeo_responses
  candidates -->|"self_ids_via"| voluntary_self_identifications
  job_applications -->|"disposed_via"| application_dispositions
  job_applications -->|"logged_via"| applicant_flow_records
  job_requisitions -->|"staffed_by"| hiring_team_assignments
  applicant_flow_records -->|"audited_via"| ofccp_audit_trails
  users -->|"manages"| hcm_positions
  users -->|"leads"| org_units
  users -->|"owns"| job_profiles
  users -->|"is recruiter for"| job_requisitions
  users -->|"owns as recruiter"| job_applications
  org_units -->|"has members"| users
  locations -->|"houses"| users
  users -->|"is assigned to"| hiring_team_assignments
  users -->|"owns as recruiter"| candidates
  users -->|"publishes"| job_postings
  users -->|"authors"| application_stage_transitions
  users -->|"owns"| applicant_flow_records
  users -->|"approves"| requisition_approvals
  users -->|"authors"| ofccp_audit_trails
  users -->|"is hiring manager for"| job_requisitions
  class job_requisitions master;
  class job_postings master;
  class candidates embedded_master;
  class job_applications master;
  class hcm_positions embedded_master;
  class job_profiles embedded_master;
  class org_units embedded_master;
  class locations embedded_master;
  class application_stages master;
  class application_stage_transitions master;
  class requisition_approvals master;
  class job_posting_distributions master;
  class application_screening_questions master;
  class application_screening_answers master;
  class eeo_responses master;
  class applicant_flow_records master;
  class application_dispositions master;
  class voluntary_self_identifications master;
  class ofccp_audit_trails master;
  class hiring_team_assignments master;
  class users platform_builtin;
  style hcm_positions stroke-dasharray:5 5;
  style org_units stroke-dasharray:5 5;
  style locations stroke-dasharray:5 5;
  style eeo_responses stroke-dasharray:5 5;
  style applicant_flow_records stroke-dasharray:5 5;
  style application_dispositions stroke-dasharray:5 5;
  style voluntary_self_identifications stroke-dasharray:5 5;
  style ofccp_audit_trails stroke-dasharray:5 5;
```

## 3. Entities catalog

| # | data_object | catalog code | singular | plural | held_as | mastered in | mastered label | install_optional | personal_content | entity_type | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `applicant_flow_records` | `applicant_flow_records` | Applicant Flow Record | Applicant Flow Records | master | - | - | yes | yes | operational_workflow | `:manage` | - |
| 2 | `application_dispositions` | `application_dispositions` | Application Disposition | Application Dispositions | master | - | - | yes | - | operational_record | `:manage` | - |
| 3 | `application_screening_answers` | `application_screening_answers` | Application Screening Answer | Application Screening Answers | master | - | - | - | yes | operational_record | `:manage` | - |
| 4 | `application_screening_questions` | `application_screening_questions` | Application Screening Question | Application Screening Questions | master | - | - | - | - | catalog | `:admin` | - |
| 5 | `application_stage_transitions` | `application_stage_transitions` | Application Stage Transition | Application Stage Transitions | master | - | - | - | - | operational_record | `:manage` | - |
| 6 | `application_stages` | `application_stages` | Application Stage | Application Stages | master | - | - | - | - | catalog | `:admin` | - |
| 7 | `job_applications` | `job_applications` | Application | Applications | master | - | - | - | yes | operational_workflow | `:manage` | - |
| 8 | `eeo_responses` | `eeo_responses` | EEO Response | EEO Responses | master | - | - | yes | yes | operational_workflow | `:manage` | - |
| 9 | `hiring_team_assignments` | `hiring_team_assignments` | Hiring Team Assignment | Hiring Team Assignments | master | - | - | - | - | junction | `:manage` | - |
| 10 | `job_posting_distributions` | `job_posting_distributions` | Job Posting Distribution | Job Posting Distributions | master | - | - | - | - | operational_workflow | `:manage` | - |
| 11 | `job_postings` | `job_postings` | Job Posting | Job Postings | master | - | - | - | - | operational_workflow | `:manage` | - |
| 12 | `job_requisitions` | `job_requisitions` | Job Requisition | Job Requisitions | master | - | - | - | - | operational_workflow | `:manage` | - |
| 13 | `ofccp_audit_trails` | `ofccp_audit_trails` | OFCCP Audit Trail | OFCCP Audit Trails | master | - | - | yes | - | operational_record | `:manage` | - |
| 14 | `requisition_approvals` | `requisition_approvals` | Requisition Approval | Requisition Approvals | master | - | - | - | - | operational_workflow | `:manage` | - |
| 15 | `voluntary_self_identifications` | `voluntary_self_identifications` | Voluntary Self-Identification | Voluntary Self-Identifications | master | - | - | yes | yes | operational_record | `:manage` | - |
| 16 | `candidates` | `candidates` | Candidate | Candidates | embedded_master | `ats-candidate-crm` | Candidate CRM | - | yes | operational_workflow | `:manage` | - |
| 17 | `job_profiles` | `job_profiles` | Job Profile | Job Profiles | embedded_master | `hcm-org-positions` | Organization and Position Management | - | - | catalog | `:admin` | - |
| 18 | `locations` | `locations` | Location | Locations | embedded_master | `iwms-location-master` | Location and Property Master | yes | - | catalog | `:admin` | - |
| 19 | `org_units` | `org_units` | Org Unit | Org Units | embedded_master | `hcm-org-positions` | Organization and Position Management | yes | - | operational_workflow | `:manage` | - |
| 20 | `hcm_positions` | `hcm_positions` | Position | Positions | embedded_master | `hcm-org-positions` | Organization and Position Management | yes | - | operational_workflow | `:manage` | - |

## 4. Aliases and industry synonyms

_(none: no industry-scoped aliases for this scope)_

## 5. Relationships

_`field_required` applies only when both entities are installed. It never makes an entity required._

### 5.1 Relationships between entities in this blueprint

| from | verb | to | cardinality | kind | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `org_units` | contains | `hcm_positions` | one_to_many | reference | yes | restrict | reference | - |
| `job_profiles` | defines | `hcm_positions` | one_to_many | reference | yes | restrict | reference | - |
| `hcm_positions` | spawns | `job_requisitions` | one_to_many | reference | no | clear | reference | - |
| `job_profiles` | feeds | `job_postings` | one_to_many | reference | no | clear | reference | - |
| `job_requisitions` | is advertised through | `job_postings` | one_to_many | reference | no | clear | reference | - |
| `job_requisitions` | receives | `job_applications` | one_to_many | reference | no | clear | reference | - |
| `job_postings` | is applied to via | `job_applications` | one_to_many | reference | no | clear | reference | - |
| `candidates` | submits | `job_applications` | one_to_many | reference | yes | restrict | reference | - |
| `org_units` | parent of | `org_units` | one_to_many | reference | no | clear | reference | - |
| `locations` | parent of | `locations` | one_to_many | reference | no | clear | reference | - |
| `job_requisitions` | defines_pipeline | `application_stages` | one_to_many | reference | no | clear | reference | - |
| `job_applications` | transitions_via | `application_stage_transitions` | one_to_many | composition | yes | cascade | parent | - |
| `application_stages` | receives | `application_stage_transitions` | one_to_many | reference | yes | restrict | reference | - |
| `job_requisitions` | gated_by | `requisition_approvals` | one_to_many | composition | yes | cascade | parent | - |
| `job_postings` | syndicates_via | `job_posting_distributions` | one_to_many | composition | yes | cascade | parent | - |
| `job_postings` | asks | `application_screening_questions` | one_to_many | composition | yes | cascade | parent | - |
| `job_applications` | answers_via | `application_screening_answers` | one_to_many | composition | yes | cascade | parent | - |
| `application_screening_questions` | answered_by | `application_screening_answers` | one_to_many | reference | yes | restrict | reference | - |
| `candidates` | self_identifies_via | `eeo_responses` | one_to_many | composition | yes | cascade | parent | - |
| `candidates` | self_ids_via | `voluntary_self_identifications` | one_to_many | composition | yes | cascade | parent | - |
| `job_applications` | disposed_via | `application_dispositions` | one_to_many | composition | yes | cascade | parent | - |
| `job_applications` | logged_via | `applicant_flow_records` | one_to_one | composition | yes | cascade | parent | - |
| `job_requisitions` | staffed_by | `hiring_team_assignments` | one_to_many | composition | yes | cascade | parent | - |
| `applicant_flow_records` | audited_via | `ofccp_audit_trails` | one_to_many | composition | yes | cascade | parent | - |

### 5.2 Relationships to platform built-ins (`users`)

| from | verb | to | cardinality | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `users` | manages | `hcm_positions` | one_to_many | no | clear | reference | - |
| `users` | leads | `org_units` | one_to_many | no | clear | reference | - |
| `users` | owns | `job_profiles` | one_to_many | no | clear | reference | - |
| `users` | is recruiter for | `job_requisitions` | one_to_many | yes | restrict | reference | - |
| `users` | owns as recruiter | `job_applications` | one_to_many | no | clear | reference | - |
| `org_units` | has members | `users` | one_to_many | no | clear | reference | - |
| `locations` | houses | `users` | one_to_many | no | clear | reference | - |
| `users` | is assigned to | `hiring_team_assignments` | one_to_many | yes | restrict | reference | - |
| `users` | owns as recruiter | `candidates` | one_to_many | no | clear | reference | - |
| `users` | publishes | `job_postings` | one_to_many | yes | restrict | reference | - |
| `users` | authors | `application_stage_transitions` | one_to_many | no | clear | reference | - |
| `users` | owns | `applicant_flow_records` | one_to_many | no | clear | reference | - |
| `users` | approves | `requisition_approvals` | one_to_many | yes | restrict | reference | - |
| `users` | authors | `ofccp_audit_trails` | one_to_many | no | clear | reference | - |
| `users` | is hiring manager for | `job_requisitions` | one_to_many | yes | restrict | reference | - |

### 5.3 Relationships to entities outside this blueprint

_External entities are optional: this blueprint never installs them. If one exists at install, the relationship is proposed. A many-to-many relationship is listed under outgoing and proposed as a new junction table._

#### 5.3a Outgoing relationships: this blueprint's entity points to the external entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `cost_centers` | funds | `org_units` | one_to_many | yes | - |
| `job_profiles` | maps_to | `skill_profiles` | many_to_many | - | - |
| `job_profiles` | maps_to | `courses` | many_to_many | - | - |
| `salary_bands` | anchors | `hcm_positions` | one_to_many | no | - |
| `salary_bands` | bands | `job_profiles` | one_to_many | no | - |
| `employees` | fills | `hcm_positions` | one_to_one | no | - |
| `job_profiles` | requires | `learning_paths` | many_to_many | - | - |
| `job_profiles` | expects | `skill_profiles` | many_to_many | - | - |
| `skill_profiles` | feeds | `candidates` | one_to_many | no | - |
| `org_units` | sponsors | `benefit_plans` | many_to_many | - | - |
| `survey_campaigns` | targets | `org_units` | many_to_many | - | - |
| `recruitment_sources` | attributes | `candidates` | one_to_many | no | - |
| `recruitment_agencies` | sources | `candidates` | one_to_many | no | - |
| `recruitment_events` | attracts | `candidates` | one_to_many | no | - |
| `talent_pools` | groups | `candidates` | many_to_many | - | - |
| `job_requisitions` | updates | `position_demand_forecasts` | many_to_many | - | - |
| `headcount_plans` | authorizes | `job_requisitions` | one_to_many | no | - |
| `position_demand_forecasts` | triggers | `job_requisitions` | one_to_many | no | - |
| `workforce_scenarios` | drives | `hcm_positions` | one_to_many | no | - |
| `org_designs` | proposes | `hcm_positions` | one_to_many | no | - |
| `employees` | applies_as | `candidates` | one_to_many | no | - |
| `recruitment_sources` | attributes | `job_applications` | one_to_many | no | - |

#### 5.3b Incoming relationships: the external entity points to this blueprint's entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `org_units` | groups | `employees` | one_to_many | yes | - |
| `org_units` | engages | `contingent_workers` | one_to_many | no | - |
| `org_units` | is_scored_by | `engagement_drivers` | one_to_many | no | - |
| `org_units` | is_measured_by | `people_kpis` | one_to_many | no | - |
| `org_units` | triggers | `iga_entitlement_definitions` | one_to_many | no | - |
| `org_units` | maps_to | `cost_centers` | one_to_one | no | - |
| `hcm_positions` | requires | `compliance_assignments` | one_to_many | no | - |
| `org_units` | sponsors | `compliance_assignments` | one_to_many | no | - |
| `org_units` | owns | `action_plans` | one_to_many | no | - |
| `candidates` | is referred through | `candidate_referrals` | one_to_many | yes | - |
| `job_applications` | schedules | `interviews` | one_to_many | yes | - |
| `job_applications` | requires | `candidate_assessments` | one_to_many | yes | - |
| `job_applications` | results in | `job_offers` | one_to_many | yes | - |
| `candidates` | becomes | `employees` | one_to_one | no | - |
| `job_requisitions` | feeds | `people_kpis` | one_to_many | no | - |
| `candidates` | becomes pre-employee | `pre_employees` | one_to_one | yes | - |
| `locations` | hosts_desk_bookings | `desk_bookings` | one_to_many | yes | - |
| `locations` | hosts_room_reservations | `room_reservations` | one_to_many | yes | - |
| `locations` | site_of_service_requests | `workplace_service_requests` | one_to_many | yes | - |
| `locations` | measured_by_reports | `space_utilization_reports` | one_to_many | yes | - |
| `locations` | subject_of_feedback | `workplace_experience_feedback` | one_to_many | no | - |
| `job_profiles` | expects | `competency_models` | one_to_many | no | - |
| `candidates` | engaged_via | `candidate_engagements` | one_to_many | no | - |
| `candidates` | attends_via | `recruiting_event_attendances` | one_to_many | yes | - |
| `candidates` | consents_via | `candidate_consents` | one_to_many | yes | - |
| `candidates` | member_of_via | `talent_pool_memberships` | one_to_many | yes | - |
| `candidates` | discloses_via | `fcra_disclosures` | one_to_many | yes | - |
| `candidates` | submits_via | `data_subject_requests` | one_to_many | yes | - |
| `candidates` | acknowledges_via | `fcra_summary_of_rights_acknowledgments` | one_to_many | yes | - |
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
| `hcm_positions` | embedded_master | yes | HCM-ORG-POSITIONS (HCM) | - |
| `job_profiles` | embedded_master | - | HCM-ORG-POSITIONS (HCM) | - |
| `locations` | embedded_master | yes | IWMS-LOCATION-MASTER (IWMS) | - |
| `org_units` | embedded_master | yes | HCM-ORG-POSITIONS (HCM) | - |

## 7. Lifecycle states

### `applicant_flow_records` (Applicant Flow Record)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `applied` | ✓ | - | `ATS-RECRUITMENT-PIPELINE` | - | - | - | Initial Internet Applicant capture at application submission. Demographics (voluntary) attached if self-identification was provided. |
| 2 | `under_consideration` | - | - | `ATS-RECRUITMENT-PIPELINE` | - | - | - | Applicant has advanced past initial screening and is in active consideration. Auto-progressed when the related application advances stages. |
| 3 | `dispositioned` | - | - | `ATS-RECRUITMENT-PIPELINE` | ✓ | - | `ats-recruitment-pipeline:disposition_applicant` | Recruiter codes the OFCCP disposition reason on the applicant (selected, not selected with typed reason, withdrew, etc.). |
| 4 | `archived` | - | ✓ | `ATS-RECRUITMENT-PIPELINE` | - | - | - | Auto-archived per OFCCP retention rules (typically a two-year retention window for federal contractors). |

### `candidates` (Candidate)

_This scope holds `candidates` as **embedded_master**; the canonical state machine is owned by `ATS-CANDIDATE-CRM`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `prospect` | ✓ | - | _(always)_ | - | - | - | Person known to the recruiting org with no active application. |
| 2 | `active` | - | - | _(always)_ | - | - | - | Candidate has at least one open application or is actively engaged. |
| 3 | `hired` | - | - | `ATS-CANDIDATE-CRM` | ✓ | - | `ats-candidate-crm:hire_candidate` | Candidate accepted an offer and converted to employee; a new application moves the person back to active. |
| 4 | `do_not_hire` | - | ✓ | `ATS-CANDIDATE-CRM` | ✓ | - | `ats-candidate-crm:flag_do_not_hire` | Candidate flagged as ineligible for future consideration; gated decision. |
| 5 | `archived` | - | - | _(always)_ | - | - | - | Candidate kept in the database but not active in any pipeline; a new application moves the candidate back to active. |

### `eeo_responses` (EEO Response)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `offered` | ✓ | - | _(always)_ | - | - | - | Candidate presented with voluntary self-ID form. |
| 2 | `declined` | - | ✓ | _(always)_ | - | - | - | Candidate declined to self-identify (counted as 'not disclosed'). |
| 3 | `submitted` | - | ✓ | _(always)_ | - | - | - | Candidate completed and submitted the form. |

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

### `job_applications` (Application)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `applied` | ✓ | - | _(always)_ | - | - | - | Candidate submitted an application for the job. |
| 2 | `screening` | - | - | _(always)_ | - | - | - | Recruiter is reviewing resume and qualifications. |
| 3 | `interviewing` | - | - | `ATS-INTERVIEWS` | - | - | - | Candidate is progressing through interview loops. |
| 4 | `offer_extended` | - | - | `ATS-OFFERS` | - | - | - | An offer has been generated and is in flight for this application. |
| 5 | `hired` | - | ✓ | `ATS-PRE-EMPLOYEE-RECORD` | ✓ | - | `ats-pre-employee-record:hire_candidate` | Candidate accepted the offer and was hired; gated transition. |
| 6 | `rejected` | - | ✓ | _(always)_ | - | - | - | Application closed without progression by recruiter or hiring manager. |
| 7 | `withdrawn` | - | ✓ | _(always)_ | - | - | - | Candidate withdrew their application. |

### `job_posting_distributions` (Job Posting Distribution)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `queued` | ✓ | - | _(always)_ | - | - | - | Distribution scheduled but not yet posted. |
| 2 | `posted` | - | - | _(always)_ | - | - | - | Live on the target board. |
| 3 | `expired` | - | ✓ | _(always)_ | - | - | - | Posting reached its expiry date on the board. |
| 4 | `withdrawn` | - | ✓ | _(always)_ | - | - | - | Posting actively removed before expiry. |

### `job_postings` (Job Posting)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | _(always)_ | - | - | - | Posting being composed for a specific board or region. |
| 2 | `published` | - | - | `ATS-RECRUITMENT-PIPELINE` | ✓ | - | `ats-recruitment-pipeline:publish_posting` | Posting is live on the target channel; gated publish step. |
| 3 | `paused` | - | - | _(always)_ | - | - | - | Posting temporarily hidden from the channel. |
| 4 | `expired` | - | ✓ | _(always)_ | - | - | - | Posting reached its scheduled end date. |
| 5 | `closed` | - | ✓ | _(always)_ | - | - | - | Posting taken down because the job is filled or canceled. |

### `job_profiles` (Job Profile)

_This scope holds `job_profiles` as **embedded_master**; the canonical state machine is owned by `HCM-ORG-POSITIONS`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | `HCM-ORG-POSITIONS` | - | - | - | Profile is being authored or revised; not yet available for position assignment. |
| 2 | `approved` | - | - | `HCM-ORG-POSITIONS` | ✓ | - | `hcm-org-positions:approved_job_profile` | Cleared by the catalog owner; ready to be referenced by positions and postings. |
| 3 | `active` | - | - | `HCM-ORG-POSITIONS` | ✓ | - | `hcm-org-positions:active_job_profile` | In production use; positions and postings can reference it. |
| 4 | `retired` | - | ✓ | `HCM-ORG-POSITIONS` | ✓ | - | `hcm-org-positions:retired_job_profile` | No longer assignable to new positions; historical references preserved. |

### `job_requisitions` (Job Requisition)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | _(always)_ | - | - | - | Hiring manager is drafting the requisition. |
| 2 | `pending_approval` | - | - | _(always)_ | - | - | - | Requisition routed for headcount and budget approval. |
| 3 | `open` | - | - | `ATS-RECRUITMENT-PIPELINE` | ✓ | - | `ats-recruitment-pipeline:approve_requisition` | Requisition approved and actively recruiting. |
| 4 | `on_hold` | - | - | _(always)_ | - | - | - | Recruiting temporarily paused (budget freeze, scope change). |
| 5 | `filled` | - | ✓ | `ATS-RECRUITMENT-PIPELINE` | ✓ | - | `ats-recruitment-pipeline:close_requisition` | Requisition closed because the role was filled. |
| 6 | `canceled` | - | ✓ | _(always)_ | - | - | - | Requisition closed without a hire. |

### `org_units` (Org Unit)

_This scope holds `org_units` as **embedded_master**; the canonical state machine is owned by `HCM-ORG-POSITIONS`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | `HCM-ORG-POSITIONS` | - | - | - | Org unit defined as part of a future structure; not yet operational. |
| 2 | `active` | - | - | `HCM-ORG-POSITIONS` | ✓ | - | `hcm-org-positions:active_org_unit` | Operational unit; carries headcount, cost-center relationship, and reporting lines. |
| 3 | `reorganized` | - | ✓ | `HCM-ORG-POSITIONS` | ✓ | - | `hcm-org-positions:reorganized_org_unit` | Unit folded into or replaced by a new structure; references remain for history. |
| 4 | `closed` | - | ✓ | `HCM-ORG-POSITIONS` | ✓ | - | `hcm-org-positions:closed_org_unit` | Unit dissolved; no employees or positions reside in it. |

### `requisition_approvals` (Requisition Approval)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `pending` | ✓ | - | _(always)_ | - | - | - | Approval step awaiting decision. |
| 2 | `approved` | - | ✓ | _(always)_ | ✓ | - | `ats-recruitment-pipeline:approve_requisition` | Step approved; requisition advances or opens. |
| 3 | `rejected` | - | ✓ | _(always)_ | ✓ | - | `ats-recruitment-pipeline:reject_requisition` | Step rejected; requisition blocked. |
| 4 | `withdrawn` | - | ✓ | _(always)_ | - | - | - | Request withdrawn by submitter before decision. |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `ats-recruitment-pipeline:read` | baseline-read | Read access to every entity in the module | ✓ |
| `ats-recruitment-pipeline:manage` | baseline-manage | Edit operational records | ✓ |
| `ats-recruitment-pipeline:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `ats-recruitment-pipeline:read_job_requisitions` | entity-read | Read Job Requisitions | ✓ |
| `ats-recruitment-pipeline:write_job_requisitions` | entity-write | Write Job Requisitions | ✓ |
| `ats-recruitment-pipeline:read_job_postings` | entity-read | Read Job Postings | ✓ |
| `ats-recruitment-pipeline:write_job_postings` | entity-write | Write Job Postings | ✓ |
| `ats-candidate-crm:read_candidates` | entity-read | Read Candidates | ✓ |
| `ats-candidate-crm:write_candidates` | entity-write | Write Candidates | ✓ |
| `ats-recruitment-pipeline:read_job_applications` | entity-read | Read Applications | ✓ |
| `ats-recruitment-pipeline:write_job_applications` | entity-write | Write Applications | ✓ |
| `hcm-org-positions:read_hcm_positions` | entity-read | Read Positions | ✓ |
| `hcm-org-positions:write_hcm_positions` | entity-write | Write Positions | ✓ |
| `hcm-org-positions:read_job_profiles` | entity-read | Read Job Profiles | ✓ |
| `hcm-org-positions:write_job_profiles` | entity-write | Write Job Profiles | ✓ |
| `hcm-org-positions:read_org_units` | entity-read | Read Org Units | ✓ |
| `hcm-org-positions:write_org_units` | entity-write | Write Org Units | ✓ |
| `iwms-location-master:read_locations` | entity-read | Read Locations | ✓ |
| `iwms-location-master:write_locations` | entity-write | Write Locations | ✓ |
| `ats-recruitment-pipeline:read_application_stages` | entity-read | Read Application Stages | ✓ |
| `ats-recruitment-pipeline:write_application_stages` | entity-write | Write Application Stages | ✓ |
| `ats-recruitment-pipeline:read_application_stage_transitions` | entity-read | Read Application Stage Transitions | ✓ |
| `ats-recruitment-pipeline:write_application_stage_transitions` | entity-write | Write Application Stage Transitions | ✓ |
| `ats-recruitment-pipeline:read_requisition_approvals` | entity-read | Read Requisition Approvals | ✓ |
| `ats-recruitment-pipeline:write_requisition_approvals` | entity-write | Write Requisition Approvals | ✓ |
| `ats-recruitment-pipeline:read_job_posting_distributions` | entity-read | Read Job Posting Distributions | ✓ |
| `ats-recruitment-pipeline:write_job_posting_distributions` | entity-write | Write Job Posting Distributions | ✓ |
| `ats-recruitment-pipeline:read_application_screening_questions` | entity-read | Read Application Screening Questions | ✓ |
| `ats-recruitment-pipeline:write_application_screening_questions` | entity-write | Write Application Screening Questions | ✓ |
| `ats-recruitment-pipeline:read_application_screening_answers` | entity-read | Read Application Screening Answers | ✓ |
| `ats-recruitment-pipeline:write_application_screening_answers` | entity-write | Write Application Screening Answers | ✓ |
| `ats-recruitment-pipeline:read_eeo_responses` | entity-read | Read EEO Responses | ✓ |
| `ats-recruitment-pipeline:write_eeo_responses` | entity-write | Write EEO Responses | ✓ |
| `ats-recruitment-pipeline:read_applicant_flow_records` | entity-read | Read Applicant Flow Records | ✓ |
| `ats-recruitment-pipeline:write_applicant_flow_records` | entity-write | Write Applicant Flow Records | ✓ |
| `ats-recruitment-pipeline:read_application_dispositions` | entity-read | Read Application Dispositions | ✓ |
| `ats-recruitment-pipeline:write_application_dispositions` | entity-write | Write Application Dispositions | ✓ |
| `ats-recruitment-pipeline:read_voluntary_self_identifications` | entity-read | Read Voluntary Self-Identifications | ✓ |
| `ats-recruitment-pipeline:write_voluntary_self_identifications` | entity-write | Write Voluntary Self-Identifications | ✓ |
| `ats-recruitment-pipeline:read_ofccp_audit_trails` | entity-read | Read OFCCP Audit Trails | ✓ |
| `ats-recruitment-pipeline:write_ofccp_audit_trails` | entity-write | Write OFCCP Audit Trails | ✓ |
| `ats-recruitment-pipeline:read_hiring_team_assignments` | entity-read | Read Hiring Team Assignments | ✓ |
| `ats-recruitment-pipeline:write_hiring_team_assignments` | entity-write | Write Hiring Team Assignments | ✓ |
| `ats-recruitment-pipeline:approve_requisition` | workflow-gate (lifecycle) | Transition `job_requisitions` into state `open` or `requisition_approvals` into state `approved` | ✓ |
| `ats-recruitment-pipeline:close_requisition` | workflow-gate (lifecycle) | Transition `job_requisitions` into state `filled` | ✓ |
| `ats-recruitment-pipeline:publish_posting` | workflow-gate (lifecycle) | Transition `job_postings` into state `published` | ✓ |
| `ats-candidate-crm:hire_candidate` | workflow-gate (lifecycle) | Transition `candidates` into state `hired` | ✓ |
| `ats-candidate-crm:flag_do_not_hire` | workflow-gate (lifecycle) | Transition `candidates` into state `do_not_hire` | ✓ |
| `ats-pre-employee-record:hire_candidate` | workflow-gate (lifecycle) | Transition `job_applications` into state `hired` | ✓ |
| `hcm-org-positions:approved_position` | workflow-gate (lifecycle) | Transition `hcm_positions` into state `approved` | ✓ |
| `hcm-org-positions:open_position` | workflow-gate (lifecycle) | Transition `hcm_positions` into state `open` | ✓ |
| `hcm-org-positions:filled_position` | workflow-gate (lifecycle) | Transition `hcm_positions` into state `filled` | ✓ |
| `hcm-org-positions:frozen_position` | workflow-gate (lifecycle) | Transition `hcm_positions` into state `frozen` | ✓ |
| `hcm-org-positions:eliminated_position` | workflow-gate (lifecycle) | Transition `hcm_positions` into state `eliminated` | ✓ |
| `hcm-org-positions:approved_job_profile` | workflow-gate (lifecycle) | Transition `job_profiles` into state `approved` | ✓ |
| `hcm-org-positions:active_job_profile` | workflow-gate (lifecycle) | Transition `job_profiles` into state `active` | ✓ |
| `hcm-org-positions:retired_job_profile` | workflow-gate (lifecycle) | Transition `job_profiles` into state `retired` | ✓ |
| `hcm-org-positions:active_org_unit` | workflow-gate (lifecycle) | Transition `org_units` into state `active` | ✓ |
| `hcm-org-positions:reorganized_org_unit` | workflow-gate (lifecycle) | Transition `org_units` into state `reorganized` | ✓ |
| `hcm-org-positions:closed_org_unit` | workflow-gate (lifecycle) | Transition `org_units` into state `closed` | ✓ |
| `ats-recruitment-pipeline:reject_requisition` | workflow-gate (lifecycle) | Transition `requisition_approvals` into state `rejected` | ✓ |
| `ats-recruitment-pipeline:disposition_applicant` | workflow-gate (lifecycle) | Transition `applicant_flow_records` into state `dispositioned` | ✓ |
| `ats-candidate-crm:view_all_candidates` | override (personal_content) | View all `candidates` rows beyond row-scope | ✓ |
| `ats-candidate-crm:manage_all_candidates` | override (personal_content) | Manage all `candidates` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:view_all_applications` | override (personal_content) | View all `job_applications` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:manage_all_applications` | override (personal_content) | Manage all `job_applications` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:view_all_application_screening_answers` | override (personal_content) | View all `application_screening_answers` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:manage_all_application_screening_answers` | override (personal_content) | Manage all `application_screening_answers` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:view_all_eeo_responses` | override (personal_content) | View all `eeo_responses` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:manage_all_eeo_responses` | override (personal_content) | Manage all `eeo_responses` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:view_all_applicant_flow_records` | override (personal_content) | View all `applicant_flow_records` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:manage_all_applicant_flow_records` | override (personal_content) | Manage all `applicant_flow_records` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:view_all_voluntary_self_identifications` | override (personal_content) | View all `voluntary_self_identifications` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:manage_all_voluntary_self_identifications` | override (personal_content) | Manage all `voluntary_self_identifications` rows beyond row-scope | ✓ |

_Gates with no process: `ats-recruitment-pipeline:close_requisition`, `ats-candidate-crm:flag_do_not_hire`, `hcm-org-positions:open_position`, `hcm-org-positions:filled_position`, `hcm-org-positions:frozen_position`, `hcm-org-positions:eliminated_position`, `hcm-org-positions:active_job_profile`, `hcm-org-positions:retired_job_profile`, `hcm-org-positions:closed_org_unit`, `ats-recruitment-pipeline:reject_requisition`, `ats-recruitment-pipeline:disposition_applicant`. No Accountable can hold them, so this blueprint does not support `raci`._

### 8.2 Business rules

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `candidate_edit_scope` | `candidates` | has_personal_content | Row-scope by default; override via `ats-candidate-crm:view_all_candidates` / `ats-candidate-crm:manage_all_candidates` |
| `application_edit_scope` | `job_applications` | has_personal_content | Row-scope by default; override via `ats-recruitment-pipeline:view_all_applications` / `ats-recruitment-pipeline:manage_all_applications` |
| `application_screening_answer_edit_scope` | `application_screening_answers` | has_personal_content | Row-scope by default; override via `ats-recruitment-pipeline:view_all_application_screening_answers` / `ats-recruitment-pipeline:manage_all_application_screening_answers` |
| `eeo_response_edit_scope` | `eeo_responses` | has_personal_content | Row-scope by default; override via `ats-recruitment-pipeline:view_all_eeo_responses` / `ats-recruitment-pipeline:manage_all_eeo_responses` |
| `applicant_flow_record_edit_scope` | `applicant_flow_records` | has_personal_content | Row-scope by default; override via `ats-recruitment-pipeline:view_all_applicant_flow_records` / `ats-recruitment-pipeline:manage_all_applicant_flow_records` |
| `voluntary_self_identification_edit_scope` | `voluntary_self_identifications` | has_personal_content | Row-scope by default; override via `ats-recruitment-pipeline:view_all_voluntary_self_identifications` / `ats-recruitment-pipeline:manage_all_voluntary_self_identifications` |

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `ATS-RECRUITMENT-PIPELINE`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `ats-recruitment-pipeline_viewer` | `ats-recruitment-pipeline:read` |
| `ats-recruitment-pipeline_manager` | `ats-recruitment-pipeline:manage` |
| `ats-recruitment-pipeline_admin` | `ats-recruitment-pipeline:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `ats-recruitment-pipeline:admin` | `ats-recruitment-pipeline:manage` |
| `ats-recruitment-pipeline:manage` | `ats-recruitment-pipeline:read` |
| `ats-recruitment-pipeline:read` | `ats-recruitment-pipeline:read_job_requisitions` |
| `ats-recruitment-pipeline:read` | `ats-recruitment-pipeline:read_job_postings` |
| `ats-recruitment-pipeline:read` | `ats-candidate-crm:read_candidates` |
| `ats-recruitment-pipeline:read` | `ats-recruitment-pipeline:read_job_applications` |
| `ats-recruitment-pipeline:read` | `hcm-org-positions:read_hcm_positions` |
| `ats-recruitment-pipeline:read` | `hcm-org-positions:read_job_profiles` |
| `ats-recruitment-pipeline:read` | `hcm-org-positions:read_org_units` |
| `ats-recruitment-pipeline:read` | `iwms-location-master:read_locations` |
| `ats-recruitment-pipeline:read` | `ats-recruitment-pipeline:read_application_stages` |
| `ats-recruitment-pipeline:read` | `ats-recruitment-pipeline:read_application_stage_transitions` |
| `ats-recruitment-pipeline:read` | `ats-recruitment-pipeline:read_requisition_approvals` |
| `ats-recruitment-pipeline:read` | `ats-recruitment-pipeline:read_job_posting_distributions` |
| `ats-recruitment-pipeline:read` | `ats-recruitment-pipeline:read_application_screening_questions` |
| `ats-recruitment-pipeline:read` | `ats-recruitment-pipeline:read_application_screening_answers` |
| `ats-recruitment-pipeline:read` | `ats-recruitment-pipeline:read_eeo_responses` |
| `ats-recruitment-pipeline:read` | `ats-recruitment-pipeline:read_applicant_flow_records` |
| `ats-recruitment-pipeline:read` | `ats-recruitment-pipeline:read_application_dispositions` |
| `ats-recruitment-pipeline:read` | `ats-recruitment-pipeline:read_voluntary_self_identifications` |
| `ats-recruitment-pipeline:read` | `ats-recruitment-pipeline:read_ofccp_audit_trails` |
| `ats-recruitment-pipeline:read` | `ats-recruitment-pipeline:read_hiring_team_assignments` |
| `ats-recruitment-pipeline:manage` | `ats-recruitment-pipeline:write_job_requisitions` |
| `ats-recruitment-pipeline:write_job_requisitions` | `ats-recruitment-pipeline:read_job_requisitions` |
| `ats-recruitment-pipeline:manage` | `ats-recruitment-pipeline:write_job_postings` |
| `ats-recruitment-pipeline:write_job_postings` | `ats-recruitment-pipeline:read_job_postings` |
| `ats-recruitment-pipeline:manage` | `ats-candidate-crm:write_candidates` |
| `ats-candidate-crm:write_candidates` | `ats-candidate-crm:read_candidates` |
| `ats-recruitment-pipeline:manage` | `ats-recruitment-pipeline:write_job_applications` |
| `ats-recruitment-pipeline:write_job_applications` | `ats-recruitment-pipeline:read_job_applications` |
| `ats-recruitment-pipeline:manage` | `hcm-org-positions:write_hcm_positions` |
| `hcm-org-positions:write_hcm_positions` | `hcm-org-positions:read_hcm_positions` |
| `ats-recruitment-pipeline:admin` | `hcm-org-positions:write_job_profiles` |
| `hcm-org-positions:write_job_profiles` | `hcm-org-positions:read_job_profiles` |
| `ats-recruitment-pipeline:manage` | `hcm-org-positions:write_org_units` |
| `hcm-org-positions:write_org_units` | `hcm-org-positions:read_org_units` |
| `ats-recruitment-pipeline:admin` | `iwms-location-master:write_locations` |
| `iwms-location-master:write_locations` | `iwms-location-master:read_locations` |
| `ats-recruitment-pipeline:admin` | `ats-recruitment-pipeline:write_application_stages` |
| `ats-recruitment-pipeline:write_application_stages` | `ats-recruitment-pipeline:read_application_stages` |
| `ats-recruitment-pipeline:manage` | `ats-recruitment-pipeline:write_application_stage_transitions` |
| `ats-recruitment-pipeline:write_application_stage_transitions` | `ats-recruitment-pipeline:read_application_stage_transitions` |
| `ats-recruitment-pipeline:manage` | `ats-recruitment-pipeline:write_requisition_approvals` |
| `ats-recruitment-pipeline:write_requisition_approvals` | `ats-recruitment-pipeline:read_requisition_approvals` |
| `ats-recruitment-pipeline:manage` | `ats-recruitment-pipeline:write_job_posting_distributions` |
| `ats-recruitment-pipeline:write_job_posting_distributions` | `ats-recruitment-pipeline:read_job_posting_distributions` |
| `ats-recruitment-pipeline:admin` | `ats-recruitment-pipeline:write_application_screening_questions` |
| `ats-recruitment-pipeline:write_application_screening_questions` | `ats-recruitment-pipeline:read_application_screening_questions` |
| `ats-recruitment-pipeline:manage` | `ats-recruitment-pipeline:write_application_screening_answers` |
| `ats-recruitment-pipeline:write_application_screening_answers` | `ats-recruitment-pipeline:read_application_screening_answers` |
| `ats-recruitment-pipeline:manage` | `ats-recruitment-pipeline:write_eeo_responses` |
| `ats-recruitment-pipeline:write_eeo_responses` | `ats-recruitment-pipeline:read_eeo_responses` |
| `ats-recruitment-pipeline:manage` | `ats-recruitment-pipeline:write_applicant_flow_records` |
| `ats-recruitment-pipeline:write_applicant_flow_records` | `ats-recruitment-pipeline:read_applicant_flow_records` |
| `ats-recruitment-pipeline:manage` | `ats-recruitment-pipeline:write_application_dispositions` |
| `ats-recruitment-pipeline:write_application_dispositions` | `ats-recruitment-pipeline:read_application_dispositions` |
| `ats-recruitment-pipeline:manage` | `ats-recruitment-pipeline:write_voluntary_self_identifications` |
| `ats-recruitment-pipeline:write_voluntary_self_identifications` | `ats-recruitment-pipeline:read_voluntary_self_identifications` |
| `ats-recruitment-pipeline:manage` | `ats-recruitment-pipeline:write_ofccp_audit_trails` |
| `ats-recruitment-pipeline:write_ofccp_audit_trails` | `ats-recruitment-pipeline:read_ofccp_audit_trails` |
| `ats-recruitment-pipeline:manage` | `ats-recruitment-pipeline:write_hiring_team_assignments` |
| `ats-recruitment-pipeline:write_hiring_team_assignments` | `ats-recruitment-pipeline:read_hiring_team_assignments` |
| `ats-recruitment-pipeline:admin` | `ats-recruitment-pipeline:approve_requisition` |
| `ats-recruitment-pipeline:admin` | `ats-recruitment-pipeline:close_requisition` |
| `ats-recruitment-pipeline:admin` | `ats-recruitment-pipeline:publish_posting` |
| `ats-recruitment-pipeline:admin` | `ats-candidate-crm:hire_candidate` |
| `ats-recruitment-pipeline:admin` | `ats-candidate-crm:flag_do_not_hire` |
| `ats-recruitment-pipeline:admin` | `ats-pre-employee-record:hire_candidate` |
| `ats-recruitment-pipeline:admin` | `hcm-org-positions:approved_position` |
| `ats-recruitment-pipeline:admin` | `hcm-org-positions:open_position` |
| `ats-recruitment-pipeline:admin` | `hcm-org-positions:filled_position` |
| `ats-recruitment-pipeline:admin` | `hcm-org-positions:frozen_position` |
| `ats-recruitment-pipeline:admin` | `hcm-org-positions:eliminated_position` |
| `ats-recruitment-pipeline:admin` | `hcm-org-positions:approved_job_profile` |
| `ats-recruitment-pipeline:admin` | `hcm-org-positions:active_job_profile` |
| `ats-recruitment-pipeline:admin` | `hcm-org-positions:retired_job_profile` |
| `ats-recruitment-pipeline:admin` | `hcm-org-positions:active_org_unit` |
| `ats-recruitment-pipeline:admin` | `hcm-org-positions:reorganized_org_unit` |
| `ats-recruitment-pipeline:admin` | `hcm-org-positions:closed_org_unit` |
| `ats-recruitment-pipeline:admin` | `ats-recruitment-pipeline:reject_requisition` |
| `ats-recruitment-pipeline:admin` | `ats-recruitment-pipeline:disposition_applicant` |
| `ats-recruitment-pipeline:admin` | `ats-candidate-crm:view_all_candidates` |
| `ats-recruitment-pipeline:admin` | `ats-candidate-crm:manage_all_candidates` |
| `ats-recruitment-pipeline:admin` | `ats-recruitment-pipeline:view_all_applications` |
| `ats-recruitment-pipeline:admin` | `ats-recruitment-pipeline:manage_all_applications` |
| `ats-recruitment-pipeline:admin` | `ats-recruitment-pipeline:view_all_application_screening_answers` |
| `ats-recruitment-pipeline:admin` | `ats-recruitment-pipeline:manage_all_application_screening_answers` |
| `ats-recruitment-pipeline:admin` | `ats-recruitment-pipeline:view_all_eeo_responses` |
| `ats-recruitment-pipeline:admin` | `ats-recruitment-pipeline:manage_all_eeo_responses` |
| `ats-recruitment-pipeline:admin` | `ats-recruitment-pipeline:view_all_applicant_flow_records` |
| `ats-recruitment-pipeline:admin` | `ats-recruitment-pipeline:manage_all_applicant_flow_records` |
| `ats-recruitment-pipeline:admin` | `ats-recruitment-pipeline:view_all_voluntary_self_identifications` |
| `ats-recruitment-pipeline:admin` | `ats-recruitment-pipeline:manage_all_voluntary_self_identifications` |

**Processes wired:**

| process_key | process_name | PCF code | PCF ID | level | description |
| --- | --- | --- | --- | --- | --- |
| `manage_employee_requisitions` | Manage employee requisitions | 7.2.1 | 21698 | 3 | Handling the requirements for new employees. Create and open job requisitions by clearly defining the job descriptions. Post these requirements internally and externally, and modify them as appropriate. Manage the dates of the whole requisition process. |
| `recruit_source_candidates` | Recruit/Source candidates | 7.2.2 | 10440 | 3 | Recruiting new candidates for deployment across various functional areas inside the organization. Select methods for sourcing new employees. Manage relationships with third-party agencies. Stage recruitment fairs and drives. Manage employee referral programs. |
| `hire_candidate` | Hire candidate | 7.2.4.3 | 10465 | 4 | Wrapping up the process for hiring candidates. Agree to all hiring terms and conditions. Have the candidate accept and sign the job offer. |
| `create_organizational_design` | Create organizational design | 1.2.5 | 10041 | 3 | Formulating a design for the organization's resources that allow it to meet its objectives. Develop a new framework for molding the organization's various processes into a coherent and seamless whole. |
| `develop_maintain_job` | Develop and maintain job descriptions | 7.1.2.16 | 10447 | 4 | Creating descriptions for job requisitions. Define the normal components of a job description, such as the overall position description with general areas of responsibility listed, essential functions of the job described with a couple of examples of each, required knowledge, skills, abilities, required education and experience, a description of the physical demands, and a description of the work environment. |
| `conduct_organization` | Conduct organization restructuring opportunities | 1.1.5 | 16792 | 3 | Examining the scope and contingencies for restructuring based on market situation and internal realities. Map the market forces over which any and all probabilities can be probed for utility and viability. Once the restructuring options have been analyzed and the due-diligence performed, execute the deal. Consider seeking professional services for assistance in formalizing these opportunities. |

**RACI realization:**

| actor | kind | raci | process_key | realization |
| --- | --- | --- | --- | --- |
| `RECRUITING-RECRUITER` | persona | responsible | `manage_employee_requisitions` | the gated entities' write tier |
| `RECRUITING-MANAGER` | persona | accountable | `manage_employee_requisitions` | grant gates [ats-recruitment-pipeline:approve_requisition] + the gated entities' write tier |
| `RECRUITING-SOURCER` | persona | responsible | `recruit_source_candidates` | the gated entities' write tier |
| `RECRUITING-RECRUITER` | persona | responsible | `recruit_source_candidates` | the gated entities' write tier |
| `RECRUITING-MANAGER` | persona | accountable | `recruit_source_candidates` | grant gates [ats-recruitment-pipeline:publish_posting] + the gated entities' write tier |
| `HIRING-MANAGER` | persona | informed | `recruit_source_candidates` | notify on trigger_events [job_posting.published] |
| `RECRUITING-RECRUITER` | persona | responsible | `hire_candidate` | the gated entities' write tier |
| `HIRING-MANAGER` | persona | accountable | `hire_candidate` | grant gates [ats-candidate-crm:hire_candidate, ats-pre-employee-record:hire_candidate] + the gated entities' write tier |
| `LEGAL-COMPLIANCE-SPECIALIST` | persona | informed | `hire_candidate` | notify on trigger_events [candidate.hired] |
| `HR-ORG-DESIGN-ANALYST` | persona | responsible | `create_organizational_design` | the gated entities' write tier |
| `HR-BUSINESS-PARTNER` | persona | accountable | `create_organizational_design` | grant gates [hcm-org-positions:approved_position, hcm-org-positions:active_org_unit] + the gated entities' write tier |
| `PEOPLE-MANAGER` | persona | consulted | `create_organizational_design` | advisory read grant |
| `HR-HRIS-ADMIN` | persona | informed | `create_organizational_design` | notify on trigger_events [hcm_position.approved] |
| `HR-ORG-DESIGN-ANALYST` | persona | responsible | `develop_maintain_job` | the gated entities' write tier |
| `HR-HRIS-ADMIN` | persona | accountable | `develop_maintain_job` | grant gates [hcm-org-positions:approved_job_profile] + the gated entities' write tier |
| `HR-BUSINESS-PARTNER` | persona | consulted | `develop_maintain_job` | advisory read grant |
| `HR-ORG-DESIGN-ANALYST` | persona | responsible | `conduct_organization` | the gated entities' write tier |
| `HR-BUSINESS-PARTNER` | persona | accountable | `conduct_organization` | grant gates [hcm-org-positions:reorganized_org_unit] + the gated entities' write tier |
| `PEOPLE-MANAGER` | persona | consulted | `conduct_organization` | advisory read grant |

### 9.2 Functional ownership and default grants

| responsibility | business function | default role | default tier |
| --- | --- | --- | --- |
| owner | Recruiting | `admin` | `:admin` |
| contributor | Human Resources | `manager` | `:manage` |
| contributor | Legal | `manager` | `:manage` |
| consumer | Finance | `viewer` | `:read` |
