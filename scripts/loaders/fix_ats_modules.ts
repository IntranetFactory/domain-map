#!/usr/bin/env bun
// Idempotent loader to fix workflow substrate across ATS modules.
// Adds missing point-solution data_objects, DMDO rows, lifecycle states, and intra-domain relationships.
// Safe to re-run.

type Json = any;

async function semantius(method: string, path: string, body?: Json): Promise<Json> {
  const arg: Json = { method, path };
  if (body !== undefined) arg.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(arg)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius ${method} ${path} failed: ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

async function getModuleId(code: string): Promise<number> {
  const r = await semantius("GET", `/domain_modules?domain_module_code=eq.${code}&select=id`);
  if (!r?.length) throw new Error(`module not found: ${code}`);
  return r[0].id;
}

async function getDataObjectId(name: string): Promise<number> {
  const r = await semantius("GET", `/data_objects?data_object_name=eq.${name}&select=id`);
  if (!r?.length) throw new Error(`data_object not found: ${name}`);
  return r[0].id;
}

type DataObjectSpec = {
  data_object_name: string;
  singular_label: string;
  plural_label: string;
  description: string;
  has_personal_content?: boolean;
};

async function upsertDataObjects(rows: DataObjectSpec[]): Promise<Map<string, number>> {
  if (!rows.length) return new Map();
  const names = rows.map(r => r.data_object_name);
  const existing = await semantius("GET",
    `/data_objects?data_object_name=in.(${names.join(",")})&select=id,data_object_name`);
  const existingNames = new Set(existing.map((r: any) => r.data_object_name));
  const toInsert = rows
    .filter(r => !existingNames.has(r.data_object_name))
    .map(r => ({
      data_object_name: r.data_object_name,
      singular_label: r.singular_label,
      plural_label: r.plural_label,
      description: r.description,
      kind: "domain_owned",
      has_personal_content: r.has_personal_content ?? false,
    }));
  if (toInsert.length) {
    await semantius("POST", "/data_objects", toInsert);
    console.log(`  +${toInsert.length} data_objects: ${toInsert.map(r => r.data_object_name).join(", ")}`);
  }
  const all = await semantius("GET",
    `/data_objects?data_object_name=in.(${names.join(",")})&select=id,data_object_name`);
  const map = new Map<string, number>();
  for (const r of all) map.set(r.data_object_name, r.id);
  return map;
}

type DMDOSpec = {
  data_object_id: number;
  role: string;
  necessity: string;
};

async function upsertDMDO(moduleId: number, rows: DMDOSpec[]): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map(r => r.data_object_id);
  const existing = await semantius("GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`);
  const existingIds = new Set(existing.map((r: any) => r.data_object_id));
  const toInsert = rows
    .filter(r => !existingIds.has(r.data_object_id))
    .map(r => ({ ...r, domain_module_id: moduleId }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`  +${toInsert.length} DMDO rows on module ${moduleId}`);
  }
}

type LifecycleSpec = {
  data_object_id: number;
  state_name: string;
  state_order: number;
  is_initial?: boolean;
  is_terminal?: boolean;
  requires_permission?: boolean;
  permission_verb_override?: string;
  domain_module_id?: number | null;
  description: string;
};

async function upsertLifecycleStates(rows: LifecycleSpec[]): Promise<void> {
  if (!rows.length) return;
  const doIds = [...new Set(rows.map(r => r.data_object_id))];
  const existing = await semantius("GET",
    `/data_object_lifecycle_states?data_object_id=in.(${doIds.join(",")})&select=data_object_id,state_name`);
  const existingKeys = new Set(existing.map((r: any) => `${r.data_object_id}::${r.state_name}`));
  const toInsert = rows
    .filter(r => !existingKeys.has(`${r.data_object_id}::${r.state_name}`))
    .map(r => ({
      data_object_id: r.data_object_id,
      state_name: r.state_name,
      state_order: r.state_order,
      is_initial: r.is_initial ?? false,
      is_terminal: r.is_terminal ?? false,
      requires_permission: r.requires_permission ?? false,
      permission_verb_override: r.permission_verb_override ?? "",
      domain_module_id: r.domain_module_id ?? null,
      description: r.description,
    }));
  if (toInsert.length) {
    await semantius("POST", "/data_object_lifecycle_states", toInsert);
    console.log(`  +${toInsert.length} lifecycle states`);
  }
}

type RelationshipSpec = {
  data_object_id: number;
  related_data_object_id: number;
  relationship_verb: string;
  inverse_verb: string;
  relationship_type: string;
  relationship_kind: string;
  is_required: boolean;
  owner_side: string;
};

async function upsertRelationships(rows: RelationshipSpec[]): Promise<void> {
  if (!rows.length) return;
  // Idempotent via (data_object_id, related_data_object_id, relationship_verb)
  const conds = rows.map(r =>
    `and(data_object_id.eq.${r.data_object_id},related_data_object_id.eq.${r.related_data_object_id},relationship_verb.eq.${r.relationship_verb})`
  ).join(",");
  const existing = await semantius("GET",
    `/data_object_relationships?or=(${conds})&select=data_object_id,related_data_object_id,relationship_verb`);
  const existingKeys = new Set(existing.map((r: any) =>
    `${r.data_object_id}::${r.related_data_object_id}::${r.relationship_verb}`
  ));
  const toInsert = rows.filter(r =>
    !existingKeys.has(`${r.data_object_id}::${r.related_data_object_id}::${r.relationship_verb}`)
  );
  if (toInsert.length) {
    await semantius("POST", "/data_object_relationships", toInsert);
    console.log(`  +${toInsert.length} relationships`);
  }
}

// ============================================================
// ATS-CANDIDATE-CRM
// ============================================================

async function fixCandidateCRM() {
  console.log("\n=== ATS-CANDIDATE-CRM ===");
  const moduleId = await getModuleId("ATS-CANDIDATE-CRM");

  const idMap = await upsertDataObjects([
    {
      data_object_name: "candidate_engagements",
      singular_label: "Candidate Engagement",
      plural_label: "Candidate Engagements",
      description: "Single recruiter-to-candidate touchpoint (email, InMail, call, SMS, event invite). Carries channel, direction, timestamp, status, and content reference.",
      has_personal_content: true,
    },
    {
      data_object_name: "candidate_nurture_campaigns",
      singular_label: "Candidate Nurture Campaign",
      plural_label: "Candidate Nurture Campaigns",
      description: "Multi-touch automated outreach sequence targeting talent-pool segments. Carries cadence, step templates, audience filter, and lifecycle state.",
    },
    {
      data_object_name: "recruiting_event_attendances",
      singular_label: "Recruiting Event Attendance",
      plural_label: "Recruiting Event Attendances",
      description: "Junction between candidates and recruitment_events recording registration, check-in, attendance, and conversion outcome.",
      has_personal_content: true,
    },
    {
      data_object_name: "recruiter_interactions",
      singular_label: "Recruiter Interaction",
      plural_label: "Recruiter Interactions",
      description: "Free-text recruiter note attached to a candidate, application, or pool, time-stamped and authored by a user.",
      has_personal_content: true,
    },
    {
      data_object_name: "candidate_consents",
      singular_label: "Candidate Consent",
      plural_label: "Candidate Consents",
      description: "Per-candidate opt-in record for GDPR / CCPA / data retention. Carries consent type, jurisdiction, granted timestamp, withdrawal timestamp, retention window.",
      has_personal_content: true,
    },
  ]);

  await upsertDMDO(moduleId, [
    { data_object_id: idMap.get("candidate_engagements")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("candidate_nurture_campaigns")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("recruiting_event_attendances")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("recruiter_interactions")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("candidate_consents")!, role: "master", necessity: "required" },
  ]);

  await upsertLifecycleStates([
    { data_object_id: idMap.get("candidate_engagements")!, state_name: "planned", state_order: 1, is_initial: true, description: "Engagement queued, not yet sent." },
    { data_object_id: idMap.get("candidate_engagements")!, state_name: "sent", state_order: 2, description: "Outbound dispatched to candidate." },
    { data_object_id: idMap.get("candidate_engagements")!, state_name: "delivered", state_order: 3, description: "Channel confirmed delivery." },
    { data_object_id: idMap.get("candidate_engagements")!, state_name: "responded", state_order: 4, is_terminal: true, description: "Candidate replied or engaged with content." },
    { data_object_id: idMap.get("candidate_engagements")!, state_name: "bounced", state_order: 5, is_terminal: true, description: "Delivery failed (bad address, blocked, unsubscribed)." },

    { data_object_id: idMap.get("candidate_nurture_campaigns")!, state_name: "draft", state_order: 1, is_initial: true, description: "Campaign being authored." },
    { data_object_id: idMap.get("candidate_nurture_campaigns")!, state_name: "active", state_order: 2, requires_permission: true, description: "Campaign live and sending to audience." },
    { data_object_id: idMap.get("candidate_nurture_campaigns")!, state_name: "paused", state_order: 3, description: "Campaign halted; can resume." },
    { data_object_id: idMap.get("candidate_nurture_campaigns")!, state_name: "completed", state_order: 4, is_terminal: true, description: "Campaign reached scheduled end." },

    { data_object_id: idMap.get("recruiting_event_attendances")!, state_name: "registered", state_order: 1, is_initial: true, description: "Candidate RSVP'd or was pre-registered." },
    { data_object_id: idMap.get("recruiting_event_attendances")!, state_name: "checked_in", state_order: 2, description: "Candidate arrived at the event." },
    { data_object_id: idMap.get("recruiting_event_attendances")!, state_name: "attended", state_order: 3, is_terminal: true, description: "Engaged at the event; eligible for follow-up." },
    { data_object_id: idMap.get("recruiting_event_attendances")!, state_name: "no_show", state_order: 4, is_terminal: true, description: "Registered but did not attend." },

    { data_object_id: idMap.get("candidate_consents")!, state_name: "granted", state_order: 1, is_initial: true, description: "Candidate has granted consent." },
    { data_object_id: idMap.get("candidate_consents")!, state_name: "withdrawn", state_order: 2, is_terminal: true, requires_permission: true, description: "Candidate revoked consent; data must be anonymized per policy." },
    { data_object_id: idMap.get("candidate_consents")!, state_name: "expired", state_order: 3, is_terminal: true, description: "Retention window elapsed without renewal." },
  ]);

  const candidatesId = await getDataObjectId("candidates");
  const recruitmentEventsId = await getDataObjectId("recruitment_events");
  const talentPoolsId = await getDataObjectId("talent_pools");

  await upsertRelationships([
    { data_object_id: candidatesId, related_data_object_id: idMap.get("candidate_engagements")!, relationship_verb: "engaged_via", inverse_verb: "targets", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
    { data_object_id: idMap.get("candidate_nurture_campaigns")!, related_data_object_id: idMap.get("candidate_engagements")!, relationship_verb: "generates", inverse_verb: "part_of", relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source" },
    { data_object_id: candidatesId, related_data_object_id: idMap.get("recruiting_event_attendances")!, relationship_verb: "attends_via", inverse_verb: "tracks", relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "target" },
    { data_object_id: recruitmentEventsId, related_data_object_id: idMap.get("recruiting_event_attendances")!, relationship_verb: "has_attendance", inverse_verb: "for_event", relationship_type: "one_to_many", relationship_kind: "composition", is_required: true, owner_side: "source" },
    { data_object_id: candidatesId, related_data_object_id: idMap.get("recruiter_interactions")!, relationship_verb: "noted_via", inverse_verb: "about", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
    { data_object_id: candidatesId, related_data_object_id: idMap.get("candidate_consents")!, relationship_verb: "consents_via", inverse_verb: "for_candidate", relationship_type: "one_to_many", relationship_kind: "composition", is_required: true, owner_side: "source" },
    { data_object_id: talentPoolsId, related_data_object_id: idMap.get("candidate_nurture_campaigns")!, relationship_verb: "targets", inverse_verb: "draws_from", relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  ]);
}

// ============================================================
// ATS-TALENT-POOLS
// ============================================================

async function fixTalentPools() {
  console.log("\n=== ATS-TALENT-POOLS ===");
  const moduleId = await getModuleId("ATS-TALENT-POOLS");

  const idMap = await upsertDataObjects([
    {
      data_object_name: "talent_pool_memberships",
      singular_label: "Talent Pool Membership",
      plural_label: "Talent Pool Memberships",
      description: "Junction between candidates and talent_pools. Carries added timestamp, source, status_in_pool (cold/warm/hot), match score, and last_engagement timestamp.",
      has_personal_content: true,
    },
    {
      data_object_name: "talent_segments",
      singular_label: "Talent Segment",
      plural_label: "Talent Segments",
      description: "Rule-based pool definition (boolean filter over candidates) that materializes membership automatically. Examples: 'Senior PMs in NYC with FinTech experience', 'Engineering alumni who left in the last 2 years'.",
    },
    {
      data_object_name: "recruiter_saved_searches",
      singular_label: "Recruiter Saved Search",
      plural_label: "Recruiter Saved Searches",
      description: "Persisted recruiter boolean query over the candidate database. Carries filter expression, last_run timestamp, alert preferences.",
    },
  ]);

  await upsertDMDO(moduleId, [
    { data_object_id: idMap.get("talent_pool_memberships")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("talent_segments")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("recruiter_saved_searches")!, role: "master", necessity: "optional" },
  ]);

  await upsertLifecycleStates([
    { data_object_id: idMap.get("talent_pool_memberships")!, state_name: "cold", state_order: 1, is_initial: true, description: "In pool, no recent engagement." },
    { data_object_id: idMap.get("talent_pool_memberships")!, state_name: "warm", state_order: 2, description: "Recent positive engagement (replied, attended event)." },
    { data_object_id: idMap.get("talent_pool_memberships")!, state_name: "hot", state_order: 3, description: "Actively engaged; recruiter is in conversation about a specific role." },
    { data_object_id: idMap.get("talent_pool_memberships")!, state_name: "removed", state_order: 4, is_terminal: true, description: "Candidate removed from pool (opt-out, archive, do-not-contact)." },

    { data_object_id: idMap.get("talent_segments")!, state_name: "draft", state_order: 1, is_initial: true, description: "Segment rule being authored." },
    { data_object_id: idMap.get("talent_segments")!, state_name: "active", state_order: 2, description: "Segment live; membership materializes from rule." },
    { data_object_id: idMap.get("talent_segments")!, state_name: "archived", state_order: 3, is_terminal: true, description: "Segment retired; rule no longer evaluated." },
  ]);

  const candidatesId = await getDataObjectId("candidates");
  const talentPoolsId = await getDataObjectId("talent_pools");

  await upsertRelationships([
    { data_object_id: talentPoolsId, related_data_object_id: idMap.get("talent_pool_memberships")!, relationship_verb: "has_member", inverse_verb: "in_pool", relationship_type: "one_to_many", relationship_kind: "composition", is_required: true, owner_side: "source" },
    { data_object_id: candidatesId, related_data_object_id: idMap.get("talent_pool_memberships")!, relationship_verb: "member_of_via", inverse_verb: "tracks", relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "target" },
    { data_object_id: idMap.get("talent_segments")!, related_data_object_id: talentPoolsId, relationship_verb: "materializes_into", inverse_verb: "defined_by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  ]);
}

// ============================================================
// ATS-REFERRALS
// ============================================================

async function fixReferrals() {
  console.log("\n=== ATS-REFERRALS ===");
  const moduleId = await getModuleId("ATS-REFERRALS");

  const idMap = await upsertDataObjects([
    {
      data_object_name: "referral_rewards",
      singular_label: "Referral Reward",
      plural_label: "Referral Rewards",
      description: "Bounty rule defining the payout amount and conditions for a successful referral (e.g. $5000 paid 90 days after hire start, scaled by role level).",
    },
    {
      data_object_name: "referral_payouts",
      singular_label: "Referral Payout",
      plural_label: "Referral Payouts",
      description: "Individual payout instance triggered when a referred candidate is hired and meets tenure conditions. Lifecycle: pending -> approved -> paid (-> clawed_back).",
    },
    {
      data_object_name: "referral_campaigns",
      singular_label: "Referral Campaign",
      plural_label: "Referral Campaigns",
      description: "Time-bounded promotion offering bonus referral rewards (e.g. 'double bonus for engineering Q3 2026', 'spot-bonus for hard-to-fill roles'). Scopes a referral_rewards override.",
    },
  ]);

  await upsertDMDO(moduleId, [
    { data_object_id: idMap.get("referral_rewards")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("referral_payouts")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("referral_campaigns")!, role: "master", necessity: "optional" },
  ]);

  await upsertLifecycleStates([
    { data_object_id: idMap.get("referral_payouts")!, state_name: "pending", state_order: 1, is_initial: true, description: "Referral hire confirmed; tenure clock running." },
    { data_object_id: idMap.get("referral_payouts")!, state_name: "approved", state_order: 2, requires_permission: true, description: "Tenure condition met; payout approved by HR/Finance." },
    { data_object_id: idMap.get("referral_payouts")!, state_name: "paid", state_order: 3, is_terminal: true, requires_permission: true, description: "Payout disbursed to referrer." },
    { data_object_id: idMap.get("referral_payouts")!, state_name: "clawed_back", state_order: 4, is_terminal: true, requires_permission: true, description: "Referred employee left before tenure clause expired; payout reversed." },
    { data_object_id: idMap.get("referral_payouts")!, state_name: "forfeited", state_order: 5, is_terminal: true, description: "Conditions never met (referred candidate not hired, did not start, voided)." },

    { data_object_id: idMap.get("referral_campaigns")!, state_name: "draft", state_order: 1, is_initial: true, description: "Campaign being scoped." },
    { data_object_id: idMap.get("referral_campaigns")!, state_name: "active", state_order: 2, requires_permission: true, description: "Campaign live; referrals submitted during window qualify for override reward." },
    { data_object_id: idMap.get("referral_campaigns")!, state_name: "ended", state_order: 3, is_terminal: true, description: "Campaign window closed." },
  ]);

  const candidateReferralsId = await getDataObjectId("candidate_referrals");

  await upsertRelationships([
    { data_object_id: candidateReferralsId, related_data_object_id: idMap.get("referral_payouts")!, relationship_verb: "earns", inverse_verb: "from", relationship_type: "one_to_one", relationship_kind: "reference", is_required: false, owner_side: "source" },
    { data_object_id: idMap.get("referral_rewards")!, related_data_object_id: idMap.get("referral_payouts")!, relationship_verb: "governs", inverse_verb: "per_rule", relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "source" },
    { data_object_id: idMap.get("referral_campaigns")!, related_data_object_id: idMap.get("referral_rewards")!, relationship_verb: "overrides", inverse_verb: "scoped_by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  ]);
}

// ============================================================
// ATS-BACKGROUND-CHECKS
// ============================================================

async function fixBackgroundChecks() {
  console.log("\n=== ATS-BACKGROUND-CHECKS ===");
  const moduleId = await getModuleId("ATS-BACKGROUND-CHECKS");

  const idMap = await upsertDataObjects([
    {
      data_object_name: "background_check_packages",
      singular_label: "Background Check Package",
      plural_label: "Background Check Packages",
      description: "Configured bundle of check types (county criminal + national + MVR + drug screen + employment verification + education verification) that can be ordered as one unit. Catalog-shaped: defines what a 'standard package' looks like for a role tier.",
    },
    {
      data_object_name: "background_check_components",
      singular_label: "Background Check Component",
      plural_label: "Background Check Components",
      description: "Individual sub-check result inside a background_checks order (e.g. county_criminal, ssn_trace, employment_verification, drug_screen). Each component has its own status, result, and provider source.",
      has_personal_content: true,
    },
    {
      data_object_name: "fcra_disclosures",
      singular_label: "FCRA Disclosure",
      plural_label: "FCRA Disclosures",
      description: "Pre-check legally required disclosure form presented to the candidate before any consumer report is requested. Carries the disclosure text version, candidate acknowledgement signature, timestamp, and jurisdiction-specific addenda (CA, NY, etc.).",
      has_personal_content: true,
    },
    {
      data_object_name: "background_check_adjudications",
      singular_label: "Background Check Adjudication",
      plural_label: "Background Check Adjudications",
      description: "Human review decision on a completed background_check (Clear / Engaged / Decisional / Declined). Carries adjudicator, decision rationale, individualized assessment notes per EEOC guidance.",
      has_personal_content: true,
    },
    {
      data_object_name: "adverse_action_notices",
      singular_label: "Adverse Action Notice",
      plural_label: "Adverse Action Notices",
      description: "FCRA-mandated notice issued when a background_check result is used to decline a candidate. Two-step process: pre-adverse notice + waiting period + post-adverse final notice. Carries notice type, sent timestamp, copy_of_report enclosure, dispute window expiry.",
      has_personal_content: true,
    },
    {
      data_object_name: "background_check_disputes",
      singular_label: "Background Check Dispute",
      plural_label: "Background Check Disputes",
      description: "Candidate-initiated dispute of a background_check component result under FCRA rights. Carries disputed component, candidate statement, provider re-investigation result, resolution.",
      has_personal_content: true,
    },
  ]);

  await upsertDMDO(moduleId, [
    { data_object_id: idMap.get("background_check_packages")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("background_check_components")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("fcra_disclosures")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("background_check_adjudications")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("adverse_action_notices")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("background_check_disputes")!, role: "master", necessity: "required" },
  ]);

  await upsertLifecycleStates([
    { data_object_id: idMap.get("background_check_components")!, state_name: "ordered", state_order: 1, is_initial: true, description: "Component requested from provider." },
    { data_object_id: idMap.get("background_check_components")!, state_name: "in_progress", state_order: 2, description: "Provider actively researching." },
    { data_object_id: idMap.get("background_check_components")!, state_name: "completed_clear", state_order: 3, is_terminal: true, description: "Component returned clear (no findings)." },
    { data_object_id: idMap.get("background_check_components")!, state_name: "completed_flagged", state_order: 4, is_terminal: true, description: "Component returned with findings requiring adjudication." },
    { data_object_id: idMap.get("background_check_components")!, state_name: "unable_to_verify", state_order: 5, is_terminal: true, description: "Provider could not verify; component closed without result." },

    { data_object_id: idMap.get("fcra_disclosures")!, state_name: "presented", state_order: 1, is_initial: true, description: "Disclosure shown to candidate; awaiting acknowledgement." },
    { data_object_id: idMap.get("fcra_disclosures")!, state_name: "acknowledged", state_order: 2, description: "Candidate signed acknowledgement; check may proceed." },
    { data_object_id: idMap.get("fcra_disclosures")!, state_name: "refused", state_order: 3, is_terminal: true, description: "Candidate declined to sign; cannot run check." },
    { data_object_id: idMap.get("fcra_disclosures")!, state_name: "expired", state_order: 4, is_terminal: true, description: "Authorization aged out of validity window." },

    { data_object_id: idMap.get("background_check_adjudications")!, state_name: "pending", state_order: 1, is_initial: true, description: "Awaiting adjudicator review." },
    { data_object_id: idMap.get("background_check_adjudications")!, state_name: "clear", state_order: 2, is_terminal: true, requires_permission: true, description: "Decision: clear to hire." },
    { data_object_id: idMap.get("background_check_adjudications")!, state_name: "engaged", state_order: 3, requires_permission: true, description: "Decision: requires individualized assessment / candidate dialogue per EEOC." },
    { data_object_id: idMap.get("background_check_adjudications")!, state_name: "declined", state_order: 4, is_terminal: true, requires_permission: true, description: "Decision: hire declined based on results; triggers adverse action process." },

    { data_object_id: idMap.get("adverse_action_notices")!, state_name: "pre_adverse_sent", state_order: 1, is_initial: true, description: "Pre-adverse notice sent; candidate has dispute window to respond." },
    { data_object_id: idMap.get("adverse_action_notices")!, state_name: "dispute_filed", state_order: 2, description: "Candidate filed a dispute within the waiting window." },
    { data_object_id: idMap.get("adverse_action_notices")!, state_name: "waiting_period_elapsed", state_order: 3, description: "Dispute window passed without action." },
    { data_object_id: idMap.get("adverse_action_notices")!, state_name: "post_adverse_sent", state_order: 4, is_terminal: true, requires_permission: true, description: "Final adverse action notice issued; hiring decision final." },
    { data_object_id: idMap.get("adverse_action_notices")!, state_name: "rescinded", state_order: 5, is_terminal: true, description: "Adverse action process abandoned (dispute upheld, hire reinstated)." },

    { data_object_id: idMap.get("background_check_disputes")!, state_name: "filed", state_order: 1, is_initial: true, description: "Candidate filed dispute." },
    { data_object_id: idMap.get("background_check_disputes")!, state_name: "under_review", state_order: 2, description: "Provider re-investigating disputed component." },
    { data_object_id: idMap.get("background_check_disputes")!, state_name: "upheld", state_order: 3, is_terminal: true, description: "Dispute upheld; component result corrected." },
    { data_object_id: idMap.get("background_check_disputes")!, state_name: "denied", state_order: 4, is_terminal: true, description: "Dispute denied; original result stands." },
  ]);

  const backgroundChecksId = await getDataObjectId("background_checks");
  const candidatesId = await getDataObjectId("candidates");

  await upsertRelationships([
    { data_object_id: backgroundChecksId, related_data_object_id: idMap.get("background_check_components")!, relationship_verb: "contains", inverse_verb: "part_of", relationship_type: "one_to_many", relationship_kind: "composition", is_required: true, owner_side: "source" },
    { data_object_id: idMap.get("background_check_packages")!, related_data_object_id: backgroundChecksId, relationship_verb: "shapes", inverse_verb: "ordered_as", relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "source" },
    { data_object_id: candidatesId, related_data_object_id: idMap.get("fcra_disclosures")!, relationship_verb: "discloses_via", inverse_verb: "for_candidate", relationship_type: "one_to_many", relationship_kind: "composition", is_required: true, owner_side: "source" },
    { data_object_id: backgroundChecksId, related_data_object_id: idMap.get("background_check_adjudications")!, relationship_verb: "adjudicated_via", inverse_verb: "on", relationship_type: "one_to_one", relationship_kind: "reference", is_required: true, owner_side: "source" },
    { data_object_id: idMap.get("background_check_adjudications")!, related_data_object_id: idMap.get("adverse_action_notices")!, relationship_verb: "triggers", inverse_verb: "from_decision", relationship_type: "one_to_one", relationship_kind: "reference", is_required: false, owner_side: "source" },
    { data_object_id: idMap.get("background_check_components")!, related_data_object_id: idMap.get("background_check_disputes")!, relationship_verb: "disputed_via", inverse_verb: "on_component", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  ]);
}

// ============================================================
// ATS-RECRUITMENT-PIPELINE
// ============================================================

async function fixRecruitmentPipeline() {
  console.log("\n=== ATS-RECRUITMENT-PIPELINE ===");
  const moduleId = await getModuleId("ATS-RECRUITMENT-PIPELINE");

  const idMap = await upsertDataObjects([
    {
      data_object_name: "application_stages",
      singular_label: "Application Stage",
      plural_label: "Application Stages",
      description: "Configured stage in the recruiting pipeline (sourced, applied, screened, phone_screen, onsite, offer, hired). Per-requisition or per-template ordered list; defines the lifecycle of a job_application.",
    },
    {
      data_object_name: "application_stage_transitions",
      singular_label: "Application Stage Transition",
      plural_label: "Application Stage Transitions",
      description: "Audit-trail record of an application moving between stages. Carries from_stage, to_stage, actor, timestamp, reason. Source of cycle-time, time-in-stage, and conversion-rate analytics.",
    },
    {
      data_object_name: "requisition_approvals",
      singular_label: "Requisition Approval",
      plural_label: "Requisition Approvals",
      description: "Approval step in the chain that gates opening a job_requisition (hiring manager -> finance -> exec). Each step carries approver, decision, timestamp, rationale.",
    },
    {
      data_object_name: "job_posting_distributions",
      singular_label: "Job Posting Distribution",
      plural_label: "Job Posting Distributions",
      description: "Syndication of a job_posting to an external board (LinkedIn, Indeed, ZipRecruiter, Glassdoor, internal mobility portal). Carries board name, post timestamp, expiry, cost, applicant attribution.",
    },
    {
      data_object_name: "application_screening_questions",
      singular_label: "Application Screening Question",
      plural_label: "Application Screening Questions",
      description: "Custom screening question attached to a job_posting or template (knockout questions, qualifying questions). Carries question text, type (boolean/single-select/free-text), required, knockout rule.",
    },
    {
      data_object_name: "application_screening_answers",
      singular_label: "Application Screening Answer",
      plural_label: "Application Screening Answers",
      description: "Candidate-supplied answer to an application_screening_question on a specific job_application. Drives auto-disqualify on knockout rules.",
      has_personal_content: true,
    },
    {
      data_object_name: "eeo_responses",
      singular_label: "EEO Response",
      plural_label: "EEO Responses",
      description: "Voluntary self-identification submitted by an applicant for EEO-1 / OFCCP / VEVRAA reporting (gender, race/ethnicity, veteran status, disability). Required compliance artifact for US employers >100 employees; stored separately from candidates record per regulation.",
      has_personal_content: true,
    },
  ]);

  await upsertDMDO(moduleId, [
    { data_object_id: idMap.get("application_stages")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("application_stage_transitions")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("requisition_approvals")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("job_posting_distributions")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("application_screening_questions")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("application_screening_answers")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("eeo_responses")!, role: "master", necessity: "optional" },
  ]);

  await upsertLifecycleStates([
    { data_object_id: idMap.get("requisition_approvals")!, state_name: "pending", state_order: 1, is_initial: true, description: "Approval step awaiting decision." },
    { data_object_id: idMap.get("requisition_approvals")!, state_name: "approved", state_order: 2, is_terminal: true, requires_permission: true, description: "Step approved; requisition advances or opens." },
    { data_object_id: idMap.get("requisition_approvals")!, state_name: "rejected", state_order: 3, is_terminal: true, requires_permission: true, description: "Step rejected; requisition blocked." },
    { data_object_id: idMap.get("requisition_approvals")!, state_name: "withdrawn", state_order: 4, is_terminal: true, description: "Request withdrawn by submitter before decision." },

    { data_object_id: idMap.get("job_posting_distributions")!, state_name: "queued", state_order: 1, is_initial: true, description: "Distribution scheduled but not yet posted." },
    { data_object_id: idMap.get("job_posting_distributions")!, state_name: "posted", state_order: 2, description: "Live on the target board." },
    { data_object_id: idMap.get("job_posting_distributions")!, state_name: "expired", state_order: 3, is_terminal: true, description: "Posting reached its expiry date on the board." },
    { data_object_id: idMap.get("job_posting_distributions")!, state_name: "withdrawn", state_order: 4, is_terminal: true, description: "Posting actively removed before expiry." },

    { data_object_id: idMap.get("eeo_responses")!, state_name: "offered", state_order: 1, is_initial: true, description: "Candidate presented with voluntary self-ID form." },
    { data_object_id: idMap.get("eeo_responses")!, state_name: "declined", state_order: 2, is_terminal: true, description: "Candidate declined to self-identify (counted as 'not disclosed')." },
    { data_object_id: idMap.get("eeo_responses")!, state_name: "submitted", state_order: 3, is_terminal: true, description: "Candidate completed and submitted the form." },
  ]);

  const jobRequisitionsId = await getDataObjectId("job_requisitions");
  const jobPostingsId = await getDataObjectId("job_postings");
  const jobApplicationsId = await getDataObjectId("job_applications");
  const candidatesId = await getDataObjectId("candidates");

  await upsertRelationships([
    { data_object_id: jobRequisitionsId, related_data_object_id: idMap.get("application_stages")!, relationship_verb: "defines_pipeline", inverse_verb: "scoped_to", relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "source" },
    { data_object_id: jobApplicationsId, related_data_object_id: idMap.get("application_stage_transitions")!, relationship_verb: "transitions_via", inverse_verb: "on", relationship_type: "one_to_many", relationship_kind: "composition", is_required: true, owner_side: "source" },
    { data_object_id: idMap.get("application_stages")!, related_data_object_id: idMap.get("application_stage_transitions")!, relationship_verb: "lands_at", inverse_verb: "moves_to", relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "target" },
    { data_object_id: jobRequisitionsId, related_data_object_id: idMap.get("requisition_approvals")!, relationship_verb: "gated_by", inverse_verb: "approves", relationship_type: "one_to_many", relationship_kind: "composition", is_required: true, owner_side: "source" },
    { data_object_id: jobPostingsId, related_data_object_id: idMap.get("job_posting_distributions")!, relationship_verb: "syndicates_via", inverse_verb: "for", relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source" },
    { data_object_id: jobPostingsId, related_data_object_id: idMap.get("application_screening_questions")!, relationship_verb: "asks", inverse_verb: "for", relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source" },
    { data_object_id: jobApplicationsId, related_data_object_id: idMap.get("application_screening_answers")!, relationship_verb: "answers_via", inverse_verb: "on", relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source" },
    { data_object_id: idMap.get("application_screening_questions")!, related_data_object_id: idMap.get("application_screening_answers")!, relationship_verb: "answered_by", inverse_verb: "to_question", relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "source" },
    { data_object_id: candidatesId, related_data_object_id: idMap.get("eeo_responses")!, relationship_verb: "self_identifies_via", inverse_verb: "for_candidate", relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source" },
  ]);

  // Clean up scope-creep consumers
  console.log("  Removing scope-creep consumers (predictive_models, position_demand_forecasts, project_resource_allocations)...");
  const scopeCreep = [
    "predictive_models",
    "project_resource_allocations",
    "position_demand_forecasts",
  ];
  for (const name of scopeCreep) {
    const id = await semantius("GET", `/data_objects?data_object_name=eq.${name}&select=id`);
    if (id?.length) {
      await semantius("DELETE", `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=eq.${id[0].id}`);
    }
  }
}

// ============================================================
// ATS-INTERVIEWS
// ============================================================

async function fixInterviews() {
  console.log("\n=== ATS-INTERVIEWS ===");
  const moduleId = await getModuleId("ATS-INTERVIEWS");

  const idMap = await upsertDataObjects([
    {
      data_object_name: "interview_kits",
      singular_label: "Interview Kit",
      plural_label: "Interview Kits",
      description: "Reusable interview template per role / stage. Bundles assigned questions, target competencies, recommended scorecard, expected duration. Greenhouse's core authoring unit.",
    },
    {
      data_object_name: "interview_panels",
      singular_label: "Interview Panel",
      plural_label: "Interview Panels",
      description: "Composition of interviewers assigned to a specific interview, including their role on the panel (lead, technical, behavioral, debrief moderator) and weighting on the consolidated scorecard.",
    },
    {
      data_object_name: "candidate_assessment_templates",
      singular_label: "Candidate Assessment Template",
      plural_label: "Candidate Assessment Templates",
      description: "Library item for assessments (coding challenge, work sample, take-home, skills test). Carries title, vendor, time limit, scoring rubric. Materializes into candidate_assessments when assigned.",
    },
    {
      data_object_name: "interview_questions",
      singular_label: "Interview Question",
      plural_label: "Interview Questions",
      description: "Question bank entry tied to competencies. Carries question text, type (behavioral / technical / situational), competency tags, suggested follow-ups, rubric.",
    },
    {
      data_object_name: "interviewer_availability_slots",
      singular_label: "Interviewer Availability Slot",
      plural_label: "Interviewer Availability Slots",
      description: "Bookable time window an interviewer has marked available. Drives self-serve scheduling (Goodtime / Modern Hire / Calendly for Recruiting). Carries interviewer, start, end, allowed interview types.",
    },
  ]);

  await upsertDMDO(moduleId, [
    { data_object_id: idMap.get("interview_kits")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("interview_panels")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("candidate_assessment_templates")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("interview_questions")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("interviewer_availability_slots")!, role: "master", necessity: "optional" },
  ]);

  await upsertLifecycleStates([
    { data_object_id: idMap.get("interview_kits")!, state_name: "draft", state_order: 1, is_initial: true, description: "Kit being authored." },
    { data_object_id: idMap.get("interview_kits")!, state_name: "active", state_order: 2, description: "Kit in use for live interviews." },
    { data_object_id: idMap.get("interview_kits")!, state_name: "archived", state_order: 3, is_terminal: true, description: "Kit retired; no new interviews schedule against it." },

    { data_object_id: idMap.get("interview_panels")!, state_name: "forming", state_order: 1, is_initial: true, description: "Recruiter assembling the panel." },
    { data_object_id: idMap.get("interview_panels")!, state_name: "assembled", state_order: 2, description: "All panel members confirmed; interview can proceed." },
    { data_object_id: idMap.get("interview_panels")!, state_name: "completed", state_order: 3, is_terminal: true, description: "Interview held; consolidated debrief done." },
    { data_object_id: idMap.get("interview_panels")!, state_name: "cancelled", state_order: 4, is_terminal: true, description: "Panel disbanded before interview." },

    { data_object_id: idMap.get("candidate_assessment_templates")!, state_name: "draft", state_order: 1, is_initial: true, description: "Template being authored / validated." },
    { data_object_id: idMap.get("candidate_assessment_templates")!, state_name: "active", state_order: 2, description: "Template assignable to candidates." },
    { data_object_id: idMap.get("candidate_assessment_templates")!, state_name: "retired", state_order: 3, is_terminal: true, description: "Template no longer assignable." },

    { data_object_id: idMap.get("interviewer_availability_slots")!, state_name: "available", state_order: 1, is_initial: true, description: "Slot bookable." },
    { data_object_id: idMap.get("interviewer_availability_slots")!, state_name: "booked", state_order: 2, description: "Slot reserved for an interview." },
    { data_object_id: idMap.get("interviewer_availability_slots")!, state_name: "released", state_order: 3, is_terminal: true, description: "Booking cancelled; slot freed." },
    { data_object_id: idMap.get("interviewer_availability_slots")!, state_name: "past", state_order: 4, is_terminal: true, description: "Slot expired without booking." },
  ]);

  const interviewsId = await getDataObjectId("interviews");
  const candidateAssessmentsId = await getDataObjectId("candidate_assessments");
  const interviewScorecardsId = await getDataObjectId("interview_scorecards");

  await upsertRelationships([
    { data_object_id: idMap.get("interview_kits")!, related_data_object_id: interviewsId, relationship_verb: "shapes", inverse_verb: "templated_from", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
    { data_object_id: idMap.get("interview_kits")!, related_data_object_id: idMap.get("interview_questions")!, relationship_verb: "includes", inverse_verb: "in", relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
    { data_object_id: interviewsId, related_data_object_id: idMap.get("interview_panels")!, relationship_verb: "convenes", inverse_verb: "for", relationship_type: "one_to_one", relationship_kind: "composition", is_required: true, owner_side: "source" },
    { data_object_id: idMap.get("interview_panels")!, related_data_object_id: interviewScorecardsId, relationship_verb: "produces", inverse_verb: "from_panel", relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source" },
    { data_object_id: idMap.get("candidate_assessment_templates")!, related_data_object_id: candidateAssessmentsId, relationship_verb: "instantiates_as", inverse_verb: "from_template", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
    { data_object_id: idMap.get("interviewer_availability_slots")!, related_data_object_id: interviewsId, relationship_verb: "booked_for", inverse_verb: "occupies", relationship_type: "one_to_one", relationship_kind: "reference", is_required: false, owner_side: "source" },
  ]);
}

// ============================================================
// ATS-OFFERS
// ============================================================

async function fixOffers() {
  console.log("\n=== ATS-OFFERS ===");
  const moduleId = await getModuleId("ATS-OFFERS");

  const idMap = await upsertDataObjects([
    {
      data_object_name: "offer_versions",
      singular_label: "Offer Version",
      plural_label: "Offer Versions",
      description: "Versioned snapshot of a job_offer during negotiation (initial -> counter -> revised -> accepted). Each version carries the structured terms (base, bonus, equity, start_date) and the author of the change.",
      has_personal_content: true,
    },
    {
      data_object_name: "offer_approvals",
      singular_label: "Offer Approval",
      plural_label: "Offer Approvals",
      description: "Approval step in the offer-approval chain (HRBP -> Comp -> Finance -> Exec). Triggered when an offer exceeds band, includes non-standard equity, or matches other escalation rules.",
    },
    {
      data_object_name: "offer_letter_documents",
      singular_label: "Offer Letter Document",
      plural_label: "Offer Letter Documents",
      description: "Generated PDF artifact of the offer terms, distinct from the structured offer record. Versioned in lockstep with offer_versions. Carries template_id, render timestamp, e-sign envelope link.",
      has_personal_content: true,
    },
  ]);

  await upsertDMDO(moduleId, [
    { data_object_id: idMap.get("offer_versions")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("offer_approvals")!, role: "master", necessity: "required" },
    { data_object_id: idMap.get("offer_letter_documents")!, role: "master", necessity: "required" },
    // Link existing equity_grants as embedded_master (canonical lives in COMP-INCENTIVES / CAP-TABLE-GRANTS)
    { data_object_id: await getDataObjectId("equity_grants"), role: "embedded_master", necessity: "optional" },
  ]);

  await upsertLifecycleStates([
    { data_object_id: idMap.get("offer_versions")!, state_name: "draft", state_order: 1, is_initial: true, description: "Version being authored; not yet presented." },
    { data_object_id: idMap.get("offer_versions")!, state_name: "presented", state_order: 2, description: "Version sent to candidate." },
    { data_object_id: idMap.get("offer_versions")!, state_name: "countered", state_order: 3, description: "Candidate countered; this version superseded by a newer one." },
    { data_object_id: idMap.get("offer_versions")!, state_name: "accepted", state_order: 4, is_terminal: true, description: "Version accepted by candidate." },
    { data_object_id: idMap.get("offer_versions")!, state_name: "withdrawn", state_order: 5, is_terminal: true, description: "Version pulled before acceptance." },

    { data_object_id: idMap.get("offer_approvals")!, state_name: "pending", state_order: 1, is_initial: true, description: "Approval step awaiting decision." },
    { data_object_id: idMap.get("offer_approvals")!, state_name: "approved", state_order: 2, is_terminal: true, requires_permission: true, description: "Step approved; offer can advance." },
    { data_object_id: idMap.get("offer_approvals")!, state_name: "rejected", state_order: 3, is_terminal: true, requires_permission: true, description: "Step rejected; offer blocked or requires revision." },
    { data_object_id: idMap.get("offer_approvals")!, state_name: "escalated", state_order: 4, description: "Step escalated to a higher approver." },

    { data_object_id: idMap.get("offer_letter_documents")!, state_name: "drafted", state_order: 1, is_initial: true, description: "Letter rendered from template; not yet sent." },
    { data_object_id: idMap.get("offer_letter_documents")!, state_name: "sent", state_order: 2, description: "Letter delivered to candidate via e-sign provider." },
    { data_object_id: idMap.get("offer_letter_documents")!, state_name: "signed", state_order: 3, is_terminal: true, description: "Candidate signed; offer accepted." },
    { data_object_id: idMap.get("offer_letter_documents")!, state_name: "voided", state_order: 4, is_terminal: true, description: "Letter voided before signature." },
  ]);

  const jobOffersId = await getDataObjectId("job_offers");
  const equityGrantsId = await getDataObjectId("equity_grants");

  await upsertRelationships([
    { data_object_id: jobOffersId, related_data_object_id: idMap.get("offer_versions")!, relationship_verb: "evolves_through", inverse_verb: "of", relationship_type: "one_to_many", relationship_kind: "composition", is_required: true, owner_side: "source" },
    { data_object_id: jobOffersId, related_data_object_id: idMap.get("offer_approvals")!, relationship_verb: "gated_by", inverse_verb: "approves", relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source" },
    { data_object_id: idMap.get("offer_versions")!, related_data_object_id: idMap.get("offer_letter_documents")!, relationship_verb: "renders_as", inverse_verb: "for_version", relationship_type: "one_to_one", relationship_kind: "composition", is_required: true, owner_side: "source" },
    { data_object_id: idMap.get("offer_versions")!, related_data_object_id: equityGrantsId, relationship_verb: "proposes", inverse_verb: "offered_in", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  ]);
}

// ============================================================
// Main
// ============================================================

async function main() {
  const targets = process.argv.slice(2);
  const all = targets.length === 0 || targets.includes("all");

  if (all || targets.includes("candidate-crm")) await fixCandidateCRM();
  if (all || targets.includes("talent-pools")) await fixTalentPools();
  if (all || targets.includes("referrals")) await fixReferrals();
  if (all || targets.includes("background-checks")) await fixBackgroundChecks();
  if (all || targets.includes("recruitment-pipeline")) await fixRecruitmentPipeline();
  if (all || targets.includes("interviews")) await fixInterviews();
  if (all || targets.includes("offers")) await fixOffers();

  console.log("\nDone.");
}

main().catch(e => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
