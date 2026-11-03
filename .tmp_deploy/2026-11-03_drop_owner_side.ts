// Step d of plans/relationship-parent-first-plan.md: remove the owner_side computed entry, then the field.
// Values are in backups/relationship-owner-side-drop-2026-11-03.json. Safe to re-run: each step checks first.
import { pg } from "../scripts/lib/catalog.ts";

async function crud(tool: string, args: unknown): Promise<string> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(args));
  proc.stdin.end();
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`${tool}: ${err || out}`);
  return out;
}

const TABLE = "data_object_relationships";
const before = (await pg("GET", `/${TABLE}?select=*&order=id&limit=20000`)) as Record<string, unknown>[];
const [entity] = (await pg("GET", `/entities?table_name=eq.${TABLE}&select=computed_fields`)) as { computed_fields: { name: string }[] }[];

const kept = entity.computed_fields.filter((c) => c.name !== "owner_side");
if (kept.length !== entity.computed_fields.length) {
  if (kept.map((c) => c.name).join() !== "data_object_relationship_label") throw new Error(`unexpected computed fields: ${kept.map((c) => c.name)}`);
  await crud("update_entity", { table_name: TABLE, data: { computed_fields: kept } });
  console.log("removed the owner_side computed entry");
}

const fields = (await pg("GET", `/fields?table_name=eq.${TABLE}&field_name=eq.owner_side&select=id`)) as { id: string }[];
if (fields.length) {
  await crud("delete_field", { id: `${TABLE}.owner_side` });
  console.log("deleted the owner_side field");
}

// Verify: same rows, same values, the column gone, and the label rule still working.
const after = (await pg("GET", `/${TABLE}?select=*&order=id&limit=20000`)) as Record<string, unknown>[];
const byId = new Map(after.map((r) => [r.id, r]));
const problems: string[] = [];
if (after.length !== before.length) problems.push(`row count ${before.length} -> ${after.length}`);
if (after.some((r) => "owner_side" in r)) problems.push("owner_side is still on the rows");
for (const b of before) {
  const a = byId.get(b.id);
  if (!a) { problems.push(`${b.id}: row is gone`); continue; }
  for (const k of Object.keys(b)) {
    if (k === "owner_side" || k === "updated_at" || k === "search_vector") continue;
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) problems.push(`${b.id}: ${k} changed`);
  }
}
const [end] = (await pg("GET", `/entities?table_name=eq.${TABLE}&select=computed_fields,validation_rules`)) as { computed_fields: { name: string }[]; validation_rules: { code: string }[] }[];
console.log(`rows ${after.length}; computed: ${end.computed_fields.map((c) => c.name)}; rules: ${end.validation_rules.map((r) => r.code)}`);
if (problems.length) { console.error("VERIFY FAILED"); for (const p of problems.slice(0, 30)) console.error(`  ${p}`); process.exit(1); }
console.log("verified: every row intact, owner_side gone");
