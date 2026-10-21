#!/usr/bin/env bun
// Idempotent modularization loader for the BPA (Business Process Architecture) domain (domains.id = 136).
// Creates the 3 full domain_modules, links all 7 capabilities (domain_module_capabilities),
// and assigns the 4 existing data_objects (domain_module_data_objects) at preserved role+necessity.
//
// Scope: modules + entity assignment ONLY. Reuses existing entities. Creates NO new
// data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships.
//
// HARD RULES honored:
//   R0  - Semantius CLI only (no MCP).
//   R1  - record_status omitted on every insert (DB default 'new').
//   R15 - notes left empty (omitted) on every DMDO / DMC row.
//   R18 - no vendor/product names in module name/description.
//   M7  - business_capability_maps (248) is already mastered by APM-PORTFOLIO-REGISTRY (module 103).
//         It is NOT promoted to master here; BPA holds it as embedded_master (preserved single-master).
//
// Safe to re-run: every step re-checks live state by natural key before inserting.

type Json = any;

const DOMAIN_ID = 136;

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
// Module definitions
// ------------------------------------------------------------

type ModuleSpec = {
  code: string;
  name: string;
  description: string;
  capability_ids: number[];
  data_objects: { data_object_id: number; role: string; necessity: string }[];
};

const MODULES: ModuleSpec[] = [
  {
    code: "BPA-PROCESS-REPO",
    name: "Process Repository and Publishing",
    description:
      "Central repository for design-time process models with BPMN authoring, version graphs, check-in/check-out, lifecycle states, review and approval workflows, and stakeholder publication portals. The authoring backbone of the domain.",
    capability_ids: [338, 339, 342], // BPA-BPMN-MODEL, BPA-PROCESS-REPO, BPA-PUBLISH
    data_objects: [
      { data_object_id: 247, role: "master", necessity: "required" }, // business_process_models
    ],
  },
  {
    code: "BPA-CAPABILITY-MAP",
    name: "Capability Mapping and Reference Frameworks",
    description:
      "Hierarchical business capability maps with maturity, investment, and strategic-fit heatmaps, plus pre-loaded reference framework content that can be imported, synced, and extended with organization-specific content.",
    capability_ids: [343, 344], // BUSINESS-CAPABILITY-MAP, REFERENCE-FRAME-LIBRARY
    data_objects: [
      // business_capability_maps (248) is mastered by APM-PORTFOLIO-REGISTRY (module 103);
      // BPA embeds it (single-master preserved, M7).
      { data_object_id: 248, role: "embedded_master", necessity: "required" },
    ],
  },
  {
    code: "BPA-VALUE-STREAM",
    name: "Value Stream Modeling and Simulation",
    description:
      "End-to-end value stream maps with lead time, process time, value-add ratio, and waste categorization, together with discrete-event and Monte Carlo simulation of process scenarios for bottleneck identification and scenario comparison.",
    capability_ids: [341, 340], // BPA-VALUE-STREAM, BPA-SIMULATION
    data_objects: [
      { data_object_id: 249, role: "master", necessity: "required" }, // value_streams
      { data_object_id: 250, role: "master", necessity: "required" }, // process_simulation_runs
    ],
  },
];

// ------------------------------------------------------------
// Idempotent upserts
// ------------------------------------------------------------

async function upsertModule(spec: ModuleSpec): Promise<number> {
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_module_code=eq.${spec.code}&select=id`
  );
  if (existing?.length) {
    console.log(`  = module ${spec.code} exists (id ${existing[0].id})`);
    return existing[0].id;
  }
  await semantius("POST", "/domain_modules", [
    {
      domain_module_name: spec.name,
      domain_module_code: spec.code,
      description: spec.description,
      domain_id: DOMAIN_ID,
      module_kind: "full",
    },
  ]);
  const reread = await semantius(
    "GET",
    `/domain_modules?domain_module_code=eq.${spec.code}&select=id`
  );
  if (!reread?.length) throw new Error(`module insert failed for ${spec.code}`);
  console.log(`  + module ${spec.code} (id ${reread[0].id})`);
  return reread[0].id;
}

async function upsertCapabilities(moduleId: number, capabilityIds: number[]): Promise<void> {
  if (!capabilityIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capabilityIds.join(",")})&select=capability_id`
  );
  const have = new Set(existing.map((r: any) => r.capability_id));
  const toInsert = capabilityIds
    .filter((cid) => !have.has(cid))
    .map((cid) => ({ domain_module_id: moduleId, capability_id: cid }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`  +${toInsert.length} DMC rows on module ${moduleId}: ${toInsert.map((r) => r.capability_id).join(", ")}`);
  } else {
    console.log(`  = all ${capabilityIds.length} DMC rows already present on module ${moduleId}`);
  }
}

async function upsertDataObjects(
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
    .map((r) => ({
      domain_module_id: moduleId,
      data_object_id: r.data_object_id,
      role: r.role,
      necessity: r.necessity,
    }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`  +${toInsert.length} DMDO rows on module ${moduleId}: ${toInsert.map((r) => `${r.data_object_id}(${r.role})`).join(", ")}`);
  } else {
    console.log(`  = all ${rows.length} DMDO rows already present on module ${moduleId}`);
  }
}

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------

async function main() {
  console.log("=== Modularize BPA (domain 136) ===");

  // Safety: confirm 248's master row is on APM (M7 single-master) and we are not touching it.
  const capMapMaster = await semantius(
    "GET",
    "/domain_module_data_objects?data_object_id=eq.248&role=eq.master&select=domain_module_id,domain_modules(domain_module_code)"
  );
  console.log(
    `  capability_maps (248) master location: ${capMapMaster?.length ? capMapMaster.map((r: any) => r.domain_modules?.domain_module_code).join(",") : "NONE"}`
  );

  const codeToId = new Map<string, number>();
  for (const spec of MODULES) {
    console.log(`\n--- ${spec.code} ---`);
    const moduleId = await upsertModule(spec);
    codeToId.set(spec.code, moduleId);
    await upsertCapabilities(moduleId, spec.capability_ids);
    await upsertDataObjects(moduleId, spec.data_objects);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
