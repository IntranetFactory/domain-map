// BEN-ADMIN E1 — roles + role_modules + role_permissions loader.
// First materializes 32 permissions for modules 71/72/73/74 (baseline tiers + workflow gates
// derived from lifecycle states), then loads 4 function-scoped roles and their bundles.
// Idempotent; record_status defaults to 'new'.

async function semantius(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<unknown> {
  const args = { method, path, ...(body !== undefined ? { body } : {}) };
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(args));
  await proc.stdin.end();
  const [stdout, stderr, exit] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exit !== 0) {
    throw new Error(`semantius ${method} ${path} failed (${exit}): ${stderr || stdout}`);
  }
  return stdout.trim() ? JSON.parse(stdout) : null;
}

// --- Permissions to materialize ---

const MODULE_CODES: Record<number, string> = {
  71: "ben-plan-design",
  72: "ben-enrollment",
  73: "ben-carrier-integ",
  74: "ben-aca-compliance",
};

const WORKFLOW_GATES: Record<number, Array<{ verb: string; entity: string; description: string }>> = {
  71: [
    { verb: "activate",   entity: "benefit_plan",            description: "Activate a benefit plan, making it available for enrollment." },
    { verb: "deactivate", entity: "benefit_plan",            description: "Retire a benefit plan from new enrollments." },
    { verb: "open",       entity: "benefit_open_enrollment", description: "Open an annual or special enrollment window." },
    { verb: "close",      entity: "benefit_open_enrollment", description: "Close an enrollment window; elections lock." },
    { verb: "process",    entity: "benefit_open_enrollment", description: "Finalize a closed enrollment window (carrier feeds, payroll updates)." },
  ],
  72: [
    { verb: "elect",      entity: "benefit_enrollment", description: "Record an employee's plan election." },
    { verb: "activate",   entity: "benefit_enrollment", description: "Activate an elected enrollment on its effective date." },
    { verb: "terminate",  entity: "benefit_enrollment", description: "Terminate an active enrollment (separation, qualifying event)." },
    { verb: "verify",     entity: "benefit_dependent",  description: "Mark a dependent verified after documentation review." },
    { verb: "deactivate", entity: "benefit_dependent",  description: "Deactivate a dependent (aged out, divorce, voluntary removal)." },
    { verb: "submit",     entity: "life_event",         description: "Submit a declared life event for review." },
    { verb: "approve",    entity: "life_event",         description: "Approve a submitted life event; opens special-enrollment window." },
    { verb: "process",    entity: "life_event",         description: "Finalize an approved life event: apply enrollment changes." },
    { verb: "reject",     entity: "life_event",         description: "Reject a submitted life event (insufficient documentation, etc.)." },
  ],
  73: [
    { verb: "contract",  entity: "benefit_carrier", description: "Move a prospect carrier to contracted status." },
    { verb: "activate",  entity: "benefit_carrier", description: "Activate a contracted carrier; plans can reference it." },
    { verb: "suspend",   entity: "benefit_carrier", description: "Suspend an active carrier (compliance issue, dispute)." },
    { verb: "terminate", entity: "benefit_carrier", description: "Terminate a carrier relationship; existing enrollments wind down." },
    { verb: "transmit",  entity: "carrier_feed",    description: "Transmit a generated eligibility feed to the carrier." },
    { verb: "fail",      entity: "carrier_feed",    description: "Mark a carrier feed failed after transmission or reconciliation error." },
  ],
  74: [],
};

type PermSpec = {
  permission_name: string;
  domain_module_id: number;
  tier: "baseline-read" | "baseline-manage" | "baseline-admin" | "workflow-gate" | "override";
  description: string;
};

function buildPermissions(): PermSpec[] {
  const out: PermSpec[] = [];
  for (const [idStr, code] of Object.entries(MODULE_CODES)) {
    const moduleId = Number(idStr);
    out.push(
      { permission_name: `${code}:read`,   domain_module_id: moduleId, tier: "baseline-read",   description: `Read access to ${code} records.` },
      { permission_name: `${code}:manage`, domain_module_id: moduleId, tier: "baseline-manage", description: `Manage records and execute non-admin workflows in ${code}.` },
      { permission_name: `${code}:admin`,  domain_module_id: moduleId, tier: "baseline-admin",  description: `Full administrative authority over ${code}: configuration, all workflow gates, override scopes.` },
    );
    for (const g of WORKFLOW_GATES[moduleId]) {
      out.push({
        permission_name: `${code}:${g.verb}_${g.entity}`,
        domain_module_id: moduleId,
        tier: "workflow-gate",
        description: g.description,
      });
    }
  }
  return out;
}

const PERMISSIONS = buildPermissions();

// --- Roles ---

type RoleSpec = {
  role_code: string;
  role_name: string;
  description: string;
  business_function_id: number | null;
  role_modules: Array<{ domain_module_id: number; interaction_level: "primary" | "secondary"; notes: string }>;
  bundle: string[];  // permission_name list
};

const BEN_ADMIN_FN_ID = 39;
const DOMAIN_MAP_MODULE_ID = 1001;

const ROLES: RoleSpec[] = [
  {
    role_code: "BENEFITS-BENEFITS-ADMIN",
    role_name: "Benefits Administrator",
    description: "Full administrative authority across plan design, enrollment, carrier integration, and ACA compliance. Owns the benefits program end to end: plan catalog, OE-window operations, carrier relationships, compliance filings.",
    business_function_id: BEN_ADMIN_FN_ID,
    role_modules: [
      { domain_module_id: 71, interaction_level: "primary", notes: "Plan design and OE setup admin." },
      { domain_module_id: 72, interaction_level: "primary", notes: "Enrollment and life-event admin." },
      { domain_module_id: 73, interaction_level: "primary", notes: "Carrier relationships and feed operations admin." },
      { domain_module_id: 74, interaction_level: "primary", notes: "ACA compliance reporting admin." },
    ],
    bundle: [
      "ben-plan-design:admin",
      "ben-enrollment:admin",
      "ben-carrier-integ:admin",
      "ben-aca-compliance:admin",
    ],
  },
  {
    role_code: "BENEFITS-PLAN-MANAGER",
    role_name: "Benefits Plan Manager",
    description: "Owns the plan catalog and carrier relationships: designs benefit offerings, attaches carriers, negotiates renewals, schedules open-enrollment windows. Does not run the enrollment workflow itself.",
    business_function_id: BEN_ADMIN_FN_ID,
    role_modules: [
      { domain_module_id: 71, interaction_level: "primary",   notes: "Plan catalog and OE-window owner." },
      { domain_module_id: 73, interaction_level: "primary",   notes: "Carrier relationship owner; feed operations day-to-day." },
    ],
    bundle: [
      "ben-plan-design:admin",
      "ben-carrier-integ:manage",
      "ben-carrier-integ:contract_benefit_carrier",
      "ben-carrier-integ:activate_benefit_carrier",
    ],
  },
  {
    role_code: "BENEFITS-ENROLLMENT-SPECIALIST",
    role_name: "Benefits Enrollment Specialist",
    description: "Runs the enrollment workflow day to day: processes elections, verifies dependents, reviews and approves life events. Reads the plan catalog but does not change it.",
    business_function_id: BEN_ADMIN_FN_ID,
    role_modules: [
      { domain_module_id: 72, interaction_level: "primary",   notes: "Enrollment and life-event execution." },
      { domain_module_id: 71, interaction_level: "secondary", notes: "Reads plan catalog and OE window state." },
    ],
    bundle: [
      "ben-enrollment:manage",
      "ben-enrollment:verify_benefit_dependent",
      "ben-enrollment:approve_life_event",
      "ben-plan-design:read",
    ],
  },
  {
    role_code: "BENEFITS-COMPLIANCE-ANALYST",
    role_name: "Benefits Compliance Analyst",
    description: "Owns ACA compliance: assembles 1094-C / 1095-C forms, runs affordability analysis, files annual returns. Reads enrollment and plan data but does not modify them.",
    business_function_id: BEN_ADMIN_FN_ID,
    role_modules: [
      { domain_module_id: 74, interaction_level: "primary",   notes: "ACA reporting owner." },
      { domain_module_id: 72, interaction_level: "secondary", notes: "Reads enrollment data for 1095-C generation." },
      { domain_module_id: 71, interaction_level: "secondary", notes: "Reads plan catalog for affordability comparisons." },
    ],
    bundle: [
      "ben-aca-compliance:admin",
      "ben-enrollment:read",
      "ben-plan-design:read",
    ],
  },
];

function slugify(roleCode: string): string {
  return roleCode.toLowerCase().replace(/-/g, "_");
}

async function upsertPermissions(): Promise<Map<string, number>> {
  console.log("\n[Step 1] Upsert permissions for modules 71-74");
  const names = PERMISSIONS.map((p) => p.permission_name);
  const existing = (await semantius(
    "GET",
    `/permissions?permission_name=in.(${names.join(",")})&select=id,permission_name`,
  )) as Array<{ id: number; permission_name: string }>;
  const have = new Map(existing.map((r) => [r.permission_name, r.id]));
  const missing = PERMISSIONS.filter((p) => !have.has(p.permission_name)).map((p) => ({
    ...p,
    module_id: DOMAIN_MAP_MODULE_ID,
  }));
  if (missing.length === 0) {
    console.log("  all permissions already present");
  } else {
    const inserted = (await semantius("POST", "/permissions?select=id,permission_name", missing)) as Array<{
      id: number;
      permission_name: string;
    }>;
    console.log(`  INSERT permissions: ${inserted.length}`);
    for (const r of inserted) have.set(r.permission_name, r.id);
  }
  // Sanity: every referenced permission name in bundles is now resolvable
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
  const existing = (await semantius(
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
    const inserted = (await semantius("POST", "/roles?select=id,role_code", missing)) as Array<{
      id: number;
      role_code: string;
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
    const existing = (await semantius(
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
    const inserted = await semantius("POST", "/role_modules?select=domain_module_id", rows);
    console.log(`  ${spec.role_code}: INSERT role_modules ${Array.isArray(inserted) ? inserted.length : 0}`);
  }
}

async function upsertRolePermissions(roleMap: Map<string, number>, permMap: Map<string, number>): Promise<void> {
  console.log("\n[Step 4] Upsert role_permissions");
  for (const spec of ROLES) {
    const roleId = roleMap.get(spec.role_code)!;
    const existing = (await semantius(
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
    const inserted = await semantius("POST", "/role_permissions?select=permission_id", rows);
    console.log(`  ${spec.role_code}: INSERT role_permissions ${Array.isArray(inserted) ? inserted.length : 0}`);
  }
}

async function verify(): Promise<void> {
  console.log("\nPost-load verification");
  // E1
  const roles = (await semantius(
    "GET",
    `/roles?business_function_id=eq.${BEN_ADMIN_FN_ID}&select=id,role_code,role_name`,
  )) as Array<{ id: number; role_code: string; role_name: string }>;
  console.log(`  roles owned by Benefits Admin: ${roles.length}`);
  for (const r of roles) {
    const rms = (await semantius(
      "GET",
      `/role_modules?role_id=eq.${r.id}&select=domain_module_id,interaction_level`,
    )) as Array<{ domain_module_id: number; interaction_level: string }>;
    const rps = (await semantius(
      "GET",
      `/role_permissions?role_id=eq.${r.id}&select=permission_id`,
    )) as Array<{ permission_id: number }>;
    console.log(`    ${r.role_code}: ${rms.length} modules, ${rps.length} permissions`);
  }
  // permissions count
  const perms = (await semantius(
    "GET",
    "/permissions?domain_module_id=in.(71,72,73,74)&select=tier",
  )) as Array<{ tier: string }>;
  const byTier = perms.reduce<Record<string, number>>((acc, p) => {
    acc[p.tier] = (acc[p.tier] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`  permissions on modules 71-74: ${perms.length} (${JSON.stringify(byTier)})`);
}

async function main(): Promise<void> {
  console.log("BEN-ADMIN E1 roles loader (2026-05-26)");
  const permMap = await upsertPermissions();
  const roleMap = await upsertRoles();
  await upsertRoleModules(roleMap);
  await upsertRolePermissions(roleMap, permMap);
  await verify();
}

await main();
