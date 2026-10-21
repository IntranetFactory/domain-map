#!/usr/bin/env bun
// Modularize KGP (Knowledge Graph Platform, domain_id 138).
// Creates EXACTLY 2 full modules, links its 8 existing capabilities across them,
// assigns its 2 existing masters at role=master (one per module).
// Scope: modules + capability links + data_object assignment ONLY. Reuses existing entities.
// Idempotent; safe to re-run. record_status OMITTED on every insert (Rule #1). notes OMITTED on DMC/DMDO (Rule #15).

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

const DOMAIN_ID = 138;

// --- Module specs (EXACTLY 2 full modules, each holds >=1 master + >=1 capability) ---
type ModuleSpec = {
  domain_module_name: string;
  domain_module_code: string;
  description: string;
  capability_ids: number[];
  master_data_object_id: number; // role=master, necessity=required
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_name: "Ontology Engine",
    domain_module_code: "KGP-ONTOLOGY-ENGINE",
    description:
      "Models the business domain as a formal ontology and stores it on a purpose-built graph engine that infers facts the team never asserted by hand. Authors and version-controls ontology classes, properties, and constraint shapes; runs the reasoning tier that materializes entailed relationships; and persists everything on a native graph store with transactions, replication, and backup.",
    capability_ids: [352, 353, 357, 197], // ONTOLOGY-AUTHORING, REASONING-INFERENCE, NATIVE-STORAGE, SEMANTIC-MODELING
    master_data_object_id: 742, // kgp_ontologies
  },
  {
    domain_module_name: "Graph Query and Applications",
    domain_module_code: "KGP-GRAPH-QUERY-APPS",
    description:
      "Queries the unified graph, federates across remote and virtual sources without ETL, and grounds AI agents and operational apps in typed, lineage-tracked facts. Runs federated graph queries with named-graph access control, exposes relational and API sources as native graph data on demand, joins symbolic queries with vector search for retrieval, and lets code-first or low-code apps read and write back to the underlying graph entities.",
    capability_ids: [354, 355, 356, 201], // SPARQL-FEDERATION, VIRTUAL-GRAPHS, AI-AGENT-INTEGRATION, OPERATIONAL-DATA-APPS
    master_data_object_id: 743, // kgp_knowledge_graph_entities
  },
];

async function masterPrecheck(dataObjectId: number, moduleCode: string): Promise<"master" | "embedded_master"> {
  // M7 catalog-wide: if ANY module already masters this data_object, demote here to embedded_master.
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?data_object_id=eq.${dataObjectId}&role=eq.master&select=domain_module_id`,
  );
  if (existing?.length) {
    // Allow re-run idempotency: if the only master row is OUR module, keep master.
    const ourModule = await semantius(
      "GET",
      `/domain_modules?domain_module_code=eq.${moduleCode}&select=id`,
    );
    const ourId = ourModule?.[0]?.id;
    const onlyUs = existing.every((r: any) => r.domain_module_id === ourId);
    if (onlyUs) return "master";
    console.log(
      `  M7 PRECHECK: data_object ${dataObjectId} already mastered by module(s) ${existing
        .map((r: any) => r.domain_module_id)
        .join(",")} -> assigning embedded_master in ${moduleCode}`,
    );
    return "embedded_master";
  }
  return "master";
}

async function ensureModule(m: ModuleSpec): Promise<number> {
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_module_code=eq.${m.domain_module_code}&select=id`,
  );
  if (existing?.length) {
    console.log(`  module ${m.domain_module_code} exists (id ${existing[0].id})`);
    return existing[0].id;
  }
  await semantius("POST", "/domain_modules", [
    {
      domain_module_name: m.domain_module_name,
      domain_module_code: m.domain_module_code,
      description: m.description,
      domain_id: DOMAIN_ID,
      module_kind: "full",
    },
  ]);
  const created = await semantius(
    "GET",
    `/domain_modules?domain_module_code=eq.${m.domain_module_code}&select=id`,
  );
  if (!created?.length) throw new Error(`failed to create module ${m.domain_module_code}`);
  console.log(`  +module ${m.domain_module_code} (id ${created[0].id})`);
  return created[0].id;
}

async function ensureCapabilityLinks(moduleId: number, capabilityIds: number[]): Promise<void> {
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capabilityIds.join(
      ",",
    )})&select=capability_id`,
  );
  const have = new Set((existing ?? []).map((r: any) => r.capability_id));
  const toInsert = capabilityIds
    .filter((cid) => !have.has(cid))
    .map((cid) => ({ domain_module_id: moduleId, capability_id: cid }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`  +${toInsert.length} capability links on module ${moduleId}`);
  } else {
    console.log(`  capability links on module ${moduleId} already present`);
  }
}

async function ensureMasterDMDO(moduleId: number, dataObjectId: number, role: string): Promise<void> {
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=eq.${dataObjectId}&select=role`,
  );
  if (existing?.length) {
    console.log(`  DMDO ${dataObjectId} on module ${moduleId} exists (role ${existing[0].role})`);
    return;
  }
  await semantius("POST", "/domain_module_data_objects", [
    { domain_module_id: moduleId, data_object_id: dataObjectId, role, necessity: "required" },
  ]);
  console.log(`  +DMDO ${dataObjectId} (${role}/required) on module ${moduleId}`);
}

async function main() {
  console.log("=== Modularize KGP (domain 138) ===");

  // Pre-flight: confirm domain exists and starts with zero modules (informational).
  const pre = await semantius("GET", `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`);
  console.log(`Existing KGP modules before run: ${pre?.length ?? 0}`);

  const codeToId = new Map<string, number>();
  for (const m of MODULES) {
    console.log(`\n--- ${m.domain_module_code} ---`);
    const moduleId = await ensureModule(m);
    codeToId.set(m.domain_module_code, moduleId);
    await ensureCapabilityLinks(moduleId, m.capability_ids);
    const role = await masterPrecheck(m.master_data_object_id, m.domain_module_code);
    await ensureMasterDMDO(moduleId, m.master_data_object_id, role);
  }

  // --- Verification ---
  console.log("\n=== Verification ===");
  const modules = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code,module_kind&order=id.asc`,
  );
  console.log(`Modules now: ${modules.map((m: any) => `${m.domain_module_code}(${m.id},${m.module_kind})`).join("  ")}`);

  // Every capability placed in >=1 module (M4).
  const allCaps = MODULES.flatMap((m) => m.capability_ids);
  const placed = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=in.(${modules
      .map((m: any) => m.id)
      .join(",")})&select=capability_id`,
  );
  const placedSet = new Set((placed ?? []).map((r: any) => r.capability_id));
  const unplaced = allCaps.filter((c) => !placedSet.has(c));
  console.log(`Capabilities placed: ${placedSet.size}/${allCaps.length}; unplaced: ${unplaced.join(",") || "none"}`);

  // Each module has >=1 capability and >=1 data_object (no empty module).
  for (const m of modules) {
    const caps = await semantius(
      "GET",
      `/domain_module_capabilities?domain_module_id=eq.${m.id}&select=capability_id`,
    );
    const dos = await semantius(
      "GET",
      `/domain_module_data_objects?domain_module_id=eq.${m.id}&select=data_object_id,role`,
    );
    console.log(
      `  ${m.domain_module_code}: ${caps?.length ?? 0} caps, ${dos?.length ?? 0} data_objects ` +
        `[${(dos ?? []).map((d: any) => `${d.data_object_id}:${d.role}`).join(", ")}]`,
    );
  }

  // Each master once catalog-wide.
  for (const doId of [742, 743]) {
    const masters = await semantius(
      "GET",
      `/domain_module_data_objects?data_object_id=eq.${doId}&role=eq.master&select=domain_module_id`,
    );
    console.log(`  master ${doId}: ${masters?.length ?? 0} master row(s) catalog-wide -> ${(masters ?? []).map((r: any) => r.domain_module_id).join(",")}`);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
