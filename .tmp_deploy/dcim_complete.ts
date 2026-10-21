#!/usr/bin/env bun
// DCIM Phase-B completion (clears remaining b1a so the domain can flip to next_action_by:user):
//  - extra consumer DMDO rows for inbound-handoff payloads (DCIM has zero inbound handoffs -> no-op, but checked)
//  - intra-domain data_object_relationships (B6) + users edges (B7) + cross-domain outbound (B8)
//  - lifecycle-cover trigger_events (B9) for the 3 operational_workflow masters with observable transitions
//  - handoff module-FK backfill (B10b): source_domain_module_id on all 9 outbound handoffs,
//    deterministic from the module mastering the trigger_event's data_object
// Idempotent. record_status + notes omitted (defaults). Additive + structural-FK PATCH only.

const M_ASSET = 326; // DCIM-ASSET-SPACE: dc_racks(546), dc_cabinets(547), dc_change_requests(1025)
const M_POWER = 327; // DCIM-POWER-ENV: PDUs(548), circuits(549), UPS(550), cooling(551), env_readings(552)
const M_CAP = 328;   // DCIM-CAP-CONN: capacity_plans(553), port_connections(554), cable_connections(555)
const USERS = 748;
const DCIM_MASTERS = [546, 547, 548, 549, 550, 551, 552, 553, 554, 555, 1025];

async function call(body: any): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(err + out);
  const t = out.trim(); if (!t) return []; const s = t.search(/[\[{]/); return JSON.parse(s >= 0 ? t.slice(s) : t);
}
const get = (p: string) => call({ method: "GET", path: p });
async function post(p: string, rows: any[]) { for (let i = 0; i < rows.length; i += 50) if (rows.length) await call({ method: "POST", path: p, body: rows.slice(i, i + 50) }); }
async function patch(p: string, body: any) { await call({ method: "PATCH", path: p, body }); }

const log: string[] = [];

// ---------- 1. extra consumer DMDO rows for inbound-handoff payloads ----------
// DCIM has zero inbound handoffs (target_domain_id=84). Check live, then no-op if confirmed.
{
  const inbound = await get(`/handoffs?target_domain_id=eq.84&select=id,data_object_id`);
  if (inbound.length === 0) {
    log.push(`inbound handoffs: 0 -> no consumer DMDO rows needed`);
  } else {
    const needed = [...new Set(inbound.map((r: any) => r.data_object_id))];
    const exist = await get(`/domain_module_data_objects?domain_module_id=in.(${M_ASSET},${M_POWER},${M_CAP})&select=data_object_id`);
    const have = new Set(exist.map((r: any) => r.data_object_id));
    const rows = needed.filter((id: any) => !have.has(id)).map((id: any) => ({ domain_module_id: M_POWER, data_object_id: id, role: "consumer", necessity: "optional" }));
    await post("/domain_module_data_objects", rows);
    log.push(`extra consumer DMDO: +${rows.length}`);
  }
}

// ---------- 2. data_object_relationships (B6 intra, B7 users, B8 cross) ----------
// [src, verb, inverse, dst, type, kind, owner_side, is_required]
const rels: [number, string, string, number, string, string, string, boolean][] = [
  // B6 intra-domain (fill obvious missing edges; the build already loaded 9). relationship_type is
  // constrained to one_to_many|one_to_one|many_to_many, so parent-side is always the source.
  [551, "emits_readings", "reading_of", 552, "one_to_many", "reference", "source", false], // cooling_unit emits env_readings
  [553, "projects", "projected_by", 549, "one_to_many", "reference", "source", false], // capacity_plan projects power_circuit headroom
  [553, "projects_cooling", "cooling_projected_by", 551, "one_to_many", "reference", "source", false], // capacity_plan projects cooling headroom
  [546, "changed_by", "targets", 1025, "one_to_many", "reference", "source", false], // rack is parent of a change_request that targets it
  [547, "cabinet_changed_by", "targets_cabinet", 1025, "one_to_many", "reference", "source", false], // cabinet is parent of a change_request that targets it
  // B7 users edges (users is the parent/owner side = source) for masters with a human actor
  [USERS, "submits", "submitted_by", 1025, "one_to_many", "reference", "source", false], // user submits change_request
  [USERS, "operates", "operated_by", 548, "one_to_many", "reference", "source", false], // user operates PDU
  [USERS, "maintains", "maintained_by", 551, "one_to_many", "reference", "source", false], // user maintains cooling_unit
  [USERS, "documents", "documented_by", 554, "one_to_many", "reference", "source", false], // user documents port_connection
  // B8 cross-domain OUTBOUND mirroring DCIM-published handoffs with a clean payload->target mapping.
  // The published handoffs to ITSM all carry payload service_incidents(47); mirror source-master -> incident.
  [547, "raises", "raised_by", 47, "one_to_many", "reference", "source", false], // cabinet env alert (handoff 674) -> ITSM service_incidents
  [548, "raises", "raised_by", 47, "one_to_many", "reference", "source", false], // PDU failure (handoff 675) -> ITSM service_incidents
  [550, "raises", "raised_by", 47, "one_to_many", "reference", "source", false], // UPS failover (handoff 677) -> ITSM service_incidents
  [551, "raises", "raised_by", 47, "one_to_many", "reference", "source", false], // cooling failure (handoff 678) -> ITSM service_incidents
];
{
  const exist = await get(`/data_object_relationships?or=(data_object_id.in.(${DCIM_MASTERS.join(",")},${USERS}),related_data_object_id.in.(${DCIM_MASTERS.join(",")}))&select=data_object_id,related_data_object_id`);
  const have = new Set(exist.map((r: any) => `${r.data_object_id}.${r.related_data_object_id}`));
  const rows = rels.filter(([s, , , d]) => !have.has(`${s}.${d}`)).map(([s, v, iv, d, t, k, o, req]) => ({
    data_object_id: s, related_data_object_id: d, relationship_verb: v, inverse_verb: iv,
    relationship_type: t, relationship_kind: k, owner_side: o, is_required: req,
  }));
  await post("/data_object_relationships", rows);
  log.push(`data_object_relationships: +${rows.length}`);
}

// ---------- 3. lifecycle-cover trigger_events (B9) ----------
// Cover observable state transitions on the 3 operational_workflow masters that lack an event today.
// dedup by event_name.
const events: [string, number, number, string, string][] = [
  // [event_name, data_object_id, module_id, event_category, to_state]
  ["dc_rack.installed", 546, M_ASSET, "lifecycle", "installed"],
  ["dc_rack.activated", 546, M_ASSET, "state_change", "active"],
  ["dc_rack.decommissioned", 546, M_ASSET, "lifecycle", "retired"],
  ["dc_power_circuit.energized", 549, M_POWER, "state_change", "energized"],
  ["dc_power_circuit.de_energized", 549, M_POWER, "state_change", "de_energized"],
  ["dc_power_circuit.decommissioned", 549, M_POWER, "lifecycle", "decommissioned"],
  ["dc_capacity_plan.published", 553, M_CAP, "lifecycle", "published"],
  ["dc_capacity_plan.superseded", 553, M_CAP, "state_change", "superseded"],
];
{
  const exist = await get(`/trigger_events?data_object_id=in.(546,549,553)&select=event_name`);
  const have = new Set(exist.map((r: any) => r.event_name));
  const rows = events.filter(([n]) => !have.has(n)).map(([n, doid, mid, cat, to]) => ({
    event_name: n, data_object_id: doid, domain_module_id: mid, event_category: cat,
    to_state: to, from_state: "", description: `Fired when ${n.split(".")[0].replace(/_/g, " ")} transitions to ${to}.`,
  }));
  await post("/trigger_events", rows);
  log.push(`trigger_events: +${rows.length}`);
}

// ---------- 4. handoff module-FK backfill (B10b) ----------
// DCIM has 9 outbound handoffs, all with null source_domain_module_id, and 0 inbound handoffs.
// source_domain_module_id = the DCIM module that MASTERS the trigger_event's data_object.
{
  const outMap: Record<number, number> = {
    673: M_POWER, // te dc_environmental_reading.threshold_breached -> env_readings(552) mastered on POWER
    674: M_ASSET, // te dc_cabinet.environmental_alert -> dc_cabinets(547) mastered on ASSET
    675: M_POWER, // te dc_power_distribution_unit.failure -> PDU(548) mastered on POWER
    676: M_POWER, // te dc_power_distribution_unit.failure -> PDU(548) mastered on POWER
    677: M_POWER, // te dc_uninterruptible_power_supply.failover -> UPS(550) mastered on POWER
    678: M_POWER, // te dc_cooling_unit.failure -> cooling(551) mastered on POWER
    679: M_CAP,   // te dc_port_connection.changed -> port_connections(554) mastered on CAP
    680: M_CAP,   // te dc_capacity_plan.refreshed -> capacity_plans(553) mastered on CAP
    681: M_ASSET, // te dc_rack.capacity_threshold_breached -> dc_racks(546) mastered on ASSET
  };
  let o = 0;
  for (const [hid, mid] of Object.entries(outMap)) { await patch(`/handoffs?id=eq.${hid}&source_domain_module_id=is.null`, { source_domain_module_id: mid }); o++; }
  log.push(`handoff FK backfill: ${o} outbound source_module patched (0 inbound)`);
}

console.log("===== DCIM completion =====");
for (const l of log) console.log("  " + l);
