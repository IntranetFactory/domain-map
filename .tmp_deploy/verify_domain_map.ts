// Stage 5 verification: domain_map module
export {};

async function call(tool: string, payload: unknown, single = false): Promise<any> {
  const args = ["semantius"];
  if (single) args.push("--single");
  args.push("call", "crud", tool);
  const proc = Bun.spawn(args, {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${tool} (exit ${code}): ${stderr}`);
  return JSON.parse(stdout);
}

const SLUG = "domain_map";
const ENTITIES = [
  "industries","business_functions","domains","capabilities","data_objects",
  "vendors","solutions","jurisdictions","regulations",
  "data_object_aliases","data_object_relationships",
  "industry_business_functions","business_function_domains","business_function_capabilities",
  "domain_data_objects","capability_domains","solution_domains","solution_data_objects",
  "solution_capabilities","domain_regulations",
];
const EXPECTED_FIELD_COUNTS: Record<string, number> = {
  // total fields including auto (id, label_column, created_at, updated_at)
  industries: 9, business_functions: 8, domains: 9, capabilities: 9,
  data_objects: 7, vendors: 9, solutions: 11, jurisdictions: 10, regulations: 12,
  data_object_aliases: 11, data_object_relationships: 13,
  industry_business_functions: 8, business_function_domains: 9,
  business_function_capabilities: 9, domain_data_objects: 9, capability_domains: 8,
  solution_domains: 9, solution_data_objects: 9, solution_capabilities: 9,
  domain_regulations: 10,
};
const HAS_COMPUTED = new Set([
  "data_object_relationships",
  "industry_business_functions","business_function_domains","business_function_capabilities",
  "domain_data_objects","capability_domains","solution_domains","solution_data_objects",
  "solution_capabilities","domain_regulations",
]);
const HAS_VALIDATION = new Set(["data_object_aliases"]);
const HAS_INPUT_TYPE_RULE: Record<string, string[]> = {
  data_object_aliases: ["industry_id", "solution_id"],
};

const issues: string[] = [];

console.log("=== Verification report ===\n");

// 1. Module
const mod = await call("read_module", { filters: `module_slug=eq.${SLUG}` }, true);
console.log("Modules:");
console.log(`  ${SLUG.padEnd(28)} module_type=${mod.module_type}  logo_color=${mod.logo_color}`);
console.log(`    view_permission=${mod.view_permission}`);
console.log(`    manage_permission_id=${mod.manage_permission_id}`);
console.log(`    default_viewer_role_id=${mod.default_viewer_role_id}  default_manager_role_id=${mod.default_manager_role_id}\n`);
if (mod.module_type !== "master") issues.push(`module_type is ${mod.module_type}, expected master`);
if (mod.view_permission !== `${SLUG}:read`) issues.push(`view_permission mismatch`);

// 2. Permissions
console.log("Permissions:");
const reads = await call("read_permission", { filters: `permission_name=eq.${SLUG}:read` }, true);
const mngs = await call("read_permission", { filters: `permission_name=eq.${SLUG}:manage` }, true);
console.log(`  ${reads.permission_name.padEnd(28)} module_id=${reads.module_id}  "${reads.description}"`);
console.log(`  ${mngs.permission_name.padEnd(28)} module_id=${mngs.module_id}  "${mngs.description}"`);
if (reads.module_id !== mod.id) issues.push(`${SLUG}:read.module_id != module.id`);
if (mngs.module_id !== mod.id) issues.push(`${SLUG}:manage.module_id != module.id`);

// 3. Hierarchy
const hier = await call("read_permission_hierarchy", {
  filters: `including_permission_id=eq.${mngs.id}&included_permission_id=eq.${reads.id}`,
}, true);
console.log(`\nHierarchy:\n  ${SLUG}:manage → ${SLUG}:read  origin=${hier.origin}`);
if (hier.origin !== "model_master") issues.push(`hierarchy origin=${hier.origin}, expected model_master`);

// 4. Roles
const viewer = await call("read_role", { filters: `slug=eq.${SLUG}_viewer` }, true);
const manager = await call("read_role", { filters: `slug=eq.${SLUG}_manager` }, true);
console.log(`\nRoles:\n  ${viewer.slug.padEnd(28)} origin=${viewer.origin}  module_id=${viewer.module_id}`);
console.log(`  ${manager.slug.padEnd(28)} origin=${manager.origin}  module_id=${manager.module_id}`);
const rpV = await call("read_role_permission", { filters: `role_id=eq.${viewer.id}&permission_id=eq.${reads.id}` });
const rpM = await call("read_role_permission", { filters: `role_id=eq.${manager.id}&permission_id=eq.${mngs.id}` });
if (rpV.length === 0) issues.push("viewer role missing :read role_permission");
if (rpM.length === 0) issues.push("manager role missing :manage role_permission");
console.log(`  ✓ role_permissions wired`);

// 5. Entities
const entRows: any[] = await call("read_entity", { filters: `module_id=eq.${mod.id}&select=table_name,singular_label,plural_label,label_column,description,module_type:module_id,computed_fields,validation_rules,view_permission,edit_permission` });
console.log(`\nEntities (${entRows.length}/${ENTITIES.length}):`);
const liveSet = new Set(entRows.map(r => r.table_name));
for (const t of ENTITIES) {
  if (!liveSet.has(t)) { issues.push(`entity ${t} missing`); continue; }
}
for (const r of entRows) {
  const issuesThis: string[] = [];
  if (r.view_permission !== `${SLUG}:read`) issuesThis.push("view_permission");
  if (r.edit_permission !== `${SLUG}:manage`) issuesThis.push("edit_permission");
  if (!r.description) issuesThis.push("description empty");
  if (HAS_COMPUTED.has(r.table_name) && (!Array.isArray(r.computed_fields) || r.computed_fields.length === 0)) issuesThis.push("computed_fields missing");
  if (HAS_VALIDATION.has(r.table_name) && (!Array.isArray(r.validation_rules) || r.validation_rules.length === 0)) issuesThis.push("validation_rules missing");
  const ok = issuesThis.length === 0;
  console.log(`  ${ok ? "✓" : "✗"} ${r.table_name.padEnd(33)} ${issuesThis.length === 0 ? "ok" : issuesThis.join(",")}`);
  if (!ok) issues.push(`entity ${r.table_name}: ${issuesThis.join(",")}`);
}

// 6. Field counts per entity + label_column existence
const allFields: any[] = await call("read_field", {
  filters: `table_name=in.(${ENTITIES.join(",")})&select=table_name,field_name,title,format,reference_table,input_type_rule`,
});
const fieldsByTable: Record<string, any[]> = {};
for (const f of allFields) (fieldsByTable[f.table_name] ||= []).push(f);

console.log("\nField counts:");
for (const e of ENTITIES) {
  const arr = fieldsByTable[e] || [];
  const expected = EXPECTED_FIELD_COUNTS[e];
  const mark = arr.length === expected ? "✓" : "✗";
  console.log(`  ${mark} ${e.padEnd(33)} ${arr.length}/${expected}`);
  if (arr.length !== expected) issues.push(`field count ${e}: got ${arr.length}, expected ${expected}`);
}

// 7. label_column titles
const expectedTitles: Record<string, [string, string]> = {
  industries: ["industry_name", "Industry Name"],
  business_functions: ["business_function_name", "Function Name"],
  domains: ["domain_name", "Domain Name"],
  capabilities: ["capability_name", "Capability Name"],
  data_objects: ["data_object_name", "Data Object Name"],
  vendors: ["vendor_name", "Vendor Name"],
  solutions: ["solution_name", "Solution Name"],
  jurisdictions: ["jurisdiction_name", "Jurisdiction Name"],
  regulations: ["regulation_name", "Regulation Name"],
  data_object_aliases: ["alias_name", "Alias Name"],
  data_object_relationships: ["data_object_relationship_label", "Relationship"],
  industry_business_functions: ["industry_business_function_label", "Mapping"],
  business_function_domains: ["business_function_domain_label", "Mapping"],
  business_function_capabilities: ["business_function_capability_label", "Mapping"],
  domain_data_objects: ["domain_data_object_label", "Mapping"],
  capability_domains: ["capability_domain_label", "Mapping"],
  solution_domains: ["solution_domain_label", "Mapping"],
  solution_data_objects: ["solution_data_object_label", "Mapping"],
  solution_capabilities: ["solution_capability_label", "Mapping"],
  domain_regulations: ["domain_regulation_label", "Mapping"],
};
console.log("\nLabel-column titles:");
for (const [t, [fn, title]] of Object.entries(expectedTitles)) {
  const f = (fieldsByTable[t] || []).find(x => x.field_name === fn);
  if (!f) { issues.push(`${t}.${fn} missing`); continue; }
  const ok = f.title === title;
  console.log(`  ${ok ? "✓" : "✗"} ${t}.${fn}: "${f.title}"`);
  if (!ok) issues.push(`title mismatch ${t}.${fn}: got "${f.title}", expected "${title}"`);
}

// 8. FK targets resolve
console.log("\nFK reference targets:");
const allTableNames = new Set(ENTITIES);
let fkOk = 0, fkBad = 0;
for (const f of allFields) {
  if (!f.reference_table) continue;
  if (allTableNames.has(f.reference_table)) { fkOk++; }
  else { issues.push(`FK ${f.table_name}.${f.field_name} → ${f.reference_table} not in catalog`); fkBad++; }
}
console.log(`  ✓ ${fkOk} FKs resolved, ${fkBad} unresolved`);

// 9. input_type_rule round-trip
console.log("\ninput_type_rule:");
for (const [t, fns] of Object.entries(HAS_INPUT_TYPE_RULE)) {
  for (const fn of fns) {
    const f = (fieldsByTable[t] || []).find(x => x.field_name === fn);
    if (!f) { issues.push(`${t}.${fn} missing`); continue; }
    const itr = f.input_type_rule;
    const ok = itr && typeof itr === "object" && Object.keys(itr).length > 0;
    console.log(`  ${ok ? "✓" : "✗"} ${t}.${fn}: ${JSON.stringify(itr)?.slice(0, 80)}`);
    if (!ok) issues.push(`${t}.${fn} input_type_rule empty`);
  }
}

// Summary
console.log(`\n${"=".repeat(40)}`);
if (issues.length === 0) {
  console.log("✓ Verification passed — no issues.");
} else {
  console.log(`✗ ${issues.length} issues:`);
  for (const i of issues) console.log(`  - ${i}`);
  process.exit(1);
}
