async function call(body: Record<string, unknown>): Promise<any[]> {
  const p = Bun.spawn(["semantius","call","crud","postgrestRequest"],{stdin:"pipe",stdout:"pipe",stderr:"pipe"});
  p.stdin.write(JSON.stringify(body)); await p.stdin.end();
  const out = await new Response(p.stdout).text(); await p.exited; return out.trim()?JSON.parse(out):[];
}
const g = (p:string)=>call({method:"GET",path:p});
const EM="—";
const DM=179,EXEC=364,CASE=365,SK=466;
const mIds=[1130,1131,1132,1133,1134,1135,1136,1137,1138,1139];
let hits:string[]=[];
function scan(label:string,rows:any[],fields:string[]){for(const r of rows)for(const f of fields)if(typeof r[f]==="string"&&r[f].includes(EM))hits.push(`${label}.${f}: ${r[f].slice(0,60)}`);}
scan("domains",await g(`/domains?id=eq.${DM}&select=description,business_logic,catalog_tagline,catalog_description`),["description","business_logic","catalog_tagline","catalog_description"]);
scan("modules",await g(`/domain_modules?domain_id=eq.${DM}&select=description,catalog_tagline,catalog_description`),["description","catalog_tagline","catalog_description"]);
scan("capabilities",await g(`/capability_domains?domain_id=eq.${DM}&select=capabilities(capability_name,description)`).then(r=>r.map((x:any)=>x.capabilities)),["capability_name","description"]);
scan("data_objects",await g(`/data_objects?id=in.(${mIds})&select=description,singular_label,plural_label`),["description","singular_label","plural_label"]);
scan("lifecycle",await g(`/data_object_lifecycle_states?data_object_id=in.(${mIds})&select=description`),["description"]);
scan("trigger_events",await g(`/trigger_events?data_object_id=in.(${mIds})&select=description`),["description"]);
scan("handoffs",await g(`/handoffs?source_domain_id=eq.${DM}&select=description`),["description"]);
scan("aliases",await g(`/data_object_aliases?data_object_id=in.(${mIds})&select=alias_name`),["alias_name"]);
scan("rels",await g(`/data_object_relationships?data_object_id=in.(${mIds})&select=relationship_verb,inverse_verb`),["relationship_verb","inverse_verb"]);
scan("vendors",await g(`/vendors?vendor_name=in.(Camunda,Temporal%20Technologies,Orkes,Flowable)&select=description`),["description"]);
scan("solutions",await g(`/solutions?solution_name=in.(Camunda%208,Temporal,Orkes%20Conductor,Flowable%20Platform)&select=description`),["description"]);
scan("skills",await g(`/skills?domain_id=eq.${DM}&select=description`),["description"]);
scan("tools",await g(`/domain_module_tools?domain_module_id=in.(${EXEC},${CASE})&select=tools(tool_name,description)`).then(r=>r.map((x:any)=>x.tools)),["tool_name","description"]);
scan("roles",await g(`/domain_roles?role_code=in.(PROCESS-ARCHITECT,PROCESS-OPERATOR,CASE-WORKER)&select=role_name,description`),["role_name","description"]);
console.log("EM-DASH in loaded DB content:", hits.length?hits:"NONE");
