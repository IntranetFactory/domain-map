#!/usr/bin/env bun
// LMS F2/F3/F5 fix (2026-05-25):
//   - Creates 3 module-level system skills (1 per domain_modules row), per Rule #17.
//   - Redistributes the 11 existing skill_tools rows from legacy `lms-system` (id 23)
//     across the 3 new skills along the data-object boundary.
//   - Retires the legacy `lms-system` row so F1 also passes.
//
// Idempotent: reads existing rows by natural key (skill_name and (skill_id, tool_id))
// and only inserts what's missing. Legacy-row cleanup is no-op on re-run.
//
// Per Rule #1: all new rows get record_status='new' by DB default (field omitted).
// Per Rule #0: invoked from the project root so the CLI reads the right .env.

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

const get = (path: string) => call({ method: "GET", path });
const post = (path: string, body: Row[]) => call({ method: "POST", path, body });
const del = (path: string) => call({ method: "DELETE", path });

// ============================================================
// Fixed inputs (verified against live state 2026-05-25)
// ============================================================

const LMS_DOMAIN_ID = 57;
const LEGACY_SKILL_ID = 23;

type ModuleSkill = {
  module_id: number;
  module_code: string;
  skill_name: string;
  description: string;
};

const moduleSkills: ModuleSkill[] = [
  {
    module_id: 32,
    module_code: "LMS-COURSE-DELIVERY",
    skill_name: "lms_course_delivery_agent",
    description: "System skill for LMS-COURSE-DELIVERY: course authoring, content delivery, enrollment lifecycle, and transcript posting. Masters courses, course_enrollments, learning_records.",
  },
  {
    module_id: 33,
    module_code: "LMS-COMPLIANCE-TRAINING",
    skill_name: "lms_compliance_training_agent",
    description: "System skill for LMS-COMPLIANCE-TRAINING: mandatory regulatory training assignment, tracking, certification, and evidence retention. Masters compliance_assignments, learner_certifications.",
  },
  {
    module_id: 34,
    module_code: "LMS-SKILLS",
    skill_name: "lms_skills_agent",
    description: "System skill for LMS-SKILLS: skill profiles, competency tracking, and learning-path recommendation. Masters skill_profiles, learning_paths.",
  },
];

// Tool redistribution. Tool ids verified against live skill_tools on legacy skill 23.
type ToolLink = {
  module_id: number;
  tool_id: number;
  tool_name: string;
  notes: string;
};

const toolLinks: ToolLink[] = [
  // 32 - LMS-COURSE-DELIVERY
  { module_id: 32, tool_id: 217, tool_name: "query_courses", notes: "" },
  { module_id: 32, tool_id: 218, tool_name: "query_course_enrollments", notes: "" },
  { module_id: 32, tool_id: 148, tool_name: "query_learning_records", notes: "" },
  { module_id: 32, tool_id: 252, tool_name: "enroll_in_course", notes: "" },
  { module_id: 32, tool_id: 253, tool_name: "complete_course", notes: "" },
  { module_id: 32, tool_id: 37, tool_name: "send_email", notes: "Enrollment confirmations + completion notifications" },

  // 33 - LMS-COMPLIANCE-TRAINING
  { module_id: 33, tool_id: 221, tool_name: "query_compliance_assignments", notes: "" },
  { module_id: 33, tool_id: 220, tool_name: "query_certifications", notes: "" },
  { module_id: 33, tool_id: 254, tool_name: "assign_compliance_training", notes: "" },
  { module_id: 33, tool_id: 37, tool_name: "send_email", notes: "Due-date reminders + certificate distribution + overdue escalation" },

  // 34 - LMS-SKILLS
  { module_id: 34, tool_id: 219, tool_name: "query_learning_paths", notes: "" },
  { module_id: 34, tool_id: 222, tool_name: "query_skill_profiles", notes: "" },
  { module_id: 34, tool_id: 37, tool_name: "send_email", notes: "Path-assignment nudges + skill-validation reminders" },
];

// ============================================================
// Run
// ============================================================

async function main() {
  console.log("LMS F2 fix - module-level system skills");
  console.log("======================================\n");

  // 1. Sanity-check legacy row exists.
  const legacy = await get(`/skills?id=eq.${LEGACY_SKILL_ID}&select=id,skill_name,skill_type,domain_id,domain_module_id`);
  if (legacy.length === 1) {
    console.log(`Legacy row found: id=${LEGACY_SKILL_ID} skill_name="${legacy[0].skill_name}" (will be retired at the end).`);
  } else if (legacy.length === 0) {
    console.log(`Legacy row id=${LEGACY_SKILL_ID} already gone (re-run).`);
  } else {
    throw new Error(`Unexpected row count for legacy skill id=${LEGACY_SKILL_ID}: ${legacy.length}`);
  }

  // 2. Insert new module-level skills (idempotent on skill_name).
  const existingSkills = await get(`/skills?domain_id=eq.${LMS_DOMAIN_ID}&select=id,skill_name`);
  const existingByName = new Map<string, number>();
  for (const r of existingSkills) existingByName.set(String(r.skill_name), Number(r.id));

  const toInsert = moduleSkills
    .filter(s => !existingByName.has(s.skill_name))
    .map(s => ({
      skill_name: s.skill_name,
      description: s.description,
      skill_type: "system",
      domain_id: LMS_DOMAIN_ID,
      domain_module_id: s.module_id,
    }));

  if (toInsert.length > 0) {
    console.log(`\nInserting ${toInsert.length} new module-level system skills...`);
    await post("/skills", toInsert);
  } else {
    console.log("\nAll 3 module-level system skills already present.");
  }

  // 3. Re-read to build skill_name -> id map.
  const allSkills = await get(`/skills?domain_id=eq.${LMS_DOMAIN_ID}&skill_type=eq.system&select=id,skill_name,domain_module_id`);
  const skillByName = new Map<string, number>();
  const skillByModule = new Map<number, number>();
  for (const r of allSkills) {
    skillByName.set(String(r.skill_name), Number(r.id));
    if (r.domain_module_id !== null) {
      skillByModule.set(Number(r.domain_module_id), Number(r.id));
    }
  }
  for (const s of moduleSkills) {
    const id = skillByName.get(s.skill_name);
    if (!id) throw new Error(`Skill ${s.skill_name} not found after insert`);
    console.log(`  skill ${s.skill_name} -> id ${id} (module ${s.module_id} / ${s.module_code})`);
  }

  // 4. Insert skill_tools rows (idempotent on (skill_id, tool_id)).
  const newSkillIds = moduleSkills.map(s => skillByModule.get(s.module_id)!).filter(Boolean);
  const existingSkillTools = await get(`/skill_tools?skill_id=in.(${newSkillIds.join(",")})&select=skill_id,tool_id`);
  const existingPairs = new Set(existingSkillTools.map(r => `${r.skill_id}:${r.tool_id}`));

  const skillToolsToInsert: Row[] = [];
  for (const link of toolLinks) {
    const skill_id = skillByModule.get(link.module_id);
    if (!skill_id) throw new Error(`No skill for module ${link.module_id}`);
    const key = `${skill_id}:${link.tool_id}`;
    if (existingPairs.has(key)) continue;
    const skillName = moduleSkills.find(m => m.module_id === link.module_id)!.skill_name;
    skillToolsToInsert.push({
      skill_id,
      tool_id: link.tool_id,
      skill_tool_label: `${skillName} needs ${link.tool_name}`,
      requirement_level: "required",
      notes: link.notes,
    });
  }

  if (skillToolsToInsert.length > 0) {
    console.log(`\nInserting ${skillToolsToInsert.length} new skill_tools rows...`);
    await post("/skill_tools", skillToolsToInsert);
  } else {
    console.log("\nAll skill_tools rows already present.");
  }

  // 5. Retire legacy lms-system row.
  //    First delete its skill_tools (FK), then the skill row.
  if (legacy.length === 1) {
    const legacyTools = await get(`/skill_tools?skill_id=eq.${LEGACY_SKILL_ID}&select=id`);
    console.log(`\nDeleting ${legacyTools.length} legacy skill_tools rows (skill_id=${LEGACY_SKILL_ID})...`);
    if (legacyTools.length > 0) {
      await del(`/skill_tools?skill_id=eq.${LEGACY_SKILL_ID}`);
    }
    console.log(`Deleting legacy skill row id=${LEGACY_SKILL_ID}...`);
    await del(`/skills?id=eq.${LEGACY_SKILL_ID}`);
  }

  // 6. Verify F2 / F3 / F5 pass.
  console.log("\nVerification");
  console.log("------------");
  const verifySkills = await get(`/skills?or=(domain_id.eq.${LMS_DOMAIN_ID},domain_module_id.in.(32,33,34))&select=id,skill_name,skill_type,domain_module_id&order=domain_module_id.asc`);
  console.log(`Skills on LMS: ${verifySkills.length} rows`);
  for (const s of verifySkills) {
    console.log(`  id=${s.id} skill_name=${s.skill_name} type=${s.skill_type} module=${s.domain_module_id}`);
  }

  for (const m of moduleSkills) {
    const skill_id = skillByModule.get(m.module_id);
    if (!skill_id) continue;
    const tools = await get(`/skill_tools?skill_id=eq.${skill_id}&select=tools(tool_name,operation_kind)`);
    const total = tools.length;
    const covered = tools.filter((t: Row) => {
      const op = (t.tools as Row).operation_kind;
      return op === "query" || op === "mutate";
    }).length;
    const score = total === 0 ? 0 : Math.round((covered / total) * 100);
    console.log(`  ${m.module_code}: ${covered}/${total} Semantius-covered = ${score}%`);
  }

  console.log("\nDone.");
}

await main();
