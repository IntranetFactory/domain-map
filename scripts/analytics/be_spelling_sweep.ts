#!/usr/bin/env bun
// scripts/analytics/be_spelling_sweep.ts
//
// Catalog-wide British-English -> American-English spelling sweep / lint. American English is the
// only allowed dialect (CLAUDE.md "American English only"); this is the enforcement tool the
// per-domain audit's BE band points at.
//
// It uses a CURATED word map, never a blanket `-ise -> -ize` transform: a naive transform would
// corrupt AE-native words (enterprise, comprise, surprise, advertise, supervise, franchise, ...).
// The -ize forms are generated only from explicit verb stems that are genuinely -ize verbs, so no
// AE-native word is ever rewritten.
//
// AUTOFIX columns (prose we author) are patched on --write. REPORT columns (natural keys / codes
// whose rename would cascade to FKs, plus externally-sourced names: APQC processes, statutes,
// vendor / solution proper names) are listed only, never auto-changed.
//
// Usage:
//   bun run scripts/analytics/be_spelling_sweep.ts            # dry-run: list every proposed change
//   bun run scripts/analytics/be_spelling_sweep.ts --write    # apply AUTOFIX changes
//
// Every write changes ONLY the spelling; record_status is never touched (Rule #1). Re-runnable and
// idempotent: a clean catalog produces zero findings (and the BE audit band passes).

export {};

import { pg } from "../lib/catalog";
import { BE_AUTOFIX_COLUMNS, BE_REPORT_COLUMNS, fixBritishSpelling } from "../lib/health/logic_b";

const WRITE = process.argv.includes("--write");

// ---------------------------------------------------------------------------
// BE -> AE dictionary (curated) and column scope
// ---------------------------------------------------------------------------
//
// Both live in scripts/lib/health/logic_b.ts (the B16 check of domain_health.ts), so this sweep and
// the per-domain check cannot drift:
//   - BE_AE_MAP / fixBritishSpelling: the curated word map (-ize verb stems x suffixes, -yse verbs,
//     explicit pairs) and its whole-word, case-preserving matcher.
//   - BE_AUTOFIX_COLUMNS: prose columns we author, patched on --write.
//   - BE_REPORT_COLUMNS: natural keys / codes (renaming cascades to FKs) + externally-sourced names
//     (APQC business_processes, statutes, vendor / solution proper names). Listed, never auto-changed.
const AUTOFIX = BE_AUTOFIX_COLUMNS;
const REPORT = BE_REPORT_COLUMNS;

const L = 100000;
const tablesToFetch = [...new Set([...Object.keys(AUTOFIX), ...Object.keys(REPORT)])];

let autofixRows = 0;
let autofixSubs = 0;
let reportHits = 0;
const patches: { table: string; id: number; body: Record<string, string> }[] = [];

for (const table of tablesToFetch) {
  const rows: any[] = (await pg("GET", `/${table}?select=*&limit=${L}`)) ?? [];
  const autoCols = AUTOFIX[table] ?? [];
  const reportCols = REPORT[table] ?? [];

  for (const row of rows) {
    const body: Record<string, string> = {};
    for (const col of autoCols) {
      const v = row[col];
      if (typeof v !== "string" || v.length === 0) continue;
      const { fixed, hits } = fixBritishSpelling(v);
      if (hits.length > 0) {
        body[col] = fixed;
        autofixSubs += hits.length;
        console.log(`FIX  ${table}.${col} id=${row.id}: ${hits.join(", ")}`);
      }
    }
    if (Object.keys(body).length > 0) {
      autofixRows++;
      patches.push({ table, id: row.id as number, body });
    }
    for (const col of reportCols) {
      const v = row[col];
      if (typeof v !== "string" || v.length === 0) continue;
      const { hits } = fixBritishSpelling(v);
      if (hits.length > 0) {
        reportHits += hits.length;
        console.log(`REPORT (manual) ${table}.${col} id=${row.id}: ${hits.join(", ")}`);
      }
    }
  }
}

console.error(
  `\nscan complete: ${autofixRows} row(s) / ${autofixSubs} substitution(s) AUTOFIX, ${reportHits} REPORT-only hit(s) across ${tablesToFetch.length} tables`,
);

if (!WRITE) {
  console.error(`dry-run: nothing written. Re-run with --write to apply the AUTOFIX changes.`);
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
