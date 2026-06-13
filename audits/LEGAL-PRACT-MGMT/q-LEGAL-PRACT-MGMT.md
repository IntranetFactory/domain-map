# Legal Practice Management (LEGAL-PRACT-MGMT): questions waiting for you

## What this domain is
Run a law firm's day-to-day practice from one place: open and manage client matters, clear conflicts and sign engagement letters, capture billable time and invoice clients, keep client money in compliant IOLTA trust accounts, and track court deadlines and filings. It is the operational backbone that ties intake, matters, billing, trust accounting, and docketing together so nothing falls through the cracks (a missed deadline or a mishandled trust balance is the malpractice tail this domain is built to prevent).

---

q1: (answer this first) Are the sibling legal modules (Time and Billing, Trust Accounting, Court Docketing) meant to be sold and deployed on their own, or do they always ship together with Matter Management?

- a) Standalone-deployable: each module carries its own local shell of the shared matter and invoice records (promote the 4 shared "consumer" links to embedded_master).
- b) Always co-installed: Matter Management and Time and Billing are the single source of truth, so the duplicate "consumer" links are deleted.

Recommended: b. Every flagship vendor bundles matters, billing, trust, and docketing as one suite, not as a la carte modules. This choice is destructive either way (delete rows, or overwrite the role on existing rows) and it drives the matter, invoice, and intra-domain handoff fixes underneath it, so it unlocks the rest of the build.

a1:

---

q2: Should the conflict-check record be flagged as holding personal data? It stores adversary names, parties' personal identifiers, and ethics-wall annotations. (yes/no)

Recommended: yes. It clearly holds personal data, the same rationale that already flags the matter record. This overwrites an existing value, so it needs your confirmation.

a2:

---

q3: Should a court filing be flagged as having a single approver, reflecting that filings are signed by one attorney of record? (yes/no)

Recommended: yes. Court filings are typically signed by a single responsible attorney. This overwrites an existing value, so it needs your confirmation.

a3:

---

q4: Two client-contact links on the Intake/Conflict and Matter Management modules point at the firm-wide CRM contact record, which breaks each module's self-containment. How should they be resolved?

- a) Give each module its own local contact shell (convert to embedded_master).
- b) Make the contact link optional, so the module works without it (set necessity to optional).

Recommended: a. A local contact shell keeps each module standalone while still reusing the shared CRM master when it is co-installed. This rewrites an existing link, so it is a destructive change that needs your sign-off.

a4:

---

q5: The matter record carries an "Engagement" alias that collides in meaning with the separate engagement-letter record. How should the alias be handled?

- a) Keep both aliases and let the alias type and UI disambiguate them.
- b) Drop the matter-side "Engagement" alias and keep only the engagement-letter naming.
- c) Rename the matter-side alias to something less ambiguous.

Recommended: a. The catalog allows several aliases per record with no priority axis, so both can coexist if the overlap is intentional. Dropping or renaming overwrites or deletes an existing row, so it needs your call.

a5:

---

q7: Accounting Practice Management forwards engagement letter to Legal Practice Management to evaluate and manage financial performance, but Legal Practice Management does not yet have anyone assigned to evaluate and manage financial performance, so this step has no owner. How should it be handled?
- a) Record it now as work Legal Practice Management owns, and assign a named owner once Legal Practice Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Legal Practice Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a7:

---

q8: Enterprise Content Management forwards external court filing to Legal Practice Management to deliver approved content, but Legal Practice Management does not yet have anyone assigned to deliver approved content, so this step has no owner. How should it be handled?
- a) Record it now as work Legal Practice Management owns, and assign a named owner once Legal Practice Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Legal Practice Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a8:

---

q9: Core Financial Management forwards client invoice to Legal Practice Management to post AR activity to the general ledger, but Legal Practice Management does not yet have anyone assigned to post AR activity to the general ledger, so this step has no owner. How should it be handled?
- a) Record it now as work Legal Practice Management owns, and assign a named owner once Legal Practice Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Legal Practice Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a9:

---

q10: Governance, Risk and Compliance forwards trust account to Legal Practice Management to operate controls and monitor compliance with internal controls policies and procedures, but Legal Practice Management does not yet have anyone assigned to operate controls and monitor compliance with internal controls policies and procedures, so this step has no owner. How should it be handled?
- a) Record it now as work Legal Practice Management owns, and assign a named owner once Legal Practice Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Legal Practice Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a10:

---

q11: Knowledge Management forwards legal matter to Legal Practice Management to harvest knowledge, but Legal Practice Management does not yet have anyone assigned to harvest knowledge, so this step has no owner. How should it be handled?
- a) Record it now as work Legal Practice Management owns, and assign a named owner once Legal Practice Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Legal Practice Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a11:

---

## Optional (will not hold up the build)

q6: Every flagship law-firm platform ships four matter-scoped records that are not modeled yet: matter documents, key dates and deadlines, matter parties (with their roles), and legal tasks. Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. The strongest one is matter deadlines, whose absence is a malpractice-tail risk; matter parties is the next, since conflict checking cannot work cleanly without role-typed party edges.

a6:

---

<!-- agent map, ignore: q1=B2-S3 q2=B2-S1.conflictpii q3=B2-S1.filingapprover q4=B1A-SELF-CONTAIN q5=B2-S4 q6=B3-1+B3-2+B3-3+B3-4 q7=B2-B9D-OWN-300 q8=B2-B9D-OWN-429 q9=B2-B9D-OWN-1359 q10=B2-B9D-OWN-325 q11=B2-B9D-OWN-919 | domain_id=150 -->
