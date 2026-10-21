#!/usr/bin/env bun
// Loads:
//   Block 1 — NetSuite domain extension (12 solution_domains rows on solution_id=273).
//   Block 2 — INV-MGMT Phase A (domain, capabilities, modules, vendors, solutions, junctions).
//
// Idempotent: every table read by natural key, only missing rows inserted, then re-read
// to build a natural-key -> id map for downstream FK resolution. record_status defaults
// to "new" by omission (Rule #1).

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

async function syncTable<T extends Row>(
  path: string,
  rows: T[],
  keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  ${path}: inserting ${missing.length} new (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} present, nothing new`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// Domain row validation (Rule #8).
function validateDomainRow(row: Record<string, unknown>): void {
  const code = String(row.domain_code);
  const crud = Number(row.crud_percentage ?? 0);
  const minOrg = String(row.min_org_size ?? "");
  const costBand = String(row.cost_band ?? "");
  const bizLogic = String(row.business_logic ?? "");
  const mkt = Number(row.usa_market_size_usd_m ?? 0);
  const mktYear = Number(row.market_size_source_year ?? 0);
  if (crud === 0) throw new Error(`${code}: crud_percentage must be > 0`);
  if (!minOrg) throw new Error(`${code}: min_org_size must be populated`);
  if (!costBand) throw new Error(`${code}: cost_band must be populated`);
  if (mkt === 0) throw new Error(`${code}: usa_market_size_usd_m must be > 0`);
  if (mktYear === 0) throw new Error(`${code}: market_size_source_year must be > 0`);
  if (bizLogic === "" && crud < 95) {
    throw new Error(`${code}: business_logic required when crud_percentage (${crud}) < 95`);
  }
}

// ===================================================================
// Block 1 — NetSuite domain extension
// ===================================================================
async function loadNetSuiteExtension() {
  console.log("\n=== Block 1: NetSuite domain extension ===");
  const NETSUITE_SOLUTION_ID = 273;

  const netsuiteTargets: Array<{ domain_code: string; coverage_level: "primary" | "secondary" | "partial"; notes: string }> = [
    { domain_code: "CRM",      coverage_level: "secondary", notes: "NetSuite CRM (embedded module). Not a flagship CRM but a real module bundled with the suite." },
    { domain_code: "OMS",      coverage_level: "primary",   notes: "NetSuite Order Management is core to the suite; NetSuite originated as ERP plus OMS for digital businesses." },
    { domain_code: "B2C-COMM", coverage_level: "secondary", notes: "SuiteCommerce Advanced. Functional commerce front-end; not flagship-tier vs Shopify or commercetools." },
    { domain_code: "HCM",      coverage_level: "secondary", notes: "SuitePeople. Functional HCM bundled with the suite; not flagship-tier vs Workday or SuccessFactors." },
    { domain_code: "PAYROLL",  coverage_level: "secondary", notes: "SuitePeople Payroll (US only). Limited international payroll coverage." },
    { domain_code: "SUB-MGMT", coverage_level: "primary",   notes: "SuiteBilling. Multi-element revenue recognition is a NetSuite strength among ERP-bundled subscription billing." },
    { domain_code: "EPM",      coverage_level: "secondary", notes: "NetSuite Planning and Budgeting (PBCS-shaped). Functional EPM bundled with the suite; not flagship vs Anaplan or Oracle Cloud EPM." },
    { domain_code: "S2P",      coverage_level: "secondary", notes: "NetSuite Procurement. Functional procurement module; not flagship vs Coupa or Ariba." },
    { domain_code: "AP-AUTO",  coverage_level: "secondary", notes: "NetSuite AP Automation (bundled). Functional vs Bill.com or Tipalti dedicated leaders." },
    { domain_code: "EXPENSE",  coverage_level: "secondary", notes: "NetSuite Expense Management (bundled). Functional vs SAP Concur or Ramp or Brex." },
    { domain_code: "FSM",      coverage_level: "secondary", notes: "NetSuite Field Service Management (Next Service acquisition, 2023). Positioned for NetSuite installed base." },
    { domain_code: "CPQ",      coverage_level: "secondary", notes: "NetSuite CPQ (Verenia acquisition). Functional CPQ for the NetSuite installed base." },
  ];

  // Resolve domain_ids.
  const domains = await get(`/domains?domain_code=in.(${netsuiteTargets.map(t => t.domain_code).join(",")})&select=id,domain_code`);
  const domainIdByCode = new Map<string, number>();
  for (const d of domains) domainIdByCode.set(String(d.domain_code), Number(d.id));

  // Read existing solution_domains for NetSuite to avoid duplicates.
  const existing = await get(`/solution_domains?solution_id=eq.${NETSUITE_SOLUTION_ID}&select=domain_id`);
  const existingDomainIds = new Set(existing.map(r => Number(r.domain_id)));

  const rowsToInsert: Row[] = [];
  for (const t of netsuiteTargets) {
    const domainId = domainIdByCode.get(t.domain_code);
    if (!domainId) {
      console.log(`  WARN: domain ${t.domain_code} not found, skipping`);
      continue;
    }
    if (existingDomainIds.has(domainId)) {
      console.log(`  ${t.domain_code}: solution_domains row already exists, skipping`);
      continue;
    }
    rowsToInsert.push({
      solution_id: NETSUITE_SOLUTION_ID,
      domain_id: domainId,
      coverage_level: t.coverage_level,
      notes: t.notes,
    });
  }

  if (rowsToInsert.length > 0) {
    console.log(`  inserting ${rowsToInsert.length} solution_domains rows for Oracle NetSuite`);
    await insert("/solution_domains", rowsToInsert);
  } else {
    console.log("  no new solution_domains rows needed");
  }
}

// ===================================================================
// Block 2 — INV-MGMT Phase A
// ===================================================================
async function loadInvMgmtPhaseA() {
  console.log("\n=== Block 2: INV-MGMT Phase A ===");

  // ---------- Domain ----------
  const invDomain = {
    domain_code: "INV-MGMT",
    domain_name: "Inventory Management",
    description: "SMB and mid-market multi-location stock control, lot and serial tracking, reorder rules, ABC classification, and stock-movement reconciliation. Distinct from WMS (warehouse execution: picking, packing, wave planning) and from SCP (demand forecasting, MRP). Pure-play vendors compete on multi-channel inventory visibility for digitally-native retailers, distributors, and light manufacturers that have outgrown spreadsheets but cannot justify enterprise WMS or full ERP.",
    crud_percentage: 92,
    business_logic: "Reorder-point calculation (on_hand + on_order, safety_stock vs reorder_point), ABC-XYZ classification using rolling demand variability, lot and serial cost-layering (FIFO, LIFO, weighted-average) at issue time, available-to-promise reservation logic, kit explosion at order time.",
    min_org_size: "20 s <500",
    cost_band: "$",
    certification_required: false,
    usa_market_size_usd_m: 1800,
    market_size_source_year: 2024,
  };
  validateDomainRow(invDomain);

  const existingDomain = await get(`/domains?domain_code=eq.INV-MGMT&select=id`);
  let invDomainId: number;
  if (existingDomain.length > 0) {
    invDomainId = Number(existingDomain[0].id);
    console.log(`  /domains INV-MGMT: already exists (id ${invDomainId})`);
  } else {
    const created = await insert("/domains", [invDomain]);
    invDomainId = Number(created[0].id);
    console.log(`  /domains INV-MGMT: created (id ${invDomainId})`);
  }

  // ---------- Vendors ----------
  const newVendors = [
    { vendor_name: "Cin7 Group", vendor_url: "https://www.cin7.com", headquarters_country: "New Zealand", description: "Cloud inventory management vendor for product sellers (Cin7 Core / Cin7 Omni)." },
    { vendor_name: "Fishbowl", vendor_url: "https://www.fishbowlinventory.com", headquarters_country: "USA", description: "Manufacturing and warehouse inventory vendor focused on the QuickBooks installed base." },
    { vendor_name: "Katana", vendor_url: "https://katanamrp.com", headquarters_country: "Estonia", description: "Cloud manufacturing and inventory platform aimed at small manufacturers and D2C brands." },
    { vendor_name: "Unleashed Software", vendor_url: "https://www.unleashedsoftware.com", headquarters_country: "New Zealand", description: "Cloud inventory management vendor; acquired by The Access Group in 2021." },
    { vendor_name: "Archon Systems", vendor_url: "https://www.inflowinventory.com", headquarters_country: "Canada", description: "Vendor of inFlow Inventory, a desktop-and-cloud SMB inventory platform." },
    { vendor_name: "Fulfil.IO", vendor_url: "https://www.fulfil.io", headquarters_country: "USA", description: "Multi-channel inventory and order management platform for direct-to-consumer brands." },
    { vendor_name: "Linnworks", vendor_url: "https://www.linnworks.com", headquarters_country: "UK", description: "Multichannel inventory and order management vendor; acquired by Marlin Equity Partners in 2024." },
    { vendor_name: "Ordoro", vendor_url: "https://www.ordoro.com", headquarters_country: "USA", description: "Shipping-and-inventory app for e-commerce sellers." },
    { vendor_name: "Finale Inventory", vendor_url: "https://www.finaleinventory.com", headquarters_country: "USA", description: "Cloud inventory management vendor for small-and-mid-market sellers and warehouses." },
    { vendor_name: "Sortly", vendor_url: "https://www.sortly.com", headquarters_country: "USA", description: "Mobile-first visual inventory tracking app for SMBs and field teams." },
    { vendor_name: "SOS Inventory", vendor_url: "https://www.sosinventory.com", headquarters_country: "USA", description: "QuickBooks Online add-on inventory, order management, and light manufacturing vendor." },
  ];
  const vendorIdByName = await syncTable("/vendors", newVendors, "vendor_name");
  // Pull existing reused vendors too.
  const allVendors = await get(`/vendors?vendor_name=in.("Cin7 Group","Fishbowl","Katana","Unleashed Software","Archon Systems","Fulfil.IO","Linnworks","Ordoro","Finale Inventory","Sortly","SOS Inventory","Oracle","Microsoft","SAP SE","Zoho Corporation","Sage Group")&select=id,vendor_name`);
  for (const v of allVendors) vendorIdByName.set(String(v.vendor_name), Number(v.id));

  // ---------- Solutions ----------
  const solutions = [
    { solution_name: "Cin7 Core",                          vendor_name: "Cin7 Group",        url: "https://www.cin7.com/cin7-core/",  desc: "Cloud inventory and order management for product sellers (formerly DEAR Systems)." },
    { solution_name: "Fishbowl Inventory",                 vendor_name: "Fishbowl",          url: "https://www.fishbowlinventory.com/products/fishbowl-warehouse", desc: "On-premise and cloud inventory and manufacturing for QuickBooks users." },
    { solution_name: "Katana Cloud Inventory",             vendor_name: "Katana",            url: "https://katanamrp.com",            desc: "Cloud manufacturing-and-inventory platform for small manufacturers and D2C brands." },
    { solution_name: "Unleashed Software",                 vendor_name: "Unleashed Software", url: "https://www.unleashedsoftware.com", desc: "Cloud inventory management with batch / serial tracking and multi-warehouse." },
    { solution_name: "inFlow Inventory",                   vendor_name: "Archon Systems",    url: "https://www.inflowinventory.com",  desc: "Desktop-and-cloud SMB inventory with mobile barcode app." },
    { solution_name: "Fulfil",                             vendor_name: "Fulfil.IO",         url: "https://www.fulfil.io",            desc: "Multi-channel inventory and order management for D2C brands." },
    { solution_name: "Linnworks",                          vendor_name: "Linnworks",         url: "https://www.linnworks.com",        desc: "Multichannel inventory, listings, and order management for online sellers." },
    { solution_name: "Brightpearl by Sage",                vendor_name: "Sage Group",        url: "https://www.brightpearl.com",      desc: "Retail operations platform with inventory at its core; acquired by Sage in 2022." },
    { solution_name: "Ordoro",                             vendor_name: "Ordoro",            url: "https://www.ordoro.com",           desc: "Shipping-first multichannel inventory and order management for e-commerce." },
    { solution_name: "Finale Inventory",                   vendor_name: "Finale Inventory",  url: "https://www.finaleinventory.com",  desc: "Cloud inventory for small-and-mid-market sellers and warehouses." },
    { solution_name: "Sortly",                             vendor_name: "Sortly",            url: "https://www.sortly.com",           desc: "Mobile-first visual inventory tracking with barcode and QR scanning." },
    { solution_name: "SOS Inventory",                      vendor_name: "SOS Inventory",     url: "https://www.sosinventory.com",     desc: "QuickBooks Online add-on for inventory, orders, and light manufacturing." },
    { solution_name: "Zoho Inventory",                     vendor_name: "Zoho Corporation",  url: "https://www.zoho.com/inventory/",  desc: "Cloud inventory management with multi-warehouse and channel integrations." },
    { solution_name: "Microsoft Dynamics 365 Business Central", vendor_name: "Microsoft",    url: "https://dynamics.microsoft.com/en-us/business-central/", desc: "SMB ERP suite with inventory management bundled." },
    { solution_name: "SAP Business One",                   vendor_name: "SAP SE",            url: "https://www.sap.com/products/business-one.html", desc: "SMB ERP with inventory management bundled." },
  ];
  const solutionRows: Row[] = solutions.map(s => ({
    solution_name: s.solution_name,
    vendor_id: vendorIdByName.get(s.vendor_name) ?? null,
    solution_url: s.url,
    description: s.desc,
  }));
  const solutionIdByName = await syncTable("/solutions", solutionRows, "solution_name");
  // Pull Oracle NetSuite id (273) for the secondary link.
  const ns = await get(`/solutions?solution_name=eq.Oracle%20NetSuite&select=id`);
  if (ns.length > 0) solutionIdByName.set("Oracle NetSuite", Number(ns[0].id));

  // ---------- solution_domains for INV-MGMT ----------
  type Coverage = "primary" | "secondary" | "partial";
  const solutionDomainEntries: Array<{ solution_name: string; coverage: Coverage; notes: string }> = [
    { solution_name: "Cin7 Core",                              coverage: "primary",   notes: "Cin7 Core is a flagship pure-play SMB inventory platform." },
    { solution_name: "Fishbowl Inventory",                     coverage: "primary",   notes: "Flagship inventory and light-manufacturing platform for the QuickBooks installed base." },
    { solution_name: "Katana Cloud Inventory",                 coverage: "primary",   notes: "Manufacturing-first inventory positioning; covers core INV-MGMT capabilities for small manufacturers." },
    { solution_name: "Unleashed Software",                     coverage: "primary",   notes: "Cloud inventory flagship; multi-warehouse, batch and serial." },
    { solution_name: "inFlow Inventory",                       coverage: "primary",   notes: "SMB inventory flagship with mobile barcode app." },
    { solution_name: "Fulfil",                                 coverage: "primary",   notes: "Multi-channel D2C inventory and OMS." },
    { solution_name: "Linnworks",                              coverage: "primary",   notes: "Multichannel inventory and order management." },
    { solution_name: "Brightpearl by Sage",                    coverage: "primary",   notes: "Retail operations platform with inventory at its core." },
    { solution_name: "Ordoro",                                 coverage: "secondary", notes: "Shipping-first positioning; inventory is supporting capability rather than the lead pitch." },
    { solution_name: "Finale Inventory",                       coverage: "primary",   notes: "Pure-play SMB inventory." },
    { solution_name: "Sortly",                                 coverage: "primary",   notes: "Visual inventory tracking flagship for SMBs and field teams." },
    { solution_name: "SOS Inventory",                          coverage: "primary",   notes: "QuickBooks-anchored SMB inventory flagship." },
    { solution_name: "Zoho Inventory",                         coverage: "primary",   notes: "Cloud inventory product within the Zoho suite." },
    { solution_name: "Microsoft Dynamics 365 Business Central", coverage: "secondary", notes: "Inventory bundled within the broader Business Central ERP suite." },
    { solution_name: "SAP Business One",                       coverage: "secondary", notes: "Inventory bundled within the SAP Business One SMB ERP suite." },
    { solution_name: "Oracle NetSuite",                        coverage: "secondary", notes: "NetSuite Inventory Management bundled within the NetSuite suite." },
  ];

  const existingSd = await get(`/solution_domains?domain_id=eq.${invDomainId}&select=solution_id`);
  const existingSdSolutionIds = new Set(existingSd.map(r => Number(r.solution_id)));
  const sdRowsToInsert: Row[] = [];
  for (const e of solutionDomainEntries) {
    const sid = solutionIdByName.get(e.solution_name);
    if (!sid) {
      console.log(`  WARN: solution ${e.solution_name} not found, skipping`);
      continue;
    }
    if (existingSdSolutionIds.has(sid)) continue;
    sdRowsToInsert.push({
      solution_id: sid,
      domain_id: invDomainId,
      coverage_level: e.coverage,
      notes: e.notes,
    });
  }
  if (sdRowsToInsert.length > 0) {
    console.log(`  /solution_domains: inserting ${sdRowsToInsert.length} new rows`);
    await insert("/solution_domains", sdRowsToInsert);
  } else {
    console.log("  /solution_domains: nothing new");
  }

  // ---------- Capabilities ----------
  const capabilities = [
    { capability_code: "INV-MULTI-LOC-STOCK",     capability_name: "Multi-Location Stock Visibility", description: "Real-time on-hand, reserved, and available-to-promise quantities across warehouses, stores, hubs, and 3PL locations from a single consolidated view." },
    { capability_code: "INV-LOT-SERIAL-TRACKING", capability_name: "Lot and Serial Tracking",         description: "Per-unit or per-batch lot and serial-number assignment, with downstream traceability for recall, expiry, and quality investigations." },
    { capability_code: "INV-REORDER-RULES",       capability_name: "Reorder Rules and Auto-Replenishment", description: "Item-level reorder-point and reorder-quantity rules that trigger replenishment suggestions or auto-generated purchase orders against suppliers or transfer requests against sister warehouses." },
    { capability_code: "INV-ABC-XYZ-CLASS",       capability_name: "ABC-XYZ Classification",          description: "Periodic classification of SKUs by revenue contribution (ABC) and demand variability (XYZ), driving differentiated cycle-count frequency and safety-stock policy." },
    { capability_code: "INV-CYCLE-COUNTS",        capability_name: "Cycle Counts and Inventory Adjustments", description: "Scheduled and ad-hoc cycle counts with variance review, root-cause coding, and posted adjustments that update on-hand and trigger accounting entries." },
    { capability_code: "INV-STOCK-TRANSFERS",     capability_name: "Inter-Location Stock Transfers",  description: "Inter-warehouse transfers with in-transit tracking, expected receipt date, and discrepancy resolution on receipt." },
    { capability_code: "INV-AVAILABLE-TO-PROMISE", capability_name: "Available-to-Promise Calculation", description: "Real-time ATP computation factoring on-hand, reserved, in-transit, and inbound POs against committed demand, exposing reliable promise dates to OMS and CRM consumers." },
    { capability_code: "INV-KITTING-ASSEMBLY",    capability_name: "Kitting and Light Assembly",      description: "Define kit-of-SKUs bills and explode kits at order or production time, with finished-kit on-hand maintained against component on-hand." },
  ];
  const capabilityIdByCode = await syncTable("/capabilities", capabilities, "capability_code");

  // ---------- capability_domains ----------
  const existingCd = await get(`/capability_domains?domain_id=eq.${invDomainId}&select=capability_id`);
  const existingCdIds = new Set(existingCd.map(r => Number(r.capability_id)));
  const cdToInsert: Row[] = capabilities
    .map(c => capabilityIdByCode.get(c.capability_code)!)
    .filter(cid => !existingCdIds.has(cid))
    .map(cid => ({ capability_id: cid, domain_id: invDomainId }));
  if (cdToInsert.length > 0) {
    console.log(`  /capability_domains: inserting ${cdToInsert.length} new rows`);
    await insert("/capability_domains", cdToInsert);
  } else {
    console.log("  /capability_domains: nothing new");
  }

  // ---------- domain_modules ----------
  const modules = [
    { domain_module_code: "INV-CORE-STOCK",    domain_module_name: "Core Stock Tracking",                description: "Items, balances, lot and serial tracking, stock movements, transfers, and cycle counts. The deployable base module of INV-MGMT." },
    { domain_module_code: "INV-REPLENISHMENT", domain_module_name: "Replenishment and Reorder Automation", description: "Reorder rules, ABC-XYZ classification, and available-to-promise calculation. Layered on top of Core Stock to drive automated replenishment." },
    { domain_module_code: "INV-KITTING",       domain_module_name: "Kitting and Light Assembly",         description: "Kit definitions, kit explosion at order or production time, and finished-kit on-hand maintenance. Add-on for sellers with bundled-SKU or light-manufacturing flows." },
  ];
  const moduleRows: Row[] = modules.map(m => ({ ...m, domain_id: invDomainId }));
  const moduleIdByCode = await syncTable("/domain_modules", moduleRows, "domain_module_code");

  // ---------- domain_module_capabilities ----------
  const moduleCapabilityMap: Array<[string, string[]]> = [
    ["INV-CORE-STOCK",    ["INV-MULTI-LOC-STOCK", "INV-LOT-SERIAL-TRACKING", "INV-CYCLE-COUNTS", "INV-STOCK-TRANSFERS"]],
    ["INV-REPLENISHMENT", ["INV-REORDER-RULES", "INV-ABC-XYZ-CLASS", "INV-AVAILABLE-TO-PROMISE"]],
    ["INV-KITTING",       ["INV-KITTING-ASSEMBLY"]],
  ];
  const moduleIds = modules.map(m => moduleIdByCode.get(m.domain_module_code)!);
  const existingDmc = await get(`/domain_module_capabilities?domain_module_id=in.(${moduleIds.join(",")})&select=domain_module_id,capability_id`);
  const existingDmcKeys = new Set(existingDmc.map(r => `${r.domain_module_id}:${r.capability_id}`));
  const dmcToInsert: Row[] = [];
  for (const [moduleCode, capCodes] of moduleCapabilityMap) {
    const mid = moduleIdByCode.get(moduleCode)!;
    for (const cc of capCodes) {
      const cid = capabilityIdByCode.get(cc)!;
      if (!existingDmcKeys.has(`${mid}:${cid}`)) {
        dmcToInsert.push({ domain_module_id: mid, capability_id: cid });
      }
    }
  }
  if (dmcToInsert.length > 0) {
    console.log(`  /domain_module_capabilities: inserting ${dmcToInsert.length} new rows`);
    await insert("/domain_module_capabilities", dmcToInsert);
  } else {
    console.log("  /domain_module_capabilities: nothing new");
  }

  // ---------- domain_starter_modules ----------
  const starterEntries: Array<{ module_code: string; position: number; notes: string }> = [
    { module_code: "INV-CORE-STOCK",    position: 1, notes: "Start here. Items, balances, lot and serial tracking, transfers, and cycle counts cover the day-one inventory operating model." },
    { module_code: "INV-REPLENISHMENT", position: 2, notes: "Layer on once Core Stock is in production: reorder rules, ABC-XYZ, and ATP automate replenishment and outbound promising." },
    { module_code: "INV-KITTING",       position: 3, notes: "Add when bundled SKUs or light assembly become material to the catalog or the operation." },
  ];
  const existingStarter = await get(`/domain_starter_modules?domain_id=eq.${invDomainId}&select=domain_module_id`);
  const existingStarterIds = new Set(existingStarter.map(r => Number(r.domain_module_id)));
  const starterToInsert: Row[] = [];
  for (const s of starterEntries) {
    const mid = moduleIdByCode.get(s.module_code)!;
    if (existingStarterIds.has(mid)) continue;
    starterToInsert.push({ domain_id: invDomainId, domain_module_id: mid, position: s.position, notes: s.notes });
  }
  if (starterToInsert.length > 0) {
    console.log(`  /domain_starter_modules: inserting ${starterToInsert.length} new rows`);
    await insert("/domain_starter_modules", starterToInsert);
  } else {
    console.log("  /domain_starter_modules: nothing new");
  }

  console.log(`\n  INV-MGMT id = ${invDomainId}`);
}

// ===================================================================
// Main
// ===================================================================
async function main() {
  await loadNetSuiteExtension();
  await loadInvMgmtPhaseA();

  // Post-load audit: Rule #8 sanity check on every domain inserted in this run.
  console.log("\n=== Post-load Rule #8 audit (any domain with zeros from this load?) ===");
  const zeros = await get(`/domains?or=(crud_percentage.eq.0,usa_market_size_usd_m.eq.0,market_size_source_year.eq.0,min_org_size.eq.,cost_band.eq.)&select=id,domain_code&order=id.desc&limit=50`);
  console.log(`  ${zeros.length} domains catalog-wide with zeros (any from this load is a fail):`);
  for (const z of zeros) console.log(`    id ${z.id}  ${z.domain_code}`);

  console.log("\nDone.");
  console.log("UI links:");
  console.log("  https://tests.semantius.app/domain_map/domains");
  console.log("  https://tests.semantius.app/domain_map/capabilities");
  console.log("  https://tests.semantius.app/domain_map/domain_modules");
  console.log("  https://tests.semantius.app/domain_map/solution_domains");
  console.log("  https://tests.semantius.app/domain_map/vendors");
  console.log("  https://tests.semantius.app/domain_map/solutions");
}

await main();
