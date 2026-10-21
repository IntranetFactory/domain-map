#!/usr/bin/env bun
// Phase B + C for METRICS-LAYER + KGP:
//   B: data_objects (4), domain_data_objects (incl. multi-master signals),
//      trigger_events (4), cross_domain_handoffs (6)
//   C: business_function_domains (~9)

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
    out.push(...await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) }));
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
    console.log(`  inserting ${missing.length} into ${path} (${existing.length} existed)`);
    await insert(path, missing);
  } else console.log(`  ${path}: nothing new`);
  const all = await get(`${path}?select=id,${keyField}&limit=20000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// =========================================================================
// DATA_OBJECTS
// =========================================================================
const newDataObjects = [
  {
    data_object_name: "metric_definitions",
    singular_label: "Metric Definition",
    plural_label: "Metric Definitions",
    display_label: "Metric Definition",
    description: "Canonical, certified definition of a business metric: numerator, denominator, filters, dimensions, time grain, ownership, certification status, and lineage to physical sources. The atom that the metrics-layer market exists to centralize and govern.",
  },
  {
    data_object_name: "dimensional_models",
    singular_label: "Dimensional Model",
    plural_label: "Dimensional Models",
    display_label: "Dimensional Model",
    description: "Logical entity/dimension/hierarchy model decoupled from physical tables. Defines conformed dimensions across fact tables, hierarchies, slowly-changing-dimension behavior, and graph-style relationships. The semantic structure metrics resolve against.",
  },
  {
    data_object_name: "ontologies",
    singular_label: "Ontology",
    plural_label: "Ontologies",
    display_label: "Ontology",
    description: "Formal model of concepts (OWL classes / RDF schemas / labeled-property-graph schemas), properties, relationships, hierarchies, and axioms. Includes namespaces, prefixes, imports, and constraint shapes (SHACL/SHEX). The 'schema' tier of a knowledge graph.",
  },
  {
    data_object_name: "knowledge_graph_entities",
    singular_label: "Knowledge Graph Entity",
    plural_label: "Knowledge Graph Entities",
    display_label: "Knowledge Graph Entity",
    description: "Typed instances of ontology classes — RDF named individuals or LPG nodes — with assertions, relationships, embeddings, and provenance. The 'data' tier of a knowledge graph that AI agents query and operational apps write back to.",
  },
];

// =========================================================================
// DOMAIN ↔ DATA_OBJECT
// =========================================================================
type DomDO = { domain: string; data_object: string; role: "master" | "contributor" | "consumer" | "derived"; notes: string };

const domainDataObjects: DomDO[] = [
  // METRICS-LAYER masters
  { domain: "METRICS-LAYER", data_object: "metric_definitions", role: "master", notes: "The canonical metric registry — what AtScale / Cube / dbt Semantic Layer / Honeydew / Looker (LookML) all manage as their primary intellectual artifact." },
  { domain: "METRICS-LAYER", data_object: "dimensional_models", role: "master", notes: "Semantic dimensional model: entities, dimensions, hierarchies, conformance rules. Decoupled from physical storage." },
  // KGP masters
  { domain: "KGP", data_object: "ontologies", role: "master", notes: "Formal ontology authoring and governance — what TopBraid EDG / Stardog / Anzo / Metaphacts manage as their primary IP. Includes namespaces, OWL/RDFS axioms, SHACL shapes." },
  { domain: "KGP", data_object: "knowledge_graph_entities", role: "master", notes: "Typed entity instances with assertions, relationships, embeddings, and provenance. Stored in native triplestores or property-graph engines." },

  // Cross-domain consumers / contributors
  // metric_definitions
  { domain: "BI", data_object: "metric_definitions", role: "consumer", notes: "BI tools (Tableau, Power BI, Looker, ThoughtSpot) consume certified metric definitions via SQL or API to render dashboards. When BI tools also author metrics locally (Power BI measures, Tableau calculated fields), the result is metric drift — the Signal-2 friction the metrics layer market exists to eliminate." },
  { domain: "DATA-AI-PLAT", data_object: "metric_definitions", role: "consumer", notes: "AI agents on data-AI platforms (Foundry AIP, Databricks Genie, Snowflake Cortex) consume metric definitions via tool-use APIs for deterministic LLM grounding." },
  { domain: "DCG", data_object: "metric_definitions", role: "contributor", notes: "Data Catalog and Governance platforms surface metric definitions as governed data assets, contributing certification and lineage metadata back into the metrics layer." },

  // ontologies
  { domain: "MDM", data_object: "ontologies", role: "contributor", notes: "MDM platforms (Reltio, Stibo, Informatica MDM) contribute master-data schema definitions that map onto KGP ontologies — same logical entities, MDM authoritative for golden records, KGP authoritative for relationships and reasoning." },
  { domain: "DCG", data_object: "ontologies", role: "consumer", notes: "Data Catalog and Governance platforms consume ontology terms as the business-glossary backbone, linking data assets to formal concept definitions." },
  { domain: "DATA-AI-PLAT", data_object: "ontologies", role: "master", notes: "Palantir Foundry masters its own Ontology as a primary platform artifact. Distinct slice from pure-play KGP vendors: Foundry's Ontology is operational-app-centric and lakehouse-backed; pure-play KGP ontologies are formal OWL/RDF with reasoning engines." },

  // knowledge_graph_entities
  { domain: "DATA-AI-PLAT", data_object: "knowledge_graph_entities", role: "master", notes: "Foundry Ontology Objects — operational entities written to and read by Workshop apps and AIP agents. Lakehouse-backed, not native triplestore." },
  { domain: "MDM", data_object: "knowledge_graph_entities", role: "consumer", notes: "MDM platforms consume KG entity data for cross-reference enrichment when the KGP holds authoritative relationship metadata that MDM lacks." },
];

// =========================================================================
// TRIGGER EVENTS
// =========================================================================
type TriggerEv = { event_name: string; data_object: string; event_category: string; from_state: string; to_state: string; description: string };

const newTriggerEvents: TriggerEv[] = [
  {
    event_name: "metric.certified",
    data_object: "metric_definitions",
    event_category: "lifecycle",
    from_state: "draft", to_state: "certified",
    description: "A metric definition completes its review/approval workflow and becomes the canonical version consumed downstream. Triggers BI cache invalidation, AI-agent definition refresh, and notification of metric consumers.",
  },
  {
    event_name: "metric.deprecated",
    data_object: "metric_definitions",
    event_category: "lifecycle",
    from_state: "certified", to_state: "deprecated",
    description: "A previously certified metric is deprecated (with optional replacement metric reference). Triggers consumer warnings on BI dashboards and AI-agent tool-use prompts, with a grace period before retirement.",
  },
  {
    event_name: "ontology.published",
    data_object: "ontologies",
    event_category: "lifecycle",
    from_state: "draft", to_state: "published",
    description: "A new ontology version is published. Triggers ontology-reload in dependent KGP instances, federated SPARQL endpoint refresh, AI-agent schema-cache invalidation, and downstream consumers (DCG glossaries, MDM mappings) revalidation.",
  },
  {
    event_name: "kg_entity.linked",
    data_object: "knowledge_graph_entities",
    event_category: "state_change",
    from_state: "isolated", to_state: "linked",
    description: "A KG entity gains a new relationship link (sameAs, partOf, derived from an inference run, or manually asserted). Triggers downstream re-reasoning, embedding-recomputation for similarity search, and notification of AI agents that hold the entity in context.",
  },
];

// =========================================================================
// CROSS-DOMAIN HANDOFFS
// =========================================================================
type Handoff = {
  source: string; target: string; data_object: string; trigger_event: string;
  integration_pattern: "event_stream" | "api_call" | "batch_sync" | "manual_handoff" | "file_drop";
  friction_level: "low" | "medium" | "high";
  description: string; notes: string;
};

const handoffs: Handoff[] = [
  // METRICS-LAYER handoffs
  {
    source: "METRICS-LAYER", target: "BI", data_object: "metric_definitions", trigger_event: "metric.certified",
    integration_pattern: "api_call", friction_level: "medium",
    description: "When a metric definition is certified in the metrics layer, BI tools that consume via SQL/REST need to refresh their cached schema and dashboard definitions. Tableau, Power BI, Looker, ThoughtSpot all integrate via vendor-specific connectors — the protocol exists, but per-tool drift in semantic interpretation is the friction source.",
    notes: "Medium friction. The newer metrics-layer / BI integrations are stable; the broken state is when BI tools also author local metrics that diverge from the central definitions.",
  },
  {
    source: "METRICS-LAYER", target: "DATA-AI-PLAT", data_object: "metric_definitions", trigger_event: "metric.certified",
    integration_pattern: "api_call", friction_level: "medium",
    description: "AI agents on data-AI platforms (Foundry AIP, Databricks Genie, Snowflake Cortex Analyst) ground LLM responses in metric definitions via tool-use APIs. When a metric is certified, the agent's tool catalog needs to update.",
    notes: "Medium friction. The 2024+ wedge for metrics-layer vendors: deterministic AI grounding requires fresh definitions and clean lineage. Vendor-specific connectors (Cube has a Cube AI API, dbt has dbt-mcp, Honeydew has direct LLM integrations).",
  },
  {
    source: "DCG", target: "METRICS-LAYER", data_object: "metric_definitions", trigger_event: "metric.deprecated",
    integration_pattern: "manual_handoff", friction_level: "high",
    description: "When a data asset is deprecated in the catalog, downstream metrics that reference it should be flagged or auto-deprecated. Almost universally manual today: catalog tools surface the deprecation, but a human has to walk the metric registry to identify and deprecate dependents.",
    notes: "High-friction shape: lineage staleness. The catalog-side knows the asset is deprecated; the metric-side may not pick it up for weeks. The gap exists because lineage tools are immature at metric-to-asset granularity.",
  },
  // KGP handoffs
  {
    source: "KGP", target: "DATA-AI-PLAT", data_object: "ontologies", trigger_event: "ontology.published",
    integration_pattern: "api_call", friction_level: "medium",
    description: "Published ontology updates trigger AI agents that use the graph for grounded reasoning to refresh their tool / schema cache. LangChain, LlamaIndex, and vendor-specific agent runtimes consume KG schemas via SPARQL or REST.",
    notes: "Medium friction. The integration protocols exist; the friction is keeping agent schemas in sync with rapidly-iterating ontologies during AI-app development.",
  },
  {
    source: "MDM", target: "KGP", data_object: "knowledge_graph_entities", trigger_event: "kg_entity.linked",
    integration_pattern: "batch_sync", friction_level: "high",
    description: "MDM golden records are the authoritative source for master entities (Customer, Product, Supplier). KGP ingests them and links to ontology classes, but the data models differ: MDM is record-centric and survivorship-driven, KGP is relationship-centric and reasoning-driven. Bidirectional sync is bespoke.",
    notes: "High-friction shape: cross-vendor stack with the same logical entity. The 'is the MDM Customer the same as the KGP Person entity?' reconciliation problem is the canonical failure mode.",
  },
  {
    source: "DCG", target: "KGP", data_object: "ontologies", trigger_event: "ontology.published",
    integration_pattern: "manual_handoff", friction_level: "high",
    description: "Data Catalog and Governance platforms maintain business glossaries that semantically overlap with KGP ontologies. When a glossary term is added/changed, KGP ontology should reflect (and vice-versa). Almost universally manual; very few tools bridge the two models automatically.",
    notes: "High-friction shape: probabilistic glossary terms → deterministic ontology concepts. Some tools (TopBraid EDG, data.world) bridge both sides natively; others rely on manual stewardship.",
  },
];

// =========================================================================
// BUSINESS_FUNCTION_DOMAINS
// =========================================================================
type FuncDomain = { domain: string; business_function: string; role: "owner" | "contributor" | "consumer"; notes: string };

const funcDomains: FuncDomain[] = [
  // METRICS-LAYER
  { domain: "METRICS-LAYER", business_function: "Data and Analytics", role: "owner", notes: "D&A leadership owns the metrics-layer decision (vendor selection, semantic-model authoring policies, certification workflows). The CDO / Head of Analytics is the primary buyer." },
  { domain: "METRICS-LAYER", business_function: "Business Intelligence", role: "contributor", notes: "BI teams contribute metric requirements from dashboard consumers, validate metric definitions against business questions, and propagate certified definitions into Tableau / Power BI / Looker artifacts." },
  { domain: "METRICS-LAYER", business_function: "Data Engineering", role: "contributor", notes: "Data engineers author the semantic-model translation from physical sources, manage caching/aggregation policies, and operate the metrics-layer infrastructure." },
  { domain: "METRICS-LAYER", business_function: "AI and Machine Learning", role: "consumer", notes: "AI/ML teams consume certified metrics for AI agent grounding, RAG context, and natural-language query interfaces. Growing consumer base in 2024+." },

  // KGP
  { domain: "KGP", business_function: "Data and Analytics", role: "owner", notes: "D&A / CDO function owns KGP investment decisions in most enterprises. Knowledge-graph initiatives sit alongside data-platform and AI investments." },
  { domain: "KGP", business_function: "AI and Machine Learning", role: "contributor", notes: "AI/ML teams contribute the agent / RAG / reasoning use cases that pull KGP investment forward; they author ontology-grounded retrieval and tool-use pipelines." },
  { domain: "KGP", business_function: "Software Engineering", role: "contributor", notes: "Engineering / enterprise-architect teams build operational apps on top of the KGP ontology (Foundry Workshop pattern) and own the integration with source systems." },
  { domain: "KGP", business_function: "Research and Development", role: "consumer", notes: "Life sciences / pharma / R&D heavy-industries are major KGP buyer segments: ontology-driven scientific data integration, regulatory-data graphs, FAIR-data initiatives." },
  { domain: "KGP", business_function: "IT Operations", role: "consumer", notes: "Enterprise architecture and IT-ops use KGP for the IT-asset / configuration-item graph (alternative to or complement to CMDB)." },
];

// =========================================================================
// EXECUTION
// =========================================================================
console.log("==> Phase B + C: METRICS-LAYER + KGP\n");

const domainMap = new Map<string, number>();
for (const d of await get("/domains?select=id,domain_code&limit=10000")) domainMap.set(String(d.domain_code), Number(d.id));
const funcMap = new Map<string, number>();
for (const f of await get("/business_functions?select=id,business_function_name&limit=10000")) funcMap.set(String(f.business_function_name), Number(f.id));

console.log("DATA_OBJECTS");
const doMap = await syncTable("/data_objects", newDataObjects, "data_object_name");
for (const d of await get("/data_objects?select=id,data_object_name&limit=20000")) doMap.set(String(d.data_object_name), Number(d.id));

console.log("DOMAIN_DATA_OBJECTS");
const existingDDO = await get("/domain_data_objects?select=domain_id,data_object_id&limit=20000");
const ddoSet = new Set(existingDDO.map(r => `${r.domain_id}:${r.data_object_id}`));
const ddoRows = domainDataObjects
  .map(x => {
    const did = domainMap.get(x.domain);
    const oid = doMap.get(x.data_object);
    if (!did) throw new Error(`Domain ${x.domain} not found`);
    if (!oid) throw new Error(`Data object ${x.data_object} not found`);
    return { domain_id: did, data_object_id: oid, role: x.role, notes: x.notes,
      domain_data_object_label: `${x.domain}:${x.data_object}:${x.role}` };
  })
  .filter(r => !ddoSet.has(`${r.domain_id}:${r.data_object_id}`));
if (ddoRows.length > 0) {
  console.log(`  inserting ${ddoRows.length} new rows`);
  await insert("/domain_data_objects", ddoRows);
} else console.log("  nothing new");

console.log("TRIGGER_EVENTS");
const existingTE = await get("/trigger_events?select=id,event_name&limit=20000");
const teMap = new Map<string, number>();
for (const t of existingTE) teMap.set(String(t.event_name), Number(t.id));
const teToInsert = newTriggerEvents
  .filter(t => !teMap.has(t.event_name))
  .map(t => {
    const oid = doMap.get(t.data_object);
    if (!oid) throw new Error(`Data object ${t.data_object} not found`);
    return { event_name: t.event_name, data_object_id: oid,
      event_category: t.event_category, from_state: t.from_state, to_state: t.to_state,
      description: t.description };
  });
if (teToInsert.length > 0) {
  console.log(`  inserting ${teToInsert.length} new trigger_events`);
  await insert("/trigger_events", teToInsert);
} else console.log("  nothing new");

console.log("CROSS_DOMAIN_HANDOFFS");
const existingHO = await get("/cross_domain_handoffs?select=source_domain_id,target_domain_id,trigger_event,data_object_id&limit=20000");
const hoSet = new Set(existingHO.map(r => `${r.source_domain_id}:${r.target_domain_id}:${r.trigger_event}:${r.data_object_id}`));
const hoRows = handoffs
  .map(h => {
    const src = domainMap.get(h.source);
    const tgt = domainMap.get(h.target);
    const oid = doMap.get(h.data_object);
    if (!src) throw new Error(`Source ${h.source} not found`);
    if (!tgt) throw new Error(`Target ${h.target} not found`);
    if (!oid) throw new Error(`Data object ${h.data_object} not found`);
    return { source_domain_id: src, target_domain_id: tgt, data_object_id: oid,
      trigger_event: h.trigger_event, integration_pattern: h.integration_pattern,
      friction_level: h.friction_level, description: h.description, notes: h.notes,
      cross_domain_handoff_label: `${h.source}→${h.target}: ${h.trigger_event}` };
  })
  .filter(r => !hoSet.has(`${r.source_domain_id}:${r.target_domain_id}:${r.trigger_event}:${r.data_object_id}`));
if (hoRows.length > 0) {
  console.log(`  inserting ${hoRows.length} new handoffs`);
  await insert("/cross_domain_handoffs", hoRows);
} else console.log("  nothing new");

console.log("BUSINESS_FUNCTION_DOMAINS");
const existingBFD = await get("/business_function_domains?select=domain_id,business_function_id&limit=20000");
const bfdSet = new Set(existingBFD.map(r => `${r.domain_id}:${r.business_function_id}`));
const bfdRows = funcDomains
  .map(x => {
    const did = domainMap.get(x.domain);
    const fid = funcMap.get(x.business_function);
    if (!did) throw new Error(`Domain ${x.domain} not found`);
    if (!fid) throw new Error(`Function "${x.business_function}" not found`);
    return { domain_id: did, business_function_id: fid, responsibility_type: x.role,
      notes: x.notes, business_function_domain_label: `${x.business_function} → ${x.domain} (${x.role})` };
  })
  .filter(r => !bfdSet.has(`${r.domain_id}:${r.business_function_id}`));
if (bfdRows.length > 0) {
  console.log(`  inserting ${bfdRows.length} new business_function_domains`);
  await insert("/business_function_domains", bfdRows);
} else console.log("  nothing new");

// --- POST-LOAD CHECKS ---
console.log("\nPOST-LOAD CHECKS");
const ontoMasters = await get(
  "/domain_data_objects?role=eq.master&data_object_id=eq." + doMap.get("ontologies") +
  "&select=domains(domain_code)"
);
console.log(`  ontologies masters: ${(ontoMasters as any[]).map(r => r.domains.domain_code).join(", ")}`);
const kgeMasters = await get(
  "/domain_data_objects?role=eq.master&data_object_id=eq." + doMap.get("knowledge_graph_entities") +
  "&select=domains(domain_code)"
);
console.log(`  knowledge_graph_entities masters: ${(kgeMasters as any[]).map(r => r.domains.domain_code).join(", ")}`);

console.log(`\n==> Phase B + C complete.`);
console.log("  https://tests.semantius.app/domain_map/data_objects");
console.log("  https://tests.semantius.app/domain_map/cross_domain_handoffs");
console.log("  https://tests.semantius.app/domain_map/business_function_domains");
