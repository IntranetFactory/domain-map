# PROCESS-ORCHESTRATION audit history

## 2026-06-14 - New-domain build (from IBPMS triage candidate)

### Triage verdict

Candidate **IBPMS (Intelligent Business Process Management Suite)** arrived from the BPA audit (mention count 2). Verdict: **promote-as-domain, code `PROCESS-ORCHESTRATION`** (NOT `IBPMS`).

The "iBPMS suite" framing folds; the execution-runtime market is distinct and was unowned:

- Gartner coined iBPMS, then retired the Magic Quadrant and replaced it with a Market Guide; the analyst frame moved to LCAP (low-code suites) and the BOAT (Business Orchestration and Automation Technologies) Magic Quadrant, whose inaugural edition published 2025-10-15. Pega and Appian lead BOTH iBPMS and LCAP.
- The catalog already owns the LCAP half: Pegasystems Pega Platform (solution 612) and Appian Platform (508) are mapped to LCAP; Bizagi (608) to BPA+LCAP. Capability LCAP-WORKFLOW-AUTO (335) is described "Where LCAP overlaps with BPM/iBPMS". LCAP masters `lcap_workflows` as a design artifact inside an app, not a live runtime substrate. So an "IBPMS" domain code would duplicate LCAP.
- BPA (Business Process Architecture) masters design-time process MODELS (BPMN authoring, value streams, simulation, publishing) and disclaims execution.
- The distinct, unowned market is the execution KERNEL: a durable process-instance state machine + human-task inbox + runtime DMN decisioning + case records + process event/audit stream. Point-solution test PASSES with >=3 independent pure-play flagships that are NOT low-code suites: Camunda (Camunda 8 / Zeebe; BOAT Visionary), Temporal (pure-play durable execution, $5B valuation Feb 2026), Orkes (Conductor, Netflix-origin), Flowable (standalone BPMN/DMN/CMMN). Plus the BOAT-suite runtimes (Pega/Appian/Bizagi) and AWS Step Functions.

Phase 0 report: `.tmp_deploy/IBPMS-phase0-2026-06-14.md`.

### Build (domain 179)

Loaded live at `record_status='new'` via `.tmp_deploy/2026-06-14_process_orchestration_build.ts` (idempotent, CLI only, TypeScript on Bun, zero notes anywhere).

- **Phase A:** domain 179 with all 7 metadata fields (crud 55, min_org `30 m <2500`, cost `$$$`, cert false, US TAM 2600 / 2025) + catalog tagline + description. 6 capabilities (PO-BPMN-EXECUTION, PO-DURABLE-STATE, PO-HUMAN-TASK-ORCH, PO-CASE-MGMT, PO-DMN-DECISIONING, PO-OPERATE-MONITOR) + capability_domains. 2 full modules: PROCESS-ORCHESTRATION-EXECUTION (364), PROCESS-ORCHESTRATION-CASE-DECISION (365) + 6 domain_module_capabilities. 4 new vendors (Camunda, Temporal Technologies, Orkes, Flowable) + 4 new solutions (Camunda 8, Temporal, Orkes Conductor, Flowable Platform) primary + Pega/Appian/Bizagi edged secondary = 7 solution_domains.
- **Phase B:** 10 masters (process_definitions, process_instances, process_activities, process_variables, process_events, process_incidents in EXEC; human_tasks, case_records, decision_tables, decision_evaluations in CASE), entity_type classified, pattern flags set (process_definitions + decision_tables single_approver; human_tasks personal_content). 12 DMDO (10 master + 2 users consumer). 15 relationships (10 intra-domain composition/reference + 5 users edges). 15 aliases. 24 lifecycle states across the 7 operational_workflow masters with workflow gates. 6 trigger_events. 4 outbound handoffs (PROC-MIN event stream, OBS incidents, SUB-MGMT usage metering, RPA bot dispatch).
- **Phase C:** Platform Engineering (60) owner, Software Engineering (26) contributor, IT Operations (27) consumer.
- **Phase S:** 1 system skill `process-orchestration-system` (466), 14 tools (query/mutate, all coverage_tier=platform per the platform rule), 16 domain_module_tools (14 + notify_person/notify_team optional). Strict Semantius score = 100% on the 14 domain tools; notify_team is the only non-platform tool (optional).
- **Phase E:** 3 personas (PROCESS-ARCHITECT 102, PROCESS-OPERATOR 103, CASE-WORKER 104), 6 role_modules (each persona >=2 modules), 3 process_raci on PCF 13.1.2 "Define and manage process frameworks" (405): Architect = Accountable, system skill = Responsible (AI-native R), Operator = Consulted.

### Verification

Sweep confirmed: NOTES violations NONE, STATUS violations NONE (all `record_status='new'`), single-master clean (10 master rows, no duplicates), M2 pass (6 caps -> 2 modules). Tool tier fix applied during the load: the platform rejects query/mutate tools at any coverage_tier other than `platform`; all 14 set to `platform`.

### Open items (user judgment only; build is agent-finished)

- B2-S1: confirm distinct domain vs fold into LCAP/BPA (build assumes distinct).
- B2-S2: confirm the 2-module split (Execution vs Case-and-Decision).
- B3-S1: discretionary deeper substrate (messages/signals/timers/jobs, DMN DRG, case milestones/stages) - non-blocking.
- B3-S2: process_events -> PROC-MIN payload->target relationship edge deferred (PROC-MIN masters no canonical event-log object); handoff is loaded.

No `record_status` flips. No git. No em-dash. No MCP. No Python.
