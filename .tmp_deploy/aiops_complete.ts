#!/usr/bin/env bun
// AIOPS Phase-B completion (clears remaining b1a so the domain can flip to next_action_by:user):
//  - extra consumer DMDO rows on module 324 for ingested telemetry (so inbound handoff FKs resolve)
//  - intra-domain data_object_relationships (B6) + users edges (B7) + cross-domain (B8)
//  - lifecycle-cover trigger_events (B9)
//  - handoff module-FK backfill (B10b), deterministic from DMDO master/consumer module
// Idempotent. record_status + notes omitted (defaults). Additive + structural-FK PATCH only.

const M_EVENT = 324; // AIOPS-EVENT-CORRELATION
const M_PRED = 325;  // AIOPS-PREDICTIVE-INTELLIGENCE
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

// ---------- 1. extra consumer DMDO rows on 324 (ingested telemetry) ----------
const extraConsumers = [88, 89, 87, 79, 538, 589, 587, 548, 539]; // metric_series, log_entries, capacity_records, service_maps, network_flow_records, endpoint_anomaly_findings, real_user_sessions, dc_power_distribution_units, network_paths
{
  const exist = await get(`/domain_module_data_objects?domain_module_id=eq.${M_EVENT}&select=data_object_id`);
  const have = new Set(exist.map((r: any) => r.data_object_id));
  const rows = extraConsumers.filter((id) => !have.has(id)).map((id) => ({ domain_module_id: M_EVENT, data_object_id: id, role: "consumer", necessity: "optional" }));
  await post("/domain_module_data_objects", rows);
  log.push(`extra consumer DMDO on 324: +${rows.length}`);
}

// ---------- 2. data_object_relationships (B6 intra, B7 users, B8 cross) ----------
// [src, verb, inverse, dst, type, kind, owner_side, is_required]
const rels: [number, string, string, number, string, string, string, boolean][] = [
  // B6 intra-domain
  [93, "correlates", "correlated_into", 94, "one_to_many", "reference", "source", false],
  [93, "spawns", "investigated_by", 95, "one_to_many", "reference", "source", false],
  [96, "feeds", "derived_from", 724, "one_to_many", "reference", "source", false],
  [723, "calibrates", "calibrated_by", 94, "one_to_many", "reference", "source", false],
  [722, "suppresses", "suppressed_by", 93, "one_to_many", "reference", "source", false],
  // B7 users edges (users is the parent/owner side = source)
  [USERS, "authors", "authored_by", 95, "one_to_many", "reference", "source", false],
  [USERS, "creates", "created_by", 722, "one_to_many", "reference", "source", false],
  [USERS, "initiates", "initiated_by", 723, "one_to_many", "reference", "source", false],
  // B8 cross-domain outbound (AIOPS master -> other-domain payload)
  [93, "triggers", "triggered_by", 47, "one_to_many", "reference", "source", false],   // event_correlations -> service_incidents (ITSM)
  [95, "informs", "informed_by", 49, "one_to_many", "reference", "source", false],     // root_cause_analyses -> service_problems (ITSM)
  [95, "annotates", "annotated_by", 47, "one_to_many", "reference", "source", false],  // root_cause_analyses -> service_incidents (ITSM)
  [724, "forecasts", "forecast_by", 47, "one_to_many", "reference", "source", false],  // incident_predictions -> service_incidents (ITSM)
];
{
  const exist = await get(`/data_object_relationships?data_object_id=in.(93,94,95,96,722,723,724,${USERS})&select=data_object_id,related_data_object_id`);
  const have = new Set(exist.map((r: any) => `${r.data_object_id}.${r.related_data_object_id}`));
  const rows = rels.filter(([s, , , d]) => !have.has(`${s}.${d}`)).map(([s, v, iv, d, t, k, o, req]) => ({
    data_object_id: s, related_data_object_id: d, relationship_verb: v, inverse_verb: iv,
    relationship_type: t, relationship_kind: k, owner_side: o, is_required: req,
  }));
  await post("/data_object_relationships", rows);
  log.push(`data_object_relationships: +${rows.length}`);
}

// ---------- 3. lifecycle-cover trigger_events (B9) ----------
const events: [string, number, number, string, string][] = [
  // [event_name, data_object_id, module_id, event_category, to_state]
  ["event_correlation.resolved", 93, M_EVENT, "state_change", "resolved"],
  ["anomaly_detection.confirmed", 94, M_EVENT, "state_change", "confirmed"],
  ["anomaly_detection.dismissed", 94, M_EVENT, "state_change", "dismissed"],
  ["root_cause_analysis.reviewed", 95, M_PRED, "state_change", "reviewed"],
  ["predictive_signal.expired", 96, M_PRED, "state_change", "expired"],
  ["incident_prediction.realized", 724, M_PRED, "state_change", "realized"],
  ["incident_prediction.dismissed", 724, M_PRED, "state_change", "dismissed"],
];
{
  const exist = await get(`/trigger_events?data_object_id=in.(93,94,95,96,724)&select=event_name`);
  const have = new Set(exist.map((r: any) => r.event_name));
  const rows = events.filter(([n]) => !have.has(n)).map(([n, doid, mid, cat, to]) => ({
    event_name: n, data_object_id: doid, domain_module_id: mid, event_category: cat,
    to_state: to, from_state: "", description: `Fired when ${n.split(".")[0].replace(/_/g, " ")} transitions to ${to}.`,
  }));
  await post("/trigger_events", rows);
  log.push(`trigger_events: +${rows.length}`);
}

// ---------- 4. handoff module-FK backfill (B10b) ----------
{
  const outMap: Record<number, number> = { 57: M_EVENT, 58: M_PRED, 59: M_EVENT, 603: M_PRED, 604: M_PRED, 605: M_PRED, 606: M_EVENT, 607: M_EVENT };
  const inMap: Record<number, number> = { 53: M_EVENT, 56: M_EVENT, 141: M_EVENT, 154: M_PRED, 608: M_EVENT, 609: M_EVENT, 610: M_EVENT, 612: M_EVENT, 613: M_EVENT, 619: M_EVENT, 628: M_EVENT, 649: M_EVENT, 665: M_EVENT, 667: M_EVENT, 676: M_EVENT, 1394: M_EVENT };
  let o = 0, i = 0;
  for (const [hid, mid] of Object.entries(outMap)) { await patch(`/handoffs?id=eq.${hid}`, { source_domain_module_id: mid }); o++; }
  for (const [hid, mid] of Object.entries(inMap)) { await patch(`/handoffs?id=eq.${hid}`, { target_domain_module_id: mid }); i++; }
  log.push(`handoff FK backfill: ${o} outbound source_module, ${i} inbound target_module`);
}

console.log("===== AIOPS completion =====");
for (const l of log) console.log("  " + l);
