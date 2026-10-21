#!/usr/bin/env bun
// Phase A for METRICS-LAYER (Metrics Layer / Headless BI) + KGP (Knowledge Graph Platform).
// Loads 2 domains, 12 new capabilities (6 + 6), 12 new vendors, 13 new solutions,
// 16 capability_domains rows (incl. SEMANTIC-MODELING + OPERATIONAL-DATA-APPS extensions),
// 16 solution_domains, full delivery_strength matrix.

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> { return call({ method: "GET", path }); }

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    out.push(...await call({ method: "POST", path, body: slice }));
  }
  return out;
}

async function syncTable<T extends Row>(
  path: string, rows: T[], keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=20000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new rows into ${path} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: nothing new`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=20000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// =========================================================================
// DOMAINS
// =========================================================================
type DomainRow = {
  domain_code: string; domain_name: string; description: string;
  crud_percentage: number; business_logic: string;
  min_org_size: string; cost_band: string;
  certification_required: boolean;
  usa_market_size_usd_m: number; market_size_source_year: number;
};

function validateDomainRow(d: DomainRow): void {
  const errs: string[] = [];
  if (!d.domain_code || !d.domain_name || !d.description) errs.push("required text empty");
  if (d.crud_percentage === 0) errs.push("crud_percentage is 0");
  if (d.crud_percentage < 0 || d.crud_percentage > 100) errs.push("crud_percentage out of range");
  if (!d.min_org_size || !d.cost_band) errs.push("size/cost band empty");
  if (d.business_logic === "" && d.crud_percentage < 95) errs.push("business_logic empty but crud_percentage < 95");
  if (d.usa_market_size_usd_m === 0) errs.push("usa_market_size_usd_m is 0");
  if (d.market_size_source_year === 0) errs.push("market_size_source_year is 0");
  if (errs.length > 0) throw new Error(`Domain ${d.domain_code} failed validation: ${errs.join("; ")}`);
}

const newDomains: DomainRow[] = [
  {
    domain_code: "METRICS-LAYER",
    domain_name: "Metrics Layer / Headless BI",
    description:
      "Lightweight semantic tier defining metrics, dimensions, and entity relationships once, then exposing them via SQL/REST/GraphQL/MDX/JDBC to any downstream consumer: BI dashboards, AI agents, embedded analytics, custom apps. Distinct from BI (no UI / dashboard surface), from DI (no data movement), from DCG (no broader governance scope), and from DATA-AI-PLAT (a *feature* within those platforms, sold separately by pure-play vendors). Buyer: analytics / data-engineering leader. Vendors: AtScale, Cube, dbt Semantic Layer, Lightdash, Honeydew, GoodData.CN, Looker (LookML as a precursor).",
    crud_percentage: 60,
    business_logic:
      "Compilation of declarative semantic models into SQL query plans; multi-dimensional caching and aggregation with intelligent invalidation; query federation across warehouses and lakehouses; lineage propagation from physical sources to logical metrics; fine-grained access control at the metric/dimension level; AI-agent tool-use over the metric registry; natural-language-to-metric translation.",
    min_org_size: "30 m <2500",
    cost_band: "$$",
    certification_required: false,
    usa_market_size_usd_m: 300,
    market_size_source_year: 2025,
  },
  {
    domain_code: "KGP",
    domain_name: "Knowledge Graph Platform",
    description:
      "Enterprise platform for modeling, storing, querying, and reasoning over typed business objects via formal ontologies (OWL / RDF / SHACL) or labeled property graphs. Includes ontology authoring, inference, SPARQL/Cypher querying, virtual-graph federation, and operational-app affordances on top of the graph store. Buyer: enterprise architect / CDO / life-sciences R&D lead. Primary JTBD: build AI agents, operational apps, and complex analytical queries on top of a unified semantic model. Distinct from MDM (master-data orchestration without ontology engine), from DATA-AI-PLAT (broader scope including pipelines / lakehouse / ML), and from a plain graph database (KGP adds reasoning, ontology governance, and ontology-mapped operational-app affordances). Vendors: Stardog, TopBraid EDG, Anzo (Cambridge Semantics / Altair / Siemens), Metaphacts, Ontotext GraphDB, Franz AllegroGraph, Neo4j, Palantir Foundry (cross-listed from DATA-AI-PLAT).",
    crud_percentage: 50,
    business_logic:
      "OWL reasoning (RDFS, OWL-EL, OWL-RL, OWL-DL); SHACL constraint validation; SPARQL 1.1 query optimization with federation across remote endpoints; virtual-graph projection of relational/JSON sources as RDF; named-graph access control; hybrid vector+symbolic search for RAG; embedding generation and similarity over graph neighborhoods; provenance and lineage tracking; rule-based inference engines beyond OWL.",
    min_org_size: "40 l <10000",
    cost_band: "$$$",
    certification_required: false,
    usa_market_size_usd_m: 400,
    market_size_source_year: 2025,
  },
];

for (const d of newDomains) validateDomainRow(d);

// =========================================================================
// CAPABILITIES
// =========================================================================
type CapRow = { capability_code: string; capability_name: string; description: string };

const metricsCaps: CapRow[] = [
  { capability_code: "METRICS-DEF", capability_name: "Centralized Metric Definitions",
    description: "Canonical registry of metric definitions (numerator, denominator, filters, dimensions) authored once and reused everywhere. Includes versioning, certification status, ownership, and lineage from physical sources up to logical metrics consumed by BI tools and AI agents." },
  { capability_code: "METRICS-DIMENSIONAL-MODEL", capability_name: "Semantic Dimensional Modeling",
    description: "Logical model of entities, dimensions, hierarchies, and relationships decoupled from physical tables. Supports star/snowflake schemas, conformed dimensions across fact tables, slowly-changing-dimension handling, and graph-style entity relationships." },
  { capability_code: "METRICS-GOVERNANCE", capability_name: "Metric Governance and Change Control",
    description: "Approval workflows for metric definition changes, deprecation policies, impact analysis on downstream consumers, certified vs. draft labeling, and metric-level data-contract enforcement between producers and consumers." },
  { capability_code: "METRICS-QUERY-FEDERATION", capability_name: "Cross-Source Query Federation",
    description: "Single semantic model querying multiple physical sources (Snowflake + Postgres + S3 + REST APIs) through one query interface. Push-down optimization to each backend, federated join planning, and per-source credential handling." },
  { capability_code: "METRICS-CACHE-OPT", capability_name: "Performance Caching and Acceleration",
    description: "Intelligent aggregate caching, materialized-view selection, query rewriting against cached aggregates, and automatic cache invalidation when underlying data or models change. The acceleration tier that lets pure-play metric layers compete with native warehouse compute on latency." },
  { capability_code: "METRICS-API-DELIVERY", capability_name: "Multi-Protocol Metric Delivery",
    description: "Exposing the semantic layer through multiple protocols simultaneously: SQL (for BI tools), REST/GraphQL (for apps), MDX (for Excel and legacy BI), JDBC/ODBC (for enterprise integration). One model, many consumption surfaces." },
  { capability_code: "METRICS-AI-CONSUMPTION", capability_name: "AI-Native Metric Consumption",
    description: "LLM tool-use over the metric registry: natural-language-to-metric translation with deterministic grounding, agent function-calling against certified metrics, RAG retrieval that joins narrative context with quantitative metrics. The 2024+ wedge that headless-BI vendors are racing to ship." },
];

const kgpCaps: CapRow[] = [
  { capability_code: "KG-ONTOLOGY-AUTHORING", capability_name: "Ontology Authoring and Validation",
    description: "Visual and code-based authoring of OWL/RDF ontologies (or labeled property graph schemas), namespace and prefix management, change control with versioning, SHACL constraint authoring, and ontology-quality reporting. The 'modeling studio' tier of a KGP." },
  { capability_code: "KG-REASONING-INFERENCE", capability_name: "Reasoning and Inference",
    description: "OWL-RL / OWL-EL / OWL-DL reasoning engines, RDFS entailment, rule-based inference (SWRL or vendor-specific), materialized vs. on-query inference modes. Distinguishes KGP from plain graph storage: the system infers triples not explicitly asserted." },
  { capability_code: "KG-SPARQL-FEDERATION", capability_name: "SPARQL Query and Federation",
    description: "SPARQL 1.1 endpoint with query optimization, SPARQL federation across multiple remote endpoints via SERVICE clauses, named-graph access control, and full-text search integration over literals." },
  { capability_code: "KG-VIRTUAL-GRAPHS", capability_name: "Virtual Graph / Data Virtualization",
    description: "Query relational, document, and API sources as if they were native RDF graphs, without ETL into the triplestore. R2RML / RML mapping, on-query SPARQL-to-SQL translation, and federated querying that mixes virtual and materialized graphs in one query." },
  { capability_code: "KG-AI-AGENT-INTEGRATION", capability_name: "AI Agent and LLM Integration",
    description: "Hybrid vector+symbolic search joining graph embeddings with structured graph queries, LLM tool-use over the graph (entity lookup, neighborhood traversal, reasoning), and ontology-grounded RAG that constrains LLM outputs to typed entities and relationships." },
  { capability_code: "KG-NATIVE-STORAGE", capability_name: "Native Graph Storage",
    description: "Native triplestore (RDF) or labeled-property-graph storage tier with high-scale persistence, transaction support, replication, and backup. Distinct from KG features bolted onto a relational DB: the storage engine is purpose-built for graph workloads." },
];

const allNewCaps = [...metricsCaps, ...kgpCaps];

// =========================================================================
// VENDORS — new (12)
// =========================================================================
const newVendors = [
  // METRICS-LAYER vendors
  { vendor_name: "AtScale Inc.", vendor_url: "https://www.atscale.com", headquarters_country: "USA", description: "Semantic layer / metrics platform built for analytics on cloud warehouses, with MDX/SQL/REST endpoints and AI-native consumption.", notes: "Founded 2013, HQ San Mateo CA. Private; Series E." },
  { vendor_name: "Cube Dev Inc.", vendor_url: "https://cube.dev", headquarters_country: "USA", description: "Open-source headless BI and semantic layer over cloud warehouses; Cube Cloud is the managed SaaS tier.", notes: "Founded 2019, HQ San Francisco. Apache-licensed core." },
  { vendor_name: "Lightdash Inc.", vendor_url: "https://www.lightdash.com", headquarters_country: "UK / USA", description: "Open-source BI built on dbt; metric definitions live in dbt YAML, surfaced as a no-code analytics UI.", notes: "Founded 2021, HQ London / San Francisco. MIT-licensed core." },
  { vendor_name: "Honeydew Data Inc.", vendor_url: "https://honeydew.ai", headquarters_country: "USA / Israel", description: "Headless BI / semantic-layer platform with strong AI-agent and SQL-first authoring.", notes: "Founded 2022." },
  { vendor_name: "GoodData Corporation", vendor_url: "https://www.gooddata.com", headquarters_country: "USA / Czech Republic", description: "Analytics platform with a headless-BI tier (GoodData.CN) emphasising embedded analytics, semantic-layer governance, and multi-tenant data products.", notes: "Founded 2007, HQ San Francisco / Prague." },
  // KGP vendors
  { vendor_name: "Stardog Union Inc.", vendor_url: "https://www.stardog.com", headquarters_country: "USA", description: "Enterprise knowledge graph platform with reasoning, virtual graphs, and AI integration (Stardog Voicebox).", notes: "Founded 2015, HQ Arlington VA. Private; Series B." },
  { vendor_name: "TopQuadrant Inc.", vendor_url: "https://www.topquadrant.com", headquarters_country: "USA", description: "Ontology-engineering and knowledge-graph governance specialist. TopBraid Composer (modeling) + TopBraid EDG (enterprise data governance) flagship suite.", notes: "Founded 2001, HQ Raleigh NC. Standards-active in W3C." },
  { vendor_name: "Metaphacts GmbH", vendor_url: "https://metaphacts.com", headquarters_country: "Germany", description: "Knowledge graph platform with emphasis on FAIR data, cultural-heritage and life-sciences customers; metaphactory product.", notes: "Founded 2014, HQ Walldorf." },
  { vendor_name: "Ontotext AD", vendor_url: "https://www.ontotext.com", headquarters_country: "Bulgaria", description: "RDF triplestore and semantic-platform vendor; GraphDB is the flagship product.", notes: "Founded 2000, HQ Sofia. Part of Sirma Group." },
  { vendor_name: "Franz Inc.", vendor_url: "https://franz.com", headquarters_country: "USA", description: "AllegroGraph multi-modal graph database with reasoning, document store, and vector capabilities; longstanding Common Lisp / AI heritage.", notes: "Founded 1984, HQ Oakland CA. Privately held." },
  { vendor_name: "Neo4j Inc.", vendor_url: "https://neo4j.com", headquarters_country: "USA / Sweden", description: "Native graph database vendor; flagship Neo4j (open-source + commercial), plus AuraDB (managed) and graph-data-science library. KG positioning emphasized via Neo4j Knowledge Graph for AI.", notes: "Founded 2007, HQ San Mateo / Malmö. Private, Series F." },
];

// =========================================================================
// SOLUTIONS — new (13)
// =========================================================================
type SolDraft = { solution_name: string; vendor_natural: string; description: string };

const newSolutions: SolDraft[] = [
  // METRICS-LAYER
  { solution_name: "AtScale", vendor_natural: "AtScale Inc.", description: "Universal semantic layer over Snowflake / Databricks / BigQuery / Redshift, exposing metrics via SQL / MDX / REST / DAX for BI tools, Excel, and AI agents." },
  { solution_name: "Cube Cloud", vendor_natural: "Cube Dev Inc.", description: "Managed headless-BI tier of the open-source Cube semantic layer. SQL/REST/GraphQL/MDX delivery; multi-tenant; AI-tools-first roadmap." },
  { solution_name: "dbt Semantic Layer", vendor_natural: "dbt Labs", description: "Semantic-layer tier of dbt Cloud built on the Transform.co MetricFlow acquisition. Metric definitions live alongside dbt models; consumed via SQL / GraphQL / Python from BI tools and notebooks." },
  { solution_name: "Lightdash", vendor_natural: "Lightdash Inc.", description: "Open-source BI built on dbt. Metric definitions live in dbt YAML; Lightdash provides the no-code analytics, exploration, and dashboard layer plus an LLM-integration tier." },
  { solution_name: "Honeydew", vendor_natural: "Honeydew Data Inc.", description: "Headless BI / semantic-layer platform emphasising SQL-first metric authoring, lineage, and deterministic AI-agent consumption." },
  { solution_name: "GoodData.CN", vendor_natural: "GoodData Corporation", description: "Cloud-native headless BI tier emphasising embedded analytics, multi-tenant data products, and semantic-layer governance. Distinct from the older GoodData Platform." },
  // KGP
  { solution_name: "Stardog Platform", vendor_natural: "Stardog Union Inc.", description: "Enterprise knowledge graph platform: RDF triplestore + reasoning + virtual graphs + Voicebox (natural-language-to-SPARQL agent). Federal, life-sciences, manufacturing accounts." },
  { solution_name: "TopBraid EDG", vendor_natural: "TopQuadrant Inc.", description: "Enterprise Data Governance suite built on a knowledge-graph foundation. Ontology authoring (TopBraid Composer), data-asset catalog, glossary, and lineage with formal RDF/OWL semantics." },
  { solution_name: "Anzo", vendor_natural: "Siemens", description: "Knowledge graph platform from Cambridge Semantics, acquired by Altair in 2024 and now part of Siemens after the Altair-Siemens deal closed in 2025. Onboard-anything graph onboarding, GraphMart caching, semantic data fabric for life sciences and financial services." },
  { solution_name: "Metaphacts Platform", vendor_natural: "Metaphacts GmbH", description: "Knowledge graph platform (metaphactory) with strong life-sciences, pharma, and cultural-heritage adoption. FAIR-data emphasis, ontology-driven UIs, federated SPARQL." },
  { solution_name: "GraphDB", vendor_natural: "Ontotext AD", description: "Standards-compliant RDF triplestore with reasoning (RDFS / OWL-Horst / OWL2-RL), GeoSPARQL, full-text search, and connectors for Elasticsearch / Solr. Heavy media / publishing / pharma adoption." },
  { solution_name: "AllegroGraph", vendor_natural: "Franz Inc.", description: "Multi-modal graph database combining RDF triples, document store, vector embeddings, and reasoning. SPARQL + Prolog rules + LLM integration via Allegrograph Cloud." },
  { solution_name: "Neo4j Knowledge Graph", vendor_natural: "Neo4j Inc.", description: "Knowledge-graph positioning of the Neo4j platform: native labeled-property-graph storage + graph-data-science library + LangChain / LlamaIndex integrations for GraphRAG and AI agents." },
];

// =========================================================================
// CAPABILITY → DOMAIN
// =========================================================================
const newCapDomains: { cap: string; domain: string }[] = [
  ...metricsCaps.map(c => ({ cap: c.capability_code, domain: "METRICS-LAYER" })),
  ...kgpCaps.map(c => ({ cap: c.capability_code, domain: "KGP" })),
];

// Cross-cutting extensions
const crossCuttingExtensions: { cap: string; domain: string }[] = [
  { cap: "SEMANTIC-MODELING", domain: "METRICS-LAYER" },
  { cap: "SEMANTIC-MODELING", domain: "KGP" },
  { cap: "OPERATIONAL-DATA-APPS", domain: "KGP" },
];

// =========================================================================
// SOLUTION → DOMAIN
// =========================================================================
type SolDom = { solution: string; domain: string; coverage: "primary" | "secondary" | "partial" };

const solDoms: SolDom[] = [
  // METRICS-LAYER
  { solution: "AtScale", domain: "METRICS-LAYER", coverage: "primary" },
  { solution: "Cube Cloud", domain: "METRICS-LAYER", coverage: "primary" },
  { solution: "dbt Semantic Layer", domain: "METRICS-LAYER", coverage: "primary" },
  { solution: "Lightdash", domain: "METRICS-LAYER", coverage: "primary" },
  { solution: "Honeydew", domain: "METRICS-LAYER", coverage: "primary" },
  { solution: "GoodData.CN", domain: "METRICS-LAYER", coverage: "primary" },
  { solution: "Looker", domain: "METRICS-LAYER", coverage: "secondary" }, // existing — LookML

  // KGP
  { solution: "Stardog Platform", domain: "KGP", coverage: "primary" },
  { solution: "TopBraid EDG", domain: "KGP", coverage: "primary" },
  { solution: "Anzo", domain: "KGP", coverage: "primary" },
  { solution: "Metaphacts Platform", domain: "KGP", coverage: "primary" },
  { solution: "GraphDB", domain: "KGP", coverage: "primary" },
  { solution: "AllegroGraph", domain: "KGP", coverage: "primary" },
  { solution: "Neo4j Knowledge Graph", domain: "KGP", coverage: "primary" },
  { solution: "Palantir Foundry", domain: "KGP", coverage: "secondary" }, // existing
];

// =========================================================================
// SOLUTION → CAPABILITY (delivery_strength matrix)
// =========================================================================
type SolCap = { solution: string; capability: string; strength: "native" | "partial" | "via_extension" | "not_supported" };

const metricsCapList = ["METRICS-DEF", "METRICS-DIMENSIONAL-MODEL", "METRICS-GOVERNANCE", "METRICS-QUERY-FEDERATION", "METRICS-CACHE-OPT", "METRICS-API-DELIVERY", "METRICS-AI-CONSUMPTION", "SEMANTIC-MODELING"];
const kgpCapList = ["KG-ONTOLOGY-AUTHORING", "KG-REASONING-INFERENCE", "KG-SPARQL-FEDERATION", "KG-VIRTUAL-GRAPHS", "KG-AI-AGENT-INTEGRATION", "KG-NATIVE-STORAGE", "SEMANTIC-MODELING", "OPERATIONAL-DATA-APPS"];

const solCaps: SolCap[] = [
  // METRICS-LAYER solutions
  // AtScale — mature, all native; AI consumption native (Conversational AI launched 2024)
  ...metricsCapList.map(c => ({ solution: "AtScale", capability: c, strength: "native" as const })),
  // Cube Cloud — all native; AI consumption strong via tool-use APIs
  ...metricsCapList.map(c => ({ solution: "Cube Cloud", capability: c, strength: "native" as const })),
  // dbt Semantic Layer — all native; governance via dbt PR workflows
  { solution: "dbt Semantic Layer", capability: "METRICS-DEF", strength: "native" },
  { solution: "dbt Semantic Layer", capability: "METRICS-DIMENSIONAL-MODEL", strength: "native" },
  { solution: "dbt Semantic Layer", capability: "METRICS-GOVERNANCE", strength: "native" },
  { solution: "dbt Semantic Layer", capability: "METRICS-QUERY-FEDERATION", strength: "partial" }, // weaker outside warehouse
  { solution: "dbt Semantic Layer", capability: "METRICS-CACHE-OPT", strength: "partial" },
  { solution: "dbt Semantic Layer", capability: "METRICS-API-DELIVERY", strength: "native" }, // SQL + GraphQL + Python
  { solution: "dbt Semantic Layer", capability: "METRICS-AI-CONSUMPTION", strength: "partial" },
  { solution: "dbt Semantic Layer", capability: "SEMANTIC-MODELING", strength: "native" },
  // Lightdash — dbt-leaning; partial federation; AI tier emerging
  { solution: "Lightdash", capability: "METRICS-DEF", strength: "native" },
  { solution: "Lightdash", capability: "METRICS-DIMENSIONAL-MODEL", strength: "native" },
  { solution: "Lightdash", capability: "METRICS-GOVERNANCE", strength: "partial" },
  { solution: "Lightdash", capability: "METRICS-QUERY-FEDERATION", strength: "partial" },
  { solution: "Lightdash", capability: "METRICS-CACHE-OPT", strength: "partial" },
  { solution: "Lightdash", capability: "METRICS-API-DELIVERY", strength: "partial" },
  { solution: "Lightdash", capability: "METRICS-AI-CONSUMPTION", strength: "partial" },
  { solution: "Lightdash", capability: "SEMANTIC-MODELING", strength: "native" },
  // Honeydew — SQL-first authoring + strong AI agent grounding
  { solution: "Honeydew", capability: "METRICS-DEF", strength: "native" },
  { solution: "Honeydew", capability: "METRICS-DIMENSIONAL-MODEL", strength: "native" },
  { solution: "Honeydew", capability: "METRICS-GOVERNANCE", strength: "partial" },
  { solution: "Honeydew", capability: "METRICS-QUERY-FEDERATION", strength: "partial" },
  { solution: "Honeydew", capability: "METRICS-CACHE-OPT", strength: "partial" },
  { solution: "Honeydew", capability: "METRICS-API-DELIVERY", strength: "native" },
  { solution: "Honeydew", capability: "METRICS-AI-CONSUMPTION", strength: "native" }, // their differentiator
  { solution: "Honeydew", capability: "SEMANTIC-MODELING", strength: "native" },
  // GoodData.CN — full headless + governance heritage from old GoodData
  ...metricsCapList.map(c => ({ solution: "GoodData.CN", capability: c, strength: "native" as const })),
  // Looker (cross-listed) — LookML model + BI; AI Consumption partial via Looker Studio + Gemini
  { solution: "Looker", capability: "METRICS-DEF", strength: "native" },
  { solution: "Looker", capability: "METRICS-DIMENSIONAL-MODEL", strength: "native" },
  { solution: "Looker", capability: "METRICS-GOVERNANCE", strength: "native" },
  { solution: "Looker", capability: "METRICS-QUERY-FEDERATION", strength: "partial" },
  { solution: "Looker", capability: "METRICS-CACHE-OPT", strength: "native" },
  { solution: "Looker", capability: "METRICS-API-DELIVERY", strength: "partial" }, // SQL + REST; less multi-protocol than pure-plays
  { solution: "Looker", capability: "METRICS-AI-CONSUMPTION", strength: "partial" },
  { solution: "Looker", capability: "SEMANTIC-MODELING", strength: "native" },

  // KGP solutions
  // Stardog — all native (Voicebox = AI integration)
  ...kgpCapList.map(c => ({ solution: "Stardog Platform", capability: c, strength: "native" as const })),
  // TopBraid EDG — ontology authoring + governance flagship; storage native; AI integration emerging
  { solution: "TopBraid EDG", capability: "KG-ONTOLOGY-AUTHORING", strength: "native" }, // flagship
  { solution: "TopBraid EDG", capability: "KG-REASONING-INFERENCE", strength: "native" },
  { solution: "TopBraid EDG", capability: "KG-SPARQL-FEDERATION", strength: "native" },
  { solution: "TopBraid EDG", capability: "KG-VIRTUAL-GRAPHS", strength: "partial" },
  { solution: "TopBraid EDG", capability: "KG-AI-AGENT-INTEGRATION", strength: "partial" },
  { solution: "TopBraid EDG", capability: "KG-NATIVE-STORAGE", strength: "native" },
  { solution: "TopBraid EDG", capability: "SEMANTIC-MODELING", strength: "native" },
  { solution: "TopBraid EDG", capability: "OPERATIONAL-DATA-APPS", strength: "partial" },
  // Anzo (Cambridge Semantics) — all native; their differentiator is graph onboarding + GraphMart cache
  ...kgpCapList.map(c => ({ solution: "Anzo", capability: c, strength: "native" as const })),
  // Metaphacts Platform — ontology-driven UIs and FAIR-data emphasis
  { solution: "Metaphacts Platform", capability: "KG-ONTOLOGY-AUTHORING", strength: "native" },
  { solution: "Metaphacts Platform", capability: "KG-REASONING-INFERENCE", strength: "native" },
  { solution: "Metaphacts Platform", capability: "KG-SPARQL-FEDERATION", strength: "native" },
  { solution: "Metaphacts Platform", capability: "KG-VIRTUAL-GRAPHS", strength: "partial" },
  { solution: "Metaphacts Platform", capability: "KG-AI-AGENT-INTEGRATION", strength: "partial" },
  { solution: "Metaphacts Platform", capability: "KG-NATIVE-STORAGE", strength: "native" },
  { solution: "Metaphacts Platform", capability: "SEMANTIC-MODELING", strength: "native" },
  { solution: "Metaphacts Platform", capability: "OPERATIONAL-DATA-APPS", strength: "native" }, // ontology-driven UIs are their pitch
  // GraphDB (Ontotext) — standards-compliant triplestore + reasoning
  { solution: "GraphDB", capability: "KG-ONTOLOGY-AUTHORING", strength: "partial" },
  { solution: "GraphDB", capability: "KG-REASONING-INFERENCE", strength: "native" }, // OWL2-RL strong
  { solution: "GraphDB", capability: "KG-SPARQL-FEDERATION", strength: "native" },
  { solution: "GraphDB", capability: "KG-VIRTUAL-GRAPHS", strength: "partial" },
  { solution: "GraphDB", capability: "KG-AI-AGENT-INTEGRATION", strength: "partial" },
  { solution: "GraphDB", capability: "KG-NATIVE-STORAGE", strength: "native" },
  { solution: "GraphDB", capability: "SEMANTIC-MODELING", strength: "native" },
  { solution: "GraphDB", capability: "OPERATIONAL-DATA-APPS", strength: "partial" },
  // AllegroGraph (Franz) — multi-modal: RDF + document + vector + Prolog rules
  { solution: "AllegroGraph", capability: "KG-ONTOLOGY-AUTHORING", strength: "partial" },
  { solution: "AllegroGraph", capability: "KG-REASONING-INFERENCE", strength: "native" },
  { solution: "AllegroGraph", capability: "KG-SPARQL-FEDERATION", strength: "native" },
  { solution: "AllegroGraph", capability: "KG-VIRTUAL-GRAPHS", strength: "partial" },
  { solution: "AllegroGraph", capability: "KG-AI-AGENT-INTEGRATION", strength: "native" }, // vector + Prolog rules
  { solution: "AllegroGraph", capability: "KG-NATIVE-STORAGE", strength: "native" },
  { solution: "AllegroGraph", capability: "SEMANTIC-MODELING", strength: "native" },
  { solution: "AllegroGraph", capability: "OPERATIONAL-DATA-APPS", strength: "partial" },
  // Neo4j Knowledge Graph — labeled property graph (not strictly RDF), strong AI tooling
  { solution: "Neo4j Knowledge Graph", capability: "KG-ONTOLOGY-AUTHORING", strength: "partial" }, // LPG, not OWL
  { solution: "Neo4j Knowledge Graph", capability: "KG-REASONING-INFERENCE", strength: "partial" }, // limited vs OWL engines
  { solution: "Neo4j Knowledge Graph", capability: "KG-SPARQL-FEDERATION", strength: "via_extension" }, // n10s plugin
  { solution: "Neo4j Knowledge Graph", capability: "KG-VIRTUAL-GRAPHS", strength: "partial" },
  { solution: "Neo4j Knowledge Graph", capability: "KG-AI-AGENT-INTEGRATION", strength: "native" }, // LangChain / GraphRAG
  { solution: "Neo4j Knowledge Graph", capability: "KG-NATIVE-STORAGE", strength: "native" },
  { solution: "Neo4j Knowledge Graph", capability: "SEMANTIC-MODELING", strength: "partial" },
  { solution: "Neo4j Knowledge Graph", capability: "OPERATIONAL-DATA-APPS", strength: "partial" },
  // Palantir Foundry (cross-listed) — ontology layer competes here directly
  { solution: "Palantir Foundry", capability: "KG-ONTOLOGY-AUTHORING", strength: "native" }, // Foundry Ontology
  { solution: "Palantir Foundry", capability: "KG-REASONING-INFERENCE", strength: "partial" }, // not OWL-style reasoning
  { solution: "Palantir Foundry", capability: "KG-SPARQL-FEDERATION", strength: "not_supported" }, // proprietary query language
  { solution: "Palantir Foundry", capability: "KG-VIRTUAL-GRAPHS", strength: "native" }, // virtual datasets
  { solution: "Palantir Foundry", capability: "KG-AI-AGENT-INTEGRATION", strength: "native" }, // AIP
  { solution: "Palantir Foundry", capability: "KG-NATIVE-STORAGE", strength: "partial" }, // lakehouse-backed ontology, not native triplestore
];

// =========================================================================
// EXECUTION
// =========================================================================
console.log("==> Phase A: METRICS-LAYER + KGP\n");

console.log("DOMAINS");
const domainMap = await syncTable("/domains", newDomains, "domain_code");
for (const d of await get("/domains?select=id,domain_code&limit=10000")) domainMap.set(String(d.domain_code), Number(d.id));

console.log("CAPABILITIES");
const capMap = await syncTable("/capabilities", allNewCaps, "capability_code");
for (const c of await get("/capabilities?select=id,capability_code&limit=10000")) capMap.set(String(c.capability_code), Number(c.id));

console.log("VENDORS");
const vendorMap = await syncTable("/vendors", newVendors, "vendor_name");
for (const v of await get("/vendors?select=id,vendor_name&limit=20000")) vendorMap.set(String(v.vendor_name), Number(v.id));

console.log("SOLUTIONS");
const solRows = newSolutions.map(s => {
  const vid = vendorMap.get(s.vendor_natural);
  if (!vid) throw new Error(`Vendor ${s.vendor_natural} not found for ${s.solution_name}`);
  return { solution_name: s.solution_name, vendor_id: vid, description: s.description };
});
const solMap = await syncTable("/solutions", solRows, "solution_name");
for (const s of await get("/solutions?select=id,solution_name&limit=20000")) solMap.set(String(s.solution_name), Number(s.id));

console.log("CAPABILITY_DOMAINS");
const wantCD = [...newCapDomains, ...crossCuttingExtensions];
const existingCD = await get("/capability_domains?select=capability_id,domain_id&limit=20000");
const cdSet = new Set(existingCD.map(r => `${r.capability_id}:${r.domain_id}`));
const cdRows = wantCD
  .map(x => {
    const cid = capMap.get(x.cap); const did = domainMap.get(x.domain);
    if (!cid) throw new Error(`Cap ${x.cap} not found`);
    if (!did) throw new Error(`Domain ${x.domain} not found`);
    return { capability_id: cid, domain_id: did };
  })
  .filter(r => !cdSet.has(`${r.capability_id}:${r.domain_id}`));
if (cdRows.length > 0) {
  console.log(`  inserting ${cdRows.length} capability_domains rows`);
  await insert("/capability_domains", cdRows);
} else console.log("  capability_domains: nothing new");

console.log("SOLUTION_DOMAINS");
const existingSD = await get("/solution_domains?select=solution_id,domain_id&limit=20000");
const sdSet = new Set(existingSD.map(r => `${r.solution_id}:${r.domain_id}`));
const sdRows = solDoms
  .map(x => {
    const sid = solMap.get(x.solution); const did = domainMap.get(x.domain);
    if (!sid) throw new Error(`Sol ${x.solution} not found`);
    if (!did) throw new Error(`Domain ${x.domain} not found`);
    return { solution_id: sid, domain_id: did, coverage_level: x.coverage };
  })
  .filter(r => !sdSet.has(`${r.solution_id}:${r.domain_id}`));
if (sdRows.length > 0) {
  console.log(`  inserting ${sdRows.length} solution_domains rows`);
  await insert("/solution_domains", sdRows);
} else console.log("  solution_domains: nothing new");

console.log("SOLUTION_CAPABILITIES");
const existingSC = await get("/solution_capabilities?select=solution_id,capability_id&limit=20000");
const scSet = new Set(existingSC.map(r => `${r.solution_id}:${r.capability_id}`));
const scRows = solCaps
  .map(x => {
    const sid = solMap.get(x.solution); const cid = capMap.get(x.capability);
    if (!sid) throw new Error(`Sol ${x.solution} not found in matrix`);
    if (!cid) throw new Error(`Cap ${x.capability} not found in matrix`);
    return { solution_id: sid, capability_id: cid, delivery_strength: x.strength };
  })
  .filter(r => !scSet.has(`${r.solution_id}:${r.capability_id}`));
if (scRows.length > 0) {
  console.log(`  inserting ${scRows.length} solution_capabilities rows`);
  await insert("/solution_capabilities", scRows);
} else console.log("  solution_capabilities: nothing new");

// --- POST-LOAD AUDIT ---
console.log("\nPOST-LOAD AUDIT");
const zeros = await get("/domains?select=domain_code,crud_percentage&crud_percentage=eq.0&order=id.desc&limit=50");
console.log(`  zero-metadata domains: ${zeros.length === 0 ? "none" : zeros.map((z: any) => z.domain_code).join(", ")}`);

const metricsCount = await get("/solution_domains?domain_id=eq." + domainMap.get("METRICS-LAYER") + "&select=solutions(solution_name),coverage_level&order=coverage_level.asc");
console.log(`\n  METRICS-LAYER coverage:`);
for (const r of metricsCount as any[]) console.log(`    ${r.coverage_level.padEnd(10)} ${r.solutions.solution_name}`);
const kgpCount = await get("/solution_domains?domain_id=eq." + domainMap.get("KGP") + "&select=solutions(solution_name),coverage_level&order=coverage_level.asc");
console.log(`\n  KGP coverage:`);
for (const r of kgpCount as any[]) console.log(`    ${r.coverage_level.padEnd(10)} ${r.solutions.solution_name}`);

console.log("\n==> Phase A complete.");
console.log("  https://tests.semantius.app/domain_map/domains");
console.log("  https://tests.semantius.app/domain_map/solutions");
console.log("  https://tests.semantius.app/domain_map/solution_capabilities");
