# IBPMS Phase 0: Vendor Surface and Triage

Candidate: **IBPMS (Intelligent Business Process Management Suite)**. Triage queue mention count 2 (BPA audit). Date 2026-06-14. Tenant adenin.

## Ambiguity resolution (the decisive question)

"iBPMS" was a Gartner-coined market that Gartner **retired**: the Magic Quadrant for Intelligent Business Process Management Suites was replaced by a Market Guide (around 2019-2021) and the analyst frame moved to two successors. The low-code, citizen-developer half became **Enterprise Low-Code Application Platforms (LCAP)**; the orchestration half rolled up into the new **BOAT (Business Orchestration and Automation Technologies)** Magic Quadrant (inaugural edition published Oct 15, 2025). The iBPMS leaders Pega and Appian are leaders in BOTH the old iBPMS and current LCAP, and both are already in this catalog under LCAP.

So "promote IBPMS as a suite domain" is the wrong move: it would duplicate LCAP (which already owns Pega, Appian, Bizagi and carries capability LCAP-WORKFLOW-AUTO explicitly described as "Where LCAP overlaps with BPM/iBPMS"). The honest, non-duplicative market that the catalog does NOT yet cover is the **process orchestration / workflow execution runtime**: the durable execution kernel (a live process-instance state machine + human-task inbox + runtime DMN decisioning + case records + process event streams). This is a structurally distinct kernel with multiple independent pure-play flagships.

**Verdict: promote-as-domain, code `PROCESS-ORCHESTRATION`** (NOT `IBPMS`). The iBPMS *name* folds; the execution-runtime *market* is real and distinct.

## Live catalog overlap check (CLI, never MCP)

| domain_code | domain_name | what it owns | overlap with execution runtime |
| --- | --- | --- | --- |
| LCAP (id 37) | Low-Code Application Platform | build + deploy low-code apps; masters `lcap_apps`, `lcap_pages`, `lcap_business_objects`, `lcap_data_sources`, `lcap_workflows` (a *design artifact* inside an app) | Adjacent, NOT same. LCAP models the build-and-deploy of an app where "workflow" is one artifact among pages/objects. It does NOT master a live runtime state machine: no `process_instances`, `human_tasks`, `case_records`, `decision_tables`, `process_events`. |
| BPA (id 136) | Business Process **Architecture** | design-time process MODELING: BPMN authoring, capability maps, value streams, simulation, publishing | Adjacent, NOT same. BPA is the blueprint (model + simulate + publish). PROCESS-ORCHESTRATION is the runtime that executes a deployed definition. BPA explicitly disclaims execution. |
| RPA (id 38) | Robotic Process Automation | UI-level bots driving legacy apps | Adjacent, NOT same. RPA drives a UI; orchestration runs a stateful process and can *call* an RPA bot as a task. |
| PROC-MIN (id 40) | Process Mining | event-log discovery / conformance / enhancement | Adjacent, NOT same. PROC-MIN analyzes logs after the fact; orchestration *produces* the event stream PROC-MIN consumes. |

Also present and clearly different: MA, MSP-PSA, PSA, AP-AUTO, SOAR, IDP. None master a general-purpose process-execution kernel.

Note: a solution named "Conductor" already exists (id 481) but it is the **SEO/content** platform, not Netflix/Orkes Conductor. The orchestration vendor must be loaded under a disambiguated solution name (e.g. "Orkes Conductor").

## Flagship vendors (process orchestration / workflow execution engine)

| Vendor | Flagship | Type | Why included |
| --- | --- | --- | --- |
| Camunda | Camunda 8 (Zeebe engine) | BPMN/DMN orchestration engine, standalone or embedded | Visionary in 2025 Gartner BOAT MQ; the reference open-core BPMN+DMN execution engine. |
| Temporal Technologies | Temporal | Pure-play durable execution, code-first | $5B valuation (Feb 2026 Series D). Pure-play execution kernel, explicitly distinct from BPM and from low-code. Independent flagship. |
| Orkes | Orkes Conductor (Netflix Conductor) | Microservices workflow orchestration | Commercial entity around Netflix's Conductor; powers Netflix, Tesla, Amex. Independent flagship, NOT low-code. |
| Pegasystems | Pega Platform (Process Fabric / case mgmt) | BOAT-suite runtime (already in catalog under LCAP) | BOAT MQ Leader. Runtime engine + case mgmt + Decision Hub. Mapped to LCAP today; gets a solution_domains edge to PROCESS-ORCHESTRATION for the runtime kernel. |
| Appian | Appian Platform (process + case) | BOAT-suite runtime (already in catalog under LCAP) | BOAT MQ Leader. Strong case management + process runtime. solution_domains edge to PROCESS-ORCHESTRATION. |
| Bizagi | Bizagi Studio runtime | BOAT-suite low-code BPM execution (already in catalog) | Already loaded (BPA+LCAP); execution engine edge to PROCESS-ORCHESTRATION. |
| Flowable | Flowable | Standalone BPMN/DMN/CMMN engine | Independent pure-play process engine; reinforces flagship count. |

## Point-solution-market test (for PROCESS-ORCHESTRATION framing)

- **Distinct buyer?** Yes. Platform engineering / application engineering / IT operations buying a runtime to execute long-running, stateful, human-in-the-loop or service-orchestration processes. Different from the citizen-developer / app-owner buyer of LCAP and the process-architect buyer of BPA.
- **>=3 independent flagships, not just suite modules?** Yes. Camunda, Temporal, Orkes (Conductor), Flowable are independent pure-plays; AWS Step Functions is a hyperscaler entrant. The market exists outside any low-code suite.
- **Distinct kernel?** Yes. The execution substrate: process definitions (BPMN), live process instances (durable state machine), human-task inbox, runtime DMN decision tables, case records (CMMN-style), and a process event/audit stream. None of LCAP/BPA/RPA/PROC-MIN master this operational substrate.
- **Verdict: PASS.** Distinct from LCAP (builds apps), BPA (models processes), RPA (drives UIs), PROC-MIN (mines logs).

## Surface matrix (union of flagship runtime surfaces)

| Entity (snake_case_plural) | Category | Cam | Temp | Orkes | Pega | Appian | Flow | Class | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | --- | --- |
| process_definitions | Master/config | Y | Y | Y | Y | Y | Y | Core | PROCESS-EXECUTION |
| process_instances | Master | Y | Y | Y | Y | Y | Y | Core | PROCESS-EXECUTION |
| process_activities (steps/tasks) | Junction | Y | Y | Y | Y | Y | Y | Core | PROCESS-EXECUTION |
| process_events (history/audit) | Audit | Y | Y | Y | Y | Y | Y | Core | PROCESS-EXECUTION |
| process_variables | Master | Y | Y | Y | Y | Y | Y | Core | PROCESS-EXECUTION |
| process_incidents (failed jobs) | Audit | Y | Y | Y | Y | Y | Y | Core | PROCESS-EXECUTION |
| human_tasks | Master | Y | n | n | Y | Y | Y | Core | CASE-DECISION-MGMT |
| task_assignments | Junction | Y | n | n | Y | Y | Y | Common | CASE-DECISION-MGMT |
| case_records | Master | Y(CMMN) | n | n | Y | Y | Y | Core | CASE-DECISION-MGMT |
| decision_definitions (DMN models) | Config | Y | n | n | Y | Y | Y | Core | CASE-DECISION-MGMT |
| decision_tables | Master | Y | n | n | Y | Y | Y | Core | CASE-DECISION-MGMT |
| decision_evaluations (runtime results) | Audit | Y | n | n | Y | Y | Y | Common | CASE-DECISION-MGMT |
| process_messages/signals | Junction | Y | Y | Y | Y | Y | Y | Core | PROCESS-EXECUTION |
| process_timers | Junction | Y | Y | Y | Y | Y | Y | Core | PROCESS-EXECUTION |

## Modularization hypothesis

Two full modules:

1. **PROCESS-EXECUTION**: the runtime engine: `process_definitions`, `process_instances`, `process_activities`, `process_variables`, `process_events`, `process_incidents`, plus signals/timers. The durable state machine that runs deployed process definitions and emits an audited event stream.
2. **CASE-DECISION-MGMT**: the human + decision layer: `human_tasks`, `task_assignments`, `case_records`, `decision_definitions`, `decision_tables`, `decision_evaluations`. The inbox + DMN decisioning + case-handling surface that BPMN/BOAT engines add on top of raw execution.

Capabilities (>=3, so >=2 full modules, Rule #14): BPMN process execution, human task orchestration, DMN decision automation, case management, process auditing/observability.

## Cross-domain handoffs

- PROC-MIN consumes `process_events` (orchestration emits the log PROC-MIN mines).
- RPA bots are invoked as orchestration task workers.
- LCAP / BOAT suites embed an orchestration runtime (Pega Process Fabric, Appian, Bizagi); solution_domains edges connect them.
- BPA publishes a process model that gets deployed as a `process_definitions` row (model -> runtime handoff).

## Compliance entities

No single hard-regulated market (the engine is horizontal). Audit/traceability is intrinsic, captured by `process_events` + `process_incidents` (immutable execution history), which is what regulated users rely on. No FCRA/HIPAA/SOX-specific entities required at the engine grain.

## Decision

VERDICT: **promote-as-domain**, CHOSEN_DOMAIN_CODE **PROCESS-ORCHESTRATION**. The "IBPMS suite" name folds into LCAP (already owns Pega/Appian/Bizagi + the BPM-overlap capability), but the execution-runtime market is distinct and unowned, with >=3 independent pure-play flagships (Camunda, Temporal, Orkes, Flowable). Build it.
