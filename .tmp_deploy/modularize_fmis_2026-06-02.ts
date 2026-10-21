#!/usr/bin/env bun
// Idempotent modularization loader for the FMIS domain (Farm Management Information System, domains.id = 154).
// Creates 4 full domain_modules, links the 8 existing capabilities, and assigns the 8 existing master
// data_objects (plus a few in-domain consumer rows) at their existing role + necessity.
// Reuses existing entities only. Safe to re-run.

type Json = any;

const DOMAIN_ID = 154;
const INDUSTRY_ID = 22; // Crop Production (NAICS 111)

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

// ------------------------------------------------------------
// Module specs
// ------------------------------------------------------------

type ModuleSpec = {
  domain_module_name: string;
  domain_module_code: string;
  description: string;
  capability_ids: number[];
  dmdo: { data_object_id: number; role: string; necessity: string }[];
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_name: "Field and Crop Planning",
    domain_module_code: "FMIS-FIELD-CROP-PLANNING",
    description:
      "GIS field and boundary mapping with seasonal crop planning and multi-year rotation modelling. Defines the spatial units of farm operations and the seasonal plan layered onto each field.",
    capability_ids: [447, 448],
    dmdo: [
      { data_object_id: 486, role: "master", necessity: "required" }, // farm_fields
      { data_object_id: 487, role: "master", necessity: "required" }, // crop_plans
    ],
  },
  {
    domain_module_name: "Field Operations Records",
    domain_module_code: "FMIS-FIELD-OPS-RECORDS",
    description:
      "Per-pass operational record-keeping across the season: planting events, chemical and fertilizer applications, and harvest yield capture. The compliance and audit trail of what happened in each field.",
    capability_ids: [449, 451],
    dmdo: [
      { data_object_id: 488, role: "master", necessity: "required" }, // planting_records
      { data_object_id: 489, role: "master", necessity: "required" }, // field_applications
      { data_object_id: 490, role: "master", necessity: "required" }, // harvest_records
      { data_object_id: 486, role: "consumer", necessity: "required" }, // farm_fields (records are per-field)
      { data_object_id: 487, role: "consumer", necessity: "optional" }, // crop_plans (records execute the plan)
    ],
  },
  {
    domain_module_name: "Precision Agriculture",
    domain_module_code: "FMIS-PRECISION-AG",
    description:
      "Site-specific prescription authoring and machinery telemetry integration. Generates variable-rate application maps from yield zones and soil tests and ingests normalized equipment telemetry over CAN-bus, ISOBUS, and OEM machinery APIs.",
    capability_ids: [452, 453],
    dmdo: [
      { data_object_id: 492, role: "master", necessity: "required" }, // variable_rate_prescriptions
      { data_object_id: 493, role: "master", necessity: "required" }, // machinery_telemetry_records
      { data_object_id: 486, role: "consumer", necessity: "required" }, // farm_fields (prescriptions are per-field)
    ],
  },
  {
    domain_module_name: "Input Inventory and Yield Analytics",
    domain_module_code: "FMIS-INPUT-INVENTORY-ANALYTICS",
    description:
      "Ag-input stock tracking reconciled against application and purchase records, paired with multi-season yield and field-performance analytics for profitability-per-zone and return-on-input analysis.",
    capability_ids: [450, 454],
    dmdo: [
      { data_object_id: 491, role: "master", necessity: "required" }, // ag_input_inventory
      { data_object_id: 490, role: "consumer", necessity: "required" }, // harvest_records (yield analytics source)
      { data_object_id: 489, role: "consumer", necessity: "required" }, // field_applications (input spend reconciliation)
      { data_object_id: 487, role: "consumer", necessity: "optional" }, // crop_plans (budget projection context)
    ],
  },
];

// ------------------------------------------------------------
// Idempotent helpers
// ------------------------------------------------------------

async function upsertModules(): Promise<Map<string, number>> {
  const codes = MODULES.map((m) => m.domain_module_code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`
  );
  const existingCodes = new Set(existing.map((r: any) => r.domain_module_code));
  const toInsert = MODULES.filter((m) => !existingCodes.has(m.domain_module_code)).map((m) => ({
    domain_module_name: m.domain_module_name,
    domain_module_code: m.domain_module_code,
    description: m.description,
    domain_id: DOMAIN_ID,
    module_kind: "full",
    industry_id: INDUSTRY_ID,
  }));
  if (toInsert.length) {
    await semantius("POST", "/domain_modules", toInsert);
    console.log(`  +${toInsert.length} domain_modules: ${toInsert.map((m) => m.domain_module_code).join(", ")}`);
  } else {
    console.log("  modules already present");
  }
  const all = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  return map;
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
    .map((id) => ({ domain_module_id: moduleId, capability_id: id }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`  +${toInsert.length} DMC rows on module ${moduleId}`);
  }
}

async function upsertDMDO(
  moduleId: number,
  rows: { data_object_id: number; role: string; necessity: string }[]
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
    .map((r) => ({ domain_module_id: moduleId, data_object_id: r.data_object_id, role: r.role, necessity: r.necessity }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`  +${toInsert.length} DMDO rows on module ${moduleId}`);
  }
}

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------

async function main() {
  console.log("=== Modularize FMIS (domain 154) ===");
  const idMap = await upsertModules();

  for (const m of MODULES) {
    const moduleId = idMap.get(m.domain_module_code);
    if (!moduleId) throw new Error(`module id not found after insert: ${m.domain_module_code}`);
    console.log(`\n--- ${m.domain_module_code} (id ${moduleId}) ---`);
    await upsertCapabilities(moduleId, m.capability_ids);
    await upsertDMDO(moduleId, m.dmdo);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
