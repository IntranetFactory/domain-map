#!/usr/bin/env bun
// FSM Phase A + Phase M.
// - 6 new capabilities + capability_domains links (existing WORKFORCE-SCHEDULING already linked)
// - 3 new modules (FSM-DISPATCH-OPS, FSM-INSTALLED-BASE, FSM-SERVICE-CONTRACTS)
// - domain_module_capabilities
// - domain_module_data_objects (master rows for existing FSM masters + cross-module embedded_master/consumer rows)
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
async function insert(p: string, rows: Row[]): Promise<Row[]> {
  if (!rows.length) return [];
  const CHUNK = 50; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(...await post(p, rows.slice(i, i + CHUNK)));
  return out;
}

const FSM_DOMAIN_ID = 31;

// Existing FSM masters
const DO_SERVICE_WORK_ORDERS = 740;
const DO_FIELD_VISITS = 261;
const DO_DISPATCH_RECORDS = 262;
const DO_SERVICE_CONTRACTS = 741;
// Cross-domain references for embedded_master / consumer rows
const DO_CUSTOMERS = 97;
const DO_CRM_CONTACTS = 98;
const DO_LOCATIONS = 795;
const DO_SPARE_PARTS_INVENTORY = 698;
const DO_USERS = 748;

// ============================================================
// 1. capabilities
// ============================================================
console.log("[1/4] capabilities");
const capDefs = [
  { capability_code: "FSM-DISPATCH-OPT",         capability_name: "Dispatch and Routing Optimization",        description: "Real-time assignment of work orders to technicians under skill, parts, SLA, geography, and travel-time constraints. Optimizer rebuilds the day's route plan on every dispatch change." },
  { capability_code: "FSM-MOBILE-TECH",          capability_name: "Mobile Technician Enablement",             description: "Offline-tolerant mobile experience for field technicians: route view, work-order detail, parts lookup, time and material capture, customer signature, and photo upload. Reconciles when reconnected." },
  { capability_code: "FSM-PARTS-LOGISTICS",      capability_name: "Field Parts and Truck Stock Management",   description: "Per-technician truck-stock tracking, parts requisition from warehouse, return processing, and just-in-time replenishment ahead of scheduled visits." },
  { capability_code: "FSM-SERVICE-CONTRACT-MGT", capability_name: "Service Contract and SLA Management",      description: "Recurring service agreement lifecycle: drafting, activation, renewal, expiry. SLA term tracking (response time, mean time to repair) and entitlement enforcement on work orders." },
  { capability_code: "FSM-INSTALLED-BASE-MGT",   capability_name: "Installed Equipment Management",           description: "Asset register of customer-owned equipment the service organization installs and maintains. Tracks model, serial, install date, warranty, location, and operational status. Out-of-service and decommissioned states preserve history without losing the record." },
  { capability_code: "FSM-PM-PLANNING",          capability_name: "Preventive Maintenance Planning",          description: "Recurring PM schedule per installed equipment unit. Drives proactive work-order generation when service is due; surfaces overdue and skipped cycles for escalation." },
];

const existingCaps = await get(`/capabilities?capability_code=in.(${capDefs.map(c => c.capability_code).join(",")})&select=id,capability_code`);
const existingCapCodes = new Set(existingCaps.map(c => String(c.capability_code)));
const missingCaps = capDefs.filter(c => !existingCapCodes.has(c.capability_code));
if (missingCaps.length) await insert("/capabilities", missingCaps);
console.log(`  ${missingCaps.length} capabilities inserted (${existingCaps.length} pre-existing)`);

// Resolve full capability id map (new + existing WORKFORCE-SCHEDULING)
const allCapCodes = [...capDefs.map(c => c.capability_code), "WORKFORCE-SCHEDULING"];
const allCaps = await get(`/capabilities?capability_code=in.(${allCapCodes.join(",")})&select=id,capability_code`);
const capId = new Map<string, number>();
for (const c of allCaps) capId.set(String(c.capability_code), Number(c.id));

// capability_domains links (idempotent — only insert missing)
const existingCD = await get(`/capability_domains?domain_id=eq.${FSM_DOMAIN_ID}&capability_id=in.(${[...capId.values()].join(",")})&select=capability_id`);
const existingCDIds = new Set(existingCD.map(r => Number(r.capability_id)));
const missingCD = [...capId.entries()].filter(([_, id]) => !existingCDIds.has(id)).map(([_, id]) => ({ domain_id: FSM_DOMAIN_ID, capability_id: id }));
if (missingCD.length) await insert("/capability_domains", missingCD);
console.log(`  ${missingCD.length} capability_domains inserted (${existingCD.length} pre-existing)`);

// ============================================================
// 2. modules
// ============================================================
console.log("\n[2/4] modules");
const moduleDefs = [
  {
    domain_module_code: "FSM-DISPATCH-OPS",
    domain_module_name: "Field Service Dispatch Operations",
    description: "Field-service operational core: work-order creation and lifecycle, technician assignment via dispatch records, field-visit execution, real-time route optimization, and truck-stock parts management. The module the dispatcher and field technicians both live in.",
    domain_id: FSM_DOMAIN_ID,
    module_kind: "full",
  },
  {
    domain_module_code: "FSM-INSTALLED-BASE",
    domain_module_name: "Installed Equipment and Preventive Maintenance",
    description: "Asset register of customer-owned equipment the service organization installs and maintains, plus the recurring preventive-maintenance schedules that drive proactive service. Tracks equipment from install through decommission, with PM cadence per unit.",
    domain_id: FSM_DOMAIN_ID,
    module_kind: "full",
  },
  {
    domain_module_code: "FSM-SERVICE-CONTRACTS",
    domain_module_name: "Service Contracts and SLAs",
    description: "Recurring service agreements between the service organization and customers, covering specific installed equipment under defined SLA terms. Drives entitlement checks on work orders, renewal workflows, and revenue recognition on the recurring stream.",
    domain_id: FSM_DOMAIN_ID,
    module_kind: "full",
  },
];

const existingModules = await get(`/domain_modules?domain_id=eq.${FSM_DOMAIN_ID}&select=id,domain_module_code`);
const existingModuleCodes = new Set(existingModules.map(m => String(m.domain_module_code)));
const missingModules = moduleDefs.filter(m => !existingModuleCodes.has(m.domain_module_code));
if (missingModules.length) await insert("/domain_modules", missingModules);
console.log(`  ${missingModules.length} modules inserted (${existingModules.length} pre-existing)`);

const allModules = await get(`/domain_modules?domain_id=eq.${FSM_DOMAIN_ID}&select=id,domain_module_code`);
const moduleId = new Map<string, number>();
for (const m of allModules) moduleId.set(String(m.domain_module_code), Number(m.id));
const M_DISPATCH = moduleId.get("FSM-DISPATCH-OPS")!;
const M_INSTALLED = moduleId.get("FSM-INSTALLED-BASE")!;
const M_CONTRACTS = moduleId.get("FSM-SERVICE-CONTRACTS")!;
console.log(`  M_DISPATCH=${M_DISPATCH}, M_INSTALLED=${M_INSTALLED}, M_CONTRACTS=${M_CONTRACTS}`);

// ============================================================
// 3. domain_module_capabilities
// ============================================================
console.log("\n[3/4] domain_module_capabilities");
const dmcRows = [
  // DISPATCH-OPS
  { domain_module_id: M_DISPATCH, capability_id: capId.get("WORKFORCE-SCHEDULING")! },
  { domain_module_id: M_DISPATCH, capability_id: capId.get("FSM-DISPATCH-OPT")! },
  { domain_module_id: M_DISPATCH, capability_id: capId.get("FSM-MOBILE-TECH")! },
  { domain_module_id: M_DISPATCH, capability_id: capId.get("FSM-PARTS-LOGISTICS")! },
  // INSTALLED-BASE
  { domain_module_id: M_INSTALLED, capability_id: capId.get("FSM-INSTALLED-BASE-MGT")! },
  { domain_module_id: M_INSTALLED, capability_id: capId.get("FSM-PM-PLANNING")! },
  // SERVICE-CONTRACTS
  { domain_module_id: M_CONTRACTS, capability_id: capId.get("FSM-SERVICE-CONTRACT-MGT")! },
];
const existingDmc = await get(`/domain_module_capabilities?domain_module_id=in.(${M_DISPATCH},${M_INSTALLED},${M_CONTRACTS})&select=domain_module_id,capability_id`);
const dmcKey = (r: Row) => `${r.domain_module_id}|${r.capability_id}`;
const existingDmcKeys = new Set(existingDmc.map(dmcKey));
const missingDmc = dmcRows.filter(r => !existingDmcKeys.has(dmcKey(r)));
if (missingDmc.length) await insert("/domain_module_capabilities", missingDmc);
console.log(`  ${missingDmc.length} DMC inserted (${existingDmc.length} pre-existing)`);

// ============================================================
// 4. domain_module_data_objects (existing masters + cross-domain embedded/consumer)
// New FSM-mastered data_objects (installed_equipment, service_pm_schedules, customer_sites)
// are loaded in Phase B; their DMDO rows live there too.
// ============================================================
console.log("\n[4/4] domain_module_data_objects (existing masters)");
const dmdoRows = [
  // FSM-DISPATCH-OPS masters
  { domain_module_id: M_DISPATCH, data_object_id: DO_SERVICE_WORK_ORDERS, role: "master",          necessity: "required" },
  { domain_module_id: M_DISPATCH, data_object_id: DO_FIELD_VISITS,        role: "master",          necessity: "required" },
  { domain_module_id: M_DISPATCH, data_object_id: DO_DISPATCH_RECORDS,    role: "master",          necessity: "required" },
  // FSM-DISPATCH-OPS cross-module + cross-domain
  { domain_module_id: M_DISPATCH, data_object_id: DO_CUSTOMERS,           role: "embedded_master", necessity: "required" },
  { domain_module_id: M_DISPATCH, data_object_id: DO_CRM_CONTACTS,        role: "embedded_master", necessity: "optional" },
  { domain_module_id: M_DISPATCH, data_object_id: DO_LOCATIONS,           role: "embedded_master", necessity: "optional" },
  { domain_module_id: M_DISPATCH, data_object_id: DO_SPARE_PARTS_INVENTORY, role: "embedded_master", necessity: "optional" },
  { domain_module_id: M_DISPATCH, data_object_id: DO_USERS,               role: "consumer",        necessity: "required" },
  // FSM-INSTALLED-BASE cross-module + cross-domain (own masters added in Phase B)
  { domain_module_id: M_INSTALLED, data_object_id: DO_CUSTOMERS,          role: "embedded_master", necessity: "required" },
  { domain_module_id: M_INSTALLED, data_object_id: DO_LOCATIONS,          role: "embedded_master", necessity: "optional" },
  { domain_module_id: M_INSTALLED, data_object_id: DO_USERS,              role: "consumer",        necessity: "required" },
  // FSM-SERVICE-CONTRACTS master + cross-domain
  { domain_module_id: M_CONTRACTS, data_object_id: DO_SERVICE_CONTRACTS,  role: "master",          necessity: "required" },
  { domain_module_id: M_CONTRACTS, data_object_id: DO_CUSTOMERS,          role: "embedded_master", necessity: "required" },
  { domain_module_id: M_CONTRACTS, data_object_id: DO_USERS,              role: "consumer",        necessity: "required" },
];
const existingDmdo = await get(`/domain_module_data_objects?domain_module_id=in.(${M_DISPATCH},${M_INSTALLED},${M_CONTRACTS})&select=domain_module_id,data_object_id`);
const dmdoKey = (r: Row) => `${r.domain_module_id}|${r.data_object_id}`;
const existingDmdoKeys = new Set(existingDmdo.map(dmdoKey));
const missingDmdo = dmdoRows.filter(r => !existingDmdoKeys.has(dmdoKey(r)));
if (missingDmdo.length) await insert("/domain_module_data_objects", missingDmdo);
console.log(`  ${missingDmdo.length} DMDO inserted (${existingDmdo.length} pre-existing)`);

// ============================================================
// Verification
// ============================================================
console.log("\n--- verification ---");
const finalCaps = await get(`/capability_domains?domain_id=eq.${FSM_DOMAIN_ID}&select=id`);
const finalMods = await get(`/domain_modules?domain_id=eq.${FSM_DOMAIN_ID}&select=id`);
const finalDmc = await get(`/domain_module_capabilities?domain_module_id=in.(${M_DISPATCH},${M_INSTALLED},${M_CONTRACTS})&select=id`);
const finalDmdo = await get(`/domain_module_data_objects?domain_module_id=in.(${M_DISPATCH},${M_INSTALLED},${M_CONTRACTS})&select=id`);
console.log(`  capabilities linked=${finalCaps.length} (target 7)`);
console.log(`  modules=${finalMods.length} (target 3)`);
console.log(`  DMC=${finalDmc.length} (target 7)`);
console.log(`  DMDO=${finalDmdo.length} (target 14 after this load; +9 in Phase B)`);
console.log("\nPhase A + M complete. UI:");
console.log("  https://tests.semantius.app/domain_map/domain_modules");
console.log("  https://tests.semantius.app/domain_map/capabilities");
