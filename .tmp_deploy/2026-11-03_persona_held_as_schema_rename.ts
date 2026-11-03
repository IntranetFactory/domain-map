#!/usr/bin/env bun
// Renames the persona tables and fields and the module-entity `role` columns, approved by the user on 2026-11-03:
//   domain_roles -> personas (role_code -> persona_code, role_name -> persona_name)
//   role_modules -> persona_modules (role_id -> persona_id, role_module_label -> persona_module_label)
//   process_raci.actor_role_id -> persona_id, process_raci.actor_skill_id -> skill_id
//   domain_data_objects.role and domain_module_data_objects.role -> held_as
//   data_object_relationships gains persona_id (optional, only on relationships to users)
// Only names change: ids and row values stay. A throwaway test showed a field rename leaves the old names inside
// computed labels and rules, so those are rewritten straight after the renames. Run it with no other catalog writes
// in progress. Every step skips itself when already done. Dry-run by default; pass --apply to write.
import { writeFileSync, existsSync } from "node:fs";

type Row = Record<string, any>;
const APPLY = process.argv.includes("--apply");
const BACKUP = "backups/persona-held-as-rename-2026-11-03.json";
const USERS = 748;

const TABLES = [
  { from: "domain_roles", to: "personas", singular: "persona", singular_label: "Persona", plural_label: "Personas" },
  { from: "role_modules", to: "persona_modules", singular: "persona_module", singular_label: "Persona Module", plural_label: "Persona Modules" },
];
const FIELDS = [
  { table: "personas", from: "role_name", to: "persona_name", title: "Persona" },
  { table: "personas", from: "role_code", to: "persona_code", title: "Persona Code" },
  { table: "persona_modules", from: "role_id", to: "persona_id", title: "Persona" },
  { table: "persona_modules", from: "role_module_label", to: "persona_module_label", title: "Persona Module" },
  { table: "process_raci", from: "actor_role_id", to: "persona_id", title: "Persona" },
  { table: "process_raci", from: "actor_skill_id", to: "skill_id", title: "Skill" },
  { table: "domain_data_objects", from: "role", to: "held_as", title: "Held As" },
  { table: "domain_module_data_objects", from: "role", to: "held_as", title: "Held As" },
];
// Word boundaries matter: the platform's own `roles` entity has catalog_role_code, which is not one of these.
const OLD_TOKENS = /\b(domain_roles|role_modules|role_code|actor_role_id|actor_skill_id|role_module_label)\b|"var":"(\w+\.)?role(_id)?"/;
const EXPECTED_RULE_TABLES = new Set(["process_raci", "role_modules", "domain_module_data_objects"]);

async function semantius(tool: string, body: unknown): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`semantius ${tool} failed: ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const get = (path: string): Promise<Row[]> => semantius("postgrestRequest", { method: "GET", path });
const patch = (path: string, body: Row) => semantius("postgrestRequest", { method: "PATCH", path, body });
async function all(path: string): Promise<Row[]> {
  const out: Row[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await get(`${path}${path.includes("?") ? "&" : "?"}limit=1000&offset=${offset}`);
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

// Exact-identifier rewrite of a rule or computed-label array. Text, not structure, so nothing else in it can change.
function rewrite(value: unknown, pairs: [RegExp, string][]): any {
  let s = JSON.stringify(value);
  for (const [re, to] of pairs) s = s.replace(re, to);
  return JSON.parse(s);
}
const RACI_PAIRS: [RegExp, string][] = [
  [/actor_role_id/g, "persona_id"],
  [/actor_skill_id/g, "skill_id"],
  [/"domain_roles"/g, '"personas"'],
  [/r\.role_code/g, "r.persona_code"],
  [/a domain role or a skill/g, "a persona or a skill"],
];
const MODULE_PAIRS: [RegExp, string][] = [
  [/"domain_roles"/g, '"personas"'],
  [/"var":"role_id"/g, '"var":"persona_id"'],
  [/r\.role_code/g, "r.persona_code"],
  [/role_module_label/g, "persona_module_label"],
  [/<role_code>/g, "<persona_code>"],
];
const HELD_PAIRS: [RegExp, string][] = [
  [/"var":"role"/g, '"var":"held_as"'],
  [/\(role must be/g, "(held_as must be"],
];

const PERSONA_RULE = {
  code: "99102",
  name: "persona_only_on_users_relationship",
  message: "Only a relationship to users can name a persona.",
  description: "The persona is the kind of person who fills this relationship to users.",
  jsonlogic: { or: [{ "==": [{ var: "persona_id" }, null] }, { "==": [{ var: "data_object_id" }, USERS] }, { "==": [{ var: "related_data_object_id" }, USERS] }] },
};
const relationshipRules = (rules: Row[]): Row[] => [
  ...rules.filter((r) => r.code !== PERSONA_RULE.code).map((r) =>
    r.code === "99101"
      ? {
          ...r,
          name: "users_relationship_is_not_many_to_many_reference",
          message: "A reference to users is one person per record. Use one one_to_many relationship from users for each kind of person, or a junction entity or an association for a genuine panel or team.",
          description: "Check B7b. A row-scope rule needs a single owner, and each relationship to users holds one person.",
        }
      : r,
  ),
  PERSONA_RULE,
];

// ---------- read the current state ----------
const entities = await all("/entities?select=*");
const byTable = new Map(entities.map((e) => [e.table_name, e]));
const fields = await all("/fields?select=*");
const isDone = TABLES.every((t) => byTable.has(t.to)) && !TABLES.some((t) => byTable.has(t.from));
const liveName = (name: string) => (byTable.has(name) ? name : TABLES.find((t) => t.to === name && byTable.has(t.from))?.from ?? TABLES.find((t) => t.from === name)?.to ?? name);

for (const t of TABLES) {
  if (byTable.has(t.from) && byTable.has(t.to)) throw new Error(`both ${t.from} and ${t.to} exist`);
  if (!byTable.has(t.from) && !byTable.has(t.to)) throw new Error(`neither ${t.from} nor ${t.to} exists`);
}
console.log(`state: ${isDone ? "tables already renamed" : "tables not renamed yet"}`);

// Anything else that reads the old names would break silently, so refuse to go on until it is on the list.
const surprises: string[] = [];
for (const e of entities) {
  const { table_name, ...rest } = e;
  if (OLD_TOKENS.test(JSON.stringify({ c: rest.computed_fields, v: rest.validation_rules, s: rest.select_rule })) && !EXPECTED_RULE_TABLES.has(table_name)) surprises.push(`entity ${table_name}`);
}
for (const f of fields) {
  const { id, table_name, field_name, ...rest } = f;
  if (OLD_TOKENS.test(JSON.stringify({ i: rest.input_type_rule, r: rest.reference_table }))) {
    const known = (f.reference_table === "domain_roles" && ["actor_role_id", "role_id"].includes(field_name));
    if (!known) surprises.push(`field ${id}`);
  }
}
console.log(`other readers of the old names: ${surprises.length ? surprises.join(", ") : "none"}`);
const codes = entities.flatMap((e) => (e.validation_rules ?? []).map((r: Row) => `${r.code}:${e.table_name}`));
const taken = codes.filter((c) => c.startsWith(`${PERSONA_RULE.code}:`) && !c.endsWith(":data_object_relationships"));
if (taken.length) throw new Error(`rule code ${PERSONA_RULE.code} is already used: ${taken.join(", ")}`);

// ---------- what the rules become ----------
const raciEntity = byTable.get("process_raci")!;
const moduleEntity = byTable.get(liveName("persona_modules"))!;
const dmdoEntity = byTable.get("domain_module_data_objects")!;
const relEntity = byTable.get("data_object_relationships")!;
const next = {
  raci: { computed_fields: rewrite(raciEntity.computed_fields, RACI_PAIRS), validation_rules: rewrite(raciEntity.validation_rules, RACI_PAIRS) },
  modules: { computed_fields: rewrite(moduleEntity.computed_fields, MODULE_PAIRS) },
  dmdo: { validation_rules: rewrite(dmdoEntity.validation_rules, HELD_PAIRS) },
  rel: { validation_rules: relationshipRules(relEntity.validation_rules ?? []) },
};
for (const [label, value] of Object.entries(next)) {
  const s = JSON.stringify(value);
  console.log(`\nnew ${label}: ${s}`);
  if (OLD_TOKENS.test(s)) throw new Error(`${label} still names an old identifier`);
}

if (!APPLY) {
  console.log("\nplan: rename 2 tables, 8 fields; rewrite 4 entities' rules and labels; add data_object_relationships.persona_id. No writes (dry-run).");
  process.exit(surprises.length ? 1 : 0);
}
if (surprises.length) throw new Error("other readers of the old names exist; add them to this script first");

// ---------- back up ----------
const ROW_TABLES = [
  { old: "domain_roles", now: liveName("domain_roles") },
  { old: "role_modules", now: liveName("role_modules") },
  { old: "process_raci", now: "process_raci" },
  { old: "domain_data_objects", now: "domain_data_objects" },
  { old: "domain_module_data_objects", now: "domain_module_data_objects" },
];
if (!isDone) {
  if (existsSync(BACKUP)) throw new Error(`${BACKUP} already exists; refusing to overwrite`);
  const rows: Record<string, Row[]> = {};
  for (const t of ROW_TABLES) rows[t.old] = await all(`/${t.now}?select=*&order=id`);
  const names = [...ROW_TABLES.map((t) => t.now), "data_object_relationships"];
  writeFileSync(BACKUP, JSON.stringify({ taken_at: new Date().toISOString(), entities: entities.filter((e) => names.includes(e.table_name)), fields: fields.filter((f) => names.includes(f.table_name)), rows }, null, 1));
  console.log(`\nbacked up to ${BACKUP}`);
}

// ---------- rename, then rewrite rules straight away ----------
for (const t of TABLES) {
  if (byTable.has(t.from)) {
    await semantius("update_entity", { table_name: t.from, data: { table_name: t.to, singular: t.singular, singular_label: t.singular_label, plural_label: t.plural_label } });
    console.log(`renamed table ${t.from} -> ${t.to}`);
  }
}
const liveFields = await all("/fields?select=id,table_name,field_name");
const has = (table: string, field: string) => liveFields.some((f) => f.table_name === table && f.field_name === field);
for (const f of FIELDS) {
  if (has(f.table, f.from)) {
    await semantius("update_field", { id: `${f.table}.${f.from}`, data: { field_name: f.to, title: f.title } });
    console.log(`renamed field ${f.table}.${f.from} -> ${f.to}`);
  }
}
await semantius("update_entity", { table_name: "process_raci", data: next.raci });
await semantius("update_entity", { table_name: "persona_modules", data: next.modules });
await semantius("update_entity", { table_name: "domain_module_data_objects", data: next.dmdo });
console.log("rewrote rules and computed labels");

// ---------- the new column and its rule ----------
if (!has("data_object_relationships", "persona_id")) {
  await semantius("create_field", {
    data: {
      table_name: "data_object_relationships",
      field_name: "persona_id",
      title: "Persona",
      description: "The kind of person who fills this relationship to users. Empty on every other relationship.",
      format: "reference",
      reference_table: "personas",
      reference_delete_mode: "clear",
    },
  });
  console.log("added data_object_relationships.persona_id");
}
await semantius("update_entity", { table_name: "data_object_relationships", data: next.rel });
console.log("updated data_object_relationships rules");

// ---------- verify against the backup ----------
const backup = JSON.parse(await Bun.file(BACKUP).text());
const problems: string[] = [];
const COLUMN_MAP: Record<string, Record<string, string>> = {
  domain_roles: { role_name: "persona_name", role_code: "persona_code" },
  role_modules: { role_id: "persona_id", role_module_label: "persona_module_label" },
  process_raci: { actor_role_id: "persona_id", actor_skill_id: "skill_id" },
  domain_data_objects: { role: "held_as" },
  domain_module_data_objects: { role: "held_as" },
};
const NEW_NAME: Record<string, string> = { domain_roles: "personas", role_modules: "persona_modules" };
for (const [old, before] of Object.entries(backup.rows) as [string, Row[]][]) {
  const now = NEW_NAME[old] ?? old;
  const after = await all(`/${now}?select=*&order=id`);
  if (after.length !== before.length) problems.push(`${now}: ${before.length} rows before, ${after.length} after`);
  const byId = new Map(after.map((r) => [r.id, r]));
  for (const b of before) {
    const a = byId.get(b.id);
    if (!a) {
      problems.push(`${now} ${b.id} missing`);
      continue;
    }
    for (const [k, v] of Object.entries(b)) {
      if (["updated_at", "search_vector"].includes(k)) continue;
      const key = COLUMN_MAP[old]?.[k] ?? k;
      if (JSON.stringify(a[key]) !== JSON.stringify(v)) problems.push(`${now} ${b.id}.${key}: ${JSON.stringify(v)} -> ${JSON.stringify(a[key])}`);
    }
  }
}

// A same-value write proves the labels recompute correctly and the rules accept a real row.
const probes: [string, string][] = [
  ["process_raci", "raci"],
  ["persona_modules", "interaction_level"],
  ["personas", "description"],
  ["domain_module_data_objects", "held_as"],
  ["domain_data_objects", "held_as"],
];
for (const [table, column] of probes) {
  const [row] = await get(`/${table}?select=*&order=id&limit=1`);
  const [written] = await patch(`/${table}?id=eq.${row.id}`, { [column]: row[column] });
  for (const [k, v] of Object.entries(row)) {
    if (["updated_at", "search_vector"].includes(k)) continue;
    if (JSON.stringify((written as Row)[k]) !== JSON.stringify(v)) problems.push(`probe ${table} ${row.id}.${k}: ${JSON.stringify(v)} -> ${JSON.stringify((written as Row)[k])}`);
  }
}
const [usersRel] = await get(`/data_object_relationships?data_object_id=eq.${USERS}&select=id,is_required&order=id&limit=1`);
await patch(`/data_object_relationships?id=eq.${usersRel.id}`, { is_required: usersRel.is_required });

console.log(problems.length ? `\nPROBLEMS (${problems.length}):\n${problems.slice(0, 40).join("\n")}` : "\nverified: every row matches the backup, labels recompute, rules accept writes");
process.exit(problems.length ? 1 : 0);
