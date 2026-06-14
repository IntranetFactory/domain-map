# Business Process Architecture (BPA): questions waiting for you

## What this domain is
Design, document, and publish how your business actually runs.

Map your end-to-end processes, capabilities, and value streams in one connected workspace. Author process models, keep a single source of truth for how work flows, and publish approved versions your teams can trust. Simulate changes before you commit to them and hand insights off to the teams that execute, improve, and govern the work.

---

q1: (answer this first) Which area should canonically own business capability maps (the shared "what the business can do" entity)?

- a) Keep APM (the portfolio registry) as the canonical owner. BPA's capability-map module keeps its embedded copy, and BPA's leftover legacy master claim is removed. No further moves.
- b) Make BPA the canonical owner. Move the master to BPA's capability-map module, demote APM to a consumer, relocate the three lifecycle states, drop APM's duplicate capability links, and re-derive the BPA publish permission.
- c) Defer to a future Enterprise Architecture domain (still a queued candidate): revisit once it exists.

Recommended: a. It is the current loaded state and keeps APM's portfolio coupling intact, so it is the least disruptive. Pick (b) only if you want BPA to own capability mapping outright (BPA-prefixed capability codes argue for it). This decision drives the master row, the three lifecycle states, the publish permission, and the duplicate capability links, so it unblocks the rest of the build.

a1:

---

q2: Should a published business process model be frozen once published, so a change requires a new version rather than editing the live one? (yes/no)

Recommended: yes. Published models are the shared source of truth teams work from, so locking them keeps that record stable. This flips a pattern flag from its default, so it needs your confirmation.

a2:

---

q3: Should publishing a business capability map route through one named architecture lead for approval? (yes/no)

Recommended: yes. Capability-map publication typically routes to a single architect lead. This flips a pattern flag from its default, so it needs your confirmation.

a3:

---

q4: Should a process simulation run be frozen once it is queued, so its inputs cannot change mid-run? (yes/no)

Recommended: yes. Locking a run at start preserves an accurate record of what was simulated. This flips a pattern flag from its default, so it needs your confirmation.

a4:

---

q5: BPA now formally realizes two standard processes (publishing a process model, and analyzing/baselining a value stream) with named owners. Several existing handoffs are still tagged with a vaguer or wrong standard-process label. How should I correct those tags? (Each option changes or deletes existing tag records, so it needs your sign-off.)

- a) Re-point the four "Manage business processes" tags (on the handoffs going out to process mining, the portfolio registry, and strategic portfolio management) down to the more precise "Publish processes" that BPA now realizes. This is a clean tightening of an already-correct-but-coarse tag.
- b) For the three "Reengineer business processes and systems" tags (on the handoffs going out to product management and work management), either re-point them to "Analyze processes," or keep "Reengineer" as real future work and assign it an owner (Process Architect runs it, Process Owner approves). Reengineering and analyzing are genuinely different activities, so tell me which you prefer.
- c) Leave all the tags as they are.

Recommended: a for the four coarse tags (low-risk tightening). For the three reengineering tags, keep them as real work and assign the owner rather than collapsing reengineering into analysis, unless you would rather not track reengineering as its own step yet.

a5:

---

q6: If a future Enterprise Architecture domain is promoted, how should the four BPA solutions that also lead the EA market (MEGA HOPEX, BiZZdesign Horizzon, Software AG ARIS, SAP Signavio) be split?

- a) Keep all four as primary on BPA, and re-link to EA when it lands.
- b) Downgrade those four to secondary on BPA, and create primary rows on EA at promotion time.
- c) Split per solution (for example, Signavio as BPA primary, ARIS as EA primary).

Recommended: a. This is moot unless EA is promoted (see the Optional section), so the safe default is to keep BPA's current primary links and revisit only if EA lands.

a6:

---

q7: Should I author a candidate handoff from process mining to BPA when a discovered process model is reconciled back into an authored model?

- a) Author it now.
- b) Defer it to a process-mining audit.
- c) Skip it as overspecification.

Recommended: b. It is a speculative cross-domain edge surfaced during reconciliation, not a confirmed gap, so a process-mining audit is the natural place to decide it.

a7:

---

q11: Work Management hands work to Business Process Architecture, but Business Process Architecture has no one assigned to reengineer business processes and systems, so that step currently has nobody responsible for it. Who should own it?
- a) The a named owner runs it and approves it.
- b) The a named owner runs it and the Process Owner approves.
- c) Leave it unassigned for now.

Recommended: a. Business Process Architecture already assigns the a named owner to work of this kind, so (a) fills this gap the same way and gives the work a named owner.

a11:

---

## Optional (will not hold up the build)

q8: Several deeper objects show up across the flagship BPA vendors. Should I research and add the ones that hold up (published process documentation pages, process KPIs and metric definitions, reference framework libraries, decision (DMN) models, process review and governance cycles, model revision diffs, process change requests, and ArchiMate/TOGAF artifacts)? (yes/no)

Recommended: yes, but additive and after a Phase 0 verification pass. Some (ArchiMate/TOGAF) likely belong on a future Enterprise Architecture domain rather than BPA.

a8:

---

q9: Should I research promoting Enterprise Architecture (EA) into its own domain? Four of nine BPA solutions are also EA leaders, and a promotion would cascade into the capability-map owner and solution-split decisions above. (yes/no)

Recommended: yes to research it, but it stays a non-blocking idea until you decide to promote. The EA market is anchored by a clear pure-play set (LeanIX, Ardoq, Software AG Alfabet, BiZZdesign Horizzon, MEGA HOPEX, plus Avolution ABACUS and Sparx EA), and four of those (MEGA HOPEX, BiZZdesign Horizzon, Software AG ARIS, SAP Signavio) are already loaded as BPA solutions, which is the overlap that argues for promotion. It does not hold up the BPA build.

a9:

---

q10: Should I research promoting iBPMS (Intelligent Business Process Management Suite) into its own domain? It is the execution-side counterpart to BPA's authoring side, and it decides whether decision (DMN) models belong in BPA or there. (yes/no)

Recommended: yes to research it, but it stays a non-blocking idea until you decide to promote. The iBPMS market is anchored by a distinct execution-side pure-play set (Camunda Platform, Pega Platform, IBM Business Automation Workflow, Appian, Bonita) that runs processes rather than authoring them, and whether decision (DMN) models belong in BPA or there depends on this candidate's status. It does not hold up the BPA build.

a10:

---

<!-- agent map, ignore: q1=B2-CAPMAP-OWNER q2=B2-PATTERN-FLAGS.247 q3=B2-PATTERN-FLAGS.248 q4=B2-PATTERN-FLAGS.250 q5=B2-B9D-RETAG q6=B2-EA-SOLUTION-SPLIT q7=B2-PROC-MIN-RECONCILE q8=B3-PROCESS-DOC-PAGES+B3-PROCESS-KPIS+B3-REF-FRAMEWORK-LIB+B3-DECISION-MODELS+B3-PROCESS-REVIEW-CYCLES+B3-MODEL-REVISION-DIFFS+B3-PROCESS-CHANGE-REQS+B3-ARCHIMATE-MODELS q9=B3-EA-PROMOTION q10=B3-IBPMS-PROMOTION q11=B2-B9D-OWN-1708 | domain_id=136 -->
