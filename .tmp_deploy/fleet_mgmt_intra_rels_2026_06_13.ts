// B6 / B1-S4: author the 8 baseline intra-domain data_object_relationships edges
// among the FLEET-MGMT masters, per the 2026-05-30 audit R1-R8 spec. All are
// one_to_many, owner_side=source (the "one"/parent side), relationship_kind=
// reference (children have independent lifecycles, not compositions). Verbs use
// the active/passive space-separated convention seen on existing catalog edges.
// Idempotent: skip any (data_object_id, related_data_object_id, verb) already
// present. notes empty (Rule #15). record_status defaults to 'new' (Rule #1).
//
// Names: 370 fleet_vehicles, 371 fleet_drivers, 372 fuel_transactions,
//        373 fleet_assignments, 374 vehicle_inspections.

const N: Record<number, string> = {
  370: "fleet_vehicles", 371: "fleet_drivers", 372: "fuel_transactions",
  373: "fleet_assignments", 374: "vehicle_inspections",
};

type Edge = {
  src: number; tgt: number; verb: string; inverse: string;
  required: boolean;
};

// owner_side=source, relationship_type=one_to_many, relationship_kind=reference for all.
const EDGES: Edge[] = [
  { src: 370, tgt: 373, verb: "assigned via", inverse: "assigns", required: true },   // R1 vehicle -> assignment
  { src: 371, tgt: 373, verb: "operates via", inverse: "operated by", required: true }, // R2 driver -> assignment
  { src: 373, tgt: 374, verb: "scopes", inverse: "scoped by", required: false },       // R3 assignment -> inspection
  { src: 370, tgt: 374, verb: "subject of", inverse: "inspects", required: true },     // R4 vehicle -> inspection
  { src: 371, tgt: 374, verb: "performs", inverse: "performed by", required: true },   // R5 driver -> inspection
  { src: 370, tgt: 372, verb: "fueled via", inverse: "fuels", required: true },        // R6 vehicle -> fuel txn
  { src: 371, tgt: 372, verb: "charges", inverse: "charged by", required: false },     // R7 driver -> fuel txn
  { src: 373, tgt: 372, verb: "attributes", inverse: "attributed via", required: false }, // R8 assignment -> fuel txn
];

async function crud(method: string, path: string, body?: unknown): Promise<any> {
  const arg = JSON.stringify({ method, path, ...(body ? { body } : {}) });
  const p = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  p.stdin.write(arg);
  p.stdin.end();
  const out = await new Response(p.stdout).text();
  const err = await new Response(p.stderr).text();
  await p.exited;
  if (err && err.trim() && !out.trim()) throw new Error(`crud ${path}: ${err}`);
  try { return out.trim() ? JSON.parse(out) : null; } catch { return out; }
}

const existing: any[] = (await crud("GET",
  "/data_object_relationships?and=(data_object_id.in.(370,371,372,373,374),related_data_object_id.in.(370,371,372,373,374))&select=data_object_id,related_data_object_id,relationship_verb")) || [];
const seen = new Set(existing.map((r) => `${r.data_object_id}:${r.related_data_object_id}:${r.relationship_verb}`));

const rows = EDGES
  .filter((e) => !seen.has(`${e.src}:${e.tgt}:${e.verb}`))
  .map((e) => ({
    data_object_relationship_label: `${N[e.src]} ${e.verb} ${N[e.tgt]}`,
    data_object_id: e.src,
    related_data_object_id: e.tgt,
    owner_side: "source",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    relationship_verb: e.verb,
    inverse_verb: e.inverse,
    is_required: e.required,
  }));

if (rows.length === 0) {
  console.log("all 8 edges already present, skipped");
} else {
  await crud("POST", "/data_object_relationships", rows);
  console.log(`inserted ${rows.length} intra-domain edges:`);
  for (const r of rows) console.log(`  ${r.data_object_relationship_label}`);
}
console.log("done.");
