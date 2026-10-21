#!/usr/bin/env bun
// NCDB B1 residual technical fixes (2026-05-31).
//
// Scope (residual B1 fixes the audit pre-specifies, with all values either
// directly named in the audit or derivable from existing live rows):
//
//   B1-S12  PATCH trigger_events.event_category for the 6 NCDB events where
//           the audit names the category firmly. Defers event 727
//           (nocode_form.submitted) because the audit explicitly hedges
//           between 'signal' and 'state_change'.
//
//   B1-S4   INSERT data_object_relationships for the user-edges Rule #10
//           requires. Six edges audit pre-specifies; uses verb conventions
//           drawn from existing users-edge rows (relationship_kind='reference',
//           relationship_type='one_to_many', owner_side='source',
//           inverse_verb 'is_created_by' / 'is_owned_by').
//
//   B1-S3   INSERT data_object_relationships intra-domain. Four of the five
//           audit-proposed edges are firm; the fifth (views -> forms) carries
//           "optional, some platforms" hedging and is deferred. Loaded edges
//           cover the bases<-record_definitions composition plus the three
//           record_definitions<-{views,forms,automations} references.
//
//   B1-H1   INSERT handoff_processes ONLY for handoff 703 (NCDB -> ITSM,
//           nocode_automation.failed) where the audit names process_id=285
//           (Manage change deployment control, PCF 8.6.3) with confident
//           reuse from the LCAP audit. Defers 700 (PCF unresolved),
//           701 (LCAP target NULL), 702 (DLP defer).
//
// Idempotency: each block pre-reads live state and only inserts/patches when
// the change is missing. No 'notes' writes anywhere (Rule #15). All
// record_status fields omitted to let DB default 'new' apply (Rule #1).

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

// Canonical IDs (verified via pre-flight reads).
const DO = {
  nocode_bases: 241,
  nocode_record_definitions: 242,
  nocode_forms: 712,
  nocode_views: 713,
  nocode_automations: 714,
  users: 748,
} as const;

// ============================================================
// B1-S12: PATCH trigger_events.event_category (6 firm assignments)
// ============================================================
console.log("B1-S12: PATCH trigger_events.event_category (NCDB)");
{
  type Plan = { id: number; event_name: string; category: string };
  const PLAN: Plan[] = [
    { id: 724, event_name: "nocode_base.created",            category: "lifecycle" },
    { id: 725, event_name: "nocode_base.exported",           category: "signal" },
    { id: 726, event_name: "nocode_record_definition.changed", category: "state_change" },
    // 727 nocode_form.submitted: DEFERRED (audit hedges signal vs state_change).
    { id: 728, event_name: "nocode_view.shared_externally",  category: "state_change" },
    { id: 729, event_name: "nocode_automation.failed",       category: "signal" },
    { id: 730, event_name: "nocode_automation.triggered",    category: "signal" },
  ];

  const ids = PLAN.map(p => p.id);
  const live = await call({
    method: "GET",
    path: `/trigger_events?id=in.(${ids.join(",")})&select=id,event_name,event_category`,
  });
  const byId = new Map<number, Row>(live.map(r => [Number(r.id), r]));

  let patched = 0;
  for (const p of PLAN) {
    const row = byId.get(p.id);
    if (!row) {
      console.log(`  ${p.event_name} (id=${p.id}): NOT FOUND, skip`);
      continue;
    }
    if (row.event_name !== p.event_name) {
      console.log(`  id=${p.id}: event_name mismatch live='${row.event_name}' expected='${p.event_name}', skip`);
      continue;
    }
    const cur = String(row.event_category ?? "");
    if (cur === p.category) {
      console.log(`  ${p.event_name}: already '${p.category}', skip`);
      continue;
    }
    if (cur !== "" && cur !== p.category) {
      console.log(`  ${p.event_name}: live='${cur}' expected empty, would clobber, skip`);
      continue;
    }
    await call({
      method: "PATCH",
      path: `/trigger_events?id=eq.${p.id}`,
      body: { event_category: p.category },
    });
    console.log(`  ${p.event_name}: patched '' -> '${p.category}'`);
    patched++;
  }
  console.log(`  patched ${patched} / ${PLAN.length}`);
}

// ============================================================
// B1-S4: INSERT data_object_relationships users-edges (Rule #10)
// ============================================================
console.log("B1-S4: INSERT data_object_relationships (users edges)");
{
  type Edge = {
    related_id: number;
    related_name: string;
    verb: string;
    inverse_verb: string;
  };
  // All edges have data_object_id=users (748), source side, one_to_many,
  // relationship_kind='reference'. Verb conventions copied from existing
  // users-edge rows (e.g. "authored baselines", "owned channels").
  const EDGES: Edge[] = [
    { related_id: DO.nocode_bases,              related_name: "nocode_bases",              verb: "owned bases",            inverse_verb: "is_owned_by" },
    { related_id: DO.nocode_record_definitions, related_name: "nocode_record_definitions", verb: "authored record definitions", inverse_verb: "is_created_by" },
    { related_id: DO.nocode_views,              related_name: "nocode_views",              verb: "authored views",         inverse_verb: "is_created_by" },
    { related_id: DO.nocode_forms,              related_name: "nocode_forms",              verb: "authored forms",         inverse_verb: "is_created_by" },
    { related_id: DO.nocode_automations,        related_name: "nocode_automations",        verb: "authored automations",   inverse_verb: "is_created_by" },
    { related_id: DO.nocode_forms,              related_name: "nocode_forms",              verb: "submitted forms",        inverse_verb: "is_created_by" },
  ];

  const existing = await call({
    method: "GET",
    path: `/data_object_relationships?data_object_id=eq.${DO.users}&related_data_object_id=in.(${EDGES.map(e => e.related_id).join(",")})&select=id,related_data_object_id,relationship_verb`,
  });
  const haveByKey = new Set(existing.map(r => `${r.related_data_object_id}|${r.relationship_verb}`));

  const toInsert: Row[] = [];
  for (const e of EDGES) {
    const key = `${e.related_id}|${e.verb}`;
    if (haveByKey.has(key)) {
      console.log(`  users '${e.verb}' ${e.related_name}: exists, skip`);
      continue;
    }
    toInsert.push({
      data_object_id: DO.users,
      related_data_object_id: e.related_id,
      owner_side: "source",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      relationship_verb: e.verb,
      inverse_verb: e.inverse_verb,
      is_required: false,
    });
    console.log(`  users '${e.verb}' ${e.related_name}: queued`);
  }
  if (toInsert.length > 0) {
    await call({ method: "POST", path: "/data_object_relationships", body: toInsert });
    console.log(`  inserted ${toInsert.length} row(s)`);
  } else {
    console.log("  nothing to insert");
  }
}

// ============================================================
// B1-S3: INSERT data_object_relationships intra-domain (firm edges only)
// ============================================================
console.log("B1-S3: INSERT data_object_relationships (intra-domain)");
{
  type Edge = {
    from_id: number;
    from_name: string;
    to_id: number;
    to_name: string;
    verb: string;
    inverse_verb: string;
    cardinality: "one_to_one" | "one_to_many" | "many_to_many";
    kind: "composition" | "reference" | "association" | "inheritance";
    owner_side: "source" | "target";
    is_required: boolean;
  };
  // Per audit B1-S3 (firm subset). The fifth edge in the audit
  // (views source_of forms, "optional, some platforms") is deferred.
  const EDGES: Edge[] = [
    // bases contains record_definitions (composition, 1:N, base owns)
    {
      from_id: DO.nocode_bases, from_name: "nocode_bases",
      to_id:   DO.nocode_record_definitions, to_name: "nocode_record_definitions",
      verb: "contains record definitions", inverse_verb: "is_owned_by",
      cardinality: "one_to_many", kind: "composition",
      owner_side: "source", is_required: true,
    },
    // record_definitions referenced_by views (1:N, view depends on rd)
    {
      from_id: DO.nocode_record_definitions, from_name: "nocode_record_definitions",
      to_id:   DO.nocode_views,              to_name:   "nocode_views",
      verb: "presented by views", inverse_verb: "is_assigned_to",
      cardinality: "one_to_many", kind: "reference",
      owner_side: "source", is_required: false,
    },
    // record_definitions referenced_by forms (1:N, form writes to rd)
    {
      from_id: DO.nocode_record_definitions, from_name: "nocode_record_definitions",
      to_id:   DO.nocode_forms,              to_name:   "nocode_forms",
      verb: "written to by forms", inverse_verb: "is_assigned_to",
      cardinality: "one_to_many", kind: "reference",
      owner_side: "source", is_required: false,
    },
    // record_definitions referenced_by automations (M:N, automations trigger on rd and may write)
    {
      from_id: DO.nocode_record_definitions, from_name: "nocode_record_definitions",
      to_id:   DO.nocode_automations,        to_name:   "nocode_automations",
      verb: "triggers automations", inverse_verb: "is_assigned_to",
      cardinality: "many_to_many", kind: "association",
      owner_side: "source", is_required: false,
    },
  ];

  const ncdbIds = [
    DO.nocode_bases,
    DO.nocode_record_definitions,
    DO.nocode_forms,
    DO.nocode_views,
    DO.nocode_automations,
  ];
  const existing = await call({
    method: "GET",
    path: `/data_object_relationships?data_object_id=in.(${ncdbIds.join(",")})&related_data_object_id=in.(${ncdbIds.join(",")})&select=id,data_object_id,related_data_object_id,relationship_verb`,
  });
  const haveByKey = new Set(existing.map(r => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`));

  const toInsert: Row[] = [];
  for (const e of EDGES) {
    const key = `${e.from_id}|${e.to_id}|${e.verb}`;
    if (haveByKey.has(key)) {
      console.log(`  ${e.from_name} '${e.verb}' ${e.to_name}: exists, skip`);
      continue;
    }
    toInsert.push({
      data_object_id: e.from_id,
      related_data_object_id: e.to_id,
      owner_side: e.owner_side,
      relationship_type: e.cardinality,
      relationship_kind: e.kind,
      relationship_verb: e.verb,
      inverse_verb: e.inverse_verb,
      is_required: e.is_required,
    });
    console.log(`  ${e.from_name} '${e.verb}' ${e.to_name}: queued`);
  }
  if (toInsert.length > 0) {
    await call({ method: "POST", path: "/data_object_relationships", body: toInsert });
    console.log(`  inserted ${toInsert.length} row(s)`);
  } else {
    console.log("  nothing to insert");
  }
}

// ============================================================
// B1-H1: INSERT handoff_processes for handoff 703 only (confirmed PCF)
// ============================================================
console.log("B1-H1: INSERT handoff_processes (handoff 703 -> PCF 285)");
{
  const HANDOFF_ID = 703;
  const PROCESS_ID = 285; // PCF 8.6.3 Manage change deployment control

  // Pre-flight: PCF exists.
  const pcf = await call({
    method: "GET",
    path: `/processes?id=eq.${PROCESS_ID}&select=id,process_code`,
  });
  if (pcf.length === 0) {
    throw new Error(`PCF ${PROCESS_ID} not found`);
  }

  // Pre-flight: handoff exists.
  const handoff = await call({
    method: "GET",
    path: `/handoffs?id=eq.${HANDOFF_ID}&select=id`,
  });
  if (handoff.length === 0) {
    throw new Error(`handoff ${HANDOFF_ID} not found`);
  }

  // Idempotency: skip if already tagged with this PCF.
  const existing = await call({
    method: "GET",
    path: `/handoff_processes?handoff_id=eq.${HANDOFF_ID}&process_id=eq.${PROCESS_ID}&select=id`,
  });
  if (existing.length > 0) {
    console.log(`  handoff ${HANDOFF_ID} <-> PCF ${PROCESS_ID}: already tagged, skip`);
  } else {
    await call({
      method: "POST",
      path: "/handoff_processes",
      body: [{
        handoff_id: HANDOFF_ID,
        process_id: PROCESS_ID,
        role: "implements",
        proposal_source: "agent_curated",
      }],
    });
    console.log(`  inserted handoff ${HANDOFF_ID} <-> PCF ${PROCESS_ID}`);
  }
}

console.log("done");
