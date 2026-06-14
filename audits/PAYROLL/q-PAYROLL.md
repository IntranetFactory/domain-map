# Payroll (PAYROLL): questions waiting for you

## What this domain is
Run payroll end to end: calculate gross-to-net pay, apply earnings and deductions, withhold and file taxes, handle garnishments, and pay employees on time. It keeps the pay runs, pay slips, tax filings, and payroll journal entries that prove every cycle was correct, and feeds the results to HR, finance, and benefits. Today it ships as four modules: the pay run itself, tax compliance, earnings and deductions, and employee pay statements.

---

q1: (answer this first) For the three deployability-borderline sibling rows (pay runs and the payroll journal showing up as required reads inside the tax-compliance and pay-statement modules), how should the module shape be settled?

- a) Delete all 8 sibling consumer rows: modules read siblings by reference only, matching the flagship vendor pattern where these modules are not deployed standalone.
- b) Promote the 3 borderline rows (pay runs in tax compliance, the payroll journal in tax compliance, pay runs in pay statements) to embedded masters so those two modules can deploy standalone, and delete only the 5 pay-run-side rows.
- c) Decide each of the 8 rows individually.

Recommended: a. Delete all 8. The flagship vendors treat tax compliance and pay statements as part of one payroll deployment, not standalone products, so sibling reads should go through foreign keys. This is the architectural call that drives the destructive cleanup below it, so it unlocks the rest of the build. Deleting these rows is destructive, so it needs your sign-off.

a1:

---

q2: Should the pay run switch from single-approver to multi-approver (it currently allows only one approver)? (yes/no)

Recommended: yes. Real payroll sign-off usually runs through an approval chain, not a single person. This flips an existing flag, so it needs your confirmation.

a2:

---

q3: Should the payroll journal entry switch from multi-approver to single-approver, to match standard financial controls? (yes/no)

Recommended: yes. A posted journal entry normally has one accountable approver. This flips an existing flag, so it needs your confirmation.

a3:

---

q4: Should the pay run be marked as holding personal content (it carries employee pay and tax detail)? (yes/no)

Recommended: yes. Pay runs contain employee-level pay and tax data, which is personal content under privacy rules. This flips an existing flag, so it needs your confirmation.

a4:

---

q5: How broad should the regulation coverage be?

- a) Add the full set now (FICA, SECA, FUTA, SUTA, IRC Subtitle C, state wage payment, HMRC RTI, CRA T4, DSGVO, GoBD, Saudi WPS, Singapore CPF, EU Posted Workers Directive).
- b) Add US federal anchors only (FICA, SECA, FUTA, SUTA, IRC Subtitle C) and defer the rest.
- c) Defer all of it to a later vendor-verification pass.

Recommended: b. The US federal anchors are mandatory for any US payroll and are safe to add now; the country-specific ones are better confirmed against real vendor coverage first. Pick (a) only if you already know the catalog must serve those jurisdictions.

a5:

---

q6: How should year-end statements (W2, W2c, 1099, 1099-NEC, T4, P60, Lohnsteuerbescheinigung, Form 16) be handled?

- a) Add year-end statements as a new master in the pay-statements module (its own lifecycle, statutory rules, and distribution channel; this could later justify a dedicated year-end module).
- b) Keep them as a subtype of pay slips.
- c) Defer to a later research pass.

Recommended: a. Flagship vendors model year-end statements as a distinct entity from pay slips, with a different lifecycle and statutory rules. Adding the master is additive and can land before any decision on a separate module.

a6:

---

q7: How should multi-country tax configuration (per-country statutory kernels: rate tables, calendar rules, filing schemas) be handled?

- a) Add jurisdiction tax configs as a first-class master under tax compliance (which could later justify a dedicated global-payroll module).
- b) Defer to a later research pass.
- c) Reject it as out of scope, keeping PAYROLL US-centric by intent.

Recommended: b. CloudPay, Papaya Global, ADP GlobalView, Deel, and Remote all model per-country statutory kernels (rate tables, calendar rules, filing schemas) as a first-class jurisdiction_tax_configs entity, so the entity shape is real and the PAYROLL-GLOBAL capability has no entity-level representation today; but loading it depends on whether PAYROLL is meant to serve non-US jurisdictions, which is your call. Pick (a) if global payroll is in scope, (c) if it is firmly not.

a7:

---

q8: Should the domain record get a one-line note pointing at this audit?

- a) Yes, and here is the wording (supply it).
- b) Skip the pointer.

Recommended: a, with wording you approve. A short audit pointer helps the next reviewer, but the text needs your explicit approval before it is written.

a8:

---

q9: For the three config/reference tables (earning codes, deduction codes, tax authorities), should an explicit lifecycle be authored?

- a) Author a 3-state lifecycle (draft, active, deactivated) on all three.
- b) Accept the config-shape exemption and rely on record status for all three.
- c) Mixed: lifecycle on earning codes and deduction codes (which have deactivation triggers), exemption on tax authorities.

Recommended: c. Earning codes and deduction codes already emit deactivation events, so an explicit active-to-deactivated arc is justified; tax authorities are static config and the exemption fits. Pick (b) to keep all three lean.

a9:

---

q10: Is the proposed 5-role set right, or should it be tighter or wider?

- a) Use the proposed 5 roles: Payroll Administrator, Payroll Manager, Tax Compliance Officer, Garnishment Specialist, HR Partner.
- b) Tighter 3-role set: admin, manager, specialist.
- c) Wider 6+ role set (for example add Payroll Auditor and Payroll Data Steward; specify).

Recommended: a. The 5 roles map cleanly to the four modules and the distinct compliance duties. This answer also unblocks loading the roles, permissions, and workflow-gate permissions.

a10:

---

q11: Six existing cross-domain process tags are weak or mismatched (on the onboarding, employee-change, termination, compensation, expense-reimbursement, and comp-plan handoffs). Should I replace or flip each to the better-fitting process node? (yes/no)

Recommended: yes. The recommended nodes (employee onboarding, Administer Payroll, compensation administration, expense reimbursement) fit far better than the current tags. Each change overwrites a non-empty tag, so it is destructive and needs your sign-off.

a11:

---

q12: Eight required reads on PAYROLL modules point at entities mastered by other domains (background checks, benefit enrollments, candidate referrals, employment contracts, employment events, onboarding document collections, onboarding journeys), breaking module self-containment. How should each be fixed?

- a) Embed a local read-only shell of each so the module is self-contained.
- b) Relax the necessity from required to optional, leaving them as plain cross-domain reads.
- c) Decide each of the 8 rows individually.

Recommended: a where the data is truly needed inside the module, b otherwise. Either way the change overwrites the role or necessity on an existing row, so it is destructive and needs your sign-off.

a12:

---

q13: Which IT sub-function should be recorded as the consumer of PAYROLL (for integration ownership)? The function spine has no plain "Information Technology" node, so one of its sub-functions must be picked.

- a) IT Operations.
- b) IT Service Desk.
- c) IT Infrastructure.

Recommended: a, IT Operations, as the most likely owner of payroll integrations. Once you pick, a single consumer row is inserted.

a13:

---

q15: Compensation Management forwards pay slip to Payroll Management to administer compensation and rewards to employees, but Payroll Management does not yet have anyone assigned to administer compensation and rewards to employees, so this step has no owner. How should it be handled?
- a) Record it now as work Payroll Management owns, and assign a named owner once Payroll Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Payroll Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a15:

---

q16: Core Financial Management forwards payroll journal entry to Payroll Management to process journal entries, but Payroll Management does not yet have anyone assigned to process journal entries, so this step has no owner. How should it be handled?
- a) Record it now as work Payroll Management owns, and assign a named owner once Payroll Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Payroll Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a16:

---

q17: Expense Management forwards pay slip to Payroll Management to process accounts payable and expense reimbursements, but Payroll Management does not yet have anyone assigned to process accounts payable and expense reimbursements, so this step has no owner. How should it be handled?
- a) Record it now as work Payroll Management owns, and assign a named owner once Payroll Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Payroll Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a17:

---

q18: Benefits Administration forwards payroll journal entry to Payroll Management to administer benefit enrollment, but Payroll Management does not yet have anyone assigned to administer benefit enrollment, so this step has no owner. How should it be handled?
- a) Record it now as work Payroll Management owns, and assign a named owner once Payroll Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Payroll Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a18:

---

q19: Core Financial Management forwards payroll journal entry to Payroll Management to process payments, but Payroll Management does not yet have anyone assigned to process payments, so this step has no owner. How should it be handled?
- a) Record it now as work Payroll Management owns, and assign a named owner once Payroll Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Payroll Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a19:

---

q20: Governance, Risk and Compliance forwards garnishment order to Payroll Management to maintain and administer applicable deductions, but Payroll Management does not yet have anyone assigned to maintain and administer applicable deductions, so this step has no owner. How should it be handled?
- a) Record it now as work Payroll Management owns, and assign a named owner once Payroll Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Payroll Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a20:

---

q21: Governance, Risk and Compliance forwards tax filing to Payroll Management to file regulatory payroll tax forms, but Payroll Management does not yet have anyone assigned to file regulatory payroll tax forms, so this step has no owner. How should it be handled?
- a) Record it now as work Payroll Management owns, and assign a named owner once Payroll Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Payroll Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a21:

---

## Optional (will not hold up the build)

q14: Flagship US vendors model two more first-class entities that PAYROLL has no record for today: retroactive pay adjustments (a back-dated change that produces a delta on the next pay run) and bank payment files (NACHA/ACH in the US, BACS/Faster Payments in the UK, SEPA in the EU). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Both are common across the vendor set and want a quick verification pass first.

a14:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2.approver_payrun q3=B2-S2.approver_journal q4=B2-S2.pii_payrun q5=B2-S3 q6=B2-S4 q7=B2-S5 q8=B2-S6 q9=B2-S7 q10=B2-S8 q11=B1A-H1-REVIEW q12=B1A-SELF-CONTAIN q13=B1A-S12-IT q14=B3-RETRO-PAY-ADJUSTMENTS+B3-BANK-PAYMENT-FILES q15=B2-B9D-OWN-1046 q16=B2-B9D-OWN-1379 q17=B2-B9D-OWN-59 q18=B2-B9D-OWN-1052 q19=B2-B9D-OWN-1438 q20=B2-B9D-OWN-1420 q21=B2-B9D-OWN-1430 | domain_id=55 -->
