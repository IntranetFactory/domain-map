#!/usr/bin/env bun
/**
 * FOOD-TRACE B1 truly-technical fixes (2026-05-31 continuation).
 *
 * Applies ONLY the audit's pre-specified, no-judgment items:
 *
 *   1. ENUM BACKFILL  PATCH trigger_events.event_category for 3 events
 *      (traceability_lot.created, critical_tracking_event.recorded,
 *       key_data_element.captured) from "" -> "lifecycle".
 *      These are unambiguous lifecycle verbs in the event names.
 *
 *   2. B1-S6  INSERT 7 user-edges (Rule #10) into data_object_relationships.
 *      All edges are <master> -> users (id=748), matching the catalog idiom
 *      established in fix_dairy_mgmt_b1_technical_2026_05_31.ts.
 *      Audit pre-specifies each actor mapping:
 *        - traceability_lots: created_by
 *        - critical_tracking_events: recorded_by, verified_by
 *        - key_data_elements: captured_by
 *        - recall_events: initiated_by, approved_by, communicated_by
 *
 *   3. B1-H1  INSERT 7 handoff_processes rows pre-specified by the audit
 *      with handoff_id + PCF external_id. proposal_source='agent_curated'.
 *      Skips 8 audit rows that already have matching or competing
 *      handoff_processes rows (351, 353, 356, 361, 955, 971, 976, 978).
 *      Skips the 5 audit-deferred rows (349, 959, 963, 965, 969).
 *
 * Deferred (NOT applied by this loader):
 *   - B1-S1   A4 catalog_tagline / catalog_description (Rule #20).
 *   - B1-S2   M1 zero modules (new entities; gated on Bucket 2 #1).
 *   - B1-S3   Regulations gap: zero matching `regulations` rows exist
 *             in the catalog (FSMA, EU 1169/2011, SFCR, COOL, etc. all
 *             absent). Cannot INSERT `domain_regulations` without first
 *             creating new `regulations` rows, which is judgment work.
 *   - B1-S4   Pattern flag flips on the 5 masters (deferred per rubric).
 *   - B1-S5   B6 intra-domain `data_object_relationships` (not user-edges
 *             scope of Rule #10; verb selection is judgment).
 *   - B1-S7   B8 outbound cross-domain DOR mirrors (judgment per neighbor;
 *             gated on payload owner identification).
 *   - B1-S8   B9 missing events (new entities).
 *   - B1-S9   B11 aliases: audit pre-specifies alias strings but not
 *             alias_type (synonym vs industry_term vs solution_term);
 *             industry_id / solution_id binding is judgment.
 *   - B1-S10  B12 lifecycle states (gated on M1 modules for workflow-gate
 *             realizing-module attribution).
 *   - B1-S11  F1 legacy skill 62 cleanup (sequenced after M1 module skills).
 *   - B1-S12  C2 capability function-divergence review (Bucket 2).
 *   - B1-M1..M6  New masters (new entities, gated on Bucket 2 #1 modules).
 *   - B10b FK PATCHes: cascade from M1 (no FOOD-TRACE modules exist).
 *
 * Idempotent: every step reads existing state and inserts/patches only
 * the missing rows. Safe to re-run.
 *
 * Run from project root (c:/dev/domain-map) per CLAUDE.md:
 *   bun run c:/dev/domain-map/.tmp_deploy/fix_food_trace_b1_technical_2026_05_31.ts
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

const FOOD_TRACE_DOMAIN_ID = 155;
const USERS_DO_ID = 748;

// ---------------------------------------------------------------------------
// ENUM BACKFILL: PATCH trigger_events.event_category from "" to "lifecycle".
// The 3 FOOD-TRACE-mastered events with empty event_category have names that
// unambiguously describe lifecycle verbs (.created, .recorded, .captured).
// ---------------------------------------------------------------------------

const EVENT_CATEGORY_FIXES: { event_name: string; new_category: string }[] = [
  { event_name: "traceability_lot.created", new_category: "lifecycle" },
  { event_name: "critical_tracking_event.recorded", new_category: "lifecycle" },
  { event_name: "key_data_element.captured", new_category: "lifecycle" },
];

async function fixEventCategories() {
  console.log("\n=== ENUM BACKFILL: PATCH trigger_events.event_category ===");
  for (const fix of EVENT_CATEGORY_FIXES) {
    const rows = await get(
      `/trigger_events?select=id,event_name,event_category&event_name=eq.${encodeURIComponent(fix.event_name)}`,
    );
    if (rows.length === 0) {
      console.log(`  ! ${fix.event_name}: NOT FOUND, skipping`);
      continue;
    }
    if (rows.length > 1) {
      console.log(`  ! ${fix.event_name}: ${rows.length} matches, skipping (ambiguous)`);
      continue;
    }
    const row = rows[0];
    if (row.event_category === fix.new_category) {
      console.log(`  = ${fix.event_name} (id=${row.id}): already "${fix.new_category}", skipping`);
      continue;
    }
    if (row.event_category !== "") {
      console.log(
        `  ! ${fix.event_name} (id=${row.id}): live value is "${row.event_category}", not "" - skipping (no longer matches audit precondition)`,
      );
      continue;
    }
    await patch(`/trigger_events?id=eq.${row.id}`, { event_category: fix.new_category });
    console.log(`  + ${fix.event_name} (id=${row.id}): "" -> "${fix.new_category}"`);
  }
}

// ---------------------------------------------------------------------------
// B1-S6: INSERT 7 user-edges (Rule #10).
// Each edge: <master_data_object> -> users (id=748).
// many_to_many reference (matches catalog idiom for user-actor edges).
// ---------------------------------------------------------------------------

type UserEdge = {
  source_name: string;
  relationship_verb: string;
  inverse_verb: string;
  is_required: boolean;
};

const USER_EDGES: UserEdge[] = [
  {
    source_name: "traceability_lots",
    relationship_verb: "is created by",
    inverse_verb: "creates",
    is_required: true,
  },
  {
    source_name: "critical_tracking_events",
    relationship_verb: "is recorded by",
    inverse_verb: "records",
    is_required: true,
  },
  {
    source_name: "critical_tracking_events",
    relationship_verb: "is verified by",
    inverse_verb: "verifies",
    is_required: false,
  },
  {
    source_name: "key_data_elements",
    relationship_verb: "is captured by",
    inverse_verb: "captures",
    is_required: true,
  },
  {
    source_name: "recall_events",
    relationship_verb: "is initiated by",
    inverse_verb: "initiates",
    is_required: true,
  },
  {
    source_name: "recall_events",
    relationship_verb: "is approved by",
    inverse_verb: "approves",
    is_required: true,
  },
  {
    source_name: "recall_events",
    relationship_verb: "is communicated by",
    inverse_verb: "communicates",
    is_required: false,
  },
];

async function insertUserEdges() {
  console.log("\n=== B1-S6: INSERT data_object_relationships user-edges ===");

  // Resolve source data_object IDs by name in one batch.
  const names = [...new Set(USER_EDGES.map((e) => e.source_name))];
  const nameList = names.map((n) => encodeURIComponent(n)).join(",");
  const doRows = await get(
    `/data_objects?select=id,data_object_name&data_object_name=in.(${nameList})`,
  );
  const nameToId = new Map<string, number>(
    doRows.map((r) => [String(r.data_object_name), Number(r.id)]),
  );

  // Pre-flight: existing edges to users from these masters.
  const sourceIds = doRows.map((r) => Number(r.id));
  const existing = await get(
    `/data_object_relationships?select=id,data_object_id,related_data_object_id,relationship_verb&data_object_id=in.(${sourceIds.join(",")})&related_data_object_id=eq.${USERS_DO_ID}`,
  );
  const existingKey = new Set(
    existing.map((r) => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`),
  );

  const toInsert: Row[] = [];
  for (const edge of USER_EDGES) {
    const srcId = nameToId.get(edge.source_name);
    if (!srcId) {
      console.log(`  ! ${edge.source_name}: data_object not found, skipping`);
      continue;
    }
    const key = `${srcId}|${USERS_DO_ID}|${edge.relationship_verb}`;
    if (existingKey.has(key)) {
      console.log(`  = ${edge.source_name} -> users (${edge.relationship_verb}): exists, skipping`);
      continue;
    }
    toInsert.push({
      data_object_id: srcId,
      related_data_object_id: USERS_DO_ID,
      data_object_relationship_label: `${edge.source_name} ${edge.relationship_verb} users`,
      relationship_verb: edge.relationship_verb,
      inverse_verb: edge.inverse_verb,
      relationship_type: "many_to_many",
      relationship_kind: "reference",
      owner_side: "source",
      is_required: edge.is_required,
      // record_status omitted -> defaults to 'new' per Rule #1.
      // notes omitted -> empty per Rule #15.
    });
  }

  if (toInsert.length === 0) {
    console.log("  (nothing to insert)");
    return;
  }
  const inserted = await post("/data_object_relationships", toInsert);
  for (const r of inserted) {
    console.log(`  + id=${r.id} ${r.data_object_relationship_label}`);
  }
}

// ---------------------------------------------------------------------------
// B1-H1: INSERT 7 handoff_processes rows pre-specified by the audit.
// Audit table B1-H1 has 15 curated rows. Of those:
//   - 8 already have matching or competing handoff_processes loaded:
//       351 (171), 353 (171), 356 (204), 361 (805), 955 (171),
//       976 (37), and the competing ones 971 (audit 171 vs loaded 818),
//       978 (audit 37 vs loaded 208).
//     Competing rows: existing already-loaded row stands; rubric does not
//     license PATCHing or appending a second row.
//   - 7 need INSERT: 359, 360, 362, 954, 972, 973, 974.
// The 5 audit-deferred rows (349, 959, 963, 965, 969) are not loaded.
// ---------------------------------------------------------------------------

type HandoffProcess = {
  handoff_id: number;
  process_id: number;
  expected_external_id: string;
  pcf_name: string; // for logging only
};

const HANDOFF_PROCESSES: HandoffProcess[] = [
  { handoff_id: 359, process_id: 204, expected_external_id: "20111", pcf_name: "Initiate recall" },
  { handoff_id: 360, process_id: 37, expected_external_id: "20110", pcf_name: "Manage product recalls and regulatory audits" },
  { handoff_id: 362, process_id: 815, expected_external_id: "10299", pcf_name: "Monitor/Manage supplier information" },
  { handoff_id: 954, process_id: 171, expected_external_id: "10370", pcf_name: "Maintain production records and manage lot traceability" },
  { handoff_id: 972, process_id: 556, expected_external_id: "11749", pcf_name: "Manage traceability data" },
  { handoff_id: 973, process_id: 1830, expected_external_id: "12773", pcf_name: "Maintain records for regulatory agencies" },
  { handoff_id: 974, process_id: 1570, expected_external_id: "12183", pcf_name: "Manage compliance audits" },
];

async function insertHandoffProcesses() {
  console.log("\n=== B1-H1: INSERT handoff_processes (agent_curated) ===");

  const handoffIds = [...new Set(HANDOFF_PROCESSES.map((r) => r.handoff_id))];
  const processIds = [...new Set(HANDOFF_PROCESSES.map((r) => r.process_id))];

  const [handoffs, processes] = await Promise.all([
    get(`/handoffs?select=id,source_domain_id,target_domain_id&id=in.(${handoffIds.join(",")})`),
    get(`/processes?select=id,external_id&id=in.(${processIds.join(",")})`),
  ]);
  const handoffMap = new Map<number, { source: number; target: number }>(
    handoffs.map((h) => [
      Number(h.id),
      { source: Number(h.source_domain_id), target: Number(h.target_domain_id) },
    ]),
  );
  const processMap = new Map<number, string>(
    processes.map((p) => [Number(p.id), String(p.external_id)]),
  );

  // Verify each handoff touches FOOD-TRACE.
  for (const row of HANDOFF_PROCESSES) {
    const h = handoffMap.get(row.handoff_id);
    if (!h) {
      throw new Error(`pre-flight: handoff_id=${row.handoff_id} not found`);
    }
    if (h.source !== FOOD_TRACE_DOMAIN_ID && h.target !== FOOD_TRACE_DOMAIN_ID) {
      throw new Error(
        `pre-flight: handoff id=${row.handoff_id} (source=${h.source}, target=${h.target}) does not touch FOOD-TRACE (${FOOD_TRACE_DOMAIN_ID})`,
      );
    }
    const liveExternal = processMap.get(row.process_id);
    if (!liveExternal) {
      throw new Error(`pre-flight: process_id=${row.process_id} not found`);
    }
    if (liveExternal !== row.expected_external_id) {
      throw new Error(
        `pre-flight: process_id=${row.process_id} external_id is "${liveExternal}", audit expected "${row.expected_external_id}". Refusing to write.`,
      );
    }
  }
  console.log(`  + pre-flight: all ${HANDOFF_PROCESSES.length} (handoff_id, process_id) pairs verified`);

  // Existing rows on this set of handoff_ids - skip duplicates.
  const existing = await get(
    `/handoff_processes?select=id,handoff_id,process_id&handoff_id=in.(${handoffIds.join(",")})`,
  );
  const existingKey = new Set(existing.map((r) => `${r.handoff_id}|${r.process_id}`));
  const existingByHandoff = new Map<number, number[]>();
  for (const r of existing) {
    const hid = Number(r.handoff_id);
    const list = existingByHandoff.get(hid) ?? [];
    list.push(Number(r.process_id));
    existingByHandoff.set(hid, list);
  }

  const toInsert: Row[] = [];
  for (const row of HANDOFF_PROCESSES) {
    const key = `${row.handoff_id}|${row.process_id}`;
    if (existingKey.has(key)) {
      console.log(`  = handoff_id=${row.handoff_id} process_id=${row.process_id}: exists, skipping`);
      continue;
    }
    const competing = existingByHandoff.get(row.handoff_id);
    if (competing && competing.length > 0) {
      console.log(
        `  ! handoff_id=${row.handoff_id}: already has process_id(s) ${competing.join(",")} loaded; audit asks ${row.process_id}. Skipping (rubric does not license PATCH or competing append).`,
      );
      continue;
    }
    toInsert.push({
      handoff_id: row.handoff_id,
      process_id: row.process_id,
      role: "implements",
      proposal_source: "agent_curated",
      // record_status omitted -> defaults to 'new' per Rule #1.
      // notes omitted -> empty per Rule #15.
    });
  }

  if (toInsert.length === 0) {
    console.log("  (nothing to insert)");
    return;
  }
  const inserted = await post("/handoff_processes", toInsert);
  for (const r of inserted) {
    const audit = HANDOFF_PROCESSES.find(
      (a) => a.handoff_id === Number(r.handoff_id) && a.process_id === Number(r.process_id),
    );
    console.log(
      `  + id=${r.id} handoff_id=${r.handoff_id} -> process_id=${r.process_id} (${audit?.pcf_name}) key="${r.key}"`,
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("FOOD-TRACE B1 truly-technical fixes (2026-05-31)");
  console.log("================================================");

  await fixEventCategories();
  await insertUserEdges();
  await insertHandoffProcesses();

  console.log("\nDone.");
  console.log("  UI links:");
  console.log("    https://tests.semantius.app/domain_map/trigger_events");
  console.log("    https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("    https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
