#!/usr/bin/env bun
// Carries the 2026-11-03 British spelling fixes into generated files under catalog/, by replacing the exact old text
// of each changed cell or computed label with its new text. It does not regenerate anything. The pairs come from
// .tmp_deploy/2026-11-03_british_spelling_fixes.json.
//
// Dry-run by default; --apply writes. Prose matches as an exact substring. Identifiers and computed labels match
// only as a whole token, so `labour_x` never matches inside `retail_labour_x_y`. Each value is tried as written, as
// its JSON-escaped form, and with any em-dash as the `-` the blueprint emitter renders it as. Longest values go first,
// so a sentence that contains an identifier is replaced whole.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Pair = { kind: "prose" | "identifier"; from: string; to: string };
const APPLY = process.argv.includes("--apply");
const EM_DASH = String.fromCharCode(0x2014);
const data = JSON.parse(readFileSync(".tmp_deploy/2026-11-03_british_spelling_fixes.json", "utf8"));

const ROOTS = ["catalog/blueprints", "catalog/domain-map", "catalog/skill-specs", "catalog/skills"];
const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const files = ROOTS.flatMap(walk).filter((f) => /\.(md|json|yaml|yml|ts)$/.test(f));

const seen = new Map<string, Pair>();
for (const c of data.cells) seen.set(c.old, { kind: c.group === "identifier" ? "identifier" : "prose", from: c.old, to: c.new });
for (const l of data.labels) seen.set(l.from, { kind: "identifier", from: l.from, to: l.to });
const pairs = [...seen.values()].sort((a, b) => b.from.length - a.from.length);

const jsonBody = (s: string) => JSON.stringify(s).slice(1, -1);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function variants(p: Pair): [string, string][] {
  const out: [string, string][] = [[p.from, p.to], [jsonBody(p.from), jsonBody(p.to)]];
  if (p.from.includes(EM_DASH)) {
    const dash = (s: string) => s.replaceAll(EM_DASH, "-");
    const esc = (s: string) => s.replaceAll(EM_DASH, "\\u2014");
    out.push([dash(p.from), dash(p.to)], [dash(jsonBody(p.from)), dash(jsonBody(p.to))], [esc(jsonBody(p.from)), esc(jsonBody(p.to))]);
  }
  return [...new Map(out).entries()];
}

const texts = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
const original = new Map(texts);
const hitsPerPair = new Map<Pair, number>();
const hitsPerFile = new Map<string, number>();
for (const p of pairs) {
  for (const [from, to] of variants(p)) {
    const re = p.kind === "identifier" ? new RegExp(`(?<![A-Za-z0-9_])${escapeRe(from)}(?![A-Za-z0-9_])`, "g") : new RegExp(escapeRe(from), "g");
    for (const [f, text] of texts) {
      let n = 0;
      const next = text.replace(re, () => {
        n++;
        return to;
      });
      if (n) {
        texts.set(f, next);
        hitsPerPair.set(p, (hitsPerPair.get(p) ?? 0) + n);
        hitsPerFile.set(f, (hitsPerFile.get(f) ?? 0) + n);
      }
    }
  }
}

const found = pairs.filter((p) => hitsPerPair.has(p));
console.log(`${pairs.length} distinct changed values (${data.cells.length} cells and ${data.labels.length} labels); ${found.length} found in catalog/, ${pairs.length - found.length} not found.`);
console.log(`${[...hitsPerPair.values()].reduce((a, b) => a + b, 0)} replacements in ${hitsPerFile.size} of ${files.length} files.`);
for (const p of found) console.log(`  ${String(hitsPerPair.get(p)).padStart(3)}  ${p.kind.padEnd(10)}  ${p.from.replaceAll(EM_DASH, "--").slice(0, 110)}`);
console.log("Per file:");
for (const [f, n] of [...hitsPerFile].sort()) console.log(`  ${String(n).padStart(3)}  ${f}`);

if (!APPLY) {
  console.log("\nNo writes (dry-run).");
  process.exit(0);
}
for (const [f, text] of texts) if (text !== original.get(f)) writeFileSync(f, text);
console.log(`\nwrote ${hitsPerFile.size} files`);
