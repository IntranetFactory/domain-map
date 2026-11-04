---
artifact: semantic-blueprint
version: "3.1"
license: MIT
system_name: Candidate Talent Pools
tagline: Group and segment candidates so the right shortlist is one search away.
description: Organize candidates into pools and segments, tag them by skill or stage, and save the searches you run most. When a requisition opens, your shortlist is already assembled instead of rebuilt from scratch.
system_slug: ats-talent-pools
domain_modules:
  - ats-talent-pools
domain_code: ATS
icon_name: user-plus
related_modules: [ats-candidate-crm, ats-interviews, ats-offers, ats-pre-employee-record, ats-recruitment-pipeline, ats-referrals, ben-enrollment, hcm-core-worker, hcm-lifecycle-workflows, onb-journey-mgmt]
persona: [HIRING-MANAGER, LEGAL-COMPLIANCE-SPECIALIST, RECRUITING-RECRUITER]
supports_raci: false
created_at: 2026-11-04
---

# Candidate Talent Pools

## 1. Overview

Curated candidate groupings for nurture and pipeline-building (`talent_pools`). Embedded-masters `candidates`; deployed alone, materializes a thin candidate shell. Mirrors standalone talent-acquisition CRM products.

## 2. Entity summary

| Name | data_object | Description |
| --- | --- | --- |
| Candidate Tag Assignments | `candidate_tag_assignments` | Relationships between candidates and tags, recording who assigned each tag and when, with optional context. |
| Candidate Tags | `candidate_tags` | Free-form labels applied to candidates to support segmentation, search, and pool inclusion, with name, optional category, and color. |
| Recruiter Saved Searches | `recruiter_saved_searches` | Saved recruiter searches over the candidate database, with the filter expression, last-run time, and alert preferences. |
| Talent Pool Memberships | `talent_pool_memberships` | Relationships between candidates and talent pools, carrying added date, source, status in the pool, match score, and last engagement. |
| Talent Pools | `talent_pools` | Curated pools of candidates kept warm for future roles, such as past finalists, alumni, and hard-to-fill skill clusters. |
| Talent Segments | `talent_segments` | Rule-based pool definitions over candidates that automatically populate membership from a saved filter. |
| Candidates | `candidates` | People known to the recruiting organization, with or without an active application, carrying contact details, resume, tags, consent, and source. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef embedded_master fill:#fff4cc,stroke:#c79100,color:#5b4500;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  candidates["Candidates"]
  talent_pools["Talent Pools"]
  talent_pool_memberships["Talent Pool Memberships"]
  talent_segments["Talent Segments"]
  recruiter_saved_searches["Recruiter Saved Searches"]
  candidate_tags["Candidate Tags"]
  candidate_tag_assignments["Candidate Tag Assignments"]
  users["Users"]
  talent_pools -->|"groups"| candidates
  talent_pools -->|"has_member"| talent_pool_memberships
  candidates -->|"member_of_via"| talent_pool_memberships
  talent_segments -->|"materializes_into"| talent_pools
  candidates -->|"tagged_via"| candidate_tag_assignments
  candidate_tags -->|"applied_via"| candidate_tag_assignments
  users -->|"owns as recruiter"| candidates
  users -->|"owns"| talent_pools
  users -->|"assigned tags"| candidate_tag_assignments
  users -->|"owns"| recruiter_saved_searches
  class candidates embedded_master;
  class talent_pools master;
  class talent_pool_memberships master;
  class talent_segments master;
  class recruiter_saved_searches master;
  class candidate_tags master;
  class candidate_tag_assignments master;
  class users platform_builtin;
  style recruiter_saved_searches stroke-dasharray:5 5;
```

## 3. Entities catalog

| # | data_object | catalog code | singular | plural | held_as | mastered in | mastered label | install_optional | personal_content | entity_type | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `candidate_tag_assignments` | `candidate_tag_assignments` | Candidate Tag Assignment | Candidate Tag Assignments | master | - | - | - | - | junction | `:admin` | - |
| 2 | `candidate_tags` | `candidate_tags` | Candidate Tag | Candidate Tags | master | - | - | - | - | catalog | `:admin` | - |
| 3 | `recruiter_saved_searches` | `recruiter_saved_searches` | Recruiter Saved Search | Recruiter Saved Searches | master | - | - | yes | - | catalog | `:admin` | - |
| 4 | `talent_pool_memberships` | `talent_pool_memberships` | Talent Pool Membership | Talent Pool Memberships | master | - | - | - | - | junction | `:manage` | - |
| 5 | `talent_pools` | `talent_pools` | Talent Pool | Talent Pools | master | - | - | - | - | operational_workflow | `:manage` | - |
| 6 | `talent_segments` | `talent_segments` | Talent Segment | Talent Segments | master | - | - | - | - | catalog | `:admin` | - |
| 7 | `candidates` | `candidates` | Candidate | Candidates | embedded_master | `ats-candidate-crm` | Candidate CRM | - | yes | operational_workflow | `:manage` | - |

## 4. Aliases and industry synonyms

_(none: no industry-scoped aliases for this scope)_

## 5. Relationships

_`field_required` applies only when both entities are installed. It never makes an entity required._

### 5.1 Relationships between entities in this blueprint

| from | verb | to | cardinality | kind | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `talent_pools` | groups | `candidates` | many_to_many | reference | - | cascade | parent | - |
| `talent_pools` | has_member | `talent_pool_memberships` | one_to_many | composition | yes | cascade | parent | - |
| `candidates` | member_of_via | `talent_pool_memberships` | one_to_many | reference | yes | restrict | reference | - |
| `talent_segments` | materializes_into | `talent_pools` | one_to_many | reference | no | clear | reference | - |
| `candidates` | tagged_via | `candidate_tag_assignments` | one_to_many | reference | yes | restrict | reference | - |
| `candidate_tags` | applied_via | `candidate_tag_assignments` | one_to_many | reference | yes | restrict | reference | - |

### 5.2 Relationships to platform built-ins (`users`)

| from | verb | to | cardinality | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `users` | owns as recruiter | `candidates` | one_to_many | no | clear | reference | - |
| `users` | owns | `talent_pools` | one_to_many | yes | restrict | reference | - |
| `users` | assigned tags | `candidate_tag_assignments` | one_to_many | no | clear | reference | - |
| `users` | owns | `recruiter_saved_searches` | one_to_many | yes | restrict | reference | - |

### 5.3 Relationships to entities outside this blueprint

_External entities are optional: this blueprint never installs them. If one exists at install, the relationship is proposed. A many-to-many relationship is listed under outgoing and proposed as a new junction table._

#### 5.3a Outgoing relationships: this blueprint's entity points to the external entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `skill_profiles` | feeds | `candidates` | one_to_many | no | - |
| `recruitment_sources` | attributes | `candidates` | one_to_many | no | - |
| `recruitment_agencies` | sources | `candidates` | one_to_many | no | - |
| `recruitment_events` | attracts | `candidates` | one_to_many | no | - |
| `talent_pools` | targets | `candidate_nurture_campaigns` | many_to_many | - | - |
| `employees` | applies_as | `candidates` | one_to_many | no | - |

#### 5.3b Incoming relationships: the external entity points to this blueprint's entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `candidates` | submits | `job_applications` | one_to_many | yes | - |
| `candidates` | is referred through | `candidate_referrals` | one_to_many | yes | - |
| `candidates` | becomes | `employees` | one_to_one | no | - |
| `candidates` | becomes pre-employee | `pre_employees` | one_to_one | yes | - |
| `candidates` | engaged_via | `candidate_engagements` | one_to_many | no | - |
| `candidates` | attends_via | `recruiting_event_attendances` | one_to_many | yes | - |
| `candidates` | consents_via | `candidate_consents` | one_to_many | yes | - |
| `candidates` | discloses_via | `fcra_disclosures` | one_to_many | yes | - |
| `candidates` | self_identifies_via | `eeo_responses` | one_to_many | yes | - |
| `candidates` | submits_via | `data_subject_requests` | one_to_many | yes | - |
| `candidates` | self_ids_via | `voluntary_self_identifications` | one_to_many | yes | - |
| `candidates` | acknowledges_via | `fcra_summary_of_rights_acknowledgments` | one_to_many | yes | - |
| `candidates` | documented_via | `candidate_documents` | one_to_many | yes | - |
| `candidates` | annotated_via | `candidate_notes` | one_to_many | yes | - |
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

## 7. Lifecycle states

### `candidates` (Candidate)

_This scope holds `candidates` as **embedded_master**; the canonical state machine is owned by `ATS-CANDIDATE-CRM`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `prospect` | ✓ | - | _(always)_ | - | - | - | Person known to the recruiting org with no active application. |
| 2 | `active` | - | - | _(always)_ | - | - | - | Candidate has at least one open application or is actively engaged. |
| 3 | `hired` | - | - | `ATS-CANDIDATE-CRM` | ✓ | - | `ats-candidate-crm:hire_candidate` | Candidate accepted an offer and converted to employee; a new application moves the person back to active. |
| 4 | `do_not_hire` | - | ✓ | `ATS-CANDIDATE-CRM` | ✓ | - | `ats-candidate-crm:flag_do_not_hire` | Candidate flagged as ineligible for future consideration; gated decision. |
| 5 | `archived` | - | - | _(always)_ | - | - | - | Candidate kept in the database but not active in any pipeline; a new application moves the candidate back to active. |

### `talent_pool_memberships` (Talent Pool Membership)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `cold` | ✓ | - | _(always)_ | - | - | - | In pool, no recent engagement. |
| 2 | `warm` | - | - | _(always)_ | - | - | - | Recent positive engagement (replied, attended event). |
| 3 | `hot` | - | - | _(always)_ | - | - | - | Actively engaged; recruiter is in conversation about a specific role. |
| 4 | `removed` | - | ✓ | _(always)_ | - | - | - | Candidate removed from pool (opt-out, archive, do-not-contact). |

### `talent_pools` (Talent Pool)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `active` | ✓ | - | _(always)_ | - | - | - | Pool is open for additions and nurture campaigns. |
| 2 | `paused` | - | - | _(always)_ | - | - | - | Pool nurture is temporarily halted (off-season, budget freeze) but membership is retained. |
| 3 | `archived` | - | ✓ | _(always)_ | - | - | - | Pool is closed; membership is retained for historical attribution but no further outreach occurs. |

### `talent_segments` (Talent Segment)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | _(always)_ | - | - | - | Segment rule being authored. |
| 2 | `active` | - | - | _(always)_ | - | - | - | Segment live; membership materializes from rule. |
| 3 | `archived` | - | ✓ | _(always)_ | - | - | - | Segment retired; rule no longer evaluated. |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `ats-talent-pools:read` | baseline-read | Read access to every entity in the module | ✓ |
| `ats-talent-pools:manage` | baseline-manage | Edit operational records | ✓ |
| `ats-talent-pools:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `ats-candidate-crm:read_candidates` | entity-read | Read Candidates | ✓ |
| `ats-candidate-crm:write_candidates` | entity-write | Write Candidates | ✓ |
| `ats-talent-pools:read_talent_pools` | entity-read | Read Talent Pools | ✓ |
| `ats-talent-pools:write_talent_pools` | entity-write | Write Talent Pools | ✓ |
| `ats-talent-pools:read_talent_pool_memberships` | entity-read | Read Talent Pool Memberships | ✓ |
| `ats-talent-pools:write_talent_pool_memberships` | entity-write | Write Talent Pool Memberships | ✓ |
| `ats-talent-pools:read_talent_segments` | entity-read | Read Talent Segments | ✓ |
| `ats-talent-pools:write_talent_segments` | entity-write | Write Talent Segments | ✓ |
| `ats-talent-pools:read_recruiter_saved_searches` | entity-read | Read Recruiter Saved Searches | ✓ |
| `ats-talent-pools:write_recruiter_saved_searches` | entity-write | Write Recruiter Saved Searches | ✓ |
| `ats-talent-pools:read_candidate_tags` | entity-read | Read Candidate Tags | ✓ |
| `ats-talent-pools:write_candidate_tags` | entity-write | Write Candidate Tags | ✓ |
| `ats-talent-pools:read_candidate_tag_assignments` | entity-read | Read Candidate Tag Assignments | ✓ |
| `ats-talent-pools:write_candidate_tag_assignments` | entity-write | Write Candidate Tag Assignments | ✓ |
| `ats-candidate-crm:hire_candidate` | workflow-gate (lifecycle) | Transition `candidates` into state `hired` | ✓ |
| `ats-candidate-crm:flag_do_not_hire` | workflow-gate (lifecycle) | Transition `candidates` into state `do_not_hire` | ✓ |
| `ats-candidate-crm:view_all_candidates` | override (personal_content) | View all `candidates` rows beyond row-scope | ✓ |
| `ats-candidate-crm:manage_all_candidates` | override (personal_content) | Manage all `candidates` rows beyond row-scope | ✓ |

_Gates with no process: `ats-candidate-crm:flag_do_not_hire`. No Accountable can hold them, so this blueprint does not support `raci`._

### 8.2 Business rules

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `candidate_edit_scope` | `candidates` | has_personal_content | Row-scope by default; override via `ats-candidate-crm:view_all_candidates` / `ats-candidate-crm:manage_all_candidates` |

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `ATS-TALENT-POOLS`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `ats-talent-pools_viewer` | `ats-talent-pools:read` |
| `ats-talent-pools_manager` | `ats-talent-pools:manage` |
| `ats-talent-pools_admin` | `ats-talent-pools:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `ats-talent-pools:admin` | `ats-talent-pools:manage` |
| `ats-talent-pools:manage` | `ats-talent-pools:read` |
| `ats-talent-pools:read` | `ats-candidate-crm:read_candidates` |
| `ats-talent-pools:read` | `ats-talent-pools:read_talent_pools` |
| `ats-talent-pools:read` | `ats-talent-pools:read_talent_pool_memberships` |
| `ats-talent-pools:read` | `ats-talent-pools:read_talent_segments` |
| `ats-talent-pools:read` | `ats-talent-pools:read_recruiter_saved_searches` |
| `ats-talent-pools:read` | `ats-talent-pools:read_candidate_tags` |
| `ats-talent-pools:read` | `ats-talent-pools:read_candidate_tag_assignments` |
| `ats-talent-pools:manage` | `ats-candidate-crm:write_candidates` |
| `ats-candidate-crm:write_candidates` | `ats-candidate-crm:read_candidates` |
| `ats-talent-pools:manage` | `ats-talent-pools:write_talent_pools` |
| `ats-talent-pools:write_talent_pools` | `ats-talent-pools:read_talent_pools` |
| `ats-talent-pools:manage` | `ats-talent-pools:write_talent_pool_memberships` |
| `ats-talent-pools:write_talent_pool_memberships` | `ats-talent-pools:read_talent_pool_memberships` |
| `ats-talent-pools:admin` | `ats-talent-pools:write_talent_segments` |
| `ats-talent-pools:write_talent_segments` | `ats-talent-pools:read_talent_segments` |
| `ats-talent-pools:admin` | `ats-talent-pools:write_recruiter_saved_searches` |
| `ats-talent-pools:write_recruiter_saved_searches` | `ats-talent-pools:read_recruiter_saved_searches` |
| `ats-talent-pools:admin` | `ats-talent-pools:write_candidate_tags` |
| `ats-talent-pools:write_candidate_tags` | `ats-talent-pools:read_candidate_tags` |
| `ats-talent-pools:admin` | `ats-talent-pools:write_candidate_tag_assignments` |
| `ats-talent-pools:write_candidate_tag_assignments` | `ats-talent-pools:read_candidate_tag_assignments` |
| `ats-talent-pools:admin` | `ats-candidate-crm:hire_candidate` |
| `ats-talent-pools:admin` | `ats-candidate-crm:flag_do_not_hire` |
| `ats-talent-pools:admin` | `ats-candidate-crm:view_all_candidates` |
| `ats-talent-pools:admin` | `ats-candidate-crm:manage_all_candidates` |

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
