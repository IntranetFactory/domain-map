#!/usr/bin/env bun
// update_type_decls_for_labels.ts — paired with update_loaders_for_singular_label.ts.
// Adds `singular_label?: string; plural_label?: string;` next to any
// `display_label: string;` field in a TS type/interface/inline type, so the
// object literals annotated by the loader-update sweep still typecheck.
//
// Idempotent: skips lines that already mention singular_label.

export {};

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = "c:/dev/domain-map/.tmp_deploy";
const SKIP = new Set([
  "extend_fact_sheet_schema.ts",
  "update_loaders_for_singular_label.ts",
  "cleanup_duplicate_label_annotations.ts",
  "update_type_decls_for_labels.ts",
]);

const files = (await readdir(DIR)).filter((f) => f.endsWith(".ts") && !SKIP.has(f));

let touched = 0;
let totalSites = 0;

for (const fname of files) {
  const fpath = join(DIR, fname);
  const text = await readFile(fpath, "utf8");
  if (!/display_label\s*:\s*string\b/.test(text)) continue;

  let fileSites = 0;
  // Multi-pass: handle each `display_label: string` occurrence on a line.
  // Insert `singular_label?: string; plural_label?: string;` immediately before.
  // Guard: skip if the line already mentions singular_label.
  const updated = text.replace(
    /([^\n;{]*?\b)(display_label\s*:\s*string)/g,
    (full, pre, target) => {
      if (/singular_label\s*\?\s*:\s*string/.test(pre)) return full;
      fileSites++;
      return `${pre}singular_label?: string; plural_label?: string; ${target}`;
    },
  );

  if (fileSites > 0 && updated !== text) {
    await writeFile(fpath, updated);
    console.log(`  ✨ ${fname}: ${fileSites} type-decl sites updated`);
    touched++;
    totalSites += fileSites;
  }
}

console.log(`\n✓ ${touched} files updated, ${totalSites} type-decl sites annotated.`);
