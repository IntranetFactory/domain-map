---
artifact: domain-blueprint
fact_sheet_version: "2.0"
system_name: ATS
system_description: Applicant Tracking and Recruiting
system_slug: ats
domain_modules:
  - ats-candidate-crm
  - ats-recruitment-pipeline
domain_code: ATS
related_modules: [ats-background-checks, ats-interviews, ats-offers, ats-pre-employee-record, ats-referrals, ats-talent-pools]
created_at: 2026-05-23
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
| Org Units | Node in the organizational hierarchy: division, business unit, department, team. Carries manager, cost center alignment, geographic scope, and parent/child relationships. HCM masters the operational hierarchy; EPM contributes the cost-center mapping (which would be Finance-mastered once a Finance/GL domain is loaded). |
| Positions | Approved slot in the org - a 'chair' with role definition, cost center, reporting line, location, and FTE allocation. Distinct from job_profiles (the catalog definition) and from employees (the person filling the slot). A position can be open, filled, or eliminated. SWP designs future positions via org_designs; HCM operationalizes them once approved. |

```mermaid
flowchart LR
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef embedded_master fill:#fff4cc,stroke:#c79100,color:#5b4500;
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
  users["Users"]
  org_units -->|"contains"| hcm_positions
  hcm_positions -->|"spawns (opt)"| job_requisitions
  job_requisitions -->|"is advertised through"| job_postings
  job_requisitions -->|"receives"| job_applications
  job_postings -->|"is applied to via"| job_applications
  candidates -->|"submits"| job_applications
  recruitment_sources -->|"attributes"| candidates
  recruitment_agencies -->|"sources"| candidates
  recruitment_events -->|"attracts"| candidates
  users -->|"manages (opt)"| hcm_positions
  users -->|"leads (opt)"| org_units
  job_requisitions -->|"has recruiter and hiring manager"| users
  job_applications -->|"has owning recruiter"| users
  class candidates master;
  class recruitment_sources master;
  class recruitment_agencies master;
  class recruitment_events master;
  class job_requisitions master;
  class job_postings master;
  class job_applications master;
  class hcm_positions embedded_master;
  class org_units embedded_master;
  class users platform_builtin;
```

## 3. Entities catalog

| # | data_object | role | necessity | canonical? | pattern flags | modules | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | `job_applications` (Applications) | master | required | - | personal_content | ATS-RECRUITMENT-PIPELINE | - |
| 2 | `candidates` (Candidates) | master | required | ✓ bare-word | personal_content | ATS-CANDIDATE-CRM, ATS-RECRUITMENT-PIPELINE | - |
| 3 | `job_postings` (Job Postings) | master | required | - | - | ATS-RECRUITMENT-PIPELINE | - |
| 4 | `job_requisitions` (Job Requisitions) | master | required | - | single_approver | ATS-RECRUITMENT-PIPELINE | - |
| 5 | `recruitment_agencies` (Recruitment Agencies) | master | required | - | - | ATS-CANDIDATE-CRM | - |
| 6 | `recruitment_events` (Recruitment Events) | master | required | - | - | ATS-CANDIDATE-CRM | - |
| 7 | `recruitment_sources` (Recruitment Sources) | master | required | - | - | ATS-CANDIDATE-CRM | - |
| 8 | `org_units` (Org Units) | embedded_master | optional | - | - | ATS-RECRUITMENT-PIPELINE | Without HCM org structure, requisitions function with a flat or local org-unit reference. |
| 9 | `hcm_positions` (Positions) | embedded_master | optional | - | single_approver | ATS-RECRUITMENT-PIPELINE | Without HCM-WORKER-RECORD deployed, requisitions function with a local position shell. |

## 4. Aliases and industry synonyms

| data_object | alias | alias_type | preferred? | context | notes |
| --- | --- | --- | --- | --- | --- |
| `candidates` | Applicant | synonym | - | - | generic; used by EEOC and OFCCP |
| `job_applications` | Candidacy | synonym | - | - | practitioner term for the candidate-to-req relationship |
| `job_postings` | Career Site Posting | synonym | - | - | vendor-specific: iCIMS, SmartRecruiters distinguish branded career-site placements |
| `job_requisitions` | Headcount Request | synonym | - | - | finance / HRBP framing emphasizing budget approval |
| `recruitment_events` | Hiring Event | synonym | - | - | umbrella for career fairs, open houses, hackathons, virtual hiring days |
| `job_postings` | Job Ad | synonym | - | - | externally-published version of a requisition |
| `job_applications` | Job Application | synonym | - | - | long-form; candidate-facing flows and EEOC reporting |
| `job_postings` | Job Listing | synonym | - | - | standard on aggregator boards (Indeed, LinkedIn) |
| `job_requisitions` | Job Req | synonym | - | - | universal recruiter shorthand |
| `job_requisitions` | Open Position | synonym | - | - | industry shorthand for approved-and-funded role |
| `candidates` | Person | synonym | - | - | vendor-specific: Workday Recruiting unified internal/external person record |
| `candidates` | Prospect | synonym | - | - | sourcing-CRM term before formal application |
| `recruitment_agencies` | Recruitment Vendor | synonym | - | - | procurement / VMS framing under MSA governance |
| `recruitment_agencies` | Search Firm | synonym | - | - | executive search / retained recruiting framing |
| `recruitment_sources` | Source Channel | synonym | - | - | marketing-influenced framing |
| `recruitment_sources` | Source of Hire | synonym | - | - | standard recruiting-metrics term |
| `recruitment_agencies` | Staffing Agency | synonym | - | - | US term, particularly contingent/temp placements |
| `job_applications` | Submission | synonym | - | - | vendor-specific: Bullhorn (staffing-oriented ATS) |
| `org_units` | cost-bearing unit | synonym | - | - | cluster A \| HCM \| finance-overlay framing |
| `org_units` | department | synonym | ✓ | - | cluster A \| HCM \| common enterprise label |
| `hcm_positions` | headcount slot | synonym | - | - | cluster A \| HCM \| finance / SWP framing |
| `hcm_positions` | seat | synonym | - | - | cluster A \| HCM \| informal / planning usage |

## 5. Relationships

### 5.1 Intra-scope edges

| from | verb | to | cardinality | kind | necessity | owner_side | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `org_units` | contains | `hcm_positions` | one_to_many | reference | required | source | intra \| cluster A \| HCM \| positions live inside an org unit |
| `hcm_positions` | spawns | `job_requisitions` | one_to_many | reference | optional | source | cross \| cluster A \| HCM \| approved position becomes a requisition in ATS |
| `job_requisitions` | is advertised through | `job_postings` | one_to_many | reference | required | source | intra \| ATS \| req opens, postings are children |
| `job_requisitions` | receives | `job_applications` | one_to_many | reference | required | source | intra \| ATS \| apps target a specific req |
| `job_postings` | is applied to via | `job_applications` | one_to_many | reference | required | source | intra \| ATS \| app inflow is anchored on a posting |
| `candidates` | submits | `job_applications` | one_to_many | reference | required | target | intra \| ATS \| candidate persists across applications |
| `recruitment_sources` | attributes | `candidates` | one_to_many | reference | required | target | intra \| ATS \| source-of-hire dimension on candidate |
| `recruitment_agencies` | sources | `candidates` | one_to_many | reference | required | target | intra \| ATS \| agency is the channel; candidate persists |
| `recruitment_events` | attracts | `candidates` | one_to_many | reference | required | target | intra \| ATS \| event is the touchpoint; candidate persists |

### 5.2 Built-in edges (`users` and other platform built-ins)

| from | verb | to | cardinality | necessity | owner_side | notes |
| --- | --- | --- | --- | --- | --- | --- |
| `users` | manages | `hcm_positions` | one_to_many | optional | source | users \| cluster A \| HCM \| manager-of-position relationship \| auto-flipped from many_to_one |
| `users` | leads | `org_units` | one_to_many | optional | source | users \| cluster A \| HCM \| org-unit head \| auto-flipped from many_to_one |
| `job_requisitions` | has recruiter and hiring manager | `users` | many_to_many | required | source | users \| ATS \| recruiter + hiring_manager roles on the req |
| `job_applications` | has owning recruiter | `users` | many_to_many | required | source | users \| ATS \| recruiter role on the application |

### 5.3 Cross-scope edges

| from | verb | to | cardinality | necessity | notes |
| --- | --- | --- | --- | --- | --- |
| `org_units` | groups | `employees` | one_to_many | required | intra \| cluster A \| HCM \| every employee rolls up to an org unit |
| `hcm_positions` | is_filled_by | `employees` | one_to_one | optional | intra \| cluster A \| HCM \| a position may be vacant or filled by one incumbent |
| `job_profiles` | defines | `hcm_positions` | one_to_many | required | intra \| cluster A \| HCM \| job profile is the template for positions |
| `cost_centers` | funds | `org_units` | one_to_many | required | intra \| cluster A \| HCM \| org-unit labor cost rolls to a cost center \| auto-flipped from many_to_one |
| `org_units` | engages | `contingent_workers` | one_to_many | optional | intra \| cluster A \| HCM \| contingent workforce attaches to an org unit |
| `org_units` | is_scored_by | `engagement_drivers` | one_to_many | optional | intra \| cluster A \| HCM \| engagement drivers measured at org-unit level |
| `org_units` | is_measured_by | `people_kpis` | one_to_many | optional | intra \| cluster A \| HCM \| people KPIs aggregated by org unit |
| `org_units` | triggers | `iga_entitlement_definitions` | one_to_many | optional | cross \| cluster A \| HCM \| new/merged/disbanded org units drive IGA group lifecycle |
| `job_profiles` | feeds | `job_postings` | one_to_many | optional | cross \| cluster A \| HCM \| canonical job profile feeds ATS posting templates |
| `salary_bands` | anchors | `hcm_positions` | one_to_many | optional | cross \| cluster A \| HCM \| approved position carries grade/band to Comp-Mgmt \| auto-flipped from many_to_one |
| `org_units` | maps_to | `cost_centers` | one_to_one | optional | cross \| cluster A \| HCM \| new org unit usually maps to ERP-FIN cost center |
| `employees` | fills | `hcm_positions` | one_to_one | optional | intra \| cluster A \| ONBOARDING \| embedded - incumbent of the position being onboarded |
| `hcm_positions` | requires | `compliance_assignments` | one_to_many | optional | intra \| cluster A \| LMS \| role-based compliance training |
| `org_units` | sponsors | `compliance_assignments` | one_to_many | optional | intra \| cluster A \| LMS \| org-unit assigns compliance training |
| `skill_profiles` | feeds | `candidates` | one_to_many | optional | cross \| cluster A \| LMS \| internal-candidate skill data flows to ATS |
| `org_units` | sponsors | `benefit_plans` | many_to_many | optional | intra \| cluster A \| BEN-ADMIN \| embedded - org-level offering |
| `survey_campaigns` | targets | `org_units` | many_to_many | optional | intra \| cluster A \| EMP-EXP \| embedded - org-unit scoping |
| `org_units` | owns | `action_plans` | one_to_many | optional | intra \| cluster A \| EMP-EXP \| org-unit accountable for action plan \| auto-flipped from many_to_one |
| `candidate_referrals` | introduces | `candidates` | one_to_many | required | intra \| ATS \| referral is the introduction event; candidate is durable |
| `talent_pools` | groups | `candidates` | many_to_many | required | intra \| ATS \| pool is a membership shell; candidate lives outside it |
| `job_applications` | schedules | `interviews` | one_to_many | required | intra \| ATS \| interview belongs to the application's pipeline |
| `job_applications` | requires | `candidate_assessments` | one_to_many | required | intra \| ATS \| assessment invitation belongs to the app's pipeline |
| `job_applications` | results in | `job_offers` | one_to_many | required | intra \| ATS \| offer is the conversion of the application |
| `candidates` | becomes | `employees` | one_to_one | required | cross \| ATS→HCM \| candidate.hired creates employee record; identity handoff |
| `job_requisitions` | updates | `position_demand_forecasts` | many_to_many | optional | cross \| ATS→SWP \| requisition.filled feeds the demand-forecast actualization (analytical) |
| `job_requisitions` | feeds | `people_kpis` | many_to_many | optional | cross \| ATS→PA \| requisition.filled rolls into time-to-fill / hire-velocity KPIs (analytical) |
| `candidates` | becomes pre-employee | `pre_employees` | one_to_one | required | Candidate identity continues into the pre-employee record; promoted to employees on activation. |

## 6. Cross-domain context

### 6.1 Co-masters (other modules / domains with a role on this scope's masters)

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
| `job_requisitions` | SWP (Strategic Workforce Planning) | master | required | Headcount intent - SWP masters the position approval, budget alignment, and plan-to-actual reconciliation slice. ATS masters the recruiting-execution slice (pipeline stages, candidates, interviews, offers). Cross-domain handoff SWP→ATS on headcount.approved is the bridge. |

### 6.2 Outbound handoffs (events this scope publishes)

| source module | target domain | target module | trigger_event | payload | integration | friction | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ATS-CANDIDATE-CRM | HCM | _(domain-level)_ | `candidate.hired` | `candidates` | event_stream | high | Hired-candidate event publishes the hiring outcome to HCM, which must create the employee record. Identifier mapping (candidate_id -> employee_id) is the canonical reconciliation gap. |
| ATS-RECRUITMENT-PIPELINE | HCM | _(domain-level)_ | `headcount.approved` | `job_requisitions` | event_stream | low | Headcount approval (often originating from HCM/SWP) confirmed back to HCM; gives ATS green light to source. |
| ATS-RECRUITMENT-PIPELINE | HCM | _(domain-level)_ | `requisition.filled` | `job_requisitions` | event_stream | low | Requisition fill closes headcount slot; HCM headcount-plan updates. |
| ATS-CANDIDATE-CRM | BEN-ADMIN | _(domain-level)_ | `candidate.hired` | `candidates` | event_stream | low | Hired candidate triggers eligibility window in BEN-ADMIN. |
| ATS-CANDIDATE-CRM | PA | _(domain-level)_ | `recruitment_source.attributed` | `recruitment_sources` | batch_sync | low | Source attribution feeds people-analytics quality-of-hire and cost-per-hire models. |
| ATS-CANDIDATE-CRM | ONBOARDING | _(domain-level)_ | `candidate.hired` | `candidates` | event_stream | medium | Hired candidate drives onboarding-plan kickoff with role/location/manager context from ATS payload. |
| ATS-RECRUITMENT-PIPELINE | SWP | _(domain-level)_ | `requisition.filled` | `job_requisitions` | event_stream | low | Filled requisition feeds SWP actuals-vs-plan reconciliation. |

### 6.3 Inbound handoffs (events this scope reacts to)

| target module | source domain | source module | trigger_event | payload | integration | friction | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ATS-RECRUITMENT-PIPELINE | HCM | _(domain-level)_ | `employee.terminated` | `job_requisitions` | api_call | low | Employee termination in HCM optionally triggers backfill requisition consideration in ATS. Low friction when SWP-driven; some orgs auto-open a backfill req on regrettable losses, others route through SWP for approval first. |
| ATS-RECRUITMENT-PIPELINE | SWP | _(domain-level)_ | `headcount.approved` | `job_requisitions` | api_call | high | Approved headcount in SWP authorises requisition creation in ATS. THIS IS THE CO-MASTER BRIDGE: SWP masters the intent slice (approved position, budget, time window) and ATS masters the execution slice (pipeline, candidates, interviews, offer). High friction because SWP's plan structure (org × geo × level × time) rarely matches ATS's requisition template structure (job code × location × hiring manager × pay range), requiring mapping rules that drift as either side evolves. |
| ATS-RECRUITMENT-PIPELINE | HCM | _(domain-level)_ | `hcm_position.approved_for_creation` | `hcm_positions` | event_stream | medium | Approved position flows to ATS as the basis for a requisition. Approval state must be in sync to avoid requisitions opened against unapproved positions. |

### 6.4 Embedded / contributing / consuming dependencies

| data_object | role here | necessity | canonical owner(s) | slice notes |
| --- | --- | --- | --- | --- |
| `hcm_positions` | embedded_master | optional | HCM (Human Capital Management) | Without HCM-WORKER-RECORD deployed, requisitions function with a local position shell. |
| `org_units` | embedded_master | optional | HCM (Human Capital Management) | Without HCM org structure, requisitions function with a flat or local org-unit reference. |

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
