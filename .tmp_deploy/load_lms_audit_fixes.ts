#!/usr/bin/env bun
// load_lms_audit_fixes.ts
//
// Comprehensive LMS domain audit fix loader. Applies, idempotently:
//   1. Phase M: 3 domain_modules + domain_module_capabilities (6) + domain_module_data_objects (~22)
//      + domain_starter_modules (3) + M5 lifecycle-state domain_module_id assignment
//   2. B4: notes annotation on `courses` master (pattern flags considered)
//   3. B9 enum fix: 8 trigger_events (435-442) with empty event_category get correct enum values
//   4. B9 fanout: add 3 cross_domain_handoffs rows for compliance_assignment.due (LMS -> HCM, HRSD, GRC)
//   5. C2: business_function_capabilities override for COMPLIANCE-TRAIN (cap 21) -> GRC owner
//   6. A4: backfill solution_capabilities matrix (5 caps x 9 LMS-primary solutions) + Leapsome secondary
//   7. A6: solution_data_objects rows for 9 primary LMS solutions x LMS masters
//
// Run from project root: bun run c:/dev/domain-map/.tmp_deploy/load_lms_audit_fixes.ts

export {};

type Row = Record<string, unknown>;

async function postgrest(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path} (exit ${code}): ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

// ============================================================
// 0. Resolve FK maps
// ============================================================
console.log("=== 0. Resolving FK maps ===");

const LMS_ID = 57;
const HCM_ID = 54;
const HRSD_ID = 22;
const GRC_ID = 15;

const BF_LD = 11;       // Learning and Development
const BF_GRC = 31;      // Governance, Risk and Compliance

const capCodes = ["COURSE-AUTHOR", "CONTENT-DELIVERY", "SKILLS-MGMT", "COMPLIANCE-TRAIN", "CERT-MGMT", "LEARNING-PATH"];
const capRows: Row[] = await postgrest(
  "GET",
  `/capabilities?capability_code=in.(${capCodes.join(",")})&select=id,capability_code`,
) ?? [];
const capId: Record<string, number> = {};
for (const r of capRows) capId[String(r.capability_code)] = Number(r.id);
console.log(`  capabilities: ${Object.keys(capId).length}/${capCodes.length}`);

const doNames = [
  "courses", "learning_paths", "course_enrollments", "learning_records",
  "learner_certifications", "skill_profiles", "compliance_assignments",
  "employees", "hcm_positions", "org_units", "job_profiles", "cost_centers",
];
const doRows: Row[] = await postgrest(
  "GET",
  `/data_objects?data_object_name=in.(${doNames.join(",")})&select=id,data_object_name`,
) ?? [];
const doId: Record<string, number> = {};
for (const r of doRows) doId[String(r.data_object_name)] = Number(r.id);
console.log(`  data_objects: ${Object.keys(doId).length}/${doNames.length}`);

const solRows: Row[] = await postgrest(
  "GET",
  "/solutions?id=in.(192,234,235,236,237,238,239,515,516,517)&select=id,solution_name",
) ?? [];
const solId: Record<number, string> = {};
for (const r of solRows) solId[Number(r.id)] = String(r.solution_name);
console.log(`  solutions: ${Object.keys(solId).length}/10`);

// ============================================================
// 1. domain_modules (3 rows)
// ============================================================
console.log("\n=== 1. domain_modules (3 rows) ===");

type ModuleSpec = { code: string; name: string; description: string };

const modules: ModuleSpec[] = [
  {
    code: "LMS-COURSE-DELIVERY",
    name: "Course Delivery",
    description:
      "The core LMS workflow: course authoring, content delivery, enrollment, completion tracking, and transcript posting. Masters `courses`, `course_enrollments`, `learning_records`. Realizes COURSE-AUTHOR and CONTENT-DELIVERY capabilities. The backbone module every LMS deployment installs first; the other LMS modules embedded_master courses to reference content.",
  },
  {
    code: "LMS-COMPLIANCE-TRAINING",
    name: "Compliance Training",
    description:
      "Mandatory regulatory training assignment, tracking, and certification: sexual harassment training (CA SB-1343), HIPAA, OSHA, anti-bribery, SOX, GDPR, AML. Masters `compliance_assignments` and `learner_certifications`. Realizes COMPLIANCE-TRAIN and CERT-MGMT. Distinct from general LMS course delivery: assignments are mandatory and time-bound, lifecycle includes `overdue`/`waived`/`expired` states with regulator-evidence retention, and ownership typically sits with GRC/Compliance, not L&D. Specialised vendor market: KnowBe4, NAVEX, EVERFI, MetricStream, OneTrust, plus all general LMSs.",
  },
  {
    code: "LMS-SKILLS",
    name: "Skills and Learning Paths",
    description:
      "Skills-cloud surface of an LMS: employee skill profiles, competency tracking, and skills-driven learning-path recommendation. Masters `skill_profiles` and `learning_paths`. Realizes SKILLS-MGMT and LEARNING-PATH. Distinct from LMS-COURSE-DELIVERY because learning paths here are assigned to close skill gaps (Workday Skills Cloud, Cornerstone Skills Graph, SAP Skills Ontology, Degreed Pathways) rather than sequenced as course curricula. Heavy contributors: TALENT-MGMT (talent reviews), ATS (internal mobility), SWP (workforce planning).",
  },
];

for (const m of modules) {
  const [existing] = await postgrest(
    "GET",
    `/domain_modules?domain_module_code=eq.${m.code}&select=id`,
  ) ?? [];
  if (existing) {
    console.log(`  ♻ ${m.code} (id=${existing.id})`);
    continue;
  }
  console.log(`  ✨ ${m.code}`);
  await postgrest("POST", "/domain_modules", {
    domain_module_code: m.code,
    domain_module_name: m.name,
    domain_id: LMS_ID,
    description: m.description,
  });
}

const modRows: Row[] = await postgrest(
  "GET",
  `/domain_modules?domain_module_code=in.(${modules.map((m) => m.code).join(",")})&select=id,domain_module_code`,
) ?? [];
const modId: Record<string, number> = {};
for (const r of modRows) modId[String(r.domain_module_code)] = Number(r.id);
console.log(`  ${Object.keys(modId).length}/${modules.length} modules resolved`);

// ============================================================
// 2. domain_module_capabilities (6 rows)
// ============================================================
console.log("\n=== 2. domain_module_capabilities (6 rows) ===");

const moduleCaps: Array<{ module: string; capability: string; notes?: string }> = [
  { module: "LMS-COURSE-DELIVERY", capability: "COURSE-AUTHOR" },
  { module: "LMS-COURSE-DELIVERY", capability: "CONTENT-DELIVERY" },
  { module: "LMS-COMPLIANCE-TRAINING", capability: "COMPLIANCE-TRAIN" },
  { module: "LMS-COMPLIANCE-TRAINING", capability: "CERT-MGMT", notes: "Compliance certifications (Code-of-Conduct, anti-harassment, HIPAA Authorized User, GDPR DPA training) live here. General professional certs (PMP, AWS, CISSP) are also issued via this module for the lifecycle workflow — the credential type is just data, the workflow is the same." },
  { module: "LMS-SKILLS", capability: "SKILLS-MGMT" },
  { module: "LMS-SKILLS", capability: "LEARNING-PATH", notes: "Learning paths sit here under the skills-cloud framing — paths are assigned to close skill gaps. Skills-cloud LMSs (Workday, Cornerstone, SAP, Degreed) market this surface specifically." },
];

const existingCaps: Row[] = await postgrest(
  "GET",
  `/domain_module_capabilities?domain_module_id=in.(${Object.values(modId).join(",")})&select=domain_module_id,capability_id`,
) ?? [];
const seenCapPairs = new Set(existingCaps.map((r) => `${r.domain_module_id}:${r.capability_id}`));

for (const mc of moduleCaps) {
  const moduleId = modId[mc.module];
  const capabilityId = capId[mc.capability];
  if (!moduleId || !capabilityId) {
    console.log(`  ⚠ skip ${mc.module} ↔ ${mc.capability} (unresolved)`);
    continue;
  }
  const key = `${moduleId}:${capabilityId}`;
  if (seenCapPairs.has(key)) {
    console.log(`  ♻ ${mc.module} ↔ ${mc.capability}`);
    continue;
  }
  console.log(`  ✨ ${mc.module} ↔ ${mc.capability}`);
  const body: Row = { domain_module_id: moduleId, capability_id: capabilityId };
  if (mc.notes) body.notes = mc.notes;
  await postgrest("POST", "/domain_module_capabilities", body);
}

// ============================================================
// 3. domain_module_data_objects (~22 rows)
// ============================================================
console.log("\n=== 3. domain_module_data_objects ===");

type ModDO = {
  module: string;
  dataObject: string;
  role: "master" | "embedded_master" | "contributor" | "consumer" | "derived";
  necessity?: "required" | "optional";
  notes?: string;
};

const moduleDataObjects: ModDO[] = [
  // LMS-COURSE-DELIVERY
  { module: "LMS-COURSE-DELIVERY", dataObject: "courses", role: "master" },
  { module: "LMS-COURSE-DELIVERY", dataObject: "course_enrollments", role: "master" },
  { module: "LMS-COURSE-DELIVERY", dataObject: "learning_records", role: "master" },
  { module: "LMS-COURSE-DELIVERY", dataObject: "employees", role: "embedded_master", necessity: "required", notes: "Local-masters worker shell (manager, department, hire date) when deployed standalone. Reads from HCM when integrated." },
  { module: "LMS-COURSE-DELIVERY", dataObject: "org_units", role: "embedded_master", necessity: "required", notes: "Local-masters org structure for department-scoped enrollment and team-level reporting." },
  { module: "LMS-COURSE-DELIVERY", dataObject: "hcm_positions", role: "embedded_master", necessity: "optional", notes: "Only needed for role-based enrollment rules; many course-delivery deployments key off employees + org_units." },
  { module: "LMS-COURSE-DELIVERY", dataObject: "cost_centers", role: "embedded_master", necessity: "optional", notes: "Training-cost allocation tag; only populated when finance integration or training-budget tracking is enabled." },

  // LMS-COMPLIANCE-TRAINING
  { module: "LMS-COMPLIANCE-TRAINING", dataObject: "compliance_assignments", role: "master" },
  { module: "LMS-COMPLIANCE-TRAINING", dataObject: "learner_certifications", role: "master" },
  { module: "LMS-COMPLIANCE-TRAINING", dataObject: "courses", role: "embedded_master", necessity: "required", notes: "Compliance assignments fulfill specific courses. Without LMS-COURSE-DELIVERY installed, this module needs a local course shell holding course_id + title + duration to render the assignment." },
  { module: "LMS-COMPLIANCE-TRAINING", dataObject: "employees", role: "embedded_master", necessity: "required" },
  { module: "LMS-COMPLIANCE-TRAINING", dataObject: "org_units", role: "embedded_master", necessity: "required", notes: "Org-scoped compliance rules (legal-entity, region) drive which assignments fire." },
  { module: "LMS-COMPLIANCE-TRAINING", dataObject: "hcm_positions", role: "embedded_master", necessity: "optional", notes: "Role-based compliance rules (manager training, supervisor harassment training) need position context when active." },
  { module: "LMS-COMPLIANCE-TRAINING", dataObject: "cost_centers", role: "embedded_master", necessity: "optional" },

  // LMS-SKILLS
  { module: "LMS-SKILLS", dataObject: "skill_profiles", role: "master" },
  { module: "LMS-SKILLS", dataObject: "learning_paths", role: "master" },
  { module: "LMS-SKILLS", dataObject: "course_enrollments", role: "embedded_master", necessity: "required", notes: "Completed enrollments feed skill-profile updates. Without LMS-COURSE-DELIVERY, this module needs a local enrollment shell to compute skill attainment." },
  { module: "LMS-SKILLS", dataObject: "learner_certifications", role: "embedded_master", necessity: "required", notes: "Earned certifications feed skill-profile updates. Without LMS-COMPLIANCE-TRAINING, this module needs a local certification shell." },
  { module: "LMS-SKILLS", dataObject: "employees", role: "embedded_master", necessity: "required" },
  { module: "LMS-SKILLS", dataObject: "job_profiles", role: "embedded_master", necessity: "optional", notes: "Skills-cloud LMSs match employee skills to job-profile expected skills to compute gaps." },
  { module: "LMS-SKILLS", dataObject: "hcm_positions", role: "embedded_master", necessity: "optional" },
  { module: "LMS-SKILLS", dataObject: "org_units", role: "embedded_master", necessity: "optional" },
];

const existingMDO: Row[] = await postgrest(
  "GET",
  `/domain_module_data_objects?domain_module_id=in.(${Object.values(modId).join(",")})&select=domain_module_id,data_object_id`,
) ?? [];
const seenMDO = new Set(existingMDO.map((r) => `${r.domain_module_id}:${r.data_object_id}`));

let mdoAdded = 0;
for (const mdo of moduleDataObjects) {
  const moduleId = modId[mdo.module];
  const dataObjectId = doId[mdo.dataObject];
  if (!moduleId || !dataObjectId) {
    console.log(`  ⚠ skip ${mdo.module} / ${mdo.dataObject} (unresolved)`);
    continue;
  }
  const key = `${moduleId}:${dataObjectId}`;
  if (seenMDO.has(key)) continue;
  const body: Row = {
    domain_module_id: moduleId,
    data_object_id: dataObjectId,
    role: mdo.role,
  };
  if (mdo.necessity) body.necessity = mdo.necessity;
  if (mdo.notes) body.notes = mdo.notes;
  await postgrest("POST", "/domain_module_data_objects", body);
  mdoAdded++;
}
console.log(`  ✨ ${mdoAdded} new (${moduleDataObjects.length} total declared)`);

// ============================================================
// 4. domain_starter_modules (3 rows)
// ============================================================
console.log("\n=== 4. domain_starter_modules (3 rows) ===");

const starter: Array<{ module: string; position: number; notes: string }> = [
  {
    module: "LMS-COURSE-DELIVERY",
    position: 1,
    notes: "Start here. The backbone: courses, enrollments, transcripts. Every LMS deployment installs this first.",
  },
  {
    module: "LMS-COMPLIANCE-TRAINING",
    position: 2,
    notes: "Mandatory regulatory training and certifications: harassment, HIPAA, OSHA, anti-bribery, SOX. Often the second module installed because compliance is a top-down audit obligation; can be installed without LMS-SKILLS but typically alongside LMS-COURSE-DELIVERY.",
  },
  {
    module: "LMS-SKILLS",
    position: 3,
    notes: "Add when the org wants skills-cloud capability: skill profiles, gap closure, skills-driven path assignment. Requires the course-delivery backbone for enrollment-driven skill updates.",
  },
];

const existingStarter: Row[] = await postgrest(
  "GET",
  `/domain_starter_modules?domain_id=eq.${LMS_ID}&select=domain_module_id,position`,
) ?? [];
const seenStarter = new Set(existingStarter.map((r) => String(r.domain_module_id)));

for (const s of starter) {
  const moduleId = modId[s.module];
  if (!moduleId) continue;
  if (seenStarter.has(String(moduleId))) {
    console.log(`  ♻ position ${s.position} ${s.module}`);
    continue;
  }
  console.log(`  ✨ position ${s.position} ${s.module}`);
  await postgrest("POST", "/domain_starter_modules", {
    domain_id: LMS_ID,
    domain_module_id: moduleId,
    position: s.position,
    notes: s.notes,
  });
}

// ============================================================
// 5. M5: lifecycle-state domain_module_id assignment
// ============================================================
console.log("\n=== 5. lifecycle-state module assignment (M5) ===");

type LifecycleAnnot = { dataObject: string; stateName: string; module: string };
const lifecycleAnnots: LifecycleAnnot[] = [
  // courses (167) → LMS-COURSE-DELIVERY
  { dataObject: "courses", stateName: "published", module: "LMS-COURSE-DELIVERY" },
  { dataObject: "courses", stateName: "retired", module: "LMS-COURSE-DELIVERY" },
  // learning_paths (168) → LMS-SKILLS
  { dataObject: "learning_paths", stateName: "published", module: "LMS-SKILLS" },
  { dataObject: "learning_paths", stateName: "retired", module: "LMS-SKILLS" },
  // course_enrollments (169) → LMS-COURSE-DELIVERY
  { dataObject: "course_enrollments", stateName: "completed", module: "LMS-COURSE-DELIVERY" },
  { dataObject: "course_enrollments", stateName: "failed", module: "LMS-COURSE-DELIVERY" },
  { dataObject: "course_enrollments", stateName: "expired", module: "LMS-COURSE-DELIVERY" },
  { dataObject: "course_enrollments", stateName: "withdrawn", module: "LMS-COURSE-DELIVERY" },
  // learning_records (170) → LMS-COURSE-DELIVERY
  { dataObject: "learning_records", stateName: "validated", module: "LMS-COURSE-DELIVERY" },
  { dataObject: "learning_records", stateName: "voided", module: "LMS-COURSE-DELIVERY" },
  // learner_certifications (171) → LMS-COMPLIANCE-TRAINING
  { dataObject: "learner_certifications", stateName: "issued", module: "LMS-COMPLIANCE-TRAINING" },
  { dataObject: "learner_certifications", stateName: "renewed", module: "LMS-COMPLIANCE-TRAINING" },
  { dataObject: "learner_certifications", stateName: "revoked", module: "LMS-COMPLIANCE-TRAINING" },
  // skill_profiles (172) → LMS-SKILLS
  { dataObject: "skill_profiles", stateName: "validated", module: "LMS-SKILLS" },
  { dataObject: "skill_profiles", stateName: "inactive", module: "LMS-SKILLS" },
  // compliance_assignments (173) → LMS-COMPLIANCE-TRAINING
  { dataObject: "compliance_assignments", stateName: "completed", module: "LMS-COMPLIANCE-TRAINING" },
  { dataObject: "compliance_assignments", stateName: "waived", module: "LMS-COMPLIANCE-TRAINING" },
  { dataObject: "compliance_assignments", stateName: "expired", module: "LMS-COMPLIANCE-TRAINING" },
];

for (const a of lifecycleAnnots) {
  const objId = doId[a.dataObject];
  const modPK = modId[a.module];
  if (!objId || !modPK) {
    console.log(`  ⚠ skip ${a.dataObject}.${a.stateName} (unresolved)`);
    continue;
  }
  const [state] = await postgrest(
    "GET",
    `/data_object_lifecycle_states?data_object_id=eq.${objId}&state_name=eq.${a.stateName}&select=id,domain_module_id`,
  ) ?? [];
  if (!state) {
    console.log(`  ⚠ skip ${a.dataObject}.${a.stateName} (state not found)`);
    continue;
  }
  if (state.domain_module_id) {
    console.log(`  ♻ ${a.dataObject}.${a.stateName} already annotated (module ${state.domain_module_id})`);
    continue;
  }
  console.log(`  ✨ ${a.dataObject}.${a.stateName} → ${a.module}`);
  await postgrest("PATCH", `/data_object_lifecycle_states?id=eq.${state.id}`, {
    domain_module_id: modPK,
  });
}

// ============================================================
// 6. B4: notes annotation on `courses` master
// ============================================================
console.log("\n=== 6. B4 notes on `courses` ===");

const coursesB4Note = "Pattern flags audit (2026-05-23): no personal content (course is the asset, not a learner's record), no submit lock (drafts can be edited until publish), no single approver (publish workflow is typically multi-stage SME + L&D review). All three flags correctly false.";

const [coursesRow] = await postgrest(
  "GET",
  `/data_objects?id=eq.${doId["courses"]}&select=id,notes`,
) ?? [];
if (coursesRow?.notes && String(coursesRow.notes).trim().length > 0) {
  console.log(`  ♻ courses already has notes (${String(coursesRow.notes).length} chars)`);
} else {
  console.log("  ✨ PATCH courses.notes");
  await postgrest("PATCH", `/data_objects?id=eq.${doId["courses"]}`, { notes: coursesB4Note });
}

// ============================================================
// 7. B9 enum fix: 8 trigger_events with empty event_category
// ============================================================
console.log("\n=== 7. B9 enum fix on 8 trigger_events ===");

// enum allowed: lifecycle, state_change, threshold, signal
const eventCategoryFixes: Array<{ id: number; eventName: string; category: string }> = [
  { id: 435, eventName: "course.published", category: "lifecycle" },
  { id: 436, eventName: "course.retired", category: "lifecycle" },
  { id: 437, eventName: "learning_path.assigned", category: "state_change" },
  { id: 438, eventName: "course_enrollment.completed", category: "lifecycle" },
  { id: 439, eventName: "learning_record.posted", category: "lifecycle" },
  { id: 440, eventName: "skill_profile.updated", category: "state_change" },
  { id: 441, eventName: "compliance_assignment.due", category: "threshold" },
  { id: 442, eventName: "compliance_assignment.overdue", category: "threshold" },
];

for (const e of eventCategoryFixes) {
  const [existing] = await postgrest(
    "GET",
    `/trigger_events?id=eq.${e.id}&select=id,event_name,event_category`,
  ) ?? [];
  if (!existing) {
    console.log(`  ⚠ skip ${e.eventName} (id ${e.id} not found)`);
    continue;
  }
  if (existing.event_category && String(existing.event_category).length > 0) {
    console.log(`  ♻ ${e.eventName} already set (${existing.event_category})`);
    continue;
  }
  console.log(`  ✨ ${e.eventName} → event_category=${e.category}`);
  await postgrest("PATCH", `/trigger_events?id=eq.${e.id}`, { event_category: e.category });
}

// ============================================================
// 8. B9 fanout: compliance_assignment.due (event 441) → HCM, HRSD, GRC
// ============================================================
console.log("\n=== 8. compliance_assignment.due fan-out handoffs ===");

const dueEventId = 441;
const complianceAssignmentsDOId = doId["compliance_assignments"];
const complianceModuleId = modId["LMS-COMPLIANCE-TRAINING"];

const dueFanout: Array<{ targetDomainId: number; targetCode: string; integration: string; friction: string; description: string }> = [
  {
    targetDomainId: HCM_ID,
    targetCode: "HCM",
    integration: "event_stream",
    friction: "medium",
    description: "Compliance assignment due-date nudges to HCM-mastered manager/employee record. HCM surfaces the impending obligation on the employee profile and routes a reminder to the line manager.",
  },
  {
    targetDomainId: HRSD_ID,
    targetCode: "HRSD",
    integration: "api_call",
    friction: "medium",
    description: "HR Service Delivery opens (or updates) an employee-facing case/task with the impending obligation, deadline, and link to the assigned course. Failure mode: when an HRSD platform isn't deployed, the nudge falls back to direct email and the in-tool reminder.",
  },
  {
    targetDomainId: GRC_ID,
    targetCode: "GRC",
    integration: "event_stream",
    friction: "medium",
    description: "GRC obligation tracker updates the per-employee compliance status to 'due' so the regulator-evidence dashboard reflects the impending breach risk. Drives audit-evidence reporting (e.g., Compliance Operations dashboard).",
  },
];

for (const f of dueFanout) {
  const [existing] = await postgrest(
    "GET",
    `/cross_domain_handoffs?source_domain_id=eq.${LMS_ID}&target_domain_id=eq.${f.targetDomainId}&trigger_event_id=eq.${dueEventId}&select=id`,
  ) ?? [];
  if (existing) {
    console.log(`  ♻ LMS → ${f.targetCode} on event ${dueEventId} (id=${existing.id})`);
    continue;
  }
  console.log(`  ✨ LMS → ${f.targetCode} on compliance_assignment.due`);
  await postgrest("POST", "/cross_domain_handoffs", {
    source_domain_id: LMS_ID,
    target_domain_id: f.targetDomainId,
    data_object_id: complianceAssignmentsDOId,
    trigger_event_id: dueEventId,
    source_domain_module_id: complianceModuleId,
    integration_pattern: f.integration,
    friction_level: f.friction,
    description: f.description,
  });
}

// ============================================================
// 9. C2: COMPLIANCE-TRAIN GRC ownership override
// ============================================================
console.log("\n=== 9. C2: COMPLIANCE-TRAIN GRC override ===");

// Domain RACI: LMS owned by L&D. Capability COMPLIANCE-TRAIN is typically owned by GRC/Compliance, not L&D.
// Add 2 rows: GRC=owner, L&D=contributor (L&D delivers the content; GRC owns the obligation).

const c2Rows: Array<{ capability: string; bfId: number; bfLabel: string; responsibility: string; notes: string }> = [
  {
    capability: "COMPLIANCE-TRAIN",
    bfId: BF_GRC,
    bfLabel: "GRC",
    responsibility: "owner",
    notes: "Compliance training is a regulatory obligation; GRC/Compliance own which trainings are mandatory, who must complete them by when, and the audit-evidence trail. L&D delivers the content but does not own the obligation.",
  },
  {
    capability: "COMPLIANCE-TRAIN",
    bfId: BF_LD,
    bfLabel: "L&D",
    responsibility: "contributor",
    notes: "L&D authors and curates compliance courses, partners with SMEs on content quality, and runs the LMS delivery surface. Reports completion metrics to GRC.",
  },
];

const existingC2: Row[] = await postgrest(
  "GET",
  `/business_function_capabilities?capability_id=eq.${capId["COMPLIANCE-TRAIN"]}&select=business_function_id,capability_id`,
) ?? [];
const seenC2 = new Set(existingC2.map((r) => `${r.business_function_id}:${r.capability_id}`));

for (const r of c2Rows) {
  const key = `${r.bfId}:${capId[r.capability]}`;
  if (seenC2.has(key)) {
    console.log(`  ♻ ${r.capability} ↔ ${r.bfLabel} (${r.responsibility})`);
    continue;
  }
  console.log(`  ✨ ${r.capability} ↔ ${r.bfLabel} (${r.responsibility})`);
  await postgrest("POST", "/business_function_capabilities", {
    capability_id: capId[r.capability],
    business_function_id: r.bfId,
    responsibility_type: r.responsibility,
    notes: r.notes,
  });
}

// ============================================================
// 10. A4: solution_capabilities backfill
// ============================================================
console.log("\n=== 10. A4 solution_capabilities backfill ===");

// 5 caps (COURSE-AUTHOR, CONTENT-DELIVERY, SKILLS-MGMT, CERT-MGMT, LEARNING-PATH) × 9 LMS-primary solutions
// + Leapsome (secondary, sol 517) on the same caps.
// COMPLIANCE-TRAIN (cap 21) is already well-populated — skip.
// Existing Workday Learning (sol 192) rows already cover all 5 caps for Workday — they'll be skipped idempotently.

type SolCap = { solutionId: number; capability: string; strength: "native" | "partial" | "via_extension" | "not_supported" };

// Delivery strengths per vendor (researched 2026-05-23)
const a4Matrix: SolCap[] = [];

// COURSE-AUTHOR (built-in authoring)
const authorStrength: Record<number, SolCap["strength"]> = {
  192: "partial",       // Workday Learning (light authoring, integrates external)
  234: "native",        // Cornerstone (Convertra, full authoring)
  235: "native",        // Docebo Shape
  236: "native",        // 360Learning (collaborative authoring is flagship)
  237: "native",        // Absorb Create
  238: "native",        // TalentLMS (built-in builder)
  239: "partial",       // SAP SuccessFactors (relies on external authoring)
  515: "native",        // Litmos Author
  516: "not_supported", // Degreed (aggregation, not authoring)
  517: "partial",       // Leapsome (basic authoring)
};

// CONTENT-DELIVERY (delivery + tracking)
const deliveryStrength: Record<number, SolCap["strength"]> = {
  192: "native", 234: "native", 235: "native", 236: "native", 237: "native",
  238: "native", 239: "native", 515: "native", 516: "native",
  517: "partial",
};

// SKILLS-MGMT (skill profiles / skills cloud)
const skillsStrength: Record<number, SolCap["strength"]> = {
  192: "native",        // Workday Skills Cloud (flagship)
  234: "native",        // Cornerstone Skills Graph
  235: "partial",       // Docebo (skills features added recently)
  236: "partial",       // 360Learning
  237: "partial",       // Absorb (Skills add-on)
  238: "not_supported", // TalentLMS (no skills inventory)
  239: "native",        // SAP Skills Ontology
  515: "not_supported", // Litmos (basic LMS)
  516: "native",        // Degreed Skills (flagship)
  517: "native",        // Leapsome (skills + competencies core)
};

// CERT-MGMT (certification issuance, expiration, renewal)
const certStrength: Record<number, SolCap["strength"]> = {
  192: "native", 234: "native", 235: "native", 236: "native", 237: "native",
  238: "native", 239: "native", 515: "native",
  516: "partial",       // Degreed (third-party credential pass-through)
  517: "partial",       // Leapsome
};

// LEARNING-PATH (paths / curricula / pathways)
const pathStrength: Record<number, SolCap["strength"]> = {
  192: "native", 234: "native", 235: "native", 236: "native", 237: "native",
  238: "native", 239: "native", 515: "native",
  516: "native",        // Degreed Pathways
  517: "partial",       // Leapsome
};

const SOL_IDS = [192, 234, 235, 236, 237, 238, 239, 515, 516, 517];
for (const sid of SOL_IDS) {
  a4Matrix.push({ solutionId: sid, capability: "COURSE-AUTHOR", strength: authorStrength[sid]! });
  a4Matrix.push({ solutionId: sid, capability: "CONTENT-DELIVERY", strength: deliveryStrength[sid]! });
  a4Matrix.push({ solutionId: sid, capability: "SKILLS-MGMT", strength: skillsStrength[sid]! });
  a4Matrix.push({ solutionId: sid, capability: "CERT-MGMT", strength: certStrength[sid]! });
  a4Matrix.push({ solutionId: sid, capability: "LEARNING-PATH", strength: pathStrength[sid]! });
}

const a4CapIds = [capId["COURSE-AUTHOR"], capId["CONTENT-DELIVERY"], capId["SKILLS-MGMT"], capId["CERT-MGMT"], capId["LEARNING-PATH"]];
const existingA4: Row[] = await postgrest(
  "GET",
  `/solution_capabilities?solution_id=in.(${SOL_IDS.join(",")})&capability_id=in.(${a4CapIds.join(",")})&select=solution_id,capability_id`,
) ?? [];
const seenA4 = new Set(existingA4.map((r) => `${r.solution_id}:${r.capability_id}`));

let a4Added = 0;
for (const m of a4Matrix) {
  const key = `${m.solutionId}:${capId[m.capability]}`;
  if (seenA4.has(key)) continue;
  await postgrest("POST", "/solution_capabilities", {
    solution_id: m.solutionId,
    capability_id: capId[m.capability],
    delivery_strength: m.strength,
  });
  a4Added++;
}
console.log(`  ✨ ${a4Added} new solution_capabilities rows (${a4Matrix.length} declared; ${seenA4.size} pre-existing)`);

// ============================================================
// 11. A6: solution_data_objects for 9 primary LMS solutions
// ============================================================
console.log("\n=== 11. A6 solution_data_objects ===");

// 9 primary solutions × 7 LMS masters (courses, learning_paths, course_enrollments, learning_records,
// learner_certifications, compliance_assignments, skill_profiles). Different vendors deliver different
// subsets; ownership_role reflects whether the solution is the system_of_record vs system_of_reference.
// (Degreed and TalentLMS have partial coverage; encode that.)

const LMS_MASTERS = ["courses", "learning_paths", "course_enrollments", "learning_records", "learner_certifications", "compliance_assignments", "skill_profiles"];
type SolDO = { solutionId: number; dataObject: string; role: "system_of_record" | "system_of_reference"; notes?: string };

const a6: SolDO[] = [];

// Helper: bulk assign all 7 masters as system_of_record for a solution
function recordAll(sid: number) {
  for (const m of LMS_MASTERS) a6.push({ solutionId: sid, dataObject: m, role: "system_of_record" });
}

// Workday Learning (192), Cornerstone Learning (234), Docebo (235), 360Learning (236),
// Absorb (237), SAP SuccessFactors Learning (239), Litmos (515) — full-stack LMSs
for (const sid of [192, 234, 235, 236, 237, 239, 515]) recordAll(sid);

// TalentLMS (238) — no skills inventory
for (const m of LMS_MASTERS) {
  if (m === "skill_profiles") {
    a6.push({ solutionId: 238, dataObject: m, role: "system_of_reference", notes: "TalentLMS does not master skill profiles; reads from external skills system when needed." });
  } else {
    a6.push({ solutionId: 238, dataObject: m, role: "system_of_record" });
  }
}

// Degreed (516) — content aggregation; masters skills/pathways but references courses/enrollments
const degreedRoles: Record<string, SolDO["role"]> = {
  courses: "system_of_reference",
  learning_paths: "system_of_record",
  course_enrollments: "system_of_record",
  learning_records: "system_of_record",
  learner_certifications: "system_of_reference",
  compliance_assignments: "system_of_reference",
  skill_profiles: "system_of_record",
};
const degreedNotes: Record<string, string> = {
  courses: "Degreed aggregates external content; the course master is the external provider's (Coursera, LinkedIn Learning, etc.). Degreed references rather than masters.",
  learner_certifications: "Degreed references third-party credentials (Coursera certificates, AWS badges) rather than issuing them.",
  compliance_assignments: "Degreed orchestrates compliance via aggregated content; obligation tracking typically lives in a separate compliance-training tool.",
};
for (const m of LMS_MASTERS) {
  a6.push({ solutionId: 516, dataObject: m, role: degreedRoles[m]!, notes: degreedNotes[m] });
}

const a6DOIds = LMS_MASTERS.map((n) => doId[n]);
const existingA6: Row[] = await postgrest(
  "GET",
  `/solution_data_objects?solution_id=in.(192,234,235,236,237,238,239,515,516)&data_object_id=in.(${a6DOIds.join(",")})&select=solution_id,data_object_id`,
) ?? [];
const seenA6 = new Set(existingA6.map((r) => `${r.solution_id}:${r.data_object_id}`));

let a6Added = 0;
for (const r of a6) {
  const dObjId = doId[r.dataObject];
  const key = `${r.solutionId}:${dObjId}`;
  if (seenA6.has(key)) continue;
  const label = `${solId[r.solutionId]} / ${r.dataObject}`;
  const body: Row = {
    solution_id: r.solutionId,
    data_object_id: dObjId,
    ownership_role: r.role,
    solution_data_object_label: label,
  };
  if (r.notes) body.notes = r.notes;
  await postgrest("POST", "/solution_data_objects", body);
  a6Added++;
}
console.log(`  ✨ ${a6Added} new solution_data_objects rows (${a6.length} declared; ${seenA6.size} pre-existing)`);

// ============================================================
// Done
// ============================================================
console.log("\n✓ load_lms_audit_fixes.ts complete.");
console.log("Verify:");
console.log(`  https://tests.semantius.app/domain_map/domain_modules?domain_id=${LMS_ID}`);
console.log(`  https://tests.semantius.app/domain_map/domain_starter_modules`);
console.log(`  https://tests.semantius.app/domain_map/domain_module_capabilities`);
console.log(`  https://tests.semantius.app/domain_map/domain_module_data_objects`);
console.log(`  https://tests.semantius.app/domain_map/trigger_events`);
console.log(`  https://tests.semantius.app/domain_map/cross_domain_handoffs`);
console.log(`  https://tests.semantius.app/domain_map/solution_capabilities`);
console.log(`  https://tests.semantius.app/domain_map/solution_data_objects`);
