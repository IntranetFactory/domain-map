#!/usr/bin/env bun
// LSD B1 technical fixes (audits/LSD.md, 2026-05-30 audit).
//
// Applies only audit-specified, technical, no-judgment fixes:
//   1. B1-S2: PATCH event_category on the 12 LSD trigger_events.
//      Rubric per audit: "lifecycle (state-transition events) or state_change".
//      Lifecycle = master-lifecycle transition (.submitted, .opened, .closed,
//      .released, .issued, .created, .engaged, .received).
//      state_change = qualifier / sub-state change without master transition
//      (.updated, .regulatory_disclosure_required, .employee_related).
//   2. B1-H1: INSERT 11 agent_curated handoff_processes rows per the audit's
//      pre-specified handoff_id + PCF process_id table (confident L3).
//
// All deferred items (B1-M1, B1-M2, B1-S1, B1-S3, B1-S4, B1-S5, B1-B1, B1-B2,
// and the 3 deferred H1 rows) are NOT touched: they require user judgment or
// are gated on M1 modularization.
//
// Idempotent: re-reads trigger_events and existing handoff_processes before
// writing; skips rows already at the target value.

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

async function post(path: string, body: Row | Row[]): Promise<Row[]> {
  return call({ method: "POST", path, body });
}

// ---------------------------------------------------------------------------
// B1-S2: event_category backfill on 12 LSD trigger_events
// ---------------------------------------------------------------------------
// Each row's classification is derivable from the event_name + the audit's
// rubric, cross-checked against catalog precedent (e.g. case.created,
// demand_intake.submitted, asset.retired all classified as lifecycle).

const eventCategoryByName: Record<string, "lifecycle" | "state_change"> = {
  "legal_intake.submitted": "lifecycle",
  "legal_hold.issued": "lifecycle",
  "legal_hold.released": "lifecycle",
  "ediscovery_request.created": "lifecycle",
  "outside_counsel.engaged": "lifecycle",
  "regulatory_inquiry.received": "lifecycle",
  "legal_case_docket.updated": "state_change",
  "in_house_legal_matter.opened": "lifecycle",
  "in_house_legal_matter.closed": "lifecycle",
  "in_house_legal_matter.regulatory_disclosure_required": "state_change",
  "legal_advice_record.issued": "lifecycle",
  "legal_advice_record.employee_related": "state_change",
};

async function fixEventCategories() {
  const lsdMasterIds = [633, 634, 635, 636, 637, 638, 639, 640];
  const events = await get(
    `/trigger_events?data_object_id=in.(${lsdMasterIds.join(",")})&select=id,event_name,event_category&order=id.asc`
  );
  console.log(`B1-S2: ${events.length} LSD trigger_events fetched`);
  let patched = 0;
  let skipped = 0;
  for (const ev of events) {
    const name = String(ev.event_name);
    const target = eventCategoryByName[name];
    if (!target) {
      console.warn(`  WARN: no classification for ${name} (id ${ev.id}); skipping`);
      continue;
    }
    if (String(ev.event_category) === target) {
      skipped += 1;
      continue;
    }
    await patch(`/trigger_events?id=eq.${ev.id}`, { event_category: target });
    console.log(`  PATCHED trigger_events.id=${ev.id} ${name} -> ${target}`);
    patched += 1;
  }
  console.log(`B1-S2: ${patched} patched, ${skipped} already correct`);
  return { patched, skipped, total: events.length };
}

// ---------------------------------------------------------------------------
// B1-H1: 11 agent_curated handoff_processes (audit Pre-specified)
// ---------------------------------------------------------------------------
// process_id verified live before this script ran (369, 373, 396, 397 all
// resolve as APQC PCF cross-industry L3 rows). Defaults rely on the schema:
//   - role: 'implements' (default)
//   - record_status: 'new' (default, per Rule #1)
//   - notes: '' (default, per Rule #15)

const handoffProcessRows: Array<{ handoff_id: number; process_id: number }> = [
  { handoff_id: 911, process_id: 373 },  // LSD->ECM legal_hold.issued        -> Investigate legal aspects
  { handoff_id: 912, process_id: 396 },  // LSD->ECM ediscovery.created       -> Resolve disputes and litigations
  { handoff_id: 913, process_id: 373 },  // LSD->HCM legal_hold.issued        -> Investigate legal aspects
  { handoff_id: 914, process_id: 369 },  // LSD->AUDIT regulatory_inquiry     -> Manage regulatory compliance
  { handoff_id: 915, process_id: 373 },  // LSD->ECM legal_matter.opened      -> Investigate legal aspects
  { handoff_id: 916, process_id: 373 },  // LSD->AUDIT legal_hold.released    -> Investigate legal aspects
  { handoff_id: 1028, process_id: 373 }, // LSD->ECM matter.opened            -> Investigate legal aspects
  { handoff_id: 1029, process_id: 373 }, // LSD->AUDIT matter.closed          -> Investigate legal aspects
  { handoff_id: 1030, process_id: 369 }, // LSD->GRC matter.disclosure        -> Manage regulatory compliance
  { handoff_id: 1031, process_id: 397 }, // LSD->ECM advice.issued            -> Provide legal advice/counseling
  { handoff_id: 1032, process_id: 397 }, // LSD->HCM advice.employee_related  -> Provide legal advice/counseling
];

async function insertHandoffProcesses() {
  const handoffIds = handoffProcessRows.map(r => r.handoff_id).join(",");
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds})&select=id,handoff_id,process_id`
  );
  const existingKey = new Set(
    existing.map(r => `${r.handoff_id}.${r.process_id}`)
  );
  const toInsert = handoffProcessRows
    .filter(r => !existingKey.has(`${r.handoff_id}.${r.process_id}`))
    .map(r => ({
      handoff_id: r.handoff_id,
      process_id: r.process_id,
      proposal_source: "agent_curated",
    }));
  console.log(
    `B1-H1: ${handoffProcessRows.length} target rows; ${existing.length} already exist on the key set; inserting ${toInsert.length}`
  );
  if (toInsert.length > 0) {
    const out = await post(`/handoff_processes`, toInsert);
    console.log(`  INSERTED ${out.length} handoff_processes rows`);
  }
  return { existing: existing.length, inserted: toInsert.length };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
const sB2 = await fixEventCategories();
const sH1 = await insertHandoffProcesses();

console.log("");
console.log("Summary:");
console.log(`  B1-S2 event_category: ${sB2.patched} patched / ${sB2.skipped} already / ${sB2.total} total`);
console.log(`  B1-H1 handoff_processes: ${sH1.inserted} inserted / ${sH1.existing} existing`);
console.log("");
console.log("UI:");
console.log("  https://tests.semantius.app/domain_map/trigger_events");
console.log("  https://tests.semantius.app/domain_map/handoff_processes");
