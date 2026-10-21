#!/usr/bin/env bun
// Backfill 19 capabilities under the existing ITSM domain (id=1),
// plus capability_domains links and the 5 x 19 solution_capabilities matrix
// for the existing ITSM solutions.
// Idempotent: reads natural keys first, only inserts missing rows.

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
// CAPABILITIES (under ITSM domain)
// ============================================================
const capabilities = [
  {
    capability_code: "ITSM-INCIDENT",
    capability_name: "Incident Management",
    description:
      "Capture, triage, prioritise, route, resolve, and close unplanned service disruptions. Includes MTTR clocks, escalation rules, incident-on-incident linking, and resolution-code taxonomy.",
  },
  {
    capability_code: "ITSM-MAJOR-INCIDENT",
    capability_name: "Major Incident Management",
    description:
      "War-room workflow for high-severity incidents: bridge calls, exec comms, stakeholder updates, post-mortem / PIR artefact, lessons-learned linking. Distinct discipline from standard incident handling.",
  },
  {
    capability_code: "ITSM-PROBLEM",
    capability_name: "Problem Management",
    description:
      "Root-cause investigation for recurring or pattern-matched incidents. Carries known-error records, workaround library, permanent-fix change linking, and proactive-problem trend analysis.",
  },
  {
    capability_code: "ITSM-REQUEST",
    capability_name: "Service Request Fulfilment",
    description:
      "Catalog-driven request handling: form intake, approval routing, fulfilment workflow, status tracking, requester comms, and SLA enforcement per catalog item.",
  },
  {
    capability_code: "ITSM-EVENT",
    capability_name: "Event and Alert Handling",
    description:
      "ITSM-side ingestion of alerts from ITOM, AIOps, and observability: deduplication, correlation, escalation rules, conversion to incident records, and suppression feedback to source systems.",
  },
  {
    capability_code: "ITSM-CHANGE",
    capability_name: "Change Enablement and CAB Workflow",
    description:
      "Planned-change lifecycle: classification (standard/normal/emergency), risk and impact scoring, CAB approval routing, implementation windows, back-out plans, and post-implementation review.",
  },
  {
    capability_code: "ITSM-RELEASE",
    capability_name: "Release Management",
    description:
      "Coordination of grouped changes into releases: release planning, deployment scheduling, dependency tracking across changes, release-go/no-go gates, and release reporting.",
  },
  {
    capability_code: "ITSM-STD-CHANGE",
    capability_name: "Standard Change Catalog",
    description:
      "Pre-approved, low-risk change templates with automated approval paths and fast-track execution. The throughput lever for high-volume change orgs and DevOps-aligned ITSM.",
  },
  {
    capability_code: "ITSM-CATALOG",
    capability_name: "Service Catalog Authoring",
    description:
      "Catalog-item definition: form schema, fulfilment workflow, approval routing, SLA attachment, chargeback rules, lifecycle (draft / published / retired), and audience-based publishing.",
  },
  {
    capability_code: "ITSM-SLA",
    capability_name: "SLA and OLA Management",
    description:
      "Service-level, operational-level, and underpinning-contract definitions; attachment to work items by priority/category/customer tier; breach detection; escalation triggers; breach reporting.",
  },
  {
    capability_code: "ITSM-CHARGEBACK",
    capability_name: "Service Cost and Chargeback",
    description:
      "Per-service and per-request cost attribution, internal showback and chargeback to business units, cost-driver reporting, and integration with corporate finance for IT cost transparency.",
  },
  {
    capability_code: "ITSM-KNOWLEDGE",
    capability_name: "Knowledge Management",
    description:
      "KB lifecycle (draft / review / publish / retire), authoring workflow, version control, agent-assist surfacing in the ticket cockpit, and deflection-rate analytics back to the portal.",
  },
  {
    capability_code: "ITSM-PORTAL",
    capability_name: "Self-Service Portal",
    description:
      "End-user-facing portal for catalog browse, request submission, ticket status and updates, KB search, and IT announcements. The primary deflection surface for L1 demand.",
  },
  {
    capability_code: "ITSM-VIRTUAL-AGENT",
    capability_name: "Virtual Agent and Conversational ITSM",
    description:
      "Chatbot or conversational interface (Teams/Slack/portal) for triage, KB suggestion, request submission, password reset, and ticket status. Includes LLM-grounded response drafting and intent recognition.",
  },
  {
    capability_code: "ITSM-WALKUP",
    capability_name: "Walk-Up and Onsite Support",
    description:
      "Physical-location IT-bar workflow: queue, check-in, technician dispatch, asset-loan, in-person resolution, and walk-up analytics. Common in enterprise campuses and retail headquarters.",
  },
  {
    capability_code: "ITSM-WORKSPACE",
    capability_name: "Agent Workspace and Routing",
    description:
      "Unified agent UI: queue view, ticket cockpit, contextual customer / CI / asset panels, productivity macros, omnichannel inbox (email / chat / phone / portal), and parallel-task handling.",
  },
  {
    capability_code: "ITSM-ASSIGN",
    capability_name: "Skill-Based Assignment",
    description:
      "Auto-assignment rules driven by category, location, language, skill tags, current workload, on-call schedule, and round-robin balancing. The throughput lever for L2/L3 routing.",
  },
  {
    capability_code: "ITSM-AI-TRIAGE",
    capability_name: "AI Triage and Classification",
    description:
      "Predictive categorisation, priority scoring, similar-incident suggestion, suggested-resolution drafting, and auto-routing to the right group based on historical ticket patterns.",
  },
  {
    capability_code: "ITSM-REPORTING",
    capability_name: "ITSM Reporting and Continuous Improvement",
    description:
      "Operational dashboards (volume, MTTR, first-contact-resolution), SLA breach analysis, trend reporting across incident/problem/change/request, CSI register, and XLA / CSAT measurement.",
  },
];

// ============================================================
// SOLUTION_CAPABILITIES MATRIX (5 ITSM solutions × 19 capabilities)
// ============================================================
type Strength = "native" | "partial" | "via_extension" | "not_supported";
type SolCapSpec = { solution: string; capability: string; delivery_strength: Strength; notes?: string };

const SN = "ServiceNow IT Service Management";
const BMC = "BMC Helix ITSM";
const JSM = "Jira Service Management";
const FS = "Freshservice";
const IV = "Ivanti Neurons for ITSM";

const solCaps: SolCapSpec[] = [
  // ServiceNow ITSM — flagship; native on essentially everything
  { solution: SN, capability: "ITSM-INCIDENT", delivery_strength: "native" },
  { solution: SN, capability: "ITSM-MAJOR-INCIDENT", delivery_strength: "native", notes: "Named Major Incident Management module with bridge, comms, and PIR artefacts." },
  { solution: SN, capability: "ITSM-PROBLEM", delivery_strength: "native" },
  { solution: SN, capability: "ITSM-REQUEST", delivery_strength: "native" },
  { solution: SN, capability: "ITSM-EVENT", delivery_strength: "native", notes: "Event Management is a paid add-on; alert ingestion and incident creation are native to ITSM core." },
  { solution: SN, capability: "ITSM-CHANGE", delivery_strength: "native" },
  { solution: SN, capability: "ITSM-RELEASE", delivery_strength: "native" },
  { solution: SN, capability: "ITSM-STD-CHANGE", delivery_strength: "native" },
  { solution: SN, capability: "ITSM-CATALOG", delivery_strength: "native" },
  { solution: SN, capability: "ITSM-SLA", delivery_strength: "native" },
  { solution: SN, capability: "ITSM-CHARGEBACK", delivery_strength: "partial", notes: "Cost transparency is a separate ITFM product; basic chargeback fields exist in catalog items." },
  { solution: SN, capability: "ITSM-KNOWLEDGE", delivery_strength: "native" },
  { solution: SN, capability: "ITSM-PORTAL", delivery_strength: "native" },
  { solution: SN, capability: "ITSM-VIRTUAL-AGENT", delivery_strength: "native", notes: "Virtual Agent + Now Assist for ITSM." },
  { solution: SN, capability: "ITSM-WALKUP", delivery_strength: "native", notes: "Walk-Up Experience is a first-class ITSM feature." },
  { solution: SN, capability: "ITSM-WORKSPACE", delivery_strength: "native", notes: "Agent Workspace (Next Experience UI)." },
  { solution: SN, capability: "ITSM-ASSIGN", delivery_strength: "native", notes: "Predictive Intelligence-backed assignment rules." },
  { solution: SN, capability: "ITSM-AI-TRIAGE", delivery_strength: "native", notes: "Predictive Intelligence + Now Assist (LLM)." },
  { solution: SN, capability: "ITSM-REPORTING", delivery_strength: "native" },

  // BMC Helix ITSM — strong across the board
  { solution: BMC, capability: "ITSM-INCIDENT", delivery_strength: "native" },
  { solution: BMC, capability: "ITSM-MAJOR-INCIDENT", delivery_strength: "native" },
  { solution: BMC, capability: "ITSM-PROBLEM", delivery_strength: "native" },
  { solution: BMC, capability: "ITSM-REQUEST", delivery_strength: "native" },
  { solution: BMC, capability: "ITSM-EVENT", delivery_strength: "native", notes: "BMC Helix Operations Management integrates natively." },
  { solution: BMC, capability: "ITSM-CHANGE", delivery_strength: "native" },
  { solution: BMC, capability: "ITSM-RELEASE", delivery_strength: "native" },
  { solution: BMC, capability: "ITSM-STD-CHANGE", delivery_strength: "native" },
  { solution: BMC, capability: "ITSM-CATALOG", delivery_strength: "native" },
  { solution: BMC, capability: "ITSM-SLA", delivery_strength: "native" },
  { solution: BMC, capability: "ITSM-CHARGEBACK", delivery_strength: "partial", notes: "Service cost via Helix Digital Workplace and partner integrations; ITSM core is partial." },
  { solution: BMC, capability: "ITSM-KNOWLEDGE", delivery_strength: "native" },
  { solution: BMC, capability: "ITSM-PORTAL", delivery_strength: "native" },
  { solution: BMC, capability: "ITSM-VIRTUAL-AGENT", delivery_strength: "native", notes: "HelixGPT and Cognitive Service Management." },
  { solution: BMC, capability: "ITSM-WALKUP", delivery_strength: "partial" },
  { solution: BMC, capability: "ITSM-WORKSPACE", delivery_strength: "native" },
  { solution: BMC, capability: "ITSM-ASSIGN", delivery_strength: "native" },
  { solution: BMC, capability: "ITSM-AI-TRIAGE", delivery_strength: "native", notes: "HelixGPT + Cognitive (auto-categorisation, intent, sentiment)." },
  { solution: BMC, capability: "ITSM-REPORTING", delivery_strength: "native" },

  // Jira Service Management — dev-aligned; lighter on enterprise-ITSM features
  { solution: JSM, capability: "ITSM-INCIDENT", delivery_strength: "native" },
  { solution: JSM, capability: "ITSM-MAJOR-INCIDENT", delivery_strength: "partial", notes: "Opsgenie bundled into JSM Premium provides on-call and stakeholder comms; full PIR workflow lighter than SN/BMC." },
  { solution: JSM, capability: "ITSM-PROBLEM", delivery_strength: "native" },
  { solution: JSM, capability: "ITSM-REQUEST", delivery_strength: "native" },
  { solution: JSM, capability: "ITSM-EVENT", delivery_strength: "partial", notes: "Opsgenie alert ingestion; deeper correlation requires AIOps add-on or third-party." },
  { solution: JSM, capability: "ITSM-CHANGE", delivery_strength: "native" },
  { solution: JSM, capability: "ITSM-RELEASE", delivery_strength: "partial", notes: "Releases live in Jira Software; coordinated release management across change records is lighter than in SN/BMC." },
  { solution: JSM, capability: "ITSM-STD-CHANGE", delivery_strength: "native" },
  { solution: JSM, capability: "ITSM-CATALOG", delivery_strength: "native" },
  { solution: JSM, capability: "ITSM-SLA", delivery_strength: "native" },
  { solution: JSM, capability: "ITSM-CHARGEBACK", delivery_strength: "not_supported" },
  { solution: JSM, capability: "ITSM-KNOWLEDGE", delivery_strength: "native", notes: "Confluence integration is first-class and ships with JSM." },
  { solution: JSM, capability: "ITSM-PORTAL", delivery_strength: "native" },
  { solution: JSM, capability: "ITSM-VIRTUAL-AGENT", delivery_strength: "partial", notes: "Atlassian Intelligence virtual agent introduced 2024; less mature than SN Now Assist." },
  { solution: JSM, capability: "ITSM-WALKUP", delivery_strength: "not_supported" },
  { solution: JSM, capability: "ITSM-WORKSPACE", delivery_strength: "native" },
  { solution: JSM, capability: "ITSM-ASSIGN", delivery_strength: "native" },
  { solution: JSM, capability: "ITSM-AI-TRIAGE", delivery_strength: "partial", notes: "Atlassian Intelligence suggestions; predictive classification lighter than SN Predictive Intelligence." },
  { solution: JSM, capability: "ITSM-REPORTING", delivery_strength: "native" },

  // Freshservice — mid-market focus; AI-forward
  { solution: FS, capability: "ITSM-INCIDENT", delivery_strength: "native" },
  { solution: FS, capability: "ITSM-MAJOR-INCIDENT", delivery_strength: "partial", notes: "Major incident workflow available; PIR/bridge call orchestration lighter than enterprise tools." },
  { solution: FS, capability: "ITSM-PROBLEM", delivery_strength: "native" },
  { solution: FS, capability: "ITSM-REQUEST", delivery_strength: "native" },
  { solution: FS, capability: "ITSM-EVENT", delivery_strength: "partial", notes: "Alert Management module ingests from monitoring tools." },
  { solution: FS, capability: "ITSM-CHANGE", delivery_strength: "native" },
  { solution: FS, capability: "ITSM-RELEASE", delivery_strength: "native" },
  { solution: FS, capability: "ITSM-STD-CHANGE", delivery_strength: "native" },
  { solution: FS, capability: "ITSM-CATALOG", delivery_strength: "native" },
  { solution: FS, capability: "ITSM-SLA", delivery_strength: "native" },
  { solution: FS, capability: "ITSM-CHARGEBACK", delivery_strength: "not_supported" },
  { solution: FS, capability: "ITSM-KNOWLEDGE", delivery_strength: "native" },
  { solution: FS, capability: "ITSM-PORTAL", delivery_strength: "native" },
  { solution: FS, capability: "ITSM-VIRTUAL-AGENT", delivery_strength: "native", notes: "Freddy AI Agent." },
  { solution: FS, capability: "ITSM-WALKUP", delivery_strength: "not_supported" },
  { solution: FS, capability: "ITSM-WORKSPACE", delivery_strength: "native" },
  { solution: FS, capability: "ITSM-ASSIGN", delivery_strength: "native" },
  { solution: FS, capability: "ITSM-AI-TRIAGE", delivery_strength: "native", notes: "Freddy AI auto-triage, categorisation, and suggested response." },
  { solution: FS, capability: "ITSM-REPORTING", delivery_strength: "native" },

  // Ivanti Neurons for ITSM — endpoint-strong; AI behind SN/BMC
  { solution: IV, capability: "ITSM-INCIDENT", delivery_strength: "native" },
  { solution: IV, capability: "ITSM-MAJOR-INCIDENT", delivery_strength: "partial" },
  { solution: IV, capability: "ITSM-PROBLEM", delivery_strength: "native" },
  { solution: IV, capability: "ITSM-REQUEST", delivery_strength: "native" },
  { solution: IV, capability: "ITSM-EVENT", delivery_strength: "native", notes: "Ivanti Neurons platform bundles discovery and event correlation natively." },
  { solution: IV, capability: "ITSM-CHANGE", delivery_strength: "native" },
  { solution: IV, capability: "ITSM-RELEASE", delivery_strength: "native" },
  { solution: IV, capability: "ITSM-STD-CHANGE", delivery_strength: "native" },
  { solution: IV, capability: "ITSM-CATALOG", delivery_strength: "native" },
  { solution: IV, capability: "ITSM-SLA", delivery_strength: "native" },
  { solution: IV, capability: "ITSM-CHARGEBACK", delivery_strength: "partial" },
  { solution: IV, capability: "ITSM-KNOWLEDGE", delivery_strength: "native" },
  { solution: IV, capability: "ITSM-PORTAL", delivery_strength: "native" },
  { solution: IV, capability: "ITSM-VIRTUAL-AGENT", delivery_strength: "partial" },
  { solution: IV, capability: "ITSM-WALKUP", delivery_strength: "partial", notes: "Endpoint-management heritage helps; not a flagship walk-up workflow." },
  { solution: IV, capability: "ITSM-WORKSPACE", delivery_strength: "native" },
  { solution: IV, capability: "ITSM-ASSIGN", delivery_strength: "native" },
  { solution: IV, capability: "ITSM-AI-TRIAGE", delivery_strength: "partial" },
  { solution: IV, capability: "ITSM-REPORTING", delivery_strength: "native" },
];

// ============================================================
// RUN
// ============================================================
async function main() {
  console.log("\n=== Resolve ITSM domain + solution ids ===");
  const domains = await get("/domains?domain_code=eq.ITSM&select=id,domain_code");
  if (domains.length === 0) throw new Error("ITSM domain not found");
  const itsmDomainId = Number(domains[0].id);
  console.log(`  ITSM domain_id = ${itsmDomainId}`);

  const solutionNames = [SN, BMC, JSM, FS, IV];
  const encodedNames = solutionNames.map(n => `"${n}"`).join(",");
  const solutionsRows = await get(`/solutions?solution_name=in.(${encodeURIComponent(encodedNames)})&select=id,solution_name&limit=100`);
  const solutionMap = new Map<string, number>();
  for (const r of solutionsRows) solutionMap.set(String(r.solution_name), Number(r.id));
  for (const n of solutionNames) {
    if (!solutionMap.has(n)) throw new Error(`Solution not found in catalog: ${n}`);
    console.log(`  ${n} -> id ${solutionMap.get(n)}`);
  }

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
    const cid = capMap.get(c.capability_code);
    if (!cid) throw new Error(`Capability id not resolved for ${c.capability_code}`);
    const key = `${cid}:${itsmDomainId}`;
    if (existingCapDomSet.has(key)) continue;
    newCapDomRows.push({ capability_id: cid, domain_id: itsmDomainId, notes: "" });
  }
  if (newCapDomRows.length > 0) {
    console.log(`  inserting ${newCapDomRows.length} capability_domains rows`);
    await insert("/capability_domains", newCapDomRows);
  } else {
    console.log("  no new capability_domains rows");
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

  // ===== Final counts (ITSM scope) =====
  const counts = {
    itsm_capabilities: (await get(`/capability_domains?domain_id=eq.${itsmDomainId}&select=capability_id&limit=10000`)).length,
    itsm_solution_capabilities: (await get(
      `/solution_capabilities?solution_id=in.(${[...solutionMap.values()].join(",")})&select=solution_id&limit=10000`,
    )).length,
    capabilities_total: (await get("/capabilities?select=id&limit=10000")).length,
    solution_capabilities_total: (await get("/solution_capabilities?select=solution_id&limit=10000")).length,
  };
  console.log("\n=== Final counts ===");
  console.log(JSON.stringify(counts, null, 2));
}

await main();
