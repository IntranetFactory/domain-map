/**
 * Add `processes.process_key` — an authored, stable, unique, snake_case slug derived
 * from `process_name`, and backfill all rows.
 *
 * WHY: `process_name` is a human label and is NOT unique (3 APQC PCF activity names
 * are legitimately reused across categories, e.g. "Process customer request" at both
 * 4.4.5.1.1 and 6.3.4.1.1). The numeric `id` and the APQC `external_id` / `process_code`
 * are unique keys, but `external_id` / `process_code` are blank for custom processes.
 * `process_key` gives every process a readable, durable, unique key that does not depend
 * on the APQC framework, suitable for cross-referencing in blueprints and code.
 *
 * STABILITY: the backfill derives the key from the current `process_name` once. The
 * column is a plain stored value with no recompute trigger, so it does NOT change if
 * `process_name` is later edited. Going forward it is authored (manual) per row.
 *
 * UNIQUENESS: base slug = snake_case(process_name). On a base-slug collision the row's
 * `external_id` (or `p<id>` for custom rows without one) is appended; a final `_<id>`
 * tiebreak guarantees global uniqueness deterministically. After the backfill the
 * field's `unique_value` flag is flipped on so the platform enforces uniqueness.
 *
 * SEQUENCING (text/string fields are NOT NULL — plan-3 gotcha): create the field
 * non-unique with default "" (existing rows initialize to ""), backfill real values,
 * THEN set unique_value=true (a unique flag set while rows are "" would be rejected).
 *
 * Idempotent. DRY-RUN by default: computes + prints everything and writes NOTHING.
 * Pass --apply to perform the schema change + backfill + unique flip.
 *
 * Run from project root:
 *   bun run scripts/loaders/add_processes_process_key_2026_06_03.ts            # dry run
 *   bun run scripts/loaders/add_processes_process_key_2026_06_03.ts --apply    # execute
 */

const APPLY = process.argv.includes("--apply");
const FIELD_ORDER = 1000030;
const SNAPSHOT = "c:/dev/domain-map/.tmp_deploy/processes_prekey_snapshot_2026-06-03.json";
const POOL = 6;

type CmdResult = { ok: boolean; data: any; stderr: string; code: number };
type Proc = { id: number; process_name: string; process_code: string; external_id: string; process_key?: string };

async function call(server: string, tool: string, payload: any): Promise<CmdResult> {
  // timeout guards against an occasional hung `semantius` spawn stalling the whole pool.
  const proc = Bun.spawn(["semantius", "call", server, tool], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    timeout: 45000,
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) return { ok: false, data: null, stderr: err.trim() || out.trim(), code };
  return { ok: true, data: out.trim() ? JSON.parse(out.trim()) : null, stderr: "", code };
}
async function get(path: string): Promise<any> {
  const r = await call("crud", "postgrestRequest", { method: "GET", path });
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.stderr}`);
  return r.data;
}

// Short, readable snake_case key. Strip stop words and greedily keep whole words up to
// BASE_MAX chars, so keys stay in the ~15-40 readable range instead of slugging a whole
// long PCF name verbatim. Collisions are disambiguated later with the stable external_id.
const BASE_MAX = 32;
const STOP = new Set(
  "a an and or the of for to in on at by with from into as is are be your their its this that these those per via using based".split(" "),
);
function words(name: string): string[] {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}
function baseKey(name: string): string {
  const all = words(name);
  const sig = all.filter((w) => !STOP.has(w));
  const use = sig.length ? sig : all; // never drop every word (e.g. "Of the")
  const parts: string[] = [];
  let len = 0;
  for (const w of use) {
    const add = (parts.length ? 1 : 0) + w.length;
    if (parts.length > 0 && len + add > BASE_MAX) break; // always keep >=1 word
    parts.push(w);
    len += add;
  }
  return parts.join("_") || "process";
}

// Deterministic unique key assignment. Sorted by id for stable output.
function assignKeys(rows: Proc[]): { keys: Map<number, string>; collisions: { base: string; ids: number[] }[] } {
  const sorted = [...rows].sort((a, b) => a.id - b.id);
  const byBase = new Map<string, Proc[]>();
  for (const r of sorted) {
    const base = baseKey(r.process_name);
    (byBase.get(base) ?? byBase.set(base, []).get(base)!).push(r);
  }
  const keys = new Map<number, string>();
  const used = new Set<string>();
  const collisions: { base: string; ids: number[] }[] = [];
  const place = (r: Proc, desired: string) => {
    let k = desired;
    while (used.has(k)) k = `${desired}_${r.id}`;
    used.add(k);
    keys.set(r.id, k);
  };
  for (const [base, group] of byBase) {
    if (group.length === 1) {
      place(group[0], base);
    } else {
      collisions.push({ base, ids: group.map((g) => g.id) });
      for (const r of group) place(r, `${base}_${r.external_id || "p" + r.id}`);
    }
  }
  return { keys, collisions };
}

async function runPool<T>(items: T[], worker: (item: T, i: number) => Promise<void>, concurrency = POOL): Promise<void> {
  let i = 0;
  async function next(): Promise<void> {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => next()));
}

async function main() {
  console.log(`Add processes.process_key — 2026-06-03  [${APPLY ? "APPLY" : "DRY RUN"}]`);
  console.log("=".repeat(60) + "\n");

  // ----- Load + snapshot -----
  const rows: Proc[] = await get(
    "/processes?select=id,process_name,process_code,external_id,process_key&order=id&limit=20000",
  ).catch(async () => {
    // process_key column may not exist yet -> retry without it.
    return get("/processes?select=id,process_name,process_code,external_id&order=id&limit=20000");
  });
  console.log(`Loaded ${rows.length} processes.`);

  const { mkdirSync, writeFileSync } = require("node:fs") as typeof import("node:fs");
  const { dirname } = require("node:path") as typeof import("node:path");
  if (APPLY) {
    mkdirSync(dirname(SNAPSHOT), { recursive: true });
    writeFileSync(SNAPSHOT, JSON.stringify(rows, null, 2), "utf8");
    console.log(`Snapshot written: ${SNAPSHOT}`);
  } else {
    console.log(`Snapshot (dry run, not written): ${SNAPSHOT}`);
  }

  // ----- Compute keys -----
  const { keys, collisions } = assignKeys(rows);
  const distinct = new Set(keys.values());
  console.log(`\nComputed ${keys.size} keys, ${distinct.size} distinct (must match).`);
  if (distinct.size !== keys.size) throw new Error("INTERNAL: key collision survived assignment");

  const suffixed = collisions.reduce((n, c) => n + c.ids.length, 0);
  console.log(`\nBase-slug collisions: ${collisions.length} groups, ${suffixed} rows get an external_id suffix.`);
  for (const c of collisions.slice(0, 10)) {
    console.log(`  "${c.base}" x${c.ids.length}: ${c.ids.map((id) => keys.get(id)).join(", ")}`);
  }
  if (collisions.length > 10) console.log(`  ... and ${collisions.length - 10} more groups`);

  // length histogram
  const buckets = [
    [0, 15],
    [16, 20],
    [21, 25],
    [26, 30],
    [31, 35],
    [36, 40],
    [41, 999],
  ] as const;
  const lens = [...keys.values()].map((k) => k.length);
  console.log(`\nKey length distribution:`);
  for (const [lo, hi] of buckets) {
    const n = lens.filter((l) => l >= lo && l <= hi).length;
    if (n > 0) console.log(`  ${String(lo).padStart(2)}-${hi === 999 ? "+" : String(hi).padStart(2)}: ${n}`);
  }
  const over = lens.filter((l) => l > 40).length;
  const longest = Math.max(...lens);
  console.log(`  longest=${longest}  over-40=${over}`);

  const byLen = [...keys.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 6);
  console.log(`\nLongest 6 keys:`);
  for (const [id, k] of byLen) {
    const nm = rows.find((r) => r.id === id)?.process_name ?? "";
    console.log(`  ${k.length}  ${k}   <- "${nm}"`);
  }

  console.log(`\nSample (first 8):`);
  for (const r of rows.slice(0, 8)) console.log(`  ${keys.get(r.id)}   <- "${r.process_name}"`);

  if (!APPLY) {
    console.log(`\nDRY RUN complete. Re-run with --apply to create the field + backfill ${rows.length} rows + set unique.`);
    return;
  }

  // ----- Step 1: ensure field (non-unique, default "") -----
  console.log(`\nStep 1: ensure processes.process_key field`);
  const existing = await get("/fields?table_name=eq.processes&field_name=eq.process_key&select=field_name,unique_value");
  if (existing.length === 0) {
    const res = await call("crud", "create_field", {
      data: {
        table_name: "processes",
        field_name: "process_key",
        title: "Process Key",
        description:
          "Authored, stable, unique snake_case key derived from process_name. Durable human-readable identifier for cross-referencing a process; complements the numeric id and the APQC external_id / process_code (which are blank for custom processes). Stable: a snapshot of process_name at authoring time, not recomputed when the name changes.",
        format: "string",
        default_value: "",
        unique_value: false,
        field_order: FIELD_ORDER,
      },
    });
    if (!res.ok) throw new Error(`create_field processes.process_key failed: ${res.stderr}`);
    console.log("  + processes.process_key created (non-unique)");
    const rc = await call("crud", "refresh_schema_cache", {});
    console.log(rc.ok ? "  + schema cache refreshed" : `  ! refresh_schema_cache: ${rc.stderr}`);
  } else {
    console.log(`  = processes.process_key already exists (unique_value=${existing[0].unique_value})`);
  }

  // ----- Step 2: backfill rows whose value differs -----
  console.log(`\nStep 2: backfill process_key`);
  const current = await get("/processes?select=id,process_key&limit=20000");
  const curMap = new Map<number, string>(current.map((r: any) => [Number(r.id), String(r.process_key ?? "")]));
  const todo = rows.filter((r) => curMap.get(r.id) !== keys.get(r.id));
  console.log(`  ${todo.length} of ${rows.length} rows need a write (${rows.length - todo.length} already correct).`);

  let done = 0;
  let failed = 0;
  await runPool(todo, async (r) => {
    const res = await call("crud", "postgrestRequest", {
      method: "PATCH",
      path: `/processes?id=eq.${r.id}`,
      body: { process_key: keys.get(r.id) },
    });
    if (!res.ok) {
      failed++;
      console.error(`  ! id ${r.id} PATCH failed: ${res.stderr}`);
    }
    if (++done % 200 === 0) console.log(`    ...${done}/${todo.length}`);
  });
  console.log(`  backfill complete: ${done - failed} ok, ${failed} failed.`);
  if (failed > 0) throw new Error(`${failed} backfill writes failed; NOT setting unique. Re-run to retry.`);

  // ----- Step 3: verify data is unique + complete, then flip unique_value -----
  console.log(`\nStep 3: verify + set unique`);
  const after = await get("/processes?select=process_key&limit=20000");
  const vals = after.map((r: any) => String(r.process_key ?? ""));
  const empty = vals.filter((v: string) => v === "").length;
  const dups = vals.length - new Set(vals).size;
  console.log(`  rows=${vals.length} empty=${empty} duplicates=${dups}`);
  if (empty > 0 || dups > 0) throw new Error(`data not clean (empty=${empty}, dups=${dups}); NOT setting unique.`);

  const fld = await get("/fields?table_name=eq.processes&field_name=eq.process_key&select=unique_value");
  if (fld[0]?.unique_value === true) {
    console.log("  = unique_value already true");
  } else {
    const res = await call("crud", "update_field", { id: "processes.process_key", data: { unique_value: true } });
    if (!res.ok) throw new Error(`update_field unique_value failed: ${res.stderr}`);
    const rc = await call("crud", "refresh_schema_cache", {});
    console.log(rc.ok ? "  + unique_value=true set + schema refreshed" : `  + unique_value set; refresh: ${rc.stderr}`);
  }

  console.log(`\nDone. processes.process_key authored + unique on ${vals.length} rows.`);
}

main().catch((err) => {
  console.error("\nFAILED:", err.message ?? err);
  process.exit(1);
});
