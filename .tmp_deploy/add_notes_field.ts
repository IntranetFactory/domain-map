#!/usr/bin/env bun
// Adds a `notes` multiline field to the `domains` entity and appends a dated
// reanalysis note to PSA and WFM.
//
// Idempotent: skips field creation if already present; appends to existing
// notes value if non-empty (rather than overwriting).

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

async function callCrudTool(tool: string, args: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(args));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call ${tool} failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? (Array.isArray(JSON.parse(text)) ? JSON.parse(text) : [JSON.parse(text)]) : [];
}

// ============================================================
// STEP 1 — create the field if missing
// ============================================================
console.log("STEP 1 — ensure domains.notes field");

const existing = await call({
  method: "GET",
  path: "/fields?select=id&id=eq.domains.notes",
});

if (existing.length === 0) {
  console.log("  creating field domains.notes (multiline)");
  await callCrudTool("create_field", {
    data: {
      table_name: "domains",
      field_name: "notes",
      title: "Notes",
      description: "Free-text reviewer notes, change log, postponed-decision parking. Append dated entries rather than overwriting.",
      format: "multiline",
      field_order: 1000090,
      searchable: false,
      width: "w",
    },
  });
  // Schema-changing operation: refresh cache before subsequent writes
  console.log("  refreshing schema cache");
  await callCrudTool("refresh_schema_cache", {});
} else {
  console.log("  domains.notes already exists, skipping create");
}

// ============================================================
// STEP 2 — append reanalysis notes to PSA and WFM
// ============================================================
console.log("STEP 2 — append reanalysis notes");

const today = "2026-05-20";

const psaNote = [
  `${today} reanalysis:`,
  "- Deduplicated Replicon (Replicon PSA solution merged into Replicon; Replicon now primary on both PSA and WFM).",
  "- Added consumer rows: employees + job_profiles (from HCM), opportunities (CRM), contracts (CLM), expense_reports (EXPENSE).",
  "- Added cross-domain handoffs: CRM->PSA opportunity.closed_won (high friction, cross-vendor stack shape), CLM->PSA contract.signed (medium), EXPENSE->PSA expense.approved (medium).",
  "- Added flagship-suite coverage: Oracle NetSuite (primary), SAP S/4HANA (secondary), new Oracle Fusion Cloud Project Management (primary).",
  "- POSTPONED: friction reassessment of WFM->PSA time_entry.approved (currently low; cross-vendor stack shape may warrant medium).",
].join("\n");

const wfmNote = [
  `${today} reanalysis:`,
  "- Added consumer rows: employees, positions, job_profiles, org_units (all from HCM) as the schedulable-resource pool inputs.",
  "- Added cross-domain handoffs: HCM->WFM employee.created (low), WFM->HCM absence.approved (medium; accruals + country carry-over rules), WFM->SWP actuals.posted (medium; plan-vs-actual feed).",
  "- Added HCM and PAYROLL as consumers of WFM-mastered absence_requests.",
  "- POSTPONED: friction reassessment of WFM->PSA time_entry.approved (currently low).",
].join("\n");

const targets: Array<{ code: string; note: string }> = [
  { code: "PSA", note: psaNote },
  { code: "WFM", note: wfmNote },
];

for (const t of targets) {
  const rows = await call({
    method: "GET",
    path: `/domains?select=id,domain_code,notes&domain_code=eq.${t.code}`,
  });
  if (rows.length !== 1) {
    throw new Error(`Expected exactly 1 ${t.code} domain row, got ${rows.length}`);
  }
  const row = rows[0];
  const current = typeof row.notes === "string" ? row.notes : "";

  // Idempotency: skip if today's marker already present
  if (current.includes(`${today} reanalysis:`)) {
    console.log(`  ${t.code}: today's note already present, skipping`);
    continue;
  }

  const next = current.trim().length === 0
    ? t.note
    : `${current.trim()}\n\n${t.note}`;

  console.log(`  ${t.code} (id ${row.id}): appending ${t.note.length} chars (current ${current.length})`);
  await call({
    method: "PATCH",
    path: `/domains?id=eq.${row.id}`,
    body: { notes: next },
  });
}

console.log("DONE");
