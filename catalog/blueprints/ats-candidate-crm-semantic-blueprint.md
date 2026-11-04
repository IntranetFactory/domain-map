---
artifact: semantic-blueprint
version: "3.1"
license: MIT
system_name: Candidate CRM
tagline: Build and nurture a pipeline of candidates long before a role opens.
description: |
  Capture every candidate, source, and recruiter touchpoint in one place. Run nurture campaigns, log interactions, and keep warm relationships ready so you can fill roles from people who already know you.

  Consent and data-subject requests are tracked alongside each profile, so candidate privacy is handled as part of the workflow rather than bolted on.
system_slug: ats-candidate-crm
domain_modules:
  - ats-candidate-crm
domain_code: ATS
icon_name: user-plus
related_modules: [abm-intent, ats-interviews, ats-offers, ats-pre-employee-record, ats-recruitment-pipeline, ats-referrals, ats-talent-pools, ben-enrollment, cwm-worker-sourcing, hcm-core-worker, hcm-lifecycle-workflows, hcm-org-positions, hiring-starter, lms-compliance-training, lms-ct-gdpr, onb-journey-mgmt, pa-workforce-metrics, tlnt-intel-marketplace, tlnt-intel-mobility]
persona: [HIRING-MANAGER, LEGAL-COMPLIANCE-SPECIALIST, RECRUITING-RECRUITER]
supports_raci: false
created_at: 2026-11-04
---

# Candidate CRM

## 1. Overview

The candidate-relationship backbone of an ATS, masters candidates (including the `prospect` lifecycle state), recruitment sources, agencies, and events. Structurally the same shape as standalone candidate-CRM products. Folds the AI-RECRUIT capability (resume parsing, ML matching, screening assistants) since those tools operate on `candidates` and are tightly bound to candidate workflows.

## 2. Entity summary

| Name | data_object | Description |
| --- | --- | --- |
| Agency Submissions | `agency_submissions` | Records of a staffing or search agency submitting a candidate against a requisition, with the dedup ownership window and fee terms on conversion to a hire. |
| Candidate Consents | `candidate_consents` | Per-candidate opt-in records for privacy and data retention, with consent type, jurisdiction, and granted and withdrawal timestamps. |
| Candidate Documents | `candidate_documents` | Files attached to a candidate such as resumes, cover letters, portfolios, and signed disclosures, with document type, storage location, and visibility. |
| Candidate Emails | `candidate_emails` | Threaded email correspondence with a candidate as a first-class record, capturing sent and received messages, the template used, and delivery status. |
| Candidate Engagements | `candidate_engagements` | Single recruiter-to-candidate touchpoints across channels such as email, call, or SMS, with direction, timestamp, status, and content reference. |
| Candidate Notes | `candidate_notes` | Internal-only recruiter or hiring-team notes on a candidate, with author, body, visibility scope, and optional mentions, never sent to the candidate. |
| Candidate Nurture Campaigns | `candidate_nurture_campaigns` | Multi-touch automated outreach sequences targeting talent-pool segments, with cadence, step templates, audience filter, and lifecycle state. |
| Candidates | `candidates` | People known to the recruiting organization, with or without an active application, carrying contact details, resume, tags, consent, and source. |
| Data Subject Requests | `data_subject_requests` | Privacy rights requests from candidates exercising access, rectification, erasure, restriction, portability, or objection, with intake, due date, and fulfillment. |
| Outreach Sequence Steps | `outreach_sequence_steps` | Ordered steps within an outreach sequence, each defining the channel, day offset, message template, and whether the step is automated or needs a recruiter action. |
| Outreach Sequences | `outreach_sequences` | Named multi-step sourcing cadences that automate candidate outreach across channels, holding the sequence name, owner, channel mix, and active status. |
| Recruiting Event Attendances | `recruiting_event_attendances` | Relationships between candidates and recruiting events, recording registration, check-in, attendance, and conversion outcome. |
| Recruitment Agencies | `recruitment_agencies` | Third-party recruiters and staffing firms supplying candidates, with contract terms, contacts, performance, and submitted candidates. |
| Recruitment Events | `recruitment_events` | Career fairs, campus events, hackathons, and meetups used as sourcing channels, tracking attendees, captured leads, and event return. |
| Recruitment Sources | `recruitment_sources` | Channels a candidate came from, such as job board, referral, agency, campaign, or inbound, used for source-of-hire and channel analytics. |
| Opportunities | `internal_opportunities` | Internal opportunity postings covering full-time roles, gigs, projects, stretch assignments, and mentorships. |
| Talent Pools | `talent_pools` | Curated pools of candidates kept warm for future roles, such as past finalists, alumni, and hard-to-fill skill clusters. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef embedded_master fill:#fff4cc,stroke:#c79100,color:#5b4500;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  candidates["Candidates"]
  recruitment_sources["Recruitment Sources"]
  talent_pools["Talent Pools"]
  recruitment_agencies["Recruitment Agencies"]
  recruitment_events["Recruitment Events"]
  internal_opportunities["Opportunities"]
  candidate_engagements["Candidate Engagements"]
  candidate_nurture_campaigns["Candidate Nurture Campaigns"]
  recruiting_event_attendances["Recruiting Event Attendances"]
  candidate_consents["Candidate Consents"]
  data_subject_requests["Data Subject Requests"]
  candidate_documents["Candidate Documents"]
  candidate_notes["Candidate Notes"]
  candidate_emails["Candidate Emails"]
  agency_submissions["Agency Submissions"]
  outreach_sequences["Outreach Sequences"]
  outreach_sequence_steps["Outreach Sequence Steps"]
  users["Users"]
  recruitment_sources -->|"attributes"| candidates
  recruitment_agencies -->|"sources"| candidates
  recruitment_events -->|"attracts"| candidates
  talent_pools -->|"groups"| candidates
  candidates -->|"engaged_via"| candidate_engagements
  candidate_nurture_campaigns -->|"generates"| candidate_engagements
  candidates -->|"attends_via"| recruiting_event_attendances
  recruitment_events -->|"has_attendance"| recruiting_event_attendances
  candidates -->|"consents_via"| candidate_consents
  talent_pools -->|"targets"| candidate_nurture_campaigns
  candidates -->|"submits_via"| data_subject_requests
  candidates -->|"documented_via"| candidate_documents
  candidates -->|"annotated_via"| candidate_notes
  candidates -->|"corresponds_via"| candidate_emails
  recruitment_agencies -->|"submits_via"| agency_submissions
  candidates -->|"submitted_via"| agency_submissions
  outreach_sequences -->|"contains"| outreach_sequence_steps
  users -->|"posts"| internal_opportunities
  users -->|"owns as recruiter"| candidates
  users -->|"owns"| talent_pools
  users -->|"owns relationship"| recruitment_agencies
  users -->|"coordinates"| recruitment_events
  users -->|"uploaded documents"| candidate_documents
  users -->|"authored notes"| candidate_notes
  users -->|"engages"| candidate_engagements
  users -->|"owns"| candidate_nurture_campaigns
  users -->|"owns"| data_subject_requests
  users -->|"records"| recruiting_event_attendances
  users -->|"sends"| candidate_emails
  users -->|"owns"| agency_submissions
  users -->|"owns"| outreach_sequences
  class candidates master;
  class recruitment_sources master;
  class talent_pools embedded_master;
  class recruitment_agencies master;
  class recruitment_events master;
  class internal_opportunities embedded_master;
  class candidate_engagements master;
  class candidate_nurture_campaigns master;
  class recruiting_event_attendances master;
  class candidate_consents master;
  class data_subject_requests master;
  class candidate_documents master;
  class candidate_notes master;
  class candidate_emails master;
  class agency_submissions master;
  class outreach_sequences master;
  class outreach_sequence_steps master;
  class users platform_builtin;
  style talent_pools stroke-dasharray:5 5;
  style internal_opportunities stroke-dasharray:5 5;
  style candidate_consents stroke-dasharray:5 5;
  style data_subject_requests stroke-dasharray:5 5;
```

## 3. Entities catalog

| # | data_object | catalog code | singular | plural | held_as | mastered in | mastered label | install_optional | personal_content | entity_type | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `agency_submissions` | `agency_submissions` | Agency Submission | Agency Submissions | master | - | - | - | - | operational_record | `:manage` | - |
| 2 | `candidate_consents` | `candidate_consents` | Candidate Consent | Candidate Consents | master | - | - | yes | yes | operational_workflow | `:manage` | - |
| 3 | `candidate_documents` | `candidate_documents` | Candidate Document | Candidate Documents | master | - | - | - | yes | operational_record | `:manage` | - |
| 4 | `candidate_emails` | `candidate_emails` | Candidate Email | Candidate Emails | master | - | - | - | yes | operational_record | `:manage` | - |
| 5 | `candidate_engagements` | `candidate_engagements` | Candidate Engagement | Candidate Engagements | master | - | - | - | yes | operational_record | `:manage` | - |
| 6 | `candidate_notes` | `candidate_notes` | Candidate Note | Candidate Notes | master | - | - | - | yes | operational_record | `:manage` | - |
| 7 | `candidate_nurture_campaigns` | `candidate_nurture_campaigns` | Candidate Nurture Campaign | Candidate Nurture Campaigns | master | - | - | - | - | operational_workflow | `:manage` | - |
| 8 | `candidates` | `candidates` | Candidate | Candidates | master | - | - | - | yes | operational_workflow | `:manage` | - |
| 9 | `data_subject_requests` | `data_subject_requests` | Data Subject Request | Data Subject Requests | master | - | - | yes | yes | operational_workflow | `:manage` | - |
| 10 | `outreach_sequence_steps` | `outreach_sequence_steps` | Outreach Sequence Step | Outreach Sequence Steps | master | - | - | - | - | catalog | `:admin` | - |
| 11 | `outreach_sequences` | `outreach_sequences` | Outreach Sequence | Outreach Sequences | master | - | - | - | - | operational_workflow | `:manage` | - |
| 12 | `recruiting_event_attendances` | `recruiting_event_attendances` | Recruiting Event Attendance | Recruiting Event Attendances | master | - | - | - | - | junction | `:manage` | - |
| 13 | `recruitment_agencies` | `recruitment_agencies` | Recruitment Agency | Recruitment Agencies | master | - | - | - | - | operational_workflow | `:manage` | - |
| 14 | `recruitment_events` | `recruitment_events` | Recruitment Event | Recruitment Events | master | - | - | - | - | operational_workflow | `:manage` | - |
| 15 | `recruitment_sources` | `recruitment_sources` | Recruitment Source | Recruitment Sources | master | - | - | - | - | catalog | `:admin` | - |
| 16 | `internal_opportunities` | `internal_opportunities` | Opportunity | Opportunities | embedded_master | `tlnt-intel-marketplace` | Talent Marketplace | yes | - | operational_workflow | `:manage` | - |
| 17 | `talent_pools` | `talent_pools` | Talent Pool | Talent Pools | embedded_master | `ats-talent-pools` | Candidate Talent Pools | yes | - | operational_workflow | `:manage` | - |

## 4. Aliases and industry synonyms

_(none: no industry-scoped aliases for this scope)_

## 5. Relationships

_`field_required` applies only when both entities are installed. It never makes an entity required._

### 5.1 Relationships between entities in this blueprint

| from | verb | to | cardinality | kind | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `recruitment_sources` | attributes | `candidates` | one_to_many | reference | no | clear | reference | - |
| `recruitment_agencies` | sources | `candidates` | one_to_many | reference | no | clear | reference | - |
| `recruitment_events` | attracts | `candidates` | one_to_many | reference | no | clear | reference | - |
| `talent_pools` | groups | `candidates` | many_to_many | reference | - | cascade | parent | - |
| `candidates` | engaged_via | `candidate_engagements` | one_to_many | reference | no | clear | reference | - |
| `candidate_nurture_campaigns` | generates | `candidate_engagements` | one_to_many | composition | yes | cascade | parent | - |
| `candidates` | attends_via | `recruiting_event_attendances` | one_to_many | reference | yes | restrict | reference | - |
| `recruitment_events` | has_attendance | `recruiting_event_attendances` | one_to_many | composition | yes | cascade | parent | - |
| `candidates` | consents_via | `candidate_consents` | one_to_many | composition | yes | cascade | parent | - |
| `talent_pools` | targets | `candidate_nurture_campaigns` | many_to_many | reference | - | cascade | parent | - |
| `candidates` | submits_via | `data_subject_requests` | one_to_many | composition | yes | cascade | parent | - |
| `candidates` | documented_via | `candidate_documents` | one_to_many | composition | yes | cascade | parent | - |
| `candidates` | annotated_via | `candidate_notes` | one_to_many | composition | yes | cascade | parent | - |
| `candidates` | corresponds_via | `candidate_emails` | one_to_many | reference | no | clear | reference | - |
| `recruitment_agencies` | submits_via | `agency_submissions` | one_to_many | reference | no | clear | reference | - |
| `candidates` | submitted_via | `agency_submissions` | one_to_many | reference | no | clear | reference | - |
| `outreach_sequences` | contains | `outreach_sequence_steps` | one_to_many | composition | yes | cascade | parent | - |

### 5.2 Relationships to platform built-ins (`users`)

| from | verb | to | cardinality | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `users` | posts | `internal_opportunities` | one_to_many | yes | restrict | reference | - |
| `users` | owns as recruiter | `candidates` | one_to_many | no | clear | reference | - |
| `users` | owns | `talent_pools` | one_to_many | yes | restrict | reference | - |
| `users` | owns relationship | `recruitment_agencies` | one_to_many | yes | restrict | reference | - |
| `users` | coordinates | `recruitment_events` | one_to_many | yes | restrict | reference | - |
| `users` | uploaded documents | `candidate_documents` | one_to_many | no | clear | reference | - |
| `users` | authored notes | `candidate_notes` | one_to_many | yes | restrict | reference | - |
| `users` | engages | `candidate_engagements` | one_to_many | yes | restrict | reference | - |
| `users` | owns | `candidate_nurture_campaigns` | one_to_many | no | clear | reference | - |
| `users` | owns | `data_subject_requests` | one_to_many | no | clear | reference | - |
| `users` | records | `recruiting_event_attendances` | one_to_many | no | clear | reference | - |
| `users` | sends | `candidate_emails` | one_to_many | no | clear | reference | - |
| `users` | owns | `agency_submissions` | one_to_many | no | clear | reference | - |
| `users` | owns | `outreach_sequences` | one_to_many | no | clear | reference | - |

### 5.3 Relationships to entities outside this blueprint

_External entities are optional: this blueprint never installs them. If one exists at install, the relationship is proposed. A many-to-many relationship is listed under outgoing and proposed as a new junction table._

#### 5.3a Outgoing relationships: this blueprint's entity points to the external entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `skill_profiles` | feeds | `candidates` | one_to_many | no | - |
| `talent_segments` | materializes_into | `talent_pools` | one_to_many | no | - |
| `dlp_incidents` | triggers_privacy_review | `data_subject_requests` | one_to_many | no | - |
| `employees` | applies_as | `candidates` | one_to_many | no | - |

#### 5.3b Incoming relationships: the external entity points to this blueprint's entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `candidates` | submits | `job_applications` | one_to_many | yes | - |
| `candidates` | is referred through | `candidate_referrals` | one_to_many | yes | - |
| `candidates` | becomes | `employees` | one_to_one | no | - |
| `candidates` | becomes pre-employee | `pre_employees` | one_to_one | yes | - |
| `internal_opportunities` | receives | `opportunity_applications` | one_to_many | yes | - |
| `internal_opportunities` | ranked by | `fit_scores` | one_to_many | no | - |
| `talent_pools` | has_member | `talent_pool_memberships` | one_to_many | yes | - |
| `candidates` | member_of_via | `talent_pool_memberships` | one_to_many | yes | - |
| `candidates` | discloses_via | `fcra_disclosures` | one_to_many | yes | - |
| `candidates` | self_identifies_via | `eeo_responses` | one_to_many | yes | - |
| `candidates` | self_ids_via | `voluntary_self_identifications` | one_to_many | yes | - |
| `candidates` | acknowledges_via | `fcra_summary_of_rights_acknowledgments` | one_to_many | yes | - |
| `candidates` | tagged_via | `candidate_tag_assignments` | one_to_many | yes | - |
| `candidates` | screened_via | `drug_health_screenings` | one_to_many | no | - |
| `candidates` | verified_via | `right_to_work_verifications` | one_to_many | no | - |
| `recruitment_sources` | attributes | `job_applications` | one_to_many | no | - |

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
| `internal_opportunities` | embedded_master | yes | TLNT-INTEL-MARKETPLACE (TLNT-INTEL) | - |
| `talent_pools` | embedded_master | yes | ATS-TALENT-POOLS (ATS) | - |

## 7. Lifecycle states

### `candidate_consents` (Candidate Consent)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `granted` | ✓ | - | _(always)_ | - | - | - | Candidate has granted consent. |
| 2 | `withdrawn` | - | ✓ | _(always)_ | ✓ | - | `ats-candidate-crm:withdraw_consent` | Candidate revoked consent; data must be anonymized per policy. |
| 3 | `expired` | - | ✓ | _(always)_ | - | - | - | Retention window elapsed without renewal. |

### `candidate_engagements` (Candidate Engagement)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `planned` | ✓ | - | _(always)_ | - | - | - | Engagement queued, not yet sent. |
| 2 | `sent` | - | - | _(always)_ | - | - | - | Outbound dispatched to candidate. |
| 3 | `delivered` | - | - | _(always)_ | - | - | - | Channel confirmed delivery. |
| 4 | `responded` | - | ✓ | _(always)_ | - | - | - | Candidate replied or engaged with content. |
| 5 | `bounced` | - | ✓ | _(always)_ | - | - | - | Delivery failed (bad address, blocked, unsubscribed). |

### `candidate_nurture_campaigns` (Candidate Nurture Campaign)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | _(always)_ | - | - | - | Campaign being authored. |
| 2 | `active` | - | - | _(always)_ | - | - | - | Campaign live and sending to audience. |
| 3 | `paused` | - | - | _(always)_ | - | - | - | Campaign halted; can resume. |
| 4 | `completed` | - | ✓ | _(always)_ | - | - | - | Campaign reached scheduled end. |

### `candidates` (Candidate)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `prospect` | ✓ | - | _(always)_ | - | - | - | Person known to the recruiting org with no active application. |
| 2 | `active` | - | - | _(always)_ | - | - | - | Candidate has at least one open application or is actively engaged. |
| 3 | `hired` | - | - | `ATS-CANDIDATE-CRM` | ✓ | - | `ats-candidate-crm:hire_candidate` | Candidate accepted an offer and converted to employee; a new application moves the person back to active. |
| 4 | `do_not_hire` | - | ✓ | `ATS-CANDIDATE-CRM` | ✓ | - | `ats-candidate-crm:flag_do_not_hire` | Candidate flagged as ineligible for future consideration; gated decision. |
| 5 | `archived` | - | - | _(always)_ | - | - | - | Candidate kept in the database but not active in any pipeline; a new application moves the candidate back to active. |

### `data_subject_requests` (Data Subject Request)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `received` | ✓ | - | `ATS-CANDIDATE-CRM` | - | - | - | Data subject request received. The GDPR 30-day response clock starts; extension to 60 days requires a separate notification to the subject. |
| 2 | `verified` | - | - | `ATS-CANDIDATE-CRM` | ✓ | - | `ats-candidate-crm:verify_dsr_identity` | Identity of the data subject confirmed by the DPO or designated handler. Required before any data is disclosed or modified. |
| 3 | `in_progress` | - | - | `ATS-CANDIDATE-CRM` | - | - | - | Auto-progressed once identity is verified. Collection and review of subject data underway. |
| 4 | `fulfilled` | - | ✓ | `ATS-CANDIDATE-CRM` | ✓ | - | `ats-candidate-crm:fulfill_dsr` | Full response delivered to the data subject within the regulatory window. All requested data provided or the requested action completed. |
| 5 | `partially_fulfilled` | - | ✓ | `ATS-CANDIDATE-CRM` | ✓ | - | `ats-candidate-crm:fulfill_dsr_partially` | Partial response delivered. Some data categories were unavailable or out of scope; the rationale is documented on the request record. |
| 6 | `rejected` | - | ✓ | `ATS-CANDIDATE-CRM` | ✓ | - | `ats-candidate-crm:reject_dsr` | Request rejected (unverifiable identity, manifestly unfounded, repetitive, or out of scope). Rejection rationale documented on the request record. |

### `internal_opportunities` (Opportunity)

_This scope holds `internal_opportunities` as **embedded_master**; the canonical state machine is owned by `TLNT-INTEL-MARKETPLACE`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | `TLNT-INTEL-MARKETPLACE` | - | - | - | - |
| 2 | `open` | - | - | `TLNT-INTEL-MARKETPLACE` | ✓ | - | `tlnt-intel-marketplace:publish_opportunity` | - |
| 3 | `closed` | - | - | `TLNT-INTEL-MARKETPLACE` | ✓ | - | `tlnt-intel-marketplace:close_opportunity` | - |
| 4 | `filled` | - | ✓ | `TLNT-INTEL-MARKETPLACE` | - | - | - | - |
| 5 | `canceled` | - | ✓ | `TLNT-INTEL-MARKETPLACE` | ✓ | - | `tlnt-intel-marketplace:cancel_opportunity` | - |

### `outreach_sequences` (Outreach Sequence)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | _(always)_ | - | - | - | - |
| 2 | `active` | - | - | `ATS-CANDIDATE-CRM` | ✓ | - | `ats-candidate-crm:activate_outreach_sequence` | - |
| 3 | `paused` | - | - | _(always)_ | - | - | - | - |
| 4 | `archived` | - | ✓ | _(always)_ | - | - | - | - |

### `recruiting_event_attendances` (Recruiting Event Attendance)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `registered` | ✓ | - | _(always)_ | - | - | - | Candidate RSVP'd or was pre-registered. |
| 2 | `checked_in` | - | - | _(always)_ | - | - | - | Candidate arrived at the event. |
| 3 | `attended` | - | ✓ | _(always)_ | - | - | - | Engaged at the event; eligible for follow-up. |
| 4 | `no_show` | - | ✓ | _(always)_ | - | - | - | Registered but did not attend. |

### `recruitment_agencies` (Recruitment Agency)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `prospective` | ✓ | - | _(always)_ | - | - | - | Agency under evaluation; contract not yet executed. |
| 2 | `active` | - | - | _(always)_ | - | - | - | Agency has executed agreement and is engaged on one or more requisitions. |
| 3 | `on_hold` | - | - | _(always)_ | - | - | - | Engagement paused (performance review, contractual dispute, hiring freeze). |
| 4 | `terminated` | - | ✓ | _(always)_ | - | - | - | Relationship ended; no further requisitions are routed to this agency. |

### `recruitment_events` (Recruitment Event)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `planned` | ✓ | - | _(always)_ | - | - | - | Event scoped and budgeted; date, venue, target audience set; registration not yet open. |
| 2 | `open_for_registration` | - | - | _(always)_ | - | - | - | Registration is accepting attendees; promotion campaigns active. |
| 3 | `held` | - | - | _(always)_ | - | - | - | Event has been executed; attendee lists captured, leads ingested into talent pool. |
| 4 | `closed` | - | ✓ | _(always)_ | - | - | - | Post-event activities complete; cost accounting and source-attribution finalized. |
| 5 | `canceled` | - | ✓ | _(always)_ | - | - | - | Event called off before it happens; sunk costs recognized, attendees notified. |

### `talent_pools` (Talent Pool)

_This scope holds `talent_pools` as **embedded_master**; the canonical state machine is owned by `ATS-TALENT-POOLS`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `active` | ✓ | - | _(always)_ | - | - | - | Pool is open for additions and nurture campaigns. |
| 2 | `paused` | - | - | _(always)_ | - | - | - | Pool nurture is temporarily halted (off-season, budget freeze) but membership is retained. |
| 3 | `archived` | - | ✓ | _(always)_ | - | - | - | Pool is closed; membership is retained for historical attribution but no further outreach occurs. |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `ats-candidate-crm:read` | baseline-read | Read access to every entity in the module | ✓ |
| `ats-candidate-crm:manage` | baseline-manage | Edit operational records | ✓ |
| `ats-candidate-crm:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `ats-candidate-crm:read_candidates` | entity-read | Read Candidates | ✓ |
| `ats-candidate-crm:write_candidates` | entity-write | Write Candidates | ✓ |
| `ats-candidate-crm:read_recruitment_sources` | entity-read | Read Recruitment Sources | ✓ |
| `ats-candidate-crm:write_recruitment_sources` | entity-write | Write Recruitment Sources | ✓ |
| `ats-talent-pools:read_talent_pools` | entity-read | Read Talent Pools | ✓ |
| `ats-talent-pools:write_talent_pools` | entity-write | Write Talent Pools | ✓ |
| `ats-candidate-crm:read_recruitment_agencies` | entity-read | Read Recruitment Agencies | ✓ |
| `ats-candidate-crm:write_recruitment_agencies` | entity-write | Write Recruitment Agencies | ✓ |
| `ats-candidate-crm:read_recruitment_events` | entity-read | Read Recruitment Events | ✓ |
| `ats-candidate-crm:write_recruitment_events` | entity-write | Write Recruitment Events | ✓ |
| `tlnt-intel-marketplace:read_internal_opportunities` | entity-read | Read Opportunities | ✓ |
| `tlnt-intel-marketplace:write_internal_opportunities` | entity-write | Write Opportunities | ✓ |
| `ats-candidate-crm:read_candidate_engagements` | entity-read | Read Candidate Engagements | ✓ |
| `ats-candidate-crm:write_candidate_engagements` | entity-write | Write Candidate Engagements | ✓ |
| `ats-candidate-crm:read_candidate_nurture_campaigns` | entity-read | Read Candidate Nurture Campaigns | ✓ |
| `ats-candidate-crm:write_candidate_nurture_campaigns` | entity-write | Write Candidate Nurture Campaigns | ✓ |
| `ats-candidate-crm:read_recruiting_event_attendances` | entity-read | Read Recruiting Event Attendances | ✓ |
| `ats-candidate-crm:write_recruiting_event_attendances` | entity-write | Write Recruiting Event Attendances | ✓ |
| `ats-candidate-crm:read_candidate_consents` | entity-read | Read Candidate Consents | ✓ |
| `ats-candidate-crm:write_candidate_consents` | entity-write | Write Candidate Consents | ✓ |
| `ats-candidate-crm:read_data_subject_requests` | entity-read | Read Data Subject Requests | ✓ |
| `ats-candidate-crm:write_data_subject_requests` | entity-write | Write Data Subject Requests | ✓ |
| `ats-candidate-crm:read_candidate_documents` | entity-read | Read Candidate Documents | ✓ |
| `ats-candidate-crm:write_candidate_documents` | entity-write | Write Candidate Documents | ✓ |
| `ats-candidate-crm:read_candidate_notes` | entity-read | Read Candidate Notes | ✓ |
| `ats-candidate-crm:write_candidate_notes` | entity-write | Write Candidate Notes | ✓ |
| `ats-candidate-crm:read_candidate_emails` | entity-read | Read Candidate Emails | ✓ |
| `ats-candidate-crm:write_candidate_emails` | entity-write | Write Candidate Emails | ✓ |
| `ats-candidate-crm:read_agency_submissions` | entity-read | Read Agency Submissions | ✓ |
| `ats-candidate-crm:write_agency_submissions` | entity-write | Write Agency Submissions | ✓ |
| `ats-candidate-crm:read_outreach_sequences` | entity-read | Read Outreach Sequences | ✓ |
| `ats-candidate-crm:write_outreach_sequences` | entity-write | Write Outreach Sequences | ✓ |
| `ats-candidate-crm:read_outreach_sequence_steps` | entity-read | Read Outreach Sequence Steps | ✓ |
| `ats-candidate-crm:write_outreach_sequence_steps` | entity-write | Write Outreach Sequence Steps | ✓ |
| `ats-candidate-crm:hire_candidate` | workflow-gate (lifecycle) | Transition `candidates` into state `hired` | ✓ |
| `ats-candidate-crm:flag_do_not_hire` | workflow-gate (lifecycle) | Transition `candidates` into state `do_not_hire` | ✓ |
| `tlnt-intel-marketplace:publish_opportunity` | workflow-gate (lifecycle) | Transition `internal_opportunities` into state `open` | ✓ |
| `tlnt-intel-marketplace:close_opportunity` | workflow-gate (lifecycle) | Transition `internal_opportunities` into state `closed` | ✓ |
| `tlnt-intel-marketplace:cancel_opportunity` | workflow-gate (lifecycle) | Transition `internal_opportunities` into state `canceled` | ✓ |
| `ats-candidate-crm:withdraw_consent` | workflow-gate (lifecycle) | Transition `candidate_consents` into state `withdrawn` | ✓ |
| `ats-candidate-crm:verify_dsr_identity` | workflow-gate (lifecycle) | Transition `data_subject_requests` into state `verified` | ✓ |
| `ats-candidate-crm:fulfill_dsr` | workflow-gate (lifecycle) | Transition `data_subject_requests` into state `fulfilled` | ✓ |
| `ats-candidate-crm:fulfill_dsr_partially` | workflow-gate (lifecycle) | Transition `data_subject_requests` into state `partially_fulfilled` | ✓ |
| `ats-candidate-crm:reject_dsr` | workflow-gate (lifecycle) | Transition `data_subject_requests` into state `rejected` | ✓ |
| `ats-candidate-crm:activate_outreach_sequence` | workflow-gate (lifecycle) | Transition `outreach_sequences` into state `active` | ✓ |
| `ats-candidate-crm:view_all_candidates` | override (personal_content) | View all `candidates` rows beyond row-scope | ✓ |
| `ats-candidate-crm:manage_all_candidates` | override (personal_content) | Manage all `candidates` rows beyond row-scope | ✓ |
| `ats-candidate-crm:view_all_candidate_engagements` | override (personal_content) | View all `candidate_engagements` rows beyond row-scope | ✓ |
| `ats-candidate-crm:manage_all_candidate_engagements` | override (personal_content) | Manage all `candidate_engagements` rows beyond row-scope | ✓ |
| `ats-candidate-crm:view_all_candidate_consents` | override (personal_content) | View all `candidate_consents` rows beyond row-scope | ✓ |
| `ats-candidate-crm:manage_all_candidate_consents` | override (personal_content) | Manage all `candidate_consents` rows beyond row-scope | ✓ |
| `ats-candidate-crm:view_all_data_subject_requests` | override (personal_content) | View all `data_subject_requests` rows beyond row-scope | ✓ |
| `ats-candidate-crm:manage_all_data_subject_requests` | override (personal_content) | Manage all `data_subject_requests` rows beyond row-scope | ✓ |
| `ats-candidate-crm:view_all_candidate_documents` | override (personal_content) | View all `candidate_documents` rows beyond row-scope | ✓ |
| `ats-candidate-crm:manage_all_candidate_documents` | override (personal_content) | Manage all `candidate_documents` rows beyond row-scope | ✓ |
| `ats-candidate-crm:view_all_candidate_notes` | override (personal_content) | View all `candidate_notes` rows beyond row-scope | ✓ |
| `ats-candidate-crm:manage_all_candidate_notes` | override (personal_content) | Manage all `candidate_notes` rows beyond row-scope | ✓ |
| `ats-candidate-crm:view_all_candidate_emails` | override (personal_content) | View all `candidate_emails` rows beyond row-scope | ✓ |
| `ats-candidate-crm:manage_all_candidate_emails` | override (personal_content) | Manage all `candidate_emails` rows beyond row-scope | ✓ |

_Gates with no process: `ats-candidate-crm:flag_do_not_hire`, `tlnt-intel-marketplace:publish_opportunity`, `tlnt-intel-marketplace:close_opportunity`, `tlnt-intel-marketplace:cancel_opportunity`, `ats-candidate-crm:withdraw_consent`, `ats-candidate-crm:verify_dsr_identity`, `ats-candidate-crm:fulfill_dsr`, `ats-candidate-crm:fulfill_dsr_partially`, `ats-candidate-crm:reject_dsr`, `ats-candidate-crm:activate_outreach_sequence`. No Accountable can hold them, so this blueprint does not support `raci`._

### 8.2 Business rules

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `candidate_edit_scope` | `candidates` | has_personal_content | Row-scope by default; override via `ats-candidate-crm:view_all_candidates` / `ats-candidate-crm:manage_all_candidates` |
| `candidate_engagement_edit_scope` | `candidate_engagements` | has_personal_content | Row-scope by default; override via `ats-candidate-crm:view_all_candidate_engagements` / `ats-candidate-crm:manage_all_candidate_engagements` |
| `candidate_consent_edit_scope` | `candidate_consents` | has_personal_content | Row-scope by default; override via `ats-candidate-crm:view_all_candidate_consents` / `ats-candidate-crm:manage_all_candidate_consents` |
| `data_subject_request_edit_scope` | `data_subject_requests` | has_personal_content | Row-scope by default; override via `ats-candidate-crm:view_all_data_subject_requests` / `ats-candidate-crm:manage_all_data_subject_requests` |
| `candidate_document_edit_scope` | `candidate_documents` | has_personal_content | Row-scope by default; override via `ats-candidate-crm:view_all_candidate_documents` / `ats-candidate-crm:manage_all_candidate_documents` |
| `candidate_note_edit_scope` | `candidate_notes` | has_personal_content | Row-scope by default; override via `ats-candidate-crm:view_all_candidate_notes` / `ats-candidate-crm:manage_all_candidate_notes` |
| `candidate_email_edit_scope` | `candidate_emails` | has_personal_content | Row-scope by default; override via `ats-candidate-crm:view_all_candidate_emails` / `ats-candidate-crm:manage_all_candidate_emails` |

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `ATS-CANDIDATE-CRM`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `ats-candidate-crm_viewer` | `ats-candidate-crm:read` |
| `ats-candidate-crm_manager` | `ats-candidate-crm:manage` |
| `ats-candidate-crm_admin` | `ats-candidate-crm:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `ats-candidate-crm:admin` | `ats-candidate-crm:manage` |
| `ats-candidate-crm:manage` | `ats-candidate-crm:read` |
| `ats-candidate-crm:read` | `ats-candidate-crm:read_candidates` |
| `ats-candidate-crm:read` | `ats-candidate-crm:read_recruitment_sources` |
| `ats-candidate-crm:read` | `ats-talent-pools:read_talent_pools` |
| `ats-candidate-crm:read` | `ats-candidate-crm:read_recruitment_agencies` |
| `ats-candidate-crm:read` | `ats-candidate-crm:read_recruitment_events` |
| `ats-candidate-crm:read` | `tlnt-intel-marketplace:read_internal_opportunities` |
| `ats-candidate-crm:read` | `ats-candidate-crm:read_candidate_engagements` |
| `ats-candidate-crm:read` | `ats-candidate-crm:read_candidate_nurture_campaigns` |
| `ats-candidate-crm:read` | `ats-candidate-crm:read_recruiting_event_attendances` |
| `ats-candidate-crm:read` | `ats-candidate-crm:read_candidate_consents` |
| `ats-candidate-crm:read` | `ats-candidate-crm:read_data_subject_requests` |
| `ats-candidate-crm:read` | `ats-candidate-crm:read_candidate_documents` |
| `ats-candidate-crm:read` | `ats-candidate-crm:read_candidate_notes` |
| `ats-candidate-crm:read` | `ats-candidate-crm:read_candidate_emails` |
| `ats-candidate-crm:read` | `ats-candidate-crm:read_agency_submissions` |
| `ats-candidate-crm:read` | `ats-candidate-crm:read_outreach_sequences` |
| `ats-candidate-crm:read` | `ats-candidate-crm:read_outreach_sequence_steps` |
| `ats-candidate-crm:manage` | `ats-candidate-crm:write_candidates` |
| `ats-candidate-crm:write_candidates` | `ats-candidate-crm:read_candidates` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:write_recruitment_sources` |
| `ats-candidate-crm:write_recruitment_sources` | `ats-candidate-crm:read_recruitment_sources` |
| `ats-candidate-crm:manage` | `ats-talent-pools:write_talent_pools` |
| `ats-talent-pools:write_talent_pools` | `ats-talent-pools:read_talent_pools` |
| `ats-candidate-crm:manage` | `ats-candidate-crm:write_recruitment_agencies` |
| `ats-candidate-crm:write_recruitment_agencies` | `ats-candidate-crm:read_recruitment_agencies` |
| `ats-candidate-crm:manage` | `ats-candidate-crm:write_recruitment_events` |
| `ats-candidate-crm:write_recruitment_events` | `ats-candidate-crm:read_recruitment_events` |
| `ats-candidate-crm:manage` | `tlnt-intel-marketplace:write_internal_opportunities` |
| `tlnt-intel-marketplace:write_internal_opportunities` | `tlnt-intel-marketplace:read_internal_opportunities` |
| `ats-candidate-crm:manage` | `ats-candidate-crm:write_candidate_engagements` |
| `ats-candidate-crm:write_candidate_engagements` | `ats-candidate-crm:read_candidate_engagements` |
| `ats-candidate-crm:manage` | `ats-candidate-crm:write_candidate_nurture_campaigns` |
| `ats-candidate-crm:write_candidate_nurture_campaigns` | `ats-candidate-crm:read_candidate_nurture_campaigns` |
| `ats-candidate-crm:manage` | `ats-candidate-crm:write_recruiting_event_attendances` |
| `ats-candidate-crm:write_recruiting_event_attendances` | `ats-candidate-crm:read_recruiting_event_attendances` |
| `ats-candidate-crm:manage` | `ats-candidate-crm:write_candidate_consents` |
| `ats-candidate-crm:write_candidate_consents` | `ats-candidate-crm:read_candidate_consents` |
| `ats-candidate-crm:manage` | `ats-candidate-crm:write_data_subject_requests` |
| `ats-candidate-crm:write_data_subject_requests` | `ats-candidate-crm:read_data_subject_requests` |
| `ats-candidate-crm:manage` | `ats-candidate-crm:write_candidate_documents` |
| `ats-candidate-crm:write_candidate_documents` | `ats-candidate-crm:read_candidate_documents` |
| `ats-candidate-crm:manage` | `ats-candidate-crm:write_candidate_notes` |
| `ats-candidate-crm:write_candidate_notes` | `ats-candidate-crm:read_candidate_notes` |
| `ats-candidate-crm:manage` | `ats-candidate-crm:write_candidate_emails` |
| `ats-candidate-crm:write_candidate_emails` | `ats-candidate-crm:read_candidate_emails` |
| `ats-candidate-crm:manage` | `ats-candidate-crm:write_agency_submissions` |
| `ats-candidate-crm:write_agency_submissions` | `ats-candidate-crm:read_agency_submissions` |
| `ats-candidate-crm:manage` | `ats-candidate-crm:write_outreach_sequences` |
| `ats-candidate-crm:write_outreach_sequences` | `ats-candidate-crm:read_outreach_sequences` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:write_outreach_sequence_steps` |
| `ats-candidate-crm:write_outreach_sequence_steps` | `ats-candidate-crm:read_outreach_sequence_steps` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:hire_candidate` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:flag_do_not_hire` |
| `ats-candidate-crm:admin` | `tlnt-intel-marketplace:publish_opportunity` |
| `ats-candidate-crm:admin` | `tlnt-intel-marketplace:close_opportunity` |
| `ats-candidate-crm:admin` | `tlnt-intel-marketplace:cancel_opportunity` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:withdraw_consent` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:verify_dsr_identity` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:fulfill_dsr` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:fulfill_dsr_partially` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:reject_dsr` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:activate_outreach_sequence` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:view_all_candidates` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:manage_all_candidates` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:view_all_candidate_engagements` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:manage_all_candidate_engagements` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:view_all_candidate_consents` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:manage_all_candidate_consents` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:view_all_data_subject_requests` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:manage_all_data_subject_requests` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:view_all_candidate_documents` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:manage_all_candidate_documents` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:view_all_candidate_notes` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:manage_all_candidate_notes` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:view_all_candidate_emails` |
| `ats-candidate-crm:admin` | `ats-candidate-crm:manage_all_candidate_emails` |

**Processes wired:**

| process_key | process_name | PCF code | PCF ID | level | description |
| --- | --- | --- | --- | --- | --- |
| `hire_candidate` | Hire candidate | 7.2.4.3 | 10465 | 4 | Wrapping up the process for hiring candidates. Agree to all hiring terms and conditions. Have the candidate accept and sign the job offer. |

**RACI realization:**

| actor | kind | raci | process_key | realization |
| --- | --- | --- | --- | --- |
| `RECRUITING-RECRUITER` | persona | responsible | `hire_candidate` | the gated entities' write tier |
| `HIRING-MANAGER` | persona | accountable | `hire_candidate` | grant gates [ats-candidate-crm:hire_candidate] + the gated entities' write tier |
| `LEGAL-COMPLIANCE-SPECIALIST` | persona | informed | `hire_candidate` | notify on trigger_events [candidate.hired] |

### 9.2 Functional ownership and default grants

| responsibility | business function | default role | default tier |
| --- | --- | --- | --- |
| owner | Recruiting | `admin` | `:admin` |
| contributor | Human Resources | `manager` | `:manage` |
| contributor | Legal | `manager` | `:manage` |
| consumer | Finance | `viewer` | `:read` |
