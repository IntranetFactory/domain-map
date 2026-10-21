#!/usr/bin/env bun
// Idempotent modularization loader for DAIRY-MGMT (domain_id=156).
// Scope: domain_modules + domain_module_capabilities + domain_module_data_objects ONLY.
// Reuses existing capabilities (461-466) and existing data_objects (499-506 masters, 206 consumer).
// Creates NO new data_objects / capabilities / lifecycle states / skills / tools / handoffs / relationships.
// Safe to re-run: every write checks the natural key first.

type Json = any;

const DOMAIN_ID = 156;
const INDUSTRY_ID = 26; // industries: Dairy (NAICS 1121, child of Animal Production and Aquaculture)

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

// ---- Module specs ----------------------------------------------------------

type ModuleSpec = {
  domain_module_code: string;
  domain_module_name: string;
  description: string;
  capability_ids: number[];
  data_objects: { data_object_id: number; role: string; necessity: string }[];
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_code: "DAIRY-MGMT-HERD",
    domain_module_name: "Herd and Animal Lifecycle",
    description:
      "Individual-cow system of record spanning the full animal lifecycle (calving, lactation cycles, dry-off, culling), reproduction and breeding history, and herd-health events with treatment and withdrawal tracking. Holds the per-animal master and its lactation, breeding, and health event records.",
    capability_ids: [461, 464, 466], // COW-LIFECYCLE, REPRODUCTION, HERD-HEALTH
    data_objects: [
      { data_object_id: 499, role: "master", necessity: "required" }, // dairy_cows
      { data_object_id: 500, role: "master", necessity: "required" }, // lactation_records
      { data_object_id: 503, role: "master", necessity: "required" }, // breeding_events
      { data_object_id: 504, role: "master", necessity: "required" }, // cow_health_events
      { data_object_id: 206, role: "consumer", necessity: "required" }, // suppliers (mastered in SUP-LIFE / MDM)
    ],
  },
  {
    domain_module_code: "DAIRY-MGMT-PARLOR",
    domain_module_name: "Parlor and Milking Operations",
    description:
      "Parlor and automatic-milking-system integration: captures per-cow per-session milking telemetry (yield, conductivity, duration) and aggregates it into outbound bulk-tank shipments to processors and cooperatives.",
    capability_ids: [462], // PARLOR-INTEGRATION
    data_objects: [
      { data_object_id: 501, role: "master", necessity: "required" }, // milkings
      { data_object_id: 506, role: "master", necessity: "required" }, // bulk_milk_shipments
    ],
  },
  {
    domain_module_code: "DAIRY-MGMT-MILK-QUALITY",
    domain_module_name: "Milk Quality Testing",
    description:
      "Milk-quality testing and records: somatic cell count, bacterial counts, butterfat and protein components, and antibiotic-residue screening at the bulk-tank and per-cow level, driving drug-residue and mastitis-management workflows.",
    capability_ids: [463], // MILK-QUALITY
    data_objects: [
      { data_object_id: 502, role: "master", necessity: "required" }, // milk_quality_tests
    ],
  },
  {
    domain_module_code: "DAIRY-MGMT-FEED",
    domain_module_name: "Feed Rationing and TMR",
    description:
      "Feed rationing and total-mixed-ration management: per-group ration formulation, feed inventory and shrink tracking, feed-mixer integration, and income-over-feed-cost computation per cow group.",
    capability_ids: [465], // FEED-RATIONING
    data_objects: [
      { data_object_id: 505, role: "master", necessity: "required" }, // feed_rations
    ],
  },
];

// ---- Phase 1: domain_modules ----------------------------------------------

async function upsertModules(): Promise<Map<string, number>> {
  const codes = MODULES.map((m) => m.domain_module_code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const existingCodes = new Set(existing.map((r: any) => r.domain_module_code));
  const toInsert = MODULES.filter((m) => !existingCodes.has(m.domain_module_code)).map((m) => ({
    domain_module_name: m.domain_module_name,
    domain_module_code: m.domain_module_code,
    description: m.description,
    domain_id: DOMAIN_ID,
    industry_id: INDUSTRY_ID,
    module_kind: "full",
    // record_status OMITTED (DB default 'new'); catalog_tagline / catalog_description OMITTED.
  }));
  if (toInsert.length) {
    await semantius("POST", "/domain_modules", toInsert);
    console.log(`  +${toInsert.length} domain_modules: ${toInsert.map((r) => r.domain_module_code).join(", ")}`);
  } else {
    console.log("  domain_modules: all present, no insert");
  }
  // Re-read for the code -> id map (never hard-code ids).
  const all = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  return map;
}

// ---- Phase 2: domain_module_capabilities ----------------------------------

async function upsertCapabilities(moduleId: number, capIds: number[]): Promise<void> {
  if (!capIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capIds.join(",")})&select=capability_id`,
  );
  const existingIds = new Set(existing.map((r: any) => r.capability_id));
  const toInsert = capIds
    .filter((id) => !existingIds.has(id))
    .map((capability_id) => ({ domain_module_id: moduleId, capability_id }));
  // notes + auto label OMITTED (R15).
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`    +${toInsert.length} capability links on module ${moduleId}`);
  }
}

// ---- Phase 3: domain_module_data_objects ----------------------------------

async function upsertDMDO(
  moduleId: number,
  rows: { data_object_id: number; role: string; necessity: string }[],
): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map((r) => r.data_object_id);
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`,
  );
  const existingIds = new Set(existing.map((r: any) => r.data_object_id));
  const toInsert = rows
    .filter((r) => !existingIds.has(r.data_object_id))
    .map((r) => ({ domain_module_id: moduleId, data_object_id: r.data_object_id, role: r.role, necessity: r.necessity }));
  // notes + auto label OMITTED (R15).
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`    +${toInsert.length} DMDO rows on module ${moduleId}`);
  }
}

// ---- Main ------------------------------------------------------------------

async function main() {
  console.log("=== Modularize DAIRY-MGMT (domain_id=156) ===");
  const idMap = await upsertModules();

  for (const m of MODULES) {
    const moduleId = idMap.get(m.domain_module_code);
    if (!moduleId) throw new Error(`module id not found after upsert: ${m.domain_module_code}`);
    console.log(`  ${m.domain_module_code} -> id ${moduleId}`);
    await upsertCapabilities(moduleId, m.capability_ids);
    await upsertDMDO(moduleId, m.data_objects);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
