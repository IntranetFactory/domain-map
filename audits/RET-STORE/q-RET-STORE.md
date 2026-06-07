# Retail Store Operations (RET-STORE): questions waiting for you

## What this domain is
Run the store floor: dispatch tasks, audit execution, schedule the right hours in the right places.

This is the daily-rhythm engine for frontline retail. It pushes tasks and shift-start checklists out to associates, runs store audits, mystery shops, and planogram compliance checks, and publishes the labor schedule that puts the right people in the right place at the right time. The payoff is consistency across every store, less shrinkage, and frontline accountability you can see. It feeds time and labor data back into your workforce-management domain and opens coaching cases into CRM and customer service when a store falls short.

---

q1: (answer this first) How should Retail Store Operations be split into modules (the sub-areas of the product)?

- a) Three modules: Task Execution (store tasks and associate checklists); Labor Scheduling (retail labor schedules); Audit Execution (store audits, mystery shopper records, planogram compliance).
- b) Two modules: collapse audit, mystery, and planogram into the task-execution module, leaving Store Execution plus Labor Scheduling.
- c) Some alternate shape you name.

Recommended: a. Once the retail-specific capabilities land, the three-or-more-capability threshold pushes past a two-module floor, and the ServiceNow, Reflexis, and NewStore taxonomies all vote three modules. This choice drives every module, capability, lifecycle owner, and handoff routing below it, so it unlocks the rest of the build.

a1:

---

q2: Where should store associate checklists live?

- a) With store tasks, in the Task Execution module (workflow overlap with day-to-day tasks).
- b) With retail labor schedules, in the Labor Scheduling module (per-shift attestation).

Recommended: a. The checklist behaves like a grouped set of store tasks and shares the task-execution workflow, so it sits most naturally alongside store tasks.

a2:

---

q3: Should mystery shopper records be flagged as carrying personal data, given they hold shopper details and named-employee scoring? (yes/no)

Recommended: yes. The records carry shopper PII and named-employee scoring, so they belong under personal-data handling. This flips a current false value, so it needs your confirmation.

a3:

---

q4: Should store audits require a single named approver (for example a district manager signature) to sign them off? (yes/no)

Recommended: yes. A district-manager signature is the normal sign-off for a store audit. This flips a current false value, so it needs your confirmation.

a4:

---

q5: Should a store audit be frozen once it is closed, so the record cannot be quietly edited afterward? (yes/no)

Recommended: yes. A closed audit is a fixed record of what was found, and locking it preserves an accurate history. This flips a current false value, so it needs your confirmation.

a5:

---

q6: Should planogram compliance records be flagged as carrying personal data, since their photos may capture employees or shoppers? (yes/no)

Recommended: yes. Compliance photos can incidentally capture people, so the personal-data flag is the safe call. This flips a current false value, so it needs your confirmation.

a6:

---

q7: Should the obvious milestone transitions be gated by permission (store task completed, labor schedule published, store audit passed, planogram record scored), so only authorized users can advance them? (yes/no)

Recommended: yes. These four transitions are the accountability moments in each workflow and should be permission-gated rather than open to anyone.

a7:

---

q8: How should the legacy store-operations system skill be handled now that the domain gets exactly one domain-grain skill?

- a) Rehome it: keep the legacy skill as the single domain-grain system skill and let it derive its toolset from the modules.
- b) Delete the legacy skill outright and author a fresh domain-grain skill.

Recommended: a. Rehoming reuses the existing row and minimizes churn; deleting only makes sense if you want a clean slate. Either route touches an existing non-new row, so it needs your sign-off.

a8:

---

q9: For the five publisher-side user relationships that still use noun-phrase names (assigned checklists, publishes schedules, conducted audits, verified planogram, submitted mystery shop), how should the verb forms be set?

- a) Accept the suggested snake_case forms (assigned_checklist_to_user, published_by_user, conducted_by_user, verified_by_user, submitted_by_user).
- b) You supply the exact five verb forms.

Recommended: a. The suggested forms follow the project verb-shape convention; override only if you have a preferred wording. Renaming these overwrites a non-empty value, so it needs your call.

a9:

---

q10: Beyond the default embedded shells (users on all modules; work shifts and time entries on the task and labor modules; customer cases and employment events on the audit module), should employees and locations also be embedded as optional shells?

- a) Embed users, the workforce masters, employees, and locations on all three modules.
- b) Embed only users and the workforce masters; defer employees and locations until a deployer asks.
- c) You supply a per-module list.

Recommended: b. Infrastructure masters are always optional on consuming modules, and deferring employees and locations keeps the first build lean while leaving room to add them when a deployer needs them.

a10:

---

## Optional (will not hold up the build)

q11: Six extra store-floor objects show up across the flagship vendors (store visit logs, safety incidents, store huddle logs, loss-prevention alerts, store promotion execution records, shift handover logs). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Some of these may route to sibling domains (frontline comms, loss prevention, promotions), so each wants a verification pass before it lands.

a11:

---

<!-- agent map, ignore: q1=B2-1 q2=B2-1.checklist q3=B2-2.shopperpii q4=B2-2.auditapprover q5=B2-2.auditlock q6=B2-2.planogrampii q7=B2-2.stategates q8=B2-4 q9=B2-VERB q10=B2-5 q11=B3-1+B3-2+B3-3+B3-4+B3-5+B3-6 | domain_id=48 -->
