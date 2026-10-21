#!/usr/bin/env bun
// Fill the "Estimated Semantius score" line on every Pending-review candidate
// that still shows "_(not estimated)_", using the heuristic estimates in
// .tmp_deploy/missing_domain_scores.json. Rewrites the file ONCE. Entries that
// already carry a real (hand-authored) score are left untouched.
import { readFileSync, writeFileSync } from "fs";

const scores: { code: string; scoreText: string; hasScore: boolean }[] = JSON.parse(
  readFileSync(".tmp_deploy/missing_domain_scores.json", "utf8"),
);
const byCode = new Map(scores.map((s) => [s.code, s]));

const raw = readFileSync("audits/_missing-domains.md", "utf8");
const pendStart = raw.search(/^## Pending review\b/m);
const promStart = raw.search(/^## Promoted\b/m);
const prelude = raw.slice(0, pendStart);
const pending = raw.slice(pendStart, promStart);
const tail = raw.slice(promStart);

let patched = 0;
const chunks = pending.split(/\n(?=### )/);
const out = chunks.map((chunk) => {
  const h = chunk.match(/^### (\S+)\s+[—-]\s+/m);
  if (!h) return chunk;
  const rec = byCode.get(h[1]);
  if (!rec || rec.hasScore) return chunk; // unknown or hand-authored: leave alone
  const line = `- **Estimated Semantius score:** ${rec.scoreText}`;
  // 1) replace a not-estimated placeholder if present
  const phRe = /- \*\*Estimated Semantius score:\*\* _\(not estimated\)_/;
  if (phRe.test(chunk)) { patched++; return chunk.replace(phRe, line); }
  // 2) never overwrite a real existing value (defensive; hasScore already guards)
  if (/- \*\*Estimated Semantius score:\*\*/.test(chunk)) return chunk;
  // 3) insert after Candidate capabilities
  const capRe = /(- \*\*Candidate capabilities:\*\* [^\n]*\n)/;
  if (capRe.test(chunk)) { patched++; return chunk.replace(capRe, `$1${line}\n`); }
  // 4) fallback: insert before Point-solution-market test
  const pstRe = /(- \*\*Point-solution-market test:\*\*)/;
  if (pstRe.test(chunk)) { patched++; return chunk.replace(pstRe, `${line}\n$1`); }
  return chunk;
});

const updated = prelude + out.join("\n") + tail;
if (updated === raw) {
  console.log("No changes.");
  process.exit(0);
}
writeFileSync("audits/_missing-domains.md", updated, "utf8");
console.log(`Patched ${patched} candidate score lines.`);
