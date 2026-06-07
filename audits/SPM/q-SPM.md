# Strategic Portfolio Management (SPM): questions waiting for you

## What this domain is

Plan, fund, and steer your strategic portfolios from one place. Take in demand, weigh the business value of each initiative, allocate people and capacity, model what-if scenarios, track dependencies across initiatives, and follow the benefits all the way to realization. The aim is to connect strategy to the investments and resources that deliver it.

---

q1: (answer this first) SPM (Strategic Portfolio Management) and SEM (Strategy Execution Management) overlap heavily: SEM already has three built modules and SPM has none, the two share one capability, and strategic initiatives are currently mastered by SEM. How should the catalog capture SPM?

- a) Merge SPM into SEM: retire the SPM domain and land SPM's nine planning-side masters in new SEM modules.
- b) Merge SEM into SPM: make SPM canonical and re-host SEM's three modules on SPM.
- c) Keep the split with a clear boundary: SPM owns the planning, investment, scenario, and capacity surface (eight unique masters), SEM keeps the execution, OKR, and operating-rhythm surface, strategic initiatives stay mastered by SEM and SPM consumes them. Then build SPM's two modules (Portfolio Planning and Resource and Capacity).

Recommended: c. The catalog already lines up this way (SPM has eight masters SEM does not), so it is the least disruptive and matches the live state. This choice drives the whole module shape, every blocked build item, and where each Optional candidate lands, so it unlocks the rest of the build.

a1:

---

q2: Should a business value assessment freeze once it is published, so downstream dependents can rely on it without it changing under them? (yes/no)

Recommended: yes. A published assessment is referenced by funding and prioritization decisions and should stay stable.

a2:

---

q3: Should a business value assessment require one named approver (a PMO or sponsor gate) before it counts? (yes/no)

Recommended: yes. Value assessments drive investment calls, so a single accountable approver is normal.

a3:

---

q4: Should a scenario plan freeze once it is evaluated, so later what-if comparisons reference a fixed version? (yes/no)

Recommended: yes. Comparing scenarios only works if each evaluated plan is a stable snapshot.

a4:

---

q5: Should a demand intake request require one named approver (an intake-board gate) before it advances? (yes/no)

Recommended: yes. Intake boards are the standard governance step before demand enters the portfolio.

a5:

---

q6: Should a resource allocation require one named approver (a resource-committee gate) before it commits? (yes/no)

Recommended: yes. Committing people and capacity is a controlled step that usually needs a single sign-off.

a6:

---

q7: Should a strategic initiative require one named approver (an executive sponsor)? (yes/no)

Recommended: yes, if SPM ends up owning this master. If q1 keeps strategic initiatives mastered by SEM (option c), this flag is SEM's call instead.

a7:

---

q8: Dependency chains describe a network of inter-initiative dependencies that is usually refreshed on snapshot rather than walked through a workflow. How should this master be classified?

- a) Config-shape: treat it as an operational record with no lifecycle state machine, tracked by record status alone.
- b) Workflow: give it a small state machine (for example identified, acknowledged, resolved).
- c) Defer until there is more flagship-vendor evidence.

Recommended: a. A dependency network is refreshed on snapshot, not state-machined, so the config-shape exemption fits. Your answer also sets the master's entity_type, which is deliberately left unclassified until you decide.

a8:

---

q9: Three older cross-domain process tags were attached by loose substring matching and are now superseded by more precise tags that are already loaded. Should the three stale parent rows be deleted? (yes/no)

Recommended: yes. The catalog is already correct via the precise replacements, so the old rows are just redundant clutter. This is a destructive delete, so it needs your sign-off.

a9:

---

## Optional (will not hold up the build)

q10: Flagship SPM vendors model several extra entities that SPM does not yet carry (program increments, OKR objectives as their own master, investment categories, capacity or resource pools, portfolio funding decisions, an approval-workflows consumer link, portfolio milestones, a risk-registers consumer link, and a value-streams consumer link). Should I research these and add the ones that hold up once the modules exist? (yes/no)

Recommended: yes, but additive and only after q1 settles, since the duplication decision changes which domain each candidate lands in.

a10:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2.bva_submit_lock q3=B2-S2.bva_single_approver q4=B2-S2.scenario_submit_lock q5=B2-S2.demand_single_approver q6=B2-S2.allocation_single_approver q7=B2-S2.initiative_single_approver q8=B2-S3 q9=B2-APQC-DELETE q10=B3-PROGRAM-INCREMENTS+B3-OKR-OBJECTIVES-MASTERY+B3-INVESTMENT-CATEGORIES+B3-CAPACITY-POOLS+B3-PORTFOLIO-FUNDING-DECISIONS+B3-APPROVAL-WORKFLOWS-CONSUMER+B3-PORTFOLIO-MILESTONES+B3-RISK-REGISTERS+B3-VALUE-STREAMS-CONSUMER | domain_id=9 -->
