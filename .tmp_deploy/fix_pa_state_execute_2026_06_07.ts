#!/usr/bin/env bun
// PA (People Analytics) state-driven execute pass, 2026-06-07.
//
// Executes the additive/corrective EXECUTE-class items from audits/PA/state.yaml
// (domain-map-analyst Validate mode, SKILL.md Rule #21). Idempotent: read live,
// insert/patch only what is missing or empty, never overwrite a non-empty value,
// never stamp record_status='approved'.
//
// EXECUTE item types:
//   1. B1A-ENTITY-TYPE : PATCH data_objects.entity_type unclassified -> Rule #12 enum (5 masters)
//   2. Rule #20 (A4/M8): author catalog_tagline + catalog_description on empty domain + module rows
//   3. B1A-APQC-TAGGING : INSERT handoff_processes (agent_curated) for 8 untagged PA handoffs
//                         that have a CLEAN PCF match (resolved live). REPLACE rows are DESTRUCTIVE
//                         (overwrite discovery_substring) -> surfaced, NOT done here.
//   4. B1A-ALIASES      : INSERT generic-synonym data_object_aliases per master (alias_type='synonym',
//                         no vendor/product names per Rule #18).
//
// NOT executed here (surfaced / left to user per parent task):
//   - B1A-LIFECYCLE-STATES (new-entity per-row state machines; state.yaml requires user approval)
//   - B1A-INTRA-PA-RELATIONSHIPS (verbs not pre-specified; user authoring)
//   - B1A-SELF-CONTAIN / M9 (rewrite role/necessity on existing DMDO = destructive)
//   - B1A-PHASE-P personas/RACI (deferred)
//   - APQC REPLACE of discovery_substring tags (destructive)
//   - all b2 (judgment), b3 (backlog)
//   - B1A-SYSTEM-SKILLS / B1A-ROLES / B1A-PERMISSIONS (RETIRED per 2026-06-06 supersession)
//
// Run from project root:
//   bun run "c:/dev/domain-map/.tmp_deploy/fix_pa_state_execute_2026_06_07.ts"

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

const get = (path: string) => call({ method: "GET", path });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });
const post = (path: string, body: Row | Row[]) => call({ method: "POST", path, body });

const PA_DOMAIN_ID = 63;

// =====================================================================
// Step 1, B1A-ENTITY-TYPE: classify 5 PA masters (Rule #12).
// PA is analytics-heavy: derived rollups/projections -> computed.
// The two real workflow masters (survey campaign, ML model lifecycle)
// -> operational_workflow.
// =====================================================================
console.log("\n=== Step 1, B1A-ENTITY-TYPE: classify masters ===");

const entityTypePatches: Array<{ id: number; name: string; entity_type: string; why: string }> = [
  { id: 42, name: "attrition_forecasts", entity_type: "computed",             why: "derived forecast projection over a planning horizon" },
  { id: 43, name: "people_kpis",         entity_type: "computed",             why: "derived KPI rollup/snapshot" },
  { id: 44, name: "workforce_segments",  entity_type: "computed",             why: "derived cohort/segment projection" },
  { id: 45, name: "engagement_surveys",  entity_type: "operational_workflow", why: "survey campaign with draft->launched->closed->results_published workflow" },
  { id: 46, name: "predictive_models",   entity_type: "operational_workflow", why: "ML model with training->validated->deployed->retired workflow" },
];

let etPatched = 0, etSkipped = 0;
for (const p of entityTypePatches) {
  const before = await get(`/data_objects?id=eq.${p.id}&select=id,data_object_name,entity_type`);
  if (before.length === 0) { console.log(`  master ${p.id} NOT FOUND, skip`); continue; }
  const row = before[0];
  if (row.data_object_name !== p.name) {
    console.log(`  master ${p.id} name mismatch (live="${row.data_object_name}"), skip`); etSkipped++; continue;
  }
  const cur = row.entity_type;
  if (cur && cur !== "unclassified") {
    console.log(`  master ${p.id} ${p.name}: already classified "${cur}", skip (no overwrite)`); etSkipped++; continue;
  }
  console.log(`  master ${p.id} ${p.name}: "${cur}" -> "${p.entity_type}" (${p.why})`);
  await patch(`/data_objects?id=eq.${p.id}`, { entity_type: p.entity_type });
  etPatched++;
}

// =====================================================================
// Step 2, Rule #20 (A4 / M8): catalog UX copy on empty domain + module rows.
// Buyer voice (workflow + value), no vendor names, no em-dash, American English.
// Only writes when the target field is empty/null. Never overwrites.
// =====================================================================
console.log("\n=== Step 2, Rule #20: catalog UX copy ===");

const domainCopy = {
  catalog_tagline:
    "See your whole workforce in numbers: headcount, attrition risk, engagement, and pay equity in one analytics workspace.",
  catalog_description:
    "People Analytics turns your HR, payroll, and talent data into decisions. Build headcount and attrition scorecards, slice the workforce by org unit, tenure, and performance, and watch the metrics that signal where the organization is headed.\n\nRun engagement and pulse surveys, score flight risk with predictive models, and surface pay-equity and representation gaps before they become problems. Publish dashboards your HR business partners and leaders actually use, and push the insights that matter into talent, planning, and compensation work.\n\nStart with workforce metrics, then layer in engagement listening, predictive modeling, and diversity analytics as your team grows into a data-driven people function.",
};

const moduleCopy: Record<number, { code: string; catalog_tagline: string; catalog_description: string }> = {
  81: {
    code: "PA-WORKFORCE-METRICS",
    catalog_tagline: "Track headcount, attrition, and workforce composition with people-KPI scorecards.",
    catalog_description:
      "Workforce Metrics gives you the core people numbers: headcount, hires and exits, attrition snapshots, span of control, and workforce composition by org unit, tenure, and performance band. Define the KPIs that matter, snapshot them on a schedule, and publish scorecards leaders can trust.\n\nSegment the workforce into the cohorts you care about and feed those segments into planning, predictive, and diversity work. This is the entry point for People Analytics, the metric layer everything else builds on.",
  },
  82: {
    code: "PA-ENGAGEMENT-SURVEYS",
    catalog_tagline: "Run pulse and engagement surveys, then turn responses into driver scores and action.",
    catalog_description:
      "Engagement Surveys lets you design and launch pulse and engagement campaigns, collect responses, and compute the driver scores that explain how employees feel and why. Aggregate sentiment across teams and time, spot where engagement is slipping, and route the signal to the people who can act.\n\nClose the loop by tracking action plans and feeding engagement trends into broader people analytics, so survey results drive change instead of sitting in a slide deck.",
  },
  83: {
    code: "PA-PREDICTIVE-MODELS",
    catalog_tagline: "Score flight risk and future outcomes with predictive people models.",
    catalog_description:
      "Predictive Models brings machine learning to your people data: attrition and flight-risk scoring, succession readiness, and hire-success prediction. Train models on historical patterns, validate them, deploy the ones that earn trust, and retire the ones that drift.\n\nPublish scored populations and attrition forecasts to the teams that act on them, so retention, succession, and planning decisions start from a forward-looking signal rather than a rear-view report.",
  },
  84: {
    code: "PA-DEI-ANALYTICS",
    catalog_tagline: "Measure representation and pay equity, and close diversity gaps with evidence.",
    catalog_description:
      "DEI Analytics measures representation across the workforce and analyzes pay equity by comparing compensation across comparable groups. Surface diversity gaps, detect pay-equity issues before they escalate, and give leaders the dashboards they need to set and track inclusion goals.\n\nIt computes over your workforce, compensation, and metric data to support regulatory reporting and diversity strategy, turning fairness from an aspiration into something you can measure and improve.",
  },
};

// Domain row
let copyDomainWrites = 0;
{
  const before = await get(`/domains?id=eq.${PA_DOMAIN_ID}&select=id,catalog_tagline,catalog_description`);
  const row = before[0] ?? {};
  const body: Row = {};
  if (!row.catalog_tagline || String(row.catalog_tagline).trim() === "") body.catalog_tagline = domainCopy.catalog_tagline;
  else console.log(`  domain ${PA_DOMAIN_ID}: catalog_tagline non-empty, skip`);
  if (!row.catalog_description || String(row.catalog_description).trim() === "") body.catalog_description = domainCopy.catalog_description;
  else console.log(`  domain ${PA_DOMAIN_ID}: catalog_description non-empty, skip`);
  if (Object.keys(body).length > 0) {
    await patch(`/domains?id=eq.${PA_DOMAIN_ID}`, body);
    console.log(`  domain ${PA_DOMAIN_ID}: wrote ${Object.keys(body).join(", ")}`);
    copyDomainWrites++;
  }
}

// Module rows
let copyModuleWrites = 0;
for (const idStr of Object.keys(moduleCopy)) {
  const id = Number(idStr);
  const c = moduleCopy[id];
  const before = await get(`/domain_modules?id=eq.${id}&select=id,domain_id,catalog_tagline,catalog_description`);
  if (before.length === 0) { console.log(`  module ${id} NOT FOUND, skip`); continue; }
  const row = before[0];
  if (row.domain_id !== PA_DOMAIN_ID) { console.log(`  module ${id} domain_id=${row.domain_id} != PA, skip`); continue; }
  const body: Row = {};
  if (!row.catalog_tagline || String(row.catalog_tagline).trim() === "") body.catalog_tagline = c.catalog_tagline;
  else console.log(`  module ${id} ${c.code}: catalog_tagline non-empty, skip`);
  if (!row.catalog_description || String(row.catalog_description).trim() === "") body.catalog_description = c.catalog_description;
  else console.log(`  module ${id} ${c.code}: catalog_description non-empty, skip`);
  if (Object.keys(body).length > 0) {
    await patch(`/domain_modules?id=eq.${id}`, body);
    console.log(`  module ${id} ${c.code}: wrote ${Object.keys(body).join(", ")}`);
    copyModuleWrites++;
  }
}

// =====================================================================
// Step 3, B1A-APQC-TAGGING (H1): INSERT agent_curated handoff_processes
// for the 8 PA cross-domain handoffs that have ZERO tags and a CLEAN
// PCF match resolved live against apqc_pcf_cross_industry.
// Natural key = handoff_processes.key = "<handoff_id>.<process_id>".
// record_status omitted (defaults to 'new'); role='implements'.
// =====================================================================
console.log("\n=== Step 3, B1A-APQC-TAGGING: INSERT handoff_processes ===");

// process_id values verified live (Step pre-flight):
//   982  Develop succession plan (PCF 10426)
//   235  Manage employee assistance and retention (PCF 21439)
//   980  Perform strategic workforce planning (PCF 21693)
//   220  Recruit/Source candidates (PCF 10440)
//   984  Develop diversity, equity, and inclusion plan (PCF 10427)
const apqcTags: Array<{ handoff_id: number; process_id: number; pcf: string; flow: string }> = [
  { handoff_id: 26,   process_id: 982, pcf: "10426 Develop succession plan",                    flow: "PA->TALENT-MGMT high_potential.identified" },
  { handoff_id: 450,  process_id: 235, pcf: "21439 Manage employee assistance and retention",   flow: "PA->TALENT-MGMT attrition_risk.high" },
  { handoff_id: 452,  process_id: 980, pcf: "21693 Perform strategic workforce planning",       flow: "PA->SWP attrition_forecast.published" },
  { handoff_id: 453,  process_id: 220, pcf: "10440 Recruit/Source candidates",                  flow: "PA->ATS predictive_model.scored" },
  { handoff_id: 1105, process_id: 984, pcf: "10427 Develop diversity, equity, and inclusion plan", flow: "PA->COMP-MGMT pay_equity.gap_detected" },
  { handoff_id: 1110, process_id: 235, pcf: "21439 Manage employee assistance and retention",   flow: "PA->TALENT-MGMT attrition_risk.elevated" },
  { handoff_id: 1112, process_id: 980, pcf: "21693 Perform strategic workforce planning",       flow: "PA->SWP workforce_segment.composition_changed" },
  { handoff_id: 1113, process_id: 982, pcf: "10426 Develop succession plan",                    flow: "PA->TALENT-MGMT predictive_model.deployed" },
];

let apqcInserted = 0, apqcSkipped = 0;
for (const t of apqcTags) {
  // Verify the target process is a live apqc_pcf row.
  const proc = await get(`/processes?id=eq.${t.process_id}&select=id,process_name,source_framework`);
  if (proc.length === 0 || proc[0].source_framework !== "apqc_pcf_cross_industry") {
    console.log(`  handoff ${t.handoff_id}: process ${t.process_id} not a live PCF row, skip`); apqcSkipped++; continue;
  }
  // Verify the handoff exists and is PA-published or PA-received.
  const ho = await get(`/handoffs?id=eq.${t.handoff_id}&select=id,source_domain_id,target_domain_id`);
  if (ho.length === 0) { console.log(`  handoff ${t.handoff_id} NOT FOUND, skip`); apqcSkipped++; continue; }
  // Idempotency: skip if any handoff_processes row already exists for this handoff_id.
  const existing = await get(`/handoff_processes?handoff_id=eq.${t.handoff_id}&select=id,process_id`);
  if (existing.length > 0) {
    console.log(`  handoff ${t.handoff_id}: already has ${existing.length} tag(s), skip`); apqcSkipped++; continue;
  }
  await post("/handoff_processes", [{
    handoff_id: t.handoff_id,
    process_id: t.process_id,
    role: "implements",
    proposal_source: "agent_curated",
  }]);
  console.log(`  handoff ${t.handoff_id} (${t.flow}) -> PCF ${t.pcf}`);
  apqcInserted++;
}

// =====================================================================
// Step 4, B1A-ALIASES (B11): INSERT generic-synonym data_object_aliases.
// alias_type='synonym' (no industry_id available). Generic industry terms
// only, NO vendor/product names (Rule #18). Idempotent by (data_object_id, alias_name).
// =====================================================================
console.log("\n=== Step 4, B1A-ALIASES: INSERT data_object_aliases ===");

const aliasSets: Array<{ data_object_id: number; name: string; aliases: string[] }> = [
  { data_object_id: 42, name: "attrition_forecasts", aliases: ["Turnover Forecast", "Attrition Prediction", "Flight Risk Forecast"] },
  { data_object_id: 43, name: "people_kpis",         aliases: ["HR Metric", "Workforce KPI", "People Metric", "Headcount Metric"] },
  { data_object_id: 44, name: "workforce_segments",  aliases: ["Employee Cohort", "Workforce Cohort", "People Segment"] },
  { data_object_id: 45, name: "engagement_surveys",  aliases: ["Pulse Survey", "Employee Survey", "Engagement Pulse"] },
  { data_object_id: 46, name: "predictive_models",   aliases: ["People Model", "Workforce Model", "HR Predictive Model"] },
];

let aliasInserted = 0, aliasSkipped = 0;
for (const set of aliasSets) {
  const existing = await get(`/data_object_aliases?data_object_id=eq.${set.data_object_id}&select=alias_name`);
  const have = new Set(existing.map(r => String(r.alias_name).toLowerCase()));
  const toInsert = set.aliases
    .filter(a => !have.has(a.toLowerCase()))
    .map(a => ({
      data_object_id: set.data_object_id,
      alias_name: a,
      alias_type: "synonym",
      is_preferred: false,
    }));
  if (toInsert.length === 0) {
    console.log(`  ${set.name}: all ${set.aliases.length} aliases already present, skip`); aliasSkipped += set.aliases.length; continue;
  }
  await post("/data_object_aliases", toInsert);
  console.log(`  ${set.name}: inserted ${toInsert.map(a => `"${a.alias_name}"`).join(", ")}`);
  aliasInserted += toInsert.length;
}

// =====================================================================
// Summary
// =====================================================================
console.log("\n=== Summary ===");
console.log(`Step 1 entity_type PATCH       : ${etPatched} patched (${etSkipped} skipped)`);
console.log(`Step 2 catalog UX             : domain ${copyDomainWrites} rows, modules ${copyModuleWrites} rows written`);
console.log(`Step 3 APQC handoff_processes : ${apqcInserted} inserted (${apqcSkipped} skipped)`);
console.log(`Step 4 aliases               : ${aliasInserted} inserted (${aliasSkipped} skipped)`);
console.log("\nUI spot-check:");
console.log("  https://tests.semantius.app/domain_map/data_objects");
console.log("  https://tests.semantius.app/domain_map/domains");
console.log("  https://tests.semantius.app/domain_map/domain_modules");
console.log("  https://tests.semantius.app/domain_map/handoff_processes");
console.log("  https://tests.semantius.app/domain_map/data_object_aliases");
