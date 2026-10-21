#!/usr/bin/env bun
// Residual B1 technical fixes for VSDP (domain_id=80) per audit
// c:/dev/domain-map/audits/VSDP.md.
//
// Scope, technical only:
//   1) B1-S6: PATCH event_category on 13 trigger_events (844-856) per Rule #13.
//   2) B1-SC1: DELETE solution_domains row 527 (Jira Product Discovery mis-attach).
//   3) APQC tagging: INSERT 9 outbound handoff_processes rows (770, 771, 772, 773,
//      774, 775, 776, 777, 800), proposal_source=agent_curated. Each tuple
//      (handoff_id, process_id) verified to not already exist.
//
// Deferred (gated, judgment, or new entities): B1-S1 modules, B1-S2 capabilities,
// B1-S3 entity+user edges (verbs not pre-specified), B1-S4 roles, B1-S5 skill
// rewire, B1-S7 lifecycle states, B1-B1 NULL FK backfills (all gated on modules),
// plus Bucket 2 items #1-#6 and Bucket 3 candidates.

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

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

async function del(path: string): Promise<Row[]> {
  return call({ method: "DELETE", path });
}

async function post(path: string, body: Row[]): Promise<Row[]> {
  return call({ method: "POST", path, body });
}

// ============================================================
// 1. B1-S6: PATCH trigger_events.event_category
// ============================================================
const eventCategoryMap: Record<number, string> = {
  844: "lifecycle",     // source_repository.created
  845: "lifecycle",     // source_repository.archived
  846: "signal",        // code_commit.pushed
  847: "lifecycle",     // pull_request.opened
  848: "state_change",  // pull_request.merged
  849: "lifecycle",     // ci_pipeline.created
  850: "state_change",  // ci_pipeline_run.failed
  851: "state_change",  // ci_pipeline_run.succeeded
  852: "lifecycle",     // build_artifact.published
  853: "state_change",  // software_deployment.completed
  854: "state_change",  // software_deployment.failed
  855: "signal",        // value_stream_metric.published
  856: "threshold",     // value_stream_metric.threshold_breached
};

console.log("=== 1. Backfilling trigger_events.event_category ===");
for (const [idStr, cat] of Object.entries(eventCategoryMap)) {
  const id = Number(idStr);
  await patch(`/trigger_events?id=eq.${id}`, { event_category: cat });
  console.log(`  PATCH /trigger_events/${id} event_category=${cat}`);
}

// Verify
const events = await get(
  `/trigger_events?id=in.(${Object.keys(eventCategoryMap).join(",")})&select=id,event_name,event_category&order=id.asc`,
);
const unsetEvents = events.filter(e => !e.event_category || String(e.event_category).trim() === "");
if (unsetEvents.length > 0) {
  throw new Error(`trigger_events still missing event_category: ${JSON.stringify(unsetEvents)}`);
}
console.log(`  verified ${events.length} trigger_events have event_category set`);

// ============================================================
// 2. B1-SC1: DELETE solution_domains row 527
// ============================================================
console.log("\n=== 2. Removing scope-creep solution_domains row 527 ===");
// Pre-check the row matches what the audit named.
const sd527 = await get("/solution_domains?id=eq.527&select=id,solution_id,domain_id,coverage_level");
if (sd527.length === 0) {
  console.log("  row 527 already absent, skipping DELETE");
} else {
  const r = sd527[0]!;
  if (Number(r.solution_id) !== 400 || Number(r.domain_id) !== 80) {
    throw new Error(`solution_domains row 527 unexpected shape: ${JSON.stringify(r)}`);
  }
  await del("/solution_domains?id=eq.527");
  console.log(`  DELETED solution_domains row 527 (solution_id=400 Jira Product Discovery, domain_id=80)`);
}

// ============================================================
// 3. APQC: INSERT handoff_processes for 9 outbound VSDP handoffs
// ============================================================
// Per audit table "Outbound handoffs from VSDP (proposed agent_curated rows)".
// Tuples (handoff_id, process_id) verified against PCF row existence (ids 85,
// 281, 1262, 1265, 1939 all confirmed present, source_framework=apqc_pcf_cross_industry).
const apqcProposals: Array<{ handoff_id: number; process_id: number }> = [
  { handoff_id: 770, process_id: 1262 }, // VSDP -> APP-PAAS, software_deployment.completed
  { handoff_id: 771, process_id: 1939 }, // VSDP -> TEST-MGMT, ci_pipeline_run.failed
  { handoff_id: 772, process_id: 85 },   // VSDP -> SPM, value_stream_metric.published
  { handoff_id: 773, process_id: 1262 }, // VSDP -> OBS, software_deployment.completed
  { handoff_id: 774, process_id: 1265 }, // VSDP -> ITSM, software_deployment.failed
  { handoff_id: 775, process_id: 281 },  // VSDP -> PROD-MGMT, pull_request.merged
  { handoff_id: 776, process_id: 281 },  // VSDP -> WORK-MGMT, pull_request.merged
  { handoff_id: 777, process_id: 85 },   // VSDP -> EPM, value_stream_metric.threshold_breached
  { handoff_id: 800, process_id: 1262 }, // VSDP -> GRC, build_artifact.published
];

console.log("\n=== 3. Inserting handoff_processes APQC tags (outbound) ===");

// Pre-flight idempotency: skip tuples already present.
const handoffIds = apqcProposals.map(p => p.handoff_id).join(",");
const existingHp = await get(
  `/handoff_processes?handoff_id=in.(${handoffIds})&select=handoff_id,process_id`,
);
const existingKeys = new Set(
  existingHp.map(r => `${r.handoff_id}:${r.process_id}`),
);

const toInsert = apqcProposals.filter(
  p => !existingKeys.has(`${p.handoff_id}:${p.process_id}`),
);

if (toInsert.length === 0) {
  console.log("  all 9 APQC tuples already present, nothing to insert");
} else {
  const rows = toInsert.map(p => ({
    handoff_id: p.handoff_id,
    process_id: p.process_id,
    role: "implements",
    proposal_source: "agent_curated",
    // record_status omitted (default 'new' per Rule #1)
    // notes omitted (default '' per Rule #15)
  }));
  const inserted = await post("/handoff_processes", rows);
  console.log(`  INSERTED ${inserted.length} handoff_processes rows`);
  for (const p of toInsert) {
    console.log(`    handoff_id=${p.handoff_id} process_id=${p.process_id}`);
  }
}

// Skipped report
const skipped = apqcProposals.filter(
  p => existingKeys.has(`${p.handoff_id}:${p.process_id}`),
);
if (skipped.length > 0) {
  console.log(`  skipped ${skipped.length} pre-existing tuples:`);
  for (const p of skipped) {
    console.log(`    handoff_id=${p.handoff_id} process_id=${p.process_id} (already present)`);
  }
}

console.log("\n=== DONE ===");
