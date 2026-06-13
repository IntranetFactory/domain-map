# Enterprise Content Management (ECM): questions waiting for you

## What this domain is

Store, classify, and retain every document with built-in workflow and audit-ready compliance.

Enterprise Content Management gives you one trusted home for every document. Capture content from any source, version it safely with check-in and check-out, and route it through review and approval before it goes live. Apply retention schedules, legal holds, and full audit trails so the right records are kept, the rest are disposed of on time, and you can prove both whenever you are asked.

---

q1: (answer this first) Which of the per-record pattern flags on the core content objects should be turned on?

- a) Turn on all three: personal-data content on documents, single-approver sign-off on retention policies, and a submit-lock on classifications.
- b) Turn on only personal-data content on documents and single-approver on retention policies.
- c) Turn on only personal-data content on documents.
- d) Confirm all stay off (no flags), and record that decision.
- e) A custom selection (tell me which).

Recommended: a. Document content routinely holds HR, health, and contract data (personal-data), retention policies normally need a records-officer sign-off, and locking a classification once a label is applied is standard. This is first because the submit-lock decision on classifications also decides whether classifications get a small lifecycle, which feeds q7 below.

a1:

---

q2: How should the odd-one-out content object name be handled? The four other core objects use a clean prefix (document_* or records_*); this one is content_documents.

- a) Keep content_documents as-is.
- b) Rename it to the bare word documents and claim ECM as the canonical owner of that word.
- c) Rename it to ecm_documents for prefix consistency.

Recommended: b. The bare word documents is uncontested across the whole catalog and ECM is where documents are mastered; other domains consume them from here. The rename is safe (all relationship rows and handoffs reference it by id, not name).

a2:

---

q3: Two duplicate relationship rows describe the same chat-to-document edges that ECM already records from its own side, but with the direction flipped and the wrong owner. May I delete the two duplicates and keep ECM's source-side pair? (yes/no)

Recommended: yes. The kept pair is authored from the correct (source) side; the duplicates label the source as the target, which is structurally wrong. This deletes rows, so it needs your sign-off.

a3:

---

q4: Five inbound handoffs from the legal domain are tagged to legal-investigation process codes that describe the sending side, not ECM's receive-side content control. How should they be re-tagged?

- a) Delete and replace them with ECM content-cluster codes (four to "Control delivered content", one to "Deliver approved content").
- b) Keep the existing legal-side tags as the implementing process for the inbound.
- c) Record both classifications side by side.
- d) Defer to the legal domain's next audit.

Recommended: a. From ECM's perspective the activity is receive-side content control, which lives in the content cluster, not legal investigation. This deletes and replaces existing tags, so it needs your sign-off.

a4:

---

q5: The seven flagship ECM products are not yet linked, and the only two linked are both secondary from one vendor. May I draft a product description for each of the seven and surface each one to you for per-row approval before it loads? (yes/no)

Recommended: yes. The catalog floor needs at least three products and at least one primary; the naming rule means each description gets surfaced for your approval rather than bulk-written.

a5:

---

q6: The folder object is now classified as configuration data (folders get created, renamed, occasionally archived, with no per-record workflow). That already exempts it from a mandatory workflow. Do you also want a simple two-state lifecycle (active then archived) authored on it, or leave it with none? (pick one)

- a) Leave it with no lifecycle states (recommended).
- b) Author a two-state lifecycle (active then archived).

Recommended: a. Folders have no real per-record workflow, so no lifecycle is the honest call.

a6:

---

q7: The classification object is now classified as configuration data (labels exist, get applied, occasionally retired). That already exempts it from a mandatory workflow. Do you want a small two-state lifecycle (draft then locked) authored on it, which is what turning on the submit-lock in q1 would imply, or leave it with none? (pick one)

- a) Leave it with no lifecycle states.
- b) Author a two-state lifecycle (draft then locked), matching a submit-lock decision in q1.

Recommended: depends on q1. If you turn on the submit-lock there, pick (b); otherwise (a). The lifecycle shape here follows directly from the flag decision.

a7:

---

q8: When a retention policy expires, two more documents move to disposition: folders and classifications. These two cross-module steps need a small new event name each before I can wire them. May I author those two event names and the two intra-domain steps that ride them? (yes/no)

Recommended: yes. The retention-expiry step for documents themselves is already wired; these two complete the same pattern for folders and classifications. They are new events, so I held them for your nod rather than inventing the vocabulary unilaterally.

a8:

---

q9: The handoff where Data Loss Prevention forwards a document to Enterprise Content Management is tagged with the broad process "Manage Content". A more specific process that fits the same document, "Develop and manage content", already exists. May I re-point this one handoff tag from the broad process to the specific one? (yes/no)

Recommended: yes. The specific process more accurately describes what ECM does with the incoming document, and ECM already owns this work (it is the source side of the handoff), so this is a tag refinement rather than a new owner. This changes an existing tag, so it needs your sign-off.

a9:

---

q10: Data Loss Prevention forwards document classification to Enterprise Content Management to develop and manage content, but Enterprise Content Management does not yet have anyone assigned to develop and manage content, so this step has no owner. How should it be handled?
- a) Record it now as work Enterprise Content Management owns, and assign a named owner once Enterprise Content Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Enterprise Content Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a10:

---

q11: Knowledge Management forwards document version to Enterprise Content Management to deliver approved content, but Enterprise Content Management does not yet have anyone assigned to deliver approved content, so this step has no owner. How should it be handled?
- a) Record it now as work Enterprise Content Management owns, and assign a named owner once Enterprise Content Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Enterprise Content Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a11:

---

q12: Identity Governance and Administration forwards document folder to Enterprise Content Management to control delivered content, but Enterprise Content Management does not yet have anyone assigned to control delivered content, so this step has no owner. How should it be handled?
- a) Record it now as work Enterprise Content Management owns, and assign a named owner once Enterprise Content Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Enterprise Content Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a12:

---

q13: Audit Management forwards records retention policy to Enterprise Content Management to retain records, but Enterprise Content Management does not yet have anyone assigned to retain records, so this step has no owner. How should it be handled?
- a) Record it now as work Enterprise Content Management owns, and assign a named owner once Enterprise Content Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Enterprise Content Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a13:

---

<!-- agent map, ignore: q1=B2-PATTERN-FLAGS q2=B2-CONTENT-DOCUMENTS-RENAME q3=B2-DEDUPE-WSC-RELATIONSHIPS q4=B2-LSD-RETAG q5=B2-VENDOR-NAMING q6=B2-FOLDER-EXEMPTION q7=B2-CLASSIFICATION-EXEMPTION q8=B2-INTRA-RETENTION-EVENTS q9=B2-B9D-RETAG-821 q10=B2-B9D-OWN-428 q11=B2-B9D-OWN-429 q12=B2-B9D-OWN-430 q13=B2-B9D-OWN-1440 | domain_id=91 -->
