---
artifact: semantic-blueprint
fact_sheet_version: "2.0"
system_name: ATS-RECRUITMENT-PIPELINE
system_description: Recruitment Pipeline
system_slug: ats-recruitment-pipeline
domain_modules:
  - ats-recruitment-pipeline
domain_code: ATS
related_modules: [ats-candidate-crm, ats-interviews, ats-offers, ats-talent-pools, hcm-core-worker, hcm-org-positions, hiring-starter, iwms-location-master, swp-demand-forecast, tlnt-intel-mobility]
created_at: 2026-05-31
---

# Recruitment Pipeline

## 1. Overview

### 1.1 Analyst overview

Requisitions → postings → applications with pipeline-stage lifecycle. Realizes REQ-MGMT and CANDIDATE-EXP (application flow slice). Embedded-masters `candidates`, optionally `hcm_positions` and `org_units` for canonical position/org context.

## 2. Entity summary

| Name | Description |
| --- | --- |
| Applicant Flow Records | OFCCP-mandated log of every Internet Applicant against a requisition, capturing demographic data, expressed interest, basic qualifications, and disposition. Federal contractors must retain for OFCCP audit; the record is independent of EEO voluntary self-id. |
| Application Dispositions | Typed reason-for-non-selection on a job application. Drives OFCCP applicant-flow reporting and internal hiring analytics; distinct from `application_stage_transitions` which logs the stage change but not the categorised business reason. |
| Application Screening Answers | Candidate-supplied answer to an application_screening_question on a specific job_application. Drives auto-disqualify on knockout rules. |
| Application Screening Questions | Custom screening question attached to a job_posting or template (knockout questions, qualifying questions). Carries question text, type (boolean/single-select/free-text), required, knockout rule. |
| Application Stage Transitions | Audit-trail record of an application moving between stages. Carries from_stage, to_stage, actor, timestamp, reason. Source of cycle-time, time-in-stage, and conversion-rate analytics. |
| Application Stages | Configured stage in the recruiting pipeline (sourced, applied, screened, phone_screen, onsite, offer, hired). Per-requisition or per-template ordered list; defines the lifecycle of a job_application. |
| Applications | A candidate's submission against a specific requisition. Carries pipeline stage, status (active / rejected / withdrawn / hired), source, and the full evaluation history. |
| EEO Responses | Voluntary self-identification submitted by an applicant for EEO-1 / OFCCP / VEVRAA reporting (gender, race/ethnicity, veteran status, disability). Required compliance artifact for US employers >100 employees; stored separately from candidates record per regulation. |
| Hiring Team Assignments | Per-requisition role-scoped staffing junction: assigns specific users to recruiter, hiring manager, coordinator, interviewer, and reviewer roles on a single requisition. Captures team composition without requiring global RBAC for transient interview-panel membership. |
| Job Posting Distributions | Syndication of a job_posting to an external board (LinkedIn, Indeed, ZipRecruiter, Glassdoor, internal mobility portal). Carries board name, post timestamp, expiry, cost, applicant attribution. |
| Job Postings | Published, candidate-facing version of a requisition on a career site or job board. One requisition can have many postings (per board, language, or region). |
| Job Requisitions | Approved request to hire for a specific role. The master ATS work item, carries headcount, level, location, hiring manager, recruiter, and status (draft / open / on_hold / filled / cancelled). |
| OFCCP Audit Trails | Federal-contractor audit log of every applicant-flow event (requisition open, application receipt, disposition, hire) carrying the actor, timestamp, and OFCCP-relevant fields needed to reconstruct compliance decisions during an audit. Immutable append-only. |
| Requisition Approvals | Approval step in the chain that gates opening a job_requisition (hiring manager -> finance -> exec). Each step carries approver, decision, timestamp, rationale. |
| Voluntary Self-Identifications | Voluntary candidate disclosure of protected-class membership (race, ethnicity, gender, veteran status, disability status) per EEOC and OFCCP self-id requirements. Distinct from `eeo_responses` which captures the survey response: this row captures the offer/decline-to-answer decision and audit metadata. |
| Candidates | Person known to the recruiting org, with or without an active application. Carries contact details, resume, tags, GDPR consent, and source. Distinct from Employee until hired. |
| Job Profiles | Canonical role definition in the job catalog: title, family, level, responsibilities, required skills and competencies, pay range, FLSA classification. Distinct from positions (which are slots referencing a profile). Many positions share a single job profile. |
| Locations | - |
| Org Units | Node in the organizational hierarchy: division, business unit, department, team. Carries manager, cost center alignment, geographic scope, and parent/child relationships. HCM masters the operational hierarchy; EPM contributes the cost-center mapping (which would be Finance-mastered once a Finance/GL domain is loaded). |
| Positions | Approved slot in the org - a 'chair' with role definition, cost center, reporting line, location, and FTE allocation. Distinct from job_profiles (the catalog definition) and from employees (the person filling the slot). A position can be open, filled, or eliminated. SWP designs future positions via org_designs; HCM operationalizes them once approved. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef embedded_master fill:#fff4cc,stroke:#c79100,color:#5b4500;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  job_requisitions["Job Requisitions"]
  job_postings["Job Postings"]
  job_applications["Applications"]
  candidates["Candidates"]
  hcm_positions["Positions"]
  org_units["Org Units"]
  locations["Locations"]
  job_profiles["Job Profiles"]
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
  job_requisitions -->|"defines_pipeline"| application_stages
  job_applications -->|"transitions_via"| application_stage_transitions
  application_stages -->|"lands_at"| application_stage_transitions
  job_requisitions -->|"gated_by"| requisition_approvals
  job_postings -->|"syndicates_via (opt)"| job_posting_distributions
  job_postings -->|"asks (opt)"| application_screening_questions
  job_applications -->|"answers_via (opt)"| application_screening_answers
  application_screening_questions -->|"answered_by"| application_screening_answers
  candidates -->|"self_identifies_via (opt)"| eeo_responses
  candidates -->|"self_ids_via (opt)"| voluntary_self_identifications
  job_applications -->|"disposed_via (opt)"| application_dispositions
  job_applications -->|"logged_via"| applicant_flow_records
  job_requisitions -->|"staffed_by"| hiring_team_assignments
  applicant_flow_records -->|"audited_via"| ofccp_audit_trails
  org_units -->|"contains"| hcm_positions
  job_profiles -->|"defines"| hcm_positions
  hcm_positions -->|"spawns (opt)"| job_requisitions
  job_profiles -->|"feeds (opt)"| job_postings
  job_requisitions -->|"is advertised through"| job_postings
  job_requisitions -->|"receives"| job_applications
  job_postings -->|"is applied to via"| job_applications
  candidates -->|"submits"| job_applications
  org_units -->|"rolls_up_to (opt)"| org_units
  locations -->|"rolls_up_to (opt)"| locations
  hiring_team_assignments -->|"assigns"| users
  candidates -->|"has owning recruiter (opt)"| users
  job_postings -->|"has publisher"| users
  users -->|"manages (opt)"| hcm_positions
  users -->|"leads (opt)"| org_units
  users -->|"owns (opt)"| job_profiles
  job_requisitions -->|"has recruiter and hiring manager"| users
  job_applications -->|"has owning recruiter"| users
  org_units -->|"has members (opt)"| users
  locations -->|"houses (opt)"| users
  class job_requisitions master;
  class job_postings master;
  class job_applications master;
  class candidates embedded_master;
  class hcm_positions embedded_master;
  class org_units embedded_master;
  class locations embedded_master;
  class job_profiles embedded_master;
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
```

## 3. Entities catalog

| # | data_object | role | mastered in | label | necessity | pattern flags | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | `applicant_flow_records` (Applicant Flow Records) | master | - | - | required | personal_content, submit_lock | - |
| 2 | `application_dispositions` (Application Dispositions) | master | - | - | required | - | - |
| 3 | `application_screening_answers` (Application Screening Answers) | master | - | - | required | personal_content | - |
| 4 | `application_screening_questions` (Application Screening Questions) | master | - | - | required | - | - |
| 5 | `application_stage_transitions` (Application Stage Transitions) | master | - | - | required | - | - |
| 6 | `application_stages` (Application Stages) | master | - | - | required | - | - |
| 7 | `job_applications` (Applications) | master | - | - | required | personal_content | - |
| 8 | `eeo_responses` (EEO Responses) | master | - | - | optional | personal_content, submit_lock | - |
| 9 | `hiring_team_assignments` (Hiring Team Assignments) | master | - | - | required | - | - |
| 10 | `job_posting_distributions` (Job Posting Distributions) | master | - | - | required | - | - |
| 11 | `job_postings` (Job Postings) | master | - | - | required | - | - |
| 12 | `job_requisitions` (Job Requisitions) | master | - | - | required | single_approver | - |
| 13 | `ofccp_audit_trails` (OFCCP Audit Trails) | master | - | - | required | submit_lock | - |
| 14 | `requisition_approvals` (Requisition Approvals) | master | - | - | required | single_approver | - |
| 15 | `voluntary_self_identifications` (Voluntary Self-Identifications) | master | - | - | required | personal_content, submit_lock | - |
| 16 | `candidates` (Candidates) | embedded_master | `ats-candidate-crm` | Candidate CRM | required | personal_content | - |
| 17 | `job_profiles` (Job Profiles) | embedded_master | `hcm-org-positions` | Organisation and Position Management | required | single_approver | - |
| 18 | `locations` (Locations) | embedded_master | `iwms-location-master` | Location and Property Master | optional | - | - |
| 19 | `org_units` (Org Units) | embedded_master | `hcm-org-positions` | Organisation and Position Management | optional | - | - |
| 20 | `hcm_positions` (Positions) | embedded_master | `hcm-org-positions` | Organisation and Position Management | optional | single_approver | - |

## 4. Aliases and industry synonyms

_(no industry-scoped aliases or non-synonym alias types loaded for this scope; generic synonyms are omitted as common knowledge.)_

## 5. Relationships

### 5.1 Intra-scope edges

| from | verb | to | cardinality | kind | necessity | owner_side | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `job_requisitions` | defines_pipeline | `application_stages` | one_to_many | reference | required | source | - |
| `job_applications` | transitions_via | `application_stage_transitions` | one_to_many | composition | required | source | - |
| `application_stages` | lands_at | `application_stage_transitions` | one_to_many | reference | required | target | - |
| `job_requisitions` | gated_by | `requisition_approvals` | one_to_many | composition | required | source | - |
| `job_postings` | syndicates_via | `job_posting_distributions` | one_to_many | composition | optional | source | - |
| `job_postings` | asks | `application_screening_questions` | one_to_many | composition | optional | source | - |
| `job_applications` | answers_via | `application_screening_answers` | one_to_many | composition | optional | source | - |
| `application_screening_questions` | answered_by | `application_screening_answers` | one_to_many | reference | required | source | - |
| `candidates` | self_identifies_via | `eeo_responses` | one_to_many | composition | optional | source | - |
| `candidates` | self_ids_via | `voluntary_self_identifications` | one_to_many | composition | optional | source | - |
| `job_applications` | disposed_via | `application_dispositions` | one_to_many | composition | optional | source | - |
| `job_applications` | logged_via | `applicant_flow_records` | one_to_one | composition | required | source | - |
| `job_requisitions` | staffed_by | `hiring_team_assignments` | one_to_many | composition | required | source | - |
| `applicant_flow_records` | audited_via | `ofccp_audit_trails` | one_to_many | composition | required | source | - |
| `org_units` | contains | `hcm_positions` | one_to_many | reference | required | source | - |
| `job_profiles` | defines | `hcm_positions` | one_to_many | reference | required | source | - |
| `hcm_positions` | spawns | `job_requisitions` | one_to_many | reference | optional | source | - |
| `job_profiles` | feeds | `job_postings` | one_to_many | reference | optional | source | - |
| `job_requisitions` | is advertised through | `job_postings` | one_to_many | reference | required | source | - |
| `job_requisitions` | receives | `job_applications` | one_to_many | reference | required | source | - |
| `job_postings` | is applied to via | `job_applications` | one_to_many | reference | required | source | - |
| `candidates` | submits | `job_applications` | one_to_many | reference | required | target | - |
| `org_units` | rolls_up_to | `org_units` | one_to_many | reference | optional | source | - |
| `locations` | rolls_up_to | `locations` | one_to_many | reference | optional | source | - |

### 5.2 Built-in edges (`users` and other platform built-ins)

| from | verb | to | cardinality | necessity | owner_side | notes |
| --- | --- | --- | --- | --- | --- | --- |
| `hiring_team_assignments` | assigns | `users` | many_to_many | required | source | - |
| `candidates` | has owning recruiter | `users` | many_to_many | optional | source | - |
| `job_postings` | has publisher | `users` | many_to_many | required | source | - |
| `users` | manages | `hcm_positions` | one_to_many | optional | source | - |
| `users` | leads | `org_units` | one_to_many | optional | source | - |
| `users` | owns | `job_profiles` | one_to_many | optional | source | - |
| `job_requisitions` | has recruiter and hiring manager | `users` | many_to_many | required | source | - |
| `job_applications` | has owning recruiter | `users` | many_to_many | required | source | - |
| `org_units` | has members | `users` | one_to_many | optional | target | - |
| `locations` | houses | `users` | one_to_many | optional | target | - |

### 5.3 Cross-scope edges

#### 5.3a Outbound from this scope's masters and contributors

_Edges this scope drives: the in-scope endpoint has `role` of `master` or `contributor`._

| from | verb | to | cardinality | necessity | notes |
| --- | --- | --- | --- | --- | --- |
| `job_applications` | schedules | `interviews` | one_to_many | required | - |
| `job_applications` | requires | `candidate_assessments` | one_to_many | required | - |
| `job_applications` | results in | `job_offers` | one_to_many | required | - |
| `job_requisitions` | updates | `position_demand_forecasts` | many_to_many | optional | - |
| `job_requisitions` | feeds | `people_kpis` | many_to_many | optional | - |
| `headcount_plans` | authorizes | `job_requisitions` | one_to_many | required | - |
| `position_demand_forecasts` | triggers | `job_requisitions` | one_to_many | optional | - |

#### 5.3b Context edges on embedded shells and consumed entities

_Edges the canonical owner drives, shown for context: the in-scope endpoint has `role` of `embedded_master`, `consumer`, or `derived`._

<details>
<summary>47 context edges</summary>

| from | verb | to | cardinality | necessity | notes |
| --- | --- | --- | --- | --- | --- |
| `job_profiles` | expects | `competency_models` | one_to_many | optional | - |
| `candidates` | engaged_via | `candidate_engagements` | one_to_many | optional | - |
| `candidates` | attends_via | `recruiting_event_attendances` | one_to_many | required | - |
| `candidates` | noted_via | `recruiter_interactions` | one_to_many | optional | - |
| `candidates` | consents_via | `candidate_consents` | one_to_many | required | - |
| `candidates` | member_of_via | `talent_pool_memberships` | one_to_many | required | - |
| `candidates` | discloses_via | `fcra_disclosures` | one_to_many | required | - |
| `candidates` | submits_via | `data_subject_requests` | one_to_many | optional | - |
| `candidates` | acknowledges_via | `fcra_summary_of_rights_acknowledgements` | one_to_many | optional | - |
| `candidates` | documented_via | `candidate_documents` | one_to_many | optional | - |
| `candidates` | annotated_via | `candidate_notes` | one_to_many | optional | - |
| `candidates` | tagged_via | `candidate_tag_assignments` | one_to_many | optional | - |
| `locations` | hosts_desk_bookings | `desk_bookings` | one_to_many | required | - |
| `locations` | hosts_room_reservations | `room_reservations` | one_to_many | required | - |
| `locations` | site_of_service_requests | `workplace_service_requests` | one_to_many | required | - |
| `locations` | measured_by_reports | `space_utilization_reports` | one_to_many | required | - |
| `locations` | subject_of_feedback | `workplace_experience_feedback` | one_to_many | optional | - |
| `org_units` | groups | `employees` | one_to_many | required | - |
| `hcm_positions` | is_filled_by | `employees` | one_to_one | optional | - |
| `cost_centers` | funds | `org_units` | one_to_many | required | - |
| `org_units` | engages | `contingent_workers` | one_to_many | optional | - |
| `org_units` | is_scored_by | `engagement_drivers` | one_to_many | optional | - |
| `org_units` | is_measured_by | `people_kpis` | one_to_many | optional | - |
| `job_profiles` | maps_to | `skill_profiles` | many_to_many | optional | - |
| `org_units` | triggers | `iga_entitlement_definitions` | one_to_many | optional | - |
| `job_profiles` | maps_to | `courses` | many_to_many | optional | - |
| `salary_bands` | anchors | `hcm_positions` | one_to_many | optional | - |
| `salary_bands` | bands | `job_profiles` | one_to_many | optional | - |
| `org_units` | maps_to | `cost_centers` | one_to_one | optional | - |
| `hcm_positions` | requires | `compliance_assignments` | one_to_many | optional | - |
| `job_profiles` | requires | `learning_paths` | many_to_many | optional | - |
| `job_profiles` | expects | `skill_profiles` | many_to_many | optional | - |
| `org_units` | sponsors | `compliance_assignments` | one_to_many | optional | - |
| `skill_profiles` | feeds | `candidates` | one_to_many | optional | - |
| `org_units` | sponsors | `benefit_plans` | many_to_many | optional | - |
| `survey_campaigns` | targets | `org_units` | many_to_many | optional | - |
| `org_units` | owns | `action_plans` | one_to_many | optional | - |
| `candidate_referrals` | introduces | `candidates` | one_to_many | required | - |
| `recruitment_sources` | attributes | `candidates` | one_to_many | required | - |
| `recruitment_agencies` | sources | `candidates` | one_to_many | required | - |
| `recruitment_events` | attracts | `candidates` | one_to_many | required | - |
| `talent_pools` | groups | `candidates` | many_to_many | required | - |
| `candidates` | becomes | `employees` | one_to_one | required | - |
| `candidates` | becomes pre-employee | `pre_employees` | one_to_one | required | - |
| `employees` | fills | `hcm_positions` | one_to_one | optional | - |
| `workforce_scenarios` | drives | `hcm_positions` | one_to_many | required | - |
| `org_designs` | proposes | `hcm_positions` | one_to_many | required | - |

</details>

## 6. Cross-domain context

### 6.1 Master consumers (other modules / domains that embed this scope's masters)

| data_object | other module / domain | role | necessity | notes |
| --- | --- | --- | --- | --- |
| `job_applications` | ATS-INTERVIEWS (Interviews) - ATS | embedded_master | required | - |
| `job_applications` | ATS-OFFERS (Offers) - ATS | embedded_master | required | - |
| `job_applications` | HIRING-STARTER (Hiring Starter) - ATS | embedded_master | required | - |
| `job_postings` | HIRING-STARTER (Hiring Starter) - ATS | embedded_master | required | - |
| `job_postings` | TLNT-INTEL-MOBILITY (Mobility, Succession and Fit) - TLNT-INTEL | consumer | required | - |
| `job_requisitions` | HCM-ORG-POSITIONS (Organisation and Position Management) - HCM | consumer | required | - |
| `job_requisitions` | SWP-DEMAND-FORECAST (Demand Forecast) - SWP | contributor | required | - |
| `job_requisitions` | TLNT-INTEL-MOBILITY (Mobility, Succession and Fit) - TLNT-INTEL | consumer | required | - |

### 6.2 Outbound handoffs (events this scope publishes)

| source module | target domain | target module | trigger_event | payload | integration | friction | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-ORG-POSITIONS | `headcount.approved` | `job_requisitions` | event_stream | low | Headcount approval (often originating from HCM/SWP) confirmed back to HCM; gives ATS green light to source. |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-ORG-POSITIONS | `requisition.filled` | `job_requisitions` | event_stream | low | Requisition fill closes headcount slot; HCM headcount-plan updates. |
| ATS-RECRUITMENT-PIPELINE | ATS | ATS-TALENT-POOLS | `job_application.rejected` | `job_applications` | lifecycle_progression | low | - |
| ATS-RECRUITMENT-PIPELINE | ATS | ATS-CANDIDATE-CRM | `job_posting.published` | `job_postings` | lifecycle_progression | low | - |
| ATS-RECRUITMENT-PIPELINE | SWP | SWP-DEMAND-FORECAST | `requisition.filled` | `job_requisitions` | event_stream | low | Filled requisition feeds SWP actuals-vs-plan reconciliation. |

### 6.3 Inbound handoffs (events this scope reacts to)

| target module | source domain | source module | trigger_event | payload | integration | friction | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-ORG-POSITIONS | `job_profile.activated` | `job_profiles` | api_call | low | - |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-ORG-POSITIONS | `hcm_position.approved` | `hcm_positions` | api_call | medium | - |
| ATS-RECRUITMENT-PIPELINE | ATS | ATS-CANDIDATE-CRM | `job_application.submitted` | `job_applications` | lifecycle_progression | low | - |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-ORG-POSITIONS | `org_unit.disbanded` | `org_units` | api_call | high | - |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-ORG-POSITIONS | `org_unit.merged` | `org_units` | api_call | high | - |
| ATS-RECRUITMENT-PIPELINE | ATS | ATS-INTERVIEWS | `interview.completed` | `job_applications` | lifecycle_progression | low | - |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-ORG-POSITIONS | `org_unit.activated` | `org_units` | api_call | low | - |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-ORG-POSITIONS | `job_profile.retired` | `job_profiles` | api_call | high | - |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-ORG-POSITIONS | `hcm_position.opened` | `hcm_positions` | api_call | medium | - |
| ATS-RECRUITMENT-PIPELINE | ATS | ATS-TALENT-POOLS | `talent_pool.candidate_activated` | `job_applications` | lifecycle_progression | low | - |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-ORG-POSITIONS | `job_profile.approved` | `job_profiles` | api_call | low | - |
| ATS-RECRUITMENT-PIPELINE | SWP | SWP-DEMAND-FORECAST | `headcount.approved` | `job_requisitions` | api_call | high | Approved headcount in SWP authorises requisition creation in ATS. THIS IS THE CO-MASTER BRIDGE: SWP masters the intent slice (approved position, budget, time window) and ATS masters the execution slice (pipeline, candidates, interviews, offer). High friction because SWP's plan structure (org × geo × level × time) rarely matches ATS's requisition template structure (job code × location × hiring manager × pay range), requiring mapping rules that drift as either side evolves. |
| ATS-RECRUITMENT-PIPELINE | ATS | ATS-INTERVIEWS | `candidate_assessment.failed` | `job_applications` | lifecycle_progression | low | - |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-ORG-POSITIONS | `job_profile.published` | `job_profiles` | event_stream | low | Canonical job profile feeds ATS posting templates and screening criteria. |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-ORG-POSITIONS | `hcm_position.eliminated` | `hcm_positions` | api_call | high | - |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-ORG-POSITIONS | `hcm_position.frozen` | `hcm_positions` | api_call | high | - |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-ORG-POSITIONS | `hcm_position.filled` | `hcm_positions` | api_call | medium | - |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-ORG-POSITIONS | `hcm_position.approved_for_creation` | `hcm_positions` | event_stream | medium | Approved position flows to ATS as the basis for a requisition. Approval state must be in sync to avoid requisitions opened against unapproved positions. |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-ORG-POSITIONS | `org_unit.created` | `org_units` | api_call | medium | - |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-ORG-POSITIONS | `job_profile.updated` | `job_profiles` | api_call | medium | - |
| ATS-RECRUITMENT-PIPELINE | ATS | ATS-INTERVIEWS | `candidate_assessment.passed` | `job_applications` | lifecycle_progression | low | - |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-CORE-WORKER | `employee.terminated` | `job_requisitions` | api_call | low | Employee termination in HCM optionally triggers backfill requisition consideration in ATS. Low friction when SWP-driven; some orgs auto-open a backfill req on regrettable losses, others route through SWP for approval first. |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-ORG-POSITIONS | `org_unit.reorganized` | `org_units` | api_call | high | - |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-ORG-POSITIONS | `org_unit.closed` | `org_units` | api_call | high | - |

### 6.4 Master providers (modules / domains that own masters this scope embeds)

| data_object | role here | necessity | canonical owner(s) | slice notes |
| --- | --- | --- | --- | --- |
| `candidates` | embedded_master | required | ATS-CANDIDATE-CRM (ATS) | - |
| `hcm_positions` | embedded_master | optional | HCM-ORG-POSITIONS (HCM) | - |
| `job_profiles` | embedded_master | required | HCM-ORG-POSITIONS (HCM) | - |
| `locations` | embedded_master | optional | IWMS-LOCATION-MASTER (IWMS) | - |
| `org_units` | embedded_master | optional | HCM-ORG-POSITIONS (HCM) | - |

## 7. Lifecycle states (per touched entity)

### `candidates` (Candidate)

_This scope holds `candidates` as **embedded_master**; the canonical state machine is owned by `ATS-CANDIDATE-CRM`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `prospect` | ✓ | - | - | - | Person known to the recruiting org with no active application. |
| 2 | `active` | - | - | - | - | Candidate has at least one open application or is actively engaged. |
| 3 | `hired` | - | ✓ | ✓ | `ats-candidate-crm:hire_candidate` | Candidate accepted an offer and converted to employee. |
| 4 | `do_not_hire` | - | ✓ | ✓ | `ats-candidate-crm:flag_do_not_hire` | Candidate flagged as ineligible for future consideration; gated decision. |
| 5 | `archived` | - | ✓ | - | - | Candidate kept in the database but not active in any pipeline. |

### `eeo_responses` (EEO Response)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `offered` | ✓ | - | - | - | Candidate presented with voluntary self-ID form. |
| 2 | `declined` | - | ✓ | - | - | Candidate declined to self-identify (counted as 'not disclosed'). |
| 3 | `submitted` | - | ✓ | - | - | Candidate completed and submitted the form. |

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

### `job_applications` (Application)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `applied` | ✓ | - | - | - | Candidate submitted an application against the requisition. |
| 2 | `screening` | - | - | - | - | Recruiter is reviewing resume and qualifications. |
| 3 | `interviewing` | - | - | - | - | Candidate is progressing through interview loops. |
| 4 | `offer_extended` | - | - | - | - | An offer has been generated and is in flight for this application. |
| 5 | `hired` | - | ✓ | ✓ | `ats-pre-employee-record:hire_candidate` | Candidate accepted the offer and was hired; gated transition. |
| 6 | `rejected` | - | ✓ | - | - | Application closed without progression by recruiter or hiring manager. |
| 7 | `withdrawn` | - | ✓ | - | - | Candidate withdrew their application. |

### `job_posting_distributions` (Job Posting Distribution)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `queued` | ✓ | - | - | - | Distribution scheduled but not yet posted. |
| 2 | `posted` | - | - | - | - | Live on the target board. |
| 3 | `expired` | - | ✓ | - | - | Posting reached its expiry date on the board. |
| 4 | `withdrawn` | - | ✓ | - | - | Posting actively removed before expiry. |

### `job_postings` (Job Posting)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | - | - | Posting being composed against a requisition for a specific board or region. |
| 2 | `published` | - | - | ✓ | `ats-recruitment-pipeline:publish_posting` | Posting is live on the target channel; gated publish step. |
| 3 | `paused` | - | - | - | - | Posting temporarily hidden from the channel. |
| 4 | `expired` | - | ✓ | - | - | Posting reached its scheduled end date. |
| 5 | `closed` | - | ✓ | - | - | Posting taken down because the requisition is filled or cancelled. |

### `job_profiles` (Job Profile)

_This scope holds `job_profiles` as **embedded_master**; the canonical state machine is owned by `HCM-ORG-POSITIONS`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | - | - | Profile is being authored or revised; not yet available for position assignment. |
| 2 | `approved` | - | - | ✓ | `hcm-org-positions:approved_job_profile` | Cleared by the catalog owner; ready to be referenced by positions and postings. |
| 3 | `active` | - | - | ✓ | `hcm-org-positions:active_job_profile` | In production use; positions and postings can reference it. |
| 4 | `retired` | - | ✓ | ✓ | `hcm-org-positions:retired_job_profile` | No longer assignable to new positions; historical references preserved. |

### `job_requisitions` (Job Requisition)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | - | - | Hiring manager is drafting the requisition. |
| 2 | `pending_approval` | - | - | - | - | Requisition routed for headcount and budget approval. |
| 3 | `open` | - | - | ✓ | `ats-recruitment-pipeline:approve_requisition` | Requisition approved and actively recruiting. |
| 4 | `on_hold` | - | - | - | - | Recruiting temporarily paused (budget freeze, scope change). |
| 5 | `filled` | - | ✓ | ✓ | `ats-recruitment-pipeline:close_requisition` | Requisition closed because the role was filled. |
| 6 | `cancelled` | - | ✓ | - | - | Requisition closed without a hire. |

### `org_units` (Org Unit)

_This scope holds `org_units` as **embedded_master**; the canonical state machine is owned by `HCM-ORG-POSITIONS`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | - | - | Org unit defined as part of a future structure; not yet operational. |
| 2 | `active` | - | - | ✓ | `hcm-org-positions:active_org_unit` | Operational unit; carries headcount, cost-center linkage, and reporting lines. |
| 3 | `reorganized` | - | ✓ | ✓ | `hcm-org-positions:reorganized_org_unit` | Unit folded into or replaced by a new structure; references remain for history. |
| 4 | `closed` | - | ✓ | ✓ | `hcm-org-positions:closed_org_unit` | Unit dissolved; no employees or positions reside in it. |

### `requisition_approvals` (Requisition Approval)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `pending` | ✓ | - | - | - | Approval step awaiting decision. |
| 2 | `approved` | - | ✓ | ✓ | `ats-recruitment-pipeline:approved_requisition_approval` | Step approved; requisition advances or opens. |
| 3 | `rejected` | - | ✓ | ✓ | `ats-recruitment-pipeline:rejected_requisition_approval` | Step rejected; requisition blocked. |
| 4 | `withdrawn` | - | ✓ | - | - | Request withdrawn by submitter before decision. |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `ats-recruitment-pipeline:read` | baseline-read | Read access to every entity in the module | ✓ |
| `ats-recruitment-pipeline:manage` | baseline-manage | Edit operational records | ✓ |
| `ats-recruitment-pipeline:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `ats-recruitment-pipeline:approve_requisition` | workflow-gate (lifecycle) | Transition `job_requisitions` into state `open` | ✓ |
| `ats-recruitment-pipeline:close_requisition` | workflow-gate (lifecycle) | Transition `job_requisitions` into state `filled` | ✓ |
| `ats-recruitment-pipeline:publish_posting` | workflow-gate (lifecycle) | Transition `job_postings` into state `published` | ✓ |
| `ats-recruitment-pipeline:approved_requisition_approval` | workflow-gate (lifecycle) | Transition `requisition_approvals` into state `approved` | ✓ |
| `ats-recruitment-pipeline:rejected_requisition_approval` | workflow-gate (lifecycle) | Transition `requisition_approvals` into state `rejected` | ✓ |
| `ats-recruitment-pipeline:view_all_applications` | override (personal_content) | View all `job_applications` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:manage_all_applications` | override (personal_content) | Manage all `job_applications` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:view_all_application_screening_answers` | override (personal_content) | View all `application_screening_answers` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:manage_all_application_screening_answers` | override (personal_content) | Manage all `application_screening_answers` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:view_all_eeo_responses` | override (personal_content) | View all `eeo_responses` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:manage_all_eeo_responses` | override (personal_content) | Manage all `eeo_responses` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:submit_eeo_response` | override (submit_lock) | Submit and lock a `eeo_responses` row (post-submit edits gated) | ✓ |
| `ats-recruitment-pipeline:view_all_applicant_flow_records` | override (personal_content) | View all `applicant_flow_records` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:manage_all_applicant_flow_records` | override (personal_content) | Manage all `applicant_flow_records` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:submit_applicant_flow_record` | override (submit_lock) | Submit and lock a `applicant_flow_records` row (post-submit edits gated) | ✓ |
| `ats-recruitment-pipeline:view_all_voluntary_self-identifications` | override (personal_content) | View all `voluntary_self_identifications` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:manage_all_voluntary_self-identifications` | override (personal_content) | Manage all `voluntary_self_identifications` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:submit_voluntary_self-identification` | override (submit_lock) | Submit and lock a `voluntary_self_identifications` row (post-submit edits gated) | ✓ |
| `ats-recruitment-pipeline:submit_ofccp_audit_trail` | override (submit_lock) | Submit and lock a `ofccp_audit_trails` row (post-submit edits gated) | ✓ |

### 8.2 Business rules

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `approve_job_requisition_requires_approver` | `job_requisitions` | has_single_approver | Exactly one explicit approver required; uses the module's approval gate (`ats-recruitment-pipeline:approve_job_requisition` if surfaced as a lifecycle workflow gate). |
| `application_edit_scope` | `job_applications` | has_personal_content | Row-scope by default; override via `ats-recruitment-pipeline:view_all_applications` / `ats-recruitment-pipeline:manage_all_applications` |
| `approve_requisition_approval_requires_approver` | `requisition_approvals` | has_single_approver | Exactly one explicit approver required; uses the module's approval gate (`ats-recruitment-pipeline:approve_requisition_approval` if surfaced as a lifecycle workflow gate). |
| `application_screening_answer_edit_scope` | `application_screening_answers` | has_personal_content | Row-scope by default; override via `ats-recruitment-pipeline:view_all_application_screening_answers` / `ats-recruitment-pipeline:manage_all_application_screening_answers` |
| `eeo_response_edit_scope` | `eeo_responses` | has_personal_content | Row-scope by default; override via `ats-recruitment-pipeline:view_all_eeo_responses` / `ats-recruitment-pipeline:manage_all_eeo_responses` |
| `submit_restricted_to_eeo_response_owner` | `eeo_responses` | has_submit_lock | Only the row's authoring user can submit; post-submit the row is read-only except via `ats-recruitment-pipeline:manage_all_eeo_responses` |
| `applicant_flow_record_edit_scope` | `applicant_flow_records` | has_personal_content | Row-scope by default; override via `ats-recruitment-pipeline:view_all_applicant_flow_records` / `ats-recruitment-pipeline:manage_all_applicant_flow_records` |
| `submit_restricted_to_applicant_flow_record_owner` | `applicant_flow_records` | has_submit_lock | Only the row's authoring user can submit; post-submit the row is read-only except via `ats-recruitment-pipeline:manage_all_applicant_flow_records` |
| `voluntary_self-identification_edit_scope` | `voluntary_self_identifications` | has_personal_content | Row-scope by default; override via `ats-recruitment-pipeline:view_all_voluntary_self-identifications` / `ats-recruitment-pipeline:manage_all_voluntary_self-identifications` |
| `submit_restricted_to_voluntary_self-identification_owner` | `voluntary_self_identifications` | has_submit_lock | Only the row's authoring user can submit; post-submit the row is read-only except via `ats-recruitment-pipeline:manage_all_voluntary_self-identifications` |
| `submit_restricted_to_ofccp_audit_trail_owner` | `ofccp_audit_trails` | has_submit_lock | Only the row's authoring user can submit; post-submit the row is read-only except via `ats-recruitment-pipeline:manage_all_ofccp_audit_trails` |
