#!/usr/bin/env bun
// B1A-S7 for DAIRY-MGMT (domain 156).
// Loads cross-vendor / cross-industry synonym aliases for the 8 DAIRY-MGMT masters.
// All rows are alias_type='synonym' (generic terms, not industry- or solution-scoped),
// so industry_id / solution_id stay NULL. record_status OMITTED (DB default = "new").
// notes left empty per Rule #15. Idempotent: dedup by (data_object_id, alias_name).

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

// (data_object_id, alias_name) tuples. alias_type defaults considered synonym.
const aliasSpecs: { data_object_id: number; alias_name: string }[] = [
  { data_object_id: 499, alias_name: "cow" },
  { data_object_id: 499, alias_name: "animal" },
  { data_object_id: 500, alias_name: "lactation cycle" },
  { data_object_id: 500, alias_name: "DIM record" },
  { data_object_id: 501, alias_name: "parlor session" },
  { data_object_id: 501, alias_name: "milk event" },
  { data_object_id: 502, alias_name: "DHIA test" },
  { data_object_id: 502, alias_name: "milk test" },
  { data_object_id: 503, alias_name: "insemination" },
  { data_object_id: 504, alias_name: "treatment record" },
  { data_object_id: 505, alias_name: "TMR ration" },
  { data_object_id: 506, alias_name: "milk pickup" },
  { data_object_id: 506, alias_name: "tanker load" },
];

async function main() {
  const doIds = Array.from(new Set(aliasSpecs.map(a => a.data_object_id)));
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${doIds.join(",")})&select=data_object_id,alias_name`,
  );
  const key = (d: number, n: string) => `${d}|${n.toLowerCase()}`;
  const existingSet = new Set(
    existing.map(e => key(Number(e.data_object_id), String(e.alias_name))),
  );

  const toInsert = aliasSpecs
    .filter(a => !existingSet.has(key(a.data_object_id, a.alias_name)))
    .map(a => ({
      data_object_id: a.data_object_id,
      alias_name: a.alias_name,
      alias_type: "synonym",
    }));

  if (toInsert.length) {
    console.log(`Inserting ${toInsert.length} alias rows...`);
    await insert("/data_object_aliases", toInsert);
  } else {
    console.log("All alias rows already present.");
  }

  // Verify
  const all = await get(
    `/data_object_aliases?data_object_id=in.(${doIds.join(",")})&select=id,data_object_id,alias_name,alias_type,record_status&order=data_object_id.asc,id.asc`,
  );
  console.log(`\n=== ${all.length} alias rows for DAIRY-MGMT masters ===`);
  for (const r of all) {
    console.log(`  [${r.data_object_id}] "${r.alias_name}" (${r.alias_type}/${r.record_status}) id=${r.id}`);
  }
}

await main();
