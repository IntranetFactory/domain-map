#!/usr/bin/env bun
// SWP (Strategic Workforce Planning) state-driven execute pass, 2026-06-07.
//
// Executes the additive/corrective EXECUTE-class items from audits/SWP/state.yaml
// (domain-map-analyst Validate mode, SKILL.md Rule #21). Idempotent: read live,
// insert/patch only what is missing or empty, never overwrite a non-empty value,
// never stamp record_status='approved'.
//
// EXECUTE item types:
//   1. B1A-ENTITY-TYPE : PATCH data_objects.entity_type unclassified -> Rule #12 enum (8 masters).
//                        SWP is planning-heavy: stateless derived forecast -> computed; external
//                        reference/config data -> catalog; the six masters carrying a lifecycle
//                        state machine -> operational_workflow.
//   2. Rule #20 (A4/M8): author catalog_tagline + catalog_description on empty domain + module rows.
//   3. B1A-M7-DDO31-ROLLUP : PATCH domain_data_objects id=31 role master -> contributor (resolves the
//                        catalog-wide single-master conflict on job_requisitions; ATS is sole master).
//                        Corrective realignment of a derived rollup to module-level reality (DMDO 422
//                        already carries SWP as contributor). necessity stays required.
//   4. B1A-H1-APQC-TAGGING : INSERT handoff_processes (agent_curated) for the SWP handoffs still
//                        untagged with a CLEAN PCF match (resolved live). The mis-tagged
//                        discovery_substring rows (13/241/242) are DESTRUCTIVE REPLACE -> surfaced, NOT done here.
//   5. B11-ALIASES      : INSERT generic-synonym data_object_aliases per master (alias_type='synonym',
//                        no vendor/product names per Rule #18).
//
// NOT executed here (surfaced / left to user per parent task):
//   - b2 (S1..S5 judgment): event_category 388 convention, has_personal_content flips, Signal-1
//     attribution on event 62, role-count drift (ORG-DESIGN-PRACTITIONER), C1 BFC owner/contributor split.
//   - DESTRUCTIVE: REPLACE-CORRECT of discovery_substring tags on handoffs 13/241/242.
//   - B1A-PHASE-P personas/RACI (deferred; do NOT author).
//   - b1b owed-by-others: event 388 (gated B2-S1), BFC anchoring (gated B2-S5), NULL FKs owed by EPM/WFM/SPM.
//   - b3 backlog (workforce_segments, succession_plans, internal_mobility_intents, regulations).
//   - RETIRED per 2026-06-06 supersession: per-module system skills + skill_tools (B1A-RULE15-SKILL-TOOLS-NOTES,
//     B1B-F1-F2-MODULE-SKILLS). skill_tools is dropped; do NOT author per-module skills.
//
// business_function_domains (C1 owner/contributor) is ALREADY populated live (rows 185 Workforce Planning
// owner, 24 FP&A contributor, 186 Finance contributor) - nothing to do there.
//
// Run from project root:
//   bun run "c:/dev/domain-map/.tmp_deploy/fix_swp_state_execute_2026_06_07.ts"

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

const SWP_DOMAIN_ID = 100;

// =====================================================================
// Step 1, B1A-ENTITY-TYPE: classify 8 SWP masters (Rule #12).
// Stateless masters take the non-workflow types:
//   25 position_demand_forecasts -> computed (derived forecast projection, 0 lifecycle states)
//   29 labor_market_benchmarks  -> catalog  (external reference/config data, 0 states, calibrates salary_bands)
// The six masters carrying a lifecycle state machine -> operational_workflow.
// =====================================================================
console.log("\n=== Step 1, B1A-ENTITY-TYPE: classify masters ===");

const entityTypePatches: Array<{ id: number; name: string; entity_type: string; why: string }> = [
  { id: 23, name: "workforce_plans",           entity_type: "operational_workflow", why: "multi-year plan with submit-lock + single-approver workflow (5 states)" },
  { id: 24, name: "headcount_plans",           entity_type: "operational_workflow", why: "headcount plan with approval workflow (5 states)" },
  { id: 25, name: "position_demand_forecasts", entity_type: "computed",             why: "derived hiring-demand forecast projection, no lifecycle (0 states)" },
  { id: 26, name: "skills_gap_analyses",       entity_type: "operational_workflow", why: "gap analysis progresses through a lifecycle (3 states)" },
  { id: 27, name: "workforce_scenarios",       entity_type: "operational_workflow", why: "what-if scenario with author/approve workflow (6 states)" },
  { id: 28, name: "org_designs",               entity_type: "operational_workflow", why: "org design with design/publish workflow (4 states)" },
  { id: 29, name: "labor_market_benchmarks",   entity_type: "catalog",              why: "external reference/config data, no workflow (0 states)" },
  { id: 30, name: "workforce_cost_projections",entity_type: "operational_workflow", why: "cost projection with cost_projection.approved gate (5 states)" },
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
    "Plan the workforce you will need years ahead: target headcount, skills, locations, and cost, modeled against every what-if.",
  catalog_description:
    "Strategic Workforce Planning connects your business plan to the people who will deliver it. Build a multi-year picture of the workforce you need by role, skill, location, and level, then compare it to the workforce you have and see the gap before it becomes a crisis.\n\nModel growth, reduction, restructure, geography shift, skill pivot, and cost-optimization scenarios side by side, overlay live labor-market data, and turn the chosen plan into approved headcount that flows straight into hiring. Project the fully loaded cost of every plan so finance can fold it into the budget, and reconcile plan against actuals as the year unfolds.\n\nStart with demand and supply modeling, then layer in scenario planning, org design, and workforce costing as planning matures from a once-a-year spreadsheet into a continuous discipline.",
};

const moduleCopy: Record<number, { code: string; catalog_tagline: string; catalog_description: string }> = {
  94: {
    code: "SWP-DEMAND-FORECAST",
    catalog_tagline: "Forecast the headcount and skills you will need, role by role, and authorize hiring against the plan.",
    catalog_description:
      "Demand Forecast turns business targets into a concrete picture of future hiring need. Build headcount plans by org unit and period, forecast position demand role by role, and run a skills-gap analysis that compares the capabilities you will need to the ones you have.\n\nWhen a plan is approved it becomes the authorization to hire: the canonical hiring-demand signal that recruiting, HR, and learning teams subscribe to. This is where workforce planning meets execution, the layer that tells the rest of the organization who to hire and what skills to build.",
  },
  95: {
    code: "SWP-SUPPLY-PLANNING",
    catalog_tagline: "Model the workforce you already have and where attrition, mobility, and pipeline will leave you.",
    catalog_description:
      "Supply Planning models the workforce you have today and how it will change. Project supply forward by factoring in attrition forecasts, internal mobility, and the talent pipeline, then reconcile that supply against the demand the plan calls for.\n\nSee where shortfalls and surpluses will appear by role, location, and skill, and feed the reconciled view back into planning so demand and supply stay in step. This is the half of workforce planning that keeps the plan honest about the people you can actually count on.",
  },
  96: {
    code: "SWP-SCENARIO-MODELING",
    catalog_tagline: "Compare growth, reduction, and restructure scenarios, design the org, and overlay labor-market data.",
    catalog_description:
      "Scenario Modeling is the what-if workbench of workforce planning. Build and compare scenarios for growth, reduction, restructure, geography shift, skill pivot, and cost optimization, and see how each one reshapes headcount, skills, and cost before you commit.\n\nDesign the future org structure, publish the approved design into position changes, and overlay external labor-market benchmarks so assumptions about pay, availability, and skills reflect the real market. This is where leadership tests the hard choices and lands on the plan worth executing.",
  },
  97: {
    code: "SWP-COST-PROJECTIONS",
    catalog_tagline: "Project the fully loaded cost of every workforce plan and hand it to finance for the budget.",
    catalog_description:
      "Cost Projections puts a number on the plan. Project the fully loaded compensation expense of any workforce plan or scenario by period, org, geography, and level, so the cost of growth, reduction, or restructure is clear before the decision is made.\n\nApproved cost projections roll straight into enterprise budgeting, keeping the people-cost line connected to the workforce plan instead of drifting in a separate spreadsheet. This is the module that lets finance and workforce planning speak the same language.",
  },
};

let copyDomainWrites = 0;
{
  const before = await get(`/domains?id=eq.${SWP_DOMAIN_ID}&select=id,catalog_tagline,catalog_description`);
  const row = before[0] ?? {};
  const body: Row = {};
  if (!row.catalog_tagline || String(row.catalog_tagline).trim() === "") body.catalog_tagline = domainCopy.catalog_tagline;
  else console.log(`  domain ${SWP_DOMAIN_ID}: catalog_tagline non-empty, skip`);
  if (!row.catalog_description || String(row.catalog_description).trim() === "") body.catalog_description = domainCopy.catalog_description;
  else console.log(`  domain ${SWP_DOMAIN_ID}: catalog_description non-empty, skip`);
  if (Object.keys(body).length > 0) {
    await patch(`/domains?id=eq.${SWP_DOMAIN_ID}`, body);
    console.log(`  domain ${SWP_DOMAIN_ID}: wrote ${Object.keys(body).join(", ")}`);
    copyDomainWrites++;
  }
}

let copyModuleWrites = 0;
for (const idStr of Object.keys(moduleCopy)) {
  const id = Number(idStr);
  const c = moduleCopy[id];
  const before = await get(`/domain_modules?id=eq.${id}&select=id,domain_id,catalog_tagline,catalog_description`);
  if (before.length === 0) { console.log(`  module ${id} NOT FOUND, skip`); continue; }
  const row = before[0];
  if (row.domain_id !== SWP_DOMAIN_ID) { console.log(`  module ${id} domain_id=${row.domain_id} != SWP, skip`); continue; }
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
// Step 3, B1A-M7-DDO31-ROLLUP: PATCH domain_data_objects id=31 role -> contributor.
// Catalog-wide single-master integrity (M7): only ATS may carry role='master' on
// job_requisitions (data_object_id=1). Module-level DMDO 422 already has SWP as
// contributor; this realigns the derived rollup to match. necessity stays 'required'.
// Corrective (not destructive): no editorial content is overwritten, only a derived role flag.
// =====================================================================
console.log("\n=== Step 3, B1A-M7-DDO31-ROLLUP: realign DDO 31 ===");

let ddo31Patched = 0;
{
  const before = await get(`/domain_data_objects?id=eq.31&select=id,domain_id,data_object_id,role,necessity`);
  if (before.length === 0) {
    console.log("  DDO 31 NOT FOUND, skip");
  } else {
    const row = before[0];
    if (row.domain_id !== SWP_DOMAIN_ID || row.data_object_id !== 1) {
      console.log(`  DDO 31 unexpected shape (domain=${row.domain_id}, data_object=${row.data_object_id}), skip`);
    } else if (row.role === "contributor") {
      console.log("  DDO 31: already role=contributor, skip");
    } else if (row.role !== "master") {
      console.log(`  DDO 31: role="${row.role}" (not master), skip to avoid clobbering`);
    } else {
      // Confirm ATS still holds the master on job_requisitions before demoting SWP.
      const atsMaster = await get(`/domain_module_data_objects?data_object_id=eq.1&role=eq.master&select=id,domain_module_id&limit=1`);
      if (atsMaster.length === 0) {
        console.log("  DDO 31: no module-level master found on job_requisitions; NOT demoting (would leave 0 masters), skip");
      } else {
        console.log(`  DDO 31: role "master" -> "contributor" (ATS keeps module master via DMDO ${atsMaster[0].id}); necessity stays required`);
        await patch(`/domain_data_objects?id=eq.31`, { role: "contributor" });
        ddo31Patched++;
      }
    }
  }
}

// =====================================================================
// Step 4, B1A-H1-APQC-TAGGING (H1): INSERT agent_curated handoff_processes
// for the SWP cross-domain handoffs still untagged with a CLEAN PCF match.
// Only handoffs 11 and 16 remain untagged (the rest were tagged since the
// state snapshot). Mis-tagged discovery_substring rows (13/241/242) are a
// DESTRUCTIVE REPLACE and are SURFACED to the user, not done here.
// record_status omitted (defaults 'new'); role='implements'.
// =====================================================================
console.log("\n=== Step 4, B1A-H1-APQC-TAGGING: INSERT handoff_processes ===");

// process_id values verified live (pre-flight, apqc_pcf_cross_industry):
//   980  Perform strategic workforce planning (PCF 21693, 7.1.2.1) - the established SWP tag
//   1322 Prepare periodic budgets and plans   (PCF 10772, 9.1.2.2) - the EPM-side budget process
const apqcTags: Array<{ handoff_id: number; process_id: number; pcf: string; flow: string }> = [
  { handoff_id: 11, process_id: 980,  pcf: "21693 Perform strategic workforce planning", flow: "HCM->SWP-DEMAND-FORECAST headcount.actuals_updated (plan-vs-actual reconciliation)" },
  { handoff_id: 16, process_id: 1322, pcf: "10772 Prepare periodic budgets and plans",   flow: "SWP-COST-PROJECTIONS->EPM cost_projection.approved (workforce cost into budget)" },
];

let apqcInserted = 0, apqcSkipped = 0;
for (const t of apqcTags) {
  const proc = await get(`/processes?id=eq.${t.process_id}&select=id,process_name,source_framework`);
  if (proc.length === 0 || proc[0].source_framework !== "apqc_pcf_cross_industry") {
    console.log(`  handoff ${t.handoff_id}: process ${t.process_id} not a live PCF row, skip`); apqcSkipped++; continue;
  }
  const ho = await get(`/handoffs?id=eq.${t.handoff_id}&select=id,source_domain_id,target_domain_id`);
  if (ho.length === 0) { console.log(`  handoff ${t.handoff_id} NOT FOUND, skip`); apqcSkipped++; continue; }
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
// Step 5, B11-ALIASES: INSERT generic-synonym data_object_aliases.
// alias_type='synonym' (no industry_id available). Generic industry terms only,
// NO vendor/product names (Rule #18). Idempotent by (data_object_id, alias_name).
// Only masters without good existing coverage; 25/26/29/30 already have synonyms.
// =====================================================================
console.log("\n=== Step 5, B11-ALIASES: INSERT data_object_aliases ===");

const aliasSets: Array<{ data_object_id: number; name: string; aliases: string[] }> = [
  { data_object_id: 23, name: "workforce_plans",      aliases: ["Strategic Workforce Plan", "Workforce Plan", "Multi-Year People Plan"] },
  { data_object_id: 24, name: "headcount_plans",      aliases: ["Headcount Plan", "Hiring Plan", "Staffing Plan"] },
  { data_object_id: 27, name: "workforce_scenarios",  aliases: ["What-If Scenario", "Workforce Scenario", "Planning Scenario"] },
  { data_object_id: 28, name: "org_designs",          aliases: ["Organization Design", "Org Structure Design", "Reorg Design"] },
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
console.log(`Step 3 DDO 31 M7 realign      : ${ddo31Patched} patched`);
console.log(`Step 4 APQC handoff_processes : ${apqcInserted} inserted (${apqcSkipped} skipped)`);
console.log(`Step 5 aliases               : ${aliasInserted} inserted (${aliasSkipped} skipped)`);
console.log("\nUI spot-check:");
console.log("  https://tests.semantius.app/domain_map/data_objects");
console.log("  https://tests.semantius.app/domain_map/domains");
console.log("  https://tests.semantius.app/domain_map/domain_modules");
console.log("  https://tests.semantius.app/domain_map/domain_data_objects");
console.log("  https://tests.semantius.app/domain_map/handoff_processes");
console.log("  https://tests.semantius.app/domain_map/data_object_aliases");
