---
artifact: semantic-blueprint
version: "3.1"
license: MIT
system_name: Pre-Employee Record
tagline: "Hold the new hire's record between offer acceptance and day one."
description: "Once a candidate accepts, the pre-employee record carries their details through the gap before onboarding starts. It is the clean handoff point to onboarding and your HRIS, so a new hire's first day never starts from a blank page."
system_slug: ats-pre-employee-record
domain_modules:
  - ats-pre-employee-record
domain_code: ATS
icon_name: user-plus
related_modules: [ats-candidate-crm, ats-interviews, ats-offers, ats-recruitment-pipeline, ats-referrals, ats-talent-pools, ben-enrollment, bgv-continuous-identity, bgv-screening-orders, comp-statements, hcm-core-worker, hcm-lifecycle-workflows, onb-journey-mgmt]
persona: [HIRING-MANAGER, LEGAL-COMPLIANCE-SPECIALIST, RECRUITING-MANAGER, RECRUITING-RECRUITER]
created_at: 2026-11-02
---

# Pre-Employee Record

## 1. Overview

The bridge between offer-accepted and start-date: ATS owns the pre-employee lifecycle stage (paperwork in flight, pre-boarding tasks open, background check pending). Realizes the `hired` state on `job_applications`. Publishes the `pre_employee.activated` event that hands the canonical reconciliation to HCM-mastered `employees`. Formerly NEW-HIRE-HANDOFF, renamed per §7.1 because HCM canonically masters `employees`.

## 2. Entity summary

| Name | data_object | Description |
| --- | --- | --- |
| Pre-Employees | `pre_employees` | Pre-employment records covering the window between offer acceptance and start date, tracking paperwork, background checks, and pre-boarding tasks. |
| Candidates | `candidates` | People known to the recruiting organization, with or without an active application, carrying contact details, resume, tags, consent, and source. |
| Offers | `job_offers` | Formal employment offers extended to candidates, with compensation, start date, terms, approval chain, and status. |
| Right to Work Verifications | `right_to_work_verifications` | Pre-hire right-to-work verification events, such as the I-9 or E-Verify check, recording method, status, verifier, and outcome under employment-eligibility law. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef embedded_master fill:#fff4cc,stroke:#c79100,color:#5b4500;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  candidates["Candidates"]
  job_offers["Offers"]
  pre_employees["Pre-Employees"]
  right_to_work_verifications["Right to Work Verifications"]
  users["Users"]
  job_offers -->|"spawns pre-employee record"| pre_employees
  candidates -->|"becomes pre-employee"| pre_employees
  candidates -->|"verified_via"| right_to_work_verifications
  users -->|"approves"| job_offers
  users -->|"owns pre-employee record"| pre_employees
  users -->|"owns as recruiter"| candidates
  users -->|"verifies"| right_to_work_verifications
  class candidates embedded_master;
  class job_offers embedded_master;
  class pre_employees master;
  class right_to_work_verifications embedded_master;
  class users platform_builtin;
  style right_to_work_verifications stroke-dasharray:5 5;
```

## 3. Entities catalog

| # | data_object | catalog code | singular | plural | held_as | mastered in | mastered label | install_optional | personal_content | entity_type | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `pre_employees` | `pre_employees` | Pre-Employee | Pre-Employees | master | - | - | - | yes | operational_workflow | `:manage` | - |
| 2 | `candidates` | `candidates` | Candidate | Candidates | embedded_master | `ats-candidate-crm` | Candidate CRM | - | yes | operational_workflow | `:manage` | - |
| 3 | `job_offers` | `job_offers` | Offer | Offers | embedded_master | `ats-offers` | Job Offers | - | yes | operational_workflow | `:manage` | - |
| 4 | `right_to_work_verifications` | `right_to_work_verifications` | Right to Work Verification | Right to Work Verifications | embedded_master | `bgv-continuous-identity` | Continuous and Identity | yes | yes | operational_workflow | `:manage` | - |

## 4. Aliases and industry synonyms

_(none: no industry-scoped aliases for this scope)_

## 5. Relationships

_`field_required` applies only when both entities are installed. It never makes an entity required._

### 5.1 Relationships between entities in this blueprint

| from | verb | to | cardinality | kind | field_required | owner_side | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `job_offers` | spawns pre-employee record | `pre_employees` | one_to_one | reference | yes | source | restrict | reference | - |
| `candidates` | becomes pre-employee | `pre_employees` | one_to_one | reference | yes | source | restrict | reference | - |
| `candidates` | verified_via | `right_to_work_verifications` | one_to_many | reference | no | source | clear | reference | - |

### 5.2 Relationships to platform built-ins (`users`)

| from | verb | to | cardinality | field_required | owner_side | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `users` | approves | `job_offers` | one_to_many | yes | source | restrict | reference | - |
| `users` | owns pre-employee record | `pre_employees` | one_to_many | yes | source | restrict | reference | - |
| `users` | owns as recruiter | `candidates` | one_to_many | no | source | clear | reference | - |
| `users` | verifies | `right_to_work_verifications` | one_to_many | no | source | clear | reference | - |

### 5.3 Relationships to entities outside this blueprint

_External entities are optional: this blueprint never installs them. If one exists at install, the relationship is proposed. A many-to-many relationship is listed under outgoing and proposed as a new junction table._

#### 5.3a Outgoing relationships: this blueprint's entity points to the external entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `skill_profiles` | feeds | `candidates` | one_to_many | no | - |
| `recruitment_sources` | attributes | `candidates` | one_to_many | no | - |
| `recruitment_agencies` | sources | `candidates` | one_to_many | yes | - |
| `recruitment_events` | attracts | `candidates` | one_to_many | yes | - |
| `talent_pools` | groups | `candidates` | many_to_many | - | - |
| `job_applications` | results in | `job_offers` | one_to_many | yes | - |
| `employees` | applies_as | `candidates` | one_to_many | no | - |

#### 5.3b Incoming relationships: the external entity points to this blueprint's entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `candidates` | submits | `job_applications` | one_to_many | yes | - |
| `candidates` | is referred through | `candidate_referrals` | one_to_many | yes | - |
| `job_offers` | is contingent on | `background_checks` | one_to_many | yes | - |
| `job_offers` | spawns | `onboarding_journeys` | one_to_one | yes | - |
| `job_offers` | triggers | `benefit_enrollments` | one_to_one | yes | - |
| `job_offers` | seeds | `compensation_statements` | one_to_one | yes | - |
| `candidates` | becomes | `employees` | one_to_one | yes | - |
| `pre_employees` | promotes to | `employees` | one_to_one | yes | - |
| `candidates` | engaged_via | `candidate_engagements` | one_to_many | no | - |
| `candidates` | attends_via | `recruiting_event_attendances` | one_to_many | yes | - |
| `candidates` | noted_via | `recruiter_interactions` | one_to_many | no | - |
| `candidates` | consents_via | `candidate_consents` | one_to_many | yes | - |
| `candidates` | member_of_via | `talent_pool_memberships` | one_to_many | yes | - |
| `candidates` | discloses_via | `fcra_disclosures` | one_to_many | yes | - |
| `candidates` | self_identifies_via | `eeo_responses` | one_to_many | yes | - |
| `job_offers` | evolves_through | `offer_versions` | one_to_many | yes | - |
| `job_offers` | gated_by | `offer_approvals` | one_to_many | yes | - |
| `candidates` | submits_via | `data_subject_requests` | one_to_many | yes | - |
| `candidates` | self_ids_via | `voluntary_self_identifications` | one_to_many | yes | - |
| `candidates` | acknowledges_via | `fcra_summary_of_rights_acknowledgments` | one_to_many | yes | - |
| `candidates` | documented_via | `candidate_documents` | one_to_many | yes | - |
| `candidates` | annotated_via | `candidate_notes` | one_to_many | yes | - |
| `candidates` | tagged_via | `candidate_tag_assignments` | one_to_many | no | - |
| `candidates` | corresponds_via | `candidate_emails` | one_to_many | no | - |
| `candidates` | screened_via | `drug_health_screenings` | one_to_many | no | - |
| `candidates` | submitted_via | `agency_submissions` | one_to_many | no | - |

## 6. Cross-domain context

### 6.1 Master consumers (other modules / domains that embed this scope's masters)

_`held_as` and `install_optional` here belong to the other module named in that row, not to this blueprint._

| data_object | other module / domain | held_as | install_optional | notes |
| --- | --- | --- | --- | --- |
| `pre_employees` | HCM-LIFECYCLE-WORKFLOWS (Employee Lifecycle Workflows) - HCM | embedded_master | - | - |

### 6.2 Outbound handoffs (events this scope publishes)

| source module | target domain | target module | trigger_event | transition | payload | integration | friction | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ATS-PRE-EMPLOYEE-RECORD | HCM | HCM-LIFECYCLE-WORKFLOWS | `candidate.hired` | `hired` _(lifecycle)_ | `candidates` | event_stream | high | Hired-candidate event publishes the hiring outcome to HCM, which must create the employee record. Identifier mapping (candidate_id -> employee_id) is the canonical reconciliation gap. |
| ATS-PRE-EMPLOYEE-RECORD | HCM | HCM-LIFECYCLE-WORKFLOWS | `job_offer.accepted` | `accepted` _(state_change)_ | `job_offers` | event_stream | medium | Offer acceptance signals firm hiring intent; HCM creates pending-employee record. |
| ATS-PRE-EMPLOYEE-RECORD | HCM | HCM-LIFECYCLE-WORKFLOWS | `pre_employee.activated` | `in_progress` → `activated` _(state_change)_ | `pre_employees` | event_stream | medium | Pre-employee activation hands the canonical reconciliation to HCM-mastered `employees`. ATS owns the pre-employee lifecycle stage (paperwork, background check, pre-boarding); at start-date the pre_employee row is reconciled into the HCM employee record. Identifier mapping (pre_employee_id → employee_id) is the canonical reconciliation gap. Replaces / complements the older candidate.hired and job_offer.accepted handoffs by carrying the proper post-acceptance reconciliation milestone. |
| ATS-PRE-EMPLOYEE-RECORD | COMP-MGMT | COMP-STATEMENTS | `job_offer.accepted` | `accepted` _(state_change)_ | `job_offers` | event_stream | low | Signed offer establishes the comp baseline; COMP-MGMT incorporates into cycle history. |
| ATS-PRE-EMPLOYEE-RECORD | BEN-ADMIN | BEN-ENROLLMENT | `candidate.hired` | `hired` _(lifecycle)_ | `candidates` | event_stream | low | Hired candidate triggers eligibility window in BEN-ADMIN. |
| ATS-PRE-EMPLOYEE-RECORD | ONBOARDING | ONB-JOURNEY-MGMT | `candidate.hired` | `hired` _(lifecycle)_ | `candidates` | event_stream | medium | Hired candidate drives onboarding-plan kickoff with role/location/manager context from ATS payload. |

### 6.3 Inbound handoffs (events this scope reacts to)

| target module | source domain | source module | trigger_event | transition | payload | integration | friction | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ATS-PRE-EMPLOYEE-RECORD | HCM | HCM-CORE-WORKER | `employee.applied_internally` | `active` → `active` _(signal)_ | `candidates` | api_call | medium | When an employee applies internally, HCM hands the worker context to the applicant tracker, which materializes an internal candidate record from the worker profile. Friction: reconciling the worker identity against the candidate identity space. |
| ATS-PRE-EMPLOYEE-RECORD | ATS | ATS-REFERRALS | `candidate_referral.submitted` | _(lifecycle)_ | `candidates` | lifecycle_progression | low | - |
| ATS-PRE-EMPLOYEE-RECORD | ATS | ATS-RECRUITMENT-PIPELINE | `job_application.advanced` | _(state_change)_ | `job_offers` | lifecycle_progression | low | - |
| ATS-PRE-EMPLOYEE-RECORD | BGV | BGV-SCREENING-ORDERS | `background_check.flagged` | `completed_consider` _(lifecycle)_ | `job_offers` | api_call | medium | Flagged background check may force offer rescission; HR/Legal review path. |
| ATS-PRE-EMPLOYEE-RECORD | BGV | BGV-SCREENING-ORDERS | `background_check.cleared` | `completed_clear` _(lifecycle)_ | `pre_employees` | api_call | low | Background-check clearance unblocks pre-employee activation. |

### 6.4 Master providers (modules / domains that own masters this scope embeds)

| data_object | held_as | install_optional | catalog owner(s) | slice notes |
| --- | --- | --- | --- | --- |
| `candidates` | embedded_master | - | ATS-CANDIDATE-CRM (ATS) | - |
| `job_offers` | embedded_master | - | ATS-OFFERS (ATS) | - |
| `right_to_work_verifications` | embedded_master | yes | BGV-CONTINUOUS-IDENTITY (BGV) | - |

## 7. Lifecycle states

### `candidates` (Candidate)

_This scope holds `candidates` as **embedded_master**; the canonical state machine is owned by `ATS-CANDIDATE-CRM`._

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `prospect` | ✓ | - | - | - | - | Person known to the recruiting org with no active application. |
| 2 | `active` | - | - | - | - | - | Candidate has at least one open application or is actively engaged. |
| 3 | `hired` | - | ✓ | ✓ | - | `ats-pre-employee-record:hire_candidate` | Candidate accepted an offer and converted to employee. |
| 4 | `do_not_hire` | - | ✓ | ✓ | - | `ats-pre-employee-record:flag_do_not_hire` | Candidate flagged as ineligible for future consideration; gated decision. |
| 5 | `archived` | - | ✓ | - | - | - | Candidate kept in the database but not active in any pipeline. |

### `job_offers` (Offer)

_This scope holds `job_offers` as **embedded_master**; the canonical state machine is owned by `ATS-OFFERS`._

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | - | - | - | Recruiter is composing offer terms and compensation components. |
| 2 | `pending_approval` | - | - | - | - | - | Offer routed to the designated approver for sign-off. |
| 3 | `approved` | - | - | ✓ | - | `ats-pre-employee-record:approve_offer` | Approver signed off; offer is ready to send. |
| 4 | `sent` | - | - | - | - | - | Offer delivered to the candidate. |
| 5 | `accepted` | - | ✓ | - | - | - | Candidate accepted the offer. |
| 6 | `declined` | - | ✓ | - | - | - | Candidate declined the offer. |
| 7 | `rescinded` | - | ✓ | ✓ | - | `ats-pre-employee-record:rescind_offer` | Offer withdrawn by the employer after being sent; gated action. |

### `pre_employees` (Pre-Employee)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `created` | ✓ | - | - | - | - | Record created when an offer is accepted. Paperwork packet not yet generated. |
| 2 | `paperwork_in_flight` | - | - | - | - | - | I-9 / W-4 / direct-deposit / banking forms issued; awaiting candidate completion. Background check may run in parallel. |
| 3 | `cleared` | - | - | - | - | - | All paperwork received and background check completed clear. Ready for HCM activation. |
| 4 | `activated` | - | ✓ | ✓ | - | `ats-pre-employee-record:activate_pre_employee` | Reconciliation handoff fired to HCM (pre_employee.activated event). Canonical employees row created downstream; ATS record becomes read-only. |
| 5 | `canceled` | - | ✓ | - | - | - | Offer rescinded or candidate withdrew before activation. Record retained for audit. |

### `right_to_work_verifications` (Right to Work Verification)

_This scope holds `right_to_work_verifications` as **embedded_master**; the canonical state machine is owned by `BGV-CONTINUOUS-IDENTITY`._

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `pending` | ✓ | - | - | - | - | - |
| 2 | `in_progress` | - | - | - | - | - | - |
| 3 | `verified` | - | ✓ | ✓ | - | `ats-pre-employee-record:verify_right_to_work` | - |
| 4 | `tentative_nonconfirmation` | - | - | - | - | - | - |
| 5 | `final_nonconfirmation` | - | ✓ | - | - | - | - |
| 6 | `closed` | - | ✓ | - | - | - | - |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `ats-pre-employee-record:read` | baseline-read | Read access to every entity in the module | ✓ |
| `ats-pre-employee-record:manage` | baseline-manage | Edit operational records | ✓ |
| `ats-pre-employee-record:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `ats-pre-employee-record:hire_candidate` | workflow-gate (lifecycle) | Transition `candidates` into state `hired` | ✓ |
| `ats-pre-employee-record:flag_do_not_hire` | workflow-gate (lifecycle) | Transition `candidates` into state `do_not_hire` (⚠ no process) | ✓ |
| `ats-pre-employee-record:approve_offer` | workflow-gate (lifecycle) | Transition `job_offers` into state `approved` | ✓ |
| `ats-pre-employee-record:rescind_offer` | workflow-gate (lifecycle) | Transition `job_offers` into state `rescinded` (⚠ no process) | ✓ |
| `ats-pre-employee-record:activate_pre_employee` | workflow-gate (lifecycle) | Transition `pre_employees` into state `activated` (⚠ no process) | ✓ |
| `ats-pre-employee-record:verify_right_to_work` | workflow-gate (lifecycle) | Transition `right_to_work_verifications` into state `verified` (⚠ no process) | ✓ |
| `ats-pre-employee-record:view_all_candidates` | override (personal_content) | View all `candidates` rows beyond row-scope | ✓ |
| `ats-pre-employee-record:manage_all_candidates` | override (personal_content) | Manage all `candidates` rows beyond row-scope | ✓ |
| `ats-pre-employee-record:view_all_offers` | override (personal_content) | View all `job_offers` rows beyond row-scope | ✓ |
| `ats-pre-employee-record:manage_all_offers` | override (personal_content) | Manage all `job_offers` rows beyond row-scope | ✓ |
| `ats-pre-employee-record:view_all_pre_employees` | override (personal_content) | View all `pre_employees` rows beyond row-scope | ✓ |
| `ats-pre-employee-record:manage_all_pre_employees` | override (personal_content) | Manage all `pre_employees` rows beyond row-scope | ✓ |
| `ats-pre-employee-record:view_all_right_to_work_verifications` | override (personal_content) | View all `right_to_work_verifications` rows beyond row-scope | ✓ |
| `ats-pre-employee-record:manage_all_right_to_work_verifications` | override (personal_content) | Manage all `right_to_work_verifications` rows beyond row-scope | ✓ |

### 8.2 Business rules

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `candidate_edit_scope` | `candidates` | has_personal_content | Row-scope by default; override via `ats-pre-employee-record:view_all_candidates` / `ats-pre-employee-record:manage_all_candidates` |
| `offer_edit_scope` | `job_offers` | has_personal_content | Row-scope by default; override via `ats-pre-employee-record:view_all_offers` / `ats-pre-employee-record:manage_all_offers` |
| `pre_employee_edit_scope` | `pre_employees` | has_personal_content | Row-scope by default; override via `ats-pre-employee-record:view_all_pre_employees` / `ats-pre-employee-record:manage_all_pre_employees` |
| `right_to_work_verification_edit_scope` | `right_to_work_verifications` | has_personal_content | Row-scope by default; override via `ats-pre-employee-record:view_all_right_to_work_verifications` / `ats-pre-employee-record:manage_all_right_to_work_verifications` |

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `ATS-PRE-EMPLOYEE-RECORD`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `ats-pre-employee-record_viewer` | `ats-pre-employee-record:read` |
| `ats-pre-employee-record_manager` | `ats-pre-employee-record:manage` |
| `ats-pre-employee-record_admin` | `ats-pre-employee-record:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `ats-pre-employee-record:admin` | `ats-pre-employee-record:manage` |
| `ats-pre-employee-record:manage` | `ats-pre-employee-record:read` |
| `ats-pre-employee-record:admin` | `ats-pre-employee-record:hire_candidate` |
| `ats-pre-employee-record:admin` | `ats-pre-employee-record:flag_do_not_hire` |
| `ats-pre-employee-record:admin` | `ats-pre-employee-record:approve_offer` |
| `ats-pre-employee-record:admin` | `ats-pre-employee-record:rescind_offer` |
| `ats-pre-employee-record:admin` | `ats-pre-employee-record:activate_pre_employee` |
| `ats-pre-employee-record:admin` | `ats-pre-employee-record:verify_right_to_work` |
| `ats-pre-employee-record:admin` | `ats-pre-employee-record:view_all_candidates` |
| `ats-pre-employee-record:admin` | `ats-pre-employee-record:manage_all_candidates` |
| `ats-pre-employee-record:admin` | `ats-pre-employee-record:view_all_offers` |
| `ats-pre-employee-record:admin` | `ats-pre-employee-record:manage_all_offers` |
| `ats-pre-employee-record:admin` | `ats-pre-employee-record:view_all_pre_employees` |
| `ats-pre-employee-record:admin` | `ats-pre-employee-record:manage_all_pre_employees` |
| `ats-pre-employee-record:admin` | `ats-pre-employee-record:view_all_right_to_work_verifications` |
| `ats-pre-employee-record:admin` | `ats-pre-employee-record:manage_all_right_to_work_verifications` |

**Processes wired:**

| process_key | process_name | PCF code | PCF ID | level | description |
| --- | --- | --- | --- | --- | --- |
| `hire_candidate` | Hire candidate | 7.2.4.3 | 10465 | 4 | Wrapping up the process for hiring candidates. Agree to all hiring terms and conditions. Have the candidate accept and sign the job offer. |
| `draw_up_make_offer` | Draw up and make offer | 7.2.4.1 | 10463 | 4 | Compiling job-related information for the selected candidates in order to make up a job. Include information about the job description, reporting relationship, salary, bonus potential, benefits, and vacation allotment. |

**RACI realization:**

| actor | kind | raci | process_key | realization |
| --- | --- | --- | --- | --- |
| `RECRUITING-RECRUITER` | persona | responsible | `hire_candidate` | the gated entities' write tier |
| `HIRING-MANAGER` | persona | accountable | `hire_candidate` | grant gates [ats-pre-employee-record:hire_candidate] + the gated entities' write tier |
| `LEGAL-COMPLIANCE-SPECIALIST` | persona | informed | `hire_candidate` | notify on trigger_events [candidate.hired] |
| `RECRUITING-RECRUITER` | persona | responsible | `draw_up_make_offer` | the gated entities' write tier |
| `HIRING-MANAGER` | persona | accountable | `draw_up_make_offer` | grant gates [ats-pre-employee-record:approve_offer] + the gated entities' write tier |
| `RECRUITING-MANAGER` | persona | consulted | `draw_up_make_offer` | advisory read grant |

### 9.2 Functional ownership and default grants

| responsibility | business function | default role | default tier |
| --- | --- | --- | --- |
| owner | Recruiting | `admin` | `:admin` |
| contributor | Human Resources | `manage` | `:manage` |
| contributor | Legal | `manage` | `:manage` |
| consumer | Finance | `read` | `:read` |
