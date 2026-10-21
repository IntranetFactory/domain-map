#!/usr/bin/env bun
// Phase A + Phase C load for SEM (Strategy Execution Management).
// Idempotent: reads natural keys, inserts missing, re-reads for id maps.
// Rule #6: invoke from project root only.

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(), new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius failed (${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });

async function insert(path: string, rows: Row[]): Promise<void> {
  if (rows.length === 0) return;
  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) });
  }
}

async function syncByKey<T extends Row>(
  path: string, rows: T[], keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const have = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !have.has(String(r[keyField])));
  if (missing.length) {
    console.log(`  ${path}: inserting ${missing.length} new (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: all ${existing.length} present`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// Rule #8 — fail loud on missing metadata fields.
function validateDomainRow(r: Row): void {
  const cp = Number(r.crud_percentage ?? 0);
  if (cp === 0) throw new Error(`crud_percentage missing on ${r.domain_code}`);
  if (!r.min_org_size) throw new Error(`min_org_size missing on ${r.domain_code}`);
  if (!r.cost_band) throw new Error(`cost_band missing on ${r.domain_code}`);
  if (cp < 95 && !r.business_logic) throw new Error(`business_logic missing on ${r.domain_code} (crud_percentage<95)`);
  if (Number(r.usa_market_size_usd_m ?? 0) === 0) throw new Error(`usa_market_size_usd_m missing on ${r.domain_code}`);
  if (Number(r.market_size_source_year ?? 0) === 0) throw new Error(`market_size_source_year missing on ${r.domain_code}`);
}

// ============================================================
// 1) DOMAIN
// ============================================================
const semDomain = {
  domain_code: "SEM",
  domain_name: "Strategy Execution Management",
  description: "Strategy-office software for defining strategic objectives, cascading them through the org, tracking strategic initiatives, running operating cadences (QBRs/MBRs), and maintaining traceability from execution back to strategy. Bought by Chief of Staff / Chief Strategy Officer / Strategy Office, distinct from HR-led Talent Management (performance reviews + goals bundled with HCM), from PMO-led Strategic Portfolio Management (IT/agile portfolio delivery), and from finance-led Enterprise Performance Management (budgeting). Pure-play vendors: Cascade, ClearPoint Strategy, AchieveIt, Quantive, WorkBoard, Profit.co, i-nexus, Spider Impact, Envisio. Microsoft Viva Goals competes via the Microsoft suite.",
  crud_percentage: 80,
  business_logic: "Weighted progress rollup across multi-level strategy hierarchies, AI-generated narrative summaries for executive reviews, anomaly detection on goal drift, and cross-initiative dependency impact analysis.",
  min_org_size: "30 m <2500",
  cost_band: "$$$",
  certification_required: false,
  usa_market_size_usd_m: 600,
  market_size_source_year: 2024,
};
validateDomainRow(semDomain);

console.log("== 1) domain ==");
const domainMap = await syncByKey("/domains", [semDomain], "domain_code");
const SEM_ID = domainMap.get("SEM")!;
const TALENT_MGMT_ID = 58;
const WORK_MGMT_ID = 135;
const PROD_MGMT_ID = 101;
const SPM_ID = 9;
const GOAL_MGMT_CAP_ID = 25;

// ============================================================
// 2) CAPABILITIES (6 new)
// ============================================================
const newCapabilities = [
  { capability_code: "SEM-OBJECTIVES", capability_name: "Strategic Objective Definition", description: "Definition and cascading of multi-year and annual strategic objectives down through org levels, with owner assignment, weighting, and progress measurement." },
  { capability_code: "SEM-STRATEGY-MAPS", capability_name: "Strategy Map Visualization", description: "Balanced-scorecard and strategy-house visualization linking strategic pillars to objectives, initiatives, and measures across financial, customer, process, and learning perspectives." },
  { capability_code: "SEM-INITIATIVES", capability_name: "Strategic Initiative Tracking", description: "Cross-functional strategic initiative registers with sponsor, owner, milestones, RAID logs, status reporting, and impact attribution to strategic objectives." },
  { capability_code: "SEM-OPERATING-CADENCE", capability_name: "Operating Cadence Management", description: "Orchestration of QBR, MBR, and weekly business review cadences with agenda templates, structured commentary capture, action-item tracking, and decision logs." },
  { capability_code: "SEM-TRACEABILITY", capability_name: "Strategy-to-Execution Traceability", description: "Bidirectional traceability between execution work (initiatives, OKRs, projects) and strategic intent, enabling drill-down from board-level objectives to operational deliverables and rollup in the reverse direction." },
  { capability_code: "SEM-PORTFOLIO-ALIGN", capability_name: "Investment Alignment to Strategy", description: "Capacity, headcount, and budget allocation traced to strategic priorities. Overlaps Strategic Portfolio Management where present, the SEM lens is strategy-office-led, the SPM lens is PMO-led." },
];

console.log("== 2) capabilities ==");
const capMap = await syncByKey("/capabilities", newCapabilities, "capability_code");

// ============================================================
// 3) capability_domains — 6 new caps linked to SEM + cross-cutting promotions
// ============================================================
console.log("== 3) capability_domains ==");
const cdExisting = await get("/capability_domains?select=capability_id,domain_id&limit=20000");
const cdSet = new Set(cdExisting.map(r => `${r.capability_id}:${r.domain_id}`));

const cdRows: Row[] = [];
const addCD = (capId: number, domId: number, notes: string = "") => {
  const k = `${capId}:${domId}`;
  if (!cdSet.has(k)) {
    cdSet.add(k);
    cdRows.push({ capability_id: capId, domain_id: domId, notes });
  }
};

// 6 new SEM capabilities -> SEM domain
for (const code of ["SEM-OBJECTIVES", "SEM-STRATEGY-MAPS", "SEM-INITIATIVES", "SEM-OPERATING-CADENCE", "SEM-TRACEABILITY", "SEM-PORTFOLIO-ALIGN"]) {
  addCD(capMap.get(code)!, SEM_ID);
}
// Cross-cutting: SEM-PORTFOLIO-ALIGN -> SPM (strategy-office view + PMO view of the same investment alignment)
addCD(capMap.get("SEM-PORTFOLIO-ALIGN")!, SPM_ID, "PMO-led view of investment alignment, the SEM lens is strategy-office-led.");
// Cross-cutting: GOAL-MGMT (existing, currently only on TALENT-MGMT) -> SEM, WORK-MGMT, PROD-MGMT
addCD(GOAL_MGMT_CAP_ID, SEM_ID, "Strategy-office goal cascading layer.");
addCD(GOAL_MGMT_CAP_ID, WORK_MGMT_ID, "Team-level OKR tracking inside work-management platforms (Asana Goals, Monday).");
addCD(GOAL_MGMT_CAP_ID, PROD_MGMT_ID, "Product-team OKR linkage to roadmap and features.");

if (cdRows.length) {
  console.log(`  inserting ${cdRows.length} new capability_domains rows`);
  await insert("/capability_domains", cdRows);
} else console.log("  all capability_domains rows present");

// ============================================================
// 4) VENDORS (9 new, 4 reused)
// ============================================================
const newVendors = [
  { vendor_name: "Cascade Strategy", vendor_url: "https://www.cascade.app", headquarters_country: "Australia", description: "Pure-play strategy-execution-management platform vendor." },
  { vendor_name: "ClearPoint Strategy", vendor_url: "https://www.clearpointstrategy.com", headquarters_country: "USA", description: "Balanced-scorecard and strategy-execution platform vendor for public sector and enterprise." },
  { vendor_name: "AchieveIt", vendor_url: "https://www.achieveit.com", headquarters_country: "USA", description: "Strategy-execution-management vendor focused on operating-plan deployment." },
  { vendor_name: "Quantive", vendor_url: "https://www.quantive.com", headquarters_country: "USA", description: "OKR-and-strategy-execution vendor (formerly Gtmhub)." },
  { vendor_name: "WorkBoard", vendor_url: "https://www.workboard.com", headquarters_country: "USA", description: "Enterprise OKR and strategy-execution platform vendor." },
  { vendor_name: "Profit.co", vendor_url: "https://www.profit.co", headquarters_country: "USA", description: "OKR and performance-management platform vendor." },
  { vendor_name: "i-nexus", vendor_url: "https://www.i-nexus.com", headquarters_country: "United Kingdom", description: "Strategy-execution platform vendor focused on Hoshin Kanri and policy deployment." },
  { vendor_name: "Spider Strategies", vendor_url: "https://www.spiderstrategies.com", headquarters_country: "USA", description: "Vendor of Spider Impact balanced-scorecard and strategy-execution software." },
  { vendor_name: "Envisio", vendor_url: "https://envisio.com", headquarters_country: "Canada", description: "Strategy-execution platform vendor focused on local government and public-sector planning." },
];

console.log("== 4) vendors ==");
const vendorMap = await syncByKey("/vendors", newVendors, "vendor_name");

// Pull ids for reused vendors
const reusedVendors = await get("/vendors?vendor_name=in.(Lattice,15Five,Leapsome,Microsoft)&select=id,vendor_name");
for (const v of reusedVendors) vendorMap.set(String(v.vendor_name), Number(v.id));

// ============================================================
// 5) SOLUTIONS (13)
// ============================================================
const solutions = [
  { solution_name: "Cascade", vendor_name: "Cascade Strategy", description: "Strategy-execution-management platform with strategy maps, OKRs, initiatives, and reporting.", solution_url: "https://www.cascade.app" },
  { solution_name: "ClearPoint Strategy", vendor_name: "ClearPoint Strategy", description: "Balanced-scorecard and strategy-execution platform with reporting and discussion threads.", solution_url: "https://www.clearpointstrategy.com" },
  { solution_name: "AchieveIt", vendor_name: "AchieveIt", description: "Plan-execution platform for cascading strategic plans into accountable execution.", solution_url: "https://www.achieveit.com" },
  { solution_name: "Quantive Results", vendor_name: "Quantive", description: "OKR-led strategy-execution platform with AI-assisted goal authoring and progress narratives.", solution_url: "https://www.quantive.com/results" },
  { solution_name: "WorkBoard", vendor_name: "WorkBoard", description: "Enterprise OKR and operating-cadence platform for strategy-office orchestration.", solution_url: "https://www.workboard.com" },
  { solution_name: "Profit.co", vendor_name: "Profit.co", description: "OKR, performance-review, and task-management platform.", solution_url: "https://www.profit.co" },
  { solution_name: "i-nexus", vendor_name: "i-nexus", description: "Hoshin Kanri and strategy-deployment platform with X-matrix and catchball cascading.", solution_url: "https://www.i-nexus.com" },
  { solution_name: "Spider Impact", vendor_name: "Spider Strategies", description: "Balanced-scorecard and KPI-management software with strategy maps.", solution_url: "https://www.spiderstrategies.com" },
  { solution_name: "Envisio", vendor_name: "Envisio", description: "Strategy-execution and reporting platform for public-sector and municipal planning.", solution_url: "https://envisio.com" },
  { solution_name: "Microsoft Viva Goals", vendor_name: "Microsoft", description: "OKR-management product in the Microsoft Viva suite (formerly Ally.io).", solution_url: "https://www.microsoft.com/microsoft-viva/goals" },
  { solution_name: "Lattice", vendor_name: "Lattice", description: "Performance, engagement, and OKR platform for HR-led talent management.", solution_url: "https://lattice.com" },
  { solution_name: "15Five", vendor_name: "15Five", description: "Performance-management and engagement platform with OKR and continuous-feedback features.", solution_url: "https://www.15five.com" },
  { solution_name: "Leapsome", vendor_name: "Leapsome", description: "People-enablement platform covering reviews, OKRs, engagement, and learning.", solution_url: "https://www.leapsome.com" },
];

console.log("== 5) solutions ==");
const solutionRows = solutions.map(s => {
  const vendor_id = vendorMap.get(s.vendor_name);
  if (!vendor_id) throw new Error(`vendor not found: ${s.vendor_name}`);
  return { solution_name: s.solution_name, description: s.description, solution_url: s.solution_url, vendor_id };
});
const solMap = await syncByKey("/solutions", solutionRows, "solution_name");

// ============================================================
// 6) solution_domains (13)
// ============================================================
console.log("== 6) solution_domains ==");
const sdExisting = await get("/solution_domains?select=solution_id,domain_id&limit=20000");
const sdSet = new Set(sdExisting.map(r => `${r.solution_id}:${r.domain_id}`));

const sdCoverage: Array<{ solution_name: string; coverage_level: string }> = [
  { solution_name: "Cascade", coverage_level: "primary" },
  { solution_name: "ClearPoint Strategy", coverage_level: "primary" },
  { solution_name: "AchieveIt", coverage_level: "primary" },
  { solution_name: "Quantive Results", coverage_level: "primary" },
  { solution_name: "WorkBoard", coverage_level: "primary" },
  { solution_name: "Profit.co", coverage_level: "primary" },
  { solution_name: "i-nexus", coverage_level: "primary" },
  { solution_name: "Spider Impact", coverage_level: "primary" },
  { solution_name: "Envisio", coverage_level: "primary" },
  { solution_name: "Microsoft Viva Goals", coverage_level: "primary" },
  { solution_name: "Lattice", coverage_level: "secondary" },
  { solution_name: "15Five", coverage_level: "secondary" },
  { solution_name: "Leapsome", coverage_level: "secondary" },
];

const sdRows: Row[] = [];
for (const c of sdCoverage) {
  const sid = solMap.get(c.solution_name);
  if (!sid) throw new Error(`solution missing: ${c.solution_name}`);
  const k = `${sid}:${SEM_ID}`;
  if (!sdSet.has(k)) {
    sdSet.add(k);
    sdRows.push({ solution_id: sid, domain_id: SEM_ID, coverage_level: c.coverage_level });
  }
}
if (sdRows.length) {
  console.log(`  inserting ${sdRows.length} new solution_domains rows`);
  await insert("/solution_domains", sdRows);
} else console.log("  all solution_domains rows present");

// ============================================================
// 7) domain_modules (3)
// ============================================================
const modules = [
  { domain_module_code: "SEM-STRATEGY-DEFINITION", domain_module_name: "Strategy Definition", description: "Authoring of strategic objectives, strategy maps, and the cascading hierarchy from corporate strategy down to team-level OKRs.", domain_id: SEM_ID },
  { domain_module_code: "SEM-EXECUTION-TRACKING", domain_module_name: "Execution Tracking", description: "Strategic initiative registers, progress capture, traceability between execution work and strategic intent, and investment-alignment views.", domain_id: SEM_ID },
  { domain_module_code: "SEM-OPERATING-RHYTHM", domain_module_name: "Operating Rhythm", description: "Operating-cadence orchestration (QBR / MBR / weekly business reviews), agenda templates, structured commentary capture, action-item and decision tracking.", domain_id: SEM_ID },
];

console.log("== 7) domain_modules ==");
const moduleMap = await syncByKey("/domain_modules", modules, "domain_module_code");

// ============================================================
// 8) domain_module_capabilities
// ============================================================
console.log("== 8) domain_module_capabilities ==");
const dmcExisting = await get("/domain_module_capabilities?select=domain_module_id,capability_id&limit=20000");
const dmcSet = new Set(dmcExisting.map(r => `${r.domain_module_id}:${r.capability_id}`));

const moduleAssignments: Array<{ module: string; capability: string | number }> = [
  { module: "SEM-STRATEGY-DEFINITION", capability: "SEM-OBJECTIVES" },
  { module: "SEM-STRATEGY-DEFINITION", capability: "SEM-STRATEGY-MAPS" },
  { module: "SEM-STRATEGY-DEFINITION", capability: GOAL_MGMT_CAP_ID }, // cross-cutting capability
  { module: "SEM-EXECUTION-TRACKING", capability: "SEM-INITIATIVES" },
  { module: "SEM-EXECUTION-TRACKING", capability: "SEM-TRACEABILITY" },
  { module: "SEM-EXECUTION-TRACKING", capability: "SEM-PORTFOLIO-ALIGN" },
  { module: "SEM-OPERATING-RHYTHM", capability: "SEM-OPERATING-CADENCE" },
];

const dmcRows: Row[] = [];
for (const a of moduleAssignments) {
  const mid = moduleMap.get(a.module);
  if (!mid) throw new Error(`module missing: ${a.module}`);
  const cid = typeof a.capability === "number" ? a.capability : capMap.get(a.capability)!;
  const k = `${mid}:${cid}`;
  if (!dmcSet.has(k)) {
    dmcSet.add(k);
    dmcRows.push({ domain_module_id: mid, capability_id: cid });
  }
}
if (dmcRows.length) {
  console.log(`  inserting ${dmcRows.length} new domain_module_capabilities rows`);
  await insert("/domain_module_capabilities", dmcRows);
} else console.log("  all DMC rows present");

// ============================================================
// 9) domain_starter_modules (3)
// ============================================================
console.log("== 9) domain_starter_modules ==");
const dsmExisting = await get(`/domain_starter_modules?domain_id=eq.${SEM_ID}&select=domain_module_id,position`);
const dsmSet = new Set(dsmExisting.map(r => String(r.domain_module_id)));

const starter: Array<{ module: string; position: number; notes: string }> = [
  { module: "SEM-STRATEGY-DEFINITION", position: 1, notes: "Start here: author the strategic objectives, strategy map, and cascading goal hierarchy before tracking execution against them." },
  { module: "SEM-EXECUTION-TRACKING", position: 2, notes: "Once strategy is defined, register initiatives and capture execution progress traced back to objectives." },
  { module: "SEM-OPERATING-RHYTHM", position: 3, notes: "Run the QBR / MBR cadences against the defined strategy and tracked execution to close the strategy-execution loop." },
];

const dsmRows: Row[] = [];
for (const s of starter) {
  const mid = moduleMap.get(s.module);
  if (!mid) throw new Error(`module missing: ${s.module}`);
  if (!dsmSet.has(String(mid))) {
    dsmRows.push({ domain_id: SEM_ID, domain_module_id: mid, position: s.position, notes: s.notes });
  }
}
if (dsmRows.length) {
  console.log(`  inserting ${dsmRows.length} new domain_starter_modules rows`);
  await insert("/domain_starter_modules", dsmRows);
} else console.log("  starter modules present");

// ============================================================
// 10) business_function_domains (Phase C)
// ============================================================
console.log("== 10) business_function_domains ==");
const EXECUTIVE_FN = 32;
const BIZ_OPS_FN = 34;
const FINANCE_FN = 4;

const bfdExisting = await get(`/business_function_domains?domain_id=eq.${SEM_ID}&select=business_function_id,responsibility_type`);
const bfdSet = new Set(bfdExisting.map(r => `${r.business_function_id}:${r.responsibility_type}`));

const bfdProposed: Array<{ fn: number; resp: string; notes: string }> = [
  { fn: EXECUTIVE_FN, resp: "owner", notes: "Chief of Staff / Chief Strategy Officer / Strategy Office is the canonical SEM buyer and operator." },
  { fn: BIZ_OPS_FN, resp: "contributor", notes: "BizOps/RevOps contributes operating-cadence orchestration and dashboard build-out." },
  { fn: FINANCE_FN, resp: "consumer", notes: "Finance consumes SEM's initiative-spend traceability to reconcile back to budget and forecast variance." },
];

const bfdRows: Row[] = [];
for (const r of bfdProposed) {
  const k = `${r.fn}:${r.resp}`;
  if (!bfdSet.has(k)) {
    bfdRows.push({ domain_id: SEM_ID, business_function_id: r.fn, responsibility_type: r.resp, notes: r.notes });
  }
}
if (bfdRows.length) {
  console.log(`  inserting ${bfdRows.length} new BFD rows`);
  await insert("/business_function_domains", bfdRows);
} else console.log("  all BFD rows present");

console.log("\nDONE — SEM Phase A + Phase C loaded.");
console.log(`SEM domain id: ${SEM_ID}`);
console.log(`Module ids: ${[...moduleMap.entries()].filter(([k]) => k.startsWith("SEM-")).map(([k, v]) => `${k}=${v}`).join(", ")}`);
