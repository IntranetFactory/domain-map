#!/usr/bin/env bun
/**
 * TELEMATICS B1 technical-only continuation, 2026-05-31.
 *
 * Subagent under domain-map-analyst. Applies only the truly-technical B1 fixes from
 * audits/TELEMATICS.md (2026-05-30 entry). Judgment calls are deferred to the user.
 *
 * Scope (in this loader):
 *   1. B1-S9: PATCH event_category on the 5 empty TELEMATICS trigger_events (994..998).
 *   2. B1-U1..U4: INSERT 4 user-edge `data_object_relationships` rows per Rule #10
 *      (the audit pre-specifies each tuple: from-data-object, to-users, verb).
 *   3. B1-A1, A3, A4, A6, A7, A8, A11: INSERT 7 `handoff_processes` rows where the
 *      audit pre-specifies both handoff_id and a resolvable PCF process_id with
 *      "confident L4" confidence. Skip A2/A9/A10 (defer) and A5 (judgment, existing
 *      `discovery_substring` upgrade is a user call, Bucket 2 #7 retire-decision).
 *
 * Out of scope (deferred for user judgment / gated on Bucket 2 #1):
 *   - B1-S1 module creation, B1-S2 catalog UX copy, B1-S3 pattern flags,
 *     B1-S6 handoff module FKs, B1-S7 aliases (no exact tuples), B1-S8 lifecycle
 *     states, B1-S10/S11 skill rename (gated on modules), B1-B1..B5 boundary
 *     judgment, B1-M1..M5 new entities, B1-R1..R10 intra-domain rels (R-edges are
 *     not user-edges per Rule #10), B1-X1..X3 cross-domain rels.
 *
 * Idempotent: each step reads current state and only writes what is missing.
 * Run from project root: bun run .tmp_deploy/fix_telematics_b1_technical_2026_05_31.ts
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
// Step 1: B1-S9 PATCH event_category on 5 trigger_events
// ---------------------------------------------------------------------------
// Allowed enum values per Rule #13: lifecycle, state_change, threshold, signal.
// Audit-specified mapping:
//   994 gps_waypoint.recorded           -> lifecycle
//   995 idle_event.detected             -> threshold
//   996 geofence.crossed                -> threshold
//   997 safety_scorecard.updated        -> state_change
//   998 fleet_vehicle.mileage_milestone_reached -> threshold
const TRIGGER_EVENT_CATEGORY: Array<{ id: number; event_category: string }> = [
  { id: 994, event_category: "lifecycle" },
  { id: 995, event_category: "threshold" },
  { id: 996, event_category: "threshold" },
  { id: 997, event_category: "state_change" },
  { id: 998, event_category: "threshold" },
];

async function backfillTriggerEvents() {
  console.log("\n=== Step 1: B1-S9 trigger_events.event_category ===");
  const live = await get(
    "/trigger_events?id=in.(994,995,996,997,998)&select=id,event_name,event_category",
  );
  const byId = new Map<number, any>(live.map((r) => [r.id, r]));

  let patched = 0;
  let skipped = 0;
  for (const target of TRIGGER_EVENT_CATEGORY) {
    const row = byId.get(target.id);
    if (!row) {
      console.log(`  SKIP id=${target.id} not found`);
      continue;
    }
    if (row.event_category === target.event_category) {
      console.log(
        `  SKIP id=${target.id} (${row.event_name}) already ${target.event_category}`,
      );
      skipped++;
      continue;
    }
    if (row.event_category !== "") {
      console.log(
        `  SKIP id=${target.id} (${row.event_name}) has non-empty value '${row.event_category}'; not overwriting`,
      );
      skipped++;
      continue;
    }
    await patch(`/trigger_events?id=eq.${target.id}`, {
      event_category: target.event_category,
    });
    console.log(
      `  PATCH id=${target.id} (${row.event_name}) -> ${target.event_category}`,
    );
    patched++;
  }
  console.log(`  result: patched=${patched} skipped=${skipped}`);
}

// ---------------------------------------------------------------------------
// Step 2: B1-U1..U4 user-edge data_object_relationships (Rule #10)
// ---------------------------------------------------------------------------
// Pattern derived from existing user-edge rows on the catalog (e.g. id 1854..1856):
//   relationship_type = "many_to_many"  (catalog convention for user-edges)
//   relationship_kind = "reference"
//   owner_side        = "source"
//   is_required       = false
//   data_object_relationship_label = "<source_name> <verb> <target_name>"
// `record_status` omitted -> defaults to 'new' (Rule #1).
// `notes` omitted -> defaults to '' (Rule #15).
const USERS_DO_ID = 748;

type UserEdge = {
  from_id: number;
  from_name: string;
  verb: string;
  inverse: string;
};

const USER_EDGES: UserEdge[] = [
  // B1-U1: dashcam_events -> users (single safety reviewer)
  {
    from_id: 378,
    from_name: "dashcam_events",
    verb: "reviewed by",
    inverse: "reviews",
  },
  // B1-U2: driver_behavior_events -> users (driver)
  {
    from_id: 376,
    from_name: "driver_behavior_events",
    verb: "attributed to",
    inverse: "is attributed",
  },
  // B1-U3: driver_safety_scorecards -> users (driver scored)
  {
    from_id: 734,
    from_name: "driver_safety_scorecards",
    verb: "attributed to",
    inverse: "is attributed",
  },
  // B1-U4: eld_logs -> users (driver)
  {
    from_id: 377,
    from_name: "eld_logs",
    verb: "attributed to",
    inverse: "is attributed",
  },
];

async function loadUserEdges() {
  console.log("\n=== Step 2: B1-U1..U4 user-edge data_object_relationships ===");
  // Idempotency: read every existing edge from any of these 4 source rows to users.
  const fromIds = USER_EDGES.map((e) => e.from_id).join(",");
  const existing = await get(
    `/data_object_relationships?related_data_object_id=eq.${USERS_DO_ID}&data_object_id=in.(${fromIds})&select=id,data_object_id,relationship_verb`,
  );
  const haveByFrom = new Map<number, any[]>();
  for (const row of existing) {
    const arr = haveByFrom.get(row.data_object_id) ?? [];
    arr.push(row);
    haveByFrom.set(row.data_object_id, arr);
  }

  const toInsert: Row[] = [];
  for (const edge of USER_EDGES) {
    const hits = haveByFrom.get(edge.from_id) ?? [];
    const dup = hits.find((h) => h.relationship_verb === edge.verb);
    if (dup) {
      console.log(
        `  SKIP ${edge.from_name} -> users (verb='${edge.verb}') already exists id=${dup.id}`,
      );
      continue;
    }
    toInsert.push({
      data_object_id: edge.from_id,
      related_data_object_id: USERS_DO_ID,
      relationship_type: "many_to_many",
      relationship_kind: "reference",
      relationship_verb: edge.verb,
      inverse_verb: edge.inverse,
      owner_side: "source",
      is_required: false,
      data_object_relationship_label: `${edge.from_name} ${edge.verb} users`,
    });
  }

  if (toInsert.length === 0) {
    console.log("  result: nothing to insert");
    return;
  }
  const inserted = await post(
    "/data_object_relationships?select=id,data_object_id,related_data_object_id,relationship_verb",
    toInsert,
  );
  console.log(`  result: inserted ${inserted.length} user-edge rows`);
  for (const row of inserted) {
    console.log(
      `    id=${row.id} ${row.data_object_id} -> ${row.related_data_object_id} (${row.relationship_verb})`,
    );
  }
}

// ---------------------------------------------------------------------------
// Step 3: B1-A* handoff_processes (only audit-confident L4 with resolvable PCF)
// ---------------------------------------------------------------------------
// Audit pre-specifies each (handoff_id, process_id) tuple with "confident L4".
// `proposal_source` set to 'agent_curated' per the audit (new proposals).
// `role` defaults to 'implements'. `record_status` defaults to 'new'. `notes' = ''.
// `label` is required text; we set "<handoff_id>.<process_id>" mirroring the
// computed `key` shape (the database trigger sets `key` itself, label is the
// human-facing label slot).
type HandoffProcess = {
  handoff_id: number;
  process_id: number;
  audit_id: string; // B1-A* tag for log clarity
};

const HANDOFF_PROCESSES: HandoffProcess[] = [
  { audit_id: "B1-A1", handoff_id: 314, process_id: 1607 },
  { audit_id: "B1-A3", handoff_id: 319, process_id: 862 },
  { audit_id: "B1-A4", handoff_id: 321, process_id: 862 },
  { audit_id: "B1-A6", handoff_id: 880, process_id: 862 },
  { audit_id: "B1-A7", handoff_id: 881, process_id: 1543 },
  { audit_id: "B1-A8", handoff_id: 882, process_id: 1607 },
  { audit_id: "B1-A11", handoff_id: 874, process_id: 862 },
];

async function loadHandoffProcesses() {
  console.log("\n=== Step 3: B1-A* handoff_processes (7 confident L4 rows) ===");
  // Pre-flight: verify handoffs + processes all exist.
  const handoffIds = HANDOFF_PROCESSES.map((h) => h.handoff_id).join(",");
  const processIds = [...new Set(HANDOFF_PROCESSES.map((h) => h.process_id))].join(",");
  const handoffs = await get(`/handoffs?id=in.(${handoffIds})&select=id`);
  const processes = await get(`/processes?id=in.(${processIds})&select=id`);
  const handoffSet = new Set(handoffs.map((h) => h.id));
  const processSet = new Set(processes.map((p) => p.id));
  for (const row of HANDOFF_PROCESSES) {
    if (!handoffSet.has(row.handoff_id))
      throw new Error(`${row.audit_id}: handoff ${row.handoff_id} missing live`);
    if (!processSet.has(row.process_id))
      throw new Error(`${row.audit_id}: process ${row.process_id} missing live`);
  }

  // Idempotency: existing rows for any of these handoffs.
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds})&select=id,handoff_id,process_id`,
  );
  const haveKey = new Set(
    existing.map((r) => `${r.handoff_id}.${r.process_id}`),
  );

  const toInsert: Row[] = [];
  for (const target of HANDOFF_PROCESSES) {
    const key = `${target.handoff_id}.${target.process_id}`;
    if (haveKey.has(key)) {
      console.log(
        `  SKIP ${target.audit_id} key=${key} already exists`,
      );
      continue;
    }
    toInsert.push({
      handoff_id: target.handoff_id,
      process_id: target.process_id,
      proposal_source: "agent_curated",
      label: key,
    });
  }

  if (toInsert.length === 0) {
    console.log("  result: nothing to insert");
    return;
  }
  const inserted = await post(
    "/handoff_processes?select=id,handoff_id,process_id,proposal_source,record_status",
    toInsert,
  );
  console.log(`  result: inserted ${inserted.length} handoff_processes rows`);
  for (const row of inserted) {
    console.log(
      `    id=${row.id} handoff=${row.handoff_id} process=${row.process_id} src=${row.proposal_source} status=${row.record_status}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("TELEMATICS B1 technical fixes - 2026-05-31");
  console.log("(domain id 148, module 1001 domain_map)");

  await backfillTriggerEvents();
  await loadUserEdges();
  await loadHandoffProcesses();

  console.log("\nDone. Spot-check via the UI:");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
