#!/usr/bin/env bun
// B1A-SYSTEM-SKILLS — author 2 module-anchored system skills for LCAP, rename the 5 legacy
// extend_* tools to lcap_* shape, add mutate + workflow-gate tools to clear the Rule #17 floor,
// reassign skill_tools to the new per-module skills, then DELETE the legacy domain-level skill 79.
//
// Module shape:
//   265 LCAP-VISUAL-COMPOSITION masters lcap_apps(220), lcap_pages(715),
//       lcap_business_objects(221), lcap_data_sources(716)
//   266 LCAP-RUNTIME-LIFECYCLE  masters lcap_workflows(222)
//
// Tools (all CRUD query/mutate carry data_object_id + coverage_tier='platform'; notify_person is
// the reusable abstraction at id 913). Workflow-gate tools are mutate ops firing the gated lifecycle
// transitions authored in B1A-LIFECYCLE-STATES (publish/deprecate/retire/activate).
//
// Rule compliance: record_status omitted on inserts (DB default 'new', Rule #1). No notes column
// written on skill_tools (Rule #15). Every tool deduped by tool_name (tools table is catalog-wide,
// Rule #9 scope). Generic notify_person reused (id 913), not recreated.
//
// Run from project root: bun run c:/dev/domain-map/.tmp_deploy/lcap_b1a_system_skills_2026_06_06.ts

export {};

async function postgrest(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path}: ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

const NOTIFY_PERSON = 913;

// ---------------------------------------------------------------------------
// Step 1: rename the 5 legacy extend_* tools -> lcap_* shape + clean descriptions.
// ---------------------------------------------------------------------------
const RENAMES: { id: number; name: string; desc: string }[] = [
  { id: 564, name: "query_lcap_apps", desc: "Query / list / get low-code app records." },
  { id: 565, name: "query_lcap_business_objects", desc: "Query / list / get low-code business object records." },
  { id: 566, name: "query_lcap_workflows", desc: "Query / list / get low-code workflow records." },
  { id: 822, name: "query_lcap_pages", desc: "Query / list / get low-code page records." },
  { id: 823, name: "query_lcap_data_sources", desc: "Query / list / get low-code data source records." },
];
console.log("Step 1: rename legacy extend_* tools");
for (const r of RENAMES) {
  const cur: any[] = await postgrest("GET", `/tools?id=eq.${r.id}&select=id,tool_name`);
  if (cur.length === 0) { console.log(`  tool ${r.id} missing — skip`); continue; }
  if (cur[0].tool_name === r.name) { console.log(`  tool ${r.id} already ${r.name} — skip`); continue; }
  await postgrest("PATCH", `/tools?id=eq.${r.id}`, { tool_name: r.name, description: r.desc });
  console.log(`  ${cur[0].tool_name} -> ${r.name}`);
}

// ---------------------------------------------------------------------------
// Step 2: upsert new mutate + workflow-gate tools (deduped by tool_name).
// ---------------------------------------------------------------------------
type ToolDef = { tool_name: string; operation_kind: "query" | "mutate"; data_object_id: number; description: string };
const NEW_TOOLS: ToolDef[] = [
  // CRUD mutates — module 265 entities
  { tool_name: "create_lcap_app", operation_kind: "mutate", data_object_id: 220, description: "Create a low-code app record." },
  { tool_name: "update_lcap_app", operation_kind: "mutate", data_object_id: 220, description: "Update a low-code app record." },
  { tool_name: "create_lcap_page", operation_kind: "mutate", data_object_id: 715, description: "Create a low-code page record." },
  { tool_name: "update_lcap_page", operation_kind: "mutate", data_object_id: 715, description: "Update a low-code page record." },
  { tool_name: "create_lcap_business_object", operation_kind: "mutate", data_object_id: 221, description: "Create a low-code business object record." },
  { tool_name: "update_lcap_business_object", operation_kind: "mutate", data_object_id: 221, description: "Update a low-code business object record." },
  { tool_name: "create_lcap_data_source", operation_kind: "mutate", data_object_id: 716, description: "Create a low-code data source record." },
  { tool_name: "update_lcap_data_source", operation_kind: "mutate", data_object_id: 716, description: "Update a low-code data source record." },
  // workflow-gate mutates — module 265
  { tool_name: "publish_lcap_app", operation_kind: "mutate", data_object_id: 220, description: "Transition a low-code app into the published state (publish gate)." },
  { tool_name: "publish_lcap_page", operation_kind: "mutate", data_object_id: 715, description: "Transition a low-code page into the published state (publish gate)." },
  { tool_name: "publish_lcap_business_object", operation_kind: "mutate", data_object_id: 221, description: "Transition a low-code business object into the published state (publish gate)." },
  { tool_name: "activate_lcap_data_source", operation_kind: "mutate", data_object_id: 716, description: "Transition a low-code data source into the active state (activation gate)." },
  // CRUD + gate mutates — module 266 entity (lcap_workflows)
  { tool_name: "create_lcap_workflow", operation_kind: "mutate", data_object_id: 222, description: "Create a low-code workflow record." },
  { tool_name: "update_lcap_workflow", operation_kind: "mutate", data_object_id: 222, description: "Update a low-code workflow record." },
  { tool_name: "publish_lcap_workflow", operation_kind: "mutate", data_object_id: 222, description: "Transition a low-code workflow into the published state (publish gate)." },
  { tool_name: "deprecate_lcap_workflow", operation_kind: "mutate", data_object_id: 222, description: "Transition a low-code workflow into the deprecated state (deprecation gate)." },
  { tool_name: "retire_lcap_workflow", operation_kind: "mutate", data_object_id: 222, description: "Transition a low-code workflow into the retired state (retirement gate)." },
];

console.log("\nStep 2: upsert new tools");
const toolIdByName = new Map<string, number>();
// seed with renamed query tools
for (const r of RENAMES) toolIdByName.set(r.name, r.id);
toolIdByName.set("notify_person", NOTIFY_PERSON);

for (const t of NEW_TOOLS) {
  const existing: any[] = await postgrest("GET", `/tools?tool_name=eq.${t.tool_name}&select=id,tool_name`);
  if (existing.length > 0) {
    toolIdByName.set(t.tool_name, existing[0].id);
    console.log(`  exists: ${t.tool_name} (id ${existing[0].id})`);
    continue;
  }
  const res = await postgrest("POST", "/tools", {
    tool_name: t.tool_name,
    operation_kind: t.operation_kind,
    data_object_id: t.data_object_id,
    coverage_tier: "platform",
    description: t.description,
  });
  const id = Array.isArray(res) ? res[0].id : res.id;
  toolIdByName.set(t.tool_name, id);
  console.log(`  created: ${t.tool_name} (id ${id})`);
}

// ---------------------------------------------------------------------------
// Step 3: upsert the 2 system skills (one per module).
// ---------------------------------------------------------------------------
console.log("\nStep 3: upsert system skills");
const SKILLS: { module: number; name: string; desc: string }[] = [
  { module: 265, name: "lcap_visual_composition_agent", desc: "System agent for the LCAP Visual Composition and Data Modeling module: authors and publishes low-code apps, pages, business objects, and data source bindings." },
  { module: 266, name: "lcap_runtime_lifecycle_agent", desc: "System agent for the LCAP Runtime and Application Lifecycle module: manages low-code workflow definitions through their publish, deprecate, and retire lifecycle." },
];
const skillIdByModule = new Map<number, number>();
for (const s of SKILLS) {
  const existing: any[] = await postgrest(
    "GET",
    `/skills?domain_module_id=eq.${s.module}&skill_type=eq.system&select=id,skill_name`,
  );
  if (existing.length > 0) {
    skillIdByModule.set(s.module, existing[0].id);
    console.log(`  exists: system skill for module ${s.module} (id ${existing[0].id}, ${existing[0].skill_name})`);
    continue;
  }
  const res = await postgrest("POST", "/skills", {
    skill_name: s.name,
    skill_type: "system",
    domain_id: 37, // satisfies the legacy domain_required_when_skill_type_is_system constraint
    domain_module_id: s.module, // Rule #17 anchor
    description: s.desc,
  });
  const id = Array.isArray(res) ? res[0].id : res.id;
  skillIdByModule.set(s.module, id);
  console.log(`  created: ${s.name} (id ${id}) for module ${s.module}`);
}

// ---------------------------------------------------------------------------
// Step 4: build skill_tools links (deduped by skill_id+tool_id). notes NOT written (Rule #15).
// ---------------------------------------------------------------------------
console.log("\nStep 4: link skill_tools");
const skill265 = skillIdByModule.get(265)!;
const skill266 = skillIdByModule.get(266)!;

type Link = { skill: number; tool: string; req: "required" | "optional" };
const LINKS: Link[] = [
  // ---- module 265 skill ----
  { skill: skill265, tool: "query_lcap_apps", req: "required" },
  { skill: skill265, tool: "query_lcap_pages", req: "required" },
  { skill: skill265, tool: "query_lcap_business_objects", req: "required" },
  { skill: skill265, tool: "query_lcap_data_sources", req: "required" },
  { skill: skill265, tool: "create_lcap_app", req: "required" },
  { skill: skill265, tool: "update_lcap_app", req: "required" },
  { skill: skill265, tool: "create_lcap_page", req: "required" },
  { skill: skill265, tool: "update_lcap_page", req: "required" },
  { skill: skill265, tool: "create_lcap_business_object", req: "required" },
  { skill: skill265, tool: "update_lcap_business_object", req: "required" },
  { skill: skill265, tool: "create_lcap_data_source", req: "optional" },
  { skill: skill265, tool: "update_lcap_data_source", req: "optional" },
  { skill: skill265, tool: "publish_lcap_app", req: "required" },
  { skill: skill265, tool: "publish_lcap_page", req: "optional" },
  { skill: skill265, tool: "publish_lcap_business_object", req: "optional" },
  { skill: skill265, tool: "activate_lcap_data_source", req: "optional" },
  { skill: skill265, tool: "notify_person", req: "optional" },
  // ---- module 266 skill ----
  { skill: skill266, tool: "query_lcap_workflows", req: "required" },
  { skill: skill266, tool: "create_lcap_workflow", req: "required" },
  { skill: skill266, tool: "update_lcap_workflow", req: "required" },
  { skill: skill266, tool: "publish_lcap_workflow", req: "required" },
  { skill: skill266, tool: "deprecate_lcap_workflow", req: "optional" },
  { skill: skill266, tool: "retire_lcap_workflow", req: "optional" },
  { skill: skill266, tool: "notify_person", req: "optional" },
];

// existing links to dedup
const existingLinks: any[] = await postgrest(
  "GET",
  `/skill_tools?skill_id=in.(${skill265},${skill266})&select=skill_id,tool_id`,
);
const seenLinks = new Set(existingLinks.map((l) => `${l.skill_id}|${l.tool_id}`));

const linkRows: Record<string, unknown>[] = [];
for (const l of LINKS) {
  const toolId = toolIdByName.get(l.tool);
  if (!toolId) { console.log(`  WARN: no tool id for ${l.tool} — skip`); continue; }
  const key = `${l.skill}|${toolId}`;
  if (seenLinks.has(key)) { console.log(`  exists: skill ${l.skill} -> ${l.tool}`); continue; }
  linkRows.push({ skill_id: l.skill, tool_id: toolId, requirement_level: l.req, notes: "" });
}
if (linkRows.length > 0) {
  await postgrest("POST", "/skill_tools", linkRows);
  console.log(`  inserted ${linkRows.length} skill_tools`);
}

// ---------------------------------------------------------------------------
// Step 5: snapshot + DELETE legacy domain-level skill 79 (cascades its skill_tools).
// ---------------------------------------------------------------------------
console.log("\nStep 5: retire legacy skill 79");
const legacy: any[] = await postgrest("GET", `/skills?id=eq.79&select=id,skill_name,skill_type,domain_id,domain_module_id`);
if (legacy.length === 0) {
  console.log("  skill 79 already gone — skip");
} else {
  const legacyLinks: any[] = await postgrest("GET", `/skill_tools?skill_id=eq.79&select=id,tool_id,requirement_level`);
  console.log(`  SNAPSHOT skill 79: ${JSON.stringify(legacy[0])}`);
  console.log(`  SNAPSHOT skill_tools on 79: ${JSON.stringify(legacyLinks)}`);
  await postgrest("DELETE", `/skill_tools?skill_id=eq.79`);
  await postgrest("DELETE", `/skills?id=eq.79`);
  console.log("  deleted skill 79 + its skill_tools");
}

// ---------------------------------------------------------------------------
// Verify
// ---------------------------------------------------------------------------
console.log("\n=== VERIFY ===");
const skillsAfter: any[] = await postgrest(
  "GET",
  `/skills?or=(domain_id.eq.37,domain_module_id.in.(265,266))&select=id,skill_name,skill_type,domain_id,domain_module_id&order=id.asc`,
);
console.log("LCAP skills:");
for (const s of skillsAfter) console.log(`  ${s.id} ${s.skill_name} type=${s.skill_type} domain=${s.domain_id} module=${s.domain_module_id}`);

for (const [mod, sid] of skillIdByModule) {
  const st: any[] = await postgrest(
    "GET",
    `/skill_tools?skill_id=eq.${sid}&select=requirement_level,tools(tool_name,operation_kind,coverage_tier,data_object_id)&order=tool_id.asc`,
  );
  const req = st.filter((x) => x.requirement_level === "required").length;
  const cov = st.filter((x) => x.tools?.coverage_tier === "platform").length;
  console.log(`\n  module ${mod} skill ${sid}: ${st.length} tools (${req} required, ${st.length - req} optional); platform-covered ${cov}/${st.length} (strict_score=${(cov / st.length).toFixed(2)})`);
  for (const x of st) console.log(`    [${x.requirement_level}] ${x.tools?.tool_name} (${x.tools?.operation_kind}, ${x.tools?.coverage_tier})`);
}
