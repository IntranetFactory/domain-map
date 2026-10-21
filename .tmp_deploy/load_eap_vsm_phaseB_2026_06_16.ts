#!/usr/bin/env bun
// Phase B (data-object footprint) for EAP (186) and VSM (187).
// data_objects, domain_module_data_objects, lifecycle_states, trigger_events,
// handoffs, data_object_relationships, data_object_aliases. Idempotent.
//
// Module ids: EAP-PROGRAM-EXECUTION=399, EAP-PORTFOLIO-ROADMAP=400,
//             VSM-CONNECT-MODEL=401, VSM-FLOW-INSIGHTS=402.
// Cross-domain consumed: okr_objectives=245(WORK-MGMT), strategic_initiatives=274(SPM),
//   strategic_portfolios=273(SPM); VSDP masters pull_requests=678, ci_pipeline_runs=680,
//   software_deployments=682. users built-in=748. VSDP(80) is UNMODULARIZED (NULL module FK).

import { $ } from "bun";
$.throws(false);
type Row = Record<string, unknown>;
async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  await proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if (await proc.exited !== 0) throw new Error(`semantius failed: ${stderr}`);
  const t = stdout.trim(); return t ? JSON.parse(t) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (!rows.length) return []; const CHUNK = 50; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(...await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) }));
  return out;
}
async function syncTable(path: string, rows: Row[], key: string): Promise<Map<string, number>> {
  const ex = await get(`${path}?select=id,${key}&limit=20000`);
  const have = new Set(ex.map(r => String(r[key])));
  const miss = rows.filter(r => !have.has(String(r[key])));
  if (miss.length) { console.log(`  ${path}: +${miss.length} (${ex.length} existed)`); await insert(path, miss); }
  else console.log(`  ${path}: all ${ex.length} present`);
  const all = await get(`${path}?select=id,${key}&limit=20000`);
  const m = new Map<string, number>(); for (const r of all) m.set(String(r[key]), Number(r.id)); return m;
}

const M = { EAP_PE: 399, EAP_PR: 400, VSM_CM: 401, VSM_FI: 402 };
const EXT = { okr_objectives: 245, strategic_initiatives: 274, strategic_portfolios: 273, pull_requests: 678, ci_pipeline_runs: 680, software_deployments: 682, users: 748 };
const SPM_PORTFOLIO_MOD = 344; // SPM-PORTFOLIO-PLANNING

// ===== data_objects =====
type DO = { data_object_name: string; singular_label: string; plural_label: string; description: string; entity_type: string };
const dataObjects: DO[] = [
  { data_object_name: "portfolio_epics", singular_label: "Portfolio Epic", plural_label: "Portfolio Epics", entity_type: "operational_workflow", description: "A large body of work in the portfolio backlog that is funded, analyzed, and delivered through a kanban funnel before decomposing into features." },
  { data_object_name: "agile_features", singular_label: "Agile Feature", plural_label: "Agile Features", entity_type: "operational_workflow", description: "A deliverable unit of work below an epic, sized to be completed within a program increment by one or more teams on a release train." },
  { data_object_name: "program_increments", singular_label: "Program Increment", plural_label: "Program Increments", entity_type: "operational_workflow", description: "A fixed timebox during which a release train delivers incremental value, planned in a big-room planning event and closed with an inspect-and-adapt review." },
  { data_object_name: "agile_release_trains", singular_label: "Agile Release Train", plural_label: "Agile Release Trains", entity_type: "catalog", description: "A long-lived team-of-teams structure that plans and delivers a continuous flow of value on a common cadence." },
  { data_object_name: "pi_objectives", singular_label: "PI Objective", plural_label: "PI Objectives", entity_type: "operational_record", description: "A business or technical goal a team commits to for a program increment, scored on planned versus actual business value at the inspect-and-adapt review." },
  { data_object_name: "cross_team_dependencies", singular_label: "Cross-Team Dependency", plural_label: "Cross-Team Dependencies", entity_type: "operational_workflow", description: "A dependency between work owned by different teams or trains that must be coordinated and resolved to keep the program increment on track." },
  { data_object_name: "agile_roadmaps", singular_label: "Agile Roadmap", plural_label: "Agile Roadmaps", entity_type: "operational_record", description: "A time-phased view of planned epics and features across upcoming program increments, used for release planning and stakeholder communication." },
  // VSM
  { data_object_name: "delivery_value_streams", singular_label: "Delivery Value Stream", plural_label: "Delivery Value Streams", entity_type: "catalog", description: "A modeled end-to-end path that delivery work flows through across the toolchain, from idea to production, used as the unit of flow measurement." },
  { data_object_name: "tool_connections", singular_label: "Tool Connection", plural_label: "Tool Connections", entity_type: "catalog", description: "A configured integration to an external delivery tool from which work items and events are mirrored into the value-stream model." },
  { data_object_name: "flow_metric_definitions", singular_label: "Flow Metric Definition", plural_label: "Flow Metric Definitions", entity_type: "catalog", description: "A configured definition of a flow metric and its thresholds and targets, against which measured flow is evaluated." },
  { data_object_name: "flow_measurements", singular_label: "Flow Measurement", plural_label: "Flow Measurements", entity_type: "computed", description: "A computed measurement of flow (velocity, time, load, efficiency, or distribution) for a value stream over a period, derived from mirrored work items." },
  { data_object_name: "delivery_bottlenecks", singular_label: "Delivery Bottleneck", plural_label: "Delivery Bottlenecks", entity_type: "computed", description: "A detected constraint or slow stage in a value stream surfaced from measured flow, prioritized for remediation." },
  { data_object_name: "dora_metrics", singular_label: "DORA Metric", plural_label: "DORA Metrics", entity_type: "computed", description: "A computed delivery-performance benchmark (deployment frequency, lead time for changes, change failure rate, time to restore) for a value stream." },
];

// ===== run =====
console.log("== Phase B: EAP + VSM data-object footprint ==");
console.log("data_objects...");
const doMap = await syncTable("/data_objects", dataObjects as unknown as Row[], "data_object_name");
const id = (n: string) => doMap.get(n)!;

// ===== domain_module_data_objects =====
type DMDO = { domain_module_id: number; data_object_id: number; role: string; necessity: string };
const dmdo: DMDO[] = [
  // EAP-PROGRAM-EXECUTION masters
  { domain_module_id: M.EAP_PE, data_object_id: id("program_increments"), role: "master", necessity: "required" },
  { domain_module_id: M.EAP_PE, data_object_id: id("agile_release_trains"), role: "master", necessity: "required" },
  { domain_module_id: M.EAP_PE, data_object_id: id("pi_objectives"), role: "master", necessity: "required" },
  { domain_module_id: M.EAP_PE, data_object_id: id("cross_team_dependencies"), role: "master", necessity: "required" },
  { domain_module_id: M.EAP_PE, data_object_id: id("agile_features"), role: "embedded_master", necessity: "required" },
  // EAP-PORTFOLIO-ROADMAP masters
  { domain_module_id: M.EAP_PR, data_object_id: id("portfolio_epics"), role: "master", necessity: "required" },
  { domain_module_id: M.EAP_PR, data_object_id: id("agile_features"), role: "master", necessity: "required" },
  { domain_module_id: M.EAP_PR, data_object_id: id("agile_roadmaps"), role: "master", necessity: "required" },
  { domain_module_id: M.EAP_PR, data_object_id: id("program_increments"), role: "embedded_master", necessity: "required" },
  { domain_module_id: M.EAP_PR, data_object_id: EXT.okr_objectives, role: "consumer", necessity: "optional" },
  { domain_module_id: M.EAP_PR, data_object_id: EXT.strategic_initiatives, role: "consumer", necessity: "optional" },
  { domain_module_id: M.EAP_PR, data_object_id: EXT.strategic_portfolios, role: "consumer", necessity: "optional" },
  // VSM-CONNECT-MODEL masters + derived mirrors
  { domain_module_id: M.VSM_CM, data_object_id: id("delivery_value_streams"), role: "master", necessity: "required" },
  { domain_module_id: M.VSM_CM, data_object_id: id("tool_connections"), role: "master", necessity: "required" },
  { domain_module_id: M.VSM_CM, data_object_id: id("flow_metric_definitions"), role: "master", necessity: "required" },
  { domain_module_id: M.VSM_CM, data_object_id: id("agile_features"), role: "derived", necessity: "optional" },
  { domain_module_id: M.VSM_CM, data_object_id: EXT.pull_requests, role: "derived", necessity: "optional" },
  { domain_module_id: M.VSM_CM, data_object_id: EXT.ci_pipeline_runs, role: "derived", necessity: "optional" },
  { domain_module_id: M.VSM_CM, data_object_id: EXT.software_deployments, role: "derived", necessity: "optional" },
  // VSM-FLOW-INSIGHTS masters (computed) + embedded refs
  { domain_module_id: M.VSM_FI, data_object_id: id("flow_measurements"), role: "master", necessity: "required" },
  { domain_module_id: M.VSM_FI, data_object_id: id("delivery_bottlenecks"), role: "master", necessity: "required" },
  { domain_module_id: M.VSM_FI, data_object_id: id("dora_metrics"), role: "master", necessity: "required" },
  { domain_module_id: M.VSM_FI, data_object_id: id("delivery_value_streams"), role: "embedded_master", necessity: "required" },
  { domain_module_id: M.VSM_FI, data_object_id: id("flow_metric_definitions"), role: "embedded_master", necessity: "required" },
];
{
  const ex = await get(`/domain_module_data_objects?domain_module_id=in.(399,400,401,402)&select=domain_module_id,data_object_id,role`);
  const have = new Set(ex.map(r => `${r.domain_module_id}:${r.data_object_id}:${r.role}`));
  const rows = dmdo.filter(r => !have.has(`${r.domain_module_id}:${r.data_object_id}:${r.role}`));
  if (rows.length) await insert("/domain_module_data_objects", rows as unknown as Row[]);
  console.log(`  domain_module_data_objects: +${rows.length}`);
}

// ===== lifecycle states (operational_workflow masters) =====
type LS = { data_object_id: number; state_name: string; state_order: number; is_initial?: boolean; is_terminal?: boolean; requires_permission?: boolean; permission_verb_override?: string; domain_module_id?: number };
const states: LS[] = [
  // portfolio_epics (gate at portfolio_backlog = approve)
  { data_object_id: id("portfolio_epics"), state_name: "funnel", state_order: 1, is_initial: true },
  { data_object_id: id("portfolio_epics"), state_name: "reviewing", state_order: 2 },
  { data_object_id: id("portfolio_epics"), state_name: "analyzing", state_order: 3 },
  { data_object_id: id("portfolio_epics"), state_name: "portfolio_backlog", state_order: 4, requires_permission: true, permission_verb_override: "approve_epic", domain_module_id: M.EAP_PR },
  { data_object_id: id("portfolio_epics"), state_name: "implementing", state_order: 5 },
  { data_object_id: id("portfolio_epics"), state_name: "done", state_order: 6, is_terminal: true },
  // agile_features (ungated team flow)
  { data_object_id: id("agile_features"), state_name: "backlog", state_order: 1, is_initial: true },
  { data_object_id: id("agile_features"), state_name: "analyzing", state_order: 2 },
  { data_object_id: id("agile_features"), state_name: "implementing", state_order: 3 },
  { data_object_id: id("agile_features"), state_name: "validating", state_order: 4 },
  { data_object_id: id("agile_features"), state_name: "deploying", state_order: 5 },
  { data_object_id: id("agile_features"), state_name: "done", state_order: 6, is_terminal: true },
  // program_increments (gate at committed = commit_pi)
  { data_object_id: id("program_increments"), state_name: "planning", state_order: 1, is_initial: true },
  { data_object_id: id("program_increments"), state_name: "committed", state_order: 2, requires_permission: true, permission_verb_override: "commit_pi", domain_module_id: M.EAP_PE },
  { data_object_id: id("program_increments"), state_name: "executing", state_order: 3 },
  { data_object_id: id("program_increments"), state_name: "inspect_adapt", state_order: 4 },
  { data_object_id: id("program_increments"), state_name: "closed", state_order: 5, is_terminal: true },
  // cross_team_dependencies (ungated)
  { data_object_id: id("cross_team_dependencies"), state_name: "identified", state_order: 1, is_initial: true },
  { data_object_id: id("cross_team_dependencies"), state_name: "committed", state_order: 2 },
  { data_object_id: id("cross_team_dependencies"), state_name: "in_progress", state_order: 3 },
  { data_object_id: id("cross_team_dependencies"), state_name: "resolved", state_order: 4, is_terminal: true },
];
{
  const woMasters = [id("portfolio_epics"), id("agile_features"), id("program_increments"), id("cross_team_dependencies")];
  const ex = await get(`/data_object_lifecycle_states?data_object_id=in.(${woMasters.join(",")})&select=data_object_id,state_name`);
  const have = new Set(ex.map(r => `${r.data_object_id}:${r.state_name}`));
  // PostgREST bulk insert requires uniform keys across all objects -> normalize.
  const rows = states.filter(s => !have.has(`${s.data_object_id}:${s.state_name}`)).map(s => ({
    data_object_id: s.data_object_id, state_name: s.state_name, state_order: s.state_order,
    is_initial: s.is_initial ?? false, is_terminal: s.is_terminal ?? false,
    requires_permission: s.requires_permission ?? false,
    permission_verb_override: s.permission_verb_override ?? "",
    domain_module_id: s.domain_module_id ?? null,
  }));
  if (rows.length) await insert("/data_object_lifecycle_states", rows as unknown as Row[]);
  console.log(`  data_object_lifecycle_states: +${rows.length}`);
}

// ===== trigger_events =====
type TE = { event_name: string; data_object_id: number; event_category: string; from_state?: string; to_state?: string; description: string };
const events: TE[] = [
  { event_name: "feature.committed", data_object_id: id("agile_features"), event_category: "state_change", from_state: "analyzing", to_state: "implementing", description: "A feature has been committed to delivery and pulled into implementation." },
  { event_name: "epic.done", data_object_id: id("portfolio_epics"), event_category: "lifecycle", from_state: "implementing", to_state: "done", description: "A portfolio epic has completed delivery." },
  { event_name: "pi.committed", data_object_id: id("program_increments"), event_category: "lifecycle", from_state: "planning", to_state: "committed", description: "A program increment plan has been committed at the end of PI planning." },
  { event_name: "value_stream.activated", data_object_id: id("delivery_value_streams"), event_category: "lifecycle", from_state: "", to_state: "active", description: "A delivery value stream has been modeled and activated for flow measurement." },
  { event_name: "bottleneck.detected", data_object_id: id("delivery_bottlenecks"), event_category: "signal", from_state: "", to_state: "detected", description: "A delivery bottleneck has been detected in a value stream from measured flow." },
  { event_name: "flow_distribution.shifted", data_object_id: id("flow_measurements"), event_category: "threshold", from_state: "", to_state: "", description: "The investment mix of work in a value stream has shifted beyond a configured threshold (e.g. defect or debt load rising)." },
];
const teMap = await syncTable("/trigger_events", events as unknown as Row[], "event_name");
// only our event_names (syncTable returns all catalog events; filter our keys)
const te = (n: string) => teMap.get(n)!;

// ===== handoffs (cross-domain outbound from EAP/VSM + intra-domain) =====
// VSDP(80) unmodularized -> target_domain_module_id NULL (legitimate; reported as gap).
type HO = { trigger_event_id: number; source_domain_id: number; target_domain_id: number; source_domain_module_id: number; target_domain_module_id: number | null; data_object_id: number; integration_pattern: string; friction_level: string; description: string };
const EAP = 186, VSM = 187, VSDP = 80, SPM = 9;
const handoffs: HO[] = [
  // EAP feature.committed -> VSDP delivery toolchain (payload agile_features); VSDP unmodularized
  { trigger_event_id: te("feature.committed"), source_domain_id: EAP, target_domain_id: VSDP, source_domain_module_id: M.EAP_PR, target_domain_module_id: null, data_object_id: id("agile_features"), integration_pattern: "api_call", friction_level: "medium", description: "A committed feature flows from agile planning into the delivery toolchain for implementation; teams reconcile feature state between the planning tool and the delivery tools, a frequent source of drift." },
  // EAP feature.committed -> intra-domain PI execution tracking (fan-out, same trigger)
  { trigger_event_id: te("feature.committed"), source_domain_id: EAP, target_domain_id: EAP, source_domain_module_id: M.EAP_PR, target_domain_module_id: M.EAP_PE, data_object_id: id("agile_features"), integration_pattern: "lifecycle_progression", friction_level: "low", description: "A committed feature is pulled into the current program increment for execution tracking within the release train." },
  // EAP epic.done -> SPM portfolio (benefits / delivery status)
  { trigger_event_id: te("epic.done"), source_domain_id: EAP, target_domain_id: SPM, source_domain_module_id: M.EAP_PR, target_domain_module_id: SPM_PORTFOLIO_MOD, data_object_id: id("portfolio_epics"), integration_pattern: "api_call", friction_level: "medium", description: "Completion of a portfolio epic rolls delivery status up to strategic portfolio planning for benefits realization and investment review." },
  // EAP value_stream not relevant; VSM intra-domain value_stream.activated -> flow insights
  { trigger_event_id: te("value_stream.activated"), source_domain_id: VSM, target_domain_id: VSM, source_domain_module_id: M.VSM_CM, target_domain_module_id: M.VSM_FI, data_object_id: id("delivery_value_streams"), integration_pattern: "lifecycle_progression", friction_level: "low", description: "An activated value stream begins flowing measured data into the flow-metrics and insights module." },
  // VSM bottleneck.detected -> EAP replan
  { trigger_event_id: te("bottleneck.detected"), source_domain_id: VSM, target_domain_id: EAP, source_domain_module_id: M.VSM_FI, target_domain_module_id: M.EAP_PE, data_object_id: id("delivery_bottlenecks"), integration_pattern: "api_call", friction_level: "high", description: "A detected delivery bottleneck signals the release train to replan capacity or resequence dependencies; the probabilistic signal must be triaged into a concrete planning action." },
  // VSM flow_distribution.shifted -> SPM investment review
  { trigger_event_id: te("flow_distribution.shifted"), source_domain_id: VSM, target_domain_id: SPM, source_domain_module_id: M.VSM_FI, target_domain_module_id: SPM_PORTFOLIO_MOD, data_object_id: id("flow_measurements"), integration_pattern: "api_call", friction_level: "medium", description: "A shift in the feature-versus-defect-versus-debt investment mix prompts a strategic-portfolio investment review." },
];
{
  const ex = await get(`/handoffs?source_domain_id=in.(186,187)&select=trigger_event_id,target_domain_id,data_object_id`);
  const have = new Set(ex.map(r => `${r.trigger_event_id}:${r.target_domain_id}:${r.data_object_id}`));
  const rows = handoffs.filter(h => !have.has(`${h.trigger_event_id}:${h.target_domain_id}:${h.data_object_id}`));
  if (rows.length) await insert("/handoffs", rows as unknown as Row[]);
  console.log(`  handoffs: +${rows.length}`);
}

// ===== data_object_relationships =====
type REL = { data_object_id: number; related_data_object_id: number; relationship_verb: string; inverse_verb: string; relationship_type: string; relationship_kind: string; is_required: boolean; owner_side: string };
const U = EXT.users;
const rels: REL[] = [
  // intra-EAP hierarchy
  { data_object_id: id("portfolio_epics"), related_data_object_id: id("agile_features"), relationship_verb: "contains", inverse_verb: "belongs_to", relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source" },
  { data_object_id: id("program_increments"), related_data_object_id: id("agile_features"), relationship_verb: "schedules", inverse_verb: "scheduled_in", relationship_type: "one_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
  { data_object_id: id("program_increments"), related_data_object_id: id("pi_objectives"), relationship_verb: "commits", inverse_verb: "committed_in", relationship_type: "one_to_many", relationship_kind: "composition", is_required: true, owner_side: "source" },
  { data_object_id: id("agile_release_trains"), related_data_object_id: id("program_increments"), relationship_verb: "runs", inverse_verb: "run_by", relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source" },
  { data_object_id: id("agile_features"), related_data_object_id: id("cross_team_dependencies"), relationship_verb: "has", inverse_verb: "blocks", relationship_type: "one_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
  { data_object_id: id("agile_roadmaps"), related_data_object_id: id("portfolio_epics"), relationship_verb: "plots", inverse_verb: "appears_on", relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
  // intra-VSM
  { data_object_id: id("delivery_value_streams"), related_data_object_id: id("tool_connections"), relationship_verb: "draws_from", inverse_verb: "feeds", relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
  { data_object_id: id("delivery_value_streams"), related_data_object_id: id("flow_measurements"), relationship_verb: "measured_by", inverse_verb: "measures", relationship_type: "one_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
  { data_object_id: id("delivery_value_streams"), related_data_object_id: id("delivery_bottlenecks"), relationship_verb: "exhibits", inverse_verb: "found_in", relationship_type: "one_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
  { data_object_id: id("delivery_value_streams"), related_data_object_id: id("dora_metrics"), relationship_verb: "benchmarked_by", inverse_verb: "benchmarks", relationship_type: "one_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
  { data_object_id: id("flow_metric_definitions"), related_data_object_id: id("flow_measurements"), relationship_verb: "defines", inverse_verb: "computed_from", relationship_type: "one_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
  // users edges (Rule #10)
  { data_object_id: U, related_data_object_id: id("portfolio_epics"), relationship_verb: "owns", inverse_verb: "owned_by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  { data_object_id: U, related_data_object_id: id("agile_features"), relationship_verb: "owns", inverse_verb: "owned_by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  { data_object_id: U, related_data_object_id: id("program_increments"), relationship_verb: "facilitates", inverse_verb: "facilitated_by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  { data_object_id: U, related_data_object_id: id("agile_release_trains"), relationship_verb: "engineers", inverse_verb: "engineered_by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  { data_object_id: U, related_data_object_id: id("cross_team_dependencies"), relationship_verb: "raises", inverse_verb: "raised_by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  { data_object_id: U, related_data_object_id: id("agile_roadmaps"), relationship_verb: "authors", inverse_verb: "authored_by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  { data_object_id: U, related_data_object_id: id("tool_connections"), relationship_verb: "configures", inverse_verb: "configured_by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  { data_object_id: U, related_data_object_id: id("delivery_value_streams"), relationship_verb: "models", inverse_verb: "modeled_by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  // cross-domain (outbound from EAP/VSM); epic->strategic_initiative dependency is
  // captured by the consumer DMDO + the epic.done->SPM handoff (many_to_one is not a
  // permitted relationship_type, and inverting it would make an SPM master the source).
  { data_object_id: id("flow_measurements"), related_data_object_id: id("agile_features"), relationship_verb: "derived_from", inverse_verb: "feeds", relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  { data_object_id: id("dora_metrics"), related_data_object_id: EXT.software_deployments, relationship_verb: "derived_from", inverse_verb: "feeds", relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
];
{
  const allIds = [...new Set(rels.flatMap(r => [r.data_object_id, r.related_data_object_id]))];
  const ex = await get(`/data_object_relationships?data_object_id=in.(${allIds.join(",")})&select=data_object_id,related_data_object_id,relationship_verb`);
  const have = new Set(ex.map(r => `${r.data_object_id}:${r.related_data_object_id}:${r.relationship_verb}`));
  const rows = rels.filter(r => !have.has(`${r.data_object_id}:${r.related_data_object_id}:${r.relationship_verb}`));
  if (rows.length) await insert("/data_object_relationships", rows as unknown as Row[]);
  console.log(`  data_object_relationships: +${rows.length}`);
}

// ===== data_object_aliases =====
type AL = { data_object_id: number; alias_name: string; alias_type: string };
const aliases: AL[] = [
  { data_object_id: id("portfolio_epics"), alias_name: "Epic", alias_type: "synonym" },
  { data_object_id: id("portfolio_epics"), alias_name: "Initiative", alias_type: "synonym" },
  { data_object_id: id("agile_features"), alias_name: "Feature", alias_type: "synonym" },
  { data_object_id: id("agile_features"), alias_name: "Backlog Item", alias_type: "synonym" },
  { data_object_id: id("program_increments"), alias_name: "PI", alias_type: "synonym" },
  { data_object_id: id("program_increments"), alias_name: "Increment", alias_type: "synonym" },
  { data_object_id: id("agile_release_trains"), alias_name: "ART", alias_type: "synonym" },
  { data_object_id: id("agile_release_trains"), alias_name: "Release Train", alias_type: "synonym" },
  { data_object_id: id("pi_objectives"), alias_name: "PI Objective", alias_type: "synonym" },
  { data_object_id: id("cross_team_dependencies"), alias_name: "Dependency", alias_type: "synonym" },
  { data_object_id: id("delivery_value_streams"), alias_name: "Value Stream", alias_type: "synonym" },
  { data_object_id: id("delivery_value_streams"), alias_name: "Delivery Pipeline", alias_type: "synonym" },
  { data_object_id: id("flow_measurements"), alias_name: "Flow Metrics", alias_type: "synonym" },
  { data_object_id: id("dora_metrics"), alias_name: "DORA", alias_type: "synonym" },
  { data_object_id: id("dora_metrics"), alias_name: "Four Keys", alias_type: "synonym" },
  { data_object_id: id("delivery_bottlenecks"), alias_name: "Constraint", alias_type: "synonym" },
];
{
  const allIds = [...new Set(aliases.map(a => a.data_object_id))];
  const ex = await get(`/data_object_aliases?data_object_id=in.(${allIds.join(",")})&select=data_object_id,alias_name`);
  const have = new Set(ex.map(r => `${r.data_object_id}:${r.alias_name}`));
  const rows = aliases.filter(a => !have.has(`${a.data_object_id}:${a.alias_name}`));
  if (rows.length) await insert("/data_object_aliases", rows as unknown as Row[]);
  console.log(`  data_object_aliases: +${rows.length}`);
}

console.log("\n== Phase B done ==");
console.log("data_object ids:", JSON.stringify(Object.fromEntries(dataObjects.map(d => [d.data_object_name, id(d.data_object_name)]))));
