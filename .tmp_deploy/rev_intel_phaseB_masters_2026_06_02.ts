#!/usr/bin/env bun
// REV-INTEL Phase B: masters + DMDO (modular) + domain_data_objects (rollup) + B2-O1 move.
// Idempotent: natural-key reads, insert-missing-only, idempotent PATCH for the 124 move.

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
    new Response(proc.stdout).text(), new Response(proc.stderr).text(),
  ]);
  if (await proc.exited !== 0) throw new Error(`semantius failed: ${stderr}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
const post = (p: string, body: Row[]) => body.length ? call({ method: "POST", path: p, body }) : Promise.resolve([] as Row[]);
const patch = (p: string, body: Row) => call({ method: "PATCH", path: p, body });

const DOMAIN_ID = 103;
const MOD = { CONV: 186, DEAL: 187, FCST: 188, COACH: 189, ACT: 190 };
const CIR = 124, CALLREC = 122, OPP = 100; // reused existing data_objects

// 15 NEW masters: [name, singular, plural, entity_type, necessity, module, has_personal_content, has_submit_lock, description]
const NEW_MASTERS: Array<{n:string;s:string;p:string;et:string;nec:string;mod:number;hp:boolean;hs:boolean;d:string}> = [
  {n:"conversation_topics", s:"Conversation Topic", p:"Conversation Topics", et:"operational_record", nec:"optional", mod:MOD.CONV, hp:false, hs:false,
   d:"Topic mentions extracted from a recorded conversation: competitor references, pricing discussion, objections, and next-step commitments, each tagged with the transcript span it was found in."},
  {n:"conversation_action_items", s:"Conversation Action Item", p:"Conversation Action Items", et:"operational_workflow", nec:"optional", mod:MOD.CONV, hp:false, hs:false,
   d:"Commitments and follow-ups extracted from a conversation, tracked from open to done so reps and managers can confirm post-call execution."},
  {n:"market_signals", s:"Market Signal", p:"Market Signals", et:"operational_record", nec:"optional", mod:MOD.CONV, hp:false, hs:false,
   d:"Competitive, pricing, and churn-risk signals aggregated across the conversation corpus, summarizing what the market is saying in aggregate rather than on a single call."},
  {n:"deal_risk_scores", s:"Deal Risk Score", p:"Deal Risk Scores", et:"computed", nec:"required", mod:MOD.DEAL, hp:false, hs:false,
   d:"Per-opportunity machine-derived risk grade with the feature contributions that drove it, recomputed as new activity, conversation, and CRM signals arrive."},
  {n:"deal_warnings", s:"Deal Warning", p:"Deal Warnings", et:"operational_workflow", nec:"optional", mod:MOD.DEAL, hp:false, hs:false,
   d:"Named risk patterns raised against an opportunity, such as no identified decision-maker, no scheduled next step, or single-threaded engagement, tracked from raised to cleared."},
  {n:"revenue_forecasts", s:"Revenue Forecast", p:"Revenue Forecasts", et:"operational_record", nec:"required", mod:MOD.FCST, hp:false, hs:false,
   d:"Period revenue forecast snapshot by segment and roll-up, recording the committed, best-case, and pipeline category calls for a given forecast period."},
  {n:"forecast_submissions", s:"Forecast Submission", p:"Forecast Submissions", et:"operational_workflow", nec:"required", mod:MOD.FCST, hp:false, hs:true,
   d:"A rep or manager submission for a forecast period, moving from draft to submitted to locked as the forecast cadence closes."},
  {n:"forecast_adjustments", s:"Forecast Adjustment", p:"Forecast Adjustments", et:"operational_record", nec:"optional", mod:MOD.FCST, hp:false, hs:false,
   d:"A manager override applied to a submitted forecast, capturing the changed number and the rationale for the adjustment."},
  {n:"forecast_accuracy_records", s:"Forecast Accuracy Record", p:"Forecast Accuracy Records", et:"computed", nec:"optional", mod:MOD.FCST, hp:false, hs:false,
   d:"Historical comparison of submitted forecasts against actual closed results, used to measure forecast accuracy and train the forecasting models."},
  {n:"coaching_sessions", s:"Coaching Session", p:"Coaching Sessions", et:"operational_workflow", nec:"optional", mod:MOD.COACH, hp:true, hs:false,
   d:"A one-on-one coaching review, usually anchored to a recorded call, scheduled and then completed with notes and follow-up actions for the rep."},
  {n:"coaching_scorecards", s:"Coaching Scorecard", p:"Coaching Scorecards", et:"operational_record", nec:"optional", mod:MOD.COACH, hp:true, hs:false,
   d:"A manager evaluation of a call or rep against a talk-track rubric, scoring adherence to the playbook on defined criteria."},
  {n:"call_review_comments", s:"Call Review Comment", p:"Call Review Comments", et:"operational_record", nec:"optional", mod:MOD.COACH, hp:true, hs:false,
   d:"Timestamped annotations left on a recorded call during review, tied to the moment in the conversation they refer to."},
  {n:"captured_activities", s:"Captured Activity", p:"Captured Activities", et:"operational_record", nec:"required", mod:MOD.ACT, hp:true, hs:false,
   d:"An automatically captured email, meeting, or call attributed to an opportunity and account, removing the manual logging burden and keeping the activity record complete."},
  {n:"activity_attribution_rules", s:"Activity Attribution Rule", p:"Activity Attribution Rules", et:"catalog", nec:"optional", mod:MOD.ACT, hp:false, hs:false,
   d:"Configurable rules that decide which captured activities count toward which opportunity or account for engagement and attribution reporting."},
  {n:"engagement_scores", s:"Engagement Score", p:"Engagement Scores", et:"computed", nec:"optional", mod:MOD.ACT, hp:false, hs:false,
   d:"A computed rollup of activity intensity per account or per contact, summarizing how engaged a buying group is over a period."},
];

// module-level DMDO rows: [name, module_id, role, necessity]
const DMDO: Array<[string, number, string, string]> = [
  ...NEW_MASTERS.map(m => [m.n, m.mod, "master", m.nec] as [string,number,string,string]),
  ["conversation_intelligence_records", MOD.CONV, "master", "required"],   // B2-O1 move
  ["crm_opportunities", MOD.DEAL, "embedded_master", "required"],
  ["crm_opportunities", MOD.FCST, "embedded_master", "required"],
  ["crm_opportunities", MOD.CONV, "consumer", "optional"],
  ["crm_opportunities", MOD.ACT, "consumer", "required"],
  ["call_recordings", MOD.CONV, "embedded_master", "required"],
  ["call_recordings", MOD.COACH, "embedded_master", "required"],
  ["conversation_intelligence_records", MOD.DEAL, "embedded_master", "optional"],
  ["conversation_intelligence_records", MOD.COACH, "embedded_master", "optional"],
  ["captured_activities", MOD.DEAL, "embedded_master", "optional"],
  ["deal_risk_scores", MOD.FCST, "embedded_master", "optional"],
];

// domain-level rollup rows (domain 103): [name, role, necessity] -- strongest role per data_object
const DDO: Array<[string, string, string]> = [
  ...NEW_MASTERS.map(m => [m.n, "master", m.nec] as [string,string,string]),
  ["conversation_intelligence_records", "master", "required"],
  ["crm_opportunities", "embedded_master", "required"],
  ["call_recordings", "embedded_master", "required"],
];

async function main() {
  // 1. insert missing data_objects
  const newNames = NEW_MASTERS.map(m => m.n);
  const existing = await get(`/data_objects?data_object_name=in.(${newNames.join(",")})&select=id,data_object_name`);
  const haveName = new Set(existing.map(r => String(r.data_object_name)));
  const toInsert = NEW_MASTERS.filter(m => !haveName.has(m.n)).map(m => ({
    data_object_name: m.n, kind: "domain_owned", entity_type: m.et,
    singular_label: m.s, plural_label: m.p, description: m.d,
    is_canonical_bare_word: false, naming_authority_rationale: "",
    has_personal_content: m.hp, has_submit_lock: m.hs, has_single_approver: false, notes: "",
  }));
  if (toInsert.length) { console.log(`Inserting ${toInsert.length} data_objects (${existing.length} existed)`); await post("/data_objects", toInsert); }
  else console.log(`data_objects: all ${NEW_MASTERS.length} present`);

  // 2. name -> id map (new + reused)
  const allNames = [...newNames, "conversation_intelligence_records", "crm_opportunities", "call_recordings"];
  const rows = await get(`/data_objects?data_object_name=in.(${allNames.join(",")})&select=id,data_object_name`);
  const id = new Map<string, number>();
  for (const r of rows) id.set(String(r.data_object_name), Number(r.id));
  for (const n of allNames) if (!id.has(n)) throw new Error(`missing data_object id for ${n}`);

  // 3. B2-O1 move: demote SALES-ENG master on 124 -> embedded_master (idempotent)
  const seRow = await get(`/domain_data_objects?data_object_id=eq.${CIR}&domain_id=eq.95&select=id,role`);
  if (seRow.length && seRow[0].role !== "embedded_master") {
    console.log(`Demoting SALES-ENG domain_data_objects ${seRow[0].id} on 124: master -> embedded_master`);
    await patch(`/domain_data_objects?id=eq.${seRow[0].id}`, { role: "embedded_master" });
  } else console.log(`SALES-ENG 124 row already embedded_master or absent`);

  // 4. domain_data_objects rollup rows for REV-INTEL (domain 103)
  const existDDO = await get(`/domain_data_objects?domain_id=eq.${DOMAIN_ID}&select=data_object_id,role`);
  const haveDDO = new Set(existDDO.map(r => Number(r.data_object_id)));
  const ddoRows = DDO.filter(([n]) => !haveDDO.has(id.get(n)!)).map(([n, role, nec]) => ({
    domain_id: DOMAIN_ID, data_object_id: id.get(n)!, role, necessity: nec,
  }));
  if (ddoRows.length) { console.log(`Inserting ${ddoRows.length} domain_data_objects rollup rows (${existDDO.length} existed)`); await post("/domain_data_objects", ddoRows); }
  else console.log(`domain_data_objects: all present`);

  // 5. domain_module_data_objects rows
  const modIds = Object.values(MOD).join(",");
  const existDMDO = await get(`/domain_module_data_objects?domain_module_id=in.(${modIds})&select=domain_module_id,data_object_id,role`);
  const haveDMDO = new Set(existDMDO.map(r => `${r.domain_module_id}:${r.data_object_id}`));
  const dmdoRows = DMDO.filter(([n, mid]) => !haveDMDO.has(`${mid}:${id.get(n)!}`)).map(([n, mid, role, nec]) => ({
    domain_module_id: mid, data_object_id: id.get(n)!, role, necessity: nec,
  }));
  if (dmdoRows.length) { console.log(`Inserting ${dmdoRows.length} domain_module_data_objects rows (${existDMDO.length} existed)`); await post("/domain_module_data_objects", dmdoRows); }
  else console.log(`domain_module_data_objects: all present`);

  // 6. verify
  console.log("\n=== VERIFY ===");
  const masters103 = await get(`/domain_data_objects?domain_id=eq.${DOMAIN_ID}&role=eq.master&select=data_object_id`);
  console.log(`B1 domain_data_objects masters for REV-INTEL: ${masters103.length} (expect 16)`);
  // M7 single-master: each REV-INTEL master should have exactly 1 master DMDO catalog-wide
  const masterIds = NEW_MASTERS.map(m => id.get(m.n)!).concat([CIR]);
  const allMasterDmdo = await get(`/domain_module_data_objects?data_object_id=in.(${masterIds.join(",")})&role=eq.master&select=data_object_id,domain_module_id`);
  const cnt = new Map<number, number>();
  for (const r of allMasterDmdo) cnt.set(Number(r.data_object_id), (cnt.get(Number(r.data_object_id)) ?? 0) + 1);
  const multi = masterIds.filter(i => (cnt.get(i) ?? 0) > 1);
  console.log(`M7 data_objects with >1 master DMDO (expect none): ${multi.length ? multi.join(",") : "NONE"}`);
  // B13 entity_type classified
  const unclassified = await get(`/data_objects?id=in.(${masterIds.join(",")})&entity_type=eq.unclassified&select=id,data_object_name`);
  console.log(`B13 unclassified masters (expect none): ${unclassified.length ? unclassified.map(r=>r.data_object_name).join(",") : "NONE"}`);
  // 124 ownership check
  const cir = await get(`/domain_data_objects?data_object_id=eq.${CIR}&select=domain_id,role,domains(domain_code)`);
  console.log(`conversation_intelligence_records(124) holders: ${cir.map(r=>`${(r.domains as any).domain_code}:${r.role}`).join(", ")}`);
}
main().catch(e => { console.error(e); process.exit(1); });
