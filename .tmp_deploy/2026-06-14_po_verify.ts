#!/usr/bin/env bun
async function call(body: Record<string, unknown>): Promise<any[]> {
  const p = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  p.stdin.write(JSON.stringify(body)); await p.stdin.end();
  const out = await new Response(p.stdout).text(); await p.exited;
  return out.trim() ? JSON.parse(out) : [];
}
const get = (path: string) => call({ method: "GET", path });

const DM = 179, EXEC = 364, CASE = 365;
const masterIds = [1130, 1131, 1132, 1133, 1134, 1135, 1136, 1137, 1138, 1139];

// ---- NOTES sweep across every table touched ----
let notesViolations: string[] = [];
async function notesCheck(path: string, label: string) {
  const rows = await get(path);
  const bad = rows.filter((r: any) => r.notes && r.notes !== "");
  if (bad.length) notesViolations.push(`${label}: ${bad.length} non-empty notes`);
}
await notesCheck(`/data_objects?id=in.(${masterIds})&select=data_object_name,notes`, "data_objects");
await notesCheck(`/domain_module_data_objects?domain_module_id=in.(${EXEC},${CASE})&select=id,notes`, "domain_module_data_objects");
await notesCheck(`/data_object_relationships?data_object_id=in.(${masterIds})&select=id,notes`, "rel(src)");
await notesCheck(`/data_object_relationships?related_data_object_id=in.(${masterIds})&select=id,notes`, "rel(dst)");
await notesCheck(`/data_object_aliases?data_object_id=in.(${masterIds})&select=id,notes`, "aliases");
await notesCheck(`/data_object_lifecycle_states?data_object_id=in.(${masterIds})&select=id,notes`, "lifecycle");
await notesCheck(`/handoffs?source_domain_id=eq.${DM}&select=id,notes`, "handoffs");
await notesCheck(`/domain_module_tools?domain_module_id=in.(${EXEC},${CASE})&select=id,notes`, "domain_module_tools");
await notesCheck(`/role_modules?domain_module_id=in.(${EXEC},${CASE})&select=id,notes`, "role_modules");
await notesCheck(`/solution_domains?domain_id=eq.${DM}&select=id,notes`, "solution_domains");
await notesCheck(`/capability_domains?domain_id=eq.${DM}&select=id,notes`, "capability_domains");
await notesCheck(`/business_function_domains?domain_id=eq.${DM}&select=id,notes`, "business_function_domains");
const newVendors = await get(`/vendors?vendor_name=in.(Camunda,Temporal%20Technologies,Orkes,Flowable)&select=vendor_name,notes`);
if (newVendors.some((v: any) => v.notes !== "")) notesViolations.push("vendors: non-empty notes");
const newSols = await get(`/solutions?solution_name=in.(Camunda%208,Temporal,Orkes%20Conductor,Flowable%20Platform)&select=solution_name,notes`);
if (newSols.some((s: any) => s.notes !== "")) notesViolations.push("solutions: non-empty notes");

console.log("NOTES violations:", notesViolations.length ? notesViolations : "NONE");

// ---- record_status sweep ----
let statusViolations: string[] = [];
async function statusCheck(path: string, label: string) {
  const rows = await get(path);
  const bad = rows.filter((r: any) => r.record_status && r.record_status !== "new");
  if (bad.length) statusViolations.push(`${label}: ${bad.length} non-new`);
}
await statusCheck(`/data_objects?id=in.(${masterIds})&select=record_status`, "data_objects");
await statusCheck(`/data_object_lifecycle_states?data_object_id=in.(${masterIds})&select=record_status`, "lifecycle");
await statusCheck(`/trigger_events?data_object_id=in.(${masterIds})&select=record_status`, "trigger_events");
await statusCheck(`/handoffs?source_domain_id=eq.${DM}&select=record_status`, "handoffs");
await statusCheck(`/domain_module_tools?domain_module_id=in.(${EXEC},${CASE})&select=record_status`, "domain_module_tools");
await statusCheck(`/tools?tool_name=like.*process*&select=record_status`, "tools(process*)");
await statusCheck(`/skills?domain_id=eq.${DM}&select=record_status`, "skills");
await statusCheck(`/domain_roles?role_code=in.(PROCESS-ARCHITECT,PROCESS-OPERATOR,CASE-WORKER)&select=record_status`, "domain_roles");
console.log("STATUS violations:", statusViolations.length ? statusViolations : "NONE");

// ---- counts summary ----
const counts: Record<string, number> = {};
counts.capabilities = (await get(`/capability_domains?domain_id=eq.${DM}&select=id`)).length;
counts.modules = (await get(`/domain_modules?domain_id=eq.${DM}&select=id`)).length;
counts.dmcaps = (await get(`/domain_module_capabilities?domain_module_id=in.(${EXEC},${CASE})&select=id`)).length;
counts.solution_domains = (await get(`/solution_domains?domain_id=eq.${DM}&select=id`)).length;
counts.masters = masterIds.length;
counts.dmdo = (await get(`/domain_module_data_objects?domain_module_id=in.(${EXEC},${CASE})&select=id`)).length;
counts.relationships = (await get(`/data_object_relationships?or=(data_object_id.in.(${masterIds}),related_data_object_id.in.(${masterIds}))&select=id`)).length;
counts.aliases = (await get(`/data_object_aliases?data_object_id=in.(${masterIds})&select=id`)).length;
counts.lifecycle = (await get(`/data_object_lifecycle_states?data_object_id=in.(${masterIds})&select=id`)).length;
counts.trigger_events = (await get(`/trigger_events?data_object_id=in.(${masterIds})&select=id`)).length;
counts.handoffs = (await get(`/handoffs?source_domain_id=eq.${DM}&select=id`)).length;
counts.bfd = (await get(`/business_function_domains?domain_id=eq.${DM}&select=id`)).length;
counts.skills = (await get(`/skills?domain_id=eq.${DM}&select=id`)).length;
counts.domain_module_tools = (await get(`/domain_module_tools?domain_module_id=in.(${EXEC},${CASE})&select=id`)).length;
counts.domain_roles = (await get(`/domain_roles?role_code=in.(PROCESS-ARCHITECT,PROCESS-OPERATOR,CASE-WORKER)&select=id`)).length;
counts.role_modules = (await get(`/role_modules?domain_module_id=in.(${EXEC},${CASE})&select=id`)).length;
counts.vendors_new = newVendors.length;
counts.solutions_new = newSols.length;
console.log("COUNTS:", JSON.stringify(counts, null, 2));

// M2: >=3 caps need >=2 modules. M6: every module realizes >=1 cap.
console.log("M2 pass:", counts.capabilities >= 3 ? counts.modules >= 2 : true);
// strict_score: all required tools platform-covered?
const allTools = await get(`/domain_module_tools?domain_module_id=in.(${EXEC},${CASE})&select=tools(tool_name,coverage_tier)`);
const nonPlatform = allTools.filter((t: any) => t.tools && t.tools.coverage_tier !== "platform").map((t: any) => t.tools.tool_name);
console.log("non-platform tools (expected: notify_*):", nonPlatform.length ? nonPlatform : "NONE");
