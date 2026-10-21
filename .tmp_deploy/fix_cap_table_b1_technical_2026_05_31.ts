/**
 * CAP-TABLE B1 technical fixes (2026-05-31 continuation).
 *
 * Applies the truly-technical subset of the B1 backlog from
 * audits/CAP-TABLE.md. Judgment items defer.
 *
 * Scope (technical only):
 *   1. B1-S1: PATCH event_category='lifecycle' on trigger_event 427
 *      (equity_grant.vested). Audit pre-specified the mapping (vesting is a
 *      recurring time-driven checkpoint, matches CLM precedent
 *      contract_obligation.due -> lifecycle). Trigger 426 is already
 *      state_change in live (audit said empty; live is correct), so no PATCH
 *      is needed there.
 *   2. B1-S5: PATCH domain_module_id on 14 lifecycle states from NULL to
 *      the realizing CAP-TABLE module (B10b FK derivable from existing
 *      modules and the canonical master DMDO).
 *        - cap_tables (770) states 466,467,468 -> module 20 (LEDGER)
 *        - valuations_409a (775) states 462,463,464,465 -> module 22 (VALUATIONS)
 *        - exit_scenarios (777) states 469,470,471 -> module 23 (EXIT-MODELING)
 *        - secondary_transactions (780) states 472,473,474,475 -> module 25 (SECONDARY)
 *   3. B1-S9 (partial): INSERT 1 domain_regulations row attaching the
 *      existing SOX regulation (id 5) to CAP-TABLE (162). Other 6 regulations
 *      (409A, ASC 718, SEC Rule 701, Reg D/Form D, Form 3921, Form 3922) are
 *      deferred because the regulations rows do not yet exist; creating new
 *      regulations entities is outside the technical-only scope.
 *   4. B1-H1: INSERT 2 handoff_processes rows for handoff 1044 (CAP-TABLE
 *      -> FUND-ADMIN, exit_scenario.executed -> fund_distributions). Audit
 *      pre-specifies PCF process ids 354 (L3 "Develop exit strategy") and
 *      491 (L4 "Develop merger/demerger/acquisition/exit strategy"). Both
 *      verified resolvable in /processes. Handoff 1045 already has a
 *      handoff_processes row (635) for process 354, so no insert there.
 *
 * Deferred (require judgment, new entities, or pre-conditions not met):
 *   B1-S2 (new intra-domain handoff rows; new entities, plus 3 gated on
 *     new trigger_events from B1-S3),
 *   B1-S3 (new trigger_events; new entities),
 *   B1-S4 (gated on B2-S1 user choice between PATCH / DUPLICATE / keep),
 *   B1-S6 (new lifecycle states + 3 exemptions gated on B2-S6),
 *   B1-S7 (full Phase E roles + permissions; new entities),
 *   B1-S8 (full Phase F skills + skill_tools; new entities),
 *   B1-S9 partial (6 regulations require new regulations entities),
 *   B1-S10 (new inter-domain handoffs; new entities, 1 gated on B2-S2),
 *   B1-S11 (notes='' revert gated on B2-S3 user confirmation).
 *
 * Run from project root: bun run .tmp_deploy/fix_cap_table_b1_technical_2026_05_31.ts
 */

interface CmdResult {
  ok: boolean;
  data: any;
  status: number;
  err?: string;
}

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" }
  );
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    const err = (stderr || stdout).trim();
    if (err.includes("JWT") && err.includes("audience")) {
      console.error("\n!!! JWT AUDIENCE ERROR !!!");
      console.error(err);
      console.error("STOP per SKILL.md Rule #6. Surface verbatim and halt.");
      process.exit(2);
    }
    return { ok: false, data: null, status: code, err };
  }
  const text = stdout.trim();
  return { ok: true, data: text ? JSON.parse(text) : null, status: 0 };
}

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.err}`);
  return r.data;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await postgrest("PATCH", path, body);
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.err}`);
  return r.data;
}

async function post(path: string, body: any): Promise<any> {
  const r = await postgrest("POST", path, body);
  if (!r.ok) throw new Error(`POST ${path} failed: ${r.err}`);
  return r.data;
}

const CAP_TABLE_DOMAIN = 162;
const SOX_REGULATION = 5;

// CAP-TABLE module ids.
const M_LEDGER = 20;
const M_GRANTS = 21;
const M_VALUATIONS = 22;
const M_EXIT_MODELING = 23;
// const M_EMPLOYEE_PORTAL = 24;
const M_SECONDARY = 25;

// ---------------------------------------------------------------------------
// 1. B1-S1: PATCH event_category on trigger_event 427.
// ---------------------------------------------------------------------------
async function fixTriggerEventCategories() {
  console.log("\n[B1-S1] PATCH event_category on equity_grant.vested (427) -> lifecycle");
  const live = await get(`/trigger_events?id=in.(426,427)&select=id,event_name,event_category`);
  for (const row of live as any[]) {
    console.log(`  Live: ${row.id} ${row.event_name} event_category='${row.event_category}'`);
  }
  const target = (live as any[]).find((r) => r.id === 427);
  if (!target) {
    console.log("  WARN: trigger_event 427 not found; skipping.");
    return;
  }
  if (target.event_category === "lifecycle") {
    console.log("  SKIP: trigger_event 427 already 'lifecycle'.");
    return;
  }
  await patch(`/trigger_events?id=eq.427`, { event_category: "lifecycle" });
  console.log("    PATCH trigger_events.427 (equity_grant.vested) -> lifecycle");
}

// ---------------------------------------------------------------------------
// 2. B1-S5: PATCH domain_module_id on 14 lifecycle states.
// ---------------------------------------------------------------------------
const LIFECYCLE_STATE_PATCHES: Array<{ id: number; module: number; data_object_id: number; state_name: string }> = [
  // valuations_409a (775) -> VALUATIONS (22)
  { id: 462, module: M_VALUATIONS, data_object_id: 775, state_name: "drafted" },
  { id: 463, module: M_VALUATIONS, data_object_id: 775, state_name: "reviewed" },
  { id: 464, module: M_VALUATIONS, data_object_id: 775, state_name: "final" },
  { id: 465, module: M_VALUATIONS, data_object_id: 775, state_name: "superseded" },
  // cap_tables (770) -> LEDGER (20)
  { id: 466, module: M_LEDGER, data_object_id: 770, state_name: "nascent" },
  { id: 467, module: M_LEDGER, data_object_id: 770, state_name: "active" },
  { id: 468, module: M_LEDGER, data_object_id: 770, state_name: "exit" },
  // exit_scenarios (777) -> EXIT-MODELING (23)
  { id: 469, module: M_EXIT_MODELING, data_object_id: 777, state_name: "hypothetical" },
  { id: 470, module: M_EXIT_MODELING, data_object_id: 777, state_name: "committed" },
  { id: 471, module: M_EXIT_MODELING, data_object_id: 777, state_name: "executed" },
  // secondary_transactions (780) -> SECONDARY (25)
  { id: 472, module: M_SECONDARY, data_object_id: 780, state_name: "drafted" },
  { id: 473, module: M_SECONDARY, data_object_id: 780, state_name: "approved" },
  { id: 474, module: M_SECONDARY, data_object_id: 780, state_name: "executed" },
  { id: 475, module: M_SECONDARY, data_object_id: 780, state_name: "settled" },
];

async function fixLifecycleStateModules() {
  console.log("\n[B1-S5] PATCH domain_module_id on 14 lifecycle states (null -> realizing module)");

  const ids = LIFECYCLE_STATE_PATCHES.map((p) => p.id);
  const live = (await get(
    `/data_object_lifecycle_states?id=in.(${ids.join(",")})&select=id,data_object_id,state_name,domain_module_id`
  )) as any[];

  // Cross-check live data_object_id matches expected, and verify the master DMDO
  // for each data_object resolves to the intended module (B10b derivability check).
  const masterDmdo = (await get(
    `/domain_module_data_objects?data_object_id=in.(770,775,777,780)&role=eq.master&select=data_object_id,domain_module_id`
  )) as any[];
  const masterByDo = new Map<number, number>(masterDmdo.map((r) => [r.data_object_id, r.domain_module_id]));

  let patched = 0;
  for (const p of LIFECYCLE_STATE_PATCHES) {
    const row = live.find((r) => r.id === p.id);
    if (!row) {
      console.log(`  WARN: state ${p.id} not found; skipping.`);
      continue;
    }
    if (row.data_object_id !== p.data_object_id) {
      console.log(`  WARN: state ${p.id} data_object_id=${row.data_object_id}, expected ${p.data_object_id}; skipping.`);
      continue;
    }
    if (row.domain_module_id !== null && row.domain_module_id !== undefined) {
      console.log(`  SKIP: state ${p.id} (${p.state_name}) already has domain_module_id=${row.domain_module_id}.`);
      continue;
    }
    const expectedMaster = masterByDo.get(p.data_object_id);
    if (expectedMaster !== p.module) {
      console.log(`  WARN: master DMDO for data_object ${p.data_object_id} is module ${expectedMaster}, expected ${p.module}; skipping (B10b derivability check failed).`);
      continue;
    }
    await patch(`/data_object_lifecycle_states?id=eq.${p.id}`, { domain_module_id: p.module });
    console.log(`    PATCH state ${p.id} (${p.state_name} on ${p.data_object_id}) -> module ${p.module}`);
    patched++;
  }
  console.log(`  Patched ${patched} lifecycle state row(s).`);
}

// ---------------------------------------------------------------------------
// 3. B1-S9 (partial): INSERT 1 domain_regulations row for SOX -> CAP-TABLE.
// ---------------------------------------------------------------------------
async function attachExistingRegulations() {
  console.log("\n[B1-S9 partial] INSERT domain_regulations rows for already-existing regulations");

  // Re-check regulations table for any of the 7 audit-named items.
  const reg = (await get(
    `/regulations?or=(regulation_name.ilike.*409A*,regulation_name.ilike.*ASC%20718*,regulation_name.ilike.*Rule%20701*,regulation_name.ilike.*Reg%20D*,regulation_name.ilike.*Form%20D*,regulation_name.ilike.*Form%203921*,regulation_name.ilike.*Form%203922*,regulation_name.ilike.*Sarbanes*)&select=id,regulation_code,regulation_name`
  )) as any[];
  console.log(`  Found ${reg.length} matching regulation row(s):`);
  for (const r of reg) console.log(`    id=${r.id} code=${r.regulation_code} name=${r.regulation_name}`);

  // Check what's already attached to CAP-TABLE.
  const existing = (await get(
    `/domain_regulations?domain_id=eq.${CAP_TABLE_DOMAIN}&select=id,regulation_id`
  )) as any[];
  const haveRegIds = new Set<number>(existing.map((r) => r.regulation_id));
  console.log(`  ${existing.length} existing domain_regulations row(s) on CAP-TABLE.`);

  // Build inserts only for the SOX row (id 5). Other 6 require new regulations entities, deferred.
  const inserts: any[] = [];
  if (reg.find((r) => r.id === SOX_REGULATION) && !haveRegIds.has(SOX_REGULATION)) {
    inserts.push({
      domain_id: CAP_TABLE_DOMAIN,
      regulation_id: SOX_REGULATION,
      applicability: "conditional",
      // condition_notes left empty (mechanical pre-fill would be inferred prose)
      // notes omitted per Rule #15
      // record_status omitted per Rule #1
    });
  } else {
    console.log("  SOX already attached or not present in regulations; skipping SOX.");
  }
  if (inserts.length === 0) {
    console.log("  Nothing to insert.");
    return;
  }
  const inserted = await post(`/domain_regulations`, inserts);
  console.log(`  Inserted ${(inserted as any[])?.length ?? inserts.length} domain_regulations row(s).`);
}

// ---------------------------------------------------------------------------
// 4. B1-H1: INSERT 2 handoff_processes rows for handoff 1044.
// ---------------------------------------------------------------------------
const HANDOFF_PROCESS_INSERTS: Array<{ handoff_id: number; process_id: number; label: string }> = [
  { handoff_id: 1044, process_id: 354, label: "Develop exit strategy (L3)" },
  { handoff_id: 1044, process_id: 491, label: "Develop merger/demerger/acquisition/exit strategy (L4)" },
];

async function insertHandoffProcesses() {
  console.log("\n[B1-H1] INSERT handoff_processes rows for handoff 1044");

  // Verify handoffs and processes exist before inserting.
  const handoffs = (await get(`/handoffs?id=in.(1044,1045)&select=id`)) as any[];
  const haveHandoff = new Set<number>(handoffs.map((r) => r.id));
  const procs = (await get(`/processes?id=in.(354,491)&select=id,process_name,hierarchy_level`)) as any[];
  const haveProc = new Set<number>(procs.map((r) => r.id));
  console.log(`  Pre-flight: handoffs found ${[...haveHandoff].join(",")}; processes found ${procs.map((p) => `${p.id}(${p.hierarchy_level})`).join(",")}`);

  const existing = (await get(
    `/handoff_processes?handoff_id=in.(1044,1045)&select=id,handoff_id,process_id`
  )) as any[];
  const existingKeys = new Set<string>(existing.map((r) => `${r.handoff_id}|${r.process_id}`));
  console.log(`  Pre-flight: ${existing.length} existing handoff_processes row(s) on the 2 audit handoffs.`);

  const rows: any[] = [];
  for (const ins of HANDOFF_PROCESS_INSERTS) {
    if (!haveHandoff.has(ins.handoff_id)) {
      console.log(`  WARN: handoff ${ins.handoff_id} not found; skipping.`);
      continue;
    }
    if (!haveProc.has(ins.process_id)) {
      console.log(`  WARN: process ${ins.process_id} not found; skipping.`);
      continue;
    }
    const key = `${ins.handoff_id}|${ins.process_id}`;
    if (existingKeys.has(key)) {
      console.log(`  SKIP: ${key} (${ins.label}) already present.`);
      continue;
    }
    rows.push({
      handoff_id: ins.handoff_id,
      process_id: ins.process_id,
      role: "implements",
      proposal_source: "agent_curated",
      // record_status omitted per Rule #1 (default 'new')
      // notes omitted per Rule #15
    });
  }
  if (rows.length === 0) {
    console.log("  Nothing to insert.");
    return;
  }
  console.log(`  Inserting ${rows.length} row(s)...`);
  const inserted = await post(`/handoff_processes`, rows);
  console.log(`  Done. ${(inserted as any[])?.length ?? rows.length} row(s) created.`);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  console.log("CAP-TABLE B1 technical fixes (2026-05-31)");
  await fixTriggerEventCategories();
  await fixLifecycleStateModules();
  await attachExistingRegulations();
  await insertHandoffProcesses();
  console.log("\nAll applicable technical bands applied.");
}

await main();
