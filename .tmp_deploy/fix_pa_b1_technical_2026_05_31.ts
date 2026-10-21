#!/usr/bin/env bun
// PA (People Analytics) B1 technical fixes, 2026-05-31 continuation.
//
// Applies ONLY the truly-technical Bucket-1 items from audits/PA.md.
// Each fix is independently classified per the parent-task rules:
//   - B1-S2 : PATCH event_category on 5 trigger_events            (enum backfill; audit names IDs + values)
//   - B1-S6 : INSERT 5 user-edge data_object_relationships rows  (Rule #10; audit pre-specifies edges)
//   - B1-B1 : PATCH target_domain_module_id on 8 inbound handoffs (B10b derivable; audit names IDs + targets)
//
// Deferred (per parent-task instructions):
//   - B1-S1  : lifecycle states (new entities; not pre-specified per row)
//   - B1-S3  : module-level system skills + tools (new entities)
//   - B1-S4  : PA-scoped roles (new entities)
//   - B1-S5  : permissions (new entities; gated on B1-S1)
//   - B1-S7  : intra-PA relationships (only verb prose; not Rule #10 user-edges)
//   - B1-S8  : aliases (proposal "draft 2-4 per master"; no pre-specified tuples)
//   - B1-S9  : attribution defect (gated on B2-S2 user judgment)
//   - B1-S10 : pattern flag flips (explicit defer rule)
//   - B1-H1  : APQC tagging (audit-proposed PCF external_ids 10544, 10545, 10547,
//             10548, 10550, 10539 do NOT resolve in live `processes` table; the
//             handful that do resolve (10532, 10018, 10175, 16944, 21698, 10773,
//             10511, 16437) have semantic mismatches with audit prose
//             (e.g. 10532 = "Deliver employee communications", not
//             "Manage workforce planning" as the audit claims). PCFs not
//             resolvable -> not in TECHNICAL clause; defer.
//
// Run from the project root:
//   bun run "c:/dev/domain-map/.tmp_deploy/fix_pa_b1_technical_2026_05_31.ts"

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

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

async function post(path: string, body: Row | Row[]): Promise<Row[]> {
  return call({ method: "POST", path, body });
}

const PA_DOMAIN_ID = 63;
const USERS_ID = 748; // platform_builtin

// =====================================================================
// Step 1, B1-S2: PATCH event_category on 5 trigger_events.
// Rule #13 enum: lifecycle / state_change / threshold / signal.
// Audit specifies the per-id mapping.
// =====================================================================
console.log("\n=== B1-S2: PATCH trigger_events.event_category ===");

const eventCategoryPatches: Array<{
  id: number;
  event_name: string;
  event_category: string;
}> = [
  { id: 397, event_name: "attrition_forecast.published", event_category: "state_change" },
  { id: 398, event_name: "engagement_survey.launched",   event_category: "lifecycle"    },
  { id: 399, event_name: "engagement_survey.closed",     event_category: "state_change" },
  { id: 400, event_name: "predictive_model.deployed",    event_category: "state_change" },
  { id: 401, event_name: "predictive_model.scored",      event_category: "signal"       },
];

let eventsPatched = 0;
let eventsSkipped = 0;
for (const p of eventCategoryPatches) {
  const before = await get(
    `/trigger_events?id=eq.${p.id}&select=id,event_name,event_category`,
  );
  if (before.length === 0) {
    console.log(`  event ${p.id} NOT FOUND, skipping`);
    continue;
  }
  const row = before[0];
  if (row.event_name !== p.event_name) {
    console.log(
      `  event ${p.id} name mismatch (live="${row.event_name}", expected="${p.event_name}"), skipping`,
    );
    eventsSkipped += 1;
    continue;
  }
  if (row.event_category === p.event_category) {
    console.log(
      `  event ${p.id} ${p.event_name}: already ${p.event_category}, skipping`,
    );
    eventsSkipped += 1;
    continue;
  }
  if (row.event_category && row.event_category !== "") {
    console.log(
      `  event ${p.id} ${p.event_name}: already non-empty ("${row.event_category}"), skipping to avoid clobber`,
    );
    eventsSkipped += 1;
    continue;
  }
  console.log(
    `  event ${p.id} ${p.event_name}: "" -> "${p.event_category}"`,
  );
  await patch(`/trigger_events?id=eq.${p.id}`, {
    event_category: p.event_category,
  });
  eventsPatched += 1;
}

// =====================================================================
// Step 2, B1-S6: INSERT 5 user-edge data_object_relationships rows per Rule #10.
// Audit (B1-S6) pre-specifies these edges and the Rule #10 shape:
//   relationship_type='many_to_many', relationship_kind='reference',
//   is_required=false, owner_side='target'.
//
// Edges (source=users id 748, related=PA master):
//   1. users launches  engagement_surveys   (45)
//   2. users publishes attrition_forecasts  (42)
//   3. users authors   predictive_models    (46)
//   4. users publishes people_kpis          (43)
//   5. users authors   workforce_segments   (44)
// =====================================================================
console.log("\n=== B1-S6: INSERT user-edge data_object_relationships ===");

const userEdges: Array<{
  related: number;
  related_name: string;
  verb: string;
  inverse: string;
  label: string;
}> = [
  {
    related: 45,
    related_name: "engagement_surveys",
    verb: "launches",
    inverse: "is launched by",
    label: "users launches engagement_surveys",
  },
  {
    related: 42,
    related_name: "attrition_forecasts",
    verb: "publishes",
    inverse: "is published by",
    label: "users publishes attrition_forecasts",
  },
  {
    related: 46,
    related_name: "predictive_models",
    verb: "authors",
    inverse: "is authored by",
    label: "users authors predictive_models",
  },
  {
    related: 43,
    related_name: "people_kpis",
    verb: "publishes",
    inverse: "is published by",
    label: "users publishes people_kpis",
  },
  {
    related: 44,
    related_name: "workforce_segments",
    verb: "authors",
    inverse: "is authored by",
    label: "users authors workforce_segments",
  },
];

let userEdgesInserted = 0;
let userEdgesSkipped = 0;
for (const e of userEdges) {
  const existing = await get(
    `/data_object_relationships?and=(data_object_id.eq.${USERS_ID},related_data_object_id.eq.${e.related},relationship_verb.eq.${encodeURIComponent(e.verb)})&select=id`,
  );
  if (existing.length > 0) {
    console.log(
      `  edge users -> ${e.related_name} (${e.verb}) exists (id ${existing[0].id}), skip`,
    );
    userEdgesSkipped += 1;
    continue;
  }
  const inserted = await post("/data_object_relationships", [
    {
      data_object_relationship_label: e.label,
      data_object_id: USERS_ID,
      related_data_object_id: e.related,
      owner_side: "target",
      relationship_type: "many_to_many",
      relationship_kind: "reference",
      relationship_verb: e.verb,
      inverse_verb: e.inverse,
      is_required: false,
    },
  ]);
  console.log(
    `  inserted edge users -> ${e.related_name} (${e.verb}) id ${inserted[0]?.id}`,
  );
  userEdgesInserted += 1;
}

// =====================================================================
// Step 3, B1-B1: PATCH target_domain_module_id on 8 inbound handoffs.
// PA modules: 81 PA-WORKFORCE-METRICS, 82 PA-ENGAGEMENT-SURVEYS,
//             83 PA-PREDICTIVE-MODELS, 84 PA-DEI-ANALYTICS.
// Audit-specified routing (1281 already wired to 81 in live state):
//   25   PAYROLL pay_cycle.closed (payload people_kpis)         -> 81
//   102  PAYROLL pay_cycle.closed (payload pay_slips)            -> 81
//   107  COMP-MGMT merit_cycle.closed                            -> 81
//   115  EMP-EXP survey.cycle_closed (payload engagement_drivers)-> 82
//   444  EMP-EXP survey_response.received                        -> 82
//   1077 EMP-EXP action_plan.completed                           -> 82
//   1130 PSA project_assignment.utilization_low                  -> 81
//   1155 PAYROLL pay_run.disbursed                               -> 81
// =====================================================================
console.log("\n=== B1-B1: PATCH inbound handoffs target_domain_module_id ===");

const targetFkPatches: Array<{
  id: number;
  target_module_id: number;
  note: string;
}> = [
  { id: 25,   target_module_id: 81, note: "PAYROLL pay_cycle.closed (people_kpis) -> PA-WORKFORCE-METRICS" },
  { id: 102,  target_module_id: 81, note: "PAYROLL pay_cycle.closed (pay_slips) -> PA-WORKFORCE-METRICS" },
  { id: 107,  target_module_id: 81, note: "COMP-MGMT merit_cycle.closed -> PA-WORKFORCE-METRICS" },
  { id: 115,  target_module_id: 82, note: "EMP-EXP survey.cycle_closed -> PA-ENGAGEMENT-SURVEYS" },
  { id: 444,  target_module_id: 82, note: "EMP-EXP survey_response.received -> PA-ENGAGEMENT-SURVEYS" },
  { id: 1077, target_module_id: 82, note: "EMP-EXP action_plan.completed -> PA-ENGAGEMENT-SURVEYS" },
  { id: 1130, target_module_id: 81, note: "PSA project_assignment.utilization_low -> PA-WORKFORCE-METRICS" },
  { id: 1155, target_module_id: 81, note: "PAYROLL pay_run.disbursed -> PA-WORKFORCE-METRICS" },
];

let targetsPatched = 0;
let targetsSkipped = 0;
for (const p of targetFkPatches) {
  const before = await get(
    `/handoffs?id=eq.${p.id}&select=id,target_domain_id,target_domain_module_id`,
  );
  if (before.length === 0) {
    console.log(`  handoff ${p.id} NOT FOUND, skipping`);
    continue;
  }
  const row = before[0];
  if (row.target_domain_id !== PA_DOMAIN_ID) {
    console.log(
      `  handoff ${p.id} target_domain_id=${row.target_domain_id} != ${PA_DOMAIN_ID} (PA), skipping`,
    );
    targetsSkipped += 1;
    continue;
  }
  if (row.target_domain_module_id === p.target_module_id) {
    console.log(`  handoff ${p.id}: target already ${p.target_module_id}, skipping`);
    targetsSkipped += 1;
    continue;
  }
  if (row.target_domain_module_id !== null) {
    console.log(
      `  handoff ${p.id}: target already non-null (${row.target_domain_module_id}), would overwrite to ${p.target_module_id}, skipping (manual review)`,
    );
    targetsSkipped += 1;
    continue;
  }
  console.log(
    `  handoff ${p.id}: target_domain_module_id NULL -> ${p.target_module_id} (${p.note})`,
  );
  await patch(`/handoffs?id=eq.${p.id}`, {
    target_domain_module_id: p.target_module_id,
  });
  targetsPatched += 1;
}

// =====================================================================
// Summary
// =====================================================================
console.log("\n=== Summary ===");
console.log(`B1-S2 event_category PATCH         : ${eventsPatched} patched (${eventsSkipped} skipped)`);
console.log(`B1-S6 user-edge INSERT             : ${userEdgesInserted} inserted (${userEdgesSkipped} skipped)`);
console.log(`B1-B1 target FK PATCH              : ${targetsPatched} patched (${targetsSkipped} skipped)`);
console.log("\nUI spot-check:");
console.log("  https://tests.semantius.app/domain_map/trigger_events");
console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
console.log("  https://tests.semantius.app/domain_map/handoffs");
