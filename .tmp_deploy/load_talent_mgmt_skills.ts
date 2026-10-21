// Fix 8 (TALENT-MGMT audit, 2026-05-24): F1 - retire legacy domain-level system
// skill and replace with 3 module-level system skills, re-attaching skill_tools.

type Json = unknown;

async function pg(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: Json): Promise<any> {
  const args: Record<string, unknown> = { method, path };
  if (body !== undefined) args.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(args)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`pg ${method} ${path} failed (${code}): ${err || out}`);
  const trimmed = out.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed);
}

const DOMAIN_ID = 58;
const LEGACY_SKILL_ID = 110;

const MODULES = {
  PM: { id: 51, code: "talent-performance-mgmt" },
  SC: { id: 52, code: "talent-succession-career" },
  CF: { id: 53, code: "talent-continuous-feedback" },
};

const TOOLS = {
  query_performance_reviews: 147,
  query_performance_goals: 704,
  query_succession_plans: 705,
  query_talent_calibrations: 706,
  query_nine_box_placements: 707,
  query_career_aspirations: 708,
  query_feedback_records: 709,
  query_okr_objectives: 77,
  send_email: 37,
  sign_document: 42,
};

type Skill = {
  module_id: number;
  module_code: string;
  skill_name: string;
  description: string;
  tools: Array<{ tool_id: number; tool_name: string; requirement_level: "required" | "optional" | "fallback"; notes: string }>;
};

const SKILLS: Skill[] = [
  {
    module_id: MODULES.PM.id,
    module_code: MODULES.PM.code,
    skill_name: "talent-performance-mgmt-system",
    description: "System skill for the Performance and Goal Management module. Operates the review cycle, goal-setting and OKR workflows, and calibration sessions over the module's mastered data (performance_reviews, performance_goals, okr_objectives, talent_calibrations).",
    tools: [
      { tool_id: TOOLS.query_performance_reviews,  tool_name: "query_performance_reviews",  requirement_level: "required", notes: "Read performance reviews this module masters." },
      { tool_id: TOOLS.query_performance_goals,    tool_name: "query_performance_goals",    requirement_level: "required", notes: "Read performance goals this module masters." },
      { tool_id: TOOLS.query_okr_objectives,       tool_name: "query_okr_objectives",       requirement_level: "required", notes: "Read OKR objectives owned by employees in this module." },
      { tool_id: TOOLS.query_talent_calibrations,  tool_name: "query_talent_calibrations",  requirement_level: "required", notes: "Read calibration sessions this module masters." },
      { tool_id: TOOLS.send_email,                 tool_name: "send_email",                 requirement_level: "required", notes: "Cycle-open / calibration-invite / publish notifications." },
      { tool_id: TOOLS.sign_document,              tool_name: "sign_document",              requirement_level: "optional", notes: "Acknowledgement signing on published reviews in regulated industries." },
    ],
  },
  {
    module_id: MODULES.SC.id,
    module_code: MODULES.SC.code,
    skill_name: "talent-succession-career-system",
    description: "System skill for the Succession and Career Planning module. Operates succession plans, 9-box placement, and career aspiration / development workflows over the module's mastered data (succession_plans, nine_box_placements, career_aspirations).",
    tools: [
      { tool_id: TOOLS.query_succession_plans,     tool_name: "query_succession_plans",     requirement_level: "required", notes: "Read succession plans this module masters." },
      { tool_id: TOOLS.query_nine_box_placements,  tool_name: "query_nine_box_placements",  requirement_level: "required", notes: "Read 9-box placements this module masters." },
      { tool_id: TOOLS.query_career_aspirations,   tool_name: "query_career_aspirations",   requirement_level: "required", notes: "Read employee career aspirations this module masters." },
      { tool_id: TOOLS.query_performance_reviews,  tool_name: "query_performance_reviews",  requirement_level: "required", notes: "Consumer read: 9-box placement and successor readiness draw on calibrated review ratings." },
      { tool_id: TOOLS.query_talent_calibrations,  tool_name: "query_talent_calibrations",  requirement_level: "required", notes: "Consumer read: placement confirmation depends on calibration session outcomes." },
      { tool_id: TOOLS.send_email,                 tool_name: "send_email",                 requirement_level: "required", notes: "Succession-plan publish notifications and career-conversation reminders." },
    ],
  },
  {
    module_id: MODULES.CF.id,
    module_code: MODULES.CF.code,
    skill_name: "talent-continuous-feedback-system",
    description: "System skill for the Continuous Feedback and Recognition module. Operates feedback authoring, sharing, and acknowledgement workflows over the module's mastered data (feedback_records).",
    tools: [
      { tool_id: TOOLS.query_feedback_records,     tool_name: "query_feedback_records",     requirement_level: "required", notes: "Read feedback records this module masters." },
      { tool_id: TOOLS.send_email,                 tool_name: "send_email",                 requirement_level: "required", notes: "Delivery of shared feedback notifications to recipients." },
    ],
  },
];

async function ensureSkill(s: Skill): Promise<number> {
  const existing = await pg("GET", `/skills?skill_name=eq.${encodeURIComponent(s.skill_name)}&select=id`);
  if (existing && existing.length) return existing[0].id;
  await pg("POST", "/skills", [
    {
      skill_name: s.skill_name,
      description: s.description,
      skill_type: "system",
      domain_id: DOMAIN_ID,
      domain_module_id: s.module_id,
    },
  ]);
  const reread = await pg("GET", `/skills?skill_name=eq.${encodeURIComponent(s.skill_name)}&select=id`);
  return reread[0].id;
}

async function ensureSkillTool(skillId: number, toolId: number, requirementLevel: string, notes: string, skillName: string, toolName: string) {
  const existing = await pg(
    "GET",
    `/skill_tools?skill_id=eq.${skillId}&tool_id=eq.${toolId}&select=id`,
  );
  if (existing && existing.length) return false;
  await pg("POST", "/skill_tools", [
    {
      skill_tool_label: `${skillName} needs ${toolName}`,
      skill_id: skillId,
      tool_id: toolId,
      requirement_level: requirementLevel,
      notes,
    },
  ]);
  return true;
}

async function main() {
  // Step 1: load 3 module-level system skills
  const skillIds: number[] = [];
  for (const s of SKILLS) {
    const id = await ensureSkill(s);
    console.log(`skill ${s.skill_name} -> id ${id}`);
    skillIds.push(id);

    for (const t of s.tools) {
      await ensureSkillTool(id, t.tool_id, t.requirement_level, t.notes, s.skill_name, t.tool_name);
    }
  }

  // Step 2: retire legacy skill - delete its skill_tools, then the skill itself
  const legacyTools = await pg("GET", `/skill_tools?skill_id=eq.${LEGACY_SKILL_ID}&select=id`);
  if (legacyTools && legacyTools.length) {
    await pg("DELETE", `/skill_tools?skill_id=eq.${LEGACY_SKILL_ID}`);
    console.log(`deleted ${legacyTools.length} legacy skill_tools rows`);
  }
  const legacySkill = await pg("GET", `/skills?id=eq.${LEGACY_SKILL_ID}&select=id`);
  if (legacySkill && legacySkill.length) {
    await pg("DELETE", `/skills?id=eq.${LEGACY_SKILL_ID}`);
    console.log(`deleted legacy skill id=${LEGACY_SKILL_ID}`);
  }

  console.log("Fix 8 complete.");
}

await main();
