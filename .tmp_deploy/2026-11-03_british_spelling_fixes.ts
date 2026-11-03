#!/usr/bin/env bun
// Replaces British spellings in live catalog rows with American ones (CLAUDE.md "American English only", SKILL.md
// check B16). The project owner authorized these writes on 2026-11-03, identifiers included. The target cells, each
// reviewed in context, are in .tmp_deploy/2026-11-03_british_spelling_fixes.json, which also lists every hit left
// unchanged and why.
//
// Dry-run by default.
//   --apply    write, after every check below has passed
//   --resume   continue a run that stopped partway: a cell already at its new text is skipped, and the existing
//              backup is kept
//   --full     print whole cells in the plan instead of the changed fragment
//
// Before any write it reads every target row and stops, reporting all differences at once, if a current value is not
// the expected old text, if a new value is anything other than the old value with the word map applied, or if a new
// identifier is already taken. The old values go to backups/ first. Computed `*_label` columns recompute only when
// their own row is written, so sources are written first, and a label still out of date afterward gets a same-value
// PATCH. record_status is never sent, and is compared before and after.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

type Row = Record<string, any>;
type Cell = { table: string; id: number; column: string; group: string; old: string; new: string; words: string[] };
type Label = { table: string; id: number; column: string; from: string; to: string };
type Data = { word_map: Record<string, string>; status_tables: string[]; cells: Cell[]; labels: Label[]; left_unchanged: { reason: string }[] };

const APPLY = process.argv.includes("--apply");
const RESUME = process.argv.includes("--resume");
const FULL = process.argv.includes("--full");
const DATA = ".tmp_deploy/2026-11-03_british_spelling_fixes.json";
const BACKUP = "backups/british-spelling-2026-11-03.json";
const EM_DASH = String.fromCharCode(0x2014);

// Sources first, so a label that reads another row sees the new value when its own row is written.
const WRITE_ORDER = [
  "data_objects", "capabilities", "trigger_events", "tools", "business_processes", "domain_modules", "domains", "solutions", "vendors",
  "industries", "jurisdictions", "regulations", "data_object_lifecycle_states", "data_object_relationships", "domain_data_objects",
  "domain_module_capabilities", "domain_module_tools", "business_function_domains", "handoffs",
];
// The column a same-value write uses to make a row recompute its label.
const REFRESH_COLUMN: Record<string, string> = {
  capability_domains: "notes",
  data_object_lifecycle_states: "state_name",
  data_object_relationships: "notes",
  domain_data_objects: "notes",
  domain_module_data_objects: "notes",
  handoffs: "notes",
};
// Identifiers that must not already exist on another row.
const UNIQUE: Record<string, string[]> = {
  data_objects: ["data_object_name"],
  tools: ["tool_name"],
  trigger_events: ["event_name"],
  capabilities: ["capability_name"],
};

async function semantius(tool: string, body: unknown): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`semantius ${tool} failed: ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const get = (path: string): Promise<Row[]> => semantius("postgrestRequest", { method: "GET", path });
const patch = (path: string, body: Row): Promise<Row[]> => semantius("postgrestRequest", { method: "PATCH", path, body });

const group = <T,>(rows: T[], key: (r: T) => string) => {
  const out = new Map<string, T[]>();
  for (const r of rows) (out.get(key(r)) ?? out.set(key(r), []).get(key(r))!).push(r);
  return out;
};
const show = (s: string) => s.replaceAll(EM_DASH, "--").replace(/\s*\n\s*/g, " / ");

// Reads the given columns for every target row, table by table, in chunks of ids.
async function readRows(targets: { table: string; id: number; column: string }[]): Promise<Map<string, Row>> {
  const rows = new Map<string, Row>();
  for (const [table, list] of group(targets, (t) => t.table)) {
    const ids = [...new Set(list.map((t) => t.id))];
    const cols = [...new Set(list.map((t) => t.column))];
    for (let i = 0; i < ids.length; i += 100) {
      const got = await get(`/${table}?id=in.(${ids.slice(i, i + 100).join(",")})&select=id,${cols.join(",")}`);
      for (const r of got) rows.set(`${table}|${r.id}`, r);
    }
  }
  return rows;
}

// The part of the text that changes, with a little context, for reading.
function fragment(from: string, to: string): string {
  let a = 0;
  while (a < from.length && a < to.length && from[a] === to[a]) a++;
  let b = 0;
  while (b < from.length - a && b < to.length - a && from[from.length - 1 - b] === to[to.length - 1 - b]) b++;
  const start = Math.max(0, a - 30);
  const trim = (s: string, end: number) => (start > 0 ? "..." : "") + s.slice(start, end + 25) + (end + 25 < s.length ? "..." : "");
  return `${show(trim(from, from.length - b))}\n    -> ${show(trim(to, to.length - b))}`;
}

const data: Data = JSON.parse(readFileSync(DATA, "utf8"));
const { cells, labels } = data;

// The word map, applied whole-word with letters as the boundary, so `retail_labour_schedules` matches and
// `labourer` would not. `fulfil_order` is its own entry: the bare word `fulfil` is a brand in this catalog.
const words = Object.keys(data.word_map).sort((a, b) => b.length - a.length);
const WORD_RE = new RegExp(`(?<!\\p{L})(${words.join("|")})(?!\\p{L})`, "giu");
const applyCase = (m: string, to: string) => (m === m.toUpperCase() ? to.toUpperCase() : m[0] === m[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to);
const spellOnly = (s: string) => s.replace(WORD_RE, (m) => applyCase(m, data.word_map[m.toLowerCase()]));

// ---------- checks, before any write ----------
const problems: string[] = [];
const count = (s: string, c: string) => s.split(c).length - 1;
for (const c of cells) {
  const key = `${c.table} ${c.id} ${c.column}`;
  if (c.column === "record_status") problems.push(`${key}: record_status is never written`);
  if (c.new === c.old) problems.push(`${key}: the new text is the same as the old`);
  if (spellOnly(c.old) !== c.new) problems.push(`${key}: the new text is more than the old text with the word map applied`);
  if (count(c.new, EM_DASH) !== count(c.old, EM_DASH)) problems.push(`${key}: the em-dash count changed`);
  if (!WRITE_ORDER.includes(c.table)) problems.push(`${key}: table is not in WRITE_ORDER`);
}
for (const l of labels) {
  if (!REFRESH_COLUMN[l.table]) problems.push(`${l.table} ${l.id}: no refresh column for this table`);
  if (spellOnly(l.from) !== l.to) problems.push(`${l.table} ${l.id} ${l.column}: the new label is more than the old one with the word map applied`);
}

const current = await readRows(cells);
const pending: Cell[] = [];
let alreadyDone = 0;
for (const c of cells) {
  const row = current.get(`${c.table}|${c.id}`);
  if (!row) {
    problems.push(`${c.table} ${c.id}: row not found`);
    continue;
  }
  const value = String(row[c.column] ?? "");
  if (value === c.old) pending.push(c);
  else if (RESUME && value === c.new) alreadyDone++;
  else problems.push(`${c.table} ${c.id} ${c.column}: current value is not the expected text\n    now:      ${show(value)}\n    expected: ${show(c.old)}`);
}

const labelRows = await readRows(labels);
for (const l of labels) {
  const value = String(labelRows.get(`${l.table}|${l.id}`)?.[l.column] ?? "");
  if (value !== l.from && !(RESUME && value === l.to)) problems.push(`${l.table} ${l.id} ${l.column}: label is not the expected text\n    now:      ${show(value)}\n    expected: ${show(l.from)}`);
}

for (const c of pending) {
  if (!UNIQUE[c.table]?.includes(c.column)) continue;
  const taken = await get(`/${c.table}?${c.column}=eq.${encodeURIComponent(c.new)}&select=id`);
  if (taken.some((r) => r.id !== c.id)) problems.push(`${c.table}.${c.column}: "${c.new}" is already taken by id ${taken.map((r) => r.id).join(", ")}`);
}
// A state name must stay unique within its data object, and a verb within its pair of data objects.
for (const c of pending.filter((c) => c.table === "data_object_lifecycle_states" && c.column === "state_name")) {
  const [me] = await get(`/data_object_lifecycle_states?id=eq.${c.id}&select=data_object_id`);
  const taken = await get(`/data_object_lifecycle_states?data_object_id=eq.${me.data_object_id}&state_name=eq.${encodeURIComponent(c.new)}&select=id`);
  if (taken.some((r) => r.id !== c.id)) problems.push(`data_object_lifecycle_states ${c.id}: state "${c.new}" already exists on data object ${me.data_object_id}`);
}
for (const c of pending.filter((c) => c.table === "data_object_relationships" && c.column === "relationship_verb")) {
  const [me] = await get(`/data_object_relationships?id=eq.${c.id}&select=data_object_id,related_data_object_id`);
  const taken = await get(`/data_object_relationships?data_object_id=eq.${me.data_object_id}&related_data_object_id=eq.${me.related_data_object_id}&relationship_verb=eq.${encodeURIComponent(c.new)}&select=id`);
  if (taken.some((r) => r.id !== c.id)) problems.push(`data_object_relationships ${c.id}: verb "${c.new}" already exists on this pair`);
}

// record_status for every row this run writes, to compare afterward.
const statusTargets = [...cells, ...labels].filter((t) => data.status_tables.includes(t.table)).map((t) => ({ table: t.table, id: t.id, column: "record_status" }));
const statusBefore = await readRows(statusTargets);

// ---------- plan ----------
if (FULL) for (const c of pending) console.log(`\n${c.table} ${c.id} ${c.column}\n  old: ${show(c.old)}\n  new: ${show(c.new)}`);
else for (const c of pending) console.log(`\n${c.table} ${c.id} ${c.column}\n    ${fragment(c.old, c.new)}`);

const perTable = (list: Cell[]) => [...group(list, (c) => c.table)].map(([t, l]) => `${t}: ${l.length} cells on ${new Set(l.map((c) => c.id)).size} rows`).join("\n  ");
const wordCounts = new Map<string, number>();
for (const c of pending) for (const w of c.words) wordCounts.set(w, (wordCounts.get(w) ?? 0) + 1);
console.log(`\nPer table:\n  ${perTable(pending)}`);
console.log(`\nPer group:\n  ${[...group(pending, (c) => c.group)].map(([g, l]) => `${g}: ${l.length}`).join("\n  ")}`);
console.log(`\nPer word:\n  ${[...wordCounts].sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w}: ${n}`).join("\n  ")}`);
console.log(`\n${pending.length} cells to write${RESUME ? `, ${alreadyDone} already at the new text` : ""}.`);
console.log(`${labels.length} computed labels to refresh and verify.`);
console.log(`${data.left_unchanged.length} hits left unchanged on purpose: ${[...group(data.left_unchanged, (x) => x.reason)].map(([r, l]) => `${r} ${l.length}`).join(", ")}.`);
console.log(`${cells.filter((c) => c.old.includes(EM_DASH)).length} target cells hold an em-dash, left as it is.`);

if (problems.length) {
  console.error(`\nSTOPPED before any write. ${problems.length} problems:\n${problems.join("\n")}`);
  process.exit(1);
}
if (!APPLY) {
  console.log("\nAll checks passed. No writes (dry-run).");
  process.exit(0);
}

// ---------- backup ----------
const escapeEmDash = (s: string) => s.replaceAll(EM_DASH, "\\u2014");
if (RESUME) {
  if (!existsSync(BACKUP)) throw new Error(`--resume needs the existing ${BACKUP}, and it is not there`);
} else {
  if (existsSync(BACKUP)) throw new Error(`${BACKUP} already exists; refusing to overwrite`);
  writeFileSync(
    BACKUP,
    escapeEmDash(
      JSON.stringify(
        {
          taken_at: new Date().toISOString(),
          cells: cells.map((c) => ({ table: c.table, id: c.id, column: c.column, old: c.old, new: c.new })),
          labels: labels.map((l) => ({ table: l.table, id: l.id, column: l.column, old: l.from, new: l.to })),
        },
        null,
        1,
      ),
    ) + "\n",
  );
}

// ---------- writes ----------
const byRow = group(pending, (c) => `${c.table}|${c.id}`);
const ordered = [...byRow.values()].sort((a, b) => WRITE_ORDER.indexOf(a[0].table) - WRITE_ORDER.indexOf(b[0].table) || a[0].id - b[0].id);
let written = 0;
for (const rowCells of ordered) {
  const { table, id } = rowCells[0];
  const body = Object.fromEntries(rowCells.map((c) => [c.column, c.new]));
  try {
    const result = await patch(`/${table}?id=eq.${id}`, body);
    if (result.length !== 1) throw new Error(`expected 1 row back, got ${result.length}`);
  } catch (e) {
    console.error(`\nSTOPPED at ${table} ${id} after writing ${written} of ${ordered.length} rows: ${(e as Error).message}\nOld values are in ${BACKUP}. Fix the cause, then rerun with --apply --resume.`);
    process.exit(1);
  }
  written++;
  if (written % 50 === 0) console.log(`  wrote ${written} of ${ordered.length} rows`);
}
console.log(`wrote ${written} rows; old values are in ${BACKUP}`);

// Labels that read a changed source in another row recompute only when their own row is written.
const labelsNow = await readRows(labels);
const stale = labels.filter((l) => String(labelsNow.get(`${l.table}|${l.id}`)?.[l.column] ?? "") !== l.to);
for (const l of stale) {
  const column = REFRESH_COLUMN[l.table];
  try {
    const [row] = await get(`/${l.table}?id=eq.${l.id}&select=id,${column}`);
    await patch(`/${l.table}?id=eq.${l.id}`, { [column]: row[column] });
  } catch (e) {
    console.error(`\nSTOPPED refreshing the label on ${l.table} ${l.id}: ${(e as Error).message}\nThe cell writes are done. Fix the cause, then rerun with --apply --resume.`);
    process.exit(1);
  }
}
console.log(`refreshed ${stale.length} computed labels with a same-value write`);

// ---------- verify ----------
const after = await readRows(cells);
const afterLabels = await readRows(labels);
const statusAfter = await readRows(statusTargets);
const wrong: string[] = [];
for (const c of cells) {
  const value = String(after.get(`${c.table}|${c.id}`)?.[c.column] ?? "");
  if (value !== c.new) wrong.push(`${c.table} ${c.id} ${c.column}: ${show(value)}`);
}
for (const l of labels) {
  const value = String(afterLabels.get(`${l.table}|${l.id}`)?.[l.column] ?? "");
  if (value !== l.to) wrong.push(`${l.table} ${l.id} ${l.column}: ${show(value)} (expected ${show(l.to)})`);
}
for (const [key, row] of statusBefore) {
  const now = statusAfter.get(key)?.record_status;
  if (now !== row.record_status) wrong.push(`${key}: record_status moved from ${row.record_status} to ${now}`);
}
console.log(`\nVerified per table:\n  ${perTable(cells)}\n  computed labels: ${labels.length}\n  record_status unchanged on ${statusBefore.size} rows`);
if (wrong.length) {
  console.error(`\n${wrong.length} values do not match:\n${wrong.join("\n")}`);
  process.exit(1);
}
console.log("\nverified: every cell and computed label matches");
