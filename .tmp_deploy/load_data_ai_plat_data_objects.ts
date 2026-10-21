#!/usr/bin/env bun
// Loads the DATA-AI-PLAT data-object footprint into the domain_map module:
//   - 7 new data_objects (DATA-AI-PLAT-mastered)
//   - domain_data_objects rows (8 master incl. BI co-master on semantic_metrics, 3 contributor, 5 consumer)
//   - 8 cross_domain_handoffs rows (DATA-AI-PLAT ↔ BI/DCG/CONV-AI/AIOPS/MDM/DQ/DI)
// Idempotent: reads natural/composite keys first, only inserts missing rows.

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

async function syncTable<T extends Row>(
  path: string,
  rows: T[],
  keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new rows into ${path} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} already present, nothing to insert`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// ============================================================
// DATA OBJECTS (DATA-AI-PLAT-mastered)
// ============================================================
const newDataObjects = [
  {
    data_object_name: "lakehouse_tables",
    singular_label: "Lakehouse Table",
    plural_label: "Lakehouse Tables",
    display_label: "Lakehouse Table",
    description:
      "Registered table or view in the platform catalog, materialised over open table formats (Delta Lake, Apache Iceberg, Apache Hudi) on object storage or as native warehouse tables. Carries catalog/schema/name, ownership, tags, classification, format metadata, and a pointer to the underlying physical layout. The unit of data on which lineage, governance, BI queries, and ML training all sit.",
  },
  {
    data_object_name: "data_pipelines",
    singular_label: "Data Pipeline",
    plural_label: "Data Pipelines",
    display_label: "Data Pipeline",
    description:
      "Pipeline definition and its run history: ELT/ETL jobs, streaming pipelines, dbt-style transformation models, and managed ingestion connectors. Includes scheduling, dependency graph, lineage edges to source and target tables, and run-level observability (status, duration, rows processed).",
  },
  {
    data_object_name: "ml_models",
    singular_label: "ML Model",
    plural_label: "ML Models",
    display_label: "ML Model",
    description:
      "Registered machine-learning model with versions, training-data lineage, evaluation metrics, deployment endpoints, and approval state. Backed by the platform's model registry (MLflow, Vertex Model Registry, Bedrock model catalog, watsonx model catalog, SageMaker Model Registry). Distinct from PA's predictive_models, which is the HR-specific attrition-modeling concept consumed inside People Analytics workflows.",
  },
  {
    data_object_name: "feature_sets",
    singular_label: "Feature Set",
    plural_label: "Feature Sets",
    display_label: "Feature Set",
    description:
      "Versioned feature-store entry: feature definitions, materialisation logic, online/offline serving configuration, freshness SLA, and lineage to source tables. The intermediate artifact between raw data and trained models.",
  },
  {
    data_object_name: "semantic_metrics",
    singular_label: "Semantic Metric",
    plural_label: "Semantic Metrics",
    display_label: "Semantic Metric",
    description:
      "Metric or dimension definition in the platform's semantic layer: Unity Catalog metric views, Snowflake Cortex Analyst semantic models, Palantir Foundry ontology measures, dbt metrics, Microsoft Fabric semantic models. The reusable, governed measure consumed by BI tools and AI agents alike.",
  },
  {
    data_object_name: "ai_agents",
    singular_label: "AI Agent",
    plural_label: "AI Agents",
    display_label: "AI Agent",
    description:
      "Registered LLM agent or generative-AI workflow: prompt templates, tool bindings, retrieval indexes (RAG), evaluation harness, deployed endpoints, audit log, and cost/safety policy. Lives in the platform's AI tier (AIP, Mosaic AI Agent Framework, Vertex AI Agent Builder, Bedrock Agents, watsonx.ai agents, Dataiku LLM Mesh).",
  },
  {
    data_object_name: "data_products",
    singular_label: "Data Product",
    plural_label: "Data Products",
    display_label: "Data Product",
    description:
      "Published, governed data product with an explicit contract: schema, SLA, owner, access policy, intended consumers, quality expectations, and versioning. Backed by one or more lakehouse_tables, pipeline outputs, or semantic_metrics. The unit of data exchange between producer teams and consumer teams under a data-mesh / governed-marketplace model.",
  },
];

// ============================================================
// DOMAIN_DATA_OBJECTS: master / contributor / consumer
// ============================================================
type DDORow = {
  data_object_name: string;
  domain_code: string;
  role: "master" | "contributor" | "consumer" | "derived";
  notes: string;
};

const ddoRows: DDORow[] = [
  // === Masters: DATA-AI-PLAT for all 7 ===
  { data_object_name: "lakehouse_tables", domain_code: "DATA-AI-PLAT", role: "master",
    notes: "Platform catalog is the system of record for table identity, location, format, and access controls." },
  { data_object_name: "data_pipelines", domain_code: "DATA-AI-PLAT", role: "master",
    notes: "Pipeline definitions and run state live in the platform; orchestrators (Airflow, Workflows, Data Factory) write here." },
  { data_object_name: "ml_models", domain_code: "DATA-AI-PLAT", role: "master",
    notes: "Platform-level model registry: any trained model, regardless of business domain, gets registered here for governance." },
  { data_object_name: "feature_sets", domain_code: "DATA-AI-PLAT", role: "master",
    notes: "Feature-store entries managed by the platform; teams across business domains consume them for model training." },
  { data_object_name: "semantic_metrics", domain_code: "DATA-AI-PLAT", role: "master",
    notes: "Platform-side metric definitions consumed across BI, AI agents, and operational apps. Multi-master with BI." },
  { data_object_name: "ai_agents", domain_code: "DATA-AI-PLAT", role: "master",
    notes: "Agent definitions, tool bindings, RAG indexes, and deployments registered in the platform's AI tier." },
  { data_object_name: "data_products", domain_code: "DATA-AI-PLAT", role: "master",
    notes: "Platform owns the published data-product contract: schema, SLA, owner, access policy, lineage to backing tables." },

  // === Multi-master: BI co-masters semantic_metrics ===
  { data_object_name: "semantic_metrics", domain_code: "BI", role: "master",
    notes: "Tool-specific semantic models authored in the BI client itself: Power BI semantic models, LookML, Tableau metrics, MicroStrategy metrics. Legitimately co-authoritative because BI tools were the historical home of semantic layers." },

  // === Contributors ===
  { data_object_name: "lakehouse_tables", domain_code: "DI", role: "contributor",
    notes: "Replication and ELT tools (Fivetran, Airbyte, dbt, Informatica IDMC) write into platform-mastered tables as their output sink." },
  { data_object_name: "data_pipelines", domain_code: "DI", role: "contributor",
    notes: "Ingestion-tool pipeline definitions (Fivetran connectors, dbt models, Informatica mappings) register themselves alongside platform-native pipelines." },
  { data_object_name: "data_products", domain_code: "DCG", role: "contributor",
    notes: "Enterprise governance tools (Collibra, Alation, Atlan) contribute glossary terms, stewardship workflows, and certification metadata to data products mastered on the platform." },

  // === Consumers ===
  { data_object_name: "lakehouse_tables", domain_code: "BI", role: "consumer",
    notes: "BI tools query platform-mastered tables directly via JDBC/ODBC/native connectors." },
  { data_object_name: "lakehouse_tables", domain_code: "DQ", role: "consumer",
    notes: "Enterprise DQ tools (Monte Carlo, Bigeye, Ataccama) profile and monitor platform-mastered tables." },
  { data_object_name: "data_products", domain_code: "BI", role: "consumer",
    notes: "BI dashboards target governed data products as their source-of-record, not raw tables." },
  { data_object_name: "ai_agents", domain_code: "CONV-AI", role: "consumer",
    notes: "Conversational-AI surfaces (chatbots, voicebots) invoke platform-registered agents as their backend reasoning layer." },
  { data_object_name: "data_pipelines", domain_code: "AIOPS", role: "consumer",
    notes: "AIOps platforms ingest pipeline run state and correlate failures with downstream incident signals." },
];

// ============================================================
// CROSS_DOMAIN_HANDOFFS
// ============================================================
type HandoffSpec = {
  source_code: string;
  target_code: string;
  data_object_name: string;
  trigger_event: string;
  integration_pattern: "event_stream" | "api_call" | "batch_sync" | "manual_handoff" | "file_drop";
  friction_level: "low" | "medium" | "high";
  description: string;
  notes?: string;
};

const handoffs: HandoffSpec[] = [
  {
    source_code: "DATA-AI-PLAT",
    target_code: "BI",
    data_object_name: "semantic_metrics",
    trigger_event: "semantic_metric.published",
    integration_pattern: "api_call",
    friction_level: "high",
    description:
      "A metric defined in the platform's semantic layer (Unity Catalog metric view, Cortex Analyst semantic model, Foundry ontology measure) is published for BI consumption. Each downstream BI tool re-imports or re-models the metric in its own semantic format; definitions drift, names collide, and 'revenue' in Tableau ends up disagreeing with 'revenue' in Power BI even when both originated in the same platform metric. Identity reconciliation across systems pattern.",
    notes: "Convergence is partially solved within single-vendor stacks (Fabric → Power BI, Looker → BigQuery) but breaks at vendor boundaries.",
  },
  {
    source_code: "DATA-AI-PLAT",
    target_code: "DCG",
    data_object_name: "data_products",
    trigger_event: "data_product.published",
    integration_pattern: "event_stream",
    friction_level: "high",
    description:
      "A new data product is published on the platform — schema, owner, SLA, lineage. The enterprise data catalog (Collibra, Alation, Atlan) needs to register it, attach glossary terms, surface stewardship workflows, and propagate lineage upstream. Lineage formats differ per platform (OpenLineage, proprietary), enterprise catalogs maintain their own model; sync is bespoke. Cross-vendor stack with same logical entity pattern.",
    notes: "Open standards (OpenLineage, Iceberg metadata, Polaris) are reducing this friction but most enterprises still hand-roll the bridge.",
  },
  {
    source_code: "DATA-AI-PLAT",
    target_code: "CONV-AI",
    data_object_name: "ai_agents",
    trigger_event: "ai_agent.deployed",
    integration_pattern: "api_call",
    friction_level: "medium",
    description:
      "An AI agent built on the platform (Mosaic AI Agent Framework, AIP agent, Vertex Agent Builder, Bedrock Agent) is deployed and needs to be exposed via a conversational-AI surface — Microsoft Copilot, Salesforce Einstein, Genesys, custom chatbot front-ends. The agent's tools, retrieval indexes, and guardrails sit on the platform; the channel surfaces (intent routing, conversation state, voice synthesis) sit in the conversational-AI vendor.",
    notes: "Newer pattern; standards (MCP, ACP) are emerging in 2024–2025 but not yet universal.",
  },
  {
    source_code: "DATA-AI-PLAT",
    target_code: "AIOPS",
    data_object_name: "data_pipelines",
    trigger_event: "pipeline_run.failed",
    integration_pattern: "event_stream",
    friction_level: "medium",
    description:
      "A platform pipeline run fails or breaches its SLA. AIOps tooling needs the failure to correlate with infrastructure events, recent deployments, and downstream business impact. Today: pipelines emit Prometheus metrics or webhook events; AIOps tools ingest them but rarely have first-class understanding of pipeline semantics (lineage to consuming dashboards, SLA criticality).",
  },
  {
    source_code: "DATA-AI-PLAT",
    target_code: "MDM",
    data_object_name: "data_products",
    trigger_event: "golden_record.synced",
    integration_pattern: "batch_sync",
    friction_level: "high",
    description:
      "Customer/supplier/product golden records mastered in the MDM hub are projected into the lakehouse as platform-side data products; conversely, the platform's analytical resolution often produces a higher-quality match than the operational MDM hub. Who's authoritative? Most enterprises end up with a bidirectional batch sync where neither side fully trusts the other. Cross-vendor stack with same logical entity pattern.",
    notes: "Often the trigger for an MDM-modernisation project that ends up moving golden-record mastery onto the platform itself.",
  },
  {
    source_code: "DATA-AI-PLAT",
    target_code: "DQ",
    data_object_name: "lakehouse_tables",
    trigger_event: "quality_check.failed",
    integration_pattern: "api_call",
    friction_level: "medium",
    description:
      "A platform-native quality check on a lakehouse table (Databricks Lakehouse Monitoring, Snowflake DMF, Fabric data quality) fails. The enterprise DQ tool (Monte Carlo, Bigeye, Ataccama, Soda) needs the finding to feed its central scorecard and ticketing. Two parallel quality systems exist; reconciliation is manual or via webhooks.",
  },
  {
    source_code: "DI",
    target_code: "DATA-AI-PLAT",
    data_object_name: "lakehouse_tables",
    trigger_event: "replication_load.completed",
    integration_pattern: "event_stream",
    friction_level: "low",
    description:
      "A managed ingestion tool (Fivetran, Airbyte, AWS DMS, Qlik Replicate) completes a load and signals the platform to refresh dependent pipelines and materialisations. Mature pattern with first-class event integration in most lakehouse runtimes.",
  },
  {
    source_code: "DCG",
    target_code: "DATA-AI-PLAT",
    data_object_name: "lakehouse_tables",
    trigger_event: "access_policy.updated",
    integration_pattern: "api_call",
    friction_level: "high",
    description:
      "An enterprise governance tool updates an access policy (tag-based, attribute-based, lineage-derived). The platform's native RBAC layer (Unity Catalog, Horizon, Lake Formation, Dataplex) needs to enforce it. Policy syntax differs; not every governance assertion maps to a platform-native control; bridges are bespoke and drift over time. Identity reconciliation pattern in the access-control axis.",
    notes: "Standards (OpenPolicyAgent, ABAC profiles in lakehouses) reduce but don't eliminate the friction.",
  },
];

// ============================================================
// RUN
// ============================================================
async function main() {
  console.log("\n=== Data objects ===");
  const doMap = await syncTable("/data_objects", newDataObjects.map(d => ({ ...d })), "data_object_name");
  const fullDosRaw = await get("/data_objects?select=id,data_object_name&limit=10000");
  for (const d of fullDosRaw) doMap.set(String(d.data_object_name), Number(d.id));

  console.log("\n=== Domain lookup ===");
  const domsRaw = await get("/domains?select=id,domain_code&limit=10000");
  const domMap = new Map<string, number>();
  for (const d of domsRaw) domMap.set(String(d.domain_code), Number(d.id));

  console.log("\n=== domain_data_objects junctions ===");
  const existingDdo = await get("/domain_data_objects?select=data_object_id,domain_id,role&limit=10000");
  const existingDdoSet = new Set(existingDdo.map(r => `${r.data_object_id}:${r.domain_id}:${r.role}`));
  const newDdo: Row[] = [];
  let skippedDdo = 0;
  for (const r of ddoRows) {
    const doid = doMap.get(r.data_object_name);
    const did = domMap.get(r.domain_code);
    if (!doid) throw new Error(`data_object not found: ${r.data_object_name}`);
    if (!did) throw new Error(`domain not found: ${r.domain_code}`);
    const key = `${doid}:${did}:${r.role}`;
    if (existingDdoSet.has(key)) { skippedDdo++; continue; }
    existingDdoSet.add(key);
    newDdo.push({
      data_object_id: doid,
      domain_id: did,
      role: r.role,
      notes: r.notes,
    });
  }
  if (newDdo.length > 0) {
    console.log(`  inserting ${newDdo.length} domain_data_objects rows (${skippedDdo} already present)`);
    await insert("/domain_data_objects", newDdo);
  } else {
    console.log(`  no new domain_data_objects rows (${skippedDdo} already present)`);
  }

  console.log("\n=== cross_domain_handoffs ===");
  const existingHandoffs = await get(
    "/cross_domain_handoffs?select=source_domain_id,target_domain_id,data_object_id,trigger_event&limit=10000",
  );
  const existingHandoffSet = new Set(
    existingHandoffs.map(r => `${r.source_domain_id}:${r.target_domain_id}:${r.data_object_id}:${r.trigger_event}`),
  );
  const newHandoffs: Row[] = [];
  let skippedHandoffs = 0;
  for (const h of handoffs) {
    const src = domMap.get(h.source_code);
    const tgt = domMap.get(h.target_code);
    const doid = doMap.get(h.data_object_name);
    if (!src) throw new Error(`source domain not found: ${h.source_code}`);
    if (!tgt) throw new Error(`target domain not found: ${h.target_code}`);
    if (!doid) throw new Error(`data_object not found: ${h.data_object_name}`);
    if (src === tgt) throw new Error(`cross_domain_only violation: ${h.source_code}==${h.target_code} (${h.trigger_event})`);
    const key = `${src}:${tgt}:${doid}:${h.trigger_event}`;
    if (existingHandoffSet.has(key)) { skippedHandoffs++; continue; }
    existingHandoffSet.add(key);
    newHandoffs.push({
      source_domain_id: src,
      target_domain_id: tgt,
      data_object_id: doid,
      trigger_event: h.trigger_event,
      integration_pattern: h.integration_pattern,
      friction_level: h.friction_level,
      description: h.description,
      notes: h.notes ?? "",
    });
  }
  if (newHandoffs.length > 0) {
    console.log(`  inserting ${newHandoffs.length} cross_domain_handoffs rows (${skippedHandoffs} already present)`);
    await insert("/cross_domain_handoffs", newHandoffs);
  } else {
    console.log(`  no new cross_domain_handoffs rows (${skippedHandoffs} already present)`);
  }

  // ===== Final counts (DATA-AI-PLAT scope) =====
  const dapId = domMap.get("DATA-AI-PLAT");
  const counts = {
    data_objects_total: (await get("/data_objects?select=id&limit=10000")).length,
    domain_data_objects_total: (await get("/domain_data_objects?select=data_object_id&limit=10000")).length,
    cross_domain_handoffs_total: (await get("/cross_domain_handoffs?select=source_domain_id&limit=10000")).length,
    data_ai_plat_masters: (await get(`/domain_data_objects?domain_id=eq.${dapId}&role=eq.master&select=data_object_id&limit=10000`)).length,
    data_ai_plat_outbound: (await get(`/cross_domain_handoffs?source_domain_id=eq.${dapId}&select=source_domain_id&limit=10000`)).length,
    data_ai_plat_inbound: (await get(`/cross_domain_handoffs?target_domain_id=eq.${dapId}&select=source_domain_id&limit=10000`)).length,
    high_friction_in_scope: (await get(`/cross_domain_handoffs?or=(source_domain_id.eq.${dapId},target_domain_id.eq.${dapId})&friction_level=eq.high&select=trigger_event&limit=10000`)).length,
  };
  console.log("\n=== Final counts ===");
  console.log(JSON.stringify(counts, null, 2));
}

await main();
