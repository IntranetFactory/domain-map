#!/usr/bin/env bun
// HVAC-SVC-MGMT starter (Rule #19).
// Small HVAC service organisation persona bundle. Single-install deployable that embeds
// masters from CRM (customers, crm_contacts), FSM-DISPATCH-OPS (service_work_orders, field_visits,
// dispatch_records), FSM-INSTALLED-BASE (installed_equipment, service_pm_schedules, customer_sites),
// FSM-SERVICE-CONTRACTS (service_contracts), CPQ (sales_quotes), SUB-MGMT (customer_invoices),
// HAM (spare_parts_inventory). Consumer on platform-builtin users.
//
// PREREQUISITES: FSM Phases A/M + B + E/S must be loaded first (so FSM modules and the new
// installed_equipment / service_pm_schedules / customer_sites masters exist).
//
// Six Rule-#19 invariants validated pre-flight.
// Idempotent: every step reads first, only writes what's missing.

export {};

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

const STARTER_CODE = "HVAC-SVC-MGMT";
const STARTER_NAME = "HVAC Service Management (small-org starter)";
const STARTER_DESC = "Small-shop persona bundle for HVAC service businesses (5-30 technicians). Single-install deployable covering customer accounts and contacts (CRM), service dispatch and field execution (FSM-DISPATCH-OPS), installed equipment register and PM cadence (FSM-INSTALLED-BASE), recurring maintenance agreements (FSM-SERVICE-CONTRACTS), quote-to-invoice (CPQ + SUB-MGMT), and parts inventory (HAM). Larger organisations deploy the full modules and skip the starter.";

const FSM_DOMAIN_ID = 31;
const CRM_DOMAIN_ID = 69;
const CPQ_DOMAIN_ID = 73;
const SUB_MGMT_DOMAIN_ID = 97;
const HAM_DOMAIN_ID = 51;
const HOST_DOMAIN_IDS = [FSM_DOMAIN_ID, CRM_DOMAIN_ID, CPQ_DOMAIN_ID, SUB_MGMT_DOMAIN_ID, HAM_DOMAIN_ID];

const DOMAIN_MAP_MODULE_ID = 1001;

// ============================================================
// 0. Resolve FK maps + validate canonical masters exist (invariant #2)
// ============================================================
console.log("=== 0. Resolving FK maps + validating canonical masters ===");
const doNames = [
  "customers", "crm_contacts",
  "service_work_orders", "field_visits", "dispatch_records",
  "installed_equipment", "service_pm_schedules", "customer_sites",
  "service_contracts",
  "sales_quotes",
  "customer_invoices",
  "spare_parts_inventory",
  "users",
];
const doRows: Row[] = await get(`/data_objects?data_object_name=in.(${doNames.join(",")})&select=id,data_object_name,kind`);
const doId: Record<string, number> = {};
const doKind: Record<string, string> = {};
for (const r of doRows) {
  doId[String(r.data_object_name)] = Number(r.id);
  doKind[String(r.data_object_name)] = String(r.kind);
}
for (const n of doNames) if (!doId[n]) throw new Error(`Missing data_object ${n}`);
console.log(`  ${Object.keys(doId).length}/${doNames.length} data_objects resolved`);

// Invariant #2 pre-flight: each embedded master must have a canonical master row in some full module
console.log("\n  Invariant #2 pre-flight: canonical master check");
const embeddedNames = doNames.filter(n => n !== "users");
for (const n of embeddedNames) {
  const did = doId[n];
  const masters = await get(`/domain_module_data_objects?data_object_id=eq.${did}&role=eq.master&select=domain_module:domain_modules!inner(id,domain_module_code,module_kind)&domain_module.module_kind=eq.full`);
  if (masters.length === 0) throw new Error(`Invariant #2 violation: ${n} has no master in any full module`);
  const codes = masters.map((r: any) => r.domain_module?.domain_module_code).filter(Boolean);
  console.log(`    ${n}: mastered by ${codes.join(", ")}`);
}

// Capability map
const capCodes = [
  "FSM-DISPATCH-OPT", "FSM-MOBILE-TECH", "FSM-PARTS-LOGISTICS",
  "FSM-INSTALLED-BASE-MGT", "FSM-PM-PLANNING",
  "FSM-SERVICE-CONTRACT-MGT",
];
const capRows: Row[] = await get(`/capabilities?capability_code=in.(${capCodes.join(",")})&select=id,capability_code`);
const capId: Record<string, number> = {};
for (const r of capRows) capId[String(r.capability_code)] = Number(r.id);
for (const c of capCodes) if (!capId[c]) throw new Error(`Missing capability ${c}`);
console.log(`  ${Object.keys(capId).length}/${capCodes.length} capabilities resolved`);

// ============================================================
// 1. domain_modules (1 starter row)
// ============================================================
console.log("\n=== 1. domain_modules (starter) ===");
const existingStarter: Row[] = await get(`/domain_modules?domain_module_code=eq.${STARTER_CODE}&select=id,module_kind,domain_id`);
let starterId: number;
if (existingStarter.length > 0) {
  starterId = Number((existingStarter[0] as any).id);
  console.log(`  recycled (id=${starterId}, kind=${(existingStarter[0] as any).module_kind})`);
} else {
  await post("/domain_modules", { domain_module_code: STARTER_CODE, domain_module_name: STARTER_NAME, domain_id: null, description: STARTER_DESC, module_kind: "starter" });
  const [created]: Row[] = await get(`/domain_modules?domain_module_code=eq.${STARTER_CODE}&select=id`);
  starterId = Number((created as any).id);
  console.log(`  inserted id=${starterId}`);
}

// ============================================================
// 2. domain_module_host_domains
// ============================================================
console.log("\n=== 2. domain_module_host_domains ===");
const existingHosts: Row[] = await get(`/domain_module_host_domains?domain_module_id=eq.${starterId}&select=domain_id`);
const seenHosts = new Set(existingHosts.map(r => Number(r.domain_id)));
let hostsAdded = 0;
for (const did of HOST_DOMAIN_IDS) {
  if (seenHosts.has(did)) continue;
  await post("/domain_module_host_domains", { domain_module_id: starterId, domain_id: did });
  hostsAdded++;
}
console.log(`  new ${hostsAdded} / pre-existing ${seenHosts.size}`);

// ============================================================
// 3. domain_module_capabilities
// ============================================================
console.log("\n=== 3. domain_module_capabilities ===");
const existingCaps: Row[] = await get(`/domain_module_capabilities?domain_module_id=eq.${starterId}&select=capability_id`);
const seenCaps = new Set(existingCaps.map(r => Number(r.capability_id)));
let capsAdded = 0;
for (const code of capCodes) {
  const cid = capId[code];
  if (seenCaps.has(cid)) continue;
  await post("/domain_module_capabilities", { domain_module_id: starterId, capability_id: cid });
  capsAdded++;
}
console.log(`  new ${capsAdded} / pre-existing ${seenCaps.size}`);

// ============================================================
// 4. domain_module_data_objects (embedded_master + consumer on users)
// ============================================================
console.log("\n=== 4. domain_module_data_objects ===");
type DmdoLink = { dataObject: string; role: "embedded_master" | "consumer"; necessity: "required" | "optional" };
const dmdoLinks: DmdoLink[] = [
  { dataObject: "customers",             role: "embedded_master", necessity: "required" },
  { dataObject: "crm_contacts",          role: "embedded_master", necessity: "required" },
  { dataObject: "customer_sites",        role: "embedded_master", necessity: "required" },
  { dataObject: "installed_equipment",   role: "embedded_master", necessity: "required" },
  { dataObject: "service_pm_schedules",  role: "embedded_master", necessity: "required" },
  { dataObject: "service_work_orders",   role: "embedded_master", necessity: "required" },
  { dataObject: "field_visits",          role: "embedded_master", necessity: "required" },
  { dataObject: "dispatch_records",      role: "embedded_master", necessity: "required" },
  { dataObject: "service_contracts",     role: "embedded_master", necessity: "required" },
  { dataObject: "sales_quotes",          role: "embedded_master", necessity: "required" },
  { dataObject: "customer_invoices",     role: "embedded_master", necessity: "required" },
  { dataObject: "spare_parts_inventory", role: "embedded_master", necessity: "required" },
  { dataObject: "users",                 role: "consumer",        necessity: "required" },
];

// Invariant #1 pre-flight: only embedded_master on domain_owned, only consumer on platform_builtin
for (const link of dmdoLinks) {
  if (link.role === "consumer" && doKind[link.dataObject] !== "platform_builtin") {
    throw new Error(`Invariant #1: starter consumer on non-builtin ${link.dataObject}`);
  }
  if (link.role === "embedded_master" && doKind[link.dataObject] === "platform_builtin") {
    throw new Error(`Invariant #1: starter embedded_master on builtin ${link.dataObject} (use consumer)`);
  }
}

const existingDmdo: Row[] = await get(`/domain_module_data_objects?domain_module_id=eq.${starterId}&select=data_object_id`);
const seenDmdo = new Set(existingDmdo.map(r => Number(r.data_object_id)));
let dmdoAdded = 0;
for (const link of dmdoLinks) {
  const did = doId[link.dataObject];
  if (seenDmdo.has(did)) continue;
  await post("/domain_module_data_objects", { domain_module_id: starterId, data_object_id: did, role: link.role, necessity: link.necessity });
  dmdoAdded++;
}
console.log(`  new ${dmdoAdded} / pre-existing ${seenDmdo.size}`);

// ============================================================
// 5. permissions (3 baseline only, invariant #4)
// ============================================================
console.log("\n=== 5. permissions (3 baseline tiers) ===");
const permPrefix = "hvac-svc-mgmt";
const perms = [
  { permission_name: `${permPrefix}:read`,   tier: "baseline-read",   description: "Read access to every embedded entity in the HVAC-SVC-MGMT starter (customers, contacts, sites, equipment, PM schedules, work orders, visits, dispatch records, contracts, quotes, invoices, parts inventory)." },
  { permission_name: `${permPrefix}:manage`, tier: "baseline-manage", description: "Read + write access to non-administrative state on every embedded entity (create / update work orders, visits, dispatch assignments, equipment, PM schedules, contracts, quotes, invoices, parts adjustments)." },
  { permission_name: `${permPrefix}:admin`,  tier: "baseline-admin",  description: "Administrative access on every embedded entity in the HVAC-SVC-MGMT starter, including settings, deletion, and override of soft locks. Typical role: shop owner or office manager." },
];
const existingPerms: Row[] = await get(`/permissions?permission_name=in.(${perms.map(p => p.permission_name).join(",")})&select=id,permission_name`);
const seenPerms = new Set(existingPerms.map(r => String(r.permission_name)));
let permsAdded = 0;
for (const p of perms) {
  if (seenPerms.has(p.permission_name)) continue;
  await post("/permissions", { ...p, domain_module_id: starterId, module_id: DOMAIN_MAP_MODULE_ID });
  permsAdded++;
}
console.log(`  new ${permsAdded} / pre-existing ${seenPerms.size}`);

// ============================================================
// 6. system skill (invariant #6)
// ============================================================
console.log("\n=== 6. system skill ===");
const skillName = "hvac_svc_mgmt_agent";
const skillDesc = "System skill for the HVAC-SVC-MGMT starter. Single agent covering the full HVAC service workflow: customer + site + equipment intake; PM scheduling; quote-to-work-order conversion; dispatch and field execution; contract drafting; invoicing. Calls platform CRUD on every embedded master; uses notify_person for customer appointment confirmations and PM reminders. No workflow-gate tools (starter ships only baseline permissions per Rule #19 invariant 4); the underlying FSM full modules carry the gates.";
const existingSkills: Row[] = await get(`/skills?skill_name=eq.${skillName}&select=id`);
let skillId: number;
if (existingSkills.length > 0) {
  skillId = Number((existingSkills[0] as any).id);
  console.log(`  recycled (id=${skillId})`);
} else {
  // Cross-domain starter; use FSM as the rollup domain (domain_module_id is the authoritative scope).
  await post("/skills", { skill_name: skillName, description: skillDesc, skill_type: "system", domain_id: FSM_DOMAIN_ID, domain_module_id: starterId });
  const [created]: Row[] = await get(`/skills?skill_name=eq.${skillName}&select=id`);
  skillId = Number((created as any).id);
  console.log(`  inserted id=${skillId}`);
}

// ============================================================
// 7. skill_tools (queries + light mutates; no workflow gates per invariant 4)
// ============================================================
console.log("\n=== 7. skill_tools ===");
const requiredTools = [
  // queries (12 — one per embedded master)
  "query_customers", "query_crm_contacts", "query_customer_sites",
  "query_installed_equipment", "query_service_pm_schedules",
  "query_service_work_orders", "query_field_visits", "query_dispatch_records",
  "query_service_contracts",
  "query_sales_quotes",
  "query_customer_invoices",
  "query_spare_parts_inventory",
  // mutates (10 — create + light update on the core workflow path)
  "create_customer",
  "create_crm_contact",
  "create_customer_site",
  "create_installed_equipment",
  "create_service_work_order", "update_service_work_order",
  "create_field_visit", "create_dispatch_record",
  "create_service_contract",
  "create_sales_quote",
  // comms abstraction (1)
  "notify_person",
];
const allToolNames = [...requiredTools];

const toolRows: Row[] = await get(`/tools?tool_name=in.(${allToolNames.join(",")})&select=id,tool_name,coverage_tier`);
const toolId: Record<string, number> = {};
const toolTier: Record<string, string> = {};
for (const r of toolRows) { toolId[String(r.tool_name)] = Number(r.id); toolTier[String(r.tool_name)] = String(r.coverage_tier); }
const missingToolNames = allToolNames.filter(n => !toolId[n]);
console.log(`  ${Object.keys(toolId).length}/${allToolNames.length} tools resolved${missingToolNames.length ? `; need to create: ${missingToolNames.join(", ")}` : ""}`);

// Auto-create the missing CRM/CPQ/SUB-MGMT/HAM CRUD tools as platform tools.
// These are simple platform CRUD primitives; the platform delivers them via the standard postgrestRequest crud.
const needCreate: Array<{ tool_name: string; operation_kind: string; coverage_tier: string; data_object_id: number; description: string }> = [];
const toolDoMap: Record<string, string> = {
  query_sales_quotes: "sales_quotes",
  create_customer: "customers",
  create_crm_contact: "crm_contacts",
  create_sales_quote: "sales_quotes",
};
for (const n of missingToolNames) {
  const opKind = n.startsWith("query_") ? "query" : "mutate";
  const dataObjectName = toolDoMap[n] ?? n.replace(/^(query_|create_|update_)/, "").replace(/_$/, "");
  const did = doId[dataObjectName];
  if (!did) throw new Error(`Cannot infer data_object_id for tool ${n} (resolved to ${dataObjectName})`);
  const verb = opKind === "query" ? "Query" : (n.startsWith("create_") ? "Create" : "Update");
  needCreate.push({ tool_name: n, operation_kind: opKind, coverage_tier: "platform", data_object_id: did, description: `${verb} \`${dataObjectName}\` records via the platform CRUD primitive.` });
}
if (needCreate.length) {
  await post("/tools", needCreate);
  const refreshed: Row[] = await get(`/tools?tool_name=in.(${missingToolNames.join(",")})&select=id,tool_name,coverage_tier`);
  for (const r of refreshed) { toolId[String(r.tool_name)] = Number(r.id); toolTier[String(r.tool_name)] = String(r.coverage_tier); }
  console.log(`  inserted ${needCreate.length} new platform CRUD tools`);
}

// Insert skill_tools (idempotent)
const existingSt: Row[] = await get(`/skill_tools?skill_id=eq.${skillId}&select=tool_id`);
const seenSt = new Set(existingSt.map(r => Number(r.tool_id)));
let stAdded = 0;
for (const t of requiredTools) {
  const tid = toolId[t];
  if (seenSt.has(tid)) continue;
  await post("/skill_tools", { skill_id: skillId, tool_id: tid, requirement_level: "required" });
  stAdded++;
}
console.log(`  new ${stAdded} / pre-existing ${seenSt.size}`);

// ============================================================
// 8. Six-invariant verification
// ============================================================
console.log("\n=== 8. Rule #19 invariant verification ===");
const dmdoCheck: Row[] = await get(`/domain_module_data_objects?domain_module_id=eq.${starterId}&select=role`);
const i1a = dmdoCheck.every(r => ["embedded_master", "consumer"].includes(String(r.role)));
console.log(`  #1 role restricted (embedded_master / consumer only): ${i1a ? "PASS" : "FAIL"} (${dmdoCheck.length} rows)`);
console.log(`  #2 canonical master exists for each:                  PASS (validated pre-flight)`);
const lifecycleCheck: Row[] = await get(`/data_object_lifecycle_states?domain_module_id=eq.${starterId}&select=id`);
console.log(`  #3 no lifecycle states authored:                      ${lifecycleCheck.length === 0 ? "PASS" : "FAIL"} (${lifecycleCheck.length} rows)`);
const permCheck: Row[] = await get(`/permissions?domain_module_id=eq.${starterId}&select=tier`);
const baselineCount = permCheck.filter(r => String(r.tier).startsWith("baseline-")).length;
const gateCount = permCheck.filter(r => String(r.tier) === "workflow-gate").length;
console.log(`  #4 exactly 3 baseline, no gates:                      ${baselineCount === 3 && gateCount === 0 ? "PASS" : "FAIL"} (baseline=${baselineCount}, gates=${gateCount})`);
const capCheck: Row[] = await get(`/domain_module_capabilities?domain_module_id=eq.${starterId}&select=id`);
console.log(`  #5 capabilities linked:                               ${capCheck.length > 0 ? "PASS" : "FAIL"} (${capCheck.length} rows)`);
const skillCheck: Row[] = await get(`/skills?domain_module_id=eq.${starterId}&skill_type=eq.system&select=id`);
const stCheck: Row[] = await get(`/skill_tools?skill_id=eq.${skillId}&select=id`);
console.log(`  #6 exactly 1 system skill with >=1 tools:             ${skillCheck.length === 1 && stCheck.length >= 1 ? "PASS" : "FAIL"} (skills=${skillCheck.length}, tools=${stCheck.length})`);

// ============================================================
// 9. Semantius coverage
// ============================================================
console.log("\n=== 9. Semantius coverage ===");
const total = allToolNames.length;
const platform = allToolNames.filter(t => toolTier[t] === "platform").length;
const platformOrIntegration = allToolNames.filter(t => toolTier[t] === "platform" || toolTier[t] === "integration").length;
const strict = Math.round((platform / total) * 100);
const op = Math.round((platformOrIntegration / total) * 100);
console.log(`  total tools: ${total}`);
console.log(`  platform:    ${platform} (strict=${strict}%)`);
console.log(`  plat+integ:  ${platformOrIntegration} (operational=${op}%)`);
const externals = allToolNames.filter(t => toolTier[t] === "external");
if (externals.length) console.log(`  externals:   ${externals.join(", ")}`);

console.log("\nHVAC starter complete. UI:");
console.log(`  https://tests.semantius.app/domain_map/domain_modules (filter id=${starterId})`);
console.log(`  https://tests.semantius.app/domain_map/domain_module_data_objects (filter domain_module_id=${starterId})`);
console.log(`  https://tests.semantius.app/domain_map/skill_tools (filter skill_id=${skillId})`);
