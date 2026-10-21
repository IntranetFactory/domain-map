#!/usr/bin/env bun
// Reverts entities.computed_fields[*].name and entities.label_column
// for the handoffs entity to "cross_domain_handoff_label" so they match
// the (un-renamable, is_core=true) underlying /fields row + the actual
// queryable column. See plan-handoffs.md §13.
//
// Run from project root:
//   bun run .tmp_deploy/revert_computed_field_metadata.ts

type Row = Record<string, unknown>;

async function semCall(tool: string, payload: Row): Promise<Row | Row[] | null> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${tool} (exit ${code}): ${stderr.trim() || stdout.trim()}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : null;
}

const ent = (await semCall("read_entity", { filters: "table_name=eq.handoffs" }) as Row[])[0];
const cf = (ent.computed_fields as Row[]) ?? [];
const reverted = cf.map((c) => c.name === "handoff_label" ? { ...c, name: "cross_domain_handoff_label" } : c);

console.log("Reverting handoffs.label_column and computed_fields[*].name to cross_domain_handoff_label...");
await semCall("update_entity", {
  table_name: "handoffs",
  data: {
    label_column: "cross_domain_handoff_label",
    computed_fields: reverted,
  },
});

const verify = await semCall("postgrestRequest", { method: "GET", path: "/handoffs?select=id,cross_domain_handoff_label&limit=1" }) as Row[];
console.log("Verification: GET /handoffs?select=id,cross_domain_handoff_label&limit=1 ->", JSON.stringify(verify[0]));
console.log("Done.");
