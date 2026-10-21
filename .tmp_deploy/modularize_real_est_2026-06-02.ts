#!/usr/bin/env bun
// Idempotent modularization loader for REAL-EST (Real Estate and Workplace Management, domains.id = 141).
// Creates 4 full domain_modules, links 7 capabilities, assigns 11 existing data_objects
// at their existing role + necessity. Reuses existing entities only; creates no new
// data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships.
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

const DOMAIN_ID = 141;

// --- Module definitions ---------------------------------------------------
type ModuleDef = {
  domain_module_name: string;
  domain_module_code: string;
  description: string;
  capability_ids: number[];
  // data_objects: id -> { role, necessity } at the existing in-domain role + necessity
  data_objects: { data_object_id: number; role: string; necessity: string }[];
};

const MODULES: ModuleDef[] = [
  {
    domain_module_name: "Property and Lease Portfolio",
    domain_module_code: "REAL-EST-PORTFOLIO",
    description:
      "Owned and leased property portfolio with building records, floor plans, and lease agreements. Covers acquisition and disposal lifecycle plus lease dates, renewals, rent calculations, and ASC 842 / IFRS 16 amortization.",
    capability_ids: [373, 375], // REAL-PROPERTY-MGMT, REAL-LEASE-MGMT
    data_objects: [
      { data_object_id: 344, role: "master", necessity: "required" }, // real_estate_properties
      { data_object_id: 345, role: "master", necessity: "required" }, // property_leases
      { data_object_id: 346, role: "master", necessity: "required" }, // floor_plans
      { data_object_id: 795, role: "contributor", necessity: "optional" }, // locations
      { data_object_id: 76, role: "consumer", necessity: "required" }, // configuration_items
    ],
  },
  {
    domain_module_name: "Space Optimization and Occupancy",
    domain_module_code: "REAL-EST-SPACE-OPS",
    description:
      "Desk, room, and parking allocation with real-time occupancy tracking. Drives utilization heatmaps, badge-in rates, hybrid-work patterns, and occupancy forecasting across the workplace.",
    capability_ids: [374, 377], // REAL-SPACE-OPTIM, REAL-OCCUPANCY-ANALYTICS
    data_objects: [
      { data_object_id: 347, role: "master", necessity: "required" }, // property_spaces
      { data_object_id: 348, role: "master", necessity: "required" }, // occupancy_records
      { data_object_id: 31, role: "consumer", necessity: "required" }, // employees
    ],
  },
  {
    domain_module_name: "Facility Maintenance and Utilities",
    domain_module_code: "REAL-EST-FACILITY-OPS",
    description:
      "Preventive and corrective maintenance on buildings and workplace assets, plus electricity, water, gas, and waste metering. Tracks technician dispatch, asset history, cost allocation, and emissions activity data.",
    capability_ids: [376, 378], // REAL-MAINTENANCE, REAL-UTILITY-TRACKING
    data_objects: [
      { data_object_id: 349, role: "master", necessity: "required" }, // facility_work_orders
      { data_object_id: 350, role: "master", necessity: "required" }, // utility_meter_readings
    ],
  },
  {
    domain_module_name: "Capital Projects",
    domain_module_code: "REAL-EST-CAPITAL-PROJECTS",
    description:
      "Building improvements, renovations, and expansions. Plans budgets, tracks timelines, and records completion status for capital work on the portfolio.",
    capability_ids: [379], // REAL-CAPITAL-PROJECTS
    data_objects: [
      { data_object_id: 351, role: "master", necessity: "required" }, // capital_projects
    ],
  },
];

// --- Master pre-check (catalog-wide M7) ----------------------------------
async function precheckMasters(): Promise<Set<number>> {
  // Collect intended master data_object_ids
  const intendedMasters = MODULES.flatMap(m =>
    m.data_objects.filter(d => d.role === "master").map(d => d.data_object_id)
  );
  if (!intendedMasters.length) return new Set();
  const rows = await semantius(
    "GET",
    `/domain_module_data_objects?data_object_id=in.(${intendedMasters.join(",")})&role=eq.master&select=domain_module_id,data_object_id`
  );
  // Exclude rows belonging to this domain's modules (self) so re-runs do not demote.
  const ourModuleIds = new Set<number>();
  const ours = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id`
  );
  for (const r of ours ?? []) ourModuleIds.add(r.id);
  const claimedElsewhere = new Set<number>();
  for (const r of rows ?? []) {
    if (!ourModuleIds.has(r.domain_module_id)) claimedElsewhere.add(r.data_object_id);
  }
  return claimedElsewhere;
}

// --- Module upsert --------------------------------------------------------
async function upsertModules(): Promise<Map<string, number>> {
  const codes = MODULES.map(m => m.domain_module_code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`
  );
  const existingCodes = new Set((existing ?? []).map((r: any) => r.domain_module_code));
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
    console.log(`  +${toInsert.length} domain_modules: ${toInsert.map(m => m.domain_module_code).join(", ")}`);
  } else {
    console.log("  domain_modules already present; no inserts.");
  }
  // Re-read for code -> id map
  const all = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`
  );
  const map = new Map<string, number>();
  for (const r of all ?? []) map.set(r.domain_module_code, r.id);
  for (const code of codes) {
    if (!map.has(code)) throw new Error(`module not found after upsert: ${code}`);
  }
  return map;
}

async function upsertCapabilities(moduleId: number, capabilityIds: number[]): Promise<void> {
  if (!capabilityIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capabilityIds.join(",")})&select=capability_id`
  );
  const existingIds = new Set((existing ?? []).map((r: any) => r.capability_id));
  const toInsert = capabilityIds
    .filter(id => !existingIds.has(id))
    .map(id => ({ domain_module_id: moduleId, capability_id: id }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`  +${toInsert.length} domain_module_capabilities on module ${moduleId}`);
  }
}

async function upsertDMDO(
  moduleId: number,
  rows: { data_object_id: number; role: string; necessity: string }[]
): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map(r => r.data_object_id);
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`
  );
  const existingIds = new Set((existing ?? []).map((r: any) => r.data_object_id));
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
    console.log(`  +${toInsert.length} domain_module_data_objects on module ${moduleId}`);
  }
}

async function main() {
  console.log("=== Modularize REAL-EST (domain 141) ===");

  // M7 catalog-wide master pre-check before any writes.
  const claimedElsewhere = await precheckMasters();
  if (claimedElsewhere.size) {
    console.log(
      `  PRE-CHECK: masters claimed elsewhere (will NOT master here): ${[...claimedElsewhere].join(", ")}`
    );
    // Demote any intended master that is already mastered in another module catalog-wide.
    for (const m of MODULES) {
      for (const d of m.data_objects) {
        if (d.role === "master" && claimedElsewhere.has(d.data_object_id)) {
          d.role = "embedded_master";
          console.log(`    demoting data_object ${d.data_object_id} to embedded_master in ${m.domain_module_code}`);
        }
      }
    }
  } else {
    console.log("  PRE-CHECK: no intended master is claimed elsewhere; all master assignments stand.");
  }

  const moduleMap = await upsertModules();

  for (const m of MODULES) {
    const moduleId = moduleMap.get(m.domain_module_code)!;
    console.log(`\n--- ${m.domain_module_code} (id ${moduleId}) ---`);
    await upsertCapabilities(moduleId, m.capability_ids);
    await upsertDMDO(moduleId, m.data_objects);
  }

  console.log("\nDone.");
}

main().catch(e => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
