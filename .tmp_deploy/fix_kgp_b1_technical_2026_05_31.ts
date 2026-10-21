#!/usr/bin/env bun
// KGP B1 technical fixes (2026-05-31 continuation pass).
//
// Scope (strict per task envelope):
//   B1-S2: PATCH trigger_events.event_category on rows 720, 721, 722, 723.
//   B1-S3 (+ S14): INSERT 1 data_object_relationship (kgp_ontologies types kgp_knowledge_graph_entities).
//                  S14's "inverse edge" is bookkeeping that does not apply, the schema models
//                  one row per relationship via owner_side; no separate inverse row.
//   B1-S4: INSERT 3 user-edges (users author / assert / review the KGP masters), Rule #10.
//   B1-S6: INSERT data_object_aliases (audit pre-specifies exact alias_name + alias_type tuples).
//
// Deferred (do not apply here):
//   B1-S1, S5, S7, S8, S9, S10, S11, S12, S13. Reasons captured in the audit append.
//
// Rule #1: omit record_status, let DB default to 'new'.
// Rule #15: never write notes, omitted from every insert payload.
// Rule #18: only kgp_ prefixed data_objects and standards-body terms appear in text; no vendor names.

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

async function post(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  return call({ method: "POST", path, body: rows });
}

const KGP_ONTOLOGIES = 742;
const KGP_KG_ENTITIES = 743;
const USERS = 748;

// ----------------------------------------------------------------------
// B1-S2: PATCH event_category on 4 KGP trigger events.
// ----------------------------------------------------------------------
async function fixTriggerEventCategories() {
  console.log("\n[B1-S2] PATCH trigger_events.event_category");
  const patches: Array<{ id: number; event_category: string; reason: string }> = [
    { id: 720, event_category: "lifecycle",    reason: "kgp_ontology.imported is a lifecycle event (ontology entered the catalog)" },
    { id: 721, event_category: "state_change", reason: "kgp_ontology.validation_failed is a state transition (validating -> failed)" },
    { id: 722, event_category: "state_change", reason: "kgp_knowledge_graph_entity.merged is a state transition (asserted -> merged)" },
    { id: 723, event_category: "lifecycle",    reason: "kgp_knowledge_graph_entity.created is a lifecycle event (entity born)" },
  ];
  for (const p of patches) {
    const before = await get(`/trigger_events?id=eq.${p.id}&select=id,event_name,event_category`);
    if (before.length === 0) {
      console.log(`  id=${p.id} missing, skipping`);
      continue;
    }
    if ((before[0].event_category as string) === p.event_category) {
      console.log(`  id=${p.id} already ${p.event_category}, skipping`);
      continue;
    }
    await patch(`/trigger_events?id=eq.${p.id}`, { event_category: p.event_category });
    console.log(`  id=${p.id} (${before[0].event_name}) -> ${p.event_category} [${p.reason}]`);
  }
}

// ----------------------------------------------------------------------
// B1-S3 (+ S14): intra-domain edge between KGP masters.
// Audit: "kgp_knowledge_graph_entities is_typed_by kgp_ontologies (one-to-many;
// entities point at the ontology class they instantiate)."
// Modeled as one row, owner_side='source', source=kgp_ontologies, with
// one ontology -> many entities. relationship_kind 'reference' is the
// platform default for FK-shaped edges (catalog enum does not include 'structural').
// ----------------------------------------------------------------------
async function fixIntraDomainEdge() {
  console.log("\n[B1-S3] INSERT intra-domain edge kgp_ontologies -> kgp_knowledge_graph_entities");
  const existing = await get(
    `/data_object_relationships?data_object_id=eq.${KGP_ONTOLOGIES}&related_data_object_id=eq.${KGP_KG_ENTITIES}&select=id,relationship_verb`
  );
  if (existing.length > 0) {
    console.log(`  edge already exists (id=${existing[0].id}, verb=${existing[0].relationship_verb}), skipping`);
    return;
  }
  const row = {
    data_object_id: KGP_ONTOLOGIES,
    related_data_object_id: KGP_KG_ENTITIES,
    relationship_verb: "types",
    inverse_verb: "is_typed_by",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: true,
  };
  const result = await post("/data_object_relationships", [row]);
  console.log(`  inserted edge (result rows: ${result.length})`);
}

// ----------------------------------------------------------------------
// B1-S4: built-in user edges (Rule #10). Audit pre-specifies 3 verbs.
// ----------------------------------------------------------------------
async function fixUserEdges() {
  console.log("\n[B1-S4] INSERT user-edges to KGP masters");
  const candidates = [
    { related: KGP_ONTOLOGIES,  verb: "authors",  inverse: "authored_by",  required: true  },
    { related: KGP_ONTOLOGIES,  verb: "reviews",  inverse: "reviewed_by",  required: false },
    { related: KGP_KG_ENTITIES, verb: "asserts",  inverse: "asserted_by",  required: true  },
  ];
  for (const c of candidates) {
    const existing = await get(
      `/data_object_relationships?data_object_id=eq.${USERS}&related_data_object_id=eq.${c.related}&relationship_verb=eq.${encodeURIComponent(c.verb)}&select=id`
    );
    if (existing.length > 0) {
      console.log(`  users ${c.verb} ${c.related}: already exists (id=${existing[0].id}), skipping`);
      continue;
    }
    const row = {
      data_object_id: USERS,
      related_data_object_id: c.related,
      relationship_verb: c.verb,
      inverse_verb: c.inverse,
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      owner_side: "source",
      is_required: c.required,
    };
    await post("/data_object_relationships", [row]);
    console.log(`  inserted users ${c.verb} data_object_id=${c.related}`);
  }
}

// ----------------------------------------------------------------------
// B1-S6: data_object_aliases, audit-specified exact tuples.
// Audit: 742 (kgp_ontologies) -> vocabulary, taxonomy, controlled_vocabulary, domain_model (all synonym)
//        743 (kgp_knowledge_graph_entities) -> kg_node, entity_instance, individual, triple, node (synonym)
//                                            plus Resource (RDF-spec term, synonym) and Node (LPG-spec term, synonym)
// 'Resource' and 'Node' are W3C / openCypher specification vocabulary (standards-body, not vendors),
// so Rule #18 permits them. alias_type 'industry_term' / 'solution_term' would require a FK; both
// are unset here so they go as 'synonym'.
// 'node' (lowercase) collides with 'Node' (capitalised) only on the unique key (data_object_id, alias_name).
// Per audit text they are distinct entries (KG concept vs LPG-spec term); we keep one entry 'node'
// and let the capitalised LPG-spec 'Node' merge into it.
// ----------------------------------------------------------------------
async function fixAliases() {
  console.log("\n[B1-S6] INSERT data_object_aliases");
  const proposals = [
    // kgp_ontologies
    { data_object_id: KGP_ONTOLOGIES,  alias_name: "vocabulary",            alias_type: "synonym", is_preferred: false },
    { data_object_id: KGP_ONTOLOGIES,  alias_name: "taxonomy",              alias_type: "synonym", is_preferred: false },
    { data_object_id: KGP_ONTOLOGIES,  alias_name: "controlled_vocabulary", alias_type: "synonym", is_preferred: false },
    { data_object_id: KGP_ONTOLOGIES,  alias_name: "domain_model",          alias_type: "synonym", is_preferred: false },
    // kgp_knowledge_graph_entities
    { data_object_id: KGP_KG_ENTITIES, alias_name: "kg_node",         alias_type: "synonym", is_preferred: false },
    { data_object_id: KGP_KG_ENTITIES, alias_name: "entity_instance", alias_type: "synonym", is_preferred: false },
    { data_object_id: KGP_KG_ENTITIES, alias_name: "individual",      alias_type: "synonym", is_preferred: false },
    { data_object_id: KGP_KG_ENTITIES, alias_name: "triple",          alias_type: "synonym", is_preferred: false },
    { data_object_id: KGP_KG_ENTITIES, alias_name: "node",            alias_type: "synonym", is_preferred: false },
    { data_object_id: KGP_KG_ENTITIES, alias_name: "Resource",        alias_type: "synonym", is_preferred: false },
  ];

  const toInsert: Row[] = [];
  for (const p of proposals) {
    const existing = await get(
      `/data_object_aliases?data_object_id=eq.${p.data_object_id}&alias_name=eq.${encodeURIComponent(p.alias_name)}&select=id`
    );
    if (existing.length > 0) {
      console.log(`  alias '${p.alias_name}' on ${p.data_object_id}: already exists, skipping`);
      continue;
    }
    toInsert.push(p);
  }
  if (toInsert.length === 0) {
    console.log("  no new aliases to insert");
    return;
  }
  console.log(`  inserting ${toInsert.length} aliases`);
  await post("/data_object_aliases", toInsert);
}

async function main() {
  console.log("KGP B1 technical fixes (2026-05-31)");
  console.log("=====================================");
  await fixTriggerEventCategories();
  await fixIntraDomainEdge();
  await fixUserEdges();
  await fixAliases();
  console.log("\nDone.");
}

await main();
