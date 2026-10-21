#!/usr/bin/env bun
// Phase A loader for Library Management (LIB-MGMT).
// Loads: domain, capabilities, capability_domains, domain_modules, domain_module_capabilities,
// vendors, solutions, solution_domains.
// Idempotent against natural keys.

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
    console.log(`  ${path}: ${existing.length} already present, nothing to insert`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// ============================================================
// Phase A.0 — domain
// ============================================================

const domainSpec = {
  domain_code: "LIB-MGMT",
  domain_name: "Library Management",
  description:
    "Software that manages physical and digital library collections, member services, circulation, acquisitions, cataloging, and discovery for public, academic, special, and school libraries.",
  crud_percentage: 80,
  business_logic:
    "Bibliographic record matching against external authority files (Library of Congress, OCLC, VIAF), circulation rules engine (loan periods by patron-type and item-type, renewal limits, fine accrual, holds queue priority and trapping), Z39.50, SIP2, and NCIP protocol handling for self-check kiosks and resource sharing, MARC21 and BIBFRAME format translation and validation.",
  min_org_size: "20 s <500",
  cost_band: "$$",
  certification_required: false,
  usa_market_size_usd_m: 700,
  market_size_source_year: 2024,
};

function validateDomainRow(d: typeof domainSpec): void {
  if (d.crud_percentage === 0) throw new Error("crud_percentage required");
  if (!d.min_org_size) throw new Error("min_org_size required");
  if (!d.cost_band) throw new Error("cost_band required");
  if (!d.usa_market_size_usd_m) throw new Error("usa_market_size_usd_m required");
  if (!d.market_size_source_year) throw new Error("market_size_source_year required");
  if (d.business_logic === "" && d.crud_percentage < 95)
    throw new Error("business_logic required when crud_percentage < 95");
}

// ============================================================
// Phase A.1 — capabilities
// ============================================================

const capabilities = [
  {
    capability_code: "LIB-CIRCULATION",
    capability_name: "Circulation Management",
    description:
      "Check-out, check-in, holds, renewals, and fines management for circulating library materials.",
  },
  {
    capability_code: "LIB-CATALOGING",
    capability_name: "Cataloging and Metadata Management",
    description:
      "Authoring, importing, and maintaining bibliographic, authority, and holdings records in MARC21 or BIBFRAME, including authority control against external files.",
  },
  {
    capability_code: "LIB-ACQUISITIONS",
    capability_name: "Acquisitions and Collection Development",
    description:
      "Ordering, receiving, and invoicing of library materials from book vendors, including approval plans, firm orders, and EDI integration.",
  },
  {
    capability_code: "LIB-PATRON-MGMT",
    capability_name: "Patron Management",
    description:
      "Registration, profile management, and lifecycle of library members including patron categories, privileges, and card issuance.",
  },
  {
    capability_code: "LIB-DISCOVERY",
    capability_name: "Discovery and OPAC",
    description:
      "Public-facing search and browse experience over the library catalog and licensed resources, including faceted search, holdings display, and self-service holds.",
  },
  {
    capability_code: "LIB-SERIALS",
    capability_name: "Serials and Continuing Resources",
    description:
      "Subscription management, check-in, claiming, and binding workflows for periodicals and other continuing resources.",
  },
  {
    capability_code: "LIB-ERESOURCE",
    capability_name: "Electronic Resource Management",
    description:
      "License tracking, access management, usage statistics, and renewal workflows for ebook, ejournal, and database subscriptions.",
  },
  {
    capability_code: "LIB-ILL",
    capability_name: "Interlibrary Loan and Resource Sharing",
    description:
      "Borrowing and lending of materials between libraries, including request routing, status tracking, and resource sharing consortia management.",
  },
];

// ============================================================
// Phase A.2 — domain_modules
// ============================================================

const domainModules = [
  {
    domain_module_code: "LIB-CATALOG",
    domain_module_name: "Cataloging and Metadata",
    description:
      "Authoring and maintenance of bibliographic, authority, and holdings records for all library materials regardless of medium. Owns the catalog substrate every other library module reads from.",
    module_kind: "full",
  },
  {
    domain_module_code: "LIB-CIRCULATION",
    domain_module_name: "Circulation Operations",
    description:
      "Daily circulation activity: check-out, check-in, renewals, holds, fines, and circulation policy administration. The most patron-facing operations module.",
    module_kind: "full",
  },
  {
    domain_module_code: "LIB-PATRON",
    domain_module_name: "Patron Management",
    description:
      "Library member registration, profile maintenance, patron category administration, and card issuance.",
    module_kind: "full",
  },
  {
    domain_module_code: "LIB-ACQUISITIONS",
    domain_module_name: "Acquisitions and Electronic Resources",
    description:
      "Ordering and receiving of physical materials, serials subscription management, and electronic resource license management.",
    module_kind: "full",
  },
  {
    domain_module_code: "LIB-DISCOVERY",
    domain_module_name: "Discovery and OPAC",
    description:
      "Public-facing catalog search and browse interface, faceted search over bibliographic and holdings data, saved searches, and reading lists.",
    module_kind: "full",
  },
  {
    domain_module_code: "LIB-ILL",
    domain_module_name: "Interlibrary Loan",
    description:
      "Borrowing and lending workflows between libraries, request routing, and resource sharing partner management.",
    module_kind: "full",
  },
];

// ============================================================
// Phase A.3 — domain_module_capabilities mapping
// ============================================================

const moduleCapabilityMap: Array<{ module: string; capability: string }> = [
  { module: "LIB-CATALOG", capability: "LIB-CATALOGING" },
  { module: "LIB-CIRCULATION", capability: "LIB-CIRCULATION" },
  { module: "LIB-PATRON", capability: "LIB-PATRON-MGMT" },
  { module: "LIB-ACQUISITIONS", capability: "LIB-ACQUISITIONS" },
  { module: "LIB-ACQUISITIONS", capability: "LIB-SERIALS" },
  { module: "LIB-ACQUISITIONS", capability: "LIB-ERESOURCE" },
  { module: "LIB-DISCOVERY", capability: "LIB-DISCOVERY" },
  { module: "LIB-ILL", capability: "LIB-ILL" },
];

// ============================================================
// Phase A.4 — vendors + solutions
// ============================================================

const vendors = [
  {
    vendor_name: "Clarivate",
    vendor_url: "https://clarivate.com",
    headquarters_country: "USA",
    description:
      "Information and analytics vendor; owner of Ex Libris and Innovative Interfaces (library systems portfolio: Alma, Aleph, Primo, Sierra, Polaris).",
  },
  {
    vendor_name: "SirsiDynix",
    vendor_url: "https://www.sirsidynix.com",
    headquarters_country: "USA",
    description:
      "Integrated library system vendor for public and academic libraries (Symphony, Horizon, BLUEcloud).",
  },
  {
    vendor_name: "OCLC",
    vendor_url: "https://www.oclc.org",
    headquarters_country: "USA",
    description:
      "Library cooperative providing shared cataloging, resource sharing, and library services platform (WorldShare, WorldCat).",
  },
  {
    vendor_name: "EBSCO Information Services",
    vendor_url: "https://www.ebsco.com",
    headquarters_country: "USA",
    description:
      "Library and research information vendor; primary commercial backer of open-source FOLIO library services platform.",
  },
  {
    vendor_name: "ByWater Solutions",
    vendor_url: "https://bywatersolutions.com",
    headquarters_country: "USA",
    description:
      "Open-source library systems support vendor providing implementation and hosting for Koha and FOLIO.",
  },
  {
    vendor_name: "Civica",
    vendor_url: "https://www.civica.com",
    headquarters_country: "UK",
    description:
      "Public-sector software vendor with library management offering Spydus serving public libraries internationally.",
  },
  {
    vendor_name: "Follett Software",
    vendor_url: "https://www.follettsoftware.com",
    headquarters_country: "USA",
    description: "School library management software vendor (Destiny Library Manager).",
  },
  {
    vendor_name: "Biblionix",
    vendor_url: "https://www.biblionix.com",
    headquarters_country: "USA",
    description:
      "Cloud-hosted library management vendor focused on small and mid-size public libraries (Apollo).",
  },
];

const solutions: Array<{
  solution_name: string;
  vendor_name: string;
  description: string;
  solution_url?: string;
  coverage_level: "primary" | "secondary" | "partial";
}> = [
  {
    solution_name: "Ex Libris Alma",
    vendor_name: "Clarivate",
    description:
      "Cloud-based library services platform managing print, electronic, and digital resources for academic and research libraries.",
    solution_url: "https://exlibrisgroup.com/products/alma-library-services-platform/",
    coverage_level: "primary",
  },
  {
    solution_name: "SirsiDynix BLUEcloud LSP",
    vendor_name: "SirsiDynix",
    description:
      "Library services platform with circulation, cataloging, acquisitions, and discovery modules for public and academic libraries.",
    solution_url: "https://www.sirsidynix.com/bluecloud-lsp/",
    coverage_level: "primary",
  },
  {
    solution_name: "OCLC WorldShare Management Services",
    vendor_name: "OCLC",
    description:
      "Cloud-based library services platform built on shared WorldCat metadata for academic, public, and special libraries.",
    solution_url: "https://www.oclc.org/en/worldshare-management-services.html",
    coverage_level: "primary",
  },
  {
    solution_name: "FOLIO (EBSCO)",
    vendor_name: "EBSCO Information Services",
    description:
      "Open-source library services platform with EBSCO providing commercial hosting and support; covers cataloging, circulation, acquisitions, and ERM.",
    solution_url: "https://www.ebsco.com/products/folio-library-services-platform",
    coverage_level: "primary",
  },
  {
    solution_name: "Koha (ByWater)",
    vendor_name: "ByWater Solutions",
    description:
      "Open-source integrated library system supported by ByWater Solutions; widely deployed across public, academic, and special libraries.",
    solution_url: "https://bywatersolutions.com/projects/koha-open-source-library-system",
    coverage_level: "primary",
  },
  {
    solution_name: "Civica Spydus",
    vendor_name: "Civica",
    description:
      "Integrated library management system for public libraries with discovery, circulation, and digital library features.",
    solution_url: "https://www.civica.com/en-gb/product-names/spydus/",
    coverage_level: "primary",
  },
  {
    solution_name: "Follett Destiny",
    vendor_name: "Follett Software",
    description:
      "Library management system designed for K-12 school libraries; integrated with school SIS platforms.",
    solution_url: "https://www.follettsoftware.com/destiny-library-manager",
    coverage_level: "primary",
  },
  {
    solution_name: "Biblionix Apollo",
    vendor_name: "Biblionix",
    description:
      "Cloud-hosted integrated library system optimized for small and mid-size public libraries.",
    solution_url: "https://www.biblionix.com/apollo/",
    coverage_level: "primary",
  },
];

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  console.log("=== Phase A: LIB-MGMT ===\n");

  validateDomainRow(domainSpec);

  // Domain
  console.log("Step 1: domains");
  const existingDom = await get(
    `/domains?domain_code=eq.${encodeURIComponent(domainSpec.domain_code)}&select=id`,
  );
  let domainId: number;
  if (existingDom.length > 0) {
    domainId = Number(existingDom[0].id);
    console.log(`  LIB-MGMT already exists at id=${domainId}`);
  } else {
    const inserted = await insert("/domains", [domainSpec]);
    domainId = Number(inserted[0].id);
    console.log(`  inserted LIB-MGMT at id=${domainId}`);
  }

  // Capabilities
  console.log("\nStep 2: capabilities");
  const capMap = await syncByKey("/capabilities", capabilities, "capability_code");

  // capability_domains
  console.log("\nStep 3: capability_domains");
  const existingCapDom = await get(
    `/capability_domains?domain_id=eq.${domainId}&select=capability_id`,
  );
  const haveCapDom = new Set(existingCapDom.map(r => Number(r.capability_id)));
  const capDomRows = capabilities
    .map(c => ({ capability_id: capMap.get(c.capability_code)!, domain_id: domainId }))
    .filter(r => !haveCapDom.has(r.capability_id));
  if (capDomRows.length > 0) {
    await insert("/capability_domains", capDomRows);
    console.log(`  inserted ${capDomRows.length} capability_domains rows`);
  } else {
    console.log("  all capability_domains already present");
  }

  // Domain modules
  console.log("\nStep 4: domain_modules");
  const modulePayload = domainModules.map(m => ({ ...m, domain_id: domainId }));
  const modMap = await syncByKey("/domain_modules", modulePayload, "domain_module_code");

  // domain_module_capabilities
  console.log("\nStep 5: domain_module_capabilities");
  const existingModCap = await get(
    `/domain_module_capabilities?domain_module_id=in.(${[...modMap.values()].join(",")})&select=domain_module_id,capability_id`,
  );
  const haveModCap = new Set(
    existingModCap.map(r => `${r.domain_module_id}|${r.capability_id}`),
  );
  const modCapRows = moduleCapabilityMap
    .map(({ module, capability }) => ({
      domain_module_id: modMap.get(module)!,
      capability_id: capMap.get(capability)!,
    }))
    .filter(r => !haveModCap.has(`${r.domain_module_id}|${r.capability_id}`));
  if (modCapRows.length > 0) {
    await insert("/domain_module_capabilities", modCapRows);
    console.log(`  inserted ${modCapRows.length} domain_module_capabilities rows`);
  } else {
    console.log("  all domain_module_capabilities already present");
  }

  // Vendors
  console.log("\nStep 6: vendors");
  const vendorMap = await syncByKey("/vendors", vendors, "vendor_name");

  // Solutions
  console.log("\nStep 7: solutions");
  const solutionPayload = solutions.map(s => ({
    solution_name: s.solution_name,
    description: s.description,
    solution_url: s.solution_url,
    vendor_id: vendorMap.get(s.vendor_name)!,
    solution_kind: "standard_solution",
  }));
  const solMap = await syncByKey("/solutions", solutionPayload, "solution_name");

  // solution_domains
  console.log("\nStep 8: solution_domains");
  const existingSolDom = await get(
    `/solution_domains?domain_id=eq.${domainId}&select=solution_id`,
  );
  const haveSolDom = new Set(existingSolDom.map(r => Number(r.solution_id)));
  const solDomRows = solutions
    .map(s => ({
      solution_id: solMap.get(s.solution_name)!,
      domain_id: domainId,
      coverage_level: s.coverage_level,
    }))
    .filter(r => !haveSolDom.has(r.solution_id));
  if (solDomRows.length > 0) {
    await insert("/solution_domains", solDomRows);
    console.log(`  inserted ${solDomRows.length} solution_domains rows`);
  } else {
    console.log("  all solution_domains already present");
  }

  // Summary
  console.log("\n=== Phase A complete ===");
  const summary = {
    domain_id: domainId,
    capabilities: capMap.size,
    domain_modules: modMap.size,
    vendors: vendorMap.size,
    solutions: solMap.size,
  };
  console.log(JSON.stringify(summary, null, 2));

  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/domains");
  console.log("  https://tests.semantius.app/domain_map/capabilities");
  console.log("  https://tests.semantius.app/domain_map/domain_modules");
  console.log("  https://tests.semantius.app/domain_map/solutions");
  console.log(
    `  https://tests.semantius.app/domain_map/solution_domains?domain_id=eq.${domainId}`,
  );
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
