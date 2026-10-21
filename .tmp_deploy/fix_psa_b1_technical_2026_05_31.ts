#!/usr/bin/env bun
// PSA B1 technical fixes (subagent application, 2026-05-31).
//
// Applies the truly-technical Bucket 1 items from audits/PSA.md that need no
// human judgment:
//   - B1-S2: 5 intra-PSA cross-module handoffs (lifecycle_progression, low
//     friction). Reuses existing trigger_events 1170, 1167, 1166, 1162, 1229.
//   - B1-S4: data_object_aliases on the 6 PSA masters using `solution_term`
//     (alias_type enum has no `vendor_specific` value; flagship-vendor naming
//     is solution-specific by construction). Only loads aliases where the
//     naming vendor exists as a `solutions` row in the catalog.
//
// Deferred (gated on Bucket 2 / Bucket 3 / Rule constraints):
//   - B1-S1, B1-S8 (gated on B2-S3 architectural choice)
//   - B1-S3 (gated on B2-S4)
//   - B1-S7 (gated on B2-S1; Rule #15 sweep needs user load-approval signal)
//   - B1-H1 (audit names PCF rows by description only, no resolvable process_id
//     pre-specified; loading requires per-handoff PCF lookups which is judgment)
//   - B1-S5, B1-S6 (report-only, other domains own the fix)

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

async function insertChunked(path: string, rows: Row[]): Promise<Row[]> {
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

// PSA module ids (verified live).
const MOD_DELIVERY = 86;
const MOD_RESOURCE = 87;
const MOD_TIME_EXPENSE = 88;
const MOD_FINANCIALS = 89;
const PSA_DOMAIN_ID = 68;

// PSA master data_object ids (verified live).
const DO_SERVICE_PROJECTS = 216;
const DO_PROJECT_TASKS = 217;
const DO_PROJECT_ASSIGNMENTS = 218;
const DO_PROJECT_BILLING_MILESTONES = 219;
const DO_RESOURCE_SKILL_INVENTORIES = 725;
const DO_PROJECT_RESOURCE_ALLOCATIONS = 726;

// =========================================================================
// B1-S2: 5 intra-PSA cross-module handoffs
// =========================================================================
// Reuses existing trigger_events:
//   1170 project_task.completed              (DELIVERY -> FINANCIALS, POC rev-rec)
//   1167 project_resource_allocation.committed (RESOURCE -> FINANCIALS, committed cost ahead of actuals)
//   1166 project_billing_milestone.slipped   (FINANCIALS -> DELIVERY, surface slip on plan)
//   1162 project_assignment.released         (RESOURCE -> DELIVERY, re-assign open tasks)
//   1229 service_project.completed           (DELIVERY -> RESOURCE, return capacity to bench)
//
// Pre-flight: trigger_events were verified to exist and to bind the listed
// data_objects. The handoffs natural-key is the auto-computed `key` 6-tuple
// (source_domain_id.target_domain_id.source_domain_module_id.target_domain_module_id
//  .trigger_event_id.data_object_id), and a partial unique index enforces
// idempotency, so re-running this script is safe. We still pre-filter on the
// candidate trigger_event_ids to keep the run no-op when already loaded.

type HandoffRow = {
  source_domain_id: number;
  target_domain_id: number;
  source_domain_module_id: number;
  target_domain_module_id: number;
  trigger_event_id: number;
  data_object_id: number;
  handoff_label: string;
  description: string;
  integration_pattern: string;
  friction_level: string;
};

const intraPsaHandoffs: HandoffRow[] = [
  {
    source_domain_id: PSA_DOMAIN_ID,
    target_domain_id: PSA_DOMAIN_ID,
    source_domain_module_id: MOD_DELIVERY,
    target_domain_module_id: MOD_FINANCIALS,
    trigger_event_id: 1170,
    data_object_id: DO_PROJECT_TASKS,
    handoff_label: "Professional Services Automation → Professional Services Automation : project_task.completed",
    description: "Task completion updates percentage-of-completion inputs that project financials consume for revenue recognition.",
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
  },
  {
    source_domain_id: PSA_DOMAIN_ID,
    target_domain_id: PSA_DOMAIN_ID,
    source_domain_module_id: MOD_RESOURCE,
    target_domain_module_id: MOD_FINANCIALS,
    trigger_event_id: 1167,
    data_object_id: DO_PROJECT_RESOURCE_ALLOCATIONS,
    handoff_label: "Professional Services Automation → Professional Services Automation : project_resource_allocation.committed",
    description: "Committed allocations feed forward-looking cost into project financials ahead of actual time entries.",
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
  },
  {
    source_domain_id: PSA_DOMAIN_ID,
    target_domain_id: PSA_DOMAIN_ID,
    source_domain_module_id: MOD_FINANCIALS,
    target_domain_module_id: MOD_DELIVERY,
    trigger_event_id: 1166,
    data_object_id: DO_PROJECT_BILLING_MILESTONES,
    handoff_label: "Professional Services Automation → Professional Services Automation : project_billing_milestone.slipped",
    description: "A slipped billing milestone surfaces on the project delivery plan so the delivery team can replan or recover.",
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
  },
  {
    source_domain_id: PSA_DOMAIN_ID,
    target_domain_id: PSA_DOMAIN_ID,
    source_domain_module_id: MOD_RESOURCE,
    target_domain_module_id: MOD_DELIVERY,
    trigger_event_id: 1162,
    data_object_id: DO_PROJECT_ASSIGNMENTS,
    handoff_label: "Professional Services Automation → Professional Services Automation : project_assignment.released",
    description: "A released assignment frees the consultant from project work so delivery can re-assign or close open tasks held by them.",
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
  },
  {
    source_domain_id: PSA_DOMAIN_ID,
    target_domain_id: PSA_DOMAIN_ID,
    source_domain_module_id: MOD_DELIVERY,
    target_domain_module_id: MOD_RESOURCE,
    trigger_event_id: 1229,
    data_object_id: DO_SERVICE_PROJECTS,
    handoff_label: "Professional Services Automation → Professional Services Automation : service_project.completed",
    description: "A completed engagement returns its booked capacity to the bench for redeployment.",
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
  },
];

async function loadIntraPsaHandoffs(): Promise<void> {
  console.log("B1-S2: intra-PSA cross-module handoffs");
  // Re-check for pre-existing rows on these (source_module, target_module, trigger_event, data_object) tuples.
  const triggerIds = intraPsaHandoffs.map(h => h.trigger_event_id).join(",");
  const existing = await get(
    `/handoffs?source_domain_id=eq.${PSA_DOMAIN_ID}&target_domain_id=eq.${PSA_DOMAIN_ID}&trigger_event_id=in.(${triggerIds})&select=id,trigger_event_id,source_domain_module_id,target_domain_module_id`,
  );
  const existingKeys = new Set(
    existing.map(r => `${r.source_domain_module_id}|${r.target_domain_module_id}|${r.trigger_event_id}`),
  );
  const missing = intraPsaHandoffs.filter(
    h => !existingKeys.has(`${h.source_domain_module_id}|${h.target_domain_module_id}|${h.trigger_event_id}`),
  );
  if (missing.length === 0) {
    console.log(`  no new handoffs to insert (${existing.length} already present on candidate events)`);
    return;
  }
  console.log(`  inserting ${missing.length} new intra-PSA handoff rows`);
  const inserted = await insertChunked("/handoffs", missing as unknown as Row[]);
  console.log(`  inserted ${inserted.length} rows`);
}

// =========================================================================
// B1-S4: data_object_aliases on PSA masters
// =========================================================================
// Uses alias_type='solution_term' + solution_id (vendor-specific naming is
// solution-specific by construction; the enum has no `vendor_specific` value).
// Loads only aliases whose naming vendor has a matching `solutions` row in
// the catalog (verified live), so we do not invent solution_id values.

type AliasSeed = {
  data_object_id: number;
  alias_name: string;
  solution_name: string;
  is_preferred?: boolean;
};

const aliasSeeds: AliasSeed[] = [
  // service_projects (216)
  { data_object_id: DO_SERVICE_PROJECTS, alias_name: "Project", solution_name: "Kantata" },
  { data_object_id: DO_SERVICE_PROJECTS, alias_name: "PSA Project", solution_name: "Certinia PS Cloud" },
  { data_object_id: DO_SERVICE_PROJECTS, alias_name: "Project Plan", solution_name: "Workday Projects" },
  { data_object_id: DO_SERVICE_PROJECTS, alias_name: "Engagement", solution_name: "Deltek Vantagepoint" },
  { data_object_id: DO_SERVICE_PROJECTS, alias_name: "Project Contract", solution_name: "Microsoft Dynamics 365 Project Operations" },

  // project_tasks (217)
  { data_object_id: DO_PROJECT_TASKS, alias_name: "Task", solution_name: "Kantata" },
  { data_object_id: DO_PROJECT_TASKS, alias_name: "Project Task", solution_name: "Workday Projects" },
  { data_object_id: DO_PROJECT_TASKS, alias_name: "Activity", solution_name: "Deltek Vantagepoint" },

  // project_assignments (218)
  { data_object_id: DO_PROJECT_ASSIGNMENTS, alias_name: "Resource Assignment", solution_name: "Kantata" },
  { data_object_id: DO_PROJECT_ASSIGNMENTS, alias_name: "Resource Request", solution_name: "Certinia PS Cloud" },
  { data_object_id: DO_PROJECT_ASSIGNMENTS, alias_name: "Booking", solution_name: "Oracle NetSuite OpenAir" },
  { data_object_id: DO_PROJECT_ASSIGNMENTS, alias_name: "Resource Assignment", solution_name: "Workday Projects" },

  // project_billing_milestones (219)
  { data_object_id: DO_PROJECT_BILLING_MILESTONES, alias_name: "Billing Schedule Line", solution_name: "Kantata" },
  { data_object_id: DO_PROJECT_BILLING_MILESTONES, alias_name: "Milestone", solution_name: "Certinia PS Cloud" },
  { data_object_id: DO_PROJECT_BILLING_MILESTONES, alias_name: "Invoice Schedule", solution_name: "Microsoft Dynamics 365 Project Operations" },

  // project_resource_allocations (726)
  { data_object_id: DO_PROJECT_RESOURCE_ALLOCATIONS, alias_name: "Soft Booking", solution_name: "Kantata" },
  { data_object_id: DO_PROJECT_RESOURCE_ALLOCATIONS, alias_name: "Hard Booking", solution_name: "Kantata" },
  { data_object_id: DO_PROJECT_RESOURCE_ALLOCATIONS, alias_name: "Allocation", solution_name: "Replicon" },

  // resource_skill_inventories (725)
  { data_object_id: DO_RESOURCE_SKILL_INVENTORIES, alias_name: "Skills Catalog", solution_name: "Kantata" },
  { data_object_id: DO_RESOURCE_SKILL_INVENTORIES, alias_name: "Talent Profile", solution_name: "Workday Projects" },
  { data_object_id: DO_RESOURCE_SKILL_INVENTORIES, alias_name: "Resource Skills Profile", solution_name: "Certinia PS Cloud" },
];

async function loadPsaAliases(): Promise<void> {
  console.log("B1-S4: data_object_aliases on PSA masters");

  // Resolve solution_name -> id from the seeds we're about to load.
  const wantedNames = Array.from(new Set(aliasSeeds.map(a => a.solution_name)));
  const encodedNames = wantedNames.map(n => `"${n.replace(/"/g, '\\"')}"`).join(",");
  const solutions = await get(`/solutions?solution_name=in.(${encodedNames})&select=id,solution_name`);
  const nameToId = new Map<string, number>();
  for (const s of solutions) nameToId.set(String(s.solution_name), Number(s.id));

  const resolvable: AliasSeed[] = [];
  const unresolved: AliasSeed[] = [];
  for (const a of aliasSeeds) {
    if (nameToId.has(a.solution_name)) resolvable.push(a);
    else unresolved.push(a);
  }
  if (unresolved.length > 0) {
    console.log(`  ${unresolved.length} seeds dropped (no matching solutions row):`);
    for (const u of unresolved) console.log(`    - ${u.solution_name} / ${u.alias_name} on ${u.data_object_id}`);
  }

  // Idempotency: skip seeds whose (data_object_id, alias_name, solution_id) row already exists.
  const dataObjectIds = Array.from(new Set(resolvable.map(a => a.data_object_id))).join(",");
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${dataObjectIds})&select=data_object_id,alias_name,solution_id`,
  );
  const existingKeys = new Set(
    existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}|${r.solution_id ?? ""}`),
  );

  const rowsToInsert: Row[] = [];
  for (const a of resolvable) {
    const solutionId = nameToId.get(a.solution_name)!;
    const key = `${a.data_object_id}|${a.alias_name.toLowerCase()}|${solutionId}`;
    if (existingKeys.has(key)) continue;
    rowsToInsert.push({
      data_object_id: a.data_object_id,
      alias_name: a.alias_name,
      alias_type: "solution_term",
      solution_id: solutionId,
      is_preferred: false,
      // omit record_status -> defaults to 'new' (Rule #1)
      // omit notes -> defaults to '' (Rule #15)
    });
  }

  if (rowsToInsert.length === 0) {
    console.log(`  no new aliases to insert (${existing.length} already present on PSA masters)`);
    return;
  }
  console.log(`  inserting ${rowsToInsert.length} data_object_aliases rows`);
  const inserted = await insertChunked("/data_object_aliases", rowsToInsert);
  console.log(`  inserted ${inserted.length} rows`);
}

// =========================================================================
// Run
// =========================================================================
async function main(): Promise<void> {
  await loadIntraPsaHandoffs();
  await loadPsaAliases();
  console.log("\nDone. Spot-check at:");
  console.log("  https://tests.semantius.app/domain_map/handoffs");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases");
}

await main();
