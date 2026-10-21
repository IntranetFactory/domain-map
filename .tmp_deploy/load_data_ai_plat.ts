#!/usr/bin/env bun
// Loads the Data and AI Platform (DATA-AI-PLAT) market into the domain_map module:
// 1 new domain, 5 new vendors (+ 5 reused), 10 solutions, 8 capabilities,
// solution_domains coverage matrix and solution_capabilities delivery matrix.
// Idempotent: reads natural keys first, only inserts missing rows.

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

type DomainRow = {
  domain_code: string;
  domain_name: string;
  description: string;
  crud_percentage: number;
  business_logic: string;
  min_org_size: string;
  cost_band: string;
  certification_required: boolean;
  usa_market_size_usd_m: number;
  market_size_source_year: number;
};

function validateDomainRow(d: DomainRow): void {
  const errs: string[] = [];
  if (!d.domain_code) errs.push("domain_code empty");
  if (!d.domain_name) errs.push("domain_name empty");
  if (!d.description) errs.push("description empty");
  if (d.crud_percentage === 0) errs.push("crud_percentage is 0 (must be assessed)");
  if (d.crud_percentage < 0 || d.crud_percentage > 100) errs.push("crud_percentage out of range");
  if (d.min_org_size === "") errs.push("min_org_size empty");
  if (d.cost_band === "") errs.push("cost_band empty");
  if (d.business_logic === "" && d.crud_percentage < 95) errs.push("business_logic empty but crud_percentage < 95");
  if (d.usa_market_size_usd_m === 0) errs.push("usa_market_size_usd_m is 0");
  if (d.market_size_source_year === 0) errs.push("market_size_source_year is 0");
  if (errs.length > 0) {
    throw new Error(`Domain row ${d.domain_code} failed validation: ${errs.join("; ")}`);
  }
}

// ============================================================
// DOMAIN
// ============================================================
const newDomains: DomainRow[] = [
  {
    domain_code: "DATA-AI-PLAT",
    domain_name: "Data and AI Platform",
    description:
      "Unified lakehouse-class platform combining storage, pipelines, governance, semantic modeling, analytics, and ML/AI lifecycle under one runtime. Distinct from point-solution data integration (DI), data catalog/governance (DCG), MDM, BI, and data quality (DQ) — those domains are features of a Data and AI Platform, not standalone replacements for it. Vendors: Palantir Foundry, Databricks Data Intelligence Platform, Snowflake AI Data Cloud, Microsoft Fabric, Google Cloud Data and AI, AWS SageMaker Unified Studio, IBM watsonx, SAP Business Data Cloud, Cloudera Data Platform, Dataiku.",
    crud_percentage: 30,
    business_logic:
      "ELT/streaming pipeline execution (Spark, Flink, Beam); ML training and inference runtimes; vector indexing and similarity search; semantic ontology resolution mapping physical data to business concepts; declarative semantic layers (dbt-style); feature engineering and feature store; LLM orchestration with RAG and tool-use; fine-grained policy evaluation for row/column-level access; code-first transforms in SQL/Python/Scala; operational apps backed by the ontology layer (Foundry-style).",
    min_org_size: "30 m <2500",
    cost_band: "$$$$",
    certification_required: false,
    usa_market_size_usd_m: 25000,
    market_size_source_year: 2024,
  },
];

for (const d of newDomains) validateDomainRow(d);

// ============================================================
// CAPABILITIES (all under DATA-AI-PLAT)
// ============================================================
const capabilities = [
  {
    capability_code: "LAKEHOUSE-STORAGE",
    capability_name: "Unified Lakehouse Storage",
    domain: "DATA-AI-PLAT",
    description:
      "Unified analytics storage layer over object storage with ACID transactions, schema evolution, time travel, and open table formats (Delta Lake, Apache Iceberg, Apache Hudi). Backs both batch analytics and streaming workloads from a single physical copy.",
  },
  {
    capability_code: "DATA-PIPELINE-ORCH",
    capability_name: "Data Pipeline Orchestration",
    domain: "DATA-AI-PLAT",
    description:
      "Declarative and code-first ELT/ETL pipelines combining batch and streaming sources, with scheduling, dependency management, lineage capture, and observability. Covers SQL-first transforms (dbt-style), Spark/Flink workloads, and managed connector ingestion.",
  },
  {
    capability_code: "SEMANTIC-MODELING",
    capability_name: "Semantic Data Modeling",
    domain: "DATA-AI-PLAT",
    description:
      "Mapping of physical tables to business concepts via a semantic layer or ontology: metric definitions, entity-relationship modeling, business glossary, and reusable measures consumed by BI tools and AI agents alike.",
  },
  {
    capability_code: "ML-LIFECYCLE",
    capability_name: "ML Model Lifecycle Management",
    domain: "DATA-AI-PLAT",
    description:
      "End-to-end machine-learning lifecycle: feature engineering and feature store, distributed training, experiment tracking, model registry, deployment to serving endpoints, monitoring for drift, and continuous evaluation.",
  },
  {
    capability_code: "LLM-ORCH",
    capability_name: "LLM Orchestration and AI Agents",
    domain: "DATA-AI-PLAT",
    description:
      "Foundation-model hosting and routing, embedding generation, vector search, retrieval-augmented generation (RAG), tool-use orchestration, agent runtimes, prompt versioning, evaluation harnesses, and AI gateway controls (cost, safety, audit).",
  },
  {
    capability_code: "UNIFIED-GOV-CATALOG",
    capability_name: "Unified Governance and Catalog",
    domain: "DATA-AI-PLAT",
    description:
      "Single-pane data catalog, lineage, business glossary, fine-grained access control (row, column, tag-based), audit logging, and data-sharing primitives spanning all assets on the platform — tables, files, models, dashboards, and AI agents.",
  },
  {
    capability_code: "OPERATIONAL-DATA-APPS",
    capability_name: "Operational Data Applications",
    domain: "DATA-AI-PLAT",
    description:
      "Code-first or low-code operational applications backed by the platform's semantic/ontology layer, with write-back to source-of-record systems. The Foundry pattern: decisions taken in apps update the underlying objects and propagate to downstream operations.",
  },
  {
    capability_code: "NOTEBOOK-ANALYTICS",
    capability_name: "Collaborative Notebook Analytics",
    domain: "DATA-AI-PLAT",
    description:
      "Collaborative notebooks supporting SQL, Python, Scala, and R against the lakehouse, with shared compute, versioning, code-review integrations, scheduled execution, and dashboards published from notebook output.",
  },
];

// ============================================================
// VENDORS — 5 new, 5 reused (Microsoft/Google/AWS/IBM/SAP SE)
// ============================================================
const vendors = [
  {
    vendor_name: "Palantir Technologies",
    vendor_url: "https://www.palantir.com",
    headquarters_country: "USA",
    description:
      "Ontology-driven data and AI platform vendor. Two product lines for commercial enterprises (Foundry, AIP) and defense/intel (Gotham), plus Apollo for continuous deployment.",
    notes:
      "Founded 2003, HQ Denver CO. Public NYSE:PLTR since 2020. Strong U.S. federal and defense business alongside a growing commercial Foundry/AIP practice.",
  },
  {
    vendor_name: "Databricks",
    vendor_url: "https://www.databricks.com",
    headquarters_country: "USA",
    description:
      "Founders of Apache Spark; vendor of the Databricks Data Intelligence Platform — a lakehouse-native unified platform spanning ETL, BI, ML, and generative AI on Delta Lake.",
    notes:
      "Founded 2013, HQ San Francisco. Private; pre-IPO with funding rounds at >$60B valuation. Acquired MosaicML (2023, foundation-model training) and Tabular (2024, Apache Iceberg co-creators).",
  },
  {
    vendor_name: "Snowflake",
    vendor_url: "https://www.snowflake.com",
    headquarters_country: "USA",
    description:
      "Cloud-native data platform vendor: Snowflake AI Data Cloud combines a multi-cluster warehouse engine, Snowpark (Python/Java/Scala), Horizon (governance), Cortex (managed LLMs and ML), and Marketplace for data sharing.",
    notes:
      "Founded 2012, HQ Bozeman MT (incorporated Delaware). Public NYSE:SNOW since 2020. Acquired Streamlit (2022) and Neeva (2023, search/LLM team).",
  },
  {
    vendor_name: "Cloudera",
    vendor_url: "https://www.cloudera.com",
    headquarters_country: "USA",
    description:
      "Hybrid data platform vendor with strong on-prem and air-gapped lineage from the Hadoop era; current flagship is Cloudera Data Platform spanning data engineering, warehousing, ML, and streaming.",
    notes:
      "Founded 2008. Merged with Hortonworks in 2019. Taken private in 2021 by KKR and CD&R. Differentiator: production support for fully on-prem and sovereign deployments.",
  },
  {
    vendor_name: "Dataiku",
    vendor_url: "https://www.dataiku.com",
    headquarters_country: "France",
    description:
      "Vendor of the Dataiku platform: end-to-end data science, ML, and generative-AI workbench with visual flow, code notebooks, governance, and a strong operational-application story.",
    notes:
      "Founded 2013, HQ Paris and New York. Private; backed by Insight Partners, Tiger Global, ICONIQ. Differentiator: visual data-science flow on top of customer-owned lakehouses (does not provide its own storage).",
  },
];

// ============================================================
// SOLUTIONS (one flagship per vendor)
// ============================================================
type SolutionSpec = {
  solution_name: string;
  vendor: string;
  solution_type: "saas" | "on_prem" | "hybrid" | "open_source" | "internal_build" | "manual_process";
  description: string;
  notes?: string;
  primary?: string[];
  secondary?: string[];
  partial?: string[];
};

const solutions: SolutionSpec[] = [
  {
    solution_name: "Palantir Foundry",
    vendor: "Palantir Technologies",
    solution_type: "hybrid",
    description:
      "Ontology-driven data and AI platform: data integration, semantic ontology mapping physical data to business objects, operational applications writing back to source systems, and AIP — Palantir's LLM-orchestration tier — built directly on the same ontology.",
    notes:
      "AIP (Artificial Intelligence Platform) is modelled as the AI tier of Foundry on the same ontology — not a separate solution row. Foundry deploys on Palantir's cloud, hyperscalers, or fully on-prem/air-gapped.",
    primary: ["DATA-AI-PLAT"],
    secondary: ["DI", "DCG", "BI", "DQ"],
    partial: ["MDM"],
  },
  {
    solution_name: "Databricks Data Intelligence Platform",
    vendor: "Databricks",
    solution_type: "saas",
    description:
      "Lakehouse-native unified platform: Delta Lake storage, Spark and Photon compute, Unity Catalog governance, Databricks SQL warehousing, MLflow + Mosaic AI for the ML/LLM lifecycle, and AI/BI Genie for natural-language analytics.",
    notes: "Multi-cloud (AWS, Azure, GCP). Mosaic AI tier integrates foundation-model training, serving, and AI agents.",
    primary: ["DATA-AI-PLAT"],
    secondary: ["DI", "DCG", "BI", "DQ"],
    partial: ["MDM"],
  },
  {
    solution_name: "Snowflake AI Data Cloud",
    vendor: "Snowflake",
    solution_type: "saas",
    description:
      "Multi-cluster cloud data platform with Snowpark for Python/Java/Scala compute, Horizon Catalog for unified governance, Cortex for managed LLMs and ML, Streamlit for data apps, and the Snowflake Marketplace for data sharing.",
    notes: "Multi-cloud (AWS, Azure, GCP). Cortex was GA in 2024; native Iceberg tables and managed Polaris catalog added in 2024–2025.",
    primary: ["DATA-AI-PLAT"],
    secondary: ["DI", "DCG", "BI"],
    partial: ["MDM", "DQ"],
  },
  {
    solution_name: "Microsoft Fabric",
    vendor: "Microsoft",
    solution_type: "saas",
    description:
      "Unified analytics SaaS combining OneLake (single Delta-Parquet lake), Data Factory (ingestion), Synapse Data Engineering and Data Warehousing, Real-Time Intelligence, Data Science, Power BI, and the AI Foundry tier for generative-AI workloads.",
    notes: "GA November 2023. Bundles Power BI as the native BI experience, which gives Fabric primary BI coverage in addition to the platform domain.",
    primary: ["DATA-AI-PLAT", "BI"],
    secondary: ["DI", "DCG"],
    partial: ["MDM", "DQ"],
  },
  {
    solution_name: "Google Cloud Data and AI",
    vendor: "Google",
    solution_type: "saas",
    description:
      "Google Cloud's converged data-and-AI offering: BigQuery (serverless warehouse and lakehouse with BigLake/Iceberg), Dataplex (catalog and governance), Dataform (SQL transforms), Vertex AI (ML and Gemini-powered agent builder), Looker (BI).",
    notes: "Treated as a single solution row because Google markets the BigQuery + Dataplex + Vertex AI bundle as one unified data-and-AI platform.",
    primary: ["DATA-AI-PLAT"],
    secondary: ["DI", "DCG", "BI"],
    partial: ["MDM", "DQ"],
  },
  {
    solution_name: "Amazon SageMaker Unified Studio",
    vendor: "Amazon Web Services",
    solution_type: "saas",
    description:
      "AWS's 2024 re-unification of its data-and-AI stack into a single workbench: SageMaker (ML), Redshift (warehousing), Athena (lake querying), Glue (ETL and catalog), Lake Formation (governance), and Bedrock (foundation models).",
    notes: "Announced re:Invent 2024 as the umbrella experience over the underlying AWS analytics and AI services; supersedes the legacy SageMaker Studio framing.",
    primary: ["DATA-AI-PLAT"],
    secondary: ["DI", "DCG"],
    partial: ["MDM", "BI", "DQ"],
  },
  {
    solution_name: "IBM watsonx",
    vendor: "IBM",
    solution_type: "hybrid",
    description:
      "IBM's enterprise data-and-AI platform: watsonx.data (open lakehouse with Presto, Spark, Iceberg), watsonx.ai (model training and serving with Granite foundation models), watsonx.governance (model and data governance), watsonx Code Assistant.",
    notes: "Hybrid-deployable across IBM Cloud, AWS, Azure, and on-prem (Cloud Pak for Data). Targets regulated industries and hybrid-cloud estates.",
    primary: ["DATA-AI-PLAT"],
    secondary: ["DI", "DCG"],
    partial: ["MDM", "BI", "DQ"],
  },
  {
    solution_name: "SAP Business Data Cloud",
    vendor: "SAP SE",
    solution_type: "saas",
    description:
      "SAP's 2025 successor to SAP Datasphere: a managed SaaS data foundation combining HANA Cloud, Datasphere modeling, BW data products, an embedded Databricks OEM for lakehouse and AI workloads, and Joule generative-AI integration into SAP business processes.",
    notes: "Announced February 2025 with Databricks as the OEM lakehouse engine. Targets SAP-centric enterprises consolidating their data estate around SAP semantic models.",
    primary: ["DATA-AI-PLAT"],
    secondary: ["DI", "DCG", "MDM", "BI"],
    partial: ["DQ"],
  },
  {
    solution_name: "Cloudera Data Platform",
    vendor: "Cloudera",
    solution_type: "hybrid",
    description:
      "Hybrid data platform with deployable form factors across public cloud, private cloud, and on-prem: data engineering (Spark, Flink), data warehousing (Impala), operational database (HBase), machine learning (CML), and DataFlow streaming.",
    notes: "Differentiator is air-gapped and fully on-prem support for regulated and sovereign workloads where SaaS platforms cannot deploy.",
    primary: ["DATA-AI-PLAT"],
    secondary: ["DI"],
    partial: ["DCG", "MDM", "BI", "DQ"],
  },
  {
    solution_name: "Dataiku",
    vendor: "Dataiku",
    solution_type: "saas",
    description:
      "End-to-end data-science and generative-AI platform: visual data preparation flow, code notebooks, automated ML, LLM mesh for routing generative-AI traffic, governance and project-level controls, and a strong operational-application story.",
    notes: "Connects to customer-owned storage (Snowflake, Databricks, BigQuery, S3) — does not provide its own lakehouse. Strong in shops with mixed data backends.",
    primary: ["DATA-AI-PLAT"],
    partial: ["DI", "DCG", "MDM", "BI", "DQ"],
  },
];

// ============================================================
// SOLUTION_CAPABILITIES — delivery_strength matrix
// ============================================================
type SolCapSpec = {
  solution: string;
  capability: string;
  delivery_strength: "native" | "partial" | "via_extension" | "not_supported";
  notes?: string;
};

const solCaps: SolCapSpec[] = [
  // Palantir Foundry — ontology-led
  { solution: "Palantir Foundry", capability: "LAKEHOUSE-STORAGE", delivery_strength: "native" },
  { solution: "Palantir Foundry", capability: "DATA-PIPELINE-ORCH", delivery_strength: "native" },
  { solution: "Palantir Foundry", capability: "SEMANTIC-MODELING", delivery_strength: "native", notes: "Ontology is the flagship; everything sits on it." },
  { solution: "Palantir Foundry", capability: "ML-LIFECYCLE", delivery_strength: "native" },
  { solution: "Palantir Foundry", capability: "LLM-ORCH", delivery_strength: "native", notes: "AIP is the LLM-orchestration tier on the same ontology." },
  { solution: "Palantir Foundry", capability: "UNIFIED-GOV-CATALOG", delivery_strength: "native" },
  { solution: "Palantir Foundry", capability: "OPERATIONAL-DATA-APPS", delivery_strength: "native", notes: "Write-back operational apps on the ontology are the flagship differentiator." },
  { solution: "Palantir Foundry", capability: "NOTEBOOK-ANALYTICS", delivery_strength: "native" },

  // Databricks Data Intelligence Platform
  { solution: "Databricks Data Intelligence Platform", capability: "LAKEHOUSE-STORAGE", delivery_strength: "native", notes: "Delta Lake is native; UniForm enables Iceberg interop." },
  { solution: "Databricks Data Intelligence Platform", capability: "DATA-PIPELINE-ORCH", delivery_strength: "native", notes: "Delta Live Tables, Workflows, Spark Structured Streaming." },
  { solution: "Databricks Data Intelligence Platform", capability: "SEMANTIC-MODELING", delivery_strength: "native", notes: "Unity Catalog metric views (2024) plus dbt-style transforms." },
  { solution: "Databricks Data Intelligence Platform", capability: "ML-LIFECYCLE", delivery_strength: "native", notes: "MLflow, Mosaic AI training and serving." },
  { solution: "Databricks Data Intelligence Platform", capability: "LLM-ORCH", delivery_strength: "native", notes: "Mosaic AI Agent Framework, vector search, model serving." },
  { solution: "Databricks Data Intelligence Platform", capability: "UNIFIED-GOV-CATALOG", delivery_strength: "native", notes: "Unity Catalog." },
  { solution: "Databricks Data Intelligence Platform", capability: "OPERATIONAL-DATA-APPS", delivery_strength: "partial", notes: "Databricks Apps (2024) is newer; not the Foundry-class write-back pattern." },
  { solution: "Databricks Data Intelligence Platform", capability: "NOTEBOOK-ANALYTICS", delivery_strength: "native" },

  // Snowflake AI Data Cloud
  { solution: "Snowflake AI Data Cloud", capability: "LAKEHOUSE-STORAGE", delivery_strength: "native", notes: "Managed Iceberg tables and Polaris catalog." },
  { solution: "Snowflake AI Data Cloud", capability: "DATA-PIPELINE-ORCH", delivery_strength: "native", notes: "Snowpark, Tasks, Streams, Dynamic Tables." },
  { solution: "Snowflake AI Data Cloud", capability: "SEMANTIC-MODELING", delivery_strength: "partial", notes: "Cortex Analyst semantic model is newer; less mature than Unity Catalog metrics or Foundry ontology." },
  { solution: "Snowflake AI Data Cloud", capability: "ML-LIFECYCLE", delivery_strength: "partial", notes: "Snowflake ML and Model Registry available but maturing." },
  { solution: "Snowflake AI Data Cloud", capability: "LLM-ORCH", delivery_strength: "partial", notes: "Cortex LLM functions and Cortex Search; agent orchestration is GA but less differentiated." },
  { solution: "Snowflake AI Data Cloud", capability: "UNIFIED-GOV-CATALOG", delivery_strength: "native", notes: "Horizon Catalog." },
  { solution: "Snowflake AI Data Cloud", capability: "OPERATIONAL-DATA-APPS", delivery_strength: "partial", notes: "Streamlit in Snowflake; Native Apps Framework targets ISVs more than internal ops." },
  { solution: "Snowflake AI Data Cloud", capability: "NOTEBOOK-ANALYTICS", delivery_strength: "partial", notes: "Snowflake Notebooks GA 2024; lighter than Databricks notebooks." },

  // Microsoft Fabric
  { solution: "Microsoft Fabric", capability: "LAKEHOUSE-STORAGE", delivery_strength: "native", notes: "OneLake (Delta-Parquet) as the unified storage layer." },
  { solution: "Microsoft Fabric", capability: "DATA-PIPELINE-ORCH", delivery_strength: "native", notes: "Data Factory pipelines and Dataflow Gen2 in Fabric." },
  { solution: "Microsoft Fabric", capability: "SEMANTIC-MODELING", delivery_strength: "native", notes: "Power BI semantic models surface across Fabric workloads." },
  { solution: "Microsoft Fabric", capability: "ML-LIFECYCLE", delivery_strength: "native", notes: "Fabric Data Science workload integrated with Azure ML." },
  { solution: "Microsoft Fabric", capability: "LLM-ORCH", delivery_strength: "native", notes: "AI Foundry tier and Copilot integration across Fabric." },
  { solution: "Microsoft Fabric", capability: "UNIFIED-GOV-CATALOG", delivery_strength: "native", notes: "Purview integration for catalog and lineage." },
  { solution: "Microsoft Fabric", capability: "OPERATIONAL-DATA-APPS", delivery_strength: "partial", notes: "Power Apps integration is via_extension flavoured; not native to Fabric workspaces." },
  { solution: "Microsoft Fabric", capability: "NOTEBOOK-ANALYTICS", delivery_strength: "native", notes: "Fabric Notebooks with PySpark and T-SQL." },

  // Google Cloud Data and AI
  { solution: "Google Cloud Data and AI", capability: "LAKEHOUSE-STORAGE", delivery_strength: "native", notes: "BigLake unified storage over Iceberg and Hudi." },
  { solution: "Google Cloud Data and AI", capability: "DATA-PIPELINE-ORCH", delivery_strength: "native", notes: "Dataflow, Dataform, Cloud Composer, BigQuery streaming." },
  { solution: "Google Cloud Data and AI", capability: "SEMANTIC-MODELING", delivery_strength: "partial", notes: "Looker LookML is mature for BI; cross-workload semantic layer less unified." },
  { solution: "Google Cloud Data and AI", capability: "ML-LIFECYCLE", delivery_strength: "native", notes: "Vertex AI training, pipelines, model registry, serving, monitoring." },
  { solution: "Google Cloud Data and AI", capability: "LLM-ORCH", delivery_strength: "native", notes: "Vertex AI Agent Builder, Gemini, Model Garden, embedding APIs." },
  { solution: "Google Cloud Data and AI", capability: "UNIFIED-GOV-CATALOG", delivery_strength: "native", notes: "Dataplex catalog, lineage, profiling, and quality." },
  { solution: "Google Cloud Data and AI", capability: "OPERATIONAL-DATA-APPS", delivery_strength: "partial", notes: "AppSheet integration; not a Foundry-class write-back pattern out of the box." },
  { solution: "Google Cloud Data and AI", capability: "NOTEBOOK-ANALYTICS", delivery_strength: "native", notes: "Colab Enterprise and BigQuery Notebooks." },

  // Amazon SageMaker Unified Studio
  { solution: "Amazon SageMaker Unified Studio", capability: "LAKEHOUSE-STORAGE", delivery_strength: "native", notes: "S3 + Lake Formation + Iceberg as the unified storage." },
  { solution: "Amazon SageMaker Unified Studio", capability: "DATA-PIPELINE-ORCH", delivery_strength: "native", notes: "Glue, MWAA, EMR, Kinesis." },
  { solution: "Amazon SageMaker Unified Studio", capability: "SEMANTIC-MODELING", delivery_strength: "partial", notes: "Athena and QuickSight metrics; no unified semantic layer across the stack." },
  { solution: "Amazon SageMaker Unified Studio", capability: "ML-LIFECYCLE", delivery_strength: "native", notes: "SageMaker training, model registry, endpoints, model monitor." },
  { solution: "Amazon SageMaker Unified Studio", capability: "LLM-ORCH", delivery_strength: "native", notes: "Bedrock for foundation models, agents, and guardrails." },
  { solution: "Amazon SageMaker Unified Studio", capability: "UNIFIED-GOV-CATALOG", delivery_strength: "native", notes: "DataZone + Lake Formation + Glue Data Catalog." },
  { solution: "Amazon SageMaker Unified Studio", capability: "OPERATIONAL-DATA-APPS", delivery_strength: "partial", notes: "QuickSight Q and Bedrock Agents; not a Foundry-class app framework." },
  { solution: "Amazon SageMaker Unified Studio", capability: "NOTEBOOK-ANALYTICS", delivery_strength: "native", notes: "SageMaker Studio notebooks and JupyterLab." },

  // IBM watsonx
  { solution: "IBM watsonx", capability: "LAKEHOUSE-STORAGE", delivery_strength: "native", notes: "watsonx.data with open Iceberg and Presto/Spark engines." },
  { solution: "IBM watsonx", capability: "DATA-PIPELINE-ORCH", delivery_strength: "native", notes: "DataStage / Data Replication / DataFlow inside Cloud Pak for Data." },
  { solution: "IBM watsonx", capability: "SEMANTIC-MODELING", delivery_strength: "partial", notes: "Cognos and watsonx.data modelling; no unified semantic layer across watsonx.ai." },
  { solution: "IBM watsonx", capability: "ML-LIFECYCLE", delivery_strength: "native", notes: "watsonx.ai studio, model deployment spaces, factsheets." },
  { solution: "IBM watsonx", capability: "LLM-ORCH", delivery_strength: "native", notes: "Granite foundation models, prompt lab, vector index, AI agents." },
  { solution: "IBM watsonx", capability: "UNIFIED-GOV-CATALOG", delivery_strength: "native", notes: "watsonx.governance plus Knowledge Catalog (Cloud Pak for Data)." },
  { solution: "IBM watsonx", capability: "OPERATIONAL-DATA-APPS", delivery_strength: "partial", notes: "watsonx Assistant and Orchestrate are conversational/agentic, not data-app oriented." },
  { solution: "IBM watsonx", capability: "NOTEBOOK-ANALYTICS", delivery_strength: "native", notes: "Watson Studio notebooks." },

  // SAP Business Data Cloud
  { solution: "SAP Business Data Cloud", capability: "LAKEHOUSE-STORAGE", delivery_strength: "native", notes: "Databricks lakehouse OEM under SAP BDC." },
  { solution: "SAP Business Data Cloud", capability: "DATA-PIPELINE-ORCH", delivery_strength: "native", notes: "Datasphere flows plus Databricks pipelines." },
  { solution: "SAP Business Data Cloud", capability: "SEMANTIC-MODELING", delivery_strength: "native", notes: "SAP semantic models (BW, Datasphere) are the flagship differentiator." },
  { solution: "SAP Business Data Cloud", capability: "ML-LIFECYCLE", delivery_strength: "partial", notes: "Delegated mostly to the Databricks OEM tier." },
  { solution: "SAP Business Data Cloud", capability: "LLM-ORCH", delivery_strength: "partial", notes: "Joule provides AI copilots into SAP business processes; not a broad LLM-orch platform." },
  { solution: "SAP Business Data Cloud", capability: "UNIFIED-GOV-CATALOG", delivery_strength: "native", notes: "Datasphere catalog and lineage." },
  { solution: "SAP Business Data Cloud", capability: "OPERATIONAL-DATA-APPS", delivery_strength: "partial", notes: "Tight integration with SAP business apps; not a generic operational-app builder." },
  { solution: "SAP Business Data Cloud", capability: "NOTEBOOK-ANALYTICS", delivery_strength: "partial", notes: "Via the embedded Databricks tier." },

  // Cloudera Data Platform
  { solution: "Cloudera Data Platform", capability: "LAKEHOUSE-STORAGE", delivery_strength: "native", notes: "Iceberg-based Open Data Lakehouse." },
  { solution: "Cloudera Data Platform", capability: "DATA-PIPELINE-ORCH", delivery_strength: "native", notes: "Cloudera DataFlow (NiFi), Spark, Flink." },
  { solution: "Cloudera Data Platform", capability: "SEMANTIC-MODELING", delivery_strength: "partial" },
  { solution: "Cloudera Data Platform", capability: "ML-LIFECYCLE", delivery_strength: "native", notes: "Cloudera Machine Learning (CML)." },
  { solution: "Cloudera Data Platform", capability: "LLM-ORCH", delivery_strength: "partial", notes: "AI Inference Service and Applied ML Prototypes; less mature than hyperscalers." },
  { solution: "Cloudera Data Platform", capability: "UNIFIED-GOV-CATALOG", delivery_strength: "native", notes: "Shared Data Experience (SDX) with Atlas and Ranger." },
  { solution: "Cloudera Data Platform", capability: "OPERATIONAL-DATA-APPS", delivery_strength: "not_supported", notes: "Not a target use case for CDP." },
  { solution: "Cloudera Data Platform", capability: "NOTEBOOK-ANALYTICS", delivery_strength: "native", notes: "CML notebooks." },

  // Dataiku
  { solution: "Dataiku", capability: "LAKEHOUSE-STORAGE", delivery_strength: "not_supported", notes: "Dataiku does not provide its own storage; reads/writes customer-owned lakehouses." },
  { solution: "Dataiku", capability: "DATA-PIPELINE-ORCH", delivery_strength: "native", notes: "Visual Flow and code recipes." },
  { solution: "Dataiku", capability: "SEMANTIC-MODELING", delivery_strength: "partial" },
  { solution: "Dataiku", capability: "ML-LIFECYCLE", delivery_strength: "native", notes: "Visual ML, AutoML, model deployment, monitoring." },
  { solution: "Dataiku", capability: "LLM-ORCH", delivery_strength: "native", notes: "LLM Mesh routes generative-AI traffic with cost, audit, safety controls." },
  { solution: "Dataiku", capability: "UNIFIED-GOV-CATALOG", delivery_strength: "partial", notes: "Govern node provides project-level governance; not a generic catalog." },
  { solution: "Dataiku", capability: "OPERATIONAL-DATA-APPS", delivery_strength: "native", notes: "Dataiku Apps and Webapps with write-back to source systems." },
  { solution: "Dataiku", capability: "NOTEBOOK-ANALYTICS", delivery_strength: "native", notes: "Jupyter notebooks alongside Visual Flow." },
];

// ============================================================
// RUN
// ============================================================
async function main() {
  console.log("\n=== Domains ===");
  const domainMap = await syncTable("/domains", newDomains.map(d => ({ ...d })), "domain_code");

  const allDomainsRaw = await get("/domains?select=id,domain_code&limit=10000");
  const allDomainMap = new Map<string, number>();
  for (const d of allDomainsRaw) allDomainMap.set(String(d.domain_code), Number(d.id));

  console.log("\n=== Capabilities ===");
  const capRows = capabilities.map(c => ({
    capability_code: c.capability_code,
    capability_name: c.capability_name,
    description: c.description,
  }));
  const capMap = await syncTable("/capabilities", capRows, "capability_code");

  console.log("\n=== capability_domains junctions ===");
  const existingCapDomLinks = await get("/capability_domains?select=capability_id,domain_id&limit=10000");
  const existingCapDomSet = new Set(existingCapDomLinks.map(r => `${r.capability_id}:${r.domain_id}`));
  const newCapDomRows: Row[] = [];
  for (const c of capabilities) {
    const cid = capMap.get(c.capability_code)!;
    const did = allDomainMap.get(c.domain)!;
    const key = `${cid}:${did}`;
    if (existingCapDomSet.has(key)) continue;
    newCapDomRows.push({ capability_id: cid, domain_id: did, notes: "" });
  }
  if (newCapDomRows.length > 0) {
    console.log(`  inserting ${newCapDomRows.length} capability_domains rows`);
    await insert("/capability_domains", newCapDomRows);
  } else {
    console.log("  no new capability_domains rows");
  }

  console.log("\n=== Vendors ===");
  const vendorMap = await syncTable("/vendors", vendors.map(v => ({ ...v })), "vendor_name");
  const fullVendorsRaw = await get("/vendors?select=id,vendor_name&limit=10000");
  for (const v of fullVendorsRaw) vendorMap.set(String(v.vendor_name), Number(v.id));

  console.log("\n=== Solutions ===");
  const solutionRows = solutions.map(s => {
    const vendorId = vendorMap.get(s.vendor);
    if (!vendorId) throw new Error(`Vendor not found for solution ${s.solution_name}: ${s.vendor}`);
    return {
      solution_name: s.solution_name,
      description: s.description,
      solution_url: "",
      vendor_id: vendorId,
      solution_type: s.solution_type,
      is_active_in_market: true,
      notes: s.notes ?? "",
    };
  });
  const solutionMap = await syncTable("/solutions", solutionRows, "solution_name");

  console.log("\n=== solution_domains junctions ===");
  const existingSolDomLinks = await get("/solution_domains?select=solution_id,domain_id,coverage_level&limit=10000");
  const existingSolDomSet = new Set(existingSolDomLinks.map(r => `${r.solution_id}:${r.domain_id}:${r.coverage_level}`));
  const newSolDomRows: Row[] = [];
  let skippedSolDom = 0;
  for (const s of solutions) {
    const sid = solutionMap.get(s.solution_name)!;
    const buildLink = (code: string, coverage: "primary" | "secondary" | "partial") => {
      const did = allDomainMap.get(code);
      if (!did) { console.warn(`  ! domain ${code} not found for ${s.solution_name}`); return; }
      const key = `${sid}:${did}:${coverage}`;
      if (existingSolDomSet.has(key)) { skippedSolDom++; return; }
      existingSolDomSet.add(key);
      newSolDomRows.push({ solution_id: sid, domain_id: did, coverage_level: coverage, notes: "" });
    };
    for (const code of s.primary ?? []) buildLink(code, "primary");
    for (const code of s.secondary ?? []) buildLink(code, "secondary");
    for (const code of s.partial ?? []) buildLink(code, "partial");
  }
  if (newSolDomRows.length > 0) {
    console.log(`  inserting ${newSolDomRows.length} solution_domains rows (${skippedSolDom} already present)`);
    await insert("/solution_domains", newSolDomRows);
  } else {
    console.log(`  no new solution_domains rows (${skippedSolDom} already present)`);
  }

  console.log("\n=== solution_capabilities junctions ===");
  const existingSolCapLinks = await get("/solution_capabilities?select=solution_id,capability_id&limit=10000");
  const existingSolCapSet = new Set(existingSolCapLinks.map(r => `${r.solution_id}:${r.capability_id}`));
  const newSolCapRows: Row[] = [];
  let skippedSolCap = 0;
  for (const sc of solCaps) {
    const sid = solutionMap.get(sc.solution);
    const cid = capMap.get(sc.capability);
    if (!sid) throw new Error(`Solution not found: ${sc.solution}`);
    if (!cid) throw new Error(`Capability not found: ${sc.capability}`);
    const key = `${sid}:${cid}`;
    if (existingSolCapSet.has(key)) { skippedSolCap++; continue; }
    existingSolCapSet.add(key);
    newSolCapRows.push({
      solution_id: sid,
      capability_id: cid,
      delivery_strength: sc.delivery_strength,
      notes: sc.notes ?? "",
    });
  }
  if (newSolCapRows.length > 0) {
    console.log(`  inserting ${newSolCapRows.length} solution_capabilities rows (${skippedSolCap} already present)`);
    await insert("/solution_capabilities", newSolCapRows);
  } else {
    console.log(`  no new solution_capabilities rows (${skippedSolCap} already present)`);
  }

  // ===== Final counts (DATA-AI-PLAT scope) =====
  const newDomainId = allDomainMap.get("DATA-AI-PLAT");
  const counts = {
    domains_total: (await get("/domains?select=id&limit=10000")).length,
    capabilities_total: (await get("/capabilities?select=id&limit=10000")).length,
    capability_domains_total: (await get("/capability_domains?select=capability_id&limit=10000")).length,
    vendors_total: (await get("/vendors?select=id&limit=10000")).length,
    solutions_total: (await get("/solutions?select=id&limit=10000")).length,
    solution_domains_total: (await get("/solution_domains?select=solution_id&limit=10000")).length,
    solution_capabilities_total: (await get("/solution_capabilities?select=solution_id&limit=10000")).length,
    data_ai_plat_solution_domains: (await get(`/solution_domains?domain_id=eq.${newDomainId}&select=solution_id&limit=10000`)).length,
    data_ai_plat_capability_domains: (await get(`/capability_domains?domain_id=eq.${newDomainId}&select=capability_id&limit=10000`)).length,
  };
  console.log("\n=== Final counts ===");
  console.log(JSON.stringify(counts, null, 2));
}

await main();
