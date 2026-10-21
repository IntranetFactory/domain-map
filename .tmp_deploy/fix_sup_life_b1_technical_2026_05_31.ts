#!/usr/bin/env bun
// SUP-LIFE B1 technical-fix loader, 2026-05-31.
//
// Applies the strictly-technical, audit-pre-specified Bucket 1 fixes from
// audits/SUP-LIFE.md that do not require new entities, modules, capabilities,
// roles, lifecycle states, pattern-flag flips, catalog-tagline writes, or
// user judgment.
//
// In scope (per the continuation prompt):
//   - B1-S3: PATCH domains.business_logic to replace U+2014 em-dash with a comma.
//   - B1-S5: PATCH 6 trigger_events rows to set event_category (Rule #13 enum).
//   - B1-H1: INSERT 10 handoff_processes rows with proposal_source='agent_curated'
//            for the 10 cross-domain handoffs that today carry zero handoff_processes
//            coverage and where the audit pre-specifies a resolvable PCF.
//
// Deferred (do not write here):
//   - B1-S1, B1-S2, B1-S6, B1-S9, B1-S11, B1-S12: gated on new modules /
//     capabilities / roles / lifecycle states.
//   - B1-S4: catalog_tagline / catalog_description (Rule #20, user wording).
//   - B1-S7: pattern flag flips (user confirmation required).
//   - B1-S8: B10b FK PATCH (SUP-LIFE has zero modules, FK not derivable).
//   - B1-S10: cross-domain data_object_relationships outbound (target rows
//     grc_issues / fsqm_supplier_risk_events do not exist).
//   - The 4 existing PCF-167 generic tags on handoffs 127/128/213/214 (audit
//     surfaces user pick between keep-parent-plus-L4-child vs replace; deferred).
//   - The 4 existing agent_curated handoff_processes tags on 277/362/550/591
//     where the audit proposes augmenting or replacing; user judgment.

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

async function post(path: string, body: Row[] | Row): Promise<Row[]> {
  return call({ method: "POST", path, body });
}

// ============================================================
// B1-S3: business_logic em-dash fix on SUP-LIFE
// ============================================================
async function fixBusinessLogicEmDash(): Promise<void> {
  const before = await get(
    "/domains?domain_code=eq.SUP-LIFE&select=id,domain_code,business_logic",
  );
  if (before.length !== 1) {
    throw new Error(`expected 1 SUP-LIFE row, got ${before.length}`);
  }
  const current = String(before[0].business_logic ?? "");
  const EM_DASH = "—";
  if (!current.includes(EM_DASH)) {
    console.log("  B1-S3: no em-dash present, skipping");
    return;
  }
  // Replace " — " with ", " (audit-proposed exact text).
  const replaced = current.replace(/\s*—\s*/g, ", ");
  console.log(`  B1-S3: PATCH SUP-LIFE.business_logic`);
  console.log(`    before: ${current}`);
  console.log(`    after:  ${replaced}`);
  await patch(
    "/domains?domain_code=eq.SUP-LIFE",
    { business_logic: replaced },
  );
}

// ============================================================
// B1-S5: PATCH 6 trigger_events rows to set event_category
// ============================================================
// Audit-specified per-row mapping (allowed enum: lifecycle / state_change /
// threshold / signal).
const EVENT_CATEGORY_FIXES: Array<{ id: number; event_name: string; event_category: string }> = [
  { id: 562, event_name: "supplier_qualification.initiated",      event_category: "lifecycle" },
  { id: 563, event_name: "supplier_qualification.approved",       event_category: "state_change" },
  { id: 564, event_name: "supplier_qualification.rejected",       event_category: "state_change" },
  { id: 565, event_name: "supplier_qualification.expired",        event_category: "threshold" },
  { id: 566, event_name: "supplier_risk_assessment.completed",    event_category: "lifecycle" },
  { id: 567, event_name: "supplier_risk_assessment.elevated",     event_category: "threshold" },
];

async function fixTriggerEventCategories(): Promise<void> {
  const ids = EVENT_CATEGORY_FIXES.map(r => r.id).join(",");
  const before = await get(
    `/trigger_events?id=in.(${ids})&select=id,event_name,event_category`,
  );
  const byId = new Map<number, Row>(before.map(r => [Number(r.id), r]));
  for (const fix of EVENT_CATEGORY_FIXES) {
    const row = byId.get(fix.id);
    if (!row) {
      console.log(`  B1-S5 skip ${fix.id}: row not found`);
      continue;
    }
    if (row.event_name !== fix.event_name) {
      console.log(`  B1-S5 skip ${fix.id}: event_name mismatch (live=${row.event_name}, audit=${fix.event_name})`);
      continue;
    }
    if (row.event_category && row.event_category !== "") {
      console.log(`  B1-S5 skip ${fix.id} (${fix.event_name}): already set to ${row.event_category}`);
      continue;
    }
    console.log(`  B1-S5: PATCH trigger_event ${fix.id} (${fix.event_name}) -> event_category=${fix.event_category}`);
    await patch(
      `/trigger_events?id=eq.${fix.id}`,
      { event_category: fix.event_category },
    );
  }
}

// ============================================================
// B1-H1: INSERT 10 handoff_processes (agent_curated, new)
// ============================================================
// Audit pre-specifies handoff_id + PCF id (process_id) for these 10 rows.
// All 10 handoffs today carry zero handoff_processes coverage and the PCF
// rows exist (verified pre-flight against /processes).
//
// Skipped from the audit's 14-row table (kept for the user judgment pass):
//   - 127, 128, 213, 214: already carry discovery_override tags pointing at
//     PCF 167 ("Manage suppliers"). Audit proposes upgrading to more-specific
//     L4 children; the upgrade-vs-keep-parent decision is user judgment.
//   - 277, 362, 550, 591: already carry agent_curated tags with a different
//     process_id than the audit proposes; modifying an existing curated tag
//     is judgment.
const HANDOFF_PROCESS_INSERTS: Array<{
  handoff_id: number;
  process_id: number;
  process_code: string;
  process_name: string;
}> = [
  { handoff_id: 546, process_id: 805, process_code: "4.2.3.2", process_name: "Certify and validate suppliers" },
  { handoff_id: 547, process_id: 805, process_code: "4.2.3.2", process_name: "Certify and validate suppliers" },
  { handoff_id: 548, process_id: 815, process_code: "4.2.5.1", process_name: "Monitor/Manage supplier information" },
  { handoff_id: 549, process_id: 816, process_code: "4.2.5.2", process_name: "Prepare/Analyze procurement and supplier performance" },
  { handoff_id: 596, process_id: 815, process_code: "4.2.5.1", process_name: "Monitor/Manage supplier information" },
  { handoff_id: 273, process_id: 815, process_code: "4.2.5.1", process_name: "Monitor/Manage supplier information" },
  { handoff_id: 543, process_id: 816, process_code: "4.2.5.2", process_name: "Prepare/Analyze procurement and supplier performance" },
  { handoff_id: 565, process_id: 804, process_code: "4.2.3.1", process_name: "Select suppliers" },
  { handoff_id: 586, process_id: 816, process_code: "4.2.5.2", process_name: "Prepare/Analyze procurement and supplier performance" },
  { handoff_id: 336, process_id: 815, process_code: "4.2.5.1", process_name: "Monitor/Manage supplier information" },
];

async function loadHandoffProcesses(): Promise<void> {
  // Verify all handoffs exist.
  const handoffIds = HANDOFF_PROCESS_INSERTS.map(r => r.handoff_id);
  const handoffRows = await get(
    `/handoffs?id=in.(${handoffIds.join(",")})&select=id`,
  );
  const liveHandoffIds = new Set(handoffRows.map(r => Number(r.id)));
  for (const id of handoffIds) {
    if (!liveHandoffIds.has(id)) {
      throw new Error(`B1-H1 pre-flight: handoff ${id} not found`);
    }
  }
  // Verify all processes exist.
  const processIds = Array.from(new Set(HANDOFF_PROCESS_INSERTS.map(r => r.process_id)));
  const processRows = await get(
    `/processes?id=in.(${processIds.join(",")})&select=id`,
  );
  const liveProcessIds = new Set(processRows.map(r => Number(r.id)));
  for (const id of processIds) {
    if (!liveProcessIds.has(id)) {
      throw new Error(`B1-H1 pre-flight: process ${id} not found`);
    }
  }
  // Read existing handoff_processes for these handoffs to avoid duplicates.
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=id,handoff_id,process_id`,
  );
  // unique_value key is (handoff_id, process_id); skip any pair already present.
  const existingKeys = new Set(
    existing.map(r => `${Number(r.handoff_id)}.${Number(r.process_id)}`),
  );
  const newRows: Row[] = [];
  for (const r of HANDOFF_PROCESS_INSERTS) {
    const key = `${r.handoff_id}.${r.process_id}`;
    if (existingKeys.has(key)) {
      console.log(`  B1-H1 skip ${key}: already linked`);
      continue;
    }
    newRows.push({
      handoff_id: r.handoff_id,
      process_id: r.process_id,
      proposal_source: "agent_curated",
      // record_status omitted, db default 'new' kicks in per Rule #1.
    });
  }
  if (newRows.length === 0) {
    console.log("  B1-H1: nothing to insert");
    return;
  }
  console.log(`  B1-H1: inserting ${newRows.length} handoff_processes rows`);
  await post("/handoff_processes", newRows);
}

// ============================================================
// MAIN
// ============================================================
async function main(): Promise<void> {
  console.log("SUP-LIFE B1 technical fixes, 2026-05-31");
  console.log("");
  console.log("[B1-S3] business_logic em-dash");
  await fixBusinessLogicEmDash();
  console.log("");
  console.log("[B1-S5] trigger_event event_category backfill");
  await fixTriggerEventCategories();
  console.log("");
  console.log("[B1-H1] handoff_processes APQC tagging");
  await loadHandoffProcesses();
  console.log("");
  console.log("Done.");
  console.log("UI: https://tests.semantius.app/domain_map/handoff_processes");
  console.log("UI: https://tests.semantius.app/domain_map/trigger_events");
  console.log("UI: https://tests.semantius.app/domain_map/domains");
}

await main();
