#!/usr/bin/env bun
type Row = Record<string, unknown>;
async function sem(tool: string, p: Row) {
  const proc = Bun.spawn(["semantius","call","crud",tool],{stdin:"pipe",stdout:"pipe",stderr:"pipe"});
  proc.stdin.write(JSON.stringify(p)); await proc.stdin.end();
  const [o,e] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const c = await proc.exited;
  if (c!==0) throw new Error(`${tool} (${c}): ${e.trim()||o.trim()}`);
  return o.trim() ? JSON.parse(o.trim()) : null;
}
const ent = (await sem("read_entity",{filters:"table_name=eq.handoffs"}) as Row[])[0];
const cf = (ent.computed_fields as Row[]) ?? [];
const fixed = cf.map(c => c.name === "cross_domain_handoff_label" ? {...c, name: "handoff_label"} : c);
console.log("Updating entities.computed_fields[0].name to handoff_label");
await sem("update_entity",{table_name:"handoffs", data:{computed_fields: fixed}});
const v = (await sem("read_entity",{filters:"table_name=eq.handoffs"}) as Row[])[0];
console.log("Verified computed_fields[0].name:", ((v.computed_fields as Row[])[0]).name);
