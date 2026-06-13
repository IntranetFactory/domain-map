# Enterprise Performance Management (EPM): questions waiting for you

## What this domain is
Plan the numbers, budget the year, forecast the outlook, model the what-ifs, and explain the variance. EPM runs the full financial-planning loop: build and approve the annual operating plan and budget, refresh rolling forecasts, stress-test the plan with driver-based scenarios, then reconcile actuals against plan and report the results to leadership. The calc kernel (allocations, currency translation, eliminations) is what makes it a planning platform rather than a forms tool.

---

q1: (answer this first) How should EPM be split into modules (the sub-areas of the product)? The 2026-06-02 pass already built and loaded option (d), the 3-module split, and the per-module skills, handoff routing, and lifecycle realizers now hang off it. Confirm that shape, or pick an alternative (a rebuild).

- a) (d) ADOPTED, the 3-module split: Planning and Budgeting (plans + budgets), Forecasting and Scenario Modeling (forecasts + scenarios), Variance and Management Reporting (variance analyses).
- b) (a) 5-module per-capability split: Budget, Forecast, Scenario, Workforce-Plan, Variance (rebuild required).
- c) (c) 2-module split: Planning (plans + budgets + forecasts + scenarios) plus Reporting (variances) (rebuild required).
- d) (e) a custom alternative you supply (rebuild required).

Recommended: a. It is already live and matches how the FP&A platforms cluster the work; the other options force a rebuild and re-cascade every downstream load. This choice drives every module, lifecycle owner, role, and per-module link below it, so it unlocks the rest of the build.

a1:

---

q2: For the trigger event "material variance detected" (event 587), should its category be set as a threshold event or a state-change event?

- a) threshold (the variance crossed the materiality threshold).
- b) state_change (the variance row transitioned into the material state).

Recommended: either reading is defensible; pick the one that matches how downstream consumers react. Once you pick, the empty category on event 587 gets filled in automatically.

a2:

---

q3: Two legacy notes on EPM's shared-entity rows (the org_units contributor row and the journal_entries consumer row) restate facts already held in structured columns. Were these notes explicitly approved by you when they were loaded, or auto-populated by the loader?

- a) Approved at load time, leave both notes in place.
- b) Auto-populated, clear both notes to empty and log a hygiene incident.

Recommended: b. The wording duplicates the structured role and necessity columns, which is what the notes-empty-by-default rule guards against. Clearing a populated value is destructive, so it needs your sign-off.

a3:

---

q4: The FP&A workforce-partner role currently sits entirely on the strategic-workforce-planning modules. Now that the Planning and Budgeting module exists (the headcount-spend slice of the budget), how should the role be scoped?

- a) Make it primary on Planning and Budgeting and secondary on the workforce cost-projections module.
- b) Keep it entirely on strategic-workforce-planning, and surface EPM access through permission grants only.
- c) Split it into two roles, one EPM-scoped and one workforce-scoped.

Recommended: a. The module now exists and the persona's primary workflow is the headcount-spend slice of the budget. This may shift if you add a dedicated headcount-plan master (see the Optional section).

a4:

---

q5: Should approved financial plans freeze once approved, so an approved plan cannot be quietly edited? (yes/no)

Recommended: yes. An approved plan is the baseline everything else compares against, so locking it keeps that baseline honest.

a5:

---

q6: Should financial plans use a single named approver (typically the CFO or controller)? (yes/no)

Recommended: yes. Plan approval is normally one accountable sign-off rather than a committee.

a6:

---

q7: Should approved budgets freeze once approved, so a locked budget is not edited after the fact? (yes/no)

Recommended: yes. A locked budget is the spending envelope of record; changes should go through a new cycle, not an edit.

a7:

---

q8: Should rolling forecasts stay editable cycle-to-cycle (no freeze on approval)? (yes/no)

Recommended: yes. Rolling forecasts are refreshed every cycle by design, so a submit-lock would fight the workflow.

a8:

---

q9: Should variance analyses stay multi-approver (no single approver), since commentary is shared across cost-center owners? (yes/no)

Recommended: yes. Variance commentary is authored and signed off by several cost-center owners, not one person.

a9:

---

q10: One intra-domain handoff is still missing: when a budget is approved, Planning and Budgeting should hand off to Variance and Management Reporting. There is no "budget approved" event in the catalog yet (only "budget cycle started"). May I author the missing "financial budget approved" event and insert that handoff? (yes/no)

Recommended: yes, once the budget state machine in q7 is settled, since the approved state it depends on comes from that answer. Minting a new event is master-data creation, so it needs your OK.

a10:

---

q13: Strategic Portfolio Management forwards financial scenario to Enterprise Performance Management to perform planning or budgeting or forecasting, but Enterprise Performance Management does not yet have anyone assigned to perform planning or budgeting or forecasting, so this step has no owner. How should it be handled?
- a) Record it now as work Enterprise Performance Management owns, and assign a named owner once Enterprise Performance Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Enterprise Performance Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a13:

---

q14: Human Capital Management forwards financial plan to Enterprise Performance Management to prepare periodic budgets, but Enterprise Performance Management does not yet have anyone assigned to prepare periodic budgets, so this step has no owner. How should it be handled?
- a) Record it now as work Enterprise Performance Management owns, and assign a named owner once Enterprise Performance Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Enterprise Performance Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a14:

---

q15: Core Financial Management forwards financial plan to Enterprise Performance Management to operationalize and implement plans to achieve budget, but Enterprise Performance Management does not yet have anyone assigned to operationalize and implement plans to achieve budget, so this step has no owner. How should it be handled?
- a) Record it now as work Enterprise Performance Management owns, and assign a named owner once Enterprise Performance Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Enterprise Performance Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a15:

---

q16: Audit Management forwards forecast to Enterprise Performance Management to prepare periodic financial forecasts, but Enterprise Performance Management does not yet have anyone assigned to prepare periodic financial forecasts, so this step has no owner. How should it be handled?
- a) Record it now as work Enterprise Performance Management owns, and assign a named owner once Enterprise Performance Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Enterprise Performance Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a16:

---

q17: Core Financial Management forwards variance analysis to Enterprise Performance Management to perform variance analysis against forecasts and budgets, but Enterprise Performance Management does not yet have anyone assigned to perform variance analysis against forecasts and budgets, so this step has no owner. How should it be handled?
- a) Record it now as work Enterprise Performance Management owns, and assign a named owner once Enterprise Performance Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Enterprise Performance Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a17:

---

## Optional (will not hold up the build)

q11: Two master entities that every flagship EPM platform ships are absent today: an allocation engine (allocation rule definitions plus their per-period runs) and a headcount/position-level plan separate from the dollar plan. Should I research and add the ones that hold up? (yes/no)

Recommended: yes. The missing allocation engine is the single highest-leverage gap (it is what makes the catalog read EPM as a calc-kernel platform rather than a forms tool); the headcount plan depends on the q4 role decision. Additive and can happen after the modules exist.

a11:

---

q12: OneStream and Oracle EPM bundle close, consolidation, and disclosure onto the same platform; EPM has none of that surface today, and consolidation/disclosure are queued as separate candidate domains. Should EPM gain a fourth consolidation/disclosure module, or should those stay separate domains? (yes/no)

Recommended: keep them as separate candidate domains for now and revisit after they are triaged; fold a fourth module into EPM only if they are not promoted on their own. Non-blocking.

a12:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S7b q3=B2-S4 q4=B2-S2 q5=B2-S3.plansubmitlock q6=B2-S3.plansingleapprover q7=B2-S3.budgetsubmitlock q8=B2-S3.forecastsubmitlock q9=B2-S3.variancesingleapprover q10=B1A-S10b q11=B3-S1+B3-S2 q12=B3-S3 q13=B2-B9D-OWN-297 q14=B2-B9D-OWN-1322 q15=B2-B9D-OWN-1323 q16=B2-B9D-OWN-1324 q17=B2-B9D-OWN-1325 | domain_id=66 -->
