#!/usr/bin/env bun
/**
 * enum_drift_probe.ts — Step C / Rule #13 enum-drift check (plan-1-consistency.md).
 *
 * The live Semantius `/fields` definitions are the only source of truth for catalog enum
 * vocabularies. The Rule #13 table in SKILL.md is a convenience cache, not hand-authored
 * truth; this probe re-derives each listed enum from live and fails loudly if the
 * hand-maintained copy disagrees. It also lists live enums absent from the table
 * (informational, with --list). This subsumes the audit's B6 false positive, which came from
 * trusting a stale loader array instead of live.
 *
 * Usage (from project root):
 *   bun run scripts/analytics/enum_drift_probe.ts
 *   bun run scripts/analytics/enum_drift_probe.ts --list   # also list live enums not in the table
 *
 * Exit 1 if any Rule #13 row disagrees with live.
 */
export {};

import { readFileSync } from "node:fs";
import { argv } from "node:process";

const LIST = argv.includes("--list");
const SKILL_PATH = ".claude/skills/domain-map-analyst/SKILL.md";

async function postgrest(method: string, path: string): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify({ method, path })),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path}: ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

// ----- live enums (the source of truth) -----
const liveFields: any[] = (await postgrest("GET", "/fields?format=eq.enum&select=table_name,field_name,enum_values")) ?? [];
const liveByKey = new Map<string, Set<string>>();                              // "table.field" -> values
const liveByField = new Map<string, { key: string; values: Set<string> }[]>(); // "field" -> list (for *.field rows)
for (const f of liveFields) {
  const key = `${f.table_name}.${f.field_name}`;
  const vals = new Set<string>((f.enum_values ?? []).map((v: any) => String(v)));
  liveByKey.set(key, vals);
  const arr = liveByField.get(f.field_name) ?? [];
  arr.push({ key, values: vals });
  liveByField.set(f.field_name, arr);
}

// ----- parse the Rule #13 table from SKILL.md -----
const md = readFileSync(SKILL_PATH, "utf8").split(/\r?\n/);
const backticks = (s: string) => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]);

let inSection = false;
type TableRow = { fields: string[]; values: string[] };
const tableRows: TableRow[] = [];
for (const line of md) {
  if (/^###\s+13\.\s/.test(line)) { inSection = true; continue; }
  if (inSection && /^###?\s/.test(line)) break; // the next heading ends the section
  if (!inSection || !line.trim().startsWith("|")) continue;
  const cells = line.split("|").slice(1, -1).map((c) => c.trim());
  if (cells.length < 2) continue;
  if (/^-+$/.test(cells[0].replace(/\s/g, ""))) continue;          // separator row
  if (cells[0].toLowerCase().startsWith("table.field")) continue;  // header row
  const fields = backticks(cells[0]);
  const values = backticks(cells[1]);
  if (fields.length === 0 || values.length === 0) continue;
  tableRows.push({ fields, values });
}

// ----- compare (live wins; the table is the thing that can drift) -----
const setEq = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x));
const drift: string[] = [];
const checkedKeys = new Set<string>();

for (const row of tableRows) {
  const listed = new Set(row.values);
  for (const field of row.fields) {
    if (field.startsWith("*.")) {
      // wildcard: every live field with this field_name must match the listed set
      const fname = field.slice(2);
      const matches = liveByField.get(fname) ?? [];
      if (matches.length === 0) { drift.push(`${field}: no live enum field named '${fname}'`); continue; }
      for (const m of matches) {
        checkedKeys.add(m.key);
        if (!setEq(listed, m.values)) {
          drift.push(`${m.key} (via ${field}): listed {${[...listed].sort().join(", ")}} vs live {${[...m.values].sort().join(", ")}}`);
        }
      }
      continue;
    }
    const live = liveByKey.get(field);
    if (!live) { drift.push(`${field}: not a live enum field (renamed/removed, or the table row is stale)`); continue; }
    checkedKeys.add(field);
    if (!setEq(listed, live)) {
      const missing = [...live].filter((v) => !listed.has(v));
      const extra = [...listed].filter((v) => !live.has(v));
      const parts: string[] = [];
      if (missing.length) parts.push(`missing from table: ${missing.join(", ")}`);
      if (extra.length) parts.push(`not in live: ${extra.join(", ")}`);
      drift.push(`${field}: ${parts.join("; ")}`);
    }
  }
}

console.log(`enum-drift probe: ${tableRows.length} Rule #13 rows checked against ${liveFields.length} live enum fields`);
if (drift.length > 0) {
  console.error(`\n${drift.length} enum-drift issue(s). Live /fields is the source of truth; fix the Rule #13 table:`);
  for (const d of drift) console.error(`  - ${d}`);
} else {
  console.log("no drift: every Rule #13 row matches live");
}

if (LIST) {
  const uncovered = [...liveByKey.keys()].filter((k) => !checkedKeys.has(k)).sort();
  console.log(`\nlive enum fields not in the Rule #13 table (${uncovered.length}), informational:`);
  for (const k of uncovered) console.log(`  ${k}: ${[...liveByKey.get(k)!].join(", ")}`);
}

process.exit(drift.length > 0 ? 1 : 0);
