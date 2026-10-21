#!/usr/bin/env bun
// MA B1 technical fixes (per audits/MA.md continuation 2026-05-31).
//
// Applies only the deterministic, audit-pre-specified fixes:
//   B1-S2: PATCH event_category on 8 trigger_events
//          (471, 515, 516, 517, 518, 519, 520, 521)
//
// Everything else in Bucket 1 is deferred:
//   B1-S1 (Phase M load): gated on B2-S1 module-split + B2-S6 execution path.
//   B1-S3 / B1-S4 (B10b FK backfill): gated on B1-S1 (no MA modules exist).
//   B1-S5 (APQC handoff_processes): audit says PCF ids "deferred to fix time".
//          Only PCF family names enumerated, no resolvable process_id per row.
//   B1-S6 (cross-rel observation): audit says "None; observation only."
//   B1-S7 (alias gap): routed to B2-S2 for user-approved wording (Rule #15).
//
// Idempotent: pre-flight skips already-correct rows. Safe to re-run.

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

// ============================================================
// B1-S2: PATCH event_category on 8 trigger_events
// ============================================================
// Audit fully specifies each target category (Rule #13 enum:
// lifecycle / state_change / threshold / signal):
//   471 customer_attributes.refreshed   -> signal     (recurring data sync)
//   515 marketing_email.delivered       -> lifecycle  (stable mid-lifecycle stage)
//   516 marketing_email.opened          -> signal
//   517 marketing_email.clicked         -> signal
//   518 marketing_email.unsubscribed    -> lifecycle  (transitions consent state)
//   519 lead_score.recomputed           -> signal     (derived recurring signal)
//   520 nurture_journey.completed       -> lifecycle
//   521 marketing_form.submitted        -> lifecycle
console.log("\n=== B1-S2: PATCH event_category on 8 trigger_events ===");

type EventPatch = { id: number; event_name: string; event_category: "lifecycle" | "signal" };

const patches: EventPatch[] = [
  { id: 471, event_name: "customer_attributes.refreshed", event_category: "signal" },
  { id: 515, event_name: "marketing_email.delivered", event_category: "lifecycle" },
  { id: 516, event_name: "marketing_email.opened", event_category: "signal" },
  { id: 517, event_name: "marketing_email.clicked", event_category: "signal" },
  { id: 518, event_name: "marketing_email.unsubscribed", event_category: "lifecycle" },
  { id: 519, event_name: "lead_score.recomputed", event_category: "signal" },
  { id: 520, event_name: "nurture_journey.completed", event_category: "lifecycle" },
  { id: 521, event_name: "marketing_form.submitted", event_category: "lifecycle" },
];

const ids = patches.map(p => p.id);
const existing = await get(
  `/trigger_events?id=in.(${ids.join(",")})&select=id,event_name,event_category`,
);
const liveById = new Map<number, Row>();
for (const r of existing) liveById.set(Number(r.id), r);

let patched = 0;
let skipped = 0;
let mismatchName = 0;

for (const p of patches) {
  const live = liveById.get(p.id);
  if (!live) {
    throw new Error(`trigger_event id=${p.id} (${p.event_name}) not found`);
  }
  if (live.event_name !== p.event_name) {
    mismatchName++;
    throw new Error(
      `event_name mismatch on id=${p.id}: live=${JSON.stringify(live.event_name)}, expected=${JSON.stringify(p.event_name)}`,
    );
  }
  if (live.event_category === p.event_category) {
    console.log(`  id=${p.id} ${p.event_name} already '${p.event_category}', skip`);
    skipped++;
    continue;
  }
  await call({
    method: "PATCH",
    path: `/trigger_events?id=eq.${p.id}`,
    body: { event_category: p.event_category },
  });
  console.log(
    `  id=${p.id} ${p.event_name} (was ${JSON.stringify(live.event_category)}) -> '${p.event_category}'`,
  );
  patched++;
}

console.log(
  `\n  summary: ${patched} patched, ${skipped} already-correct, ${mismatchName} name-mismatch`,
);

// ============================================================
// Verification
// ============================================================
console.log("\n=== Post-write verification ===");

const after = await get(
  `/trigger_events?id=in.(${ids.join(",")})&select=id,event_name,event_category&order=id.asc`,
);
let empty = 0;
let invalid = 0;
const validCats = new Set(["lifecycle", "state_change", "threshold", "signal"]);
for (const r of after) {
  const cat = String(r.event_category ?? "");
  const ok = validCats.has(cat);
  if (cat === "") empty++;
  if (!ok && cat !== "") invalid++;
  console.log(`  id=${r.id} ${r.event_name} event_category=${JSON.stringify(r.event_category)}`);
}
console.log(`\n  ${after.length} rows verified, empty=${empty}, invalid-enum=${invalid}`);

if (empty > 0 || invalid > 0) {
  throw new Error(`Post-write verification failed (${empty} empty, ${invalid} invalid)`);
}

console.log("\nDone.");
