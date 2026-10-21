// Fix 7 (TALENT-MGMT audit, 2026-05-24): E-band - materialize baseline permissions
// for the 3 modules, then load 3 roles + role_modules + role_permissions bundles.

type Json = unknown;

async function pg(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: Json): Promise<any> {
  const args: Record<string, unknown> = { method, path };
  if (body !== undefined) args.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(args)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`pg ${method} ${path} failed (${code}): ${err || out}`);
  const trimmed = out.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed);
}

const MODULES = [
  { id: 51, code: "TALENT-PERFORMANCE-MGMT",   slug: "talent-performance-mgmt",   label: "Performance and Goal Management" },
  { id: 52, code: "TALENT-SUCCESSION-CAREER",  slug: "talent-succession-career",  label: "Succession and Career Planning" },
  { id: 53, code: "TALENT-CONTINUOUS-FEEDBACK", slug: "talent-continuous-feedback", label: "Continuous Feedback and Recognition" },
];

const TIERS: Array<{ verb: string; tier: "baseline-read" | "baseline-manage" | "baseline-admin"; desc: string }> = [
  { verb: "read",   tier: "baseline-read",   desc: "Read access to the module's records." },
  { verb: "manage", tier: "baseline-manage", desc: "Create / update / non-destructive lifecycle actions for the module." },
  { verb: "admin",  tier: "baseline-admin",  desc: "Full administrative access including destructive actions and configuration." },
];

async function ensurePermission(moduleId: number, slug: string, verb: string, tier: string, description: string): Promise<number> {
  const name = `${slug}:${verb}`;
  const existing = await pg("GET", `/permissions?permission_name=eq.${encodeURIComponent(name)}&select=id`);
  if (existing && existing.length) return existing[0].id;
  await pg("POST", "/permissions", [
    { permission_name: name, description, domain_module_id: moduleId, tier },
  ]);
  const reread = await pg("GET", `/permissions?permission_name=eq.${encodeURIComponent(name)}&select=id`);
  return reread[0].id;
}

type RoleSpec = {
  code: string;
  name: string;
  slug: string;
  business_function_id: number | null;
  description: string;
  modules: Array<{ module_id: number; interaction_level: "primary" | "secondary"; notes: string }>;
  bundle: Array<{ module_id: number; verb: "read" | "manage" | "admin"; notes?: string }>;
};

const ROLES: RoleSpec[] = [
  {
    code: "TALENT-DEVELOPMENT-TALENT-MANAGER",
    name: "Talent Manager",
    slug: "talent_development_talent_manager",
    business_function_id: 77,
    description: "Runs the talent-management program end-to-end: review cycle cadence, calibration sessions, succession bench, and continuous-feedback adoption. Owns the program across all three modules.",
    modules: [
      { module_id: 51, interaction_level: "primary",   notes: "Owns review cycles, goals, OKRs, and calibration sessions." },
      { module_id: 52, interaction_level: "primary",   notes: "Owns succession plans, 9-box placements, and career-development pipeline." },
      { module_id: 53, interaction_level: "secondary", notes: "Promotes adoption and tunes feedback templates / 360 cadences." },
    ],
    bundle: [
      { module_id: 51, verb: "admin", notes: "Full program control." },
      { module_id: 52, verb: "admin", notes: "Full program control." },
      { module_id: 53, verb: "admin", notes: "Owns templates and rollout cadence." },
    ],
  },
  {
    code: "HR-BUSINESS-PARTNER",
    name: "HR Business Partner",
    slug: "hr_business_partner",
    business_function_id: 3,
    description: "Embedded HR partner who supports business units through the review cycle, co-authors succession plans with leadership, runs employee-development conversations, and shepherds calibration logistics. Operates the program day-to-day for their assigned populations.",
    modules: [
      { module_id: 51, interaction_level: "primary",   notes: "Runs review-cycle operations, supports managers through calibration, escalates problem reviews." },
      { module_id: 52, interaction_level: "primary",   notes: "Co-authors succession plans with the leader of the unit; tracks bench readiness." },
      { module_id: 53, interaction_level: "secondary", notes: "Coaches managers on giving useful continuous feedback." },
    ],
    bundle: [
      { module_id: 51, verb: "manage", notes: "Operates the cycle; cannot publish program-level overrides." },
      { module_id: 52, verb: "manage", notes: "Co-author succession plans for their populations." },
      { module_id: 53, verb: "read",   notes: "Read-only access to feedback content; coaches managers but does not edit their notes." },
    ],
  },
  {
    code: "PEOPLE-MANAGER",
    name: "People Manager",
    slug: "people_manager",
    business_function_id: null,
    description: "Any line manager who runs reviews, sets and approves goals for their direct reports, participates in calibration, contributes to nine-box placement of their team, and gives continuous feedback. Cross-functional - every function with people-managers uses this role.",
    modules: [
      { module_id: 51, interaction_level: "primary",   notes: "Writes ratings, approves goals, attends calibration." },
      { module_id: 52, interaction_level: "secondary", notes: "Provides input on succession placement and career conversations for direct reports." },
      { module_id: 53, interaction_level: "primary",   notes: "Gives continuous feedback and 1-on-1 notes routinely." },
    ],
    bundle: [
      { module_id: 51, verb: "manage", notes: "Authors and approves reviews / goals for their direct reports; participates in calibration." },
      { module_id: 52, verb: "manage", notes: "Edits 9-box placements and contributes to succession plans for their direct reports." },
      { module_id: 53, verb: "manage", notes: "Authors and shares continuous feedback for and about their team." },
    ],
  },
];

async function ensureRole(spec: RoleSpec): Promise<number> {
  const existing = await pg("GET", `/roles?role_code=eq.${encodeURIComponent(spec.code)}&select=id`);
  if (existing && existing.length) return existing[0].id;
  await pg("POST", "/roles", [
    {
      role_code: spec.code,
      role_name: spec.name,
      slug: spec.slug,
      description: spec.description,
      origin: "model",
      business_function_id: spec.business_function_id,
    },
  ]);
  const reread = await pg("GET", `/roles?role_code=eq.${encodeURIComponent(spec.code)}&select=id`);
  return reread[0].id;
}

async function ensureRoleModule(roleId: number, moduleId: number, level: string, notes: string, roleCode: string, moduleCode: string) {
  const existing = await pg(
    "GET",
    `/role_modules?role_id=eq.${roleId}&domain_module_id=eq.${moduleId}&select=id`,
  );
  if (existing && existing.length) return false;
  await pg("POST", "/role_modules", [
    {
      role_module_label: `${roleCode} on ${moduleCode}`,
      role_id: roleId,
      domain_module_id: moduleId,
      interaction_level: level,
      notes,
    },
  ]);
  return true;
}

async function ensureRolePermission(roleId: number, permissionId: number, roleCode: string, permissionName: string, notes: string) {
  const existing = await pg(
    "GET",
    `/role_permissions?role_id=eq.${roleId}&permission_id=eq.${permissionId}&select=id`,
  );
  if (existing && existing.length) return false;
  await pg("POST", "/role_permissions", [
    {
      role_id: roleId,
      permission_id: permissionId,
      role_permission_label: `${roleCode} has ${permissionName}`,
      notes,
    },
  ]);
  return true;
}

async function main() {
  // Step A — baseline permissions per module
  const permIds: Record<string, number> = {}; // key: `${moduleId}:${verb}`
  for (const m of MODULES) {
    for (const t of TIERS) {
      const id = await ensurePermission(m.id, m.slug, t.verb, t.tier, `${t.desc} (Module: ${m.label}.)`);
      permIds[`${m.id}:${t.verb}`] = id;
    }
  }
  console.log(`baseline permissions: ${Object.keys(permIds).length} total ensured`);

  // Step B+C+D — roles, role_modules, role_permissions
  const moduleCodeById: Record<number, string> = {};
  for (const m of MODULES) moduleCodeById[m.id] = m.code;

  let roleInserted = 0, moduleLinks = 0, bundleLinks = 0;
  for (const role of ROLES) {
    const roleId = await ensureRole(role);
    console.log(`role ${role.code} -> id ${roleId}`);
    roleInserted++;

    for (const rm of role.modules) {
      if (await ensureRoleModule(roleId, rm.module_id, rm.interaction_level, rm.notes, role.code, moduleCodeById[rm.module_id])) {
        moduleLinks++;
      }
    }

    for (const b of role.bundle) {
      const permName = `${MODULES.find((m) => m.id === b.module_id)!.slug}:${b.verb}`;
      const permId = permIds[`${b.module_id}:${b.verb}`];
      if (!permId) throw new Error(`missing permission ${permName} (module ${b.module_id}, verb ${b.verb})`);
      if (await ensureRolePermission(roleId, permId, role.code, permName, b.notes ?? "")) {
        bundleLinks++;
      }
    }
  }
  console.log(`roles inserted/ensured: ${roleInserted}`);
  console.log(`role_modules inserted: ${moduleLinks}`);
  console.log(`role_permissions inserted: ${bundleLinks}`);
}

await main();
