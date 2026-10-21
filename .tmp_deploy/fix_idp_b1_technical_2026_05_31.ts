// IDP B1 technical fixes, 2026-05-31.
// Scope (technical-only per skill rule #6 procedure):
//   B1-S5: PATCH event_category on 11 IDP trigger_events (was empty string, violates enum check constraint).
//   B1-S7: INSERT 7 user-edge data_object_relationships from IDP masters to users (id 748) per Rule #10.
//
// Deferred items (judgment / new entities / gated on module split): B1-S1 (new modules),
// B1-S2 (catalog_tagline/description per Rule #20), B1-S3 (new capabilities), B1-S4 (DMDOs, no modules yet),
// B1-S6 (B10b FK backfills: no IDP/ECM/AP-AUTO modules exist to derive FKs from), B1-S8 (intra-domain
// relationship verbs not pre-specified), B1-S9 (bulk aliases not pre-specified as exact tuples),
// B1-S10 (new module-scoped skills), B1-S11 (new mutate tools), B1-S12 (lifecycle state authoring),
// B1-S13 (new roles), B1-S14 (verb decisions in Bucket 2 #6), B1-H1.* (PCF IDs unverified / unresolvable).

type EnumPatch = { id: number; event_name: string; event_category: string };
type UserEdge = {
  data_object_id: number;
  related_data_object_id: 748;
  relationship_verb: string;
  inverse_verb: string;
  relationship_type: "one_to_one" | "one_to_many" | "many_to_many";
  relationship_kind: "composition" | "reference" | "association" | "inheritance";
  owner_side: "source" | "target";
  is_required: boolean;
};

// B1-S5: enum backfills per audit's pre-specified mapping.
const enumPatches: EnumPatch[] = [
  { id: 776, event_name: "capture_batch.received", event_category: "lifecycle" },
  { id: 777, event_name: "capture_batch.completed", event_category: "state_change" },
  { id: 778, event_name: "idp_extraction_model.deployed", event_category: "state_change" },
  { id: 779, event_name: "idp_extraction_model.accuracy_degraded", event_category: "threshold" },
  { id: 780, event_name: "extracted_field.low_confidence", event_category: "threshold" },
  { id: 781, event_name: "extracted_record.completed", event_category: "state_change" },
  { id: 782, event_name: "extracted_record.requires_review", event_category: "signal" },
  { id: 783, event_name: "idp_validation_result.failed", event_category: "state_change" },
  { id: 784, event_name: "document_classification_result.uncertain", event_category: "threshold" },
  { id: 785, event_name: "idp_extraction_template.published", event_category: "state_change" },
  { id: 786, event_name: "training_dataset.published", event_category: "state_change" },
];

// B1-S7: user-edges per audit's pre-specified Rule #10 set (7 edges).
// IDP master IDs (verified live):
//   530 capture_batches, 531 idp_extraction_models, 532 extracted_fields, 533 extracted_records,
//   534 idp_validation_results, 535 document_classification_results, 536 idp_extraction_templates,
//   537 training_datasets. users platform_builtin = 748.
// Pattern mirrors existing user-edges in the catalog (many_to_many, reference, owner_side=source).
const userEdges: UserEdge[] = [
  {
    data_object_id: 530, // capture_batches
    related_data_object_id: 748,
    relationship_verb: "has submitter",
    inverse_verb: "submits",
    relationship_type: "many_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: true,
  },
  {
    data_object_id: 533, // extracted_records
    related_data_object_id: 748,
    relationship_verb: "has validator",
    inverse_verb: "validates",
    relationship_type: "many_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: false,
  },
  {
    data_object_id: 534, // idp_validation_results
    related_data_object_id: 748,
    relationship_verb: "has reviewer",
    inverse_verb: "reviews",
    relationship_type: "many_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: true,
  },
  {
    data_object_id: 531, // idp_extraction_models
    related_data_object_id: 748,
    relationship_verb: "has model owner",
    inverse_verb: "owns model",
    relationship_type: "many_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: true,
  },
  {
    data_object_id: 536, // idp_extraction_templates
    related_data_object_id: 748,
    relationship_verb: "has template author",
    inverse_verb: "authors template",
    relationship_type: "many_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: true,
  },
  {
    data_object_id: 537, // training_datasets
    related_data_object_id: 748,
    relationship_verb: "has curator",
    inverse_verb: "curates",
    relationship_type: "many_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: true,
  },
  {
    data_object_id: 535, // document_classification_results
    related_data_object_id: 748,
    relationship_verb: "has triager",
    inverse_verb: "triages",
    relationship_type: "many_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: false,
  },
];

async function postgrest(method: string, path: string, body?: unknown): Promise<string> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err, exit] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exit !== 0) {
    throw new Error(`semantius exit ${exit}\nSTDERR:\n${err}\nSTDOUT:\n${out}`);
  }
  return out;
}

// --- B1-S5: trigger_events enum PATCHes (one per row, the rows are few and individual paths are short).
console.log(`B1-S5: PATCHing ${enumPatches.length} trigger_events enum backfills...`);
for (const p of enumPatches) {
  const path = `/trigger_events?id=eq.${p.id}`;
  const body = { event_category: p.event_category };
  await postgrest("PATCH", path, body);
  console.log(`  patched ${p.id} (${p.event_name}) -> event_category='${p.event_category}'`);
}

// Verify enum backfill stuck.
const afterEnums = JSON.parse(
  await postgrest(
    "GET",
    "/trigger_events?data_object_id=in.(530,531,532,533,534,535,536,537)&select=id,event_name,event_category&order=id.asc",
  ),
);
const stillEmpty = afterEnums.filter((r: { event_category: string }) => r.event_category === "");
if (stillEmpty.length > 0) {
  throw new Error(`B1-S5 verify failed: ${stillEmpty.length} trigger_events still have empty event_category`);
}
console.log(`B1-S5 verified: 0 IDP trigger_events with empty event_category (was ${enumPatches.length}).`);

// --- B1-S7: user-edge INSERTs. Skip rows that already exist.
console.log(`\nB1-S7: INSERTing ${userEdges.length} user-edge data_object_relationships...`);
const existing = JSON.parse(
  await postgrest(
    "GET",
    "/data_object_relationships?and=(data_object_id.in.(530,531,532,533,534,535,536,537),related_data_object_id.eq.748)&select=data_object_id,relationship_verb",
  ),
);
const existingKeys = new Set(
  (existing as Array<{ data_object_id: number; relationship_verb: string }>).map(
    (r) => `${r.data_object_id}|${r.relationship_verb}`,
  ),
);
const toInsert = userEdges.filter((e) => !existingKeys.has(`${e.data_object_id}|${e.relationship_verb}`));
if (toInsert.length === 0) {
  console.log(`  all ${userEdges.length} user-edges already exist, nothing to insert.`);
} else {
  // Single chunked POST (well under 32 KB; small payload).
  await postgrest("POST", "/data_object_relationships", toInsert);
  console.log(`  inserted ${toInsert.length} new user-edge rows (skipped ${userEdges.length - toInsert.length} pre-existing).`);
}

// Verify user-edges.
const afterEdges = JSON.parse(
  await postgrest(
    "GET",
    "/data_object_relationships?and=(data_object_id.in.(530,531,532,533,534,535,536,537),related_data_object_id.eq.748)&select=id,data_object_id,relationship_verb",
  ),
);
console.log(`B1-S7 verified: ${afterEdges.length} IDP-to-users edges now present.`);

console.log("\nIDP B1 technical fixes complete.");
console.log("UI: https://tests.semantius.app/domain_map/trigger_events");
console.log("UI: https://tests.semantius.app/domain_map/data_object_relationships");
