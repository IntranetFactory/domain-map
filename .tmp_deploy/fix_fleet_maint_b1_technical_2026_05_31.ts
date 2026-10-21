#!/usr/bin/env bun
// fix_fleet_maint_b1_technical_2026_05_31.ts
//
// Applies the truly-technical B1 fixes from audits/FLEET-MAINT.md (2026-05-30
// audit) that do not depend on the deferred module-split decision.
//
// In scope:
//   B1-S4: intra-domain relationships (4 of 5 audit-pre-specified rows).
//          R5 (defects triggers_revision PM_schedules, many_to_one) is DEFERRED
//          because the schema's relationship_type enum lacks `many_to_one` and
//          re-encoding by swapping source/target would drift from the audit's
//          literal tuple. Surfaced back to the audit log.
//   B1-S5: users edges (4 audit-pre-specified rows, Rule #10).
//
// Deferred (handled outside this loader):
//   B1-S1, S2, S3, S6-S15 (gated on module split, vendor research, judgment,
//   missing target data_objects, missing regulation rows, Rule #20, etc.).
//
// Idempotent on (data_object_id, related_data_object_id, relationship_verb).
// Run from project root:
//   bun run c:/dev/domain-map/.tmp_deploy/fix_fleet_maint_b1_technical_2026_05_31.ts

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
// FLEET-MAINT data_object ids (verified live before authoring this loader)
// ============================================================

const D = {
  vehicle_work_orders: 379,                 // FLEET-MAINT master
  preventive_maintenance_schedules: 380,    // FLEET-MAINT master
  vehicle_parts_inventory: 702,             // FLEET-MAINT master
  maintenance_defects: 703,                 // FLEET-MAINT master
  users: 748,                               // platform_builtin
};

type Rel = {
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

// B1-S4: intra-domain relationships (R1-R4 from audit table).
// R5 (defects triggers_revision PM_schedules, many_to_one) deferred: enum mismatch.
const intraDomain: Rel[] = [
  {
    // R1: PM schedule -> work order (PM execution generates the work order)
    source: D.preventive_maintenance_schedules, source_name: "preventive_maintenance_schedules",
    related: D.vehicle_work_orders, related_name: "vehicle_work_orders",
    verb: "generates", inverse_verb: "generated_by",
    relationship_type: "one_to_many", relationship_kind: "reference",
    is_required: false, owner_side: "source",
  },
  {
    // R2: defect -> work order (defect routes to a repair work order)
    source: D.maintenance_defects, source_name: "maintenance_defects",
    related: D.vehicle_work_orders, related_name: "vehicle_work_orders",
    verb: "routes_to", inverse_verb: "resolves",
    relationship_type: "one_to_many", relationship_kind: "reference",
    is_required: false, owner_side: "target",
  },
  {
    // R3: work order -> parts (work order consumes parts off inventory)
    source: D.vehicle_work_orders, source_name: "vehicle_work_orders",
    related: D.vehicle_parts_inventory, related_name: "vehicle_parts_inventory",
    verb: "consumes", inverse_verb: "consumed_by",
    relationship_type: "many_to_many", relationship_kind: "association",
    is_required: false, owner_side: "source",
  },
  {
    // R4: PM schedule -> parts (PM template specifies the parts it needs)
    source: D.preventive_maintenance_schedules, source_name: "preventive_maintenance_schedules",
    related: D.vehicle_parts_inventory, related_name: "vehicle_parts_inventory",
    verb: "requires", inverse_verb: "required_by",
    relationship_type: "many_to_many", relationship_kind: "association",
    is_required: false, owner_side: "source",
  },
];

// B1-S5: users edges per Rule #10 (4 audit-pre-specified rows).
// Per audit U1-U4. Source=master (target=users) chosen so the user appears as
// counterpart actor on each FLEET-MAINT master, matching the audit's verbs.
const usersEdges: Rel[] = [
  {
    // U1: work order -> users (mechanic assigned to the job)
    source: D.vehicle_work_orders, source_name: "vehicle_work_orders",
    related: D.users, related_name: "users",
    verb: "assigned_to", inverse_verb: "performs",
    relationship_type: "many_to_many", relationship_kind: "reference",
    is_required: false, owner_side: "source",
  },
  {
    // U2: defect -> users (driver or inspector who reported the defect)
    source: D.maintenance_defects, source_name: "maintenance_defects",
    related: D.users, related_name: "users",
    verb: "reported_by", inverse_verb: "reports",
    relationship_type: "one_to_many", relationship_kind: "reference",
    is_required: true, owner_side: "target",
  },
  {
    // U3: parts inventory -> users (parts manager who last adjusted stock)
    source: D.vehicle_parts_inventory, source_name: "vehicle_parts_inventory",
    related: D.users, related_name: "users",
    verb: "adjusted_by", inverse_verb: "adjusts",
    relationship_type: "one_to_many", relationship_kind: "reference",
    is_required: false, owner_side: "target",
  },
  {
    // U4: PM schedule -> users (planner who authored the schedule)
    source: D.preventive_maintenance_schedules, source_name: "preventive_maintenance_schedules",
    related: D.users, related_name: "users",
    verb: "authored_by", inverse_verb: "authors",
    relationship_type: "one_to_many", relationship_kind: "reference",
    is_required: true, owner_side: "target",
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
  console.log("FLEET-MAINT B1 technical fixes (B1-S4 intra-domain + B1-S5 users edges)");
  console.log("");
  let inserted = 0;
  let skipped = 0;

  console.log("B1-S4: intra-domain relationships");
  for (const r of intraDomain) {
    const { skipped: s } = await ensureRel(r);
    if (s) {
      skipped++;
      console.log(`  SKIP   ${r.source_name} ${r.verb} ${r.related_name}`);
    } else {
      inserted++;
      console.log(`  INSERT ${r.source_name} ${r.verb} ${r.related_name}`);
    }
  }

  console.log("");
  console.log("B1-S5: users edges (Rule #10)");
  for (const r of usersEdges) {
    const { skipped: s } = await ensureRel(r);
    if (s) {
      skipped++;
      console.log(`  SKIP   ${r.source_name} ${r.verb} ${r.related_name}`);
    } else {
      inserted++;
      console.log(`  INSERT ${r.source_name} ${r.verb} ${r.related_name}`);
    }
  }

  const total = intraDomain.length + usersEdges.length;
  console.log("");
  console.log(`Done: ${inserted} inserted, ${skipped} already present (${total} total).`);
}

await main();
