// One-off: replace the em-dash I introduced in this session's audit history headings
// (`## <date> — Audit (state-driven execute...`) with an ASCII hyphen, per CLAUDE.md
// no-em-dash rule. Scoped to MY heading strings only; leaves pre-existing legacy
// em-dashes in older entries untouched (not authored this session).
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

const root = "c:/dev/domain-map/audits";
const NEEDLE = "— Audit (state-driven execute";
const FIX = "- Audit (state-driven execute";

let filesTouched = 0, linesFixed = 0;
for (const entry of readdirSync(root, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const p = `${root}/${entry.name}/history.md`;
  if (!existsSync(p)) continue;
  const before = readFileSync(p, "utf8");
  if (!before.includes(NEEDLE)) continue;
  const occurrences = before.split(NEEDLE).length - 1;
  const after = before.split(NEEDLE).join(FIX);
  writeFileSync(p, after, "utf8");
  filesTouched++; linesFixed += occurrences;
  console.log(`fixed ${occurrences} in ${entry.name}/history.md`);
}
console.log(`\nDONE: ${linesFixed} heading(s) across ${filesTouched} file(s)`);
