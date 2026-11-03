#!/usr/bin/env bun
// Second round of the 2026-11-03 British spelling fixes, approved by the project owner: the schema metadata hits
// (fields.description, plus anything else the wider scan finds) and the catalog words the owner added (towards,
// telecoms, wellbeing). Spelling only. record_status is never sent.
//
// Dry-run by default; --apply writes, after backing up every old value to backups/. It reads every target first, and
// reads every target back afterward.
import { existsSync, writeFileSync } from "node:fs";
import { buildSpellingColumns, DOMAIN_MAP_MODULE_ID, fixBritishSpelling, scanBritishSpelling, scanSchemaMetadata } from "../scripts/lib/british_spelling";

const APPLY = process.argv.includes("--apply");
const BACKUP = "backups/british-spelling-round2-2026-11-03.json";
const EM_DASH = String.fromCharCode(0x2014);

async function semantius(tool: string, body: unknown): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`semantius ${tool} failed: ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const get = (path: string): Promise<any[]> => semantius("postgrestRequest", { method: "GET", path });

const entities = await get(`/entities?module_id=eq.${DOMAIN_MAP_MODULE_ID}&select=table_name,computed_fields,description,singular_label,plural_label&order=table_name&limit=1000`);
const tables = entities.map((e) => e.table_name as string);
const fields = await get(`/fields?table_name=in.(${tables.join(",")})&select=id,table_name,field_name,format,ctype,title,description&limit=100000`);
const columns = buildSpellingColumns(entities, fields);

// ---------- schema metadata ----------
const spell = (s: string) => {
  // Whole words only, including identifier tokens: metadata text is documentation, so a token there is plain text.
  return fixBritishSpelling(s).fixed;
};
type Meta = { kind: "entity" | "field"; key: string; column: string; from: string; to: string };
const metaPlan: Meta[] = [];
for (const m of scanSchemaMetadata(entities, fields)) {
  const row = m.table === "entities" ? entities.find((e) => e.table_name === m.id) : fields.find((f) => f.id === m.id);
  const from = String(row?.[m.column] ?? "");
  const to = spell(from);
  if (to === from) throw new Error(`${m.id}.${m.column}: the hit is inside an identifier token, review by hand: ${m.hits.join(", ")}`);
  metaPlan.push({ kind: m.table === "entities" ? "entity" : "field", key: m.id, column: m.column, from, to });
}

// ---------- catalog rows ----------
type Cell = { table: string; id: number; column: string; from: string; to: string };
const cellPlan: Cell[] = [];
for (const table of tables) {
  const { prose, identifier } = columns[table];
  if (!prose.length && !identifier.length) continue;
  const rows: any[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await get(`/${table}?select=${["id", ...prose, ...identifier].join(",")}&order=id&limit=1000&offset=${offset}`);
    rows.push(...page);
    if (page.length < 1000) break;
  }
  for (const h of scanBritishSpelling(table, rows, columns)) {
    if (!h.autofix) throw new Error(`${table} ${h.id} ${h.column}: an identifier hit needs a reviewed rename: ${h.hits.join(", ")}`);
    const from = rows.find((r) => r.id === h.id)[h.column] as string;
    cellPlan.push({ table, id: h.id as number, column: h.column, from, to: fixBritishSpelling(from).fixed });
  }
}

const show = (s: string) => s.replaceAll(EM_DASH, "--");
for (const m of metaPlan) console.log(`${m.kind} ${m.key}.${m.column}\n  old: ${show(m.from).slice(0, 220)}\n  new: ${show(m.to).slice(0, 220)}`);
for (const c of cellPlan) console.log(`${c.table} ${c.id} ${c.column}\n  old: ${show(c.from).slice(0, 220)}\n  new: ${show(c.to).slice(0, 220)}`);
console.log(`\n${metaPlan.length} metadata cells, ${cellPlan.length} catalog cells.`);
if (!APPLY) {
  console.log("No writes (dry-run).");
  process.exit(0);
}

if (existsSync(BACKUP)) throw new Error(`${BACKUP} already exists; refusing to overwrite`);
writeFileSync(BACKUP, JSON.stringify({ taken_at: new Date().toISOString(), metadata: metaPlan, cells: cellPlan }, null, 1).replaceAll(EM_DASH, "\\u2014") + "\n");
for (const m of metaPlan) {
  if (m.kind === "entity") await semantius("update_entity", { table_name: m.key, data: { [m.column]: m.to } });
  else await semantius("update_field", { id: m.key, data: { [m.column]: m.to } });
}
for (const c of cellPlan) {
  const result = await semantius("postgrestRequest", { method: "PATCH", path: `/${c.table}?id=eq.${c.id}`, body: { [c.column]: c.to } });
  if (result.length !== 1) throw new Error(`${c.table} ${c.id}: expected 1 row back, got ${result.length}`);
}

const entitiesAfter = await get(`/entities?module_id=eq.${DOMAIN_MAP_MODULE_ID}&select=table_name,description,singular_label,plural_label&limit=1000`);
const fieldsAfter = await get(`/fields?table_name=in.(${tables.join(",")})&select=id,title,description&limit=100000`);
const wrong: string[] = [];
for (const m of metaPlan) {
  const row = m.kind === "entity" ? entitiesAfter.find((e) => e.table_name === m.key) : fieldsAfter.find((f) => f.id === m.key);
  if (row?.[m.column] !== m.to) wrong.push(`${m.key}.${m.column}: ${row?.[m.column]}`);
}
for (const c of cellPlan) {
  const [row] = await get(`/${c.table}?id=eq.${c.id}&select=${c.column}`);
  if (row?.[c.column] !== c.to) wrong.push(`${c.table} ${c.id} ${c.column}: ${row?.[c.column]}`);
}
if (wrong.length) {
  console.error(`${wrong.length} values do not match:\n${wrong.join("\n")}`);
  process.exit(1);
}
console.log(`verified: ${metaPlan.length} metadata cells and ${cellPlan.length} catalog cells read back as written; old values in ${BACKUP}`);
