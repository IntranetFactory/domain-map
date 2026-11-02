#!/usr/bin/env bun
// Applies three items the user approved on 2026-11-02:
//   q5    B2-E4D-SUBMIT-SCORECARD: stop gating interview_scorecards.submitted (state 210)
//   q8 a  B2-B9C-EVENT-REPOINTS: all four event fixes (62, 81, 365, 368 / 369)
//   1.4   "fix 1.4" from the Hiring Starter review: headcount approval was both received and published
//         on one event. SWP gets its own event on headcount_plans.approved and handoffs 14 and 1149
//         move to it; ATS event 62 keeps only handoff 406, whose text is reworded.
// Only those fields are written. Every row must still hold its expected value or the run stops before
// any write. Backs up affected rows to backups/ first. record_status is never sent. Idempotent.
// Dry-run by default; pass --apply to write.
import { writeFileSync, existsSync } from "node:fs";
import { preflightHandoffs, preflightLifecycleStates, preflightTriggerEvents } from "../scripts/lib/catalog_invariants.ts";

type Row = Record<string, any>;
const APPLY = process.argv.includes("--apply");
const BACKUP = "backups/ats-q5-q8-headcount-2026-11-02.json";

async function semantius(tool: string, body: unknown): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`semantius ${tool} failed: ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const pg = (body: Row) => semantius("postgrestRequest", body);
const get = (path: string) => pg({ method: "GET", path });

const STATES = "data_object_lifecycle_states";
const EVENTS = "trigger_events";
const HANDOFFS = "handoffs";
const HEADCOUNT_PLANS = 24;
const TALENT_POOLS = 7;
const TALENT_POOL_MEMBERSHIPS = 871;
const OFFER_ACCEPTED = 80;
const OFFER_SIGNED = 81;
const HEADCOUNT_APPROVED = 62;

const NEW_EVENT = {
  event_name: "headcount_plan.approved",
  data_object_id: HEADCOUNT_PLANS,
  event_category: "state_change",
  from_state: "draft",
  to_state: "approved",
  description: "A headcount plan is approved in workforce planning. Authorizes recruiting to open requisitions against it and refreshes workforce cost projections.",
};
const H406_OLD = "Headcount approval (often originating from HCM/SWP) confirmed back to HCM; gives ATS green light to source.";
const H406_NEW = "Requisition approved and opened for recruiting in ATS; confirms to HCM that the approved headcount is now being recruited against.";

const existingNew: Row[] = await get(`/${EVENTS}?event_name=eq.${NEW_EVENT.event_name}&select=*`);
const collisions = existingNew.filter((e) => e.data_object_id !== HEADCOUNT_PLANS);
if (collisions.length > 0) throw new Error(`event ${NEW_EVENT.event_name} already exists on another entity: ${JSON.stringify(collisions)}`);
let newEventId: number = existingNew[0]?.id ?? -1;

type Change = { table: string; id: number; expect: Row; set: Row; why: string };
const buildChanges = (eventId: number): Change[] => [
  { table: STATES, id: 210, expect: { requires_permission: true }, set: { requires_permission: false }, why: "q5 stop gating scorecard submission" },
  { table: EVENTS, id: HEADCOUNT_APPROVED, expect: { to_state: "approved", from_state: "" }, set: { to_state: "open", from_state: "pending_approval" }, why: "q8 lands on the requisition's open state" },
  { table: HANDOFFS, id: 121, expect: { trigger_event_id: OFFER_SIGNED }, set: { trigger_event_id: OFFER_ACCEPTED }, why: "q8 offer signed becomes offer accepted" },
  { table: HANDOFFS, id: 398, expect: { trigger_event_id: OFFER_SIGNED }, set: { trigger_event_id: OFFER_ACCEPTED }, why: "q8 offer signed becomes offer accepted" },
  { table: EVENTS, id: 365, expect: { event_category: "lifecycle" }, set: { event_category: "signal" }, why: "q8 recruitment sources have no lifecycle" },
  { table: EVENTS, id: 368, expect: { data_object_id: TALENT_POOLS, to_state: "" }, set: { data_object_id: TALENT_POOL_MEMBERSHIPS, to_state: "cold" }, why: "q8 adding to a pool changes the membership" },
  { table: EVENTS, id: 369, expect: { data_object_id: TALENT_POOLS, to_state: "" }, set: { data_object_id: TALENT_POOL_MEMBERSHIPS, to_state: "hot" }, why: "q8 activating changes the membership" },
  { table: HANDOFFS, id: 14, expect: { trigger_event_id: HEADCOUNT_APPROVED }, set: { trigger_event_id: eventId }, why: "1.4 SWP publishes its own event" },
  { table: HANDOFFS, id: 1149, expect: { trigger_event_id: HEADCOUNT_APPROVED }, set: { trigger_event_id: eventId }, why: "1.4 SWP publishes its own event" },
  { table: HANDOFFS, id: 406, expect: { description: H406_OLD }, set: { description: H406_NEW }, why: "1.4 ATS is the only publisher of event 62" },
];

const matches = (row: Row, want: Row) => Object.entries(want).every(([k, v]) => row[k] === v);

// Read every row and classify it. Any row holding neither the old nor the new value stops the run.
const changes = buildChanges(newEventId);
const before = new Map<string, Row>();
const pending: Change[] = [];
for (const c of changes) {
  const [row] = (await get(`/${c.table}?id=eq.${c.id}&select=*`)) as Row[];
  if (!row) throw new Error(`${c.table} ${c.id} not found`);
  before.set(`${c.table}:${c.id}`, row);
  if (matches(row, c.set)) {
    console.log(`  done     ${c.table} ${c.id}: ${c.why}`);
  } else if (matches(row, c.expect)) {
    pending.push(c);
    console.log(`  pending  ${c.table} ${c.id}: ${JSON.stringify(c.expect)} -> ${JSON.stringify(c.set)} (${c.why})`);
  } else {
    throw new Error(`${c.table} ${c.id} changed since it was read: expected ${JSON.stringify(c.expect)}, found ${JSON.stringify(Object.fromEntries(Object.keys(c.expect).map((k) => [k, row[k]])))}`);
  }
}
const [signed] = (await get(`/${EVENTS}?id=eq.${OFFER_SIGNED}&select=*`)) as Row[];
console.log(signed ? `  pending  ${EVENTS} ${OFFER_SIGNED}: delete ${signed.event_name} after its handoffs move` : `  done     ${EVENTS} ${OFFER_SIGNED}: already deleted`);
console.log(newEventId === -1 ? `  pending  ${EVENTS} new: insert ${NEW_EVENT.event_name}` : `  done     ${EVENTS} ${newEventId}: ${NEW_EVENT.event_name} exists`);

// Shared shape checks, on the rows as they will be after this run.
const objectIds = [HEADCOUNT_PLANS, 1, 5, TALENT_POOL_MEMBERSHIPS];
const lifecycle: Row[] = await get(`/${STATES}?data_object_id=in.(${objectIds.join(",")})&select=id,data_object_id,state_name,requires_permission,permission_verb_override,process_id,domain_module_id`);
const after = (table: string, id: number): Row => {
  const c = changes.find((x) => x.table === table && x.id === id);
  return { ...before.get(`${table}:${id}`), ...(c?.set ?? {}) };
};
const eventsAfter = [NEW_EVENT, after(EVENTS, HEADCOUNT_APPROVED), after(EVENTS, 365), after(EVENTS, 368), after(EVENTS, 369)] as any[];
const moved = [14, 1149, 121, 398, 406].map((id) => after(HANDOFFS, id)) as any[];
const eventIdsForPeers = [...new Set(moved.map((h) => h.trigger_event_id))].filter((id) => id > 0);
const peers: Row[] = await get(`/${HANDOFFS}?trigger_event_id=in.(${eventIdsForPeers.join(",")})&select=id,trigger_event_id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,data_object_id`);
const movedIds = new Set(moved.map((h) => h.id));
const preflights = [
  preflightTriggerEvents(eventsAfter, lifecycle as any[]),
  preflightHandoffs(moved, peers.filter((p) => !movedIds.has(p.id)) as any[]),
  preflightLifecycleStates([after(STATES, 210)] as any[]),
];
for (const p of preflights) for (const w of p.warnings) console.log(`  warn ${typeof w === "string" ? w : JSON.stringify(w)}`);
const errors = preflights.flatMap((p) => p.errors);
if (errors.length > 0) {
  for (const e of errors) console.error(`  ERROR ${typeof e === "string" ? e : JSON.stringify(e)}`);
  process.exit(1);
}

if (!APPLY) {
  console.log("\nDry run. Pass --apply to write.");
  process.exit(0);
}

if (!existsSync(BACKUP)) {
  writeFileSync(BACKUP, JSON.stringify({ taken_at: new Date().toISOString(), rows: Object.fromEntries(before), deleted_event: signed ?? null }, null, 2));
  console.log(`\nBacked up to ${BACKUP}`);
}

if (newEventId === -1) {
  await pg({ method: "POST", path: `/${EVENTS}`, body: [NEW_EVENT] });
  const [created] = (await get(`/${EVENTS}?event_name=eq.${NEW_EVENT.event_name}&select=id`)) as Row[];
  if (!created) throw new Error(`insert of ${NEW_EVENT.event_name} returned no row`);
  newEventId = created.id;
  console.log(`  inserted ${EVENTS} ${newEventId}: ${NEW_EVENT.event_name}`);
}

const final = buildChanges(newEventId);
for (const c of final) {
  if (!pending.some((p) => p.table === c.table && p.id === c.id)) continue;
  await pg({ method: "PATCH", path: `/${c.table}?id=eq.${c.id}`, body: c.set });
  console.log(`  patched  ${c.table} ${c.id}: ${c.why}`);
}

if (signed) {
  const left: Row[] = await get(`/${HANDOFFS}?trigger_event_id=eq.${OFFER_SIGNED}&select=id`);
  if (left.length > 0) throw new Error(`event ${OFFER_SIGNED} still has handoffs ${left.map((h) => h.id).join(", ")}; not deleting`);
  await pg({ method: "DELETE", path: `/${EVENTS}?id=eq.${OFFER_SIGNED}` });
  console.log(`  deleted  ${EVENTS} ${OFFER_SIGNED}: ${signed.event_name}`);
}

// Read back every written row. The computed key and label on the moved handoffs must follow the FK.
let bad = 0;
for (const c of final) {
  const [row] = (await get(`/${c.table}?id=eq.${c.id}&select=*`)) as Row[];
  const ok = matches(row, c.set);
  if (!ok) bad++;
  const extra = c.table === HANDOFFS ? ` key=${row.key} label="${row.handoff_label}"` : "";
  console.log(`  ${ok ? "ok " : "BAD"} ${c.table} ${c.id}${extra}`);
}
const gone: Row[] = await get(`/${EVENTS}?id=eq.${OFFER_SIGNED}&select=id`);
if (gone.length > 0) bad++;
console.log(`  ${gone.length === 0 ? "ok " : "BAD"} ${EVENTS} ${OFFER_SIGNED} deleted`);
if (bad > 0) {
  console.error(`\n${bad} row(s) did not verify.`);
  process.exit(1);
}
console.log("\nAll rows verified.");
console.log("https://tests.semantius.app/domain_map/trigger_events");
console.log("https://tests.semantius.app/domain_map/handoffs");
console.log("https://tests.semantius.app/domain_map/data_object_lifecycle_states");
