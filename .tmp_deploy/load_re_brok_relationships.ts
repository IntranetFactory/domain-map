#!/usr/bin/env bun
// load_re_brok_relationships.ts - RE-BROK Phase B6 + B7
//
// Loads 11 data_object_relationships:
//
// B6 - intra-domain master <-> master (4 edges):
//   real_estate_listings    -> real_estate_transactions ("generates")
//   real_estate_listings    -> tour_appointments        ("has tours")
//   real_estate_transactions -> disclosure_documents     ("requires disclosures")
//   real_estate_transactions -> commission_splits        ("produces commission splits")
//
// B7 - users edges (7 edges - per Rule #10):
//   real_estate_listings    -> users (listing agent)
//   tour_appointments       -> users (showing agent)
//   real_estate_transactions -> users (listing-side agent)
//   real_estate_transactions -> users (buyer-side agent)
//   disclosure_documents    -> users (preparer)
//   commission_splits       -> users (recipient agent)
//   commission_splits       -> users (approving broker)
//
// B8 outbound cross-domain edges: deferred to pairwise reconciliation step.
// Existing outbound handoffs do not have clean payload->target data_object
// mappings; will be surfaced via pairwise reconciliation diff files instead.
//
// Idempotent on (data_object_id, related_data_object_id, relationship_verb).
// Run from project root: bun run c:/dev/domain-map/.tmp_deploy/load_re_brok_relationships.ts

export {};

type Row = Record<string, unknown>;

async function postgrest(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path} (exit ${code}): ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

// ============================================================
// 0. Resolve data_object IDs
// ============================================================
console.log("=== 0. Resolving data_object IDs ===");
const doNames = [
  "real_estate_listings", "tour_appointments", "real_estate_transactions",
  "disclosure_documents", "commission_splits", "users",
];
const doRows: Row[] = await postgrest(
  "GET",
  `/data_objects?data_object_name=in.(${doNames.join(",")})&select=id,data_object_name`,
) ?? [];
const did: Record<string, number> = {};
for (const r of doRows) did[String(r.data_object_name)] = Number(r.id);
console.log(`  ${Object.keys(did).length} of ${doNames.length} resolved`);
for (const n of doNames) if (!did[n]) throw new Error(`Missing data_object ${n}`);

// ============================================================
// 1. Define 11 edges
// ============================================================
type EdgeSpec = {
  source: string;
  target: string;
  verb: string;
  inverseVerb: string;
  type: "one_to_one" | "one_to_many" | "many_to_many";
  kind: "composition" | "reference" | "association" | "inheritance";
  isRequired: boolean;
  ownerSide: "source" | "target";
};

const edges: EdgeSpec[] = [
  // B6 intra-domain master <-> master
  {
    source: "real_estate_listings", target: "real_estate_transactions",
    verb: "generates", inverseVerb: "originates from",
    type: "one_to_many", kind: "reference", isRequired: true, ownerSide: "target",
  },
  {
    source: "real_estate_listings", target: "tour_appointments",
    verb: "has tours", inverseVerb: "tours",
    type: "one_to_many", kind: "reference", isRequired: true, ownerSide: "target",
  },
  {
    source: "real_estate_transactions", target: "disclosure_documents",
    verb: "requires disclosures", inverseVerb: "discloses for",
    type: "one_to_many", kind: "composition", isRequired: true, ownerSide: "target",
  },
  {
    source: "real_estate_transactions", target: "commission_splits",
    verb: "produces commission splits", inverseVerb: "splits commission on",
    type: "one_to_many", kind: "composition", isRequired: true, ownerSide: "target",
  },
  // B7 users edges (one row per named user-role on the entity)
  {
    source: "real_estate_listings", target: "users",
    verb: "has listing agent", inverseVerb: "lists",
    type: "many_to_many", kind: "reference", isRequired: true, ownerSide: "source",
  },
  {
    source: "tour_appointments", target: "users",
    verb: "has showing agent", inverseVerb: "shows",
    type: "many_to_many", kind: "reference", isRequired: true, ownerSide: "source",
  },
  {
    source: "real_estate_transactions", target: "users",
    verb: "has listing-side agent", inverseVerb: "represents seller on",
    type: "many_to_many", kind: "reference", isRequired: true, ownerSide: "source",
  },
  {
    source: "real_estate_transactions", target: "users",
    verb: "has buyer-side agent", inverseVerb: "represents buyer on",
    type: "many_to_many", kind: "reference", isRequired: false, ownerSide: "source",
  },
  {
    source: "disclosure_documents", target: "users",
    verb: "has preparer", inverseVerb: "prepares",
    type: "many_to_many", kind: "reference", isRequired: true, ownerSide: "source",
  },
  {
    source: "commission_splits", target: "users",
    verb: "has recipient agent", inverseVerb: "earns commission via",
    type: "many_to_many", kind: "reference", isRequired: true, ownerSide: "source",
  },
  {
    source: "commission_splits", target: "users",
    verb: "has approving broker", inverseVerb: "approves split",
    type: "many_to_many", kind: "reference", isRequired: true, ownerSide: "source",
  },
];

// ============================================================
// 2. Idempotent insert
// ============================================================
console.log("\n=== 1. data_object_relationships ===");

const involvedIds = new Set<number>();
for (const e of edges) { involvedIds.add(did[e.source]); involvedIds.add(did[e.target]); }
const idList = [...involvedIds].join(",");

const existing: Row[] = await postgrest(
  "GET",
  `/data_object_relationships?or=(data_object_id.in.(${idList}),related_data_object_id.in.(${idList}))&select=data_object_id,related_data_object_id,relationship_verb`,
) ?? [];
const seen = new Set(existing.map((r) => `${r.data_object_id}:${r.related_data_object_id}:${String(r.relationship_verb).trim()}`));

let added = 0;
let skipped = 0;
for (const e of edges) {
  const sId = did[e.source];
  const tId = did[e.target];
  const key = `${sId}:${tId}:${e.verb.trim()}`;
  if (seen.has(key)) {
    skipped++;
    console.log(`  recycled  ${e.source} ${e.verb} ${e.target}`);
    continue;
  }
  await postgrest("POST", "/data_object_relationships", {
    data_object_id: sId,
    related_data_object_id: tId,
    relationship_verb: e.verb,
    inverse_verb: e.inverseVerb,
    relationship_type: e.type,
    relationship_kind: e.kind,
    is_required: e.isRequired,
    owner_side: e.ownerSide,
  });
  added++;
  console.log(`  new       ${e.source} ${e.verb} ${e.target}`);
}
console.log();
console.log(`  Total: new ${added} / recycled ${skipped}`);

// ============================================================
// 3. Verification - count edges per master + users-edge coverage
// ============================================================
console.log("\n=== 2. Verification (B6, B7 audits) ===");
const masters = [
  "real_estate_listings", "tour_appointments", "real_estate_transactions",
  "disclosure_documents", "commission_splits",
];
for (const m of masters) {
  const mId = did[m];
  const intra: Row[] = await postgrest(
    "GET",
    `/data_object_relationships?or=(and(data_object_id.eq.${mId},related_data_object_id.in.(${masters.map((n) => did[n]).join(",")})),and(related_data_object_id.eq.${mId},data_object_id.in.(${masters.map((n) => did[n]).join(",")})))&select=id`,
  ) ?? [];
  const usersEdges: Row[] = await postgrest(
    "GET",
    `/data_object_relationships?or=(and(data_object_id.eq.${mId},related_data_object_id.eq.${did.users}),and(related_data_object_id.eq.${mId},data_object_id.eq.${did.users}))&select=id`,
  ) ?? [];
  console.log(`  ${m.padEnd(28)}: ${intra.length} intra-domain, ${usersEdges.length} users-edge`);
}

console.log();
console.log("=== complete ===");
console.log("UI: https://tests.semantius.app/domain_map/data_object_relationships");
