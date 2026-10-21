#!/usr/bin/env bun
/**
 * UTIL-OPS B1 technical fixes (2026-05-31 continuation).
 *
 * Applies only the truly-technical B1 items from audits/UTIL-OPS.md that do
 * not require user judgment and are not gated on the deferred modularization
 * decision (Bucket 2 #5 / B1-S1):
 *
 *   1. B1-S18 - PATCH `trigger_events.event_category` enum backfill for the
 *      10 trigger events on UTIL-OPS masters (data_object_id 660 .. 667).
 *      Each event has an empty string today; the audit pre-specifies the
 *      target category per event row.
 *
 *   2. B1-S16 - INSERT `handoff_processes` rows for the 4 cross-domain
 *      handoffs the audit ties to existing APQC PCF rows with confident
 *      matches:
 *        B1-A1  handoff 939 -> process 1351  (Generate customer billing data)
 *        B1-A2  handoff 940 -> process 1898  (Schedule field service)
 *        B1-A4  handoff 942 -> process  196  (Manage customer service problems)
 *        B1-A5  handoff 943 -> process 1299  (Triage IT service delivery incidents)
 *      B1-A3 (handoff 941) is SKIPPED: a `handoff_processes` row already
 *      points handoff 941 at process 828 (Report maintenance issues). Per
 *      Rule #1 idempotency on natural keys we do not duplicate-tag.
 *      B1-A6 / B1-A7 are explicitly deferred by the audit.
 *
 * Idempotent: each step reads current state before writing. Safe to re-run.
 *
 * Run from project root:
 *   bun run c:/dev/domain-map/.tmp_deploy/fix_util_ops_b1_technical_2026_05_31.ts
 *
 * Never `cd` into .tmp_deploy/ first (Rule #6: semantius reads .env from cwd).
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
const patch = (path: string, body: Row) =>
  semCall("postgrestRequest", { method: "PATCH", path, body }) as Promise<any[]>;

// --- B1-S18: trigger_events.event_category backfill -------------------------

// (event_name, target category). Sourced from audit row B1-S18.
const EVENT_CATEGORIES: Array<{ event_name: string; event_category: string }> = [
  { event_name: "utility_customer_account.opened", event_category: "lifecycle" },
  { event_name: "utility_meter.installed", event_category: "lifecycle" },
  { event_name: "service_connection.activated", event_category: "lifecycle" },
  { event_name: "meter_read.captured", event_category: "signal" },
  { event_name: "meter_read.anomalous", event_category: "threshold" },
  { event_name: "utility_asset.failed", event_category: "state_change" },
  { event_name: "outage_event.declared", event_category: "state_change" },
  { event_name: "outage_event.restored", event_category: "state_change" },
  { event_name: "utility_service_order.dispatched", event_category: "state_change" },
  { event_name: "utility_bill.issued", event_category: "lifecycle" },
];

const UTIL_OPS_MASTER_IDS = [660, 661, 662, 663, 664, 665, 666, 667];
const ALLOWED_CATEGORIES = new Set(["lifecycle", "state_change", "threshold", "signal"]);

async function backfillTriggerCategories() {
  console.log("\n=== B1-S18: trigger_events.event_category backfill ===");
  const live = await get(
    `/trigger_events?data_object_id=in.(${UTIL_OPS_MASTER_IDS.join(
      ",",
    )})&select=id,event_name,event_category&order=id`,
  );
  const byName = new Map<string, { id: number; event_category: string }>();
  for (const r of live) {
    byName.set(String(r.event_name), { id: Number(r.id), event_category: String(r.event_category ?? "") });
  }

  let patched = 0;
  let skippedAlreadySet = 0;
  let missingFromLive = 0;
  for (const target of EVENT_CATEGORIES) {
    if (!ALLOWED_CATEGORIES.has(target.event_category)) {
      throw new Error(`enum guard: '${target.event_category}' not in allowed set`);
    }
    const found = byName.get(target.event_name);
    if (!found) {
      console.log(`  ! ${target.event_name}: NOT FOUND in live trigger_events for UTIL-OPS masters`);
      missingFromLive += 1;
      continue;
    }
    if (found.event_category === target.event_category) {
      console.log(`  = ${target.event_name} (id ${found.id}): already '${target.event_category}'`);
      skippedAlreadySet += 1;
      continue;
    }
    if (found.event_category !== "") {
      // Audit said all 10 were empty; if not, surface and skip rather than overwrite.
      console.log(
        `  ! ${target.event_name} (id ${found.id}): live value '${found.event_category}' differs from target '${target.event_category}'. Skipping (would be an overwrite, not a backfill).`,
      );
      continue;
    }
    await patch(`/trigger_events?id=eq.${found.id}`, { event_category: target.event_category });
    console.log(`  + ${target.event_name} (id ${found.id}): '' -> '${target.event_category}'`);
    patched += 1;
  }
  console.log(
    `  summary: ${patched} patched, ${skippedAlreadySet} already correct, ${missingFromLive} missing.`,
  );
}

// --- B1-S16: handoff_processes inserts (B1-A1, A2, A4, A5) ------------------

const HANDOFF_PROCESS_PROPOSALS: Array<{
  audit_id: string;
  handoff_id: number;
  process_id: number;
  process_name: string;
}> = [
  { audit_id: "B1-A1", handoff_id: 939, process_id: 1351, process_name: "Generate customer billing data" },
  { audit_id: "B1-A2", handoff_id: 940, process_id: 1898, process_name: "Schedule field service" },
  { audit_id: "B1-A4", handoff_id: 942, process_id: 196, process_name: "Manage customer service problems, requests, and inquiries" },
  { audit_id: "B1-A5", handoff_id: 943, process_id: 1299, process_name: "Triage IT service delivery incidents" },
];

async function tagHandoffProcesses() {
  console.log("\n=== B1-S16: handoff_processes inserts (B1-A1, A2, A4, A5) ===");

  // Verify handoffs and processes exist (resolvable PCF + valid handoff id).
  const handoffIds = HANDOFF_PROCESS_PROPOSALS.map((p) => p.handoff_id);
  const processIds = HANDOFF_PROCESS_PROPOSALS.map((p) => p.process_id);
  const [liveHandoffs, liveProcesses] = await Promise.all([
    get(`/handoffs?id=in.(${handoffIds.join(",")})&select=id`),
    get(`/processes?id=in.(${processIds.join(",")})&select=id,process_name`),
  ]);
  const liveHandoffIds = new Set(liveHandoffs.map((r) => Number(r.id)));
  const liveProcessById = new Map<number, string>(
    liveProcesses.map((r) => [Number(r.id), String(r.process_name)]),
  );

  for (const p of HANDOFF_PROCESS_PROPOSALS) {
    if (!liveHandoffIds.has(p.handoff_id)) {
      throw new Error(`pre-flight: handoff ${p.handoff_id} for ${p.audit_id} not found`);
    }
    if (!liveProcessById.has(p.process_id)) {
      throw new Error(`pre-flight: process ${p.process_id} for ${p.audit_id} not found`);
    }
    const liveName = liveProcessById.get(p.process_id);
    if (liveName !== p.process_name) {
      console.log(
        `  ! ${p.audit_id}: process ${p.process_id} live name '${liveName}' differs from audit '${p.process_name}'; proceeding anyway (id is the authority)`,
      );
    }
  }

  // Read existing pairs once to make the load idempotent.
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=handoff_id,process_id`,
  );
  const existingPairs = new Set(
    existing.map((r) => `${Number(r.handoff_id)}.${Number(r.process_id)}`),
  );

  // Surface any pre-existing tag on a target handoff (might be a different
  // process; safe to coexist but worth logging).
  for (const p of HANDOFF_PROCESS_PROPOSALS) {
    const others = existing.filter(
      (r) => Number(r.handoff_id) === p.handoff_id && Number(r.process_id) !== p.process_id,
    );
    if (others.length > 0) {
      console.log(
        `  ! ${p.audit_id}: handoff ${p.handoff_id} already tagged with process_id(s) ${others
          .map((r) => Number(r.process_id))
          .join(", ")} (different from proposal ${p.process_id}); both will coexist`,
      );
    }
  }

  let inserted = 0;
  let skippedExisting = 0;
  for (const p of HANDOFF_PROCESS_PROPOSALS) {
    const key = `${p.handoff_id}.${p.process_id}`;
    if (existingPairs.has(key)) {
      console.log(`  = ${p.audit_id}: (${p.handoff_id} -> ${p.process_id}) already present, skipping`);
      skippedExisting += 1;
      continue;
    }
    await post("/handoff_processes", {
      handoff_id: p.handoff_id,
      process_id: p.process_id,
      role: "implements",
      proposal_source: "agent_curated",
      // record_status omitted: defaults to 'new' per Rule #1.
    });
    console.log(
      `  + ${p.audit_id}: tagged handoff ${p.handoff_id} -> process ${p.process_id} (${p.process_name})`,
    );
    inserted += 1;
  }
  console.log(`  summary: ${inserted} inserted, ${skippedExisting} already present.`);
}

async function main() {
  console.log("UTIL-OPS B1 technical fix-loop (2026-05-31)");
  console.log("===========================================");
  await backfillTriggerCategories();
  await tagHandoffProcesses();
  console.log("\nDone.");
  console.log("UI:");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
