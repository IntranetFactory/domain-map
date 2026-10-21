#!/usr/bin/env bun
// DATA-AI-PLAT B1 technical fixes (residual, 2026-05-31).
//
// Applies only the truly-technical B1 items the audit fully specifies:
//   1. B1-S1: PATCH event_category on 8 trigger_events (audit pre-mapped each).
//   2. B1-H1 (subset): INSERT 5 handoff_processes rows where the audit
//      pre-specified both the handoff_id AND a resolved PCF process_id with
//      "confident" confidence. The remaining ~9 candidates carry "medium" /
//      "needs lookup" / "candidate" markers and require human judgment, they
//      are deferred to the user.
//
// Skipped (judgment-heavy, surfaced to user instead):
//   - B1-S2 / B1-S3 source/target_domain_module_id backfills (gated on B2-S1
//     module split decision; the DATA-AI-PLAT side cannot be populated until
//     modules exist for this domain).
//   - B1-S4 consumer DMDOs on downstream domains (owed by other domains).
//   - B1-H1 medium-confidence and "needs lookup" candidates.
//   - Any notes/Rule-#15 / Rule-#1 status writes.
//
// Idempotent: GETs existing state before each write and skips no-ops.

import { $ } from "bun";

$.throws(false);

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
// B1-S1: PATCH event_category on 8 trigger_events
// ============================================================
// Audit-specified mapping per DATA-AI-PLAT.md B1-S1:
//   698 ml_model.deployed                -> lifecycle
//   699 ml_model.drift_detected          -> signal
//   700 ml_model.retraining_required     -> signal
//   701 ml_model.evaluation_failed       -> state_change
//   702 ml_model.archived                -> lifecycle
//   703 feature_set.published            -> lifecycle
//   704 feature_set.schema_changed       -> state_change
//   705 feature_set.staleness_breached   -> threshold
const eventCategoryFixes: { id: number; event_category: string }[] = [
  { id: 698, event_category: "lifecycle" },
  { id: 699, event_category: "signal" },
  { id: 700, event_category: "signal" },
  { id: 701, event_category: "state_change" },
  { id: 702, event_category: "lifecycle" },
  { id: 703, event_category: "lifecycle" },
  { id: 704, event_category: "state_change" },
  { id: 705, event_category: "threshold" },
];

console.log("\n=== B1-S1: PATCH trigger_events.event_category ===");
{
  const ids = eventCategoryFixes.map(f => f.id).join(",");
  const existing = await get(
    `/trigger_events?id=in.(${ids})&select=id,event_name,event_category`,
  );
  const needsFix = eventCategoryFixes.filter(f => {
    const row = existing.find(r => Number(r.id) === f.id);
    return row && row.event_category !== f.event_category;
  });
  console.log(
    `  ${needsFix.length} of ${eventCategoryFixes.length} trigger_events need a PATCH`,
  );
  for (const fix of needsFix) {
    await call({
      method: "PATCH",
      path: `/trigger_events?id=eq.${fix.id}`,
      body: { event_category: fix.event_category },
    });
    console.log(`  PATCHed trigger_event ${fix.id} -> event_category=${fix.event_category}`);
  }

  const after = await get(
    `/trigger_events?id=in.(${ids})&select=id,event_name,event_category&order=id.asc`,
  );
  for (const r of after) {
    console.log(`  verify ${r.id} ${r.event_name}: event_category='${r.event_category}'`);
  }
  const stillEmpty = after.filter(r => !r.event_category);
  if (stillEmpty.length > 0) {
    throw new Error(`B1-S1 verification failed: ${stillEmpty.length} rows still have empty event_category`);
  }
}

// ============================================================
// B1-H1 (subset): INSERT 5 confident handoff_processes rows
// ============================================================
// Audit-specified pairs, restricted to "confident" rows where the PCF
// process_id is resolved (no "needs lookup", no "candidate", no "medium").
//   handoff 154 (DATA-AI-PLAT -> AIOPS  pipeline_run.failed)         -> PCF 272
//   handoff 682 (DATA-AI-PLAT -> ITSM   ml_model.drift_detected)     -> PCF 272
//   handoff 686 (DATA-AI-PLAT -> ITSM   ml_model.evaluation_failed)  -> PCF 272
//   handoff 158 (DCG          -> DATA-AI-PLAT  access_policy.updated) -> PCF 273
//   handoff 725 (DI           -> DATA-AI-PLAT  pipeline_run.completed) -> PCF 272
//
// proposal_source = agent_curated (b1 audit fix-loop with full domain context).
// record_status omitted (column default 'new', per Rule #1).
// role omitted (column default 'implements').
// notes omitted (Rule #15).
const handoffProcessInserts: { handoff_id: number; process_id: number }[] = [
  { handoff_id: 154, process_id: 272 },
  { handoff_id: 682, process_id: 272 },
  { handoff_id: 686, process_id: 272 },
  { handoff_id: 158, process_id: 273 },
  { handoff_id: 725, process_id: 272 },
];

console.log("\n=== B1-H1: INSERT handoff_processes (5 confident) ===");
{
  const handoffIds = handoffProcessInserts.map(r => r.handoff_id).join(",");
  const processIds = [...new Set(handoffProcessInserts.map(r => r.process_id))].join(",");
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds})&process_id=in.(${processIds})&select=handoff_id,process_id`,
  );
  const existingKey = new Set(
    existing.map(r => `${r.handoff_id}|${r.process_id}`),
  );

  const toInsert = handoffProcessInserts
    .filter(r => !existingKey.has(`${r.handoff_id}|${r.process_id}`))
    .map(r => ({
      handoff_id: r.handoff_id,
      process_id: r.process_id,
      proposal_source: "agent_curated",
    }));

  console.log(`  ${toInsert.length} of ${handoffProcessInserts.length} pairs need an INSERT`);
  if (toInsert.length > 0) {
    const inserted = await call({
      method: "POST",
      path: "/handoff_processes",
      body: toInsert,
    });
    console.log(`  INSERTed ${inserted.length} handoff_processes rows`);
  }

  const after = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds})&process_id=in.(${processIds})&select=handoff_id,process_id,proposal_source,record_status,role&order=handoff_id.asc`,
  );
  for (const r of after) {
    console.log(
      `  verify handoff=${r.handoff_id} process=${r.process_id} ` +
      `source=${r.proposal_source} status=${r.record_status} role=${r.role}`,
    );
  }
  if (after.length < handoffProcessInserts.length) {
    throw new Error(
      `B1-H1 verification failed: expected ${handoffProcessInserts.length} rows, found ${after.length}`,
    );
  }
}

console.log("\n=== Done ===");
console.log("UI spot-checks:");
console.log("  https://tests.semantius.app/domain_map/trigger_events");
console.log("  https://tests.semantius.app/domain_map/handoff_processes");
