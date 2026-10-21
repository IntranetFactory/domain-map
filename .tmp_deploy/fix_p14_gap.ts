// Fix the 11 cross_domain_handoffs rows that were inserted after the P1.4 migration
// without a trigger_event_id FK. These rows carry the legacy text trigger_event but no FK.
//
// Procedure:
//   Phase 1: Insert 4 missing trigger_events rows (event names that don't yet exist).
//   Phase 2: PATCH each of the 11 cross_domain_handoffs rows with the correct trigger_event_id.

const APPLY = process.argv.includes("--apply");

async function call(body: any): Promise<any[]> {
  const p = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  p.stdin.write(JSON.stringify(body));
  await p.stdin.end();
  const out = await new Response(p.stdout).text();
  const err = await new Response(p.stderr).text();
  await p.exited;
  if (p.exitCode !== 0) throw new Error(`semantius failed (${p.exitCode}): ${err}`);
  return JSON.parse(out);
}
const get = (path: string) => call({ method: "GET", path });
async function post(path: string, body: any) {
  if (!APPLY) { console.log(`[dry-run] POST ${path}  body=${JSON.stringify(body)}`); return []; }
  return call({ method: "POST", path, body });
}
async function patch(path: string, body: any) {
  if (!APPLY) { console.log(`[dry-run] PATCH ${path}  body=${JSON.stringify(body)}`); return; }
  await call({ method: "PATCH", path, body });
}

// ---- Phase 1: 4 new trigger_events ----
// data_object_id is the publisher's master (per SKILL.md rule).
const NEW_TRIGGER_EVENTS = [
  { event_name: "process_model.published",         data_object_id: 247, description: "BPA publishes a new or updated business process model — consumers re-evaluate conformance and downstream capability impact." },
  { event_name: "capability_map.updated",          data_object_id: 248, description: "BPA publishes an updated business capability map — consumers re-align coverage assessments." },
  { event_name: "conformance.deviation_detected",  data_object_id: 581, description: "PROC-MIN detects a runtime deviation from the designed process — surfaces back to BPA for model review." },
  { event_name: "value_stream.bottleneck_identified", data_object_id: 249, description: "BPA's simulation or analysis identifies a bottleneck in a value stream — consumers (PROD-MGMT, etc.) re-prioritise." },
];

// ---- Phase 2: 11 handoff PATCHes (event_name → handoff IDs) ----
const HANDOFF_MAPPINGS = [
  { event_name: "process_model.published",          handoff_ids: [180, 182] },
  { event_name: "capability_map.updated",           handoff_ids: [181] },
  { event_name: "conformance.deviation_detected",   handoff_ids: [183] },
  { event_name: "value_stream.bottleneck_identified", handoff_ids: [184] },
  { event_name: "metric.certified",                 handoff_ids: [218, 219] },
  { event_name: "metric.deprecated",                handoff_ids: [220] },
  { event_name: "ontology.published",               handoff_ids: [221, 223] },
  { event_name: "kg_entity.linked",                 handoff_ids: [222] },
];

// ---- Plan ----
console.log("=== Phase 1: insert 4 missing trigger_events ===");
for (const t of NEW_TRIGGER_EVENTS) {
  console.log(`  + ${t.event_name}  (publisher data_object_id=${t.data_object_id})`);
}

console.log("\n=== Phase 2: PATCH 11 cross_domain_handoffs to set trigger_event_id ===");
for (const m of HANDOFF_MAPPINGS) {
  console.log(`  ${m.event_name.padEnd(36)} → handoffs ${m.handoff_ids.join(", ")}`);
}

console.log("");

// Insert phase 1
if (NEW_TRIGGER_EVENTS.length) {
  const inserted = await post("/trigger_events", NEW_TRIGGER_EVENTS);
  if (APPLY) {
    console.log(`Inserted ${inserted.length} new trigger_events.`);
  }
}

// Re-pull the FULL trigger_events to resolve names → ids (for the 4 new + 4 existing)
const triggerByName = new Map<string, number>();
if (APPLY) {
  const fresh = await get(`/trigger_events?select=id,event_name&limit=10000`);
  for (const t of fresh as any[]) triggerByName.set(t.event_name, t.id);
} else {
  // Dry-run: pre-populate with existing only; new ones won't be present
  const fresh = await get(`/trigger_events?select=id,event_name&limit=10000`);
  for (const t of fresh as any[]) triggerByName.set(t.event_name, t.id);
}

// Phase 2: PATCH each handoff
console.log("\n>>> Patching handoffs:");
for (const m of HANDOFF_MAPPINGS) {
  const teid = triggerByName.get(m.event_name);
  if (teid == null) {
    if (APPLY) throw new Error(`trigger_event '${m.event_name}' not resolvable post-insert`);
    console.log(`  [dry-run] would patch handoffs ${m.handoff_ids.join(", ")} → trigger_event_id (new row, id unknown until apply)`);
    continue;
  }
  for (const hid of m.handoff_ids) {
    await patch(`/cross_domain_handoffs?id=eq.${hid}`, { trigger_event_id: teid });
  }
}

// Verify
if (APPLY) {
  const rows = await get(`/cross_domain_handoffs?trigger_event_id=is.null&select=id,trigger_event`);
  console.log(`\nPost-fix verification: ${(rows as any[]).length} rows still missing trigger_event_id`);
  if ((rows as any[]).length === 0) console.log("✓ All cross_domain_handoffs rows now have trigger_event_id.");
}

console.log(`\nMode: ${APPLY ? "APPLY (writes done)" : "DRY-RUN (no writes)"}`);
