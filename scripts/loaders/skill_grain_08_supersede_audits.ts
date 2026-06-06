#!/usr/bin/env bun
/**
 * skill_grain_08_supersede_audits.ts - Step 7c of plans/per-domain-skill-restoration.md.
 *
 * The audit corpus (audits/<CODE>/state.yaml + history.md) carries OPEN per-module-skill action
 * items ("author one <module_code>_agent per module, then DELETE the domain-level skill"; "one
 * system skill per domain_modules row"; "add/PATCH skill_tools"; "rename / split of skill"). Those
 * instructions are now WRONG: the per-module skill grain is retired. A future audit pass that
 * blindly executes them would undo this migration. This pass ENUMERATES every affected file and
 * SUPERSEDES the per-module instruction with a uniform, prominent banner.
 *
 *   - state.yaml: PREPEND a YAML comment banner (valid YAML; the open items below it are canceled).
 *   - history.md: APPEND a dated correction note (history is append-only).
 *
 * Idempotent: skips a file that already carries the sentinel. Over-inclusion is safe (the banner is
 * informational and correct on any file that mentions the retired grain). Run from project root:
 *   bun run scripts/loaders/skill_grain_08_supersede_audits.ts
 */
export {};
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

const AUDITS = resolve(process.cwd(), "audits");
const SENTINEL = "SUPERSEDED 2026-06-06: per-domain-skill restoration";

// Matches a reference to the retired per-module-skill grain (inclusive on purpose).
const PATTERN = /skill_tools|per-module skill|per-module system skill|system skill per |system skill for module|anchored only to module|rename ?\/ ?split of skill|domain-level skill|\b[a-z0-9]+_agent\b/i;

const BODY_LINES = [
  "The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).",
  "Any open item that says \"author/split a per-module system skill\", \"one system skill per",
  "domain_modules row\", \"add/PATCH skill_tools\", or \"<module>_agent per module\" is CANCELED.",
  "New model: tool requirements live on `domain_module_tools` (author tools onto modules); each",
  "domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that",
  "DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;",
  "cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool",
  "re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.",
];

function yamlBanner(): string {
  const top = `# === ${SENTINEL} ===`;
  const body = BODY_LINES.map(l => `# ${l}`).join("\n");
  return `${top}\n${body}\n# === end supersession note ===\n`;
}

function mdNote(): string {
  return [
    "",
    "---",
    "",
    `## 2026-06-06 - Per-domain-skill restoration (${SENTINEL})`,
    "",
    ...BODY_LINES,
    "",
  ].join("\n");
}

const touchedState: string[] = [];
const touchedHistory: string[] = [];
const skipped: string[] = [];

for (const code of readdirSync(AUDITS)) {
  const dir = resolve(AUDITS, code);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;

  const statePath = resolve(dir, "state.yaml");
  if (existsSync(statePath)) {
    const c = readFileSync(statePath, "utf8");
    if (PATTERN.test(c)) {
      if (c.includes(SENTINEL)) skipped.push(`${code}/state.yaml`);
      else { writeFileSync(statePath, yamlBanner() + c); touchedState.push(code); }
    }
  }

  const histPath = resolve(dir, "history.md");
  if (existsSync(histPath)) {
    const c = readFileSync(histPath, "utf8");
    if (PATTERN.test(c)) {
      if (c.includes(SENTINEL)) skipped.push(`${code}/history.md`);
      else { writeFileSync(histPath, c.replace(/\s*$/, "\n") + mdNote()); touchedHistory.push(code); }
    }
  }
}

console.log(`state.yaml banners added: ${touchedState.length}`);
console.log(`history.md notes appended: ${touchedHistory.length}`);
console.log(`already-superseded (skipped): ${skipped.length}`);
console.log(`\nstate.yaml: ${touchedState.sort().join(", ")}`);
