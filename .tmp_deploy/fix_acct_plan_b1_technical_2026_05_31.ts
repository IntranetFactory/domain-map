#!/usr/bin/env bun
/**
 * ACCT-PLAN B1 technical fixes - 2026-05-31 continuation.
 *
 * Scope (only truly-technical B1 fixes per the prompt):
 *   - B1-H1 handoff 210 (ACCT-PLAN -> SALES-ENG, whitespace.identified): INSERT
 *     `handoff_processes` row mapping to PCF id 929 ("Identify and capture
 *     upsell/cross-sell opportunities"). proposal_source='agent_curated',
 *     record_status omitted (DB default 'new' per SKILL.md Rule #1).
 *
 * Deferred (NOT applied here, recorded in the audit continuation):
 *   - B1-H1 handoff 209 tag: gated on B2-T1 (trigger-event publisher attribution).
 *   - B1-A1 catalog UX drafts: Rule #20 surface-to-user; never auto-overwrite.
 *   - B1-M1 (6 modules): new domain_modules, gated on B2-L1 / B2-M1.
 *   - B1-S1 B10b backfill: gated on B1-M1.
 *   - B1-V1 through B1-V7 (master loads): new entities, gated on B1-M1 + B2-L1.
 *
 * Pre-flight (verified manually before running):
 *   - handoff id 210 exists with source_domain_id=105 (ACCT-PLAN), target=95.
 *   - process id 929 exists (apqc_pcf_cross_industry, hierarchy_level 4).
 *   - no existing handoff_processes row for handoff_id=210.
 *
 * Idempotent: re-checks before inserting; safe to re-run.
 * Run from project root: bun run .tmp_deploy/fix_acct_plan_b1_technical_2026_05_31.ts
 */

type Row = Record<string, unknown>;

async function semCall(tool: string, payload: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`${tool} (exit ${code}): ${stderr || stdout}`);
  }
  const t = stdout.trim();
  return t ? JSON.parse(t) : null;
}

const get = (path: string) =>
  semCall("postgrestRequest", { method: "GET", path }) as Promise<any[]>;
const post = (path: string, body: Row | Row[]) =>
  semCall("postgrestRequest", { method: "POST", path, body }) as Promise<any[]>;

const HANDOFF_ID = 210;
const PROCESS_ID = 929;

async function preflight() {
  console.log("=== Pre-flight ===");
  const h = await get(
    `/handoffs?id=eq.${HANDOFF_ID}&select=id,source_domain_id,target_domain_id,trigger_event_id,data_object_id`,
  );
  if (h.length !== 1) {
    throw new Error(`pre-flight: handoff id ${HANDOFF_ID} not found (got ${h.length})`);
  }
  if (h[0].source_domain_id !== 105) {
    throw new Error(
      `pre-flight: handoff ${HANDOFF_ID} source_domain_id is ${h[0].source_domain_id}, expected 105 (ACCT-PLAN)`,
    );
  }
  console.log(`  + handoff ${HANDOFF_ID} verified (ACCT-PLAN -> domain ${h[0].target_domain_id})`);

  const p = await get(
    `/processes?id=eq.${PROCESS_ID}&select=id,process_name,external_id,source_framework,hierarchy_level`,
  );
  if (p.length !== 1) {
    throw new Error(`pre-flight: process id ${PROCESS_ID} not found (got ${p.length})`);
  }
  console.log(
    `  + process ${PROCESS_ID} verified: "${p[0].process_name}" (${p[0].source_framework}, L${p[0].hierarchy_level}, external_id=${p[0].external_id})`,
  );
}

async function insertTag() {
  console.log("\n=== Insert handoff_processes row ===");
  const existing = await get(
    `/handoff_processes?handoff_id=eq.${HANDOFF_ID}&process_id=eq.${PROCESS_ID}&select=id,proposal_source,record_status`,
  );
  if (existing.length > 0) {
    console.log(
      `  = already exists (id ${existing[0].id}, proposal_source=${existing[0].proposal_source}, record_status=${existing[0].record_status}), skipping`,
    );
    return;
  }
  const inserted = await post("/handoff_processes", {
    handoff_id: HANDOFF_ID,
    process_id: PROCESS_ID,
    proposal_source: "agent_curated",
    // record_status omitted; DB default 'new' applies per Rule #1.
  });
  console.log(
    `  + inserted handoff_processes row (id ${inserted[0]?.id}, key="${inserted[0]?.key}")`,
  );
}

async function postflight() {
  console.log("\n=== Post-flight ===");
  const rows = await get(
    `/handoff_processes?handoff_id=eq.${HANDOFF_ID}&select=id,handoff_id,process_id,proposal_source,record_status,key`,
  );
  console.log(`  handoff_processes rows for handoff ${HANDOFF_ID}:`);
  for (const r of rows) {
    console.log(
      `    id=${r.id} process_id=${r.process_id} proposal_source=${r.proposal_source} record_status=${r.record_status} key=${r.key}`,
    );
  }
  if (rows.length === 0) {
    throw new Error("post-flight: expected at least one row, got 0");
  }
}

async function main() {
  console.log("ACCT-PLAN B1 technical fixes (2026-05-31 continuation)");
  console.log("======================================================\n");
  await preflight();
  await insertTag();
  await postflight();
  console.log("\nDone.");
  console.log("  UI: https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
