---
artifact: semantic-blueprint
fact_sheet_version: "2.0"
system_name: ATS-OFFERS
system_description: Offers
system_slug: ats-offers
domain_modules:
  - ats-offers
domain_code: ATS
related_modules: [ats-background-checks, ats-candidate-crm, ats-interviews, ats-pre-employee-record, ats-recruitment-pipeline, ats-referrals, ats-talent-pools, comp-statements, hcm-lifecycle-workflows, hiring-starter]
created_at: 2026-06-02
---

# Offers

## 1. Overview

### 1.1 Analyst overview

Offer drafting, approval, extension, signature, and acceptance. Realizes OFFER-MGMT. Realizes the `offer_extended` state on `job_applications`. Requires an external `sign_document` tool, drops module Semantius coverage to ~83%.

## 2. Entity summary

| Name | Description |
| --- | --- |
| Offer Approvals | Approval step in the offer-approval chain (HRBP -> Comp -> Finance -> Exec). Triggered when an offer exceeds band, includes non-standard equity, or matches other escalation rules. |
| Offer Letter Documents | Generated PDF artifact of the offer terms, distinct from the structured offer record. Versioned in lockstep with offer_versions. Carries template_id, render timestamp, e-sign envelope link. |
| Offer Letter Templates | Reusable letter template with merge tokens (candidate name, role, base salary, start date, equity, bonus terms). Versioned. Renders offer_letter_documents at offer time. Carries template name, body, token schema, jurisdiction, language, active flag, and version. |
| Offer Versions | Versioned snapshot of a job_offer during negotiation (initial -> counter -> revised -> accepted). Each version carries the structured terms (base, bonus, equity, start_date) and the author of the change. |
| Offers | Formal employment offer extended to a candidate. Carries compensation components, start date, terms, approval chain, and status (draft / approved / sent / accepted / declined / rescinded). |
| Applications | A candidate's submission against a specific requisition. Carries pipeline stage, status (active / rejected / withdrawn / hired), source, and the full evaluation history. |
| Candidates | Person known to the recruiting org, with or without an active application. Carries contact details, resume, tags, GDPR consent, and source. Distinct from Employee until hired. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef embedded_master fill:#fff4cc,stroke:#c79100,color:#5b4500;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  job_offers["Offers"]
  candidates["Candidates"]
  job_applications["Applications"]
  offer_versions["Offer Versions"]
  offer_approvals["Offer Approvals"]
  offer_letter_documents["Offer Letter Documents"]
  offer_letter_templates["Offer Letter Templates"]
  users["Users"]
  job_offers -->|"evolves_through"| offer_versions
  job_offers -->|"gated_by (opt)"| offer_approvals
  offer_versions -->|"renders_as"| offer_letter_documents
  offer_letter_templates -->|"rendered_as (opt)"| offer_letter_documents
  candidates -->|"submits"| job_applications
  job_applications -->|"results in"| job_offers
  candidates -->|"has owning recruiter (opt)"| users
  users -->|"authored templates (opt)"| offer_letter_templates
  users -->|"approved templates (opt)"| offer_letter_templates
  job_applications -->|"has owning recruiter"| users
  job_offers -->|"has approver"| users
  class job_offers master;
  class candidates embedded_master;
  class job_applications embedded_master;
  class offer_versions master;
  class offer_approvals master;
  class offer_letter_documents master;
  class offer_letter_templates master;
  class users platform_builtin;
```

## 3. Entities catalog

| # | data_object | role | mastered in | label | necessity | pattern flags | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `offer_approvals` (Offer Approvals) | master | - | - | required | single_approver | `:manage` | - |
| 2 | `offer_letter_documents` (Offer Letter Documents) | master | - | - | required | personal_content | `:manage` | - |
| 3 | `offer_letter_templates` (Offer Letter Templates) | master | - | - | required | submit_lock, single_approver | `:admin` | - |
| 4 | `offer_versions` (Offer Versions) | master | - | - | required | personal_content | `:manage` | - |
| 5 | `job_offers` (Offers) | master | - | - | required | personal_content, single_approver | `:manage` | - |
| 6 | `job_applications` (Applications) | embedded_master | `ats-recruitment-pipeline` | Recruitment Pipeline | required | personal_content | `:manage` | - |
| 7 | `candidates` (Candidates) | embedded_master | `ats-candidate-crm` | Candidate CRM | required | personal_content | `:manage` | - |

## 4. Aliases and industry synonyms

_(no industry-scoped aliases or non-synonym alias types loaded for this scope; generic synonyms are omitted as common knowledge.)_

## 5. Relationships

### 5.1 Intra-scope edges

| from | verb | to | cardinality | kind | necessity | owner_side | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `job_offers` | evolves_through | `offer_versions` | one_to_many | composition | required | source | cascade | parent | - |
| `job_offers` | gated_by | `offer_approvals` | one_to_many | composition | optional | source | cascade | parent | - |
| `offer_versions` | renders_as | `offer_letter_documents` | one_to_one | composition | required | source | cascade | parent | - |
| `offer_letter_templates` | rendered_as | `offer_letter_documents` | one_to_many | reference | optional | source | clear | reference | - |
| `candidates` | submits | `job_applications` | one_to_many | reference | required | target | restrict | reference | - |
| `job_applications` | results in | `job_offers` | one_to_many | reference | required | source | restrict | reference | - |

### 5.2 Built-in edges (`users` and other platform built-ins)

| from | verb | to | cardinality | necessity | owner_side | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `candidates` | has owning recruiter | `users` | many_to_many | optional | source | clear | reference | - |
| `users` | authored templates | `offer_letter_templates` | one_to_many | optional | source | clear | reference | - |
| `users` | approved templates | `offer_letter_templates` | one_to_many | optional | source | clear | reference | - |
| `job_applications` | has owning recruiter | `users` | many_to_many | required | source | restrict | reference | - |
| `job_offers` | has approver | `users` | many_to_many | required | source | restrict | reference | - |

### 5.3 Cross-scope edges

#### 5.3a Outbound from this scope's masters and contributors

_Edges this scope drives: the in-scope endpoint has `role` of `master` or `contributor`._

| from | verb | to | cardinality | necessity | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `offer_versions` | proposes | `equity_grants` | one_to_many | optional | clear | reference | - |
| `job_offers` | is contingent on | `background_checks` | one_to_many | required | restrict | reference | - |
| `job_offers` | spawns | `onboarding_journeys` | one_to_one | required | restrict | reference | - |
| `job_offers` | triggers | `benefit_enrollments` | one_to_one | required | restrict | reference | - |
| `job_offers` | seeds | `compensation_statements` | one_to_one | required | restrict | reference | - |
| `job_offers` | spawns pre-employee record | `pre_employees` | one_to_one | required | restrict | reference | - |

#### 5.3b Context edges on embedded shells and consumed entities

_Edges the canonical owner drives, shown for context: the in-scope endpoint has `role` of `embedded_master`, `consumer`, or `derived`._

<details>
<summary>29 context edges</summary>

| from | verb | to | cardinality | necessity | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `candidates` | engaged_via | `candidate_engagements` | one_to_many | optional | clear | reference | - |
| `candidates` | attends_via | `recruiting_event_attendances` | one_to_many | required | restrict | reference | - |
| `candidates` | noted_via | `recruiter_interactions` | one_to_many | optional | clear | reference | - |
| `candidates` | consents_via | `candidate_consents` | one_to_many | required | cascade | parent | - |
| `candidates` | member_of_via | `talent_pool_memberships` | one_to_many | required | restrict | reference | - |
| `candidates` | discloses_via | `fcra_disclosures` | one_to_many | required | cascade | parent | - |
| `job_applications` | transitions_via | `application_stage_transitions` | one_to_many | required | cascade | parent | - |
| `job_applications` | answers_via | `application_screening_answers` | one_to_many | optional | cascade | parent | - |
| `candidates` | self_identifies_via | `eeo_responses` | one_to_many | optional | cascade | parent | - |
| `candidates` | submits_via | `data_subject_requests` | one_to_many | optional | cascade | parent | - |
| `candidates` | self_ids_via | `voluntary_self_identifications` | one_to_many | optional | cascade | parent | - |
| `candidates` | acknowledges_via | `fcra_summary_of_rights_acknowledgements` | one_to_many | optional | cascade | parent | - |
| `job_applications` | disposed_via | `application_dispositions` | one_to_many | optional | cascade | parent | - |
| `job_applications` | logged_via | `applicant_flow_records` | one_to_one | required | cascade | parent | - |
| `candidates` | documented_via | `candidate_documents` | one_to_many | optional | cascade | parent | - |
| `candidates` | annotated_via | `candidate_notes` | one_to_many | optional | cascade | parent | - |
| `candidates` | tagged_via | `candidate_tag_assignments` | one_to_many | optional | clear | reference | - |
| `skill_profiles` | feeds | `candidates` | one_to_many | optional | clear | reference | - |
| `job_requisitions` | receives | `job_applications` | one_to_many | required | restrict | reference | - |
| `job_postings` | is applied to via | `job_applications` | one_to_many | required | restrict | reference | - |
| `candidate_referrals` | introduces | `candidates` | one_to_many | required | restrict | reference | - |
| `recruitment_sources` | attributes | `candidates` | one_to_many | required | restrict | reference | - |
| `recruitment_agencies` | sources | `candidates` | one_to_many | required | restrict | reference | - |
| `recruitment_events` | attracts | `candidates` | one_to_many | required | restrict | reference | - |
| `talent_pools` | groups | `candidates` | many_to_many | required | restrict | reference | - |
| `job_applications` | schedules | `interviews` | one_to_many | required | restrict | reference | - |
| `job_applications` | requires | `candidate_assessments` | one_to_many | required | restrict | reference | - |
| `candidates` | becomes | `employees` | one_to_one | required | restrict | reference | - |
| `candidates` | becomes pre-employee | `pre_employees` | one_to_one | required | restrict | reference | - |

</details>

## 6. Cross-domain context

### 6.1 Master consumers (other modules / domains that embed this scope's masters)

| data_object | other module / domain | role | necessity | notes |
| --- | --- | --- | --- | --- |
| `job_offers` | ATS-BACKGROUND-CHECKS (Background Checks) - ATS | embedded_master | required | - |
| `job_offers` | ATS-PRE-EMPLOYEE-RECORD (Pre-Employee Record) - ATS | embedded_master | required | - |
| `job_offers` | COMP-STATEMENTS (Total Rewards Statements) - COMP-MGMT | consumer | required | - |
| `job_offers` | HCM-LIFECYCLE-WORKFLOWS (Employee Lifecycle Workflows) - HCM | consumer | required | - |
| `job_offers` | HIRING-STARTER (Hiring Starter) - ATS | embedded_master | required | - |

### 6.2 Outbound handoffs (events this scope publishes)

| source module | target domain | target module | trigger_event | transition | payload | integration | friction | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ATS-OFFERS | HCM | HCM-LIFECYCLE-WORKFLOWS | `job_offer.accepted` | `accepted` _(state_change)_ | `job_offers` | event_stream | medium | Offer acceptance signals firm hiring intent; HCM creates pending-employee record. |
| ATS-OFFERS | COMP-MGMT | COMP-STATEMENTS | `job_offer.signed` | `signed` _(lifecycle)_ | `job_offers` | event_stream | low | Signed offer establishes the comp baseline; COMP-MGMT incorporates into cycle history. |

### 6.3 Inbound handoffs (events this scope reacts to)

| target module | source domain | source module | trigger_event | transition | payload | integration | friction | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ATS-OFFERS | ATS | ATS-BACKGROUND-CHECKS | `background_check.flagged` | _(lifecycle)_ | `job_offers` | lifecycle_progression | medium | - |
| ATS-OFFERS | ATS | ATS-RECRUITMENT-PIPELINE | `job_application.advanced` | _(state_change)_ | `job_offers` | lifecycle_progression | low | - |

### 6.4 Master providers (modules / domains that own masters this scope embeds)

| data_object | role here | necessity | canonical owner(s) | slice notes |
| --- | --- | --- | --- | --- |
| `candidates` | embedded_master | required | ATS-CANDIDATE-CRM (ATS) | - |
| `job_applications` | embedded_master | required | ATS-RECRUITMENT-PIPELINE (ATS) | - |

## 7. Lifecycle states

### `candidates` (Candidate)

_This scope holds `candidates` as **embedded_master**; the canonical state machine is owned by `ATS-CANDIDATE-CRM`._

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `prospect` | ✓ | - | - | - | Person known to the recruiting org with no active application. |
| 2 | `active` | - | - | - | - | Candidate has at least one open application or is actively engaged. |
| 3 | `hired` | - | ✓ | ✓ | `ats-candidate-crm:hire_candidate` | Candidate accepted an offer and converted to employee. |
| 4 | `do_not_hire` | - | ✓ | ✓ | `ats-candidate-crm:flag_do_not_hire` | Candidate flagged as ineligible for future consideration; gated decision. |
| 5 | `archived` | - | ✓ | - | - | Candidate kept in the database but not active in any pipeline. |

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

### `job_offers` (Offer)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | - | - | Recruiter is composing offer terms and compensation components. |
| 2 | `pending_approval` | - | - | - | - | Offer routed to the designated approver for sign-off. |
| 3 | `approved` | - | - | ✓ | `ats-offers:approve_offer` | Approver signed off; offer is ready to send. |
| 4 | `sent` | - | - | - | - | Offer delivered to the candidate. |
| 5 | `accepted` | - | ✓ | - | - | Candidate accepted the offer. |
| 6 | `declined` | - | ✓ | - | - | Candidate declined the offer. |
| 7 | `rescinded` | - | ✓ | ✓ | `ats-offers:rescind_offer` | Offer withdrawn by the employer after being sent; gated action. |

### `offer_approvals` (Offer Approval)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `pending` | ✓ | - | - | - | Approval step awaiting decision. |
| 2 | `approved` | - | ✓ | ✓ | `ats-offers:approve_offer` | Step approved; offer can advance. |
| 3 | `rejected` | - | ✓ | ✓ | `ats-offers:reject_offer` | Step rejected; offer blocked or requires revision. |
| 4 | `escalated` | - | - | - | - | Step escalated to a higher approver. |

### `offer_letter_documents` (Offer Letter Document)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `drafted` | ✓ | - | - | - | Letter rendered from template; not yet sent. |
| 2 | `sent` | - | - | - | - | Letter delivered to candidate via e-sign provider. |
| 3 | `signed` | - | ✓ | - | - | Candidate signed; offer accepted. |
| 4 | `voided` | - | ✓ | - | - | Letter voided before signature. |

### `offer_letter_templates` (Offer Letter Template)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | `draft` | ✓ | - | - | - | Template is being authored; not visible for offer generation. |
| 20 | `in_review` | - | - | - | - | Author has submitted the template for legal or HR-Comp review. |
| 30 | `approved` | - | - | ✓ | `ats-offers:approve_offer_letter_template` | Single approver (legal or HR-Comp) has signed off; ready for activation. |
| 40 | `active` | - | - | - | - | Template is live and available for new offers to render against. |
| 50 | `superseded` | - | - | - | - | A newer version of this template has been activated; this row is retained for historical offers. |
| 60 | `retired` | - | ✓ | ✓ | `ats-offers:retire_offer_letter_template` | Template withdrawn from use; no new offers may render against it. |

### `offer_versions` (Offer Version)

| order | state_name | initial? | terminal? | requires_permission? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | - | - | Version being authored; not yet presented. |
| 2 | `presented` | - | - | - | - | Version sent to candidate. |
| 3 | `countered` | - | - | - | - | Candidate countered; this version superseded by a newer one. |
| 4 | `accepted` | - | ✓ | - | - | Version accepted by candidate. |
| 5 | `withdrawn` | - | ✓ | - | - | Version pulled before acceptance. |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `ats-offers:read` | baseline-read | Read access to every entity in the module | ✓ |
| `ats-offers:manage` | baseline-manage | Edit operational records | ✓ |
| `ats-offers:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `ats-offers:approve_offer` | workflow-gate (lifecycle) | Transition `job_offers` into state `approved` | ✓ |
| `ats-offers:rescind_offer` | workflow-gate (lifecycle) | Transition `job_offers` into state `rescinded` | ✓ |
| `ats-offers:approve_offer` | workflow-gate (lifecycle) | Transition `offer_approvals` into state `approved` | ✓ |
| `ats-offers:reject_offer` | workflow-gate (lifecycle) | Transition `offer_approvals` into state `rejected` | ✓ |
| `ats-offers:approve_offer_letter_template` | workflow-gate (lifecycle) | Transition `offer_letter_templates` into state `approved` | ✓ |
| `ats-offers:retire_offer_letter_template` | workflow-gate (lifecycle) | Transition `offer_letter_templates` into state `retired` | ✓ |
| `ats-offers:view_all_offers` | override (personal_content) | View all `job_offers` rows beyond row-scope | ✓ |
| `ats-offers:manage_all_offers` | override (personal_content) | Manage all `job_offers` rows beyond row-scope | ✓ |
| `ats-offers:view_all_offer_versions` | override (personal_content) | View all `offer_versions` rows beyond row-scope | ✓ |
| `ats-offers:manage_all_offer_versions` | override (personal_content) | Manage all `offer_versions` rows beyond row-scope | ✓ |
| `ats-offers:view_all_offer_letter_documents` | override (personal_content) | View all `offer_letter_documents` rows beyond row-scope | ✓ |
| `ats-offers:manage_all_offer_letter_documents` | override (personal_content) | Manage all `offer_letter_documents` rows beyond row-scope | ✓ |

### 8.2 Business rules

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `offer_edit_scope` | `job_offers` | has_personal_content | Row-scope by default; override via `ats-offers:view_all_offers` / `ats-offers:manage_all_offers` |
| `approve_offer_requires_approver` | `job_offers` | has_single_approver | Exactly one explicit approver required; uses the module's approval gate (`ats-offers:approve_offer` if surfaced as a lifecycle workflow gate). |
| `offer_version_edit_scope` | `offer_versions` | has_personal_content | Row-scope by default; override via `ats-offers:view_all_offer_versions` / `ats-offers:manage_all_offer_versions` |
| `approve_offer_approval_requires_approver` | `offer_approvals` | has_single_approver | Exactly one explicit approver required; uses the module's approval gate (`ats-offers:approve_offer`). |
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
| `ats-offers:admin` | `ats-offers:approve_offer` |
| `ats-offers:admin` | `ats-offers:rescind_offer` |
| `ats-offers:admin` | `ats-offers:approve_offer` |
| `ats-offers:admin` | `ats-offers:reject_offer` |
| `ats-offers:admin` | `ats-offers:approve_offer_letter_template` |
| `ats-offers:admin` | `ats-offers:retire_offer_letter_template` |
| `ats-offers:admin` | `ats-offers:view_all_offers` |
| `ats-offers:admin` | `ats-offers:manage_all_offers` |
| `ats-offers:admin` | `ats-offers:view_all_offer_versions` |
| `ats-offers:admin` | `ats-offers:manage_all_offer_versions` |
| `ats-offers:admin` | `ats-offers:view_all_offer_letter_documents` |
| `ats-offers:admin` | `ats-offers:manage_all_offer_letter_documents` |

**RACI realization:**

| actor | kind | raci | process | realization |
| --- | --- | --- | --- | --- |
| `RECRUITING-RECRUITER` | persona | responsible | Draw up and make offer | grant gates [ats-offers:approve_offer] + the gated entities' write tier |
| `HIRING-MANAGER` | persona | accountable | Draw up and make offer | approval gate |
| `RECRUITING-MANAGER` | persona | consulted | Draw up and make offer | advisory read grant |

### 9.2 Functional ownership and default grants

| responsibility | business function | default role | default tier |
| --- | --- | --- | --- |
| owner | Recruiting | `admin` | `:admin` |
| contributor | Legal | `manage` | `:manage` |
