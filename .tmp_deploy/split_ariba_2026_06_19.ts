#!/usr/bin/env bun
// Split SAP Ariba into per-module solution rows, mirroring the SAP SuccessFactors treatment.
// Adds 5 module-grain `solutions` rows (vendor SAP SE, id 18) plus their `solution_domains`
// coverage rows onto existing domains S2P / CLM / SRM / TPRM. The umbrella "SAP Ariba"
// (solutions.id 127, S2P primary + SRM secondary) is left intact.
//
// Idempotent: reads existing rows by natural key, inserts only the missing ones.
// record_status is omitted so the DB default ('new') applies (Rule #1). No `notes` writes (Rule #15).

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

const SAP_SE = 18;
const DOM = { S2P: 27, CLM: 26, SRM: 28, TPRM: 19 } as const;

// Phase 1 — module-grain solution rows (vendor SAP SE). solution_kind stays the default
// 'standard_solution' (no tool_solutions wiring yet, so no promotion to external_connector).
const solutions: Row[] = [
  {
    solution_name: "SAP Ariba Sourcing",
    vendor_id: SAP_SE,
    solution_kind: "standard_solution",
    description:
      "SAP Ariba strategic sourcing application: RFx events, reverse auctions, and supplier bid management within the source-to-pay process.",
  },
  {
    solution_name: "SAP Ariba Buying and Invoicing",
    vendor_id: SAP_SE,
    solution_kind: "standard_solution",
    description:
      "SAP Ariba procure-to-pay application: guided buying, catalogs, requisitions, purchase orders, and invoice reconciliation.",
  },
  {
    solution_name: "SAP Ariba Contracts",
    vendor_id: SAP_SE,
    solution_kind: "standard_solution",
    description:
      "SAP Ariba procurement contract management application: clause libraries, contract authoring, and compliance tracking for buy-side agreements.",
  },
  {
    solution_name: "SAP Ariba Supplier Lifecycle and Performance",
    vendor_id: SAP_SE,
    solution_kind: "standard_solution",
    description:
      "SAP Ariba supplier management application: registration, qualification, segmentation, and performance scorecards.",
  },
  {
    solution_name: "SAP Ariba Supplier Risk",
    vendor_id: SAP_SE,
    solution_kind: "standard_solution",
    description:
      "SAP Ariba supplier risk application: risk monitoring, due-diligence assessments, and continuous third-party risk signals.",
  },
];

// Phase 2 — coverage onto existing domains (each module maps to one primary domain).
const coverage: { solution_name: string; domain_id: number; coverage_level: string }[] = [
  { solution_name: "SAP Ariba Sourcing", domain_id: DOM.S2P, coverage_level: "primary" },
  { solution_name: "SAP Ariba Buying and Invoicing", domain_id: DOM.S2P, coverage_level: "primary" },
  { solution_name: "SAP Ariba Contracts", domain_id: DOM.CLM, coverage_level: "primary" },
  { solution_name: "SAP Ariba Supplier Lifecycle and Performance", domain_id: DOM.SRM, coverage_level: "primary" },
  { solution_name: "SAP Ariba Supplier Risk", domain_id: DOM.TPRM, coverage_level: "primary" },
];

async function main() {
  // ---- Phase 1: solutions (idempotent on solution_name) ----
  const existingSol = await get("/solutions?select=id,solution_name&limit=10000");
  const existingNames = new Set(existingSol.map(r => String(r.solution_name)));
  const missingSol = solutions.filter(s => !existingNames.has(String(s.solution_name)));
  console.log(`solutions: ${missingSol.length} to insert (${solutions.length - missingSol.length} already present)`);
  if (missingSol.length > 0) await insert("/solutions", missingSol);

  // Re-read to build solution_name -> id map for the 5 module rows.
  const names = solutions.map(s => `"${String(s.solution_name).replace(/"/g, '\\"')}"`).join(",");
  const solRows = await get(`/solutions?solution_name=in.(${names})&select=id,solution_name`);
  const solMap = new Map<string, number>();
  for (const r of solRows) solMap.set(String(r.solution_name), Number(r.id));

  // ---- Phase 2: solution_domains (idempotent on solution_id|domain_id) ----
  const solIds = coverage.map(c => solMap.get(c.solution_name)).filter(Boolean) as number[];
  const existingSd = await get(
    `/solution_domains?solution_id=in.(${solIds.join(",")})&select=solution_id,domain_id`,
  );
  const seen = new Set(existingSd.map(r => `${r.solution_id}|${r.domain_id}`));
  const sdRows: Row[] = coverage
    .map(c => ({
      solution_id: solMap.get(c.solution_name)!,
      domain_id: c.domain_id,
      coverage_level: c.coverage_level,
    }))
    .filter(r => !seen.has(`${r.solution_id}|${r.domain_id}`));
  console.log(`solution_domains: ${sdRows.length} to insert (${coverage.length - sdRows.length} already present)`);
  if (sdRows.length > 0) await insert("/solution_domains", sdRows);

  // ---- Summary ----
  console.log("\n=== SAP Ariba split summary ===");
  const finalSol = await get(
    `/solutions?solution_name=in.(${names})&select=id,solution_name,solution_kind,record_status&order=id.asc`,
  );
  for (const s of finalSol) {
    const cov = coverage.find(c => c.solution_name === s.solution_name);
    const domCode = Object.entries(DOM).find(([, v]) => v === cov?.domain_id)?.[0] ?? "?";
    console.log(`  [${s.id}] ${s.solution_name}  ->  ${domCode} (${cov?.coverage_level})  kind=${s.solution_kind}  status=${s.record_status}`);
  }
  console.log("\nUmbrella row left intact: SAP Ariba (id 127).");
  console.log("\nUI: https://adenin.semantius.app/domain_map/solutions");
  console.log("UI: https://adenin.semantius.app/domain_map/solution_domains");
}

await main();
