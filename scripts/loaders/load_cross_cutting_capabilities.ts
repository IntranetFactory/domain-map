#!/usr/bin/env bun
// First pass at cross-cutting capabilities.
// 1. Rename 5 existing domain-prefixed capabilities to domain-neutral codes
//    + generalise their descriptions
// 2. Insert 3 new cross-cutting capabilities that don't exist yet
// 3. Add capability_domains rows so each cross-cutting capability links to
//    every domain it genuinely spans (3+ domains per capability)
// Idempotent.

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

// ============================================================
// 1. RENAMES (existing capability code → new generic code) + description generalisation
// ============================================================
type Rename = { from: string; to: string; newName: string; newDescription: string; addDomains: string[] };

const renames: Rename[] = [
  {
    from: "ITSM-KNOWLEDGE",
    to: "KNOWLEDGE-MGMT",
    newName: "Knowledge Management",
    newDescription:
      "Lifecycle of articles (draft / review / publish / retire), authoring workflow, version control, agent-assist surfacing in the work-item cockpit, and deflection-rate analytics back to the self-service portal. The same engine serves IT, HR, customer service, and legal knowledge bases — same capability, different audiences.",
    addDomains: ["CSM", "HRSD", "LSD"], // ITSM already linked
  },
  {
    from: "ITSM-AI-TRIAGE",
    to: "AI-TRIAGE-CLASSIFICATION",
    newName: "AI Triage and Classification",
    newDescription:
      "Predictive categorisation, priority scoring, similar-case suggestion, suggested-response drafting, and auto-routing based on historical work-item patterns. Same model family used across IT incidents, customer cases, and HR cases — vendors increasingly market it as one cross-workflow capability (Now Assist, Salesforce Einstein, Freddy AI).",
    addDomains: ["CSM", "HRSD"], // ITSM already linked
  },
  {
    from: "ITSM-SLA",
    to: "SLA-MGMT",
    newName: "SLA and OLA Management",
    newDescription:
      "Service-level, operational-level, and underpinning-contract definitions; attachment to work items by priority/category/customer tier; breach detection; escalation triggers; breach reporting. Applies across internal IT services, external customer services, contact-centre work, and project services.",
    addDomains: ["CSM", "CCAAS", "PSA"], // ITSM already linked
  },
  {
    from: "ITSM-PORTAL",
    to: "SELF-SERVICE-PORTAL",
    newName: "Self-Service Portal",
    newDescription:
      "End-user-facing portal for catalog browse, request submission, work-item status and updates, knowledge search, and announcements. Pattern is shared across IT service, HR service, and legal service delivery — same UI shape, different consumer audience.",
    addDomains: ["HRSD", "LSD"], // ITSM already linked
  },
  {
    from: "CDP-IDENT-RES",
    to: "IDENTITY-RESOLUTION",
    newName: "Identity Resolution",
    newDescription:
      "Deterministic and probabilistic stitching of disparate identifiers (email, device, cookie, CRM ID, employee ID, contractor ID) into a unified entity graph. Marketing CDPs, MDM platforms, and IGA tools all build on the same resolution engine — vendors like Reltio, Quantexa, and SAS sell across all three markets.",
    addDomains: ["MDM", "IGA"], // CDP already linked
  },
];

// ============================================================
// 2. EXTENDS (existing capability, already domain-neutral, link to more domains)
// ============================================================
type Extend = { code: string; addDomains: string[] };

const extends_: Extend[] = [
  { code: "TIME-TRACKING",    addDomains: ["PSA", "EXPENSE"] }, // WFM already linked
  { code: "COMPLIANCE-TRAIN", addDomains: ["GRC"] },             // LMS already linked
];

// ============================================================
// 3. NEW CROSS-CUTTING CAPABILITIES (didn't exist)
// ============================================================
type NewCap = { code: string; name: string; description: string; domains: string[] };

const newCaps: NewCap[] = [
  {
    code: "CUSTOMER-360",
    name: "Customer 360 (Unified Customer View)",
    description:
      "Single, reconciled view of a customer across transactional, marketing, and operational systems. Combines CRM account/contact records, CDP behavioural profile, and MDM golden-record stewardship into one queryable surface. Vendors compete on this explicitly across CRM (Salesforce Customer 360), CDP (Treasure Data, Adobe RT-CDP), and MDM (Reltio, Informatica) markets.",
    domains: ["CRM", "CDP", "MDM"],
  },
  {
    code: "APPROVAL-WORKFLOW",
    name: "Approval Workflow Orchestration",
    description:
      "Declarative approval-chain definition (sequential / parallel / conditional), approval routing rules, escalation policies, delegation, and audit trail. The shape is identical across contract approval (CLM), quote discount approval (CPQ), purchase requisition approval (S2P), offer approval (HCM), HR case approval (HRSD), change approval (ITSM), and invoice approval (AP-AUTO). Cross-cutting platform vendors (ServiceNow, Salesforce, SAP) reuse one engine across all of these.",
    domains: ["CLM", "CPQ", "S2P", "HCM", "HRSD", "ITSM", "AP-AUTO"],
  },
  {
    code: "WORKFORCE-SCHEDULING",
    name: "Workforce Scheduling and Dispatch",
    description:
      "Demand-driven shift assignment, route optimisation, skill matching, and dispatch for frontline workers. Same engine serves hourly workforce scheduling (WFM), field-service dispatch (FSM), shop-floor crew assignment (MFG-OPS), and store labour scheduling (RET-STORE). Vendors like UKG/Kronos, Quinyx, and ServiceMax compete across multiple of these.",
    domains: ["WFM", "FSM", "MFG-OPS", "RET-STORE"],
  },
];

async function main() {
  console.log("=== Step 1: load id maps ===");
  const allCaps = await call({ method: "GET", path: "/capabilities?select=id,capability_code&limit=10000" });
  const capIdByCode = new Map<string, number>();
  for (const r of allCaps) capIdByCode.set(String(r.capability_code), Number(r.id));

  const allDomains = await call({ method: "GET", path: "/domains?select=id,domain_code&limit=10000" });
  const domainIdByCode = new Map<string, number>();
  for (const r of allDomains) domainIdByCode.set(String(r.domain_code), Number(r.id));

  const existingCD = await call({ method: "GET", path: "/capability_domains?select=capability_id,domain_id&limit=10000" });
  const existingCDSet = new Set(existingCD.map(r => `${r.capability_id}:${r.domain_id}`));

  console.log("\n=== Step 2: rename existing capabilities ===");
  for (const r of renames) {
    const existing = capIdByCode.get(r.from);
    if (!existing) {
      // Maybe already renamed
      if (capIdByCode.has(r.to)) {
        console.log(`  ${r.from} → ${r.to}: already renamed`);
        continue;
      }
      throw new Error(`Capability ${r.from} not found and ${r.to} not present either`);
    }
    if (capIdByCode.has(r.to)) {
      console.log(`  ${r.from} → ${r.to}: target already exists, skipping rename`);
      continue;
    }
    await call({
      method: "PATCH",
      path: `/capabilities?id=eq.${existing}`,
      body: { capability_code: r.to, capability_name: r.newName, description: r.newDescription },
    });
    capIdByCode.delete(r.from);
    capIdByCode.set(r.to, existing);
    console.log(`  renamed ${r.from} → ${r.to} (id ${existing})`);
  }

  console.log("\n=== Step 3: insert new cross-cutting capabilities ===");
  const newCapRows = newCaps
    .filter(c => !capIdByCode.has(c.code))
    .map(c => ({ capability_code: c.code, capability_name: c.name, description: c.description }));
  if (newCapRows.length > 0) {
    await insert("/capabilities", newCapRows);
    const refreshed = await call({ method: "GET", path: "/capabilities?select=id,capability_code&limit=10000" });
    capIdByCode.clear();
    for (const r of refreshed) capIdByCode.set(String(r.capability_code), Number(r.id));
    console.log(`  inserted ${newCapRows.length} new capabilities`);
  } else {
    console.log("  all new capabilities already exist");
  }

  console.log("\n=== Step 4: add capability_domains rows ===");
  type Link = { capCode: string; domainCode: string };
  const links: Link[] = [];
  for (const r of renames)   for (const d of r.addDomains)   links.push({ capCode: r.to, domainCode: d });
  for (const e of extends_)  for (const d of e.addDomains)   links.push({ capCode: e.code, domainCode: d });
  for (const c of newCaps)   for (const d of c.domains)      links.push({ capCode: c.code, domainCode: d });

  const toInsert: Row[] = [];
  for (const l of links) {
    const capId = capIdByCode.get(l.capCode);
    const domainId = domainIdByCode.get(l.domainCode);
    if (!capId) throw new Error(`Capability not found: ${l.capCode}`);
    if (!domainId) { console.log(`  ! domain not found: ${l.domainCode} (skip)`); continue; }
    const key = `${capId}:${domainId}`;
    if (existingCDSet.has(key)) continue;
    existingCDSet.add(key);
    toInsert.push({ capability_id: capId, domain_id: domainId, notes: "" });
  }
  if (toInsert.length > 0) {
    await insert("/capability_domains", toInsert);
    console.log(`  inserted ${toInsert.length} capability_domains rows`);
  } else {
    console.log("  no new capability_domains rows");
  }

  console.log("\n=== Step 5: audit ===");
  const renamedCodes = renames.map(r => r.to);
  const extendCodes = extends_.map(e => e.code);
  const newCodes = newCaps.map(c => c.code);
  const allCrossCutting = [...renamedCodes, ...extendCodes, ...newCodes];

  for (const code of allCrossCutting) {
    const id = capIdByCode.get(code);
    if (!id) { console.log(`  ! ${code} not found`); continue; }
    const links = await call({
      method: "GET",
      path: `/capability_domains?capability_id=eq.${id}&select=domains(domain_code)`,
    });
    const codes = links.map((l: any) => l.domains.domain_code).sort();
    console.log(`  ${code}: ${codes.length} domain${codes.length !== 1 ? "s" : ""} — ${codes.join(", ")}`);
  }

  const finalCounts = {
    capabilities_total:        (await call({ method: "GET", path: "/capabilities?select=id&limit=10000" })).length,
    capability_domains_total:  (await call({ method: "GET", path: "/capability_domains?select=id&limit=10000" })).length,
    cross_cutting_capabilities: allCrossCutting.length,
  };
  console.log("\n=== Final counts ===");
  console.log(JSON.stringify(finalCounts, null, 2));
}

await main();
