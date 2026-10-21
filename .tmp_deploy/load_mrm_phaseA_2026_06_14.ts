#!/usr/bin/env bun
// MRM (Marketing Resource Management) — Phase A loader.
// Scope: marketing planning + budget kernel ONLY (no generic work-mgmt, no DAM asset store,
// no campaign execution). References WORK-MGMT / DAM / MA at the boundary.
//
// Loads: domains (MRM + 7 metadata + catalog UX), capabilities + capability_domains,
// domain_modules (2 full) + domain_module_capabilities, vendors (reuse) + solutions + solution_domains.
// Idempotent on natural keys. record_status omitted everywhere (DB default 'new').

import { $ } from "bun";
$.throws(false);
type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
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
async function get(path: string): Promise<Row[]> { return call({ method: "GET", path }); }

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
async function syncByKey(path: string, rows: Row[], keyField: string): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  ${path}: inserting ${missing.length} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} present, nothing new`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// Rule #8 hard-fail validator (per scripts/loaders/load_research.ts validateDomainRow).
function validateDomainRow(d: Row): void {
  const errs: string[] = [];
  if (!d.crud_percentage || Number(d.crud_percentage) === 0) errs.push("crud_percentage is 0");
  if (d.min_org_size === "" || d.min_org_size == null) errs.push("min_org_size empty");
  if (d.cost_band === "" || d.cost_band == null) errs.push("cost_band empty");
  if ((d.business_logic === "" || d.business_logic == null) && Number(d.crud_percentage) < 95)
    errs.push("business_logic empty while crud_percentage < 95");
  if (!d.usa_market_size_usd_m || Number(d.usa_market_size_usd_m) === 0) errs.push("usa_market_size_usd_m is 0");
  if (!d.market_size_source_year || Number(d.market_size_source_year) === 0) errs.push("market_size_source_year is 0");
  if (errs.length) throw new Error(`validateDomainRow(${d.domain_code}) failed: ${errs.join("; ")}`);
}

// ============================================================
// PHASE A DATA
// ============================================================
const DOMAIN = {
  domain_code: "MRM",
  domain_name: "Marketing Resource Management",
  description:
    "Top-down marketing planning, budget allocation across plans and campaigns, spend-to-plan reconciliation, and the marketing calendar for in-house marketing departments. Scoped tightly to the planning and budget kernel: the marketing plan hierarchy, plan-line budget allocation, committed and actual spend reconciled to plan, the campaign and content calendar, and plan-level performance measurement. Brand and creative assets are referenced from the asset repository rather than stored here; generic task and project work is referenced from the work-management layer; campaign execution is referenced from the marketing-execution layer. Sits upstream of execution and downstream of corporate finance.",
  // Rule #8 metadata (Phase 0 estimates)
  crud_percentage: 70,
  business_logic:
    "Budget allocation rollups across the plan-line hierarchy, plan-to-actual spend reconciliation (committed vs actual vs plan), forecast and scenario math on remaining budget, and approval-chain governance on budget allocations and spend.",
  min_org_size: "30 m <2500",
  cost_band: "$$$",
  certification_required: false,
  usa_market_size_usd_m: 2500,
  market_size_source_year: 2025,
  // Rule #20 catalog UX (buyer voice)
  catalog_tagline: "Plan your marketing, allocate the budget, and reconcile every dollar of spend back to the plan.",
  catalog_description:
    "Build the annual and quarterly marketing plan as a hierarchy of plan lines, then allocate budget top-down across plans, campaigns, and channels. Track committed and actual spend against every plan line so you always know what is left to spend and where it went. Lay the whole program out on a shared marketing calendar, route budget allocations and spend through approval, and measure plan-level performance and marketing ROI. Connects to your work-management tasks, your asset library, and your campaign-execution tools without duplicating them.",
};

const CAPABILITIES = [
  { capability_code: "MRM-MARKETING-PLANNING", capability_name: "Marketing Planning",
    description: "Building and maintaining the annual and quarterly marketing plan as a hierarchy of plan lines tied to objectives, owners, and time periods." },
  { capability_code: "MRM-BUDGET-ALLOCATION", capability_name: "Marketing Budget Allocation",
    description: "Top-down allocation of marketing budget across plans, plan lines, campaigns, and channels, with approval governance on each allocation." },
  { capability_code: "MRM-SPEND-TO-PLAN-RECONCILIATION", capability_name: "Spend-to-Plan Reconciliation",
    description: "Capturing committed and actual marketing spend and reconciling it against allocated budget at the plan-line grain to show remaining budget and variance." },
  { capability_code: "MRM-MARKETING-CALENDAR", capability_name: "Marketing Calendar Management",
    description: "A shared campaign and content calendar that lays out marketing activity across time, teams, and channels for visibility and coordination." },
  { capability_code: "MRM-PERFORMANCE-MEASUREMENT", capability_name: "Marketing Performance Measurement",
    description: "Plan-level performance and marketing-ROI measurement, linking results and pipeline contribution back to the plans and budgets that funded them." },
];

// 2 full modules (kernel has 5 capabilities, so >=2 modules required by Rule #14/M2).
const MODULES = [
  { domain_module_code: "MRM-PLANNING", domain_module_name: "Marketing Planning and Calendar",
    module_kind: "full", domain_id: null as number | null,
    description:
      "Masters the marketing plan hierarchy (plans and plan lines) and the shared marketing calendar. Coordinates the planned program across teams, channels, and time, and references work-management tasks/projects and marketing-execution campaigns rather than re-implementing them. Deployed alongside the budget module for a full planning-plus-budget kernel, or standalone for plan and calendar coordination.",
    catalog_tagline: "Lay out the whole marketing program as a plan hierarchy on one shared calendar.",
    catalog_description:
      "Author the annual and quarterly marketing plan as a hierarchy of plan lines, each with an owner, objective, and time window, and see the entire program on a shared campaign and content calendar. Link plan lines to the campaigns your execution tools run and the tasks your teams own, so the plan stays connected to the work without duplicating it.",
    capabilities: ["MRM-MARKETING-PLANNING", "MRM-MARKETING-CALENDAR"] },
  { domain_module_code: "MRM-BUDGET", domain_module_name: "Marketing Budget and Spend",
    module_kind: "full", domain_id: null as number | null,
    description:
      "Masters marketing budgets, plan-line budget allocations, spend records, and plan-level performance metrics. Provides top-down allocation, committed-and-actual spend capture, spend-to-plan reconciliation, and marketing-ROI measurement. The defensible MRM kernel that no work-management or asset domain owns.",
    catalog_tagline: "Allocate marketing budget top-down and reconcile every dollar of spend back to the plan.",
    catalog_description:
      "Set marketing budgets and allocate them top-down across plans, plan lines, campaigns, and channels. Capture committed and actual spend, reconcile it against each allocation to reveal remaining budget and variance, and route allocations and spend through approval. Measure plan-level performance and marketing ROI so you can tie results and pipeline contribution back to what funded them.",
    capabilities: ["MRM-BUDGET-ALLOCATION", "MRM-SPEND-TO-PLAN-RECONCILIATION", "MRM-PERFORMANCE-MEASUREMENT"] },
];

// Vendors: reuse existing by vendor_name; add Uptempo (new).
const VENDORS = [
  { vendor_name: "Uptempo", vendor_url: "https://www.uptempo.io", headquarters_country: "Germany",
    description: "Enterprise marketing planning, budgeting, and spend-to-plan orchestration vendor (formed from BrandMaker, Allocadia, and Hive9)." },
];

// Solutions: reuse existing solution rows by name; add the MRM-specific ones.
// vendor_name lookups resolved live; Uptempo created above.
type SolDef = { solution_name: string; vendor_name: string; solution_type: string; solution_url?: string;
  description: string; coverage: "primary" | "secondary" | "partial" };
const SOLUTIONS: SolDef[] = [
  { solution_name: "Uptempo", vendor_name: "Uptempo", solution_type: "saas", solution_url: "https://www.uptempo.io",
    description: "Marketing planning, budget allocation, and spend-to-plan orchestration platform for enterprise marketing teams.", coverage: "primary" },
  { solution_name: "Planful for Marketing", vendor_name: "Planful", solution_type: "saas", solution_url: "https://www.planful.com/solutions/marketing/",
    description: "Marketing budget planning, allocation, and ROI delivered as the marketing module of an FP&A platform.", coverage: "primary" },
  { solution_name: "Aprimo Marketing Productivity", vendor_name: "Aprimo", solution_type: "saas", solution_url: "https://www.aprimo.com",
    description: "Marketing operations suite covering marketing planning, budget, and workflow alongside content lifecycle.", coverage: "primary" },
  { solution_name: "Adobe Workfront", vendor_name: "Adobe", solution_type: "saas", solution_url: "https://www.adobe.com/products/workfront/main.html",
    description: "Enterprise marketing work and project orchestration, used for marketing planning and calendar coordination.", coverage: "secondary" },
  { solution_name: "Sitecore Content Hub", vendor_name: "Sitecore", solution_type: "saas", solution_url: "https://www.sitecore.com/products/content-hub",
    description: "DAM-led content suite whose MRM module covers marketing planning and scheduling as a separately licensed surface.", coverage: "secondary" },
];

async function main() {
  console.log("\n=== Phase A: domains ===");
  validateDomainRow(DOMAIN);
  const domainMap = await syncByKey("/domains", [DOMAIN], "domain_code");
  const mrmId = domainMap.get("MRM");
  if (!mrmId) throw new Error("MRM domain id not resolved");
  console.log(`  MRM domain id = ${mrmId}`);

  console.log("\n=== Phase A: capabilities ===");
  const capMap = await syncByKey(
    "/capabilities",
    CAPABILITIES.map(c => ({ capability_code: c.capability_code, capability_name: c.capability_name, description: c.description })),
    "capability_code",
  );

  console.log("\n=== Phase A: capability_domains ===");
  const existingCD = await get(`/capability_domains?domain_id=eq.${mrmId}&select=capability_id`);
  const existingCDset = new Set(existingCD.map(r => Number(r.capability_id)));
  const cdRows: Row[] = [];
  for (const c of CAPABILITIES) {
    const cid = capMap.get(c.capability_code)!;
    if (!existingCDset.has(cid)) cdRows.push({ capability_id: cid, domain_id: mrmId, notes: "" });
  }
  if (cdRows.length) await insert("/capability_domains", cdRows);
  console.log(`  capability_domains: inserted ${cdRows.length}`);

  console.log("\n=== Phase A: domain_modules ===");
  const moduleRows = MODULES.map(m => ({
    domain_module_code: m.domain_module_code, domain_module_name: m.domain_module_name,
    domain_id: mrmId, module_kind: m.module_kind, description: m.description,
    catalog_tagline: m.catalog_tagline, catalog_description: m.catalog_description,
  }));
  const modMap = await syncByKey("/domain_modules", moduleRows, "domain_module_code");

  console.log("\n=== Phase A: domain_module_capabilities ===");
  const existingDMC = await get(`/domain_module_capabilities?domain_module_id=in.(${MODULES.map(m => modMap.get(m.domain_module_code)).join(",")})&select=domain_module_id,capability_id`);
  const existingDMCset = new Set(existingDMC.map(r => `${r.domain_module_id}:${r.capability_id}`));
  const dmcRows: Row[] = [];
  for (const m of MODULES) {
    const mid = modMap.get(m.domain_module_code)!;
    for (const code of m.capabilities) {
      const cid = capMap.get(code)!;
      if (!existingDMCset.has(`${mid}:${cid}`)) dmcRows.push({ domain_module_id: mid, capability_id: cid, notes: "" });
    }
  }
  if (dmcRows.length) await insert("/domain_module_capabilities", dmcRows);
  console.log(`  domain_module_capabilities: inserted ${dmcRows.length}`);

  console.log("\n=== Phase A: vendors (reuse + add) ===");
  await syncByKey("/vendors", VENDORS.map(v => ({ ...v, notes: "" })), "vendor_name");
  const allVendors = await get("/vendors?select=id,vendor_name&limit=10000");
  const vendorMap = new Map<string, number>();
  for (const v of allVendors) vendorMap.set(String(v.vendor_name), Number(v.id));

  console.log("\n=== Phase A: solutions ===");
  const solRows = SOLUTIONS.map(s => {
    const vid = vendorMap.get(s.vendor_name);
    if (!vid) throw new Error(`vendor not found: ${s.vendor_name}`);
    return { solution_name: s.solution_name, description: s.description, solution_url: s.solution_url ?? "",
      vendor_id: vid, solution_type: s.solution_type, is_active_in_market: true, notes: "" };
  });
  const solMap = await syncByKey("/solutions", solRows, "solution_name");

  console.log("\n=== Phase A: solution_domains ===");
  const existingSD = await get(`/solution_domains?domain_id=eq.${mrmId}&select=solution_id,coverage_level`);
  const existingSDset = new Set(existingSD.map(r => `${r.solution_id}:${r.coverage_level}`));
  const sdRows: Row[] = [];
  for (const s of SOLUTIONS) {
    const sid = solMap.get(s.solution_name)!;
    if (!existingSDset.has(`${sid}:${s.coverage}`)) sdRows.push({ solution_id: sid, domain_id: mrmId, coverage_level: s.coverage, notes: "" });
  }
  if (sdRows.length) await insert("/solution_domains", sdRows);
  console.log(`  solution_domains: inserted ${sdRows.length}`);

  // ---- Verify counts + Rule #8 post-load audit ----
  console.log("\n=== Phase A verification ===");
  const cnt = {
    domain_metadata: await get(`/domains?id=eq.${mrmId}&select=domain_code,crud_percentage,min_org_size,cost_band,usa_market_size_usd_m,market_size_source_year,catalog_tagline`),
    capabilities: (await get(`/capability_domains?domain_id=eq.${mrmId}&select=capability_id`)).length,
    modules: (await get(`/domain_modules?domain_id=eq.${mrmId}&select=id`)).length,
    domain_module_capabilities: (await get(`/domain_module_capabilities?domain_module_id=in.(${MODULES.map(m => modMap.get(m.domain_module_code)).join(",")})&select=capability_id`)).length,
    solution_domains: (await get(`/solution_domains?domain_id=eq.${mrmId}&select=solution_id`)).length,
  };
  console.log(JSON.stringify(cnt, null, 2));
  const zero = await get(`/domains?select=domain_code,crud_percentage,min_org_size,cost_band,usa_market_size_usd_m&crud_percentage=eq.0&domain_code=eq.MRM`);
  console.log(`  Rule #8 zero-metadata audit (MRM): ${zero.length === 0 ? "PASS" : "FAIL " + JSON.stringify(zero)}`);
  console.log(`\nMRM_DOMAIN_ID=${mrmId}`);
  console.log(`MODULE_IDS: MRM-PLANNING=${modMap.get("MRM-PLANNING")} MRM-BUDGET=${modMap.get("MRM-BUDGET")}`);
}
await main();
console.log("Phase A done.");
