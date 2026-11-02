#!/usr/bin/env bun
// Dissolves ATS-BACKGROUND-CHECKS (module 7), approved by the user on 2026-11-02 (option B). The
// 2026-06-19 BGV build moved ownership of the screening records but left states, handoffs and events
// pointing at module 7. This finishes that move:
//   ATS-OFFERS holds background_checks as an install-optional embedded_master; states, handoffs and
//   events point at their BGV owner; tools, the capability and Legal's reach move to ATS-OFFERS; the
//   module's remaining rows and the module itself are deleted.
// q26 (recruiter_interactions) is NOT part of this script.
// Backs up every row first. record_status is never sent. Each row is checked against its expected
// current value, so a change made by another writer stops the run before any write. Idempotent.
// Dry-run by default; pass --apply to write.
import { existsSync, writeFileSync } from "node:fs";

type Row = Record<string, any>;
const APPLY = process.argv.includes("--apply");
const BACKUP = "backups/ats-dissolve-background-checks-2026-11-02.json";

const OLD_MODULE = 7;
const ATS_OFFERS = 6;
const BGV_DOMAIN = 191;
const BGV_ORDERS = 408;
const BGV_ADJUDICATION = 409;
const BACKGROUND_CHECKS = 12;
const PROCESS_BG_INFO = 1020; // 7.2.5.1 Obtain candidate background information

const STATE_TARGETS: Record<number, number> = {
  190: BGV_ORDERS,
  191: BGV_ORDERS,
  2060: BGV_ORDERS,
  1501: BGV_ADJUDICATION,
  1502: BGV_ADJUDICATION,
  1503: BGV_ADJUDICATION,
  1504: BGV_ADJUDICATION,
  1505: BGV_ADJUDICATION,
  1506: BGV_ADJUDICATION,
};
const EVENT_TO_STATE: Record<number, string> = { 373: "requested", 374: "completed_clear", 375: "completed_consider" };

type HandoffPlan = { side: "source" | "target"; pattern?: string; description?: string; noteStartsWith?: string };
const HANDOFFS: Record<number, HandoffPlan> = {
  401: { side: "source", noteStartsWith: "target_domain_module_id left NULL" },
  402: { side: "source" },
  1068: { side: "target", pattern: "api_call", description: "Offer-accepted triggers contingent background-check workflow.", noteStartsWith: "intra | ATS |" },
  1070: { side: "source", pattern: "api_call", description: "Background-check clearance unblocks pre-employee activation.", noteStartsWith: "intra | ATS |" },
  1071: { side: "source", pattern: "api_call", description: "Flagged background check may force offer rescission; HR/Legal review path.", noteStartsWith: "intra | ATS |" },
  1072: { side: "target", pattern: "event_stream", description: "Rescind cancels any in-flight background check.", noteStartsWith: "intra | ATS |" },
};
const NEW_TAGS = [1068, 1070, 1071, 1072];
const TOOLS_MOVE = [354, 355, 356, 586];
const TOOLS_DELETE = [358, 359];
const CAPABILITY_LINK = 47;
const LEGAL_REACH = 437;
const REACH_DELETE = [412, 429];

async function call(body: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`semantius failed on ${body.method} ${body.path}: ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const get = (path: string) => call({ method: "GET", path });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });
const del = (path: string) => call({ method: "DELETE", path });
const ids = (o: Record<number, unknown>) => Object.keys(o).join(",");

// ---------- read live state ----------
const moduleRows = await get(`/domain_modules?id=eq.${OLD_MODULE}&select=*`);
if (moduleRows.length === 0) {
  console.log(`module ${OLD_MODULE} is already gone; nothing to do.`);
  process.exit(0);
}
if (moduleRows[0].domain_module_code !== "ATS-BACKGROUND-CHECKS") throw new Error(`module ${OLD_MODULE} is ${moduleRows[0].domain_module_code}`);

const states: Row[] = await get(`/data_object_lifecycle_states?id=in.(${ids(STATE_TARGETS)})&select=*`);
const allStatesOnModule: Row[] = await get(`/data_object_lifecycle_states?domain_module_id=eq.${OLD_MODULE}&select=id`);
const events: Row[] = await get(`/trigger_events?id=in.(${ids(EVENT_TO_STATE)})&select=*`);
const handoffs: Row[] = await get(`/handoffs?id=in.(${ids(HANDOFFS)})&select=*`);
const allHandoffsOnModule: Row[] = await get(`/handoffs?or=(source_domain_module_id.eq.${OLD_MODULE},target_domain_module_id.eq.${OLD_MODULE})&select=id`);
const existingTags: Row[] = await get(`/handoff_processes?handoff_id=in.(${Object.keys(HANDOFFS).join(",")})&select=*`);
const tools: Row[] = await get(`/domain_module_tools?domain_module_id=eq.${OLD_MODULE}&select=*`);
const capabilityLinks: Row[] = await get(`/domain_module_capabilities?domain_module_id=eq.${OLD_MODULE}&select=*`);
const reach: Row[] = await get(`/role_modules?domain_module_id=eq.${OLD_MODULE}&select=*`);
const dmdo: Row[] = await get(`/domain_module_data_objects?domain_module_id=eq.${OLD_MODULE}&select=*`);
const offersHolds: Row[] = await get(`/domain_module_data_objects?domain_module_id=eq.${ATS_OFFERS}&data_object_id=eq.${BACKGROUND_CHECKS}&select=*`);
const bgMaster: Row[] = await get(`/domain_module_data_objects?data_object_id=eq.${BACKGROUND_CHECKS}&role=eq.master&select=domain_module_id`);
const offersTools: Row[] = await get(`/domain_module_tools?domain_module_id=eq.${ATS_OFFERS}&select=tool_id`);
const eventsOnModule: Row[] = await get(`/trigger_events?domain_module_id=eq.${OLD_MODULE}&select=id`);

// ---------- guards: stop before any write if the catalog is not what was approved ----------
const problems: string[] = [];
const expectSet = (label: string, actual: number[], expected: number[]) => {
  const a = [...actual].sort((x, y) => x - y).join(",");
  const e = [...expected].sort((x, y) => x - y).join(",");
  if (a !== e) problems.push(`${label}: expected [${e}], found [${a}]`);
};
expectSet("states on module 7", allStatesOnModule.map((r) => r.id), Object.keys(STATE_TARGETS).map(Number));
expectSet("handoffs on module 7", allHandoffsOnModule.map((r) => r.id), Object.keys(HANDOFFS).map(Number));
expectSet("tools on module 7", tools.map((r) => r.id), [...TOOLS_MOVE, ...TOOLS_DELETE]);
expectSet("capability links on module 7", capabilityLinks.map((r) => r.id), [CAPABILITY_LINK]);
expectSet("persona links on module 7", reach.map((r) => r.id), [LEGAL_REACH, ...REACH_DELETE]);
if (dmdo.length !== 12 || dmdo.some((r) => r.role !== "embedded_master")) problems.push(`module 7 entity rows: expected 12 embedded_master, found ${dmdo.length}`);
if (eventsOnModule.length) problems.push(`events on module 7: ${eventsOnModule.map((r) => r.id)}`);
if (offersHolds.length) problems.push(`ATS-OFFERS already holds background_checks: ${JSON.stringify(offersHolds)}`);
if (bgMaster.length !== 1 || bgMaster[0].domain_module_id !== BGV_ORDERS) problems.push(`Rule #11: background_checks master is not exactly BGV-SCREENING-ORDERS: ${JSON.stringify(bgMaster)}`);
for (const t of tools) {
  if (TOOLS_MOVE.includes(t.id) && offersTools.some((o) => o.tool_id === t.tool_id)) problems.push(`tool ${t.tool_id} is already on ATS-OFFERS`);
  if (TOOLS_DELETE.includes(t.id) && !offersTools.some((o) => o.tool_id === t.tool_id)) problems.push(`tool ${t.tool_id} is not on ATS-OFFERS, so deleting row ${t.id} would lose it`);
}
for (const e of events) if (e.to_state !== "" || e.domain_module_id !== null) problems.push(`event ${e.id} is no longer blank: ${JSON.stringify(e)}`);
for (const h of handoffs) {
  const plan = HANDOFFS[h.id];
  if (plan.description && h.description !== "") problems.push(`handoff ${h.id} description is not empty: ${h.description}`);
  if (plan.noteStartsWith && !String(h.notes).startsWith(plan.noteStartsWith)) problems.push(`handoff ${h.id} notes changed: ${h.notes}`);
}
if (problems.length) {
  for (const p of problems) console.error(`  ERROR ${p}`);
  console.error("Stopped. No row was written.");
  process.exit(1);
}

// ---------- plan ----------
console.log("Plan:");
console.log(`  add     ATS-OFFERS / background_checks, embedded_master, is_install_optional=true`);
for (const [id, target] of Object.entries(STATE_TARGETS)) console.log(`  state   ${id}: domain_module_id 7 -> ${target}`);
for (const [id, s] of Object.entries(EVENT_TO_STATE)) console.log(`  event   ${id}: to_state '${s}', domain_module_id ${BGV_ORDERS}`);
for (const [id, p] of Object.entries(HANDOFFS)) {
  console.log(`  handoff ${id}: ${p.side} -> BGV-SCREENING-ORDERS${p.pattern ? `, pattern ${p.pattern}` : ""}${p.description ? `, description "${p.description}"` : ""}${p.noteStartsWith ? ", notes cleared" : ""}`);
}
for (const id of NEW_TAGS) console.log(`  tag     handoff ${id} -> process ${PROCESS_BG_INFO}`);
console.log(`  tools   move ${TOOLS_MOVE} to ATS-OFFERS; delete ${TOOLS_DELETE}`);
console.log(`  cap     link ${CAPABILITY_LINK} to ATS-OFFERS`);
console.log(`  reach   ${LEGAL_REACH} to ATS-OFFERS as secondary; delete ${REACH_DELETE}`);
console.log(`  delete  ${dmdo.length} entity rows on module 7, then module 7`);

if (!APPLY) {
  console.log("\nDry run. All guards passed. Pass --apply to write.");
  process.exit(0);
}

// ---------- backup ----------
if (!existsSync(BACKUP)) {
  writeFileSync(BACKUP, JSON.stringify({ taken_at: new Date().toISOString(), module: moduleRows, states, events, handoffs, existingTags, tools, capabilityLinks, reach, dmdo }, null, 2));
  console.log(`\nbackup ${BACKUP}`);
}

// ---------- writes ----------
await call({ method: "POST", path: "/domain_module_data_objects", body: [{ domain_module_id: ATS_OFFERS, data_object_id: BACKGROUND_CHECKS, role: "embedded_master", is_install_optional: true }] });
for (const [id, target] of Object.entries(STATE_TARGETS)) await patch(`/data_object_lifecycle_states?id=eq.${id}`, { domain_module_id: target });
for (const [id, s] of Object.entries(EVENT_TO_STATE)) await patch(`/trigger_events?id=eq.${id}`, { to_state: s, domain_module_id: BGV_ORDERS });
for (const [id, p] of Object.entries(HANDOFFS)) {
  const body: Row = p.side === "source"
    ? { source_domain_id: BGV_DOMAIN, source_domain_module_id: BGV_ORDERS }
    : { target_domain_id: BGV_DOMAIN, target_domain_module_id: BGV_ORDERS };
  if (p.pattern) body.integration_pattern = p.pattern;
  if (p.description) body.description = p.description;
  if (p.noteStartsWith) body.notes = "";
  await patch(`/handoffs?id=eq.${id}`, body);
}
const tagged = new Set(existingTags.filter((t) => t.process_id === PROCESS_BG_INFO).map((t) => t.handoff_id));
const tagRows = NEW_TAGS.filter((id) => !tagged.has(id)).map((id) => ({ handoff_id: id, process_id: PROCESS_BG_INFO, role: "implements", proposal_source: "agent_curated" }));
if (tagRows.length) await call({ method: "POST", path: "/handoff_processes", body: tagRows });
await patch(`/domain_module_tools?id=in.(${TOOLS_MOVE.join(",")})`, { domain_module_id: ATS_OFFERS });
await del(`/domain_module_tools?id=in.(${TOOLS_DELETE.join(",")})`);
await patch(`/domain_module_capabilities?id=eq.${CAPABILITY_LINK}`, { domain_module_id: ATS_OFFERS });
await patch(`/role_modules?id=eq.${LEGAL_REACH}`, { domain_module_id: ATS_OFFERS, interaction_level: "secondary" });
await del(`/role_modules?id=in.(${REACH_DELETE.join(",")})`);
await del(`/domain_module_data_objects?domain_module_id=eq.${OLD_MODULE}`);

// Nothing may still reference the module before it goes.
const leftovers: Record<string, any[]> = {
  states: await get(`/data_object_lifecycle_states?domain_module_id=eq.${OLD_MODULE}&select=id`),
  events: await get(`/trigger_events?domain_module_id=eq.${OLD_MODULE}&select=id`),
  handoffs: await get(`/handoffs?or=(source_domain_module_id.eq.${OLD_MODULE},target_domain_module_id.eq.${OLD_MODULE})&select=id`),
  tools: await get(`/domain_module_tools?domain_module_id=eq.${OLD_MODULE}&select=id`),
  capabilities: await get(`/domain_module_capabilities?domain_module_id=eq.${OLD_MODULE}&select=id`),
  reach: await get(`/role_modules?domain_module_id=eq.${OLD_MODULE}&select=id`),
  dmdo: await get(`/domain_module_data_objects?domain_module_id=eq.${OLD_MODULE}&select=id`),
};
const stuck = Object.entries(leftovers).filter(([, r]) => r.length);
if (stuck.length) {
  console.error(`Module ${OLD_MODULE} NOT deleted, rows still reference it: ${JSON.stringify(stuck)}`);
  process.exit(1);
}
await del(`/domain_modules?id=eq.${OLD_MODULE}`);

// ---------- read back ----------
console.log("\nRead back:");
const fail: string[] = [];
const moduleAfter = await get(`/domain_modules?id=eq.${OLD_MODULE}&select=id`);
if (moduleAfter.length) fail.push("module 7 still exists");
const offersAfter = await get(`/domain_module_data_objects?domain_module_id=eq.${ATS_OFFERS}&data_object_id=eq.${BACKGROUND_CHECKS}&select=*`);
console.log(`  ATS-OFFERS row: ${offersAfter[0]?.domain_module_data_object_label} role=${offersAfter[0]?.role} optional=${offersAfter[0]?.is_install_optional}`);
if (offersAfter[0]?.role !== "embedded_master" || offersAfter[0]?.is_install_optional !== true) fail.push("ATS-OFFERS row is wrong");
for (const s of await get(`/data_object_lifecycle_states?id=in.(${ids(STATE_TARGETS)})&select=id,state_name,domain_module_id`)) {
  if (s.domain_module_id !== STATE_TARGETS[s.id]) fail.push(`state ${s.id} is on ${s.domain_module_id}`);
}
for (const e of await get(`/trigger_events?id=in.(${ids(EVENT_TO_STATE)})&select=id,event_name,to_state,domain_module_id`)) {
  console.log(`  event ${e.id} ${e.event_name}: to_state=${e.to_state} module=${e.domain_module_id}`);
  if (e.to_state !== EVENT_TO_STATE[e.id]) fail.push(`event ${e.id} to_state ${e.to_state}`);
}
for (const h of await get(`/handoffs?id=in.(${ids(HANDOFFS)})&select=id,handoff_label,key,source_domain_module_id,target_domain_module_id,integration_pattern,description,notes`)) {
  console.log(`  handoff ${h.id}: ${h.handoff_label} | key=${h.key} | ${h.integration_pattern} | notes=${JSON.stringify(h.notes)}`);
  const p = HANDOFFS[h.id];
  if ((p.side === "source" ? h.source_domain_module_id : h.target_domain_module_id) !== BGV_ORDERS) fail.push(`handoff ${h.id} not on BGV`);
  if (p.noteStartsWith && h.notes !== "") fail.push(`handoff ${h.id} notes not cleared`);
}
console.log(`  tags: ${(await get(`/handoff_processes?handoff_id=in.(${NEW_TAGS.join(",")})&select=handoff_id,process_id,record_status`)).map((t: Row) => `${t.handoff_id}->${t.process_id}(${t.record_status})`).join(", ")}`);
console.log(`  tools on ATS-OFFERS: ${(await get(`/domain_module_tools?domain_module_id=eq.${ATS_OFFERS}&select=key`)).map((t: Row) => t.key).join(", ")}`);
console.log(`  capability: ${(await get(`/domain_module_capabilities?id=eq.${CAPABILITY_LINK}&select=domain_module_capability_label,domain_module_id`)).map((r: Row) => `${r.domain_module_capability_label} (module ${r.domain_module_id})`)}`);
console.log(`  reach: ${(await get(`/role_modules?id=eq.${LEGAL_REACH}&select=role_module_label,domain_module_id,interaction_level`)).map((r: Row) => `${r.role_module_label} (module ${r.domain_module_id}, ${r.interaction_level})`)}`);
if (fail.length) {
  for (const f of fail) console.error(`  FAILED ${f}`);
  process.exit(1);
}
console.log("\nok. https://domain-map.semantius.app/domain_map/domain_modules");
