#!/usr/bin/env bun
// .tmp_deploy/load_hcm_personas_2026_06_08.ts
//
// HCM review 2026-06-08: execute the deferred Phase-E persona/RACI layer (B1A-PHASE-P).
// Under the current Rule #21, personas + RACI are additive work the agent executes
// (record_status='new'); the prior pass deferred them under an older policy reading.
//
// Authors, idempotently (read-before-create on natural keys):
//   1. domain_roles            4 NEW HCM personas (function-scoped, HR = 3)
//   2. role_modules            reach across HCM modules 54/55/56 for the 4 new + 2 accreted
//                              cross-functional personas (PEOPLE-MANAGER 26, HIRING-MANAGER 10)
//   3. data_object_lifecycle_states.process_id   the process-to-permission edge (10 gates -> 7 procs)
//   4. process_raci            RACI on the 7 wired HCM processes
//   5. handoffs.target_domain_module_id  B10b backfill for the 3 PSA inbound handoffs now
//                              anchored to module 54 (fill NULL FK only; mechanical)
//
// Re-runnable. None of these are destructive: domain_roles / process_raci are fresh inserts
// at record_status='new'; the lifecycle process_id and handoff target-module are NULL today
// (fill-empty, not overwrite). After it, the per-domain audit E1-E6 + B10b (the 3 PSA rows) clear.
import { pg } from "../scripts/lib/catalog";

const HR = 3; // business_functions: Human Resources

// HCM modules: 54 = HCM-CORE-WORKER, 55 = HCM-ORG-POSITIONS, 56 = HCM-LIFECYCLE-WORKFLOWS
const PERSONAS: { role_code: string; role_name: string; business_function_id: number | null; description: string }[] = [
  { role_code: "HR-HRIS-ADMIN", role_name: "HRIS Administrator", business_function_id: HR, description: "Administers the HCM system of record: configures and maintains worker data, the org-unit structure, the job and position catalog, and the lifecycle workflow configuration. Holds admin authority across all HCM modules." },
  { role_code: "HR-PEOPLE-OPS-SPECIALIST", role_name: "People Operations Specialist", business_function_id: HR, description: "Executes the day-to-day worker lifecycle: processes hires into active workers, transfers and other employment events, leaves of absence, contract changes, and terminations. The transactional HR operator." },
  { role_code: "HR-BUSINESS-PARTNER", role_name: "HR Business Partner", business_function_id: HR, description: "Advises managers on org changes, workforce moves, and employee relations. Accountable for sensitive lifecycle changes in their business unit and consulted on position and reorganization decisions." },
  { role_code: "HR-ORG-DESIGN-ANALYST", role_name: "Organization Design Analyst", business_function_id: HR, description: "Models the organization: authors and publishes job profiles, defines and approves positions against budgeted headcount, and maintains the org-unit hierarchy through reorganizations." },
];

// existing cross-functional personas whose reach ACCRETES onto HCM (do NOT recreate).
const ACCRETE_CODES = ["PEOPLE-MANAGER", "HIRING-MANAGER"];

const REACH: Record<string, [number, string][]> = {
  "HR-HRIS-ADMIN": [[54, "primary"], [55, "primary"], [56, "primary"]],
  "HR-PEOPLE-OPS-SPECIALIST": [[54, "primary"], [56, "primary"], [55, "secondary"]],
  "HR-BUSINESS-PARTNER": [[54, "secondary"], [55, "secondary"], [56, "secondary"]],
  "HR-ORG-DESIGN-ANALYST": [[55, "primary"], [54, "secondary"], [56, "secondary"]],
  // accreted (their 2-module floor is already met by their home domains):
  "PEOPLE-MANAGER": [[56, "primary"], [54, "secondary"], [55, "secondary"]],
  "HIRING-MANAGER": [[55, "secondary"]],
};

// [data_object_id, state_name, process_id] : wire the gate to its HCM PCF process.
// 243 Manage and maintain employee data | 1058 Manage leave of absence | 239 Manage separation
// 240 Relocate employees and manage assignments | 97 Create organizational design
// 92 Conduct organization restructuring opportunities | 995 Develop and maintain job descriptions
const WIRING: [number, string, number][] = [
  [31, "active", 243],       // employees.active
  [31, "on_leave", 1058],    // employees.on_leave
  [31, "terminated", 239],   // employees.terminated
  [35, "approved", 243],     // employment_contracts.approved
  [35, "signed", 243],       // employment_contracts.signed
  [36, "approved", 240],     // employment_events.approved
  [32, "approved", 97],      // hcm_positions.approved
  [34, "active", 97],        // org_units.active
  [34, "reorganized", 92],   // org_units.reorganized
  [33, "approved", 995],     // job_profiles.approved
];

// [process_id, role_code, raci, consultation_blocking]
const RACI: [number, string, string, boolean][] = [
  // 243 Manage and maintain employee data (employee activation + contract lifecycle)
  [243, "HR-PEOPLE-OPS-SPECIALIST", "responsible", false],
  [243, "HR-BUSINESS-PARTNER", "accountable", false],
  [243, "HR-HRIS-ADMIN", "consulted", false],
  [243, "PEOPLE-MANAGER", "informed", false],
  // 1058 Manage leave of absence
  [1058, "HR-PEOPLE-OPS-SPECIALIST", "responsible", false],
  [1058, "PEOPLE-MANAGER", "accountable", false],
  [1058, "HR-BUSINESS-PARTNER", "consulted", true], // FMLA / sensitive -> blocking
  [1058, "HR-HRIS-ADMIN", "informed", false],
  // 239 Manage separation
  [239, "HR-PEOPLE-OPS-SPECIALIST", "responsible", false],
  [239, "HR-BUSINESS-PARTNER", "accountable", false],
  [239, "PEOPLE-MANAGER", "consulted", false],
  [239, "HR-HRIS-ADMIN", "informed", false],
  // 240 Relocate employees and manage assignments (transfers / employment events)
  [240, "HR-PEOPLE-OPS-SPECIALIST", "responsible", false],
  [240, "PEOPLE-MANAGER", "accountable", false],
  [240, "HR-BUSINESS-PARTNER", "consulted", false],
  [240, "HR-HRIS-ADMIN", "informed", false],
  // 97 Create organizational design (positions + org units)
  [97, "HR-ORG-DESIGN-ANALYST", "responsible", false],
  [97, "HR-BUSINESS-PARTNER", "accountable", false],
  [97, "PEOPLE-MANAGER", "consulted", false],
  [97, "HR-HRIS-ADMIN", "informed", false],
  // 92 Conduct organization restructuring opportunities (org_units.reorganized)
  [92, "HR-ORG-DESIGN-ANALYST", "responsible", false],
  [92, "HR-BUSINESS-PARTNER", "accountable", false],
  [92, "PEOPLE-MANAGER", "consulted", false],
  // 995 Develop and maintain job descriptions (job_profiles)
  [995, "HR-ORG-DESIGN-ANALYST", "responsible", false],
  [995, "HR-HRIS-ADMIN", "accountable", false],
  [995, "HR-BUSINESS-PARTNER", "consulted", false],
];

// B10b backfill: [handoff_id, payload_data_object_id, target_module] - only patch if NULL today.
const HANDOFF_BACKFILL: [number, number, number][] = [
  [1016, 218, 54], // project_assignment.confirmed -> module 54 consumes project_assignments
  [1022, 726, 54], // project_resource_allocation.committed -> module 54 consumes project_resource_allocations
  [1026, 725, 54], // resource_skill_inventory.updated -> module 54 consumes resource_skill_inventories
];

const roleIdByCode: Record<string, number> = {};

// 1. personas (create the 4 new; resolve the 2 accreted)
for (const p of PERSONAS) {
  const existing = await pg("GET", `/domain_roles?role_code=eq.${p.role_code}&select=id`);
  if (existing && existing.length) {
    roleIdByCode[p.role_code] = existing[0].id as number;
    console.log(`persona exists:  ${p.role_code} (#${existing[0].id})`);
    continue;
  }
  const created = await pg("POST", "/domain_roles", p);
  roleIdByCode[p.role_code] = created[0].id as number;
  console.log(`persona created: ${p.role_code} (#${created[0].id})`);
}
for (const code of ACCRETE_CODES) {
  const existing = await pg("GET", `/domain_roles?role_code=eq.${code}&select=id`);
  if (!existing || !existing.length) throw new Error(`expected existing persona ${code} not found`);
  roleIdByCode[code] = existing[0].id as number;
  console.log(`persona accrete: ${code} (#${existing[0].id})`);
}

// 2. role_modules reach
let rmCreated = 0;
for (const [code, rows] of Object.entries(REACH)) {
  const rid = roleIdByCode[code];
  for (const [mid, level] of rows) {
    const ex = await pg("GET", `/role_modules?role_id=eq.${rid}&domain_module_id=eq.${mid}&select=id`);
    if (ex && ex.length) continue;
    await pg("POST", "/role_modules", { role_id: rid, domain_module_id: mid, interaction_level: level });
    rmCreated++;
  }
}
console.log(`role_modules created: ${rmCreated}`);

// 3. lifecycle process_id wiring (fill NULL only)
let wired = 0;
for (const [doid, state, pid] of WIRING) {
  const ex = await pg("GET", `/data_object_lifecycle_states?data_object_id=eq.${doid}&state_name=eq.${state}&select=process_id`);
  if (ex && ex.length && ex[0].process_id != null && ex[0].process_id !== pid) {
    console.log(`SKIP wiring ${doid}.${state}: already wired to ${ex[0].process_id} (would overwrite)`);
    continue;
  }
  await pg("PATCH", `/data_object_lifecycle_states?data_object_id=eq.${doid}&state_name=eq.${state}`, { process_id: pid });
  wired++;
}
console.log(`lifecycle process_id wirings applied: ${wired}`);

// 4. process_raci
let raciCreated = 0;
for (const [pid, code, letter, blocking] of RACI) {
  const rid = roleIdByCode[code];
  const ex = await pg("GET", `/process_raci?process_id=eq.${pid}&actor_role_id=eq.${rid}&raci=eq.${letter}&select=id`);
  if (ex && ex.length) continue;
  await pg("POST", "/process_raci", { process_id: pid, actor_role_id: rid, raci: letter, consultation_blocking: blocking });
  raciCreated++;
}
console.log(`process_raci created: ${raciCreated}`);

// 5. B10b handoff backfill (fill NULL target_domain_module_id only)
let hfPatched = 0;
for (const [hid, payload, mod] of HANDOFF_BACKFILL) {
  const ex = await pg("GET", `/handoffs?id=eq.${hid}&select=target_domain_module_id,data_object_id`);
  if (!ex || !ex.length) { console.log(`SKIP handoff ${hid}: not found`); continue; }
  if (ex[0].target_domain_module_id != null) { console.log(`SKIP handoff ${hid}: already ${ex[0].target_domain_module_id}`); continue; }
  if (ex[0].data_object_id !== payload) { console.log(`SKIP handoff ${hid}: payload drift (${ex[0].data_object_id} != ${payload})`); continue; }
  await pg("PATCH", `/handoffs?id=eq.${hid}`, { target_domain_module_id: mod });
  hfPatched++;
}
console.log(`handoff target_domain_module_id backfilled: ${hfPatched}`);
console.log("done.");
