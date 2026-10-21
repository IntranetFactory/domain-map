#!/usr/bin/env bun
// LOYALTY audit (2026-05-30) - B1 technical fixes that do not require user judgment.
//
// Scope: pure-mechanical inserts derivable from audit pre-specified tuples.
//
// What this loads:
//   - 2 `handoff_processes` rows tagging cross-domain handoffs with their APQC PCF
//     activity, where the audit pre-specifies (handoff_id, process_id) AND no row
//     currently exists for that handoff (no collision, no replacement).
//
// What this DEFERS (out of scope per B1-technical license):
//   - B1-S1 .. B1-S11: module split + downstream cascade (gated on Bucket 2 item 1
//     user pick).
//   - B1-M1 .. B1-M5: new entities (data_subject_requests, gdpr_consent_records,
//     promotion_campaigns, etc.) - DEFER per "new entities" exclusion.
//   - APQC handoff_processes for handoffs 324 + 498: existing rows already point at
//     PCF 18924 (parent cluster). Audit proposal of 18925 / 18927 (child PCFs)
//     would replace or co-exist; that is a judgment call, not a mechanical fix.
//   - Existing `discovery_substring` rows on handoffs 232, 478, 505 (record_status
//     flip to approved is forbidden per Rule #1).
//   - B1-S5 aliases: audit provides candidate forms ("2 to 3 alias rows per master")
//     but does NOT pre-specify exact tuples.
//   - B1-S6 intra-domain `data_object_relationships`: out of B1-technical scope
//     (only `users` edges are in scope, and B1-S7 lists actor labels but no
//     verb / inverse_verb / cardinality tuples).
//   - B1-S7 user-edges: audit names actor labels (account_manager,
//     config_author, etc.) but no verb / inverse_verb / cardinality / owner_side;
//     not pre-specified tuples.
//   - B1-S10 catalog_tagline / catalog_description: Rule #20 forbids load without
//     surface to user.
//
// Rule #1: record_status omitted; defaults to 'new'.
// Rule #15: notes left empty / unset.

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

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

// ============================================================
// handoff_processes - audit-pre-specified (handoff_id, process_id) pairs
// where no existing row collides.
// ============================================================
//
// Audit B1 APQC TAGGING table, rows whose handoff_id has no current
// handoff_processes row (verified pre-flight). Source: audits/LOYALTY.md
// section "Bucket 1 - APQC TAGGING (H1)".
//
//   handoff 231 - LOYALTY -> CRM, tier.upgraded                -> PCF 642 (18926, "Build engagement and relationship with members")
//   handoff 497 - LOYALTY -> ERP-FIN, loyalty_transaction.posted -> PCF 643 (16633, "Monitor customer loyalty program benefits to the enterprise and the customer")
//
// (handoffs 324 + 498 deferred - existing rows on those handoffs point at
// PCF 132 / 18924 parent cluster, replacement / coexistence is judgment.)

const handoffProcessProposals: Array<{
  handoff_id: number;
  process_id: number;
  proposal_source: "agent_curated";
}> = [
  { handoff_id: 231, process_id: 642, proposal_source: "agent_curated" },
  { handoff_id: 497, process_id: 643, proposal_source: "agent_curated" },
];

async function main() {
  console.log("LOYALTY B1 technical-fix pass (2026-05-31)");
  console.log("==========================================");

  // Pre-flight: verify handoffs + processes still exist and there is no
  // existing handoff_processes row for either target handoff (idempotency
  // + collision safety).
  console.log("\nPre-flight verifications:");

  const handoffIds = handoffProcessProposals.map(r => r.handoff_id);
  const processIds = handoffProcessProposals.map(r => r.process_id);

  const handoffs = await get(
    `/handoffs?id=in.(${handoffIds.join(",")})&select=id,trigger_event:trigger_events(event_name)`
  );
  if (handoffs.length !== handoffIds.length) {
    throw new Error(`Pre-flight FAIL: expected ${handoffIds.length} handoffs, got ${handoffs.length}`);
  }
  console.log(`  handoffs: ${handoffs.length}/${handoffIds.length} resolvable`);

  const processes = await get(
    `/processes?id=in.(${processIds.join(",")})&select=id,external_id,process_name,source_framework`
  );
  if (processes.length !== processIds.length) {
    throw new Error(`Pre-flight FAIL: expected ${processIds.length} processes, got ${processes.length}`);
  }
  console.log(`  processes: ${processes.length}/${processIds.length} resolvable`);

  const existingHp = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=id,handoff_id,process_id`
  );
  const collisionHandoffIds = new Set(existingHp.map(r => Number(r.handoff_id)));
  const safeProposals = handoffProcessProposals.filter(
    p => !collisionHandoffIds.has(p.handoff_id)
  );
  if (safeProposals.length !== handoffProcessProposals.length) {
    const skipped = handoffProcessProposals.filter(
      p => collisionHandoffIds.has(p.handoff_id)
    );
    console.log(`  WARNING: ${skipped.length} proposal(s) skipped due to existing handoff_processes rows:`);
    for (const s of skipped) {
      console.log(`    handoff_id=${s.handoff_id} -> process_id=${s.process_id} (collision)`);
    }
  } else {
    console.log(`  collision check: clean, ${safeProposals.length}/${handoffProcessProposals.length} ready to insert`);
  }

  if (safeProposals.length === 0) {
    console.log("\nNo proposals safe to insert. Exiting.");
    return;
  }

  console.log("\nInserting handoff_processes rows:");
  for (const p of safeProposals) {
    const h = handoffs.find(x => Number(x.id) === p.handoff_id);
    const pc = processes.find(x => Number(x.id) === p.process_id);
    const eventName = (h?.trigger_event as Row | undefined)?.event_name ?? "?";
    console.log(`  handoff ${p.handoff_id} (${eventName}) -> process ${p.process_id} / ${pc?.external_id} (${pc?.process_name})`);
  }

  const inserted = await insert("/handoff_processes", safeProposals);
  console.log(`\nInserted ${inserted.length} handoff_processes row(s).`);

  // Post-load verification.
  const after = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=id,handoff_id,process_id,record_status,proposal_source,process:processes(external_id,process_name)&order=handoff_id.asc`
  );
  console.log("\nPost-load state for affected handoffs:");
  for (const row of after) {
    const proc = row.process as Row | undefined;
    console.log(`  hp.id=${row.id} handoff=${row.handoff_id} process=${row.process_id} (${proc?.external_id} ${proc?.process_name}) status=${row.record_status} source=${row.proposal_source}`);
  }

  console.log("\nDone.");
  console.log("UI: https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
