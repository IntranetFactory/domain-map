#!/usr/bin/env bun
// MRM — Phase C (business_function_domains), Phase S (system skill + tools + domain_module_tools),
// Phase E (domain_roles + role_modules + process_raci, gates wired to real PCF nodes).
// Idempotent. record_status omitted. notes "".

import { $ } from "bun";
$.throws(false);
type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim(); return text ? JSON.parse(text) : [];
}
async function get(path: string): Promise<Row[]> { return call({ method: "GET", path }); }
function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>(); for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => { const out: Row = {}; for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null; return out; });
}
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const out: Row[] = []; const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) out.push(...await call({ method: "POST", path, body: uniformize(rows.slice(i, i + CHUNK)) }));
  return out;
}
async function patch(path: string, body: Row): Promise<void> { await call({ method: "PATCH", path, body }); }

// resolved ids
const MRM = 173, MOD_PLANNING = 350, MOD_BUDGET = 351;
const FN_MARKETING = 22, FN_FINANCE = 4;
const DO = { marketing_plans: 1066, marketing_plan_lines: 1067, marketing_calendars: 1068, marketing_budgets: 1069,
  marketing_budget_allocations: 1070, marketing_spend_records: 1071, marketing_performance_metrics: 1072 };
const NOTIFY_PERSON = 913, NOTIFY_TEAM = 914;
// PCF process ids
const PCF = { plans: 23 /*3.3*/, budgets: 134 /*3.3.2*/, allocation: 647 /*3.3.2.3*/, roi: 648 /*3.3.2.4*/, calendar: 698 /*3.4.2.10*/ };

async function main() {
  // ============================================================
  // PHASE C — business_function_domains
  // ============================================================
  console.log("=== Phase C: business_function_domains ===");
  const bfRows = [
    { business_function_id: FN_MARKETING, domain_id: MRM, responsibility_type: "owner", notes: "" },
    { business_function_id: FN_FINANCE, domain_id: MRM, responsibility_type: "contributor", notes: "" },
  ];
  const existingBF = await get(`/business_function_domains?domain_id=eq.${MRM}&select=business_function_id,responsibility_type`);
  const bfSet = new Set(existingBF.map(r => `${r.business_function_id}:${r.responsibility_type}`));
  const bfNew = bfRows.filter(r => !bfSet.has(`${r.business_function_id}:${r.responsibility_type}`));
  if (bfNew.length) await insert("/business_function_domains", bfNew);
  console.log(`  business_function_domains: inserted ${bfNew.length}`);

  // ============================================================
  // PHASE E (gates first) — wire lifecycle_states.process_id to PCF nodes
  // ============================================================
  console.log("\n=== Phase E: wire lifecycle gate process_id ===");
  const gateWiring: { do: number; state: string; process_id: number }[] = [
    { do: DO.marketing_plans, state: "approved", process_id: PCF.plans },
    { do: DO.marketing_budgets, state: "approved", process_id: PCF.budgets },
    { do: DO.marketing_budget_allocations, state: "approved", process_id: PCF.allocation },
    { do: DO.marketing_spend_records, state: "reconciled", process_id: PCF.budgets },
  ];
  for (const g of gateWiring) {
    await patch(`/data_object_lifecycle_states?data_object_id=eq.${g.do}&state_name=eq.${g.state}&requires_permission=eq.true`, { process_id: g.process_id });
  }
  console.log(`  wired ${gateWiring.length} gates to PCF process_id`);

  // ============================================================
  // PHASE S — system skill + tools + domain_module_tools
  // ============================================================
  console.log("\n=== Phase S: skills (system) ===");
  const existingSkill = await get(`/skills?domain_id=eq.${MRM}&skill_type=eq.system&domain_module_id=is.null&select=id,skill_name`);
  let skillId: number;
  if (existingSkill.length) { skillId = Number(existingSkill[0].id); console.log(`  mrm-system already present (id ${skillId})`); }
  else {
    const res = await insert("/skills", [{ skill_name: "mrm-system", skill_type: "system", domain_id: MRM,
      description: "System agent surface for Marketing Resource Management. Reasons across the marketing plan hierarchy, budget allocation, and spend-to-plan reconciliation: queries plans, plan lines, budgets, allocations, spend, calendars, and performance metrics; creates and updates them; drives the approval gates on plans, budgets, allocations, and spend reconciliation; and notifies plan owners and budget approvers. Derives its toolset from the domain modules' domain_module_tools." }]);
    skillId = Number(res[0].id); console.log(`  inserted mrm-system (id ${skillId})`);
  }

  console.log("\n=== Phase S: tools ===");
  type ToolDef = { name: string; op: string; do?: number; coverage: string; desc: string };
  const tools: ToolDef[] = [
    // query (platform)
    { name: "query_marketing_plans", op: "query", do: DO.marketing_plans, coverage: "platform", desc: "Read marketing plans and their plan lines, status, owner, and period." },
    { name: "query_marketing_budgets", op: "query", do: DO.marketing_budgets, coverage: "platform", desc: "Read marketing budgets, their pools, and approval status." },
    { name: "query_marketing_budget_allocations", op: "query", do: DO.marketing_budget_allocations, coverage: "platform", desc: "Read budget allocations to plan lines, campaigns, and channels with remaining-budget rollups." },
    { name: "query_marketing_spend_records", op: "query", do: DO.marketing_spend_records, coverage: "platform", desc: "Read committed and actual marketing spend reconciled to allocations and plan lines." },
    { name: "query_marketing_calendars", op: "query", do: DO.marketing_calendars, coverage: "platform", desc: "Read the marketing calendar and the plan lines laid out on it." },
    { name: "query_marketing_performance_metrics", op: "query", do: DO.marketing_performance_metrics, coverage: "platform", desc: "Read plan-level performance and marketing-ROI metrics." },
    // mutate (platform)
    { name: "create_marketing_plan", op: "mutate", do: DO.marketing_plans, coverage: "platform", desc: "Create or update a marketing plan and its plan lines." },
    { name: "create_marketing_budget", op: "mutate", do: DO.marketing_budgets, coverage: "platform", desc: "Create or update a marketing budget pool." },
    { name: "allocate_marketing_budget", op: "mutate", do: DO.marketing_budget_allocations, coverage: "platform", desc: "Allocate budget top-down from a budget to a plan line, campaign, or channel." },
    { name: "record_marketing_spend", op: "mutate", do: DO.marketing_spend_records, coverage: "platform", desc: "Capture a committed or actual spend record and attribute it to an allocation and plan line." },
    { name: "reconcile_marketing_spend", op: "mutate", do: DO.marketing_spend_records, coverage: "platform", desc: "Reconcile a spend record against its allocation, updating remaining budget and plan-to-actual variance (the spend reconcile gate)." },
    { name: "schedule_marketing_plan_line", op: "mutate", do: DO.marketing_calendars, coverage: "platform", desc: "Place a plan line on the marketing calendar." },
    // notifications (abstractions)
    { name: "notify_person", op: "side_effect", coverage: "platform", desc: "Notify a single recipient (plan owner, budget approver) via whichever channel the deployment wires up." },
    { name: "notify_team", op: "side_effect", coverage: "external", desc: "Broadcast to a marketing team (budget overrun, plan approved) via whichever channel the deployment wires up." },
  ];
  // reuse existing tools by name (catalog-wide); notify_person/team already exist
  const allToolNames = tools.map(t => t.name);
  const existingTools = await get(`/tools?tool_name=in.(${allToolNames.join(",")})&select=id,tool_name`);
  const toolMap = new Map<string, number>(); for (const r of existingTools) toolMap.set(String(r.tool_name), Number(r.id));
  const newTools = tools.filter(t => !toolMap.has(t.name)).map(t => ({ tool_name: t.name, operation_kind: t.op,
    data_object_id: t.do ?? null, coverage_tier: t.coverage, description: t.desc }));
  if (newTools.length) await insert("/tools", newTools);
  const allTools = await get(`/tools?tool_name=in.(${allToolNames.join(",")})&select=id,tool_name`);
  toolMap.clear(); for (const r of allTools) toolMap.set(String(r.tool_name), Number(r.id));
  // ensure notify ids resolved
  toolMap.set("notify_person", NOTIFY_PERSON); toolMap.set("notify_team", NOTIFY_TEAM);
  console.log(`  tools: ${toolMap.size} resolved (inserted ${newTools.length})`);

  console.log("\n=== Phase S: domain_module_tools ===");
  // map each tool to its realizing module; required = workflow-critical, optional = degraded/notify
  type DMTDef = { tool: string; module: number; req: "required" | "optional" };
  const dmt: DMTDef[] = [
    // planning module
    { tool: "query_marketing_plans", module: MOD_PLANNING, req: "required" },
    { tool: "create_marketing_plan", module: MOD_PLANNING, req: "required" },
    { tool: "query_marketing_calendars", module: MOD_PLANNING, req: "required" },
    { tool: "schedule_marketing_plan_line", module: MOD_PLANNING, req: "required" },
    { tool: "notify_person", module: MOD_PLANNING, req: "optional" },
    { tool: "notify_team", module: MOD_PLANNING, req: "optional" },
    // budget module
    { tool: "query_marketing_budgets", module: MOD_BUDGET, req: "required" },
    { tool: "create_marketing_budget", module: MOD_BUDGET, req: "required" },
    { tool: "query_marketing_budget_allocations", module: MOD_BUDGET, req: "required" },
    { tool: "allocate_marketing_budget", module: MOD_BUDGET, req: "required" },
    { tool: "query_marketing_spend_records", module: MOD_BUDGET, req: "required" },
    { tool: "record_marketing_spend", module: MOD_BUDGET, req: "required" },
    { tool: "reconcile_marketing_spend", module: MOD_BUDGET, req: "required" },
    { tool: "query_marketing_performance_metrics", module: MOD_BUDGET, req: "optional" },
    { tool: "notify_person", module: MOD_BUDGET, req: "optional" },
    { tool: "notify_team", module: MOD_BUDGET, req: "optional" },
  ];
  const existingDMT = await get(`/domain_module_tools?domain_module_id=in.(${MOD_PLANNING},${MOD_BUDGET})&select=domain_module_id,tool_id`);
  const dmtSet = new Set(existingDMT.map(r => `${r.domain_module_id}:${r.tool_id}`));
  const dmtRows: Row[] = [];
  for (const d of dmt) {
    const tid = toolMap.get(d.tool); if (!tid) throw new Error(`tool not resolved: ${d.tool}`);
    if (!dmtSet.has(`${d.module}:${tid}`)) dmtRows.push({ domain_module_id: d.module, tool_id: tid, requirement_level: d.req, notes: "" });
  }
  if (dmtRows.length) await insert("/domain_module_tools", dmtRows);
  console.log(`  domain_module_tools: inserted ${dmtRows.length}`);

  // ============================================================
  // PHASE E — personas + role_modules + process_raci
  // ============================================================
  console.log("\n=== Phase E: domain_roles ===");
  type RoleDef = { code: string; name: string; bf: number | null; desc: string;
    reach: { module: number; level: "primary" | "secondary" }[] };
  const roles: RoleDef[] = [
    { code: "MARKETING-MARKETING-OPS-MANAGER", name: "Marketing Operations Manager", bf: FN_MARKETING,
      desc: "Owns the end-to-end marketing planning and budget process: builds and approves plans, sets budgets, oversees allocation and spend-to-plan reconciliation, and reports plan-level performance.",
      reach: [{ module: MOD_PLANNING, level: "primary" }, { module: MOD_BUDGET, level: "primary" }] },
    { code: "MARKETING-MARKETING-PLANNER", name: "Marketing Planner", bf: FN_MARKETING,
      desc: "Authors marketing plans and plan lines, maintains the marketing calendar, and works with budget owners to align plan lines to allocated budget.",
      reach: [{ module: MOD_PLANNING, level: "primary" }, { module: MOD_BUDGET, level: "secondary" }] },
    { code: "MARKETING-BUDGET-OWNER", name: "Marketing Budget Owner", bf: null,
      desc: "Cross-functional owner of marketing budget governance: approves budgets and allocations, monitors spend against plan, and reconciles committed and actual spend. Often sits in or partners with Finance.",
      reach: [{ module: MOD_BUDGET, level: "primary" }, { module: MOD_PLANNING, level: "secondary" }] },
  ];
  const existingRoles = await get(`/domain_roles?role_code=in.(${roles.map(r => r.code).join(",")})&select=id,role_code`);
  const roleMap = new Map<string, number>(); for (const r of existingRoles) roleMap.set(String(r.role_code), Number(r.id));
  const newRoles = roles.filter(r => !roleMap.has(r.code)).map(r => ({ role_code: r.code, role_name: r.name, description: r.desc, business_function_id: r.bf }));
  if (newRoles.length) await insert("/domain_roles", newRoles);
  const allRoles = await get(`/domain_roles?role_code=in.(${roles.map(r => r.code).join(",")})&select=id,role_code`);
  roleMap.clear(); for (const r of allRoles) roleMap.set(String(r.role_code), Number(r.id));
  console.log(`  domain_roles: ${roleMap.size} resolved (inserted ${newRoles.length})`);

  console.log("\n=== Phase E: role_modules ===");
  const existingRM = await get(`/role_modules?role_id=in.(${[...roleMap.values()].join(",")})&select=role_id,domain_module_id`);
  const rmSet = new Set(existingRM.map(r => `${r.role_id}:${r.domain_module_id}`));
  const rmRows: Row[] = [];
  for (const r of roles) {
    const rid = roleMap.get(r.code)!;
    for (const reach of r.reach) if (!rmSet.has(`${rid}:${reach.module}`)) rmRows.push({ role_id: rid, domain_module_id: reach.module, interaction_level: reach.level, notes: "" });
  }
  if (rmRows.length) await insert("/role_modules", rmRows);
  console.log(`  role_modules: inserted ${rmRows.length}`);

  console.log("\n=== Phase E: process_raci ===");
  // Each gated PCF process gets R + A from the owner persona pool.
  type RaciDef = { process_id: number; raci: string; role: string; blocking?: boolean };
  const OPS = "MARKETING-MARKETING-OPS-MANAGER", PLANNER = "MARKETING-MARKETING-PLANNER", BUDGET = "MARKETING-BUDGET-OWNER";
  const raci: RaciDef[] = [
    // 3.3 Develop and manage marketing plans
    { process_id: PCF.plans, raci: "responsible", role: PLANNER },
    { process_id: PCF.plans, raci: "accountable", role: OPS },
    { process_id: PCF.plans, raci: "consulted", role: BUDGET, blocking: true },
    // 3.3.2 Establish marketing budgets (also spend reconcile gate)
    { process_id: PCF.budgets, raci: "responsible", role: BUDGET },
    { process_id: PCF.budgets, raci: "accountable", role: OPS },
    { process_id: PCF.budgets, raci: "informed", role: PLANNER },
    // 3.3.2.3 Create marketing budget allocation
    { process_id: PCF.allocation, raci: "responsible", role: BUDGET },
    { process_id: PCF.allocation, raci: "accountable", role: OPS },
    { process_id: PCF.allocation, raci: "consulted", role: PLANNER, blocking: false },
  ];
  const existingRaci = await get(`/process_raci?process_id=in.(${[...new Set(raci.map(r => r.process_id))].join(",")})&select=process_id,raci,actor_role_id`);
  const raciSet = new Set(existingRaci.map(r => `${r.process_id}:${r.raci}:${r.actor_role_id}`));
  const raciRows: Row[] = [];
  for (const r of raci) {
    const rid = roleMap.get(r.role)!;
    if (!raciSet.has(`${r.process_id}:${r.raci}:${rid}`)) raciRows.push({ process_id: r.process_id, actor_role_id: rid, raci: r.raci, consultation_blocking: r.blocking ?? false });
  }
  if (raciRows.length) await insert("/process_raci", raciRows);
  console.log(`  process_raci: inserted ${raciRows.length}`);

  // ---- verification ----
  console.log("\n=== Phase C/S/E verification ===");
  const v = {
    business_function_domains: (await get(`/business_function_domains?domain_id=eq.${MRM}&select=responsibility_type`)).length,
    system_skill: (await get(`/skills?domain_id=eq.${MRM}&skill_type=eq.system&domain_module_id=is.null&select=id`)).length,
    domain_module_tools: (await get(`/domain_module_tools?domain_module_id=in.(${MOD_PLANNING},${MOD_BUDGET})&select=tool_id`)).length,
    domain_roles: (await get(`/domain_roles?role_code=in.(${roles.map(r => r.code).join(",")})&select=id`)).length,
    role_modules: (await get(`/role_modules?role_id=in.(${[...roleMap.values()].join(",")})&select=role_id`)).length,
    process_raci: (await get(`/process_raci?process_id=in.(${[...new Set(raci.map(r => r.process_id))].join(",")})&select=process_id`)).length,
    gated_states_with_process: (await get(`/data_object_lifecycle_states?data_object_id=in.(${Object.values(DO).join(",")})&requires_permission=eq.true&process_id=not.is.null&select=state_name`)).length,
  };
  console.log(JSON.stringify(v, null, 2));
}
await main();
console.log("Phase C/S/E done.");
