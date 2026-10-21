#!/usr/bin/env bun
// SMP (domain id=85) Phase A + M loader:
//   - 7 capabilities + capability_domains
//   - 2 modules + module_capabilities + module_data_objects + starter_modules
//   - 8 new solutions + solution_domains (incl reuse of existing Flexera One id 52)
//   - 9 x 7 = 63 solution_capabilities matrix cells
// Idempotent: re-runs are safe.

import { $ } from "bun";
$.throws(false);

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
const get = (path: string) => call({ method: "GET", path });

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

const SMP_DOMAIN_ID = 85;

// ============================================================
// 1. CAPABILITIES
// ============================================================
const capabilities = [
  { capability_code: "SMP-DISCOVERY", capability_name: "SaaS Application Discovery", description: "Detect SaaS applications in use across the org via SSO logs, expense data, browser plugins, network traffic, and contract feeds." },
  { capability_code: "SMP-SHADOW-IT", capability_name: "Shadow IT Detection", description: "Identify unsanctioned SaaS usage outside the official catalog; triage and promote candidates to sanctioned status or block." },
  { capability_code: "SMP-USAGE-ANALYTICS", capability_name: "SaaS Usage Analytics", description: "Track per-user and per-feature engagement across the SaaS portfolio; identify dormant licenses, low-adoption apps, and engagement trends." },
  { capability_code: "SMP-LICENSE-OPT", capability_name: "SaaS License Optimization", description: "Right-size license tiers; reclaim idle licenses; downgrade where usage permits; flag over-provisioning before renewal." },
  { capability_code: "SMP-APP-LIFECYCLE", capability_name: "SaaS App Lifecycle Automation", description: "Automated provisioning and deprovisioning workflows tied to SSO, HR joiner-mover-leaver events, and role changes." },
  { capability_code: "SMP-RENEWAL-MGMT", capability_name: "SaaS Renewal Management", description: "Track renewal calendar across the SaaS portfolio; coordinate with procurement and legal; negotiate terms and quantity adjustments before auto-renewal." },
  { capability_code: "SMP-VENDOR-MGMT", capability_name: "SaaS Vendor Relationship Management", description: "Centralize vendor contacts, contracts, SLAs, and historical engagement across the SaaS portfolio." },
];

// ============================================================
// 2. MODULES
// ============================================================
const modules = [
  { domain_module_code: "SMP-DISCOVERY-OPT", domain_id: SMP_DOMAIN_ID, domain_module_name: "SMP Discovery and Optimization", description: "Discovery of sanctioned and shadow SaaS, usage analytics, license rightsizing, and provisioning lifecycle automation. The operational substrate of an SMP deployment." },
  { domain_module_code: "SMP-RENEWAL", domain_id: SMP_DOMAIN_ID, domain_module_name: "SMP Renewal and Vendor Management", description: "Renewal pipeline tracking, vendor relationship management, and contract coordination with procurement and legal. The commercial layer on top of the discovery and optimization substrate." },
];

const moduleCapMap: Record<string, string[]> = {
  "SMP-DISCOVERY-OPT": ["SMP-DISCOVERY", "SMP-SHADOW-IT", "SMP-USAGE-ANALYTICS", "SMP-LICENSE-OPT", "SMP-APP-LIFECYCLE"],
  "SMP-RENEWAL": ["SMP-RENEWAL-MGMT", "SMP-VENDOR-MGMT"],
};

// Module-level data_object assignments (data_object_name -> role+necessity).
// Existing domain-level rows on domain_data_objects are preserved (rollup); this junction
// is the deployable-unit truth per Rule #14.
const moduleDataObjects: Array<{ module: string; data_object: string; role: string; necessity: string; notes: string }> = [
  // SMP-DISCOVERY-OPT
  { module: "SMP-DISCOVERY-OPT", data_object: "saas_applications", role: "master", necessity: "required", notes: "Canonical SaaS app registry. Discovery, status (discovered/sanctioned/deprovisioned), owner assignment." },
  { module: "SMP-DISCOVERY-OPT", data_object: "saas_app_assignments", role: "master", necessity: "required", notes: "Per-user assignment of a SaaS app license. Drives provisioning and reclamation workflows." },
  { module: "SMP-DISCOVERY-OPT", data_object: "saas_usage_metrics", role: "master", necessity: "required", notes: "Engagement telemetry per user per app. Source of the idle-threshold reclaim signal." },
  { module: "SMP-DISCOVERY-OPT", data_object: "shadow_it_apps", role: "master", necessity: "required", notes: "Unsanctioned apps surfaced by discovery; triaged toward sanction-or-block decisions." },
  // SMP-RENEWAL
  { module: "SMP-RENEWAL", data_object: "saas_subscriptions", role: "master", necessity: "required", notes: "Buyer-side SaaS contract terms, renewal calendar, quantity, tier. Counterpart to CLM's legal_contracts." },
  { module: "SMP-RENEWAL", data_object: "legal_contracts", role: "contributor", necessity: "required", notes: "CLM-mastered. SMP-RENEWAL writes SaaS-specific renewal terms and clause snapshots back into the master contract record." },
  { module: "SMP-RENEWAL", data_object: "saas_applications", role: "consumer", necessity: "required", notes: "Renewal pipeline reads the app registry to surface upcoming renewals by app and owner." },
];

// ============================================================
// 3. STARTER MODULES (ordered)
// ============================================================
const starterModules: Array<{ module: string; position: number; notes: string }> = [
  { module: "SMP-DISCOVERY-OPT", position: 1, notes: "Start here. The discovery and optimization substrate is the prerequisite for everything else: you cannot manage renewals you have not yet inventoried." },
  { module: "SMP-RENEWAL", position: 2, notes: "Layer renewal and vendor management once the inventory and usage data exists. The commercial layer reads the optimization substrate to recommend right-sizing before each renewal." },
];

// ============================================================
// 4. SOLUTIONS (8 new + reuse Flexera One id 52)
// ============================================================
// Vendor ids (already in catalog): Zylo=278, Productiv=279, Torii=280, BetterCloud=281,
// SAP SE=18, Flexera=11, Snow Software=12, Nudge Security=282, Josys=283
const newSolutions = [
  { solution_name: "Zylo", vendor_id: 278, solution_url: "https://zylo.com", description: "SaaS management platform. Discovery via expense data and SSO; engagement analytics; renewal pipeline coordination." },
  { solution_name: "Productiv", vendor_id: 279, solution_url: "https://productiv.com", description: "SaaS management platform. Engagement analytics-led; deep per-feature usage instrumentation; renewal intelligence." },
  { solution_name: "Torii", vendor_id: 280, solution_url: "https://www.toriihq.com", description: "SaaS management platform. Discovery plus no-code workflow automation for provisioning and deprovisioning." },
  { solution_name: "BetterCloud", vendor_id: 281, solution_url: "https://www.bettercloud.com", description: "SaaS operations platform. Lifecycle automation for SaaS app provisioning, deprovisioning, and policy enforcement." },
  { solution_name: "LeanIX SaaS Management", vendor_id: 18, solution_url: "https://www.leanix.net/en/products/saas-management-intelligence", description: "SAP LeanIX SaaS Management Intelligence. SaaS discovery and optimization with tie-in to LeanIX APM dependency mapping." },
  { solution_name: "Snow Atlas SaaS Management", vendor_id: 12, solution_url: "https://www.snowsoftware.com", description: "Snow's modern SaaS management module on the Snow Atlas platform. Distinct from the legacy Snow License Manager (SAM)." },
  { solution_name: "Nudge Security", vendor_id: 282, solution_url: "https://www.nudgesecurity.com", description: "Security-led SaaS discovery focused on identity-driven signup detection and SaaS supply-chain risk." },
  { solution_name: "Josys", vendor_id: 283, solution_url: "https://www.josys.com", description: "SaaS and device management platform. IT-operations angle on lifecycle automation across the SaaS portfolio." },
];

// Solution names that should link to SMP (8 new + 1 reuse)
const smpSolutionCoverage: Array<{ solution_name: string; coverage_level: string; notes: string }> = [
  { solution_name: "Zylo", coverage_level: "primary", notes: "Pure-play SMP vendor; flagship product." },
  { solution_name: "Productiv", coverage_level: "primary", notes: "Pure-play SMP vendor; flagship product." },
  { solution_name: "Torii", coverage_level: "primary", notes: "Pure-play SMP vendor; flagship product." },
  { solution_name: "BetterCloud", coverage_level: "primary", notes: "SaaS operations / SMP flagship." },
  { solution_name: "LeanIX SaaS Management", coverage_level: "primary", notes: "Part of the SAP LeanIX platform; SMP module distinct from LeanIX EA." },
  { solution_name: "Flexera One", coverage_level: "primary", notes: "Flexera One bundles SAM, SMP, and FinOps under one platform. Existing solution row; SMP coverage added here." },
  { solution_name: "Snow Atlas SaaS Management", coverage_level: "secondary", notes: "Modern unified Snow platform; SaaS coverage layered on a SAM-first heritage." },
  { solution_name: "Nudge Security", coverage_level: "secondary", notes: "Security-led discovery rather than full SMP. Strong on shadow IT and signup detection; weaker on renewal and license optimization." },
  { solution_name: "Josys", coverage_level: "secondary", notes: "IT-ops angle on SMP; particularly strong on lifecycle automation across SaaS plus device." },
];

// ============================================================
// 5. SOLUTION_CAPABILITIES matrix (9 solutions x 7 capabilities = 63 cells)
// ============================================================
// Strength encoding per row: discovery, shadow_it, usage, license_opt, lifecycle, renewal, vendor
const N = "native", P = "partial", V = "via_extension", X = "not_supported";
const matrix: Record<string, [string, string, string, string, string, string, string]> = {
  // sol                            DISC  SHADOW  USAGE  LIC    LIFE  RENEW  VENDOR
  "Zylo":                          [N,    P,      N,     N,     P,    N,     N    ],
  "Productiv":                     [N,    P,      N,     N,     P,    N,     P    ],
  "Torii":                         [N,    N,      N,     N,     N,    P,     P    ],
  "BetterCloud":                   [N,    P,      P,     P,     N,    P,     P    ],
  "LeanIX SaaS Management":        [N,    P,      P,     P,     P,    P,     P    ],
  "Flexera One":                   [N,    P,      P,     N,     P,    P,     N    ],
  "Snow Atlas SaaS Management":    [N,    P,      P,     N,     P,    P,     P    ],
  "Nudge Security":                [N,    N,      P,     X,     P,    X,     X    ],
  "Josys":                         [N,    P,      P,     P,     N,    P,     P    ],
};
const capOrder = ["SMP-DISCOVERY", "SMP-SHADOW-IT", "SMP-USAGE-ANALYTICS", "SMP-LICENSE-OPT", "SMP-APP-LIFECYCLE", "SMP-RENEWAL-MGMT", "SMP-VENDOR-MGMT"];

// ============================================================
// LOADER
// ============================================================
async function main() {
  console.log("=== SMP Phase A + M loader ===");

  // --- 1. Capabilities ---
  console.log("\n[1/9] capabilities");
  const existingCaps = await get("/capabilities?capability_code=in.(" + capabilities.map(c => c.capability_code).join(",") + ")&select=id,capability_code");
  const existingCapCodes = new Set(existingCaps.map(r => r.capability_code as string));
  const newCaps = capabilities.filter(c => !existingCapCodes.has(c.capability_code));
  if (newCaps.length) await insert("/capabilities", newCaps);
  console.log(`  inserted ${newCaps.length}, ${existingCaps.length} pre-existing`);
  const allCaps = await get("/capabilities?capability_code=in.(" + capabilities.map(c => c.capability_code).join(",") + ")&select=id,capability_code");
  const capIdByCode = new Map<string, number>();
  for (const r of allCaps) capIdByCode.set(r.capability_code as string, r.id as number);

  // --- 2. capability_domains ---
  console.log("\n[2/9] capability_domains");
  const capIds = Array.from(capIdByCode.values());
  const existingCapDom = await get(`/capability_domains?domain_id=eq.${SMP_DOMAIN_ID}&capability_id=in.(${capIds.join(",")})&select=capability_id`);
  const existingCapDomSet = new Set(existingCapDom.map(r => r.capability_id as number));
  const newCapDom = capIds.filter(id => !existingCapDomSet.has(id)).map(id => ({ domain_id: SMP_DOMAIN_ID, capability_id: id, notes: "" }));
  if (newCapDom.length) await insert("/capability_domains", newCapDom);
  console.log(`  inserted ${newCapDom.length}, ${existingCapDom.length} pre-existing`);

  // --- 3. domain_modules ---
  console.log("\n[3/9] domain_modules");
  const moduleCodes = modules.map(m => m.domain_module_code);
  const existingModules = await get(`/domain_modules?domain_module_code=in.(${moduleCodes.join(",")})&select=id,domain_module_code`);
  const existingModuleCodes = new Set(existingModules.map(r => r.domain_module_code as string));
  const newModules = modules.filter(m => !existingModuleCodes.has(m.domain_module_code));
  if (newModules.length) await insert("/domain_modules", newModules);
  console.log(`  inserted ${newModules.length}, ${existingModules.length} pre-existing`);
  const allModules = await get(`/domain_modules?domain_module_code=in.(${moduleCodes.join(",")})&select=id,domain_module_code`);
  const moduleIdByCode = new Map<string, number>();
  for (const r of allModules) moduleIdByCode.set(r.domain_module_code as string, r.id as number);

  // --- 4. domain_module_capabilities ---
  console.log("\n[4/9] domain_module_capabilities");
  const desiredModCaps: Row[] = [];
  for (const [modCode, capCodes] of Object.entries(moduleCapMap)) {
    const modId = moduleIdByCode.get(modCode)!;
    for (const capCode of capCodes) {
      desiredModCaps.push({ domain_module_id: modId, capability_id: capIdByCode.get(capCode)!, notes: "" });
    }
  }
  const modIds = Array.from(moduleIdByCode.values());
  const existingModCap = await get(`/domain_module_capabilities?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,capability_id`);
  const existingModCapKey = new Set(existingModCap.map(r => `${r.domain_module_id}|${r.capability_id}`));
  const newModCap = desiredModCaps.filter(r => !existingModCapKey.has(`${r.domain_module_id}|${r.capability_id}`));
  if (newModCap.length) await insert("/domain_module_capabilities", newModCap);
  console.log(`  inserted ${newModCap.length}, ${existingModCap.length} pre-existing`);

  // --- 5. domain_module_data_objects ---
  console.log("\n[5/9] domain_module_data_objects");
  const dataObjectNames = Array.from(new Set(moduleDataObjects.map(r => r.data_object)));
  const dataObjects = await get(`/data_objects?data_object_name=in.(${dataObjectNames.join(",")})&select=id,data_object_name`);
  const doIdByName = new Map<string, number>();
  for (const r of dataObjects) doIdByName.set(r.data_object_name as string, r.id as number);
  const desiredModDO: Row[] = moduleDataObjects.map(r => ({
    domain_module_id: moduleIdByCode.get(r.module)!,
    data_object_id: doIdByName.get(r.data_object)!,
    role: r.role,
    necessity: r.necessity,
    notes: r.notes,
  }));
  const existingModDO = await get(`/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id`);
  const existingModDOKey = new Set(existingModDO.map(r => `${r.domain_module_id}|${r.data_object_id}`));
  const newModDO = desiredModDO.filter(r => !existingModDOKey.has(`${r.domain_module_id}|${r.data_object_id}`));
  if (newModDO.length) await insert("/domain_module_data_objects", newModDO);
  console.log(`  inserted ${newModDO.length}, ${existingModDO.length} pre-existing`);

  // --- 6. domain_starter_modules ---
  console.log("\n[6/9] domain_starter_modules");
  const desiredStarter: Row[] = starterModules.map(r => ({
    domain_id: SMP_DOMAIN_ID,
    domain_module_id: moduleIdByCode.get(r.module)!,
    position: r.position,
    notes: r.notes,
  }));
  const existingStarter = await get(`/domain_starter_modules?domain_id=eq.${SMP_DOMAIN_ID}&select=domain_module_id`);
  const existingStarterSet = new Set(existingStarter.map(r => r.domain_module_id as number));
  const newStarter = desiredStarter.filter(r => !existingStarterSet.has(r.domain_module_id as number));
  if (newStarter.length) await insert("/domain_starter_modules", newStarter);
  console.log(`  inserted ${newStarter.length}, ${existingStarter.length} pre-existing`);

  // --- 7. solutions ---
  console.log("\n[7/9] solutions");
  const solNames = newSolutions.map(s => s.solution_name);
  const existingSols = await get(`/solutions?solution_name=in.("${solNames.join('","')}")&select=id,solution_name`);
  const existingSolNames = new Set(existingSols.map(r => r.solution_name as string));
  const newSols = newSolutions.filter(s => !existingSolNames.has(s.solution_name));
  if (newSols.length) await insert("/solutions", newSols);
  console.log(`  inserted ${newSols.length}, ${existingSols.length} pre-existing`);

  // resolve all 9 solutions (8 newly added + 1 reuse Flexera One id 52)
  const allSolNamesForCoverage = smpSolutionCoverage.map(s => s.solution_name);
  const allSols = await get(`/solutions?solution_name=in.("${allSolNamesForCoverage.join('","')}")&select=id,solution_name`);
  const solIdByName = new Map<string, number>();
  for (const r of allSols) solIdByName.set(r.solution_name as string, r.id as number);

  // --- 8. solution_domains ---
  console.log("\n[8/9] solution_domains");
  const desiredSolDom: Row[] = smpSolutionCoverage.map(c => ({
    solution_id: solIdByName.get(c.solution_name)!,
    domain_id: SMP_DOMAIN_ID,
    coverage_level: c.coverage_level,
    notes: c.notes,
  }));
  const solIds = Array.from(solIdByName.values());
  const existingSolDom = await get(`/solution_domains?domain_id=eq.${SMP_DOMAIN_ID}&solution_id=in.(${solIds.join(",")})&select=solution_id`);
  const existingSolDomSet = new Set(existingSolDom.map(r => r.solution_id as number));
  const newSolDom = desiredSolDom.filter(r => !existingSolDomSet.has(r.solution_id as number));
  if (newSolDom.length) await insert("/solution_domains", newSolDom);
  console.log(`  inserted ${newSolDom.length}, ${existingSolDom.length} pre-existing`);

  // --- 9. solution_capabilities matrix ---
  console.log("\n[9/9] solution_capabilities (9 x 7 = 63 cells)");
  const desiredSolCap: Row[] = [];
  for (const [solName, strengths] of Object.entries(matrix)) {
    const solId = solIdByName.get(solName)!;
    for (let i = 0; i < capOrder.length; i++) {
      desiredSolCap.push({
        solution_id: solId,
        capability_id: capIdByCode.get(capOrder[i])!,
        delivery_strength: strengths[i],
        notes: "",
      });
    }
  }
  const capIdsList = Array.from(capIdByCode.values());
  const existingSolCap = await get(`/solution_capabilities?capability_id=in.(${capIdsList.join(",")})&solution_id=in.(${solIds.join(",")})&select=solution_id,capability_id`);
  const existingSolCapKey = new Set(existingSolCap.map(r => `${r.solution_id}|${r.capability_id}`));
  const newSolCap = desiredSolCap.filter(r => !existingSolCapKey.has(`${r.solution_id}|${r.capability_id}`));
  if (newSolCap.length) await insert("/solution_capabilities", newSolCap);
  console.log(`  inserted ${newSolCap.length}, ${existingSolCap.length} pre-existing`);

  // --- Summary ---
  console.log("\n=== Phase A + M complete ===");
  console.log(`  capabilities:                ${capIdByCode.size}`);
  console.log(`  capability_domains (SMP):    ${capIdByCode.size}`);
  console.log(`  domain_modules (SMP):        ${moduleIdByCode.size}`);
  console.log(`  domain_module_capabilities:  ${desiredModCaps.length}`);
  console.log(`  domain_module_data_objects:  ${moduleDataObjects.length}`);
  console.log(`  domain_starter_modules:      ${starterModules.length}`);
  console.log(`  solutions (new + reuse):     ${smpSolutionCoverage.length}`);
  console.log(`  solution_domains (SMP):      ${smpSolutionCoverage.length}`);
  console.log(`  solution_capabilities cells: ${desiredSolCap.length}`);
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/capabilities");
  console.log("  https://tests.semantius.app/domain_map/domain_modules");
  console.log("  https://tests.semantius.app/domain_map/solutions");
  console.log("  https://tests.semantius.app/domain_map/solution_capabilities");
}

await main();
