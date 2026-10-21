// FMIS B11 alias backfill (B1A-S4). Loads cross-vendor / cross-industry synonyms
// for the 8 FMIS masters as alias_type='synonym' (no FK required). Idempotent by
// (data_object_id, alias_name). record_status omitted -> DB default 'new' (Rule #1).
// No notes written (Rule #15). American English, no em-dashes.

const PROJECT = "c:/dev/domain-map";

async function crud(method: string, path: string, body?: unknown): Promise<any> {
  const args = ["call", "crud", "postgrestRequest"];
  const payload = JSON.stringify({ method, path, ...(body !== undefined ? { body } : {}) });
  const proc = Bun.spawn(["semantius", ...args], {
    cwd: PROJECT,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(payload);
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (err.trim() && !out.trim()) throw new Error(err.trim());
  try {
    return JSON.parse(out);
  } catch {
    return out;
  }
}

// One preferred synonym + secondary synonyms per master. Drawn from the audit's
// alternate-synonym list, restricted to well-established cross-vendor / cross-industry terms.
const ALIASES: { data_object_id: number; master: string; rows: { alias_name: string; is_preferred: boolean }[] }[] = [
  { data_object_id: 486, master: "farm_fields", rows: [
    { alias_name: "Paddock", is_preferred: true },
    { alias_name: "Plot", is_preferred: false },
    { alias_name: "Block", is_preferred: false },
  ]},
  { data_object_id: 487, master: "crop_plans", rows: [
    { alias_name: "Rotation Plan", is_preferred: true },
    { alias_name: "Season Plan", is_preferred: false },
  ]},
  { data_object_id: 488, master: "planting_records", rows: [
    { alias_name: "As-Planted Record", is_preferred: true },
    { alias_name: "Seeding Pass", is_preferred: false },
  ]},
  { data_object_id: 489, master: "field_applications", rows: [
    { alias_name: "Spray Record", is_preferred: true },
    { alias_name: "Application Pass", is_preferred: false },
  ]},
  { data_object_id: 490, master: "harvest_records", rows: [
    { alias_name: "Yield Record", is_preferred: true },
    { alias_name: "As-Harvested Record", is_preferred: false },
  ]},
  { data_object_id: 491, master: "ag_input_inventory", rows: [
    { alias_name: "Input Stock", is_preferred: true },
    { alias_name: "Farm Bin Inventory", is_preferred: false },
  ]},
  { data_object_id: 492, master: "variable_rate_prescriptions", rows: [
    { alias_name: "Prescription File", is_preferred: true },
    { alias_name: "VR Map", is_preferred: false },
    { alias_name: "Rx Map", is_preferred: false },
  ]},
  { data_object_id: 493, master: "machinery_telemetry_records", rows: [
    { alias_name: "Task Data", is_preferred: true },
    { alias_name: "ISOXML Record", is_preferred: false },
  ]},
];

async function main() {
  // read existing for idempotency
  const ids = ALIASES.map((a) => a.data_object_id).join(",");
  const existing: any[] = await crud("GET", `/data_object_aliases?data_object_id=in.(${ids})&select=data_object_id,alias_name`);
  const have = new Set(existing.map((r) => `${r.data_object_id}::${r.alias_name.toLowerCase()}`));

  const toInsert: any[] = [];
  for (const m of ALIASES) {
    for (const r of m.rows) {
      const key = `${m.data_object_id}::${r.alias_name.toLowerCase()}`;
      if (have.has(key)) continue;
      toInsert.push({
        data_object_id: m.data_object_id,
        alias_name: r.alias_name,
        alias_type: "synonym",
        is_preferred: r.is_preferred,
      });
    }
  }

  console.log(`existing rows: ${existing.length} | to insert: ${toInsert.length}`);
  if (toInsert.length === 0) {
    console.log("nothing to insert (idempotent no-op)");
    return;
  }

  const res = await crud("POST", "/data_object_aliases", toInsert);
  console.log("insert response:", JSON.stringify(res).slice(0, 400));

  const after: any[] = await crud("GET", `/data_object_aliases?data_object_id=in.(${ids})&select=data_object_id,alias_name,alias_type,is_preferred&order=data_object_id.asc`);
  console.log(`\nfinal alias count for FMIS masters: ${after.length}`);
  for (const m of ALIASES) {
    const rows = after.filter((r) => r.data_object_id === m.data_object_id);
    console.log(`  ${m.master} (${m.data_object_id}): ${rows.map((r) => r.alias_name + (r.is_preferred ? "*" : "")).join(", ")}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
