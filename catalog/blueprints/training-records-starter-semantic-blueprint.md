---
artifact: semantic-blueprint
version: "3.1"
license: MIT
system_name: Training Records (Compliance Documentation Starter)
tagline: A lightweight way to assign training and keep completion records, ready to deploy on day one.
description: Start small without standing up the full learning suite. Assign training, record completions, and keep the essential evidence a small or first-time team needs. Upgrade to the full modules later without losing any of the records you have already captured.
system_slug: training-records-starter
domain_modules:
  - training-records-starter
domain_code: LMS
icon_name: graduation-cap
related_modules: [clm-negotiation, clm-repository, hcm-lifecycle-workflows, hrsd-case-mgmt, iga-auto-provisioning, lms-automation, lms-compliance-training, lms-course-delivery, lms-credentials, lms-ct-gdpr, lms-ilt-delivery, lms-paths]
persona: [CONTRACT-OPS-MANAGER, CONTRACT-OPS-SPECIALIST, GRC-COMPLIANCE-TRAINING-MANAGER, LD-INSTRUCTOR, LD-LEARNING-ADMIN, LEGAL-COMPLIANCE-SPECIALIST, LEGAL-COUNSEL, PEOPLE-MANAGER]
supports_raci: false
created_at: 2026-11-04
---

# Training Records (Compliance Documentation Starter)

## 1. Overview

Deployable starter kit for small and mid-market organizations that outsource training delivery to external vendors (EasyLlama, Traliant, Ethena, NAVEX, KnowBe4) and need to retain audit-ready evidence in their own catalog. Embeds compliance assignments, training evidence records, learner certifications, signature records, and per-regulation training records from the full LMS-COMPLIANCE-TRAINING and LMS-CREDENTIALS modules; deploys standalone without requiring the full LMS substrate. Buyer persona: HR Director or Compliance Officer at a 50 to 500 person organization. When the org later adopts the full LMS, embedded shells deterministically demote to consumer.

## 2. Entity summary

| Name | data_object | Description |
| --- | --- | --- |
| Certifications | `learner_certifications` | Credentials issued to a worker (internal, vendor, or regulatory), with issue date, expiry, issuing body, and renewal rules. Drives recertification campaigns. |
| Compliance Regulations | `compliance_regulations` | Reference table of statutes a tenant is subject to, with jurisdiction, citation, and retention period; each tenant activates its applicable subset. |
| Compliance Training Assignments | `compliance_assignments` | Mandatory training assignments tied to a regulation, role, location, or hire event, with due dates and escalation policy. |
| DPO Training Acknowledgments | `dpo_training_acknowledgments` | Records confirming that data protection officers completed required training, evidencing GDPR compliance. |
| FDA Part 11 Audit Trails | `fda_part11_audit_trails` | Tamper-evident, retention-locked audit-trail rows for regulated training, meeting electronic-records requirements. |
| Harassment Training Acknowledgments | `harassment_training_acknowledgments` | Statutory acknowledgments that harassment training was completed, carrying a signed timestamp and IP address. |
| PCI DSS Awareness Records | `pci_dss_awareness_records` | Security-awareness training records for staff who handle card data, kept for PCI DSS compliance. |
| Signature Records | `signature_records` | E-signature envelopes with signing audit trail, IP addresses, provider references, and the signed document, one contract may have many. |
| Training Evidence Records | `training_evidence_records` | Inspection-ready training evidence packages, bundling the signed roster, certificate hash, content version, and signature record for regulators. |
| Users | `users` | Platform users referenced as assignees, authors, approvers, and creators across records. |

```mermaid
flowchart TD
  classDef embedded_master fill:#fff4cc,stroke:#c79100,color:#5b4500;
  classDef consumer fill:#e8def8,stroke:#7b1fa2,color:#3a155d;
  signature_records["Signature Records"]
  learner_certifications["Certifications"]
  compliance_assignments["Compliance Training Assignments"]
  users["Users"]
  training_evidence_records["Training Evidence Records"]
  harassment_training_acknowledgments["Harassment Training Acknowledgments"]
  fda_part11_audit_trails["FDA Part 11 Audit Trails"]
  compliance_regulations["Compliance Regulations"]
  dpo_training_acknowledgments["DPO Training Acknowledgments"]
  pci_dss_awareness_records["PCI DSS Awareness Records"]
  users -->|"must complete"| compliance_assignments
  users -->|"owns"| compliance_assignments
  users -->|"holds"| learner_certifications
  users -->|"signed"| signature_records
  compliance_assignments -->|"acknowledged_via"| harassment_training_acknowledgments
  compliance_assignments -->|"produces"| fda_part11_audit_trails
  users -->|"acknowledges"| harassment_training_acknowledgments
  users -->|"audit_trailed_in"| fda_part11_audit_trails
  compliance_regulations -->|"is_evidenced_by"| training_evidence_records
  class signature_records embedded_master;
  class learner_certifications embedded_master;
  class compliance_assignments embedded_master;
  class users consumer;
  class training_evidence_records embedded_master;
  class harassment_training_acknowledgments embedded_master;
  class fda_part11_audit_trails embedded_master;
  class compliance_regulations embedded_master;
  class dpo_training_acknowledgments embedded_master;
  class pci_dss_awareness_records embedded_master;
  style harassment_training_acknowledgments stroke-dasharray:5 5;
  style fda_part11_audit_trails stroke-dasharray:5 5;
  style compliance_regulations stroke-dasharray:5 5;
  style dpo_training_acknowledgments stroke-dasharray:5 5;
  style pci_dss_awareness_records stroke-dasharray:5 5;
```

## 3. Entities catalog

| # | data_object | catalog code | singular | plural | held_as | mastered in | mastered label | install_optional | personal_content | entity_type | write tier | notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `learner_certifications` | `learner_certifications` | Certification | Certifications | embedded_master | `lms-credentials` | Credentials, Badges and Continuing Education | - | yes | operational_workflow | `:manage` | - |
| 2 | `compliance_regulations` | `compliance_regulations` | Compliance Regulation | Compliance Regulations | embedded_master | `lms-compliance-training` | Compliance Training | yes | - | catalog | `:admin` | - |
| 3 | `compliance_assignments` | `compliance_assignments` | Compliance Training Assignment | Compliance Training Assignments | embedded_master | `lms-compliance-training` | Compliance Training | - | yes | operational_workflow | `:manage` | - |
| 4 | `dpo_training_acknowledgments` | `dpo_training_acknowledgments` | DPO Training Acknowledgment | DPO Training Acknowledgments | embedded_master | `lms-compliance-training` | Compliance Training | yes | yes | operational_record | `:manage` | - |
| 5 | `fda_part11_audit_trails` | `fda_part11_audit_trails` | FDA Part 11 Audit Trail | FDA Part 11 Audit Trails | embedded_master | `lms-compliance-training` | Compliance Training | yes | yes | operational_workflow | `:manage` | - |
| 6 | `harassment_training_acknowledgments` | `harassment_training_acknowledgments` | Harassment Training Acknowledgment | Harassment Training Acknowledgments | embedded_master | `lms-compliance-training` | Compliance Training | yes | yes | operational_workflow | `:manage` | - |
| 7 | `pci_dss_awareness_records` | `pci_dss_awareness_records` | PCI DSS Awareness Record | PCI DSS Awareness Records | embedded_master | `lms-compliance-training` | Compliance Training | yes | yes | operational_record | `:manage` | - |
| 8 | `signature_records` | `signature_records` | Signature Record | Signature Records | embedded_master | `clm-repository` | Contract Repository | - | yes | operational_workflow | `:manage` | - |
| 9 | `training_evidence_records` | `training_evidence_records` | Training Evidence Record | Training Evidence Records | embedded_master | `lms-compliance-training` | Compliance Training | - | yes | operational_workflow | `:manage` | - |
| 10 | `users` | `users` | User | Users | consumer | _(platform built-in)_ | _(platform built-in)_ | - | - | operational_record | `:manage` | - |

## 4. Aliases and industry synonyms

_(none: no industry-scoped aliases for this scope)_

## 5. Relationships

_`field_required` applies only when both entities are installed. It never makes an entity required._

### 5.1 Relationships between entities in this blueprint

| from | verb | to | cardinality | kind | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `compliance_assignments` | acknowledged_via | `harassment_training_acknowledgments` | one_to_many | reference | no | clear | reference | - |
| `compliance_assignments` | produces | `fda_part11_audit_trails` | one_to_many | reference | no | clear | reference | - |
| `compliance_regulations` | is_evidenced_by | `training_evidence_records` | one_to_many | reference | no | clear | reference | - |

### 5.2 Relationships to platform built-ins (`users`)

| from | verb | to | cardinality | field_required | delete_mode | fk_format | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `users` | must complete | `compliance_assignments` | one_to_many | yes | restrict | reference | - |
| `users` | owns | `compliance_assignments` | one_to_many | no | clear | reference | - |
| `users` | holds | `learner_certifications` | one_to_many | yes | restrict | reference | - |
| `users` | signed | `signature_records` | one_to_many | no | clear | reference | - |
| `users` | acknowledges | `harassment_training_acknowledgments` | one_to_many | yes | restrict | reference | - |
| `users` | audit_trailed_in | `fda_part11_audit_trails` | one_to_many | no | clear | reference | - |

### 5.3 Relationships to entities outside this blueprint

_External entities are optional: this blueprint never installs them. If one exists at install, the relationship is proposed. A many-to-many relationship is listed under outgoing and proposed as a new junction table._

#### 5.3a Outgoing relationships: this blueprint's entity points to the external entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `courses` | fulfills | `compliance_assignments` | one_to_many | no | - |
| `courses` | grants | `learner_certifications` | one_to_many | no | - |
| `skill_profiles` | updated by | `learner_certifications` | one_to_many | no | - |
| `hcm_positions` | requires | `compliance_assignments` | one_to_many | no | - |
| `org_units` | sponsors | `compliance_assignments` | one_to_many | no | - |
| `compliance_obligations` | tracked by | `compliance_assignments` | one_to_many | no | - |
| `employees` | reflected on | `compliance_assignments` | one_to_many | no | - |
| `legal_contracts` | witnessed_by | `signature_records` | one_to_many | yes | - |
| `envelopes` | yields | `signature_records` | one_to_many | no | - |
| `certification_definitions` | instantiated_as | `learner_certifications` | one_to_many | yes | - |
| `certificate_templates` | renders | `learner_certifications` | one_to_many | no | - |
| `compliance_training_campaigns` | generates | `compliance_assignments` | one_to_many | yes | - |
| `training_evidence_records` | supplies | `regulator_filing_exports` | many_to_many | - | - |
| `automated_enrollment_rules` | creates | `compliance_assignments` | one_to_many | no | - |

#### 5.3b Incoming relationships: the external entity points to this blueprint's entity

| from | verb | to | cardinality | field_required | notes |
| --- | --- | --- | --- | --- | --- |
| `compliance_assignments` | triggers | `iga_provisioning_events` | one_to_many | no | - |
| `compliance_assignments` | evidenced_by | `compliance_audit_records` | one_to_many | no | - |
| `training_evidence_records` | consolidates | `compliance_audit_records` | one_to_many | no | - |
| `compliance_assignments` | escalates_via | `manager_nudges` | one_to_many | no | - |

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
| `compliance_assignments` | embedded_master | - | LMS-COMPLIANCE-TRAINING (LMS) | - |
| `compliance_regulations` | embedded_master | yes | LMS-COMPLIANCE-TRAINING (LMS) | - |
| `dpo_training_acknowledgments` | embedded_master | yes | LMS-COMPLIANCE-TRAINING (LMS) | - |
| `fda_part11_audit_trails` | embedded_master | yes | LMS-COMPLIANCE-TRAINING (LMS) | - |
| `harassment_training_acknowledgments` | embedded_master | yes | LMS-COMPLIANCE-TRAINING (LMS) | - |
| `learner_certifications` | embedded_master | - | LMS-CREDENTIALS (LMS) | - |
| `pci_dss_awareness_records` | embedded_master | yes | LMS-COMPLIANCE-TRAINING (LMS) | - |
| `signature_records` | embedded_master | - | CLM-REPOSITORY (CLM) | - |
| `training_evidence_records` | embedded_master | - | LMS-COMPLIANCE-TRAINING (LMS) | - |
| `users` | consumer | - | _(platform built-in)_ | - |

## 7. Lifecycle states

### `compliance_assignments` (Compliance Training Assignment)

_This scope holds `compliance_assignments` as **embedded_master**; the canonical state machine is owned by `LMS-COMPLIANCE-TRAINING`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `assigned` | ✓ | - | _(always)_ | - | - | - | Mandatory training assignment created for a learner with due date. |
| 2 | `in_progress` | - | - | _(always)_ | - | - | - | Learner has started the underlying course or activity. |
| 3 | `completed` | - | ✓ | `LMS-COMPLIANCE-TRAINING` | ✓ | - | `lms-compliance-training:complete` | Learner finished the assignment within the due window. |
| 4 | `overdue` | - | - | _(always)_ | - | - | - | Due date passed without completion and escalation policy engaged. |
| 5 | `waived` | - | ✓ | `LMS-COMPLIANCE-TRAINING` | ✓ | - | `lms-compliance-training:waive` | Assignment formally waived by compliance owner with audit reason. |
| 6 | `expired` | - | ✓ | `LMS-COMPLIANCE-TRAINING` | ✓ | - | `lms-compliance-training:expire` | Assignment closed unmet at the regulatory deadline. |

### `fda_part11_audit_trails` (FDA Part 11 Audit Trail)

_This scope holds `fda_part11_audit_trails` as **embedded_master**; the canonical state machine is owned by `LMS-COMPLIANCE-TRAINING`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `recorded` | ✓ | - | `LMS-COMPLIANCE-TRAINING` | - | - | - | - |
| 2 | `validated` | - | - | `LMS-COMPLIANCE-TRAINING` | ✓ | - | `lms-compliance-training:validate` | - |
| 3 | `archived` | - | ✓ | `LMS-COMPLIANCE-TRAINING` | ✓ | - | `lms-compliance-training:archive` | - |

### `harassment_training_acknowledgments` (Harassment Training Acknowledgment)

_This scope holds `harassment_training_acknowledgments` as **embedded_master**; the canonical state machine is owned by `LMS-COMPLIANCE-TRAINING`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `pending` | ✓ | - | `LMS-COMPLIANCE-TRAINING` | - | - | - | - |
| 2 | `acknowledged` | - | - | `LMS-COMPLIANCE-TRAINING` | ✓ | - | `lms-compliance-training:acknowledge` | - |
| 3 | `archived` | - | ✓ | `LMS-COMPLIANCE-TRAINING` | ✓ | - | `lms-compliance-training:archive` | - |

### `learner_certifications` (Certification)

_This scope holds `learner_certifications` as **embedded_master**; the canonical state machine is owned by `LMS-CREDENTIALS`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `issued` | ✓ | - | `LMS-COMPLIANCE-TRAINING` | ✓ | - | `lms-compliance-training:issue` | Credential awarded to the learner with issue and expiry dates. |
| 2 | `active` | - | - | _(always)_ | - | - | - | Credential in force and valid for compliance or role requirements. |
| 3 | `renewing` | - | - | _(always)_ | - | - | - | Recertification campaign engaged before expiry. |
| 4 | `renewed` | - | - | `LMS-COMPLIANCE-TRAINING` | ✓ | - | `lms-compliance-training:renew` | Credential renewed with a fresh validity window. |
| 5 | `expired` | - | ✓ | _(always)_ | - | - | - | Credential past its expiry date and no longer valid. |
| 6 | `revoked` | - | ✓ | `LMS-COMPLIANCE-TRAINING` | ✓ | - | `lms-compliance-training:revoke` | Credential withdrawn by the issuing body or L&D for cause. |

### `signature_records` (Signature Record)

_This scope holds `signature_records` as **embedded_master**; the canonical state machine is owned by `CLM-REPOSITORY`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `pending` | ✓ | - | _(always)_ | - | - | - | Signature envelope created but not yet dispatched. |
| 20 | `sent` | - | - | `CLM-REPOSITORY` | - | - | - | Envelope dispatched to first signer(s); awaiting first signature. |
| 30 | `in_progress` | - | - | `CLM-REPOSITORY` | - | - | - | One or more signers have signed; others remain. |
| 40 | `completed` | - | ✓ | _(always)_ | - | - | - | All required signers have signed. The signed contract document is persisted. Terminal positive outcome. |
| 50 | `declined` | - | ✓ | _(always)_ | - | - | - | A signer declined to sign. Envelope is terminal; a new envelope can be created if negotiation re-opens. |
| 60 | `voided` | - | ✓ | `CLM-REPOSITORY` | ✓ | - | `clm-repository:void_signature_record` | Sender voided the envelope before all signers completed. Terminal. |

### `training_evidence_records` (Training Evidence Record)

_This scope holds `training_evidence_records` as **embedded_master**; the canonical state machine is owned by `LMS-COMPLIANCE-TRAINING`._

| order | state_name | initial? | terminal? | realizing module | requires_permission? | high risk? | derived gate | description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `drafted` | ✓ | - | `LMS-COMPLIANCE-TRAINING` | - | - | - | - |
| 2 | `finalized` | - | - | `LMS-COMPLIANCE-TRAINING` | ✓ | - | `lms-compliance-training:finalize` | - |
| 3 | `submitted` | - | - | `LMS-COMPLIANCE-TRAINING` | ✓ | - | `lms-compliance-training:submit` | - |
| 4 | `archived` | - | ✓ | `LMS-COMPLIANCE-TRAINING` | ✓ | - | `lms-compliance-training:archive` | - |

## 8. Permissions and business rules (derived)

### 8.1 Permissions

| permission | tier | description | included in `:admin`? |
| --- | --- | --- | --- |
| `training-records-starter:read` | baseline-read | Read access to every entity in the module | ✓ |
| `training-records-starter:manage` | baseline-manage | Edit operational records | ✓ |
| `training-records-starter:admin` | baseline-admin | Edit reference data and inherit every workflow gate below | - |
| `clm-repository:read_signature_records` | entity-read | Read Signature Records | ✓ |
| `clm-repository:write_signature_records` | entity-write | Write Signature Records | ✓ |
| `lms-credentials:read_learner_certifications` | entity-read | Read Certifications | ✓ |
| `lms-credentials:write_learner_certifications` | entity-write | Write Certifications | ✓ |
| `lms-compliance-training:read_compliance_assignments` | entity-read | Read Compliance Training Assignments | ✓ |
| `lms-compliance-training:write_compliance_assignments` | entity-write | Write Compliance Training Assignments | ✓ |
| `lms-compliance-training:read_training_evidence_records` | entity-read | Read Training Evidence Records | ✓ |
| `lms-compliance-training:write_training_evidence_records` | entity-write | Write Training Evidence Records | ✓ |
| `lms-compliance-training:read_harassment_training_acknowledgments` | entity-read | Read Harassment Training Acknowledgments | ✓ |
| `lms-compliance-training:write_harassment_training_acknowledgments` | entity-write | Write Harassment Training Acknowledgments | ✓ |
| `lms-compliance-training:read_fda_part11_audit_trails` | entity-read | Read FDA Part 11 Audit Trails | ✓ |
| `lms-compliance-training:write_fda_part11_audit_trails` | entity-write | Write FDA Part 11 Audit Trails | ✓ |
| `lms-compliance-training:read_compliance_regulations` | entity-read | Read Compliance Regulations | ✓ |
| `lms-compliance-training:write_compliance_regulations` | entity-write | Write Compliance Regulations | ✓ |
| `lms-compliance-training:read_dpo_training_acknowledgments` | entity-read | Read DPO Training Acknowledgments | ✓ |
| `lms-compliance-training:write_dpo_training_acknowledgments` | entity-write | Write DPO Training Acknowledgments | ✓ |
| `lms-compliance-training:read_pci_dss_awareness_records` | entity-read | Read PCI DSS Awareness Records | ✓ |
| `lms-compliance-training:write_pci_dss_awareness_records` | entity-write | Write PCI DSS Awareness Records | ✓ |
| `clm-repository:void_signature_record` | workflow-gate (lifecycle) | Transition `signature_records` into state `voided` | ✓ |
| `lms-compliance-training:issue` | workflow-gate (lifecycle) | Transition `learner_certifications` into state `issued` | ✓ |
| `lms-compliance-training:renew` | workflow-gate (lifecycle) | Transition `learner_certifications` into state `renewed` | ✓ |
| `lms-compliance-training:revoke` | workflow-gate (lifecycle) | Transition `learner_certifications` into state `revoked` | ✓ |
| `lms-compliance-training:complete` | workflow-gate (lifecycle) | Transition `compliance_assignments` into state `completed` | ✓ |
| `lms-compliance-training:waive` | workflow-gate (lifecycle) | Transition `compliance_assignments` into state `waived` | ✓ |
| `lms-compliance-training:expire` | workflow-gate (lifecycle) | Transition `compliance_assignments` into state `expired` | ✓ |
| `lms-compliance-training:finalize` | workflow-gate (lifecycle) | Transition `training_evidence_records` into state `finalized` | ✓ |
| `lms-compliance-training:submit` | workflow-gate (lifecycle) | Transition `training_evidence_records` into state `submitted` | ✓ |
| `lms-compliance-training:archive` | workflow-gate (lifecycle) | Transition `training_evidence_records` into state `archived`, `harassment_training_acknowledgments` into state `archived` or `fda_part11_audit_trails` into state `archived` | ✓ |
| `lms-compliance-training:acknowledge` | workflow-gate (lifecycle) | Transition `harassment_training_acknowledgments` into state `acknowledged` | ✓ |
| `lms-compliance-training:validate` | workflow-gate (lifecycle) | Transition `fda_part11_audit_trails` into state `validated` | ✓ |
| `clm-repository:view_all_signature_records` | override (personal_content) | View all `signature_records` rows beyond row-scope | ✓ |
| `clm-repository:manage_all_signature_records` | override (personal_content) | Manage all `signature_records` rows beyond row-scope | ✓ |
| `lms-credentials:view_all_certifications` | override (personal_content) | View all `learner_certifications` rows beyond row-scope | ✓ |
| `lms-credentials:manage_all_certifications` | override (personal_content) | Manage all `learner_certifications` rows beyond row-scope | ✓ |
| `lms-compliance-training:view_all_compliance_training_assignments` | override (personal_content) | View all `compliance_assignments` rows beyond row-scope | ✓ |
| `lms-compliance-training:manage_all_compliance_training_assignments` | override (personal_content) | Manage all `compliance_assignments` rows beyond row-scope | ✓ |
| `lms-compliance-training:view_all_training_evidence_records` | override (personal_content) | View all `training_evidence_records` rows beyond row-scope | ✓ |
| `lms-compliance-training:manage_all_training_evidence_records` | override (personal_content) | Manage all `training_evidence_records` rows beyond row-scope | ✓ |
| `lms-compliance-training:view_all_harassment_training_acknowledgments` | override (personal_content) | View all `harassment_training_acknowledgments` rows beyond row-scope | ✓ |
| `lms-compliance-training:manage_all_harassment_training_acknowledgments` | override (personal_content) | Manage all `harassment_training_acknowledgments` rows beyond row-scope | ✓ |
| `lms-compliance-training:view_all_fda_part_11_audit_trails` | override (personal_content) | View all `fda_part11_audit_trails` rows beyond row-scope | ✓ |
| `lms-compliance-training:manage_all_fda_part_11_audit_trails` | override (personal_content) | Manage all `fda_part11_audit_trails` rows beyond row-scope | ✓ |
| `lms-compliance-training:view_all_dpo_training_acknowledgments` | override (personal_content) | View all `dpo_training_acknowledgments` rows beyond row-scope | ✓ |
| `lms-compliance-training:manage_all_dpo_training_acknowledgments` | override (personal_content) | Manage all `dpo_training_acknowledgments` rows beyond row-scope | ✓ |
| `lms-compliance-training:view_all_pci_dss_awareness_records` | override (personal_content) | View all `pci_dss_awareness_records` rows beyond row-scope | ✓ |
| `lms-compliance-training:manage_all_pci_dss_awareness_records` | override (personal_content) | Manage all `pci_dss_awareness_records` rows beyond row-scope | ✓ |

_Gates with no process: `lms-compliance-training:renew`, `lms-compliance-training:revoke`, `lms-compliance-training:waive`, `lms-compliance-training:expire`, `lms-compliance-training:finalize`, `lms-compliance-training:archive`, `lms-compliance-training:acknowledge`, `lms-compliance-training:validate`. No Accountable can hold them, so this blueprint does not support `raci`._

### 8.2 Business rules

| rule_name | data_object | source flag | intent |
| --- | --- | --- | --- |
| `signature_record_edit_scope` | `signature_records` | has_personal_content | Row-scope by default; override via `clm-repository:view_all_signature_records` / `clm-repository:manage_all_signature_records` |
| `certification_edit_scope` | `learner_certifications` | has_personal_content | Row-scope by default; override via `lms-credentials:view_all_certifications` / `lms-credentials:manage_all_certifications` |
| `compliance_training_assignment_edit_scope` | `compliance_assignments` | has_personal_content | Row-scope by default; override via `lms-compliance-training:view_all_compliance_training_assignments` / `lms-compliance-training:manage_all_compliance_training_assignments` |
| `training_evidence_record_edit_scope` | `training_evidence_records` | has_personal_content | Row-scope by default; override via `lms-compliance-training:view_all_training_evidence_records` / `lms-compliance-training:manage_all_training_evidence_records` |
| `harassment_training_acknowledgment_edit_scope` | `harassment_training_acknowledgments` | has_personal_content | Row-scope by default; override via `lms-compliance-training:view_all_harassment_training_acknowledgments` / `lms-compliance-training:manage_all_harassment_training_acknowledgments` |
| `fda_part_11_audit_trail_edit_scope` | `fda_part11_audit_trails` | has_personal_content | Row-scope by default; override via `lms-compliance-training:view_all_fda_part_11_audit_trails` / `lms-compliance-training:manage_all_fda_part_11_audit_trails` |
| `dpo_training_acknowledgment_edit_scope` | `dpo_training_acknowledgments` | has_personal_content | Row-scope by default; override via `lms-compliance-training:view_all_dpo_training_acknowledgments` / `lms-compliance-training:manage_all_dpo_training_acknowledgments` |
| `pci_dss_awareness_record_edit_scope` | `pci_dss_awareness_records` | has_personal_content | Row-scope by default; override via `lms-compliance-training:view_all_pci_dss_awareness_records` / `lms-compliance-training:manage_all_pci_dss_awareness_records` |

## 9. Roles, RACI, and responsibilities (derived)

_Baseline roles, the permission hierarchy, and RACI realization are DERIVED from this scope's entity-type write tiers + `process_raci`; none of it is stored in the catalog (the deployer provisions it from this blueprint)._

### 9.1 `TRAINING-RECORDS-STARTER`

**Baseline roles:**

| role | baseline grant |
| --- | --- |
| `training-records-starter_viewer` | `training-records-starter:read` |
| `training-records-starter_manager` | `training-records-starter:manage` |
| `training-records-starter_admin` | `training-records-starter:admin` |

**Permission hierarchy:**

| permission | includes |
| --- | --- |
| `training-records-starter:admin` | `training-records-starter:manage` |
| `training-records-starter:manage` | `training-records-starter:read` |
| `training-records-starter:read` | `clm-repository:read_signature_records` |
| `training-records-starter:read` | `lms-credentials:read_learner_certifications` |
| `training-records-starter:read` | `lms-compliance-training:read_compliance_assignments` |
| `training-records-starter:read` | `lms-compliance-training:read_training_evidence_records` |
| `training-records-starter:read` | `lms-compliance-training:read_harassment_training_acknowledgments` |
| `training-records-starter:read` | `lms-compliance-training:read_fda_part11_audit_trails` |
| `training-records-starter:read` | `lms-compliance-training:read_compliance_regulations` |
| `training-records-starter:read` | `lms-compliance-training:read_dpo_training_acknowledgments` |
| `training-records-starter:read` | `lms-compliance-training:read_pci_dss_awareness_records` |
| `training-records-starter:manage` | `clm-repository:write_signature_records` |
| `clm-repository:write_signature_records` | `clm-repository:read_signature_records` |
| `training-records-starter:manage` | `lms-credentials:write_learner_certifications` |
| `lms-credentials:write_learner_certifications` | `lms-credentials:read_learner_certifications` |
| `training-records-starter:manage` | `lms-compliance-training:write_compliance_assignments` |
| `lms-compliance-training:write_compliance_assignments` | `lms-compliance-training:read_compliance_assignments` |
| `training-records-starter:manage` | `lms-compliance-training:write_training_evidence_records` |
| `lms-compliance-training:write_training_evidence_records` | `lms-compliance-training:read_training_evidence_records` |
| `training-records-starter:manage` | `lms-compliance-training:write_harassment_training_acknowledgments` |
| `lms-compliance-training:write_harassment_training_acknowledgments` | `lms-compliance-training:read_harassment_training_acknowledgments` |
| `training-records-starter:manage` | `lms-compliance-training:write_fda_part11_audit_trails` |
| `lms-compliance-training:write_fda_part11_audit_trails` | `lms-compliance-training:read_fda_part11_audit_trails` |
| `training-records-starter:admin` | `lms-compliance-training:write_compliance_regulations` |
| `lms-compliance-training:write_compliance_regulations` | `lms-compliance-training:read_compliance_regulations` |
| `training-records-starter:manage` | `lms-compliance-training:write_dpo_training_acknowledgments` |
| `lms-compliance-training:write_dpo_training_acknowledgments` | `lms-compliance-training:read_dpo_training_acknowledgments` |
| `training-records-starter:manage` | `lms-compliance-training:write_pci_dss_awareness_records` |
| `lms-compliance-training:write_pci_dss_awareness_records` | `lms-compliance-training:read_pci_dss_awareness_records` |
| `training-records-starter:admin` | `clm-repository:void_signature_record` |
| `training-records-starter:admin` | `lms-compliance-training:issue` |
| `training-records-starter:admin` | `lms-compliance-training:renew` |
| `training-records-starter:admin` | `lms-compliance-training:revoke` |
| `training-records-starter:admin` | `lms-compliance-training:complete` |
| `training-records-starter:admin` | `lms-compliance-training:waive` |
| `training-records-starter:admin` | `lms-compliance-training:expire` |
| `training-records-starter:admin` | `lms-compliance-training:finalize` |
| `training-records-starter:admin` | `lms-compliance-training:submit` |
| `training-records-starter:admin` | `lms-compliance-training:archive` |
| `training-records-starter:admin` | `lms-compliance-training:acknowledge` |
| `training-records-starter:admin` | `lms-compliance-training:validate` |
| `training-records-starter:admin` | `clm-repository:view_all_signature_records` |
| `training-records-starter:admin` | `clm-repository:manage_all_signature_records` |
| `training-records-starter:admin` | `lms-credentials:view_all_certifications` |
| `training-records-starter:admin` | `lms-credentials:manage_all_certifications` |
| `training-records-starter:admin` | `lms-compliance-training:view_all_compliance_training_assignments` |
| `training-records-starter:admin` | `lms-compliance-training:manage_all_compliance_training_assignments` |
| `training-records-starter:admin` | `lms-compliance-training:view_all_training_evidence_records` |
| `training-records-starter:admin` | `lms-compliance-training:manage_all_training_evidence_records` |
| `training-records-starter:admin` | `lms-compliance-training:view_all_harassment_training_acknowledgments` |
| `training-records-starter:admin` | `lms-compliance-training:manage_all_harassment_training_acknowledgments` |
| `training-records-starter:admin` | `lms-compliance-training:view_all_fda_part_11_audit_trails` |
| `training-records-starter:admin` | `lms-compliance-training:manage_all_fda_part_11_audit_trails` |
| `training-records-starter:admin` | `lms-compliance-training:view_all_dpo_training_acknowledgments` |
| `training-records-starter:admin` | `lms-compliance-training:manage_all_dpo_training_acknowledgments` |
| `training-records-starter:admin` | `lms-compliance-training:view_all_pci_dss_awareness_records` |
| `training-records-starter:admin` | `lms-compliance-training:manage_all_pci_dss_awareness_records` |

**Processes wired:**

| process_key | process_name | PCF code | PCF ID | level | description |
| --- | --- | --- | --- | --- | --- |
| `manage_contracts` | Manage contracts | 4.2.3.4 | 10291 | 4 | Keeping contracts up-to-date with routine evaluation. Maintain order and discipline with the contracts in order to avoid any loss of information and mishaps. |
| `manage_examinations` | Manage examinations and certifications | 7.3.4.6 | 20125 | 4 | Managing identified training programs for employees. Engage with industries to provide certifications, administer certification test, and maintain active certification. |
| `train_employees_appropriate` | Train employees on appropriate regulatory requirements | 2.1.3.5.1 | 12772 | 5 | Conducting training and impart learning to existing and new employees. Training will relate to the most recent/enforced regulations of the business to meet Manage regulatory requirements [12771]. |

**RACI realization:**

| actor | kind | raci | process_key | realization |
| --- | --- | --- | --- | --- |
| `CONTRACT-OPS-SPECIALIST` | persona | responsible | `manage_contracts` | the gated entities' write tier |
| `CONTRACT-OPS-MANAGER` | persona | accountable | `manage_contracts` | grant gates [clm-repository:void_signature_record] + the gated entities' write tier |
| `LEGAL-COUNSEL` | persona | consulted | `manage_contracts` | advisory read grant |
| `LD-LEARNING-ADMIN` | persona | responsible | `manage_examinations` | the gated entities' write tier |
| `GRC-COMPLIANCE-TRAINING-MANAGER` | persona | accountable | `manage_examinations` | grant gates [lms-compliance-training:issue] + the gated entities' write tier |
| `LD-INSTRUCTOR` | persona | consulted | `manage_examinations` | advisory read grant |
| `GRC-COMPLIANCE-TRAINING-MANAGER` | persona | responsible | `train_employees_appropriate` | the gated entities' write tier |
| `GRC-COMPLIANCE-TRAINING-MANAGER` | persona | accountable | `train_employees_appropriate` | grant gates [lms-compliance-training:complete, lms-compliance-training:submit] + the gated entities' write tier |
| `PEOPLE-MANAGER` | persona | consulted | `train_employees_appropriate` | advisory read grant |
| `LEGAL-COMPLIANCE-SPECIALIST` | persona | informed | `train_employees_appropriate` | notify on trigger_events [compliance_assignment.completed, training_evidence_record.submitted] |

### 9.2 Functional ownership and default grants

| responsibility | business function | default role | default tier |
| --- | --- | --- | --- |
| owner | Learning and Development | `admin` | `:admin` |
| contributor | Governance, Risk and Compliance | `manager` | `:manage` |
| contributor | Legal | `manager` | `:manage` |
| consumer | Manufacturing Operations | `viewer` | `:read` |
| consumer | Sales | `viewer` | `:read` |
| consumer | Software Engineering | `viewer` | `:read` |
