#!/usr/bin/env bun
// .tmp_deploy/psa_audit_2026_06_06_personas.ts
//
// PSA state-driven audit 2026-06-06, EXECUTE item 5 (B1A-PHASE-P):
//   PSA is a 4-module domain with 0 personas (E1 fail). Author a TIGHT function-anchored
//   persona set per references/roles.md. PSA is owned by Business Operations (bf 34);
//   Finance (bf 4) + Accounting (bf 42) contribute. Authors, idempotently:
//     1. domain_roles  (4 personas, flat, no parent, function-scoped role_code)
//     2. role_modules  (reach across modules 86/87/88/89, >=2 per persona)
//     3. data_object_lifecycle_states.process_id  (process-to-permission edge on gated transitions)
//     4. process_raci  (responsibility rows; exactly one actor per row)
//   Does NOT author _core roles/permissions/role_permissions/permission_hierarchy
//   (the bundle is DERIVED). All domain_roles rows land at record_status='new' (default).
//
// PSA modules: 86 PROJECT-DELIVERY, 87 RESOURCE-MGMT, 88 TIME-EXPENSE, 89 PROJECT-FINANCIALS.
import { pg } from "../scripts/lib/catalog";

const BUSINESS_OPS = 34;
const FINANCE = 4;

const PERSONAS: {
  role_code: string;
  role_name: string;
  business_function_id: number | null;
  description: string;
}[] = [
  {
    role_code: "BUSINESS-OPS-DELIVERY-MANAGER",
    role_name: "Delivery Manager",
    business_function_id: BUSINESS_OPS,
    description:
      "Owns client engagements end to end: scopes the project, structures tasks and milestones, requests staffing, and drives delivery to completion. Accountable for on-time, on-scope delivery and for the project's billing readiness.",
  },
  {
    role_code: "BUSINESS-OPS-RESOURCE-MANAGER",
    role_name: "Resource Manager",
    business_function_id: BUSINESS_OPS,
    description:
      "Owns the staffing and capacity workflow: matches skilled people to project demand, plans and commits resource allocations, confirms and releases assignments, and watches utilization and skill gaps across the billable workforce.",
  },
  {
    role_code: "BUSINESS-OPS-CONSULTANT",
    role_name: "Consultant",
    business_function_id: BUSINESS_OPS,
    description:
      "The billable practitioner who executes assigned project tasks and logs time and expenses against the engagements they work. Drives tasks to completion and submits clean actuals for approval and billing.",
  },
  {
    role_code: "FINANCE-PROJECT-CONTROLLER",
    role_name: "Project Financial Controller",
    business_function_id: FINANCE,
    description:
      "Owns project billing and revenue: manages budgets and rate cards, invoices reached milestones and approved time, and recognizes project revenue. Accountable for accurate, auditable project financials feeding the general ledger.",
  },
];

// role_code -> [domain_module_id, interaction_level][]
const REACH: Record<string, [number, string][]> = {
  "BUSINESS-OPS-DELIVERY-MANAGER": [
    [86, "primary"],
    [87, "secondary"],
    [88, "secondary"],
    [89, "secondary"],
  ],
  "BUSINESS-OPS-RESOURCE-MANAGER": [
    [87, "primary"],
    [86, "secondary"],
    [88, "secondary"],
  ],
  "BUSINESS-OPS-CONSULTANT": [
    [86, "primary"],
    [88, "primary"],
    [87, "secondary"],
  ],
  "FINANCE-PROJECT-CONTROLLER": [
    [89, "primary"],
    [88, "secondary"],
    [86, "secondary"],
  ],
};

// [data_object_id, state_name, process_id] : wire the gated transition to its PCF process.
// Only gates that map cleanly to a process; the process must carry an R/A RACI row below.
const WIRING: [number, string, number][] = [
  [216, "staffing_required", 179], // service_projects -> Manage service delivery resource demand
  [216, "delivery_complete", 52], //  service_projects -> Deploy services/solutions
  [216, "closed", 52], //             service_projects -> Deploy services/solutions
  [217, "completed", 52], //          project_tasks    -> Deploy services/solutions
  [218, "confirmed", 180], //         project_assignments -> Create and manage resource plan
  [726, "committed", 180], //         project_resource_allocations -> Create and manage resource plan
  [219, "reached", 302], //           project_billing_milestones -> Invoice customer
  [219, "invoiced", 302], //          project_billing_milestones -> Invoice customer
];

// [process_id, role_code, raci, consultation_blocking]
const RACI: [number, string, string, boolean][] = [
  // 179 Manage service delivery resource demand (staffing)
  [179, "BUSINESS-OPS-RESOURCE-MANAGER", "responsible", false],
  [179, "BUSINESS-OPS-DELIVERY-MANAGER", "accountable", false],
  [179, "BUSINESS-OPS-CONSULTANT", "informed", false],
  // 180 Create and manage resource plan (allocations + assignment confirm)
  [180, "BUSINESS-OPS-RESOURCE-MANAGER", "responsible", false],
  [180, "BUSINESS-OPS-DELIVERY-MANAGER", "consulted", false],
  // 52 Deploy services/solutions (delivery execution + task/project completion)
  [52, "BUSINESS-OPS-DELIVERY-MANAGER", "responsible", false],
  [52, "BUSINESS-OPS-CONSULTANT", "responsible", false],
  [52, "FINANCE-PROJECT-CONTROLLER", "informed", false],
  // 302 Invoice customer (billing + rev-rec)
  [302, "FINANCE-PROJECT-CONTROLLER", "responsible", false],
  [302, "BUSINESS-OPS-DELIVERY-MANAGER", "consulted", false],
];

const roleIdByCode: Record<string, number> = {};

console.log("== 1. domain_roles (personas) ==");
for (const p of PERSONAS) {
  const existing = await pg("GET", `/domain_roles?role_code=eq.${p.role_code}&select=id`);
  if (existing && existing.length) {
    roleIdByCode[p.role_code] = existing[0].id as number;
    console.log(`  persona exists:  ${p.role_code} (#${existing[0].id})`);
    continue;
  }
  const created = await pg("POST", "/domain_roles", p);
  roleIdByCode[p.role_code] = created[0].id as number;
  console.log(`  persona created: ${p.role_code} (#${created[0].id})`);
}

console.log("== 2. role_modules (reach) ==");
let rmCreated = 0;
for (const [code, rows] of Object.entries(REACH)) {
  const rid = roleIdByCode[code];
  for (const [mid, level] of rows) {
    const ex = await pg(
      "GET",
      `/role_modules?role_id=eq.${rid}&domain_module_id=eq.${mid}&select=id`,
    );
    if (ex && ex.length) continue;
    await pg("POST", "/role_modules", {
      role_id: rid,
      domain_module_id: mid,
      interaction_level: level,
    });
    rmCreated++;
  }
}
console.log(`  role_modules created: ${rmCreated}`);

console.log("== 3. data_object_lifecycle_states.process_id (gate wiring) ==");
let wired = 0;
let wireSkipped = 0;
for (const [doid, state, pid] of WIRING) {
  const [cur] = await pg(
    "GET",
    `/data_object_lifecycle_states?data_object_id=eq.${doid}&state_name=eq.${state}&select=process_id`,
  );
  if (cur && cur.process_id !== null && cur.process_id !== undefined) {
    console.log(`  skip (already wired): do ${doid} / ${state} -> ${cur.process_id}`);
    wireSkipped++;
    continue;
  }
  await pg(
    "PATCH",
    `/data_object_lifecycle_states?data_object_id=eq.${doid}&state_name=eq.${state}`,
    { process_id: pid },
  );
  console.log(`  wired: do ${doid} / ${state} -> process ${pid}`);
  wired++;
}
console.log(`  lifecycle process_id wirings applied: ${wired}, skipped: ${wireSkipped}`);

console.log("== 4. process_raci (responsibility) ==");
let raciCreated = 0;
for (const [pid, code, letter, blocking] of RACI) {
  const rid = roleIdByCode[code];
  const ex = await pg(
    "GET",
    `/process_raci?process_id=eq.${pid}&actor_role_id=eq.${rid}&raci=eq.${letter}&select=id`,
  );
  if (ex && ex.length) continue;
  await pg("POST", "/process_raci", {
    process_id: pid,
    actor_role_id: rid,
    raci: letter,
    consultation_blocking: blocking,
  });
  raciCreated++;
}
console.log(`  process_raci created: ${raciCreated}`);

console.log("\ndone.");
console.log("UI: https://tests.semantius.app/domain_map/domain_roles");
console.log("UI: https://tests.semantius.app/domain_map/role_modules");
console.log("UI: https://tests.semantius.app/domain_map/process_raci");
