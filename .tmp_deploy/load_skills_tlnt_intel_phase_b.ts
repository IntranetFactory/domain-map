#!/usr/bin/env bun
// Phase B + migration loader for SKILLS-MGMT + TLNT-INTEL.
// Idempotent. Run from project root: bun run c:/dev/domain-map/.tmp_deploy/load_skills_tlnt_intel_phase_b.ts
//
// Scope:
//   1. Insert 13 new data_objects (6 SKILLS-MGMT + 7 TLNT-INTEL)
//   2. domain_data_objects + domain_module_data_objects for new masters + cross-domain links
//   3. skill_profiles (id 172) migration: LMS-SKILLS master --> SKILLS-MGMT master
//   4. Rename module LMS-SKILLS --> LMS-PATHS (domain_module_code/name/description)
//   5. Re-point skill_profiles lifecycle states (states 186, 187) from module 34 --> 174
//   6. Permission reprefix:
//        - baseline lms-skills:read/manage/admin --> lms-paths:* (module 34 stays)
//        - workflow-gate lms-skills:*_skill_profile --> skills-mgmt:* (module 34 --> 174)
//        - workflow-gate lms-skills:*_learning_path --> lms-paths:* (module 34 stays)
//   7. Add baseline permissions (3 each) for 5 new modules (SKILLS-MGMT-PROFILE/TAXONOMY +
//      TLNT-INTEL-MARKETPLACE/MOBILITY/INSIGHTS)
//   8. Re-point handoffs (2 outbound + 5 inbound) from LMS-SKILLS (module 34) to SKILLS-MGMT-PROFILE
//      (module 174), and update domain_id accordingly. Excludes handoff 1082 (learning_path.assigned)
//      which stays on the renamed LMS-PATHS module.
//   9. Add lifecycle states for new workflow-bearing masters
//   10. Add data_object_relationships (intra-domain + cross-domain + users edges per Rule #10)
//   11. Add data_object_aliases
//   12. ATS embedded_master + optional on internal_opportunities (host: ATS-CANDIDATE-CRM)

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

// Workaround: invoke semantius via a fresh bash heredoc per call. The Windows/Bun
// subprocess paths (Bun.spawn stdin, Bun.spawn inline-arg, execFileSync inline-arg, and
// cmd.exe type-pipe) all yield PGRST102 "Empty or invalid json" after a large prior
// response. A plain bash heredoc is the one mechanism that works reliably. We write
// the heredoc to a tmp file and run it via bash.
import { execFileSync } from "node:child_process";

let callCounter = 0;
async function call(body: Row): Promise<Row[]> {
  const json = JSON.stringify(body);
  ++callCounter;
  try {
    const stdout = execFileSync("semantius", ["call", "crud", "postgrestRequest", json], {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
      windowsHide: true,
      shell: false,
    });
    const text = stdout.trim();
    return text ? JSON.parse(text) : [];
  } catch (err: any) {
    const stderr = err?.stderr?.toString?.() ?? String(err);
    throw new Error(`semantius call failed: ${stderr}\n--- payload (first 500 chars) ---\n${json.slice(0, 500)}`);
  }
}

const get = (path: string) => call({ method: "GET", path });

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 1;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

async function del(path: string): Promise<Row[]> {
  return call({ method: "DELETE", path });
}

async function syncTable<T extends Row>(
  path: string,
  rows: T[],
  keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new rows into ${path} (${existing.length} present)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} present, nothing to insert`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

async function syncJunction(
  path: string,
  rows: Row[],
  keyer: (r: Row) => string,
  readPath: string,
): Promise<void> {
  const existing = await get(readPath);
  const existingKeys = new Set(existing.map(keyer));
  const missing = rows.filter(r => !existingKeys.has(keyer(r)));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new rows into ${path} (${existing.length} present, ${rows.length} declared)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} present (of ${rows.length} declared), nothing to insert`);
  }
}

// ============================================================
// CONSTANTS (from Phase A load + pre-load reconnaissance)
// ============================================================

const DOMAIN = {
  SKILLS_MGMT: 169,
  TLNT_INTEL: 170,
  LMS: 57,
  ATS: 56,
  HCM: 54,
  TALENT_MGMT: 58,
  SWP: 100,
};

const MOD = {
  SKILLS_MGMT_TAXONOMY: 173,
  SKILLS_MGMT_PROFILE: 174,
  TLNT_INTEL_MARKETPLACE: 175,
  TLNT_INTEL_MOBILITY: 176,
  TLNT_INTEL_INSIGHTS: 177,
  LMS_SKILLS: 34, // renamed to LMS-PATHS in step 4
  LMS_COURSE_DELIVERY: 32,
  LMS_COMPLIANCE_TRAINING: 33,
  TALENT_PERFORMANCE_MGMT: 51,
  HCM_LIFECYCLE_WORKFLOWS: 56,
  ATS_CANDIDATE_CRM: 1,
  ATS_RECRUITMENT_PIPELINE: 4,
};

const DOBJ = {
  skill_profiles: 172,
  job_profiles: 33,
  skills_gap_analyses: 26,
  employees: -1, // resolved at runtime
  learner_certifications: 171,
  course_enrollments: 169,
  performance_goals: 175,
  career_aspirations: 179,
  succession_plans: 176,
  job_requisitions: -1,
  job_postings: -1,
  candidates: -1,
  users: 748, // platform_builtin
};

// ============================================================
// PHASE B.1 — New data_objects
// ============================================================

type DataObjectDraft = {
  data_object_name: string;
  singular_label: string;
  plural_label: string;
  description: string;
  kind: "domain_owned";
  has_personal_content?: boolean;
  has_submit_lock?: boolean;
  has_single_approver?: boolean;
};

const newDataObjects: DataObjectDraft[] = [
  // SKILLS-MGMT (6 new)
  { data_object_name: "skill_taxonomies", singular_label: "Skill Taxonomy", plural_label: "Skill Taxonomies", description: "Versioned ontology of skill nodes, synonyms, parent-child relationships, and source (Lightcast OEM, in-house curated).", kind: "domain_owned", has_submit_lock: true },
  { data_object_name: "skills", singular_label: "Skill", plural_label: "Skills", description: "Individual skill node belonging to a taxonomy version; the row referenced by every profile entry, competency-model entry, and inference run.", kind: "domain_owned" },
  { data_object_name: "skill_assessments", singular_label: "Skill Assessment", plural_label: "Skill Assessments", description: "Discrete proficiency-rating event against a skill, with rater, method (self, manager, peer, test), score, and timestamp.", kind: "domain_owned", has_personal_content: true, has_submit_lock: true },
  { data_object_name: "skill_endorsements", singular_label: "Skill Endorsement", plural_label: "Skill Endorsements", description: "Peer or manager validation of a claimed or inferred skill on a profile; one-shot social signal distinct from a formal assessment.", kind: "domain_owned", has_personal_content: true },
  { data_object_name: "competency_models", singular_label: "Competency Model", plural_label: "Competency Models", description: "Role-anchored bundle of required skills plus target proficiency levels, used for gap analysis and internal matching.", kind: "domain_owned", has_submit_lock: true, has_single_approver: true },
  { data_object_name: "skill_inference_runs", singular_label: "Skill Inference Run", plural_label: "Skill Inference Runs", description: "Audit record of a passive skill-inference batch on skill profiles: model version, input signals (learning, performance, work activity), outputs, timestamp.", kind: "domain_owned" },

  // TLNT-INTEL (7 new)
  { data_object_name: "internal_opportunities", singular_label: "Opportunity", plural_label: "Opportunities", description: "Internal postings covering full-time roles, gigs, projects, stretch assignments, and mentorships.", kind: "domain_owned", has_submit_lock: true, has_single_approver: true },
  { data_object_name: "opportunity_applications", singular_label: "Application", plural_label: "Applications", description: "Employee expression of interest in an internal opportunity, with status workflow (submitted, reviewed, accepted, rejected, withdrawn).", kind: "domain_owned", has_personal_content: true, has_submit_lock: true },
  { data_object_name: "mobility_recommendations", singular_label: "Mobility Recommendation", plural_label: "Mobility Recommendations", description: "AI-generated next-move suggestions for an employee, with rationale and freshness.", kind: "domain_owned" },
  { data_object_name: "fit_scores", singular_label: "Fit Score", plural_label: "Fit Scores", description: "Computed match between a person and a role or opportunity, with score, model version, drivers.", kind: "domain_owned" },
  { data_object_name: "career_path_suggestions", singular_label: "Career Path", plural_label: "Career Paths", description: "AI-projected route from a current role toward an aspiration, with required skills (distinct from employee-authored career_aspirations).", kind: "domain_owned" },
  { data_object_name: "mentorship_engagements", singular_label: "Mentorship", plural_label: "Mentorships", description: "Matched mentor-mentee relationship with goals, cadence, and status.", kind: "domain_owned", has_personal_content: true },
  { data_object_name: "match_inference_runs", singular_label: "Match Inference Run", plural_label: "Match Inference Runs", description: "Audit record of a matching or scoring batch: model version, inputs (skill profiles, opportunities, roles), outputs (fit scores, recommendations), timestamp.", kind: "domain_owned" },
];

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("Phase B + migration loader: SKILLS-MGMT + TLNT-INTEL");
  console.log("=".repeat(60));

  // ------------------------------------------------------------
  // 1. Resolve runtime data_object ids
  // ------------------------------------------------------------
  console.log("\n[1] Resolving runtime data_object ids");
  const lookups = await get("/data_objects?data_object_name=in.(employees,job_requisitions,job_postings,candidates)&select=id,data_object_name");
  for (const r of lookups) {
    if (r.data_object_name === "employees") DOBJ.employees = Number(r.id);
    if (r.data_object_name === "job_requisitions") DOBJ.job_requisitions = Number(r.id);
    if (r.data_object_name === "job_postings") DOBJ.job_postings = Number(r.id);
    if (r.data_object_name === "candidates") DOBJ.candidates = Number(r.id);
  }
  console.log(`  employees=${DOBJ.employees}, job_requisitions=${DOBJ.job_requisitions}, job_postings=${DOBJ.job_postings}, candidates=${DOBJ.candidates}`);

  // ------------------------------------------------------------
  // 2. Insert new data_objects
  // ------------------------------------------------------------
  console.log("\n[2] Inserting new data_objects");
  const dobjIds = await syncTable("/data_objects", newDataObjects, "data_object_name");
  // Merge into DOBJ
  const D = {
    ...DOBJ,
    skill_taxonomies: dobjIds.get("skill_taxonomies")!,
    skills: dobjIds.get("skills")!,
    skill_assessments: dobjIds.get("skill_assessments")!,
    skill_endorsements: dobjIds.get("skill_endorsements")!,
    competency_models: dobjIds.get("competency_models")!,
    skill_inference_runs: dobjIds.get("skill_inference_runs")!,
    internal_opportunities: dobjIds.get("internal_opportunities")!,
    opportunity_applications: dobjIds.get("opportunity_applications")!,
    mobility_recommendations: dobjIds.get("mobility_recommendations")!,
    fit_scores: dobjIds.get("fit_scores")!,
    career_path_suggestions: dobjIds.get("career_path_suggestions")!,
    mentorship_engagements: dobjIds.get("mentorship_engagements")!,
    match_inference_runs: dobjIds.get("match_inference_runs")!,
  };

  // ------------------------------------------------------------
  // 3. domain_data_objects: new masters + skill_profiles migration
  // ------------------------------------------------------------
  console.log("\n[3] domain_data_objects (rollup level)");

  // 3a. Remove old skill_profiles master row on LMS (will be replaced by SKILLS-MGMT master)
  const existingDDO = await get(`/domain_data_objects?data_object_id=eq.${D.skill_profiles}&domain_id=eq.${DOMAIN.LMS}&role=eq.master&select=id`);
  if (existingDDO.length > 0) {
    console.log(`  removing LMS master row on skill_profiles (id ${existingDDO[0].id})`);
    await del(`/domain_data_objects?id=eq.${existingDDO[0].id}`);
  } else {
    console.log(`  LMS master row on skill_profiles already gone`);
  }

  // 3b. Build full DDO set
  type DDO = { domain_id: number; data_object_id: number; role: string; necessity: string };
  const ddoRows: DDO[] = [
    // SKILLS-MGMT masters
    { domain_id: DOMAIN.SKILLS_MGMT, data_object_id: D.skill_profiles, role: "master", necessity: "required" },
    { domain_id: DOMAIN.SKILLS_MGMT, data_object_id: D.skill_taxonomies, role: "master", necessity: "required" },
    { domain_id: DOMAIN.SKILLS_MGMT, data_object_id: D.skills, role: "master", necessity: "required" },
    { domain_id: DOMAIN.SKILLS_MGMT, data_object_id: D.skill_assessments, role: "master", necessity: "required" },
    { domain_id: DOMAIN.SKILLS_MGMT, data_object_id: D.skill_endorsements, role: "master", necessity: "required" },
    { domain_id: DOMAIN.SKILLS_MGMT, data_object_id: D.competency_models, role: "master", necessity: "required" },
    { domain_id: DOMAIN.SKILLS_MGMT, data_object_id: D.skill_inference_runs, role: "master", necessity: "required" },
    // SKILLS-MGMT contributor on SWP-mastered skills_gap_analyses (SWP keeps mastery; see notes)
    { domain_id: DOMAIN.SKILLS_MGMT, data_object_id: D.skills_gap_analyses, role: "contributor", necessity: "required" },
    // SKILLS-MGMT embeds employees (HCM-mastered) + job_profiles (HCM-mastered)
    { domain_id: DOMAIN.SKILLS_MGMT, data_object_id: D.employees, role: "embedded_master", necessity: "required" },
    { domain_id: DOMAIN.SKILLS_MGMT, data_object_id: D.job_profiles, role: "embedded_master", necessity: "required" },
    // SKILLS-MGMT contributors from learning signals
    { domain_id: DOMAIN.SKILLS_MGMT, data_object_id: D.learner_certifications, role: "contributor", necessity: "required" },
    { domain_id: DOMAIN.SKILLS_MGMT, data_object_id: D.course_enrollments, role: "contributor", necessity: "required" },
    { domain_id: DOMAIN.SKILLS_MGMT, data_object_id: D.performance_goals, role: "contributor", necessity: "optional" },

    // TLNT-INTEL masters
    { domain_id: DOMAIN.TLNT_INTEL, data_object_id: D.internal_opportunities, role: "master", necessity: "required" },
    { domain_id: DOMAIN.TLNT_INTEL, data_object_id: D.opportunity_applications, role: "master", necessity: "required" },
    { domain_id: DOMAIN.TLNT_INTEL, data_object_id: D.mobility_recommendations, role: "master", necessity: "required" },
    { domain_id: DOMAIN.TLNT_INTEL, data_object_id: D.fit_scores, role: "master", necessity: "required" },
    { domain_id: DOMAIN.TLNT_INTEL, data_object_id: D.career_path_suggestions, role: "master", necessity: "required" },
    { domain_id: DOMAIN.TLNT_INTEL, data_object_id: D.mentorship_engagements, role: "master", necessity: "required" },
    { domain_id: DOMAIN.TLNT_INTEL, data_object_id: D.match_inference_runs, role: "master", necessity: "required" },
    // TLNT-INTEL consumers from SKILLS-MGMT
    { domain_id: DOMAIN.TLNT_INTEL, data_object_id: D.skill_profiles, role: "consumer", necessity: "required" },
    { domain_id: DOMAIN.TLNT_INTEL, data_object_id: D.competency_models, role: "consumer", necessity: "required" },
    { domain_id: DOMAIN.TLNT_INTEL, data_object_id: D.skill_taxonomies, role: "consumer", necessity: "required" },
    // TLNT-INTEL consumer of SWP-mastered skills_gap_analyses (for the heatmap)
    { domain_id: DOMAIN.TLNT_INTEL, data_object_id: D.skills_gap_analyses, role: "consumer", necessity: "required" },
    // TLNT-INTEL embeds employees + consumes job_profiles + ATS req/posting + TALENT-MGMT signals
    { domain_id: DOMAIN.TLNT_INTEL, data_object_id: D.employees, role: "embedded_master", necessity: "required" },
    { domain_id: DOMAIN.TLNT_INTEL, data_object_id: D.job_profiles, role: "consumer", necessity: "required" },
    { domain_id: DOMAIN.TLNT_INTEL, data_object_id: D.job_requisitions, role: "consumer", necessity: "required" },
    { domain_id: DOMAIN.TLNT_INTEL, data_object_id: D.job_postings, role: "consumer", necessity: "required" },
    { domain_id: DOMAIN.TLNT_INTEL, data_object_id: D.performance_goals, role: "consumer", necessity: "optional" },
    { domain_id: DOMAIN.TLNT_INTEL, data_object_id: D.succession_plans, role: "consumer", necessity: "optional" },
    { domain_id: DOMAIN.TLNT_INTEL, data_object_id: D.career_aspirations, role: "consumer", necessity: "required" },

    // LMS rewiring: becomes consumer of skill_profiles after migration
    { domain_id: DOMAIN.LMS, data_object_id: D.skill_profiles, role: "consumer", necessity: "optional" },
  ];

  await syncJunction(
    "/domain_data_objects",
    ddoRows,
    r => `${r.domain_id}|${r.data_object_id}|${r.role}`,
    "/domain_data_objects?select=domain_id,data_object_id,role&limit=20000",
  );

  // ------------------------------------------------------------
  // 4. domain_module_data_objects (module-level)
  // ------------------------------------------------------------
  console.log("\n[4] domain_module_data_objects (module level)");

  // 4a. Remove old skill_profiles master row on LMS-SKILLS module
  const existingDMDO = await get(`/domain_module_data_objects?data_object_id=eq.${D.skill_profiles}&domain_module_id=eq.${MOD.LMS_SKILLS}&role=eq.master&select=id`);
  if (existingDMDO.length > 0) {
    console.log(`  removing LMS-SKILLS module master row on skill_profiles (id ${existingDMDO[0].id})`);
    await del(`/domain_module_data_objects?id=eq.${existingDMDO[0].id}`);
  } else {
    console.log(`  LMS-SKILLS module master row on skill_profiles already gone`);
  }

  type DMDO = { domain_module_id: number; data_object_id: number; role: string; necessity: string };
  const dmdoRows: DMDO[] = [
    // SKILLS-MGMT-TAXONOMY masters
    { domain_module_id: MOD.SKILLS_MGMT_TAXONOMY, data_object_id: D.skill_taxonomies, role: "master", necessity: "required" },
    { domain_module_id: MOD.SKILLS_MGMT_TAXONOMY, data_object_id: D.skills, role: "master", necessity: "required" },
    { domain_module_id: MOD.SKILLS_MGMT_TAXONOMY, data_object_id: D.competency_models, role: "master", necessity: "required" },
    { domain_module_id: MOD.SKILLS_MGMT_TAXONOMY, data_object_id: D.job_profiles, role: "embedded_master", necessity: "required" },

    // SKILLS-MGMT-PROFILE masters
    { domain_module_id: MOD.SKILLS_MGMT_PROFILE, data_object_id: D.skill_profiles, role: "master", necessity: "required" },
    { domain_module_id: MOD.SKILLS_MGMT_PROFILE, data_object_id: D.skill_assessments, role: "master", necessity: "required" },
    { domain_module_id: MOD.SKILLS_MGMT_PROFILE, data_object_id: D.skill_endorsements, role: "master", necessity: "required" },
    { domain_module_id: MOD.SKILLS_MGMT_PROFILE, data_object_id: D.skill_inference_runs, role: "master", necessity: "required" },
    { domain_module_id: MOD.SKILLS_MGMT_PROFILE, data_object_id: D.skills_gap_analyses, role: "contributor", necessity: "required" },
    { domain_module_id: MOD.SKILLS_MGMT_PROFILE, data_object_id: D.employees, role: "embedded_master", necessity: "required" },
    { domain_module_id: MOD.SKILLS_MGMT_PROFILE, data_object_id: D.learner_certifications, role: "contributor", necessity: "required" },
    { domain_module_id: MOD.SKILLS_MGMT_PROFILE, data_object_id: D.course_enrollments, role: "contributor", necessity: "required" },
    { domain_module_id: MOD.SKILLS_MGMT_PROFILE, data_object_id: D.performance_goals, role: "contributor", necessity: "optional" },
    { domain_module_id: MOD.SKILLS_MGMT_PROFILE, data_object_id: D.competency_models, role: "consumer", necessity: "required" },
    { domain_module_id: MOD.SKILLS_MGMT_PROFILE, data_object_id: D.skill_taxonomies, role: "consumer", necessity: "required" },
    { domain_module_id: MOD.SKILLS_MGMT_PROFILE, data_object_id: D.skills, role: "consumer", necessity: "required" },

    // TLNT-INTEL-MARKETPLACE masters
    { domain_module_id: MOD.TLNT_INTEL_MARKETPLACE, data_object_id: D.internal_opportunities, role: "master", necessity: "required" },
    { domain_module_id: MOD.TLNT_INTEL_MARKETPLACE, data_object_id: D.opportunity_applications, role: "master", necessity: "required" },
    { domain_module_id: MOD.TLNT_INTEL_MARKETPLACE, data_object_id: D.mentorship_engagements, role: "master", necessity: "required" },
    { domain_module_id: MOD.TLNT_INTEL_MARKETPLACE, data_object_id: D.employees, role: "embedded_master", necessity: "required" },
    { domain_module_id: MOD.TLNT_INTEL_MARKETPLACE, data_object_id: D.skill_profiles, role: "consumer", necessity: "required" },
    { domain_module_id: MOD.TLNT_INTEL_MARKETPLACE, data_object_id: D.fit_scores, role: "consumer", necessity: "required" },

    // TLNT-INTEL-MOBILITY masters
    { domain_module_id: MOD.TLNT_INTEL_MOBILITY, data_object_id: D.mobility_recommendations, role: "master", necessity: "required" },
    { domain_module_id: MOD.TLNT_INTEL_MOBILITY, data_object_id: D.fit_scores, role: "master", necessity: "required" },
    { domain_module_id: MOD.TLNT_INTEL_MOBILITY, data_object_id: D.career_path_suggestions, role: "master", necessity: "required" },
    { domain_module_id: MOD.TLNT_INTEL_MOBILITY, data_object_id: D.match_inference_runs, role: "master", necessity: "required" },
    { domain_module_id: MOD.TLNT_INTEL_MOBILITY, data_object_id: D.skill_profiles, role: "consumer", necessity: "required" },
    { domain_module_id: MOD.TLNT_INTEL_MOBILITY, data_object_id: D.competency_models, role: "consumer", necessity: "required" },
    { domain_module_id: MOD.TLNT_INTEL_MOBILITY, data_object_id: D.skill_taxonomies, role: "consumer", necessity: "required" },
    { domain_module_id: MOD.TLNT_INTEL_MOBILITY, data_object_id: D.employees, role: "embedded_master", necessity: "required" },
    { domain_module_id: MOD.TLNT_INTEL_MOBILITY, data_object_id: D.job_profiles, role: "consumer", necessity: "required" },
    { domain_module_id: MOD.TLNT_INTEL_MOBILITY, data_object_id: D.job_requisitions, role: "consumer", necessity: "required" },
    { domain_module_id: MOD.TLNT_INTEL_MOBILITY, data_object_id: D.job_postings, role: "consumer", necessity: "required" },
    { domain_module_id: MOD.TLNT_INTEL_MOBILITY, data_object_id: D.career_aspirations, role: "consumer", necessity: "required" },
    { domain_module_id: MOD.TLNT_INTEL_MOBILITY, data_object_id: D.succession_plans, role: "consumer", necessity: "optional" },
    { domain_module_id: MOD.TLNT_INTEL_MOBILITY, data_object_id: D.performance_goals, role: "consumer", necessity: "optional" },
    { domain_module_id: MOD.TLNT_INTEL_MOBILITY, data_object_id: D.internal_opportunities, role: "consumer", necessity: "required" },

    // TLNT-INTEL-INSIGHTS (analytics surface; reads heavily, masters nothing)
    { domain_module_id: MOD.TLNT_INTEL_INSIGHTS, data_object_id: D.skill_profiles, role: "consumer", necessity: "required" },
    { domain_module_id: MOD.TLNT_INTEL_INSIGHTS, data_object_id: D.competency_models, role: "consumer", necessity: "required" },
    { domain_module_id: MOD.TLNT_INTEL_INSIGHTS, data_object_id: D.skills_gap_analyses, role: "consumer", necessity: "required" },
    { domain_module_id: MOD.TLNT_INTEL_INSIGHTS, data_object_id: D.employees, role: "embedded_master", necessity: "required" },

    // LMS-PATHS becomes consumer of skill_profiles (renamed in step 5)
    { domain_module_id: MOD.LMS_SKILLS, data_object_id: D.skill_profiles, role: "consumer", necessity: "optional" },

    // ATS embedded_master + optional on internal_opportunities (user-confirmed, host: ATS-CANDIDATE-CRM)
    { domain_module_id: MOD.ATS_CANDIDATE_CRM, data_object_id: D.internal_opportunities, role: "embedded_master", necessity: "optional" },
  ];

  await syncJunction(
    "/domain_module_data_objects",
    dmdoRows,
    r => `${r.domain_module_id}|${r.data_object_id}|${r.role}`,
    "/domain_module_data_objects?select=domain_module_id,data_object_id,role&limit=20000",
  );

  // ------------------------------------------------------------
  // 5. Rename LMS-SKILLS module --> LMS-PATHS
  // ------------------------------------------------------------
  console.log("\n[5] Rename module 34: LMS-SKILLS --> LMS-PATHS");
  const current = await get(`/domain_modules?id=eq.${MOD.LMS_SKILLS}&select=domain_module_code,domain_module_name`);
  if (current.length > 0 && current[0].domain_module_code === "LMS-SKILLS") {
    await patch(`/domain_modules?id=eq.${MOD.LMS_SKILLS}`, {
      domain_module_code: "LMS-PATHS",
      domain_module_name: "Learning Paths",
      description: "Authors and assigns sequenced learning paths inside the LMS. Masters learning_paths; consumes skill_profiles (mastered by SKILLS-MGMT after migration) to recommend paths against skill gaps.",
    });
    console.log(`  module ${MOD.LMS_SKILLS} renamed to LMS-PATHS`);
  } else if (current.length > 0 && current[0].domain_module_code === "LMS-PATHS") {
    console.log(`  module ${MOD.LMS_SKILLS} already named LMS-PATHS, skipping`);
  } else {
    throw new Error(`module ${MOD.LMS_SKILLS} not found or in unexpected state`);
  }

  // ------------------------------------------------------------
  // 6. Re-point skill_profiles lifecycle states from module 34 to module 174
  // ------------------------------------------------------------
  console.log("\n[6] Re-point skill_profiles lifecycle states");
  const states = await get(`/data_object_lifecycle_states?data_object_id=eq.${D.skill_profiles}&domain_module_id=eq.${MOD.LMS_SKILLS}&select=id,state_name`);
  for (const s of states) {
    await patch(`/data_object_lifecycle_states?id=eq.${s.id}`, { domain_module_id: MOD.SKILLS_MGMT_PROFILE });
    console.log(`  state '${s.state_name}' (id ${s.id}) re-pointed to SKILLS-MGMT-PROFILE (174)`);
  }
  if (states.length === 0) console.log("  no skill_profiles states still anchored at module 34 (already re-pointed)");

  // ------------------------------------------------------------
  // 7. Permission reprefix
  //    - baseline lms-skills:{read,manage,admin} --> lms-paths:* (module 34 stays)
  //    - workflow-gate lms-skills:*_skill_profile --> skills-mgmt:* (module 34 --> 174)
  //    - workflow-gate lms-skills:*_learning_path --> lms-paths:* (module 34 stays)
  // ------------------------------------------------------------
  console.log("\n[7] Permission reprefix");
  const perms = await get(`/permissions?permission_name=like.lms-skills:*&select=id,permission_name,description,domain_module_id,tier`);
  for (const p of perms) {
    const name = String(p.permission_name);
    let newName: string;
    let newDmid: number = Number(p.domain_module_id);
    let newDesc: string = String(p.description);
    if (name.endsWith("_skill_profile") || name.endsWith("_skill_profiles")) {
      newName = name.replace(/^lms-skills:/, "skills-mgmt:");
      newDmid = MOD.SKILLS_MGMT_PROFILE;
      newDesc = newDesc.replace(/lms-skills/g, "skills-mgmt").replace(/LMS-SKILLS/g, "SKILLS-MGMT");
    } else if (name === "lms-skills:read" || name === "lms-skills:manage" || name === "lms-skills:admin") {
      newName = name.replace(/^lms-skills:/, "lms-paths:");
      // domain_module_id stays 34 (same module, just renamed)
      newDesc = newDesc.replace(/lms-skills/g, "lms-paths").replace(/LMS-SKILLS/g, "LMS-PATHS");
    } else {
      // workflow-gate against learning_path or similar non-skill_profile state
      newName = name.replace(/^lms-skills:/, "lms-paths:");
      newDesc = newDesc.replace(/lms-skills/g, "lms-paths").replace(/LMS-SKILLS/g, "LMS-PATHS");
    }
    if (newName !== name || newDmid !== Number(p.domain_module_id) || newDesc !== String(p.description)) {
      await patch(`/permissions?id=eq.${p.id}`, { permission_name: newName, domain_module_id: newDmid, description: newDesc });
      console.log(`  ${name} --> ${newName} (module ${p.domain_module_id} --> ${newDmid})`);
    }
  }
  if (perms.length === 0) console.log("  no lms-skills:* permissions remain (already reprefixed)");

  // ------------------------------------------------------------
  // 8. New baseline permissions for 5 new modules
  // ------------------------------------------------------------
  console.log("\n[8] New baseline permissions for 5 modules");
  type Perm = { permission_name: string; description: string; domain_module_id: number; tier: string };
  const newBaselines: Perm[] = [
    { permission_name: "skills-mgmt-taxonomy:read", description: "Read access to skills-mgmt-taxonomy module records.", domain_module_id: MOD.SKILLS_MGMT_TAXONOMY, tier: "baseline-read" },
    { permission_name: "skills-mgmt-taxonomy:manage", description: "Create and edit access to skills-mgmt-taxonomy module records.", domain_module_id: MOD.SKILLS_MGMT_TAXONOMY, tier: "baseline-manage" },
    { permission_name: "skills-mgmt-taxonomy:admin", description: "Full administrative access to skills-mgmt-taxonomy module, including delete and configuration.", domain_module_id: MOD.SKILLS_MGMT_TAXONOMY, tier: "baseline-admin" },
    { permission_name: "skills-mgmt:read", description: "Read access to skills-mgmt module records.", domain_module_id: MOD.SKILLS_MGMT_PROFILE, tier: "baseline-read" },
    { permission_name: "skills-mgmt:manage", description: "Create and edit access to skills-mgmt module records.", domain_module_id: MOD.SKILLS_MGMT_PROFILE, tier: "baseline-manage" },
    { permission_name: "skills-mgmt:admin", description: "Full administrative access to skills-mgmt module, including delete and configuration.", domain_module_id: MOD.SKILLS_MGMT_PROFILE, tier: "baseline-admin" },
    { permission_name: "tlnt-intel-marketplace:read", description: "Read access to tlnt-intel-marketplace module records.", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE, tier: "baseline-read" },
    { permission_name: "tlnt-intel-marketplace:manage", description: "Create and edit access to tlnt-intel-marketplace module records.", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE, tier: "baseline-manage" },
    { permission_name: "tlnt-intel-marketplace:admin", description: "Full administrative access to tlnt-intel-marketplace module, including delete and configuration.", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE, tier: "baseline-admin" },
    { permission_name: "tlnt-intel-mobility:read", description: "Read access to tlnt-intel-mobility module records.", domain_module_id: MOD.TLNT_INTEL_MOBILITY, tier: "baseline-read" },
    { permission_name: "tlnt-intel-mobility:manage", description: "Create and edit access to tlnt-intel-mobility module records.", domain_module_id: MOD.TLNT_INTEL_MOBILITY, tier: "baseline-manage" },
    { permission_name: "tlnt-intel-mobility:admin", description: "Full administrative access to tlnt-intel-mobility module, including delete and configuration.", domain_module_id: MOD.TLNT_INTEL_MOBILITY, tier: "baseline-admin" },
    { permission_name: "tlnt-intel-insights:read", description: "Read access to tlnt-intel-insights module records.", domain_module_id: MOD.TLNT_INTEL_INSIGHTS, tier: "baseline-read" },
    { permission_name: "tlnt-intel-insights:manage", description: "Create and edit access to tlnt-intel-insights module records.", domain_module_id: MOD.TLNT_INTEL_INSIGHTS, tier: "baseline-manage" },
    { permission_name: "tlnt-intel-insights:admin", description: "Full administrative access to tlnt-intel-insights module, including delete and configuration.", domain_module_id: MOD.TLNT_INTEL_INSIGHTS, tier: "baseline-admin" },
  ];
  await syncTable("/permissions", newBaselines, "permission_name");

  // ------------------------------------------------------------
  // 9. Re-point handoffs
  //    - Outbound from module 34 on data_object 172 (skill_profiles): repoint to module 174
  //    - Inbound to module 34 on data_object 172: repoint to module 174
  //    - Outbound on data_object 168 (learning_paths) stays
  //    - Inbound from learning-side events (course_enrollment, learner_certification): redirect to 174
  //      because they target the skill profile, which moves
  //    - Inbound on data_object 26 (skills_gap_analyses), 175 (performance_goals), 33 (job_profiles):
  //      these feed skill_profiles; redirect to 174
  // ------------------------------------------------------------
  console.log("\n[9] Re-point handoffs");

  // 9a. Outbound on skill_profiles: 432 + 433
  const outboundSP = await get(`/handoffs?source_domain_module_id=eq.${MOD.LMS_SKILLS}&data_object_id=eq.${D.skill_profiles}&select=id,trigger_event_id`);
  for (const h of outboundSP) {
    await patch(`/handoffs?id=eq.${h.id}`, { source_domain_id: DOMAIN.SKILLS_MGMT, source_domain_module_id: MOD.SKILLS_MGMT_PROFILE });
    console.log(`  outbound handoff ${h.id} (skill_profiles): source --> SKILLS-MGMT-PROFILE`);
  }

  // 9b. Inbound to module 34: 388, 440, 456, 1079, 1080
  // All of these target the skill_profile (the rec downstream stat) so they should now target
  // SKILLS-MGMT-PROFILE. They were never about learning_paths.
  const inbound = await get(`/handoffs?target_domain_module_id=eq.${MOD.LMS_SKILLS}&select=id,trigger_event_id,data_object_id,trigger_event:trigger_events(event_name)`);
  for (const h of inbound) {
    await patch(`/handoffs?id=eq.${h.id}`, { target_domain_id: DOMAIN.SKILLS_MGMT, target_domain_module_id: MOD.SKILLS_MGMT_PROFILE });
    const evName = (h.trigger_event as any)?.event_name ?? "?";
    console.log(`  inbound handoff ${h.id} (${evName}): target --> SKILLS-MGMT-PROFILE`);
  }

  // ------------------------------------------------------------
  // 10. Lifecycle states for new workflow-bearing masters
  //     internal_opportunities, opportunity_applications, mentorship_engagements,
  //     skill_assessments, competency_models, skill_taxonomies
  // ------------------------------------------------------------
  console.log("\n[10] Lifecycle states for new masters");

  type Lifecycle = { data_object_id: number; state_name: string; state_order: number; is_initial: boolean; is_terminal: boolean; requires_permission: boolean; permission_verb_override: string; domain_module_id: number | null };
  const lifecycleStates: Lifecycle[] = [
    // internal_opportunities: draft -> open -> closed -> filled | cancelled
    { data_object_id: D.internal_opportunities, state_name: "draft", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE },
    { data_object_id: D.internal_opportunities, state_name: "open", state_order: 2, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "publish_opportunity", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE },
    { data_object_id: D.internal_opportunities, state_name: "closed", state_order: 3, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "close_opportunity", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE },
    { data_object_id: D.internal_opportunities, state_name: "filled", state_order: 4, is_initial: false, is_terminal: true, requires_permission: false, permission_verb_override: "", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE },
    { data_object_id: D.internal_opportunities, state_name: "cancelled", state_order: 5, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "cancel_opportunity", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE },

    // opportunity_applications: submitted -> under_review -> accepted | rejected | withdrawn
    { data_object_id: D.opportunity_applications, state_name: "submitted", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE },
    { data_object_id: D.opportunity_applications, state_name: "under_review", state_order: 2, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "review_application", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE },
    { data_object_id: D.opportunity_applications, state_name: "accepted", state_order: 3, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "accept_application", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE },
    { data_object_id: D.opportunity_applications, state_name: "rejected", state_order: 4, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "reject_application", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE },
    { data_object_id: D.opportunity_applications, state_name: "withdrawn", state_order: 5, is_initial: false, is_terminal: true, requires_permission: false, permission_verb_override: "", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE },

    // mentorship_engagements: proposed -> active -> completed | cancelled
    { data_object_id: D.mentorship_engagements, state_name: "proposed", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE },
    { data_object_id: D.mentorship_engagements, state_name: "active", state_order: 2, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "activate_mentorship", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE },
    { data_object_id: D.mentorship_engagements, state_name: "completed", state_order: 3, is_initial: false, is_terminal: true, requires_permission: false, permission_verb_override: "", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE },
    { data_object_id: D.mentorship_engagements, state_name: "cancelled", state_order: 4, is_initial: false, is_terminal: true, requires_permission: false, permission_verb_override: "", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE },

    // skill_assessments: pending -> completed | cancelled
    { data_object_id: D.skill_assessments, state_name: "pending", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: MOD.SKILLS_MGMT_PROFILE },
    { data_object_id: D.skill_assessments, state_name: "completed", state_order: 2, is_initial: false, is_terminal: true, requires_permission: false, permission_verb_override: "", domain_module_id: MOD.SKILLS_MGMT_PROFILE },
    { data_object_id: D.skill_assessments, state_name: "cancelled", state_order: 3, is_initial: false, is_terminal: true, requires_permission: false, permission_verb_override: "", domain_module_id: MOD.SKILLS_MGMT_PROFILE },

    // competency_models: draft -> published -> archived (single-approver gate)
    { data_object_id: D.competency_models, state_name: "draft", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: MOD.SKILLS_MGMT_TAXONOMY },
    { data_object_id: D.competency_models, state_name: "published", state_order: 2, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "publish_competency_model", domain_module_id: MOD.SKILLS_MGMT_TAXONOMY },
    { data_object_id: D.competency_models, state_name: "archived", state_order: 3, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "archive_competency_model", domain_module_id: MOD.SKILLS_MGMT_TAXONOMY },

    // skill_taxonomies: draft -> active -> deprecated
    { data_object_id: D.skill_taxonomies, state_name: "draft", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: MOD.SKILLS_MGMT_TAXONOMY },
    { data_object_id: D.skill_taxonomies, state_name: "active", state_order: 2, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "activate_taxonomy", domain_module_id: MOD.SKILLS_MGMT_TAXONOMY },
    { data_object_id: D.skill_taxonomies, state_name: "deprecated", state_order: 3, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "deprecate_taxonomy", domain_module_id: MOD.SKILLS_MGMT_TAXONOMY },
  ];

  await syncJunction(
    "/data_object_lifecycle_states",
    lifecycleStates,
    r => `${r.data_object_id}|${r.state_name}`,
    "/data_object_lifecycle_states?select=data_object_id,state_name&limit=20000",
  );

  // ------------------------------------------------------------
  // 11. Workflow-gate permissions for new lifecycle states (requires_permission=true)
  // ------------------------------------------------------------
  console.log("\n[11] Workflow-gate permissions for new lifecycle gates");
  const gateRows: Perm[] = [];
  // TLNT-INTEL-MARKETPLACE workflow gates
  gateRows.push({ permission_name: "tlnt-intel-marketplace:publish_opportunity", description: "Workflow gate: transition an internal_opportunity to 'open'.", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE, tier: "workflow-gate" });
  gateRows.push({ permission_name: "tlnt-intel-marketplace:close_opportunity", description: "Workflow gate: transition an internal_opportunity to 'closed'.", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE, tier: "workflow-gate" });
  gateRows.push({ permission_name: "tlnt-intel-marketplace:cancel_opportunity", description: "Workflow gate: transition an internal_opportunity to 'cancelled'.", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE, tier: "workflow-gate" });
  gateRows.push({ permission_name: "tlnt-intel-marketplace:review_application", description: "Workflow gate: transition an opportunity_application to 'under_review'.", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE, tier: "workflow-gate" });
  gateRows.push({ permission_name: "tlnt-intel-marketplace:accept_application", description: "Workflow gate: transition an opportunity_application to 'accepted'.", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE, tier: "workflow-gate" });
  gateRows.push({ permission_name: "tlnt-intel-marketplace:reject_application", description: "Workflow gate: transition an opportunity_application to 'rejected'.", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE, tier: "workflow-gate" });
  gateRows.push({ permission_name: "tlnt-intel-marketplace:activate_mentorship", description: "Workflow gate: transition a mentorship_engagement to 'active'.", domain_module_id: MOD.TLNT_INTEL_MARKETPLACE, tier: "workflow-gate" });
  // SKILLS-MGMT-TAXONOMY workflow gates
  gateRows.push({ permission_name: "skills-mgmt-taxonomy:publish_competency_model", description: "Workflow gate: transition a competency_model to 'published'.", domain_module_id: MOD.SKILLS_MGMT_TAXONOMY, tier: "workflow-gate" });
  gateRows.push({ permission_name: "skills-mgmt-taxonomy:archive_competency_model", description: "Workflow gate: transition a competency_model to 'archived'.", domain_module_id: MOD.SKILLS_MGMT_TAXONOMY, tier: "workflow-gate" });
  gateRows.push({ permission_name: "skills-mgmt-taxonomy:activate_taxonomy", description: "Workflow gate: transition a skill_taxonomy to 'active'.", domain_module_id: MOD.SKILLS_MGMT_TAXONOMY, tier: "workflow-gate" });
  gateRows.push({ permission_name: "skills-mgmt-taxonomy:deprecate_taxonomy", description: "Workflow gate: transition a skill_taxonomy to 'deprecated'.", domain_module_id: MOD.SKILLS_MGMT_TAXONOMY, tier: "workflow-gate" });

  await syncTable("/permissions", gateRows, "permission_name");

  // ------------------------------------------------------------
  // 12. data_object_relationships for new masters
  //     Intra-domain + cross-domain + users edges (Rule #10)
  // ------------------------------------------------------------
  console.log("\n[12] data_object_relationships");

  type Rel = {
    data_object_id: number;
    relationship_verb: string;
    inverse_verb: string;
    related_data_object_id: number;
    relationship_type: string;
    is_required: boolean;
    owner_side: string;
    relationship_kind: string;
  };

  const rels: Rel[] = [
    // SKILLS-MGMT intra-domain
    { data_object_id: D.skill_taxonomies, relationship_verb: "contains", inverse_verb: "belongs to", related_data_object_id: D.skills, relationship_type: "one_to_many", is_required: true, owner_side: "source", relationship_kind: "composition" },
    { data_object_id: D.skills, relationship_verb: "rated by", inverse_verb: "rates", related_data_object_id: D.skill_assessments, relationship_type: "one_to_many", is_required: true, owner_side: "target", relationship_kind: "reference" },
    { data_object_id: D.skills, relationship_verb: "endorsed via", inverse_verb: "endorses", related_data_object_id: D.skill_endorsements, relationship_type: "one_to_many", is_required: true, owner_side: "target", relationship_kind: "reference" },
    { data_object_id: D.competency_models, relationship_verb: "requires", inverse_verb: "required by", related_data_object_id: D.skills, relationship_type: "many_to_many", is_required: true, owner_side: "source", relationship_kind: "association" },
    { data_object_id: D.job_profiles, relationship_verb: "expects", inverse_verb: "anchored to", related_data_object_id: D.competency_models, relationship_type: "one_to_many", is_required: false, owner_side: "target", relationship_kind: "reference" },
    { data_object_id: D.skill_profiles, relationship_verb: "updated by", inverse_verb: "updates", related_data_object_id: D.skill_assessments, relationship_type: "one_to_many", is_required: false, owner_side: "source", relationship_kind: "reference" },
    { data_object_id: D.skill_profiles, relationship_verb: "updated by", inverse_verb: "updates", related_data_object_id: D.skill_endorsements, relationship_type: "one_to_many", is_required: false, owner_side: "source", relationship_kind: "reference" },
    { data_object_id: D.skill_profiles, relationship_verb: "updated by", inverse_verb: "updates", related_data_object_id: D.skill_inference_runs, relationship_type: "one_to_many", is_required: false, owner_side: "source", relationship_kind: "reference" },
    { data_object_id: D.skill_profiles, relationship_verb: "assessed against", inverse_verb: "applied to", related_data_object_id: D.competency_models, relationship_type: "many_to_many", is_required: false, owner_side: "source", relationship_kind: "association" },
    { data_object_id: D.competency_models, relationship_verb: "compared via", inverse_verb: "compares", related_data_object_id: D.skills_gap_analyses, relationship_type: "one_to_many", is_required: false, owner_side: "target", relationship_kind: "reference" },

    // SKILLS-MGMT users edges (Rule #10)
    { data_object_id: D.users, relationship_verb: "rates", inverse_verb: "rated by", related_data_object_id: D.skill_assessments, relationship_type: "one_to_many", is_required: true, owner_side: "source", relationship_kind: "reference" },
    { data_object_id: D.users, relationship_verb: "endorses", inverse_verb: "endorsed by", related_data_object_id: D.skill_endorsements, relationship_type: "one_to_many", is_required: true, owner_side: "source", relationship_kind: "reference" },
    { data_object_id: D.users, relationship_verb: "approves", inverse_verb: "approved by", related_data_object_id: D.competency_models, relationship_type: "one_to_many", is_required: false, owner_side: "source", relationship_kind: "reference" },

    // TLNT-INTEL intra-domain
    { data_object_id: D.internal_opportunities, relationship_verb: "receives", inverse_verb: "submitted for", related_data_object_id: D.opportunity_applications, relationship_type: "one_to_many", is_required: false, owner_side: "source", relationship_kind: "composition" },
    { data_object_id: D.internal_opportunities, relationship_verb: "ranked by", inverse_verb: "ranks", related_data_object_id: D.fit_scores, relationship_type: "one_to_many", is_required: false, owner_side: "source", relationship_kind: "reference" },
    { data_object_id: D.match_inference_runs, relationship_verb: "produces", inverse_verb: "produced by", related_data_object_id: D.fit_scores, relationship_type: "one_to_many", is_required: false, owner_side: "source", relationship_kind: "reference" },
    { data_object_id: D.match_inference_runs, relationship_verb: "produces", inverse_verb: "produced by", related_data_object_id: D.mobility_recommendations, relationship_type: "one_to_many", is_required: false, owner_side: "source", relationship_kind: "reference" },

    // TLNT-INTEL cross-domain (consumers of SKILLS-MGMT, TALENT-MGMT)
    { data_object_id: D.skill_profiles, relationship_verb: "compared via", inverse_verb: "compares", related_data_object_id: D.fit_scores, relationship_type: "one_to_many", is_required: true, owner_side: "target", relationship_kind: "reference" },
    { data_object_id: D.skill_profiles, relationship_verb: "feeds", inverse_verb: "draws from", related_data_object_id: D.mobility_recommendations, relationship_type: "one_to_many", is_required: true, owner_side: "target", relationship_kind: "reference" },
    { data_object_id: D.career_aspirations, relationship_verb: "informs", inverse_verb: "anchored to", related_data_object_id: D.career_path_suggestions, relationship_type: "one_to_many", is_required: false, owner_side: "target", relationship_kind: "reference" },

    // TLNT-INTEL users edges (Rule #10)
    { data_object_id: D.users, relationship_verb: "posts", inverse_verb: "posted by", related_data_object_id: D.internal_opportunities, relationship_type: "one_to_many", is_required: true, owner_side: "source", relationship_kind: "reference" },
    { data_object_id: D.users, relationship_verb: "submits", inverse_verb: "submitted by", related_data_object_id: D.opportunity_applications, relationship_type: "one_to_many", is_required: true, owner_side: "source", relationship_kind: "reference" },
    { data_object_id: D.users, relationship_verb: "targeted by", inverse_verb: "targets", related_data_object_id: D.mobility_recommendations, relationship_type: "one_to_many", is_required: true, owner_side: "source", relationship_kind: "reference" },
    { data_object_id: D.users, relationship_verb: "scored as", inverse_verb: "scores", related_data_object_id: D.fit_scores, relationship_type: "one_to_many", is_required: true, owner_side: "source", relationship_kind: "reference" },
    { data_object_id: D.users, relationship_verb: "follows", inverse_verb: "for employee", related_data_object_id: D.career_path_suggestions, relationship_type: "one_to_many", is_required: true, owner_side: "source", relationship_kind: "reference" },
    { data_object_id: D.users, relationship_verb: "participates in", inverse_verb: "involves", related_data_object_id: D.mentorship_engagements, relationship_type: "one_to_many", is_required: true, owner_side: "source", relationship_kind: "reference" },
  ];

  await syncJunction(
    "/data_object_relationships",
    rels as unknown as Row[],
    r => `${r.data_object_id}|${r.relationship_verb}|${r.related_data_object_id}`,
    "/data_object_relationships?select=data_object_id,relationship_verb,related_data_object_id&limit=20000",
  );

  // ------------------------------------------------------------
  // 13. data_object_aliases
  // ------------------------------------------------------------
  console.log("\n[13] data_object_aliases");
  type Alias = { data_object_id: number; alias_name: string; alias_type: string };
  const aliases: Alias[] = [
    // internal_opportunities synonyms
    { data_object_id: D.internal_opportunities, alias_name: "gigs", alias_type: "synonym" },
    { data_object_id: D.internal_opportunities, alias_name: "projects", alias_type: "synonym" },
    { data_object_id: D.internal_opportunities, alias_name: "opportunities", alias_type: "synonym" },
    { data_object_id: D.internal_opportunities, alias_name: "internal jobs", alias_type: "synonym" },
    // skill_profiles synonyms
    { data_object_id: D.skill_profiles, alias_name: "talent profile", alias_type: "synonym" },
    { data_object_id: D.skill_profiles, alias_name: "competency profile", alias_type: "synonym" },
    // competency_models synonyms
    { data_object_id: D.competency_models, alias_name: "job competency framework", alias_type: "synonym" },
    { data_object_id: D.competency_models, alias_name: "role profile", alias_type: "synonym" },
    // mobility_recommendations synonyms
    { data_object_id: D.mobility_recommendations, alias_name: "career suggestions", alias_type: "synonym" },
    { data_object_id: D.mobility_recommendations, alias_name: "next move recommendations", alias_type: "synonym" },
  ];

  await syncJunction(
    "/data_object_aliases",
    aliases as unknown as Row[],
    r => `${r.data_object_id}|${r.alias_name}`,
    "/data_object_aliases?select=data_object_id,alias_name&limit=20000",
  );

  // ------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------
  console.log("\n" + "=".repeat(60));
  console.log("Phase B + migration complete.");
  console.log("\nUI links for spot-check:");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/domain_module_data_objects");
  console.log("  https://tests.semantius.app/domain_map/domain_data_objects");
  console.log("  https://tests.semantius.app/domain_map/domain_modules  (verify LMS-SKILLS renamed to LMS-PATHS)");
  console.log("  https://tests.semantius.app/domain_map/permissions");
  console.log("  https://tests.semantius.app/domain_map/data_object_lifecycle_states");
  console.log("  https://tests.semantius.app/domain_map/handoffs");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
