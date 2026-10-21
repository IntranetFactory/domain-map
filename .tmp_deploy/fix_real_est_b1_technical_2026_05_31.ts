/**
 * REAL-EST b1 technical fixes (audit 2026-05-30).
 *
 * Applies the subset of Bucket 1 findings that are truly technical
 * (enum backfills, Rule #10 user-edges with pre-specified actor lists,
 * handoff_processes inserts where the audit pre-specifies handoff_id +
 * resolvable PCF). Architectural decisions (module split, lifecycle
 * states, NULL module FKs, aliases, function ownership, system-skill
 * rebind) are deferred to a follow-up gated on the user's B2 answers.
 *
 * Idempotent: every write is preceded by a read against the natural key
 * or composed key, and skipped when already present.
 *
 * Run from project root: bun run .tmp_deploy/fix_real_est_b1_technical_2026_05_31.ts
 */

type CmdResult = { ok: boolean; data: any; stderr: string; code: number };

async function call(server: string, tool: string, payload: any): Promise<CmdResult> {
  const proc = Bun.spawn(["semantius", "call", server, tool], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) return { ok: false, data: null, stderr: err.trim() || out.trim(), code };
  return { ok: true, data: out.trim() ? JSON.parse(out.trim()) : null, stderr: "", code };
}

async function get(path: string): Promise<any> {
  const r = await call("crud", "postgrestRequest", { method: "GET", path });
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.stderr}`);
  return r.data;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await call("crud", "postgrestRequest", { method: "PATCH", path, body });
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.stderr}`);
  return r.data;
}

async function post(path: string, body: any): Promise<any> {
  const r = await call("crud", "postgrestRequest", { method: "POST", path, body });
  if (!r.ok) throw new Error(`POST ${path} failed: ${r.stderr}`);
  return r.data;
}

// Resolved IDs (verified live before authoring this loader).
const USERS_DO_ID = 748;
const DO = {
  real_estate_properties: 344,
  property_leases: 345,
  floor_plans: 346,
  property_spaces: 347,
  occupancy_records: 348,
  facility_work_orders: 349,
  utility_meter_readings: 350,
  capital_projects: 351,
} as const;

// =====================================================================
// B1-S4: PATCH trigger_events.event_category enum backfill (4 rows)
// =====================================================================
async function fixB1S4() {
  console.log("\n[B1-S4] trigger_events.event_category backfill");
  const patches: Array<{ id: number; event_category: string }> = [
    { id: 938, event_category: "lifecycle" },     // property.listed
    { id: 939, event_category: "state_change" },  // property.updated
    { id: 940, event_category: "lifecycle" },     // floor_plan.created
    { id: 941, event_category: "state_change" },  // floor_plan.updated
  ];
  for (const p of patches) {
    const existing = await get(`/trigger_events?id=eq.${p.id}&select=id,event_name,event_category`);
    if (existing.length === 0) {
      console.warn(`  trigger_event ${p.id} not found, skipping`);
      continue;
    }
    if (existing[0].event_category === p.event_category) {
      console.log(`  ${p.id} (${existing[0].event_name}) already = ${p.event_category}, skip`);
      continue;
    }
    await patch(`/trigger_events?id=eq.${p.id}`, { event_category: p.event_category });
    console.log(`  ${p.id} (${existing[0].event_name}) -> ${p.event_category}`);
  }
}

// =====================================================================
// B1-S3: INSERT data_object_relationships user-edges (Rule #10)
// Audit pre-specifies actor list per master in B1-S3.
// =====================================================================
async function fixB1S3() {
  console.log("\n[B1-S3] users edges per Rule #10");
  type Edge = {
    related_data_object_id: number;
    relationship_verb: string;
    inverse_verb: string;
  };
  // source = users (748); target = each master. Verb is parent-voice
  // (user is_X master); inverse points from master back to user.
  const edges: Edge[] = [
    // real_estate_properties: property_owner
    { related_data_object_id: DO.real_estate_properties, relationship_verb: "owns", inverse_verb: "is owned by" },
    // property_leases: lease_signer + lease_approver
    { related_data_object_id: DO.property_leases, relationship_verb: "signs", inverse_verb: "is signed by" },
    { related_data_object_id: DO.property_leases, relationship_verb: "approves", inverse_verb: "is approved by" },
    // floor_plans: architect_author
    { related_data_object_id: DO.floor_plans, relationship_verb: "authors", inverse_verb: "is authored by" },
    // property_spaces: occupant + space_planner
    { related_data_object_id: DO.property_spaces, relationship_verb: "occupies", inverse_verb: "is occupied by" },
    { related_data_object_id: DO.property_spaces, relationship_verb: "plans", inverse_verb: "is planned by" },
    // occupancy_records: recorded_by
    { related_data_object_id: DO.occupancy_records, relationship_verb: "records", inverse_verb: "is recorded by" },
    // facility_work_orders: requestor + assignee + approver
    { related_data_object_id: DO.facility_work_orders, relationship_verb: "requests", inverse_verb: "is requested by" },
    { related_data_object_id: DO.facility_work_orders, relationship_verb: "is assigned to", inverse_verb: "is assigned" },
    { related_data_object_id: DO.facility_work_orders, relationship_verb: "approves", inverse_verb: "is approved by" },
    // utility_meter_readings: reader
    { related_data_object_id: DO.utility_meter_readings, relationship_verb: "reads", inverse_verb: "is read by" },
    // capital_projects: project_manager + approver
    { related_data_object_id: DO.capital_projects, relationship_verb: "manages", inverse_verb: "is managed by" },
    { related_data_object_id: DO.capital_projects, relationship_verb: "approves", inverse_verb: "is approved by" },
  ];

  // Pre-read all existing user edges on the 8 masters.
  const targetIds = Object.values(DO).join(",");
  const existing = await get(
    `/data_object_relationships?data_object_id=eq.${USERS_DO_ID}&related_data_object_id=in.(${targetIds})&select=id,related_data_object_id,relationship_verb`
  );
  const existingKey = new Set(
    existing.map((r: any) => `${r.related_data_object_id}::${r.relationship_verb}`)
  );

  const toInsert = edges
    .filter(e => !existingKey.has(`${e.related_data_object_id}::${e.relationship_verb}`))
    .map(e => ({
      data_object_id: USERS_DO_ID,
      related_data_object_id: e.related_data_object_id,
      relationship_verb: e.relationship_verb,
      inverse_verb: e.inverse_verb,
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      owner_side: "target", // master owns lifecycle; user is just an actor reference
      is_required: false,
      // record_status omitted -> defaults to 'new'
      // notes omitted -> defaults to ''
    }));

  if (toInsert.length === 0) {
    console.log(`  all ${edges.length} user edges already present, nothing to insert`);
    return;
  }
  console.log(`  inserting ${toInsert.length} user edges (${existing.length} pre-existing)`);
  await post(`/data_object_relationships`, toInsert);
  console.log(`  done`);
}

// =====================================================================
// H1: INSERT handoff_processes for handoffs with resolvable PCF
// Audit pre-specifies handoff_id + PCF name; resolve PCF id by name.
// Skip any handoff that already has any handoff_processes row matching
// the proposed process_id (composed-key idempotency).
// =====================================================================
async function fixH1() {
  console.log("\n[H1] handoff_processes inserts (agent_curated)");
  // (handoff_id, process_id) resolved live from /processes by name.
  // Verified IDs: see resolution table in audit reply.
  const rows: Array<{ handoff_id: number; process_id: number; note: string }> = [
    { handoff_id: 292, process_id: 353, note: "Perform asset maintenance (FSM->REAL-EST work_order.completed)" },
    { handoff_id: 293, process_id: 1783, note: "Evaluate environmental impact... (REAL-EST->ESG utility published)" },
    { handoff_id: 294, process_id: 1412, note: "Measure financial returns... (REAL-EST->EAM capital completed)" },
    { handoff_id: 295, process_id: 345, note: "Provide workspace and facilities (REAL-EST->HCM space allocated)" },
    { handoff_id: 856, process_id: 1511, note: "Confirm alignment of property... (REAL-EST->RE-CRE listed)" },
    { handoff_id: 858, process_id: 344, note: "Plan facility (REAL-EST->IWMS floor_plan updated)" },
    { handoff_id: 870, process_id: 345, note: "Provide workspace and facilities (IWMS->REAL-EST utilization)" },
  ];

  // Idempotency: pull every existing (handoff_id, process_id) for these handoffs.
  const handoffIds = rows.map(r => r.handoff_id).join(",");
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds})&select=handoff_id,process_id`
  );
  const existingKey = new Set(
    existing.map((r: any) => `${r.handoff_id}::${r.process_id}`)
  );

  // Resolve every process_id exists in /processes.
  const processIds = Array.from(new Set(rows.map(r => r.process_id))).join(",");
  const processCheck = await get(`/processes?id=in.(${processIds})&select=id,process_name`);
  const foundProcessIds = new Set(processCheck.map((p: any) => Number(p.id)));
  for (const r of rows) {
    if (!foundProcessIds.has(r.process_id)) {
      throw new Error(`process_id ${r.process_id} (${r.note}) not found in /processes; aborting before any insert`);
    }
  }
  console.log(`  verified ${processCheck.length} PCF processes resolvable`);

  const toInsert = rows
    .filter(r => !existingKey.has(`${r.handoff_id}::${r.process_id}`))
    .map(r => ({
      handoff_id: r.handoff_id,
      process_id: r.process_id,
      role: "implements",
      proposal_source: "agent_curated",
      // record_status omitted -> defaults to 'new'
      // notes omitted -> defaults to '' (Rule #15)
    }));

  for (const r of rows) {
    if (existingKey.has(`${r.handoff_id}::${r.process_id}`)) {
      console.log(`  (${r.handoff_id}, ${r.process_id}) already present, skip`);
    }
  }
  if (toInsert.length === 0) {
    console.log(`  nothing to insert`);
    return;
  }
  console.log(`  inserting ${toInsert.length} agent_curated handoff_processes rows`);
  for (const row of toInsert) {
    await post(`/handoff_processes`, [row]);
    console.log(`  + (${row.handoff_id}, ${row.process_id})`);
  }
}

// =====================================================================
// MAIN
// =====================================================================
async function main() {
  // Sanity check tenant.
  const who = await call("crud", "getCurrentUser", {});
  if (!who.ok) throw new Error(`getCurrentUser failed: ${who.stderr}`);
  const email = who.data?.email ?? "<unknown>";
  console.log(`Authenticated as ${email}`);
  // Belt-and-braces: refuse to run if domain_map module (1001) is not in scope.
  const dm = (who.data?.modules ?? []).find((m: any) => Number(m.id) === 1001);
  if (!dm) throw new Error(`domain_map module (1001) not in tenant scope; aborting`);

  await fixB1S4();
  await fixB1S3();
  await fixH1();

  console.log("\nDone.");
  console.log("UI: https://tests.semantius.app/domain_map/trigger_events");
  console.log("UI: https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("UI: https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
