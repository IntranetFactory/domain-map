#!/usr/bin/env bun
//
// Per-domain audit state — frontmatter helper for audits/<CODE>.md.
//
// Each audit file carries a YAML frontmatter block at the top:
//
//   ---
//   status: feedback_needed   # new | feedback_needed | research_needed | done
//   last_transition: 2026-05-30
//   last_transition_by: agent  # agent | human
//   open_questions: 13
//   ---
//
// The state machine is described in SKILL.md. Read it before flipping states
// manually: agents never flip out of feedback_needed (Rule #1 projection).
//
// Run from project root:
//   bun run scripts/analytics/audit_state.ts --get CLM
//   bun run scripts/analytics/audit_state.ts --set CLM --status research_needed --by human
//   bun run scripts/analytics/audit_state.ts --list feedback_needed
//   bun run scripts/analytics/audit_state.ts --list-all      # all audits + state
//   bun run scripts/analytics/audit_state.ts --init CLM --status feedback_needed --questions 13
//
// --init is for backfilling existing audit files that have no frontmatter yet.
// --set requires the file to already have frontmatter (use --init first).

import { existsSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { resolve } from "path";

const VALID_STATES = ["new", "feedback_needed", "research_needed", "done"] as const;
type State = typeof VALID_STATES[number];

const AUDITS_DIR = resolve(process.cwd(), "audits");

function arg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  if (i < 0) return null;
  return process.argv[i + 1] ?? null;
}
function flag(name: string): boolean {
  return process.argv.includes(name);
}

const today = new Date().toISOString().slice(0, 10);

type Frontmatter = {
  status: State;
  last_transition: string;
  last_transition_by: "agent" | "human";
  open_questions: number;
};

function auditPath(code: string): string {
  return resolve(AUDITS_DIR, `${code}.md`);
}

function parseFrontmatter(text: string): { fm: Frontmatter | null; body: string } {
  if (!text.startsWith("---\n")) return { fm: null, body: text };
  const end = text.indexOf("\n---\n", 4);
  if (end < 0) return { fm: null, body: text };
  const block = text.slice(4, end);
  const body = text.slice(end + 5);
  const fm: Partial<Frontmatter> = {};
  for (const line of block.split("\n")) {
    const m = /^(\w+)\s*:\s*(.+?)\s*$/.exec(line);
    if (!m) continue;
    const [, k, v] = m;
    if (k === "status") fm.status = v as State;
    else if (k === "last_transition") fm.last_transition = v;
    else if (k === "last_transition_by") fm.last_transition_by = v as "agent" | "human";
    else if (k === "open_questions") fm.open_questions = Number(v);
  }
  if (!fm.status) return { fm: null, body: text };
  return {
    fm: {
      status: fm.status,
      last_transition: fm.last_transition ?? "",
      last_transition_by: fm.last_transition_by ?? "agent",
      open_questions: fm.open_questions ?? 0,
    },
    body,
  };
}

function serializeFrontmatter(fm: Frontmatter, body: string): string {
  return `---
status: ${fm.status}
last_transition: ${fm.last_transition}
last_transition_by: ${fm.last_transition_by}
open_questions: ${fm.open_questions}
---
${body.startsWith("\n") ? body : "\n" + body}`;
}

function listAudits(): string[] {
  return readdirSync(AUDITS_DIR)
    .filter(f => f.endsWith(".md") && !f.startsWith("_") && f !== "README.md")
    .map(f => f.replace(/\.md$/, ""));
}

function requireValidState(s: string | null, label: string): State {
  if (!s || !VALID_STATES.includes(s as State)) {
    console.error(`${label} must be one of: ${VALID_STATES.join(", ")}`);
    process.exit(2);
  }
  return s as State;
}

// ---- subcommands ----

if (flag("--get")) {
  const code = arg("--get");
  if (!code) { console.error("--get requires a domain code"); process.exit(2); }
  const path = auditPath(code);
  if (!existsSync(path)) { console.error(`No audit file at ${path}`); process.exit(1); }
  const { fm } = parseFrontmatter(readFileSync(path, "utf8"));
  if (!fm) { console.error(`${code}: no frontmatter (run --init first)`); process.exit(1); }
  console.log(`${code}: ${fm.status} (last_transition=${fm.last_transition} by=${fm.last_transition_by}, open_questions=${fm.open_questions})`);
  process.exit(0);
}

if (flag("--init")) {
  const code = arg("--init");
  if (!code) { console.error("--init requires a domain code"); process.exit(2); }
  const status = requireValidState(arg("--status"), "--status");
  const questions = Number(arg("--questions") ?? "0");
  const by = (arg("--by") ?? "agent") as "agent" | "human";
  const path = auditPath(code);
  if (!existsSync(path)) { console.error(`No audit file at ${path}`); process.exit(1); }
  const text = readFileSync(path, "utf8");
  const { fm: existing } = parseFrontmatter(text);
  if (existing) {
    console.error(`${code} already has frontmatter (status=${existing.status}). Use --set to change.`);
    process.exit(1);
  }
  const fm: Frontmatter = {
    status,
    last_transition: today,
    last_transition_by: by,
    open_questions: questions,
  };
  writeFileSync(path, serializeFrontmatter(fm, text), "utf8");
  console.log(`Initialized ${code}: ${status}, open_questions=${questions}`);
  process.exit(0);
}

if (flag("--set")) {
  const code = arg("--set");
  if (!code) { console.error("--set requires a domain code"); process.exit(2); }
  const status = requireValidState(arg("--status"), "--status");
  const by = (arg("--by") ?? "agent") as "agent" | "human";
  const questions = arg("--questions");
  const path = auditPath(code);
  if (!existsSync(path)) { console.error(`No audit file at ${path}`); process.exit(1); }
  const text = readFileSync(path, "utf8");
  const { fm, body } = parseFrontmatter(text);
  if (!fm) {
    console.error(`${code} has no frontmatter. Run --init first.`);
    process.exit(1);
  }
  // Rule #1 projection: agent never flips out of feedback_needed.
  if (fm.status === "feedback_needed" && by === "agent" && status !== "feedback_needed") {
    console.error(`Refusing: agent cannot flip ${code} out of feedback_needed (rule #1). Use --by human if the user authorized.`);
    process.exit(1);
  }
  const updated: Frontmatter = {
    status,
    last_transition: today,
    last_transition_by: by,
    open_questions: questions != null ? Number(questions) : fm.open_questions,
  };
  writeFileSync(path, serializeFrontmatter(updated, body), "utf8");
  console.log(`${code}: ${fm.status} -> ${status} (by ${by})`);
  process.exit(0);
}

if (flag("--list")) {
  const target = requireValidState(arg("--list"), "--list");
  const rows: string[] = [];
  for (const code of listAudits()) {
    const text = readFileSync(auditPath(code), "utf8");
    const { fm } = parseFrontmatter(text);
    if (!fm) continue;
    if (fm.status === target) {
      rows.push(`${code.padEnd(18)} Q=${String(fm.open_questions).padStart(3)} last=${fm.last_transition} by=${fm.last_transition_by}`);
    }
  }
  if (rows.length === 0) console.log(`No audits in state '${target}'.`);
  else {
    console.log(`Audits in state '${target}' (${rows.length}):`);
    for (const r of rows) console.log("  " + r);
  }
  process.exit(0);
}

if (flag("--list-all")) {
  for (const code of listAudits()) {
    const text = readFileSync(auditPath(code), "utf8");
    const { fm } = parseFrontmatter(text);
    if (!fm) console.log(`${code.padEnd(18)} (no frontmatter)`);
    else console.log(`${code.padEnd(18)} ${fm.status.padEnd(17)} Q=${String(fm.open_questions).padStart(3)} last=${fm.last_transition} by=${fm.last_transition_by}`);
  }
  process.exit(0);
}

console.error(`Usage:
  --get <CODE>
  --set <CODE> --status <state> [--by agent|human] [--questions N]
  --init <CODE> --status <state> [--questions N] [--by agent|human]
  --list <state>
  --list-all
States: ${VALID_STATES.join(", ")}`);
process.exit(2);
