#!/usr/bin/env bun
//
// AUDIT (Audit Management) B1 technical residual fixes, 2026-05-31.
//
// Scope: only truly-technical fixes that the audit pre-specifies row-by-row
// with no judgment. Everything else (module count decision, naming renames,
// pattern flags, catalog_tagline / catalog_description drafts, lifecycle
// states, role authoring, new entities, regulation inserts that require a
// new `regulations` row first, the self-loop DELETE on data_object_relationships
// row 356, and the B10b backfill blocked by zero AUDIT modules) is DEFERRED
// to user judgment.
//
// Applied here: INSERT 13 `handoff_processes` rows from the B1-H1 agent-curated
// proposal table. Handoffs 914 and 1029 are SKIPPED because they already carry
// an agent_curated tag pointing at a different process_id (judgment call to
// overwrite, not a technical fix). The remaining 13 rows have no existing
// handoff_processes row at all, so the inserts are pure additions.
//
// All rows ship `record_status='new'` per Rule #1 (omit the column, let DB
// default fire).

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
const get  = (path: string) => call({ method: "GET",  path });
const post = (path: string, body: any) => call({ method: "POST", path, body });

console.log("=== AUDIT B1 technical residual fixes (2026-05-31) ===\n");

type Spec = { handoff_id: number; process_id: number; note: string };

// Per AUDIT.md, Bucket 1, H1, agent-curated proposals table.
// Handoffs 914 and 1029 are intentionally omitted: they already carry an
// agent_curated row with a different process_id; overwriting that is a
// judgment call surfaced to the user, not a technical fix.
const specs: Spec[] = [
  { handoff_id: 255,  process_id: 1496, note: "AUDIT -> GRC follow_up_action.closed / Remediate control deficiencies" },
  { handoff_id: 257,  process_id: 389,  note: "AUDIT -> ITSM audit_engagement.completed / Report audit findings" },
  { handoff_id: 592,  process_id: 61,   note: "AUDIT -> GRC control_test.deficient / Manage internal controls" },
  { handoff_id: 593,  process_id: 325,  note: "AUDIT -> ERP-FIN control_test.deficient / Operate controls and monitor compliance" },
  { handoff_id: 594,  process_id: 1598, note: "AUDIT -> GRC audit_plan.approved / Manage internal audits" },
  { handoff_id: 595,  process_id: 1187, note: "AUDIT -> ERP-FIN work_paper.signed_off / Support external audits and reports" },
  { handoff_id: 247,  process_id: 326,  note: "GRC -> AUDIT audit_issue.created / Report on internal controls compliance" },
  { handoff_id: 539,  process_id: 1433, note: "ERP-FIN -> AUDIT fixed_asset.disposed / Audit invoices and key data in AP system" },
  { handoff_id: 544,  process_id: 1433, note: "AP-AUTO -> AUDIT invoice_match.manual_override / Audit invoices and key data in AP system" },
  { handoff_id: 554,  process_id: 1433, note: "EXPENSE -> AUDIT expense_line.policy_violation / Audit invoices and key data in AP system" },
  { handoff_id: 550,  process_id: 367,  note: "SUP-LIFE -> AUDIT supplier_risk_assessment.completed / Manage business unit and function risk" },
  { handoff_id: 558,  process_id: 1433, note: "SPEND-MGMT -> AUDIT card_authorization.high_value / Audit invoices and key data in AP system" },
  { handoff_id: 920,  process_id: 1616, note: "LEGAL-PRACT-MGMT -> AUDIT court_filing.served / Respond to audit inquiries" },
];

console.log(`Candidate inserts: ${specs.length} agent_curated handoff_processes rows`);
console.log(`(handoffs 914 and 1029 deferred: existing agent_curated row with different process_id)\n`);

const allHandoffIds = specs.map(s => s.handoff_id);
const allProcessIds = [...new Set(specs.map(s => s.process_id))];

// Pre-flight: verify every handoff_id exists and every process_id resolves
// to an APQC PCF row before any write.
const [handoffs, processes, existingHP] = await Promise.all([
  get(`/handoffs?id=in.(${allHandoffIds.join(",")})&select=id`),
  get(`/processes?id=in.(${allProcessIds.join(",")})&select=id,process_name,source_framework`),
  get(`/handoff_processes?handoff_id=in.(${allHandoffIds.join(",")})&select=id,handoff_id,process_id,proposal_source,record_status`),
]);

console.log(`Pre-flight:`);
console.log(`  ${handoffs.length} / ${allHandoffIds.length} target handoffs exist`);
console.log(`  ${processes.length} / ${allProcessIds.length} target processes resolve`);
console.log(`  ${existingHP.length} pre-existing handoff_processes rows on those handoffs\n`);

const missingHandoffs = allHandoffIds.filter(id => !handoffs.find((h: any) => h.id === id));
if (missingHandoffs.length > 0) {
  console.log(`  !! Missing handoffs, aborting: ${missingHandoffs.join(", ")}`);
  process.exit(1);
}
const missingProcs = allProcessIds.filter(id => !processes.find((p: any) => p.id === id));
if (missingProcs.length > 0) {
  console.log(`  !! Missing processes, aborting: ${missingProcs.join(", ")}`);
  process.exit(1);
}
const nonPcf = processes.filter((p: any) => p.source_framework !== "apqc_pcf_cross_industry");
if (nonPcf.length > 0) {
  console.log(`  !! Non-PCF processes referenced, aborting: ${nonPcf.map((p: any) => p.id).join(", ")}`);
  process.exit(1);
}

const existingByHandoff = new Map<number, any>(existingHP.map((r: any) => [r.handoff_id, r]));

const toInsert: any[] = [];
const skipped: string[] = [];

for (const spec of specs) {
  if (existingByHandoff.has(spec.handoff_id)) {
    const ex = existingByHandoff.get(spec.handoff_id);
    skipped.push(`  ! ${spec.handoff_id}: existing row id=${ex.id} proc=${ex.process_id} source=${ex.proposal_source}, skip`);
    continue;
  }
  toInsert.push({
    handoff_id: spec.handoff_id,
    process_id: spec.process_id,
    proposal_source: "agent_curated",
    // record_status omitted, DB default 'new' fires per Rule #1
  });
  console.log(`  + ${spec.handoff_id} -> process ${spec.process_id}  (${spec.note})`);
}

if (skipped.length > 0) {
  console.log(`\nSkipped (pre-existing rows):`);
  for (const line of skipped) console.log(line);
}

if (toInsert.length === 0) {
  console.log(`\nNothing to insert. Exiting.`);
  process.exit(0);
}

console.log(`\nInserting ${toInsert.length} new handoff_processes rows...`);
const inserted = await post("/handoff_processes", toInsert);
console.log(`  ${inserted.length} inserted`);

// Post-state verification
console.log("\n=== Post-state ===");
const finalHP = await get(`/handoff_processes?handoff_id=in.(${allHandoffIds.join(",")})&select=handoff_id,process_id,proposal_source,record_status,process:processes(process_name,external_id)&order=handoff_id.asc`);
const byHandoff = new Map<number, any[]>();
for (const r of finalHP) {
  const arr = byHandoff.get(r.handoff_id) ?? [];
  arr.push(r);
  byHandoff.set(r.handoff_id, arr);
}
let tagged = 0;
for (const id of allHandoffIds) {
  if (byHandoff.has(id)) tagged++;
}
console.log(`${tagged} / ${allHandoffIds.length} target handoffs now have at least one handoff_processes row`);

const proposalSourceCounts = new Map<string, number>();
const statusCounts = new Map<string, number>();
for (const r of finalHP) {
  proposalSourceCounts.set(r.proposal_source, (proposalSourceCounts.get(r.proposal_source) ?? 0) + 1);
  statusCounts.set(r.record_status, (statusCounts.get(r.record_status) ?? 0) + 1);
}
console.log("Proposal source distribution:");
for (const [s, n] of proposalSourceCounts) console.log(`  ${s}: ${n}`);
console.log("Record status distribution:");
for (const [s, n] of statusCounts) console.log(`  ${s}: ${n}`);

console.log("\n=== AUDIT B1 technical residual fixes complete ===");
