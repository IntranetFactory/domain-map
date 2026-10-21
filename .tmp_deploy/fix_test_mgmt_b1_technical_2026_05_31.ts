#!/usr/bin/env bun
/**
 * TEST-MGMT B1 technical fixes — 2026-05-31 continuation.
 *
 * Applies the truly-technical B1 fixes from audits/TEST-MGMT.md:
 *   - B1-S6: PATCH event_category on 12 trigger_events backfills
 *     (audit pre-specifies "*.created is lifecycle; most fall into state_change";
 *     classification mirrors existing-pattern usage of lifecycle for
 *     created/published/provisioned events).
 *   - B1-H1: INSERT handoff_processes for 9 TEST-MGMT cross-domain handoffs.
 *     Each (handoff_id, PCF activity name) tuple is pre-specified in the audit.
 *     The audit's 5-digit PCF IDs are reference codes, not table IDs; PCF
 *     activity names resolve to the live processes.id values below.
 *
 * DEFERRED (out of scope for this continuation):
 *   - B1-S1 (capabilities), B1-S2 (catalog UX), B1-S3 (pattern flags),
 *     B1-S4 (lifecycle states), B1-S5 (F1 retirement), B1-M1..M4.
 *
 * Idempotent: pre-flights every PATCH and INSERT against live state.
 * Run from project root: bun run .tmp_deploy/fix_test_mgmt_b1_technical_2026_05_31.ts
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
  if (code !== 0) throw new Error(`${tool} (exit ${code}): ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : null;
}

const get = (path: string) =>
  semCall("postgrestRequest", { method: "GET", path }) as Promise<any[]>;
const post = (path: string, body: Row | Row[]) =>
  semCall("postgrestRequest", { method: "POST", path, body }) as Promise<any[]>;
const patch = (path: string, body: Row) =>
  semCall("postgrestRequest", { method: "PATCH", path, body }) as Promise<any[]>;

// ---- B1-S6: trigger_events.event_category backfill ----
// Pre-specified by audit: "*.created is lifecycle; most fall into state_change".
// Lifecycle = entity comes-into-being / transitions a permanent state-of-existence
// (created, published, provisioned, deprecated). Aligns with catalog precedent:
// digital_asset.published / content_locale.added / pay_run.cancelled = lifecycle.
// state_change = ongoing operational transitions (updated, approved, completed,
// failed, closed, linked, executed).
const EVENT_CATEGORY_PATCHES: Array<{ id: number; event_name: string; category: string }> = [
  { id: 857, event_name: "test_case.created", category: "lifecycle" },
  { id: 858, event_name: "test_case.updated", category: "state_change" },
  { id: 859, event_name: "test_suite.published", category: "lifecycle" },
  { id: 860, event_name: "test_plan.approved", category: "state_change" },
  { id: 861, event_name: "test_run.completed", category: "state_change" },
  { id: 862, event_name: "test_run.failed", category: "state_change" },
  { id: 863, event_name: "test_defect.created", category: "lifecycle" },
  { id: 864, event_name: "test_defect.closed", category: "state_change" },
  { id: 865, event_name: "test_environment.provisioned", category: "lifecycle" },
  { id: 866, event_name: "requirements_to_test_traceability.linked", category: "state_change" },
  { id: 651, event_name: "automation_script.executed", category: "state_change" },
  { id: 652, event_name: "automation_script.failed", category: "state_change" },
];

// ---- B1-H1: handoff_processes inserts ----
// Pre-specified by audit. PCF activity-name to live processes.id mapping
// resolved via PostgREST (audit's 5-digit codes are reference labels, not IDs).
const HANDOFF_PROCESS_INSERTS: Array<{ handoff_id: number; process_id: number; pcf_name: string }> = [
  { handoff_id: 782, process_id: 170, pcf_name: "Perform quality testing" },
  { handoff_id: 778, process_id: 170, pcf_name: "Perform quality testing" },
  { handoff_id: 780, process_id: 579, pcf_name: "Eliminate quality and reliability problems" },
  { handoff_id: 802, process_id: 1605, pcf_name: "Monitor and test regulatory compliance position and existing controls" },
  { handoff_id: 779, process_id: 579, pcf_name: "Eliminate quality and reliability problems" },
  { handoff_id: 781, process_id: 413, pcf_name: "Evaluate performance to requirements" },
  { handoff_id: 752, process_id: 1670, pcf_name: "Test against quality plan" },
  { handoff_id: 768, process_id: 1670, pcf_name: "Test against quality plan" },
  { handoff_id: 771, process_id: 170, pcf_name: "Perform quality testing" },
];

async function patchEventCategories(): Promise<{ patched: number; skipped: number }> {
  let patched = 0;
  let skipped = 0;
  const ids = EVENT_CATEGORY_PATCHES.map((p) => p.id).join(",");
  const live = await get(
    `/trigger_events?id=in.(${ids})&select=id,event_name,event_category`,
  );
  const byId = new Map<number, { event_name: string; event_category: string }>();
  for (const row of live) {
    byId.set(row.id as number, {
      event_name: row.event_name as string,
      event_category: row.event_category as string,
    });
  }
  for (const p of EVENT_CATEGORY_PATCHES) {
    const cur = byId.get(p.id);
    if (!cur) {
      console.error(`  ! trigger_events id=${p.id} (${p.event_name}) not found, skipping`);
      skipped++;
      continue;
    }
    if (cur.event_name !== p.event_name) {
      console.error(
        `  ! trigger_events id=${p.id}: expected ${p.event_name}, found ${cur.event_name}; skipping`,
      );
      skipped++;
      continue;
    }
    if (cur.event_category === p.category) {
      skipped++;
      continue;
    }
    if (cur.event_category !== "") {
      console.error(
        `  ! trigger_events id=${p.id} (${p.event_name}) already has category='${cur.event_category}', refusing to overwrite to '${p.category}'`,
      );
      skipped++;
      continue;
    }
    await patch(`/trigger_events?id=eq.${p.id}`, { event_category: p.category });
    console.log(`  + ${p.event_name} (id=${p.id}) -> ${p.category}`);
    patched++;
  }
  return { patched, skipped };
}

async function insertHandoffProcesses(): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  // Verify all process_ids resolve.
  const procIds = Array.from(new Set(HANDOFF_PROCESS_INSERTS.map((h) => h.process_id))).join(",");
  const procRows = await get(`/processes?id=in.(${procIds})&select=id,process_name`);
  const procById = new Map<number, string>();
  for (const r of procRows) procById.set(r.id as number, r.process_name as string);
  for (const h of HANDOFF_PROCESS_INSERTS) {
    const name = procById.get(h.process_id);
    if (!name) throw new Error(`PCF process_id=${h.process_id} not found in live processes`);
    if (name !== h.pcf_name) {
      throw new Error(
        `PCF process_id=${h.process_id}: expected name '${h.pcf_name}', live name '${name}'`,
      );
    }
  }

  // Verify all handoffs exist.
  const handoffIds = Array.from(new Set(HANDOFF_PROCESS_INSERTS.map((h) => h.handoff_id))).join(",");
  const handoffRows = await get(`/handoffs?id=in.(${handoffIds})&select=id`);
  const handoffSet = new Set<number>(handoffRows.map((r) => r.id as number));
  for (const h of HANDOFF_PROCESS_INSERTS) {
    if (!handoffSet.has(h.handoff_id)) {
      throw new Error(`handoff_id=${h.handoff_id} not found in live handoffs`);
    }
  }

  // Idempotency: skip rows already present.
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds})&select=handoff_id,process_id`,
  );
  const existingKey = new Set<string>();
  for (const e of existing) existingKey.add(`${e.handoff_id}.${e.process_id}`);

  const toInsert: Row[] = [];
  for (const h of HANDOFF_PROCESS_INSERTS) {
    const key = `${h.handoff_id}.${h.process_id}`;
    if (existingKey.has(key)) {
      skipped++;
      continue;
    }
    toInsert.push({
      handoff_id: h.handoff_id,
      process_id: h.process_id,
      role: "implements",
      proposal_source: "agent_curated",
      // record_status omitted -> default 'new' per Rule #1
      // notes omitted -> empty per Rule #15
    });
  }

  if (toInsert.length > 0) {
    await post("/handoff_processes", toInsert);
    inserted = toInsert.length;
    for (const h of HANDOFF_PROCESS_INSERTS) {
      const key = `${h.handoff_id}.${h.process_id}`;
      if (!existingKey.has(key)) {
        console.log(
          `  + handoff_id=${h.handoff_id} -> process_id=${h.process_id} (${h.pcf_name})`,
        );
      }
    }
  }
  return { inserted, skipped };
}

async function main() {
  console.log("== TEST-MGMT B1 technical fixes ==");

  console.log("\n[B1-S6] PATCH trigger_events.event_category (12 rows)");
  const ec = await patchEventCategories();
  console.log(`  Result: patched=${ec.patched}, skipped=${ec.skipped}`);

  console.log("\n[B1-H1] INSERT handoff_processes (9 rows)");
  const hp = await insertHandoffProcesses();
  console.log(`  Result: inserted=${hp.inserted}, skipped=${hp.skipped}`);

  console.log("\nDone.");
}

await main();
