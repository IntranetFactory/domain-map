---
artifact: semantic-blueprint
version: "3.1"
license: MIT
system_name: SLA and Chargeback Management
tagline: Set service-level targets, track them in real time, and account for the cost.
description: |
  SLA and Chargeback Management defines the response and resolution commitments your service desk operates to, then measures every ticket against them so breaches are caught before they become escalations. Targets are explicit and performance is visible.

  Relating service consumption back to cost lets you show what IT delivers and what it costs to deliver, turning the service desk from a black box into an accountable function the business can plan around.
system_slug: itsm-sla-mgmt
domain_modules:
  - itsm-sla-mgmt
domain_code: ITSM
icon_name: headset
related_modules: [ats-recruitment-pipeline, fin-gl-close, hcm-core-worker, hcm-org-positions, iga-access-request, itsm-starter]
persona: [HR-BUSINESS-PARTNER, HR-HRIS-ADMIN, HR-ORG-DESIGN-ANALYST, PEOPLE-MANAGER]
supports_raci: false
created_at: 2026-11-04
---

# SLA and Chargeback Management

## 1. Overview

SLA / OLA definitions, breach tracking, escalation rules, service-cost tracking, and chargeback to consuming business units.

## 2. Entity summary

| Name | data_object | Description |
| --- | --- | --- |
| SLAs | `service_slas` | Service-level agreements setting response, resolution, and availability targets by priority, category, or customer tier. |
| Cost Centers | `cost_centers` | Organizational units for cost allocation, with code, manager, hierarchy, and currency, driving variance and departmental reporting. |
| Org Units | `org_units` | Nodes in the organizational hierarchy such as divisions, departments, and teams, with manager, cost center alignment, geographic scope, and parent-child relationships. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef embedded_master fill:#fff4cc,stroke:#c79100,color:#5b4500;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  org_units["Org Units"]
  service_slas["SLAs"]
  cost_centers["Cost Centers"]
  users["Users"]
  cost_centers -->|"funds"| org_units
  org_units -->|"maps_to"| cost_centers
  org_units -->|"parent of"| org_units
  users -->|"leads"| org_units
  users -->|"owns"| cost_centers
  users -->|"owned SLAs"| service_slas
  org_units -->|"has members"| users
  class org_units embedded_master;
  class service_slas master;
  class cost_centers embedded_master;
  class users platform_builtin;
  style org_units stroke-dasharray:5 5;
  style cost_centers stroke-dasharray:5 5;
```

## 3. Entities catalog

| # | data_object | catalog code | singular | plural | held_as | mastered in | mastered label | install_optional | personal_content | entity_type | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `service_slas` | `service_slas` | SLA | SLAs | master | - | - | - | - | catalog | `:admin` | - |
| 2 | `cost_centers` | `cost_centers` | Cost Center | Cost Centers | embedded_master | `fin-gl-close` | General Ledger and Close | yes | - | catalog | `:admin` | - |
| 3 | `org_units` | `org_units` | Org Unit | Org Units | embedded_master | `hcm-org-positions` | Organization and Position Management | yes | - | operational_workflow | `:manage` | - |

## 4. Aliases and industry synonyms

_(none: no industry-scoped aliases for this scope)_

## 5. Relationships

_`field_required` applies only when both entities are installed. It never makes an entity required._

### 5.1 Relationships between entities in this blueprint

| from | verb | to | cardinality | kind | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `cost_centers` | funds | `org_units` | one_to_many | reference | yes | restrict | reference | - |
| `org_units` | maps_to | `cost_centers` | one_to_one | reference | no | clear | reference | - |
| `org_units` | parent of | `org_units` | one_to_many | reference | no | clear | reference | - |

### 5.2 Relationships to platform built-ins (`users`)

| from | verb | to | cardinality | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `users` | leads | `org_units` | one_to_many | no | clear | reference | - |
| `users` | owns | `cost_centers` | one_to_many | no | clear | reference | - |
| `users` | owned SLAs | `service_slas` | one_to_many | no | clear | reference | - |
| `org_units` | has members | `users` | one_to_many | no | clear | reference | - |

### 5.3 Relationships to entities outside this blueprint

_External entities are optional: this blueprint never installs them. If one exists at install, the relationship is proposed. A many-to-many relationship is listed under outgoing and proposed as a new junction table._

#### 5.3a Outgoing relationships: this blueprint's entity points to the external entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `org_units` | sponsors | `benefit_plans` | many_to_many | - | - |
| `survey_campaigns` | targets | `org_units` | many_to_many | - | - |
| `service_slas` | aligns_with | `service_level_objectives` | many_to_many | - | - |

#### 5.3b Incoming relationships: the external entity points to this blueprint's entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `org_units` | groups | `employees` | one_to_many | yes | - |
| `org_units` | contains | `hcm_positions` | one_to_many | yes | - |
| `org_units` | engages | `contingent_workers` | one_to_many | no | - |
| `org_units` | is_scored_by | `engagement_drivers` | one_to_many | no | - |
| `org_units` | is_measured_by | `people_kpis` | one_to_many | no | - |
| `org_units` | triggers | `iga_entitlement_definitions` | one_to_many | no | - |
| `org_units` | sponsors | `compliance_assignments` | one_to_many | no | - |
| `cost_centers` | funds | `course_enrollments` | one_to_many | no | - |
| `org_units` | owns | `action_plans` | one_to_many | no | - |
| `service_slas` | governs incident | `service_incidents` | one_to_many | yes | - |
| `service_slas` | governs request | `service_requests` | one_to_many | yes | - |

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
| `cost_centers` | embedded_master | yes | FIN-GL-CLOSE (FIN) | - |
| `org_units` | embedded_master | yes | HCM-ORG-POSITIONS (HCM) | - |

## 7. Lifecycle states

### `org_units` (Org Unit)

_This scope holds `org_units` as **embedded_master**; the canonical state machine is owned by `HCM-ORG-POSITIONS`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | `HCM-ORG-POSITIONS` | - | - | - | Org unit defined as part of a future structure; not yet operational. |
| 2 | `active` | - | - | `HCM-ORG-POSITIONS` | ✓ | - | `hcm-org-positions:active_org_unit` | Operational unit; carries headcount, cost-center relationship, and reporting lines. |
| 3 | `reorganized` | - | ✓ | `HCM-ORG-POSITIONS` | ✓ | - | `hcm-org-positions:reorganized_org_unit` | Unit folded into or replaced by a new structure; references remain for history. |
| 4 | `closed` | - | ✓ | `HCM-ORG-POSITIONS` | ✓ | - | `hcm-org-positions:closed_org_unit` | Unit dissolved; no employees or positions reside in it. |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `itsm-sla-mgmt:read` | baseline-read | Read access to every entity in the module | ✓ |
| `itsm-sla-mgmt:manage` | baseline-manage | Edit operational records | ✓ |
| `itsm-sla-mgmt:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `hcm-org-positions:read_org_units` | entity-read | Read Org Units | ✓ |
| `hcm-org-positions:write_org_units` | entity-write | Write Org Units | ✓ |
| `itsm-sla-mgmt:read_service_slas` | entity-read | Read SLAs | ✓ |
| `itsm-sla-mgmt:write_service_slas` | entity-write | Write SLAs | ✓ |
| `fin-gl-close:read_cost_centers` | entity-read | Read Cost Centers | ✓ |
| `fin-gl-close:write_cost_centers` | entity-write | Write Cost Centers | ✓ |
| `hcm-org-positions:active_org_unit` | workflow-gate (lifecycle) | Transition `org_units` into state `active` | ✓ |
| `hcm-org-positions:reorganized_org_unit` | workflow-gate (lifecycle) | Transition `org_units` into state `reorganized` | ✓ |
| `hcm-org-positions:closed_org_unit` | workflow-gate (lifecycle) | Transition `org_units` into state `closed` | ✓ |

_Gates with no process: `hcm-org-positions:closed_org_unit`. No Accountable can hold them, so this blueprint does not support `raci`._

### 8.2 Business rules

_(none: no flag-derived business rules)_

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `ITSM-SLA-MGMT`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `itsm-sla-mgmt_viewer` | `itsm-sla-mgmt:read` |
| `itsm-sla-mgmt_manager` | `itsm-sla-mgmt:manage` |
| `itsm-sla-mgmt_admin` | `itsm-sla-mgmt:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `itsm-sla-mgmt:admin` | `itsm-sla-mgmt:manage` |
| `itsm-sla-mgmt:manage` | `itsm-sla-mgmt:read` |
| `itsm-sla-mgmt:read` | `hcm-org-positions:read_org_units` |
| `itsm-sla-mgmt:read` | `itsm-sla-mgmt:read_service_slas` |
| `itsm-sla-mgmt:read` | `fin-gl-close:read_cost_centers` |
| `itsm-sla-mgmt:manage` | `hcm-org-positions:write_org_units` |
| `hcm-org-positions:write_org_units` | `hcm-org-positions:read_org_units` |
| `itsm-sla-mgmt:admin` | `itsm-sla-mgmt:write_service_slas` |
| `itsm-sla-mgmt:write_service_slas` | `itsm-sla-mgmt:read_service_slas` |
| `itsm-sla-mgmt:admin` | `fin-gl-close:write_cost_centers` |
| `fin-gl-close:write_cost_centers` | `fin-gl-close:read_cost_centers` |
| `itsm-sla-mgmt:admin` | `hcm-org-positions:active_org_unit` |
| `itsm-sla-mgmt:admin` | `hcm-org-positions:reorganized_org_unit` |
| `itsm-sla-mgmt:admin` | `hcm-org-positions:closed_org_unit` |

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
