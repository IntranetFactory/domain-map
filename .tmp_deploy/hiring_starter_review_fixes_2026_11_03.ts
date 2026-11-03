#!/usr/bin/env bun
// Applies the data fixes for bugs 3, 50, 55 and 57 of audits/ATS/hiring-starter-blueprint-review-2026-11-02.md,
// requested by the user on 2026-11-03.
//   bug-3:  relationship 809, job_postings is applied to via job_applications: is_required true -> false.
//   bug-50: new relationship recruitment_sources attributes job_applications, optional, mirroring 812.
//   bug-55: relationship 1328 becomes interviews occupies interviewer_availability_slots, one_to_many. The
//           cardinality enum has no many_to_one and the parent must be the source, so endpoints and verbs swap.
//   bug-57: job_requisitions description and catalog_description no longer say "Approved".
// Existing rows are checked against their expected values before any write and backed up to backups/ first.
// record_status and notes are never sent. Idempotent. Dry-run by default; pass --apply to write.
import { writeFileSync, existsSync } from "node:fs";
import { preflightRelationships } from "../scripts/lib/catalog_invariants.ts";

type Row = Record<string, any>;
const APPLY = process.argv.includes("--apply");
const BACKUP = "backups/hiring-starter-review-fixes-2026-11-03.json";
const USERS = 748;
const JOB_REQUISITIONS = 1;
const JOB_POSTINGS = 2;
const JOB_APPLICATIONS = 4;
const RECRUITMENT_SOURCES = 5;
const INTERVIEWS = 8;
const AVAILABILITY_SLOTS = 894;

const OLD_DESCRIPTION =
  "Approved request to hire for a specific role. The master ATS work item, carries headcount, level, location, hiring manager, recruiter, and status (draft / open / on_hold / filled / canceled).";
const NEW_DESCRIPTION =
  "Request to hire for a specific role. The master ATS work item, carries headcount, level, location, hiring manager, recruiter, and status (draft / open / on_hold / filled / canceled).";
const OLD_CATALOG_DESCRIPTION =
  "Approved requests to hire for a specific role, carrying headcount, level, location, hiring manager, recruiter, and status.";
const NEW_CATALOG_DESCRIPTION =
  "Requests to hire for a specific role, carrying headcount, level, location, hiring manager, recruiter, and status.";

const PATCH_1328 = {
  data_object_id: INTERVIEWS,
  related_data_object_id: AVAILABILITY_SLOTS,
  relationship_type: "one_to_many",
  relationship_verb: "occupies",
  inverse_verb: "booked_for",
};
const NEW_SOURCE_LINK = {
  data_object_id: RECRUITMENT_SOURCES,
  related_data_object_id: JOB_APPLICATIONS,
  relationship_type: "one_to_many",
  relationship_kind: "reference",
  relationship_verb: "attributes",
  inverse_verb: "was attributed from",
  is_required: false,
};

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
const readRel = async (id: number): Promise<Row> => (await pg({ method: "GET", path: `/data_object_relationships?id=eq.${id}&select=*` }))[0];
const readSourceLinks = (): Promise<Row[]> =>
  pg({
    method: "GET",
    path: `/data_object_relationships?or=(and(data_object_id.eq.${RECRUITMENT_SOURCES},related_data_object_id.eq.${JOB_APPLICATIONS}),and(data_object_id.eq.${JOB_APPLICATIONS},related_data_object_id.eq.${RECRUITMENT_SOURCES}))&select=*`,
  });
const readRequisition = async (): Promise<Row> =>
  (await pg({ method: "GET", path: `/data_objects?id=eq.${JOB_REQUISITIONS}&select=id,data_object_name,description,catalog_description,record_status` }))[0];
const matches = (row: Row, expected: Row) => Object.entries(expected).every(([k, v]) => row[k] === v);

const rel809 = await readRel(809);
if (!rel809 || !matches(rel809, { data_object_id: JOB_POSTINGS, related_data_object_id: JOB_APPLICATIONS, relationship_verb: "is applied to via" })) {
  throw new Error(`relationship 809 is not job_postings is applied to via job_applications: ${JSON.stringify(rel809)}`);
}
const todo809 = rel809.is_required !== false;

const rel1328 = await readRel(1328);
if (!rel1328) throw new Error("relationship 1328 not found");
const todo1328 = !matches(rel1328, PATCH_1328);
if (
  todo1328 &&
  !matches(rel1328, {
    data_object_id: AVAILABILITY_SLOTS,
    related_data_object_id: INTERVIEWS,
    relationship_type: "one_to_one",
    relationship_verb: "booked_for",
    inverse_verb: "occupies",
    is_required: false,
  })
) {
  throw new Error(`relationship 1328 is not in the expected state: ${JSON.stringify(rel1328)}`);
}

const sourceLinks = await readSourceLinks();
const foreignSourceLink = sourceLinks.find((r) => !matches(r, NEW_SOURCE_LINK));
if (foreignSourceLink) throw new Error(`recruitment_sources and job_applications already have another link: ${JSON.stringify(foreignSourceLink)}`);
const todoSourceLink = sourceLinks.length === 0;

const requisition = await readRequisition();
const todoDescription = requisition.description !== NEW_DESCRIPTION;
const todoCatalogDescription = requisition.catalog_description !== NEW_CATALOG_DESCRIPTION;
if (todoDescription && requisition.description !== OLD_DESCRIPTION) throw new Error(`job_requisitions.description changed: ${requisition.description}`);
if (todoCatalogDescription && requisition.catalog_description !== OLD_CATALOG_DESCRIPTION) {
  throw new Error(`job_requisitions.catalog_description changed: ${requisition.catalog_description}`);
}

const report = (todo: boolean, line: string) => console.log(`  ${todo ? "pending" : "done   "}  ${line}`);
report(todo809, "bug-3   relationship 809 job_postings is applied to via job_applications: is_required true -> false");
report(todoSourceLink, "bug-50  new relationship recruitment_sources attributes job_applications (one_to_many, reference, optional)");
report(todo1328, "bug-55  relationship 1328: interviewer_availability_slots booked_for interviews (one_to_one) -> interviews occupies interviewer_availability_slots (one_to_many)");
report(todoDescription, `bug-57  job_requisitions.description\n             - ${OLD_DESCRIPTION}\n             + ${NEW_DESCRIPTION}`);
report(todoCatalogDescription, `bug-57  job_requisitions.catalog_description\n             - ${OLD_CATALOG_DESCRIPTION}\n             + ${NEW_CATALOG_DESCRIPTION}`);

const pre = preflightRelationships(
  [{ ...rel809, is_required: false }, { ...rel1328, ...PATCH_1328, owner_side: "source" }, { ...NEW_SOURCE_LINK, id: 0, owner_side: "source" }] as any[],
  { usersId: USERS },
);
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
  writeFileSync(BACKUP, JSON.stringify({ taken_at: new Date().toISOString(), data_object_relationships: [rel809, rel1328], data_objects: [requisition] }, null, 2));
}

if (todo809) await pg({ method: "PATCH", path: "/data_object_relationships?id=eq.809", body: { is_required: false } });
if (todoSourceLink) await pg({ method: "POST", path: "/data_object_relationships", body: NEW_SOURCE_LINK });
if (todo1328) await pg({ method: "PATCH", path: "/data_object_relationships?id=eq.1328", body: PATCH_1328 });
if (todoDescription || todoCatalogDescription) {
  await pg({ method: "PATCH", path: `/data_objects?id=eq.${JOB_REQUISITIONS}`, body: { description: NEW_DESCRIPTION, catalog_description: NEW_CATALOG_DESCRIPTION } });
}

const after809 = await readRel(809);
const after1328 = await readRel(1328);
const afterSourceLinks = await readSourceLinks();
const afterRequisition = await readRequisition();
const problems: string[] = [];
if (after809.is_required !== false) problems.push(`809: ${JSON.stringify(after809)}`);
if (!matches(after1328, { ...PATCH_1328, owner_side: "source", is_required: false })) problems.push(`1328: ${JSON.stringify(after1328)}`);
if (afterSourceLinks.length !== 1 || !matches(afterSourceLinks[0], { ...NEW_SOURCE_LINK, owner_side: "source", record_status: "new" })) {
  problems.push(`source link: ${JSON.stringify(afterSourceLinks)}`);
}
if (afterRequisition.description !== NEW_DESCRIPTION || afterRequisition.catalog_description !== NEW_CATALOG_DESCRIPTION) {
  problems.push(`job_requisitions: ${JSON.stringify(afterRequisition)}`);
}
if (problems.length > 0) {
  console.error(`did not verify:\n${problems.join("\n")}`);
  process.exit(1);
}

for (const r of [after809, afterSourceLinks[0], after1328]) {
  console.log(`  ok  ${r.id} "${r.data_object_relationship_label}": ${r.relationship_type}, required ${r.is_required}, owner_side ${r.owner_side}, record_status ${r.record_status}`);
}
console.log(`  ok  job_requisitions descriptions updated, record_status ${afterRequisition.record_status}`);
console.log("https://domain-map.semantius.app/domain_map/data_object_relationships");
console.log("https://domain-map.semantius.app/domain_map/data_objects");
