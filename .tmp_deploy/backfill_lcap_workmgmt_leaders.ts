#!/usr/bin/env bun
// Backfill LCAP + WORK-MGMT leader coverage missed by the initial Phase A:
//   LCAP: ServiceNow App Engine, Salesforce Platform (already-existing solutions);
//         Pega Platform, Oracle APEX, Zoho Creator, Kissflow, Creatio Platform (new).
//   WORK-MGMT: Adobe Workfront (new), Microsoft Project for the Web (already-existing).
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
// NEW VENDORS
// =========================================================================
const newVendors = [
  { vendor_name: "Pegasystems Inc.", vendor_url: "https://www.pega.com", headquarters_country: "USA", description: "Low-code BPM and CRM platform with deep workflow / case-management heritage and AI-driven decisioning.", notes: "Public NASDAQ:PEGA. Founded 1983, HQ Cambridge MA." },
  { vendor_name: "Kissflow Inc.", vendor_url: "https://kissflow.com", headquarters_country: "USA / India", description: "Low-code work platform for citizen developers, focused on process automation and case management.", notes: "Founded 2012, HQ Chennai / Delaware." },
];

// =========================================================================
// NEW SOLUTIONS (resolved against vendors at runtime)
// =========================================================================
type SolDraft = { solution_name: string; vendor_natural: string; description: string };
const newSolutions: SolDraft[] = [
  { solution_name: "Pega Platform", vendor_natural: "Pegasystems Inc.", description: "Low-code platform combining App Studio (visual builder), Process Fabric (BPM/case management), Decision Hub (real-time AI decisioning), and Pega GenAI assistants. Gartner LCAP Leader." },
  { solution_name: "Oracle APEX", vendor_natural: "Oracle", description: "Low-code application development platform built on Oracle Database. Free with any Oracle DB; deep SQL-first authoring; native to Oracle Autonomous DB. Gartner LCAP Leader." },
  { solution_name: "Zoho Creator", vendor_natural: "Zoho Corporation", description: "Low-code platform within the Zoho One ecosystem: drag-drop UI, scripting via Deluge, 100+ pre-built connectors, native Android/iOS app generation. Strong mid-market footprint." },
  { solution_name: "Kissflow", vendor_natural: "Kissflow Inc.", description: "Low-code platform for citizen developers building process automation, project management, and case management apps." },
  { solution_name: "Creatio Platform", vendor_natural: "Creatio", description: "No-code/low-code platform combining CRM, BPM, and case management on a unified studio. Composable applications via marketplace." },
  { solution_name: "Adobe Workfront", vendor_natural: "Adobe", description: "Enterprise work management platform with strong Gantt, resource planning, and creative-review approval workflows. Adobe-owned since 2020 acquisition; deep integration with Adobe Creative Cloud for marketing/creative teams." },
];

// =========================================================================
// SOLUTION → DOMAIN
// =========================================================================
type SolDom = { solution: string; domain: string; coverage: "primary" | "secondary" | "partial" };
const solDoms: SolDom[] = [
  // LCAP — existing solutions to re-link
  { solution: "ServiceNow App Engine", domain: "LCAP", coverage: "primary" },
  { solution: "Salesforce Platform", domain: "LCAP", coverage: "primary" },
  // LCAP — new solutions
  { solution: "Pega Platform", domain: "LCAP", coverage: "primary" },
  { solution: "Oracle APEX", domain: "LCAP", coverage: "primary" },
  { solution: "Zoho Creator", domain: "LCAP", coverage: "primary" },
  { solution: "Kissflow", domain: "LCAP", coverage: "primary" },
  { solution: "Creatio Platform", domain: "LCAP", coverage: "primary" },
  // WORK-MGMT
  { solution: "Adobe Workfront", domain: "WORK-MGMT", coverage: "primary" },
  { solution: "Microsoft Project for the Web", domain: "WORK-MGMT", coverage: "primary" },
];

// =========================================================================
// SOLUTION → CAPABILITY matrix
// =========================================================================
type SolCap = { solution: string; capability: string; strength: "native" | "partial" | "via_extension" | "not_supported" };
const lcapCapList = ["LCAP-VISUAL-MODELING", "LCAP-MANAGED-RUNTIME", "LCAP-INTEGRATION-CONNECTORS", "LCAP-WORKFLOW-AUTO", "LCAP-LIFECYCLE-MGMT", "LCAP-AI-ASSIST", "OPERATIONAL-DATA-APPS"];
const workCapList = ["WORK-TASK-MGMT", "WORK-DEPS-SCHED", "WORK-CAPACITY", "WORK-GOALS-OKR", "WORK-WORKFLOW-AUTO", "WORK-DASHBOARDS", "APPROVAL-WORKFLOW"];

const solCaps: SolCap[] = [
  // ServiceNow App Engine — all native (its Now Platform is mature LCAP)
  ...lcapCapList.map(c => ({ solution: "ServiceNow App Engine", capability: c, strength: "native" as const })),
  // Salesforce Platform — all native (Lightning, Flow, Apex, MuleSoft, Einstein/Agentforce)
  ...lcapCapList.map(c => ({ solution: "Salesforce Platform", capability: c, strength: "native" as const })),
  // Pega Platform — all native (BPM heritage)
  ...lcapCapList.map(c => ({ solution: "Pega Platform", capability: c, strength: "native" as const })),
  // Oracle APEX — DB-centric strengths + weaker on AI/integrations beyond Oracle stack
  { solution: "Oracle APEX", capability: "LCAP-VISUAL-MODELING", strength: "native" },
  { solution: "Oracle APEX", capability: "LCAP-MANAGED-RUNTIME", strength: "native" },
  { solution: "Oracle APEX", capability: "LCAP-INTEGRATION-CONNECTORS", strength: "partial" }, // strong on Oracle ecosystem, weaker outside
  { solution: "Oracle APEX", capability: "LCAP-WORKFLOW-AUTO", strength: "partial" },
  { solution: "Oracle APEX", capability: "LCAP-LIFECYCLE-MGMT", strength: "partial" },
  { solution: "Oracle APEX", capability: "LCAP-AI-ASSIST", strength: "partial" },
  { solution: "Oracle APEX", capability: "OPERATIONAL-DATA-APPS", strength: "native" }, // DB-first apps
  // Zoho Creator
  { solution: "Zoho Creator", capability: "LCAP-VISUAL-MODELING", strength: "native" },
  { solution: "Zoho Creator", capability: "LCAP-MANAGED-RUNTIME", strength: "native" },
  { solution: "Zoho Creator", capability: "LCAP-INTEGRATION-CONNECTORS", strength: "native" }, // Zoho ecosystem + 100+
  { solution: "Zoho Creator", capability: "LCAP-WORKFLOW-AUTO", strength: "native" },
  { solution: "Zoho Creator", capability: "LCAP-LIFECYCLE-MGMT", strength: "partial" },
  { solution: "Zoho Creator", capability: "LCAP-AI-ASSIST", strength: "partial" }, // Zia AI
  { solution: "Zoho Creator", capability: "OPERATIONAL-DATA-APPS", strength: "native" },
  // Kissflow
  { solution: "Kissflow", capability: "LCAP-VISUAL-MODELING", strength: "native" },
  { solution: "Kissflow", capability: "LCAP-MANAGED-RUNTIME", strength: "native" },
  { solution: "Kissflow", capability: "LCAP-INTEGRATION-CONNECTORS", strength: "partial" },
  { solution: "Kissflow", capability: "LCAP-WORKFLOW-AUTO", strength: "native" }, // process heritage
  { solution: "Kissflow", capability: "LCAP-LIFECYCLE-MGMT", strength: "partial" },
  { solution: "Kissflow", capability: "LCAP-AI-ASSIST", strength: "partial" },
  { solution: "Kissflow", capability: "OPERATIONAL-DATA-APPS", strength: "native" },
  // Creatio Platform
  { solution: "Creatio Platform", capability: "LCAP-VISUAL-MODELING", strength: "native" },
  { solution: "Creatio Platform", capability: "LCAP-MANAGED-RUNTIME", strength: "native" },
  { solution: "Creatio Platform", capability: "LCAP-INTEGRATION-CONNECTORS", strength: "partial" },
  { solution: "Creatio Platform", capability: "LCAP-WORKFLOW-AUTO", strength: "native" }, // BPM heritage
  { solution: "Creatio Platform", capability: "LCAP-LIFECYCLE-MGMT", strength: "partial" },
  { solution: "Creatio Platform", capability: "LCAP-AI-ASSIST", strength: "partial" },
  { solution: "Creatio Platform", capability: "OPERATIONAL-DATA-APPS", strength: "native" },

  // Adobe Workfront — full WORK-MGMT matrix
  { solution: "Adobe Workfront", capability: "WORK-TASK-MGMT", strength: "native" },
  { solution: "Adobe Workfront", capability: "WORK-DEPS-SCHED", strength: "native" }, // strong Gantt
  { solution: "Adobe Workfront", capability: "WORK-CAPACITY", strength: "native" }, // resource mgmt is its differentiator
  { solution: "Adobe Workfront", capability: "WORK-GOALS-OKR", strength: "partial" },
  { solution: "Adobe Workfront", capability: "WORK-WORKFLOW-AUTO", strength: "native" },
  { solution: "Adobe Workfront", capability: "WORK-DASHBOARDS", strength: "native" },
  { solution: "Adobe Workfront", capability: "APPROVAL-WORKFLOW", strength: "native" }, // creative review heritage
  // Microsoft Project for the Web
  { solution: "Microsoft Project for the Web", capability: "WORK-TASK-MGMT", strength: "native" },
  { solution: "Microsoft Project for the Web", capability: "WORK-DEPS-SCHED", strength: "native" }, // Project heritage
  { solution: "Microsoft Project for the Web", capability: "WORK-CAPACITY", strength: "partial" }, // better in desktop MS Project
  { solution: "Microsoft Project for the Web", capability: "WORK-GOALS-OKR", strength: "not_supported" }, // Viva Goals is separate
  { solution: "Microsoft Project for the Web", capability: "WORK-WORKFLOW-AUTO", strength: "via_extension" }, // Power Automate
  { solution: "Microsoft Project for the Web", capability: "WORK-DASHBOARDS", strength: "partial" }, // Power BI
  { solution: "Microsoft Project for the Web", capability: "APPROVAL-WORKFLOW", strength: "via_extension" },
];

// =========================================================================
// EXECUTION
// =========================================================================
console.log("==> LCAP + WORK-MGMT leader backfill\n");

console.log("VENDORS");
const vendorMap = await syncTable("/vendors", newVendors, "vendor_name");
const allVendors = await get("/vendors?select=id,vendor_name&limit=20000");
for (const v of allVendors) vendorMap.set(String(v.vendor_name), Number(v.id));

console.log("SOLUTIONS");
const solutionsToInsert = newSolutions.map(s => {
  const vid = vendorMap.get(s.vendor_natural);
  if (!vid) throw new Error(`Vendor ${s.vendor_natural} not found for ${s.solution_name}`);
  return { solution_name: s.solution_name, vendor_id: vid, description: s.description };
});
const solMap = await syncTable("/solutions", solutionsToInsert, "solution_name");
const allSols = await get("/solutions?select=id,solution_name&limit=20000");
for (const s of allSols) solMap.set(String(s.solution_name), Number(s.id));

const domainMap = new Map<string, number>();
for (const d of await get("/domains?select=id,domain_code&limit=10000")) domainMap.set(String(d.domain_code), Number(d.id));
const capMap = new Map<string, number>();
for (const c of await get("/capabilities?select=id,capability_code&limit=10000")) capMap.set(String(c.capability_code), Number(c.id));

console.log("SOLUTION_DOMAINS");
const existingSolDom = await get("/solution_domains?select=solution_id,domain_id&limit=20000");
const existingSolDomSet = new Set(existingSolDom.map(r => `${r.solution_id}:${r.domain_id}`));
const sdRows = solDoms
  .map(x => {
    const sid = solMap.get(x.solution);
    const did = domainMap.get(x.domain);
    if (!sid) throw new Error(`Solution ${x.solution} not found`);
    if (!did) throw new Error(`Domain ${x.domain} not found`);
    return { solution_id: sid, domain_id: did, coverage_level: x.coverage };
  })
  .filter(r => !existingSolDomSet.has(`${r.solution_id}:${r.domain_id}`));
if (sdRows.length > 0) {
  console.log(`  inserting ${sdRows.length} new solution_domains rows`);
  await insert("/solution_domains", sdRows);
} else {
  console.log("  solution_domains: nothing new");
}

console.log("SOLUTION_CAPABILITIES");
const existingSolCap = await get("/solution_capabilities?select=solution_id,capability_id&limit=20000");
const existingSolCapSet = new Set(existingSolCap.map(r => `${r.solution_id}:${r.capability_id}`));
const scRows = solCaps
  .map(x => {
    const sid = solMap.get(x.solution);
    const cid = capMap.get(x.capability);
    if (!sid) throw new Error(`Solution ${x.solution} not found in matrix`);
    if (!cid) throw new Error(`Capability ${x.capability} not found in matrix`);
    return { solution_id: sid, capability_id: cid, delivery_strength: x.strength };
  })
  .filter(r => !existingSolCapSet.has(`${r.solution_id}:${r.capability_id}`));
if (scRows.length > 0) {
  console.log(`  inserting ${scRows.length} new solution_capabilities rows`);
  await insert("/solution_capabilities", scRows);
} else {
  console.log("  solution_capabilities: nothing new");
}

console.log("\nVERIFY: LCAP solution coverage");
const lcapSols = await get(
  "/solution_domains?domain_id=eq." + domainMap.get("LCAP") +
  "&select=coverage_level,solutions(solution_name)&order=coverage_level.asc"
);
for (const r of lcapSols as any[]) console.log(`  ${r.coverage_level.padEnd(10)} ${r.solutions.solution_name}`);

console.log("\nVERIFY: WORK-MGMT solution coverage");
const wmSols = await get(
  "/solution_domains?domain_id=eq." + domainMap.get("WORK-MGMT") +
  "&select=coverage_level,solutions(solution_name)&order=coverage_level.asc"
);
for (const r of wmSols as any[]) console.log(`  ${r.coverage_level.padEnd(10)} ${r.solutions.solution_name}`);

console.log("\n==> Backfill complete.");
console.log("  https://tests.semantius.app/domain_map/solution_domains");
console.log("  https://tests.semantius.app/domain_map/solution_capabilities");
