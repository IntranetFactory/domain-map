#!/usr/bin/env bun
// ABM-PLATFORM new-domain build (a5/B2-S2: promote as downstream engagement consumer).
// Phase 0: .tmp_deploy/ABM-PLATFORM-phase0-2026-06-15.md. Engagement side only; PLANNING side
// (ICP/target_lists/account_scores) stays in GTM-PLAN and is consumed. Collisions resolved:
//   audience_segments(113 CDP), data_subject_requests(901 ATS), ad_audiences(1114 SOCIAL-ADS)
//   -> embedded_master here (Rule #11). engagement_scores(1019 REV-INTEL) -> ABM masters its own
//   account_engagement_scores (Rule #9 collision prefix). All record_status='new'. Idempotent.
// domain_regulations (CPRA/GDPR) deferred to follow-up (noted in audits/ABM-PLATFORM/state.yaml).

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

async function main() {
  // ===== domain =====
  if (!(await get("/domains?domain_code=eq.ABM-PLATFORM&select=id")).length) {
    await post("/domains", [{
      domain_code: "ABM-PLATFORM", domain_name: "Account-Based Marketing Platform",
      description: "Downstream account-based engagement platform: contact- and account-level intent capture, anonymous-to-account identity resolution, engagement scoring, multichannel orchestration, account-based advertising, and 1:1 web personalization. Ingests ICPs and target account lists authored in Go-to-Market Planning and runs engagement against them. Bought by Marketing Operations; distinct from the planning shell (GTM-PLAN) and from campaign automation (MA).",
      crud_percentage: 55,
      business_logic: "Predictive and third-party intent scoring, anonymous-visitor to account identity resolution, account/contact engagement scoring models, programmatic ad bidding and audience activation, and AI-driven web personalization variant selection.",
      min_org_size: "20 s <500", cost_band: "$$$", certification_required: false,
      usa_market_size_usd_m: 1200, market_size_source_year: 2025,
      catalog_tagline: "Know which accounts are in-market, then engage them across ads, web, and orchestration before competitors do.",
      catalog_description: "Turn your target account list into pipeline. Capture intent signals and resolve anonymous web traffic to real accounts, score engagement so you know who is heating up, and orchestrate multichannel plays across advertising, web, and outreach. Run account-based ad campaigns and personalize the website for named accounts, all governed by consent. Ingest the ICP and target lists your planning team authored and engage against them, so marketing spend lands on the accounts that matter.",
    }]);
  }
  const ABM = Number((await get("/domains?domain_code=eq.ABM-PLATFORM&select=id"))[0].id);
  console.log("ABM domain id:", ABM);

  // ===== capabilities =====
  const caps = [
    { capability_code: "ABM-INTENT-DATA", capability_name: "Intent Data Capture", description: "Capture and de-duplicate first- and third-party buying intent signals across topics and sources.", mods: ["ABM-INTENT"] },
    { capability_code: "ABM-ACCOUNT-IDENTIFICATION", capability_name: "Account Identification", description: "Resolve anonymous web and signal traffic to known accounts and contacts.", mods: ["ABM-INTENT", "ABM-WEB-PERSONALIZATION"] },
    { capability_code: "ABM-ENGAGEMENT-SCORING", capability_name: "Engagement Scoring", description: "Score account and contact engagement and in-market propensity from intent and activity.", mods: ["ABM-INTENT"] },
    { capability_code: "ABM-ENGAGEMENT-ORCHESTRATION", capability_name: "Engagement Orchestration", description: "Orchestrate multichannel account-based plays, journeys, and audiences across channels.", mods: ["ABM-ENGAGEMENT-ORCHESTRATION"] },
    { capability_code: "ABM-ADVERTISING", capability_name: "Account-Based Advertising", description: "Run account-based programmatic advertising: targeting, audiences, creatives, and spend.", mods: ["ABM-ADVERTISING"] },
    { capability_code: "ABM-WEB-PERSONALIZATION", capability_name: "Web Personalization", description: "Personalize web experiences 1:1 for named accounts and resolved visitors.", mods: ["ABM-WEB-PERSONALIZATION"] },
  ];
  const capMap = await syncByKey("/capabilities", caps.map(({ mods, ...r }) => r), "capability_code");

  // ===== modules =====
  const modules = [
    { domain_module_code: "ABM-INTENT", domain_module_name: "Intent and Identity", domain_id: ABM, module_kind: "full",
      description: "Intent capture, account identification, and engagement scoring, plus the consent governance over contact-level signal processing. The signal-ingestion-and-scoring layer vendors lead with.",
      catalog_tagline: "See who is in-market: capture intent, resolve accounts, and score engagement, with consent built in.",
      catalog_description: "Find demand before it raises its hand. Capture first- and third-party intent signals, resolve anonymous traffic to real accounts, and score engagement so sales and marketing know exactly which accounts are heating up. Govern it all with consent records and data-subject requests so contact-level signals are processed lawfully. This is the intelligence layer the rest of your account-based motion runs on." },
    { domain_module_code: "ABM-ENGAGEMENT-ORCHESTRATION", domain_module_name: "Engagement Orchestration", domain_id: ABM, module_kind: "full",
      description: "Multichannel orchestration: campaigns, account journeys, playbooks, and engagement audiences. Consumes the ICP and target lists authored in GTM-PLAN.",
      catalog_tagline: "Run the right play for every account, across every channel, from one orchestration brain.",
      catalog_description: "Coordinate the whole account-based motion: build campaigns, define the journey stages accounts move through, run orchestration playbooks, and assemble the audiences each play targets. Pull in the ICP and target account lists your planning team authored and engage against them across ads, web, and outreach. Stop running disconnected campaigns and give every account a coherent, measured journey." },
    { domain_module_code: "ABM-ADVERTISING", domain_module_name: "Account-Based Advertising", domain_id: ABM, module_kind: "full",
      description: "Account-based programmatic advertising: ad targeting, audiences, creatives, placements, spend, and content syndication.",
      catalog_tagline: "Put your ads in front of the buying committee at your target accounts, and prove the spend works.",
      catalog_description: "Run advertising that targets accounts, not cookies. Build ad campaign targets and audiences from your account list, manage creatives and placements across display, social, and content syndication, and allocate spend by account tier. See which accounts you reached and how it moved engagement, so the ad budget goes where the pipeline is, not where the clicks are cheapest." },
    { domain_module_code: "ABM-WEB-PERSONALIZATION", domain_module_name: "Web Personalization", domain_id: ABM, module_kind: "full",
      description: "1:1 account and visitor web personalization: rules, dynamic experiences, and the visitor-to-account resolution that drives them. Carries its own contact-level PII exposure.",
      catalog_tagline: "Show every named account a website built for them, the moment they land.",
      catalog_description: "Make the website speak to each account by name. Resolve who is visiting, then serve personalized experiences, dynamic content, tailored CTAs, and account-specific landing pages, driven by personalization rules tied to firmographics and intent. Turn anonymous traffic from your target accounts into recognized, relevant visits that convert, instead of a one-size-fits-all homepage." },
  ];
  const existMods = new Set((await get(`/domain_modules?domain_id=eq.${ABM}&select=domain_module_code`)).map(r => r.domain_module_code));
  const newMods = modules.filter(m => !existMods.has(m.domain_module_code));
  if (newMods.length) await post("/domain_modules", newMods);
  const M: Record<string, number> = {};
  for (const r of await get(`/domain_modules?domain_id=eq.${ABM}&select=id,domain_module_code`)) M[String(r.domain_module_code)] = Number(r.id);
  console.log("modules:", M);

  // capability_domains + domain_module_capabilities
  const haveCD = new Set((await get(`/capability_domains?domain_id=eq.${ABM}&select=capability_id`)).map(r => Number(r.capability_id)));
  const newCD = caps.map(c => capMap[c.capability_code]).filter(id => !haveCD.has(id)).map(id => ({ capability_id: id, domain_id: ABM }));
  if (newCD.length) await post("/capability_domains", newCD);
  const dmcLinks: Array<[number, string]> = [];
  for (const c of caps) for (const mod of c.mods) dmcLinks.push([capMap[c.capability_code], mod]);
  const haveDMC = new Set((await get(`/domain_module_capabilities?domain_module_id=in.(${Object.values(M).join(",")})&select=domain_module_id,capability_id`)).map(r => `${r.domain_module_id}|${r.capability_id}`));
  const newDMC = dmcLinks.filter(([c, code]) => !haveDMC.has(`${M[code]}|${c}`)).map(([c, code]) => ({ domain_module_id: M[code], capability_id: c, notes: "" }));
  if (newDMC.length) await post("/domain_module_capabilities", newDMC);
  console.log(`capability_domains +${newCD.length}; domain_module_capabilities +${newDMC.length}`);

  // ===== vendors + solutions =====
  const vMap = await syncByKey("/vendors", [
    { vendor_name: "6sense", description: "Predictive intent and account engagement platform for B2B revenue teams." },
    { vendor_name: "Madison Logic", description: "Multichannel ABM activation: content syndication, display, and ABM measurement." },
    { vendor_name: "NextRoll", description: "Parent of RollWorks; account-based advertising and growth-marketing platform." },
    { vendor_name: "Terminus", description: "Multichannel account-based engagement platform: ads, chat, email, and web." },
    { vendor_name: "Mutiny", description: "AI-driven 1:1 web personalization and landing pages for named accounts." },
  ], "vendor_name");
  vMap["Demandbase"] = 400;
  const sMap = await syncByKey("/solutions", [
    { solution_name: "Demandbase One", vendor_id: 400, solution_kind: "standard_solution", description: "Demandbase full-stack ABX: intent, account identification, advertising DSP, and web personalization." },
    { solution_name: "6sense Revenue AI", vendor_id: vMap["6sense"], solution_kind: "standard_solution", description: "6sense predictive intent, account identification, orchestration, and advertising." },
    { solution_name: "Madison Logic Platform", vendor_id: vMap["Madison Logic"], solution_kind: "standard_solution", description: "Madison Logic multichannel ABM activation and content syndication." },
    { solution_name: "RollWorks", vendor_id: vMap["NextRoll"], solution_kind: "standard_solution", description: "RollWorks account-based advertising and sales-touch orchestration for mid-market." },
    { solution_name: "Terminus", vendor_id: vMap["Terminus"], solution_kind: "standard_solution", description: "Terminus multichannel account-based engagement: ads, chat, email, web." },
    { solution_name: "Mutiny", vendor_id: vMap["Mutiny"], solution_kind: "standard_solution", description: "Mutiny 1:1 web personalization for named accounts." },
  ], "solution_name");
  const sdIds = ["Demandbase One", "6sense Revenue AI", "Madison Logic Platform", "RollWorks", "Terminus", "Mutiny"].map(n => sMap[n]);
  const haveSd = new Set((await get(`/solution_domains?domain_id=eq.${ABM}&select=solution_id`)).map(r => Number(r.solution_id)));
  const newSd = sdIds.filter(id => !haveSd.has(id)).map(id => ({ solution_id: id, domain_id: ABM, coverage_level: "primary" }));
  if (newSd.length) await post("/solution_domains", newSd);
  console.log(`solutions linked +${newSd.length}`);

  // ===== data_objects (12 new masters) =====
  type Spec = { name: string; sl: string; pl: string; et: string; pii?: boolean; mod: string; role: string; nec: string; desc: string };
  const newObjs: Spec[] = [
    { name: "intent_signals", sl: "Intent Signal", pl: "Intent Signals", et: "operational_record", pii: true, mod: "ABM-INTENT", role: "master", nec: "required", desc: "A captured buying-intent signal for an account or contact, with topic, source, and strength." },
    { name: "account_identifications", sl: "Account Identification", pl: "Account Identifications", et: "operational_record", pii: true, mod: "ABM-INTENT", role: "master", nec: "required", desc: "A resolution of anonymous web/signal traffic to a known account or contact." },
    { name: "account_engagement_scores", sl: "Account Engagement Score", pl: "Account Engagement Scores", et: "computed", pii: true, mod: "ABM-INTENT", role: "master", nec: "required", desc: "An account- or contact-level marketing engagement / in-market propensity score derived from intent and activity. Distinct from REV-INTEL sales-activity engagement scores and from GTM-PLAN planning-grade account scores." },
    { name: "consent_records", sl: "Consent Record", pl: "Consent Records", et: "operational_record", pii: true, mod: "ABM-INTENT", role: "master", nec: "optional", desc: "Lawful-basis and opt-in/opt-out state governing whether a contact's signals may be processed and activated (GDPR Art. 6/7, CCPA/CPRA)." },
    { name: "abm_campaigns", sl: "ABM Campaign", pl: "ABM Campaigns", et: "operational_workflow", mod: "ABM-ENGAGEMENT-ORCHESTRATION", role: "master", nec: "required", desc: "An account-based engagement campaign spanning channels and target accounts." },
    { name: "account_journeys", sl: "Account Journey", pl: "Account Journeys", et: "operational_workflow", mod: "ABM-ENGAGEMENT-ORCHESTRATION", role: "master", nec: "required", desc: "An account's progression through orchestration stages from awareness to opportunity." },
    { name: "orchestration_playbooks", sl: "Orchestration Playbook", pl: "Orchestration Playbooks", et: "catalog", mod: "ABM-ENGAGEMENT-ORCHESTRATION", role: "master", nec: "required", desc: "A reusable multichannel play: triggers, audience, channel sequence, and exit criteria." },
    { name: "ad_campaign_targets", sl: "Ad Campaign Target", pl: "Ad Campaign Targets", et: "operational_record", mod: "ABM-ADVERTISING", role: "master", nec: "required", desc: "An account or audience targeted by an account-based ad campaign, with channel and tier." },
    { name: "content_syndication_programs", sl: "Content Syndication Program", pl: "Content Syndication Programs", et: "operational_workflow", mod: "ABM-ADVERTISING", role: "master", nec: "optional", desc: "A multichannel content-syndication program delivering gated content to target accounts." },
    { name: "web_personalization_rules", sl: "Web Personalization Rule", pl: "Web Personalization Rules", et: "catalog", mod: "ABM-WEB-PERSONALIZATION", role: "master", nec: "required", desc: "A rule mapping a resolved account/segment to a personalized web experience or variant." },
    { name: "web_experiences", sl: "Web Experience", pl: "Web Experiences", et: "operational_workflow", mod: "ABM-WEB-PERSONALIZATION", role: "master", nec: "required", desc: "A personalized web experience or landing page served to named accounts." },
    { name: "web_visitor_resolutions", sl: "Web Visitor Resolution", pl: "Web Visitor Resolutions", et: "operational_record", pii: true, mod: "ABM-WEB-PERSONALIZATION", role: "master", nec: "required", desc: "A person/account-level de-anonymization of a web visitor; PII-bearing and consent-gated." },
  ];
  const doMap = await syncByKey("/data_objects", newObjs.map(o => ({ data_object_name: o.name, singular_label: o.sl, plural_label: o.pl, description: o.desc, entity_type: o.et, has_personal_content: !!o.pii })), "data_object_name");
  // pre-existing entities reused
  doMap["audience_segments"] = 113; doMap["data_subject_requests"] = 901; doMap["ad_audiences"] = 1114;
  doMap["ideal_customer_profiles"] = 1220; doMap["target_account_lists"] = 1221; doMap["account_scores"] = 1222;

  // ===== domain_module_data_objects: masters + embedded_master + consumer =====
  const dmdoSpecs: Array<{ doid: number; mod: string; role: string; nec: string }> = [
    ...newObjs.map(o => ({ doid: doMap[o.name], mod: o.mod, role: o.role, nec: o.nec })),
    // embedded_master (canonical owners: CDP / ATS / SOCIAL-ADS)
    { doid: 113, mod: "ABM-ENGAGEMENT-ORCHESTRATION", role: "embedded_master", nec: "required" },   // audience_segments (CDP)
    { doid: 901, mod: "ABM-INTENT", role: "embedded_master", nec: "optional" },                      // data_subject_requests (ATS)
    { doid: 1114, mod: "ABM-ADVERTISING", role: "embedded_master", nec: "required" },                 // ad_audiences (SOCIAL-ADS)
    // consumers from GTM-PLAN
    { doid: 1221, mod: "ABM-ENGAGEMENT-ORCHESTRATION", role: "consumer", nec: "required" },           // target_account_lists
    { doid: 1220, mod: "ABM-ENGAGEMENT-ORCHESTRATION", role: "consumer", nec: "required" },           // ideal_customer_profiles
    { doid: 1222, mod: "ABM-ENGAGEMENT-ORCHESTRATION", role: "consumer", nec: "optional" },           // account_scores
  ];
  const haveDMDO = new Set((await get(`/domain_module_data_objects?domain_module_id=in.(${Object.values(M).join(",")})&select=domain_module_id,data_object_id`)).map(r => `${r.domain_module_id}|${r.data_object_id}`));
  const newDMDO = dmdoSpecs.filter(d => !haveDMDO.has(`${M[d.mod]}|${d.doid}`)).map(d => ({ domain_module_id: M[d.mod], data_object_id: d.doid, role: d.role, necessity: d.nec, notes: "" }));
  if (newDMDO.length) await post("/domain_module_data_objects", newDMDO);
  console.log(`DMDOs +${newDMDO.length} (12 master + 3 embedded + 3 consumer = 18)`);

  // ===== lifecycle (4 operational_workflow masters) =====
  type St = { s: string; o: number; init?: boolean; term?: boolean; perm?: boolean; verb?: string; d: string };
  const machines: Array<{ name: string; mod: string; states: St[] }> = [
    { name: "abm_campaigns", mod: "ABM-ENGAGEMENT-ORCHESTRATION", states: [
      { s: "drafted", o: 1, init: true, d: "Campaign being built." }, { s: "active", o: 2, perm: true, verb: "activate_campaign", d: "Campaign live across channels." }, { s: "paused", o: 3, d: "Campaign paused." }, { s: "completed", o: 4, term: true, d: "Campaign ended." } ] },
    { name: "account_journeys", mod: "ABM-ENGAGEMENT-ORCHESTRATION", states: [
      { s: "awareness", o: 1, init: true, d: "Account in early awareness." }, { s: "engaged", o: 2, d: "Account actively engaging." }, { s: "opportunity", o: 3, perm: true, verb: "advance_to_opportunity", d: "Account converted to opportunity." }, { s: "closed", o: 4, term: true, d: "Journey closed." } ] },
    { name: "content_syndication_programs", mod: "ABM-ADVERTISING", states: [
      { s: "drafted", o: 1, init: true, d: "Program being set up." }, { s: "running", o: 2, perm: true, verb: "launch_syndication", d: "Program delivering content." }, { s: "completed", o: 3, term: true, d: "Program ended." } ] },
    { name: "web_experiences", mod: "ABM-WEB-PERSONALIZATION", states: [
      { s: "drafted", o: 1, init: true, d: "Experience being built." }, { s: "published", o: 2, perm: true, verb: "publish_experience", d: "Experience live." }, { s: "retired", o: 3, term: true, d: "Experience retired." } ] },
  ];
  const haveLS = new Set((await get(`/data_object_lifecycle_states?data_object_id=in.(${machines.map(m => doMap[m.name]).join(",")})&select=data_object_id,state_name`)).map(r => `${r.data_object_id}|${r.state_name}`));
  const lsRows: Row[] = [];
  for (const m of machines) for (const st of m.states) {
    if (haveLS.has(`${doMap[m.name]}|${st.s}`)) continue;
    lsRows.push({ data_object_id: doMap[m.name], state_name: st.s, state_order: st.o, description: st.d, is_initial: !!st.init, is_terminal: !!st.term, requires_permission: !!st.perm, permission_verb_override: st.verb ?? "", notes: "", domain_module_id: M[m.mod] });
  }
  if (lsRows.length) await post("/data_object_lifecycle_states", lsRows);
  console.log(`lifecycle states +${lsRows.length}`);

  // ===== Phase C =====
  const haveBfd = new Set((await get(`/business_function_domains?domain_id=eq.${ABM}&select=business_function_id`)).map(r => Number(r.business_function_id)));
  const newBfd = [{ business_function_id: 22, responsibility_type: "owner" }, { business_function_id: 21, responsibility_type: "contributor" }]
    .filter(b => !haveBfd.has(b.business_function_id)).map(b => ({ ...b, domain_id: ABM, notes: "" }));
  if (newBfd.length) await post("/business_function_domains", newBfd);
  console.log(`bfd +${newBfd.length}`);

  // ===== Phase S =====
  if (!(await get(`/skills?domain_id=eq.${ABM}&skill_type=eq.system&select=id`)).length)
    await post("/skills", [{ skill_name: "abm-platform-system", skill_type: "system", domain_id: ABM, domain_module_id: null, description: "System skill for the Account-Based Marketing Platform: runtime workflows over intent, identity, engagement scoring, orchestration, advertising, and web personalization; derived from the domain's modules and their tools." }]);
  const toolSpecs = [
    { tool_name: "query_intent_signals", operation_kind: "query", data_object_id: doMap["intent_signals"], coverage_tier: "platform", description: "Query intent signals.", mod: "ABM-INTENT" },
    { tool_name: "query_account_engagement_scores", operation_kind: "query", data_object_id: doMap["account_engagement_scores"], coverage_tier: "platform", description: "Query account engagement scores.", mod: "ABM-INTENT" },
    { tool_name: "update_abm_campaign", operation_kind: "mutate", data_object_id: doMap["abm_campaigns"], coverage_tier: "platform", description: "Create or update an ABM campaign.", mod: "ABM-ENGAGEMENT-ORCHESTRATION" },
    { tool_name: "query_account_journeys", operation_kind: "query", data_object_id: doMap["account_journeys"], coverage_tier: "platform", description: "Query account journeys.", mod: "ABM-ENGAGEMENT-ORCHESTRATION" },
    { tool_name: "update_ad_campaign_target", operation_kind: "mutate", data_object_id: doMap["ad_campaign_targets"], coverage_tier: "platform", description: "Create or update an ad campaign target.", mod: "ABM-ADVERTISING" },
    { tool_name: "update_web_experience", operation_kind: "mutate", data_object_id: doMap["web_experiences"], coverage_tier: "platform", description: "Create or update a personalized web experience.", mod: "ABM-WEB-PERSONALIZATION" },
    { tool_name: "query_web_visitor_resolutions", operation_kind: "query", data_object_id: doMap["web_visitor_resolutions"], coverage_tier: "platform", description: "Query web visitor resolutions.", mod: "ABM-WEB-PERSONALIZATION" },
  ];
  const toolMap = await syncByKey("/tools", toolSpecs.map(({ mod, ...rest }) => rest), "tool_name");
  const haveDMT = new Set((await get(`/domain_module_tools?domain_module_id=in.(${Object.values(M).join(",")})&select=domain_module_id,tool_id`)).map(r => `${r.domain_module_id}|${r.tool_id}`));
  const newDMT = toolSpecs.filter(t => !haveDMT.has(`${M[t.mod]}|${toolMap[t.tool_name]}`)).map(t => ({ domain_module_id: M[t.mod], tool_id: toolMap[t.tool_name], requirement_level: "required", notes: "" }));
  if (newDMT.length) await post("/domain_module_tools", newDMT);
  console.log(`tools synced; dmt +${newDMT.length}`);

  // ===== GTM-PLAN -> ABM handoffs (planning -> engagement cut) =====
  // trigger events on GTM-PLAN masters (source module GTM-PLAN-PLANNING-CORE = 389)
  const teMap: Record<string, number> = {};
  for (const te of [
    { event_name: "target_account_list.approved", data_object_id: 1221, event_category: "lifecycle", description: "A target account list is approved in GTM-PLAN and handed to engagement." },
    { event_name: "ideal_customer_profile.updated", data_object_id: 1220, event_category: "state_change", description: "An ICP definition is updated in GTM-PLAN." },
  ]) {
    const ex = await get(`/trigger_events?event_name=eq.${te.event_name}&data_object_id=eq.${te.data_object_id}&select=id`);
    if (ex.length) teMap[te.event_name] = Number(ex[0].id);
    else teMap[te.event_name] = Number((await post("/trigger_events", [te]))[0].id);
  }
  const hoSpecs = [
    { trigger_event_id: teMap["target_account_list.approved"], data_object_id: 1221, ip: "api_call", fr: "medium", desc: "Approved target account list flows from GTM-PLAN into ABM as the account universe for campaigns, journeys, ad audiences, and personalization." },
    { trigger_event_id: teMap["ideal_customer_profile.updated"], data_object_id: 1220, ip: "api_call", fr: "low", desc: "Updated ICP definition flows from GTM-PLAN into ABM to seed intent topics, audiences, and personalization." },
  ];
  for (const h of hoSpecs) {
    const ex = await get(`/handoffs?source_domain_id=eq.104&target_domain_id=eq.${ABM}&data_object_id=eq.${h.data_object_id}&trigger_event_id=eq.${h.trigger_event_id}&select=id`);
    if (!ex.length) await post("/handoffs", [{ source_domain_id: 104, target_domain_id: ABM, data_object_id: h.data_object_id, trigger_event_id: h.trigger_event_id, source_domain_module_id: 389, target_domain_module_id: M["ABM-ENGAGEMENT-ORCHESTRATION"], integration_pattern: h.ip, friction_level: h.fr, description: h.desc, notes: "" }]);
  }
  console.log("GTM-PLAN -> ABM handoffs authored");

  // ===== VERIFY =====
  console.log("\n== VERIFY ==");
  console.log("modules:", (await get(`/domain_modules?domain_id=eq.${ABM}&select=domain_module_code`)).length, "(want 4)");
  console.log("masters:", (await get(`/domain_module_data_objects?domain_module_id=in.(${Object.values(M).join(",")})&role=eq.master&select=data_object_id`)).length, "(want 12)");
  console.log("embedded_master:", (await get(`/domain_module_data_objects?domain_module_id=in.(${Object.values(M).join(",")})&role=eq.embedded_master&select=data_object_id`)).length, "(want 3)");
  console.log("consumers:", (await get(`/domain_module_data_objects?domain_module_id=in.(${Object.values(M).join(",")})&role=eq.consumer&select=data_object_id`)).length, "(want 3)");
  console.log("lifecycle states:", (await get(`/data_object_lifecycle_states?data_object_id=in.(${machines.map(m => doMap[m.name]).join(",")})&select=id`)).length);
  console.log("capabilities:", (await get(`/capability_domains?domain_id=eq.${ABM}&select=capability_id`)).length, "(want 6)");
  console.log("solutions:", (await get(`/solution_domains?domain_id=eq.${ABM}&select=solution_id`)).length, "(want 6)");
  console.log("system skill:", (await get(`/skills?domain_id=eq.${ABM}&skill_type=eq.system&select=skill_name`)).map(r => r.skill_name).join(","));
  console.log("GTM->ABM handoffs:", (await get(`/handoffs?source_domain_id=eq.104&target_domain_id=eq.${ABM}&select=id`)).length);
  console.log("DONE. ABM id:", ABM);
}
main();
