#!/usr/bin/env bun
// Rewrites live catalog rows so a relationship is always called a relationship (CLAUDE.md), and renames the
// identifiers that said "link", "edge" or "connect". The new text is hand-written, one cell at a time, in
// .tmp_deploy/2026-11-03_relationship_wording_catalog.json. audits/_relationship-wording-inventory.md lists every
// cell and every cell left unchanged, with the reason.
//
// These writes overwrite non-empty values, so they need the owner's approval (SKILL.md Rule #21).
//
// Dry-run by default.
//   --apply                         write, after every check below has passed
//   --include-domain-data-objects   also write the 12 domain_data_objects.notes cells, held back by default
//                                   because that table's future is undecided
//   --resume                        continue a run that stopped partway: a cell already at its new text is
//                                   skipped, and the existing backup is kept
//
// Before any write it reads every target row and stops, reporting all differences at once, if a current value is
// not the expected old text or a new identifier is already taken. The old values go to backups/ first. Computed
// `*_label` columns recompute only when their own row is written, so sources are written first, and a label still
// out of date afterward gets a same-value PATCH. record_status is never sent.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

type Row = Record<string, any>;
type Cell = { table: string; id: number; column: string; group: string; old: string; new: string };
type Label = { table: string; id: number; column: string; from: string; to: string };

const APPLY = process.argv.includes("--apply");
const RESUME = process.argv.includes("--resume");
const INCLUDE_DDO = process.argv.includes("--include-domain-data-objects");
const FULL = process.argv.includes("--full");
const DATA = ".tmp_deploy/2026-11-03_relationship_wording_catalog.json";
const BACKUP = "backups/relationship-wording-2026-11-03.json";
const EM_DASH = String.fromCharCode(0x2014);

// Sources first, so a label that reads another row sees the new value when its own row is written.
const WRITE_ORDER = [
  "data_objects", "capabilities", "trigger_events", "business_processes", "domain_modules", "domains", "tools", "solutions", "skills", "personas",
  "data_object_aliases", "domain_module_tools", "capability_domains", "domain_data_objects", "data_object_lifecycle_states", "data_object_relationships", "handoffs",
];
// Identifiers that must not already exist on another row.
const UNIQUE: Record<string, string[]> = {
  data_objects: ["data_object_name"],
  capabilities: ["capability_code"],
  trigger_events: ["event_name"],
  business_processes: ["process_key"],
  data_object_aliases: ["alias_name"],
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

const data: { cells: Cell[]; labels: Label[]; left_unchanged: Row[] } = JSON.parse(readFileSync(DATA, "utf8"));
const heldBack = INCLUDE_DDO ? [] : data.cells.filter((c) => c.table === "domain_data_objects");
const cells = data.cells.filter((c) => INCLUDE_DDO || c.table !== "domain_data_objects");

// ---------- checks, before any write ----------
const problems: string[] = [];
for (const c of data.cells) {
  const key = `${c.table} ${c.id} ${c.column}`;
  if (c.new.includes(EM_DASH)) problems.push(`${key}: the new text has an em-dash`);
  if (c.new === c.old) problems.push(`${key}: the new text is the same as the old`);
  if (!WRITE_ORDER.includes(c.table)) problems.push(`${key}: table is not in WRITE_ORDER`);
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

const labelRows = await readRows(data.labels);
for (const l of data.labels) {
  const value = String(labelRows.get(`${l.table}|${l.id}`)?.[l.column] ?? "");
  if (value !== l.from && !(RESUME && value === l.to)) problems.push(`${l.table} ${l.id} ${l.column}: label is not the expected text\n    now:      ${show(value)}\n    expected: ${show(l.from)}`);
}

for (const c of pending) {
  if (!UNIQUE[c.table]?.includes(c.column)) continue;
  const taken = await get(`/${c.table}?${c.column}=eq.${encodeURIComponent(c.new)}&select=id`);
  if (taken.some((r) => r.id !== c.id)) problems.push(`${c.table}.${c.column}: "${c.new}" is already taken by id ${taken.map((r) => r.id).join(", ")}`);
}

// ---------- plan ----------
if (FULL) for (const c of pending) console.log(`\n${c.table} ${c.id} ${c.column}\n  old: ${show(c.old)}\n  new: ${show(c.new)}`);
else for (const c of pending) console.log(`\n${c.table} ${c.id} ${c.column}\n    ${fragment(c.old, c.new)}`);

const perTable = (list: Cell[]) => [...group(list, (c) => c.table)].map(([t, l]) => `${t}: ${l.length} cells on ${new Set(l.map((c) => c.id)).size} rows`).join("\n  ");
console.log(`\nPer table:\n  ${perTable(pending)}`);
console.log(`\nPer group:\n  ${[...group(pending, (c) => c.group)].map(([g, l]) => `${g}: ${l.length}`).join("\n  ")}`);
console.log(`\n${pending.length} cells to write${RESUME ? `, ${alreadyDone} already at the new text` : ""}.`);
if (heldBack.length) console.log(`${heldBack.length} domain_data_objects cells held back. Pass --include-domain-data-objects to write them.`);
console.log(`${data.labels.length} computed labels to refresh and verify. ${data.left_unchanged.length} inventory cells left unchanged on purpose.`);

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
          // Every cell, held-back ones included, so a later --resume --include-domain-data-objects run is covered.
          cells: data.cells.map((c) => ({ table: c.table, id: c.id, column: c.column, old: c.old, new: c.new })),
          labels: data.labels.map((l) => ({ table: l.table, id: l.id, column: l.column, old: l.from, new: l.to })),
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
const labelsNow = await readRows(data.labels);
const stale = data.labels.filter((l) => String(labelsNow.get(`${l.table}|${l.id}`)?.[l.column] ?? "") !== l.to);
for (const l of stale) {
  const [row] = await get(`/${l.table}?id=eq.${l.id}&select=id,notes`);
  await patch(`/${l.table}?id=eq.${l.id}`, { notes: row.notes });
}
console.log(`refreshed ${stale.length} computed labels with a same-value write`);

// ---------- verify ----------
const after = await readRows(cells);
const afterLabels = await readRows(data.labels);
const wrong: string[] = [];
for (const c of cells) {
  const value = String(after.get(`${c.table}|${c.id}`)?.[c.column] ?? "");
  if (value !== c.new) wrong.push(`${c.table} ${c.id} ${c.column}: ${show(value)}`);
}
for (const l of data.labels) {
  const value = String(afterLabels.get(`${l.table}|${l.id}`)?.[l.column] ?? "");
  if (value !== l.to) wrong.push(`${l.table} ${l.id} ${l.column}: ${show(value)} (expected ${show(l.to)})`);
}
console.log(`\nVerified per table:\n  ${perTable(cells)}\n  computed labels: ${data.labels.length}`);
if (wrong.length) {
  console.error(`\n${wrong.length} values do not match:\n${wrong.join("\n")}`);
  process.exit(1);
}
console.log("\nverified: every cell and computed label matches");
