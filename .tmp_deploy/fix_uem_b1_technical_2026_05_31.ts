#!/usr/bin/env bun
// UEM B1 technical fixes (2026-05-31 continuation).
//
// Scope (strict technical-only license from the parent prompt):
//   1. B1-B2: PATCH trigger_events.event_category enum backfill on all 12 UEM
//      events (665-676). Audit pre-specifies the per-event category.
//   2. B1-S9: INSERT 6 data_object_relationships user-edges per Rule #10. Audit
//      pre-specifies the exact role-tuples (assigned_user, last_seen_user,
//      issued_to_user, created_by, policy_owner, uploaded_by). users id=748,
//      kind=platform_builtin verified live.
//   3. APQC TAGGING: INSERT 8 handoff_processes rows where the audit pre-
//      specifies handoff_id + resolvable PCF process_id. Handoff 662 deferred
//      per audit (no clean PCF). All 6 PCF process IDs verified live.
//
// Everything else from the UEM B1 list is deferred per the parent prompt's
// rules (new modules, new entities, new aliases beyond exact tuples, pattern
// flag flips, lifecycle states, catalog UX, new solutions, etc.).
//
// Idempotent: reads existing state, only writes deltas.

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

async function post(path: string, body: Row | Row[]): Promise<Row[]> {
  return call({ method: "POST", path, body });
}

// ============================================================
// 1. B1-B2: trigger_events.event_category backfill
// ============================================================
// Allowed enum (Rule #13): lifecycle, state_change, threshold, signal.
// Audit B1-B2 pre-specifies per-event category.
const eventCategoryMap: Record<number, "lifecycle" | "state_change"> = {
  665: "state_change", // enrolled_device.enrolled
  666: "state_change", // enrolled_device.retired
  667: "state_change", // enrolled_device.lost_or_stolen
  668: "state_change", // device_configuration_profile.assigned
  669: "state_change", // device_configuration_profile.drift_detected
  670: "lifecycle",    // device_compliance_policy.published
  671: "state_change", // device_compliance_result.non_compliant
  672: "state_change", // device_compliance_result.compliant
  673: "lifecycle",    // mobile_app_package.published
  674: "state_change", // device_app_assignment.deployed
  675: "lifecycle",    // enrollment_token.issued
  676: "state_change", // device_deployment_result.failed
};

async function backfillEventCategories() {
  console.log("\n=== B1-B2: trigger_events.event_category backfill ===");
  const ids = Object.keys(eventCategoryMap).map(Number);
  const existing = await get(
    `/trigger_events?id=in.(${ids.join(",")})&select=id,event_name,event_category`,
  );
  let patched = 0;
  let skipped = 0;
  for (const row of existing) {
    const id = Number(row.id);
    const want = eventCategoryMap[id];
    const have = String(row.event_category ?? "");
    if (have === want) {
      skipped++;
      continue;
    }
    if (have !== "" && have !== want) {
      console.log(`  WARNING: event ${id} (${row.event_name}) has unexpected category "${have}", overwriting with "${want}"`);
    }
    await patch(`/trigger_events?id=eq.${id}`, { event_category: want });
    console.log(`  PATCH event ${id} ${row.event_name}: "" -> ${want}`);
    patched++;
  }
  console.log(`  result: ${patched} patched, ${skipped} already correct`);
}

// ============================================================
// 2. B1-S9: data_object_relationships user-edges (Rule #10)
// ============================================================
// Audit pre-specifies 6 exact role-tuples across 5 UEM masters to platform
// built-in `users` (id 748, kind=platform_builtin). Label convention from
// existing rows: "<plural_master> has <role> users". All many_to_many,
// owner_side=source, relationship_kind=reference (Rule #10 default shape).
const USERS_ID = 748;

type UserEdge = {
  from_id: number;
  from_name: string;
  role_phrase: string; // human-readable role of the user wrt the master
};

const userEdges: UserEdge[] = [
  { from_id: 556, from_name: "enrolled_devices",              role_phrase: "assigned" },
  { from_id: 556, from_name: "enrolled_devices",              role_phrase: "last seen" },
  { from_id: 561, from_name: "enrollment_tokens",             role_phrase: "issued to" },
  { from_id: 557, from_name: "device_configuration_profiles", role_phrase: "created by" },
  { from_id: 558, from_name: "device_compliance_policies",    role_phrase: "owned by" },
  { from_id: 559, from_name: "mobile_app_packages",           role_phrase: "uploaded by" },
];

function userEdgeLabel(e: UserEdge): string {
  return `${e.from_name} has ${e.role_phrase} users`;
}

async function loadUserEdges() {
  console.log("\n=== B1-S9: data_object_relationships user-edges ===");
  // Idempotency: load all existing rows from the 6 UEM masters pointing at users
  const fromIds = [...new Set(userEdges.map(e => e.from_id))];
  const existing = await get(
    `/data_object_relationships?data_object_id=in.(${fromIds.join(",")})&related_data_object_id=eq.${USERS_ID}&select=id,data_object_id,related_data_object_id,data_object_relationship_label`,
  );
  const existingLabels = new Set(existing.map(r => String(r.data_object_relationship_label)));

  const toInsert = userEdges
    .filter(e => !existingLabels.has(userEdgeLabel(e)))
    .map(e => ({
      data_object_id: e.from_id,
      related_data_object_id: USERS_ID,
      data_object_relationship_label: userEdgeLabel(e),
      relationship_type: "many_to_many",
      owner_side: "source",
      relationship_kind: "reference",
      // record_status omitted, defaults to "new" (Rule #1)
      // notes omitted, default "" (Rule #15)
    }));

  if (toInsert.length === 0) {
    console.log(`  all ${userEdges.length} user-edges already present, nothing to insert`);
    return;
  }
  console.log(`  inserting ${toInsert.length} user-edges (${existing.length} already present on these masters)`);
  for (const r of toInsert) {
    console.log(`    + ${r.data_object_relationship_label}`);
  }
  const result = await post("/data_object_relationships", toInsert);
  console.log(`  inserted ${result.length} rows`);
}

// ============================================================
// 3. APQC TAGGING: handoff_processes inserts
// ============================================================
// Audit pre-specifies (handoff_id, PCF process_id) for 8 of the 9 UEM outbound
// handoffs. Handoff 662 (UEM -> SAM, device_app_assignment.deployed) is
// deferred per audit. role enum has a single value `implements` (default);
// proposal_source `agent_curated` per audit's confidence column.
type HandoffProcessTag = {
  handoff_id: number;
  process_id: number;
  // Friendly comment, not loaded:
  comment: string;
};

const handoffProcesses: HandoffProcessTag[] = [
  { handoff_id: 655, process_id: 1299, comment: "UEM->ITSM enrolled_device.enrolled -> Triage IT service delivery incidents (L4)" },
  { handoff_id: 656, process_id: 273,  comment: "UEM->IGA enrolled_device.enrolled -> Manage IT user identity and authorization (L3)" },
  { handoff_id: 657, process_id: 355,  comment: "UEM->HAM enrolled_device.retired -> Decommission productive assets (L3)" },
  { handoff_id: 658, process_id: 1196, comment: "UEM->IGA enrolled_device.lost_or_stolen -> Manage IT user authorization (L4)" },
  { handoff_id: 659, process_id: 271,  comment: "UEM->IGA device_compliance_result.non_compliant -> Conduct and analyze IT compliance assessments (L3)" },
  { handoff_id: 660, process_id: 1299, comment: "UEM->ITSM device_compliance_result.non_compliant -> Triage IT service delivery incidents (L4)" },
  { handoff_id: 661, process_id: 1197, comment: "UEM->IGA device_compliance_result.compliant -> Manage IT user authentication mechanisms (L4)" },
  { handoff_id: 663, process_id: 1299, comment: "UEM->ITSM device_configuration_profile.drift_detected -> Triage IT service delivery incidents (L4)" },
];

async function loadHandoffProcesses() {
  console.log("\n=== APQC TAGGING: handoff_processes ===");

  // Verify handoffs exist (pre-flight per Rule #18 + the loader spec for
  // handoff_processes "verify before insert")
  const handoffIds = handoffProcesses.map(h => h.handoff_id);
  const handoffs = await get(
    `/handoffs?id=in.(${handoffIds.join(",")})&select=id`,
  );
  const handoffSet = new Set(handoffs.map(h => Number(h.id)));
  const missingHandoffs = handoffIds.filter(id => !handoffSet.has(id));
  if (missingHandoffs.length > 0) {
    throw new Error(`pre-flight FAIL: handoffs not found: ${missingHandoffs.join(",")}`);
  }

  // Verify PCF processes exist
  const processIds = [...new Set(handoffProcesses.map(h => h.process_id))];
  const procs = await get(`/processes?id=in.(${processIds.join(",")})&select=id`);
  const procSet = new Set(procs.map(p => Number(p.id)));
  const missingProcs = processIds.filter(id => !procSet.has(id));
  if (missingProcs.length > 0) {
    throw new Error(`pre-flight FAIL: processes not found: ${missingProcs.join(",")}`);
  }

  // Idempotency: skip rows that already exist with same (handoff_id, process_id, role)
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=id,handoff_id,process_id,role`,
  );
  const existingKey = new Set(
    existing.map(r => `${r.handoff_id}.${r.process_id}.${r.role}`),
  );

  const toInsert = handoffProcesses
    .filter(h => !existingKey.has(`${h.handoff_id}.${h.process_id}.implements`))
    .map(h => ({
      handoff_id: h.handoff_id,
      process_id: h.process_id,
      role: "implements",
      proposal_source: "agent_curated",
      // record_status omitted, defaults to "new" (Rule #1)
      // notes omitted, default "" (Rule #15)
    }));

  if (toInsert.length === 0) {
    console.log(`  all ${handoffProcesses.length} handoff_processes already present`);
    return;
  }
  console.log(`  inserting ${toInsert.length} handoff_processes rows (${existing.length} pre-existing on these handoffs)`);
  for (const h of handoffProcesses) {
    if (!existingKey.has(`${h.handoff_id}.${h.process_id}.implements`)) {
      console.log(`    + ${h.comment}`);
    }
  }
  const result = await post("/handoff_processes", toInsert);
  console.log(`  inserted ${result.length} rows`);
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log("UEM B1 technical fixes (2026-05-31)");
  console.log("===================================");

  await backfillEventCategories();
  await loadUserEdges();
  await loadHandoffProcesses();

  console.log("\nDone.");
  console.log("UI links:");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
