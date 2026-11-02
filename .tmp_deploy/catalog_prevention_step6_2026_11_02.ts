#!/usr/bin/env bun
// Step 6 prevention of plans/blueprint-external-links-plan.md (user: "apply all", 2026-11-02), on
// data_object_relationships:
//   1  validation rule: a users link cannot be a many_to_many reference
//   2  computed owner_side: derived from cardinality, except one_to_one and many_to_many
// Then tests both against live rows, writing back only values each row already holds, and restores
// the previous rules if a test fails. Dry-run by default; pass --apply to write.
type Row = Record<string, any>;
const APPLY = process.argv.includes("--apply");
const USERS = 748;
const ENTITY = "data_object_relationships";

async function semantius(tool: string, body: unknown): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`semantius ${tool} failed: ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const get = (path: string) => semantius("postgrestRequest", { method: "GET", path });
const patch = (path: string, body: Row) => semantius("postgrestRequest", { method: "PATCH", path, body });
const row = async (id: number): Promise<Row> => (await get(`/${ENTITY}?select=*&id=eq.${id}`))[0];

const entity = (await get(`/entities?select=computed_fields,validation_rules&table_name=eq.${ENTITY}`))[0];
const computedBefore: Row[] = entity.computed_fields ?? [];
const rulesBefore: Row[] = entity.validation_rules ?? [];

const USERS_RULE = {
  code: "99101",
  name: "users_link_is_not_many_to_many_reference",
  message: "A reference to users is one person per record. Use one one_to_many link from users per role, or a junction entity or an association for a genuine panel or team.",
  jsonlogic: {
    "!": [{
      and: [
        { "==": [{ var: "relationship_type" }, "many_to_many"] },
        { "==": [{ var: "relationship_kind" }, "reference"] },
        { or: [{ "==": [{ var: "data_object_id" }, USERS] }, { "==": [{ var: "related_data_object_id" }, USERS] }] },
      ],
    }],
  },
  description: "Check B7b. A row-scope rule needs a single owner, and a role on a record is one person.",
};
const OWNER_SIDE = {
  name: "owner_side",
  jsonlogic: {
    if: [
      { "==": [{ var: "relationship_type" }, "one_to_many"] }, "source",
      { "==": [{ var: "relationship_type" }, "many_to_one"] }, "target",
      { var: "owner_side" },
    ],
  },
  description: "The parent side is the one side of the cardinality, so it is derived and cannot disagree with it. Kept as written for one_to_one and many_to_many, where cardinality does not decide it.",
  source_module: "domain_map",
};
const OWNER_FIELD_DESCRIPTION =
  "The parent side of the link: the lifecycle owner, and the end without the foreign key. Derived from relationship_type for one_to_many (source) and many_to_one (target). Set by hand only for one_to_one.";

const left = await get(`/${ENTITY}?select=id,relationship_verb&relationship_type=eq.many_to_many&relationship_kind=eq.reference&or=(data_object_id.eq.${USERS},related_data_object_id.eq.${USERS})`);
console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
console.log("users many_to_many references left:", left.map((r: Row) => `${r.id} ${r.relationship_verb}`).join(", ") || "none");
console.log("computed before:", computedBefore.map((c) => c.name).join(", "), "| rules before:", rulesBefore.map((r) => r.name).join(", ") || "none");
if (!APPLY) process.exit(0);

// 1614 is a genuinely many-person link, like 1062 and 1666.
if (left.some((r: Row) => r.id === 1614)) await patch(`/${ENTITY}?id=eq.1614`, { relationship_kind: "association" });

const restore = async () => {
  await semantius("update_entity", { table_name: ENTITY, data: { computed_fields: computedBefore, validation_rules: rulesBefore } });
  console.log("RESTORED the previous rules");
};
await semantius("update_entity", {
  table_name: ENTITY,
  data: {
    computed_fields: [...computedBefore.filter((c) => c.name !== OWNER_SIDE.name), OWNER_SIDE],
    validation_rules: [...rulesBefore.filter((r) => r.name !== USERS_RULE.name), USERS_RULE],
  },
});

const problems: string[] = [];
const oneToOneTarget = (await get(`/${ENTITY}?select=*&relationship_type=eq.one_to_one&owner_side=eq.target&limit=1`))[0];
const oneToOneSource = (await get(`/${ENTITY}?select=*&relationship_type=eq.one_to_one&owner_side=eq.source&limit=1`))[0];
const manyToMany = (await get(`/${ENTITY}?select=*&relationship_type=eq.many_to_many&limit=1`))[0];
const oneToMany = (await get(`/${ENTITY}?select=*&relationship_type=eq.one_to_many&limit=1`))[0];

// A write that does not name owner_side keeps it where cardinality does not decide.
for (const r of [oneToOneTarget, oneToOneSource, manyToMany]) {
  await patch(`/${ENTITY}?id=eq.${r.id}`, { inverse_verb: r.inverse_verb });
  const after = await row(r.id);
  console.log(`keep  ${r.id} ${r.relationship_type}: ${r.owner_side} -> ${after.owner_side}`);
  if (after.owner_side !== r.owner_side) problems.push(`row ${r.id} lost owner_side ${r.owner_side}`);
}
// A wrong owner_side on a one_to_many is overwritten by the derived value.
await patch(`/${ENTITY}?id=eq.${oneToMany.id}`, { owner_side: "target" });
const derived = await row(oneToMany.id);
console.log(`derive ${oneToMany.id} one_to_many, wrote target: stored ${derived.owner_side}`);
if (derived.owner_side !== "source") problems.push(`row ${oneToMany.id} kept a wrong owner_side`);

// The new rule refuses a users many_to_many reference, and the row stays as it was.
const usersRow = (await get(`/${ENTITY}?select=*&data_object_id=eq.${USERS}&relationship_type=eq.one_to_many&relationship_kind=eq.reference&limit=1`))[0];
let rejected = false;
try {
  await patch(`/${ENTITY}?id=eq.${usersRow.id}`, { relationship_type: "many_to_many" });
} catch (e) {
  rejected = /99101|one person per record/.test((e as Error).message);
  console.log("rule rejected the bad write:", rejected);
}
const usersAfter = await row(usersRow.id);
if (!rejected) problems.push("the users rule did not reject the bad write");
if (usersAfter.relationship_type !== "one_to_many") problems.push(`row ${usersRow.id} changed to ${usersAfter.relationship_type}`);

if (problems.length) {
  console.log("PROBLEMS:", problems.join("; "));
  if (usersAfter.relationship_type !== "one_to_many") await patch(`/${ENTITY}?id=eq.${usersRow.id}`, { relationship_type: "one_to_many", relationship_kind: "reference", owner_side: "source" });
  await restore();
  process.exit(1);
}
await semantius("update_field", { id: `${ENTITY}.owner_side`, data: { description: OWNER_FIELD_DESCRIPTION } });
console.log("all tests passed; rules kept");
