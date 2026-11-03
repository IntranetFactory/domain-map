#!/usr/bin/env bun
// Applies the too-strong value fixes for bugs 4, 5, 6, 7, 8, 9, 11, 20 and 75 of
// audits/ATS/hiring-starter-blueprint-review-2026-11-03.md, approved by the user on 2026-11-03 ("ok to flip all").
//   All nine rows: is_required true -> false.
//   Rels 827, 828, 829 also: one_to_one -> one_to_many, because a parent can have a second child.
//   Rel 1326 also: composition -> reference. A composition field cannot be empty, and panels are the
//   only composition parent of scorecards, so false alone is not possible.
// Existing rows are checked against their expected values before any write and backed up to backups/ first.
// record_status and notes are never sent. Idempotent. Dry-run by default; pass --apply to write.
import { writeFileSync, existsSync } from "node:fs";
import { preflightRelationships } from "../scripts/lib/catalog_invariants.ts";

type Row = Record<string, any>;
const APPLY = process.argv.includes("--apply");
const BACKUP = "backups/too-strong-required-fixes-2026-11-03.json";
const USERS = 748;

const CHANGES: { id: number; bug: number; label: string; from: Row; to: Row }[] = [
  { id: 813, bug: 4, label: "recruitment_agencies sources candidates", from: { is_required: true }, to: { is_required: false } },
  { id: 814, bug: 5, label: "recruitment_events attracts candidates", from: { is_required: true }, to: { is_required: false } },
  { id: 1022, bug: 6, label: "headcount_plans authorizes job_requisitions", from: { is_required: true }, to: { is_required: false } },
  {
    id: 828,
    bug: 7,
    label: "job_offers triggers benefit_enrollments",
    from: { is_required: true, relationship_type: "one_to_one" },
    to: { is_required: false, relationship_type: "one_to_many" },
  },
  {
    id: 829,
    bug: 8,
    label: "job_offers seeds compensation_statements",
    from: { is_required: true, relationship_type: "one_to_one" },
    to: { is_required: false, relationship_type: "one_to_many" },
  },
  { id: 830, bug: 9, label: "candidates becomes employees", from: { is_required: true }, to: { is_required: false } },
  {
    id: 1326,
    bug: 11,
    label: "interview_panels produces interview_scorecards",
    from: { is_required: true, relationship_kind: "composition" },
    to: { is_required: false, relationship_kind: "reference" },
  },
  {
    id: 827,
    bug: 20,
    label: "job_offers spawns onboarding_journeys",
    from: { is_required: true, relationship_type: "one_to_one" },
    to: { is_required: false, relationship_type: "one_to_many" },
  },
  { id: 1314, bug: 75, label: "job_requisitions defines_pipeline application_stages", from: { is_required: true }, to: { is_required: false } },
];

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
const readRows = async (): Promise<Map<number, Row>> => {
  const ids = CHANGES.map((c) => c.id).join(",");
  const rows: Row[] = await pg({ method: "GET", path: `/data_object_relationships?id=in.(${ids})&select=*&order=id` });
  return new Map(rows.map((r) => [Number(r.id), r]));
};
const matches = (row: Row, expected: Row) => Object.entries(expected).every(([k, v]) => row[k] === v);

const before = await readRows();
const pending: typeof CHANGES = [];
for (const c of CHANGES) {
  const row = before.get(c.id);
  if (!row) throw new Error(`relationship ${c.id} not found`);
  if (row.data_object_relationship_label !== c.label) throw new Error(`relationship ${c.id} is not ${c.label}: ${row.data_object_relationship_label}`);
  if (matches(row, c.to)) {
    console.log(`  done     bug-${c.bug}  ${c.id} ${c.label}`);
  } else if (matches(row, c.from)) {
    pending.push(c);
    console.log(`  pending  bug-${c.bug}  ${c.id} ${c.label}: ${JSON.stringify(c.from)} -> ${JSON.stringify(c.to)}`);
  } else {
    throw new Error(`relationship ${c.id} is not in the expected state: ${JSON.stringify(row)}`);
  }
}

const pre = preflightRelationships(CHANGES.map((c) => ({ ...before.get(c.id)!, ...c.to })) as any[], { usersId: USERS });
for (const w of pre.warnings) console.log(`  warn ${typeof w === "string" ? w : JSON.stringify(w)}`);
if (pre.errors.length > 0) {
  for (const e of pre.errors) console.error(`  ERROR ${typeof e === "string" ? e : JSON.stringify(e)}`);
  process.exit(1);
}

if (!APPLY) {
  console.log("\nDry run. Pass --apply to write.");
  process.exit(0);
}

if (!existsSync(BACKUP)) {
  writeFileSync(BACKUP, JSON.stringify({ taken_at: new Date().toISOString(), data_object_relationships: [...before.values()] }, null, 2));
}

for (const c of pending) await pg({ method: "PATCH", path: `/data_object_relationships?id=eq.${c.id}`, body: c.to });

// Verify: each row holds its new values, and no other column moved.
const after = await readRows();
const problems: string[] = [];
for (const c of CHANGES) {
  const a = after.get(c.id)!;
  const b = before.get(c.id)!;
  if (!matches(a, c.to)) problems.push(`${c.id}: ${JSON.stringify(a)}`);
  for (const k of Object.keys(b)) {
    if (k in c.to || k === "updated_at" || k === "search_vector") continue;
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) problems.push(`${c.id}: ${k} changed`);
  }
}
if (problems.length > 0) {
  console.error(`did not verify:\n${problems.join("\n")}`);
  process.exit(1);
}

for (const c of CHANGES) {
  const r = after.get(c.id)!;
  console.log(`  ok  ${r.id} "${r.data_object_relationship_label}": ${r.relationship_type}, ${r.relationship_kind}, required ${r.is_required}, record_status ${r.record_status}, updated ${r.updated_at}`);
}
console.log("https://domain-map.semantius.app/domain_map/data_object_relationships");
