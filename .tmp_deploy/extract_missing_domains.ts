#!/usr/bin/env bun
// Read-only: extract pending-review candidates from audits/_missing-domains.md.
// Emits one JSON object per line: { code, name, capabilities, hasScore }.
import { readFileSync } from "fs";

const raw = readFileSync("audits/_missing-domains.md", "utf8");
const pendStart = raw.search(/^## Pending review\b/m);
const promStart = raw.search(/^## Promoted\b/m);
const block = raw.slice(pendStart, promStart);

// Split on entry headers "### CODE — Name"
const parts = block.split(/\n(?=### )/);
for (const part of parts) {
  const h = part.match(/^### (\S+)\s+[—-]\s+(.*)$/m);
  if (!h) continue;
  const code = h[1];
  const name = h[2].trim();
  const capM = part.match(/\*\*Candidate capabilities:\*\* (.*)/);
  const capabilities = capM ? capM[1].trim() : "";
  const hasScore = /\*\*Estimated Semantius score:\*\* (?!_\(not estimated\)_)/.test(part);
  console.log([code, name, hasScore ? "SCORED" : "-", capabilities].join("\t"));
}
