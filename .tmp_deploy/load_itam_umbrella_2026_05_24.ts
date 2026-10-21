#!/usr/bin/env bun
// Loads the ITAM umbrella augmentation:
//   Phase A2: 5 cross-cutting capabilities + capability_domains links to ITAM (id 3)
//   Phase A3: 2 new vendors (Certero, Eracent), 5 umbrella ITAM solutions, solution_domains links
//   Phase M1: 4 modules + domain_module_capabilities + domain_module_data_objects + domain_starter_modules
//
// Idempotent. Reads existing rows by natural key (or FK pair) before inserting.

import {} from "bun";

type Row = Record<string, unknown>;

const ITAM_ID = 3;

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

async function syncByKey<T extends Row>(
  path: string,
  rows: T[],
  keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new rows into ${path} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${rows.length} already present, nothing to insert`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

async function syncJunction(
  path: string,
  rows: Row[],
  keyFields: string[],
  filterPath: string,
): Promise<void> {
  // filterPath is a PostgREST query that returns the existing rows scoped to what we care about.
  const existing = await get(filterPath);
  const keyOf = (r: Row) => keyFields.map(k => String(r[k])).join("|");
  const existingKeys = new Set(existing.map(keyOf));
  const missing = rows.filter(r => !existingKeys.has(keyOf(r)));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new rows into ${path} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: all ${rows.length} pairs already present, nothing to insert`);
  }
}

// ============================================================
// Phase A2: capabilities (5) + capability_domains (5)
// ============================================================
const capabilities = [
  {
    capability_code: "ITAM-NORMALIZATION",
    capability_name: "Cross-Asset Normalization",
    description: "Treating the same hardware model, software title, or SaaS app consistently across HAM, SAM, SMP, and FINOPS feeds. Vendors compete on reference-data quality: Flexera Technopedia, ServiceNow Common Service Data Model, Snow Software Recognition Service.",
  },
  {
    capability_code: "ITAM-CONTRACT-MGMT",
    capability_name: "Cross-Asset Contract Management",
    description: "Management of contracts that span multiple asset types: a single agreement covering hardware leases, software licenses, SaaS bundles, and cloud commitments. Avoids the per-sub-domain split where HAM, SAM, and SMP each carry their own contract record.",
  },
  {
    capability_code: "ITAM-LIFECYCLE-LOG",
    capability_name: "Unified Asset Lifecycle Event Log",
    description: "Single event stream across asset types tracking acquisition, assignment, transfer, and retirement. Acts as the cross-asset audit trail and feeds downstream reporting.",
  },
  {
    capability_code: "ITAM-TCO-REPORTING",
    capability_name: "Total Cost of Ownership Reporting",
    description: "Portfolio-level cost reporting combining HAM depreciation, SAM amortization, SMP subscription, and FINOPS cloud spend into a single TCO view per business unit, application, or service.",
  },
  {
    capability_code: "ITAM-RECONCILIATION",
    capability_name: "Cross-Asset Reconciliation",
    description: "Matching a hardware device to its installed software, to the SaaS subscription the user holds, to the cloud user account, to the FINOPS cost line. Vendors with strong reference-data layers (Flexera, Snow, ServiceNow) compete here.",
  },
];

// ============================================================
// Phase A3: vendors (2 new) + solutions (5) + solution_domains (5)
// ============================================================
const vendorsToEnsure = [
  {
    vendor_name: "Certero",
    vendor_url: "https://www.certero.com",
    headquarters_country: "United Kingdom",
    description: "Integrated IT-asset-management vendor offering hardware, software, SaaS, and cloud asset management on a unified platform.",
    notes: "",
  },
  {
    vendor_name: "Eracent",
    vendor_url: "https://www.eracent.com",
    headquarters_country: "USA",
    description: "IT-asset-management vendor specializing in software-license optimization, hardware asset tracking, and cloud financial management through the ITMC platform.",
    notes: "",
  },
];

// Solutions need vendor_id from the live catalog. Resolve at runtime.
const solutionsToEnsure: Array<Row & { vendor_name: string }> = [
  {
    solution_name: "Snow Atlas",
    vendor_name: "Snow Software",
    solution_url: "https://www.snowsoftware.com",
    solution_type: "saas",
    solution_kind: "standard_solution",
    is_active_in_market: true,
    description: "Cloud-native ITAM platform from Snow Software covering hardware, software, SaaS, and cloud asset visibility with a unified reference-data layer.",
    notes: "",
  },
  {
    solution_name: "Ivanti Neurons for ITAM",
    vendor_name: "Ivanti",
    solution_url: "https://www.ivanti.com",
    solution_type: "saas",
    solution_kind: "standard_solution",
    is_active_in_market: true,
    description: "Cross-asset ITAM offering from Ivanti unifying hardware, software, and SaaS lifecycle management on the Ivanti Neurons platform.",
    notes: "",
  },
  {
    solution_name: "USU IT Asset Management",
    vendor_name: "USU Software",
    solution_url: "https://www.usu.com",
    solution_type: "saas",
    solution_kind: "standard_solution",
    is_active_in_market: true,
    description: "Integrated ITAM suite from USU Software covering hardware asset management, software asset management, SaaS management, and cloud cost management.",
    notes: "",
  },
  {
    solution_name: "Certero for Enterprise ITAM",
    vendor_name: "Certero",
    solution_url: "https://www.certero.com",
    solution_type: "saas",
    solution_kind: "standard_solution",
    is_active_in_market: true,
    description: "Certero's unified ITAM offering covering hardware, software, SaaS, and cloud asset management with shared reference data and reporting.",
    notes: "",
  },
  {
    solution_name: "Eracent ITMC",
    vendor_name: "Eracent",
    solution_url: "https://www.eracent.com",
    solution_type: "saas",
    solution_kind: "standard_solution",
    is_active_in_market: true,
    description: "IT Management Center from Eracent providing integrated ITAM, SAM, and cloud financial management.",
    notes: "",
  },
];

const solutionDomainCoverage: Record<string, "primary" | "secondary" | "partial"> = {
  "Snow Atlas": "primary",
  "Ivanti Neurons for ITAM": "primary",
  "USU IT Asset Management": "primary",
  "Certero for Enterprise ITAM": "secondary",
  "Eracent ITMC": "secondary",
};

// ============================================================
// Phase M1: modules (4) + capabilities-link (5) + data-object-link (4) + starter (4)
// ============================================================
const modules = [
  {
    domain_module_code: "ITAM-NORMALIZATION-CATALOG",
    domain_module_name: "Asset Normalization and Catalog",
    domain_id: ITAM_ID,
    description: "Cross-asset reference-data layer: model recognition, software-title normalization, SaaS app catalog, and identity reconciliation across HAM, SAM, SMP, and FINOPS. The substrate that turns disparate asset feeds into a unified portfolio. No own masters in v1; reference data lives in vendor-specific taxonomies (Technopedia, CSDM, SRS).",
  },
  {
    domain_module_code: "ITAM-CONTRACTS",
    domain_module_name: "Cross-Asset Contract Management",
    domain_id: ITAM_ID,
    description: "Unified contract management for agreements spanning multiple asset types. Masters asset_contracts at the umbrella layer because a single contract often covers hardware leases plus software licenses plus SaaS bundles plus cloud commitments.",
  },
  {
    domain_module_code: "ITAM-LIFECYCLE",
    domain_module_name: "Unified Asset Lifecycle Log",
    domain_id: ITAM_ID,
    description: "Cross-asset event log capturing acquisition, assignment, transfer, and retirement across all asset types. Masters asset_lifecycle_events as the single source of truth for the asset audit trail.",
  },
  {
    domain_module_code: "ITAM-PORTFOLIO-REPORTING",
    domain_module_name: "Portfolio TCO Reporting",
    domain_id: ITAM_ID,
    description: "Total cost of ownership and portfolio-level reporting rolling up HAM, SAM, SMP, FINOPS, and EAM. Derived module: no own masters, consumes from every sub-domain and the cross-cutting umbrella modules.",
  },
];

const moduleCapabilities: Array<[string, string]> = [
  ["ITAM-NORMALIZATION-CATALOG", "ITAM-NORMALIZATION"],
  ["ITAM-NORMALIZATION-CATALOG", "ITAM-RECONCILIATION"],
  ["ITAM-CONTRACTS", "ITAM-CONTRACT-MGMT"],
  ["ITAM-LIFECYCLE", "ITAM-LIFECYCLE-LOG"],
  ["ITAM-PORTFOLIO-REPORTING", "ITAM-TCO-REPORTING"],
];

// (module_code, data_object_id, role, necessity, notes)
const moduleDataObjects: Array<{ module: string; data_object_id: number; role: string; necessity: string; notes: string }> = [
  { module: "ITAM-CONTRACTS", data_object_id: 54, role: "master", necessity: "required", notes: "" },
  { module: "ITAM-LIFECYCLE", data_object_id: 55, role: "master", necessity: "required", notes: "" },
  { module: "ITAM-LIFECYCLE", data_object_id: 73, role: "consumer", necessity: "required", notes: "PO line items link to acquired hardware, software, and SaaS assets via the asset.acquired lifecycle event." },
  { module: "ITAM-PORTFOLIO-REPORTING", data_object_id: 61, role: "consumer", necessity: "required", notes: "Read for unified asset portfolio reporting alongside hardware and installed software." },
];

const starterModules: Array<{ module: string; position: number; notes: string }> = [
  { module: "ITAM-NORMALIZATION-CATALOG", position: 1, notes: "Start here. The cross-asset normalization and reconciliation layer is the substrate every other ITAM umbrella module depends on." },
  { module: "ITAM-CONTRACTS", position: 2, notes: "Next, add unified contract management for assets spanning hardware leases, software licenses, SaaS subscriptions, and cloud commitments." },
  { module: "ITAM-LIFECYCLE", position: 3, notes: "Layer in the unified acquisition, assignment, and retirement event log across all asset types." },
  { module: "ITAM-PORTFOLIO-REPORTING", position: 4, notes: "Finally, add total cost of ownership and portfolio reporting rolling up HAM, SAM, SMP, FINOPS, and EAM." },
];

// ============================================================
// Run
// ============================================================
async function main() {
  console.log("\n== Phase A2: capabilities ==");
  const capMap = await syncByKey("/capabilities", capabilities, "capability_code");

  console.log("\n== Phase A2: capability_domains ==");
  const capDomainRows = capabilities.map(c => ({
    capability_id: capMap.get(c.capability_code)!,
    domain_id: ITAM_ID,
    notes: "",
  }));
  await syncJunction(
    "/capability_domains",
    capDomainRows,
    ["capability_id", "domain_id"],
    `/capability_domains?domain_id=eq.${ITAM_ID}&select=capability_id,domain_id`,
  );

  console.log("\n== Phase A3: vendors ==");
  const vendorMap = await syncByKey("/vendors", vendorsToEnsure, "vendor_name");
  // Merge in pre-existing vendors needed for solution FK resolution
  const allVendors = await get("/vendors?select=id,vendor_name&limit=10000");
  for (const v of allVendors) vendorMap.set(String(v.vendor_name), Number(v.id));

  console.log("\n== Phase A3: solutions ==");
  const solutionsWithIds = solutionsToEnsure.map(s => {
    const { vendor_name, ...rest } = s;
    return { ...rest, vendor_id: vendorMap.get(vendor_name as string)! };
  });
  const solMap = await syncByKey("/solutions", solutionsWithIds, "solution_name");

  console.log("\n== Phase A3: solution_domains ==");
  const solDomainRows = solutionsToEnsure.map(s => ({
    solution_id: solMap.get(s.solution_name as string)!,
    domain_id: ITAM_ID,
    coverage_level: solutionDomainCoverage[s.solution_name as string],
    notes: "",
  }));
  await syncJunction(
    "/solution_domains",
    solDomainRows,
    ["solution_id", "domain_id"],
    `/solution_domains?domain_id=eq.${ITAM_ID}&select=solution_id,domain_id`,
  );

  console.log("\n== Phase M1: domain_modules ==");
  const moduleMap = await syncByKey("/domain_modules", modules, "domain_module_code");

  console.log("\n== Phase M1: domain_module_capabilities ==");
  const dmcRows = moduleCapabilities.map(([modCode, capCode]) => ({
    domain_module_id: moduleMap.get(modCode)!,
    capability_id: capMap.get(capCode)!,
    notes: "",
  }));
  const moduleIds = [...moduleMap.values()].filter(id => modules.some(m => moduleMap.get(m.domain_module_code) === id));
  await syncJunction(
    "/domain_module_capabilities",
    dmcRows,
    ["domain_module_id", "capability_id"],
    `/domain_module_capabilities?domain_module_id=in.(${moduleIds.join(",")})&select=domain_module_id,capability_id`,
  );

  console.log("\n== Phase M1: domain_module_data_objects ==");
  const dmdoRows = moduleDataObjects.map(d => ({
    domain_module_id: moduleMap.get(d.module)!,
    data_object_id: d.data_object_id,
    role: d.role,
    necessity: d.necessity,
    notes: d.notes,
  }));
  await syncJunction(
    "/domain_module_data_objects",
    dmdoRows,
    ["domain_module_id", "data_object_id"],
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds.join(",")})&select=domain_module_id,data_object_id`,
  );

  console.log("\n== Phase M1: domain_starter_modules ==");
  const starterRows = starterModules.map(s => ({
    domain_id: ITAM_ID,
    domain_module_id: moduleMap.get(s.module)!,
    position: s.position,
    notes: s.notes,
  }));
  await syncJunction(
    "/domain_starter_modules",
    starterRows,
    ["domain_id", "domain_module_id"],
    `/domain_starter_modules?domain_id=eq.${ITAM_ID}&select=domain_id,domain_module_id`,
  );

  console.log("\n== Summary ==");
  console.log(`  capabilities map size:   ${capMap.size}`);
  console.log(`  modules map size:        ${moduleMap.size}`);
  console.log(`  vendor map size:         ${vendorMap.size}`);
  console.log(`  solution map size:       ${solMap.size}`);
  console.log("\nDone.");
}

await main();
