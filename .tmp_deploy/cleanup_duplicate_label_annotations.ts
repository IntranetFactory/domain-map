#!/usr/bin/env bun
// cleanup_duplicate_label_annotations.ts — repair the duplicate
// singular_label/plural_label pairs introduced when the v1 + v2
// update_loaders_for_singular_label.ts both ran (v2's idempotency check
// looked at the line immediately above display_label, which was plural_label,
// so it failed to detect the v1 prepend and re-inserted).
//
// Pattern to repair (multi-line case only — inline-form sweep ran only once):
//
//   <indent>singular_label: "X",
//   <indent>plural_label: "Y",
//   <indent>singular_label: "X",      <-- duplicate to remove
//   <indent>plural_label: "Y",        <-- duplicate to remove
//   <indent>display_label: "X",
//
// Idempotent: a clean file (single pair) is left untouched.

export {};

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = "c:/dev/domain-map/.tmp_deploy";
const SKIP = new Set([
  "extend_fact_sheet_schema.ts",
  "update_loaders_for_singular_label.ts",
  "cleanup_duplicate_label_annotations.ts",
]);

const files = (await readdir(DIR)).filter((f) => f.endsWith(".ts") && !SKIP.has(f));

let touched = 0;
let totalRemoved = 0;

const singularRe = /^(\s*)singular_label:\s*"((?:[^"\\]|\\.)*)"/;
const pluralRe = /^(\s*)plural_label:\s*"((?:[^"\\]|\\.)*)"/;

for (const fname of files) {
  const fpath = join(DIR, fname);
  const text = await readFile(fpath, "utf8");
  if (!text.includes("singular_label")) continue;

  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let fileRemoved = 0;

  let i = 0;
  while (i < lines.length) {
    const a = lines[i];
    const b = lines[i + 1];
    const c = lines[i + 2];
    const d = lines[i + 3];

    if (a !== undefined && b !== undefined && c !== undefined && d !== undefined) {
      const aM = a.match(singularRe);
      const bM = b.match(pluralRe);
      const cM = c.match(singularRe);
      const dM = d.match(pluralRe);
      if (aM && bM && cM && dM && aM[2] === cM[2] && bM[2] === dM[2]) {
        // Drop the first pair (a, b) — keep c, d
        i += 2;
        fileRemoved += 2;
        continue;
      }
    }
    out.push(a);
    i++;
  }

  if (fileRemoved > 0) {
    await writeFile(fpath, out.join("\n"));
    console.log(`  🧹 ${fname}: removed ${fileRemoved} duplicate lines`);
    touched++;
    totalRemoved += fileRemoved;
  }
}

console.log(`\n✓ ${touched} files cleaned, ${totalRemoved} duplicate lines removed.`);
