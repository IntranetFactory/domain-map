# Process Orchestration (PROCESS-ORCHESTRATION): questions waiting for you

## What this domain is
Run your long-running business processes as durable, auditable workflows that never lose their place.

Turn a process model into a running engine. Deploy each process definition, then launch instances that survive restarts, retry failed steps automatically, wait on timers and external events, and pick up exactly where they left off. Route the human steps to the right people's inboxes, manage flexible cases that do not follow a fixed path, and evaluate your decision tables in real time so the rules live in one place. Every step is recorded, so you always know which instances are running, stuck, or done, and you can prove what happened and when.

> Grounding: this domain came from the IBPMS triage candidate. The honest call is that the "iBPMS suite" name folds (its low-code suite leaders Pega, Appian, and Bizagi are already in the catalog under LCAP), but the process-EXECUTION RUNTIME is a distinct, previously-unowned market. Full vendor-surface report: `.tmp_deploy/IBPMS-phase0-2026-06-14.md`. The build assumes it is distinct and is already loaded at record_status='new' for your review.

---

q1: (answer this first) Should Process Orchestration be its own domain, or fold into an existing one?

- a) Keep it as a distinct domain (the durable execution runtime) - this is what was built.
- b) Fold it into Low-Code Application Platform (LCAP).
- c) Fold it into Business Process Architecture (BPA).

Recommended: a. Gartner retired the iBPMS Magic Quadrant and split the market: the low-code half became LCAP and the orchestration runtime rolled into the new BOAT Magic Quadrant (inaugural Oct 2025). The catalog already owns the LCAP half - Pegasystems Pega Platform and Appian Platform are mapped to LCAP, Bizagi to BPA+LCAP, and the LCAP capability for "Process and Workflow Automation" is literally annotated "Where LCAP overlaps with BPM/iBPMS." But LCAP models the BUILD of an app, where a workflow is one design artifact next to pages and business objects; it masters no live runtime substrate. BPA models design-time process diagrams (BPMN authoring, value streams, simulation, publishing) and explicitly disclaims execution. The distinct, unowned market is the execution KERNEL, and it has independent pure-play flagships that are NOT low-code suites: Camunda (Camunda 8 on the Zeebe engine, a BOAT Visionary), Temporal (pure-play durable execution, raised at a $5B valuation in Feb 2026), Orkes (the Conductor engine originated at Netflix, running Netflix / Tesla / Amex), and Flowable (a standalone BPMN/DMN/CMMN engine). They sell a stateful runtime, not an app builder. Folding into LCAP would put Temporal and Orkes - which have no low-code surface at all - under a low-code domain, which misrepresents them.

a1:

---

q2: Is the two-module split right - a Process Execution Engine module versus a Case and Decision Management module?

- a) Keep the two modules as built (Execution: definitions, instances, activities, variables, events, incidents; Case and Decision: human tasks, cases, decision tables, evaluations).
- b) Split into three (separate the human-task module from the decision/DMN module).
- c) Collapse into one module.

Recommended: a. The flagships package the raw engine separately from the human-and-decision layer. Camunda ships the Zeebe execution engine separately from its Tasklist (human tasks) and from its DMN decision engine; Pega separates Process Fabric (runtime) from case management from Decision Hub; Flowable ships BPMN (execution), CMMN (case), and DMN (decision) as separable engines. Crucially, the code-first engines Temporal and Orkes implement ONLY the execution kernel and have no human-task or case surface at all - which is exactly why human tasks, cases, and decision tables (present in Camunda, Pega, Appian, and Flowable but absent in Temporal and Orkes) belong in a separate module from the universal execution kernel (definitions, instances, events) that all six share. A three-way split (b) would pull DMN away from human tasks, but Flowable, Camunda, and Pega bundle case and decision tightly, so two modules matches the dominant packaging.

a2:

---

## Optional (will not hold up the build)

q3: Should I add the deeper orchestration substrate the flagships also model? (yes/no)

The 10 objects loaded are the structural kernel. The flagships also model a finer substrate that fits the two existing modules without a new split: process messages and signals (correlation artifacts in Camunda/Zeebe and Temporal), process timers (all engines), process jobs (the dispatch unit to task workers, distinct from activities, in Zeebe and Temporal), DMN decision definitions and requirement graphs (above bare decision tables), and case milestones and stages (the CMMN sub-structure of a case, in Flowable and Pega). All additive, none a new module.

Recommended: yes, but additive and non-blocking - the kernel can stand as built and these can land later under the two existing modules.

a3:

---

q4: Should I add the process_events to Process Mining relationship edge? (yes/no)

The handoff from this domain's event stream to Process Mining is loaded (Process Mining ingests the runtime event log to discover and conform the real execution behavior). The payload-to-target relationship edge was NOT authored because Process Mining masters no single canonical event-log object - it masters derived objects (discovered process models, conformance results, variants, bottleneck findings) computed FROM logs, not the log itself.

Recommended: no for now - the handoff alone is correct; revisit if Process Mining gains an explicit event-log master.

a4:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2 q3=B3-S1 q4=B3-S2 | domain_id=179 | phase0=.tmp_deploy/IBPMS-phase0-2026-06-14.md | reversed: none -->
