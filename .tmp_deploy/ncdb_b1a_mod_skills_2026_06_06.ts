// NCDB B1A-MOD-SKILLS executor.
// Authors 3 module-anchored system skills (modules 282/283/284), creates domain-specific
// mutate tools (dedup by tool_name), re-points the 5 existing query skill_tools to the new
// skills, links reusable side_effect/abstraction tools, then DELETEs legacy skill 86.
// Run from project root: bun run .tmp_deploy/ncdb_b1a_mod_skills_2026_06_06.ts
// TypeScript on Bun per loader idiom. semantius CLI only.

type Json = any;

async function cli(method: string, path: string, body?: Json): Promise<Json> {
  const arg: Json = { method, path };
  if (body !== undefined) arg.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest"],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" },
  );
  proc.stdin.write(JSON.stringify(arg));
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error(`CLI failed (${method} ${path}): ${err || out}`);
  }
  if (/required audience not found/i.test(out) || /required audience not found/i.test(err)) {
    throw new Error(`JWT-AUDIENCE: ${out} ${err}`);
  }
  try {
    return out.trim() ? JSON.parse(out) : null;
  } catch {
    return out;
  }
}

const get = (path: string) => cli("GET", path);
const post = (path: string, body: Json) =>
  cli("POST", path + (path.includes("?") ? "&" : "?") + "select=*", body);
const patch = (path: string, body: Json) => cli("PATCH", path, body);
const del = (path: string) => cli("DELETE", path);

// ---- Plan data -----------------------------------------------------------

const MODULES = [
  { id: 282, code: "NCDB-SCHEMA-BUILDER", skill_name: "ncdb_schema_builder_agent",
    description: "System skill for the NCDB Schema Builder module: model no-code bases and record definitions, query and evolve the schema, and create the linked-record tables downstream views, forms, and automations bind to." },
  { id: 283, code: "NCDB-VIEWS-FORMS", skill_name: "ncdb_views_forms_agent",
    description: "System skill for the NCDB Views and Forms module: build and share grid, gallery, kanban, calendar, and timeline views, and create and publish forms that write structured submissions into a table." },
  { id: 284, code: "NCDB-AUTOMATION-SYNC", skill_name: "ncdb_automation_sync_agent",
    description: "System skill for the NCDB Automation and Sync module: author record-triggered and scheduled automations, run them, and dispatch outbound API calls and notifications to external systems." },
];

// Existing query tools to migrate -> new skill, with requirement_level.
const MIGRATE: { tool_id: number; skill_module: number; requirement: string }[] = [
  { tool_id: 595, skill_module: 282, requirement: "required" }, // query_nocode_bases
  { tool_id: 596, skill_module: 282, requirement: "required" }, // query_nocode_record_definitions
  { tool_id: 831, skill_module: 283, requirement: "required" }, // query_nocode_forms
  { tool_id: 832, skill_module: 283, requirement: "required" }, // query_nocode_views
  { tool_id: 833, skill_module: 284, requirement: "required" }, // query_nocode_automations
];

// New domain-specific mutate tools (platform-covered; Semantius-mastered data).
const NEW_TOOLS: { tool_name: string; operation_kind: string; data_object_id: number; coverage_tier: string; description: string }[] = [
  { tool_name: "create_nocode_base", operation_kind: "mutate", data_object_id: 241, coverage_tier: "platform",
    description: "Create a new no-code base (a self-contained namespace of tables and relationships)." },
  { tool_name: "create_nocode_record_definition", operation_kind: "mutate", data_object_id: 242, coverage_tier: "platform",
    description: "Create a new record definition (a user-defined table with its field types) inside a base." },
  { tool_name: "update_nocode_record_definition", operation_kind: "mutate", data_object_id: 242, coverage_tier: "platform",
    description: "Update a record definition's fields, types, or linked-record relationships." },
  { tool_name: "create_nocode_view", operation_kind: "mutate", data_object_id: 713, coverage_tier: "platform",
    description: "Create a new view (grid, gallery, kanban, calendar, or timeline) over a record definition." },
  { tool_name: "create_nocode_form", operation_kind: "mutate", data_object_id: 712, coverage_tier: "platform",
    description: "Create a new form that writes structured submissions into a record definition." },
  { tool_name: "publish_nocode_form", operation_kind: "mutate", data_object_id: 712, coverage_tier: "platform",
    description: "Publish a form so it accepts public or authenticated submissions." },
  { tool_name: "create_nocode_automation", operation_kind: "mutate", data_object_id: 714, coverage_tier: "platform",
    description: "Create a record-triggered or scheduled automation." },
  { tool_name: "update_nocode_automation", operation_kind: "mutate", data_object_id: 714, coverage_tier: "platform",
    description: "Update an automation's trigger, conditions, or actions." },
];

// skill_tools links keyed by tool_name (for new tools) plus reusable existing tools.
// resolved to tool_id at run time.
const NEW_LINKS: { tool_name: string; skill_module: number; requirement: string }[] = [
  { tool_name: "create_nocode_base", skill_module: 282, requirement: "required" },
  { tool_name: "create_nocode_record_definition", skill_module: 282, requirement: "required" },
  { tool_name: "update_nocode_record_definition", skill_module: 282, requirement: "required" },
  { tool_name: "create_nocode_view", skill_module: 283, requirement: "required" },
  { tool_name: "create_nocode_form", skill_module: 283, requirement: "required" },
  { tool_name: "publish_nocode_form", skill_module: 283, requirement: "required" },
  { tool_name: "create_nocode_automation", skill_module: 284, requirement: "required" },
  { tool_name: "update_nocode_automation", skill_module: 284, requirement: "required" },
];

// Reusable catalog-wide tools linked (NOT created) by tool_name.
const REUSE_LINKS: { tool_name: string; skill_module: number; requirement: string }[] = [
  { tool_name: "notify_person", skill_module: 283, requirement: "optional" }, // form submission notifications
  { tool_name: "invoke_webhook", skill_module: 284, requirement: "required" }, // automation outbound API call
  { tool_name: "notify_person", skill_module: 284, requirement: "optional" }, // automation human notifications
];

async function main() {
  // 1. Create the 3 system skills (idempotent by domain_module_id + skill_type=system).
  const skillByModule: Record<number, number> = {};
  for (const m of MODULES) {
    const existing = await get(`/skills?domain_module_id=eq.${m.id}&skill_type=eq.system&select=id,skill_name`);
    if (Array.isArray(existing) && existing.length > 0) {
      skillByModule[m.id] = existing[0].id;
      console.log(`skill exists for module ${m.id}: id ${existing[0].id} (${existing[0].skill_name})`);
      continue;
    }
    const row = {
      skill_name: m.skill_name,
      skill_type: "system",
      domain_id: 134,
      domain_module_id: m.id,
      description: m.description,
      // record_status omitted -> DB default "new"
    };
    const created = await post("/skills", row);
    const id = Array.isArray(created) ? created[0].id : created.id;
    skillByModule[m.id] = id;
    console.log(`created skill id ${id} for module ${m.id} (${m.skill_name})`);
  }

  // 2. Create new mutate tools (dedup by tool_name against live).
  const toolByName: Record<string, number> = {};
  for (const t of NEW_TOOLS) {
    const live = await get(`/tools?tool_name=eq.${encodeURIComponent(t.tool_name)}&select=id,tool_name,operation_kind,data_object_id`);
    if (Array.isArray(live) && live.length > 0) {
      toolByName[t.tool_name] = live[0].id;
      console.log(`tool exists: ${t.tool_name} -> id ${live[0].id} (reusing)`);
      continue;
    }
    const created = await post("/tools", {
      tool_name: t.tool_name,
      operation_kind: t.operation_kind,
      data_object_id: t.data_object_id,
      coverage_tier: t.coverage_tier,
      description: t.description,
      // record_status omitted -> DB default "new"
    });
    const id = Array.isArray(created) ? created[0].id : created.id;
    toolByName[t.tool_name] = id;
    console.log(`created tool id ${id}: ${t.tool_name}`);
  }

  // Resolve reusable tool names to ids.
  for (const r of REUSE_LINKS) {
    if (toolByName[r.tool_name]) continue;
    const live = await get(`/tools?tool_name=eq.${encodeURIComponent(r.tool_name)}&select=id`);
    if (!Array.isArray(live) || live.length === 0) throw new Error(`reusable tool not found: ${r.tool_name}`);
    toolByName[r.tool_name] = live[0].id;
  }

  // 3. Re-point the 5 existing skill_tools (PATCH skill_id) to the new module skills.
  for (const mig of MIGRATE) {
    const targetSkill = skillByModule[mig.skill_module];
    // find the existing skill_tools row for tool on legacy skill 86
    const rows = await get(`/skill_tools?skill_id=eq.86&tool_id=eq.${mig.tool_id}&select=id,skill_id,tool_id,requirement_level`);
    if (!Array.isArray(rows) || rows.length === 0) {
      // maybe already migrated
      const already = await get(`/skill_tools?skill_id=eq.${targetSkill}&tool_id=eq.${mig.tool_id}&select=id`);
      if (Array.isArray(already) && already.length > 0) {
        console.log(`skill_tool tool ${mig.tool_id} already on skill ${targetSkill}`);
        continue;
      }
      throw new Error(`skill_tool for tool ${mig.tool_id} on skill 86 not found and not on target`);
    }
    await patch(`/skill_tools?id=eq.${rows[0].id}`, { skill_id: targetSkill, requirement_level: mig.requirement });
    console.log(`re-pointed skill_tool id ${rows[0].id} (tool ${mig.tool_id}) -> skill ${targetSkill}`);
  }

  // 4. Create new skill_tools for the new mutate tools (idempotent by skill_id+tool_id).
  const allLinks = [
    ...NEW_LINKS.map((l) => ({ tool_id: toolByName[l.tool_name], skill_module: l.skill_module, requirement: l.requirement, name: l.tool_name })),
    ...REUSE_LINKS.map((l) => ({ tool_id: toolByName[l.tool_name], skill_module: l.skill_module, requirement: l.requirement, name: l.tool_name })),
  ];
  for (const l of allLinks) {
    const targetSkill = skillByModule[l.skill_module];
    const exists = await get(`/skill_tools?skill_id=eq.${targetSkill}&tool_id=eq.${l.tool_id}&select=id`);
    if (Array.isArray(exists) && exists.length > 0) {
      console.log(`skill_tool exists: skill ${targetSkill} + tool ${l.tool_id} (${l.name})`);
      continue;
    }
    const created = await post("/skill_tools", {
      skill_id: targetSkill,
      tool_id: l.tool_id,
      requirement_level: l.requirement,
      // notes omitted -> empty (Rule #15); record_status omitted -> "new"
    });
    const id = Array.isArray(created) ? created[0].id : created.id;
    console.log(`created skill_tool id ${id}: skill ${targetSkill} + tool ${l.tool_id} (${l.name}, ${l.requirement})`);
  }

  // 5. DELETE legacy skill 86 (its skill_tools were re-pointed in step 3; confirm none remain).
  const remaining = await get(`/skill_tools?skill_id=eq.86&select=id`);
  if (Array.isArray(remaining) && remaining.length > 0) {
    throw new Error(`legacy skill 86 still has ${remaining.length} skill_tools; aborting delete`);
  }
  const skill86 = await get(`/skills?id=eq.86&select=id`);
  if (Array.isArray(skill86) && skill86.length > 0) {
    await del(`/skills?id=eq.86`);
    console.log("DELETED legacy skill 86");
  } else {
    console.log("legacy skill 86 already gone");
  }

  console.log("DONE B1A-MOD-SKILLS");
}

await main();
