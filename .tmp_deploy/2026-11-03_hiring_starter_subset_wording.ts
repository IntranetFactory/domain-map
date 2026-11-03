#!/usr/bin/env bun
// Applies the wording fixes for bugs 17, 51 and 52 of audits/ATS/hiring-starter-blueprint-review-2026-11-03.md,
// plus state 213 (found while checking those bugs), approved by the user on 2026-11-03.
//   data_objects 4, 2, 11: catalog_description and description no longer promise a requisition, an approval chain
//   or a full evaluation history, which the starter does not always carry. The text is shared with the full modules.
//   data_object_lifecycle_states 217, 231, 235, 213: same, for the requisition and for scorecards.
// Existing rows are checked against their expected values before any write and backed up to backups/ first.
// record_status and notes are never sent. Idempotent. Dry-run by default; pass --apply to write.
import { writeFileSync, existsSync } from "node:fs";
import { preflightAuthoredText } from "../scripts/lib/catalog_invariants.ts";

type Row = Record<string, any>;
type Edit = { table: string; id: number; key: string; keyColumn: string; column: string; from: string; to: string };
const APPLY = process.argv.includes("--apply");
const BACKUP = "backups/hiring-starter-subset-wording-2026-11-03.json";

const EDITS: Edit[] = [
  {
    table: "data_objects", id: 4, keyColumn: "data_object_name", key: "job_applications", column: "catalog_description",
    from: "Candidate submissions against a specific requisition, with pipeline stage, status, source, and full evaluation history.",
    to: "Candidate submissions for a specific job, with pipeline stage, status, and source.",
  },
  {
    table: "data_objects", id: 4, keyColumn: "data_object_name", key: "job_applications", column: "description",
    from: "A candidate's submission against a specific requisition. Carries pipeline stage, status (active / rejected / withdrawn / hired), source, and the full evaluation history.",
    to: "A candidate's submission for a specific job. Carries pipeline stage, status (active / rejected / withdrawn / hired), and source.",
  },
  {
    table: "data_objects", id: 2, keyColumn: "data_object_name", key: "job_postings", column: "catalog_description",
    from: "Published, candidate-facing versions of a requisition on a career site or job board, one requisition possibly having many postings.",
    to: "Published, candidate-facing versions of a job on a career site or job board, one job possibly having many postings.",
  },
  {
    table: "data_objects", id: 2, keyColumn: "data_object_name", key: "job_postings", column: "description",
    from: "Published, candidate-facing version of a requisition on a career site or job board. One requisition can have many postings (per board, language, or region).",
    to: "Published, candidate-facing version of a job on a career site or job board. One job can have many postings (per board, language, or region).",
  },
  {
    table: "data_objects", id: 11, keyColumn: "data_object_name", key: "job_offers", column: "catalog_description",
    from: "Formal employment offers extended to candidates, with compensation, start date, terms, approval chain, and status.",
    to: "Formal employment offers extended to candidates, with compensation, start date, terms, approval, and status.",
  },
  {
    table: "data_objects", id: 11, keyColumn: "data_object_name", key: "job_offers", column: "description",
    from: "Formal employment offer extended to a candidate. Carries compensation components, start date, terms, approval chain, and status (draft / approved / sent / accepted / declined / rescinded).",
    to: "Formal employment offer extended to a candidate. Carries compensation components, start date, terms, approval, and status (draft / approved / sent / accepted / declined / rescinded).",
  },
  {
    table: "data_object_lifecycle_states", id: 217, keyColumn: "data_object_lifecycle_state_label", key: "job_applications.applied", column: "description",
    from: "Candidate submitted an application against the requisition.",
    to: "Candidate submitted an application for the job.",
  },
  {
    table: "data_object_lifecycle_states", id: 231, keyColumn: "data_object_lifecycle_state_label", key: "job_postings.draft", column: "description",
    from: "Posting being composed against a requisition for a specific board or region.",
    to: "Posting being composed for a specific board or region.",
  },
  {
    table: "data_object_lifecycle_states", id: 235, keyColumn: "data_object_lifecycle_state_label", key: "job_postings.closed", column: "description",
    from: "Posting taken down because the requisition is filled or canceled.",
    to: "Posting taken down because the job is filled or canceled.",
  },
  {
    table: "data_object_lifecycle_states", id: 213, keyColumn: "data_object_lifecycle_state_label", key: "interviews.completed", column: "description",
    from: "Interview took place; scorecards are being collected.",
    to: "Interview took place; feedback is being collected.",
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
const rowKey = (table: string, id: number) => `${table}#${id}`;
const targets = [...new Map(EDITS.map((e) => [rowKey(e.table, e.id), e])).values()];
async function readAll(): Promise<Map<string, Row>> {
  const out = new Map<string, Row>();
  for (const t of targets) out.set(rowKey(t.table, t.id), (await pg({ method: "GET", path: `/${t.table}?id=eq.${t.id}&select=*` }))[0]);
  return out;
}

const before = await readAll();
const pending: Edit[] = [];
const problems: string[] = [];
for (const e of EDITS) {
  const row = before.get(rowKey(e.table, e.id));
  if (!row || row[e.keyColumn] !== e.key) {
    problems.push(`${e.table} ${e.id} is not ${e.key}: ${JSON.stringify(row?.[e.keyColumn])}`);
    continue;
  }
  if (row[e.column] === e.to) {
    console.log(`  done     ${e.key}.${e.column}`);
  } else if (row[e.column] === e.from) {
    pending.push(e);
    console.log(`  pending  ${e.key}.${e.column}\n    old: ${e.from}\n    new: ${e.to}`);
  } else {
    problems.push(`${e.key}.${e.column} holds an unexpected value: ${row[e.column]}`);
  }
}

const text = preflightAuthoredText(EDITS.map((e) => ({ id: e.id, [e.column]: e.to })), { table: "subset_wording" });
for (const err of text.errors) problems.push(typeof err === "string" ? err : JSON.stringify(err));
for (const e of EDITS) if (e.to.includes(String.fromCharCode(0x2014))) problems.push(`${e.key}.${e.column} contains an em-dash`);
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

// Verify: every row holds the new values, and no other column moved.
const after = await readAll();
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
if (failed.length > 0) {
  console.error(`did not verify:\n${failed.join("\n")}`);
  process.exit(1);
}
console.log("https://domain-map.semantius.app/domain_map/data_objects");
console.log("https://domain-map.semantius.app/domain_map/data_object_lifecycle_states");
