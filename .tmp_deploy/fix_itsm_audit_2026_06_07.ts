#!/usr/bin/env bun
// State-driven ITSM audit execute pass (2026-06-07).
// Works the EXECUTE-classified open items from audits/ITSM/state.yaml:
//   1. B1A-ENTITY-TYPE  : PATCH 7 ITSM masters entity_type unclassified -> Rule #12 enum
//   2. B2-CATALOG-UX    : author catalog_tagline + catalog_description on the ITSM domain row + 8 modules (Rule #20)
//   3. B1A-H1-UNTAGGED  : INSERT handoff_processes (agent_curated) for the clean-PCF-match untagged ITSM handoffs
//   4. B11 aliases      : INSERT clearly-generic vendor-neutral synonyms missing on ITSM masters
//   5. C1               : INSERT one additive business_function_domains contributor row (IT Operations)
//
// Every phase reads live first and inserts/patches only the missing/unclassified rows (idempotent).
// New rows omit record_status (defaults to 'new'). No approved/pending/rejected. No `notes` writes.

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

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
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

// ============================================================
// 1. B1A-ENTITY-TYPE — classify the 7 masters
// ============================================================
const ENTITY_TYPES: Record<string, string> = {
  service_incidents: "operational_workflow",
  service_requests: "operational_workflow",
  service_problems: "operational_workflow",
  service_changes: "operational_workflow",
  knowledge_articles: "operational_workflow",
  service_catalog_items: "catalog",
  service_slas: "catalog",
};

async function phaseEntityType() {
  console.log("\n=== Phase 1: entity_type classification ===");
  const names = Object.keys(ENTITY_TYPES);
  const live = await get(
    `/data_objects?data_object_name=in.(${names.join(",")})&select=id,data_object_name,entity_type`,
  );
  let patched = 0;
  for (const r of live) {
    const name = String(r.data_object_name);
    const want = ENTITY_TYPES[name];
    const cur = r.entity_type;
    if (cur === null || cur === "unclassified") {
      await patch(`/data_objects?id=eq.${r.id}`, { entity_type: want });
      console.log(`  PATCH ${name} (${r.id}): ${cur} -> ${want}`);
      patched++;
    } else {
      console.log(`  skip ${name} (${r.id}): already ${cur}`);
    }
  }
  console.log(`  entity_type patched: ${patched}`);
  return patched;
}

// ============================================================
// 2. B2-CATALOG-UX — domain + module catalog copy (Rule #20)
//    Buyer-voice. No vendor/product names. No em-dash. American English.
//    Only writes where the field is currently empty; never overwrites.
// ============================================================
const DOMAIN_UX = {
  catalog_tagline:
    "Run a responsive IT service desk that resolves incidents, fulfills requests, and ships changes without breaking the business.",
  catalog_description:
    "IT Service Management gives your service desk one place to capture, route, and resolve everything your workforce throws at it: outages, password resets, new-laptop requests, recurring problems, and risky changes. Tickets follow a clear lifecycle from intake to closure, with priority routing, approvals, and SLA timers built in, so nothing slips and the right person always owns the next step.\n\nThe suite spans incident, request, problem, change, knowledge, and service-level management, plus an agent workspace that pulls the full picture together. Self-service portals and a curated knowledge base deflect routine work, while problem and change workflows keep the underlying environment stable. The result is faster resolution, fewer repeat issues, and a measurable service experience your users and auditors can both trust.",
};

const MODULE_UX: Record<string, { catalog_tagline: string; catalog_description: string }> = {
  "ITSM-INCIDENT-MGMT": {
    catalog_tagline: "Capture, prioritize, and resolve outages and disruptions before they spread.",
    catalog_description:
      "Incident Management turns every report of something broken into a tracked ticket with an owner, a priority, and a clock. Agents triage incoming issues, route them to the right team, and drive each one from new to resolved while keeping the requester informed.\n\nBuilt-in prioritization, assignment, and resolution gates keep major incidents from slipping through the cracks, and a clean audit trail shows exactly how each disruption was handled. The faster you restore service, the less an outage costs you.",
  },
  "ITSM-SERVICE-REQUEST": {
    catalog_tagline: "Let employees order the services they need and fulfill each one with confidence.",
    catalog_description:
      "Service Request Fulfillment gives your workforce a single front door for the everyday things they need from IT: access, equipment, software, and standard changes. Each request follows a defined path through submission, approval, and fulfillment so nothing stalls in someone's inbox.\n\nApproval routing and fulfillment tracking make the experience predictable for the requester and measurable for the team. Repeatable requests become catalog-driven, freeing agents to focus on the work that genuinely needs a human.",
  },
  "ITSM-PROBLEM-MGMT": {
    catalog_tagline: "Find the root cause behind recurring incidents and stop them coming back.",
    catalog_description:
      "Problem Management connects the dots across repeated incidents to surface the underlying fault, document the known error, and drive a permanent fix. Instead of firefighting the same outage week after week, your team works the cause once.\n\nA structured path from identification through analysis to resolution keeps investigations disciplined, and a shared record of known errors speeds up every future diagnosis. Fewer repeat incidents means a calmer service desk and lower operating cost.",
  },
  "ITSM-CHANGE-MGMT": {
    catalog_tagline: "Ship changes to production with the right approvals and a clear rollback path.",
    catalog_description:
      "Change and Release Management governs how work reaches your live environment. Every change is proposed, assessed for risk, approved by the right authority, and scheduled so it lands without colliding with other work or breaking dependent services.\n\nApproval gates, submission controls, and a full change history give you the assurance to move fast without inviting the next outage. The payoff is a higher rate of successful changes and far fewer self-inflicted incidents.",
  },
  "ITSM-EVENT-MGMT": {
    catalog_tagline: "Turn the flood of monitoring alerts into the few incidents that actually matter.",
    catalog_description:
      "Event and Alert Handling sits between your monitoring tools and your service desk, taking in the constant stream of alerts and deciding what deserves a human response. Noise is filtered, related signals are grouped, and only meaningful events become tracked incidents.\n\nBy promoting the right alerts automatically and suppressing the rest, the team spends its attention on real problems rather than chasing false alarms. Faster detection of genuine issues shortens the time to restore service.",
  },
  "ITSM-KNOWLEDGE": {
    catalog_tagline: "Capture what your team knows and put it to work for agents and self-service.",
    catalog_description:
      "Knowledge Management gives experts a place to write, review, and publish the articles that resolve issues faster. Content moves through a clear authoring and review lifecycle so what reaches your users is accurate and current.\n\nPublished articles power both agent-assisted resolution and self-service deflection, so common questions get answered without a ticket. Every reuse of a good article is time your team gets back.",
  },
  "ITSM-AGENT-WORKSPACE": {
    catalog_tagline: "Give agents one workspace and leaders the reporting to run the service desk.",
    catalog_description:
      "Agent Workspace and Reporting brings the agent's queue, context, and tools into a single view so they can work tickets without hunting across screens. Everything needed to understand and act on the next item is in one place.\n\nFor team leads, built-in reporting turns daily activity into the trends, volumes, and service metrics that drive staffing and improvement decisions. A productive agent and an informed manager together raise the whole desk's performance.",
  },
  "ITSM-SLA-MGMT": {
    catalog_tagline: "Set service-level targets, track them in real time, and account for the cost.",
    catalog_description:
      "SLA and Chargeback Management defines the response and resolution commitments your service desk operates to, then measures every ticket against them so breaches are caught before they become escalations. Targets are explicit and performance is visible.\n\nLinking service consumption back to cost lets you show what IT delivers and what it costs to deliver, turning the service desk from a black box into an accountable function the business can plan around.",
  },
};

async function phaseCatalogUx() {
  console.log("\n=== Phase 2: catalog UX copy (Rule #20) ===");
  let written = 0;

  // Domain row
  const [dom] = await get(
    "/domains?domain_code=eq.ITSM&select=id,catalog_tagline,catalog_description",
  );
  if (!dom) throw new Error("ITSM domain row not found");
  const domBody: Row = {};
  if (!dom.catalog_tagline) domBody.catalog_tagline = DOMAIN_UX.catalog_tagline;
  if (!dom.catalog_description) domBody.catalog_description = DOMAIN_UX.catalog_description;
  if (Object.keys(domBody).length > 0) {
    await patch(`/domains?id=eq.${dom.id}`, domBody);
    console.log(`  PATCH domain ITSM (${dom.id}): ${Object.keys(domBody).join(", ")}`);
    written++;
  } else {
    console.log(`  skip domain ITSM: both fields already non-empty`);
  }

  // Modules
  const mods = await get(
    "/domain_modules?domain_id=eq.1&select=id,domain_module_code,catalog_tagline,catalog_description&order=id",
  );
  for (const m of mods) {
    const code = String(m.domain_module_code);
    const ux = MODULE_UX[code];
    if (!ux) {
      console.log(`  WARN no UX copy authored for module ${code} (${m.id})`);
      continue;
    }
    const body: Row = {};
    if (!m.catalog_tagline) body.catalog_tagline = ux.catalog_tagline;
    if (!m.catalog_description) body.catalog_description = ux.catalog_description;
    if (Object.keys(body).length > 0) {
      await patch(`/domain_modules?id=eq.${m.id}`, body);
      console.log(`  PATCH module ${code} (${m.id}): ${Object.keys(body).join(", ")}`);
      written++;
    } else {
      console.log(`  skip module ${code}: both fields already non-empty`);
    }
  }
  console.log(`  catalog UX rows written: ${written}`);
  return written;
}

// ============================================================
// 3. B1A-H1-UNTAGGED — clean-PCF-match handoff_processes
//    Only handoffs with a CLEAN PCF match. Idempotent on (handoff_id, process_id).
// ============================================================
// PCF anchors (resolved live 2026-06-07):
//   1299 Triage IT service delivery incidents (ext 20903)
//   1312 Maintain IT asset records           (ext 20918)
//   1313 Administer IT licenses/user agreements (ext 20919)
const H1_TAGS: { handoff_id: number; process_id: number; why: string }[] = [
  { handoff_id: 239, process_id: 1299, why: "application_interface.broken -> incident triage" },
  { handoff_id: 461, process_id: 1299, why: "iga_provisioning_event.completed -> incident triage" },
  { handoff_id: 463, process_id: 1299, why: "iga_provisioning_event.failed -> incident triage" },
  { handoff_id: 788, process_id: 1299, why: "work_automation.triggered -> incident triage" },
  { handoff_id: 878, process_id: 1299, why: "maintenance_defect.reported -> incident triage" },
  { handoff_id: 614, process_id: 1299, why: "slo.burn_rate_high -> incident triage (precedent: handoffs 55/57)" },
  { handoff_id: 615, process_id: 1299, why: "slo.budget_exhausted -> incident triage (precedent: handoffs 55/57)" },
  { handoff_id: 31, process_id: 1312, why: "service_incident.asset_failure -> maintain IT asset records (ITAM)" },
  { handoff_id: 37, process_id: 1313, why: "license_audit.required -> administer IT licenses" },
];

async function phaseH1() {
  console.log("\n=== Phase 3: H1 APQC handoff_processes (clean PCF only) ===");
  const ids = H1_TAGS.map(t => t.handoff_id).join(",");
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${ids})&select=handoff_id,process_id`,
  );
  const existingKey = new Set(
    existing.map(r => `${r.handoff_id}|${r.process_id}`),
  );
  const toInsert = H1_TAGS.filter(
    t => !existingKey.has(`${t.handoff_id}|${t.process_id}`),
  ).map(t => ({
    handoff_id: t.handoff_id,
    process_id: t.process_id,
    proposal_source: "agent_curated",
    role: "implements",
  }));
  if (toInsert.length > 0) {
    await insert("/handoff_processes", toInsert);
    for (const t of H1_TAGS) {
      const skipped = existingKey.has(`${t.handoff_id}|${t.process_id}`);
      console.log(`  ${skipped ? "skip" : "INSERT"} handoff ${t.handoff_id} -> PCF ${t.process_id} (${t.why})`);
    }
  } else {
    console.log("  all H1 tags already present");
  }
  console.log(`  handoff_processes inserted: ${toInsert.length}`);
  return toInsert.length;
}

// ============================================================
// 4. B11 aliases — clearly-generic vendor-neutral synonyms
// ============================================================
const ALIASES: { data_object_id: number; alias_name: string }[] = [
  { data_object_id: 49, alias_name: "problem ticket" },
  { data_object_id: 50, alias_name: "change request" },
  { data_object_id: 51, alias_name: "knowledge base article" },
  { data_object_id: 52, alias_name: "catalog item" },
  { data_object_id: 53, alias_name: "SLA" },
];

async function phaseAliases() {
  console.log("\n=== Phase 4: B11 generic aliases ===");
  const ids = [...new Set(ALIASES.map(a => a.data_object_id))].join(",");
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${ids})&select=data_object_id,alias_name`,
  );
  const existingKey = new Set(
    existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`),
  );
  const toInsert = ALIASES.filter(
    a => !existingKey.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`),
  ).map(a => ({
    data_object_id: a.data_object_id,
    alias_name: a.alias_name,
    alias_type: "synonym",
  }));
  if (toInsert.length > 0) {
    await insert("/data_object_aliases", toInsert);
    for (const a of toInsert) console.log(`  INSERT alias '${a.alias_name}' on data_object ${a.data_object_id}`);
  } else {
    console.log("  all aliases already present");
  }
  console.log(`  aliases inserted: ${toInsert.length}`);
  return toInsert.length;
}

// ============================================================
// 5. C1 — additive business_function_domains contributor row
//    Owner (IT Service Desk 57) + Security contributor + HR/Finance consumers already exist.
//    Add IT Operations (27) as contributor (additive, non-conflicting).
// ============================================================
const BFD: { business_function_id: number; responsibility_type: string }[] = [
  { business_function_id: 27, responsibility_type: "contributor" }, // IT Operations
];

async function phaseBfd() {
  console.log("\n=== Phase 5: C1 business_function_domains (additive) ===");
  const existing = await get(
    "/business_function_domains?domain_id=eq.1&select=business_function_id,responsibility_type",
  );
  const existingFns = new Set(existing.map(r => Number(r.business_function_id)));
  const toInsert = BFD.filter(b => !existingFns.has(b.business_function_id)).map(b => ({
    domain_id: 1,
    business_function_id: b.business_function_id,
    responsibility_type: b.responsibility_type,
  }));
  if (toInsert.length > 0) {
    await insert("/business_function_domains", toInsert);
    for (const b of toInsert) console.log(`  INSERT bfd: fn ${b.business_function_id} as ${b.responsibility_type}`);
  } else {
    console.log("  business_function_domains already covered");
  }
  console.log(`  business_function_domains inserted: ${toInsert.length}`);
  return toInsert.length;
}

// ============================================================
async function main() {
  const counts = {
    entity_type: await phaseEntityType(),
    catalog_ux: await phaseCatalogUx(),
    handoff_processes: await phaseH1(),
    aliases: await phaseAliases(),
    bfd: await phaseBfd(),
  };
  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(counts, null, 2));
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/domains");
  console.log("  https://tests.semantius.app/domain_map/domain_modules");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases");
  console.log("  https://tests.semantius.app/domain_map/business_function_domains");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
