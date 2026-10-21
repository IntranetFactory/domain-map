#!/usr/bin/env bun
// HRSD B1 technical fixes — 2026-05-31
//
// Applies the truly-technical subset of Bucket 1 from audits/HRSD.md:
//   Phase S1 — PATCH trigger_events.id=454 to set event_category='state_change'
//              (B1-S1: enum-constraint violation, audit fully specifies value)
//   Phase H1 — INSERT 15 new agent_curated handoff_processes rows
//              (B1-H1: each row's handoff_id + PCF external_id is pre-specified
//              by the audit; KEEP/REPLACE judgments are deferred to user)
//
// Deferred from B1 (not applied by this loader):
//   - B1-A4: catalog_tagline / catalog_description drafts (Rule #20, per-row approval)
//   - B1-H1 REPLACE rows (handoffs 119, 446): overwriting existing discovery_override
//     rows is a judgment call about whether the prior tag was wrong; surface to user
//   - B1-H1 KEEP-or-decide rows (handoffs 369, 1109): explicit user-decision per audit
//   - B1-H1 KEEP rows (handoffs 29, 9): no action needed (existing tags are correct)
//
// Idempotency: pre-reads existing handoff_processes for the target handoffs and only
// inserts rows whose (handoff_id, process_id) pair is missing. Re-running is free.
//
// Rule discipline:
//   - record_status omitted on every INSERT (DB default 'new') — Rule #1
//   - Zero writes to any `notes` column — Rule #15
//   - APQC tags use proposal_source='agent_curated' — agent-authored work
//   - No vendor or product names in any text field — Rule #18 (n/a here)

const SEMANTIUS = "semantius";

async function call(method: string, path: string, body?: unknown): Promise<unknown> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const p = Bun.spawn([SEMANTIUS, "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  p.stdin.write(JSON.stringify(payload));
  await p.stdin.end();
  const stdout = await new Response(p.stdout).text();
  const stderr = await new Response(p.stderr).text();
  const code = await p.exited;
  if (code !== 0) {
    throw new Error(`semantius exit ${code}: ${stderr}\nstdout: ${stdout}`);
  }
  if (!stdout.trim()) return null;
  try {
    return JSON.parse(stdout);
  } catch {
    return stdout;
  }
}

const get = (path: string) => call("GET", path);
const post = (path: string, body: unknown) => call("POST", path, body);
const patch = (path: string, body: unknown) => call("PATCH", path, body);

type Row = Record<string, unknown>;

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const out: Row = {};
    for (const k of keys) {
      out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    }
    return out;
  });
}

async function insertChunked(table: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const result = (await post(`/${table}`, slice)) as Row[] | null;
    if (result) out.push(...result);
  }
  return out;
}

// ─── Phase S1 — trigger_events enum backfill ──────────────────────────────

async function phaseS1() {
  console.log("\n=== Phase S1 — trigger_events.id=454 event_category backfill ===");
  const before = (await get(
    "/trigger_events?id=eq.454&select=id,event_name,event_category",
  )) as Row[];
  console.log(`  before: ${JSON.stringify(before)}`);
  if (Array.isArray(before) && before.length === 1 && before[0].event_category === "") {
    const result = await patch("/trigger_events?id=eq.454", {
      event_category: "state_change",
    });
    console.log(`  ✓ patched: ${JSON.stringify(result)}`);
  } else {
    console.log("  (skip) already populated or row missing");
  }
}

// ─── Phase H1 — APQC handoff_processes inserts ────────────────────────────
//
// Only the 15 NEW agent_curated rows from the audit. Each entry is
// (handoff_id, PCF external_id, mnemonic) — mnemonic is for log readability
// only, not written to the DB.

interface ApqcTag {
  handoff_id: number;
  process_external_id: string;
  mnemonic: string;
}

const APQC_BATCH: ApqcTag[] = [
  // Outbound from HRSD
  { handoff_id: 447, process_external_id: "11073", mnemonic: "HRSD→KMS case_category.updated → KM L2" },
  { handoff_id: 448, process_external_id: "17056", mnemonic: "HRSD→HCM case_category.updated → employee info L2" },
  { handoff_id: 1118, process_external_id: "10865", mnemonic: "HRSD→PAYROLL hr_case.escalated_to_payroll → payroll inquiries L4" },
  { handoff_id: 1119, process_external_id: "10504", mnemonic: "HRSD→BEN-ADMIN hr_case.escalated_to_benefits → benefits program L4" },
  { handoff_id: 1120, process_external_id: "11073", mnemonic: "HRSD→KMS hr_case.resolved → KM L2" },
  { handoff_id: 1121, process_external_id: "20599", mnemonic: "HRSD→LMS case_category.updated → onboarding/training L2" },
  // Inbound to HRSD
  { handoff_id: 250, process_external_id: "10523", mnemonic: "GRC→HRSD compliance_policy.updated → employee inquiry L3" },
  { handoff_id: 721, process_external_id: "10523", mnemonic: "KMS→HRSD knowledge_base_article.published → employee inquiry L3" },
  { handoff_id: 467, process_external_id: "10523", mnemonic: "IGA→HRSD iga_access_request.submitted → employee inquiry L3" },
  { handoff_id: 416, process_external_id: "10865", mnemonic: "PAYROLL→HRSD garnishment_order.received → payroll inquiries L4" },
  { handoff_id: 402, process_external_id: "17052", mnemonic: "ATS→HRSD background_check.flagged → employee relations L2" },
  { handoff_id: 1048, process_external_id: "10523", mnemonic: "LMS→HRSD compliance_assignment.due → employee inquiry L3" },
  { handoff_id: 429, process_external_id: "17052", mnemonic: "WFM→HRSD work_shift.no_show → employee relations L2" },
  { handoff_id: 1137, process_external_id: "10523", mnemonic: "COMP-MGMT→HRSD compensation_statement.issued → employee inquiry L3" },
  { handoff_id: 420, process_external_id: "10504", mnemonic: "BEN-ADMIN→HRSD carrier_feed.reconciled → benefits program L4" },
];

async function phaseH1() {
  console.log("\n=== Phase H1 — APQC handoff_processes inserts ===");

  const externalIds = [...new Set(APQC_BATCH.map((t) => t.process_external_id))];
  const processes = (await get(
    `/processes?source_framework=eq.apqc_pcf_cross_industry&external_id=in.(${externalIds.join(",")})&select=id,external_id`,
  )) as { id: number; external_id: string }[];
  const procByExt = new Map(processes.map((p) => [String(p.external_id), Number(p.id)]));
  for (const e of externalIds) {
    if (!procByExt.has(e)) {
      throw new Error(`PCF process external_id=${e} not found; aborting`);
    }
  }
  console.log(`  resolved ${procByExt.size} PCF process ids`);

  const handoffIds = APQC_BATCH.map((t) => t.handoff_id).join(",");
  const existing = (await get(
    `/handoff_processes?handoff_id=in.(${handoffIds})&select=handoff_id,process_id`,
  )) as { handoff_id: number; process_id: number }[];
  const existingKey = new Set(
    existing.map((e) => `${e.handoff_id}.${e.process_id}`),
  );
  console.log(`  existing handoff_processes rows for target handoffs: ${existing.length}`);

  const rows: Row[] = [];
  for (const t of APQC_BATCH) {
    const pid = procByExt.get(t.process_external_id)!;
    const key = `${t.handoff_id}.${pid}`;
    if (existingKey.has(key)) {
      console.log(`  (skip) ${key} already exists — ${t.mnemonic}`);
      continue;
    }
    rows.push({
      handoff_id: t.handoff_id,
      process_id: pid,
      proposal_source: "agent_curated",
      // record_status omitted — DB default 'new' per Rule #1
      // notes omitted — Rule #15
      // label / role: defaults (label '' or computed; role default 'implements')
    });
  }
  console.log(`  inserting ${rows.length} handoff_processes rows`);
  const created = await insertChunked("handoff_processes", rows);
  console.log(`  ✓ created ${created.length} rows`);
}

// ─── Main ─────────────────────────────────────────────────────────────────

await phaseS1();
await phaseH1();

console.log("\n✓ all phases complete");
console.log("\nUI spot-checks:");
console.log("  https://tests.semantius.app/domain_map/trigger_events");
console.log("  https://tests.semantius.app/domain_map/handoff_processes");
