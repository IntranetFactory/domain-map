#!/usr/bin/env bun
// PRIV-MGMT B1 technical fix-loop (2026-05-31).
//
// Applies the truly-technical (audit pre-specified, no judgment) subset of the
// 2026-05-30 PRIV-MGMT audit Bucket 1:
//
//   B1-S6: INSERT 1 domain_regulations row linking PRIV-MGMT (20) to CPRA (3),
//          applicability='mandatory'. Audit pre-specifies the exact tuple.
//   B1-S13: INSERT 1 agent_curated handoff_processes row:
//             handoff 283 (DLP -> PRIV-MGMT, dlp_incident.blocked) -> PCF 20735
//             ("Develop and manage IT security, privacy, and data protection",
//              processes.id=270, hierarchy_level=3).
//          Handoff 288 deferred: B2-5 explicitly flags it as a user judgment call
//          (load now vs wait on DSPM B9 attribution fix). The PRIV-MGMT side is
//          fixable either way; the agent defers per the prompt's instruction to
//          act only on items the audit treats as unambiguous.
//
// Deferred items (gated on B2-1 re-homing decision, gated on B1-S1 modules, or
// Rule #20 / Rule #15 / Rule #18 / vendor judgment):
//   B1-S1 (modules), B1-S2 (capabilities), B1-S3 (catalog UX per Rule #20),
//   B1-S4 (DataGrail/Transcend vendor adds), B1-S7 (B10b PATCH gated on B1-S1:
//   no PRIV-MGMT modules exist to PATCH onto), B1-S8/S9/S10/S11/S12 (all
//   gated on B2-1).
//
// Idempotent. Run from project root with:
//   bun run .tmp_deploy/fix_priv_mgmt_b1_technical_2026_05_31.ts

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

async function post(path: string, body: Row[]): Promise<Row[]> {
  return call({ method: "POST", path, body });
}

const PRIV_MGMT_DOMAIN_ID = 20;
const CPRA_REGULATION_ID = 3;
const HANDOFF_283_ID = 283;
const PCF_20735_PROCESS_ID = 270;

// ============================================================
// B1-S6: INSERT domain_regulations(20, 3, mandatory)
// Audit cites: "CPRA (id 3) which is the second universally-cited privacy
// regulation for this market." Exact tuple given.
// ============================================================
async function fixB1S6(): Promise<void> {
  console.log("B1-S6: INSERT domain_regulations(domain_id=20, regulation_id=3, applicability='mandatory')");
  const existing = await get(
    `/domain_regulations?domain_id=eq.${PRIV_MGMT_DOMAIN_ID}` +
      `&regulation_id=eq.${CPRA_REGULATION_ID}&select=id,applicability`,
  );
  if (existing.length > 0) {
    console.log(`  Row already exists (id=${existing[0].id}, applicability=${existing[0].applicability}); skipping`);
    return;
  }
  await post("/domain_regulations", [
    {
      domain_id: PRIV_MGMT_DOMAIN_ID,
      regulation_id: CPRA_REGULATION_ID,
      applicability: "mandatory",
    },
  ]);
  const after = await get(
    `/domain_regulations?domain_id=eq.${PRIV_MGMT_DOMAIN_ID}` +
      `&regulation_id=eq.${CPRA_REGULATION_ID}&select=id,applicability`,
  );
  if (after.length === 0) throw new Error("B1-S6: row missing post-insert");
  console.log(`  inserted: id=${after[0].id}, applicability=${after[0].applicability}`);
}

// ============================================================
// B1-S13: INSERT 1 agent_curated handoff_processes row (handoff 283 -> PCF 20735)
// Handoff 288 deferred (B2-5 user judgment).
// ============================================================
async function fixB1S13(): Promise<void> {
  console.log("B1-S13: INSERT agent_curated handoff_processes(handoff=283, process=270)");
  const existing = await get(
    `/handoff_processes?handoff_id=eq.${HANDOFF_283_ID}` +
      `&process_id=eq.${PCF_20735_PROCESS_ID}&select=id,proposal_source,record_status`,
  );
  if (existing.length > 0) {
    console.log(
      `  Row already exists (id=${existing[0].id}, proposal_source=${existing[0].proposal_source}); skipping`,
    );
    return;
  }
  await post("/handoff_processes", [
    {
      handoff_id: HANDOFF_283_ID,
      process_id: PCF_20735_PROCESS_ID,
      proposal_source: "agent_curated",
      role: "implements",
    },
  ]);
  const after = await get(
    `/handoff_processes?handoff_id=eq.${HANDOFF_283_ID}` +
      `&process_id=eq.${PCF_20735_PROCESS_ID}&select=id,proposal_source,record_status`,
  );
  if (after.length === 0) throw new Error("B1-S13: row missing post-insert");
  console.log(
    `  inserted: id=${after[0].id}, proposal_source=${after[0].proposal_source}, record_status=${after[0].record_status}`,
  );
}

// ============================================================
// MAIN
// ============================================================
async function main(): Promise<void> {
  console.log("=== PRIV-MGMT B1 technical fix-loop (2026-05-31) ===\n");
  await fixB1S6();
  console.log("");
  await fixB1S13();
  console.log("\n=== Done ===");
  console.log("UI spot-check links:");
  console.log("  https://tests.semantius.app/domain_map/domain_regulations");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
