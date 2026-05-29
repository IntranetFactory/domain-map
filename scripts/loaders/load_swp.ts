#!/usr/bin/env bun
// Load the Strategic Workforce Planning (SWP) domain end-to-end:
//   Phase 1: SWP domain + 2 new vendors (eQ8, OrgVue) + 3 new solutions
//            (eQ8, OrgVue, Visier Plan) + 9 solution_domains links
//   Phase 2: 8 data_objects (workforce_plans, headcount_plans,
//            position_demand_forecasts, skills_gap_analyses, workforce_scenarios,
//            org_designs, labor_market_benchmarks, workforce_cost_projections)
//            + 8 domain_data_objects (role: master)
//            + multi-master signal: SWP also masters job_requisitions
//              (ATS already master from the ATS load)
//   Phase 3: 7 cross_domain_handoffs around SWP, including the canonical
//            SWP → ATS handoff on headcount.approved that drives the
//            multi-master row on job_requisitions
//
// Idempotent throughout.

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function semCall(body: Row): Promise<Row[]> {
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
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`semantius call failed (exit ${code}): ${stderr}`);
  }
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}

const get = (path: string) => semCall({ method: "GET", path });
const post = (path: string, body: Row | Row[]) => semCall({ method: "POST", path, body });
const patch = (path: string, body: Row) => semCall({ method: "PATCH", path, body });

async function insertChunked(path: string, rows: Row[]): Promise<void> {
  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    if (slice.length > 0) await post(path, slice);
  }
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
    console.log(`  ${path}: inserting ${missing.length} new (${existing.length} existed)`);
    await insertChunked(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} already present`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// =============================================================================
// PHASE 1 — SWP domain + vendors + solutions + solution_domains
// =============================================================================
console.log("\n=== Phase 1: SWP domain + vendors + solutions + solution_domains ===");

const swpDomain = {
  domain_code: "SWP",
  domain_name: "Strategic Workforce Planning",
  description:
    "Multi-year strategic capacity planning: target headcount, skills, location, and cost over a 1-5 year horizon, with what-if scenarios (growth, reduction, restructure, geography shift, skill pivot, cost optimization) and labor-market overlay. Distinct from WFM (operational scheduling, time and attendance) and EPM (financial planning) although it produces a cost projection that EPM consumes. Pure-play market (eQ8, OrgVue) coexists with bundled WFP modules inside EPM platforms (Anaplan, Pigment, Workday Adaptive Planning) and PA platforms (Visier Plan, ChartHop). Most spend flows through the bundled side; the catalog records both pure-plays and the bundled offerings as covering the domain. Operates upstream of ATS: SWP authorises hiring (headcount.approved triggers requisition creation), making SWP and ATS co-masters of job_requisitions — the canonical multi-master Signal-1 example.",
  certification_required: false,
};
const domainMap = await syncByKey("/domains", [swpDomain], "domain_code");
const SWP_ID = domainMap.get("SWP")!;
console.log(`  SWP domain id: ${SWP_ID}`);

// Reference domains for handoffs
const refDomains = await get(
  "/domains?domain_code=in.(ATS,HCM,PA,EPM,SWP)&select=id,domain_code",
);
const domainIdByCode = new Map<string, number>();
for (const r of refDomains) domainIdByCode.set(String(r.domain_code), Number(r.id));
console.log(`  referenced domains: ${[...domainIdByCode.keys()].join(", ")}`);

// --- Vendors (2 new) ---
const newVendors = [
  {
    vendor_name: "eQ8",
    description:
      "Sydney-based pure-play strategic workforce planning vendor. Strong in scenario modelling, skills-gap analysis, and capacity planning for large enterprises.",
    vendor_url: "https://www.eq8.ai",
    headquarters_country: "Australia",
    notes: "",
  },
  {
    vendor_name: "OrgVue",
    description:
      "London-based org-design and workforce-planning platform. Strong in restructure modelling, position management, span-of-control analysis, and what-if scenarios on top of HR data.",
    vendor_url: "https://www.orgvue.com",
    headquarters_country: "UK",
    notes: "",
  },
];
const vendorMap = await syncByKey("/vendors", newVendors, "vendor_name");

const refVendors = await get(
  "/vendors?vendor_name=in.(Visier,Anaplan,Pigment,ChartHop,Workday)&select=id,vendor_name",
);
const vendorIdByName = new Map<string, number>(vendorMap);
for (const r of refVendors) vendorIdByName.set(String(r.vendor_name), Number(r.id));
console.log(`  vendor ids resolved: ${[...vendorIdByName.keys()].join(", ")}`);

// --- Solutions (3 new) ---
const newSolutions = [
  {
    solution_name: "eQ8",
    description:
      "Pure-play strategic workforce planning platform. Built for scenario modelling, skills-gap analysis, and demand/supply forecasting over multi-year horizons.",
    solution_url: "https://www.eq8.ai",
    vendor_id: vendorIdByName.get("eQ8")!,
    solution_type: "saas",
    is_active_in_market: true,
    notes: "",
  },
  {
    solution_name: "OrgVue",
    description:
      "Org-design and workforce-planning platform. Combines current-state org-chart analytics, future-state design modelling, and headcount scenarios on top of HR data.",
    solution_url: "https://www.orgvue.com",
    vendor_id: vendorIdByName.get("OrgVue")!,
    solution_type: "saas",
    is_active_in_market: true,
    notes: "",
  },
  {
    solution_name: "Visier Plan",
    description:
      "Visier's dedicated workforce planning product, sold as a distinct SKU from Visier People (which is the people analytics flagship). Inherits the Visier data model so plan-vs-actual analysis is native.",
    solution_url: "https://www.visier.com/solutions/workforce-planning/",
    vendor_id: vendorIdByName.get("Visier")!,
    solution_type: "saas",
    is_active_in_market: true,
    notes: "",
  },
];
const solMap = await syncByKey("/solutions", newSolutions, "solution_name");

// solution_domains
const refSolutions = await get(
  "/solutions?solution_name=in.(Anaplan,Pigment,Workday%20Adaptive%20Planning,ChartHop,Visier%20People,Workday%20HCM)&select=id,solution_name",
);
const solIdByName = new Map<string, number>(solMap);
for (const r of refSolutions) solIdByName.set(String(r.solution_name), Number(r.id));

const solutionDomainLinks: { solution_name: string; coverage_level: "primary" | "secondary" | "partial"; notes?: string }[] = [
  // Primary — pure-plays and dedicated SWP products
  { solution_name: "eQ8", coverage_level: "primary", notes: "Pure-play strategic workforce planning." },
  { solution_name: "OrgVue", coverage_level: "primary", notes: "Pure-play org-design and workforce planning." },
  { solution_name: "Visier Plan", coverage_level: "primary", notes: "Visier's dedicated SWP product, distinct from Visier People." },
  // Secondary — bundled WFP inside EPM or PA platforms; flagship use case is elsewhere
  { solution_name: "Anaplan", coverage_level: "secondary", notes: "WFP is a configured use case of the core Anaplan platform; flagship is EPM." },
  { solution_name: "Pigment", coverage_level: "secondary", notes: "WFP is a configured use case of the core Pigment platform; flagship is EPM." },
  { solution_name: "Workday Adaptive Planning", coverage_level: "secondary", notes: "Workforce planning module within Adaptive; flagship is EPM." },
  { solution_name: "ChartHop", coverage_level: "secondary", notes: "Strong org-design and headcount-planning overlap; flagship is PA/HCM-adjacent." },
  { solution_name: "Visier People", coverage_level: "secondary", notes: "Plan is the dedicated SWP product; People has headcount-planning add-ons." },
  { solution_name: "Workday HCM", coverage_level: "secondary", notes: "Workforce planning module within HCM; Workday Adaptive Planning is the more dedicated product." },
];

const existingSD = await get(
  `/solution_domains?domain_id=eq.${SWP_ID}&select=solution_id&limit=10000`,
);
const existingSDSet = new Set(existingSD.map(r => Number(r.solution_id)));

const sdRows = solutionDomainLinks
  .filter(l => {
    const id = solIdByName.get(l.solution_name);
    if (!id) {
      console.warn(`  ! solution not found, skipping: ${l.solution_name}`);
      return false;
    }
    return !existingSDSet.has(id);
  })
  .map(l => ({
    solution_id: solIdByName.get(l.solution_name)!,
    domain_id: SWP_ID,
    coverage_level: l.coverage_level,
    notes: l.notes ?? "",
  }));

if (sdRows.length > 0) {
  console.log(`  /solution_domains: inserting ${sdRows.length} new SWP links`);
  await insertChunked("/solution_domains", sdRows);
} else {
  console.log(`  /solution_domains: all SWP links already present`);
}

// =============================================================================
// PHASE 2 — data_objects + domain_data_objects (role: master) + multi-master row
// =============================================================================
console.log("\n=== Phase 2: SWP data_objects (incl. multi-master signal on job_requisitions) ===");

const swpDataObjects = [
  {
    data_object_name: "workforce_plans",
    singular_label: "Workforce Plan",
    plural_label: "Workforce Plans",
    display_label: "Workforce Plan",
    description:
      "Multi-year strategic plan covering target headcount, skills, location, and cost. The SWP umbrella entity; carries planning horizon (typically 1-5 years), base assumptions (attrition rate, hire ramp, productivity factor), approval state (draft / review / approved / published / reconciled), and pointers to the scenarios and forecasts that compose it.",
  },
  {
    data_object_name: "headcount_plans",
    singular_label: "Headcount Plan",
    plural_label: "Headcount Plans",
    display_label: "Headcount Plan",
    description:
      "Period-by-period headcount targets (typically monthly or quarterly) broken down by org unit, location, function, level, and employment type. Includes opening balance, additions (hires, transfers in), reductions (attrition, RIF, transfers out), and target end-of-period count. The basis for plan-vs-actual reconciliation against HCM.",
  },
  {
    data_object_name: "position_demand_forecasts",
    singular_label: "Position Demand Forecast",
    plural_label: "Position Demand Forecasts",
    display_label: "Position Demand Forecast",
    description:
      "Projected need for specific roles derived from the capacity model: which positions, when, where, at what level. Feeds the requisition pipeline — approved demand becomes an authorised requisition in ATS via the headcount.approved handoff.",
  },
  {
    data_object_name: "skills_gap_analyses",
    singular_label: "Skills Gap Analysis",
    plural_label: "Skills Gap Analysises",
    display_label: "Skills Gap Analysis",
    description:
      "Comparison of current-state skills inventory vs future-state demand by role, level, and geography. Drives build/buy/borrow strategy: which gaps to close via training (LMS), external hires (ATS), or contingent workforce. Outputs feed both SWP scenarios and LMS curriculum decisions.",
  },
  {
    data_object_name: "workforce_scenarios",
    singular_label: "Workforce Scenario",
    plural_label: "Workforce Scenarios",
    display_label: "Workforce Scenario",
    description:
      "What-if models layered on top of a base workforce plan. Each scenario carries a type (growth / reduction / restructure / geography_shift / skill_pivot / cost_optimization), the perturbation parameters, and the modelled outcome on headcount, skills, and cost. RIF planning, expansion planning, M&A integration, and reorgs all sit here.",
  },
  {
    data_object_name: "org_designs",
    singular_label: "Org Design",
    plural_label: "Org Designs",
    display_label: "Org Design",
    description:
      "Proposed structure changes: new positions, eliminated positions, reporting-line changes, span-of-control adjustments, layer-level redesign. Carries current vs proposed state and the migration path between them. OrgVue's core data object.",
  },
  {
    data_object_name: "labor_market_benchmarks",
    singular_label: "Labor Market Benchmark",
    plural_label: "Labor Market Benchmarks",
    display_label: "Labor Market Benchmark",
    description:
      "External labor-market overlay used to validate plan assumptions: availability, prevailing salary, time-to-hire, and supply concentration by role × geography × level. Typically sourced from third parties (Gartner TalentNeuron, Lightcast, Aon, BLS) rather than generated internally; the SWP-side record is the imported/cached view used for planning.",
  },
  {
    data_object_name: "workforce_cost_projections",
    singular_label: "Workforce Cost Projection",
    plural_label: "Workforce Cost Projections",
    display_label: "Workforce Cost Projection",
    description:
      "Fully-loaded cost forecast per period, by org unit / role / location / level. Inputs: headcount × comp band × loading factor (benefits, taxes, equity) × jurisdiction. The bridge to EPM — produced inside SWP from the workforce plan, then handed off to EPM where it's rolled into the consolidated budget. Without this object the SWP↔EPM boundary is fuzzy; with it, SWP masters the workforce-driven cost build and EPM masters the consolidated financial plan that consumes it.",
  },
];
const dataObjMap = await syncByKey("/data_objects", swpDataObjects, "data_object_name");

// domain_data_objects (role: master) for SWP-owned objects
const existingDDO = await get(
  `/domain_data_objects?domain_id=eq.${SWP_ID}&select=data_object_id&limit=10000`,
);
const existingDDOSet = new Set(existingDDO.map(r => Number(r.data_object_id)));

const ddoRows = swpDataObjects
  .map(o => dataObjMap.get(o.data_object_name)!)
  .filter(id => !existingDDOSet.has(id))
  .map(id => ({
    domain_id: SWP_ID,
    data_object_id: id,
    role: "master",
    notes: "",
  }));

if (ddoRows.length > 0) {
  console.log(`  /domain_data_objects: inserting ${ddoRows.length} new SWP-master links`);
  await insertChunked("/domain_data_objects", ddoRows);
} else {
  console.log(`  /domain_data_objects: all SWP master links already present`);
}

// --- Multi-master signal: SWP also masters job_requisitions ---
console.log("\n  Multi-master signal: SWP co-masters job_requisitions");

const jrLookup = await get(
  "/data_objects?data_object_name=eq.job_requisitions&select=id",
);
if (jrLookup.length === 0) throw new Error("job_requisitions data_object missing — ATS load required first");
const JOB_REQ_ID = Number(jrLookup[0].id);

// Check whether the SWP→job_requisitions row exists
const existingSwpJr = await get(
  `/domain_data_objects?domain_id=eq.${SWP_ID}&data_object_id=eq.${JOB_REQ_ID}&select=id`,
);
if (existingSwpJr.length === 0) {
  console.log("    inserting SWP→job_requisitions master link");
  await post("/domain_data_objects", {
    domain_id: SWP_ID,
    data_object_id: JOB_REQ_ID,
    role: "master",
    notes:
      "Headcount intent — SWP masters the position approval, budget alignment, and plan-to-actual reconciliation slice. ATS masters the recruiting-execution slice (pipeline stages, candidates, interviews, offers). Cross-domain handoff SWP→ATS on headcount.approved is the bridge.",
  });
} else {
  console.log("    SWP→job_requisitions link already present");
}

// Refine the ATS→job_requisitions notes if they're still empty
const ATS_ID = domainIdByCode.get("ATS")!;
const existingAtsJr = await get(
  `/domain_data_objects?domain_id=eq.${ATS_ID}&data_object_id=eq.${JOB_REQ_ID}&select=id,notes`,
);
if (existingAtsJr.length === 1 && (existingAtsJr[0].notes === "" || existingAtsJr[0].notes == null)) {
  console.log("    refining ATS→job_requisitions notes (currently empty)");
  await patch(`/domain_data_objects?id=eq.${existingAtsJr[0].id}`, {
    notes:
      "Recruiting execution — ATS masters the pipeline-stage, candidate, interview, offer, and acceptance slice. SWP co-masters the headcount-intent slice (position approval, budget alignment, plan-to-actual). Cross-domain handoff SWP→ATS on headcount.approved is the bridge.",
  });
} else {
  console.log("    ATS→job_requisitions notes already set or row missing, skipping");
}

// =============================================================================
// PHASE 3 — cross_domain_handoffs
// =============================================================================
console.log("\n=== Phase 3: cross_domain_handoffs around SWP ===");

function did(code: string): number {
  const id = domainIdByCode.get(code);
  if (!id) throw new Error(`domain ${code} not found`);
  return id;
}
function doid(name: string): number {
  const id = dataObjMap.get(name) ?? (name === "job_requisitions" ? JOB_REQ_ID : undefined);
  if (!id) throw new Error(`data_object ${name} not found`);
  return id;
}

const handoffs = [
  // Inbound to SWP
  {
    source_domain_id: did("EPM"),
    target_domain_id: did("SWP"),
    data_object_id: doid("workforce_plans"),
    trigger_event: "budget.cycle_started",
    integration_pattern: "api_call",
    friction_level: "high",
    description:
      "Annual (or rolling) budget cycle in EPM triggers refresh of workforce plans aligned to the new budget envelope. SWP planners rebuild scenarios under updated cost ceilings. High friction because EPM and SWP rarely share a common plan structure (org-unit dimensions, time grain, account hierarchies all differ), forcing manual reconciliation and re-modelling.",
    notes: "",
  },
  {
    source_domain_id: did("HCM"),
    target_domain_id: did("SWP"),
    data_object_id: doid("headcount_plans"),
    trigger_event: "headcount.actuals_updated",
    integration_pattern: "batch_sync",
    friction_level: "medium",
    description:
      "Actual headcount changes (hires, terminations, transfers, leaves) from HCM flow to SWP for plan-vs-actual reconciliation. Usually nightly batch; some orgs run weekly. Friction sits in normalising HCM's org structure to the planning structure SWP uses.",
    notes: "",
  },
  {
    source_domain_id: did("ATS"),
    target_domain_id: did("SWP"),
    data_object_id: doid("position_demand_forecasts"),
    trigger_event: "requisition.filled",
    integration_pattern: "event_stream",
    friction_level: "medium",
    description:
      "Filled requisitions from ATS decrement open demand in SWP's position forecasts and update plan-vs-actual fill metrics (time-to-fill, fill rate by role/geo). Lower friction than headcount.actuals_updated from HCM because the requisition→forecast mapping is more direct.",
    notes: "",
  },
  {
    source_domain_id: did("PA"),
    target_domain_id: did("SWP"),
    data_object_id: doid("workforce_plans"),
    trigger_event: "attrition.forecast_updated",
    integration_pattern: "api_call",
    friction_level: "medium",
    description:
      "People Analytics produces an attrition forecast (typically per org unit × tenure × performance band). SWP consumes the forecast to update plan assumptions on natural reduction, refining demand for backfill hires. Friction is medium — the forecast is well-defined but pushing it back into SWP scenarios requires manual planner judgement.",
    notes: "",
  },
  // Outbound from SWP — including the canonical co-master driver
  {
    source_domain_id: did("SWP"),
    target_domain_id: did("ATS"),
    data_object_id: doid("job_requisitions"),
    trigger_event: "headcount.approved",
    integration_pattern: "api_call",
    friction_level: "high",
    description:
      "Approved headcount in SWP authorises requisition creation in ATS. THIS IS THE CO-MASTER BRIDGE: SWP masters the intent slice (approved position, budget, time window) and ATS masters the execution slice (pipeline, candidates, interviews, offer). High friction because SWP's plan structure (org × geo × level × time) rarely matches ATS's requisition template structure (job code × location × hiring manager × pay range), requiring mapping rules that drift as either side evolves.",
    notes: "",
  },
  {
    source_domain_id: did("SWP"),
    target_domain_id: did("HCM"),
    data_object_id: doid("org_designs"),
    trigger_event: "position.approved_for_creation",
    integration_pattern: "api_call",
    friction_level: "high",
    description:
      "Org-design changes (new positions, restructures, eliminated positions, reporting-line changes) trigger position-master updates in HCM. HCM masters positions operationally; SWP designs them strategically. High friction during restructures and M&A — large bulk creations and deletions overwhelm HCM's per-position approval workflows.",
    notes: "",
  },
  {
    source_domain_id: did("SWP"),
    target_domain_id: did("EPM"),
    data_object_id: doid("workforce_cost_projections"),
    trigger_event: "cost_projection.approved",
    integration_pattern: "batch_sync",
    friction_level: "medium",
    description:
      "Approved workforce cost projection (fully-loaded comp expense by period × org × geo × level) is the SWP output that EPM rolls into the consolidated budget. Without this handoff EPM's people-cost line is disconnected from the workforce plan. Friction is medium because the mapping is well-understood but account hierarchies and loading-factor definitions drift between the two domains and require periodic re-alignment.",
    notes: "",
  },
];

// Idempotent: skip rows where (source, target, data_object, trigger_event) already exist
const inbound = await get(
  `/cross_domain_handoffs?target_domain_id=eq.${SWP_ID}&select=source_domain_id,target_domain_id,data_object_id,trigger_event`,
);
const outbound = await get(
  `/cross_domain_handoffs?source_domain_id=eq.${SWP_ID}&select=source_domain_id,target_domain_id,data_object_id,trigger_event`,
);
const existingHoSet = new Set(
  [...inbound, ...outbound].map(
    r => `${r.source_domain_id}|${r.target_domain_id}|${r.data_object_id}|${r.trigger_event}`,
  ),
);

const handoffsToInsert = handoffs.filter(
  h => !existingHoSet.has(`${h.source_domain_id}|${h.target_domain_id}|${h.data_object_id}|${h.trigger_event}`),
);

if (handoffsToInsert.length > 0) {
  console.log(`  /cross_domain_handoffs: inserting ${handoffsToInsert.length} new handoffs`);
  await insertChunked("/cross_domain_handoffs", handoffsToInsert);
} else {
  console.log(`  /cross_domain_handoffs: all SWP handoffs already present`);
}

// =============================================================================
// SUMMARY
// =============================================================================
console.log("\n=== Summary ===");
const domCount = (await get(`/domains?domain_code=eq.SWP&select=id`)).length;
const vendCount = (await get(`/vendors?vendor_name=in.(eQ8,OrgVue)&select=id`)).length;
const solCount = (await get(`/solutions?solution_name=in.(eQ8,OrgVue,Visier%20Plan)&select=id`)).length;
const sdCount = (await get(`/solution_domains?domain_id=eq.${SWP_ID}&select=id`)).length;
const doCount = (await get(`/data_objects?data_object_name=in.(${swpDataObjects.map(o => o.data_object_name).join(",")})&select=id`)).length;
const ddoCount = (await get(`/domain_data_objects?domain_id=eq.${SWP_ID}&select=id`)).length;
const jrMasters = (await get(`/domain_data_objects?data_object_id=eq.${JOB_REQ_ID}&role=eq.master&select=domain_id`)).length;
const hoIn = (await get(`/cross_domain_handoffs?target_domain_id=eq.${SWP_ID}&select=id`)).length;
const hoOut = (await get(`/cross_domain_handoffs?source_domain_id=eq.${SWP_ID}&select=id`)).length;

console.log(`  SWP domain row:                       ${domCount}/1`);
console.log(`  new vendors (2 pure-plays):           ${vendCount}/2`);
console.log(`  new solutions:                        ${solCount}/3`);
console.log(`  solution_domains on SWP:              ${sdCount}/9`);
console.log(`  data_objects (8 SWP-owned):           ${doCount}/8`);
console.log(`  domain_data_objects (SWP master):     ${ddoCount}/9   (8 SWP-owned + 1 co-master on job_requisitions)`);
console.log(`  job_requisitions master count:        ${jrMasters}/2  (ATS + SWP — first multi-master row)`);
console.log(`  inbound handoffs to SWP:              ${hoIn}/4`);
console.log(`  outbound handoffs from SWP:           ${hoOut}/3`);

console.log("\nUI:");
console.log("  https://tests.semantius.app/domain_map/domains");
console.log("  https://tests.semantius.app/domain_map/solutions");
console.log(`  https://tests.semantius.app/domain_map/solution_domains?domain_id=eq.${SWP_ID}`);
console.log("  https://tests.semantius.app/domain_map/data_objects");
console.log(`  https://tests.semantius.app/domain_map/domain_data_objects?data_object_id=eq.${JOB_REQ_ID}  (the multi-master row)`);
console.log("  https://tests.semantius.app/domain_map/cross_domain_handoffs");
