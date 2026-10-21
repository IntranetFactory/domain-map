#!/usr/bin/env bun
// TALENT-MGMT B1 technical fixes, 2026-05-31
//
// Applies ONLY the truly-technical Bucket-1 items from audits/TALENT-MGMT.md.
// Each fix is independently classified per the parent-task rules:
//   - B1-S2 : PATCH event_category on 6 trigger_events            (enum backfill; audit names IDs + values)
//   - B1-S6 : PATCH target_domain_module_id on 4 inbound handoffs (B10b derivable; audit names IDs + targets)
//   - B1-S7 : PATCH source_domain_module_id on handoff 441        (B10b derivable; audit names ID + module 52)
//
// Deferred (per parent-task instructions):
//   - B1-S1 : gated on B2-S1 architectural choice (user judgment)
//   - B1-S3 : 5 new intra-domain handoffs (new entity inserts, depends on B1-S4)
//   - B1-S4 : 11 new trigger_events (new entity inserts beyond enum backfill)
//   - B1-S5 / S10 / S11 : report-only, other domains' fixes
//   - B1-S8 : routed to B2-S3 (judgment)
//   - B1-S9 : APQC tagging (audit gives PCF prose names only, no resolved process_ids;
//             several rows medium-confidence requiring parent-vs-child anchoring judgment)
//
// Run from the project root:
//   bun run "c:/dev/domain-map/.tmp_deploy/fix_talent_mgmt_b1_technical_2026_05_31.ts"

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

// =====================================================================
// Step 1, B1-S2: PATCH event_category on 6 trigger_events.
// Rule #13 enum: lifecycle / state_change / threshold / signal.
// Audit specifies the per-id mapping.
// =====================================================================
console.log("\n=== B1-S2: PATCH trigger_events.event_category ===");

const eventCategoryPatches: Array<{ id: number; event_name: string; event_category: string }> = [
  { id: 443, event_name: "performance_goal.set",         event_category: "lifecycle"    },
  { id: 444, event_name: "performance_goal.completed",   event_category: "state_change" },
  { id: 445, event_name: "succession_plan.published",    event_category: "state_change" },
  { id: 446, event_name: "talent_calibration.completed", event_category: "state_change" },
  { id: 447, event_name: "nine_box_placement.updated",   event_category: "state_change" },
  { id: 448, event_name: "feedback_record.created",      event_category: "lifecycle"    },
];

let eventsPatched = 0;
let eventsSkipped = 0;
for (const p of eventCategoryPatches) {
  const before = await get(`/trigger_events?id=eq.${p.id}&select=id,event_name,event_category`);
  if (before.length === 0) {
    console.log(`  event ${p.id} NOT FOUND, skipping`);
    continue;
  }
  const row = before[0];
  if (row.event_name !== p.event_name) {
    console.log(`  event ${p.id} name mismatch (live="${row.event_name}", expected="${p.event_name}"), skipping`);
    eventsSkipped += 1;
    continue;
  }
  if (row.event_category === p.event_category) {
    console.log(`  event ${p.id} ${p.event_name}: already ${p.event_category}, skipping`);
    eventsSkipped += 1;
    continue;
  }
  console.log(`  event ${p.id} ${p.event_name}: "${row.event_category}" -> "${p.event_category}"`);
  await patch(`/trigger_events?id=eq.${p.id}`, { event_category: p.event_category });
  eventsPatched += 1;
}

// =====================================================================
// Step 2, B1-S6: PATCH target_domain_module_id on 4 inbound handoffs.
// TALENT-MGMT modules: 51 PERFORMANCE-MGMT, 52 SUCCESSION-CAREER, 53 CONTINUOUS-FEEDBACK.
// Audit-specified routing:
//   1108 (PA engagement.declining)        -> 53 CONTINUOUS-FEEDBACK
//   1110 (PA attrition_risk.elevated)     -> 52 SUCCESSION-CAREER
//   1113 (PA predictive_model.deployed)   -> 52 SUCCESSION-CAREER
//   1306 (LMS learner_badge.earned)       -> 52 SUCCESSION-CAREER  (B1-S6b)
// =====================================================================
console.log("\n=== B1-S6: PATCH inbound handoffs target_domain_module_id ===");

const TALENT_DOMAIN_ID = 58;
const targetFkPatches: Array<{ id: number; target_module_id: number; note: string }> = [
  { id: 1108, target_module_id: 53, note: "PA engagement.declining -> TALENT-CONTINUOUS-FEEDBACK"  },
  { id: 1110, target_module_id: 52, note: "PA attrition_risk.elevated -> TALENT-SUCCESSION-CAREER" },
  { id: 1113, target_module_id: 52, note: "PA predictive_model.deployed -> TALENT-SUCCESSION-CAREER" },
  { id: 1306, target_module_id: 52, note: "LMS learner_badge.earned -> TALENT-SUCCESSION-CAREER" },
];

let targetsPatched = 0;
let targetsSkipped = 0;
for (const p of targetFkPatches) {
  const before = await get(`/handoffs?id=eq.${p.id}&select=id,target_domain_id,target_domain_module_id`);
  if (before.length === 0) {
    console.log(`  handoff ${p.id} NOT FOUND, skipping`);
    continue;
  }
  const row = before[0];
  if (row.target_domain_id !== TALENT_DOMAIN_ID) {
    console.log(`  handoff ${p.id} target_domain_id=${row.target_domain_id} != 58 (TALENT-MGMT), skipping`);
    targetsSkipped += 1;
    continue;
  }
  if (row.target_domain_module_id === p.target_module_id) {
    console.log(`  handoff ${p.id}: target already ${p.target_module_id}, skipping`);
    targetsSkipped += 1;
    continue;
  }
  if (row.target_domain_module_id !== null) {
    console.log(`  handoff ${p.id}: target already non-null (${row.target_domain_module_id}), would overwrite to ${p.target_module_id}, skipping (manual review)`);
    targetsSkipped += 1;
    continue;
  }
  console.log(`  handoff ${p.id}: target_domain_module_id NULL -> ${p.target_module_id} (${p.note})`);
  await patch(`/handoffs?id=eq.${p.id}`, { target_domain_module_id: p.target_module_id });
  targetsPatched += 1;
}

// =====================================================================
// Step 3, B1-S7: PATCH source_domain_module_id on handoff 441.
// 441 (high_potential.identified -> HCM workforce_segments) realized in
// TALENT-SUCCESSION-CAREER (module 52). Audit names ID + module.
// =====================================================================
console.log("\n=== B1-S7: PATCH handoff 441 source_domain_module_id ===");

const HANDOFF_441 = 441;
const SOURCE_MODULE_52 = 52;

const before441 = await get(`/handoffs?id=eq.${HANDOFF_441}&select=id,source_domain_id,source_domain_module_id,trigger_event_id`);
let sourcePatched = 0;
if (before441.length === 0) {
  console.log(`  handoff ${HANDOFF_441} NOT FOUND, skipping`);
} else {
  const row = before441[0];
  if (row.source_domain_id !== TALENT_DOMAIN_ID) {
    console.log(`  handoff ${HANDOFF_441}: source_domain_id=${row.source_domain_id} != 58 (TALENT-MGMT), skipping`);
  } else if (row.source_domain_module_id === SOURCE_MODULE_52) {
    console.log(`  handoff ${HANDOFF_441}: source already 52, skipping`);
  } else if (row.source_domain_module_id !== null) {
    console.log(`  handoff ${HANDOFF_441}: source already non-null (${row.source_domain_module_id}), would overwrite to 52, skipping (manual review)`);
  } else {
    console.log(`  handoff ${HANDOFF_441}: source_domain_module_id NULL -> 52 (TALENT-SUCCESSION-CAREER)`);
    await patch(`/handoffs?id=eq.${HANDOFF_441}`, { source_domain_module_id: SOURCE_MODULE_52 });
    sourcePatched = 1;
  }
}

// =====================================================================
// Summary
// =====================================================================
console.log("\n=== Summary ===");
console.log(`B1-S2 event_category PATCH : ${eventsPatched} patched (${eventsSkipped} skipped)`);
console.log(`B1-S6 target FK PATCH      : ${targetsPatched} patched (${targetsSkipped} skipped)`);
console.log(`B1-S7 source FK PATCH      : ${sourcePatched} patched`);
console.log("\nUI spot-check:");
console.log("  https://tests.semantius.app/domain_map/trigger_events");
console.log("  https://tests.semantius.app/domain_map/handoffs");
