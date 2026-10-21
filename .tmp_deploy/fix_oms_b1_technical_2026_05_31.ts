#!/usr/bin/env bun
/**
 * OMS B1 technical fixes per audits/OMS.md (2026-05-30 audit).
 *
 * Applies only the truly-technical, audit-pre-specified items:
 *
 *   1. B1-S7 trigger_events.event_category backfill
 *      PATCH 13 OMS-published trigger_events (ids 1125..1137).
 *      12 of 13 are state_change-shaped; row 1126
 *      (inventory_location.capacity_threshold_breached) is threshold-shaped.
 *
 *   2. B1-H1 APQC handoff_processes
 *      INSERT 19 (handoff_id, process_id) pairs as pre-specified in the audit
 *      table. role='implements', proposal_source='agent_curated', record_status
 *      omitted to take the column default ('new') per Rule #1.
 *
 * Items deliberately deferred (out of scope for this technical pass):
 *   - B1-S1 / B1-S2 (new modules / capabilities) -- new entities, not technical
 *   - B1-S3 (catalog_tagline/description) -- Rule #20 buyer-voice review
 *   - B1-S4 (intra/cross relationships) -- audit doesn't pre-specify the
 *     relationship_type / relationship_kind / owner_side / is_required tuples
 *   - B1-S5 (users edges) -- audit names candidates but not exact verb tuples
 *   - B1-S6 (aliases) -- bulk; not pre-specified per-row with alias_type
 *   - B1-S8 (lifecycle state domain_module_id PATCH) -- gated on B1-S1
 *   - B1-S9 (F7 send_email -> notify_person) -- not in the technical allow-list
 *   - B1-S10 (other domains' B10b) -- owed by other domains, report-only
 *
 * Idempotent: each step reads existing state before writing.
 *
 * Run from project root:
 *   bun run .tmp_deploy/fix_oms_b1_technical_2026_05_31.ts
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
const patch = (path: string, body: Row) =>
  semCall("postgrestRequest", { method: "PATCH", path, body }) as Promise<any[]>;

// --- B1-S7: trigger_events.event_category backfill ----------------------

// id -> event_category. From audits/OMS.md B1-S7.
const TRIGGER_EVENT_CATEGORIES: Record<number, "state_change" | "threshold"> = {
  1125: "state_change", // inventory_location.opened
  1126: "threshold",    // inventory_location.capacity_threshold_breached
  1127: "state_change", // order_allocation.created
  1128: "state_change", // order_allocation.failed
  1129: "state_change", // order_allocation.reassigned
  1130: "state_change", // return_authorization.issued
  1131: "state_change", // return_authorization.received
  1132: "state_change", // return_authorization.expired
  1133: "state_change", // sourcing_decision.computed
  1134: "state_change", // sourcing_decision.overridden
  1135: "state_change", // store_pickup_order.created
  1136: "state_change", // store_pickup_order.ready
  1137: "state_change", // store_pickup_order.expired
};

async function backfillTriggerEventCategories() {
  console.log("\n=== B1-S7: trigger_events.event_category backfill ===");
  const ids = Object.keys(TRIGGER_EVENT_CATEGORIES).map(Number);
  const live = await get(
    `/trigger_events?id=in.(${ids.join(",")})&select=id,event_name,event_category`,
  );
  const byId = new Map<number, { event_name: string; event_category: string }>();
  for (const r of live) {
    byId.set(Number(r.id), { event_name: String(r.event_name), event_category: String(r.event_category ?? "") });
  }

  let patched = 0;
  let skipped = 0;
  for (const id of ids) {
    const cur = byId.get(id);
    if (!cur) {
      throw new Error(`trigger_events row ${id} not found in live catalog`);
    }
    const target = TRIGGER_EVENT_CATEGORIES[id];
    if (cur.event_category === target) {
      console.log(`  = ${id} ${cur.event_name}: already ${target}, skipping`);
      skipped++;
      continue;
    }
    if (cur.event_category && cur.event_category !== target) {
      // Existing non-empty value that doesn't match -- surface, don't overwrite silently.
      console.log(
        `  ! ${id} ${cur.event_name}: existing event_category="${cur.event_category}" does not match target "${target}". Skipping; surface to user.`,
      );
      skipped++;
      continue;
    }
    const res = await patch(`/trigger_events?id=eq.${id}`, { event_category: target });
    console.log(`  + ${id} ${cur.event_name}: '' -> '${target}' (rows: ${res.length})`);
    patched++;
  }

  // Verify.
  const after = await get(
    `/trigger_events?id=in.(${ids.join(",")})&select=id,event_category&order=id.asc`,
  );
  const stillEmpty = after.filter((r) => !r.event_category);
  if (stillEmpty.length > 0) {
    throw new Error(
      `post-flight: trigger_events with empty event_category remain: ${stillEmpty.map((r) => r.id).join(",")}`,
    );
  }
  console.log(`  summary: ${patched} patched, ${skipped} skipped, ${after.length} verified non-empty`);
}

// --- B1-H1: APQC handoff_processes -------------------------------------

// (handoff_id, process_id) from the audit's APQC TAGGING table.
const APQC_PAIRS: Array<[number, number]> = [
  [981, 852],
  [982, 854],
  [983, 1380],
  [984, 740],
  [985, 814],
  [986, 738],
  [987, 936],
  [988, 937],
  [989, 850],
  [990, 738],
  [991, 855],
  [992, 814],
  [993, 740],
  [994, 735],
  [995, 850],
  [322, 735],
  [502, 735],
  [1051, 854],
  [1052, 854],
];

async function loadApqcHandoffProcesses() {
  console.log("\n=== B1-H1: APQC handoff_processes ===");

  // Verify all 19 handoffs exist.
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

  // Verify all referenced PCF processes exist and belong to apqc_pcf_cross_industry.
  const processIds = Array.from(new Set(APQC_PAIRS.map(([, p]) => p)));
  const liveProcs = await get(
    `/processes?id=in.(${processIds.join(",")})&select=id,source_framework`,
  );
  const liveProcMap = new Map(liveProcs.map((r) => [Number(r.id), String(r.source_framework)]));
  for (const p of processIds) {
    const sf = liveProcMap.get(p);
    if (!sf) {
      throw new Error(`process ${p} not found in /processes`);
    }
    if (sf !== "apqc_pcf_cross_industry") {
      throw new Error(`process ${p} source_framework='${sf}', expected 'apqc_pcf_cross_industry'`);
    }
  }
  console.log(`  + all ${processIds.length} referenced PCF processes resolve and are apqc_pcf_cross_industry`);

  // Pull existing rows by key to avoid duplicate inserts (unique index on key=handoff_id.process_id).
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
    console.log("  = nothing to insert; all 19 pairs already exist");
    return;
  }
  console.log(`  + inserting ${toInsert.length} new rows`);
  const inserted = await post("/handoff_processes", toInsert);
  console.log(`  + inserted ${inserted.length} rows`);

  // Post-flight: all 19 pairs now present.
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
  console.log("OMS B1 technical fixes (2026-05-31)");
  console.log("====================================");
  await backfillTriggerEventCategories();
  await loadApqcHandoffProcesses();
  console.log("\nOK");
  console.log("UI:");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
