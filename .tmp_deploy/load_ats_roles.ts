#!/usr/bin/env bun
// load_ats_roles.ts — plan-roles.md §6.1 steps 3–5.
//
// Loads the 5 ATS roles, their role_modules junction (~24 rows), and their
// role_permissions bundles (~29 rows) into the live catalog.
//
// Roles are flat (no parent_role_id) per plan-roles.md §7 Q3 resolution.
// Hiring Manager loads with business_function_id=NULL per §7 Q2.
// Each role declares its complete permission bundle directly; tier-level
// permissions (`:read`/`:manage`/`:admin`) expand at request time via
// Semantius's existing permission_hierarchy edges (loaded earlier by
// load_ats_module_permissions.ts).
//
// Permission name reconciliation against the materialized catalog:
//   Plan §4.3 wrote `ats-offers:approve`; actual materialized name is
//   `ats-offers:approve_offer` (the lifecycle state derives :<state>_<singular>).
//   The loader uses the real materialized name; plan §4.3 will be amended
//   in the same session.
//
// Validation:
//   - Every role has ≥2 role_modules entries (§7 Q5 — 2-module floor).
//   - Every referenced permission_name exists in /permissions (catalog
//     materialization is the prerequisite from step 2).
//
// Idempotent: reads existing rows first, only inserts what's missing.
// Run from project root (CLAUDE.md cwd rule):
//   bun run c:/dev/domain-map/.tmp_deploy/load_ats_roles.ts

export {};

const PLATFORM_MODULE_ID = 1001; // "Domain Map"
const RECRUITING_BUSINESS_FUNCTION_ID = 37;

type Row = Record<string, unknown>;

async function pg(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path}: ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

function slugify(roleCode: string): string {
  // valid_role_slug check constraint expects snake_case (matching built-in slugs
  // like `domain_map_viewer`), not kebab.
  return roleCode.toLowerCase().replace(/-/g, "_");
}

// ============================================================
// 1. Role catalog rows
// ============================================================
type RoleSpec = {
  role_code: string;
  role_name: string;
  business_function_id: number | null;
  description: string;
};

const ROLES: RoleSpec[] = [
  {
    role_code: "RECRUITING-RECRUITER",
    role_name: "Recruiter",
    business_function_id: RECRUITING_BUSINESS_FUNCTION_ID,
    description:
      "Owns candidate sourcing, screening, and pipeline progression for assigned requisitions. Coordinates interviews and extends offers. Permission bundle uses `:manage` tier on primary modules plus specific lifecycle gates the IC workflow needs (approve_requisition, approve_offer).",
  },
  {
    role_code: "HIRING-MANAGER",
    role_name: "Hiring Manager",
    business_function_id: null, // §7 Q2: NULL = cross-functional
    description:
      "Owns the requisition, sets job criteria, evaluates candidates, makes final hiring decisions. Every line manager in every function does this role — `business_function_id` is NULL per plan-roles.md §7 Q2.",
  },
  {
    role_code: "RECRUITING-COORDINATOR",
    role_name: "Recruiting Coordinator",
    business_function_id: RECRUITING_BUSINESS_FUNCTION_ID,
    description:
      "Owns logistics — interview scheduling, candidate communications, scorecard collection, background-check kickoff.",
  },
  {
    role_code: "RECRUITING-SOURCER",
    role_name: "Sourcer",
    business_function_id: RECRUITING_BUSINESS_FUNCTION_ID,
    description:
      "Owns talent-pool management, proactive candidate outreach, and pipeline seeding ahead of formal requisition opening.",
  },
  {
    role_code: "RECRUITING-MANAGER",
    role_name: "Recruiting Manager",
    business_function_id: RECRUITING_BUSINESS_FUNCTION_ID,
    description:
      "Manages a recruiter team. No role-level inheritance from Recruiter (plan-roles.md §7 Q3) — uses `:admin` permission tier across the modules they oversee, and Semantius's permission_hierarchy auto-includes the underlying `:manage` / `:read` / lifecycle-gate permissions.",
  },
];

// ============================================================
// 2. role_modules junction (§4.2)
// ============================================================
type RoleModuleSpec = {
  role_code: string;
  domain_module_code: string;
  interaction_level: "primary" | "secondary";
  notes?: string;
};

const ROLE_MODULES: RoleModuleSpec[] = [
  // RECRUITING-RECRUITER (6)
  { role_code: "RECRUITING-RECRUITER", domain_module_code: "ATS-CANDIDATE-CRM", interaction_level: "primary" },
  { role_code: "RECRUITING-RECRUITER", domain_module_code: "ATS-RECRUITMENT-PIPELINE", interaction_level: "primary" },
  { role_code: "RECRUITING-RECRUITER", domain_module_code: "ATS-OFFERS", interaction_level: "primary" },
  { role_code: "RECRUITING-RECRUITER", domain_module_code: "ATS-INTERVIEWS", interaction_level: "secondary", notes: "Coordinator drives logistics; recruiter participates." },
  { role_code: "RECRUITING-RECRUITER", domain_module_code: "ATS-BACKGROUND-CHECKS", interaction_level: "secondary", notes: "Review only via :read in bundle." },
  { role_code: "RECRUITING-RECRUITER", domain_module_code: "ATS-REFERRALS", interaction_level: "secondary" },

  // HIRING-MANAGER (4)
  { role_code: "HIRING-MANAGER", domain_module_code: "ATS-RECRUITMENT-PIPELINE", interaction_level: "primary", notes: "Owns requisitions." },
  { role_code: "HIRING-MANAGER", domain_module_code: "ATS-INTERVIEWS", interaction_level: "primary", notes: "Conducts interviews, submits scorecards." },
  { role_code: "HIRING-MANAGER", domain_module_code: "ATS-OFFERS", interaction_level: "secondary", notes: "Approves." },
  { role_code: "HIRING-MANAGER", domain_module_code: "ATS-CANDIDATE-CRM", interaction_level: "secondary", notes: ":read only in bundle." },

  // RECRUITING-COORDINATOR (4)
  { role_code: "RECRUITING-COORDINATOR", domain_module_code: "ATS-INTERVIEWS", interaction_level: "primary" },
  { role_code: "RECRUITING-COORDINATOR", domain_module_code: "ATS-BACKGROUND-CHECKS", interaction_level: "primary" },
  { role_code: "RECRUITING-COORDINATOR", domain_module_code: "ATS-RECRUITMENT-PIPELINE", interaction_level: "secondary" },
  { role_code: "RECRUITING-COORDINATOR", domain_module_code: "ATS-CANDIDATE-CRM", interaction_level: "secondary" },

  // RECRUITING-SOURCER (4)
  { role_code: "RECRUITING-SOURCER", domain_module_code: "ATS-CANDIDATE-CRM", interaction_level: "primary" },
  { role_code: "RECRUITING-SOURCER", domain_module_code: "ATS-TALENT-POOLS", interaction_level: "primary" },
  { role_code: "RECRUITING-SOURCER", domain_module_code: "ATS-REFERRALS", interaction_level: "secondary" },
  { role_code: "RECRUITING-SOURCER", domain_module_code: "ATS-RECRUITMENT-PIPELINE", interaction_level: "secondary", notes: ":read only in bundle." },

  // RECRUITING-MANAGER (6) — declares own rows directly, no inheritance from Recruiter
  { role_code: "RECRUITING-MANAGER", domain_module_code: "ATS-CANDIDATE-CRM", interaction_level: "primary" },
  { role_code: "RECRUITING-MANAGER", domain_module_code: "ATS-RECRUITMENT-PIPELINE", interaction_level: "primary" },
  { role_code: "RECRUITING-MANAGER", domain_module_code: "ATS-OFFERS", interaction_level: "primary" },
  { role_code: "RECRUITING-MANAGER", domain_module_code: "ATS-INTERVIEWS", interaction_level: "secondary" },
  { role_code: "RECRUITING-MANAGER", domain_module_code: "ATS-BACKGROUND-CHECKS", interaction_level: "secondary" },
  { role_code: "RECRUITING-MANAGER", domain_module_code: "ATS-REFERRALS", interaction_level: "secondary" },
];

// ============================================================
// 3. role_permissions bundles (§4.3)
// ============================================================
//
// Each row binds a role to a single materialized permission row. Tier-level
// permissions (`:read`/`:manage`/`:admin`) auto-expand via permission_hierarchy
// at request time. We list only what doesn't transitively fall out of a tier
// already in the bundle.
type RolePermSpec = {
  role_code: string;
  permission_name: string;
  notes?: string;
};

const ROLE_PERMISSIONS: RolePermSpec[] = [
  // RECRUITING-RECRUITER (8)
  { role_code: "RECRUITING-RECRUITER", permission_name: "ats-candidate-crm:manage", notes: "tier — covers candidate/source CRUD" },
  { role_code: "RECRUITING-RECRUITER", permission_name: "ats-recruitment-pipeline:manage", notes: "tier — reqs/postings/applications CRUD" },
  { role_code: "RECRUITING-RECRUITER", permission_name: "ats-recruitment-pipeline:approve_requisition", notes: "specific lifecycle gate (not auto-included in :manage)" },
  { role_code: "RECRUITING-RECRUITER", permission_name: "ats-interviews:read", notes: "tier — read-only because coordinator drives scheduling" },
  { role_code: "RECRUITING-RECRUITER", permission_name: "ats-offers:manage", notes: "tier" },
  { role_code: "RECRUITING-RECRUITER", permission_name: "ats-offers:approve_offer", notes: "specific lifecycle gate the IC needs" },
  { role_code: "RECRUITING-RECRUITER", permission_name: "ats-background-checks:read", notes: "tier — review only" },
  { role_code: "RECRUITING-RECRUITER", permission_name: "ats-referrals:read", notes: "tier — sees referred candidates entering pipeline" },

  // HIRING-MANAGER (7)
  { role_code: "HIRING-MANAGER", permission_name: "ats-recruitment-pipeline:manage", notes: "tier — owns own requisitions" },
  { role_code: "HIRING-MANAGER", permission_name: "ats-recruitment-pipeline:approve_requisition", notes: "specific lifecycle gate" },
  { role_code: "HIRING-MANAGER", permission_name: "ats-interviews:manage", notes: "tier — conducts interviews" },
  { role_code: "HIRING-MANAGER", permission_name: "ats-interviews:submit_interview_scorecard", notes: "pattern-flag override — submits and locks the scorecard" },
  { role_code: "HIRING-MANAGER", permission_name: "ats-offers:read", notes: "tier — sees but doesn't draft" },
  { role_code: "HIRING-MANAGER", permission_name: "ats-offers:approve_offer", notes: "specific lifecycle gate — final hiring decision" },
  { role_code: "HIRING-MANAGER", permission_name: "ats-candidate-crm:read", notes: "tier — reviews candidates only" },

  // RECRUITING-COORDINATOR (4)
  { role_code: "RECRUITING-COORDINATOR", permission_name: "ats-interviews:manage", notes: "tier — schedules interviews" },
  { role_code: "RECRUITING-COORDINATOR", permission_name: "ats-background-checks:manage", notes: "tier — kicks off background checks" },
  { role_code: "RECRUITING-COORDINATOR", permission_name: "ats-recruitment-pipeline:read", notes: "tier — context for scheduling" },
  { role_code: "RECRUITING-COORDINATOR", permission_name: "ats-candidate-crm:read", notes: "tier — candidate communications" },

  // RECRUITING-SOURCER (4)
  { role_code: "RECRUITING-SOURCER", permission_name: "ats-candidate-crm:manage", notes: "tier — proactive candidate outreach" },
  { role_code: "RECRUITING-SOURCER", permission_name: "ats-talent-pools:manage", notes: "tier — pool curation" },
  { role_code: "RECRUITING-SOURCER", permission_name: "ats-referrals:read", notes: "tier — referral seeding context" },
  { role_code: "RECRUITING-SOURCER", permission_name: "ats-recruitment-pipeline:read", notes: "tier — pipeline visibility for seeding ahead of req opening" },

  // RECRUITING-MANAGER (6) — tier-level admin per §4.3; admin ⊃ all gates+overrides via permission_hierarchy
  { role_code: "RECRUITING-MANAGER", permission_name: "ats-candidate-crm:admin", notes: "tier — admin auto-includes :manage + :read + cross-recruiter visibility via permission_hierarchy" },
  { role_code: "RECRUITING-MANAGER", permission_name: "ats-recruitment-pipeline:admin", notes: "tier — admin auto-includes all pipeline gates" },
  { role_code: "RECRUITING-MANAGER", permission_name: "ats-offers:admin", notes: "tier — admin auto-includes approve_offer, rescind_offer, future gates" },
  { role_code: "RECRUITING-MANAGER", permission_name: "ats-interviews:read", notes: "tier — manager sees but doesn't drive interview workflow" },
  { role_code: "RECRUITING-MANAGER", permission_name: "ats-background-checks:read", notes: "tier — review only" },
  { role_code: "RECRUITING-MANAGER", permission_name: "ats-referrals:read", notes: "tier" },
];

// ============================================================
// 4. Validation (pre-flight)
// ============================================================
console.log("=== 0. Pre-flight validation ===");

// 2-module floor (§7 Q5).
const moduleCountByRole = new Map<string, number>();
for (const rm of ROLE_MODULES) {
  moduleCountByRole.set(rm.role_code, (moduleCountByRole.get(rm.role_code) ?? 0) + 1);
}
for (const r of ROLES) {
  const n = moduleCountByRole.get(r.role_code) ?? 0;
  if (n < 2) {
    throw new Error(`Role ${r.role_code} has only ${n} role_modules entries; 2-module floor (§7 Q5) violated.`);
  }
}
console.log(`  2-module floor: PASS (all ${ROLES.length} roles have ≥2 modules)`);

// Resolve domain_modules.
const allModuleCodes = [...new Set(ROLE_MODULES.map((rm) => rm.domain_module_code))];
const moduleRows: Row[] = await pg(
  "GET",
  `/domain_modules?domain_module_code=in.(${allModuleCodes.join(",")})&select=id,domain_module_code`,
) ?? [];
const moduleIdByCode = new Map<string, number>(moduleRows.map((r) => [String(r.domain_module_code), r.id as number]));
const missingModules = allModuleCodes.filter((c) => !moduleIdByCode.has(c));
if (missingModules.length > 0) {
  throw new Error(`Missing domain_modules rows: ${missingModules.join(", ")}`);
}
console.log(`  domain_modules resolved: ${moduleIdByCode.size} / ${allModuleCodes.length}`);

// Resolve permissions.
const allPermNames = [...new Set(ROLE_PERMISSIONS.map((rp) => rp.permission_name))];
const permRows: Row[] = await pg(
  "GET",
  `/permissions?permission_name=in.(${allPermNames.join(",")})&select=id,permission_name`,
) ?? [];
const permIdByName = new Map<string, number>(permRows.map((r) => [String(r.permission_name), r.id as number]));
const missingPerms = allPermNames.filter((n) => !permIdByName.has(n));
if (missingPerms.length > 0) {
  throw new Error(`Missing permissions rows (run load_ats_module_permissions.ts first): ${missingPerms.join(", ")}`);
}
console.log(`  permissions resolved: ${permIdByName.size} / ${allPermNames.length}`);

// ============================================================
// 5. Upsert roles
// ============================================================
console.log("\n=== 1. Upserting roles ===");

const existingRolesRows: Row[] = await pg(
  "GET",
  `/roles?role_code=in.(${ROLES.map((r) => r.role_code).join(",")})&select=id,role_code,role_name,business_function_id,description`,
) ?? [];
const existingRoleByCode = new Map<string, Row>(existingRolesRows.map((r) => [String(r.role_code), r]));

let rolesInserted = 0;
let rolesPatched = 0;
let rolesUnchanged = 0;

const roleIdByCode = new Map<string, number>();

for (const r of ROLES) {
  const existing = existingRoleByCode.get(r.role_code);
  const slug = slugify(r.role_code);
  if (!existing) {
    const created = await pg("POST", "/roles", {
      role_code: r.role_code,
      role_name: r.role_name,
      slug, // built-in NOT NULL on slug; use lowercased role_code
      business_function_id: r.business_function_id,
      description: r.description,
      origin: "model",
      module_id: PLATFORM_MODULE_ID,
      record_status: "new",
    });
    const newId = Array.isArray(created) ? (created[0]?.id as number) : (created?.id as number);
    if (!newId) throw new Error(`Failed to read inserted id for ${r.role_code}`);
    roleIdByCode.set(r.role_code, newId);
    rolesInserted++;
    console.log(`  ✨ ${r.role_code} → id=${newId}`);
    continue;
  }
  roleIdByCode.set(r.role_code, existing.id as number);
  const patch: Row = {};
  if (existing.role_name !== r.role_name) patch.role_name = r.role_name;
  if (existing.business_function_id !== r.business_function_id) patch.business_function_id = r.business_function_id;
  if (existing.description !== r.description) patch.description = r.description;
  if (Object.keys(patch).length === 0) {
    rolesUnchanged++;
    console.log(`  ♻ ${r.role_code} (id=${existing.id}, unchanged)`);
    continue;
  }
  await pg("PATCH", `/roles?id=eq.${existing.id}`, patch);
  rolesPatched++;
  console.log(`  ♻ ${r.role_code} (id=${existing.id}, patched ${Object.keys(patch).join(",")})`);
}
console.log(`  ✨ inserted ${rolesInserted} / ♻ patched ${rolesPatched} / unchanged ${rolesUnchanged}`);

// ============================================================
// 6. Upsert role_modules
// ============================================================
console.log("\n=== 2. Upserting role_modules ===");

const roleIds = [...roleIdByCode.values()];
const existingRoleModules: Row[] = await pg(
  "GET",
  `/role_modules?role_id=in.(${roleIds.join(",")})&select=id,role_id,domain_module_id,interaction_level,notes`,
) ?? [];
const existingRMKey = new Map<string, Row>(
  existingRoleModules.map((r) => [`${r.role_id}:${r.domain_module_id}`, r]),
);

let rmInserted = 0;
let rmPatched = 0;
let rmUnchanged = 0;

for (const rm of ROLE_MODULES) {
  const roleId = roleIdByCode.get(rm.role_code)!;
  const moduleId = moduleIdByCode.get(rm.domain_module_code)!;
  const key = `${roleId}:${moduleId}`;
  const existing = existingRMKey.get(key);
  if (!existing) {
    await pg("POST", "/role_modules", {
      role_id: roleId,
      domain_module_id: moduleId,
      interaction_level: rm.interaction_level,
      notes: rm.notes ?? "",
    });
    rmInserted++;
    continue;
  }
  const patch: Row = {};
  if (existing.interaction_level !== rm.interaction_level) patch.interaction_level = rm.interaction_level;
  if ((existing.notes ?? "") !== (rm.notes ?? "")) patch.notes = rm.notes ?? "";
  if (Object.keys(patch).length === 0) {
    rmUnchanged++;
    continue;
  }
  await pg("PATCH", `/role_modules?id=eq.${existing.id}`, patch);
  rmPatched++;
}
console.log(`  ✨ inserted ${rmInserted} / ♻ patched ${rmPatched} / unchanged ${rmUnchanged}`);

// ============================================================
// 7. Upsert role_permissions
// ============================================================
console.log("\n=== 3. Upserting role_permissions ===");

const existingRolePerms: Row[] = await pg(
  "GET",
  `/role_permissions?role_id=in.(${roleIds.join(",")})&select=id,role_id,permission_id,notes`,
) ?? [];
const existingRPKey = new Map<string, Row>(
  existingRolePerms.map((r) => [`${r.role_id}:${r.permission_id}`, r]),
);

let rpInserted = 0;
let rpPatched = 0;
let rpUnchanged = 0;

for (const rp of ROLE_PERMISSIONS) {
  const roleId = roleIdByCode.get(rp.role_code)!;
  const permId = permIdByName.get(rp.permission_name)!;
  const key = `${roleId}:${permId}`;
  const existing = existingRPKey.get(key);
  if (!existing) {
    await pg("POST", "/role_permissions", {
      role_id: roleId,
      permission_id: permId,
      notes: rp.notes ?? "",
    });
    rpInserted++;
    continue;
  }
  const patch: Row = {};
  if ((existing.notes ?? "") !== (rp.notes ?? "")) patch.notes = rp.notes ?? "";
  if (Object.keys(patch).length === 0) {
    rpUnchanged++;
    continue;
  }
  await pg("PATCH", `/role_permissions?id=eq.${existing.id}`, patch);
  rpPatched++;
}
console.log(`  ✨ inserted ${rpInserted} / ♻ patched ${rpPatched} / unchanged ${rpUnchanged}`);

// ============================================================
// 8. Summary
// ============================================================
console.log("\n=== 4. Summary ===");
console.log();
console.log("  role                      | id   | modules | perms");
console.log("  --------------------------|------|---------|-------");
for (const r of ROLES) {
  const id = roleIdByCode.get(r.role_code);
  const nMods = ROLE_MODULES.filter((rm) => rm.role_code === r.role_code).length;
  const nPerms = ROLE_PERMISSIONS.filter((rp) => rp.role_code === r.role_code).length;
  console.log(
    `  ${r.role_code.padEnd(25)} | ${String(id).padStart(4)} | ${String(nMods).padStart(7)} | ${String(nPerms).padStart(5)}`,
  );
}

console.log("\n✓ load_ats_roles.ts complete.");
console.log("Verify via:");
console.log(`  semantius call crud postgrestRequest '{"method":"GET","path":"/roles?role_code=like.RECRUITING-*&select=id,role_code,role_name,business_function_id"}'`);
console.log(`  semantius call crud postgrestRequest '{"method":"GET","path":"/role_modules?role_id=in.(${roleIds.join(",")})&select=role_id,domain_module_id,interaction_level"}'`);
console.log(`  semantius call crud postgrestRequest '{"method":"GET","path":"/role_permissions?role_id=in.(${roleIds.join(",")})&select=role_id,permission_id"}'`);
