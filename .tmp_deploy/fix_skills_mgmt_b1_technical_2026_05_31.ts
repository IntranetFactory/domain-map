#!/usr/bin/env bun
// SKILLS-MGMT B1 technical fixes — 2026-05-31
//
// Applies ONLY the truly-technical Bucket-1 items from audits/SKILLS-MGMT.md.
// Each fix is independently classified per the parent-task rules:
//   - B1-S5  : INSERT 3 user-edges in data_object_relationships  (Rule #10; audit pre-specifies verbs)
//   - B1-B2  : PATCH necessity=optional on DMDO 917 + 918        (Rule #16; audit names row IDs)
//   - B1-H1  : INSERT 9 handoff_processes rows                    (audit pre-specifies handoff_id + PCF process_id)
//
// All other B1 items (S1, S2, S3, S4, S6, B1) are DEFERRED per the parent-task instructions
// (new entities, gated on judgment, surface-to-user, "user picks", catalog UX wording, etc.).
//
// Run from the project root:
//   bun run "c:/dev/domain-map/.tmp_deploy/fix_skills_mgmt_b1_technical_2026_05_31.ts"

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

async function post(path: string, rows: Row[]): Promise<Row[]> {
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

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

// =====================================================================
// Step 1 — Sanity: confirm tenant + key IDs.
// =====================================================================
const me = await call({ method: "GET", path: "/rpc/me" }).catch(() => []);
// (Soft check; not all tenants expose /rpc/me. The hard check is the FK resolution below.)

const USERS_ID = 748;            // data_objects.id for kind='platform_builtin' 'users'
const SKILL_TAXONOMIES_ID = 852; // data_objects.id
const SKILLS_ID = 854;           // data_objects.id
const SKILL_INFERENCE_RUNS_ID = 858;

const DMDO_LEARNER_CERT_ID = 917;     // contributor + required -> flip to optional
const DMDO_COURSE_ENROLL_ID = 918;    // contributor + required -> flip to optional

// =====================================================================
// Step 2 — B1-S5: INSERT 3 user-edges.
// Rule #10 requires explicit user-typed actor edges against the platform-builtin
// `users` row. Audit pre-specifies the verbs and is_required=false.
// =====================================================================
console.log("\n=== B1-S5: user-edges on data_object_relationships ===");

const userEdgeCandidates = [
  // users -> skill_taxonomies (curator / publisher)
  {
    data_object_id: USERS_ID,
    related_data_object_id: SKILL_TAXONOMIES_ID,
    relationship_verb: "curates",
    inverse_verb: "curated by",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: false,
  },
  // users -> skills (created_by / curator on the ontology row)
  {
    data_object_id: USERS_ID,
    related_data_object_id: SKILLS_ID,
    relationship_verb: "authors",
    inverse_verb: "authored by",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: false,
  },
  // users -> skill_inference_runs (initiated_by, when manually triggered)
  {
    data_object_id: USERS_ID,
    related_data_object_id: SKILL_INFERENCE_RUNS_ID,
    relationship_verb: "initiates",
    inverse_verb: "initiated by",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: false,
  },
];

// Pre-flight: skip any pair already present (idempotent re-run).
const existingUserEdges = await get(
  `/data_object_relationships?data_object_id=eq.${USERS_ID}` +
    `&related_data_object_id=in.(${SKILL_TAXONOMIES_ID},${SKILLS_ID},${SKILL_INFERENCE_RUNS_ID})` +
    `&select=id,data_object_id,related_data_object_id,relationship_verb`,
);
const existingPairs = new Set(
  existingUserEdges.map(r => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`),
);
const newUserEdges = userEdgeCandidates.filter(
  c => !existingPairs.has(`${c.data_object_id}|${c.related_data_object_id}|${c.relationship_verb}`),
);
console.log(`  existing pairs covering these 3 targets: ${existingUserEdges.length}`);
console.log(`  inserting ${newUserEdges.length} new user-edges (skipped ${userEdgeCandidates.length - newUserEdges.length})`);
if (newUserEdges.length > 0) {
  await post("/data_object_relationships", newUserEdges);
}

// =====================================================================
// Step 3 — B1-B2: PATCH necessity=optional on DMDO 917 + 918.
// Rule #16: infrastructure-shape externals (LMS course_enrollments,
// learner_certifications) stay `optional` on non-master rows so PROFILE
// inference can degrade to assessment-only for SMB / single-source deployments.
// Audit names the specific row IDs.
// =====================================================================
console.log("\n=== B1-B2: PATCH DMDO necessity=optional ===");

for (const dmdoId of [DMDO_LEARNER_CERT_ID, DMDO_COURSE_ENROLL_ID]) {
  const before = await get(`/domain_module_data_objects?id=eq.${dmdoId}&select=id,role,necessity,data_objects(data_object_name)`);
  if (before.length === 0) {
    console.log(`  DMDO ${dmdoId}: NOT FOUND, skipping`);
    continue;
  }
  const row = before[0];
  if (row.necessity === "optional") {
    console.log(`  DMDO ${dmdoId} (${(row.data_objects as any)?.data_object_name}): already optional, skipping`);
    continue;
  }
  console.log(`  DMDO ${dmdoId} (${(row.data_objects as any)?.data_object_name}): ${row.necessity} -> optional`);
  await patch(`/domain_module_data_objects?id=eq.${dmdoId}`, { necessity: "optional" });
}

// =====================================================================
// Step 4 — B1-H1: INSERT handoff_processes for 9 confident PCF pairings.
// Audit pre-specifies (handoff_id, process_id) tuples; all PCF rows verified
// to exist in /processes; all 9 handoffs verified to exist. Provenance is
// `agent_curated`, record_status defaults to 'new' (Rule #1: omit explicit).
// =====================================================================
console.log("\n=== B1-H1: INSERT handoff_processes (agent_curated) ===");

const handoffProcessRows = [
  { handoff_id: 388,  process_id: 1036, proposal_source: "agent_curated" }, // HCM -> SKILLS-MGMT job_profile.published -> Define employees competencies and skills
  { handoff_id: 432,  process_id: 1033, proposal_source: "agent_curated" }, // SKILLS-MGMT -> TALENT-MGMT skill_profile.updated -> Manage employee skill and competency development
  { handoff_id: 440,  process_id: 226,  proposal_source: "agent_curated" }, // TALENT-MGMT -> SKILLS-MGMT performance_goal.set -> Manage employee career development
  { handoff_id: 456,  process_id: 1038, proposal_source: "agent_curated" }, // SWP -> SKILLS-MGMT skills_gap_analysis.completed -> Establish training needs by analysis of required and available skills
  { handoff_id: 1079, process_id: 1033, proposal_source: "agent_curated" }, // LMS -> SKILLS-MGMT course_enrollment.completed -> Manage employee skill and competency development
  { handoff_id: 1080, process_id: 1873, proposal_source: "agent_curated" }, // LMS -> SKILLS-MGMT learner_certification.earned -> Manage certifications and skills
  { handoff_id: 1106, process_id: 1038, proposal_source: "agent_curated" }, // PA -> SKILLS-MGMT skill_gap.identified -> Establish training needs by analysis of required and available skills
  { handoff_id: 1288, process_id: 1033, proposal_source: "agent_curated" }, // LMS -> SKILLS-MGMT course_completion.recorded -> Manage employee skill and competency development
  { handoff_id: 1295, process_id: 1873, proposal_source: "agent_curated" }, // LMS -> SKILLS-MGMT learner_badge.earned -> Manage certifications and skills
];

const handoffIds = handoffProcessRows.map(r => r.handoff_id).join(",");
const existingHP = await get(
  `/handoff_processes?handoff_id=in.(${handoffIds})&select=id,handoff_id,process_id`,
);
const existingHPKeys = new Set(existingHP.map(r => `${r.handoff_id}|${r.process_id}`));
const newHP = handoffProcessRows.filter(r => !existingHPKeys.has(`${r.handoff_id}|${r.process_id}`));
console.log(`  existing handoff_processes on these 9 handoffs: ${existingHP.length}`);
console.log(`  inserting ${newHP.length} new handoff_processes rows (skipped ${handoffProcessRows.length - newHP.length})`);
if (newHP.length > 0) {
  await post("/handoff_processes", newHP);
}

// =====================================================================
// Summary
// =====================================================================
console.log("\n=== Summary ===");
console.log("B1-S5 user-edges        :", newUserEdges.length, "inserted");
console.log("B1-B2 DMDO PATCH        : up to 2 PATCHed (necessity -> optional)");
console.log("B1-H1 handoff_processes :", newHP.length, "inserted");
console.log("\nUI spot-check:");
console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
console.log("  https://tests.semantius.app/domain_map/domain_module_data_objects");
console.log("  https://tests.semantius.app/domain_map/handoff_processes");
