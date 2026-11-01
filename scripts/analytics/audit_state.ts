#!/usr/bin/env bun
//
// Per-domain audit state, read-only: reads audits/<CODE>/state.yaml (schema v2, see
// audits/README.md) with js-yaml and prints status / next_action_by / open items.
//
//   schema_version: 2
//   domain: <CODE>
//   status: audit_stale | feedback_needed | passed
//   next_action_by: agent | user | research | blocked | done
//   last_audit: <YYYY-MM-DD or null>
//   b1a / b1b / b2 / b3: [...]
//
// This script never writes. state.yaml is rewritten by the auditing agent (SKILL.md Rule #22),
// and its `checks:` block by `domain_health.ts --record`. The old --set / --init frontmatter
// writers targeted the retired audits/<CODE>.md layout and are refused.
//
// "open_questions" = items waiting on the user: every b2 decision plus every b1b blocked on a
// user decision (the q-file's content).
//
// Run from project root:
//   bun run scripts/analytics/audit_state.ts --get CLM
//   bun run scripts/analytics/audit_state.ts --list feedback_needed
//   bun run scripts/analytics/audit_state.ts --list-all      # all audits + state

import { existsSync, readdirSync, readFileSync } from "fs";
import { resolve } from "path";
import yaml from "js-yaml";

const VALID_STATES = ["audit_stale", "feedback_needed", "passed"] as const;

const AUDITS_DIR = resolve(process.cwd(), "audits");

function arg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  if (i < 0) return null;
  return process.argv[i + 1] ?? null;
}
function flag(name: string): boolean {
  return process.argv.includes(name);
}

type AuditState = {
  status: string;
  next_action_by: string;
  last_audit: string;
  open_questions: number;
  counts: { b1a: number; b1b: number; b2: number; b3: number };
};

function statePath(code: string): string {
  return resolve(AUDITS_DIR, code, "state.yaml");
}

const len = (v: unknown): number => (Array.isArray(v) ? v.length : 0);

// null = no state.yaml; "unparsable" = present but not valid YAML.
function readState(code: string): AuditState | null | "unparsable" {
  const path = statePath(code);
  if (!existsSync(path)) return null;
  let doc: any;
  try {
    doc = yaml.load(readFileSync(path, "utf8")) ?? {};
  } catch {
    return "unparsable";
  }
  const b1b: any[] = Array.isArray(doc.b1b) ? doc.b1b : [];
  const userBlocked = b1b.filter((it) =>
    (Array.isArray(it?.blocked_by) ? it.blocked_by : []).some((b: any) => b?.type === "user_decision"),
  ).length;
  return {
    status: String(doc.status ?? ""),
    next_action_by: String(doc.next_action_by ?? ""),
    last_audit: doc.last_audit == null ? "" : String(doc.last_audit instanceof Date ? doc.last_audit.toISOString().slice(0, 10) : doc.last_audit),
    open_questions: len(doc.b2) + userBlocked,
    counts: { b1a: len(doc.b1a), b1b: b1b.length, b2: len(doc.b2), b3: len(doc.b3) },
  };
}

function listAudits(includeMissing = false): string[] {
  return readdirSync(AUDITS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && (includeMissing || existsSync(statePath(d.name))))
    .map((d) => d.name)
    .sort();
}

// ---- subcommands ----

if (flag("--set") || flag("--init")) {
  console.error(
    "Refusing: audit_state.ts is read-only. audits/<CODE>/state.yaml is rewritten by the auditing agent (SKILL.md Rule #22) and its checks: block by domain_health.ts --record.",
  );
  process.exit(2);
}

if (flag("--get")) {
  const code = arg("--get");
  if (!code) { console.error("--get requires a domain code"); process.exit(2); }
  const st = readState(code);
  if (st === null) { console.error(`No audit state at ${statePath(code)}`); process.exit(1); }
  if (st === "unparsable") { console.error(`${code}: state.yaml does not parse as YAML`); process.exit(1); }
  const c = st.counts;
  console.log(`${code}: ${st.status} (last_audit=${st.last_audit || "-"} next_action_by=${st.next_action_by || "-"}, open_questions=${st.open_questions}; b1a=${c.b1a} b1b=${c.b1b} b2=${c.b2} b3=${c.b3})`);
  process.exit(0);
}

if (flag("--list")) {
  const target = arg("--list");
  if (!target) { console.error(`--list requires a status (${VALID_STATES.join(", ")})`); process.exit(2); }
  if (!VALID_STATES.includes(target as (typeof VALID_STATES)[number])) {
    console.error(`note: '${target}' is not a schema v2 status (${VALID_STATES.join(", ")}); listing exact matches anyway`);
  }
  const rows: string[] = [];
  for (const code of listAudits()) {
    const st = readState(code);
    if (!st || st === "unparsable" || st.status !== target) continue;
    rows.push(`${code.padEnd(18)} Q=${String(st.open_questions).padStart(3)} last=${st.last_audit || "-"} by=${st.next_action_by || "-"}`);
  }
  if (rows.length === 0) console.log(`No audits in state '${target}'.`);
  else {
    console.log(`Audits in state '${target}' (${rows.length}):`);
    for (const r of rows) console.log("  " + r);
  }
  process.exit(0);
}

if (flag("--list-all")) {
  for (const code of listAudits(true)) {
    const st = readState(code);
    if (st === "unparsable") console.log(`${code.padEnd(18)} (state.yaml does not parse)`);
    else if (!st) console.log(`${code.padEnd(18)} (no state.yaml)`);
    else console.log(`${code.padEnd(18)} ${st.status.padEnd(17)} Q=${String(st.open_questions).padStart(3)} last=${st.last_audit || "-"} by=${st.next_action_by || "-"}`);
  }
  process.exit(0);
}

console.error(`Usage (read-only):
  --get <CODE>
  --list <status>
  --list-all
States (schema v2): ${VALID_STATES.join(", ")}`);
process.exit(2);
