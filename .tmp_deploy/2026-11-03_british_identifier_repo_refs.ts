#!/usr/bin/env bun
// Carries the 2026-11-03 identifier renames (.tmp_deploy/2026-11-03_british_spelling_fixes.json) into repo files, as
// approved by the project owner. Exact whole token only, with `_` counted as part of a token, so
// `retail_labour_schedules` and `query_retail_labour_schedules` each match only themselves.
//
// Dry-run by default; --apply writes.
//
// YAML: values only, never keys. Every YAML and JSON file touched is parsed before and after. A YAML file is written
// only if its parsed tree after the edit equals its parsed tree before with the map applied to string values alone.
// A file that does not parse before the edit is left alone and reported.
//
// Bare state names are NOT in the token map, because `cancelled` is also an ordinary word. The repo-wide spelling
// pass (.tmp_deploy/2026-11-03_british_repo_cleanup.ts) handles the bare word.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const APPLY = process.argv.includes("--apply");
const SHOW = process.argv.includes("--show");
const data = JSON.parse(readFileSync(".tmp_deploy/2026-11-03_british_spelling_fixes.json", "utf8"));

// ---------- the map ----------
const map = new Map<string, string>();
for (const c of data.cells) {
  if (c.group !== "identifier") continue;
  if (c.old === "cancelled") continue; // bare state name, handled line by line below
  map.set(c.old, c.new);
}
// Qualified state names (<entity>.<state>) are exact tokens, so they are safe to map.
for (const l of data.labels) if (l.column === "data_object_lifecycle_state_label" && l.from.endsWith(".cancelled")) map.set(l.from, l.to);
const stateNames = data.cells.filter((c: any) => c.table === "data_object_lifecycle_states" && c.column === "state_name");
for (const c of stateNames) {
  const label = data.labels.find((l: any) => l.table === c.table && l.id === c.id) ?? null;
  if (label) map.set(label.from, label.to);
}
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const olds = [...map.keys()].sort((a, b) => b.length - a.length);
const TOKEN = new RegExp(`(?<![A-Za-z0-9_])(${olds.map(escapeRe).join("|")})(?![A-Za-z0-9_])`, "g");
const applyMap = (s: string) => s.replace(TOKEN, (m) => map.get(m)!);

// ---------- scope ----------
const ROOT = process.cwd().replace(/\\/g, "/");
const PLUGIN = "C:/dev/semantius-agent/semantius-plugin";
const TEXT = /\.(md|mdx|ts|tsx|js|mjs|cjs|json|yaml|yml|csv|tsv|txt|html|toml|sql|sh|py)$/i;
const NEVER = new Set(["node_modules", ".git", ".next", "dist"]);
const walk = (dir: string): string[] => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    if (NEVER.has(n)) return [];
    const p = join(dir, n).replace(/\\/g, "/");
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
};
const isHeldBack = (f: string) =>
  basename(f) === "CLAUDE.md" ||
  /(^|\/)a-[^/]*\.md$/.test(f) ||
  f.startsWith("plans/snapshots/") ||
  f === "plans/relationship-natural-order-plan.md" ||
  f.startsWith(".claude/skills/llm-wiki/");
const rootDocs = readdirSync(".").filter((n) => /\.(md|txt)$/i.test(n) && statSync(n).isFile());
const inScopeAll = [...["audits", "plans", ".claude/skills", "scripts", "catalog", "research"].flatMap(walk), ...rootDocs, ...walk(PLUGIN)].filter((f) => TEXT.test(f));
const inScope = inScopeAll.filter((f) => !isHeldBack(f));
const heldBack = inScopeAll.filter(isHeldBack);

const crud = readdirSync(".").filter((n) => /^crud.*\.log$/i.test(n));
const domainMaps = readdirSync(".").filter((n) => /^domain_map.*\.json$/i.test(n));
const countOnly: Record<string, string[]> = {
  "backups/": walk("backups").filter((f) => TEXT.test(f)),
  ".tmp_deploy/": walk(".tmp_deploy").filter((f) => TEXT.test(f) && !f.includes("british_")),
  ".cache/": walk(".cache"),
  "crud*.log": crud,
  "domain_map*.json": domainMaps,
  ".agents/skills/": walk(".agents/skills").filter((f) => TEXT.test(f)),
  "a-*.md answer files": heldBack.filter((f) => /(^|\/)a-[^/]*\.md$/.test(f)),
  "plans/snapshots/": heldBack.filter((f) => f.startsWith("plans/snapshots/")),
  ".claude/skills/llm-wiki/": heldBack.filter((f) => f.startsWith(".claude/skills/llm-wiki/")),
  "plans/relationship-natural-order-plan.md": heldBack.filter((f) => f === "plans/relationship-natural-order-plan.md"),
  "CLAUDE.md files": heldBack.filter((f) => basename(f) === "CLAUDE.md"),
};

// ---------- YAML check ----------
const parseYaml = (t: string) => (Bun as any).YAML.parse(t);
type Walk = { ok: boolean; why?: string };
function sameExceptValues(a: any, b: any, path: string): Walk {
  if (typeof a === "string") return b === applyMap(a) ? { ok: true } : { ok: false, why: `${path}: value is not the old value with the map applied` };
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return { ok: false, why: `${path}: list changed` };
    for (let i = 0; i < a.length; i++) {
      const r = sameExceptValues(a[i], b[i], `${path}[${i}]`);
      if (!r.ok) return r;
    }
    return { ok: true };
  }
  if (a && typeof a === "object") {
    const ka = Object.keys(a), kb = Object.keys(b ?? {});
    if (ka.join("\u0000") !== kb.join("\u0000")) return { ok: false, why: `${path}: keys changed` };
    for (const k of ka) {
      const r = sameExceptValues(a[k], b[k], `${path}.${k}`);
      if (!r.ok) return r;
    }
    return { ok: true };
  }
  return a === b ? { ok: true } : { ok: false, why: `${path}: scalar changed` };
}
function keysHoldingOld(node: any, out: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((n) => keysHoldingOld(n, out));
  else if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) {
    TOKEN.lastIndex = 0;
    if (TOKEN.test(k)) out.push(k);
    keysHoldingOld(v, out);
  }
  TOKEN.lastIndex = 0;
  return out;
}
// YAML edit that leaves mapping keys alone: on each line, only the text after a leading `key:` is rewritten.
const KEY_PREFIX = /^(\s*(?:-\s+)*(?:"[^"]*"|'[^']*'|[^\s#'"\-][^:#]*?)\s*:)(\s.*|$)/;
function applyYaml(text: string, keys: string[]): string {
  if (!keys.length) return applyMap(text);
  return text.split("\n").map((line) => {
    const m = line.match(KEY_PREFIX);
    if (m && keys.some((k) => m[1].includes(k))) return m[1] + applyMap(m[2]);
    return applyMap(line);
  }).join("\n");
}

// ---------- plan ----------
const perArea = new Map<string, { files: number; hits: number }>();
const area = (f: string) => (f.startsWith(PLUGIN) ? "semantius-plugin" : f.includes("/") ? f.split("/").slice(0, f.startsWith(".claude") ? 2 : 1).join("/") : "root docs");
const problems: string[] = [];
const perToken = new Map<string, number>();
const edits: { file: string; before: string; after: string }[] = [];
for (const f of inScope) {
  const before = readFileSync(f, "utf8");
  const hits = before.match(TOKEN) ?? [];
  if (!hits.length) continue;
  let after = before;
  const isYaml = /\.ya?ml$/i.test(f);
  if (isYaml) {
    let treeBefore: any;
    try {
      treeBefore = parseYaml(before);
    } catch (e) {
      problems.push(`${f}: does not parse before the edit, left alone: ${(e as Error).message.split("\n")[0]}`);
      continue;
    }
    const keys = [...new Set(keysHoldingOld(treeBefore))];
    if (keys.length) console.log(`  keys left as they are in ${f}: ${keys.join(", ")}`);
    after = applyYaml(before, keys);
  } else if (/\.json$/i.test(f)) {
    try {
      JSON.parse(before);
    } catch (e) {
      problems.push(`${f}: JSON does not parse before the edit, left alone`);
      continue;
    }
    after = applyMap(before);
  } else {
    after = applyMap(before);
  }
  if (isYaml) {
    try {
      const r = sameExceptValues(parseYaml(before), parseYaml(after), "$");
      if (!r.ok) {
        problems.push(`${f}: YAML tree changed beyond values: ${r.why}`);
        continue;
      }
    } catch (e) {
      problems.push(`${f}: does not parse after the edit: ${(e as Error).message.split("\n")[0]}`);
      continue;
    }
  }
  if (/\.json$/i.test(f)) {
    try {
      JSON.parse(after);
    } catch {
      problems.push(`${f}: JSON does not parse after the edit`);
      continue;
    }
  }
  if (after === before) continue;
  for (const h of hits) perToken.set(h, (perToken.get(h) ?? 0) + 1);
  const a = area(f);
  const cur = perArea.get(a) ?? { files: 0, hits: 0 };
  cur.files++;
  cur.hits += hits.length;
  perArea.set(a, cur);
  edits.push({ file: f, before, after });
  if (SHOW) console.log(`  ${String(hits.length).padStart(3)}  ${f}`);
}

console.log(`\n${map.size} old identifiers mapped. ${inScope.length} in-scope text files.`);
console.log(`Per area:\n${[...perArea].sort().map(([a, v]) => `  ${a}: ${v.files} files, ${v.hits} replacements`).join("\n")}`);
console.log(`Per token:\n${[...perToken].sort((a, b) => b[1] - a[1]).map(([t, n]) => `  ${t}: ${n}`).join("\n")}`);
console.log(`Files to write: ${edits.length}.`);
console.log(`\nCount only, not changed:`);
for (const [name, files] of Object.entries(countOnly)) {
  let hits = 0, withHits = 0;
  for (const f of files) {
    const t = readFileSync(f, "utf8");
    const n = t.match(TOKEN)?.length ?? 0;
    hits += n;
    if (n) withHits++;
  }
  console.log(`  ${name}: ${hits} hits in ${withHits} of ${files.length} files`);
}
if (problems.length) {
  console.error(`\n${problems.length} problems:\n${problems.join("\n")}`);
}
if (!APPLY) {
  console.log("\nNo writes (dry-run).");
  process.exit(problems.length ? 1 : 0);
}
for (const e of edits) writeFileSync(e.file, e.after);
console.log(`\nwrote ${edits.length} files`);
process.exit(problems.length ? 1 : 0);
