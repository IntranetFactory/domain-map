/**
 * COMP-MGMT B1 technical fixes (2026-05-31 continuation).
 *
 * Applies the truly-technical subset of the B1 backlog from
 * audits/COMP-MGMT.md. Judgment items defer.
 *
 * Scope (technical only):
 *   1. B1-S6: PATCH event_category='state_change' on 6 trigger_events
 *      with empty event_category (rows 423-428). Audit pre-specifies the
 *      verb anchors all read as state transitions on the publishing master.
 *   2. B1-S4: INSERT 11 users-edges per Rule #10 across the 7 COMP-MGMT
 *      masters. Audit pre-specifies the verb / actor for every edge.
 *   3. B1-S5: INSERT 6 intra-domain edges among COMP-MGMT masters per
 *      audit's pre-specified verb / cardinality / kind.
 *
 * Deferred (require judgment or pre-conditions not met):
 *   B1-S1, B1-S2, B1-S3 (new entities / gated on M7 resolution),
 *   B1-S7 (no resolvable target_domain_module_id; consumer DMDOs not
 *   declared on target side or ambiguous), B1-S8 (report-only),
 *   B1-S9 (PCF external_ids in audit do not resolve to the expected
 *   process names; e.g. external_id 10511 resolves to "Review compensation
 *   plan" L4, not the L3 "Develop and manage rewards" the audit asserts).
 *
 * Run from project root: bun run .tmp_deploy/fix_comp_mgmt_b1_technical_2026_05_31.ts
 */

interface CmdResult {
  ok: boolean;
  data: any;
  status: number;
  err?: string;
}

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" }
  );
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    const err = (stderr || stdout).trim();
    if (err.includes("JWT") && err.includes("audience")) {
      console.error("\n!!! JWT AUDIENCE ERROR !!!");
      console.error(err);
      console.error("STOP per SKILL.md Rule #6. Surface verbatim and halt.");
      process.exit(2);
    }
    return { ok: false, data: null, status: code, err };
  }
  const text = stdout.trim();
  return { ok: true, data: text ? JSON.parse(text) : null, status: 0 };
}

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.err}`);
  return r.data;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await postgrest("PATCH", path, body);
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.err}`);
  return r.data;
}

async function post(path: string, body: any): Promise<any> {
  const r = await postgrest("POST", path, body);
  if (!r.ok) throw new Error(`POST ${path} failed: ${r.err}`);
  return r.data;
}

// COMP-MGMT master data_object ids
const COMP_PLANS = 153;
const SALARY_BANDS = 154;
const MERIT_CYCLES = 155;
const MERIT_RECOMMENDATIONS = 156;
const COMP_STATEMENTS = 157;
const EQUITY_GRANTS = 158;
const COMP_BENCHMARKS = 159;
const USERS = 748;

// ---------------------------------------------------------------------------
// 1. B1-S6: PATCH event_category on 6 trigger_events.
// ---------------------------------------------------------------------------
async function fixTriggerEventCategories() {
  console.log("\n[B1-S6] PATCH event_category='state_change' on 6 trigger_events");
  const ids = [423, 424, 425, 426, 427, 428];

  // Verify they are still empty before patching.
  const live = await get(`/trigger_events?id=in.(${ids.join(",")})&select=id,event_name,event_category`);
  const empty = (live as any[]).filter((r) => !r.event_category);
  if (empty.length === 0) {
    console.log("  All 6 rows already have event_category populated; nothing to do.");
    return;
  }
  console.log(`  ${empty.length} of ${ids.length} rows have empty event_category; patching.`);
  for (const row of empty) {
    await patch(`/trigger_events?id=eq.${row.id}`, { event_category: "state_change" });
    console.log(`    PATCH trigger_events.${row.id} (${row.event_name}) -> state_change`);
  }
}

// ---------------------------------------------------------------------------
// 2. B1-S4: INSERT 11 users-edges per Rule #10.
// ---------------------------------------------------------------------------
//
// Pattern (from existing rows): data_object_id = users (748), related_data_object_id
// = the master, verb in parent voice, label "users <verb> <plural_label>".
const USER_EDGES: Array<{
  related: number;
  pluralLabel: string;
  verb: string;
  inverseVerb: string;
  type: "one_to_one" | "one_to_many" | "many_to_many";
  kind: "composition" | "reference" | "association" | "inheritance";
  required: boolean;
}> = [
  // compensation_plans: owner + approver
  { related: COMP_PLANS, pluralLabel: "compensation_plans", verb: "owns", inverseVerb: "owned by", type: "one_to_many", kind: "reference", required: true },
  { related: COMP_PLANS, pluralLabel: "compensation_plans", verb: "approves", inverseVerb: "approved by", type: "one_to_many", kind: "reference", required: false },
  // merit_cycles: owner + approver
  { related: MERIT_CYCLES, pluralLabel: "merit_cycles", verb: "owns", inverseVerb: "owned by", type: "one_to_many", kind: "reference", required: true },
  { related: MERIT_CYCLES, pluralLabel: "merit_cycles", verb: "approves", inverseVerb: "approved by", type: "one_to_many", kind: "reference", required: false },
  // merit_recommendations: submitter (manager) + approver
  { related: MERIT_RECOMMENDATIONS, pluralLabel: "merit_recommendations", verb: "submits", inverseVerb: "submitted by", type: "one_to_many", kind: "reference", required: true },
  { related: MERIT_RECOMMENDATIONS, pluralLabel: "merit_recommendations", verb: "approves", inverseVerb: "approved by", type: "one_to_many", kind: "reference", required: false },
  // compensation_statements: recipient (employee)
  { related: COMP_STATEMENTS, pluralLabel: "compensation_statements", verb: "receives", inverseVerb: "issued to", type: "one_to_many", kind: "reference", required: true },
  // equity_grants: grantee + approver
  { related: EQUITY_GRANTS, pluralLabel: "equity_grants", verb: "receives", inverseVerb: "granted to", type: "one_to_many", kind: "reference", required: true },
  { related: EQUITY_GRANTS, pluralLabel: "equity_grants", verb: "approves", inverseVerb: "approved by", type: "one_to_many", kind: "reference", required: false },
  // salary_bands: maintainer
  { related: SALARY_BANDS, pluralLabel: "salary_bands", verb: "maintains", inverseVerb: "maintained by", type: "one_to_many", kind: "reference", required: false },
  // compensation_benchmarks: maintainer
  { related: COMP_BENCHMARKS, pluralLabel: "compensation_benchmarks", verb: "maintains", inverseVerb: "maintained by", type: "one_to_many", kind: "reference", required: false },
];

async function insertUserEdges() {
  console.log("\n[B1-S4] INSERT users-edges per Rule #10 across the 7 COMP-MGMT masters");

  // Pre-flight: check what already exists user(748) -> COMP-MGMT masters.
  const compIds = [COMP_PLANS, SALARY_BANDS, MERIT_CYCLES, MERIT_RECOMMENDATIONS, COMP_STATEMENTS, EQUITY_GRANTS, COMP_BENCHMARKS];
  const existing = await get(
    `/data_object_relationships?and=(data_object_id.eq.${USERS},related_data_object_id.in.(${compIds.join(",")}))&select=id,related_data_object_id,relationship_verb`
  );
  const existingKeys = new Set<string>(
    (existing as any[]).map((r) => `${r.related_data_object_id}|${r.relationship_verb}`)
  );
  console.log(`  Pre-flight: ${(existing as any[]).length} existing users-edge(s) on COMP-MGMT masters.`);

  const rows: any[] = [];
  for (const e of USER_EDGES) {
    const key = `${e.related}|${e.verb}`;
    if (existingKeys.has(key)) {
      console.log(`  SKIP (exists): users ${e.verb} ${e.pluralLabel}`);
      continue;
    }
    rows.push({
      data_object_id: USERS,
      related_data_object_id: e.related,
      data_object_relationship_label: `users ${e.verb} ${e.pluralLabel}`,
      relationship_type: e.type,
      relationship_kind: e.kind,
      relationship_verb: e.verb,
      inverse_verb: e.inverseVerb,
      is_required: e.required,
      owner_side: "source",
      // record_status omitted per Rule #1 (default 'new')
      // notes omitted per Rule #15
    });
  }
  if (rows.length === 0) {
    console.log("  Nothing to insert.");
    return;
  }
  console.log(`  Inserting ${rows.length} row(s)...`);
  const inserted = await post(`/data_object_relationships`, rows);
  console.log(`  Done. ${(inserted as any[])?.length ?? rows.length} row(s) created.`);
}

// ---------------------------------------------------------------------------
// 3. B1-S5: INSERT 6 intra-domain edges among COMP-MGMT masters.
// ---------------------------------------------------------------------------
const INTRA_EDGES: Array<{
  src: number;
  srcPlural: string;
  dst: number;
  dstPlural: string;
  verb: string;
  inverseVerb: string;
  type: "one_to_one" | "one_to_many" | "many_to_many";
  kind: "composition" | "reference" | "association" | "inheritance";
  required: boolean;
}> = [
  { src: MERIT_CYCLES, srcPlural: "merit_cycles", dst: MERIT_RECOMMENDATIONS, dstPlural: "merit_recommendations", verb: "contains", inverseVerb: "belongs to", type: "one_to_many", kind: "composition", required: true },
  { src: COMP_PLANS, srcPlural: "compensation_plans", dst: MERIT_CYCLES, dstPlural: "merit_cycles", verb: "seeds", inverseVerb: "derives from", type: "one_to_many", kind: "reference", required: true },
  { src: COMP_STATEMENTS, srcPlural: "compensation_statements", dst: MERIT_RECOMMENDATIONS, dstPlural: "merit_recommendations", verb: "composes", inverseVerb: "rolled up into", type: "one_to_many", kind: "composition", required: false },
  { src: COMP_STATEMENTS, srcPlural: "compensation_statements", dst: EQUITY_GRANTS, dstPlural: "equity_grants", verb: "composes", inverseVerb: "rolled up into", type: "one_to_many", kind: "composition", required: false },
  { src: SALARY_BANDS, srcPlural: "salary_bands", dst: COMP_BENCHMARKS, dstPlural: "compensation_benchmarks", verb: "references", inverseVerb: "informs", type: "many_to_many", kind: "reference", required: false },
  { src: COMP_PLANS, srcPlural: "compensation_plans", dst: SALARY_BANDS, dstPlural: "salary_bands", verb: "includes", inverseVerb: "scoped by", type: "many_to_many", kind: "reference", required: false },
];

async function insertIntraEdges() {
  console.log("\n[B1-S5] INSERT 6 intra-domain edges among COMP-MGMT masters");

  // Pre-flight: load all current relationships between any two of the 7 masters.
  const compIds = [COMP_PLANS, SALARY_BANDS, MERIT_CYCLES, MERIT_RECOMMENDATIONS, COMP_STATEMENTS, EQUITY_GRANTS, COMP_BENCHMARKS];
  const existing = await get(
    `/data_object_relationships?and=(data_object_id.in.(${compIds.join(",")}),related_data_object_id.in.(${compIds.join(",")}))&select=id,data_object_id,related_data_object_id,relationship_verb`
  );
  const existingKeys = new Set<string>(
    (existing as any[]).map((r) => `${r.data_object_id}->${r.related_data_object_id}|${r.relationship_verb}`)
  );
  console.log(`  Pre-flight: ${(existing as any[]).length} existing intra-domain edge(s).`);

  const rows: any[] = [];
  for (const e of INTRA_EDGES) {
    const key = `${e.src}->${e.dst}|${e.verb}`;
    if (existingKeys.has(key)) {
      console.log(`  SKIP (exists): ${e.srcPlural} ${e.verb} ${e.dstPlural}`);
      continue;
    }
    rows.push({
      data_object_id: e.src,
      related_data_object_id: e.dst,
      data_object_relationship_label: `${e.srcPlural} ${e.verb} ${e.dstPlural}`,
      relationship_type: e.type,
      relationship_kind: e.kind,
      relationship_verb: e.verb,
      inverse_verb: e.inverseVerb,
      is_required: e.required,
      owner_side: "source",
      // record_status omitted per Rule #1
      // notes omitted per Rule #15
    });
  }
  if (rows.length === 0) {
    console.log("  Nothing to insert.");
    return;
  }
  console.log(`  Inserting ${rows.length} row(s)...`);
  const inserted = await post(`/data_object_relationships`, rows);
  console.log(`  Done. ${(inserted as any[])?.length ?? rows.length} row(s) created.`);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  console.log("COMP-MGMT B1 technical fixes (2026-05-31)");
  await fixTriggerEventCategories();
  await insertUserEdges();
  await insertIntraEdges();
  console.log("\nAll three technical bands applied.");
}

await main();
