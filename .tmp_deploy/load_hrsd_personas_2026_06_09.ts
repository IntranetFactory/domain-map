#!/usr/bin/env bun
// .tmp_deploy/load_hrsd_personas_2026_06_09.ts
//
// HRSD Phase E: author the persona / RACI layer FRESH (the _core roles were deleted in
// Plan 3; this domain has read 0 personas since, an E1 fail on a 3-module domain). The
// 2026-06-07 audit DEFERRED this; Rule #21 says a review executes agent-doable additive
// work, so it runs here. Function-anchored on HR Service Delivery (business_function 76,
// the domain's owner function per business_function_domains). All rows land at the table
// default record_status (= new); Rule #1 forbids stamping approved.
//
// Authors, idempotently (read-before-create on the natural key):
//   1. domain_roles  (3 personas, function-scoped on HR Service Delivery / fn 76)
//   2. role_modules  (reach across the 3 HRSD modules; every persona >= 2 modules)
//   3. data_object_lifecycle_states.process_id  (wire hr_cases' 5 gates to PCF 242)
//   4. process_raci  (R/A/I on PCF 242 "Manage employee inquiry process")
//
// Re-runnable. After it, the HRSD blueprints can be regenerated to fill §9.
import { pg } from "../scripts/lib/catalog";

const HR_SERVICE_DELIVERY = 76; // business_functions.id, name "HR Service Delivery" (owner of domain 22)

// module codes -> ids: HRSD-CASE-MGMT=75  HRSD-EMPLOYEE-PORTAL=76  HRSD-KNOWLEDGE=77
const CASE_MGMT = 75;
const PORTAL = 76;
const KNOWLEDGE = 77;

// PCF process the hr_cases lifecycle realizes.
const INQUIRY_PROCESS = 242; // "Manage employee inquiry process" (apqc_pcf_cross_industry, external_id 10523, L3)

// Function-scoped: FUNCTION-CODE = HR Service Delivery's acronym HRSD (function 76), NOT the
// domain prefix the role-naming anti-pattern warns about (the domain and the function are the
// same concept here). Lands at record_status=new for review; rename in-record if preferred.
const PERSONAS: { role_code: string; role_name: string; business_function_id: number | null; description: string }[] = [
  { role_code: "HRSD-CASE-AGENT", role_name: "HR Case Agent", business_function_id: HR_SERVICE_DELIVERY, description: "Frontline HR service agent: picks up employee cases from the portal queue, triages and classifies them, works them to resolution, and attaches knowledge. Reopens closed cases when something changes." },
  { role_code: "HRSD-SERVICE-MANAGER", role_name: "HR Service Manager", business_function_id: HR_SERVICE_DELIVERY, description: "Accountable for HR service delivery output: owns the case queue, SLAs, routing rules, and the approval gate. Oversees workload, aging, and escalations across the case workflow and the employee portal." },
  { role_code: "HRSD-KNOWLEDGE-MANAGER", role_name: "HR Knowledge Manager", business_function_id: HR_SERVICE_DELIVERY, description: "Owns the HR knowledge base: curates and publishes articles, organizes them by case category, and promotes resolved cases into reusable knowledge to deflect future requests." },
];

const REACH: Record<string, [number, string][]> = {
  // CASE-MGMT is the agent's core surface; portal + knowledge are touched (intake, article attach).
  "HRSD-CASE-AGENT": [[CASE_MGMT, "primary"], [KNOWLEDGE, "secondary"], [PORTAL, "secondary"]],
  // Manager owns the case queue (primary); portal + knowledge oversight are secondary.
  "HRSD-SERVICE-MANAGER": [[CASE_MGMT, "primary"], [PORTAL, "secondary"], [KNOWLEDGE, "secondary"]],
  // Knowledge manager lives in the KB (primary); curates from resolved cases (secondary).
  "HRSD-KNOWLEDGE-MANAGER": [[KNOWLEDGE, "primary"], [CASE_MGMT, "secondary"]],
};

// [data_object_id, state_name, process_id] : wire hr_cases (192) gated transitions to PCF 242.
// The five requires_permission=true states on the 8-state hr_cases machine. intake / in_progress /
// closed are not gated (no requires_permission), so they carry no process_id.
const WIRING: [number, string, number][] = [
  [192, "triaged", INQUIRY_PROCESS],
  [192, "assigned", INQUIRY_PROCESS],
  [192, "pending_approval", INQUIRY_PROCESS],
  [192, "resolved", INQUIRY_PROCESS],
  [192, "reopened", INQUIRY_PROCESS],
];

// [process_id, role_code, raci, consultation_blocking]
// R = agent (works the case gates + hr_cases write tier); A = manager (approval gate + admin tier);
// I = knowledge manager (notified as resolved cases become knowledge candidates).
const RACI: [number, string, string, boolean][] = [
  [INQUIRY_PROCESS, "HRSD-CASE-AGENT", "responsible", false],
  [INQUIRY_PROCESS, "HRSD-SERVICE-MANAGER", "accountable", false],
  [INQUIRY_PROCESS, "HRSD-KNOWLEDGE-MANAGER", "informed", false],
];

const roleIdByCode: Record<string, number> = {};

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

let wired = 0;
for (const [doid, state, pid] of WIRING) {
  await pg("PATCH", `/data_object_lifecycle_states?data_object_id=eq.${doid}&state_name=eq.${state}`, { process_id: pid });
  wired++;
}
console.log(`lifecycle process_id wirings applied: ${wired}`);

let raciCreated = 0;
for (const [pid, code, letter, blocking] of RACI) {
  const rid = roleIdByCode[code];
  const ex = await pg("GET", `/process_raci?process_id=eq.${pid}&actor_role_id=eq.${rid}&raci=eq.${letter}&select=id`);
  if (ex && ex.length) continue;
  await pg("POST", "/process_raci", { process_id: pid, actor_role_id: rid, raci: letter, consultation_blocking: blocking });
  raciCreated++;
}
console.log(`process_raci created: ${raciCreated}`);
console.log("done.");
