#!/usr/bin/env bun
// OBS B1 technical fixes, 2026-05-31.
// Applies only truly-technical Bucket-1 items from audits/OBS.md:
//   1. B1-S4: PATCH event_category on trigger_events 636-644 (enum backfill,
//      mapping pre-specified in the audit, per Rule #13).
//   2. B1-H1 subset: INSERT handoff_processes rows for handoffs 611, 618 ->
//      PCF 20903 (Triage IT service delivery incidents, process_id 1299).
//      Both pre-specified as "confident L4" in the audit and the PCF resolves
//      to a single existing row.
//
// Defers everything else (modules, capabilities, lifecycle states, pattern
// flags, intra-domain relationships, user-edges with incomplete tuples, etc.)
// per the subagent prompt's DEFER list.

import { } from "bun";

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

const get = (path: string) => call({ method: "GET", path });

// ============================================================
// B1-S4: PATCH event_category on OBS trigger_events 636-644
// ============================================================
// Mapping per audit B1-S4 (audits/OBS.md), per Rule #13 enum:
//   lifecycle / state_change / threshold / signal
const eventCategoryMap: Record<number, string> = {
  636: "threshold",   // metric_series.threshold_breached
  637: "signal",      // metric_series.anomaly_detected
  638: "signal",      // log_entry.error_pattern_matched
  639: "signal",      // distributed_trace.slow_path_detected
  640: "signal",      // distributed_trace.error_spike
  641: "threshold",   // service_level_objective.burn_rate_high
  642: "state_change",// service_level_objective.budget_exhausted
  643: "signal",      // error_group.new_signature
  644: "signal",      // error_group.regression_detected
};

async function patchEventCategories() {
  console.log("\n=== B1-S4: PATCH trigger_events.event_category ===");
  // Verify each row currently has empty event_category before PATCHing.
  const live = await get(
    `/trigger_events?id=in.(${Object.keys(eventCategoryMap).join(",")})&select=id,event_name,event_category`,
  );
  const liveById = new Map<number, Row>(live.map(r => [Number(r.id), r]));
  let patched = 0;
  let skipped = 0;
  for (const [idStr, category] of Object.entries(eventCategoryMap)) {
    const id = Number(idStr);
    const row = liveById.get(id);
    if (!row) {
      console.log(`  WARN id=${id} not found, skipping`);
      skipped++;
      continue;
    }
    if (row.event_category && row.event_category !== "") {
      console.log(`  SKIP id=${id} (${row.event_name}) already has event_category='${row.event_category}'`);
      skipped++;
      continue;
    }
    await call({
      method: "PATCH",
      path: `/trigger_events?id=eq.${id}`,
      body: { event_category: category },
    });
    console.log(`  PATCH id=${id} (${row.event_name}) -> ${category}`);
    patched++;
  }
  console.log(`  done: ${patched} patched, ${skipped} skipped`);
}

// ============================================================
// B1-H1 (subset): INSERT handoff_processes for 611, 618 -> PCF 20903
// ============================================================
// Only the two rows whose audit confidence is "confident L4" AND whose PCF
// ("Triage IT service delivery incidents", external_id 20903) resolves to a
// single existing processes row (verified pre-flight: id=1299).
const handoffPcfTags = [
  { handoff_id: 611, process_id: 1299 },
  { handoff_id: 618, process_id: 1299 },
];

async function insertHandoffProcesses() {
  console.log("\n=== B1-H1 (subset): INSERT handoff_processes ===");
  // Verify PCF still resolves.
  const pcf = await get(`/processes?id=eq.1299&select=id,process_name,external_id`);
  if (pcf.length !== 1 || pcf[0].external_id !== "20903") {
    throw new Error(`PCF 20903 did not resolve cleanly: ${JSON.stringify(pcf)}`);
  }
  console.log(`  PCF resolved: id=1299 external_id=20903 name='${pcf[0].process_name}'`);

  // Skip any that already have a handoff_processes row pointing at this PCF.
  const handoffIds = handoffPcfTags.map(t => t.handoff_id).join(",");
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds})&process_id=eq.1299&select=id,handoff_id,process_id`,
  );
  const existingKeys = new Set(
    existing.map(r => `${r.handoff_id}:${r.process_id}`),
  );
  const toInsert = handoffPcfTags
    .filter(t => !existingKeys.has(`${t.handoff_id}:${t.process_id}`))
    .map(t => ({
      handoff_id: t.handoff_id,
      process_id: t.process_id,
      role: "implements",          // default per fields.handoff_processes.role
      proposal_source: "agent_curated", // per audit, this is agent_curated authoring
      // record_status omitted -> defaults to 'new' (Rule #1)
      // notes omitted (Rule #15)
      // key, label, id auto
    }));
  if (toInsert.length === 0) {
    console.log("  nothing to insert; already present");
    return;
  }
  for (const row of toInsert) {
    await call({ method: "POST", path: "/handoff_processes", body: [row] });
    console.log(`  INSERT handoff_id=${row.handoff_id} process_id=${row.process_id} proposal_source=${row.proposal_source}`);
  }
  console.log(`  done: ${toInsert.length} inserted, ${existing.length} pre-existing`);
}

// ============================================================
// Main
// ============================================================
console.log("OBS B1 technical fixes, 2026-05-31");
console.log("===================================");

await patchEventCategories();
await insertHandoffProcesses();

console.log("\nAll technical fixes applied.");
