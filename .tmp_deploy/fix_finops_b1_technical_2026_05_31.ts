#!/usr/bin/env bun
// FINOPS b1 audit, technical fixes only (2026-05-31 continuation).
//
// Scope per task spec (technical fixes the prompt permits without user judgment):
//
//   - B1-S10: PATCH domains id=41 (FINOPS) description + business_logic to fix
//             the em-dash (U+2014) and 3 American-English / em-dash project-rule
//             violations (CLAUDE.md). This is a hygiene rename PATCH.
//
//   - B1-H1-01..08: INSERT 8 agent_curated handoff_processes rows. Each entry
//             pre-specifies handoff_id and a resolvable PCF (process id verified
//             against /processes prior to authoring the loader). Handoff 305
//             (B1-H1-09) is explicitly DEFER-TO-DISCOVER per the audit and is
//             NOT loaded here.
//
// Deferred (not run, per task spec):
//   - B1-S1 (new modules), B1-S2 (new capabilities), B1-S3 (C1 spine arbitration,
//     user judgment), B1-S4 (Rule #20 catalog_tagline/description, user judgment),
//     B1-S5 (new DMDOs, gated on B1-S1), B1-S6 (gated on Bucket 2 item 3),
//     B1-S7 (new system skill + tools, gated on B1-S1), B1-S8 (gated on
//     B1-S6 + B1-S1), B1-S9 (PATCH target_domain_module_id on 8 inbound handoffs,
//     gated on B1-S5 + B1-S1), B1-S11 (new solutions, user judgment).
//   - All of Bucket 2 (judgment) and Bucket 3 (Phase 0 speculative).

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

async function post(path: string, body: Row | Row[]): Promise<Row[]> {
  return call({ method: "POST", path, body });
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

// -----------------------------------------------------------------------------
// B1-S10: Project-hygiene PATCH on domains id=41.
//   description: 'optimisation' -> 'optimization' (American English).
//   business_logic: 'optimisation' -> 'optimization', and the em-dash between
//     'commitment optimization' and 'algorithm-led' becomes a period-space with
//     re-capitalization, per the audit's recommended rewrite.
// Idempotent: only PATCH columns whose current text contains the violations.
// -----------------------------------------------------------------------------
const TARGET_DESCRIPTION =
  "Visibility, allocation, optimization, and accountability for cloud spending across business units.";
const TARGET_BUSINESS_LOGIC =
  "Unit-cost allocation, anomaly detection, rightsizing recommendations, and commitment optimization. Algorithm-led; the rest is reporting.";

async function applyB1S10(): Promise<number> {
  const rows = await get(`/domains?id=eq.41&select=id,description,business_logic`);
  if (rows.length !== 1) {
    throw new Error(`B1-S10: expected exactly 1 FINOPS row (id=41), got ${rows.length}`);
  }
  const row = rows[0];
  const patchBody: Row = {};
  if (row.description !== TARGET_DESCRIPTION) {
    patchBody.description = TARGET_DESCRIPTION;
  } else {
    console.log(`  [B1-S10] domains.description already cured, skip`);
  }
  if (row.business_logic !== TARGET_BUSINESS_LOGIC) {
    patchBody.business_logic = TARGET_BUSINESS_LOGIC;
  } else {
    console.log(`  [B1-S10] domains.business_logic already cured, skip`);
  }
  if (Object.keys(patchBody).length === 0) {
    return 0;
  }
  await patch(`/domains?id=eq.41`, patchBody);
  console.log(`  [B1-S10] patched domains id=41 columns: ${Object.keys(patchBody).join(", ")}`);
  return Object.keys(patchBody).length;
}

// -----------------------------------------------------------------------------
// B1-H1-01..08: APQC handoff_processes tags, 8 high-confidence rows.
// Each row's process_id was verified against /processes (resolved by id, with
// process_name and process_code cross-checked):
//
//   1132  Monitor and analyze IT financial performance   (PCF 8.2.5.4, L4)
//   1134  Optimize IT resource allocation                (PCF 8.2.5.6, L4)
//   260   Manage IT portfolio strategy                   (PCF 8.2.2,   L3)
//   1802  Perform sustainability reporting               (PCF 13.10.2.3, L4)
//
// Per-row pairing (handoff_id -> process_id, audit ID -> note):
//   B1-H1-01  198  -> 1132  FINOPS -> S2P  cloud_spend.threshold_breached
//   B1-H1-02  173  -> 1132  SPEND-MGMT -> FINOPS  card_transaction.posted
//   B1-H1-03  637  -> 1134  SAM -> FINOPS  software_license.under_consumed
//   B1-H1-04  641  -> 260   SMP -> FINOPS  saas_application.sanctioned
//   B1-H1-05  643  -> 1134  SMP -> FINOPS  saas_usage_metric.idle_threshold
//   B1-H1-06  691  -> 1132  BI -> FINOPS  bi_query.cost_threshold_breached
//   B1-H1-07  851  -> 1802  ESG -> FINOPS  activity_data.recorded
//   B1-H1-08  1196 -> 1132  APM -> FINOPS  application_cost.updated
//
// B1-H1-09 (handoff 305 RE-INVEST -> FINOPS property_valuation.refreshed) is
// explicitly DEFER-TO-DISCOVER per the audit (Bucket 2 item 5 routing in doubt).
// Not loaded here.
// -----------------------------------------------------------------------------
type APQCRow = { handoff_id: number; process_id: number; note: string };
const apqcRows: APQCRow[] = [
  { handoff_id: 198,  process_id: 1132, note: "FINOPS -> S2P cloud_spend.threshold_breached" },
  { handoff_id: 173,  process_id: 1132, note: "SPEND-MGMT -> FINOPS card_transaction.posted" },
  { handoff_id: 637,  process_id: 1134, note: "SAM -> FINOPS software_license.under_consumed" },
  { handoff_id: 641,  process_id: 260,  note: "SMP -> FINOPS saas_application.sanctioned" },
  { handoff_id: 643,  process_id: 1134, note: "SMP -> FINOPS saas_usage_metric.idle_threshold" },
  { handoff_id: 691,  process_id: 1132, note: "BI -> FINOPS bi_query.cost_threshold_breached" },
  { handoff_id: 851,  process_id: 1802, note: "ESG -> FINOPS activity_data.recorded" },
  { handoff_id: 1196, process_id: 1132, note: "APM -> FINOPS application_cost.updated" },
];

async function applyB1H1(): Promise<number> {
  let inserted = 0;
  for (const r of apqcRows) {
    const key = `${r.handoff_id}.${r.process_id}`;
    const existing = await get(
      `/handoff_processes?key=eq.${encodeURIComponent(key)}&select=id,proposal_source`,
    );
    if (existing.length > 0) {
      console.log(
        `  [B1-H1] tag handoff ${r.handoff_id} -> process ${r.process_id} exists (id ${existing[0].id}, ${existing[0].proposal_source}), skip`,
      );
      continue;
    }
    const out = await post("/handoff_processes", [
      {
        handoff_id: r.handoff_id,
        process_id: r.process_id,
        role: "implements",
        proposal_source: "agent_curated",
      },
    ]);
    console.log(
      `  [B1-H1] inserted tag handoff ${r.handoff_id} -> process ${r.process_id} (id ${out[0]?.id}, ${r.note})`,
    );
    inserted++;
  }
  return inserted;
}

// -----------------------------------------------------------------------------
// Driver.
// -----------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log("FINOPS b1 technical fixes (2026-05-31)");
  console.log("=======================================");

  console.log("B1-S10: domain hygiene PATCH (em-dash + American English)");
  const n10 = await applyB1S10();
  console.log(`  -> ${n10} columns patched`);

  console.log("B1-H1: APQC handoff_processes tags (8 high-confidence)");
  const nH1 = await applyB1H1();
  console.log(`  -> ${nH1} handoff_processes rows inserted`);

  console.log("=======================================");
  console.log(`TOTALS  S10=${n10}  H1=${nH1}`);
}

await main();
