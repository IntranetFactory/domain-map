// ATS Validate fix-loader — 2026-05-29
// Applies Bucket 1 (all 4 findings) + Bucket 2 item 4 (APQC tag all 50 cross-domain handoffs)
// from today's review of audits/ATS.md.
//
// Phases:
//   1. domain_data_objects rollup backfill (B1-N1)
//   2. lifecycle states for 5 workflow-bearing masters (B1-N3)
//   3. trigger_events for the new lifecycle transitions (B1-N4)
//      — intra-domain handoffs only; cross-domain subscribers deferred to user
//   4. APQC handoff_processes tags for all 50 ATS cross-domain handoffs (B1-N2, B2-#4-a)
//
// Idempotency: every phase reads existing state first; only missing rows are inserted.
// Re-running is free.
//
// Rule discipline:
//   - Every new row ships record_status='new' or omitted (DB default 'new') — Rule #1.
//   - Zero writes to any `notes` column — Rule #15.
//   - APQC tags use proposal_source='agent_curated' — layered ownership per the H1 rule.

const SEMANTIUS = "semantius";

async function call(method: string, path: string, body?: unknown): Promise<unknown> {
  const args = ["call", "crud/postgrestRequest"];
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

const get = (path: string) => call("GET", path);
const post = (path: string, body: unknown) => call("POST", path, body);

type Row = Record<string, unknown>;

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const out: Row = {};
    for (const k of keys) {
      out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    }
    return out;
  });
}

async function insertChunked(table: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const result = (await post(`/${table}`, slice)) as Row[] | null;
    if (result) out.push(...result);
  }
  return out;
}

const ATS_DOMAIN_ID = 56;
const ATS_MODULE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 154];

const ROLE_STRENGTH: Record<string, number> = {
  master: 5,
  embedded_master: 4,
  contributor: 3,
  derived: 2,
  consumer: 1,
};

// PCF map: (event_name OR fallback) → process_id
// PCF ids resolved via /processes?source_framework=eq.apqc_pcf_cross_industry
const PCF = {
  recruit_source_candidates: 220,         // 10440 L3
  screen_select_candidates: 221,          // 20123 L3
  manage_new_hire: 222,                   // 10443 L3
  manage_applicant_information: 223,      // 10444 L3
  manage_employee_onboarding: 224,        // 10469 L3
  notify_hiring_manager: 1005,            // 10451 L4
  recruitment_methods_channels: 1007,     // 10453 L4
  perform_recruiting_events: 1008,        // 10454 L4
  maintain_candidate_pool: 1009,          // 21699 L4
  manage_recruitment_vendors: 1010,       // 10455 L4
  manage_recruitment_channels: 1012,      // 17048 L4
  selection_tools: 1013,                  // 10456 L4
  interview_candidates: 1014,             // 10457 L4
  test_candidates: 1015,                  // 10458 L4
  select_reject_candidates: 1016,         // 10459 L4
  draw_up_offer: 1017,                    // 10463 L4
  negotiate_offer: 1018,                  // 10464 L4
  hire_candidate: 1019,                   // 10465 L4
  obtain_background_information: 1020,    // 10460 L4
  create_applicant_record: 1021,          // 10466 L4
  manage_track_applicant_data: 1022,      // 10467 L4
  archive_non_hires: 1023,                // 10468 L4
  report_to_third_parties: 1499,          // 10925 L4 (OFCCP/EEO)
};

// (handoff_id, event_name, src→tgt, payload) → APQC process_id
const APQC_MAP: Array<[number, number]> = [
  // ATS outbound
  [2,    PCF.manage_employee_onboarding],   // ATS→ONB job_offer.accepted/onboarding_journeys
  [12,   PCF.hire_candidate],               // ATS→SWP requisition.filled/position_demand_forecasts
  [17,   PCF.manage_new_hire],              // ATS→HCM candidate.hired/employees
  [23,   PCF.hire_candidate],               // ATS→PA requisition.filled/people_kpis
  [120,  PCF.manage_employee_onboarding],   // ATS→BEN-ADMIN job_offer.accepted/benefit_enrollments
  [121,  PCF.draw_up_offer],                // ATS→COMP-MGMT job_offer.signed/compensation_statements
  [393,  PCF.manage_new_hire],              // ATS→HCM candidate.hired/candidates
  [394,  PCF.manage_employee_onboarding],   // ATS→ONB candidate.hired/candidates
  [395,  PCF.manage_employee_onboarding],   // ATS→BEN-ADMIN candidate.hired/candidates
  [396,  PCF.manage_new_hire],              // ATS→HCM job_offer.accepted/job_offers
  [398,  PCF.negotiate_offer],              // ATS→COMP-MGMT job_offer.signed/job_offers
  [399,  PCF.manage_new_hire],              // ATS→HCM requisition.filled/job_requisitions
  [400,  PCF.hire_candidate],               // ATS→SWP requisition.filled/job_requisitions
  [401,  PCF.obtain_background_information],// ATS→PAYROLL background_check.cleared
  [402,  PCF.obtain_background_information],// ATS→HRSD background_check.flagged
  [403,  PCF.recruitment_methods_channels], // ATS→PA recruitment_source.attributed
  [404,  PCF.manage_recruitment_vendors],   // ATS→PAYROLL candidate_referral.bonus_earned
  [406,  PCF.notify_hiring_manager],        // ATS→HCM headcount.approved/job_requisitions
  [1033, PCF.test_candidates],              // ATS→HCM candidate_assessment.passed
  [1034, PCF.test_candidates],              // ATS→TALENT-MGMT candidate_assessment.passed
  [1035, PCF.test_candidates],              // ATS→HCM candidate_assessment.failed
  [1037, PCF.manage_new_hire],              // ATS→HCM pre_employee.activated
  [1074, PCF.select_reject_candidates],     // ATS→ONB job_offer.rescinded
  [1075, PCF.select_reject_candidates],     // ATS→BEN-ADMIN job_offer.rescinded
  [1076, PCF.select_reject_candidates],     // ATS→COMP-MGMT job_offer.rescinded
  [1281, PCF.interview_candidates],         // ATS→PA interview_scorecard.submitted
  // ATS inbound (X→ATS)
  [14,   PCF.notify_hiring_manager],        // SWP→ATS headcount.approved/job_requisitions
  [20,   PCF.notify_hiring_manager],        // HCM→ATS employee.terminated (backfill)
  [384,  PCF.notify_hiring_manager],        // HCM→ATS hcm_position.approved_for_creation
  [386,  PCF.recruit_source_candidates],    // HCM→ATS job_profile.published
  [425,  PCF.draw_up_offer],                // COMP-MGMT→ATS salary_band.updated
  [453,  PCF.selection_tools],              // PA→ATS predictive_model.scored
  [455,  PCF.recruit_source_candidates],    // SWP→ATS position_demand_forecast.updated
  [1023, PCF.notify_hiring_manager],        // PSA→ATS project_resource_allocation.demand_unmet
  [1139, PCF.draw_up_offer],                // COMP-MGMT→ATS compensation_benchmark.refreshed
  [1176, PCF.recruit_source_candidates],    // HCM→ATS job_profile.updated
  [1177, PCF.manage_track_applicant_data],  // HCM→ATS org_unit.created
  [1178, PCF.manage_track_applicant_data],  // HCM→ATS org_unit.merged
  [1179, PCF.manage_track_applicant_data],  // HCM→ATS org_unit.disbanded
  [1180, PCF.notify_hiring_manager],        // HCM→ATS hcm_position.approved
  [1181, PCF.notify_hiring_manager],        // HCM→ATS hcm_position.opened
  [1182, PCF.notify_hiring_manager],        // HCM→ATS hcm_position.filled
  [1183, PCF.notify_hiring_manager],        // HCM→ATS hcm_position.frozen
  [1184, PCF.notify_hiring_manager],        // HCM→ATS hcm_position.eliminated
  [1185, PCF.recruit_source_candidates],    // HCM→ATS job_profile.approved
  [1186, PCF.recruit_source_candidates],    // HCM→ATS job_profile.activated
  [1187, PCF.recruit_source_candidates],    // HCM→ATS job_profile.retired
  [1188, PCF.manage_track_applicant_data],  // HCM→ATS org_unit.activated
  [1189, PCF.manage_track_applicant_data],  // HCM→ATS org_unit.reorganized
  [1190, PCF.manage_track_applicant_data],  // HCM→ATS org_unit.closed
];

async function phase1_rollup_backfill(): Promise<void> {
  console.log("\n[Phase 1] domain_data_objects rollup backfill");
  // Read all DMDO rows for ATS modules
  const modIds = ATS_MODULE_IDS.join(",");
  const dmdo = (await get(
    `/domain_module_data_objects?domain_module_id=in.(${modIds})` +
      `&select=domain_module_id,data_object_id,role,necessity`,
  )) as Array<{ data_object_id: number; role: string; necessity: string }>;
  // Pick strongest role per data_object
  type Best = { role: string; necessity: string; strength: number };
  const best = new Map<number, Best>();
  for (const r of dmdo) {
    const s = ROLE_STRENGTH[r.role] ?? 0;
    const cur = best.get(r.data_object_id);
    if (!cur || s > cur.strength) {
      best.set(r.data_object_id, { role: r.role, necessity: r.necessity, strength: s });
    }
  }
  // Read existing rollup
  const rollup = (await get(
    `/domain_data_objects?domain_id=eq.${ATS_DOMAIN_ID}&select=data_object_id,role,necessity`,
  )) as Array<{ data_object_id: number; role: string; necessity: string }>;
  const have = new Map<number, { role: string; necessity: string }>();
  for (const r of rollup) have.set(r.data_object_id, { role: r.role, necessity: r.necessity });
  // Compute inserts (missing) — do NOT alter rows that exist but disagree; surface those.
  const inserts: Row[] = [];
  const disagreements: string[] = [];
  for (const [doid, b] of best.entries()) {
    const ex = have.get(doid);
    if (!ex) {
      inserts.push({
        domain_id: ATS_DOMAIN_ID,
        data_object_id: doid,
        role: b.role,
        necessity: b.necessity,
      });
    } else if (ex.role !== b.role || ex.necessity !== b.necessity) {
      disagreements.push(
        `data_object_id=${doid}: rollup=(${ex.role},${ex.necessity}) vs DMDO-strongest=(${b.role},${b.necessity})`,
      );
    }
  }
  console.log(`  DMDO distinct data_objects: ${best.size}`);
  console.log(`  rollup existing: ${have.size}`);
  console.log(`  to insert: ${inserts.length}`);
  if (disagreements.length) {
    console.log(`  ⚠ disagreements (not auto-fixed): ${disagreements.length}`);
    for (const d of disagreements) console.log(`    - ${d}`);
  }
  await insertChunked("domain_data_objects", inserts);
}

async function phase2_lifecycle_states(): Promise<void> {
  console.log("\n[Phase 2] lifecycle states for 5 workflow-bearing masters");
  // data_object_name → id, resolved
  const dobjs = (await get(
    `/data_objects?data_object_name=in.(pre_adverse_action_notices,data_subject_requests,applicant_flow_records,hiring_team_assignments,referral_rewards)&select=id,data_object_name`,
  )) as Array<{ id: number; data_object_name: string }>;
  const idOf = new Map(dobjs.map((d) => [d.data_object_name, d.id]));
  const paan = idOf.get("pre_adverse_action_notices")!;
  const dsr = idOf.get("data_subject_requests")!;
  const afr = idOf.get("applicant_flow_records")!;
  const hta = idOf.get("hiring_team_assignments")!;
  const rr = idOf.get("referral_rewards")!;

  // Module IDs for permission prefix derivation:
  //   pre_adverse_action_notices (898) — module 7 (ATS-BACKGROUND-CHECKS)
  //   data_subject_requests (901) — module 1 (ATS-CANDIDATE-CRM)
  //   applicant_flow_records (899) — module 4 (ATS-RECRUITMENT-PIPELINE)
  //   hiring_team_assignments (905) — module 4 (ATS-RECRUITMENT-PIPELINE)
  //   referral_rewards (874) — module 3 (ATS-REFERRALS)

  const states: Row[] = [
    // pre_adverse_action_notices — FCRA pre-adverse → final timeline
    { data_object_id: paan, state_name: "drafted", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, domain_module_id: 7 },
    { data_object_id: paan, state_name: "issued", state_order: 2, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "issue_pre_adverse_action", domain_module_id: 7 },
    { data_object_id: paan, state_name: "waiting_period_active", state_order: 3, is_initial: false, is_terminal: false, requires_permission: false, domain_module_id: 7 },
    { data_object_id: paan, state_name: "finalized", state_order: 4, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "finalize_adverse_action", domain_module_id: 7 },
    { data_object_id: paan, state_name: "rescinded", state_order: 5, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "rescind_pre_adverse_action", domain_module_id: 7 },

    // data_subject_requests — GDPR Articles 15-22 timeline
    { data_object_id: dsr, state_name: "received", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, domain_module_id: 1 },
    { data_object_id: dsr, state_name: "verified", state_order: 2, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "verify_dsr_identity", domain_module_id: 1 },
    { data_object_id: dsr, state_name: "in_progress", state_order: 3, is_initial: false, is_terminal: false, requires_permission: false, domain_module_id: 1 },
    { data_object_id: dsr, state_name: "extended", state_order: 4, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "extend_dsr_deadline", domain_module_id: 1 },
    { data_object_id: dsr, state_name: "fulfilled", state_order: 5, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "fulfill_dsr", domain_module_id: 1 },
    { data_object_id: dsr, state_name: "rejected", state_order: 6, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "reject_dsr", domain_module_id: 1 },

    // applicant_flow_records — OFCCP Internet Applicant Rule trail
    { data_object_id: afr, state_name: "recorded", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, domain_module_id: 4 },
    { data_object_id: afr, state_name: "disposition_set", state_order: 2, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "set_applicant_disposition", domain_module_id: 4 },
    { data_object_id: afr, state_name: "audited", state_order: 3, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "audit_applicant_flow", domain_module_id: 4 },
    { data_object_id: afr, state_name: "archived", state_order: 4, is_initial: false, is_terminal: true, requires_permission: false, domain_module_id: 4 },

    // hiring_team_assignments — per-requisition staffing
    { data_object_id: hta, state_name: "assigned", state_order: 1, is_initial: true, is_terminal: false, requires_permission: true, permission_verb_override: "assign_hiring_team_member", domain_module_id: 4 },
    { data_object_id: hta, state_name: "active", state_order: 2, is_initial: false, is_terminal: false, requires_permission: false, domain_module_id: 4 },
    { data_object_id: hta, state_name: "ended", state_order: 3, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "end_hiring_team_assignment", domain_module_id: 4 },

    // referral_rewards — referral payout pipeline
    { data_object_id: rr, state_name: "earned", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, domain_module_id: 3 },
    { data_object_id: rr, state_name: "pending_eligibility_check", state_order: 2, is_initial: false, is_terminal: false, requires_permission: false, domain_module_id: 3 },
    { data_object_id: rr, state_name: "approved", state_order: 3, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "approve_referral_reward", domain_module_id: 3 },
    { data_object_id: rr, state_name: "paid", state_order: 4, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "pay_referral_reward", domain_module_id: 3 },
    { data_object_id: rr, state_name: "forfeited", state_order: 5, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "forfeit_referral_reward", domain_module_id: 3 },
  ];

  const doIds = [paan, dsr, afr, hta, rr].join(",");
  const existing = (await get(
    `/data_object_lifecycle_states?data_object_id=in.(${doIds})&select=data_object_id,state_name`,
  )) as Array<{ data_object_id: number; state_name: string }>;
  const haveKey = new Set(existing.map((e) => `${e.data_object_id}|${e.state_name}`));
  const toInsert = states.filter((s) => !haveKey.has(`${s.data_object_id}|${s.state_name}`));
  console.log(`  proposed: ${states.length}; existing: ${existing.length}; to insert: ${toInsert.length}`);
  await insertChunked("data_object_lifecycle_states", toInsert);
}

async function phase3_trigger_events(): Promise<void> {
  console.log("\n[Phase 3] trigger_events for new lifecycle transitions");
  const dobjs = (await get(
    `/data_objects?data_object_name=in.(pre_adverse_action_notices,data_subject_requests,applicant_flow_records,hiring_team_assignments,referral_rewards)&select=id,data_object_name`,
  )) as Array<{ id: number; data_object_name: string }>;
  const idOf = new Map(dobjs.map((d) => [d.data_object_name, d.id]));

  const events: Row[] = [
    {
      data_object_id: idOf.get("pre_adverse_action_notices"),
      event_name: "pre_adverse_action.issued",
      event_category: "state_change",
      description:
        "Pre-adverse action notice issued to candidate per FCRA. Opens the statutory waiting period during which the candidate may dispute findings before a final adverse-action decision.",
    },
    {
      data_object_id: idOf.get("pre_adverse_action_notices"),
      event_name: "pre_adverse_action.finalized",
      event_category: "state_change",
      description:
        "Waiting period elapsed; final adverse-action notice may now issue. Marks the FCRA pre-adverse phase as closed.",
    },
    {
      data_object_id: idOf.get("data_subject_requests"),
      event_name: "data_subject_request.received",
      event_category: "lifecycle",
      description:
        "GDPR Article 15-22 data-subject request received. Starts the one-month statutory response clock (extendable by two months under Article 12.3).",
    },
    {
      data_object_id: idOf.get("data_subject_requests"),
      event_name: "data_subject_request.fulfilled",
      event_category: "state_change",
      description:
        "Data subject request fulfilled per GDPR. Closes the statutory response window; produces the compliance evidence record.",
    },
    {
      data_object_id: idOf.get("applicant_flow_records"),
      event_name: "applicant_flow.recorded",
      event_category: "lifecycle",
      description:
        "Internet Applicant Rule applicant-flow event captured for OFCCP reporting. Required for federal contractors on every applicant action.",
    },
    {
      data_object_id: idOf.get("hiring_team_assignments"),
      event_name: "hiring_team.assigned",
      event_category: "state_change",
      description:
        "Hiring team member assigned to a requisition with a defined role (recruiter, hiring manager, coordinator, interviewer).",
    },
    {
      data_object_id: idOf.get("referral_rewards"),
      event_name: "referral_reward.approved",
      event_category: "state_change",
      description:
        "Referral reward approved after eligibility verification; queued for payout.",
    },
    {
      data_object_id: idOf.get("referral_rewards"),
      event_name: "referral_reward.paid",
      event_category: "state_change",
      description:
        "Referral reward paid to the referring employee. Marks the referral payout pipeline as closed.",
    },
  ];

  const existing = (await get(
    `/trigger_events?event_name=in.(${events.map((e) => e.event_name as string).join(",")})&select=event_name`,
  )) as Array<{ event_name: string }>;
  const have = new Set(existing.map((e) => e.event_name));
  const toInsert = events.filter((e) => !have.has(e.event_name as string));
  console.log(`  proposed: ${events.length}; existing: ${existing.length}; to insert: ${toInsert.length}`);
  await insertChunked("trigger_events", toInsert);
}

async function phase4_apqc_tags(): Promise<void> {
  console.log("\n[Phase 4] APQC handoff_processes tags");
  // Idempotency: composite key (handoff_id, process_id)
  const handoffIds = APQC_MAP.map(([h]) => h).join(",");
  const existing = (await get(
    `/handoff_processes?handoff_id=in.(${handoffIds})&select=handoff_id,process_id`,
  )) as Array<{ handoff_id: number; process_id: number }>;
  const have = new Set(existing.map((e) => `${e.handoff_id}|${e.process_id}`));

  const rows: Row[] = APQC_MAP.filter(([h, p]) => !have.has(`${h}|${p}`)).map(
    ([handoff_id, process_id]) => ({
      handoff_id,
      process_id,
      proposal_source: "agent_curated",
      // record_status omitted to take DB default ('new') per Rule #1
    }),
  );
  console.log(`  proposed: ${APQC_MAP.length}; existing: ${existing.length}; to insert: ${rows.length}`);
  await insertChunked("handoff_processes", rows);
}

async function summary(): Promise<void> {
  console.log("\n[Summary] post-load counts");
  const rollupCount = ((await get(
    `/domain_data_objects?domain_id=eq.${ATS_DOMAIN_ID}&select=data_object_id`,
  )) as unknown[]).length;
  const stateCount = ((await get(
    `/data_object_lifecycle_states?data_object_id=in.(898,899,900,901,902,903,904,905,874)&select=data_object_id`,
  )) as unknown[]).length;
  const eventCount = ((await get(
    `/trigger_events?event_name=in.(pre_adverse_action.issued,pre_adverse_action.finalized,data_subject_request.received,data_subject_request.fulfilled,applicant_flow.recorded,hiring_team.assigned,referral_reward.approved,referral_reward.paid)&select=event_name`,
  )) as unknown[]).length;
  const handoffIds = APQC_MAP.map(([h]) => h).join(",");
  const tagCount = ((await get(
    `/handoff_processes?handoff_id=in.(${handoffIds})&select=handoff_id`,
  )) as unknown[]).length;
  console.log(`  ATS rollup rows: ${rollupCount}`);
  console.log(`  lifecycle states on new+target masters: ${stateCount}`);
  console.log(`  new trigger_events landed: ${eventCount}/8`);
  console.log(`  APQC tags on ATS cross-domain handoffs: ${tagCount}/50`);
  console.log("\nUI spot-checks:");
  console.log("  https://tests.semantius.app/domain_map/domain_data_objects");
  console.log("  https://tests.semantius.app/domain_map/data_object_lifecycle_states");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
}

async function main() {
  console.log("ATS Validate fix-loader starting...");
  await phase1_rollup_backfill();
  await phase2_lifecycle_states();
  await phase3_trigger_events();
  await phase4_apqc_tags();
  await summary();
}

await main();
