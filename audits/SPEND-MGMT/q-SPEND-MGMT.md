# Corporate Spend Management (SPEND-MGMT): questions waiting for you

## What this domain is
Control all company spending from one place: corporate cards, vendor bill pay, and the pre-approval and policy rules that govern both. Issue and authorize cards in real time, route vendor payments (ACH, wire, virtual card, check) through approval chains, and check every spend request against policy before the money goes out. Distinct from post-hoc expense reimbursement and reconciliation, which the Expense domain owns.

---

q1: (answer this first) How should Corporate Spend Management handle the reimbursement area, given that out-of-pocket reimbursement is already the Expense domain's core?

- a) Leave reimbursement folded into the policy-and-approval module as a reuse-only link, with Expense remaining the system of record (current state).
- b) Carve a thin Spend-owned reimbursement module that is genuinely distinct from Expense (you specify its scope and whether it needs its own record type).
- c) Drop the reimbursement links from Spend entirely and let Expense own that capability outright.

Recommended: a. Brex, Ramp, and Airbase (now BILL Spend & Expense) all bundle out-of-pocket reimbursement into their expense product rather than running a separate spend-side reimbursement record, and Coupa keeps reimbursement on its expense layer inside the wider spend suite, so reimbursement stays realized off the Expense master with Spend reusing it; (b) and (c) instead force a new Spend-owned record or a capability move that no flagship packages this way.

a1:

---

q2: Are spend policies versioned configuration (authored once, edited occasionally, no workflow), or are they a workflow record that moves through draft, active, superseded, and retired?

- a) Configuration: mark them as catalog config and load no lifecycle states.
- b) Workflow: give them draft to active to superseded to retired states (loaded on the policy-and-approval module).

Recommended: a. Spend policies read as versioned config rather than a workflow record, which is also why the other four masters already carry lifecycle states and this one does not. Your answer here unblocks the last remaining lifecycle item.

a2:

---

q3: Should card authorizations be treated as carrying personal data (they hold cardholder name, merchant location, and IP / device details at authorization)? (yes/no)

Recommended: yes. That payload is personal data and should be flagged accordingly.

a3:

---

q4: Should a spend request lock once it is submitted, so the requester cannot edit it until it is rejected or returned? (yes/no)

Recommended: yes. A submitted request is in review and should not change underneath the approver.

a4:

---

q5: Should a vendor payment authorization lock once it is approved, so it cannot be edited while it is queued for the next payment run? (yes/no)

Recommended: yes. An approved authorization is committed to pay and should not be edited in flight.

a5:

---

q6: Should corporate card accounts be treated as carrying personal data (cardholder PII, possibly a personal SSN for primary card issuance)? (yes/no)

Recommended: yes. Card account records typically hold cardholder PII and should be flagged.

a6:

---

q7: For sub-threshold vendor payment authorizations, is a single approver enough (one controller signs off below the multi-approver bar)? (yes/no)

Recommended: yes. A single-approver path below a value threshold is the common control for small payments.

a7:

---

q8: Which compliance frameworks should be tagged onto Corporate Spend Management?

- a) PCI-DSS plus AML / KYC plus SOX (the domain processes card numbers at issuance and authorization, opens card-program accounts, and gates payment authorization).
- b) Defer all of them for now.
- c) Anchor PCI-DSS and AML / KYC on the card-program domain candidate instead (only if you decide to promote it in q13).

Recommended: a. All three apply directly to spend, and tagging them on this domain does not depend on any future restructuring. Choose (c) only if you promote the separate card-program domain in q13 and want the card-data rules to live there.

a8:

---

q9: Should I author the missing within-domain relationships among the five spend masters (approved request generates a payment authorization, every authorization belongs to a card account, a request is evaluated against policy)? (yes/no)

Recommended: yes. The relationships are clearly implied by the workflow; I just need your sign-off on the linking verbs and whether each is a reference or an ownership link.

a9:

---

q10: Is vendor payment authorization and the downstream AP payment-run approval one workflow split across two domains, or two distinct approval gates?

- a) One unified flow: Spend pre-authorizes and AP releases it on the next run (current shape, with payment runs sitting downstream in the bill-pay module).
- b) Two separate gates: Spend owns its own authorization and AP owns its payment-run approval independently.

Recommended: a. The current placement already assumes the unified read, which matches the all-in-one spend platforms; pick (b) only if your AP process runs a genuinely separate sign-off.

a10:

---

q11: For the cross-domain handoffs, I will propose a process-taxonomy (APQC PCF) tag per handoff and a replacement for the one handoff whose existing tag is wrong (supplier onboarding is currently mis-tagged to recruitment-vendor management). Should I surface those candidates for your per-row approval, including replacing that wrong tag? (yes/no)

Recommended: yes. The cited process ids did not match the audit's own labels on a prior pass, so each pick needs your confirmation, and the wrong-tag fix is a replace that I will not apply without your sign-off.

a11:

---

q16: Enterprise Performance Management forwards spend request to Corporate Spend Management to operationalize and implement plans to achieve budget, but Corporate Spend Management does not yet have anyone assigned to operationalize and implement plans to achieve budget, so this step has no owner. How should it be handled?
- a) Record it now as work Corporate Spend Management owns, and assign a named owner once Corporate Spend Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Corporate Spend Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a16:

---

q17: Core Financial Management forwards spend request to Corporate Spend Management to process accounts payable (AP), but Corporate Spend Management does not yet have anyone assigned to process accounts payable (AP), so this step has no owner. How should it be handled?
- a) Record it now as work Corporate Spend Management owns, and assign a named owner once Corporate Spend Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Corporate Spend Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a17:

---

q18: Source-to-Pay forwards spend policy to Corporate Spend Management to develop procurement plan, but Corporate Spend Management does not yet have anyone assigned to develop procurement plan, so this step has no owner. How should it be handled?
- a) Record it now as work Corporate Spend Management owns, and assign a named owner once Corporate Spend Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Corporate Spend Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a18:

---

## Optional (will not hold up the build)

q12: Corporate travel management shows up as a pure-play market of its own (Navan, Egencia, SAP Concur Travel, Spotnana, and others), and a travel-booking object already exists with no domain owning the booking flow. Should I research and stand up a separate Travel Management domain? (yes/no)

Recommended: yes to researching it, but it is a new-domain idea that does not gate this build.

a12:

---

q13: Card issuing is sold as its own pure-play market (Marqeta, Stripe Issuing, Highnote, Lithic, Adyen Issuing), structurally distinct from the spend-management layer that runs on top of it. Should I research and promote a separate Corporate Card Program domain? (yes/no)

Recommended: yes to researching it. If you promote it, it would also become the natural home for the PCI-DSS and AML / KYC anchoring in q8.

a13:

---

q14: Flagship spend platforms model several extra first-class records that Spend does not yet have (FX rate locks and currency wallets, persisted spend anomalies / insights, MCC-level merchant-category rules, card disputes, receipt records, vendor payment methods, and virtual cards). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist; each still wants a verification pass first.

a14:

---

q15: Corporate-card reconciliation and expense-policy enforcement are currently realized off Expense-owned masters with no spend-side record. Should I treat these as intentional cross-domain links, or investigate them as gaps to fill with spend-side records?

- a) Intentional cross-domain links: leave them realized off the Expense masters.
- b) Gaps: research whether spend-side records are warranted.

Recommended: a. They read as deliberate reuse of the Expense masters rather than gaps; flagged only for your review. Non-blocking either way.

a15:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2 q3=B2-S3.cardauth_pii q4=B2-S3.spendreq_lock q5=B2-S3.vpa_lock q6=B2-S3.cardacct_pii q7=B2-S3.vpa_single_approver q8=B2-S4 q9=B2-S5 q10=B2-S6 q11=B2-APQC q12=B3-DOMAIN-TRAVEL-MGMT q13=B3-DOMAIN-CORP-CARD-PROGRAM q14=B3-MASTERLESS-FX-TREASURY+B3-MASTERLESS-ANALYTICS+B3-MERCHANT-CATEGORY-RULES+B3-CARD-DISPUTES+B3-RECEIPT-RECORDS+B3-VENDOR-PAYMENT-METHODS+B3-VIRTUAL-CARDS q15=B3-MASTERLESS-CORP-CARD-EXPENSE-POLICY q16=B2-B9D-OWN-1323 q17=B2-B9D-OWN-315 q18=B2-B9D-OWN-793 | domain_id=133 -->
