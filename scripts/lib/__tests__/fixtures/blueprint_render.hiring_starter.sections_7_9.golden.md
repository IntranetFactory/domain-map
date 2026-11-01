## 7. Lifecycle states

### `candidates` (Candidate)

_This scope holds `candidates` as **embedded_master**; the canonical state machine is owned by `ATS-CANDIDATE-CRM`._

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `prospect` | ✓ | - | - | - | - | Known to recruiting. |
| 2 | `hired` | - | ✓ | ✓ | - | `hiring-starter:hire_candidate` | Converted to employee. |
| 3 | `do_not_hire` | - | ✓ | ✓ | - | `hiring-starter:flag_do_not_hire` | Flagged as ineligible. |

### `job_applications` (Application)

_This scope holds `job_applications` as **embedded_master**; the canonical state machine is owned by `ATS-RECRUITMENT-PIPELINE`._

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `applied` | ✓ | - | - | - | - | Submitted. |
| 2 | `hired` | - | ✓ | ✓ | - | `hiring-starter:hire_candidate` | Hired against the requisition. |

### `job_offers` (Offer)

_This scope holds `job_offers` as **embedded_master**; the canonical state machine is owned by `ATS-OFFERS`._

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | - | - | - | Terms being composed. |
| 2 | `approved` | - | - | ✓ | ✓ | `hiring-starter:approve_offer` | Approver signed off. |
| 3 | `accepted` | - | ✓ | - | - | - | Candidate accepted. |

### `job_postings` (Job Posting)

_This scope holds `job_postings` as **embedded_master**; the canonical state machine is owned by `ATS-RECRUITMENT-PIPELINE`._

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | - | - | - | Being composed. |
| 2 | `published` | - | - | ✓ | - | `hiring-starter:publish_posting` | Live on the channel. |
| 3 | `closed` | - | ✓ | - | - | - | Taken down. |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `hiring-starter:read` | baseline-read | Read access to every entity in the module | ✓ |
| `hiring-starter:manage` | baseline-manage | Edit operational records | ✓ |
| `hiring-starter:admin` | baseline-admin | Edit reference data and inherit every workflow gate below except the high-risk ones | - |
| `hiring-starter:hire_candidate` | workflow-gate (lifecycle) | Transition `candidates` into state `hired` or `job_applications` into state `hired` | ✓ |
| `hiring-starter:flag_do_not_hire` | workflow-gate (lifecycle) | Transition `candidates` into state `do_not_hire` (⚠ no process) | ✓ |
| `hiring-starter:publish_posting` | workflow-gate (lifecycle) | Transition `job_postings` into state `published` | ✓ |
| `hiring-starter:approve_offer` | workflow-gate (lifecycle) | Transition `job_offers` into state `approved` | - |
| `hiring-starter:view_all_candidates` | override (personal_content) | View all `candidates` rows beyond row-scope | ✓ |
| `hiring-starter:manage_all_candidates` | override (personal_content) | Manage all `candidates` rows beyond row-scope | ✓ |

### 8.2 Business rules

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `candidate_edit_scope` | `candidates` | has_personal_content | Row-scope by default; override via `hiring-starter:view_all_candidates` / `hiring-starter:manage_all_candidates` |

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `HIRING-STARTER`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `hiring-starter_viewer` | `hiring-starter:read` |
| `hiring-starter_manager` | `hiring-starter:manage` |
| `hiring-starter_admin` | `hiring-starter:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `hiring-starter:admin` | `hiring-starter:manage` |
| `hiring-starter:manage` | `hiring-starter:read` |
| `hiring-starter:admin` | `hiring-starter:hire_candidate` |
| `hiring-starter:admin` | `hiring-starter:flag_do_not_hire` |
| `hiring-starter:admin` | `hiring-starter:publish_posting` |
| `hiring-starter:admin` | `hiring-starter:view_all_candidates` |
| `hiring-starter:admin` | `hiring-starter:manage_all_candidates` |

**Processes wired:**

| process_key | process_name | PCF code | PCF ID | level | description |
| --- | --- | --- | --- | --- | --- |
| `hire_candidate` | Hire candidate | 7.2.4.3 | 10465 | 4 | - |
| `recruit_source_candidates` | Recruit/Source candidates | 7.2.2 | 10440 | 3 | - |
| `draw_up_make_offer` | Draw up and make offer | 7.2.4.1 | 10463 | 4 | - |

**RACI realization:**

| actor | kind | raci | process_key | realization |
| --- | --- | --- | --- | --- |
| `RECRUITING-RECRUITER` | persona | responsible | `hire_candidate` | the gated entities' write tier |
| `HIRING-MANAGER` | persona | accountable | `hire_candidate` | grant gates [hiring-starter:hire_candidate] + the gated entities' write tier |
| `LEGAL-COMPLIANCE-SPECIALIST` | persona | informed | `hire_candidate` | notify on trigger_events [candidate.hired, job_application.hired] |
| `RECRUITING-RECRUITER` | persona | responsible | `recruit_source_candidates` | the gated entities' write tier |
| `RECRUITING-MANAGER` | persona | accountable | `recruit_source_candidates` | grant gates [hiring-starter:publish_posting] + the gated entities' write tier |
| `HIRING-MANAGER` | persona | informed | `recruit_source_candidates` | ⚠ no event wired |
| `RECRUITING-RECRUITER` | persona | responsible | `draw_up_make_offer` | the gated entities' write tier |
| `HIRING-MANAGER` | persona | accountable | `draw_up_make_offer` | grant gates [hiring-starter:approve_offer] + the gated entities' write tier |
| `RECRUITING-MANAGER` | persona | consulted | `draw_up_make_offer` | advisory read grant |

### 9.2 Functional ownership and default grants

| responsibility | business function | default role | default tier |
| --- | --- | --- | --- |
| owner | Recruiting | `admin` | `:admin` |
| consumer | Finance | `read` | `:read` |
