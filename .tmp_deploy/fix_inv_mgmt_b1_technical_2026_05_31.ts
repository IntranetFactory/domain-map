#!/usr/bin/env bun
/**
 * INV-MGMT B1 technical fixes per audits/INV-MGMT.md (2026-05-30 audit).
 *
 * Applies only the truly-technical, audit-pre-specified items:
 *
 *   1. B1-S2 trigger_events for workflow-gate states
 *      INSERT 6 trigger_events the audit pre-specifies as missing matches for
 *      `requires_permission=true` lifecycle states (788/789/790/792 masters).
 *      Each row carries data_object_id, event_name, event_category, from_state,
 *      to_state derived from the published state machine. record_status omitted
 *      (DB default 'new' per Rule #1).
 *
 *   2. B1-H1 APQC handoff_processes (single-PCF subset)
 *      INSERT 5 (handoff_id, process_id) pairs where the audit pre-specifies a
 *      single confident PCF. 4 rows where the audit lists two PCF candidates
 *      ("A or B") are deferred to user pick. 2 rows (1051, 1052) already exist.
 *      role='implements', proposal_source='agent_curated', record_status default.
 *
 * Items deliberately deferred (out of scope for this technical pass):
 *   - B1-S1 (M7 + B5): gated on B2-S6 user choice (DELETE vs PROMOTE 4 rows)
 *     and the B5 master rows are owed by B2C-COMM / OMS, report-only here.
 *   - B1-S3 (intra-domain handoffs): new handoff rows are not in the technical
 *     allow-list; also depends on a new inv_kit.assembled event that the audit
 *     only mentions in S3 context, not S2.
 *   - B1-S4 (B10b report-only): owed by S2P/OMS/ERP-FIN/CSM/GRC/B2C-COMM.
 *   - B1-S5 (system skills + skill_tools): full Phase-S load, deferred.
 *   - B1-H1 multi-PCF rows (1050, 1054, 1055, 1058): audit lists 2 candidates,
 *     user picks.
 *
 * Idempotent: reads existing state before writing.
 *
 * Run from project root:
 *   bun run .tmp_deploy/fix_inv_mgmt_b1_technical_2026_05_31.ts
 */

type Row = Record<string, unknown>;

async function semCall(tool: string, payload: Row, opts: { single?: boolean } = {}): Promise<any> {
  const args = ["semantius"];
  if (opts.single) args.push("--single");
  args.push("call", "crud", tool);
  const proc = Bun.spawn(args, { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    if (opts.single && code === 1) return null;
    throw new Error(`${tool} (exit ${code}): ${stderr || stdout}`);
  }
  const t = stdout.trim();
  return t ? JSON.parse(t) : null;
}

const get = (path: string) =>
  semCall("postgrestRequest", { method: "GET", path }) as Promise<any[]>;
const post = (path: string, body: Row | Row[]) =>
  semCall("postgrestRequest", { method: "POST", path, body }) as Promise<any[]>;

// --- B1-S2: trigger_events for workflow-gate states --------------------

type TriggerEventSpec = {
  event_name: string;
  data_object_id: number;
  event_category: "state_change" | "lifecycle";
  from_state: string;
  to_state: string;
  description: string;
};

// Per audit B1-S2: 6 requires_permission=true lifecycle states have no matching
// trigger_event. data_object_id is the publishing master per the audit; states
// and category derived from the published state machine on data_object_lifecycle_states.
const TRIGGER_EVENTS: TriggerEventSpec[] = [
  {
    event_name: "inv_stock_movement.posted",
    data_object_id: 788, // inv_stock_movements
    event_category: "state_change",
    from_state: "pending",
    to_state: "posted",
    description: "Stock movement posted: ledger row committed and stock balances updated.",
  },
  {
    event_name: "inv_stock_movement.reversed",
    data_object_id: 788,
    event_category: "state_change",
    from_state: "posted",
    to_state: "reversed",
    description: "Stock movement reversed: a compensating ledger row was posted to undo a prior movement.",
  },
  {
    event_name: "inv_stock_transfer.approved",
    data_object_id: 789, // inv_stock_transfers
    event_category: "state_change",
    from_state: "requested",
    to_state: "approved",
    description: "Stock transfer approved and cleared to ship from source location.",
  },
  {
    event_name: "inv_stock_transfer.reconciled",
    data_object_id: 789,
    event_category: "state_change",
    from_state: "discrepancy",
    to_state: "reconciled",
    description: "Stock transfer reconciled after a discrepancy review, ledger adjustments posted.",
  },
  {
    event_name: "inv_cycle_count.variance_review",
    data_object_id: 790, // inv_cycle_counts
    event_category: "lifecycle",
    from_state: "counting",
    to_state: "variance_review",
    description: "Cycle count entered variance review: variance exceeds threshold and needs accounting approval.",
  },
  {
    event_name: "inv_serialized_unit.scrapped",
    data_object_id: 792, // inv_serialized_units
    event_category: "state_change",
    from_state: "returned",
    to_state: "scrapped",
    description: "Serialized unit scrapped: end of useful life, terminal state.",
  },
];

async function loadTriggerEvents() {
  console.log("\n=== B1-S2: trigger_events for workflow-gate states ===");

  const names = TRIGGER_EVENTS.map((e) => e.event_name);
  const namesEnc = names.map((n) => `"${n}"`).join(",");
  const existing = await get(
    `/trigger_events?event_name=in.(${namesEnc})&select=id,event_name,data_object_id,event_category`,
  );
  const existingNames = new Set(existing.map((r) => String(r.event_name)));
  console.log(`  existing matches by event_name: ${existing.length}`);

  // Pre-flight: verify data_object_ids resolve.
  const doIds = Array.from(new Set(TRIGGER_EVENTS.map((e) => e.data_object_id)));
  const liveDOs = await get(`/data_objects?id=in.(${doIds.join(",")})&select=id`);
  const liveDOSet = new Set(liveDOs.map((r) => Number(r.id)));
  for (const id of doIds) {
    if (!liveDOSet.has(id)) {
      throw new Error(`data_object ${id} not found; cannot insert trigger_events`);
    }
  }
  console.log(`  + all ${doIds.length} referenced data_objects resolve`);

  const toInsert = TRIGGER_EVENTS.filter((e) => !existingNames.has(e.event_name));
  if (toInsert.length === 0) {
    console.log("  = nothing to insert; all 6 events already exist");
    return;
  }
  console.log(`  + inserting ${toInsert.length} new trigger_events rows`);
  const inserted = await post("/trigger_events", toInsert);
  console.log(`  + inserted ${inserted.length} rows`);

  // Post-flight: all 6 events now present.
  const after = await get(
    `/trigger_events?event_name=in.(${namesEnc})&select=id,event_name,event_category`,
  );
  if (after.length !== TRIGGER_EVENTS.length) {
    throw new Error(
      `post-flight: expected ${TRIGGER_EVENTS.length} events, got ${after.length}`,
    );
  }
  console.log(`  + verified: all ${after.length} trigger_events present`);
  for (const r of after) {
    console.log(`    ${r.id} ${r.event_name} (${r.event_category})`);
  }
}

// --- B1-H1: APQC handoff_processes (single-PCF subset) -----------------

// (handoff_id, process_id, confidence-note) from the audit's APQC TAGGING table,
// restricted to rows where the audit specifies a SINGLE confident PCF.
// Deferred (multi-PCF, user picks): 1050 (826 or 852), 1054 (859 or 1326),
// 1055 (206 or 37, medium confidence), 1058 (201 or 122).
// Already loaded: 1051 -> 854, 1052 -> 854.
const APQC_PAIRS: Array<[number, number]> = [
  [1053, 1326], // inv_cycle_count.variance_posted -> Perform inventory accounting (10774), confident L4
  [1056, 204],  // inv_inventory_lot.recall_initiated (to CSM) -> Initiate recall (20111), confident L3
  [1057, 208],  // inv_inventory_lot.recall_initiated (to GRC) -> Monitor and audit recall effectiveness (20115), confident L3
  [1059, 854],  // inv_stock_item.created -> Track product availability (10355), confident L4
  [1235, 854],  // inbound pim_product.published -> Track product availability (10355), confident L4
];

async function loadApqcHandoffProcesses() {
  console.log("\n=== B1-H1: APQC handoff_processes (single-PCF subset) ===");

  // Verify all referenced handoffs exist.
  const handoffIds = Array.from(new Set(APQC_PAIRS.map(([h]) => h)));
  const liveHandoffs = await get(
    `/handoffs?id=in.(${handoffIds.join(",")})&select=id`,
  );
  const liveHandoffSet = new Set(liveHandoffs.map((r) => Number(r.id)));
  for (const h of handoffIds) {
    if (!liveHandoffSet.has(h)) {
      throw new Error(`handoff ${h} not found in /handoffs; cannot insert handoff_processes`);
    }
  }
  console.log(`  + all ${handoffIds.length} referenced handoffs resolve`);

  // Verify all referenced PCF processes exist and are apqc_pcf_cross_industry.
  const processIds = Array.from(new Set(APQC_PAIRS.map(([, p]) => p)));
  const liveProcs = await get(
    `/processes?id=in.(${processIds.join(",")})&select=id,source_framework`,
  );
  const liveProcMap = new Map(liveProcs.map((r) => [Number(r.id), String(r.source_framework)]));
  for (const p of processIds) {
    const sf = liveProcMap.get(p);
    if (!sf) throw new Error(`process ${p} not found in /processes`);
    if (sf !== "apqc_pcf_cross_industry") {
      throw new Error(`process ${p} source_framework='${sf}', expected 'apqc_pcf_cross_industry'`);
    }
  }
  console.log(`  + all ${processIds.length} referenced PCF processes resolve and are apqc_pcf_cross_industry`);

  // Pull existing rows to avoid duplicate inserts (unique on key=handoff_id.process_id).
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=handoff_id,process_id`,
  );
  const existingPairs = new Set(existing.map((r) => `${r.handoff_id}.${r.process_id}`));
  console.log(`  existing handoff_processes rows on these handoffs: ${existing.length}`);

  const toInsert = APQC_PAIRS.filter(([h, p]) => !existingPairs.has(`${h}.${p}`)).map(([h, p]) => ({
    handoff_id: h,
    process_id: p,
    role: "implements",
    proposal_source: "agent_curated",
    // record_status omitted -- DB default 'new' per Rule #1.
  }));

  if (toInsert.length === 0) {
    console.log("  = nothing to insert; all pairs already exist");
    return;
  }
  console.log(`  + inserting ${toInsert.length} new rows`);
  const inserted = await post("/handoff_processes", toInsert);
  console.log(`  + inserted ${inserted.length} rows`);

  // Post-flight: all pairs now present.
  const after = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=handoff_id,process_id`,
  );
  const afterPairs = new Set(after.map((r) => `${r.handoff_id}.${r.process_id}`));
  const missing = APQC_PAIRS.filter(([h, p]) => !afterPairs.has(`${h}.${p}`));
  if (missing.length > 0) {
    throw new Error(`post-flight: missing handoff_processes rows: ${missing.map(([h, p]) => `${h}->${p}`).join(", ")}`);
  }
  console.log(`  + verified: all ${APQC_PAIRS.length} (handoff_id, process_id) pairs present`);
}

async function main() {
  console.log("INV-MGMT B1 technical fixes (2026-05-31)");
  console.log("=========================================");
  await loadTriggerEvents();
  await loadApqcHandoffProcesses();
  console.log("\nOK");
  console.log("UI:");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
