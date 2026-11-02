#!/usr/bin/env bun
// Step 1 of plans/blueprint-external-links-plan.md (approved 2026-11-02):
//   A1  add is_install_optional to domain_module_data_objects and domain_data_objects
//   A2  set it to true where necessity = optional (the old column stays until step 5)
//   A3  rewrite the data_object_relationships.is_required field description, which names necessity
//   B1  q6: replace the HIRING-STARTER description
//   B2  reword the ATS-BACKGROUND-CHECKS catalog description
//   C   q3: restructure the ATS users links (exact replacements in audits/ATS/history.md 2026-11-01)
// Backs up affected rows to backups/ before any write. record_status is never sent. Idempotent.
// Dry-run by default; pass --apply to write.
import { writeFileSync, existsSync } from "node:fs";

type Row = Record<string, unknown>;
const APPLY = process.argv.includes("--apply");
const BACKUP = "backups/necessity-step1-2026-11-02.json";

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
const patch = (path: string, body: Row) => pg({ method: "PATCH", path, body });
const post = (path: string, rows: Row[]) => pg({ method: "POST", path, body: rows });

const USERS = 748;
const JOB_REQUISITIONS = 1;
const DMDO = "domain_module_data_objects";
const DDO = "domain_data_objects";
const FIELD = "is_install_optional";

const description = (unit: string) =>
  `True when the ${unit} can be installed without this entity. False, the default, means every install of the ${unit} includes it. Not related to \`data_object_relationships.is_required\`, which says whether a link's field must be filled in.`;

const IS_REQUIRED_DESCRIPTION =
  "True when a link's field must be filled in once both entities exist. It never makes an entity required: whether an entity installs is is_install_optional on domain_module_data_objects (SKILL.md Rule #16). A required link to an absent entity carries no constraint.";

const Q6_TEXT =
  "Entry-tier deployable for a basic hiring workflow: post jobs, capture applications, run interviews, and make offers. Embeds the canonical masters from the full ATS modules and inherits their lifecycle states and gated steps, which it governs under its own permission prefix. Leaves out requisitions and their approvals, background-check processing (it reacts when a background check is flagged), and the pre-employee record (an accepted offer hands the new hire to HCM). Upgrades to the full ATS modules without tenant data migration via the embedded-master demotion path.";
const OLD_SENTENCE = "Screening is necessity-scoped, so deployments outside FCRA jurisdictions enable only what applies to them.";
const NEW_SENTENCE = "Screening is scoped by jurisdiction, so deployments outside FCRA jurisdictions enable only what applies to them.";

// q3: `users [<old inverse> / <old verb>] <entity>`, one_to_many, owner_side source, is_required kept.
const SWAP = [822, 824, 825, 826, 1339, 1343, 1344, 1345, 1346, 1348, 1349, 1984, 1985, 1990, 1991, 1992, 1993, 1994, 1995, 1996, 1999, 2000, 2001, 2002, 2004, 2005, 2269, 2660, 2662];
const EXPLICIT: Record<number, { verb: string; inverse: string }> = {
  821: { verb: "is recruiter for", inverse: "has recruiter" },
  823: { verb: "coordinates", inverse: "has coordinator" },
  900: { verb: "owns pre-employee record", inverse: "has owning HR coordinator" },
  1997: { verb: "records", inverse: "is recorded by" },
  2003: { verb: "sits on", inverse: "has panelist" },
};
const NEW_EDGE = {
  data_object_id: USERS,
  related_data_object_id: JOB_REQUISITIONS,
  relationship_type: "one_to_many",
  relationship_kind: "reference",
  relationship_verb: "is hiring manager for",
  inverse_verb: "has hiring manager",
  is_required: true,
  owner_side: "source",
};
const ALL_IDS = [...SWAP, ...Object.keys(EXPLICIT).map(Number)].sort((a, b) => a - b);

const count = async (table: string, filter: string) => (await get(`/${table}?select=count()&${filter}`))[0]?.count ?? 0;

// ---------- read current state ----------
const fields = await get(`/fields?select=id,table_name,field_name&field_name=eq.${FIELD}`);
const hasField = new Set(fields.map((f: any) => f.table_name));
const rels = await get(`/data_object_relationships?select=*&id=in.(${ALL_IDS.join(",")})&order=id`);
const modules = await get("/domain_modules?select=id,domain_module_code,description,catalog_description&domain_module_code=in.(HIRING-STARTER,ATS-BACKGROUND-CHECKS)");
const starter = modules.find((m: any) => m.domain_module_code === "HIRING-STARTER");
const bgc = modules.find((m: any) => m.domain_module_code === "ATS-BACKGROUND-CHECKS");
const isRequiredField = (await get("/fields?select=id,description&id=eq.data_object_relationships.is_required"))[0];
const ddoStatusBefore = await get(`/${DDO}?select=record_status,count()`);
const optional = { [DMDO]: await count(DMDO, "necessity=eq.optional"), [DDO]: await count(DDO, "necessity=eq.optional") };

if (rels.length !== ALL_IDS.length) throw new Error(`expected ${ALL_IDS.length} q3 rows, found ${rels.length}`);
if (!starter || !bgc) throw new Error("module rows not found");

// ---------- build the q3 updates ----------
const edgeUpdates = rels.flatMap((r: any) => {
  const alreadyDone = r.data_object_id === USERS && r.relationship_type === "one_to_many" && r.owner_side === "source";
  if (alreadyDone) return [];
  const explicit = EXPLICIT[r.id];
  const entity = r.data_object_id === USERS ? r.related_data_object_id : r.data_object_id;
  return [{
    id: r.id,
    before: `${r.data_object_id} [${r.relationship_verb} / ${r.inverse_verb}] ${r.related_data_object_id} ${r.relationship_type} ${r.owner_side}`,
    body: {
      data_object_id: USERS,
      related_data_object_id: entity,
      relationship_type: "one_to_many",
      relationship_verb: explicit?.verb ?? r.inverse_verb,
      inverse_verb: explicit?.inverse ?? r.relationship_verb,
      owner_side: "source",
    } as Row,
  }];
});
const newEdgeExists = (await get(`/data_object_relationships?select=id&data_object_id=eq.${USERS}&related_data_object_id=eq.${JOB_REQUISITIONS}&relationship_verb=eq.${encodeURIComponent(NEW_EDGE.relationship_verb)}`)).length > 0;

const bgcText = String(bgc.catalog_description ?? "");
const bgcNeedsChange = bgcText.includes(OLD_SENTENCE);
if (!bgcNeedsChange && !bgcText.includes(NEW_SENTENCE)) throw new Error("ATS-BACKGROUND-CHECKS sentence not found");

console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
console.log(`add ${FIELD}: ${DMDO} ${hasField.has(DMDO) ? "exists" : "to add"}, ${DDO} ${hasField.has(DDO) ? "exists" : "to add"}`);
console.log(`set true: ${DMDO} ${optional[DMDO]} rows, ${DDO} ${optional[DDO]} rows, total ${optional[DMDO] + optional[DDO]}`);
console.log(`is_required description: ${isRequiredField.description === IS_REQUIRED_DESCRIPTION ? "already done" : "to rewrite"}`);
console.log(`q6 description: ${starter.description === Q6_TEXT ? "already done" : "to replace"}`);
console.log(`background checks sentence: ${bgcNeedsChange ? "to reword" : "already done"}`);
console.log(`q3 links: ${edgeUpdates.length} of ${ALL_IDS.length} to update, new hiring manager link ${newEdgeExists ? "exists" : "to add"}`);
for (const u of edgeUpdates) console.log(`  ${u.id}: ${u.before}  ->  users [${u.body.relationship_verb} / ${u.body.inverse_verb}] ${u.body.related_data_object_id}`);

if (!APPLY) process.exit(0);

// ---------- back up first, never overwriting an earlier backup ----------
if (!existsSync(BACKUP)) {
  writeFileSync(BACKUP, JSON.stringify({ taken_at: new Date().toISOString(), data_object_relationships: rels, domain_modules: modules, is_required_field: isRequiredField, necessity_optional_counts: optional, ddo_record_status: ddoStatusBefore }, null, 2));
  console.log(`backup written: ${BACKUP}`);
}

// ---------- A: the new column ----------
const missing = [DMDO, DDO].filter((t) => !hasField.has(t));
if (missing.length) {
  await semantius("create_field", {
    data: missing.map((table_name) => ({
      table_name,
      field_name: FIELD,
      title: "Install Optional",
      description: description(table_name === DMDO ? "module" : "domain"),
      format: "boolean",
      default_value: "false",
      input_type: "default",
      width: "default",
    })),
  });
}
for (const table of [DMDO, DDO]) await patch(`/${table}?necessity=eq.optional&${FIELD}=eq.false`, { [FIELD]: true });
if (isRequiredField.description !== IS_REQUIRED_DESCRIPTION) {
  await semantius("update_field", { id: "data_object_relationships.is_required", data: { description: IS_REQUIRED_DESCRIPTION } });
}

// ---------- B: description text ----------
if (starter.description !== Q6_TEXT) await patch(`/domain_modules?id=eq.${starter.id}`, { description: Q6_TEXT });
if (bgcNeedsChange) await patch(`/domain_modules?id=eq.${bgc.id}`, { catalog_description: bgcText.replace(OLD_SENTENCE, NEW_SENTENCE) });

// ---------- C: q3 ----------
for (const u of edgeUpdates) await patch(`/data_object_relationships?id=eq.${u.id}`, u.body);
if (!newEdgeExists) await post("/data_object_relationships", [NEW_EDGE]);

// ---------- verify ----------
const after = {
  [DMDO]: { flag: await count(DMDO, `${FIELD}=eq.true`), old: await count(DMDO, "necessity=eq.optional"), differ: await count(DMDO, `or=(and(necessity.eq.optional,${FIELD}.eq.false),and(necessity.eq.required,${FIELD}.eq.true))`) },
  [DDO]: { flag: await count(DDO, `${FIELD}=eq.true`), old: await count(DDO, "necessity=eq.optional"), differ: await count(DDO, `or=(and(necessity.eq.optional,${FIELD}.eq.false),and(necessity.eq.required,${FIELD}.eq.true))`) },
};
console.log("verify columns:", JSON.stringify(after));
console.log("record_status on domain_data_objects before:", JSON.stringify(ddoStatusBefore));
console.log("record_status on domain_data_objects after: ", JSON.stringify(await get(`/${DDO}?select=record_status,count()`)));
console.log("users many_to_many in q3 set:", (await get(`/data_object_relationships?select=id&relationship_type=eq.many_to_many&id=in.(${ALL_IDS.join(",")})`)).length);
const check = await get("/domain_modules?select=domain_module_code,description,catalog_description&domain_module_code=in.(HIRING-STARTER,ATS-BACKGROUND-CHECKS)");
console.log("q6 applied:", check.find((m: any) => m.domain_module_code === "HIRING-STARTER").description === Q6_TEXT);
console.log("sentence reworded:", String(check.find((m: any) => m.domain_module_code === "ATS-BACKGROUND-CHECKS").catalog_description).includes(NEW_SENTENCE));
