---
artifact: semantic-blueprint
version: "3.1"
license: MIT
system_name: Negotiation and Redlining
tagline: Redline counterparty terms and reach agreement without losing track of changes.
description: |
  Work through counterparty markups in a structured negotiation, comparing proposed language against approved positions and capturing each round of changes. Surface the terms that need legal attention and route them for sign-off.

  When both sides agree, the negotiated contract moves cleanly into approval and execution, with a record of how the final language was reached.
system_slug: clm-negotiation
domain_modules:
  - clm-negotiation
domain_code: CLM
icon_name: file-pen
related_modules: [agency-mgmt-job-traffic, clm-authoring, clm-obligation-mgmt, clm-renewal, clm-repository, cpq-quote-builder, psa-project-delivery, smp-renewal-vendor]
persona: [CONTRACT-OPS-MANAGER, CONTRACT-OPS-SPECIALIST, LEGAL-COUNSEL, PROCUREMENT-CONTRACT-LIAISON]
supports_raci: false
created_at: 2026-11-04
---

# Negotiation and Redlining

## 1. Overview

Track-changes negotiation with counterparty exchange, version comparison, and clause-risk detection. Consumes legal_contracts and contract_clauses; gates the in_negotiation -> approved lifecycle transition. Requires sign_document for signature workflow; coverage drops below 100% on the sign_document leg.

## 2. Entity summary

| Name | data_object | Description |
| --- | --- | --- |
| Contract Risk Assessments | `contract_risk_assessments` | Structured assessments of the legal or commercial risk in a contract or clause, produced during review. |
| Negotiation Playbooks | `negotiation_playbooks` | Negotiation rules and fallback positions guiding how clauses may be redlined and which concessions are pre-approved. |
| Negotiation Threads | `contract_negotiation_threads` | Structured threads of negotiation rounds and counterparty exchanges on a contract. |
| Contracts | `legal_contracts` | Contracts with counterparties or suppliers, covering type, value, key dates, governing law, and lifecycle from draft to terminated. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef embedded_master fill:#fff4cc,stroke:#c79100,color:#5b4500;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  legal_contracts["Contracts"]
  negotiation_playbooks["Negotiation Playbooks"]
  contract_risk_assessments["Contract Risk Assessments"]
  contract_negotiation_threads["Negotiation Threads"]
  users["Users"]
  legal_contracts -->|"is assessed by"| contract_risk_assessments
  legal_contracts -->|"is negotiated in"| contract_negotiation_threads
  users -->|"owns"| legal_contracts
  users -->|"approved"| legal_contracts
  users -->|"drafted"| legal_contracts
  users -->|"reviews"| contract_risk_assessments
  users -->|"participates in"| contract_negotiation_threads
  class legal_contracts embedded_master;
  class negotiation_playbooks master;
  class contract_risk_assessments master;
  class contract_negotiation_threads master;
  class users platform_builtin;
  style negotiation_playbooks stroke-dasharray:5 5;
  style contract_risk_assessments stroke-dasharray:5 5;
  style contract_negotiation_threads stroke-dasharray:5 5;
```

## 3. Entities catalog

| # | data_object | catalog code | singular | plural | held_as | mastered in | mastered label | install_optional | personal_content | entity_type | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `contract_risk_assessments` | `contract_risk_assessments` | Contract Risk Assessment | Contract Risk Assessments | master | - | - | yes | - | operational_workflow | `:manage` | - |
| 2 | `negotiation_playbooks` | `negotiation_playbooks` | Negotiation Playbook | Negotiation Playbooks | master | - | - | yes | - | catalog | `:admin` | - |
| 3 | `contract_negotiation_threads` | `contract_negotiation_threads` | Negotiation Thread | Negotiation Threads | master | - | - | yes | - | operational_workflow | `:manage` | - |
| 4 | `legal_contracts` | `legal_contracts` | Contract | Contracts | embedded_master | `clm-repository` | Contract Repository | - | yes | operational_workflow | `:manage` | - |

## 4. Aliases and industry synonyms

_(none: no industry-scoped aliases for this scope)_

## 5. Relationships

_`field_required` applies only when both entities are installed. It never makes an entity required._

### 5.1 Relationships between entities in this blueprint

| from | verb | to | cardinality | kind | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `legal_contracts` | is assessed by | `contract_risk_assessments` | one_to_many | association | no | clear | reference | - |
| `legal_contracts` | is negotiated in | `contract_negotiation_threads` | one_to_many | composition | yes | cascade | parent | - |

### 5.2 Relationships to platform built-ins (`users`)

| from | verb | to | cardinality | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `users` | owns | `legal_contracts` | one_to_many | no | clear | reference | - |
| `users` | approved | `legal_contracts` | one_to_many | no | clear | reference | - |
| `users` | drafted | `legal_contracts` | one_to_many | no | clear | reference | - |
| `users` | reviews | `contract_risk_assessments` | one_to_many | no | clear | reference | - |
| `users` | participates in | `contract_negotiation_threads` | one_to_many | no | clear | reference | - |

### 5.3 Relationships to entities outside this blueprint

_External entities are optional: this blueprint never installs them. If one exists at install, the relationship is proposed. A many-to-many relationship is listed under outgoing and proposed as a new junction table._

#### 5.3a Outgoing relationships: this blueprint's entity points to the external entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `in_house_legal_matters` | references | `legal_contracts` | many_to_many | - | - |
| `contract_templates` | seeds | `legal_contracts` | one_to_many | no | - |
| `sourcing_events` | originates | `legal_contracts` | one_to_many | no | - |
| `crm_opportunities` | drafts | `legal_contracts` | one_to_many | no | - |
| `sales_quotes` | drafts | `legal_contracts` | one_to_many | no | - |
| `contract_drafts` | drafts | `legal_contracts` | one_to_many | no | - |
| `quote_discounts` | flows into | `legal_contracts` | one_to_many | no | - |
| `commercial_leases` | flows into | `legal_contracts` | one_to_many | no | - |
| `engagement_letters` | flows into | `legal_contracts` | one_to_many | no | - |
| `contract_counterparties` | is party to | `legal_contracts` | one_to_many | no | - |

#### 5.3b Incoming relationships: the external entity points to this blueprint's entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `legal_contracts` | governs | `customer_entitlements` | one_to_many | no | - |
| `legal_contracts` | backs | `customer_subscriptions` | one_to_many | no | - |
| `legal_contracts` | contains | `contract_clauses` | one_to_many | no | - |
| `legal_contracts` | imposes | `contract_obligations` | one_to_many | yes | - |
| `legal_contracts` | witnessed_by | `signature_records` | one_to_many | yes | - |
| `legal_contracts` | activates | `saas_subscriptions` | one_to_many | no | - |
| `legal_contracts` | activates | `software_licenses` | one_to_many | no | - |
| `legal_contracts` | triggers_creation_of | `purchase_orders` | one_to_many | no | - |
| `legal_contracts` | triggers_review_in | `purchase_requisitions` | one_to_many | no | - |
| `legal_contracts` | propagates_terms_to | `invoice_matches` | one_to_many | no | - |
| `legal_contracts` | feeds_revrec_in | `revenue_recognition_records` | one_to_many | no | - |
| `legal_contracts` | seeds | `service_projects` | one_to_many | no | - |
| `legal_contracts` | renewal_warns | `crm_opportunities` | one_to_many | no | - |
| `legal_contracts` | renewal_warns | `saas_subscriptions` | one_to_many | no | - |
| `legal_contracts` | renewed_into | `customer_subscriptions` | one_to_many | no | - |
| `legal_contracts` | seeds | `agency_jobs` | one_to_many | no | - |
| `legal_contracts` | is amended by | `contract_amendments` | one_to_many | yes | - |
| `legal_contracts` | is renewed by | `contract_renewal_records` | one_to_many | yes | - |
| `negotiation_playbooks` | defines positions for | `contract_clauses` | one_to_many | no | - |
| `legal_contracts` | has milestone | `contract_milestones` | one_to_many | yes | - |
| `legal_contracts` | has data protection addendum | `data_protection_addenda` | one_to_many | yes | - |

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
| `legal_contracts` | embedded_master | - | CLM-REPOSITORY (CLM) | - |

## 7. Lifecycle states

### `contract_negotiation_threads` (Negotiation Thread)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `open` | ✓ | - | _(always)_ | - | - | - | - |
| 20 | `in_discussion` | - | - | _(always)_ | - | - | - | - |
| 30 | `resolved` | - | ✓ | `CLM-NEGOTIATION` | ✓ | - | `clm-negotiation:resolved_negotiation_thread` | - |
| 40 | `withdrawn` | - | ✓ | _(always)_ | - | - | - | - |

### `contract_risk_assessments` (Contract Risk Assessment)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `flagged` | ✓ | - | _(always)_ | - | - | - | - |
| 20 | `under_review` | - | - | _(always)_ | - | - | - | - |
| 30 | `accepted` | - | ✓ | `CLM-NEGOTIATION` | ✓ | - | `clm-negotiation:accepted_contract_risk_assessment` | - |
| 40 | `mitigated` | - | ✓ | _(always)_ | - | - | - | - |

### `legal_contracts` (Contract)

_This scope holds `legal_contracts` as **embedded_master**; the canonical state machine is owned by `CLM-REPOSITORY`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `draft` | ✓ | - | _(always)_ | - | - | - | Initial draft created in CLM-AUTHORING from a template, or received via inbound handoff from CPQ/sourcing. |
| 20 | `in_review` | - | - | `CLM-NEGOTIATION` | - | - | - | Draft has been routed for internal review prior to counterparty exchange. |
| 30 | `in_negotiation` | - | - | `CLM-NEGOTIATION` | - | - | - | Active counterparty negotiation with track-changes / redline exchange. |
| 40 | `approved` | - | - | `CLM-NEGOTIATION` | ✓ | - | `clm-negotiation:approve_legal_contract` | Final negotiated text approved by all internal stakeholders; ready for signature. |
| 50 | `out_for_signature` | - | - | `CLM-REPOSITORY` | - | - | - | Signature envelope dispatched to all required signers. |
| 60 | `signed` | - | - | `CLM-REPOSITORY` | ✓ | - | `clm-repository:execute_legal_contract` | All signers have signed; contract is fully executed. |
| 70 | `active` | - | - | _(always)_ | - | - | - | Effective date has passed; contract is in force. Default post-signature state. |
| 75 | `amended` | - | - | `CLM-REPOSITORY` | ✓ | - | `clm-repository:amend_legal_contract` | An amendment has been executed against this contract. Amendment is a separate record; this contract row reflects the amended terms going forward. |
| 80 | `expired` | - | ✓ | _(always)_ | - | - | - | End date passed without renewal or termination. Terminal state. |
| 90 | `terminated` | - | ✓ | `CLM-REPOSITORY` | ✓ | - | `clm-repository:terminate_legal_contract` | Contract terminated before end date (by mutual consent, breach, or for-cause). Terminal state. |
| 100 | `renewed` | - | ✓ | `CLM-RENEWAL` | ✓ | - | `clm-renewal:renew_legal_contract` | Renewed via a new contract record (or extended via amendment). The renewal is a separate record; this row is terminal. |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `clm-negotiation:read` | baseline-read | Read access to every entity in the module | ✓ |
| `clm-negotiation:manage` | baseline-manage | Edit operational records | ✓ |
| `clm-negotiation:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `clm-repository:read_legal_contracts` | entity-read | Read Contracts | ✓ |
| `clm-repository:write_legal_contracts` | entity-write | Write Contracts | ✓ |
| `clm-negotiation:read_negotiation_playbooks` | entity-read | Read Negotiation Playbooks | ✓ |
| `clm-negotiation:write_negotiation_playbooks` | entity-write | Write Negotiation Playbooks | ✓ |
| `clm-negotiation:read_contract_risk_assessments` | entity-read | Read Contract Risk Assessments | ✓ |
| `clm-negotiation:write_contract_risk_assessments` | entity-write | Write Contract Risk Assessments | ✓ |
| `clm-negotiation:read_contract_negotiation_threads` | entity-read | Read Negotiation Threads | ✓ |
| `clm-negotiation:write_contract_negotiation_threads` | entity-write | Write Negotiation Threads | ✓ |
| `clm-negotiation:approve_legal_contract` | workflow-gate (lifecycle) | Transition `legal_contracts` into state `approved` | ✓ |
| `clm-repository:execute_legal_contract` | workflow-gate (lifecycle) | Transition `legal_contracts` into state `signed` | ✓ |
| `clm-repository:amend_legal_contract` | workflow-gate (lifecycle) | Transition `legal_contracts` into state `amended` | ✓ |
| `clm-repository:terminate_legal_contract` | workflow-gate (lifecycle) | Transition `legal_contracts` into state `terminated` | ✓ |
| `clm-renewal:renew_legal_contract` | workflow-gate (lifecycle) | Transition `legal_contracts` into state `renewed` | ✓ |
| `clm-negotiation:accepted_contract_risk_assessment` | workflow-gate (lifecycle) | Transition `contract_risk_assessments` into state `accepted` | ✓ |
| `clm-negotiation:resolved_negotiation_thread` | workflow-gate (lifecycle) | Transition `contract_negotiation_threads` into state `resolved` | ✓ |
| `clm-repository:view_all_contracts` | override (personal_content) | View all `legal_contracts` rows beyond row-scope | ✓ |
| `clm-repository:manage_all_contracts` | override (personal_content) | Manage all `legal_contracts` rows beyond row-scope | ✓ |

_Gates with no process: `clm-repository:amend_legal_contract`, `clm-negotiation:accepted_contract_risk_assessment`, `clm-negotiation:resolved_negotiation_thread`. No Accountable can hold them, so this blueprint does not support `raci`._

### 8.2 Business rules

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `contract_edit_scope` | `legal_contracts` | has_personal_content | Row-scope by default; override via `clm-repository:view_all_contracts` / `clm-repository:manage_all_contracts` |

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `CLM-NEGOTIATION`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `clm-negotiation_viewer` | `clm-negotiation:read` |
| `clm-negotiation_manager` | `clm-negotiation:manage` |
| `clm-negotiation_admin` | `clm-negotiation:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `clm-negotiation:admin` | `clm-negotiation:manage` |
| `clm-negotiation:manage` | `clm-negotiation:read` |
| `clm-negotiation:read` | `clm-repository:read_legal_contracts` |
| `clm-negotiation:read` | `clm-negotiation:read_negotiation_playbooks` |
| `clm-negotiation:read` | `clm-negotiation:read_contract_risk_assessments` |
| `clm-negotiation:read` | `clm-negotiation:read_contract_negotiation_threads` |
| `clm-negotiation:manage` | `clm-repository:write_legal_contracts` |
| `clm-repository:write_legal_contracts` | `clm-repository:read_legal_contracts` |
| `clm-negotiation:admin` | `clm-negotiation:write_negotiation_playbooks` |
| `clm-negotiation:write_negotiation_playbooks` | `clm-negotiation:read_negotiation_playbooks` |
| `clm-negotiation:manage` | `clm-negotiation:write_contract_risk_assessments` |
| `clm-negotiation:write_contract_risk_assessments` | `clm-negotiation:read_contract_risk_assessments` |
| `clm-negotiation:manage` | `clm-negotiation:write_contract_negotiation_threads` |
| `clm-negotiation:write_contract_negotiation_threads` | `clm-negotiation:read_contract_negotiation_threads` |
| `clm-negotiation:admin` | `clm-negotiation:approve_legal_contract` |
| `clm-negotiation:admin` | `clm-repository:execute_legal_contract` |
| `clm-negotiation:admin` | `clm-repository:amend_legal_contract` |
| `clm-negotiation:admin` | `clm-repository:terminate_legal_contract` |
| `clm-negotiation:admin` | `clm-renewal:renew_legal_contract` |
| `clm-negotiation:admin` | `clm-negotiation:accepted_contract_risk_assessment` |
| `clm-negotiation:admin` | `clm-negotiation:resolved_negotiation_thread` |
| `clm-negotiation:admin` | `clm-repository:view_all_contracts` |
| `clm-negotiation:admin` | `clm-repository:manage_all_contracts` |

**Processes wired:**

| process_key | process_name | PCF code | PCF ID | level | description |
| --- | --- | --- | --- | --- | --- |
| `negotiate_document_agreements` | Negotiate and document agreements/contracts | 12.4.9 | 11052 | 3 | Negotiating terms to reach a final draft of a contract that is acceptable to all parties. |
| `manage_contracts` | Manage contracts | 4.2.3.4 | 10291 | 4 | Keeping contracts up-to-date with routine evaluation. Maintain order and discipline with the contracts in order to avoid any loss of information and mishaps. |

**RACI realization:**

| actor | kind | raci | process_key | realization |
| --- | --- | --- | --- | --- |
| `LEGAL-COUNSEL` | persona | responsible | `negotiate_document_agreements` | the gated entities' write tier |
| `CONTRACT-OPS-MANAGER` | persona | accountable | `negotiate_document_agreements` | grant gates [clm-negotiation:approve_legal_contract] + the gated entities' write tier |
| `PROCUREMENT-CONTRACT-LIAISON` | persona | consulted | `negotiate_document_agreements` | advisory read grant |
| `CONTRACT-OPS-SPECIALIST` | persona | informed | `negotiate_document_agreements` | notify on trigger_events [legal_contract.approved] |
| `CONTRACT-OPS-SPECIALIST` | persona | responsible | `manage_contracts` | the gated entities' write tier |
| `CONTRACT-OPS-MANAGER` | persona | accountable | `manage_contracts` | grant gates [clm-repository:execute_legal_contract, clm-repository:terminate_legal_contract, clm-renewal:renew_legal_contract] + the gated entities' write tier |
| `LEGAL-COUNSEL` | persona | consulted | `manage_contracts` | advisory read grant |

### 9.2 Functional ownership and default grants

| responsibility | business function | default role | default tier |
| --- | --- | --- | --- |
| owner | Contract Operations | `admin` | `:admin` |
| contributor | Procurement | `manager` | `:manage` |
| contributor | Sales | `manager` | `:manage` |
