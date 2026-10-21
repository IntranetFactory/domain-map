#!/usr/bin/env bun
// extend_fact_sheet_schema.ts — Step 2 of plan-domain-fact-sheets.md.
//
// Additive schema extension to support per-domain fact sheets:
//   1. Add 8 fields to data_objects (kind, naming, labels, pattern flags)
//   2. Add owner_side enum field to data_object_relationships
//      (relationship_label / necessity already exist as relationship_verb / is_required;
//       see plan §3.2 reconciliation note)
//   3. Create data_object_lifecycle_states entity + fields
//   4. Backfill singular_label from display_label; default plural_label
//   5. Seed the users row with kind='platform_builtin'
//
// Idempotent: skips any field/entity already present; only backfills NULL/empty values.
// Run from project root: bun run c:/dev/domain-map/.tmp_deploy/extend_fact_sheet_schema.ts

export {};

const MODULE_ID = 1001;
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
  is_nullable?: boolean;
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
// STEP 2b — fields on data_objects
// ============================================================
console.log("=== Step 2b — data_objects fields ===");

const dataObjectsFields: FieldSpec[] = [
  {
    field_name: "kind",
    format: "enum",
    title: "Kind",
    description: "Discriminator for catalog-owned data objects (`domain_owned`, default) vs platform built-ins seeded for relationship-graph completeness (`platform_builtin`, e.g. the `users` row). Platform built-ins do not appear in domain-level analytics but participate in `data_object_relationships`.",
    enum_values: ["domain_owned", "platform_builtin"],
    default_value: "domain_owned",
    field_order: 1000003,
  },
  {
    field_name: "is_canonical_bare_word",
    format: "boolean",
    title: "Canonical Bare-Word",
    description: "TRUE when this domain holds catalog-wide canonical authority for an unprefixed noun (e.g. ATS owns `candidates`, CRM owns `customers`). Required when `data_object_name` is a bare word; without it, naming-arbitration (Rule #9) forces a domain prefix.",
    default_value: "false",
    field_order: 1000011,
  },
  {
    field_name: "naming_authority_rationale",
    format: "multiline",
    title: "Naming Authority Rationale",
    description: "Required when `is_canonical_bare_word=true`. Explains why this domain owns the unprefixed name and which adjacent domains defer to it. Surfaced in the fact sheet to prevent future collision-prone proposals.",
    field_order: 1000013,
  },
  {
    field_name: "singular_label",
    format: "text",
    title: "Singular Label",
    description: "Human-friendly singular form (`Job Requisition`, `Customer`). Replaces `display_label` for fact-sheet output. The legacy `display_label` column is retained transitionally (see plan-domain-fact-sheets.md § 9.1 Step 10).",
    field_order: 1000005,
  },
  {
    field_name: "plural_label",
    format: "text",
    title: "Plural Label",
    description: "Human-friendly plural form (`Job Requisitions`, `Customers`). Required going forward.",
    field_order: 1000007,
  },
  {
    field_name: "has_personal_content",
    format: "boolean",
    title: "Has Personal Content",
    description: "Pattern flag — TRUE when this data_object holds per-user-scoped content (e.g. interview feedback, peer reviews). Drives derivation of `<slug>:view_all_<entity>` / `<slug>:manage_all_<entity>` override permissions and an `<entity>_edit_scope` business rule in the fact sheet.",
    default_value: "false",
    field_order: 1000015,
  },
  {
    field_name: "has_submit_lock",
    format: "boolean",
    title: "Has Submit Lock",
    description: "Pattern flag — TRUE when this data_object follows the submit-then-lock workflow (e.g. interview scorecards, expense reports). Drives derivation of `<slug>:submit_<entity>` workflow gate and a `submit_restricted_to_<owner>` business rule.",
    default_value: "false",
    field_order: 1000017,
  },
  {
    field_name: "has_single_approver",
    format: "boolean",
    title: "Has Single Approver",
    description: "Pattern flag — TRUE when this data_object requires a single named approver to advance (e.g. job offers, headcount plans). Drives derivation of the approval workflow gate from the lifecycle state machine.",
    default_value: "false",
    field_order: 1000019,
  },
];

await addFields("data_objects", dataObjectsFields);

// ============================================================
// STEP 2c — fields on data_object_relationships
// ============================================================
// Only owner_side is genuinely new. The plan's `relationship_label` is satisfied
// by the existing `relationship_verb`, and `necessity` (required/optional) is
// captured by the existing `is_required` boolean.
console.log("\n=== Step 2c — data_object_relationships fields ===");

const relationshipFields: FieldSpec[] = [
  {
    field_name: "owner_side",
    format: "enum",
    title: "Owner Side",
    description: "Which side is the lifecycle owner of the relationship. `source` = the row identified by `data_object_id` cascades into the related object on delete; `target` = the related object owns the lifecycle. Drives the architect's delete-mode derivation downstream.",
    enum_values: ["source", "target"],
    default_value: "source",
    field_order: 1000023,
  },
];

await addFields("data_object_relationships", relationshipFields);

// ============================================================
// STEP 2d — data_object_lifecycle_states entity
// ============================================================
console.log("\n=== Step 2d — data_object_lifecycle_states entity ===");

const LIFECYCLE_TABLE = "data_object_lifecycle_states";

if (!(await entityExists(LIFECYCLE_TABLE))) {
  console.log(`  ✨ create_entity ${LIFECYCLE_TABLE}`);
  const computedLabel = {
    name: "data_object_lifecycle_state_label",
    description: "Composed: <data_object_name>.<state_name>. Recomputed on write so renames flow through.",
    source_module: MODULE_SLUG,
    jsonlogic: {
      set_record: [
        "d",
        "data_objects",
        { var: "data_object_id" },
        { cat: [{ var: "d.data_object_name" }, ".", { var: "state_name" }] },
      ],
    },
  };
  await crud("create_entity", {
    data: {
      table_name: LIFECYCLE_TABLE,
      singular: "data_object_lifecycle_state",
      plural: "data_object_lifecycle_states",
      singular_label: "Data Object Lifecycle State",
      plural_label: "Data Object Lifecycle States",
      label_column: "data_object_lifecycle_state_label",
      description: "Intra-domain lifecycle state per master `data_object` (`applied`, `screening`, `pending_approval`, `approved`, `hired`, `rejected`). Drives derivation of workflow-gate permissions and the §1 behavioral-pattern prose in per-domain fact sheets. Required for `master + required` data_objects on every new domain load (Rule #12).",
      module_id: MODULE_ID,
      view_permission: READ_PERM,
      edit_permission: MANAGE_PERM,
      audit_log: false,
      computed_fields: [computedLabel],
      validation_rules: [],
    },
  });
} else {
  console.log(`  ♻ entity ${LIFECYCLE_TABLE} already exists`);
}

const lifecycleFields: FieldSpec[] = [
  {
    field_name: "data_object_id",
    format: "parent",
    title: "Data Object",
    description: "The master data_object this state belongs to.",
    reference_table: "data_objects",
    reference_delete_mode: "cascade",
    relationship_label: "has lifecycle state",
    input_type: "required",
    field_order: 1000003,
  },
  {
    field_name: "state_name",
    format: "text",
    title: "State Name",
    description: "snake_case state identifier (`applied`, `screening`, `pending_approval`, `approved`, `hired`, `rejected`). Combines with `data_object_name` to form the composed label.",
    input_type: "required",
    field_order: 1000005,
  },
  {
    field_name: "state_order",
    format: "int32",
    title: "State Order",
    description: "Sort order for fact-sheet rendering. Lower = earlier in lifecycle.",
    default_value: "0",
    field_order: 1000007,
  },
  {
    field_name: "description",
    format: "multiline",
    title: "Description",
    description: "What this state means (e.g. `pending_approval = offer drafted, awaiting hiring manager sign-off`).",
    field_order: 1000009,
  },
  {
    field_name: "is_initial",
    format: "boolean",
    title: "Is Initial",
    description: "TRUE for the entry state (typically one per data_object).",
    default_value: "false",
    field_order: 1000011,
  },
  {
    field_name: "is_terminal",
    format: "boolean",
    title: "Is Terminal",
    description: "TRUE for terminal states (no outgoing transitions).",
    default_value: "false",
    field_order: 1000013,
  },
  {
    field_name: "requires_permission",
    format: "boolean",
    title: "Requires Permission",
    description: "TRUE when transitioning into this state requires a workflow gate. Drives derivation of `<slug>:<verb>_<entity>` permissions in the fact sheet.",
    default_value: "false",
    field_order: 1000015,
  },
  {
    field_name: "permission_verb_override",
    format: "text",
    title: "Permission Verb Override",
    description: "Optional. Overrides the auto-derived verb when `requires_permission=true`. Default verb is `state_name` (`approved → approve`); override when the natural verb differs (`hired → hire_candidate`).",
    field_order: 1000017,
  },
  {
    field_name: "notes",
    format: "multiline",
    title: "Notes",
    field_order: 1000019,
  },
  {
    field_name: "record_status",
    format: "enum",
    title: "Record Status",
    enum_values: ["new", "pending", "approved", "rejected"],
    default_value: "new",
    field_order: 1000021,
  },
];

await addFields(LIFECYCLE_TABLE, lifecycleFields);

// ============================================================
// Refresh schema cache once after structural changes
// ============================================================
console.log("\n=== Refresh schema cache ===");
await crud("refresh_schema_cache", {});
console.log("  ✓ schema cache refreshed");

// ============================================================
// STEP 2e — backfill singular_label / plural_label
// ============================================================
console.log("\n=== Step 2e — backfill singular_label / plural_label ===");

function naivePluralize(singular: string): string {
  // Handles the common English-label cases. Irregulars (Person → People) are
  // surfaced for manual fix after backfill.
  const s = singular.trim();
  if (!s) return s;
  if (/(s|x|z|ch|sh)$/i.test(s)) return s + "es";
  if (/[bcdfghjklmnpqrstvwxz]y$/i.test(s)) return s.slice(0, -1) + "ies";
  return s + "s";
}

const allDataObjects = await postgrest(
  "GET",
  "/data_objects?select=id,data_object_name,display_label,singular_label,plural_label&order=id.asc",
) ?? [];

console.log(`  scanning ${allDataObjects.length} data_objects rows`);

let singularBackfills = 0;
let pluralBackfills = 0;

for (const row of allDataObjects) {
  const id = row.id;
  const display = (row.display_label as string | null) ?? "";
  const singular = (row.singular_label as string | null) ?? "";
  const plural = (row.plural_label as string | null) ?? "";

  const patch: Row = {};
  if (!singular && display) {
    patch.singular_label = display;
    singularBackfills++;
  }
  if (!plural) {
    const source = singular || display;
    if (source) {
      patch.plural_label = naivePluralize(source);
      pluralBackfills++;
    }
  }

  if (Object.keys(patch).length > 0) {
    await postgrest("PATCH", `/data_objects?id=eq.${id}`, patch);
  }
}

console.log(`  ✓ ${singularBackfills} singular_label backfilled, ${pluralBackfills} plural_label backfilled`);

// ============================================================
// STEP 2f — seed users row with kind='platform_builtin'
// ============================================================
console.log("\n=== Step 2f — seed users data_object (platform_builtin) ===");

const usersRow = await postgrest("GET", "/data_objects?data_object_name=eq.users&select=id,kind") ?? [];
if (usersRow.length === 0) {
  console.log("  ✨ creating users data_object (kind=platform_builtin)");
  await postgrest("POST", "/data_objects", {
    data_object_name: "users",
    singular_label: "User",
    plural_label: "Users",
    display_label: "User",
    description: "Semantius platform-owned user table. Referenced from domain `data_objects` via `data_object_relationships` for assignee / author / approver / creator edges. Not surfaced in domain-level analytics (Signal 1/2 ignore `kind='platform_builtin'`).",
    kind: "platform_builtin",
    is_canonical_bare_word: true,
    naming_authority_rationale: "Semantius platform-owned identity table — the only true platform built-in in scope. Every domain refers to `users` for actor relationships; no domain can claim a competing canonical authority.",
  });
} else {
  // Ensure kind is set even if a domain previously authored a `users` data_object as domain_owned
  if (usersRow[0].kind !== "platform_builtin") {
    console.log(`  ♻ upgrading existing users row (id=${usersRow[0].id}) to kind=platform_builtin`);
    await postgrest("PATCH", `/data_objects?id=eq.${usersRow[0].id}`, {
      kind: "platform_builtin",
      is_canonical_bare_word: true,
    });
  } else {
    console.log(`  ♻ users row already seeded (id=${usersRow[0].id})`);
  }
}

console.log("\n✓ Step 2 complete.");
console.log("UI:");
console.log("  https://tests.semantius.app/domain_map/data_objects");
console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
console.log("  https://tests.semantius.app/domain_map/data_object_lifecycle_states");
