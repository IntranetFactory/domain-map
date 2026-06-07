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

q5: Should I author search synonyms (aliases) for BPA so the catalog and skill triggers catch obvious variants?

- a) Approve all six: business process management, BPM, process modeling, process architecture, BPMN authoring, process design.
- b) Approve a subset (name which).
- c) Decline.

Recommended: a. BPA has zero aliases today, so search and skill triggers miss common synonyms. Low stakes and additive.

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

## Optional (will not hold up the build)

q8: Several deeper objects show up across the flagship BPA vendors. Should I research and add the ones that hold up (published process documentation pages, process KPIs and metric definitions, reference framework libraries, decision (DMN) models, process review and governance cycles, model revision diffs, process change requests, and ArchiMate/TOGAF artifacts)? (yes/no)

Recommended: yes, but additive and after a Phase 0 verification pass. Some (ArchiMate/TOGAF) likely belong on a future Enterprise Architecture domain rather than BPA.

a8:

---

q9: Should I research promoting Enterprise Architecture (EA) into its own domain? Four of nine BPA solutions are also EA leaders, and a promotion would cascade into the capability-map owner and solution-split decisions above. (yes/no)

Recommended: yes to research it, but it stays a non-blocking idea until you decide to promote. It does not hold up the BPA build.

a9:

---

q10: Should I research promoting iBPMS (Intelligent Business Process Management Suite) into its own domain? It is the execution-side counterpart to BPA's authoring side, and it decides whether decision (DMN) models belong in BPA or there. (yes/no)

Recommended: yes to research it, but it stays a non-blocking idea until you decide to promote. It does not hold up the BPA build.

a10:

---

<!-- agent map, ignore: q1=B2-CAPMAP-OWNER q2=B2-PATTERN-FLAGS.247 q3=B2-PATTERN-FLAGS.248 q4=B2-PATTERN-FLAGS.250 q5=B2-DOMAIN-ALIASES q6=B2-EA-SOLUTION-SPLIT q7=B2-PROC-MIN-RECONCILE q8=B3-PROCESS-DOC-PAGES+B3-PROCESS-KPIS+B3-REF-FRAMEWORK-LIB+B3-DECISION-MODELS+B3-PROCESS-REVIEW-CYCLES+B3-MODEL-REVISION-DIFFS+B3-PROCESS-CHANGE-REQS+B3-ARCHIMATE-MODELS q9=B3-EA-PROMOTION q10=B3-IBPMS-PROMOTION | domain_id=136 -->
