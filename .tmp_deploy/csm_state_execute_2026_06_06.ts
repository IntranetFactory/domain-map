#!/usr/bin/env bun
// CSM state-driven execute (2026-06-06). Lands every write at record_status='new'.
// Covers the EXECUTE items from audits/CSM/state.yaml:
//   1. B1A-ENTITY-TYPE   PATCH entity_type on masters 103/104/105 (and 111 customer_events)
//   2. B1A-H1            INSERT net-new handoff_processes rows (clean PCF matches only)
//   3. B1B-S1 + B1B-M8   PATCH empty catalog_tagline/catalog_description on domain 30 + modules 112/113/114
//   4. B1B-S3            INSERT net-new generic synonym aliases
//   5. B1B-S5            INSERT business_function_domains contributor + consumer rows
//
// Idempotent: reads live first, only writes what is missing/empty. Never overwrites a
// non-empty value. Never DELETEs. Never stamps approved.

import {} from "bun";

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

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => {
    const out: Row = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

const log: string[] = [];
function note(s: string) {
  console.log(s);
  log.push(s);
}

// ============================================================
// 1. B1A-ENTITY-TYPE
// ============================================================
// customer_cases (103): support ticket with a workflow (open->resolved->closed) => operational_workflow
// customer_entitlements (104): support tier / SLA config bound from subscription => catalog
//   (per Rule #12 heuristic: config/template/rule definition referenced by other entities;
//    activation/suspension is config change, not a per-record business workflow)
// csat_responses (105): per-survey response, captured-once, append/immutable => operational_record
// customer_events (111): unified append-only event firehose => operational_record
const entityTypeFixes: Array<{ id: number; name: string; entity_type: string }> = [
  { id: 103, name: "customer_cases", entity_type: "operational_workflow" },
  { id: 104, name: "customer_entitlements", entity_type: "catalog" },
  { id: 105, name: "csat_responses", entity_type: "operational_record" },
  { id: 111, name: "customer_events", entity_type: "operational_record" },
];

async function fixEntityTypes() {
  note("== B1A-ENTITY-TYPE ==");
  for (const f of entityTypeFixes) {
    const [cur] = await get(`/data_objects?id=eq.${f.id}&select=id,data_object_name,entity_type`);
    if (!cur) {
      note(`  data_object ${f.id} (${f.name}) NOT FOUND, skipping`);
      continue;
    }
    const curType = String(cur.entity_type ?? "");
    if (curType !== "unclassified" && curType !== "" && curType !== "null") {
      note(`  ${f.name} (${f.id}) already classified '${curType}', leaving as-is`);
      continue;
    }
    await patch(`/data_objects?id=eq.${f.id}`, { entity_type: f.entity_type });
    note(`  ${f.name} (${f.id}) entity_type '${curType || "null"}' -> '${f.entity_type}'`);
  }
}

// ============================================================
// 2. B1A-H1  (APQC tags, clean PCF matches, NET-NEW only)
// ============================================================
// PCF anchors used (all source_framework=apqc_pcf_cross_industry):
//   196 = Manage customer service problems, requests, and inquiries (6.2.2, L3)  -> "opens case" / routing
//     6 = Manage Customer Service (6.0, L1)                                       -> entitlement / contract
//   148 = Manage customers and accounts (3.5.2, L3)                               -> customers-payload health/expansion
//          (matches the existing curated convention on sibling rows 224 and 234)
//   200 = Register products (6.3.1, L3)                                           -> warranty activation
const apqcInserts: Array<{ handoff_id: number; process_id: number; why: string }> = [
  { handoff_id: 71, process_id: 6, why: "closed_won activates customer_entitlements" },
  { handoff_id: 209, process_id: 148, why: "account_health.declined on customers (matches 224/486 convention)" },
  { handoff_id: 330, process_id: 196, why: "commerce_order.completed opens follow-up case" },
  { handoff_id: 470, process_id: 196, why: "crm_opportunity.closed_won opens onboarding case" },
  { handoff_id: 486, process_id: 148, why: "health_score.declined on customers (sibling 224=148)" },
  { handoff_id: 488, process_id: 148, why: "subscription.expansion_requested on customers (sibling 234=148)" },
  { handoff_id: 496, process_id: 196, why: "usage_record.overage_detected opens inquiry" },
  { handoff_id: 523, process_id: 196, why: "msp_ticket.escalated opens case" },
  { handoff_id: 525, process_id: 6, why: "msp_contract.renewal_due is support-contract context" },
  { handoff_id: 865, process_id: 196, why: "rental_unit.vacant opens case" },
  { handoff_id: 899, process_id: 196, why: "patient_appointment.no_show opens case" },
  { handoff_id: 902, process_id: 196, why: "patient_referral.created opens case" },
  { handoff_id: 904, process_id: 196, why: "insurance_claim.fnol_received opens case" },
  { handoff_id: 908, process_id: 196, why: "insurance_claim.closed case close-out" },
  { handoff_id: 910, process_id: 196, why: "insurance_policy.cancelled opens case" },
  { handoff_id: 1003, process_id: 196, why: "product_feature.deprecated opens proactive case" },
  { handoff_id: 1058, process_id: 200, why: "warranty_activated maps to product registration" },
];
// Deferred to Discover (no clean PCF match): 270 (golden-record/MDM sync),
//   996 (beta_program.launched product notification), 1007 (product_metric breach ops signal),
//   1055 (inventory_lot.expiry_warning, not a recall).
const apqcDeferred = [270, 996, 1007, 1055];

async function tagHandoffs() {
  note("== B1A-H1 (APQC handoff_processes, net-new) ==");
  const ids = apqcInserts.map(r => r.handoff_id);
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${ids.join(",")})&select=handoff_id,process_id`,
  );
  const existingKey = new Set(existing.map(r => `${r.handoff_id}|${r.process_id}`));
  const toInsert = apqcInserts
    .filter(r => !existingKey.has(`${r.handoff_id}|${r.process_id}`))
    .map(r => ({
      handoff_id: r.handoff_id,
      process_id: r.process_id,
      proposal_source: "agent_curated",
      role: "implements",
    }));
  if (toInsert.length > 0) {
    await insert("/handoff_processes", toInsert);
  }
  note(
    `  inserted ${toInsert.length} handoff_processes rows (${existing.length} of the target pairs already present)`,
  );
  note(`  deferred-to-Discover (no clean PCF match): ${apqcDeferred.join(", ")}`);
}

// ============================================================
// 3. B1B-S1 + B1B-M8  (catalog UX, Rule #20 in-record review)
// ============================================================
const catalogDomain = {
  id: 30,
  catalog_tagline:
    "Capture every customer issue, triage it across channels, and resolve it fast against the support level the customer is owed.",
  catalog_description:
    "Customer Service Management turns inbound questions, complaints, and incidents into tracked cases your team can route, prioritize, and close. Capture cases from email, chat, phone, and social in one queue, then let triage and AI-assisted classification put each one in front of the right agent with the right context.\n\nResolve faster with a knowledge surface that suggests answers as agents work and lets them publish proven fixes back for self-service. Bind every case to the entitlements and service levels the customer has paid for, so response and resolution clocks reflect real contractual commitments and breaches are visible before they happen.\n\nClose the loop with satisfaction capture on every interaction, feeding retention and health signals back to the teams that own the relationship.",
};

const catalogModules: Array<{ id: number; catalog_tagline: string; catalog_description: string }> = [
  {
    id: 112, // CSM-CASE-MGMT
    catalog_tagline:
      "One queue for every customer case, from omnichannel capture through triage to resolution and CSAT.",
    catalog_description:
      "Case Management is the working surface for your support team. Capture cases from any channel into a single queue, classify and route them with AI-assisted triage, and give agents the customer and interaction history they need to resolve on first contact.\n\nDrive cases through a clear lifecycle to resolved and closed, with workflow gates that protect each step. Capture satisfaction on close-out so you can see how every interaction landed and feed health signals to the teams that own the account.",
  },
  {
    id: 113, // CSM-ENTITLEMENTS
    catalog_tagline:
      "Bind support to what the customer has paid for, with service tiers and SLA clocks that reflect real commitments.",
    catalog_description:
      "Entitlements and SLA Management defines what support each customer can use: service tier, included channels, support hours, named contacts, and response and resolution targets. Activate entitlements directly from the customer's subscription and contract so eligibility is always current.\n\nTie SLA clocks to those commitments so agents and supervisors see what is owed on every case, catch breaches before they happen, and prove that contractual service levels were met.",
  },
  {
    id: 114, // CSM-KNOWLEDGE
    catalog_tagline:
      "A customer-facing knowledge surface that speeds resolution and turns proven fixes into self-service.",
    catalog_description:
      "Customer Knowledge Surface puts the right answers in front of agents as they work a case and lets them publish audience-filtered articles for customers to find on their own. Authoring is informed by real support patterns, so the knowledge base grows around the questions customers actually ask.\n\nThe result is faster resolution, fewer repeat cases, and a self-service experience that deflects routine inquiries before they ever become a case.",
  },
];

async function backfillCatalog() {
  note("== B1B-S1 + B1B-M8 (catalog UX, empty-field backfill only) ==");
  // Domain 30
  const [dom] = await get(
    `/domains?id=eq.${catalogDomain.id}&select=id,catalog_tagline,catalog_description`,
  );
  const domBody: Row = {};
  if (!String(dom?.catalog_tagline ?? "").trim()) domBody.catalog_tagline = catalogDomain.catalog_tagline;
  if (!String(dom?.catalog_description ?? "").trim())
    domBody.catalog_description = catalogDomain.catalog_description;
  if (Object.keys(domBody).length > 0) {
    await patch(`/domains?id=eq.${catalogDomain.id}`, domBody);
    note(`  domain 30 wrote: ${Object.keys(domBody).join(", ")}`);
  } else {
    note(`  domain 30 already populated, skipped`);
  }
  // Modules
  for (const m of catalogModules) {
    const [mod] = await get(
      `/domain_modules?id=eq.${m.id}&select=id,domain_module_code,catalog_tagline,catalog_description`,
    );
    const body: Row = {};
    if (!String(mod?.catalog_tagline ?? "").trim()) body.catalog_tagline = m.catalog_tagline;
    if (!String(mod?.catalog_description ?? "").trim())
      body.catalog_description = m.catalog_description;
    if (Object.keys(body).length > 0) {
      await patch(`/domain_modules?id=eq.${m.id}`, body);
      note(`  module ${m.id} (${mod?.domain_module_code}) wrote: ${Object.keys(body).join(", ")}`);
    } else {
      note(`  module ${m.id} (${mod?.domain_module_code}) already populated, skipped`);
    }
  }
}

// ============================================================
// 4. B1B-S3  (generic synonym aliases, net-new)
// ============================================================
// customer_subscriptions (106): service contract, support entitlement contract
// customer_events (111):        case timeline event, interaction event
// alias_type='synonym' (generic, industry-agnostic). 'industry_term' requires an industry_id
// context which these cross-industry synonyms do not have. Matches the existing aliases on 106.
const aliasInserts: Array<{ data_object_id: number; alias_name: string; alias_type: string }> = [
  { data_object_id: 106, alias_name: "service contract", alias_type: "synonym" },
  { data_object_id: 106, alias_name: "support entitlement contract", alias_type: "synonym" },
  { data_object_id: 111, alias_name: "case timeline event", alias_type: "synonym" },
  { data_object_id: 111, alias_name: "interaction event", alias_type: "synonym" },
];

async function addAliases() {
  note("== B1B-S3 (data_object_aliases, net-new) ==");
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(106,111)&select=data_object_id,alias_name`,
  );
  const existingKey = new Set(
    existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`),
  );
  const toInsert = aliasInserts.filter(
    r => !existingKey.has(`${r.data_object_id}|${r.alias_name.toLowerCase()}`),
  );
  if (toInsert.length > 0) {
    await insert("/data_object_aliases", toInsert);
  }
  note(`  inserted ${toInsert.length} alias rows (${existing.length} aliases already on 106/111)`);
}

// ============================================================
// 5. B1B-S5  (business_function_domains, additive)
// ============================================================
// CSM already has Customer Service (24) = owner.
//   Information Technology -> IT Operations (27) = contributor
//   Customer Success (23) = consumer
const bfdInserts: Array<{ business_function_id: number; responsibility_type: string }> = [
  { business_function_id: 27, responsibility_type: "contributor" },
  { business_function_id: 23, responsibility_type: "consumer" },
];

async function addBusinessFunctionDomains() {
  note("== B1B-S5 (business_function_domains, additive) ==");
  const existing = await get(
    `/business_function_domains?domain_id=eq.30&select=business_function_id,responsibility_type`,
  );
  const existingKey = new Set(
    existing.map(r => `${r.business_function_id}|${r.responsibility_type}`),
  );
  // Idempotent on (domain_id, business_function_id): do not add a second row for a function
  // that already has any responsibility on CSM.
  const existingFns = new Set(existing.map(r => Number(r.business_function_id)));
  const toInsert = bfdInserts
    .filter(
      r =>
        !existingKey.has(`${r.business_function_id}|${r.responsibility_type}`) &&
        !existingFns.has(r.business_function_id),
    )
    .map(r => ({ domain_id: 30, business_function_id: r.business_function_id, responsibility_type: r.responsibility_type }));
  if (toInsert.length > 0) {
    await insert("/business_function_domains", toInsert);
  }
  note(`  inserted ${toInsert.length} business_function_domains rows (${existing.length} existed)`);
}

// ============================================================
async function main() {
  await fixEntityTypes();
  await tagHandoffs();
  await backfillCatalog();
  await addAliases();
  await addBusinessFunctionDomains();

  note("\n== UI links ==");
  note("https://tests.semantius.app/domain_map/data_objects");
  note("https://tests.semantius.app/domain_map/handoff_processes");
  note("https://tests.semantius.app/domain_map/domains");
  note("https://tests.semantius.app/domain_map/domain_modules");
  note("https://tests.semantius.app/domain_map/data_object_aliases");
  note("https://tests.semantius.app/domain_map/business_function_domains");
  note("\nDONE");
}

main().catch(e => {
  console.error("LOADER FAILED:", e?.message ?? e);
  process.exit(1);
});
