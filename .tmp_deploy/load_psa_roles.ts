// PSA Phase E (E1-E6): materialize PSA permissions from baseline tiers + lifecycle
// state gates, then load 5 function-scoped roles with role_modules and role_permissions.
//
// Gate permissions are derived live from data_object_lifecycle_states where
// requires_permission=true on PSA masters (216,217,218,219,725,726).
// PSA-TIME-EXPENSE has no lifecycle gates (objects mastered elsewhere); only
// baseline tiers are materialized for that module.

async function pg(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<unknown> {
  const args = { method, path, ...(body !== undefined ? { body } : {}) };
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(args));
  await proc.stdin.end();
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`pg ${method} ${path} failed (${code}): ${err || out}`);
  const t = out.trim();
  return t ? JSON.parse(t) : null;
}

const BUSINESS_OPS_FN_ID = 34;
const DOMAIN_MAP_MODULE_ID = 1001;

const MODULE_CODES: Record<number, string> = {
  86: "psa-project-delivery",
  87: "psa-resource-mgmt",
  88: "psa-time-expense",
  89: "psa-project-financials",
};

type PermSpec = {
  permission_name: string;
  domain_module_id: number;
  tier: "baseline-read" | "baseline-manage" | "baseline-admin" | "workflow-gate";
  description: string;
};

async function buildPermissions(): Promise<PermSpec[]> {
  console.log("\n[Step 0] Derive permissions from lifecycle states");
  const out: PermSpec[] = [];

  // Baseline tiers for every module
  for (const [idStr, code] of Object.entries(MODULE_CODES)) {
    const moduleId = Number(idStr);
    out.push(
      { permission_name: `${code}:read`,   domain_module_id: moduleId, tier: "baseline-read",   description: `Read access to ${code} records.` },
      { permission_name: `${code}:manage`, domain_module_id: moduleId, tier: "baseline-manage", description: `Manage records and execute non-admin workflows in ${code}.` },
      { permission_name: `${code}:admin`,  domain_module_id: moduleId, tier: "baseline-admin",  description: `Full administrative authority over ${code}: configuration, all workflow gates, override scopes.` },
    );
  }

  // Workflow gates from lifecycle states (requires_permission=true)
  const states = (await pg(
    "GET",
    "/data_object_lifecycle_states?data_object_id=in.(216,217,218,219,725,726)&requires_permission=eq.true&select=state_name,permission_verb_override,domain_module_id,description",
  )) as Array<{ state_name: string; permission_verb_override: string; domain_module_id: number; description: string }>;
  for (const s of states) {
    const code = MODULE_CODES[s.domain_module_id];
    if (!code) {
      console.log(`  WARN: lifecycle state has unknown module id ${s.domain_module_id}; skipping`);
      continue;
    }
    const verb = s.permission_verb_override || s.state_name;
    out.push({
      permission_name: `${code}:${verb}`,
      domain_module_id: s.domain_module_id,
      tier: "workflow-gate",
      description: s.description,
    });
  }

  console.log(`  built ${out.length} permission specs (${out.filter((p) => p.tier === "workflow-gate").length} workflow gates)`);
  return out;
}

// --- Roles ---

type RoleSpec = {
  role_code: string;
  role_name: string;
  description: string;
  business_function_id: number | null;
  role_modules: Array<{ domain_module_id: number; interaction_level: "primary" | "secondary"; notes: string }>;
  bundle: string[];
};

const ROLES: RoleSpec[] = [
  {
    role_code: "BUSINESS-OPS-DELIVERY-MANAGER",
    role_name: "Delivery Manager",
    description: "Owns engagement delivery end to end: project scoping, plan, tasks, milestones, customer-accepted completion. Reads project financials to monitor margin and rev-rec but does not run the finance workflow.",
    business_function_id: BUSINESS_OPS_FN_ID,
    role_modules: [
      { domain_module_id: 86, interaction_level: "primary",   notes: "Project delivery admin: full workflow authority." },
      { domain_module_id: 89, interaction_level: "secondary", notes: "Reads project financials to track margin and milestone billing state." },
    ],
    bundle: [
      "psa-project-delivery:admin",
      "psa-project-financials:read",
    ],
  },
  {
    role_code: "BUSINESS-OPS-RESOURCE-MANAGER",
    role_name: "Resource Manager",
    description: "Owns the resource pool, skills inventory, allocation forecasts and project assignments. Watches utilisation and conflict signals. Reads project delivery state to align supply with demand.",
    business_function_id: BUSINESS_OPS_FN_ID,
    role_modules: [
      { domain_module_id: 87, interaction_level: "primary",   notes: "Resource management admin: full workflow authority." },
      { domain_module_id: 86, interaction_level: "secondary", notes: "Reads project delivery state to match supply to demand." },
    ],
    bundle: [
      "psa-resource-mgmt:admin",
      "psa-project-delivery:read",
    ],
  },
  {
    role_code: "BUSINESS-OPS-PROJECT-FINANCE-CONTROLLER",
    role_name: "Project Finance Controller",
    description: "Owns project financials: billing rate cards, contractual milestones, invoice triggering, ASC 606 revenue recognition. Reads project delivery and time/expense rollups to gate billing.",
    business_function_id: BUSINESS_OPS_FN_ID,
    role_modules: [
      { domain_module_id: 89, interaction_level: "primary",   notes: "Project financials admin: full workflow authority including revenue recognition." },
      { domain_module_id: 86, interaction_level: "secondary", notes: "Reads project delivery state to validate milestone readiness." },
      { domain_module_id: 88, interaction_level: "secondary", notes: "Reads time and expense rollups to feed billing." },
    ],
    bundle: [
      "psa-project-financials:admin",
      "psa-project-delivery:read",
      "psa-time-expense:read",
    ],
  },
  {
    role_code: "BUSINESS-OPS-CONSULTANT",
    role_name: "Consultant",
    description: "Delivery resource on projects: logs time and expenses against assigned project codes, updates task status, contributes to milestone completion. Reads own assignments and project context.",
    business_function_id: BUSINESS_OPS_FN_ID,
    role_modules: [
      { domain_module_id: 88, interaction_level: "primary",   notes: "Time and expense capture against project codes." },
      { domain_module_id: 86, interaction_level: "secondary", notes: "Reads project / task plan and updates task status on assigned work." },
    ],
    bundle: [
      "psa-time-expense:manage",
      "psa-project-delivery:read",
      "psa-project-delivery:start_project_task",
      "psa-project-delivery:complete_project_task",
      "psa-project-delivery:block_project_task",
    ],
  },
  {
    role_code: "PROJECT-SPONSOR",
    role_name: "Project Sponsor",
    description: "Customer-side or internal business owner of a project's outcomes. Approves customer-accept signoff on delivery completion and milestone reached events. Does not run delivery or finance day to day. Cross-functional: this role sits outside the services-delivery org.",
    business_function_id: null,
    role_modules: [
      { domain_module_id: 86, interaction_level: "secondary", notes: "Reads project status; approves customer-accept signoff at delivery_complete." },
      { domain_module_id: 89, interaction_level: "secondary", notes: "Reads milestone state; approves milestone signoff on reached." },
    ],
    bundle: [
      "psa-project-delivery:read",
      "psa-project-delivery:complete_service_project",
      "psa-project-financials:read",
      "psa-project-financials:reach_project_billing_milestone",
    ],
  },
];

function slugify(roleCode: string): string {
  return roleCode.toLowerCase().replace(/-/g, "_");
}

async function upsertPermissions(specs: PermSpec[]): Promise<Map<string, number>> {
  console.log("\n[Step 1] Upsert permissions for modules 86-89");
  const names = specs.map((p) => p.permission_name);
  const existing = (await pg(
    "GET",
    `/permissions?permission_name=in.(${names.join(",")})&select=id,permission_name`,
  )) as Array<{ id: number; permission_name: string }>;
  const have = new Map(existing.map((r) => [r.permission_name, r.id]));
  const missing = specs.filter((p) => !have.has(p.permission_name)).map((p) => ({
    ...p,
    module_id: DOMAIN_MAP_MODULE_ID,
  }));
  if (missing.length === 0) {
    console.log("  all permissions already present");
  } else {
    const inserted = (await pg("POST", "/permissions?select=id,permission_name", missing)) as Array<{
      id: number; permission_name: string;
    }>;
    console.log(`  INSERT permissions: ${inserted.length}`);
    for (const r of inserted) have.set(r.permission_name, r.id);
  }
  const referenced = new Set<string>();
  for (const r of ROLES) for (const p of r.bundle) referenced.add(p);
  for (const name of referenced) {
    if (!have.has(name)) throw new Error(`permission missing after upsert: ${name}`);
  }
  return have;
}

async function upsertRoles(): Promise<Map<string, number>> {
  console.log("\n[Step 2] Upsert roles");
  const codes = ROLES.map((r) => r.role_code);
  const existing = (await pg(
    "GET",
    `/roles?role_code=in.(${codes.join(",")})&select=id,role_code`,
  )) as Array<{ id: number; role_code: string }>;
  const have = new Map(existing.map((r) => [r.role_code, r.id]));
  const missing = ROLES.filter((r) => !have.has(r.role_code)).map((r) => ({
    role_code: r.role_code,
    role_name: r.role_name,
    slug: slugify(r.role_code),
    description: r.description,
    business_function_id: r.business_function_id,
    module_id: DOMAIN_MAP_MODULE_ID,
    origin: "model",
  }));
  if (missing.length === 0) {
    console.log("  all roles already present");
  } else {
    const inserted = (await pg("POST", "/roles?select=id,role_code", missing)) as Array<{
      id: number; role_code: string;
    }>;
    console.log(`  INSERT roles: ${inserted.length}`);
    for (const r of inserted) have.set(r.role_code, r.id);
  }
  return have;
}

async function upsertRoleModules(roleMap: Map<string, number>): Promise<void> {
  console.log("\n[Step 3] Upsert role_modules");
  for (const spec of ROLES) {
    const roleId = roleMap.get(spec.role_code)!;
    const existing = (await pg(
      "GET",
      `/role_modules?role_id=eq.${roleId}&select=domain_module_id`,
    )) as Array<{ domain_module_id: number }>;
    const have = new Set(existing.map((r) => r.domain_module_id));
    const rows = spec.role_modules
      .filter((rm) => !have.has(rm.domain_module_id))
      .map((rm) => ({ role_id: roleId, ...rm }));
    if (rows.length === 0) {
      console.log(`  ${spec.role_code}: all role_modules present`);
      continue;
    }
    const inserted = await pg("POST", "/role_modules?select=domain_module_id", rows);
    console.log(`  ${spec.role_code}: INSERT role_modules ${Array.isArray(inserted) ? inserted.length : 0}`);
  }
}

async function upsertRolePermissions(roleMap: Map<string, number>, permMap: Map<string, number>): Promise<void> {
  console.log("\n[Step 4] Upsert role_permissions");
  for (const spec of ROLES) {
    const roleId = roleMap.get(spec.role_code)!;
    const existing = (await pg(
      "GET",
      `/role_permissions?role_id=eq.${roleId}&select=permission_id`,
    )) as Array<{ permission_id: number }>;
    const have = new Set(existing.map((r) => r.permission_id));
    const rows = spec.bundle
      .map((name) => permMap.get(name)!)
      .filter((pid) => !have.has(pid))
      .map((pid) => ({ role_id: roleId, permission_id: pid }));
    if (rows.length === 0) {
      console.log(`  ${spec.role_code}: all role_permissions present`);
      continue;
    }
    const inserted = await pg("POST", "/role_permissions?select=permission_id", rows);
    console.log(`  ${spec.role_code}: INSERT role_permissions ${Array.isArray(inserted) ? inserted.length : 0}`);
  }
}

async function verify(): Promise<void> {
  console.log("\nPost-load verification");
  const fnRoles = (await pg(
    "GET",
    `/roles?business_function_id=eq.${BUSINESS_OPS_FN_ID}&role_code=like.BUSINESS-OPS-*&select=id,role_code`,
  )) as Array<{ id: number; role_code: string }>;
  const xfRoles = (await pg(
    "GET",
    "/roles?business_function_id=is.null&role_code=eq.PROJECT-SPONSOR&select=id,role_code",
  )) as Array<{ id: number; role_code: string }>;
  const allRoles = [...fnRoles, ...xfRoles];
  console.log(`  PSA roles: ${allRoles.length}`);
  for (const r of allRoles) {
    const rms = (await pg(
      "GET",
      `/role_modules?role_id=eq.${r.id}&select=domain_module_id,interaction_level`,
    )) as Array<{ domain_module_id: number; interaction_level: string }>;
    const rps = (await pg(
      "GET",
      `/role_permissions?role_id=eq.${r.id}&select=permission_id`,
    )) as Array<{ permission_id: number }>;
    console.log(`    ${r.role_code}: ${rms.length} modules, ${rps.length} permissions`);
  }
  const perms = (await pg(
    "GET",
    "/permissions?domain_module_id=in.(86,87,88,89)&select=tier",
  )) as Array<{ tier: string }>;
  const byTier = perms.reduce<Record<string, number>>((acc, p) => {
    acc[p.tier] = (acc[p.tier] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`  PSA permissions: ${perms.length} (${JSON.stringify(byTier)})`);
}

async function main(): Promise<void> {
  console.log("PSA Phase E loader (E1-E6)");
  const permSpecs = await buildPermissions();
  const permMap = await upsertPermissions(permSpecs);
  const roleMap = await upsertRoles();
  await upsertRoleModules(roleMap);
  await upsertRolePermissions(roleMap, permMap);
  await verify();
}

await main();
