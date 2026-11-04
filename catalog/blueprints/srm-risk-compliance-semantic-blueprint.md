---
artifact: semantic-blueprint
version: "3.1"
license: MIT
system_name: Supplier Risk and Compliance
tagline: Assess supplier risk and prove compliance before and after you sign.
description: Score each supplier for financial, operational, cyber, and ESG risk, and keep certifications and insurance current with automatic expiry alerts. Screen suppliers for sanctions and compliance gaps, escalate elevated risk to governance and procurement, and keep a defensible record of every check behind each supplier decision.
system_slug: srm-risk-compliance
domain_modules:
  - srm-risk-compliance
domain_code: SRM
icon_name: handshake
related_modules: [food-trace-supplier-provenance, fsqm-audit-supplier, srm-supplier-lifecycle]
persona: []
supports_raci: false
created_at: 2026-11-04
---

# Supplier Risk and Compliance

## 1. Overview

Supplier risk assessment, certifications, sanctions and compliance screening, and ESG. Operational, qualification-gated supplier risk, distinct from deep third-party due diligence (TPRM).

## 2. Entity summary

| Name | data_object | Description |
| --- | --- | --- |
| Supplier Attestations | `supplier_attestations` | Declarations the supplier signs, such as code-of-conduct, modern-slavery, and conflict-minerals attestations, tracked through signature and expiry. |
| Supplier Beneficial Owners | `supplier_beneficial_owners` | Beneficial-ownership records for each supplier, capturing owner identity, ownership percentage, and verification source. |
| Supplier Certifications | `supplier_certifications` | Supplier-issued certifications such as food safety, organic, kosher, halal, allergen statements, and insurance coverage, with expiry tracking. |
| Supplier Diversity Classifications | `supplier_diversity_classifications` | Diversity spend certifications for each supplier, such as MBE, WBE, and VBE, with certifying body and expiry. |
| Supplier Insurance Certificates | `supplier_insurance_certificates` | Certificates of insurance for each supplier, with coverage type, limits, carrier, and expiry. |
| Supplier Risk Assessments | `supplier_risk_assessments` | Risk-scoring records per supplier across operational, financial, and cyber dimensions. |
| Supplier Screening Records | `supplier_screening_records` | Sanctions, denied-party, and PEP screening events per supplier, with results and adjudication trail. |
| Supplier ESG Assessments | `supplier_esg_assessments` | Supplier ESG performance profiles, with questionnaire responses, audit results, certifications, and Scope 3 estimates, refreshed annually. |
| Supplier Questionnaires | `supplier_questionnaires` | Reusable questionnaire templates used across qualification, performance, and risk workflows, such as insurance, security, ESG, and financial forms. |

```mermaid
flowchart TD
  classDef master fill:#d4f4dd,stroke:#27ae60,color:#0b3d20;
  classDef consumer fill:#e8def8,stroke:#7b1fa2,color:#3a155d;
  classDef platform_builtin fill:#e0e0e0,stroke:#424242,color:#1a1a1a;
  supplier_esg_assessments["Supplier ESG Assessments"]
  supplier_certifications["Supplier Certifications"]
  supplier_risk_assessments["Supplier Risk Assessments"]
  supplier_questionnaires["Supplier Questionnaires"]
  supplier_screening_records["Supplier Screening Records"]
  supplier_beneficial_owners["Supplier Beneficial Owners"]
  supplier_diversity_classifications["Supplier Diversity Classifications"]
  supplier_insurance_certificates["Supplier Insurance Certificates"]
  supplier_attestations["Supplier Attestations"]
  users["Users"]
  users -->|"authors"| supplier_risk_assessments
  users -->|"approves"| supplier_risk_assessments
  users -->|"uploads"| supplier_certifications
  class supplier_esg_assessments consumer;
  class supplier_certifications master;
  class supplier_risk_assessments master;
  class supplier_questionnaires consumer;
  class supplier_screening_records master;
  class supplier_beneficial_owners master;
  class supplier_diversity_classifications master;
  class supplier_insurance_certificates master;
  class supplier_attestations master;
  class users platform_builtin;
  style supplier_esg_assessments stroke-dasharray:5 5;
  style supplier_questionnaires stroke-dasharray:5 5;
  style supplier_screening_records stroke-dasharray:5 5;
  style supplier_beneficial_owners stroke-dasharray:5 5;
  style supplier_diversity_classifications stroke-dasharray:5 5;
  style supplier_insurance_certificates stroke-dasharray:5 5;
  style supplier_attestations stroke-dasharray:5 5;
```

## 3. Entities catalog

| # | data_object | catalog code | singular | plural | held_as | mastered in | mastered label | install_optional | personal_content | entity_type | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `supplier_attestations` | `supplier_attestations` | Supplier Attestation | Supplier Attestations | master | - | - | yes | - | operational_workflow | `:manage` | - |
| 2 | `supplier_beneficial_owners` | `supplier_beneficial_owners` | Supplier Beneficial Owner | Supplier Beneficial Owners | master | - | - | yes | yes | operational_record | `:manage` | - |
| 3 | `supplier_certifications` | `supplier_certifications` | Supplier Certification | Supplier Certifications | master | - | - | - | - | operational_workflow | `:manage` | - |
| 4 | `supplier_diversity_classifications` | `supplier_diversity_classifications` | Supplier Diversity Classification | Supplier Diversity Classifications | master | - | - | yes | - | operational_workflow | `:manage` | - |
| 5 | `supplier_insurance_certificates` | `supplier_insurance_certificates` | Supplier Insurance Certificate | Supplier Insurance Certificates | master | - | - | yes | - | operational_workflow | `:manage` | - |
| 6 | `supplier_risk_assessments` | `supplier_risk_assessments` | Supplier Risk Assessment | Supplier Risk Assessments | master | - | - | - | - | operational_workflow | `:manage` | - |
| 7 | `supplier_screening_records` | `supplier_screening_records` | Supplier Screening Record | Supplier Screening Records | master | - | - | yes | - | operational_workflow | `:manage` | - |
| 8 | `supplier_esg_assessments` | `supplier_esg_assessments` | Supplier ESG Assessment | Supplier ESG Assessments | consumer | - | - | yes | - | operational_workflow | `:manage` | - |
| 9 | `supplier_questionnaires` | `supplier_questionnaires` | Supplier Questionnaire | Supplier Questionnaires | consumer | `srm-supplier-lifecycle` | Supplier Lifecycle Management | yes | - | catalog | `:admin` | - |

## 4. Aliases and industry synonyms

_(none: no industry-scoped aliases for this scope)_

## 5. Relationships

_`field_required` applies only when both entities are installed. It never makes an entity required._

### 5.1 Relationships between entities in this blueprint

_(none: no relationships with both entities in this blueprint)_

### 5.2 Relationships to platform built-ins (`users`)

| from | verb | to | cardinality | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `users` | authors | `supplier_risk_assessments` | one_to_many | no | clear | reference | - |
| `users` | approves | `supplier_risk_assessments` | one_to_many | no | clear | reference | - |
| `users` | uploads | `supplier_certifications` | one_to_many | no | clear | reference | - |

### 5.3 Relationships to entities outside this blueprint

_External entities are optional: this blueprint never installs them. If one exists at install, the relationship is proposed. A many-to-many relationship is listed under outgoing and proposed as a new junction table._

#### 5.3a Outgoing relationships: this blueprint's entity points to the external entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `audit_engagements` | samples | `supplier_risk_assessments` | many_to_many | - | - |
| `suppliers` | holds | `supplier_certifications` | one_to_many | yes | - |
| `suppliers` | assessed_by | `supplier_risk_assessments` | one_to_many | yes | - |
| `supplier_qualifications` | requires | `supplier_certifications` | many_to_many | - | - |
| `supplier_risk_assessments` | sampled_by | `audit_engagements` | many_to_many | - | - |
| `supplier_certifications` | authorizes | `traceability_lots` | many_to_many | - | - |

#### 5.3b Incoming relationships: the external entity points to this blueprint's entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `supplier_risk_assessments` | feeds | `supplier_scorecards` | one_to_many | no | - |
| `supplier_esg_assessments` | updates | `supplier_qualifications` | one_to_many | no | - |
| `supplier_risk_assessments` | escalates_to | `audit_issues` | one_to_many | no | - |
| `supplier_certifications` | updates | `supplier_qualifications` | one_to_many | yes | - |

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
| `supplier_esg_assessments` | consumer | yes | _(no catalog owner recorded)_ | - |
| `supplier_questionnaires` | consumer | yes | SRM-SUPPLIER-LIFECYCLE (SRM) | - |

## 7. Lifecycle states

### `supplier_attestations` (Supplier Attestation)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `requested` | ✓ | - | - | - | - | - |
| 20 | `signed` | - | - | ✓ | - | `srm-risk-compliance:sign_attestation` | - |
| 30 | `expired` | - | ✓ | - | - | - | - |

### `supplier_certifications` (Supplier Certification)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | `uploaded` | ✓ | - | - | - | - | Certification document uploaded and awaiting verification. |
| 1 | `verified` | - | - | ✓ | - | `srm-risk-compliance:verified_supplier_certification` | Certification verified against the issuing authority and document validity. |
| 2 | `active` | - | - | - | - | - | Certification active and within its validity window. |
| 3 | `expiring` | - | - | - | - | - | Certification approaching expiry; renewal requested. |
| 4 | `expired` | - | - | - | - | - | Certification past expiry with no renewal received. |
| 5 | `renewed` | - | - | - | - | - | Certification renewed with a current valid document; validity window resets. |
| 6 | `revoked` | - | ✓ | ✓ | - | `srm-risk-compliance:revoked_supplier_certification` | Certification revoked; supplier blocked from new lot acceptance until restored. |

### `supplier_diversity_classifications` (Supplier Diversity Classification)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `valid` | ✓ | - | - | - | - | - |
| 20 | `expiring_soon` | - | - | - | - | - | - |
| 30 | `expired` | - | ✓ | - | - | - | - |
| 40 | `revoked` | - | ✓ | - | - | - | - |

### `supplier_insurance_certificates` (Supplier Insurance Certificate)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `valid` | ✓ | - | - | - | - | - |
| 20 | `expiring_soon` | - | - | - | - | - | - |
| 30 | `expired` | - | ✓ | - | - | - | - |

### `supplier_screening_records` (Supplier Screening Record)

| order | state_name | initial? | terminal? | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `pending` | ✓ | - | - | - | - | - |
| 20 | `screened` | - | - | - | - | - | - |
| 30 | `hit_review` | - | - | - | - | - | - |
| 40 | `adjudicated` | - | ✓ | ✓ | - | `srm-risk-compliance:adjudicate_screening` | - |
| 50 | `cleared` | - | ✓ | - | - | - | - |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `srm-risk-compliance:read` | baseline-read | Read access to every entity in the module | ✓ |
| `srm-risk-compliance:manage` | baseline-manage | Edit operational records | ✓ |
| `srm-risk-compliance:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `srm-risk-compliance:read_supplier_certifications` | entity-read | Read Supplier Certifications | ✓ |
| `srm-risk-compliance:write_supplier_certifications` | entity-write | Write Supplier Certifications | ✓ |
| `srm-risk-compliance:read_supplier_risk_assessments` | entity-read | Read Supplier Risk Assessments | ✓ |
| `srm-risk-compliance:write_supplier_risk_assessments` | entity-write | Write Supplier Risk Assessments | ✓ |
| `srm-supplier-lifecycle:read_supplier_questionnaires` | entity-read | Read Supplier Questionnaires | ✓ |
| `srm-risk-compliance:read_supplier_screening_records` | entity-read | Read Supplier Screening Records | ✓ |
| `srm-risk-compliance:write_supplier_screening_records` | entity-write | Write Supplier Screening Records | ✓ |
| `srm-risk-compliance:read_supplier_beneficial_owners` | entity-read | Read Supplier Beneficial Owners | ✓ |
| `srm-risk-compliance:write_supplier_beneficial_owners` | entity-write | Write Supplier Beneficial Owners | ✓ |
| `srm-risk-compliance:read_supplier_diversity_classifications` | entity-read | Read Supplier Diversity Classifications | ✓ |
| `srm-risk-compliance:write_supplier_diversity_classifications` | entity-write | Write Supplier Diversity Classifications | ✓ |
| `srm-risk-compliance:read_supplier_insurance_certificates` | entity-read | Read Supplier Insurance Certificates | ✓ |
| `srm-risk-compliance:write_supplier_insurance_certificates` | entity-write | Write Supplier Insurance Certificates | ✓ |
| `srm-risk-compliance:read_supplier_attestations` | entity-read | Read Supplier Attestations | ✓ |
| `srm-risk-compliance:write_supplier_attestations` | entity-write | Write Supplier Attestations | ✓ |
| `srm-risk-compliance:verified_supplier_certification` | workflow-gate (lifecycle) | Transition `supplier_certifications` into state `verified` | ✓ |
| `srm-risk-compliance:revoked_supplier_certification` | workflow-gate (lifecycle) | Transition `supplier_certifications` into state `revoked` | ✓ |
| `srm-risk-compliance:adjudicate_screening` | workflow-gate (lifecycle) | Transition `supplier_screening_records` into state `adjudicated` | ✓ |
| `srm-risk-compliance:sign_attestation` | workflow-gate (lifecycle) | Transition `supplier_attestations` into state `signed` | ✓ |
| `srm-risk-compliance:view_all_supplier_beneficial_owners` | override (personal_content) | View all `supplier_beneficial_owners` rows beyond row-scope | ✓ |
| `srm-risk-compliance:manage_all_supplier_beneficial_owners` | override (personal_content) | Manage all `supplier_beneficial_owners` rows beyond row-scope | ✓ |

_Gates with no process: `srm-risk-compliance:verified_supplier_certification`, `srm-risk-compliance:revoked_supplier_certification`, `srm-risk-compliance:adjudicate_screening`, `srm-risk-compliance:sign_attestation`. No Accountable can hold them, so this blueprint does not support `raci`._

### 8.2 Business rules

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `supplier_beneficial_owner_edit_scope` | `supplier_beneficial_owners` | has_personal_content | Row-scope by default; override via `srm-risk-compliance:view_all_supplier_beneficial_owners` / `srm-risk-compliance:manage_all_supplier_beneficial_owners` |

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `SRM-RISK-COMPLIANCE`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `srm-risk-compliance_viewer` | `srm-risk-compliance:read` |
| `srm-risk-compliance_manager` | `srm-risk-compliance:manage` |
| `srm-risk-compliance_admin` | `srm-risk-compliance:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `srm-risk-compliance:admin` | `srm-risk-compliance:manage` |
| `srm-risk-compliance:manage` | `srm-risk-compliance:read` |
| `srm-risk-compliance:read` | `srm-risk-compliance:read_supplier_certifications` |
| `srm-risk-compliance:read` | `srm-risk-compliance:read_supplier_risk_assessments` |
| `srm-risk-compliance:read` | `srm-supplier-lifecycle:read_supplier_questionnaires` |
| `srm-risk-compliance:read` | `srm-risk-compliance:read_supplier_screening_records` |
| `srm-risk-compliance:read` | `srm-risk-compliance:read_supplier_beneficial_owners` |
| `srm-risk-compliance:read` | `srm-risk-compliance:read_supplier_diversity_classifications` |
| `srm-risk-compliance:read` | `srm-risk-compliance:read_supplier_insurance_certificates` |
| `srm-risk-compliance:read` | `srm-risk-compliance:read_supplier_attestations` |
| `srm-risk-compliance:manage` | `srm-risk-compliance:write_supplier_certifications` |
| `srm-risk-compliance:write_supplier_certifications` | `srm-risk-compliance:read_supplier_certifications` |
| `srm-risk-compliance:manage` | `srm-risk-compliance:write_supplier_risk_assessments` |
| `srm-risk-compliance:write_supplier_risk_assessments` | `srm-risk-compliance:read_supplier_risk_assessments` |
| `srm-risk-compliance:manage` | `srm-risk-compliance:write_supplier_screening_records` |
| `srm-risk-compliance:write_supplier_screening_records` | `srm-risk-compliance:read_supplier_screening_records` |
| `srm-risk-compliance:manage` | `srm-risk-compliance:write_supplier_beneficial_owners` |
| `srm-risk-compliance:write_supplier_beneficial_owners` | `srm-risk-compliance:read_supplier_beneficial_owners` |
| `srm-risk-compliance:manage` | `srm-risk-compliance:write_supplier_diversity_classifications` |
| `srm-risk-compliance:write_supplier_diversity_classifications` | `srm-risk-compliance:read_supplier_diversity_classifications` |
| `srm-risk-compliance:manage` | `srm-risk-compliance:write_supplier_insurance_certificates` |
| `srm-risk-compliance:write_supplier_insurance_certificates` | `srm-risk-compliance:read_supplier_insurance_certificates` |
| `srm-risk-compliance:manage` | `srm-risk-compliance:write_supplier_attestations` |
| `srm-risk-compliance:write_supplier_attestations` | `srm-risk-compliance:read_supplier_attestations` |
| `srm-risk-compliance:admin` | `srm-risk-compliance:verified_supplier_certification` |
| `srm-risk-compliance:admin` | `srm-risk-compliance:revoked_supplier_certification` |
| `srm-risk-compliance:admin` | `srm-risk-compliance:adjudicate_screening` |
| `srm-risk-compliance:admin` | `srm-risk-compliance:sign_attestation` |
| `srm-risk-compliance:admin` | `srm-risk-compliance:view_all_supplier_beneficial_owners` |
| `srm-risk-compliance:admin` | `srm-risk-compliance:manage_all_supplier_beneficial_owners` |

**RACI realization:**

_(none: no process_raci assignments wired to this module's gated processes yet)_

### 9.2 Functional ownership and default grants

| responsibility | business function | default role | default tier |
| --- | --- | --- | --- |
| owner | Procurement | `admin` | `:admin` |
| contributor | Governance, Risk and Compliance | `manager` | `:manage` |
| contributor | Legal | `manager` | `:manage` |
