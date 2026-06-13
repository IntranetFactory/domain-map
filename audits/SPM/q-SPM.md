# Strategic Portfolio Management (SPM): questions waiting for you

## What this domain is

Plan where the organization invests next, balance demand against capacity, and track the value every initiative actually delivers. Demand requests arrive, get scored on business value and risk, and the strongest candidates become funded initiatives grouped into portfolios that roll up to corporate strategy. Resource and capacity planning is the engine: allocations are committed against capacity, what-if scenarios are modeled before a commitment, and roadmap items are scheduled with their dependencies in view. After the plan is set, benefits are tracked against the case that justified each investment.

The domain is now fully built: 3 modules (Demand and Value Management, Portfolio Planning, Resource and Capacity Planning), 8 mastered objects, full lifecycle/relationships/tools, all at `record_status='new'` for your review in the records.

---

q1: Three outbound handoffs fire on events that SEM actually publishes, not SPM. Now that strategic initiatives and OKRs are mastered by SEM (the split you chose), the events `initiative.kickoff`, `initiative.completed`, and `okr_objective.created` belong to SEM. These three handoffs are still recorded as coming from SPM. How should they be fixed?

- a) Re-attribute all three to SEM as the source (handoff 178 okr_objective.created to Work Management, handoff 245 initiative.completed to EPM, handoff 241 initiative.kickoff to SWP). This matches the boundary you chose; it overwrites the existing source on those rows and adds them to SEM's outbound surface.
- b) Leave them as-is on SPM (treat SPM as forwarding the events).
- c) Delete them if SEM already publishes the same edges (I would check for SEM duplicates first).

Recommended: a. Under the split you chose, SEM owns these events, so SEM is the correct publisher. ServiceNow and Planview both fire initiative and OKR lifecycle events from the strategy-execution surface, not the planning surface, so SEM is the right source. This is a destructive overwrite of existing rows and touches SEM, so it needs your sign-off rather than being auto-applied.

a1:

---

q3: Enterprise Performance Management forwards scenario plan to Strategic Portfolio Management to perform planning or budgeting or forecasting, but Strategic Portfolio Management does not yet have anyone assigned to perform planning or budgeting or forecasting, so this step has no owner. How should it be handled?
- a) Record it now as work Strategic Portfolio Management owns, and assign a named owner once Strategic Portfolio Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Strategic Portfolio Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a3:

---

q4: Enterprise Performance Management forwards benefits tracking record to Strategic Portfolio Management to monitor and analyze IT value and benefits, but Strategic Portfolio Management does not yet have anyone assigned to monitor and analyze IT value and benefits, so this step has no owner. How should it be handled?
- a) Record it now as work Strategic Portfolio Management owns, and assign a named owner once Strategic Portfolio Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Strategic Portfolio Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a4:

---

## Optional (will not hold up the build)

q2: Flagship SPM vendors model several entities SPM does not yet carry, now that the modules exist. Should I research these and add the ones that hold up? Program increments (SAFe cadence), investment categories (Clarity funding hierarchy), capacity/resource pools, portfolio funding decisions, portfolio milestones, a risk-registers consumer link (GRC), and a value-streams consumer link (VSDP). (yes/no)

Recommended: yes, additive only. Each lands in an existing module and none changes the shape you approved.

a2:

---

<!-- agent map, ignore: q1=B2-HANDOFF-REATTRIB q2=B3-PROGRAM-INCREMENTS+B3-INVESTMENT-CATEGORIES+B3-CAPACITY-POOLS+B3-PORTFOLIO-FUNDING-DECISIONS+B3-PORTFOLIO-MILESTONES+B3-RISK-REGISTERS+B3-VALUE-STREAMS-CONSUMER q3=B2-B9D-OWN-297 q4=B2-B9D-OWN-1133 | domain_id=9 -->
