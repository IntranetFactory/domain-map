#!/usr/bin/env bun
// ATS audit fix-loader — 2026-06-01
// Implements Bucket 2 decisions + Bucket 1a fixes from audits/ATS/state.yaml
// (2026-05-31 audit cycle). Idempotent on inserts via natural keys; PATCH
// operations re-run safely (writing same values).
//
// Decisions recorded:
//   - 5 compliance entities (898/899/901/902/903) flipped to master+optional
//   - 902 / 903 demoted to entity_type=operational_record (no lifecycle authored)
//   - 898 / 899 / 901: 16 lifecycle states authored (regulator-shaped)
//   - 14 existing lifecycle states: 11 verb_override PATCH + 3 requires_permission flips
//   - 2 OLT lifecycle states (1496 in_review, 1498 active) flipped to requires_permission=false
//   - 19 new workflow-gate permissions materialised across modules 1 / 3 / 4 / 6 / 7
//   - 19 new role_permissions for role_id=2 (preserves existing catalog convention)
//   - 20 trigger_events.event_category PATCHes (B1A-EVT-CATEGORIES)
//   - 2 permission name PATCHes (B1A-B12-PERM-RESIDUE)
//   - 1 DMDO necessity PATCH (B1A-M-CONSUMER-NECESSITY, row 950)
// Deferred to follow-up passes: B1A-B7 (user edges) and B1A-H-APQC (handoff_processes).

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

async function get(p: string) { return call("GET", p); }
async function post(p: string, b: unknown) { return call("POST", p, b); }
async function patch(p: string, b: unknown) { return call("PATCH", p, b); }

type Row = Record<string, unknown>;

async function main() {
  console.log("ATS audit fix-loader (2026-06-01) starting...");

  // ────────────────────────────────────────────────────────────
  // Phase 1 — DMDO necessity flips (5 compliance rows -> optional)
  // ────────────────────────────────────────────────────────────
  console.log("\n[Phase 1] DMDO necessity flips (5 rows)");
  await patch("/domain_module_data_objects?id=in.(984,985,987,988,989)", { necessity: "optional" });
  console.log("  PATCHed 5 DMDO rows -> necessity='optional'");

  // ────────────────────────────────────────────────────────────
  // Phase 2 — entity_type demotions for SOR ack + voluntary self-id
  // ────────────────────────────────────────────────────────────
  console.log("\n[Phase 2] entity_type demotions (902, 903 -> operational_record)");
  await patch("/data_objects?id=eq.902", { entity_type: "operational_record" });
  await patch("/data_objects?id=eq.903", { entity_type: "operational_record" });
  console.log("  PATCHed 2 data_objects -> entity_type='operational_record'");

  // ────────────────────────────────────────────────────────────
  // Phase 3 — Compliance lifecycle states (16 INSERTs)
  // ────────────────────────────────────────────────────────────
  console.log("\n[Phase 3] Compliance lifecycle states");
  const complianceStates: Row[] = [
    // pre_adverse_action_notices (898, ATS-BACKGROUND-CHECKS = module 7) — FCRA § 615(b)
    { data_object_id: 898, state_name: "sent", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: 7,
      description: "Pre-adverse-action notice issued to the candidate. Opens the FCRA waiting period during which the candidate may dispute findings in the consumer report." },
    { data_object_id: 898, state_name: "waiting_period_active", state_order: 2, is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: 7,
      description: "Waiting period in progress. FCRA requires a reasonable opportunity to dispute, typically interpreted as at least 5 business days." },
    { data_object_id: 898, state_name: "waiting_period_elapsed", state_order: 3, is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: 7,
      description: "Waiting period expired with no dispute filed. Eligible to escalate to a final adverse-action notice or to clear the pre-adverse step." },
    { data_object_id: 898, state_name: "under_dispute", state_order: 4, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "mark_pre_adverse_dispute_filed", domain_module_id: 7,
      description: "Candidate filed a dispute against findings in the consumer report. Investigation underway; the waiting clock is paused." },
    { data_object_id: 898, state_name: "cleared", state_order: 5, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "clear_pre_adverse_notice", domain_module_id: 7,
      description: "Pre-adverse notice withdrawn after candidate clarification or a successful dispute. The candidate proceeds in the hiring workflow." },
    { data_object_id: 898, state_name: "escalated", state_order: 6, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "escalate_to_final_adverse_action", domain_module_id: 7,
      description: "Proceeding to the final FCRA adverse-action step. A downstream adverse_action_notices row is created with post_adverse_sent firing on issue." },

    // applicant_flow_records (899, ATS-RECRUITMENT-PIPELINE = module 4) — OFCCP Internet Applicant Rule
    { data_object_id: 899, state_name: "applied", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: 4,
      description: "Initial Internet Applicant capture at application submission. Demographics (voluntary) attached if self-identification was provided." },
    { data_object_id: 899, state_name: "under_consideration", state_order: 2, is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: 4,
      description: "Applicant has advanced past initial screening and is in active consideration. Auto-progressed when the linked application advances stages." },
    { data_object_id: 899, state_name: "dispositioned", state_order: 3, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "disposition_applicant", domain_module_id: 4,
      description: "Recruiter codes the OFCCP disposition reason on the applicant (selected, not selected with typed reason, withdrew, etc.)." },
    { data_object_id: 899, state_name: "archived", state_order: 4, is_initial: false, is_terminal: true, requires_permission: false, permission_verb_override: "", domain_module_id: 4,
      description: "Auto-archived per OFCCP retention rules (typically a two-year retention window for federal contractors)." },

    // data_subject_requests (901, ATS-CANDIDATE-CRM = module 1) — GDPR Articles 15-22 / CCPA
    { data_object_id: 901, state_name: "received", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: 1,
      description: "Data subject request received. The GDPR 30-day response clock starts; extension to 60 days requires a separate notification to the subject." },
    { data_object_id: 901, state_name: "verified", state_order: 2, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "verify_dsr_identity", domain_module_id: 1,
      description: "Identity of the data subject confirmed by the DPO or designated handler. Required before any data is disclosed or modified." },
    { data_object_id: 901, state_name: "in_progress", state_order: 3, is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: 1,
      description: "Auto-progressed once identity is verified. Collection and review of subject data underway." },
    { data_object_id: 901, state_name: "fulfilled", state_order: 4, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "fulfill_dsr", domain_module_id: 1,
      description: "Full response delivered to the data subject within the regulatory window. All requested data provided or the requested action completed." },
    { data_object_id: 901, state_name: "partially_fulfilled", state_order: 5, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "fulfill_dsr_partially", domain_module_id: 1,
      description: "Partial response delivered. Some data categories were unavailable or out of scope; the rationale is documented on the request record." },
    { data_object_id: 901, state_name: "rejected", state_order: 6, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "reject_dsr", domain_module_id: 1,
      description: "Request rejected (unverifiable identity, manifestly unfounded, repetitive, or out of scope). Rejection rationale documented on the request record." },
  ];
  const existingStates = (await get("/data_object_lifecycle_states?data_object_id=in.(898,899,901)&select=data_object_id,state_name")) as Row[];
  const haveStates = new Set(existingStates.map(r => `${r.data_object_id}|${r.state_name}`));
  const newStates = complianceStates.filter(r => !haveStates.has(`${r.data_object_id}|${r.state_name}`));
  if (newStates.length > 0) {
    await post("/data_object_lifecycle_states", newStates);
    console.log(`  INSERTed ${newStates.length} compliance lifecycle states`);
  } else {
    console.log(`  all 16 compliance lifecycle states already present`);
  }

  // ────────────────────────────────────────────────────────────
  // Phase 4 — PATCH 14 existing lifecycle states (11 verb_override + 3 flips)
  // ────────────────────────────────────────────────────────────
  console.log("\n[Phase 4] PATCH 14 existing lifecycle states");
  const verbPatches: { id: number; verb: string }[] = [
    { id: 1160, verb: "withdraw_consent" },
    { id: 1170, verb: "approve_referral_payout" },
    { id: 1172, verb: "clawback_referral_payout" },
    { id: 1187, verb: "clear_adjudication" },
    { id: 1188, verb: "engage_adjudication" },
    { id: 1189, verb: "decline_adjudication" },
    { id: 1193, verb: "send_post_adverse_notice" },
    { id: 1200, verb: "approve_requisition" }, // reuses existing permission 10023
    { id: 1201, verb: "reject_requisition" },
    { id: 1230, verb: "approve_offer" }, // reuses existing permission 10038
    { id: 1231, verb: "reject_offer" },
  ];
  const flipIds = [1152, 1171, 1175]; // candidate_nurture_campaigns.active, referral_payouts.paid, referral_campaigns.active
  for (const p of verbPatches) {
    await patch(`/data_object_lifecycle_states?id=eq.${p.id}`, { permission_verb_override: p.verb });
  }
  await patch(`/data_object_lifecycle_states?id=in.(${flipIds.join(",")})`, { requires_permission: false });
  console.log(`  PATCHed ${verbPatches.length} verb_overrides + flipped ${flipIds.length} to requires_permission=false`);

  // ────────────────────────────────────────────────────────────
  // Phase 5 — PATCH 2 OLT lifecycle states (1496 in_review, 1498 active)
  // ────────────────────────────────────────────────────────────
  console.log("\n[Phase 5] PATCH 2 OLT lifecycle states");
  await patch("/data_object_lifecycle_states?id=in.(1496,1498)", { requires_permission: false });
  console.log("  PATCHed 1496 (in_review) + 1498 (active) -> requires_permission=false");

  // ────────────────────────────────────────────────────────────
  // Phase 6 — B1A-EVT-CATEGORIES: 20 trigger_events.event_category
  // ────────────────────────────────────────────────────────────
  console.log("\n[Phase 6] PATCH 20 trigger_events.event_category");
  const stateChangeIds = [360, 361, 363, 364, 367, 369];
  const lifecycleIds = [362, 365, 366, 368, 370, 371, 372, 373, 374, 375, 376, 377, 1180, 1181];
  await patch(`/trigger_events?id=in.(${stateChangeIds.join(",")})`, { event_category: "state_change" });
  await patch(`/trigger_events?id=in.(${lifecycleIds.join(",")})`, { event_category: "lifecycle" });
  console.log(`  PATCHed ${stateChangeIds.length} state_change + ${lifecycleIds.length} lifecycle`);

  // ────────────────────────────────────────────────────────────
  // Phase 7 — B1A-B12-PERM-RESIDUE: PATCH 2 permission names
  // ────────────────────────────────────────────────────────────
  console.log("\n[Phase 7] PATCH 2 permission names (B12 residue)");
  await patch("/permissions?id=eq.10030", { permission_name: "ats-interviews:submit_scorecard" });
  await patch("/permissions?id=eq.10045", { permission_name: "ats-background-checks:adjudicate_background_check" });
  console.log("  PATCHed 2 permission names");

  // ────────────────────────────────────────────────────────────
  // Phase 8 — B1A-M-CONSUMER-NECESSITY: DMDO 950 -> optional
  // ────────────────────────────────────────────────────────────
  console.log("\n[Phase 8] PATCH DMDO 950 (talent_pools consumer in ATS-CANDIDATE-CRM)");
  await patch("/domain_module_data_objects?id=eq.950", { necessity: "optional" });
  console.log("  PATCHed DMDO 950 -> necessity='optional'");

  // ────────────────────────────────────────────────────────────
  // Phase 9 — INSERT 19 new workflow-gate permissions
  // ────────────────────────────────────────────────────────────
  console.log("\n[Phase 9] INSERT new workflow-gate permissions");
  const newPerms: Row[] = [
    // Module 7 (ATS-BACKGROUND-CHECKS) — 7 new
    { permission_name: "ats-background-checks:mark_pre_adverse_dispute_filed", description: "Mark a pre-adverse-action notice as disputed by the candidate; pauses the FCRA waiting period.", domain_module_id: 7, tier: "workflow-gate" },
    { permission_name: "ats-background-checks:clear_pre_adverse_notice", description: "Withdraw a pre-adverse-action notice after candidate clarification or successful dispute.", domain_module_id: 7, tier: "workflow-gate" },
    { permission_name: "ats-background-checks:escalate_to_final_adverse_action", description: "Escalate a pre-adverse notice to the final FCRA adverse-action step.", domain_module_id: 7, tier: "workflow-gate" },
    { permission_name: "ats-background-checks:clear_adjudication", description: "Mark a background-check adjudication as clear; the candidate proceeds.", domain_module_id: 7, tier: "workflow-gate" },
    { permission_name: "ats-background-checks:engage_adjudication", description: "Engage the dispute or additional-review path on a background-check adjudication.", domain_module_id: 7, tier: "workflow-gate" },
    { permission_name: "ats-background-checks:decline_adjudication", description: "Decline a background-check adjudication; the candidate is not progressing.", domain_module_id: 7, tier: "workflow-gate" },
    { permission_name: "ats-background-checks:send_post_adverse_notice", description: "Send the final FCRA adverse-action notice to the candidate.", domain_module_id: 7, tier: "workflow-gate" },

    // Module 4 (ATS-RECRUITMENT-PIPELINE) — 2 new
    { permission_name: "ats-recruitment-pipeline:disposition_applicant", description: "Code the OFCCP disposition reason on an applicant flow record.", domain_module_id: 4, tier: "workflow-gate" },
    { permission_name: "ats-recruitment-pipeline:reject_requisition", description: "Reject a job requisition during the approval workflow.", domain_module_id: 4, tier: "workflow-gate" },

    // Module 1 (ATS-CANDIDATE-CRM) — 5 new
    { permission_name: "ats-candidate-crm:verify_dsr_identity", description: "Verify the identity of a data-subject-request submitter before disclosing or modifying data.", domain_module_id: 1, tier: "workflow-gate" },
    { permission_name: "ats-candidate-crm:fulfill_dsr", description: "Mark a data-subject request fulfilled; full response delivered.", domain_module_id: 1, tier: "workflow-gate" },
    { permission_name: "ats-candidate-crm:fulfill_dsr_partially", description: "Mark a data-subject request partially fulfilled; some categories out of scope.", domain_module_id: 1, tier: "workflow-gate" },
    { permission_name: "ats-candidate-crm:reject_dsr", description: "Reject a data-subject request (unverifiable, manifestly unfounded, repetitive, or out of scope).", domain_module_id: 1, tier: "workflow-gate" },
    { permission_name: "ats-candidate-crm:withdraw_consent", description: "Process a candidate consent withdrawal.", domain_module_id: 1, tier: "workflow-gate" },

    // Module 3 (ATS-REFERRALS) — 2 new
    { permission_name: "ats-referrals:approve_referral_payout", description: "Approve a referral payout for the finance / payroll system.", domain_module_id: 3, tier: "workflow-gate" },
    { permission_name: "ats-referrals:clawback_referral_payout", description: "Initiate a clawback on a previously-paid referral payout.", domain_module_id: 3, tier: "workflow-gate" },

    // Module 6 (ATS-OFFERS) — 3 new
    { permission_name: "ats-offers:approve_offer_letter_template", description: "Approve an offer letter template for publication.", domain_module_id: 6, tier: "workflow-gate" },
    { permission_name: "ats-offers:retire_offer_letter_template", description: "Retire an active offer letter template.", domain_module_id: 6, tier: "workflow-gate" },
    { permission_name: "ats-offers:reject_offer", description: "Reject an offer approval; offer does not proceed.", domain_module_id: 6, tier: "workflow-gate" },
  ];
  const newPermNames = newPerms.map(p => p.permission_name).join(",");
  const existingPerms = (await get(`/permissions?permission_name=in.(${newPermNames})&select=id,permission_name`)) as Row[];
  const havePerms = new Set(existingPerms.map(r => String(r.permission_name)));
  const missingPerms = newPerms.filter(p => !havePerms.has(String(p.permission_name)));
  if (missingPerms.length > 0) {
    await post("/permissions", missingPerms);
    console.log(`  INSERTed ${missingPerms.length} new permissions`);
  } else {
    console.log(`  all ${newPerms.length} permissions already present`);
  }
  // Re-query for full id map
  const allPerms = (await get(`/permissions?permission_name=in.(${newPermNames})&select=id,permission_name`)) as Row[];
  const permIdMap = new Map<string, number>();
  for (const p of allPerms) permIdMap.set(String(p.permission_name), Number(p.id));

  // ────────────────────────────────────────────────────────────
  // Phase 10 — INSERT role_permissions for role_id=2 (preserve catalog convention)
  // ────────────────────────────────────────────────────────────
  console.log("\n[Phase 10] INSERT role_permissions for role_id=2");
  const allNewPermIds = newPerms.map(p => permIdMap.get(String(p.permission_name))!).filter(Boolean);
  const existingRPs = (await get(`/role_permissions?role_id=eq.2&permission_id=in.(${allNewPermIds.join(",")})&select=permission_id`)) as Row[];
  const haveRPs = new Set(existingRPs.map(r => Number(r.permission_id)));
  const missingRPs = allNewPermIds.filter(pid => !haveRPs.has(pid)).map(pid => ({ role_id: 2, permission_id: pid }));
  if (missingRPs.length > 0) {
    await post("/role_permissions", missingRPs);
    console.log(`  INSERTed ${missingRPs.length} role_permissions`);
  } else {
    console.log(`  all role_permissions already present`);
  }

  console.log("\n────────────────────────────────");
  console.log("ATS audit fix-loader complete.");
  console.log("UI links to spot-check:");
  console.log("  https://tests.semantius.app/domain_map/data_object_lifecycle_states");
  console.log("  https://tests.semantius.app/domain_map/permissions");
  console.log("  https://tests.semantius.app/domain_map/role_permissions");
  console.log("  https://tests.semantius.app/domain_map/domain_module_data_objects");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
}

main().catch(e => { console.error(e); process.exit(1); });
