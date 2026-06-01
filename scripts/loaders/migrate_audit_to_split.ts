#!/usr/bin/env bun
// One-shot migration: splits audits/<DOMAIN>.md into audits/<DOMAIN>/{state.yaml,history.md}.
// Pure markdown parsing, no semantius calls. Idempotent.
//
// Usage:
//   bun run scripts/loaders/migrate_audit_to_split.ts <DOMAIN_CODE> [--dry-run]
//
// --dry-run writes to c:/tmp/migrate_<DOMAIN>/ instead of audits/<DOMAIN>/.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SCHEMA_VERSION = 1;

type Frontmatter = Record<string, string>;
type Section = { header: string; body: string; date: string | null; isContinuation: boolean };
type SubSection = { header: string; body: string };
type Extras = Record<string, string>;
type B1Item = { id: string; subHeader: string; band: string; finding: string; action: string; extras: Extras };
type B2Item = { id: string; question: string; options: string; why: string; extras: Extras };
type B3Item = { id: string; candidate: string; module: string; evidence: string; extras: Extras };

function parseArgs(argv: string[]): { domain: string; dryRun: boolean } {
  const args = argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const domain = args.find(a => !a.startsWith("--"));
  if (!domain) {
    console.error("usage: bun run scripts/loaders/migrate_audit_to_split.ts <DOMAIN_CODE> [--dry-run]");
    process.exit(2);
  }
  return { domain, dryRun };
}

function parseFrontmatter(content: string): { fm: Frontmatter | null; body: string } {
  const normalized = content.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return { fm: null, body: normalized };
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) return { fm: null, body: normalized };
  const fmText = normalized.slice(4, end);
  const body = normalized.slice(end + 5);
  const fm: Frontmatter = {};
  for (const line of fmText.split("\n")) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.+)$/.exec(line);
    if (m) fm[m[1]] = m[2].trim();
  }
  return { fm, body };
}

function splitTopSections(body: string): Section[] {
  const lines = body.split("\n");
  const sections: Section[] = [];
  let current: { header: string; lines: string[] } | null = null;
  for (const line of lines) {
    if (/^## (?!#)/.test(line)) {
      if (current) sections.push(finalize(current));
      current = { header: line, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(finalize(current));
  return sections;

  function finalize(s: { header: string; lines: string[] }): Section {
    const date = /^## (\d{4}-\d{2}-\d{2})/.exec(s.header)?.[1] ?? null;
    const isContinuation = /Continuation/i.test(s.header);
    return { header: s.header, body: s.lines.join("\n"), date, isContinuation };
  }
}

function splitSubSections(body: string, level: 3 | 4): SubSection[] {
  const prefix = "#".repeat(level) + " ";
  const denyPrefix = "#".repeat(level + 1);
  const lines = body.split("\n");
  const out: SubSection[] = [];
  let current: { header: string; lines: string[] } | null = null;
  for (const line of lines) {
    if (line.startsWith(prefix) && !line.startsWith(denyPrefix)) {
      if (current) out.push({ header: current.header, body: current.lines.join("\n") });
      current = { header: line, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) out.push({ header: current.header, body: current.lines.join("\n") });
  return out;
}

function extractTableRows(text: string): string[][] {
  const rows: string[][] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line.startsWith("|")) continue;
    if (/^\|[-:\s|]+\|?$/.test(line)) continue;
    const inner = line.replace(/^\|/, "").replace(/\|$/, "");
    const cells = inner.split("|").map(c => c.trim());
    if (cells.length === 0) continue;
    rows.push(cells);
  }
  return rows;
}

function stripBackticks(s: string): string {
  return s.replace(/^`|`$/g, "");
}

function clean(s: string): string {
  return s.replace(/\*\*/g, "").trim();
}

function snakeCase(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function captureExtras(header: string[], row: string[], known: Set<number>): Extras {
  const out: Extras = {};
  for (let i = 0; i < header.length; i++) {
    if (known.has(i)) continue;
    const v = clean(row[i] || "");
    if (!v) continue;
    const key = snakeCase(header[i]);
    if (key) out[key] = v.slice(0, FIELD_CAP);
  }
  return out;
}

const FIELD_CAP = 4000;

function extractB1Items(bucket1: string): B1Item[] {
  const items: B1Item[] = [];
  const seen = new Set<string>();
  const subs = splitSubSections(bucket1, 4);
  const groups = subs.length > 0 ? subs : [{ header: "", body: bucket1 }];
  for (const sub of groups) {
    const subLabel = sub.header.replace(/^####\s*/, "").trim();
    for (const table of extractTablesWithHeader(sub.body)) {
      const idCol = table.header.findIndex(h => /^ID$/i.test(h));
      if (idCol === -1) continue;
      const bandCol = table.header.findIndex(h => /^Band$/i.test(h));
      const findingCol = table.header.findIndex(h => /^(Finding|Title|Question)$/i.test(h));
      const fixCol = table.header.findIndex(h => /^(Fix|Action|Resolution)$/i.test(h));
      const known = new Set([idCol, bandCol, findingCol, fixCol].filter(i => i >= 0));
      for (const row of table.rows) {
        const id = row[idCol];
        if (!id || !/^B1-[A-Z]+\d+$/.test(id) || seen.has(id)) continue;
        seen.add(id);
        const band = bandCol >= 0 ? clean(row[bandCol] || "") : "";
        const finding = findingCol >= 0 ? clean(row[findingCol] || "").slice(0, FIELD_CAP) : "";
        const action = fixCol >= 0 ? clean(row[fixCol] || "").slice(0, FIELD_CAP) : "";
        const extras = captureExtras(table.header, row, known);
        items.push({
          id,
          subHeader: sub.header,
          band: band || subLabel,
          finding,
          action,
          extras,
        });
      }
    }
    // Catch B1-* IDs that appear in prose, not in any table row (e.g. APQC TAGGING umbrella B1-H1).
    for (const m of sub.body.matchAll(/\bB1-[A-Z]+\d+\b/g)) {
      const id = m[0];
      if (!seen.has(id)) {
        seen.add(id);
        items.push({ id, subHeader: sub.header, band: subLabel, finding: "", action: "", extras: {} });
      }
    }
  }
  return items;
}

function extractB2Items(bucket2: string): B2Item[] {
  const items: B2Item[] = [];
  // Table-style (e.g. HAM): | ID | Question | Why agent can't answer | Options |
  for (const table of extractTablesWithHeader(bucket2)) {
    const idCol = table.header.findIndex(h => /^ID$/i.test(h));
    if (idCol === -1) continue;
    const qCol = table.header.findIndex(h => /^Question$/i.test(h));
    const whyCol = table.header.findIndex(h => /^(Why|Why agent)/i.test(h));
    const optCol = table.header.findIndex(h => /^Options$/i.test(h));
    const known = new Set([idCol, qCol, whyCol, optCol].filter(i => i >= 0));
    for (const row of table.rows) {
      const id = row[idCol];
      if (!id || !/^B2-[A-Z]+\d+$/.test(id)) continue;
      items.push({
        id,
        question: clean(row[qCol] || "").slice(0, FIELD_CAP),
        why: whyCol >= 0 ? clean(row[whyCol] || "").slice(0, FIELD_CAP) : "",
        options: optCol >= 0 ? clean(row[optCol] || "").slice(0, FIELD_CAP) : "",
        extras: captureExtras(table.header, row, known),
      });
    }
  }
  if (items.length > 0) return items;
  // Numbered prose (e.g. ATS): "1. **Title.** body with options inline."
  const lines = bucket2.split("\n");
  let current: { id: string; lines: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const blob = current.lines.join(" ").replace(/\s+/g, " ").trim();
    items.push({ id: current.id, question: blob.slice(0, FIELD_CAP), why: "", options: "", extras: {} });
    current = null;
  };
  for (const line of lines) {
    const m = /^(\d+)\.\s+(.*)$/.exec(line);
    if (m) {
      flush();
      current = { id: `B2-${m[1]}`, lines: [clean(m[2])] };
    } else if (current && line.trim()) {
      current.lines.push(clean(line.trim().replace(/^- /, "")));
    }
  }
  flush();
  return items;
}

function extractTablesWithHeader(text: string): Array<{ header: string[]; rows: string[][] }> {
  const tables: Array<{ header: string[]; rows: string[][] }> = [];
  let current: { header: string[] | null; rows: string[][] } = { header: null, rows: [] };
  const flush = () => {
    if (current.header) tables.push({ header: current.header, rows: current.rows });
    current = { header: null, rows: [] };
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line.startsWith("|")) {
      flush();
      continue;
    }
    if (/^\|[-:\s|]+\|?$/.test(line)) continue;
    const cells = line.replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => c.trim());
    if (!current.header) current.header = cells;
    else current.rows.push(cells);
  }
  flush();
  return tables;
}

function extractB3Items(bucket3: string): B3Item[] {
  const items: B3Item[] = [];
  const subs = splitSubSections(bucket3, 4);
  const groups = subs.length > 0 ? subs : [{ header: "", body: bucket3 }];
  let n = 1;
  for (const sub of groups) {
    if (/MODULARIZATION|SCOPE-CREEP|WRONG-OWNERSHIP/i.test(sub.header)) continue;
    for (const table of extractTablesWithHeader(sub.body)) {
      const candidateCol = table.header.findIndex(h => /^(Candidate|Entity)$/i.test(h));
      if (candidateCol === -1) continue;
      const moduleCol = table.header.findIndex(h => /(Proposed module|^Module$)/i.test(h));
      const evidenceCol = table.header.findIndex(h => /(Vendor evidence|Vendor knowledge|Evidence)/i.test(h));
      const ordCol = table.header.findIndex(h => /^#$/.test(h));
      const known = new Set([candidateCol, moduleCol, evidenceCol, ordCol].filter(i => i >= 0));
      for (const row of table.rows) {
        const candidate = stripBackticks(row[candidateCol] || "").trim();
        if (!candidate) continue;
        items.push({
          id: `B3-${n}`,
          candidate: candidate.slice(0, FIELD_CAP),
          module: moduleCol >= 0 ? (row[moduleCol] || "") : "",
          evidence: evidenceCol >= 0 ? (row[evidenceCol] || "") : "",
          extras: captureExtras(table.header, row, known),
        });
        n++;
      }
    }
  }
  return items;
}

function findMostRecentDatedSection(sections: Section[]): Section | null {
  const hasBucket = (s: Section) =>
    /^### Bucket [123]/m.test(s.body);
  // Prefer sections that actually contain Bucket subsections — that's where items live.
  // Falls back to any dated non-continuation section if none have buckets.
  const dated = sections.filter(s => s.date && !s.isContinuation);
  const withBuckets = dated.filter(hasBucket);
  const pool = withBuckets.length > 0 ? withBuckets : dated;
  let best: Section | null = null;
  for (const s of pool) {
    if (!best || s.date! > best.date!) best = s;
  }
  return best;
}

function findSubSection(section: Section, pattern: RegExp): SubSection | null {
  for (const sub of splitSubSections(section.body, 3)) {
    if (pattern.test(sub.header)) return sub;
  }
  return null;
}

type BucketResolution = {
  b1Resolved: Set<string>;
  b1Deferred: Map<string, string>;
  b2Resolved: Map<string, string>;
  b3Resolved: Map<string, string>;
};

function resolveFromDecisionsAndContinuation(
  audit: Section,
  continuations: Section[],
  b1Items: B1Item[],
  b2Items: B2Item[],
  b3Items: B3Item[],
): BucketResolution {
  const out: BucketResolution = {
    b1Resolved: new Set(),
    b1Deferred: new Map(),
    b2Resolved: new Map(),
    b3Resolved: new Map(),
  };
  const decisions = findSubSection(audit, /^### Decisions/);
  if (decisions) {
    const decisionsPlain = decisions.body.replace(/\*\*/g, "").replace(/`/g, "");
    if (/Bucket 1:\s*approved\s*all\b/i.test(decisionsPlain)) {
      for (const it of b1Items) out.b1Resolved.add(it.id);
    }
    const b2Block = /Bucket 2:[\s\S]*?(?=\n- Bucket [0-9]+|\n## |$)/i.exec(decisionsPlain)?.[0] ?? "";
    for (const m of b2Block.matchAll(/^\s*(\d+)\.\s+(.+?)$/gm)) {
      const n = parseInt(m[1], 10);
      const decisionText = m[2].slice(0, 200);
      const id = `B2-${n}`;
      if (b2Items.find(x => x.id === id)) out.b2Resolved.set(id, decisionText);
    }
  }
  for (const cont of continuations) {
    for (const sub of splitSubSections(cont.body, 3)) {
      if (/deferred/i.test(sub.header) && /B9 fan-out|deferred-b1|deferred b1/i.test(sub.header)) {
        for (const table of extractTablesWithHeader(sub.body)) {
          const idCol = table.header.findIndex(h => /Trigger event id|Event id|^id$/i.test(h));
          const nameCol = table.header.findIndex(h => /Trigger event$/i.test(h));
          const reasonCol = table.header.findIndex(h => /Defer reason|Reason/i.test(h));
          for (const row of table.rows) {
            const triggerEventId = idCol >= 0 ? row[idCol] : row[0];
            const triggerName = stripBackticks(nameCol >= 0 ? (row[nameCol] || "") : (row[1] || ""));
            const reasonText = reasonCol >= 0 ? row[reasonCol] : (row[row.length - 1] || "");
            for (const it of b1Items) {
              const itText = it.finding + " " + Object.values(it.extras || {}).join(" ");
              const matched =
                (/^\d+$/.test(triggerEventId) && itText.includes(triggerEventId)) ||
                (triggerName && itText.includes(triggerName));
              if (matched) {
                out.b1Deferred.set(it.id, clean(reasonText).slice(0, FIELD_CAP));
                out.b1Resolved.delete(it.id);
              }
            }
          }
        }
      }
      if (/Phase 0.*outcome|Verdict.*decision/i.test(sub.header)) {
        for (const table of extractTablesWithHeader(sub.body)) {
          const candCol = table.header.findIndex(h => /^(Candidate|Entity)$/i.test(h));
          let verdictCol = table.header.findIndex(h => /^Resolution$/i.test(h));
          if (verdictCol === -1) verdictCol = table.header.findIndex(h => /User decision/i.test(h));
          if (verdictCol === -1) verdictCol = table.header.findIndex(h => /Verdict/i.test(h));
          if (candCol === -1) continue;
          for (const row of table.rows) {
            const cand = stripBackticks(row[candCol] || "");
            const verdict = verdictCol >= 0 ? row[verdictCol] : (row[row.length - 1] || "");
            for (const it of b3Items) {
              if (it.candidate === cand) {
                out.b3Resolved.set(it.id, clean(verdict).slice(0, FIELD_CAP));
              }
            }
          }
        }
      }
    }
  }
  return out;
}

function quote(s: string): string {
  const needs = /[:#\-?{}\[\],&*!|>%@'"\\]/.test(s) || s !== s.trim() || /^\s*$/.test(s) || /^(true|false|null|yes|no|\d+(\.\d+)?)$/i.test(s);
  if (!needs) return s;
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function emitYaml(state: any): string {
  const out: string[] = [];
  out.push(`schema_version: ${state.schema_version}`);
  out.push(`domain: ${quote(state.domain)}`);
  if (state.domain_id !== null && state.domain_id !== undefined) {
    out.push(`domain_id: ${state.domain_id}`);
  } else {
    out.push(`domain_id: null`);
  }
  out.push(`status: ${quote(state.status)}`);
  out.push(`last_audit: ${state.last_audit ? quote(state.last_audit) : "null"}`);
  out.push(`last_pass: ${state.last_pass ? quote(state.last_pass) : "null"}`);
  out.push(``);
  const emitExtras = (extras: Extras | undefined) => {
    if (!extras) return;
    for (const [k, v] of Object.entries(extras)) {
      out.push(`      ${k}: ${quote(v)}`);
    }
  };
  out.push(`b1:`);
  out.push(`  open:`);
  for (const item of state.b1.open) {
    out.push(`    - id: ${quote(item.id)}`);
    if (item.band) out.push(`      band: ${quote(item.band)}`);
    if (item.finding) out.push(`      finding: ${quote(item.finding)}`);
    if (item.action) out.push(`      action: ${quote(item.action)}`);
    emitExtras(item.extras);
  }
  out.push(`  deferred:`);
  for (const item of state.b1.deferred) {
    out.push(`    - id: ${quote(item.id)}`);
    out.push(`      reason: ${quote(item.reason)}`);
  }
  out.push(``);
  out.push(`b2:`);
  out.push(`  open:`);
  for (const item of state.b2.open) {
    out.push(`    - id: ${quote(item.id)}`);
    out.push(`      question: ${quote(item.question)}`);
    if (item.why) out.push(`      why: ${quote(item.why)}`);
    if (item.options) out.push(`      options: ${quote(item.options)}`);
    emitExtras(item.extras);
  }
  out.push(``);
  out.push(`b3:`);
  out.push(`  pending:`);
  for (const item of state.b3.pending) {
    out.push(`    - id: ${quote(item.id)}`);
    out.push(`      candidate: ${quote(item.candidate)}`);
    if (item.module) out.push(`      proposed_module: ${quote(item.module)}`);
    if (item.evidence) out.push(`      vendor_evidence: ${quote(item.evidence)}`);
    emitExtras(item.extras);
  }
  return out.join("\n") + "\n";
}

function main() {
  const { domain, dryRun } = parseArgs(process.argv);
  const src = `audits/${domain}.md`;
  if (!existsSync(src)) {
    console.error(`source not found: ${src}`);
    process.exit(1);
  }
  const targetDir = dryRun ? `c:/tmp/migrate_${domain}` : `audits/${domain}`;
  if (!dryRun && existsSync(targetDir)) {
    console.log(`already migrated: ${targetDir}`);
    process.exit(0);
  }
  const content = readFileSync(src, "utf8");
  const { fm, body } = parseFrontmatter(content);
  const warnings: string[] = [];
  if (!fm) warnings.push(`no frontmatter in ${src}; using defaults`);

  const sections = splitTopSections(body);
  const audit = findMostRecentDatedSection(sections);
  const continuations = sections.filter(s => s.isContinuation);
  if (!audit) {
    console.error(`no dated audit section found in ${src}`);
    process.exit(1);
  }

  const b1Sub = findSubSection(audit, /^### Bucket 1/);
  const b2Sub = findSubSection(audit, /^### Bucket 2/);
  const b3Sub = findSubSection(audit, /^### Bucket 3/);
  const b1Items = b1Sub ? extractB1Items(b1Sub.body) : [];
  const b2Items = b2Sub ? extractB2Items(b2Sub.body) : [];
  const b3Items = b3Sub ? extractB3Items(b3Sub.body) : [];
  // Surface the case where a Bucket section exists but has no items the parser could lift
  // (older audit format with prose findings and no B-IDs).
  const bucketHasBody = (sub: SubSection | null) => sub && sub.body.trim().length > 200;
  if (bucketHasBody(b1Sub) && b1Items.length === 0) warnings.push(`Bucket 1 section in ${src} has substantive content but no B1-* IDs; state.yaml b1 will be empty`);
  if (bucketHasBody(b2Sub) && b2Items.length === 0) warnings.push(`Bucket 2 section in ${src} has substantive content but no B2-* IDs; state.yaml b2 will be empty`);
  if (bucketHasBody(b3Sub) && b3Items.length === 0) warnings.push(`Bucket 3 section in ${src} has substantive content but no B3-* IDs / candidate names; state.yaml b3 will be empty`);

  const resolution = resolveFromDecisionsAndContinuation(audit, continuations, b1Items, b2Items, b3Items);

  // Resolved items live in history.md (Decisions / Fixes applied / Phase 0 outcome sections),
  // not state.yaml. We still detect them so they don't get parked in open/pending by mistake.
  const b1Open: any[] = [];
  const b1Deferred: any[] = [];
  for (const it of b1Items) {
    if (resolution.b1Resolved.has(it.id)) continue;
    if (resolution.b1Deferred.has(it.id)) {
      b1Deferred.push({ id: it.id, reason: resolution.b1Deferred.get(it.id) });
    } else {
      b1Open.push({ id: it.id, band: it.band, finding: it.finding, action: it.action, extras: it.extras });
    }
  }

  const b2Open: any[] = [];
  for (const it of b2Items) {
    if (resolution.b2Resolved.has(it.id)) continue;
    b2Open.push({ id: it.id, question: it.question, options: it.options, why: it.why, extras: it.extras });
  }

  const b3Pending: any[] = [];
  for (const it of b3Items) {
    if (resolution.b3Resolved.has(it.id)) continue;
    b3Pending.push({ id: it.id, candidate: it.candidate, module: it.module, evidence: it.evidence, extras: it.extras });
  }

  const status = fm?.status || "feedback_needed";
  const lastAudit = audit.date;
  const lastPass = fm?.last_transition || null;

  const state = {
    schema_version: SCHEMA_VERSION,
    domain,
    domain_id: null,
    status,
    last_audit: lastAudit,
    last_pass: lastPass,
    b1: { open: b1Open, deferred: b1Deferred },
    b2: { open: b2Open },
    b3: { pending: b3Pending },
  };

  const trimmedBody = body.replace(/^\s*#\s+[^\n#][^\n]*\n+/, "");
  const history = `# ${domain} audit history\n\n${trimmedBody.replace(/^\s+/, "")}`;

  const sourceBodyBytes = body.length;
  const preservedBytes = sections.reduce((sum, s) => sum + s.header.length + 1 + s.body.length + 1, 0);
  if (sourceBodyBytes > 0 && preservedBytes / sourceBodyBytes < 0.85) {
    console.error(`section-coverage check failed: preserved ${preservedBytes} of ${sourceBodyBytes} body bytes`);
    process.exit(1);
  }

  mkdirSync(targetDir, { recursive: true });
  writeFileSync(join(targetDir, "state.yaml"), emitYaml(state));
  writeFileSync(join(targetDir, "history.md"), history);

  console.log(`${dryRun ? "[DRY] " : ""}wrote ${targetDir}/state.yaml + history.md`);
  console.log(`  b1: open=${b1Open.length} deferred=${b1Deferred.length}`);
  console.log(`  b2: open=${b2Open.length}`);
  console.log(`  b3: pending=${b3Pending.length}`);
  for (const w of warnings) console.warn(`WARN: ${w}`);
}

main();
