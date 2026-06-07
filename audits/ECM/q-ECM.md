# Enterprise Content Management (ECM): questions waiting for you

## What this domain is

Enterprise Content Management is where the business captures, stores, classifies, and controls its documents from creation through final disposition. It runs versioning and check-in/check-out on a single trusted copy, routes documents through review and approval workflows, and applies the retention schedules, legal holds, and audit trails that keep records compliant. The three modules already built cover the content repository and capture, records management and governance, and document workflow automation.

---

q1: (answer this first) Which of the per-record pattern flags on the five core content objects should be turned on?

- a) Turn on all three: personal-data content on documents, single-approver sign-off on retention policies, and a submit-lock on classifications.
- b) Turn on only personal-data content on documents and single-approver on retention policies.
- c) Turn on only personal-data content on documents.
- d) Confirm all five objects stay off (no flags), and record that decision.
- e) A custom selection (tell me which).

Recommended: a. Document content routinely holds HR, health, and contract data (personal-data), retention policies normally need a records-officer sign-off, and locking a classification once a label is applied is standard. This answer is first because flipping the submit-lock on classifications decides whether classifications get a small lifecycle, which feeds the classification question below.

a1:

---

q2: What should be done about the domain-level catalog tagline and description, which are still empty?

- a) You supply the exact tagline and description text.
- b) Approve my draft verbatim. Draft tagline: "Store, classify, and retain every document with built-in workflow and audit-ready compliance."
- c) Approve a revised wording (give me the edits).
- d) Defer to a later audit.

Recommended: b. The draft is in buyer voice and covers the repository, classification, retention, and workflow story; the three modules already carry their own approved text, so only the domain card is missing.

a2:

---

q3: How should the odd-one-out content object name be handled? The four other core objects use a clean prefix (document_* or records_*); this one is content_documents.

- a) Keep content_documents as-is.
- b) Rename it to the bare word documents and claim ECM as the canonical owner of that word.
- c) Rename it to ecm_documents for prefix consistency.

Recommended: b. The bare word documents is uncontested across the whole catalog and ECM is where documents are mastered; other domains consume them from here. The rename is safe (all 27 relationship rows and 5 handoffs reference it by id, not name).

a3:

---

q4: Two duplicate relationship rows describe the same chat-to-document edges that ECM already records from its own side, but with the direction flipped and the wrong owner. May I delete the two duplicates and keep ECM's source-side pair? (yes/no)

Recommended: yes. The kept pair is authored from the correct (source) side; the duplicates label the source as the target, which is structurally wrong. This deletes rows, so it needs your sign-off.

a4:

---

q5: Five inbound handoffs from the legal domain are tagged to legal-investigation process codes that describe the sending side, not ECM's receive-side content control. How should they be re-tagged?

- a) Delete and replace them with ECM content-cluster codes (four to "Control delivered content", one to "Deliver approved content").
- b) Keep the existing legal-side tags as the implementing process for the inbound.
- c) Record both classifications side by side.
- d) Defer to the legal domain's next audit.

Recommended: a. From ECM's perspective the activity is receive-side content control, which lives in the content cluster, not legal investigation. This deletes and replaces existing tags, so it needs your sign-off.

a5:

---

q6: The seven flagship ECM products are not yet linked, and the only two linked are both secondary from one vendor. May I draft a product description for each of the seven and surface each one to you for per-row approval before it loads? (yes/no)

Recommended: yes. The catalog floor needs at least three products and at least one primary; the naming rule means each description gets surfaced for your approval rather than bulk-written.

a6:

---

q7: The folder object reads as configuration (folders get created, renamed, occasionally archived) with no per-record workflow. How should its lifecycle be treated?

- a) Confirm the configuration-shape exemption (no lifecycle states).
- b) Author a simple two-state lifecycle (active then archived).
- c) Defer to a later audit.

Recommended: a. Folders have no real per-record workflow, so the exemption is the honest call and it must be positively confirmed each audit.

a7:

---

q8: The classification object also reads as configuration (labels exist, get applied, occasionally retired). How should its lifecycle be treated?

- a) Confirm the configuration-shape exemption (no lifecycle states).
- b) Author a two-state lifecycle (draft then locked), which is what the submit-lock flag in q1 would imply.
- c) Defer alongside q1.

Recommended: depends on q1. If you turn on the submit-lock there, pick (b); otherwise (a). The lifecycle shape here follows directly from the flag decision.

a8:

---

<!-- agent map, ignore: q1=B2-PATTERN-FLAGS q2=B2-CATALOG-UX q3=B2-CONTENT-DOCUMENTS-RENAME q4=B2-DEDUPE-WSC-RELATIONSHIPS q5=B2-LSD-RETAG q6=B2-VENDOR-NAMING q7=B2-FOLDER-EXEMPTION q8=B2-CLASSIFICATION-EXEMPTION | domain_id=91 -->
