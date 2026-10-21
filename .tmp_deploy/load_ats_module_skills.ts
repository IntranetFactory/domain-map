#!/usr/bin/env bun
// load_ats_module_skills.ts — plan-modules.md §11 step 3, §7.7
//
// Creates 8 per-module `system` skills for ATS, replacing (for new derivations)
// the single domain-level `ats-system` skill (id=16) which stays in place until
// §12 D1 deletes it. Coverage %:
//   ATS-CANDIDATE-CRM         100% (5 required, 2 optional AI augmentations)
//   ATS-TALENT-POOLS          100% (3 required, 1 optional consumer read)
//   ATS-REFERRALS             100% (3 required, 1 optional consumer read)
//   ATS-RECRUITMENT-PIPELINE  100% (7 required, 1 optional consumer read)
//   ATS-INTERVIEWS            100% (4 required, 2 optional consumer reads)
//   ATS-OFFERS                 83% (5 of 6 required are query/mutate; sign_document is side_effect; 2 optional consumer reads)
//   ATS-BACKGROUND-CHECKS      75% (3 of 4 required are query/mutate; send_email is side_effect; 2 optional consumer reads)
//   ATS-PRE-EMPLOYEE-RECORD   100% (3 required, 2 optional consumer reads)
//
// Counting rule per §5.6: coverage % = (required tools with operation_kind ∈ {query, mutate}) / (total required tools).
// Optional tools are excluded from the denominator. Consumer reads of embedded_masters and AI augmentations
// (parse_resume / match_candidate_to_jobs) are `optional`; everything else the workflow needs is `required`.
//
// Idempotent: every step reads first, only writes what's missing. Re-running is safe.
// Run from project root (CLAUDE.md cwd rule): bun run c:/dev/domain-map/.tmp_deploy/load_ats_module_skills.ts

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
// 0. Resolve module IDs and data_object IDs
// ============================================================
console.log("=== 0. Resolving FK maps ===");

const ATS_DOMAIN_ID = 56;

const modRows: Row[] = await postgrest(
  "GET",
  `/domain_modules?domain_id=eq.${ATS_DOMAIN_ID}&select=id,domain_module_code`,
) ?? [];
const modId: Record<string, number> = {};
for (const r of modRows) modId[String(r.domain_module_code)] = Number(r.id);
console.log(`  modules: ${Object.keys(modId).length} resolved`);

const doNames = [
  "candidates", "recruitment_sources", "recruitment_agencies", "recruitment_events",
  "talent_pools", "candidate_referrals",
  "job_requisitions", "job_postings", "job_applications",
  "interviews", "interview_scorecards", "candidate_assessments",
  "job_offers", "salary_bands",
  "background_checks",
  "pre_employees",
];
const doRows: Row[] = await postgrest(
  "GET",
  `/data_objects?data_object_name=in.(${doNames.join(",")})&select=id,data_object_name`,
) ?? [];
const doId: Record<string, number> = {};
for (const r of doRows) doId[String(r.data_object_name)] = Number(r.id);
console.log(`  data_objects: ${Object.keys(doId).length} resolved`);

// ============================================================
// 1. Create missing `tools` rows
// ============================================================
console.log("\n=== 1. tools ===");

type ToolSpec = {
  name: string;
  operationKind: "query" | "mutate" | "side_effect" | "compute";
  dataObject: string | null;
  description: string;
};

// §7.7 enumerates the tools each module skill points at. Many are already loaded
// for the domain-level ats-system skill (id=16); a handful are new (workflow gates
// for the modular pass + AI-RECRUIT augmentations folded into CANDIDATE-CRM).
//
// IMPORTANT: data_object_id is REQUIRED for query/mutate tools and MUST be null
// for side_effect / compute (per SKILL.md tools convention).
const newTools: ToolSpec[] = [
  // CANDIDATE-CRM additions
  {
    name: "update_candidate",
    operationKind: "mutate",
    dataObject: "candidates",
    description: "Update a candidate record (contact info, source, consent, status notes).",
  },
  {
    name: "update_recruitment_source",
    operationKind: "mutate",
    dataObject: "recruitment_sources",
    description: "Update a recruitment source (channel name, attribution metadata, active status).",
  },
  {
    name: "parse_resume",
    operationKind: "compute",
    dataObject: null,
    description: "AI-RECRUIT: parse a resume document into structured candidate fields. Used as an augmentation by ATS-CANDIDATE-CRM (optional — workflow proceeds with manual entry).",
  },
  {
    name: "match_candidate_to_jobs",
    operationKind: "compute",
    dataObject: null,
    description: "AI-RECRUIT: ML-based scoring of a candidate against open requisitions. Used as an augmentation by ATS-CANDIDATE-CRM (optional — recruiters can match manually).",
  },
  // TALENT-POOLS
  {
    name: "add_candidate_to_pool",
    operationKind: "mutate",
    dataObject: "talent_pools",
    description: "Add a candidate to a talent pool (membership write on the pool junction).",
  },
  {
    name: "remove_candidate_from_pool",
    operationKind: "mutate",
    dataObject: "talent_pools",
    description: "Remove a candidate from a talent pool.",
  },
  // REFERRALS
  {
    name: "create_referral",
    operationKind: "mutate",
    dataObject: "candidate_referrals",
    description: "Create a new employee-referral record linking a referring employee to a referred candidate.",
  },
  {
    name: "update_referral_status",
    operationKind: "mutate",
    dataObject: "candidate_referrals",
    description: "Update referral status (submitted → reviewed → bonus_eligible → paid). Workflow gate.",
  },
  // RECRUITMENT-PIPELINE
  {
    name: "create_requisition",
    operationKind: "mutate",
    dataObject: "job_requisitions",
    description: "Create a new job requisition (draft state, awaiting approval).",
  },
  {
    name: "approve_requisition",
    operationKind: "mutate",
    dataObject: "job_requisitions",
    description: "Approve a job requisition (draft → approved). Lifecycle-gate workflow tool — verb-form per §4.6 / §11 D2.",
  },
  {
    name: "publish_posting",
    operationKind: "mutate",
    dataObject: "job_postings",
    description: "Publish a job posting to job boards / careers site (draft → published). Lifecycle-gate workflow tool.",
  },
  // INTERVIEWS
  {
    name: "submit_scorecard",
    operationKind: "mutate",
    dataObject: "interview_scorecards",
    description: "Submit a completed interview scorecard (draft → submitted). Lifecycle-gate workflow tool — verb-form per §4.6 / §11 D2.",
  },
  // OFFERS
  {
    name: "approve_offer",
    operationKind: "mutate",
    dataObject: "job_offers",
    description: "Approve a draft offer for extension (draft → approved). Lifecycle-gate workflow tool.",
  },
  {
    name: "rescind_offer",
    operationKind: "mutate",
    dataObject: "job_offers",
    description: "Rescind an offer (any active state → rescinded). Lifecycle-gate workflow tool.",
  },
  // BACKGROUND-CHECKS
  {
    name: "request_background_check",
    operationKind: "mutate",
    dataObject: "background_checks",
    description: "Initiate a background-check request to the chosen provider (pending → requested).",
  },
  {
    name: "flag_for_review",
    operationKind: "mutate",
    dataObject: "background_checks",
    description: "Flag a background check for adverse-action review (results → flagged). Lifecycle-gate workflow tool.",
  },
  // PRE-EMPLOYEE-RECORD
  {
    name: "query_pre_employees",
    operationKind: "query",
    dataObject: "pre_employees",
    description: "Query pre-employee records (post-acceptance, pre-start-date).",
  },
  {
    name: "create_pre_employee",
    operationKind: "mutate",
    dataObject: "pre_employees",
    description: "Create a pre-employee record from an accepted offer (offer.accepted → pre_employee created).",
  },
  {
    name: "activate_pre_employee",
    operationKind: "mutate",
    dataObject: "pre_employees",
    description: "Activate a pre-employee record at start-date (publishes pre_employee.activated event; HCM consumes to create canonical employee). Lifecycle-gate workflow tool.",
  },
];

const existingToolNames = new Set(
  ((await postgrest(
    "GET",
    `/tools?tool_name=in.(${newTools.map((t) => t.name).join(",")})&select=tool_name`,
  )) ?? []).map((r: Row) => String(r.tool_name)),
);

for (const t of newTools) {
  if (existingToolNames.has(t.name)) {
    console.log(`  ♻ ${t.name}`);
    continue;
  }
  const body: Row = {
    tool_name: t.name,
    operation_kind: t.operationKind,
    description: t.description,
  };
  if (t.dataObject) {
    const objId = doId[t.dataObject];
    if (!objId) {
      console.log(`  ⚠ skip ${t.name} (data_object ${t.dataObject} unresolved)`);
      continue;
    }
    body.data_object_id = objId;
  }
  console.log(`  ✨ ${t.name} (${t.operationKind})`);
  await postgrest("POST", "/tools", body);
}

// ============================================================
// 2. Resolve all tool IDs we'll need
// ============================================================
console.log("\n=== 2. Resolving tool IDs ===");

const allToolNames = [
  // existing (from ats-system skill id=16, plus query_salary_bands which is new)
  "query_candidates", "create_candidate",
  "query_recruitment_sources",
  "query_recruitment_agencies", "query_recruitment_events",
  "query_talent_pools",
  "query_referrals",
  "query_job_requisitions", "query_job_postings", "query_applications",
  "update_application_stage",
  "query_interviews", "query_interview_scorecards", "query_assessments",
  "schedule_interview",
  "query_offers", "create_offer",
  "query_background_checks",
  "query_salary_bands",
  "send_email", "sign_document", "create_calendar_event",
  // newly created above
  "update_candidate", "update_recruitment_source",
  "parse_resume", "match_candidate_to_jobs",
  "add_candidate_to_pool", "remove_candidate_from_pool",
  "create_referral", "update_referral_status",
  "create_requisition", "approve_requisition", "publish_posting",
  "submit_scorecard",
  "approve_offer", "rescind_offer",
  "request_background_check", "flag_for_review",
  "query_pre_employees", "create_pre_employee", "activate_pre_employee",
];

const toolRows: Row[] = await postgrest(
  "GET",
  `/tools?tool_name=in.(${allToolNames.join(",")})&select=id,tool_name,operation_kind`,
) ?? [];
const toolId: Record<string, number> = {};
const toolKind: Record<string, string> = {};
for (const r of toolRows) {
  toolId[String(r.tool_name)] = Number(r.id);
  toolKind[String(r.tool_name)] = String(r.operation_kind);
}
console.log(`  tools resolved: ${Object.keys(toolId).length} of ${allToolNames.length}`);
for (const n of allToolNames) {
  if (!toolId[n]) console.log(`  ⚠ missing tool: ${n}`);
}

// ============================================================
// 3. Define the 8 per-module skills
// ============================================================
console.log("\n=== 3. domain_module skills (8 rows) ===");

type SkillSpec = {
  name: string;
  module: string;
  description: string;
  required: string[];   // tool names
  optional: string[];   // tool names
  expectedCoveragePct: number;
};

const skills: SkillSpec[] = [
  {
    name: "ats-candidate-crm-system",
    module: "ATS-CANDIDATE-CRM",
    description:
      "Per-module system skill for the Candidate CRM backbone of ATS. Masters candidates, recruitment sources, agencies, and events. Folds AI-RECRUIT (resume parsing, ML matching) as optional augmentations — the workflow proceeds with manual entry.",
    required: [
      "query_candidates",
      "create_candidate",
      "update_candidate",
      "query_recruitment_sources",
      "update_recruitment_source",
    ],
    optional: ["parse_resume", "match_candidate_to_jobs"],
    expectedCoveragePct: 100,
  },
  {
    name: "ats-talent-pools-system",
    module: "ATS-TALENT-POOLS",
    description:
      "Per-module system skill for curated candidate groupings (nurture pools, pipeline-building). Embedded-masters candidates as a consumer read.",
    required: ["query_talent_pools", "add_candidate_to_pool", "remove_candidate_from_pool"],
    optional: ["query_candidates"],
    expectedCoveragePct: 100,
  },
  {
    name: "ats-referrals-system",
    module: "ATS-REFERRALS",
    description:
      "Per-module system skill for employee-driven candidate sourcing (referral records, bonus eligibility, status workflow). Embedded-masters candidates as a consumer read.",
    required: ["query_referrals", "create_referral", "update_referral_status"],
    optional: ["query_candidates"],
    expectedCoveragePct: 100,
  },
  {
    name: "ats-recruitment-pipeline-system",
    module: "ATS-RECRUITMENT-PIPELINE",
    description:
      "Per-module system skill for the requisitions → postings → applications pipeline. Realizes REQ-MGMT and the application-flow slice of CANDIDATE-EXP. Embedded-masters candidates.",
    required: [
      "query_job_requisitions",
      "create_requisition",
      "approve_requisition",
      "query_job_postings",
      "publish_posting",
      "query_applications",
      "update_application_stage",
    ],
    optional: ["query_candidates"],
    expectedCoveragePct: 100,
  },
  {
    name: "ats-interviews-system",
    module: "ATS-INTERVIEWS",
    description:
      "Per-module system skill for interview scheduling, panel coordination, and scorecards. Realizes the `interviewing` lifecycle state on job_applications.",
    required: [
      "query_interviews",
      "schedule_interview",
      "query_interview_scorecards",
      "submit_scorecard",
    ],
    optional: ["query_candidates", "query_applications"],
    expectedCoveragePct: 100,
  },
  {
    name: "ats-offers-system",
    module: "ATS-OFFERS",
    description:
      "Per-module system skill for offer drafting, approval, extension, signature, and acceptance. Realizes the `offer_extended` lifecycle state. Requires `sign_document` for letter signing — drops coverage to ~83%.",
    required: [
      "query_offers",
      "create_offer",
      "approve_offer",
      "rescind_offer",
      "sign_document",
      "query_candidates",
    ],
    optional: ["query_applications", "query_salary_bands"],
    expectedCoveragePct: 83,
  },
  {
    name: "ats-background-checks-system",
    module: "ATS-BACKGROUND-CHECKS",
    description:
      "Per-module system skill for pre-employment background-check orchestration with adverse-action workflow. Requires `send_email` for adverse-action notices — drops coverage to ~75%. Flagged in §10 capability-layer audit as a domain_module_capabilities gap.",
    required: [
      "query_background_checks",
      "request_background_check",
      "flag_for_review",
      "send_email",
    ],
    optional: ["query_candidates", "query_offers"],
    expectedCoveragePct: 75,
  },
  {
    name: "ats-pre-employee-record-system",
    module: "ATS-PRE-EMPLOYEE-RECORD",
    description:
      "Per-module system skill for the post-acceptance / pre-start-date window — paperwork in flight, background check pending, pre-boarding. Realizes the `hired` lifecycle state on job_applications. Publishes pre_employee.activated to hand the canonical reconciliation to HCM.",
    required: ["query_pre_employees", "create_pre_employee", "activate_pre_employee"],
    optional: ["query_candidates", "query_offers"],
    expectedCoveragePct: 100,
  },
];

// ============================================================
// 4. Create skills rows (idempotent on skill_name)
// ============================================================
console.log("\n=== 4. skills (8 rows) ===");

const existingSkills: Row[] = await postgrest(
  "GET",
  `/skills?skill_name=in.(${skills.map((s) => s.name).join(",")})&select=id,skill_name`,
) ?? [];
const skillId: Record<string, number> = {};
for (const r of existingSkills) skillId[String(r.skill_name)] = Number(r.id);

for (const s of skills) {
  if (skillId[s.name]) {
    console.log(`  ♻ ${s.name} (id=${skillId[s.name]})`);
    continue;
  }
  const moduleId = modId[s.module];
  if (!moduleId) {
    console.log(`  ⚠ skip ${s.name} (module ${s.module} unresolved)`);
    continue;
  }
  console.log(`  ✨ ${s.name}`);
  await postgrest("POST", "/skills", {
    skill_name: s.name,
    description: s.description,
    skill_type: "system",
    domain_id: ATS_DOMAIN_ID, // rollup until §12 D1 retires the domain-level ats-system skill
    domain_module_id: moduleId,
  });
}

const finalSkills: Row[] = await postgrest(
  "GET",
  `/skills?skill_name=in.(${skills.map((s) => s.name).join(",")})&select=id,skill_name`,
) ?? [];
for (const r of finalSkills) skillId[String(r.skill_name)] = Number(r.id);
console.log(`  ${Object.keys(skillId).length} skill IDs resolved`);

// ============================================================
// 5. skill_tools rows (idempotent on (skill_id, tool_id))
// ============================================================
console.log("\n=== 5. skill_tools ===");

const skillIds = Object.values(skillId);
const existingST: Row[] = await postgrest(
  "GET",
  `/skill_tools?skill_id=in.(${skillIds.join(",")})&select=skill_id,tool_id`,
) ?? [];
const seenST = new Set(existingST.map((r) => `${r.skill_id}:${r.tool_id}`));

let stAdded = 0;
let stSkipped = 0;
for (const s of skills) {
  const sid = skillId[s.name];
  if (!sid) continue;
  const pairs: Array<{ toolName: string; level: "required" | "optional" }> = [
    ...s.required.map((t) => ({ toolName: t, level: "required" as const })),
    ...s.optional.map((t) => ({ toolName: t, level: "optional" as const })),
  ];
  for (const p of pairs) {
    const tid = toolId[p.toolName];
    if (!tid) {
      console.log(`  ⚠ ${s.name} → ${p.toolName} (tool unresolved)`);
      continue;
    }
    const key = `${sid}:${tid}`;
    if (seenST.has(key)) {
      stSkipped++;
      continue;
    }
    await postgrest("POST", "/skill_tools", {
      skill_id: sid,
      tool_id: tid,
      requirement_level: p.level,
    });
    stAdded++;
  }
}
console.log(`  ✨ ${stAdded} new / ♻ ${stSkipped} existing`);

// ============================================================
// 6. Verify per-module coverage % matches §7.7
// ============================================================
console.log("\n=== 6. Coverage verification (§5.6 counting rule, §7.7 expected) ===");

const SEMANTIUS_COVERED = new Set(["query", "mutate"]);

let allMatch = true;
console.log();
console.log("  module                            | req | cov | act% | exp% | match");
console.log("  ----------------------------------|-----|-----|------|------|------");
for (const s of skills) {
  const requiredKinds = s.required.map((t) => toolKind[t] ?? "?");
  const required = requiredKinds.length;
  const covered = requiredKinds.filter((k) => SEMANTIUS_COVERED.has(k)).length;
  const pct = required === 0 ? 0 : Math.round((covered / required) * 100);
  const matchOk = Math.abs(pct - s.expectedCoveragePct) <= 1;
  if (!matchOk) allMatch = false;
  console.log(
    `  ${s.module.padEnd(33)} | ${String(required).padStart(3)} | ${String(covered).padStart(3)} | ${String(pct).padStart(4)} | ${String(s.expectedCoveragePct).padStart(4)} | ${matchOk ? "✓" : "✗"}`,
  );
}

console.log();
console.log(allMatch ? "✓ All per-module coverage matches §7.7 expected values." : "✗ Coverage mismatch — investigate.");
console.log("\n✓ load_ats_module_skills.ts complete.");
console.log("Verify via:");
console.log(`  semantius call crud postgrestRequest '{"method":"GET","path":"/skills?domain_id=eq.${ATS_DOMAIN_ID}&domain_module_id=not.is.null&select=id,skill_name,domain_module_id&order=domain_module_id.asc"}'`);
