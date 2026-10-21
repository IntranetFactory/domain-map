#!/usr/bin/env bun
// Idempotent modularization loader for RE-INVEST (Real Estate Investment Management, domain 146).
// Creates 3 full domain_modules, links 6 existing capabilities, assigns 9 existing data_objects.
// Reuses existing entities ONLY. No new data_objects / capabilities / lifecycle / skills / relationships.
// Safe to re-run. Run from project root: bun run "c:/dev/domain-map/.tmp_deploy/modularize_re_invest_2026-06-02.ts"

type Json = any;

const DOMAIN_ID = 146;
const INDUSTRY_ID = 15; // Real Estate

async function semantius(method: string, path: string, body?: Json): Promise<Json> {
  const arg: Json = { method, path };
  if (body !== undefined) arg.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(arg)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius ${method} ${path} failed: ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

// ---- Module definitions (code UPPER-KEBAB, prefixed RE-INVEST-) ----
type ModuleSpec = {
  code: string;
  name: string;
  description: string;
};

const MODULES: ModuleSpec[] = [
  {
    code: "RE-INVEST-FUND-ACCT",
    name: "Fund Accounting",
    description:
      "Partnership accounting for real-estate funds: maintain partner capital accounts, fee and carry schedules, and the mechanics of capital calls and waterfall distributions across GP and LP tiers.",
  },
  {
    code: "RE-INVEST-INVESTOR-REPORTING",
    name: "Investor Reporting and Portal",
    description:
      "Quarterly statements, capital-account roll-forwards, and tax forms delivered to limited partners through an investor-facing portal, drawing on lease income, capital calls, and distribution records.",
  },
  {
    code: "RE-INVEST-PORTFOLIO-VAL",
    name: "Portfolio Valuation and Underwriting",
    description:
      "Property and portfolio valuation via cap rate, DCF, and direct comparison; acquisition underwriting with pro-forma cash flows and sponsor returns; net operating income and net asset value rollups across assets and funds.",
  },
];

// ---- Capability links per module (capability ids) ----
const MODULE_CAPS: Record<string, number[]> = {
  "RE-INVEST-FUND-ACCT": [398, 402], // Fund Accounting, Capital Call and Distribution Management
  "RE-INVEST-INVESTOR-REPORTING": [399], // Investor Reporting and Portal
  "RE-INVEST-PORTFOLIO-VAL": [400, 401, 403], // Valuation, Acquisition Underwriting, NAV/NOI Modeling
};

// ---- Data-object assignments per module ----
// role in {master, embedded_master, contributor, consumer, derived}; necessity in {required, optional}
// 367 capital_calls and 368 fund_distributions are mastered catalog-wide by FUND-ADMIN modules 14/15,
// so they are assigned embedded_master here (NEVER master) per the catalog-wide master pre-check.
type DMDOSpec = { data_object_id: number; role: string; necessity: string };

const MODULE_DMDO: Record<string, DMDOSpec[]> = {
  "RE-INVEST-FUND-ACCT": [
    { data_object_id: 727, role: "master", necessity: "required" }, // investment_funds
    { data_object_id: 729, role: "master", necessity: "required" }, // asset_management_fees
    { data_object_id: 367, role: "embedded_master", necessity: "required" }, // capital_calls (FUND-ADMIN-mastered)
    { data_object_id: 368, role: "embedded_master", necessity: "required" }, // fund_distributions (FUND-ADMIN-mastered)
  ],
  "RE-INVEST-INVESTOR-REPORTING": [
    { data_object_id: 728, role: "master", necessity: "required" }, // limited_partners
    { data_object_id: 367, role: "embedded_master", necessity: "required" }, // capital_calls
    { data_object_id: 368, role: "embedded_master", necessity: "required" }, // fund_distributions
    { data_object_id: 362, role: "consumer", necessity: "required" }, // rental_leases
    { data_object_id: 363, role: "consumer", necessity: "required" }, // commercial_leases
  ],
  "RE-INVEST-PORTFOLIO-VAL": [
    { data_object_id: 366, role: "master", necessity: "required" }, // investment_properties
    { data_object_id: 369, role: "master", necessity: "required" }, // property_valuations
  ],
};

async function ensureModules(): Promise<Map<string, number>> {
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`,
  );
  const have = new Set<string>(existing.map((r: any) => r.domain_module_code));
  const toInsert = MODULES.filter((m) => !have.has(m.code)).map((m) => ({
    domain_module_name: m.name,
    domain_module_code: m.code,
    description: m.description,
    domain_id: DOMAIN_ID,
    module_kind: "full",
    industry_id: INDUSTRY_ID,
  }));
  if (toInsert.length) {
    await semantius("POST", "/domain_modules", toInsert);
    console.log(`  +${toInsert.length} domain_modules: ${toInsert.map((m) => m.domain_module_code).join(", ")}`);
  } else {
    console.log("  modules already present");
  }
  const all = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`,
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  return map;
}

async function ensureCaps(moduleId: number, capIds: number[]): Promise<void> {
  if (!capIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capIds.join(",")})&select=capability_id`,
  );
  const have = new Set<number>(existing.map((r: any) => r.capability_id));
  const toInsert = capIds
    .filter((id) => !have.has(id))
    .map((id) => ({ domain_module_id: moduleId, capability_id: id }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`  +${toInsert.length} capability links on module ${moduleId}`);
  }
}

async function ensureDMDO(moduleId: number, rows: DMDOSpec[]): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map((r) => r.data_object_id);
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`,
  );
  const have = new Set<number>(existing.map((r: any) => r.data_object_id));
  const toInsert = rows
    .filter((r) => !have.has(r.data_object_id))
    .map((r) => ({ domain_module_id: moduleId, data_object_id: r.data_object_id, role: r.role, necessity: r.necessity }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`  +${toInsert.length} DMDO rows on module ${moduleId}`);
  }
}

async function main() {
  console.log("=== RE-INVEST modularization ===");
  const moduleMap = await ensureModules();

  for (const m of MODULES) {
    const moduleId = moduleMap.get(m.code);
    if (!moduleId) throw new Error(`module id not found after insert: ${m.code}`);
    console.log(`\n-- ${m.code} (id ${moduleId}) --`);
    await ensureCaps(moduleId, MODULE_CAPS[m.code] ?? []);
    await ensureDMDO(moduleId, MODULE_DMDO[m.code] ?? []);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
