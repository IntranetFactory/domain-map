// M5 scan: operational_workflow masters with ZERO data_object_lifecycle_states.
// Maps each to the domain(s) whose modules master it.
export {};

async function pg(path: string): Promise<any> {
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest",
     JSON.stringify({ method: "GET", path })],
    { stdout: "pipe", stderr: "pipe" },
  );
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return JSON.parse(out);
}

// 1. Every master operational_workflow entity + the domain that masters it.
const masters: any[] = await pg(
  "/domain_module_data_objects?role=eq.master" +
  "&select=data_object_id,data_objects!inner(data_object_name,entity_type)," +
  "domain_modules!inner(domain_module_code,domains!inner(domain_code,catalog_release))" +
  "&data_objects.entity_type=eq.operational_workflow",
);

// 2. data_object_ids that DO have >=1 lifecycle state.
const states: any[] = await pg("/data_object_lifecycle_states?select=data_object_id");
const haveStates = new Set<number>(states.map((s) => s.data_object_id));

// 3. Diff: masters with no lifecycle state.
const byDomain = new Map<string, { released: boolean; ents: Set<string> }>();
for (const m of masters) {
  if (haveStates.has(m.data_object_id)) continue;
  const dom = m.domain_modules.domains.domain_code;
  const released = m.domain_modules.domains.catalog_release != null;
  const ent = m.data_objects.data_object_name;
  if (!byDomain.has(dom)) byDomain.set(dom, { released, ents: new Set() });
  byDomain.get(dom)!.ents.add(`${ent} (${m.domain_modules.domain_module_code})`);
}

const rows = [...byDomain.entries()].sort((a, b) =>
  Number(b[1].released) - Number(a[1].released) || a[0].localeCompare(b[0]));
let total = 0;
console.log(`M5 (operational_workflow master, no lifecycle states) — ${rows.length} domain(s):\n`);
for (const [dom, { released, ents }] of rows) {
  total += ents.size;
  console.log(`${released ? "[RELEASED]" : "[unreleased]"} ${dom}  (${ents.size})`);
  for (const e of [...ents].sort()) console.log(`    - ${e}`);
}
console.log(`\nTotal flagged entities: ${total}`);
