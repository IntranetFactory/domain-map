#!/usr/bin/env bun
/**
 * skill_grain_02_create_junctions.ts - Step 1 of plans/per-domain-skill-restoration.md.
 *
 * Creates the two m:n tool-requirement junction entities, mirroring
 * scripts/loaders/create_handoff_processes.ts (FK parent/cascade, computed unique key
 * materialized by the BEFORE INSERT/UPDATE trigger off entities.computed_fields,
 * requirement_level enum {required, optional}, notes multiline, record_status enum
 * {new, pending, approved, rejected}, module_id 1001, view/edit perms domain_map:read/:manage,
 * audit_log false):
 *   - domain_module_tools (domain_module_id -> domain_modules, tool_id -> tools)
 *   - process_tools        (process_id      -> processes,      tool_id -> tools)
 *
 * A tool is ATOMIC: `tools` is the single canonical store; these are RELATIONSHIPS that only
 * reference tool_id. Idempotent: each entity/field/check skips if already present. Safe to re-run.
 *
 * Run from project root: bun run scripts/loaders/skill_grain_02_create_junctions.ts
 */
export {};

type Row = Record<string, unknown>;

async function semCall(tool: string, payload: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${tool} (exit ${code}): ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : null;
}
const get = (path: string) => semCall("postgrestRequest", { method: "GET", path }) as Promise<any[]>;
const post = (path: string, body: Row | Row[]) =>
  semCall("postgrestRequest", { method: "POST", path, body }) as Promise<any[]>;
const del = (path: string) => semCall("postgrestRequest", { method: "DELETE", path }) as Promise<any[]>;

const MODULE_ID = 1001;
const READ_PERM = "domain_map:read";
const MANAGE_PERM = "domain_map:manage";

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
  unique_value?: boolean;
};

type Junction = {
  table: string;
  singular: string;
  plural: string;
  singularLabel: string;
  pluralLabel: string;
  description: string;
  leftField: string;     // the unit FK (domain_module_id / process_id)
  leftRef: string;       // its reference_table
  leftTitle: string;
  leftDesc: string;
  preflightEntity: string; // entity that must exist for the left FK
};

const JUNCTIONS: Junction[] = [
  {
    table: "domain_module_tools",
    singular: "domain_module_tool",
    plural: "domain_module_tools",
    singularLabel: "Module Tool Requirement",
    pluralLabel: "Module Tool Requirements",
    description:
      "Junction between `domain_modules` and `tools`. Records that a deployable module requires (or optionally uses) an atomic tool. A tool is atomic and lives once in `tools`; this row only references `tool_id`, it never copies a tool. The domain's `system` skill derives its toolset by rolling these up over the domain's modules (primary + host domains); per-module Semantius coverage is computed from these rows. Replaces the retired per-module-skill `skill_tools` grain per plans/per-domain-skill-restoration.md.",
    leftField: "domain_module_id",
    leftRef: "domain_modules",
    leftTitle: "Module",
    leftDesc: "The deployable module (full or starter) that requires this tool.",
    preflightEntity: "domain_modules",
  },
  {
    table: "process_tools",
    singular: "process_tool",
    plural: "process_tools",
    singularLabel: "Process Tool Requirement",
    pluralLabel: "Process Tool Requirements",
    description:
      "Junction between `processes` and `tools`. Records that a cross-domain value-stream process requires (or optionally uses) an atomic tool. A tool is atomic and lives once in `tools`; this row only references `tool_id`. A `process` skill (linked via `skills.process_id`) derives its toolset from these rows. Replaces the retired process-skill `skill_tools` grain per plans/per-domain-skill-restoration.md.",
    leftField: "process_id",
    leftRef: "processes",
    leftTitle: "Process",
    leftDesc: "The value-stream process that requires this tool.",
    preflightEntity: "processes",
  },
];

function keyComputedField(leftField: string) {
  return {
    name: "key",
    description:
      `2-tuple natural key for the ${leftField} -> tool link: ${leftField}.tool_id. Materialized by the BEFORE INSERT/UPDATE trigger from this computed_fields JsonLogic. Mirrors the handoff_processes.key idiom.`,
    jsonlogic: { concat: [{ var: leftField }, ".", { var: "tool_id" }] },
  };
}

function fieldSpecs(j: Junction): FieldSpec[] {
  return [
    {
      field_name: j.leftField,
      format: "parent",
      title: j.leftTitle,
      description: j.leftDesc,
      reference_table: j.leftRef,
      reference_delete_mode: "cascade",
      relationship_label: "requires",
      field_order: 1000005,
    },
    {
      field_name: "tool_id",
      format: "parent",
      title: "Tool",
      description: "The atomic tool (canonical row in `tools`) this unit requires. Referenced, never copied.",
      reference_table: "tools",
      reference_delete_mode: "cascade",
      relationship_label: "is required by",
      field_order: 1000007,
    },
    {
      field_name: "requirement_level",
      format: "enum",
      title: "Requirement Level",
      description:
        "Whether the tool is irreducible for this unit's primary workflows (`required`) or covers a degraded / augmenting mode (`optional`). Carried verbatim from the migrated `skill_tools` rows; the coverage rollup counts only `required` tools in its denominator.",
      enum_values: ["required", "optional"],
      default_value: "required",
      field_order: 1000009,
    },
    {
      field_name: "notes",
      format: "multiline",
      title: "Notes",
      description:
        "Empty by default. Populate only when there is something exceptional to call out about this pair. No vendor or product names (SKILL.md Rule #18).",
      field_order: 1000011,
    },
    {
      field_name: "record_status",
      format: "enum",
      title: "Record Status",
      description:
        "Standard workflow per SKILL.md Rule #1. Carried verbatim from the migrated `skill_tools` rows (all `new`).",
      enum_values: ["new", "pending", "approved", "rejected"],
      default_value: "new",
      field_order: 1000013,
    },
    {
      field_name: "key",
      format: "text",
      title: "Key",
      description:
        `Computed 2-tuple natural key (${j.leftField}.tool_id). Materialized by the BEFORE INSERT/UPDATE trigger from entities.computed_fields. unique_value=true enforces idempotency on the pair at the database layer.`,
      input_type: "readonly",
      unique_value: true,
      field_order: 1000050,
    },
  ];
}

async function ensureJunction(j: Junction): Promise<void> {
  console.log(`\n=== ${j.table} ===`);

  // pre-flight: the referenced parent entities must exist
  for (const ref of [j.preflightEntity, "tools"]) {
    const e = await get(`/entities?table_name=eq.${ref}&select=table_name`);
    if (e.length !== 1) throw new Error(`pre-flight: ${ref} entity not found (got ${e.length})`);
  }
  console.log(`  + parents present: ${j.preflightEntity}, tools`);

  // entity
  const existing = await get(`/entities?table_name=eq.${j.table}&select=table_name`);
  if (existing.length > 0) {
    console.log(`  = entity already exists, skipping create`);
  } else {
    await semCall("create_entity", {
      data: {
        table_name: j.table,
        singular: j.singular,
        plural: j.plural,
        singular_label: j.singularLabel,
        plural_label: j.pluralLabel,
        description: j.description,
        module_id: MODULE_ID,
        view_permission: READ_PERM,
        edit_permission: MANAGE_PERM,
        audit_log: false,
        computed_fields: [keyComputedField(j.leftField)],
      },
    });
    console.log(`  + entity created`);
  }

  // fields
  const haveFields = new Set(
    (await get(`/fields?table_name=eq.${j.table}&select=field_name`)).map(r => String(r.field_name)),
  );
  for (const f of fieldSpecs(j)) {
    if (haveFields.has(f.field_name)) {
      console.log(`    = ${f.field_name}: exists`);
      continue;
    }
    await semCall("create_field", { data: { ...f, table_name: j.table } });
    console.log(`    + ${f.field_name}: created`);
  }

  // post-flight: key computed field + unique_value
  const entRows = await get(`/entities?table_name=eq.${j.table}&select=computed_fields`);
  const cf = (entRows[0]?.computed_fields ?? []) as any[];
  const keyCf = cf.find((c) => c.name === "key");
  if (!keyCf) throw new Error(`post-flight: ${j.table} has no key in computed_fields`);
  const expected = JSON.stringify(keyComputedField(j.leftField).jsonlogic);
  if (JSON.stringify(keyCf.jsonlogic) !== expected) {
    throw new Error(`post-flight: ${j.table} key.jsonlogic mismatch\n  expected ${expected}\n  actual   ${JSON.stringify(keyCf.jsonlogic)}`);
  }
  const keyField = await get(`/fields?table_name=eq.${j.table}&field_name=eq.key&select=unique_value`);
  if (keyField[0]?.unique_value !== true) throw new Error(`post-flight: ${j.table}.key.unique_value not true`);
  console.log(`  + key computed field present, unique_value=true`);

  // unique-constraint smoke test (only when both parents have >=1 row to satisfy the FKs)
  const [leftRows, toolRows] = await Promise.all([
    get(`/${j.leftRef}?select=id&limit=1`),
    get(`/tools?select=id&limit=1`),
  ]);
  if (leftRows.length === 0 || toolRows.length === 0) {
    console.log(`  ~ smoke test skipped (no ${j.leftRef} or tools rows to fabricate a synthetic pair)`);
  } else {
    const lid = Number(leftRows[0].id);
    const tid = Number(toolRows[0].id);
    try {
      const first = await post(`/${j.table}`, { [j.leftField]: lid, tool_id: tid, requirement_level: "required" });
      let dupRejected = false;
      try {
        await post(`/${j.table}`, { [j.leftField]: lid, tool_id: tid, requirement_level: "required" });
      } catch {
        dupRejected = true;
      }
      console.log(`  + smoke: first POST key="${first[0]?.key}", duplicate ${dupRejected ? "rejected" : "ACCEPTED (BAD)"}`);
      if (!dupRejected) throw new Error(`smoke test FAILED: ${j.table} unique constraint missing`);
    } finally {
      const cleaned = await del(`/${j.table}?${j.leftField}=eq.${lid}&tool_id=eq.${tid}`);
      console.log(`  + smoke cleanup: removed ${cleaned.length} synthetic row(s)`);
    }
  }
  const finalRows = await get(`/${j.table}?limit=1`);
  console.log(`  + final: /${j.table}?limit=1 -> ${finalRows.length} row(s)`);
}

async function main() {
  console.log("Create domain_module_tools + process_tools - Step 1");
  console.log("===================================================");
  for (const j of JUNCTIONS) await ensureJunction(j);
  console.log("\nOK: both junction entities ready.");
}

await main();
