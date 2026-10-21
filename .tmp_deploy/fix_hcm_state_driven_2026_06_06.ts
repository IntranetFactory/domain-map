#!/usr/bin/env bun
// State-driven HCM audit execute pass (domain-map-analyst Validate, Rule #21).
// 2026-06-06 bulk batch. Idempotent: reads live before every write, inserts only
// missing, never overwrites a non-empty value. record_status omitted (defaults 'new').
//
// Executes:
//   1. B1A-ENTITY-TYPE  - PATCH entity_type on 6 HCM masters (was 'unclassified').
//   2. Rule #20 catalog UX - author empty catalog_tagline/catalog_description on the
//                            HCM domain row + 3 modules (only where empty).
//   3. B1A-S7            - INSERT 3 consumer+optional DMDO rows on HCM-CORE-WORKER (54)
//                            for PSA-mastered project_assignments(218),
//                            project_resource_allocations(726), resource_skill_inventories(725).
//   4. B1A-S6 / H1       - INSERT agent_curated handoff_processes for clean-match untagged
//                            cross-domain handoffs. PCF process_ids resolved live below.

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
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });
async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
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

// ============================================================
// 1. B1A-ENTITY-TYPE: classify the 6 HCM masters (Rule #12 enum)
// ============================================================
const entityTypes: Record<number, string> = {
  31: "operational_workflow", // employees: hire/active/on_leave/suspended/terminated
  32: "operational_workflow", // hcm_positions: proposed/approved/open/filled/frozen/eliminated
  33: "catalog",              // job_profiles: job-catalog definition w/ draft/approved/active/retired publishing flow
  34: "operational_workflow", // org_units: draft/active/reorganized/closed structural workflow
  35: "operational_workflow", // employment_contracts: draft/submitted/approved/signed/terminated/superseded
  36: "operational_workflow", // employment_events: draft/submitted/approved/posted (+rejected/reversed) approval flow
};
async function fixEntityTypes() {
  console.log("\n== 1. entity_type classification ==");
  const live = await get(`/data_objects?id=in.(31,32,33,34,35,36)&select=id,data_object_name,entity_type`);
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const want = entityTypes[id];
    const cur = String(r.entity_type ?? "");
    if (cur === "unclassified" || cur === "" || cur === "null") {
      await patch(`/data_objects?id=eq.${id}`, { entity_type: want });
      console.log(`  PATCH data_object ${id} ${r.data_object_name}: ${cur} -> ${want}`);
      patched++;
    } else if (cur !== want) {
      console.log(`  SKIP data_object ${id} ${r.data_object_name}: already '${cur}' (non-default, not overwriting)`);
    } else {
      console.log(`  ok data_object ${id} ${r.data_object_name}: already '${cur}'`);
    }
  }
  console.log(`  entity_type patched: ${patched}`);
}

// ============================================================
// 2. Rule #20 catalog UX: empty catalog_tagline / catalog_description only
// ============================================================
const domainCopy = {
  tagline:
    "Run the single source of truth for your workforce, from the employee record to org structure, positions, and the full hire-to-retire lifecycle.",
  description:
    "Human Capital Management is the system of record for your people. Maintain every worker's core profile, employment contracts, and the org structure they sit in, then drive each change through a governed workflow: hiring, transfers, promotions, leaves of absence, and offboarding. Self-service lets employees and managers raise and track their own changes while HR retains approval control.\n\nBecause the worker record is authoritative, the lifecycle events you record here ripple cleanly downstream: a new hire provisions access and payroll, a termination recalls assets and closes accounts, a promotion updates compensation. You define jobs and positions once, plan headcount against them, and keep compliance evidence in step with the regulations that apply to your workforce.",
};
const moduleCopy: Record<number, { tagline: string; description: string }> = {
  54: {
    tagline:
      "Maintain the authoritative worker record, employment contracts, and the personal data the rest of HR depends on.",
    description:
      "The core worker module is where every employee profile lives: identity, status, manager, position, org unit, and the employment contracts that bind them. Capture each worker from pre-hire through active employment to termination, with personal-content fields protected by the access controls a workforce of record requires.\n\nKeep contracts and core attributes current and let downstream systems read from a single trusted source. When a worker is hired, promoted, or leaves, this module is the event that triggers payroll, access provisioning, benefits, and asset recall, so the data here stays clean and the handoffs stay reliable.",
  },
  55: {
    tagline:
      "Design your organization: build the job catalog, define positions, and shape the org structure headcount planning runs on.",
    description:
      "The org and positions module is where you model the shape of the organization rather than the people in it. Author and publish job profiles, approve and open positions against budgeted headcount, and maintain the org-unit hierarchy through creation, reorganization, merges, and closures.\n\nThis is the planning surface that recruiting, compensation, and workforce planning all consume. Publishing a job profile opens the door to a requisition; approving a position signals where to hire; reorganizing a unit cascades to access and reporting lines. Get the structure right here and every downstream people process inherits a clean foundation.",
  },
  56: {
    tagline:
      "Move people through the moments that matter: onboarding, job and leave changes, and a coordinated offboarding.",
    description:
      "The lifecycle workflows module orchestrates the transitions in an employee's journey. Reconcile new hires arriving from recruiting into active workers, route everyday change requests like transfers and leaves of absence, and coordinate a clean offboarding across IT, identity, and payroll.\n\nEmployees and managers drive much of this themselves through self-service, while HR keeps oversight. Each step reads from and writes back to the authoritative worker record, so a completed onboarding, an approved leave, or a finished separation lands consistently everywhere it needs to without manual rekeying.",
  },
};
async function fixCatalogUX() {
  console.log("\n== 2. Rule #20 catalog UX ==");
  // Domain row (domains.id = 54)
  const [dom] = await get(`/domains?id=eq.54&select=id,catalog_tagline,catalog_description`);
  const dPatch: Row = {};
  if (!String(dom.catalog_tagline ?? "").trim()) dPatch.catalog_tagline = domainCopy.tagline;
  if (!String(dom.catalog_description ?? "").trim()) dPatch.catalog_description = domainCopy.description;
  if (Object.keys(dPatch).length) {
    await patch(`/domains?id=eq.54`, dPatch);
    console.log(`  PATCH domain 54: wrote ${Object.keys(dPatch).join(", ")}`);
  } else {
    console.log(`  domain 54: catalog copy already present, skipped`);
  }
  // Modules
  const mods = await get(`/domain_modules?domain_id=eq.54&select=id,domain_module_code,catalog_tagline,catalog_description`);
  for (const m of mods) {
    const id = Number(m.id);
    const copy = moduleCopy[id];
    if (!copy) continue;
    const mPatch: Row = {};
    if (!String(m.catalog_tagline ?? "").trim()) mPatch.catalog_tagline = copy.tagline;
    if (!String(m.catalog_description ?? "").trim()) mPatch.catalog_description = copy.description;
    if (Object.keys(mPatch).length) {
      await patch(`/domain_modules?id=eq.${id}`, mPatch);
      console.log(`  PATCH module ${id} ${m.domain_module_code}: wrote ${Object.keys(mPatch).join(", ")}`);
    } else {
      console.log(`  module ${id} ${m.domain_module_code}: catalog copy already present, skipped`);
    }
  }
}

// ============================================================
// 3. B1A-S7: 3 consumer+optional DMDO rows on HCM-CORE-WORKER (54)
// ============================================================
async function fixPsaDmdos() {
  console.log("\n== 3. B1A-S7 PSA consumer DMDOs on module 54 ==");
  const targets = [218, 726, 725]; // project_assignments, project_resource_allocations, resource_skill_inventories
  const existing = await get(
    `/domain_module_data_objects?domain_module_id=eq.54&data_object_id=in.(${targets.join(",")})&select=data_object_id`,
  );
  const have = new Set(existing.map(r => Number(r.data_object_id)));
  const rows = targets
    .filter(t => !have.has(t))
    .map(t => ({ domain_module_id: 54, data_object_id: t, role: "consumer", necessity: "optional" }));
  if (rows.length) {
    await insert("/domain_module_data_objects", rows);
    console.log(`  inserted ${rows.length} consumer DMDO rows for data_objects ${rows.map(r => r.data_object_id).join(", ")}`);
  } else {
    console.log(`  all 3 PSA consumer DMDO rows already present`);
  }
}

// ============================================================
// 4. B1A-S6 / H1: clean-match agent_curated handoff_processes
//    (handoff_id -> process_id). Only clean PCF matches; weak/no-match handoffs
//    are deferred-to-Discover (reported, not written).
// ============================================================
const h1Tags: Array<{ handoff_id: number; process_id: number; why: string }> = [
  // Payroll feed (PCF 236 Administer Payroll)
  { handoff_id: 377, process_id: 236, why: "HCM->PAYROLL employment_event.recorded" },
  { handoff_id: 380, process_id: 236, why: "HCM->PAYROLL employment_contract.executed" },
  { handoff_id: 383, process_id: 236, why: "HCM->PAYROLL employment_contract.expired" },
  { handoff_id: 412, process_id: 236, why: "PAYROLL->HCM pay_cycle.closed" },
  { handoff_id: 1154, process_id: 236, why: "PAYROLL->HCM pay_slip.published" },
  // Compensation/rewards (PCF 1046 Administer compensation and rewards to employees)
  { handoff_id: 381, process_id: 1046, why: "HCM->COMP-MGMT employment_contract.executed" },
  { handoff_id: 385, process_id: 1046, why: "HCM->COMP-MGMT hcm_position.approved_for_creation" },
  { handoff_id: 387, process_id: 1046, why: "HCM->COMP-MGMT job_profile.published" },
  { handoff_id: 106, process_id: 1046, why: "COMP-MGMT->HCM merit_cycle.approved (employees)" },
  { handoff_id: 422, process_id: 1046, why: "COMP-MGMT->HCM merit_cycle.approved (merit_recommendations)" },
  // Org design (PCF 97 Create organizational design) - matches established 1177-1190 convention
  { handoff_id: 389, process_id: 97, why: "HCM->IGA org_unit.created" },
  { handoff_id: 391, process_id: 97, why: "HCM->IGA org_unit.merged" },
  { handoff_id: 392, process_id: 97, why: "HCM->IGA org_unit.disbanded" },
  { handoff_id: 459, process_id: 97, why: "SWP->HCM org_design.published" },
  // Workforce analytics (PCF 247 Develop workforce analytics) - established PA sibling tag
  { handoff_id: 21, process_id: 247, why: "HCM->PA employment_event.recorded" },
  { handoff_id: 449, process_id: 247, why: "PA->HCM attrition_risk.high" },
  { handoff_id: 1103, process_id: 247, why: "PA->HCM people_kpi.snapshot_published" },
  { handoff_id: 1111, process_id: 247, why: "PA->HCM attrition_risk.elevated" },
  // Employee assistance & retention (PCF 235) - established EMP-EXP sibling tag
  { handoff_id: 116, process_id: 235, why: "EMP-EXP->HCM attrition_risk.high" },
  // Performance / career (PCF 225 Manage employee performance; 226 career development)
  { handoff_id: 438, process_id: 225, why: "TALENT-MGMT->HCM performance_goal.completed" },
  { handoff_id: 441, process_id: 226, why: "TALENT-MGMT->HCM high_potential.identified" },
  // Onboarding (PCF 222 Manage new hire/re-hire) - established sibling 1037
  { handoff_id: 410, process_id: 222, why: "ONBOARDING->HCM onboarding_document_collection.completed" },
  // Benefits (PCF 1052 Administer benefit enrollment) - established siblings 122/379
  { handoff_id: 418, process_id: 1052, why: "BEN-ADMIN->HCM life_event.approved" },
  // Strategic workforce planning (PCF 980 Perform strategic workforce planning)
  { handoff_id: 15, process_id: 980, why: "SWP->HCM hcm_position.approved_for_creation" },
  { handoff_id: 454, process_id: 980, why: "SWP->HCM position_demand_forecast.updated" },
  { handoff_id: 457, process_id: 980, why: "SWP->HCM workforce_scenario.approved" },
  // Master data (PCF 771 Maintain master data)
  { handoff_id: 274, process_id: 771, why: "MDM->HCM employee_golden_record.created" },
  { handoff_id: 718, process_id: 771, why: "MDM->HCM source_record.merged_to_golden" },
  // Regulatory compliance (PCF 369 Manage regulatory compliance) - established siblings 1047/1313/1314
  { handoff_id: 842, process_id: 369, why: "GRC->HCM policy_attestation.required" },
];
// Deferred-to-Discover (no clean HR-vocabulary PCF for access provisioning/deprovisioning):
//   378 HCM->IGA employment_event.recorded, 382 HCM->IGA employment_contract.expired.

async function fixH1Tags() {
  console.log("\n== 4. B1A-S6 / H1 agent_curated handoff_processes ==");
  const ids = h1Tags.map(t => t.handoff_id);
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${ids.join(",")})&select=handoff_id,process_id`,
  );
  const have = new Set(existing.map(r => `${r.handoff_id}|${r.process_id}`));
  const rows = h1Tags
    .filter(t => !have.has(`${t.handoff_id}|${t.process_id}`))
    .map(t => ({
      handoff_id: t.handoff_id,
      process_id: t.process_id,
      proposal_source: "agent_curated",
      role: "implements",
    }));
  if (rows.length) {
    await insert("/handoff_processes", rows);
    console.log(`  inserted ${rows.length} agent_curated handoff_processes rows`);
  } else {
    console.log(`  all clean-match handoff_processes rows already present`);
  }
  console.log(`  (skipped duplicates: ${h1Tags.length - rows.length})`);
}

// ============================================================
// run
// ============================================================
await fixEntityTypes();
await fixCatalogUX();
await fixPsaDmdos();
await fixH1Tags();

console.log("\n== UI links ==");
console.log("https://tests.semantius.app/domain_map/data_objects?id=in.(31,32,33,34,35,36)");
console.log("https://tests.semantius.app/domain_map/domains?id=eq.54");
console.log("https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.54");
console.log("https://tests.semantius.app/domain_map/domain_module_data_objects?domain_module_id=eq.54");
console.log("https://tests.semantius.app/domain_map/handoff_processes");
console.log("\nDone.");
