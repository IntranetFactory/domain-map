type Row = Record<string, unknown>;
async function get(path: string): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify({ method: "GET", path }));
  await proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out.trim() ? JSON.parse(out.trim()) : [];
}
const mods = "346,347,348,349";

// F4 invariant
const dmt = await get(`/domain_module_tools?domain_module_id=in.(${mods})&select=tools(tool_name,operation_kind,data_object_id,coverage_tier)`);
const seen = new Map<string, Row>();
for (const r of dmt) { const t = (r as any).tools; if (t) seen.set(t.tool_name, t); }
let bad = 0;
for (const t of seen.values()) {
  const ok = (t.operation_kind === "query" || t.operation_kind === "mutate") ? t.data_object_id != null
    : (t.operation_kind === "fetch" || t.operation_kind === "side_effect" || t.operation_kind === "compute") ? t.data_object_id == null
    : true;
  if (!ok) { bad++; console.log("F4 BAD:", t.tool_name, t.operation_kind, t.data_object_id); }
}
console.log("F4: distinct tools", seen.size, "violations", bad);

// F5 score
let plat = 0, integ = 0; const total = seen.size;
for (const t of seen.values()) { if (t.coverage_tier === "platform") plat++; if (t.coverage_tier === "platform" || t.coverage_tier === "integration") integ++; }
console.log(`F5: strict ${plat}/${total} = ${(plat/total).toFixed(2)}, operational ${integ}/${total} = ${(integ/total).toFixed(2)}`);

// Single-master catalog-wide for travel masters
const masters = "1057,1058,1059,1060,1061,1062,1063,1064,1065";
const mrows = await get(`/domain_module_data_objects?data_object_id=in.(${masters})&role=eq.master&select=data_object_id,domain_modules(domain_module_code)`);
const cnt = new Map<number, number>();
for (const r of mrows) cnt.set((r as any).data_object_id, (cnt.get((r as any).data_object_id) || 0) + 1);
const multi = [...cnt.entries()].filter(([, c]) => c > 1);
console.log("M7 single-master: multi-master rows among travel masters:", multi.length ? JSON.stringify(multi) : "none");

// B12 lifecycle on operational_workflow masters
const wf = await get(`/data_objects?id=in.(${masters})&entity_type=eq.operational_workflow&select=id,data_object_name`);
for (const w of wf) {
  const states = await get(`/data_object_lifecycle_states?data_object_id=eq.${(w as any).id}&select=state_name,is_initial,is_terminal`);
  const init = states.filter((s: any) => s.is_initial).length;
  const term = states.filter((s: any) => s.is_terminal).length;
  console.log(`B12 ${(w as any).data_object_name}: ${states.length} states, ${init} initial, ${term} terminal`);
}

// E2 2-module floor
const roles = await get(`/domain_roles?role_code=in.(BUSINESS-OPERATIONS-TRAVEL-MANAGER,BUSINESS-OPERATIONS-TRAVEL-ARRANGER,TRAVELER)&select=id,role_code`);
for (const r of roles) {
  const rm = await get(`/role_modules?role_id=eq.${(r as any).id}&select=domain_module_id,interaction_level`);
  console.log(`E2 ${(r as any).role_code}: ${rm.length} role_modules`);
}
