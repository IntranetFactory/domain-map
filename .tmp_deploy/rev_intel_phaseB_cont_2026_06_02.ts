#!/usr/bin/env bun
// REV-INTEL Phase B cont.: lifecycle states (B12) + aliases (B11) + relationships (B6/B7/B8).
// Idempotent on natural keys.
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
// data_object ids
const D = { CIR:124, TOPIC:1005, AITEM:1006, MSIG:1007, DRS:1008, DWARN:1009, RFC:1010, FSUB:1011, FADJ:1012, FACC:1013,
            CSESS:1014, CSCORE:1015, CRC:1016, CAPT:1017, AATTR:1018, ENG:1019, OPP:100, CALLREC:122, USERS:748 };

// ---- lifecycle states: [data_object_id, module_id, state_name, order, initial, terminal, requires_perm, verb_override, desc] ----
const STATES: Array<[number,number,string,number,boolean,boolean,boolean,string,string]> = [
  [D.AITEM, MOD.CONV, "open", 1, true, false, false, "", "Action item extracted from a conversation, not yet worked."],
  [D.AITEM, MOD.CONV, "in_progress", 2, false, false, false, "", "Rep is working the committed follow-up."],
  [D.AITEM, MOD.CONV, "done", 3, false, true, true, "complete_action_item", "Follow-up completed and confirmed."],
  [D.DWARN, MOD.DEAL, "raised", 1, true, false, false, "", "Risk pattern detected on the opportunity."],
  [D.DWARN, MOD.DEAL, "acknowledged", 2, false, false, true, "acknowledge_deal_warning", "Owner has seen and accepted the warning."],
  [D.DWARN, MOD.DEAL, "cleared", 3, false, true, true, "clear_deal_warning", "Risk resolved or no longer applicable."],
  [D.FSUB, MOD.FCST, "draft", 1, true, false, false, "", "Forecast submission being prepared for the period."],
  [D.FSUB, MOD.FCST, "submitted", 2, false, false, true, "submit_forecast", "Submitted into the forecast cadence for the period."],
  [D.FSUB, MOD.FCST, "locked", 3, false, true, true, "lock_forecast", "Period closed; submission locked from further edits."],
  [D.CSESS, MOD.COACH, "scheduled", 1, true, false, false, "", "Coaching session booked, usually around a recorded call."],
  [D.CSESS, MOD.COACH, "completed", 2, false, true, true, "complete_coaching_session", "Review conducted, notes and actions recorded."],
  [D.CSESS, MOD.COACH, "cancelled", 3, false, true, false, "", "Session cancelled before it took place."],
];

// ---- aliases: [data_object_id, alias_name] (all synonym, not preferred) ----
const ALIASES: Array<[number,string]> = [
  [D.DRS, "Deal Health"], [D.DRS, "Deal Inspection"], [D.DWARN, "Deal Risk Flags"],
  [D.RFC, "Forecast Roll-up"], [D.FSUB, "Forecast Call"], [D.CSESS, "Call Coaching"],
  [D.CSCORE, "Call Scorecards"], [D.CAPT, "Auto-Captured Activities"], [D.ENG, "Account Engagement Score"],
  [D.MSIG, "Competitive Signals"], [D.TOPIC, "Call Topics"], [D.CIR, "Call Insights"],
];

// ---- relationships: [src, tgt, verb, inverse, type, kind, owner_side, required] ----
const REL: Array<[number,number,string,string,string,string,string,boolean]> = [
  // intra-domain (B6)
  [D.CIR, D.TOPIC, "surfaces", "surfaced_in", "one_to_many", "composition", "source", false],
  [D.CIR, D.AITEM, "extracts", "extracted_from", "one_to_many", "composition", "source", false],
  [D.CIR, D.MSIG, "contributes_to", "aggregated_from", "many_to_many", "reference", "source", false],
  [D.CSESS, D.CSCORE, "evaluated_by", "evaluates", "one_to_many", "composition", "source", false],
  [D.CSESS, D.CRC, "annotated_with", "annotates", "one_to_many", "composition", "source", false],
  [D.RFC, D.FSUB, "aggregates", "rolls_up_into", "one_to_many", "reference", "source", false],
  [D.FSUB, D.FADJ, "adjusted_by", "adjusts", "one_to_many", "reference", "source", false],
  [D.FACC, D.FSUB, "measures", "measured_by", "one_to_many", "reference", "source", false],
  [D.DRS, D.DWARN, "raises", "raised_by", "one_to_many", "reference", "source", false],
  [D.ENG, D.CAPT, "aggregates", "rolls_up_into", "one_to_many", "reference", "source", false],
  [D.AATTR, D.CAPT, "attributes", "attributed_by", "one_to_many", "reference", "source", false],
  // users edges (B7) - users(748) is owner/source
  [D.USERS, D.FSUB, "submits forecasts", "is_submitted_by", "one_to_many", "reference", "source", false],
  [D.USERS, D.CSESS, "conducts coaching", "is_conducted_by", "one_to_many", "reference", "source", false],
  [D.USERS, D.CSCORE, "scores calls", "is_scored_by", "one_to_many", "reference", "source", false],
  [D.USERS, D.CRC, "authors review comments", "is_authored_by", "one_to_many", "reference", "source", false],
  [D.USERS, D.CAPT, "owns captured activities", "is_owned_by", "one_to_many", "reference", "source", false],
  [D.USERS, D.FADJ, "adjusts forecasts", "is_adjusted_by", "one_to_many", "reference", "source", false],
  [D.USERS, D.DWARN, "acknowledges warnings", "is_acknowledged_by", "one_to_many", "reference", "source", false],
  // cross-domain outbound (B8) - external master is parent (owner_side=target)
  [D.DRS, D.OPP, "scores", "scored_by", "one_to_many", "reference", "target", false],
  [D.RFC, D.OPP, "forecasts", "forecast_by", "one_to_many", "reference", "target", false],
  [D.CAPT, D.OPP, "attributed_to", "has_captured_activity", "one_to_many", "reference", "target", false],
  [D.CIR, D.CALLREC, "derived_from", "analyzed_into", "one_to_many", "reference", "target", false],
];

async function main() {
  // lifecycle states (key: data_object_id+state_name)
  const woIds = [...new Set(STATES.map(s => s[0]))];
  const exStates = await get(`/data_object_lifecycle_states?data_object_id=in.(${woIds.join(",")})&select=data_object_id,state_name`);
  const haveState = new Set(exStates.map(r => `${r.data_object_id}:${r.state_name}`));
  const stRows = STATES.filter(s => !haveState.has(`${s[0]}:${s[2]}`)).map(s => ({
    data_object_id: s[0], domain_module_id: s[1], state_name: s[2], state_order: s[3],
    is_initial: s[4], is_terminal: s[5], requires_permission: s[6], permission_verb_override: s[7],
    description: s[8], notes: "",
  }));
  console.log(stRows.length ? `Inserting ${stRows.length} lifecycle states` : "lifecycle states: all present");
  await post("/data_object_lifecycle_states", stRows);

  // aliases (key: data_object_id+alias_name)
  const aIds = [...new Set(ALIASES.map(a => a[0]))];
  const exAl = await get(`/data_object_aliases?data_object_id=in.(${aIds.join(",")})&select=data_object_id,alias_name`);
  const haveAl = new Set(exAl.map(r => `${r.data_object_id}:${r.alias_name}`));
  const alRows = ALIASES.filter(a => !haveAl.has(`${a[0]}:${a[1]}`)).map(a => ({
    data_object_id: a[0], alias_name: a[1], alias_type: "synonym", is_preferred: false, notes: "",
  }));
  console.log(alRows.length ? `Inserting ${alRows.length} aliases` : "aliases: all present");
  await post("/data_object_aliases", alRows);

  // relationships (key: src+tgt+verb)
  const srcIds = [...new Set(REL.map(r => r[0]))];
  const exRel = await get(`/data_object_relationships?data_object_id=in.(${srcIds.join(",")})&select=data_object_id,related_data_object_id,relationship_verb`);
  const haveRel = new Set(exRel.map(r => `${r.data_object_id}:${r.related_data_object_id}:${r.relationship_verb}`));
  const relRows = REL.filter(r => !haveRel.has(`${r[0]}:${r[1]}:${r[2]}`)).map(r => ({
    data_object_id: r[0], related_data_object_id: r[1], relationship_verb: r[2], inverse_verb: r[3],
    relationship_type: r[4], relationship_kind: r[5], owner_side: r[6], is_required: r[7], notes: "",
  }));
  console.log(relRows.length ? `Inserting ${relRows.length} relationships` : "relationships: all present");
  await post("/data_object_relationships", relRows);

  // verify
  console.log("\n=== VERIFY ===");
  const masters = [D.CIR,D.TOPIC,D.AITEM,D.MSIG,D.DRS,D.DWARN,D.RFC,D.FSUB,D.FADJ,D.FACC,D.CSESS,D.CSCORE,D.CRC,D.CAPT,D.AATTR,D.ENG];
  const rels = await get(`/data_object_relationships?or=(data_object_id.in.(${masters.join(",")}),related_data_object_id.in.(${masters.join(",")}))&select=data_object_id,related_data_object_id`);
  const touched = new Set<number>();
  for (const r of rels) { touched.add(Number(r.data_object_id)); touched.add(Number(r.related_data_object_id)); }
  const noEdge = masters.filter(m => !touched.has(m));
  console.log(`B6 masters with no relationship edge (expect none): ${noEdge.length ? noEdge.join(",") : "NONE"}`);
  const userEdges = await get(`/data_object_relationships?or=(data_object_id.eq.748,related_data_object_id.eq.748)&data_object_id=in.(748,${masters.join(",")})&select=related_data_object_id`);
  console.log(`B7 users edges to REV-INTEL masters: ${userEdges.length}`);
  const wf = await get(`/data_objects?id=in.(${masters.join(",")})&entity_type=eq.operational_workflow&select=id,data_object_name`);
  for (const w of wf) {
    const st = await get(`/data_object_lifecycle_states?data_object_id=eq.${w.id}&select=is_initial,is_terminal`);
    const init = st.filter((s:any)=>s.is_initial).length, term = st.filter((s:any)=>s.is_terminal).length;
    console.log(`  B12 ${w.data_object_name}: ${st.length} states, initial=${init}, terminal=${term}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
