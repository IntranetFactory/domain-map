#!/usr/bin/env bun
// OBS B11 alias insert (2026-06-07), state-driven execute pass.
//
// Inserts clearly-generic synonyms (Rule #18: no vendor/product names) on the OBS
// masters that stay in OBS regardless of the B3-S2 promotion outcome. Aliases on
// log_entries (-> LOG-MGMT risk) and error_groups (-> IRM risk) are DEFERRED because
// their B3-S2 migration dependency makes them potentially misplaced work today.
//
// alias_type='synonym' (pure generic synonym; no industry_id / solution_id).
// `notes` is OMITTED entirely (Rule #15 forbids writing a column named exactly notes).
// record_status omitted -> defaults to 'new' (Rule #1).
// Idempotent on (data_object_id, alias_name).

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
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });
const post = (path: string, body: Row[]) => call({ method: "POST", path, body });

// data_object_id -> generic synonyms (Rule #18 clean: no vendor/product names)
const ALIASES: { data_object_id: number; alias_name: string }[] = [
  { data_object_id: 88, alias_name: "time series" },
  { data_object_id: 88, alias_name: "metric" },
  { data_object_id: 90, alias_name: "trace" },
  { data_object_id: 90, alias_name: "span" },
  { data_object_id: 91, alias_name: "SLO" },
  { data_object_id: 91, alias_name: "service level indicator" },
  { data_object_id: 91, alias_name: "SLI" },
];

const ids = [...new Set(ALIASES.map(a => a.data_object_id))].join(",");
const existing = await get(
  `/data_object_aliases?data_object_id=in.(${ids})&select=data_object_id,alias_name`,
);
const seen = new Set(existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`));

const toInsert = ALIASES.filter(
  a => !seen.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`),
).map(a => ({ ...a, alias_type: "synonym", is_preferred: false }));

console.log(`OBS aliases: ${existing.length} existing, ${toInsert.length} to insert.`);
if (toInsert.length > 0) {
  const res = await post("/data_object_aliases", toInsert);
  for (const a of toInsert) console.log(`  + ${a.data_object_id}: "${a.alias_name}"`);
  console.log(`inserted ${res.length} alias row(s).`);
} else {
  console.log("nothing to insert (idempotent).");
}
