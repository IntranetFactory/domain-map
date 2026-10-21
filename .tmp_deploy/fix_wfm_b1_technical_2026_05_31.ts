#!/usr/bin/env bun
/**
 * WFM B1 technical fixes - 2026-05-31 continuation.
 *
 * Scope (only truly-technical B1 fixes per the residual prompt):
 *
 *   1. B1-S4 (B9 enum backfill, Rule #13). PATCH trigger_events.event_category
 *      on 6 rows pre-specified by the audit:
 *        429 work_schedule.published        -> state_change
 *        430 work_shift.swapped             -> state_change
 *        431 work_shift.no_show             -> signal
 *        432 absence_balance.recalculated   -> signal
 *        433 time_off_policy.changed       -> state_change
 *        434 meal_break_record.violated    -> signal
 *
 *   2. B1-S8 (B7 user-edges, Rule #10). INSERT 4 missing data_object_relationships
 *      rows from `users` (id 748) to the 4 WFM masters with NO existing user-edge:
 *        work_schedules    (160) -> published_by_scheduler / scheduled_by
 *        absence_balances  (164) -> tracks_balance_for     / balance_tracked_for
 *        time_off_policies (165) -> owns_time_off_policy   / owned_by
 *        meal_break_records (166) -> worker_logs_meal_break / logged_by
 *
 *   3. B1-S8 PATCH naming rename. Row id 9 (employees(31) -> absence_requests(163))
 *      carries inverse_verb='requested by' (noun-phrase with space).
 *      Rename inverse_verb to 'is_requested_by' (snake_case verb-shape).
 *
 *   4. B1-S11 (APQC tagging). INSERT 8 agent_curated handoff_processes rows
 *      where audit pre-specifies handoff_id + resolvable PCF id and NO existing
 *      row exists for that handoff:
 *        103 -> 1418 (Enter employee time worked into payroll system, 10858)
 *        104 -> 1414 (Collect and record employee time worked, 10854)
 *        136 -> 923  (Track workforce utilization, 10392)
 *        426 -> 1416 (Monitor regular, overtime, and other hours, 10856)
 *        427 -> 1415 (Analyze and report paid and unpaid leave, 10855)
 *        428 -> 951  (Identify and schedule resources to meet service requirements, 10321)
 *        499 -> 922  (Schedule customer service workforce, 10391)
 *        500 -> 195  (Plan and manage customer service workforce, 10387)
 *
 * Deferred (NOT applied here, recorded in the audit continuation):
 *   - B1-S1 (M1 module split): new domain_modules, gated on B2-S1 user decision.
 *   - B1-S2 (B11 aliases): gated on B2-S4 user pruning.
 *   - B1-S3 (B12 lifecycle states): gated on B2-S2 + B2-S3 + B1-S1.
 *   - B1-S5 (B9 missing trigger_events): new entities, gated on B1-S3.
 *   - B1-S6 / B1-S7 / B1-S12 / B1-S13 (B10b PATCH): gated on B1-S1 (no modules).
 *   - B1-S9 (F1 legacy skill retire): gated on B1-S1 + B2-S5.
 *   - B1-S10 (B8 missing outbound rel): explicitly says "defer until target masters
 *     confirmed via pairwise pass".
 *   - B1-S11 handoff 135 (replace existing discovery_substring) and handoff 134
 *     (replace existing discovery_override): user judgment for delete-and-replace.
 *   - B1-S11 handoff 429 (existing agent_curated -> process 42, audit proposed 246)
 *     and handoff 934 (existing agent_curated -> 1886, audit proposed 246) and
 *     handoff 938 (existing agent_curated -> 1414, matches proposal): delete-replace
 *     judgment; defer.
 *
 * Pre-flight (verified live before running):
 *   - 6 trigger_events ids (429-434) exist with empty event_category.
 *   - data_object ids: 160, 162, 163, 164, 165, 166, 748 (users platform_builtin).
 *   - Row id 9 exists with inverse_verb='requested by'.
 *   - Row id 20 exists (users -> absence_requests, is_requested_by) so the rename
 *     of row 9's inverse_verb to 'is_requested_by' duplicates a verb across two
 *     edges with different (data_object_id, related_data_object_id) tuples;
 *     `data_object_relationships` does not enforce uniqueness on verbs.
 *   - 4 missing user-edge tuples confirmed: no row from users(748) to
 *     work_schedules(160), absence_balances(164), time_off_policies(165),
 *     meal_break_records(166).
 *   - 8 handoff ids exist (103, 104, 136, 426, 427, 428, 499, 500); none have
 *     existing handoff_processes rows; all 8 process ids resolve in
 *     apqc_pcf_cross_industry.
 *
 * Idempotent: each step pre-checks existing state and skips on hit.
 * Run from project root: bun run .tmp_deploy/fix_wfm_b1_technical_2026_05_31.ts
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

// ---------------------------------------------------------------------------
// B1-S4: enum backfill on trigger_events.event_category
// ---------------------------------------------------------------------------

const EVENT_CATEGORY_PATCHES: Array<{ id: number; event_name: string; category: string }> = [
  { id: 429, event_name: "work_schedule.published", category: "state_change" },
  { id: 430, event_name: "work_shift.swapped", category: "state_change" },
  { id: 431, event_name: "work_shift.no_show", category: "signal" },
  { id: 432, event_name: "absence_balance.recalculated", category: "signal" },
  { id: 433, event_name: "time_off_policy.changed", category: "state_change" },
  { id: 434, event_name: "meal_break_record.violated", category: "signal" },
];

async function patchEventCategories() {
  console.log("\n=== B1-S4: PATCH trigger_events.event_category ===");
  for (const p of EVENT_CATEGORY_PATCHES) {
    const rows = await get(
      `/trigger_events?id=eq.${p.id}&select=id,event_name,event_category`,
    );
    if (rows.length !== 1) {
      throw new Error(`trigger_event id ${p.id} not found`);
    }
    if (rows[0].event_name !== p.event_name) {
      throw new Error(
        `trigger_event id ${p.id} name mismatch: live="${rows[0].event_name}" expected="${p.event_name}"`,
      );
    }
    if (rows[0].event_category === p.category) {
      console.log(`  = id ${p.id} (${p.event_name}) already ${p.category}, skip`);
      continue;
    }
    if (rows[0].event_category !== "") {
      console.log(
        `  ! id ${p.id} (${p.event_name}) currently "${rows[0].event_category}" (not empty); skipping to avoid overwriting`,
      );
      continue;
    }
    await patch(`/trigger_events?id=eq.${p.id}`, { event_category: p.category });
    console.log(`  + id ${p.id} (${p.event_name}) -> event_category="${p.category}"`);
  }
}

// ---------------------------------------------------------------------------
// B1-S8a: Rule #10 user-edge inserts on data_object_relationships
// ---------------------------------------------------------------------------

const USERS_ID = 748;

const USER_EDGES: Array<{
  related_data_object_id: number;
  data_object_name: string;
  relationship_verb: string;
  inverse_verb: string;
  relationship_type: string;
  relationship_kind: string;
  is_required: boolean;
  owner_side: string;
}> = [
  {
    related_data_object_id: 160,
    data_object_name: "work_schedules",
    relationship_verb: "published_by_scheduler",
    inverse_verb: "scheduled_by",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    is_required: false,
    owner_side: "source",
  },
  {
    related_data_object_id: 164,
    data_object_name: "absence_balances",
    relationship_verb: "tracks_balance_for",
    inverse_verb: "balance_tracked_for",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    is_required: true,
    owner_side: "source",
  },
  {
    related_data_object_id: 165,
    data_object_name: "time_off_policies",
    relationship_verb: "owns_time_off_policy",
    inverse_verb: "owned_by",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    is_required: false,
    owner_side: "source",
  },
  {
    related_data_object_id: 166,
    data_object_name: "meal_break_records",
    relationship_verb: "worker_logs_meal_break",
    inverse_verb: "logged_by",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    is_required: true,
    owner_side: "source",
  },
];

async function insertUserEdges() {
  console.log("\n=== B1-S8a: INSERT data_object_relationships user-edges (Rule #10) ===");
  for (const e of USER_EDGES) {
    const existing = await get(
      `/data_object_relationships?data_object_id=eq.${USERS_ID}&related_data_object_id=eq.${e.related_data_object_id}&relationship_verb=eq.${encodeURIComponent(e.relationship_verb)}&select=id`,
    );
    if (existing.length > 0) {
      console.log(
        `  = users -> ${e.data_object_name} (${e.relationship_verb}) already exists as id ${existing[0].id}, skip`,
      );
      continue;
    }
    const inserted = await post("/data_object_relationships", {
      data_object_id: USERS_ID,
      related_data_object_id: e.related_data_object_id,
      relationship_verb: e.relationship_verb,
      inverse_verb: e.inverse_verb,
      relationship_type: e.relationship_type,
      relationship_kind: e.relationship_kind,
      is_required: e.is_required,
      owner_side: e.owner_side,
      // record_status omitted (DB default 'new' per Rule #1).
      // notes omitted (Rule #15).
    });
    console.log(
      `  + users -> ${e.data_object_name} (${e.relationship_verb}/${e.inverse_verb}) inserted as id ${inserted[0]?.id}`,
    );
  }
}

// ---------------------------------------------------------------------------
// B1-S8b: naming rename on data_object_relationships row id 9
// ---------------------------------------------------------------------------

async function renameLegacyInverse() {
  console.log("\n=== B1-S8b: PATCH row id 9 inverse_verb (noun-phrase -> snake_case) ===");
  const ROW_ID = 9;
  const rows = await get(
    `/data_object_relationships?id=eq.${ROW_ID}&select=id,data_object_id,related_data_object_id,relationship_verb,inverse_verb`,
  );
  if (rows.length !== 1) {
    throw new Error(`row id ${ROW_ID} not found`);
  }
  if (rows[0].inverse_verb === "is_requested_by") {
    console.log(`  = id ${ROW_ID} inverse_verb already 'is_requested_by', skip`);
    return;
  }
  if (rows[0].inverse_verb !== "requested by") {
    console.log(
      `  ! id ${ROW_ID} inverse_verb is "${rows[0].inverse_verb}" (not 'requested by'); skipping to avoid overwriting`,
    );
    return;
  }
  await patch(`/data_object_relationships?id=eq.${ROW_ID}`, {
    inverse_verb: "is_requested_by",
  });
  console.log(`  + id ${ROW_ID} inverse_verb: 'requested by' -> 'is_requested_by'`);
}

// ---------------------------------------------------------------------------
// B1-S11: handoff_processes inserts (8 pre-specified, no existing row)
// ---------------------------------------------------------------------------

const HANDOFF_TAGS: Array<{
  handoff_id: number;
  process_id: number;
  pcf_external_id: string;
  pcf_name: string;
}> = [
  { handoff_id: 103, process_id: 1418, pcf_external_id: "10858", pcf_name: "Enter employee time worked into payroll system" },
  { handoff_id: 104, process_id: 1414, pcf_external_id: "10854", pcf_name: "Collect and record employee time worked" },
  { handoff_id: 136, process_id: 923,  pcf_external_id: "10392", pcf_name: "Track workforce utilization" },
  { handoff_id: 426, process_id: 1416, pcf_external_id: "10856", pcf_name: "Monitor regular, overtime, and other hours" },
  { handoff_id: 427, process_id: 1415, pcf_external_id: "10855", pcf_name: "Analyze and report paid and unpaid leave" },
  { handoff_id: 428, process_id: 951,  pcf_external_id: "10321", pcf_name: "Identify and schedule resources to meet service requirements" },
  { handoff_id: 499, process_id: 922,  pcf_external_id: "10391", pcf_name: "Schedule customer service workforce" },
  { handoff_id: 500, process_id: 195,  pcf_external_id: "10387", pcf_name: "Plan and manage customer service workforce" },
];

async function insertHandoffProcesses() {
  console.log("\n=== B1-S11: INSERT handoff_processes (agent_curated) ===");
  for (const t of HANDOFF_TAGS) {
    // Verify handoff exists.
    const h = await get(`/handoffs?id=eq.${t.handoff_id}&select=id`);
    if (h.length !== 1) {
      throw new Error(`pre-flight: handoff id ${t.handoff_id} missing`);
    }
    // Verify process exists.
    const p = await get(
      `/processes?id=eq.${t.process_id}&select=id,external_id,source_framework`,
    );
    if (p.length !== 1) {
      throw new Error(`pre-flight: process id ${t.process_id} missing`);
    }
    if (p[0].external_id !== t.pcf_external_id) {
      throw new Error(
        `pre-flight: process id ${t.process_id} external_id="${p[0].external_id}" expected "${t.pcf_external_id}"`,
      );
    }
    // Skip if any handoff_processes row already exists for this handoff.
    const existing = await get(
      `/handoff_processes?handoff_id=eq.${t.handoff_id}&select=id,process_id,proposal_source`,
    );
    if (existing.length > 0) {
      console.log(
        `  = handoff ${t.handoff_id} already has handoff_processes row (id ${existing[0].id}, process_id=${existing[0].process_id}, proposal_source=${existing[0].proposal_source}); skipping per defer rule`,
      );
      continue;
    }
    const inserted = await post("/handoff_processes", {
      handoff_id: t.handoff_id,
      process_id: t.process_id,
      proposal_source: "agent_curated",
      // role omitted (DB default 'implements').
      // record_status omitted (DB default 'new' per Rule #1).
      // notes omitted (Rule #15).
    });
    console.log(
      `  + handoff ${t.handoff_id} -> process ${t.process_id} (${t.pcf_external_id} "${t.pcf_name}") inserted as id ${inserted[0]?.id}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Post-flight summary
// ---------------------------------------------------------------------------

async function postflight() {
  console.log("\n=== Post-flight ===");
  const events = await get(
    `/trigger_events?id=in.(429,430,431,432,433,434)&select=id,event_name,event_category&order=id.asc`,
  );
  console.log("trigger_events:");
  for (const e of events) {
    console.log(`  id=${e.id} ${e.event_name} -> event_category="${e.event_category}"`);
  }

  const userEdges = await get(
    `/data_object_relationships?data_object_id=eq.748&related_data_object_id=in.(160,164,165,166)&select=id,related_data_object_id,relationship_verb,inverse_verb&order=related_data_object_id.asc`,
  );
  console.log("\nuser-edges on the 4 previously-missing WFM masters:");
  for (const r of userEdges) {
    console.log(
      `  id=${r.id} users -> ${r.related_data_object_id} (${r.relationship_verb}/${r.inverse_verb})`,
    );
  }

  const row9 = await get(
    `/data_object_relationships?id=eq.9&select=id,relationship_verb,inverse_verb`,
  );
  console.log("\nrow id 9 after rename:");
  for (const r of row9) {
    console.log(`  id=${r.id} verb=${r.relationship_verb} inverse=${r.inverse_verb}`);
  }

  const tags = await get(
    `/handoff_processes?handoff_id=in.(103,104,136,426,427,428,499,500)&select=handoff_id,process_id,proposal_source,record_status&order=handoff_id.asc`,
  );
  console.log("\nhandoff_processes for the 8 tagged handoffs:");
  for (const r of tags) {
    console.log(
      `  handoff=${r.handoff_id} process=${r.process_id} proposal_source=${r.proposal_source} record_status=${r.record_status}`,
    );
  }
}

async function main() {
  console.log("WFM B1 technical fixes (2026-05-31 residual continuation)");
  console.log("==========================================================");
  await patchEventCategories();
  await insertUserEdges();
  await renameLegacyInverse();
  await insertHandoffProcesses();
  await postflight();
  console.log("\nDone.");
  console.log("  UI: https://tests.semantius.app/domain_map/trigger_events");
  console.log("  UI: https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("  UI: https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
