# Process Documentation and SOP Management (SOP-MGMT): one question left

## What this domain is
Process Documentation and SOP Management is the software for writing standard operating procedures, work instructions, and operational playbooks, publishing them to the right people, and proving those people actually read and understood them. The center of gravity is the assign-and-acknowledge loop: assign a published procedure to a role or audience, track who has read it, run checklists against it, and bring it back for periodic review.

Decided so far: **promote as its own domain**; **two core modules** (Procedure Authoring; Publish & Acknowledge), with the regulated controlled-document slice **deferred to a future EQMS domain**; and **document-surface-only** (in-app overlay delivery is a separate future DAP domain). One scope question remains before I write to the catalog.

---

q1: Confirm the bounded scope. SOP-MGMT masters its own procedure + acknowledge surface across the two core modules, and links the adjacent KMS / GRC / ECM records as consumer + optional. Good to go?

- a) Bounded + consumer/optional: SOP-MGMT masters procedures, process_documents, procedure_steps, document_revisions, document_assignments, acknowledgment_records. It links knowledge_articles (KMS), policies (GRC), document_versions (ECM) as consumer + optional cross-links that only light up when those domains are co-installed.
- b) Embedded_master the adjacent records: SOP-MGMT carries its own local shells of knowledge_articles / policies / document_versions and demotes to the canonical master when KMS/GRC/ECM are present.
- c) Broad re-master: SOP-MGMT keeps independent copies of knowledge articles, policies, and a document repository.

Recommended: a. You asked (a1): "when I just use SOP, would I not need knowledge articles or GRC policies to make SOP viable?" The answer is no, you would not. Standalone SOP-MGMT is fully viable on records it masters itself: author a procedure, publish it, assign it, capture acknowledgment, schedule periodic review, a complete product with zero KMS or GRC installed (this is exactly how SweetProcess, Process Street, Trainual, Whale, and Dozuki ship). Knowledge articles and policies are enrichment that only matters when those domains are also installed: a procedure may cross-link to a related KB article, or to the policy it implements, for traceability. Because they are not needed to operate, the role is consumer + optional (not embedded_master, which is for a record you must carry locally, and not consumer + required, which would break standalone deploy). The only outside record SOP-MGMT needs standalone is the platform built-in `users`. So your question confirms option (a). A "yes" here is my go signal to run the full load. (yes/no on option a)

a1:

---

<!-- agent map, ignore: q1=B2-SOP-SCOPE | domain_id=null (unbuilt candidate) -->
