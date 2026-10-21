#!/usr/bin/env bun
// extend_modules_schema.ts — Step 2 of plan-modules.md.
//
// Additive schema extension for the modular deployment layer:
//   A. Create 5 new tables
//        - domain_modules
//        - domain_module_capabilities       (M:N module ↔ capability)
//        - domain_module_data_objects       (per-module data_object footprint)
//        - domain_module_host_domains       (cross-cutting module → additional hosts)
//        - domain_starter_modules           (per-domain editorial on-ramp)
//   B. Add 7 new columns on existing tables
//        - cross_domain_handoffs.source_domain_module_id   (nullable FK)
//        - cross_domain_handoffs.target_domain_module_id   (nullable FK)
//        - trigger_events.domain_module_id                 (nullable FK)
//        - skills.domain_module_id                         (nullable FK)
//        - skills.process_id                               (nullable FK)
//        - data_object_lifecycle_states.domain_module_id   (nullable FK)
//        - data_objects.minimum_embedded_shape             (multiline)
//
// Idempotent: skips any entity/field already present. Run from project root:
//   bun run c:/dev/domain-map/.tmp_deploy/extend_modules_schema.ts

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
// A1. domain_modules entity
// ============================================================
console.log("=== A1 — domain_modules entity ===");

const MOD_TABLE = "domain_modules";

if (!(await entityExists(MOD_TABLE))) {
  console.log(`  ✨ create_entity ${MOD_TABLE}`);
  await crud("create_entity", {
    data: {
      table_name: MOD_TABLE,
      singular: "domain_module",
      plural: "domain_modules",
      singular_label: "Domain Module",
      plural_label: "Domain Modules",
      label_column: "domain_module_name",
      description:
        "Autonomous, independently-deployable unit between capabilities (market-analysis layer) and the live Semantius semantic models. Each module is self-contained: it owns its own data_objects, lifecycle states, edges, and tool surface, and composes with other modules at deploy time via the existing master / embedded_master demotion mechanism (no dependency tree). See plan-modules.md for the design intent.",
      module_id: MODULE_ID,
      view_permission: READ_PERM,
      edit_permission: MANAGE_PERM,
      audit_log: false,
      computed_fields: [],
      validation_rules: [],
    },
  });
} else {
  console.log(`  ♻ entity ${MOD_TABLE} already exists`);
}

await addFields(MOD_TABLE, [
  {
    field_name: "domain_module_code",
    format: "text",
    title: "Module Code",
    description: "Natural key — stable identifier (`ATS-CANDIDATE-CRM`, `KNOWLEDGE-MGMT`). UPPER-KEBAB. Per-domain modules prefix with the parent domain code; cross-cutting modules use a bare descriptor.",
    input_type: "required",
    field_order: 1000003,
  },
  {
    field_name: "domain_module_name",
    format: "text",
    title: "Module Name",
    description: "Human-readable name (`Candidate CRM`, `Knowledge Management`). The label_column for this entity.",
    input_type: "required",
    field_order: 1000005,
  },
  {
    field_name: "domain_id",
    format: "reference",
    title: "Primary Home Domain",
    description: "The standalone-product domain where this module's market analysis lives. NULL for truly cross-cutting modules with no obvious standalone-product home (e.g. APPROVAL-WORKFLOW, AI-TRIAGE). Additional installable hosts are listed in `domain_module_host_domains`.",
    reference_table: "domains",
    reference_delete_mode: "clear",
    relationship_label: "primary home of",
    field_order: 1000007,
  },
  {
    field_name: "description",
    format: "multiline",
    title: "Description",
    description: "What this module does, what it masters, when it's used standalone vs alongside others.",
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

// Refresh so subsequent FK columns can resolve domain_modules.
await crud("refresh_schema_cache", {});

// ============================================================
// A2. domain_module_capabilities (M:N module ↔ capability)
// ============================================================
console.log("\n=== A2 — domain_module_capabilities ===");

const MOD_CAP_TABLE = "domain_module_capabilities";

if (!(await entityExists(MOD_CAP_TABLE))) {
  console.log(`  ✨ create_entity ${MOD_CAP_TABLE}`);
  const labelCompute = {
    name: "domain_module_capability_label",
    description: "Composed: <module_code> / <capability_code>. Recomputed on write.",
    source_module: MODULE_SLUG,
    jsonlogic: {
      set_record: [
        "m",
        "domain_modules",
        { var: "domain_module_id" },
        {
          set_record: [
            "c",
            "capabilities",
            { var: "capability_id" },
            { cat: [{ var: "m.domain_module_code" }, " / ", { var: "c.capability_code" }] },
          ],
        },
      ],
    },
  };
  await crud("create_entity", {
    data: {
      table_name: MOD_CAP_TABLE,
      singular: "domain_module_capability",
      plural: "domain_module_capabilities",
      singular_label: "Module Capability",
      plural_label: "Module Capabilities",
      label_column: "domain_module_capability_label",
      description: "Junction: a domain_module realizes one or more capabilities; a cross-cutting capability can be realized by modules in multiple domains. Many-to-many.",
      module_id: MODULE_ID,
      view_permission: READ_PERM,
      edit_permission: MANAGE_PERM,
      audit_log: false,
      computed_fields: [labelCompute],
      validation_rules: [],
    },
  });
} else {
  console.log(`  ♻ entity ${MOD_CAP_TABLE} already exists`);
}

await addFields(MOD_CAP_TABLE, [
  {
    field_name: "domain_module_id",
    format: "parent",
    title: "Module",
    description: "The module that realizes this capability.",
    reference_table: "domain_modules",
    reference_delete_mode: "cascade",
    relationship_label: "realizes capability",
    input_type: "required",
    field_order: 1000003,
  },
  {
    field_name: "capability_id",
    format: "parent",
    title: "Capability",
    description: "The capability realized by this module.",
    reference_table: "capabilities",
    reference_delete_mode: "cascade",
    relationship_label: "realized by",
    input_type: "required",
    field_order: 1000005,
  },
  {
    field_name: "notes",
    format: "multiline",
    title: "Notes",
    description: "Optional. Why this module realizes this capability, or which slice of the capability it covers.",
    field_order: 1000007,
  },
]);

// ============================================================
// A3. domain_module_data_objects (per-module data_object footprint)
// ============================================================
console.log("\n=== A3 — domain_module_data_objects ===");

const MOD_DO_TABLE = "domain_module_data_objects";

if (!(await entityExists(MOD_DO_TABLE))) {
  console.log(`  ✨ create_entity ${MOD_DO_TABLE}`);
  const labelCompute = {
    name: "domain_module_data_object_label",
    description: "Composed: <module_code> / <data_object_name>. Recomputed on write.",
    source_module: MODULE_SLUG,
    jsonlogic: {
      set_record: [
        "m",
        "domain_modules",
        { var: "domain_module_id" },
        {
          set_record: [
            "o",
            "data_objects",
            { var: "data_object_id" },
            { cat: [{ var: "m.domain_module_code" }, " / ", { var: "o.data_object_name" }] },
          ],
        },
      ],
    },
  };
  await crud("create_entity", {
    data: {
      table_name: MOD_DO_TABLE,
      singular: "domain_module_data_object",
      plural: "domain_module_data_objects",
      singular_label: "Module Data Object",
      plural_label: "Module Data Objects",
      label_column: "domain_module_data_object_label",
      description: "Per-module data_object footprint. Same five-role vocabulary as `domain_data_objects.role`. A module's data_object footprint IS its composition declaration — no separate dependency tree. Two modules sharing a data_object compose automatically via the existing embedded_master demotion mechanism. See plan-modules.md §2 and §4.4.",
      module_id: MODULE_ID,
      view_permission: READ_PERM,
      edit_permission: MANAGE_PERM,
      audit_log: false,
      computed_fields: [labelCompute],
      validation_rules: [],
    },
  });
} else {
  console.log(`  ♻ entity ${MOD_DO_TABLE} already exists`);
}

await addFields(MOD_DO_TABLE, [
  {
    field_name: "domain_module_id",
    format: "parent",
    title: "Module",
    reference_table: "domain_modules",
    reference_delete_mode: "cascade",
    relationship_label: "touches data object",
    input_type: "required",
    field_order: 1000003,
  },
  {
    field_name: "data_object_id",
    format: "parent",
    title: "Data Object",
    reference_table: "data_objects",
    reference_delete_mode: "cascade",
    relationship_label: "touched by module",
    input_type: "required",
    field_order: 1000005,
  },
  {
    field_name: "role",
    format: "enum",
    title: "Role",
    description: "The module's relationship to this data_object. master = the module canonically owns this data_object. embedded_master = the module ships a local-master shell (demoted to reference at deploy time if the canonical master is also installed). contributor = the module writes into a data_object mastered elsewhere. consumer = the module reads only. derived = the module materializes computed/derived data from this object.",
    enum_values: ["master", "embedded_master", "contributor", "consumer", "derived"],
    input_type: "required",
    field_order: 1000007,
  },
  {
    field_name: "necessity",
    format: "enum",
    title: "Necessity",
    description: "Meaningful on `consumer` / `embedded_master` rows that gracefully degrade. required = the module breaks without this data_object available. optional = the module functions fine without it (e.g. ATS-OFFERS embedded_masters salary_bands as optional — offers go out without guidance overlay). `master` rows are required by definition; this field is ignored there. See plan-modules.md §4.4.",
    enum_values: ["required", "optional"],
    default_value: "required",
    field_order: 1000009,
  },
  {
    field_name: "notes",
    format: "multiline",
    title: "Notes",
    field_order: 1000011,
  },
]);

// ============================================================
// A4. domain_module_host_domains (cross-cutting modules' additional hosts)
// ============================================================
console.log("\n=== A4 — domain_module_host_domains ===");

const MOD_HOST_TABLE = "domain_module_host_domains";

if (!(await entityExists(MOD_HOST_TABLE))) {
  console.log(`  ✨ create_entity ${MOD_HOST_TABLE}`);
  const labelCompute = {
    name: "domain_module_host_domain_label",
    description: "Composed: <module_code> @ <domain_code>. Recomputed on write.",
    source_module: MODULE_SLUG,
    jsonlogic: {
      set_record: [
        "m",
        "domain_modules",
        { var: "domain_module_id" },
        {
          set_record: [
            "d",
            "domains",
            { var: "domain_id" },
            { cat: [{ var: "m.domain_module_code" }, " @ ", { var: "d.domain_code" }] },
          ],
        },
      ],
    },
  };
  await crud("create_entity", {
    data: {
      table_name: MOD_HOST_TABLE,
      singular: "domain_module_host_domain",
      plural: "domain_module_host_domains",
      singular_label: "Module Host Domain",
      plural_label: "Module Host Domains",
      label_column: "domain_module_host_domain_label",
      description: "Additional domains where a cross-cutting module is installable beyond its `domain_modules.domain_id` primary home. Only populated for cross-cutting modules (KNOWLEDGE-MGMT, SLA-MGMT, APPROVAL-WORKFLOW, …). Normal non-cross-cutting modules have zero rows here. The primary home is *not* duplicated in this junction. See plan-modules.md §4.5.",
      module_id: MODULE_ID,
      view_permission: READ_PERM,
      edit_permission: MANAGE_PERM,
      audit_log: false,
      computed_fields: [labelCompute],
      validation_rules: [],
    },
  });
} else {
  console.log(`  ♻ entity ${MOD_HOST_TABLE} already exists`);
}

await addFields(MOD_HOST_TABLE, [
  {
    field_name: "domain_module_id",
    format: "parent",
    title: "Module",
    reference_table: "domain_modules",
    reference_delete_mode: "cascade",
    relationship_label: "installable on",
    input_type: "required",
    field_order: 1000003,
  },
  {
    field_name: "domain_id",
    format: "parent",
    title: "Host Domain",
    reference_table: "domains",
    reference_delete_mode: "cascade",
    relationship_label: "hosts module",
    input_type: "required",
    field_order: 1000005,
  },
  {
    field_name: "notes",
    format: "multiline",
    title: "Notes",
    description: "Per-host nuance (e.g. KNOWLEDGE-MGMT on ITSM uses agent-facing rendering; on CSM customer-facing).",
    field_order: 1000007,
  },
]);

// ============================================================
// A5. domain_starter_modules (per-domain editorial on-ramp)
// ============================================================
console.log("\n=== A5 — domain_starter_modules ===");

const STARTER_TABLE = "domain_starter_modules";

if (!(await entityExists(STARTER_TABLE))) {
  console.log(`  ✨ create_entity ${STARTER_TABLE}`);
  const labelCompute = {
    name: "domain_starter_module_label",
    description: "Composed: <domain_code> starter [<position>] <module_code>. Recomputed on write.",
    source_module: MODULE_SLUG,
    jsonlogic: {
      set_record: [
        "d",
        "domains",
        { var: "domain_id" },
        {
          set_record: [
            "m",
            "domain_modules",
            { var: "domain_module_id" },
            {
              cat: [
                { var: "d.domain_code" },
                " starter [",
                { var: "position" },
                "] ",
                { var: "m.domain_module_code" },
              ],
            },
          ],
        },
      ],
    },
  };
  await crud("create_entity", {
    data: {
      table_name: STARTER_TABLE,
      singular: "domain_starter_module",
      plural: "domain_starter_modules",
      singular_label: "Domain Starter Module",
      plural_label: "Domain Starter Modules",
      label_column: "domain_starter_module_label",
      description: "Per-domain editorial on-ramp: 'if you don't know where to begin, install these modules in this order'. Editorial, not a gate — buyers may install any subset. Domains without an obvious starter have zero rows; the fact sheet then omits the 'Getting started' section. One recommended set per domain (no SMB / Enterprise variants — re-introduces tier complexity). See plan-modules.md §3.",
      module_id: MODULE_ID,
      view_permission: READ_PERM,
      edit_permission: MANAGE_PERM,
      audit_log: false,
      computed_fields: [labelCompute],
      validation_rules: [],
    },
  });
} else {
  console.log(`  ♻ entity ${STARTER_TABLE} already exists`);
}

await addFields(STARTER_TABLE, [
  {
    field_name: "domain_id",
    format: "parent",
    title: "Domain",
    reference_table: "domains",
    reference_delete_mode: "cascade",
    relationship_label: "has starter module",
    input_type: "required",
    field_order: 1000003,
  },
  {
    field_name: "domain_module_id",
    format: "parent",
    title: "Module",
    reference_table: "domain_modules",
    reference_delete_mode: "cascade",
    relationship_label: "recommended starter for",
    input_type: "required",
    field_order: 1000005,
  },
  {
    field_name: "position",
    format: "int32",
    title: "Position",
    description: "1-based install order. Lower = install first.",
    input_type: "required",
    field_order: 1000007,
  },
  {
    field_name: "notes",
    format: "multiline",
    title: "Notes",
    description: "Editorial copy emitted verbatim into the 'Getting started' section of the domain fact sheet.",
    field_order: 1000009,
  },
]);

// Refresh once more so subsequent FK additions resolve all new tables.
await crud("refresh_schema_cache", {});

// ============================================================
// B. New columns on existing tables
// ============================================================
console.log("\n=== B — new columns on existing tables ===");

console.log("\n  cross_domain_handoffs:");
await addFields("cross_domain_handoffs", [
  {
    field_name: "source_domain_module_id",
    format: "reference",
    title: "Source Module",
    description: "Handoffs really live between modules; the source-domain rollup stays as today during backfill. NULL until the source domain is modularized.",
    reference_table: "domain_modules",
    reference_delete_mode: "clear",
    relationship_label: "source module of handoff",
    field_order: 1000040,
  },
  {
    field_name: "target_domain_module_id",
    format: "reference",
    title: "Target Module",
    description: "Handoffs really live between modules; the target-domain rollup stays as today during backfill. NULL until the target domain is modularized.",
    reference_table: "domain_modules",
    reference_delete_mode: "clear",
    relationship_label: "target module of handoff",
    field_order: 1000042,
  },
]);

console.log("\n  trigger_events:");
await addFields("trigger_events", [
  {
    field_name: "domain_module_id",
    format: "reference",
    title: "Module",
    description: "Events are published by the module that masters the data_object, not the whole domain. NULL until the publishing domain is modularized.",
    reference_table: "domain_modules",
    reference_delete_mode: "clear",
    relationship_label: "published by module",
    field_order: 1000040,
  },
]);

console.log("\n  skills:");
await addFields("skills", [
  {
    field_name: "domain_module_id",
    format: "reference",
    title: "Module",
    description: "A `system` skill hangs off a module post-modularization, not a domain. Existing `domain_id` stays as a rollup. NULL on skills authored before modularization or on `process` / `role` skills that aren't bound to a single module.",
    reference_table: "domain_modules",
    reference_delete_mode: "clear",
    relationship_label: "skill of module",
    field_order: 1000040,
  },
  {
    field_name: "process_id",
    format: "reference",
    title: "Process",
    description: "A `process` skill formally references the APQC PCF row it implements (`processes.source_framework='apqc_pcf_*'`) or the custom-process row (`source_framework='custom'`). NULL on `system` and `role` skills.",
    reference_table: "processes",
    reference_delete_mode: "clear",
    relationship_label: "skill of process",
    field_order: 1000042,
  },
]);

console.log("\n  data_object_lifecycle_states:");
await addFields("data_object_lifecycle_states", [
  {
    field_name: "domain_module_id",
    format: "reference",
    title: "Realizing Module",
    description: "A state may be realized only when a specific module is installed (e.g. `job_applications.interviewing` is only reachable if `ATS-INTERVIEWS` is deployed). States from un-deployed modules are pruned at deploy time. NULL when the state is reachable in all deployments. See plan-modules.md §7.4.",
    reference_table: "domain_modules",
    reference_delete_mode: "clear",
    relationship_label: "realized by module",
    field_order: 1000040,
  },
]);

console.log("\n  data_objects:");
await addFields("data_objects", [
  {
    field_name: "minimum_embedded_shape",
    format: "multiline",
    title: "Minimum Embedded Shape",
    description: "Markdown bullet list of field codes (+ brief justification per field) that every module which embedded_masters this data_object must include in its local-master shell. Without this contract, modules deployed alone in separate tenants create divergent shells that can't merge cleanly when one becomes the canonical master. The canonical master's required field set is a superset of this minimum. NULL for data_objects only ever mastered by one canonical owner. See plan-modules.md §4.7.",
    field_order: 1000040,
  },
]);

// ============================================================
// Final refresh
// ============================================================
console.log("\n=== Refresh schema cache ===");
await crud("refresh_schema_cache", {});
console.log("  ✓ schema cache refreshed");

console.log("\n✓ plan-modules.md §11 step 2 complete.");
console.log("Verify:");
console.log("  semantius call crud postgrestRequest '{\"method\":\"GET\",\"path\":\"/domain_modules?limit=1\"}'");
console.log("  semantius call crud postgrestRequest '{\"method\":\"GET\",\"path\":\"/domain_module_capabilities?limit=1\"}'");
console.log("  semantius call crud postgrestRequest '{\"method\":\"GET\",\"path\":\"/domain_module_data_objects?limit=1\"}'");
console.log("  semantius call crud postgrestRequest '{\"method\":\"GET\",\"path\":\"/domain_module_host_domains?limit=1\"}'");
console.log("  semantius call crud postgrestRequest '{\"method\":\"GET\",\"path\":\"/domain_starter_modules?limit=1\"}'");
