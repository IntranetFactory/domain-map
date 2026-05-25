---
artifact: semantic-blueprint
fact_sheet_version: "2.0"
system_name: ATS
system_description: Applicant Tracking and Recruiting
system_slug: ats
domain_modules:
  - ats-candidate-crm
  - ats-recruitment-pipeline
domain_code: ATS
related_modules: [ats-background-checks, ats-interviews, ats-offers, ats-pre-employee-record, ats-referrals, ats-talent-pools, hcm-core-worker, hcm-org-positions, lms-skills, swp-demand-forecast, talent-succession-career]
created_at: 2026-05-24
---

# Applicant Tracking and Recruiting

## 1. Overview

Requisition management, candidate sourcing, interview workflows, and offer management. AI-assisted matching and screening overlays are increasingly bundled.

Candidate matching and resume parsing ML - significant in modern ATS products; the rest is pipeline stages, scheduling, and offers.

## 2. Entity summary

| Name | Description |
| --- | --- |
| Applications | A candidate's submission against a specific requisition. Carries pipeline stage, status (active / rejected / withdrawn / hired), source, and the full evaluation history. |
| Candidates | Person known to the recruiting org, with or without an active application. Carries contact details, resume, tags, GDPR consent, and source. Distinct from Employee until hired. |
| Job Postings | Published, candidate-facing version of a requisition on a career site or job board. One requisition can have many postings (per board, language, or region). |
| Job Requisitions | Approved request to hire for a specific role. The master ATS work item, carries headcount, level, location, hiring manager, recruiter, and status (draft / open / on_hold / filled / cancelled). |
| Recruitment Agencies | Third-party recruiter or staffing firm supplying candidates. Tracks contract terms, contact, performance, and the candidates they have submitted. |
| Recruitment Events | Career fair, on-campus event, hackathon, or meetup used as a sourcing channel. Tracks attendees, captured leads, and event ROI. |
| Recruitment Sources | Channel a candidate came from: job board, referral, agency, sourcing campaign, career event, or inbound. Used for source-of-hire analytics and channel ROI. |
| Job Profiles | Canonical role definition in the job catalog: title, family, level, responsibilities, required skills and competencies, pay range, FLSA classification. Distinct from positions (which are slots referencing a profile). Many positions share a single job profile. |
| Locations | - |
| Org Units | Node in the organizational hierarchy: division, business unit, department, team. Carries manager, cost center alignment, geographic scope, and parent/child relationships. HCM masters the operational hierarchy; EPM contributes the cost-center mapping (which would be Finance-mastered once a Finance/GL domain is loaded). |
| Positions | Approved slot in the org - a 'chair' with role definition, cost center, reporting line, location, and FTE allocation. Distinct from job_profiles (the catalog definition) and from employees (the person filling the slot). A position can be open, filled, or eliminated. SWP designs future positions via org_designs; HCM operationalizes them once approved. |
| Skill Profiles | Per-worker collection of skills with self-assessed and validated proficiency levels, derived from completed courses, certifications, performance signals, and inferred peer-comparison. The Workday Skills Cloud central artifact and equivalents (SuccessFactors Skills, Cornerstone Capabilities, Eightfold Talent DNA). |
| Career Aspirations | Worker-declared career interest: target roles, mobility preferences (geographic, functional), aspired timeline. Drives internal-mobility matching. |

```mermaid
flowchart LR
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef embedded_master fill:#fff4cc,stroke:#c79100,color:#5b4500;
  classDef contributor fill:#cfe8ff,stroke:#1976d2,color:#0d3a66;
  classDef consumer fill:#e8def8,stroke:#7b1fa2,color:#3a155d;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  candidates["Candidates"]
  recruitment_sources["Recruitment Sources"]
  recruitment_agencies["Recruitment Agencies"]
  recruitment_events["Recruitment Events"]
  job_requisitions["Job Requisitions"]
  job_postings["Job Postings"]
  job_applications["Applications"]
  hcm_positions["Positions"]
  org_units["Org Units"]
  locations["Locations"]
  job_profiles["Job Profiles"]
  skill_profiles["Skill Profiles"]
  career_aspirations["Career Aspirations"]
  users["Users"]
  org_units -->|"contains"| hcm_positions
  job_profiles -->|"defines"| hcm_positions
  job_profiles -->|"maps_to (opt)"| skill_profiles
  hcm_positions -->|"spawns (opt)"| job_requisitions
  job_profiles -->|"feeds (opt)"| job_postings
  job_profiles -->|"expects (opt)"| skill_profiles
  skill_profiles -->|"feeds (opt)"| candidates
  skill_profiles -->|"feeds (opt)"| career_aspirations
  job_requisitions -->|"is advertised through"| job_postings
  job_requisitions -->|"receives"| job_applications
  job_postings -->|"is applied to via"| job_applications
  candidates -->|"submits"| job_applications
  recruitment_sources -->|"attributes"| candidates
  recruitment_agencies -->|"sources"| candidates
  recruitment_events -->|"attracts"| candidates
  org_units -->|"rolls_up_to (opt)"| org_units
  locations -->|"rolls_up_to (opt)"| locations
  users -->|"manages (opt)"| hcm_positions
  users -->|"leads (opt)"| org_units
  users -->|"owns (opt)"| job_profiles
  users -->|"holds"| skill_profiles
  job_requisitions -->|"has recruiter and hiring manager"| users
  job_applications -->|"has owning recruiter"| users
  users -->|"declares"| career_aspirations
  org_units -->|"has members (opt)"| users
  locations -->|"houses (opt)"| users
  class candidates master;
  class recruitment_sources master;
  class recruitment_agencies master;
  class recruitment_events master;
  class job_requisitions master;
  class job_postings master;
  class job_applications master;
  class hcm_positions embedded_master;
  class org_units embedded_master;
  class locations embedded_master;
  class job_profiles embedded_master;
  class skill_profiles contributor;
  class career_aspirations consumer;
  class users platform_builtin;
```

## 3. Entities catalog

| # | data_object | role | mastered in | necessity | pattern flags | modules | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | `job_applications` (Applications) | master | - | required | personal_content | ATS-RECRUITMENT-PIPELINE | - |
| 2 | `candidates` (Candidates) | master | - | required | personal_content | ATS-CANDIDATE-CRM, ATS-RECRUITMENT-PIPELINE | - |
| 3 | `job_postings` (Job Postings) | master | - | required | - | ATS-RECRUITMENT-PIPELINE | - |
| 4 | `job_requisitions` (Job Requisitions) | master | - | required | single_approver | ATS-RECRUITMENT-PIPELINE | - |
| 5 | `recruitment_agencies` (Recruitment Agencies) | master | - | required | - | ATS-CANDIDATE-CRM | - |
| 6 | `recruitment_events` (Recruitment Events) | master | - | required | - | ATS-CANDIDATE-CRM | - |
| 7 | `recruitment_sources` (Recruitment Sources) | master | - | required | - | ATS-CANDIDATE-CRM | - |
| 8 | `job_profiles` (Job Profiles) | embedded_master | `hcm-org-positions` | required | single_approver | ATS-RECRUITMENT-PIPELINE | - |
| 9 | `locations` (Locations) | embedded_master | `IWMS` _(domain-level, not modularized)_ | optional | - | ATS-RECRUITMENT-PIPELINE | - |
| 10 | `org_units` (Org Units) | embedded_master | `hcm-org-positions` | optional | - | ATS-RECRUITMENT-PIPELINE | - |
| 11 | `hcm_positions` (Positions) | embedded_master | `hcm-org-positions` | optional | single_approver | ATS-RECRUITMENT-PIPELINE | - |
| 12 | `skill_profiles` (Skill Profiles) | contributor | `lms-skills` | required | personal_content | ATS-CANDIDATE-CRM | - |
| 13 | `career_aspirations` (Career Aspirations) | consumer | `talent-succession-career` | optional | personal_content | ATS-CANDIDATE-CRM | - |

## 4. Aliases and industry synonyms

_(no industry-scoped aliases or non-synonym alias types loaded for this scope; generic synonyms are omitted as common knowledge.)_

## 5. Relationships

### 5.1 Intra-scope edges

| from | verb | to | cardinality | kind | necessity | owner_side | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `org_units` | contains | `hcm_positions` | one_to_many | reference | required | source | intra \| cluster A \| HCM \| positions live inside an org unit |
| `job_profiles` | defines | `hcm_positions` | one_to_many | reference | required | source | intra \| cluster A \| HCM \| job profile is the template for positions |
| `job_profiles` | maps_to | `skill_profiles` | many_to_many | association | optional | source | intra \| cluster A \| HCM \| competencies expected by job profile |
| `hcm_positions` | spawns | `job_requisitions` | one_to_many | reference | optional | source | cross \| cluster A \| HCM \| approved position becomes a requisition in ATS |
| `job_profiles` | feeds | `job_postings` | one_to_many | reference | optional | source | cross \| cluster A \| HCM \| canonical job profile feeds ATS posting templates |
| `job_profiles` | expects | `skill_profiles` | many_to_many | association | optional | source | intra \| cluster A \| LMS \| competency expectation by profile |
| `skill_profiles` | feeds | `candidates` | one_to_many | reference | optional | source | cross \| cluster A \| LMS \| internal-candidate skill data flows to ATS |
| `skill_profiles` | feeds | `career_aspirations` | one_to_many | reference | optional | source | cross \| cluster A \| LMS \| skill profile drives talent-mobility matching |
| `job_requisitions` | is advertised through | `job_postings` | one_to_many | reference | required | source | intra \| ATS \| req opens, postings are children |
| `job_requisitions` | receives | `job_applications` | one_to_many | reference | required | source | intra \| ATS \| apps target a specific req |
| `job_postings` | is applied to via | `job_applications` | one_to_many | reference | required | source | intra \| ATS \| app inflow is anchored on a posting |
| `candidates` | submits | `job_applications` | one_to_many | reference | required | target | intra \| ATS \| candidate persists across applications |
| `recruitment_sources` | attributes | `candidates` | one_to_many | reference | required | target | intra \| ATS \| source-of-hire dimension on candidate |
| `recruitment_agencies` | sources | `candidates` | one_to_many | reference | required | target | intra \| ATS \| agency is the channel; candidate persists |
| `recruitment_events` | attracts | `candidates` | one_to_many | reference | required | target | intra \| ATS \| event is the touchpoint; candidate persists |
| `org_units` | rolls_up_to | `org_units` | one_to_many | reference | optional | source | Hierarchical parent-child between org_units (Team -> Department -> Division -> BU -> Company). |
| `locations` | rolls_up_to | `locations` | one_to_many | reference | optional | source | Hierarchical parent-child between locations (Office -> City -> Country -> Region). |

### 5.2 Built-in edges (`users` and other platform built-ins)

| from | verb | to | cardinality | necessity | owner_side | notes |
| --- | --- | --- | --- | --- | --- | --- |
| `users` | manages | `hcm_positions` | one_to_many | optional | source | users \| cluster A \| HCM \| manager-of-position relationship \| auto-flipped from many_to_one |
| `users` | leads | `org_units` | one_to_many | optional | source | users \| cluster A \| HCM \| org-unit head \| auto-flipped from many_to_one |
| `users` | owns | `job_profiles` | one_to_many | optional | source | users \| cluster A \| HCM \| catalog owner (HR/COE) \| auto-flipped from many_to_one |
| `users` | holds | `skill_profiles` | one_to_many | required | source | users \| cluster A \| LMS \| learner identity \| auto-flipped from many_to_one |
| `job_requisitions` | has recruiter and hiring manager | `users` | many_to_many | required | source | users \| ATS \| recruiter + hiring_manager roles on the req |
| `job_applications` | has owning recruiter | `users` | many_to_many | required | source | users \| ATS \| recruiter role on the application |
| `users` | declares | `career_aspirations` | one_to_many | required | target | The employee whose aspirations these are. |
| `org_units` | has members | `users` | one_to_many | optional | target | Every user is assigned to one or more org_units (department membership). Drives assignment routing, RBAC scoping, and chargeback. |
| `locations` | houses | `users` | one_to_many | optional | target | Every user has a primary work location. Drives walk-up support routing, on-site dispatch, and location-based access. |

### 5.3 Cross-scope edges

| from | verb | to | cardinality | necessity | notes |
| --- | --- | --- | --- | --- | --- |
| `org_units` | groups | `employees` | one_to_many | required | intra \| cluster A \| HCM \| every employee rolls up to an org unit |
| `hcm_positions` | is_filled_by | `employees` | one_to_one | optional | intra \| cluster A \| HCM \| a position may be vacant or filled by one incumbent |
| `cost_centers` | funds | `org_units` | one_to_many | required | intra \| cluster A \| HCM \| org-unit labor cost rolls to a cost center \| auto-flipped from many_to_one |
| `employees` | holds | `skill_profiles` | one_to_one | optional | intra \| cluster A \| HCM \| each employee may have a skill profile |
| `org_units` | engages | `contingent_workers` | one_to_many | optional | intra \| cluster A \| HCM \| contingent workforce attaches to an org unit |
| `org_units` | is_scored_by | `engagement_drivers` | one_to_many | optional | intra \| cluster A \| HCM \| engagement drivers measured at org-unit level |
| `org_units` | is_measured_by | `people_kpis` | one_to_many | optional | intra \| cluster A \| HCM \| people KPIs aggregated by org unit |
| `org_units` | triggers | `iga_entitlement_definitions` | one_to_many | optional | cross \| cluster A \| HCM \| new/merged/disbanded org units drive IGA group lifecycle |
| `job_profiles` | maps_to | `courses` | many_to_many | optional | cross \| cluster A \| HCM \| job-profile competencies drive required training |
| `employees` | becomes | `career_aspirations` | one_to_one | optional | cross \| cluster A \| HCM \| new employee triggers talent-profile initialization in Talent-Mgmt |
| `salary_bands` | anchors | `hcm_positions` | one_to_many | optional | cross \| cluster A \| HCM \| approved position carries grade/band to Comp-Mgmt \| auto-flipped from many_to_one |
| `salary_bands` | bands | `job_profiles` | one_to_many | optional | cross \| cluster A \| HCM \| job-profile-to-salary-band mapping is authoritative \| auto-flipped from many_to_one |
| `org_units` | maps_to | `cost_centers` | one_to_one | optional | cross \| cluster A \| HCM \| new org unit usually maps to ERP-FIN cost center |
| `skill_profiles` | updated by | `learner_certifications` | one_to_many | optional | intra \| cluster A \| LMS \| earning a cert refreshes the worker skill profile \| auto-flipped from many_to_one |
| `skill_profiles` | updated by | `course_enrollments` | one_to_many | optional | intra \| cluster A \| LMS \| completion refreshes skill profile \| auto-flipped from many_to_one |
| `hcm_positions` | requires | `compliance_assignments` | one_to_many | optional | intra \| cluster A \| LMS \| role-based compliance training |
| `job_profiles` | requires | `learning_paths` | many_to_many | optional | intra \| cluster A \| LMS \| job-profile competency paths |
| `org_units` | sponsors | `compliance_assignments` | one_to_many | optional | intra \| cluster A \| LMS \| org-unit assigns compliance training |
| `course_enrollments` | updates | `career_aspirations` | one_to_many | optional | cross \| cluster A \| LMS \| completion drives dev-plans / succession |
| `org_units` | sponsors | `benefit_plans` | many_to_many | optional | intra \| cluster A \| BEN-ADMIN \| embedded: org-level offering |
| `survey_campaigns` | targets | `org_units` | many_to_many | optional | intra \| cluster A \| EMP-EXP \| embedded: org-unit scoping |
| `org_units` | owns | `action_plans` | one_to_many | optional | intra \| cluster A \| EMP-EXP \| org-unit accountable for action plan \| auto-flipped from many_to_one |
| `career_aspirations` | informs | `survey_responses` | one_to_many | optional | cross \| cluster A \| EMP-EXP \| negative sentiment triggers flight-risk review in TM \| auto-flipped from many_to_one |
| `candidate_referrals` | introduces | `candidates` | one_to_many | required | intra \| ATS \| referral is the introduction event; candidate is durable |
| `talent_pools` | groups | `candidates` | many_to_many | required | intra \| ATS \| pool is a membership shell; candidate lives outside it |
| `job_applications` | schedules | `interviews` | one_to_many | required | intra \| ATS \| interview belongs to the application's pipeline |
| `job_applications` | requires | `candidate_assessments` | one_to_many | required | intra \| ATS \| assessment invitation belongs to the app's pipeline |
| `job_applications` | results in | `job_offers` | one_to_many | required | intra \| ATS \| offer is the conversion of the application |
| `candidates` | becomes | `employees` | one_to_one | required | cross \| ATS→HCM \| candidate.hired creates employee record; identity handoff |
| `job_requisitions` | updates | `position_demand_forecasts` | many_to_many | optional | cross \| ATS→SWP \| requisition.filled feeds the demand-forecast actualization (analytical) |
| `job_requisitions` | feeds | `people_kpis` | many_to_many | optional | cross \| ATS→PA \| requisition.filled rolls into time-to-fill / hire-velocity KPIs (analytical) |
| `candidates` | becomes pre-employee | `pre_employees` | one_to_one | required | Candidate identity continues into the pre-employee record; promoted to employees on activation. |
| `employees` | fills | `hcm_positions` | one_to_one | optional | intra \| cluster A \| ONBOARDING \| embedded: incumbent of the position being onboarded |
| `succession_plans` | considers | `career_aspirations` | one_to_many | optional | Successor selection respects employee-declared aspirations and mobility preferences. |

## 6. Cross-domain context

### 6.1 Master consumers (other modules / domains that embed this scope's masters)

| data_object | other module / domain | role | necessity | notes |
| --- | --- | --- | --- | --- |
| `candidates` | ATS-BACKGROUND-CHECKS (Background Checks) - ATS | embedded_master | required | - |
| `candidates` | ATS-INTERVIEWS (Interviews) - ATS | embedded_master | required | - |
| `candidates` | ATS-OFFERS (Offers) - ATS | embedded_master | required | - |
| `candidates` | ATS-PRE-EMPLOYEE-RECORD (Pre-Employee Record) - ATS | embedded_master | required | - |
| `candidates` | ATS-REFERRALS (Employee Referrals) - ATS | embedded_master | required | - |
| `candidates` | ATS-TALENT-POOLS (Talent Pools) - ATS | embedded_master | required | - |
| `job_applications` | ATS-INTERVIEWS (Interviews) - ATS | embedded_master | required | - |
| `job_applications` | ATS-OFFERS (Offers) - ATS | embedded_master | required | - |
| `job_requisitions` | SWP-DEMAND-FORECAST (Demand Forecast) - SWP | contributor | required | - |

### 6.2 Outbound handoffs (events this scope publishes)

| source module | target domain | target module | trigger_event | payload | integration | friction | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ATS-RECRUITMENT-PIPELINE | HCM | _(domain-level)_ | `headcount.approved` | `job_requisitions` | event_stream | low | Headcount approval (often originating from HCM/SWP) confirmed back to HCM; gives ATS green light to source. |
| ATS-RECRUITMENT-PIPELINE | HCM | _(domain-level)_ | `requisition.filled` | `job_requisitions` | event_stream | low | Requisition fill closes headcount slot; HCM headcount-plan updates. |
| ATS-CANDIDATE-CRM | HCM | _(domain-level)_ | `candidate.hired` | `candidates` | event_stream | high | Hired-candidate event publishes the hiring outcome to HCM, which must create the employee record. Identifier mapping (candidate_id -> employee_id) is the canonical reconciliation gap. |
| ATS-CANDIDATE-CRM | ATS | ATS-RECRUITMENT-PIPELINE | `job_application.submitted` | `job_applications` | lifecycle_progression | low | - |
| ATS-CANDIDATE-CRM | BEN-ADMIN | _(domain-level)_ | `candidate.hired` | `candidates` | event_stream | low | Hired candidate triggers eligibility window in BEN-ADMIN. |
| ATS-CANDIDATE-CRM | PA | _(domain-level)_ | `recruitment_source.attributed` | `recruitment_sources` | batch_sync | low | Source attribution feeds people-analytics quality-of-hire and cost-per-hire models. |
| ATS-CANDIDATE-CRM | ONBOARDING | _(domain-level)_ | `candidate.hired` | `candidates` | event_stream | medium | Hired candidate drives onboarding-plan kickoff with role/location/manager context from ATS payload. |
| ATS-RECRUITMENT-PIPELINE | SWP | SWP-DEMAND-FORECAST | `requisition.filled` | `job_requisitions` | event_stream | low | Filled requisition feeds SWP actuals-vs-plan reconciliation. |

### 6.3 Inbound handoffs (events this scope reacts to)

| target module | source domain | source module | trigger_event | payload | integration | friction | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ATS-RECRUITMENT-PIPELINE | ATS | ATS-INTERVIEWS | `candidate_assessment.failed` | `job_applications` | lifecycle_progression | low | - |
| ATS-CANDIDATE-CRM | LMS | LMS-SKILLS | `skill_profile.updated` | `skill_profiles` | event_stream | medium | Internal-candidate skill data flows into ATS for internal mobility sourcing. |
| ATS-CANDIDATE-CRM | TALENT-MGMT | TALENT-SUCCESSION-CAREER | `successor.tagged` | `career_aspirations` | api_call | low | Successors identified in succession_plans surface in ATS as pre-qualified internal candidates for matched requisitions. |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-ORG-POSITIONS | `hcm_position.approved_for_creation` | `hcm_positions` | event_stream | medium | Approved position flows to ATS as the basis for a requisition. Approval state must be in sync to avoid requisitions opened against unapproved positions. |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-ORG-POSITIONS | `job_profile.published` | `job_profiles` | event_stream | low | Canonical job profile feeds ATS posting templates and screening criteria. |
| ATS-RECRUITMENT-PIPELINE | SWP | SWP-DEMAND-FORECAST | `headcount.approved` | `job_requisitions` | api_call | high | Approved headcount in SWP authorises requisition creation in ATS. THIS IS THE CO-MASTER BRIDGE: SWP masters the intent slice (approved position, budget, time window) and ATS masters the execution slice (pipeline, candidates, interviews, offer). High friction because SWP's plan structure (org × geo × level × time) rarely matches ATS's requisition template structure (job code × location × hiring manager × pay range), requiring mapping rules that drift as either side evolves. |
| ATS-RECRUITMENT-PIPELINE | ATS | ATS-TALENT-POOLS | `talent_pool.candidate_activated` | `job_applications` | lifecycle_progression | low | - |
| ATS-CANDIDATE-CRM | ATS | ATS-REFERRALS | `candidate_referral.submitted` | `candidates` | lifecycle_progression | low | - |
| ATS-RECRUITMENT-PIPELINE | ATS | ATS-INTERVIEWS | `interview.completed` | `job_applications` | lifecycle_progression | low | - |
| ATS-RECRUITMENT-PIPELINE | ATS | ATS-INTERVIEWS | `candidate_assessment.passed` | `job_applications` | lifecycle_progression | low | - |
| ATS-RECRUITMENT-PIPELINE | HCM | HCM-CORE-WORKER | `employee.terminated` | `job_requisitions` | api_call | low | Employee termination in HCM optionally triggers backfill requisition consideration in ATS. Low friction when SWP-driven; some orgs auto-open a backfill req on regrettable losses, others route through SWP for approval first. |

### 6.4 Master providers (modules / domains that own masters this scope embeds)

| data_object | role here | necessity | canonical owner(s) | slice notes |
| --- | --- | --- | --- | --- |
| `hcm_positions` | embedded_master | optional | HCM-ORG-POSITIONS (HCM) | - |
| `job_profiles` | embedded_master | required | HCM-ORG-POSITIONS (HCM) | - |
| `locations` | embedded_master | optional | IWMS (Workplace and Space Management) | - |
| `org_units` | embedded_master | optional | HCM-ORG-POSITIONS (HCM) | - |
| `skill_profiles` | contributor | required | LMS-SKILLS (LMS) | - |
| `career_aspirations` | consumer | optional | TALENT-SUCCESSION-CAREER (TALENT-MGMT) | - |

## 7. Lifecycle states (per master)

### `candidates` (Candidate)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `prospect` | ✓ | - | _(always)_ | - | - | Person known to the recruiting org with no active application. |
| 2 | `active` | - | - | _(always)_ | - | - | Candidate has at least one open application or is actively engaged. |
| 3 | `hired` | - | ✓ | _(always)_ | ✓ | `ats-candidate-crm:hire_candidate` | Candidate accepted an offer and converted to employee. |
| 4 | `do_not_hire` | - | ✓ | _(always)_ | ✓ | `ats-candidate-crm:flag_do_not_hire` | Candidate flagged as ineligible for future consideration; gated decision. |
| 5 | `archived` | - | ✓ | _(always)_ | - | - | Candidate kept in the database but not active in any pipeline. |

### `job_applications` (Application)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `applied` | ✓ | - | _(always)_ | - | - | Candidate submitted an application against the requisition. |
| 2 | `screening` | - | - | _(always)_ | - | - | Recruiter is reviewing resume and qualifications. |
| 3 | `interviewing` | - | - | `ATS-INTERVIEWS` (needs install) | - | - | Candidate is progressing through interview loops. |
| 4 | `offer_extended` | - | - | `ATS-OFFERS` (needs install) | - | - | An offer has been generated and is in flight for this application. |
| 5 | `hired` | - | ✓ | `ATS-PRE-EMPLOYEE-RECORD` (needs install) | ✓ | `ats-pre-employee-record:hire_candidate` | Candidate accepted the offer and was hired; gated transition. |
| 6 | `rejected` | - | ✓ | _(always)_ | - | - | Application closed without progression by recruiter or hiring manager. |
| 7 | `withdrawn` | - | ✓ | _(always)_ | - | - | Candidate withdrew their application. |

### `job_postings` (Job Posting)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | _(always)_ | - | - | Posting being composed against a requisition for a specific board or region. |
| 2 | `published` | - | - | _(always)_ | ✓ | `ats-recruitment-pipeline:publish_posting` | Posting is live on the target channel; gated publish step. |
| 3 | `paused` | - | - | _(always)_ | - | - | Posting temporarily hidden from the channel. |
| 4 | `expired` | - | ✓ | _(always)_ | - | - | Posting reached its scheduled end date. |
| 5 | `closed` | - | ✓ | _(always)_ | - | - | Posting taken down because the requisition is filled or cancelled. |

### `job_requisitions` (Job Requisition)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | _(always)_ | - | - | Hiring manager is drafting the requisition. |
| 2 | `pending_approval` | - | - | _(always)_ | - | - | Requisition routed for headcount and budget approval. |
| 3 | `open` | - | - | _(always)_ | ✓ | `ats-recruitment-pipeline:approve_requisition` | Requisition approved and actively recruiting. |
| 4 | `on_hold` | - | - | _(always)_ | - | - | Recruiting temporarily paused (budget freeze, scope change). |
| 5 | `filled` | - | ✓ | _(always)_ | ✓ | `ats-recruitment-pipeline:close_requisition` | Requisition closed because the role was filled. |
| 6 | `cancelled` | - | ✓ | _(always)_ | - | - | Requisition closed without a hire. |

### `recruitment_agencies` (Recruitment Agency)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `prospective` | ✓ | - | _(always)_ | - | - | Agency under evaluation; contract not yet executed. |
| 2 | `active` | - | - | _(always)_ | - | - | Agency has executed agreement and is engaged on one or more requisitions. |
| 3 | `on_hold` | - | - | _(always)_ | - | - | Engagement paused (performance review, contractual dispute, hiring freeze). |
| 4 | `terminated` | - | ✓ | _(always)_ | - | - | Relationship ended; no further requisitions are routed to this agency. |

### `recruitment_events` (Recruitment Event)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `planned` | ✓ | - | _(always)_ | - | - | Event scoped and budgeted; date, venue, target audience set; registration not yet open. |
| 2 | `open_for_registration` | - | - | _(always)_ | - | - | Registration is accepting attendees; promotion campaigns active. |
| 3 | `held` | - | - | _(always)_ | - | - | Event has been executed; attendee lists captured, leads ingested into talent pool. |
| 4 | `closed` | - | ✓ | _(always)_ | - | - | Post-event activities complete; cost accounting and source-attribution finalized. |
| 5 | `cancelled` | - | ✓ | _(always)_ | - | - | Event called off before it happens; sunk costs recognized, attendees notified. |

## 8. Permissions and business rules (derived)

### 8.1 `ATS-CANDIDATE-CRM`

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `ats-candidate-crm:read` | baseline-read | Read access to every entity in the module | ✓ |
| `ats-candidate-crm:manage` | baseline-manage | Edit operational records | ✓ |
| `ats-candidate-crm:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `ats-candidate-crm:hire_candidate` | workflow-gate (lifecycle) | Transition `candidates` into state `hired` | ✓ |
| `ats-candidate-crm:flag_do_not_hire` | workflow-gate (lifecycle) | Transition `candidates` into state `do_not_hire` | ✓ |
| `ats-candidate-crm:view_all_candidates` | override (personal_content) | View all `candidates` rows beyond row-scope | ✓ |
| `ats-candidate-crm:manage_all_candidates` | override (personal_content) | Manage all `candidates` rows beyond row-scope | ✓ |

Business rules:

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `candidate_edit_scope` | `candidates` | has_personal_content | Row-scope by default; override via `ats-candidate-crm:view_all_candidates` / `ats-candidate-crm:manage_all_candidates` |

### 8.2 `ATS-RECRUITMENT-PIPELINE`

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `ats-recruitment-pipeline:read` | baseline-read | Read access to every entity in the module | ✓ |
| `ats-recruitment-pipeline:manage` | baseline-manage | Edit operational records | ✓ |
| `ats-recruitment-pipeline:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `ats-recruitment-pipeline:approve_requisition` | workflow-gate (lifecycle) | Transition `job_requisitions` into state `open` | ✓ |
| `ats-recruitment-pipeline:close_requisition` | workflow-gate (lifecycle) | Transition `job_requisitions` into state `filled` | ✓ |
| `ats-recruitment-pipeline:publish_posting` | workflow-gate (lifecycle) | Transition `job_postings` into state `published` | ✓ |
| `ats-recruitment-pipeline:hire_candidate` | workflow-gate (lifecycle) | Transition `candidates` into state `hired` | ✓ |
| `ats-recruitment-pipeline:flag_do_not_hire` | workflow-gate (lifecycle) | Transition `candidates` into state `do_not_hire` | ✓ |
| `ats-recruitment-pipeline:view_all_candidates` | override (personal_content) | View all `candidates` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:manage_all_candidates` | override (personal_content) | Manage all `candidates` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:view_all_applications` | override (personal_content) | View all `job_applications` rows beyond row-scope | ✓ |
| `ats-recruitment-pipeline:manage_all_applications` | override (personal_content) | Manage all `job_applications` rows beyond row-scope | ✓ |

Business rules:

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `candidate_edit_scope` | `candidates` | has_personal_content | Row-scope by default; override via `ats-recruitment-pipeline:view_all_candidates` / `ats-recruitment-pipeline:manage_all_candidates` |
| `approve_job_requisition_requires_approver` | `job_requisitions` | has_single_approver | Exactly one explicit approver required; uses the module's approval gate (`ats-recruitment-pipeline:approve_job_requisition` if surfaced as a lifecycle workflow gate). |
| `application_edit_scope` | `job_applications` | has_personal_content | Row-scope by default; override via `ats-recruitment-pipeline:view_all_applications` / `ats-recruitment-pipeline:manage_all_applications` |
