#!/usr/bin/env bun
// Audit fix loader for the ONBOARDING domain (domain_id 99).
//
// Resolves these gaps (from the 2026-05-23 audit):
//   A2  load 6 capabilities + capability_domains
//   M1-M6  load 3 domain_modules, domain_starter_modules, domain_module_data_objects,
//          domain_module_capabilities; PATCH lifecycle states with domain_module_id (M5)
//   B9  PATCH event_category='state_change' on 6 events (378-383)
//   editorial  DELETE 2 duplicate handoffs (ids 370, 397);
//              rename buddy_assignment.confirmed -> buddy_assignment.activated;
//              rename onboarding_cohort.kicked_off -> onboarding_cohort.activated
//   permissions (baseline only)  9 rows (3 modules x read/manage/admin)
//   E1-E6  3 employee-onboarding roles + HIRING-MANAGER hook-up;
//          role_modules (2-module floor enforced); role_permissions (tier-level only)
//
// Idempotent. Re-run safely.

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

const DOMAIN_ID = 99;
const EMPLOYEE_ONBOARDING_FUNCTION_ID = 82;
const HIRING_MANAGER_ROLE_ID = 10007;

// Data object ids (already in catalog).
const DO = {
  onboarding_plans: 15,
  onboarding_journeys: 16,
  onboarding_stages: 17,
  onboarding_tasks: 18,
  buddy_assignments: 19,
  onboarding_cohorts: 20,
  welcome_communications: 21,
  onboarding_document_collections: 22,
  employees: 31,
  hcm_positions: 32,
  org_units: 34,
  service_requests: 48,
  asset_lifecycle_events: 55,
  hardware_assets: 56,
};

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });

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
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

async function del(path: string): Promise<Row[]> {
  return call({ method: "DELETE", path });
}

async function syncByKey<T extends Row>(
  path: string,
  rows: T[],
  keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new rows into ${path} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} already present, nothing to insert`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// ============================================================
// 1. CAPABILITIES + capability_domains  (A2)
// ============================================================
console.log("\n=== 1. Capabilities ===");

const capabilities = [
  { capability_code: "ONBOARDING-JOURNEY-DESIGN", capability_name: "Onboarding Journey Design", description: "Authoring of plan templates, stages, task libraries, and audience targeting (role, location, employment type) for new-hire onboarding programs." },
  { capability_code: "ONBOARDING-PROVISIONING-ORCHESTRATION", capability_name: "Onboarding Provisioning Orchestration", description: "Fan-out of templated provisioning tasks to ITSM (hardware), IGA (access), IWMS (workspace), and LMS (compliance training), with status reconciliation." },
  { capability_code: "ONBOARDING-DOCUMENT-COLLECTION", capability_name: "Onboarding Document Collection", description: "Intake, validation, and storage of new-hire forms (I-9, W-4, NDA, direct-deposit, tax forms), often with e-signature." },
  { capability_code: "ONBOARDING-WELCOME-EXPERIENCE", capability_name: "Onboarding Welcome Experience", description: "Pre-boarding communications, day-one nudges, cohort kick-offs, and multi-channel welcome cadences." },
  { capability_code: "ONBOARDING-BUDDY-MENTORING", capability_name: "Onboarding Buddy Mentoring", description: "Buddy or mentor pairing for new hires, intro meeting scheduling, and ongoing check-in cadence." },
  { capability_code: "ONBOARDING-MILESTONE-TRACKING", capability_name: "Onboarding Milestone Tracking", description: "30/60/90-day milestones, manager nudges, completion signals, and reporting on time-to-productivity." },
];

const capMap = await syncByKey("/capabilities", capabilities, "capability_code");

const existingCapDomains = await get(
  `/capability_domains?domain_id=eq.${DOMAIN_ID}&select=capability_id`,
);
const existingCapIds = new Set(existingCapDomains.map(r => Number(r.capability_id)));
const capDomainRows: Row[] = [];
for (const c of capabilities) {
  const capId = capMap.get(c.capability_code);
  if (capId && !existingCapIds.has(capId)) {
    capDomainRows.push({ capability_id: capId, domain_id: DOMAIN_ID });
  }
}
if (capDomainRows.length > 0) {
  console.log(`  inserting ${capDomainRows.length} capability_domains`);
  await insert("/capability_domains", capDomainRows);
} else {
  console.log("  capability_domains already linked");
}

// ============================================================
// 2. DOMAIN MODULES + starter + module_data_objects + module_capabilities  (M1-M6)
// ============================================================
console.log("\n=== 2. Modules ===");

const modules = [
  {
    domain_module_code: "ONB-JOURNEY-MGMT",
    domain_module_name: "Onboarding Journey Management",
    description: "Plan templates, journey instances, stages, tasks, and cohorts. The core orchestration surface for new-hire onboarding programs.",
    domain_id: DOMAIN_ID,
  },
  {
    domain_module_code: "ONB-DOCUMENT-INTAKE",
    domain_module_name: "Onboarding Document Intake",
    description: "Collection and validation of new-hire paperwork (I-9, tax, NDA, direct-deposit), with handoff to HCM/Payroll on completion.",
    domain_id: DOMAIN_ID,
  },
  {
    domain_module_code: "ONB-WELCOME-EXPERIENCE",
    domain_module_name: "Onboarding Welcome Experience",
    description: "Pre-boarding communications, day-one welcome cadences, buddy pairing, and intro meeting coordination.",
    domain_id: DOMAIN_ID,
  },
];

const modMap = await syncByKey("/domain_modules", modules, "domain_module_code");
const M = {
  journeyMgmt: modMap.get("ONB-JOURNEY-MGMT")!,
  docIntake: modMap.get("ONB-DOCUMENT-INTAKE")!,
  welcomeExp: modMap.get("ONB-WELCOME-EXPERIENCE")!,
};
console.log(`  module ids: journeyMgmt=${M.journeyMgmt} docIntake=${M.docIntake} welcomeExp=${M.welcomeExp}`);

// domain_starter_modules (recommended entry-point ordering)
const existingStarters = await get(
  `/domain_starter_modules?domain_id=eq.${DOMAIN_ID}&select=domain_module_id`,
);
const existingStarterIds = new Set(existingStarters.map(r => Number(r.domain_module_id)));
const starterRows = [
  { domain_id: DOMAIN_ID, domain_module_id: M.journeyMgmt, position: 1, notes: "Start here: the core journey-template + task-fan-out engine. Adds value immediately even without document intake or welcome cadences." },
  { domain_id: DOMAIN_ID, domain_module_id: M.docIntake, position: 2, notes: "Add once the paperwork (I-9, tax, NDA, direct-deposit) needs structured intake with HCM/Payroll completion handoff." },
  { domain_id: DOMAIN_ID, domain_module_id: M.welcomeExp, position: 3, notes: "Add when ready to layer welcome communications, buddy pairing, and cohort experiences on top of the operational journey." },
].filter(r => !existingStarterIds.has(r.domain_module_id));
if (starterRows.length > 0) {
  console.log(`  inserting ${starterRows.length} starter modules`);
  await insert("/domain_starter_modules", starterRows);
} else {
  console.log("  starter modules already populated");
}

// domain_module_capabilities
const existingModCaps = await get(
  `/domain_module_capabilities?domain_module_id=in.(${M.journeyMgmt},${M.docIntake},${M.welcomeExp})&select=domain_module_id,capability_id`,
);
const existingModCapKeys = new Set(existingModCaps.map(r => `${r.domain_module_id}|${r.capability_id}`));
const modCapMap = {
  journeyMgmt: ["ONBOARDING-JOURNEY-DESIGN", "ONBOARDING-PROVISIONING-ORCHESTRATION", "ONBOARDING-MILESTONE-TRACKING"],
  docIntake: ["ONBOARDING-DOCUMENT-COLLECTION"],
  welcomeExp: ["ONBOARDING-WELCOME-EXPERIENCE", "ONBOARDING-BUDDY-MENTORING"],
};
const modCapRows: Row[] = [];
for (const [mKey, caps] of Object.entries(modCapMap)) {
  const moduleId = (M as Record<string, number>)[mKey];
  for (const capCode of caps) {
    const capId = capMap.get(capCode);
    if (capId && !existingModCapKeys.has(`${moduleId}|${capId}`)) {
      modCapRows.push({ domain_module_id: moduleId, capability_id: capId });
    }
  }
}
if (modCapRows.length > 0) {
  console.log(`  inserting ${modCapRows.length} domain_module_capabilities`);
  await insert("/domain_module_capabilities", modCapRows);
} else {
  console.log("  domain_module_capabilities already linked");
}

// domain_module_data_objects
const existingModDOs = await get(
  `/domain_module_data_objects?domain_module_id=in.(${M.journeyMgmt},${M.docIntake},${M.welcomeExp})&select=domain_module_id,data_object_id`,
);
const existingModDOKeys = new Set(existingModDOs.map(r => `${r.domain_module_id}|${r.data_object_id}`));

const journeyMgmtDOs = [
  { data_object_id: DO.onboarding_plans, role: "master", necessity: "required", notes: "" },
  { data_object_id: DO.onboarding_journeys, role: "master", necessity: "required", notes: "" },
  { data_object_id: DO.onboarding_stages, role: "master", necessity: "required", notes: "" },
  { data_object_id: DO.onboarding_tasks, role: "master", necessity: "required", notes: "" },
  { data_object_id: DO.onboarding_cohorts, role: "master", necessity: "required", notes: "" },
  { data_object_id: DO.employees, role: "embedded_master", necessity: "required", notes: "Local-masters new-hire onboarding fields during the journey window; defers to HCM for core HR identity." },
  { data_object_id: DO.hcm_positions, role: "embedded_master", necessity: "required", notes: "Local-masters positions for first-day-readiness checks when no HCM is integrated; reads from HCM when present." },
  { data_object_id: DO.org_units, role: "embedded_master", necessity: "required", notes: "Local-masters org_units to scope journeys to a department/location; reads from HCM when integrated." },
  { data_object_id: DO.service_requests, role: "contributor", necessity: "required", notes: "Provisioning tasks open ITSM service requests for IT fulfilment." },
  { data_object_id: DO.asset_lifecycle_events, role: "contributor", necessity: "required", notes: "Provisioning tasks generate asset-assignment lifecycle events." },
  { data_object_id: DO.hardware_assets, role: "consumer", necessity: "required", notes: "Reads hardware_assets to confirm Day-1 laptop/peripheral readiness via the ITAM lifecycle handoff." },
];
const docIntakeDOs = [
  { data_object_id: DO.onboarding_document_collections, role: "master", necessity: "required", notes: "" },
  { data_object_id: DO.employees, role: "embedded_master", necessity: "required", notes: "Identifies the employee whose documents are being collected; defers to HCM for canonical identity." },
  { data_object_id: DO.onboarding_journeys, role: "consumer", necessity: "required", notes: "Document collection is bound to one onboarding journey." },
];
const welcomeExpDOs = [
  { data_object_id: DO.welcome_communications, role: "master", necessity: "required", notes: "" },
  { data_object_id: DO.buddy_assignments, role: "master", necessity: "required", notes: "" },
  { data_object_id: DO.employees, role: "embedded_master", necessity: "required", notes: "Identifies the recipient new hire; defers to HCM for canonical identity." },
  { data_object_id: DO.onboarding_journeys, role: "consumer", necessity: "required", notes: "Welcome cadences and buddy pairings hang off a specific journey." },
];

const allModDOs: Row[] = [];
for (const r of journeyMgmtDOs) {
  if (!existingModDOKeys.has(`${M.journeyMgmt}|${r.data_object_id}`)) {
    allModDOs.push({ domain_module_id: M.journeyMgmt, ...r });
  }
}
for (const r of docIntakeDOs) {
  if (!existingModDOKeys.has(`${M.docIntake}|${r.data_object_id}`)) {
    allModDOs.push({ domain_module_id: M.docIntake, ...r });
  }
}
for (const r of welcomeExpDOs) {
  if (!existingModDOKeys.has(`${M.welcomeExp}|${r.data_object_id}`)) {
    allModDOs.push({ domain_module_id: M.welcomeExp, ...r });
  }
}
if (allModDOs.length > 0) {
  console.log(`  inserting ${allModDOs.length} domain_module_data_objects`);
  await insert("/domain_module_data_objects", allModDOs);
} else {
  console.log("  domain_module_data_objects already linked");
}

// ============================================================
// 3. Lifecycle state -> module wiring (M5)
// ============================================================
console.log("\n=== 3. Lifecycle state module wiring (M5) ===");

const stateModuleMap: Record<number, number> = {
  [DO.onboarding_plans]: M.journeyMgmt,
  [DO.onboarding_journeys]: M.journeyMgmt,
  [DO.onboarding_stages]: M.journeyMgmt,
  [DO.onboarding_tasks]: M.journeyMgmt,
  [DO.onboarding_cohorts]: M.journeyMgmt,
  [DO.buddy_assignments]: M.welcomeExp,
  [DO.welcome_communications]: M.welcomeExp,
  [DO.onboarding_document_collections]: M.docIntake,
};
for (const [doIdStr, moduleId] of Object.entries(stateModuleMap)) {
  const doId = Number(doIdStr);
  const result = await patch(
    `/data_object_lifecycle_states?data_object_id=eq.${doId}&domain_module_id=is.null`,
    { domain_module_id: moduleId },
  );
  console.log(`  data_object ${doId} -> module ${moduleId}: ${result.length} states patched`);
}

// ============================================================
// 4. B9 fix: backfill event_category on 6 events
// ============================================================
console.log("\n=== 4. B9 event_category backfill ===");

for (const eventId of [378, 379, 380, 381, 382, 383]) {
  const result = await patch(
    `/trigger_events?id=eq.${eventId}&event_category=eq.`,
    { event_category: "state_change" },
  );
  console.log(`  event ${eventId}: ${result.length} patched`);
}

// ============================================================
// 5. Editorial: rename misaligned events, delete duplicate handoffs
// ============================================================
console.log("\n=== 5. Editorial cleanup ===");

// Rename buddy_assignment.confirmed -> .activated (matches 'active' state on data_object 19)
await patch(`/trigger_events?id=eq.380&event_name=eq.buddy_assignment.confirmed`, {
  event_name: "buddy_assignment.activated",
  description: "Buddy/mentor assignment activated (moves from 'assigned' to 'active'). WSC channel provisioning and intro-meeting scheduling trigger.",
});
console.log("  trigger_events 380: renamed to buddy_assignment.activated");

// Rename onboarding_cohort.kicked_off -> .activated (matches 'active' state on data_object 20)
await patch(`/trigger_events?id=eq.381&event_name=eq.onboarding_cohort.kicked_off`, {
  event_name: "onboarding_cohort.activated",
  description: "Cohort orientation activated (moves from 'planned' to 'active'). LMS provisions cohort-level training; comms channels created.",
});
console.log("  trigger_events 381: renamed to onboarding_cohort.activated");

// Delete duplicate handoffs (keep the high-friction / journey-payload variants)
for (const handoffId of [370, 397]) {
  // Check it still exists (idempotency)
  const existing = await get(`/cross_domain_handoffs?id=eq.${handoffId}&select=id`);
  if (existing.length > 0) {
    await del(`/cross_domain_handoffs?id=eq.${handoffId}`);
    console.log(`  cross_domain_handoffs ${handoffId}: deleted (duplicate)`);
  } else {
    console.log(`  cross_domain_handoffs ${handoffId}: already gone`);
  }
}

// ============================================================
// 6. PERMISSIONS (baseline only, 3 modules x 3 tiers)
// ============================================================
console.log("\n=== 6. Baseline permissions ===");

const permRows = [
  { permission_name: "onb-journey-mgmt:read", description: "Read onboarding plans, journeys, stages, tasks, and cohorts.", domain_module_id: M.journeyMgmt, tier: "baseline-read" },
  { permission_name: "onb-journey-mgmt:manage", description: "Create and edit onboarding plans, journeys, stages, tasks, and cohorts.", domain_module_id: M.journeyMgmt, tier: "baseline-manage" },
  { permission_name: "onb-journey-mgmt:admin", description: "Full admin on onboarding plans, journeys, stages, tasks, and cohorts, including workflow gates.", domain_module_id: M.journeyMgmt, tier: "baseline-admin" },
  { permission_name: "onb-document-intake:read", description: "Read onboarding document collections.", domain_module_id: M.docIntake, tier: "baseline-read" },
  { permission_name: "onb-document-intake:manage", description: "Create and edit onboarding document collections.", domain_module_id: M.docIntake, tier: "baseline-manage" },
  { permission_name: "onb-document-intake:admin", description: "Full admin on onboarding document collections, including approve/reject workflow gates.", domain_module_id: M.docIntake, tier: "baseline-admin" },
  { permission_name: "onb-welcome-experience:read", description: "Read welcome communications and buddy assignments.", domain_module_id: M.welcomeExp, tier: "baseline-read" },
  { permission_name: "onb-welcome-experience:manage", description: "Create and edit welcome communications and buddy assignments.", domain_module_id: M.welcomeExp, tier: "baseline-manage" },
  { permission_name: "onb-welcome-experience:admin", description: "Full admin on welcome communications and buddy assignments, including send/cancel workflow gates.", domain_module_id: M.welcomeExp, tier: "baseline-admin" },
];

const permMap = await syncByKey("/permissions", permRows, "permission_name");

// ============================================================
// 7. ROLES (E1-E6)
// ============================================================
console.log("\n=== 7. Roles ===");

const roles = [
  {
    role_code: "EMPLOYEE-ONBOARDING-COORDINATOR",
    role_name: "Onboarding Coordinator",
    slug: "employee_onboarding_coordinator",
    description: "Operates onboarding journeys day-to-day: schedules tasks, nudges blocked items, coordinates buddies and welcome cadences.",
    business_function_id: EMPLOYEE_ONBOARDING_FUNCTION_ID,
  },
  {
    role_code: "EMPLOYEE-ONBOARDING-HR-PARTNER",
    role_name: "Onboarding HR Partner",
    slug: "employee_onboarding_hr_partner",
    description: "Owns new-hire paperwork: I-9, tax forms, NDA, direct-deposit. Approves and archives document collections; supports journey execution.",
    business_function_id: EMPLOYEE_ONBOARDING_FUNCTION_ID,
  },
  {
    role_code: "EMPLOYEE-ONBOARDING-PROGRAM-MANAGER",
    role_name: "Onboarding Program Manager",
    slug: "employee_onboarding_program_manager",
    description: "Owns the onboarding program: plan templates, welcome strategy, cohort design, and time-to-productivity metrics.",
    business_function_id: EMPLOYEE_ONBOARDING_FUNCTION_ID,
  },
];

const roleMap = await syncByKey("/roles", roles, "role_code");
const R = {
  coordinator: roleMap.get("EMPLOYEE-ONBOARDING-COORDINATOR")!,
  hrPartner: roleMap.get("EMPLOYEE-ONBOARDING-HR-PARTNER")!,
  programMgr: roleMap.get("EMPLOYEE-ONBOARDING-PROGRAM-MANAGER")!,
};

// role_modules (2-module floor enforced per E2)
const roleModuleSpecs: Array<{ role_id: number; domain_module_id: number; interaction_level: string; notes: string }> = [
  // Coordinator
  { role_id: R.coordinator, domain_module_id: M.journeyMgmt, interaction_level: "primary", notes: "Day-to-day journey/task operation." },
  { role_id: R.coordinator, domain_module_id: M.welcomeExp, interaction_level: "secondary", notes: "Triggers welcome comms and confirms buddy pairings." },
  // HR Partner
  { role_id: R.hrPartner, domain_module_id: M.docIntake, interaction_level: "primary", notes: "Owns intake, approval, archival of new-hire paperwork." },
  { role_id: R.hrPartner, domain_module_id: M.journeyMgmt, interaction_level: "secondary", notes: "Reads journeys to align paperwork to lifecycle." },
  // Program Manager
  { role_id: R.programMgr, domain_module_id: M.journeyMgmt, interaction_level: "primary", notes: "Owns plan templates, cohort strategy, milestone reporting." },
  { role_id: R.programMgr, domain_module_id: M.welcomeExp, interaction_level: "primary", notes: "Owns welcome strategy and buddy program design." },
  { role_id: R.programMgr, domain_module_id: M.docIntake, interaction_level: "secondary", notes: "Coordinates with HR Partner on intake design and SLA." },
  // Hiring Manager (cross-functional, already exists; read-only on onboarding)
  { role_id: HIRING_MANAGER_ROLE_ID, domain_module_id: M.journeyMgmt, interaction_level: "secondary", notes: ":read only - sees new-hire onboarding progress for their direct report." },
  { role_id: HIRING_MANAGER_ROLE_ID, domain_module_id: M.welcomeExp, interaction_level: "secondary", notes: ":read only - sees welcome cadence and buddy assignment for their direct report." },
];

const existingRoleModules = await get(
  `/role_modules?role_id=in.(${R.coordinator},${R.hrPartner},${R.programMgr},${HIRING_MANAGER_ROLE_ID})&select=role_id,domain_module_id`,
);
const existingRoleModuleKeys = new Set(
  existingRoleModules.map(r => `${r.role_id}|${r.domain_module_id}`),
);
const newRoleModules = roleModuleSpecs.filter(
  s => !existingRoleModuleKeys.has(`${s.role_id}|${s.domain_module_id}`),
);
if (newRoleModules.length > 0) {
  console.log(`  inserting ${newRoleModules.length} role_modules`);
  await insert("/role_modules", newRoleModules);
} else {
  console.log("  role_modules already linked");
}

// role_permissions (tier-level only per SKILL.md)
const rolePermSpecs: Array<{ role_id: number; permission_name: string }> = [
  // Coordinator: manage journeys/tasks, read welcome
  { role_id: R.coordinator, permission_name: "onb-journey-mgmt:manage" },
  { role_id: R.coordinator, permission_name: "onb-welcome-experience:read" },
  // HR Partner: admin doc intake, manage journeys
  { role_id: R.hrPartner, permission_name: "onb-document-intake:admin" },
  { role_id: R.hrPartner, permission_name: "onb-journey-mgmt:manage" },
  // Program Manager: admin journeys + welcome, manage doc intake
  { role_id: R.programMgr, permission_name: "onb-journey-mgmt:admin" },
  { role_id: R.programMgr, permission_name: "onb-welcome-experience:admin" },
  { role_id: R.programMgr, permission_name: "onb-document-intake:manage" },
  // Hiring Manager: read only on onboarding (their primary modules are ATS/HCM)
  { role_id: HIRING_MANAGER_ROLE_ID, permission_name: "onb-journey-mgmt:read" },
  { role_id: HIRING_MANAGER_ROLE_ID, permission_name: "onb-welcome-experience:read" },
];

const allRoleIds = [R.coordinator, R.hrPartner, R.programMgr, HIRING_MANAGER_ROLE_ID];
const existingRolePerms = await get(
  `/role_permissions?role_id=in.(${allRoleIds.join(",")})&select=role_id,permission_id`,
);
const existingRolePermKeys = new Set(
  existingRolePerms.map(r => `${r.role_id}|${r.permission_id}`),
);
const rolePermRows: Row[] = [];
for (const spec of rolePermSpecs) {
  const permId = permMap.get(spec.permission_name);
  if (!permId) {
    console.warn(`  WARN: permission ${spec.permission_name} not found in permMap, skipping`);
    continue;
  }
  if (!existingRolePermKeys.has(`${spec.role_id}|${permId}`)) {
    rolePermRows.push({ role_id: spec.role_id, permission_id: permId });
  }
}
if (rolePermRows.length > 0) {
  console.log(`  inserting ${rolePermRows.length} role_permissions`);
  await insert("/role_permissions", rolePermRows);
} else {
  console.log("  role_permissions already linked");
}

// ============================================================
// 8. Summary
// ============================================================
console.log("\n=== Summary ===");
const summaryQueries: Array<[string, string]> = [
  ["capabilities (ONBOARDING)", `/capability_domains?domain_id=eq.${DOMAIN_ID}&select=capability_id`],
  ["domain_modules", `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id`],
  ["domain_starter_modules", `/domain_starter_modules?domain_id=eq.${DOMAIN_ID}&select=id`],
  ["domain_module_capabilities", `/domain_module_capabilities?domain_module_id=in.(${M.journeyMgmt},${M.docIntake},${M.welcomeExp})&select=id`],
  ["domain_module_data_objects", `/domain_module_data_objects?domain_module_id=in.(${M.journeyMgmt},${M.docIntake},${M.welcomeExp})&select=id`],
  ["roles (Employee Onboarding)", `/roles?business_function_id=eq.${EMPLOYEE_ONBOARDING_FUNCTION_ID}&select=id`],
  ["role_modules (this load)", `/role_modules?role_id=in.(${R.coordinator},${R.hrPartner},${R.programMgr},${HIRING_MANAGER_ROLE_ID})&select=id`],
  ["role_permissions (this load)", `/role_permissions?role_id=in.(${R.coordinator},${R.hrPartner},${R.programMgr},${HIRING_MANAGER_ROLE_ID})&select=id`],
  ["permissions (this load)", `/permissions?domain_module_id=in.(${M.journeyMgmt},${M.docIntake},${M.welcomeExp})&select=id`],
];
for (const [label, path] of summaryQueries) {
  const rows = await get(path);
  console.log(`  ${label}: ${rows.length}`);
}

console.log("\nUI links:");
console.log(`  https://tests.semantius.app/domain_map/domain_modules`);
console.log(`  https://tests.semantius.app/domain_map/domain_module_data_objects`);
console.log(`  https://tests.semantius.app/domain_map/capability_domains`);
console.log(`  https://tests.semantius.app/domain_map/roles`);
console.log(`  https://tests.semantius.app/domain_map/role_permissions`);
console.log("\nDone.");
