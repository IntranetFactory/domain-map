#!/usr/bin/env bun
// PROD-MGMT b1 technical fixes (2026-05-31 continuation).
// Applies only the truly-mechanical subset of Bucket 1 per orchestrator rules:
//   1. B1-S1: PATCH event_category on 14 PROD-MGMT-owned trigger_events whose
//      categories are pre-specified in the audit (8 lifecycle + 3 state_change + 3 threshold).
//      The other 6 PROD-MGMT events without an audit-specified category are left alone.
//   2. B1-S3: INSERT 2 consumer DMDO rows on PM-ROADMAP-DELIVERY (131) for
//      work_items (243) and okr_objectives (245), both consumer + optional.
//   3. B1-H1 partial: INSERT handoff_processes rows ONLY for the 12 handoffs the
//      audit pre-specifies with a resolvable PCF process_id. The other 19 H1
//      candidates that say "needs PCF lookup" are deferred (orchestrator rule).
//
// Idempotent: each step reads existing state and only writes diffs.

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const jsonStr = JSON.stringify(body);
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", jsonStr], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

// ============================================================
// 1. B1-S1: trigger_events.event_category backfill (audit-pre-specified)
// ============================================================
// Audit B1-S1 explicit mapping:
//   lifecycle    : 1138, 1145, 1146, 1147, 1149, 1153, 1154, 1156
//   state_change : 1142, 1155, 1157
//   threshold    : 1144, 1148, 1151
const eventCategoryMap: Record<number, string> = {
  1138: "lifecycle",     // beta_program.launched
  1145: "lifecycle",     // feature_request.shipped
  1146: "lifecycle",     // product_feature.released
  1147: "lifecycle",     // product_feature.deprecated
  1149: "lifecycle",     // product_line.launched
  1153: "lifecycle",     // product_release.planned
  1154: "lifecycle",     // product_release.shipped
  1156: "lifecycle",     // product_roadmap.published
  1142: "state_change",  // customer_feedback_item.linked_to_feature
  1155: "state_change",  // product_release.rolled_back
  1157: "state_change",  // product_roadmap.item_promoted
  1144: "threshold",     // feature_request.upvoted_threshold
  1148: "threshold",     // product_feature.adoption_threshold_reached
  1151: "threshold",     // product_metric.threshold_breached
};

console.log(`[1/3] B1-S1: PATCH event_category on ${Object.keys(eventCategoryMap).length} pre-specified trigger_events`);

const eventIds = Object.keys(eventCategoryMap).map(Number);
const idList = eventIds.join(",");
const existingEvents = await call({
  method: "GET",
  path: `/trigger_events?id=in.(${idList})&select=id,event_name,event_category`,
});

let eventPatched = 0;
let eventSkipped = 0;
for (const ev of existingEvents) {
  const id = Number(ev.id);
  const desired = eventCategoryMap[id];
  const current = String(ev.event_category ?? "");
  if (current === desired) {
    eventSkipped++;
    continue;
  }
  if (current !== "" && current !== desired) {
    console.log(`  WARN id=${id} event=${ev.event_name} current=${current} desired=${desired} — skipping (audit only authorizes empty -> desired)`);
    eventSkipped++;
    continue;
  }
  await call({
    method: "PATCH",
    path: `/trigger_events?id=eq.${id}`,
    body: { event_category: desired },
  });
  console.log(`  PATCHed id=${id} event=${ev.event_name} -> ${desired}`);
  eventPatched++;
}
console.log(`  done: patched=${eventPatched} skipped=${eventSkipped}`);

// ============================================================
// 2. B1-S3: consumer DMDOs for work_items + okr_objectives on PM-ROADMAP-DELIVERY
// ============================================================
const ROADMAP_ID = 131;

const consumerDmdoRows = [
  { domain_module_id: ROADMAP_ID, data_object_id: 243, role: "consumer", necessity: "optional" }, // work_items
  { domain_module_id: ROADMAP_ID, data_object_id: 245, role: "consumer", necessity: "optional" }, // okr_objectives
];

console.log(`\n[2/3] B1-S3: consumer DMDOs for work_items (243), okr_objectives (245) on PM-ROADMAP-DELIVERY (131)`);
const existingDmdo = await call({
  method: "GET",
  path: `/domain_module_data_objects?domain_module_id=eq.${ROADMAP_ID}&data_object_id=in.(243,245)&select=domain_module_id,data_object_id`,
});
const dmdoKey = (r: Row) => `${r.domain_module_id}|${r.data_object_id}`;
const existingDmdoKeys = new Set(existingDmdo.map(dmdoKey));
const missingDmdo = consumerDmdoRows.filter((r) => !existingDmdoKeys.has(dmdoKey(r)));
if (missingDmdo.length > 0) {
  console.log(`  inserting ${missingDmdo.length} consumer DMDO rows`);
  await call({ method: "POST", path: "/domain_module_data_objects", body: missingDmdo });
  for (const r of missingDmdo) console.log(`  INSERTed module=${r.domain_module_id} do=${r.data_object_id}`);
} else {
  console.log(`  all present, skipping`);
}

// ============================================================
// 3. B1-H1 partial: handoff_processes for the 12 pre-specified rows with resolvable PCF
// ============================================================
// Each tuple: [handoff_id, process_id] -- both pre-specified in audit B1-H1 table.
// Skipped: 781 -> 571 (a different process_id 413 is already loaded; orchestrator rule
//         forbids contradicting an existing load on a row already in the catalog).
// All "needs lookup" rows from the audit are deferred (orchestrator rule: only insert
//         when audit pre-specifies handoff_id + resolvable PCF).
const handoffProcessRows: Array<{ handoff_id: number; process_id: number }> = [
  { handoff_id: 998,  process_id: 956  }, // customer_feedback_item.linked_to_feature (PM-DISCOVERY -> CSM)
  { handoff_id: 999,  process_id: 530  }, // feature_request.upvoted_threshold (PM-DISCOVERY -> WORK-MGMT-TASK-EXEC)
  { handoff_id: 1000, process_id: 964  }, // feature_request.shipped (PM-DISCOVERY -> CRM-ACCT-MGT)
  { handoff_id: 1009, process_id: 1262 }, // product_release.shipped (PM-ROADMAP-DELIVERY -> DXP)
  { handoff_id: 1010, process_id: 1265 }, // product_release.rolled_back (PM-ROADMAP-DELIVERY -> CSM)
  { handoff_id: 1011, process_id: 625  }, // product_roadmap.published (PM-ROADMAP-DELIVERY -> DXP)
  { handoff_id: 1250, process_id: 1262 }, // product_release.shipped (PM-ROADMAP-DELIVERY -> WORK-MGMT-TASK-EXEC)
  { handoff_id: 1251, process_id: 1265 }, // product_release.rolled_back (PM-ROADMAP-DELIVERY -> WORK-MGMT-TASK-EXEC)
  { handoff_id: 1252, process_id: 625  }, // product_roadmap.published (PM-ROADMAP-DELIVERY -> WORK-MGMT-TASK-EXEC)
  { handoff_id: 243,  process_id: 625  }, // roadmap_item.released (SPM -> PM-ROADMAP-DELIVERY)
  { handoff_id: 775,  process_id: 1262 }, // pull_request.merged (VSDP -> PM-ROADMAP-DELIVERY)
  { handoff_id: 1322, process_id: 625  }, // work_item.completed (WORK-MGMT-TASK-EXEC -> PM-ROADMAP-DELIVERY)
];

console.log(`\n[3/3] B1-H1 partial: handoff_processes for ${handoffProcessRows.length} audit-pre-specified rows`);
const hpKey = (r: { handoff_id: number; process_id: number }) => `${r.handoff_id}|${r.process_id}`;
const hoIds = [...new Set(handoffProcessRows.map((r) => r.handoff_id))].join(",");
const existingHp = await call({
  method: "GET",
  path: `/handoff_processes?handoff_id=in.(${hoIds})&select=handoff_id,process_id`,
});
const existingHpKeys = new Set(existingHp.map((r) => hpKey(r as { handoff_id: number; process_id: number })));
const missingHp = handoffProcessRows.filter((r) => !existingHpKeys.has(hpKey(r)));

if (missingHp.length > 0) {
  // omit record_status (defaults to 'new' per Rule #1); set proposal_source='agent_curated'
  const body = missingHp.map((r) => ({
    handoff_id: r.handoff_id,
    process_id: r.process_id,
    role: "implements",
    proposal_source: "agent_curated",
  }));
  console.log(`  inserting ${missingHp.length} handoff_processes rows`);
  await call({ method: "POST", path: "/handoff_processes", body });
  for (const r of missingHp) console.log(`  INSERTed handoff=${r.handoff_id} process=${r.process_id}`);
} else {
  console.log(`  all present, skipping`);
}

console.log("\nDone.");
