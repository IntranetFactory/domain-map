#!/usr/bin/env bun
// DLP B1 technical fix-loop (2026-05-31).
//
// Applies the truly-technical (audit pre-specified, no judgment) subset of the
// 2026-05-30 DLP audit Bucket 1:
//
//   B1-S3: PATCH 3 trigger_events.event_category backfills
//          (927 -> state_change, 928 -> state_change, 929 -> signal)
//   B1-S5 (subset): INSERT 3 user-edge data_object_relationships per Rule #10
//          for the 3 audit-pre-specified verbs:
//             - users reviews dlp_incidents
//             - users authors dlp_policies
//             - users approves dlp_exceptions
//          (the other 3 masters have actor-role enumerations only, no
//          pre-specified verb; deferred.)
//
// Deferred items (require user judgment per the agent prompt):
//   B1-S1  (modules: M-band) - new entities/modules; gated on B2-S1 user pick
//   B1-S2  (C1 business_function_domains) - gated on B2-S4 ownership pick
//   B1-S4  (intra-domain rels among DLP masters) - not Rule #10 user-edges
//   B1-S5 (rest) - 3 masters lack pre-specified verbs
//   B1-S6  (lifecycle states) - gated on B1-S1 + B2-S3
//   B1-S7  (data_object_aliases) - draft figures, no exact tuples
//   B1-S8  (pattern flags) - gated on B2-S2 per-flag user decision
//   B1-S9..S14 - gated on B1-S1 (modules)
//   B1-S15 (B8 cross-domain rels) - not Rule #10 user-edges
//   B1-S16 (APQC tagging) - gated on B2-S5 user approval
//   Regulation candidates - audit specifies applicability='direct' which is not
//          a valid enum value (enum: mandatory/recommended/conditional/optional);
//          requires user pick to substitute.
//
// Idempotent. Run from project root with:
//   bun run .tmp_deploy/fix_dlp_b1_technical_2026_05_31.ts

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

async function post(path: string, body: Row[]): Promise<Row[]> {
  return call({ method: "POST", path, body });
}

// ============================================================
// B1-S3: PATCH 3 trigger_events with empty event_category
// Per audit: 927 -> state_change, 928 -> state_change, 929 -> signal.
// ============================================================
const B1_S3_PATCHES: Array<{ id: number; event_category: string }> = [
  { id: 927, event_category: "state_change" },
  { id: 928, event_category: "state_change" },
  { id: 929, event_category: "signal" },
];

async function fixB1S3(): Promise<void> {
  console.log("B1-S3: PATCH 3 trigger_events.event_category backfills");
  const ids = B1_S3_PATCHES.map(p => p.id);
  const before = await get(
    `/trigger_events?id=in.(${ids.join(",")})&select=id,event_name,event_category&order=id.asc`,
  );
  const empty = before.filter(r => r.event_category === "");
  console.log(`  ${empty.length}/${before.length} rows currently empty; patching all 3`);
  for (const p of B1_S3_PATCHES) {
    await patch(`/trigger_events?id=eq.${p.id}`, { event_category: p.event_category });
  }
  const after = await get(
    `/trigger_events?id=in.(${ids.join(",")})&select=id,event_name,event_category&order=id.asc`,
  );
  for (const r of after) {
    console.log(`  id=${r.id} ${r.event_name} -> ${r.event_category}`);
  }
  const stillEmpty = after.filter(r => r.event_category === "").length;
  if (stillEmpty !== 0) throw new Error(`B1-S3 PATCH incomplete: ${stillEmpty} still empty`);
}

// ============================================================
// B1-S5 (subset): INSERT 3 user-edge data_object_relationships per Rule #10
//
// users (id 748, platform_builtin) ->
//   - reviews    dlp_incidents  (330)
//   - authors    dlp_policies   (331)
//   - approves   dlp_exceptions (334)
//
// Shape mirrors the project's user-edge convention (sampled from rows
// 1097, 1131, 1278, 1540 etc.): single verb, owner_side=source,
// relationship_type=one_to_many, relationship_kind=reference,
// is_required=false (the user actor is optional in the data model;
// "every record has SOME user touching it" is enforced at workflow time,
// not catalog cardinality).
// ============================================================
const USERS_DO_ID = 748;
const DLP_INCIDENTS_DO_ID = 330;
const DLP_POLICIES_DO_ID = 331;
const DLP_EXCEPTIONS_DO_ID = 334;

interface UserEdge {
  related_data_object_id: number;
  relationship_verb: string;
  inverse_verb: string;
  data_object_relationship_label: string;
}

const B1_S5_EDGES: UserEdge[] = [
  {
    related_data_object_id: DLP_INCIDENTS_DO_ID,
    relationship_verb: "reviews",
    inverse_verb: "is_reviewed_by",
    data_object_relationship_label: "users reviews dlp_incidents",
  },
  {
    related_data_object_id: DLP_POLICIES_DO_ID,
    relationship_verb: "authors",
    inverse_verb: "is_authored_by",
    data_object_relationship_label: "users authors dlp_policies",
  },
  {
    related_data_object_id: DLP_EXCEPTIONS_DO_ID,
    relationship_verb: "approves",
    inverse_verb: "is_approved_by",
    data_object_relationship_label: "users approves dlp_exceptions",
  },
];

async function fixB1S5(): Promise<void> {
  console.log("B1-S5: INSERT 3 user-edge data_object_relationships (Rule #10)");
  const targetIds = B1_S5_EDGES.map(e => e.related_data_object_id);
  const existing = await get(
    `/data_object_relationships?data_object_id=eq.${USERS_DO_ID}` +
      `&related_data_object_id=in.(${targetIds.join(",")})` +
      `&select=id,related_data_object_id,relationship_verb`,
  );
  const existingKeys = new Set(
    existing.map(r => `${r.related_data_object_id}|${r.relationship_verb}`),
  );
  const missing = B1_S5_EDGES.filter(
    e => !existingKeys.has(`${e.related_data_object_id}|${e.relationship_verb}`),
  );
  console.log(`  ${missing.length}/${B1_S5_EDGES.length} edges need INSERT (others already exist)`);

  if (missing.length > 0) {
    const payload = missing.map(e => ({
      data_object_id: USERS_DO_ID,
      related_data_object_id: e.related_data_object_id,
      relationship_verb: e.relationship_verb,
      inverse_verb: e.inverse_verb,
      data_object_relationship_label: e.data_object_relationship_label,
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      owner_side: "source",
      is_required: false,
    }));
    await post("/data_object_relationships", payload);
  }

  const after = await get(
    `/data_object_relationships?data_object_id=eq.${USERS_DO_ID}` +
      `&related_data_object_id=in.(${targetIds.join(",")})` +
      `&select=id,related_data_object_id,relationship_verb,inverse_verb,owner_side&order=id.asc`,
  );
  for (const r of after) {
    console.log(
      `  id=${r.id} users -> do=${r.related_data_object_id} verb=${r.relationship_verb} inv=${r.inverse_verb} owner=${r.owner_side}`,
    );
  }
  if (after.length < 3) {
    throw new Error(`B1-S5: expected >=3 edges after, saw ${after.length}`);
  }
}

// ============================================================
// MAIN
// ============================================================
async function main(): Promise<void> {
  console.log("=== DLP B1 technical fix-loop (2026-05-31) ===\n");
  await fixB1S3();
  console.log("");
  await fixB1S5();
  console.log("\n=== Done ===");
  console.log("UI spot-check links:");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
}

await main();
