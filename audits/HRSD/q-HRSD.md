# HR Service Delivery (HRSD): questions waiting for you

## What this domain is
Manage employee HR requests, knowledge, and case routing in one workspace.

Take in HR questions and requests from an employee self-service portal, triage and classify them with AI, then route each case to the right HRBP or specialist team and run it through to resolution. Give employees a knowledge base they can search before they ever open a case, hold cases to a clear approval and lifecycle flow, and connect to the surrounding HR systems (core HR, identity and access, benefits, learning) so a case can hand off cleanly when it needs another team.

---

q1: (answer this first) Five module rows consume an entity that another domain owns (employees from HCM; knowledge articles and service requests from ITSM) while marking it required, which breaks each module's self-containment. How should each be fixed?

- a) Embed a local shell of the entity in the module (carry an embedded master), so the module owns the copy it needs.
- b) Mark the consumed entity optional instead of required, so the module no longer depends on a foreign master being present.

Recommended: a. Embedding a local shell keeps each module self-contained, which is the cleaner structural fix and matches how the modules already host their own masters. This rewrites the role and necessity on existing rows, so it is destructive and needs your sign-off, and it shapes the structural footprint of all three modules.

a1:

---

q2: Two case handoffs (to identity-and-access and to core HR, both on "case access required") still carry stale auto-tags pointing at a customer-service process. Should I replace them with the prescribed HR-process tags (employee inquiry process for the access case; employee information and analytics for the core-HR broadcast)? (yes/no)

Recommended: yes. The current tags are customer-service-shaped, not internal-HR, so they are wrong. Replacing an existing tag is a destructive delete-and-insert, so it needs your approval.

a2:

---

q3: A core-HR handoff on "employee terminated" is tagged with the onboarding-and-training process. Should it stay, or upgrade to the more precise employee inquiry process tag?

- a) Keep the existing onboarding-and-training tag.
- b) Upgrade to the employee inquiry process tag (terminated employees often raise final-pay, benefits, and exit cases).

Recommended: b. The inquiry-process tag fits termination-driven cases more precisely. Replacing the tag is a destructive change, so it needs your call.

a3:

---

q4: A people-analytics handoff on "engagement declining" is tagged with the engagement-survey process. Should it stay, or replace it with the employee assistance and retention process?

- a) Keep the existing engagement-survey tag.
- b) Replace with the employee assistance and retention tag (a more direct fit for a declining-engagement signal).

Recommended: b. Assistance and retention maps the declining-engagement signal more directly than the survey process. Replacing the tag is destructive, so it needs your sign-off.

a4:

---

q5: 27 rows (15 handoffs, 10 module-to-entity links, and 2 entity notes) carry templated notes that match a since-rescinded note-writing rule. How should they be handled?

- a) Confirm they were user-approved at load time and leave them in place.
- b) Confirm they were auto-written and clear all 27.
- c) Review per row: keep substantive notes (for example the case-categories config-shape exemption) and clear only the templated backfill notes.

Recommended: c. A per-row review keeps the genuinely useful notes while removing the templated ones. Clearing any note is a destructive overwrite, so nothing is cleared without your approval.

a5:

---

q6: For HR cases, should case closure freeze the fields (a submit lock on closed cases)? (yes/no)

Recommended: yes, if closed cases should be an immutable record. This is a workflow judgment the agent cannot make for you; flipping the flag on is otherwise safe.

a6:

---

q7: For HR cases, should the pending-approval state route to a single named approver? (yes/no)

Recommended: yes, if your approval step has one accountable approver rather than a group. This is a workflow judgment the agent cannot make for you.

a7:

---

q8: The "case access required" event keyed on HR cases reads more like a derived condition than a lifecycle state. How should it be handled?

- a) Leave it as a conditional flag on HR cases (current shape).
- b) Rename it to hr_case.access_required to match the rest of the master event naming.
- c) Introduce a derived hr_case_signals entity and re-key the event onto it.

Recommended: a. Two live handoffs ride this event, and leaving it in place avoids churn; pick (b) or (c) only if you want naming alignment or a clean split of derived signals. Renaming or re-keying re-attributes an existing event, so it is destructive and needs your sign-off.

a8:

---

q9: The three HR Service Delivery roles use an HRSD- prefix. Is HRSD the intended short code for the HR Service Delivery function, or an accidental domain prefix that should be renamed?

- a) Confirm HRSD is the intended function code and leave the roles as-is.
- b) Rename them (for example HR-AGENT, HR-MANAGER, HR-KB-MGR); the role IDs and their bundle rows survive the rename.

Recommended: a. The function name initials genuinely are HRSD, so the prefix is defensible. The naming rule warns that domain prefixes are an anti-pattern, so rename only if you want to remove the ambiguity. Renaming overwrites existing role codes, so it is destructive.

a9:

---

q10: 24 process-mapping rows across the HR Service Delivery cross-domain handoffs are still pending approval, so the approved-row headline reads zero. How should they be promoted?

- a) Approve all 24 in one batch.
- b) Review and approve (or reject) each row individually.
- c) Wait until the handoff-tag decisions above (q2, q3, q4) land, then approve in one consolidated batch.

Recommended: c. Approving after the tag swaps settle avoids approving rows that are about to change. Stamping approved is never done without your explicit sign-off.

a10:

---

## Optional (will not hold up the build)

q11: Should I research and add an employee-journeys master plus an HRSD-JOURNEY-MGMT module for non-onboarding moments (return from leave, role change, location change, exit)? Flagship vendors treat journey orchestration as a first-class offering. (yes/no)

Recommended: yes to research it, but this is a new module plus master, so if pursued it becomes a build-shape (split) decision rather than something applied automatically.

a11:

---

q12: Should I add an HR-documents consumer footprint (offer letters, contract amendments, exit and leave letters, signed acknowledgments) to the case-management and employee-portal modules? Every flagship platform has a documents tab on the employee record. (yes/no)

Recommended: yes, but additive and can happen after the modules exist.

a12:

---

q13: Should I add specialty handling for whistleblower and employee-relations cases (a case subtype with anonymization and special routing), or queue a separate ethics-intake domain? The EU Whistleblower Protection Directive is already linked and pure-play specialists exist. (yes/no)

Recommended: yes to research it, but a separate domain or split is a build-shape decision, so if pursued it becomes a b2 call rather than auto-applied.

a13:

---

<!-- agent map, ignore: q1=B1A-SELF-CONTAIN q2=B1B-APQC-REPLACE q3=B1B-APQC-KEEP-OR-UPGRADE.handoff369 q4=B1B-APQC-KEEP-OR-UPGRADE.handoff1109 q5=B2-1 q6=B2-2.submitlock q7=B2-2.singleapprover q8=B2-3 q9=B2-4 q10=B2-5 q11=B3-1 q12=B3-2 q13=B3-3 | domain_id=22 -->
