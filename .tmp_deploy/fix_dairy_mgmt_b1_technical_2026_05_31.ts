#!/usr/bin/env bun
/**
 * DAIRY-MGMT B1 truly-technical fixes (2026-05-31 continuation).
 *
 * Applies ONLY the audit's pre-specified, no-judgment items:
 *
 *   1. B1-S5  PATCH trigger_events.event_category for 5 events
 *             (dairy_cow.lifecycle_changed, lactation_record.opened,
 *              milking.completed, breeding_event.recorded, feed_ration.changed)
 *             from "" -> "lifecycle".
 *
 *   2. B1-S4  INSERT 7 user-edges into data_object_relationships
 *             (Rule #10 built-in edges). All target users (id=748).
 *
 *   3. B1-H1  INSERT 6 handoff_processes rows that the audit table
 *             pre-specifies with handoff_id + PCF id + external_id.
 *             record_status omitted (defaults to 'new' per Rule #1).
 *             proposal_source='agent_curated'. Skips 2 deferred rows
 *             (handoff_id 956, 958 - audit lists as "Deferred to
 *             Discover Pass 3").
 *
 * Deferred (NOT applied by this loader):
 *   - B1-S1   M1 zero modules (new entities; Bucket 2.1 gates).
 *   - B1-S2   A4 catalog_tagline / catalog_description (Rule #20).
 *   - B1-S3   B6 intra-domain data_object_relationships (audit lists
 *             edges informally; not user-edges per Rule #10 scope).
 *   - B1-S6   New handoff dairy_cow.lifecycle_changed -> ERP-FIN
 *             (needs target module per audit; gated on ERP-FIN B10b).
 *   - B1-S7   B11 aliases (audit gives suggestive lists, not exact
 *             insertable tuples).
 *   - B1-S8   B12 lifecycle states (gated on M1 modules).
 *   - B1-S9   F1 DELETE legacy dairy-mgmt-system skill (gated on
 *             module-level skills first).
 *   - B1-S10  F3 extend tool set (Phase S new tools).
 *   - B1-B1   B10b source_domain_module_id backfill (gated on M1).
 *   - B1-B2..B5  B8 cross-domain relationship mirrors (gated on
 *                neighbor payload masters being identified).
 *
 * Idempotent: every step reads existing state and inserts/patches only
 * the missing rows. Safe to re-run.
 *
 * Run from project root:
 *   bun run c:/dev/domain-map/.tmp_deploy/fix_dairy_mgmt_b1_technical_2026_05_31.ts
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

const DAIRY_DOMAIN_ID = 156;
const USERS_DO_ID = 748;

// ---------------------------------------------------------------------------
// B1-S5: PATCH trigger_events.event_category from "" to "lifecycle".
// Audit pre-specifies all 5 event names + the target enum value.
// ---------------------------------------------------------------------------

const EVENT_CATEGORY_FIXES: { event_name: string; new_category: string }[] = [
  { event_name: "dairy_cow.lifecycle_changed", new_category: "lifecycle" },
  { event_name: "lactation_record.opened", new_category: "lifecycle" },
  { event_name: "milking.completed", new_category: "lifecycle" },
  { event_name: "breeding_event.recorded", new_category: "lifecycle" },
  { event_name: "feed_ration.changed", new_category: "lifecycle" },
];

async function fixEventCategories() {
  console.log("\n=== B1-S5: PATCH trigger_events.event_category ===");
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
// B1-S4: INSERT 7 user-edges (Rule #10).
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
    source_name: "dairy_cows",
    relationship_verb: "has assigned herdsman",
    inverse_verb: "is assigned herdsman for",
    is_required: false,
  },
  {
    source_name: "milkings",
    relationship_verb: "is recorded by",
    inverse_verb: "records",
    is_required: true,
  },
  {
    source_name: "milk_quality_tests",
    relationship_verb: "is sampled by",
    inverse_verb: "samples",
    is_required: true,
  },
  {
    source_name: "breeding_events",
    relationship_verb: "is performed by technician",
    inverse_verb: "performs",
    is_required: true,
  },
  {
    source_name: "cow_health_events",
    relationship_verb: "is administered by veterinarian",
    inverse_verb: "administers",
    is_required: true,
  },
  {
    source_name: "feed_rations",
    relationship_verb: "is formulated by",
    inverse_verb: "formulates",
    is_required: true,
  },
  {
    source_name: "bulk_milk_shipments",
    relationship_verb: "is dispatched by",
    inverse_verb: "dispatches",
    is_required: true,
  },
];

async function insertUserEdges() {
  console.log("\n=== B1-S4: INSERT data_object_relationships user-edges ===");

  // Resolve source data_object IDs by name in one batch.
  const names = USER_EDGES.map((e) => e.source_name);
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
// B1-H1: INSERT 6 handoff_processes rows pre-specified by the audit.
// Skips deferred rows (handoff_id 956, 958).
// ---------------------------------------------------------------------------

type HandoffProcess = {
  handoff_id: number;
  process_id: number;
  expected_external_id: string;
  pcf_name: string; // for logging only
};

const HANDOFF_PROCESSES: HandoffProcess[] = [
  { handoff_id: 354, process_id: 170, expected_external_id: "10369", pcf_name: "Perform quality testing" },
  { handoff_id: 355, process_id: 70, expected_external_id: "17467", pcf_name: "Manage compliance" },
  { handoff_id: 353, process_id: 171, expected_external_id: "10370", pcf_name: "Maintain production records and manage lot traceability" },
  { handoff_id: 955, process_id: 171, expected_external_id: "10370", pcf_name: "Maintain production records and manage lot traceability" },
  { handoff_id: 957, process_id: 556, expected_external_id: "11749", pcf_name: "Manage traceability data" },
  { handoff_id: 959, process_id: 556, expected_external_id: "11749", pcf_name: "Manage traceability data" },
];

async function insertHandoffProcesses() {
  console.log("\n=== B1-H1: INSERT handoff_processes (agent_curated) ===");

  // Pre-flight: verify every handoff_id + process_id still resolves.
  const handoffIds = [...new Set(HANDOFF_PROCESSES.map((r) => r.handoff_id))];
  const processIds = [...new Set(HANDOFF_PROCESSES.map((r) => r.process_id))];

  const [handoffs, processes] = await Promise.all([
    get(`/handoffs?select=id,source_domain_id&id=in.(${handoffIds.join(",")})`),
    get(`/processes?select=id,external_id&id=in.(${processIds.join(",")})`),
  ]);
  const handoffIdSet = new Set(handoffs.map((h) => Number(h.id)));
  const processMap = new Map<number, string>(
    processes.map((p) => [Number(p.id), String(p.external_id)]),
  );

  // Verify handoffs are DAIRY-MGMT sourced.
  for (const h of handoffs) {
    if (Number(h.source_domain_id) !== DAIRY_DOMAIN_ID) {
      throw new Error(
        `pre-flight: handoff id=${h.id} source_domain_id=${h.source_domain_id} is not DAIRY-MGMT (${DAIRY_DOMAIN_ID})`,
      );
    }
  }

  // Verify each row's PCF external_id matches what the audit recorded.
  for (const row of HANDOFF_PROCESSES) {
    if (!handoffIdSet.has(row.handoff_id)) {
      throw new Error(`pre-flight: handoff_id=${row.handoff_id} not found`);
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

  const toInsert: Row[] = [];
  for (const row of HANDOFF_PROCESSES) {
    const key = `${row.handoff_id}|${row.process_id}`;
    if (existingKey.has(key)) {
      console.log(`  = handoff_id=${row.handoff_id} process_id=${row.process_id}: exists, skipping`);
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
  console.log("DAIRY-MGMT B1 truly-technical fixes (2026-05-31)");
  console.log("=================================================");

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
