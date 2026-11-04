---
artifact: semantic-blueprint
version: "3.1"
license: MIT
system_name: HVAC Service Management (small-org starter)
tagline: A ready-to-run home-services starter that takes an HVAC job from customer call to scheduled visit and invoice.
description: This starter packages the field-service essentials a heating and cooling service business needs on day one. It bundles the customer and contact record, the installed equipment at each site, work orders and field visits, service contracts, and the quote-to-invoice path so a small team can book a call, schedule a technician, complete the job, and bill it without stitching tools together. It is a fast on-ramp to field service for trades operators who want the core workflow working immediately and can grow into the full modules later.
system_slug: hvac-svc-mgmt
domain_modules:
  - hvac-svc-mgmt
domain_code: HVAC-SVC-MGMT
icon_name: air-vent
related_modules: [b2c-comm-order-capture, cdp-unified-profile, cpq-product-catalog, cpq-quote-builder, crm-acct-mgt, crm-lead-mgt, crm-pipeline-mgt, fds-csa-mgmt, fds-wholesale, fsm-dispatch-ops, fsm-installed-base, fsm-mobile-tech, fsm-service-contracts, ham-warranty-parts, ma-campaign-authoring, sub-mgmt-billing, sub-mgmt-subscriptions]
persona: []
supports_raci: false
created_at: 2026-11-04
---

# HVAC Service Management (small-org starter)

## 1. Overview

Small-shop persona bundle for HVAC service businesses (5-30 technicians). Single-install deployable covering customer accounts and contacts (CRM), service dispatch and field execution (FSM-DISPATCH-OPS), installed equipment register and PM cadence (FSM-INSTALLED-BASE), recurring maintenance agreements (FSM-SERVICE-CONTRACTS), quote-to-invoice (CPQ + SUB-MGMT), and parts inventory (HAM). Larger organizations deploy the full modules and skip the starter.

## 2. Entity summary

| Name | data_object | Description |
| --- | --- | --- |
| Contacts | `crm_contacts` | People at customer or prospect organizations, carrying title, contact details, decision-maker flag, preferred channel, and opt-in state. |
| Customer Invoices | `customer_invoices` | Seller-issued invoices billed to customers, with line items, tax, payment terms, due date, and status from draft to paid or written off. |
| Customer Sites | `customer_sites` | Physical service locations belonging to a customer, where one customer can have many sites across properties or chains. |
| Customers | `customers` | Canonical records of customers, whether business accounts or end consumers, carrying identity, segmentation, lifecycle stage, and account hierarchy. |
| Dispatch Records | `dispatch_records` | Assignments of a work order to a specific technician at a specific time, capturing dispatch decisions, route output, and dispatcher overrides. |
| Field Visits | `field_visits` | Scheduled or completed on-site visits by a field technician, capturing arrival, work performed, parts used, customer signature, and outcome. |
| Installed Equipment | `installed_equipment` | Customer-owned equipment that the service organization installs and maintains, with identity, placement, and lifecycle state, covered by work orders and contracts. |
| Sales Quotes | `sales_quotes` | Versioned, numbered quote documents with dates, validity, currency, terms, pricing, and status from draft to accepted or lost. |
| Service Contracts | `service_contracts` | Service contracts that carry service-level commitments such as response times, parts coverage, and call-out fees. |
| Service PM Schedules | `service_pm_schedules` | Recurring preventive-maintenance plans for installed equipment, defining cadence, due date, grace window, and overdue escalation. |
| Service Work Orders | `service_work_orders` | Customer-facing service jobs fulfilled by field visits, distinct from preventive-maintenance work orders. |
| Spare Part Inventory Items | `spare_parts_inventory` | Stockroom counts and procurement of replacement hardware components not yet deployed as assets. |
| Users | `users` | Platform users referenced as assignees, authors, approvers, and creators across records. |

```mermaid
flowchart TD
  classDef embedded_master fill:#fff4cc,stroke:#c79100,color:#5b4500;
  classDef consumer fill:#e8def8,stroke:#7b1fa2,color:#3a155d;
  customers["Customers"]
  crm_contacts["Contacts"]
  customer_invoices["Customer Invoices"]
  field_visits["Field Visits"]
  dispatch_records["Dispatch Records"]
  sales_quotes["Sales Quotes"]
  spare_parts_inventory["Spare Part Inventory Items"]
  service_work_orders["Service Work Orders"]
  service_contracts["Service Contracts"]
  users["Users"]
  installed_equipment["Installed Equipment"]
  service_pm_schedules["Service PM Schedules"]
  customer_sites["Customer Sites"]
  users -->|"manages stock"| spare_parts_inventory
  users -->|"owns"| customers
  customers -->|"has_contacts"| crm_contacts
  users -->|"owns"| crm_contacts
  users -->|"owns"| customers
  service_work_orders -->|"fulfilled_by"| field_visits
  field_visits -->|"dispatched_by"| dispatch_records
  installed_equipment -->|"serviced_by"| service_work_orders
  customer_sites -->|"hosts"| service_work_orders
  service_contracts -->|"covers"| installed_equipment
  installed_equipment -->|"has_pm"| service_pm_schedules
  customer_sites -->|"hosts_equipment"| installed_equipment
  customers -->|"owns_sites"| customer_sites
  customers -->|"is_party_to"| service_contracts
  users -->|"performs_as_technician"| field_visits
  users -->|"assigned_as_technician"| dispatch_records
  users -->|"dispatches"| dispatch_records
  users -->|"creates_work_order"| service_work_orders
  users -->|"manages_as_account_mgr"| service_contracts
  users -->|"installs"| installed_equipment
  users -->|"completes_pm"| service_pm_schedules
  class customers embedded_master;
  class crm_contacts embedded_master;
  class customer_invoices embedded_master;
  class field_visits embedded_master;
  class dispatch_records embedded_master;
  class sales_quotes embedded_master;
  class spare_parts_inventory embedded_master;
  class service_work_orders embedded_master;
  class service_contracts embedded_master;
  class users consumer;
  class installed_equipment embedded_master;
  class service_pm_schedules embedded_master;
  class customer_sites embedded_master;
```

## 3. Entities catalog

| # | data_object | catalog code | singular | plural | held_as | mastered in | mastered label | install_optional | personal_content | entity_type | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `crm_contacts` | `crm_contacts` | Contact | Contacts | embedded_master | `crm-acct-mgt` | Account and Contact Management | - | yes | operational_record | `:manage` | - |
| 2 | `customer_invoices` | `customer_invoices` | Customer Invoice | Customer Invoices | embedded_master | `sub-mgmt-billing` | Recurring Billing and Dunning | - | - | operational_workflow | `:manage` | - |
| 3 | `customer_sites` | `customer_sites` | Customer Site | Customer Sites | embedded_master | `fsm-installed-base` | Installed Equipment and Preventive Maintenance | - | - | operational_workflow | `:manage` | - |
| 4 | `customers` | `customers` | Customer | Customers | embedded_master | `crm-acct-mgt` | Account and Contact Management | - | yes | operational_workflow | `:manage` | - |
| 5 | `dispatch_records` | `dispatch_records` | Dispatch Record | Dispatch Records | embedded_master | `fsm-dispatch-ops` | Field Service Dispatch Operations | - | - | operational_workflow | `:manage` | - |
| 6 | `field_visits` | `field_visits` | Field Visit | Field Visits | embedded_master | `fsm-mobile-tech` | Mobile Technician | - | yes | operational_workflow | `:manage` | - |
| 7 | `installed_equipment` | `installed_equipment` | Installed Equipment Unit | Installed Equipment | embedded_master | `fsm-installed-base` | Installed Equipment and Preventive Maintenance | - | - | operational_workflow | `:manage` | - |
| 8 | `sales_quotes` | `sales_quotes` | Sales Quote | Sales Quotes | embedded_master | `cpq-quote-builder` | Quote Construction and Discounting | - | - | operational_workflow | `:manage` | - |
| 9 | `service_contracts` | `service_contracts` | Service Contract | Service Contracts | embedded_master | `fsm-service-contracts` | Service Contracts and SLAs | - | - | operational_workflow | `:manage` | - |
| 10 | `service_pm_schedules` | `service_pm_schedules` | Service PM Schedule | Service PM Schedules | embedded_master | `fsm-installed-base` | Installed Equipment and Preventive Maintenance | - | - | operational_workflow | `:manage` | - |
| 11 | `service_work_orders` | `service_work_orders` | Service Work Order | Service Work Orders | embedded_master | `fsm-dispatch-ops` | Field Service Dispatch Operations | - | - | operational_workflow | `:manage` | - |
| 12 | `spare_parts_inventory` | `spare_parts_inventory` | Spare Part Inventory Item | Spare Part Inventory Items | embedded_master | `ham-warranty-parts` | Warranty, Disposal, and Spare Parts | - | - | operational_record | `:manage` | - |
| 13 | `users` | `users` | User | Users | consumer | _(platform built-in)_ | _(platform built-in)_ | - | - | operational_record | `:manage` | - |

## 4. Aliases and industry synonyms

_(none: no industry-scoped aliases for this scope)_

## 5. Relationships

_`field_required` applies only when both entities are installed. It never makes an entity required._

### 5.1 Relationships between entities in this blueprint

| from | verb | to | cardinality | kind | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `customers` | has_contacts | `crm_contacts` | one_to_many | reference | no | clear | reference | - |
| `service_work_orders` | fulfilled_by | `field_visits` | one_to_many | composition | yes | cascade | parent | - |
| `field_visits` | dispatched_by | `dispatch_records` | one_to_one | reference | yes | restrict | reference | - |
| `installed_equipment` | serviced_by | `service_work_orders` | one_to_many | reference | no | clear | reference | - |
| `customer_sites` | hosts | `service_work_orders` | one_to_many | reference | yes | restrict | reference | - |
| `service_contracts` | covers | `installed_equipment` | one_to_many | association | no | clear | reference | - |
| `installed_equipment` | has_pm | `service_pm_schedules` | one_to_many | reference | yes | restrict | reference | - |
| `customer_sites` | hosts_equipment | `installed_equipment` | one_to_many | reference | yes | restrict | reference | - |
| `customers` | owns_sites | `customer_sites` | one_to_many | reference | yes | restrict | reference | - |
| `customers` | is_party_to | `service_contracts` | one_to_many | reference | yes | restrict | reference | - |

### 5.2 Relationships to platform built-ins (`users`)

| from | verb | to | cardinality | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `users` | manages stock | `spare_parts_inventory` | one_to_many | no | clear | reference | - |
| `users` | owns | `customers` | one_to_many | no | clear | reference | - |
| `users` | owns | `crm_contacts` | one_to_many | no | clear | reference | - |
| `users` | owns | `customers` | one_to_many | yes | restrict | reference | - |
| `users` | performs_as_technician | `field_visits` | one_to_many | yes | restrict | reference | - |
| `users` | assigned_as_technician | `dispatch_records` | one_to_many | yes | restrict | reference | - |
| `users` | dispatches | `dispatch_records` | one_to_many | yes | restrict | reference | - |
| `users` | creates_work_order | `service_work_orders` | one_to_many | yes | restrict | reference | - |
| `users` | manages_as_account_mgr | `service_contracts` | one_to_many | no | clear | reference | - |
| `users` | installs | `installed_equipment` | one_to_many | no | clear | reference | - |
| `users` | completes_pm | `service_pm_schedules` | one_to_many | no | clear | reference | - |

### 5.3 Relationships to entities outside this blueprint

_External entities are optional: this blueprint never installs them. If one exists at install, the relationship is proposed. A many-to-many relationship is listed under outgoing and proposed as a new junction table._

#### 5.3a Outgoing relationships: this blueprint's entity points to the external entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `hardware_assets` | served_by | `spare_parts_inventory` | many_to_many | - | - |
| `hardware_models` | stocks | `spare_parts_inventory` | one_to_many | no | - |
| `msp_contracts` | drives engagement | `customers` | one_to_many | no | - |
| `customer_golden_records` | resolves to | `customers` | one_to_many | no | - |
| `customers` | impacted_by | `product_features` | many_to_many | - | - |
| `customers` | impacted_by | `product_releases` | many_to_many | - | - |
| `customers` | tracked_by | `product_metrics` | many_to_many | - | - |
| `customers` | monitored_in | `beta_programs` | many_to_many | - | - |
| `crm_opportunities` | involves_contacts | `crm_contacts` | many_to_many | - | - |
| `cad_drawings` | shared_with | `customers` | many_to_many | - | - |
| `delivery_routes` | serves | `customers` | many_to_many | - | - |
| `contact_records` | enriches | `crm_contacts` | one_to_many | no | - |
| `activity_bookings` | is booked by | `customers` | many_to_many | - | - |
| `carrier_freight_invoices` | posts as | `customer_invoices` | one_to_one | no | - |

#### 5.3b Incoming relationships: the external entity points to this blueprint's entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `spare_parts_inventory` | requisitions | `purchase_requisitions` | one_to_many | no | - |
| `customers` | raises | `customer_cases` | one_to_many | yes | - |
| `customers` | holds | `customer_entitlements` | one_to_many | no | - |
| `customers` | subscribes_to | `customer_subscriptions` | one_to_many | no | - |
| `customers` | flags_churn_risk_on | `crm_opportunities` | one_to_many | no | - |
| `customers` | triggers_dunning_review_in | `customer_subscriptions` | one_to_many | no | - |
| `customer_invoices` | opens | `customer_cases` | one_to_many | no | - |
| `service_work_orders` | opens | `customer_cases` | one_to_many | no | - |
| `dispatch_records` | opens | `customer_cases` | one_to_many | no | - |
| `field_visits` | opens | `customer_cases` | one_to_many | no | - |
| `customers` | feedback_routed_from | `customer_feedback_items` | one_to_many | no | - |
| `sales_quotes` | drafts | `legal_contracts` | one_to_many | no | - |
| `customers` | has_opportunities | `crm_opportunities` | one_to_many | yes | - |
| `customers` | converted_from_lead | `crm_leads` | one_to_many | no | - |
| `crm_contacts` | converted_from_lead | `crm_leads` | one_to_many | no | - |
| `customers` | has_activities | `sales_activities` | one_to_many | no | - |
| `crm_contacts` | has_activities | `sales_activities` | one_to_many | no | - |
| `customers` | subscribes via | `csa_memberships` | one_to_many | yes | - |
| `customers` | places | `wholesale_orders` | one_to_many | yes | - |
| `customers` | places | `butcher_orders` | one_to_many | yes | - |
| `customers` | buys at | `farmers_market_sales` | one_to_many | no | - |
| `customers` | is converted by | `ad_conversion_events` | one_to_many | no | - |
| `customers` | orders | `freight_loads` | one_to_many | yes | - |
| `customers` | connects as | `edi_trading_partners` | one_to_one | no | - |
| `customers` | is billed by | `carrier_freight_invoices` | one_to_many | yes | - |
| `customers` | ships | `ltl_freight_bills` | one_to_many | yes | - |

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
| `customer_invoices` | embedded_master | - | SUB-MGMT-BILLING (SUB-MGMT) | - |
| `customer_sites` | embedded_master | - | FSM-INSTALLED-BASE (FSM) | - |
| `customers` | embedded_master | - | CRM-ACCT-MGT (CRM) | - |
| `dispatch_records` | embedded_master | - | FSM-DISPATCH-OPS (FSM) | - |
| `field_visits` | embedded_master | - | FSM-MOBILE-TECH (FSM) | - |
| `installed_equipment` | embedded_master | - | FSM-INSTALLED-BASE (FSM) | - |
| `sales_quotes` | embedded_master | - | CPQ-QUOTE-BUILDER (CPQ) | - |
| `service_contracts` | embedded_master | - | FSM-SERVICE-CONTRACTS (FSM) | - |
| `service_pm_schedules` | embedded_master | - | FSM-INSTALLED-BASE (FSM) | - |
| `service_work_orders` | embedded_master | - | FSM-DISPATCH-OPS (FSM) | - |
| `spare_parts_inventory` | embedded_master | - | HAM-WARRANTY-PARTS (HAM) | - |
| `users` | consumer | - | _(platform built-in)_ | - |

## 7. Lifecycle states

### `crm_contacts` (Contact)

_This scope holds `crm_contacts` as **embedded_master**; the canonical state machine is owned by `CRM-ACCT-MGT`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `active` | ✓ | - | _(always)_ | - | - | - | Contact is current and reachable. |
| 2 | `inactive` | - | - | _(always)_ | - | - | - | Contact is no longer engaged but record retained. |
| 3 | `unsubscribed` | - | ✓ | _(always)_ | - | - | - | Contact has opted out of all channels. |

### `customer_invoices` (Customer Invoice)

_This scope holds `customer_invoices` as **embedded_master**; the canonical state machine is owned by `SUB-MGMT-BILLING`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | _(always)_ | - | - | - | Invoice assembled but not yet issued to the customer. |
| 2 | `issued` | - | - | `SUB-MGMT-BILLING` | ✓ | - | `sub-mgmt-billing:issue_invoice` | Invoice finalized and delivered to the customer (AR open). |
| 3 | `paid` | - | ✓ | _(always)_ | - | - | - | Invoice settled in full. |
| 4 | `overdue` | - | - | _(always)_ | - | - | - | Due date elapsed without payment; dunning may trigger. |
| 5 | `written_off` | - | ✓ | _(always)_ | - | - | - | Invoice deemed uncollectible and removed from AR. |
| 6 | `voided` | - | ✓ | _(always)_ | - | - | - | Invoice canceled before settlement (correction/reissue). |

### `customer_sites` (Customer Site)

_This scope holds `customer_sites` as **embedded_master**; the canonical state machine is owned by `FSM-INSTALLED-BASE`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `prospect` | ✓ | - | `FSM-INSTALLED-BASE` | - | - | - | Site captured during sales/quote phase; no service has been performed yet. |
| 2 | `active` | - | - | `FSM-INSTALLED-BASE` | - | - | - | Site is in service; one or more installed_equipment units or active work orders exist. |
| 3 | `inactive` | - | - | `FSM-INSTALLED-BASE` | - | - | - | Site temporarily not serviced (seasonal closure, customer pause). Equipment remains on file. |
| 4 | `terminated` | - | ✓ | `FSM-INSTALLED-BASE` | ✓ | - | `fsm-installed-base:terminate_site` | Site removed from service (sold, demolished, customer churn). Triggers contract and PM termination. |

### `customers` (Customer)

_This scope holds `customers` as **embedded_master**; the canonical state machine is owned by `CRM-ACCT-MGT`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `prospect` | ✓ | - | _(always)_ | - | - | - | Pre-customer account being courted by sales. |
| 2 | `active` | - | - | _(always)_ | - | - | - | Customer is engaged and in good standing. |
| 3 | `inactive` | - | - | _(always)_ | - | - | - | Customer is dormant but not churned. |
| 4 | `past_due` | - | - | _(always)_ | - | - | - | Customer carries an overdue invoice or failed payment. |
| 5 | `canceled` | - | - | _(always)_ | - | - | - | Customer ended all subscriptions; no active billing. |
| 6 | `churned` | - | ✓ | _(always)_ | - | - | - | Customer has terminated the relationship. |

### `dispatch_records` (Dispatch Record)

_This scope holds `dispatch_records` as **embedded_master**; the canonical state machine is owned by `FSM-DISPATCH-OPS`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `pending` | ✓ | - | `FSM-DISPATCH-OPS` | - | - | - | Dispatch assignment created, awaiting technician acceptance. |
| 2 | `dispatched` | - | - | `FSM-DISPATCH-OPS` | - | - | - | Technician has been notified and accepted the assignment. |
| 3 | `en_route` | - | - | `FSM-DISPATCH-OPS` | - | - | - | Technician is traveling to the customer site. |
| 4 | `on_site` | - | - | `FSM-DISPATCH-OPS` | - | - | - | Technician has arrived at the customer site. |
| 5 | `returned` | - | ✓ | `FSM-DISPATCH-OPS` | - | - | - | Technician has departed the site; dispatch closed. |

### `field_visits` (Field Visit)

_This scope holds `field_visits` as **embedded_master**; the canonical state machine is owned by `FSM-MOBILE-TECH`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `scheduled` | ✓ | - | `FSM-MOBILE-TECH` | - | - | - | Visit is booked on the technician's calendar. |
| 2 | `in_progress` | - | - | `FSM-MOBILE-TECH` | - | - | - | Technician has started the visit on-site. |
| 3 | `completed` | - | ✓ | `FSM-MOBILE-TECH` | - | - | - | Visit finished; work performed and signed off. |
| 4 | `no_show` | - | ✓ | `FSM-MOBILE-TECH` | - | - | - | Visit could not be performed because customer or technician was absent. |

### `installed_equipment` (Installed Equipment Unit)

_This scope holds `installed_equipment` as **embedded_master**; the canonical state machine is owned by `FSM-INSTALLED-BASE`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `pending_install` | ✓ | - | `FSM-INSTALLED-BASE` | - | - | - | Unit purchased and tracked; physical installation not yet performed. |
| 2 | `active` | - | - | `FSM-INSTALLED-BASE` | ✓ | - | `fsm-installed-base:activate_equipment` | Unit installed and operational. Eligible for PM schedules and reactive work orders. |
| 3 | `service_due` | - | - | `FSM-INSTALLED-BASE` | - | - | - | PM cycle is due or reactive issue is open. Cleared when the work order completes. |
| 4 | `out_of_service` | - | - | `FSM-INSTALLED-BASE` | ✓ | - | `fsm-installed-base:mark_out_of_service` | Unit is non-operational pending repair. PM schedules paused; reactive work orders still allowed. |
| 5 | `decommissioned` | - | ✓ | `FSM-INSTALLED-BASE` | ✓ | - | `fsm-installed-base:decommission_equipment` | Unit permanently removed from service. Triggers contract coverage termination and PM schedule cancellation. |
| 6 | `replaced` | - | ✓ | `FSM-INSTALLED-BASE` | ✓ | - | `fsm-installed-base:replace_equipment` | Unit physically replaced by a new installed_equipment record. The replacement carries forward warranty and contract coverage. |

### `sales_quotes` (Sales Quote)

_This scope holds `sales_quotes` as **embedded_master**; the canonical state machine is owned by `CPQ-QUOTE-BUILDER`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | _(always)_ | - | - | - | Quote being assembled and priced by the sales rep. |
| 2 | `submitted_for_approval` | - | - | _(always)_ | ✓ | - | `cpq-quote-builder:submit_for_approval` | Quote locked and routed to the deal-desk approver. |
| 3 | `approved` | - | - | _(always)_ | ✓ | - | `cpq-quote-builder:approve_quote` | Approver authorizes the quote for presentation to the customer. |
| 4 | `presented` | - | - | _(always)_ | - | - | - | Quote delivered to the customer for decision. |
| 5 | `accepted` | - | ✓ | _(always)_ | - | - | - | Customer accepted the quote; flows to contract draft. |
| 6 | `declined` | - | ✓ | _(always)_ | - | - | - | Customer declined the quote. |
| 7 | `expired` | - | ✓ | _(always)_ | - | - | - | Quote validity window elapsed without a decision. |

### `service_contracts` (Service Contract)

_This scope holds `service_contracts` as **embedded_master**; the canonical state machine is owned by `FSM-SERVICE-CONTRACTS`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `draft` | ✓ | - | `FSM-SERVICE-CONTRACTS` | - | - | - | Contract is being drafted and not yet binding. |
| 2 | `active` | - | - | `FSM-SERVICE-CONTRACTS` | ✓ | - | `fsm-service-contracts:activate_service_contract` | Contract is in force and SLAs apply. |
| 3 | `expired` | - | ✓ | `FSM-SERVICE-CONTRACTS` | - | - | - | Contract term has ended without renewal. |
| 4 | `renewed` | - | ✓ | `FSM-SERVICE-CONTRACTS` | - | - | - | Contract has been renewed; superseded by a new term. |

### `service_pm_schedules` (Service PM Schedule)

_This scope holds `service_pm_schedules` as **embedded_master**; the canonical state machine is owned by `FSM-INSTALLED-BASE`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `scheduled` | ✓ | - | `FSM-INSTALLED-BASE` | - | - | - | Future PM cycle scheduled. No action required yet. |
| 2 | `due` | - | - | `FSM-INSTALLED-BASE` | - | - | - | Cycle has reached its due date. Triggers proactive work-order generation. |
| 3 | `in_grace` | - | - | `FSM-INSTALLED-BASE` | - | - | - | Cycle past due date but inside the grace window; auto-escalates to overdue on grace expiry. |
| 4 | `overdue` | - | - | `FSM-INSTALLED-BASE` | ✓ | - | `fsm-installed-base:escalate_overdue` | Cycle past grace; alert sent to account manager. Triggers a high-priority service work order if one is not already open. |
| 5 | `completed` | - | ✓ | `FSM-INSTALLED-BASE` | ✓ | - | `fsm-installed-base:complete_pm` | Cycle satisfied by a closed work order. Triggers the next cycle to be scheduled. |
| 6 | `skipped` | - | ✓ | `FSM-INSTALLED-BASE` | ✓ | - | `fsm-installed-base:skip_pm` | Cycle deliberately skipped (customer refused service, equipment decommissioned mid-cycle, contract lapsed). |

### `service_work_orders` (Service Work Order)

_This scope holds `service_work_orders` as **embedded_master**; the canonical state machine is owned by `FSM-DISPATCH-OPS`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `created` | ✓ | - | `FSM-DISPATCH-OPS` | - | - | - | Work order logged, awaiting scheduling. |
| 2 | `scheduled` | - | - | `FSM-DISPATCH-OPS` | - | - | - | Work order placed on the dispatch schedule. |
| 3 | `dispatched` | - | - | `FSM-DISPATCH-OPS` | - | - | - | Technician has been assigned and notified. |
| 4 | `in_progress` | - | - | `FSM-DISPATCH-OPS` | - | - | - | Technician is actively performing the work. |
| 5 | `completed` | - | - | `FSM-DISPATCH-OPS` | ✓ | - | `fsm-dispatch-ops:complete_service_work_order` | All work performed and signed off by the customer. |
| 6 | `invoiced` | - | - | `FSM-DISPATCH-OPS` | - | - | - | Work order has been billed to the customer. |
| 7 | `closed` | - | ✓ | `FSM-DISPATCH-OPS` | - | - | - | Work order finalized; no further action required. |
| 8 | `canceled` | - | ✓ | `FSM-DISPATCH-OPS` | ✓ | - | `fsm-dispatch-ops:cancel_service_work_order` | Work order canceled before completion. |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `hvac-svc-mgmt:read` | baseline-read | Read access to every entity in the module | ✓ |
| `hvac-svc-mgmt:manage` | baseline-manage | Edit operational records | ✓ |
| `hvac-svc-mgmt:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `crm-acct-mgt:read_customers` | entity-read | Read Customers | ✓ |
| `crm-acct-mgt:write_customers` | entity-write | Write Customers | ✓ |
| `crm-acct-mgt:read_crm_contacts` | entity-read | Read Contacts | ✓ |
| `crm-acct-mgt:write_crm_contacts` | entity-write | Write Contacts | ✓ |
| `sub-mgmt-billing:read_customer_invoices` | entity-read | Read Customer Invoices | ✓ |
| `sub-mgmt-billing:write_customer_invoices` | entity-write | Write Customer Invoices | ✓ |
| `fsm-mobile-tech:read_field_visits` | entity-read | Read Field Visits | ✓ |
| `fsm-mobile-tech:write_field_visits` | entity-write | Write Field Visits | ✓ |
| `fsm-dispatch-ops:read_dispatch_records` | entity-read | Read Dispatch Records | ✓ |
| `fsm-dispatch-ops:write_dispatch_records` | entity-write | Write Dispatch Records | ✓ |
| `cpq-quote-builder:read_sales_quotes` | entity-read | Read Sales Quotes | ✓ |
| `cpq-quote-builder:write_sales_quotes` | entity-write | Write Sales Quotes | ✓ |
| `ham-warranty-parts:read_spare_parts_inventory` | entity-read | Read Spare Part Inventory Items | ✓ |
| `ham-warranty-parts:write_spare_parts_inventory` | entity-write | Write Spare Part Inventory Items | ✓ |
| `fsm-dispatch-ops:read_service_work_orders` | entity-read | Read Service Work Orders | ✓ |
| `fsm-dispatch-ops:write_service_work_orders` | entity-write | Write Service Work Orders | ✓ |
| `fsm-service-contracts:read_service_contracts` | entity-read | Read Service Contracts | ✓ |
| `fsm-service-contracts:write_service_contracts` | entity-write | Write Service Contracts | ✓ |
| `fsm-installed-base:read_installed_equipment` | entity-read | Read Installed Equipment | ✓ |
| `fsm-installed-base:write_installed_equipment` | entity-write | Write Installed Equipment | ✓ |
| `fsm-installed-base:read_service_pm_schedules` | entity-read | Read Service PM Schedules | ✓ |
| `fsm-installed-base:write_service_pm_schedules` | entity-write | Write Service PM Schedules | ✓ |
| `fsm-installed-base:read_customer_sites` | entity-read | Read Customer Sites | ✓ |
| `fsm-installed-base:write_customer_sites` | entity-write | Write Customer Sites | ✓ |
| `sub-mgmt-billing:issue_invoice` | workflow-gate (lifecycle) | Transition `customer_invoices` into state `issued` | ✓ |
| `cpq-quote-builder:submit_for_approval` | workflow-gate (lifecycle) | Transition `sales_quotes` into state `submitted_for_approval` | ✓ |
| `cpq-quote-builder:approve_quote` | workflow-gate (lifecycle) | Transition `sales_quotes` into state `approved` | ✓ |
| `fsm-dispatch-ops:complete_service_work_order` | workflow-gate (lifecycle) | Transition `service_work_orders` into state `completed` | ✓ |
| `fsm-dispatch-ops:cancel_service_work_order` | workflow-gate (lifecycle) | Transition `service_work_orders` into state `canceled` | ✓ |
| `fsm-service-contracts:activate_service_contract` | workflow-gate (lifecycle) | Transition `service_contracts` into state `active` | ✓ |
| `fsm-installed-base:activate_equipment` | workflow-gate (lifecycle) | Transition `installed_equipment` into state `active` | ✓ |
| `fsm-installed-base:mark_out_of_service` | workflow-gate (lifecycle) | Transition `installed_equipment` into state `out_of_service` | ✓ |
| `fsm-installed-base:decommission_equipment` | workflow-gate (lifecycle) | Transition `installed_equipment` into state `decommissioned` | ✓ |
| `fsm-installed-base:replace_equipment` | workflow-gate (lifecycle) | Transition `installed_equipment` into state `replaced` | ✓ |
| `fsm-installed-base:escalate_overdue` | workflow-gate (lifecycle) | Transition `service_pm_schedules` into state `overdue` | ✓ |
| `fsm-installed-base:complete_pm` | workflow-gate (lifecycle) | Transition `service_pm_schedules` into state `completed` | ✓ |
| `fsm-installed-base:skip_pm` | workflow-gate (lifecycle) | Transition `service_pm_schedules` into state `skipped` | ✓ |
| `fsm-installed-base:terminate_site` | workflow-gate (lifecycle) | Transition `customer_sites` into state `terminated` | ✓ |
| `crm-acct-mgt:view_all_customers` | override (personal_content) | View all `customers` rows beyond row-scope | ✓ |
| `crm-acct-mgt:manage_all_customers` | override (personal_content) | Manage all `customers` rows beyond row-scope | ✓ |
| `crm-acct-mgt:view_all_contacts` | override (personal_content) | View all `crm_contacts` rows beyond row-scope | ✓ |
| `crm-acct-mgt:manage_all_contacts` | override (personal_content) | Manage all `crm_contacts` rows beyond row-scope | ✓ |
| `fsm-mobile-tech:view_all_field_visits` | override (personal_content) | View all `field_visits` rows beyond row-scope | ✓ |
| `fsm-mobile-tech:manage_all_field_visits` | override (personal_content) | Manage all `field_visits` rows beyond row-scope | ✓ |

_Gates with no process: `sub-mgmt-billing:issue_invoice`, `cpq-quote-builder:submit_for_approval`, `cpq-quote-builder:approve_quote`, `fsm-dispatch-ops:complete_service_work_order`, `fsm-dispatch-ops:cancel_service_work_order`, `fsm-service-contracts:activate_service_contract`, `fsm-installed-base:activate_equipment`, `fsm-installed-base:mark_out_of_service`, `fsm-installed-base:decommission_equipment`, `fsm-installed-base:replace_equipment`, `fsm-installed-base:escalate_overdue`, `fsm-installed-base:complete_pm`, `fsm-installed-base:skip_pm`, `fsm-installed-base:terminate_site`. No Accountable can hold them, so this blueprint does not support `raci`._

### 8.2 Business rules

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `customer_edit_scope` | `customers` | has_personal_content | Row-scope by default; override via `crm-acct-mgt:view_all_customers` / `crm-acct-mgt:manage_all_customers` |
| `contact_edit_scope` | `crm_contacts` | has_personal_content | Row-scope by default; override via `crm-acct-mgt:view_all_contacts` / `crm-acct-mgt:manage_all_contacts` |
| `field_visit_edit_scope` | `field_visits` | has_personal_content | Row-scope by default; override via `fsm-mobile-tech:view_all_field_visits` / `fsm-mobile-tech:manage_all_field_visits` |

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `HVAC-SVC-MGMT`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `hvac-svc-mgmt_viewer` | `hvac-svc-mgmt:read` |
| `hvac-svc-mgmt_manager` | `hvac-svc-mgmt:manage` |
| `hvac-svc-mgmt_admin` | `hvac-svc-mgmt:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `hvac-svc-mgmt:admin` | `hvac-svc-mgmt:manage` |
| `hvac-svc-mgmt:manage` | `hvac-svc-mgmt:read` |
| `hvac-svc-mgmt:read` | `crm-acct-mgt:read_customers` |
| `hvac-svc-mgmt:read` | `crm-acct-mgt:read_crm_contacts` |
| `hvac-svc-mgmt:read` | `sub-mgmt-billing:read_customer_invoices` |
| `hvac-svc-mgmt:read` | `fsm-mobile-tech:read_field_visits` |
| `hvac-svc-mgmt:read` | `fsm-dispatch-ops:read_dispatch_records` |
| `hvac-svc-mgmt:read` | `cpq-quote-builder:read_sales_quotes` |
| `hvac-svc-mgmt:read` | `ham-warranty-parts:read_spare_parts_inventory` |
| `hvac-svc-mgmt:read` | `fsm-dispatch-ops:read_service_work_orders` |
| `hvac-svc-mgmt:read` | `fsm-service-contracts:read_service_contracts` |
| `hvac-svc-mgmt:read` | `fsm-installed-base:read_installed_equipment` |
| `hvac-svc-mgmt:read` | `fsm-installed-base:read_service_pm_schedules` |
| `hvac-svc-mgmt:read` | `fsm-installed-base:read_customer_sites` |
| `hvac-svc-mgmt:manage` | `crm-acct-mgt:write_customers` |
| `crm-acct-mgt:write_customers` | `crm-acct-mgt:read_customers` |
| `hvac-svc-mgmt:manage` | `crm-acct-mgt:write_crm_contacts` |
| `crm-acct-mgt:write_crm_contacts` | `crm-acct-mgt:read_crm_contacts` |
| `hvac-svc-mgmt:manage` | `sub-mgmt-billing:write_customer_invoices` |
| `sub-mgmt-billing:write_customer_invoices` | `sub-mgmt-billing:read_customer_invoices` |
| `hvac-svc-mgmt:manage` | `fsm-mobile-tech:write_field_visits` |
| `fsm-mobile-tech:write_field_visits` | `fsm-mobile-tech:read_field_visits` |
| `hvac-svc-mgmt:manage` | `fsm-dispatch-ops:write_dispatch_records` |
| `fsm-dispatch-ops:write_dispatch_records` | `fsm-dispatch-ops:read_dispatch_records` |
| `hvac-svc-mgmt:manage` | `cpq-quote-builder:write_sales_quotes` |
| `cpq-quote-builder:write_sales_quotes` | `cpq-quote-builder:read_sales_quotes` |
| `hvac-svc-mgmt:manage` | `ham-warranty-parts:write_spare_parts_inventory` |
| `ham-warranty-parts:write_spare_parts_inventory` | `ham-warranty-parts:read_spare_parts_inventory` |
| `hvac-svc-mgmt:manage` | `fsm-dispatch-ops:write_service_work_orders` |
| `fsm-dispatch-ops:write_service_work_orders` | `fsm-dispatch-ops:read_service_work_orders` |
| `hvac-svc-mgmt:manage` | `fsm-service-contracts:write_service_contracts` |
| `fsm-service-contracts:write_service_contracts` | `fsm-service-contracts:read_service_contracts` |
| `hvac-svc-mgmt:manage` | `fsm-installed-base:write_installed_equipment` |
| `fsm-installed-base:write_installed_equipment` | `fsm-installed-base:read_installed_equipment` |
| `hvac-svc-mgmt:manage` | `fsm-installed-base:write_service_pm_schedules` |
| `fsm-installed-base:write_service_pm_schedules` | `fsm-installed-base:read_service_pm_schedules` |
| `hvac-svc-mgmt:manage` | `fsm-installed-base:write_customer_sites` |
| `fsm-installed-base:write_customer_sites` | `fsm-installed-base:read_customer_sites` |
| `hvac-svc-mgmt:admin` | `sub-mgmt-billing:issue_invoice` |
| `hvac-svc-mgmt:admin` | `cpq-quote-builder:submit_for_approval` |
| `hvac-svc-mgmt:admin` | `cpq-quote-builder:approve_quote` |
| `hvac-svc-mgmt:admin` | `fsm-dispatch-ops:complete_service_work_order` |
| `hvac-svc-mgmt:admin` | `fsm-dispatch-ops:cancel_service_work_order` |
| `hvac-svc-mgmt:admin` | `fsm-service-contracts:activate_service_contract` |
| `hvac-svc-mgmt:admin` | `fsm-installed-base:activate_equipment` |
| `hvac-svc-mgmt:admin` | `fsm-installed-base:mark_out_of_service` |
| `hvac-svc-mgmt:admin` | `fsm-installed-base:decommission_equipment` |
| `hvac-svc-mgmt:admin` | `fsm-installed-base:replace_equipment` |
| `hvac-svc-mgmt:admin` | `fsm-installed-base:escalate_overdue` |
| `hvac-svc-mgmt:admin` | `fsm-installed-base:complete_pm` |
| `hvac-svc-mgmt:admin` | `fsm-installed-base:skip_pm` |
| `hvac-svc-mgmt:admin` | `fsm-installed-base:terminate_site` |
| `hvac-svc-mgmt:admin` | `crm-acct-mgt:view_all_customers` |
| `hvac-svc-mgmt:admin` | `crm-acct-mgt:manage_all_customers` |
| `hvac-svc-mgmt:admin` | `crm-acct-mgt:view_all_contacts` |
| `hvac-svc-mgmt:admin` | `crm-acct-mgt:manage_all_contacts` |
| `hvac-svc-mgmt:admin` | `fsm-mobile-tech:view_all_field_visits` |
| `hvac-svc-mgmt:admin` | `fsm-mobile-tech:manage_all_field_visits` |

**RACI realization:**

_(none: no process_raci assignments wired to this module's gated processes yet)_

### 9.2 Functional ownership and default grants

_(none: no business_function_domains rows for this scope's domain)_
