#!/usr/bin/env bun
// .tmp_deploy/fix_planning_cluster_2026_06_17.ts
//
// Applies the agent-fixable Bucket-1 findings from the 2026-06-17 read-only B-band audits of the
// unreleased planning cluster (WFM 59, EPM 66, SEM 166, SPM 9). Everything lands at the DB default
// record_status='new' (Rule #1: never approved). Idempotent: re-running skips rows already present.
//
// Scope (all additive/corrective):
//   B13 classify entity_type        : 8 masters (WFM 4, EPM 4)
//   B12 author lifecycle            : 6 state machines (WFM time_entries/work_schedules, EPM 4)
//   M4  fix state_order             : SEM strategy_decisions (collision at order 2)
//   B9c fix from_state/to_state      : SPM events (verified against live states)
//   B9  stamp domain_module_id       : 10 SPM trigger_events
//   B9c align to_state               : WFM/EPM publish/approve/complete events
//   B6  intra-domain relationships   : WFM 5 edges, EPM 5 edges
//   B11 aliases                      : WFM + EPM masters
//
// OUT OF SCOPE (surfaced, not auto-authored): B7 users edges (the clean SWP domain models none, so
// there is no in-cluster convention to mirror), and B9 missing handoffs (need a target-domain
// decision). NO destructive work, NO cross-domain rows.

export {};

import { pg } from "../scripts/lib/catalog";

const log: string[] = [];
async function get(path: string): Promise<any[]> {
  return ((await pg("GET", path)) as any[]) ?? [];
}
async function patch(path: string, body: Record<string, unknown>): Promise<void> {
  await pg("PATCH", path, body);
}
async function post(path: string, body: unknown): Promise<void> {
  await pg("POST", path, body);
}

// ---------------------------------------------------------------------------
// B13 - classify entity_type (additive: fills the 'unclassified' default)
// ---------------------------------------------------------------------------
const CLASSIFY: { id: number; name: string; entity_type: string }[] = [
  { id: 160, name: "work_schedules", entity_type: "operational_workflow" },
  { id: 162, name: "time_entries", entity_type: "operational_workflow" },
  { id: 165, name: "time_off_policies", entity_type: "catalog" },
  { id: 166, name: "meal_break_records", entity_type: "operational_record" },
  { id: 38, name: "financial_budgets", entity_type: "operational_workflow" },
  { id: 39, name: "financial_forecasts", entity_type: "operational_workflow" },
  { id: 40, name: "financial_scenarios", entity_type: "operational_workflow" },
  { id: 41, name: "variance_analyses", entity_type: "operational_workflow" },
];
for (const c of CLASSIFY) {
  await patch(`/data_objects?id=eq.${c.id}`, { entity_type: c.entity_type });
  log.push(`B13 ${c.name} -> ${c.entity_type}`);
}

// ---------------------------------------------------------------------------
// B12 - author lifecycle state machines (idempotent: skip if states already exist)
// ---------------------------------------------------------------------------
type St = {
  state_name: string;
  state_order: number;
  description: string;
  is_initial?: boolean;
  is_terminal?: boolean;
  requires_permission?: boolean;
  permission_verb_override?: string;
};
const MACHINES: { data_object_id: number; module: number; name: string; states: St[] }[] = [
  {
    data_object_id: 162, module: 194, name: "time_entries",
    states: [
      { state_name: "open", state_order: 10, is_initial: true, description: "Worker is logging time against the period; not yet submitted." },
      { state_name: "submitted", state_order: 20, description: "Worker submits the timesheet for manager review." },
      { state_name: "approved", state_order: 30, requires_permission: true, permission_verb_override: "approve_time_entry", description: "Manager approves the logged time. Publishes time_entry.approved." },
      { state_name: "posted", state_order: 40, description: "Approved actuals posted to payroll for the pay period. Publishes actuals.posted." },
      { state_name: "closed", state_order: 50, is_terminal: true, description: "Pay period closed; the entry is locked. Publishes pay_period.closed." },
    ],
  },
  {
    data_object_id: 160, module: 195, name: "work_schedules",
    states: [
      { state_name: "draft", state_order: 10, is_initial: true, description: "Schedule is being built from the scheduling-optimization run; not yet visible to workers." },
      { state_name: "published", state_order: 20, requires_permission: true, permission_verb_override: "publish_work_schedule", description: "Schedule published to workers; shifts are now assigned. Publishes work_schedule.published." },
      { state_name: "archived", state_order: 30, is_terminal: true, description: "Schedule period elapsed; retained for reference and reporting." },
    ],
  },
  {
    data_object_id: 38, module: 239, name: "financial_budgets",
    states: [
      { state_name: "draft", state_order: 10, is_initial: true, description: "Budget is being built for the planning period." },
      { state_name: "submitted", state_order: 20, description: "Submitted to finance leadership for review against targets." },
      { state_name: "approved", state_order: 30, requires_permission: true, permission_verb_override: "approve_financial_budget", description: "Leadership approves the budget version." },
      { state_name: "locked", state_order: 40, requires_permission: true, permission_verb_override: "lock_financial_budget", description: "Baselined and locked as the budget of record for the period." },
      { state_name: "closed", state_order: 50, is_terminal: true, description: "Budget period closed; retained for variance reporting." },
    ],
  },
  {
    data_object_id: 39, module: 240, name: "financial_forecasts",
    states: [
      { state_name: "draft", state_order: 10, is_initial: true, description: "Forecast is being prepared or refreshed for the horizon." },
      { state_name: "published", state_order: 20, requires_permission: true, permission_verb_override: "publish_financial_forecast", description: "Forecast published as the current rolling view. Publishes financial_forecast.refreshed." },
      { state_name: "superseded", state_order: 30, is_terminal: true, description: "Replaced by the next forecast cycle; retained for trend analysis." },
    ],
  },
  {
    data_object_id: 40, module: 240, name: "financial_scenarios",
    states: [
      { state_name: "draft", state_order: 10, is_initial: true, description: "Scenario is being modeled against drivers and assumptions. Publishes financial_scenario.modeled." },
      { state_name: "under_review", state_order: 20, description: "Scenario reviewed against the base plan and alternatives." },
      { state_name: "selected", state_order: 30, requires_permission: true, permission_verb_override: "select_financial_scenario", description: "Chosen as the basis for the plan or budget." },
      { state_name: "archived", state_order: 40, is_terminal: true, description: "Not selected or no longer relevant; retained for reference." },
    ],
  },
  {
    data_object_id: 41, module: 241, name: "variance_analyses",
    states: [
      { state_name: "open", state_order: 10, is_initial: true, description: "Variance analysis initiated for the period against budget and forecast." },
      { state_name: "in_review", state_order: 20, description: "Material variances investigated and explained with owners." },
      { state_name: "completed", state_order: 30, is_terminal: true, requires_permission: true, permission_verb_override: "complete_variance_analysis", description: "Analysis signed off and circulated to management. Publishes variance_analysis.completed." },
    ],
  },
];
for (const m of MACHINES) {
  const existing = await get(`/data_object_lifecycle_states?data_object_id=eq.${m.data_object_id}&select=id&limit=1`);
  if (existing.length > 0) {
    log.push(`B12 ${m.name} - lifecycle already present, skipped`);
    continue;
  }
  const body = m.states.map((s) => ({
    data_object_id: m.data_object_id,
    state_name: s.state_name,
    state_order: s.state_order,
    description: s.description,
    is_initial: Boolean(s.is_initial),
    is_terminal: Boolean(s.is_terminal),
    requires_permission: Boolean(s.requires_permission),
    permission_verb_override: s.permission_verb_override ?? "",
    domain_module_id: m.module,
  }));
  await post(`/data_object_lifecycle_states`, body);
  log.push(`B12 ${m.name} -> ${m.states.length} states (module ${m.module})`);
}

// ---------------------------------------------------------------------------
// M4 - SEM strategy_decisions (810): decided/deferred/withdrawn all at order 2 -> unique monotonic
// proposed=1 (keep), deferred=2 (keep), decided=3, withdrawn=4
// ---------------------------------------------------------------------------
await patch(`/data_object_lifecycle_states?id=eq.691`, { state_order: 3 }); // decided
await patch(`/data_object_lifecycle_states?id=eq.693`, { state_order: 4 }); // withdrawn
log.push(`M4 strategy_decisions: decided->3, withdrawn->4 (deferred stays 2, proposed stays 1)`);

// ---------------------------------------------------------------------------
// B9c - SPM event from_state/to_state, verified against live states before writing
// ---------------------------------------------------------------------------
async function statesOf(doId: number): Promise<Set<string>> {
  const rows = await get(`/data_object_lifecycle_states?data_object_id=eq.${doId}&select=state_name`);
  return new Set(rows.map((r) => r.state_name as string));
}
const B9C: { eventId: number; doId: number; field: "from_state" | "to_state"; value: string; label: string }[] = [
  { eventId: 215, doId: 278, field: "from_state", value: "screened", label: "demand_intake.approved from_state reviewed->screened" },
  { eventId: 218, doId: 275, field: "from_state", value: "in_development", label: "roadmap_item.released from_state in_progress->in_development" },
  { eventId: 872, doId: 276, field: "to_state", value: "approved", label: "business_value_assessment.completed to_state ->approved" },
  { eventId: 874, doId: 281, field: "to_state", value: "realized", label: "benefits_tracking_record.realized to_state ->realized" },
  { eventId: 875, doId: 281, field: "to_state", value: "at_risk", label: "benefits_tracking_record.at_risk to_state ->at_risk" },
];
for (const e of B9C) {
  const states = await statesOf(e.doId);
  if (!states.has(e.value)) {
    log.push(`B9c SKIP ${e.label} - target state '${e.value}' not found on data_object ${e.doId} (states: ${[...states].join(",")})`);
    continue;
  }
  await patch(`/trigger_events?id=eq.${e.eventId}`, { [e.field]: e.value });
  log.push(`B9c ${e.label}`);
}

// ---------------------------------------------------------------------------
// B9 - stamp domain_module_id on SPM trigger_events (event -> module of its mastering data_object)
// ---------------------------------------------------------------------------
const STAMP: { eventId: number; module: number }[] = [
  { eventId: 214, module: 343 }, { eventId: 215, module: 343 }, { eventId: 872, module: 343 },
  { eventId: 219, module: 344 }, { eventId: 218, module: 344 }, { eventId: 873, module: 344 },
  { eventId: 874, module: 344 }, { eventId: 875, module: 344 },
  { eventId: 220, module: 345 }, { eventId: 221, module: 345 },
];
for (const s of STAMP) {
  await patch(`/trigger_events?id=eq.${s.eventId}`, { domain_module_id: s.module });
}
log.push(`B9 stamped domain_module_id on ${STAMP.length} SPM trigger_events`);

// ---------------------------------------------------------------------------
// B9c - align WFM/EPM publish/approve/complete event to_state to the (now-present) states
// ---------------------------------------------------------------------------
const ALIGN: { eventId: number; doId: number; value: string; label: string }[] = [
  { eventId: 429, doId: 160, value: "published", label: "work_schedule.published to_state ->published" },
  { eventId: 584, doId: 37, value: "approved", label: "financial_plan.approved to_state ->approved" },
  { eventId: 583, doId: 37, value: "published", label: "financial_plan.published to_state ->published" },
  { eventId: 586, doId: 41, value: "completed", label: "variance_analysis.completed to_state ->completed" },
];
for (const a of ALIGN) {
  const states = await statesOf(a.doId);
  if (!states.has(a.value)) {
    log.push(`B9c-align SKIP ${a.label} - state '${a.value}' not found on ${a.doId}`);
    continue;
  }
  await patch(`/trigger_events?id=eq.${a.eventId}`, { to_state: a.value });
  log.push(`B9c-align ${a.label}`);
}

// ---------------------------------------------------------------------------
// B6 - intra-domain relationships (idempotent on (data_object_id, related_data_object_id))
// ---------------------------------------------------------------------------
type Rel = {
  data_object_id: number; related_data_object_id: number;
  relationship_type: string; relationship_kind: string;
  relationship_verb: string; inverse_verb: string; is_required: boolean; owner_side: string;
};
const RELS: Rel[] = [
  // WFM
  { data_object_id: 160, related_data_object_id: 161, relationship_type: "one_to_many", relationship_kind: "composition", relationship_verb: "includes", inverse_verb: "rolls_up_to", is_required: true, owner_side: "source" },
  { data_object_id: 161, related_data_object_id: 162, relationship_type: "one_to_many", relationship_kind: "reference", relationship_verb: "has", inverse_verb: "logged_against", is_required: false, owner_side: "source" },
  { data_object_id: 165, related_data_object_id: 164, relationship_type: "one_to_many", relationship_kind: "reference", relationship_verb: "governs", inverse_verb: "governed_by", is_required: true, owner_side: "source" },
  { data_object_id: 165, related_data_object_id: 163, relationship_type: "one_to_many", relationship_kind: "reference", relationship_verb: "governs", inverse_verb: "governed_by", is_required: true, owner_side: "source" },
  { data_object_id: 162, related_data_object_id: 166, relationship_type: "one_to_many", relationship_kind: "reference", relationship_verb: "has", inverse_verb: "recorded_for", is_required: false, owner_side: "source" },
  // EPM
  { data_object_id: 37, related_data_object_id: 38, relationship_type: "one_to_many", relationship_kind: "composition", relationship_verb: "includes", inverse_verb: "rolls_up_to", is_required: true, owner_side: "source" },
  { data_object_id: 37, related_data_object_id: 39, relationship_type: "one_to_many", relationship_kind: "composition", relationship_verb: "includes", inverse_verb: "rolls_up_to", is_required: false, owner_side: "source" },
  { data_object_id: 37, related_data_object_id: 40, relationship_type: "one_to_many", relationship_kind: "reference", relationship_verb: "explores_via", inverse_verb: "explored_for", is_required: false, owner_side: "source" },
  { data_object_id: 41, related_data_object_id: 38, relationship_type: "many_to_many", relationship_kind: "reference", relationship_verb: "evaluates", inverse_verb: "evaluated_by", is_required: false, owner_side: "source" },
  { data_object_id: 41, related_data_object_id: 39, relationship_type: "many_to_many", relationship_kind: "reference", relationship_verb: "evaluates", inverse_verb: "evaluated_by", is_required: false, owner_side: "source" },
];
let relAdded = 0;
for (const r of RELS) {
  const existing = await get(
    `/data_object_relationships?data_object_id=eq.${r.data_object_id}&related_data_object_id=eq.${r.related_data_object_id}&select=data_object_id&limit=1`,
  );
  if (existing.length > 0) continue;
  await post(`/data_object_relationships`, [r]);
  relAdded++;
}
log.push(`B6 relationships: ${relAdded}/${RELS.length} added (rest already present)`);

// ---------------------------------------------------------------------------
// B11 - aliases (idempotent on (data_object_id, alias_name)); alias_type synonym, not preferred
// ---------------------------------------------------------------------------
const ALIASES: { doId: number; names: string[] }[] = [
  { doId: 160, names: ["Shift Schedule", "Roster", "Work Roster"] },
  { doId: 161, names: ["Shift", "Scheduled Shift"] },
  { doId: 162, names: ["Timesheet Entry", "Time Record"] },
  { doId: 163, names: ["Leave Request", "Vacation Request", "PTO Request", "Time-Off Request"] },
  { doId: 164, names: ["Leave Balance", "PTO Balance", "Accrual Balance"] },
  { doId: 165, names: ["Leave Policy", "PTO Policy", "Accrual Policy"] },
  { doId: 166, names: ["Break Record", "Rest Break Log", "Meal Period Record"] },
  { doId: 37, names: ["Operating Plan", "Long-Range Plan", "LRP"] },
  { doId: 38, names: ["Operating Budget", "Annual Budget", "Budget"] },
  { doId: 39, names: ["Rolling Forecast", "Reforecast", "Forecast"] },
  { doId: 40, names: ["What-If Scenario", "Planning Scenario"] },
  { doId: 41, names: ["Budget Variance", "Variance Report", "Plan-vs-Actual Analysis"] },
];
let aliasAdded = 0;
for (const a of ALIASES) {
  const existing = await get(`/data_object_aliases?data_object_id=eq.${a.doId}&select=alias_name`);
  const have = new Set(existing.map((r) => (r.alias_name as string).toLowerCase()));
  const toAdd = a.names
    .filter((n) => !have.has(n.toLowerCase()))
    .map((n) => ({ data_object_id: a.doId, alias_name: n, alias_type: "synonym", is_preferred: false }));
  if (toAdd.length === 0) continue;
  await post(`/data_object_aliases`, toAdd);
  aliasAdded += toAdd.length;
}
log.push(`B11 aliases: ${aliasAdded} added`);

console.log(log.join("\n"));
console.log(`\nDONE. All writes at record_status='new'. Out of scope (surfaced): B7 users edges, B9 missing handoffs.`);
