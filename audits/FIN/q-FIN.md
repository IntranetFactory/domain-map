# Core ERP Financial Management (FIN): questions waiting for you

## What this domain is

The accounting system of record: the ledger that every other part of the business posts into. It runs the general ledger and chart of accounts, the period close and multi-entity consolidation, fixed assets and depreciation, cash and bank reconciliation, intercompany matching, and revenue recognition. It is where payroll, billing, expenses, procurement, and dozens of operational systems hand off their financial postings, and where multi-GAAP translation, allocation, and statutory reporting (SOX, IFRS, US GAAP, ASC 606) get applied.

---

q1: (answer this first) The build shipped 4 modules (GL and Close, Fixed Assets, Cash and Banking, Revenue Recognition), leaving out standalone Accounts Receivable and Accounts Payable modules because customer invoicing is owned by your CRM / order / subscription domains and supplier invoicing by your AP automation domain. Keep it at 4 modules, or add the two extra AR / AP modules?

- a) Keep 4 modules. No module owns a master it does not actually hold, and the AR and AP capabilities stay anchored to Cash and Banking.
- b) Add an AR Billing module and an AP Disbursement module as borrowed-master / consumer modules, and move the AR and AP capabilities there. Only do this if you want FIN to hold its own receivable / payable sub-ledger detail (open-item management, dunning, payment runs) rather than just consuming the downstream masters.

Recommended: a. In the flagship ERPs (S/4HANA FI-AR / FI-AP, Oracle Fusion Receivables / Payables, NetSuite AR / AP, D365 Finance, Workday) AR and AP are standalone sub-ledger modules precisely because each masters its own open-item ledger (customer / supplier open items, dunning, payment and disbursement runs) and posts only a summary to the GL. FIN holds no such master: customer invoicing is mastered by CRM / OMS / SUB-MGMT and supplier invoicing by AP-AUTO, so the vendor justification for a dedicated AR or AP module does not apply here, and the AR (60) and AP (61) capabilities stay anchored to Cash and Banking as consumers. The 4-module split therefore matches the flagship packaging once the AR / AP mastering already lives upstream.

a1:

---

q2: Six descriptive note strings sit on data-object rows (the payroll, benefits, cost-center, fixed-asset, expense, and project rows). Project rules forbid free-text notes unless you approved them at load time. Did you approve these notes, or were they auto-populated by a loader?

- a) I approved them at load time. Leave them in place.
- b) A loader added them. Clear all six notes and log the incident in the skill changelog.

Recommended: b. The audit cannot tell approval status from live state alone, and unapproved descriptive prose should be cleared. Pick (a) only if you remember signing off on this text. Clearing a non-empty value is a destructive change, so it needs your sign-off.

a2:

---

q3: Should a posted journal entry be locked once posted (one-way), and require a single named controllership approver? (yes/no)

Recommended: yes. Posting is a one-way ledger event and controllership sign-off is standard. This flips current settings that are off, so it overwrites a current value and needs your confirmation.

a3:

---

q4: Should an accounting period be locked once closed (one-way), and require a single named controller to approve the close? (yes/no)

Recommended: yes. A period close is a one-way control point that a single controller owns. This flips current settings that are off, so it overwrites a current value and needs your confirmation.

a4:

---

q5: Should an intercompany transaction require a single named approver before it is treated as matched? (yes/no)

Recommended: yes. Intercompany matching is a controllership-approver workflow. This flips a current setting that is off, so it overwrites a current value and needs your confirmation.

a5:

---

q6: Should a fixed asset require a single named approver for capitalization and disposal? (yes/no)

Recommended: yes. Capitalizing and disposing of assets are single-approver control points. This flips a current setting that is off, so it overwrites a current value and needs your confirmation.

a6:

---

q7: Should a revenue recognition record be locked once recognized (one-way), and require a single named approver? (yes/no)

Recommended: yes. Recognition is a one-way event with controllership accountability. This flips current settings that are off, so it overwrites a current value and needs your confirmation.

a7:

---

q8: General ledger accounts and cost centers are reference data with no obvious workflow gate. Should they stay config-shape (just active or inactive), or get a full 4-state lifecycle?

- a) Treat both as config-shape and skip the lifecycle states.
- b) Author a 4-state machine on both (proposed, active, deactivated, archived).

Recommended: a. Both are reference-data masters with no real workflow gate, so the config-shape exemption fits. This is recorded as an explicit exemption, so it needs your sign-off.

a8:

---

q9: The domain's business-logic blurb contains a forbidden em-dash. Approve replacing it with this wording: "Consolidation, allocation, multi-GAAP translation, and period-close orchestration: the regulated calc kernel inside an otherwise transactional ledger."? (yes/no)

Recommended: yes. It removes the forbidden character and keeps the original meaning. Answer no and supply your own wording if you prefer different phrasing. This overwrites existing catalog prose, so it needs your approval.

a9:

---

q10: 110 of the 113 cross-domain handoffs now carry process tags the agent authored (97 of them agent-curated), all sitting unapproved. Should the agent-curated tags you trust be promoted to approved? (yes/no)

Recommended: yes, after a quick review in the UI of the ones you trust. Promotion to approved is a sign-off step, so it is never applied automatically.

a10:

---

q13: Enterprise Performance Management forwards gl account to Core Financial Management to perform general accounting, but Core Financial Management does not yet have anyone assigned to perform general accounting, so this step has no owner. How should it be handled?
- a) Record it now as work Core Financial Management owns, and assign a named owner once Core Financial Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Core Financial Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a13:

---

q14: Enterprise Performance Management forwards journal entry to Core Financial Management to process period end adjustments, but Core Financial Management does not yet have anyone assigned to process period end adjustments, so this step has no owner. How should it be handled?
- a) Record it now as work Core Financial Management owns, and assign a named owner once Core Financial Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Core Financial Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a14:

---

q15: Enterprise Performance Management forwards depreciation schedule to Core Financial Management to calculate and record depreciation expense, but Core Financial Management does not yet have anyone assigned to calculate and record depreciation expense, so this step has no owner. How should it be handled?
- a) Record it now as work Core Financial Management owns, and assign a named owner once Core Financial Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Core Financial Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a15:

---

q16: Accounts Payable Automation forwards bank account to Core Financial Management to manage in-house bank accounts, but Core Financial Management does not yet have anyone assigned to manage in-house bank accounts, so this step has no owner. How should it be handled?
- a) Record it now as work Core Financial Management owns, and assign a named owner once Core Financial Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Core Financial Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a16:

---

q17: Audit Management forwards journal entry to Core Financial Management to process journal entries, but Core Financial Management does not yet have anyone assigned to process journal entries, so this step has no owner. How should it be handled?
- a) Record it now as work Core Financial Management owns, and assign a named owner once Core Financial Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Core Financial Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a17:

---

q18: Audit Management forwards intercompany transaction to Core Financial Management to post and reconcile intercompany transactions, but Core Financial Management does not yet have anyone assigned to post and reconcile intercompany transactions, so this step has no owner. How should it be handled?
- a) Record it now as work Core Financial Management owns, and assign a named owner once Core Financial Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Core Financial Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a18:

---

q19: Audit Management forwards fixed asset to Core Financial Management to audit invoices and key data in AP system, but Core Financial Management does not yet have anyone assigned to audit invoices and key data in AP system, so this step has no owner. How should it be handled?
- a) Record it now as work Core Financial Management owns, and assign a named owner once Core Financial Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Core Financial Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a19:

---

q20: Audit Management forwards cash transaction to Core Financial Management to manage and reconcile cash positions, but Core Financial Management does not yet have anyone assigned to manage and reconcile cash positions, so this step has no owner. How should it be handled?
- a) Record it now as work Core Financial Management owns, and assign a named owner once Core Financial Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Core Financial Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a20:

---

q21: Three of FIN's outbound handoffs (the period-close notice to Audit, the period-reopen notice to GRC, and the new-legal-entity notice to Audit) are currently tagged with a broad "perform general accounting and reporting" process. A more specific match, "process period end adjustments", exists for the same work. Re-point all three to the more specific process? (yes/no)

Recommended: yes. The narrower process describes the work more precisely. This overwrites an existing tag on three rows, so it needs your sign-off.

a21:

---

q22: Governance, Risk and Compliance forwards accounting period to Core Financial Management to perform general accounting and reporting, but Core Financial Management does not yet have anyone assigned to perform general accounting and reporting, so this step has no owner. How should it be handled?
- a) Record it now as work Core Financial Management owns, and assign a named owner once Core Financial Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Core Financial Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a22:

---

## Optional (will not hold up the build)

q11: Flagship ERPs model several deeper financial masters that FIN does not have yet: chart-of-accounts segments, journal-entry lines, currencies and exchange rates, allocations and allocation rules, FX revaluation runs, consolidation units and elimination entries, revenue contracts and performance obligations, and tax codes and jurisdictions. Should I research and add the ones that hold up across the vendor set? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Several are common across the flagship vendors, though each still wants a verification pass first.

a11:

---

q12: Three regulations could be surfaced on FIN as financial-impact touchpoints: the EU Corporate Sustainability Reporting Directive, OECD Pillar Two global minimum tax, and explicit ASC 842 / IFRS 16 lease-accounting rows. Should I research and add the ones that fit? (yes/no)

Recommended: yes, but additive and non-blocking. All three shape FIN disclosures or consolidation, though they overlap with the ESG and tax domains and want a scoping check.

a12:

---

<!-- agent map, ignore: q1=B2-MODULE-SPLIT-CONFIRM+B3-MISSING-MASTER-AR-AP q2=B2-S1 q3=B2-S2.je q4=B2-S2.period q5=B2-S2.intercompany q6=B2-S2.fixedassets q7=B2-S2.revrec q8=B2-S3 q9=B2-S6 q10=B2-S7 q11=B3-CHART-OF-ACCOUNTS-SEGMENTS+B3-JOURNAL-ENTRY-LINES+B3-CURRENCIES+B3-ALLOCATIONS+B3-REVALUATION-RUNS+B3-CONSOLIDATION-UNITS+B3-REVENUE-CONTRACTS+B3-TAX-CODES q12=B3-CSRD+B3-PILLAR-TWO+B3-LEASE-ACCOUNTING q13=B2-B9D-OWN-307 q14=B2-B9D-OWN-1381 q15=B2-B9D-OWN-1392 q16=B2-B9D-OWN-320 q17=B2-B9D-OWN-1379 q18=B2-B9D-OWN-1382 q19=B2-B9D-OWN-1433 q20=B2-B9D-OWN-1461 q21=B2-B9D-RETAG-9-3 q22=B2-B9D-OWN-56 | domain_id=65 -->
