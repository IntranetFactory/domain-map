#!/usr/bin/env bun
/**
 * DI B1 technical fixes (2026-05-31 continuation).
 *
 * Applies only the truly-technical Bucket-1 items from audits/DI.md:
 *   - S4: PATCH 14 trigger_events.event_category enum backfill (audit pre-specs all 14).
 *   - S6: INSERT users-edge data_object_relationships per Rule #10 (audit pre-specs actors per master).
 *   - S17: INSERT 9 handoff_processes (agent_curated) for the 9 cross-domain DI outbound handoffs;
 *          audit pre-specs handoff_id + PCF external_id pairs.
 *
 * Deferred (judgment / gated): S1, S2, S3, S5, S7, S8, S9, S10, S11, S12, S13, S14, S15, S16,
 *   B2-S1..S5, Bucket 3.
 *
 * Run from project root: bun run .tmp_deploy/fix_di_b1_technical_2026_05_31.ts
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

// --- S4: trigger_events.event_category backfill -----------------------------

const S4_PATCHES: Record<number, string> = {
  762: "state_change",
  763: "threshold",
  764: "state_change",
  765: "lifecycle",
  766: "lifecycle",
  767: "state_change",
  768: "state_change",
  769: "lifecycle",
  770: "state_change",
  771: "signal",
  772: "threshold",
  773: "state_change",
  774: "lifecycle",
  775: "threshold",
};

async function applyS4() {
  console.log("\n=== S4: trigger_events.event_category backfill ===");
  const ids = Object.keys(S4_PATCHES).map(Number);
  const before = await get(
    `/trigger_events?id=in.(${ids.join(",")})&select=id,event_name,event_category&order=id.asc`,
  );
  const stillEmpty = before.filter((r: any) => !r.event_category);
  console.log(`  ${stillEmpty.length} / ${before.length} need backfill`);
  let patched = 0;
  for (const r of stillEmpty) {
    const cat = S4_PATCHES[r.id];
    if (!cat) {
      console.log(`  SKIP id=${r.id} (no mapping)`);
      continue;
    }
    await patch(`/trigger_events?id=eq.${r.id}`, { event_category: cat });
    patched++;
  }
  console.log(`  PATCHed ${patched} rows`);
  const after = await get(
    `/trigger_events?id=in.(${ids.join(",")})&select=id,event_category&order=id.asc`,
  );
  const remainingEmpty = after.filter((r: any) => !r.event_category);
  if (remainingEmpty.length) {
    console.log(`  WARN: ${remainingEmpty.length} still empty`);
  } else {
    console.log("  OK: all 14 have non-empty event_category");
  }
}

// --- S6: users-edge data_object_relationships per Rule #10 ------------------

const USERS_ID = 748;

type UserEdge = {
  related: number; // DI master data_object_id
  label: string; // human-readable label (column is data_object_relationship_label)
  verb: string; // relationship_verb (users -> master)
  inverse: string; // inverse_verb (master -> users)
};

const S6_EDGES: UserEdge[] = [
  // pipeline_runs (434): operator, error_reviewer
  {
    related: 434,
    label: "users operates pipeline_runs",
    verb: "operates",
    inverse: "is_operated_by",
  },
  {
    related: 434,
    label: "users reviews_errors_on pipeline_runs",
    verb: "reviews_errors_on",
    inverse: "has_errors_reviewed_by",
  },
  // source_connectors (435): configurer, owner
  {
    related: 435,
    label: "users configures source_connectors",
    verb: "configures",
    inverse: "is_configured_by",
  },
  {
    related: 435,
    label: "users owns source_connectors",
    verb: "owns",
    inverse: "is_owned_by",
  },
  // sink_connectors (436): configurer, owner
  {
    related: 436,
    label: "users configures sink_connectors",
    verb: "configures",
    inverse: "is_configured_by",
  },
  {
    related: 436,
    label: "users owns sink_connectors",
    verb: "owns",
    inverse: "is_owned_by",
  },
  // transformation_jobs (437): author, approver
  {
    related: 437,
    label: "users authors transformation_jobs",
    verb: "authors",
    inverse: "is_authored_by",
  },
  {
    related: 437,
    label: "users approves transformation_jobs",
    verb: "approves",
    inverse: "is_approved_by",
  },
  // schema_registries (438): schema_steward, breaking_change_reviewer
  {
    related: 438,
    label: "users stewards schema_registries",
    verb: "stewards",
    inverse: "is_stewarded_by",
  },
  {
    related: 438,
    label: "users reviews_breaking_changes_on schema_registries",
    verb: "reviews_breaking_changes_on",
    inverse: "has_breaking_changes_reviewed_by",
  },
  // change_data_capture_streams (439): operator
  {
    related: 439,
    label: "users operates change_data_capture_streams",
    verb: "operates",
    inverse: "is_operated_by",
  },
  // integration_flows (440): author, operator
  {
    related: 440,
    label: "users authors integration_flows",
    verb: "authors",
    inverse: "is_authored_by",
  },
  {
    related: 440,
    label: "users operates integration_flows",
    verb: "operates",
    inverse: "is_operated_by",
  },
];

async function applyS6() {
  console.log("\n=== S6: users-edge data_object_relationships (Rule #10) ===");
  // pre-flight: confirm users id=748 is platform_builtin
  const usersRow = await get(`/data_objects?id=eq.${USERS_ID}&select=id,data_object_name,kind`);
  if (!usersRow.length || usersRow[0].kind !== "platform_builtin") {
    throw new Error(`users row id=${USERS_ID} not found or not platform_builtin`);
  }
  // existing edges users -> DI masters
  const existing = await get(
    `/data_object_relationships?data_object_id=eq.${USERS_ID}&related_data_object_id=in.(434,435,436,437,438,439,440)&select=id,related_data_object_id,relationship_verb,data_object_relationship_label`,
  );
  console.log(`  existing users -> DI-master edges: ${existing.length}`);
  const seen = new Set(
    existing.map((r: any) => `${r.related_data_object_id}:${r.relationship_verb}`),
  );
  const toInsert: Row[] = [];
  for (const e of S6_EDGES) {
    const key = `${e.related}:${e.verb}`;
    if (seen.has(key)) {
      console.log(`  SKIP existing: ${e.label}`);
      continue;
    }
    toInsert.push({
      data_object_id: USERS_ID,
      related_data_object_id: e.related,
      data_object_relationship_label: e.label,
      relationship_verb: e.verb,
      inverse_verb: e.inverse,
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      owner_side: "target", // master owns its lifecycle; users is the actor reference
      is_required: false, // a master row need not always have a named actor
    });
  }
  console.log(`  inserting ${toInsert.length} new edges`);
  if (toInsert.length) {
    await post("/data_object_relationships", toInsert);
  }
  const after = await get(
    `/data_object_relationships?data_object_id=eq.${USERS_ID}&related_data_object_id=in.(434,435,436,437,438,439,440)&select=related_data_object_id,relationship_verb&order=related_data_object_id.asc`,
  );
  console.log(`  post-load: ${after.length} users -> DI-master edges`);
}

// --- S17: handoff_processes APQC tagging (9 rows) ---------------------------

type HandoffProc = {
  handoff_id: number;
  process_ext_id: string;
};

const S17_ROWS: HandoffProc[] = [
  { handoff_id: 157, process_ext_id: "20779" },
  { handoff_id: 725, process_ext_id: "20779" },
  { handoff_id: 731, process_ext_id: "20775" },
  { handoff_id: 259, process_ext_id: "20779" },
  { handoff_id: 726, process_ext_id: "20779" },
  { handoff_id: 728, process_ext_id: "20779" },
  { handoff_id: 729, process_ext_id: "20735" },
  { handoff_id: 730, process_ext_id: "20735" },
  { handoff_id: 727, process_ext_id: "20903" },
];

async function applyS17() {
  console.log("\n=== S17: APQC handoff_processes (agent_curated) ===");
  // resolve process external_id -> id
  const extIds = Array.from(new Set(S17_ROWS.map((r) => r.process_ext_id)));
  const procs = await get(
    `/processes?external_id=in.(${extIds.join(",")})&select=id,external_id,process_name`,
  );
  const extToId = new Map(procs.map((p: any) => [String(p.external_id), p.id as number]));
  for (const ext of extIds) {
    if (!extToId.has(ext)) {
      throw new Error(`Process external_id=${ext} not found; cannot proceed (Rule: verify before insert)`);
    }
  }
  for (const p of procs) {
    console.log(`  PCF ${p.external_id} -> id=${p.id} (${p.process_name})`);
  }
  // existing handoff_processes for these handoffs
  const handoffIds = S17_ROWS.map((r) => r.handoff_id);
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=id,handoff_id,process_id`,
  );
  console.log(`  existing handoff_processes for these 9 handoffs: ${existing.length}`);
  const seen = new Set(existing.map((r: any) => `${r.handoff_id}:${r.process_id}`));
  const toInsert: Row[] = [];
  for (const r of S17_ROWS) {
    const procId = extToId.get(r.process_ext_id)!;
    const key = `${r.handoff_id}:${procId}`;
    if (seen.has(key)) {
      console.log(`  SKIP existing: handoff=${r.handoff_id} process_id=${procId}`);
      continue;
    }
    toInsert.push({
      handoff_id: r.handoff_id,
      process_id: procId,
      role: "implements",
      proposal_source: "agent_curated",
      // record_status omitted; defaults to "new" per Rule #1
      // notes omitted; defaults to "" per Rule #15
    });
  }
  console.log(`  inserting ${toInsert.length} new handoff_processes`);
  if (toInsert.length) {
    await post("/handoff_processes", toInsert);
  }
  const after = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=handoff_id,process_id,proposal_source&order=handoff_id.asc`,
  );
  console.log(`  post-load: ${after.length} handoff_processes for the 9 handoffs`);
}

// --- main -------------------------------------------------------------------

async function main() {
  // tenant sanity
  const me = await semCall("getCurrentUser", {});
  console.log(`tenant check: email=${me?.email} semantius_org=${me?.semantius_org}`);
  await applyS4();
  await applyS6();
  await applyS17();
  console.log("\nDone.");
}

await main();
