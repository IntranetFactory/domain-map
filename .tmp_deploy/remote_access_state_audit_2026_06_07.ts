#!/usr/bin/env bun
// REMOTE-ACCESS state-driven Validate (2026-06-07).
// Executes the two additive/corrective EXECUTE items classified from state.yaml:
//   1. entity_type classify (Rule #12 / B13): masters 238 + 239 unclassified -> operational_workflow.
//   2. data_object_aliases (B1A-B11, reclassified EXECUTE per Rule #21 additive boundary):
//      INSERT generic vendor-neutral synonyms on remote_sessions (238) + session_recordings (239).
//
// Idempotent: reads live before each write; PATCH only when still unclassified;
// INSERT only the aliases not already present (keyed on data_object_id + alias_name).
// Surfaced (NOT written here): B1A-B6 cardinality pick, B2-S1/S2/S3/S4/H1.

import {} from "bun";

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

const MASTERS = [238, 239];

// ============================================================
// STEP 1 — entity_type classify (Rule #12 / B13)
// Both descriptions describe live operational-workflow masters:
//   remote_sessions: requested -> consent_pending -> connected -> privileged -> ended
//   session_recordings: recording -> archived -> retention_lock -> expired
// => operational_workflow on both. PATCH only rows still unclassified/null.
// ============================================================
async function classifyEntityTypes() {
  console.log("STEP 1 — entity_type classify");
  const live = await get(
    `/data_objects?id=in.(${MASTERS.join(",")})&select=id,data_object_name,entity_type`,
  );
  let patched = 0;
  for (const m of live) {
    const id = Number(m.id);
    const cur = m.entity_type;
    if (cur === "unclassified" || cur === null || cur === undefined) {
      await call({
        method: "PATCH",
        path: `/data_objects?id=eq.${id}`,
        body: { entity_type: "operational_workflow" },
      });
      console.log(`  PATCH ${m.data_object_name} (${id}): ${cur} -> operational_workflow`);
      patched++;
    } else {
      console.log(`  skip ${m.data_object_name} (${id}): already '${cur}'`);
    }
  }
  console.log(`  entity_type patched: ${patched}`);
}

// ============================================================
// STEP 2 — data_object_aliases (B1A-B11)
// Generic, vendor-neutral synonyms (Rule #18 OK). alias_type='synonym'.
// record_status omitted (DB default 'new', Rule #1). 'notes' NEVER written (Rule #15).
// ============================================================
const ALIASES: { data_object_id: number; alias_name: string }[] = [
  { data_object_id: 238, alias_name: "support sessions" },
  { data_object_id: 238, alias_name: "attended sessions" },
  { data_object_id: 238, alias_name: "unattended sessions" },
  { data_object_id: 238, alias_name: "remote control sessions" },
  { data_object_id: 239, alias_name: "support recordings" },
  { data_object_id: 239, alias_name: "compliance recordings" },
  { data_object_id: 239, alias_name: "audit recordings" },
  { data_object_id: 239, alias_name: "session capture" },
];

async function loadAliases() {
  console.log("STEP 2 — data_object_aliases");
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${MASTERS.join(",")})&select=data_object_id,alias_name`,
  );
  const existingKey = new Set(
    existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`),
  );
  const missing = ALIASES.filter(
    a => !existingKey.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`),
  ).map(a => ({
    data_object_id: a.data_object_id,
    alias_name: a.alias_name,
    alias_type: "synonym",
    is_preferred: false,
  }));
  if (missing.length === 0) {
    console.log(`  all ${ALIASES.length} aliases already present; nothing to insert`);
  } else {
    const inserted = await insert("/data_object_aliases", missing);
    console.log(`  inserted ${inserted.length} aliases (${existing.length} existed before)`);
    for (const r of inserted) {
      console.log(`    id ${r.id}: ${r.data_object_id} -> "${r.alias_name}"`);
    }
  }
}

async function summary() {
  console.log("\n=== POST-LOAD VERIFICATION ===");
  const dobs = await get(
    `/data_objects?id=in.(${MASTERS.join(",")})&select=id,data_object_name,entity_type`,
  );
  for (const d of dobs) {
    console.log(`  ${d.data_object_name} (${d.id}): entity_type=${d.entity_type}`);
  }
  const aliases = await get(
    `/data_object_aliases?data_object_id=in.(${MASTERS.join(",")})&select=id,data_object_id,alias_name,alias_type&order=data_object_id,id`,
  );
  console.log(`  aliases total on 238/239: ${aliases.length}`);
  for (const a of aliases) {
    console.log(`    ${a.data_object_id} -> "${a.alias_name}" (${a.alias_type}, id ${a.id})`);
  }
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases?data_object_id=in.(238,239)");
}

async function main() {
  await classifyEntityTypes();
  await loadAliases();
  await summary();
  console.log("\nDONE.");
}

await main();
