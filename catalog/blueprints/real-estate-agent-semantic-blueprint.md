---
artifact: semantic-blueprint
version: "3.1"
license: MIT
system_name: Real Estate Agent (solo / small firm bundle)
tagline: A working surface for the real-estate agent.
description: Bring contacts, listings, and the documents behind each deal into one agent-facing workspace. Move leads forward, keep listing and transaction paperwork organized, and stay on top of every active deal from a single view that travels with the agent across the systems they already use.
system_slug: real-estate-agent
domain_modules:
  - real-estate-agent
domain_code: REAL-ESTATE-AGENT
related_modules: [agency-mgmt-job-traffic, clm-negotiation, clm-obligation-mgmt, clm-renewal, clm-repository, cpq-quote-builder, crm-acct-mgt, crm-activity, crm-lead-mgt, ma-campaign-authoring, ma-lead-scoring, psa-project-delivery, re-brok-agent-ops, re-brok-brokerage-ops, re-invest-portfolio-val, smp-renewal-vendor]
persona: [CONTRACT-OPS-MANAGER, CONTRACT-OPS-SPECIALIST, LEGAL-COUNSEL, PROCUREMENT-CONTRACT-LIAISON]
supports_raci: false
created_at: 2026-11-04
---

# Real Estate Agent (solo / small firm bundle)

## 1. Overview

Solo-agent and small-firm persona bundle. Single-install deployable for individual real estate agents covering lead capture and contact relationships (CRM-LEAD-MGT, CRM-ACCT-MGT), listing creation and MLS syndication, tour scheduling, transaction execution, disclosure handling (RE-BROK-AGENT-OPS), and contract reference (CLM-REPOSITORY). One module to install; larger brokerages deploy the underlying full modules and skip the starter.

## 2. Entity summary

| Name | data_object | Description |
| --- | --- | --- |
| Contacts | `crm_contacts` | People at customer or prospect organizations, carrying title, contact details, decision-maker flag, preferred channel, and opt-in state. |
| Contracts | `legal_contracts` | Contracts with counterparties or suppliers, covering type, value, key dates, governing law, and lifecycle from draft to terminated. |
| Disclosure Documents | `disclosure_documents` | State-mandated and brokerage-policy disclosure forms attached to transactions, such as agency, property condition, lead paint, and HOA documents. |
| Leads | `crm_leads` | Prospects captured before qualification, tracking source, score, status, assigned rep, and the contact and account they would convert into. |
| Real Estate Listings | `real_estate_listings` | Properties offered for sale or rent, with pricing, photos, descriptions, agent representation, and status from active to sold. |
| Real Estate Transactions | `real_estate_transactions` | Real estate deals from accepted offer through close, with parties, terms, contingencies, escrow timeline, and document compliance. |
| Tour Appointments | `tour_appointments` | Scheduled property showings with lock-box codes, access windows, agent attendance, and follow-up tracking. |
| Users | `users` | Platform users referenced as assignees, authors, approvers, and creators across records. |

```mermaid
flowchart TD
  classDef embedded_master fill:#fff4cc,stroke:#c79100,color:#5b4500;
  classDef consumer fill:#e8def8,stroke:#7b1fa2,color:#3a155d;
  legal_contracts["Contracts"]
  crm_contacts["Contacts"]
  crm_leads["Leads"]
  real_estate_listings["Real Estate Listings"]
  real_estate_transactions["Real Estate Transactions"]
  tour_appointments["Tour Appointments"]
  disclosure_documents["Disclosure Documents"]
  users["Users"]
  users -->|"owns"| legal_contracts
  users -->|"approved"| legal_contracts
  users -->|"drafted"| legal_contracts
  crm_contacts -->|"converted_from_lead"| crm_leads
  users -->|"owns"| crm_leads
  users -->|"owns"| crm_contacts
  real_estate_listings -->|"generates"| real_estate_transactions
  real_estate_listings -->|"has tours"| tour_appointments
  real_estate_transactions -->|"requires disclosures"| disclosure_documents
  users -->|"lists"| real_estate_listings
  users -->|"shows"| tour_appointments
  users -->|"represents seller on"| real_estate_transactions
  users -->|"represents buyer on"| real_estate_transactions
  users -->|"prepares"| disclosure_documents
  class legal_contracts embedded_master;
  class crm_contacts embedded_master;
  class crm_leads embedded_master;
  class real_estate_listings embedded_master;
  class real_estate_transactions embedded_master;
  class tour_appointments embedded_master;
  class disclosure_documents embedded_master;
  class users consumer;
```

## 3. Entities catalog

| # | data_object | catalog code | singular | plural | held_as | mastered in | mastered label | install_optional | personal_content | entity_type | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `crm_contacts` | `crm_contacts` | Contact | Contacts | embedded_master | `crm-acct-mgt` | Account and Contact Management | - | yes | operational_record | `:manage` | - |
| 2 | `legal_contracts` | `legal_contracts` | Contract | Contracts | embedded_master | `clm-repository` | Contract Repository | - | yes | operational_workflow | `:manage` | - |
| 3 | `disclosure_documents` | `disclosure_documents` | Disclosure Document | Disclosure Documents | embedded_master | `re-brok-agent-ops` | Real Estate Agent Operations | - | yes | operational_workflow | `:manage` | - |
| 4 | `crm_leads` | `crm_leads` | Lead | Leads | embedded_master | `crm-lead-mgt` | Lead Capture and Qualification | - | yes | operational_workflow | `:manage` | - |
| 5 | `real_estate_listings` | `real_estate_listings` | Real Estate Listing | Real Estate Listings | embedded_master | `re-brok-agent-ops` | Real Estate Agent Operations | - | yes | operational_workflow | `:manage` | - |
| 6 | `real_estate_transactions` | `real_estate_transactions` | Real Estate Transaction | Real Estate Transactions | embedded_master | `re-brok-agent-ops` | Real Estate Agent Operations | - | yes | operational_workflow | `:manage` | - |
| 7 | `tour_appointments` | `tour_appointments` | Tour Appointment | Tour Appointments | embedded_master | `re-brok-agent-ops` | Real Estate Agent Operations | - | yes | operational_workflow | `:manage` | - |
| 8 | `users` | `users` | User | Users | consumer | _(platform built-in)_ | _(platform built-in)_ | - | - | operational_record | `:manage` | - |

## 4. Aliases and industry synonyms

| data_object | alias | alias_type | preferred? | industry | notes |
| --- | --- | --- | --- | --- | --- |
| `real_estate_transactions` | Closing | industry_term | - | Real Estate | - |
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

### 5.2 Relationships to platform built-ins (`users`)

| from | verb | to | cardinality | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `users` | owns | `legal_contracts` | one_to_many | no | clear | reference | - |
| `users` | approved | `legal_contracts` | one_to_many | no | clear | reference | - |
| `users` | drafted | `legal_contracts` | one_to_many | no | clear | reference | - |
| `users` | owns | `crm_leads` | one_to_many | yes | restrict | reference | - |
| `users` | owns | `crm_contacts` | one_to_many | no | clear | reference | - |
| `users` | lists | `real_estate_listings` | one_to_many | yes | restrict | reference | - |
| `users` | shows | `tour_appointments` | one_to_many | yes | restrict | reference | - |
| `users` | represents seller on | `real_estate_transactions` | one_to_many | yes | restrict | reference | - |
| `users` | represents buyer on | `real_estate_transactions` | one_to_many | no | clear | reference | - |
| `users` | prepares | `disclosure_documents` | one_to_many | yes | restrict | reference | - |

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
| `customers` | has_contacts | `crm_contacts` | one_to_many | no | - |
| `customers` | converted_from_lead | `crm_leads` | one_to_many | no | - |
| `crm_opportunities` | converted_from_lead | `crm_leads` | one_to_many | no | - |
| `crm_opportunities` | involves_contacts | `crm_contacts` | many_to_many | - | - |
| `contact_records` | enriches | `crm_contacts` | one_to_many | no | - |
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
| `crm_contacts` | has_activities | `sales_activities` | one_to_many | no | - |
| `crm_leads` | has_activities | `sales_activities` | one_to_many | no | - |
| `real_estate_transactions` | produces commission splits | `commission_splits` | one_to_many | yes | - |
| `legal_contracts` | is amended by | `contract_amendments` | one_to_many | yes | - |
| `legal_contracts` | is renewed by | `contract_renewal_records` | one_to_many | yes | - |
| `legal_contracts` | is assessed by | `contract_risk_assessments` | one_to_many | no | - |
| `legal_contracts` | has milestone | `contract_milestones` | one_to_many | yes | - |
| `legal_contracts` | has data protection addendum | `data_protection_addenda` | one_to_many | yes | - |
| `legal_contracts` | is negotiated in | `contract_negotiation_threads` | one_to_many | yes | - |

## 6. Cross-domain context

### 6.1 Master consumers (other modules / domains that embed this scope's masters)

_(none: this scope masters no entities)_

### 6.2 Outbound handoffs (events this scope publishes)

_(none: no outbound handoffs whose payload is in this scope)_

### 6.3 Inbound handoffs (events this scope reacts to)

_(none: no inbound handoffs whose payload is in this scope)_

### 6.4 Master providers (modules / domains that own masters this scope embeds)

| data_object | held_as | install_optional | catalog owner(s) | slice notes |
| --- | --- | --- | --- | --- |
| `crm_contacts` | embedded_master | - | CRM-ACCT-MGT (CRM) | - |
| `crm_leads` | embedded_master | - | CRM-LEAD-MGT (CRM) | - |
| `disclosure_documents` | embedded_master | - | RE-BROK-AGENT-OPS (RE-BROKERAGE) | - |
| `legal_contracts` | embedded_master | - | CLM-REPOSITORY (CLM) | - |
| `real_estate_listings` | embedded_master | - | RE-BROK-AGENT-OPS (RE-BROKERAGE) | - |
| `real_estate_transactions` | embedded_master | - | RE-BROK-AGENT-OPS (RE-BROKERAGE) | - |
| `tour_appointments` | embedded_master | - | RE-BROK-AGENT-OPS (RE-BROKERAGE) | - |
| `users` | consumer | - | _(platform built-in)_ | - |

## 7. Lifecycle states

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

_This scope holds `disclosure_documents` as **embedded_master**; the canonical state machine is owned by `RE-BROK-AGENT-OPS`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `drafted` | ✓ | - | _(always)_ | - | - | - | Disclosure generated from a state-specific template (agency disclosure, lead-paint, natural-hazards, transfer disclosure). Not yet delivered. |
| 2 | `delivered` | - | - | `RE-BROK-AGENT-OPS` | ✓ | - | `re-brok-agent-ops:deliver_disclosure` | Disclosure sent to recipient (buyer or seller); recipient acknowledgment pending. |
| 3 | `acknowledged` | - | ✓ | `RE-BROK-AGENT-OPS` | ✓ | - | `re-brok-agent-ops:acknowledge_disclosure` | Recipient signed acknowledgment recorded (typically via eSign callback). Disclosure satisfies the compliance requirement on the transaction. |
| 4 | `rejected` | - | ✓ | _(always)_ | - | - | - | Recipient refused to acknowledge or signed under dispute. Typically requires the transaction to address the rejection before progressing. |

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

### `real_estate_listings` (Real Estate Listing)

_This scope holds `real_estate_listings` as **embedded_master**; the canonical state machine is owned by `RE-BROK-AGENT-OPS`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | _(always)_ | - | - | - | Listing is being prepared (photos, copy, pricing); not yet published to MLS. |
| 2 | `active` | - | - | `RE-BROK-AGENT-OPS` | ✓ | - | `re-brok-agent-ops:activate_listing` | Listing is published to the MLS and accepting offers. |
| 3 | `under_contract` | - | - | `RE-BROK-AGENT-OPS` | ✓ | - | `re-brok-agent-ops:mark_under_contract` | Offer accepted; a real_estate_transaction has been opened. Listing remains visible on MLS as 'pending' but not accepting new offers. |
| 4 | `sold` | - | ✓ | `RE-BROK-AGENT-OPS` | ✓ | - | `re-brok-agent-ops:close_listing` | Transaction closed; listing terminated as a sale. Triggers downstream events to property-management, CRE, and investment systems. |
| 5 | `withdrawn` | - | ✓ | `RE-BROK-AGENT-OPS` | ✓ | - | `re-brok-agent-ops:withdraw_listing` | Listing pulled from the market without a sale (seller decision, expired listing agreement before contract, market reasons). |
| 6 | `expired` | - | ✓ | _(always)_ | - | - | - | Listing agreement reached its end date without a sale or active renewal. No explicit user action; system marks at expiration. |

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

### `tour_appointments` (Tour Appointment)

_This scope holds `tour_appointments` as **embedded_master**; the canonical state machine is owned by `RE-BROK-AGENT-OPS`._

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
| `real-estate-agent:read` | baseline-read | Read access to every entity in the module | ✓ |
| `real-estate-agent:manage` | baseline-manage | Edit operational records | ✓ |
| `real-estate-agent:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `clm-repository:read_legal_contracts` | entity-read | Read Contracts | ✓ |
| `clm-repository:write_legal_contracts` | entity-write | Write Contracts | ✓ |
| `crm-acct-mgt:read_crm_contacts` | entity-read | Read Contacts | ✓ |
| `crm-acct-mgt:write_crm_contacts` | entity-write | Write Contacts | ✓ |
| `crm-lead-mgt:read_crm_leads` | entity-read | Read Leads | ✓ |
| `crm-lead-mgt:write_crm_leads` | entity-write | Write Leads | ✓ |
| `re-brok-agent-ops:read_real_estate_listings` | entity-read | Read Real Estate Listings | ✓ |
| `re-brok-agent-ops:write_real_estate_listings` | entity-write | Write Real Estate Listings | ✓ |
| `re-brok-agent-ops:read_real_estate_transactions` | entity-read | Read Real Estate Transactions | ✓ |
| `re-brok-agent-ops:write_real_estate_transactions` | entity-write | Write Real Estate Transactions | ✓ |
| `re-brok-agent-ops:read_tour_appointments` | entity-read | Read Tour Appointments | ✓ |
| `re-brok-agent-ops:write_tour_appointments` | entity-write | Write Tour Appointments | ✓ |
| `re-brok-agent-ops:read_disclosure_documents` | entity-read | Read Disclosure Documents | ✓ |
| `re-brok-agent-ops:write_disclosure_documents` | entity-write | Write Disclosure Documents | ✓ |
| `clm-negotiation:approve_legal_contract` | workflow-gate (lifecycle) | Transition `legal_contracts` into state `approved` | ✓ |
| `clm-repository:execute_legal_contract` | workflow-gate (lifecycle) | Transition `legal_contracts` into state `signed` | ✓ |
| `clm-repository:amend_legal_contract` | workflow-gate (lifecycle) | Transition `legal_contracts` into state `amended` | ✓ |
| `clm-repository:terminate_legal_contract` | workflow-gate (lifecycle) | Transition `legal_contracts` into state `terminated` | ✓ |
| `clm-renewal:renew_legal_contract` | workflow-gate (lifecycle) | Transition `legal_contracts` into state `renewed` | ✓ |
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
| `re-brok-agent-ops:confirm_tour` | workflow-gate (lifecycle) | Transition `tour_appointments` into state `confirmed` | ✓ |
| `re-brok-agent-ops:complete_tour` | workflow-gate (lifecycle) | Transition `tour_appointments` into state `completed` | ✓ |
| `re-brok-agent-ops:cancel_tour` | workflow-gate (lifecycle) | Transition `tour_appointments` into state `canceled` | ✓ |
| `re-brok-agent-ops:deliver_disclosure` | workflow-gate (lifecycle) | Transition `disclosure_documents` into state `delivered` | ✓ |
| `re-brok-agent-ops:acknowledge_disclosure` | workflow-gate (lifecycle) | Transition `disclosure_documents` into state `acknowledged` | ✓ |
| `clm-repository:view_all_contracts` | override (personal_content) | View all `legal_contracts` rows beyond row-scope | ✓ |
| `clm-repository:manage_all_contracts` | override (personal_content) | Manage all `legal_contracts` rows beyond row-scope | ✓ |
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

_Gates with no process: `clm-repository:amend_legal_contract`, `crm-lead-mgt:convert_lead`, `re-brok-agent-ops:activate_listing`, `re-brok-agent-ops:mark_under_contract`, `re-brok-agent-ops:close_listing`, `re-brok-agent-ops:withdraw_listing`, `re-brok-agent-ops:schedule_inspection`, `re-brok-agent-ops:submit_financing`, `re-brok-agent-ops:clear_contingencies`, `re-brok-brokerage-ops:submit_for_compliance_review`, `re-brok-brokerage-ops:approve_for_closing`, `re-brok-agent-ops:close_transaction`, `re-brok-agent-ops:cancel_transaction`, `re-brok-agent-ops:confirm_tour`, `re-brok-agent-ops:complete_tour`, `re-brok-agent-ops:cancel_tour`, `re-brok-agent-ops:deliver_disclosure`, `re-brok-agent-ops:acknowledge_disclosure`. No Accountable can hold them, so this blueprint does not support `raci`._

### 8.2 Business rules

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `contract_edit_scope` | `legal_contracts` | has_personal_content | Row-scope by default; override via `clm-repository:view_all_contracts` / `clm-repository:manage_all_contracts` |
| `contact_edit_scope` | `crm_contacts` | has_personal_content | Row-scope by default; override via `crm-acct-mgt:view_all_contacts` / `crm-acct-mgt:manage_all_contacts` |
| `lead_edit_scope` | `crm_leads` | has_personal_content | Row-scope by default; override via `crm-lead-mgt:view_all_leads` / `crm-lead-mgt:manage_all_leads` |
| `real_estate_listing_edit_scope` | `real_estate_listings` | has_personal_content | Row-scope by default; override via `re-brok-agent-ops:view_all_real_estate_listings` / `re-brok-agent-ops:manage_all_real_estate_listings` |
| `real_estate_transaction_edit_scope` | `real_estate_transactions` | has_personal_content | Row-scope by default; override via `re-brok-agent-ops:view_all_real_estate_transactions` / `re-brok-agent-ops:manage_all_real_estate_transactions` |
| `tour_appointment_edit_scope` | `tour_appointments` | has_personal_content | Row-scope by default; override via `re-brok-agent-ops:view_all_tour_appointments` / `re-brok-agent-ops:manage_all_tour_appointments` |
| `disclosure_document_edit_scope` | `disclosure_documents` | has_personal_content | Row-scope by default; override via `re-brok-agent-ops:view_all_disclosure_documents` / `re-brok-agent-ops:manage_all_disclosure_documents` |

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `REAL-ESTATE-AGENT`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `real-estate-agent_viewer` | `real-estate-agent:read` |
| `real-estate-agent_manager` | `real-estate-agent:manage` |
| `real-estate-agent_admin` | `real-estate-agent:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `real-estate-agent:admin` | `real-estate-agent:manage` |
| `real-estate-agent:manage` | `real-estate-agent:read` |
| `real-estate-agent:read` | `clm-repository:read_legal_contracts` |
| `real-estate-agent:read` | `crm-acct-mgt:read_crm_contacts` |
| `real-estate-agent:read` | `crm-lead-mgt:read_crm_leads` |
| `real-estate-agent:read` | `re-brok-agent-ops:read_real_estate_listings` |
| `real-estate-agent:read` | `re-brok-agent-ops:read_real_estate_transactions` |
| `real-estate-agent:read` | `re-brok-agent-ops:read_tour_appointments` |
| `real-estate-agent:read` | `re-brok-agent-ops:read_disclosure_documents` |
| `real-estate-agent:manage` | `clm-repository:write_legal_contracts` |
| `clm-repository:write_legal_contracts` | `clm-repository:read_legal_contracts` |
| `real-estate-agent:manage` | `crm-acct-mgt:write_crm_contacts` |
| `crm-acct-mgt:write_crm_contacts` | `crm-acct-mgt:read_crm_contacts` |
| `real-estate-agent:manage` | `crm-lead-mgt:write_crm_leads` |
| `crm-lead-mgt:write_crm_leads` | `crm-lead-mgt:read_crm_leads` |
| `real-estate-agent:manage` | `re-brok-agent-ops:write_real_estate_listings` |
| `re-brok-agent-ops:write_real_estate_listings` | `re-brok-agent-ops:read_real_estate_listings` |
| `real-estate-agent:manage` | `re-brok-agent-ops:write_real_estate_transactions` |
| `re-brok-agent-ops:write_real_estate_transactions` | `re-brok-agent-ops:read_real_estate_transactions` |
| `real-estate-agent:manage` | `re-brok-agent-ops:write_tour_appointments` |
| `re-brok-agent-ops:write_tour_appointments` | `re-brok-agent-ops:read_tour_appointments` |
| `real-estate-agent:manage` | `re-brok-agent-ops:write_disclosure_documents` |
| `re-brok-agent-ops:write_disclosure_documents` | `re-brok-agent-ops:read_disclosure_documents` |
| `real-estate-agent:admin` | `clm-negotiation:approve_legal_contract` |
| `real-estate-agent:admin` | `clm-repository:execute_legal_contract` |
| `real-estate-agent:admin` | `clm-repository:amend_legal_contract` |
| `real-estate-agent:admin` | `clm-repository:terminate_legal_contract` |
| `real-estate-agent:admin` | `clm-renewal:renew_legal_contract` |
| `real-estate-agent:admin` | `crm-lead-mgt:convert_lead` |
| `real-estate-agent:admin` | `re-brok-agent-ops:activate_listing` |
| `real-estate-agent:admin` | `re-brok-agent-ops:mark_under_contract` |
| `real-estate-agent:admin` | `re-brok-agent-ops:close_listing` |
| `real-estate-agent:admin` | `re-brok-agent-ops:withdraw_listing` |
| `real-estate-agent:admin` | `re-brok-agent-ops:schedule_inspection` |
| `real-estate-agent:admin` | `re-brok-agent-ops:submit_financing` |
| `real-estate-agent:admin` | `re-brok-agent-ops:clear_contingencies` |
| `real-estate-agent:admin` | `re-brok-brokerage-ops:submit_for_compliance_review` |
| `real-estate-agent:admin` | `re-brok-brokerage-ops:approve_for_closing` |
| `real-estate-agent:admin` | `re-brok-agent-ops:close_transaction` |
| `real-estate-agent:admin` | `re-brok-agent-ops:cancel_transaction` |
| `real-estate-agent:admin` | `re-brok-agent-ops:confirm_tour` |
| `real-estate-agent:admin` | `re-brok-agent-ops:complete_tour` |
| `real-estate-agent:admin` | `re-brok-agent-ops:cancel_tour` |
| `real-estate-agent:admin` | `re-brok-agent-ops:deliver_disclosure` |
| `real-estate-agent:admin` | `re-brok-agent-ops:acknowledge_disclosure` |
| `real-estate-agent:admin` | `clm-repository:view_all_contracts` |
| `real-estate-agent:admin` | `clm-repository:manage_all_contracts` |
| `real-estate-agent:admin` | `crm-acct-mgt:view_all_contacts` |
| `real-estate-agent:admin` | `crm-acct-mgt:manage_all_contacts` |
| `real-estate-agent:admin` | `crm-lead-mgt:view_all_leads` |
| `real-estate-agent:admin` | `crm-lead-mgt:manage_all_leads` |
| `real-estate-agent:admin` | `re-brok-agent-ops:view_all_real_estate_listings` |
| `real-estate-agent:admin` | `re-brok-agent-ops:manage_all_real_estate_listings` |
| `real-estate-agent:admin` | `re-brok-agent-ops:view_all_real_estate_transactions` |
| `real-estate-agent:admin` | `re-brok-agent-ops:manage_all_real_estate_transactions` |
| `real-estate-agent:admin` | `re-brok-agent-ops:view_all_tour_appointments` |
| `real-estate-agent:admin` | `re-brok-agent-ops:manage_all_tour_appointments` |
| `real-estate-agent:admin` | `re-brok-agent-ops:view_all_disclosure_documents` |
| `real-estate-agent:admin` | `re-brok-agent-ops:manage_all_disclosure_documents` |

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

_(none: no business_function_domains rows for this scope's domain)_
