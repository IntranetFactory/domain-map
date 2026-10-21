#!/usr/bin/env bun
/**
 * REV-INTEL B1 technical fixes - 2026-05-31 continuation.
 *
 * Scope (only truly-technical B1 fixes per the prompt):
 *   - B1-H1: INSERT 6 `handoff_processes` rows mapping the audit-pre-specified
 *     PCF tags for handoffs 207, 208, 201, 473, 476, 477.
 *     All carry proposal_source='agent_curated'; record_status omitted (DB
 *     default 'new' per SKILL.md Rule #1).
 *
 *     handoff_id | direction              | trigger_event                                    | PCF id | PCF row
 *     -----------+------------------------+--------------------------------------------------+--------+------------------------------------
 *     207        | REV-INTEL -> CRM       | deal_risk.escalated                              | 712    | Manage opportunity pipeline
 *     208        | REV-INTEL -> SALES-PERF| pipeline_health.degraded                         | 712    | Manage opportunity pipeline
 *     201        | CRM -> REV-INTEL       | crm_opportunity.closed_lost                      | 686    | Analyze sales trends and patterns
 *     473        | CRM -> REV-INTEL       | crm_opportunity.stage_changed                    | 712    | Manage opportunity pipeline
 *     476        | SALES-ENG -> REV-INTEL | conversation_intelligence.insight_published      | 686    | Analyze sales trends and patterns
 *     477        | SALES-ENG -> REV-INTEL | high_intent_signal.detected                      | 712    | Manage opportunity pipeline
 *
 * Deferred (NOT applied here, recorded in the audit continuation):
 *   - B1-H1 handoff 528: deferred per audit Bucket 2 B2-D1 (suspected
 *     duplicate-direction defect; do not author a tag until the question is
 *     resolved).
 *   - B1-A1 catalog_tagline / catalog_description: Rule #20 catalog UX text,
 *     drafts surface-to-user, never auto-overwrite.
 *   - B1-M1 (6 modules): new domain_modules, gated on B2-M1 (modularization
 *     shape decision: 6 vs 4 vs collapsed). Judgment call.
 *   - B1-S1 B10b backfill: gated on B1-M1.
 *   - B1-V1 through B1-V7 (master loads): new entities, gated on B1-M1 and
 *     B2-M1.
 *
 * Pre-flight (verified before running):
 *   - all 6 handoff ids exist with REV-INTEL (id 103) on one side.
 *   - process ids 686 ("Analyze sales trends and patterns") and 712
 *     ("Manage opportunity pipeline") exist (apqc_pcf_cross_industry, L4).
 *   - no existing handoff_processes rows for any of the 6 handoffs.
 *
 * Idempotent: per-row existence check before each insert; safe to re-run.
 * Run from project root: bun run .tmp_deploy/fix_rev_intel_b1_technical_2026_05_31.ts
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

const REV_INTEL_DOMAIN_ID = 103;

// (handoff_id, process_id) tuples pre-specified by the audit.
const TAGS: Array<{ handoff_id: number; process_id: number; note: string }> = [
  { handoff_id: 207, process_id: 712, note: "REV-INTEL -> CRM, deal_risk.escalated" },
  { handoff_id: 208, process_id: 712, note: "REV-INTEL -> SALES-PERF, pipeline_health.degraded" },
  { handoff_id: 201, process_id: 686, note: "CRM -> REV-INTEL, crm_opportunity.closed_lost" },
  { handoff_id: 473, process_id: 712, note: "CRM -> REV-INTEL, crm_opportunity.stage_changed" },
  { handoff_id: 476, process_id: 686, note: "SALES-ENG -> REV-INTEL, conversation_intelligence.insight_published" },
  { handoff_id: 477, process_id: 712, note: "SALES-ENG -> REV-INTEL, high_intent_signal.detected" },
];

const PROCESS_IDS = [...new Set(TAGS.map((t) => t.process_id))];
const HANDOFF_IDS = TAGS.map((t) => t.handoff_id);

async function preflight() {
  console.log("=== Pre-flight ===");

  // Verify all 6 handoffs exist and touch REV-INTEL.
  const handoffs = await get(
    `/handoffs?id=in.(${HANDOFF_IDS.join(",")})&select=id,source_domain_id,target_domain_id,trigger_event_id&order=id.asc`,
  );
  if (handoffs.length !== HANDOFF_IDS.length) {
    throw new Error(
      `pre-flight: expected ${HANDOFF_IDS.length} handoffs, got ${handoffs.length}`,
    );
  }
  for (const h of handoffs) {
    if (
      h.source_domain_id !== REV_INTEL_DOMAIN_ID &&
      h.target_domain_id !== REV_INTEL_DOMAIN_ID
    ) {
      throw new Error(
        `pre-flight: handoff ${h.id} does not touch REV-INTEL (src=${h.source_domain_id}, tgt=${h.target_domain_id})`,
      );
    }
    console.log(
      `  + handoff ${h.id} verified (src=${h.source_domain_id} -> tgt=${h.target_domain_id}, trigger_event=${h.trigger_event_id})`,
    );
  }

  // Verify both PCF rows.
  const procs = await get(
    `/processes?id=in.(${PROCESS_IDS.join(",")})&select=id,process_name,external_id,source_framework,hierarchy_level&order=id.asc`,
  );
  if (procs.length !== PROCESS_IDS.length) {
    throw new Error(
      `pre-flight: expected ${PROCESS_IDS.length} processes, got ${procs.length}`,
    );
  }
  for (const p of procs) {
    console.log(
      `  + process ${p.id} verified: "${p.process_name}" (${p.source_framework}, L${p.hierarchy_level}, external_id=${p.external_id})`,
    );
  }
}

async function insertTags() {
  console.log("\n=== Insert handoff_processes rows ===");
  let inserted = 0;
  let skipped = 0;
  for (const tag of TAGS) {
    const existing = await get(
      `/handoff_processes?handoff_id=eq.${tag.handoff_id}&process_id=eq.${tag.process_id}&select=id,proposal_source,record_status`,
    );
    if (existing.length > 0) {
      console.log(
        `  = handoff ${tag.handoff_id} -> process ${tag.process_id} already exists (id ${existing[0].id}, ${existing[0].proposal_source}/${existing[0].record_status}), skipping`,
      );
      skipped++;
      continue;
    }
    const rows = await post("/handoff_processes", {
      handoff_id: tag.handoff_id,
      process_id: tag.process_id,
      proposal_source: "agent_curated",
      // record_status omitted; DB default 'new' applies per Rule #1.
    });
    console.log(
      `  + inserted (id ${rows[0]?.id}, key="${rows[0]?.key}") for handoff ${tag.handoff_id} -> process ${tag.process_id}  // ${tag.note}`,
    );
    inserted++;
  }
  console.log(`  total: ${inserted} inserted, ${skipped} skipped`);
}

async function postflight() {
  console.log("\n=== Post-flight ===");
  const rows = await get(
    `/handoff_processes?handoff_id=in.(${HANDOFF_IDS.join(",")})&select=id,handoff_id,process_id,proposal_source,record_status,key&order=handoff_id.asc`,
  );
  console.log(`  handoff_processes rows touching REV-INTEL handoffs:`);
  for (const r of rows) {
    console.log(
      `    id=${r.id} handoff=${r.handoff_id} process=${r.process_id} proposal_source=${r.proposal_source} record_status=${r.record_status} key=${r.key}`,
    );
  }
  if (rows.length < TAGS.length) {
    throw new Error(
      `post-flight: expected at least ${TAGS.length} rows, got ${rows.length}`,
    );
  }
}

async function main() {
  console.log("REV-INTEL B1 technical fixes (2026-05-31 continuation)");
  console.log("======================================================\n");
  await preflight();
  await insertTags();
  await postflight();
  console.log("\nDone.");
  console.log("  UI: https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
