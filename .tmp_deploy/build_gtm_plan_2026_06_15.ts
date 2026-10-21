#!/usr/bin/env bun
// GTM-PLAN build (a1=b, 5 modules). Phase 0: .tmp_deploy/GTM-PLAN-phase0-2026-06-13.md.
// LAUNCH-ORCH already relocated to PMM; ICP/target_lists stay here (a5=b); channel-mix thin
// master stays (a9=c). Vendors/solutions/Phase-C already loaded. Idempotent. record_status='new'.

import { $ } from "bun";
$.throws(false);
type Row = Record<string, unknown>;
async function call(body: Row): Promise<Row[]> {
  const p = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  p.stdin.write(JSON.stringify(body)); await p.stdin.end();
  const [o, e] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()]);
  if ((await p.exited) !== 0) throw new Error(`semantius failed: ${e}`);
  const t = o.trim(); return t ? JSON.parse(t) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
const post = (p: string, b: Row[]) => call({ method: "POST", path: p, body: b });
const patch = (p: string, b: Row) => call({ method: "PATCH", path: p, body: b });
async function syncByKey(path: string, rows: Row[], key: string): Promise<Record<string, number>> {
  const ex = await get(`${path}?select=id,${key}&limit=10000`); const have = new Set(ex.map(r => String(r[key])));
  const miss = rows.filter(r => !have.has(String(r[key]))); if (miss.length) await post(path, miss);
  const all = await get(`${path}?select=id,${key}&limit=10000`); const m: Record<string, number> = {};
  for (const r of all) m[String(r[key])] = Number(r.id); return m;
}
const GTM = 104;

async function main() {
  // ===== modules =====
  const modules = [
    { domain_module_code: "GTM-PLAN-PLANNING-CORE", domain_module_name: "Planning Core", domain_id: GTM, module_kind: "full",
      description: "The who-do-we-sell-to layer: market segmentation, ICP authoring, named target-account lists, planning-grade account scoring, and strategic channel-mix. The segmentation surface every planning vendor co-locates.",
      catalog_tagline: "Define who you sell to: segments, your ideal customer, named target accounts, and how you score them.",
      catalog_description: "Decide where to play before you spend a dollar. Build your market segments, define the ideal customer profile, and author the named target-account lists the whole revenue team works from, then score accounts so reps chase the right ones. Set the strategic channel mix that says which routes carry which segments. The output is a shared, governed view of your market that feeds territory design, sales engagement, and demand programs." },
    { domain_module_code: "GTM-PLAN-TERRITORY-QUOTA", domain_module_name: "Territory and Quota", domain_id: GTM, module_kind: "full",
      description: "Territory carving and quota allocation: balanced territory design and quota setting against coverage and capacity. The single most universal planner surface.",
      catalog_tagline: "Carve balanced territories and set quotas that hold up, against real coverage and capacity.",
      catalog_description: "Turn the plan into who-owns-what: design balanced territories, see coverage and white space, and allocate quotas that tie back to capacity and segment potential. Reps get fair, defensible patches and numbers, and leadership gets a territory and quota model that survives the year instead of being reworked every quarter. When the design locks, it pushes cleanly into Sales execution." },
    { domain_module_code: "GTM-PLAN-CAPACITY", domain_module_name: "Capacity Planning", domain_id: GTM, module_kind: "full",
      description: "Sales-capacity modeling: coverage, ramp, productivity assumptions, headcount, and hiring plans against revenue targets.",
      catalog_tagline: "Model the capacity you need to hit the number: coverage, ramp, productivity, and hiring.",
      catalog_description: "Answer how many sellers, of what kind, by when. Model coverage and productivity assumptions, factor in ramp time, and build the hiring plan that closes the gap between capacity and the revenue target. See where you are short or over-built before the year starts, and give Finance and Recruiting a headcount plan grounded in real coverage math rather than a top-down guess." },
    { domain_module_code: "GTM-PLAN-SCENARIO", domain_module_name: "Scenario Modeling", domain_id: GTM, module_kind: "full",
      description: "What-if scenario modeling and plan versioning across segmentation, territory, capacity, and channel choices.",
      catalog_tagline: "Run the what-ifs and compare versions before you commit the plan.",
      catalog_description: "Stress-test the plan before you lock it. Model alternative scenarios across segments, territories, capacity, and channels, compare them side by side, and keep every version so you can see what changed and why. When the business asks what happens if we add ten reps or shift to a new segment, you answer with a modeled scenario, not a hunch, and you carry the winning version forward into the locked plan." },
    { domain_module_code: "GTM-PLAN-EXEC-HANDOFF", domain_module_name: "Plan Lock and Handoff", domain_id: GTM, module_kind: "full",
      description: "Plan approval, lock, and the downstream push: approvals, lock records, and handoff of the committed plan to CRM, SPM, Marketing, and Finance.",
      catalog_tagline: "Lock the plan and push it cleanly to Sales, Marketing, and Finance.",
      catalog_description: "Close the planning cycle with control. Route the plan for approval, lock it so it stops moving, and push the committed segments, territories, quotas, and capacity to the systems that execute: CRM and Sales Performance for territories and quotas, the ABM platform and Marketing for target accounts, and Finance for the capacity numbers. One source of truth for what was committed, and a clean handoff instead of a spreadsheet hand-off." },
  ];
  const existMods = new Set((await get(`/domain_modules?domain_id=eq.${GTM}&select=domain_module_code`)).map(r => r.domain_module_code));
  const newMods = modules.filter(m => !existMods.has(m.domain_module_code));
  if (newMods.length) await post("/domain_modules", newMods);
  const M: Record<string, number> = {};
  for (const r of await get(`/domain_modules?domain_id=eq.${GTM}&select=id,domain_module_code`)) M[String(r.domain_module_code)] = Number(r.id);
  console.log("modules:", M);

  // ===== domain_module_capabilities (7 caps -> 5 modules) =====
  const capLinks: Array<[number, string]> = [
    [104, "GTM-PLAN-PLANNING-CORE"], [106, "GTM-PLAN-PLANNING-CORE"], [108, "GTM-PLAN-PLANNING-CORE"],
    [105, "GTM-PLAN-TERRITORY-QUOTA"], [107, "GTM-PLAN-CAPACITY"], [110, "GTM-PLAN-SCENARIO"], [111, "GTM-PLAN-EXEC-HANDOFF"],
  ];
  const haveDMC = new Set((await get(`/domain_module_capabilities?domain_module_id=in.(${Object.values(M).join(",")})&select=domain_module_id,capability_id`)).map(r => `${r.domain_module_id}|${r.capability_id}`));
  const newDMC = capLinks.filter(([c, code]) => !haveDMC.has(`${M[code]}|${c}`)).map(([c, code]) => ({ domain_module_id: M[code], capability_id: c, notes: "" }));
  if (newDMC.length) await post("/domain_module_capabilities", newDMC);
  console.log(`domain_module_capabilities: +${newDMC.length}`);

  // ===== masters =====
  type Spec = { name: string; sl: string; pl: string; et: string; mod: string; nec: string; desc: string };
  const objs: Spec[] = [
    { name: "market_segments", sl: "Market Segment", pl: "Market Segments", et: "catalog", mod: "GTM-PLAN-PLANNING-CORE", nec: "required", desc: "A defined slice of the market (industry, size, geography, motion) the plan targets." },
    { name: "ideal_customer_profiles", sl: "Ideal Customer Profile", pl: "Ideal Customer Profiles", et: "catalog", mod: "GTM-PLAN-PLANNING-CORE", nec: "required", desc: "A definition of the best-fit account: firmographics, technographics, and qualifying criteria. Authored here and consumed by the ABM platform for engagement." },
    { name: "target_account_lists", sl: "Target Account List", pl: "Target Account Lists", et: "operational_workflow", mod: "GTM-PLAN-PLANNING-CORE", nec: "required", desc: "A named, approved list of accounts to pursue in the plan period; the handoff artifact to CRM and the ABM platform." },
    { name: "account_scores", sl: "Account Score", pl: "Account Scores", et: "computed", mod: "GTM-PLAN-PLANNING-CORE", nec: "required", desc: "A planning-grade fit/priority score per account, derived from the ICP and segment model." },
    { name: "channel_mix_plans", sl: "Channel Mix Plan", pl: "Channel Mix Plans", et: "operational_workflow", mod: "GTM-PLAN-PLANNING-CORE", nec: "optional", desc: "The strategic channel-mix master: which routes (direct, partner, digital, PLG) carry which segments. Spend-execution allocation lives downstream in Marketing Automation and the ABM platform." },
    { name: "territories", sl: "Territory", pl: "Territories", et: "operational_workflow", mod: "GTM-PLAN-TERRITORY-QUOTA", nec: "required", desc: "A carved sales territory: the accounts and geography assigned to a rep or team." },
    { name: "quotas", sl: "Quota", pl: "Quotas", et: "operational_workflow", mod: "GTM-PLAN-TERRITORY-QUOTA", nec: "required", desc: "An allocated revenue target for a territory, rep, or team for the plan period." },
    { name: "capacity_plans", sl: "Capacity Plan", pl: "Capacity Plans", et: "operational_workflow", mod: "GTM-PLAN-CAPACITY", nec: "required", desc: "A sales-capacity model: coverage, ramp, and productivity assumptions sized against the revenue target." },
    { name: "hiring_plans", sl: "Hiring Plan", pl: "Hiring Plans", et: "operational_workflow", mod: "GTM-PLAN-CAPACITY", nec: "optional", desc: "The headcount plan that closes the capacity gap: roles, timing, and ramp, handed to Recruiting and Finance." },
    { name: "gtm_scenarios", sl: "GTM Scenario", pl: "GTM Scenarios", et: "operational_workflow", mod: "GTM-PLAN-SCENARIO", nec: "required", desc: "A what-if model of the plan under alternative segment, territory, capacity, or channel assumptions." },
    { name: "plan_versions", sl: "Plan Version", pl: "Plan Versions", et: "operational_record", mod: "GTM-PLAN-SCENARIO", nec: "optional", desc: "A saved snapshot of the plan at a point in time, for comparison and audit." },
    { name: "gtm_plans", sl: "GTM Plan", pl: "GTM Plans", et: "operational_workflow", mod: "GTM-PLAN-EXEC-HANDOFF", nec: "required", desc: "The committed go-to-market plan for a period: the parent artifact that locks and pushes downstream. Mastered by every pure-play planning vendor." },
    { name: "plan_lock_records", sl: "Plan Lock Record", pl: "Plan Lock Records", et: "operational_record", mod: "GTM-PLAN-EXEC-HANDOFF", nec: "optional", desc: "An append-only record of plan approvals, locks, and the downstream push events." },
  ];
  const doMap = await syncByKey("/data_objects", objs.map(o => ({ data_object_name: o.name, singular_label: o.sl, plural_label: o.pl, description: o.desc, entity_type: o.et })), "data_object_name");
  const haveDMDO = new Set((await get(`/domain_module_data_objects?domain_module_id=in.(${Object.values(M).join(",")})&select=domain_module_id,data_object_id`)).map(r => `${r.domain_module_id}|${r.data_object_id}`));
  const newDMDO = objs.filter(o => !haveDMDO.has(`${M[o.mod]}|${doMap[o.name]}`)).map(o => ({ domain_module_id: M[o.mod], data_object_id: doMap[o.name], role: "master", necessity: o.nec, notes: "" }));
  if (newDMDO.length) await post("/domain_module_data_objects", newDMDO);
  console.log(`masters synced; DMDOs +${newDMDO.length}`);

  // ===== lifecycle (8 operational_workflow masters) =====
  type St = { s: string; o: number; init?: boolean; term?: boolean; perm?: boolean; verb?: string; d: string };
  const machines: Array<{ name: string; mod: string; states: St[] }> = [
    { name: "gtm_plans", mod: "GTM-PLAN-EXEC-HANDOFF", states: [
      { s: "drafted", o: 1, init: true, d: "Plan in development." }, { s: "in_review", o: 2, d: "Plan under cross-functional review." },
      { s: "approved", o: 3, perm: true, verb: "approve_plan", d: "Plan approved." }, { s: "locked", o: 4, perm: true, verb: "lock_plan", d: "Plan locked; pushes downstream." }, { s: "archived", o: 5, term: true, d: "Plan superseded." } ] },
    { name: "target_account_lists", mod: "GTM-PLAN-PLANNING-CORE", states: [
      { s: "drafted", o: 1, init: true, d: "List being built." }, { s: "in_review", o: 2, d: "Under review." }, { s: "approved", o: 3, term: true, perm: true, verb: "approve_target_list", d: "List approved; handed to CRM/ABM." } ] },
    { name: "channel_mix_plans", mod: "GTM-PLAN-PLANNING-CORE", states: [
      { s: "drafted", o: 1, init: true, d: "Channel mix being modeled." }, { s: "approved", o: 2, term: true, perm: true, verb: "approve_channel_mix", d: "Strategic channel mix approved." } ] },
    { name: "territories", mod: "GTM-PLAN-TERRITORY-QUOTA", states: [
      { s: "proposed", o: 1, init: true, d: "Territory drafted." }, { s: "in_review", o: 2, d: "Under balance review." }, { s: "approved", o: 3, perm: true, verb: "approve_territory", d: "Territory approved." }, { s: "active", o: 4, term: true, d: "Territory in effect." } ] },
    { name: "quotas", mod: "GTM-PLAN-TERRITORY-QUOTA", states: [
      { s: "drafted", o: 1, init: true, d: "Quota drafted." }, { s: "allocated", o: 2, d: "Quota allocated across the territory." }, { s: "approved", o: 3, term: true, perm: true, verb: "approve_quota", d: "Quota approved." } ] },
    { name: "capacity_plans", mod: "GTM-PLAN-CAPACITY", states: [
      { s: "drafted", o: 1, init: true, d: "Capacity model started." }, { s: "modeled", o: 2, d: "Coverage and ramp modeled." }, { s: "approved", o: 3, term: true, perm: true, verb: "approve_capacity_plan", d: "Capacity plan approved." } ] },
    { name: "hiring_plans", mod: "GTM-PLAN-CAPACITY", states: [
      { s: "drafted", o: 1, init: true, d: "Hiring plan drafted." }, { s: "approved", o: 2, term: true, perm: true, verb: "approve_hiring_plan", d: "Hiring plan approved; handed to Recruiting." } ] },
    { name: "gtm_scenarios", mod: "GTM-PLAN-SCENARIO", states: [
      { s: "modeled", o: 1, init: true, d: "Scenario modeled." }, { s: "compared", o: 2, d: "Compared against the base plan." }, { s: "selected", o: 3, term: true, perm: true, verb: "select_scenario", d: "Scenario selected to carry forward." } ] },
  ];
  const haveLS = new Set((await get(`/data_object_lifecycle_states?data_object_id=in.(${machines.map(m => doMap[m.name]).join(",")})&select=data_object_id,state_name`)).map(r => `${r.data_object_id}|${r.state_name}`));
  const lsRows: Row[] = [];
  for (const m of machines) for (const st of m.states) {
    if (haveLS.has(`${doMap[m.name]}|${st.s}`)) continue;
    lsRows.push({ data_object_id: doMap[m.name], state_name: st.s, state_order: st.o, description: st.d, is_initial: !!st.init, is_terminal: !!st.term, requires_permission: !!st.perm, permission_verb_override: st.verb ?? "", notes: "", domain_module_id: M[m.mod] });
  }
  if (lsRows.length) await post("/data_object_lifecycle_states", lsRows);
  console.log(`lifecycle states: +${lsRows.length}`);

  // ===== a2 (B2-C1): channel-mix capability override to Marketing =====
  const haveBfc = await get("/business_function_capabilities?capability_id=eq.108&business_function_id=eq.22&select=id");
  if (!haveBfc.length) await post("/business_function_capabilities", [{ business_function_id: 22, capability_id: 108, responsibility_type: "owner", notes: "" }]);
  console.log("a2: channel-mix (108) function override -> Marketing");

  // ===== a6 (B2-D1): rewrite domains.description (narrowed after PMM + ABM promotion) =====
  await patch(`/domains?id=eq.${GTM}`, { description: "Cross-functional annual go-to-market planning owned by Sales Operations and RevOps: market segmentation, ICP and named-target-account-list authoring, planning-grade account scoring, territory carving and quota allocation, sales-capacity and coverage modeling, strategic channel-mix, what-if scenario modeling, and the plan-lock and downstream push to Sales, Marketing, and Finance. Authors the ICPs and target account lists that ABM-PLATFORM later engages against, and the territory and quota design that Sales Performance Management executes. Launch orchestration moved to Product Marketing Management; engagement (intent, ads, web personalization) moved to ABM-PLATFORM." });
  console.log("a6: GTM-PLAN description rewritten (narrowed scope)");

  // ===== Phase S: system skill + tools =====
  if (!(await get(`/skills?domain_id=eq.${GTM}&skill_type=eq.system&select=id`)).length)
    await post("/skills", [{ skill_name: "gtm-plan-system", skill_type: "system", domain_id: GTM, domain_module_id: null, description: "System skill for Go-to-Market Planning: runtime workflows over segments, ICPs, target lists, territories, quotas, capacity, scenarios, and the locked plan; derived from the domain's modules and their tools." }]);
  const toolSpecs = [
    { tool_name: "query_target_account_lists", operation_kind: "query", data_object_id: doMap["target_account_lists"], coverage_tier: "platform", description: "Query target account lists.", mod: "GTM-PLAN-PLANNING-CORE" },
    { tool_name: "update_target_account_list", operation_kind: "mutate", data_object_id: doMap["target_account_lists"], coverage_tier: "platform", description: "Create or update a target account list.", mod: "GTM-PLAN-PLANNING-CORE" },
    { tool_name: "query_ideal_customer_profiles", operation_kind: "query", data_object_id: doMap["ideal_customer_profiles"], coverage_tier: "platform", description: "Query ideal customer profiles.", mod: "GTM-PLAN-PLANNING-CORE" },
    { tool_name: "query_territories", operation_kind: "query", data_object_id: doMap["territories"], coverage_tier: "platform", description: "Query territories.", mod: "GTM-PLAN-TERRITORY-QUOTA" },
    { tool_name: "update_territory", operation_kind: "mutate", data_object_id: doMap["territories"], coverage_tier: "platform", description: "Create or update a territory.", mod: "GTM-PLAN-TERRITORY-QUOTA" },
    { tool_name: "update_quota", operation_kind: "mutate", data_object_id: doMap["quotas"], coverage_tier: "platform", description: "Create or update a quota.", mod: "GTM-PLAN-TERRITORY-QUOTA" },
    { tool_name: "update_capacity_plan", operation_kind: "mutate", data_object_id: doMap["capacity_plans"], coverage_tier: "platform", description: "Create or update a capacity plan.", mod: "GTM-PLAN-CAPACITY" },
    { tool_name: "update_gtm_scenario", operation_kind: "mutate", data_object_id: doMap["gtm_scenarios"], coverage_tier: "platform", description: "Create or update a GTM scenario.", mod: "GTM-PLAN-SCENARIO" },
    { tool_name: "query_gtm_plans", operation_kind: "query", data_object_id: doMap["gtm_plans"], coverage_tier: "platform", description: "Query GTM plans.", mod: "GTM-PLAN-EXEC-HANDOFF" },
    { tool_name: "update_gtm_plan", operation_kind: "mutate", data_object_id: doMap["gtm_plans"], coverage_tier: "platform", description: "Create or update a GTM plan.", mod: "GTM-PLAN-EXEC-HANDOFF" },
  ];
  const toolMap = await syncByKey("/tools", toolSpecs.map(({ mod, ...rest }) => rest), "tool_name");
  const haveDMT = new Set((await get(`/domain_module_tools?domain_module_id=in.(${Object.values(M).join(",")})&select=domain_module_id,tool_id`)).map(r => `${r.domain_module_id}|${r.tool_id}`));
  const newDMT = toolSpecs.filter(t => !haveDMT.has(`${M[t.mod]}|${toolMap[t.tool_name]}`)).map(t => ({ domain_module_id: M[t.mod], tool_id: toolMap[t.tool_name], requirement_level: "required", notes: "" }));
  if (newDMT.length) await post("/domain_module_tools", newDMT);
  console.log(`tools synced; domain_module_tools +${newDMT.length}`);

  // ===== VERIFY =====
  console.log("\n== VERIFY ==");
  console.log("modules:", (await get(`/domain_modules?domain_id=eq.${GTM}&select=domain_module_code`)).length, "(want 5)");
  console.log("masters:", (await get(`/domain_module_data_objects?domain_module_id=in.(${Object.values(M).join(",")})&role=eq.master&select=data_object_id`)).length, "(want 13)");
  console.log("lifecycle states:", (await get(`/data_object_lifecycle_states?data_object_id=in.(${objs.map(o => doMap[o.name]).join(",")})&select=id`)).length);
  console.log("dmc:", (await get(`/domain_module_capabilities?domain_module_id=in.(${Object.values(M).join(",")})&select=id`)).length, "(want 7)");
  console.log("system skill:", (await get(`/skills?domain_id=eq.${GTM}&skill_type=eq.system&select=skill_name`)).map(r => r.skill_name).join(","));
  console.log("dmt:", (await get(`/domain_module_tools?domain_module_id=in.(${Object.values(M).join(",")})&select=id`)).length);
  console.log("channel-mix override:", (await get("/business_function_capabilities?capability_id=eq.108&select=business_function_id,responsibility_type")).length);
  console.log("DONE. ideal_customer_profiles id:", doMap["ideal_customer_profiles"], "target_account_lists id:", doMap["target_account_lists"], "account_scores id:", doMap["account_scores"]);
}
main();
