#!/usr/bin/env bun
// Build-out of the DCG (Data Catalog and Governance) domain, Phases A + B.
// Domain id 88. Idempotent: reads by natural key, inserts missing, re-reads for id maps.
// Lands everything at record_status='new' (DB default; field omitted on insert).
//
// Module split confirmed by user: 6 modules (Catalog, Lineage, Glossary, Stewardship,
// Access Governance, Data Products). Capabilities confirmed: all 10. Pattern flags: all 4.
//
// M7 resolution: DCG genuinely masters 9 entities. data_products (canonical: DATA-AI-PLAT
// module 224), metric_definitions (canonical: METRICS-LAYER module 275), ontologies
// (canonical: DATA-AI-PLAT module 224) are embedded_master in DCG (local shells).

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;
const DOMAIN_ID = 88;
const USERS_ID = 748; // platform_builtin
const KGP_ONTOLOGIES_ID = 742;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(), new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius failed (exit ${code}): ${stderr}\nbody=${JSON.stringify(body)}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const get = (path: string) => call({ method: "GET", path });
async function post(path: string, rows: Row[]): Promise<Row[]> {
  if (!rows.length) return [];
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += 50) out.push(...await call({ method: "POST", path, body: rows.slice(i, i + 50) }));
  return out;
}
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });

// ===================================================================
// PHASE A.1 - Capabilities + capability_domains
// ===================================================================
const CAPS = [
  { capability_code: "DCG-METADATA-HARVEST", capability_name: "Technical Metadata Harvesting", description: "Crawl and scan source systems to discover datasets and capture technical metadata (schema, format, owner, record counts, storage location) into the catalog." },
  { capability_code: "DCG-GLOSSARY-MGMT", capability_name: "Business Glossary Management", description: "Author, review, publish, and steward business-language definitions of concepts, linking terms to physical data assets." },
  { capability_code: "DCG-LINEAGE", capability_name: "Data Lineage", description: "Capture and present end-to-end column-level lineage between data assets, with impact analysis on schema or pipeline changes." },
  { capability_code: "DCG-AUTO-CLASSIFY", capability_name: "Automated Data Classification", description: "Automatically detect and apply sensitivity tags (PII, PCI, PHI, confidential) to data assets, routed through a steward approval workflow." },
  { capability_code: "DCG-STEWARDSHIP", capability_name: "Data Stewardship Workflow", description: "Assign stewards and owners to assets and terms, track responsibility, and run escalation when stewardship gaps or issues arise." },
  { capability_code: "DCG-DQ-SCORECARD", capability_name: "Data Quality Scorecards", description: "Surface data-quality rule results and trust scores in-context on catalog assets; the quality engine itself is mastered by the Data Quality domain and consumed here." },
  { capability_code: "DCG-CERTIFICATION", capability_name: "Data Certification Workflow", description: "Run the attestation workflow by which a data owner certifies an asset as fit for production use, with grant, validity period, and revocation." },
  { capability_code: "DCG-DATA-PRODUCT-PUB", capability_name: "Data Product Publishing", description: "Package, publish, and list governed data products with explicit contracts (schema, SLA, owner, access policy) for consumer teams." },
  { capability_code: "DCG-ACCESS-AUTHORING", capability_name: "Access Request and Policy Authoring", description: "Author data access policies and route data-access requests through policy evaluation and a single accountable approver." },
  { capability_code: "DCG-REG-MAPPING", capability_name: "Regulatory Mapping", description: "Map data assets, classifications, and processing activities to statutory obligations (records of processing, retention, lineage evidence) for compliance reporting." },
];

// ===================================================================
// PHASE A.2 - Modules
// ===================================================================
const MODULES = [
  { domain_module_code: "DCG-CATALOG", domain_module_name: "Data Catalog", domain_id: DOMAIN_ID, module_kind: "full",
    description: "The discovery and inventory surface: crawls and registers data assets, organizes them into subject-area data domains, and exposes search, browse, and metadata. Masters data_assets and data_domains. Deploys standalone as the catalog core or alongside the governance modules.",
    catalog_tagline: "Find and understand every dataset across your data estate from one searchable catalog.",
    catalog_description: "Automatically discover datasets, tables, files, and APIs across your sources and bring them into one searchable inventory. Organize assets into business subject areas, see ownership and technical detail at a glance, and give everyone a trusted starting point for finding the right data. The catalog is the home base that the lineage, glossary, stewardship, and governance modules build on." },
  { domain_module_code: "DCG-LINEAGE", domain_module_name: "Data Lineage", domain_id: DOMAIN_ID, module_kind: "full",
    description: "Captures and presents flow edges between data assets with column-level mapping and transformation logic, and runs impact analysis when a source changes. Masters data_lineage_relationships; carries an embedded shell of data_assets so it deploys standalone.",
    catalog_tagline: "Trace where data comes from and what breaks when it changes, end to end.",
    catalog_description: "See how data flows from source to report across every pipeline and transformation, down to the column level. When a schema or upstream source changes, run impact analysis to know exactly which downstream assets, dashboards, and consumers are affected before anything breaks. Lineage turns the catalog from a static inventory into a living map of how your data actually moves." },
  { domain_module_code: "DCG-GLOSSARY", domain_module_name: "Business Glossary", domain_id: DOMAIN_ID, module_kind: "full",
    description: "The shared business-language layer: authors, reviews, publishes, and deprecates glossary terms and links them to physical assets. Masters glossary_terms; embeds ontologies as an optional formal-model shell. Runs a draft-review-publish-deprecate workflow.",
    catalog_tagline: "Give the whole organization one agreed definition for every business term.",
    catalog_description: "Build a shared vocabulary so Revenue, Active Customer, and Churn mean the same thing everywhere. Propose terms, route them through steward review, publish the approved definition, and link each term to the real data assets behind it. Optional ontology authoring adds formal relationships between concepts. A governed glossary is what lets self-service data consumers trust what they find." },
  { domain_module_code: "DCG-STEWARDSHIP", domain_module_name: "Data Stewardship", domain_id: DOMAIN_ID, module_kind: "full",
    description: "The accountability layer: assigns stewards and owners to assets and terms, tracks responsibility, runs escalation, and manages the certification attestation by which an owner declares an asset production-ready. Masters data_stewardship_assignments and data_certifications; embeds data_assets.",
    catalog_tagline: "Put a named owner behind every important dataset and certify what is fit to use.",
    catalog_description: "Assign stewards and owners to the data that matters, make responsibility visible, and escalate when stewardship gaps appear. When an owner attests that an asset meets quality and compliance bars, certify it so consumers can tell trusted data from the rest at a glance, with validity periods and revocation when things change. Clear ownership is what turns a catalog into governed data people can rely on." },
  { domain_module_code: "DCG-ACCESS-GOV", domain_module_name: "Access Governance", domain_id: DOMAIN_ID, module_kind: "full",
    description: "The policy and sensitivity layer: classifies assets (PII/PCI/PHI/confidential) through an approval workflow, authors data access policies, and routes access requests to a single accountable approver. Masters data_classifications and data_access_policies; embeds data_assets. Authors policy; enforcement is provisioned downstream (DLP/DSPM/IGA).",
    catalog_tagline: "Classify sensitive data and decide who can use it, by policy not by ticket.",
    catalog_description: "Detect and label sensitive data, run classifications through steward approval, and lock them once approved so access cannot quietly drift. Author access policies that say who can use which data under what conditions, and route every access request through one accountable approver. Access Governance is where the catalog stops being a map and starts being the control point for safe, compliant data use." },
  { domain_module_code: "DCG-DATA-PRODUCTS", domain_module_name: "Data Products", domain_id: DOMAIN_ID, module_kind: "full",
    description: "The publishing and marketplace surface: packages governed data products with explicit contracts, surfaces certified metric definitions, and tracks usage and popularity. Masters data_usage_metrics; embeds data_products (canonical DATA-AI-PLAT) and metric_definitions (canonical METRICS-LAYER).",
    catalog_tagline: "Publish governed data products and metrics consumers can find, trust, and reuse.",
    catalog_description: "Turn raw datasets into governed data products with explicit contracts: schema, SLA, owner, access policy, and intended consumers. Publish certified metric definitions so everyone calculates Revenue the same way, and track usage and popularity to see what is actually valuable and what has gone stale. This is the marketplace where producers ship trusted data and consumers shop for it within the rules." },
];

// Capability -> module code mapping (M4/M6: every cap in >=1 module, every module >=1 cap)
const CAP_MODULE: Record<string, string[]> = {
  "DCG-METADATA-HARVEST": ["DCG-CATALOG"],
  "DCG-DQ-SCORECARD": ["DCG-CATALOG"],
  "DCG-LINEAGE": ["DCG-LINEAGE"],
  "DCG-GLOSSARY-MGMT": ["DCG-GLOSSARY"],
  "DCG-STEWARDSHIP": ["DCG-STEWARDSHIP"],
  "DCG-CERTIFICATION": ["DCG-STEWARDSHIP"],
  "DCG-AUTO-CLASSIFY": ["DCG-ACCESS-GOV"],
  "DCG-ACCESS-AUTHORING": ["DCG-ACCESS-GOV"],
  "DCG-REG-MAPPING": ["DCG-ACCESS-GOV"],
  "DCG-DATA-PRODUCT-PUB": ["DCG-DATA-PRODUCTS"],
};

// ===================================================================
// PHASE B - data_object ids (verified live) and module wiring
// ===================================================================
const DO = {
  data_products: 232, metric_definitions: 252, ontologies: 254,
  data_assets: 300, data_lineage_relationships: 301, glossary_terms: 302,
  data_classifications: 303, data_domains: 304, data_stewardship_assignments: 305,
  data_certifications: 306, data_access_policies: 307, data_usage_metrics: 308,
};

// domain_module_data_objects: [module_code, data_object_id, role, necessity]
const DMDO: [string, number, string, string][] = [
  ["DCG-CATALOG", DO.data_assets, "master", "required"],
  ["DCG-CATALOG", DO.data_domains, "master", "required"],
  ["DCG-LINEAGE", DO.data_lineage_relationships, "master", "required"],
  ["DCG-LINEAGE", DO.data_assets, "embedded_master", "required"],
  ["DCG-GLOSSARY", DO.glossary_terms, "master", "required"],
  ["DCG-GLOSSARY", DO.ontologies, "embedded_master", "optional"],
  ["DCG-STEWARDSHIP", DO.data_stewardship_assignments, "master", "required"],
  ["DCG-STEWARDSHIP", DO.data_certifications, "master", "required"],
  ["DCG-STEWARDSHIP", DO.data_assets, "embedded_master", "required"],
  ["DCG-ACCESS-GOV", DO.data_classifications, "master", "required"],
  ["DCG-ACCESS-GOV", DO.data_access_policies, "master", "required"],
  ["DCG-ACCESS-GOV", DO.data_assets, "embedded_master", "required"],
  ["DCG-DATA-PRODUCTS", DO.data_usage_metrics, "master", "required"],
  ["DCG-DATA-PRODUCTS", DO.data_products, "embedded_master", "required"],
  ["DCG-DATA-PRODUCTS", DO.metric_definitions, "embedded_master", "optional"],
  ["DCG-DATA-PRODUCTS", DO.data_assets, "embedded_master", "required"],
];

// entity_type classification (11 unclassified; metric_definitions already operational_workflow)
const ENTITY_TYPE: Record<number, string> = {
  [DO.data_products]: "operational_workflow",
  [DO.ontologies]: "operational_workflow",
  [DO.data_assets]: "operational_workflow",
  [DO.data_lineage_relationships]: "operational_record",
  [DO.glossary_terms]: "operational_workflow",
  [DO.data_classifications]: "operational_workflow",
  [DO.data_domains]: "catalog",
  [DO.data_stewardship_assignments]: "operational_workflow",
  [DO.data_certifications]: "operational_workflow",
  [DO.data_access_policies]: "operational_workflow",
  [DO.data_usage_metrics]: "computed",
};

// pattern flags (user-confirmed)
const FLAGS: [number, Row][] = [
  [DO.data_access_policies, { has_submit_lock: true, has_single_approver: true }],
  [DO.data_certifications, { has_single_approver: true }],
  [DO.data_classifications, { has_submit_lock: true }],
  [DO.data_stewardship_assignments, { has_personal_content: true }],
];

// lifecycle states: data_object_id -> module_code -> [state_name, order, is_initial, is_terminal, requires_permission, verb_override]
type LS = { name: string; order: number; init?: boolean; term?: boolean; perm?: boolean; verb?: string };
const LIFECYCLE: { do: number; module: string; states: LS[] }[] = [
  { do: DO.data_assets, module: "DCG-CATALOG", states: [
    { name: "discovered", order: 10, init: true },
    { name: "cataloged", order: 20 },
    { name: "classified", order: 30, perm: true, verb: "classify" },
    { name: "certified", order: 40, perm: true, verb: "certify" },
    { name: "deprecated", order: 50, term: true, perm: true, verb: "deprecate" },
  ]},
  { do: DO.glossary_terms, module: "DCG-GLOSSARY", states: [
    { name: "draft", order: 10, init: true },
    { name: "in_review", order: 20 },
    { name: "published", order: 30, perm: true, verb: "publish" },
    { name: "deprecated", order: 40, term: true, perm: true, verb: "deprecate" },
  ]},
  { do: DO.data_classifications, module: "DCG-ACCESS-GOV", states: [
    { name: "proposed", order: 10, init: true },
    { name: "approved", order: 20, perm: true, verb: "approve" },
    { name: "enforced", order: 30, perm: true, verb: "enforce" },
    { name: "retired", order: 40, term: true, perm: true, verb: "retire" },
  ]},
  { do: DO.data_stewardship_assignments, module: "DCG-STEWARDSHIP", states: [
    { name: "proposed", order: 10, init: true },
    { name: "active", order: 20, perm: true, verb: "assign" },
    { name: "escalated", order: 30, perm: true, verb: "escalate" },
    { name: "revoked", order: 40, term: true, perm: true, verb: "revoke" },
  ]},
  { do: DO.data_certifications, module: "DCG-STEWARDSHIP", states: [
    { name: "requested", order: 10, init: true },
    { name: "granted", order: 20, perm: true, verb: "grant" },
    { name: "expired", order: 30, term: true },
    { name: "revoked", order: 40, term: true, perm: true, verb: "revoke" },
  ]},
  { do: DO.data_access_policies, module: "DCG-ACCESS-GOV", states: [
    { name: "drafted", order: 10, init: true },
    { name: "under_review", order: 20 },
    { name: "approved", order: 30, perm: true, verb: "approve" },
    { name: "enforced", order: 40, perm: true, verb: "enforce" },
    { name: "retired", order: 50, term: true, perm: true, verb: "retire" },
  ]},
];

// aliases: data_object_id -> [alias_name, alias_type][]
const ALIASES: [number, string, string][] = [
  [DO.data_assets, "Dataset", "synonym"], [DO.data_assets, "Data Source", "synonym"],
  [DO.data_lineage_relationships, "Lineage Edge", "synonym"], [DO.data_lineage_relationships, "Data Flow", "synonym"],
  [DO.glossary_terms, "Business Term", "synonym"], [DO.glossary_terms, "Glossary Entry", "synonym"],
  [DO.data_classifications, "Sensitivity Label", "synonym"], [DO.data_classifications, "Data Tag", "synonym"],
  [DO.data_domains, "Subject Area", "synonym"], [DO.data_domains, "Data Domain Grouping", "synonym"],
  [DO.data_stewardship_assignments, "Steward Assignment", "synonym"], [DO.data_stewardship_assignments, "Data Ownership Assignment", "synonym"],
  [DO.data_certifications, "Trust Certification", "synonym"], [DO.data_certifications, "Asset Certification", "synonym"],
  [DO.data_access_policies, "Access Policy", "synonym"], [DO.data_access_policies, "Data Access Rule", "synonym"],
  [DO.data_usage_metrics, "Usage Analytics", "synonym"], [DO.data_usage_metrics, "Popularity Signal", "synonym"],
];

// relationships: [from, to, verb, inverse, type, kind, is_required, owner_side]
const RELS: [number, number, string, string, string, string, boolean, string][] = [
  // intra-domain (B6)
  [DO.data_domains, DO.data_assets, "contains", "belongs to data domain", "one_to_many", "reference", false, "source"],
  [DO.data_assets, DO.data_lineage_relationships, "has lineage edge", "connects data asset", "one_to_many", "reference", true, "source"],
  [DO.data_classifications, DO.data_assets, "classifies", "is classified as", "one_to_many", "reference", false, "source"],
  [DO.data_assets, DO.data_certifications, "has certification", "certifies data asset", "one_to_many", "composition", true, "source"],
  [DO.data_assets, DO.data_access_policies, "has access policy", "controls access to", "one_to_many", "reference", false, "source"],
  [DO.data_assets, DO.data_usage_metrics, "has usage metric", "measures usage of", "one_to_many", "composition", true, "source"],
  [DO.data_assets, DO.data_stewardship_assignments, "has steward assignment", "stewards data asset", "one_to_many", "reference", false, "source"],
  [DO.data_domains, DO.glossary_terms, "organizes", "belongs to data domain", "one_to_many", "reference", false, "source"],
  [DO.glossary_terms, DO.data_assets, "annotates", "is described by glossary term", "many_to_many", "association", false, "source"],
  [DO.glossary_terms, DO.ontologies, "maps to ontology concept", "is expressed by glossary term", "many_to_many", "association", false, "source"],
  // users edges (B7)
  [USERS_ID, DO.data_assets, "owns", "is owned by", "one_to_many", "reference", false, "source"],
  [USERS_ID, DO.data_stewardship_assignments, "is steward in", "assigns steward", "one_to_many", "reference", true, "source"],
  [USERS_ID, DO.data_certifications, "certifies", "is certified by", "one_to_many", "reference", true, "source"],
  [USERS_ID, DO.data_access_policies, "approves access policy", "is approved by", "one_to_many", "reference", false, "source"],
  [USERS_ID, DO.data_classifications, "approves classification", "classification approved by", "one_to_many", "reference", false, "source"],
  [USERS_ID, DO.glossary_terms, "authors", "is authored by", "one_to_many", "reference", false, "source"],
  // cross-domain outbound (B8)
  [DO.glossary_terms, KGP_ONTOLOGIES_ID, "semantically aligns with", "is realized by glossary term", "many_to_many", "association", false, "source"],
];

// new trigger_events for gated states lacking one: [event_name, data_object_id, from_state, to_state, category, description]
const EVENTS: [string, number, string, string, string, string][] = [
  ["data_asset.deprecated", DO.data_assets, "certified", "deprecated", "lifecycle", "A data asset is retired from active use in the catalog; downstream consumers and lineage edges should be flagged for migration or removal."],
  ["glossary_term.deprecated", DO.glossary_terms, "published", "deprecated", "lifecycle", "A published business glossary term is retired; term-to-asset links and ontology mappings should be re-pointed to the replacement term."],
  ["data_classification.approved", DO.data_classifications, "proposed", "approved", "state_change", "A proposed sensitivity classification is approved by a steward and locks against further edits; downstream DLP/DSPM enforcement reads the approved rule."],
  ["data_access_policy.approved", DO.data_access_policies, "under_review", "approved", "lifecycle", "A data access policy is signed off by its single accountable approver and locks; the platform access-control layer must enforce it."],
  ["data_stewardship_assignment.revoked", DO.data_stewardship_assignments, "active", "revoked", "lifecycle", "A steward assignment is revoked, leaving the asset or term without an active steward until reassigned; escalation should fire if the gap persists."],
];

// ===================================================================
// EXECUTION
// ===================================================================
async function syncByKey(path: string, rows: Row[], key: string): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${key}&limit=10000`);
  const have = new Set(existing.map(r => String(r[key])));
  const missing = rows.filter(r => !have.has(String(r[key])));
  if (missing.length) { console.log(`  + ${missing.length} new -> ${path} (${existing.length} existed)`); await post(path, missing); }
  else console.log(`  = ${path}: all ${existing.length} present`);
  const all = await get(`${path}?select=id,${key}&limit=10000`);
  const m = new Map<string, number>();
  for (const r of all) m.set(String(r[key]), Number(r.id));
  return m;
}

console.log("== PHASE A.1 capabilities ==");
const capMap = await syncByKey("/capabilities", CAPS, "capability_code");

console.log("== PHASE A.1 capability_domains ==");
{
  const existing = await get(`/capability_domains?domain_id=eq.${DOMAIN_ID}&select=capability_id`);
  const have = new Set(existing.map(r => Number(r.capability_id)));
  const rows = CAPS.map(c => capMap.get(c.capability_code)!).filter(id => !have.has(id))
    .map(capability_id => ({ capability_id, domain_id: DOMAIN_ID, notes: "" }));
  if (rows.length) { console.log(`  + ${rows.length} capability_domains`); await post("/capability_domains", rows); }
  else console.log("  = all capability_domains present");
}

console.log("== PHASE A.2 modules ==");
const modMap = await syncByKey("/domain_modules", MODULES, "domain_module_code");

console.log("== PHASE A.2 domain_module_capabilities ==");
{
  const modIds = MODULES.map(m => modMap.get(m.domain_module_code)!);
  const existing = await get(`/domain_module_capabilities?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,capability_id`);
  const have = new Set(existing.map(r => `${r.domain_module_id}.${r.capability_id}`));
  const rows: Row[] = [];
  for (const [capCode, mods] of Object.entries(CAP_MODULE)) {
    const cid = capMap.get(capCode)!;
    for (const mc of mods) {
      const mid = modMap.get(mc)!;
      if (!have.has(`${mid}.${cid}`)) rows.push({ domain_module_id: mid, capability_id: cid, notes: "" });
    }
  }
  if (rows.length) { console.log(`  + ${rows.length} domain_module_capabilities`); await post("/domain_module_capabilities", rows); }
  else console.log("  = all domain_module_capabilities present");
}

console.log("== PHASE B domain_module_data_objects ==");
{
  const modIds = MODULES.map(m => modMap.get(m.domain_module_code)!);
  const existing = await get(`/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id`);
  const have = new Set(existing.map(r => `${r.domain_module_id}.${r.data_object_id}`));
  const rows: Row[] = [];
  for (const [mc, doid, role, nec] of DMDO) {
    const mid = modMap.get(mc)!;
    if (!have.has(`${mid}.${doid}`)) rows.push({ domain_module_id: mid, data_object_id: doid, role, necessity: nec, notes: "" });
  }
  if (rows.length) { console.log(`  + ${rows.length} domain_module_data_objects`); await post("/domain_module_data_objects", rows); }
  else console.log("  = all domain_module_data_objects present");
}

console.log("== PHASE B entity_type classification ==");
for (const [doid, et] of Object.entries(ENTITY_TYPE)) {
  await patch(`/data_objects?id=eq.${doid}`, { entity_type: et });
}
console.log(`  patched entity_type on ${Object.keys(ENTITY_TYPE).length} data_objects`);

console.log("== PHASE B pattern flags ==");
for (const [doid, flags] of FLAGS) await patch(`/data_objects?id=eq.${doid}`, flags);
console.log(`  patched flags on ${FLAGS.length} data_objects`);

console.log("== PHASE B lifecycle states ==");
{
  const doids = LIFECYCLE.map(l => l.do);
  const existing = await get(`/data_object_lifecycle_states?data_object_id=in.(${doids.join(",")})&select=data_object_id,state_name`);
  const have = new Set(existing.map(r => `${r.data_object_id}.${r.state_name}`));
  const rows: Row[] = [];
  for (const l of LIFECYCLE) {
    const mid = modMap.get(l.module)!;
    for (const s of l.states) {
      if (have.has(`${l.do}.${s.name}`)) continue;
      rows.push({
        data_object_id: l.do, state_name: s.name, state_order: s.order,
        is_initial: !!s.init, is_terminal: !!s.term, requires_permission: !!s.perm,
        permission_verb_override: s.verb ?? "", domain_module_id: mid,
      });
    }
  }
  if (rows.length) { console.log(`  + ${rows.length} lifecycle states`); await post("/data_object_lifecycle_states", rows); }
  else console.log("  = all lifecycle states present");
}

console.log("== PHASE B aliases ==");
{
  const doids = [...new Set(ALIASES.map(a => a[0]))];
  const existing = await get(`/data_object_aliases?data_object_id=in.(${doids.join(",")})&select=data_object_id,alias_name`);
  const have = new Set(existing.map(r => `${r.data_object_id}.${r.alias_name}`));
  const rows = ALIASES.filter(([d, n]) => !have.has(`${d}.${n}`))
    .map(([data_object_id, alias_name, alias_type]) => ({ data_object_id, alias_name, alias_type, is_preferred: false, notes: "" }));
  if (rows.length) { console.log(`  + ${rows.length} aliases`); await post("/data_object_aliases", rows); }
  else console.log("  = all aliases present");
}

console.log("== PHASE B new trigger_events ==");
const evMap = await syncByKey("/trigger_events",
  EVENTS.map(([event_name, data_object_id, from_state, to_state, event_category, description]) =>
    ({ event_name, data_object_id, from_state, to_state, event_category, description })), "event_name");

console.log("== PHASE B data_object_relationships ==");
{
  const fromIds = [...new Set(RELS.map(r => r[0]))];
  const existing = await get(`/data_object_relationships?data_object_id=in.(${fromIds.join(",")})&select=data_object_id,related_data_object_id,relationship_verb`);
  const have = new Set(existing.map(r => `${r.data_object_id}.${r.related_data_object_id}.${r.relationship_verb}`));
  const rows = RELS.filter(([f, t, v]) => !have.has(`${f}.${t}.${v}`))
    .map(([data_object_id, related_data_object_id, relationship_verb, inverse_verb, relationship_type, relationship_kind, is_required, owner_side]) =>
      ({ data_object_id, related_data_object_id, relationship_verb, inverse_verb, relationship_type, relationship_kind, is_required, owner_side, notes: "" }));
  if (rows.length) { console.log(`  + ${rows.length} relationships`); await post("/data_object_relationships", rows); }
  else console.log("  = all relationships present");
}

console.log("== PHASE B handoff module-FK backfill (B10b) ==");
{
  // entity_id -> realizing DCG module code (for both source-event and target-payload resolution)
  const ENTITY_MODULE: Record<number, string> = {
    [DO.data_assets]: "DCG-CATALOG", [DO.data_domains]: "DCG-CATALOG",
    [DO.data_lineage_relationships]: "DCG-LINEAGE",
    [DO.glossary_terms]: "DCG-GLOSSARY", [DO.ontologies]: "DCG-GLOSSARY",
    [DO.data_classifications]: "DCG-ACCESS-GOV", [DO.data_access_policies]: "DCG-ACCESS-GOV",
    [DO.data_stewardship_assignments]: "DCG-STEWARDSHIP", [DO.data_certifications]: "DCG-STEWARDSHIP",
    [DO.data_usage_metrics]: "DCG-DATA-PRODUCTS", [DO.data_products]: "DCG-DATA-PRODUCTS", [DO.metric_definitions]: "DCG-DATA-PRODUCTS",
  };
  const modCodeToId = (c: string) => modMap.get(c)!;
  const unresolved: string[] = [];

  // OUTBOUND: source_domain_module_id = module mastering the trigger event's data_object (fallback payload)
  const outbound = await get(`/handoffs?source_domain_id=eq.${DOMAIN_ID}&source_domain_module_id=is.null&select=id,trigger_event_id,data_object_id,trigger_events(data_object_id)`);
  for (const h of outbound) {
    const evDo = (h.trigger_events as Row | null)?.data_object_id as number | undefined;
    const code = (evDo && ENTITY_MODULE[evDo]) || ENTITY_MODULE[Number(h.data_object_id)];
    if (code) await patch(`/handoffs?id=eq.${h.id}`, { source_domain_module_id: modCodeToId(code) });
    else unresolved.push(`outbound handoff ${h.id} (event_do=${evDo}, payload=${h.data_object_id})`);
  }
  // INBOUND: target_domain_module_id = module holding the handoff payload data_object
  const inbound = await get(`/handoffs?target_domain_id=eq.${DOMAIN_ID}&target_domain_module_id=is.null&select=id,data_object_id`);
  for (const h of inbound) {
    const code = ENTITY_MODULE[Number(h.data_object_id)];
    if (code) await patch(`/handoffs?id=eq.${h.id}`, { target_domain_module_id: modCodeToId(code) });
    else unresolved.push(`inbound handoff ${h.id} (payload=${h.data_object_id})`);
  }
  console.log(`  resolved outbound=${outbound.length - unresolved.filter(u=>u.startsWith("outbound")).length}/${outbound.length}, inbound=${inbound.length - unresolved.filter(u=>u.startsWith("inbound")).length}/${inbound.length}`);
  if (unresolved.length) { console.log("  UNRESOLVED (payload not a DCG-modeled entity):"); for (const u of unresolved) console.log("    - " + u); }
}

console.log("== PHASE A catalog UX (domain + modules), empty-guard ==");
{
  const dom = (await get(`/domains?id=eq.${DOMAIN_ID}&select=catalog_tagline,catalog_description`))[0];
  if (!dom.catalog_tagline) await patch(`/domains?id=eq.${DOMAIN_ID}`, {
    catalog_tagline: "Find, trust, and govern every data asset across the enterprise from one place.",
  });
  if (!dom.catalog_description) await patch(`/domains?id=eq.${DOMAIN_ID}`, {
    catalog_description: "Crawl and catalog your data sources, trace lineage end to end, run a shared business glossary, classify and certify assets, route data-access requests through policy, and publish governed data products. This is the metadata-and-governance layer that sits over the data estate so people can discover the right data and use it within the rules, without filing a ticket for every question or losing track of what is sensitive.",
  });
  console.log(`  domain catalog_tagline ${dom.catalog_tagline ? "kept" : "written"}, catalog_description ${dom.catalog_description ? "kept" : "written"}`);

  const modIds = MODULES.map(m => modMap.get(m.domain_module_code)!);
  const live = await get(`/domain_modules?id=in.(${modIds.join(",")})&select=id,domain_module_code,catalog_tagline,catalog_description`);
  const liveBy = new Map(live.map(r => [r.domain_module_code as string, r]));
  for (const m of MODULES) {
    const cur = liveBy.get(m.domain_module_code)!;
    const body: Row = {};
    if (!cur.catalog_tagline) body.catalog_tagline = m.catalog_tagline;
    if (!cur.catalog_description) body.catalog_description = m.catalog_description;
    if (Object.keys(body).length) await patch(`/domain_modules?id=eq.${cur.id}`, body);
  }
  console.log(`  module catalog UX written into empty fields across ${MODULES.length} modules`);
}

console.log("\n== PHASE A+B DONE. Module id map ==");
for (const m of MODULES) console.log(`  ${m.domain_module_code} = ${modMap.get(m.domain_module_code)}`);
