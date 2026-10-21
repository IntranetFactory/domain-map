// Verify APQC PCF Cross-Industry v8 rows in domain_map.processes against the xlsx,
// then bulk-approve only those that match.
//
// Run from project root:
//   bun run c:/dev/domain-map/.tmp_deploy/verify_apqc_pcf.ts --dry-run   (verify only)
//   bun run c:/dev/domain-map/.tmp_deploy/verify_apqc_pcf.ts             (verify + approve matched)
//
// Read-only against the xlsx; never re-inserts; PATCHes record_status only.
import * as XLSX from "xlsx";

const PATH = "c:/dev/domain-map/K016808_APQC Process Classification Framework (PCF) - Cross-Industry - Excel Version 8.0.xlsx";
const REPORT = "c:/dev/domain-map/.tmp_deploy/apqc_verification_report.md";
const DRY = process.argv.includes("--dry-run");

// ---- semantius helper ----
async function call(tool: string, payload: unknown, opts: { tolerateTimeout?: boolean } = {}): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], {
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

// ---- parse xlsx (same logic as load_apqc_pcf.ts) ----
const wb = XLSX.readFile(PATH);
const combined = XLSX.utils.sheet_to_json(wb.Sheets["Combined"]!, { header: 1, defval: "", raw: true }) as any[][];
const header = combined[0];
const COL = {
  pcf_id: header.indexOf("PCF ID"),
  hier_id: header.indexOf("Hierarchy ID"),
  name: header.indexOf("Name"),
};
if (Object.values(COL).some(i => i < 0)) throw new Error(`unexpected header layout: ${JSON.stringify(header)}`);

type ParsedRow = {
  external_id: string;
  process_code: string;
  process_name: string;
  hierarchy_level: number;
  parent_code: string | null;
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

const xlsxRows: ParsedRow[] = [];
for (let i = 1; i < combined.length; i++) {
  const r = combined[i];
  const hierId = String(r[COL.hier_id] ?? "").trim();
  if (!hierId) continue;
  const pcfId = String(r[COL.pcf_id] ?? "").trim();
  const name = String(r[COL.name] ?? "").trim();
  if (!name) continue;
  xlsxRows.push({
    external_id: pcfId,
    process_code: hierId,
    process_name: name,
    hierarchy_level: deriveLevel(hierId),
    parent_code: deriveParent(hierId),
  });
}
console.log(`xlsx: parsed ${xlsxRows.length} rows`);

// Build xlsx-side maps keyed by external_id (pcf_id), since that's the source-of-truth join key
const xlsxByExt = new Map<string, ParsedRow>();
const xlsxByCode = new Map<string, ParsedRow>();
for (const r of xlsxRows) {
  if (xlsxByExt.has(r.external_id)) console.warn(`xlsx duplicate external_id ${r.external_id}`);
  if (xlsxByCode.has(r.process_code)) console.warn(`xlsx duplicate process_code ${r.process_code}`);
  xlsxByExt.set(r.external_id, r);
  xlsxByCode.set(r.process_code, r);
}

// ---- read live processes (paged via id ordering) ----
type LiveRow = {
  id: number;
  external_id: string | null;
  process_code: string | null;
  process_name: string;
  hierarchy_level: number | null;
  parent_process_id: number | null;
  record_status: string;
};

async function readAllLive(): Promise<LiveRow[]> {
  const out: LiveRow[] = [];
  const PAGE = 1000;
  let lastId = 0;
  while (true) {
    const res = await call("postgrestRequest", {
      method: "GET",
      path: `/processes?source_framework=eq.apqc_pcf_cross_industry&id=gt.${lastId}&select=id,external_id,process_code,process_name,hierarchy_level,parent_process_id,record_status&order=id.asc&limit=${PAGE}`,
    });
    if (!Array.isArray(res) || res.length === 0) break;
    out.push(...res);
    lastId = res[res.length - 1].id;
    if (res.length < PAGE) break;
  }
  return out;
}

const live = await readAllLive();
console.log(`live: ${live.length} rows`);

const liveByExt = new Map<string, LiveRow>();
const liveById = new Map<number, LiveRow>();
for (const r of live) {
  liveById.set(r.id, r);
  if (r.external_id) {
    if (liveByExt.has(r.external_id)) console.warn(`live duplicate external_id ${r.external_id}`);
    liveByExt.set(r.external_id, r);
  }
}

// ---- compare ----
type Discrepancy = {
  external_id: string;
  category: "missing_in_live" | "missing_in_xlsx" | "name_mismatch" | "level_mismatch" | "parent_mismatch" | "non_new_status";
  expected: string;
  found: string;
  action: string;
};
const discrepancies: Discrepancy[] = [];
const toApprove: number[] = [];          // live ids
const alreadyApproved: number[] = [];
const matchedNew: number[] = [];

for (const x of xlsxRows) {
  const liveRow = liveByExt.get(x.external_id);
  if (!liveRow) {
    discrepancies.push({
      external_id: x.external_id,
      category: "missing_in_live",
      expected: `${x.process_code} "${x.process_name}" L${x.hierarchy_level}`,
      found: "(no live row with this external_id)",
      action: "re-load missing row (do not approve)",
    });
    continue;
  }

  // name
  const liveName = (liveRow.process_name ?? "").trim();
  if (liveName !== x.process_name) {
    discrepancies.push({
      external_id: x.external_id,
      category: "name_mismatch",
      expected: x.process_name,
      found: liveName,
      action: "investigate live edit vs xlsx truth; leave record_status='new'",
    });
    continue;
  }

  // level
  if (liveRow.hierarchy_level !== x.hierarchy_level) {
    discrepancies.push({
      external_id: x.external_id,
      category: "level_mismatch",
      expected: `L${x.hierarchy_level}`,
      found: `L${liveRow.hierarchy_level}`,
      action: "fix hierarchy_level; leave record_status='new'",
    });
    continue;
  }

  // parent: live.parent_process_id → look up live row → external_id should equal xlsxParent's external_id
  if (x.parent_code === null) {
    if (liveRow.parent_process_id !== null) {
      discrepancies.push({
        external_id: x.external_id,
        category: "parent_mismatch",
        expected: "(no parent)",
        found: `parent_process_id=${liveRow.parent_process_id}`,
        action: "clear parent_process_id; leave record_status='new'",
      });
      continue;
    }
  } else {
    const xlsxParent = xlsxByCode.get(x.parent_code);
    if (!xlsxParent) {
      discrepancies.push({
        external_id: x.external_id,
        category: "parent_mismatch",
        expected: `xlsx parent code=${x.parent_code} (not found in xlsx)`,
        found: `parent_process_id=${liveRow.parent_process_id}`,
        action: "xlsx orphan; investigate",
      });
      continue;
    }
    if (liveRow.parent_process_id === null) {
      discrepancies.push({
        external_id: x.external_id,
        category: "parent_mismatch",
        expected: `parent external_id=${xlsxParent.external_id}`,
        found: "parent_process_id=null",
        action: "set parent_process_id; leave record_status='new'",
      });
      continue;
    }
    const liveParent = liveById.get(liveRow.parent_process_id);
    if (!liveParent) {
      discrepancies.push({
        external_id: x.external_id,
        category: "parent_mismatch",
        expected: `parent external_id=${xlsxParent.external_id}`,
        found: `parent_process_id=${liveRow.parent_process_id} (not found in live)`,
        action: "investigate dangling parent_process_id",
      });
      continue;
    }
    if (liveParent.external_id !== xlsxParent.external_id) {
      discrepancies.push({
        external_id: x.external_id,
        category: "parent_mismatch",
        expected: `parent external_id=${xlsxParent.external_id}`,
        found: `parent external_id=${liveParent.external_id ?? "(null)"}`,
        action: "repoint parent_process_id; leave record_status='new'",
      });
      continue;
    }
  }

  // matched
  if (liveRow.record_status === "approved") {
    alreadyApproved.push(liveRow.id);
  } else if (liveRow.record_status === "new") {
    matchedNew.push(liveRow.id);
    toApprove.push(liveRow.id);
  } else {
    discrepancies.push({
      external_id: x.external_id,
      category: "non_new_status",
      expected: "record_status in {new, approved}",
      found: `record_status=${liveRow.record_status}`,
      action: "do not change; report only",
    });
  }
}

// live rows with no corresponding xlsx row
for (const lr of live) {
  if (!lr.external_id) {
    discrepancies.push({
      external_id: `(live id=${lr.id})`,
      category: "missing_in_xlsx",
      expected: "external_id set",
      found: "external_id=null",
      action: "investigate",
    });
    continue;
  }
  if (!xlsxByExt.has(lr.external_id)) {
    discrepancies.push({
      external_id: lr.external_id,
      category: "missing_in_xlsx",
      expected: "matching xlsx row",
      found: `live "${lr.process_name}" L${lr.hierarchy_level}`,
      action: "delete or re-classify; do not approve",
    });
  }
}

console.log(`\n=== summary ===`);
console.log(`  matched + already approved: ${alreadyApproved.length}`);
console.log(`  matched, currently 'new'   : ${matchedNew.length}  ← will approve`);
console.log(`  discrepancies              : ${discrepancies.length}`);
const byCat = new Map<string, number>();
for (const d of discrepancies) byCat.set(d.category, (byCat.get(d.category) ?? 0) + 1);
for (const [cat, n] of byCat) console.log(`    ${cat}: ${n}`);

// ---- write report ----
const lines: string[] = [];
lines.push(`# APQC PCF Cross-Industry v8 — verification report`);
lines.push("");
lines.push(`- xlsx rows parsed: ${xlsxRows.length}`);
lines.push(`- live rows (source_framework='apqc_pcf_cross_industry'): ${live.length}`);
lines.push(`- matched + already approved: ${alreadyApproved.length}`);
lines.push(`- matched + currently 'new' (eligible for approval): ${matchedNew.length}`);
lines.push(`- discrepancies: ${discrepancies.length}`);
lines.push("");
lines.push(`## Category breakdown`);
lines.push("");
for (const [cat, n] of byCat) lines.push(`- ${cat}: ${n}`);
lines.push("");
if (discrepancies.length > 0) {
  lines.push(`## Discrepancies`);
  lines.push("");
  lines.push(`| external_id | category | expected | found | recommended action |`);
  lines.push(`|---|---|---|---|---|`);
  for (const d of discrepancies) {
    const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
    lines.push(`| ${esc(d.external_id)} | ${d.category} | ${esc(d.expected)} | ${esc(d.found)} | ${esc(d.action)} |`);
  }
  lines.push("");
}
await Bun.write(REPORT, lines.join("\n"));
console.log(`\nreport: ${REPORT}`);

// ---- approve matched 'new' rows ----
if (DRY) {
  console.log(`\n--dry-run: not approving. Re-run without --dry-run to PATCH record_status='approved'.`);
  process.exit(0);
}

if (toApprove.length === 0) {
  console.log(`\nnothing to approve.`);
  process.exit(0);
}

console.log(`\n=== approving ${toApprove.length} matched 'new' rows ===`);
const CHUNK = 200;
let done = 0;
for (let i = 0; i < toApprove.length; i += CHUNK) {
  const slice = toApprove.slice(i, i + CHUNK);
  // PostgREST in() with id list
  const idList = slice.join(",");
  const res = await call("postgrestRequest", {
    method: "PATCH",
    path: `/processes?id=in.(${idList})&record_status=eq.new`,
    body: { record_status: "approved" },
  }, { tolerateTimeout: true });
  done += slice.length;
  process.stdout.write(`  ${done}/${toApprove.length}${res?.__timedOut ? " [timeout, assume ok]" : ""}\r`);
}
console.log();

// ---- final audit ----
const finalStatuses = await call("postgrestRequest", {
  method: "GET",
  path: "/processes?source_framework=eq.apqc_pcf_cross_industry&select=record_status",
});
const statusCounts = new Map<string, number>();
for (const r of finalStatuses ?? []) statusCounts.set(r.record_status, (statusCounts.get(r.record_status) ?? 0) + 1);
console.log(`\n=== final record_status distribution ===`);
for (const [s, n] of statusCounts) console.log(`  ${s}: ${n}`);
console.log(`\n✓ verification complete.`);
