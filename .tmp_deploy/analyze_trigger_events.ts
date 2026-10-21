// Analyze the existing cross_domain_handoffs.trigger_event inventory.
// Outputs:
//   - unique (event_name, data_object) pairs with subscriber count
//   - data_object names resolved
//   - any event_name collisions across different data_objects (design fork)
async function call(tool: string, payload: unknown): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${tool} (${code}): ${stderr || stdout}`);
  return JSON.parse(stdout);
}

const handoffs = await call("postgrestRequest", {
  method: "GET",
  path: "/cross_domain_handoffs?select=trigger_event,data_object_id,friction_level,integration_pattern&order=id.asc",
});
console.log(`Total handoffs: ${handoffs.length}`);

// Build (event_name, data_object_id) -> subscriber count
type Key = string;
const pairs = new Map<Key, { event: string; data_object_id: number; count: number; frictions: Set<string> }>();
for (const h of handoffs) {
  const k = `${h.trigger_event}|${h.data_object_id}`;
  let v = pairs.get(k);
  if (!v) { v = { event: h.trigger_event, data_object_id: h.data_object_id, count: 0, frictions: new Set() }; pairs.set(k, v); }
  v.count++;
  v.frictions.add(h.friction_level);
}
console.log(`Unique (event, data_object) pairs: ${pairs.size}`);

// Resolve data_object names
const data_object_ids = [...new Set([...pairs.values()].map(p => p.data_object_id))].sort((a, b) => a - b);
const objs = await call("postgrestRequest", {
  method: "GET",
  path: `/data_objects?id=in.(${data_object_ids.join(",")})&select=id,data_object_name,display_label`,
});
const objMap = new Map<number, { name: string; label: string }>();
for (const o of objs) objMap.set(o.id, { name: o.data_object_name, label: o.display_label });

// Collisions: same event_name with multiple data_objects
const byEvent = new Map<string, { data_object_id: number; count: number }[]>();
for (const p of pairs.values()) {
  let arr = byEvent.get(p.event);
  if (!arr) { arr = []; byEvent.set(p.event, arr); }
  arr.push({ data_object_id: p.data_object_id, count: p.count });
}
const collisions = [...byEvent.entries()].filter(([, arr]) => arr.length > 1);
console.log(`\n=== event_name COLLISIONS across data_objects (${collisions.length} events) ===`);
for (const [event, arr] of collisions) {
  console.log(`  ${event}:`);
  for (const a of arr) {
    const o = objMap.get(a.data_object_id);
    console.log(`    → data_object ${a.data_object_id} (${o?.name ?? "?"}) × ${a.count} subscriber${a.count > 1 ? "s" : ""}`);
  }
}

console.log(`\n=== full unique-pair inventory ===`);
const sorted = [...pairs.values()].sort((a, b) => a.event.localeCompare(b.event) || a.data_object_id - b.data_object_id);
for (const p of sorted) {
  const o = objMap.get(p.data_object_id);
  const fri = [...p.frictions].sort().join("/");
  console.log(`  ${p.event}  [${o?.name ?? "?"}] subs=${p.count} fric=${fri}`);
}

console.log(`\n=== summary ===`);
console.log(`  total handoff rows: ${handoffs.length}`);
console.log(`  unique (event, data_object) pairs (→ trigger_events rows to create): ${pairs.size}`);
console.log(`  distinct event_names: ${byEvent.size}`);
console.log(`  event_names with collisions across data_objects: ${collisions.length}`);
console.log(`  distinct data_objects referenced: ${data_object_ids.length}`);
