#!/usr/bin/env bun
// Modularize FLEET-MGMT (domain id 147): create full domain_modules, link capabilities, assign data_objects.
// Scope: modules + entity assignment ONLY. No new data_objects/capabilities/lifecycle/skills/relationships.
// Idempotent: re-read by natural key before every insert. Safe to re-run.

type Json = any;

const DOMAIN_ID = 147;

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

// --- Module definitions (module_kind: "full") ----------------------------------
type ModuleSpec = {
  domain_module_code: string;
  domain_module_name: string;
  description: string;
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_code: "FLEET-MGMT-VEHICLE-LIFECYCLE",
    domain_module_name: "Vehicle Lifecycle",
    description:
      "Vehicle-as-asset module: maintains the vehicle master from acquisition through in-service, reassignment, retirement and disposal, and runs utilization analytics (productive vs idle vs deadhead, cost-per-mile and cost-per-hour benchmarking, right-sizing).",
  },
  {
    domain_module_code: "FLEET-MGMT-DRIVER-OPS",
    domain_module_name: "Driver Operations",
    description:
      "Driver-and-operations module: maintains driver master records (license, medical card, training, HOS status), pre/post-trip inspection reports, and the time-bound assignment of vehicles to drivers, routes and jobs with daily dispatch boards and capacity matching.",
  },
  {
    domain_module_code: "FLEET-MGMT-FUEL-COMPLIANCE",
    domain_module_name: "Fuel and Compliance",
    description:
      "Fuel-cost and regulatory-rollup module: ingests fuel-card and charging transactions, detects fueling exceptions and mpg trends, and produces DOT registration, IFTA fuel-tax, IRP apportioned registration and audit-evidence reporting.",
  },
];

// --- Capability -> module placement (every capability realized by exactly one module) ---
// 404 FLEET-VEHICLE-INVENTORY, 405 FLEET-DRIVER-MGMT, 406 FLEET-FUEL-MGMT,
// 407 FLEET-DISPATCH, 408 FLEET-UTILIZATION, 409 FLEET-COMPLIANCE
const CAP_PLACEMENT: Record<string, number[]> = {
  "FLEET-MGMT-VEHICLE-LIFECYCLE": [404, 408],
  "FLEET-MGMT-DRIVER-OPS": [405, 407],
  "FLEET-MGMT-FUEL-COMPLIANCE": [406, 409],
};

// --- data_object -> module placement (preserve existing role + necessity) ---
// Masters (role=master, necessity=required): single-master rule (M7) honored below.
//   370 fleet_vehicles      -> VEHICLE-LIFECYCLE
//   371 fleet_drivers       -> DRIVER-OPS
//   372 fuel_transactions   -> FUEL-COMPLIANCE
//   373 fleet_assignments   -> DRIVER-OPS
//   374 vehicle_inspections -> DRIVER-OPS
// Contributor (role=contributor, necessity=required):
//   31  employees           -> DRIVER-OPS (employed-driver linkage)
type DMDOSpec = { data_object_id: number; role: string; necessity: string };
const DO_PLACEMENT: Record<string, DMDOSpec[]> = {
  "FLEET-MGMT-VEHICLE-LIFECYCLE": [
    { data_object_id: 370, role: "master", necessity: "required" },
  ],
  "FLEET-MGMT-DRIVER-OPS": [
    { data_object_id: 371, role: "master", necessity: "required" },
    { data_object_id: 373, role: "master", necessity: "required" },
    { data_object_id: 374, role: "master", necessity: "required" },
    { data_object_id: 31, role: "contributor", necessity: "required" },
  ],
  "FLEET-MGMT-FUEL-COMPLIANCE": [
    { data_object_id: 372, role: "master", necessity: "required" },
  ],
};

async function upsertModules(): Promise<void> {
  const codes = MODULES.map(m => m.domain_module_code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=domain_module_code`,
  );
  const existingCodes = new Set(existing.map((r: any) => r.domain_module_code));
  const toInsert = MODULES
    .filter(m => !existingCodes.has(m.domain_module_code))
    .map(m => ({
      domain_module_name: m.domain_module_name,
      domain_module_code: m.domain_module_code,
      description: m.description,
      domain_id: DOMAIN_ID,
      module_kind: "full",
    }));
  if (toInsert.length) {
    await semantius("POST", "/domain_modules", toInsert);
    console.log(`  +${toInsert.length} domain_modules: ${toInsert.map(r => r.domain_module_code).join(", ")}`);
  } else {
    console.log("  domain_modules already present; none inserted");
  }
}

async function buildCodeToId(): Promise<Map<string, number>> {
  const codes = MODULES.map(m => m.domain_module_code);
  const rows = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.domain_module_code, r.id);
  for (const m of MODULES) {
    if (!map.has(m.domain_module_code)) throw new Error(`module id missing after insert: ${m.domain_module_code}`);
  }
  return map;
}

async function upsertCapabilities(moduleId: number, capabilityIds: number[]): Promise<void> {
  if (!capabilityIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capabilityIds.join(",")})&select=capability_id`,
  );
  const existingIds = new Set(existing.map((r: any) => r.capability_id));
  const toInsert = capabilityIds
    .filter(id => !existingIds.has(id))
    .map(id => ({ domain_module_id: moduleId, capability_id: id }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`  +${toInsert.length} DMC rows on module ${moduleId}`);
  }
}

async function upsertDMDO(moduleId: number, rows: DMDOSpec[]): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map(r => r.data_object_id);
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`,
  );
  const existingIds = new Set(existing.map((r: any) => r.data_object_id));
  const toInsert = rows
    .filter(r => !existingIds.has(r.data_object_id))
    .map(r => ({
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
  console.log("=== FLEET-MGMT modularization (domain 147) ===");

  console.log("Step A: upsert domain_modules");
  await upsertModules();

  console.log("Step B: re-read code->id map");
  const codeToId = await buildCodeToId();
  for (const [code, id] of codeToId) console.log(`  ${code} = ${id}`);

  console.log("Step C: link capabilities + assign data_objects");
  for (const m of MODULES) {
    const id = codeToId.get(m.domain_module_code)!;
    console.log(`\n-- ${m.domain_module_code} (id ${id})`);
    await upsertCapabilities(id, CAP_PLACEMENT[m.domain_module_code]);
    await upsertDMDO(id, DO_PLACEMENT[m.domain_module_code]);
  }

  console.log("\nDone.");
}

main().catch(e => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
