// LCAP B1 technical fixes, 2026-05-31.
//
// Scope (technical only, applied per directive):
//   B1-S2  PATCH naming renames: extend_* -> lcap_* on 5 data_objects
//          (cascades trigger_events.event_name extend_*.X -> lcap_*.X).
//          Done via in-process equivalent of scripts/loaders/rename_data_object.ts
//          for each row.
//   B1-S7  PATCH event_category enum backfill on 7 LCAP trigger_events
//          (731 state_change, 732 signal, 733 state_change, 734 signal,
//           735 state_change, 736 state_change, 737 signal).
//   B1-S6  INSERT 6 data_object_relationships user-edges from users (748)
//          to each LCAP master (Rule #10). Audit pre-specifies exact verbs.
//   B1-H1  INSERT 3 handoff_processes (handoff_id, process_id):
//          705 -> 278, 706 -> 285, 707 -> 115.
//          Handoff 704 -> 52 already exists (id 418), skipped.
//          Handoff 701 deferred per audit (NCDB owns canonical master gap).
//
// Deferred (gated on user judgment, new entities, or unverifiable):
//   B1-S1  Module creation (gated on B2-S1 split decision; new entities).
//   B1-S3  Covered by S2.
//   B1-S4  Pattern flag flips (gated on B2-S2; user judgment).
//   B1-S5  Intra-domain data_object_relationships (8 rows): only "user-edges
//          Rule #10" are licensed by the directive; intra-domain rels are not
//          on the apply list.
//   B1-S8  Aliases: no exact tuples pre-specified in audit, directive forbids
//          bulk inserts without exact tuples.
//   B1-S9  Lifecycle states (gated on B1-S1 modules).
//   B1-S10 F1/F2 skill restructure (gated on B1-S1 modules; new entities).
//   B1-S11 Business function spine (gated on B2-S3 user judgment).
//   B1-S12 B10b PATCH source_domain_module_id (gated on B1-S1; LCAP has zero
//          modules so source module is NOT derivable from existing modules).
//   B1-S13 Intra-domain handoffs (gated on B1-S1 modules).
//   B1-S14 Cross-domain rels (some rows would need target-domain audits;
//          not on the apply list).
//
// Run from project root c:/dev/domain-map (Rule #6):
//   bun run "c:/dev/domain-map/.tmp_deploy/fix_lcap_b1_technical_2026_05_31.ts"

type PostgrestResp<T> = { ok: boolean; status: number; body: T | string };

async function semantius<T = unknown>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<PostgrestResp<T>> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) {
    payload.body = body;
    payload.headers = { "Content-Type": "application/json", Prefer: "return=representation" };
  }

  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" },
  );
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`semantius ${method} ${path} failed (exit ${code}):\nstderr: ${stderr}\nstdout: ${stdout}`);
  }
  let parsed: T | string = stdout;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    // leave as string
  }
  return { ok: true, status: 200, body: parsed };
}

function singularize(plural: string): string {
  if (/ies$/.test(plural)) return plural.replace(/ies$/, "y");
  if (/(s|x|z|ch|sh)es$/.test(plural)) return plural.replace(/es$/, "");
  if (/s$/.test(plural)) return plural.replace(/s$/, "");
  return plural;
}

// =========================================================================
// B1-S2 + (event_name cascade): rename 5 data_objects, cascade trigger names
// =========================================================================

const RENAMES: Array<{ old: string; new: string; id: number }> = [
  { old: "extend_apps", new: "lcap_apps", id: 220 },
  { old: "extend_business_objects", new: "lcap_business_objects", id: 221 },
  { old: "extend_workflows", new: "lcap_workflows", id: 222 },
  { old: "extend_pages", new: "lcap_pages", id: 715 },
  { old: "extend_data_sources", new: "lcap_data_sources", id: 716 },
];

async function renameOne(r: { old: string; new: string; id: number }) {
  // verify current state
  const cur = (await semantius<Array<{ id: number; data_object_name: string }>>(
    "GET",
    `/data_objects?id=eq.${r.id}&select=id,data_object_name`,
  )).body as Array<{ id: number; data_object_name: string }>;
  if (!Array.isArray(cur) || cur.length !== 1) {
    throw new Error(`Pre-flight: data_object id=${r.id} not found`);
  }
  if (cur[0].data_object_name === r.new) {
    console.log(`  skip rename: id=${r.id} already named '${r.new}'`);
    return;
  }
  if (cur[0].data_object_name !== r.old) {
    throw new Error(`Pre-flight: data_object id=${r.id} is '${cur[0].data_object_name}', expected '${r.old}'`);
  }
  // verify new name is free
  const coll = (await semantius<Array<{ id: number }>>(
    "GET",
    `/data_objects?data_object_name=eq.${r.new}&select=id`,
  )).body as Array<{ id: number }>;
  if (coll.length > 0) {
    throw new Error(`Pre-flight: new name '${r.new}' already used by id=${coll[0].id}`);
  }
  // gather trigger events
  const events = (await semantius<Array<{ id: number; event_name: string }>>(
    "GET",
    `/trigger_events?data_object_id=eq.${r.id}&select=id,event_name`,
  )).body as Array<{ id: number; event_name: string }>;
  const oldSing = singularize(r.old);
  const newSing = singularize(r.new);
  const rewrites: Array<{ id: number; from: string; to: string }> = [];
  for (const ev of events) {
    const expected = `${oldSing}.`;
    if (!ev.event_name.startsWith(expected)) {
      console.log(`    note: trigger_events.id=${ev.id} event_name=${JSON.stringify(ev.event_name)} does not start with '${expected}', left untouched`);
      continue;
    }
    rewrites.push({ id: ev.id, from: ev.event_name, to: `${newSing}.${ev.event_name.slice(expected.length)}` });
  }
  // collision check on each rewrite
  for (const rw of rewrites) {
    const c = (await semantius<Array<{ id: number }>>(
      "GET",
      `/trigger_events?event_name=eq.${rw.to}&id=neq.${rw.id}&select=id`,
    )).body as Array<{ id: number }>;
    if (c.length > 0) {
      throw new Error(`Pre-flight: rewriting event ${rw.id} to '${rw.to}' would collide with id=${c[0].id}`);
    }
  }
  // execute rename
  await semantius("PATCH", `/data_objects?id=eq.${r.id}`, { data_object_name: r.new });
  console.log(`  PATCH data_objects.id=${r.id}: ${r.old} -> ${r.new}`);
  for (const rw of rewrites) {
    await semantius("PATCH", `/trigger_events?id=eq.${rw.id}`, { event_name: rw.to });
    console.log(`    PATCH trigger_events.id=${rw.id}: ${rw.from} -> ${rw.to}`);
  }
}

// =========================================================================
// B1-S7: PATCH event_category enum backfill on 7 LCAP trigger_events
// =========================================================================

const EVENT_CATEGORIES: Array<{ id: number; category: "state_change" | "signal" }> = [
  { id: 731, category: "state_change" }, // app.published
  { id: 732, category: "signal" },       // app.deployment_failed
  { id: 733, category: "state_change" }, // business_object.schema_changed
  { id: 734, category: "signal" },       // workflow.failed
  { id: 735, category: "state_change" }, // workflow.published
  { id: 736, category: "state_change" }, // page.published
  { id: 737, category: "signal" },       // data_source.connection_failed
];

async function patchEventCategories() {
  for (const e of EVENT_CATEGORIES) {
    const cur = (await semantius<Array<{ id: number; event_category: string }>>(
      "GET",
      `/trigger_events?id=eq.${e.id}&select=id,event_category`,
    )).body as Array<{ id: number; event_category: string }>;
    if (!Array.isArray(cur) || cur.length !== 1) {
      throw new Error(`Pre-flight: trigger_events id=${e.id} not found`);
    }
    if (cur[0].event_category === e.category) {
      console.log(`  skip: trigger_events.id=${e.id} already event_category=${e.category}`);
      continue;
    }
    if (cur[0].event_category !== "") {
      throw new Error(`Pre-flight: trigger_events id=${e.id} event_category=${JSON.stringify(cur[0].event_category)}, expected '' or '${e.category}'`);
    }
    await semantius("PATCH", `/trigger_events?id=eq.${e.id}`, { event_category: e.category });
    console.log(`  PATCH trigger_events.id=${e.id}: event_category='' -> '${e.category}'`);
  }
}

// =========================================================================
// B1-S6: INSERT 6 data_object_relationships user-edges (Rule #10)
// =========================================================================

// Pattern mirrors existing users (748) edges, e.g. id=244 (authored baselines)
// owner_side=source, relationship_type=one_to_many, relationship_kind=reference.
// Audit pre-specifies verb shape: authors_lcap_app, owns_lcap_app, authors_lcap_page,
// authors_lcap_business_object, authors_lcap_workflow, configures_lcap_data_source.

const USER_EDGES: Array<{
  related_data_object_id: number;
  related_plural: string; // for label composition only
  relationship_verb: string;
  inverse_verb: string;
}> = [
  { related_data_object_id: 220, related_plural: "lcap_apps",            relationship_verb: "authors_lcap_app",             inverse_verb: "is_authored_by" },
  { related_data_object_id: 220, related_plural: "lcap_apps",            relationship_verb: "owns_lcap_app",                inverse_verb: "is_owned_by" },
  { related_data_object_id: 715, related_plural: "lcap_pages",           relationship_verb: "authors_lcap_page",            inverse_verb: "is_authored_by" },
  { related_data_object_id: 221, related_plural: "lcap_business_objects",relationship_verb: "authors_lcap_business_object", inverse_verb: "is_authored_by" },
  { related_data_object_id: 222, related_plural: "lcap_workflows",       relationship_verb: "authors_lcap_workflow",        inverse_verb: "is_authored_by" },
  { related_data_object_id: 716, related_plural: "lcap_data_sources",    relationship_verb: "configures_lcap_data_source",  inverse_verb: "is_configured_by" },
];

async function insertUserEdges() {
  // skip rows that already exist (verb-keyed)
  for (const e of USER_EDGES) {
    const existing = (await semantius<Array<{ id: number }>>(
      "GET",
      `/data_object_relationships?data_object_id=eq.748&related_data_object_id=eq.${e.related_data_object_id}&relationship_verb=eq.${encodeURIComponent(e.relationship_verb)}&select=id`,
    )).body as Array<{ id: number }>;
    if (existing.length > 0) {
      console.log(`  skip: edge users -> ${e.related_plural} verb='${e.relationship_verb}' already exists (id=${existing[0].id})`);
      continue;
    }
    const row = {
      data_object_id: 748,
      related_data_object_id: e.related_data_object_id,
      data_object_relationship_label: `users ${e.relationship_verb} ${e.related_plural}`,
      owner_side: "source",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      relationship_verb: e.relationship_verb,
      inverse_verb: e.inverse_verb,
      is_required: false,
      // record_status omitted (Rule #1: defaults to 'new')
      // notes omitted (Rule #15)
    };
    const r = await semantius<Array<{ id: number }>>(
      "POST",
      "/data_object_relationships",
      row,
    );
    const inserted = r.body as Array<{ id: number }>;
    console.log(`  INSERT data_object_relationships: users ${e.relationship_verb} ${e.related_plural} (id=${inserted[0]?.id})`);
  }
}

// =========================================================================
// B1-H1: INSERT handoff_processes for handoffs 705, 706, 707
// =========================================================================

const HANDOFF_PROCESSES: Array<{ handoff_id: number; process_id: number; pcf_label: string }> = [
  { handoff_id: 705, process_id: 278, pcf_label: "Develop service/solution and integration strategy" },
  { handoff_id: 706, process_id: 285, pcf_label: "Manage change deployment control" },
  { handoff_id: 707, process_id: 115, pcf_label: "Manage product and service master data" },
];

async function insertHandoffProcesses() {
  // verify all PCFs are resolvable
  const ids = HANDOFF_PROCESSES.map((p) => p.process_id).join(",");
  const procs = (await semantius<Array<{ id: number; process_name: string }>>(
    "GET",
    `/processes?id=in.(${ids})&select=id,process_name`,
  )).body as Array<{ id: number; process_name: string }>;
  const procMap = new Map(procs.map((p) => [p.id, p.process_name]));
  for (const hp of HANDOFF_PROCESSES) {
    if (!procMap.has(hp.process_id)) {
      throw new Error(`Pre-flight: process_id=${hp.process_id} for handoff ${hp.handoff_id} not found`);
    }
  }
  for (const hp of HANDOFF_PROCESSES) {
    // idempotency check by (handoff_id, process_id)
    const existing = (await semantius<Array<{ id: number }>>(
      "GET",
      `/handoff_processes?handoff_id=eq.${hp.handoff_id}&process_id=eq.${hp.process_id}&select=id`,
    )).body as Array<{ id: number }>;
    if (existing.length > 0) {
      console.log(`  skip: handoff_processes ${hp.handoff_id}->${hp.process_id} already exists (id=${existing[0].id})`);
      continue;
    }
    const row = {
      handoff_id: hp.handoff_id,
      process_id: hp.process_id,
      role: "implements",
      proposal_source: "agent_curated",
      // record_status omitted (Rule #1: defaults to 'new')
      // notes omitted (Rule #15)
    };
    const r = await semantius<Array<{ id: number }>>(
      "POST",
      "/handoff_processes",
      row,
    );
    const inserted = r.body as Array<{ id: number }>;
    console.log(`  INSERT handoff_processes: handoff_id=${hp.handoff_id} process_id=${hp.process_id} (${procMap.get(hp.process_id)}) -> id=${inserted[0]?.id}`);
  }
}

// =========================================================================
// main
// =========================================================================

async function main() {
  console.log("=== LCAP b1 technical fixes, 2026-05-31 ===");

  console.log("\n[1/4] B1-S2: rename 5 data_objects (extend_* -> lcap_*) + cascade event_names");
  for (const r of RENAMES) {
    await renameOne(r);
  }

  console.log("\n[2/4] B1-S7: PATCH event_category on 7 LCAP trigger_events");
  await patchEventCategories();

  console.log("\n[3/4] B1-S6: INSERT 6 data_object_relationships user-edges (Rule #10)");
  await insertUserEdges();

  console.log("\n[4/4] B1-H1: INSERT 3 handoff_processes for handoffs 705/706/707");
  await insertHandoffProcesses();

  console.log("\nDone.");
}

await main();
