// Step c of plans/relationship-parent-first-plan.md: make `from` the parent on the rows the owner approved.
// Dry run by default; `--write` applies. Resumable: a row already in its target state is skipped.
// Never sends record_status. persona_id stays on its row. Also applies steps a and b, the two descriptions.
import { pg } from "../scripts/lib/catalog.ts";
import { checkRelationshipShape, type RelationshipRow } from "../scripts/lib/catalog_invariants.ts";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const WRITE = process.argv.includes("--write");
const SNAPSHOT = process.argv.find((a) => a.startsWith("--snapshot="))?.slice("--snapshot=".length);
if (!SNAPSHOT) throw new Error("--snapshot=<rels.json> is required: the row state the owner approved");

// Endpoints and verbs both move.
const SWAP = [
  1060, 1061, 1063, 1662, 1663, 1664, 1665, // one_to_many, child-first, pointing at users
  15, 264, 297, 299, 324, 541, 584, 585, 933, 962, 1479, 1732, 1733, 1734, 2338, 2445, 2446, 2470, 2483, 2502, 2549, 2553, 2728, // one_to_one at target
  848, 1162, 1264, 1942, 2111, 2112, 2113, 2493, // one_to_one at source, stored backward
  447, 540, 1446, 2148, // one_to_many, stored backward
  2164, // unclear group, the one row with a recommendation to swap
];
// Both ends are the same table, so only the verbs move.
const VERBS_ONLY = [978, 979];
// `from` is already the parent; only owner_side is wrong.
const SET_SOURCE = [232, 254, 267, 276, 358, 389, 2495, 208];
const DELETE = [477];
// Left in place on the owner's instruction: 703, 1008, 1433, 1459, 2768, 2855.

const DESCRIPTIONS: Record<string, string> = {
  data_object_id: 'The parent: the "one" side of a one_to_many, and the parent of a one_to_one. On a many_to_many, either side.',
  related_data_object_id: 'The child, which holds the field: the "many" side of a one_to_many, and the child of a one_to_one. On a many_to_many, the other side.',
};

type Row = RelationshipRow & { id: number; [k: string]: unknown };

const live: Row[] = await pg("GET", "/data_object_relationships?select=*&order=id&limit=20000");
const byId = new Map(live.map((r) => [r.id, r]));
const approved = new Map((JSON.parse(readFileSync(SNAPSHOT, "utf8")) as Row[]).map((r) => [r.id, r]));
const fields: { field_name: string; description: string }[] = await pg("GET", "/fields?table_name=eq.data_object_relationships&select=*");
const entity = await pg("GET", "/entities?table_name=eq.data_object_relationships&select=*");

type Change = { id: number; patch: Partial<Row>; label: string };
const swapped = (a: Row): Partial<Row> => ({
  data_object_id: a.related_data_object_id,
  related_data_object_id: a.data_object_id,
  relationship_verb: a.inverse_verb ?? "",
  inverse_verb: a.relationship_verb,
  owner_side: "source",
});
const verbsOnly = (a: Row): Partial<Row> => ({ relationship_verb: a.inverse_verb ?? "", inverse_verb: a.relationship_verb, owner_side: "source" });
const plan = new Map<number, Partial<Row>>();
const differences: string[] = [];
for (const [ids, build] of [[SWAP, swapped], [VERBS_ONLY, verbsOnly], [SET_SOURCE, () => ({ owner_side: "source" })]] as const) {
  for (const id of ids) {
    const a = approved.get(id);
    if (!a) { differences.push(`${id}: not in the approved snapshot`); continue; }
    plan.set(id, build(a));
  }
}

// 1. Stop if a listed row differs from what the owner approved, unless it already holds the target state.
const KEYS = ["data_object_id", "related_data_object_id", "relationship_verb", "inverse_verb", "relationship_type", "owner_side"] as const;
const inTarget = (r: Row, patch: Partial<Row>) => Object.entries(patch).every(([k, v]) => r[k] === v);
const changes: Change[] = [];
for (const [id, patch] of plan) {
  const r = byId.get(id);
  const a = approved.get(id)!;
  if (!r) { differences.push(`${id}: missing from the live table`); continue; }
  if (inTarget(r, patch)) continue;
  const moved = KEYS.filter((k) => r[k] !== a[k]);
  if (moved.length) differences.push(`${id}: ${moved.map((k) => `${k} is ${r[k]}, approved ${a[k]}`).join("; ")}`);
  changes.push({ id, patch, label: `${r.data_object_relationship_label}` });
}
for (const id of DELETE) {
  const r = byId.get(id);
  const a = approved.get(id);
  if (r && a && KEYS.some((k) => r[k] !== a[k])) differences.push(`${id}: changed since approval, not deleting`);
}

// 2. Stop if a swap would duplicate an existing row. A row being deleted does not count.
const after = new Map(live.filter((r) => !DELETE.includes(r.id)).map((r) => [r.id, { ...r, ...(plan.get(r.id) ?? {}) }]));
const seen = new Map<string, number>();
for (const r of after.values()) {
  const key = `${r.data_object_id}>${r.related_data_object_id}>${String(r.relationship_verb).trim().toLowerCase()}`;
  const other = seen.get(key);
  if (other !== undefined && (plan.has(r.id) || plan.has(other))) differences.push(`${r.id}: would duplicate ${other} (${key})`);
  seen.set(key, r.id);
}

// Pre-flight (loader-idiom.md): the shared shape checks, on only the rows being written.
const written = [...plan.keys()].map((id) => after.get(id)!).filter(Boolean) as RelationshipRow[];
const findings = checkRelationshipShape(written, { allRelationships: [...after.values()] as RelationshipRow[] });
const newRowFailures = findings.filter((f) => f.severity !== "warn");

console.log(`live rows ${live.length}; rows to change ${changes.length}; to delete ${DELETE.filter((id) => byId.has(id)).length}; already done ${plan.size - changes.length}`);
for (const c of changes) console.log(`  ${c.id} ${c.label}  ->  ${JSON.stringify(c.patch)}`);
for (const f of fields) if (DESCRIPTIONS[f.field_name] && f.description !== DESCRIPTIONS[f.field_name]) console.log(`  field ${f.field_name}: "${f.description}" -> "${DESCRIPTIONS[f.field_name]}"`);
console.log(`shape checks on written rows: ${findings.length} warnings, ${newRowFailures.length} failures`);
for (const f of findings) console.log(`  ${f.rule} ${f.rows.join(",")}: ${f.detail}`);
if (differences.length || newRowFailures.length) {
  console.error(`STOP: ${differences.length} differences`);
  for (const d of differences) console.error(`  ${d}`);
  process.exit(1);
}
if (!WRITE) { console.log("dry run: nothing written"); process.exit(0); }

// 3. Back up every relationship row, the table's field definitions and its entity row.
mkdirSync("backups", { recursive: true });
const backup = "backups/relationship-parent-first-2026-11-03.json";
writeFileSync(backup, JSON.stringify({ relationships: live, fields, entity }, null, 2));
console.log(`backup: ${backup}`);

// Steps a and b.
for (const [name, description] of Object.entries(DESCRIPTIONS)) {
  await pg("PATCH", `/fields?id=eq.data_object_relationships.${name}`, { description });
}

// 4. Write.
for (const c of changes) {
  await pg("PATCH", `/data_object_relationships?id=eq.${c.id}`, c.patch);
  console.log(`  wrote ${c.id}`);
}
for (const id of DELETE) {
  if (byId.has(id)) { await pg("DELETE", `/data_object_relationships?id=eq.${id}`); console.log(`  deleted ${id}`); }
}

// c4. Verify against the backup.
const end: Row[] = await pg("GET", "/data_object_relationships?select=*&order=id&limit=20000");
const endById = new Map(end.map((r) => [r.id, r]));
const allowed = new Set(["data_object_id", "related_data_object_id", "relationship_verb", "inverse_verb", "owner_side", "data_object_relationship_label", "updated_at", "search_vector"]);
const problems: string[] = [];
for (const b of live) {
  const e = endById.get(b.id);
  if (DELETE.includes(b.id)) { if (e) problems.push(`${b.id}: not deleted`); continue; }
  if (!e) { problems.push(`${b.id}: row is gone`); continue; }
  const patch = plan.get(b.id);
  const changedKeys = Object.keys(b).filter((k) => JSON.stringify(b[k]) !== JSON.stringify(e[k]));
  if (!patch && changedKeys.some((k) => k !== "updated_at" && k !== "search_vector")) problems.push(`${b.id}: changed but not listed: ${changedKeys.join(",")}`);
  if (patch) {
    if (!inTarget(e, patch)) problems.push(`${b.id}: target state not reached`);
    const bad = changedKeys.filter((k) => !allowed.has(k));
    if (bad.length) problems.push(`${b.id}: unexpected change in ${bad.join(",")}`);
  }
}
const notSource = end.filter((r) => (r.relationship_type === "one_to_many" || r.relationship_type === "one_to_one") && r.owner_side !== "source");
console.log(`rows now ${end.length}; one_to_many and one_to_one rows not at source: ${notSource.length}`);
for (const r of notSource) problems.push(`${r.id}: owner_side is ${r.owner_side}`);
for (const id of [1060, 978, 15, 2148]) console.log(`  sample: ${endById.get(id)?.data_object_relationship_label}`);
if (problems.length) { console.error("VERIFY FAILED"); for (const p of problems) console.error(`  ${p}`); process.exit(1); }
console.log("verified: only the approved rows changed");
