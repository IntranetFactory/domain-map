#!/usr/bin/env bun
// Follow-ups to .tmp_deploy/2026-11-03_hiring_starter_oneoff_fixes.ts, answered by the user on 2026-11-03.
//   relationship 1501, users authored notes candidate_notes: is_required false -> true. The merged
//   recruiter_interactions required its author (2004), and the merge kept the optional value.
//   bug-29: interviews (8): has_personal_content false -> true. The user declined to keep it false.
// Existing rows are checked against their expected values before any write and backed up to backups/ first.
// record_status and notes are never sent. Idempotent. Dry-run by default; pass --apply to write.
import { writeFileSync, existsSync } from "node:fs";
import { preflightRelationships } from "../scripts/lib/catalog_invariants.ts";

type Row = Record<string, any>;
const APPLY = process.argv.includes("--apply");
const BACKUP = "backups/hiring-starter-oneoff-followups-2026-11-03.json";
const USERS = 748;
const INTERVIEWS = 8;
const CANDIDATE_NOTES = 1001;

async function pg(body: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`postgrestRequest failed: ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const readRel = async (): Promise<Row> => (await pg({ method: "GET", path: "/data_object_relationships?id=eq.1501&select=*" }))[0];
const readObject = async (): Promise<Row> => (await pg({ method: "GET", path: `/data_objects?id=eq.${INTERVIEWS}&select=*` }))[0];

const rel = await readRel();
if (!rel || rel.data_object_id !== USERS || rel.related_data_object_id !== CANDIDATE_NOTES) {
  throw new Error(`relationship 1501 is not users -> candidate_notes: ${JSON.stringify(rel)}`);
}
const object = await readObject();
if (!object || object.data_object_name !== "interviews" || object.entity_type !== "operational_workflow") {
  throw new Error(`data object 8 is not the interviews workflow entity: ${JSON.stringify(object)}`);
}
const todoRel = rel.is_required !== true;
const todoObject = object.has_personal_content !== true;

const report = (todo: boolean, line: string) => console.log(`  ${todo ? "pending" : "done   "}  ${line}`);
report(todoRel, `relationship 1501 "${rel.data_object_relationship_label}": is_required false -> true`);
report(todoObject, "bug-29  interviews: has_personal_content false -> true");

const pre = preflightRelationships([{ ...rel, is_required: true }] as any[], { usersId: USERS });
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
  writeFileSync(BACKUP, JSON.stringify({ taken_at: new Date().toISOString(), data_object_relationships: [rel], data_objects: [object] }, null, 2));
}

if (todoRel) await pg({ method: "PATCH", path: "/data_object_relationships?id=eq.1501", body: { is_required: true } });
if (todoObject) await pg({ method: "PATCH", path: `/data_objects?id=eq.${INTERVIEWS}`, body: { has_personal_content: true } });

const afterRel = await readRel();
const afterObject = await readObject();
if (afterRel.is_required !== true || afterObject.has_personal_content !== true) {
  console.error(`did not verify: ${JSON.stringify({ afterRel, afterObject })}`);
  process.exit(1);
}
console.log(`  ok  1501 "${afterRel.data_object_relationship_label}": required ${afterRel.is_required}, record_status ${afterRel.record_status}`);
console.log(`  ok  interviews: has_personal_content ${afterObject.has_personal_content}, record_status ${afterObject.record_status}`);
console.log("https://domain-map.semantius.app/domain_map/data_object_relationships");
console.log("https://domain-map.semantius.app/domain_map/data_objects");
