/**
 * Apply the 2026-05-24 ATS audit fixes.
 *
 * Items addressed (all in one idempotent run):
 *   A) Backfill the legacy `domain_data_objects` rollup row for pre_employees
 *      (mastered by ATS-PRE-EMPLOYEE-RECORD via domain_module_data_objects but
 *       missing from the legacy rollup).
 *   B) Add three `domain_module_data_objects` rows so payloads with inbound
 *      handoffs but no module assignment can be patched (B10b upstream gap):
 *        - job_profiles  (id 33)  embedded_master + required on module 4 ATS-RECRUITMENT-PIPELINE
 *        - skill_profiles (id 172) contributor      + required on module 1 ATS-CANDIDATE-CRM
 *        - career_aspirations (id 179) consumer     + optional on module 1 ATS-CANDIDATE-CRM
 *   C) PATCH target_domain_module_id on three inbound handoff rows now that
 *      step B made the target module derivable:
 *        - handoff 114 -> module 1 (career_aspirations consumer)
 *        - handoff 386 -> module 4 (job_profiles embedded_master)
 *        - handoff 433 -> module 1 (skill_profiles contributor)
 *   D) Add two `role_modules` rows for HIRING-MANAGER (10007) on ONBOARDING
 *      modules 35 + 37, eliminating the E5 Path-A/Path-B divergence.
 *   E) Add the `job_offer.rescinded` trigger event and its recall-cascade
 *      handoffs (two intra-ATS, three cross-domain).
 *   F) Load intra-ATS cross-module handoffs (B9b) — 12 rows covering the
 *      cross-module lifecycle progressions surfaced in the audit's expected-
 *      pairs table.
 *
 * Explicitly NOT addressed:
 *   - inbound handoff rows 453, 455, 1023 (PA / SWP / PSA -> ATS with payloads
 *     not modeled on any ATS module). These are likely mis-classified rather
 *     than missing module attribution; the right fix is to either move the
 *     target_domain to the payload's owner or delete the row. Surfaced for
 *     user decision after this loader completes.
 *   - target_domain_module_id on the 22 outbound ATS handoffs lacking it.
 *     Per B10b the target side is owed by the target domain's audit, not
 *     this domain's.
 *
 * Run from project root: bun run .tmp_deploy/fix_ats_audit_2026_05_24.ts
 */

interface CmdResult {
  ok: boolean;
  data: any;
  status: number;
  stderr: string;
}

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest"],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" }
  );
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    return { ok: false, data: null, status: code, stderr: stderr.trim() || stdout.trim() };
  }
  const text = stdout.trim();
  return { ok: true, data: text ? JSON.parse(text) : null, status: 0, stderr: "" };
}

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.stderr}`);
  return r.data;
}

async function post(path: string, body: any): Promise<any> {
  const r = await postgrest("POST", path, body);
  if (!r.ok) throw new Error(`POST ${path} failed: ${r.stderr}`);
  return r.data;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await postgrest("PATCH", path, body);
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.stderr}`);
  return r.data;
}

const ATS_DOMAIN_ID = 56;
const ONBOARDING_DOMAIN_ID = 99;
const BEN_ADMIN_DOMAIN_ID = 61;
const COMP_MGMT_DOMAIN_ID = 60;

// Module ids (verified in audit query 2026-05-24)
const M = {
  ATS_CANDIDATE_CRM: 1,
  ATS_TALENT_POOLS: 2,
  ATS_REFERRALS: 3,
  ATS_RECRUITMENT_PIPELINE: 4,
  ATS_INTERVIEWS: 5,
  ATS_OFFERS: 6,
  ATS_BACKGROUND_CHECKS: 7,
  ATS_PRE_EMPLOYEE_RECORD: 8,
  ONB_JOURNEY_MGMT: 35,
  ONB_WELCOME_EXPERIENCE: 37,
};

const HIRING_MANAGER_ROLE_ID = 10007;

async function resolveDataObjectIds(names: string[]): Promise<Map<string, number>> {
  const rows = await get(
    `/data_objects?data_object_name=in.(${names.join(",")})&select=id,data_object_name`
  );
  return new Map(rows.map((r: any) => [r.data_object_name as string, r.id as number]));
}

async function resolveTriggerEventIds(names: string[]): Promise<Map<string, number>> {
  const rows = await get(
    `/trigger_events?event_name=in.(${names.map(encodeURIComponent).join(",")})&select=id,event_name`
  );
  return new Map(rows.map((r: any) => [r.event_name as string, r.id as number]));
}

async function main() {
  console.log("ATS audit fix loader — 2026-05-24");
  console.log("==================================\n");

  // ------------------------------------------------------------------
  // Pre-flight: resolve natural keys -> ids
  // ------------------------------------------------------------------
  console.log("Pre-flight: resolve natural keys");
  const doIds = await resolveDataObjectIds([
    "job_requisitions",
    "job_postings",
    "candidates",
    "job_applications",
    "candidate_referrals",
    "talent_pools",
    "interviews",
    "candidate_assessments",
    "job_offers",
    "background_checks",
    "pre_employees",
    "onboarding_journeys",
    "benefit_enrollments",
    "compensation_statements",
    "job_profiles",
    "skill_profiles",
    "career_aspirations",
  ]);
  for (const k of doIds.keys()) {
    if (!doIds.get(k)) throw new Error(`missing data_object id for ${k}`);
  }

  const D = {
    job_requisitions: doIds.get("job_requisitions")!,
    job_postings: doIds.get("job_postings")!,
    candidates: doIds.get("candidates")!,
    job_applications: doIds.get("job_applications")!,
    candidate_referrals: doIds.get("candidate_referrals")!,
    talent_pools: doIds.get("talent_pools")!,
    interviews: doIds.get("interviews")!,
    candidate_assessments: doIds.get("candidate_assessments")!,
    job_offers: doIds.get("job_offers")!,
    background_checks: doIds.get("background_checks")!,
    pre_employees: doIds.get("pre_employees")!,
    onboarding_journeys: doIds.get("onboarding_journeys")!,
    benefit_enrollments: doIds.get("benefit_enrollments")!,
    compensation_statements: doIds.get("compensation_statements")!,
    job_profiles: doIds.get("job_profiles")!,
    skill_profiles: doIds.get("skill_profiles")!,
    career_aspirations: doIds.get("career_aspirations")!,
  };

  const teIds = await resolveTriggerEventIds([
    "job_offer.accepted",
    "job_offer.rescinded",
    "job_application.submitted",
    "job_application.advanced",
    "candidate_referral.submitted",
    "talent_pool.candidate_activated",
    "interview.completed",
    "background_check.cleared",
    "background_check.flagged",
    "candidate_assessment.passed",
    "candidate_assessment.failed",
  ]);

  // ------------------------------------------------------------------
  // Step A: backfill pre_employees -> domain_data_objects rollup row
  // ------------------------------------------------------------------
  console.log("\nStep A: backfill domain_data_objects rollup row for pre_employees");
  const existingPreEmpRollup = await get(
    `/domain_data_objects?domain_id=eq.${ATS_DOMAIN_ID}&data_object_id=eq.${D.pre_employees}&select=id`
  );
  if (existingPreEmpRollup.length === 0) {
    await post("/domain_data_objects", [{
      domain_id: ATS_DOMAIN_ID,
      data_object_id: D.pre_employees,
      role: "master",
      necessity: "required",
      notes: "Mastered by ATS-PRE-EMPLOYEE-RECORD (module 8). Legacy rollup row backfilled 2026-05-24 to match domain_module_data_objects (the rollup is derived per SKILL.md).",
    }]);
    console.log("  + pre_employees master row inserted");
  } else {
    console.log("  = already present, skipped");
  }

  // ------------------------------------------------------------------
  // Step B: backfill missing domain_module_data_objects assignments
  // ------------------------------------------------------------------
  console.log("\nStep B: backfill domain_module_data_objects for job_profiles / skill_profiles / career_aspirations");
  const dmdoTargets = [
    {
      domain_module_id: M.ATS_RECRUITMENT_PIPELINE,
      data_object_id: D.job_profiles,
      role: "embedded_master",
      necessity: "required",
      notes: "Module 4 holds the requisition template-binding to a job_profile (competencies, level, family). Reads from HCM when integrated; standalone deployments keep the embedded shell.",
    },
    {
      domain_module_id: M.ATS_CANDIDATE_CRM,
      data_object_id: D.skill_profiles,
      role: "contributor",
      necessity: "required",
      notes: "Module 1 contributes hire-time skill assessments + interview-derived signals into the TALENT-MGMT-mastered skill_profile. The candidate-CRM is where skill data is first attached to a person.",
    },
    {
      domain_module_id: M.ATS_CANDIDATE_CRM,
      data_object_id: D.career_aspirations,
      role: "consumer",
      necessity: "optional",
      notes: "Module 1 reads internal-candidate career_aspirations from TALENT-MGMT to surface them against open requisitions for internal-mobility recommendations.",
    },
  ];

  for (const row of dmdoTargets) {
    const existing = await get(
      `/domain_module_data_objects?domain_module_id=eq.${row.domain_module_id}&data_object_id=eq.${row.data_object_id}&select=id`
    );
    if (existing.length === 0) {
      await post("/domain_module_data_objects", [row]);
      console.log(`  + module ${row.domain_module_id} <- ${row.role}/${row.necessity} on data_object ${row.data_object_id}`);
    } else {
      console.log(`  = module ${row.domain_module_id} / data_object ${row.data_object_id} already linked, skipped`);
    }
  }

  // ------------------------------------------------------------------
  // Step C: PATCH target_domain_module_id on inbound handoffs 114/386/433
  // ------------------------------------------------------------------
  console.log("\nStep C: patch target_domain_module_id on inbound handoffs 114/386/433");
  const patchPlan = [
    { id: 114, target_domain_module_id: M.ATS_CANDIDATE_CRM, label: "TALENT-MGMT successor.tagged -> career_aspirations" },
    { id: 386, target_domain_module_id: M.ATS_RECRUITMENT_PIPELINE, label: "HCM job_profile.published -> job_profiles" },
    { id: 433, target_domain_module_id: M.ATS_CANDIDATE_CRM, label: "LMS skill_profile.updated -> skill_profiles" },
  ];
  for (const p of patchPlan) {
    const cur = await get(`/handoffs?id=eq.${p.id}&select=id,target_domain_module_id`);
    if (cur.length === 0) {
      console.log(`  ! handoff ${p.id} not found, skipped`);
      continue;
    }
    if (cur[0].target_domain_module_id === p.target_domain_module_id) {
      console.log(`  = handoff ${p.id} already at target_domain_module_id=${p.target_domain_module_id}`);
      continue;
    }
    await patch(`/handoffs?id=eq.${p.id}`, { target_domain_module_id: p.target_domain_module_id });
    console.log(`  ~ handoff ${p.id} (${p.label}) -> module ${p.target_domain_module_id}`);
  }

  // ------------------------------------------------------------------
  // Step D: add role_modules rows for HIRING-MANAGER on ONBOARDING modules
  // ------------------------------------------------------------------
  console.log("\nStep D: add role_modules for HIRING-MANAGER on ONBOARDING modules");
  const rmTargets = [
    {
      role_id: HIRING_MANAGER_ROLE_ID,
      domain_module_id: M.ONB_JOURNEY_MGMT,
      interaction_level: "secondary",
      notes: "Reads onboarding journey for hiring-progress visibility on the new hire.",
    },
    {
      role_id: HIRING_MANAGER_ROLE_ID,
      domain_module_id: M.ONB_WELCOME_EXPERIENCE,
      interaction_level: "secondary",
      notes: "Reads welcome-experience for new-hire day-zero status.",
    },
  ];
  for (const row of rmTargets) {
    const existing = await get(
      `/role_modules?role_id=eq.${row.role_id}&domain_module_id=eq.${row.domain_module_id}&select=role_id`
    );
    if (existing.length === 0) {
      await post("/role_modules", [row]);
      console.log(`  + role 10007 HIRING-MANAGER <- module ${row.domain_module_id} (${row.interaction_level})`);
    } else {
      console.log(`  = role 10007 already linked to module ${row.domain_module_id}, skipped`);
    }
  }

  // ------------------------------------------------------------------
  // Step E1: create job_offer.rescinded trigger_event
  // ------------------------------------------------------------------
  console.log("\nStep E1: create job_offer.rescinded trigger_event");
  let rescindedEventId = teIds.get("job_offer.rescinded");
  if (!rescindedEventId) {
    const created = await post("/trigger_events", [{
      event_name: "job_offer.rescinded",
      data_object_id: D.job_offers,
      event_category: "state_change",
      description: "Fired when an offer is rescinded after extension. Subscribers cancel the background check, halt the pre-employee onboarding paperwork, recall the onboarding journey, withdraw benefit enrollment, and unwind compensation seeding.",
    }]);
    rescindedEventId = Number(created[0].id);
    console.log(`  + trigger_event id=${rescindedEventId}`);
  } else {
    console.log(`  = trigger_event already present (id=${rescindedEventId})`);
  }

  // ------------------------------------------------------------------
  // Step E2 + F: insert handoffs (intra-ATS B9b + rescind cascade)
  //
  // Idempotency key: (source_domain_id, target_domain_id, trigger_event_id,
  //   data_object_id, source_domain_module_id, target_domain_module_id).
  // ------------------------------------------------------------------
  console.log("\nStep E2+F: insert handoffs (intra-ATS B9b + rescind cascade)");

  const handoffSpec: Array<{
    source_domain_id: number;
    target_domain_id: number;
    source_domain_module_id: number | null;
    target_domain_module_id: number | null;
    trigger_event_id: number;
    data_object_id: number;
    integration_pattern: string;
    friction_level: string;
    notes: string;
  }> = [
    // ---- B9b intra-ATS cross-module flow ----
    // 1. Candidate-CRM publishes submitted apps; Recruitment-Pipeline ingests
    {
      source_domain_id: ATS_DOMAIN_ID, target_domain_id: ATS_DOMAIN_ID,
      source_domain_module_id: M.ATS_CANDIDATE_CRM, target_domain_module_id: M.ATS_RECRUITMENT_PIPELINE,
      trigger_event_id: teIds.get("job_application.submitted")!, data_object_id: D.job_applications,
      integration_pattern: "lifecycle_progression", friction_level: "low",
      notes: "intra | ATS | candidate submits an application; pipeline picks it up in 'applied'",
    },
    // 2. Talent-Pools activates a pool candidate; Pipeline creates the app
    {
      source_domain_id: ATS_DOMAIN_ID, target_domain_id: ATS_DOMAIN_ID,
      source_domain_module_id: M.ATS_TALENT_POOLS, target_domain_module_id: M.ATS_RECRUITMENT_PIPELINE,
      trigger_event_id: teIds.get("talent_pool.candidate_activated")!, data_object_id: D.job_applications,
      integration_pattern: "lifecycle_progression", friction_level: "low",
      notes: "intra | ATS | pool re-engagement materializes as a new application against an open req",
    },
    // 3. Referrals -> Candidate-CRM (referral introduces candidate)
    {
      source_domain_id: ATS_DOMAIN_ID, target_domain_id: ATS_DOMAIN_ID,
      source_domain_module_id: M.ATS_REFERRALS, target_domain_module_id: M.ATS_CANDIDATE_CRM,
      trigger_event_id: teIds.get("candidate_referral.submitted")!, data_object_id: D.candidates,
      integration_pattern: "lifecycle_progression", friction_level: "low",
      notes: "intra | ATS | referral submission creates the candidate in candidate-CRM",
    },
    // 4. Pipeline advances app to 'interviewing'; Interviews picks up
    {
      source_domain_id: ATS_DOMAIN_ID, target_domain_id: ATS_DOMAIN_ID,
      source_domain_module_id: M.ATS_RECRUITMENT_PIPELINE, target_domain_module_id: M.ATS_INTERVIEWS,
      trigger_event_id: teIds.get("job_application.advanced")!, data_object_id: D.interviews,
      integration_pattern: "lifecycle_progression", friction_level: "low",
      notes: "intra | ATS | application advance to interviewing stage prompts interview creation",
    },
    // 5. Interviews completes; Pipeline reads outcome to gate next stage
    {
      source_domain_id: ATS_DOMAIN_ID, target_domain_id: ATS_DOMAIN_ID,
      source_domain_module_id: M.ATS_INTERVIEWS, target_domain_module_id: M.ATS_RECRUITMENT_PIPELINE,
      trigger_event_id: teIds.get("interview.completed")!, data_object_id: D.job_applications,
      integration_pattern: "lifecycle_progression", friction_level: "low",
      notes: "intra | ATS | interview-completed signal feeds back into pipeline stage decision",
    },
    // 6. Assessment passed -> pipeline advances
    {
      source_domain_id: ATS_DOMAIN_ID, target_domain_id: ATS_DOMAIN_ID,
      source_domain_module_id: M.ATS_INTERVIEWS, target_domain_module_id: M.ATS_RECRUITMENT_PIPELINE,
      trigger_event_id: teIds.get("candidate_assessment.passed")!, data_object_id: D.job_applications,
      integration_pattern: "lifecycle_progression", friction_level: "low",
      notes: "intra | ATS | passing-assessment signal advances application in pipeline",
    },
    // 7. Assessment failed -> pipeline rejects or holds
    {
      source_domain_id: ATS_DOMAIN_ID, target_domain_id: ATS_DOMAIN_ID,
      source_domain_module_id: M.ATS_INTERVIEWS, target_domain_module_id: M.ATS_RECRUITMENT_PIPELINE,
      trigger_event_id: teIds.get("candidate_assessment.failed")!, data_object_id: D.job_applications,
      integration_pattern: "lifecycle_progression", friction_level: "low",
      notes: "intra | ATS | failing-assessment signal rejects or holds application in pipeline",
    },
    // 8. Pipeline advances app to 'offer_extended'; Offers picks up
    {
      source_domain_id: ATS_DOMAIN_ID, target_domain_id: ATS_DOMAIN_ID,
      source_domain_module_id: M.ATS_RECRUITMENT_PIPELINE, target_domain_module_id: M.ATS_OFFERS,
      trigger_event_id: teIds.get("job_application.advanced")!, data_object_id: D.job_offers,
      integration_pattern: "lifecycle_progression", friction_level: "low",
      notes: "intra | ATS | application advance to offer_extended stage prompts offer drafting",
    },
    // 9. Offer accepted -> background check starts
    {
      source_domain_id: ATS_DOMAIN_ID, target_domain_id: ATS_DOMAIN_ID,
      source_domain_module_id: M.ATS_OFFERS, target_domain_module_id: M.ATS_BACKGROUND_CHECKS,
      trigger_event_id: teIds.get("job_offer.accepted")!, data_object_id: D.background_checks,
      integration_pattern: "lifecycle_progression", friction_level: "low",
      notes: "intra | ATS | offer-accepted triggers contingent background-check workflow",
    },
    // 10. Offer accepted -> pre-employee record spawned
    {
      source_domain_id: ATS_DOMAIN_ID, target_domain_id: ATS_DOMAIN_ID,
      source_domain_module_id: M.ATS_OFFERS, target_domain_module_id: M.ATS_PRE_EMPLOYEE_RECORD,
      trigger_event_id: teIds.get("job_offer.accepted")!, data_object_id: D.pre_employees,
      integration_pattern: "lifecycle_progression", friction_level: "low",
      notes: "intra | ATS | offer-accepted creates the pre-employee paperwork shell",
    },
    // 11. Background check cleared -> pre-employee can activate
    {
      source_domain_id: ATS_DOMAIN_ID, target_domain_id: ATS_DOMAIN_ID,
      source_domain_module_id: M.ATS_BACKGROUND_CHECKS, target_domain_module_id: M.ATS_PRE_EMPLOYEE_RECORD,
      trigger_event_id: teIds.get("background_check.cleared")!, data_object_id: D.pre_employees,
      integration_pattern: "lifecycle_progression", friction_level: "low",
      notes: "intra | ATS | background-check clearance unblocks pre-employee activation",
    },
    // 12. Background check flagged -> offer recall path (intra)
    {
      source_domain_id: ATS_DOMAIN_ID, target_domain_id: ATS_DOMAIN_ID,
      source_domain_module_id: M.ATS_BACKGROUND_CHECKS, target_domain_module_id: M.ATS_OFFERS,
      trigger_event_id: teIds.get("background_check.flagged")!, data_object_id: D.job_offers,
      integration_pattern: "lifecycle_progression", friction_level: "medium",
      notes: "intra | ATS | flagged background check may force offer rescission; HR/Legal review path",
    },

    // ---- Rescind cascade from job_offer.rescinded ----
    // 13. Rescind -> background check cancelled (intra)
    {
      source_domain_id: ATS_DOMAIN_ID, target_domain_id: ATS_DOMAIN_ID,
      source_domain_module_id: M.ATS_OFFERS, target_domain_module_id: M.ATS_BACKGROUND_CHECKS,
      trigger_event_id: rescindedEventId!, data_object_id: D.background_checks,
      integration_pattern: "lifecycle_progression", friction_level: "medium",
      notes: "intra | ATS | rescind cancels any in-flight background check",
    },
    // 14. Rescind -> pre-employee cancelled (intra)
    {
      source_domain_id: ATS_DOMAIN_ID, target_domain_id: ATS_DOMAIN_ID,
      source_domain_module_id: M.ATS_OFFERS, target_domain_module_id: M.ATS_PRE_EMPLOYEE_RECORD,
      trigger_event_id: rescindedEventId!, data_object_id: D.pre_employees,
      integration_pattern: "lifecycle_progression", friction_level: "high",
      notes: "intra | ATS | rescind cancels pre-employee record; classic leaver-recall friction shape",
    },
    // 15. Rescind -> ONBOARDING journey recalled
    {
      source_domain_id: ATS_DOMAIN_ID, target_domain_id: ONBOARDING_DOMAIN_ID,
      source_domain_module_id: M.ATS_OFFERS, target_domain_module_id: M.ONB_JOURNEY_MGMT,
      trigger_event_id: rescindedEventId!, data_object_id: D.onboarding_journeys,
      integration_pattern: "event_stream", friction_level: "high",
      notes: "cross | ATS->ONBOARDING | rescind recalls the onboarding journey if already spawned",
    },
    // 16. Rescind -> BEN-ADMIN enrollment withdrawn (BEN-ADMIN not modularized yet)
    {
      source_domain_id: ATS_DOMAIN_ID, target_domain_id: BEN_ADMIN_DOMAIN_ID,
      source_domain_module_id: M.ATS_OFFERS, target_domain_module_id: null,
      trigger_event_id: rescindedEventId!, data_object_id: D.benefit_enrollments,
      integration_pattern: "event_stream", friction_level: "high",
      notes: "cross | ATS->BEN-ADMIN | rescind withdraws any pending benefit enrollment. target NULL until BEN-ADMIN is modularized",
    },
    // 17. Rescind -> COMP-MGMT compensation seeding unwound (COMP-MGMT not modularized yet)
    {
      source_domain_id: ATS_DOMAIN_ID, target_domain_id: COMP_MGMT_DOMAIN_ID,
      source_domain_module_id: M.ATS_OFFERS, target_domain_module_id: null,
      trigger_event_id: rescindedEventId!, data_object_id: D.compensation_statements,
      integration_pattern: "event_stream", friction_level: "medium",
      notes: "cross | ATS->COMP-MGMT | rescind unwinds the seeded compensation statement. target NULL until COMP-MGMT is modularized",
    },
  ];

  // Idempotent insert: query existing rows matching the 6-tuple key, only POST missing ones.
  const handoffsToInsert: typeof handoffSpec = [];
  for (const h of handoffSpec) {
    const filter =
      `source_domain_id=eq.${h.source_domain_id}` +
      `&target_domain_id=eq.${h.target_domain_id}` +
      `&trigger_event_id=eq.${h.trigger_event_id}` +
      `&data_object_id=eq.${h.data_object_id}` +
      `&source_domain_module_id=` + (h.source_domain_module_id === null ? "is.null" : `eq.${h.source_domain_module_id}`) +
      `&target_domain_module_id=` + (h.target_domain_module_id === null ? "is.null" : `eq.${h.target_domain_module_id}`);
    const existing = await get(`/handoffs?${filter}&select=id`);
    if (existing.length === 0) {
      handoffsToInsert.push(h);
    }
  }

  if (handoffsToInsert.length > 0) {
    await post("/handoffs", handoffsToInsert);
    console.log(`  + inserted ${handoffsToInsert.length} new handoff rows`);
    for (const h of handoffsToInsert) {
      console.log(`     (src_mod=${h.source_domain_module_id} -> tgt_mod=${h.target_domain_module_id}, te=${h.trigger_event_id}, payload=${h.data_object_id}, friction=${h.friction_level})`);
    }
  } else {
    console.log("  = all 17 candidate handoff rows already present, no inserts");
  }

  // ------------------------------------------------------------------
  // Closing summary
  // ------------------------------------------------------------------
  console.log("\nClosing summary");
  console.log("---------------");

  const intraATS = await get(
    `/handoffs?and=(source_domain_id.eq.${ATS_DOMAIN_ID},target_domain_id.eq.${ATS_DOMAIN_ID})&select=id,source_domain_module_id,target_domain_module_id,friction_level`
  );
  console.log(`Intra-ATS handoffs now loaded: ${intraATS.length}`);

  const inboundNullTargetMod = await get(
    `/handoffs?target_domain_id=eq.${ATS_DOMAIN_ID}&target_domain_module_id=is.null&select=id,source_domain_id,data_object_id,trigger_events(event_name)`
  );
  console.log(`Inbound rows still NULL on target_domain_module_id: ${inboundNullTargetMod.length}`);
  for (const r of inboundNullTargetMod) {
    console.log(`  - handoff ${r.id}: src_domain=${r.source_domain_id}, payload=${r.data_object_id}, event=${r.trigger_events?.event_name ?? "?"}`);
  }

  const hmModules = await get(
    `/role_modules?role_id=eq.${HIRING_MANAGER_ROLE_ID}&select=domain_module_id,interaction_level&order=domain_module_id.asc`
  );
  console.log(`HIRING-MANAGER role_modules: ${hmModules.length} entries`);

  const preEmpRollup = await get(
    `/domain_data_objects?domain_id=eq.${ATS_DOMAIN_ID}&data_object_id=eq.${D.pre_employees}&select=role,necessity`
  );
  console.log(`pre_employees rollup row: ${preEmpRollup.length === 1 ? preEmpRollup[0].role + "/" + preEmpRollup[0].necessity : "MISSING"}`);

  console.log("\nUI links for spot-check:");
  console.log("  https://adenin.semantius.app/domain_map/handoffs?source_domain_id=eq.56");
  console.log("  https://adenin.semantius.app/domain_map/handoffs?target_domain_id=eq.56");
  console.log("  https://adenin.semantius.app/domain_map/domain_module_data_objects?domain_module_id=in.(1,4)");
  console.log("  https://adenin.semantius.app/domain_map/role_modules?role_id=eq.10007");
  console.log("  https://adenin.semantius.app/domain_map/trigger_events?event_name=eq.job_offer.rescinded");

  console.log("\nDeferred (need user decision):");
  console.log("  handoff 453: PA predictive_model.scored -> ATS (payload not on any ATS data_object)");
  console.log("  handoff 455: SWP position_demand_forecast.updated -> ATS (same)");
  console.log("  handoff 1023: PSA project_resource_allocation.demand_unmet -> ATS (same)");
  console.log("  -> likely mis-classified; decide whether to delete or re-target each.");

  console.log("\nDone.");
}

await main();
