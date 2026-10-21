#!/usr/bin/env bun
// Idempotent modularization loader for EPM (domain_id=66).
// Creates 3 full domain_modules, links existing capabilities, assigns existing data_objects.
// Reuses existing entities ONLY: creates no data_objects, capabilities, lifecycle states, skills, etc.
// Safe to re-run.

type Json = any;

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

const DOMAIN_ID = 66;

// ---- Module specs ----
type ModuleSpec = {
  domain_module_name: string;
  domain_module_code: string;
  description: string;
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_name: "Planning and Budgeting",
    domain_module_code: "EPM-PLAN-BUDGET",
    description: "Authors the annual operating plan, long-range plan, and approved budgets. Owns the dollar plan and budget records, driver-based modeling inputs, and the workforce / headcount spend slice of the plan. The budget, once approved, drives downstream spend authorization.",
  },
  {
    domain_module_name: "Forecasting and Scenario Modeling",
    domain_module_code: "EPM-FORECAST-SCENARIO",
    description: "Maintains rolling forecasts that refresh the expected outlook against actuals, and what-if scenario models layered on a base plan (upside, downside, cost-cut, M and A cases). Forecasts and scenarios feed downstream re-alignment.",
  },
  {
    domain_module_name: "Variance and Management Reporting",
    domain_module_code: "EPM-VARIANCE-REPORT",
    description: "Produces actual-vs-plan variance reconciliations with root-cause commentary and management reporting. The operational analytic output consumed by org leaders and finance partners when variance is material.",
  },
];

// capability_id assignments per module code
const CAP_LINKS: Record<string, number[]> = {
  "EPM-PLAN-BUDGET": [66, 68, 71], // BUDGET-PLAN, DRIVER-MODEL, WORKFORCE-PLAN-EPM
  "EPM-FORECAST-SCENARIO": [67, 69], // FORECAST, SCENARIO-MODEL
  "EPM-VARIANCE-REPORT": [70], // MGMT-REPORT
};

// data_object assignments per module code. role/necessity preserve existing legacy roles.
// masters: 37,38 -> PLAN-BUDGET; 39,40 -> FORECAST-SCENARIO; 41 -> VARIANCE-REPORT (each single-master)
// borrowed: org_units(34) contributor (HCM-mastered), cost_centers(196) contributor, journal_entries(194) consumer
type DMDORow = { data_object_id: number; role: string; necessity: string };
const DO_LINKS: Record<string, DMDORow[]> = {
  "EPM-PLAN-BUDGET": [
    { data_object_id: 37, role: "master", necessity: "required" },      // financial_plans
    { data_object_id: 38, role: "master", necessity: "required" },      // financial_budgets
    { data_object_id: 196, role: "contributor", necessity: "required" }, // cost_centers
    { data_object_id: 34, role: "contributor", necessity: "required" },  // org_units (HCM-mastered)
  ],
  "EPM-FORECAST-SCENARIO": [
    { data_object_id: 39, role: "master", necessity: "required" },      // financial_forecasts
    { data_object_id: 40, role: "master", necessity: "required" },      // financial_scenarios
    { data_object_id: 194, role: "consumer", necessity: "required" },   // journal_entries (ERP-FIN)
  ],
  "EPM-VARIANCE-REPORT": [
    { data_object_id: 41, role: "master", necessity: "required" },      // variance_analyses
    { data_object_id: 194, role: "consumer", necessity: "required" },   // journal_entries (ERP-FIN)
    { data_object_id: 196, role: "contributor", necessity: "required" }, // cost_centers
  ],
};

async function upsertModules(): Promise<Map<string, number>> {
  const codes = MODULES.map(m => m.domain_module_code);
  const existing = await semantius("GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`);
  const existingCodes = new Set(existing.map((r: any) => r.domain_module_code));
  const toInsert = MODULES
    .filter(m => !existingCodes.has(m.domain_module_code))
    .map(m => ({
      domain_module_name: m.domain_module_name,
      domain_module_code: m.domain_module_code,
      description: m.description,
      domain_id: DOMAIN_ID,
      module_kind: "full",
    }));
  if (toInsert.length) {
    await semantius("POST", "/domain_modules", toInsert);
    console.log(`  +${toInsert.length} domain_modules: ${toInsert.map(m => m.domain_module_code).join(", ")}`);
  } else {
    console.log("  modules already present");
  }
  // re-read for code -> id map
  const all = await semantius("GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`);
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  return map;
}

async function upsertCapabilities(moduleId: number, capIds: number[]): Promise<void> {
  if (!capIds.length) return;
  const existing = await semantius("GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capIds.join(",")})&select=capability_id`);
  const existingIds = new Set(existing.map((r: any) => r.capability_id));
  const toInsert = capIds
    .filter(id => !existingIds.has(id))
    .map(id => ({ domain_module_id: moduleId, capability_id: id }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`    +${toInsert.length} capability links on module ${moduleId}`);
  }
}

async function upsertDMDO(moduleId: number, rows: DMDORow[]): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map(r => r.data_object_id);
  const existing = await semantius("GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`);
  const existingIds = new Set(existing.map((r: any) => r.data_object_id));
  const toInsert = rows
    .filter(r => !existingIds.has(r.data_object_id))
    .map(r => ({ domain_module_id: moduleId, data_object_id: r.data_object_id, role: r.role, necessity: r.necessity }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`    +${toInsert.length} DMDO rows on module ${moduleId}`);
  }
}

async function main() {
  console.log("=== Modularize EPM (domain_id=66) ===");
  const idMap = await upsertModules();

  for (const m of MODULES) {
    const moduleId = idMap.get(m.domain_module_code)!;
    console.log(`  ${m.domain_module_code} -> id ${moduleId}`);
    await upsertCapabilities(moduleId, CAP_LINKS[m.domain_module_code]);
    await upsertDMDO(moduleId, DO_LINKS[m.domain_module_code]);
  }

  console.log("\nDone.");
}

main().catch(e => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
