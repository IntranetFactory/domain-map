# Expense Management (EXPENSE): questions waiting for you

## What this domain is
Capture, check, approve, and reimburse employee spending from one place. Employees submit expense reports and lines, those lines are checked against active policy and matched to corporate-card transactions, approvers move reports through review, and approved amounts post to the general ledger and flow back to the employee as reimbursement. Travel bookings and per-diem handling sit alongside the same approval and policy machinery.

---

q1: (answer this first) Does Expense Management own corporate cards and card transactions, or should they move to a future corporate-card-program domain?

- a) Keep both in Expense Management (current state, isolated in their own module).
- b) Migrate both to a corporate-card-program domain once that domain exists (the card module retires or shrinks to a thin consumer that only reads transactions).
- c) Split: keep corporate cards in Expense Management but move card transactions to the corporate-card-program domain as the ledger record.

Recommended: a. The cards and transactions are already isolated in their own module, so keeping them here is the simple current state and a later migration stays non-destructive. This ownership call shapes the build the most and also drives which card-related pattern-flag flips below stick, so it unlocks the rest.

a1:

---

q2: Does Expense Management own travel bookings, or should they move to a travel-management domain?

- a) Keep travel bookings in Expense Management (current state, isolated in their own module).
- b) Migrate to a travel-management domain once that domain exists (the travel module retires or becomes a thin integration module).
- c) Keep travel bookings here but author them thin (integration record only), with travel-management owning the rich master.

Recommended: a. Same shape as q1: travel bookings are already isolated in their own module, so keeping them is the simple current state and any later migration stays non-destructive.

a2:

---

q3: Expense policy and spend policy are currently two parallel records kept in sync. Should they stay parallel, or collapse into one shared policy record?

- a) Keep the two parallel records and mirror them via sync (current state).
- b) Collapse to a single expense-policy record owned by Expense Management, with the spend-management domain consuming it.
- c) Collapse to a single spend-policy record owned by the spend-management domain, with Expense Management consuming it.

Recommended: a. Keeping the parallel-and-sync shape is the current state and the least disruptive; the vendor trend toward one shared policy primitive is real but collapsing creates cross-domain work on the spend-management side, so do it only if you want that consolidation now.

a3:

---

q4: Reimbursement can be paid through payroll or through accounts-payable automation, and both paths are currently wired. Which should be canonical?

- a) Model both paths (current implicit state).
- b) Payroll-side only, and deprecate the accounts-payable consumer.
- c) Accounts-payable-side only, and deprecate the payroll handoffs.

Recommended: a. Both paths are real in practice (in-pay reimbursement for smaller orgs, off-cycle bank payment for larger ones), so modeling both keeps the domain accurate; pick one only if you want to commit to a single disbursement route.

a4:

---

q5: Should an expense report be marked as carrying personal content (employee name and line detail, relevant for the audit trail)? (yes/no)

Recommended: yes. The report carries employee and expense detail that is sensitive and audit-relevant.

a5:

---

q6: Should an expense report be frozen once submitted, so the line set cannot change while it is in approval? (yes/no)

Recommended: yes. Freezing the report on submit is the standard pattern across expense platforms.

a6:

---

q7: Should an expense line be frozen once submitted, so it cannot be edited while in approval? (yes/no)

Recommended: yes. Lines should freeze on submit for the same auditability reason as the report.

a7:

---

q8: Should a travel booking be marked as carrying personal content (traveler PII such as passport, loyalty, and dietary details)? (yes/no)

Recommended: yes. Traveler PII is personal data and relevant to privacy handling.

a8:

---

q9: Should a card transaction be marked as carrying personal content (the merchant, employee, and amount tuple is sensitive)? (yes/no)

Recommended: yes. The merchant-plus-employee-plus-amount detail is sensitive and card-data-adjacent.

a9:

---

q10: Should a corporate card be marked as having a single approver (card issuance is a single-manager grant)? (yes/no)

Recommended: yes. Card issuance is typically a single-manager approval.

a10:

---

q11: Should an expense report be left as multi-tier approval rather than single-approver (confirming the current setting stays off)? (yes/no)

Recommended: yes. Multi-tier approval is standard for higher-value reports, so leave single-approver off.

a11:

---

q12: Should an expense policy be left unlocked rather than submit-locked (confirming the current setting stays off), since policies are versioned rather than frozen? (yes/no)

Recommended: yes. Policies are versioned, not locked on submit, so leave the submit-lock off.

a12:

---

q13: The expense domain description and one skill description contain a forbidden em-dash. How should the wording be fixed?

- a) Replace the em-dash with a comma.
- b) Split the sentence (replace with a period).
- c) Rewrite (you supply the wording).
- d) Defer.

Recommended: a. Replacing with a comma is the smallest faithful edit that keeps the existing meaning. The skill-description half is already fixed; this covers the remaining domain-description prose, which is a non-empty value, so it needs your sign-off before the overwrite.

a13:

---

## Optional (will not hold up the build)

q14: Flagship expense vendors model ten extra first-class records that the current shape folds in or omits (receipts, mileage logs, per-diem rates, cash advances, expense categories, traveler profiles, policy violations, delegate authorizations, VAT tax records, audit-trail records). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the current build. Several are common across the vendor set, though each still wants a verification pass first.

a14:

---

q15: Five compliance regulations beyond the two already loaded show up across the vendor surface (IRS Publication 463, HMRC P11D, FCPA, GDPR, PCI-DSS). Should I research and tag the ones that apply? (yes/no)

Recommended: yes, but additive and non-blocking. They map to per-diem substantiation, UK benefits-in-kind, gift and hospitality tracking, traveler PII, and card-data handling respectively.

a15:

---

<!-- agent map, ignore: q1=B2-S2 q2=B2-S3 q3=B2-S5 q4=B2-S6 q5=B2-S4.reportpii q6=B2-S4.reportlock q7=B2-S4.linelock q8=B2-S4.travelpii q9=B2-S4.cardtxnpii q10=B2-S4.cardapprover q11=B2-S4.reportapprover q12=B2-S4.policylock q13=B2-EM q14=B3-RECEIPTS+B3-MILEAGE-LOGS+B3-PER-DIEM-RATES+B3-CASH-ADVANCES+B3-EXPENSE-CATEGORIES+B3-TRAVELER-PROFILES+B3-POLICY-VIOLATIONS+B3-DELEGATE-AUTHORIZATIONS+B3-VAT-TAX-RECORDS+B3-AUDIT-TRAIL-RECORDS q15=B3-REG-IRS-463+B3-REG-HMRC-P11D+B3-REG-FCPA+B3-REG-GDPR+B3-REG-PCI-DSS | domain_id=67 -->
