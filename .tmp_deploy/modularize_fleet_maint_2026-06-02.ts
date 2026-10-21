#!/usr/bin/env bun
// Idempotent modularization loader for FLEET-MAINT (domain id 149).
// Scope: domain_modules + capability links + data_object assignment (reuse existing entities).
// Does NOT create data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships.
// Safe to re-run.

type Json = any;

async function semantius(method: string, path: string, body?: Json): Promise<Json> {
  const arg: Json = { method, path };
  if (body !== undefined) arg.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(arg)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius ${method} ${path} failed: ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

const DOMAIN_ID = 149;

// ---- Module specs (full modules, code prefixed FLEET-MAINT-) ----
type ModuleSpec = {
  domain_module_code: string;
  domain_module_name: string;
  description: string;
  capability_ids: number[];
  // data_object assignments: [data_object_id, role, necessity]
  data_objects: Array<{ data_object_id: number; role: string; necessity: string }>;
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_code: "FLEET-MAINT-WORK-ORDER",
    domain_module_name: "Vehicle Work Order Management",
    description:
      "Shop-floor execution module: work-order intake from inspection defect, telematics fault, or driver report; task-line composition with labor and parts; in-shop versus out-of-shop routing; mechanic and shop assignment; defect triage; completion sign-off and post-repair quality check.",
    capability_ids: [417, 419, 421], // FM-WORK-ORDER, FM-MECHANIC-MGMT, FM-INSPECTION-DVIR
    data_objects: [
      { data_object_id: 379, role: "master", necessity: "required" }, // vehicle_work_orders
      { data_object_id: 703, role: "master", necessity: "required" }, // maintenance_defects
      { data_object_id: 370, role: "consumer", necessity: "required" }, // fleet_vehicles (FLEET-MGMT-mastered)
      { data_object_id: 374, role: "consumer", necessity: "required" }, // vehicle_inspections (FLEET-MGMT-mastered)
      { data_object_id: 34, role: "embedded_master", necessity: "optional" }, // org_units (HCM-mastered)
      { data_object_id: 795, role: "embedded_master", necessity: "required" }, // locations
    ],
  },
  {
    domain_module_code: "FLEET-MAINT-PM",
    domain_module_name: "Preventive Maintenance Scheduling",
    description:
      "Planning module: PM-schedule definition per vehicle class with triggers on mileage, engine hours, calendar time, or DTC codes; auto-generation of work orders ahead of due dates; deferred-maintenance tracking.",
    capability_ids: [416], // FM-PM-SCHEDULING
    data_objects: [
      { data_object_id: 380, role: "master", necessity: "required" }, // preventive_maintenance_schedules
      { data_object_id: 370, role: "consumer", necessity: "required" }, // fleet_vehicles (FLEET-MGMT-mastered)
    ],
  },
  {
    domain_module_code: "FLEET-MAINT-PARTS",
    domain_module_name: "Parts Inventory and Warranty",
    description:
      "Parts and coverage module: parts master with cross-reference to vehicle make, model, and year; on-hand stock and reorder thresholds per location; parts consumption against work orders; OEM-warranty coverage tracking per VIN; eligible-claim identification on repair events; recall notification ingestion and recall-completion tracking across the fleet.",
    capability_ids: [418, 420], // FM-PARTS-INV, FM-WARRANTY
    data_objects: [
      { data_object_id: 702, role: "master", necessity: "required" }, // vehicle_parts_inventory
      { data_object_id: 795, role: "embedded_master", necessity: "required" }, // locations
    ],
  },
];

async function upsertModule(spec: ModuleSpec): Promise<number> {
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_module_code=eq.${spec.domain_module_code}&select=id`
  );
  if (existing?.length) {
    console.log(`  module exists: ${spec.domain_module_code} (id ${existing[0].id})`);
    return existing[0].id;
  }
  await semantius("POST", "/domain_modules", [
    {
      domain_module_name: spec.domain_module_name,
      domain_module_code: spec.domain_module_code,
      description: spec.description,
      domain_id: DOMAIN_ID,
      module_kind: "full",
    },
  ]);
  const created = await semantius(
    "GET",
    `/domain_modules?domain_module_code=eq.${spec.domain_module_code}&select=id`
  );
  if (!created?.length) throw new Error(`module not found after insert: ${spec.domain_module_code}`);
  console.log(`  +module ${spec.domain_module_code} (id ${created[0].id})`);
  return created[0].id;
}

async function upsertCapabilities(moduleId: number, capabilityIds: number[]): Promise<void> {
  if (!capabilityIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capabilityIds.join(",")})&select=capability_id`
  );
  const existingIds = new Set(existing.map((r: any) => r.capability_id));
  const toInsert = capabilityIds
    .filter((id) => !existingIds.has(id))
    .map((capability_id) => ({ domain_module_id: moduleId, capability_id }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`  +${toInsert.length} capability links on module ${moduleId}`);
  }
}

async function upsertDataObjects(
  moduleId: number,
  rows: Array<{ data_object_id: number; role: string; necessity: string }>
): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map((r) => r.data_object_id);
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`
  );
  const existingIds = new Set(existing.map((r: any) => r.data_object_id));
  const toInsert = rows
    .filter((r) => !existingIds.has(r.data_object_id))
    .map((r) => ({
      domain_module_id: moduleId,
      data_object_id: r.data_object_id,
      role: r.role,
      necessity: r.necessity,
    }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`  +${toInsert.length} DMDO rows on module ${moduleId}`);
  }
}

async function main() {
  console.log("=== Modularize FLEET-MAINT (domain 149) ===");
  for (const spec of MODULES) {
    console.log(`\n--- ${spec.domain_module_code} ---`);
    const moduleId = await upsertModule(spec);
    await upsertCapabilities(moduleId, spec.capability_ids);
    await upsertDataObjects(moduleId, spec.data_objects);
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
