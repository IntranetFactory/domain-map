#!/usr/bin/env bun
// extend_permissions_and_roles_schema.ts
//
// Two schema extensions in one migration:
//
//   A. Permissions extension (plan-modules.md §11 step 3.5):
//        - permissions.domain_module_id   (nullable FK → domain_modules)
//        - permissions.tier               (text enum: baseline-read / baseline-manage /
//                                          baseline-admin / workflow-gate / override)
//      Materialization (loading the actual permission rows) happens in a separate
//      loader; this script only lands the columns.
//
//   B. Roles catalog (plan-roles.md §2):
//        - roles                          (the role catalog)
//        - role_modules                   (which modules each role touches; primary/secondary)
//        - role_permissions               (the cross-module bundle the deployer provisions)
//        - skills.role_id                 (nullable FK → roles; required when skill_type='role')
//
// Idempotent: skips any entity/field already present. Run from project root (CLAUDE.md cwd rule):
//   bun run c:/dev/domain-map/.tmp_deploy/extend_permissions_and_roles_schema.ts

export {};

const MODULE_ID = 1001;        // platform module "Domain Map"
const MODULE_SLUG = "domain_map";
const READ_PERM = `${MODULE_SLUG}:read`;
const MANAGE_PERM = `${MODULE_SLUG}:manage`;

type Row = Record<string, unknown>;

async function postgrest(method: string, path: string, body?: unknown): Promise<any> {
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
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path} (exit ${code}): ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

async function crud(tool: string, payload: unknown): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${tool} (exit ${code}): ${stderr || stdout}`);
  return stdout.trim() ? JSON.parse(stdout) : null;
}

async function existingFieldsOf(tableName: string): Promise<Set<string>> {
  const rows = await postgrest("GET", `/fields?table_name=eq.${tableName}&select=field_name`) ?? [];
  return new Set(rows.map((r: Row) => String(r.field_name)));
}

async function entityExists(tableName: string): Promise<boolean> {
  const rows = await postgrest("GET", `/entities?table_name=eq.${tableName}&select=table_name`) ?? [];
  return rows.length > 0;
}

type FieldSpec = {
  field_name: string;
  title: string;
  format: string;
  description?: string;
  enum_values?: string[];
  default_value?: string;
  reference_table?: string;
  reference_delete_mode?: string;
  relationship_label?: string;
  input_type?: string;
  field_order?: number;
};

async function addFields(tableName: string, specs: FieldSpec[]): Promise<number> {
  const existing = await existingFieldsOf(tableName);
  let added = 0;
  for (const f of specs) {
    if (existing.has(f.field_name)) {
      console.log(`    ♻ ${tableName}.${f.field_name}`);
      continue;
    }
    console.log(`    ✨ ${tableName}.${f.field_name}`);
    await crud("create_field", { data: { ...f, table_name: tableName } });
    added++;
  }
  return added;
}

// ============================================================
// A. permissions schema extension
// ============================================================
console.log("=== A — permissions.domain_module_id + tier ===");

await addFields("permissions", [
  {
    field_name: "domain_module_id",
    format: "reference",
    title: "Catalog Module",
    description: "Which catalog `domain_modules` row this permission belongs to. NULL for platform-built-in permissions (`user:read`, `public:read`); set for catalog-derived permissions following the `<domain_module_code>:<verb>` convention (plan-modules.md §4.6).",
    reference_table: "domain_modules",
    reference_delete_mode: "clear",
    relationship_label: "permissions of",
    field_order: 1000003,
  },
  {
    field_name: "tier",
    format: "enum",
    title: "Tier",
    description: "Where this permission sits in the §4.6 derivation: baseline tier (`read`/`manage`/`admin`), a workflow gate from a lifecycle state with `requires_permission=true`, or a pattern-flag override (`view_all_*`, `manage_all_*`, `submit_*`). Lets queries filter without parsing the permission_name.",
    enum_values: ["baseline-read", "baseline-manage", "baseline-admin", "workflow-gate", "override"],
    field_order: 1000005,
  },
]);

// ============================================================
// B1. roles entity
// ============================================================
console.log("\n=== B1 — roles entity ===");

const ROLES_TABLE = "roles";

if (!(await entityExists(ROLES_TABLE))) {
  console.log(`  ✨ create_entity ${ROLES_TABLE}`);
  await crud("create_entity", {
    data: {
      table_name: ROLES_TABLE,
      singular: "role",
      plural: "roles",
      singular_label: "Role",
      plural_label: "Roles",
      label_column: "role_name",
      description:
        "User persona / job-shaped role whose daily workflow spans multiple modules. Anchored to a business function (NULL = cross-functional, e.g. Hiring Manager). Roles are the first-class home for cross-module permission bundling — what per-module `:admin` / `:manage` / `:read` rollups can't express. See plan-roles.md.",
      module_id: MODULE_ID,
      view_permission: READ_PERM,
      edit_permission: MANAGE_PERM,
      audit_log: false,
      computed_fields: [],
      validation_rules: [],
    },
  });
} else {
  console.log(`  ♻ entity ${ROLES_TABLE} already exists`);
}

await addFields(ROLES_TABLE, [
  {
    field_name: "role_code",
    format: "text",
    title: "Role Code",
    description: "Natural key — UPPER-KEBAB. Function-scoped roles use `<FUNCTION-CODE>-<ROLE-NAME>` (`RECRUITING-RECRUITER`, `IT-SERVICE-DESK-AGENT`). Cross-functional roles drop the prefix (`HIRING-MANAGER`). See plan-roles.md §1.",
    input_type: "required",
    field_order: 1000003,
  },
  {
    field_name: "role_name",
    format: "text",
    title: "Role Name",
    description: "Human-readable name. The label_column for this entity.",
    input_type: "required",
    field_order: 1000005,
  },
  {
    field_name: "business_function_id",
    format: "reference",
    title: "Business Function",
    description: "Anchoring business function. NULL = cross-functional role (e.g. Hiring Manager). Per plan-roles.md §7 Q2 resolution, NULL carries the cross-functional meaning; no separate `is_cross_functional` boolean.",
    reference_table: "business_functions",
    reference_delete_mode: "clear",
    relationship_label: "roles in",
    field_order: 1000007,
  },
  {
    field_name: "description",
    format: "multiline",
    title: "Description",
    description: "What this role owns, how their daily workflow looks across modules.",
    field_order: 1000009,
  },
  {
    field_name: "record_status",
    format: "enum",
    title: "Record Status",
    enum_values: ["new", "pending", "approved", "rejected"],
    default_value: "new",
    field_order: 1000999,
  },
]);

await crud("refresh_schema_cache", {});

// ============================================================
// B2. role_modules junction
// ============================================================
console.log("\n=== B2 — role_modules ===");

const ROLE_MOD_TABLE = "role_modules";

if (!(await entityExists(ROLE_MOD_TABLE))) {
  console.log(`  ✨ create_entity ${ROLE_MOD_TABLE}`);
  const labelCompute = {
    name: "role_module_label",
    description: "Composed: <role_code> on <domain_module_code>. Recomputed on write.",
    source_module: MODULE_SLUG,
    jsonlogic: {
      set_record: [
        "r",
        "roles",
        { var: "role_id" },
        {
          set_record: [
            "m",
            "domain_modules",
            { var: "domain_module_id" },
            { cat: [{ var: "r.role_code" }, " on ", { var: "m.domain_module_code" }] },
          ],
        },
      ],
    },
  };
  await crud("create_entity", {
    data: {
      table_name: ROLE_MOD_TABLE,
      singular: "role_module",
      plural: "role_modules",
      singular_label: "Role Module",
      plural_label: "Role Modules",
      label_column: "role_module_label",
      description: "Junction: which modules does this role touch, and how heavily. `interaction_level` is two-value (`primary` / `secondary`) — read-only-ness is captured by the role's permission bundle holding only `:read` for that module, not a separate axis. Per plan-roles.md §7 Q1 resolution. The 2-module floor (§7 Q5) is enforced by the loader, not at the DB level.",
      module_id: MODULE_ID,
      view_permission: READ_PERM,
      edit_permission: MANAGE_PERM,
      audit_log: false,
      computed_fields: [labelCompute],
      validation_rules: [],
    },
  });
} else {
  console.log(`  ♻ entity ${ROLE_MOD_TABLE} already exists`);
}

await addFields(ROLE_MOD_TABLE, [
  {
    field_name: "role_module_label",
    format: "text",
    title: "Role Module",
    description: "Computed: <role_code> on <domain_module_code>.",
    input_type: "required",
    field_order: 1000001,
  },
  {
    field_name: "role_id",
    format: "parent",
    title: "Role",
    description: "The role that touches this module.",
    reference_table: "roles",
    reference_delete_mode: "cascade",
    relationship_label: "touches module",
    input_type: "required",
    field_order: 1000003,
  },
  {
    field_name: "domain_module_id",
    format: "parent",
    title: "Module",
    description: "The catalog module this role interacts with.",
    reference_table: "domain_modules",
    reference_delete_mode: "cascade",
    relationship_label: "touched by role",
    input_type: "required",
    field_order: 1000005,
  },
  {
    field_name: "interaction_level",
    format: "enum",
    title: "Interaction Level",
    description: "How heavily this role touches this module. `primary` = the role can't function without this module (drives the role-union on-ramp per plan-roles.md §5.1). `secondary` = the role uses this module supportively or read-only.",
    enum_values: ["primary", "secondary"],
    default_value: "secondary",
    input_type: "required",
    field_order: 1000007,
  },
  {
    field_name: "notes",
    format: "multiline",
    title: "Notes",
    description: "Optional. Why this role touches this module at this interaction level.",
    field_order: 1000009,
  },
]);

// ============================================================
// B3. role_permissions junction
// ============================================================
console.log("\n=== B3 — role_permissions ===");

const ROLE_PERM_TABLE = "role_permissions";

if (!(await entityExists(ROLE_PERM_TABLE))) {
  console.log(`  ✨ create_entity ${ROLE_PERM_TABLE}`);
  const labelCompute = {
    name: "role_permission_label",
    description: "Composed: <role_code> grants <permission_name>. Recomputed on write.",
    source_module: MODULE_SLUG,
    jsonlogic: {
      set_record: [
        "r",
        "roles",
        { var: "role_id" },
        {
          set_record: [
            "p",
            "permissions",
            { var: "permission_id" },
            { cat: [{ var: "r.role_code" }, " grants ", { var: "p.permission_name" }] },
          ],
        },
      ],
    },
  };
  await crud("create_entity", {
    data: {
      table_name: ROLE_PERM_TABLE,
      singular: "role_permission",
      plural: "role_permissions",
      singular_label: "Role Permission",
      plural_label: "Role Permissions",
      label_column: "role_permission_label",
      description: "Junction: the cross-module permission bundle the deployer provisions for this role. Each role declares its complete bundle directly — no inheritance, no resolution at deploy time (plan-roles.md §4.3 + §7 Q3 resolution). Tier-level permissions (`:read`/`:manage`/`:admin`) expand at request time via Semantius's existing `permission_hierarchy` edges.",
      module_id: MODULE_ID,
      view_permission: READ_PERM,
      edit_permission: MANAGE_PERM,
      audit_log: false,
      computed_fields: [labelCompute],
      validation_rules: [],
    },
  });
} else {
  console.log(`  ♻ entity ${ROLE_PERM_TABLE} already exists`);
}

await addFields(ROLE_PERM_TABLE, [
  {
    field_name: "role_permission_label",
    format: "text",
    title: "Role Permission",
    description: "Computed: <role_code> grants <permission_name>.",
    input_type: "required",
    field_order: 1000001,
  },
  {
    field_name: "role_id",
    format: "parent",
    title: "Role",
    description: "The role that needs this permission.",
    reference_table: "roles",
    reference_delete_mode: "cascade",
    relationship_label: "needs permission",
    input_type: "required",
    field_order: 1000003,
  },
  {
    field_name: "permission_id",
    format: "parent",
    title: "Permission",
    description: "The permission the role needs. References the existing `permissions` table — Semantius's runtime permissions, materialized for catalog modules per plan-modules.md §11 step 3.5.",
    reference_table: "permissions",
    reference_delete_mode: "cascade",
    relationship_label: "granted to role",
    input_type: "required",
    field_order: 1000005,
  },
  {
    field_name: "notes",
    format: "multiline",
    title: "Notes",
    description: "Optional. Why this role needs this specific permission (vs. relying on tier inheritance).",
    field_order: 1000007,
  },
]);

// ============================================================
// B4. skills.role_id column
// ============================================================
console.log("\n=== B4 — skills.role_id ===");

await addFields("skills", [
  {
    field_name: "role_id",
    format: "reference",
    title: "Role",
    description: "For `skill_type='role'` skills, the role this skill wraps. NULL on `system` and `process` skills. Role skills themselves are deferred to plan-roles.md Phase 2 (§4.4); the column lands now so the FK shape is stable.",
    reference_table: "roles",
    reference_delete_mode: "clear",
    relationship_label: "skills for role",
    field_order: 1000020,
  },
]);

await crud("refresh_schema_cache", {});

console.log("\n✓ extend_permissions_and_roles_schema.ts complete.");
console.log("Verify via:");
console.log(`  semantius call crud postgrestRequest '{"method":"GET","path":"/fields?table_name=eq.permissions&select=field_name&order=field_order.asc"}'`);
console.log(`  semantius call crud postgrestRequest '{"method":"GET","path":"/roles?select=id&limit=1"}'`);
console.log(`  semantius call crud postgrestRequest '{"method":"GET","path":"/role_modules?select=id&limit=1"}'`);
console.log(`  semantius call crud postgrestRequest '{"method":"GET","path":"/role_permissions?select=id&limit=1"}'`);
