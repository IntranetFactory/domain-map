/**
 * LMS audit fix - Phase 2: materialize permissions + author roles.
 *
 * Sequence (all idempotent):
 *   P1) Create 9 baseline-tier permissions (read/manage/admin x 3 modules)
 *   P2) Create 18 workflow-gate permissions, one per requires_permission=true
 *       lifecycle state, prefixed by the realizing module + permission_verb_override
 *   P3) Create permission_hierarchy edges (origin='model'):
 *         - <module>:admin includes <module>:manage
 *         - <module>:manage includes <module>:read
 *         - <module>:admin includes every workflow-gate in same module
 *   P4) Create 4 LMS roles (origin='model', record_status='new')
 *   P5) Create role_modules (each role hits 2+ modules per E2 floor)
 *   P6) Create role_permissions (tier-level grants only - hierarchy expands the gates)
 *
 * Run from project root:
 *   bun run .tmp_deploy/lms_audit_fix_phase2.ts
 */

const LMS_DOMAIN_ID = 57;
const MOD_COURSE_DELIVERY = 32;
const MOD_COMPLIANCE = 33;
const MOD_SKILLS = 34;

const MOD_CODE: Record<number, string> = {
  [MOD_COURSE_DELIVERY]: "lms-course-delivery",
  [MOD_COMPLIANCE]: "lms-compliance-training",
  [MOD_SKILLS]: "lms-skills",
};

const FN_LD = 11;
const FN_GRC = 31;

interface CmdResult { ok: boolean; data: any; status: number; stderr: string; }

async function postgrest(method: string, path: string, body?: any, prefer?: string): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  if (prefer) payload.headers = { Prefer: prefer };
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" }
  );
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    return { ok: false, data: null, status: code, stderr: stderr.trim() || stdout.trim() };
  }
  const text = stdout.trim();
  return { ok: true, data: text ? JSON.parse(text) : null, status: 0, stderr: "" };
}

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.stderr}`);
  return r.data;
}

async function insert(path: string, body: any): Promise<any> {
  const r = await postgrest("POST", path, body, "return=representation");
  if (!r.ok) throw new Error(`POST ${path} failed: ${r.stderr}`);
  return r.data;
}

type Permission = { id: number; permission_name: string; domain_module_id: number | null; tier: string };
type LifecycleState = {
  data_object_id: number;
  state_name: string;
  requires_permission: boolean;
  permission_verb_override: string;
  domain_module_id: number | null;
  data_objects: { data_object_name: string };
};

function singularize(plural: string): string {
  // Crude singularizer for our data_object names.
  if (plural.endsWith("ies")) return plural.slice(0, -3) + "y";
  if (plural.endsWith("ses")) return plural.slice(0, -2);
  if (plural.endsWith("s")) return plural.slice(0, -1);
  return plural;
}

async function ensurePermission(
  permission_name: string,
  description: string,
  domain_module_id: number,
  tier: string,
  existing: Map<string, Permission>
): Promise<Permission> {
  const found = existing.get(permission_name);
  if (found) {
    console.log(`  = permission ${permission_name} (id ${found.id})`);
    return found;
  }
  const created = await insert("/permissions", {
    permission_name,
    description,
    domain_module_id,
    tier,
  });
  const row: Permission = created[0];
  existing.set(row.permission_name, row);
  console.log(`  + permission ${row.permission_name} (id ${row.id})`);
  return row;
}

async function ensureHierarchyEdge(
  including_id: number,
  included_id: number,
  existingEdges: Set<string>
): Promise<void> {
  const key = `${including_id}>${included_id}`;
  if (existingEdges.has(key)) {
    console.log(`  = hierarchy ${including_id} -> ${included_id}`);
    return;
  }
  await insert("/permission_hierarchy", {
    including_permission_id: including_id,
    included_permission_id: included_id,
    origin: "model",
  });
  existingEdges.add(key);
  console.log(`  + hierarchy ${including_id} -> ${included_id}`);
}

type Role = { id: number; role_code: string; slug: string };

async function ensureRole(
  role_code: string,
  role_name: string,
  slug: string,
  description: string,
  business_function_id: number | null,
  existing: Map<string, Role>
): Promise<Role> {
  const found = existing.get(role_code);
  if (found) {
    console.log(`  = role ${role_code} (id ${found.id})`);
    return found;
  }
  const body: any = {
    role_code,
    role_name,
    slug,
    description,
    origin: "model",
    record_status: "new",
  };
  if (business_function_id !== null) body.business_function_id = business_function_id;
  const created = await insert("/roles", body);
  const row: Role = created[0];
  existing.set(row.role_code, row);
  console.log(`  + role ${row.role_code} (id ${row.id})`);
  return row;
}

async function main() {
  console.log("LMS audit fix - Phase 2: permissions + roles");
  console.log("=============================================\n");

  // ---------------------------------------------------------------------------
  // P1 + P2: build the LMS permission set
  // ---------------------------------------------------------------------------
  console.log("P0: snapshot current LMS permissions");
  const existingPermsRaw: Permission[] = await get(
    `/permissions?domain_module_id=in.(${MOD_COURSE_DELIVERY},${MOD_COMPLIANCE},${MOD_SKILLS})&select=id,permission_name,domain_module_id,tier`
  );
  const permsByName = new Map<string, Permission>(existingPermsRaw.map((p) => [p.permission_name, p]));
  console.log(`  ${existingPermsRaw.length} existing LMS permissions\n`);

  console.log("P1: baseline tier permissions (9 = 3 modules x 3 tiers)");
  type Tier = { tier: string; suffix: string; descTemplate: (m: string) => string };
  const tiers: Tier[] = [
    { tier: "baseline-read", suffix: "read", descTemplate: (m) => `Read access to ${m} module records.` },
    { tier: "baseline-manage", suffix: "manage", descTemplate: (m) => `Create and edit access to ${m} module records.` },
    { tier: "baseline-admin", suffix: "admin", descTemplate: (m) => `Full administrative access to ${m} module, including delete and configuration.` },
  ];

  const baselineByModule = new Map<number, { read: Permission; manage: Permission; admin: Permission }>();
  for (const modId of [MOD_COURSE_DELIVERY, MOD_COMPLIANCE, MOD_SKILLS]) {
    const code = MOD_CODE[modId];
    const triple: any = {};
    for (const t of tiers) {
      triple[t.suffix] = await ensurePermission(
        `${code}:${t.suffix}`,
        t.descTemplate(code),
        modId,
        t.tier,
        permsByName
      );
    }
    baselineByModule.set(modId, triple);
  }

  console.log("\nP2: workflow-gate permissions (from lifecycle states with requires_permission=true)");
  const states: LifecycleState[] = await get(
    `/data_object_lifecycle_states?data_object_id=in.(167,168,169,170,171,172,173)&requires_permission=eq.true&select=data_object_id,state_name,requires_permission,permission_verb_override,domain_module_id,data_objects(data_object_name)`
  );

  const gateByName = new Map<string, Permission>();
  const gatesByModule = new Map<number, Permission[]>([
    [MOD_COURSE_DELIVERY, []],
    [MOD_COMPLIANCE, []],
    [MOD_SKILLS, []],
  ]);

  for (const s of states) {
    if (!s.domain_module_id) {
      console.log(`  ! lifecycle state ${s.data_objects.data_object_name}.${s.state_name} has NULL domain_module_id - skip`);
      continue;
    }
    const verb = s.permission_verb_override || s.state_name;
    const entity = singularize(s.data_objects.data_object_name);
    const code = MOD_CODE[s.domain_module_id];
    if (!code) {
      console.log(`  ! lifecycle state on unknown LMS module ${s.domain_module_id} - skip`);
      continue;
    }
    const name = `${code}:${verb}_${entity}`;
    const desc = `Workflow gate: transition a ${entity} to '${s.state_name}'.`;
    const perm = await ensurePermission(name, desc, s.domain_module_id, "workflow-gate", permsByName);
    gateByName.set(name, perm);
    gatesByModule.get(s.domain_module_id)!.push(perm);
  }

  // ---------------------------------------------------------------------------
  // P3: permission_hierarchy edges
  // ---------------------------------------------------------------------------
  console.log("\nP3: permission_hierarchy edges");
  const existingEdges = await get(
    `/permission_hierarchy?including_permission_id=in.(${[...permsByName.values()].map((p) => p.id).join(",")})&select=including_permission_id,included_permission_id`
  );
  const edgeSet = new Set<string>(
    existingEdges.map((e: any) => `${e.including_permission_id}>${e.included_permission_id}`)
  );

  for (const modId of [MOD_COURSE_DELIVERY, MOD_COMPLIANCE, MOD_SKILLS]) {
    const { read, manage, admin } = baselineByModule.get(modId)!;
    // tier ladder: admin -> manage -> read
    await ensureHierarchyEdge(admin.id, manage.id, edgeSet);
    await ensureHierarchyEdge(manage.id, read.id, edgeSet);
    // admin includes every workflow gate in this module
    for (const gate of gatesByModule.get(modId) || []) {
      await ensureHierarchyEdge(admin.id, gate.id, edgeSet);
    }
  }

  // ---------------------------------------------------------------------------
  // P4: roles
  // ---------------------------------------------------------------------------
  console.log("\nP4: LMS roles");
  type RoleDraft = {
    role_code: string;
    role_name: string;
    slug: string;
    description: string;
    business_function_id: number | null;
    modules: Array<{ module: number; level: "primary" | "secondary"; notes: string }>;
    permissions: Array<{ permission_name: string; notes: string }>;
  };

  const drafts: RoleDraft[] = [
    {
      role_code: "L-AND-D-LEARNING-ADMIN",
      role_name: "Learning Administrator",
      slug: "l_and_d_learning_admin",
      description: "L&D leader who owns the course catalog and the skills/learning-path program. Full admin on course delivery and skills modules; visibility into compliance training.",
      business_function_id: FN_LD,
      modules: [
        { module: MOD_COURSE_DELIVERY, level: "primary", notes: "Catalog owner: courses, enrollments, transcripts, retirements." },
        { module: MOD_SKILLS, level: "primary", notes: "Skills program owner: skill profiles, learning paths, path retirements." },
        { module: MOD_COMPLIANCE, level: "secondary", notes: "Read access for L&D oversight of compliance program." },
      ],
      permissions: [
        { permission_name: "lms-course-delivery:admin", notes: "Full admin on course catalog." },
        { permission_name: "lms-skills:admin", notes: "Full admin on skills + learning paths." },
        { permission_name: "lms-compliance-training:read", notes: "Compliance read for oversight." },
      ],
    },
    {
      role_code: "L-AND-D-COURSE-AUTHOR",
      role_name: "Course Author",
      slug: "l_and_d_course_author",
      description: "L&D individual contributor who authors courses and curates learning paths. Manage rights on course delivery, manage on skills (path curation), no compliance gates.",
      business_function_id: FN_LD,
      modules: [
        { module: MOD_COURSE_DELIVERY, level: "primary", notes: "Authors and edits courses; publishes via course-delivery workflow gates." },
        { module: MOD_SKILLS, level: "secondary", notes: "Curates learning paths against the skills catalog." },
      ],
      permissions: [
        { permission_name: "lms-course-delivery:manage", notes: "Author courses; publish/retire gates inherited via admin not granted (uses workflow gates only for publish)." },
        { permission_name: "lms-course-delivery:publish_course", notes: "Authors graduate drafts to published." },
        { permission_name: "lms-skills:manage", notes: "Curate learning paths." },
      ],
    },
    {
      role_code: "GRC-COMPLIANCE-TRAINING-MANAGER",
      role_name: "Compliance Training Manager",
      slug: "grc_compliance_training_manager",
      description: "GRC owner of mandatory regulatory training programs (harassment, HIPAA, OSHA, anti-bribery, SOX). Full admin on compliance training; read on course catalog to verify content fulfills assignments.",
      business_function_id: FN_GRC,
      modules: [
        { module: MOD_COMPLIANCE, level: "primary", notes: "Owns assignment lifecycle: assign, complete, waive, expire; manages certifications." },
        { module: MOD_COURSE_DELIVERY, level: "secondary", notes: "Reads course catalog to verify training fulfills compliance requirements." },
      ],
      permissions: [
        { permission_name: "lms-compliance-training:admin", notes: "Full admin on compliance assignments + certifications, including waive and revoke gates." },
        { permission_name: "lms-course-delivery:read", notes: "Verify course content fulfills compliance assignments." },
      ],
    },
    {
      role_code: "MANAGER-AS-LEARNER-MANAGER",
      role_name: "Manager as Learner Manager",
      slug: "manager_as_learner_manager",
      description: "Cross-functional people-manager persona: any line manager who assigns and tracks learning progress for direct reports. Read across all LMS modules; no module-admin rights.",
      business_function_id: null,
      modules: [
        { module: MOD_COURSE_DELIVERY, level: "secondary", notes: "Tracks direct-report enrollments + completions." },
        { module: MOD_COMPLIANCE, level: "secondary", notes: "Monitors direct-report compliance status and overdue assignments." },
        { module: MOD_SKILLS, level: "secondary", notes: "Views direct-report skill profiles and assigned learning paths." },
      ],
      permissions: [
        { permission_name: "lms-course-delivery:read", notes: "Read enrollments + transcripts for direct reports." },
        { permission_name: "lms-compliance-training:read", notes: "Read compliance status for direct reports." },
        { permission_name: "lms-skills:read", notes: "Read skill profiles + paths for direct reports." },
      ],
    },
  ];

  const existingRoles = await get(
    `/roles?role_code=in.(${drafts.map((d) => `"${d.role_code}"`).join(",")})&select=id,role_code,slug`
  );
  const rolesByCode = new Map<string, Role>(existingRoles.map((r: Role) => [r.role_code, r]));

  const createdRoles = new Map<string, Role>();
  for (const d of drafts) {
    const r = await ensureRole(
      d.role_code,
      d.role_name,
      d.slug,
      d.description,
      d.business_function_id,
      rolesByCode
    );
    createdRoles.set(d.role_code, r);
  }

  // ---------------------------------------------------------------------------
  // P5: role_modules
  // ---------------------------------------------------------------------------
  console.log("\nP5: role_modules");
  for (const d of drafts) {
    const role = createdRoles.get(d.role_code)!;
    const existing = await get(
      `/role_modules?role_id=eq.${role.id}&select=domain_module_id,interaction_level`
    );
    const existingByMod = new Map<number, string>(
      existing.map((e: any) => [e.domain_module_id, e.interaction_level])
    );
    for (const m of d.modules) {
      if (existingByMod.has(m.module)) {
        console.log(`  = role_module ${d.role_code} <-> ${MOD_CODE[m.module]} (already ${existingByMod.get(m.module)})`);
        continue;
      }
      await insert("/role_modules", {
        role_id: role.id,
        domain_module_id: m.module,
        interaction_level: m.level,
        notes: m.notes,
        role_module_label: `${d.role_code} on ${MOD_CODE[m.module]}`,
      });
      console.log(`  + role_module ${d.role_code} -> ${MOD_CODE[m.module]} (${m.level})`);
    }
  }

  // ---------------------------------------------------------------------------
  // P6: role_permissions
  // ---------------------------------------------------------------------------
  console.log("\nP6: role_permissions");
  for (const d of drafts) {
    const role = createdRoles.get(d.role_code)!;
    const existing = await get(`/role_permissions?role_id=eq.${role.id}&select=permission_id`);
    const existingPermIds = new Set<number>(existing.map((e: any) => e.permission_id));
    for (const grant of d.permissions) {
      const perm = permsByName.get(grant.permission_name);
      if (!perm) {
        console.log(`  ! permission ${grant.permission_name} not found - skipped`);
        continue;
      }
      if (existingPermIds.has(perm.id)) {
        console.log(`  = role_permission ${d.role_code} -> ${grant.permission_name}`);
        continue;
      }
      await insert("/role_permissions", {
        role_id: role.id,
        permission_id: perm.id,
        notes: grant.notes,
        role_permission_label: `${d.role_code} grants ${grant.permission_name}`,
      });
      console.log(`  + role_permission ${d.role_code} -> ${grant.permission_name}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Post-audit
  // ---------------------------------------------------------------------------
  console.log("\nPost-fix audit:");
  const finalPerms = await get(
    `/permissions?domain_module_id=in.(${MOD_COURSE_DELIVERY},${MOD_COMPLIANCE},${MOD_SKILLS})&select=id,tier`
  );
  const tierCounts: Record<string, number> = {};
  for (const p of finalPerms) tierCounts[p.tier] = (tierCounts[p.tier] || 0) + 1;
  console.log(`  permissions by tier:`, tierCounts);

  const finalRoles = await get(
    `/role_modules?domain_module_id=in.(${MOD_COURSE_DELIVERY},${MOD_COMPLIANCE},${MOD_SKILLS})&select=role_id,domain_module_id,role:roles(role_code)`
  );
  const rolesSeen = new Map<string, Set<number>>();
  for (const rm of finalRoles) {
    const code = rm.role?.role_code;
    if (!code) continue;
    if (!rolesSeen.has(code)) rolesSeen.set(code, new Set());
    rolesSeen.get(code)!.add(rm.domain_module_id);
  }
  console.log(`  roles touching LMS modules (path A): ${rolesSeen.size}`);
  for (const [code, mods] of rolesSeen) {
    console.log(`    ${code}: ${mods.size} modules`);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("\nFATAL:", e?.message || e);
  process.exit(1);
});
