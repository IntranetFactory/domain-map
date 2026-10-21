#!/usr/bin/env bun
// Phase S for PROD-MGMT: 10 mutate tools, 2 system skills, skill_tools, retire legacy skill 92.
// Idempotent on tool_name and skill_name.

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

async function del(path: string): Promise<Row[]> {
  return call({ method: "DELETE", path });
}

const DOMAIN_ID = 101;
const DISCOVERY_ID = 130;
const ROADMAP_ID = 131;

// ============================================================
// 1. tools — 10 new mutate tools, all platform (target Semantius masters)
// ============================================================
const newTools = [
  // PM-DISCOVERY mutates
  { tool_name: "create_feature_request",         operation_kind: "mutate", coverage_tier: "platform", data_object_id: 406, description: "Capture a new feature request from feedback, win/loss interviews, sales input, or strategic planning." },
  { tool_name: "update_feature_request",         operation_kind: "mutate", coverage_tier: "platform", data_object_id: 406, description: "Move feature requests through triage, prioritized, accepted, rejected, archived states and link to product_features on acceptance." },
  { tool_name: "update_customer_feedback_item",  operation_kind: "mutate", coverage_tier: "platform", data_object_id: 407, description: "Classify inbound feedback, link to feature_requests or product_features, set status." },
  // PM-ROADMAP-DELIVERY mutates
  { tool_name: "update_product_roadmap",         operation_kind: "mutate", coverage_tier: "platform", data_object_id: 405, description: "Publish a roadmap version, promote items between now/next/later swimlanes, change audience scope." },
  { tool_name: "create_product_release",         operation_kind: "mutate", coverage_tier: "platform", data_object_id: 404, description: "Plan a new product release with target date, feature set, and rollout strategy." },
  { tool_name: "update_product_release",         operation_kind: "mutate", coverage_tier: "platform", data_object_id: 404, description: "Move a release through planned, in_progress, shipped, rolled_back states." },
  { tool_name: "update_product_feature",         operation_kind: "mutate", coverage_tier: "platform", data_object_id: 403, description: "Set product_feature state (in_discovery, in_delivery, released, deprecated) and link to releases and roadmap items." },
  { tool_name: "create_beta_program",            operation_kind: "mutate", coverage_tier: "platform", data_object_id: 409, description: "Stand up a beta program for one or more product_features with a defined participant cohort and success criteria." },
  { tool_name: "update_beta_program",            operation_kind: "mutate", coverage_tier: "platform", data_object_id: 409, description: "Launch, monitor, gather feedback on, and close beta programs." },
  { tool_name: "record_product_metric",          operation_kind: "mutate", coverage_tier: "platform", data_object_id: 408, description: "Record adoption, usage, quality, or business metrics linked to features, releases, or product_lines." },
];

console.log(`[1/4] tools (10 new mutates)`);
const existingTools = await get(`/tools?tool_name=in.(${newTools.map(t => t.tool_name).join(",")})&select=id,tool_name`);
const existingToolNames = new Set(existingTools.map(r => String(r.tool_name)));
const missingTools = newTools.filter(t => !existingToolNames.has(t.tool_name));
if (missingTools.length > 0) {
  console.log(`  inserting ${missingTools.length} new tools (${existingTools.length} existed)`);
  await insert("/tools", missingTools);
} else {
  console.log(`  all ${existingTools.length} present, nothing to insert`);
}
const allMutateTools = await get(`/tools?tool_name=in.(${newTools.map(t => t.tool_name).join(",")})&select=id,tool_name`);
const toolId = new Map<string, number>();
for (const t of allMutateTools) toolId.set(String(t.tool_name), Number(t.id));

// Existing tool ids (verified pre-load)
const TOOL = {
  query_feature_requests:        633,
  query_customer_feedback_items: 634,
  query_product_lines:           629,
  query_product_features:        630,
  query_product_releases:        631,
  query_product_roadmaps:        632,
  query_product_metrics:         635,
  query_beta_programs:           636,
  query_value_streams:           333,
  notify_person:                 913,
  notify_team:                   914,
  create_feature_request:        toolId.get("create_feature_request")!,
  update_feature_request:        toolId.get("update_feature_request")!,
  update_customer_feedback_item: toolId.get("update_customer_feedback_item")!,
  update_product_roadmap:        toolId.get("update_product_roadmap")!,
  create_product_release:        toolId.get("create_product_release")!,
  update_product_release:        toolId.get("update_product_release")!,
  update_product_feature:        toolId.get("update_product_feature")!,
  create_beta_program:           toolId.get("create_beta_program")!,
  update_beta_program:           toolId.get("update_beta_program")!,
  record_product_metric:         toolId.get("record_product_metric")!,
};
for (const [name, id] of Object.entries(TOOL)) {
  if (!id) throw new Error(`Missing tool id for ${name}`);
}

// ============================================================
// 2. skills — 2 new system skills, one per module
// ============================================================
const newSkills = [
  {
    skill_name:       "pm_discovery_agent",
    skill_type:       "system",
    domain_id:        DOMAIN_ID,
    domain_module_id: DISCOVERY_ID,
    description:      "Agent for the PM-DISCOVERY module. Captures customer feedback and feature ideas, classifies and clusters them, links feedback to candidate features, and shepherds feature_requests through triage and prioritization. Notifies product managers when upvote or signal thresholds cross.",
  },
  {
    skill_name:       "pm_roadmap_delivery_agent",
    skill_type:       "system",
    domain_id:        DOMAIN_ID,
    domain_module_id: ROADMAP_ID,
    description:      "Agent for the PM-ROADMAP-DELIVERY module. Authors and publishes product roadmaps, plans and ships releases, runs beta programs, and records product metrics against strategy and OKRs. Broadcasts release announcements internally.",
  },
];

console.log(`\n[2/4] skills`);
const existingSkills = await get(`/skills?skill_name=in.(${newSkills.map(s => s.skill_name).join(",")})&select=id,skill_name`);
const existingSkillNames = new Set(existingSkills.map(r => String(r.skill_name)));
const missingSkills = newSkills.filter(s => !existingSkillNames.has(s.skill_name));
if (missingSkills.length > 0) {
  console.log(`  inserting ${missingSkills.length} new skills (${existingSkills.length} existed)`);
  await insert("/skills", missingSkills);
} else {
  console.log(`  all ${existingSkills.length} present, nothing to insert`);
}
const allNewSkills = await get(`/skills?skill_name=in.(${newSkills.map(s => s.skill_name).join(",")})&select=id,skill_name`);
const skillId = new Map<string, number>();
for (const s of allNewSkills) skillId.set(String(s.skill_name), Number(s.id));
const DISCOVERY_SKILL = skillId.get("pm_discovery_agent")!;
const ROADMAP_SKILL = skillId.get("pm_roadmap_delivery_agent")!;
if (!DISCOVERY_SKILL || !ROADMAP_SKILL) throw new Error("Missing skill IDs");

// ============================================================
// 3. skill_tools
// ============================================================
type StRow = { skill_id: number; tool_id: number; requirement_level: string; notes: string };
const skillTools: StRow[] = [
  // pm_discovery_agent
  { skill_id: DISCOVERY_SKILL, tool_id: TOOL.query_feature_requests,        requirement_level: "required", notes: "Read feature requests for triage and prioritization." },
  { skill_id: DISCOVERY_SKILL, tool_id: TOOL.query_customer_feedback_items, requirement_level: "required", notes: "Read inbound customer feedback for clustering and feature linkage." },
  { skill_id: DISCOVERY_SKILL, tool_id: TOOL.create_feature_request,        requirement_level: "required", notes: "Capture new feature requests from feedback, win/loss, sales input, strategic planning." },
  { skill_id: DISCOVERY_SKILL, tool_id: TOOL.update_feature_request,        requirement_level: "required", notes: "Move feature_requests through triage to prioritized, accepted, rejected, archived; link to product_features on acceptance." },
  { skill_id: DISCOVERY_SKILL, tool_id: TOOL.update_customer_feedback_item, requirement_level: "required", notes: "Classify, link to feature_requests or product_features, set status." },
  { skill_id: DISCOVERY_SKILL, tool_id: TOOL.notify_person,                 requirement_level: "required", notes: "Notify owning product manager when a feature_request crosses the upvote or signal threshold." },

  // pm_roadmap_delivery_agent
  { skill_id: ROADMAP_SKILL,   tool_id: TOOL.query_product_lines,           requirement_level: "required", notes: "Read product line catalog as roadmap and release grouping context." },
  { skill_id: ROADMAP_SKILL,   tool_id: TOOL.query_product_features,        requirement_level: "required", notes: "Read product features for release scoping and metric attribution." },
  { skill_id: ROADMAP_SKILL,   tool_id: TOOL.query_product_releases,        requirement_level: "required", notes: "Read release plan and shipped releases for status, regression, and announcement context." },
  { skill_id: ROADMAP_SKILL,   tool_id: TOOL.query_product_roadmaps,        requirement_level: "required", notes: "Read roadmaps for publication and audience-specific views." },
  { skill_id: ROADMAP_SKILL,   tool_id: TOOL.query_product_metrics,         requirement_level: "required", notes: "Read product metrics for strategy/OKR linkage and outcome reporting." },
  { skill_id: ROADMAP_SKILL,   tool_id: TOOL.query_beta_programs,           requirement_level: "required", notes: "Read beta programs for launch staging and feedback collection." },
  { skill_id: ROADMAP_SKILL,   tool_id: TOOL.query_value_streams,           requirement_level: "required", notes: "Read value streams as the delivery-flow context the roadmap aligns to (BPA contributor read)." },
  { skill_id: ROADMAP_SKILL,   tool_id: TOOL.update_product_roadmap,        requirement_level: "required", notes: "Publish roadmap versions, promote items between now/next/later, change audience scope." },
  { skill_id: ROADMAP_SKILL,   tool_id: TOOL.create_product_release,        requirement_level: "required", notes: "Plan new product releases with target dates and feature sets." },
  { skill_id: ROADMAP_SKILL,   tool_id: TOOL.update_product_release,        requirement_level: "required", notes: "Move releases through planned, in_progress, shipped, rolled_back states." },
  { skill_id: ROADMAP_SKILL,   tool_id: TOOL.update_product_feature,        requirement_level: "required", notes: "Set product_feature state to released or deprecated; link to release rows." },
  { skill_id: ROADMAP_SKILL,   tool_id: TOOL.create_beta_program,           requirement_level: "required", notes: "Stand up beta programs for one or more features with defined cohorts." },
  { skill_id: ROADMAP_SKILL,   tool_id: TOOL.update_beta_program,           requirement_level: "required", notes: "Launch, monitor, and close beta programs." },
  { skill_id: ROADMAP_SKILL,   tool_id: TOOL.record_product_metric,         requirement_level: "required", notes: "Record adoption, usage, quality metrics linked to features and releases." },
  { skill_id: ROADMAP_SKILL,   tool_id: TOOL.notify_team,                   requirement_level: "required", notes: "Broadcast release announcements to internal channels (engineering, support, sales, CS). Broadcast is the workflow contract — release messaging fans out to multiple teams simultaneously." },
];

console.log(`\n[3/4] skill_tools`);
const skillIds = [DISCOVERY_SKILL, ROADMAP_SKILL].join(",");
const existingSt = await get(`/skill_tools?skill_id=in.(${skillIds})&select=skill_id,tool_id`);
const stKey = (r: Row) => `${r.skill_id}|${r.tool_id}`;
const existingStKeys = new Set(existingSt.map(stKey));
const missingSt = skillTools.filter(r => !existingStKeys.has(stKey(r)));
if (missingSt.length > 0) {
  console.log(`  inserting ${missingSt.length} new skill_tools (${existingSt.length} existed)`);
  await insert("/skill_tools", missingSt);
} else {
  console.log(`  all ${existingSt.length} present, nothing to insert`);
}

// ============================================================
// 4. Retire legacy domain-level skill 92 (F1 fix)
// ============================================================
console.log(`\n[4/4] Retire legacy domain-level skill 92 (prod-mgmt-system)`);
const legacy = await get(`/skills?id=eq.92&select=id,skill_name,domain_module_id`);
if (legacy.length === 0) {
  console.log(`  skill 92 already gone`);
} else if (legacy[0].domain_module_id !== null) {
  console.log(`  skill 92 has domain_module_id=${legacy[0].domain_module_id}; not a legacy row, skipping`);
} else {
  console.log(`  DELETING skill 92 (cascade removes its 8 skill_tools rows)`);
  await del(`/skills?id=eq.92`);
  console.log(`  deleted`);
}

console.log("\nPhase S load complete.");
