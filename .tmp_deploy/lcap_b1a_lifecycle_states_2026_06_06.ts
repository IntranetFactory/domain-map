#!/usr/bin/env bun
// B1A-LIFECYCLE-STATES — author lifecycle states across the 5 LCAP masters.
//
// Each master is first classified entity_type='operational_workflow' (currently 'unclassified';
// each has an obvious state machine per the b1a finding, which is exactly operational_workflow
// under Rule #12). Then ~25 data_object_lifecycle_states rows are authored.
//
// State machines (per the B1A-LIFECYCLE-STATES finding):
//   lcap_apps (220, mod 265):            draft -> validated -> published -> deprecated -> retired
//   lcap_business_objects (221, mod 265): draft -> validated -> published -> deprecated -> retired
//   lcap_pages (715, mod 265):            draft -> validated -> published -> deprecated -> retired
//   lcap_workflows (222, mod 266):        draft -> validated -> published -> deprecated -> retired
//   lcap_data_sources (716, mod 265):     configured -> tested -> active -> degraded -> retired
//
// requires_permission=true on the deliberate, permissioned gates:
//   apps/business_objects/pages/workflows: published, deprecated, retired
//   data_sources:                          active, retired
// (validated / tested are validation steps; degraded is an observed state — not gates.)
//
// permission_verb_override gives clean imperative gate verbs (publish/deprecate/retire/activate)
// so the derived permission reads <module>:publish_lcap_app etc.
//
// domain_module_id (M5): owning module of each master. notes='' per Rule #15.
// record_status omitted (DB default 'new', Rule #1). entity_type omitted on inserts (lifecycle table).
//
// Run from project root: bun run c:/dev/domain-map/.tmp_deploy/lcap_b1a_lifecycle_states_2026_06_06.ts

export {};

async function postgrest(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Record<string, unknown> = { method, path };
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

type StateDef = {
  state_name: string;
  is_initial?: boolean;
  is_terminal?: boolean;
  requires_permission?: boolean;
  permission_verb_override?: string;
};

const PUBLISH_MACHINE: StateDef[] = [
  { state_name: "draft", is_initial: true },
  { state_name: "validated" },
  { state_name: "published", requires_permission: true, permission_verb_override: "publish" },
  { state_name: "deprecated", requires_permission: true, permission_verb_override: "deprecate" },
  { state_name: "retired", is_terminal: true, requires_permission: true, permission_verb_override: "retire" },
];

const CONNECTION_MACHINE: StateDef[] = [
  { state_name: "configured", is_initial: true },
  { state_name: "tested" },
  { state_name: "active", requires_permission: true, permission_verb_override: "activate" },
  { state_name: "degraded" },
  { state_name: "retired", is_terminal: true, requires_permission: true, permission_verb_override: "retire" },
];

const MASTERS: { id: number; name: string; module: number; machine: StateDef[] }[] = [
  { id: 220, name: "lcap_apps", module: 265, machine: PUBLISH_MACHINE },
  { id: 221, name: "lcap_business_objects", module: 265, machine: PUBLISH_MACHINE },
  { id: 715, name: "lcap_pages", module: 265, machine: PUBLISH_MACHINE },
  { id: 222, name: "lcap_workflows", module: 266, machine: PUBLISH_MACHINE },
  { id: 716, name: "lcap_data_sources", module: 265, machine: CONNECTION_MACHINE },
];

// ---- Step 1: classify entity_type = operational_workflow (idempotent; only if not already set) ----
const masterIds = MASTERS.map((m) => m.id);
const current: any[] = await postgrest(
  "GET",
  `/data_objects?id=in.(${masterIds.join(",")})&select=id,data_object_name,entity_type`,
);
console.log("entity_type pre-flight:");
for (const r of current) console.log(`  ${r.id} ${r.data_object_name}: ${r.entity_type}`);

let classified = 0;
for (const r of current) {
  if (r.entity_type !== "operational_workflow") {
    await postgrest("PATCH", `/data_objects?id=eq.${r.id}`, { entity_type: "operational_workflow" });
    console.log(`  classified ${r.id} ${r.data_object_name} -> operational_workflow (was ${r.entity_type})`);
    classified++;
  }
}
console.log(`Classified ${classified} masters as operational_workflow.\n`);

// ---- Step 2: idempotency guard — skip masters that already have lifecycle states ----
const existing: any[] = await postgrest(
  "GET",
  `/data_object_lifecycle_states?data_object_id=in.(${masterIds.join(",")})&select=data_object_id,state_name`,
);
const haveStates = new Set<number>(existing.map((r) => r.data_object_id));
if (haveStates.size > 0) {
  console.log(`NOTE: masters already carrying lifecycle states: ${[...haveStates].join(",")} — those are skipped.`);
}

// ---- Step 3: build the insert rows ----
const rows: Record<string, unknown>[] = [];
for (const m of MASTERS) {
  if (haveStates.has(m.id)) continue;
  m.machine.forEach((s, idx) => {
    rows.push({
      data_object_id: m.id,
      state_name: s.state_name,
      state_order: idx + 1,
      is_initial: s.is_initial ?? false,
      is_terminal: s.is_terminal ?? false,
      requires_permission: s.requires_permission ?? false,
      permission_verb_override: s.permission_verb_override ?? "",
      domain_module_id: m.module,
      notes: "",
      // record_status omitted -> DB default 'new'
    });
  });
}

console.log(`Inserting ${rows.length} lifecycle-state rows...`);
if (rows.length === 0) {
  console.log("Nothing to insert.");
  process.exit(0);
}

// chunked array-body POST (<=50 rows)
const CHUNK = 50;
let inserted = 0;
for (let i = 0; i < rows.length; i += CHUNK) {
  const chunk = rows.slice(i, i + CHUNK);
  const res = await postgrest("POST", "/data_object_lifecycle_states", chunk);
  inserted += chunk.length;
  if (Array.isArray(res)) console.log(`  inserted chunk of ${chunk.length} (returned ${res.length})`);
}
console.log(`Inserted ${inserted} rows.\n`);

// ---- Verify ----
const after: any[] = await postgrest(
  "GET",
  `/data_object_lifecycle_states?data_object_id=in.(${masterIds.join(",")})&select=data_object_id,state_name,state_order,is_initial,is_terminal,requires_permission,permission_verb_override,domain_module_id&order=data_object_id.asc,state_order.asc`,
);
console.log(`Post-load: ${after.length} lifecycle states across the 5 masters.`);
const byDo = new Map<number, any[]>();
for (const r of after) {
  if (!byDo.has(r.data_object_id)) byDo.set(r.data_object_id, []);
  byDo.get(r.data_object_id)!.push(r);
}
for (const [doId, sts] of byDo) {
  const gates = sts.filter((s) => s.requires_permission).map((s) => `${s.state_name}(${s.permission_verb_override})`).join(",");
  console.log(`  do ${doId}: ${sts.map((s) => s.state_name).join(" -> ")} | gates: ${gates} | module ${sts[0].domain_module_id}`);
}
