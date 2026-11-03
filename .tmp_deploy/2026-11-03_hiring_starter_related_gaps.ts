#!/usr/bin/env bun
// Applies the decisions on the gaps found while fixing bugs 1 and 32 of
// audits/ATS/hiring-starter-blueprint-review-2026-11-03.md, approved by the user on 2026-11-03.
//   backing out: new terminal state job_offers.reneged, next state_order, so nothing is renumbered.
//   reapplying:  candidates.hired (206) is no longer terminal, and its description says how a person comes back.
//   do not hire: HIRING-STARTER Additional Requirements gain the rule that blocks the hire, not the application.
//   status list: job_offers.description no longer lists statuses; section 7 of the blueprint shows them.
// Existing rows are checked against their expected values before any write and backed up to backups/ first.
// record_status and notes are never sent. Idempotent. Dry-run by default; pass --apply to write.
import { writeFileSync, existsSync } from "node:fs";
import { preflightAuthoredText, preflightLifecycleStates } from "../scripts/lib/catalog_invariants.ts";

type Row = Record<string, any>;
type Edit = { table: string; id: number; key: string; keyColumn: string; column: string; from: unknown; to: unknown };
const APPLY = process.argv.includes("--apply");
const BACKUP = "backups/hiring-starter-related-gaps-2026-11-03.json";
const STATES = "data_object_lifecycle_states";
const LABEL = "data_object_lifecycle_state_label";
const OLD_REQUIREMENTS = "Hiring manager access to candidates. A `candidates` row has no relationship leading to its hiring manager, so the row-scope rule cannot admit them. As a workaround, under `access_scope: raci` the `HIRING-MANAGER` persona holds `hiring-starter:view_all_candidates`.";

const EDITS: Edit[] = [
  { table: STATES, id: 206, keyColumn: LABEL, key: "candidates.hired", column: "is_terminal", from: true, to: false },
  {
    table: STATES, id: 206, keyColumn: LABEL, key: "candidates.hired", column: "description",
    from: "Candidate accepted an offer and converted to employee.",
    to: "Candidate accepted an offer and converted to employee; a new application moves the person back to active.",
  },
  {
    table: "data_objects", id: 11, keyColumn: "data_object_name", key: "job_offers", column: "description",
    from: "Formal employment offer extended to a candidate. Carries compensation components, start date, terms, approval, and status (draft / approved / sent / accepted / declined / rescinded).",
    to: "Formal employment offer extended to a candidate. Carries compensation components, start date, terms, approval, and status.",
  },
  {
    table: "domain_modules", id: 154, keyColumn: "domain_module_code", key: "HIRING-STARTER", column: "specification_requirements",
    from: OLD_REQUIREMENTS,
    to: `${OLD_REQUIREMENTS}\n\nDo-not-hire candidates. A new application for a \`do_not_hire\` candidate is accepted, so the person is not told they are flagged, and the candidate stays \`do_not_hire\`. The application cannot move to \`hired\` while the candidate is \`do_not_hire\`.`,
  },
];

const NEW_STATE: Row = {
  data_object_id: 11, state_name: "reneged", state_order: 10, is_initial: false, is_terminal: true,
  requires_permission: false, permission_verb_override: "", domain_module_id: null,
  description: "Candidate backed out after accepting the offer.",
};

async function pg(body: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`postgrestRequest failed: ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const rowKey = (table: string, id: number) => `${table}#${id}`;
const targets = [...new Map(EDITS.map((e) => [rowKey(e.table, e.id), e])).values()];
async function readAll(): Promise<Map<string, Row>> {
  const out = new Map<string, Row>();
  for (const t of targets) out.set(rowKey(t.table, t.id), (await pg({ method: "GET", path: `/${t.table}?id=eq.${t.id}&select=*` }))[0]);
  return out;
}
const offerStates = (): Promise<Row[]> => pg({ method: "GET", path: `/${STATES}?data_object_id=eq.11&select=*&order=state_order.asc` });

const before = await readAll();
const offersBefore = await offerStates();
const problems: string[] = [];

const pending = EDITS.filter((e) => {
  const row = before.get(rowKey(e.table, e.id));
  if (!row || row[e.keyColumn] !== e.key) {
    problems.push(`${e.table} ${e.id} is not ${e.key}: ${JSON.stringify(row?.[e.keyColumn])}`);
    return false;
  }
  if (row[e.column] === e.to) {
    console.log(`  done     ${e.key}.${e.column}`);
    return false;
  }
  if (row[e.column] !== e.from) {
    problems.push(`${e.key}.${e.column} holds an unexpected value: ${row[e.column]}`);
    return false;
  }
  console.log(`  pending  ${e.key}.${e.column}\n    old: ${e.from}\n    new: ${e.to}`);
  return true;
});

const existing = offersBefore.find((r) => r.state_name === NEW_STATE.state_name);
const orderTaken = offersBefore.find((r) => r.state_order === NEW_STATE.state_order && r.state_name !== NEW_STATE.state_name);
if (orderTaken) problems.push(`state_order ${NEW_STATE.state_order} is taken by ${orderTaken[LABEL]}`);
if (existing) {
  for (const k of Object.keys(NEW_STATE)) if (existing[k] !== NEW_STATE[k]) problems.push(`job_offers.reneged.${k} holds an unexpected value: ${existing[k]}`);
  console.log("  done     job_offers.reneged");
} else {
  console.log(`  pending  insert job_offers.reneged (order ${NEW_STATE.state_order}): ${NEW_STATE.description}`);
}

const shape = preflightLifecycleStates([{ ...NEW_STATE, id: "job_offers.reneged" }] as any);
for (const err of shape.errors) problems.push(typeof err === "string" ? err : JSON.stringify(err));
const text = preflightAuthoredText(EDITS.filter((e) => typeof e.to === "string").map((e) => ({ id: e.id, [e.column]: e.to })), { table: "related_gaps" });
for (const err of text.errors) problems.push(typeof err === "string" ? err : JSON.stringify(err));
for (const s of [...EDITS.map((e) => e.to), NEW_STATE.description]) {
  if (typeof s === "string" && s.includes(String.fromCharCode(0x2014))) problems.push(`contains an em-dash: ${s}`);
}
if (problems.length > 0) {
  console.error(`refusing to write:\n${problems.join("\n")}`);
  process.exit(1);
}

if (!APPLY) {
  console.log("\nDry run. Pass --apply to write.");
  process.exit(0);
}

if (!existsSync(BACKUP)) {
  writeFileSync(BACKUP, JSON.stringify({ taken_at: new Date().toISOString(), rows: [...before.entries()].map(([key, row]) => ({ key, row })) }, null, 2));
}

for (const t of targets) {
  const body = Object.fromEntries(pending.filter((e) => e.table === t.table && e.id === t.id).map((e) => [e.column, e.to]));
  if (Object.keys(body).length > 0) await pg({ method: "PATCH", path: `/${t.table}?id=eq.${t.id}`, body });
}
if (!existing) await pg({ method: "POST", path: `/${STATES}`, body: [NEW_STATE] });

// Verify: every row holds the new values, no other column moved, and the offer lifecycle keeps its shape.
const after = await readAll();
const offersAfter = await offerStates();
const failed: string[] = [];
for (const e of EDITS) {
  const row = after.get(rowKey(e.table, e.id))!;
  if (row[e.column] !== e.to) failed.push(`${e.key}.${e.column} is ${row[e.column]}`);
}
for (const t of targets) {
  const key = rowKey(t.table, t.id);
  const edited = new Set(EDITS.filter((e) => e.table === t.table && e.id === t.id).map((e) => e.column));
  for (const k of Object.keys(before.get(key)!)) {
    if (k === "updated_at" || k === "search_vector" || edited.has(k)) continue;
    if (JSON.stringify(after.get(key)![k]) !== JSON.stringify(before.get(key)![k])) failed.push(`${key}.${k} changed`);
  }
  console.log(`  ok  ${t.key}: record_status ${after.get(key)!.record_status}`);
}
for (const row of offersBefore) {
  const now = offersAfter.find((r) => r.id === row.id);
  if (!now || JSON.stringify({ ...now, updated_at: 0, search_vector: 0 }) !== JSON.stringify({ ...row, updated_at: 0, search_vector: 0 })) failed.push(`state ${row.id} changed`);
}
const reneged = offersAfter.find((r) => r.state_name === "reneged");
if (!reneged) failed.push("job_offers.reneged was not inserted");
else {
  for (const k of Object.keys(NEW_STATE)) if (reneged[k] !== NEW_STATE[k]) failed.push(`job_offers.reneged.${k} is ${reneged[k]}`);
  if (reneged[LABEL] !== "job_offers.reneged") failed.push(`job_offers.reneged has label ${JSON.stringify(reneged[LABEL])}`);
  if (reneged.record_status !== "new") failed.push(`job_offers.reneged has record_status ${reneged.record_status}`);
  console.log(`  ok  job_offers.reneged: id ${reneged.id}, record_status ${reneged.record_status}`);
}
if (offersAfter.filter((s) => s.is_initial).length !== 1) failed.push("job_offers does not have exactly one initial state");
if (new Set(offersAfter.map((s) => s.state_order)).size !== offersAfter.length) failed.push("job_offers has a duplicate state_order");
if (failed.length > 0) {
  console.error(`did not verify:\n${failed.join("\n")}`);
  process.exit(1);
}
console.log("https://domain-map.semantius.app/domain_map/data_object_lifecycle_states");
