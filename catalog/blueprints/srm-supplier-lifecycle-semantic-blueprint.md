---
artifact: semantic-blueprint
version: "3.1"
license: MIT
system_name: Supplier Lifecycle Management
tagline: Onboard, qualify, and maintain every supplier on one trusted master record.
description: Run supplier onboarding from invitation through registration, document collection, and approval. Qualify new suppliers against your standards before they go active, and keep the supplier master, contacts, and documents current as the relationship evolves. One clean record per supplier that procurement, finance, and compliance all work from.
system_slug: srm-supplier-lifecycle
domain_modules:
  - srm-supplier-lifecycle
domain_code: SRM
icon_name: handshake
related_modules: [agency-mgmt-media-buy, dairy-mgmt-herd, food-trace-supplier-provenance, fsqm-audit-supplier, inv-replenishment, pim-product-content, plm-compliance, spend-mgmt-bill-pay, srm-performance-mgmt, srm-risk-compliance, svcs-proc-engagement, tms-carrier-rates, tms-shipments, tprm-onboarding-intake, tprm-supply-chain-risk]
persona: []
supports_raci: false
created_at: 2026-11-04
---

# Supplier Lifecycle Management

## 1. Overview

Supplier master data, onboarding, registration, and qualification. The intake and master-record spine of supplier management.

## 2. Entity summary

| Name | data_object | Description |
| --- | --- | --- |
| Supplier Bank Accounts | `supplier_bank_accounts` | Validated remittance bank accounts for each supplier, holding account details, currency, and validation status. |
| Supplier Contacts | `supplier_contacts` | Named contact people for each supplier, with their role, email, phone, and primary-contact designation. |
| Supplier Documents | `supplier_documents` | Documents uploaded by or about each supplier, such as tax forms, certificates, and agreements, with type and expiry metadata. |
| Supplier Information Requests | `supplier_information_requests` | Campaigns asking suppliers to update or re-attest their information, tracked from issue through response and closure. |
| Supplier Locations | `supplier_locations` | Operating sites for each supplier, such as ship-from, remit-to, and manufacturing locations. |
| Supplier Onboardings | `supplier_onboardings` | Onboarding workflows for new suppliers, covering invitation, registration, document collection, and approval chain. |
| Supplier Qualifications | `supplier_qualifications` | Risk and compliance profiles for active suppliers, including sanctions screening, financial health, ESG scoring, and certifications. |
| Supplier Questionnaires | `supplier_questionnaires` | Reusable questionnaire templates used across qualification, performance, and risk workflows, such as insurance, security, ESG, and financial forms. |
| Supplier Registrations | `supplier_registrations` | Self-service registrations submitted by prospective suppliers before onboarding, with company, tax, and contact basics. |
| Supplier Relationships | `supplier_relationships` | Hierarchy and affiliate relationships between supplier records, such as parent, child, and affiliate. |
| Supplier Segmentation Tiers | `supplier_segmentation_tiers` | Tier classifications that rank suppliers by strategic importance, such as strategic, preferred, and transactional. |
| Supplier Tasks | `supplier_tasks` | Tasks and to-dos assigned across the supplier-management lifecycle, with assignee, due date, and status. |
| Suppliers | `suppliers` | Vendor master records, holding legal name, tax id, addresses, payment terms, contacts, currency, status, and risk profile. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  suppliers["Suppliers"]
  supplier_onboardings["Supplier Onboardings"]
  supplier_qualifications["Supplier Qualifications"]
  supplier_contacts["Supplier Contacts"]
  supplier_locations["Supplier Locations"]
  supplier_bank_accounts["Supplier Bank Accounts"]
  supplier_documents["Supplier Documents"]
  supplier_relationships["Supplier Relationships"]
  supplier_registrations["Supplier Registrations"]
  supplier_segmentation_tiers["Supplier Segmentation Tiers"]
  supplier_information_requests["Supplier Information Requests"]
  supplier_tasks["Supplier Tasks"]
  supplier_questionnaires["Supplier Questionnaires"]
  users["Users"]
  suppliers -->|"undergoes"| supplier_onboardings
  suppliers -->|"holds"| supplier_qualifications
  supplier_onboardings -->|"yields"| supplier_qualifications
  users -->|"owns"| suppliers
  users -->|"runs"| supplier_onboardings
  users -->|"approves"| supplier_onboardings
  users -->|"approves"| supplier_qualifications
  class suppliers master;
  class supplier_onboardings master;
  class supplier_qualifications master;
  class supplier_contacts master;
  class supplier_locations master;
  class supplier_bank_accounts master;
  class supplier_documents master;
  class supplier_relationships master;
  class supplier_registrations master;
  class supplier_segmentation_tiers master;
  class supplier_information_requests master;
  class supplier_tasks master;
  class supplier_questionnaires master;
  class users platform_builtin;
  style supplier_locations stroke-dasharray:5 5;
  style supplier_relationships stroke-dasharray:5 5;
  style supplier_segmentation_tiers stroke-dasharray:5 5;
  style supplier_tasks stroke-dasharray:5 5;
  style supplier_questionnaires stroke-dasharray:5 5;
```

## 3. Entities catalog

| # | data_object | catalog code | singular | plural | held_as | mastered in | mastered label | install_optional | personal_content | entity_type | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `supplier_bank_accounts` | `supplier_bank_accounts` | Supplier Bank Account | Supplier Bank Accounts | master | - | - | - | - | operational_workflow | `:manage` | - |
| 2 | `supplier_contacts` | `supplier_contacts` | Supplier Contact | Supplier Contacts | master | - | - | - | yes | operational_record | `:manage` | - |
| 3 | `supplier_documents` | `supplier_documents` | Supplier Document | Supplier Documents | master | - | - | - | - | operational_record | `:manage` | - |
| 4 | `supplier_information_requests` | `supplier_information_requests` | Supplier Information Request | Supplier Information Requests | master | - | - | - | - | operational_workflow | `:manage` | - |
| 5 | `supplier_locations` | `supplier_locations` | Supplier Location | Supplier Locations | master | - | - | yes | - | operational_record | `:manage` | - |
| 6 | `supplier_onboardings` | `supplier_onboardings` | Supplier Onboarding | Supplier Onboardings | master | - | - | - | - | operational_workflow | `:manage` | - |
| 7 | `supplier_qualifications` | `supplier_qualifications` | Supplier Qualification | Supplier Qualifications | master | - | - | - | - | operational_workflow | `:manage` | - |
| 8 | `supplier_questionnaires` | `supplier_questionnaires` | Supplier Questionnaire | Supplier Questionnaires | master | - | - | yes | - | catalog | `:admin` | - |
| 9 | `supplier_registrations` | `supplier_registrations` | Supplier Registration | Supplier Registrations | master | - | - | - | - | operational_workflow | `:manage` | - |
| 10 | `supplier_relationships` | `supplier_relationships` | Supplier Relationship | Supplier Relationships | master | - | - | yes | - | junction | `:manage` | - |
| 11 | `supplier_segmentation_tiers` | `supplier_segmentation_tiers` | Supplier Segmentation Tier | Supplier Segmentation Tiers | master | - | - | yes | - | catalog | `:admin` | - |
| 12 | `supplier_tasks` | `supplier_tasks` | Supplier Task | Supplier Tasks | master | - | - | yes | - | operational_workflow | `:manage` | - |
| 13 | `suppliers` | `suppliers` | Supplier | Suppliers | master | - | - | - | yes | operational_workflow | `:manage` | - |

## 4. Aliases and industry synonyms

_(none: no industry-scoped aliases for this scope)_

## 5. Relationships

_`field_required` applies only when both entities are installed. It never makes an entity required._

### 5.1 Relationships between entities in this blueprint

| from | verb | to | cardinality | kind | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `suppliers` | undergoes | `supplier_onboardings` | one_to_many | composition | yes | cascade | parent | - |
| `suppliers` | holds | `supplier_qualifications` | one_to_many | composition | yes | cascade | parent | - |
| `supplier_onboardings` | yields | `supplier_qualifications` | one_to_many | reference | no | clear | reference | - |

### 5.2 Relationships to platform built-ins (`users`)

| from | verb | to | cardinality | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `users` | owns | `suppliers` | one_to_many | no | clear | reference | - |
| `users` | runs | `supplier_onboardings` | one_to_many | no | clear | reference | - |
| `users` | approves | `supplier_onboardings` | one_to_many | no | clear | reference | - |
| `users` | approves | `supplier_qualifications` | one_to_many | no | clear | reference | - |

### 5.3 Relationships to entities outside this blueprint

_External entities are optional: this blueprint never installs them. If one exists at install, the relationship is proposed. A many-to-many relationship is listed under outgoing and proposed as a new junction table._

#### 5.3a Outgoing relationships: this blueprint's entity points to the external entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `audit_findings` | updates | `suppliers` | many_to_many | - | - |
| `supplier_qualifications` | requires | `supplier_certifications` | many_to_many | - | - |
| `supplier_esg_assessments` | updates | `supplier_qualifications` | one_to_many | no | - |
| `supplier_golden_records` | resolves to | `suppliers` | one_to_many | no | - |
| `supplier_certifications` | updates | `supplier_qualifications` | one_to_many | yes | - |
| `engineering_parts` | sourced_from | `suppliers` | many_to_many | - | - |
| `pim_products` | sourced_from | `suppliers` | many_to_many | - | Supplier onboarding feeds attribute data into PIM; the product can have one primary supplier and many alternates. |
| `freight_carriers` | is paid as | `suppliers` | one_to_one | no | - |

#### 5.3b Incoming relationships: the external entity points to this blueprint's entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `suppliers` | reconciles | `staffing_suppliers` | one_to_many | no | - |
| `suppliers` | holds | `supplier_certifications` | one_to_many | yes | - |
| `suppliers` | assessed_by | `supplier_risk_assessments` | one_to_many | yes | - |
| `suppliers` | rated_by | `supplier_scorecards` | one_to_many | yes | - |
| `suppliers` | enables | `sourcing_events` | one_to_many | no | - |
| `supplier_qualifications` | gates | `purchase_orders` | one_to_many | no | - |
| `suppliers` | propagates_bank_change_to | `payment_runs` | one_to_many | no | - |
| `supplier_qualifications` | unblocks | `payment_runs` | one_to_many | no | - |
| `supplier_onboardings` | creates_vendor_master_in | `bank_accounts` | one_to_many | no | - |
| `suppliers` | submits | `product_compliance_declarations` | one_to_many | yes | - |

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

### `supplier_bank_accounts` (Supplier Bank Account)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `unverified` | ✓ | - | - | - | - | - |
| 20 | `pending_validation` | - | - | - | - | - | - |
| 30 | `validated` | - | - | ✓ | - | `srm-supplier-lifecycle:validate_bank_account` | - |
| 40 | `active` | - | - | - | - | - | - |
| 50 | `inactive` | - | ✓ | - | - | - | - |

### `supplier_information_requests` (Supplier Information Request)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `draft` | ✓ | - | - | - | - | - |
| 20 | `sent` | - | - | - | - | - | - |
| 30 | `in_progress` | - | - | - | - | - | - |
| 40 | `completed` | - | ✓ | ✓ | - | `srm-supplier-lifecycle:close_information_request` | - |
| 50 | `canceled` | - | ✓ | - | - | - | - |

### `supplier_registrations` (Supplier Registration)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `draft` | ✓ | - | - | - | - | - |
| 20 | `submitted` | - | - | - | - | - | - |
| 30 | `under_review` | - | - | - | - | - | - |
| 40 | `approved` | - | ✓ | ✓ | - | `srm-supplier-lifecycle:approve_registration` | - |
| 50 | `rejected` | - | ✓ | - | - | - | - |

### `supplier_tasks` (Supplier Task)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `open` | ✓ | - | - | - | - | - |
| 20 | `in_progress` | - | - | - | - | - | - |
| 30 | `completed` | - | ✓ | - | - | - | - |
| 40 | `canceled` | - | ✓ | - | - | - | - |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `srm-supplier-lifecycle:read` | baseline-read | Read access to every entity in the module | ✓ |
| `srm-supplier-lifecycle:manage` | baseline-manage | Edit operational records | ✓ |
| `srm-supplier-lifecycle:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `srm-supplier-lifecycle:read_suppliers` | entity-read | Read Suppliers | ✓ |
| `srm-supplier-lifecycle:write_suppliers` | entity-write | Write Suppliers | ✓ |
| `srm-supplier-lifecycle:read_supplier_onboardings` | entity-read | Read Supplier Onboardings | ✓ |
| `srm-supplier-lifecycle:write_supplier_onboardings` | entity-write | Write Supplier Onboardings | ✓ |
| `srm-supplier-lifecycle:read_supplier_qualifications` | entity-read | Read Supplier Qualifications | ✓ |
| `srm-supplier-lifecycle:write_supplier_qualifications` | entity-write | Write Supplier Qualifications | ✓ |
| `srm-supplier-lifecycle:read_supplier_contacts` | entity-read | Read Supplier Contacts | ✓ |
| `srm-supplier-lifecycle:write_supplier_contacts` | entity-write | Write Supplier Contacts | ✓ |
| `srm-supplier-lifecycle:read_supplier_locations` | entity-read | Read Supplier Locations | ✓ |
| `srm-supplier-lifecycle:write_supplier_locations` | entity-write | Write Supplier Locations | ✓ |
| `srm-supplier-lifecycle:read_supplier_bank_accounts` | entity-read | Read Supplier Bank Accounts | ✓ |
| `srm-supplier-lifecycle:write_supplier_bank_accounts` | entity-write | Write Supplier Bank Accounts | ✓ |
| `srm-supplier-lifecycle:read_supplier_documents` | entity-read | Read Supplier Documents | ✓ |
| `srm-supplier-lifecycle:write_supplier_documents` | entity-write | Write Supplier Documents | ✓ |
| `srm-supplier-lifecycle:read_supplier_relationships` | entity-read | Read Supplier Relationships | ✓ |
| `srm-supplier-lifecycle:write_supplier_relationships` | entity-write | Write Supplier Relationships | ✓ |
| `srm-supplier-lifecycle:read_supplier_registrations` | entity-read | Read Supplier Registrations | ✓ |
| `srm-supplier-lifecycle:write_supplier_registrations` | entity-write | Write Supplier Registrations | ✓ |
| `srm-supplier-lifecycle:read_supplier_segmentation_tiers` | entity-read | Read Supplier Segmentation Tiers | ✓ |
| `srm-supplier-lifecycle:write_supplier_segmentation_tiers` | entity-write | Write Supplier Segmentation Tiers | ✓ |
| `srm-supplier-lifecycle:read_supplier_information_requests` | entity-read | Read Supplier Information Requests | ✓ |
| `srm-supplier-lifecycle:write_supplier_information_requests` | entity-write | Write Supplier Information Requests | ✓ |
| `srm-supplier-lifecycle:read_supplier_tasks` | entity-read | Read Supplier Tasks | ✓ |
| `srm-supplier-lifecycle:write_supplier_tasks` | entity-write | Write Supplier Tasks | ✓ |
| `srm-supplier-lifecycle:read_supplier_questionnaires` | entity-read | Read Supplier Questionnaires | ✓ |
| `srm-supplier-lifecycle:write_supplier_questionnaires` | entity-write | Write Supplier Questionnaires | ✓ |
| `srm-supplier-lifecycle:validate_bank_account` | workflow-gate (lifecycle) | Transition `supplier_bank_accounts` into state `validated` | ✓ |
| `srm-supplier-lifecycle:approve_registration` | workflow-gate (lifecycle) | Transition `supplier_registrations` into state `approved` | ✓ |
| `srm-supplier-lifecycle:close_information_request` | workflow-gate (lifecycle) | Transition `supplier_information_requests` into state `completed` | ✓ |
| `srm-supplier-lifecycle:view_all_suppliers` | override (personal_content) | View all `suppliers` rows beyond row-scope | ✓ |
| `srm-supplier-lifecycle:manage_all_suppliers` | override (personal_content) | Manage all `suppliers` rows beyond row-scope | ✓ |
| `srm-supplier-lifecycle:view_all_supplier_contacts` | override (personal_content) | View all `supplier_contacts` rows beyond row-scope | ✓ |
| `srm-supplier-lifecycle:manage_all_supplier_contacts` | override (personal_content) | Manage all `supplier_contacts` rows beyond row-scope | ✓ |

_Gates with no process: `srm-supplier-lifecycle:validate_bank_account`, `srm-supplier-lifecycle:approve_registration`, `srm-supplier-lifecycle:close_information_request`. No Accountable can hold them, so this blueprint does not support `raci`._

### 8.2 Business rules

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `supplier_edit_scope` | `suppliers` | has_personal_content | Row-scope by default; override via `srm-supplier-lifecycle:view_all_suppliers` / `srm-supplier-lifecycle:manage_all_suppliers` |
| `supplier_contact_edit_scope` | `supplier_contacts` | has_personal_content | Row-scope by default; override via `srm-supplier-lifecycle:view_all_supplier_contacts` / `srm-supplier-lifecycle:manage_all_supplier_contacts` |

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `SRM-SUPPLIER-LIFECYCLE`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `srm-supplier-lifecycle_viewer` | `srm-supplier-lifecycle:read` |
| `srm-supplier-lifecycle_manager` | `srm-supplier-lifecycle:manage` |
| `srm-supplier-lifecycle_admin` | `srm-supplier-lifecycle:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `srm-supplier-lifecycle:admin` | `srm-supplier-lifecycle:manage` |
| `srm-supplier-lifecycle:manage` | `srm-supplier-lifecycle:read` |
| `srm-supplier-lifecycle:read` | `srm-supplier-lifecycle:read_suppliers` |
| `srm-supplier-lifecycle:read` | `srm-supplier-lifecycle:read_supplier_onboardings` |
| `srm-supplier-lifecycle:read` | `srm-supplier-lifecycle:read_supplier_qualifications` |
| `srm-supplier-lifecycle:read` | `srm-supplier-lifecycle:read_supplier_contacts` |
| `srm-supplier-lifecycle:read` | `srm-supplier-lifecycle:read_supplier_locations` |
| `srm-supplier-lifecycle:read` | `srm-supplier-lifecycle:read_supplier_bank_accounts` |
| `srm-supplier-lifecycle:read` | `srm-supplier-lifecycle:read_supplier_documents` |
| `srm-supplier-lifecycle:read` | `srm-supplier-lifecycle:read_supplier_relationships` |
| `srm-supplier-lifecycle:read` | `srm-supplier-lifecycle:read_supplier_registrations` |
| `srm-supplier-lifecycle:read` | `srm-supplier-lifecycle:read_supplier_segmentation_tiers` |
| `srm-supplier-lifecycle:read` | `srm-supplier-lifecycle:read_supplier_information_requests` |
| `srm-supplier-lifecycle:read` | `srm-supplier-lifecycle:read_supplier_tasks` |
| `srm-supplier-lifecycle:read` | `srm-supplier-lifecycle:read_supplier_questionnaires` |
| `srm-supplier-lifecycle:manage` | `srm-supplier-lifecycle:write_suppliers` |
| `srm-supplier-lifecycle:write_suppliers` | `srm-supplier-lifecycle:read_suppliers` |
| `srm-supplier-lifecycle:manage` | `srm-supplier-lifecycle:write_supplier_onboardings` |
| `srm-supplier-lifecycle:write_supplier_onboardings` | `srm-supplier-lifecycle:read_supplier_onboardings` |
| `srm-supplier-lifecycle:manage` | `srm-supplier-lifecycle:write_supplier_qualifications` |
| `srm-supplier-lifecycle:write_supplier_qualifications` | `srm-supplier-lifecycle:read_supplier_qualifications` |
| `srm-supplier-lifecycle:manage` | `srm-supplier-lifecycle:write_supplier_contacts` |
| `srm-supplier-lifecycle:write_supplier_contacts` | `srm-supplier-lifecycle:read_supplier_contacts` |
| `srm-supplier-lifecycle:manage` | `srm-supplier-lifecycle:write_supplier_locations` |
| `srm-supplier-lifecycle:write_supplier_locations` | `srm-supplier-lifecycle:read_supplier_locations` |
| `srm-supplier-lifecycle:manage` | `srm-supplier-lifecycle:write_supplier_bank_accounts` |
| `srm-supplier-lifecycle:write_supplier_bank_accounts` | `srm-supplier-lifecycle:read_supplier_bank_accounts` |
| `srm-supplier-lifecycle:manage` | `srm-supplier-lifecycle:write_supplier_documents` |
| `srm-supplier-lifecycle:write_supplier_documents` | `srm-supplier-lifecycle:read_supplier_documents` |
| `srm-supplier-lifecycle:manage` | `srm-supplier-lifecycle:write_supplier_relationships` |
| `srm-supplier-lifecycle:write_supplier_relationships` | `srm-supplier-lifecycle:read_supplier_relationships` |
| `srm-supplier-lifecycle:manage` | `srm-supplier-lifecycle:write_supplier_registrations` |
| `srm-supplier-lifecycle:write_supplier_registrations` | `srm-supplier-lifecycle:read_supplier_registrations` |
| `srm-supplier-lifecycle:admin` | `srm-supplier-lifecycle:write_supplier_segmentation_tiers` |
| `srm-supplier-lifecycle:write_supplier_segmentation_tiers` | `srm-supplier-lifecycle:read_supplier_segmentation_tiers` |
| `srm-supplier-lifecycle:manage` | `srm-supplier-lifecycle:write_supplier_information_requests` |
| `srm-supplier-lifecycle:write_supplier_information_requests` | `srm-supplier-lifecycle:read_supplier_information_requests` |
| `srm-supplier-lifecycle:manage` | `srm-supplier-lifecycle:write_supplier_tasks` |
| `srm-supplier-lifecycle:write_supplier_tasks` | `srm-supplier-lifecycle:read_supplier_tasks` |
| `srm-supplier-lifecycle:admin` | `srm-supplier-lifecycle:write_supplier_questionnaires` |
| `srm-supplier-lifecycle:write_supplier_questionnaires` | `srm-supplier-lifecycle:read_supplier_questionnaires` |
| `srm-supplier-lifecycle:admin` | `srm-supplier-lifecycle:validate_bank_account` |
| `srm-supplier-lifecycle:admin` | `srm-supplier-lifecycle:approve_registration` |
| `srm-supplier-lifecycle:admin` | `srm-supplier-lifecycle:close_information_request` |
| `srm-supplier-lifecycle:admin` | `srm-supplier-lifecycle:view_all_suppliers` |
| `srm-supplier-lifecycle:admin` | `srm-supplier-lifecycle:manage_all_suppliers` |
| `srm-supplier-lifecycle:admin` | `srm-supplier-lifecycle:view_all_supplier_contacts` |
| `srm-supplier-lifecycle:admin` | `srm-supplier-lifecycle:manage_all_supplier_contacts` |

**RACI realization:**

_(none: no process_raci assignments wired to this module's gated processes yet)_

### 9.2 Functional ownership and default grants

| responsibility | business function | default role | default tier |
| --- | --- | --- | --- |
| owner | Procurement | `admin` | `:admin` |
| contributor | Governance, Risk and Compliance | `manager` | `:manage` |
| contributor | Legal | `manager` | `:manage` |
