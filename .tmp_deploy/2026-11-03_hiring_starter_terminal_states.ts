#!/usr/bin/env bun
// Applies the lifecycle decisions for bugs 1, 32 and 34 of audits/ATS/hiring-starter-blueprint-review-2026-11-03.md,
// approved by the user on 2026-11-03.
//   bug-1:  job_offers.accepted (228) is no longer terminal, rescinded (230) names accepted offers, new terminal state completed.
//   bug-32: candidates.archived (208) is no longer terminal, and its description says how a candidate comes back.
//   bug-34: new terminal state job_offers.canceled for an offer abandoned before it was sent.
// The new states take the next state_order values, so no existing row is renumbered and every new move runs forward.
// Existing rows are checked against their expected values before any write and backed up to backups/ first.
// record_status and notes are never sent. Idempotent. Dry-run by default; pass --apply to write.
import { writeFileSync, existsSync } from "node:fs";
import { preflightAuthoredText, preflightLifecycleStates } from "../scripts/lib/catalog_invariants.ts";

type Row = Record<string, any>;
const APPLY = process.argv.includes("--apply");
const BACKUP = "backups/hiring-starter-terminal-states-2026-11-03.json";
const TABLE = "data_object_lifecycle_states";
const OBJECTS = [3, 11]; // candidates, job_offers
const LABEL = "data_object_lifecycle_state_label";

const EDITS: { id: number; key: string; column: string; from: unknown; to: unknown }[] = [
  { id: 228, key: "job_offers.accepted", column: "is_terminal", from: true, to: false },
  {
    id: 230, key: "job_offers.rescinded", column: "description",
    from: "Offer withdrawn by the employer after being sent; gated action.",
    to: "Offer withdrawn by the employer after being sent or accepted; gated action.",
  },
  { id: 208, key: "candidates.archived", column: "is_terminal", from: true, to: false },
  {
    id: 208, key: "candidates.archived", column: "description",
    from: "Candidate kept in the database but not active in any pipeline.",
    to: "Candidate kept in the database but not active in any pipeline; a new application moves the candidate back to active.",
  },
];

const INSERTS: Row[] = [
  {
    data_object_id: 11, state_name: "completed", state_order: 8, is_initial: false, is_terminal: true,
    requires_permission: false, permission_verb_override: "", domain_module_id: null,
    description: "Candidate was hired and the offer is closed; no further changes.",
  },
  {
    data_object_id: 11, state_name: "canceled", state_order: 9, is_initial: false, is_terminal: true,
    requires_permission: false, permission_verb_override: "", domain_module_id: null,
    description: "Offer abandoned before it was sent.",
  },
];

async function pg(body: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`postgrestRequest failed: ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const readAll = async (): Promise<Row[]> =>
  pg({ method: "GET", path: `/${TABLE}?data_object_id=in.(${OBJECTS.join(",")})&select=*&order=data_object_id.asc,state_order.asc` });

const before = await readAll();
const byId = new Map(before.map((r) => [r.id, r]));
const problems: string[] = [];

const pendingEdits = EDITS.filter((e) => {
  const row = byId.get(e.id);
  if (!row || row[LABEL] !== e.key) {
    problems.push(`state ${e.id} is not ${e.key}: ${JSON.stringify(row?.[LABEL])}`);
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

const pendingInserts = INSERTS.filter((n) => {
  const same = before.find((r) => r.data_object_id === n.data_object_id && r.state_name === n.state_name);
  const orderTaken = before.find((r) => r.data_object_id === n.data_object_id && r.state_order === n.state_order && r.state_name !== n.state_name);
  if (orderTaken) problems.push(`state_order ${n.state_order} is taken by ${orderTaken[LABEL]}`);
  if (same) {
    for (const k of Object.keys(n)) if (same[k] !== n[k]) problems.push(`job_offers.${n.state_name}.${k} holds an unexpected value: ${same[k]}`);
    console.log(`  done     job_offers.${n.state_name}`);
    return false;
  }
  console.log(`  pending  insert job_offers.${n.state_name} (order ${n.state_order}): ${n.description}`);
  return true;
});

const shape = preflightLifecycleStates(INSERTS.map((n) => ({ ...n, id: `job_offers.${n.state_name}` })) as any);
for (const err of shape.errors) problems.push(typeof err === "string" ? err : JSON.stringify(err));
const text = preflightAuthoredText(EDITS.filter((e) => typeof e.to === "string").map((e) => ({ id: e.id, [e.column]: e.to })), { table: TABLE });
for (const err of text.errors) problems.push(typeof err === "string" ? err : JSON.stringify(err));
for (const s of [...EDITS.map((e) => e.to), ...INSERTS.map((n) => n.description)]) {
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
  writeFileSync(BACKUP, JSON.stringify({ taken_at: new Date().toISOString(), rows: before.map((row) => ({ key: `${TABLE}#${row.id}`, row })) }, null, 2));
}

for (const id of new Set(pendingEdits.map((e) => e.id))) {
  const body = Object.fromEntries(pendingEdits.filter((e) => e.id === id).map((e) => [e.column, e.to]));
  await pg({ method: "PATCH", path: `/${TABLE}?id=eq.${id}`, body });
}
if (pendingInserts.length > 0) await pg({ method: "POST", path: `/${TABLE}`, body: pendingInserts });

// Verify: the edits and inserts hold, no other column or row moved, and both state machines keep their shape.
const after = await readAll();
const afterById = new Map(after.map((r) => [r.id, r]));
const failed: string[] = [];
for (const e of EDITS) if (afterById.get(e.id)?.[e.column] !== e.to) failed.push(`${e.key}.${e.column} is ${afterById.get(e.id)?.[e.column]}`);
for (const row of before) {
  const edited = new Set(EDITS.filter((e) => e.id === row.id).map((e) => e.column));
  const now = afterById.get(row.id);
  if (!now) {
    failed.push(`state ${row.id} is gone`);
    continue;
  }
  for (const k of Object.keys(row)) {
    if (k === "updated_at" || k === "search_vector" || edited.has(k)) continue;
    if (JSON.stringify(now[k]) !== JSON.stringify(row[k])) failed.push(`${row[LABEL]}.${k} changed`);
  }
}
for (const n of INSERTS) {
  const row = after.find((r) => r.data_object_id === n.data_object_id && r.state_name === n.state_name);
  if (!row) {
    failed.push(`job_offers.${n.state_name} was not inserted`);
    continue;
  }
  for (const k of Object.keys(n)) if (row[k] !== n[k]) failed.push(`job_offers.${n.state_name}.${k} is ${row[k]}`);
  if (row[LABEL] !== `job_offers.${n.state_name}`) failed.push(`job_offers.${n.state_name} has label ${JSON.stringify(row[LABEL])}`);
  if (row.record_status !== "new") failed.push(`job_offers.${n.state_name} has record_status ${row.record_status}`);
}
for (const obj of OBJECTS) {
  const ss = after.filter((r) => r.data_object_id === obj);
  if (ss.filter((s) => s.is_initial).length !== 1) failed.push(`data_object ${obj} does not have exactly one initial state`);
  if (!ss.some((s) => s.is_terminal)) failed.push(`data_object ${obj} has no terminal state`);
  if (new Set(ss.map((s) => s.state_order)).size !== ss.length) failed.push(`data_object ${obj} has a duplicate state_order`);
}
for (const r of after) console.log(`  ${r.id}  ${r[LABEL]}  order ${r.state_order}  terminal ${r.is_terminal}  record_status ${r.record_status}`);
if (failed.length > 0) {
  console.error(`did not verify:\n${failed.join("\n")}`);
  process.exit(1);
}
console.log("https://domain-map.semantius.app/domain_map/data_object_lifecycle_states");
