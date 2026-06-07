# Sales Performance Management (SALES-PERF): questions waiting for you

## What this domain is
Plan, allocate, and pay your sales organization. Design territories and quotas, model commission plans, and run accurate commission statements every period.

Sales Performance Management runs the planning and pay side of your sales motion. Design territories and roll up quotas to match your go-to-market segments, then build commission plans with the rate tables, accelerators, draws, and SPIFs your sales leaders need to motivate the team. Each period, every credited transaction flows into the engine, calculates commissions per plan, and posts a payee statement your sellers can audit. Sellers raise disputes against statements, finance signs off on commission expense, and the next plan cycle starts with clean territory and quota data. Built for sales-ops and rev-ops teams who own quota strategy and commission accuracy, with finance partnering on commission expense (ASC 606 amortization) and HR partnering on payee eligibility.

---

q1: (answer this first) How should Sales Performance Management be split into modules (the sub-areas of the product)?

- a) Eight modules: one per capability with a shared Commissions module (Plan Design; Territory; Quota; Capacity; Commissions; Disputes; SPIFs; Comp Expense). Granular shape mirroring Varicent, Xactly, Spiff, CaptivateIQ, Performio, SAP.
- b) Five modules: collapse the planning surface (Plan Design, Territory, Quota, Capacity) into one Planning module, keeping Commissions, Disputes, SPIFs, and Comp Expense. Mirrors Anaplan and Pigment.
- c) Three modules: Planning, Execution, and a Finance Bridge, for slim deploy targets.

Recommended: a. One module per capability with a shared Commissions module is the canonical ICM shape across the flagship vendors. This choice drives the whole build: it sets where every master lands, the per-module handoff backfill, and the capability-to-module mapping, so it unlocks everything below it.

a1:

---

q2: Should the INCENTIVE-COMP-MGMT capability carry a cross-functional ownership override, given it overlaps the broader employee-comp surface that Compensation Management already owns?

- a) Add Compensation Management as a contributor.
- b) Leave the domain-level ownership as-is (Sales Operations owns sales comp end to end).
- c) Add Finance as a co-owner, reflecting the ASC 606 close cycle.

Recommended: a. Compensation plans are already mastered by the Compensation Management domain, so naming it a contributor reflects the real overlap without handing ownership away. Not a structural blocker.

a2:

---

q3: Which regulations should Sales Performance Management link to?

- a) ASC 606-21 only.
- b) ASC 606-21 plus SOX.
- c) ASC 606-21 plus SOX plus GDPR.
- d) ASC 606-21 plus SOX plus GDPR plus Reg BI plus FINRA (full set, including the regulated-finance carve-out).
- e) Defer until vendor research confirms whether regulated-finance ICM (beqom Pay) is a real market signal.

Recommended: c. ASC 606-21 covers commission capitalization, SOX covers internal controls, and GDPR covers payee personal data, which fits a typical sales-comp footprint. Pick (d) only if you sell regulated financial products through commissioned sellers.

a3:

---

q4: The existing process tag on the "account tier changed" handoff (handoff 203) points at an accounting process, picked by a substring matcher that pulled "account" out of the event name. It is wrong, and the correct tag already exists alongside it. What should happen to the bad row?

- a) Mark the bad row rejected and let the correct tag supersede it.
- b) Delete the bad row entirely for a cleaner audit trail.
- c) Keep it as-is (you disagree with the audit's verdict).

Recommended: a. Rejecting it preserves the audit trail while letting the correct tag stand. Both (a) and (b) change an existing row that the agent did not author, so this needs your sign-off before anything is touched.

a4:

---

q5: When the build lands, which pairwise cross-domain reconciliation passes do you want scheduled?

- a) Schedule both the CRM and REV-INTEL passes immediately after the build lands.
- b) Defer until the edge weight independently crosses the deep-dive threshold.
- c) Run only the CRM pass for now (REV-INTEL has modularized, but the SALES-PERF side must build first).

Recommended: a. Reconciliation is read-only, so running both once modules exist is cheap and catches boundary drift early. Timing is your call, not a structural blocker.

a5:

---

## Optional (will not hold up the build)

q6: Several module-shape carve-outs depend on a vendor-research pass: commission-expense accounting (ASC 606) as its own module versus folded into Commissions; a crediting and eligibility rule designer as a standalone module versus configuration inside Commissions; overlay seller compensation as its own entity versus plan-component flags; and capacity planning as a module here versus a separate planning-platform domain with a different buyer. Should I research these and add the ones that hold up? (yes/no)

Recommended: yes, but additive and best done after the modules exist. Each is informed by the shape you pick in q1, and the capacity-planning answer may queue a new candidate domain.

a6:

---

<!-- agent map, ignore: q1=B2-M1 q2=B2-C1 q3=B2-R1 q4=B2-H1 q5=B2-P1 q6=B3-CompExpense+B3-CreditingRules+B3-Overlay+B3-CapacityCarveout | domain_id=102 -->
