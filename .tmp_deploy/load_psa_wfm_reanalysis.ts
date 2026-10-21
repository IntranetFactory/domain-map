#!/usr/bin/env bun
// Reanalysis of PSA & WFM:
//   1. Replicon solution dedup
//   2. Phase-B consumer rows (HCM->WFM, HCM/CRM/CLM/EXPENSE->PSA, WFM->HCM/PAYROLL absences)
//   3. Cross-domain handoffs (6 new rows)
//   4. PSA flagship suite coverage (NetSuite, S/4HANA, new Oracle Fusion Cloud PPM)
//
// IDs hard-coded from a fresh read in the conversation; insert paths use only
// natural keys / FKs. Idempotency: every insert is preceded by a read against
// a unique combination, missing rows only.

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

// ---- IDs (verified pre-run) ----
const D = {
  PSA: 68,
  WFM: 59,
  HCM: 54,
  CRM: 69,
  CLM: 26,
  EXPENSE: 67,
  SWP: 100,
  PAYROLL: 55,
};
const OBJ = {
  workforce_cost_projections: 30,
  employees: 31,
  positions: 32,
  job_profiles: 33,
  org_units: 34,
  contracts: 66,
  opportunities: 100,
  expense_reports: 210,
  absence_requests: 163,
  time_entries: 162,
};
const SOL = {
  Replicon: 254,
  Replicon_PSA: 294,
  Oracle_NetSuite: 273,
  SAP_S4HANA: 271,
};
const VEND = {
  Oracle: 110,
};
const SD = {
  Replicon_WFM_primary: 338,
  Replicon_PSA_secondary: 339,
  ReplicaonPSA_PSA_primary: 384,
};

// ============================================================
// STEP 1 — Replicon dedup
// ============================================================
console.log("STEP 1 — Replicon dedup");

// Promote Replicon→PSA from secondary to primary first (so we never have zero coverage rows on PSA during the operation)
console.log("  promoting Replicon→PSA from secondary to primary");
await call({
  method: "PATCH",
  path: `/solution_domains?id=eq.${SD.Replicon_PSA_secondary}`,
  body: { coverage_level: "primary" },
});

// Delete the duplicate solution_domains row for Replicon PSA→PSA primary
console.log("  deleting solution_domains row for Replicon PSA → PSA");
await call({
  method: "DELETE",
  path: `/solution_domains?id=eq.${SD.ReplicaonPSA_PSA_primary}`,
});

// Delete the Replicon PSA solution itself
console.log("  deleting Replicon PSA solution");
await call({
  method: "DELETE",
  path: `/solutions?id=eq.${SOL.Replicon_PSA}`,
});

// ============================================================
// STEP 2 — Consumer rows on domain_data_objects
// ============================================================
console.log("STEP 2 — Phase-B consumer rows");

const consumerRows: Row[] = [
  // WFM consumes HCM masters
  { domain_id: D.WFM, data_object_id: OBJ.employees, role: "consumer", notes: "WFM consumes employees as the schedulable resource pool — identity, employment status, and base FTE drive shift eligibility." },
  { domain_id: D.WFM, data_object_id: OBJ.positions, role: "consumer", notes: "WFM consumes positions to enforce position-based scheduling rules: required skills, location, cost-centre, and FTE budget per position." },
  { domain_id: D.WFM, data_object_id: OBJ.job_profiles, role: "consumer", notes: "WFM consumes job_profiles for skill/qualification matching when filling open shifts and for labour-law rules tied to job class." },
  { domain_id: D.WFM, data_object_id: OBJ.org_units, role: "consumer", notes: "WFM consumes org_units (locations, departments) as the scheduling hierarchy — schedules are published per org_unit." },
  // PSA consumers
  { domain_id: D.PSA, data_object_id: OBJ.employees, role: "consumer", notes: "PSA consumes employees as the consultant pool for resource staffing and utilisation tracking." },
  { domain_id: D.PSA, data_object_id: OBJ.job_profiles, role: "consumer", notes: "PSA consumes job_profiles for skill-based staffing — matching project skill requirements to consultant qualifications." },
  { domain_id: D.PSA, data_object_id: OBJ.opportunities, role: "consumer", notes: "PSA consumes won opportunities (Closed Won) as the trigger to spin up a delivery project and seed staffing demand." },
  { domain_id: D.PSA, data_object_id: OBJ.contracts, role: "consumer", notes: "PSA consumes signed SOWs (CLM-mastered) to seed project scope, billing rules, and milestone definitions." },
  { domain_id: D.PSA, data_object_id: OBJ.expense_reports, role: "consumer", notes: "PSA consumes project-tagged expense_reports for T&E billing rollup and project-cost reporting." },
  // WFM-mastered absences consumed by HCM & PAYROLL
  { domain_id: D.HCM, data_object_id: OBJ.absence_requests, role: "consumer", notes: "HCM consumes approved absence_requests to update PTO balances and tenure-related accruals." },
  { domain_id: D.PAYROLL, data_object_id: OBJ.absence_requests, role: "consumer", notes: "PAYROLL consumes approved absence_requests as paid-leave hours feeding the pay cycle." },
];

// Idempotency: read existing (domain_id, data_object_id, role) tuples first
const existingDDO = await call({
  method: "GET",
  path: "/domain_data_objects?select=domain_id,data_object_id,role&domain_id=in.(59,68,54,55)&role=eq.consumer&limit=2000",
});
const ddoKey = (r: Row) => `${r.domain_id}|${r.data_object_id}|${r.role}`;
const existingDDOKeys = new Set(existingDDO.map(ddoKey));
const newConsumerRows = consumerRows.filter(r => !existingDDOKeys.has(ddoKey(r)));
console.log(`  inserting ${newConsumerRows.length} of ${consumerRows.length} consumer rows`);
if (newConsumerRows.length > 0) {
  await call({ method: "POST", path: "/domain_data_objects", body: newConsumerRows });
}

// ============================================================
// STEP 3 — Cross-domain handoffs
// ============================================================
console.log("STEP 3 — Cross-domain handoffs");

const handoffRows: Row[] = [
  { source_domain_id: D.HCM, target_domain_id: D.WFM, data_object_id: OBJ.employees, trigger_event: "employee.created", integration_pattern: "event_stream", friction_level: "low", description: "New employee provisioned in HCM becomes a schedulable resource in WFM — identity, position, base FTE. Mid-shift onboarding and badge-binding are typical edge cases." },
  { source_domain_id: D.WFM, target_domain_id: D.HCM, data_object_id: OBJ.absence_requests, trigger_event: "absence.approved", integration_pattern: "event_stream", friction_level: "medium", description: "Approved absence_requests update PTO balances in HCM; tenure-based accruals and country-specific carry-over rules apply (US PTO, UK statutory, German Urlaub, French Congés Payés)." },
  { source_domain_id: D.WFM, target_domain_id: D.SWP, data_object_id: OBJ.time_entries, trigger_event: "actuals.posted", integration_pattern: "batch_sync", friction_level: "medium", description: "Period actuals from WFM feed Strategic Workforce Planning plan-vs-actual. Coding mismatches between WFM cost-centres and SWP plan units cause reconciliation pain." },
  { source_domain_id: D.CRM, target_domain_id: D.PSA, data_object_id: OBJ.opportunities, trigger_event: "opportunity.closed_won", integration_pattern: "api_call", friction_level: "high", description: "Closed-Won deal triggers PSA project creation. High friction: deal terms in the opportunity rarely map cleanly to scope, staffing, and milestones; manual transcription is common (cross-vendor stack shape — CRM and PSA are typically different vendors)." },
  { source_domain_id: D.CLM, target_domain_id: D.PSA, data_object_id: OBJ.contracts, trigger_event: "contract.signed", integration_pattern: "api_call", friction_level: "medium", description: "Signed SOW seeds PSA project scope, billing terms, and milestone schedule. Deviations between contract terms and operational project structure require manual reconciliation." },
  { source_domain_id: D.EXPENSE, target_domain_id: D.PSA, data_object_id: OBJ.expense_reports, trigger_event: "expense.approved", integration_pattern: "event_stream", friction_level: "medium", description: "Project-tagged expense_reports flow to PSA for T&E billing rollup and project cost. Project-code errors and late corrections are recurring pain." },
];

// Idempotency: read existing (source, target, trigger) tuples
const existingHO = await call({
  method: "GET",
  path: "/cross_domain_handoffs?select=source_domain_id,target_domain_id,trigger_event&limit=5000",
});
const hoKey = (r: Row) => `${r.source_domain_id}|${r.target_domain_id}|${r.trigger_event}`;
const existingHOKeys = new Set(existingHO.map(hoKey));
const newHandoffRows = handoffRows.filter(r => !existingHOKeys.has(hoKey(r)));
console.log(`  inserting ${newHandoffRows.length} of ${handoffRows.length} handoff rows`);
if (newHandoffRows.length > 0) {
  await call({ method: "POST", path: "/cross_domain_handoffs", body: newHandoffRows });
}

// ============================================================
// STEP 4 — PSA flagship suite coverage
// ============================================================
console.log("STEP 4 — PSA flagship suite coverage");

// Insert new solution Oracle Fusion Cloud Project Management if absent
const existingOraclePPM = await call({
  method: "GET",
  path: "/solutions?select=id,solution_name&solution_name=eq.Oracle%20Fusion%20Cloud%20Project%20Management",
});
let oraclePPMId: number;
if (existingOraclePPM.length === 0) {
  console.log("  inserting Oracle Fusion Cloud Project Management");
  const inserted = await call({
    method: "POST",
    path: "/solutions",
    body: [{
      solution_name: "Oracle Fusion Cloud Project Management",
      vendor_id: VEND.Oracle,
      description: "Enterprise project portfolio management within Oracle Fusion Cloud — project financials, resource management, project planning. Distinct from Oracle NetSuite OpenAir which targets mid-market.",
    }],
    headers: { Prefer: "return=representation" },
  });
  oraclePPMId = Number(inserted[0].id);
} else {
  oraclePPMId = Number(existingOraclePPM[0].id);
  console.log(`  Oracle Fusion Cloud Project Management already exists (id ${oraclePPMId})`);
}

const newSolutionDomains: Row[] = [
  { solution_id: SOL.Oracle_NetSuite, domain_id: D.PSA, coverage_level: "primary" },
  { solution_id: SOL.SAP_S4HANA, domain_id: D.PSA, coverage_level: "secondary" },
  { solution_id: oraclePPMId, domain_id: D.PSA, coverage_level: "primary" },
];

const existingSD = await call({
  method: "GET",
  path: `/solution_domains?select=solution_id,domain_id&domain_id=eq.${D.PSA}`,
});
const sdKey = (r: Row) => `${r.solution_id}|${r.domain_id}`;
const existingSDKeys = new Set(existingSD.map(sdKey));
const sdToInsert = newSolutionDomains.filter(r => !existingSDKeys.has(sdKey(r)));
console.log(`  inserting ${sdToInsert.length} of ${newSolutionDomains.length} solution_domains rows for PSA`);
if (sdToInsert.length > 0) {
  await call({ method: "POST", path: "/solution_domains", body: sdToInsert });
}

console.log("DONE");
