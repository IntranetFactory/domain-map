#!/usr/bin/env bun
// Read-only completeness-checklist verification for MARINA-MGMT (domain 183).
type Row = Record<string, any>;
async function get(path: string): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify({ method: "GET", path })); await proc.stdin.end();
  const out = await new Response(proc.stdout).text(); await proc.exited;
  return out.trim() ? JSON.parse(out) : [];
}
const D = 183;
const MODS = [374, 375, 376, 377, 378, 379];
const main = async () => {
  const masters = await get(`/domain_module_data_objects?domain_module_id=in.(${MODS.join(",")})&role=eq.master&select=data_object_id`);
  const mids = [...new Set(masters.map(r => r.data_object_id))];
  const objs = await get(`/data_objects?id=in.(${mids.join(",")})&select=id,data_object_name,entity_type,has_personal_content,has_submit_lock,has_single_approver,data_object_lifecycle_states(id)`);

  // A1 domain metadata
  const [dom] = await get(`/domains?id=eq.${D}&select=crud_percentage,business_logic,min_org_size,cost_band,usa_market_size_usd_m,market_size_source_year,catalog_tagline,catalog_description`);
  const a1 = dom.crud_percentage > 0 && dom.min_org_size && dom.cost_band && dom.usa_market_size_usd_m > 0 && dom.market_size_source_year > 0 && (dom.business_logic || dom.crud_percentage >= 95);
  const a4 = !!(dom.catalog_tagline && dom.catalog_description);

  // M8 module catalog copy
  const modRows = await get(`/domain_modules?domain_id=eq.${D}&select=domain_module_code,catalog_tagline,catalog_description`);
  const m8 = modRows.every(m => m.catalog_tagline && m.catalog_description);

  // M4/M6 capability<->module bipartite
  const capDom = await get(`/capability_domains?domain_id=eq.${D}&select=capability_id`);
  const dmc = await get(`/domain_module_capabilities?domain_module_id=in.(${MODS.join(",")})&select=domain_module_id,capability_id`);
  const realizedCaps = new Set(dmc.map(r => r.capability_id));
  const m4 = capDom.every(c => realizedCaps.has(c.capability_id)); // every cap realized
  const m6 = MODS.every(mid => dmc.some(r => r.domain_module_id === mid)); // every module realizes a cap

  // B12 workflow masters missing lifecycle / B13 unclassified
  const wf = objs.filter(o => o.entity_type === "operational_workflow");
  const b12bad = wf.filter(o => (o.data_object_lifecycle_states ?? []).length === 0).map(o => o.data_object_name);
  const b13bad = objs.filter(o => o.entity_type === "unclassified").map(o => o.data_object_name);
  // B15 pattern flag on catalog/junction/computed
  const b15bad = objs.filter(o => ["catalog", "junction", "computed"].includes(o.entity_type) && (o.has_personal_content || o.has_submit_lock || o.has_single_approver)).map(o => o.data_object_name);

  // E2 persona reach >=2
  const roles = await get(`/domain_roles?role_code=like.MARINA-*&select=id,role_code`);
  const rm = await get(`/role_modules?role_id=in.(${roles.map(r => r.id).join(",")})&select=role_id`);
  const reachCount: Record<number, number> = {};
  for (const r of rm) reachCount[r.role_id] = (reachCount[r.role_id] ?? 0) + 1;
  const e2bad = roles.filter(r => (reachCount[r.id] ?? 0) < 2).map(r => r.role_code);

  // F4 tool invariant + coverage (Semantius score)
  const dmt = await get(`/domain_module_tools?domain_module_id=in.(${MODS.join(",")})&select=tool_id,tools(tool_name,operation_kind,data_object_id,coverage_tier)`);
  const toolById = new Map<number, Row>();
  for (const r of dmt) toolById.set(r.tool_id, r.tools);
  const tools = [...toolById.values()];
  const f4bad = tools.filter(t => {
    if (["query", "mutate"].includes(t.operation_kind)) return t.data_object_id == null;
    if (["side_effect", "compute", "fetch"].includes(t.operation_kind)) return t.data_object_id != null;
    return false;
  }).map(t => `${t.tool_name}(${t.operation_kind})`);
  const total = tools.length;
  const platform = tools.filter(t => t.coverage_tier === "platform").length;
  const integ = tools.filter(t => ["platform", "integration"].includes(t.coverage_tier)).length;
  const strict = (platform / total).toFixed(2);
  const oper = (integ / total).toFixed(2);
  const nonPlat = tools.filter(t => t.coverage_tier !== "platform").map(t => `${t.tool_name}(${t.coverage_tier})`);

  const P = (b: boolean) => (b ? "PASS" : "FAIL");
  console.log(`A1 domain metadata:      ${P(a1)}`);
  console.log(`A4 domain catalog copy:  ${P(a4)}`);
  console.log(`M8 module catalog copy:  ${P(m8)}`);
  console.log(`M4 every cap realized:   ${P(m4)}  (caps=${capDom.length})`);
  console.log(`M6 every module->cap:    ${P(m6)}`);
  console.log(`B12 wf masters w/ lifecycle: ${P(b12bad.length === 0)}  ${b12bad.join(",")}`);
  console.log(`B13 no unclassified:     ${P(b13bad.length === 0)}  ${b13bad.join(",")}`);
  console.log(`B15 no bad pattern flags:${P(b15bad.length === 0)}  ${b15bad.join(",")}`);
  console.log(`E2 persona reach >=2:    ${P(e2bad.length === 0)}  ${e2bad.join(",")}`);
  console.log(`F4 tool invariant:       ${P(f4bad.length === 0)}  ${f4bad.join(",")}`);
  console.log(`masters=${mids.length} wf=${wf.length} tools=${total}`);
  console.log(`Semantius score: strict=${strict} operational=${oper}  non-platform tools: ${nonPlat.join(", ") || "(none)"}`);
};
await main();
