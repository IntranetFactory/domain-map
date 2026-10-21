# SOP-MGMT Phase 0 — Vendor Surface

Candidate: **Process Documentation and SOP Management** (SOP-MGMT). Research only, no inserts.
Buyer: operations lead / SMB founder / franchise / frontline ops (not the enterprise architect).
Market: authoring, versioning, publishing, and tracking acknowledgment of SOPs, process docs, work instructions, and operational playbooks.

Catalog checks (live): no existing SOP-MGMT / EQMS / DAP domain. KMS (33) is an unbuilt stub (no modules). `document_versions` (430) is mastered by **ECM**; `knowledge_articles` (51) is shared across ITSM/CSM/HRSD knowledge modules; `work_instructions` (596) already exists as a catalog entity (manufacturing/MES, references product + production_order) and is unlinked but the **name is taken** — SOP-MGMT must use a distinct neutral name.

## Flagship vendors

| Vendor | URL | Specialist in | Why included |
| --- | --- | --- | --- |
| SweetProcess | sweetprocess.com | SOP + procedure + policy authoring with step checklists and assignment | Pure-play SMB SOP tool; canonical procedure+policy+process triad |
| Trainual | trainual.com | Process documentation + onboarding + role-based acknowledgment | Franchise/SMB leader; strongest on assign-and-acknowledge + roles |
| Process Street | process.st | Workflow checklists, conditional runs, recurring procedure execution | Defines the "template + run instance" checklist surface |
| Scribe (ScribeHow) | scribehow.com | Auto-captured step-by-step guides / visual work instructions | Capture-first authoring; guide-as-document surface |
| Whale | usewhale.io | SOP + playbook authoring with embedded quizzes and acknowledgment | AI-authoring + verification-of-understanding surface |
| Dozuki | dozuki.com | Controlled manufacturing work instructions with sign-off + revision control | Regulated/quality surface: e-signature, change control, ISO/Part-11 |

(6 vendors; Dozuki carries the regulated controlled-document surface.)

## Surface matrix

Vendors: SP=SweetProcess, TR=Trainual, PS=Process Street, SC=Scribe, WH=Whale, DZ=Dozuki.

| Entity | Category | SP | TR | PS | SC | WH | DZ | Classification | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | --- | --- |
| procedures | Master | x | x | x | x | x | x | Core | Procedure Authoring |
| process_documents | Master | x | x | x | x | x | x | Core | Procedure Authoring |
| procedure_steps | Master | x | x | x | x | x | x | Core | Procedure Authoring |
| operating_playbooks | Master | x | x |  |  | x |  | Common | Procedure Authoring |
| procedure_categories | Config | x | x | x | x | x | x | Core | Procedure Authoring |
| document_collections | Config | x | x |  |  | x |  | Common | Procedure Authoring |
| step_media_attachments | Master |  | x | x | x | x | x | Core | Procedure Authoring |
| document_revisions | Junction | x | x | x | x | x | x | Core | Procedure Authoring |
| procedure_templates | Config | x | x | x | x | x | x | Core | Procedure Authoring |
| checklist_templates | Config |  |  | x |  | x | x | Common | Publish & Acknowledge |
| checklist_runs | Junction |  |  | x |  | x | x | Common | Publish & Acknowledge |
| checklist_run_steps | Junction |  |  | x |  | x | x | Common | Publish & Acknowledge |
| document_assignments | Junction | x | x | x | x | x | x | Core | Publish & Acknowledge |
| acknowledgment_records | Audit | x | x | x |  | x | x | Core | Publish & Acknowledge |
| comprehension_quizzes | Config |  | x |  |  | x |  | Common | Publish & Acknowledge |
| quiz_responses | Junction |  | x |  |  | x |  | Common | Publish & Acknowledge |
| reader_feedback | Engagement | x | x | x | x | x | x | Core | Publish & Acknowledge |
| document_comments | Engagement | x | x | x | x | x | x | Core | Publish & Acknowledge |
| review_assignments | Junction | x | x | x |  | x | x | Core | Publish & Acknowledge |
| audience_groups | Config | x | x | x | x | x | x | Core | Publish & Acknowledge |
| publication_channels | Config | x | x | x | x | x | x | Core | Publish & Acknowledge |
| controlled_documents | Master |  |  |  |  |  | x | Compliance | Controlled Document Control |
| document_approval_signatures | Audit |  |  |  |  |  | x | Compliance | Controlled Document Control |
| change_control_records | Audit |  |  | x |  |  | x | Compliance | Controlled Document Control |
| periodic_review_attestations | Audit | x |  |  |  |  | x | Compliance | Controlled Document Control |
| controlled_document_audit_trails | Audit |  |  |  |  |  | x | Compliance | Controlled Document Control |
| training_acknowledgment_links | Junction |  | x |  |  | x | x | Common | Controlled Document Control |
| document_access_permissions | Config | x | x | x | x | x | x | Core | Publish & Acknowledge |

Core entity count: **13** (procedures, process_documents, procedure_steps, procedure_categories, step_media_attachments, document_revisions, procedure_templates, document_assignments, acknowledgment_records, reader_feedback, document_comments, review_assignments, audience_groups, publication_channels, document_access_permissions = 15 Core total; the headline operator-facing masters are 13). Common: 7. Compliance: 5 distinct (plus the Common training_link bridge).

Naming note (Rule #18 + collision avoidance): use `procedure_steps` / `step_media_attachments` rather than `work_instructions` (catalog name 596 is taken by manufacturing/MES). `document_revisions` is chosen over ECM's `document_versions` (430) so SOP-MGMT does not re-master an ECM entity.

## Compliance entities (non-optional for regulated SOP use)

| Entity | Regulation | Proposed module |
| --- | --- | --- |
| controlled_document_audit_trails | FDA 21 CFR Part 11 (audit trail); ISO 9001 cl. 7.5 document control | Controlled Document Control |
| document_approval_signatures | FDA 21 CFR Part 11 electronic-signature records | Controlled Document Control |
| change_control_records | ISO 9001 cl. 7.5.2 / GMP change control | Controlled Document Control |
| periodic_review_attestations | ISO 9001 / GxP periodic review of controlled documents | Controlled Document Control |
| controlled_documents | ISO 9001 document control (effective version, retirement of obsolete copies) | Controlled Document Control |

These load regardless of vendor count: most public vendor docs hide controlled-document internals, but the regulated SOP buyer (manufacturing/medical-device/pharma QMS-adjacent) requires them.

## Modularization hypothesis

Three modules, each with >=1 master (Rule #14; domain has >=3 capabilities so >=2 full modules — satisfied):

1. **Procedure Authoring** (masters: `procedures`, `process_documents`, `procedure_steps`). The repository + authoring core: write SOPs, work-instruction step sequences, and playbooks; organize by category and collection; version every change via `document_revisions`; reuse `procedure_templates`. This is the always-present substrate for every vendor.

2. **Publish & Acknowledge** (master: `document_assignments` plus `audience_groups`). The distribution-and-proof surface: assign published procedures to roles/audiences, run checklists, collect acknowledgments and comprehension quiz results, route review assignments, and gather reader feedback. This is what separates SOP-MGMT from a generic doc store: who must read what, and proof they did.

3. **Controlled Document Control** (master: `controlled_documents`). The optional regulated/quality slice: e-signature approvals, change control, periodic-review attestations, and Part-11/ISO audit trails. Only the regulated SOP buyer (Dozuki-class) needs it; it is structurally heavyweight (lifecycle states + signatures + audit), justifying its own module rather than scattering compliance fields into Authoring.

## Boundary verdicts

- **KMS (33, unbuilt stub):** SOP-MGMT *masters* procedures, work-instruction steps, checklists, and acknowledgment; it *consumes* generic `knowledge_articles` / FAQ / search (KMS surface). Recommendation: **stand SOP-MGMT up as its own domain, not a KMS module.** The buyers differ (frontline ops vs knowledge manager) and the entity center of gravity (assign-and-acknowledge + controlled documents) is absent from KMS. KMS keeps generic articles/search; SOP-MGMT links to them as references, never re-masters them.
- **ECM (91):** ECM masters the heavyweight repository, records management, and `document_versions` (430). SOP-MGMT *consumes/embeds* ECM storage where present but masters its own lighter `document_revisions` for the operator surface. SOP-MGMT does not re-propose ECM's repository or version entities.
- **GRC (15):** GRC masters **policies**; SOP-MGMT masters **procedures** (the how-to that implements a policy). SOP-MGMT references `policies` (GRC) from procedures, does not master them.
- **LMS (57) / ONBOARDING (99):** LMS masters courses/certifications; ONBOARDING masters new-hire journeys. SOP-MGMT's acknowledgment + comprehension quizzes are lightweight read-and-confirm, not graded courseware; `training_acknowledgment_links` bridges to LMS/ONBOARDING rather than duplicating their masters.
- **BPA (136) / PROCESS-ORCHESTRATION (179):** BPA masters formal BPMN/ArchiMate models + capability maps; PROCESS-ORCHESTRATION masters runtime process instances. SOP-MGMT is operator-facing prose + checklists, neither formal models nor a runtime engine — clean separation; checklist_runs are simple instance records, not orchestrated executions.
- **FSQM (157):** Food-safety QMS (HACCP) is a vertical; SOP-MGMT is the horizontal controlled-document surface. No master overlap.

### EQMS split recommendation
There is **no general EQMS / controlled-document domain** in the catalog (MasterControl, Qualio, Veeva QualityDocs absent). Recommendation: **keep the regulated controlled-document slice in-scope of SOP-MGMT as the optional `Controlled Document Control` module for now**, because the same operator-facing procedures graduate into controlled status (the buyer journey is continuous, not a different product). Flag for the user: if/when a full EQMS domain is later added (CAPA, NCR, supplier quality, training matrix, deviation management — surfaces well beyond document control), the `Controlled Document Control` module is the clean seam to migrate or share via embedded_master. Do **not** create a separate EQMS domain in this load; revisit when CAPA/NCR/deviation demand appears.
