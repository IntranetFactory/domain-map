#!/usr/bin/env bun
// scripts/analytics/be_spelling_sweep.ts
//
// Catalog-wide British-to-American spelling sweep and lint. American English is the only allowed dialect (CLAUDE.md
// "American English only"); this is the catalog-wide half of check B16.
//
// There is no hard-coded column list. It reads every table of the domain_map module from /entities and every column
// from /fields, then classifies each one (classifySpellingColumn in scripts/lib/british_spelling.ts), so a new column
// or table is covered the day it exists:
//   prose       description, notes, catalog copy, labels: a British word is patched on --write
//   identifier  names, codes, verbs, states, enums: reported, never changed (a rename cascades, a name may be a brand)
//   excluded    URL columns, computed labels, numbers, dates and references
// A British word inside an identifier token in prose (`retail_labour_schedules`) is reported, never patched.
//
// It also scans schema metadata: `entities` (description, labels) and `fields` (title, description). Those hits are
// reported only, because a schema write needs a reviewed script.
//
// Usage:
//   bun run scripts/analytics/be_spelling_sweep.ts            # dry-run: list every finding, exit 0
//   bun run scripts/analytics/be_spelling_sweep.ts --check    # the same, writes nothing, exit 1 on any finding
//   bun run scripts/analytics/be_spelling_sweep.ts --write    # patch the prose hits
//
// A clean catalog gives zero findings, so a nonzero run means something. Every write changes ONLY the spelling;
// record_status is never touched (Rule #1).

export {};

import { pg } from "../lib/catalog";
import {
  buildSpellingColumns,
  DOMAIN_MAP_MODULE_ID,
  fixBritishSpelling,
  scanBritishSpelling,
  scanSchemaMetadata,
  type SpellingHit,
} from "../lib/british_spelling";

const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");
if (WRITE && CHECK) {
  console.error("--write and --check cannot be combined");
  process.exit(2);
}

const PAGE = 1000;
async function allRows(table: string, select: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const page: Record<string, unknown>[] = (await pg("GET", `/${table}?select=${select}&order=id&limit=${PAGE}&offset=${offset}`)) ?? [];
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

const entities: any[] = await pg("GET", `/entities?module_id=eq.${DOMAIN_MAP_MODULE_ID}&select=table_name,computed_fields,description,singular_label,plural_label&order=table_name&limit=1000`);
const tables = entities.map((e) => e.table_name as string);
const fields: any[] = await pg("GET", `/fields?table_name=in.(${tables.join(",")})&select=id,table_name,field_name,format,ctype,title,description&limit=100000`);
const columns = buildSpellingColumns(entities, fields);

let cells = 0;
const hits: SpellingHit[] = [];
const patches: { table: string; id: number; body: Record<string, string> }[] = [];
for (const table of tables) {
  const { prose, identifier } = columns[table];
  const scanned = [...prose, ...identifier];
  if (scanned.length === 0) continue;
  const rows = await allRows(table, ["id", ...scanned].join(","));
  for (const r of rows) for (const c of scanned) if (typeof r[c] === "string" && r[c]) cells++;
  const found = scanBritishSpelling(table, rows, columns);
  hits.push(...found);
  const byRow = new Map(rows.map((r) => [r.id, r]));
  const rowPatch = new Map<number, Record<string, string>>();
  for (const h of found) {
    if (!h.autofix) continue;
    const body = rowPatch.get(h.id as number) ?? {};
    body[h.column] = fixBritishSpelling(byRow.get(h.id)![h.column] as string).fixed;
    rowPatch.set(h.id as number, body);
  }
  for (const [id, body] of rowPatch) patches.push({ table, id, body });
}
const metadata = scanSchemaMetadata(entities, fields);

for (const h of hits) console.log(`${h.autofix ? "FIX " : "REPORT"} ${h.table}.${h.column} id=${h.id}: ${h.hits.join(", ")}`);
for (const m of metadata) console.log(`METADATA ${m.table} ${m.id}.${m.column}: ${m.hits.join(", ")}`);

const count = (l: { hits: string[] }[]) => l.reduce((n, h) => n + h.hits.length, 0);
const sum = (key: "prose" | "identifier" | "excluded") => tables.reduce((n, t) => n + columns[t][key].length, 0);
const autofix = hits.filter((h) => h.autofix);
const report = hits.filter((h) => !h.autofix);
console.error(
  `\ncoverage: ${tables.length} tables, ${sum("prose")} prose and ${sum("identifier")} identifier columns scanned, ${sum("excluded")} excluded; ${cells} non-empty cells; ${entities.length} entities and ${fields.length} fields of schema metadata`,
);
console.error(`findings: ${count(autofix)} AUTOFIX on ${patches.length} row(s), ${count(report)} REPORT, ${count(metadata)} METADATA`);

const total = count(autofix) + count(report) + count(metadata);
if (CHECK) {
  console.error(total === 0 ? "check passed: no British spellings" : `check FAILED: ${total} British spelling(s)`);
  process.exit(total === 0 ? 0 : 1);
}
if (!WRITE) {
  console.error("dry-run: nothing written. Re-run with --write to patch the AUTOFIX hits, or --check to exit nonzero on any finding.");
  process.exit(0);
}

let written = 0;
let failed = 0;
for (const p of patches) {
  try {
    await pg("PATCH", `/${p.table}?id=eq.${p.id}`, p.body);
    written++;
  } catch (e) {
    failed++;
    console.error(`FAILED ${p.table} id=${p.id}: ${(e as Error).message}`);
  }
}
console.error(`wrote ${written}/${patches.length} row(s)${failed ? `, ${failed} failed` : ""} (record_status untouched)`);
