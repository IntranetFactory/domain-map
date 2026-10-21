#!/usr/bin/env bun
// B1A-SYSTEM-SKILLS (Phase S) for DATA-AI-PLAT (domain 129).
// Retargets domain-level system skill 45 to module 224 (SEMANTIC-CATALOG) and
// authors 3 new module-level system skills (223 LAKEHOUSE, 225 ML, 226 AI-AGENTS),
// each with >=1 query skill_tools over that module's masters. Re-distributes the
// 9 existing skill_tools rows so each query tool lands on its owning module's skill.
//
// Idempotent: re-reads skills by (skill_type, domain_module_id) before insert.
// record_status OMITTED on all inserts (DB default = "new", Rule #1/#4).

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });

// ------------------------------------------------------------------
// 1. Retarget skill 45 -> module 224 (SEMANTIC-CATALOG)
// ------------------------------------------------------------------
const SK45_DESC =
  "System skill for the DATA-AI-PLAT Semantic Layer, Governance, and Data Products module. " +
  "Runtime workflows over governed semantic metrics, data products, ontologies, and knowledge graph entities.";
await call({
  method: "PATCH",
  path: "/skills?id=eq.45",
  body: {
    domain_module_id: 224,
    skill_name: "data_ai_plat_semantic_catalog_agent",
    description: SK45_DESC,
  },
});
console.log("PATCHed skill 45 -> module 224 (data_ai_plat_semantic_catalog_agent)");

// ------------------------------------------------------------------
// 2. Author 3 new module-level system skills (idempotent by domain_module_id)
// ------------------------------------------------------------------
const newSkills = [
  {
    domain_module_id: 223,
    skill_name: "data_ai_plat_lakehouse_agent",
    description:
      "System skill for the DATA-AI-PLAT Lakehouse and Pipeline Engineering module. " +
      "Runtime workflows over lakehouse tables and data pipelines.",
  },
  {
    domain_module_id: 225,
    skill_name: "data_ai_plat_ml_agent",
    description:
      "System skill for the DATA-AI-PLAT Machine Learning Lifecycle module. " +
      "Runtime workflows over ML models and feature sets.",
  },
  {
    domain_module_id: 226,
    skill_name: "data_ai_plat_ai_agents_agent",
    description:
      "System skill for the DATA-AI-PLAT LLM Orchestration and AI Agents module. " +
      "Runtime workflows over registered AI agents.",
  },
];

const existingSkills = await get(
  "/skills?domain_id=eq.129&skill_type=eq.system&domain_module_id=in.(223,225,226)&select=id,domain_module_id",
);
const haveMod = new Set(existingSkills.map(r => Number(r.domain_module_id)));
const toInsert = newSkills
  .filter(s => !haveMod.has(s.domain_module_id))
  .map(s => ({
    skill_name: s.skill_name,
    skill_type: "system",
    domain_id: 129,
    domain_module_id: s.domain_module_id,
    description: s.description,
  }));
if (toInsert.length > 0) {
  await call({ method: "POST", path: "/skills", body: toInsert });
  console.log(`Inserted ${toInsert.length} new module system skills`);
} else {
  console.log("All 3 module system skills already present");
}

// re-read to build module_id -> skill_id map
const allMod = await get(
  "/skills?domain_id=eq.129&skill_type=eq.system&domain_module_id=in.(223,225,226)&select=id,domain_module_id,skill_name",
);
const skillByMod = new Map<number, number>();
for (const r of allMod) skillByMod.set(Number(r.domain_module_id), Number(r.id));
console.log("Module -> skill:", JSON.stringify([...skillByMod.entries()]));

// ------------------------------------------------------------------
// 3. Re-point the 5 skill_tools rows onto their module's skill
//    444 query_lakehouse_tables (tool 381) -> 223
//    445 query_data_pipelines   (tool 382) -> 223
//    446 query_ml_models        (tool 383) -> 225
//    447 query_feature_sets     (tool 384) -> 225
//    449 query_ai_agents        (tool 385) -> 226
// ------------------------------------------------------------------
const repoint: { skill_tool_id: number; module_id: number }[] = [
  { skill_tool_id: 444, module_id: 223 },
  { skill_tool_id: 445, module_id: 223 },
  { skill_tool_id: 446, module_id: 225 },
  { skill_tool_id: 447, module_id: 225 },
  { skill_tool_id: 449, module_id: 226 },
];
for (const r of repoint) {
  const newSkillId = skillByMod.get(r.module_id);
  if (!newSkillId) throw new Error(`No skill for module ${r.module_id}`);
  await call({
    method: "PATCH",
    path: `/skill_tools?id=eq.${r.skill_tool_id}`,
    body: { skill_id: newSkillId },
  });
  console.log(`PATCHed skill_tool ${r.skill_tool_id} -> skill ${newSkillId} (module ${r.module_id})`);
}

// ------------------------------------------------------------------
// 4. Verify
// ------------------------------------------------------------------
const verify = await get(
  "/skills?domain_id=eq.129&skill_type=eq.system&select=id,skill_name,domain_module_id,skill_tools(id,tools(tool_name,operation_kind,data_object_id))&order=domain_module_id.asc",
);
console.log("\nFINAL STATE:");
console.log(JSON.stringify(verify, null, 2));
