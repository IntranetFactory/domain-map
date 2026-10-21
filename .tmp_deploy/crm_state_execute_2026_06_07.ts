#!/usr/bin/env bun
// CRM state-driven execute (2026-06-07). Lands every write at record_status='new'.
// Covers the EXECUTE items from audits/CRM/state.yaml (Rule #21 Validate mode):
//   1. B1A-ENTITY-TYPE  PATCH entity_type on the 6 CRM masters (97-102)
//   2. A4 + M8 (Rule #20) catalog UX: empty catalog_tagline/catalog_description on
//                         domain 69 + modules 46/47/48/49/50
//   3. B1A-H1-RESIDUAL   INSERT net-new handoff_processes rows (clean PCF L3 matches only)
//
// C1 (business_function_domains) is already complete on CRM (owner=Sales 21,
//   contributor=Marketing 22, contributor=Customer Success 23); the additive check
//   below no-ops. B11 aliases are already 2-per-master and not an open state item.
//
// Idempotent: reads live first, only writes what is missing/empty. Never overwrites a
// non-empty value. Never DELETEs. Never stamps approved (Rule #1).

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
// 1. B1A-ENTITY-TYPE  (Rule #12 enum classification)
// ============================================================
// customers (97):          account/end-customer with lifecycle stage + workflow => operational_workflow
// crm_contacts (98):       person-at-account reference record, no state machine  => operational_record
// crm_leads (99):          explicit status machine new/working/qualified/...       => operational_workflow
// crm_opportunities (100): stage/amount/close/probability deal workflow            => operational_workflow
// pipeline_stages (101):   "the configuration object behind the pipeline" taxonomy => catalog
// sales_activities (102):  logged touchpoint with scheduled->completed lifecycle    => operational_workflow
const entityTypeFixes: Array<{ id: number; name: string; entity_type: string }> = [
  { id: 97, name: "customers", entity_type: "operational_workflow" },
  { id: 98, name: "crm_contacts", entity_type: "operational_record" },
  { id: 99, name: "crm_leads", entity_type: "operational_workflow" },
  { id: 100, name: "crm_opportunities", entity_type: "operational_workflow" },
  { id: 101, name: "pipeline_stages", entity_type: "catalog" },
  { id: 102, name: "sales_activities", entity_type: "operational_workflow" },
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
// 2. A4 + M8  (catalog UX, Rule #20 in-record review)
// ============================================================
const catalogDomain = {
  id: 69,
  catalog_tagline:
    "Turn every prospect into a tracked relationship: capture leads, work deals through the pipeline, and keep one trusted record of every account.",
  catalog_description:
    "Customer Relationship Management gives your sales team one place to find every customer, contact, lead, and deal, and to move each one forward with confidence. Capture leads from any source, score and qualify them, then convert the best into contacts, accounts, and live opportunities without losing a thread.\n\nRun the deal from first touch to close on a pipeline you control: define your stages and exit criteria, see amount, probability, and close date at a glance, and log every call, email, and meeting against the right account so nothing falls through. Built-in assistance drafts follow-ups, summarizes account history, and surfaces the next best action so reps spend more time selling and less time on data entry.\n\nWhen a deal closes, the customer record is ready to hand off to the teams who fulfill, bill, and support it, so the relationship keeps moving long after the sale.",
};

const catalogModules: Array<{ id: number; catalog_tagline: string; catalog_description: string }> = [
  {
    id: 46, // CRM-ACCT-MGT
    catalog_tagline:
      "One trusted record for every customer and contact, with the full account history in one view.",
    catalog_description:
      "Account and Contact Management is the system of record for who you sell to. Maintain a clean, deduplicated record of every account and the people inside it, with segmentation, account tier, and the relationships between parent companies and their divisions.\n\nGive everyone who touches the customer a single, current view: the contacts and their roles, the open and won deals, the activity history, and the signals coming back from service, billing, and product. Keep that record accurate as customers sign up, change tier, and grow, so every team works from the same truth.",
  },
  {
    id: 47, // CRM-LEAD-MGT
    catalog_tagline:
      "Capture, score, and qualify every lead, then convert the best into accounts and live deals.",
    catalog_description:
      "Lead Management captures inbound interest from marketing, partners, web forms, and outbound prospecting into one routed queue. Score each lead, work it through a clear qualification status, and assign it to the right rep with rules that keep response times fast.\n\nWhen a lead is ready, convert it cleanly into a contact, an account, and an opportunity so no context is lost in the handoff. The result is a predictable top of funnel where good leads move forward quickly and weak ones are filtered before they waste selling time.",
  },
  {
    id: 48, // CRM-PIPELINE-MGT
    catalog_tagline:
      "Run every deal through a pipeline you control, from first touch to close, with forecast you can trust.",
    catalog_description:
      "Pipeline Management is where deals get worked and won. Define your sales stages, exit criteria, and default probabilities, then move each opportunity through them with full visibility into amount, products, competitors, and close date.\n\nManagers see the whole pipeline at once, spot stalled or at-risk deals early, and forecast the period with confidence. Stage changes trigger the right downstream motions, from generating a quote to alerting the teams that take over on close, so winning a deal flows straight into delivering it.",
  },
  {
    id: 49, // CRM-ACTIVITY
    catalog_tagline:
      "Log every call, email, and meeting against the right account so the full conversation is never lost.",
    catalog_description:
      "Activity Management captures the day-to-day work of selling: calls, emails, meetings, demos, and content views, each tied to the contact and opportunity it belongs to. Reps see exactly what has happened on an account and what is due next, and managers see real engagement instead of guesswork.\n\nTracked emails and scheduled meetings become part of the account's permanent history, and completed activities feed pipeline and forecast signals automatically. The team stays coordinated, follow-ups happen on time, and no customer interaction goes unrecorded.",
  },
  {
    id: 50, // CRM-AI-COPILOT
    catalog_tagline:
      "An AI assistant that drafts outreach, summarizes accounts, and recommends the next best move on every deal.",
    catalog_description:
      "AI Copilot works on top of your live customer, contact, lead, opportunity, and activity records to take the busywork out of selling. Ask it to summarize an account before a call, draft a personalized follow-up email, or explain why a deal is at risk, and it answers from the data already in your CRM.\n\nIt recommends the next best action, surfaces signals a rep might miss, and turns long histories into a quick brief, so sellers spend their time in conversations and decisions rather than searching and typing. The assistant reads and acts on the canonical records the rest of CRM maintains, so its guidance always reflects the current state of the relationship.",
  },
];

async function backfillCatalog() {
  note("== A4 + M8 (catalog UX, empty-field backfill only) ==");
  // Domain 69
  const [dom] = await get(
    `/domains?id=eq.${catalogDomain.id}&select=id,catalog_tagline,catalog_description`,
  );
  const domBody: Row = {};
  if (!String(dom?.catalog_tagline ?? "").trim())
    domBody.catalog_tagline = catalogDomain.catalog_tagline;
  if (!String(dom?.catalog_description ?? "").trim())
    domBody.catalog_description = catalogDomain.catalog_description;
  if (Object.keys(domBody).length > 0) {
    await patch(`/domains?id=eq.${catalogDomain.id}`, domBody);
    note(`  domain 69 wrote: ${Object.keys(domBody).join(", ")}`);
  } else {
    note(`  domain 69 already populated, skipped`);
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
// 3. B1A-H1-RESIDUAL  (APQC tags, clean PCF L3 matches, NET-NEW only)
// ============================================================
// PCF anchors used (all source_framework=apqc_pcf_cross_industry):
//   147 = Manage leads/opportunities (3.5.1, L3)        -> opportunity/lead/activity touchpoints
//   148 = Manage customers and accounts (3.5.2, L3)     -> account-management escalation on customers
//   151 = Manage sales partners and alliances (3.5.5, L3)-> partner co-sell / partner referral
const apqcInserts: Array<{ handoff_id: number; process_id: number; why: string }> = [
  { handoff_id: 81, process_id: 147, why: "crm_opportunity.assigned drives cadence enrollment (opportunity mgmt)" },
  { handoff_id: 83, process_id: 147, why: "deal_insight.captured updates the opportunity record" },
  { handoff_id: 200, process_id: 147, why: "crm_lead.scored_above_threshold handoff (lead/opportunity mgmt; parent of 709)" },
  { handoff_id: 205, process_id: 147, why: "sales_cadence.completed triggers opportunity stage check" },
  { handoff_id: 211, process_id: 151, why: "co_sell.opportunity_created from PRM (partners and alliances)" },
  { handoff_id: 212, process_id: 151, why: "partner_referral.qualified from PRM (partners and alliances)" },
  { handoff_id: 474, process_id: 147, why: "sales_email.replied creates a CRM activity on the opportunity" },
  { handoff_id: 475, process_id: 147, why: "call_recording.transcribed attaches to CRM sales activity" },
  { handoff_id: 1261, process_id: 148, why: "service_pm_schedule.overdue escalates to account manager (customers payload)" },
];
// Deferred to Discover (no clean cross-industry PCF L3 match):
//   365  (FARMER-DIRECT csa_share_pack.delivered -> churn signal; fulfillment grain, not a CRM PCF activity)
//   962  (FARMER-DIRECT delivery_route.dispatched -> ETA notification; no clean PCF match)
//   964  (FARMER-DIRECT harvest_forecast.updated -> availability comms; no clean PCF match)
//   1002 (PROD-MGMT product_feature.released -> sales enablement; source side is product mgmt PCF, not CRM)
//   1005 (PROD-MGMT product_line.launched -> same as 1002)
//   528  (snapshot-listed but no live handoff row; dropped)
const apqcDeferred = [365, 962, 964, 1002, 1005];

async function tagHandoffs() {
  note("== B1A-H1-RESIDUAL (APQC handoff_processes, net-new clean L3) ==");
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
// 4. C1  (business_function_domains, additive; expected to no-op)
// ============================================================
// CRM already carries owner=Sales(21), contributor=Marketing(22), contributor=Customer Success(23).
// State item asked for owner Sales + contributor Marketing + consumer Customer Success. CS already
// exists as 'contributor' (non-empty); flipping it to 'consumer' would overwrite a non-empty value
// (destructive, Rule #21) so it is surfaced, not changed. This check only adds a genuinely-missing
// (function,responsibility) where the function has no row at all; expected to insert 0.
const bfdInserts: Array<{ business_function_id: number; responsibility_type: string }> = [];

async function addBusinessFunctionDomains() {
  note("== C1 (business_function_domains, additive) ==");
  const existing = await get(
    `/business_function_domains?domain_id=eq.69&select=business_function_id,responsibility_type`,
  );
  const existingFns = new Set(existing.map(r => Number(r.business_function_id)));
  const toInsert = bfdInserts
    .filter(r => !existingFns.has(r.business_function_id))
    .map(r => ({
      domain_id: 69,
      business_function_id: r.business_function_id,
      responsibility_type: r.responsibility_type,
    }));
  if (toInsert.length > 0) {
    await insert("/business_function_domains", toInsert);
  }
  note(
    `  inserted ${toInsert.length} business_function_domains rows (${existing.length} existed; CS already contributor, see surfaced item)`,
  );
}

// ============================================================
async function main() {
  await fixEntityTypes();
  await backfillCatalog();
  await tagHandoffs();
  await addBusinessFunctionDomains();

  note("\n== UI links ==");
  note("https://tests.semantius.app/domain_map/data_objects");
  note("https://tests.semantius.app/domain_map/domains");
  note("https://tests.semantius.app/domain_map/domain_modules");
  note("https://tests.semantius.app/domain_map/handoff_processes");
  note("\nDONE");
}

main().catch(e => {
  console.error("LOADER FAILED:", e?.message ?? e);
  process.exit(1);
});
