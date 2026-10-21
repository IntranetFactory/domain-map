#!/usr/bin/env bun
// Technical B1 fixes for AGENCY-MGMT, per audits/AGENCY-MGMT.md (2026-05-30 Validate b1).
//
// Scope of this loader (only items the audit pre-specifies as enum-resolved or
// PCF-resolved with a single confident value; everything gated on Phase M is
// deferred to the user):
//
//   B1-S2  PATCH event_category on 6 trigger_events (525, 526, 527, 528, 529, 530)
//   B1-H1  INSERT 4 handoff_processes rows where the audit gives a single
//          confident PCF id (handoffs 344, 345, 347, 515).
//
// Deferred (require user input or are gated on B1-S1 module split):
//   B1-S1 / S3 / S4 / S5 / S7 (gated on M1 + B2-S1 module split)
//   B1-S6  (pattern flags depend on B2-S3 per-flag approval)
//   B1-H1 partial: 513, 516 (two PCF options each), 514 (needs lookup),
//          341 (medium confidence with alternative), 346 (medium, two options),
//          348 (REPLACE recommended, needs lookup).

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
// B1-S2: event_category PATCH for 6 trigger_events
// ============================================================

const eventCategoryFixes: Array<{ id: number; event_category: string }> = [
  { id: 525, event_category: "state_change" }, // agency_time_entry.submitted
  { id: 526, event_category: "threshold" },    // agency_retainer.threshold_reached
  { id: 527, event_category: "threshold" },    // agency_retainer.depleted
  { id: 528, event_category: "state_change" }, // media_plan.approved
  { id: 529, event_category: "state_change" }, // media_plan.executed
  { id: 530, event_category: "state_change" }, // creative_brief.approved
];

console.log(`\n=== B1-S2: PATCH event_category on ${eventCategoryFixes.length} trigger_events ===`);
for (const fix of eventCategoryFixes) {
  await call({
    method: "PATCH",
    path: `/trigger_events?id=eq.${fix.id}`,
    body: { event_category: fix.event_category },
  });
  console.log(`  PATCHed trigger_event ${fix.id} -> event_category='${fix.event_category}'`);
}

// Verify
const verifyEvents = await get(
  `/trigger_events?id=in.(525,526,527,528,529,530)&select=id,event_name,event_category&order=id.asc`,
);
const stillEmpty = verifyEvents.filter(r => !r.event_category);
if (stillEmpty.length > 0) {
  throw new Error(`B1-S2 verification failed: ${stillEmpty.length} events still empty: ${JSON.stringify(stillEmpty)}`);
}
console.log(`  verified: all 6 trigger_events carry non-empty event_category`);

// ============================================================
// B1-H1: INSERT handoff_processes for 4 confident-single-PCF handoffs
// ============================================================
//
// Per audit table:
//   344 (AGENCY-MGMT -> DAM, deliverable.approved) -> 141 "Manage product marketing material" (confident L3)
//   345 (AGENCY-MGMT -> ERP-FIN, agency_invoice.issued) -> 302 "Invoice customer" (confident L3)
//   347 (S2P -> AGENCY-MGMT, vendor_invoice.received) -> 1433 "Audit invoices and key data in AP system" (confident L4)
//   515 (AGENCY-MGMT -> PSA, creative_brief.approved) -> 1661 "Develop project plans" (confident L4)
//
// Existing 342, 343, 348 already have rows; KEEP per audit (348 REPLACE deferred to user).

const handoffProcessProposals: Array<{ handoff_id: number; process_id: number }> = [
  { handoff_id: 344, process_id: 141 },
  { handoff_id: 345, process_id: 302 },
  { handoff_id: 347, process_id: 1433 },
  { handoff_id: 515, process_id: 1661 },
];

console.log(`\n=== B1-H1: INSERT handoff_processes for ${handoffProcessProposals.length} handoffs ===`);

// Pre-flight: confirm none already exists (idempotent guard).
const existing = await get(
  `/handoff_processes?handoff_id=in.(344,345,347,515)&select=id,handoff_id,process_id`,
);
const existingKeys = new Set(existing.map(r => `${r.handoff_id}|${r.process_id}`));
const toInsert = handoffProcessProposals
  .filter(p => !existingKeys.has(`${p.handoff_id}|${p.process_id}`))
  .map(p => ({
    handoff_id: p.handoff_id,
    process_id: p.process_id,
    proposal_source: "agent_curated",
    // role defaults to 'implements'; record_status defaults to 'new'; notes stays empty.
  }));

if (toInsert.length === 0) {
  console.log(`  all ${handoffProcessProposals.length} handoff_processes rows already present, nothing to insert`);
} else {
  console.log(`  inserting ${toInsert.length} handoff_processes rows (${existing.length} pre-existing on those handoffs)`);
  await call({ method: "POST", path: "/handoff_processes", body: toInsert });
}

// Verify
const verifyHP = await get(
  `/handoff_processes?handoff_id=in.(344,345,347,515)&select=id,handoff_id,process_id,proposal_source,record_status&order=handoff_id.asc`,
);
const verifyKeys = new Set(verifyHP.map(r => `${r.handoff_id}|${r.process_id}`));
const missing = handoffProcessProposals.filter(p => !verifyKeys.has(`${p.handoff_id}|${p.process_id}`));
if (missing.length > 0) {
  throw new Error(`B1-H1 verification failed: missing rows ${JSON.stringify(missing)}`);
}
console.log(`  verified: ${verifyHP.length} handoff_processes rows present for handoffs 344, 345, 347, 515`);

// ============================================================
// Summary
// ============================================================

console.log(`\n=== Summary ===`);
console.log(`  B1-S2: ${eventCategoryFixes.length} trigger_events patched (event_category backfill).`);
console.log(`  B1-H1: ${toInsert.length} handoff_processes inserted (${existing.length} pre-existing skipped).`);
console.log(`\nUI links for spot-check:`);
console.log(`  https://tests.semantius.app/domain_map/trigger_events`);
console.log(`  https://tests.semantius.app/domain_map/handoff_processes`);
