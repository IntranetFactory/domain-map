# Strategy Execution Management (SEM): questions waiting for you

## What this domain is
The strategy-office workspace where leadership turns vision into action: define the strategy map, set and cascade objectives (OKRs and Hoshin pillars), then track the initiatives that deliver them. It runs the operating rhythm (reviews and decisions) that keeps execution honest, and publishes initiative and objective status outward to portfolio and financial planning. Think Cascade, ClearPoint, Quantive, and WorkBoard, not search-engine marketing.

---

q1: (answer this first) Should Strategy Execution Management be modeled as an integrated strategy office (it both publishes outward AND pulls signals back in from finance, work-execution, and HR), or as a write-mostly publisher (it pushes objectives and initiatives out and is refreshed by manual entry, accepting that nothing flows back in)?

- a) Integrated path: author the inbound cross-domain handoffs (OKR scoring and commits from work-management now, plus finance, ERP, and talent feeds later) and flip the terminal-state lock on initiatives.
- b) Write-mostly path: accept zero inbound handoffs as the correct market shape and leave the pattern flags alone.
- c) Mixed: specify which inbound feeds to wire and which to skip.

Recommended: a. The integrated path matches the vendors that pull actuals (WorkBoard, ClearPoint, ESM), and two of the inbound feeds are mechanically ready today; the write-mostly path is also a real market shape, so this is genuinely your call. This choice decides whether the inbound-handoff and scope questions below get acted on at all, so it unlocks the rest.

a1:

---

q2: If you chose the integrated path above, which inbound feeds should the next load actually author now?

- a) Author the 2 ready now (work-management OKR committed and OKR scored, whose source events already exist), and queue the other 4 (finance, EPM variance, ERP period-close, talent review) for cross-domain coordination.
- b) Queue all 6 until the source-domain audits land, for tighter coordination.
- c) Author the 2 ready now AND schedule a follow-up SEM audit for the other 4 once the source audits return.

Recommended: a. The 2 ready feeds are clean (their source events already exist and they point at SEM modules); the other 4 need EPM, FIN, and talent audits to land first. Skip this question if you chose write-mostly in q1.

a2:

---

q3: Should an initiative be frozen (submit-locked) once it reaches a terminal state (completed or cancelled), so a closed initiative cannot be quietly edited afterward? (yes/no)

Recommended: yes. A finished or canceled initiative is a fixed record that downstream portfolio and finance teams rely on. This flips a structural flag on a live master, so it needs your sign-off rather than being applied automatically.

a3:

---

q4: The rationale notes that loaders auto-wrote onto several rows (the strategy-maps config note, the master and consumer annotations on this domain, and any surviving role notes) violate the no-loader-prose rule. Were any of them deliberately typed and approved by you, or should they all be blanked out?

- a) All auto-populated: blank them to empty string and log the incident.
- b) Some were approved by me: leave those in place (tell me which) and blank the rest.
- c) Leave everything as is.

Recommended: a. The wording reads as machine-generated (uniform tone, mechanical paraphrase), and blanking it costs nothing. Blanking a non-empty field is destructive, so it is surfaced for your confirmation. The 27 skill-tool notes from the original tally are no longer in scope (that table was retired), so this only covers the handful of surviving rows, which want a quick live re-check first.

a4:

---

q5: The cascade event (strategic_objective.cascaded) is currently filed as a recurring "lifecycle" rhythm. A cascade reads more like a one-time state change on the objective. Should its category be changed from lifecycle to state_change? (yes/no)

Recommended: yes. Cascading transitions an objective into a cascaded child state, which is a state change rather than a recurring cadence. Both readings are defensible and this overwrites a non-empty value, so it needs your call rather than an automatic edit.

a5:

---

q7: Enterprise Performance Management forwards strategic initiative to Strategy Execution Management to establish portfolio strategy, but Strategy Execution Management does not yet have anyone assigned to establish portfolio strategy, so this step has no owner. How should it be handled?
- a) Record it now as work Strategy Execution Management owns, and assign a named owner once Strategy Execution Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Strategy Execution Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a7:

---

q8: Strategic Portfolio Management forwards strategic initiative to Strategy Execution Management to manage portfolio, but Strategy Execution Management does not yet have anyone assigned to manage portfolio, so this step has no owner. How should it be handled?
- a) Record it now as work Strategy Execution Management owns, and assign a named owner once Strategy Execution Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Strategy Execution Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a8:

---

## Optional (will not hold up the build)

q6: Flagship strategy-office vendors (Spider Impact, ClearPoint, Quantive, Cascade, WorkBoard, i-nexus) model several first-class objects that SEM does not yet carry: a standalone KPI registry, strategic themes / Hoshin pillars (with a matching capability), period-level OKR check-in summaries, strategy health / drift signals, and benefits tracking (likely consumed from the portfolio domain). If the KPI and health-signal objects land, a fourth KPI-management module would also make sense. Should I research these and add the ones that hold up? (yes/no)

Recommended: yes, but additive and only after the core decisions above are settled. Several are common across the vendor set, though each still wants a verification pass first.

a6:

---

<!-- agent map, ignore: q1=B2-S5.path q2=B2-S2 q3=B2-S5.speclock q4=B2-S1 q5=B1A-S8 q6=B3-KPIS+B3-STRATEGIC-THEMES+B3-OKR-CHECKIN-SUMMARIES+B3-STRATEGY-HEALTH-SIGNALS+B3-BENEFITS-TRACKING-CONSUMER+B3-SEM-KPI-MGMT-MODULE+B3-HOSHIN-PILLARS-CAPABILITY q7=B2-B9D-OWN-1652 q8=B2-B9D-OWN-409 | domain_id=166 -->
