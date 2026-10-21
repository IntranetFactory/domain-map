// Read-only: dump the full existing catalog footprint for one domain to
// .tmp_deploy/<CODE>-existing.json, so a research subagent can ground itself
// in what already exists (and not duplicate data_objects / handoffs / solutions).
//
// Usage: bun run .tmp_deploy/dump_footprint.ts <DOMAIN_CODE>

const code = process.argv[2];
if (!code) throw new Error("usage: dump_footprint.ts <DOMAIN_CODE>");

async function get(path: string): Promise<any> {
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify({ method: "GET", path })],
    { stdout: "pipe", stderr: "pipe" },
  );
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  const t = out.trim();
  const s = t.search(/[\[{]/);
  return JSON.parse(s >= 0 ? t.slice(s) : t || "[]");
}

const [domain] = await get(`/domains?domain_code=eq.${code}&select=*`);
if (!domain) throw new Error(`domain ${code} not found`);
const id = domain.id;

const capabilities = await get(
  `/capability_domains?domain_id=eq.${id}&select=capabilities(capability_code,capability_name,description)`,
);
const solutions = await get(
  `/solution_domains?domain_id=eq.${id}&select=coverage_level,solutions(solution_name,vendor_id,vendors(vendor_name))`,
);
const modules = await get(
  `/domain_modules?domain_id=eq.${id}&select=domain_module_code,domain_module_name,module_kind,description`,
);
// data objects mastered/touched by this domain (domain-level rollup)
const ddo = await get(
  `/domain_data_objects?domain_id=eq.${id}&select=role,necessity,data_objects(id,data_object_name,singular_label,entity_type,has_personal_content,has_submit_lock,has_single_approver)`,
);
const masterIds = ddo.filter((r: any) => r.role === "master" && r.data_objects).map((r: any) => r.data_objects.id);
const lifecycle = masterIds.length
  ? await get(`/data_object_lifecycle_states?data_object_id=in.(${masterIds.join(",")})&select=data_object_id,state_name,state_order,is_initial,is_terminal,requires_permission&order=data_object_id.asc,state_order.asc`)
  : [];
const outHandoffs = await get(
  `/handoffs?source_domain_id=eq.${id}&select=trigger_event:trigger_events(event_name),target_domain:domains!handoffs_target_domain_id_fkey(domain_code),data_object:data_objects!handoffs_data_object_id_fkey(data_object_name),integration_pattern,friction_level`,
);
const inHandoffs = await get(
  `/handoffs?target_domain_id=eq.${id}&select=trigger_event:trigger_events(event_name),source_domain:domains!handoffs_source_domain_id_fkey(domain_code),data_object:data_objects!handoffs_data_object_id_fkey(data_object_name),integration_pattern,friction_level`,
);
const triggerEvents = masterIds.length
  ? await get(`/trigger_events?data_object_id=in.(${masterIds.join(",")})&select=event_name,description,from_state,to_state,event_category`)
  : [];
const skills = await get(`/skills?domain_id=eq.${id}&select=skill_name,skill_type,domain_module_id`);
const bfd = await get(
  `/business_function_domains?domain_id=eq.${id}&select=responsibility_type,business_functions(business_function_name)`,
);

const payload = {
  domain,
  capabilities,
  solutions,
  modules,
  data_objects: ddo,
  lifecycle_states: lifecycle,
  trigger_events: triggerEvents,
  outbound_handoffs: outHandoffs,
  inbound_handoffs: inHandoffs,
  skills,
  business_function_domains: bfd,
};

const path = `c:/dev/domain-map/.tmp_deploy/${code}-existing.json`;
await Bun.write(path, JSON.stringify(payload, null, 2));
console.log(
  `${code} (id=${id}) -> ${path}  | caps=${capabilities.length} sols=${solutions.length} mods=${modules.length} masters=${masterIds.length} out=${outHandoffs.length} in=${inHandoffs.length} skills=${skills.length} bfd=${bfd.length}`,
);
