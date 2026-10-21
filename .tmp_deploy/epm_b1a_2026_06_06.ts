#!/usr/bin/env bun
// EPM (domain 66) b1a execution - 2026-06-06.
// Executes the agent-solvable b1a items from audits/EPM/state.yaml:
//   B1A-SYSTEM-SKILLS : author 3 per-module system skills (239/240/241), redistribute the
//                       9 skill_tools from legacy skill id=4 to the matching per-module skill
//                       (generate_text replicated to all 3), then DELETE skill 4 + its 9 skill_tools.
//   B1A-CATALOG-UX    : write buyer-voice catalog_tagline + catalog_description on 239/240/241
//                       (empty-guard per field; never overwrite a non-empty value).
//   B1A-S9            : PATCH source_domain_module_id on the 8 outbound EPM handoffs.
//   B1A-S10           : INSERT intra-domain lifecycle_progression handoffs (only where the
//                       trigger_event exists). financial_budget.approved has NO trigger_event,
//                       so that one row is SKIPPED (authoring a new event is beyond the action).
//
// Idempotent: every write is preceded by a live read; already-correct rows are skipped.
// record_status is OMITTED on all inserts (DB default = "new"). No `notes` columns written (Rule #15).
// No em-dashes; American English.

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
const post = (path: string, body: Row[] | Row) => call({ method: "POST", path, body });
const del = (path: string) => call({ method: "DELETE", path });

const EPM = 66;

// Per-module system skills to author. skill_name = <module_code_lower>_agent.
const MODULE_SKILLS: { module_id: number; skill_name: string; description: string }[] = [
  {
    module_id: 239,
    skill_name: "epm_plan_budget_agent",
    description:
      "System skill for the Planning and Budgeting module: reads and updates financial plans and approved budgets, supports driver-based planning and the headcount-spend slice of the plan, and drafts plan and budget narrative.",
  },
  {
    module_id: 240,
    skill_name: "epm_forecast_scenario_agent",
    description:
      "System skill for the Forecasting and Scenario Modeling module: reads and refreshes rolling forecasts, reads what-if scenario models, and drafts forecast and scenario narrative.",
  },
  {
    module_id: 241,
    skill_name: "epm_variance_report_agent",
    description:
      "System skill for the Variance and Management Reporting module: reads variance analyses and period actuals from journal entries, and drafts root-cause variance commentary and management reporting narrative.",
  },
];

// Redistribution of the 9 legacy skill_tools (by tool_id) to per-module skills.
// generate_text (49, compute, external) is replicated to all 3 modules per the action.
// Each entry: module_id -> [{ tool_id, requirement_level }].
const TOOL_DISTRIBUTION: Record<number, { tool_id: number; requirement_level: string; name: string }[]> = {
  239: [
    { tool_id: 134, requirement_level: "required", name: "query_financial_plans (do 37)" },
    { tool_id: 139, requirement_level: "required", name: "query_budgets (do 38)" },
    { tool_id: 182, requirement_level: "required", name: "update_budget (mutate do 38)" },
    { tool_id: 49, requirement_level: "optional", name: "generate_text" },
  ],
  240: [
    { tool_id: 99, requirement_level: "required", name: "query_forecasts (do 39)" },
    { tool_id: 78, requirement_level: "required", name: "query_financial_scenarios (do 40)" },
    { tool_id: 183, requirement_level: "required", name: "update_forecast (mutate do 39)" },
    { tool_id: 49, requirement_level: "optional", name: "generate_text" },
  ],
  241: [
    { tool_id: 140, requirement_level: "required", name: "query_variance_analyses (do 41)" },
    { tool_id: 25, requirement_level: "required", name: "query_journal_entries (do 194, consumer)" },
    { tool_id: 49, requirement_level: "optional", name: "generate_text" },
  ],
};

// Buyer-voice catalog UX copy per module (Rule #20). Workflow + value voice; no vendor/product names.
const CATALOG_UX: Record<number, { catalog_tagline: string; catalog_description: string }> = {
  239: {
    catalog_tagline:
      "Build the annual operating plan and approve the budget that sets each team's spend for the year.",
    catalog_description:
      "Plan the year top to bottom: shape the long-range plan, model the drivers that move revenue and cost, and turn the plan into an approved budget that each cost center spends against. Bring the people-cost line into the same place so headcount and compensation plans roll up with everything else.\n\nMove a plan from draft through review to a locked, approved budget that downstream teams can trust. Once the budget is set it becomes the baseline that forecasts refresh against and that variance reporting measures actuals against, so the whole organization works from one agreed set of numbers.",
  },
  240: {
    catalog_tagline:
      "Refresh the outlook with rolling forecasts and stress-test the plan with what-if scenarios.",
    catalog_description:
      "Keep the outlook current. Refresh a rolling forecast each cycle so the expected landing point reflects the latest actuals and assumptions, and re-forecast quickly when the business changes instead of waiting for the next planning cycle.\n\nModel the alternatives before you commit. Layer upside, downside, cost-reduction, and growth scenarios on top of the base plan, compare them side by side, and hand the chosen path back to planning. Forecasts and scenarios give leaders an early read on where the year is heading and the confidence to re-align spend in time.",
  },
  241: {
    catalog_tagline:
      "Reconcile actuals against plan, explain the variance, and report the results to leadership.",
    catalog_description:
      "Close the loop on the plan. Pull period actuals against the approved budget and the latest forecast, surface where results diverge, and capture the root-cause commentary that explains why. Route material variances to the people accountable so nothing material goes unexplained.\n\nTurn the reconciliation into management reporting that leaders and finance partners actually read. Cost-center owners and the finance team get a clear, repeatable view of performance against plan, with the context they need to decide what to do next.",
  },
};

// B1A-S9: outbound EPM handoff -> source_domain_module_id, derived from the trigger_event's
// data_object (the module that masters it). Verified live before write.
const S9_ROUTING: Record<number, number> = {
  10: 239,  // financial_budget.cycle_started (do 38, financial_budgets -> 239)
  561: 239, // financial_plan.approved (do 37, financial_plans -> 239)
  601: 239, // financial_plan.approved (do 37, financial_plans -> 239)
  27: 240,  // financial_forecast.refreshed (do 39, financial_forecasts -> 240)
  199: 240, // financial_forecast.refreshed (do 39, financial_forecasts -> 240)
  562: 240, // financial_scenario.modeled (do 40, financial_scenarios -> 240)
  563: 241, // variance_analysis.material_variance (do 41, variance_analyses -> 241)
  564: 241, // variance_analysis.material_variance (do 41, variance_analyses -> 241)
};

// B1A-S10: intra-domain lifecycle_progression handoffs. Each needs an existing trigger_event.
// financial_budget.approved has NO trigger_event in the catalog -> that row is omitted (skip).
const S10_HANDOFFS: {
  trigger_event_name: string;
  source_module: number;
  target_module: number;
  payload_data_object_id: number; // matches the trigger_event's data_object
}[] = [
  { trigger_event_name: "financial_plan.published", source_module: 239, target_module: 240, payload_data_object_id: 37 },
  { trigger_event_name: "financial_forecast.refreshed", source_module: 240, target_module: 241, payload_data_object_id: 39 },
];

async function main() {
  console.log("=== EPM b1a execution 2026-06-06 ===\n");

  // ===============================================================
  // B1A-SYSTEM-SKILLS
  // ===============================================================
  console.log("[B1A-SYSTEM-SKILLS] author 3 per-module system skills + redistribute skill_tools\n");

  // Snapshot the legacy skill 4 + its skill_tools before any change (for history.md reversibility).
  const legacySkill = await get(`/skills?id=eq.4&select=id,skill_name,skill_type,domain_id,domain_module_id,description,record_status`);
  const legacyTools = await get(`/skill_tools?skill_id=eq.4&select=id,skill_id,tool_id,requirement_level,notes,record_status&order=id.asc`);
  console.log("  SNAPSHOT legacy skill 4:", JSON.stringify(legacySkill[0]));
  console.log(`  SNAPSHOT legacy skill_tools (${legacyTools.length}):`);
  for (const t of legacyTools) console.log(`    st ${t.id}: tool ${t.tool_id} (${t.requirement_level})`);
  console.log("");

  // 1. Insert the 3 per-module system skills (idempotent by (skill_type='system', domain_module_id)).
  const skillIdByModule: Record<number, number> = {};
  for (const s of MODULE_SKILLS) {
    const existing = await get(
      `/skills?skill_type=eq.system&domain_module_id=eq.${s.module_id}&select=id,skill_name`,
    );
    if (existing.length > 0) {
      skillIdByModule[s.module_id] = Number(existing[0].id);
      console.log(`  ok   module ${s.module_id} already has system skill id ${existing[0].id} (${existing[0].skill_name})`);
      continue;
    }
    const ins = await post(`/skills`, [
      {
        skill_name: s.skill_name,
        skill_type: "system",
        domain_id: EPM,
        domain_module_id: s.module_id,
        description: s.description,
        // record_status OMITTED (DB default 'new')
      },
    ]);
    skillIdByModule[s.module_id] = Number(ins[0].id);
    console.log(`  INSERT skill '${s.skill_name}' -> module ${s.module_id} (id ${ins[0].id})`);
  }
  console.log("");

  // 2. Insert skill_tools for each per-module skill (idempotent by (skill_id, tool_id)).
  for (const moduleId of [239, 240, 241]) {
    const skillId = skillIdByModule[moduleId];
    const dist = TOOL_DISTRIBUTION[moduleId];
    const existing = await get(`/skill_tools?skill_id=eq.${skillId}&select=tool_id`);
    const have = new Set(existing.map(r => Number(r.tool_id)));
    const toInsert = dist
      .filter(d => !have.has(d.tool_id))
      .map(d => ({ skill_id: skillId, tool_id: d.tool_id, requirement_level: d.requirement_level }));
    if (toInsert.length > 0) {
      await post(`/skill_tools`, toInsert);
    }
    for (const d of dist) {
      const status = have.has(d.tool_id) ? "ok  " : "INSERT";
      console.log(`  ${status} skill_tools skill ${skillId} (module ${moduleId}) -> tool ${d.tool_id} ${d.name} (${d.requirement_level})`);
    }
  }
  console.log("");

  // 3. DELETE legacy skill 4's skill_tools, then skill 4 itself (only after per-module skills exist).
  console.log("  retiring legacy skill 4 (F1 / Rule #17):");
  if (legacyTools.length > 0) {
    await del(`/skill_tools?skill_id=eq.4`);
    console.log(`    DELETE ${legacyTools.length} skill_tools rows on skill 4`);
  } else {
    console.log("    no skill_tools on skill 4 to delete (already removed?)");
  }
  if (legacySkill.length > 0) {
    await del(`/skills?id=eq.4`);
    console.log("    DELETE skill 4 (epm-system, legacy domain-scoped)");
  } else {
    console.log("    skill 4 not present (already removed?)");
  }
  console.log("");

  // ===============================================================
  // B1A-CATALOG-UX
  // ===============================================================
  console.log("[B1A-CATALOG-UX] write buyer-voice catalog copy on modules 239/240/241 (empty-guard)\n");
  const modules = await get(
    `/domain_modules?id=in.(239,240,241)&select=id,domain_module_code,catalog_tagline,catalog_description`,
  );
  for (const m of modules) {
    const copy = CATALOG_UX[Number(m.id)];
    const body: Row = {};
    if (String(m.catalog_tagline ?? "") === "") body.catalog_tagline = copy.catalog_tagline;
    else console.log(`  SKIP module ${m.id} catalog_tagline: non-empty, never overwrite`);
    if (String(m.catalog_description ?? "") === "") body.catalog_description = copy.catalog_description;
    else console.log(`  SKIP module ${m.id} catalog_description: non-empty, never overwrite`);
    if (Object.keys(body).length > 0) {
      await patch(`/domain_modules?id=eq.${m.id}`, body);
      console.log(`  PATCH module ${m.id} (${m.domain_module_code}): wrote ${Object.keys(body).join(", ")}`);
    } else {
      console.log(`  ok   module ${m.id}: both fields already populated, nothing written`);
    }
  }
  console.log("");

  // ===============================================================
  // B1A-S9
  // ===============================================================
  console.log("[B1A-S9] backfill source_domain_module_id on 8 outbound EPM handoffs\n");
  const s9ids = Object.keys(S9_ROUTING).map(Number);
  const s9rows = await get(
    `/handoffs?id=in.(${s9ids.join(",")})&select=id,source_domain_id,source_domain_module_id,data_object_id,trigger_event:trigger_events(event_name,data_object_id)`,
  );
  let s9patched = 0;
  for (const h of s9rows) {
    const target = S9_ROUTING[Number(h.id)];
    if (Number(h.source_domain_id) !== EPM) {
      console.log(`  SKIP handoff ${h.id}: source is not EPM`);
      continue;
    }
    if (h.source_domain_module_id !== null) {
      if (Number(h.source_domain_module_id) === target) {
        console.log(`  ok   handoff ${h.id}: source_domain_module_id already -> ${target}`);
      } else {
        console.log(`  WARN handoff ${h.id}: source_domain_module_id ${h.source_domain_module_id} != target ${target}; leaving as-is`);
      }
      continue;
    }
    await patch(`/handoffs?id=eq.${h.id}`, { source_domain_module_id: target });
    const ev = (h.trigger_event as Row) ?? {};
    console.log(`  PATCH handoff ${h.id} (${ev.event_name}): source_domain_module_id NULL -> ${target}`);
    s9patched++;
  }
  console.log(`  -> ${s9patched} handoffs patched\n`);

  // ===============================================================
  // B1A-S10
  // ===============================================================
  console.log("[B1A-S10] insert intra-domain lifecycle_progression handoffs (where event exists)\n");
  for (const h of S10_HANDOFFS) {
    const ev = await get(
      `/trigger_events?event_name=eq.${encodeURIComponent(h.trigger_event_name)}&select=id,event_name,data_object_id`,
    );
    if (ev.length === 0) {
      console.log(`  SKIP ${h.trigger_event_name}: no trigger_event in catalog`);
      continue;
    }
    const triggerEventId = Number(ev[0].id);
    // Dedup by the 4-tuple (source, target, data_object, trigger_event) on intra-domain rows.
    const dup = await get(
      `/handoffs?source_domain_id=eq.${EPM}&target_domain_id=eq.${EPM}` +
        `&data_object_id=eq.${h.payload_data_object_id}&trigger_event_id=eq.${triggerEventId}&select=id`,
    );
    if (dup.length > 0) {
      console.log(`  ok   ${h.trigger_event_name} ${h.source_module}->${h.target_module}: already exists (handoff ${dup[0].id})`);
      continue;
    }
    const ins = await post(`/handoffs`, [
      {
        source_domain_id: EPM,
        target_domain_id: EPM,
        source_domain_module_id: h.source_module,
        target_domain_module_id: h.target_module,
        data_object_id: h.payload_data_object_id,
        trigger_event_id: triggerEventId,
        integration_pattern: "lifecycle_progression",
        friction_level: "low",
        // record_status OMITTED (DB default 'new'); notes left empty (Rule #15)
      },
    ]);
    console.log(`  INSERT handoff ${h.trigger_event_name} ${h.source_module}->${h.target_module} (id ${ins[0]?.id})`);
  }
  console.log("  NOTE financial_budget.approved 239->241 NOT inserted: no such trigger_event exists.\n");

  // ===============================================================
  // Verification re-reads
  // ===============================================================
  console.log("=== verification ===");
  const sysSkills = await get(
    `/skills?domain_module_id=in.(239,240,241)&skill_type=eq.system&select=id,skill_name,domain_module_id&order=domain_module_id.asc`,
  );
  console.log(`system skills on 239/240/241: ${sysSkills.length} (expect 3)`);
  for (const s of sysSkills) console.log(`  module ${s.domain_module_id}: skill ${s.id} ${s.skill_name}`);
  const skillIds = sysSkills.map(s => Number(s.id));
  if (skillIds.length > 0) {
    const stCounts = await get(`/skill_tools?skill_id=in.(${skillIds.join(",")})&select=skill_id`);
    const bySkill: Record<number, number> = {};
    for (const r of stCounts) bySkill[Number(r.skill_id)] = (bySkill[Number(r.skill_id)] ?? 0) + 1;
    for (const s of sysSkills) console.log(`  skill ${s.id} (module ${s.domain_module_id}): ${bySkill[Number(s.id)] ?? 0} skill_tools`);
  }
  const skill4 = await get(`/skills?id=eq.4&select=id`);
  const st4 = await get(`/skill_tools?skill_id=eq.4&select=id`);
  console.log(`legacy skill 4 rows: ${skill4.length} (expect 0); legacy skill_tools on 4: ${st4.length} (expect 0)`);

  const uxRows = await get(`/domain_modules?id=in.(239,240,241)&select=id,catalog_tagline,catalog_description`);
  for (const m of uxRows) {
    console.log(`  module ${m.id}: tagline ${String(m.catalog_tagline ?? "") === "" ? "EMPTY" : "set"}, description ${String(m.catalog_description ?? "") === "" ? "EMPTY" : "set"}`);
  }

  const s9null = await get(`/handoffs?source_domain_id=eq.66&source_domain_module_id=is.null&select=id`);
  console.log(`outbound EPM handoffs still NULL source module: ${s9null.length} (expect 0)`);
  const intra = await get(
    `/handoffs?source_domain_id=eq.66&target_domain_id=eq.66&select=id,source_domain_module_id,target_domain_module_id,integration_pattern,trigger_event:trigger_events(event_name)&order=id.asc`,
  );
  console.log(`intra-domain EPM handoffs: ${intra.length}`);
  for (const h of intra) {
    const ev = (h.trigger_event as Row) ?? {};
    console.log(`  handoff ${h.id}: ${h.source_domain_module_id}->${h.target_domain_module_id} ${ev.event_name} (${h.integration_pattern})`);
  }

  console.log("\nUI links:");
  console.log("  https://adenin.semantius.ai/domain_map/skills");
  console.log("  https://adenin.semantius.ai/domain_map/skill_tools");
  console.log("  https://adenin.semantius.ai/domain_map/domain_modules");
  console.log("  https://adenin.semantius.ai/domain_map/handoffs");
  console.log("\n=== done ===");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
