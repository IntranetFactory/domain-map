#!/usr/bin/env bun
// DCG B10b resolution: author consumer DMDO rows for the external metadata the
// catalog ingests, then set the DCG-side module FK on the 13 previously-unresolved handoffs.
// Idempotent. record_status='new' (default, omitted).

import { $ } from "bun";
$.throws(false);
type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [o, e] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if (await proc.exited !== 0) throw new Error(`fail: ${e}\nbody=${JSON.stringify(body)}`);
  const t = o.trim(); return t ? JSON.parse(t) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
const patch = (p: string, b: Row) => call({ method: "PATCH", path: p, body: b });
async function post(p: string, rows: Row[]) { if (rows.length) await call({ method: "POST", path: p, body: rows }); }

const CATALOG = 337, LINEAGE = 338, GLOSSARY = 339;

// external payload data_object -> receiving DCG module (consumer, optional)
const CONSUMER: [number, number][] = [
  [228, CATALOG], [229, CATALOG], [691, CATALOG], [692, CATALOG], [337, CATALOG],
  [221, CATALOG], [319, CATALOG], [312, CATALOG], [710, LINEAGE], [434, LINEAGE], [743, GLOSSARY],
];
// inbound handoff id -> target_domain_module_id (the DCG module that consumes the payload)
const INBOUND_FK: [number, number][] = [
  [683, CATALOG], [685, CATALOG], [688, CATALOG], [707, CATALOG], [713, CATALOG],
  [719, CATALOG], [846, CATALOG], [1341, CATALOG], [694, LINEAGE], [726, LINEAGE],
  [698, GLOSSARY], [699, GLOSSARY],
];

console.log("== consumer DMDO rows for ingested external metadata ==");
{
  const modIds = [CATALOG, LINEAGE, GLOSSARY];
  const existing = await get(`/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id`);
  const have = new Set(existing.map(r => `${r.domain_module_id}.${r.data_object_id}`));
  const rows = CONSUMER.filter(([d, m]) => !have.has(`${m}.${d}`))
    .map(([data_object_id, domain_module_id]) => ({ domain_module_id, data_object_id, role: "consumer", necessity: "optional", notes: "" }));
  if (rows.length) { console.log(`  + ${rows.length} consumer DMDO`); await post("/domain_module_data_objects", rows); }
  else console.log("  = all consumer DMDO present");
}

console.log("== set target_domain_module_id on 12 inbound handoffs ==");
for (const [hid, mid] of INBOUND_FK) await patch(`/handoffs?id=eq.${hid}&target_domain_module_id=is.null`, { target_domain_module_id: mid });
console.log(`  patched ${INBOUND_FK.length} inbound handoffs`);

console.log("== set source_domain_module_id on outbound 158 (access_policy.updated -> ACCESS-GOV) ==");
await patch(`/handoffs?id=eq.158&source_domain_module_id=is.null`, { source_domain_module_id: 341 });
console.log("  patched handoff 158 source=DCG-ACCESS-GOV (341)");
console.log("  NOTE for review: trigger_event 2 (access_policy.updated) points at data_object 226 (lakehouse_tables, DATA-AI-PLAT)");
console.log("  rather than data_access_policies (307). That is an existing-row mis-attribution, surfaced not auto-fixed.");

console.log("\n== verify no remaining NULL DCG-side module FKs ==");
const outNull = await get(`/handoffs?source_domain_id=eq.88&source_domain_module_id=is.null&select=id`);
const inNull = await get(`/handoffs?target_domain_id=eq.88&target_domain_module_id=is.null&select=id`);
console.log(`  remaining NULL: outbound=${outNull.length} ${JSON.stringify(outNull.map(r=>r.id))}, inbound=${inNull.length} ${JSON.stringify(inNull.map(r=>r.id))}`);
