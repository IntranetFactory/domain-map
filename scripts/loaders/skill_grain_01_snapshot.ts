#!/usr/bin/env bun
/**
 * skill_grain_01_snapshot.ts - Step 0 of plans/per-domain-skill-restoration.md.
 *
 * Pulls EVERY row (select=*) of `skills` (315) and `skill_tools` (2767) and writes them to
 * plans/snapshots/ as pretty JSON. This is the HARD INVARIANT gate: no destructive step may run
 * until this snapshot is committed AND verified to contain every row that step will remove.
 * Cascade deletes are irreversible without this snapshot.
 *
 * Writes:
 *   plans/snapshots/skills.json        - all 315 skills, full rows
 *   plans/snapshots/skill_tools.json   - all 2767 skill_tools, full rows
 *   plans/snapshots/README.md          - manifest (counts, date, purpose, rollback note)
 *
 * Read-only against the catalog. Run from project root:
 *   bun run scripts/loaders/skill_grain_01_snapshot.ts
 */
export {};
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SNAP_DATE = "2026-06-06"; // matches plan §2 "live, 2026-06-06"
const SNAP_DIR = resolve(process.cwd(), "plans/snapshots");

async function pg(path: string): Promise<any[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify({ method: "GET", path }));
  proc.stdin.end();
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if (await proc.exited !== 0) throw new Error(`GET ${path}: ${err || out}`);
  return out.trim() ? JSON.parse(out.trim()) : [];
}

const LIMIT = 200000;
const [skills, skillTools] = await Promise.all([
  pg(`/skills?select=*&order=id&limit=${LIMIT}`),
  pg(`/skill_tools?select=*&order=id&limit=${LIMIT}`),
]);

if (skills.length !== 315) throw new Error(`expected 315 skills, got ${skills.length} - ABORT, state has drifted`);
if (skillTools.length !== 2767) throw new Error(`expected 2767 skill_tools, got ${skillTools.length} - ABORT, state has drifted`);
if (skills.length >= LIMIT || skillTools.length >= LIMIT) throw new Error("server row cap hit; raise LIMIT");

mkdirSync(SNAP_DIR, { recursive: true });
writeFileSync(resolve(SNAP_DIR, "skills.json"), JSON.stringify(skills, null, 2) + "\n");
writeFileSync(resolve(SNAP_DIR, "skill_tools.json"), JSON.stringify(skillTools, null, 2) + "\n");

const systemCount = skills.filter(s => s.skill_type === "system").length;
const processCount = skills.filter(s => s.skill_type === "process").length;

const readme = `# Pre-migration snapshot - per-domain-skill restoration

Captured ${SNAP_DATE} by \`scripts/loaders/skill_grain_01_snapshot.ts\` as Step 0 of
[../per-domain-skill-restoration.md](../per-domain-skill-restoration.md).

This is the rollback substrate for the skill/tool grain migration. It is a full \`select=*\`
dump of the two tables the migration mutates, captured BEFORE any destructive step. The plan's
hard invariant: nothing is destroyed that is not in this committed snapshot.

## Contents

| file | rows | note |
| --- | --- | --- |
| \`skills.json\` | ${skills.length} | every \`skills\` row (${systemCount} system + ${processCount} process), full columns |
| \`skill_tools.json\` | ${skillTools.length} | every \`skill_tools\` row, full columns |

## Accounting (plan §4 Step 0 hard invariant)

All 2767 \`skill_tools\` rows are removed across the migration, disjoint and exhaustive:

- 624 deleted in Step 4 (528 per-domain + 10 reused-skill 55/57 + 86 starter), after Step-2 migration.
- 226 deleted in Step 5 (the 3 process skills' rows), after migration to \`process_tools\`.
- 1917 removed by cascade in Step 6 (the 244 deleted full-module skills' rows).

624 + 226 + 1917 = 2767. Every row above is present in \`skill_tools.json\`.

## Rollback

Reconstruct \`skills\` from \`skills.json\` and \`skill_tools\` from \`skill_tools.json\` (POST each row
back, preserving ids where the deployer allows, or re-key and re-link). Keep these files until the
migration is verified and merged.
`;
writeFileSync(resolve(SNAP_DIR, "README.md"), readme);

console.log(`Snapshot written to ${SNAP_DIR}`);
console.log(`  skills.json:      ${skills.length} rows (${systemCount} system + ${processCount} process)`);
console.log(`  skill_tools.json: ${skillTools.length} rows`);
console.log(`  README.md:        manifest`);
console.log(`\nVERIFIED: skills == 315, skill_tools == 2767.`);
