#!/usr/bin/env bun
//
// PIM B1 technical fixes (audit 2026-05-30, continuation 2026-05-31).
//
// Only one B1 item is purely technical and ungated:
//   B1-H1: APQC tagging for cross-domain PIM handoffs.
//
// The audit lists 7 candidate handoffs (1234, 1235, 1236, 1237, 1241, 1242, 1243)
// with proposed `processes.id` tags (115, 113, 37). All 3 process IDs verified
// to exist in /processes as apqc_pcf_cross_industry rows.
//
// Pre-flight read against /handoff_processes shows 4 rows already exist:
//   1235 -> process 854 ("Track product availability", L4)
//   1241 -> process 418 ("Implement change", L3)
//   1242 -> process 1845 ("Design and manage product data, design, BOM", L5)
//   1243 -> process 369 ("Manage regulatory compliance", L3)
// Unique key is (handoff_id, process_id), so additional tags on the same
// handoff with a different process_id are valid additional rows, not duplicates.
//
// Per the audit, the proposed L2 PCF 37 for handoff 1243 carries the explicit
// qualifier "medium L2 (a more-specific L3 may exist; surface for fix-time
// verification)". Live state already carries a more-specific L3 tag (process
// 369 "Manage regulatory compliance"). Per the audit's own qualifier this row
// is deferred at fix time: a less-specific L2 tag would not add information.
//
// Net plan: 6 INSERTs (1234, 1235, 1236, 1237, 1241, 1242). 1 deferred (1243).
//
// All rows ship with proposal_source='agent_curated' per Rule #1; record_status
// omitted so the DB default 'new' fires (Rule #1, never stamp 'approved').
// notes omitted (Rule #15).

import { spawn } from "bun";

async function call(body: any): Promise<any> {
  const p = spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  p.stdin.write(JSON.stringify(body));
  p.stdin.end();
  const stdout = await new Response(p.stdout).text();
  const exit = await p.exited;
  if (exit !== 0) {
    const stderr = await new Response(p.stderr).text();
    throw new Error(`${body.method} ${body.path} failed (${exit}): ${stderr}`);
  }
  return JSON.parse(stdout);
}
const get = (path: string) => call({ method: "GET", path });
const post = (path: string, body: any) => call({ method: "POST", path, body });

console.log("=== PIM B1-H1: APQC tagging for 6 cross-domain handoffs ===\n");

type Spec = {
  handoff_id: number;
  process_id: number;
  why: string;
};

// 6 inserts; 1243 deliberately omitted (see header comment).
const specs: Spec[] = [
  { handoff_id: 1234, process_id: 115, why: "Manage product and service master data (L3 11740) for pim_product.published -> commerce_products" },
  { handoff_id: 1235, process_id: 115, why: "Manage product and service master data (L3 11740) for pim_product.published -> inv_stock_items (additional to existing L4 854)" },
  { handoff_id: 1236, process_id: 115, why: "Manage product and service master data (L3 11740) for pim_product.published -> product_configurations" },
  { handoff_id: 1237, process_id: 113, why: "Manage product and service life cycle (L3 10067) for pim_product.discontinued -> commerce_products" },
  { handoff_id: 1241, process_id: 115, why: "Manage product and service master data (L3 11740) for engineering_change_order.released -> pim_products (additional to existing L3 418 Implement change)" },
  { handoff_id: 1242, process_id: 113, why: "Manage product and service life cycle (L3 10067) for engineering_part.released -> pim_products (additional to existing L5 1845)" },
];

const allHandoffIds = specs.map(s => s.handoff_id);
const allProcessIds = Array.from(new Set(specs.map(s => s.process_id)));

// Pre-flight: handoffs exist, processes exist, no duplicate (handoff_id, process_id) tuples.
const [handoffs, processes, existingHP] = await Promise.all([
  get(`/handoffs?id=in.(${allHandoffIds.join(",")})&select=id`),
  get(`/processes?id=in.(${allProcessIds.join(",")})&select=id,process_name,external_id,source_framework,hierarchy_level`),
  get(`/handoff_processes?handoff_id=in.(${allHandoffIds.join(",")})&select=handoff_id,process_id,proposal_source,record_status,id`),
]);

console.log(`Verified ${handoffs.length} of ${allHandoffIds.length} target handoffs exist`);
console.log(`Verified ${processes.length} of ${allProcessIds.length} proposed PCF process_ids exist`);
for (const proc of processes) {
  console.log(`  process ${proc.id}: ${proc.process_name} (L${proc.hierarchy_level}, external_id ${proc.external_id}, ${proc.source_framework})`);
}
if (handoffs.length !== allHandoffIds.length) throw new Error("Some handoff IDs not found, aborting");
if (processes.length !== allProcessIds.length) throw new Error("Some process IDs not found, aborting");

const existingPairs = new Set(existingHP.map((r: any) => `${r.handoff_id}:${r.process_id}`));
console.log(`\n${existingHP.length} existing handoff_processes rows on those handoffs:`);
for (const r of existingHP) console.log(`  (h=${r.handoff_id}, p=${r.process_id}) ${r.proposal_source}/${r.record_status}`);

const toInsert: any[] = [];
const skipped: string[] = [];
for (const spec of specs) {
  const key = `${spec.handoff_id}:${spec.process_id}`;
  if (existingPairs.has(key)) {
    console.log(`\n  ! ${spec.handoff_id}+${spec.process_id}: pair already exists, skip`);
    skipped.push(key);
    continue;
  }
  toInsert.push({
    handoff_id: spec.handoff_id,
    process_id: spec.process_id,
    proposal_source: "agent_curated",
    // record_status omitted: DB default 'new' per Rule #1.
    // notes omitted: Rule #15.
  });
  console.log(`\n  + ${spec.handoff_id} -> process ${spec.process_id}: ${spec.why}`);
}

if (toInsert.length === 0) {
  console.log("\nNothing to insert (all pairs already exist).");
} else {
  console.log(`\nInserting ${toInsert.length} handoff_processes rows...`);
  const inserted = await post("/handoff_processes", toInsert);
  console.log(`  ${inserted.length} inserted`);
}

// Post-state check.
console.log("\n=== Post-state for PIM-tagged handoffs ===");
const finalHP = await get(`/handoff_processes?handoff_id=in.(${allHandoffIds.join(",")})&select=handoff_id,process_id,proposal_source,record_status,process:processes(process_name,external_id,hierarchy_level)&order=handoff_id.asc`);
const byHandoff = new Map<number, any[]>();
for (const r of finalHP) {
  const arr = byHandoff.get(r.handoff_id) ?? [];
  arr.push(r);
  byHandoff.set(r.handoff_id, arr);
}
for (const id of allHandoffIds) {
  const rows = byHandoff.get(id) ?? [];
  console.log(`\n  handoff ${id}: ${rows.length} tag(s)`);
  for (const r of rows) {
    console.log(`    -> process ${r.process_id} (${r.process?.process_name}, L${r.process?.hierarchy_level}, ${r.process?.external_id}) ${r.proposal_source}/${r.record_status}`);
  }
}

// Coverage summary across the 7 cross-domain PIM handoffs.
const allPimCrossDomain = [1234, 1235, 1236, 1237, 1241, 1242, 1243];
const allCoverageHP = await get(`/handoff_processes?handoff_id=in.(${allPimCrossDomain.join(",")})&select=handoff_id`);
const coveredHandoffs = new Set(allCoverageHP.map((r: any) => r.handoff_id));
console.log(`\n=== Coverage across all 7 PIM cross-domain handoffs ===`);
console.log(`${coveredHandoffs.size} of ${allPimCrossDomain.length} have at least one handoff_processes tag`);
for (const id of allPimCrossDomain) {
  console.log(`  ${id}: ${coveredHandoffs.has(id) ? "tagged" : "UNTAGGED"}`);
}

console.log("\n=== PIM B1 technical fixes complete ===");
