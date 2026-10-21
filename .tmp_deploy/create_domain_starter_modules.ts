#!/usr/bin/env bun
// create_domain_starter_modules.ts — materialize the `domain_starter_modules`
// catalog table that SKILL.md / M3 references but was never created.
//
// Shape (per SKILL.md):
//   (domain_id, domain_module_id, position int, notes text) — one ordered list
//   of recommended starter modules per domain.
//
// Then loads the 3 CSM starter rows authored as part of the 2026-05-26 audit fix.
//
// Idempotent. Run from project root:
//   bun run c:/dev/domain-map/.tmp_deploy/create_domain_starter_modules.ts

export {};

const CSM_DOMAIN_ID = 30;
const CSM_CASE_ID = 112;
const CSM_ENT_ID = 113;
const CSM_KB_ID = 114;
const PLATFORM_MODULE_ID = 1001;

type Row = Record<string, unknown>;

async function callCrud(tool: string, args: unknown): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], {
    stdin: new Response(JSON.stringify(args)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${tool}: ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

const pg = (method: string, path: string, body?: unknown) =>
  callCrud("postgrestRequest", body === undefined ? { method, path } : { method, path, body });

// =============================================================
// 1. Create the entity (if missing)
// =============================================================
const existingEntity: Row[] = await callCrud("read_entity", {
  filters: "table_name=eq.domain_starter_modules",
});

if (!existingEntity.length) {
  console.log("=== creating entity domain_starter_modules ===");
  await callCrud("create_entity", {
    data: {
      table_name: "domain_starter_modules",
      singular: "domain_starter_module",
      plural: "domain_starter_modules",
      singular_label: "Starter Module",
      plural_label: "Starter Modules",
      description:
        "Editorial junction: per-domain ordered list of recommended modules a buyer/operator installs first. Required on every domain with ≥3 capabilities (SKILL.md Rule #14, M3 audit gate). `position` orders the recommendation; `notes` is the editorial gloss the fact sheet emits verbatim.",
      module_id: PLATFORM_MODULE_ID,
      view_permission: "domain_map:read",
      edit_permission: "domain_map:manage",
      label_column: "domain_starter_module_label",
      managed: true,
      searchable: true,
      is_child: true,
      edit_mode: "auto",
      cube_mode: "auto",
      audit_log: false,
      computed_fields: [
        {
          name: "domain_starter_module_label",
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
                  {
                    cat: [
                      { var: "m.domain_module_code" },
                      " starter @ ",
                      { var: "d.domain_code" },
                    ],
                  },
                ],
              },
            ],
          },
          description:
            "Composed: <module_code> starter @ <domain_code>. Recomputed on write.",
          source_module: "domain_map",
        },
      ],
      validation_rules: [],
      select_rule: {},
    },
  });
  console.log("  created entity");
} else {
  console.log("=== entity domain_starter_modules already exists ===");
}

// =============================================================
// 2. Create fields (skip if exist)
// =============================================================
const existingFields: Row[] = await callCrud("read_field", {
  filters: "table_name=eq.domain_starter_modules",
});
const fieldNames = new Set(existingFields.map((f) => f.field_name as string));

type FieldSpec = {
  field_name: string;
  title: string;
  description: string;
  format: string;
  is_pk?: boolean;
  default_value?: string;
  field_order: number;
  input_type: string;
  ctype?: string;
  is_core?: boolean;
  searchable?: boolean;
  is_nullable?: boolean;
  enum_values?: string[] | null;
  reference_table?: string;
  reference_delete_mode?: string;
  relationship_label?: string;
  width?: string;
  precision?: number;
  unique_value?: boolean;
  cube_type?: string;
};

const fieldsToCreate: FieldSpec[] = [
  {
    field_name: "id",
    title: "Id",
    description: "",
    format: "int32",
    is_pk: true,
    field_order: 1,
    input_type: "readonly",
    ctype: "id",
    is_core: true,
    is_nullable: false,
  },
  {
    field_name: "domain_starter_module_label",
    title: "Starter Module",
    description: "",
    format: "text",
    field_order: 2,
    input_type: "disabled",
    ctype: "label",
    is_core: true,
    is_nullable: false,
  },
  {
    field_name: "domain_id",
    title: "Domain",
    description: "",
    format: "parent",
    field_order: 1000003,
    input_type: "required",
    is_nullable: false,
    reference_table: "domains",
    reference_delete_mode: "cascade",
    relationship_label: "recommends starter modules",
  },
  {
    field_name: "domain_module_id",
    title: "Module",
    description: "",
    format: "parent",
    field_order: 1000005,
    input_type: "required",
    is_nullable: false,
    reference_table: "domain_modules",
    reference_delete_mode: "cascade",
    relationship_label: "is starter for",
  },
  {
    field_name: "position",
    title: "Position",
    description:
      "Editorial order. Position 1 is the recommended starting point. Lower numbers display first; ties are allowed but discouraged.",
    format: "int32",
    field_order: 1000007,
    input_type: "required",
    is_nullable: false,
  },
  {
    field_name: "notes",
    title: "Notes",
    description:
      "Editorial gloss the fact sheet emits verbatim next to each starter recommendation.",
    format: "multiline",
    field_order: 1000009,
    input_type: "default",
    is_nullable: false,
    default_value: "",
  },
  {
    field_name: "record_status",
    title: "Record Status",
    description: "",
    format: "enum",
    field_order: 1000999,
    input_type: "default",
    is_nullable: false,
    enum_values: ["new", "pending", "approved", "rejected"],
    default_value: "new",
  },
];

for (const f of fieldsToCreate) {
  if (fieldNames.has(f.field_name)) {
    console.log(`  field exists: ${f.field_name}`);
    continue;
  }
  console.log(`  creating field: ${f.field_name}`);
  await callCrud("create_field", {
    data: {
      table_name: "domain_starter_modules",
      field_name: f.field_name,
      title: f.title,
      description: f.description,
      format: f.format,
      is_pk: f.is_pk ?? false,
      default_value: f.default_value ?? "",
      field_order: f.field_order,
      input_type: f.input_type,
      width: f.width ?? "default",
      ctype: f.ctype ?? "",
      is_core: f.is_core ?? false,
      searchable: f.searchable ?? false,
      enum_values: f.enum_values ?? null,
      precision: f.precision ?? 2,
      reference_table: f.reference_table ?? "",
      reference_delete_mode: f.reference_delete_mode ?? "restrict",
      relationship_label: f.relationship_label ?? "has",
      unique_value: f.unique_value ?? false,
      cube_type: f.cube_type ?? "auto",
      input_type_rule: {},
    },
  });
}

// =============================================================
// 3. Refresh cache so PostgREST picks up the new table
// =============================================================
console.log("=== refreshing schema cache ===");
await callCrud("refresh_schema_cache", {});

// Wait a moment for cache to settle.
await new Promise((r) => setTimeout(r, 2000));

// =============================================================
// 4. Load the 3 CSM starter rows
// =============================================================
console.log("=== loading CSM starter modules ===");

const starterSpec = [
  {
    domain_id: CSM_DOMAIN_ID,
    domain_module_id: CSM_CASE_ID,
    position: 1,
    notes:
      "Start here. Case workflow is the foundational surface every CSM deployment anchors on.",
  },
  {
    domain_id: CSM_DOMAIN_ID,
    domain_module_id: CSM_ENT_ID,
    position: 2,
    notes: "Add for support contracts and SLA tracking.",
  },
  {
    domain_id: CSM_DOMAIN_ID,
    domain_module_id: CSM_KB_ID,
    position: 3,
    notes:
      "Add when a customer-facing KB surface is required alongside (or instead of) the ITSM-mastered knowledge base.",
  },
];

const existingStarter: Row[] = await pg(
  "GET",
  `/domain_starter_modules?domain_id=eq.${CSM_DOMAIN_ID}&select=domain_module_id`,
) ?? [];
const existingStarterIds = new Set(existingStarter.map((r) => r.domain_module_id as number));
const inserts = starterSpec.filter((r) => !existingStarterIds.has(r.domain_module_id));

if (inserts.length) {
  await pg("POST", "/domain_starter_modules", inserts);
  console.log(`  inserted ${inserts.length} starter rows`);
} else {
  console.log("  no new starter rows to insert");
}

const final: Row[] = await pg(
  "GET",
  `/domain_starter_modules?domain_id=eq.${CSM_DOMAIN_ID}&select=position,domain_module:domain_modules(domain_module_code),notes&order=position.asc`,
) ?? [];
console.log("=== final state ===");
for (const r of final) {
  const mod = (r.domain_module as Row | null)?.domain_module_code as string | undefined;
  console.log(`  [${r.position}] ${mod} — ${r.notes}`);
}
console.log("");
console.log("UI: https://tests.semantius.app/domain_map/domain_starter_modules");
