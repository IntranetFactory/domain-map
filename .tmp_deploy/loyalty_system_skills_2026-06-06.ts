// B1A-SYSTEM-SKILLS executor for LOYALTY (domain 78).
// Author one skill_type='system' skill per LOYALTY module (272/273/274),
// each with >=1 skill_tools row reusing existing platform-covered query tools,
// then retire legacy skill 81 (and its 6 skill_tools rows) AFTER the new skills exist.
//
// Rules honored:
//  - semantius CLI only (no MCP).
//  - record_status omitted on every insert (DB default 'new').
//  - notes left empty (Rule #15).
//  - Tools are reused, never re-created (tools table is catalog-wide; dedup by tool_name).
//  - Strict ordering: new skills + skill_tools first, THEN delete skill 81.
//  - Idempotent: re-reads existing skills by (domain_module_id, skill_type='system') and
//    existing skill_tools by (skill_id, tool_id) before inserting.

const CWD = "c:/dev/domain-map";

async function pg(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { cwd: CWD, stdout: "pipe", stderr: "pipe" },
  );
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error(`pg ${method} ${path} failed (exit ${proc.exitCode}): ${err || out}`);
  }
  const trimmed = out.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

const DOMAIN_ID = 78;

// Module -> system skill spec. Tool ids are existing, platform-covered query tools
// (verified live before authoring this loader).
const SKILL_SPECS: { moduleId: number; skillName: string; toolIds: number[] }[] = [
  // LOYALTY-PROGRAM-CORE (272): masters loyalty_members (263), loyalty_tiers (265).
  { moduleId: 272, skillName: "loyalty_program_core_agent", toolIds: [571, 573] },
  // LOYALTY-POINTS-REWARDS (273): masters loyalty_transactions (264),
  // redemption_rewards (717), redemption_transactions (718).
  { moduleId: 273, skillName: "loyalty_points_rewards_agent", toolIds: [572, 826, 827] },
  // LOYALTY-ENGAGEMENT (274): no in-domain master; consumer read over loyalty_members (263).
  { moduleId: 274, skillName: "loyalty_engagement_agent", toolIds: [571] },
];

const LEGACY_SKILL_ID = 81;

async function main() {
  console.log("== Pre-flight: verify tools exist and are query/platform ==");
  const allToolIds = Array.from(new Set(SKILL_SPECS.flatMap((s) => s.toolIds)));
  const tools: any[] = await pg(
    "GET",
    `/tools?id=in.(${allToolIds.join(",")})&select=id,tool_name,operation_kind,data_object_id,coverage_tier`,
  );
  const toolById = new Map<number, any>(tools.map((t) => [t.id, t]));
  for (const id of allToolIds) {
    const t = toolById.get(id);
    if (!t) throw new Error(`Tool ${id} not found; aborting (never create generic tools here).`);
    // F4 invariant sanity: query tools require data_object_id set.
    if (t.operation_kind === "query" && (t.data_object_id === null || t.data_object_id === undefined)) {
      throw new Error(`Tool ${id} (${t.tool_name}) is query but has null data_object_id (F4 violation).`);
    }
    console.log(`  tool ${id} ${t.tool_name} [${t.operation_kind}, do=${t.data_object_id}, ${t.coverage_tier}]`);
  }

  console.log("== Step 1: author/ensure one system skill per module ==");
  const skillIdByModule = new Map<number, number>();
  for (const spec of SKILL_SPECS) {
    const existing: any[] = await pg(
      "GET",
      `/skills?domain_module_id=eq.${spec.moduleId}&skill_type=eq.system&select=id,skill_name`,
    );
    if (existing.length > 1) {
      throw new Error(`Module ${spec.moduleId} already has ${existing.length} system skills (F2 violation); aborting.`);
    }
    if (existing.length === 1) {
      skillIdByModule.set(spec.moduleId, existing[0].id);
      console.log(`  module ${spec.moduleId}: system skill already exists -> id ${existing[0].id} (${existing[0].skill_name})`);
      continue;
    }
    const inserted: any[] = await pg("POST", "/skills", [
      {
        skill_name: spec.skillName,
        skill_type: "system",
        domain_id: DOMAIN_ID,
        domain_module_id: spec.moduleId,
        description: "",
        // record_status omitted -> DB default 'new'
      },
    ]);
    const newId = inserted[0].id;
    skillIdByModule.set(spec.moduleId, newId);
    console.log(`  module ${spec.moduleId}: inserted system skill id ${newId} (${spec.skillName})`);
  }

  console.log("== Step 2: author/ensure skill_tools rows (dedup by skill_id, tool_id) ==");
  for (const spec of SKILL_SPECS) {
    const skillId = skillIdByModule.get(spec.moduleId)!;
    const existingLinks: any[] = await pg(
      "GET",
      `/skill_tools?skill_id=eq.${skillId}&select=id,tool_id`,
    );
    const haveToolIds = new Set<number>(existingLinks.map((r) => r.tool_id));
    const toInsert = spec.toolIds
      .filter((tid) => !haveToolIds.has(tid))
      .map((tid) => ({
        skill_id: skillId,
        tool_id: tid,
        requirement_level: "required",
        // notes omitted/empty (Rule #15); record_status omitted -> 'new'
      }));
    if (toInsert.length === 0) {
      console.log(`  skill ${skillId} (module ${spec.moduleId}): all ${spec.toolIds.length} skill_tools present`);
      continue;
    }
    const inserted: any[] = await pg("POST", "/skill_tools", toInsert);
    console.log(`  skill ${skillId} (module ${spec.moduleId}): inserted ${inserted.length} skill_tools rows -> tools ${toInsert.map((r) => r.tool_id).join(",")}`);
  }

  console.log("== Step 3: verify new skills + skill_tools (F2/F3) BEFORE retiring legacy ==");
  for (const spec of SKILL_SPECS) {
    const skillId = skillIdByModule.get(spec.moduleId)!;
    const links: any[] = await pg(
      "GET",
      `/skill_tools?skill_id=eq.${skillId}&select=tool_id`,
    );
    if (links.length < 1) {
      throw new Error(`Skill ${skillId} (module ${spec.moduleId}) has 0 skill_tools (F3 fail); aborting before legacy delete.`);
    }
    console.log(`  module ${spec.moduleId}: skill ${skillId} has ${links.length} skill_tools (F3 OK)`);
  }

  console.log("== Step 4: retire legacy skill 81 (delete its skill_tools, then the skill) ==");
  const legacy: any[] = await pg("GET", `/skills?id=eq.${LEGACY_SKILL_ID}&select=id,skill_name,domain_module_id`);
  if (legacy.length === 0) {
    console.log(`  legacy skill ${LEGACY_SKILL_ID} already gone; nothing to retire.`);
  } else {
    const legacyLinks: any[] = await pg(
      "GET",
      `/skill_tools?skill_id=eq.${LEGACY_SKILL_ID}&select=id,tool_id`,
    );
    console.log(`  legacy skill ${LEGACY_SKILL_ID} has ${legacyLinks.length} skill_tools to delete: ids ${legacyLinks.map((r) => r.id).join(",")}`);
    // skill_tools.skill_id is cascade-on-delete from skills, but delete explicitly
    // first so the action is auditable and order is deterministic.
    await pg("DELETE", `/skill_tools?skill_id=eq.${LEGACY_SKILL_ID}`);
    await pg("DELETE", `/skills?id=eq.${LEGACY_SKILL_ID}`);
    console.log(`  deleted ${legacyLinks.length} skill_tools and skill ${LEGACY_SKILL_ID}.`);
  }

  console.log("== Final verification ==");
  for (const spec of SKILL_SPECS) {
    const skills: any[] = await pg(
      "GET",
      `/skills?domain_module_id=eq.${spec.moduleId}&skill_type=eq.system&select=id,skill_name`,
    );
    const skillIds = skills.map((s) => s.id);
    const links: any[] = skillIds.length
      ? await pg("GET", `/skill_tools?skill_id=in.(${skillIds.join(",")})&select=id`)
      : [];
    console.log(`  module ${spec.moduleId}: ${skills.length} system skill(s) [${skills.map((s) => s.skill_name).join(",")}], ${links.length} skill_tools`);
  }
  const legacyCheck: any[] = await pg(
    "GET",
    `/skills?domain_id=eq.${DOMAIN_ID}&skill_type=eq.system&domain_module_id=is.null&select=id,skill_name`,
  );
  console.log(`  legacy domain-level system skills remaining (F1, expect 0): ${legacyCheck.length}`);

  console.log("DONE.");
}

await main();
