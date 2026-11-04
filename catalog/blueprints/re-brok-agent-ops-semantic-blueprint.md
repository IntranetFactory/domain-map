---
artifact: semantic-blueprint
version: "3.1"
license: MIT
system_name: Real Estate Agent Operations
tagline: Work every deal from lead to close in one place.
description: Capture leads and turn them into listings, syndicate to the MLS, and schedule showings with access windows and follow-ups. Drive each transaction from accepted offer through inspection, financing, and contingencies to a clean close, with buyer and seller disclosures tracked at every step. The deployable unit for solo agents and small firms.
system_slug: re-brok-agent-ops
domain_modules:
  - re-brok-agent-ops
domain_code: RE-BROKERAGE
icon_name: key
related_modules: [crm-acct-mgt, crm-activity, crm-lead-mgt, ma-campaign-authoring, ma-lead-scoring, re-brok-brokerage-ops, re-invest-portfolio-val, real-estate-agent]
persona: []
supports_raci: false
created_at: 2026-11-04
---

# Real Estate Agent Operations

## 1. Overview

Agent-facing workflow from lead capture through closing. Lead nurture (writes back into CRM contributor flow), listing creation and MLS syndication, tour scheduling and execution, transaction management (offer to escrow to contingencies to close), and buyer/seller disclosure handling. The deployable unit for solo agents and small firms; agents in larger brokerages work here while broker oversight runs in BROKERAGE-OPS.

## 2. Entity summary

| Name | data_object | Description |
| --- | --- | --- |
| Disclosure Documents | `disclosure_documents` | State-mandated and brokerage-policy disclosure forms attached to transactions, such as agency, property condition, lead paint, and HOA documents. |
| Real Estate Listings | `real_estate_listings` | Properties offered for sale or rent, with pricing, photos, descriptions, agent representation, and status from active to sold. |
| Real Estate Transactions | `real_estate_transactions` | Real estate deals from accepted offer through close, with parties, terms, contingencies, escrow timeline, and document compliance. |
| Tour Appointments | `tour_appointments` | Scheduled property showings with lock-box codes, access windows, agent attendance, and follow-up tracking. |
| Commission Splits | `commission_splits` | How a transaction's commission is divided across brokerages and then internal agents, used by accounting and tax reporting. |
| Contacts | `crm_contacts` | People at customer or prospect organizations, carrying title, contact details, decision-maker flag, preferred channel, and opt-in state. |
| Leads | `crm_leads` | Prospects captured before qualification, tracking source, score, status, assigned rep, and the contact and account they would convert into. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef embedded_master fill:#fff4cc,stroke:#c79100,color:#5b4500;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  crm_contacts["Contacts"]
  crm_leads["Leads"]
  real_estate_listings["Real Estate Listings"]
  real_estate_transactions["Real Estate Transactions"]
  commission_splits["Commission Splits"]
  tour_appointments["Tour Appointments"]
  disclosure_documents["Disclosure Documents"]
  users["Users"]
  crm_contacts -->|"converted_from_lead"| crm_leads
  real_estate_listings -->|"generates"| real_estate_transactions
  real_estate_listings -->|"has tours"| tour_appointments
  real_estate_transactions -->|"requires disclosures"| disclosure_documents
  real_estate_transactions -->|"produces commission splits"| commission_splits
  users -->|"owns"| crm_leads
  users -->|"owns"| crm_contacts
  users -->|"lists"| real_estate_listings
  users -->|"shows"| tour_appointments
  users -->|"represents seller on"| real_estate_transactions
  users -->|"represents buyer on"| real_estate_transactions
  users -->|"prepares"| disclosure_documents
  users -->|"earns commission via"| commission_splits
  users -->|"approves split"| commission_splits
  class crm_contacts embedded_master;
  class crm_leads embedded_master;
  class real_estate_listings master;
  class real_estate_transactions master;
  class commission_splits embedded_master;
  class tour_appointments master;
  class disclosure_documents master;
  class users platform_builtin;
  style commission_splits stroke-dasharray:5 5;
  style disclosure_documents stroke-dasharray:5 5;
```

## 3. Entities catalog

| # | data_object | catalog code | singular | plural | held_as | mastered in | mastered label | install_optional | personal_content | entity_type | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `disclosure_documents` | `disclosure_documents` | Disclosure Document | Disclosure Documents | master | - | - | yes | yes | operational_workflow | `:manage` | - |
| 2 | `real_estate_listings` | `real_estate_listings` | Real Estate Listing | Real Estate Listings | master | - | - | - | yes | operational_workflow | `:manage` | - |
| 3 | `real_estate_transactions` | `real_estate_transactions` | Real Estate Transaction | Real Estate Transactions | master | - | - | - | yes | operational_workflow | `:manage` | - |
| 4 | `tour_appointments` | `tour_appointments` | Tour Appointment | Tour Appointments | master | - | - | - | yes | operational_workflow | `:manage` | - |
| 5 | `commission_splits` | `commission_splits` | Commission Split | Commission Splits | embedded_master | `re-brok-brokerage-ops` | Brokerage Oversight and Commission Management | yes | - | operational_workflow | `:manage` | - |
| 6 | `crm_contacts` | `crm_contacts` | Contact | Contacts | embedded_master | `crm-acct-mgt` | Account and Contact Management | - | yes | operational_record | `:manage` | - |
| 7 | `crm_leads` | `crm_leads` | Lead | Leads | embedded_master | `crm-lead-mgt` | Lead Capture and Qualification | - | yes | operational_workflow | `:manage` | - |

## 4. Aliases and industry synonyms

| data_object | alias | alias_type | preferred? | industry | notes |
| --- | --- | --- | --- | --- | --- |
| `real_estate_transactions` | Closing | industry_term | - | Real Estate | - |
| `commission_splits` | Co-Op Commission | industry_term | - | Real Estate | - |
| `real_estate_transactions` | Escrow | industry_term | - | Real Estate | - |
| `real_estate_listings` | MLS Listing | industry_term | - | Real Estate | - |
| `tour_appointments` | Open House Appointment | industry_term | - | Real Estate | - |
| `disclosure_documents` | Seller Disclosures | industry_term | - | Real Estate | - |
| `tour_appointments` | Showing | industry_term | - | Real Estate | - |
| `disclosure_documents` | TDS | industry_term | - | Real Estate | - |

## 5. Relationships

_`field_required` applies only when both entities are installed. It never makes an entity required._

### 5.1 Relationships between entities in this blueprint

| from | verb | to | cardinality | kind | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `crm_contacts` | converted_from_lead | `crm_leads` | one_to_many | reference | no | clear | reference | - |
| `real_estate_listings` | generates | `real_estate_transactions` | one_to_many | reference | yes | restrict | reference | - |
| `real_estate_listings` | has tours | `tour_appointments` | one_to_many | reference | yes | restrict | reference | - |
| `real_estate_transactions` | requires disclosures | `disclosure_documents` | one_to_many | composition | yes | cascade | parent | - |
| `real_estate_transactions` | produces commission splits | `commission_splits` | one_to_many | composition | yes | cascade | parent | - |

### 5.2 Relationships to platform built-ins (`users`)

| from | verb | to | cardinality | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `users` | owns | `crm_leads` | one_to_many | yes | restrict | reference | - |
| `users` | owns | `crm_contacts` | one_to_many | no | clear | reference | - |
| `users` | lists | `real_estate_listings` | one_to_many | yes | restrict | reference | - |
| `users` | shows | `tour_appointments` | one_to_many | yes | restrict | reference | - |
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
| `customers` | has_contacts | `crm_contacts` | one_to_many | no | - |
| `customers` | converted_from_lead | `crm_leads` | one_to_many | no | - |
| `crm_opportunities` | converted_from_lead | `crm_leads` | one_to_many | no | - |
| `crm_opportunities` | involves_contacts | `crm_contacts` | many_to_many | - | - |
| `contact_records` | enriches | `crm_contacts` | one_to_many | no | - |

#### 5.3b Incoming relationships: the external entity points to this blueprint's entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `crm_contacts` | has_activities | `sales_activities` | one_to_many | no | - |
| `crm_leads` | has_activities | `sales_activities` | one_to_many | no | - |

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
| `commission_splits` | embedded_master | yes | RE-BROK-BROKERAGE-OPS (RE-BROKERAGE) | - |
| `crm_contacts` | embedded_master | - | CRM-ACCT-MGT (CRM) | - |
| `crm_leads` | embedded_master | - | CRM-LEAD-MGT (CRM) | - |

## 7. Lifecycle states

### `commission_splits` (Commission Split)

_This scope holds `commission_splits` as **embedded_master**; the canonical state machine is owned by `RE-BROK-BROKERAGE-OPS`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `calculated` | ✓ | - | _(always)_ | - | - | - | Split row auto-derived from transaction close (listing-side vs buyer-side splits, agent shares, franchise overrides). Pending review. |
| 2 | `reviewed` | - | - | `RE-BROK-BROKERAGE-OPS` | ✓ | - | `re-brok-brokerage-ops:review_commission_split` | Broker reviewed split accuracy against the listing agreement and brokerage policy; flagged any anomalies. |
| 3 | `disputed` | - | - | `RE-BROK-BROKERAGE-OPS` | ✓ | - | `re-brok-brokerage-ops:dispute_commission_split` | One participating agent contests the calculated split. Holds disbursement pending resolution; may return to reviewed after adjustment. |
| 4 | `approved` | - | - | `RE-BROK-BROKERAGE-OPS` | ✓ | - | `re-brok-brokerage-ops:approve_commission_split` | Broker approved the split for payment. Ready for disbursement. |
| 5 | `paid` | - | ✓ | `RE-BROK-BROKERAGE-OPS` | ✓ | - | `re-brok-brokerage-ops:disburse_commission` | Commission funds disbursed to participating agents and franchise; ledger entry recorded. |

### `crm_contacts` (Contact)

_This scope holds `crm_contacts` as **embedded_master**; the canonical state machine is owned by `CRM-ACCT-MGT`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `active` | ✓ | - | _(always)_ | - | - | - | Contact is current and reachable. |
| 2 | `inactive` | - | - | _(always)_ | - | - | - | Contact is no longer engaged but record retained. |
| 3 | `unsubscribed` | - | ✓ | _(always)_ | - | - | - | Contact has opted out of all channels. |

### `crm_leads` (Lead)

_This scope holds `crm_leads` as **embedded_master**; the canonical state machine is owned by `CRM-LEAD-MGT`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `new` | ✓ | - | _(always)_ | - | - | - | Freshly captured lead awaiting triage. |
| 2 | `working` | - | - | _(always)_ | - | - | - | Sales rep is actively engaging the lead. |
| 3 | `qualified` | - | - | _(always)_ | - | - | - | Lead meets qualification criteria and is ready to convert. |
| 4 | `converted` | - | ✓ | `CRM-LEAD-MGT` | ✓ | - | `crm-lead-mgt:convert_lead` | Lead has been converted into a contact, account, and opportunity. |
| 5 | `disqualified` | - | ✓ | _(always)_ | - | - | - | Lead does not meet criteria; closed without conversion. |

### `disclosure_documents` (Disclosure Document)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `drafted` | ✓ | - | _(always)_ | - | - | - | Disclosure generated from a state-specific template (agency disclosure, lead-paint, natural-hazards, transfer disclosure). Not yet delivered. |
| 2 | `delivered` | - | - | `RE-BROK-AGENT-OPS` | ✓ | - | `re-brok-agent-ops:deliver_disclosure` | Disclosure sent to recipient (buyer or seller); recipient acknowledgment pending. |
| 3 | `acknowledged` | - | ✓ | `RE-BROK-AGENT-OPS` | ✓ | - | `re-brok-agent-ops:acknowledge_disclosure` | Recipient signed acknowledgment recorded (typically via eSign callback). Disclosure satisfies the compliance requirement on the transaction. |
| 4 | `rejected` | - | ✓ | _(always)_ | - | - | - | Recipient refused to acknowledge or signed under dispute. Typically requires the transaction to address the rejection before progressing. |

### `real_estate_listings` (Real Estate Listing)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | _(always)_ | - | - | - | Listing is being prepared (photos, copy, pricing); not yet published to MLS. |
| 2 | `active` | - | - | `RE-BROK-AGENT-OPS` | ✓ | - | `re-brok-agent-ops:activate_listing` | Listing is published to the MLS and accepting offers. |
| 3 | `under_contract` | - | - | `RE-BROK-AGENT-OPS` | ✓ | - | `re-brok-agent-ops:mark_under_contract` | Offer accepted; a real_estate_transaction has been opened. Listing remains visible on MLS as 'pending' but not accepting new offers. |
| 4 | `sold` | - | ✓ | `RE-BROK-AGENT-OPS` | ✓ | - | `re-brok-agent-ops:close_listing` | Transaction closed; listing terminated as a sale. Triggers downstream events to property-management, CRE, and investment systems. |
| 5 | `withdrawn` | - | ✓ | `RE-BROK-AGENT-OPS` | ✓ | - | `re-brok-agent-ops:withdraw_listing` | Listing pulled from the market without a sale (seller decision, expired listing agreement before contract, market reasons). |
| 6 | `expired` | - | ✓ | _(always)_ | - | - | - | Listing agreement reached its end date without a sale or active renewal. No explicit user action; system marks at expiration. |

### `real_estate_transactions` (Real Estate Transaction)

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

### `tour_appointments` (Tour Appointment)

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `scheduled` | ✓ | - | _(always)_ | - | - | - | Tour booked with prospect; access arrangements (lockbox code, listing-agent attendance) pending confirmation. |
| 2 | `confirmed` | - | - | `RE-BROK-AGENT-OPS` | ✓ | - | `re-brok-agent-ops:confirm_tour` | Prospect confirmed attendance; access arrangements finalized. |
| 3 | `completed` | - | ✓ | `RE-BROK-AGENT-OPS` | ✓ | - | `re-brok-agent-ops:complete_tour` | Tour took place; agent recorded notes and any buyer-feedback signals. |
| 4 | `canceled` | - | ✓ | `RE-BROK-AGENT-OPS` | ✓ | - | `re-brok-agent-ops:cancel_tour` | Tour canceled by either party before it took place. |
| 5 | `no_show` | - | ✓ | _(always)_ | - | - | - | Prospect did not appear at the scheduled time. No explicit cancellation; agent marks after the fact. |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `re-brok-agent-ops:read` | baseline-read | Read access to every entity in the module | ✓ |
| `re-brok-agent-ops:manage` | baseline-manage | Edit operational records | ✓ |
| `re-brok-agent-ops:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `crm-acct-mgt:read_crm_contacts` | entity-read | Read Contacts | ✓ |
| `crm-acct-mgt:write_crm_contacts` | entity-write | Write Contacts | ✓ |
| `crm-lead-mgt:read_crm_leads` | entity-read | Read Leads | ✓ |
| `crm-lead-mgt:write_crm_leads` | entity-write | Write Leads | ✓ |
| `re-brok-agent-ops:read_real_estate_listings` | entity-read | Read Real Estate Listings | ✓ |
| `re-brok-agent-ops:write_real_estate_listings` | entity-write | Write Real Estate Listings | ✓ |
| `re-brok-agent-ops:read_real_estate_transactions` | entity-read | Read Real Estate Transactions | ✓ |
| `re-brok-agent-ops:write_real_estate_transactions` | entity-write | Write Real Estate Transactions | ✓ |
| `re-brok-brokerage-ops:read_commission_splits` | entity-read | Read Commission Splits | ✓ |
| `re-brok-brokerage-ops:write_commission_splits` | entity-write | Write Commission Splits | ✓ |
| `re-brok-agent-ops:read_tour_appointments` | entity-read | Read Tour Appointments | ✓ |
| `re-brok-agent-ops:write_tour_appointments` | entity-write | Write Tour Appointments | ✓ |
| `re-brok-agent-ops:read_disclosure_documents` | entity-read | Read Disclosure Documents | ✓ |
| `re-brok-agent-ops:write_disclosure_documents` | entity-write | Write Disclosure Documents | ✓ |
| `crm-lead-mgt:convert_lead` | workflow-gate (lifecycle) | Transition `crm_leads` into state `converted` | ✓ |
| `re-brok-agent-ops:activate_listing` | workflow-gate (lifecycle) | Transition `real_estate_listings` into state `active` | ✓ |
| `re-brok-agent-ops:mark_under_contract` | workflow-gate (lifecycle) | Transition `real_estate_listings` into state `under_contract` | ✓ |
| `re-brok-agent-ops:close_listing` | workflow-gate (lifecycle) | Transition `real_estate_listings` into state `sold` | ✓ |
| `re-brok-agent-ops:withdraw_listing` | workflow-gate (lifecycle) | Transition `real_estate_listings` into state `withdrawn` | ✓ |
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
| `re-brok-agent-ops:confirm_tour` | workflow-gate (lifecycle) | Transition `tour_appointments` into state `confirmed` | ✓ |
| `re-brok-agent-ops:complete_tour` | workflow-gate (lifecycle) | Transition `tour_appointments` into state `completed` | ✓ |
| `re-brok-agent-ops:cancel_tour` | workflow-gate (lifecycle) | Transition `tour_appointments` into state `canceled` | ✓ |
| `re-brok-agent-ops:deliver_disclosure` | workflow-gate (lifecycle) | Transition `disclosure_documents` into state `delivered` | ✓ |
| `re-brok-agent-ops:acknowledge_disclosure` | workflow-gate (lifecycle) | Transition `disclosure_documents` into state `acknowledged` | ✓ |
| `crm-acct-mgt:view_all_contacts` | override (personal_content) | View all `crm_contacts` rows beyond row-scope | ✓ |
| `crm-acct-mgt:manage_all_contacts` | override (personal_content) | Manage all `crm_contacts` rows beyond row-scope | ✓ |
| `crm-lead-mgt:view_all_leads` | override (personal_content) | View all `crm_leads` rows beyond row-scope | ✓ |
| `crm-lead-mgt:manage_all_leads` | override (personal_content) | Manage all `crm_leads` rows beyond row-scope | ✓ |
| `re-brok-agent-ops:view_all_real_estate_listings` | override (personal_content) | View all `real_estate_listings` rows beyond row-scope | ✓ |
| `re-brok-agent-ops:manage_all_real_estate_listings` | override (personal_content) | Manage all `real_estate_listings` rows beyond row-scope | ✓ |
| `re-brok-agent-ops:view_all_real_estate_transactions` | override (personal_content) | View all `real_estate_transactions` rows beyond row-scope | ✓ |
| `re-brok-agent-ops:manage_all_real_estate_transactions` | override (personal_content) | Manage all `real_estate_transactions` rows beyond row-scope | ✓ |
| `re-brok-agent-ops:view_all_tour_appointments` | override (personal_content) | View all `tour_appointments` rows beyond row-scope | ✓ |
| `re-brok-agent-ops:manage_all_tour_appointments` | override (personal_content) | Manage all `tour_appointments` rows beyond row-scope | ✓ |
| `re-brok-agent-ops:view_all_disclosure_documents` | override (personal_content) | View all `disclosure_documents` rows beyond row-scope | ✓ |
| `re-brok-agent-ops:manage_all_disclosure_documents` | override (personal_content) | Manage all `disclosure_documents` rows beyond row-scope | ✓ |

_Gates with no process: `crm-lead-mgt:convert_lead`, `re-brok-agent-ops:activate_listing`, `re-brok-agent-ops:mark_under_contract`, `re-brok-agent-ops:close_listing`, `re-brok-agent-ops:withdraw_listing`, `re-brok-agent-ops:schedule_inspection`, `re-brok-agent-ops:submit_financing`, `re-brok-agent-ops:clear_contingencies`, `re-brok-brokerage-ops:submit_for_compliance_review`, `re-brok-brokerage-ops:approve_for_closing`, `re-brok-agent-ops:close_transaction`, `re-brok-agent-ops:cancel_transaction`, `re-brok-brokerage-ops:review_commission_split`, `re-brok-brokerage-ops:dispute_commission_split`, `re-brok-brokerage-ops:approve_commission_split`, `re-brok-brokerage-ops:disburse_commission`, `re-brok-agent-ops:confirm_tour`, `re-brok-agent-ops:complete_tour`, `re-brok-agent-ops:cancel_tour`, `re-brok-agent-ops:deliver_disclosure`, `re-brok-agent-ops:acknowledge_disclosure`. No Accountable can hold them, so this blueprint does not support `raci`._

### 8.2 Business rules

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `contact_edit_scope` | `crm_contacts` | has_personal_content | Row-scope by default; override via `crm-acct-mgt:view_all_contacts` / `crm-acct-mgt:manage_all_contacts` |
| `lead_edit_scope` | `crm_leads` | has_personal_content | Row-scope by default; override via `crm-lead-mgt:view_all_leads` / `crm-lead-mgt:manage_all_leads` |
| `real_estate_listing_edit_scope` | `real_estate_listings` | has_personal_content | Row-scope by default; override via `re-brok-agent-ops:view_all_real_estate_listings` / `re-brok-agent-ops:manage_all_real_estate_listings` |
| `real_estate_transaction_edit_scope` | `real_estate_transactions` | has_personal_content | Row-scope by default; override via `re-brok-agent-ops:view_all_real_estate_transactions` / `re-brok-agent-ops:manage_all_real_estate_transactions` |
| `tour_appointment_edit_scope` | `tour_appointments` | has_personal_content | Row-scope by default; override via `re-brok-agent-ops:view_all_tour_appointments` / `re-brok-agent-ops:manage_all_tour_appointments` |
| `disclosure_document_edit_scope` | `disclosure_documents` | has_personal_content | Row-scope by default; override via `re-brok-agent-ops:view_all_disclosure_documents` / `re-brok-agent-ops:manage_all_disclosure_documents` |

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `RE-BROK-AGENT-OPS`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `re-brok-agent-ops_viewer` | `re-brok-agent-ops:read` |
| `re-brok-agent-ops_manager` | `re-brok-agent-ops:manage` |
| `re-brok-agent-ops_admin` | `re-brok-agent-ops:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:manage` |
| `re-brok-agent-ops:manage` | `re-brok-agent-ops:read` |
| `re-brok-agent-ops:read` | `crm-acct-mgt:read_crm_contacts` |
| `re-brok-agent-ops:read` | `crm-lead-mgt:read_crm_leads` |
| `re-brok-agent-ops:read` | `re-brok-agent-ops:read_real_estate_listings` |
| `re-brok-agent-ops:read` | `re-brok-agent-ops:read_real_estate_transactions` |
| `re-brok-agent-ops:read` | `re-brok-brokerage-ops:read_commission_splits` |
| `re-brok-agent-ops:read` | `re-brok-agent-ops:read_tour_appointments` |
| `re-brok-agent-ops:read` | `re-brok-agent-ops:read_disclosure_documents` |
| `re-brok-agent-ops:manage` | `crm-acct-mgt:write_crm_contacts` |
| `crm-acct-mgt:write_crm_contacts` | `crm-acct-mgt:read_crm_contacts` |
| `re-brok-agent-ops:manage` | `crm-lead-mgt:write_crm_leads` |
| `crm-lead-mgt:write_crm_leads` | `crm-lead-mgt:read_crm_leads` |
| `re-brok-agent-ops:manage` | `re-brok-agent-ops:write_real_estate_listings` |
| `re-brok-agent-ops:write_real_estate_listings` | `re-brok-agent-ops:read_real_estate_listings` |
| `re-brok-agent-ops:manage` | `re-brok-agent-ops:write_real_estate_transactions` |
| `re-brok-agent-ops:write_real_estate_transactions` | `re-brok-agent-ops:read_real_estate_transactions` |
| `re-brok-agent-ops:manage` | `re-brok-brokerage-ops:write_commission_splits` |
| `re-brok-brokerage-ops:write_commission_splits` | `re-brok-brokerage-ops:read_commission_splits` |
| `re-brok-agent-ops:manage` | `re-brok-agent-ops:write_tour_appointments` |
| `re-brok-agent-ops:write_tour_appointments` | `re-brok-agent-ops:read_tour_appointments` |
| `re-brok-agent-ops:manage` | `re-brok-agent-ops:write_disclosure_documents` |
| `re-brok-agent-ops:write_disclosure_documents` | `re-brok-agent-ops:read_disclosure_documents` |
| `re-brok-agent-ops:admin` | `crm-lead-mgt:convert_lead` |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:activate_listing` |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:mark_under_contract` |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:close_listing` |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:withdraw_listing` |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:schedule_inspection` |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:submit_financing` |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:clear_contingencies` |
| `re-brok-agent-ops:admin` | `re-brok-brokerage-ops:submit_for_compliance_review` |
| `re-brok-agent-ops:admin` | `re-brok-brokerage-ops:approve_for_closing` |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:close_transaction` |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:cancel_transaction` |
| `re-brok-agent-ops:admin` | `re-brok-brokerage-ops:review_commission_split` |
| `re-brok-agent-ops:admin` | `re-brok-brokerage-ops:dispute_commission_split` |
| `re-brok-agent-ops:admin` | `re-brok-brokerage-ops:approve_commission_split` |
| `re-brok-agent-ops:admin` | `re-brok-brokerage-ops:disburse_commission` |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:confirm_tour` |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:complete_tour` |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:cancel_tour` |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:deliver_disclosure` |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:acknowledge_disclosure` |
| `re-brok-agent-ops:admin` | `crm-acct-mgt:view_all_contacts` |
| `re-brok-agent-ops:admin` | `crm-acct-mgt:manage_all_contacts` |
| `re-brok-agent-ops:admin` | `crm-lead-mgt:view_all_leads` |
| `re-brok-agent-ops:admin` | `crm-lead-mgt:manage_all_leads` |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:view_all_real_estate_listings` |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:manage_all_real_estate_listings` |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:view_all_real_estate_transactions` |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:manage_all_real_estate_transactions` |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:view_all_tour_appointments` |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:manage_all_tour_appointments` |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:view_all_disclosure_documents` |
| `re-brok-agent-ops:admin` | `re-brok-agent-ops:manage_all_disclosure_documents` |

**RACI realization:**

_(none: no process_raci assignments wired to this module's gated processes yet)_

### 9.2 Functional ownership and default grants

| responsibility | business function | default role | default tier |
| --- | --- | --- | --- |
| owner | Sales | `admin` | `:admin` |
| contributor | Marketing | `manager` | `:manage` |
| consumer | Accounting | `viewer` | `:read` |
