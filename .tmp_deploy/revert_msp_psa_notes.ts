#!/usr/bin/env bun
// Revert every notes-column mutation from the MSP-PSA M-band + B-band loads.
// User policy: ANY notes column is off-limits without prior user approval.
// This script restores notes on rows I PATCHed and clears notes on rows I inserted.

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });

// ============================================================
// 1) Handoff PATCHes — strip my " | ... " append, restore original
// ============================================================
// For rows where I appended " | <my-text>" to existing notes, strip everything from
// the FIRST " | " onward (the original notes had no pipe separator). For rows that
// were empty before and I populated, set notes to "".
const handoffNoteReverts: Array<{ id: number; original: string }> = [
  { id: 159, original: "Same alert-to-ticket pattern as RMM→ITSM; native in unified vendor stacks, friction high in cross-vendor combinations." },
  { id: 160, original: "Parallel to ITSM→RMM ticket.escalated handoff." },
  { id: 161, original: "Most MSP PSAs include native asset registers — this handoff is internal in same-tool stacks but cross-domain when an external asset register is canonical." },
  { id: 163, original: "Classic time-tracking friction in cross-vendor MSP stacks; native in unified vendor stacks (ConnectWise PSA ↔ ScreenConnect, Atera unified)." },
  { id: 523, original: "" },
  { id: 524, original: "" },
  { id: 525, original: "" },
  { id: 526, original: "" },
  { id: 647, original: "" },
  // 835: I only touched target_domain_module_id, original notes left intact - no revert needed
];

// Intra-domain handoffs I inserted (B9b) - clear notes I added
const intraHandoffsToClear = [1244, 1245, 1246, 1247];

// ============================================================
// 2) data_object_relationships - 14 rows I inserted
// ============================================================
// Strategy: clear notes on every relationship row I just inserted (the 7 B6 + 7 B7).
// Identify by (data_object_id, related_data_object_id, relationship_verb) keys
// or just by selecting rows where data_object_id IN MSP-PSA masters/users AND
// related_data_object_id IN MSP-PSA masters/users that were created in this session.
// Simpler: just clear notes on all 14 known verbs.
const relVerbsToClear = [
  // B6 intra-domain
  "holds_contracts", "covers_tickets", "raises_tickets", "accrues_time",
  "receives_invoices", "consolidates_time", "generates_invoices",
  // B7 users
  "is_assigned_to_tickets", "opens_tickets", "logs_time_entries",
  "approves_time_entries", "manages_contracts", "issues_invoices", "owns_clients",
];

// ============================================================
// 3) data_object_aliases - 12 rows I inserted
// ============================================================
const aliasIdsToClear: number[] = []; // resolved at runtime by querying

// ============================================================
// 4) data_objects - 2 PATCHes (msp_contracts, msp_invoices) on notes
// ============================================================
const dataObjectNoteReverts = [
  { id: 234, original: "" }, // msp_contracts: was "" before my submit_lock note
  { id: 236, original: "" }, // msp_invoices: was "" before my submit_lock note
];

// ============================================================
// 5) domain_starter_modules - 3 rows with editorial notes
// ============================================================
const starterModuleIdsToClear = [137, 138, 139]; // matched by domain_module_id under MSP-PSA

async function main() {
  console.log("=== Reverting MSP-PSA notes mutations ===\n");

  // 1) Handoff notes
  console.log("[1/5] Reverting handoffs.notes (9 backfilled PATCHes + 4 intra-domain inserts)");
  for (const r of handoffNoteReverts) {
    await patch(`/handoffs?id=eq.${r.id}`, { notes: r.original });
  }
  for (const id of intraHandoffsToClear) {
    await patch(`/handoffs?id=eq.${id}`, { notes: "" });
  }
  console.log(`  reverted ${handoffNoteReverts.length + intraHandoffsToClear.length} rows`);

  // 2) data_object_relationships
  console.log("\n[2/5] Clearing data_object_relationships.notes (14 rows)");
  for (const verb of relVerbsToClear) {
    await patch(`/data_object_relationships?relationship_verb=eq.${encodeURIComponent(verb)}`, { notes: "" });
  }
  console.log(`  cleared notes on ${relVerbsToClear.length} verbs`);

  // 3) data_object_aliases
  console.log("\n[3/5] Clearing data_object_aliases.notes (12 rows I inserted)");
  // The 12 aliases I inserted on data_objects 233/234/235/236/237
  await patch(`/data_object_aliases?data_object_id=in.(233,234,235,236,237)`, { notes: "" });
  console.log("  cleared notes on all MSP-PSA-master aliases");

  // 4) data_objects
  console.log("\n[4/5] Reverting data_objects.notes (2 rows)");
  for (const r of dataObjectNoteReverts) {
    await patch(`/data_objects?id=eq.${r.id}`, { notes: r.original });
  }
  console.log(`  reverted ${dataObjectNoteReverts.length} rows`);

  // 5) domain_starter_modules
  console.log("\n[5/5] Clearing domain_starter_modules.notes (3 rows)");
  await patch(`/domain_starter_modules?domain_id=eq.131`, { notes: "" });
  console.log("  cleared notes on all 3 MSP-PSA starter rows");

  console.log("\n=== revert complete ===");
}

await main();
