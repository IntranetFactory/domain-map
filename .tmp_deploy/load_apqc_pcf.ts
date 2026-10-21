// P1.2 — Load APQC PCF Cross-Industry v8.0 into domain_map.processes.
// Run from project root:
//   bun run c:/dev/domain-map/.tmp_deploy/load_apqc_pcf.ts --dry-run     (print parsed sample)
//   bun run c:/dev/domain-map/.tmp_deploy/load_apqc_pcf.ts                (insert)
// Idempotent: existing rows (by process_code) are skipped.
import * as XLSX from "xlsx";

const PATH = "c:/dev/domain-map/K016808_APQC Process Classification Framework (PCF) - Cross-Industry - Excel Version 8.0.xlsx";
const DRY = process.argv.includes("--dry-run");

// ---- semantius helpers ----

async function call(tool: string, payload: unknown, opts: { single?: boolean; tolerateTimeout?: boolean } = {}): Promise<any> {
  const args = ["semantius"];
  if (opts.single) args.push("--single");
  args.push("call", "crud", tool);
  const proc = Bun.spawn(args, {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    const combined = stderr || stdout || "";
    if (opts.tolerateTimeout && combined.includes("Request timed out")) return { __timedOut: true };
    throw new Error(`${tool} (exit ${code}): ${combined.slice(0, 500)}`);
  }
  return stdout.trim() ? JSON.parse(stdout) : null;
}

// ---- parse Excel ----

const wb = XLSX.readFile(PATH);
const combined = XLSX.utils.sheet_to_json(wb.Sheets["Combined"]!, { header: 1, defval: "", raw: true }) as any[][];
const header = combined[0];
const COL = {
  pcf_id: header.indexOf("PCF ID"),
  hier_id: header.indexOf("Hierarchy ID"),
  name: header.indexOf("Name"),
  desc: header.indexOf("Element Description"),
};
if (Object.values(COL).some(i => i < 0)) throw new Error(`unexpected header layout: ${JSON.stringify(header)}`);

type ParsedRow = {
  process_code: string;        // Hierarchy ID
  process_name: string;        // Name
  description: string;         // Element Description
  external_id: string;         // PCF ID (string form)
  hierarchy_level: number;     // 1..5
  parent_code: string | null;  // Hierarchy ID of parent, null for level-1
};

function deriveLevel(hierId: string): number {
  if (/^\d+\.0$/.test(hierId)) return 1;
  return hierId.split(".").length;
}

function deriveParent(hierId: string): string | null {
  if (/^\d+\.0$/.test(hierId)) return null;
  const parts = hierId.split(".");
  if (parts.length === 2) return `${parts[0]}.0`;
  return parts.slice(0, -1).join(".");
}

const rows: ParsedRow[] = [];
for (let i = 1; i < combined.length; i++) {
  const r = combined[i];
  const hierId = String(r[COL.hier_id] ?? "").trim();
  if (!hierId) continue;
  const pcfId = String(r[COL.pcf_id] ?? "").trim();
  const name = String(r[COL.name] ?? "").trim();
  const desc = String(r[COL.desc] ?? "").trim();
  if (!name) { console.warn(`row ${i}: empty Name for ${hierId} — skipping`); continue; }
  rows.push({
    process_code: hierId,
    process_name: name,
    description: desc,
    external_id: pcfId,
    hierarchy_level: deriveLevel(hierId),
    parent_code: deriveParent(hierId),
  });
}

// ---- stats ----

const byLevel = new Map<number, ParsedRow[]>();
for (const r of rows) {
  if (!byLevel.has(r.hierarchy_level)) byLevel.set(r.hierarchy_level, []);
  byLevel.get(r.hierarchy_level)!.push(r);
}

console.log(`\nParsed ${rows.length} rows from "Combined" sheet`);
console.log(`Hierarchy-level distribution:`);
for (const lvl of [...byLevel.keys()].sort((a, b) => a - b)) {
  console.log(`  level ${lvl}: ${byLevel.get(lvl)!.length} rows`);
}

// Sanity: every non-top-level row's parent_code must also be in the rows
const codeSet = new Set(rows.map(r => r.process_code));
const orphans = rows.filter(r => r.parent_code !== null && !codeSet.has(r.parent_code));
if (orphans.length > 0) {
  console.log(`\n⚠ ${orphans.length} rows have parent_code that is not in the parsed set:`);
  for (const o of orphans.slice(0, 10)) console.log(`    ${o.process_code} → parent ${o.parent_code}`);
  if (orphans.length > 10) console.log(`    …`);
}

// Sanity: duplicate process_code?
const codeCounts = new Map<string, number>();
for (const r of rows) codeCounts.set(r.process_code, (codeCounts.get(r.process_code) ?? 0) + 1);
const dups = [...codeCounts.entries()].filter(([, n]) => n > 1);
if (dups.length > 0) {
  console.log(`\n⚠ duplicate process_code values: ${dups.slice(0, 5).map(([k, n]) => `${k}×${n}`).join(", ")}`);
}

// Preview first row per level
console.log(`\nSample (first row at each level):`);
for (const lvl of [...byLevel.keys()].sort((a, b) => a - b)) {
  const r = byLevel.get(lvl)![0];
  console.log(`  L${lvl} ${r.process_code} [PCF ${r.external_id}] "${r.process_name}" parent=${r.parent_code ?? "(none)"}`);
}

if (DRY) {
  console.log(`\n--dry-run: not inserting. Re-run without --dry-run to load.`);
  process.exit(0);
}

// ---- read existing processes ----

console.log(`\n=== loading into domain_map.processes ===`);

async function readAllProcesses(): Promise<Map<string, number>> {
  // returns process_code → id for source_framework='apqc_pcf_cross_industry'
  const existing = await call("postgrestRequest", {
    method: "GET",
    path: "/processes?source_framework=eq.apqc_pcf_cross_industry&select=id,process_code&limit=10000",
  });
  const map = new Map<string, number>();
  for (const r of existing ?? []) map.set(r.process_code, r.id);
  return map;
}

let codeToId = await readAllProcesses();
console.log(`  existing PCF rows: ${codeToId.size}`);

// ---- insert level by level ----

const CHUNK = 100;

async function insertChunked(level: number, toInsert: ParsedRow[]): Promise<void> {
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const slice = toInsert.slice(i, i + CHUNK);
    const body = slice.map(r => {
      const payload: any = {
        process_code: r.process_code,
        process_name: r.process_name,
        description: r.description,
        source_framework: "apqc_pcf_cross_industry",
        external_id: r.external_id,
        external_url: "",
        hierarchy_level: r.hierarchy_level,
      };
      if (r.parent_code !== null) {
        const pid = codeToId.get(r.parent_code);
        if (pid === undefined) throw new Error(`level ${level} row ${r.process_code}: parent ${r.parent_code} not yet inserted`);
        payload.parent_process_id = pid;
      }
      return payload;
    });
    const res = await call("postgrestRequest", { method: "POST", path: "/processes", body }, { tolerateTimeout: true });
    process.stdout.write(`    L${level}: ${i + slice.length}/${toInsert.length}${res?.__timedOut ? " [timeout, assume ok]" : ""}\r`);
  }
  console.log();
}

for (const lvl of [...byLevel.keys()].sort((a, b) => a - b)) {
  const all = byLevel.get(lvl)!;
  const toInsert = all.filter(r => !codeToId.has(r.process_code));
  console.log(`  L${lvl}: ${all.length} total, ${toInsert.length} new, ${all.length - toInsert.length} ♻ skipped`);
  if (toInsert.length === 0) continue;
  await insertChunked(lvl, toInsert);
  // refresh map (extends with newly-inserted ids needed for next level's parent resolution)
  codeToId = await readAllProcesses();
}

// ---- final audit ----

console.log(`\n=== audit ===`);
const finalLevels = await call("postgrestRequest", {
  method: "GET",
  path: "/processes?source_framework=eq.apqc_pcf_cross_industry&select=hierarchy_level",
});
const finalCounts = new Map<number, number>();
for (const r of finalLevels ?? []) finalCounts.set(r.hierarchy_level, (finalCounts.get(r.hierarchy_level) ?? 0) + 1);
for (const lvl of [...finalCounts.keys()].sort((a, b) => a - b)) {
  console.log(`  level ${lvl}: ${finalCounts.get(lvl)} in DB (parsed expected ${byLevel.get(lvl)?.length})`);
}
const total = [...finalCounts.values()].reduce((a, b) => a + b, 0);
console.log(`  total: ${total} (parsed expected ${rows.length})`);

const orphansInDb = await call("postgrestRequest", {
  method: "GET",
  path: "/processes?source_framework=eq.apqc_pcf_cross_industry&hierarchy_level=gt.1&parent_process_id=is.null&select=id,process_code&limit=50",
});
if ((orphansInDb ?? []).length > 0) {
  console.log(`  ⚠ ${orphansInDb.length} non-top-level rows missing parent_process_id:`);
  for (const o of orphansInDb.slice(0, 10)) console.log(`     ${o.process_code} (id ${o.id})`);
} else {
  console.log(`  ✓ every non-top-level row has parent_process_id set`);
}

console.log(`\n✓ P1.2 load complete.`);
console.log(`  UI: https://tests.semantius.app/domain_map/processes`);
