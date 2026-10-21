#!/usr/bin/env bun
// B1A-S8 — author data_object_aliases across the 5 LCAP masters covering flagship vendor
// terminology (OutSystems, Mendix, Power Apps/Platform, Appian, Pega). Vendor / product names
// are EXPLICITLY allowed on data_object_aliases per Rule #18 (commerce-shaped entity).
//
// alias_type='synonym' (resolving each vendor name to a specific solution_id is deferred per the
// established cluster-drafts behavior; the b1a action only asks for alias tuples). is_preferred=false.
// notes='' per Rule #15. record_status omitted (DB default 'new', Rule #1).
//
// Dedup by natural key (data_object_id, alias_name): distinct alias names per master only, and
// skips any alias already present.
//
// Run from project root: bun run c:/dev/domain-map/.tmp_deploy/lcap_b1a_aliases_2026_06_06.ts

export {};

async function postgrest(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path}: ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

const ALIASES: { id: number; names: string[] }[] = [
  // lcap_apps (220) — OutSystems Application, Mendix App, Power Apps Canvas/Model-Driven App
  { id: 220, names: ["Application", "App", "Canvas App", "Model-Driven App"] },
  // lcap_business_objects (221) — OutSystems/Mendix Entity, Dataverse Table, Appian Record Type, Pega Case Type
  { id: 221, names: ["Entity", "Domain Entity", "Table", "Record Type", "Case Type"] },
  // lcap_workflows (222) — OutSystems Process, Mendix Microflow, Power Automate Cloud Flow, Appian Process Model
  { id: 222, names: ["Microflow", "Cloud Flow", "Process Model", "Flow"] },
  // lcap_pages (715) — OutSystems/Power Apps Screen, Mendix Page, Appian Interface, Pega View
  { id: 715, names: ["Screen", "Page", "Interface", "View"] },
  // lcap_data_sources (716) — OutSystems Integration, Power Platform Connector, Appian Connected System, Pega Data Page
  { id: 716, names: ["Integration", "Connector", "Connected System", "Data Page"] },
];

const masterIds = ALIASES.map((a) => a.id);
const existing: any[] = await postgrest(
  "GET",
  `/data_object_aliases?data_object_id=in.(${masterIds.join(",")})&select=data_object_id,alias_name`,
);
const seen = new Set(existing.map((r) => `${r.data_object_id}|${r.alias_name.toLowerCase()}`));
console.log(`Existing aliases on these masters: ${existing.length}`);

const rows: Record<string, unknown>[] = [];
for (const a of ALIASES) {
  const localSeen = new Set<string>();
  for (const name of a.names) {
    const lc = name.toLowerCase();
    if (localSeen.has(lc)) continue; // dedup within master
    localSeen.add(lc);
    const key = `${a.id}|${lc}`;
    if (seen.has(key)) {
      console.log(`  SKIP (dup): ${a.id} ${name}`);
      continue;
    }
    rows.push({
      data_object_id: a.id,
      alias_name: name,
      alias_type: "synonym",
      is_preferred: false,
      notes: "",
    });
  }
}

console.log(`Inserting ${rows.length} aliases...`);
if (rows.length > 0) {
  const res = await postgrest("POST", "/data_object_aliases", rows);
  console.log(`  inserted ${Array.isArray(res) ? res.length : rows.length}`);
}

// Verify
const after: any[] = await postgrest(
  "GET",
  `/data_object_aliases?data_object_id=in.(${masterIds.join(",")})&select=data_object_id,alias_name&order=data_object_id.asc`,
);
console.log(`\nPost-load: ${after.length} aliases across the 5 masters.`);
const byDo = new Map<number, string[]>();
for (const r of after) {
  if (!byDo.has(r.data_object_id)) byDo.set(r.data_object_id, []);
  byDo.get(r.data_object_id)!.push(r.alias_name);
}
for (const [doId, names] of byDo) console.log(`  do ${doId}: ${names.join(", ")}`);
