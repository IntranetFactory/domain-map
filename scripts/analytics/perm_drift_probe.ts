#!/usr/bin/env bun
// scripts/analytics/perm_drift_probe.ts
//
// One-off decision-support probe (see plans/extract-role-permission-catalog.md).
//
// Question: how far has the MATERIALIZED permission set in `_core.permissions`
// (written by loaders over weeks) drifted from the DERIVED permission set the
// blueprint generator produces from current catalog state?
//
// Method:
//   1. Pull every `_core.permissions` row with domain_module_id set (catalog perms).
//   2. Pick the 3 modules with the most materialized permissions.
//   3. For each, regenerate its blueprint with the REAL emitter (--no-cache) so the
//      derived set reflects current catalog, then parse the derived permission codes
//      out of section 8.
//   4. Diff derived vs materialized and report per-module deltas.
//
// Read-only against `_core`. Side effect: regenerates 3 blueprint files in
// catalog/blueprints/ (already-tracked files; current-catalog content).

export {};

import { readFileSync, existsSync } from "node:fs";
import { pg } from "../lib/catalog";

function moduleSlug(code: string): string {
  return code.toLowerCase().replace(/_/g, "-");
}

// ---- 1. materialized catalog permissions ----
const rows: Array<{ permission_name: string; tier: string | null; domain_module_id: number }> =
  await pg(
    "GET",
    "/permissions?domain_module_id=not.is.null&select=permission_name,tier,domain_module_id&limit=50000",
  );

const byMod = new Map<number, Set<string>>();
for (const r of rows) {
  if (!byMod.has(r.domain_module_id)) byMod.set(r.domain_module_id, new Set());
  byMod.get(r.domain_module_id)!.add(r.permission_name);
}

console.log(`materialized catalog permissions: ${rows.length} rows across ${byMod.size} modules`);

// ---- 2. top 3 modules by materialized permission count ----
const top3 = [...byMod.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 3);
const ids = top3.map(([id]) => id);
const mods: Array<{ id: number; domain_module_code: string }> = await pg(
  "GET",
  `/domain_modules?id=in.(${ids.join(",")})&select=id,domain_module_code`,
);
const codeById = new Map(mods.map((m) => [m.id, m.domain_module_code]));

console.log("\ntop 3 modules by materialized permission count:");
for (const [id, set] of top3) console.log(`  ${codeById.get(id) ?? `#${id}`} (id ${id}): ${set.size} materialized`);

// ---- 3 + 4. regenerate + parse derived, then diff ----
function deriveFromBlueprint(code: string): Set<string> {
  const slug = moduleSlug(code);
  const path = `catalog/blueprints/${slug}-semantic-blueprint.md`;
  if (!existsSync(path)) throw new Error(`blueprint not found after emit: ${path}`);
  const md = readFileSync(path, "utf8");
  const lines = md.split("\n");
  const out = new Set<string>();
  let inSec8 = false;
  for (const line of lines) {
    if (/^##\s+8\./.test(line)) { inSec8 = true; continue; }
    if (inSec8 && /^##\s+(?!8\.)/.test(line)) break; // next top-level section ends 8
    if (!inSec8) continue;
    const m = line.match(/^\|\s*`([^`]+)`\s*\|/); // first table cell only
    if (m && m[1].includes(":")) out.add(m[1]);
  }
  return out;
}

async function emit(code: string): Promise<void> {
  const proc = Bun.spawn(["bun", "run", "scripts/emit_fact_sheet.ts", "--module", code, "--no-cache"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exit = await proc.exited;
  if (exit !== 0) throw new Error(`emit ${code} failed: ${stderr}`);
}

for (const [id, matSet] of top3) {
  const code = codeById.get(id);
  if (!code) { console.log(`\n!! no module code for id ${id}`); continue; }
  await emit(code);
  const derSet = deriveFromBlueprint(code);

  const both = [...derSet].filter((c) => matSet.has(c)).sort();
  const derOnly = [...derSet].filter((c) => !matSet.has(c)).sort();
  const matOnly = [...matSet].filter((c) => !derSet.has(c)).sort();

  console.log(`\n================ ${code} (id ${id}) ================`);
  console.log(`derived (blueprint generator): ${derSet.size}`);
  console.log(`materialized (_core):          ${matSet.size}`);
  console.log(`in both:                       ${both.length}`);
  console.log(`derived-only (generator would add, _core lacks): ${derOnly.length}`);
  for (const c of derOnly) console.log(`    + ${c}`);
  console.log(`materialized-only (_core has, generator drops):  ${matOnly.length}`);
  for (const c of matOnly) console.log(`    - ${c}`);
}
