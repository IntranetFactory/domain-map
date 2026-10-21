// B1A-SKILLS — Phase S system skills + tools + skill_tools for the 3 BPA modules,
// then retire the legacy bpa-system skill (id 34) and its 4 skill_tools rows.
//
// Scope (BPA only, domains.id=136):
//   Modules: BPA-PROCESS-REPO (220), BPA-CAPABILITY-MAP (221), BPA-VALUE-STREAM (222).
//   Per Rule #17: each module owes exactly one skill_type='system' skill anchored by
//   domain_module_id, each with >=1 skill_tools row.
//
// Three-source derivation (Rule #17 / SKILL.md "Three-source derivation procedure"):
//   Source 1 (masters -> query + representative mutate): each module's master(s) get
//     query_<entity> (already in catalog) + create/update + a workflow-gate mutate
//     keyed to the master's published trigger_event.
//   Source 2 (consumer/contributor reads): BPA modules hold no consumer/contributor
//     DMDO rows yet (deferred B1B-S4), so no cross-domain query tools required.
//   Source 3 (outbound handoffs -> mutate on receiving side): every BPA outbound handoff
//     publishes BPA's OWN master as the event payload (process_model.published,
//     value_stream.bottleneck_identified, process_simulation_run.completed). These are
//     publish/run gates on BPA's own masters, already covered by Source 1. No
//     foreign-domain mutate tool is required.
//
// Channel rule: default to notify_person (abstraction, platform-covered) as an OPTIONAL
//   tool. The workflow does not require a specific channel, so notify_person not a
//   channel primitive, and optional not required.
//
// Idempotent: re-reads live state before each write; dedupes tools by tool_name,
//   skills by skill_name, skill_tools by (skill_id, tool_id).
//
// record_status omitted on every insert (DB default 'new', Rule #1/#4).
// notes never written (Rule #15).
//
// Run:  bun run .tmp_deploy/bpa_b1a_skills_2026-06-05.ts --apply
//       (omit --apply for a dry run)

const APPLY = process.argv.includes("--apply");
const CHUNK = 50;

async function call(body: any): Promise<any[]> {
  const p = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  p.stdin.write(JSON.stringify(body));
  await p.stdin.end();
  const out = await new Response(p.stdout).text();
  const err = await new Response(p.stderr).text();
  await p.exited;
  if (p.exitCode !== 0) throw new Error(`semantius failed (${p.exitCode}): ${err}`);
  const trimmed = out.trim();
  return trimmed ? JSON.parse(trimmed) : [];
}
const get = (path: string) => call({ method: "GET", path });

async function insertReturning(path: string, rows: any[]): Promise<any[]> {
  if (rows.length === 0) return [];
  if (!APPLY) { console.log(`[dry-run] POST ${path}  rows=${rows.length}`); return []; }
  const result: any[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const r = await call({ method: "POST", path, body: slice });
    result.push(...(Array.isArray(r) ? r : []));
  }
  return result;
}

async function del(path: string) {
  if (!APPLY) { console.log(`[dry-run] DELETE ${path}`); return; }
  await call({ method: "DELETE", path });
}

// ---------------------------------------------------------------------------
// New tool definitions. coverage_tier='platform' (CRUD-delivered), matching the
// existing query/mutate tools on these masters (332/65/333/334/892). data_object_id
// required for mutate. These are all domain-specific mutate tools on BPA masters
// (Rule #9: query_/mutate on BPA-mastered data_objects are ours to create).
type ToolDef = { tool_name: string; description: string; operation_kind: string; data_object_id: number; coverage_tier: string };

const NEW_TOOLS: ToolDef[] = [
  // BPA-PROCESS-REPO master: business_process_models (247)
  { tool_name: "create_business_process_model", description: "Create a business process model record via Semantius CRUD.", operation_kind: "mutate", data_object_id: 247, coverage_tier: "platform" },
  { tool_name: "update_business_process_model", description: "Update a business process model record via Semantius CRUD.", operation_kind: "mutate", data_object_id: 247, coverage_tier: "platform" },
  { tool_name: "publish_business_process_model", description: "Advance a business process model to its published state, firing the process_model.published event.", operation_kind: "mutate", data_object_id: 247, coverage_tier: "platform" },
  // BPA-CAPABILITY-MAP embedded_master: business_capability_maps (248)
  { tool_name: "create_business_capability_map", description: "Create a business capability map record via Semantius CRUD.", operation_kind: "mutate", data_object_id: 248, coverage_tier: "platform" },
  { tool_name: "publish_business_capability_map", description: "Advance a business capability map to its published state, firing the capability_map.updated event.", operation_kind: "mutate", data_object_id: 248, coverage_tier: "platform" },
  // BPA-VALUE-STREAM masters: value_streams (249), process_simulation_runs (250)
  { tool_name: "create_value_stream", description: "Create a value stream record via Semantius CRUD.", operation_kind: "mutate", data_object_id: 249, coverage_tier: "platform" },
  { tool_name: "update_value_stream", description: "Update a value stream record via Semantius CRUD.", operation_kind: "mutate", data_object_id: 249, coverage_tier: "platform" },
  { tool_name: "create_process_simulation_run", description: "Create a process simulation run record via Semantius CRUD.", operation_kind: "mutate", data_object_id: 250, coverage_tier: "platform" },
  { tool_name: "run_process_simulation_run", description: "Execute a process simulation run and record its completion, firing the process_simulation_run.completed event.", operation_kind: "mutate", data_object_id: 250, coverage_tier: "platform" },
];

// ---------------------------------------------------------------------------
// System skill definitions. requirement_level: required for the irreducible
// query+mutate+gate surface; notify_person optional (channel abstraction).
type SkillDef = {
  skill_name: string;
  description: string;
  domain_module_id: number;
  required: string[];   // tool_names
  optional: string[];   // tool_names
};

const SKILLS: SkillDef[] = [
  {
    skill_name: "bpa_process_repo_agent",
    description: "System skill for the BPA Process Repository and Publishing module. Authors, revises, and publishes business process models over the module's master data and publish lifecycle.",
    domain_module_id: 220,
    required: ["query_business_process_models", "create_business_process_model", "update_business_process_model", "publish_business_process_model"],
    optional: ["notify_person"],
  },
  {
    skill_name: "bpa_capability_map_agent",
    description: "System skill for the BPA Capability Mapping and Reference Frameworks module. Authors, revises, and publishes business capability maps over the module's embedded-master data.",
    domain_module_id: 221,
    required: ["query_business_capability_maps", "create_business_capability_map", "update_business_capability_map", "publish_business_capability_map"],
    optional: ["notify_person"],
  },
  {
    skill_name: "bpa_value_stream_agent",
    description: "System skill for the BPA Value Stream Modeling and Simulation module. Models value streams and runs process simulations over the module's master data.",
    domain_module_id: 222,
    required: ["query_value_streams", "create_value_stream", "update_value_stream", "query_process_simulation_runs", "create_process_simulation_run", "run_process_simulation_run"],
    optional: ["notify_person"],
  },
];

// Legacy retirement targets.
const LEGACY_SKILL_ID = 34;
const LEGACY_SKILL_TOOL_IDS = [373, 374, 375, 376];

// ===========================================================================

// 1) Resolve live tool state, create any missing tools (dedup by tool_name).
let tools = await get(`/tools?select=id,tool_name,operation_kind,data_object_id,coverage_tier&limit=10000`);
let toolByName = new Map<string, any>((tools as any[]).map(t => [t.tool_name, t]));

const toolsToCreate = NEW_TOOLS.filter(t => !toolByName.has(t.tool_name));
console.log(`tools to create: ${toolsToCreate.length} -> ${toolsToCreate.map(t => t.tool_name).join(", ") || "(none)"}`);
const createdTools = await insertReturning(`/tools`, toolsToCreate);
if (APPLY && createdTools.length) {
  // Re-read to refresh the name->row map with the new ids.
  tools = await get(`/tools?select=id,tool_name,operation_kind,data_object_id,coverage_tier&limit=10000`);
  toolByName = new Map<string, any>((tools as any[]).map(t => [t.tool_name, t]));
}

// 2) Create the 3 system skills (dedup by skill_name).
let skills = await get(`/skills?select=id,skill_name,skill_type,domain_module_id&limit=10000`);
let skillIdByName = new Map<string, number>((skills as any[]).map(s => [s.skill_name, s.id]));

const BPA_DOMAIN_ID = 136;
const skillsToCreate = SKILLS.filter(s => !skillIdByName.has(s.skill_name)).map(s => ({
  skill_name: s.skill_name,
  description: s.description,
  skill_type: "system",
  domain_module_id: s.domain_module_id,
  // domain_id required by the platform rule domain_required_when_skill_type_is_system;
  // domain_module_id is the canonical system-skill anchor (module-shape.md).
  domain_id: BPA_DOMAIN_ID,
  // record_status omitted (Rule #1/#4).
}));
console.log(`skills to create: ${skillsToCreate.length} -> ${skillsToCreate.map(s => s.skill_name).join(", ") || "(none)"}`);
await insertReturning(`/skills`, skillsToCreate);
if (APPLY && skillsToCreate.length) {
  skills = await get(`/skills?select=id,skill_name,skill_type,domain_module_id&limit=10000`);
  skillIdByName = new Map<string, number>((skills as any[]).map(s => [s.skill_name, s.id]));
}

// 3) Create skill_tools rows (dedup by (skill_id, tool_id)).
const existingST = await get(`/skill_tools?select=skill_id,tool_id&limit=30000`);
const stKey = (skillId: number, toolId: number) => `${skillId}:${toolId}`;
const haveST = new Set<string>((existingST as any[]).map(r => stKey(r.skill_id, r.tool_id)));

const stRows: any[] = [];
for (const s of SKILLS) {
  const skillId = skillIdByName.get(s.skill_name);
  if (!skillId) {
    if (APPLY) throw new Error(`skill id missing for ${s.skill_name}`);
    continue; // dry-run: skill not yet created
  }
  const add = (toolName: string, level: string) => {
    const tool = toolByName.get(toolName);
    if (!tool) { if (APPLY) throw new Error(`tool missing: ${toolName}`); return; }
    if (haveST.has(stKey(skillId, tool.id))) return;
    stRows.push({ skill_id: skillId, tool_id: tool.id, requirement_level: level });
    haveST.add(stKey(skillId, tool.id));
  };
  for (const t of s.required) add(t, "required");
  for (const t of s.optional) add(t, "optional");
}
console.log(`skill_tools to create: ${stRows.length}`);
await insertReturning(`/skill_tools`, stRows);

// 4) Retire legacy skill 34 and its 4 skill_tools rows.
//    Snapshot first (prior values are logged to history.md manually by the caller).
const legacySkill = await get(`/skills?id=eq.${LEGACY_SKILL_ID}&select=*`);
const legacyST = await get(`/skill_tools?skill_id=eq.${LEGACY_SKILL_ID}&select=*`);
console.log(`legacy skill snapshot: ${JSON.stringify(legacySkill)}`);
console.log(`legacy skill_tools snapshot: ${JSON.stringify(legacyST)}`);

if ((legacyST as any[]).length) {
  await del(`/skill_tools?skill_id=eq.${LEGACY_SKILL_ID}`);
}
if ((legacySkill as any[]).length) {
  await del(`/skills?id=eq.${LEGACY_SKILL_ID}`);
}

console.log(APPLY ? "APPLY complete." : "Dry run complete (no writes).");
