// Rule #10 users edges for CDP masters with a clear user-typed actor (audit CDP, 2026-06-13).
// users platform-builtin = data_object id 748. Corrective-additive on existing masters.
// Clear human-author masters: audience_segments (segment author), customer_attributes (trait definer),
// customer_journeys (journey definer). customer_events / identity_graphs are machine-emitted/resolved
// with no per-row human author -> intentionally skipped (Rule #10 covers masters WITH a user-typed actor).
// customers (97) is CRM-mastered and already carries its users edge (rels 440, 1040) -> not CDP's to author.
// Idempotent: skips an edge if one already exists for the (user, master) pair in either direction.

const BASE = "semantius";
const USERS = 748;

async function get(path: string): Promise<any[]> {
  const proc = Bun.spawn([BASE, "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify({ method: "GET", path }));
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error(`GET ${path} failed: ${out}`);
  return JSON.parse(out);
}
async function post(path: string, body: unknown): Promise<void> {
  const proc = Bun.spawn([BASE, "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify({ method: "POST", path, body }));
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error(`POST ${path} failed: ${err || out}`);
}

// (master_id, forward_verb [user -> master], inverse_verb)
const EDGES: Array<[number, string, string]> = [
  [113, "defines", "is defined by"],   // audience_segments: a user authors the segment
  [114, "configures", "is configured by"], // customer_attributes: a user defines the computed trait
  [115, "defines", "is defined by"],   // customer_journeys: a user defines journey stages
];

// existing edges between users and these masters
const existing = await get(
  `/data_object_relationships?or=(and(data_object_id.eq.${USERS},related_data_object_id.in.(113,114,115)),and(related_data_object_id.eq.${USERS},data_object_id.in.(113,114,115)))&select=data_object_id,related_data_object_id`
);
const seen = new Set(existing.map((r) => `${r.data_object_id}-${r.related_data_object_id}`));

let added = 0;
for (const [master, verb, inv] of EDGES) {
  if (seen.has(`${USERS}-${master}`) || seen.has(`${master}-${USERS}`)) {
    console.log(`skip (exists): users <-> ${master}`);
    continue;
  }
  await post("/data_object_relationships", {
    data_object_id: USERS,
    related_data_object_id: master,
    relationship_verb: verb,
    inverse_verb: inv,
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    is_required: false,
    owner_side: "source",
  });
  console.log(`added: users ${verb} ${master}`);
  added++;
}
console.log(`\nDone. ${added} users edges added.`);
