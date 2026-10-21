#!/usr/bin/env bun
// Idempotent modularization loader for FSQM (Food Safety and Quality Management, domain_id=157).
// Creates 3 full domain_modules, links capabilities, assigns existing data_objects at their
// existing role+necessity. Reuses existing entities only. Safe to re-run.

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

const DOMAIN_ID = 157;
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
    domain_module_name: "Hazard Analysis and CCP Monitoring",
    domain_module_code: "FSQM-HACCP-CCP",
    description:
      "Author and maintain HACCP plans, define critical control points with critical limits, capture shift-frequency CCP monitoring readings, and drive deviation, hold-and-test, and corrective-action workflows from food-safety incidents.",
    capability_ids: [467, 468],
    data_objects: [
      { data_object_id: 507, role: "master", necessity: "required" }, // haccp_plans
      { data_object_id: 508, role: "master", necessity: "required" }, // critical_control_points
      { data_object_id: 509, role: "master", necessity: "required" }, // ccp_measurements
      { data_object_id: 510, role: "master", necessity: "required" }, // food_safety_incidents
      { data_object_id: 294, role: "contributor", necessity: "required" }, // audit_findings
    ],
  },
  {
    domain_module_name: "Allergen, Sanitation and Environmental Monitoring",
    domain_module_code: "FSQM-HYGIENE-CONTROL",
    description:
      "Run hygiene and contamination-control programs: per-product-line allergen maps and changeover validation, pathogen environmental-monitoring sampling plans with zone trend analytics, and per-shift sanitation completion and verification records.",
    capability_ids: [470, 471],
    data_objects: [
      { data_object_id: 511, role: "master", necessity: "required" }, // allergen_programs
      { data_object_id: 512, role: "master", necessity: "required" }, // environmental_monitoring_samples
      { data_object_id: 513, role: "master", necessity: "required" }, // sanitation_records
    ],
  },
  {
    domain_module_name: "Certification Audit and Supplier Risk",
    domain_module_code: "FSQM-AUDIT-SUPPLIER",
    description:
      "Prepare for GFSI-benchmarked certification audits, score and segment ingredient and packaging suppliers by safety and food-fraud risk, track supplier certifications and compliance obligations, and execute product recalls.",
    capability_ids: [469, 472],
    data_objects: [
      { data_object_id: 498, role: "contributor", necessity: "required" }, // supplier_certifications
      { data_object_id: 497, role: "contributor", necessity: "required" }, // recall_events
      { data_object_id: 287, role: "contributor", necessity: "required" }, // compliance_obligations
      { data_object_id: 206, role: "consumer", necessity: "required" }, // suppliers
    ],
  },
];

async function ensureModule(m: ModuleSpec): Promise<number> {
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_module_code=eq.${m.domain_module_code}&select=id`
  );
  if (existing?.length) return existing[0].id;
  await semantius("POST", "/domain_modules", {
    domain_module_name: m.domain_module_name,
    domain_module_code: m.domain_module_code,
    description: m.description,
    domain_id: DOMAIN_ID,
    module_kind: "full",
    industry_id: INDUSTRY_ID,
  });
  const created = await semantius(
    "GET",
    `/domain_modules?domain_module_code=eq.${m.domain_module_code}&select=id`
  );
  if (!created?.length) throw new Error(`module not found after insert: ${m.domain_module_code}`);
  console.log(`  +module ${m.domain_module_code} (id ${created[0].id})`);
  return created[0].id;
}

async function ensureCapabilities(moduleId: number, capIds: number[]): Promise<void> {
  if (!capIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capIds.join(",")})&select=capability_id`
  );
  const have = new Set(existing.map((r: any) => r.capability_id));
  const toInsert = capIds
    .filter((id) => !have.has(id))
    .map((capability_id) => ({ domain_module_id: moduleId, capability_id }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`  +${toInsert.length} capability links on module ${moduleId}`);
  }
}

async function ensureDataObjects(
  moduleId: number,
  rows: { data_object_id: number; role: string; necessity: string }[]
): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map((r) => r.data_object_id);
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`
  );
  const have = new Set(existing.map((r: any) => r.data_object_id));
  const toInsert = rows
    .filter((r) => !have.has(r.data_object_id))
    .map((r) => ({ domain_module_id: moduleId, ...r }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`  +${toInsert.length} DMDO rows on module ${moduleId}`);
  }
}

async function main() {
  // Master pre-check: ensure none of the masters are already mastered catalog-wide.
  const masterIds = MODULES.flatMap((m) =>
    m.data_objects.filter((d) => d.role === "master").map((d) => d.data_object_id)
  );
  const preMasters = await semantius(
    "GET",
    `/domain_module_data_objects?data_object_id=in.(${masterIds.join(",")})&role=eq.master&select=data_object_id,domain_module_id`
  );
  if (preMasters?.length) {
    console.log("  WARNING: pre-existing masters found, will not double-master:");
    for (const r of preMasters) console.log(`    data_object ${r.data_object_id} mastered in module ${r.domain_module_id}`);
  }

  for (const m of MODULES) {
    console.log(`\n=== ${m.domain_module_code} ===`);
    const moduleId = await ensureModule(m);
    await ensureCapabilities(moduleId, m.capability_ids);
    await ensureDataObjects(moduleId, m.data_objects);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
