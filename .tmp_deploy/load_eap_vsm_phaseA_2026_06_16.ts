#!/usr/bin/env bun
// Phase A (market shape) for two new domains: EAP (Enterprise Agile Planning) and
// VSM (Value Stream Management). Loads domains, capabilities, capability_domains,
// domain_modules, domain_module_capabilities, solutions, solution_domains.
// Idempotent via natural keys. record_status omitted -> DB default 'new'.

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
const get = (path: string) => call({ method: "GET", path });
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    out.push(...await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) }));
  }
  return out;
}
async function syncTable(path: string, rows: Row[], keyField: string): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const have = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !have.has(String(r[keyField])));
  if (missing.length) { console.log(`  ${path}: inserting ${missing.length} (${existing.length} existed)`); await insert(path, missing); }
  else console.log(`  ${path}: all ${existing.length} present`);
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const m = new Map<string, number>();
  for (const r of all) m.set(String(r[keyField]), Number(r.id));
  return m;
}

// ---- Rule #8 domain validation ----
const MIN_ORG = ["10 xs <50","20 s <500","30 m <2500","40 l <10000","50 xl 10000+"];
const COST = ["$","$$","$$$","$$$$","$$$$$"];
function validateDomainRow(d: any) {
  const bad = d.crud_percentage === 0 || !d.min_org_size || !d.cost_band ||
    (d.business_logic === "" && d.crud_percentage < 95) || d.usa_market_size_usd_m === 0 || d.market_size_source_year === 0 ||
    !MIN_ORG.includes(d.min_org_size) || !COST.includes(d.cost_band);
  if (bad) throw new Error(`domain ${d.domain_code} fails Rule #8 metadata validation: ${JSON.stringify(d)}`);
}

// ============ DOMAINS ============
const domains = [
  {
    domain_code: "EAP", domain_name: "Enterprise Agile Planning",
    description: "Software market for scaling agile delivery across many teams, programs, and portfolios: program-increment and release-train coordination, epic-to-feature backlog hierarchy, cross-team dependency management, agile roadmaps, OKR-to-delivery alignment, and flow analytics. Bought by the engineering and agile-transformation office (release-train engineers, VP Engineering, the agile PMO). Distinct from SPM (top-down CIO/EPMO investment planning), from generic work management (not framework-aware), and from the value-stream delivery toolchain (which builds and ships code rather than planning it).",
    crud_percentage: 60,
    business_logic: "Beyond declarable CRUD: cross-team dependency-health computation, velocity and flow rollups across the release-train and program-increment hierarchy, what-if PI planning, and OKR-to-delivery alignment scoring.",
    min_org_size: "30 m <2500", cost_band: "$$$", certification_required: false,
    usa_market_size_usd_m: 650, market_size_source_year: 2025,
    catalog_tagline: "Plan and coordinate agile delivery across every team, program, and portfolio in one place.",
    catalog_description: "Bring scaled-agile delivery under one roof. Model the full delivery hierarchy from portfolio epics down to features, stories, sprints, and release trains, and plan each program increment with your teams. Map and resolve cross-team dependencies before they block delivery, keep agile roadmaps and release plans current, and connect OKRs to the work that achieves them. Live flow and velocity analytics show where delivery is on track and where it is stuck, so release-train engineers and delivery leaders can steer in real time. Built for organizations running multiple teams or trains that need coordinated, framework-aware planning rather than a generic task board.",
  },
  {
    domain_code: "VSM", domain_name: "Value Stream Management",
    description: "Software market for measuring end-to-end software delivery flow across a heterogeneous toolchain the platform does not own: value-stream mapping, flow metrics (velocity, time, load, efficiency, distribution), bottleneck and constraint detection, DORA benchmarking, and software-delivery-to-business-outcome alignment. A tool-agnostic overlay that integrates the delivery toolchain to measure it rather than producing its artifacts. Distinct from the value-stream delivery toolchain (which builds and ships software) by measuring across tools it does not own, and from SPM (top-down investment planning) by observing actual flow bottom-up after work happens.",
    crud_percentage: 18,
    business_logic: "Almost entirely derive-and-measure over mirrored upstream work items: flow-metric computation across the value stream, bottleneck and constraint detection, DORA rollups, and feature-vs-defect-vs-debt investment-mix analysis. The genuine declarable CRUD is limited to value-stream definitions, tool-connection configuration, and metric thresholds.",
    min_org_size: "30 m <2500", cost_band: "$$$", certification_required: false,
    usa_market_size_usd_m: 300, market_size_source_year: 2025,
    catalog_tagline: "See how work really flows across your whole delivery toolchain, and where it gets stuck.",
    catalog_description: "Get one honest view of software delivery across every tool your teams already use. Connect your planning, source, CI/CD, and service tools, map your value streams, and let the platform mirror the work items flowing through them. Measure flow velocity, time, load, efficiency, and distribution, surface the bottlenecks slowing delivery, and benchmark delivery performance with DORA metrics. Tie delivery outcomes back to business investment so leaders can see whether effort is going to new value, defects, or debt. Built as a tool-agnostic layer for organizations running a mixed toolchain that no single delivery platform can measure end to end.",
  },
];
domains.forEach(validateDomainRow);

// ============ CAPABILITIES ============
const capabilities = [
  // EAP
  { capability_code: "EAP-PROGRAM-COORD", capability_name: "Scaled-Agile Program and Release-Train Coordination", domain: "EAP" },
  { capability_code: "EAP-PI-PLANNING", capability_name: "Program-Increment and PI-Objective Planning", domain: "EAP" },
  { capability_code: "EAP-BACKLOG-HIER", capability_name: "Epic-to-Feature Backlog Hierarchy Management", domain: "EAP" },
  { capability_code: "EAP-DEPENDENCY-MGMT", capability_name: "Cross-Team Dependency Mapping and Resolution", domain: "EAP" },
  { capability_code: "EAP-AGILE-ROADMAP", capability_name: "Agile Roadmap and Release Planning", domain: "EAP" },
  { capability_code: "EAP-OKR-ALIGN", capability_name: "OKR Alignment to Agile Delivery", domain: "EAP" },
  { capability_code: "EAP-FLOW-ANALYTICS", capability_name: "Agile Flow and Delivery Analytics", domain: "EAP" },
  { capability_code: "EAP-LEAN-PORTFOLIO", capability_name: "Lean-Portfolio Funding-to-Delivery Linkage", domain: "EAP" },
  // VSM
  { capability_code: "VSM-TOOLCHAIN-INTEG", capability_name: "Cross-Tool Value-Stream Integration and Connector Management", domain: "VSM" },
  { capability_code: "VSM-STREAM-MAPPING", capability_name: "Value-Stream Mapping and Modeling", domain: "VSM" },
  { capability_code: "VSM-WORKITEM-MIRROR", capability_name: "Work-Item Mirroring and Traceability", domain: "VSM" },
  { capability_code: "VSM-FLOW-METRICS", capability_name: "Flow Metrics Measurement", domain: "VSM" },
  { capability_code: "VSM-BOTTLENECK", capability_name: "Bottleneck and Constraint Detection", domain: "VSM" },
  { capability_code: "VSM-DORA", capability_name: "DORA and Delivery-Performance Benchmarking", domain: "VSM" },
  { capability_code: "VSM-INVEST-MIX", capability_name: "Flow-Distribution and Investment-Mix Analysis", domain: "VSM" },
  { capability_code: "VSM-OUTCOME-ALIGN", capability_name: "Software-Delivery-to-Business-Outcome Alignment", domain: "VSM" },
];

// ============ MODULES ============
const modules = [
  { domain_module_code: "EAP-PROGRAM-EXECUTION", domain: "EAP", domain_module_name: "Program Execution and PI Planning",
    description: "Coordinates release trains and program increments: PI planning, PI objectives, and cross-team dependency mapping and resolution, with flow and velocity analytics across the train.",
    catalog_tagline: "Run PI planning and keep your release trains moving without cross-team surprises.",
    catalog_description: "Plan and execute program increments with your teams. Stand up release trains, run PI planning, commit PI objectives, and map cross-team dependencies so they get resolved before they block delivery. Built-in flow and velocity analytics show how each train is progressing so release-train engineers can steer the program in real time." },
  { domain_module_code: "EAP-PORTFOLIO-ROADMAP", domain: "EAP", domain_module_name: "Portfolio Backlog and Roadmaps",
    description: "Manages the portfolio-to-delivery backlog hierarchy (epics to features), agile roadmaps and release plans, lean-portfolio funding linkage, and OKR-to-delivery alignment.",
    catalog_tagline: "Connect portfolio strategy to the agile backlog teams actually deliver.",
    catalog_description: "Keep strategy and delivery in sync. Manage the backlog hierarchy from portfolio epics down to features, plan agile roadmaps and releases, link lean-portfolio funding to the work it pays for, and align OKRs to the delivery that achieves them. Gives delivery leaders a current, honest picture of what is planned and how it ladders up to portfolio outcomes." },
  { domain_module_code: "VSM-CONNECT-MODEL", domain: "VSM", domain_module_name: "Toolchain Integration and Stream Modeling",
    description: "Connects the delivery toolchain and models value streams: tool connections, value-stream definitions, flow-metric definitions, and the mirrored work items that flow through each stream.",
    catalog_tagline: "Connect your delivery tools and map the value streams work flows through.",
    catalog_description: "Lay the foundation for measuring delivery. Connect your planning, source, CI/CD, and service tools, define your value streams, and let the platform mirror the work items moving through them. Configure which flow metrics matter and how they are computed, so the rest of the platform can measure delivery against a model you control, across tools you did not build." },
  { domain_module_code: "VSM-FLOW-INSIGHTS", domain: "VSM", domain_module_name: "Flow Metrics and Insights",
    description: "Computes flow metrics, surfaces bottlenecks, benchmarks DORA performance, and analyzes investment mix and delivery-to-outcome alignment over the mirrored value-stream data.",
    catalog_tagline: "Measure flow, find bottlenecks, and tie delivery to business outcomes.",
    catalog_description: "Turn mirrored delivery data into decisions. Measure flow velocity, time, load, efficiency, and distribution across your value streams, surface the bottlenecks slowing delivery, and benchmark performance with DORA metrics. Analyze whether effort is going to new value, defects, or debt, and tie delivery outcomes back to business investment so leaders can act on what the flow data shows." },
];

// module -> capability codes it realizes
const moduleCaps: Record<string, string[]> = {
  "EAP-PROGRAM-EXECUTION": ["EAP-PROGRAM-COORD", "EAP-PI-PLANNING", "EAP-DEPENDENCY-MGMT", "EAP-FLOW-ANALYTICS"],
  "EAP-PORTFOLIO-ROADMAP": ["EAP-BACKLOG-HIER", "EAP-AGILE-ROADMAP", "EAP-OKR-ALIGN", "EAP-LEAN-PORTFOLIO"],
  "VSM-CONNECT-MODEL": ["VSM-TOOLCHAIN-INTEG", "VSM-STREAM-MAPPING", "VSM-WORKITEM-MIRROR"],
  "VSM-FLOW-INSIGHTS": ["VSM-FLOW-METRICS", "VSM-BOTTLENECK", "VSM-DORA", "VSM-INVEST-MIX", "VSM-OUTCOME-ALIGN"],
};

// ============ SOLUTIONS (vendor_id by name; all vendors already exist) ============
const VENDOR = { Atlassian: 3, Broadcom: 16, "Digital.ai": 255, GitLab: 250, IBM: 15, Microsoft: 25, Planview: 22, ServiceNow: 1 };
type SolDef = { solution_name: string; vendor_id: number; description: string; links: Array<{ domain: string; coverage_level: string }> };
const solutions: SolDef[] = [
  // EAP (Jira Align already exists id 72 -> handled separately for its EAP link)
  { solution_name: "Broadcom Rally", vendor_id: VENDOR.Broadcom, description: "Enterprise agile planning platform for scaling Scrum and SAFe across release trains, with strong program governance and audit traceability.", links: [{ domain: "EAP", coverage_level: "primary" }] },
  { solution_name: "Digital.ai Agility", vendor_id: VENDOR["Digital.ai"], description: "Scaled agile planning platform (formerly VersionOne) with portfolio-to-team backlog management, plus flow analytics across the delivery toolchain.", links: [{ domain: "EAP", coverage_level: "primary" }, { domain: "VSM", coverage_level: "secondary" }] },
  { solution_name: "Planview AgilePlace", vendor_id: VENDOR.Planview, description: "Lean and agile delivery planning with Kanban-based program and team boards, part of the Planview portfolio-and-delivery suite.", links: [{ domain: "EAP", coverage_level: "primary" }] },
  { solution_name: "Targetprocess", vendor_id: VENDOR.IBM, description: "Flexible enterprise agile planning tool with configurable objects spanning portfolios, programs, and teams; part of the IBM Apptio portfolio.", links: [{ domain: "EAP", coverage_level: "primary" }] },
  { solution_name: "Microsoft Azure Boards", vendor_id: VENDOR.Microsoft, description: "Agile planning boards, backlogs, and epics within Azure DevOps, scaling from team to program-level delivery.", links: [{ domain: "EAP", coverage_level: "primary" }] },
  { solution_name: "GitLab", vendor_id: VENDOR.GitLab, description: "End-to-end DevSecOps platform; the Plan stage provides epics and agile planning, with built-in value-stream analytics over its own delivery data.", links: [{ domain: "EAP", coverage_level: "secondary" }, { domain: "VSM", coverage_level: "secondary" }] },
  // VSM
  { solution_name: "Planview Viz", vendor_id: VENDOR.Planview, description: "Tool-agnostic value-stream management layer (formerly Tasktop Viz) that integrates the delivery toolchain to measure flow metrics across the value stream.", links: [{ domain: "VSM", coverage_level: "primary" }] },
  { solution_name: "Plutora", vendor_id: VENDOR.Planview, description: "Value-stream management and release-orchestration platform measuring delivery flow across a heterogeneous toolchain; acquired by Planview.", links: [{ domain: "VSM", coverage_level: "primary" }] },
  { solution_name: "Broadcom ValueOps", vendor_id: VENDOR.Broadcom, description: "Value-stream management suite combining tool-agnostic integration (ConnectALL) with flow analytics and investment alignment.", links: [{ domain: "VSM", coverage_level: "primary" }] },
  { solution_name: "ServiceNow Value Stream Management", vendor_id: VENDOR.ServiceNow, description: "Value-stream management on the Now Platform: flow metrics, DORA, and value-stream mapping integrated with planning and delivery data.", links: [{ domain: "VSM", coverage_level: "primary" }] },
];

// ============ RUN ============
console.log("== Phase A: EAP + VSM market shape ==");

console.log("domains...");
const domainMap = await syncTable("/domains", domains.map(d => ({ ...d })), "domain_code");
const EAP = domainMap.get("EAP")!, VSM = domainMap.get("VSM")!;
console.log(`  EAP id=${EAP}  VSM id=${VSM}`);

console.log("capabilities...");
const capMap = await syncTable("/capabilities", capabilities.map(({ domain, ...c }) => c), "capability_code");

console.log("capability_domains...");
const existingCD = await get(`/capability_domains?domain_id=in.(${EAP},${VSM})&select=capability_id,domain_id`);
const cdHave = new Set(existingCD.map(r => `${r.capability_id}:${r.domain_id}`));
const cdRows = capabilities
  .map(c => ({ capability_id: capMap.get(c.capability_code)!, domain_id: domainMap.get(c.domain)! }))
  .filter(r => !cdHave.has(`${r.capability_id}:${r.domain_id}`));
if (cdRows.length) await insert("/capability_domains", cdRows);
console.log(`  +${cdRows.length} capability_domains`);

console.log("domain_modules...");
const modMap = await syncTable("/domain_modules", modules.map(m => ({
  domain_module_code: m.domain_module_code, domain_id: domainMap.get(m.domain)!, domain_module_name: m.domain_module_name,
  description: m.description, module_kind: "full", catalog_tagline: m.catalog_tagline, catalog_description: m.catalog_description,
})), "domain_module_code");

console.log("domain_module_capabilities...");
const existingMC = await get(`/domain_module_capabilities?domain_module_id=in.(${[...modMap.values()].join(",")})&select=domain_module_id,capability_id`);
const mcHave = new Set(existingMC.map(r => `${r.domain_module_id}:${r.capability_id}`));
const mcRows: Row[] = [];
for (const [modCode, caps] of Object.entries(moduleCaps)) {
  const mid = modMap.get(modCode)!;
  for (const cc of caps) {
    const cid = capMap.get(cc)!;
    if (!mcHave.has(`${mid}:${cid}`)) mcRows.push({ domain_module_id: mid, capability_id: cid });
  }
}
if (mcRows.length) await insert("/domain_module_capabilities", mcRows);
console.log(`  +${mcRows.length} domain_module_capabilities`);

console.log("solutions...");
const solMap = await syncTable("/solutions", solutions.map(s => ({ solution_name: s.solution_name, vendor_id: s.vendor_id, description: s.description, solution_kind: "standard_solution", is_active_in_market: true })), "solution_name");

console.log("solution_domains...");
// include the pre-existing Jira Align (id 72) -> EAP primary
const sdSpec: Array<{ solution_id: number; domain: string; coverage_level: string }> = [
  { solution_id: 72, domain: "EAP", coverage_level: "primary" }, // Jira Align
];
for (const s of solutions) for (const l of s.links) sdSpec.push({ solution_id: solMap.get(s.solution_name)!, domain: l.domain, coverage_level: l.coverage_level });
const allSolIds = [...new Set(sdSpec.map(r => r.solution_id))];
const existingSD = await get(`/solution_domains?solution_id=in.(${allSolIds.join(",")})&domain_id=in.(${EAP},${VSM})&select=solution_id,domain_id`);
const sdHave = new Set(existingSD.map(r => `${r.solution_id}:${r.domain_id}`));
const sdRows = sdSpec
  .map(r => ({ solution_id: r.solution_id, domain_id: domainMap.get(r.domain)!, coverage_level: r.coverage_level }))
  .filter(r => !sdHave.has(`${r.solution_id}:${r.domain_id}`));
if (sdRows.length) await insert("/solution_domains", sdRows);
console.log(`  +${sdRows.length} solution_domains`);

console.log("\n== Phase A done ==");
console.log(JSON.stringify({ EAP, VSM, modules: Object.fromEntries(modMap) }, null, 2));
