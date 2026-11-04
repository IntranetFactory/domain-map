---
artifact: semantic-blueprint
version: "3.1"
license: MIT
system_name: Services Milestone Delivery and Settlement
tagline: Track milestones and deliverables to acceptance, then pay on what was actually delivered.
description: Run the delivery half of a services engagement. Break the statement of work into milestones and the deliverables that close them, then track each one to formal acceptance so payment follows delivered outcomes, not elapsed time. Raise milestone-based invoices against accepted work and keep a clear, auditable record of who accepted what and when. Outcome-based settlement that ties every payment back to a milestone the buyer signed off.
system_slug: svcs-proc-settlement
domain_modules:
  - svcs-proc-settlement
domain_code: SVCS-PROC
persona: []
supports_raci: false
created_at: 2026-11-04
---

# Services Milestone Delivery and Settlement

## 1. Overview

The delivery and settlement surface: break the engagement into milestones and deliverables, track each to acceptance, and settle on what was delivered through milestone-based invoices. Masters the milestone, the deliverable, the milestone invoice, and the acceptance record.

## 2. Entity summary

| Name | data_object | Description |
| --- | --- | --- |
| Milestone Invoices | `milestone_invoices` | Invoices a firm raises against an accepted milestone of a services engagement, so payment follows delivered outcomes rather than elapsed time. The settlement record for outcome-based services work, distinct from time-and-materials contingent invoices. |
| Service Acceptances | `service_acceptances` | Formal sign-off records capturing that the buyer accepted a deliverable or milestone, who accepted it, and when, gating the milestone invoice. Optional because some buyers accept implicitly on invoice rather than recording a typed acceptance. |
| Service Deliverables | `service_deliverables` | Concrete work products a firm produces under a statement of work, tracked from submission to acceptance against the milestone they close. Optional because some buyers settle on the milestone alone and inline deliverables as attributes. |
| SOW Milestones | `sow_milestones` | Schedule-and-payment checkpoints that break a services engagement into accountable stages, each tied to deliverables and to the milestone invoice it releases. The settlement mechanic that makes outcome-based services payment work. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  sow_milestones["SOW Milestones"]
  service_deliverables["Service Deliverables"]
  milestone_invoices["Milestone Invoices"]
  service_acceptances["Service Acceptances"]
  class sow_milestones master;
  class service_deliverables master;
  class milestone_invoices master;
  class service_acceptances master;
  style service_deliverables stroke-dasharray:5 5;
  style service_acceptances stroke-dasharray:5 5;
```

## 3. Entities catalog

| # | data_object | catalog code | singular | plural | held_as | mastered in | mastered label | install_optional | personal_content | entity_type | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `milestone_invoices` | `milestone_invoices` | Milestone Invoice | Milestone Invoices | master | - | - | - | - | operational_workflow | `:manage` | - |
| 2 | `service_acceptances` | `service_acceptances` | Service Acceptance | Service Acceptances | master | - | - | yes | - | operational_record | `:manage` | - |
| 3 | `service_deliverables` | `service_deliverables` | Service Deliverable | Service Deliverables | master | - | - | yes | - | operational_workflow | `:manage` | - |
| 4 | `sow_milestones` | `sow_milestones` | SOW Milestone | SOW Milestones | master | - | - | - | - | operational_workflow | `:manage` | - |

## 4. Aliases and industry synonyms

_(none: no industry-scoped aliases for this scope)_

## 5. Relationships

_`field_required` applies only when both entities are installed. It never makes an entity required._

### 5.1 Relationships between entities in this blueprint

_(none: no relationships with both entities in this blueprint)_

### 5.2 Relationships to platform built-ins (`users`)

_(none: no relationships to platform built-ins)_

### 5.3 Relationships to entities outside this blueprint

_External entities are optional: this blueprint never installs them. If one exists at install, the relationship is proposed. A many-to-many relationship is listed under outgoing and proposed as a new junction table._

#### 5.3a Outgoing relationships: this blueprint's entity points to the external entity

_(none: no outgoing relationships to external entities)_

#### 5.3b Incoming relationships: the external entity points to this blueprint's entity

_(none: no incoming relationships from external entities)_

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

_(none: no lifecycle states for the entities in this scope)_
## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `svcs-proc-settlement:read` | baseline-read | Read access to every entity in the module | ✓ |
| `svcs-proc-settlement:manage` | baseline-manage | Edit operational records | ✓ |
| `svcs-proc-settlement:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `svcs-proc-settlement:read_sow_milestones` | entity-read | Read SOW Milestones | ✓ |
| `svcs-proc-settlement:write_sow_milestones` | entity-write | Write SOW Milestones | ✓ |
| `svcs-proc-settlement:read_service_deliverables` | entity-read | Read Service Deliverables | ✓ |
| `svcs-proc-settlement:write_service_deliverables` | entity-write | Write Service Deliverables | ✓ |
| `svcs-proc-settlement:read_milestone_invoices` | entity-read | Read Milestone Invoices | ✓ |
| `svcs-proc-settlement:write_milestone_invoices` | entity-write | Write Milestone Invoices | ✓ |
| `svcs-proc-settlement:read_service_acceptances` | entity-read | Read Service Acceptances | ✓ |
| `svcs-proc-settlement:write_service_acceptances` | entity-write | Write Service Acceptances | ✓ |

### 8.2 Business rules

_(none: no flag-derived business rules)_

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `SVCS-PROC-SETTLEMENT`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `svcs-proc-settlement_viewer` | `svcs-proc-settlement:read` |
| `svcs-proc-settlement_manager` | `svcs-proc-settlement:manage` |
| `svcs-proc-settlement_admin` | `svcs-proc-settlement:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `svcs-proc-settlement:admin` | `svcs-proc-settlement:manage` |
| `svcs-proc-settlement:manage` | `svcs-proc-settlement:read` |
| `svcs-proc-settlement:read` | `svcs-proc-settlement:read_sow_milestones` |
| `svcs-proc-settlement:read` | `svcs-proc-settlement:read_service_deliverables` |
| `svcs-proc-settlement:read` | `svcs-proc-settlement:read_milestone_invoices` |
| `svcs-proc-settlement:read` | `svcs-proc-settlement:read_service_acceptances` |
| `svcs-proc-settlement:manage` | `svcs-proc-settlement:write_sow_milestones` |
| `svcs-proc-settlement:write_sow_milestones` | `svcs-proc-settlement:read_sow_milestones` |
| `svcs-proc-settlement:manage` | `svcs-proc-settlement:write_service_deliverables` |
| `svcs-proc-settlement:write_service_deliverables` | `svcs-proc-settlement:read_service_deliverables` |
| `svcs-proc-settlement:manage` | `svcs-proc-settlement:write_milestone_invoices` |
| `svcs-proc-settlement:write_milestone_invoices` | `svcs-proc-settlement:read_milestone_invoices` |
| `svcs-proc-settlement:manage` | `svcs-proc-settlement:write_service_acceptances` |
| `svcs-proc-settlement:write_service_acceptances` | `svcs-proc-settlement:read_service_acceptances` |

**RACI realization:**

_(none: no process_raci assignments wired to this module's gated processes yet)_

### 9.2 Functional ownership and default grants

_(none: no business_function_domains rows for this scope's domain)_
