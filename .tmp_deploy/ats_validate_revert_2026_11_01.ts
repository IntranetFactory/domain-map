#!/usr/bin/env bun
// Revert every catalog write made by the 2026-11-01 ATS validate pass (made without the user's
// approval). Undoes three loaders:
//   .tmp_deploy/ats_validate_events_handoffs_2026_11_01.ts
//   .tmp_deploy/ats_validate_raci_rels_aliases_2026_11_01.ts
//   .tmp_deploy/ats_validate_boundary_2026_11_01.ts
// Inserted rows are deleted; filled fields are set back to their previous empty value.
// Every row is verified first (exists, created today, value still what the validate wrote);
// any mismatch or foreign reference aborts before a single write. Dry-run by default; --apply writes.

type Row = Record<string, unknown>;
const APPLY = process.argv.includes("--apply");
const TODAY = "2026-11-01";

async function call(body: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`semantius failed: ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const get = (path: string) => call({ method: "GET", path });
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// ---- what the validate wrote
const INSERTED: { table: string; ids: number[] }[] = [
  { table: "handoff_processes", ids: range(1242, 1253) },
  { table: "handoffs", ids: range(1523, 1546) },
  { table: "trigger_events", ids: range(1751, 1789) },
  { table: "process_raci", ids: range(232, 235) },
  { table: "data_object_relationships", ids: range(2736, 2738) },
  { table: "data_object_aliases", ids: range(2165, 2217) },
  { table: "domain_module_data_objects", ids: range(2201, 2203) },
];
// trigger_events.to_state filled from ""
const TO_STATE_FILLS: Record<number, string> = {
  360: "published", 361: "closed", 362: "applied", 364: "rejected", 366: "submitted", 367: "bonus_payable",
  370: "scheduled", 371: "completed", 372: "submitted", 376: "active", 377: "held", 1180: "completed",
  1181: "completed", 1208: "rescinded",
};
// data_object_lifecycle_states.process_id filled from NULL
const PROCESS_FILLS: Record<number, number> = {
  207: 1016, 1509: 1016, 1160: 369, 1512: 369, 1514: 369, 1515: 369, 1516: 369, 2722: 220, 230: 1017,
  1230: 1017, 1231: 1017, 1497: 222, 1500: 222, 500: 222, 240: 219, 1200: 219, 1201: 219, 1170: 1011, 1172: 1011,
};
// data_object_lifecycle_states.domain_module_id filled from NULL
const MODULE_FILLS: Record<number, number> = { 1160: 1, 1170: 3, 1172: 3, 1200: 4, 1201: 4, 1230: 6, 1231: 6 };

const problems: string[] = [];

// ---- verify inserted rows: every id exists and was created today
for (const { table, ids } of INSERTED) {
  const rows = await get(`/${table}?id=in.(${ids.join(",")})&select=id,created_at`);
  const missing = ids.filter((id) => !rows.some((r: any) => r.id === id));
  const old = rows.filter((r: any) => !String(r.created_at ?? "").startsWith(TODAY));
  if (missing.length) problems.push(`${table}: not found ${missing.join(",")}`);
  if (old.length) problems.push(`${table}: not created today ${old.map((r: any) => r.id).join(",")}`);
  console.log(`delete ${table}: ${rows.length} of ${ids.length} rows (${ids[0]}-${ids[ids.length - 1]})`);
}

// ---- no foreign row may still reference what we delete
const hp = await get(`/handoff_processes?handoff_id=in.(${range(1523, 1546).join(",")})&select=id,handoff_id`);
const foreignHp = hp.filter((r: any) => r.id < 1242 || r.id > 1253);
if (foreignHp.length) problems.push(`handoff_processes outside 1242-1253 reference the new handoffs: ${foreignHp.map((r: any) => r.id).join(",")}`);
const hf = await get(`/handoffs?trigger_event_id=in.(${range(1751, 1789).join(",")})&select=id,trigger_event_id`);
const foreignHf = hf.filter((r: any) => r.id < 1523 || r.id > 1546);
if (foreignHf.length) problems.push(`handoffs outside 1523-1546 use the new events: ${foreignHf.map((r: any) => r.id).join(",")}`);

// ---- verify filled fields still hold what the validate wrote
const ev = await get(`/trigger_events?id=in.(${Object.keys(TO_STATE_FILLS).join(",")})&select=id,event_name,to_state`);
for (const [id, v] of Object.entries(TO_STATE_FILLS)) {
  const r = ev.find((e: any) => e.id === Number(id));
  if (!r || r.to_state !== v) problems.push(`trigger_events ${id}: to_state is ${JSON.stringify(r?.to_state)}, expected ${v}`);
}
console.log(`blank trigger_events.to_state: ${Object.keys(TO_STATE_FILLS).length} rows`);
const stateIds = [...new Set([...Object.keys(PROCESS_FILLS), ...Object.keys(MODULE_FILLS)])];
const st = await get(`/data_object_lifecycle_states?id=in.(${stateIds.join(",")})&select=id,state_name,process_id,domain_module_id`);
for (const [id, v] of Object.entries(PROCESS_FILLS)) {
  const r = st.find((s: any) => s.id === Number(id));
  if (!r || r.process_id !== v) problems.push(`lifecycle ${id}: process_id is ${r?.process_id}, expected ${v}`);
}
for (const [id, v] of Object.entries(MODULE_FILLS)) {
  const r = st.find((s: any) => s.id === Number(id));
  if (!r || r.domain_module_id !== v) problems.push(`lifecycle ${id}: domain_module_id is ${r?.domain_module_id}, expected ${v}`);
}
console.log(`null lifecycle process_id: ${Object.keys(PROCESS_FILLS).length} rows; null domain_module_id: ${Object.keys(MODULE_FILLS).length} rows`);

if (problems.length) {
  console.error("\nABORT, nothing written:\n  " + problems.join("\n  "));
  process.exit(1);
}
if (!APPLY) {
  console.log("\ndry run: every row verified. Re-run with --apply to revert.");
  process.exit(0);
}

// ---- apply, in foreign-key-safe order
for (const { table, ids } of INSERTED) {
  await call({ method: "DELETE", path: `/${table}?id=in.(${ids.join(",")})` });
  console.log(`deleted ${table} ${ids[0]}-${ids[ids.length - 1]}`);
}
await call({ method: "PATCH", path: `/trigger_events?id=in.(${Object.keys(TO_STATE_FILLS).join(",")})`, body: { to_state: "" } });
await call({ method: "PATCH", path: `/data_object_lifecycle_states?id=in.(${Object.keys(PROCESS_FILLS).join(",")})`, body: { process_id: null } });
await call({ method: "PATCH", path: `/data_object_lifecycle_states?id=in.(${Object.keys(MODULE_FILLS).join(",")})`, body: { domain_module_id: null } });
console.log("blanked to_state, process_id and domain_module_id fills.");

// ---- confirm
let left = 0;
for (const { table, ids } of INSERTED) left += (await get(`/${table}?id=in.(${ids.join(",")})&select=id`)).length;
const ev2 = await get(`/trigger_events?id=in.(${Object.keys(TO_STATE_FILLS).join(",")})&to_state=neq.&select=id`);
const st2 = await get(`/data_object_lifecycle_states?id=in.(${Object.keys(PROCESS_FILLS).join(",")})&process_id=not.is.null&select=id`);
const st3 = await get(`/data_object_lifecycle_states?id=in.(${Object.keys(MODULE_FILLS).join(",")})&domain_module_id=not.is.null&select=id`);
console.log(`remaining: inserted rows ${left}, to_state fills ${ev2.length}, process_id fills ${st2.length}, domain_module_id fills ${st3.length}`);
