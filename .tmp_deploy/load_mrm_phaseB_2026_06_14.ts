#!/usr/bin/env bun
// MRM — Phase B loader: data_objects, domain_module_data_objects, data_object_relationships
// (intra + users + cross-domain), data_object_aliases, data_object_lifecycle_states,
// trigger_events, outbound handoffs.
// Idempotent on natural keys. record_status omitted (DB default 'new'). notes always "".

import { $ } from "bun";
$.throws(false);
type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
async function get(path: string): Promise<Row[]> { return call({ method: "GET", path }); }
function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => { const out: Row = {}; for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null; return out; });
}
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(...await call({ method: "POST", path, body: uniformize(rows.slice(i, i + CHUNK)) }));
  return out;
}

// ---- resolved ids (Phase A + live lookups) ----
const MRM = 173;
const MOD_PLANNING = 350, MOD_BUDGET = 351;
const MA = 70, WORK = 135, DAM = 92;
const MA_CAMPAIGN_MOD = 197;   // masters marketing_campaigns (116)
const WORK_TASK_MOD = 149;     // masters work_items (243), work_projects (244)
const USERS_ID = 748;
// existing data_objects to consume / relate to:
const EXT = { marketing_campaigns: 116, work_items: 243, work_projects: 244, digital_assets: 137 };

// ============================================================
// 1. data_objects (MRM masters)
// ============================================================
type DODef = {
  name: string; singular: string; plural: string; description: string;
  entity_type: "operational_workflow" | "operational_record" | "catalog" | "junction" | "computed";
  module: number;
  has_personal_content?: boolean; has_submit_lock?: boolean; has_single_approver?: boolean;
};
const MASTERS: DODef[] = [
  { name: "marketing_plans", singular: "Marketing Plan", plural: "Marketing Plans", module: MOD_PLANNING,
    entity_type: "operational_workflow", has_single_approver: true,
    description: "Annual or quarterly marketing plan: the top-level container that organizes objectives, plan lines, and budget for a marketing period and is approved before execution." },
  { name: "marketing_plan_lines", singular: "Marketing Plan Line", plural: "Marketing Plan Lines", module: MOD_PLANNING,
    entity_type: "operational_record",
    description: "A line within a marketing plan representing a planned activity, campaign, program, or initiative, carrying its objective, owner, time window, and allocated budget. The grain at which budget is allocated and spend is reconciled." },
  { name: "marketing_calendars", singular: "Marketing Calendar", plural: "Marketing Calendars", module: MOD_PLANNING,
    entity_type: "operational_record",
    description: "A shared campaign and content calendar that lays marketing activity out across time, teams, and channels, drawing its entries from plan lines for cross-team visibility and coordination." },
  { name: "marketing_budgets", singular: "Marketing Budget", plural: "Marketing Budgets", module: MOD_BUDGET,
    entity_type: "operational_workflow", has_single_approver: true,
    description: "A pool of marketing funds for a period, business unit, or region that is approved and then allocated top-down across plans, plan lines, campaigns, and channels." },
  { name: "marketing_budget_allocations", singular: "Marketing Budget Allocation", plural: "Marketing Budget Allocations", module: MOD_BUDGET,
    entity_type: "operational_workflow", has_single_approver: true,
    description: "A top-down assignment of budget from a marketing budget to a specific plan line, campaign, or channel, routed through approval and the unit against which spend is reconciled." },
  { name: "marketing_spend_records", singular: "Marketing Spend Record", plural: "Marketing Spend Records", module: MOD_BUDGET,
    entity_type: "operational_workflow", has_submit_lock: true,
    description: "A committed or actual marketing expenditure (purchase order, invoice, or actual) attributed to a budget allocation and plan line, reconciled against allocated budget to compute remaining budget and variance." },
  { name: "marketing_performance_metrics", singular: "Marketing Performance Metric", plural: "Marketing Performance Metrics", module: MOD_BUDGET,
    entity_type: "computed",
    description: "A plan-level performance or marketing-ROI measure (results, pipeline contribution, return on marketing investment) computed against the plans and budgets that funded the activity." },
];

// consumer rows (cross-domain kernel boundary) on the planning module
type ConsumerDef = { data_object_id: number; module: number; role: "consumer"; necessity: "required" | "optional" };
const CONSUMERS: ConsumerDef[] = [
  { data_object_id: EXT.marketing_campaigns, module: MOD_PLANNING, role: "consumer", necessity: "optional" },
  { data_object_id: EXT.work_items, module: MOD_PLANNING, role: "consumer", necessity: "optional" },
  { data_object_id: EXT.work_projects, module: MOD_PLANNING, role: "consumer", necessity: "optional" },
];

async function main() {
  console.log("=== Phase B: data_objects ===");
  // collision pre-check (Rule #9)
  const names = MASTERS.map(m => m.name);
  const collide = await get(`/data_objects?data_object_name=in.(${names.join(",")})&select=id,data_object_name`);
  console.log(`  collision pre-check on ${names.length} names: ${collide.length} already exist (${collide.map(r => r.data_object_name).join(", ") || "none"})`);

  const doRows = MASTERS.map(m => ({
    data_object_name: m.name, singular_label: m.singular, plural_label: m.plural,
    description: m.description, kind: "domain_owned", entity_type: m.entity_type,
    is_canonical_bare_word: false, naming_authority_rationale: "",
    has_personal_content: m.has_personal_content ?? false, has_submit_lock: m.has_submit_lock ?? false,
    has_single_approver: m.has_single_approver ?? false,
  }));
  // idempotent insert by name
  const existing = await get(`/data_objects?data_object_name=in.(${names.join(",")})&select=id,data_object_name`);
  const existSet = new Set(existing.map(r => String(r.data_object_name)));
  const missing = doRows.filter(r => !existSet.has(String(r.data_object_name)));
  if (missing.length) await insert("/data_objects", missing);
  const all = await get(`/data_objects?data_object_name=in.(${names.join(",")})&select=id,data_object_name`);
  const doMap = new Map<string, number>();
  for (const r of all) doMap.set(String(r.data_object_name), Number(r.id));
  console.log(`  data_objects present: ${doMap.size} (inserted ${missing.length})`);

  console.log("\n=== Phase B: domain_module_data_objects (masters + consumers) ===");
  const modIds = [MOD_PLANNING, MOD_BUDGET];
  const existingDMDO = await get(`/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id,role`);
  const dmdoSet = new Set(existingDMDO.map(r => `${r.domain_module_id}:${r.data_object_id}:${r.role}`));
  const dmdoRows: Row[] = [];
  for (const m of MASTERS) {
    const did = doMap.get(m.name)!;
    const key = `${m.module}:${did}:master`;
    if (!dmdoSet.has(key)) dmdoRows.push({ domain_module_id: m.module, data_object_id: did, role: "master", necessity: "required", notes: "" });
  }
  for (const c of CONSUMERS) {
    const key = `${c.module}:${c.data_object_id}:consumer`;
    if (!dmdoSet.has(key)) dmdoRows.push({ domain_module_id: c.module, data_object_id: c.data_object_id, role: "consumer", necessity: c.necessity, notes: "" });
  }
  if (dmdoRows.length) await insert("/domain_module_data_objects", dmdoRows);
  console.log(`  domain_module_data_objects: inserted ${dmdoRows.length}`);

  // ============================================================
  // 2. data_object_relationships
  // ============================================================
  console.log("\n=== Phase B: data_object_relationships ===");
  const D = (n: string) => { const id = doMap.get(n); if (!id) throw new Error(`unknown master ${n}`); return id; };
  type RelDef = { src: number; dst: number; type: string; kind: string; verb: string; inverse: string; required: boolean; owner: "source" | "target" };
  const rels: RelDef[] = [
    // intra-domain (parent-to-child, owner_side names the parent)
    { src: D("marketing_plans"), dst: D("marketing_plan_lines"), type: "one_to_many", kind: "composition", verb: "contains", inverse: "belongs to", required: true, owner: "source" },
    { src: D("marketing_plans"), dst: D("marketing_budgets"), type: "one_to_many", kind: "reference", verb: "is funded by", inverse: "funds", required: false, owner: "target" },
    { src: D("marketing_budgets"), dst: D("marketing_budget_allocations"), type: "one_to_many", kind: "composition", verb: "is allocated as", inverse: "draws from", required: true, owner: "source" },
    { src: D("marketing_budget_allocations"), dst: D("marketing_plan_lines"), type: "one_to_many", kind: "reference", verb: "allocates to", inverse: "is funded by", required: true, owner: "target" },
    { src: D("marketing_budget_allocations"), dst: D("marketing_spend_records"), type: "one_to_many", kind: "reference", verb: "is spent against by", inverse: "draws down", required: true, owner: "source" },
    { src: D("marketing_plan_lines"), dst: D("marketing_spend_records"), type: "one_to_many", kind: "reference", verb: "incurs", inverse: "is attributed to", required: false, owner: "source" },
    { src: D("marketing_plan_lines"), dst: D("marketing_calendars"), type: "many_to_many", kind: "association", verb: "appears on", inverse: "lays out", required: false, owner: "target" },
    { src: D("marketing_plan_lines"), dst: D("marketing_performance_metrics"), type: "one_to_many", kind: "reference", verb: "is measured by", inverse: "measures", required: false, owner: "source" },
    { src: D("marketing_plans"), dst: D("marketing_performance_metrics"), type: "one_to_many", kind: "reference", verb: "is measured by", inverse: "measures", required: false, owner: "source" },
    // users edges (Rule #10): plan owner, budget approver, allocation approver, spend submitter
    { src: USERS_ID, dst: D("marketing_plans"), type: "one_to_many", kind: "association", verb: "owns", inverse: "is owned by", required: false, owner: "source" },
    { src: USERS_ID, dst: D("marketing_budgets"), type: "one_to_many", kind: "association", verb: "approves", inverse: "is approved by", required: false, owner: "source" },
    { src: USERS_ID, dst: D("marketing_budget_allocations"), type: "one_to_many", kind: "association", verb: "approves", inverse: "is approved by", required: false, owner: "source" },
    { src: USERS_ID, dst: D("marketing_spend_records"), type: "one_to_many", kind: "association", verb: "submits", inverse: "is submitted by", required: false, owner: "source" },
    { src: USERS_ID, dst: D("marketing_plan_lines"), type: "one_to_many", kind: "association", verb: "owns", inverse: "is owned by", required: false, owner: "source" },
    // cross-domain (MRM master -> external payload). owner_side = source (MRM is the verb origin).
    { src: D("marketing_plan_lines"), dst: EXT.marketing_campaigns, type: "one_to_many", kind: "reference", verb: "plans", inverse: "executes", required: false, owner: "source" },
    { src: D("marketing_plan_lines"), dst: EXT.work_items, type: "one_to_many", kind: "reference", verb: "is delivered by", inverse: "delivers", required: false, owner: "source" },
    { src: D("marketing_plan_lines"), dst: EXT.work_projects, type: "one_to_many", kind: "reference", verb: "is delivered by", inverse: "delivers", required: false, owner: "source" },
    { src: D("marketing_plan_lines"), dst: EXT.digital_assets, type: "many_to_many", kind: "association", verb: "references", inverse: "is referenced by", required: false, owner: "source" },
  ];
  const existingRel = await get(`/data_object_relationships?or=(data_object_id.in.(${[...doMap.values()].join(",")}),related_data_object_id.in.(${[...doMap.values()].join(",")}))&select=data_object_id,related_data_object_id,relationship_verb`);
  const relSet = new Set(existingRel.map(r => `${r.data_object_id}:${r.related_data_object_id}:${r.relationship_verb}`));
  const relRows = rels
    .filter(r => !relSet.has(`${r.src}:${r.dst}:${r.verb}`))
    .map(r => ({ data_object_id: r.src, related_data_object_id: r.dst, relationship_type: r.type, relationship_kind: r.kind,
      relationship_verb: r.verb, inverse_verb: r.inverse, is_required: r.required, owner_side: r.owner, notes: "" }));
  if (relRows.length) await insert("/data_object_relationships", relRows);
  console.log(`  data_object_relationships: inserted ${relRows.length} (of ${rels.length} defined)`);

  // ============================================================
  // 3. data_object_aliases
  // ============================================================
  console.log("\n=== Phase B: data_object_aliases ===");
  type AliasDef = { name: string; alias: string };
  const aliases: AliasDef[] = [
    { name: "marketing_plans", alias: "Marketing Plan" },
    { name: "marketing_plans", alias: "Annual Plan" },
    { name: "marketing_plan_lines", alias: "Plan Line" },
    { name: "marketing_plan_lines", alias: "Investment" },
    { name: "marketing_budgets", alias: "Budget Pool" },
    { name: "marketing_budget_allocations", alias: "Budget Allocation" },
    { name: "marketing_budget_allocations", alias: "Line Item Budget" },
    { name: "marketing_spend_records", alias: "Spend" },
    { name: "marketing_spend_records", alias: "Actuals" },
    { name: "marketing_spend_records", alias: "Commitment" },
    { name: "marketing_calendars", alias: "Marketing Calendar" },
    { name: "marketing_calendars", alias: "Campaign Calendar" },
    { name: "marketing_performance_metrics", alias: "Marketing ROI" },
    { name: "marketing_performance_metrics", alias: "Pipeline Contribution" },
  ];
  const existingAl = await get(`/data_object_aliases?data_object_id=in.(${[...doMap.values()].join(",")})&select=data_object_id,alias_name`);
  const alSet = new Set(existingAl.map(r => `${r.data_object_id}:${r.alias_name}`));
  const alRows = aliases
    .filter(a => !alSet.has(`${D(a.name)}:${a.alias}`))
    .map(a => ({ data_object_id: D(a.name), alias_name: a.alias, alias_type: "synonym", is_preferred: false, notes: "" }));
  if (alRows.length) await insert("/data_object_aliases", alRows);
  console.log(`  data_object_aliases: inserted ${alRows.length}`);

  // ============================================================
  // 4. data_object_lifecycle_states (operational_workflow masters)
  // ============================================================
  console.log("\n=== Phase B: data_object_lifecycle_states ===");
  type StateDef = { do: string; state: string; order: number; initial?: boolean; terminal?: boolean; gate?: boolean; verb?: string; module: number };
  const states: StateDef[] = [
    // marketing_plans (planning module)
    { do: "marketing_plans", state: "draft", order: 1, initial: true, module: MOD_PLANNING },
    { do: "marketing_plans", state: "submitted", order: 2, module: MOD_PLANNING },
    { do: "marketing_plans", state: "approved", order: 3, gate: true, verb: "approve_plan", module: MOD_PLANNING },
    { do: "marketing_plans", state: "active", order: 4, module: MOD_PLANNING },
    { do: "marketing_plans", state: "closed", order: 5, terminal: true, module: MOD_PLANNING },
    // marketing_budgets (budget module)
    { do: "marketing_budgets", state: "draft", order: 1, initial: true, module: MOD_BUDGET },
    { do: "marketing_budgets", state: "submitted", order: 2, module: MOD_BUDGET },
    { do: "marketing_budgets", state: "approved", order: 3, gate: true, verb: "approve_budget", module: MOD_BUDGET },
    { do: "marketing_budgets", state: "locked", order: 4, terminal: true, module: MOD_BUDGET },
    // marketing_budget_allocations (budget module)
    { do: "marketing_budget_allocations", state: "proposed", order: 1, initial: true, module: MOD_BUDGET },
    { do: "marketing_budget_allocations", state: "approved", order: 2, gate: true, verb: "approve_allocation", module: MOD_BUDGET },
    { do: "marketing_budget_allocations", state: "committed", order: 3, module: MOD_BUDGET },
    { do: "marketing_budget_allocations", state: "reconciled", order: 4, terminal: true, module: MOD_BUDGET },
    // marketing_spend_records (budget module)
    { do: "marketing_spend_records", state: "captured", order: 1, initial: true, module: MOD_BUDGET },
    { do: "marketing_spend_records", state: "committed", order: 2, module: MOD_BUDGET },
    { do: "marketing_spend_records", state: "actualized", order: 3, module: MOD_BUDGET },
    { do: "marketing_spend_records", state: "reconciled", order: 4, terminal: true, gate: true, verb: "reconcile_spend", module: MOD_BUDGET },
  ];
  const existingSt = await get(`/data_object_lifecycle_states?data_object_id=in.(${[...doMap.values()].join(",")})&select=data_object_id,state_name`);
  const stSet = new Set(existingSt.map(r => `${r.data_object_id}:${r.state_name}`));
  const stRows = states
    .filter(s => !stSet.has(`${D(s.do)}:${s.state}`))
    .map(s => ({ data_object_id: D(s.do), state_name: s.state, state_order: s.order, is_initial: s.initial ?? false,
      is_terminal: s.terminal ?? false, requires_permission: s.gate ?? false, permission_verb_override: s.verb ?? "",
      domain_module_id: s.module }));
  if (stRows.length) await insert("/data_object_lifecycle_states", stRows);
  console.log(`  data_object_lifecycle_states: inserted ${stRows.length}`);

  // ============================================================
  // 5. trigger_events (on state-transitioning masters)
  // ============================================================
  console.log("\n=== Phase B: trigger_events ===");
  type EvtDef = { name: string; do: string; from: string; to: string; cat: string; desc: string };
  const events: EvtDef[] = [
    { name: "marketing_plan.approved", do: "marketing_plans", from: "submitted", to: "approved", cat: "lifecycle",
      desc: "A marketing plan has been approved and its plan lines are ready to be funded and scheduled. Consumers: budget allocation, calendar publication." },
    { name: "marketing_budget.approved", do: "marketing_budgets", from: "submitted", to: "approved", cat: "lifecycle",
      desc: "A marketing budget has been approved and is available for top-down allocation across plan lines and campaigns." },
    { name: "marketing_budget_allocation.approved", do: "marketing_budget_allocations", from: "proposed", to: "approved", cat: "lifecycle",
      desc: "A budget allocation to a plan line, campaign, or channel has been approved, enabling spend to be committed against it." },
    { name: "marketing_plan_line.scheduled", do: "marketing_plan_lines", from: "", to: "scheduled", cat: "state_change",
      desc: "A plan line has been placed on the marketing calendar and handed to execution and delivery teams." },
    { name: "marketing_spend.reconciled", do: "marketing_spend_records", from: "actualized", to: "reconciled", cat: "state_change",
      desc: "A spend record has been reconciled against its budget allocation, updating remaining budget and plan-to-actual variance." },
    { name: "marketing_budget.overspent", do: "marketing_budget_allocations", from: "committed", to: "committed", cat: "threshold",
      desc: "Committed plus actual spend has exceeded the approved allocation for a plan line, signaling a budget overrun for review." },
  ];
  const existingEv = await get(`/trigger_events?data_object_id=in.(${[...doMap.values()].join(",")})&select=event_name`);
  const evSet = new Set(existingEv.map(r => String(r.event_name)));
  const evRows = events.filter(e => !evSet.has(e.name)).map(e => ({ event_name: e.name, data_object_id: D(e.do), from_state: e.from, to_state: e.to, event_category: e.cat, description: e.desc }));
  if (evRows.length) await insert("/trigger_events", evRows);
  // resolve event ids
  const allEv = await get(`/trigger_events?data_object_id=in.(${[...doMap.values()].join(",")})&select=id,event_name`);
  const evMap = new Map<string, number>(); for (const r of allEv) evMap.set(String(r.event_name), Number(r.id));
  console.log(`  trigger_events: inserted ${evRows.length}, total ${evMap.size}`);

  // ============================================================
  // 6. handoffs (outbound; only to domains with modules: MA, WORK-MGMT)
  // ============================================================
  console.log("\n=== Phase B: handoffs (outbound + intra-domain) ===");
  type HoDef = { srcMod: number; tgtDom: number; tgtMod: number | null; payload: number; event: string; pattern: string; friction: string; desc: string };
  const handoffs: HoDef[] = [
    // MRM plan approved -> MA campaign execution
    { srcMod: MOD_PLANNING, tgtDom: MA, tgtMod: MA_CAMPAIGN_MOD, payload: EXT.marketing_campaigns, event: "marketing_plan.approved", pattern: "api_call", friction: "medium",
      desc: "When a marketing plan is approved, its planned campaigns are handed to marketing-execution to be built and sent. Payload: the campaign the plan line funds." },
    // MRM plan line scheduled -> WORK-MGMT task/project delivery
    { srcMod: MOD_PLANNING, tgtDom: WORK, tgtMod: WORK_TASK_MOD, payload: EXT.work_items, event: "marketing_plan_line.scheduled", pattern: "api_call", friction: "medium",
      desc: "When a plan line is scheduled on the marketing calendar, the delivery work is handed to work-management as tasks and projects. Payload: the work item that delivers the plan line." },
    // intra-domain: plan approved -> budget allocation (PLANNING -> BUDGET)
    { srcMod: MOD_PLANNING, tgtDom: MRM, tgtMod: MOD_BUDGET, payload: 0 /*marketing_budget_allocations*/, event: "marketing_plan.approved", pattern: "lifecycle_progression", friction: "low",
      desc: "When a marketing plan is approved, the budget module allocates funds top-down to its plan lines. Intra-domain progression from planning into budget allocation." },
    // intra-domain: budget allocation approved -> spend tracking (BUDGET self cross-master)
    { srcMod: MOD_BUDGET, tgtDom: MRM, tgtMod: MOD_BUDGET, payload: 0 /*marketing_spend_records*/, event: "marketing_budget_allocation.approved", pattern: "lifecycle_progression", friction: "low",
      desc: "When a budget allocation is approved, spend can be committed and captured against it. Intra-module progression from allocation into spend tracking." },
  ];
  // fill intra-domain payload ids now that doMap exists
  handoffs[2].payload = D("marketing_budget_allocations");
  handoffs[3].payload = D("marketing_spend_records");

  const existingHo = await get(`/handoffs?source_domain_id=eq.${MRM}&select=trigger_event_id,target_domain_id,data_object_id`);
  const hoSet = new Set(existingHo.map(r => `${r.target_domain_id}:${r.data_object_id}:${r.trigger_event_id}`));
  const hoRows: Row[] = [];
  for (const h of handoffs) {
    const eid = evMap.get(h.event); if (!eid) throw new Error(`event not found: ${h.event}`);
    const key = `${h.tgtDom}:${h.payload}:${eid}`;
    if (hoSet.has(key)) continue;
    hoRows.push({ source_domain_id: MRM, target_domain_id: h.tgtDom, source_domain_module_id: h.srcMod, target_domain_module_id: h.tgtMod,
      data_object_id: h.payload, trigger_event_id: eid, integration_pattern: h.pattern, friction_level: h.friction, description: h.desc, notes: "" });
  }
  if (hoRows.length) await insert("/handoffs", hoRows);
  console.log(`  handoffs: inserted ${hoRows.length}`);

  // ============================================================
  // 7. handoff_processes (PCF tags on cross-domain handoffs)
  // ============================================================
  console.log("\n=== Phase B: handoff_processes ===");
  // re-read MRM handoffs to get ids
  const mrmHo = await get(`/handoffs?source_domain_id=eq.${MRM}&select=id,target_domain_id,data_object_id,trigger_event_id`);
  // map: plan.approved -> MA campaign handoff realizes PCF 3.3 (Develop and manage marketing plans, id 23)
  const PCF_PLAN = 23;
  const evPlanApproved = evMap.get("marketing_plan.approved")!;
  const evLineScheduled = evMap.get("marketing_plan_line.scheduled")!;
  const PCF_CALENDAR = 698; // Develop promotional/category management calendars
  const hpTargets: { handoffPredicate: (h: Row) => boolean; process_id: number }[] = [
    { handoffPredicate: h => Number(h.target_domain_id) === MA && Number(h.trigger_event_id) === evPlanApproved, process_id: PCF_PLAN },
    { handoffPredicate: h => Number(h.target_domain_id) === WORK && Number(h.trigger_event_id) === evLineScheduled, process_id: PCF_CALENDAR },
  ];
  const existingHP = await get(`/handoff_processes?handoff_id=in.(${mrmHo.map(h => h.id).join(",") || 0})&select=handoff_id,process_id`);
  const hpSet = new Set(existingHP.map(r => `${r.handoff_id}:${r.process_id}`));
  const hpRows: Row[] = [];
  for (const t of hpTargets) {
    const h = mrmHo.find(t.handoffPredicate);
    if (h && !hpSet.has(`${h.id}:${t.process_id}`)) hpRows.push({ handoff_id: h.id, process_id: t.process_id, role: "implements", proposal_source: "agent_curated", notes: "" });
  }
  if (hpRows.length) await insert("/handoff_processes", hpRows);
  console.log(`  handoff_processes: inserted ${hpRows.length}`);

  // ---- verification ----
  console.log("\n=== Phase B verification ===");
  const v = {
    masters: (await get(`/domain_module_data_objects?domain_module_id=in.(${MOD_PLANNING},${MOD_BUDGET})&role=eq.master&select=data_object_id`)).length,
    consumers: (await get(`/domain_module_data_objects?domain_module_id=in.(${MOD_PLANNING},${MOD_BUDGET})&role=eq.consumer&select=data_object_id`)).length,
    relationships: relRows.length + " new",
    aliases: (await get(`/data_object_aliases?data_object_id=in.(${[...doMap.values()].join(",")})&select=id`)).length,
    lifecycle_states: (await get(`/data_object_lifecycle_states?data_object_id=in.(${[...doMap.values()].join(",")})&select=id`)).length,
    trigger_events: evMap.size,
    handoffs: (await get(`/handoffs?source_domain_id=eq.${MRM}&select=id`)).length,
    handoff_processes: (await get(`/handoff_processes?handoff_id=in.(${mrmHo.map(h => h.id).join(",") || 0})&select=handoff_id`)).length,
  };
  console.log(JSON.stringify(v, null, 2));
  console.log("\nDATA_OBJECT_IDS:");
  for (const [k, id] of doMap) console.log(`  ${k}=${id}`);
}
await main();
console.log("Phase B done.");
