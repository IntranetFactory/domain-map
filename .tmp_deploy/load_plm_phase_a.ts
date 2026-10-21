/**
 * PLM Phase A loader (2026-05-24)
 *
 * Loads the Product Lifecycle Management domain end-to-end Phase A:
 *   - domains.PLM (all 7 metadata fields per Rule #8)
 *   - 8 capabilities + capability_domains links
 *   - 5 modules + domain_module_capabilities links
 *   - 3 starter modules (domain_starter_modules)
 *   - 5 new vendors (Dassault, Aras, Autodesk, Propel, Centric)
 *     + reuses Siemens, PTC, Oracle, SAP SE
 *   - 10 solutions + solution_domains coverage links
 *
 * Idempotent; safe to re-run. Reads existing rows by natural key, inserts only
 * missing ones, then re-reads to build the natural-key -> id map.
 *
 * Run from project root:
 *   bun run .tmp_deploy/load_plm_phase_a.ts
 */

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

const get = (path: string) => call({ method: "GET", path });

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

async function syncTable<T extends Row>(
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
    console.log(`  ${path}: all ${rows.length} keys already present`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// ============================================================
// 1. DOMAIN — all 7 metadata fields populated per Rule #8
// ============================================================

const plmDomain = {
  domain_code: "PLM",
  domain_name: "Product Lifecycle Management",
  description:
    "Manages the digital thread of a physical product from concept through engineering release, manufacturing handoff, service, and end-of-life. Holds engineering BOMs, CAD data vault, part masters, engineering change orders, revisions, requirements traceability, configuration and variant rules, and the as-designed to as-built to as-maintained chain. Distinct from PROD-MGMT (software product management) and from MFG-OPS (shop-floor execution).",
  crud_percentage: 75,
  business_logic:
    "ECO impact analysis via where-used graph traversal across BOM trees, BOM rollup costing, configurator and option-and-variant resolution at order time, requirements traceability matrix computation, CAD geometry and viewable processing.",
  min_org_size: "30 m <2500",
  cost_band: "$$$$",
  certification_required: false,
  usa_market_size_usd_m: 5500,
  market_size_source_year: 2024,
  record_status: "new",
};

function validatePlmRow(r: typeof plmDomain): void {
  const errs: string[] = [];
  if (!r.crud_percentage || r.crud_percentage <= 0) errs.push("crud_percentage zero/missing");
  if (!r.min_org_size) errs.push("min_org_size empty");
  if (!r.cost_band) errs.push("cost_band empty");
  if (!r.usa_market_size_usd_m || r.usa_market_size_usd_m <= 0) errs.push("usa_market_size_usd_m zero/missing");
  if (!r.market_size_source_year || r.market_size_source_year <= 0) errs.push("market_size_source_year zero/missing");
  if (!r.business_logic && r.crud_percentage < 95) errs.push("business_logic empty and crud_percentage<95");
  if (errs.length > 0) throw new Error(`Rule #8 validation failed for ${r.domain_code}: ${errs.join("; ")}`);
}

// ============================================================
// 2. CAPABILITIES (8 domain-prefixed)
// ============================================================

const capabilities = [
  { capability_code: "PLM-BOM-MGMT", capability_name: "Bill of Materials Management", description: "Authoring and management of eBOM, mBOM, sBOM structures with where-used traversal, multi-level BOM editing, and effectivity by date / serial / lot." },
  { capability_code: "PLM-CAD-DATA-MGMT", capability_name: "CAD Data Management", description: "Vaulting, check-in / check-out, version control, and viewable generation for CAD models across MCAD and ECAD tools (SOLIDWORKS, Creo, NX, CATIA, Inventor, Altium)." },
  { capability_code: "PLM-CHANGE-MGMT", capability_name: "Engineering Change Management", description: "Engineering change request, order, and notice workflow (ECR / ECO / ECN) with impact analysis, approval routing, and effectivity propagation across BOMs and downstream systems." },
  { capability_code: "PLM-PART-MASTER", capability_name: "Part and Item Master Management", description: "Single source of truth for part numbers, classifications, attributes, units of measure, and lifecycle status, feeding ERP item master and MES." },
  { capability_code: "PLM-REQS-TRACE", capability_name: "Requirements Management and Traceability", description: "Capture, decomposition, and end-to-end traceability of system, software, and hardware requirements through design, verification, and validation." },
  { capability_code: "PLM-CONFIG-MGMT", capability_name: "Product Configuration and Variant Management", description: "Option and variant modeling, configurator rules, and 150 percent BOM management for engineer-to-order, configure-to-order, and assemble-to-order products." },
  { capability_code: "PLM-MFG-PROCESS-PLAN", capability_name: "Manufacturing Process Planning", description: "Authoring of mBOM, manufacturing routing, work instructions, and resource allocations bridging engineering release to shop-floor execution." },
  { capability_code: "PLM-PRODUCT-COMPLIANCE", capability_name: "Product Compliance and Materials Declaration", description: "Substance-of-concern tracking, supplier declarations, and reporting for RoHS, REACH, conflict minerals, PFAS, and similar product-substance regulations." },
];

// ============================================================
// 3. MODULES (5; >=3 capabilities so >=2 modules + starter junction per Rule #14)
// ============================================================

interface ModuleSpec {
  code: string;
  name: string;
  description: string;
  capabilities: string[];
  starterPosition?: number;
  starterNotes?: string;
}

const modules: ModuleSpec[] = [
  {
    code: "PLM-ENG-CORE",
    name: "Engineering Core",
    description: "The foundational PLM module: part and item master, engineering BOM, revision control, and engineering change workflow. Every PLM rollout starts here.",
    capabilities: ["PLM-BOM-MGMT", "PLM-PART-MASTER", "PLM-CHANGE-MGMT"],
    starterPosition: 1,
    starterNotes: "Start here. Item master and engineering BOM control are the foundation every other PLM capability builds on.",
  },
  {
    code: "PLM-CAD-PDM",
    name: "CAD Data Vault",
    description: "Product Data Management module: vaulting, check-in / check-out, version control, and viewable generation for CAD files. Integrates with SOLIDWORKS, Creo, NX, CATIA, Inventor, Altium.",
    capabilities: ["PLM-CAD-DATA-MGMT"],
    starterPosition: 2,
    starterNotes: "Add CAD vaulting once part numbering and revisioning conventions are stable in Engineering Core.",
  },
  {
    code: "PLM-MFG-PROCESS",
    name: "Manufacturing Process Management",
    description: "Bridges engineering release to the shop floor: mBOM authoring, manufacturing routing, work instructions, and configuration / variant resolution at order time.",
    capabilities: ["PLM-MFG-PROCESS-PLAN", "PLM-CONFIG-MGMT"],
    starterPosition: 3,
    starterNotes: "Bridge to manufacturing once the engineering record is reliable. Required to feed MES and ERP with mBOM and routing.",
  },
  {
    code: "PLM-COMPLIANCE",
    name: "Product Compliance",
    description: "Substance tracking and reporting for product regulations: RoHS, REACH, conflict minerals, PFAS. Captures supplier material declarations and generates compliance evidence per shipment / market.",
    capabilities: ["PLM-PRODUCT-COMPLIANCE"],
  },
  {
    code: "PLM-REQUIREMENTS",
    name: "Requirements Management",
    description: "Requirements capture, decomposition, and traceability from customer / regulatory inputs through design, test, and validation. Used heavily in aerospace, automotive, and medical-device.",
    capabilities: ["PLM-REQS-TRACE"],
  },
];

// ============================================================
// 4. VENDORS — 5 new + 4 existing referenced by name
// ============================================================

const newVendors = [
  { vendor_name: "Dassault Systemes", vendor_url: "https://www.3ds.com", headquarters_country: "France", description: "Industrial software vendor; 3DEXPERIENCE / ENOVIA PLM, CATIA, SOLIDWORKS, DELMIA." },
  { vendor_name: "Aras", vendor_url: "https://www.aras.com", headquarters_country: "USA", description: "Open low-code PLM platform vendor (Aras Innovator)." },
  { vendor_name: "Autodesk", vendor_url: "https://www.autodesk.com", headquarters_country: "USA", description: "Design and engineering software vendor; Fusion Manage PLM, Vault PDM, AutoCAD, Inventor, Upchain (absorbed 2021)." },
  { vendor_name: "Propel Software", vendor_url: "https://www.propelsoftware.com", headquarters_country: "USA", description: "Salesforce-native cloud PLM vendor." },
  { vendor_name: "Centric Software", vendor_url: "https://www.centricsoftware.com", headquarters_country: "USA", description: "Vertical PLM vendor for fashion, retail, apparel, footwear, and consumer goods." },
];

// ============================================================
// 5. SOLUTIONS (10 flagships) + solution_domains coverage
// ============================================================

type SolutionDef = {
  solution_name: string;
  vendor: string;
  solution_type: "saas" | "on_prem" | "hybrid" | "open_source" | "internal_build" | "manual_process";
  solution_url?: string;
  description: string;
  notes?: string;
  primary?: string[];
  secondary?: string[];
  partial?: string[];
};

const solutions: SolutionDef[] = [
  { solution_name: "Siemens Teamcenter", vendor: "Siemens", solution_type: "hybrid", solution_url: "https://www.sw.siemens.com/en-US/product/teamcenter/", description: "Market-leading enterprise PLM platform spanning BOM, change, requirements, configuration, manufacturing process, and compliance. Strong in aerospace, automotive, and discrete manufacturing.", primary: ["PLM"], secondary: ["MFG-OPS", "EAM"] },
  { solution_name: "PTC Windchill", vendor: "PTC", solution_type: "hybrid", solution_url: "https://www.ptc.com/en/products/windchill", description: "Enterprise PLM platform with deep CAD integration (Creo native), strong in industrial equipment, medical device, and regulated industries.", primary: ["PLM"], secondary: ["MFG-OPS"] },
  { solution_name: "PTC Arena", vendor: "PTC", solution_type: "saas", solution_url: "https://www.ptc.com/en/products/arena", description: "Cloud-native PLM, strong in mid-market electronics, high-tech, and medical-device. Acquired by PTC in 2021.", primary: ["PLM"] },
  { solution_name: "Dassault 3DEXPERIENCE ENOVIA", vendor: "Dassault Systemes", solution_type: "hybrid", solution_url: "https://www.3ds.com/products/enovia", description: "PLM platform on the 3DEXPERIENCE platform; tightly paired with CATIA and DELMIA for auto and aerospace.", primary: ["PLM"], secondary: ["MFG-OPS"] },
  { solution_name: "Aras Innovator", vendor: "Aras", solution_type: "hybrid", solution_url: "https://www.aras.com/en/products/platform", description: "Open low-code PLM platform with subscription-only commercial model. Strong growth in industrial OEMs needing customisation.", primary: ["PLM"] },
  { solution_name: "Oracle Fusion Cloud PLM", vendor: "Oracle", solution_type: "saas", solution_url: "https://www.oracle.com/scm/product-lifecycle-management/", description: "Cloud PLM successor to Oracle Agile PLM (still in support). Tight integration with Oracle Fusion ERP and SCM.", notes: "Successor to Oracle Agile PLM (legacy on-prem product).", primary: ["PLM"] },
  { solution_name: "SAP Enterprise Product Development", vendor: "SAP SE", solution_type: "hybrid", solution_url: "https://www.sap.com/products/scm/product-lifecycle-management.html", description: "SAP's PLM offering, ERP-anchored on S/4HANA with handoffs to mBOM, supplier collaboration, and quality management.", notes: "Encompasses legacy SAP PLM Classic and the modern Enterprise Product Development cloud suite.", primary: ["PLM"] },
  { solution_name: "Autodesk Fusion Manage with Vault", vendor: "Autodesk", solution_type: "hybrid", solution_url: "https://www.autodesk.com/products/fusion-manage/overview", description: "Cloud PLM (Fusion Manage) paired with on-prem PDM (Vault). Strong in mid-market manufacturers using Inventor / AutoCAD / Fusion 360.", notes: "Autodesk absorbed Upchain in 2021; functionality consolidated into Fusion Manage.", primary: ["PLM"] },
  { solution_name: "Propel PLM", vendor: "Propel Software", solution_type: "saas", solution_url: "https://www.propelsoftware.com/products/plm", description: "Cloud PLM built natively on Salesforce; appeals to customers wanting PLM unified with CRM and QMS on one platform.", primary: ["PLM"] },
  { solution_name: "Centric PLM", vendor: "Centric Software", solution_type: "saas", solution_url: "https://www.centricsoftware.com/products/centric-plm/", description: "Vertical PLM for fashion, apparel, footwear, retail, and consumer goods; specs, materials, color, sourcing.", primary: ["PLM"] },
];

// ============================================================
// RUN
// ============================================================

async function main() {
  console.log("PLM Phase A loader (2026-05-24)");
  console.log("================================");

  // ------ Domain ------
  console.log("\n=== Phase A.1: domains.PLM ===");
  validatePlmRow(plmDomain);
  const domainMap = await syncTable("/domains", [plmDomain], "domain_code");
  const plmId = domainMap.get("PLM")!;
  console.log(`  PLM domain id = ${plmId}`);

  // ------ Capabilities ------
  console.log("\n=== Phase A.2: capabilities ===");
  const capMap = await syncTable(
    "/capabilities",
    capabilities.map(c => ({ ...c, record_status: "new" })),
    "capability_code",
  );

  // ------ capability_domains ------
  console.log("\n=== Phase A.3: capability_domains ===");
  const existingCapLinks = await get(
    `/capability_domains?domain_id=eq.${plmId}&select=capability_id`,
  );
  const existingCapIds = new Set(existingCapLinks.map(r => Number(r.capability_id)));
  const newCapLinks = capabilities
    .map(c => capMap.get(c.capability_code)!)
    .filter(cid => !existingCapIds.has(cid))
    .map(cid => ({ capability_id: cid, domain_id: plmId, record_status: "new" }));
  if (newCapLinks.length > 0) {
    console.log(`  inserting ${newCapLinks.length} capability_domains rows`);
    await insert("/capability_domains", newCapLinks);
  } else {
    console.log("  all capability_domains links already present");
  }

  // ------ Modules ------
  console.log("\n=== Phase A.4: domain_modules ===");
  const existingMods = await get(
    `/domain_modules?domain_id=eq.${plmId}&select=id,domain_module_code`,
  );
  const existingModMap = new Map(existingMods.map(m => [String(m.domain_module_code), Number(m.id)]));
  const newMods = modules
    .filter(m => !existingModMap.has(m.code))
    .map(m => ({
      domain_id: plmId,
      domain_module_code: m.code,
      domain_module_name: m.name,
      description: m.description,
    }));
  if (newMods.length > 0) {
    console.log(`  inserting ${newMods.length} domain_modules rows`);
    await insert("/domain_modules", newMods);
  } else {
    console.log("  all modules already present");
  }
  const allMods = await get(
    `/domain_modules?domain_id=eq.${plmId}&select=id,domain_module_code`,
  );
  const modIdMap = new Map(allMods.map(m => [String(m.domain_module_code), Number(m.id)]));
  for (const m of modules) {
    if (!modIdMap.has(m.code)) throw new Error(`module ${m.code} missing after insert`);
  }

  // ------ domain_module_capabilities ------
  console.log("\n=== Phase A.5: domain_module_capabilities ===");
  const modIds = [...modIdMap.values()];
  const existingDmc = await get(
    `/domain_module_capabilities?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,capability_id`,
  );
  const existingDmcKeys = new Set(existingDmc.map(r => `${r.domain_module_id}:${r.capability_id}`));
  const newDmc: Row[] = [];
  for (const m of modules) {
    const modId = modIdMap.get(m.code)!;
    for (const capCode of m.capabilities) {
      const capId = capMap.get(capCode);
      if (!capId) {
        console.warn(`  WARN: capability ${capCode} not found for module ${m.code}`);
        continue;
      }
      const key = `${modId}:${capId}`;
      if (!existingDmcKeys.has(key)) {
        newDmc.push({ domain_module_id: modId, capability_id: capId });
      }
    }
  }
  if (newDmc.length > 0) {
    console.log(`  inserting ${newDmc.length} domain_module_capabilities rows`);
    await insert("/domain_module_capabilities", newDmc);
  } else {
    console.log("  all module-capability links already present");
  }

  // ------ domain_starter_modules ------
  console.log("\n=== Phase A.6: domain_starter_modules ===");
  const existingStarters = await get(
    `/domain_starter_modules?domain_id=eq.${plmId}&select=domain_module_id`,
  );
  const existingStarterSet = new Set(existingStarters.map(r => Number(r.domain_module_id)));
  const newStarters: Row[] = [];
  for (const m of modules) {
    if (m.starterPosition === undefined) continue;
    const modId = modIdMap.get(m.code)!;
    if (existingStarterSet.has(modId)) continue;
    newStarters.push({
      domain_id: plmId,
      domain_module_id: modId,
      position: m.starterPosition,
      notes: m.starterNotes ?? "",
    });
  }
  if (newStarters.length > 0) {
    console.log(`  inserting ${newStarters.length} domain_starter_modules rows`);
    await insert("/domain_starter_modules", newStarters);
  } else {
    console.log("  starter modules already populated");
  }

  // ------ Vendors ------
  console.log("\n=== Phase A.7: vendors ===");
  await syncTable(
    "/vendors",
    newVendors.map(v => ({ ...v, record_status: "new", notes: "" })),
    "vendor_name",
  );
  // Re-read full vendor map (existing + new) since we need ids for solutions
  const allVendors = await get("/vendors?select=id,vendor_name&limit=10000");
  const vendorMap = new Map(allVendors.map(v => [String(v.vendor_name), Number(v.id)]));

  // ------ Solutions ------
  console.log("\n=== Phase A.8: solutions ===");
  const solutionRows = solutions.map(s => {
    const vendorId = vendorMap.get(s.vendor);
    if (!vendorId) throw new Error(`Vendor "${s.vendor}" not found for solution ${s.solution_name}`);
    return {
      solution_name: s.solution_name,
      description: s.description,
      solution_url: s.solution_url ?? "",
      vendor_id: vendorId,
      solution_type: s.solution_type,
      is_active_in_market: true,
      record_status: "new",
      notes: s.notes ?? "",
    };
  });
  const solutionMap = await syncTable("/solutions", solutionRows, "solution_name");

  // ------ solution_domains ------
  console.log("\n=== Phase A.9: solution_domains ===");
  // need ids for any non-PLM domains referenced in secondary
  const refCodes = new Set<string>();
  for (const s of solutions) {
    [...(s.primary ?? []), ...(s.secondary ?? []), ...(s.partial ?? [])].forEach(c => refCodes.add(c));
  }
  const refDomainRows = await get(
    `/domains?domain_code=in.(${[...refCodes].join(",")})&select=id,domain_code`,
  );
  const refDomainMap = new Map(refDomainRows.map(r => [String(r.domain_code), Number(r.id)]));

  const existingSolLinks = await get(
    "/solution_domains?select=solution_id,domain_id,coverage_level&limit=10000",
  );
  const existingSolKeys = new Set(
    existingSolLinks.map(r => `${r.solution_id}:${r.domain_id}:${r.coverage_level}`),
  );
  const newSolLinks: Row[] = [];
  let skipped = 0;
  for (const s of solutions) {
    const sid = solutionMap.get(s.solution_name);
    if (!sid) throw new Error(`Solution id missing for ${s.solution_name}`);
    const buildLink = (code: string, coverage: "primary" | "secondary" | "partial") => {
      const did = refDomainMap.get(code);
      if (!did) { console.warn(`  ! domain ${code} not found for ${s.solution_name}`); return; }
      const key = `${sid}:${did}:${coverage}`;
      if (existingSolKeys.has(key)) { skipped++; return; }
      existingSolKeys.add(key);
      newSolLinks.push({
        solution_id: sid,
        domain_id: did,
        coverage_level: coverage,
        record_status: "new",
        notes: "",
      });
    };
    for (const code of s.primary ?? []) buildLink(code, "primary");
    for (const code of s.secondary ?? []) buildLink(code, "secondary");
    for (const code of s.partial ?? []) buildLink(code, "partial");
  }
  if (newSolLinks.length > 0) {
    console.log(`  inserting ${newSolLinks.length} solution_domains rows (${skipped} already present)`);
    await insert("/solution_domains", newSolLinks);
  } else {
    console.log(`  no new solution_domains links (${skipped} already present)`);
  }

  // ------ Post-load summary ------
  console.log("\n=== Final PLM counts ===");
  const counts = {
    domain_row: (await get(`/domains?domain_code=eq.PLM&select=id`)).length,
    capabilities: (await get(`/capability_domains?domain_id=eq.${plmId}&select=capability_id`)).length,
    modules: (await get(`/domain_modules?domain_id=eq.${plmId}&select=id`)).length,
    domain_module_capabilities: (await get(`/domain_module_capabilities?domain_module_id=in.(${modIds.join(",")})&select=capability_id`)).length,
    starter_modules: (await get(`/domain_starter_modules?domain_id=eq.${plmId}&select=domain_module_id`)).length,
    solutions_primary_on_plm: (await get(`/solution_domains?domain_id=eq.${plmId}&coverage_level=eq.primary&select=solution_id`)).length,
    solutions_secondary_on_plm: (await get(`/solution_domains?domain_id=eq.${plmId}&coverage_level=eq.secondary&select=solution_id`)).length,
  };
  console.log(counts);

  // ------ Rule #8 post-load audit ------
  console.log("\n=== Rule #8 audit (zero-metadata rows in this load) ===");
  const audit = await get(
    "/domains?select=domain_code,crud_percentage,min_org_size,cost_band,usa_market_size_usd_m&domain_code=eq.PLM",
  );
  console.log(audit);
}

await main();
console.log("\nDone.");
