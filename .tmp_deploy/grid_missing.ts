#!/usr/bin/env bun
// Read the persisted score lines and print a markdown grid sorted desc.
import { readFileSync } from "fs";
const raw = readFileSync("audits/_missing-domains.md", "utf8");
const pend = raw.slice(raw.search(/^## Pending review\b/m), raw.search(/^## Promoted\b/m));

type R = { code: string; name: string; sort: number; shown: string; basis: string; src: string };
const out: R[] = [];
for (const part of pend.split(/\n(?=### )/)) {
  const h = part.match(/^### (\S+)\s+[—-]\s+(.*)$/m);
  if (!h) continue;
  const sM = part.match(/\*\*Estimated Semantius score:\*\* (.*)/);
  const s = sM ? sM[1] : "";
  const range = s.match(/~(\d+)-(\d+)%/);
  const single = s.match(/~(\d+)%/);
  let sort = 0, shown = "?";
  if (range) { sort = (Number(range[1]) + Number(range[2])) / 2; shown = `~${range[1]}-${range[2]}%`; }
  else if (single) { sort = Number(single[1]); shown = `~${single[1]}%`; }
  const auto = /auto-est/.test(s);
  // crude basis: text after the colon, first clause
  const after = s.split("):").slice(1).join("):").replace(/^\s*/, "");
  const basis = after.split(/[.;]/)[0].slice(0, 60);
  out.push({ code: h[1], name: h[2].trim(), sort, shown, basis, src: auto ? "auto" : "hand" });
}
out.sort((a, b) => b.sort - a.sort || a.code.localeCompare(b.code));

console.log(`| # | Score | Domain | Code | Src | Basis |`);
console.log(`|---|---|---|---|---|---|`);
out.forEach((r, i) =>
  console.log(`| ${i + 1} | ${r.shown} | ${r.name} | ${r.code} | ${r.src} | ${r.basis} |`),
);
console.log(`\nTotal: ${out.length}`);
