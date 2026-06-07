# Human Capital Management (HCM): questions waiting for you

## What this domain is
The system of record for your people: who they are, the roles and positions they hold, the org structure they sit in, and every change across the hire-to-retire journey.

Hold the canonical worker record, the position and job-profile catalog, and the org chart, then drive the lifecycle events (joiners, transfers, promotions, contract changes, leavers) that fan out to payroll, benefits, access provisioning, learning, and the rest of the business. It is the upstream truth that the people-facing parts of your stack consume.

---

q1: (answer this first) The lifecycle and workflows module carries only baseline permissions (read, manage, admin) and no self-service workflow gates, because every lifecycle state lives on the core-worker and positions modules. Is that the intended architecture, or should self-service workflow gates be added to it?

- a) Keep it baseline-only (lifecycle writes delegate through the master-owning modules' gates).
- b) Add specific self-service workflow gates (for example submit absence request, complete offboarding task), and tell me which.

Recommended: a. The module owns no master data, so baseline-only is the clean shape; this decision also unblocks the target-module assignment for the inbound handoffs that land on it, so it drives the rest of the build.

a1:

---

q2: Should the org-unit-created event be classified as a lifecycle event (like an employee being created) or as a state-change event (a draft-to-active transition, like an org unit being merged or disbanded)?

- a) lifecycle (treat org-unit instantiation as a lifecycle stage).
- b) state_change (treat draft-to-active as a state-machine transition, matching org-unit merged and disbanded).

Recommended: b. The sibling org-unit events (merged, disbanded) were just set to state_change, so state_change keeps the org-unit lifecycle events consistent.

a2:

---

q3: A prior pass blanked the notes on 9 rows (8 domain-data-object rows and 1 module-data-object row) because they were auto-populated and never explicitly approved. Confirm that blanking them is acceptable as the safe default? (yes/no)

Recommended: yes. Blanking auto-populated notes is the safe-by-default behavior; the alternative is to dictate exact wording to restore per row.

a3:

---

q4: Should employment contracts be flagged as carrying personal content, given they hold compensation, signatory names, and jurisdiction? (yes/no)

Recommended: yes. Contracts plainly carry personal and sensitive data, so the flag should be true.

a4:

---

q5: Should employment events be flagged as carrying personal content, given transfers and leaves may carry FMLA or health-related data? (yes/no)

Recommended: yes. Leave and transfer events can carry health or family-leave data, so the flag should be true.

a5:

---

q6: Several inbound handoffs already carry a weak or wrong process tag. Two are clearly wrong: an HR case-access handoff is mapped to "Manage customer service problems," and an attrition-forecast handoff is mapped to "Analyze customer attrition and retention rates." Replacing an existing tag is a destructive overwrite, so it needs your sign-off. How should these be handled?

- a) Replace all roughly 9 candidates with corrected process tags.
- b) Replace only the two clearly wrong ones (HR case-access and attrition-forecast); leave the rest as-is.
- c) Leave all as-is for now.
- d) Decide row by row (I will list each).

Recommended: b. The two wrong mappings are unambiguous fixes; the other rows are defensible as-is and can be confirmed later, which keeps the destructive overwrite minimal.

a6:

---

q7: Seven dependency rows on HCM modules point at entities mastered by other domains (from IT asset management, the applicant tracker, and onboarding) while being marked required, which breaks module self-containment. Fixing each is a destructive rewrite of an existing row, so it needs your sign-off. Should I apply the per-row fix (carry a local embedded shell, or relax the dependency to optional)? (yes/no)

Recommended: yes. Each row should either embed a local shell or be relaxed to optional so the modules stand on their own; this overwrites existing values, so it needs your confirmation.

a7:

---

q8: The applicant tracker auto-creates a candidate record from an existing employee when that employee applies for an internal posting, but there is no handoff for this internal-mobility case today. Should I author one (it requires a new employee-transferred trigger event), or skip it?

- a) Skip; internal mobility runs in the applicant tracker independently.
- b) Author the handoff on employee-transferred to candidates (mints a new trigger event).

Recommended: a. The existing cross-domain candidate read may already cover this, so skip unless you want the explicit handoff modeled.

a8:

---

q9: An absence-requests dependency is declared at the domain level, and the WFM absence-approved handoff targets the lifecycle and workflows module. Confirm the existing module-level dependency row already covers this, or add a mirror?

- a) Confirm the existing module-level row covers it.
- b) Add a mirror dependency row.

Recommended: a. The module-level row appears to already pin the consumer dependency, so confirm rather than duplicate.

a9:

---

## Optional (will not hold up the build)

q10: Flagship HCM platforms model a set of person-adjacent entities that HCM does not yet carry: dependents, emergency contacts, work-eligibility documents, national IDs, worker addresses, worker bank accounts, medical certifications, I-9 records, and pay-equity assessments. Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Several are common across the vendor set and several carry data-protection implications, though they still want a verification pass first.

a10:

---

q11: Four US-centric statutes could be tagged onto HCM (FMLA/FFCRA, I-9/E-Verify, HIPAA business-associate agreements, and state pay-transparency laws), though some may belong on workforce management, benefits, or onboarding instead. Should I research and add the ones that belong on HCM? (yes/no)

Recommended: yes, additive and non-blocking; placement (HCM versus a neighbor domain) gets decided per statute during the research pass.

a11:

---

q12: Should I treat two modularization ideas as candidates for a later pass: a dedicated compliance module to isolate the data-protection-class entities if the new entities above get loaded, and a split of the lifecycle and workflows module into onboarding-intake and offboarding-coordination? (yes/no)

Recommended: yes as ideas to keep on the backlog, not as anything that blocks the current build; both only pay off after the entities and flows they organize actually exist.

a12:

---

<!-- agent map, ignore: q1=B2-S5r q2=B2-S1r q3=B2-S2r q4=B2-S4r.contracts q5=B2-S4r.events q6=B2-S8r q7=B1A-SELF-CONTAIN q8=B2-S6r q9=B2-S7r q10=B3-EMP-DEPENDENTS+B3-EMERGENCY-CONTACTS+B3-WORK-ELIG-DOCS+B3-NATIONAL-IDS+B3-WORKER-ADDRESSES+B3-WORKER-BANK-ACCOUNTS+B3-MEDICAL-CERTS+B3-I9-RECORDS+B3-PAY-EQUITY q11=B3-REG-FMLA+B3-REG-I9-EVERIFY+B3-REG-HIPAA-BAA+B3-REG-STATE-PAY-TRANSPARENCY q12=B3-MOD-HCM-COMPLIANCE+B3-MOD-LIFECYCLE-SPLIT | domain_id=54 -->
