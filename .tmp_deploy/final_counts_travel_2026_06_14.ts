type Row = Record<string, unknown>;
async function get(path: string): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify({ method: "GET", path }));
  await proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out.trim() ? JSON.parse(out.trim()) : [];
}
const D = 172, mods = "346,347,348,349";
const masters = "1057,1058,1059,1060,1061,1062,1063,1064,1065";
const roleCodes = "BUSINESS-OPERATIONS-TRAVEL-MANAGER,BUSINESS-OPERATIONS-TRAVEL-ARRANGER,TRAVELER";
const c = async (p: string) => (await get(p)).length;
const out: Record<string, number> = {
  "capability_domains": await c(`/capability_domains?domain_id=eq.${D}&select=capability_id`),
  "domain_modules (full)": await c(`/domain_modules?domain_id=eq.${D}&select=id`),
  "domain_module_capabilities": await c(`/domain_module_capabilities?domain_module_id=in.(${mods})&select=capability_id`),
  "solution_domains": await c(`/solution_domains?domain_id=eq.${D}&select=solution_id`),
  "domain_regulations": await c(`/domain_regulations?domain_id=eq.${D}&select=regulation_id`),
  "domain_module_data_objects": await c(`/domain_module_data_objects?domain_module_id=in.(${mods})&select=data_object_id`),
  "data_object_relationships (touching masters+users+employees)": await c(`/data_object_relationships?or=(data_object_id.in.(${masters}),related_data_object_id.in.(${masters}))&select=id`),
  "data_object_aliases": await c(`/data_object_aliases?data_object_id=in.(${masters})&select=alias_name`),
  "data_object_lifecycle_states": await c(`/data_object_lifecycle_states?data_object_id=in.(${masters})&select=state_name`),
  "trigger_events": await c(`/trigger_events?data_object_id=in.(${masters})&select=id`),
  "handoffs (touching domain)": await c(`/handoffs?or=(source_domain_id.eq.${D},target_domain_id.eq.${D})&select=id`),
  "business_function_domains": await c(`/business_function_domains?domain_id=eq.${D}&select=business_function_id`),
  "skills (system)": await c(`/skills?domain_id=eq.${D}&skill_type=eq.system&domain_module_id=is.null&select=id`),
  "domain_module_tools": await c(`/domain_module_tools?domain_module_id=in.(${mods})&select=tool_id`),
  "domain_roles": await c(`/domain_roles?role_code=in.(${roleCodes})&select=id`),
  "role_modules": await c(`/role_modules?role_id=in.(${(await get(`/domain_roles?role_code=in.(${roleCodes})&select=id`)).map((r:any)=>r.id).join(",")})&select=role_id`),
};
console.log(JSON.stringify(out, null, 2));
