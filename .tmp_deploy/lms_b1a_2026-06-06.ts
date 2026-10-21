#!/usr/bin/env bun
// .tmp_deploy/lms_b1a_2026-06-06.ts
//
// Executes the two agent-solvable b1a items for the LMS domain (domains.id=57):
//
//   B1A-SELF-CONTAIN  (M9 part 1): flip the 3 enumerated consumer+required cross-domain
//     DMDO rows to necessity=optional (presence-conditional, Rule #16 / M9 fix). Only the
//     3 rows in state.yaml extra_m9_shapes; policy_attestations (286) stays untouched (it
//     is b1b, user-gated).
//
//   B1A-PHASE-P  (Phase E personas + RACI): author LMS operational personas, wire their
//     role_modules reach across the 8 modules, wire lifecycle process_id on the gated
//     transitions, and add process_raci responsibility rows. Reuses the existing
//     LEGAL-COMPLIANCE-SPECIALIST persona (id 11) by accretion (roles.md sec 7 rule 3).
//
// Idempotent (read-before-create on natural keys). Re-runnable. Bun + semantius CLI only.
import { pg } from "../scripts/lib/catalog";

// ---------------------------------------------------------------------------
// B1A-SELF-CONTAIN  -- 3 M9 rows -> necessity=optional
// ---------------------------------------------------------------------------
// [domain_module_id, data_object_id, label]
const M9_OPTIONAL: [number, number, string][] = [
  [33, 18, "onboarding_tasks (consumer) on LMS-COMPLIANCE-TRAINING"],
  [34, 175, "performance_goals (consumer) on LMS-PATHS"],
  [34, 26, "skills_gap_analyses (consumer) on LMS-PATHS"],
];

let m9Flipped = 0;
for (const [mid, doid, label] of M9_OPTIONAL) {
  // pre-flight: confirm the row is currently consumer+required before flipping
  const cur = await pg(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${mid}&data_object_id=eq.${doid}&select=role,necessity`,
  );
  if (!cur || !cur.length) {
    console.log(`M9 SKIP (no row): ${label}`);
    continue;
  }
  if (cur[0].necessity === "optional") {
    console.log(`M9 already optional: ${label}`);
    continue;
  }
  if (cur[0].role !== "consumer" || cur[0].necessity !== "required") {
    console.log(`M9 SKIP (unexpected shape role=${cur[0].role} necessity=${cur[0].necessity}): ${label}`);
    continue;
  }
  await pg(
    "PATCH",
    `/domain_module_data_objects?domain_module_id=eq.${mid}&data_object_id=eq.${doid}`,
    { necessity: "optional" },
  );
  m9Flipped++;
  console.log(`M9 flipped to optional: ${label}`);
}
console.log(`B1A-SELF-CONTAIN: ${m9Flipped} rows flipped to optional.`);

// ---------------------------------------------------------------------------
// B1A-PHASE-P  -- personas + reach + lifecycle process_id + RACI
// ---------------------------------------------------------------------------
const LD = 11; // Learning and Development
const GRC = 31; // Governance, Risk and Compliance
const LEGAL_COMPLIANCE_SPECIALIST_ID = 11; // existing persona (business_function 7=Legal)

// module ids: COURSE-DELIVERY=32 COMPLIANCE-TRAINING=33 PATHS=34 ILT=178
// CREDENTIALS=179 CT-GDPR=180 AUTOMATION=181 TRAINING-RECORDS-STARTER=182

const PERSONAS: { role_code: string; role_name: string; business_function_id: number | null; description: string }[] = [
  {
    role_code: "LD-LEARNING-ADMIN",
    role_name: "Learning Administrator",
    business_function_id: LD,
    description:
      "Owns day-to-day operation of the learning platform: maintains the course catalog, manages enrollments and learning paths, configures automation and audiences, and administers credentials and continuing education.",
  },
  {
    role_code: "LD-INSTRUCTIONAL-DESIGNER",
    role_name: "Instructional Designer",
    business_function_id: LD,
    description:
      "Authors and versions courses, lessons, content assets, and assessments; publishes new training and retires outdated material across self-paced and instructor-led delivery.",
  },
  {
    role_code: "LD-INSTRUCTOR",
    role_name: "Instructor",
    business_function_id: LD,
    description:
      "Delivers instructor-led and virtual instructor-led sessions: runs scheduled offerings, records attendance, grades assessments, and supports learners through completion and certification.",
  },
  {
    role_code: "GRC-COMPLIANCE-TRAINING-MANAGER",
    role_name: "Compliance Training Manager",
    business_function_id: GRC,
    description:
      "Runs regulatory and policy training programs end to end: schedules compliance campaigns, tracks assignment completion, assembles training evidence, manages recertification, and produces regulator filings.",
  },
  {
    role_code: "PEOPLE-MANAGER",
    role_name: "People Manager",
    business_function_id: null,
    description:
      "Cross-functional people leader who assigns and nudges direct reports through required and developmental learning, monitors completion and certification status, and follows up on overdue training.",
  },
];

// role_code -> [ [module_id, interaction_level], ... ]
const REACH: Record<string, [number, string][]> = {
  "LD-LEARNING-ADMIN": [
    [32, "primary"], [34, "primary"], [181, "primary"], [179, "primary"],
    [178, "secondary"], [33, "secondary"], [182, "secondary"],
  ],
  "LD-INSTRUCTIONAL-DESIGNER": [
    [32, "primary"], [178, "secondary"], [34, "secondary"], [179, "secondary"],
  ],
  "LD-INSTRUCTOR": [
    [178, "primary"], [32, "secondary"], [179, "secondary"],
  ],
  "GRC-COMPLIANCE-TRAINING-MANAGER": [
    [33, "primary"], [181, "primary"], [182, "secondary"], [179, "secondary"], [180, "secondary"],
  ],
  "PEOPLE-MANAGER": [
    [181, "primary"], [34, "primary"], [33, "secondary"], [179, "secondary"],
  ],
  // accretion onto the existing cross-domain persona (reuse, do not recreate):
  "LEGAL-COMPLIANCE-SPECIALIST": [
    [180, "primary"], [33, "secondary"],
  ],
};

const roleIdByCode: Record<string, number> = {
  "LEGAL-COMPLIANCE-SPECIALIST": LEGAL_COMPLIANCE_SPECIALIST_ID,
};

for (const p of PERSONAS) {
  const existing = await pg("GET", `/domain_roles?role_code=eq.${p.role_code}&select=id`);
  if (existing && existing.length) {
    roleIdByCode[p.role_code] = existing[0].id as number;
    console.log(`persona exists:  ${p.role_code} (#${existing[0].id})`);
    continue;
  }
  const created = await pg("POST", "/domain_roles", p); // record_status omitted -> DB default "new"
  roleIdByCode[p.role_code] = created[0].id as number;
  console.log(`persona created: ${p.role_code} (#${created[0].id})`);
}

let rmCreated = 0;
for (const [code, rows] of Object.entries(REACH)) {
  const rid = roleIdByCode[code];
  if (rid === undefined) throw new Error(`no role id resolved for ${code}`);
  for (const [mid, level] of rows) {
    const ex = await pg("GET", `/role_modules?role_id=eq.${rid}&domain_module_id=eq.${mid}&select=id`);
    if (ex && ex.length) continue;
    await pg("POST", "/role_modules", { role_id: rid, domain_module_id: mid, interaction_level: level });
    rmCreated++;
  }
}
console.log(`role_modules created: ${rmCreated}`);

// ---- lifecycle process_id wiring (gate -> APQC process) ----
// [data_object_id, state_name, process_id]
const WIRING: [number, string, number][] = [
  [167, "published", 1039],                 // courses.published                 -> Develop/conduct/manage training programs
  [169, "completed", 1039],                 // course_enrollments.completed      -> Develop/conduct/manage training programs
  [913, "published", 899],                  // course_assessments.published      -> Evaluate training effectiveness
  [915, "graded", 899],                     // assessment_attempts.graded        -> Evaluate training effectiveness
  [168, "published", 1037],                 // learning_paths.published          -> Align learning programs w/ competencies
  [955, "completed", 1037],                 // learning_path_assignments.completed -> Align learning programs w/ competencies
  [956, "active", 1032],                    // learning_plans.active             -> Develop career plans and career paths
  [173, "completed", 1829],                 // compliance_assignments.completed  -> Train employees on regulatory requirements
  [938, "scheduled", 1829],                 // compliance_training_campaigns.scheduled -> Train employees on regulatory requirements
  [940, "submitted", 1829],                 // training_evidence_records.submitted -> Train employees on regulatory requirements
  [943, "filed", 1829],                     // regulator_filing_exports.filed    -> Train employees on regulatory requirements
  [923, "open_for_enrollment", 895],        // course_offerings.open_for_enrollment -> Manage training schedule
  [924, "completed", 895],                  // course_sessions.completed         -> Manage training schedule
  [171, "issued", 1040],                    // learner_certifications.issued     -> Manage examinations and certifications
  [936, "filed", 1040],                     // ceu_records.filed                 -> Manage examinations and certifications
  [931, "published", 1040],                 // certification_definitions.published -> Manage examinations and certifications
];

let wired = 0;
for (const [doid, state, pid] of WIRING) {
  // only set when currently null (do not clobber a different existing wiring)
  const cur = await pg(
    "GET",
    `/data_object_lifecycle_states?data_object_id=eq.${doid}&state_name=eq.${state}&select=process_id,requires_permission`,
  );
  if (!cur || !cur.length) {
    console.log(`WIRING SKIP (no state): do=${doid} ${state}`);
    continue;
  }
  if (cur[0].process_id !== null && cur[0].process_id !== undefined) {
    console.log(`WIRING already set: do=${doid} ${state} -> ${cur[0].process_id}`);
    continue;
  }
  await pg(
    "PATCH",
    `/data_object_lifecycle_states?data_object_id=eq.${doid}&state_name=eq.${state}`,
    { process_id: pid },
  );
  wired++;
}
console.log(`lifecycle process_id wirings applied: ${wired}`);

// ---- process_raci (process -> persona -> letter) ----
// [process_id, role_code, raci, consultation_blocking]
const RACI: [number, string, string, boolean][] = [
  // 1039 Develop, conduct, and manage employee training programs (course delivery)
  [1039, "LD-INSTRUCTIONAL-DESIGNER", "responsible", false],
  [1039, "LD-LEARNING-ADMIN", "accountable", false],
  [1039, "LD-INSTRUCTOR", "consulted", false],
  [1039, "PEOPLE-MANAGER", "informed", false],
  // 899 Evaluate training effectiveness (assessments)
  [899, "LD-INSTRUCTIONAL-DESIGNER", "responsible", false],
  [899, "LD-LEARNING-ADMIN", "accountable", false],
  [899, "LD-INSTRUCTOR", "consulted", false],
  // 1037 Align learning programs with competencies and skills (paths)
  [1037, "LD-LEARNING-ADMIN", "responsible", false],
  [1037, "PEOPLE-MANAGER", "accountable", false],
  [1037, "LD-INSTRUCTIONAL-DESIGNER", "consulted", false],
  // 1032 Develop career plans and career paths (learning plans)
  [1032, "PEOPLE-MANAGER", "responsible", false],
  [1032, "LD-LEARNING-ADMIN", "accountable", false],
  // 1829 Train employees on appropriate regulatory requirements (compliance training)
  [1829, "GRC-COMPLIANCE-TRAINING-MANAGER", "responsible", false],
  [1829, "GRC-COMPLIANCE-TRAINING-MANAGER", "accountable", false],
  [1829, "PEOPLE-MANAGER", "consulted", false],
  [1829, "LEGAL-COMPLIANCE-SPECIALIST", "informed", false],
  // 895 Manage training schedule (ILT)
  [895, "LD-INSTRUCTOR", "responsible", false],
  [895, "LD-LEARNING-ADMIN", "accountable", false],
  // 1040 Manage examinations and certifications (credentials)
  [1040, "LD-LEARNING-ADMIN", "responsible", false],
  [1040, "GRC-COMPLIANCE-TRAINING-MANAGER", "accountable", false],
  [1040, "LD-INSTRUCTOR", "consulted", false],
];

let raciCreated = 0;
for (const [pid, code, letter, blocking] of RACI) {
  const rid = roleIdByCode[code];
  if (rid === undefined) throw new Error(`no role id resolved for ${code}`);
  const ex = await pg(
    "GET",
    `/process_raci?process_id=eq.${pid}&actor_role_id=eq.${rid}&raci=eq.${letter}&select=id`,
  );
  if (ex && ex.length) continue;
  await pg("POST", "/process_raci", {
    process_id: pid,
    actor_role_id: rid,
    raci: letter,
    consultation_blocking: blocking,
  });
  raciCreated++;
}
console.log(`process_raci created: ${raciCreated}`);
console.log("done.");
