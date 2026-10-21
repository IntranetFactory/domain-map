#!/usr/bin/env bun
// B1A-S5 (FOOD-TRACE) — intra-domain data_object_relationships cluster on masters
// 494 traceability_lots, 495 critical_tracking_events, 496 key_data_elements,
// 497 recall_events, 498 supplier_certifications.
//
// Per the b1a action: one row per verb plus its inverse; is_required per the workflow;
// owner_side per B6/B6b.
//   one_to_many: owner_side = the "one"/parent (source here), forward verb reads parent->child.
//   many_to_many: owner_side = the verb-owning (source) side.
// relationship_kind: reference for the 1:N master->master links (independent lifecycles,
//   no cascade-delete composition asserted on master entities); association for the m2m links.
// Idempotent: dedup by (data_object_id, related_data_object_id, relationship_verb).
// record_status omitted (default new). notes left empty (Rule #15).

import { $ } from "bun";
$.throws(false);
type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
async function get(path: string): Promise<Row[]> { return call({ method: "GET", path }); }
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    out.push(...await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) }));
  }
  return out;
}

const edges = [
  // 1) traceability_lots originates critical_tracking_events (one_to_many; lot is parent/one).
  //    A CTE must anchor to a lot -> is_required true on the edge.
  { data_object_id: 494, related_data_object_id: 495, relationship_verb: "originates", inverse_verb: "originates from", relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "source" },
  // 2) critical_tracking_events carries key_data_elements (one_to_many; CTE is parent/one).
  //    A KDE belongs to its CTE -> is_required true.
  { data_object_id: 495, related_data_object_id: 496, relationship_verb: "carries", inverse_verb: "is carried by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "source" },
  // 3) recall_events targets traceability_lots (many_to_many). A lot exists independent of recalls.
  { data_object_id: 497, related_data_object_id: 494, relationship_verb: "targets", inverse_verb: "is targeted by", relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
  // 4) supplier_certifications authorizes traceability_lots (many_to_many, provenance basis).
  { data_object_id: 498, related_data_object_id: 494, relationship_verb: "authorizes", inverse_verb: "is authorized by", relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
  // 5) traceability_lots derived_from traceability_lots (self-edge; split/merge/transform genealogy).
  { data_object_id: 494, related_data_object_id: 494, relationship_verb: "derived from", inverse_verb: "is source of", relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
];

const existing = await get("/data_object_relationships?or=(data_object_id.in.(494,495,496,497,498),related_data_object_id.in.(494,495,496,497,498))&select=data_object_id,related_data_object_id,relationship_verb");
const key = (r: Row) => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`;
const have = new Set(existing.map(key));
const toInsert = edges.filter(e => !have.has(key(e)));
console.log(`intra-domain DOR: ${edges.length} proposed, ${toInsert.length} to insert`);
if (toInsert.length) {
  const ins = await insert("/data_object_relationships", toInsert);
  console.log("inserted ids:", ins.map((r: Row) => `${r.id}: ${r.data_object_id}-${r.relationship_verb}->${r.related_data_object_id}`).join(", "));
}
// Verify intra-domain edges (both ends in the master set)
const after = await get("/data_object_relationships?and=(data_object_id.in.(494,495,496,497,498),related_data_object_id.in.(494,495,496,497,498))&select=id,data_object_id,relationship_verb,inverse_verb,related_data_object_id,relationship_type,relationship_kind,is_required,owner_side&order=id.asc");
console.log(`\nVERIFY: ${after.length} intra-domain DOR rows (both ends in masters)`);
for (const r of after) console.log(`  ${r.id} | ${r.data_object_id} --${r.relationship_verb}/${r.inverse_verb}--> ${r.related_data_object_id} | ${r.relationship_type}/${r.relationship_kind} | req=${r.is_required} owner=${r.owner_side}`);
