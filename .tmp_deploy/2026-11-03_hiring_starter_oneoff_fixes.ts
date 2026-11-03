#!/usr/bin/env bun
// Applies the data fixes for bugs 21, 38, 41 and 74 of audits/ATS/hiring-starter-blueprint-review-2026-11-03.md,
// requested by the user on 2026-11-03. Bug 29 changes no row.
//   bug-21: relationship 1497, candidates tagged_via candidate_tag_assignments: is_required false -> true.
//   bug-38: relationship 832, job_requisitions feeds people_kpis: many_to_many -> one_to_many.
//   bug-74: relationship 1325, interviews convenes interview_panels: one_to_one -> one_to_many.
//   bug-41: the q26 merge of recruiter_interactions (869) into candidate_notes (1001). candidate_notes already has
//           its own relationships to candidates (1496) and users (1501), so 1299 and 2004 are deleted, not moved.
//           Module row 954 and data object 869 go with them.
// Existing rows are checked against their expected values before any write and backed up to backups/ first.
// record_status and notes are never sent. Idempotent. Dry-run by default; pass --apply to write.
import { writeFileSync, existsSync } from "node:fs";
import { preflightRelationships } from "../scripts/lib/catalog_invariants.ts";

type Row = Record<string, any>;
const APPLY = process.argv.includes("--apply");
const BACKUP = "backups/hiring-starter-oneoff-fixes-2026-11-03.json";
const USERS = 748;
const JOB_REQUISITIONS = 1;
const CANDIDATES = 3;
const INTERVIEWS = 8;
const PEOPLE_KPIS = 43;
const RECRUITER_INTERACTIONS = 869;
const INTERVIEW_PANELS = 891;
const CANDIDATE_NOTES = 1001;
const CANDIDATE_TAG_ASSIGNMENTS = 1003;
const MODULE_ROW = 954;

const PATCHES = [
  {
    bug: "bug-21",
    id: 1497,
    identity: { data_object_id: CANDIDATES, related_data_object_id: CANDIDATE_TAG_ASSIGNMENTS, relationship_verb: "tagged_via" },
    from: { is_required: false },
    to: { is_required: true },
  },
  {
    bug: "bug-38",
    id: 832,
    identity: { data_object_id: JOB_REQUISITIONS, related_data_object_id: PEOPLE_KPIS, relationship_verb: "feeds" },
    from: { relationship_type: "many_to_many" },
    to: { relationship_type: "one_to_many" },
  },
  {
    bug: "bug-74",
    id: 1325,
    identity: { data_object_id: INTERVIEWS, related_data_object_id: INTERVIEW_PANELS, relationship_verb: "convenes" },
    from: { relationship_type: "one_to_one" },
    to: { relationship_type: "one_to_many" },
  },
];
const MERGE_RELATIONSHIPS = [
  { id: 1299, identity: { data_object_id: CANDIDATES, related_data_object_id: RECRUITER_INTERACTIONS, relationship_verb: "noted_via" } },
  { id: 2004, identity: { data_object_id: USERS, related_data_object_id: RECRUITER_INTERACTIONS, relationship_verb: "authors" } },
];
const NOTES_RELATIONSHIPS = [
  { id: 1496, identity: { data_object_id: CANDIDATES, related_data_object_id: CANDIDATE_NOTES } },
  { id: 1501, identity: { data_object_id: USERS, related_data_object_id: CANDIDATE_NOTES } },
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
const readOne = async (table: string, id: number): Promise<Row | undefined> => (await pg({ method: "GET", path: `/${table}?id=eq.${id}&select=*` }))[0];
const matches = (row: Row, expected: Row) => Object.entries(expected).every(([k, v]) => row[k] === v);

const before: Row[] = [];
for (const p of PATCHES) {
  const row = await readOne("data_object_relationships", p.id);
  if (!row || !matches(row, p.identity)) throw new Error(`relationship ${p.id} is not the expected row: ${JSON.stringify(row)}`);
  if (!matches(row, p.to) && !matches(row, p.from)) throw new Error(`relationship ${p.id} is in an unexpected state: ${JSON.stringify(row)}`);
  before.push(row);
}
for (const n of NOTES_RELATIONSHIPS) {
  const row = await readOne("data_object_relationships", n.id);
  if (!row || !matches(row, n.identity)) throw new Error(`candidate_notes relationship ${n.id} is missing, so the merge would lose it: ${JSON.stringify(row)}`);
}

const merged: Row = { data_object_relationships: [], domain_module_data_objects: [], data_objects: [] };
for (const m of MERGE_RELATIONSHIPS) {
  const row = await readOne("data_object_relationships", m.id);
  if (!row) continue;
  if (!matches(row, m.identity)) throw new Error(`relationship ${m.id} is not the expected row: ${JSON.stringify(row)}`);
  merged.data_object_relationships.push(row);
}
const moduleRow = await readOne("domain_module_data_objects", MODULE_ROW);
if (moduleRow) {
  if (!matches(moduleRow, { data_object_id: RECRUITER_INTERACTIONS, held_as: "master" })) throw new Error(`module row ${MODULE_ROW} is not the expected row: ${JSON.stringify(moduleRow)}`);
  merged.domain_module_data_objects.push(moduleRow);
}
const object869 = await readOne("data_objects", RECRUITER_INTERACTIONS);
if (object869) {
  if (object869.data_object_name !== "recruiter_interactions") throw new Error(`data object 869 is not recruiter_interactions: ${JSON.stringify(object869)}`);
  merged.data_objects.push(object869);
}

// Every column that references data_objects, read live, so no other row can still point at 869 when it is deleted.
const expectedRefs = new Set([...MERGE_RELATIONSHIPS.map((m) => `data_object_relationships:${m.id}`), `domain_module_data_objects:${MODULE_ROW}`]);
const refColumns: Row[] = await pg({ method: "GET", path: "/fields?reference_table=eq.data_objects&select=table_name,field_name&limit=200" });
for (const c of refColumns) {
  const refs: Row[] = await pg({ method: "GET", path: `/${c.table_name}?${c.field_name}=eq.${RECRUITER_INTERACTIONS}&select=id` });
  const foreign = refs.filter((r) => !expectedRefs.has(`${c.table_name}:${r.id}`));
  if (foreign.length > 0) throw new Error(`${c.table_name}.${c.field_name} still points at 869 from rows ${foreign.map((r) => r.id).join(", ")}`);
}

const report = (todo: boolean, line: string) => console.log(`  ${todo ? "pending" : "done   "}  ${line}`);
PATCHES.forEach((p, i) => report(!matches(before[i], p.to), `${p.bug}  relationship ${p.id} "${before[i].data_object_relationship_label}": ${JSON.stringify(p.from)} -> ${JSON.stringify(p.to)}`));
for (const r of merged.data_object_relationships) report(true, `bug-41  delete relationship ${r.id} "${r.data_object_relationship_label}"`);
for (const r of merged.domain_module_data_objects) report(true, `bug-41  delete module row ${r.id} (recruiter_interactions, master in module ${r.domain_module_id})`);
for (const r of merged.data_objects) report(true, `bug-41  delete data object ${r.id} ${r.data_object_name}`);
if (!object869) report(false, "bug-41  recruiter_interactions already gone");

const pre = preflightRelationships(PATCHES.map((p, i) => ({ ...before[i], ...p.to })) as any[], { usersId: USERS });
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
  writeFileSync(
    BACKUP,
    JSON.stringify({ taken_at: new Date().toISOString(), patched_relationships: before, deleted: merged }, null, 2),
  );
}

for (let i = 0; i < PATCHES.length; i++) {
  if (!matches(before[i], PATCHES[i].to)) await pg({ method: "PATCH", path: `/data_object_relationships?id=eq.${PATCHES[i].id}`, body: PATCHES[i].to });
}
for (const r of merged.data_object_relationships) await pg({ method: "DELETE", path: `/data_object_relationships?id=eq.${r.id}` });
for (const r of merged.domain_module_data_objects) await pg({ method: "DELETE", path: `/domain_module_data_objects?id=eq.${r.id}` });
for (const r of merged.data_objects) await pg({ method: "DELETE", path: `/data_objects?id=eq.${r.id}` });

const problems: string[] = [];
for (const p of PATCHES) {
  const row = await readOne("data_object_relationships", p.id);
  if (!row || !matches(row, { ...p.identity, ...p.to })) problems.push(`${p.id}: ${JSON.stringify(row)}`);
  else console.log(`  ok  ${row.id} "${row.data_object_relationship_label}": ${row.relationship_type}, required ${row.is_required}, record_status ${row.record_status}`);
}
for (const m of MERGE_RELATIONSHIPS) if (await readOne("data_object_relationships", m.id)) problems.push(`relationship ${m.id} still exists`);
if (await readOne("domain_module_data_objects", MODULE_ROW)) problems.push(`module row ${MODULE_ROW} still exists`);
if (await readOne("data_objects", RECRUITER_INTERACTIONS)) problems.push("data object 869 still exists");
if (problems.length > 0) {
  console.error(`did not verify:\n${problems.join("\n")}`);
  process.exit(1);
}
console.log("  ok  recruiter_interactions, its two relationships and its module row are gone");
console.log("https://domain-map.semantius.app/domain_map/data_object_relationships");
console.log("https://domain-map.semantius.app/domain_map/data_objects");
