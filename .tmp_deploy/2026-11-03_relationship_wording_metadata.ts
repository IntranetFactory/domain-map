#!/usr/bin/env bun
// Last pass of "every relationship must be named relationship" (user decision 2026-11-03, "leave nothing"): schema
// metadata in the domain_map module, plus one line in the domain skill template and its rendered copies. Every
// replacement must find its old text, or the script stops before any write. Old values go to backups/ first.
// Dry-run by default; pass --apply to write.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

type Row = Record<string, any>;
type Pair = [string, string];
const APPLY = process.argv.includes("--apply");
const BACKUP = "backups/relationship-wording-metadata-2026-11-03.json";

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

const JUNCTION: Pair = ["Junction table connecting", "Junction table relating"];
const ENTITIES: { table: string; column: string; pairs: Pair[] }[] = [
  { table: "process_raci", column: "description", pairs: [["assignment linking a process", "assignment relating a process"], ["a domain_role persona", "a persona"]] },
  { table: "business_function_domains", column: "description", pairs: [JUNCTION] },
  { table: "industry_business_functions", column: "description", pairs: [JUNCTION] },
  { table: "domain_data_objects", column: "description", pairs: [JUNCTION] },
  { table: "solution_domains", column: "description", pairs: [JUNCTION] },
  { table: "business_function_capabilities", column: "description", pairs: [JUNCTION] },
  { table: "capability_domains", column: "description", pairs: [JUNCTION] },
  { table: "domain_modules", column: "description", pairs: [["lifecycle states, edges, and tool surface", "lifecycle states, relationships, and tool surface"]] },
  { table: "handoff_processes", column: "singular_label", pairs: [["Handoff Process Link", "Handoff Process"]] },
  { table: "handoff_processes", column: "plural_label", pairs: [["Handoff Process Links", "Handoff Processes"]] },
  {
    table: "handoff_processes",
    column: "description",
    pairs: [["Links a directional event-driven handoff", "Relates a directional event-driven handoff"], ["discovery and connects handoffs across", "discovery and relates handoffs across"]],
  },
  { table: "solutions", column: "description", pairs: [["vendor-supplied products link to their vendor", "vendor-supplied products relate to their vendor"]] },
  { table: "trigger_events", column: "description", pairs: [["on the per-edge handoff row", "on the handoff row"]] },
  { table: "tool_solutions", column: "description", pairs: [["A junction record linking one Tool", "A junction record relating one Tool"]] },
  { table: "process_tools", column: "description", pairs: [["(linked via `skills.process_id`)", "(related via `skills.process_id`)"]] },
];
const FIELDS: { id: string; column: string; pairs: Pair[] }[] = [
  { id: "handoff_processes.label", column: "title", pairs: [["Handoff Process Link", "Handoff Process"]] },
  { id: "data_object_relationships.owner_side", column: "description", pairs: [["The parent side of the link:", "The parent side of the relationship:"]] },
  { id: "data_object_lifecycle_states.process_id", column: "description", pairs: [["the process-to-permission edge", "the process-to-permission relationship"]] },
  { id: "data_objects.entity_type", column: "description", pairs: [["junction (N:M link,", "junction (N:M relationship,"]] },
  { id: "data_objects.notes", column: "description", pairs: [["has no edges to other masters", "has no relationships to other masters"]] },
  { id: "handoff_processes.handoff_id", column: "description", pairs: [["The handoff edge being linked to a process activity.", "The handoff being related to a process activity."]] },
  { id: "handoffs.key", column: "description", pairs: [["natural key for the handoff edge:", "natural key for the handoff:"]] },
  { id: "domain_module_data_objects.is_install_optional", column: "description", pairs: [["whether a link's field", "whether a relationship's field"]] },
  { id: "domain_data_objects.is_install_optional", column: "description", pairs: [["whether a link's field", "whether a relationship's field"]] },
  { id: "data_object_relationships.is_required", column: "description", pairs: [["True when a link's field", "True when a relationship's field"], ["A required link to an absent entity", "A required relationship to an absent entity"]] },
];
const OLD_TEMPLATE_LINE = "Intra-domain relationships and edges to platform built-ins";
const NEW_TEMPLATE_LINE = "Intra-domain relationships and relationships to platform built-ins";

const apply = (s: string, pairs: Pair[], where: string): string => {
  let out = s;
  for (const [from, to] of pairs) {
    if (!out.includes(from)) throw new Error(`${where} no longer has: ${from}`);
    out = out.replace(from, to);
  }
  return out.replace(/ — /g, ", ");
};

const entityRows = await get(`/entities?table_name=in.(${[...new Set(ENTITIES.map((e) => e.table))].join(",")})&select=table_name,description,singular_label,plural_label`);
const fieldRows = await get(`/fields?id=in.(${FIELDS.map((f) => `"${f.id}"`).join(",")})&select=id,title,description`);
const plan: { kind: "entity" | "field"; key: string; column: string; from: string; to: string }[] = [];
for (const e of ENTITIES) {
  const row = entityRows.find((r) => r.table_name === e.table);
  const from = String(row?.[e.column] ?? "");
  plan.push({ kind: "entity", key: e.table, column: e.column, from, to: apply(from, e.pairs, `${e.table}.${e.column}`) });
}
for (const f of FIELDS) {
  const row = fieldRows.find((r) => r.id === f.id);
  const from = String(row?.[f.column] ?? "");
  plan.push({ kind: "field", key: f.id, column: f.column, from, to: apply(from, f.pairs, `${f.id}.${f.column}`) });
}

const templateFiles = ["catalog/domain-skill-template/SKILL.md", ...readdirSync("catalog/skills").map((d) => `catalog/skills/${d}/SKILL.md`)].filter((f) => existsSync(f) && readFileSync(f, "utf8").includes(OLD_TEMPLATE_LINE));
const WORD = /\b(link|links|linked|linking|linkage|edge|edges|connecting|connection|connections)\b/i;
for (const p of plan) {
  if (p.to.includes("—")) throw new Error(`${p.key}.${p.column} still has an em-dash`);
  const left = p.to.match(WORD)?.[0];
  console.log(`${p.key}.${p.column}${left ? ` (still contains "${left}")` : ""}`);
}
console.log(`\n${plan.length} metadata cells, ${templateFiles.length} template files.`);
if (!APPLY) {
  console.log("No writes (dry-run).");
  process.exit(0);
}
if (existsSync(BACKUP)) throw new Error(`${BACKUP} already exists; refusing to overwrite`);
writeFileSync(BACKUP, JSON.stringify({ taken_at: new Date().toISOString(), plan }, null, 1));
for (const p of plan) {
  if (p.kind === "entity") await semantius("update_entity", { table_name: p.key, data: { [p.column]: p.to } });
  else await semantius("update_field", { id: p.key, data: { [p.column]: p.to } });
}
for (const f of templateFiles) writeFileSync(f, readFileSync(f, "utf8").replace(OLD_TEMPLATE_LINE, NEW_TEMPLATE_LINE));
const after = await get(`/entities?table_name=in.(${[...new Set(ENTITIES.map((e) => e.table))].join(",")})&select=table_name,description,singular_label,plural_label`);
const afterFields = await get(`/fields?id=in.(${FIELDS.map((f) => `"${f.id}"`).join(",")})&select=id,title,description`);
const wrong = plan.filter((p) => {
  const row = p.kind === "entity" ? after.find((r) => r.table_name === p.key) : afterFields.find((r) => r.id === p.key);
  return row?.[p.column] !== p.to;
});
console.log(wrong.length ? `MISMATCH: ${wrong.map((w) => `${w.key}.${w.column}`).join(", ")}` : `verified: ${plan.length} cells match; old values in ${BACKUP}`);
process.exit(wrong.length ? 1 : 0);
