#!/usr/bin/env bun
// Applies the fix for bug-73 of audits/ATS/hiring-starter-blueprint-review-2026-11-03.md, approved by the user on 2026-11-03.
//   process_raci row 20: RECRUITING-COORDINATOR on interview_candidates, informed -> responsible.
//   interviews states 211-216: process_id empty -> 1014, so the process covers the interview work and not
//   only the scorecard's `submitted` state.
// Existing rows are checked against their expected values before any write and backed up to backups/ first.
// record_status is never sent. Idempotent. Dry-run by default; pass --apply to write.
import { writeFileSync, existsSync } from "node:fs";

type Row = Record<string, any>;
const APPLY = process.argv.includes("--apply");
const BACKUP = "backups/bug73-coordinator-responsible-2026-11-03.json";
const PROCESS = 1014;
const COORDINATOR = 8;
const INTERVIEWS = 8;
const RACI_ROW = 20;
const STATES: Record<number, string> = { 211: "scheduled", 212: "confirmed", 213: "completed", 214: "no_show", 215: "canceled", 216: "rescheduled" };
const STATE_IDS = Object.keys(STATES).map(Number);

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
const readRaci = async (): Promise<Row> => {
  const rows: Row[] = await pg({ method: "GET", path: `/process_raci?id=eq.${RACI_ROW}&select=*` });
  if (rows.length !== 1) throw new Error(`process_raci ${RACI_ROW} not found`);
  return rows[0];
};
const readStates = async (): Promise<Map<number, Row>> => {
  const rows: Row[] = await pg({ method: "GET", path: `/data_object_lifecycle_states?id=in.(${STATE_IDS.join(",")})&select=*&order=id` });
  return new Map(rows.map((r) => [Number(r.id), r]));
};

const raciBefore = await readRaci();
if (raciBefore.process_id !== PROCESS || raciBefore.persona_id !== COORDINATOR) throw new Error(`process_raci ${RACI_ROW} is not the coordinator on ${PROCESS}: ${JSON.stringify(raciBefore)}`);
if (raciBefore.raci !== "informed" && raciBefore.raci !== "responsible") throw new Error(`process_raci ${RACI_ROW} is not in the expected state: ${raciBefore.raci}`);
const raciPending = raciBefore.raci === "informed";
console.log(`  ${raciPending ? "pending" : "done   "}  process_raci ${RACI_ROW} "${raciBefore.process_raci_label}"${raciPending ? ": informed -> responsible" : ""}`);

const statesBefore = await readStates();
const statesPending: number[] = [];
for (const id of STATE_IDS) {
  const s = statesBefore.get(id);
  if (!s) throw new Error(`state ${id} not found`);
  if (s.data_object_id !== INTERVIEWS || s.state_name !== STATES[id]) throw new Error(`state ${id} is not interviews.${STATES[id]}: ${JSON.stringify(s)}`);
  if (s.requires_permission) throw new Error(`state ${id} is gated, which this fix does not expect`);
  if (s.process_id === PROCESS) {
    console.log(`  done     state ${id} ${s.state_name}`);
  } else if (s.process_id == null) {
    statesPending.push(id);
    console.log(`  pending  state ${id} ${s.state_name}: process_id empty -> ${PROCESS}`);
  } else {
    throw new Error(`state ${id} already has process_id ${s.process_id}; filling it would overwrite a value`);
  }
}

if (!APPLY) {
  console.log("\nDry run. Pass --apply to write.");
  process.exit(0);
}

if (!existsSync(BACKUP)) {
  writeFileSync(BACKUP, JSON.stringify({ taken_at: new Date().toISOString(), process_raci: [raciBefore], data_object_lifecycle_states: [...statesBefore.values()] }, null, 2));
}

if (raciPending) await pg({ method: "PATCH", path: `/process_raci?id=eq.${RACI_ROW}`, body: { raci: "responsible" } });
for (const id of statesPending) await pg({ method: "PATCH", path: `/data_object_lifecycle_states?id=eq.${id}`, body: { process_id: PROCESS } });

// Verify: each row holds its new value, and no other column moved.
const IGNORE = new Set(["updated_at", "search_vector", "process_raci_label"]);
const problems: string[] = [];
const compare = (name: string, b: Row, a: Row, changed: string) => {
  for (const k of Object.keys(b)) {
    if (k === changed || IGNORE.has(k)) continue;
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) problems.push(`${name}: ${k} changed`);
  }
};
const raciAfter = await readRaci();
if (raciAfter.raci !== "responsible") problems.push(`process_raci ${RACI_ROW}: raci is ${raciAfter.raci}`);
compare(`process_raci ${RACI_ROW}`, raciBefore, raciAfter, "raci");
const statesAfter = await readStates();
for (const id of STATE_IDS) {
  const a = statesAfter.get(id)!;
  if (a.process_id !== PROCESS) problems.push(`state ${id}: process_id is ${a.process_id}`);
  compare(`state ${id}`, statesBefore.get(id)!, a, "process_id");
}
if (problems.length > 0) {
  console.error(`did not verify:\n${problems.join("\n")}`);
  process.exit(1);
}

console.log(`  ok  process_raci ${raciAfter.id} "${raciAfter.process_raci_label}": raci ${raciAfter.raci}, updated ${raciAfter.updated_at}`);
for (const id of STATE_IDS) {
  const a = statesAfter.get(id)!;
  console.log(`  ok  state ${id} ${a.state_name}: process_id ${a.process_id}, record_status ${a.record_status}, updated ${a.updated_at}`);
}
console.log("https://domain-map.semantius.app/domain_map/process_raci");
