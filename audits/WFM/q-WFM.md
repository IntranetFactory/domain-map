# Workforce Management (WFM): questions waiting for you

## What this domain is
Plan, track, and pay for the hours your frontline and hourly workforce actually works. Build and publish shift schedules, capture clock-in and clock-out time with meal-break compliance, and run the full request-and-approval flow for time off and absence balances. The aim is accurate, labor-law-compliant time and attendance that feeds clean actuals to payroll and scheduling downstream.

---

q1: (answer this first) Should these pattern flags flip from false to true on the WFM masters? Each is an independent yes/no, and your answers shape the lifecycle states, locks, and permissions the build authors next.

- a) absence_requests has_personal_content (FMLA medical reasons, parental leave reasons)
- b) absence_requests has_single_approver (manager-approval is the canonical workflow)
- c) time_entries has_submit_lock (immutable after pay-period close)
- d) meal_break_records has_personal_content (waiver attestation carries a worker signature)

Recommended: yes to all four. Each matches how the flagship time and absence vendors model these masters, and together they unblock lifecycle, lock, and permission authoring.

a1:

---

q2: Should absence_balances be treated as the config-shape exemption: a continuously recalculated single-state master with no lifecycle states authored? (yes/no)

Recommended: yes. A balance is recalculated as accrual and consumption events fire, so it has one live state rather than a workflow. This is the canonical exemption case.

a2:

---

q3: How much vendor-terminology aliasing should be loaded for the 7 WFM masters (Leave Request, PTO Balance, Roster, Time Punch, and similar)?

- a) Full list (around 20 to 30 aliases across the 7 masters)
- b) Pruned set (3 to 5 per master, you name which)
- c) Skip aliasing entirely (leave it deliberately empty)

Recommended: b. Vendor synonyms genuinely help discovery, but a tight curated set per master avoids marketing-tier sprawl.

a3:

---

q4: The WFM domain row carries an em-dash, British spellings (Labour, optimisation), and dated reanalysis prose in its notes, all against project rules. How should the cleanup be handled?

- a) Approve clearing the notes and rewriting the description and business_logic in American English with no em-dash; the agent supplies replacement text for your approval before writing
- b) Skip and keep it as-is
- c) You supply the exact replacement wording

Recommended: a. The em-dash and American-English fixes are required by project rules, and the agent can draft the replacement copy for you to approve. This overwrites non-empty fields and blanks notes, so it needs your sign-off.

a4:

---

q5: Replace the process tag on handoff 134 (employee.created, HCM to WFM)? Swap the existing row (Manage employee onboarding, training, and development, an L2 process) for the more specific Develop and manage time and attendance systems (L3). (yes/no)

Recommended: yes. The L2 tag is too coarse for a single leaf event. This is a delete-and-replace, so it needs your confirmation.

a5:

---

q6: Replace the process tag on handoff 429 (work_shift.no_show, WFM to HRSD)? Swap the existing row (Manage employee relations, an L2 process) for Develop and manage time and attendance systems (L3). (yes/no)

Recommended: yes. A no-show maps more precisely to time and attendance than to employee relations. This is a delete-and-replace, so it needs your confirmation.

a6:

---

q7: Replace the process tag on handoff 934 (retail_labour_schedule.published, RET-STORE to WFM)? Swap the existing row (process 1886) for Develop and manage time and attendance systems (L3). (yes/no)

Recommended: yes, if you agree the existing tag is off. This is a delete-and-replace, so it needs your confirmation.

a7:

---

q9: Professional Services Automation forwards time entry to Workforce Management to record project-related transactions, but Workforce Management does not yet have anyone assigned to record project-related transactions, so this step has no owner. How should it be handled?
- a) Record it now as work Workforce Management owns, and assign a named owner once Workforce Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Workforce Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a9:

---

## Optional (will not hold up the build)

q8: Eight extra market-surface objects show up across the flagship WFM vendors (time clocks, clock-punch corrections, labor demand forecasts, shift-swap offers, availability preferences, predictive-schedule notices, accrual and carryover ledger events, and a labor-law jurisdiction rule library). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Several are common across the vendor set, though each still wants a verification pass first.

a8:

---

<!-- agent map, ignore: q1=B2-S3 q2=B2-S2 q3=B2-S4 q4=B2-S6 q5=B2-S7.h134 q6=B2-S7.h429 q7=B2-S7.h934 q8=B3-S1+B3-S2+B3-S3+B3-S4+B3-S5+B3-S6+B3-S7+B3-S8 q9=B2-B9D-OWN-1409 | domain_id=59 -->
