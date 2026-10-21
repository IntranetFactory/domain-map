// ATS audit fix-loader — 2026-05-28
// Applies Bucket 1 (all 15 items) + Bucket 2 items 1, 2, 3 from audits/ATS.md.
// READ THIS BEFORE RE-RUNNING: idempotent on inserts via natural keys; deletes
// are not idempotent (re-running after the first pass will no-op the deletes
// because the rows are already gone).

const SEMANTIUS = "semantius";

async function call(method: string, path: string, body?: unknown): Promise<unknown> {
  const args = ["call", "crud", "postgrestRequest"];
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const p = Bun.spawn([SEMANTIUS, ...args], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  p.stdin.write(JSON.stringify(payload));
  await p.stdin.end();
  const stdout = await new Response(p.stdout).text();
  const stderr = await new Response(p.stderr).text();
  const code = await p.exited;
  if (code !== 0) {
    throw new Error(`semantius exit ${code}: ${stderr}\nstdout: ${stdout}`);
  }
  if (!stdout.trim()) return null;
  try { return JSON.parse(stdout); } catch { return stdout; }
}

async function get(path: string) { return call("GET", path); }
async function post(path: string, body: unknown) { return call("POST", path, body); }
async function patch(path: string, body: unknown) { return call("PATCH", path, body); }
async function del(path: string) { return call("DELETE", path); }

type Row = Record<string, unknown>;

async function insertMissing(
  table: string,
  rows: Row[],
  naturalKey: string,
): Promise<Map<string | number, number>> {
  const keys = rows.map((r) => String(r[naturalKey]));
  const filter = `${naturalKey}=in.(${keys.map((k) => encodeURIComponent(k)).join(",")})`;
  const existing = (await get(`/${table}?${filter}&select=id,${naturalKey}`)) as Row[];
  const haveKeys = new Set(existing.map((e) => String(e[naturalKey])));
  const toInsert = rows.filter((r) => !haveKeys.has(String(r[naturalKey])));
  if (toInsert.length) {
    console.log(`  ${table}: inserting ${toInsert.length}/${rows.length} new rows`);
    await post(`/${table}`, toInsert);
  } else {
    console.log(`  ${table}: all ${rows.length} rows already present`);
  }
  const after = (await get(`/${table}?${filter}&select=id,${naturalKey}`)) as Row[];
  const map = new Map<string | number, number>();
  for (const r of after) map.set(String(r[naturalKey]), Number(r.id));
  return map;
}

async function main() {
  console.log("ATS audit fix-loader starting...");

  // ────────────────────────────────────────────────────────────────
  // Phase 1: regulations (FCRA + OFCCP)
  // ────────────────────────────────────────────────────────────────
  console.log("\n[Phase 1] regulations");
  const regulations = [
    {
      regulation_name: "Fair Credit Reporting Act",
      description:
        "US federal statute (15 U.S.C. §1681 et seq.) governing collection, dissemination, and use of consumer credit information including pre-employment background checks. Mandates pre-adverse-action and adverse-action notices, candidate disclosure of report sources, and a Summary of Rights acknowledgement.",
    },
    {
      regulation_name: "Federal Contract Compliance Programs Regulations",
      description:
        "US federal regulations (41 CFR Parts 60-1 through 60-741) administered by OFCCP requiring federal contractors and subcontractors to maintain applicant-flow records, voluntary self-identification of veteran and disability status, and equal-opportunity audit trails. Triggers Internet Applicant Rule applicant-tracking obligations.",
    },
  ];
  const regMap = await insertMissing("regulations", regulations, "regulation_name");
  const fcraId = regMap.get("Fair Credit Reporting Act")!;
  const ofccpId = regMap.get("Federal Contract Compliance Programs Regulations")!;

  // ────────────────────────────────────────────────────────────────
  // Phase 2: data_objects (8 new entities)
  // ────────────────────────────────────────────────────────────────
  console.log("\n[Phase 2] data_objects");
  const newDataObjects = [
    {
      data_object_name: "pre_adverse_action_notices",
      singular_label: "Pre-Adverse Action Notice",
      plural_label: "Pre-Adverse Action Notices",
      kind: "domain_owned",
      description:
        "FCRA-mandated notice sent to a candidate before a final adverse-action decision based on a consumer report. Carries a copy of the report and Summary of Rights, and opens a waiting period (typically 5 business days) during which the candidate may dispute findings before the final adverse-action notice issues.",
      has_personal_content: true,
      has_submit_lock: true,
      has_single_approver: false,
    },
    {
      data_object_name: "applicant_flow_records",
      singular_label: "Applicant Flow Record",
      plural_label: "Applicant Flow Records",
      kind: "domain_owned",
      description:
        "OFCCP-mandated log of every Internet Applicant against a requisition, capturing demographic data, expressed interest, basic qualifications, and disposition. Federal contractors must retain for OFCCP audit; the record is independent of EEO voluntary self-id.",
      has_personal_content: true,
      has_submit_lock: true,
      has_single_approver: false,
    },
    {
      data_object_name: "application_dispositions",
      singular_label: "Application Disposition",
      plural_label: "Application Dispositions",
      kind: "domain_owned",
      description:
        "Typed reason-for-non-selection on a job application. Drives OFCCP applicant-flow reporting and internal hiring analytics; distinct from `application_stage_transitions` which logs the stage change but not the categorised business reason.",
      has_personal_content: false,
      has_submit_lock: false,
      has_single_approver: false,
    },
    {
      data_object_name: "data_subject_requests",
      singular_label: "Data Subject Request",
      plural_label: "Data Subject Requests",
      kind: "domain_owned",
      description:
        "GDPR Articles 15-22 (and analogous CPRA/PIPEDA) request from a candidate exercising access, rectification, erasure, restriction, portability, or objection rights against personal data the ATS holds. Tracks request type, intake channel, due date, fulfillment, and verification.",
      has_personal_content: true,
      has_submit_lock: false,
      has_single_approver: false,
    },
    {
      data_object_name: "fcra_summary_of_rights_acknowledgements",
      singular_label: "FCRA Summary of Rights Acknowledgement",
      plural_label: "FCRA Summary of Rights Acknowledgements",
      kind: "domain_owned",
      description:
        "Candidate acknowledgement of receipt of the FCRA Summary of Consumer Rights at consent time, prior to a background check. Required by 15 U.S.C. §1681g(c). Captured separately from the consent itself so the disclosure copy and acknowledgement timestamp persist for audit.",
      has_personal_content: true,
      has_submit_lock: true,
      has_single_approver: false,
    },
    {
      data_object_name: "voluntary_self_identifications",
      singular_label: "Voluntary Self-Identification",
      plural_label: "Voluntary Self-Identifications",
      kind: "domain_owned",
      description:
        "Voluntary candidate disclosure of protected-class membership (race, ethnicity, gender, veteran status, disability status) per EEOC and OFCCP self-id requirements. Distinct from `eeo_responses` which captures the survey response: this row captures the offer/decline-to-answer decision and audit metadata.",
      has_personal_content: true,
      has_submit_lock: true,
      has_single_approver: false,
    },
    {
      data_object_name: "ofccp_audit_trails",
      singular_label: "OFCCP Audit Trail",
      plural_label: "OFCCP Audit Trails",
      kind: "domain_owned",
      description:
        "Federal-contractor audit log of every applicant-flow event (requisition open, application receipt, disposition, hire) carrying the actor, timestamp, and OFCCP-relevant fields needed to reconstruct compliance decisions during an audit. Immutable append-only.",
      has_personal_content: false,
      has_submit_lock: true,
      has_single_approver: false,
    },
    {
      data_object_name: "hiring_team_assignments",
      singular_label: "Hiring Team Assignment",
      plural_label: "Hiring Team Assignments",
      kind: "domain_owned",
      description:
        "Per-requisition role-scoped staffing junction: assigns specific users to recruiter, hiring manager, coordinator, interviewer, and reviewer roles on a single requisition. Captures team composition without requiring global RBAC for transient interview-panel membership.",
      has_personal_content: false,
      has_submit_lock: false,
      has_single_approver: false,
    },
  ];
  const doMap = await insertMissing("data_objects", newDataObjects, "data_object_name");
  const doId = (name: string) => {
    const v = doMap.get(name);
    if (!v) throw new Error(`data_object id not found for ${name}`);
    return v;
  };

  // ────────────────────────────────────────────────────────────────
  // Phase 3: domain_module_data_objects (8 master rows)
  // ────────────────────────────────────────────────────────────────
  console.log("\n[Phase 3] domain_module_data_objects (8 masters)");
  // module ids: 1=CRM, 4=PIPELINE, 7=BACKGROUND-CHECKS
  const dmdoTargets: Array<{ module_id: number; data_object_name: string; necessity?: string }> = [
    { module_id: 7, data_object_name: "pre_adverse_action_notices" },
    { module_id: 4, data_object_name: "applicant_flow_records" },
    { module_id: 4, data_object_name: "application_dispositions" },
    { module_id: 1, data_object_name: "data_subject_requests" },
    { module_id: 7, data_object_name: "fcra_summary_of_rights_acknowledgements" },
    { module_id: 4, data_object_name: "voluntary_self_identifications" },
    { module_id: 4, data_object_name: "ofccp_audit_trails" },
    { module_id: 4, data_object_name: "hiring_team_assignments" },
  ];
  for (const t of dmdoTargets) {
    const did = doId(t.data_object_name);
    const existing = (await get(
      `/domain_module_data_objects?domain_module_id=eq.${t.module_id}&data_object_id=eq.${did}&select=id`,
    )) as Row[];
    if (existing.length) {
      console.log(`  DMDO ${t.data_object_name} in module ${t.module_id}: already present`);
      continue;
    }
    await post("/domain_module_data_objects", {
      domain_module_id: t.module_id,
      data_object_id: did,
      role: "master",
      necessity: t.necessity ?? "required",
    });
    console.log(`  DMDO ${t.data_object_name} in module ${t.module_id}: inserted`);
  }

  // ────────────────────────────────────────────────────────────────
  // Phase 4: domain_regulations (FCRA + OFCCP for ATS)
  // ────────────────────────────────────────────────────────────────
  console.log("\n[Phase 4] domain_regulations (FCRA + OFCCP on ATS)");
  const drTargets = [
    { regulation_id: fcraId, applicability: "mandatory" },
    { regulation_id: ofccpId, applicability: "mandatory" },
  ];
  for (const t of drTargets) {
    const existing = (await get(
      `/domain_regulations?domain_id=eq.56&regulation_id=eq.${t.regulation_id}&select=id`,
    )) as Row[];
    if (existing.length) {
      console.log(`  domain_regulations ATS×reg ${t.regulation_id}: already present`);
      continue;
    }
    await post("/domain_regulations", { domain_id: 56, ...t });
    console.log(`  domain_regulations ATS×reg ${t.regulation_id}: inserted`);
  }

  // ────────────────────────────────────────────────────────────────
  // Phase 5: data_object_relationships — new entity wiring (intra-ATS + users)
  // ────────────────────────────────────────────────────────────────
  console.log("\n[Phase 5] data_object_relationships (new entity wiring)");
  const USERS = 748;
  const newRels: Row[] = [
    // candidates → new entities
    {
      data_object_id: 3,
      related_data_object_id: doId("data_subject_requests"),
      relationship_verb: "submits_via",
      inverse_verb: "for_candidate",
      relationship_type: "one_to_many",
      relationship_kind: "composition",
      is_required: false,
      owner_side: "source",
    },
    {
      data_object_id: 3,
      related_data_object_id: doId("voluntary_self_identifications"),
      relationship_verb: "self_ids_via",
      inverse_verb: "for_candidate",
      relationship_type: "one_to_many",
      relationship_kind: "composition",
      is_required: false,
      owner_side: "source",
    },
    {
      data_object_id: 3,
      related_data_object_id: doId("fcra_summary_of_rights_acknowledgements"),
      relationship_verb: "acknowledges_via",
      inverse_verb: "for_candidate",
      relationship_type: "one_to_many",
      relationship_kind: "composition",
      is_required: false,
      owner_side: "source",
    },
    // job_applications → application_dispositions / applicant_flow_records
    {
      data_object_id: 4,
      related_data_object_id: doId("application_dispositions"),
      relationship_verb: "disposed_via",
      inverse_verb: "on",
      relationship_type: "one_to_many",
      relationship_kind: "composition",
      is_required: false,
      owner_side: "source",
    },
    {
      data_object_id: 4,
      related_data_object_id: doId("applicant_flow_records"),
      relationship_verb: "logged_via",
      inverse_verb: "for_application",
      relationship_type: "one_to_one",
      relationship_kind: "composition",
      is_required: true,
      owner_side: "source",
    },
    // job_requisitions → hiring_team_assignments
    {
      data_object_id: 1,
      related_data_object_id: doId("hiring_team_assignments"),
      relationship_verb: "staffed_by",
      inverse_verb: "on_requisition",
      relationship_type: "one_to_many",
      relationship_kind: "composition",
      is_required: true,
      owner_side: "source",
    },
    // hiring_team_assignments → users
    {
      data_object_id: doId("hiring_team_assignments"),
      related_data_object_id: USERS,
      relationship_verb: "assigns",
      inverse_verb: "is assigned to",
      relationship_type: "many_to_many",
      relationship_kind: "reference",
      is_required: true,
      owner_side: "source",
    },
    // background_checks → pre_adverse_action_notices / fcra_summary_of_rights
    {
      data_object_id: 12,
      related_data_object_id: doId("pre_adverse_action_notices"),
      relationship_verb: "triggers_pre_notice",
      inverse_verb: "follows_check",
      relationship_type: "one_to_many",
      relationship_kind: "composition",
      is_required: false,
      owner_side: "source",
    },
    {
      data_object_id: 12,
      related_data_object_id: doId("fcra_summary_of_rights_acknowledgements"),
      relationship_verb: "gated_by",
      inverse_verb: "authorizes",
      relationship_type: "one_to_one",
      relationship_kind: "reference",
      is_required: true,
      owner_side: "source",
    },
    // applicant_flow_records → ofccp_audit_trails
    {
      data_object_id: doId("applicant_flow_records"),
      related_data_object_id: doId("ofccp_audit_trails"),
      relationship_verb: "audited_via",
      inverse_verb: "for_record",
      relationship_type: "one_to_many",
      relationship_kind: "composition",
      is_required: true,
      owner_side: "source",
    },
  ];
  for (const r of newRels) {
    const existing = (await get(
      `/data_object_relationships?data_object_id=eq.${r.data_object_id}&related_data_object_id=eq.${r.related_data_object_id}&relationship_verb=eq.${encodeURIComponent(r.relationship_verb as string)}&select=id`,
    )) as Row[];
    if (existing.length) continue;
    await post("/data_object_relationships", r);
  }
  console.log(`  data_object_relationships: ${newRels.length} new-entity rows processed`);

  // ────────────────────────────────────────────────────────────────
  // Phase 6: B7 user-edges — 7 missing master→users edges
  // ────────────────────────────────────────────────────────────────
  console.log("\n[Phase 6] B7 user-edges (7 masters → users)");
  const b7Edges: Row[] = [
    {
      data_object_id: 3, // candidates
      related_data_object_id: USERS,
      relationship_verb: "has owning recruiter",
      inverse_verb: "owns as recruiter",
      relationship_type: "many_to_many",
      relationship_kind: "reference",
      is_required: false,
      owner_side: "source",
    },
    {
      data_object_id: 2, // job_postings
      related_data_object_id: USERS,
      relationship_verb: "has publisher",
      inverse_verb: "publishes",
      relationship_type: "many_to_many",
      relationship_kind: "reference",
      is_required: true,
      owner_side: "source",
    },
    {
      data_object_id: 7, // talent_pools
      related_data_object_id: USERS,
      relationship_verb: "has owner",
      inverse_verb: "owns",
      relationship_type: "many_to_many",
      relationship_kind: "reference",
      is_required: true,
      owner_side: "source",
    },
    {
      data_object_id: 10, // candidate_assessments
      related_data_object_id: USERS,
      relationship_verb: "has invitation author",
      inverse_verb: "invites",
      relationship_type: "many_to_many",
      relationship_kind: "reference",
      is_required: true,
      owner_side: "source",
    },
    {
      data_object_id: 12, // background_checks
      related_data_object_id: USERS,
      relationship_verb: "has requester",
      inverse_verb: "requests",
      relationship_type: "many_to_many",
      relationship_kind: "reference",
      is_required: true,
      owner_side: "source",
    },
    {
      data_object_id: 13, // recruitment_agencies
      related_data_object_id: USERS,
      relationship_verb: "has relationship owner",
      inverse_verb: "owns relationship",
      relationship_type: "many_to_many",
      relationship_kind: "reference",
      is_required: true,
      owner_side: "source",
    },
    {
      data_object_id: 14, // recruitment_events
      related_data_object_id: USERS,
      relationship_verb: "has coordinator",
      inverse_verb: "coordinates",
      relationship_type: "many_to_many",
      relationship_kind: "reference",
      is_required: true,
      owner_side: "source",
    },
  ];
  for (const r of b7Edges) {
    const existing = (await get(
      `/data_object_relationships?data_object_id=eq.${r.data_object_id}&related_data_object_id=eq.${r.related_data_object_id}&relationship_verb=eq.${encodeURIComponent(r.relationship_verb as string)}&select=id`,
    )) as Row[];
    if (existing.length) continue;
    await post("/data_object_relationships", r);
  }
  console.log(`  B7 user-edges: 7 rows processed`);

  // ────────────────────────────────────────────────────────────────
  // Phase 7: E5 — HIRING-MANAGER role_modules drift
  // ────────────────────────────────────────────────────────────────
  console.log("\n[Phase 7] E5 HIRING-MANAGER role_modules");
  const e5Rows = [
    { role_id: 10007, domain_module_id: 35, interaction_level: "secondary" },
    { role_id: 10007, domain_module_id: 37, interaction_level: "secondary" },
  ];
  for (const r of e5Rows) {
    const existing = (await get(
      `/role_modules?role_id=eq.${r.role_id}&domain_module_id=eq.${r.domain_module_id}&select=id`,
    )) as Row[];
    if (existing.length) {
      console.log(`  role_modules ${r.role_id}×${r.domain_module_id}: already present`);
      continue;
    }
    await post("/role_modules", r);
    console.log(`  role_modules ${r.role_id}×${r.domain_module_id}: inserted (${r.interaction_level})`);
  }

  // ────────────────────────────────────────────────────────────────
  // Phase 8: B12 permission_verb_override fixes
  // ────────────────────────────────────────────────────────────────
  console.log("\n[Phase 8] B12 permission verb overrides");
  await patch(`/data_object_lifecycle_states?id=eq.210`, {
    permission_verb_override: "submit_scorecard",
  });
  console.log(`  state 210 (interview_scorecards.submitted): override = submit_scorecard`);
  await patch(`/data_object_lifecycle_states?id=eq.191`, {
    permission_verb_override: "adjudicate_background_check",
  });
  console.log(`  state 191 (background_checks.completed_consider): override = adjudicate_background_check`);

  // ────────────────────────────────────────────────────────────────
  // Phase 9: F4 skill naming convention
  // ────────────────────────────────────────────────────────────────
  console.log("\n[Phase 9] F4 skill renames (kebab+system → snake+agent)");
  const skillRenames: Array<[number, string]> = [
    [127, "ats_candidate_crm_agent"],
    [128, "ats_talent_pools_agent"],
    [129, "ats_referrals_agent"],
    [130, "ats_recruitment_pipeline_agent"],
    [131, "ats_interviews_agent"],
    [132, "ats_offers_agent"],
    [133, "ats_background_checks_agent"],
    [134, "ats_pre_employee_record_agent"],
  ];
  for (const [id, newName] of skillRenames) {
    await patch(`/skills?id=eq.${id}`, { skill_name: newName });
    console.log(`  skill ${id} → ${newName}`);
  }

  // ────────────────────────────────────────────────────────────────
  // Phase 10: BOUNDARY — delete stale relationship 833
  // ────────────────────────────────────────────────────────────────
  console.log("\n[Phase 10] BOUNDARY delete (relationship 833)");
  await del(`/data_object_relationships?id=eq.833`);
  console.log(`  relationship 833 (candidate_assessments → risk_assessments): deleted`);

  // ────────────────────────────────────────────────────────────────
  // Phase 11: SCOPE-CREEP in ATS-OFFERS
  // ────────────────────────────────────────────────────────────────
  console.log("\n[Phase 11] SCOPE-CREEP deletes (salary_bands, equity_grants, compensation_benchmarks)");
  // DMDO rows
  await del(`/domain_module_data_objects?id=eq.23`); // salary_bands embedded_master
  await del(`/domain_module_data_objects?id=eq.983`); // equity_grants embedded_master
  await del(`/domain_module_data_objects?id=eq.517`); // compensation_benchmarks consumer
  // Legacy rollup row
  await del(`/domain_data_objects?id=eq.271`); // salary_bands legacy consumer
  console.log(`  4 SCOPE-CREEP rows deleted`);

  // ────────────────────────────────────────────────────────────────
  // Phase 12: FERPA — remove from ATS regulations
  // ────────────────────────────────────────────────────────────────
  console.log("\n[Phase 12] FERPA delete (domain_regulations 174)");
  await del(`/domain_regulations?id=eq.174`);
  console.log(`  domain_regulations 174 (FERPA on ATS): deleted`);

  // ────────────────────────────────────────────────────────────────
  // Phase 13: B9 trigger fan-out — 5 confident handoffs (2 deferred)
  // ────────────────────────────────────────────────────────────────
  console.log("\n[Phase 13] B9 trigger fan-out (5 confident handoffs)");
  // Sources:
  //   trigger 372 interview_scorecard.submitted (data_object 9, mastered by module 5)
  //   trigger 364 job_application.rejected (data_object 4, mastered by module 4)
  //   trigger 360 job_posting.published (data_object 2, mastered by module 4)
  //   trigger 377 recruitment_event.held (data_object 14, mastered by module 1)
  //   trigger 368 talent_pool.candidate_added (data_object 7, mastered by module 2)
  const handoffs: Row[] = [
    {
      // interview_scorecard.submitted → PA-WORKFORCE-METRICS (analytics)
      trigger_event_id: 372,
      source_domain_id: 56,
      source_domain_module_id: 5,
      target_domain_id: 63,
      target_domain_module_id: 81,
      data_object_id: 9, // interview_scorecards
      integration_pattern: "event_stream",
      friction_level: "low",
    },
    {
      // job_application.rejected → ATS-TALENT-POOLS (re-eligibility, intra-domain)
      trigger_event_id: 364,
      source_domain_id: 56,
      source_domain_module_id: 4,
      target_domain_id: 56,
      target_domain_module_id: 2,
      data_object_id: 4, // job_applications
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
    },
    {
      // job_posting.published → ATS-CANDIDATE-CRM (sourcing attribution, intra-domain)
      trigger_event_id: 360,
      source_domain_id: 56,
      source_domain_module_id: 4,
      target_domain_id: 56,
      target_domain_module_id: 1,
      data_object_id: 2, // job_postings
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
    },
    {
      // recruitment_event.held → ATS-TALENT-POOLS (pool ingestion, intra-domain)
      trigger_event_id: 377,
      source_domain_id: 56,
      source_domain_module_id: 1,
      target_domain_id: 56,
      target_domain_module_id: 2,
      data_object_id: 14, // recruitment_events
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
    },
    {
      // talent_pool.candidate_added → ATS-CANDIDATE-CRM (outreach pickup, intra-domain)
      trigger_event_id: 368,
      source_domain_id: 56,
      source_domain_module_id: 2,
      target_domain_id: 56,
      target_domain_module_id: 1,
      data_object_id: 7, // talent_pools
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
    },
  ];
  for (const h of handoffs) {
    const existing = (await get(
      `/handoffs?trigger_event_id=eq.${h.trigger_event_id}&source_domain_module_id=eq.${h.source_domain_module_id}&target_domain_module_id=eq.${h.target_domain_module_id}&data_object_id=eq.${h.data_object_id}&select=id`,
    )) as Row[];
    if (existing.length) {
      console.log(`  handoff (trigger ${h.trigger_event_id}, ${h.source_domain_module_id}→${h.target_domain_module_id}): already present`);
      continue;
    }
    await post("/handoffs", h);
    console.log(`  handoff (trigger ${h.trigger_event_id}, mod ${h.source_domain_module_id}→${h.target_domain_module_id}): inserted`);
  }

  console.log("\n✅ ATS audit fix-loader complete.");
  console.log("Deferred (need user input on target domain): interview.scheduled (370), recruitment_agency.engaged (376).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
