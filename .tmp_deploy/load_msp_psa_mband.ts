#!/usr/bin/env bun
// MSP-PSA M-band load: 4 modules, capability mappings, data-object mappings, starter junction.
// Idempotent: reads existing rows by natural key before inserting.

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

const MSP_PSA_DOMAIN_ID = 131;

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

// ============================================================
// Phase M1 — domain_modules
// ============================================================
const moduleSpecs = [
  {
    domain_module_code: "MSP-PSA-SVC-DESK",
    domain_module_name: "MSP Multi-Tenant Service Desk",
    module_kind: "full",
    domain_id: MSP_PSA_DOMAIN_ID,
    description: "Multi-tenant service-ticket queue across customer estates, with per-customer SLA timers that pause and resume on hold, a customer portal for self-service ticket submission, and CSAT capture on resolution.",
  },
  {
    domain_module_code: "MSP-PSA-CONTRACTS",
    domain_module_name: "MSP Client Roster and Service Contracts",
    module_kind: "full",
    domain_id: MSP_PSA_DOMAIN_ID,
    description: "MSP client roster and master service agreements with consumption tracking (block-hour decrement, value-tier pricing), renewal-window alerting, and contract-lifecycle gates for activation, suspension, and termination.",
  },
  {
    domain_module_code: "MSP-PSA-TIME-BILLING",
    domain_module_name: "MSP Time Tracking and Customer Billing",
    module_kind: "full",
    domain_id: MSP_PSA_DOMAIN_ID,
    description: "Technician time-entry capture against tickets and contracts, time-approval routing, recurring billing per contract terms, and customer-side invoice issuance with AR-side aging from the MSP's perspective.",
  },
  {
    domain_module_code: "MSP-PSA-DISPATCH",
    domain_module_name: "Technician Dispatch and Scheduling",
    module_kind: "full",
    domain_id: MSP_PSA_DOMAIN_ID,
    description: "Technician scheduling and dispatch board, skill-and-availability matching, on-site versus remote work routing, and load balancing across the technician roster.",
  },
];

// ============================================================
// Phase M2 — domain_module_data_objects
// ============================================================
// Reference data_object ids (from prior query):
// 233 msp_tickets, 234 msp_contracts, 235 msp_time_entries, 236 msp_invoices, 237 msp_clients,
// 85 monitoring_alerts, 223 rmm_agents, 56 hardware_assets, 47 service_incidents
const dmdoSpecs: Array<{ module_code: string; data_object_id: number; role: string; necessity: string }> = [
  // SVC-DESK
  { module_code: "MSP-PSA-SVC-DESK", data_object_id: 233, role: "master", necessity: "required" },
  { module_code: "MSP-PSA-SVC-DESK", data_object_id: 237, role: "consumer", necessity: "required" },
  { module_code: "MSP-PSA-SVC-DESK", data_object_id: 85,  role: "consumer", necessity: "required" },
  { module_code: "MSP-PSA-SVC-DESK", data_object_id: 223, role: "consumer", necessity: "required" },
  { module_code: "MSP-PSA-SVC-DESK", data_object_id: 56,  role: "consumer", necessity: "required" },
  { module_code: "MSP-PSA-SVC-DESK", data_object_id: 47,  role: "contributor", necessity: "optional" },
  // CONTRACTS
  { module_code: "MSP-PSA-CONTRACTS", data_object_id: 234, role: "master", necessity: "required" },
  { module_code: "MSP-PSA-CONTRACTS", data_object_id: 237, role: "master", necessity: "required" },
  // TIME-BILLING
  { module_code: "MSP-PSA-TIME-BILLING", data_object_id: 235, role: "master", necessity: "required" },
  { module_code: "MSP-PSA-TIME-BILLING", data_object_id: 236, role: "master", necessity: "required" },
  { module_code: "MSP-PSA-TIME-BILLING", data_object_id: 233, role: "contributor", necessity: "required" },
  { module_code: "MSP-PSA-TIME-BILLING", data_object_id: 234, role: "consumer", necessity: "required" },
  { module_code: "MSP-PSA-TIME-BILLING", data_object_id: 237, role: "consumer", necessity: "required" },
  // DISPATCH
  { module_code: "MSP-PSA-DISPATCH", data_object_id: 233, role: "contributor", necessity: "required" },
  { module_code: "MSP-PSA-DISPATCH", data_object_id: 235, role: "contributor", necessity: "required" },
  { module_code: "MSP-PSA-DISPATCH", data_object_id: 237, role: "consumer", necessity: "required" },
  { module_code: "MSP-PSA-DISPATCH", data_object_id: 223, role: "consumer", necessity: "optional" },
  { module_code: "MSP-PSA-DISPATCH", data_object_id: 56,  role: "consumer", necessity: "optional" },
];

// ============================================================
// Phase M3 — domain_module_capabilities
// ============================================================
// Capability ids (from prior query): 211 MSP-TICKET, 212 MSP-CONTRACT, 213 MSP-BILLING, 214 MSP-TIME, 215 MSP-DISPATCH, 216 MSP-CSAT
const dmcSpecs: Array<{ module_code: string; capability_id: number }> = [
  { module_code: "MSP-PSA-SVC-DESK",      capability_id: 211 }, // MSP-TICKET
  { module_code: "MSP-PSA-SVC-DESK",      capability_id: 216 }, // MSP-CSAT
  { module_code: "MSP-PSA-CONTRACTS",     capability_id: 212 }, // MSP-CONTRACT
  { module_code: "MSP-PSA-TIME-BILLING",  capability_id: 213 }, // MSP-BILLING
  { module_code: "MSP-PSA-TIME-BILLING",  capability_id: 214 }, // MSP-TIME
  { module_code: "MSP-PSA-DISPATCH",      capability_id: 215 }, // MSP-DISPATCH
];

// ============================================================
// Phase M4 — domain_starter_modules
// ============================================================
const starterSpecs: Array<{ module_code: string; position: number; notes: string }> = [
  { module_code: "MSP-PSA-SVC-DESK",     position: 1, notes: "Start with the multi-tenant queue: tickets across customer estates, SLA timers, and the customer portal. This is the daily-operational surface for any MSP." },
  { module_code: "MSP-PSA-CONTRACTS",    position: 2, notes: "Add the customer roster and master service agreements once the queue is live. Contracts unlock block-hour decrement, value-tier pricing, and renewal alerting." },
  { module_code: "MSP-PSA-TIME-BILLING", position: 3, notes: "Capture technician time against tickets and bill it against contracts. Closes the operational loop into the MSP AR cycle." },
];

// ============================================================
// Loader
// ============================================================
async function main() {
  console.log("=== MSP-PSA M-band load ===\n");

  // ---- domain_modules ----
  console.log("[1/4] domain_modules");
  const existingModules = await get(`/domain_modules?domain_id=eq.${MSP_PSA_DOMAIN_ID}&select=id,domain_module_code`);
  const existingModuleCodes = new Set(existingModules.map(r => String(r.domain_module_code)));
  const missingModules = moduleSpecs.filter(s => !existingModuleCodes.has(s.domain_module_code));
  if (missingModules.length > 0) {
    console.log(`  inserting ${missingModules.length} modules`);
    await insert("/domain_modules", missingModules as Row[]);
  } else {
    console.log(`  all ${moduleSpecs.length} modules already present`);
  }
  const allModules = await get(`/domain_modules?domain_id=eq.${MSP_PSA_DOMAIN_ID}&select=id,domain_module_code`);
  const moduleIdByCode = new Map<string, number>();
  for (const r of allModules) moduleIdByCode.set(String(r.domain_module_code), Number(r.id));
  console.log(`  module ids: ${[...moduleIdByCode.entries()].map(([k, v]) => `${k}=${v}`).join(", ")}`);

  // ---- domain_module_data_objects ----
  console.log("\n[2/4] domain_module_data_objects");
  const modIds = [...moduleIdByCode.values()];
  const existingDmdo = await get(`/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id`);
  const dmdoKey = (mid: number, doid: number) => `${mid}|${doid}`;
  const existingDmdoKeys = new Set(existingDmdo.map(r => dmdoKey(Number(r.domain_module_id), Number(r.data_object_id))));
  const dmdoRows = dmdoSpecs
    .map(s => ({ domain_module_id: moduleIdByCode.get(s.module_code)!, data_object_id: s.data_object_id, role: s.role, necessity: s.necessity }))
    .filter(r => !existingDmdoKeys.has(dmdoKey(r.domain_module_id, r.data_object_id)));
  if (dmdoRows.length > 0) {
    console.log(`  inserting ${dmdoRows.length} DMDO rows`);
    await insert("/domain_module_data_objects", dmdoRows as unknown as Row[]);
  } else {
    console.log(`  all ${dmdoSpecs.length} DMDO rows already present`);
  }

  // ---- domain_module_capabilities ----
  console.log("\n[3/4] domain_module_capabilities");
  const existingDmc = await get(`/domain_module_capabilities?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,capability_id`);
  const dmcKey = (mid: number, cid: number) => `${mid}|${cid}`;
  const existingDmcKeys = new Set(existingDmc.map(r => dmcKey(Number(r.domain_module_id), Number(r.capability_id))));
  const dmcRows = dmcSpecs
    .map(s => ({ domain_module_id: moduleIdByCode.get(s.module_code)!, capability_id: s.capability_id }))
    .filter(r => !existingDmcKeys.has(dmcKey(r.domain_module_id, r.capability_id)));
  if (dmcRows.length > 0) {
    console.log(`  inserting ${dmcRows.length} DMC rows`);
    await insert("/domain_module_capabilities", dmcRows as unknown as Row[]);
  } else {
    console.log(`  all ${dmcSpecs.length} DMC rows already present`);
  }

  // ---- domain_starter_modules ----
  console.log("\n[4/4] domain_starter_modules");
  const existingStarter = await get(`/domain_starter_modules?domain_id=eq.${MSP_PSA_DOMAIN_ID}&select=domain_module_id`);
  const existingStarterIds = new Set(existingStarter.map(r => Number(r.domain_module_id)));
  const starterRows = starterSpecs
    .map(s => ({
      domain_id: MSP_PSA_DOMAIN_ID,
      domain_module_id: moduleIdByCode.get(s.module_code)!,
      position: s.position,
      notes: s.notes,
    }))
    .filter(r => !existingStarterIds.has(r.domain_module_id));
  if (starterRows.length > 0) {
    console.log(`  inserting ${starterRows.length} starter-module rows`);
    await insert("/domain_starter_modules", starterRows as unknown as Row[]);
  } else {
    console.log(`  all ${starterSpecs.length} starter-module rows already present`);
  }

  // ---- summary ----
  console.log("\n=== summary ===");
  const finalModules = await get(`/domain_modules?domain_id=eq.${MSP_PSA_DOMAIN_ID}&select=domain_module_code,description`);
  console.log(`  ${finalModules.length} domain_modules under MSP-PSA`);
  const finalDmdo = await get(`/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=id`);
  console.log(`  ${finalDmdo.length} domain_module_data_objects`);
  const finalDmc = await get(`/domain_module_capabilities?domain_module_id=in.(${modIds.join(",")})&select=id`);
  console.log(`  ${finalDmc.length} domain_module_capabilities`);
  const finalStarter = await get(`/domain_starter_modules?domain_id=eq.${MSP_PSA_DOMAIN_ID}&select=position,domain_module:domain_modules(domain_module_code)&order=position.asc`);
  console.log(`  ${finalStarter.length} starter modules, ramp:`);
  for (const s of finalStarter) console.log(`    ${s.position}. ${(s.domain_module as Row | null)?.domain_module_code}`);

  console.log("\nUI: https://tests.semantius.app/domain_map/domain_modules");
}

await main();
