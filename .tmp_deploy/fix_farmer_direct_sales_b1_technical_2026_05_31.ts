#!/usr/bin/env bun
// FARMER-DIRECT-SALES B1 technical fixes (2026-05-31, residual pass).
//
// Applies the agent-fixable, fully-specified residual B1 items from
// audits/FARMER-DIRECT-SALES.md that are NOT in any prior fixes-applied
// table (none exist yet for this domain).
//
//   - B1-S3 (Rule #15 notes revert): PATCH 5 data_objects.notes to ''
//                                    (IDs 514, 516, 517, 520, 521).
//                                    Audit names exact IDs; Rule #15 default
//                                    is revert.
//   - B1-H1 (APQC handoff_processes): INSERT 8 high-confidence rows where
//                                    PCF lookup unambiguously resolved.
//                                    Handoff 350 already tagged; 365/962/964
//                                    deferred (gated on B2-S5 CRM target);
//                                    963 deferred (PCF candidate "16448"
//                                    resolves to unrelated risk-management
//                                    PCF, no clean alternative).
//
// Deferred (require user judgment, gated on Bucket 2, or vague PCF):
//   B1-S1, B1-S2, B1-S6 (B10b NULLs owed by ERP-FIN/FOOD-TRACE/FMIS audits;
//                        not derivable from FDS-side modules)
//   B1-S4 (skill_tools.notes revert; audit gives "approx 12-15 rows", no
//          exact IDs pre-specified, per prompt criterion)
//   B1-S5 (missing CRM purchase-intent handoff; gated on B2-S4)
//   B1-H1 partial: 365, 962, 964 (gated on B2-S5); 963 (PCF unresolvable);
//                  350 (already tagged with process 171)
//
// Idempotent: pre-flights every write.

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

async function insertMany(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  return call({ method: "POST", path, body: rows });
}

// ============================================================
// B1-S3: Rule #15 revert of data_objects.notes on 5 FDS masters
// ============================================================
// Audit pre-specifies IDs and content; Rule #15 forbids the patterns
// (pattern-flag context, channel justification, workflow narration).
// Rule #15 default is revert when row IDs are named.
const notesRevertIds: number[] = [514, 516, 517, 520, 521];

async function applyB1S3() {
  console.log(`\n[B1-S3] Reverting data_objects.notes to '' on ${notesRevertIds.length} FDS masters`);
  const existing = await get(
    `/data_objects?id=in.(${notesRevertIds.join(",")})&select=id,data_object_name,notes`,
  );
  let patched = 0;
  let skipped = 0;
  for (const row of existing) {
    const id = Number(row.id);
    const notes = String(row.notes ?? "");
    if (notes === "") {
      console.log(`  data_objects[${id}] ${row.data_object_name}: already empty, skipping`);
      skipped++;
      continue;
    }
    await patch(`/data_objects?id=eq.${id}`, { notes: "" });
    console.log(`  data_objects[${id}] ${row.data_object_name}: reverted (was ${notes.length} chars)`);
    patched++;
  }
  console.log(`  patched=${patched}, skipped=${skipped}`);
}

// ============================================================
// B1-H1: APQC handoff_processes tags (high-confidence only)
// ============================================================
// PCF process ids resolved via live /processes lookups (external_id):
//   external_id 10183  -> processes.id 148  (Manage customers and accounts, L3)
//   external_id 10800  -> processes.id 1356 (Receive/Deposit customer payments, L4)
//   external_id 10729  -> processes.id 55   (Perform revenue accounting, L2)
//   external_id 10743  -> processes.id 302  (Invoice customer, L3)
//   external_id 11174  -> processes.id 718  (Manage customer relationships, L4)
const PCF_10183 = 148;   // Manage customers and accounts
const PCF_10800 = 1356;  // Receive/Deposit customer payments
const PCF_10729 = 55;    // Perform revenue accounting
const PCF_10743 = 302;   // Invoice customer
const PCF_11174 = 718;   // Manage customer relationships

const apqcTags: { handoff_id: number; process_id: number; note: string }[] = [
  // FDS outbound
  { handoff_id: 363,  process_id: PCF_10183, note: "FDS-CSA-MGMT -> CRM csa_membership.activated" },
  { handoff_id: 364,  process_id: PCF_10800, note: "FDS-CSA-MGMT -> ERP-FIN csa_subscription.charged" },
  { handoff_id: 960,  process_id: PCF_10729, note: "FDS-MARKET-POS -> ERP-FIN farmers_market_sale.recorded" },
  { handoff_id: 961,  process_id: PCF_10743, note: "FDS-WHOLESALE -> ERP-FIN wholesale_order.confirmed" },
  // CRM inbound
  { handoff_id: 1213, process_id: PCF_11174, note: "CRM -> FDS-CSA-MGMT customer.churn_confirmed" },
  { handoff_id: 1214, process_id: PCF_10183, note: "CRM -> FDS-CSA-MGMT customer.signed_up" },
  { handoff_id: 1215, process_id: PCF_10183, note: "CRM -> FDS-WHOLESALE account.tier_changed" },
  { handoff_id: 1216, process_id: PCF_11174, note: "CRM -> FDS-CSA-MGMT account_health.declined" },
  { handoff_id: 1217, process_id: PCF_11174, note: "CRM -> FDS-CSA-MGMT health_score.declined" },
];

async function applyB1H1() {
  console.log(`\n[B1-H1] Loading APQC handoff_processes (${apqcTags.length} rows)`);
  const handoffIds = apqcTags.map(t => t.handoff_id).join(",");
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds})&select=id,handoff_id,process_id`,
  );
  const existingKeys = new Set(
    existing.map(r => `${r.handoff_id}|${r.process_id}`),
  );
  const toInsert: Row[] = [];
  for (const t of apqcTags) {
    const key = `${t.handoff_id}|${t.process_id}`;
    if (existingKeys.has(key)) {
      console.log(`  handoff_processes (${t.handoff_id}, ${t.process_id}) already present, skipping (${t.note})`);
      continue;
    }
    toInsert.push({
      handoff_id: t.handoff_id,
      process_id: t.process_id,
      proposal_source: "agent_curated",
    });
  }
  if (toInsert.length === 0) {
    console.log("  nothing to insert");
    return;
  }
  console.log(`  inserting ${toInsert.length} handoff_processes rows`);
  await insertMany("/handoff_processes", toInsert);
}

// ============================================================
// Audit summary
// ============================================================
async function summary() {
  console.log("\n[Post-load summary]");
  const dn = await get(
    `/data_objects?id=in.(${notesRevertIds.join(",")})&select=id,data_object_name,notes&order=id.asc`,
  );
  console.log("  data_objects (notes after revert):");
  for (const r of dn) {
    console.log(`    [${r.id}] ${r.data_object_name}: notes='${r.notes}'`);
  }
  const hp = await get(
    `/handoff_processes?handoff_id=in.(${apqcTags.map(t => t.handoff_id).join(",")})&select=id,handoff_id,process_id,proposal_source,record_status&order=handoff_id.asc`,
  );
  console.log(`  handoff_processes loaded: ${hp.length}`);
  for (const r of hp) {
    console.log(`    [${r.id}] handoff=${r.handoff_id} process=${r.process_id} source=${r.proposal_source} status=${r.record_status}`);
  }
}

async function main() {
  await applyB1S3();
  await applyB1H1();
  await summary();
  console.log("\nDone.");
}

await main();
