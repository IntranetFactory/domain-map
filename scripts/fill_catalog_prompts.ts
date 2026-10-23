#!/usr/bin/env bun
// scripts/fill_catalog_prompts.ts
//
// Fills EMPTY domains.catalog_prompt values before scripts/emit_domain_list.ts exports them.
// Never overwrites a non-empty prompt and never writes catalog_tagline.
//   - catalog_tagline set:   the prompt is generated from it (scripts/lib/catalog_prompt.ts).
//   - catalog_tagline empty: the domain is listed with its name and description; the agent writes
//     the prompt by hand in the same voice and saves it with --from.
//
// Usage (from the project root):
//   bun run scripts/fill_catalog_prompts.ts --dry-run          # show what would be written
//   bun run scripts/fill_catalog_prompts.ts                    # save prompts generated from taglines
//   bun run scripts/fill_catalog_prompts.ts --from prompts.json  # save hand-written prompts {"CODE": "prompt", ...}

export {};

import { readFileSync } from "node:fs";
import { pg } from "./lib/catalog";
import { promptFromTagline } from "./lib/catalog_prompt";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const fromIdx = args.indexOf("--from");
const FROM = fromIdx >= 0 ? args[fromIdx + 1] : null;

const domains: any[] = await pg(
  "GET",
  "/domains?select=id,domain_code,domain_name,description,catalog_tagline,catalog_prompt,record_status&record_status=neq.rejected&order=domain_code.asc&limit=10000",
);
const empty = domains.filter((d) => !(d.catalog_prompt ?? "").trim());

let writes: { id: number; code: string; prompt: string }[];
if (FROM) {
  const given: Record<string, string> = JSON.parse(readFileSync(FROM, "utf8"));
  const byCode = new Map(empty.map((d) => [d.domain_code, d]));
  writes = [];
  for (const [code, prompt] of Object.entries(given)) {
    const d = byCode.get(code);
    if (!d) { console.error(`skip ${code}: unknown, rejected, or catalog_prompt already set`); continue; }
    const p = prompt.trim().replaceAll(String.fromCharCode(0x2014), "-");
    if (p) writes.push({ id: d.id, code, prompt: p });
  }
} else {
  writes = empty
    .map((d) => ({ id: d.id, code: d.domain_code, prompt: promptFromTagline(d.domain_code, d.catalog_tagline ?? "") }))
    .filter((w) => w.prompt);
}

for (const w of writes) console.log(`${w.code.padEnd(22)} ${w.prompt}`);
if (!DRY) {
  for (const w of writes) {
    await pg("PATCH", `/domains?id=eq.${w.id}&or=(catalog_prompt.is.null,catalog_prompt.eq."")`, { catalog_prompt: w.prompt });
  }
}
console.error(`\n${DRY ? "would write" : "wrote"} ${writes.length} prompt(s); ${empty.length} domains had an empty catalog_prompt`);

if (!FROM) {
  const manual = empty.filter((d) => !(d.catalog_tagline ?? "").trim());
  if (manual.length) {
    console.error(`\nNo tagline: write these prompts by hand (same voice, do NOT write a tagline), then save with --from:`);
    for (const d of manual) console.error(`  ${d.domain_code} | ${d.domain_name} | ${(d.description ?? "").replace(/\s+/g, " ").slice(0, 240)}`);
  }
}
