#!/usr/bin/env bun
// Backfill the solution_capabilities matrix for the 10 cross-cutting
// capabilities loaded earlier. For each capability x solution pair where
// the solution covers ≥1 of the capability's linked domains and no row
// yet exists, insert a row with an explicit delivery_strength.
//
// Strength rules:
//   - Platform vendors (ServiceNow, Salesforce, SAP, Workday, Oracle, MS):
//       native on capabilities they explicitly market across domains.
//   - Pure-play vendors: native on the capability they're built for,
//       not_supported / partial on capabilities outside their scope.
//   - RMM / MSP-PSA tools that show up in ITSM scope: not_supported on
//       service-management capabilities like AI-triage / KB / SLA;
//       partial on APPROVAL-WORKFLOW.
//
// Idempotent: re-reads existing rows and only inserts the missing pairs.

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
  const ec = await proc.exited;
  if (ec !== 0) throw new Error(`exit ${ec}: ${stderr}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += 50) {
    const slice = rows.slice(i, i + 50);
    const res = await call({ method: "POST", path, body: slice });
    out.push(...res);
  }
  return out;
}

type Strength = "native" | "partial" | "via_extension" | "not_supported";

const CROSSCUT: Record<string, string[]> = {
  "KNOWLEDGE-MGMT":            ["KMS", "ITSM", "CSM", "HRSD", "LSD"],
  "AI-TRIAGE-CLASSIFICATION":  ["ITSM", "CSM", "HRSD"],
  "SLA-MGMT":                  ["ITSM", "CSM", "CCAAS", "PSA"],
  "SELF-SERVICE-PORTAL":       ["ITSM", "HRSD", "LSD"],
  "IDENTITY-RESOLUTION":       ["CDP", "MDM", "IGA"],
  "TIME-TRACKING":             ["WFM", "PSA", "EXPENSE"],
  "COMPLIANCE-TRAIN":          ["LMS", "GRC"],
  "CUSTOMER-360":              ["CRM", "CDP", "MDM"],
  "APPROVAL-WORKFLOW":         ["CLM", "CPQ", "S2P", "HCM", "HRSD", "ITSM", "AP-AUTO"],
  "WORKFORCE-SCHEDULING":      ["WFM", "FSM", "MFG-OPS", "RET-STORE"],
};

// Vendor / solution pattern groups
const RMM_AND_MSP_PSA = new Set([
  "Kaseya VSA", "Datto RMM", "ConnectWise RMM", "N-able N-central", "Syncro",
  "Atera", "Pulseway", "NinjaOne", "SuperOps", "ManageEngine Endpoint Central",
  "ConnectWise PSA", "Autotask PSA", "Halo PSA", "Tigerpaw One",
  "TeamViewer", "BeyondTrust Remote Support", "Zoho Assist", "GoTo Resolve",
]);

const BIG_DATA_PLATFORMS = new Set([
  "Palantir Foundry", "Databricks Data Intelligence Platform",
  "Snowflake AI Data Cloud", "Microsoft Fabric", "Google Cloud Data and AI",
  "Amazon SageMaker Unified Studio", "IBM watsonx", "SAP Business Data Cloud",
  "Cloudera Data Platform", "Dataiku",
]);

// Per-capability strength rules. Function returns strength | null (skip).
// `name` = solution name; `domains` = array of domain codes this solution covers.
function decide(capCode: string, name: string, domains: string[]): { strength: Strength; notes?: string } | null {
  const isServiceNow = name.startsWith("ServiceNow ");
  const isSalesforce = name.startsWith("Salesforce ");
  const isWorkday = name.startsWith("Workday ");
  const isSAP = name.startsWith("SAP ");
  const isOracle = name.startsWith("Oracle ") || name.startsWith("Oracle ");
  const isMSFT = name.startsWith("Microsoft ");
  const isRMM = RMM_AND_MSP_PSA.has(name);
  const isBigData = BIG_DATA_PLATFORMS.has(name);

  if (capCode === "KNOWLEDGE-MGMT") {
    if (isRMM) return { strength: "not_supported", notes: "RMM/MSP-PSA tools don't provide a knowledge-management product surface" };
    if (isServiceNow) return { strength: "native" };
    if (isSalesforce) return { strength: "native", notes: "Salesforce Knowledge bundled across Service/Sales/Experience" };
    if (name === "Workday Help" || name === "Workday Journeys") return { strength: "partial", notes: "Workday Knowledge is functional but lighter than ServiceNow/Salesforce" };
    if (["Zendesk Suite", "Freshdesk", "Intercom"].includes(name)) return { strength: "native" };
    if (name === "Ada") return { strength: "partial", notes: "Chatbot uses KB content but doesn't author it" };
    if (name === "Slack") return { strength: "partial", notes: "Channel-based knowledge, not a formal KB lifecycle" };
    if (name === "Salesforce Agentforce") return { strength: "native" };
    if (["Litera", "iManage Cloud", "LawVu", "Onit Enterprise Legal Management"].includes(name)) return { strength: "native", notes: "Legal-knowledge specialist" };
    if (["Applaud", "Enboarder", "Sapling", "Leena AI", "Workgrid"].includes(name)) return { strength: "partial", notes: "HRSD lightweight KB" };
    return { strength: "partial" };
  }

  if (capCode === "AI-TRIAGE-CLASSIFICATION") {
    if (isRMM) return { strength: "not_supported", notes: "RMM/MSP-PSA tools don't provide AI service-triage" };
    if (name === "ServiceNow HR Service Delivery" || name === "ServiceNow Customer Service Management") return { strength: "native", notes: "Now Assist" };
    if (name === "Salesforce Service Cloud" || name === "Salesforce Agentforce") return { strength: "native", notes: "Einstein / Agentforce" };
    if (["Zendesk Suite", "Freshdesk", "Intercom"].includes(name)) return { strength: "native" };
    if (name === "Ada") return { strength: "native", notes: "AI-first chatbot triage" };
    if (name === "Leena AI" || name === "Workgrid") return { strength: "native", notes: "AI-first HRSD" };
    if (["Workday Help", "Workday Journeys", "Applaud", "Enboarder", "Sapling"].includes(name)) return { strength: "partial" };
    return { strength: "partial" };
  }

  if (capCode === "SLA-MGMT") {
    if (isRMM) return { strength: "not_supported", notes: "RMM tools don't track service SLAs in the ITSM sense" };
    if (name === "ServiceNow Customer Service Management" || name === "Salesforce Service Cloud" || name === "Salesforce Agentforce") return { strength: "native" };
    if (["Zendesk Suite", "Freshdesk"].includes(name)) return { strength: "native" };
    if (name === "Intercom") return { strength: "partial" };
    if (name === "Ada") return { strength: "not_supported", notes: "Chatbot front-end, no SLA tracking" };
    // PSA solutions: most track project-level SLAs / milestones; not service-incident SLAs
    return { strength: "partial", notes: "PSA project-SLA tracking, not service-incident SLAs" };
  }

  if (capCode === "SELF-SERVICE-PORTAL") {
    if (isRMM) return { strength: "partial", notes: "Endpoint-management portal exists but not a service catalog" };
    // HRSD and LSD vendors all have portals as core feature
    return { strength: "native" };
  }

  if (capCode === "IDENTITY-RESOLUTION") {
    if (isBigData) return { strength: "partial", notes: "Platform enables identity-resolution workloads but not a flagship feature" };
    if (["SailPoint Identity Security Cloud", "Saviynt Enterprise Identity Cloud"].includes(name)) return { strength: "native" };
    if (["Tealium AudienceStream", "ActionIQ CX Hub", "Twilio Segment", "mParticle CDP", "BlueConic CDP", "Hightouch", "Klaviyo CDP", "Microsoft Dynamics 365 Customer Insights", "Oracle Unity CDP", "SAP Emarsys Customer Engagement", "Bloomreach Engagement"].includes(name)) return { strength: "native" };
    if (name === "Salesforce Marketing Cloud Engagement") return { strength: "partial", notes: "Identity resolution delivered via Salesforce Data Cloud, not Marketing Cloud directly" };
    return { strength: "partial" };
  }

  if (capCode === "TIME-TRACKING") {
    // WFM and PSA vendors: native; EXPENSE-only: partial
    if (["SAP Concur", "Expensify", "Brex", "Ramp", "Navan"].includes(name)) return { strength: "partial", notes: "Time captured for billable expenses, not flagship time-tracking" };
    if (name === "Workday Expenses") return { strength: "partial", notes: "T&E captures time-with-expense not pure time-tracking" };
    if (name === "Workday Absence Management") return { strength: "partial", notes: "Absence tracking, not pure time-on-task" };
    if (["Oracle NetSuite", "SAP S/4HANA", "Unit4 ERP"].includes(name)) return { strength: "partial" };
    if (name === "Planview Portfolios") return { strength: "partial", notes: "Project time-capture is a feature, not flagship" };
    return { strength: "native" };
  }

  if (capCode === "COMPLIANCE-TRAIN") {
    // LMS vendors: native
    if (domains.includes("LMS")) return { strength: "native" };
    // GRC vendors: partial or native depending
    if (name === "ServiceNow Integrated Risk Management") return { strength: "native", notes: "Training-assignment + tracking built in" };
    if (name === "OneTrust GRC") return { strength: "native" };
    if (["AuditBoard", "Diligent One Platform"].includes(name)) return { strength: "partial", notes: "Tracks training compliance, doesn't author or deliver training" };
    return { strength: "partial", notes: "Tracks training compliance via attestation; does not deliver training content" };
  }

  if (capCode === "CUSTOMER-360") {
    // Salesforce family: native
    if (isSalesforce) return { strength: "native", notes: "Marketed under the Customer 360 umbrella" };
    if (name === "HubSpot Sales Hub") return { strength: "native", notes: "HubSpot Customer Platform" };
    if (name === "Microsoft Dynamics 365 Sales" || name === "Microsoft Dynamics 365 Customer Insights") return { strength: "native" };
    if (name === "Oracle Sales" || name === "Oracle Unity CDP") return { strength: "native" };
    if (name === "SAP Sales Cloud" || name === "SAP Emarsys Customer Engagement") return { strength: "native" };
    if (["Adobe Real-Time CDP", "Treasure Data CDP", "Tealium AudienceStream", "Twilio Segment", "mParticle CDP", "ActionIQ CX Hub", "Bloomreach Engagement", "BlueConic CDP", "Hightouch", "Klaviyo CDP"].includes(name)) return { strength: "native" };
    if (isBigData) return { strength: "partial", notes: "Provides data foundation for a Customer 360 but not the unified-customer app" };
    // Smaller CRMs
    if (["Zoho CRM", "Pipedrive", "SugarCRM", "Creatio Sales", "Freshsales", "Insightly CRM", "ActiveCampaign", "Zoho CRM Plus"].includes(name)) return { strength: "partial" };
    return { strength: "partial" };
  }

  if (capCode === "APPROVAL-WORKFLOW") {
    if (isRMM) return { strength: "partial", notes: "Basic approval routing; not enterprise-grade workflow" };
    // Platform vendors and dedicated approval-heavy domains all native
    return { strength: "native" };
  }

  if (capCode === "WORKFORCE-SCHEDULING") {
    // WFM + FSM vendors: native
    if (domains.includes("WFM")) return { strength: "native" };
    if (domains.includes("FSM")) return { strength: "native" };
    // MFG-OPS and RET-STORE: depends
    if (["Reflexis ONE", "NewStore Omnichannel Platform"].includes(name)) return { strength: "native", notes: "Frontline retail labour scheduling is flagship" };
    if (["Salesforce Manufacturing Cloud", "Salesforce Consumer Goods Cloud", "ServiceNow Retail Operations", "ServiceNow Manufacturing Connected Operations", "PTC ThingWorx", "Tulip Frontline Operations", "Plex Smart Manufacturing Platform"].includes(name)) return { strength: "partial", notes: "Crew assignment is a feature, not WFM-grade scheduling" };
    return { strength: "partial" };
  }

  return null;
}

async function main() {
  console.log("=== Load id maps ===");
  const capCodes = Object.keys(CROSSCUT);
  const allCaps = await call({ method: "GET", path: `/capabilities?capability_code=in.(${capCodes.map(c => `"${c}"`).join(",")})&select=id,capability_code` });
  const capId = new Map<string, number>();
  for (const r of allCaps) capId.set(String(r.capability_code), Number(r.id));

  const allDomCodes = [...new Set(Object.values(CROSSCUT).flat())];
  const allDoms = await call({ method: "GET", path: `/domains?domain_code=in.(${allDomCodes.map(c => `"${c}"`).join(",")})&select=id,domain_code` });
  const domId = new Map<string, number>();
  const domCodeById = new Map<number, string>();
  for (const r of allDoms) {
    domId.set(String(r.domain_code), Number(r.id));
    domCodeById.set(Number(r.id), String(r.domain_code));
  }

  const allDomIds = [...domId.values()].join(",");
  const solDoms = await call({ method: "GET", path: `/solution_domains?domain_id=in.(${allDomIds})&select=solution_id,domain_id&limit=10000` });

  const solRows = await call({ method: "GET", path: `/solutions?select=id,solution_name&limit=10000` });
  const solById = new Map<number, string>();
  for (const r of solRows) solById.set(Number(r.id), String(r.solution_name));

  const capIds = [...capId.values()].join(",");
  const existingSC = await call({ method: "GET", path: `/solution_capabilities?capability_id=in.(${capIds})&select=capability_id,solution_id&limit=10000` });
  const existingPairs = new Set(existingSC.map(r => `${r.capability_id}:${r.solution_id}`));

  console.log(`  capabilities resolved: ${capId.size}`);
  console.log(`  domains resolved: ${domId.size}`);
  console.log(`  solution_domains rows in scope: ${solDoms.length}`);
  console.log(`  existing solution_capabilities for these caps: ${existingSC.length}`);

  console.log("\n=== Build per-capability solution sets ===");
  type Plan = { capCode: string; capId: number; pairs: { solutionId: number; solutionName: string; domains: string[]; strength: Strength; notes: string }[] };
  const plans: Plan[] = [];
  let totalNew = 0;
  let totalSkippedExisting = 0;
  let totalUndecided = 0;

  for (const capCode of capCodes) {
    const cid = capId.get(capCode)!;
    const linkedDomCodes = CROSSCUT[capCode];
    const linkedDomIds = new Set(linkedDomCodes.map(c => domId.get(c)!));
    const solDomainsForSol = new Map<number, string[]>();
    for (const sd of solDoms) {
      if (!linkedDomIds.has(Number(sd.domain_id))) continue;
      const sid = Number(sd.solution_id);
      if (!solDomainsForSol.has(sid)) solDomainsForSol.set(sid, []);
      const dCode = domCodeById.get(Number(sd.domain_id))!;
      if (!solDomainsForSol.get(sid)!.includes(dCode)) solDomainsForSol.get(sid)!.push(dCode);
    }
    const pairs: Plan["pairs"] = [];
    for (const [sid, domains] of solDomainsForSol.entries()) {
      const key = `${cid}:${sid}`;
      if (existingPairs.has(key)) { totalSkippedExisting++; continue; }
      const name = solById.get(sid);
      if (!name) { console.log(`  ! solution name not found for id=${sid}`); continue; }
      const decision = decide(capCode, name, domains);
      if (!decision) { totalUndecided++; console.log(`  ! no decision for (${capCode}, ${name})`); continue; }
      pairs.push({ solutionId: sid, solutionName: name, domains: domains.sort(), strength: decision.strength, notes: decision.notes ?? "" });
      totalNew++;
    }
    plans.push({ capCode, capId: cid, pairs });
  }

  console.log(`  total new pairs: ${totalNew}`);
  console.log(`  total skipped (already present): ${totalSkippedExisting}`);
  if (totalUndecided > 0) console.log(`  ! UNDECIDED: ${totalUndecided}`);

  console.log("\n=== Per-capability breakdown ===");
  for (const p of plans) {
    const byStrength = { native: 0, partial: 0, via_extension: 0, not_supported: 0 };
    for (const pair of p.pairs) byStrength[pair.strength]++;
    console.log(`  ${p.capCode}: ${p.pairs.length} new (n=${byStrength.native}, p=${byStrength.partial}, v=${byStrength.via_extension}, ns=${byStrength.not_supported})`);
  }

  console.log("\n=== Inserting solution_capabilities rows ===");
  const rows: Row[] = [];
  for (const p of plans) {
    for (const pair of p.pairs) {
      rows.push({
        capability_id: p.capId,
        solution_id: pair.solutionId,
        delivery_strength: pair.strength,
        notes: pair.notes,
      });
    }
  }
  if (rows.length > 0) {
    await insert("/solution_capabilities", rows);
    console.log(`  inserted ${rows.length} rows`);
  } else {
    console.log("  nothing to insert");
  }

  console.log("\n=== Final per-capability totals ===");
  const after = await call({ method: "GET", path: `/solution_capabilities?capability_id=in.(${capIds})&select=capability_id,delivery_strength&limit=10000` });
  const countPerCap = new Map<number, Record<Strength, number>>();
  for (const r of after) {
    const cid = Number(r.capability_id);
    if (!countPerCap.has(cid)) countPerCap.set(cid, { native: 0, partial: 0, via_extension: 0, not_supported: 0 });
    countPerCap.get(cid)![String(r.delivery_strength) as Strength]++;
  }
  for (const capCode of capCodes) {
    const cid = capId.get(capCode)!;
    const c = countPerCap.get(cid) ?? { native: 0, partial: 0, via_extension: 0, not_supported: 0 };
    const total = c.native + c.partial + c.via_extension + c.not_supported;
    console.log(`  ${capCode}: total=${total} (n=${c.native}, p=${c.partial}, v=${c.via_extension}, ns=${c.not_supported})`);
  }

  console.log("\n=== Catalog totals ===");
  const totals = {
    solution_capabilities_total: (await call({ method: "GET", path: "/solution_capabilities?select=id&limit=20000" })).length,
  };
  console.log(JSON.stringify(totals, null, 2));
}

await main();
