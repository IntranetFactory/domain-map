#!/usr/bin/env bun
// PS-LIC B1 technical fixes per audits/PS-LIC.md (2026-05-31 continuation).
//
// Scope (technical only, no judgment calls):
//   1. B1-S7 partial: PATCH handoffs 923, 924 target_domain_module_id = 112
//      (CSM-CASE-MGMT). Source FKs and other target FKs deferred (GRC/ERP-FIN
//      not yet modularized).
//   2. B1-B2: DELETE the stale handoff_processes row id 142 on handoff 925
//      (PCF 1290 "Plan and budget IT license usage volumes" is IT software
//      licensing, not regulatory licensing).
//   3. B1-H1: INSERT 6 handoff_processes rows (agent_curated) per the
//      per-handoff classification table in the audit.
//
// Idempotent: re-checks live state before each write. Run from project root.
//   bun run c:/dev/domain-map/.tmp_deploy/fix_ps_lic_b1_technical_2026_05_31.ts

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

// ----------------------------------------------------------------
// Step 1: B1-S7 partial — PATCH target_domain_module_id on handoffs 923, 924
// to CSM-CASE-MGMT (id 112). Source FKs and ERP-FIN/GRC targets remain NULL.
// ----------------------------------------------------------------
const CSM_CASE_MGMT_ID = 112;
const csmTargets = [923, 924];

const csmModule = await get(`/domain_modules?id=eq.${CSM_CASE_MGMT_ID}&select=id,domain_module_code,domain_id`);
if (csmModule.length !== 1 || csmModule[0].domain_module_code !== "CSM-CASE-MGMT" || csmModule[0].domain_id !== 30) {
  throw new Error(`CSM-CASE-MGMT precheck failed: ${JSON.stringify(csmModule)}`);
}
console.log(`Step 1: PATCH handoffs ${csmTargets.join(", ")} target_domain_module_id = ${CSM_CASE_MGMT_ID} (CSM-CASE-MGMT)`);

for (const hid of csmTargets) {
  const before = await get(`/handoffs?id=eq.${hid}&select=id,target_domain_id,target_domain_module_id`);
  if (before.length !== 1) {
    throw new Error(`handoff ${hid} not found`);
  }
  if (before[0].target_domain_id !== 30) {
    throw new Error(`handoff ${hid} target_domain_id is ${before[0].target_domain_id}, expected 30 (CSM)`);
  }
  if (before[0].target_domain_module_id === CSM_CASE_MGMT_ID) {
    console.log(`  handoff ${hid}: already at ${CSM_CASE_MGMT_ID}, skipping`);
    continue;
  }
  await call({
    method: "PATCH",
    path: `/handoffs?id=eq.${hid}`,
    body: { target_domain_module_id: CSM_CASE_MGMT_ID },
  });
  console.log(`  handoff ${hid}: PATCHed target_domain_module_id ${before[0].target_domain_module_id} -> ${CSM_CASE_MGMT_ID}`);
}

// ----------------------------------------------------------------
// Step 2: B1-B2 — DELETE stale handoff_processes id 142
// (handoff 925, process_id 1290 "Plan and budget IT license usage volumes",
// IT-software-licensing, wrong for regulatory licensing).
// ----------------------------------------------------------------
const STALE_HP_ID = 142;
const STALE_HANDOFF_ID = 925;
const STALE_PROCESS_ID = 1290;

console.log(`Step 2: DELETE stale handoff_processes id ${STALE_HP_ID} (handoff ${STALE_HANDOFF_ID} -> PCF ${STALE_PROCESS_ID})`);
const staleRow = await get(`/handoff_processes?id=eq.${STALE_HP_ID}&select=id,handoff_id,process_id`);
if (staleRow.length === 0) {
  console.log(`  already deleted, skipping`);
} else {
  const r = staleRow[0];
  if (r.handoff_id !== STALE_HANDOFF_ID || r.process_id !== STALE_PROCESS_ID) {
    throw new Error(`stale row mismatch: ${JSON.stringify(r)}`);
  }
  await call({ method: "DELETE", path: `/handoff_processes?id=eq.${STALE_HP_ID}` });
  console.log(`  DELETEd row id ${STALE_HP_ID}`);
}

// ----------------------------------------------------------------
// Step 3: B1-H1 — INSERT 6 handoff_processes rows (agent_curated).
// Per the per-handoff classification table in audits/PS-LIC.md.
// All PCF ids verified live before authoring this loader.
// ----------------------------------------------------------------
const proposals = [
  { handoff_id: 921, process_id: 303,  comment: "regulatory_fee.assessed -> ERP-FIN, Process accounts receivable (AR)" },
  { handoff_id: 922, process_id: 369,  comment: "code_violation.issued -> GRC, Manage regulatory compliance" },
  { handoff_id: 923, process_id: 1354, comment: "permit_inspection.failed -> CSM, Resolve customer billing inquiries (proxy)" },
  { handoff_id: 924, process_id: 1351, comment: "license_renewal.due -> CSM, Generate customer billing data (proxy)" },
  { handoff_id: 925, process_id: 1353, comment: "license.issued -> ERP-FIN, Post receivable entries" },
  { handoff_id: 926, process_id: 369,  comment: "permit_inspection.failed -> GRC, Manage regulatory compliance" },
];

console.log(`Step 3: INSERT ${proposals.length} handoff_processes rows (agent_curated)`);

// Verify every PCF id resolves first (defensive; already verified during audit).
const pcfIds = [...new Set(proposals.map(p => p.process_id))];
const pcfRows = await get(`/processes?id=in.(${pcfIds.join(",")})&select=id,process_name,source_framework`);
if (pcfRows.length !== pcfIds.length) {
  throw new Error(`PCF id resolution failed: expected ${pcfIds.length}, got ${pcfRows.length}: ${JSON.stringify(pcfRows)}`);
}
for (const r of pcfRows) {
  if (r.source_framework !== "apqc_pcf_cross_industry") {
    throw new Error(`PCF id ${r.id} source_framework is ${r.source_framework}, expected apqc_pcf_cross_industry`);
  }
}

// Idempotency: read existing rows on these handoffs and skip duplicates by (handoff_id, process_id).
const existing = await get(`/handoff_processes?handoff_id=in.(${proposals.map(p => p.handoff_id).join(",")})&select=handoff_id,process_id`);
const existingKeys = new Set(existing.map(r => `${r.handoff_id}.${r.process_id}`));

const toInsert: Row[] = [];
for (const p of proposals) {
  const key = `${p.handoff_id}.${p.process_id}`;
  if (existingKeys.has(key)) {
    console.log(`  ${key}: already exists, skipping (${p.comment})`);
    continue;
  }
  toInsert.push({
    handoff_id: p.handoff_id,
    process_id: p.process_id,
    role: "implements",
    proposal_source: "agent_curated",
    // record_status omitted: defaults to 'new' per Rule #1.
    // notes omitted: default empty string per Rule #15.
  });
}

if (toInsert.length === 0) {
  console.log(`  all ${proposals.length} rows already present`);
} else {
  await call({ method: "POST", path: "/handoff_processes", body: toInsert });
  console.log(`  INSERTed ${toInsert.length} rows`);
}

// ----------------------------------------------------------------
// Verification pass
// ----------------------------------------------------------------
console.log("\nVerification:");
const finalHandoffs = await get(`/handoffs?id=in.(${csmTargets.join(",")})&select=id,target_domain_module_id`);
console.log("  CSM handoff target FKs:", JSON.stringify(finalHandoffs));

const finalHp = await get(`/handoff_processes?handoff_id=in.(921,922,923,924,925,926)&select=handoff_id,process_id,proposal_source,record_status&order=handoff_id.asc`);
console.log(`  handoff_processes on PS-LIC handoffs (${finalHp.length} rows):`);
for (const r of finalHp) {
  console.log(`    ${r.handoff_id} -> PCF ${r.process_id} (${r.proposal_source}, ${r.record_status})`);
}
