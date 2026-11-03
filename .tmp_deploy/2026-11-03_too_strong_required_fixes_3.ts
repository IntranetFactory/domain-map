#!/usr/bin/env bun
// Third batch of too-strong values, approved by the user on 2026-11-03 ("3. ok").
//   Rels 807 and 808: is_required true -> false. Cardinality and kind stay. The derived delete mode becomes clear.
// Existing rows are checked against their expected values before any write and backed up to backups/ first.
// record_status and notes are never sent. Idempotent. Dry-run by default; pass --apply to write.
import { writeFileSync, existsSync } from "node:fs";
import { preflightRelationships } from "../scripts/lib/catalog_invariants.ts";

type Row = Record<string, any>;
const APPLY = process.argv.includes("--apply");
const BACKUP = "backups/too-strong-required-fixes-3-2026-11-03.json";
const USERS = 748;

const CHANGES: { id: number; label: string }[] = [
  { id: 807, label: "job_requisitions is advertised through job_postings" },
  { id: 808, label: "job_requisitions receives job_applications" },
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

const before = await readRows();
const pending: typeof CHANGES = [];
for (const c of CHANGES) {
  const row = before.get(c.id);
  if (!row) throw new Error(`relationship ${c.id} not found`);
  if (row.data_object_relationship_label !== c.label) throw new Error(`relationship ${c.id} is not ${c.label}: ${row.data_object_relationship_label}`);
  if (row.relationship_kind !== "reference") throw new Error(`relationship ${c.id} is not a reference: ${JSON.stringify(row)}`);
  if (row.is_required === false) {
    console.log(`  done     ${c.id} ${c.label}`);
  } else {
    pending.push(c);
    console.log(`  pending  ${c.id} ${c.label}: is_required true -> false`);
  }
}

const pre = preflightRelationships(CHANGES.map((c) => ({ ...before.get(c.id)!, is_required: false })) as any[], { usersId: USERS });
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

for (const c of pending) await pg({ method: "PATCH", path: `/data_object_relationships?id=eq.${c.id}`, body: { is_required: false } });

// Verify: each row is optional, and no other column moved.
const after = await readRows();
const problems: string[] = [];
for (const c of CHANGES) {
  const a = after.get(c.id)!;
  const b = before.get(c.id)!;
  if (a.is_required !== false) problems.push(`${c.id}: ${JSON.stringify(a)}`);
  for (const k of Object.keys(b)) {
    if (k === "is_required" || k === "updated_at" || k === "search_vector") continue;
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
