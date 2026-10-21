#!/usr/bin/env bun
// APM refresh Tranche 1: Phase A capabilities + Phase M modules + linkage.
//
// Adds 5 new capabilities, links them to APM, creates 2 modules, links 7
// capabilities to modules, and populates the starter-modules junction.
// Idempotent: re-running is safe.

import { $ } from "bun";

$.throws(false);

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
    const result = await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) });
    out.push(...result);
  }
  return out;
}

const APM_ID = 10;

// ---------- 1. capabilities ----------
const newCaps = [
  { capability_code: "APM-APP-INVENTORY", capability_name: "Application Inventory", description: "Centralized registry of enterprise applications with ownership, lifecycle stage, technology fit and metadata. The portfolio's canonical record." },
  { capability_code: "APM-TIME-SCORING", capability_name: "Application Rationalization and TIME Scoring", description: "Multi-dimensional value scoring (Tolerate, Invest, Migrate, Eliminate) over portfolio applications to drive rationalization decisions." },
  { capability_code: "APM-COST-VISIBILITY", capability_name: "Application Cost Visibility", description: "Total cost of ownership tracking per application across infrastructure, licenses, support and people. Bridges to FINOPS and IT cost analytics." },
  { capability_code: "APM-INTERFACE-MAP", capability_name: "Application Interface Mapping", description: "Inventory of integration points between applications: APIs, file transfers, ETL jobs, event streams. Surfaces interface dependencies for impact analysis." },
  { capability_code: "APM-TECH-LIFECYCLE", capability_name: "Technology Lifecycle Management", description: "Tracks technology platforms (frameworks, runtimes, databases, vendor stacks) across standard, emerging, declining and retired lifecycle stages. Drives tech-stack rationalization." },
];

// ---------- 2. domain_modules ----------
const newModules = [
  { domain_module_code: "APM-PORTFOLIO-REGISTRY", domain_module_name: "Portfolio Registry", description: "The inventory backbone. Masters enterprise_applications, application_interfaces, technology_platforms and business_capability_maps. The first thing a buyer installs: the structured catalog of what's in the application landscape.", domain_id: APM_ID },
  { domain_module_code: "APM-RATIONALIZATION", domain_module_name: "Portfolio Rationalization", description: "The analyst seat. Masters application_costs, application_value_scores and technology_fit_assessments. Once the registry is populated, this module scores it (TIME), bridges to FINOPS for cost, and drives invest/migrate/eliminate decisions.", domain_id: APM_ID },
];

// ---------- 3. domain_module_capabilities linkage ----------
const capModuleLinks: Array<{ moduleCode: string; capabilityCode: string; notes: string }> = [
  { moduleCode: "APM-PORTFOLIO-REGISTRY", capabilityCode: "BUSINESS-CAPABILITY-MAP", notes: "Anchors business_capability_maps inside the registry seat." },
  { moduleCode: "APM-PORTFOLIO-REGISTRY", capabilityCode: "REFERENCE-FRAME-LIBRARY", notes: "Framework library (TOGAF, ArchiMate) ships with the registry seat." },
  { moduleCode: "APM-PORTFOLIO-REGISTRY", capabilityCode: "APM-APP-INVENTORY", notes: "Anchors enterprise_applications." },
  { moduleCode: "APM-PORTFOLIO-REGISTRY", capabilityCode: "APM-INTERFACE-MAP", notes: "Anchors application_interfaces." },
  { moduleCode: "APM-PORTFOLIO-REGISTRY", capabilityCode: "APM-TECH-LIFECYCLE", notes: "Anchors technology_platforms." },
  { moduleCode: "APM-RATIONALIZATION", capabilityCode: "APM-TIME-SCORING", notes: "Realized by application_value_scores and technology_fit_assessments." },
  { moduleCode: "APM-RATIONALIZATION", capabilityCode: "APM-COST-VISIBILITY", notes: "Anchors application_costs; bridges to FINOPS." },
];

// ---------- 4. domain_starter_modules ----------
const starterOrder: Array<{ moduleCode: string; position: number; notes: string }> = [
  { moduleCode: "APM-PORTFOLIO-REGISTRY", position: 1, notes: "The data backbone, start here. Populates the application catalog, capability map, technology platforms and interfaces." },
  { moduleCode: "APM-RATIONALIZATION", position: 2, notes: "Adds TIME scoring, fit assessments and cost visibility. With both installed you have a minimum recognizable APM deployment." },
];

async function syncByKey<T extends Row>(table: string, rows: T[], key: keyof T & string): Promise<Map<string, number>> {
  const existing = await get(`/${table}?select=id,${key}&limit=20000`);
  const existingKeys = new Set(existing.map(r => String(r[key])));
  const missing = rows.filter(r => !existingKeys.has(String(r[key])));
  if (missing.length > 0) {
    console.log(`  ${table}: inserting ${missing.length} new (${existing.length} existed)`);
    await insert(`/${table}`, missing);
  } else {
    console.log(`  ${table}: ${existing.length} already present, nothing to insert`);
  }
  const all = await get(`/${table}?select=id,${key}&limit=20000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[key]), Number(r.id));
  return map;
}

async function main() {
  console.log("Tranche 1 starting");

  console.log("\n[1/5] capabilities");
  const capMap = await syncByKey("capabilities", newCaps, "capability_code");

  console.log("\n[2/5] capability_domains");
  const existingCapDomains = await get(`/capability_domains?domain_id=eq.${APM_ID}&select=capability_id&limit=10000`);
  const existingCapDomainSet = new Set(existingCapDomains.map(r => Number(r.capability_id)));
  const capDomainRows = newCaps
    .map(c => ({ domain_id: APM_ID, capability_id: capMap.get(c.capability_code)! }))
    .filter(r => !existingCapDomainSet.has(r.capability_id));
  if (capDomainRows.length > 0) {
    console.log(`  capability_domains: inserting ${capDomainRows.length} new`);
    await insert("/capability_domains", capDomainRows);
  } else {
    console.log("  capability_domains: nothing to insert");
  }

  console.log("\n[3/5] domain_modules");
  const moduleMap = await syncByKey("domain_modules", newModules, "domain_module_code");

  console.log("\n[4/5] domain_module_capabilities");
  const existingMCL = await get(`/domain_module_capabilities?domain_module_id=in.(${[...moduleMap.values()].join(",")})&select=domain_module_id,capability_id&limit=10000`);
  const existingMCLSet = new Set(existingMCL.map(r => `${r.domain_module_id}:${r.capability_id}`));
  const mclRows: Row[] = [];
  for (const link of capModuleLinks) {
    const moduleId = moduleMap.get(link.moduleCode);
    const capabilityId = capMap.get(link.capabilityCode);
    if (!moduleId || !capabilityId) {
      throw new Error(`unresolved link ${link.moduleCode} -> ${link.capabilityCode} (module=${moduleId}, capability=${capabilityId})`);
    }
    const k = `${moduleId}:${capabilityId}`;
    if (existingMCLSet.has(k)) continue;
    mclRows.push({ domain_module_id: moduleId, capability_id: capabilityId, notes: link.notes });
  }
  if (mclRows.length > 0) {
    console.log(`  domain_module_capabilities: inserting ${mclRows.length} new`);
    await insert("/domain_module_capabilities", mclRows);
  } else {
    console.log("  domain_module_capabilities: nothing to insert");
  }

  console.log("\n[5/5] domain_starter_modules");
  const existingStarter = await get(`/domain_starter_modules?domain_id=eq.${APM_ID}&select=domain_module_id&limit=100`);
  const existingStarterSet = new Set(existingStarter.map(r => Number(r.domain_module_id)));
  const starterRows: Row[] = [];
  for (const s of starterOrder) {
    const mid = moduleMap.get(s.moduleCode)!;
    if (existingStarterSet.has(mid)) continue;
    starterRows.push({ domain_id: APM_ID, domain_module_id: mid, position: s.position, notes: s.notes });
  }
  if (starterRows.length > 0) {
    console.log(`  domain_starter_modules: inserting ${starterRows.length} new`);
    await insert("/domain_starter_modules", starterRows);
  } else {
    console.log("  domain_starter_modules: nothing to insert");
  }

  console.log("\nTranche 1 done");
}

await main();
