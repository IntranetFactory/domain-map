#!/usr/bin/env bun
//
// Append-or-bump a candidate domain entry in audits/_missing-domains.md.
//
// Used by audit subagents (and humans) when market research surfaces a
// flagship-vendor market that doesn't map to any existing domain in the
// catalog. De-dupes by --code; bumps mention_count and appends to
// "Surfaced by" history when the candidate already exists.
//
// Does NOT load anything to the DB. The candidate is queued for human
// review (point-solution-market test, SKILL.md rule #2).
//
// Run from project root:
//   bun run scripts/analytics/append_missing_domain.ts \
//     --code TALENT-INTEL-PLATFORM \
//     --name "Talent Intelligence Platform" \
//     --surfaced-by "ATS audit 2026-05-30" \
//     --evidence "Eightfold AI, Phenom, Beamery" \
//     --adjacency "ATS, TALENT-MGMT, SWP" \
//     --capabilities "talent rediscovery, internal-mobility matching"
//
// Re-run with the same --code: bumps counter, appends "Surfaced by" line,
// updates "Most recently surfaced". Other fields are NOT overwritten on
// re-run (they widen at review time, not on each surface).

import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

function arg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  if (i < 0) return null;
  return process.argv[i + 1] ?? null;
}

function requireArg(flag: string): string {
  const v = arg(flag);
  if (!v) {
    console.error(`Missing required arg: ${flag}`);
    process.exit(2);
  }
  return v;
}

const code = requireArg("--code").trim().toUpperCase();
const name = requireArg("--name").trim();
const surfacedBy = requireArg("--surfaced-by").trim();
const evidence = arg("--evidence")?.trim() ?? "";
const adjacency = arg("--adjacency")?.trim() ?? "";
const capabilities = arg("--capabilities")?.trim() ?? "";

if (!/^[A-Z][A-Z0-9-]*$/.test(code)) {
  console.error(`Invalid --code: ${code}. Must be UPPERCASE-KEBAB (A-Z, 0-9, -).`);
  process.exit(2);
}

const today = new Date().toISOString().slice(0, 10);
const filePath = resolve(process.cwd(), "audits/_missing-domains.md");

if (!existsSync(filePath)) {
  console.error(`Queue file not found: ${filePath}. Initialize it first.`);
  process.exit(2);
}

const raw = readFileSync(filePath, "utf8");

// Split file into the three sections so we only touch "Pending review".
// Anchor to line starts: the intro prose mentions these section names inline,
// so plain indexOf would land on the prose mention, not the actual header.
function findLineStart(text: string, pattern: string): number {
  const re = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "m");
  const m = re.exec(text);
  return m ? m.index : -1;
}

const pendingStart = findLineStart(raw, "## Pending review");
const promotedStart = findLineStart(raw, "## Promoted");
if (pendingStart < 0 || promotedStart < 0 || promotedStart < pendingStart) {
  console.error(`Could not locate section headers (pending=${pendingStart}, promoted=${promotedStart}).`);
  process.exit(2);
}

const prelude = raw.slice(0, pendingStart);
const pendingBlock = raw.slice(pendingStart, promotedStart);
const tail = raw.slice(promotedStart);

// Per-candidate sub-section header pattern: "### <CODE> — <Name>"
const entryHeaderRe = new RegExp(`^### ${code}\\b.*$`, "m");
const existing = entryHeaderRe.exec(pendingBlock);

let newPendingBlock: string;

if (existing) {
  // Bump counter, append Surfaced by line, update Most recent.
  const entryStart = existing.index;
  // Find next "### " or end of block.
  const restAfterHeader = pendingBlock.slice(entryStart + existing[0].length);
  const nextHeader = restAfterHeader.search(/\n### /);
  const entryEnd = nextHeader >= 0 ? entryStart + existing[0].length + nextHeader : pendingBlock.length;
  const entry = pendingBlock.slice(entryStart, entryEnd);

  // Bump mention_count.
  const countRe = /(\*\*Mention count:\*\* )(\d+)/;
  const countMatch = countRe.exec(entry);
  if (!countMatch) {
    console.error(`Entry for ${code} found but no "Mention count" line. Manual fix needed.`);
    process.exit(2);
  }
  const newCount = Number(countMatch[2]) + 1;
  let updatedEntry = entry.replace(countRe, `$1${newCount}`);

  // Update Most recently surfaced.
  updatedEntry = updatedEntry.replace(
    /(\*\*Most recent:\*\* ).*/,
    `$1${today} (${surfacedBy})`,
  );

  // Append to Surfaced by list (idempotent: skip if same surfacedBy line already present).
  const surfacedLine = `  - ${today} ${surfacedBy}`;
  if (!updatedEntry.includes(surfacedLine)) {
    updatedEntry = updatedEntry.replace(
      /(\*\*Surfaced by:\*\*\n(?:  - [^\n]+\n)+)/,
      (_, list) => `${list}${surfacedLine}\n`,
    );
  }

  newPendingBlock = pendingBlock.slice(0, entryStart) + updatedEntry + pendingBlock.slice(entryEnd);
  console.log(`Bumped ${code}: mention_count ${countMatch[2]} -> ${newCount}; appended "${surfacedBy}".`);
} else {
  // New candidate. Build the entry block.
  const placeholder = "_(no candidates yet)_";
  const newEntry = `### ${code} — ${name}

- **Mention count:** 1
- **First surfaced:** ${today} (${surfacedBy})
- **Most recent:** ${today} (${surfacedBy})
- **Surfaced by:**
  - ${today} ${surfacedBy}
- **Vendor evidence:** ${evidence || "_(none provided)_"}
- **Adjacency:** ${adjacency || "_(none provided)_"}
- **Candidate capabilities:** ${capabilities || "_(none provided)_"}
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

`;

  if (pendingBlock.includes(placeholder)) {
    newPendingBlock = pendingBlock.replace(`${placeholder}\n`, newEntry);
  } else {
    // Append at end of the Pending review body, BEFORE the trailing `---\n\n`
    // section separator so the boundary with the next section stays anchored.
    const trailingSep = /\n---\n+$/;
    const sepMatch = trailingSep.exec(pendingBlock);
    if (sepMatch) {
      const body = pendingBlock.slice(0, sepMatch.index);
      const sep = pendingBlock.slice(sepMatch.index);
      newPendingBlock = body.trimEnd() + "\n\n" + newEntry + sep;
    } else {
      newPendingBlock = pendingBlock.trimEnd() + "\n\n" + newEntry;
    }
  }
  console.log(`Added new candidate ${code} — ${name} (surfaced by ${surfacedBy}).`);
}

const updated = prelude + newPendingBlock + tail;
if (updated === raw) {
  console.log("No changes written.");
  process.exit(0);
}

writeFileSync(filePath, updated, "utf8");
console.log(`Wrote ${filePath}`);
