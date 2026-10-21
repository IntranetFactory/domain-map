#!/usr/bin/env bun
// Builds the PROCESS-ORCHESTRATION domain (durable workflow / process-execution runtime market)
// into the live Semantius `domain_map` module via the semantius CLI. Idempotent by natural key.
//
// Verdict basis: the retired iBPMS market split into LCAP (already in catalog: Pega/Appian/Bizagi)
// and the BOAT orchestration runtime. The distinct, unowned market is the process-execution KERNEL:
// a durable process-instance state machine + human-task inbox + runtime DMN decisioning + case
// records + process event/audit stream. Flagships (Camunda, Temporal, Orkes, Flowable) are
// independent pure-plays, not low-code suites. See .tmp_deploy/IBPMS-phase0-2026-06-14.md.
//
// CLI only (Rule #0). record_status omitted everywhere (defaults to 'new', Rule #1).
// Zero notes anywhere (Rule #15). No em-dash. American English.

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
async function get(path: string): Promise<Row[]> { return call({ method: "GET", path }); }

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => {
    const out: Row = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}
async function syncByKey(path: string, rows: Row[], keyField: string): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  ${path}: inserting ${missing.length} new (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: all ${rows.length} present`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

const DOMAIN_CODE = "PROCESS-ORCHESTRATION";

// Rule #8: validate the domain row before POST.
function validateDomainRow(d: Row): void {
  const bad =
    (d.crud_percentage as number) === 0 || d.min_org_size === "" || d.cost_band === "" ||
    (d.business_logic === "" && (d.crud_percentage as number) < 95) ||
    (d.usa_market_size_usd_m as number) === 0 || (d.market_size_source_year as number) === 0;
  if (bad) throw new Error(`domain row ${d.domain_code} fails Rule #8 metadata validation`);
}

async function main() {
  console.log(`=== Building ${DOMAIN_CODE} ===`);

  // ---------- existing ids ----------
  const usersId = 748;
  const adj: Record<string, number> = {};
  for (const d of await get("/domains?domain_code=in.(BPA,LCAP,RPA,PROC-MIN,SUB-MGMT,IGA,OBS)&select=id,domain_code")) {
    adj[String(d.domain_code)] = Number(d.id);
  }
  console.log("adjacent domain ids:", adj);

  // ============================================================
  // PHASE A — domain
  // ============================================================
  const domainRow: Row = {
    domain_code: DOMAIN_CODE,
    domain_name: "Process Orchestration",
    description:
      "Durable execution and runtime orchestration of long-running business processes: an engine that deploys executable process definitions (BPMN and code-first), runs each as a stateful, fault-tolerant process instance with automatic retries, timers, signals, and compensation, drives human-task inboxes and case handling, and evaluates decision tables (DMN) at runtime. The market spans developer-centric durable-execution engines (Camunda, Temporal, Orkes Conductor, Flowable) and the orchestration runtimes inside Business Orchestration and Automation Technology suites. Distinct from Low-Code Application Platform (LCAP, which builds and deploys apps), Business Process Architecture (BPA, which models and publishes process blueprints), Robotic Process Automation (RPA, which drives UIs), and Process Mining (PROC-MIN, which analyzes the event logs this engine emits). This is the successor runtime category to the retired intelligent business process management suite market.",
    crud_percentage: 55,
    business_logic:
      "Durable state-machine execution: a persistent process-instance engine that advances tokens through BPMN gateways, handles timers, message and signal correlation, parallel and compensating branches, retry and backoff on failed jobs, and at-least-once job dispatch to distributed task workers. Plus a DMN decision engine evaluating hit policies over decision tables at runtime. These are general-purpose execution semantics that go well beyond declarative CRUD.",
    min_org_size: "30 m <2500",
    cost_band: "$$$",
    certification_required: false,
    usa_market_size_usd_m: 2600,
    market_size_source_year: 2025,
    catalog_tagline:
      "Run your long-running business processes as durable, auditable workflows that never lose their place.",
    catalog_description:
      "Turn a process model into a running engine. Deploy each process definition, then launch instances that survive restarts, retry failed steps automatically, wait on timers and external events, and pick up exactly where they left off. Route the human steps to the right people's inboxes, manage flexible cases that do not follow a fixed path, and evaluate your decision tables in real time so the rules live in one place. Every step is recorded, so you always know which instances are running, stuck, or done, and you can prove what happened and when.",
  };
  validateDomainRow(domainRow);
  const domMap = await syncByKey("/domains", [domainRow], "domain_code");
  const domainId = domMap.get(DOMAIN_CODE)!;
  console.log("domain id:", domainId);

  // ---------- capabilities ----------
  const capabilities: Row[] = [
    { capability_code: "PO-BPMN-EXECUTION", capability_name: "BPMN Process Execution Engine",
      description: "Runtime execution of deployed process definitions as durable instances: token advancement through tasks and gateways, parallel and sequential branches, sub-processes, boundary events, retries with backoff, and compensation on failure." },
    { capability_code: "PO-DURABLE-STATE", capability_name: "Durable State and Event Sourcing",
      description: "Persistent, fault-tolerant process state that survives node and process restarts, with an append-only event history of every state change for replay, recovery, and audit." },
    { capability_code: "PO-HUMAN-TASK-ORCH", capability_name: "Human Task Orchestration",
      description: "Generation, assignment, claiming, escalation, and completion of human work items, with role and group routing, due dates, reassignment, and per-user task inboxes." },
    { capability_code: "PO-CASE-MGMT", capability_name: "Case Management",
      description: "Flexible, non-sequential case handling for knowledge-worker processes: case files, ad-hoc activities, milestones, and stage gating where the path is decided at runtime rather than pre-modeled." },
    { capability_code: "PO-DMN-DECISIONING", capability_name: "Decision Modeling and Runtime Evaluation",
      description: "Authoring and runtime evaluation of decision tables under Decision Model and Notation, with hit policies, input and output clauses, and decision requirement graphs invoked from running processes." },
    { capability_code: "PO-OPERATE-MONITOR", capability_name: "Process Operations and Monitoring",
      description: "Operational visibility into running instances: incident inspection and resolution, instance search and intervention, variable inspection, and the runtime event stream that downstream analytics consume." },
  ];
  const capMap = await syncByKey("/capabilities", capabilities, "capability_code");
  const capdoms = capabilities.map(c => ({ capability_id: capMap.get(String(c.capability_code))!, domain_id: domainId }));
  await syncJunction("/capability_domains", capdoms, r => `${r.capability_id}|${r.domain_id}`);

  // ---------- modules ----------
  const modules: Row[] = [
    { domain_module_code: "PROCESS-ORCHESTRATION-EXECUTION", domain_module_name: "Process Execution Engine",
      domain_id: domainId, module_kind: "full",
      description: "The durable execution kernel. Masters deployed process definitions and their running instances, advances each instance through its activities, records every state change as a process event, holds runtime variables, and surfaces incidents on failed jobs. The runtime substrate every other module builds on.",
      catalog_tagline: "Deploy a process once and run thousands of resilient instances that recover from any failure.",
      catalog_description: "The engine room. Register an executable process definition, then start an instance for each real-world case and let the engine drive it through its steps. Instances survive crashes and restarts, retry failed work automatically, wait on timers and incoming events, and run branches in parallel. When something cannot proceed, an incident is raised so an operator can inspect the variables, fix the cause, and resume. Every transition is written to an immutable event history, so you can always see what ran, replay it, and feed the stream into analytics." },
    { domain_module_code: "PROCESS-ORCHESTRATION-CASE-DECISION", domain_module_name: "Case and Decision Management",
      domain_id: domainId, module_kind: "full",
      description: "The human and decision layer on top of the engine. Masters human tasks (the work-item inbox with assignment and escalation), case records (flexible non-sequential case handling), and decision tables with their runtime evaluations under DMN. Where automated orchestration meets people and business rules.",
      catalog_tagline: "Route work to the right people and evaluate your business rules in real time.",
      catalog_description: "Bring people and decisions into your processes. Human steps become work items that land in the right person's inbox, with claiming, reassignment, due dates, and escalation when they stall. For knowledge work that does not follow a fixed path, open a case file and let workers add activities and close milestones as the situation demands. And keep your business rules out of code: author decision tables once, then have running processes evaluate them in real time, with every evaluation recorded for audit." },
  ];
  const modMap = await syncByKey("/domain_modules", modules, "domain_module_code");
  const EXEC = modMap.get("PROCESS-ORCHESTRATION-EXECUTION")!;
  const CASE = modMap.get("PROCESS-ORCHESTRATION-CASE-DECISION")!;

  // ---------- domain_module_capabilities ----------
  const dmcaps: Array<[number, string]> = [
    [EXEC, "PO-BPMN-EXECUTION"], [EXEC, "PO-DURABLE-STATE"], [EXEC, "PO-OPERATE-MONITOR"],
    [CASE, "PO-HUMAN-TASK-ORCH"], [CASE, "PO-CASE-MGMT"], [CASE, "PO-DMN-DECISIONING"],
  ];
  await syncJunction("/domain_module_capabilities",
    dmcaps.map(([m, c]) => ({ domain_module_id: m, capability_id: capMap.get(c)! })),
    r => `${r.domain_module_id}|${r.capability_id}`);

  // ---------- vendors (reuse + add) ----------
  const vendors: Row[] = [
    { vendor_name: "Camunda", vendor_url: "https://camunda.com", headquarters_country: "Germany",
      description: "Process orchestration and automation vendor; Camunda 8 with the Zeebe execution engine, plus DMN decisioning and human task management." },
    { vendor_name: "Temporal Technologies", vendor_url: "https://temporal.io", headquarters_country: "USA",
      description: "Durable execution platform vendor; code-first, fault-tolerant orchestration of long-running workflows and microservice activities." },
    { vendor_name: "Orkes", vendor_url: "https://orkes.io", headquarters_country: "USA",
      description: "Commercial steward of the Conductor workflow orchestration engine (originated at Netflix); durable, distributed microservice orchestration." },
    { vendor_name: "Flowable", vendor_url: "https://www.flowable.com", headquarters_country: "Switzerland",
      description: "Open-core BPMN, DMN, and CMMN process automation and orchestration engine vendor." },
  ];
  const vendMap = await syncByKey("/vendors", vendors, "vendor_name");
  // reuse existing
  for (const v of await get("/vendors?vendor_name=in.(Appian,Bizagi%20Limited,Pegasystems%20Inc.)&select=id,vendor_name")) {
    vendMap.set(String(v.vendor_name), Number(v.id));
  }

  // ---------- solutions (add new) ----------
  const solutions: Row[] = [
    { solution_name: "Camunda 8", vendor_id: vendMap.get("Camunda")!, solution_type: "hybrid",
      solution_url: "https://camunda.com/platform/", is_active_in_market: true, solution_kind: "standard_solution",
      description: "Process orchestration platform built on the Zeebe distributed execution engine, with BPMN execution, DMN decisioning, human task lists, and operational tooling (Operate, Tasklist)." },
    { solution_name: "Temporal", vendor_id: vendMap.get("Temporal Technologies")!, solution_type: "open_source",
      solution_url: "https://temporal.io", is_active_in_market: true, solution_kind: "standard_solution",
      description: "Durable execution platform: code-first workflows and activities with automatic retries, timers, and durable state, run on Temporal Cloud or self-hosted clusters. The reference pure-play durable-execution engine." },
    { solution_name: "Orkes Conductor", vendor_id: vendMap.get("Orkes")!, solution_type: "hybrid",
      solution_url: "https://orkes.io", is_active_in_market: true, solution_kind: "standard_solution",
      description: "Enterprise distribution of the Conductor workflow orchestration engine (originated at Netflix): JSON and code-defined workflows, durable execution, and language-agnostic task workers for microservice orchestration." },
    { solution_name: "Flowable Platform", vendor_id: vendMap.get("Flowable")!, solution_type: "hybrid",
      solution_url: "https://www.flowable.com", is_active_in_market: true, solution_kind: "standard_solution",
      description: "Open-core engine implementing BPMN process execution, DMN decisioning, and CMMN case management as embeddable Java services or a standalone runtime." },
  ];
  const solMap = await syncByKey("/solutions", solutions, "solution_name");
  // reuse Pega Platform / Appian Platform / Bizagi for edges to this runtime domain
  for (const s of await get("/solutions?solution_name=in.(Pega%20Platform,Appian%20Platform,Bizagi%20Modeler%20and%20Studio)&select=id,solution_name")) {
    solMap.set(String(s.solution_name), Number(s.id));
  }

  // ---------- solution_domains ----------
  const soldoms: Array<[string, string]> = [
    ["Camunda 8", "primary"], ["Temporal", "primary"], ["Orkes Conductor", "primary"],
    ["Flowable Platform", "primary"],
    ["Pega Platform", "secondary"], ["Appian Platform", "secondary"], ["Bizagi Modeler and Studio", "secondary"],
  ];
  await syncJunction("/solution_domains",
    soldoms.filter(([s]) => solMap.has(s)).map(([s, lvl]) => ({ solution_id: solMap.get(s)!, domain_id: domainId, coverage_level: lvl })),
    r => `${r.solution_id}|${r.domain_id}`);

  // ============================================================
  // PHASE B — data objects
  // ============================================================
  const masters: Array<{ name: string; sing: string; plur: string; etype: string; desc: string;
    pc?: boolean; sl?: boolean; sa?: boolean; module: number }> = [
    { name: "process_definitions", sing: "Process Definition", plur: "Process Definitions", etype: "operational_workflow", module: EXEC,
      desc: "A deployed, executable process model (BPMN or code-defined) with a unique key and version. Instances are started from a definition; a new deployment publishes a new version while running instances stay pinned to the version they started on.",
      sa: true },
    { name: "process_instances", sing: "Process Instance", plur: "Process Instances", etype: "operational_workflow", module: EXEC,
      desc: "A single running (or completed) execution of a process definition, holding the current token position, scope variables, and a correlation key. The durable, recoverable unit the engine advances through activities and gateways." },
    { name: "process_activities", sing: "Process Activity", plur: "Process Activities", etype: "operational_workflow", module: EXEC,
      desc: "An activity execution within a process instance: a service task, script, call activity, gateway, or event, with its own lifecycle (activated, completed, failed, compensated) and the job dispatched to a task worker." },
    { name: "process_variables", sing: "Process Variable", plur: "Process Variables", etype: "operational_record", module: EXEC,
      desc: "A typed key-value datum scoped to a process instance or one of its activity scopes, carrying the business payload that activities and gateways read and write as the instance advances." },
    { name: "process_events", sing: "Process Event", plur: "Process Events", etype: "operational_record", module: EXEC,
      desc: "An append-only record of a single state change in the engine (instance started, activity completed, variable updated, incident raised). The immutable execution history used for replay, recovery, and as the source log downstream process mining consumes." },
    { name: "process_incidents", sing: "Process Incident", plur: "Process Incidents", etype: "operational_workflow", module: EXEC,
      desc: "A blocked execution: a job that exhausted its retries, an unhandled error, or a failed condition that halts an activity until an operator resolves it. Carries the failure detail and the activity it is attached to." },
    { name: "human_tasks", sing: "Human Task", plur: "Human Tasks", etype: "operational_workflow", module: CASE,
      desc: "A work item generated by a user task in a running process: an assignable, claimable unit of human work with candidate users and groups, due date, priority, and form, completed by a person to advance the instance.",
      pc: true },
    { name: "case_records", sing: "Case Record", plur: "Case Records", etype: "operational_workflow", module: CASE,
      desc: "A case file for flexible, non-sequential knowledge work: a container of ad-hoc and planned activities, milestones, and stage gates where the path is decided by workers at runtime rather than fixed in a process model." },
    { name: "decision_tables", sing: "Decision Table", plur: "Decision Tables", etype: "operational_workflow", module: CASE,
      desc: "A versioned Decision Model and Notation decision table: input and output clauses, rules, and a hit policy, authored once and invoked by running processes to evaluate business rules at runtime.",
      sa: true },
    { name: "decision_evaluations", sing: "Decision Evaluation", plur: "Decision Evaluations", etype: "operational_record", module: CASE,
      desc: "A recorded runtime evaluation of a decision table against a set of inputs: the matched rules, the resulting outputs, and the invoking process instance. The audit trail of every decision the engine made." },
  ];
  const masterDefs = masters.map(m => ({
    data_object_name: m.name, singular_label: m.sing, plural_label: m.plur,
    description: m.desc, kind: "domain_owned", entity_type: m.etype,
    has_personal_content: !!m.pc, has_submit_lock: !!m.sl, has_single_approver: !!m.sa,
  }));
  const doMap = await syncByKey("/data_objects", masterDefs, "data_object_name");
  const did = (n: string) => doMap.get(n)!;

  // ---------- domain_module_data_objects (master) ----------
  await syncJunction("/domain_module_data_objects",
    masters.map(m => ({ domain_module_id: m.module, data_object_id: did(m.name), role: "master", necessity: "required" })),
    r => `${r.domain_module_id}|${r.data_object_id}`);
  // consumer of users (platform_builtin) on both modules
  await syncJunction("/domain_module_data_objects",
    [{ domain_module_id: EXEC, data_object_id: usersId, role: "consumer", necessity: "required" },
     { domain_module_id: CASE, data_object_id: usersId, role: "consumer", necessity: "required" }],
    r => `${r.domain_module_id}|${r.data_object_id}`);

  // ---------- intra-domain data_object_relationships ----------
  // owner_side names the PARENT (cascade root). composition for owned children.
  const rels: Row[] = [
    rel("process_definitions", "process_instances", "is instantiated as", "is an instance of", "one_to_many", "composition", "source", true, doMap),
    rel("process_instances", "process_activities", "executes", "executes within", "one_to_many", "composition", "source", true, doMap),
    rel("process_instances", "process_variables", "holds", "is scoped to", "one_to_many", "composition", "source", true, doMap),
    rel("process_instances", "process_events", "emits", "is emitted by", "one_to_many", "composition", "source", true, doMap),
    rel("process_activities", "process_incidents", "raises", "is raised on", "one_to_many", "composition", "source", false, doMap),
    rel("process_activities", "human_tasks", "generates", "is generated by", "one_to_one", "reference", "source", false, doMap),
    rel("process_instances", "case_records", "anchors", "is anchored by", "one_to_one", "reference", "source", false, doMap),
    rel("case_records", "human_tasks", "contains", "belongs to", "one_to_many", "composition", "source", false, doMap),
    rel("process_activities", "decision_evaluations", "invokes", "is invoked by", "one_to_many", "reference", "source", false, doMap),
    rel("decision_tables", "decision_evaluations", "is evaluated as", "evaluates", "one_to_many", "composition", "source", true, doMap),
  ];
  // users edges (Rule #10)
  const userRels: Row[] = [
    rel2(usersId, "human_tasks", "is assigned", "is assigned to", "one_to_many", "association", "target", false),
    rel2(usersId, "case_records", "owns", "is owned by", "one_to_many", "association", "target", false),
    rel2(usersId, "process_incidents", "resolves", "is resolved by", "one_to_many", "association", "target", false),
    rel2(usersId, "decision_tables", "authors", "is authored by", "one_to_many", "association", "target", false),
    rel2(usersId, "process_definitions", "deploys", "is deployed by", "one_to_many", "association", "target", false),
  ].map(r => fillRelObj(r, doMap));
  await syncJunction("/data_object_relationships", [...rels, ...userRels],
    r => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`);

  // ---------- cross-domain relationships (outbound payload -> target master) ----------
  // PROC-MIN consumes process_events. Only author if a clean target master exists.
  const pmEventLog = await get("/data_objects?data_object_name=in.(discovered_process_models,event_logs,process_event_logs)&select=id,data_object_name");
  // process_events is the log PROC-MIN mines; if PROC-MIN masters an event-log object we link to it.
  // Keep cross-domain edges minimal and only where a real target master is found.
  const crossRels: Row[] = [];
  // No reliable single event-log master in PROC-MIN; skip to avoid a dangling edge (justified in audit).

  // ---------- aliases ----------
  const aliases: Row[] = [
    alias("process_definitions", "workflow definitions", doMap),
    alias("process_definitions", "process models", doMap),
    alias("process_instances", "workflow executions", doMap),
    alias("process_instances", "process tokens", doMap),
    alias("process_activities", "flow nodes", doMap),
    alias("process_activities", "job activities", doMap),
    alias("process_events", "execution history", doMap),
    alias("process_incidents", "failed jobs", doMap),
    alias("human_tasks", "user tasks", doMap),
    alias("human_tasks", "work items", doMap),
    alias("case_records", "case files", doMap),
    alias("decision_tables", "DMN tables", doMap),
    alias("decision_tables", "business rules", doMap),
    alias("decision_evaluations", "decision results", doMap),
    alias("process_variables", "execution variables", doMap),
  ];
  await syncJunction("/data_object_aliases", aliases, r => `${r.data_object_id}|${r.alias_name}`);

  // ---------- lifecycle states (operational_workflow masters) ----------
  const lifecycle: Array<{ obj: string; module: number; states: Array<[string, number, boolean, boolean, boolean, string]> }> = [
    // [state_name, order, is_initial, is_terminal, requires_permission, verb_override]
    { obj: "process_definitions", module: EXEC, states: [
      ["draft", 1, true, false, false, ""],
      ["deployed", 2, false, false, true, "deploy_definition"],
      ["deprecated", 3, false, false, true, "deprecate_definition"],
      ["retired", 4, false, true, true, "retire_definition"],
    ]},
    { obj: "process_instances", module: EXEC, states: [
      ["active", 1, true, false, false, ""],
      ["suspended", 2, false, false, true, "suspend_instance"],
      ["completed", 3, false, true, false, ""],
      ["terminated", 4, false, true, true, "terminate_instance"],
    ]},
    { obj: "process_activities", module: EXEC, states: [
      ["activated", 1, true, false, false, ""],
      ["completed", 2, false, true, false, ""],
      ["failed", 3, false, false, false, ""],
      ["compensated", 4, false, true, false, ""],
    ]},
    { obj: "process_incidents", module: EXEC, states: [
      ["open", 1, true, false, false, ""],
      ["resolved", 2, false, true, true, "resolve_incident"],
    ]},
    { obj: "human_tasks", module: CASE, states: [
      ["created", 1, true, false, false, ""],
      ["claimed", 2, false, false, true, "claim_task"],
      ["completed", 3, false, true, true, "complete_task"],
      ["cancelled", 4, false, true, false, ""],
    ]},
    { obj: "case_records", module: CASE, states: [
      ["open", 1, true, false, false, ""],
      ["active", 2, false, false, false, ""],
      ["closed", 3, false, true, true, "close_case"],
    ]},
    { obj: "decision_tables", module: CASE, states: [
      ["draft", 1, true, false, false, ""],
      ["active", 2, false, false, true, "activate_decision"],
      ["superseded", 3, false, true, false, ""],
    ]},
  ];
  const lcRows: Row[] = [];
  for (const l of lifecycle) {
    for (const [name, order, init, term, perm, override] of l.states) {
      lcRows.push({
        data_object_id: did(l.obj), state_name: name, state_order: order,
        is_initial: init, is_terminal: term, requires_permission: perm,
        permission_verb_override: override, domain_module_id: l.module,
        description: `The ${name} state of ${l.obj.replace(/_/g, " ")}.`,
      });
    }
  }
  await syncJunction("/data_object_lifecycle_states", lcRows, r => `${r.data_object_id}|${r.state_name}`);

  // ---------- trigger_events ----------
  const events: Row[] = [
    ev("process_instances", "process_instance.completed", "active", "completed", "lifecycle",
       "A process instance finished its end event. Carries the instance id, definition key, and final variables; downstream domains react to the business outcome.", doMap),
    ev("process_instances", "process_instance.terminated", "active", "terminated", "lifecycle",
       "A process instance was terminated before completing, by operator action or an error end event.", doMap),
    ev("human_tasks", "human_task.completed", "claimed", "completed", "lifecycle",
       "A person completed a human task; the engine advances the waiting process instance.", doMap),
    ev("process_incidents", "process_incident.raised", "", "open", "state_change",
       "A job exhausted its retries or hit an unhandled error; the instance is blocked pending resolution. Operations subscribes to triage.", doMap),
    ev("decision_tables", "decision_table.activated", "draft", "active", "lifecycle",
       "A new version of a decision table went live; running processes now evaluate against it.", doMap),
    ev("case_records", "case_record.closed", "active", "closed", "lifecycle",
       "A case was closed after its milestones were met or it was resolved; downstream record-keeping is notified.", doMap),
  ];
  await syncJunction("/trigger_events", events, r => `${r.event_name}`, "event_name");

  // ---------- handoffs (outbound) ----------
  const evMap = new Map<string, number>();
  for (const e of await get("/trigger_events?select=id,event_name&limit=10000")) evMap.set(String(e.event_name), Number(e.id));
  const handoffs: Row[] = [];
  function ho(targetCode: string, payloadObj: string, eventName: string, pattern: string, friction: string, srcMod: number, desc: string) {
    if (adj[targetCode] === undefined) return;
    handoffs.push({
      source_domain_id: domainId, target_domain_id: adj[targetCode],
      data_object_id: did(payloadObj), trigger_event_id: evMap.get(eventName) ?? null,
      source_domain_module_id: srcMod, target_domain_module_id: null,
      integration_pattern: pattern, friction_level: friction, description: desc,
    });
  }
  ho("PROC-MIN", "process_events", "process_incident.raised", "event_stream", "low", EXEC,
     "The runtime event stream is the source log process mining ingests to discover, conform, and enhance the actual execution behavior of running processes.");
  ho("OBS", "process_incidents", "process_incident.raised", "event_stream", "medium", EXEC,
     "Raised incidents and engine health signals feed observability so operations can alert on stuck instances and failed jobs.");
  ho("SUB-MGMT", "process_events", "process_instance.completed", "api_call", "medium", EXEC,
     "Completed orchestrations that meter billable activity feed subscription and usage metering downstream.");
  // RPA is invoked BY orchestration (inbound to RPA as a task worker); model as outbound api_call edge.
  if (adj["RPA"] !== undefined) {
    handoffs.push({
      source_domain_id: domainId, target_domain_id: adj["RPA"],
      data_object_id: did("process_activities"), trigger_event_id: null,
      source_domain_module_id: EXEC, target_domain_module_id: null,
      integration_pattern: "api_call", friction_level: "medium",
      description: "An automated service activity dispatches work to a robotic process automation bot as an external task worker, then resumes the instance on the bot's callback.",
    });
  }
  await syncJunction("/handoffs", handoffs, r => `${r.source_domain_id}|${r.target_domain_id}|${r.data_object_id}|${r.trigger_event_id}`);

  // ============================================================
  // PHASE C — business function ownership
  // ============================================================
  const bfd: Row[] = [
    { business_function_id: 60, domain_id: domainId, responsibility_type: "owner" },       // Platform Engineering
    { business_function_id: 26, domain_id: domainId, responsibility_type: "contributor" }, // Software Engineering
    { business_function_id: 27, domain_id: domainId, responsibility_type: "consumer" },    // IT Operations
  ];
  await syncJunction("/business_function_domains", bfd, r => `${r.business_function_id}|${r.domain_id}`);

  // ============================================================
  // PHASE S — system skill + tools + domain_module_tools
  // ============================================================
  const skillRows: Row[] = [{
    skill_name: "process-orchestration-system", skill_type: "system",
    domain_id: domainId, domain_module_id: null, process_id: null,
    description: "The agent surface for the process orchestration domain. Deploys and versions process definitions, starts and steers process instances, resolves incidents, manages human-task inboxes and cases, authors and evaluates decision tables, and reads the runtime event stream. Derives its toolset from the domain's modules.",
  }];
  const skillMap = await syncByKey("/skills", skillRows, "skill_name");
  const skillId = skillMap.get("process-orchestration-system")!;

  // tools (catalog-wide; reuse notify_person / notify_team if present)
  // Platform-side rule: coverage_tier MUST be 'platform' for every query/mutate tool
  // (these are delivered by Semantius CRUD + cube).
  const toolDefs: Array<{ name: string; op: string; obj?: string; tier: string; desc: string }> = [
    { name: "query_process_definitions", op: "query", obj: "process_definitions", tier: "platform", desc: "Read deployed process definitions and their versions." },
    { name: "deploy_process_definition", op: "mutate", obj: "process_definitions", tier: "platform", desc: "Deploy or version an executable process definition to the engine." },
    { name: "query_process_instances", op: "query", obj: "process_instances", tier: "platform", desc: "Search and read running and completed process instances and their state." },
    { name: "start_process_instance", op: "mutate", obj: "process_instances", tier: "platform", desc: "Start a new instance of a process definition with initial variables." },
    { name: "signal_process_instance", op: "mutate", obj: "process_instances", tier: "platform", desc: "Send a message, signal, or correlation event to a waiting process instance." },
    { name: "query_process_events", op: "query", obj: "process_events", tier: "platform", desc: "Read the append-only execution event history for an instance." },
    { name: "query_process_incidents", op: "query", obj: "process_incidents", tier: "platform", desc: "List blocked executions and their failure detail." },
    { name: "resolve_process_incident", op: "mutate", obj: "process_incidents", tier: "platform", desc: "Resolve an incident and resume the affected instance." },
    { name: "query_human_tasks", op: "query", obj: "human_tasks", tier: "platform", desc: "Read the human-task inbox: open, claimed, and completed work items." },
    { name: "complete_human_task", op: "mutate", obj: "human_tasks", tier: "platform", desc: "Claim or complete a human task with its form variables." },
    { name: "query_case_records", op: "query", obj: "case_records", tier: "platform", desc: "Read case files and their activities and milestones." },
    { name: "update_case_record", op: "mutate", obj: "case_records", tier: "platform", desc: "Add an activity, complete a milestone, or close a case." },
    { name: "query_decision_tables", op: "query", obj: "decision_tables", tier: "platform", desc: "Read decision tables and their versions." },
    { name: "evaluate_decision_table", op: "mutate", obj: "decision_evaluations", tier: "platform", desc: "Evaluate a decision table against inputs and record the result." },
  ];
  const toolRows = toolDefs.map(t => ({
    tool_name: t.name, operation_kind: t.op, coverage_tier: t.tier, description: t.desc,
    data_object_id: (t.op === "query" || t.op === "mutate") ? did(t.obj!) : null,
  }));
  const toolMap = await syncByKey("/tools", toolRows, "tool_name");
  // reuse notify abstractions
  for (const tn of ["notify_person", "notify_team"]) {
    const ex = await get(`/tools?tool_name=eq.${tn}&select=id,tool_name`);
    if (ex.length) toolMap.set(tn, Number(ex[0].id));
  }

  // domain_module_tools
  const dmt: Array<[number, string, string]> = [
    [EXEC, "query_process_definitions", "required"], [EXEC, "deploy_process_definition", "required"],
    [EXEC, "query_process_instances", "required"], [EXEC, "start_process_instance", "required"],
    [EXEC, "signal_process_instance", "required"], [EXEC, "query_process_events", "required"],
    [EXEC, "query_process_incidents", "required"], [EXEC, "resolve_process_incident", "required"],
    [CASE, "query_human_tasks", "required"], [CASE, "complete_human_task", "required"],
    [CASE, "query_case_records", "required"], [CASE, "update_case_record", "required"],
    [CASE, "query_decision_tables", "required"], [CASE, "evaluate_decision_table", "required"],
  ];
  if (toolMap.has("notify_person")) {
    dmt.push([CASE, "notify_person", "optional"], [EXEC, "notify_team", "optional"]);
  }
  await syncJunction("/domain_module_tools",
    dmt.filter(([, t]) => toolMap.has(t)).map(([m, t, rl]) => ({ domain_module_id: m, tool_id: toolMap.get(t)!, requirement_level: rl })),
    r => `${r.domain_module_id}|${r.tool_id}`);

  // ============================================================
  // PHASE E — personas + role_modules + process_raci
  // ============================================================
  const roles: Row[] = [
    { role_code: "PROCESS-ARCHITECT", role_name: "Process Architect", business_function_id: 60,
      description: "Designs and deploys executable process definitions and decision tables, owns versioning and breaking-change governance, and decides the orchestration topology across the engine and the case and decision layer." },
    { role_code: "PROCESS-OPERATOR", role_name: "Process Operator", business_function_id: 27,
      description: "Runs the live engine: monitors running instances, triages and resolves incidents, suspends or terminates stuck instances, and keeps throughput healthy across the execution and case modules." },
    { role_code: "CASE-WORKER", role_name: "Case Worker", business_function_id: null,
      description: "Works the human side of orchestrated processes: claims and completes human tasks, advances case files with ad-hoc activities and milestones, and escalates when work stalls." },
  ];
  const roleMap = await syncByKey("/domain_roles", roles, "role_code");
  // role_modules: each persona >=2 modules
  const rm: Array<[string, number, string]> = [
    ["PROCESS-ARCHITECT", EXEC, "primary"], ["PROCESS-ARCHITECT", CASE, "primary"],
    ["PROCESS-OPERATOR", EXEC, "primary"], ["PROCESS-OPERATOR", CASE, "secondary"],
    ["CASE-WORKER", CASE, "primary"], ["CASE-WORKER", EXEC, "secondary"],
  ];
  await syncJunction("/role_modules",
    rm.map(([rc, m, lvl]) => ({ role_id: roleMap.get(rc)!, domain_module_id: m, interaction_level: lvl })),
    r => `${r.role_id}|${r.domain_module_id}`);

  // process_raci against PCF 13.1.2 "Define and manage process frameworks" (best-fit cross-industry node)
  const pcf = await get("/processes?process_code=eq.13.1.2&select=id,process_code");
  if (pcf.length) {
    const pid = Number(pcf[0].id);
    const raci: Row[] = [
      { process_id: pid, actor_role_id: roleMap.get("PROCESS-ARCHITECT")!, raci: "accountable", consultation_blocking: false },
      { process_id: pid, actor_skill_id: skillId, raci: "responsible", consultation_blocking: false },
      { process_id: pid, actor_role_id: roleMap.get("PROCESS-OPERATOR")!, raci: "consulted", consultation_blocking: false },
    ];
    await syncJunctionRaci(pid, raci);
  } else {
    console.log("PCF 13.1.2 not found; process_raci deferred (b2)");
  }

  console.log("=== BUILD COMPLETE ===");
  console.log({ domainId, EXEC, CASE, skillId });
}

// ---- helpers ----
function rel(a: string, b: string, verb: string, inv: string, type: string, kind: string, owner: string, req: boolean, m: Map<string, number>): Row {
  return { data_object_id: m.get(a)!, related_data_object_id: m.get(b)!, relationship_verb: verb, inverse_verb: inv,
    relationship_type: type, relationship_kind: kind, owner_side: owner, is_required: req };
}
function rel2(aId: number, b: string, verb: string, inv: string, type: string, kind: string, owner: string, req: boolean): Row {
  return { __srcId: aId, __dst: b, relationship_verb: verb, inverse_verb: inv,
    relationship_type: type, relationship_kind: kind, owner_side: owner, is_required: req };
}
function fillRelObj(r: Row, m: Map<string, number>): Row {
  return { data_object_id: r.__srcId, related_data_object_id: m.get(String(r.__dst))!,
    relationship_verb: r.relationship_verb, inverse_verb: r.inverse_verb, relationship_type: r.relationship_type,
    relationship_kind: r.relationship_kind, owner_side: r.owner_side, is_required: r.is_required };
}
function alias(obj: string, name: string, m: Map<string, number>): Row {
  return { data_object_id: m.get(obj)!, alias_name: name, alias_type: "synonym", is_preferred: false };
}
function ev(obj: string, name: string, from: string, to: string, cat: string, desc: string, m: Map<string, number>): Row {
  return { data_object_id: m.get(obj)!, event_name: name, from_state: from, to_state: to, event_category: cat, description: desc };
}
async function syncJunction(path: string, rows: Row[], keyFn: (r: Row) => string, selectExtra = ""): Promise<void> {
  if (rows.length === 0) { console.log(`  ${path}: nothing to load`); return; }
  // read existing keyed
  const sel = selectExtra ? `id,${selectExtra}` : "*";
  const existing = await get(`${path}?select=${sel}&limit=20000`);
  const existKeys = new Set(existing.map(keyFn));
  const missing = rows.filter(r => !existKeys.has(keyFn(r)));
  if (missing.length > 0) {
    console.log(`  ${path}: inserting ${missing.length} new (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: all ${rows.length} present`);
  }
}
async function syncJunctionRaci(pid: number, rows: Row[]): Promise<void> {
  const existing = await get(`/process_raci?process_id=eq.${pid}&select=actor_role_id,actor_skill_id,raci`);
  const key = (r: Row) => `${r.actor_role_id ?? ""}|${r.actor_skill_id ?? ""}|${r.raci}`;
  const existKeys = new Set(existing.map(key));
  const missing = rows.filter(r => !existKeys.has(key(r)));
  if (missing.length) { console.log(`  /process_raci: inserting ${missing.length} new`); await insert("/process_raci", missing); }
  else console.log(`  /process_raci: all present`);
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
