# Employee Onboarding (ONBOARDING): questions waiting for you

## What this domain is
Take a new hire from signed offer to a productive, fully-set-up first weeks. Plan and run each person's onboarding journey (pre-boarding, day one, the first stages and tasks), collect and approve the documents and compliance forms, kick off IT, access, and workplace provisioning, and run the welcome experience (buddy assignments, cohorts, and welcome communications) so every joiner lands well.

---

q1: (answer this first) How should the 22 lifecycle states that gate on a permission be handled? Each state that needs a permission must get a named verb before the workflow-gate permissions and role mappings can be built.

- a) Author all 22 to 24 explicit verbs (one per gated state, across all three modules).
- b) Collapse most states to baseline manage / admin and give explicit verbs only to the real approval gates (plan approved, document collection approved or rejected, journey completed), about 6 verbs.
- c) Decide state by state.

Recommended: a. A verb per gated state gives the cleanest, fully-auditable permission layer and unblocks the whole workflow-gate build below it. The audit must not invent verbs from a state name alone (that reproduced a known stale-permission bug elsewhere), so it needs your confirmation of the verb set. This choice unlocks the rest of the build.

a1:

---

q2: Four cross-domain handoff tags are wrong or too coarse and correcting them overwrites existing (non-empty) process mappings. Should I replace them with the tighter targets? (yes/no)

Recommended: yes. Handoff 7 (onboarding to payroll) is currently tagged to a CRM "customer journey maps" process and handoff 394 (recruiting to onboarding) to the upstream "source candidates" process, both plainly wrong; handoffs 3 and 8 are correct but too coarse. Replacing a non-empty mapping is destructive, so it needs your sign-off.

a2:

---

q3: Four data-object rows on the journey-management module break module self-containment (a contributor or required-consumer pointing at an entity another domain masters). Should I fix them by either carrying a local shell (embedded master) or relaxing them to optional? (yes/no)

Recommended: yes. The four rows (asset lifecycle events, candidates, hardware assets, service requests) each violate the self-containment rule. Rewriting the role or necessity on an existing row is destructive, so it needs your sign-off.

a3:

---

q4: Thirty-one rows (deprecated rollup table, plus handoff rows) carry populated free-text notes. Were these approved when loaded, or should they be reverted to empty? Notes must never be populated without per-row approval.

- a) Confirm they were user-approved at load time; leave them in place.
- b) Confirm they were auto-populated; revert the live (non-retired) rows' notes to empty and log a notes-policy incident.
- c) Decide row by row.

Recommended: a or b based on your memory of the original load. Reverting a non-empty value is destructive, so nothing is changed until you choose. (The retired skill_tools subset of these rows is excluded; it no longer belongs to this domain.)

a4:

---

q5: Should an onboarding journey become append-only once it reaches "in progress", so it cannot be rewound to scheduled or pre-boarding? (yes/no)

Recommended: yes. A journey in flight is a forward-only state machine. This flips the current value, a workflow-shape judgment you own.

a5:

---

q6: Should final completion of an onboarding journey require sign-off by a single named approver (the Onboarding HR Partner or Coordinator)? (yes/no)

Recommended: yes. A single accountable approver on the completion gate is normal. This flips the current value, a workflow-shape judgment you own.

a6:

---

q7: Should an onboarding task become append-only once completed, so a completed task is terminal and cannot be edited? (yes/no)

Recommended: yes. A completed task should be a fixed record. This flips the current value, a workflow-shape judgment you own.

a7:

---

## Optional (will not hold up the build)

q8: Flagship onboarding vendors surface deeper objects than the current model carries. Should I research and add the ones that hold up (per-document records, sub-typed IT / HR / compliance provisioning tasks, 30 / 60 / 90 check-ins, a manager-side action checklist, background-check records, day-one equipment orders, a program-level buddy configuration, plus the W-4 / W-2, OSHA new-hire safety, and US state new-hire-reporting regulations)? (yes/no)

Recommended: yes, but additive and can happen after the decisions above land. Each candidate still wants a verification pass before loading.

a8:

---

<!-- agent map, ignore: q1=B2-WORKFLOW-GATE-VERBS q2=B1A-APQC-REPLACE q3=B1A-SELF-CONTAIN q4=B2-NOTES-POLLUTION q5=B2-PATTERN-FLAGS.journeysubmitlock q6=B2-PATTERN-FLAGS.journeysingleapprover q7=B2-PATTERN-FLAGS.tasksubmitlock q8=B3-PRIOR | domain_id=99 -->
