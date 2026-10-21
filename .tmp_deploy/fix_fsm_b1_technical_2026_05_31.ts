/**
 * FSM Bucket 1 residual technical fixes (continuation, 2026-05-31).
 *
 * Applies only the strictly mechanical Bucket 1 items from audits/FSM.md that
 * the rubric classifies as TECHNICAL:
 *
 *   B1-S2  PATCH 5 trigger_events.event_category enum backfills (999..1003).
 *   B1-S4  PATCH 3 inbound handoffs target_domain_module_id (FSM modules):
 *            292 -> 161, 318 -> 161, 1094 -> 162.
 *   B1-S5  PATCH 2 outbound handoffs source_domain_module_id (FSM side):
 *            292 -> 161, 318 -> 161.
 *   B1-S6  PATCH 6 inbound handoffs target_domain_module_id (FSM-DISPATCH-OPS 161):
 *            291, 299, 304, 940, 941, 945.
 *   B1-S7  PATCH handoff 1094 notes='' (Rule #15 revert; audit names row id).
 *   B1-S11 PATCH domains.id=31 business_logic: U+2014 -> ", "
 *            (em-dash forbidden per CLAUDE.md; American-English "optimization"
 *            replaces British "optimisation" per CLAUDE.md).
 *   H1     INSERT 12 handoff_processes rows (agent_curated) for the audit's
 *          "confident" candidates only. Medium-confidence rows (230 REPLACE,
 *          292, 1261, 940, 945) are deferred for user judgment.
 *
 * Deferred (NOT applied here):
 *   B1-S1   gated on B2-S1 (user picks DELETE vs PROMOTE).
 *   B1-S3   INSERT 3 domain_data_objects rollup rows (not in the residual
 *           technical allow-list; new domain-level junctions need user OK).
 *   B1-S10  INSERT 3 consumer DMDOs on FSM-DISPATCH-OPS (same reason).
 *   H1 rows tagged "medium" confidence and the REPLACE on 230.
 *
 * Run from project root (NEVER cd into .tmp_deploy):
 *   bun run c:/dev/domain-map/.tmp_deploy/fix_fsm_b1_technical_2026_05_31.ts
 */

interface CmdResult {
  ok: boolean;
  data: any;
  status: number;
  stderr: string;
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
    return { ok: false, data: null, status: code, stderr: stderr.trim() || stdout.trim() };
  }
  const text = stdout.trim();
  return { ok: true, data: text ? JSON.parse(text) : null, status: 0, stderr: "" };
}

function checkJwt(stderr: string): void {
  if (stderr.includes("This JWT does not have authorization to access this resource")) {
    console.error("\n!!! JWT AUDIENCE ERROR (Rule #6: STOP) !!!");
    console.error(stderr);
    process.exit(2);
  }
}

async function patch(path: string, body: any, label: string): Promise<boolean> {
  const r = await postgrest("PATCH", path, body);
  if (!r.ok) {
    checkJwt(r.stderr);
    console.error(`  FAIL ${label}: ${r.stderr}`);
    return false;
  }
  console.log(`  ok   ${label}`);
  return true;
}

async function post(path: string, body: any, label: string): Promise<boolean> {
  const r = await postgrest("POST", path, body);
  if (!r.ok) {
    checkJwt(r.stderr);
    console.error(`  FAIL ${label}: ${r.stderr}`);
    return false;
  }
  console.log(`  ok   ${label}`);
  return true;
}

let okCount = 0;
let failCount = 0;

function tally(ok: boolean) {
  if (ok) okCount++; else failCount++;
}

// ---------- B1-S2: trigger_events.event_category backfills ----------
console.log("\n[B1-S2] PATCH trigger_events event_category");
const eventCatMap: Array<[number, string]> = [
  [999,  "lifecycle"],
  [1000, "state_change"],
  [1001, "state_change"],
  [1002, "state_change"],
  [1003, "lifecycle"],
];
for (const [id, cat] of eventCatMap) {
  tally(await patch(`/trigger_events?id=eq.${id}`, { event_category: cat }, `trigger_event ${id} -> ${cat}`));
}

// ---------- B1-S4 + B1-S5 + B1-S6 + B1-S7: handoff FK + notes patches ----------
console.log("\n[B1-S4/S5/S6/S7] PATCH handoffs FK backfills + notes revert");

// 1094: target_domain_module_id=162 (FSM-INSTALLED-BASE), and notes='' (S7 revert)
tally(await patch(`/handoffs?id=eq.1094`,
  { target_domain_module_id: 162, notes: "" },
  "handoff 1094 target=162 + notes=''"));

// 292: source_domain_module_id=161 AND target_domain_module_id=161 (FSM source, REAL-EST target ambiguous; per audit target=161 DISPATCH-OPS feeds dispatch loop)
// Note: 292 is FSM -> REAL-EST. FSM is source. So target=161 here is wrong (target is a REAL-EST module).
// Re-reading audit B1-S4: "For 292 and 318: those handoffs land on payloads that aren't FSM masters ... target module is FSM-DISPATCH-OPS (161) since both feed the dispatch loop."
// But 292 source_domain=31 (FSM) and target_domain=141 (REAL-EST). target_domain_module_id MUST be a module in target_domain=141.
// The audit's B1-S4 text conflates which side is FSM for 292/318. Cross-check with B1-S5: "FSM owes its source backfill on 292 and 318". So for 292: source=FSM (audit says source_module=161). Target side belongs to REAL-EST audit.
// Same for 318: source=FSM, source_module=161; target side belongs to FLEET-MGMT audit.
// Therefore only set source_domain_module_id=161 here on 292 and 318 (per B1-S5).
tally(await patch(`/handoffs?id=eq.292`,
  { source_domain_module_id: 161 },
  "handoff 292 source=161 (FSM-DISPATCH-OPS)"));
tally(await patch(`/handoffs?id=eq.318`,
  { source_domain_module_id: 161 },
  "handoff 318 source=161 (FSM-DISPATCH-OPS)"));

// B1-S6: 6 inbound (FSM is target) -> target_domain_module_id=161
const inboundTarget = [291, 299, 304, 940, 941, 945];
for (const id of inboundTarget) {
  tally(await patch(`/handoffs?id=eq.${id}`,
    { target_domain_module_id: 161 },
    `handoff ${id} target=161 (FSM-DISPATCH-OPS)`));
}

// ---------- B1-S11: domains.id=31 business_logic em-dash + Americanization ----------
console.log("\n[B1-S11] PATCH domains.id=31 business_logic (em-dash + en-US)");
const newBusinessLogic = "Routing and dispatch optimization under technician skill, parts, SLA, and travel constraints, operations-research solver at the core.";
tally(await patch(`/domains?id=eq.31`,
  { business_logic: newBusinessLogic },
  "domains.id=31 business_logic sanitized"));

// ---------- H1: handoff_processes confident inserts (12 rows, agent_curated) ----------
console.log("\n[H1] INSERT handoff_processes (12 confident rows)");
type HpRow = { handoff_id: number; process_id: number; proposal_source: string };
const hpRows: HpRow[] = [
  { handoff_id: 229,  process_id: 196 }, // FSM-DISPATCH-OPS -> CSM, work_order.completed
  { handoff_id: 883,  process_id: 196 }, // FSM-DISPATCH-OPS -> CSM, service_work_order.completed
  { handoff_id: 884,  process_id: 862 }, // FSM-DISPATCH-OPS -> FLEET-MGMT, sv_wo.assigned
  { handoff_id: 885,  process_id: 302 }, // FSM-DISPATCH-OPS -> ERP-FIN, sv_wo.completed
  { handoff_id: 1260, process_id: 353 }, // FSM-INSTALLED-BASE -> EAM, installed_equipment.decommissioned
  { handoff_id: 1262, process_id: 736 }, // FSM-INSTALLED-BASE -> CRM, customer_site.activated
  { handoff_id: 318,  process_id: 862 }, // FSM-DISPATCH-OPS -> FLEET-MGMT, vehicle.dispatched
  { handoff_id: 291,  process_id: 824 }, // REAL-EST -> FSM, facility_work_order.created
  { handoff_id: 299,  process_id: 824 }, // RE-PROP-MGMT -> FSM, tenant_maintenance_request.created
  { handoff_id: 304,  process_id: 824 }, // RE-CRE -> FSM, tenant_maintenance_request.created
  { handoff_id: 941,  process_id: 828 }, // UTIL-OPS -> FSM, utility_asset.failed
  { handoff_id: 1094, process_id: 552 }, // PLM -> FSM-INSTALLED-BASE, cad_drawing.released
].map(r => ({ ...r, proposal_source: "agent_curated" }));

// Pre-flight: skip any (handoff_id, process_id) that already exists (idempotency on `key`)
const existing = await postgrest("GET",
  `/handoff_processes?handoff_id=in.(${hpRows.map(r => r.handoff_id).join(",")})&select=handoff_id,process_id`);
if (!existing.ok) {
  checkJwt(existing.stderr);
  console.error(`  pre-flight GET failed: ${existing.stderr}`);
  process.exit(1);
}
const existingSet = new Set<string>(
  (existing.data ?? []).map((r: any) => `${r.handoff_id}.${r.process_id}`)
);
const toInsert = hpRows.filter(r => !existingSet.has(`${r.handoff_id}.${r.process_id}`));
const skipped = hpRows.length - toInsert.length;
if (skipped > 0) console.log(`  pre-flight: ${skipped} row(s) already exist, skipping`);

if (toInsert.length > 0) {
  tally(await post(`/handoff_processes`, toInsert, `INSERT ${toInsert.length} handoff_processes rows`));
}

// ---------- Summary ----------
console.log(`\nDone. ok=${okCount} fail=${failCount}`);
if (failCount > 0) process.exit(1);
