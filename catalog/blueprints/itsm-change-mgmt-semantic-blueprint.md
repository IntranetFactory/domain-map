---
artifact: semantic-blueprint
version: "3.1"
license: MIT
system_name: Change and Release Management
tagline: Ship changes to production with the right approvals and a clear rollback path.
description: |
  Change and Release Management governs how work reaches your live environment. Every change is proposed, assessed for risk, approved by the right authority, and scheduled so it lands without colliding with other work or breaking dependent services.

  Approval gates, submission controls, and a full change history give you the assurance to move fast without inviting the next outage. The payoff is a higher rate of successful changes and far fewer self-inflicted incidents.
system_slug: itsm-change-mgmt
domain_modules:
  - itsm-change-mgmt
domain_code: ITSM
icon_name: headset
related_modules: [ats-recruitment-pipeline, cmdb-core, hcm-core-worker, hcm-org-positions, iga-access-request, itsm-incident-mgmt, iwms-location-master, rmm-agent-mgmt, rmm-patch-mgmt]
persona: [HR-BUSINESS-PARTNER, HR-HRIS-ADMIN, HR-ORG-DESIGN-ANALYST, PEOPLE-MANAGER]
supports_raci: false
created_at: 2026-11-04
---

# Change and Release Management

## 1. Overview

Change request capture, CAB workflow, approval routing, release planning, and standard-change catalog.

## 2. Entity summary

| Name | data_object | Description |
| --- | --- | --- |
| CAB Meetings | `cab_meetings` | Change Advisory Board meeting records covering agenda, attendees, changes reviewed, decisions, and minutes. |
| Change Collisions | `change_collisions` | Detected conflicts between overlapping changes or a change scheduled in a blackout window, recording the colliding changes and the resolution. |
| Changes | `service_changes` | Planned modifications to a service or configuration item, with change type, risk score, approval state, schedule, and back-out plan. |
| Service Releases | `service_releases` | Release records that bundle one or more changes into a single shippable unit, with the release window, status, and rollback plan. |
| Configuration Items | `configuration_items` | Canonical records of IT things under management: servers, containers, applications, services, network devices, databases, and cloud resources. |
| Locations | `locations` | Physical or organizational locations referenced across the system, used to place and group other records. |
| Org Units | `org_units` | Nodes in the organizational hierarchy such as divisions, departments, and teams, with manager, cost center alignment, geographic scope, and parent-child relationships. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef embedded_master fill:#fff4cc,stroke:#c79100,color:#5b4500;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  org_units["Org Units"]
  service_changes["Changes"]
  configuration_items["Configuration Items"]
  locations["Locations"]
  service_releases["Service Releases"]
  cab_meetings["CAB Meetings"]
  change_collisions["Change Collisions"]
  users["Users"]
  service_changes -->|"impacts"| configuration_items
  service_changes -->|"updates"| configuration_items
  configuration_items -->|"changed_by"| service_changes
  org_units -->|"parent of"| org_units
  locations -->|"parent of"| locations
  users -->|"leads"| org_units
  users -->|"owned changes"| service_changes
  users -->|"approved changes"| service_changes
  users -->|"owned CIs"| configuration_items
  org_units -->|"has members"| users
  locations -->|"houses"| users
  class org_units embedded_master;
  class service_changes master;
  class configuration_items embedded_master;
  class locations embedded_master;
  class service_releases master;
  class cab_meetings master;
  class change_collisions master;
  class users platform_builtin;
  style org_units stroke-dasharray:5 5;
  style locations stroke-dasharray:5 5;
```

## 3. Entities catalog

| # | data_object | catalog code | singular | plural | held_as | mastered in | mastered label | install_optional | personal_content | entity_type | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `cab_meetings` | `cab_meetings` | CAB Meeting | CAB Meetings | master | - | - | - | - | operational_record | `:manage` | - |
| 2 | `change_collisions` | `change_collisions` | Change Collision | Change Collisions | master | - | - | - | - | operational_record | `:manage` | - |
| 3 | `service_changes` | `service_changes` | Change | Changes | master | - | - | - | - | operational_workflow | `:manage` | - |
| 4 | `service_releases` | `service_releases` | Service Release | Service Releases | master | - | - | - | - | operational_workflow | `:manage` | - |
| 5 | `configuration_items` | `configuration_items` | Configuration Item | Configuration Items | embedded_master | `cmdb-core` | CMDB Core Repository | - | - | operational_workflow | `:manage` | - |
| 6 | `locations` | `locations` | Location | Locations | embedded_master | `iwms-location-master` | Location and Property Master | yes | - | catalog | `:admin` | - |
| 7 | `org_units` | `org_units` | Org Unit | Org Units | embedded_master | `hcm-org-positions` | Organization and Position Management | yes | - | operational_workflow | `:manage` | - |

## 4. Aliases and industry synonyms

_(none: no industry-scoped aliases for this scope)_

## 5. Relationships

_`field_required` applies only when both entities are installed. It never makes an entity required._

### 5.1 Relationships between entities in this blueprint

| from | verb | to | cardinality | kind | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `service_changes` | impacts | `configuration_items` | many_to_many | reference | - | cascade | parent | - |
| `service_changes` | updates | `configuration_items` | many_to_many | reference | - | cascade | parent | - |
| `configuration_items` | changed_by | `service_changes` | many_to_many | reference | - | cascade | parent | - |
| `org_units` | parent of | `org_units` | one_to_many | reference | no | clear | reference | - |
| `locations` | parent of | `locations` | one_to_many | reference | no | clear | reference | - |

### 5.2 Relationships to platform built-ins (`users`)

| from | verb | to | cardinality | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `users` | leads | `org_units` | one_to_many | no | clear | reference | - |
| `users` | owned changes | `service_changes` | one_to_many | no | clear | reference | - |
| `users` | approved changes | `service_changes` | one_to_many | no | clear | reference | - |
| `users` | owned CIs | `configuration_items` | one_to_many | no | clear | reference | - |
| `org_units` | has members | `users` | one_to_many | no | clear | reference | - |
| `locations` | houses | `users` | one_to_many | no | clear | reference | - |

### 5.3 Relationships to entities outside this blueprint

_External entities are optional: this blueprint never installs them. If one exists at install, the relationship is proposed. A many-to-many relationship is listed under outgoing and proposed as a new junction table._

#### 5.3a Outgoing relationships: this blueprint's entity points to the external entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `cost_centers` | funds | `org_units` | one_to_many | yes | - |
| `org_units` | sponsors | `benefit_plans` | many_to_many | - | - |
| `survey_campaigns` | targets | `org_units` | many_to_many | - | - |
| `service_problems` | results_in | `service_changes` | one_to_many | no | - |
| `service_incidents` | references | `configuration_items` | many_to_many | - | - |
| `enterprise_applications` | mapped_to | `configuration_items` | many_to_many | - | - |
| `enterprise_applications` | onboards_into | `configuration_items` | one_to_one | no | - |
| `ci_classes` | classifies | `configuration_items` | one_to_many | yes | - |
| `configuration_items` | baselined_in | `ci_baselines` | many_to_many | - | - |
| `configuration_items` | composes | `service_maps` | many_to_many | - | - |
| `hardware_assets` | represented_as | `configuration_items` | one_to_one | no | - |
| `service_changes` | references | `ci_baselines` | many_to_many | - | - |
| `dc_port_connections` | updates | `configuration_items` | one_to_many | no | - |
| `vulnerability_remediations` | tracked_via | `service_changes` | one_to_many | no | - |

#### 5.3b Incoming relationships: the external entity points to this blueprint's entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `org_units` | groups | `employees` | one_to_many | yes | - |
| `org_units` | contains | `hcm_positions` | one_to_many | yes | - |
| `org_units` | engages | `contingent_workers` | one_to_many | no | - |
| `org_units` | is_scored_by | `engagement_drivers` | one_to_many | no | - |
| `org_units` | is_measured_by | `people_kpis` | one_to_many | no | - |
| `org_units` | triggers | `iga_entitlement_definitions` | one_to_many | no | - |
| `org_units` | maps_to | `cost_centers` | one_to_one | no | - |
| `org_units` | sponsors | `compliance_assignments` | one_to_many | no | - |
| `org_units` | owns | `action_plans` | one_to_many | no | - |
| `service_changes` | generates | `asset_lifecycle_events` | one_to_many | no | - |
| `configuration_items` | related_via | `ci_relationships` | one_to_many | no | - |
| `configuration_items` | triggers | `service_incidents` | one_to_many | no | - |
| `locations` | hosts_desk_bookings | `desk_bookings` | one_to_many | yes | - |
| `locations` | hosts_room_reservations | `room_reservations` | one_to_many | yes | - |
| `locations` | site_of_service_requests | `workplace_service_requests` | one_to_many | yes | - |
| `locations` | measured_by_reports | `space_utilization_reports` | one_to_many | yes | - |
| `locations` | subject_of_feedback | `workplace_experience_feedback` | one_to_many | no | - |
| `configuration_items` | affected_by | `vulnerabilities` | one_to_many | no | - |

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
| `configuration_items` | embedded_master | - | CMDB-CORE (CMDB) | - |
| `locations` | embedded_master | yes | IWMS-LOCATION-MASTER (IWMS) | - |
| `org_units` | embedded_master | yes | HCM-ORG-POSITIONS (HCM) | - |

## 7. Lifecycle states

### `configuration_items` (Configuration Item)

_This scope holds `configuration_items` as **embedded_master**; the canonical state machine is owned by `CMDB-CORE`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `discovered` | ✓ | - | `CMDB-CORE` | - | - | - | CI auto-detected by discovery feed; not yet curated. |
| 2 | `registered` | - | - | `CMDB-CORE` | ✓ | - | `cmdb-core:register_ci` | CI record curated and accepted into the CMDB of record. |
| 3 | `in_use` | - | - | `CMDB-CORE` | - | - | - | CI is actively in operational use. |
| 4 | `retired` | - | - | `CMDB-CORE` | ✓ | - | `cmdb-core:retire_ci` | CI taken out of service but record retained. |
| 5 | `archived` | - | ✓ | `CMDB-CORE` | ✓ | - | `cmdb-core:archive_ci` | CI record archived after retirement; read-only for audit. |

### `org_units` (Org Unit)

_This scope holds `org_units` as **embedded_master**; the canonical state machine is owned by `HCM-ORG-POSITIONS`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | `HCM-ORG-POSITIONS` | - | - | - | Org unit defined as part of a future structure; not yet operational. |
| 2 | `active` | - | - | `HCM-ORG-POSITIONS` | ✓ | - | `hcm-org-positions:active_org_unit` | Operational unit; carries headcount, cost-center relationship, and reporting lines. |
| 3 | `reorganized` | - | ✓ | `HCM-ORG-POSITIONS` | ✓ | - | `hcm-org-positions:reorganized_org_unit` | Unit folded into or replaced by a new structure; references remain for history. |
| 4 | `closed` | - | ✓ | `HCM-ORG-POSITIONS` | ✓ | - | `hcm-org-positions:closed_org_unit` | Unit dissolved; no employees or positions reside in it. |

### `service_changes` (Change)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | `ITSM-CHANGE-MGMT` | - | - | - | Change record being authored by the requester. |
| 2 | `submitted` | - | - | `ITSM-CHANGE-MGMT` | - | - | - | Submitted to CAB / change manager for review. |
| 3 | `approved` | - | - | `ITSM-CHANGE-MGMT` | ✓ | - | `itsm-change-mgmt:approve_change` | Approver has authorized the change to proceed. |
| 4 | `implementing` | - | - | `ITSM-CHANGE-MGMT` | - | - | - | Change is being executed in the implementation window. |
| 5 | `review` | - | - | `ITSM-CHANGE-MGMT` | - | - | - | Post-implementation review (success, back-out, lessons). |
| 6 | `closed` | - | ✓ | `ITSM-CHANGE-MGMT` | - | - | - | Change record finalized after PIR. |
| 7 | `rejected` | - | ✓ | `ITSM-CHANGE-MGMT` | - | - | - | Approver rejected the change; will not be implemented. |
| 8 | `canceled` | - | ✓ | `ITSM-CHANGE-MGMT` | - | - | - | Change withdrawn by requester before approval/implementation. |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `itsm-change-mgmt:read` | baseline-read | Read access to every entity in the module | ✓ |
| `itsm-change-mgmt:manage` | baseline-manage | Edit operational records | ✓ |
| `itsm-change-mgmt:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `hcm-org-positions:read_org_units` | entity-read | Read Org Units | ✓ |
| `hcm-org-positions:write_org_units` | entity-write | Write Org Units | ✓ |
| `itsm-change-mgmt:read_service_changes` | entity-read | Read Changes | ✓ |
| `itsm-change-mgmt:write_service_changes` | entity-write | Write Changes | ✓ |
| `cmdb-core:read_configuration_items` | entity-read | Read Configuration Items | ✓ |
| `cmdb-core:write_configuration_items` | entity-write | Write Configuration Items | ✓ |
| `iwms-location-master:read_locations` | entity-read | Read Locations | ✓ |
| `iwms-location-master:write_locations` | entity-write | Write Locations | ✓ |
| `itsm-change-mgmt:read_service_releases` | entity-read | Read Service Releases | ✓ |
| `itsm-change-mgmt:write_service_releases` | entity-write | Write Service Releases | ✓ |
| `itsm-change-mgmt:read_cab_meetings` | entity-read | Read CAB Meetings | ✓ |
| `itsm-change-mgmt:write_cab_meetings` | entity-write | Write CAB Meetings | ✓ |
| `itsm-change-mgmt:read_change_collisions` | entity-read | Read Change Collisions | ✓ |
| `itsm-change-mgmt:write_change_collisions` | entity-write | Write Change Collisions | ✓ |
| `hcm-org-positions:active_org_unit` | workflow-gate (lifecycle) | Transition `org_units` into state `active` | ✓ |
| `hcm-org-positions:reorganized_org_unit` | workflow-gate (lifecycle) | Transition `org_units` into state `reorganized` | ✓ |
| `hcm-org-positions:closed_org_unit` | workflow-gate (lifecycle) | Transition `org_units` into state `closed` | ✓ |
| `itsm-change-mgmt:approve_change` | workflow-gate (lifecycle) | Transition `service_changes` into state `approved` | ✓ |
| `cmdb-core:register_ci` | workflow-gate (lifecycle) | Transition `configuration_items` into state `registered` | ✓ |
| `cmdb-core:retire_ci` | workflow-gate (lifecycle) | Transition `configuration_items` into state `retired` | ✓ |
| `cmdb-core:archive_ci` | workflow-gate (lifecycle) | Transition `configuration_items` into state `archived` | ✓ |

_Gates with no process: `hcm-org-positions:closed_org_unit`, `itsm-change-mgmt:approve_change`, `cmdb-core:register_ci`, `cmdb-core:retire_ci`, `cmdb-core:archive_ci`. No Accountable can hold them, so this blueprint does not support `raci`._

### 8.2 Business rules

_(none: no flag-derived business rules)_

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `ITSM-CHANGE-MGMT`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `itsm-change-mgmt_viewer` | `itsm-change-mgmt:read` |
| `itsm-change-mgmt_manager` | `itsm-change-mgmt:manage` |
| `itsm-change-mgmt_admin` | `itsm-change-mgmt:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `itsm-change-mgmt:admin` | `itsm-change-mgmt:manage` |
| `itsm-change-mgmt:manage` | `itsm-change-mgmt:read` |
| `itsm-change-mgmt:read` | `hcm-org-positions:read_org_units` |
| `itsm-change-mgmt:read` | `itsm-change-mgmt:read_service_changes` |
| `itsm-change-mgmt:read` | `cmdb-core:read_configuration_items` |
| `itsm-change-mgmt:read` | `iwms-location-master:read_locations` |
| `itsm-change-mgmt:read` | `itsm-change-mgmt:read_service_releases` |
| `itsm-change-mgmt:read` | `itsm-change-mgmt:read_cab_meetings` |
| `itsm-change-mgmt:read` | `itsm-change-mgmt:read_change_collisions` |
| `itsm-change-mgmt:manage` | `hcm-org-positions:write_org_units` |
| `hcm-org-positions:write_org_units` | `hcm-org-positions:read_org_units` |
| `itsm-change-mgmt:manage` | `itsm-change-mgmt:write_service_changes` |
| `itsm-change-mgmt:write_service_changes` | `itsm-change-mgmt:read_service_changes` |
| `itsm-change-mgmt:manage` | `cmdb-core:write_configuration_items` |
| `cmdb-core:write_configuration_items` | `cmdb-core:read_configuration_items` |
| `itsm-change-mgmt:admin` | `iwms-location-master:write_locations` |
| `iwms-location-master:write_locations` | `iwms-location-master:read_locations` |
| `itsm-change-mgmt:manage` | `itsm-change-mgmt:write_service_releases` |
| `itsm-change-mgmt:write_service_releases` | `itsm-change-mgmt:read_service_releases` |
| `itsm-change-mgmt:manage` | `itsm-change-mgmt:write_cab_meetings` |
| `itsm-change-mgmt:write_cab_meetings` | `itsm-change-mgmt:read_cab_meetings` |
| `itsm-change-mgmt:manage` | `itsm-change-mgmt:write_change_collisions` |
| `itsm-change-mgmt:write_change_collisions` | `itsm-change-mgmt:read_change_collisions` |
| `itsm-change-mgmt:admin` | `hcm-org-positions:active_org_unit` |
| `itsm-change-mgmt:admin` | `hcm-org-positions:reorganized_org_unit` |
| `itsm-change-mgmt:admin` | `hcm-org-positions:closed_org_unit` |
| `itsm-change-mgmt:admin` | `itsm-change-mgmt:approve_change` |
| `itsm-change-mgmt:admin` | `cmdb-core:register_ci` |
| `itsm-change-mgmt:admin` | `cmdb-core:retire_ci` |
| `itsm-change-mgmt:admin` | `cmdb-core:archive_ci` |

**Processes wired:**

| process_key | process_name | PCF code | PCF ID | level | description |
| --- | --- | --- | --- | --- | --- |
| `create_organizational_design` | Create organizational design | 1.2.5 | 10041 | 3 | Formulating a design for the organization's resources that allow it to meet its objectives. Develop a new framework for molding the organization's various processes into a coherent and seamless whole. |
| `conduct_organization` | Conduct organization restructuring opportunities | 1.1.5 | 16792 | 3 | Examining the scope and contingencies for restructuring based on market situation and internal realities. Map the market forces over which any and all probabilities can be probed for utility and viability. Once the restructuring options have been analyzed and the due-diligence performed, execute the deal. Consider seeking professional services for assistance in formalizing these opportunities. |

**RACI realization:**

| actor | kind | raci | process_key | realization |
| --- | --- | --- | --- | --- |
| `HR-ORG-DESIGN-ANALYST` | persona | responsible | `create_organizational_design` | the gated entities' write tier |
| `HR-BUSINESS-PARTNER` | persona | accountable | `create_organizational_design` | grant gates [hcm-org-positions:active_org_unit] + the gated entities' write tier |
| `PEOPLE-MANAGER` | persona | consulted | `create_organizational_design` | advisory read grant |
| `HR-HRIS-ADMIN` | persona | informed | `create_organizational_design` | ⚠ no event wired |
| `HR-ORG-DESIGN-ANALYST` | persona | responsible | `conduct_organization` | the gated entities' write tier |
| `HR-BUSINESS-PARTNER` | persona | accountable | `conduct_organization` | grant gates [hcm-org-positions:reorganized_org_unit] + the gated entities' write tier |
| `PEOPLE-MANAGER` | persona | consulted | `conduct_organization` | advisory read grant |

### 9.2 Functional ownership and default grants

| responsibility | business function | default role | default tier |
| --- | --- | --- | --- |
| owner | IT Service Desk | `admin` | `:admin` |
| contributor | IT Operations | `manager` | `:manage` |
| contributor | Security | `manager` | `:manage` |
| consumer | Finance | `viewer` | `:read` |
| consumer | Human Resources | `viewer` | `:read` |
