// Thin-coverage audit expansion loader (2026-05-22)
//
// Inputs (user decisions on collisions): 1a / 2a / 3a / 4c / 5c.
//
// Pattern: 6 phases. Each phase idempotent against live state.
//   Phase 1: PATCH rename data_objects (VMS work_orders → pm_work_orders)
//   Phase 2: PATCH rename trigger_events (work_order.invoiced → pm_work_order.invoiced)
//   Phase 3: DELETE master links (SPEND-MGMT ↔ corporate_cards/card_transactions, KGP ↔ ontologies/knowledge_graph_entities)
//   Phase 4: INSERT new data_objects
//   Phase 5: INSERT new domain_data_objects master rows
//   Phase 6: INSERT reuse-existing master links (SUP-LIFE → supplier_certifications id 498)
//
// CLI: bun run .tmp_deploy/load_thin_coverage_expand.ts          (dry-run)
//      bun run .tmp_deploy/load_thin_coverage_expand.ts --apply  (apply)

const APPLY = process.argv.includes("--apply");
const CHUNK = 50;

async function call(body: any): Promise<any[]> {
  const p = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  p.stdin.write(JSON.stringify(body));
  await p.stdin.end();
  const out = await new Response(p.stdout).text();
  const err = await new Response(p.stderr).text();
  await p.exited;
  if (p.exitCode !== 0) throw new Error(`semantius failed (${p.exitCode}): ${err}\nstdout: ${out}`);
  try { return JSON.parse(out); } catch { throw new Error(`bad json from semantius: ${out.slice(0, 500)}`); }
}
const get = (path: string) => call({ method: "GET", path });
async function patch(path: string, body: any) {
  if (!APPLY) { console.log(`[dry-run] PATCH ${path}  body=${JSON.stringify(body)}`); return; }
  await call({ method: "PATCH", path, body });
}
async function del(path: string) {
  if (!APPLY) { console.log(`[dry-run] DELETE ${path}`); return; }
  await call({ method: "DELETE", path });
}
async function insertChunked(path: string, rows: any[]): Promise<any[]> {
  if (rows.length === 0) return [];
  if (!APPLY) { console.log(`[dry-run] POST ${path}  rows=${rows.length}`); return []; }
  const out: any[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const r = await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) });
    out.push(...(r ?? []));
  }
  return out;
}

// ---------- Decision input ----------

// Phase 1: data_object renames
const DO_RENAMES: { id: number; new_name: string; new_label: string }[] = [
  { id: 187, new_name: "pm_work_orders", new_label: "Preventive Maintenance Work Order" }, // VMS keeps id 187 under qualified name; FSM gets new service_work_orders
];

// Phase 2: trigger_event renames (one per affected event)
const TE_RENAMES: { id: number; new_event_name: string }[] = [
  { id: 146, new_event_name: "pm_work_order.invoiced" }, // referenced data_object 187
];

// Phase 3: master link deletes (single-master split outcomes)
// 4c — SPEND-MGMT loses master of corporate_cards (212) + card_transactions (213); EXPENSE keeps both
// 5c — KGP loses master of ontologies (254) + knowledge_graph_entities (255); DATA-AI-PLAT keeps both
const DELETE_MASTER_LINKS: { domain_code: string; data_object_id: number; reason: string }[] = [
  { domain_code: "SPEND-MGMT", data_object_id: 212, reason: "Decision 4c — EXPENSE keeps corporate_cards; SPEND-MGMT gets new corporate_card_accounts" },
  { domain_code: "SPEND-MGMT", data_object_id: 213, reason: "Decision 4c — EXPENSE keeps card_transactions; SPEND-MGMT gets new card_authorizations" },
  { domain_code: "KGP",        data_object_id: 254, reason: "Decision 5c — DATA-AI-PLAT keeps ontologies; KGP gets new kgp_ontologies" },
  { domain_code: "KGP",        data_object_id: 255, reason: "Decision 5c — DATA-AI-PLAT keeps knowledge_graph_entities; KGP gets new kgp_knowledge_graph_entities" },
];

// Phase 4 + 5: New data_objects with their master domain
type NewDO = { data_object_name: string; singular_label?: string; plural_label?: string; display_label: string; description: string; master_domain_code: string };
const NEW_DOS: NewDO[] = [
  // BI (4)
  { data_object_name: "bi_reports",                    singular_label: "BI Report", plural_label: "BI Reports", display_label: "BI Report",                    description: "Published BI report authored and served by a BI tool (Tableau workbook, Power BI report, Looker look).",           master_domain_code: "BI" },
  { data_object_name: "bi_dashboards",                 singular_label: "BI Dashboard", plural_label: "BI Dashboards", display_label: "BI Dashboard",                 description: "Interactive multi-visualisation dashboard bound to semantic models in the BI tool.",                                  master_domain_code: "BI" },
  { data_object_name: "bi_queries",                    singular_label: "BI Saved Query", plural_label: "BI Saved Queries", display_label: "BI Saved Query",               description: "Saved exploration / prepared query (Looker explore, Tableau workbook query, Mode query).",                          master_domain_code: "BI" },
  { data_object_name: "bi_subscriptions",              singular_label: "BI Subscription", plural_label: "BI Subscriptions", display_label: "BI Subscription",              description: "Scheduled delivery configuration (email report, Slack alert, webhook push) for a BI report or dashboard.",        master_domain_code: "BI" },

  // HAM (4)
  { data_object_name: "hardware_models",               singular_label: "Hardware Model", plural_label: "Hardware Models", display_label: "Hardware Model",               description: "Canonical catalog of hardware device types, SKUs and specifications; matches assets to refreshable units.",       master_domain_code: "HAM" },
  { data_object_name: "hardware_warranties",           singular_label: "Hardware Warranty", plural_label: "Hardware Warranties", display_label: "Hardware Warranty",            description: "Manufacturer support contract / coverage terms / expiration tracking for a hardware asset.",                         master_domain_code: "HAM" },
  { data_object_name: "hardware_disposal_records",     singular_label: "Hardware Disposal Record", plural_label: "Hardware Disposal Records", display_label: "Hardware Disposal Record",     description: "Decommissioning, e-waste tracking, ITAD chain-of-custody and data-wipe compliance for retired hardware.",         master_domain_code: "HAM" },
  { data_object_name: "spare_parts_inventory",         singular_label: "Spare Part Inventory Item", plural_label: "Spare Part Inventory Items", display_label: "Spare Part Inventory Item",    description: "Stockroom counts and procurement of replacement hardware components (not yet deployed assets).",                   master_domain_code: "HAM" },

  // CONV-AI (3)
  { data_object_name: "bot_definitions",               singular_label: "Bot Definition", plural_label: "Bot Definitions", display_label: "Bot Definition",               description: "Static conversational-AI bot configuration: persona, instructions, system prompt, disambiguation rules.",          master_domain_code: "CONV-AI" },
  { data_object_name: "intent_definitions",            singular_label: "Intent Definition", plural_label: "Intent Definitions", display_label: "Intent Definition",            description: "Intent specification — training phrases, entities, resolution rules — drives detection at runtime.",                master_domain_code: "CONV-AI" },
  { data_object_name: "conversation_flows",            singular_label: "Conversation Flow", plural_label: "Conversation Flows", display_label: "Conversation Flow",            description: "Dialogue state machine / branching graph that orchestrates a conversational journey.",                            master_domain_code: "CONV-AI" },

  // FLEET-MAINT (2)
  { data_object_name: "vehicle_parts_inventory",       singular_label: "Vehicle Parts Inventory Item", plural_label: "Vehicle Parts Inventory Items", display_label: "Vehicle Parts Inventory Item", description: "Parts stocked in garages / service bays for immediate vehicle repair use.",                                       master_domain_code: "FLEET-MAINT" },
  { data_object_name: "maintenance_defects",           singular_label: "Maintenance Defect", plural_label: "Maintenance Defects", display_label: "Maintenance Defect",           description: "Structured defect / non-conformance record (pre-work-order capture from DVIR or inspection).",                       master_domain_code: "FLEET-MAINT" },

  // IGA (5) — scope-qualified with iga_ prefix to avoid collisions with Semantius RBAC + ITSM
  { data_object_name: "iga_access_requests",           singular_label: "IGA Access Request", plural_label: "IGA Access Requests", display_label: "IGA Access Request",           description: "User-initiated access request + approval workflow within an IGA platform.",                                       master_domain_code: "IGA" },
  { data_object_name: "iga_access_certifications",     singular_label: "IGA Access Certification", plural_label: "IGA Access Certifications", display_label: "IGA Access Certification",     description: "Access review / certification campaign and per-user attestation outcome.",                                          master_domain_code: "IGA" },
  { data_object_name: "iga_entitlement_definitions",   singular_label: "IGA Entitlement Definition", plural_label: "IGA Entitlement Definitions", display_label: "IGA Entitlement Definition",   description: "Business-role / entitlement template provisioned into downstream systems — distinct from Semantius platform roles.", master_domain_code: "IGA" },
  { data_object_name: "iga_sod_violations",            singular_label: "IGA SoD Violation", plural_label: "IGA SoD Violations", display_label: "IGA SoD Violation",            description: "Segregation-of-duties policy violation and exception-approval record.",                                            master_domain_code: "IGA" },
  { data_object_name: "iga_provisioning_events",       singular_label: "IGA Provisioning Event", plural_label: "IGA Provisioning Events", display_label: "IGA Provisioning Event",       description: "Per-target outcome of an IGA-orchestrated provisioning action (success, failure, retry).",                         master_domain_code: "IGA" },

  // METRICS-LAYER (3)
  { data_object_name: "metric_materializations",       singular_label: "Metric Materialization", plural_label: "Metric Materializations", display_label: "Metric Materialization",       description: "Cached / pre-aggregated metric rollup served from columnar storage (Cube cache, dbt semantic-layer cache).",       master_domain_code: "METRICS-LAYER" },
  { data_object_name: "query_lineage_records",         singular_label: "Query Lineage Record", plural_label: "Query Lineage Records", display_label: "Query Lineage Record",         description: "Executed-query audit trail linking metric reads back to source tables, transformations and requestor identity.",   master_domain_code: "METRICS-LAYER" },
  { data_object_name: "metric_access_policies",        singular_label: "Metric Access Policy", plural_label: "Metric Access Policies", display_label: "Metric Access Policy",         description: "Row-level / metric-level ABAC policy at the semantic-definition tier (which BU sees which metric).",               master_domain_code: "METRICS-LAYER" },

  // NCDB (3)
  { data_object_name: "nocode_forms",                  singular_label: "No-Code Form", plural_label: "No-Code Forms", display_label: "No-Code Form",                 description: "Public / authenticated intake form authored in the no-code database (Airtable form, Smartsheet form).",            master_domain_code: "NCDB" },
  { data_object_name: "nocode_views",                  singular_label: "No-Code View", plural_label: "No-Code Views", display_label: "No-Code View",                 description: "Switchable presentation layer (grid, gallery, kanban, calendar, timeline) over a no-code base.",                  master_domain_code: "NCDB" },
  { data_object_name: "nocode_automations",            singular_label: "No-Code Automation", plural_label: "No-Code Automations", display_label: "No-Code Automation",           description: "Record-triggered workflow / scheduled job / external API call defined in the no-code platform.",                    master_domain_code: "NCDB" },

  // LCAP (2) — continue extend_ prefix convention
  { data_object_name: "extend_pages",                  singular_label: "Low-Code Page", plural_label: "Low-Code Pages", display_label: "Low-Code Page",                description: "UI screen / page authored as a versioned LCAP application artifact (Mendix page, OutSystems screen, Power Apps canvas).", master_domain_code: "LCAP" },
  { data_object_name: "extend_data_sources",           singular_label: "Low-Code Data Source", plural_label: "Low-Code Data Sources", display_label: "Low-Code Data Source",         description: "Configured external connection (Salesforce, database, REST API) bound to a low-code app with schema introspection.", master_domain_code: "LCAP" },

  // LOYALTY (2)
  { data_object_name: "redemption_rewards",            singular_label: "Redemption Reward", plural_label: "Redemption Rewards", display_label: "Redemption Reward",            description: "Reward catalog entry — point values, redemption eligibility rules, partner-offer linkage.",                       master_domain_code: "LOYALTY" },
  { data_object_name: "redemption_transactions",       singular_label: "Redemption Transaction", plural_label: "Redemption Transactions", display_label: "Redemption Transaction",       description: "Fulfillment of a loyalty reward redemption (point deduction, reward shipment, partner settlement).",               master_domain_code: "LOYALTY" },

  // RE-CRE (3)
  { data_object_name: "tenant_credit_records",         singular_label: "Tenant Credit Record", plural_label: "Tenant Credit Records", display_label: "Tenant Credit Record",         description: "Commercial-tenant financial health, payment history, default risk; underwrites CRE leasing decisions.",            master_domain_code: "RE-CRE" },
  { data_object_name: "sublease_transactions",         singular_label: "Sublease Transaction", plural_label: "Sublease Transactions", display_label: "Sublease Transaction",         description: "Sublease grant / consent / commencement / termination with its own financial lifecycle vs the head lease.",        master_domain_code: "RE-CRE" },
  { data_object_name: "building_certifications",       singular_label: "Building Certification", plural_label: "Building Certifications", display_label: "Building Certification",       description: "Property certification record (LEED, BREEAM, WiredScore, seismic, accessibility) supporting underwriting + tenant appeal.", master_domain_code: "RE-CRE" },

  // AIOPS (3)
  { data_object_name: "alert_suppression_rules",       singular_label: "Alert Suppression Rule", plural_label: "Alert Suppression Rules", display_label: "Alert Suppression Rule",       description: "AIOps noise-reduction rule — patterns to filter / suppress (known-noise signatures, maintenance exclusions).",   master_domain_code: "AIOPS" },
  { data_object_name: "ml_model_training_records",     singular_label: "ML Model Training Record", plural_label: "ML Model Training Records", display_label: "ML Model Training Record",     description: "Training metadata for AIOps ML models (feature set, training window, model version, accuracy, retraining schedule).", master_domain_code: "AIOPS" },
  { data_object_name: "incident_predictions",          singular_label: "Incident Prediction", plural_label: "Incident Predictions", display_label: "Incident Prediction",          description: "Proactive incident forecast (likely unplanned change → service impact in N hours) — higher-level than per-signal anomaly.", master_domain_code: "AIOPS" },

  // PSA (2)
  { data_object_name: "resource_skill_inventories",    singular_label: "Resource Skill Inventory", plural_label: "Resource Skill Inventories", display_label: "Resource Skill Inventory",     description: "Pool of skills / competencies across the resource base with proficiency levels — anchors PSA utilisation forecasting.", master_domain_code: "PSA" },
  { data_object_name: "project_resource_allocations",  singular_label: "Project Resource Allocation", plural_label: "Project Resource Allocations", display_label: "Project Resource Allocation", description: "Forward-looking resource commitment plan (skill, planned utilisation %, effective period) — distinct from executed assignments.", master_domain_code: "PSA" },

  // RE-INVEST (3)
  { data_object_name: "investment_funds",              singular_label: "Investment Fund", plural_label: "Investment Funds", display_label: "Investment Fund",              description: "Fund entity (name, vintage, size, type, GP, fee schedule, dissolution date) — organises capital calls + distributions.", master_domain_code: "RE-INVEST" },
  { data_object_name: "limited_partners",              singular_label: "Limited Partner", plural_label: "Limited Partners", display_label: "Limited Partner",              description: "LP entity + commitment + contributions-to-date + governance rights — required for LP compliance (K-1, consent tracking).", master_domain_code: "RE-INVEST" },
  { data_object_name: "asset_management_fees",         singular_label: "Asset Management Fee", plural_label: "Asset Management Fees", display_label: "Asset Management Fee",         description: "GP carry / management-fee schedule / performance-fee waterfall — required for true LP-return calculation.",      master_domain_code: "RE-INVEST" },

  // SUP-LIFE (1 new + 1 reuse-existing handled in Phase 6)
  { data_object_name: "supplier_risk_assessments",     singular_label: "Supplier Risk Assessment", plural_label: "Supplier Risk Assessments", display_label: "Supplier Risk Assessment",     description: "Operational / financial / cyber risk-scoring record per supplier; feeds GRC consumption.",                          master_domain_code: "SUP-LIFE" },

  // TELEMATICS (4)
  { data_object_name: "gps_waypoints",                 singular_label: "GPS Waypoint", plural_label: "GPS Waypoints", display_label: "GPS Waypoint",                 description: "Continuous vehicle location stream (timestamp, lat, lon, speed, heading) — powers heat maps + geofence checks.",   master_domain_code: "TELEMATICS" },
  { data_object_name: "idle_events",                   singular_label: "Idle Event", plural_label: "Idle Events", display_label: "Idle Event",                   description: "Engine-running, vehicle-stationary state change — distinct from trip aggregation.",                                master_domain_code: "TELEMATICS" },
  { data_object_name: "geofence_events",               singular_label: "Geofence Event", plural_label: "Geofence Events", display_label: "Geofence Event",               description: "Vehicle entry / exit across a defined geofence boundary.",                                                         master_domain_code: "TELEMATICS" },
  { data_object_name: "driver_safety_scorecards",      singular_label: "Driver Safety Scorecard", plural_label: "Driver Safety Scorecards", display_label: "Driver Safety Scorecard",      description: "Aggregated safety + efficiency risk metrics per driver (speeding, harsh braking, idle).",                         master_domain_code: "TELEMATICS" },

  // CCAAS — Decision 1a (ccaas_call_recordings scope-qualified)
  { data_object_name: "ccaas_call_recordings",         singular_label: "CCaaS Call Recording", plural_label: "CCaaS Call Recordings", display_label: "CCaaS Call Recording",         description: "Call + screen recording from a contact-center session (Five9, Genesys, NICE) — distinct from SALES-ENG call_recordings.", master_domain_code: "CCAAS" },
  { data_object_name: "agent_states",                  singular_label: "Agent State", plural_label: "Agent States", display_label: "Agent State",                  description: "Contact-center agent presence + availability + pause-code state transitions (ACD foundation).",                   master_domain_code: "CCAAS" },
  { data_object_name: "disposition_codes",             singular_label: "Disposition Code", plural_label: "Disposition Codes", display_label: "Disposition Code",             description: "Post-call wrap category / business-reason taxonomy for routing logic + analytics.",                              master_domain_code: "CCAAS" },

  // LEGAL-PRACT-MGMT — Decision 3a (external_court_filings scope-qualified to avoid LSD collision)
  { data_object_name: "external_court_filings",        singular_label: "External Court Filing", plural_label: "External Court Filings", display_label: "External Court Filing",       description: "Court filing on behalf of a law-firm client (venue, judge, docket, key dates) — distinct from LSD in-house dockets.", master_domain_code: "LEGAL-PRACT-MGMT" },
  { data_object_name: "client_invoices",               singular_label: "Client Invoice", plural_label: "Client Invoices", display_label: "Client Invoice",               description: "Matter-scoped invoice generated from time entries + disbursements + retainer drawdowns.",                          master_domain_code: "LEGAL-PRACT-MGMT" },

  // FSM — Decision 2a (service_work_orders; service_contracts)
  { data_object_name: "service_work_orders",           singular_label: "Service Work Order", plural_label: "Service Work Orders", display_label: "Service Work Order",          description: "Customer-facing service job request fulfilled by field visits — distinct from VMS preventive-maintenance work orders.", master_domain_code: "FSM" },
  { data_object_name: "service_contracts",             singular_label: "Service Contract", plural_label: "Service Contracts", display_label: "Service Contract",            description: "SLA-bearing service contract (response time, parts coverage, call-out fees) — distinct from CLM canonical contracts.", master_domain_code: "FSM" },

  // KGP — Decision 5c (kgp_*-prefixed split from DATA-AI-PLAT shared masters)
  { data_object_name: "kgp_ontologies",                singular_label: "KGP Ontology", plural_label: "KGP Ontologies", display_label: "KGP Ontology",                 description: "Knowledge-graph-platform-specific ontology (Stardog / TopBraid) — distinct from DATA-AI-PLAT shared ontologies.", master_domain_code: "KGP" },
  { data_object_name: "kgp_knowledge_graph_entities",  singular_label: "KGP Knowledge Graph Entity", plural_label: "KGP Knowledge Graph Entities", display_label: "KGP Knowledge Graph Entity",   description: "Knowledge-graph-platform-mastered entities — distinct from DATA-AI-PLAT shared knowledge_graph_entities.",        master_domain_code: "KGP" },

  // SPEND-MGMT — Decision 4c (split: SPEND-MGMT gets new pre-auth-side names; EXPENSE keeps corporate_cards + card_transactions)
  { data_object_name: "corporate_card_accounts",       singular_label: "Corporate Card Account", plural_label: "Corporate Card Accounts", display_label: "Corporate Card Account",      description: "SPEND-MGMT-side card-issuance + control record (Ramp / Brex card) — distinct from EXPENSE corporate_cards (reconciliation).", master_domain_code: "SPEND-MGMT" },
  { data_object_name: "card_authorizations",           singular_label: "Card Authorization", plural_label: "Card Authorizations", display_label: "Card Authorization",          description: "Real-time pre-authorisation event from card network with policy decision — distinct from EXPENSE settled card_transactions.", master_domain_code: "SPEND-MGMT" },
  { data_object_name: "vendor_payment_authorizations", singular_label: "Vendor Payment Authorisation", plural_label: "Vendor Payment Authorisations", display_label: "Vendor Payment Authorisation", description: "Pre-payment approval workflow for vendor-direct payments — distinct from employee-initiated spend_requests.",     master_domain_code: "SPEND-MGMT" },
  { data_object_name: "spend_policies",                singular_label: "Spend Policy", plural_label: "Spend Policies", display_label: "Spend Policy",                description: "Pre-spend authorisation rules (card limits, vendor restrictions, approval matrices) — distinct from EXPENSE post-hoc policies.", master_domain_code: "SPEND-MGMT" },
];

// Phase 6: reuse-existing master/contributor link
// Subagent: "SUP-LIFE should co-master supplier_certifications (id 498) currently mastered by domain 155 (CERTIFICATIONS)."
const REUSE_LINKS: { domain_code: string; data_object_id: number; role: string; notes: string }[] = [
  { domain_code: "SUP-LIFE", data_object_id: 498, role: "master", notes: "SUP-LIFE drives supplier-side certification capture during onboarding/qualification; CERTIFICATIONS (id 155) owns compliance-audit metadata. Co-master with slice notes per SKILL.md multi-master rule." },
];

// ---------- Resolve live state ----------

const domains = await get(`/domains?select=id,domain_code&limit=10000`) as { id: number; domain_code: string }[];
const domainId = new Map(domains.map(d => [d.domain_code, d.id]));
const existingDOs = await get(`/data_objects?select=id,data_object_name&limit=10000`) as { id: number; data_object_name: string }[];
const doIdByName = new Map(existingDOs.map(d => [d.data_object_name, d.id]));
const doNameById = new Map(existingDOs.map(d => [d.id, d.data_object_name]));
const ddo = await get(`/domain_data_objects?select=domain_id,data_object_id,role&limit=20000`) as { domain_id: number; data_object_id: number; role: string }[];
const ddoKey = (di: number, doi: number, r: string) => `${di}:${doi}:${r}`;
const existingDDO = new Set(ddo.map(r => ddoKey(r.domain_id, r.data_object_id, r.role)));

// ---------- Validate ----------

console.log("=== Validation ===");
const collisions = NEW_DOS.filter(n => doIdByName.has(n.data_object_name));
if (collisions.length) {
  console.warn(`!! ${collisions.length} proposed new data_objects already exist in catalog — will be skipped:`);
  for (const c of collisions) console.warn(`   - ${c.data_object_name} (already id ${doIdByName.get(c.data_object_name)})`);
}
for (const n of NEW_DOS) {
  if (!domainId.has(n.master_domain_code)) throw new Error(`Unknown master_domain_code: ${n.master_domain_code}`);
}
for (const r of DO_RENAMES) {
  if (!doNameById.has(r.id)) throw new Error(`Rename target data_object id=${r.id} not found in live state.`);
  if (doIdByName.has(r.new_name)) throw new Error(`Rename target name '${r.new_name}' already exists (id ${doIdByName.get(r.new_name)}).`);
}
for (const d of DELETE_MASTER_LINKS) {
  const di = domainId.get(d.domain_code);
  if (!di) throw new Error(`Unknown domain_code: ${d.domain_code}`);
  if (!existingDDO.has(ddoKey(di, d.data_object_id, "master"))) {
    console.warn(`!! DELETE target not present (will skip): ${d.domain_code} master of id ${d.data_object_id}`);
  }
}
for (const r of REUSE_LINKS) {
  if (!doIdByName.has(doNameById.get(r.data_object_id) ?? "__none__") && !existingDOs.find(d => d.id === r.data_object_id)) {
    throw new Error(`Reuse target data_object id=${r.data_object_id} does not exist.`);
  }
}

console.log("Validation passed.\n");

// ---------- Phase 1 — data_object renames ----------
console.log(`=== Phase 1: data_object renames (${DO_RENAMES.length}) ===`);
for (const r of DO_RENAMES) {
  console.log(`  ${doNameById.get(r.id)} (id=${r.id}) → ${r.new_name}`);
  await patch(`/data_objects?id=eq.${r.id}`, { data_object_name: r.new_name, display_label: r.new_label });
}

// ---------- Phase 2 — trigger_event renames ----------
console.log(`\n=== Phase 2: trigger_event renames (${TE_RENAMES.length}) ===`);
for (const t of TE_RENAMES) {
  console.log(`  trigger_events.id=${t.id} → ${t.new_event_name}`);
  await patch(`/trigger_events?id=eq.${t.id}`, { event_name: t.new_event_name });
}

// ---------- Phase 3 — delete obsolete master links ----------
console.log(`\n=== Phase 3: delete master links (${DELETE_MASTER_LINKS.length}) ===`);
for (const d of DELETE_MASTER_LINKS) {
  const di = domainId.get(d.domain_code)!;
  const exists = existingDDO.has(ddoKey(di, d.data_object_id, "master"));
  console.log(`  ${d.domain_code} (id=${di}) -X- ${doNameById.get(d.data_object_id) ?? `?#${d.data_object_id}`} (id=${d.data_object_id})  [${exists ? "DELETE" : "skip (not present)"}]  -- ${d.reason}`);
  if (exists) await del(`/domain_data_objects?domain_id=eq.${di}&data_object_id=eq.${d.data_object_id}&role=eq.master`);
}

// ---------- Phase 4 — insert new data_objects ----------
const newDOsToInsert = NEW_DOS.filter(n => !doIdByName.has(n.data_object_name));
console.log(`\n=== Phase 4: insert new data_objects (${newDOsToInsert.length} new, ${NEW_DOS.length - newDOsToInsert.length} already exist) ===`);
const doRows = newDOsToInsert.map(n => ({
  data_object_name: n.data_object_name,
  display_label: n.display_label,
  description: n.description,
}));
await insertChunked("/data_objects", doRows);

// Refresh DO map after insert (apply mode)
let postInsertDOs = doIdByName;
if (APPLY) {
  const updated = await get(`/data_objects?select=id,data_object_name&limit=10000`) as { id: number; data_object_name: string }[];
  postInsertDOs = new Map(updated.map(d => [d.data_object_name, d.id]));
}

// ---------- Phase 5 — new domain_data_objects master rows ----------
const ddoRows = [];
for (const n of NEW_DOS) {
  const di = domainId.get(n.master_domain_code)!;
  const doi = postInsertDOs.get(n.data_object_name);
  if (doi == null) {
    if (APPLY) throw new Error(`Could not resolve data_object id for ${n.data_object_name} after insert`);
    continue;
  }
  if (existingDDO.has(ddoKey(di, doi, "master"))) continue;
  ddoRows.push({ domain_id: di, data_object_id: doi, role: "master", notes: "" });
}
console.log(`\n=== Phase 5: insert new master domain_data_objects rows (${ddoRows.length}) ===`);
await insertChunked("/domain_data_objects", ddoRows);

// ---------- Phase 6 — reuse-existing master/contributor links ----------
const reuseRows = [];
for (const r of REUSE_LINKS) {
  const di = domainId.get(r.domain_code)!;
  if (existingDDO.has(ddoKey(di, r.data_object_id, r.role))) {
    console.log(`  ${r.domain_code} ↔ id ${r.data_object_id} (${r.role}) already exists; skipping.`);
    continue;
  }
  reuseRows.push({ domain_id: di, data_object_id: r.data_object_id, role: r.role, notes: r.notes });
}
console.log(`\n=== Phase 6: reuse-existing links (${reuseRows.length}) ===`);
await insertChunked("/domain_data_objects", reuseRows);

console.log(`\nMode: ${APPLY ? "APPLY (writes done)" : "DRY-RUN (no writes)"}`);
console.log(`Summary:`);
console.log(`  data_object renames:           ${DO_RENAMES.length}`);
console.log(`  trigger_event renames:         ${TE_RENAMES.length}`);
console.log(`  master-link deletes:           ${DELETE_MASTER_LINKS.length}`);
console.log(`  new data_objects:              ${newDOsToInsert.length} (of ${NEW_DOS.length} planned)`);
console.log(`  new master domain_data_objects: ${ddoRows.length}`);
console.log(`  reuse-existing links:          ${reuseRows.length}`);
