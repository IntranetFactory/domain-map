#!/usr/bin/env bun
// fix_mdm_b1_technical_2026_05_31.ts
// MDM residual B1 technical fixes (continuation, 2026-05-31).
//
// Scope (strictly technical, audit-pre-specified mappings only):
//   - B1-S3: PATCH 5 trigger_events.event_category backfills on MDM-owned events
//     (749 merge_rule.published, 750 merge_rule.disabled, 751 source_record.ingested,
//     752 source_record.match_pending, 753 source_record.merged_to_golden).
//
// Everything else in the MDM audit's Bucket 1 is deferred per orchestrator rules:
// gated on B2 decisions (module split, master reconciliation, role catalog, wording
// approval) or speculative (B3 candidates). See the MDM audit's "Continuation"
// section appended on 2026-05-31 for the deferral inventory.

type Json = any;

async function semantius(method: string, path: string, body?: Json): Promise<Json> {
  const arg: Json = { method, path };
  if (body !== undefined) arg.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(arg)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius ${method} ${path} failed: ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

// Audit-pre-specified mappings (MDM.md B1-S3).
const EVENT_CATEGORY_BACKFILL: Array<{ id: number; event_name: string; event_category: string }> = [
  { id: 749, event_name: "merge_rule.published",         event_category: "state_change" },
  { id: 750, event_name: "merge_rule.disabled",          event_category: "state_change" },
  { id: 751, event_name: "source_record.ingested",       event_category: "lifecycle" },
  { id: 752, event_name: "source_record.match_pending",  event_category: "state_change" },
  { id: 753, event_name: "source_record.merged_to_golden", event_category: "lifecycle" },
];

async function main() {
  console.log("MDM B1 residual technical fixes (2026-05-31)\n");

  // Pre-flight: read live rows, verify ids and event_names, skip already-populated.
  const ids = EVENT_CATEGORY_BACKFILL.map(r => r.id).join(",");
  const live = await semantius("GET",
    `/trigger_events?id=in.(${ids})&select=id,event_name,event_category`);
  const liveById = new Map<number, any>(live.map((r: any) => [r.id, r]));

  let patched = 0;
  let skipped = 0;
  for (const row of EVENT_CATEGORY_BACKFILL) {
    const cur = liveById.get(row.id);
    if (!cur) {
      throw new Error(`trigger_event id=${row.id} (${row.event_name}) not found live`);
    }
    if (cur.event_name !== row.event_name) {
      throw new Error(`trigger_event id=${row.id} name mismatch: live='${cur.event_name}' audit='${row.event_name}'`);
    }
    if (cur.event_category === row.event_category) {
      console.log(`  = ${row.id} ${row.event_name} already '${row.event_category}'`);
      skipped++;
      continue;
    }
    if (cur.event_category !== "") {
      throw new Error(`trigger_event id=${row.id} (${row.event_name}) has unexpected event_category='${cur.event_category}', expected '' or '${row.event_category}'`);
    }
    await semantius("PATCH", `/trigger_events?id=eq.${row.id}`,
      { event_category: row.event_category });
    console.log(`  + ${row.id} ${row.event_name} -> ${row.event_category}`);
    patched++;
  }

  // Post-flight: verify all 5 rows now carry the expected category.
  const after = await semantius("GET",
    `/trigger_events?id=in.(${ids})&select=id,event_name,event_category&order=id.asc`);
  let ok = true;
  for (const row of EVENT_CATEGORY_BACKFILL) {
    const cur = after.find((r: any) => r.id === row.id);
    if (cur?.event_category !== row.event_category) {
      console.error(`  ! post-check FAIL: ${row.id} ${row.event_name} expected '${row.event_category}' got '${cur?.event_category}'`);
      ok = false;
    }
  }
  if (!ok) throw new Error("post-flight verification failed");

  console.log(`\nSummary: ${patched} PATCHed, ${skipped} already-correct. All 5 rows verified.`);
  console.log("UI: https://tests.semantius.app/domain_map/trigger_events");
}

await main();
