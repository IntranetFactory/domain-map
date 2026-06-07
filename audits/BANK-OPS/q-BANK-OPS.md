# Banking Operations (BANK-OPS): questions waiting for you

## What this domain is
Run the day-to-day operations of a bank from one place: open accounts, originate and fund loans, move money, and keep every step inside the rules.

Take a customer from application through KYC and AML checks to a live account, underwrite and disburse loans, send and screen wire transfers, post and reconcile transactions, and work disputes and investigation cases. Screen against sanctions and suspicious-activity signals, hand the right alerts to your risk and compliance team, and keep the regulatory filings (SAR, CTR, OFAC) that examiners expect.

---

q1: (answer this first) How should Banking Operations be split into modules (the sub-areas of the product)?

- a) Seven modules: Origination (loan and account applications), Account Management (account openings and servicing), KYC/AML (due-diligence reviews, beneficial ownership, sanctions screening), Payments (wires and transactions), Cases (disputes and investigations), Loan Servicing (disbursements and servicing), Regulatory (SAR, CTR, and other filings).
- b) Five modules: same as (a) but fold KYC/AML and Regulatory together into one Compliance module.
- c) Six modules: same as (a) but fold Origination and Account Management together into one Onboarding module.
- d) Defer KYC/AML out of Banking Operations entirely into a separate KYC-AML platform domain, and keep the rest.
- e) Some other shape (describe it).

Recommended: a. It mirrors how the major banking-ops platforms (nCino, Backbase, Mambu, Thought Machine) present their product and keeps each area small enough to own cleanly. This choice drives the whole build (modules, capabilities, lifecycles, roles, and where the compliance entities live), so it unlocks everything below it.

a1:

---

q2: Banking cases (id 606) overlap with the customer cases your CSM domain already owns, and the two existing links use the vague verb "opens". How should that be resolved?

- a) Keep banking cases as their own master and rewrite the verb to "triggers" or "spawns".
- b) Demote banking cases to an embedded master of the CSM customer-cases master (CSM becomes the owner).
- c) Keep both and just disambiguate the verbs.

Recommended: a. It keeps banking-specific cases (disputes, fraud claims, account errors) as a first-class master while fixing the misleading verb. Note that options (a) and (b) overwrite or restructure existing rows, so either one needs your sign-off before it runs.

a2:

---

q3: Banking transactions (id 609) are an append-only ledger record and do not require a lifecycle. Do you still want a state machine on them, and if so which shape?

- a) Full workflow with dispute and reverse gates (pending, posted, reconciled, disputed, reversed).
- b) Slim three-state machine (pending, posted, reconciled) with no permission gates.
- c) Leave them stateless as a pure ledger record.

Recommended: c. They are classified as an operational record and pass validation without states, so adding a machine is optional polish rather than a requirement.

a3:

---

q4: For the loan-application approval gate, should the permission be named "approve_loan_application"? (yes/no)

Recommended: yes. It is the clear, conventional verb for that gate.

a4:

---

q5: For the wire-transfer approval gate, should the permission be named "approve_wire_transfer" (after you confirm whether approval is single-approver or dual-approval above a threshold)? (yes/no)

Recommended: yes. The verb is correct; just confirm the single-versus-dual approval semantics so the gate matches your OFAC controls.

a5:

---

q6: For the KYC review disposition gate, which permission wording do you prefer?

- a) clear_kyc_review
- b) disposition_kyc_review

Recommended: b. "Disposition" covers cleared, flagged, and escalated outcomes, not just clearing, so it reads more accurately for a review gate.

a6:

---

q7: For the banking-case closeout gate, which permission wording do you prefer?

- a) resolve_banking_case
- b) close_case

Recommended: a. It keeps the verb specific to banking cases and avoids colliding with the generic CSM "close case" action.

a7:

---

q8: For the GRC pairwise reconciliation (GRC is the heaviest neighbor), how should the timing be handled?

- a) Defer it until the modules exist, since most legs are blocked on module attribution.
- b) Run a lightweight GRC pairwise now to surface candidate missing handoffs from the GRC side.
- c) Run CSM and ERP-FIN pairwise too, even though they are lighter-weight neighbors.

Recommended: a. Most reconciliation legs cannot be wired until the module split lands, so deferring avoids rework.

a8:

---

q9: The seven cross-domain process tags on the outbound handoffs are present but still marked provisional (record_status "new"). How should they be approved?

- a) Approve all seven.
- b) Approve all except the account-opening to CSM tag (890/196), which carries a "medium confidence" note.
- c) Review each row one by one.
- d) Leave them all as provisional for now.

Recommended: a. Coverage is complete and verified; only the approval stamp is owed. Approving is a record_status flip the agent never does on its own, so it needs your call. Pick (b) if you want to re-check the account-opening tag first.

a9:

---

## Optional (will not hold up the build)

q10: Beyond the eight masters modeled today, the flagship banking-ops vendors point to thirteen deeper objects (borrower profiles, collateral records, credit decisions, loan servicing accounts, repayment schedules, adverse-media screenings, PEP screenings, chargebacks, ACH transfers, card authorizations, correspondent-bank relationships, banking product-catalog items, and a generic regulatory-reports master). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Several are common across the vendor set; they still want a verification pass first.

a10:

---

<!-- agent map, ignore: q1=B2-1 q2=B2-2 q3=B2-3 q4=B2-5.loan q5=B2-5.wire q6=B2-5.kyc q7=B2-5.case q8=B2-7 q9=B2-8 q10=B3 | domain_id=43 -->
