# Compensation Management (COMP-MGMT): questions waiting for you

## What this domain is

Plan, benchmark, award, and communicate every form of employee pay in one place.

Run the full compensation cycle: build pay plans and salary bands against market benchmarks, run merit and bonus cycles, calibrate and approve manager pay recommendations, administer equity grants through vesting, and deliver total-rewards statements back to employees. The domain feeds pay changes downstream to payroll, HCM, and finance, and pulls performance and market data in, so compensation decisions stay grounded in real data and stay auditable.

---

q1: (answer this first) The entity equity_grants is currently mastered in two places at once: the cap-table equity-administration market and the compensation incentives module. Which one should be the canonical owner?

- a) Cap-table equity administration keeps the master, and compensation incentives demotes to an embedded copy.
- b) Compensation incentives keeps the master, and cap-table equity administration demotes.
- c) Defer, leave both as masters and accept the failing check until the next audit.

Recommended: a. Cap-table is the equity-administration market where a grant lives for its whole life (vesting, exercise, forfeiture, expiration), so it is the natural canonical home; the compensation copy is kept only for standalone deployments. This decision also unblocks permissions, roles, and the equity workflow gates, so it unlocks the rest of the build.

a1:

---

q2: Pay recommendations and total-rewards statements hold individual pay data, but compensation plans currently carry no single-approver flag. Should compensation plans be marked as requiring a single named approver, since plans are typically board-approved at issuance? (yes/no)

Recommended: yes. Plans are normally signed off once at issuance by a single accountable owner. This overwrites an existing flag value, so it needs your confirmation.

a2:

---

q3: Should equity grants be locked once approved, so the grant cannot be edited after sign-off? (yes/no)

Recommended: yes. Most equity-grant flows freeze the grant once it is approved. This overwrites an existing flag value, so it needs your confirmation.

a3:

---

q4: Should total-rewards statements be locked once delivered, so a delivered statement cannot be quietly changed? (yes/no)

Recommended: yes. A statement that has reached the employee should stay stable for the record. This overwrites an existing flag value, so it needs your confirmation.

a4:

---

q5: Salary bands and compensation benchmarks were classified as reference/config data with no workflow states. Confirm that, or do you want approval workflows authored for them?

- a) Confirm both as config-shape reference data with no lifecycle states.
- b) Author lifecycle states for salary bands (for example draft / active / archived) and leave benchmarks as a periodic refresh.
- c) Author lifecycle states for both (this would reclassify them as workflow entities).

Recommended: a. Both are edited periodically with no defined approval workflow, so the config-shape classification is the consistent answer and no states are needed.

a5:

---

q6: Should the pay-equity capability also be attached to the compensation planning module, not just benchmarking, since pay-equity gap detection feeds merit calibration and pay-transparency reporting? (yes/no)

Recommended: yes. Pay-equity analysis is intrinsic to the planning workflow, not only to benchmarking. Low stakes and additive, but capability placement is your editorial call.

a6:

---

q7: The vendor Sequoia One is linked to this domain as a secondary solution, but it is a PEO / benefits broker rather than a compensation-planning platform. What should happen to it?

- a) Remove the link (scope creep).
- b) Keep it as a secondary solution (broker-touches-comp narrative).
- c) Move its primary placement to benefits administration or HRIS, where it fits better.

Recommended: a. Sequoia One does not compete in the compensation-planning market, so the link over-includes. Removing it is a destructive delete, so it needs your sign-off.

a7:

---

q8: The vendor beqom appears three times (beqom, beqom Pay, Beqom Compensation). Which row is canonical, and what happens to the others?

- a) Keep the oldest, simplest entry (beqom) and delete the other two.
- b) Promote Beqom Compensation to match the naming of other compensation entries.
- c) Keep all three as distinct product lines.

Recommended: a. beqom is one vendor with one flagship product, so a single clean row is right. Deleting the duplicates is destructive, so it needs your sign-off.

a8:

---

q9: Ten rollup notes (nine on the data-object rollup, one on a module data-object row) carry mechanical context text that may violate the no-notes rule. Were these user-approved at load time, or auto-populated by a prior loader?

- a) User-approved; leave them in place.
- b) Auto-populated; clear all ten notes to empty and log the incident.

Recommended: b, if you did not approve them. Clearing the notes is a destructive overwrite, so it needs your call; if you did approve them at load time, choose (a).

a9:

---

q10: Four cross-domain handoff process tags currently point at coarse or mismatched APQC processes (two onboarding/training tags on promotion and creation events, two plan-review tags on plan-published events). Should they be replaced with the more accurate compensation-administration process? (yes/no)

Recommended: yes. The handoffs are compensation-administration events, not onboarding or plan-review events. Each replacement overwrites an existing tag, so it needs your sign-off.

a10:

---

q11: Three required cross-domain data dependencies (earning codes and an employment-contract consumer on planning, job offers on statements) point at masters owned by other domains, which breaks standalone deployment of this domain. Should each be made self-contained, either by carrying a local copy or by marking the dependency optional? (yes/no)

Recommended: yes. Standalone deploys need every required dependency satisfied locally. Each fix rewrites an existing dependency row, so it is destructive and needs your sign-off.

a11:

---

q15: Payroll Management forwards merit recommendation to Compensation Management to administer compensation and rewards to employees, but Compensation Management does not yet have anyone assigned to administer compensation and rewards to employees, so this step has no owner. How should it be handled?
- a) Record it now as work Compensation Management owns, and assign a named owner once Compensation Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Compensation Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a15:

---

q16: Human Capital Management forwards compensation plan to Compensation Management to review compensation plan, but Compensation Management does not yet have anyone assigned to review compensation plan, so this step has no owner. How should it be handled?
- a) Record it now as work Compensation Management owns, and assign a named owner once Compensation Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Compensation Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a16:

---

q17: Core Financial Management forwards equity grant to Compensation Management to process journal entries, but Compensation Management does not yet have anyone assigned to process journal entries, so this step has no owner. How should it be handled?
- a) Record it now as work Compensation Management owns, and assign a named owner once Compensation Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Compensation Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a17:

---

q18: A fresh handoff-payload review found two process tags on this domain's handoffs that point at the wrong work. One benchmark-to-workforce-planning handoff is tagged at a process level that is broader than where the work is actually done, and four employee-data handoffs are tagged as compensation administration when the work is really employee separation / data maintenance owned by the people system. Should these tags be corrected? (yes/no)

Recommended: yes. The corrected tags match where the work actually happens. Each correction either re-points or deletes an existing tag, so it is destructive and needs your sign-off.

a18:

---

## Optional (will not hold up the build)

q12: Six market-surface entities show up across the flagship compensation vendors (pay-equity assessments, incentive plans, bonus pools, commission statements, total-rewards offers, pay-transparency disclosures). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Several are driven by pay-transparency regulation and are common across the vendor set, though they still want a verification pass first.

a12:

---

q13: Today the incentives module bundles bonus, equity, and commission together. Should incentive compensation management (sales commissions and quotas) be split out as its own domain? (yes/no)

Recommended: not yet. Sales-incentive management is a distinct point-solution market, but a split only pays off once commission and quota entities actually land. Additive and non-blocking.

a13:

---

q14: Only two compliance regulations are linked today. Should I add the US executive-pay and equity-valuation regimes plus the state pay-transparency laws (CEO pay-ratio, deferred-comp rules, equity-valuation and executive-deduction tax rules, and the CA / CO / NY / WA pay-transparency laws)? (yes/no)

Recommended: yes, pending a quick relevance check per regulation. Additive and non-blocking.

a14:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S7.plansingleapprover q3=B2-S7.equitysubmitlock q4=B2-S7.statementsubmitlock q5=B2-S5 q6=B2-S6 q7=B2-S3 q8=B2-S4 q9=B2-S2 q10=B1A-S9-RESIDUAL q11=B1A-SELF-CONTAIN q12=B3-PAY-EQUITY-ASSESSMENTS+B3-INCENTIVE-PLANS+B3-BONUS-POOLS+B3-COMMISSION-STATEMENTS+B3-TOTAL-REWARDS-OFFERS+B3-PAY-TRANSPARENCY-DISCLOSURES q13=B3-ICM-DOMAIN-SPLIT q14=B3-COMPLIANCE-REGULATIONS q15=B2-B9D-OWN-1046 q16=B2-B9D-OWN-1049 q17=B2-B9D-OWN-1379 q18=B1A-B9D-DESTRUCTIVE | domain_id=60 -->
