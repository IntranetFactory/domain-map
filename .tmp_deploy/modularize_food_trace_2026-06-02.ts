#!/usr/bin/env bun
// Idempotent modularization loader for domain FOOD-TRACE (domains.id = 155).
// Creates 3 full domain_modules, links capabilities, assigns existing data_objects.
// Reuses existing entities only. Safe to re-run.
//
// Idempotency keys:
//   - domain_modules: domain_module_code
//   - domain_module_capabilities: (domain_module_id, capability_id)
//   - domain_module_data_objects: (domain_module_id, data_object_id)

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

const DOMAIN_ID = 155;
const INDUSTRY_ID = 24; // Food and Beverage Manufacturing (NAICS 311-312)

type ModuleSpec = {
  domain_module_name: string;
  domain_module_code: string;
  description: string;
  capability_ids: number[];
  data_objects: { data_object_id: number; role: string; necessity: string }[];
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_name: "Traceability Events and Lot Genealogy",
    domain_module_code: "FOOD-TRACE-TRACEABILITY-EVENTS",
    description:
      "Capture FSMA-204 critical tracking events and their key data elements against traceability lot codes, and traverse forward and backward lot genealogy from raw-material lots through transformation to finished SKUs. Generates the FDA-sortable KDE response used for 24-hour traceback.",
    capability_ids: [455, 456, 459], // CTE-CAPTURE, KDE-REPORTING, LOT-GENEALOGY
    data_objects: [
      { data_object_id: 494, role: "master", necessity: "required" },   // traceability_lots
      { data_object_id: 495, role: "master", necessity: "required" },   // critical_tracking_events
      { data_object_id: 496, role: "master", necessity: "required" },   // key_data_elements
      { data_object_id: 490, role: "consumer", necessity: "required" }, // harvest_records
      { data_object_id: 506, role: "consumer", necessity: "required" }, // bulk_milk_shipments
    ],
  },
  {
    domain_module_name: "Recall Execution",
    domain_module_code: "FOOD-TRACE-RECALL-MGMT",
    description:
      "Initiate, track, and report on product recalls: identify affected lots from lot genealogy, notify downstream consignees, manage hold-and-segregate status, and file Reportable Food Registry submissions against the governing compliance obligations.",
    capability_ids: [458], // RECALL-EXECUTION
    data_objects: [
      { data_object_id: 497, role: "master", necessity: "required" },       // recall_events
      { data_object_id: 287, role: "contributor", necessity: "required" },  // compliance_obligations
    ],
  },
  {
    domain_module_name: "Supplier Documents and Provenance",
    domain_module_code: "FOOD-TRACE-SUPPLIER-PROVENANCE",
    description:
      "Centralized vault for supplier certifications (GFSI, organic, kosher, halal, allergen, insurance) with expiry and renewal tracking, plus verification and tamper-evident anchoring of origin and provenance claims surfaced to downstream stakeholders.",
    capability_ids: [457, 460], // SUPPLIER-DOCS, PROVENANCE-VERIF
    data_objects: [
      { data_object_id: 498, role: "master", necessity: "required" },   // supplier_certifications
      { data_object_id: 206, role: "consumer", necessity: "required" }, // suppliers
    ],
  },
];

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
    console.log("  domain_modules already present");
  }
  const all = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  return map;
}

async function upsertCapabilities(moduleId: number, capIds: number[]): Promise<void> {
  if (!capIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capIds.join(",")})&select=capability_id`
  );
  const existingIds = new Set(existing.map((r: any) => r.capability_id));
  const toInsert = capIds
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
  console.log("=== Modularize FOOD-TRACE (domain 155) ===");
  const moduleIds = await upsertModules();
  for (const m of MODULES) {
    const id = moduleIds.get(m.domain_module_code);
    if (!id) throw new Error(`module id not found after insert: ${m.domain_module_code}`);
    console.log(`\n--- ${m.domain_module_code} (id ${id}) ---`);
    await upsertCapabilities(id, m.capability_ids);
    await upsertDMDO(id, m.data_objects);
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
