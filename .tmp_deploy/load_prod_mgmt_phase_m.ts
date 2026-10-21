#!/usr/bin/env bun
// Phase M for PROD-MGMT: 2 modules + DMC + DMDO + starter junction.
// Idempotent: re-reads natural keys before inserting; safe to re-run.

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
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

// Resolve PROD-MGMT id
const domains = await get("/domains?domain_code=eq.PROD-MGMT&select=id");
if (domains.length !== 1) throw new Error("Could not resolve PROD-MGMT domain");
const DOMAIN_ID = Number(domains[0].id);
console.log(`PROD-MGMT id = ${DOMAIN_ID}`);

// ============================================================
// 1. domain_modules
// ============================================================
const modules = [
  {
    domain_id: DOMAIN_ID,
    domain_module_code: "PM-DISCOVERY",
    domain_module_name: "Product Discovery and Prioritization",
    description: "Captures customer feedback and feature ideas, triages them, and prioritizes the backlog that feeds the roadmap. Covers feedback aggregation, opportunity and idea management, and feature prioritization (RICE, value-vs-effort, weighted scoring).",
  },
  {
    domain_id: DOMAIN_ID,
    domain_module_code: "PM-ROADMAP-DELIVERY",
    domain_module_name: "Roadmap, Release, and Strategy",
    description: "Manages the product roadmap, plans and ships releases, runs beta programs, and tracks product metrics against strategy and OKRs. Bridges prioritized opportunities to delivered features and measured outcomes.",
  },
];

console.log(`\n[1/4] domain_modules`);
const existingModules = await get(`/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`);
const existingModuleCodes = new Set(existingModules.map(r => String(r.domain_module_code)));
const missingModules = modules.filter(m => !existingModuleCodes.has(m.domain_module_code));
if (missingModules.length > 0) {
  console.log(`  inserting ${missingModules.length} new modules (${existingModules.length} existed)`);
  await insert("/domain_modules", missingModules);
} else {
  console.log(`  all ${existingModules.length} present, nothing to insert`);
}
const allModules = await get(`/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`);
const moduleId = new Map<string, number>();
for (const m of allModules) moduleId.set(String(m.domain_module_code), Number(m.id));
console.log(`  modules: ${[...moduleId.entries()].map(([c, i]) => `${c}=${i}`).join(", ")}`);

const DISCOVERY_ID = moduleId.get("PM-DISCOVERY");
const ROADMAP_ID = moduleId.get("PM-ROADMAP-DELIVERY");
if (!DISCOVERY_ID || !ROADMAP_ID) throw new Error("Missing module IDs after insert");

// ============================================================
// 2. domain_module_capabilities
// ============================================================
const dmcRows = [
  // PM-DISCOVERY
  { domain_module_id: DISCOVERY_ID, capability_id: 85 }, // PM-FEEDBACK
  { domain_module_id: DISCOVERY_ID, capability_id: 88 }, // PM-DISCOVERY
  { domain_module_id: DISCOVERY_ID, capability_id: 84 }, // PM-PRIORITIZATION
  // PM-ROADMAP-DELIVERY
  { domain_module_id: ROADMAP_ID, capability_id: 83 },   // PM-ROADMAP
  { domain_module_id: ROADMAP_ID, capability_id: 86 },   // PM-RELEASES
  { domain_module_id: ROADMAP_ID, capability_id: 87 },   // PM-STRATEGY
  { domain_module_id: ROADMAP_ID, capability_id: 25 },   // GOAL-MGMT (cross-cutting)
];

console.log(`\n[2/4] domain_module_capabilities`);
const existingDmc = await get(`/domain_module_capabilities?domain_module_id=in.(${DISCOVERY_ID},${ROADMAP_ID})&select=domain_module_id,capability_id`);
const dmcKey = (r: Row) => `${r.domain_module_id}|${r.capability_id}`;
const existingDmcKeys = new Set(existingDmc.map(dmcKey));
const missingDmc = dmcRows.filter(r => !existingDmcKeys.has(dmcKey(r)));
if (missingDmc.length > 0) {
  console.log(`  inserting ${missingDmc.length} new dmc rows (${existingDmc.length} existed)`);
  await insert("/domain_module_capabilities", missingDmc);
} else {
  console.log(`  all ${existingDmc.length} present, nothing to insert`);
}

// ============================================================
// 3. domain_module_data_objects
// ============================================================
const dmdoRows = [
  // PM-DISCOVERY masters
  { domain_module_id: DISCOVERY_ID, data_object_id: 406, role: "master",      necessity: "required" }, // feature_requests
  { domain_module_id: DISCOVERY_ID, data_object_id: 407, role: "master",      necessity: "required" }, // customer_feedback_items

  // PM-ROADMAP-DELIVERY masters
  { domain_module_id: ROADMAP_ID,   data_object_id: 402, role: "master",      necessity: "required" }, // product_lines
  { domain_module_id: ROADMAP_ID,   data_object_id: 403, role: "master",      necessity: "required" }, // product_features
  { domain_module_id: ROADMAP_ID,   data_object_id: 404, role: "master",      necessity: "required" }, // product_releases
  { domain_module_id: ROADMAP_ID,   data_object_id: 405, role: "master",      necessity: "required" }, // product_roadmaps
  { domain_module_id: ROADMAP_ID,   data_object_id: 408, role: "master",      necessity: "required" }, // product_metrics
  { domain_module_id: ROADMAP_ID,   data_object_id: 409, role: "master",      necessity: "required" }, // beta_programs

  // PM-ROADMAP-DELIVERY contributor
  { domain_module_id: ROADMAP_ID,   data_object_id: 249, role: "contributor", necessity: "required" }, // value_streams
];

console.log(`\n[3/4] domain_module_data_objects`);
const existingDmdo = await get(`/domain_module_data_objects?domain_module_id=in.(${DISCOVERY_ID},${ROADMAP_ID})&select=domain_module_id,data_object_id`);
const dmdoKey = (r: Row) => `${r.domain_module_id}|${r.data_object_id}`;
const existingDmdoKeys = new Set(existingDmdo.map(dmdoKey));
const missingDmdo = dmdoRows.filter(r => !existingDmdoKeys.has(dmdoKey(r)));
if (missingDmdo.length > 0) {
  console.log(`  inserting ${missingDmdo.length} new dmdo rows (${existingDmdo.length} existed)`);
  await insert("/domain_module_data_objects", missingDmdo);
} else {
  console.log(`  all ${existingDmdo.length} present, nothing to insert`);
}

// ============================================================
// 4. domain_starter_modules
// ============================================================
const starterRows = [
  {
    domain_id: DOMAIN_ID,
    domain_module_id: DISCOVERY_ID,
    position: 1,
    notes: "Start here: capture customer feedback and feature ideas, then triage and prioritize the backlog.",
  },
  {
    domain_id: DOMAIN_ID,
    domain_module_id: ROADMAP_ID,
    position: 2,
    notes: "Add roadmap, release planning, beta programs, and product metrics to ship the prioritized backlog and measure outcomes.",
  },
];

console.log(`\n[4/4] domain_starter_modules`);
const existingStarter = await get(`/domain_starter_modules?domain_id=eq.${DOMAIN_ID}&select=domain_id,domain_module_id`);
const starterKey = (r: Row) => `${r.domain_id}|${r.domain_module_id}`;
const existingStarterKeys = new Set(existingStarter.map(starterKey));
const missingStarter = starterRows.filter(r => !existingStarterKeys.has(starterKey(r)));
if (missingStarter.length > 0) {
  console.log(`  inserting ${missingStarter.length} new starter rows (${existingStarter.length} existed)`);
  await insert("/domain_starter_modules", missingStarter);
} else {
  console.log(`  all ${existingStarter.length} present, nothing to insert`);
}

console.log("\nPhase M load complete.");
