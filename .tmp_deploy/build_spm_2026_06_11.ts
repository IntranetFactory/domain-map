#!/usr/bin/env bun
// Full build-out of the SPM (Strategic Portfolio Management) domain, id 9.
// Decision (user, 2026-06-11): keep the SPM/SEM split. SPM masters 8 planning objects;
// strategic_initiatives (274) stays mastered by SEM and is embedded by SPM.
// Idempotent throughout: every section reads existing state and inserts/patches only the gap.
// Everything lands at record_status='new' (DB default; we never set 'approved').

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
const get = (path: string) => call({ method: "GET", path });
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += 50) {
    out.push(...(await call({ method: "POST", path, body: rows.slice(i, i + 50) })));
  }
  return out;
}
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });
const del = (path: string) => call({ method: "DELETE", path });

const DOMAIN = 9;
const USERS = 748;
// SPM masters
const M = {
  portfolios: 273, initiatives: 274, roadmap: 275, bva: 276, allocations: 277,
  demand: 278, scenarios: 279, dependency: 280, benefits: 281,
};
// consumed/contributed (cross-domain)
const C = { wf_scenarios: 27, fin_scenarios: 40, pos_forecasts: 25, work_items: 243, projects: 216 };

const log = (s: string) => console.log(s);

// ============================================================
// PHASE A — capabilities + capability_domains
// ============================================================
log("\n=== PHASE A: capabilities ===");
const capSpecs = [
  { capability_code: "SPM-DEMAND-INTAKE", capability_name: "Demand Intake and Triage", description: "Centralized intake of ideas, requests, and project proposals through standardized forms, with screening and routing into the portfolio funnel." },
  { capability_code: "SPM-VALUE-SCORING", capability_name: "Business Value Scoring", description: "Scoring of candidate initiatives on business value, cost, risk, and strategic alignment to prioritize what gets funded." },
  { capability_code: "SPM-PORTFOLIO-STRUCTURING", capability_name: "Portfolio Structuring", description: "Grouping of funded initiatives into portfolios that roll up to corporate strategy, with rebalancing as priorities shift." },
  { capability_code: "SPM-ROADMAP-PLANNING", capability_name: "Roadmap Planning", description: "Scheduling of roadmap items across time horizons with their dependencies and contingencies in view." },
  { capability_code: "SPM-DEPENDENCY-MGMT", capability_name: "Dependency Management", description: "Mapping and surfacing of inter-initiative and cross-roadmap dependency chains that put delivery at risk." },
  { capability_code: "SPM-BENEFITS-REALIZATION", capability_name: "Benefits Realization", description: "Tracking of realized benefits against the business case that justified each investment, including at-risk and written-off outcomes." },
  { capability_code: "SPM-RESOURCE-ALLOCATION", capability_name: "Resource and Capacity Allocation", description: "Committing of people, budget, and capacity to initiatives against available supply, with conflict detection." },
  { capability_code: "SPM-SCENARIO-PLANNING", capability_name: "Capacity Scenario Modeling", description: "What-if modeling of alternative investment and capacity mixes, compared side by side before a commitment is made." },
];
const capMap = await (async () => {
  const existing = await get(`/capabilities?capability_code=like.SPM-*&select=id,capability_code&limit=1000`);
  const have = new Set(existing.map(r => String(r.capability_code)));
  const missing = capSpecs.filter(c => !have.has(c.capability_code));
  if (missing.length) { log(`  inserting ${missing.length} capabilities`); await insert("/capabilities", missing); }
  else log("  capabilities present");
  const all = await get(`/capabilities?capability_code=in.(${capSpecs.map(c => c.capability_code).join(",")})&select=id,capability_code`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r.capability_code), Number(r.id));
  return map;
})();
// capability_domains
{
  const existing = await get(`/capability_domains?domain_id=eq.${DOMAIN}&select=capability_id`);
  const have = new Set(existing.map(r => Number(r.capability_id)));
  const rows = [...capMap.values()].filter(id => !have.has(id)).map(capability_id => ({ capability_id, domain_id: DOMAIN, notes: "" }));
  if (rows.length) { log(`  linking ${rows.length} capability_domains`); await insert("/capability_domains", rows); }
  else log("  capability_domains present");
}

// ============================================================
// PHASE M — domain_modules + domain_module_capabilities
// ============================================================
log("\n=== PHASE M: modules ===");
const modSpecs = [
  {
    domain_module_code: "SPM-DEMAND-MGMT", domain_module_name: "Demand and Value Management", domain_id: DOMAIN, module_kind: "full",
    description: "Captures incoming demand (ideas, requests, project proposals), screens it, and scores each candidate on business value, cost, risk, and strategic alignment. The output is a prioritized, value-assessed funnel that feeds Portfolio Planning. Deployable standalone as a lightweight intake-and-scoring layer.",
    catalog_tagline: "Take in every request, score it on business value, and let the strongest ideas rise to the top.",
    catalog_description: "Demand and Value Management is the front door to your portfolio. Ideas, requests, and project proposals come in through one standardized intake, get screened by an intake board, and are scored on business value, cost, risk, and strategic fit.\n\nA published value assessment freezes so funding and prioritization decisions can rely on it. Approved demand graduates into funded initiatives, ready for portfolio planning, so you spend your capacity on the work that matters most.",
  },
  {
    domain_module_code: "SPM-PORTFOLIO-PLANNING", domain_module_name: "Portfolio Planning", domain_id: DOMAIN, module_kind: "full",
    description: "The heart of SPM: groups funded initiatives into strategic portfolios, schedules roadmap items with their dependencies, maps dependency chains that threaten delivery, and tracks benefits against each investment's business case. Embeds strategic_initiatives from SEM (local shell when SEM is absent, defers to SEM's canonical master when co-deployed).",
    catalog_tagline: "Group initiatives into portfolios, schedule the roadmap, and follow the benefits to realization.",
    catalog_description: "Portfolio Planning turns funded initiatives into a defensible plan. Structure portfolios that roll up to corporate strategy, sequence roadmap items with their dependencies in view, and surface the dependency chains that put delivery at risk.\n\nAfter the plan is set, keep it honest: track benefits against the case that justified each investment, flag the ones falling behind, and rebalance the portfolio when priorities shift.",
  },
  {
    domain_module_code: "SPM-RESOURCE-CAPACITY", domain_module_name: "Resource and Capacity Planning", domain_id: DOMAIN, module_kind: "full",
    description: "Commits people, budget, and capacity to initiatives against available supply, detects allocation conflicts, and models what-if scenarios before a commitment is made. Consumes workforce_scenarios (SWP), financial_scenarios (EPM), position_demand_forecasts (SWP), work_items (WORK-MGMT), and service_projects (PSA) to ground capacity decisions.",
    catalog_tagline: "Match people and budget to the work, spot conflicts early, and model the trade-offs before you commit.",
    catalog_description: "Resource and Capacity Planning is the engine that makes the portfolio real. Every initiative competes for the same people, budget, and time, so allocations are committed against actual capacity and conflicts are caught before they bite.\n\nModel what-if scenarios side by side, freeze each evaluated plan as a stable snapshot for comparison, and commit with confidence using a single resource-committee sign-off.",
  },
];
const modMap = await (async () => {
  const codes = modSpecs.map(m => m.domain_module_code);
  const existing = await get(`/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`);
  const have = new Set(existing.map(r => String(r.domain_module_code)));
  const missing = modSpecs.filter(m => !have.has(m.domain_module_code));
  if (missing.length) { log(`  inserting ${missing.length} modules`); await insert("/domain_modules", missing); }
  else log("  modules present");
  const all = await get(`/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r.domain_module_code), Number(r.id));
  return map;
})();
const mid = (code: string) => { const v = modMap.get(code); if (!v) throw new Error(`no module ${code}`); return v; };

// domain_module_capabilities (incl. dual-linked SEM-PORTFOLIO-ALIGN id 572)
{
  const dmcSpec: Array<[string, number]> = [
    ["SPM-DEMAND-MGMT", capMap.get("SPM-DEMAND-INTAKE")!],
    ["SPM-DEMAND-MGMT", capMap.get("SPM-VALUE-SCORING")!],
    ["SPM-PORTFOLIO-PLANNING", capMap.get("SPM-PORTFOLIO-STRUCTURING")!],
    ["SPM-PORTFOLIO-PLANNING", capMap.get("SPM-ROADMAP-PLANNING")!],
    ["SPM-PORTFOLIO-PLANNING", capMap.get("SPM-DEPENDENCY-MGMT")!],
    ["SPM-PORTFOLIO-PLANNING", capMap.get("SPM-BENEFITS-REALIZATION")!],
    ["SPM-PORTFOLIO-PLANNING", 572], // SEM-PORTFOLIO-ALIGN (investment alignment to strategy)
    ["SPM-RESOURCE-CAPACITY", capMap.get("SPM-RESOURCE-ALLOCATION")!],
    ["SPM-RESOURCE-CAPACITY", capMap.get("SPM-SCENARIO-PLANNING")!],
  ];
  const modIds = modSpecs.map(m => mid(m.domain_module_code));
  const existing = await get(`/domain_module_capabilities?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,capability_id`);
  const have = new Set(existing.map(r => `${r.domain_module_id}:${r.capability_id}`));
  const rows = dmcSpec.map(([code, cap]) => ({ domain_module_id: mid(code), capability_id: cap, notes: "" }))
    .filter(r => !have.has(`${r.domain_module_id}:${r.capability_id}`));
  if (rows.length) { log(`  linking ${rows.length} domain_module_capabilities`); await insert("/domain_module_capabilities", rows); }
  else log("  domain_module_capabilities present");
}

// ============================================================
// DMDO — wire masters / embedded / consumers into domain_module_data_objects
// ============================================================
log("\n=== DMDO wiring ===");
{
  const dmdoSpec: Array<[string, number, string, string]> = [
    // SPM-DEMAND-MGMT
    ["SPM-DEMAND-MGMT", M.demand, "master", "required"],
    ["SPM-DEMAND-MGMT", M.bva, "master", "required"],
    ["SPM-DEMAND-MGMT", USERS, "consumer", "optional"],
    // SPM-PORTFOLIO-PLANNING
    ["SPM-PORTFOLIO-PLANNING", M.portfolios, "master", "required"],
    ["SPM-PORTFOLIO-PLANNING", M.roadmap, "master", "required"],
    ["SPM-PORTFOLIO-PLANNING", M.dependency, "master", "required"],
    ["SPM-PORTFOLIO-PLANNING", M.benefits, "master", "required"],
    ["SPM-PORTFOLIO-PLANNING", M.initiatives, "embedded_master", "required"], // canonical master = SEM
    ["SPM-PORTFOLIO-PLANNING", USERS, "consumer", "optional"],
    // SPM-RESOURCE-CAPACITY
    ["SPM-RESOURCE-CAPACITY", M.allocations, "master", "required"],
    ["SPM-RESOURCE-CAPACITY", M.scenarios, "master", "required"],
    ["SPM-RESOURCE-CAPACITY", C.wf_scenarios, "consumer", "optional"],
    ["SPM-RESOURCE-CAPACITY", C.fin_scenarios, "consumer", "optional"],
    ["SPM-RESOURCE-CAPACITY", C.pos_forecasts, "contributor", "optional"],
    ["SPM-RESOURCE-CAPACITY", C.work_items, "consumer", "optional"],
    ["SPM-RESOURCE-CAPACITY", C.projects, "consumer", "optional"],
    ["SPM-RESOURCE-CAPACITY", USERS, "consumer", "optional"],
  ];
  const modIds = modSpecs.map(m => mid(m.domain_module_code));
  const existing = await get(`/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id`);
  const have = new Set(existing.map(r => `${r.domain_module_id}:${r.data_object_id}`));
  const rows = dmdoSpec.map(([code, doid, role, necessity]) => ({ domain_module_id: mid(code), data_object_id: doid, role, necessity, notes: "" }))
    .filter(r => !have.has(`${r.domain_module_id}:${r.data_object_id}`));
  if (rows.length) { log(`  inserting ${rows.length} domain_module_data_objects`); await insert("/domain_module_data_objects", rows); }
  else log("  domain_module_data_objects present");
}

// ============================================================
// entity_type classification + pattern flags
// ============================================================
log("\n=== entity_type + pattern flags ===");
await patch(`/data_objects?id=eq.${M.dependency}`, { entity_type: "operational_record" }); // config-shape (q8=a)
await patch(`/data_objects?id=eq.${M.bva}`, { has_submit_lock: true, has_single_approver: true });
await patch(`/data_objects?id=eq.${M.scenarios}`, { has_submit_lock: true });
await patch(`/data_objects?id=eq.${M.demand}`, { has_single_approver: true });
await patch(`/data_objects?id=eq.${M.allocations}`, { has_single_approver: true });
log("  patched dependency_chains=operational_record; submit-locks + approver gates set");

// ============================================================
// lifecycle states (7 operational_workflow masters; 274 owned by SEM, 280 config-shape)
// ============================================================
log("\n=== lifecycle states ===");
{
  type LS = { do: number; state_name: string; state_order: number; is_initial?: boolean; is_terminal?: boolean; rp?: boolean; ov?: string; mod: string };
  const states: LS[] = [
    // business_value_assessments (DEMAND)
    { do: M.bva, state_name: "draft", state_order: 1, is_initial: true, mod: "SPM-DEMAND-MGMT" },
    { do: M.bva, state_name: "submitted", state_order: 2, mod: "SPM-DEMAND-MGMT" },
    { do: M.bva, state_name: "approved", state_order: 3, is_terminal: true, rp: true, ov: "approve_business_value_assessment", mod: "SPM-DEMAND-MGMT" },
    // demand_intake_requests (DEMAND)
    { do: M.demand, state_name: "submitted", state_order: 1, is_initial: true, mod: "SPM-DEMAND-MGMT" },
    { do: M.demand, state_name: "screened", state_order: 2, mod: "SPM-DEMAND-MGMT" },
    { do: M.demand, state_name: "approved", state_order: 3, rp: true, ov: "approve_demand_intake_request", mod: "SPM-DEMAND-MGMT" },
    { do: M.demand, state_name: "rejected", state_order: 4, is_terminal: true, rp: true, ov: "reject_demand_intake_request", mod: "SPM-DEMAND-MGMT" },
    { do: M.demand, state_name: "fulfilled", state_order: 5, is_terminal: true, mod: "SPM-DEMAND-MGMT" },
    // strategic_portfolios (PORTFOLIO)
    { do: M.portfolios, state_name: "proposed", state_order: 1, is_initial: true, mod: "SPM-PORTFOLIO-PLANNING" },
    { do: M.portfolios, state_name: "active", state_order: 2, rp: true, ov: "activate_strategic_portfolio", mod: "SPM-PORTFOLIO-PLANNING" },
    { do: M.portfolios, state_name: "under_review", state_order: 3, mod: "SPM-PORTFOLIO-PLANNING" },
    { do: M.portfolios, state_name: "sunset", state_order: 4, is_terminal: true, rp: true, ov: "retire_strategic_portfolio", mod: "SPM-PORTFOLIO-PLANNING" },
    // roadmap_items (PORTFOLIO)
    { do: M.roadmap, state_name: "planned", state_order: 1, is_initial: true, mod: "SPM-PORTFOLIO-PLANNING" },
    { do: M.roadmap, state_name: "committed", state_order: 2, rp: true, ov: "commit_roadmap_item", mod: "SPM-PORTFOLIO-PLANNING" },
    { do: M.roadmap, state_name: "in_development", state_order: 3, mod: "SPM-PORTFOLIO-PLANNING" },
    { do: M.roadmap, state_name: "delivered", state_order: 4, is_terminal: true, rp: true, ov: "release_roadmap_item", mod: "SPM-PORTFOLIO-PLANNING" },
    { do: M.roadmap, state_name: "cancelled", state_order: 5, is_terminal: true, mod: "SPM-PORTFOLIO-PLANNING" },
    // benefits_tracking_records (PORTFOLIO)
    { do: M.benefits, state_name: "baseline", state_order: 1, is_initial: true, mod: "SPM-PORTFOLIO-PLANNING" },
    { do: M.benefits, state_name: "tracking", state_order: 2, mod: "SPM-PORTFOLIO-PLANNING" },
    { do: M.benefits, state_name: "at_risk", state_order: 3, mod: "SPM-PORTFOLIO-PLANNING" },
    { do: M.benefits, state_name: "realized", state_order: 4, is_terminal: true, rp: true, ov: "realize_benefit", mod: "SPM-PORTFOLIO-PLANNING" },
    { do: M.benefits, state_name: "written_off", state_order: 5, is_terminal: true, rp: true, ov: "write_off_benefit", mod: "SPM-PORTFOLIO-PLANNING" },
    // resource_allocations (RESOURCE)
    { do: M.allocations, state_name: "proposed", state_order: 1, is_initial: true, mod: "SPM-RESOURCE-CAPACITY" },
    { do: M.allocations, state_name: "approved", state_order: 2, rp: true, ov: "approve_resource_allocation", mod: "SPM-RESOURCE-CAPACITY" },
    { do: M.allocations, state_name: "committed", state_order: 3, rp: true, ov: "commit_resource_allocation", mod: "SPM-RESOURCE-CAPACITY" },
    { do: M.allocations, state_name: "consumed", state_order: 4, is_terminal: true, mod: "SPM-RESOURCE-CAPACITY" },
    // scenario_plans (RESOURCE)
    { do: M.scenarios, state_name: "draft", state_order: 1, is_initial: true, mod: "SPM-RESOURCE-CAPACITY" },
    { do: M.scenarios, state_name: "evaluated", state_order: 2, rp: true, ov: "evaluate_scenario_plan", mod: "SPM-RESOURCE-CAPACITY" },
    { do: M.scenarios, state_name: "approved", state_order: 3, mod: "SPM-RESOURCE-CAPACITY" },
    { do: M.scenarios, state_name: "archived", state_order: 4, is_terminal: true, mod: "SPM-RESOURCE-CAPACITY" },
  ];
  const dos = [...new Set(states.map(s => s.do))];
  const existing = await get(`/data_object_lifecycle_states?data_object_id=in.(${dos.join(",")})&select=data_object_id,state_name`);
  const have = new Set(existing.map(r => `${r.data_object_id}:${r.state_name}`));
  const rows = states.filter(s => !have.has(`${s.do}:${s.state_name}`)).map(s => ({
    data_object_id: s.do, state_name: s.state_name, state_order: s.state_order,
    is_initial: !!s.is_initial, is_terminal: !!s.is_terminal, requires_permission: !!s.rp,
    permission_verb_override: s.ov ?? "", domain_module_id: mid(s.mod),
  }));
  if (rows.length) { log(`  inserting ${rows.length} lifecycle states`); await insert("/data_object_lifecycle_states", rows); }
  else log("  lifecycle states present");
}

// ============================================================
// data_object_relationships — intra-domain edges + users edges
// ============================================================
log("\n=== relationships ===");
{
  type R = { a: number; b: number; v: string; iv: string; t: string; k: string; req?: boolean; owner?: string };
  const rels: R[] = [
    // intra-domain workflow edges
    { a: M.portfolios, b: M.initiatives, v: "groups", iv: "grouped_into", t: "one_to_many", k: "association", owner: "source" },
    { a: M.demand, b: M.initiatives, v: "becomes", iv: "originated_from", t: "one_to_one", k: "reference", owner: "source" },
    { a: M.initiatives, b: M.bva, v: "evaluated_by", iv: "evaluates", t: "one_to_many", k: "reference", owner: "source" },
    { a: M.initiatives, b: M.roadmap, v: "delivered_through", iv: "delivers", t: "one_to_many", k: "reference", owner: "source" },
    { a: M.initiatives, b: M.allocations, v: "staffed_by", iv: "staffs", t: "one_to_many", k: "reference", owner: "source" },
    { a: M.scenarios, b: M.allocations, v: "models", iv: "modeled_in", t: "many_to_many", k: "reference", owner: "source" },
    { a: M.dependency, b: M.initiatives, v: "links", iv: "linked_by", t: "many_to_many", k: "reference", owner: "source" },
    { a: M.dependency, b: M.roadmap, v: "sequences", iv: "sequenced_by", t: "many_to_many", k: "reference", owner: "source" },
    { a: M.initiatives, b: M.benefits, v: "tracked_by", iv: "tracks", t: "one_to_many", k: "reference", owner: "source" },
    // users edges (Rule #10) — user is parent (one user -> many records); record holds the FK
    { a: USERS, b: M.portfolios, v: "owns", iv: "owned_by", t: "one_to_many", k: "reference", req: true, owner: "source" },
    { a: USERS, b: M.roadmap, v: "plans", iv: "planned_by", t: "one_to_many", k: "reference", req: true, owner: "source" },
    { a: USERS, b: M.bva, v: "assesses", iv: "assessed_by", t: "one_to_many", k: "reference", req: true, owner: "source" },
    { a: USERS, b: M.bva, v: "approves", iv: "approved_by", t: "one_to_many", k: "reference", req: false, owner: "source" },
    { a: USERS, b: M.allocations, v: "allocates", iv: "allocated_by", t: "one_to_many", k: "reference", req: true, owner: "source" },
    { a: USERS, b: M.allocations, v: "approves", iv: "approved_by", t: "one_to_many", k: "reference", req: false, owner: "source" },
    { a: USERS, b: M.demand, v: "requests", iv: "requested_by", t: "one_to_many", k: "reference", req: true, owner: "source" },
    { a: USERS, b: M.demand, v: "approves", iv: "approved_by", t: "one_to_many", k: "reference", req: false, owner: "source" },
    { a: USERS, b: M.scenarios, v: "models", iv: "modeled_by", t: "one_to_many", k: "reference", req: true, owner: "source" },
    { a: USERS, b: M.dependency, v: "maintains", iv: "maintained_by", t: "one_to_many", k: "reference", req: true, owner: "source" },
    { a: USERS, b: M.benefits, v: "owns", iv: "owned_by", t: "one_to_many", k: "reference", req: true, owner: "source" },
  ];
  const allDos = [...new Set(rels.flatMap(r => [r.a, r.b]))];
  const existing = await get(`/data_object_relationships?or=(data_object_id.in.(${allDos.join(",")}),related_data_object_id.in.(${allDos.join(",")}))&select=data_object_id,related_data_object_id,relationship_verb`);
  const have = new Set(existing.map(r => `${r.data_object_id}:${r.related_data_object_id}:${r.relationship_verb}`));
  const rows = rels.filter(r => !have.has(`${r.a}:${r.b}:${r.v}`)).map(r => ({
    data_object_id: r.a, related_data_object_id: r.b, relationship_verb: r.v, inverse_verb: r.iv,
    relationship_type: r.t, relationship_kind: r.k, is_required: !!r.req, owner_side: r.owner ?? "source", notes: "",
  }));
  if (rows.length) { log(`  inserting ${rows.length} relationships`); await insert("/data_object_relationships", rows); }
  else log("  relationships present");
}

// ============================================================
// handoffs — backfill source_domain_module_id (B10b)
// ============================================================
log("\n=== handoff source-module backfill ===");
{
  const map: Array<[number, string]> = [
    [793, "SPM-DEMAND-MGMT"], [796, "SPM-DEMAND-MGMT"], [240, "SPM-DEMAND-MGMT"],
    [244, "SPM-PORTFOLIO-PLANNING"], [243, "SPM-PORTFOLIO-PLANNING"], [794, "SPM-PORTFOLIO-PLANNING"],
    [792, "SPM-PORTFOLIO-PLANNING"], [795, "SPM-PORTFOLIO-PLANNING"],
    [246, "SPM-RESOURCE-CAPACITY"], [242, "SPM-RESOURCE-CAPACITY"],
  ];
  for (const [hid, code] of map) {
    await patch(`/handoffs?id=eq.${hid}&source_domain_module_id=is.null`, { source_domain_module_id: mid(code) });
  }
  log(`  patched ${map.length} handoffs (245/241/178 left NULL — mis-attributed SEM publishers, surfaced)`);
}

// ============================================================
// PHASE S — tools + domain_module_tools
// ============================================================
log("\n=== PHASE S: tools ===");
const newTools = [
  { tool_name: "create_business_value_assessment", operation_kind: "mutate", data_object_id: M.bva, coverage_tier: "platform", description: "Create a business value assessment scoring an initiative on value, cost, risk, and strategic alignment." },
  { tool_name: "approve_business_value_assessment", operation_kind: "mutate", data_object_id: M.bva, coverage_tier: "platform", description: "Approve and publish a business value assessment; freezes it so downstream funding decisions can rely on it." },
  { tool_name: "create_demand_intake_request", operation_kind: "mutate", data_object_id: M.demand, coverage_tier: "platform", description: "Submit a new demand intake request (idea, project proposal, or change) into the portfolio funnel." },
  { tool_name: "create_strategic_portfolio", operation_kind: "mutate", data_object_id: M.portfolios, coverage_tier: "platform", description: "Create a strategic portfolio that groups funded initiatives and rolls up to corporate strategy." },
  { tool_name: "activate_strategic_portfolio", operation_kind: "mutate", data_object_id: M.portfolios, coverage_tier: "platform", description: "Activate a proposed strategic portfolio so it becomes the live investment grouping." },
  { tool_name: "commit_roadmap_item", operation_kind: "mutate", data_object_id: M.roadmap, coverage_tier: "platform", description: "Commit a planned roadmap item to the delivery schedule with its dependencies in view." },
  { tool_name: "create_benefits_tracking_record", operation_kind: "mutate", data_object_id: M.benefits, coverage_tier: "platform", description: "Baseline a benefits tracking record against an initiative's business case." },
  { tool_name: "realize_benefit", operation_kind: "mutate", data_object_id: M.benefits, coverage_tier: "platform", description: "Mark a tracked benefit as realized against its baselined target." },
  { tool_name: "create_resource_allocation", operation_kind: "mutate", data_object_id: M.allocations, coverage_tier: "platform", description: "Propose a resource allocation committing people or capacity to an initiative." },
  { tool_name: "approve_resource_allocation", operation_kind: "mutate", data_object_id: M.allocations, coverage_tier: "platform", description: "Approve a proposed resource allocation via the resource-committee gate." },
  { tool_name: "commit_resource_allocation", operation_kind: "mutate", data_object_id: M.allocations, coverage_tier: "platform", description: "Commit an approved resource allocation against available capacity." },
  { tool_name: "create_scenario_plan", operation_kind: "mutate", data_object_id: M.scenarios, coverage_tier: "platform", description: "Create a what-if scenario plan modeling an alternative investment or capacity mix." },
  { tool_name: "evaluate_scenario_plan", operation_kind: "mutate", data_object_id: M.scenarios, coverage_tier: "platform", description: "Evaluate and freeze a scenario plan so later what-if comparisons reference a fixed snapshot." },
];
{
  const names = newTools.map(t => t.tool_name);
  const existing = await get(`/tools?tool_name=in.(${names.join(",")})&select=tool_name`);
  const have = new Set(existing.map(r => String(r.tool_name)));
  const missing = newTools.filter(t => !have.has(t.tool_name));
  if (missing.length) { log(`  inserting ${missing.length} tools`); await insert("/tools", missing); }
  else log("  tools present");
}
// resolve all tool ids needed
const toolNames = [
  "query_demand_intake_requests", "create_demand_intake_request", "approve_demand_intake_request",
  "query_business_value_assessments", "create_business_value_assessment", "approve_business_value_assessment",
  "notify_person",
  "query_portfolios", "create_strategic_portfolio", "activate_strategic_portfolio",
  "query_roadmap_items", "update_roadmap_item", "commit_roadmap_item",
  "query_dependency_chains",
  "query_benefits_tracking_records", "create_benefits_tracking_record", "realize_benefit",
  "query_strategic_initiatives", "create_strategic_initiative", "update_strategic_initiative",
  "query_resource_allocations", "create_resource_allocation", "approve_resource_allocation", "commit_resource_allocation",
  "query_scenario_plans", "create_scenario_plan", "evaluate_scenario_plan",
  "detect_resource_allocation_conflict", "match_resource_to_project_demand",
  "query_financial_scenarios", "query_workforce_scenarios", "query_position_demand_forecasts",
];
const toolMap = await (async () => {
  const all = await get(`/tools?tool_name=in.(${toolNames.join(",")})&select=id,tool_name`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r.tool_name), Number(r.id));
  return map;
})();
const tid = (n: string) => { const v = toolMap.get(n); if (!v) throw new Error(`no tool ${n}`); return v; };

// domain_module_tools
{
  const dmt: Array<[string, string, string]> = [
    // SPM-DEMAND-MGMT
    ["SPM-DEMAND-MGMT", "query_demand_intake_requests", "required"],
    ["SPM-DEMAND-MGMT", "create_demand_intake_request", "required"],
    ["SPM-DEMAND-MGMT", "approve_demand_intake_request", "required"],
    ["SPM-DEMAND-MGMT", "query_business_value_assessments", "required"],
    ["SPM-DEMAND-MGMT", "create_business_value_assessment", "required"],
    ["SPM-DEMAND-MGMT", "approve_business_value_assessment", "required"],
    ["SPM-DEMAND-MGMT", "notify_person", "optional"],
    // SPM-PORTFOLIO-PLANNING
    ["SPM-PORTFOLIO-PLANNING", "query_portfolios", "required"],
    ["SPM-PORTFOLIO-PLANNING", "create_strategic_portfolio", "required"],
    ["SPM-PORTFOLIO-PLANNING", "activate_strategic_portfolio", "required"],
    ["SPM-PORTFOLIO-PLANNING", "query_roadmap_items", "required"],
    ["SPM-PORTFOLIO-PLANNING", "update_roadmap_item", "required"],
    ["SPM-PORTFOLIO-PLANNING", "commit_roadmap_item", "required"],
    ["SPM-PORTFOLIO-PLANNING", "query_dependency_chains", "required"],
    ["SPM-PORTFOLIO-PLANNING", "query_benefits_tracking_records", "required"],
    ["SPM-PORTFOLIO-PLANNING", "create_benefits_tracking_record", "required"],
    ["SPM-PORTFOLIO-PLANNING", "realize_benefit", "required"],
    ["SPM-PORTFOLIO-PLANNING", "query_strategic_initiatives", "required"],
    ["SPM-PORTFOLIO-PLANNING", "create_strategic_initiative", "optional"],
    ["SPM-PORTFOLIO-PLANNING", "update_strategic_initiative", "optional"],
    ["SPM-PORTFOLIO-PLANNING", "notify_person", "optional"],
    // SPM-RESOURCE-CAPACITY
    ["SPM-RESOURCE-CAPACITY", "query_resource_allocations", "required"],
    ["SPM-RESOURCE-CAPACITY", "create_resource_allocation", "required"],
    ["SPM-RESOURCE-CAPACITY", "approve_resource_allocation", "required"],
    ["SPM-RESOURCE-CAPACITY", "commit_resource_allocation", "required"],
    ["SPM-RESOURCE-CAPACITY", "query_scenario_plans", "required"],
    ["SPM-RESOURCE-CAPACITY", "create_scenario_plan", "required"],
    ["SPM-RESOURCE-CAPACITY", "evaluate_scenario_plan", "required"],
    ["SPM-RESOURCE-CAPACITY", "detect_resource_allocation_conflict", "optional"],
    ["SPM-RESOURCE-CAPACITY", "match_resource_to_project_demand", "optional"],
    ["SPM-RESOURCE-CAPACITY", "query_financial_scenarios", "optional"],
    ["SPM-RESOURCE-CAPACITY", "query_workforce_scenarios", "optional"],
    ["SPM-RESOURCE-CAPACITY", "query_position_demand_forecasts", "optional"],
  ];
  const modIds = modSpecs.map(m => mid(m.domain_module_code));
  const existing = await get(`/domain_module_tools?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,tool_id`);
  const have = new Set(existing.map(r => `${r.domain_module_id}:${r.tool_id}`));
  const rows = dmt.map(([code, tname, req]) => ({ domain_module_id: mid(code), tool_id: tid(tname), requirement_level: req, notes: "" }))
    .filter(r => !have.has(`${r.domain_module_id}:${r.tool_id}`));
  if (rows.length) { log(`  inserting ${rows.length} domain_module_tools`); await insert("/domain_module_tools", rows); }
  else log("  domain_module_tools present");
}

// ============================================================
// Delete 3 stale APQC handoff_processes rows (user-approved destructive step)
// ============================================================
log("\n=== delete stale APQC tags (130,131,132) ===");
{
  const before = await get(`/handoff_processes?id=in.(130,131,132)&select=id`);
  if (before.length) { await del(`/handoff_processes?id=in.(130,131,132)`); log(`  deleted ${before.length} rows`); }
  else log("  already deleted");
}

// ============================================================
// VERIFY
// ============================================================
log("\n=== VERIFY ===");
const modIds = modSpecs.map(m => mid(m.domain_module_code));
const vCaps = await get(`/capability_domains?domain_id=eq.${DOMAIN}&select=capability_id`);
const vMods = await get(`/domain_modules?domain_id=eq.${DOMAIN}&select=id,domain_module_code`);
const vDmc = await get(`/domain_module_capabilities?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id`);
const vDmdo = await get(`/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,role`);
const vLs = await get(`/data_object_lifecycle_states?data_object_id=in.(${Object.values(M).join(",")})&select=data_object_id`);
const vRel = await get(`/data_object_relationships?or=(data_object_id.in.(${Object.values(M).join(",")}),related_data_object_id.in.(${Object.values(M).join(",")}))&select=id`);
const vDmt = await get(`/domain_module_tools?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,tool_id,tools(coverage_tier,operation_kind)`);
const vUnclassified = await get(`/data_objects?id=in.(${Object.values(M).join(",")})&entity_type=eq.unclassified&select=data_object_name`);
const vNullSrc = await get(`/handoffs?source_domain_id=eq.${DOMAIN}&source_domain_module_id=is.null&select=id,data_object_id`);

const platformTools = vDmt.filter((r: Row) => (r.tools as Row)?.coverage_tier === "platform").length;
log(`  capability_domains: ${vCaps.length}`);
log(`  domain_modules: ${vMods.length} (${vMods.map((m: Row) => m.domain_module_code).join(", ")})`);
log(`  domain_module_capabilities: ${vDmc.length}`);
log(`  domain_module_data_objects: ${vDmdo.length} (masters ${vDmdo.filter((r: Row) => r.role === "master").length}, embedded ${vDmdo.filter((r: Row) => r.role === "embedded_master").length})`);
log(`  lifecycle states on SPM masters: ${vLs.length}`);
log(`  relationships touching SPM masters: ${vRel.length}`);
log(`  domain_module_tools: ${vDmt.length} (platform-tier ${platformTools}/${vDmt.length} => strict score ${(100 * platformTools / Math.max(1, vDmt.length)).toFixed(0)}%)`);
log(`  unclassified SPM masters (want 0): ${vUnclassified.length} ${vUnclassified.map((r: Row) => r.data_object_name).join(",")}`);
log(`  outbound handoffs still NULL source module (expect 3 mis-attributed): ${vNullSrc.length} [${vNullSrc.map((r: Row) => r.id).join(",")}]`);
log("\nDONE.");
