#!/usr/bin/env bun
// APM refresh Tranche 3 — Phase E (roles + permissions + bundles).
//
//  * permissions: 3 baseline + 6 workflow gates for PORTFOLIO-REGISTRY,
//                 3 baseline + 1 workflow gate for RATIONALIZATION
//  * permission_hierarchy: admin→manage→read, admin→each workflow gate
//  * roles: ENTERPRISE-ARCHITECT (cross-fn),
//           IT-INFRA-APPLICATION-OWNER, IT-INFRA-PORTFOLIO-MANAGER (under IT Infrastructure)
//  * role_modules: 2-module floor satisfied per role
//  * role_permissions: bundles per role

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
  const ec = await proc.exited;
  if (ec !== 0) throw new Error(`semantius failed (${ec}): ${stderr}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
const post = (p: string, body: Row[]) => body.length ? call({ method: "POST", path: p, body }) : Promise.resolve([]);

const PLATFORM_MODULE_ID = 1001;       // domain_map module
const M_REGISTRY = 103;                // APM-PORTFOLIO-REGISTRY
const M_RATIONAL = 104;                // APM-RATIONALIZATION
const BF_IT_INFRA = 58;                // business_function: IT Infrastructure

// ============================================================
// 1. permissions
// ============================================================
type PermDef = { name: string; tier: string; description: string; moduleId: number };
const permissions: PermDef[] = [
  // PORTFOLIO-REGISTRY baseline
  { name: "apm-portfolio-registry:read", tier: "baseline-read", description: "Read access to every entity in the APM-PORTFOLIO-REGISTRY module.", moduleId: M_REGISTRY },
  { name: "apm-portfolio-registry:manage", tier: "baseline-manage", description: "Edit operational records in the APM-PORTFOLIO-REGISTRY module.", moduleId: M_REGISTRY },
  { name: "apm-portfolio-registry:admin", tier: "baseline-admin", description: "Edit reference data in the APM-PORTFOLIO-REGISTRY module and inherit every workflow gate below via permission_hierarchy.", moduleId: M_REGISTRY },
  // PORTFOLIO-REGISTRY workflow gates
  { name: "apm-portfolio-registry:sunset_application", tier: "workflow-gate", description: "Transition `enterprise_applications` into state `sunsetting`.", moduleId: M_REGISTRY },
  { name: "apm-portfolio-registry:decline_technology_platform", tier: "workflow-gate", description: "Transition `technology_platforms` into state `declining`.", moduleId: M_REGISTRY },
  { name: "apm-portfolio-registry:retire_technology_platform", tier: "workflow-gate", description: "Transition `technology_platforms` into state `retired`.", moduleId: M_REGISTRY },
  { name: "apm-portfolio-registry:publish_business_capability_map", tier: "workflow-gate", description: "Transition `business_capability_maps` into state `published`.", moduleId: M_REGISTRY },
  { name: "apm-portfolio-registry:deprecate_application_interface", tier: "workflow-gate", description: "Transition `application_interfaces` into state `deprecated`.", moduleId: M_REGISTRY },
  { name: "apm-portfolio-registry:retire_application_interface", tier: "workflow-gate", description: "Transition `application_interfaces` into state `retired`.", moduleId: M_REGISTRY },
  // RATIONALIZATION baseline
  { name: "apm-rationalization:read", tier: "baseline-read", description: "Read access to every entity in the APM-RATIONALIZATION module.", moduleId: M_RATIONAL },
  { name: "apm-rationalization:manage", tier: "baseline-manage", description: "Edit operational records in the APM-RATIONALIZATION module.", moduleId: M_RATIONAL },
  { name: "apm-rationalization:admin", tier: "baseline-admin", description: "Edit reference data in the APM-RATIONALIZATION module and inherit every workflow gate below via permission_hierarchy.", moduleId: M_RATIONAL },
  // RATIONALIZATION workflow gate
  { name: "apm-rationalization:approve_technology_fit_assessment", tier: "workflow-gate", description: "Transition `technology_fit_assessments` into state `approved` (architect-of-record sign-off).", moduleId: M_RATIONAL },
];

async function step1_permissions(): Promise<Map<string, number>> {
  console.log("\n[1] permissions");
  const existing = await get(`/permissions?domain_module_id=in.(${M_REGISTRY},${M_RATIONAL})&select=id,permission_name`);
  const map = new Map<string, number>();
  for (const r of existing) map.set(String(r.permission_name), Number(r.id));
  const missing = permissions
    .filter(p => !map.has(p.name))
    .map(p => ({
      permission_name: p.name,
      description: p.description,
      module_id: PLATFORM_MODULE_ID,
      domain_module_id: p.moduleId,
      tier: p.tier,
    }));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new`);
    await post("/permissions", missing);
    const re = await get(`/permissions?domain_module_id=in.(${M_REGISTRY},${M_RATIONAL})&select=id,permission_name`);
    map.clear();
    for (const r of re) map.set(String(r.permission_name), Number(r.id));
  } else {
    console.log("  nothing to insert");
  }
  return map;
}

// ============================================================
// 2. permission_hierarchy (admin→manage→read, admin→each gate)
// ============================================================
async function step2_permissionHierarchy(pmap: Map<string, number>) {
  console.log("\n[2] permission_hierarchy");
  const edges: Array<{ including: string; included: string }> = [
    // REGISTRY
    { including: "apm-portfolio-registry:admin", included: "apm-portfolio-registry:manage" },
    { including: "apm-portfolio-registry:manage", included: "apm-portfolio-registry:read" },
    { including: "apm-portfolio-registry:admin", included: "apm-portfolio-registry:sunset_application" },
    { including: "apm-portfolio-registry:admin", included: "apm-portfolio-registry:decline_technology_platform" },
    { including: "apm-portfolio-registry:admin", included: "apm-portfolio-registry:retire_technology_platform" },
    { including: "apm-portfolio-registry:admin", included: "apm-portfolio-registry:publish_business_capability_map" },
    { including: "apm-portfolio-registry:admin", included: "apm-portfolio-registry:deprecate_application_interface" },
    { including: "apm-portfolio-registry:admin", included: "apm-portfolio-registry:retire_application_interface" },
    // RATIONAL
    { including: "apm-rationalization:admin", included: "apm-rationalization:manage" },
    { including: "apm-rationalization:manage", included: "apm-rationalization:read" },
    { including: "apm-rationalization:admin", included: "apm-rationalization:approve_technology_fit_assessment" },
  ];
  const allIds = edges.flatMap(e => [pmap.get(e.including)!, pmap.get(e.included)!]);
  const existing = await get(`/permission_hierarchy?including_permission_id=in.(${[...new Set(allIds)].join(",")})&select=including_permission_id,included_permission_id`);
  const existingSet = new Set(existing.map(r => `${r.including_permission_id}.${r.included_permission_id}`));
  const missing = edges
    .map(e => ({ including_permission_id: pmap.get(e.including)!, included_permission_id: pmap.get(e.included)! }))
    .filter(e => !existingSet.has(`${e.including_permission_id}.${e.included_permission_id}`))
    .map(e => ({ ...e, origin: "model" }));
  if (missing.length === 0) { console.log("  nothing to insert"); return; }
  console.log(`  inserting ${missing.length} new`);
  await post("/permission_hierarchy", missing);
}

// ============================================================
// 3. roles
// ============================================================
type RoleDef = {
  roleCode: string;
  roleName: string;
  slug: string;
  description: string;
  businessFunctionId: number | null;
  moduleInteractions: Array<{ moduleId: number; interactionLevel: string }>;
  bundle: string[];
};
const roles: RoleDef[] = [
  {
    roleCode: "ENTERPRISE-ARCHITECT",
    roleName: "Enterprise Architect",
    slug: "enterprise_architect",
    description: "Cross-functional architect who owns the business capability map, the reference framework library, and the technology-fit methodology. Spans the registry seat (publishes the capability map) and the rationalization seat (approves fit assessments).",
    businessFunctionId: null,
    moduleInteractions: [
      { moduleId: M_REGISTRY, interactionLevel: "primary" },
      { moduleId: M_RATIONAL, interactionLevel: "primary" },
    ],
    bundle: [
      "apm-portfolio-registry:manage",
      "apm-portfolio-registry:publish_business_capability_map",
      "apm-rationalization:manage",
      "apm-rationalization:approve_technology_fit_assessment",
    ],
  },
  {
    roleCode: "IT-INFRA-APPLICATION-OWNER",
    roleName: "Application Owner",
    slug: "it_infra_application_owner",
    description: "Owns a specific enterprise application's portfolio metadata: lifecycle stage, interfaces, technology platform, cost data. Primary on the registry; reads scoring data from rationalization.",
    businessFunctionId: BF_IT_INFRA,
    moduleInteractions: [
      { moduleId: M_REGISTRY, interactionLevel: "primary" },
      { moduleId: M_RATIONAL, interactionLevel: "secondary" },
    ],
    bundle: [
      "apm-portfolio-registry:manage",
      "apm-rationalization:read",
    ],
  },
  {
    roleCode: "IT-INFRA-PORTFOLIO-MANAGER",
    roleName: "IT Portfolio Manager",
    slug: "it_infra_portfolio_manager",
    description: "Runs the portfolio rationalization cycle: TIME-scoring, sunset decisions, cost-visibility reporting to leadership. Admin-tier across both modules; expands permission_hierarchy at request time.",
    businessFunctionId: BF_IT_INFRA,
    moduleInteractions: [
      { moduleId: M_REGISTRY, interactionLevel: "primary" },
      { moduleId: M_RATIONAL, interactionLevel: "primary" },
    ],
    bundle: [
      "apm-portfolio-registry:admin",
      "apm-rationalization:admin",
    ],
  },
];

async function step3_roles(pmap: Map<string, number>) {
  console.log("\n[3] roles + role_modules + role_permissions");

  // Resolve existing roles by role_code
  const existingRoles = await get(`/roles?role_code=in.(${roles.map(r => `"${r.roleCode}"`).join(",")})&select=id,role_code`);
  const roleMap = new Map<string, number>();
  for (const r of existingRoles) roleMap.set(String(r.role_code), Number(r.id));

  // Insert missing roles
  const missingRoles = roles
    .filter(r => !roleMap.has(r.roleCode))
    .map(r => ({
      role_code: r.roleCode,
      role_name: r.roleName,
      slug: r.slug,
      description: r.description,
      origin: "model",
      module_id: PLATFORM_MODULE_ID,
      business_function_id: r.businessFunctionId,
    }));
  if (missingRoles.length > 0) {
    console.log(`  inserting ${missingRoles.length} new roles`);
    await post("/roles", missingRoles);
    const re = await get(`/roles?role_code=in.(${roles.map(r => `"${r.roleCode}"`).join(",")})&select=id,role_code`);
    roleMap.clear();
    for (const r of re) roleMap.set(String(r.role_code), Number(r.id));
  } else {
    console.log("  roles: nothing to insert");
  }

  // role_modules
  const existingRM = await get(`/role_modules?role_id=in.(${[...roleMap.values()].join(",")})&select=role_id,domain_module_id`);
  const existingRMSet = new Set(existingRM.map(r => `${r.role_id}:${r.domain_module_id}`));
  const newRM: Row[] = [];
  for (const r of roles) {
    const rid = roleMap.get(r.roleCode)!;
    for (const m of r.moduleInteractions) {
      if (existingRMSet.has(`${rid}:${m.moduleId}`)) continue;
      newRM.push({ role_id: rid, domain_module_id: m.moduleId, interaction_level: m.interactionLevel });
    }
  }
  if (newRM.length > 0) {
    console.log(`  role_modules: inserting ${newRM.length} new`);
    await post("/role_modules", newRM);
  } else {
    console.log("  role_modules: nothing to insert");
  }

  // role_permissions
  const existingRP = await get(`/role_permissions?role_id=in.(${[...roleMap.values()].join(",")})&select=role_id,permission_id`);
  const existingRPSet = new Set(existingRP.map(r => `${r.role_id}:${r.permission_id}`));
  const newRP: Row[] = [];
  for (const r of roles) {
    const rid = roleMap.get(r.roleCode)!;
    for (const permName of r.bundle) {
      const pid = pmap.get(permName);
      if (!pid) throw new Error(`unresolved permission in bundle: ${permName}`);
      if (existingRPSet.has(`${rid}:${pid}`)) continue;
      newRP.push({ role_id: rid, permission_id: pid });
    }
  }
  if (newRP.length > 0) {
    console.log(`  role_permissions: inserting ${newRP.length} new`);
    await post("/role_permissions", newRP);
  } else {
    console.log("  role_permissions: nothing to insert");
  }
}

async function main() {
  console.log("Tranche 3 starting");
  const pmap = await step1_permissions();
  await step2_permissionHierarchy(pmap);
  await step3_roles(pmap);
  console.log("\nTranche 3 done");
}
await main();
