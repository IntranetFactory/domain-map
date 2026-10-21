#!/usr/bin/env bun
// Emits a bash script for Phase C (business_function_domains) + Phase S (system skills +
// tools + skill_tools) for SKILLS-MGMT and TLNT-INTEL.
// Run: bun run c:/dev/domain-map/.tmp_deploy/emit_phase_cs.ts ; bash c:/tmp/phase_cs.sh

import { writeFileSync } from "node:fs";

const DOMAIN = { SKILLS_MGMT: 169, TLNT_INTEL: 170 };
const MOD = {
  SKILLS_MGMT_TAXONOMY: 173, SKILLS_MGMT_PROFILE: 174,
  TLNT_INTEL_MARKETPLACE: 175, TLNT_INTEL_MOBILITY: 176, TLNT_INTEL_INSIGHTS: 177,
};
const FN = { HR: 3, LEARNING_DEV: 11, RECRUITING: 37, HR_SERVICE_DELIVERY: 76, TALENT_DEV: 77 };
// Function names for label composition.
const FN_NAMES: Record<number, string> = {
  3: "Human Resources",
  11: "Learning and Development",
  37: "Recruiting",
  76: "HR Service Delivery",
  77: "Talent Development",
};
const DOMAIN_NAMES: Record<number, string> = {
  169: "Skills Management",
  170: "Talent Intelligence",
};

// Existing tools to reuse (resolved from live state)
const REUSE_TOOLS: Record<string, number> = {
  query_employees: 13, query_job_requisitions: 15, query_skills_gap_analyses: 154,
  query_job_profiles: 195, query_job_postings: 210, query_course_enrollments: 218,
  query_skill_profiles: 222, query_performance_goals: 704, query_career_aspirations: 708,
  notify_person: 913, notify_team: 914,
};
// Known data_object ids from Phase B
const DOBJ = {
  skill_profiles: 172, skill_taxonomies: 852, skills: 854, skill_assessments: 855,
  skill_endorsements: 856, competency_models: 857, skill_inference_runs: 858,
  internal_opportunities: 859, opportunity_applications: 860, mobility_recommendations: 861,
  fit_scores: 862, career_path_suggestions: 863, mentorship_engagements: 864,
  match_inference_runs: 865, learner_certifications: 171, course_enrollments: 169,
  employees: 31, job_requisitions: 1, job_postings: 2, career_aspirations: 179,
  performance_goals: 175, skills_gap_analyses: 26, job_profiles: 33,
};

const lines: string[] = [];
const out = (s: string) => lines.push(s);

out("#!/bin/bash");
out("# Phase C + S loader: business_function_domains + system skills + tools + skill_tools.");
out("set -euo pipefail");
out("SEM='semantius call crud postgrestRequest'");
out('log() { printf "%s\\n" "[$(date +%H:%M:%S)] $*"; }');
out('log "== Phase C + S loader starting =="');
out("");

let stepN = 0;
function emitJson(envelope: any): string {
  return JSON.stringify(envelope);
}

// ============================================================
// PHASE C: business_function_domains
// ============================================================
out("# ============================================================");
out("# PHASE C: business_function_domains");
out("# ============================================================");
type BfdRow = { domain_id: number; business_function_id: number; responsibility_type: "owner" | "contributor" | "consumer" };
const bfds: BfdRow[] = [
  // SKILLS-MGMT
  { domain_id: DOMAIN.SKILLS_MGMT, business_function_id: FN.TALENT_DEV, responsibility_type: "owner" },
  { domain_id: DOMAIN.SKILLS_MGMT, business_function_id: FN.LEARNING_DEV, responsibility_type: "contributor" },
  { domain_id: DOMAIN.SKILLS_MGMT, business_function_id: FN.RECRUITING, responsibility_type: "contributor" },
  { domain_id: DOMAIN.SKILLS_MGMT, business_function_id: FN.HR_SERVICE_DELIVERY, responsibility_type: "consumer" },
  // TLNT-INTEL
  { domain_id: DOMAIN.TLNT_INTEL, business_function_id: FN.HR, responsibility_type: "owner" },
  { domain_id: DOMAIN.TLNT_INTEL, business_function_id: FN.TALENT_DEV, responsibility_type: "contributor" },
  { domain_id: DOMAIN.TLNT_INTEL, business_function_id: FN.RECRUITING, responsibility_type: "contributor" },
  { domain_id: DOMAIN.TLNT_INTEL, business_function_id: FN.LEARNING_DEV, responsibility_type: "contributor" },
];

stepN++;
out(`log "[${stepN}] Read existing business_function_domains in scope"`);
out(`BFD_EXISTING=$($SEM <<'__SEM_${stepN}__'`);
out(emitJson({ method: "GET", path: `/business_function_domains?domain_id=in.(${DOMAIN.SKILLS_MGMT},${DOMAIN.TLNT_INTEL})&select=domain_id,business_function_id,responsibility_type` }));
out(`__SEM_${stepN}__`);
out(")");
out("");

for (const b of bfds) {
  const label = `${FN_NAMES[b.business_function_id]} / ${DOMAIN_NAMES[b.domain_id]}`;
  out(`__exists=$(echo "$BFD_EXISTING" | jq --argjson d ${b.domain_id} --argjson f ${b.business_function_id} --arg r "${b.responsibility_type}" 'map(select(.domain_id == $d and .business_function_id == $f and .responsibility_type == $r)) | length > 0')`);
  out(`if [ "$__exists" = "false" ]; then`);
  stepN++;
  const tag = `__SEM_${stepN}__`;
  out(`  log "[${stepN}] BFD insert: ${label} (${b.responsibility_type})"`);
  out(`  $SEM <<'${tag}' > /dev/null`);
  out(emitJson({
    method: "POST",
    path: "/business_function_domains",
    body: [{ domain_id: b.domain_id, business_function_id: b.business_function_id, responsibility_type: b.responsibility_type, business_function_domain_label: label }],
  }));
  out(tag);
  out("else");
  out(`  log "[skip] BFD exists: ${label} (${b.responsibility_type})"`);
  out("fi");
  out("");
}

// ============================================================
// PHASE S.1: Tools (catalog-wide; dedupe by tool_name)
// ============================================================
out("# ============================================================");
out("# PHASE S.1: Tools (new, deduped by tool_name)");
out("# ============================================================");
type ToolRow = { tool_name: string; description: string; operation_kind: "query" | "mutate" | "side_effect" | "compute" | "inbound"; coverage_tier: "platform" | "external" | "integration"; data_object_id: number | null };
const newTools: ToolRow[] = [
  // SKILLS-MGMT-TAXONOMY tools
  { tool_name: "query_skill_taxonomies", description: "Query skill_taxonomies records.", operation_kind: "query", coverage_tier: "platform", data_object_id: DOBJ.skill_taxonomies },
  { tool_name: "query_skills", description: "Query skills catalog records.", operation_kind: "query", coverage_tier: "platform", data_object_id: DOBJ.skills },
  { tool_name: "query_competency_models", description: "Query competency_models records.", operation_kind: "query", coverage_tier: "platform", data_object_id: DOBJ.competency_models },
  { tool_name: "create_skill_taxonomy", description: "Create a skill_taxonomy.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: DOBJ.skill_taxonomies },
  { tool_name: "update_skill_taxonomy", description: "Update an existing skill_taxonomy.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: DOBJ.skill_taxonomies },
  { tool_name: "create_skill", description: "Create an individual skill node.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: DOBJ.skills },
  { tool_name: "update_skill", description: "Update an existing skill node.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: DOBJ.skills },
  { tool_name: "create_competency_model", description: "Create a competency_model row.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: DOBJ.competency_models },
  { tool_name: "update_competency_model", description: "Update an existing competency_model.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: DOBJ.competency_models },
  { tool_name: "publish_competency_model", description: "Workflow gate: transition a competency_model to 'published'.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: DOBJ.competency_models },
  { tool_name: "activate_taxonomy", description: "Workflow gate: transition a skill_taxonomy to 'active'.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: DOBJ.skill_taxonomies },

  // SKILLS-MGMT-PROFILE tools
  { tool_name: "query_skill_assessments", description: "Query skill_assessments records.", operation_kind: "query", coverage_tier: "platform", data_object_id: DOBJ.skill_assessments },
  { tool_name: "query_skill_endorsements", description: "Query skill_endorsements records.", operation_kind: "query", coverage_tier: "platform", data_object_id: DOBJ.skill_endorsements },
  { tool_name: "query_skill_inference_runs", description: "Query skill_inference_runs audit records.", operation_kind: "query", coverage_tier: "platform", data_object_id: DOBJ.skill_inference_runs },
  { tool_name: "query_learner_certifications", description: "Query learner_certifications records.", operation_kind: "query", coverage_tier: "platform", data_object_id: DOBJ.learner_certifications },
  { tool_name: "create_skill_assessment", description: "Create a skill_assessment row.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: DOBJ.skill_assessments },
  { tool_name: "create_skill_endorsement", description: "Create a skill_endorsement row.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: DOBJ.skill_endorsements },
  { tool_name: "update_skill_profile", description: "Update a skill_profile row.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: DOBJ.skill_profiles },
  { tool_name: "validate_skill_profile", description: "Workflow gate: transition a skill_profile to 'validated'.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: DOBJ.skill_profiles },
  { tool_name: "run_skill_inference", description: "Run the skill inference pipeline against learning, performance, and work-activity signals; produces a skill_inference_run audit record and updates affected skill_profiles.", operation_kind: "compute", coverage_tier: "external", data_object_id: null },
  { tool_name: "compute_skills_gap", description: "Compute workforce skill-gap analysis against competency models.", operation_kind: "compute", coverage_tier: "external", data_object_id: null },

  // TLNT-INTEL-MARKETPLACE tools
  { tool_name: "query_internal_opportunities", description: "Query internal_opportunities records.", operation_kind: "query", coverage_tier: "platform", data_object_id: DOBJ.internal_opportunities },
  { tool_name: "query_opportunity_applications", description: "Query opportunity_applications records.", operation_kind: "query", coverage_tier: "platform", data_object_id: DOBJ.opportunity_applications },
  { tool_name: "query_mentorship_engagements", description: "Query mentorship_engagements records.", operation_kind: "query", coverage_tier: "platform", data_object_id: DOBJ.mentorship_engagements },
  { tool_name: "create_internal_opportunity", description: "Create an internal_opportunity.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: DOBJ.internal_opportunities },
  { tool_name: "update_internal_opportunity", description: "Update an internal_opportunity.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: DOBJ.internal_opportunities },
  { tool_name: "publish_opportunity", description: "Workflow gate: transition an internal_opportunity to 'open'.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: DOBJ.internal_opportunities },
  { tool_name: "close_opportunity", description: "Workflow gate: transition an internal_opportunity to 'closed'.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: DOBJ.internal_opportunities },
  { tool_name: "create_opportunity_application", description: "Create an opportunity_application.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: DOBJ.opportunity_applications },
  { tool_name: "accept_opportunity_application", description: "Workflow gate: transition an opportunity_application to 'accepted'.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: DOBJ.opportunity_applications },
  { tool_name: "reject_opportunity_application", description: "Workflow gate: transition an opportunity_application to 'rejected'.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: DOBJ.opportunity_applications },
  { tool_name: "match_mentor_to_mentee", description: "AI matching of mentor candidates to mentee requests by skill, aspiration, and availability.", operation_kind: "compute", coverage_tier: "external", data_object_id: null },

  // TLNT-INTEL-MOBILITY tools
  { tool_name: "query_mobility_recommendations", description: "Query mobility_recommendations records.", operation_kind: "query", coverage_tier: "platform", data_object_id: DOBJ.mobility_recommendations },
  { tool_name: "query_fit_scores", description: "Query fit_scores records.", operation_kind: "query", coverage_tier: "platform", data_object_id: DOBJ.fit_scores },
  { tool_name: "query_career_path_suggestions", description: "Query career_path_suggestions records.", operation_kind: "query", coverage_tier: "platform", data_object_id: DOBJ.career_path_suggestions },
  { tool_name: "query_match_inference_runs", description: "Query match_inference_runs audit records.", operation_kind: "query", coverage_tier: "platform", data_object_id: DOBJ.match_inference_runs },
  { tool_name: "compute_fit_score", description: "Compute the fit score between a person and a role or opportunity, based on skill_profiles and competency_models.", operation_kind: "compute", coverage_tier: "external", data_object_id: null },
  { tool_name: "recommend_mobility_moves", description: "Generate mobility_recommendations for an employee based on skill graph, career_aspirations, and open internal_opportunities.", operation_kind: "compute", coverage_tier: "external", data_object_id: null },
  { tool_name: "rank_succession_candidates", description: "Produce a ready-now / ready-soon / ready-later ranking for a critical role.", operation_kind: "compute", coverage_tier: "external", data_object_id: null },
  { tool_name: "project_career_paths", description: "Generate career_path_suggestions from current role toward an aspiration.", operation_kind: "compute", coverage_tier: "external", data_object_id: null },
  { tool_name: "run_match_inference", description: "Run a matching/scoring batch over skill_profiles, opportunities, and roles; produces fit_scores and mobility_recommendations plus a match_inference_run audit record.", operation_kind: "compute", coverage_tier: "external", data_object_id: null },

  // TLNT-INTEL-INSIGHTS tools
  { tool_name: "compute_workforce_skills_heatmap", description: "Produce an org-level visualization of skill supply, demand, gaps, and risk.", operation_kind: "compute", coverage_tier: "external", data_object_id: null },
];

const newToolNames = newTools.map(t => t.tool_name).join(",");
stepN++;
out(`log "[${stepN}] Read existing tools to dedupe"`);
out(`TOOLS_EXISTING=$($SEM <<'__SEM_${stepN}__'`);
out(emitJson({ method: "GET", path: `/tools?tool_name=in.(${newToolNames})&select=tool_name` }));
out(`__SEM_${stepN}__`);
out(")");
out("");

for (const t of newTools) {
  out(`__exists=$(echo "$TOOLS_EXISTING" | jq -r 'map(select(.tool_name == "${t.tool_name}")) | length > 0')`);
  out(`if [ "$__exists" = "false" ]; then`);
  stepN++;
  const tag = `__SEM_${stepN}__`;
  out(`  log "[${stepN}] Tool insert: ${t.tool_name}"`);
  out(`  $SEM <<'${tag}' > /dev/null`);
  const row: any = { tool_name: t.tool_name, description: t.description, operation_kind: t.operation_kind, coverage_tier: t.coverage_tier };
  if (t.data_object_id !== null) row.data_object_id = t.data_object_id;
  out(emitJson({ method: "POST", path: "/tools", body: [row] }));
  out(tag);
  out("else");
  out(`  log "[skip] Tool ${t.tool_name} exists"`);
  out("fi");
  out("");
}

// Resolve all needed tool ids (new + reused) into bash vars.
const allToolNames = [...newTools.map(t => t.tool_name), ...Object.keys(REUSE_TOOLS)];
stepN++;
out(`log "[${stepN}] Resolve tool id map"`);
out(`TOOLS_MAP=$($SEM <<'__SEM_${stepN}__'`);
out(emitJson({ method: "GET", path: `/tools?tool_name=in.(${allToolNames.join(",")})&select=id,tool_name` }));
out(`__SEM_${stepN}__`);
out(")");
for (const tn of allToolNames) {
  const v = `TOOL_${tn.toUpperCase()}_ID`;
  out(`${v}=$(echo "$TOOLS_MAP" | jq -r '.[] | select(.tool_name == "${tn}") | .id')`);
}
out("");

// ============================================================
// PHASE S.2: System skills (one per module)
// ============================================================
out("# ============================================================");
out("# PHASE S.2: System skills (one per module)");
out("# ============================================================");
type SkillRow = { skill_name: string; description: string; domain_id: number; domain_module_id: number };
const skills: SkillRow[] = [
  { skill_name: "skills_mgmt_taxonomy_agent", description: "Maintains the skill ontology and competency models for SKILLS-MGMT-TAXONOMY: authors skill_taxonomies, individual skills, and competency_models; runs publish/archive workflow gates.", domain_id: DOMAIN.SKILLS_MGMT, domain_module_id: MOD.SKILLS_MGMT_TAXONOMY },
  { skill_name: "skills_mgmt_profile_agent", description: "Maintains per-worker skill profiles for SKILLS-MGMT-PROFILE: runs inference, captures assessments and endorsements, validates profiles, computes skill-gap analyses against competency models.", domain_id: DOMAIN.SKILLS_MGMT, domain_module_id: MOD.SKILLS_MGMT_PROFILE },
  { skill_name: "tlnt_intel_marketplace_agent", description: "Operates the internal talent marketplace for TLNT-INTEL-MARKETPLACE: posts opportunities (gigs, projects, full-time, mentorships), routes applications through the review/accept/reject workflow, matches mentor-mentee engagements.", domain_id: DOMAIN.TLNT_INTEL, domain_module_id: MOD.TLNT_INTEL_MARKETPLACE },
  { skill_name: "tlnt_intel_mobility_agent", description: "AI mobility, succession, and fit-scoring engine for TLNT-INTEL-MOBILITY: computes fit scores, generates mobility recommendations, ranks succession candidates, projects career paths, runs match inference batches.", domain_id: DOMAIN.TLNT_INTEL, domain_module_id: MOD.TLNT_INTEL_MOBILITY },
  { skill_name: "tlnt_intel_insights_agent", description: "Workforce-skills insights agent for TLNT-INTEL-INSIGHTS: produces org-level heatmaps of skill supply, demand, gaps, and risk for HR leaders.", domain_id: DOMAIN.TLNT_INTEL, domain_module_id: MOD.TLNT_INTEL_INSIGHTS },
];

const skillNames = skills.map(s => s.skill_name).join(",");
stepN++;
out(`log "[${stepN}] Read existing skills to dedupe"`);
out(`SKILLS_EXISTING=$($SEM <<'__SEM_${stepN}__'`);
out(emitJson({ method: "GET", path: `/skills?skill_name=in.(${skillNames})&select=skill_name` }));
out(`__SEM_${stepN}__`);
out(")");
out("");

for (const s of skills) {
  out(`__exists=$(echo "$SKILLS_EXISTING" | jq -r 'map(select(.skill_name == "${s.skill_name}")) | length > 0')`);
  out(`if [ "$__exists" = "false" ]; then`);
  stepN++;
  const tag = `__SEM_${stepN}__`;
  out(`  log "[${stepN}] Skill insert: ${s.skill_name}"`);
  out(`  $SEM <<'${tag}' > /dev/null`);
  out(emitJson({
    method: "POST",
    path: "/skills",
    body: [{ skill_name: s.skill_name, description: s.description, skill_type: "system", domain_id: s.domain_id, domain_module_id: s.domain_module_id }],
  }));
  out(tag);
  out("else");
  out(`  log "[skip] Skill ${s.skill_name} exists"`);
  out("fi");
  out("");
}

stepN++;
out(`log "[${stepN}] Resolve skill id map"`);
out(`SKILLS_MAP=$($SEM <<'__SEM_${stepN}__'`);
out(emitJson({ method: "GET", path: `/skills?skill_name=in.(${skillNames})&select=id,skill_name` }));
out(`__SEM_${stepN}__`);
out(")");
for (const s of skills) {
  const v = `SKILL_${s.skill_name.toUpperCase()}_ID`;
  out(`${v}=$(echo "$SKILLS_MAP" | jq -r '.[] | select(.skill_name == "${s.skill_name}") | .id')`);
}
out("");

// ============================================================
// PHASE S.3: skill_tools links
// ============================================================
out("# ============================================================");
out("# PHASE S.3: skill_tools links");
out("# ============================================================");

type SkillToolLink = { skill_name: string; tool_name: string; requirement_level: "required" | "optional" };
const links: SkillToolLink[] = [
  // skills_mgmt_taxonomy_agent
  ...[
    "query_skill_taxonomies", "query_skills", "query_competency_models", "query_job_profiles",
    "create_skill_taxonomy", "update_skill_taxonomy", "create_skill", "update_skill",
    "create_competency_model", "update_competency_model", "publish_competency_model", "activate_taxonomy",
  ].map(t => ({ skill_name: "skills_mgmt_taxonomy_agent", tool_name: t, requirement_level: "required" as const })),
  { skill_name: "skills_mgmt_taxonomy_agent", tool_name: "notify_person", requirement_level: "optional" },

  // skills_mgmt_profile_agent
  ...[
    "query_skill_profiles", "query_skill_assessments", "query_skill_endorsements", "query_skill_inference_runs",
    "query_employees", "query_course_enrollments", "query_learner_certifications",
    "create_skill_assessment", "create_skill_endorsement", "update_skill_profile", "validate_skill_profile",
    "run_skill_inference",
  ].map(t => ({ skill_name: "skills_mgmt_profile_agent", tool_name: t, requirement_level: "required" as const })),
  { skill_name: "skills_mgmt_profile_agent", tool_name: "compute_skills_gap", requirement_level: "required" },
  { skill_name: "skills_mgmt_profile_agent", tool_name: "query_skills_gap_analyses", requirement_level: "required" },
  { skill_name: "skills_mgmt_profile_agent", tool_name: "query_performance_goals", requirement_level: "optional" },
  { skill_name: "skills_mgmt_profile_agent", tool_name: "notify_person", requirement_level: "optional" },

  // tlnt_intel_marketplace_agent
  ...[
    "query_internal_opportunities", "query_opportunity_applications", "query_mentorship_engagements",
    "query_employees", "query_skill_profiles", "query_competency_models",
    "create_internal_opportunity", "update_internal_opportunity", "publish_opportunity", "close_opportunity",
    "create_opportunity_application", "accept_opportunity_application", "reject_opportunity_application",
    "match_mentor_to_mentee",
  ].map(t => ({ skill_name: "tlnt_intel_marketplace_agent", tool_name: t, requirement_level: "required" as const })),
  { skill_name: "tlnt_intel_marketplace_agent", tool_name: "notify_person", requirement_level: "optional" },

  // tlnt_intel_mobility_agent
  ...[
    "query_mobility_recommendations", "query_fit_scores", "query_career_path_suggestions", "query_match_inference_runs",
    "query_skill_profiles", "query_competency_models", "query_job_profiles", "query_job_requisitions",
    "query_career_aspirations",
    "compute_fit_score", "recommend_mobility_moves", "rank_succession_candidates", "project_career_paths",
    "run_match_inference",
  ].map(t => ({ skill_name: "tlnt_intel_mobility_agent", tool_name: t, requirement_level: "required" as const })),
  { skill_name: "tlnt_intel_mobility_agent", tool_name: "notify_person", requirement_level: "optional" },

  // tlnt_intel_insights_agent
  ...[
    "query_skills_gap_analyses", "query_skill_profiles", "query_competency_models", "query_employees",
    "compute_workforce_skills_heatmap",
  ].map(t => ({ skill_name: "tlnt_intel_insights_agent", tool_name: t, requirement_level: "required" as const })),
];

const skillIds = skills.map(s => `$SKILL_${s.skill_name.toUpperCase()}_ID`).join(",");
stepN++;
out(`log "[${stepN}] Read existing skill_tools in scope"`);
out(`ST_EXISTING=$($SEM <<__SEM_${stepN}__`);
out(`{"method":"GET","path":"/skill_tools?skill_id=in.(${skillIds})&select=skill_id,tool_id"}`);
out(`__SEM_${stepN}__`);
out(")");
out("");

for (const l of links) {
  const skillVar = `SKILL_${l.skill_name.toUpperCase()}_ID`;
  const toolVar = `TOOL_${l.tool_name.toUpperCase()}_ID`;
  out(`__sid=$${skillVar}; __tid=$${toolVar}`);
  out(`__exists=$(echo "$ST_EXISTING" | jq --argjson s "$__sid" --argjson t "$__tid" 'map(select(.skill_id == $s and .tool_id == $t)) | length > 0')`);
  out(`if [ "$__exists" = "false" ]; then`);
  stepN++;
  const tag = `__SEM_${stepN}__`;
  out(`  log "[${stepN}] skill_tools: ${l.skill_name} needs ${l.tool_name} (${l.requirement_level})"`);
  out(`  $SEM <<${tag} > /dev/null`);
  out(`{"method":"POST","path":"/skill_tools","body":[{"skill_id":$__sid,"tool_id":$__tid,"requirement_level":"${l.requirement_level}","skill_tool_label":"${l.skill_name} needs ${l.tool_name}"}]}`);
  out(tag);
  out("else");
  out(`  log "[skip] skill_tools: ${l.skill_name} needs ${l.tool_name} exists"`);
  out("fi");
  out("");
}

out('log "== Phase C + S loader complete =="');

writeFileSync("c:/tmp/phase_cs.sh", lines.join("\n"));
console.log(`Wrote ${lines.length} lines, ${stepN} semantius calls to c:/tmp/phase_cs.sh`);
console.log("Run: bash c:/tmp/phase_cs.sh");
