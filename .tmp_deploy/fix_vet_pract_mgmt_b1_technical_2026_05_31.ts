#!/usr/bin/env bun
// VET-PRACT-MGMT B1 technical fixes (2026-05-31)
//
// Applies ONLY truly-technical fixes per the audit at audits/VET-PRACT-MGMT.md:
//   - B1-S5: PATCH 4 trigger_events.event_category backfills (audit pre-specifies values).
//   - B1-S3: INSERT 5 intra-domain data_object_relationships edges (Rule #10).
//   - B1-S4: INSERT 5 users edges (Rule #10, all built-in `users` (id=748)).
//   - B1-H1: INSERT 4 handoff_processes rows (agent_curated; audit pre-specifies
//            handoff_id + PCF external_id pairs). Verifies handoff_id + process_id
//            exist + no existing pair before insert.
//
// Defers everything else (modules, lifecycle states, aliases bulk, catalog wording,
// new handoffs, partner-side fixes, etc.) per task spec.
//
// Per Rule #1: record_status is omitted on all inserts (defaults to "new").
// Per Rule #15: notes is omitted on all inserts (defaults to "").
// Per Rule #6: invoke from project root via absolute path.

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

// ============================================================
// B1-S5: trigger_events.event_category PATCH
// ============================================================
const eventCategoryPatches: Array<{ id: number; event_category: string }> = [
  { id: 1087, event_category: "lifecycle" },   // pet_owner.registered
  { id: 1088, event_category: "lifecycle" },   // veterinary_vaccination.administered
  { id: 1089, event_category: "threshold" },   // veterinary_vaccination.due
  { id: 1090, event_category: "signal" },      // veterinary_lab_result.critical
];

console.log("=== B1-S5: PATCH trigger_events.event_category ===");
for (const p of eventCategoryPatches) {
  const before = await call({
    method: "GET",
    path: `/trigger_events?select=id,event_name,event_category&id=eq.${p.id}`,
  });
  if (before.length === 0) {
    throw new Error(`trigger_events id=${p.id} not found, aborting`);
  }
  const row = before[0] as { event_name: string; event_category: string };
  if (row.event_category !== "") {
    console.log(`  id=${p.id} (${row.event_name}) already has category='${row.event_category}', skipping`);
    continue;
  }
  await call({
    method: "PATCH",
    path: `/trigger_events?id=eq.${p.id}`,
    body: { event_category: p.event_category },
  });
  console.log(`  PATCHED id=${p.id} (${row.event_name}) event_category='' -> '${p.event_category}'`);
}

// ============================================================
// Data object ID map (resolved from the live catalog).
// ============================================================
const DO = {
  animal_patients: 395,
  pet_owners: 396,
  veterinary_vaccinations: 397,
  veterinary_lab_results: 398,
  controlled_substance_ledger_entries: 399,
  users: 748,
} as const;

// ============================================================
// Helper: insert relationship if no row with same (source, target, verb)
// already exists. The catalog has no unique constraint on this triple,
// so the loader gates on a live read.
// ============================================================
async function insertRelationshipIfMissing(args: {
  source: number;
  target: number;
  verb: string;
  inverse_verb: string;
  cardinality: "one_to_one" | "one_to_many" | "many_to_many";
  kind: "composition" | "reference" | "association" | "inheritance";
  owner_side: "source" | "target";
  is_required: boolean;
}): Promise<void> {
  const existing = await call({
    method: "GET",
    path: `/data_object_relationships?select=id,relationship_verb&data_object_id=eq.${args.source}&related_data_object_id=eq.${args.target}&relationship_verb=eq.${encodeURIComponent(args.verb)}`,
  });
  if (existing.length > 0) {
    console.log(`  edge exists id=${(existing[0] as Row).id} (${args.source}-[${args.verb}]->${args.target}), skipping`);
    return;
  }
  const result = await call({
    method: "POST",
    path: "/data_object_relationships",
    body: {
      data_object_id: args.source,
      related_data_object_id: args.target,
      relationship_verb: args.verb,
      inverse_verb: args.inverse_verb,
      relationship_type: args.cardinality,
      relationship_kind: args.kind,
      owner_side: args.owner_side,
      is_required: args.is_required,
    },
  });
  const newId = result.length > 0 ? (result[0] as Row).id : "?";
  console.log(`  INSERTED edge id=${newId} (${args.source}-[${args.verb}]->${args.target})`);
}

// ============================================================
// B1-S3: intra-domain data_object_relationships
// Audit pre-specifies these 5 edges.
// Note: the audit also mentions "veterinary_vaccinations drew_from
// controlled_substance_ledger_entries (only for controlled anesthetic doses)" but
// flags it as conditional ("when controlled-substance anesthetics are involved").
// That conditional qualifier means it's not a deterministic structural edge for
// every vaccination row, so it is DEFERRED to user judgment.
// ============================================================
console.log("\n=== B1-S3: INSERT intra-domain data_object_relationships ===");
await insertRelationshipIfMissing({
  source: DO.pet_owners,
  target: DO.animal_patients,
  verb: "owns",
  inverse_verb: "is owned by",
  cardinality: "one_to_many",
  kind: "composition",
  owner_side: "source",
  is_required: true,
});
await insertRelationshipIfMissing({
  source: DO.animal_patients,
  target: DO.veterinary_vaccinations,
  verb: "receives",
  inverse_verb: "administered to",
  cardinality: "one_to_many",
  kind: "composition",
  owner_side: "source",
  is_required: false,
});
await insertRelationshipIfMissing({
  source: DO.animal_patients,
  target: DO.veterinary_lab_results,
  verb: "undergoes",
  inverse_verb: "sampled from",
  cardinality: "one_to_many",
  kind: "composition",
  owner_side: "source",
  is_required: false,
});
await insertRelationshipIfMissing({
  source: DO.animal_patients,
  target: DO.controlled_substance_ledger_entries,
  verb: "administered",
  inverse_verb: "administered to",
  cardinality: "one_to_many",
  kind: "reference",
  owner_side: "source",
  is_required: false,
});

// ============================================================
// B1-S4: users edges (Rule #10).
// Audit pre-specifies 5 user-actor edges. All target the built-in
// users data_object (id=748, kind='platform_builtin').
// ============================================================
console.log("\n=== B1-S4: INSERT users edges (Rule #10) ===");
const userEdges = [
  { source: DO.animal_patients,                       verb: "primary_veterinarian", inverse_verb: "is primary veterinarian for" },
  { source: DO.veterinary_vaccinations,               verb: "administered_by",      inverse_verb: "administered" },
  { source: DO.veterinary_lab_results,                verb: "ordered_by",           inverse_verb: "ordered" },
  { source: DO.controlled_substance_ledger_entries,   verb: "dispensed_by",         inverse_verb: "dispensed" },
  { source: DO.pet_owners,                            verb: "account_owner",        inverse_verb: "is account owner for" },
];
for (const e of userEdges) {
  await insertRelationshipIfMissing({
    source: e.source,
    target: DO.users,
    verb: e.verb,
    inverse_verb: e.inverse_verb,
    cardinality: "one_to_many",
    kind: "reference",
    owner_side: "target",
    is_required: false,
  });
}

// ============================================================
// B1-H1: handoff_processes tags
// Audit pre-specifies: handoff_id + PCF external_id pairs, all agent_curated.
// PCF external_id -> process_id resolution (from live read):
//   external_id=12840 ("Report incidents and risks to regulatory bodies") -> process_id=199
//   external_id=11793 ("Manage notification outcome")                     -> process_id=734
// ============================================================
console.log("\n=== B1-H1: INSERT handoff_processes (agent_curated) ===");
const handoffProcessTags: Array<{ handoff_id: number; process_id: number; label: string }> = [
  { handoff_id: 335, process_id: 199, label: "handoff 335 implements PCF 12840" },
  { handoff_id: 337, process_id: 734, label: "handoff 337 implements PCF 11793" },
  { handoff_id: 947, process_id: 734, label: "handoff 947 implements PCF 11793" },
  { handoff_id: 948, process_id: 199, label: "handoff 948 implements PCF 12840" },
];

// Pre-flight: verify all 4 handoffs exist + all 2 process ids exist.
const handoffIds = handoffProcessTags.map(t => t.handoff_id);
const processIds = Array.from(new Set(handoffProcessTags.map(t => t.process_id)));
const hCheck = await call({
  method: "GET",
  path: `/handoffs?select=id&id=in.(${handoffIds.join(",")})`,
});
if (hCheck.length !== handoffIds.length) {
  throw new Error(`handoff pre-flight failed: expected ${handoffIds.length}, got ${hCheck.length}`);
}
const pCheck = await call({
  method: "GET",
  path: `/processes?select=id&id=in.(${processIds.join(",")})`,
});
if (pCheck.length !== processIds.length) {
  throw new Error(`process pre-flight failed: expected ${processIds.length}, got ${pCheck.length}`);
}

// Idempotency: skip rows where the (handoff_id, process_id) pair already exists.
const existingPairs = await call({
  method: "GET",
  path: `/handoff_processes?select=handoff_id,process_id&handoff_id=in.(${handoffIds.join(",")})`,
});
const existingKeys = new Set(
  existingPairs.map((r: Row) => `${r.handoff_id}|${r.process_id}`),
);

for (const t of handoffProcessTags) {
  const key = `${t.handoff_id}|${t.process_id}`;
  if (existingKeys.has(key)) {
    console.log(`  pair exists (handoff=${t.handoff_id}, process=${t.process_id}), skipping`);
    continue;
  }
  const result = await call({
    method: "POST",
    path: "/handoff_processes",
    body: {
      handoff_id: t.handoff_id,
      process_id: t.process_id,
      label: t.label,
      role: "implements",
      proposal_source: "agent_curated",
    },
  });
  const newId = result.length > 0 ? (result[0] as Row).id : "?";
  console.log(`  INSERTED handoff_processes id=${newId} (handoff=${t.handoff_id}, process=${t.process_id})`);
}

console.log("\n=== Done ===");
console.log("Spot-check URLs:");
console.log("  https://tests.semantius.app/domain_map/trigger_events");
console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
console.log("  https://tests.semantius.app/domain_map/handoff_processes");
