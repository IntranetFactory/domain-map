#!/usr/bin/env bun
// PMM (Product Marketing Management) new-domain build. Approved by user ("promote both now").
// Phase 0: .tmp_deploy/PMM-phase0-2026-06-15.md. Relocates LAUNCH-ORCHESTRATION (109) from
// GTM-PLAN + 6 PMM caps (119-124) from PROD-MGMT. All record_status='new'. Idempotent.
// Handoffs (B9) + aliases (B11) deferred to follow-up (noted in audits/PMM/state.yaml).

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
  const existing = await get(`${path}?select=id,${key}&limit=10000`);
  const have = new Set(existing.map(r => String(r[key])));
  const missing = rows.filter(r => !have.has(String(r[key])));
  if (missing.length) await post(path, missing);
  const all = await get(`${path}?select=id,${key}&limit=10000`);
  const m: Record<string, number> = {}; for (const r of all) m[String(r[key])] = Number(r.id);
  return m;
}

async function main() {
  // ===== Phase A1: domains row =====
  const existPmm = await get("/domains?domain_code=eq.PMM&select=id");
  if (!existPmm.length) {
    await post("/domains", [{
      domain_code: "PMM", domain_name: "Product Marketing Management",
      description: "Software market for product marketing: competitive intelligence and battlecards, go-to-market launch planning and coordination, messaging and positioning craft, and sales-enablement content. Bought by the Product Marketing lead, distinct from sales planning (GTM-PLAN) and product management (PROD-MGMT). Anchors the launch-orchestration and competitive-enablement surfaces no sales-planning or roadmap vendor masters.",
      crud_percentage: 80,
      business_logic: "Competitive-intel relevance scoring and source de-duplication over ingested intel feeds; sales-enablement content engagement analytics and recommendation ranking; win/loss theme extraction and sentiment from interview transcripts; launch-readiness rollup scoring across cross-functional checklists.",
      min_org_size: "20 s <500", cost_band: "$$", certification_required: false,
      usa_market_size_usd_m: 900, market_size_source_year: 2024,
      catalog_tagline: "Run every product launch, win every competitive deal, and arm sales with the right message and content.",
      catalog_description: "Bring product marketing into one place: track competitors and ship battlecards your sellers actually use, plan and coordinate launches from kickoff to GA, craft the messaging and positioning that the whole company aligns on, and produce the sales-enablement content that closes deals. Run win/loss programs to learn why you win, and see which content and messaging move the needle. Stop scattering launches and competitive intel across docs and decks, and give the business one source of truth for how the product goes to market.",
    }]);
  }
  const PMM = Number((await get("/domains?domain_code=eq.PMM&select=id"))[0].id);
  console.log("PMM domain id:", PMM);

  // ===== Phase A2: relocate 7 capability_domains rows to PMM =====
  // 110 (cap 109 LAUNCH-ORCHESTRATION, from GTM-PLAN), 120-125 (caps 119-124, from PROD-MGMT)
  for (const cdId of [110, 120, 121, 122, 123, 124, 125]) await patch(`/capability_domains?id=eq.${cdId}`, { domain_id: PMM });
  console.log("relocated 7 capability_domains to PMM");

  // ===== Phase A3: 4 modules =====
  const modules = [
    { domain_module_code: "PMM-COMPETITIVE-INTEL", domain_module_name: "Competitive Intelligence", domain_id: PMM, module_kind: "full",
      description: "Competitor tracking, intelligence records, battlecards, and win/loss programs. The competitive-enablement core bought from Klue and Crayon.",
      catalog_tagline: "Track every competitor and put a battlecard in your sellers' hands the moment they need it.",
      catalog_description: "Keep a living record of every competitor: their moves, their pricing, their pitch, and your counter. Turn that intel into battlecards your sellers reach for in the deal, and run structured win/loss interviews to learn why you actually win and lose. Stop letting competitive knowledge live in one person's head and arm the whole revenue team with what works." },
    { domain_module_code: "PMM-LAUNCH-MGMT", domain_module_name: "Launch Management", domain_id: PMM, module_kind: "full",
      description: "Go-to-market launch planning and coordination: launch plans, product launches, milestones, readiness gating, and cross-functional activities. The launch-marketing surface relocated from GTM-PLAN and anchored on Aha! Roadmaps Create.",
      catalog_tagline: "Plan and coordinate every launch from kickoff to GA, with readiness gates nothing ships past.",
      catalog_description: "Run launches as a managed motion, not a scramble: build the launch plan, set milestones, and gate go-live on a readiness checklist every function signs off. Track each product launch through its tiers and dates, coordinate the activities across marketing, sales, and product, and keep one calendar of what is shipping when. Fewer missed dates, fewer half-ready launches, and a clear record of how each one went." },
    { domain_module_code: "PMM-MESSAGING", domain_module_name: "Messaging and Positioning", domain_id: PMM, module_kind: "full",
      description: "Messaging frameworks, positioning, personas, and value propositions. The positioning-craft surface that keeps the company telling one story.",
      catalog_tagline: "Define the message once, and keep the whole company telling the same story.",
      catalog_description: "Build the messaging framework, positioning, and value propositions in one place, grounded in real buyer personas, and put them through review and approval so nothing goes out half-baked. When marketing, sales, and product all pull from the same messaging house, the story stays consistent from the website to the sales call to the launch. Stop reinventing the pitch in every deck." },
    { domain_module_code: "PMM-SALES-ENABLEMENT", domain_module_name: "Sales Enablement", domain_id: PMM, module_kind: "full",
      description: "Sales-enablement content production, collections, trainings, and engagement analytics. The enablement-platform surface bought from Highspot and Seismic.",
      catalog_tagline: "Produce the content sellers actually use, and see what moves deals.",
      catalog_description: "Create, organize, and ship the sales-enablement content your reps need, group it into collections by stage and persona, and back it with enablement training so sellers know how to use it. Track which content gets opened, shared, and tied to won deals, and double down on what works. Turn enablement from a content dump into a measured driver of sales productivity." },
  ];
  const existMods = new Set((await get(`/domain_modules?domain_id=eq.${PMM}&select=domain_module_code`)).map(r => r.domain_module_code));
  const newMods = modules.filter(m => !existMods.has(m.domain_module_code));
  if (newMods.length) await post("/domain_modules", newMods);
  const M: Record<string, number> = {};
  for (const r of await get(`/domain_modules?domain_id=eq.${PMM}&select=id,domain_module_code`)) M[String(r.domain_module_code)] = Number(r.id);
  console.log("modules:", M);

  // ===== Phase A4: domain_module_capabilities (7 caps -> modules) =====
  const capLinks: Array<[number, string]> = [
    [123, "PMM-COMPETITIVE-INTEL"], [124, "PMM-COMPETITIVE-INTEL"],
    [109, "PMM-LAUNCH-MGMT"], [119, "PMM-LAUNCH-MGMT"], [120, "PMM-LAUNCH-MGMT"],
    [121, "PMM-MESSAGING"], [122, "PMM-SALES-ENABLEMENT"],
  ];
  const haveDMC = new Set((await get(`/domain_module_capabilities?domain_module_id=in.(${Object.values(M).join(",")})&select=domain_module_id,capability_id`)).map(r => `${r.domain_module_id}|${r.capability_id}`));
  const newDMC = capLinks.filter(([c, code]) => !haveDMC.has(`${M[code]}|${c}`)).map(([c, code]) => ({ domain_module_id: M[code], capability_id: c, notes: "" }));
  if (newDMC.length) await post("/domain_module_capabilities", newDMC);
  console.log(`domain_module_capabilities: +${newDMC.length}`);

  // ===== Phase A5: vendors, solutions, solution_domains =====
  const vendorMap = await syncByKey("/vendors", [
    { vendor_name: "Klue", description: "Competitive enablement platform: competitive intelligence, battlecards, and sales enablement for product marketing." },
    { vendor_name: "Crayon", description: "Competitive intelligence platform: market and competitor tracking, intel digests, and win/loss." },
    { vendor_name: "Highspot", description: "Sales enablement platform: content management, buyer engagement, training, and analytics." },
  ], "vendor_name");
  // Aha! Labs (379) and Seismic Software (769) already exist
  vendorMap["Aha! Labs Inc."] = 379; vendorMap["Seismic Software Inc"] = 769;
  const solMap = await syncByKey("/solutions", [
    { solution_name: "Klue", vendor_id: vendorMap["Klue"], solution_kind: "standard_solution", description: "Klue competitive enablement: competitor intel records, battlecards, and win/loss." },
    { solution_name: "Crayon", vendor_id: vendorMap["Crayon"], solution_kind: "standard_solution", description: "Crayon competitive intelligence: competitor tracking, intel digests, battlecards." },
    { solution_name: "Highspot", vendor_id: vendorMap["Highspot"], solution_kind: "standard_solution", description: "Highspot sales enablement: content, pitches, training, and engagement analytics." },
    { solution_name: "Seismic", vendor_id: 769, solution_kind: "standard_solution", description: "Seismic enablement suite: content library, LiveDocs, and buyer engagement." },
  ], "solution_name");
  solMap["Aha! Roadmaps"] = 399;
  const sdSolIds = [solMap["Klue"], solMap["Crayon"], solMap["Highspot"], solMap["Seismic"], 399];
  const haveSd = new Set((await get(`/solution_domains?domain_id=eq.${PMM}&select=solution_id`)).map(r => Number(r.solution_id)));
  const newSd = sdSolIds.filter(id => !haveSd.has(id)).map(id => ({ solution_id: id, domain_id: PMM, coverage_level: "primary" }));
  if (newSd.length) await post("/solution_domains", newSd);
  console.log(`solutions linked: +${newSd.length}`);

  // ===== Phase B1: data_objects (17 masters) =====
  type Spec = { name: string; sl: string; pl: string; et: string; pii?: boolean; mod: string; nec: string; desc: string };
  const objs: Spec[] = [
    { name: "competitive_intelligence_records", sl: "Competitive Intelligence Record", pl: "Competitive Intelligence Records", et: "operational_workflow", mod: "PMM-COMPETITIVE-INTEL", nec: "required", desc: "A tracked piece of competitor or market intelligence with source, relevance, and disposition." },
    { name: "battlecards", sl: "Battlecard", pl: "Battlecards", et: "catalog", mod: "PMM-COMPETITIVE-INTEL", nec: "required", desc: "A seller-facing competitive card: how we win against a named competitor, with objections and counters." },
    { name: "competitor_profiles", sl: "Competitor Profile", pl: "Competitor Profiles", et: "operational_record", mod: "PMM-COMPETITIVE-INTEL", nec: "required", desc: "A profile of a tracked competitor: positioning, pricing, strengths, and weaknesses." },
    { name: "intel_sources", sl: "Intel Source", pl: "Intel Sources", et: "catalog", mod: "PMM-COMPETITIVE-INTEL", nec: "optional", desc: "A configured source feeding competitive intelligence (news, review sites, web monitors, field reports)." },
    { name: "win_loss_interviews", sl: "Win/Loss Interview", pl: "Win/Loss Interviews", et: "operational_workflow", pii: true, mod: "PMM-COMPETITIVE-INTEL", nec: "optional", desc: "A structured interview with a won or lost buyer, capturing the decision drivers; carries interviewee identity and quotes." },
    { name: "launch_plans", sl: "Launch Plan", pl: "Launch Plans", et: "operational_workflow", mod: "PMM-LAUNCH-MGMT", nec: "required", desc: "A working go-to-market plan for a launch: scope, milestones, readiness gate, and owners." },
    { name: "product_launches", sl: "Product Launch", pl: "Product Launches", et: "operational_workflow", mod: "PMM-LAUNCH-MGMT", nec: "required", desc: "The long-lived launch record for a product or feature: tier, dates, status, and retro." },
    { name: "launch_milestones", sl: "Launch Milestone", pl: "Launch Milestones", et: "junction", mod: "PMM-LAUNCH-MGMT", nec: "optional", desc: "A dated checkpoint inside a launch plan (kickoff, content-complete, sales-ready, GA)." },
    { name: "readiness_checklists", sl: "Readiness Checklist", pl: "Readiness Checklists", et: "catalog", mod: "PMM-LAUNCH-MGMT", nec: "optional", desc: "A template of cross-functional readiness items a launch must clear before go-live." },
    { name: "launch_activities", sl: "Launch Activity", pl: "Launch Activities", et: "junction", mod: "PMM-LAUNCH-MGMT", nec: "optional", desc: "A cross-functional task within a launch plan, assigned to a function and tied to a milestone." },
    { name: "messaging_frameworks", sl: "Messaging Framework", pl: "Messaging Frameworks", et: "operational_workflow", mod: "PMM-MESSAGING", nec: "required", desc: "A positioning and messaging house for a product or segment: pillars, proof points, and approved copy." },
    { name: "persona_definitions", sl: "Persona Definition", pl: "Persona Definitions", et: "catalog", mod: "PMM-MESSAGING", nec: "required", desc: "A buyer or user persona: role, goals, pains, and buying triggers, referenced by messaging and content." },
    { name: "value_propositions", sl: "Value Proposition", pl: "Value Propositions", et: "catalog", mod: "PMM-MESSAGING", nec: "required", desc: "A structured value proposition mapping a capability to a persona outcome and competitive differentiation." },
    { name: "sales_enablement_content", sl: "Sales Enablement Content", pl: "Sales Enablement Content", et: "operational_workflow", mod: "PMM-SALES-ENABLEMENT", nec: "required", desc: "A managed sales-facing content asset (deck, one-pager, demo script) with draft, publish, and retire states." },
    { name: "content_collections", sl: "Content Collection", pl: "Content Collections", et: "catalog", mod: "PMM-SALES-ENABLEMENT", nec: "optional", desc: "A curated grouping of enablement content by stage, persona, or play." },
    { name: "enablement_trainings", sl: "Enablement Training", pl: "Enablement Trainings", et: "catalog", mod: "PMM-SALES-ENABLEMENT", nec: "optional", desc: "A seller training tied to content or a launch: certification, pitch practice, or onboarding module." },
    { name: "content_engagement_events", sl: "Content Engagement Event", pl: "Content Engagement Events", et: "operational_record", pii: true, mod: "PMM-SALES-ENABLEMENT", nec: "required", desc: "An append-only event capturing when content is opened, shared, or tied to a deal; carries buyer contact identity." },
  ];
  const doMap = await syncByKey("/data_objects", objs.map(o => ({
    data_object_name: o.name, singular_label: o.sl, plural_label: o.pl, description: o.desc, entity_type: o.et, has_personal_content: !!o.pii,
  })), "data_object_name");
  console.log(`data_objects synced: ${Object.keys(doMap).length} (subset is PMM's)`);

  // ===== Phase B2: domain_module_data_objects (17 masters) =====
  const haveDMDO = new Set((await get(`/domain_module_data_objects?domain_module_id=in.(${Object.values(M).join(",")})&select=domain_module_id,data_object_id`)).map(r => `${r.domain_module_id}|${r.data_object_id}`));
  const newDMDO = objs.filter(o => !haveDMDO.has(`${M[o.mod]}|${doMap[o.name]}`)).map(o => ({ domain_module_id: M[o.mod], data_object_id: doMap[o.name], role: "master", necessity: o.nec, notes: "" }));
  if (newDMDO.length) await post("/domain_module_data_objects", newDMDO);
  console.log(`domain_module_data_objects: +${newDMDO.length}`);

  // ===== Phase B3: lifecycle states (6 operational_workflow masters) =====
  type St = { s: string; o: number; init?: boolean; term?: boolean; perm?: boolean; verb?: string; d: string };
  const machines: Array<{ name: string; mod: string; states: St[] }> = [
    { name: "competitive_intelligence_records", mod: "PMM-COMPETITIVE-INTEL", states: [
      { s: "drafted", o: 1, init: true, d: "Intel captured, not yet reviewed." }, { s: "reviewed", o: 2, d: "Intel reviewed and validated." },
      { s: "published", o: 3, perm: true, verb: "publish_intel", d: "Intel published to sellers." }, { s: "archived", o: 4, term: true, d: "Intel retired." } ] },
    { name: "win_loss_interviews", mod: "PMM-COMPETITIVE-INTEL", states: [
      { s: "scheduled", o: 1, init: true, d: "Interview scheduled with the buyer." }, { s: "conducted", o: 2, d: "Interview completed." },
      { s: "analyzed", o: 3, perm: true, verb: "analyze_interview", d: "Themes and drivers extracted." }, { s: "closed", o: 4, term: true, d: "Interview closed out." } ] },
    { name: "launch_plans", mod: "PMM-LAUNCH-MGMT", states: [
      { s: "drafted", o: 1, init: true, d: "Plan being drafted." }, { s: "in_review", o: 2, d: "Plan under cross-functional review." },
      { s: "approved", o: 3, perm: true, verb: "approve_launch_plan", d: "Plan approved; launch greenlit." }, { s: "active", o: 4, d: "Launch in execution." }, { s: "completed", o: 5, term: true, d: "Launch completed." } ] },
    { name: "product_launches", mod: "PMM-LAUNCH-MGMT", states: [
      { s: "planned", o: 1, init: true, d: "Launch on the calendar." }, { s: "in_market", o: 2, perm: true, verb: "launch_product", d: "Product is live in market." },
      { s: "ga", o: 3, d: "General availability reached." }, { s: "retired", o: 4, term: true, perm: true, verb: "retire_launch", d: "Launch retired / sunset." } ] },
    { name: "messaging_frameworks", mod: "PMM-MESSAGING", states: [
      { s: "drafted", o: 1, init: true, d: "Messaging being drafted." }, { s: "in_review", o: 2, d: "Under stakeholder review." },
      { s: "approved", o: 3, perm: true, verb: "approve_messaging", d: "Messaging approved as the source of truth." }, { s: "published", o: 4, term: true, d: "Published to the company." } ] },
    { name: "sales_enablement_content", mod: "PMM-SALES-ENABLEMENT", states: [
      { s: "drafted", o: 1, init: true, d: "Content in production." }, { s: "published", o: 2, perm: true, verb: "publish_content", d: "Content published to sellers." }, { s: "retired", o: 3, term: true, d: "Content retired." } ] },
  ];
  const haveLS = new Set((await get(`/data_object_lifecycle_states?data_object_id=in.(${machines.map(m => doMap[m.name]).join(",")})&select=data_object_id,state_name`)).map(r => `${r.data_object_id}|${r.state_name}`));
  const lsRows: Row[] = [];
  for (const m of machines) for (const st of m.states) {
    if (haveLS.has(`${doMap[m.name]}|${st.s}`)) continue;
    lsRows.push({ data_object_id: doMap[m.name], state_name: st.s, state_order: st.o, description: st.d, is_initial: !!st.init, is_terminal: !!st.term, requires_permission: !!st.perm, permission_verb_override: st.verb ?? "", notes: "", domain_module_id: M[m.mod] });
  }
  if (lsRows.length) await post("/data_object_lifecycle_states", lsRows);
  console.log(`lifecycle states: +${lsRows.length}`);

  // ===== Phase C: business_function_domains =====
  const bfd = [
    { business_function_id: 22, responsibility_type: "owner" },       // Marketing
    { business_function_id: 25, responsibility_type: "contributor" }, // Product Management
    { business_function_id: 21, responsibility_type: "consumer" },    // Sales
  ];
  const haveBfd = new Set((await get(`/business_function_domains?domain_id=eq.${PMM}&select=business_function_id`)).map(r => Number(r.business_function_id)));
  const newBfd = bfd.filter(b => !haveBfd.has(b.business_function_id)).map(b => ({ ...b, domain_id: PMM, notes: "" }));
  if (newBfd.length) await post("/business_function_domains", newBfd);
  console.log(`business_function_domains: +${newBfd.length}`);

  // ===== Phase S: system skill + tools + domain_module_tools =====
  const existSkill = await get(`/skills?domain_id=eq.${PMM}&skill_type=eq.system&select=id`);
  if (!existSkill.length) await post("/skills", [{ skill_name: "pmm-system", skill_type: "system", domain_id: PMM, domain_module_id: null, description: "System skill for Product Marketing Management: runtime workflows over competitive intel, launches, messaging, and sales-enablement content; derived from the domain's modules and their tools." }]);
  // tools (query/mutate per headline master) + reuse notify_team
  const toolSpecs = [
    { tool_name: "query_competitive_intelligence", operation_kind: "query", data_object_id: doMap["competitive_intelligence_records"], coverage_tier: "platform", description: "Query competitive intelligence records.", mod: "PMM-COMPETITIVE-INTEL" },
    { tool_name: "update_battlecard", operation_kind: "mutate", data_object_id: doMap["battlecards"], coverage_tier: "platform", description: "Create or update a battlecard.", mod: "PMM-COMPETITIVE-INTEL" },
    { tool_name: "query_win_loss_interviews", operation_kind: "query", data_object_id: doMap["win_loss_interviews"], coverage_tier: "platform", description: "Query win/loss interviews.", mod: "PMM-COMPETITIVE-INTEL" },
    { tool_name: "query_launch_plans", operation_kind: "query", data_object_id: doMap["launch_plans"], coverage_tier: "platform", description: "Query launch plans.", mod: "PMM-LAUNCH-MGMT" },
    { tool_name: "update_launch_plan", operation_kind: "mutate", data_object_id: doMap["launch_plans"], coverage_tier: "platform", description: "Create or update a launch plan.", mod: "PMM-LAUNCH-MGMT" },
    { tool_name: "query_product_launches", operation_kind: "query", data_object_id: doMap["product_launches"], coverage_tier: "platform", description: "Query product launches.", mod: "PMM-LAUNCH-MGMT" },
    { tool_name: "query_messaging_frameworks", operation_kind: "query", data_object_id: doMap["messaging_frameworks"], coverage_tier: "platform", description: "Query messaging frameworks.", mod: "PMM-MESSAGING" },
    { tool_name: "update_messaging_framework", operation_kind: "mutate", data_object_id: doMap["messaging_frameworks"], coverage_tier: "platform", description: "Create or update a messaging framework.", mod: "PMM-MESSAGING" },
    { tool_name: "query_sales_enablement_content", operation_kind: "query", data_object_id: doMap["sales_enablement_content"], coverage_tier: "platform", description: "Query sales enablement content.", mod: "PMM-SALES-ENABLEMENT" },
    { tool_name: "update_sales_enablement_content", operation_kind: "mutate", data_object_id: doMap["sales_enablement_content"], coverage_tier: "platform", description: "Create or update sales enablement content.", mod: "PMM-SALES-ENABLEMENT" },
  ];
  const toolMap = await syncByKey("/tools", toolSpecs.map(({ mod, ...rest }) => rest), "tool_name");
  // notify_team reuse (launch comms)
  const ntRow = await get("/tools?tool_name=eq.notify_team&select=id");
  const notifyTeam = ntRow.length ? Number(ntRow[0].id) : null;
  const dmtLinks: Array<[string, number, string]> = toolSpecs.map(t => [t.mod, toolMap[t.tool_name], "required"] as [string, number, string]);
  if (notifyTeam) dmtLinks.push(["PMM-LAUNCH-MGMT", notifyTeam, "required"]);
  const haveDMT = new Set((await get(`/domain_module_tools?domain_module_id=in.(${Object.values(M).join(",")})&select=domain_module_id,tool_id`)).map(r => `${r.domain_module_id}|${r.tool_id}`));
  const newDMT = dmtLinks.filter(([mod, tid]) => !haveDMT.has(`${M[mod]}|${tid}`)).map(([mod, tid, rl]) => ({ domain_module_id: M[mod], tool_id: tid, requirement_level: rl, notes: "" }));
  if (newDMT.length) await post("/domain_module_tools", newDMT);
  console.log(`tools: ${Object.keys(toolMap).length}; domain_module_tools: +${newDMT.length}`);

  // ===== VERIFY =====
  console.log("\n== VERIFY ==");
  console.log("modules:", (await get(`/domain_modules?domain_id=eq.${PMM}&select=domain_module_code`)).map(r => r.domain_module_code).join(", "));
  console.log("capabilities on PMM:", (await get(`/capability_domains?domain_id=eq.${PMM}&select=capability_id`)).length, "(want 7)");
  console.log("masters:", (await get(`/domain_module_data_objects?domain_module_id=in.(${Object.values(M).join(",")})&role=eq.master&select=data_object_id`)).length, "(want 17)");
  console.log("lifecycle states:", (await get(`/data_object_lifecycle_states?data_object_id=in.(${objs.map(o => doMap[o.name]).join(",")})&select=id`)).length);
  console.log("solution_domains:", (await get(`/solution_domains?domain_id=eq.${PMM}&select=solution_id`)).length, "(want 5)");
  console.log("bfd:", (await get(`/business_function_domains?domain_id=eq.${PMM}&select=responsibility_type`)).map(r => r.responsibility_type).join(","));
  console.log("system skill:", (await get(`/skills?domain_id=eq.${PMM}&skill_type=eq.system&select=skill_name`)).map(r => r.skill_name).join(","));
  console.log("domain_module_tools:", (await get(`/domain_module_tools?domain_module_id=in.(${Object.values(M).join(",")})&select=id`)).length);
  console.log("GTM-PLAN still has LAUNCH-ORCHESTRATION?", (await get("/capability_domains?domain_id=eq.104&capability_id=eq.109&select=id")).length, "(want 0)");
  console.log("DONE. PMM id:", PMM);
}
main();
