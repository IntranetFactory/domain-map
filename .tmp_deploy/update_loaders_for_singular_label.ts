#!/usr/bin/env bun
// update_loaders_for_singular_label.ts — Step 2g of plan-domain-fact-sheets.md.
//
// Mechanical sweep across .tmp_deploy/load_*.ts. Two transformations, both
// additive (display_label stays in place during the transitional period):
//
//   1. Multi-line:
//        <indent>display_label: "<Value>",
//      becomes
//        <indent>singular_label: "<Value>",
//        <indent>plural_label: "<Plural>",
//        <indent>display_label: "<Value>",
//
//   2. Inline object literal:
//        { ..., display_label: "<Value>", ... }
//      becomes
//        { ..., singular_label: "<Value>", plural_label: "<Plural>", display_label: "<Value>", ... }
//
// Idempotent: if a line/site already shows `singular_label` next to `display_label`, it is skipped.
// Excludes: extend_fact_sheet_schema.ts (its display_label refs are descriptions, not inserts) and
// type-declaration lines (`display_label: string;`) by virtue of requiring a quoted string literal.

export {};

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = "c:/dev/domain-map/.tmp_deploy";
const SKIP = new Set([
  "extend_fact_sheet_schema.ts",
  "update_loaders_for_singular_label.ts",
]);

function naivePluralize(singular: string): string {
  const s = singular.trim();
  if (!s) return s;
  if (/(s|x|z|ch|sh)$/i.test(s)) return s + "es";
  if (/[bcdfghjklmnpqrstvwxz]y$/i.test(s)) return s.slice(0, -1) + "ies";
  return s + "s";
}

const files = (await readdir(DIR)).filter((f) => f.endsWith(".ts") && !SKIP.has(f));

let touched = 0;
let totalMultiLine = 0;
let totalInline = 0;

// Patterns
const multiLineRe = /^(\s*)display_label:\s*"((?:[^"\\]|\\.)*)"\s*(,?)\s*(\/\/.*)?$/;
// Inline: capture pre-context immediately before `display_label:` so we can check it doesn't already say singular_label
const inlineRe = /(?<!singular_label:\s*"[^"]*",\s*plural_label:\s*"[^"]*",\s*)display_label:\s*"((?:[^"\\]|\\.)*)"/g;

for (const fname of files) {
  const fpath = join(DIR, fname);
  const text = await readFile(fpath, "utf8");
  if (!text.includes("display_label")) continue;

  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let fileMultiLine = 0;
  let fileInline = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Multi-line case first (whole-line match)
    const mm = line.match(multiLineRe);
    if (mm) {
      const [, indent, value] = mm;
      const prev = out[out.length - 1] ?? "";
      if (/\bsingular_label\s*:/.test(prev)) {
        out.push(line);
        continue;
      }
      out.push(`${indent}singular_label: "${value}",`);
      out.push(`${indent}plural_label: "${naivePluralize(value)}",`);
      out.push(line);
      fileMultiLine++;
      continue;
    }

    // Inline case: substitute display_label: "X" → singular_label: "X", plural_label: "Xs", display_label: "X"
    // only when it isn't already preceded on the same line.
    if (/display_label:\s*"/.test(line) && !/\bsingular_label\s*:\s*"/.test(line)) {
      // Ensure we're matching an actual quoted display_label (skip type sigs `display_label: string`)
      const replaced = line.replace(/display_label:\s*"((?:[^"\\]|\\.)*)"/g, (_match, value: string) => {
        fileInline++;
        return `singular_label: "${value}", plural_label: "${naivePluralize(value)}", display_label: "${value}"`;
      });
      out.push(replaced);
      continue;
    }

    out.push(line);
  }

  if (fileMultiLine + fileInline > 0) {
    await writeFile(fpath, out.join("\n"));
    console.log(`  ✨ ${fname}: ${fileMultiLine} multi-line, ${fileInline} inline`);
    touched++;
    totalMultiLine += fileMultiLine;
    totalInline += fileInline;
  }
}

console.log(
  `\n✓ ${touched} files touched. ${totalMultiLine} multi-line + ${totalInline} inline = ${totalMultiLine + totalInline} display_label sites annotated.`,
);
