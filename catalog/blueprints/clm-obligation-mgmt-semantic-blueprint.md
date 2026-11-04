---
artifact: semantic-blueprint
version: "3.1"
license: MIT
system_name: Obligation Management
tagline: Track every commitment a contract creates and act before a deadline slips.
description: |
  Turn the promises buried in a signed contract into tracked obligations with owners, due dates, and status. Watch performance, payment, delivery, reporting, and compliance commitments move from open to satisfied, and catch the ones at risk of breach.

  Clear ownership and visible due dates mean obligations are met on time, and the moment one is breached or waived, the right people know.
system_slug: clm-obligation-mgmt
domain_modules:
  - clm-obligation-mgmt
domain_code: CLM
icon_name: file-pen
related_modules: [clm-authoring, clm-negotiation, clm-renewal, clm-repository]
persona: [CONTRACT-OPS-MANAGER, CONTRACT-OPS-SPECIALIST, LEGAL-COUNSEL]
supports_raci: false
created_at: 2026-11-04
---

# Obligation Management

## 1. Overview

Register, tracking, and alerting for contract obligations (deliverables, SLA milestones, payment terms). Masters contract_obligations. Publishes obligation.due and obligation.breached events that fan out to OP-RES / GRC.

## 2. Entity summary

| Name | data_object | Description |
| --- | --- | --- |
| Contract Milestones | `contract_milestones` | Date-driven checkpoints in a contract, such as a delivery or review date, distinct from a deliverable obligation. |
| Contract Obligations | `contract_obligations` | Specific commitments extracted from a contract, such as performance, payment, delivery, or reporting, each with an owner and due date. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  contract_obligations["Contract Obligations"]
  contract_milestones["Contract Milestones"]
  users["Users"]
  users -->|"is obligation owner for"| contract_obligations
  users -->|"owns"| contract_milestones
  class contract_obligations master;
  class contract_milestones master;
  class users platform_builtin;
  style contract_milestones stroke-dasharray:5 5;
```

## 3. Entities catalog

| # | data_object | catalog code | singular | plural | held_as | mastered in | mastered label | install_optional | personal_content | entity_type | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `contract_milestones` | `contract_milestones` | Contract Milestone | Contract Milestones | master | - | - | yes | - | operational_workflow | `:manage` | - |
| 2 | `contract_obligations` | `contract_obligations` | Contract Obligation | Contract Obligations | master | - | - | - | - | operational_workflow | `:manage` | - |

## 4. Aliases and industry synonyms

_(none: no industry-scoped aliases for this scope)_

## 5. Relationships

_`field_required` applies only when both entities are installed. It never makes an entity required._

### 5.1 Relationships between entities in this blueprint

_(none: no relationships with both entities in this blueprint)_

### 5.2 Relationships to platform built-ins (`users`)

| from | verb | to | cardinality | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `users` | is obligation owner for | `contract_obligations` | one_to_many | no | clear | reference | - |
| `users` | owns | `contract_milestones` | one_to_many | no | clear | reference | - |

### 5.3 Relationships to entities outside this blueprint

_External entities are optional: this blueprint never installs them. If one exists at install, the relationship is proposed. A many-to-many relationship is listed under outgoing and proposed as a new junction table._

#### 5.3a Outgoing relationships: this blueprint's entity points to the external entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `legal_contracts` | imposes | `contract_obligations` | one_to_many | yes | - |
| `project_billing_milestones` | updates | `contract_obligations` | one_to_many | no | - |
| `legal_contracts` | has milestone | `contract_milestones` | one_to_many | yes | - |

#### 5.3b Incoming relationships: the external entity points to this blueprint's entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `contract_obligations` | breaches_into | `audit_issues` | one_to_many | no | - |
| `contract_obligations` | alerts | `customer_cases` | one_to_many | no | - |

## 6. Cross-domain context

### 6.1 Master consumers (other modules / domains that embed this scope's masters)

_(none: no other module embeds this scope's masters)_

### 6.2 Outbound handoffs (events this scope publishes)

_(none: no outbound handoffs whose payload is in this scope)_

### 6.3 Inbound handoffs (events this scope reacts to)

_(none: no inbound handoffs whose payload is in this scope)_

### 6.4 Master providers (modules / domains that own masters this scope embeds)

_(none: this scope embeds no masters owned elsewhere; every entity is mastered here)_

## 7. Lifecycle states

### `contract_milestones` (Contract Milestone)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `pending` | ✓ | - | - | - | - | - |
| 20 | `reached` | - | ✓ | ✓ | - | `clm-obligation-mgmt:reached_contract_milestone` | - |
| 30 | `missed` | - | ✓ | - | - | - | - |

### `contract_obligations` (Contract Obligation)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `open` | ✓ | - | - | - | - | Obligation extracted/created and registered. Awaiting work or due date. |
| 20 | `in_progress` | - | - | - | - | - | Obligation owner has acknowledged and is actively delivering against the obligation. |
| 30 | `due` | - | - | - | - | - | Due date has passed without closure. Alerts have been raised to the obligation owner; escalation pending. |
| 40 | `satisfied` | - | ✓ | ✓ | - | `clm-obligation-mgmt:close_contract_obligation` | Obligation has been fully delivered and accepted. Terminal positive outcome. |
| 50 | `breached` | - | ✓ | ✓ | - | `clm-obligation-mgmt:mark_obligation_breached` | Obligation has been formally declared breached. Triggers contract-level remedies. Terminal negative outcome. |
| 60 | `waived` | - | ✓ | ✓ | - | `clm-obligation-mgmt:waive_contract_obligation` | Obligation formally waived (counterparty release or internal forgiveness). Terminal. |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `clm-obligation-mgmt:read` | baseline-read | Read access to every entity in the module | ✓ |
| `clm-obligation-mgmt:manage` | baseline-manage | Edit operational records | ✓ |
| `clm-obligation-mgmt:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `clm-obligation-mgmt:read_contract_obligations` | entity-read | Read Contract Obligations | ✓ |
| `clm-obligation-mgmt:write_contract_obligations` | entity-write | Write Contract Obligations | ✓ |
| `clm-obligation-mgmt:read_contract_milestones` | entity-read | Read Contract Milestones | ✓ |
| `clm-obligation-mgmt:write_contract_milestones` | entity-write | Write Contract Milestones | ✓ |
| `clm-obligation-mgmt:close_contract_obligation` | workflow-gate (lifecycle) | Transition `contract_obligations` into state `satisfied` | ✓ |
| `clm-obligation-mgmt:mark_obligation_breached` | workflow-gate (lifecycle) | Transition `contract_obligations` into state `breached` | ✓ |
| `clm-obligation-mgmt:waive_contract_obligation` | workflow-gate (lifecycle) | Transition `contract_obligations` into state `waived` | ✓ |
| `clm-obligation-mgmt:reached_contract_milestone` | workflow-gate (lifecycle) | Transition `contract_milestones` into state `reached` | ✓ |

_Gates with no process: `clm-obligation-mgmt:reached_contract_milestone`. No Accountable can hold them, so this blueprint does not support `raci`._

### 8.2 Business rules

_(none: no flag-derived business rules)_

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `CLM-OBLIGATION-MGMT`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `clm-obligation-mgmt_viewer` | `clm-obligation-mgmt:read` |
| `clm-obligation-mgmt_manager` | `clm-obligation-mgmt:manage` |
| `clm-obligation-mgmt_admin` | `clm-obligation-mgmt:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `clm-obligation-mgmt:admin` | `clm-obligation-mgmt:manage` |
| `clm-obligation-mgmt:manage` | `clm-obligation-mgmt:read` |
| `clm-obligation-mgmt:read` | `clm-obligation-mgmt:read_contract_obligations` |
| `clm-obligation-mgmt:read` | `clm-obligation-mgmt:read_contract_milestones` |
| `clm-obligation-mgmt:manage` | `clm-obligation-mgmt:write_contract_obligations` |
| `clm-obligation-mgmt:write_contract_obligations` | `clm-obligation-mgmt:read_contract_obligations` |
| `clm-obligation-mgmt:manage` | `clm-obligation-mgmt:write_contract_milestones` |
| `clm-obligation-mgmt:write_contract_milestones` | `clm-obligation-mgmt:read_contract_milestones` |
| `clm-obligation-mgmt:admin` | `clm-obligation-mgmt:close_contract_obligation` |
| `clm-obligation-mgmt:admin` | `clm-obligation-mgmt:mark_obligation_breached` |
| `clm-obligation-mgmt:admin` | `clm-obligation-mgmt:waive_contract_obligation` |
| `clm-obligation-mgmt:admin` | `clm-obligation-mgmt:reached_contract_milestone` |

**Processes wired:**

| process_key | process_name | PCF code | PCF ID | level | description |
| --- | --- | --- | --- | --- | --- |
| `evaluate_enterprise_regulatory` | Evaluate enterprise regulatory and compliance obligations | 8.3.3.1 | 20722 | 4 | Evaluation of dynamic, strategic, and integrated approach to manage regulatory requirements and compliance obligations. |

**RACI realization:**

| actor | kind | raci | process_key | realization |
| --- | --- | --- | --- | --- |
| `CONTRACT-OPS-SPECIALIST` | persona | responsible | `evaluate_enterprise_regulatory` | the gated entities' write tier |
| `CONTRACT-OPS-MANAGER` | persona | accountable | `evaluate_enterprise_regulatory` | grant gates [clm-obligation-mgmt:close_contract_obligation, clm-obligation-mgmt:mark_obligation_breached, clm-obligation-mgmt:waive_contract_obligation] + the gated entities' write tier |
| `LEGAL-COUNSEL` | persona | informed | `evaluate_enterprise_regulatory` | notify on trigger_events [contract_obligation.breached, contract_obligation.satisfied, contract_obligation.waived] |

### 9.2 Functional ownership and default grants

| responsibility | business function | default role | default tier |
| --- | --- | --- | --- |
| owner | Contract Operations | `admin` | `:admin` |
| contributor | Procurement | `manager` | `:manage` |
| contributor | Sales | `manager` | `:manage` |
