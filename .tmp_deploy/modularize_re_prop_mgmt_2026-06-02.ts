#!/usr/bin/env bun
// Idempotent modularization loader for RE-PROP-MGMT (domain_id=144).
// Creates 3 full domain_modules, links existing capabilities, assigns existing
// data_objects at their existing role + necessity. Reuses existing entities only.
// Safe to re-run. record_status omitted everywhere (Rule R1). notes omitted (R15).

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

const DOMAIN_ID = 144;
const INDUSTRY_ID = 15; // Real Estate (NAICS 531)

// ---- Module definitions ----
type ModuleSpec = {
  domain_module_name: string;
  domain_module_code: string;
  description: string;
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_name: "Residential Leasing and Screening",
    domain_module_code: "RE-PROP-MGMT-LEASING",
    description:
      "Vacancy marketing, applicant screening, and lease execution for residential units. Advertises open units, syndicates listings, converts leads into applications, screens prospective tenants on credit, criminal, and eviction history, and drives the application-to-signed-lease workflow with move-in scheduling.",
  },
  {
    domain_module_name: "Unit Inventory and Maintenance",
    domain_module_code: "RE-PROP-MGMT-OPERATIONS",
    description:
      "Rental-unit inventory of record plus the tenant-facing maintenance request portal. Tracks each lettable unit's amenities, occupancy, and current rent, and runs tenant-submitted maintenance tickets from intake through urgency triage, vendor dispatch, and resolution with tenant status updates.",
  },
  {
    domain_module_name: "Rent Collection and Property Accounting",
    domain_module_code: "RE-PROP-MGMT-FINANCIALS",
    description:
      "Tenant rent collection and per-property accounting. Processes recurring and one-time rent payments across ACH, card, and cash, assesses late fees per lease terms, and maintains a per-property general ledger with portfolio rollup, owner statements, trust-account separation, and 1099 reporting.",
  },
];

// ---- Capability links: module_code -> [capability_id] ----
const MODULE_CAPS: Record<string, number[]> = {
  "RE-PROP-MGMT-LEASING": [386, 389, 391], // tenant-screening, leasing-pipeline, vacancy-marketing
  "RE-PROP-MGMT-OPERATIONS": [388], // maintenance-request
  "RE-PROP-MGMT-FINANCIALS": [387, 390], // rent-collection, prop-accounting
};

// ---- Data-object assignments: module_code -> [{data_object_id, role, necessity}] ----
// Roles for in-domain masters confirmed master-clean by catalog-wide M7 pre-check.
type DMDO = { data_object_id: number; role: string; necessity: string };
const MODULE_DMDO: Record<string, DMDO[]> = {
  "RE-PROP-MGMT-LEASING": [
    { data_object_id: 359, role: "master", necessity: "required" }, // rental_applications
    { data_object_id: 362, role: "master", necessity: "required" }, // rental_leases
    { data_object_id: 358, role: "master", necessity: "required" }, // property_tenants
    { data_object_id: 357, role: "consumer", necessity: "required" }, // rental_units (mastered in OPERATIONS)
  ],
  "RE-PROP-MGMT-OPERATIONS": [
    { data_object_id: 357, role: "master", necessity: "required" }, // rental_units
    { data_object_id: 361, role: "master", necessity: "required" }, // tenant_maintenance_requests
  ],
  "RE-PROP-MGMT-FINANCIALS": [
    { data_object_id: 360, role: "master", necessity: "required" }, // rent_payments
    { data_object_id: 75, role: "contributor", necessity: "required" }, // supplier_invoices (preserve existing role+necessity)
    { data_object_id: 362, role: "consumer", necessity: "required" }, // rental_leases (mastered in LEASING)
  ],
};

async function precheckMasters() {
  // M7 catalog-wide pre-check: any data_object intended as master here that is
  // already mastered elsewhere must be demoted to embedded_master.
  const intendedMasters: number[] = [];
  for (const rows of Object.values(MODULE_DMDO)) {
    for (const r of rows) if (r.role === "master") intendedMasters.push(r.data_object_id);
  }
  const ids = [...new Set(intendedMasters)];
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?data_object_id=in.(${ids.join(",")})&role=eq.master&select=data_object_id,domain_module_id`,
  );
  const ownedElsewhere = new Set<number>((existing ?? []).map((r: any) => r.data_object_id));
  if (ownedElsewhere.size) {
    console.log(`  PRE-CHECK: demoting to embedded_master (already mastered catalog-wide): ${[...ownedElsewhere].join(", ")}`);
    for (const rows of Object.values(MODULE_DMDO)) {
      for (const r of rows) {
        if (r.role === "master" && ownedElsewhere.has(r.data_object_id)) r.role = "embedded_master";
      }
    }
  } else {
    console.log("  PRE-CHECK: no intended master is mastered elsewhere; all clean.");
  }
}

async function upsertModules(): Promise<Map<string, number>> {
  const codes = MODULES.map((m) => m.domain_module_code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const existingCodes = new Set((existing ?? []).map((r: any) => r.domain_module_code));
  const toInsert = MODULES.filter((m) => !existingCodes.has(m.domain_module_code)).map((m) => ({
    domain_module_name: m.domain_module_name,
    domain_module_code: m.domain_module_code,
    description: m.description,
    domain_id: DOMAIN_ID,
    industry_id: INDUSTRY_ID,
    module_kind: "full",
  }));
  if (toInsert.length) {
    await semantius("POST", "/domain_modules", toInsert);
    console.log(`  +${toInsert.length} domain_modules: ${toInsert.map((m) => m.domain_module_code).join(", ")}`);
  } else {
    console.log("  domain_modules already present; no insert.");
  }
  const all = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  return map;
}

async function upsertCaps(moduleId: number, capIds: number[]) {
  if (!capIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capIds.join(",")})&select=capability_id`,
  );
  const existingIds = new Set((existing ?? []).map((r: any) => r.capability_id));
  const toInsert = capIds
    .filter((id) => !existingIds.has(id))
    .map((capability_id) => ({ domain_module_id: moduleId, capability_id }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`  +${toInsert.length} capability links on module ${moduleId}`);
  }
}

async function upsertDMDO(moduleId: number, rows: DMDO[]) {
  if (!rows.length) return;
  const ids = rows.map((r) => r.data_object_id);
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`,
  );
  const existingIds = new Set((existing ?? []).map((r: any) => r.data_object_id));
  const toInsert = rows
    .filter((r) => !existingIds.has(r.data_object_id))
    .map((r) => ({ domain_module_id: moduleId, data_object_id: r.data_object_id, role: r.role, necessity: r.necessity }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`  +${toInsert.length} DMDO rows on module ${moduleId}`);
  }
}

async function main() {
  console.log("=== Modularize RE-PROP-MGMT (domain 144) ===");
  await precheckMasters();
  const idMap = await upsertModules();
  for (const code of Object.keys(MODULE_CAPS)) {
    const mid = idMap.get(code);
    if (!mid) throw new Error(`module id not found for ${code}`);
    await upsertCaps(mid, MODULE_CAPS[code]);
  }
  for (const code of Object.keys(MODULE_DMDO)) {
    const mid = idMap.get(code);
    if (!mid) throw new Error(`module id not found for ${code}`);
    await upsertDMDO(mid, MODULE_DMDO[code]);
  }
  console.log("\nDone.");
  console.log("Module ids:", Object.fromEntries(idMap));
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
