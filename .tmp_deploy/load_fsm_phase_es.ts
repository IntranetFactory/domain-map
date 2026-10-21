#!/usr/bin/env bun
// FSM Phase E (roles, role_modules, role_permissions) + Phase S (system skills, tools, skill_tools).
// - Permissions: 3 modules x 3 baseline + workflow gates derived from lifecycle states (requires_permission=true)
// - Tools: ~20 new mutate tools + reuse existing queries
// - Skills: 3 module-level system skills; retire legacy fsm-system (id 63)
// - Roles: FIELD-SERVICE-DISPATCHER / TECHNICIAN / MANAGER (function=Customer Field Service id=71)
// Idempotent. Re-runnable.

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(body)], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius failed (${code}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
const post = (p: string, b: Row | Row[]) => call({ method: "POST", path: p, body: b });
const del = (p: string) => call({ method: "DELETE", path: p });
async function insert(p: string, rows: Row[]): Promise<Row[]> {
  if (!rows.length) return [];
  const CHUNK = 50; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(...await post(p, rows.slice(i, i + CHUNK)));
  return out;
}

const DOMAIN_MAP_MODULE_ID = 1001;
const FSM_DOMAIN_ID = 31;
const FUNC_CUSTOMER_FIELD_SERVICE = 71;

// Resolve modules + data_objects from prior phases
const modRows = await get(`/domain_modules?domain_id=eq.${FSM_DOMAIN_ID}&domain_module_code=in.(FSM-DISPATCH-OPS,FSM-INSTALLED-BASE,FSM-SERVICE-CONTRACTS)&select=id,domain_module_code`);
const moduleId = new Map<string, number>();
for (const m of modRows) moduleId.set(String(m.domain_module_code), Number(m.id));
const M_DISPATCH = moduleId.get("FSM-DISPATCH-OPS")!;
const M_INSTALLED = moduleId.get("FSM-INSTALLED-BASE")!;
const M_CONTRACTS = moduleId.get("FSM-SERVICE-CONTRACTS")!;
if (!M_DISPATCH || !M_INSTALLED || !M_CONTRACTS) throw new Error("FSM Phase A+M+B must run first");

const moduleCode: Record<number, string> = {
  [M_DISPATCH]:  "fsm-dispatch-ops",
  [M_INSTALLED]: "fsm-installed-base",
  [M_CONTRACTS]: "fsm-service-contracts",
};
const moduleDisplay: Record<number, string> = {
  [M_DISPATCH]:  "FSM-DISPATCH-OPS",
  [M_INSTALLED]: "FSM-INSTALLED-BASE",
  [M_CONTRACTS]: "FSM-SERVICE-CONTRACTS",
};

const doRows = await get(`/data_objects?data_object_name=in.(service_work_orders,field_visits,dispatch_records,service_contracts,installed_equipment,service_pm_schedules,customer_sites,customers,crm_contacts,locations,spare_parts_inventory)&select=id,data_object_name`);
const doId = new Map<string, number>();
for (const d of doRows) doId.set(String(d.data_object_name), Number(d.id));
const DO_SERVICE_WORK_ORDERS = doId.get("service_work_orders")!;
const DO_FIELD_VISITS = doId.get("field_visits")!;
const DO_DISPATCH_RECORDS = doId.get("dispatch_records")!;
const DO_SERVICE_CONTRACTS = doId.get("service_contracts")!;
const DO_INSTALLED_EQUIPMENT = doId.get("installed_equipment")!;
const DO_SERVICE_PM_SCHEDULES = doId.get("service_pm_schedules")!;
const DO_CUSTOMER_SITES = doId.get("customer_sites")!;

// ============================================================
// 1. Permissions: baseline (3 per module) + workflow gates from lifecycle states
// ============================================================
console.log("[1/8] permissions");
type PermRow = { permission_name: string; description: string; module_id: number; domain_module_id: number; tier: string };

const baselinePerms: PermRow[] = [];
for (const [midStr, code] of Object.entries(moduleCode)) {
  const mid = Number(midStr);
  baselinePerms.push(
    { permission_name: `${code}:read`,   description: `Read access to every entity in the ${moduleDisplay[mid]} module.`,                                                          module_id: DOMAIN_MAP_MODULE_ID, domain_module_id: mid, tier: "baseline-read" },
    { permission_name: `${code}:manage`, description: `Edit operational records in the ${moduleDisplay[mid]} module.`,                                                              module_id: DOMAIN_MAP_MODULE_ID, domain_module_id: mid, tier: "baseline-manage" },
    { permission_name: `${code}:admin`,  description: `Edit reference data in the ${moduleDisplay[mid]} module and inherit every workflow gate below via permission_hierarchy.`,    module_id: DOMAIN_MAP_MODULE_ID, domain_module_id: mid, tier: "baseline-admin" },
  );
}

const fsmMasters = [DO_SERVICE_WORK_ORDERS, DO_FIELD_VISITS, DO_DISPATCH_RECORDS, DO_SERVICE_CONTRACTS, DO_INSTALLED_EQUIPMENT, DO_SERVICE_PM_SCHEDULES, DO_CUSTOMER_SITES];
const lifeStates = await get(`/data_object_lifecycle_states?data_object_id=in.(${fsmMasters.join(",")})&requires_permission=eq.true&select=state_name,permission_verb_override,domain_module_id,data_object_id&order=domain_module_id.asc,state_order.asc`);

const dataObjectShortName: Record<number, string> = {
  [DO_SERVICE_WORK_ORDERS]: "service_work_order",
  [DO_FIELD_VISITS]: "field_visit",
  [DO_DISPATCH_RECORDS]: "dispatch_record",
  [DO_SERVICE_CONTRACTS]: "service_contract",
  [DO_INSTALLED_EQUIPMENT]: "installed_equipment",
  [DO_SERVICE_PM_SCHEDULES]: "service_pm_schedule",
  [DO_CUSTOMER_SITES]: "customer_site",
};

const workflowGates: PermRow[] = lifeStates.map(s => {
  const mid = Number(s.domain_module_id);
  const code = moduleCode[mid];
  const verb = (s.permission_verb_override as string) || `transition_${s.state_name}`;
  const doName = dataObjectShortName[Number(s.data_object_id)];
  return {
    permission_name: `${code}:${verb}`,
    description: `Transition \`${doName}\` into state \`${s.state_name}\`.`,
    module_id: DOMAIN_MAP_MODULE_ID,
    domain_module_id: mid,
    tier: "workflow-gate",
  };
});

const allDesiredPerms = [...baselinePerms, ...workflowGates];
const moduleIdList = [M_DISPATCH, M_INSTALLED, M_CONTRACTS].join(",");
const existingPerms = await get(`/permissions?domain_module_id=in.(${moduleIdList})&select=id,permission_name`);
const existingPermNames = new Set(existingPerms.map(p => String(p.permission_name)));
const missingPerms = allDesiredPerms.filter(p => !existingPermNames.has(p.permission_name));
if (missingPerms.length) await insert("/permissions", missingPerms);
console.log(`  ${missingPerms.length} permissions inserted (${existingPerms.length} pre-existing). target ${allDesiredPerms.length} (9 baseline + ${workflowGates.length} gates)`);

const allPerms = await get(`/permissions?domain_module_id=in.(${moduleIdList})&select=id,permission_name,tier,domain_module_id`);
const permId = new Map<string, number>();
for (const p of allPerms) permId.set(String(p.permission_name), Number(p.id));

// ============================================================
// 2. Tools (new mutates; existing queries reused)
// ============================================================
console.log("\n[2/8] tools");
type ToolRow = { tool_name: string; operation_kind: string; coverage_tier: string; data_object_id: number | null; description: string };

const desiredTools: ToolRow[] = [
  // FSM-DISPATCH-OPS mutates
  { tool_name: "create_service_work_order",    operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_SERVICE_WORK_ORDERS,  description: "Create a new service work order in `created` state." },
  { tool_name: "update_service_work_order",    operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_SERVICE_WORK_ORDERS,  description: "Update mutable fields on an existing service work order (description, parts list, scheduled time, customer notes)." },
  { tool_name: "complete_service_work_order",  operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_SERVICE_WORK_ORDERS,  description: "Transition a service work order to `completed`. Workflow gate. Triggers billing and PM cycle advancement." },
  { tool_name: "cancel_service_work_order",    operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_SERVICE_WORK_ORDERS,  description: "Transition a service work order to `cancelled`. Workflow gate." },
  { tool_name: "create_field_visit",           operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_FIELD_VISITS,         description: "Create a field-visit record for a scheduled work order." },
  { tool_name: "create_dispatch_record",       operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_DISPATCH_RECORDS,     description: "Assign a field visit to a technician via a dispatch record." },
  { tool_name: "query_crm_contacts",           operation_kind: "query",      coverage_tier: "platform", data_object_id: doId.get("crm_contacts")!, description: "Query CRM contacts (cross-domain read against the CRM master)." },
  { tool_name: "optimize_route",               operation_kind: "compute",    coverage_tier: "external", data_object_id: null,                    description: "Compute an optimized travel route across a set of scheduled field visits under technician skill, parts, SLA, and geography constraints." },
  // FSM-INSTALLED-BASE mutates
  { tool_name: "query_installed_equipment",    operation_kind: "query",      coverage_tier: "platform", data_object_id: DO_INSTALLED_EQUIPMENT,  description: "Query installed equipment units." },
  { tool_name: "create_installed_equipment",   operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_INSTALLED_EQUIPMENT,  description: "Register a new installed equipment unit (manufacturer, model, serial, location)." },
  { tool_name: "update_installed_equipment",   operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_INSTALLED_EQUIPMENT,  description: "Update mutable fields on an installed equipment unit (warranty, location, status)." },
  { tool_name: "activate_equipment",           operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_INSTALLED_EQUIPMENT,  description: "Transition equipment from `pending_install` to `active`. Workflow gate. Starts PM scheduling and contract coverage." },
  { tool_name: "mark_out_of_service",          operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_INSTALLED_EQUIPMENT,  description: "Transition equipment to `out_of_service`. Workflow gate. Pauses PM cycles." },
  { tool_name: "decommission_equipment",       operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_INSTALLED_EQUIPMENT,  description: "Transition equipment to `decommissioned`. Workflow gate. Terminates coverage and PM." },
  { tool_name: "replace_equipment",            operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_INSTALLED_EQUIPMENT,  description: "Transition equipment to `replaced`. Workflow gate. Forwards warranty and contract coverage to the replacement record." },
  { tool_name: "query_service_pm_schedules",   operation_kind: "query",      coverage_tier: "platform", data_object_id: DO_SERVICE_PM_SCHEDULES, description: "Query service PM schedules." },
  { tool_name: "create_service_pm_schedule",   operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_SERVICE_PM_SCHEDULES, description: "Create a recurring PM schedule for an installed equipment unit." },
  { tool_name: "complete_pm",                  operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_SERVICE_PM_SCHEDULES, description: "Mark a PM cycle `completed`. Workflow gate. Triggers next-cycle scheduling." },
  { tool_name: "skip_pm",                      operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_SERVICE_PM_SCHEDULES, description: "Mark a PM cycle `skipped`. Workflow gate." },
  { tool_name: "escalate_overdue",             operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_SERVICE_PM_SCHEDULES, description: "Transition a PM cycle from `in_grace` to `overdue`. Workflow gate. Sends escalation to account manager." },
  { tool_name: "query_customer_sites",         operation_kind: "query",      coverage_tier: "platform", data_object_id: DO_CUSTOMER_SITES,       description: "Query customer service sites." },
  { tool_name: "create_customer_site",         operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_CUSTOMER_SITES,       description: "Create a customer service site." },
  { tool_name: "terminate_site",               operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_CUSTOMER_SITES,       description: "Transition a customer site to `terminated`. Workflow gate. Cascades termination to PM schedules and contracts at the site." },
  // FSM-SERVICE-CONTRACTS mutates
  { tool_name: "create_service_contract",      operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_SERVICE_CONTRACTS,    description: "Create a new service contract in `draft` state." },
  { tool_name: "update_service_contract",      operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_SERVICE_CONTRACTS,    description: "Update mutable fields on a service contract (SLA terms, covered equipment, renewal cadence)." },
  { tool_name: "activate_service_contract",    operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_SERVICE_CONTRACTS,    description: "Transition a service contract from `draft` to `active`. Workflow gate. Activates SLA enforcement." },
];

const existingTools = await get(`/tools?tool_name=in.(${desiredTools.map(t => t.tool_name).join(",")})&select=id,tool_name`);
const existingToolNames = new Set(existingTools.map(t => String(t.tool_name)));
const missingTools = desiredTools.filter(t => !existingToolNames.has(t.tool_name));
if (missingTools.length) await insert("/tools", missingTools);
console.log(`  ${missingTools.length} tools inserted (${existingTools.length} pre-existing). target ${desiredTools.length}.`);

// Resolve every tool id needed for skill_tools
const skillToolNamesNeeded = [
  ...desiredTools.map(t => t.tool_name),
  // existing reused
  "query_service_work_orders", "query_field_visits", "query_dispatch_records",
  "query_service_contracts", "query_customers", "query_locations", "query_spare_parts_inventory",
  "notify_person", "create_calendar_event",
];
const allToolRows = await get(`/tools?tool_name=in.(${skillToolNamesNeeded.join(",")})&select=id,tool_name,coverage_tier`);
const toolId = new Map<string, number>();
const toolTier = new Map<string, string>();
for (const t of allToolRows) {
  toolId.set(String(t.tool_name), Number(t.id));
  toolTier.set(String(t.tool_name), String(t.coverage_tier));
}

// ============================================================
// 3. Retire legacy fsm-system skill (id 63)
// ============================================================
console.log("\n[3/8] retire legacy fsm-system skill");
const legacy = await get(`/skills?id=eq.63&select=id,skill_name`);
if (legacy.length > 0) {
  await del(`/skill_tools?skill_id=eq.63`);
  await del(`/skills?id=eq.63`);
  console.log("  deleted legacy skill #63 + its skill_tools");
} else {
  console.log("  legacy already absent");
}

// ============================================================
// 4. System skills (one per module, Rule #17)
// ============================================================
console.log("\n[4/8] system skills");
type SkillRow = { skill_name: string; skill_type: string; domain_module_id: number; domain_id: number; description: string };
const skillRows: SkillRow[] = [
  { skill_name: "fsm_dispatch_ops_agent",      skill_type: "system", domain_module_id: M_DISPATCH,  domain_id: FSM_DOMAIN_ID, description: "Operates the field-service dispatch workflow: receives service requests, creates work orders, assigns technicians via dispatch records, generates field visits, optimizes routes, and closes the loop on completion. Lives where the dispatcher and field technicians both work." },
  { skill_name: "fsm_installed_base_agent",    skill_type: "system", domain_module_id: M_INSTALLED, domain_id: FSM_DOMAIN_ID, description: "Manages the installed-equipment asset register and its preventive maintenance cadence. Tracks equipment from pending install through decommission, generates due / overdue PM events, and handles customer-site setup." },
  { skill_name: "fsm_service_contracts_agent", skill_type: "system", domain_module_id: M_CONTRACTS, domain_id: FSM_DOMAIN_ID, description: "Manages recurring service agreements covering customer equipment. Drafts, activates, renews, and terminates contracts; communicates SLA entitlement signals to dispatch ops." },
];
const existingSkills = await get(`/skills?domain_module_id=in.(${moduleIdList})&skill_type=eq.system&select=id,domain_module_id`);
const existingSkillModules = new Set(existingSkills.map(s => Number(s.domain_module_id)));
const missingSkills = skillRows.filter(s => !existingSkillModules.has(s.domain_module_id));
if (missingSkills.length) await insert("/skills", missingSkills);
console.log(`  ${missingSkills.length} skills inserted (${existingSkills.length} pre-existing)`);

const allSkillRows = await get(`/skills?domain_module_id=in.(${moduleIdList})&skill_type=eq.system&select=id,domain_module_id`);
const skillId = new Map<number, number>();
for (const s of allSkillRows) skillId.set(Number(s.domain_module_id), Number(s.id));

// ============================================================
// 5. skill_tools
// ============================================================
console.log("\n[5/8] skill_tools");
type ST = { skill_id: number; tool_id: number; requirement_level: "required" | "optional" };
function st(sid: number, toolName: string, level: "required" | "optional"): ST {
  const tid = toolId.get(toolName);
  if (!tid) throw new Error(`unresolved tool: ${toolName}`);
  return { skill_id: sid, tool_id: tid, requirement_level: level };
}

const stRows: ST[] = [
  // FSM-DISPATCH-OPS (15 required + 2 optional)
  st(skillId.get(M_DISPATCH)!, "query_service_work_orders",   "required"),
  st(skillId.get(M_DISPATCH)!, "query_field_visits",          "required"),
  st(skillId.get(M_DISPATCH)!, "query_dispatch_records",      "required"),
  st(skillId.get(M_DISPATCH)!, "query_customers",             "required"),
  st(skillId.get(M_DISPATCH)!, "query_crm_contacts",          "required"),
  st(skillId.get(M_DISPATCH)!, "query_locations",             "required"),
  st(skillId.get(M_DISPATCH)!, "query_spare_parts_inventory", "required"),
  st(skillId.get(M_DISPATCH)!, "query_installed_equipment",   "required"),
  st(skillId.get(M_DISPATCH)!, "query_customer_sites",        "required"),
  st(skillId.get(M_DISPATCH)!, "create_service_work_order",   "required"),
  st(skillId.get(M_DISPATCH)!, "update_service_work_order",   "required"),
  st(skillId.get(M_DISPATCH)!, "complete_service_work_order", "required"),
  st(skillId.get(M_DISPATCH)!, "cancel_service_work_order",   "required"),
  st(skillId.get(M_DISPATCH)!, "create_dispatch_record",      "required"),
  st(skillId.get(M_DISPATCH)!, "create_field_visit",          "required"),
  st(skillId.get(M_DISPATCH)!, "notify_person",               "required"),
  st(skillId.get(M_DISPATCH)!, "optimize_route",              "optional"),
  st(skillId.get(M_DISPATCH)!, "create_calendar_event",       "optional"),
  // FSM-INSTALLED-BASE (11 required)
  st(skillId.get(M_INSTALLED)!, "query_installed_equipment",  "required"),
  st(skillId.get(M_INSTALLED)!, "query_service_pm_schedules", "required"),
  st(skillId.get(M_INSTALLED)!, "query_customer_sites",       "required"),
  st(skillId.get(M_INSTALLED)!, "query_customers",            "required"),
  st(skillId.get(M_INSTALLED)!, "query_locations",            "required"),
  st(skillId.get(M_INSTALLED)!, "create_installed_equipment", "required"),
  st(skillId.get(M_INSTALLED)!, "update_installed_equipment", "required"),
  st(skillId.get(M_INSTALLED)!, "decommission_equipment",     "required"),
  st(skillId.get(M_INSTALLED)!, "create_service_pm_schedule", "required"),
  st(skillId.get(M_INSTALLED)!, "complete_pm",                "required"),
  st(skillId.get(M_INSTALLED)!, "notify_person",              "required"),
  // FSM-SERVICE-CONTRACTS (7 required)
  st(skillId.get(M_CONTRACTS)!, "query_service_contracts",    "required"),
  st(skillId.get(M_CONTRACTS)!, "query_customers",            "required"),
  st(skillId.get(M_CONTRACTS)!, "query_installed_equipment",  "required"),
  st(skillId.get(M_CONTRACTS)!, "create_service_contract",    "required"),
  st(skillId.get(M_CONTRACTS)!, "update_service_contract",    "required"),
  st(skillId.get(M_CONTRACTS)!, "activate_service_contract",  "required"),
  st(skillId.get(M_CONTRACTS)!, "notify_person",              "required"),
];

const allSkillIds = [...skillId.values()].join(",");
const existingSt = await get(`/skill_tools?skill_id=in.(${allSkillIds})&select=skill_id,tool_id`);
const stKey = (r: Row) => `${r.skill_id}|${r.tool_id}`;
const existingStKeys = new Set(existingSt.map(stKey));
const missingSt = stRows.filter(r => !existingStKeys.has(stKey(r)));
if (missingSt.length) await insert("/skill_tools", missingSt);
console.log(`  ${missingSt.length} skill_tools inserted (${existingSt.length} pre-existing). target ${stRows.length}.`);

// ============================================================
// 6. Roles
// ============================================================
console.log("\n[6/8] roles");
type RoleRow = { role_code: string; role_name: string; slug: string; description: string; business_function_id: number };
const roleRows: RoleRow[] = [
  {
    role_code: "FIELD-SERVICE-DISPATCHER",
    role_name: "Field Service Dispatcher",
    slug: "field_service_dispatcher",
    description: "Receives service requests, assigns technicians, optimizes the daily route. Primary on dispatch ops; secondary read on installed base and service contracts to confirm coverage and equipment history before assigning.",
    business_function_id: FUNC_CUSTOMER_FIELD_SERVICE,
  },
  {
    role_code: "FIELD-SERVICE-TECHNICIAN",
    role_name: "Field Service Technician",
    slug: "field_service_technician",
    description: "Performs service in the field. Receives assignments via dispatch records, executes work orders, captures time and materials, closes visits. Read access on installed base to look up equipment history; specific gates to complete work orders and PM cycles.",
    business_function_id: FUNC_CUSTOMER_FIELD_SERVICE,
  },
  {
    role_code: "FIELD-SERVICE-MANAGER",
    role_name: "Field Service Manager",
    slug: "field_service_manager",
    description: "Runs the service organization. Admin on all three modules: dispatch operations, installed base / PM, service contracts. Approves contract activation, decommissioning, and customer-site changes.",
    business_function_id: FUNC_CUSTOMER_FIELD_SERVICE,
  },
];
const existingRoles = await get(`/roles?role_code=in.(${roleRows.map(r => r.role_code).join(",")})&select=id,role_code`);
const existingRoleCodes = new Set(existingRoles.map(r => String(r.role_code)));
const missingRoles = roleRows.filter(r => !existingRoleCodes.has(r.role_code));
if (missingRoles.length) await insert("/roles", missingRoles);
console.log(`  ${missingRoles.length} roles inserted (${existingRoles.length} pre-existing)`);

const allRoles = await get(`/roles?role_code=in.(${roleRows.map(r => r.role_code).join(",")})&select=id,role_code`);
const roleId = new Map<string, number>();
for (const r of allRoles) roleId.set(String(r.role_code), Number(r.id));

// ============================================================
// 7. role_modules
// ============================================================
console.log("\n[7/8] role_modules");
type RM = { role_id: number; domain_module_id: number; interaction_level: "primary" | "secondary" };
const rmRows: RM[] = [
  // Dispatcher: primary on DISPATCH; secondary on INSTALLED + CONTRACTS
  { role_id: roleId.get("FIELD-SERVICE-DISPATCHER")!, domain_module_id: M_DISPATCH,  interaction_level: "primary" },
  { role_id: roleId.get("FIELD-SERVICE-DISPATCHER")!, domain_module_id: M_INSTALLED, interaction_level: "secondary" },
  { role_id: roleId.get("FIELD-SERVICE-DISPATCHER")!, domain_module_id: M_CONTRACTS, interaction_level: "secondary" },
  // Technician: primary on DISPATCH; secondary on INSTALLED
  { role_id: roleId.get("FIELD-SERVICE-TECHNICIAN")!, domain_module_id: M_DISPATCH,  interaction_level: "primary" },
  { role_id: roleId.get("FIELD-SERVICE-TECHNICIAN")!, domain_module_id: M_INSTALLED, interaction_level: "secondary" },
  // Manager: primary across all
  { role_id: roleId.get("FIELD-SERVICE-MANAGER")!,    domain_module_id: M_DISPATCH,  interaction_level: "primary" },
  { role_id: roleId.get("FIELD-SERVICE-MANAGER")!,    domain_module_id: M_INSTALLED, interaction_level: "primary" },
  { role_id: roleId.get("FIELD-SERVICE-MANAGER")!,    domain_module_id: M_CONTRACTS, interaction_level: "primary" },
];
const existingRm = await get(`/role_modules?role_id=in.(${[...roleId.values()].join(",")})&select=role_id,domain_module_id`);
const rmKey = (r: Row) => `${r.role_id}|${r.domain_module_id}`;
const existingRmKeys = new Set(existingRm.map(rmKey));
const missingRm = rmRows.filter(r => !existingRmKeys.has(rmKey(r)));
if (missingRm.length) await insert("/role_modules", missingRm);
console.log(`  ${missingRm.length} role_modules inserted (${existingRm.length} pre-existing)`);

// ============================================================
// 8. role_permissions
// ============================================================
console.log("\n[8/8] role_permissions");
type RP = { role_id: number; permission_id: number };
function rp(roleCode: string, permName: string): RP {
  const rid = roleId.get(roleCode);
  const pid = permId.get(permName);
  if (!rid || !pid) throw new Error(`unresolved role/perm: ${roleCode}/${permName}`);
  return { role_id: rid, permission_id: pid };
}

const rpRows: RP[] = [
  // Dispatcher
  rp("FIELD-SERVICE-DISPATCHER", "fsm-dispatch-ops:manage"),
  rp("FIELD-SERVICE-DISPATCHER", "fsm-installed-base:read"),
  rp("FIELD-SERVICE-DISPATCHER", "fsm-service-contracts:read"),
  // Technician
  rp("FIELD-SERVICE-TECHNICIAN", "fsm-dispatch-ops:read"),
  rp("FIELD-SERVICE-TECHNICIAN", "fsm-dispatch-ops:complete_service_work_order"),
  rp("FIELD-SERVICE-TECHNICIAN", "fsm-installed-base:read"),
  rp("FIELD-SERVICE-TECHNICIAN", "fsm-installed-base:complete_pm"),
  // Manager
  rp("FIELD-SERVICE-MANAGER",    "fsm-dispatch-ops:admin"),
  rp("FIELD-SERVICE-MANAGER",    "fsm-installed-base:admin"),
  rp("FIELD-SERVICE-MANAGER",    "fsm-service-contracts:admin"),
];

const existingRp = await get(`/role_permissions?role_id=in.(${[...roleId.values()].join(",")})&select=role_id,permission_id`);
const rpKey = (r: Row) => `${r.role_id}|${r.permission_id}`;
const existingRpKeys = new Set(existingRp.map(rpKey));
const missingRp = rpRows.filter(r => !existingRpKeys.has(rpKey(r)));
if (missingRp.length) await insert("/role_permissions", missingRp);
console.log(`  ${missingRp.length} role_permissions inserted (${existingRp.length} pre-existing)`);

// ============================================================
// Coverage rollup
// ============================================================
console.log("\n--- Semantius coverage ---");
type STSum = { skill_id: number; tool_id: number; requirement_level: string; tool_name: string; coverage_tier: string };
const skillToolDetail: STSum[] = [];
for (const r of stRows) {
  const toolName = [...toolId.entries()].find(([_, id]) => id === r.tool_id)?.[0] ?? "?";
  const tier = toolTier.get(toolName) ?? "?";
  skillToolDetail.push({ skill_id: r.skill_id, tool_id: r.tool_id, requirement_level: r.requirement_level, tool_name: toolName, coverage_tier: tier });
}

for (const [moduleCodeKey, sid] of [["FSM-DISPATCH-OPS", skillId.get(M_DISPATCH)!], ["FSM-INSTALLED-BASE", skillId.get(M_INSTALLED)!], ["FSM-SERVICE-CONTRACTS", skillId.get(M_CONTRACTS)!]] as const) {
  const linked = skillToolDetail.filter(r => r.skill_id === sid);
  const total = linked.length;
  const platform = linked.filter(r => r.coverage_tier === "platform").length;
  const platformOrIntegration = linked.filter(r => r.coverage_tier === "platform" || r.coverage_tier === "integration").length;
  const strict = total === 0 ? 0 : Math.round((platform / total) * 100);
  const op = total === 0 ? 0 : Math.round((platformOrIntegration / total) * 100);
  const externals = linked.filter(r => r.coverage_tier === "external").map(r => r.tool_name);
  console.log(`  ${moduleCodeKey}: tools=${total}, platform=${platform} (strict=${strict}%), platform+integration=${platformOrIntegration} (operational=${op}%)${externals.length ? `, externals: ${externals.join(", ")}` : ""}`);
}

console.log("\nPhase E + S complete. UI:");
console.log("  https://tests.semantius.app/domain_map/permissions");
console.log("  https://tests.semantius.app/domain_map/skills");
console.log("  https://tests.semantius.app/domain_map/skill_tools");
console.log("  https://tests.semantius.app/domain_map/roles");
