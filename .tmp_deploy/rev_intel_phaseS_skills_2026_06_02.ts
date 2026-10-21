#!/usr/bin/env bun
// REV-INTEL Phase S: one system skill per module + tools + skill_tools (Rule #17).
// Idempotent on natural keys (tool_name, skill_name, skill_id+tool_id).
import { $ } from "bun";
$.throws(false);
type Row = Record<string, unknown>;
async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [o, e] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if (await proc.exited !== 0) throw new Error(`semantius failed: ${e}`);
  const t = o.trim(); return t ? JSON.parse(t) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
const post = (p: string, b: Row[]) => b.length ? call({ method: "POST", path: p, body: b }) : Promise.resolve([] as Row[]);

const MOD = { CONV: 186, DEAL: 187, FCST: 188, COACH: 189, ACT: 190 };

// NEW tools: [name, operation_kind, data_object_id|null, coverage_tier, desc]
const NEW_TOOLS: Array<[string,string,number|null,string,string]> = [
  ["query_conversation_topics","query",1005,"platform","Query extracted conversation topics."],
  ["query_market_signals","query",1007,"platform","Query aggregated market and competitive signals."],
  ["update_conversation_action_item","mutate",1006,"platform","Update the status of a conversation action item."],
  ["query_deal_risk_scores","query",1008,"platform","Query per-opportunity deal risk scores."],
  ["query_deal_warnings","query",1009,"platform","Query deal warnings raised on opportunities."],
  ["acknowledge_deal_warning","mutate",1009,"platform","Acknowledge a raised deal warning."],
  ["clear_deal_warning","mutate",1009,"platform","Clear a resolved deal warning."],
  ["compute_deal_risk_score","compute",null,"external","Run the model that computes an opportunity deal risk score."],
  ["query_revenue_forecasts","query",1010,"platform","Query revenue forecast snapshots."],
  ["query_forecast_submissions","query",1011,"platform","Query rep and manager forecast submissions."],
  ["submit_forecast","mutate",1011,"platform","Submit a forecast for the period."],
  ["update_forecast_adjustment","mutate",1012,"platform","Record a manager forecast adjustment."],
  ["compute_revenue_forecast","compute",null,"external","Run the forecasting model to produce a revenue forecast."],
  ["query_coaching_sessions","query",1014,"platform","Query coaching sessions."],
  ["complete_coaching_session","mutate",1014,"platform","Mark a coaching session completed with notes."],
  ["query_coaching_scorecards","query",1015,"platform","Query coaching scorecards."],
  ["create_call_review_comment","mutate",1016,"platform","Add a timestamped review comment to a recorded call."],
  ["query_captured_activities","query",1017,"platform","Query auto-captured activities."],
  ["create_captured_activity","mutate",1017,"platform","Record a captured activity attributed to an opportunity."],
  ["query_engagement_scores","query",1019,"platform","Query account and contact engagement scores."],
  ["fetch_email_activity","fetch",null,"external","Fetch emails, meetings, and calls from connected email and calendar systems for activity capture."],
];

// skills: [skill_name, module_id, desc]
const SKILLS: Array<[string,number,string]> = [
  ["rev_intel_conversation_agent", MOD.CONV, "Transcribes and analyzes sales conversations: extracts topics, action items, and market signals from the call corpus."],
  ["rev_intel_deal_intel_agent", MOD.DEAL, "Scores opportunity risk, raises and clears deal warnings, and drives the manager pipeline-inspection surface."],
  ["rev_intel_forecast_agent", MOD.FCST, "Produces revenue forecasts, runs the rep submission cycle, and tracks forecast accuracy."],
  ["rev_intel_coaching_agent", MOD.COACH, "Runs coaching sessions over recorded calls: scorecards, review comments, and playbook compliance."],
  ["rev_intel_activity_capture_agent", MOD.ACT, "Auto-captures activities, attributes them to opportunities, and rolls up engagement scores."],
];

// skill_tools by skill_name -> [tool_name, requirement_level]
const SKILL_TOOLS: Record<string, Array<[string,string]>> = {
  rev_intel_conversation_agent: [
    ["query_conversation_intelligence_records","required"], ["query_call_recordings","required"],
    ["transcribe_audio","required"], ["classify_text","required"],
    ["query_conversation_topics","optional"], ["query_market_signals","optional"],
    ["update_conversation_action_item","optional"], ["detect_sentiment","optional"],
  ],
  rev_intel_deal_intel_agent: [
    ["query_deal_risk_scores","required"], ["compute_deal_risk_score","required"], ["query_crm_opportunities","required"],
    ["query_deal_warnings","optional"], ["acknowledge_deal_warning","optional"], ["clear_deal_warning","optional"],
    ["query_conversation_intelligence_records","optional"], ["query_captured_activities","optional"], ["notify_person","optional"],
  ],
  rev_intel_forecast_agent: [
    ["query_revenue_forecasts","required"], ["compute_revenue_forecast","required"], ["query_forecast_submissions","required"],
    ["submit_forecast","required"], ["query_crm_opportunities","required"],
    ["update_forecast_adjustment","optional"], ["query_deal_risk_scores","optional"],
  ],
  rev_intel_coaching_agent: [
    ["query_coaching_sessions","required"], ["query_call_recordings","required"],
    ["complete_coaching_session","optional"], ["query_coaching_scorecards","optional"],
    ["create_call_review_comment","optional"], ["query_conversation_intelligence_records","optional"], ["notify_person","optional"],
  ],
  rev_intel_activity_capture_agent: [
    ["query_captured_activities","required"], ["create_captured_activity","required"], ["fetch_email_activity","required"],
    ["query_crm_opportunities","required"], ["query_engagement_scores","optional"],
  ],
};

async function main() {
  // 1. tools (dedupe by name)
  const newNames = NEW_TOOLS.map(t => t[0]);
  const exTools = await get(`/tools?tool_name=in.(${newNames.join(",")})&select=id,tool_name`);
  const haveTool = new Set(exTools.map(r => String(r.tool_name)));
  const toolRows = NEW_TOOLS.filter(t => !haveTool.has(t[0])).map(t => ({
    tool_name: t[0], operation_kind: t[1], data_object_id: t[2], coverage_tier: t[3], description: t[4],
  }));
  console.log(toolRows.length ? `Inserting ${toolRows.length} tools (${exTools.length} existed)` : "tools: all present");
  await post("/tools", toolRows);

  // resolve all tool names -> id (new + reused)
  const reused = ["query_conversation_intelligence_records","query_call_recordings","query_crm_opportunities","transcribe_audio","classify_text","detect_sentiment","notify_person"];
  const allToolNames = [...newNames, ...reused];
  const allTools = await get(`/tools?tool_name=in.(${allToolNames.join(",")})&select=id,tool_name`);
  const toolId = new Map<string, number>();
  for (const r of allTools) toolId.set(String(r.tool_name), Number(r.id));
  for (const n of allToolNames) if (!toolId.has(n)) throw new Error(`tool not found: ${n}`);

  // 2. skills (dedupe by skill_name + system + module)
  const skillNames = SKILLS.map(s => s[0]);
  const exSkills = await get(`/skills?skill_name=in.(${skillNames.join(",")})&select=id,skill_name`);
  const haveSkill = new Set(exSkills.map(r => String(r.skill_name)));
  const skillRows = SKILLS.filter(s => !haveSkill.has(s[0])).map(s => ({
    skill_name: s[0], skill_type: "system", domain_module_id: s[1], domain_id: 103, description: s[2],
  }));
  console.log(skillRows.length ? `Inserting ${skillRows.length} skills` : "skills: all present");
  await post("/skills", skillRows);
  const allSkills = await get(`/skills?skill_name=in.(${skillNames.join(",")})&select=id,skill_name`);
  const skillId = new Map<string, number>();
  for (const r of allSkills) skillId.set(String(r.skill_name), Number(r.id));

  // 3. skill_tools (dedupe by skill_id+tool_id)
  const sIds = [...skillId.values()];
  const exST = await get(`/skill_tools?skill_id=in.(${sIds.join(",")})&select=skill_id,tool_id`);
  const haveST = new Set(exST.map(r => `${r.skill_id}:${r.tool_id}`));
  const stRows: Row[] = [];
  for (const [sname, tools] of Object.entries(SKILL_TOOLS)) {
    const sid = skillId.get(sname)!;
    for (const [tname, lvl] of tools) {
      const tid = toolId.get(tname)!;
      if (!haveST.has(`${sid}:${tid}`)) stRows.push({ skill_id: sid, tool_id: tid, requirement_level: lvl, notes: "" });
    }
  }
  console.log(stRows.length ? `Inserting ${stRows.length} skill_tools` : "skill_tools: all present");
  await post("/skill_tools", stRows);

  // verify F2/F3/F5
  console.log("\n=== VERIFY ===");
  for (const [sname, mid] of SKILLS.map(s => [s[0], s[1]] as [string,number])) {
    const sid = skillId.get(sname)!;
    const st = await get(`/skill_tools?skill_id=eq.${sid}&select=requirement_level,tools(coverage_tier)`);
    const plat = st.filter((r:any)=>r.tools.coverage_tier==="platform").length;
    console.log(`  ${sname} (mod ${mid}): ${st.length} tools, strict_score ${plat}/${st.length} = ${(plat/st.length*100).toFixed(0)}%`);
  }
  // F2: exactly one system skill per module
  const modIds = Object.values(MOD).join(",");
  const sysSkills = await get(`/skills?domain_module_id=in.(${modIds})&skill_type=eq.system&select=domain_module_id`);
  const perMod = new Map<number,number>();
  for (const r of sysSkills) perMod.set(Number(r.domain_module_id), (perMod.get(Number(r.domain_module_id))??0)+1);
  console.log(`F2 system skills per module: ${[...perMod.entries()].map(([m,c])=>`${m}:${c}`).join(" ")} (expect each =1)`);
}
main().catch(e => { console.error(e); process.exit(1); });
