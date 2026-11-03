#!/usr/bin/env bun
// Rewrites 12 live metadata descriptions that still use names the persona and held_as rename retired.
// These overwrite existing text, so they need the user's approval (SKILL.md Rule #21). The old text goes to
// backups/ first. Each row must still contain its expected old text, or the script stops before any write.
// Dry-run by default; pass --apply to write.
import { existsSync, writeFileSync } from "node:fs";

type Row = Record<string, any>;
const APPLY = process.argv.includes("--apply");
const BACKUP = "backups/persona-held-as-description-fixes-2026-11-03.json";

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

const swap = (pairs: [string | RegExp, string][]) => (s: string) => pairs.reduce((out, [from, to]) => out.replace(from, to), s);
const PERSONA_WORDING = swap([[/\bthe role\b/g, "the persona"], [/\bthis role\b/g, "this persona"], [/\brole-union\b/g, "persona-union"], [/\bThe role\b/g, "The persona"]]);

const ENTITY_EDITS: { table: string; expect: string; to: (s: string) => string }[] = [
  { table: "personas", expect: "role_modules", to: swap([["role_modules", "persona_modules"]]) },
];
const FIELD_EDITS: { id: string; expect: string; to: (s: string) => string }[] = [
  { id: "process_raci.persona_id", expect: "actor_skill_id", to: swap([["actor_skill_id", "skill_id"]]) },
  { id: "process_raci.skill_id", expect: "actor_role_id", to: swap([["actor_role_id", "persona_id"]]) },
  { id: "persona_modules.persona_id", expect: "The role", to: PERSONA_WORDING },
  { id: "persona_modules.interaction_level", expect: "this role", to: PERSONA_WORDING },
  { id: "persona_modules.notes", expect: "this role", to: PERSONA_WORDING },
  { id: "persona_modules.domain_module_id", expect: "this role", to: PERSONA_WORDING },
  {
    id: "domain_data_objects.held_as",
    expect: "The domain's role with respect to this data object.",
    to: swap([["The domain's role with respect to this data object.", "How the domain holds this data object."], [/ — /g, ", "]]),
  },
  {
    id: "skills.skill_type",
    expect: "`role` skills",
    to: () => "`domain` skills mirror a Domain Map domain; `process` skills orchestrate cross-domain handoff clusters.",
  },
  { id: "skills.domain_id", expect: "role skills", to: () => "Optional; set for domain skills that mirror a specific Domain Map domain. Null for process skills." },
  { id: "skills.role_id", expect: "skill_type='role'", to: () => "Not used: no current skill type wraps a permission role." },
  {
    id: "data_object_relationships.relationship_kind",
    expect: "Structural role of the relationship",
    to: swap([["Structural role of the relationship", "Structural kind of the relationship"], ["loose link", "loose relationship"]]),
  },
];

const entities = await get(`/entities?table_name=in.(${ENTITY_EDITS.map((e) => e.table).join(",")})&select=table_name,description`);
const fields = await get(`/fields?id=in.(${FIELD_EDITS.map((f) => `"${f.id}"`).join(",")})&select=id,description`);
const plan: { kind: string; key: string; from: string; to: string }[] = [];
for (const e of ENTITY_EDITS) {
  const row = entities.find((x) => x.table_name === e.table);
  const from = String(row?.description ?? "");
  if (!from.includes(e.expect)) throw new Error(`entity ${e.table} no longer has: ${e.expect}`);
  plan.push({ kind: "entity", key: e.table, from, to: e.to(from) });
}
for (const f of FIELD_EDITS) {
  const row = fields.find((x) => x.id === f.id);
  const from = String(row?.description ?? "");
  if (!from.includes(f.expect)) throw new Error(`field ${f.id} no longer has: ${f.expect}`);
  plan.push({ kind: "field", key: f.id, from, to: f.to(from) });
}
for (const p of plan) console.log(`\n${p.key}\n  old: ${p.from}\n  new: ${p.to}`);
if (plan.some((p) => p.to.includes("—"))) throw new Error("a new text contains an em-dash");
if (!APPLY) {
  console.log(`\n${plan.length} rows. No writes (dry-run).`);
  process.exit(0);
}
if (existsSync(BACKUP)) throw new Error(`${BACKUP} already exists; refusing to overwrite`);
writeFileSync(BACKUP, JSON.stringify({ taken_at: new Date().toISOString(), plan }, null, 1));
for (const p of plan) {
  if (p.kind === "entity") await semantius("update_entity", { table_name: p.key, data: { description: p.to } });
  else await semantius("update_field", { id: p.key, data: { description: p.to } });
}
console.log(`\nwrote ${plan.length} rows; old text is in ${BACKUP}`);
