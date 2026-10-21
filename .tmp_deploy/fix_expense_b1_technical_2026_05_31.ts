#!/usr/bin/env bun
/**
 * EXPENSE B1 technical fixes - 2026-05-31 continuation.
 *
 * Scope (only truly-technical B1 fixes per the prompt):
 *   - B1-S2 PATCH 9 trigger_events to set event_category (Rule #13 enum:
 *     lifecycle / state_change / threshold / signal). Per-row mapping is
 *     pre-specified in the audit:
 *       568 expense_line.submitted       -> state_change
 *       569 expense_line.policy_violation -> state_change
 *       570 expense_line.approved        -> state_change
 *       571 expense_line.posted_to_gl    -> lifecycle
 *       572 travel_booking.confirmed     -> state_change
 *       573 travel_booking.cancelled     -> state_change
 *       574 travel_booking.out_of_policy -> state_change
 *       575 corporate_card.issued        -> lifecycle
 *       576 corporate_card.suspended     -> state_change
 *
 * Deferred (NOT applied here, recorded in the audit continuation):
 *   - B1-S1 M1 hard fail (Phase M load): new domain_modules, gated on B2-S1
 *     module split (user picks 3 / 2 / 4 / custom).
 *   - B1-S3 6 master state machines: new data_object_lifecycle_states rows,
 *     gated on B1-S1.
 *   - B1-S4 skill rebind / split: gated on B1-S1.
 *   - B1-S5 6 data_objects pattern flag flips: gated on B2-S4 per-flag user
 *     confirmation; prompt rules also defer pattern-flag flips.
 *   - B1-H1 17 APQC handoff_processes tags: most rows ("needs PCF lookup")
 *     lack a resolved process_id in the audit; the 4 rows with pre-specified
 *     process_ids (38->317, 130->59, 101->59, 468->41) are REPLACE candidates
 *     against existing discovery_* rows, not pure inserts. Prompt rule:
 *     INSERT handoff_processes only when audit pre-specifies handoff_id +
 *     resolvable PCF; defer REPLACE / PATCH semantics for handoff_processes
 *     to a follow-up batch.
 *   - B1-S6, B1-S9 EXPENSE-side B10b backfills: gated on B1-S1.
 *
 * Pre-flight (verified live before running):
 *   - 9 trigger_event ids exist with event_category='' and names matching.
 *
 * Idempotent: each PATCH only touches rows whose event_category is still ''
 * (or already the target value, which is a no-op). Safe to re-run.
 * Run from project root:
 *   bun run .tmp_deploy/fix_expense_b1_technical_2026_05_31.ts
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
const patch = (path: string, body: Row) =>
  semCall("postgrestRequest", { method: "PATCH", path, body }) as Promise<any[]>;

// Audit-specified mapping (B1-S2).
const EVENT_CATEGORY_MAP: Record<number, { name: string; category: string }> = {
  568: { name: "expense_line.submitted", category: "state_change" },
  569: { name: "expense_line.policy_violation", category: "state_change" },
  570: { name: "expense_line.approved", category: "state_change" },
  571: { name: "expense_line.posted_to_gl", category: "lifecycle" },
  572: { name: "travel_booking.confirmed", category: "state_change" },
  573: { name: "travel_booking.cancelled", category: "state_change" },
  574: { name: "travel_booking.out_of_policy", category: "state_change" },
  575: { name: "corporate_card.issued", category: "lifecycle" },
  576: { name: "corporate_card.suspended", category: "state_change" },
};

const IDS = Object.keys(EVENT_CATEGORY_MAP).map((s) => Number(s));

async function preflight() {
  console.log("=== Pre-flight ===");
  const rows = await get(
    `/trigger_events?id=in.(${IDS.join(",")})&select=id,event_name,event_category&order=id.asc`,
  );
  if (rows.length !== IDS.length) {
    throw new Error(
      `pre-flight: expected ${IDS.length} trigger_events, got ${rows.length}`,
    );
  }
  for (const r of rows) {
    const spec = EVENT_CATEGORY_MAP[r.id as number];
    if (!spec) {
      throw new Error(`pre-flight: unexpected id ${r.id}`);
    }
    if (r.event_name !== spec.name) {
      throw new Error(
        `pre-flight: id ${r.id} event_name="${r.event_name}", expected "${spec.name}"`,
      );
    }
    console.log(
      `  + id=${r.id} name="${r.event_name}" current_category="${r.event_category}" -> "${spec.category}"`,
    );
  }
}

async function applyPatches() {
  console.log("\n=== PATCH trigger_events.event_category ===");
  let patched = 0;
  let skipped = 0;
  for (const idStr of Object.keys(EVENT_CATEGORY_MAP)) {
    const id = Number(idStr);
    const spec = EVENT_CATEGORY_MAP[id];
    // Idempotency guard: read first, skip if already at target value.
    const cur = await get(
      `/trigger_events?id=eq.${id}&select=id,event_category`,
    );
    if (cur.length === 1 && cur[0].event_category === spec.category) {
      console.log(`  = id=${id} already "${spec.category}", skipping`);
      skipped++;
      continue;
    }
    await patch(`/trigger_events?id=eq.${id}`, { event_category: spec.category });
    console.log(`  + id=${id} -> event_category="${spec.category}"`);
    patched++;
  }
  console.log(`  patched=${patched} skipped=${skipped}`);
}

async function postflight() {
  console.log("\n=== Post-flight ===");
  const rows = await get(
    `/trigger_events?id=in.(${IDS.join(",")})&select=id,event_name,event_category&order=id.asc`,
  );
  let bad = 0;
  for (const r of rows) {
    const spec = EVENT_CATEGORY_MAP[r.id as number];
    const ok = r.event_category === spec.category;
    if (!ok) bad++;
    console.log(
      `  ${ok ? "OK" : "FAIL"} id=${r.id} name="${r.event_name}" event_category="${r.event_category}" expected="${spec.category}"`,
    );
  }
  if (bad > 0) {
    throw new Error(`post-flight: ${bad} row(s) did not match expected event_category`);
  }
}

async function main() {
  console.log("EXPENSE B1 technical fixes (2026-05-31 continuation)");
  console.log("====================================================\n");
  await preflight();
  await applyPatches();
  await postflight();
  console.log("\nDone.");
  console.log("  UI: https://tests.semantius.app/domain_map/trigger_events");
}

await main();
