// P1.1 — Add `processes` and `trigger_events` entities to the live domain_map module.
// Run from project root: bun run c:/dev/domain-map/.tmp_deploy/load_processes_trigger_events.ts
// Idempotent: re-running after a partial failure picks up where it left off.
export {};

const MODULE_SLUG = "domain_map";
const READ_PERM = `${MODULE_SLUG}:read`;
const MANAGE_PERM = `${MODULE_SLUG}:manage`;

async function call(tool: string, payload: unknown, opts: { single?: boolean; tolerateTimeout?: boolean } = {}): Promise<any> {
  const args = ["semantius"];
  if (opts.single) args.push("--single");
  args.push("call", "crud", tool);
  const proc = Bun.spawn(args, {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    const combined = (stderr || stdout || "");
    if (opts.tolerateTimeout && combined.includes("Request timed out")) {
      return { __timedOut: true };
    }
    throw new Error(`${tool} (exit ${code}): ${combined}`);
  }
  return stdout.trim() ? JSON.parse(stdout) : null;
}

async function readSingle(tool: string, filters: string): Promise<any | null> {
  const proc = Bun.spawn(["semantius", "--single", "call", "crud", tool], {
    stdin: new Response(JSON.stringify({ filters })),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code === 1) return null;
  if (code !== 0) throw new Error(`${tool} (exit ${code}): ${stderr || stdout}`);
  return JSON.parse(stdout);
}

// ------ resolve module id ------

const mod = await readSingle("read_module", `module_slug=eq.${MODULE_SLUG}`);
if (!mod) throw new Error(`module ${MODULE_SLUG} not found — run deploy_domain_map.ts first`);
const MODULE_ID = mod.id;
console.log(`Module: ${MODULE_SLUG} (id=${MODULE_ID})`);

// ------ entity specs ------

type FieldSpec = {
  field_name: string;
  format: string;
  title: string;
  description?: string;
  reference_table?: string;
  reference_delete_mode?: string;
  relationship_label?: string;
  default_value?: string;
  enum_values?: string[];
  selfRef?: boolean;
};

type EntitySpec = {
  table_name: string;
  singular: string;
  singular_label: string;
  plural_label: string;
  label_column: string;
  label_column_title: string;
  description: string;
  fields: FieldSpec[];
};

const RECORD_STATUS_ENUM = ["new", "pending", "approved", "rejected"];

const recordStatusField: FieldSpec = {
  field_name: "record_status",
  format: "enum",
  title: "Record Status",
  enum_values: RECORD_STATUS_ENUM,
  default_value: "new",
};

const ENTITIES: EntitySpec[] = [
  {
    table_name: "processes",
    singular: "process",
    singular_label: "Process",
    plural_label: "Processes",
    label_column: "process_name",
    label_column_title: "Process Name",
    description: "Industry-standard business processes (APQC PCF cross-industry + future industry PCFs + org-specific custom rows). Hierarchical via parent_process_id. Discovery backbone for Phase D process-skill candidates: clustered handoff subgraphs are matched against this catalog to assign an industry-standard process name. Discriminated by source_framework so PCF imports and custom rows coexist without naming collisions.",
    fields: [
      { field_name: "process_code", format: "string", title: "Code", description: "Natural key. For PCF rows: literal PCF ID (e.g. 6.1.1, 8.4.2.1). For custom rows: CUSTOM-<CLUSTER>-<SHORT-NAME> (e.g. CUSTOM-ONBOARD-DAY-1)." },
      { field_name: "description", format: "multiline", title: "Description", description: "PCF rows: verbatim from the PCF Excel. Custom rows: authored description of what the process orchestrates." },
      { field_name: "parent_process_id", format: "reference", title: "Parent Process", reference_table: "processes", reference_delete_mode: "clear", relationship_label: "parent of", selfRef: true, description: "Hierarchical parent. Null for level-1 categories." },
      { field_name: "source_framework", format: "enum", title: "Source Framework", enum_values: ["apqc_pcf_cross_industry", "apqc_pcf_banking", "apqc_pcf_consumer_products", "apqc_pcf_electric_utilities", "apqc_pcf_pharmaceutical", "apqc_pcf_telecom", "custom"], description: "Discriminator. apqc_pcf_cross_industry is the v8 cross-industry framework. Industry-specific PCFs are placeholders for future loads. custom is org-specific or discovery-derived." },
      { field_name: "external_id", format: "string", title: "External ID", description: "Framework's own identifier — the PCF ID for any apqc_pcf_* row. Empty string for custom rows." },
      { field_name: "external_url", format: "url", title: "External URL", description: "Optional pointer to source documentation. Empty string acceptable." },
      { field_name: "hierarchy_level", format: "int32", title: "Hierarchy Level", description: "1–5 matching APQC's level scheme for PCF rows; 1–N for custom. Lets queries filter by depth without recursive CTEs." },
      recordStatusField,
    ],
  },
  {
    table_name: "trigger_events",
    singular: "trigger_event",
    singular_label: "Trigger Event",
    plural_label: "Trigger Events",
    label_column: "event_name",
    label_column_title: "Event Name",
    description: "Controlled vocabulary of state-change events on data_objects. Referenced by cross_domain_handoffs.trigger_event_id. One row per event; multiple handoff subscribers reference the same row (the 'one event, many subscribers' pattern — see SKILL.md Phase D section). Event semantics (publisher, data_object, state transition, description) live here; integration metadata (friction_level, integration_pattern, notes) lives on the per-edge handoff row.",
    fields: [
      { field_name: "data_object_id", format: "reference", title: "Data Object", reference_table: "data_objects", reference_delete_mode: "restrict", relationship_label: "fires events for", description: "The data_object whose state changes when this event fires." },
      { field_name: "from_state", format: "string", title: "From State", description: "Originating state of the data_object before the event. Free-text v1; future: FK to a state table. Empty string for creation events (no prior state)." },
      { field_name: "to_state", format: "string", title: "To State", description: "Resulting state after the event. Free-text v1. e.g. accepted, closed, resolved." },
      { field_name: "description", format: "multiline", title: "Description", description: "What this event means: payload contents, downstream consequences, known failure modes." },
      { field_name: "event_category", format: "enum", title: "Event Category", enum_values: ["lifecycle", "state_change", "threshold", "signal"], description: "Coarse-grained classification for filtering. lifecycle = creation/termination; state_change = mid-lifecycle transition; threshold = numeric crossing; signal = external observation. New values appended as clusters surface them." },
      recordStatusField,
    ],
  },
];

// ------ entities: existence check + bulk create ------

const tableNames = ENTITIES.map(e => e.table_name);
const existingRows = await call("read_entity", { filters: `table_name=in.(${tableNames.join(",")})` });
const existingEntities = new Set<string>(existingRows?.map((r: any) => r.table_name) ?? []);

function entityPayload(e: EntitySpec): any {
  return {
    table_name: e.table_name,
    singular: e.singular,
    plural: e.table_name,
    singular_label: e.singular_label,
    plural_label: e.plural_label,
    label_column: e.label_column,
    description: e.description,
    module_id: MODULE_ID,
    view_permission: READ_PERM,
    edit_permission: MANAGE_PERM,
    audit_log: false,
  };
}

const entitiesToCreate = ENTITIES.filter(e => !existingEntities.has(e.table_name));
for (const e of ENTITIES) {
  if (existingEntities.has(e.table_name)) console.log(`  ♻ entity ${e.table_name}`);
}
if (entitiesToCreate.length > 0) {
  console.log(`  → bulk POST /entities × ${entitiesToCreate.length}`);
  const body = entitiesToCreate.map(entityPayload);
  await call("postgrestRequest", { method: "POST", path: "/entities", body }, { tolerateTimeout: true });
  for (const e of entitiesToCreate) console.log(`  ✨ entity ${e.table_name}`);
}

// ------ existing fields cache ------

const fieldRows = await call("read_field", {
  filters: `table_name=in.(${tableNames.join(",")})&select=table_name,field_name`,
});
const existingFields = new Set<string>(fieldRows.map((r: any) => `${r.table_name}.${r.field_name}`));

// ------ label_column title fixup ------

console.log("\n=== label_column title fixups ===");
for (const e of ENTITIES) {
  if (e.label_column_title === e.singular_label) continue;
  try {
    const res = await call(
      "postgrestRequest",
      {
        method: "PATCH",
        path: `/fields?table_name=eq.${e.table_name}&field_name=eq.${e.label_column}`,
        body: { title: e.label_column_title },
      },
      { tolerateTimeout: true },
    );
    console.log(`  ✓ ${e.table_name}.${e.label_column} title → "${e.label_column_title}"${res?.__timedOut ? " [timeout, assume ok]" : ""}`);
  } catch (err: any) {
    console.log(`  ! ${e.table_name}.${e.label_column}: ${err.message}`);
  }
}

// ------ fields: two passes (non-self-ref then self-ref) ------

function fieldPayload(e: EntitySpec, f: FieldSpec): any {
  const p: any = {
    table_name: e.table_name,
    field_name: f.field_name,
    title: f.title,
    format: f.format,
    width: "default",
    input_type: "default",
  };
  if (f.description) p.description = f.description;
  if (f.reference_table) p.reference_table = f.reference_table;
  if (f.reference_delete_mode) p.reference_delete_mode = f.reference_delete_mode;
  if (f.relationship_label) p.relationship_label = f.relationship_label;
  if (f.default_value !== undefined) p.default_value = f.default_value;
  if (f.enum_values) p.enum_values = f.enum_values;
  return p;
}

async function bulkCreateFields(passName: string, predicate: (e: EntitySpec, f: FieldSpec) => boolean) {
  console.log(`\n=== ${passName} ===`);
  const tasks: { payload: any; label: string }[] = [];
  for (const e of ENTITIES) {
    for (const f of e.fields) {
      if (!predicate(e, f)) continue;
      if (f.field_name === e.label_column) continue;
      const key = `${e.table_name}.${f.field_name}`;
      if (existingFields.has(key)) {
        console.log(`  ♻ ${key}`);
        continue;
      }
      tasks.push({ payload: fieldPayload(e, f), label: `${key} (${f.format})` });
    }
  }
  if (tasks.length === 0) { console.log("  (nothing to create)"); return; }
  const CONCURRENCY = 4;
  console.log(`  → ${tasks.length} fields, parallel × ${CONCURRENCY}`);
  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const slice = tasks.slice(i, i + CONCURRENCY);
    const results = await Promise.all(slice.map(async t => {
      try {
        const res = await call("create_field", { data: t.payload }, { tolerateTimeout: true });
        existingFields.add(`${t.payload.table_name}.${t.payload.field_name}`);
        return `  ✨ ${t.label}${res?.__timedOut ? " [timeout, assume ok]" : ""}`;
      } catch (err: any) {
        return `  ! ${t.label}: ${err.message.slice(0, 200)}`;
      }
    }));
    results.forEach(r => console.log(r));
  }
}

await bulkCreateFields("fields (non-self-ref)", (_e, f) => !f.selfRef);
await bulkCreateFields("self-reference fields", (_e, f) => !!f.selfRef);

// ------ summary ------

console.log("\n=== summary ===");
for (const e of ENTITIES) {
  const fields = await call("read_field", { filters: `table_name=eq.${e.table_name}&select=field_name&order=field_order.asc` });
  console.log(`  ${e.table_name}: ${fields.length} fields → https://tests.semantius.app/${MODULE_SLUG}/${e.table_name}`);
}
console.log("\n✓ P1.1 done.");
