# Benefits Administration (BEN-ADMIN): questions waiting for you

## What this domain is
Run the full life of your employee benefits program in one place: open enrollment, life-event handling, carrier connectivity, ACA compliance, and benefits decision support. Design the plan catalog and open-enrollment windows, let employees elect coverage and manage dependents, push eligibility and enrollment files to your carriers, and keep the federal and state compliance obligations covered.

---

q1: (answer this first) The ACA compliance module currently owns no records of its own. How should it be built out?

- a) Give it real records: add ACA filings (the 1094-C / 1095-C transmittal, with a draft to validated to submitted to accepted / rejected / corrected lifecycle) and monthly per-employee affordability snapshots (draft to finalized to superseded), plus the matching workflow steps and approvals.
- b) Leave it as a reporting-only module that just produces forms and signals, and note that this differs from how the flagship vendors build it.
- c) Defer the decision and verify per-vendor lifecycles in a later research pass first.

Recommended: a. Every flagship ACA platform models these as first-class records with their own lifecycles, and this is the single biggest gap in the module. This choice drives whether new records, lifecycle states, approvals, and role permissions get authored, so it unlocks the rest of the compliance build.

a1:

---

q2: The enrollment module lists HR cases (owned by the HR service-desk domain) as a hard, required dependency, but nothing structurally connects them and the escalation handoff already captures the link. How should the dependency be set?

- a) Downgrade it to optional, so the enrollment module still works without the HR service-desk domain deployed but can read cases when present.
- b) Remove the dependency entirely and rely on the existing escalation handoff and relationship.
- c) Keep it required and document the in-flow read (escalated benefits questions land in the enrollment specialist's queue and must be readable).

Recommended: a. It reflects the real in-flow read during enrollment troubleshooting without forcing the HR service-desk domain to be deployed for enrollment to function. This is a destructive change to an existing dependency row, so it needs your sign-off.

a2:

---

q3: Two more required cross-domain dependencies break module self-containment the same way: payroll deduction codes (consumed by plan design) and HCM employment events (consumed by enrollment). For each, how should it be fixed?

- a) Carry a local read-only copy of the record inside this domain (embed it).
- b) Relax the dependency to optional (present only when the source domain is deployed).

Recommended: a. Embedding a local shell keeps each module self-contained and deployable on its own, which is the standard treatment for a required cross-domain master. This rewrites existing dependency rows, so it needs your sign-off.

a3:

---

q4: An enrollment-module dependency row carries an unapproved free-text note that was written without sign-off. Should I clear that note? (yes/no)

Recommended: yes. The note was added in violation of the no-free-text-notes rule. Clearing it overwrites a non-empty value, so it needs your confirmation.

a4:

---

q5: Today only an admin role can perform routine enrollment and plan-design actions; specialists have to be escalated to admin to do their daily work. Should the day-to-day workflow steps be granted directly to the specialist roles?

- a) Grant all of them: the seven enrollment workflow steps to the Enrollment Specialist and the five plan-design workflow steps to the Plan Manager.
- b) Grant only a subset (you name which steps).
- c) Keep the current setup and rely on admin escalation.

Recommended: a. Flagship benefits vendors give the enrollment specialist their full enrollment lifecycle and the plan manager their full plan-design and carrier lifecycle, so they do not need admin rights for routine work.

a5:

---

q6: Should an enrollment that needs sign-off route to a single named approver (the benefits administrator) for life-event-triggered changes? (yes/no)

Recommended: yes. Flagship enrollment workflows route qualifying-life-event changes to a single benefits-admin approver. This changes a workflow flag, so it needs your call.

a6:

---

q7: Should a dependent record be locked once it has been verified, so it cannot be quietly edited afterward? (yes/no)

Recommended: yes. Vendor behavior locks the dependent record after verification to protect the audited eligibility decision. This changes a workflow flag, so it needs your call.

a7:

---

q8: The compliance list currently covers ACA, ERISA, HIPAA, COBRA, and GINA. Should it be widened, and how far?

- a) Add Section 125 (cafeteria plans), Form 5500 (annual ERISA filing), ADA, FMLA, USERRA, and state paid-leave laws (CA PFL, NY PFL, NJ TDB, WA PFML, CO FAMLI) now.
- b) Defer all of these to a later vendor-verification pass.
- c) Add only the federal anchors (Section 125, Form 5500, FMLA, USERRA) now and leave state and international laws for a later geo-expansion.

Recommended: a. These all show up across the flagship benefits-administration surface and are mandatory for a US-complete program. Pick (c) if you want to keep it lean and defer state-by-state coverage.

a8:

---

q9: This domain's notes field is empty. Should I add a one-line pointer to this audit file? (yes/no)

Recommended: yes, but only with wording you approve first. The notes field requires your explicit sign-off on the exact text before anything is written.

a9:

---

q16: Applicant Tracking and Recruiting forwards benefit enrollment to Benefits Administration to administer benefit enrollment, but Benefits Administration does not yet have anyone assigned to administer benefit enrollment, so this step has no owner. How should it be handled?
- a) Record it now as work Benefits Administration owns, and assign a named owner once Benefits Administration sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Benefits Administration decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a16:

---

q17: Core Financial Management forwards carrier feed to Benefits Administration to process accounts payable and expense reimbursements, but Benefits Administration does not yet have anyone assigned to process accounts payable and expense reimbursements, so this step has no owner. How should it be handled?
- a) Record it now as work Benefits Administration owns, and assign a named owner once Benefits Administration sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Benefits Administration decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a17:

---

## Optional (will not hold up the build)

q10: Should I research and add COBRA qualifying-event records (with their own notice / election-period / elected / waived / expired lifecycle), which the pure-play and TPA vendors model as a distinct record set from life events? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. If it lands it may warrant its own COBRA module.

a10:

---

q11: Should I add a dependent-eligibility-verification record (employee submits documentation, reviewer approves or de-enrolls), which flagship vendors track as a distinct audit record rather than a flag on the dependent? (yes/no)

Recommended: yes, but additive and non-blocking.

a11:

---

q12: Should I add evidence-of-insurability requests for life, disability, and voluntary benefits (carrier responds approved / declined / pending), which gate finalizing an enrollment? (yes/no)

Recommended: yes, but additive and non-blocking.

a12:

---

q13: Should I add an FSA / HSA / commuter claims ledger (claim submitted, adjudicated, paid or rejected), which the spending-account specialists model as a distinct ledger and which could become its own spending-accounts module? (yes/no)

Recommended: yes, but additive and non-blocking. Alegeus, WEX Health, HealthEquity, Discovery Benefits, and P&A Group all master FSA / HSA / commuter claims as a distinct ledger (claim submitted, adjudicated, paid or rejected), and that vendor cluster operates as its own point-solution market, which is why a loaded claims ledger could become a BEN-SPENDING-ACCOUNTS module. The contribution side is already captured via payroll deduction codes; only the claim and disbursement side is missing.

a13:

---

q14: Should I add voluntary / supplemental benefit elections (accident, critical-illness, hospital indemnity, legal, identity-protection), either as their own record or as a typed variant of enrollment? (yes/no)

Recommended: yes, but additive and non-blocking.

a14:

---

q15: Should I add 401(k) default-investment (QDIA) designations tied to the plan, which the record-keepers model as a first-class record? (yes/no)

Recommended: yes, but additive and non-blocking.

a15:

---

<!-- agent map, ignore: q1=B2-S4 q2=B2-S1 q3=B1A-SELF-CONTAIN q4=B1A-RULE15-598 q5=B2-S5 q6=B2-S2.single_approver q7=B2-S2.submit_lock q8=B2-S3 q9=B2-S6 q10=B3-COBRA-EVENTS q11=B3-DEP-ELIG-VERIF q12=B3-EOI-REQUESTS q13=B3-SPENDING-CLAIMS q14=B3-VOLUNTARY-ELECTIONS q15=B3-QDIA-DESIGNATIONS q16=B2-B9D-OWN-1052 q17=B2-B9D-OWN-59 | domain_id=61 -->
