#!/usr/bin/env bun
// Mechanical migration: copies every audits/<DOMAIN>.md into
// audits/<DOMAIN>/{history.md, state.yaml}. No prose parsing.
//
// - history.md = source body (frontmatter stripped, leading title heading dropped),
//   prepended with "# <DOMAIN> audit history\n\n".
// - state.yaml = stub in schema_version: 2 format, status: audit_stale.
//   The first audit run under the v2 schema populates b1a/b1b/b2/b3.
//
// Skips audits/_*.md (catalog-wide artifacts) and audits/README.md.
// Idempotent: skips domains whose audits/<DOMAIN>/ already exists.
// Deletes the legacy audits/<DOMAIN>.md after migration (recoverable via git).

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const AUDITS_DIR = "audits";
const SCHEMA_VERSION = 2;

type Parsed = {
  body: string;
  status: string | null;
  lastTransition: string | null;
};

function stripFrontmatter(content: string): Parsed {
  const n = content.replace(/\r\n/g, "\n");
  if (!n.startsWith("---\n")) return { body: n, status: null, lastTransition: null };
  const end = n.indexOf("\n---\n", 4);
  if (end === -1) return { body: n, status: null, lastTransition: null };
  const fm = n.slice(4, end);
  const body = n.slice(end + 5);
  const status = /^status:\s*(.+)$/m.exec(fm)?.[1]?.trim() ?? null;
  const lastTransition = /^last_transition:\s*(.+)$/m.exec(fm)?.[1]?.trim() ?? null;
  return { body, status, lastTransition };
}

function findMostRecentDate(body: string): string | null {
  const matches = body.match(/^## (\d{4}-\d{2}-\d{2})/gm) ?? [];
  if (matches.length === 0) return null;
  return matches.map((m) => m.replace(/^## /, "")).sort().reverse()[0];
}

function makeStateStub(domain: string, lastAudit: string | null, priorStatus: string | null): string {
  const fmt = (v: string | null) => (v ? `"${v}"` : "null");
  return `schema_version: ${SCHEMA_VERSION}
domain: ${domain}
status: audit_stale
next_action_by: agent
last_audit: ${fmt(lastAudit)}
prior_frontmatter_status: ${fmt(priorStatus)}

# state.yaml is awaiting first audit under schema_version: ${SCHEMA_VERSION}.
# Pre-existing audit narrative is preserved in history.md.
# A fresh audit run (see .claude/skills/domain-map-analyst) will populate
# b1a (agent-solvable), b1b (blocked), b2 (user-judgment), b3 (research-pending).

b1a: []
b1b: []
b2: []
b3: []
`;
}

function migrateOne(filename: string): "migrated" | "skipped" {
  const domain = filename.replace(/\.md$/, "");
  const srcPath = join(AUDITS_DIR, filename);
  const targetDir = join(AUDITS_DIR, domain);
  if (existsSync(targetDir)) return "skipped";
  const content = readFileSync(srcPath, "utf8");
  const { body, status, lastTransition } = stripFrontmatter(content);
  const trimmedBody = body.replace(/^\s*#\s+[^\n]+\n+/, "").trimStart();
  const lastAudit = findMostRecentDate(trimmedBody) ?? lastTransition;
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(
    join(targetDir, "history.md"),
    `# ${domain} audit history\n\n${trimmedBody}`,
  );
  writeFileSync(
    join(targetDir, "state.yaml"),
    makeStateStub(domain, lastAudit, status),
  );
  rmSync(srcPath);
  return "migrated";
}

function* domainFiles(): IterableIterator<string> {
  for (const entry of readdirSync(AUDITS_DIR)) {
    if (!entry.endsWith(".md")) continue;
    if (entry === "README.md") continue;
    if (entry.startsWith("_")) continue;
    yield entry;
  }
}

let migrated = 0;
let skipped = 0;
for (const f of domainFiles()) {
  const result = migrateOne(f);
  if (result === "migrated") migrated++;
  else skipped++;
}
console.log(`migrated=${migrated} skipped=${skipped}`);
