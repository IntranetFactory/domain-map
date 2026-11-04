---
artifact: semantic-blueprint
version: "3.1"
license: MIT
system_name: Brokerage Oversight and Commission Management
tagline: Give the broker oversight of money and compliance.
description: Run multi-agent commission splits with franchise overrides and per-agent caps, review transactions and disclosures for compliance before close, and keep trust and escrow accounts reconciled. Add broker-level MLS conformance review so the brokerage scales past informal supervision without losing control of the deal.
system_slug: re-brok-brokerage-ops
domain_modules:
  - re-brok-brokerage-ops
domain_code: RE-BROKERAGE
icon_name: key
related_modules: [re-brok-agent-ops]
persona: []
supports_raci: false
created_at: 2026-11-04
---

# Brokerage Oversight and Commission Management

## 1. Overview

Broker-level oversight on top of agent operations. Multi-agent commission-split engine with franchise overrides and per-agent caps, broker compliance review of transactions and disclosures, trust-account / escrow oversight, broker-level MLS conformance review. Only deployed when the brokerage has grown past informal-broker-supervision scale (typically 10+ agents).

## 2. Entity summary

| Name | data_object | Description |
| --- | --- | --- |
| Commission Splits | `commission_splits` | How a transaction's commission is divided across brokerages and then internal agents, used by accounting and tax reporting. |
| Disclosure Documents | `disclosure_documents` | State-mandated and brokerage-policy disclosure forms attached to transactions, such as agency, property condition, lead paint, and HOA documents. |
| Real Estate Transactions | `real_estate_transactions` | Real estate deals from accepted offer through close, with parties, terms, contingencies, escrow timeline, and document compliance. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef embedded_master fill:#fff4cc,stroke:#c79100,color:#5b4500;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  real_estate_transactions["Real Estate Transactions"]
  commission_splits["Commission Splits"]
  disclosure_documents["Disclosure Documents"]
  users["Users"]
  real_estate_transactions -->|"requires disclosures"| disclosure_documents
  real_estate_transactions -->|"produces commission splits"| commission_splits
  users -->|"represents seller on"| real_estate_transactions
  users -->|"represents buyer on"| real_estate_transactions
  users -->|"prepares"| disclosure_documents
  users -->|"earns commission via"| commission_splits
  users -->|"approves split"| commission_splits
  class real_estate_transactions embedded_master;
  class commission_splits master;
  class disclosure_documents embedded_master;
  class users platform_builtin;
```

## 3. Entities catalog

| # | data_object | catalog code | singular | plural | held_as | mastered in | mastered label | install_optional | personal_content | entity_type | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `commission_splits` | `commission_splits` | Commission Split | Commission Splits | master | - | - | - | - | operational_workflow | `:manage` | - |
| 2 | `disclosure_documents` | `disclosure_documents` | Disclosure Document | Disclosure Documents | embedded_master | `re-brok-agent-ops` | Real Estate Agent Operations | - | yes | operational_workflow | `:manage` | - |
| 3 | `real_estate_transactions` | `real_estate_transactions` | Real Estate Transaction | Real Estate Transactions | embedded_master | `re-brok-agent-ops` | Real Estate Agent Operations | - | yes | operational_workflow | `:manage` | - |

## 4. Aliases and industry synonyms

| data_object | alias | alias_type | preferred? | industry | notes |
| --- | --- | --- | --- | --- | --- |
| `real_estate_transactions` | Closing | industry_term | - | Real Estate | - |
| `commission_splits` | Co-Op Commission | industry_term | - | Real Estate | - |
| `real_estate_transactions` | Escrow | industry_term | - | Real Estate | - |
| `disclosure_documents` | Seller Disclosures | industry_term | - | Real Estate | - |
| `disclosure_documents` | TDS | industry_term | - | Real Estate | - |

## 5. Relationships

_`field_required` applies only when both entities are installed. It never makes an entity required._

### 5.1 Relationships between entities in this blueprint

| from | verb | to | cardinality | kind | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `real_estate_transactions` | requires disclosures | `disclosure_documents` | one_to_many | composition | yes | cascade | parent | - |
| `real_estate_transactions` | produces commission splits | `commission_splits` | one_to_many | composition | yes | cascade | parent | - |

### 5.2 Relationships to platform built-ins (`users`)

| from | verb | to | cardinality | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `users` | represents seller on | `real_estate_transactions` | one_to_many | yes | restrict | reference | - |
| `users` | represents buyer on | `real_estate_transactions` | one_to_many | no | clear | reference | - |
| `users` | prepares | `disclosure_documents` | one_to_many | yes | restrict | reference | - |
| `users` | earns commission via | `commission_splits` | one_to_many | yes | restrict | reference | - |
| `users` | approves split | `commission_splits` | one_to_many | yes | restrict | reference | - |

### 5.3 Relationships to entities outside this blueprint

_External entities are optional: this blueprint never installs them. If one exists at install, the relationship is proposed. A many-to-many relationship is listed under outgoing and proposed as a new junction table._

#### 5.3a Outgoing relationships: this blueprint's entity points to the external entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `real_estate_listings` | generates | `real_estate_transactions` | one_to_many | yes | - |

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

| data_object | held_as | install_optional | catalog owner(s) | slice notes |
| --- | --- | --- | --- | --- |
| `disclosure_documents` | embedded_master | - | RE-BROK-AGENT-OPS (RE-BROKERAGE) | - |
| `real_estate_transactions` | embedded_master | - | RE-BROK-AGENT-OPS (RE-BROKERAGE) | - |

## 7. Lifecycle states

### `commission_splits` (Commission Split)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `calculated` | ✓ | - | _(always)_ | - | - | - | Split row auto-derived from transaction close (listing-side vs buyer-side splits, agent shares, franchise overrides). Pending review. |
| 2 | `reviewed` | - | - | `RE-BROK-BROKERAGE-OPS` | ✓ | - | `re-brok-brokerage-ops:review_commission_split` | Broker reviewed split accuracy against the listing agreement and brokerage policy; flagged any anomalies. |
| 3 | `disputed` | - | - | `RE-BROK-BROKERAGE-OPS` | ✓ | - | `re-brok-brokerage-ops:dispute_commission_split` | One participating agent contests the calculated split. Holds disbursement pending resolution; may return to reviewed after adjustment. |
| 4 | `approved` | - | - | `RE-BROK-BROKERAGE-OPS` | ✓ | - | `re-brok-brokerage-ops:approve_commission_split` | Broker approved the split for payment. Ready for disbursement. |
| 5 | `paid` | - | ✓ | `RE-BROK-BROKERAGE-OPS` | ✓ | - | `re-brok-brokerage-ops:disburse_commission` | Commission funds disbursed to participating agents and franchise; ledger entry recorded. |

### `disclosure_documents` (Disclosure Document)

_This scope holds `disclosure_documents` as **embedded_master**; the canonical state machine is owned by `RE-BROK-AGENT-OPS`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `drafted` | ✓ | - | _(always)_ | - | - | - | Disclosure generated from a state-specific template (agency disclosure, lead-paint, natural-hazards, transfer disclosure). Not yet delivered. |
| 2 | `delivered` | - | - | `RE-BROK-AGENT-OPS` | ✓ | - | `re-brok-agent-ops:deliver_disclosure` | Disclosure sent to recipient (buyer or seller); recipient acknowledgment pending. |
| 3 | `acknowledged` | - | ✓ | `RE-BROK-AGENT-OPS` | ✓ | - | `re-brok-agent-ops:acknowledge_disclosure` | Recipient signed acknowledgment recorded (typically via eSign callback). Disclosure satisfies the compliance requirement on the transaction. |
| 4 | `rejected` | - | ✓ | _(always)_ | - | - | - | Recipient refused to acknowledge or signed under dispute. Typically requires the transaction to address the rejection before progressing. |

### `real_estate_transactions` (Real Estate Transaction)

_This scope holds `real_estate_transactions` as **embedded_master**; the canonical state machine is owned by `RE-BROK-AGENT-OPS`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `opened` | ✓ | - | _(always)_ | - | - | - | Accepted offer created the transaction; buyer/seller, listing reference, offer price, escrow agent, target close date captured. |
| 2 | `inspection` | - | - | `RE-BROK-AGENT-OPS` | ✓ | - | `re-brok-agent-ops:schedule_inspection` | Inspection period active; structural / pest / specialty inspections scheduled or in progress. |
| 3 | `financing` | - | - | `RE-BROK-AGENT-OPS` | ✓ | - | `re-brok-agent-ops:submit_financing` | Buyer's loan application in underwriting; appraisal pending; financing contingency open. |
| 4 | `contingencies_cleared` | - | - | `RE-BROK-AGENT-OPS` | ✓ | - | `re-brok-agent-ops:clear_contingencies` | All contingencies (inspection, financing, appraisal, title) satisfied or waived. Transaction ready for broker compliance review. |
| 5 | `compliance_review` | - | - | `RE-BROK-BROKERAGE-OPS` | ✓ | - | `re-brok-brokerage-ops:submit_for_compliance_review` | Broker / transaction coordinator reviewing transaction file for compliance (disclosure completeness, signature audit, trust-account accounting). Only realized when BROKERAGE-OPS module is deployed. |
| 6 | `cleared_to_close` | - | - | `RE-BROK-BROKERAGE-OPS` | ✓ | - | `re-brok-brokerage-ops:approve_for_closing` | Broker signed off; closing date and location confirmed. Only realized when BROKERAGE-OPS module is deployed. |
| 7 | `closed` | - | ✓ | `RE-BROK-AGENT-OPS` | ✓ | - | `re-brok-agent-ops:close_transaction` | Deed recorded, funds disbursed via escrow; transaction complete. Commission splits become payable; downstream domains notified. |
| 8 | `canceled` | - | ✓ | `RE-BROK-AGENT-OPS` | ✓ | - | `re-brok-agent-ops:cancel_transaction` | Transaction fell through (failed inspection beyond repair, financing denied, mutual cancellation, contingency invocation). Listing typically returns to active. |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `re-brok-brokerage-ops:read` | baseline-read | Read access to every entity in the module | ✓ |
| `re-brok-brokerage-ops:manage` | baseline-manage | Edit operational records | ✓ |
| `re-brok-brokerage-ops:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `re-brok-agent-ops:read_real_estate_transactions` | entity-read | Read Real Estate Transactions | ✓ |
| `re-brok-agent-ops:write_real_estate_transactions` | entity-write | Write Real Estate Transactions | ✓ |
| `re-brok-brokerage-ops:read_commission_splits` | entity-read | Read Commission Splits | ✓ |
| `re-brok-brokerage-ops:write_commission_splits` | entity-write | Write Commission Splits | ✓ |
| `re-brok-agent-ops:read_disclosure_documents` | entity-read | Read Disclosure Documents | ✓ |
| `re-brok-agent-ops:write_disclosure_documents` | entity-write | Write Disclosure Documents | ✓ |
| `re-brok-agent-ops:schedule_inspection` | workflow-gate (lifecycle) | Transition `real_estate_transactions` into state `inspection` | ✓ |
| `re-brok-agent-ops:submit_financing` | workflow-gate (lifecycle) | Transition `real_estate_transactions` into state `financing` | ✓ |
| `re-brok-agent-ops:clear_contingencies` | workflow-gate (lifecycle) | Transition `real_estate_transactions` into state `contingencies_cleared` | ✓ |
| `re-brok-brokerage-ops:submit_for_compliance_review` | workflow-gate (lifecycle) | Transition `real_estate_transactions` into state `compliance_review` | ✓ |
| `re-brok-brokerage-ops:approve_for_closing` | workflow-gate (lifecycle) | Transition `real_estate_transactions` into state `cleared_to_close` | ✓ |
| `re-brok-agent-ops:close_transaction` | workflow-gate (lifecycle) | Transition `real_estate_transactions` into state `closed` | ✓ |
| `re-brok-agent-ops:cancel_transaction` | workflow-gate (lifecycle) | Transition `real_estate_transactions` into state `canceled` | ✓ |
| `re-brok-brokerage-ops:review_commission_split` | workflow-gate (lifecycle) | Transition `commission_splits` into state `reviewed` | ✓ |
| `re-brok-brokerage-ops:dispute_commission_split` | workflow-gate (lifecycle) | Transition `commission_splits` into state `disputed` | ✓ |
| `re-brok-brokerage-ops:approve_commission_split` | workflow-gate (lifecycle) | Transition `commission_splits` into state `approved` | ✓ |
| `re-brok-brokerage-ops:disburse_commission` | workflow-gate (lifecycle) | Transition `commission_splits` into state `paid` | ✓ |
| `re-brok-agent-ops:deliver_disclosure` | workflow-gate (lifecycle) | Transition `disclosure_documents` into state `delivered` | ✓ |
| `re-brok-agent-ops:acknowledge_disclosure` | workflow-gate (lifecycle) | Transition `disclosure_documents` into state `acknowledged` | ✓ |
| `re-brok-agent-ops:view_all_real_estate_transactions` | override (personal_content) | View all `real_estate_transactions` rows beyond row-scope | ✓ |
| `re-brok-agent-ops:manage_all_real_estate_transactions` | override (personal_content) | Manage all `real_estate_transactions` rows beyond row-scope | ✓ |
| `re-brok-agent-ops:view_all_disclosure_documents` | override (personal_content) | View all `disclosure_documents` rows beyond row-scope | ✓ |
| `re-brok-agent-ops:manage_all_disclosure_documents` | override (personal_content) | Manage all `disclosure_documents` rows beyond row-scope | ✓ |

_Gates with no process: `re-brok-agent-ops:schedule_inspection`, `re-brok-agent-ops:submit_financing`, `re-brok-agent-ops:clear_contingencies`, `re-brok-brokerage-ops:submit_for_compliance_review`, `re-brok-brokerage-ops:approve_for_closing`, `re-brok-agent-ops:close_transaction`, `re-brok-agent-ops:cancel_transaction`, `re-brok-brokerage-ops:review_commission_split`, `re-brok-brokerage-ops:dispute_commission_split`, `re-brok-brokerage-ops:approve_commission_split`, `re-brok-brokerage-ops:disburse_commission`, `re-brok-agent-ops:deliver_disclosure`, `re-brok-agent-ops:acknowledge_disclosure`. No Accountable can hold them, so this blueprint does not support `raci`._

### 8.2 Business rules

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `real_estate_transaction_edit_scope` | `real_estate_transactions` | has_personal_content | Row-scope by default; override via `re-brok-agent-ops:view_all_real_estate_transactions` / `re-brok-agent-ops:manage_all_real_estate_transactions` |
| `disclosure_document_edit_scope` | `disclosure_documents` | has_personal_content | Row-scope by default; override via `re-brok-agent-ops:view_all_disclosure_documents` / `re-brok-agent-ops:manage_all_disclosure_documents` |

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `RE-BROK-BROKERAGE-OPS`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `re-brok-brokerage-ops_viewer` | `re-brok-brokerage-ops:read` |
| `re-brok-brokerage-ops_manager` | `re-brok-brokerage-ops:manage` |
| `re-brok-brokerage-ops_admin` | `re-brok-brokerage-ops:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `re-brok-brokerage-ops:admin` | `re-brok-brokerage-ops:manage` |
| `re-brok-brokerage-ops:manage` | `re-brok-brokerage-ops:read` |
| `re-brok-brokerage-ops:read` | `re-brok-agent-ops:read_real_estate_transactions` |
| `re-brok-brokerage-ops:read` | `re-brok-brokerage-ops:read_commission_splits` |
| `re-brok-brokerage-ops:read` | `re-brok-agent-ops:read_disclosure_documents` |
| `re-brok-brokerage-ops:manage` | `re-brok-agent-ops:write_real_estate_transactions` |
| `re-brok-agent-ops:write_real_estate_transactions` | `re-brok-agent-ops:read_real_estate_transactions` |
| `re-brok-brokerage-ops:manage` | `re-brok-brokerage-ops:write_commission_splits` |
| `re-brok-brokerage-ops:write_commission_splits` | `re-brok-brokerage-ops:read_commission_splits` |
| `re-brok-brokerage-ops:manage` | `re-brok-agent-ops:write_disclosure_documents` |
| `re-brok-agent-ops:write_disclosure_documents` | `re-brok-agent-ops:read_disclosure_documents` |
| `re-brok-brokerage-ops:admin` | `re-brok-agent-ops:schedule_inspection` |
| `re-brok-brokerage-ops:admin` | `re-brok-agent-ops:submit_financing` |
| `re-brok-brokerage-ops:admin` | `re-brok-agent-ops:clear_contingencies` |
| `re-brok-brokerage-ops:admin` | `re-brok-brokerage-ops:submit_for_compliance_review` |
| `re-brok-brokerage-ops:admin` | `re-brok-brokerage-ops:approve_for_closing` |
| `re-brok-brokerage-ops:admin` | `re-brok-agent-ops:close_transaction` |
| `re-brok-brokerage-ops:admin` | `re-brok-agent-ops:cancel_transaction` |
| `re-brok-brokerage-ops:admin` | `re-brok-brokerage-ops:review_commission_split` |
| `re-brok-brokerage-ops:admin` | `re-brok-brokerage-ops:dispute_commission_split` |
| `re-brok-brokerage-ops:admin` | `re-brok-brokerage-ops:approve_commission_split` |
| `re-brok-brokerage-ops:admin` | `re-brok-brokerage-ops:disburse_commission` |
| `re-brok-brokerage-ops:admin` | `re-brok-agent-ops:deliver_disclosure` |
| `re-brok-brokerage-ops:admin` | `re-brok-agent-ops:acknowledge_disclosure` |
| `re-brok-brokerage-ops:admin` | `re-brok-agent-ops:view_all_real_estate_transactions` |
| `re-brok-brokerage-ops:admin` | `re-brok-agent-ops:manage_all_real_estate_transactions` |
| `re-brok-brokerage-ops:admin` | `re-brok-agent-ops:view_all_disclosure_documents` |
| `re-brok-brokerage-ops:admin` | `re-brok-agent-ops:manage_all_disclosure_documents` |

**RACI realization:**

_(none: no process_raci assignments wired to this module's gated processes yet)_

### 9.2 Functional ownership and default grants

| responsibility | business function | default role | default tier |
| --- | --- | --- | --- |
| owner | Sales | `admin` | `:admin` |
| contributor | Marketing | `manager` | `:manage` |
| consumer | Accounting | `viewer` | `:read` |
