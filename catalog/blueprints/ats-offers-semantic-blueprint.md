---
artifact: semantic-blueprint
version: "3.1"
license: MIT
system_name: Job Offers
tagline: Generate, approve, and send offers without losing a version.
description: Draft offers from templates, route them through approval chains, and track every version until acceptance. Generated offer letters stay linked to the offer record, so what was approved is exactly what was sent.
system_slug: ats-offers
domain_modules:
  - ats-offers
domain_code: ATS
icon_name: user-plus
related_modules: [ats-background-checks, ats-candidate-crm, ats-interviews, ats-pre-employee-record, ats-recruitment-pipeline, ats-referrals, ats-talent-pools, ben-enrollment, comp-statements, cwm-worker-sourcing, hcm-core-worker, hcm-lifecycle-workflows, hcm-org-positions, hiring-starter, onb-journey-mgmt]
persona: [HIRING-MANAGER, LEGAL-COMPLIANCE-SPECIALIST, RECRUITING-MANAGER, RECRUITING-RECRUITER]
created_at: 2026-11-02
---

# Job Offers

## 1. Overview

Offer drafting, approval, extension, signature, and acceptance. Realizes OFFER-MGMT. Realizes the `offer_extended` state on `job_applications`. Requires an external `sign_document` tool, drops module Semantius coverage to ~83%.

## 2. Entity summary

| Name | data_object | Description |
| --- | --- | --- |
| Offer Approvals | `offer_approvals` | Approval steps in the offer-approval chain, triggered when an offer exceeds band, includes non-standard equity, or matches other escalation rules. |
| Offer Letter Documents | `offer_letter_documents` | Generated PDF letters of the offer terms, versioned alongside the structured offer and linked to the e-signature envelope. |
| Offer Letter Templates | `offer_letter_templates` | Reusable offer-letter templates with merge tokens for candidate, role, and pay terms, versioned by jurisdiction and language to render offer letters. |
| Offer Versions | `offer_versions` | Versioned snapshots of a job offer during negotiation, each holding the structured terms and the author of the change, from initial through accepted. |
| Offers | `job_offers` | Formal employment offers extended to candidates, with compensation, start date, terms, approval chain, and status. |
| Applications | `job_applications` | Candidate submissions against a specific requisition, with pipeline stage, status, source, and full evaluation history. |
| Candidates | `candidates` | People known to the recruiting organization, with or without an active application, carrying contact details, resume, tags, consent, and source. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef embedded_master fill:#fff4cc,stroke:#c79100,color:#5b4500;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  candidates["Candidates"]
  job_applications["Applications"]
  job_offers["Offers"]
  offer_versions["Offer Versions"]
  offer_approvals["Offer Approvals"]
  offer_letter_documents["Offer Letter Documents"]
  offer_letter_templates["Offer Letter Templates"]
  users["Users"]
  candidates -->|"submits"| job_applications
  job_applications -->|"results in"| job_offers
  job_offers -->|"evolves_through"| offer_versions
  job_offers -->|"gated_by"| offer_approvals
  offer_versions -->|"renders_as"| offer_letter_documents
  offer_letter_templates -->|"rendered_as"| offer_letter_documents
  users -->|"owns as recruiter"| job_applications
  users -->|"approves"| job_offers
  users -->|"owns as recruiter"| candidates
  users -->|"authored templates"| offer_letter_templates
  users -->|"approved templates"| offer_letter_templates
  users -->|"authors"| offer_versions
  users -->|"approves"| offer_approvals
  users -->|"owns"| offer_letter_documents
  class candidates embedded_master;
  class job_applications embedded_master;
  class job_offers master;
  class offer_versions master;
  class offer_approvals master;
  class offer_letter_documents master;
  class offer_letter_templates master;
  class users platform_builtin;
```

## 3. Entities catalog

| # | data_object | catalog code | singular | plural | role | mastered in | mastered label | install_optional | personal_content | entity_type | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `offer_approvals` | `offer_approvals` | Offer Approval | Offer Approvals | master | - | - | - | - | operational_workflow | `:manage` | - |
| 2 | `offer_letter_documents` | `offer_letter_documents` | Offer Letter Document | Offer Letter Documents | master | - | - | - | yes | operational_workflow | `:manage` | - |
| 3 | `offer_letter_templates` | `offer_letter_templates` | Offer Letter Template | Offer Letter Templates | master | - | - | - | - | catalog | `:admin` | - |
| 4 | `offer_versions` | `offer_versions` | Offer Version | Offer Versions | master | - | - | - | yes | operational_workflow | `:manage` | - |
| 5 | `job_offers` | `job_offers` | Offer | Offers | master | - | - | - | yes | operational_workflow | `:manage` | - |
| 6 | `job_applications` | `job_applications` | Application | Applications | embedded_master | `ats-recruitment-pipeline` | Recruitment Pipeline | - | yes | operational_workflow | `:manage` | - |
| 7 | `candidates` | `candidates` | Candidate | Candidates | embedded_master | `ats-candidate-crm` | Candidate CRM | - | yes | operational_workflow | `:manage` | - |

## 4. Aliases and industry synonyms

_(none: no industry-scoped aliases for this scope)_

## 5. Relationships

_`field_required` applies only when both entities are installed. It never makes an entity required._

### 5.1 Links between entities in this blueprint

| from | verb | to | cardinality | kind | field_required | owner_side | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `candidates` | submits | `job_applications` | one_to_many | reference | yes | source | restrict | reference | - |
| `job_applications` | results in | `job_offers` | one_to_many | reference | yes | source | restrict | reference | - |
| `job_offers` | evolves_through | `offer_versions` | one_to_many | composition | yes | source | cascade | parent | - |
| `job_offers` | gated_by | `offer_approvals` | one_to_many | composition | yes | source | cascade | parent | - |
| `offer_versions` | renders_as | `offer_letter_documents` | one_to_one | composition | yes | source | cascade | parent | - |
| `offer_letter_templates` | rendered_as | `offer_letter_documents` | one_to_many | reference | no | source | clear | reference | - |

### 5.2 Links to platform built-ins (`users`)

| from | verb | to | cardinality | field_required | owner_side | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `users` | owns as recruiter | `job_applications` | one_to_many | yes | source | restrict | reference | - |
| `users` | approves | `job_offers` | one_to_many | yes | source | restrict | reference | - |
| `users` | owns as recruiter | `candidates` | one_to_many | no | source | clear | reference | - |
| `users` | authored templates | `offer_letter_templates` | one_to_many | no | source | clear | reference | - |
| `users` | approved templates | `offer_letter_templates` | one_to_many | no | source | clear | reference | - |
| `users` | authors | `offer_versions` | one_to_many | yes | source | restrict | reference | - |
| `users` | approves | `offer_approvals` | one_to_many | yes | source | restrict | reference | - |
| `users` | owns | `offer_letter_documents` | one_to_many | no | source | clear | reference | - |

### 5.3 Links to entities outside this blueprint

_External entities are optional: this blueprint never installs them. If one exists at install, the link is proposed. A many-to-many link is listed under outgoing and proposed as a new junction table._

#### 5.3a Outgoing links: this blueprint's entity points to the external entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `skill_profiles` | feeds | `candidates` | one_to_many | no | - |
| `job_requisitions` | receives | `job_applications` | one_to_many | yes | - |
| `job_postings` | is applied to via | `job_applications` | one_to_many | yes | - |
| `recruitment_sources` | attributes | `candidates` | one_to_many | no | - |
| `recruitment_agencies` | sources | `candidates` | one_to_many | yes | - |
| `recruitment_events` | attracts | `candidates` | one_to_many | yes | - |
| `talent_pools` | groups | `candidates` | many_to_many | - | - |
| `employees` | applies_as | `candidates` | one_to_many | no | - |

#### 5.3b Incoming links: the external entity points to this blueprint's entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `candidates` | is referred through | `candidate_referrals` | one_to_many | yes | - |
| `job_applications` | schedules | `interviews` | one_to_many | yes | - |
| `job_applications` | requires | `candidate_assessments` | one_to_many | yes | - |
| `job_offers` | is contingent on | `background_checks` | one_to_many | yes | - |
| `job_offers` | spawns | `onboarding_journeys` | one_to_one | yes | - |
| `job_offers` | triggers | `benefit_enrollments` | one_to_one | yes | - |
| `job_offers` | seeds | `compensation_statements` | one_to_one | yes | - |
| `candidates` | becomes | `employees` | one_to_one | yes | - |
| `job_offers` | spawns pre-employee record | `pre_employees` | one_to_one | yes | - |
| `candidates` | becomes pre-employee | `pre_employees` | one_to_one | yes | - |
| `candidates` | engaged_via | `candidate_engagements` | one_to_many | no | - |
| `candidates` | attends_via | `recruiting_event_attendances` | one_to_many | yes | - |
| `candidates` | noted_via | `recruiter_interactions` | one_to_many | no | - |
| `candidates` | consents_via | `candidate_consents` | one_to_many | yes | - |
| `candidates` | member_of_via | `talent_pool_memberships` | one_to_many | yes | - |
| `candidates` | discloses_via | `fcra_disclosures` | one_to_many | yes | - |
| `job_applications` | transitions_via | `application_stage_transitions` | one_to_many | yes | - |
| `job_applications` | answers_via | `application_screening_answers` | one_to_many | yes | - |
| `candidates` | self_identifies_via | `eeo_responses` | one_to_many | yes | - |
| `offer_versions` | proposes | `equity_grants` | one_to_many | no | - |
| `candidates` | submits_via | `data_subject_requests` | one_to_many | yes | - |
| `candidates` | self_ids_via | `voluntary_self_identifications` | one_to_many | yes | - |
| `candidates` | acknowledges_via | `fcra_summary_of_rights_acknowledgements` | one_to_many | yes | - |
| `job_applications` | disposed_via | `application_dispositions` | one_to_many | yes | - |
| `job_applications` | logged_via | `applicant_flow_records` | one_to_one | yes | - |
| `candidates` | documented_via | `candidate_documents` | one_to_many | yes | - |
| `candidates` | annotated_via | `candidate_notes` | one_to_many | yes | - |
| `candidates` | tagged_via | `candidate_tag_assignments` | one_to_many | no | - |
| `candidates` | corresponds_via | `candidate_emails` | one_to_many | no | - |
| `candidates` | screened_via | `drug_health_screenings` | one_to_many | no | - |
| `candidates` | verified_via | `right_to_work_verifications` | one_to_many | no | - |
| `candidates` | submitted_via | `agency_submissions` | one_to_many | no | - |

## 6. Cross-domain context

### 6.1 Master consumers (other modules / domains that embed this scope's masters)

_`role` and `install_optional` here belong to the other module named in that row, not to this blueprint._

| data_object | other module / domain | role | install_optional | notes |
| --- | --- | --- | --- | --- |
| `job_offers` | ATS-BACKGROUND-CHECKS (Background Checks) - ATS | embedded_master | - | - |
| `job_offers` | ATS-PRE-EMPLOYEE-RECORD (Pre-Employee Record) - ATS | embedded_master | - | - |
| `job_offers` | COMP-STATEMENTS (Total Rewards Statements) - COMP-MGMT | consumer | - | - |
| `job_offers` | HCM-LIFECYCLE-WORKFLOWS (Employee Lifecycle Workflows) - HCM | consumer | yes | - |
| `job_offers` | HIRING-STARTER (Hiring Starter) - ATS | embedded_master | - | - |

### 6.2 Outbound handoffs (events this scope publishes)

| source module | target domain | target module | trigger_event | transition | payload | integration | friction | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ATS-OFFERS | HCM | HCM-LIFECYCLE-WORKFLOWS | `candidate.hired` | `hired` _(lifecycle)_ | `candidates` | event_stream | high | Hired-candidate event publishes the hiring outcome to HCM, which must create the employee record. Identifier mapping (candidate_id -> employee_id) is the canonical reconciliation gap. |
| ATS-OFFERS | HCM | HCM-LIFECYCLE-WORKFLOWS | `job_offer.accepted` | `accepted` _(state_change)_ | `job_offers` | event_stream | medium | Offer acceptance signals firm hiring intent; HCM creates pending-employee record. |
| ATS-OFFERS | ATS | ATS-TALENT-POOLS | `job_application.rejected` | _(state_change)_ | `job_applications` | lifecycle_progression | low | - |
| ATS-OFFERS | COMP-MGMT | COMP-STATEMENTS | `job_offer.accepted` | `accepted` _(state_change)_ | `job_offers` | event_stream | low | Signed offer establishes the comp baseline; COMP-MGMT incorporates into cycle history. |
| ATS-OFFERS | BEN-ADMIN | BEN-ENROLLMENT | `candidate.hired` | `hired` _(lifecycle)_ | `candidates` | event_stream | low | Hired candidate triggers eligibility window in BEN-ADMIN. |
| ATS-OFFERS | ONBOARDING | ONB-JOURNEY-MGMT | `candidate.hired` | `hired` _(lifecycle)_ | `candidates` | event_stream | medium | Hired candidate drives onboarding-plan kickoff with role/location/manager context from ATS payload. |

### 6.3 Inbound handoffs (events this scope reacts to)

| target module | source domain | source module | trigger_event | transition | payload | integration | friction | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ATS-OFFERS | HCM | HCM-CORE-WORKER | `employee.applied_internally` | `active` → `active` _(signal)_ | `candidates` | api_call | medium | When an employee applies internally, HCM hands the worker context to the applicant tracker, which materializes an internal candidate record from the worker profile. Friction: reconciling the worker identity against the candidate identity space. |
| ATS-OFFERS | ATS | ATS-TALENT-POOLS | `talent_pool.candidate_activated` | `hot` _(state_change)_ | `job_applications` | lifecycle_progression | low | - |
| ATS-OFFERS | ATS | ATS-REFERRALS | `candidate_referral.submitted` | _(lifecycle)_ | `candidates` | lifecycle_progression | low | - |
| ATS-OFFERS | ATS | ATS-INTERVIEWS | `candidate_assessment.failed` | _(lifecycle)_ | `job_applications` | lifecycle_progression | low | - |
| ATS-OFFERS | ATS | ATS-INTERVIEWS | `candidate_assessment.passed` | _(lifecycle)_ | `job_applications` | lifecycle_progression | low | - |
| ATS-OFFERS | ATS | ATS-INTERVIEWS | `interview.completed` | _(lifecycle)_ | `job_applications` | lifecycle_progression | low | - |
| ATS-OFFERS | ATS | ATS-BACKGROUND-CHECKS | `background_check.flagged` | _(lifecycle)_ | `job_offers` | lifecycle_progression | medium | - |

### 6.4 Master providers (modules / domains that own masters this scope embeds)

| data_object | role here | install_optional | catalog owner(s) | slice notes |
| --- | --- | --- | --- | --- |
| `candidates` | embedded_master | - | ATS-CANDIDATE-CRM (ATS) | - |
| `job_applications` | embedded_master | - | ATS-RECRUITMENT-PIPELINE (ATS) | - |

## 7. Lifecycle states

### `candidates` (Candidate)

_This scope holds `candidates` as **embedded_master**; the canonical state machine is owned by `ATS-CANDIDATE-CRM`._

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `prospect` | ✓ | - | - | - | - | Person known to the recruiting org with no active application. |
| 2 | `active` | - | - | - | - | - | Candidate has at least one open application or is actively engaged. |
| 3 | `hired` | - | ✓ | ✓ | - | `ats-offers:hire_candidate` | Candidate accepted an offer and converted to employee. |
| 4 | `do_not_hire` | - | ✓ | ✓ | - | `ats-offers:flag_do_not_hire` | Candidate flagged as ineligible for future consideration; gated decision. |
| 5 | `archived` | - | ✓ | - | - | - | Candidate kept in the database but not active in any pipeline. |

### `job_applications` (Application)

_This scope holds `job_applications` as **embedded_master**; the canonical state machine is owned by `ATS-RECRUITMENT-PIPELINE`._

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `applied` | ✓ | - | - | - | - | Candidate submitted an application against the requisition. |
| 2 | `screening` | - | - | - | - | - | Recruiter is reviewing resume and qualifications. |
| 3 | `interviewing` | - | - | - | - | - | Candidate is progressing through interview loops. |
| 4 | `offer_extended` | - | - | - | - | - | An offer has been generated and is in flight for this application. |
| 5 | `hired` | - | ✓ | ✓ | - | `ats-offers:hire_candidate` | Candidate accepted the offer and was hired; gated transition. |
| 6 | `rejected` | - | ✓ | - | - | - | Application closed without progression by recruiter or hiring manager. |
| 7 | `withdrawn` | - | ✓ | - | - | - | Candidate withdrew their application. |

### `job_offers` (Offer)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | - | - | - | Recruiter is composing offer terms and compensation components. |
| 2 | `pending_approval` | - | - | - | - | - | Offer routed to the designated approver for sign-off. |
| 3 | `approved` | - | - | ✓ | - | `ats-offers:approve_offer` | Approver signed off; offer is ready to send. |
| 4 | `sent` | - | - | - | - | - | Offer delivered to the candidate. |
| 5 | `accepted` | - | ✓ | - | - | - | Candidate accepted the offer. |
| 6 | `declined` | - | ✓ | - | - | - | Candidate declined the offer. |
| 7 | `rescinded` | - | ✓ | ✓ | - | `ats-offers:rescind_offer` | Offer withdrawn by the employer after being sent; gated action. |

### `offer_approvals` (Offer Approval)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `pending` | ✓ | - | - | - | - | Approval step awaiting decision. |
| 2 | `approved` | - | ✓ | ✓ | - | `ats-offers:approve_offer` | Step approved; offer can advance. |
| 3 | `rejected` | - | ✓ | ✓ | - | `ats-offers:reject_offer` | Step rejected; offer blocked or requires revision. |
| 4 | `escalated` | - | - | - | - | - | Step escalated to a higher approver. |

### `offer_letter_documents` (Offer Letter Document)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `drafted` | ✓ | - | - | - | - | Letter rendered from template; not yet sent. |
| 2 | `sent` | - | - | - | - | - | Letter delivered to candidate via e-sign provider. |
| 3 | `signed` | - | ✓ | - | - | - | Candidate signed; offer accepted. |
| 4 | `voided` | - | ✓ | - | - | - | Letter voided before signature. |

### `offer_letter_templates` (Offer Letter Template)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `draft` | ✓ | - | - | - | - | Template is being authored; not visible for offer generation. |
| 20 | `in_review` | - | - | - | - | - | Author has submitted the template for legal or HR-Comp review. |
| 30 | `approved` | - | - | ✓ | - | `ats-offers:approve_offer_letter_template` | Single approver (legal or HR-Comp) has signed off; ready for activation. |
| 40 | `active` | - | - | - | - | - | Template is live and available for new offers to render against. |
| 50 | `superseded` | - | - | - | - | - | A newer version of this template has been activated; this row is retained for historical offers. |
| 60 | `retired` | - | ✓ | ✓ | - | `ats-offers:retire_offer_letter_template` | Template withdrawn from use; no new offers may render against it. |

### `offer_versions` (Offer Version)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | - | - | - | Version being authored; not yet presented. |
| 2 | `presented` | - | - | - | - | - | Version sent to candidate. |
| 3 | `countered` | - | - | - | - | - | Candidate countered; this version superseded by a newer one. |
| 4 | `accepted` | - | ✓ | - | - | - | Version accepted by candidate. |
| 5 | `withdrawn` | - | ✓ | - | - | - | Version pulled before acceptance. |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `ats-offers:read` | baseline-read | Read access to every entity in the module | ✓ |
| `ats-offers:manage` | baseline-manage | Edit operational records | ✓ |
| `ats-offers:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `ats-offers:hire_candidate` | workflow-gate (lifecycle) | Transition `candidates` into state `hired` or `job_applications` into state `hired` | ✓ |
| `ats-offers:flag_do_not_hire` | workflow-gate (lifecycle) | Transition `candidates` into state `do_not_hire` (⚠ no process) | ✓ |
| `ats-offers:approve_offer` | workflow-gate (lifecycle) | Transition `job_offers` into state `approved` or `offer_approvals` into state `approved` | ✓ |
| `ats-offers:rescind_offer` | workflow-gate (lifecycle) | Transition `job_offers` into state `rescinded` (⚠ no process) | ✓ |
| `ats-offers:reject_offer` | workflow-gate (lifecycle) | Transition `offer_approvals` into state `rejected` (⚠ no process) | ✓ |
| `ats-offers:approve_offer_letter_template` | workflow-gate (lifecycle) | Transition `offer_letter_templates` into state `approved` (⚠ no process) | ✓ |
| `ats-offers:retire_offer_letter_template` | workflow-gate (lifecycle) | Transition `offer_letter_templates` into state `retired` (⚠ no process) | ✓ |
| `ats-offers:view_all_candidates` | override (personal_content) | View all `candidates` rows beyond row-scope | ✓ |
| `ats-offers:manage_all_candidates` | override (personal_content) | Manage all `candidates` rows beyond row-scope | ✓ |
| `ats-offers:view_all_applications` | override (personal_content) | View all `job_applications` rows beyond row-scope | ✓ |
| `ats-offers:manage_all_applications` | override (personal_content) | Manage all `job_applications` rows beyond row-scope | ✓ |
| `ats-offers:view_all_offers` | override (personal_content) | View all `job_offers` rows beyond row-scope | ✓ |
| `ats-offers:manage_all_offers` | override (personal_content) | Manage all `job_offers` rows beyond row-scope | ✓ |
| `ats-offers:view_all_offer_versions` | override (personal_content) | View all `offer_versions` rows beyond row-scope | ✓ |
| `ats-offers:manage_all_offer_versions` | override (personal_content) | Manage all `offer_versions` rows beyond row-scope | ✓ |
| `ats-offers:view_all_offer_letter_documents` | override (personal_content) | View all `offer_letter_documents` rows beyond row-scope | ✓ |
| `ats-offers:manage_all_offer_letter_documents` | override (personal_content) | Manage all `offer_letter_documents` rows beyond row-scope | ✓ |

### 8.2 Business rules

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `candidate_edit_scope` | `candidates` | has_personal_content | Row-scope by default; override via `ats-offers:view_all_candidates` / `ats-offers:manage_all_candidates` |
| `application_edit_scope` | `job_applications` | has_personal_content | Row-scope by default; override via `ats-offers:view_all_applications` / `ats-offers:manage_all_applications` |
| `offer_edit_scope` | `job_offers` | has_personal_content | Row-scope by default; override via `ats-offers:view_all_offers` / `ats-offers:manage_all_offers` |
| `offer_version_edit_scope` | `offer_versions` | has_personal_content | Row-scope by default; override via `ats-offers:view_all_offer_versions` / `ats-offers:manage_all_offer_versions` |
| `offer_letter_document_edit_scope` | `offer_letter_documents` | has_personal_content | Row-scope by default; override via `ats-offers:view_all_offer_letter_documents` / `ats-offers:manage_all_offer_letter_documents` |

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `ATS-OFFERS`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `ats-offers_viewer` | `ats-offers:read` |
| `ats-offers_manager` | `ats-offers:manage` |
| `ats-offers_admin` | `ats-offers:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `ats-offers:admin` | `ats-offers:manage` |
| `ats-offers:manage` | `ats-offers:read` |
| `ats-offers:admin` | `ats-offers:hire_candidate` |
| `ats-offers:admin` | `ats-offers:flag_do_not_hire` |
| `ats-offers:admin` | `ats-offers:approve_offer` |
| `ats-offers:admin` | `ats-offers:rescind_offer` |
| `ats-offers:admin` | `ats-offers:reject_offer` |
| `ats-offers:admin` | `ats-offers:approve_offer_letter_template` |
| `ats-offers:admin` | `ats-offers:retire_offer_letter_template` |
| `ats-offers:admin` | `ats-offers:view_all_candidates` |
| `ats-offers:admin` | `ats-offers:manage_all_candidates` |
| `ats-offers:admin` | `ats-offers:view_all_applications` |
| `ats-offers:admin` | `ats-offers:manage_all_applications` |
| `ats-offers:admin` | `ats-offers:view_all_offers` |
| `ats-offers:admin` | `ats-offers:manage_all_offers` |
| `ats-offers:admin` | `ats-offers:view_all_offer_versions` |
| `ats-offers:admin` | `ats-offers:manage_all_offer_versions` |
| `ats-offers:admin` | `ats-offers:view_all_offer_letter_documents` |
| `ats-offers:admin` | `ats-offers:manage_all_offer_letter_documents` |

**Processes wired:**

| process_key | process_name | PCF code | PCF ID | level | description |
| --- | --- | --- | --- | --- | --- |
| `hire_candidate` | Hire candidate | 7.2.4.3 | 10465 | 4 | Wrapping up the process for hiring candidates. Agree to all hiring terms and conditions. Have the candidate accept and sign the job offer. |
| `draw_up_make_offer` | Draw up and make offer | 7.2.4.1 | 10463 | 4 | Compiling job-related information for the selected candidates in order to make up a job. Include information about the job description, reporting relationship, salary, bonus potential, benefits, and vacation allotment. |

**RACI realization:**

| actor | kind | raci | process_key | realization |
| --- | --- | --- | --- | --- |
| `RECRUITING-RECRUITER` | persona | responsible | `hire_candidate` | the gated entities' write tier |
| `HIRING-MANAGER` | persona | accountable | `hire_candidate` | grant gates [ats-offers:hire_candidate] + the gated entities' write tier |
| `LEGAL-COMPLIANCE-SPECIALIST` | persona | informed | `hire_candidate` | notify on trigger_events [candidate.hired] |
| `RECRUITING-RECRUITER` | persona | responsible | `draw_up_make_offer` | the gated entities' write tier |
| `HIRING-MANAGER` | persona | accountable | `draw_up_make_offer` | grant gates [ats-offers:approve_offer] + the gated entities' write tier |
| `RECRUITING-MANAGER` | persona | consulted | `draw_up_make_offer` | advisory read grant |

### 9.2 Functional ownership and default grants

| responsibility | business function | default role | default tier |
| --- | --- | --- | --- |
| owner | Recruiting | `admin` | `:admin` |
| contributor | Human Resources | `manage` | `:manage` |
| contributor | Legal | `manage` | `:manage` |
| consumer | Finance | `read` | `:read` |
