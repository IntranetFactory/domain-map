#!/usr/bin/env bun
/**
 * EPM (Enterprise Performance Management) b1 audit technical fixes
 * (2026-05-31 continuation).
 *
 * In scope (per subagent prompt's truly-technical B1 fix list):
 *   1. B1-S7: PATCH event_category on 4 EPM trigger_events
 *      (ids 583, 584, 585, 586), all -> 'state_change' per audit.
 *   2. B1-S11 (1): PATCH domains id=66 business_logic, replace the em-dash
 *      ' — ' substring with '; ' per CLAUDE.md no-em-dash rule.
 *   3. B1-S11 (2): PATCH domain_data_objects row id=334
 *      (domain_id=66, data_object_id=196), set notes='' per Rule #15
 *      (audit pre-specifies the row by id+composite key; notes restate
 *      structured columns).
 *   4. B1-H1: INSERT 12 handoff_processes rows with
 *      proposal_source='agent_curated', covering the 12 "confident"
 *      EPM-side handoff -> PCF mappings the audit pre-specifies AND
 *      where no existing handoff_processes row collides on
 *      (handoff_id, process_id). The 6 confident mappings that already
 *      have a discovery_substring row pointing at the same PCF are
 *      DEFERRED (re-classifying source to agent_curated is a PATCH the
 *      prompt does not authorize). The 4 "medium" mappings (H1-13, 18,
 *      21, 22) are DEFERRED as judgment.
 *
 * Deferred (out of scope):
 *   - B1-S1: M1 module split (new entities + gated on user-pick B2-S1).
 *   - B1-S2, S3, S8, S9, S10: all cascade on B1-S1 (no EPM modules exist).
 *   - B1-S4: bulk aliases (audit gives vendor names but no exact
 *     (alias_name, alias_type) tuples per Rule #4b-style pre-spec).
 *   - B1-S5: user-edges Rule #10 (audit only partially pre-specifies
 *     verb shapes, says "5-10 edges per master ... etc.").
 *   - B1-S6: intra-domain rels (audit names patterns but not exact
 *     (verb, inverse_verb, kind, type, is_required, owner_side) tuples).
 *   - B2-S1..S4: judgment.
 *   - B3-*: speculative.
 *
 * Run from project root only (Rule #6 / CLAUDE.md cwd discipline):
 *   bun run "c:/dev/domain-map/.tmp_deploy/fix_epm_b1_technical_2026_05_31.ts"
 */

type Row = Record<string, unknown>;

async function semCall(tool: string, payload: Row): Promise<any> {
  const args = ["semantius", "call", "crud", tool];
  const proc = Bun.spawn(args, { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
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

const get = (path: string) => semCall("postgrestRequest", { method: "GET", path }) as Promise<any[]>;
const post = (path: string, body: Row | Row[]) =>
  semCall("postgrestRequest", { method: "POST", path, body }) as Promise<any[]>;
const patch = (path: string, body: Row) =>
  semCall("postgrestRequest", { method: "PATCH", path, body }) as Promise<any[]>;

// ---------------------------------------------------------------------------
// B1-S7: trigger_events event_category backfill (4 rows -> 'state_change')
// ---------------------------------------------------------------------------

const TRIGGER_EVENT_CATEGORY: Record<number, string> = {
  583: "state_change", // financial_plan.published
  584: "state_change", // financial_plan.approved
  585: "state_change", // financial_scenario.modeled
  586: "state_change", // variance_analysis.completed
};

async function patchTriggerEventCategories() {
  console.log("=== B1-S7: trigger_events event_category PATCHes ===");
  const ids = Object.keys(TRIGGER_EVENT_CATEGORY).map(Number);
  const rows = await get(
    `/trigger_events?id=in.(${ids.join(",")})&select=id,event_name,event_category`,
  );
  let patched = 0;
  let skipped = 0;
  for (const r of rows) {
    const id = Number(r.id);
    const want = TRIGGER_EVENT_CATEGORY[id];
    const have = String(r.event_category ?? "");
    if (have === want) {
      console.log(`  = ${id} ${r.event_name}: already '${want}', skipping`);
      skipped++;
      continue;
    }
    if (have !== "") {
      console.log(`  ! ${id} ${r.event_name}: have '${have}', audit proposes '${want}'. Skipping (user must decide).`);
      skipped++;
      continue;
    }
    await patch(`/trigger_events?id=eq.${id}`, { event_category: want });
    console.log(`  + ${id} ${r.event_name}: '' -> '${want}'`);
    patched++;
  }
  console.log(`  total: ${patched} patched, ${skipped} skipped\n`);
  return patched;
}

// ---------------------------------------------------------------------------
// B1-S11 (1): domains.business_logic em-dash hygiene (Rule CLAUDE.md)
// ---------------------------------------------------------------------------

async function patchDomainBusinessLogicEmDash() {
  console.log("=== B1-S11 (1): domains id=66 business_logic em-dash hygiene ===");
  const rows = await get(`/domains?id=eq.66&select=id,business_logic`);
  if (rows.length === 0) {
    console.log("  ! domain id=66 missing, skipping");
    return 0;
  }
  const have = String(rows[0].business_logic ?? "");
  const EM_DASH = "—";
  if (!have.includes(EM_DASH)) {
    console.log("  = no em-dash present, skipping");
    return 0;
  }
  // Audit proposes replacing ' — ' (em-dash with surrounding spaces) with '; '.
  const next = have.replace(/ — /g, "; ").replace(/—/g, "; ");
  await patch(`/domains?id=eq.66`, { business_logic: next });
  console.log(`  + id=66 business_logic em-dash replaced.`);
  console.log(`    before: ${have}`);
  console.log(`    after:  ${next}\n`);
  return 1;
}

// ---------------------------------------------------------------------------
// B1-S11 (2): domain_data_objects.notes revert per Rule #15 (audit names row id)
// ---------------------------------------------------------------------------

async function patchDdoNotesRevert() {
  console.log("=== B1-S11 (2): domain_data_objects id=334 notes='' (Rule #15) ===");
  const rows = await get(
    `/domain_data_objects?id=eq.334&select=id,domain_id,data_object_id,role,notes`,
  );
  if (rows.length === 0) {
    console.log("  ! row id=334 missing, skipping");
    return 0;
  }
  const r = rows[0];
  if (r.domain_id !== 66 || r.data_object_id !== 196) {
    console.log(
      `  ! row id=334 composite key mismatch (domain_id=${r.domain_id}, data_object_id=${r.data_object_id}); audit names (66, 196). Aborting this patch only.`,
    );
    return 0;
  }
  const have = String(r.notes ?? "");
  if (have === "") {
    console.log("  = notes already empty, skipping");
    return 0;
  }
  await patch(`/domain_data_objects?id=eq.334`, { notes: "" });
  console.log(`  + id=334 (domain_id=66 contributor on cost_centers) notes reverted to ''.`);
  console.log(`    was: ${have}\n`);
  return 1;
}

// ---------------------------------------------------------------------------
// B1-H1: handoff_processes inserts (12 agent_curated, confident only)
//
// The audit's H1 table lists 22 proposals. Filter rules applied here:
//   1. CONFIDENT only (H1-01..H1-12, H1-14..H1-17, H1-19, H1-20). The 4
//      "medium" rows (H1-13/256, H1-18/534, H1-21/777, H1-22/792+795) are
//      DEFERRED as judgment.
//   2. Among the confident, the 6 rows whose (handoff_id, PCF) already
//      exist as discovery_substring (114/199-1324, 115/27-1324, 131/245-16,
//      153/540-1392, 155/563-1325, 156/564-1325) are DEFERRED. The audit
//      asks to flip their proposal_source to agent_curated; that is a
//      PATCH the prompt's TECHNICAL list does not authorize.
//   3. The remaining 12 mappings get inserted with proposal_source =
//      'agent_curated' and record_status omitted (Rule #1: DB default
//      'new' fires).
// ---------------------------------------------------------------------------

type HoSpec = { handoff_id: number; process_id: number; note: string };

const HO_SPECS: HoSpec[] = [
  { handoff_id: 10,   process_id: 1322, note: "EPM -> SWP financial_budget.cycle_started / Prepare periodic budgets and plans" },
  { handoff_id: 561,  process_id: 1323, note: "EPM -> ERP-FIN financial_plan.approved / Operationalize and implement plans to achieve budget" },
  { handoff_id: 562,  process_id: 297,  note: "EPM -> SPM financial_scenario.modeled / Perform planning/budgeting/forecasting" },
  { handoff_id: 601,  process_id: 1322, note: "EPM -> HCM financial_plan.approved / Prepare periodic budgets and plans" },
  { handoff_id: 1104, process_id: 247,  note: "PA -> EPM people_kpi.snapshot_published / Develop workforce analytics" },
  { handoff_id: 124,  process_id: 1379, note: "ERP-FIN -> EPM payroll_period.closed / Process journal entries" },
  { handoff_id: 133,  process_id: 1381, note: "ERP-FIN -> EPM accounting_period.closed / Process period end adjustments" },
  { handoff_id: 172,  process_id: 1323, note: "SPEND-MGMT -> EPM spend_commitment.created / Operationalize and implement plans to achieve budget" },
  { handoff_id: 246,  process_id: 297,  note: "SPM -> EPM scenario_plan.evaluated / Perform planning/budgeting/forecasting" },
  { handoff_id: 458,  process_id: 980,  note: "SWP -> EPM workforce_scenario.approved / Perform strategic workforce planning" },
  { handoff_id: 532,  process_id: 1381, note: "ERP-FIN -> EPM accounting_period.closed / Process period end adjustments" },
  { handoff_id: 535,  process_id: 54,   note: "ERP-FIN -> EPM cost_center.created / Perform planning and management accounting" },
];

async function insertHandoffProcesses() {
  console.log("=== B1-H1: handoff_processes inserts (agent_curated) ===");
  const handoffIds = HO_SPECS.map(s => s.handoff_id);
  const procIds = [...new Set(HO_SPECS.map(s => s.process_id))];

  const [handoffs, processes, existingHP] = await Promise.all([
    get(`/handoffs?id=in.(${handoffIds.join(",")})&select=id`),
    get(`/processes?id=in.(${procIds.join(",")})&select=id,process_name,source_framework`),
    get(`/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=id,handoff_id,process_id,proposal_source,record_status`),
  ]);

  console.log(`Pre-flight:`);
  console.log(`  ${handoffs.length} / ${handoffIds.length} target handoffs exist`);
  console.log(`  ${processes.length} / ${procIds.length} target PCFs resolve`);
  console.log(`  ${existingHP.length} pre-existing handoff_processes rows on these handoffs\n`);

  const missingH = handoffIds.filter(id => !handoffs.find((h: any) => h.id === id));
  if (missingH.length > 0) {
    console.log(`  !! Missing handoffs, aborting: ${missingH.join(", ")}`);
    process.exit(1);
  }
  const missingP = procIds.filter(id => !processes.find((p: any) => p.id === id));
  if (missingP.length > 0) {
    console.log(`  !! Missing processes, aborting: ${missingP.join(", ")}`);
    process.exit(1);
  }
  const nonPcf = processes.filter((p: any) => p.source_framework !== "apqc_pcf_cross_industry");
  if (nonPcf.length > 0) {
    console.log(`  !! Non-PCF processes referenced, aborting: ${nonPcf.map((p: any) => p.id).join(", ")}`);
    process.exit(1);
  }

  // Index existing rows by (handoff_id, process_id) to avoid (key) duplicates.
  const existingKey = new Set<string>();
  for (const r of existingHP) {
    existingKey.add(`${r.handoff_id}.${r.process_id}`);
  }

  const toInsert: any[] = [];
  const skipped: string[] = [];

  for (const s of HO_SPECS) {
    const key = `${s.handoff_id}.${s.process_id}`;
    if (existingKey.has(key)) {
      const ex = existingHP.find((r: any) => r.handoff_id === s.handoff_id && r.process_id === s.process_id);
      skipped.push(`  ! ${s.handoff_id} -> ${s.process_id}: existing row id=${ex.id} source=${ex.proposal_source}, skip (PATCH of source not authorized)`);
      continue;
    }
    toInsert.push({
      handoff_id: s.handoff_id,
      process_id: s.process_id,
      proposal_source: "agent_curated",
      // record_status omitted (Rule #1: DB default 'new' fires).
    });
    console.log(`  + ${s.handoff_id} -> ${s.process_id}  (${s.note})`);
  }

  if (skipped.length > 0) {
    console.log(`\nSkipped (pre-existing rows on the same handoff,process pair):`);
    for (const line of skipped) console.log(line);
  }

  if (toInsert.length === 0) {
    console.log(`\nNothing to insert.\n`);
    return 0;
  }

  console.log(`\nInserting ${toInsert.length} new handoff_processes rows...`);
  const inserted = await post("/handoff_processes", toInsert);
  console.log(`  ${inserted.length} inserted\n`);
  return inserted.length;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== EPM B1 technical residual fixes (2026-05-31) ===\n");

  const triggerPatched = await patchTriggerEventCategories();
  const domainPatched = await patchDomainBusinessLogicEmDash();
  const ddoPatched = await patchDdoNotesRevert();
  const hpInserted = await insertHandoffProcesses();

  console.log("\n=== Post-state spot-check ===");
  const [tev, dom, ddo, hp] = await Promise.all([
    get("/trigger_events?id=in.(583,584,585,586)&select=id,event_name,event_category"),
    get("/domains?id=eq.66&select=id,domain_code,business_logic"),
    get("/domain_data_objects?id=eq.334&select=id,notes"),
    get("/handoff_processes?handoff_id=in.(10,561,562,601,1104,124,133,172,246,458,532,535)&select=handoff_id,process_id,proposal_source,record_status&order=handoff_id.asc"),
  ]);
  console.log("trigger_events (4 rows):");
  for (const r of tev) console.log(`  ${r.id} ${r.event_name}: '${r.event_category}'`);
  console.log("domains id=66 business_logic:");
  for (const r of dom) console.log(`  '${r.business_logic}'`);
  console.log("domain_data_objects id=334 notes:");
  for (const r of ddo) console.log(`  '${r.notes}'`);
  console.log("handoff_processes (12 inserted handoffs):");
  for (const r of hp) console.log(`  ${r.handoff_id} -> ${r.process_id}  source=${r.proposal_source}  status=${r.record_status}`);

  console.log(`\nSummary: ${triggerPatched} trigger_event PATCHes, ${domainPatched} domain business_logic PATCH, ${ddoPatched} DDO notes revert, ${hpInserted} handoff_processes inserts.`);
  console.log("\n=== EPM B1 technical residual fixes complete ===");
}

await main();
