#!/usr/bin/env bun
//
// domain_health.ts: deterministic, read-only per-domain health check.
//
// Runs every SKILL.md "Per-domain completeness checklist" ID (plus the health plan's new IDs)
// through the registry in scripts/lib/health/. Mechanical checks decide pass / fail / warn; the
// judgment half of a check is listed as `agent`; B9d / B9e name the script to run (`delegated`);
// retired / reserved IDs are `skipped`. Read-only against the catalog: GET requests only.
//
// Run from the project root (semantius reads .env from the cwd):
//   bun run scripts/analytics/domain_health.ts --domain ATS            # per-check table
//   bun run scripts/analytics/domain_health.ts --domain ATS --json     # machine output
//   bun run scripts/analytics/domain_health.ts --all                   # every domain, ranked
//   bun run scripts/analytics/domain_health.ts --domain ATS --record   # + write checks: block
//   bun run scripts/analytics/domain_health.ts --stale                 # recorded version older / missing
//
// Options:
//   --record            write a `checks:` block into audits/<CODE>/state.yaml (text splice; only
//                       that block changes, comments survive). A Validate (b1) run uses it; a
//                       "check only" request does not (SKILL.md Rule #21). Never creates a file.
//   --stale             list domains whose recorded checks.checklist_version is older than
//                       CHECKLIST_VERSION, or missing. Reads audits/ only; no catalog access.
//   --full              print full finding details (the table truncates them)
//   --refresh           ignore the catalog cache and refetch
//   --cache-file <p>    catalog cache file (default: OS temp dir, so the tracked
//                       .cache/.catalog-cache.json is never rewritten by a health run)
//   --audits-dir <p>    audits root (default: <repo>/audits); for testing --record on a copy

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildHealthContext, loadHealthBase } from "../lib/health/context.ts";
import { recordedChecklistVersion, renderChecksBlock, spliceChecksBlock, verifySplice } from "../lib/health/record.ts";
import { CHECKLIST_VERSION, CHECKS } from "../lib/health/registry.ts";
import { runDomain, toRecords, type DomainReport } from "../lib/health/run.ts";

const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(f);
const val = (f: string): string | null => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] ?? null : null;
};

const DOMAIN = val("--domain");
const ALL = has("--all");
const JSON_OUT = has("--json");
const RECORD = has("--record");
const STALE = has("--stale");
const FULL = has("--full");
const AUDITS_DIR = resolve(val("--audits-dir") ?? join(import.meta.dir, "..", "..", "audits"));

function usage(msg?: string): never {
  if (msg) console.error(msg);
  console.error("usage: domain_health.ts --domain <CODE> | --all  [--json] [--record] [--full] [--refresh] [--cache-file <path>]\n       domain_health.ts --stale [--domain <CODE>] [--json]");
  process.exit(2);
}

// ---------------------------------------------------------------- --stale (no catalog access)

if (STALE) {
  const dirs = existsSync(AUDITS_DIR)
    ? readdirSync(AUDITS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
    : [];
  const rows: { domain: string; recorded: number | null }[] = [];
  let withState = 0;
  for (const code of dirs) {
    if (DOMAIN && code !== DOMAIN) continue;
    const p = join(AUDITS_DIR, code, "state.yaml");
    if (!existsSync(p)) continue;
    withState++;
    const recorded = recordedChecklistVersion(readFileSync(p, "utf8"));
    if (recorded === null || recorded < CHECKLIST_VERSION) rows.push({ domain: code, recorded });
  }
  if (JSON_OUT) {
    console.log(JSON.stringify({ checklist_version: CHECKLIST_VERSION, with_state: withState, stale: rows }, null, 2));
  } else {
    console.log(`checklist v${CHECKLIST_VERSION}: ${rows.length} of ${withState} domains with a state.yaml are stale (recorded version older, or no checks: block)`);
    for (const r of rows) console.log(`  ${r.domain.padEnd(24)} recorded=${r.recorded ?? "none"}`);
  }
  process.exit(0);
}

if (!DOMAIN && !ALL) usage();
if (DOMAIN && ALL) usage("--domain and --all are exclusive");

// ---------------------------------------------------------------- run

const base = await loadHealthBase({ cacheFile: val("--cache-file") ?? undefined, forceRefresh: has("--refresh") });
const runAt = new Date().toISOString();
const codes = ALL ? base.index.domains.map((d) => d.domain_code).sort() : [DOMAIN as string];
if (DOMAIN && !base.index.domainsByCode.has(DOMAIN)) usage(`unknown domain code: ${DOMAIN}`);

const reports: DomainReport[] = [];
for (const code of codes) {
  reports.push(await runDomain(buildHealthContext(base, code), CHECKS, CHECKLIST_VERSION, runAt));
}

// ---------------------------------------------------------------- --record

const recordLog: string[] = [];
let recordFailed = false;
if (RECORD) {
  for (const r of reports) {
    const p = join(AUDITS_DIR, r.domain_code, "state.yaml");
    if (r.summary.errors > 0) {
      recordLog.push(`  ${r.domain_code}: NOT recorded, ${r.summary.errors} check(s) errored`);
      recordFailed = true;
      continue;
    }
    if (!existsSync(p)) {
      recordLog.push(`  ${r.domain_code}: skipped, no ${p}`);
      continue;
    }
    const before = readFileSync(p, "utf8");
    const records = toRecords(r);
    const after = spliceChecksBlock(before, renderChecksBlock(CHECKLIST_VERSION, runAt, records));
    const problem = verifySplice(before, after, { checklistVersion: CHECKLIST_VERSION, results: records });
    if (problem) {
      recordLog.push(`  ${r.domain_code}: NOT recorded, ${problem}`);
      recordFailed = true;
      continue;
    }
    if (after !== before) writeFileSync(p, after, "utf8");
    recordLog.push(`  ${r.domain_code}: recorded ${records.length} checks -> ${p}`);
  }
}

// ---------------------------------------------------------------- output

if (JSON_OUT) {
  console.log(JSON.stringify(ALL ? rank(reports) : reports[0], null, 2));
} else if (ALL) {
  printRanking(rank(reports));
} else {
  printDomain(reports[0]);
}
if (recordLog.length) {
  (JSON_OUT ? console.error : console.log)(`\n--record (${AUDITS_DIR}):\n${recordLog.join("\n")}`);
}
if (reports.some((r) => r.summary.errors > 0)) {
  console.error(`\n${reports.reduce((n, r) => n + r.summary.errors, 0)} check run(s) errored; see 'check errored' details`);
  process.exit(1);
}
process.exit(recordFailed ? 1 : 0);

// ---------------------------------------------------------------- formatting

function rank(rs: DomainReport[]): DomainReport[] {
  return [...rs].sort(
    (a, b) => b.summary.fail - a.summary.fail || b.summary.warn - a.summary.warn || (a.domain_code < b.domain_code ? -1 : 1),
  );
}

function clip(s: string, n: number): string {
  const one = s.replace(/\s+/g, " ");
  return FULL || one.length <= n ? one : one.slice(0, n - 3) + "...";
}

function printDomain(r: DomainReport): void {
  console.log(`domain_health ${r.domain_code} (${r.domain_name}, id ${r.domain_id})  checklist v${r.checklist_version}  ${r.run_at}`);
  console.log(`${"id".padEnd(6)} ${"result".padEnd(9)} ${"rows".padStart(5)}  detail`);
  console.log(`${"-".repeat(6)} ${"-".repeat(9)} ${"-".repeat(5)}  ${"-".repeat(60)}`);
  for (const c of r.checks) {
    const [first, ...rest] = c.findings;
    console.log(`${c.id.padEnd(6)} ${c.result.padEnd(9)} ${String(c.rows.length).padStart(5)}  ${clip(first.detail, 150)}`);
    for (const f of rest) {
      console.log(`${"".padEnd(6)} ${("." + f.result).padEnd(9)} ${String((f.rows ?? []).length).padStart(5)}  ${clip(f.detail, 150)}`);
    }
  }
  const s = r.summary;
  console.log(
    `\nsummary ${r.domain_code}: ${s.fail} fail, ${s.warn} warn, ${s.agent} agent, ${s.delegated} delegated, ${s.skipped} skipped, ${s.pass} pass` +
      ` (${s.checks} checks; ${s.not_ported} not yet ported${s.errors ? `; ${s.errors} ERRORED` : ""})`,
  );
}

function printRanking(rs: DomainReport[]): void {
  console.log(`domain_health --all  checklist v${CHECKLIST_VERSION}  ${rs.length} domains, ranked by fails then warns  ${runAt}`);
  console.log(`${"#".padStart(4)}  ${"domain".padEnd(24)} ${"fail".padStart(4)} ${"warn".padStart(4)} ${"agent".padStart(5)} ${"pass".padStart(4)}  failing / warning ids`);
  rs.forEach((r, i) => {
    const bad = r.checks.filter((c) => c.result === "fail").map((c) => c.id);
    const warn = r.checks.filter((c) => c.result === "warn").map((c) => c.id);
    const ids = [bad.length ? `fail: ${bad.join(",")}` : "", warn.length ? `warn: ${warn.join(",")}` : ""].filter(Boolean).join("  ");
    console.log(
      `${String(i + 1).padStart(4)}  ${r.domain_code.padEnd(24)} ${String(r.summary.fail).padStart(4)} ${String(r.summary.warn).padStart(4)} ${String(r.summary.agent).padStart(5)} ${String(r.summary.pass).padStart(4)}  ${ids}${r.summary.errors ? "  ERRORED" : ""}`,
    );
  });
}
