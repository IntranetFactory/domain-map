// APP-PAAS B1 residual technical fixes, 2026-05-31.
//
// Scope (per parent prompt's TECHNICAL allow-list):
//   1. B1-S5 Rule #10 user-edges: 5 INSERT rows into data_object_relationships
//      from platform built-in `users` (748) to each APP-PAAS master with a
//      pre-specified user actor. Verbs taken verbatim from B1-S5.
//   2. B1-H1 APQC handoff_processes tags: 7 INSERT rows (handoff_id, process_id)
//      from the audit's pre-specified mapping. Handoff 753 is skipped because
//      it already carries a handoff_processes row (id 295, process 1311);
//      re-tagging would create a duplicate-key conflict on the computed `key`
//      column (handoff_id.process_id) which has unique_value=true.
//
// Deferred (NOT applied here):
//   B1-S1, S2 (Rule #20), S3 (pattern flags), S4 (intra DOR not user-edges),
//   S6 (aliases not pre-specified tuples), S7 (lifecycle, blocked behind S1),
//   S8 (new skills, blocked behind S1), S9 (B10b, source modules don't exist),
//   S10 (cross-domain DOR, blocked behind S1/S4), S11 (intra-domain handoffs,
//   blocked behind S1), S12 (capabilities, blocked behind S1).
//
// Rule compliance:
//   - record_status omitted -> defaults to 'new' (Rule #1)
//   - notes never written (Rule #15)
//   - data_object_relationship_label is required but is a generated label;
//     omitting it has produced API rejections elsewhere -> we author it
//     from "<from_name> <verb> <to_name>" since it is is_nullable=false.
//   - All writes via semantius CLI from project root (Rule #6).

const PAAS_MASTERS: Record<string, number> = {
  paas_applications: 463,
  paas_deployments: 464,
  paas_environments: 465,
  paas_runtime_instances: 466,
  paas_addons: 467,
  paas_build_records: 468,
};
const USERS_ID = 748;

type UserEdge = {
  related: number;
  related_name: string;
  verb: string;
  inverse: string;
};

// From audit B1-S5 (verbatim verbs):
//   users owns paas_applications
//   users deploys paas_deployments
//   users triggers paas_build_records
//   users configures paas_addons
//   users manages paas_environments
const USER_EDGES: UserEdge[] = [
  { related: PAAS_MASTERS.paas_applications, related_name: "paas_applications", verb: "owns", inverse: "owned_by" },
  { related: PAAS_MASTERS.paas_deployments, related_name: "paas_deployments", verb: "deploys", inverse: "deployed_by" },
  { related: PAAS_MASTERS.paas_build_records, related_name: "paas_build_records", verb: "triggers", inverse: "triggered_by" },
  { related: PAAS_MASTERS.paas_addons, related_name: "paas_addons", verb: "configures", inverse: "configured_by" },
  { related: PAAS_MASTERS.paas_environments, related_name: "paas_environments", verb: "manages", inverse: "managed_by" },
];

type HandoffTag = { handoff_id: number; process_id: number };
// From audit B1-H1 (verbatim). Handoff 753 omitted (existing row).
const HANDOFF_TAGS: HandoffTag[] = [
  { handoff_id: 754, process_id: 1262 },
  { handoff_id: 755, process_id: 1304 },
  { handoff_id: 756, process_id: 1265 },
  { handoff_id: 757, process_id: 1299 },
  { handoff_id: 758, process_id: 1939 },
  { handoff_id: 798, process_id: 1313 },
  { handoff_id: 704, process_id: 52 },
];

async function semantiusRequest(method: string, path: string, body?: unknown): Promise<unknown> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest"],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" }
  );
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exit = await proc.exited;
  if (exit !== 0) {
    throw new Error(`semantius exit ${exit}\nstderr: ${stderr}\nstdout: ${stdout}`);
  }
  try {
    return JSON.parse(stdout);
  } catch {
    return stdout;
  }
}

// Pre-flight: verify no existing user-edges, no existing handoff_processes for the 7 handoffs.
async function preflight(): Promise<{ skipUserEdges: Set<number>; skipHandoffs: Set<number> }> {
  const masterIds = Object.values(PAAS_MASTERS).join(",");
  const existing = (await semantiusRequest(
    "GET",
    `/data_object_relationships?select=id,data_object_id,related_data_object_id&or=(and(data_object_id.eq.${USERS_ID},related_data_object_id.in.(${masterIds})),and(related_data_object_id.eq.${USERS_ID},data_object_id.in.(${masterIds})))`
  )) as Array<{ data_object_id: number; related_data_object_id: number }>;
  const skipUserEdges = new Set<number>();
  for (const row of existing) {
    const other = row.data_object_id === USERS_ID ? row.related_data_object_id : row.data_object_id;
    skipUserEdges.add(other);
  }
  const handoffIds = HANDOFF_TAGS.map((t) => t.handoff_id).join(",");
  const existingTags = (await semantiusRequest(
    "GET",
    `/handoff_processes?select=id,handoff_id,process_id&handoff_id=in.(${handoffIds})`
  )) as Array<{ handoff_id: number }>;
  const skipHandoffs = new Set<number>(existingTags.map((r) => r.handoff_id));
  return { skipUserEdges, skipHandoffs };
}

async function main() {
  console.log("[preflight] checking live state");
  const { skipUserEdges, skipHandoffs } = await preflight();
  console.log(`[preflight] existing user-edges -> skip masters: ${[...skipUserEdges].join(",") || "(none)"}`);
  console.log(`[preflight] existing handoff tags -> skip handoffs: ${[...skipHandoffs].join(",") || "(none)"}`);

  // --- B1-S5: user-edges --------------------------------------------------
  const userEdgeRows = USER_EDGES.filter((e) => !skipUserEdges.has(e.related)).map((e) => ({
    data_object_relationship_label: `users ${e.verb} ${e.related_name}`,
    data_object_id: USERS_ID,
    related_data_object_id: e.related,
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    relationship_verb: e.verb,
    inverse_verb: e.inverse,
    is_required: false,
    owner_side: "source",
  }));
  if (userEdgeRows.length > 0) {
    console.log(`[user-edges] inserting ${userEdgeRows.length} row(s)`);
    const res = await semantiusRequest("POST", "/data_object_relationships", userEdgeRows);
    console.log(`[user-edges] result:`, JSON.stringify(res));
  } else {
    console.log("[user-edges] nothing to insert");
  }

  // --- B1-H1: handoff_processes -------------------------------------------
  const tagRows = HANDOFF_TAGS.filter((t) => !skipHandoffs.has(t.handoff_id)).map((t) => ({
    data_object_relationship_label: undefined,
    handoff_id: t.handoff_id,
    process_id: t.process_id,
    role: "implements",
    proposal_source: "agent_curated",
    // label is required (input_type=required); compose from handoff+process for stability.
    label: `handoff_${t.handoff_id}_implements_process_${t.process_id}`,
  })).map(({ data_object_relationship_label, ...rest }) => rest);
  if (tagRows.length > 0) {
    console.log(`[handoff-tags] inserting ${tagRows.length} row(s)`);
    const res = await semantiusRequest("POST", "/handoff_processes", tagRows);
    console.log(`[handoff-tags] result:`, JSON.stringify(res));
  } else {
    console.log("[handoff-tags] nothing to insert");
  }

  console.log("[done]");
}

await main();
