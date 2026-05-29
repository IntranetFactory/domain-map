#!/usr/bin/env bun
/**
 * Create the `handoff_processes` junction entity per plan-handoff-processes.md §2 + §6.
 *
 * Schema:
 *   handoff_id      FK -> handoffs   (parent, cascade)
 *   process_id      FK -> processes  (parent, cascade)
 *   role            enum [implements]
 *   notes           multiline (empty by default; only populated when exceptional)
 *   record_status   enum [new, pending, approved, rejected]
 *   key             text, computed, unique_value=true
 *                   JsonLogic: concat(handoff_id, ".", process_id)
 *                   Materialized by the BEFORE INSERT/UPDATE trigger off
 *                   `entities.computed_fields`; matches the handoffs.key idiom
 *                   from add_handoffs_key_field_2026_05_24.ts.
 *
 * Idempotent: each step checks current state before acting. Safe to re-run.
 *
 * Pre-flight:
 *   - asserts the `handoffs` entity exists (prerequisite from plan-handoffs.md)
 *   - asserts the `processes` entity exists
 *
 * Post-flight:
 *   - `GET /handoff_processes?limit=1` returns []
 *   - `key` present in entities.computed_fields with the expected JsonLogic
 *   - `unique_value=true` on the `key` field row
 *   - synthetic duplicate-pair POST is rejected by the unique index; both
 *     synthetic rows are rolled back before exit
 *
 * Run from project root: bun run .tmp_deploy/create_handoff_processes.ts
 */

type Row = Record<string, unknown>;

async function semCall(tool: string, payload: Row, opts: { single?: boolean } = {}): Promise<any> {
  const args = ["semantius"];
  if (opts.single) args.push("--single");
  args.push("call", "crud", tool);
  const proc = Bun.spawn(args, { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    if (opts.single && code === 1) return null;
    throw new Error(`${tool} (exit ${code}): ${stderr || stdout}`);
  }
  const t = stdout.trim();
  return t ? JSON.parse(t) : null;
}

const get = (path: string) => semCall("postgrestRequest", { method: "GET", path }) as Promise<any[]>;
const post = (path: string, body: Row | Row[]) =>
  semCall("postgrestRequest", { method: "POST", path, body }) as Promise<any[]>;
const patch = (path: string, body: Row) =>
  semCall("postgrestRequest", { method: "PATCH", path, body }) as Promise<any[]>;
const del = (path: string) => semCall("postgrestRequest", { method: "DELETE", path }) as Promise<any[]>;

const MODULE_ID = 1001;
const MODULE_SLUG = "domain_map";
const READ_PERM = `${MODULE_SLUG}:read`;
const MANAGE_PERM = `${MODULE_SLUG}:manage`;
const TABLE = "handoff_processes";

const KEY_COMPUTED_FIELD = {
  name: "key",
  description:
    "2-tuple natural key for the handoff -> process link: handoff_id.process_id. Materialized by the BEFORE INSERT/UPDATE trigger from this computed_fields JsonLogic. Mirrors the handoffs.key idiom.",
  jsonlogic: {
    concat: [{ var: "handoff_id" }, ".", { var: "process_id" }],
  },
};

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

const FIELD_SPECS: FieldSpec[] = [
  {
    field_name: "handoff_id",
    format: "parent",
    title: "Handoff",
    description: "The handoff edge being linked to a process activity.",
    reference_table: "handoffs",
    reference_delete_mode: "cascade",
    relationship_label: "implements",
    field_order: 1000005,
  },
  {
    field_name: "process_id",
    format: "parent",
    title: "Process",
    description: "The process activity (APQC PCF row or custom) that this handoff realizes.",
    reference_table: "processes",
    reference_delete_mode: "cascade",
    relationship_label: "is implemented by",
    field_order: 1000007,
  },
  {
    field_name: "role",
    format: "enum",
    title: "Role",
    description:
      "How the handoff relates to the process. Starts with one value `implements` (this handoff IS the activity). Add more values only when discovery proposes rows that clearly do not fit, per plan-handoff-processes.md §3.",
    enum_values: ["implements"],
    default_value: "implements",
    field_order: 1000009,
  },
  {
    field_name: "notes",
    format: "multiline",
    title: "Notes",
    description:
      "Empty by default. Populate only when there is something exceptional, custom, or special to call out about this pair (e.g. a hand-curated override that overrides a wrong substring match, or a note explaining why an approver kept a borderline match).",
    field_order: 1000011,
  },
  {
    field_name: "record_status",
    format: "enum",
    title: "Record Status",
    description:
      "Standard workflow per SKILL.md Rule #1. Discovery-proposed rows land as `new`; user review flips them to `approved` or `rejected`. Both approved and rejected rows are sticky on subsequent discovery reruns (existence-of-`key` skip).",
    enum_values: ["new", "pending", "approved", "rejected"],
    default_value: "new",
    field_order: 1000013,
  },
  {
    field_name: "key",
    format: "text",
    title: "Key",
    description:
      "Computed 2-tuple natural key (handoff_id.process_id). Materialized by the BEFORE INSERT/UPDATE trigger from entities.computed_fields. unique_value=true enforces idempotency on the pair at the database layer.",
    input_type: "readonly",
    unique_value: true,
    field_order: 1000050,
  },
];

async function preflight() {
  console.log("=== Pre-flight ===");
  const handoffsEnt = await get("/entities?table_name=eq.handoffs&select=table_name");
  if (handoffsEnt.length !== 1) {
    throw new Error(`pre-flight: handoffs entity not found (got ${handoffsEnt.length}). Prerequisite plan-handoffs.md must be complete.`);
  }
  console.log("  + handoffs entity present");
  const processesEnt = await get("/entities?table_name=eq.processes&select=table_name");
  if (processesEnt.length !== 1) {
    throw new Error(`pre-flight: processes entity not found (got ${processesEnt.length}).`);
  }
  console.log("  + processes entity present");
}

async function createEntity() {
  console.log("\n=== Create entity ===");
  const existing = await get(`/entities?table_name=eq.${TABLE}&select=table_name`);
  if (existing.length > 0) {
    console.log("  = entity already exists, skipping create");
    return;
  }
  await semCall("create_entity", {
    data: {
      table_name: TABLE,
      singular: "handoff_process",
      plural: "handoff_processes",
      singular_label: "Handoff Process Link",
      plural_label: "Handoff Process Links",
      description:
        "Junction between `handoffs` and `processes`. Links a directional event-driven handoff to the APQC PCF activity (or custom process) it realizes. Populated by discovery (`discovery_query.ts` substring matcher fan-out) with `record_status='new'`; promoted to `approved` by user review per SKILL.md Rule #1. Sub-clusters trigger-event-prefix buckets in Phase D discovery and connects handoffs across different prefixes that share a process. See plan-handoff-processes.md.",
      module_id: MODULE_ID,
      view_permission: READ_PERM,
      edit_permission: MANAGE_PERM,
      audit_log: false,
      computed_fields: [KEY_COMPUTED_FIELD],
    },
  });
  console.log("  + entity created");
}

async function createFields() {
  console.log("\n=== Create fields ===");
  const existing = new Set(
    (await get(`/fields?table_name=eq.${TABLE}&select=field_name`)).map((r) => String(r.field_name)),
  );
  console.log(`  existing fields: ${[...existing].join(", ") || "(none)"}`);
  for (const f of FIELD_SPECS) {
    if (existing.has(f.field_name)) {
      console.log(`    = ${f.field_name}: already exists, skipping`);
      continue;
    }
    console.log(`    + creating ${f.field_name}`);
    await semCall("create_field", { data: { ...f, table_name: TABLE } });
  }
}

async function postflight() {
  console.log("\n=== Post-flight ===");

  // 1. Empty table
  const rows = await get(`/${TABLE}?limit=1`);
  if (rows.length !== 0) {
    throw new Error(`post-flight: expected /${TABLE}?limit=1 to be empty, got ${rows.length} rows`);
  }
  console.log(`  + /${TABLE}?limit=1 returns []`);

  // 2. `key` computed field present
  const entRows = await get(`/entities?table_name=eq.${TABLE}&select=computed_fields`);
  const cf = (entRows[0]?.computed_fields ?? []) as any[];
  const keyCf = cf.find((c) => c.name === "key");
  if (!keyCf) throw new Error("post-flight: `key` not found in entities.computed_fields");
  const expectedBody = JSON.stringify(KEY_COMPUTED_FIELD.jsonlogic);
  const actualBody = JSON.stringify(keyCf.jsonlogic);
  if (actualBody !== expectedBody) {
    throw new Error(`post-flight: key.jsonlogic mismatch.\n  expected: ${expectedBody}\n  actual:   ${actualBody}`);
  }
  console.log("  + entities.computed_fields contains `key` with expected JsonLogic");

  // 3. unique_value=true on key field
  const keyField = await get(`/fields?table_name=eq.${TABLE}&field_name=eq.key&select=unique_value`);
  if (!keyField[0] || keyField[0].unique_value !== true) {
    throw new Error(`post-flight: fields.key.unique_value is not true (got ${JSON.stringify(keyField[0])})`);
  }
  console.log("  + fields.key.unique_value = true");

  // 4. Unique-constraint smoke test
  console.log("\n=== Unique-constraint smoke test ===");
  // Pick any existing handoff and process row so the FK constraints are satisfied.
  const [hRows, pRows] = await Promise.all([
    get("/handoffs?select=id&limit=1"),
    get("/processes?select=id&limit=1"),
  ]);
  if (hRows.length === 0 || pRows.length === 0) {
    throw new Error("smoke test: need at least one handoff and one process row to fabricate the synthetic pair");
  }
  const hId = Number(hRows[0].id);
  const pId = Number(pRows[0].id);
  console.log(`  using handoff_id=${hId}, process_id=${pId}`);
  try {
    const first = await post(`/${TABLE}`, { handoff_id: hId, process_id: pId, role: "implements" });
    console.log(`  + first POST inserted ${first.length} row(s); key="${first[0]?.key}"`);
    let dupRejected = false;
    try {
      await post(`/${TABLE}`, { handoff_id: hId, process_id: pId, role: "implements" });
    } catch (e: any) {
      dupRejected = true;
      console.log(`  + duplicate POST rejected as expected: ${String(e.message).split("\n")[0].slice(0, 200)}`);
    }
    if (!dupRejected) {
      throw new Error("smoke test FAILED: second POST with same (handoff_id, process_id) was accepted — unique constraint is missing");
    }
  } finally {
    // Roll back the synthetic row regardless of outcome.
    const cleaned = await del(`/${TABLE}?handoff_id=eq.${hId}&process_id=eq.${pId}`);
    console.log(`  + cleanup: deleted ${cleaned.length} synthetic row(s)`);
  }
  // Final empty assertion
  const finalRows = await get(`/${TABLE}?limit=1`);
  if (finalRows.length !== 0) {
    throw new Error(`post-flight: table is non-empty after cleanup (got ${finalRows.length} rows)`);
  }
  console.log("  + final state: empty\n");
}

async function main() {
  console.log("Create handoff_processes — plan-handoff-processes.md §6");
  console.log("======================================================\n");
  await preflight();
  await createEntity();
  await createFields();
  await postflight();
  console.log("✓ handoff_processes ready.");
  console.log(`  UI: https://tests.semantius.app/${MODULE_SLUG}/${TABLE}`);
}

await main();
