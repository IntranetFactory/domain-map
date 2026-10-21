#!/usr/bin/env bun
async function call(body: any) {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const text = await new Response(proc.stdout).text();
  return JSON.parse(text);
}
const rel = await call({ method: "GET", path: "/data_object_relationships?select=relationship_kind,relationship_type,owner_side&limit=5000" });
console.log("relationship_kind:", [...new Set(rel.map((r: any) => r.relationship_kind))]);
console.log("relationship_type:", [...new Set(rel.map((r: any) => r.relationship_type))]);
console.log("owner_side:", [...new Set(rel.map((r: any) => r.owner_side))]);
const al = await call({ method: "GET", path: "/data_object_aliases?select=alias_type&limit=5000" });
console.log("alias_type:", [...new Set(al.map((r: any) => r.alias_type))]);
const ev = await call({ method: "GET", path: "/trigger_events?select=event_category&limit=5000" });
console.log("event_category:", [...new Set(ev.map((r: any) => r.event_category))]);
