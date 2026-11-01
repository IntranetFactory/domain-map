#!/usr/bin/env bun
//
// blueprint_contract_check.ts: the architect checker as an acceptance gate for the generated
// blueprints (plans/domain-health-and-blueprint-quality-plan.md Phase 3 step 2). Read-only against
// the catalog; never writes into catalog/blueprints/; never modifies the checker.
//
// For every existing blueprint (catalog/blueprints/*-semantic-blueprint.md, mapped to its module as
// generate_blueprints.ts --regenerate does) it:
//   1. renders the blueprint in memory with renderBlueprint (or, with --from-disk, reads the file);
//   2. injects the access level the architect would pick when cloning it: `access_scope: raci` when
//      every gate is wired to a process, `gated` for the other blueprints with gates, nothing for a
//      blueprint without gates (the catalog body carries no `access_scope`);
//   3. for `gated`, first applies the architect's gated body conversion (gate-permission-model-plan.md
//      N1): every lifecycle gate gets ✓ in `included in :admin?` and its `<slug>:admin -> gate` row in
//      the 9.1 hierarchy (high-risk ones too), and the RACI trio (RACI realization, Processes wired,
//      functional ownership) and the front-matter `persona` list are dropped;
//   4. writes the copy to a temp folder (default: a fresh folder under the OS temp dir) and runs the
//      architect checker on all copies in one process;
//   5. classifies every checker error:
//        a         caused by the data, and the data finding is also an E4 or E4b health finding
//        b         caused by the data, but not an E4 / E4b finding (the reason names the data)
//        consumer  a section 7 row on a non-mastered (consumer / contributor / derived) entity that
//                  shows another module's gate, or none (the section 7 rendering question)
//        c         anything else: a generator, harness or checker mismatch
//
// Exit code: 0 when every error is in category a (the plan's acceptance), 1 otherwise, 2 on usage.
//
// Run from the project root (semantius reads .env from the cwd):
//   bun run scripts/analytics/blueprint_contract_check.ts                       # all, rendered in memory
//   bun run scripts/analytics/blueprint_contract_check.ts --from-disk           # the committed files
//   bun run scripts/analytics/blueprint_contract_check.ts --module HIRING-STARTER [--module ...]
// Options:
//   --out <dir>        where the copies go (default: a new folder under the OS temp dir)
//   --checker <path>   the architect checker (default: the semantius-plugin source path below)
//   --json             machine output
//   --verbose          list warnings too, and keep the generator's emit-time warnings on stderr
//   --refresh          ignore the catalog cache and refetch
//   --cache-file <p>   catalog cache file (default: the health check's, under the OS temp dir, so the
//                      tracked .cache/.catalog-cache.json is never rewritten by this script)

import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { deriveModuleModel, makeDeriveCtx, moduleSlug, type BlueprintModel, type DeriveCtx } from "../lib/blueprint_derive.ts";
import { loadCachedCatalog, type ModuleRow } from "../lib/catalog.ts";
import { E_CHECKS } from "../lib/health/checks_e.ts";
import { buildHealthContext, createQueryMemo, DEFAULT_HEALTH_CACHE_FILE } from "../lib/health/context.ts";
import { renderBlueprint } from "../generate_blueprints.ts";

export const DEFAULT_CHECKER = "C:/dev/semantius-agent/semantius-plugin/skills/semantius-architect/references/consistency-check.ts";
const ROOT = resolve(import.meta.dir, "..", "..");
const BLUEPRINTS_DIR = join(ROOT, "catalog", "blueprints");
const BLUEPRINT_SUFFIX = "-semantic-blueprint.md";
const LIFECYCLE_GATE = "workflow-gate (lifecycle)";

// ---------------------------------------------------------------- markdown helpers

// Table cells, splitting on unescaped `|` (the generator escapes a pipe inside a cell as `\|`).
export function splitCells(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map((c) => c.trim());
}

const joinCells = (cells: string[]): string => `| ${cells.join(" | ")} |`;
const isRow = (l: string): boolean => /^\s*\|/.test(l);
const isSeparator = (l: string): boolean => isRow(l) && splitCells(l).every((c) => /^:?-{2,}:?$/.test(c));
const headerName = (c: string): string => c.replace(/[`*]/g, "").trim().toLowerCase();
const bare = (c: string): string => c.replace(/`/g, "").trim();

function frontmatterRange(lines: string[]): [number, number] | null {
  if (lines[0] !== "---") return null;
  const end = lines.indexOf("---", 1);
  return end > 0 ? [0, end] : null;
}

function frontmatterValue(lines: string[], key: string): string | null {
  const r = frontmatterRange(lines);
  if (!r) return null;
  for (let i = r[0] + 1; i < r[1]; i++) {
    const m = lines[i].match(new RegExp(`^${key}:\\s*(.+?)\\s*$`));
    if (m) return m[1].replace(/^["']|["']$/g, "");
  }
  return null;
}

// [start, end) of the subsection whose heading matches `re`, up to the next `##` / `###` heading.
function subsectionRange(lines: string[], re: RegExp): [number, number] | null {
  const start = lines.findIndex((l) => re.test(l));
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) if (/^#{2,3}\s/.test(lines[i])) { end = i; break; }
  return [start, end];
}

// The table (header, separator, rows) that follows the line at `from`, skipping blank lines.
function tableAfter(lines: string[], from: number): [number, number] | null {
  let i = from + 1;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length || !isRow(lines[i])) return null;
  let j = i;
  while (j < lines.length && isRow(lines[j])) j++;
  return [i, j];
}

// Remove a `**Label:**` block: the label, the table or `_(none...)_` placeholder after it, and one
// trailing blank line.
function removeLabeledBlock(lines: string[], label: RegExp): void {
  const at = lines.findIndex((l) => label.test(l.trim()));
  if (at < 0) return;
  let j = at + 1;
  while (j < lines.length && lines[j].trim() === "") j++;
  if (j < lines.length && isRow(lines[j])) {
    while (j < lines.length && isRow(lines[j])) j++;
  } else if (j < lines.length && /^_\(none/.test(lines[j].trim())) {
    j++;
  }
  if (j < lines.length && lines[j].trim() === "") j++;
  lines.splice(at, j - at);
}

// ---------------------------------------------------------------- the access level and the copy

export type AccessLevel = "raci" | "gated" | null;

// The level the architect picks when it clones the blueprint: raci when every gate is wired to a
// process, gated when some gate is unwired, none without gates.
export function accessLevelFor(model: BlueprintModel): AccessLevel {
  const gates = model.perModule.flatMap((pm) => pm.gates);
  if (gates.length === 0) return null;
  return gates.every((g) => g.processIds.length > 0) ? "raci" : "gated";
}

export function injectAccessScope(md: string, level: AccessLevel): string {
  if (!level) return md;
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const r = frontmatterRange(lines);
  if (!r) return md;
  const existing = lines.findIndex((l, i) => i > r[0] && i < r[1] && /^access_scope:/.test(l));
  if (existing >= 0) {
    lines[existing] = `access_scope: ${level}`;
  } else {
    const created = lines.findIndex((l, i) => i > r[0] && i < r[1] && /^created_at:/.test(l));
    lines.splice(created >= 0 ? created : r[1], 0, `access_scope: ${level}`);
  }
  return lines.join("\n");
}

// The architect's `gated` body conversion (gate-permission-model-plan.md section 3, N1) on a
// level-free catalog body: every lifecycle gate's `included in :admin?` is ✓ and it has its
// `<slug>:admin -> gate` hierarchy row (high-risk ones too), and the RACI trio is dropped.
export function applyGatedConversion(md: string): string {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const slug = frontmatterValue(lines, "system_slug") ?? "";
  const admin = `${slug}:admin`;

  // 8.1: ✓ on every workflow-gate (lifecycle) row; the admin row inherits every gate.
  const gates: string[] = [];
  const s81 = subsectionRange(lines, /^###\s+8\.1\b/);
  if (s81) {
    let header: string[] | null = null;
    for (let i = s81[0] + 1; i < s81[1]; i++) {
      if (!isRow(lines[i])) { header = null; continue; }
      if (isSeparator(lines[i])) continue;
      const cells = splitCells(lines[i]);
      if (!header) { header = cells.map(headerName); continue; }
      const col = (n: string) => header!.indexOf(n);
      const tier = cells[col("tier")] ?? "";
      if (tier.startsWith(LIFECYCLE_GATE)) {
        gates.push(bare(cells[col("permission")] ?? ""));
        cells[col("included in :admin?")] = "✓";
        lines[i] = joinCells(cells);
      } else if (tier === "baseline-admin" && col("description") >= 0) {
        cells[col("description")] = cells[col("description")].replace(/ except the high-risk ones$/, "");
        lines[i] = joinCells(cells);
      }
    }
  }

  // 9.1 hierarchy: add the missing `<slug>:admin -> gate` rows, in 8.1 order.
  const h = lines.findIndex((l) => /^\*\*Permission hierarchy:\*\*/.test(l.trim()));
  const ht = h >= 0 ? tableAfter(lines, h) : null;
  if (ht) {
    const rows = lines.slice(ht[0] + 2, ht[1]); // after header + separator
    const pair = (l: string) => splitCells(l).map(bare).join(" -> ");
    let cursor = rows.findIndex((l) => pair(l) === `${slug}:manage -> ${slug}:read`);
    if (cursor < 0) cursor = rows.length - 1;
    for (const code of gates) {
      const at = rows.findIndex((l) => pair(l) === `${admin} -> ${code}`);
      if (at >= 0) { cursor = Math.max(cursor, at); continue; }
      rows.splice(cursor + 1, 0, joinCells([`\`${admin}\``, `\`${code}\``]));
      cursor++;
    }
    lines.splice(ht[0] + 2, ht[1] - (ht[0] + 2), ...rows);
  }

  // The RACI trio and the persona list (the template omits `persona` without RACI realization).
  removeLabeledBlock(lines, /^\*\*Processes wired:\*\*/);
  removeLabeledBlock(lines, /^\*\*RACI realization:\*\*/);
  const fo = subsectionRange(lines, /^###\s+9\.\d+\s+Functional ownership\b/);
  if (fo) lines.splice(fo[0], fo[1] - fo[0]);
  const r = frontmatterRange(lines);
  if (r) {
    const p = lines.findIndex((l, i) => i > r[0] && i < r[1] && /^persona:/.test(l));
    if (p >= 0) lines.splice(p, 1);
  }
  return lines.join("\n");
}

export function prepareCopy(md: string, level: AccessLevel): string {
  const withLevel = injectAccessScope(md, level);
  return level === "gated" ? applyGatedConversion(withLevel) : withLevel;
}

// ---------------------------------------------------------------- the checker

export type CheckerIssue = { check: string; detail: string; warn: boolean };
export type CheckerResult = { issues: CheckerIssue[]; error?: string };

// The checker's report, keyed by file basename.
export function parseCheckerOutput(stdout: string): Map<string, CheckerResult> {
  const out = new Map<string, CheckerResult>();
  let cur: CheckerResult | null = null;
  let warn = false;
  let check = "";
  for (const line of stdout.split(/\r?\n/)) {
    if (line.trim() === "") continue;
    if (/^RESULT:/.test(line)) { cur = null; continue; }
    if (!/^\s/.test(line)) {
      cur = { issues: [] };
      out.set(basename(line.replace(/\s{2}\(artifact:.*\)\s*$/, "").trim()), cur);
      continue;
    }
    if (!cur) continue;
    let m = line.match(/^ {2}([✗⚠]) (.+)$/);
    if (m) { warn = m[1] === "⚠"; check = m[2].trim(); continue; }
    m = line.match(/^ {6}- (.*)$/);
    if (m) { cur.issues.push({ check, detail: m[1], warn }); continue; }
    m = line.match(/^ {2}\[ERROR\] (.*)$/);
    if (m) cur.error = m[1];
  }
  return out;
}

export function runChecker(files: string[], checker: string = DEFAULT_CHECKER): { results: Map<string, CheckerResult>; exitCode: number; stderr: string } {
  const p = Bun.spawnSync({ cmd: ["bun", checker, ...files], stdout: "pipe", stderr: "pipe" });
  return { results: parseCheckerOutput(p.stdout.toString()), exitCode: p.exitCode ?? 1, stderr: p.stderr.toString() };
}

// ---------------------------------------------------------------- classification

export type Category = "a" | "b" | "consumer" | "c";
export const CATEGORY_LABEL: Record<Category, string> = {
  a: "data-caused, also an E4 / E4b data finding",
  b: "data-caused, not an E4 / E4b finding",
  consumer: "section 7 row on a non-mastered entity showing another module's gate (or none)",
  c: "other (generator, harness or checker mismatch)",
};

// One section 7 gated row of the checked copy, parsed from its text.
type S7Row = { entity: string; role: string; ownerNote: string; state: string; gate: string; used: boolean };

function parseSection7(text: string): S7Row[] {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => /^##\s+7\./.test(l));
  if (start < 0) return [];
  const out: S7Row[] = [];
  let entity = "", role = "master", ownerNote = "";
  let header: string[] | null = null;
  for (let i = start + 1; i < lines.length && !/^##\s/.test(lines[i]); i++) {
    const l = lines[i];
    const hm = l.match(/^###\s+`([a-z][a-z0-9_]*)`/);
    if (hm) { entity = hm[1]; role = "master"; ownerNote = ""; header = null; continue; }
    const nm = l.match(/^_This scope holds `[^`]+` as \*\*([a-z_]+)\*\*; the canonical state machine is owned by (.+)\._$/);
    if (nm) { role = nm[1]; ownerNote = nm[2]; continue; }
    if (!isRow(l)) { header = null; continue; }
    if (isSeparator(l)) continue;
    const cells = splitCells(l);
    if (!header) { header = cells.map(headerName); continue; }
    const at = (n: string) => bare(cells[header!.indexOf(n)] ?? "");
    if (!at("requires_permission?").includes("✓")) continue;
    out.push({ entity, role, ownerNote, state: at("state_name"), gate: at("derived gate"), used: false });
  }
  return out;
}

export type DataFindings = { e4Processes: Set<number>; e4bStates: Set<number> };

// The E4 / E4b health findings over every domain: E4 rows are process ids, E4b rows lifecycle
// state ids. Neither check queries the catalog beyond the loaded index.
export async function e4DataFindings(ctx: DeriveCtx): Promise<DataFindings> {
  const base = { index: ctx.index, all: ctx.all, query: createQueryMemo() };
  const e4 = E_CHECKS.find((c) => c.id === "E4")!;
  const e4b = E_CHECKS.find((c) => c.id === "E4b")!;
  const out: DataFindings = { e4Processes: new Set(), e4bStates: new Set() };
  for (const d of ctx.index.domains) {
    const h = buildHealthContext(base, d.domain_code);
    for (const f of await e4.run(h)) if (f.result !== "pass") for (const r of f.rows ?? []) out.e4Processes.add(Number(r));
    for (const f of await e4b.run(h)) if (f.result !== "pass") for (const r of f.rows ?? []) out.e4bStates.add(Number(r));
  }
  return out;
}

type BlueprintCase = { slug: string; module: ModuleRow; model: BlueprintModel; level: AccessLevel; copy: string; s7: S7Row[]; minted: Set<string> };

function mintedLifecycleGates(model: BlueprintModel): Set<string> {
  return new Set(model.perModule.flatMap((pm) => pm.permissions.filter((p) => p.tier === LIFECYCLE_GATE).map((p) => p.code)));
}

export function classifyIssue(issue: CheckerIssue, bp: BlueprintCase, ctx: DeriveCtx, data: DataFindings): { category: Category; reason: string } {
  const procByKey = (key: string): number | null => {
    const m = key.match(/^process#(\d+)$/);
    if (m) return Number(m[1]);
    const p = ctx.all.processes.find((x: any) => x.process_key === key);
    return p ? (p.id as number) : null;
  };
  const moduleIds = new Set(bp.model.modules.map((m) => m.id));

  let m = issue.detail.match(/^§7 derived gate `([^`]*)` does not follow/);
  if (m) {
    const gate = m[1];
    const row = bp.s7.find((r) => !r.used && r.gate === gate && !bp.minted.has(r.gate));
    if (!row) return { category: "c", reason: "no matching section 7 row in the copy" };
    row.used = true;
    const obj = ctx.index.dataObjects.find((o) => o.data_object_name === row.entity);
    const state = obj ? (ctx.all.lifecycleByDataObjectId.get(obj.id) ?? []).find((s: any) => s.state_name === row.state) : undefined;
    const masters = obj ? (ctx.all.dmdoByDataObjectId.get(obj.id) ?? []).filter((r: any) => r.role === "master").map((r: any) => ctx.index.modulesById.get(r.domain_module_id)?.domain_module_code ?? `#${r.domain_module_id}`) : [];
    const realizer = state?.domain_module_id != null ? ctx.index.modulesById.get(state.domain_module_id)?.domain_module_code ?? `#${state.domain_module_id}` : null;
    const where = `\`${row.entity}.${row.state}\``;
    if (row.role === "master" || row.role === "embedded_master") {
      if (masters.length > 1) {
        return { category: "b", reason: `${where}: the entity has ${masters.length} masters (${masters.join(", ")}); the state is realized by ${realizer ?? "no module"}, so this unit does not mint \`${gate}\`` };
      }
      if (state && state.domain_module_id != null && !moduleIds.has(state.domain_module_id)) {
        return { category: "b", reason: `${where} (${row.role} here): its realizer ${realizer} is out of scope, so 8.1 does not mint \`${gate}\`` };
      }
      return { category: "c", reason: `${where} (${row.role} here): the gate is not minted in 8.1` };
    }
    if (gate === "-" && masters.length === 0) {
      return { category: "b", reason: `${where} (${row.role} here): no module masters \`${row.entity}\`, so no gate resolves` };
    }
    if (gate === "-" || !gate.startsWith(`${bp.slug}:`)) {
      return { category: "consumer", reason: `${where} (${row.role} here, owned by ${row.ownerNote || "?"}) shows ${gate === "-" ? "no gate" : `\`${gate}\``}` };
    }
    return { category: "c", reason: `${where} (${row.role} here) shows this unit's \`${gate}\`, which 8.1 does not mint` };
  }

  m = issue.detail.match(/^RACI rule: process `([^`]*)` has (\d+) accountable rows/);
  if (m) {
    const pid = procByKey(m[1]);
    if (pid != null && data.e4Processes.has(pid)) return { category: "a", reason: `E4 flags process ${pid} (\`${m[1]}\`)` };
    return { category: "b", reason: `process \`${m[1]}\` (${pid ?? "unknown id"}) has ${m[2]} Accountable rows in process_raci but is no E4 gated process (it wires no gated state of a mastered entity)` };
  }

  m = issue.detail.match(/^RACI rule: process gate `([^`]*)` is in the `grant gates \[\.\.\.\]` list of (\d+) accountable rows/);
  if (m) {
    const gate = bp.model.perModule.flatMap((pm) => pm.gates).find((g) => g.code === m![1]);
    if (!gate) return { category: "c", reason: "the gate is not in the model" };
    const flagged = gate.processIds.filter((p) => data.e4Processes.has(p));
    if (flagged.length > 0) return { category: "a", reason: `E4 flags process(es) ${flagged.join(", ")} of \`${gate.code}\`` };
    if (gate.processIds.length === 0) {
      const unwired = gate.states.map((s) => s.state.id as number).filter((id) => data.e4bStates.has(id));
      return unwired.length > 0
        ? { category: "a", reason: `E4b flags the unwired state(s) ${unwired.join(", ")} of \`${gate.code}\`` }
        : { category: "b", reason: `\`${gate.code}\` is wired to no process` };
    }
    if (gate.processIds.length > 1) return { category: "b", reason: `\`${gate.code}\` is wired to ${gate.processIds.length} processes (${gate.processIds.join(", ")}), so ${gate.processIds.length} Accountable rows hold it` };
    return { category: "c", reason: `\`${gate.code}\` is wired to one process that E4 accepts` };
  }

  if (issue.check === "§7 high risk" && /disagree on `high risk\?`/.test(issue.detail)) {
    return { category: "b", reason: "the states sharing one gate code disagree on is_high_risk" };
  }
  return { category: "c", reason: "" };
}

// ---------------------------------------------------------------- CLI

type Outcome = {
  slug: string;
  module: string;
  level: AccessLevel;
  pass: boolean;
  renderError?: string;
  issues: (CheckerIssue & { category: Category; reason: string })[];
  warnings: CheckerIssue[];
};

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const has = (f: string) => argv.includes(f);
  const val = (f: string): string | null => {
    const i = argv.indexOf(f);
    return i >= 0 ? argv[i + 1] ?? null : null;
  };
  const vals = (f: string): string[] => argv.flatMap((a, i) => (a === f && argv[i + 1] ? [argv[i + 1]] : []));
  const FROM_DISK = has("--from-disk");
  const JSON_OUT = has("--json");
  const VERBOSE = has("--verbose");
  const CHECKER = val("--checker") ?? DEFAULT_CHECKER;
  const MODULES = vals("--module");

  if (!existsSync(CHECKER)) {
    console.error(`architect checker not found: ${CHECKER} (pass --checker <path>)`);
    process.exit(2);
  }
  const outDir = val("--out") ? resolve(val("--out")!) : mkdtempSync(join(tmpdir(), "blueprint-contract-"));
  if (outDir.toLowerCase().startsWith(resolve(BLUEPRINTS_DIR).toLowerCase())) {
    console.error(`refusing to write copies into ${BLUEPRINTS_DIR}; pass another --out`);
    process.exit(2);
  }
  mkdirSync(outDir, { recursive: true });

  const { index, all } = await loadCachedCatalog({ cacheFile: val("--cache-file") ?? DEFAULT_HEALTH_CACHE_FILE, forceRefresh: has("--refresh") });
  const ctx = makeDeriveCtx(index, all);

  const bySlug = new Map(index.modules.map((m) => [moduleSlug(m.domain_module_code), m] as const));
  const slugs = readdirSync(BLUEPRINTS_DIR).filter((f) => f.endsWith(BLUEPRINT_SUFFIX)).map((f) => f.slice(0, -BLUEPRINT_SUFFIX.length)).sort();
  const wanted = new Set(MODULES.map((c) => moduleSlug(c)));
  const cases: BlueprintCase[] = [];
  const outcomes: Outcome[] = [];
  const files: string[] = [];
  const orphans: string[] = [];
  for (const slug of slugs) {
    if (wanted.size > 0 && !wanted.has(slug)) continue;
    const m = bySlug.get(slug);
    if (!m) { orphans.push(slug); continue; }
    const model = deriveModuleModel(m, ctx);
    const level = accessLevelFor(model);
    let md: string;
    try {
      if (FROM_DISK) {
        md = readFileSync(join(BLUEPRINTS_DIR, `${slug}${BLUEPRINT_SUFFIX}`), "utf8").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
      } else {
        const warn = console.warn;
        if (!VERBOSE) console.warn = () => {};
        try {
          md = renderBlueprint([m], index, all);
        } finally {
          console.warn = warn;
        }
      }
    } catch (e) {
      outcomes.push({ slug, module: m.domain_module_code, level, pass: false, renderError: (e as Error).message, issues: [], warnings: [] });
      continue;
    }
    const copy = prepareCopy(md, level);
    const path = join(outDir, `${slug}${BLUEPRINT_SUFFIX}`);
    writeFileSync(path, copy, "utf8");
    files.push(path);
    cases.push({ slug, module: m, model, level, copy, s7: parseSection7(copy), minted: mintedLifecycleGates(model) });
  }

  const { results, stderr } = files.length ? runChecker(files, CHECKER) : { results: new Map<string, CheckerResult>(), stderr: "" };
  const data = await e4DataFindings(ctx);
  for (const bp of cases) {
    const r = results.get(`${bp.slug}${BLUEPRINT_SUFFIX}`);
    if (!r) {
      outcomes.push({ slug: bp.slug, module: bp.module.domain_module_code, level: bp.level, pass: false, renderError: `no checker report (stderr: ${stderr.trim().slice(0, 300)})`, issues: [], warnings: [] });
      continue;
    }
    const errors = r.issues.filter((i) => !i.warn);
    if (r.error) errors.push({ check: "ERROR", detail: r.error, warn: false });
    outcomes.push({
      slug: bp.slug,
      module: bp.module.domain_module_code,
      level: bp.level,
      pass: errors.length === 0,
      issues: errors.map((i) => ({ ...i, ...classifyIssue(i, bp, ctx, data) })),
      warnings: r.issues.filter((i) => i.warn),
    });
  }
  outcomes.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));

  const cats: Category[] = ["a", "b", "consumer", "c"];
  const byCat = Object.fromEntries(cats.map((c) => [c, { issues: 0, blueprints: new Set<string>() }])) as Record<Category, { issues: number; blueprints: Set<string> }>;
  for (const o of outcomes) for (const i of o.issues) { byCat[i.category].issues++; byCat[i.category].blueprints.add(o.slug); }
  const levels = { raci: 0, gated: 0, none: 0 };
  for (const o of outcomes) levels[o.level ?? "none"]++;
  const passing = outcomes.filter((o) => o.pass).length;
  const renderFailures = outcomes.filter((o) => o.renderError).length;
  const passWithout = (set: Category[]) => outcomes.filter((o) => !o.renderError && o.issues.every((i) => set.includes(i.category))).length;
  const accepted = renderFailures === 0 && byCat.b.issues + byCat.c.issues + byCat.consumer.issues === 0;
  const summary = {
    blueprints: outcomes.length,
    source: FROM_DISK ? "catalog/blueprints (disk)" : "rendered in memory",
    copies: outDir,
    checker: CHECKER,
    levels,
    pass: passing,
    fail: outcomes.length - passing,
    render_failures: renderFailures,
    by_category: Object.fromEntries(cats.map((c) => [c, { label: CATEGORY_LABEL[c], issues: byCat[c].issues, blueprints: byCat[c].blueprints.size }])),
    pass_setting_aside_consumer: passWithout(["consumer"]),
    pass_setting_aside_data_and_consumer: passWithout(["a", "b", "consumer"]),
    pass_setting_aside_e4_data: passWithout(["a"]),
    orphans,
    accepted,
  };

  if (JSON_OUT) {
    console.log(JSON.stringify({ summary, blueprints: outcomes }, null, 2));
  } else {
    for (const o of outcomes) {
      const counts = cats.filter((c) => o.issues.some((i) => i.category === c)).map((c) => `${c} ${o.issues.filter((i) => i.category === c).length}`).join(", ");
      const head = o.renderError ? "FAIL" : o.pass ? "PASS" : "FAIL";
      console.log(`${head}  ${o.slug.padEnd(40)} ${(o.level ?? "-").padEnd(6)} ${o.renderError ? `render/check failed: ${o.renderError}` : o.pass ? `0 issues (${o.warnings.length} warning(s))` : `${o.issues.length} issue(s): ${counts}`}`);
      for (const i of o.issues) console.log(`      [${i.category}] ${i.check}: ${i.detail}${i.reason ? `\n            -> ${i.reason}` : ""}`);
      if (VERBOSE) for (const w of o.warnings) console.log(`      [warn] ${w.check}: ${w.detail}`);
    }
    console.log("");
    console.log(`blueprint contract check: ${summary.blueprints} blueprint(s), ${summary.source}; copies in ${outDir}`);
    console.log(`  levels injected: raci ${levels.raci}, gated ${levels.gated}, none ${levels.none}`);
    console.log(`  checker: ${passing} pass, ${summary.fail} fail${renderFailures ? ` (${renderFailures} could not be rendered or checked)` : ""}`);
    for (const c of cats) console.log(`  [${c}] ${CATEGORY_LABEL[c]}: ${byCat[c].issues} issue(s) in ${byCat[c].blueprints.size} blueprint(s)`);
    console.log(`  pass setting aside [consumer]: ${summary.pass_setting_aside_consumer}; setting aside [a] only: ${summary.pass_setting_aside_e4_data}; setting aside [a], [b] and [consumer]: ${summary.pass_setting_aside_data_and_consumer} (of ${summary.blueprints})`);
    if (orphans.length) console.log(`  ${orphans.length} blueprint file(s) match no module: ${orphans.join(", ")}`);
    console.log(`  acceptance (every error is an E4 / E4b data finding): ${accepted ? "MET" : "NOT MET"}`);
  }
  process.exit(accepted ? 0 : 1);
}

if (import.meta.main) await main();
