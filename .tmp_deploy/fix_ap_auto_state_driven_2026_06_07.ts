#!/usr/bin/env bun
// State-driven Validate-mode execute pass for AP-AUTO (domain_id=29), 2026-06-07.
// Works only the EXECUTE-classified open items from audits/AP-AUTO/state.yaml:
//   1. B13  PATCH entity_type unclassified -> operational_workflow on both masters
//           (invoice_matches id 204, payment_runs id 205). Corrective fill.
//   2. A4/Rule #20  First-write catalog_tagline + catalog_description on domains.id=29
//           (both currently empty string). Buyer-voice, no vendor names, no em-dash.
//   3. B11  INSERT generic synonyms into data_object_aliases for both masters.
//
// Idempotent: reads live before each write, only patches when still unclassified/empty,
// inserts only missing aliases keyed on (data_object_id, alias_name).
// Never sets record_status (defaults to 'new', Rule #1). notes always '' (Rule #15).

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

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => {
    const out: Row = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

const DOMAIN_ID = 29;
const INVOICE_MATCHES = 204;
const PAYMENT_RUNS = 205;

// ============================================================
// 1. entity_type classification (B13, Rule #12)
// ============================================================
console.log("== entity_type (B13) ==");
{
  const masters = await get(
    `/data_objects?id=in.(${INVOICE_MATCHES},${PAYMENT_RUNS})&select=id,data_object_name,entity_type`,
  );
  for (const m of masters) {
    if (m.entity_type === "unclassified" || m.entity_type == null) {
      await patch(`/data_objects?id=eq.${m.id}`, { entity_type: "operational_workflow" });
      console.log(`  PATCH ${m.data_object_name} (id ${m.id}) entity_type -> operational_workflow`);
    } else {
      console.log(`  ${m.data_object_name} (id ${m.id}) already '${m.entity_type}', skip`);
    }
  }
}

// ============================================================
// 2. catalog_tagline + catalog_description (A4 / Rule #20 first-write)
// ============================================================
console.log("== catalog UX (Rule #20) ==");
{
  const tagline =
    "Capture invoices, match them to POs and receipts, and pay suppliers on time without the spreadsheet shuffle.";
  const description =
    "Accounts Payable Automation takes the manual grind out of paying suppliers. " +
    "Invoices arrive by email, PDF, or supplier portal and are captured and read automatically, " +
    "then matched line by line against the purchase order and goods receipt so clean invoices flow " +
    "straight through and only real exceptions reach a human. Approvals route to the right people on " +
    "policy, duplicate and fraud checks run before any money moves, and approved bills are grouped into " +
    "scheduled payment runs across ACH, wire, check, and other methods. The result is faster cycle times, " +
    "fewer late-payment penalties, captured early-payment discounts, and a clean audit trail your controllers and auditors can trust.";

  const [dom] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
  );
  if (!dom) throw new Error("domain 29 not found");

  const patchBody: Row = {};
  if (dom.catalog_tagline === "" || dom.catalog_tagline == null) {
    patchBody.catalog_tagline = tagline;
  } else {
    console.log("  catalog_tagline already non-empty, NOT overwriting (Rule #20)");
  }
  if (dom.catalog_description === "" || dom.catalog_description == null) {
    patchBody.catalog_description = description;
  } else {
    console.log("  catalog_description already non-empty, NOT overwriting (Rule #20)");
  }
  if (Object.keys(patchBody).length > 0) {
    await patch(`/domains?id=eq.${DOMAIN_ID}`, patchBody);
    console.log(`  PATCH domain 29 wrote: ${Object.keys(patchBody).join(", ")}`);
  } else {
    console.log("  nothing to write on domain 29");
  }
}

// ============================================================
// 3. data_object_aliases (B11): generic synonyms only (Rule #18)
// ============================================================
console.log("== aliases (B11) ==");
{
  // All generic industry / regional terminology; no vendor product names (Rule #18).
  const aliasSpecs: { data_object_id: number; alias_name: string }[] = [
    { data_object_id: INVOICE_MATCHES, alias_name: "Match" },
    { data_object_id: INVOICE_MATCHES, alias_name: "Three-Way Match" },
    { data_object_id: INVOICE_MATCHES, alias_name: "PO Match" },
    { data_object_id: INVOICE_MATCHES, alias_name: "Reconciliation Outcome" },
    { data_object_id: PAYMENT_RUNS, alias_name: "Payment Batch" },
    { data_object_id: PAYMENT_RUNS, alias_name: "Bill Run" },
    { data_object_id: PAYMENT_RUNS, alias_name: "Pay Cycle" },
    { data_object_id: PAYMENT_RUNS, alias_name: "Payment Schedule" },
    { data_object_id: PAYMENT_RUNS, alias_name: "BACS Run" },
  ];

  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${INVOICE_MATCHES},${PAYMENT_RUNS})&select=data_object_id,alias_name`,
  );
  const existingKeys = new Set(
    existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`),
  );
  const missing = aliasSpecs
    .filter(a => !existingKeys.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`))
    .map(a => ({
      data_object_id: a.data_object_id,
      alias_name: a.alias_name,
      alias_type: "synonym",
      notes: "",
    }));

  if (missing.length > 0) {
    await insert("/data_object_aliases", missing);
    console.log(`  inserted ${missing.length} aliases (${existing.length} pre-existing)`);
    for (const a of missing) console.log(`    + [${a.data_object_id}] ${a.alias_name}`);
  } else {
    console.log(`  all ${aliasSpecs.length} aliases already present, nothing to insert`);
  }
}

// ============================================================
// Verification re-read
// ============================================================
console.log("== verify ==");
{
  const masters = await get(
    `/data_objects?id=in.(${INVOICE_MATCHES},${PAYMENT_RUNS})&select=id,data_object_name,entity_type`,
  );
  for (const m of masters) console.log(`  ${m.data_object_name}: entity_type=${m.entity_type}`);
  const [dom] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=catalog_tagline,catalog_description`,
  );
  console.log(`  tagline len=${String(dom.catalog_tagline).length} desc len=${String(dom.catalog_description).length}`);
  const aliases = await get(
    `/data_object_aliases?data_object_id=in.(${INVOICE_MATCHES},${PAYMENT_RUNS})&select=data_object_id,alias_name,alias_type&order=data_object_id`,
  );
  console.log(`  aliases now: ${aliases.length}`);
  for (const a of aliases) console.log(`    [${a.data_object_id}] ${a.alias_name} (${a.alias_type})`);
}

console.log("\nUI links:");
console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(204,205)");
console.log("  https://tests.semantius.app/domain_map/domains?id=eq.29");
console.log("  https://tests.semantius.app/domain_map/data_object_aliases?data_object_id=in.(204,205)");
