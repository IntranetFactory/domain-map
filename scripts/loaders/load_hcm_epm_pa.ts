#!/usr/bin/env bun
// Load HCM, EPM, and PA data_objects in one batch, plus the multi-master rows
// that fall out (employees as 3-way master across HCM/Payroll/IGA being the
// flagship), plus the cross-domain handoffs that close the loop with the
// already-loaded ATS / SWP / Onboarding domains.
//
// Vendor / solution research is intentionally OUT OF SCOPE here — the relevant
// vendors are already in the catalog from prior loads. This file is about
// data_objects + multi-master signals + handoffs.
//
// Idempotent: every read uses a natural key, every write checks current state.

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
  if (code !== 0) throw new Error(`semantius call failed (exit ${code}): ${stderr}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}

const get = (path: string) => semCall({ method: "GET", path });
const post = (path: string, body: Row | Row[]) => semCall({ method: "POST", path, body });

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

// Resolve domain ids once up-front
const domainRows = await get(
  "/domains?domain_code=in.(ATS,EPM,HCM,HRSD,IGA,ITSM,IWMS,LMS,ONBOARDING,PA,PAYROLL,SWP,TALENT-MGMT)&select=id,domain_code",
);
const did = (code: string) => {
  const r = domainRows.find(d => d.domain_code === code);
  if (!r) throw new Error(`domain ${code} not loaded`);
  return Number(r.id);
};

// =============================================================================
// PHASE A — HCM data_objects
// =============================================================================
console.log("\n=== Phase A: HCM data_objects ===");

const hcmDataObjects = [
  {
    data_object_name: "employees",
    singular_label: "Employee",
    plural_label: "Employees",
    display_label: "Employee",
    description:
      "Canonical record of a person currently or formerly employed by the organization. Carries identity (legal name, contact, IDs), employment metadata (start date, end date, employment type, country), and pointers to position, job profile, org unit, manager, and life-event history. The most multi-mastered data object in the catalog: HCM masters the core HR slice, Payroll masters the comp/withholding slice, and IGA masters the identity/access slice. Onboarding, PA, and Talent Management consume or contribute.",
  },
  {
    data_object_name: "positions",
    singular_label: "Position",
    plural_label: "Positions",
    display_label: "Position",
    description:
      "Approved slot in the org — a 'chair' with role definition, cost center, reporting line, location, and FTE allocation. Distinct from job_profiles (the catalog definition) and from employees (the person filling the slot). A position can be open, filled, or eliminated. SWP designs future positions via org_designs; HCM operationalizes them once approved.",
  },
  {
    data_object_name: "job_profiles",
    singular_label: "Job Profile",
    plural_label: "Job Profiles",
    display_label: "Job Profile",
    description:
      "Canonical role definition in the job catalog: title, family, level, responsibilities, required skills and competencies, pay range, FLSA classification. Distinct from positions (which are slots referencing a profile). Many positions share a single job profile.",
  },
  {
    data_object_name: "org_units",
    singular_label: "Org Unit",
    plural_label: "Org Units",
    display_label: "Org Unit",
    description:
      "Node in the organizational hierarchy: division, business unit, department, team. Carries manager, cost center alignment, geographic scope, and parent/child relationships. HCM masters the operational hierarchy; EPM contributes the cost-center mapping (which would be Finance-mastered once a Finance/GL domain is loaded).",
  },
  {
    data_object_name: "employment_contracts",
    singular_label: "Employment Contract",
    plural_label: "Employment Contracts",
    display_label: "Employment Contract",
    description:
      "Contractual terms of employment: contract type (permanent, fixed-term, contractor, intern), start and end dates, governing jurisdiction, working hours, notice period, IP and non-compete clauses, references to the signed document. HCM masters; HRSD contributes when employee-relations cases reference contract terms.",
  },
  {
    data_object_name: "employment_events",
    singular_label: "Employment Event",
    plural_label: "Employment Events",
    display_label: "Employment Event",
    description:
      "Lifecycle event records for an employee: hire, promotion, transfer, leave start, leave return, comp change, termination. The audit history that drives plan-vs-actual analytics (PA consumer) and downstream system updates. HCM masters; PA derives metrics from the event stream.",
  },
];

const dataObjMap = await syncByKey("/data_objects", hcmDataObjects, "data_object_name");

// HCM master links
const existingDDO_HCM = await get(
  `/domain_data_objects?domain_id=eq.${did("HCM")}&select=data_object_id&limit=10000`,
);
const existingHCMSet = new Set(existingDDO_HCM.map(r => Number(r.data_object_id)));
const hcmMasterRows = hcmDataObjects
  .map(o => dataObjMap.get(o.data_object_name)!)
  .filter(id => !existingHCMSet.has(id))
  .map(id => ({ domain_id: did("HCM"), data_object_id: id, role: "master", notes: "" }));
if (hcmMasterRows.length > 0) {
  console.log(`  /domain_data_objects: inserting ${hcmMasterRows.length} HCM-master links`);
  await insertChunked("/domain_data_objects", hcmMasterRows);
}

// =============================================================================
// PHASE B — EPM data_objects
// =============================================================================
console.log("\n=== Phase B: EPM data_objects ===");

const epmDataObjects = [
  {
    data_object_name: "financial_plans",
    singular_label: "Financial Plan",
    plural_label: "Financial Plans",
    display_label: "Financial Plan",
    description:
      "Umbrella entity for financial planning artifacts: annual budget, rolling forecast, long-range plan (LRP). Carries planning period, version, approval state, and pointers to the line-item budgets, forecasts, and variances that compose it. Consumes workforce_cost_projections from SWP for the people-cost line.",
  },
  {
    data_object_name: "budgets",
    singular_label: "Budget",
    plural_label: "Budgets",
    display_label: "Budget",
    description:
      "Approved annual or quarterly budget by org unit, cost center, account, and period. Once approved, drives spend authorisation downstream (procurement, headcount, capex). Plan-vs-actual variance is the operational output.",
  },
  {
    data_object_name: "forecasts",
    singular_label: "Forecast",
    plural_label: "Forecasts",
    display_label: "Forecast",
    description:
      "Rolling forecast records (typically monthly or quarterly refresh): updated view of expected revenue, cost, and headcount given current actuals. Distinct from the static budget. Refreshing forecasts upstream of SWP triggers workforce plan re-alignment.",
  },
  {
    data_object_name: "financial_scenarios",
    singular_label: "Financial Scenario",
    plural_label: "Financial Scenarios",
    display_label: "Financial Scenario",
    description:
      "What-if financial models layered on top of a base plan: revenue upside / downside cases, cost-cutting scenarios, M&A scenarios. Mirrors the structure of SWP's workforce_scenarios for the financial dimension; the two are usually linked via the cost projection.",
  },
  {
    data_object_name: "variance_analyses",
    singular_label: "Variance Analysis",
    plural_label: "Variance Analysises",
    display_label: "Variance Analysis",
    description:
      "Actual-vs-plan reconciliation records: account, period, planned amount, actual amount, variance, and root-cause commentary. The operational analytic output of EPM; consumed by org leaders, FP&A, and PA (when variance touches people cost).",
  },
];

const epmObjMap = await syncByKey("/data_objects", epmDataObjects, "data_object_name");
for (const [k, v] of epmObjMap) dataObjMap.set(k, v);

const existingDDO_EPM = await get(
  `/domain_data_objects?domain_id=eq.${did("EPM")}&select=data_object_id&limit=10000`,
);
const existingEPMSet = new Set(existingDDO_EPM.map(r => Number(r.data_object_id)));
const epmMasterRows = epmDataObjects
  .map(o => dataObjMap.get(o.data_object_name)!)
  .filter(id => !existingEPMSet.has(id))
  .map(id => ({ domain_id: did("EPM"), data_object_id: id, role: "master", notes: "" }));
if (epmMasterRows.length > 0) {
  console.log(`  /domain_data_objects: inserting ${epmMasterRows.length} EPM-master links`);
  await insertChunked("/domain_data_objects", epmMasterRows);
}

// =============================================================================
// PHASE C — PA data_objects
// =============================================================================
console.log("\n=== Phase C: PA data_objects ===");

const paDataObjects = [
  {
    data_object_name: "attrition_forecasts",
    singular_label: "Attrition Forecast",
    plural_label: "Attrition Forecasts",
    display_label: "Attrition Forecast",
    description:
      "Forecast of voluntary and involuntary attrition over a planning horizon, typically broken down by org unit × tenure × performance band × geography. Derived from historical patterns and predictive models; consumed by SWP to update plan assumptions (the canonical attrition.forecast_updated handoff).",
  },
  {
    data_object_name: "people_kpis",
    singular_label: "People KPI",
    plural_label: "People KPIs",
    display_label: "People KPI",
    description:
      "Calculated workforce KPIs and metrics: time-to-fill, attrition rate, retention rate, span-of-control, internal-mobility rate, training completion rate, cost-per-hire, time-to-productivity. Derived from HCM, ATS, LMS, Payroll event streams. PA is the master of the calculated KPI definitions and the materialized metric values; source systems master the underlying events.",
  },
  {
    data_object_name: "workforce_segments",
    singular_label: "Workforce Segment",
    plural_label: "Workforce Segments",
    display_label: "Workforce Segment",
    description:
      "Named cohort definitions used for analysis and intervention: hi-po, flight-risk, top-quartile-performer, early-career, returning-from-leave, regrettable-loss-risk. Drives Talent Mgmt programs (high_potential.identified is the canonical outbound handoff) and HR Service Delivery actions.",
  },
  {
    data_object_name: "engagement_surveys",
    singular_label: "Engagement Survey",
    plural_label: "Engagement Surveys",
    display_label: "Engagement Survey",
    description:
      "Employee engagement, pulse, and sentiment survey responses. Mastered by PA (or by a specialised engagement vendor when used — Culture Amp, Qualtrics EmployeeXM, Workday Peakon). Drives segment-level engagement scoring and intervention triggers.",
  },
  {
    data_object_name: "predictive_models",
    singular_label: "Predictive Model",
    plural_label: "Predictive Models",
    display_label: "Predictive Model",
    description:
      "ML / statistical model outputs deployed in PA: flight-risk scores, performance trajectory, internal-mobility likelihood. Carries the model identifier, training window, target metric, and the materialized scores per employee. Consumes employees and employment_events as features.",
  },
];

const paObjMap = await syncByKey("/data_objects", paDataObjects, "data_object_name");
for (const [k, v] of paObjMap) dataObjMap.set(k, v);

const existingDDO_PA = await get(
  `/domain_data_objects?domain_id=eq.${did("PA")}&select=data_object_id&limit=10000`,
);
const existingPASet = new Set(existingDDO_PA.map(r => Number(r.data_object_id)));
const paMasterRows = paDataObjects
  .map(o => dataObjMap.get(o.data_object_name)!)
  .filter(id => !existingPASet.has(id))
  .map(id => ({ domain_id: did("PA"), data_object_id: id, role: "master", notes: "" }));
if (paMasterRows.length > 0) {
  console.log(`  /domain_data_objects: inserting ${paMasterRows.length} PA-master links`);
  await insertChunked("/domain_data_objects", paMasterRows);
}

// =============================================================================
// PHASE D — multi-master Signal-1 rows
// =============================================================================
console.log("\n=== Phase D: multi-master Signal-1 rows ===");

// Each row: (data_object_name, domain_code, role, notes)
const multiMaster = [
  // employees — 3-way master + consumers
  {
    data_object_name: "employees",
    domain: "PAYROLL",
    role: "master",
    notes:
      "Comp / withholding / payable slice — gross-to-net rules, deductions, tax setup, bank account, pay history. HCM masters the core HR record, Payroll masters the payable view, IGA masters the identity view.",
  },
  {
    data_object_name: "employees",
    domain: "IGA",
    role: "master",
    notes:
      "Identity / access slice — directory account, group memberships, role assignments, entitlements, last-login. HCM masters the core HR record, Payroll masters the payable view, IGA masters the identity view.",
  },
  {
    data_object_name: "employees",
    domain: "PA",
    role: "consumer",
    notes:
      "Read-only — derives KPIs and cohorts from the canonical record. Does not author any slice.",
  },
  {
    data_object_name: "employees",
    domain: "ONBOARDING",
    role: "contributor",
    notes:
      "Writes onboarding-state fields (pre-board start, Day-1 reached, milestones) during the journey window. Does not master core HR fields.",
  },
  {
    data_object_name: "employees",
    domain: "TALENT-MGMT",
    role: "contributor",
    notes:
      "Writes talent-specific fields (career aspirations, mobility preferences, succession status) but does not master the core HR record.",
  },
  // positions — HCM master, SWP contributor (the design slice)
  {
    data_object_name: "positions",
    domain: "SWP",
    role: "contributor",
    notes:
      "Contributes proposed positions via org_designs and headcount approvals; HCM operationalizes them as canonical position records. SWP does not master positions themselves — the intent lives in org_designs.",
  },
  // org_units — HCM master, EPM contributor
  {
    data_object_name: "org_units",
    domain: "EPM",
    role: "contributor",
    notes:
      "Cost-center alignment slice. EPM contributes the financial mapping that org_units need to support variance reporting. (A future Finance/GL domain would master cost_centers proper.)",
  },
  // job_profiles — HCM master, Talent Mgmt contributor (skills/competencies)
  {
    data_object_name: "job_profiles",
    domain: "TALENT-MGMT",
    role: "contributor",
    notes:
      "Contributes the skills/competencies slice — the required capability profile for the role, used in succession and internal-mobility matching. HCM masters the operational profile.",
  },
  // employment_events — HCM master, PA consumer
  {
    data_object_name: "employment_events",
    domain: "PA",
    role: "consumer",
    notes:
      "Reads the event stream to compute time-based metrics (tenure, time-in-level, time-to-promotion).",
  },
  // job_requisitions — already ATS master + SWP master; add ATS-side note refinement only if needed (already done in SWP load)
  // financial_plans — EPM master, SWP contributor (workforce side already feeds in)
  {
    data_object_name: "financial_plans",
    domain: "SWP",
    role: "contributor",
    notes:
      "Workforce cost contribution — workforce_cost_projections feed the people-cost line of the financial plan via the cost_projection.approved handoff.",
  },
  // people_kpis — PA master, but many domains consume
  {
    data_object_name: "people_kpis",
    domain: "HCM",
    role: "consumer",
    notes: "Surfaces operational HR KPIs in manager and HR-business-partner views.",
  },
  {
    data_object_name: "people_kpis",
    domain: "SWP",
    role: "consumer",
    notes: "Consumes attrition rate, fill rate, span-of-control to update plan assumptions.",
  },
];

const existingMM = await get(
  "/domain_data_objects?select=domain_id,data_object_id,role&limit=20000",
);
const existingMMKey = new Set(
  existingMM.map(r => `${r.domain_id}|${r.data_object_id}`),
);

const mmRows = multiMaster
  .map(m => {
    const objId = dataObjMap.get(m.data_object_name);
    if (!objId) {
      console.warn(`  ! data_object missing: ${m.data_object_name}`);
      return null;
    }
    return {
      domain_id: did(m.domain),
      data_object_id: objId,
      role: m.role,
      notes: m.notes,
    };
  })
  .filter((r): r is Row => r !== null)
  .filter(r => !existingMMKey.has(`${r.domain_id}|${r.data_object_id}`));

if (mmRows.length > 0) {
  console.log(`  /domain_data_objects: inserting ${mmRows.length} multi-master / contributor / consumer rows`);
  await insertChunked("/domain_data_objects", mmRows);
} else {
  console.log(`  /domain_data_objects: all multi-master rows already present`);
}

// =============================================================================
// PHASE E — cross_domain_handoffs (Signal 2)
// =============================================================================
console.log("\n=== Phase E: cross_domain_handoffs ===");

function doid(name: string): number {
  const id = dataObjMap.get(name);
  if (!id) throw new Error(`data_object ${name} not loaded`);
  return id;
}

const handoffs = [
  // ATS → HCM: hired candidate becomes an employee
  {
    source_domain_id: did("ATS"),
    target_domain_id: did("HCM"),
    data_object_id: doid("employees"),
    trigger_event: "candidate.hired",
    integration_pattern: "event_stream",
    friction_level: "medium",
    description:
      "Candidate-to-employee conversion: hired candidate from ATS triggers employee-record creation in HCM. Field mapping (candidate → employee) is rarely perfect; missing fields (legal name spelling, work-eligibility detail, tax IDs) get collected in the Onboarding journey and back-filled into HCM.",
    notes: "",
  },
  // HCM → PAYROLL: employee.created triggers comp profile setup
  {
    source_domain_id: did("HCM"),
    target_domain_id: did("PAYROLL"),
    data_object_id: doid("employees"),
    trigger_event: "employee.created",
    integration_pattern: "api_call",
    friction_level: "medium",
    description:
      "New employee in HCM triggers comp profile activation in Payroll: gross-to-net rules selected by jurisdiction, deductions initialised, bank account and tax setup collected via Onboarding flow. Same trigger event as the HCM → Onboarding handoff; both subscribe to the employee.created event.",
    notes: "",
  },
  // HCM → IGA: employee.created triggers identity provisioning
  {
    source_domain_id: did("HCM"),
    target_domain_id: did("IGA"),
    data_object_id: doid("employees"),
    trigger_event: "employee.created",
    integration_pattern: "api_call",
    friction_level: "high",
    description:
      "New employee in HCM triggers directory account creation and birthright-role assignment in IGA. High friction because role-to-entitlement mappings drift per business unit, and IGA frequently needs additional context (cost center, manager, location) that arrives later in the journey. Same trigger event as the HCM → Onboarding and HCM → Payroll handoffs.",
    notes: "",
  },
  // HCM → ATS: termination triggers backfill consideration
  {
    source_domain_id: did("HCM"),
    target_domain_id: did("ATS"),
    data_object_id: doid("job_requisitions"),
    trigger_event: "employee.terminated",
    integration_pattern: "api_call",
    friction_level: "low",
    description:
      "Employee termination in HCM optionally triggers backfill requisition consideration in ATS. Low friction when SWP-driven; some orgs auto-open a backfill req on regrettable losses, others route through SWP for approval first.",
    notes: "",
  },
  // HCM → PA: event stream → derived KPIs
  {
    source_domain_id: did("HCM"),
    target_domain_id: did("PA"),
    data_object_id: doid("employment_events"),
    trigger_event: "employment_event.recorded",
    integration_pattern: "event_stream",
    friction_level: "low",
    description:
      "HCM publishes employment events (hire, promotion, transfer, leave, termination) onto a stream that PA consumes to refresh KPIs (tenure, time-in-level, mobility rate, attrition). Low friction because PA tools tend to be designed around this exact ingestion pattern.",
    notes: "",
  },
  // HCM → TALENT-MGMT: new employee → talent profile init
  {
    source_domain_id: did("HCM"),
    target_domain_id: did("TALENT-MGMT"),
    data_object_id: doid("employees"),
    trigger_event: "employee.created",
    integration_pattern: "api_call",
    friction_level: "low",
    description:
      "New employee triggers talent-profile initialisation in Talent Management: career aspirations, mobility preferences, skills profile stubs. Same employee.created trigger as Onboarding / Payroll / IGA handoffs.",
    notes: "",
  },
  // ATS → PA: requisition.filled → recruiting metric refresh
  {
    source_domain_id: did("ATS"),
    target_domain_id: did("PA"),
    data_object_id: doid("people_kpis"),
    trigger_event: "requisition.filled",
    integration_pattern: "event_stream",
    friction_level: "low",
    description:
      "Filled requisition events flow from ATS to PA for time-to-fill, source-of-hire, and offer-acceptance-rate KPI refresh. Same event drives the ATS → SWP handoff that updates demand forecasts.",
    notes: "",
  },
  // LMS → PA: training.completed → L&D metrics
  {
    source_domain_id: did("LMS"),
    target_domain_id: did("PA"),
    data_object_id: doid("people_kpis"),
    trigger_event: "training.completed",
    integration_pattern: "event_stream",
    friction_level: "low",
    description:
      "Training completion events from LMS update PA's L&D KPIs (completion rate, learning hours per employee, skill-gap closure). Also feeds skills_gap_analyses in SWP via PA.",
    notes: "",
  },
  // PAYROLL → PA: pay cycle closed → comp analytics
  {
    source_domain_id: did("PAYROLL"),
    target_domain_id: did("PA"),
    data_object_id: doid("people_kpis"),
    trigger_event: "pay_cycle.closed",
    integration_pattern: "batch_sync",
    friction_level: "medium",
    description:
      "Closed pay cycle from Payroll lands a snapshot in PA for compensation analytics: total comp by org / level / geo, gender pay-gap analysis, comp velocity. Batch because pay cycles are inherently periodic.",
    notes: "",
  },
  // PA → TALENT-MGMT: hi-po identification → talent program enrolment
  {
    source_domain_id: did("PA"),
    target_domain_id: did("TALENT-MGMT"),
    data_object_id: doid("workforce_segments"),
    trigger_event: "high_potential.identified",
    integration_pattern: "api_call",
    friction_level: "medium",
    description:
      "PA's predictive-model output identifies employees in the hi-po segment; this triggers their enrolment in Talent Management programs (succession slate, accelerated development, mentor assignment). Friction sits in keeping the hi-po definition consistent with the program criteria.",
    notes: "",
  },
  // EPM → SWP: rolling forecast refresh → plan re-alignment
  {
    source_domain_id: did("EPM"),
    target_domain_id: did("SWP"),
    data_object_id: doid("workforce_plans"),
    trigger_event: "forecast.refreshed",
    integration_pattern: "api_call",
    friction_level: "medium",
    description:
      "Rolling forecast refresh in EPM (typically monthly or quarterly) triggers SWP to re-evaluate plan assumptions and scenarios. Distinct from the annual budget.cycle_started trigger — this is the in-cycle refresh signal, finer-grained and lower friction.",
    notes: "",
  },
  // SWP → ONBOARDING: heads-up that approved headcount is coming
  // (debating — skip as it goes through ATS first. Don't add.)
];

const allHandoffs = await get(
  "/cross_domain_handoffs?select=source_domain_id,target_domain_id,data_object_id,trigger_event&limit=10000",
);
const handoffKey = (r: Row) =>
  `${r.source_domain_id}|${r.target_domain_id}|${r.data_object_id}|${r.trigger_event}`;
const existingHoSet = new Set(allHandoffs.map(handoffKey));
const handoffsToInsert = handoffs.filter(h => !existingHoSet.has(handoffKey(h)));

if (handoffsToInsert.length > 0) {
  console.log(`  /cross_domain_handoffs: inserting ${handoffsToInsert.length} new handoffs`);
  await insertChunked("/cross_domain_handoffs", handoffsToInsert);
} else {
  console.log(`  /cross_domain_handoffs: all already present`);
}

// =============================================================================
// SUMMARY + multi-master leaderboard
// =============================================================================
console.log("\n=== Summary ===");
const totalDO = (await get("/data_objects?select=id")).length;
const totalDDO = (await get("/domain_data_objects?select=id&limit=20000")).length;
const totalHO = (await get("/cross_domain_handoffs?select=id&limit=10000")).length;
console.log(`  total data_objects:           ${totalDO}`);
console.log(`  total domain_data_objects:    ${totalDDO}`);
console.log(`  total cross_domain_handoffs:  ${totalHO}`);

console.log("\nMulti-master leaderboard (data_objects with role=master count > 1):");
const masterRows = await get(
  "/domain_data_objects?role=eq.master&select=data_object_id&limit=20000",
);
const masterCount = new Map<number, number>();
for (const r of masterRows) {
  const id = Number(r.data_object_id);
  masterCount.set(id, (masterCount.get(id) ?? 0) + 1);
}
const multi = [...masterCount.entries()]
  .filter(([, c]) => c > 1)
  .sort((a, b) => b[1] - a[1]);
const objNames = await get(`/data_objects?id=in.(${multi.map(([id]) => id).join(",")})&select=id,data_object_name`);
const nameById = new Map(objNames.map(r => [Number(r.id), String(r.data_object_name)]));
for (const [id, c] of multi) {
  console.log(`  ${c}×  ${nameById.get(id)}`);
}

console.log("\nHandoff hotspots (top 5 domains by total handoff degree):");
const allHo = await get(
  "/cross_domain_handoffs?select=source_domain_id,target_domain_id&limit=10000",
);
const degree = new Map<number, number>();
for (const r of allHo) {
  degree.set(Number(r.source_domain_id), (degree.get(Number(r.source_domain_id)) ?? 0) + 1);
  degree.set(Number(r.target_domain_id), (degree.get(Number(r.target_domain_id)) ?? 0) + 1);
}
const topDeg = [...degree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
const allDoms = await get(`/domains?id=in.(${topDeg.map(([id]) => id).join(",")})&select=id,domain_code`);
const codeById = new Map(allDoms.map(r => [Number(r.id), String(r.domain_code)]));
for (const [id, c] of topDeg) {
  console.log(`  ${c}×  ${codeById.get(id)}`);
}

console.log("\nUI:");
console.log("  https://tests.semantius.app/domain_map/data_objects");
console.log("  https://tests.semantius.app/domain_map/domain_data_objects");
console.log("  https://tests.semantius.app/domain_map/cross_domain_handoffs");
