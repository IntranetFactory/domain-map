#!/usr/bin/env bun
// CCAAS Phase-B completion (clears remaining agent-solvable work so the domain flips to next_action_by:user):
//  - extra consumer DMDO rows for inbound-handoff payloads no CCAAS module yet holds (so inbound handoff FKs resolve)
//    + the WFM schedule consumer link (work_schedules, replacing the non-existent agent_schedules link)
//  - intra-domain data_object_relationships (B6) + users edges (B7) + cross-domain outbound (B8)
//  - lifecycle-cover trigger_events (B9), deduped by event_name
//  - handoff module-FK backfill (B10b), deterministic from DMDO master/consumer module
// Idempotent. record_status + notes omitted (defaults). Additive + structural-FK PATCH only.

const M_ROUTING = 329; // CCAAS-ROUTING
const M_DESKTOP = 330; // CCAAS-DESKTOP
const M_QUALITY = 331; // CCAAS-QUALITY
const USERS = 748;

async function call(body: any): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(err + out);
  const t = out.trim(); if (!t) return []; const s = t.search(/[\[{]/); return JSON.parse(s >= 0 ? t.slice(s) : t);
}
const get = (p: string) => call({ method: "GET", path: p });
async function post(p: string, rows: any[]) { for (let i = 0; i < rows.length; i += 50) await call({ method: "POST", path: p, body: rows.slice(i, i + 50) }); }
async function patch(p: string, body: any) { await call({ method: "PATCH", path: p, body }); }

const log: string[] = [];

// ---------- 1. extra consumer DMDO rows for inbound-handoff payloads + WFM schedule link ----------
// [module_id, data_object_id]
//  259 conversation_transcripts (CONV-AI escalation, handoff 228)  -> DESKTOP (agent picks up the escalated conversation)
//  701 conversation_flows       (CONV-AI fallback,   handoff 743)  -> ROUTING (fallback drops into the live queue)
//  699 bot_definitions          (CONV-AI publish,    handoff 746)  -> ROUTING (self-service/IVR runtime context)
//  566 chat_threads             (WSC escalation,     handoff 833)  -> DESKTOP (agent handles the escalated chat)
//  160 work_schedules           (WFM adherence)                    -> DESKTOP (compare actual agent_states vs plan; replaces the skipped agent_schedules link)
const consumerDMDO: [number, number][] = [
  [M_DESKTOP, 259],
  [M_ROUTING, 701],
  [M_ROUTING, 699],
  [M_DESKTOP, 566],
  [M_DESKTOP, 160],
];
{
  const exist = await get(`/domain_module_data_objects?domain_module_id=in.(${M_ROUTING},${M_DESKTOP},${M_QUALITY})&select=domain_module_id,data_object_id`);
  const have = new Set(exist.map((r: any) => `${r.domain_module_id}.${r.data_object_id}`));
  const rows = consumerDMDO.filter(([m, d]) => !have.has(`${m}.${d}`)).map(([m, d]) => ({ domain_module_id: m, data_object_id: d, role: "consumer", necessity: "optional" }));
  await post("/domain_module_data_objects", rows);
  log.push(`extra consumer DMDO: +${rows.length}`);
}

// ---------- 2. data_object_relationships (B6 intra, B7 users, B8 cross) ----------
// CCAAS masters: support_sessions 256, contact_records 257, queue_statistics 258, ccaas_call_recordings 735,
//                agent_states 736, disposition_codes 737, interaction_evaluations 1026, evaluation_forms 1027
// [src, verb, inverse, dst, type, kind, owner_side, is_required]
const rels: [number, string, string, number, string, string, string, boolean][] = [
  // B6 intra-domain
  [256, "captures", "captured_in", 257, "one_to_many", "reference", "source", false],          // support_sessions -> contact_records
  [257, "produces", "produced_by", 735, "one_to_many", "reference", "source", false],           // contact_records -> ccaas_call_recordings
  [737, "classifies", "classified_by", 257, "one_to_many", "reference", "source", false],        // disposition_codes -> contact_records
  [258, "aggregates", "aggregated_into", 257, "one_to_many", "reference", "source", false],       // queue_statistics -> contact_records
  [735, "reviewed_in", "reviews", 1026, "one_to_many", "reference", "source", false],             // ccaas_call_recordings -> interaction_evaluations
  [1027, "scores", "scored_against", 1026, "one_to_many", "reference", "source", false],          // evaluation_forms -> interaction_evaluations
  // B7 users edges (users is the parent/owner side = source)
  [USERS, "scores", "scored_by", 1026, "one_to_many", "reference", "source", false],             // users -> interaction_evaluations (evaluator)
  [USERS, "authors", "authored_by", 1027, "one_to_many", "reference", "source", false],          // users -> evaluation_forms
  // B8 cross-domain outbound (CCAAS master -> other-domain payload), mirroring published handoffs
  [257, "enriches", "enriched_by", 98, "one_to_many", "reference", "source", false],             // contact_records -> crm_contacts (CRM, handoffs 501/530)
  [736, "feeds", "fed_by", 162, "one_to_many", "reference", "source", false],                    // agent_states -> time_entries (WFM, handoff 499)
  [258, "informs", "informed_by", 160, "one_to_many", "reference", "source", false],             // queue_statistics -> work_schedules (WFM, handoff 500)
];
{
  const exist = await get(`/data_object_relationships?data_object_id=in.(256,257,258,735,736,737,1026,1027,${USERS})&select=data_object_id,related_data_object_id`);
  const have = new Set(exist.map((r: any) => `${r.data_object_id}.${r.related_data_object_id}`));
  const rows = rels.filter(([s, , , d]) => !have.has(`${s}.${d}`)).map(([s, v, iv, d, t, k, o, req]) => ({
    data_object_id: s, related_data_object_id: d, relationship_verb: v, inverse_verb: iv,
    relationship_type: t, relationship_kind: k, owner_side: o, is_required: req,
  }));
  await post("/data_object_relationships", rows);
  log.push(`data_object_relationships: +${rows.length}`);
}

// ---------- 3. lifecycle-cover trigger_events (B9) ----------
// [event_name, data_object_id, module_id, event_category, from_state, to_state]
const events: [string, number, number, string, string, string][] = [
  // support_sessions (256) @ DESKTOP
  ["support_session.wrap_up_started", 256, M_DESKTOP, "state_change", "active", "wrap_up"],
  ["support_session.completed", 256, M_DESKTOP, "state_change", "wrap_up", "completed"],
  ["support_session.abandoned", 256, M_DESKTOP, "state_change", "queued", "abandoned"],
  // ccaas_call_recordings (735) @ QUALITY
  ["ccaas_call_recording.transcribed", 735, M_QUALITY, "state_change", "stored", "transcribed"],
  ["ccaas_call_recording.retained", 735, M_QUALITY, "state_change", "transcribed", "retained"],
  ["ccaas_call_recording.purged", 735, M_QUALITY, "state_change", "retained", "purged"],
  // agent_states (736) @ DESKTOP
  ["agent_state.available", 736, M_DESKTOP, "state_change", "logged_out", "available"],
  ["agent_state.logged_out", 736, M_DESKTOP, "state_change", "available", "logged_out_end"],
  // interaction_evaluations (1026) @ QUALITY
  ["interaction_evaluation.completed", 1026, M_QUALITY, "state_change", "scoring", "completed"],
  ["interaction_evaluation.disputed", 1026, M_QUALITY, "state_change", "completed", "disputed"],
  ["interaction_evaluation.calibrated", 1026, M_QUALITY, "state_change", "completed", "calibrated"],
];
{
  const exist = await get(`/trigger_events?data_object_id=in.(256,735,736,1026)&select=event_name`);
  const have = new Set(exist.map((r: any) => r.event_name));
  const rows = events.filter(([n]) => !have.has(n)).map(([n, doid, mid, cat, from, to]) => ({
    event_name: n, data_object_id: doid, domain_module_id: mid, event_category: cat,
    from_state: from, to_state: to,
    description: `Fired when ${n.split(".")[0].replace(/_/g, " ")} transitions to ${to}.`,
  }));
  await post("/trigger_events", rows);
  log.push(`trigger_events: +${rows.length}`);
}

// ---------- 4. handoff module-FK backfill (B10b) ----------
// outbound source_domain_module_id = CCAAS module mastering the trigger_event's payload data_object
//   225 support_sessions(256)->DESKTOP, 226 support_sessions(256)->DESKTOP,
//   501 contact_records(257)->DESKTOP, 530 contact_records(257)->DESKTOP,
//   499 agent_states(736)->DESKTOP, 500 queue_statistics(258)->ROUTING
// inbound target_domain_module_id = CCAAS module holding the payload as consumer
//   228 conversation_transcripts(259)->DESKTOP, 722 knowledge_base_articles(410)->ROUTING,
//   743 conversation_flows(701)->ROUTING, 746 bot_definitions(699)->ROUTING, 833 chat_threads(566)->DESKTOP
{
  const outMap: Record<number, number> = { 225: M_DESKTOP, 226: M_DESKTOP, 501: M_DESKTOP, 530: M_DESKTOP, 499: M_DESKTOP, 500: M_ROUTING };
  const inMap: Record<number, number> = { 228: M_DESKTOP, 722: M_ROUTING, 743: M_ROUTING, 746: M_ROUTING, 833: M_DESKTOP };
  let o = 0, i = 0;
  for (const [hid, mid] of Object.entries(outMap)) { await patch(`/handoffs?id=eq.${hid}&source_domain_module_id=is.null`, { source_domain_module_id: mid }); o++; }
  for (const [hid, mid] of Object.entries(inMap)) { await patch(`/handoffs?id=eq.${hid}&target_domain_module_id=is.null`, { target_domain_module_id: mid }); i++; }
  log.push(`handoff FK backfill: ${o} outbound source_module, ${i} inbound target_module`);
}

console.log("===== CCAAS completion =====");
for (const l of log) console.log("  " + l);
