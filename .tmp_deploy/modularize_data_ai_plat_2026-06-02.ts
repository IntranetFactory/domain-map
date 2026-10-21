#!/usr/bin/env bun
// Idempotent modularization loader for DATA-AI-PLAT (domain_id 129).
// Creates 4 full domain_modules, links existing capabilities (DMC),
// assigns existing data_objects (DMDO) at their existing role+necessity.
// Reuses existing entities ONLY: no new data_objects / capabilities / lifecycle / skills.
// Safe to re-run. Natural keys:
//   module        = domain_module_code
//   DMC           = (domain_module_id, capability_id)
//   DMDO          = (domain_module_id, data_object_id)
// Module ids are re-read after insert; never hard-coded.

type Json = any;

const DOMAIN_ID = 129;

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
  // data_object assignments preserve existing role+necessity from domain_data_objects
  data_objects: { data_object_id: number; role: string; necessity: string }[];
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_code: "DATA-AI-PLAT-LAKEHOUSE",
    domain_module_name: "Lakehouse and Pipeline Engineering",
    description:
      "Unified analytics storage over open table formats with ACID transactions, schema evolution, and time travel, plus declarative and code-first batch and streaming pipelines with scheduling, dependency management, lineage capture, and run observability. Includes collaborative multi-language notebooks running against the lakehouse with shared compute and scheduled execution.",
    capability_ids: [195, 196, 202], // LAKEHOUSE-STORAGE, DATA-PIPELINE-ORCH, NOTEBOOK-ANALYTICS
    data_objects: [
      { data_object_id: 226, role: "master", necessity: "required" }, // lakehouse_tables
      { data_object_id: 227, role: "master", necessity: "required" }, // data_pipelines
    ],
  },
  {
    domain_module_code: "DATA-AI-PLAT-SEMANTIC-CATALOG",
    domain_module_name: "Semantic Layer, Governance, and Data Products",
    description:
      "Semantic and ontology modeling that maps physical tables to governed business concepts and reusable measures, a single-pane catalog with lineage, business glossary, and fine-grained access control across all platform assets, and published governed data products with explicit contracts. Includes operational data applications backed by the semantic and ontology layer with write-back to systems of record.",
    capability_ids: [197, 200, 201], // SEMANTIC-MODELING, UNIFIED-GOV-CATALOG, OPERATIONAL-DATA-APPS
    data_objects: [
      { data_object_id: 230, role: "master", necessity: "required" }, // semantic_metrics
      { data_object_id: 254, role: "master", necessity: "required" }, // ontologies
      { data_object_id: 255, role: "master", necessity: "required" }, // knowledge_graph_entities
      { data_object_id: 232, role: "master", necessity: "required" }, // data_products
      { data_object_id: 252, role: "consumer", necessity: "required" }, // metric_definitions (mastered by METRICS-LAYER)
    ],
  },
  {
    domain_module_code: "DATA-AI-PLAT-ML",
    domain_module_name: "Machine Learning Lifecycle",
    description:
      "End-to-end machine-learning lifecycle: feature engineering and feature store, distributed training, experiment tracking, model registry, deployment to serving endpoints, drift monitoring, and continuous evaluation.",
    capability_ids: [198], // ML-LIFECYCLE
    data_objects: [
      { data_object_id: 228, role: "master", necessity: "required" }, // ml_models
      { data_object_id: 229, role: "master", necessity: "required" }, // feature_sets
    ],
  },
  {
    domain_module_code: "DATA-AI-PLAT-AI-AGENTS",
    domain_module_name: "LLM Orchestration and AI Agents",
    description:
      "Foundation-model hosting and routing, embedding generation, vector search, retrieval-augmented generation, tool-use orchestration, agent runtimes, prompt versioning, evaluation harnesses, and gateway controls for cost, safety, and audit.",
    capability_ids: [199], // LLM-ORCH
    data_objects: [
      { data_object_id: 231, role: "master", necessity: "required" }, // ai_agents
    ],
  },
];

// ---- Upserts ---------------------------------------------------------------

async function upsertModules(): Promise<Map<string, number>> {
  const codes = MODULES.map((m) => m.domain_module_code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`
  );
  const existingCodes = new Set((existing ?? []).map((r: any) => r.domain_module_code));
  const toInsert = MODULES.filter((m) => !existingCodes.has(m.domain_module_code)).map((m) => ({
    domain_module_name: m.domain_module_name,
    domain_module_code: m.domain_module_code,
    description: m.description,
    domain_id: DOMAIN_ID,
    module_kind: "full",
    // record_status omitted (DB default 'new'); catalog_tagline / catalog_description omitted (M8/A4 gap)
  }));
  if (toInsert.length) {
    await semantius("POST", "/domain_modules", toInsert);
    console.log(`  +${toInsert.length} domain_modules: ${toInsert.map((m) => m.domain_module_code).join(", ")}`);
  } else {
    console.log("  domain_modules: all present");
  }
  const all = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  return map;
}

async function upsertDMC(moduleId: number, capabilityIds: number[]): Promise<void> {
  if (!capabilityIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capabilityIds.join(",")})&select=capability_id`
  );
  const existingIds = new Set((existing ?? []).map((r: any) => r.capability_id));
  const toInsert = capabilityIds
    .filter((cid) => !existingIds.has(cid))
    .map((cid) => ({ domain_module_id: moduleId, capability_id: cid }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`    +${toInsert.length} DMC rows on module ${moduleId}`);
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
  const existingIds = new Set((existing ?? []).map((r: any) => r.data_object_id));
  const toInsert = rows
    .filter((r) => !existingIds.has(r.data_object_id))
    .map((r) => ({
      domain_module_id: moduleId,
      data_object_id: r.data_object_id,
      role: r.role,
      necessity: r.necessity,
      // auto label + notes omitted (R15)
    }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`    +${toInsert.length} DMDO rows on module ${moduleId}`);
  }
}

// ---- Main ------------------------------------------------------------------

async function main() {
  console.log("=== Modularize DATA-AI-PLAT (domain 129) ===");
  const codeToId = await upsertModules();

  for (const m of MODULES) {
    const moduleId = codeToId.get(m.domain_module_code);
    if (!moduleId) throw new Error(`module id not resolved for ${m.domain_module_code}`);
    console.log(`  ${m.domain_module_code} -> id ${moduleId}`);
    await upsertDMC(moduleId, m.capability_ids);
    await upsertDMDO(moduleId, m.data_objects);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
