// PROC-MIN (id 40) B1 technical fixes, 2026-05-31.
//
// Applies the truly-mechanical Bucket 1 items from audits/PROC-MIN.md whose
// values are fully pre-specified in the audit and require no user judgment.
//
// Items applied:
//   B1-S1: PATCH 6 trigger_events rows to set event_category from "" to the
//          enum value pre-specified in the audit (lifecycle / state_change /
//          signal).
//   B1-S3: INSERT 6 data_object_relationships user-edges (Rule #10), one per
//          PROC-MIN master, on the standard verb-shape pattern observed in the
//          catalog (many_to_many / reference / is_required=false /
//          owner_side='source', "<verb> by" verb, "<verb>s" inverse).
//
// Items intentionally NOT applied (deferred per the analyst's brief and
// SKILL.md Rules #15, #20, M-band cross-bucket dependency):
//   B1-S2  (Rule #20 catalog_tagline / catalog_description, needs user voice)
//   B1-S4  (intra-domain rels: verb/cardinality/kind/owner_side per-row not
//          pre-specified by the audit; needs cluster-drafts review)
//   B1-S5  (data_object_aliases: audit names alias themes but not exact
//          (alias_name, locale, vendor_solution_id) tuples)
//   B1-S6  (lifecycle states: blocked on B2-1 modularization + B2-5 variants
//          exemption decision; needs domain_module_id which does not exist)
//   B1-S7  (B10b backfill: blocked on B1-M1 modules not existing yet)
//   B1-S8  (legacy F1 system skill cleanup: blocked on B1-M1)
//   B1-H1  (handoff_processes: pre-checked, the 4 proposed rows already exist
//          as agent_curated, handoff 742 was deferred per audit. No-op.)

type Row = Record<string, unknown>;

async function call(req: { method: string; path: string; body?: unknown }): Promise<Row[]> {
  const args = ["call", "crud", "postgrestRequest"];
  const payload: Record<string, unknown> = { method: req.method, path: req.path };
  if (req.body !== undefined) payload.body = req.body;
  const proc = Bun.spawn(["semantius", ...args], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`semantius exit ${code}\nSTDERR: ${err}\nSTDOUT: ${out}`);
  }
  const trimmed = out.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------- B1-S1
// PATCH trigger_events.event_category for the 6 PROC-MIN events.

const triggerEventCategoryUpdates: { id: number; event_name: string; event_category: string }[] = [
  { id: 358, event_name: "conformance.deviation_detected",   event_category: "signal" },
  { id: 797, event_name: "event_log.ingested",               event_category: "lifecycle" },
  { id: 798, event_name: "discovered_process_model.published", event_category: "state_change" },
  { id: 799, event_name: "process_variant.identified",       event_category: "signal" },
  { id: 800, event_name: "process_bottleneck_finding.created", event_category: "signal" },
  { id: 801, event_name: "business_rule_extracted.identified", event_category: "signal" },
];

console.log("=== B1-S1: PATCH trigger_events.event_category ===");
for (const upd of triggerEventCategoryUpdates) {
  // Re-read live to avoid clobbering if a user already set the value.
  const live = await call({
    method: "GET",
    path: `/trigger_events?select=id,event_name,event_category&id=eq.${upd.id}`,
  });
  if (live.length === 0) {
    console.log(`  SKIP id=${upd.id} (${upd.event_name}): row not found`);
    continue;
  }
  const currentCat = String(live[0].event_category ?? "");
  if (currentCat === upd.event_category) {
    console.log(`  SKIP id=${upd.id} (${upd.event_name}): already ${upd.event_category}`);
    continue;
  }
  if (currentCat !== "") {
    console.log(
      `  SKIP id=${upd.id} (${upd.event_name}): event_category already non-empty (${currentCat}); will not overwrite`,
    );
    continue;
  }
  await call({
    method: "PATCH",
    path: `/trigger_events?id=eq.${upd.id}`,
    body: { event_category: upd.event_category },
  });
  console.log(`  PATCH id=${upd.id} (${upd.event_name}): "" -> ${upd.event_category}`);
}

// ---------------------------------------------------------------- B1-S3
// INSERT 6 user-edges in data_object_relationships per Rule #10.
//
// Standard verb-shape pattern in the catalog: many_to_many / reference /
// is_required=false / owner_side='source', verb "<action> by", inverse "<action>s".
// One row per master; primary actor verb selected when audit lists multiple.

const USERS_DATA_OBJECT_ID = 748;

type UserEdgeSpec = {
  data_object_id: number;
  data_object_name: string; // for label assembly + logging
  verb: string;             // "uploaded by"
  inverse: string;          // "uploads"
};

const userEdges: UserEdgeSpec[] = [
  // event_logs: audit names "uploaded_by / ingested_by"; primary = uploaded by.
  { data_object_id: 579, data_object_name: "event_logs",                 verb: "uploaded by",  inverse: "uploads" },
  // discovered_process_models: "published_by".
  { data_object_id: 580, data_object_name: "discovered_process_models",  verb: "published by", inverse: "publishes" },
  // process_conformance_results: "analyst".
  { data_object_id: 581, data_object_name: "process_conformance_results", verb: "analyzed by", inverse: "analyzes" },
  // process_variants: "analyst".
  { data_object_id: 582, data_object_name: "process_variants",           verb: "analyzed by", inverse: "analyzes" },
  // process_bottleneck_findings: "assigned_to / owner"; primary = assigned to.
  { data_object_id: 583, data_object_name: "process_bottleneck_findings", verb: "assigned to", inverse: "is assigned" },
  // business_rules_extracted: "reviewed_by".
  { data_object_id: 584, data_object_name: "business_rules_extracted",   verb: "reviewed by",  inverse: "reviews" },
];

console.log("\n=== B1-S3: INSERT data_object_relationships user-edges (Rule #10) ===");

// Pre-flight: skip rows that already exist for (data_object_id, related_data_object_id, verb).
const idsCsv = userEdges.map(e => e.data_object_id).join(",");
const existing = await call({
  method: "GET",
  path:
    `/data_object_relationships` +
    `?select=id,data_object_id,related_data_object_id,relationship_verb` +
    `&data_object_id=in.(${idsCsv})` +
    `&related_data_object_id=eq.${USERS_DATA_OBJECT_ID}`,
});
const existingKey = (r: Row) =>
  `${r.data_object_id}|${r.related_data_object_id}|${String(r.relationship_verb ?? "")}`;
const existingSet = new Set(existing.map(existingKey));

const toInsert: Row[] = [];
for (const e of userEdges) {
  const key = `${e.data_object_id}|${USERS_DATA_OBJECT_ID}|${e.verb}`;
  if (existingSet.has(key)) {
    console.log(`  SKIP ${e.data_object_name} ${e.verb} users: already exists`);
    continue;
  }
  toInsert.push({
    data_object_relationship_label: `${e.data_object_name} ${e.verb} users`,
    data_object_id: e.data_object_id,
    related_data_object_id: USERS_DATA_OBJECT_ID,
    relationship_verb: e.verb,
    inverse_verb: e.inverse,
    relationship_type: "many_to_many",
    relationship_kind: "reference",
    is_required: false,
    owner_side: "source",
    // record_status omitted -> defaults to "new" (Rule #1).
    // notes omitted -> defaults to "" (Rule #15).
  });
}

if (toInsert.length > 0) {
  const inserted = await call({
    method: "POST",
    path: "/data_object_relationships",
    body: toInsert,
  });
  for (const row of inserted) {
    console.log(`  INSERT id=${row.id}: ${row.data_object_relationship_label}`);
  }
} else {
  console.log("  (no new user-edge rows needed)");
}

console.log("\n=== Done ===");
console.log("UI links for spot-check:");
console.log("  https://tests.semantius.app/domain_map/trigger_events");
console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
