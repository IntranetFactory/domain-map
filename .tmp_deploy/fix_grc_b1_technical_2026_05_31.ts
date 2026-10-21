/**
 * GRC B1 technical fixes, 2026-05-31.
 *
 * Applies the truly-technical subset of the GRC B1 audit findings:
 *
 *   B1-S6: trigger_events.event_category enum backfill on 6 GRC rows
 *          (ids 921-926) per Rule #13 enum vocabulary.
 *
 *   B1-S4: data_object_relationships user-edges (Rule #10) for the 10 GRC
 *          masters. Audit pre-specified the verb shapes per master, so insert
 *          two rows per master (users -> master, master -> users) following
 *          the established catalog convention.
 *
 * Idempotent: skips rows that already exist by natural key. Verifies live
 * state first; throws on any missing data_object id.
 *
 * Run from c:/dev/domain-map (project root, so semantius reads correct .env):
 *   bun run "c:/dev/domain-map/.tmp_deploy/fix_grc_b1_technical_2026_05_31.ts"
 */

type Json = Record<string, unknown>;

async function semantius(method: string, path: string, body?: unknown): Promise<unknown> {
  const payload: Json = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest"],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" },
  );
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`semantius ${method} ${path} exit=${code}\nstderr:\n${err}\nstdout:\n${out}`);
  }
  if (out.trim() === "") return null;
  try {
    return JSON.parse(out);
  } catch {
    return out;
  }
}

const USERS_ID = 748;

const GRC_MASTERS: { id: number; name: string }[] = [
  { id: 282, name: "compliance_risks" },
  { id: 283, name: "compliance_controls" },
  { id: 284, name: "control_assessments" },
  { id: 285, name: "compliance_policies" },
  { id: 286, name: "policy_attestations" },
  { id: 287, name: "compliance_obligations" },
  { id: 288, name: "compliance_evidence" },
  { id: 289, name: "audit_issues" },
  { id: 290, name: "remediation_plans" },
  { id: 291, name: "risk_assessments" },
];

/**
 * Verb shapes from B1-S4. Each master gets two relationship rows:
 *   1. users (source) -> master (related)  : user-side action ("owns risk")
 *   2. master (source) -> users (related)  : master-side reference ("has owner")
 *
 * Naming convention mirrors existing user-edges seen in the catalog:
 *   - source-side verb is the action the user takes
 *   - inverse_verb is the navigation phrasing back
 * For the master-side row, the verb describes the FK semantics
 * ("has owner") and the inverse points back to the user role.
 */
type EdgeSpec = {
  master_id: number;
  master_name: string;
  // Row A: users -> master (user-as-source)
  user_to_master_verb: string;       // e.g. "owns risks"
  user_to_master_inverse: string;    // e.g. "is_owned_by"
  // Row B: master -> users (master-as-source)
  master_to_user_verb: string;       // e.g. "has owner"
  master_to_user_inverse: string;    // e.g. "owns"
};

const EDGES: EdgeSpec[] = [
  {
    master_id: 282,
    master_name: "compliance_risks",
    user_to_master_verb: "owns risks",
    user_to_master_inverse: "is_owned_by",
    master_to_user_verb: "has owner",
    master_to_user_inverse: "owns",
  },
  {
    master_id: 283,
    master_name: "compliance_controls",
    user_to_master_verb: "owns controls",
    user_to_master_inverse: "is_owned_by",
    master_to_user_verb: "has owner",
    master_to_user_inverse: "owns",
  },
  {
    master_id: 284,
    master_name: "control_assessments",
    user_to_master_verb: "conducts control assessments",
    user_to_master_inverse: "is_conducted_by",
    master_to_user_verb: "has assessor",
    master_to_user_inverse: "conducts",
  },
  {
    master_id: 285,
    master_name: "compliance_policies",
    user_to_master_verb: "authors policies",
    user_to_master_inverse: "is_authored_by",
    master_to_user_verb: "has author",
    master_to_user_inverse: "authors",
  },
  {
    master_id: 286,
    master_name: "policy_attestations",
    user_to_master_verb: "attests to policies",
    user_to_master_inverse: "is_attested_by",
    master_to_user_verb: "has attester",
    master_to_user_inverse: "attests",
  },
  {
    master_id: 287,
    master_name: "compliance_obligations",
    user_to_master_verb: "owns obligations",
    user_to_master_inverse: "is_owned_by",
    master_to_user_verb: "has accountable owner",
    master_to_user_inverse: "is accountable for",
  },
  {
    master_id: 288,
    master_name: "compliance_evidence",
    user_to_master_verb: "submits evidence",
    user_to_master_inverse: "is_submitted_by",
    master_to_user_verb: "has submitter",
    master_to_user_inverse: "submits",
  },
  {
    master_id: 289,
    master_name: "audit_issues",
    user_to_master_verb: "owns audit issues",
    user_to_master_inverse: "is_owned_by",
    master_to_user_verb: "has owner",
    master_to_user_inverse: "owns",
  },
  {
    master_id: 290,
    master_name: "remediation_plans",
    user_to_master_verb: "owns remediation plans",
    user_to_master_inverse: "is_owned_by",
    master_to_user_verb: "has owner",
    master_to_user_inverse: "owns",
  },
  {
    master_id: 291,
    master_name: "risk_assessments",
    user_to_master_verb: "conducts risk assessments",
    user_to_master_inverse: "is_conducted_by",
    master_to_user_verb: "has assessor",
    master_to_user_inverse: "conducts",
  },
];

/**
 * B1-S6 enum backfill plan. Audit pre-specifies state+verb per row.
 */
const ENUM_FIXES: { id: number; event_name: string; event_category: string }[] = [
  { id: 921, event_name: "compliance_control.passed",     event_category: "state_change" },
  { id: 922, event_name: "policy_attestation.required",   event_category: "threshold" },
  { id: 923, event_name: "policy_attestation.completed",  event_category: "state_change" },
  { id: 924, event_name: "compliance_evidence.submitted", event_category: "lifecycle" },
  { id: 925, event_name: "remediation_plan.created",      event_category: "lifecycle" },
  { id: 926, event_name: "remediation_plan.overdue",      event_category: "threshold" },
];

async function main() {
  console.log("# GRC B1 technical fixes, 2026-05-31");
  console.log();

  // ---------- 1. B1-S6: PATCH trigger_events.event_category ----------
  console.log("## B1-S6: trigger_events.event_category enum backfill");
  const existingEvents = (await semantius(
    "GET",
    "/trigger_events?id=in.(921,922,923,924,925,926)&select=id,event_name,event_category",
  )) as { id: number; event_name: string; event_category: string }[];

  let enumPatched = 0;
  for (const fix of ENUM_FIXES) {
    const live = existingEvents.find(r => r.id === fix.id);
    if (!live) {
      throw new Error(`trigger_events.id=${fix.id} not found live`);
    }
    if (live.event_name !== fix.event_name) {
      throw new Error(
        `trigger_events.id=${fix.id} event_name mismatch: live="${live.event_name}" expected="${fix.event_name}"`,
      );
    }
    if (live.event_category === fix.event_category) {
      console.log(`  - id=${fix.id} ${fix.event_name} already="${fix.event_category}", skip`);
      continue;
    }
    if (live.event_category !== "") {
      throw new Error(
        `trigger_events.id=${fix.id} has non-empty live event_category="${live.event_category}", refusing to overwrite (audit said empty)`,
      );
    }
    await semantius(
      "PATCH",
      `/trigger_events?id=eq.${fix.id}`,
      { event_category: fix.event_category },
    );
    enumPatched++;
    console.log(`  + id=${fix.id} ${fix.event_name} -> event_category="${fix.event_category}"`);
  }
  console.log(`  done: ${enumPatched} PATCH(es)`);
  console.log();

  // ---------- 2. B1-S4: INSERT data_object_relationships user-edges ----------
  console.log("## B1-S4: data_object_relationships users edges");

  // Re-verify zero existing edges between users and any of the 10 GRC masters.
  const masterIds = GRC_MASTERS.map(m => m.id).join(",");
  const existingEdges = (await semantius(
    "GET",
    `/data_object_relationships?` +
      `or=(and(data_object_id.eq.${USERS_ID},related_data_object_id.in.(${masterIds})),` +
      `and(related_data_object_id.eq.${USERS_ID},data_object_id.in.(${masterIds})))` +
      `&select=id,data_object_id,related_data_object_id,relationship_verb,inverse_verb`,
  )) as { id: number; data_object_id: number; related_data_object_id: number; relationship_verb: string; inverse_verb: string }[];

  const existingKeys = new Set<string>();
  for (const r of existingEdges) {
    existingKeys.add(`${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`);
  }

  const rowsToInsert: Json[] = [];
  for (const e of EDGES) {
    // Row A: users -> master
    const keyA = `${USERS_ID}|${e.master_id}|${e.user_to_master_verb}`;
    if (!existingKeys.has(keyA)) {
      rowsToInsert.push({
        data_object_relationship_label: `users ${e.user_to_master_verb}`,
        data_object_id: USERS_ID,
        related_data_object_id: e.master_id,
        relationship_verb: e.user_to_master_verb,
        inverse_verb: e.user_to_master_inverse,
        owner_side: "source",
        relationship_type: "one_to_many",
        relationship_kind: "reference",
        is_required: false,
      });
    } else {
      console.log(`  - skip (exists): users -> ${e.master_name} "${e.user_to_master_verb}"`);
    }

    // Row B: master -> users
    const keyB = `${e.master_id}|${USERS_ID}|${e.master_to_user_verb}`;
    if (!existingKeys.has(keyB)) {
      rowsToInsert.push({
        data_object_relationship_label: `${e.master_name} ${e.master_to_user_verb}`,
        data_object_id: e.master_id,
        related_data_object_id: USERS_ID,
        relationship_verb: e.master_to_user_verb,
        inverse_verb: e.master_to_user_inverse,
        owner_side: "source",
        relationship_type: "many_to_many",
        relationship_kind: "reference",
        is_required: true,
      });
    } else {
      console.log(`  - skip (exists): ${e.master_name} -> users "${e.master_to_user_verb}"`);
    }
  }

  if (rowsToInsert.length === 0) {
    console.log("  no new edges to insert");
  } else {
    console.log(`  inserting ${rowsToInsert.length} row(s)...`);
    // Chunk just in case, though 20 rows is well under any limit.
    const CHUNK = 50;
    for (let i = 0; i < rowsToInsert.length; i += CHUNK) {
      const slice = rowsToInsert.slice(i, i + CHUNK);
      const inserted = (await semantius("POST", "/data_object_relationships", slice)) as Json[];
      for (const row of inserted) {
        console.log(
          `  + id=${row.id} data_object_id=${row.data_object_id} -> related=${row.related_data_object_id} verb="${row.relationship_verb}"`,
        );
      }
    }
  }

  console.log();
  console.log("## summary");
  console.log(`  enum PATCH count: ${enumPatched}`);
  console.log(`  user-edge INSERT count: ${rowsToInsert.length}`);
  console.log();
  console.log("UI links:");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
}

await main();
