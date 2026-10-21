#!/usr/bin/env bun
// APM refresh Tranche 4 — Phase S (system skills + tools).
//
//  * 4 new mutate tools: update_technology_platform, update_application_interface,
//                       update_business_capability_map, update_application_cost,
//                       create_application_value_score, approve_technology_fit_assessment
//  * 2 new system skills: apm_portfolio_registry_agent, apm_rationalization_agent
//  * skill_tools wiring per module
//  * Retire legacy `apm-system` skill (id=2) and its 12 skill_tools rows

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
  const ec = await proc.exited;
  if (ec !== 0) throw new Error(`semantius failed (${ec}): ${stderr}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
const post = (p: string, body: Row[]) => body.length ? call({ method: "POST", path: p, body }) : Promise.resolve([]);
const del = (p: string) => call({ method: "DELETE", path: p });

const APM_ID = 10;
const M_REGISTRY = 103;
const M_RATIONAL = 104;

const D = {
  business_capability_maps: 248,
  enterprise_applications: 267,
  application_costs: 268,
  technology_platforms: 269,
  technology_fit_assessments: 270,
  application_interfaces: 271,
  application_value_scores: 272,
  saas_applications: 61,
  software_titles: 57,
  configuration_items: 76,
};

// ============================================================
// 1. tools — add missing mutate tools
// ============================================================
type ToolDef = { name: string; operationKind: "query" | "mutate" | "side_effect" | "compute"; dataObjectId: number | null; description: string };
const newTools: ToolDef[] = [
  { name: "update_technology_platform", operationKind: "mutate", dataObjectId: D.technology_platforms, description: "Update a technology_platform row, including lifecycle transitions (emerging→standard, standard→declining, declining→retired)." },
  { name: "update_application_interface", operationKind: "mutate", dataObjectId: D.application_interfaces, description: "Update an application_interface row, including lifecycle transitions (active→deprecated→retired)." },
  { name: "update_business_capability_map", operationKind: "mutate", dataObjectId: D.business_capability_maps, description: "Update a business_capability_map row, including the draft→published→superseded lifecycle." },
  { name: "update_application_cost", operationKind: "mutate", dataObjectId: D.application_costs, description: "Update an application_cost row (quarterly TCO snapshot)." },
  { name: "create_application_value_score", operationKind: "mutate", dataObjectId: D.application_value_scores, description: "Create a new application_value_score row (TIME-quadrant recalculation)." },
  { name: "approve_technology_fit_assessment", operationKind: "mutate", dataObjectId: D.technology_fit_assessments, description: "Transition a technology_fit_assessment to `approved` (architect-of-record sign-off)." },
];

async function step1_tools(): Promise<Map<string, number>> {
  console.log("\n[1] tools");
  const existing = await get(`/tools?tool_name=in.(${newTools.map(t => `"${t.name}"`).join(",")})&select=id,tool_name`);
  const map = new Map<string, number>();
  for (const r of existing) map.set(String(r.tool_name), Number(r.id));
  const missing = newTools.filter(t => !map.has(t.name)).map(t => ({
    tool_name: t.name,
    operation_kind: t.operationKind,
    data_object_id: t.dataObjectId,
    description: t.description,
  }));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new`);
    await post("/tools", missing);
    const re = await get(`/tools?tool_name=in.(${newTools.map(t => `"${t.name}"`).join(",")})&select=id,tool_name`);
    map.clear();
    for (const r of re) map.set(String(r.tool_name), Number(r.id));
  } else {
    console.log("  nothing to insert");
  }
  return map;
}

// ============================================================
// 2. skills (system per module)
// ============================================================
type SkillDef = { name: string; moduleId: number; description: string };
const newSkills: SkillDef[] = [
  { name: "apm_portfolio_registry_agent", moduleId: M_REGISTRY, description: "System skill for the APM-PORTFOLIO-REGISTRY module: maintains the application portfolio inventory, technology platform registry, application interface map, and business capability map. Drives lifecycle transitions on enterprise_applications, technology_platforms, application_interfaces and business_capability_maps." },
  { name: "apm_rationalization_agent", moduleId: M_RATIONAL, description: "System skill for the APM-RATIONALIZATION module: scores applications on TIME quadrants, captures application TCO snapshots, runs technology fit assessments with architect-of-record sign-off, and feeds portfolio rationalization decisions back to the registry." },
];

async function step2_skills(): Promise<Map<string, number>> {
  console.log("\n[2] skills");
  const existing = await get(`/skills?skill_name=in.(${newSkills.map(s => `"${s.name}"`).join(",")})&select=id,skill_name`);
  const map = new Map<string, number>();
  for (const r of existing) map.set(String(r.skill_name), Number(r.id));
  const missing = newSkills.filter(s => !map.has(s.name)).map(s => ({
    skill_name: s.name,
    skill_type: "system",
    domain_id: APM_ID,
    domain_module_id: s.moduleId,
    description: s.description,
  }));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new`);
    await post("/skills", missing);
    const re = await get(`/skills?skill_name=in.(${newSkills.map(s => `"${s.name}"`).join(",")})&select=id,skill_name`);
    map.clear();
    for (const r of re) map.set(String(r.skill_name), Number(r.id));
  } else {
    console.log("  nothing to insert");
  }
  return map;
}

// ============================================================
// 3. skill_tools wiring
// ============================================================
type SkillToolDef = { skillName: string; toolName: string; requirement: "required" | "optional" | "fallback"; notes: string };
const skillTools: SkillToolDef[] = [
  // ---- apm_portfolio_registry_agent ----
  // Required queries on mastered data
  { skillName: "apm_portfolio_registry_agent", toolName: "query_enterprise_applications", requirement: "required", notes: "Read application portfolio inventory." },
  { skillName: "apm_portfolio_registry_agent", toolName: "query_technology_platforms", requirement: "required", notes: "Read technology platform registry." },
  { skillName: "apm_portfolio_registry_agent", toolName: "query_application_interfaces", requirement: "required", notes: "Read application integration inventory." },
  { skillName: "apm_portfolio_registry_agent", toolName: "query_business_capability_maps", requirement: "required", notes: "Read business capability map." },
  // Required mutates for lifecycle transitions
  { skillName: "apm_portfolio_registry_agent", toolName: "update_enterprise_application", requirement: "required", notes: "Maintain application records; drive sunsetting transitions." },
  { skillName: "apm_portfolio_registry_agent", toolName: "update_technology_platform", requirement: "required", notes: "Maintain platform records; drive declining/retired transitions." },
  { skillName: "apm_portfolio_registry_agent", toolName: "update_application_interface", requirement: "required", notes: "Maintain interface records; drive deprecated/retired transitions." },
  { skillName: "apm_portfolio_registry_agent", toolName: "update_business_capability_map", requirement: "required", notes: "Maintain capability map; drive draft→published→superseded lifecycle." },
  // Optional cross-domain reads
  { skillName: "apm_portfolio_registry_agent", toolName: "query_saas_applications", requirement: "optional", notes: "Cross-read SMP for SaaS slice of the portfolio." },
  { skillName: "apm_portfolio_registry_agent", toolName: "query_software_titles", requirement: "optional", notes: "Cross-read SAM for on-prem software titles." },
  { skillName: "apm_portfolio_registry_agent", toolName: "query_configuration_items", requirement: "optional", notes: "Cross-read CMDB for application-to-infrastructure dependency chains." },

  // ---- apm_rationalization_agent ----
  // Required queries on mastered data
  { skillName: "apm_rationalization_agent", toolName: "query_application_costs", requirement: "required", notes: "Read application TCO snapshots." },
  { skillName: "apm_rationalization_agent", toolName: "query_technology_fit_assessments", requirement: "required", notes: "Read fit assessments." },
  { skillName: "apm_rationalization_agent", toolName: "query_application_value_scores", requirement: "required", notes: "Read TIME-scored value snapshots." },
  // Required cross-module reads from registry
  { skillName: "apm_rationalization_agent", toolName: "query_enterprise_applications", requirement: "required", notes: "Cross-module read from registry: applications being scored." },
  { skillName: "apm_rationalization_agent", toolName: "query_technology_platforms", requirement: "required", notes: "Cross-module read from registry: platforms being assessed." },
  // Required mutates
  { skillName: "apm_rationalization_agent", toolName: "update_application_value_score", requirement: "required", notes: "Update score record after recalculation." },
  { skillName: "apm_rationalization_agent", toolName: "create_application_value_score", requirement: "required", notes: "Create new score row for each quarterly TIME recalculation." },
  { skillName: "apm_rationalization_agent", toolName: "update_application_cost", requirement: "required", notes: "Update TCO snapshot row." },
  { skillName: "apm_rationalization_agent", toolName: "approve_technology_fit_assessment", requirement: "required", notes: "Architect-of-record approval workflow gate." },
];

async function step3_skillTools(skillMap: Map<string, number>, toolMap: Map<string, number>) {
  console.log("\n[3] skill_tools");
  // Resolve all referenced tools (including existing ones not in toolMap)
  const allToolNames = [...new Set(skillTools.map(st => st.toolName))];
  const allTools = await get(`/tools?tool_name=in.(${allToolNames.map(n => `"${n}"`).join(",")})&select=id,tool_name`);
  const fullToolMap = new Map<string, number>();
  for (const r of allTools) fullToolMap.set(String(r.tool_name), Number(r.id));

  const skillIds = [...skillMap.values()];
  const existing = await get(`/skill_tools?skill_id=in.(${skillIds.join(",")})&select=skill_id,tool_id`);
  const existingSet = new Set(existing.map(r => `${r.skill_id}:${r.tool_id}`));

  const rows: Row[] = [];
  for (const st of skillTools) {
    const sid = skillMap.get(st.skillName);
    const tid = fullToolMap.get(st.toolName);
    if (!sid || !tid) throw new Error(`unresolved skill_tool: ${st.skillName} / ${st.toolName} (sid=${sid}, tid=${tid})`);
    if (existingSet.has(`${sid}:${tid}`)) continue;
    rows.push({ skill_id: sid, tool_id: tid, requirement_level: st.requirement, notes: st.notes });
  }
  if (rows.length === 0) { console.log("  nothing to insert"); return; }
  console.log(`  inserting ${rows.length} new`);
  await post("/skill_tools", rows);
}

// ============================================================
// 4. Retire legacy apm-system skill (id=2) + its skill_tools
// ============================================================
async function step4_retireLegacy() {
  console.log("\n[4] retire legacy apm-system skill");
  const legacy = await get(`/skills?skill_name=eq.apm-system&select=id`);
  if (legacy.length === 0) {
    console.log("  legacy skill already absent");
    return;
  }
  const legacyId = Number(legacy[0].id);
  // Delete skill_tools first (no cascade assumed)
  const stRows = await get(`/skill_tools?skill_id=eq.${legacyId}&select=id`);
  if (stRows.length > 0) {
    console.log(`  deleting ${stRows.length} legacy skill_tools rows`);
    await del(`/skill_tools?skill_id=eq.${legacyId}`);
  }
  console.log(`  deleting legacy skill row id=${legacyId}`);
  await del(`/skills?id=eq.${legacyId}`);
}

async function main() {
  console.log("Tranche 4 starting");
  const toolMap = await step1_tools();
  const skillMap = await step2_skills();
  await step3_skillTools(skillMap, toolMap);
  await step4_retireLegacy();
  console.log("\nTranche 4 done");
}
await main();
