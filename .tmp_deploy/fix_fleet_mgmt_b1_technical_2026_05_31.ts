#!/usr/bin/env bun
// fix_fleet_mgmt_b1_technical_2026_05_31.ts
//
// Applies the truly-technical B1 fixes from audits/FLEET-MGMT.md (2026-05-30
// audit) that do not depend on the deferred module-split decision or other
// judgment calls.
//
// In scope:
//   B1-A1..A11: handoff_processes inserts (APQC tagging). Audit pre-specifies
//               handoff_id + PCF process_id. 6 of 11 already exist on PCF 862
//               (rows 318/319/321/874/880/884 - covered by the TELEMATICS /
//               FSM audits). 5 new rows: A1 (875->1389), A2 (313->352),
//               A3 (317->315), A4 (876->1389), A9 (877->352). Idempotent on
//               (handoff_id, process_id) via the `key` unique constraint.
//   B1-S5 / U1..U5: users edges per Rule #10. Audit pre-specifies 5 rows.
//               Idempotent on (data_object_id, related_data_object_id,
//               relationship_verb).
//
// Deferred (handled outside this loader):
//   B1-S1 (module split, gates everything downstream) - judgment.
//   B1-S2 (catalog_tagline / catalog_description) - Rule #20, user authoring.
//   B1-S3 (pattern flag flips) - explicit defer per task scope.
//   B1-S4 (intra-domain relationships R1-R8) - task scope limits B7 fixes to
//          users-edges only, not generic intra-domain rels.
//   B1-S6 (outbound cross-domain rels X1-X3) - same scope limit.
//   B1-S7, B1-S8, B1-B1..B5 (handoffs + B10b FKs) - all gated on B1-S1.
//   B1-S9 (data_object_aliases) - audit lists lexicon options, not exact
//          (data_object_id, alias_name) tuples; defer per task scope.
//   B1-S10 (lifecycle states + permission_verb_override) - the override is
//          for new states that don't yet exist; can't PATCH a missing row.
//   B1-S11..S14 (skill restructure, channel primitive, sign_document) -
//          gated on new modules from B1-S1, or judgment.
//   B1-S15 (domain_regulations) - VERIFIED LIVE: zero rows in `regulations`
//          for FMCSA Part 391/395/396, IFTA, IRP. Upstream load gap; cannot
//          author junction rows pointing at non-existent regulations.
//   B1-M1..M9 (missing entities) - new entities deferred per task scope.
//
// Run from project root (Rule #6: never cd into .tmp_deploy):
//   bun run c:/dev/domain-map/.tmp_deploy/fix_fleet_mgmt_b1_technical_2026_05_31.ts

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
  if (code !== 0) {
    throw new Error(`postgrestRequest ${method} ${path} (exit ${code}): ${stderr || stdout}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

// ============================================================
// FLEET-MGMT IDs (verified live before authoring this loader)
// ============================================================

const D = {
  fleet_vehicles: 370,        // FLEET-MGMT master
  fleet_drivers: 371,         // FLEET-MGMT master
  fuel_transactions: 372,     // FLEET-MGMT master
  fleet_assignments: 373,     // FLEET-MGMT master
  vehicle_inspections: 374,   // FLEET-MGMT master
  users: 748,                 // platform_builtin
};

// PCF process IDs (verified live)
const PCF = {
  fixed_asset_add_retire: 1389,    // 9.3.3.3
  manage_asset_maintenance: 352,   // 10.3.2
  process_ap: 315,                 // 9.6.1
  // 862 (Manage transportation fleet) already linked on 6 of 11 handoffs.
};

// ============================================================
// B1-A1..A11: handoff_processes inserts (5 net-new after dedup).
// ============================================================

type HandoffTag = {
  audit_id: string;
  handoff_id: number;
  process_id: number;
  description: string; // for log only, not written to DB
};

const handoffTags: HandoffTag[] = [
  { audit_id: "A1", handoff_id: 875, process_id: PCF.fixed_asset_add_retire,
    description: "fleet_vehicle.acquired -> FLEET-MAINT" },
  { audit_id: "A2", handoff_id: 313, process_id: PCF.manage_asset_maintenance,
    description: "vehicle_inspection.failed -> FLEET-MAINT" },
  { audit_id: "A3", handoff_id: 317, process_id: PCF.process_ap,
    description: "fuel_transaction.posted -> ERP-FIN" },
  { audit_id: "A4", handoff_id: 876, process_id: PCF.fixed_asset_add_retire,
    description: "fleet_vehicle.retired -> ERP-FIN" },
  { audit_id: "A9", handoff_id: 877, process_id: PCF.manage_asset_maintenance,
    description: "maintenance_defect.reported (FLEET-MAINT -> FLEET-MGMT)" },
  // A5, A6, A7, A8, A10, A11 -> all PCF 862, already present (verified live).
];

async function ensureHandoffTag(t: HandoffTag): Promise<{ skipped: boolean }> {
  const path =
    `/handoff_processes?handoff_id=eq.${t.handoff_id}` +
    `&process_id=eq.${t.process_id}` +
    `&select=id`;
  const existing = await postgrest("GET", path);
  if (existing && existing.length) return { skipped: true };

  await postgrest("POST", "/handoff_processes", [
    {
      handoff_id: t.handoff_id,
      process_id: t.process_id,
      proposal_source: "agent_curated",
      // role omitted (default 'implements')
      // record_status omitted (Rule #1: default 'new')
      // notes omitted (Rule #15: never auto-populate notes)
    },
  ]);
  return { skipped: false };
}

// ============================================================
// B1-U1..U5: users edges per Rule #10 (5 audit-pre-specified rows).
// Verb / inverse_verb adapted to the catalog convention seen on existing
// users-edges (space-separated active / passive voice, e.g. "owned by" /
// "owns", "created by" / "creates").
// ============================================================

type Rel = {
  audit_id: string;
  source: number;
  source_name: string;
  related: number;
  related_name: string;
  verb: string;
  inverse_verb: string;
  relationship_type: "one_to_one" | "one_to_many" | "many_to_many";
  relationship_kind: "composition" | "reference" | "association" | "inheritance";
  is_required: boolean;
  owner_side: "source" | "target";
};

const usersEdges: Rel[] = [
  {
    // U1: fleet_drivers -> users (driver record links to user account)
    audit_id: "U1",
    source: D.fleet_drivers, source_name: "fleet_drivers",
    related: D.users, related_name: "users",
    verb: "represents", inverse_verb: "represented by",
    relationship_type: "one_to_one", relationship_kind: "reference",
    is_required: false, owner_side: "source",
  },
  {
    // U2: vehicle_inspections -> users (inspecting driver)
    audit_id: "U2",
    source: D.vehicle_inspections, source_name: "vehicle_inspections",
    related: D.users, related_name: "users",
    verb: "performed by", inverse_verb: "performs",
    relationship_type: "many_to_many", relationship_kind: "reference",
    is_required: true, owner_side: "source",
  },
  {
    // U3: fleet_assignments -> users (dispatcher who created the assignment)
    audit_id: "U3",
    source: D.fleet_assignments, source_name: "fleet_assignments",
    related: D.users, related_name: "users",
    verb: "dispatched by", inverse_verb: "dispatches",
    relationship_type: "many_to_many", relationship_kind: "reference",
    is_required: true, owner_side: "source",
  },
  {
    // U4: fuel_transactions -> users (driver who swiped the card)
    audit_id: "U4",
    source: D.fuel_transactions, source_name: "fuel_transactions",
    related: D.users, related_name: "users",
    verb: "fueled by", inverse_verb: "fuels",
    relationship_type: "many_to_many", relationship_kind: "reference",
    is_required: false, owner_side: "source",
  },
  {
    // U5: fleet_vehicles -> users (default assigned driver, nullable)
    audit_id: "U5",
    source: D.fleet_vehicles, source_name: "fleet_vehicles",
    related: D.users, related_name: "users",
    verb: "primary operator", inverse_verb: "primary operates",
    relationship_type: "many_to_many", relationship_kind: "reference",
    is_required: false, owner_side: "source",
  },
];

async function ensureRel(r: Rel): Promise<{ skipped: boolean }> {
  const path =
    `/data_object_relationships?data_object_id=eq.${r.source}` +
    `&related_data_object_id=eq.${r.related}` +
    `&relationship_verb=eq.${encodeURIComponent(r.verb)}` +
    `&select=id`;
  const existing = await postgrest("GET", path);
  if (existing && existing.length) return { skipped: true };

  const label = `${r.source_name} ${r.verb} ${r.related_name}`;
  await postgrest("POST", "/data_object_relationships", [
    {
      data_object_relationship_label: label,
      data_object_id: r.source,
      related_data_object_id: r.related,
      relationship_verb: r.verb,
      inverse_verb: r.inverse_verb,
      relationship_type: r.relationship_type,
      relationship_kind: r.relationship_kind,
      is_required: r.is_required,
      owner_side: r.owner_side,
      // notes intentionally omitted (Rule #15: never auto-populate notes)
      // record_status omitted (Rule #1: default 'new')
    },
  ]);
  return { skipped: false };
}

async function main(): Promise<void> {
  console.log("FLEET-MGMT B1 technical fixes (B1-A APQC tags + B1-U users edges)");
  console.log("");
  let inserted = 0;
  let skipped = 0;

  console.log("B1-A1..A11: handoff_processes (APQC tagging)");
  for (const t of handoffTags) {
    const { skipped: s } = await ensureHandoffTag(t);
    if (s) {
      skipped++;
      console.log(`  SKIP   ${t.audit_id} handoff=${t.handoff_id} process=${t.process_id}  ${t.description}`);
    } else {
      inserted++;
      console.log(`  INSERT ${t.audit_id} handoff=${t.handoff_id} process=${t.process_id}  ${t.description}`);
    }
  }

  console.log("");
  console.log("B1-U1..U5: users edges (Rule #10)");
  for (const r of usersEdges) {
    const { skipped: s } = await ensureRel(r);
    if (s) {
      skipped++;
      console.log(`  SKIP   ${r.audit_id} ${r.source_name} ${r.verb} ${r.related_name}`);
    } else {
      inserted++;
      console.log(`  INSERT ${r.audit_id} ${r.source_name} ${r.verb} ${r.related_name}`);
    }
  }

  const total = handoffTags.length + usersEdges.length;
  console.log("");
  console.log(`Done: ${inserted} inserted, ${skipped} already present (${total} total in scope).`);
}

await main();
