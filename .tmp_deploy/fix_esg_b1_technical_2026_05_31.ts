#!/usr/bin/env bun
// ESG B1 technical fixes (2026-05-31 continuation).
// Audit: audits/ESG.md, 2026-05-30 validate b1.
// Scope: TECHNICAL only per subagent prompt (defer judgment, deferrals, new entities, etc.).
//
// Applies:
//   B1-S1  : PATCH domains.id=21 business_logic to replace em-dash with comma.
//   B1-S9  : PATCH trigger_events.event_category enum backfills for ids 933, 934, 935.
//   B1-S14 : INSERT 7 handoff_processes rows the audit pre-specifies (handoff_id + PCF id),
//            skipping handoff 293 (audit: report-only, REAL-EST owes) and handoff 851
//            (audit: defer to Bucket 2 #5). Pre-flight verified no duplicate keys exist.
//
// Defers everything else (B1-M1..M5, B1-U1..U4, B1-S2..S8, B1-S10..S13, B1-B1) per scope.

import { spawn } from "bun";

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = spawn(["semantius", "call", "crud", "postgrestRequest"], {
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

// ============================================================
// B1-S1: PATCH domains.business_logic - strip em-dash from ESG row.
// Before: "...allocation rules) — regulated and irreducible; ..."
// After : "...allocation rules), regulated and irreducible; ..."
// ============================================================
{
  const newText =
    "Emissions calculation engine (Scope 1/2/3, conversion factors, allocation rules), regulated and irreducible; the data-collection side is workflow.";
  console.log("B1-S1: PATCH domains.id=21.business_logic (em-dash scrub)");
  const result = await call({
    method: "PATCH",
    path: "/domains?id=eq.21",
    body: { business_logic: newText },
    headers: { Prefer: "return=representation" },
  });
  console.log(`  patched ${result.length} row(s)`);
}

// ============================================================
// B1-S9: PATCH trigger_events.event_category enum backfills.
// Audit pre-specifies:
//   933 emission_factor.updated   -> state_change
//   934 activity_data.recorded    -> lifecycle
//   935 esg_initiative.launched   -> lifecycle
// Enum allowed: lifecycle, state_change, threshold, signal (Rule #13).
// ============================================================
const eventCategoryFixes: { id: number; event_category: string }[] = [
  { id: 933, event_category: "state_change" },
  { id: 934, event_category: "lifecycle" },
  { id: 935, event_category: "lifecycle" },
];

for (const fix of eventCategoryFixes) {
  console.log(`B1-S9: PATCH trigger_events.id=${fix.id} -> event_category='${fix.event_category}'`);
  const result = await call({
    method: "PATCH",
    path: `/trigger_events?id=eq.${fix.id}`,
    body: { event_category: fix.event_category },
    headers: { Prefer: "return=representation" },
  });
  console.log(`  patched ${result.length} row(s)`);
}

// ============================================================
// B1-S14: INSERT handoff_processes rows.
// Audit pre-specifies 9 handoff x PCF tuples. Apply 7:
//   275 -> 2016 (Measure sustainability performance)        confident L5
//   276 -> 1802 (Perform sustainability reporting)          confident L4
//   277 -> 815  (Monitor/Manage supplier information)       confident L4
//   278 -> 815  (Monitor/Manage supplier information)       confident L4 (audit notes existing 278->167 stands; this is an additional tag)
//   279 -> 2016 (Measure sustainability performance)        confident L5
//   850 -> 232  (Monitor legal and regulatory environment)  confident L3
//   852 -> 1802 (Perform sustainability reporting)          confident L4
// Skipped:
//   293 -> n/a  (inbound; audit explicitly: report-only, REAL-EST H1 owes)
//   851 -> n/a  (audit explicitly: defer to Bucket 2 #5; existing 851->1802 row was applied prior)
// Pre-flight verified: none of the 7 target keys exist; net-new inserts.
// proposal_source=agent_curated per the b1 audit fix-loop (per the field's own docstring).
// record_status omitted per Rule #1 (defaults to 'new').
// notes omitted per Rule #15 (default empty string).
// ============================================================
const handoffProcessInserts = [
  { handoff_id: 275, process_id: 2016, proposal_source: "agent_curated" },
  { handoff_id: 276, process_id: 1802, proposal_source: "agent_curated" },
  { handoff_id: 277, process_id: 815, proposal_source: "agent_curated" },
  { handoff_id: 278, process_id: 815, proposal_source: "agent_curated" },
  { handoff_id: 279, process_id: 2016, proposal_source: "agent_curated" },
  { handoff_id: 850, process_id: 232, proposal_source: "agent_curated" },
  { handoff_id: 852, process_id: 1802, proposal_source: "agent_curated" },
];

console.log(`B1-S14: INSERT ${handoffProcessInserts.length} handoff_processes rows`);
const inserted = await call({
  method: "POST",
  path: "/handoff_processes",
  body: handoffProcessInserts,
  headers: { Prefer: "return=representation" },
});
console.log(`  inserted ${inserted.length} row(s); ids=${inserted.map(r => r.id).join(",")}`);

console.log("\nESG B1 technical fixes complete.");
