#!/usr/bin/env bun
// B1A-SKILLS for DAIRY-MGMT (domain 156).
// Authors one system skill per module (227/228/229/230), redistributes the 8
// existing query tools (372-379) to the owning module's skill, adds module-scoped
// mutate / side_effect / fetch tools, then retires the legacy domain-level skill 43.
//
// Idempotent: re-reads by natural key (skill_name, tool_name) and inserts only the
// missing rows; skill_tools links are deduped by (skill_id, tool_id).
// record_status is OMITTED on every insert (DB default = "new"), per Rule #1/#4.

import { $ } from "bun";

$.throws(false);

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

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

const DOMAIN_ID = 156;

// ------------------------------------------------------------------
// 1. SKILLS — one system skill per module. Natural key: skill_name.
// ------------------------------------------------------------------
const skillSpecs = [
  {
    skill_name: "dairy_mgmt_herd_agent",
    skill_type: "system",
    domain_id: DOMAIN_ID,
    domain_module_id: 227,
    description:
      "Agent surface for the Dairy Herd and Animal Lifecycle module. Manages the cow population through breeding, lactation, and health events, including culling decisions and lactation-cycle closure.",
  },
  {
    skill_name: "dairy_mgmt_parlor_agent",
    skill_type: "system",
    domain_id: DOMAIN_ID,
    domain_module_id: 228,
    description:
      "Agent surface for the Parlor and Milking Operations module. Records milking sessions and aggregates milk into bulk-tank lots dispatched as shipments to processors.",
  },
  {
    skill_name: "dairy_mgmt_milk_quality_agent",
    skill_type: "system",
    domain_id: DOMAIN_ID,
    domain_module_id: 229,
    description:
      "Agent surface for the Milk Quality Testing module. Records milk-quality test results and pulls external lab test results to gate shipment on quality thresholds.",
  },
  {
    skill_name: "dairy_mgmt_feed_agent",
    skill_type: "system",
    domain_id: DOMAIN_ID,
    domain_module_id: 230,
    description:
      "Agent surface for the Feed Rationing and TMR module. Maintains feed rations and ration formulations consumed across the herd.",
  },
];

// ------------------------------------------------------------------
// 2. NEW TOOLS — module-scoped mutate / side_effect / fetch. Natural key: tool_name.
//    The 8 query tools (372-379) already exist and are only re-linked, not re-created.
// ------------------------------------------------------------------
const newToolSpecs = [
  {
    tool_name: "cull_dairy_cow",
    operation_kind: "mutate",
    data_object_id: 499, // dairy_cows
    coverage_tier: "platform",
    description:
      "Record a culling decision on a dairy cow, transitioning the animal out of the productive herd.",
  },
  {
    tool_name: "close_lactation",
    operation_kind: "mutate",
    data_object_id: 500, // lactation_records
    coverage_tier: "platform",
    description:
      "Close an open lactation record at dry-off, finalizing the cycle's days-in-milk and yield totals.",
  },
  {
    tool_name: "complete_milking",
    operation_kind: "mutate",
    data_object_id: 501, // milkings
    coverage_tier: "platform",
    description:
      "Record a completed milking session, capturing yield and aggregating it into the current bulk-tank lot.",
  },
  {
    tool_name: "dispatch_bulk_milk_shipment",
    operation_kind: "side_effect",
    data_object_id: null, // side_effect must have NULL data_object_id
    coverage_tier: "external",
    description:
      "Dispatch a bulk-tank milk shipment to the hauler or processor, an external pickup action with no Semantius-side data return.",
  },
  {
    tool_name: "fetch_dhia_test_result",
    operation_kind: "fetch",
    data_object_id: null, // fetch must have NULL data_object_id
    coverage_tier: "external",
    description:
      "Fetch a herd-test result from an external milk-testing lab API; the source schema is owned by the lab, not Semantius.",
  },
];

// ------------------------------------------------------------------
// 3. SKILL_TOOLS — (skill_name, tool_name, requirement_level) tuples.
//    Each tool is linked to the skill owning the module that masters its data_object.
// ------------------------------------------------------------------
const skillToolSpecs: { skill: string; tool: string; requirement_level: string }[] = [
  // HERD (227): dairy_cows, lactation_records, breeding_events, cow_health_events
  { skill: "dairy_mgmt_herd_agent", tool: "query_dairy_cows", requirement_level: "required" },
  { skill: "dairy_mgmt_herd_agent", tool: "query_lactation_records", requirement_level: "required" },
  { skill: "dairy_mgmt_herd_agent", tool: "query_breeding_events", requirement_level: "required" },
  { skill: "dairy_mgmt_herd_agent", tool: "query_cow_health_events", requirement_level: "required" },
  { skill: "dairy_mgmt_herd_agent", tool: "cull_dairy_cow", requirement_level: "required" },
  { skill: "dairy_mgmt_herd_agent", tool: "close_lactation", requirement_level: "required" },
  // PARLOR (228): milkings, bulk_milk_shipments
  { skill: "dairy_mgmt_parlor_agent", tool: "query_milkings", requirement_level: "required" },
  { skill: "dairy_mgmt_parlor_agent", tool: "query_bulk_milk_shipments", requirement_level: "required" },
  { skill: "dairy_mgmt_parlor_agent", tool: "complete_milking", requirement_level: "required" },
  { skill: "dairy_mgmt_parlor_agent", tool: "dispatch_bulk_milk_shipment", requirement_level: "required" },
  // MILK-QUALITY (229): milk_quality_tests
  { skill: "dairy_mgmt_milk_quality_agent", tool: "query_milk_quality_tests", requirement_level: "required" },
  { skill: "dairy_mgmt_milk_quality_agent", tool: "fetch_dhia_test_result", requirement_level: "required" },
  // FEED (230): feed_rations
  { skill: "dairy_mgmt_feed_agent", tool: "query_feed_rations", requirement_level: "required" },
];

// Tool-row invariant pre-flight (mirrors Rule #17 / fields.tools.data_object_id rule).
for (const t of newToolSpecs) {
  const needsDoid = t.operation_kind === "query" || t.operation_kind === "mutate";
  const mustBeNull = ["fetch", "side_effect", "compute"].includes(t.operation_kind);
  if (needsDoid && t.data_object_id == null) {
    throw new Error(`Tool ${t.tool_name}: ${t.operation_kind} requires data_object_id`);
  }
  if (mustBeNull && t.data_object_id != null) {
    throw new Error(`Tool ${t.tool_name}: ${t.operation_kind} requires NULL data_object_id`);
  }
}

async function main() {
  // --- SKILLS ---
  const existingSkills = await get(
    `/skills?domain_module_id=in.(227,228,229,230)&skill_type=eq.system&select=id,skill_name,domain_module_id`,
  );
  const existingSkillNames = new Set(existingSkills.map(s => String(s.skill_name)));
  const skillsToInsert = skillSpecs.filter(s => !existingSkillNames.has(s.skill_name));
  if (skillsToInsert.length) {
    console.log(`Inserting ${skillsToInsert.length} skills...`);
    await insert("/skills", skillsToInsert);
  } else {
    console.log("All 4 skills already present.");
  }
  const allSkills = await get(
    `/skills?domain_module_id=in.(227,228,229,230)&skill_type=eq.system&select=id,skill_name`,
  );
  const skillMap = new Map<string, number>();
  for (const s of allSkills) skillMap.set(String(s.skill_name), Number(s.id));

  // --- NEW TOOLS (dedup by tool_name catalog-wide) ---
  const toolNames = newToolSpecs.map(t => t.tool_name);
  const existingNewTools = await get(
    `/tools?tool_name=in.(${toolNames.join(",")})&select=id,tool_name`,
  );
  const existingToolNames = new Set(existingNewTools.map(t => String(t.tool_name)));
  const toolsToInsert = newToolSpecs.filter(t => !existingToolNames.has(t.tool_name));
  if (toolsToInsert.length) {
    console.log(`Inserting ${toolsToInsert.length} new tools...`);
    await insert("/tools", toolsToInsert);
  } else {
    console.log("All new tools already present.");
  }

  // Build full tool_name -> id map (8 existing query tools + new tools).
  const allLinkedToolNames = Array.from(new Set(skillToolSpecs.map(st => st.tool)));
  const allTools = await get(
    `/tools?tool_name=in.(${allLinkedToolNames.join(",")})&select=id,tool_name`,
  );
  const toolMap = new Map<string, number>();
  for (const t of allTools) toolMap.set(String(t.tool_name), Number(t.id));

  // --- SKILL_TOOLS (dedup by (skill_id, tool_id)) ---
  const skillIds = Array.from(skillMap.values());
  const existingLinks = await get(
    `/skill_tools?skill_id=in.(${skillIds.join(",")})&select=skill_id,tool_id`,
  );
  const linkKey = (s: number, t: number) => `${s}|${t}`;
  const existingLinkSet = new Set(
    existingLinks.map(l => linkKey(Number(l.skill_id), Number(l.tool_id))),
  );
  const linkRows: Row[] = [];
  for (const st of skillToolSpecs) {
    const sid = skillMap.get(st.skill);
    const tid = toolMap.get(st.tool);
    if (sid == null) throw new Error(`Missing skill id for ${st.skill}`);
    if (tid == null) throw new Error(`Missing tool id for ${st.tool}`);
    if (!existingLinkSet.has(linkKey(sid, tid))) {
      linkRows.push({ skill_id: sid, tool_id: tid, requirement_level: st.requirement_level });
    }
  }
  if (linkRows.length) {
    console.log(`Inserting ${linkRows.length} skill_tools links...`);
    await insert("/skill_tools", linkRows);
  } else {
    console.log("All skill_tools links already present.");
  }

  // --- RETIRE LEGACY SKILL 43 ---
  // Remove its skill_tools rows first (FK), then delete the skill.
  const legacy = await get(`/skills?id=eq.43&select=id,skill_name,domain_id,domain_module_id`);
  if (legacy.length) {
    const legacyLinks = await get(`/skill_tools?skill_id=eq.43&select=id`);
    console.log(`Deleting ${legacyLinks.length} legacy skill_tools rows for skill 43...`);
    await call({ method: "DELETE", path: "/skill_tools?skill_id=eq.43" });
    console.log("Deleting legacy skill 43...");
    await call({ method: "DELETE", path: "/skills?id=eq.43" });
  } else {
    console.log("Legacy skill 43 already gone.");
  }

  // --- VERIFY ---
  console.log("\n=== VERIFICATION ===");
  for (const sname of skillSpecs.map(s => s.skill_name)) {
    const sid = skillMap.get(sname);
    const links = await get(
      `/skill_tools?skill_id=eq.${sid}&select=requirement_level,tools(tool_name,operation_kind,coverage_tier)`,
    );
    console.log(`\n${sname} (id ${sid}) — ${links.length} tools:`);
    for (const l of links) {
      const tool = l.tools as Row;
      console.log(`  - ${tool.tool_name} [${tool.operation_kind}/${tool.coverage_tier}] (${l.requirement_level})`);
    }
  }
  const legacyCheck = await get(`/skills?id=eq.43&select=id`);
  console.log(`\nLegacy skill 43 present: ${legacyCheck.length > 0}`);
  const orphanLinks = await get(`/skill_tools?skill_id=eq.43&select=id`);
  console.log(`Legacy skill_tools (skill 43) present: ${orphanLinks.length}`);
}

await main();
