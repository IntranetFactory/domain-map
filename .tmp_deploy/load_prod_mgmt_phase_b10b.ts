#!/usr/bin/env bun
// Phase B10b for PROD-MGMT: backfill source/target module FKs on 24 handoffs.
// Steps:
//   1. Add 6 missing `consumer` DMDO rows on PROD-MGMT modules so inbound payloads have a target module.
//   2. PATCH source_domain_module_id on 17 outbound handoffs.
//   3. PATCH target_domain_module_id on 7 inbound handoffs.

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  // Use inline argument form (proven reliable for small bodies on Windows).
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

const DISCOVERY_ID = 130;
const ROADMAP_ID = 131;

// ============================================================
// 1. New consumer DMDO rows
// ============================================================
// Inbound payloads not yet modeled on a PROD-MGMT module
const consumerRows = [
  { domain_module_id: ROADMAP_ID,   data_object_id: 275, role: "consumer", necessity: "optional" }, // roadmap_items (SPM)
  { domain_module_id: ROADMAP_ID,   data_object_id: 678, role: "consumer", necessity: "optional" }, // pull_requests (VSDP)
  { domain_module_id: ROADMAP_ID,   data_object_id: 578, role: "consumer", necessity: "optional" }, // requirements_to_test_traceability (TEST-MGMT)
  { domain_module_id: ROADMAP_ID,   data_object_id: 250, role: "consumer", necessity: "optional" }, // process_simulation_runs (BPA)
  { domain_module_id: ROADMAP_ID,   data_object_id: 246, role: "consumer", necessity: "optional" }, // work_automations (WORK-MGMT)
  { domain_module_id: DISCOVERY_ID, data_object_id: 445, role: "consumer", necessity: "optional" }, // ab_tests (DXP)
];

console.log(`[1/3] consumer DMDO rows for inbound payloads`);
const existingDmdo = await call({ method: "GET", path: `/domain_module_data_objects?domain_module_id=in.(${DISCOVERY_ID},${ROADMAP_ID})&data_object_id=in.(275,678,578,250,246,445)&select=domain_module_id,data_object_id` });
const dmdoKey = (r: Row) => `${r.domain_module_id}|${r.data_object_id}`;
const existingDmdoKeys = new Set(existingDmdo.map(dmdoKey));
const missingConsumer = consumerRows.filter(r => !existingDmdoKeys.has(dmdoKey(r)));
if (missingConsumer.length > 0) {
  console.log(`  inserting ${missingConsumer.length} consumer rows`);
  await call({ method: "POST", path: "/domain_module_data_objects", body: missingConsumer });
} else {
  console.log(`  all present`);
}

// ============================================================
// 2. source_domain_module_id backfill (outbound handoffs)
// ============================================================
// Map: trigger_event.data_object_id (PROD-MGMT master) -> module_id
const SRC_MODULE_BY_DO: Record<number, number> = {
  406: DISCOVERY_ID, // feature_requests
  407: DISCOVERY_ID, // customer_feedback_items
  402: ROADMAP_ID,   // product_lines
  403: ROADMAP_ID,   // product_features
  404: ROADMAP_ID,   // product_releases
  405: ROADMAP_ID,   // product_roadmaps
  408: ROADMAP_ID,   // product_metrics
  409: ROADMAP_ID,   // beta_programs
};

console.log(`\n[2/3] source_domain_module_id backfill (outbound)`);
const outbound = await call({ method: "GET", path: `/handoffs?source_domain_id=eq.101&source_domain_module_id=is.null&select=id,trigger_event_id,trigger_events(data_object_id)` });
let outboundPatched = 0;
for (const h of outbound) {
  const trig = h.trigger_events as Row;
  const triggerDo = Number(trig.data_object_id);
  const moduleId = SRC_MODULE_BY_DO[triggerDo];
  if (!moduleId) {
    console.log(`  SKIP handoff ${h.id}: no PROD-MGMT module masters trigger data_object ${triggerDo}`);
    continue;
  }
  await call({ method: "PATCH", path: `/handoffs?id=eq.${h.id}`, body: { source_domain_module_id: moduleId } });
  outboundPatched++;
}
console.log(`  patched ${outboundPatched}/${outbound.length} outbound rows`);

// ============================================================
// 3. target_domain_module_id backfill (inbound handoffs)
// ============================================================
// Map: handoff.data_object_id (payload) -> PROD-MGMT module that holds the strongest role for it
const TGT_MODULE_BY_DO: Record<number, number> = {
  249: ROADMAP_ID,   // value_streams (contributor)
  275: ROADMAP_ID,   // roadmap_items (consumer)
  678: ROADMAP_ID,   // pull_requests (consumer)
  578: ROADMAP_ID,   // requirements_to_test_traceability (consumer)
  250: ROADMAP_ID,   // process_simulation_runs (consumer)
  246: ROADMAP_ID,   // work_automations (consumer)
  445: DISCOVERY_ID, // ab_tests (consumer)
};

console.log(`\n[3/3] target_domain_module_id backfill (inbound)`);
const inbound = await call({ method: "GET", path: `/handoffs?target_domain_id=eq.101&target_domain_module_id=is.null&select=id,data_object_id` });
let inboundPatched = 0;
for (const h of inbound) {
  const payloadDo = Number(h.data_object_id);
  const moduleId = TGT_MODULE_BY_DO[payloadDo];
  if (!moduleId) {
    console.log(`  SKIP handoff ${h.id}: no PROD-MGMT module holds payload data_object ${payloadDo}`);
    continue;
  }
  await call({ method: "PATCH", path: `/handoffs?id=eq.${h.id}`, body: { target_domain_module_id: moduleId } });
  inboundPatched++;
}
console.log(`  patched ${inboundPatched}/${inbound.length} inbound rows`);

console.log("\nPhase B10b backfill complete.");
