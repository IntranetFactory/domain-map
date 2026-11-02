#!/usr/bin/env bun
// ATS Validate pass (2026-11-01): additive event + handoff fixes for domain 56.
// Checks: B9c (fill blank to_state), B9 rules 1/2/3 (missing events, unhanded events),
// B9b (intra-domain cross-module handoffs), H1 (APQC tags on cross-domain handoffs).
// Tables written: trigger_events (insert + fill empty to_state), handoffs (insert),
// handoff_processes (insert). Insert-only / fill-empty-only; record_status and notes omitted.
// Dry-run by default; pass --apply to write. Idempotent by natural key.
import { preflightHandoffs, preflightTriggerEvents } from "../scripts/lib/catalog_invariants.ts";

type Row = Record<string, unknown>;
const APPLY = process.argv.includes("--apply");

async function call(body: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`semantius failed: ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const get = (path: string) => call({ method: "GET", path });
function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const o: Row = {};
    for (const k of keys) o[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return o;
  });
}
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (!rows.length) return [];
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += 50) out.push(...(await call({ method: "POST", path, body: uniformize(rows.slice(i, i + 50)) })));
  return out;
}

// ---------------------------------------------------------------- constants
const ATS = 56, HCM = 54, SWP = 100, TLNT_INTEL = 170, PAYROLL = 55, CAP_TABLE = 162;
const CRM = 1, POOLS = 2, REF = 3, PIPE = 4, INT = 5, OFF = 6, PRE = 8;
const HCM_ORG_POSITIONS = 55, HCM_LIFECYCLE = 56, SWP_DEMAND = 94, TLNT_MOBILITY = 176, PAYROLL_EARNINGS = 92, CAP_GRANTS = 21;
const DO = {
  job_requisitions: 1, job_postings: 2, candidates: 3, job_applications: 4, candidate_referrals: 6, interviews: 8,
  candidate_assessments: 10, job_offers: 11, recruitment_agencies: 13, recruitment_events: 14, equity_grants: 158,
  pre_employees: 749, candidate_engagements: 866, candidate_nurture_campaigns: 867, recruiting_event_attendances: 868,
  candidate_consents: 870, talent_pool_memberships: 871, talent_segments: 872, referral_payouts: 875, referral_campaigns: 876,
  requisition_approvals: 885, job_posting_distributions: 886, eeo_responses: 889, interview_kits: 890, interview_panels: 891,
  candidate_assessment_templates: 892, interviewer_availability_slots: 894, offer_versions: 895, offer_approvals: 896,
  offer_letter_documents: 897, applicant_flow_records: 899, data_subject_requests: 901, offer_letter_templates: 1004,
  outreach_sequences: 1259,
} as const;
// APQC PCF cross-industry process ids (verified by lookup)
const PCF = { manage_requisitions: 219, recruit_source: 220, manage_new_hire: 222, manage_applicant_info: 223, referral_programs: 1011 } as const;

// ---------------------------------------------------------------- B9c: fill blank to_state on existing events
const TO_STATE_FILLS: { id: number; event_name: string; to_state: string }[] = [
  { id: 360, event_name: "job_posting.published", to_state: "published" },
  { id: 361, event_name: "job_posting.closed", to_state: "closed" },
  { id: 362, event_name: "job_application.submitted", to_state: "applied" },
  { id: 364, event_name: "job_application.rejected", to_state: "rejected" },
  { id: 366, event_name: "candidate_referral.submitted", to_state: "submitted" },
  { id: 367, event_name: "candidate_referral.bonus_earned", to_state: "bonus_payable" },
  { id: 370, event_name: "interview.scheduled", to_state: "scheduled" },
  { id: 371, event_name: "interview.completed", to_state: "completed" },
  { id: 372, event_name: "interview_scorecard.submitted", to_state: "submitted" },
  { id: 376, event_name: "recruitment_agency.engaged", to_state: "active" },
  { id: 377, event_name: "recruitment_event.held", to_state: "held" },
  { id: 1180, event_name: "candidate_assessment.passed", to_state: "completed" },
  { id: 1181, event_name: "candidate_assessment.failed", to_state: "completed" },
  { id: 1208, event_name: "job_offer.rescinded", to_state: "rescinded" },
];

// ---------------------------------------------------------------- B9 rules 1 + 3: new events
// event_category: lifecycle when the target state is terminal, state_change otherwise (field enum semantics).
type Ev = { key: string; event_name: string; data_object_id: number; domain_module_id: number; to_state: string; from_state: string; event_category: "lifecycle" | "state_change"; description: string };
const E = (event_name: string, data_object_id: number, domain_module_id: number, to_state: string, from_state: string, event_category: Ev["event_category"], description: string): Ev =>
  ({ key: event_name, event_name, data_object_id, domain_module_id, to_state, from_state, event_category, description });
const NEW_EVENTS: Ev[] = [
  // rule 3 (gated / published-verb states with no event)
  E("candidate_assessment.canceled", DO.candidate_assessments, INT, "canceled", "", "lifecycle", "An assessment invitation is withdrawn before the candidate completes it, so the application's assessment requirement must be re-issued or waived."),
  E("candidate.flagged_do_not_hire", DO.candidates, CRM, "do_not_hire", "", "lifecycle", "A gated decision flags the candidate as ineligible for future consideration; open applications are closed out and the candidate leaves talent pool nurture."),
  E("interview.canceled", DO.interviews, INT, "canceled", "", "lifecycle", "An interview is called off before it takes place; the panel and candidate are notified and booked availability slots are released."),
  E("job_application.hired", DO.job_applications, PIPE, "hired", "offer_extended", "lifecycle", "The gated hire decision on an application is confirmed after offer acceptance; the pre-employee record moves into new-hire paperwork and a linked referral becomes payable."),
  E("job_offer.approved", DO.job_offers, OFF, "approved", "pending_approval", "state_change", "The designated approver signs off on the offer terms and the offer is released for sending to the candidate."),
  E("job_requisition.canceled", DO.job_requisitions, PIPE, "canceled", "", "lifecycle", "A requisition is closed without a hire; workforce plans and position control release the demand it represented."),
  E("recruitment_agency.terminated", DO.recruitment_agencies, CRM, "terminated", "", "lifecycle", "The relationship with a recruitment agency ends and no further requisitions or candidate submissions are routed through it."),
  E("recruitment_event.closed", DO.recruitment_events, CRM, "closed", "held", "lifecycle", "Post-event follow-up for a recruiting event is complete and its cost accounting and source attribution are finalized."),
  E("recruitment_event.canceled", DO.recruitment_events, CRM, "canceled", "", "lifecycle", "A recruiting event is called off before it happens; registered attendees are notified and sunk costs are recognized."),
  E("pre_employee.canceled", DO.pre_employees, PRE, "canceled", "", "lifecycle", "The pre-employee record is canceled before activation because the offer was rescinded or the candidate withdrew, so any pending hire staged downstream must be withdrawn."),
  E("candidate_consent.withdrawn", DO.candidate_consents, CRM, "withdrawn", "granted", "lifecycle", "A candidate revokes processing consent; their data must be anonymized and they leave every talent pool and outreach audience."),
  E("referral_payout.approved", DO.referral_payouts, REF, "approved", "pending", "state_change", "The tenure condition on a referral payout is met and HR or Finance approves the bonus for payment to the referring employee."),
  E("referral_payout.clawed_back", DO.referral_payouts, REF, "clawed_back", "paid", "lifecycle", "A paid referral bonus is reversed because the referred hire left before the tenure clause expired, so the amount must be recovered from the referrer."),
  E("requisition_approval.approved", DO.requisition_approvals, PIPE, "approved", "pending", "lifecycle", "An approval step on a requisition is approved, letting the requisition advance to its next approver or open for recruiting."),
  E("requisition_approval.rejected", DO.requisition_approvals, PIPE, "rejected", "pending", "lifecycle", "An approval step on a requisition is rejected, blocking the requisition until it is revised."),
  E("interview_panel.canceled", DO.interview_panels, INT, "canceled", "", "lifecycle", "An interview panel is disbanded before its interview takes place."),
  E("offer_version.accepted", DO.offer_versions, OFF, "accepted", "", "lifecycle", "The candidate accepts a specific offer version, fixing the compensation and equity terms carried into the hire."),
  E("offer_approval.approved", DO.offer_approvals, OFF, "approved", "", "lifecycle", "An approval step on an offer is approved, letting the offer advance to its next approver or to sending."),
  E("offer_approval.rejected", DO.offer_approvals, OFF, "rejected", "", "lifecycle", "An approval step on an offer is rejected, blocking the offer until its terms are revised."),
  E("offer_letter_document.signed", DO.offer_letter_documents, OFF, "signed", "sent", "lifecycle", "The candidate signs the offer letter electronically, which records the offer as accepted."),
  E("offer_letter_template.approved", DO.offer_letter_templates, OFF, "approved", "in_review", "state_change", "Legal or compensation review approves an offer letter template, making it ready for activation."),
  E("offer_letter_template.retired", DO.offer_letter_templates, OFF, "retired", "", "lifecycle", "An offer letter template is withdrawn from use and no new offers may render against it."),
  E("applicant_flow_record.dispositioned", DO.applicant_flow_records, PIPE, "dispositioned", "", "state_change", "A recruiter codes the compliance disposition reason on an applicant, completing the applicant flow record used for adverse-impact reporting."),
  E("data_subject_request.verified", DO.data_subject_requests, CRM, "verified", "received", "state_change", "The identity of the requester behind a candidate data subject request is confirmed, which starts data collection across the hiring records."),
  E("data_subject_request.fulfilled", DO.data_subject_requests, CRM, "fulfilled", "in_progress", "lifecycle", "A candidate data subject request is fully answered within the regulatory window."),
  E("data_subject_request.partially_fulfilled", DO.data_subject_requests, CRM, "partially_fulfilled", "in_progress", "lifecycle", "A candidate data subject request is answered in part, with the rationale for the excluded data documented on the request."),
  E("data_subject_request.rejected", DO.data_subject_requests, CRM, "rejected", "", "lifecycle", "A candidate data subject request is rejected as unverifiable, unfounded, repetitive, or out of scope, with the rationale documented on the request."),
  E("outreach_sequence.activated", DO.outreach_sequences, CRM, "active", "", "state_change", "A recruiter outreach sequence goes live and begins sending its scheduled steps to enrolled candidates."),
  // rule 1 (masters with lifecycle states but no events): one key transition each
  E("candidate_engagement.responded", DO.candidate_engagements, CRM, "responded", "", "lifecycle", "A candidate replies to or engages with recruiter outreach, warming their talent pool membership for follow-up."),
  E("candidate_nurture_campaign.launched", DO.candidate_nurture_campaigns, CRM, "active", "draft", "state_change", "A candidate nurture campaign goes live and starts sending to its talent pool audience."),
  E("recruiting_event_attendance.attended", DO.recruiting_event_attendances, CRM, "attended", "", "lifecycle", "A registered candidate attends a recruiting event and becomes eligible for follow-up in the event's talent pool."),
  E("talent_pool_membership.removed", DO.talent_pool_memberships, POOLS, "removed", "", "lifecycle", "A candidate is removed from a talent pool (opt-out, archive, or do-not-contact), so pool-based outreach must stop targeting them."),
  E("talent_segment.activated", DO.talent_segments, POOLS, "active", "draft", "state_change", "A talent segment rule goes live and its membership begins to materialize for search and outreach."),
  E("referral_campaign.launched", DO.referral_campaigns, REF, "active", "draft", "state_change", "A referral campaign goes live and referrals submitted during its window qualify for the campaign reward."),
  E("job_posting_distribution.posted", DO.job_posting_distributions, PIPE, "posted", "queued", "state_change", "A job posting goes live on a target job board or sourcing channel."),
  E("eeo_response.submitted", DO.eeo_responses, PIPE, "submitted", "offered", "lifecycle", "A candidate completes and submits the voluntary self-identification form, attaching demographics to the applicant flow record."),
  E("interview_kit.activated", DO.interview_kits, INT, "active", "draft", "state_change", "An interview kit is released for use in live interviews."),
  E("candidate_assessment_template.activated", DO.candidate_assessment_templates, INT, "active", "draft", "state_change", "An assessment template becomes assignable to candidates."),
  E("interviewer_availability_slot.booked", DO.interviewer_availability_slots, INT, "booked", "available", "state_change", "An interviewer availability slot is reserved for a scheduled interview."),
];

// ---------------------------------------------------------------- B9 rule 2 / B9b: handoffs
// trigger: an existing event id (number) or a NEW_EVENTS key (string).
type Ho = { label: string; trigger: number | string; src_dom: number; src_mod: number; tgt_dom: number; tgt_mod: number; data_object_id: number; integration_pattern: string; friction_level: string; description: string; pcf?: number };
const intra = (label: string, trigger: number | string, src_mod: number, tgt_mod: number, data_object_id: number, description: string): Ho =>
  ({ label, trigger, src_dom: ATS, src_mod, tgt_dom: ATS, tgt_mod, data_object_id, integration_pattern: "lifecycle_progression", friction_level: "low", description });
const NEW_HANDOFFS: Ho[] = [
  // intra-domain cross-module (B9b)
  intra("interview.scheduled INT->PIPE", 370, INT, PIPE, DO.job_applications, "Scheduling an interview moves the application into the interviewing stage, which the interviews module realizes; hiring-manager pipeline views update."),
  intra("job_posting.closed PIPE->CRM", 361, PIPE, CRM, DO.job_postings, "Closing the posting stops candidate-relationship sourcing against it: agency submissions, outreach, and event leads no longer attach to the closed posting."),
  intra("pre_employee.activated PRE->CRM", 1183, PRE, CRM, DO.candidates, "Activation of the pre-employee record moves the linked candidate to its gated hired state, completing the candidate to pre-employee conversion."),
  intra("job_application.hired PIPE->PRE", "job_application.hired", PIPE, PRE, DO.pre_employees, "Confirming the hire on the application moves the linked pre-employee record into the new-hire paperwork stage; the hire gate is realized by the pre-employee coordinator."),
  intra("job_application.hired PIPE->REF", "job_application.hired", PIPE, REF, DO.candidate_referrals, "A confirmed hire on a referred application puts the linked candidate referral up for its gated bonus-payable decision, which starts the referral payout."),
  intra("candidate_assessment.canceled INT->PIPE", "candidate_assessment.canceled", INT, PIPE, DO.job_applications, "Canceling a required assessment releases the application's assessment gate so the recruiter can re-invite the candidate or waive the requirement."),
  intra("candidate.flagged_do_not_hire CRM->PIPE", "candidate.flagged_do_not_hire", CRM, PIPE, DO.job_applications, "A do-not-hire flag on the candidate closes out their open applications and blocks new ones from advancing."),
  intra("candidate.flagged_do_not_hire CRM->POOLS", "candidate.flagged_do_not_hire", CRM, POOLS, DO.talent_pool_memberships, "A do-not-hire flag removes the candidate from every talent pool so nurture and recruiter outreach stop."),
  intra("candidate_consent.withdrawn CRM->POOLS", "candidate_consent.withdrawn", CRM, POOLS, DO.talent_pool_memberships, "Withdrawn consent removes the candidate from all talent pools ahead of anonymization; a missed removal keeps a non-consenting candidate in pool outreach."),
  intra("data_subject_request.verified CRM->PIPE", "data_subject_request.verified", CRM, PIPE, DO.job_applications, "Identity verification on a candidate data subject request starts collection of the candidate's application, screening, and self-identification records for export or erasure."),
  intra("candidate_engagement.responded CRM->POOLS", "candidate_engagement.responded", CRM, POOLS, DO.talent_pool_memberships, "A candidate reply to outreach warms their talent pool membership so the pool owner can follow up."),
  intra("recruiting_event_attendance.attended CRM->POOLS", "recruiting_event_attendance.attended", CRM, POOLS, DO.talent_pool_memberships, "Each attended recruiting event registration adds or warms the attendee's membership in the event's talent pool."),
  intra("talent_pool_membership.removed POOLS->CRM", "talent_pool_membership.removed", POOLS, CRM, DO.candidate_nurture_campaigns, "Removing a member from a talent pool drops them from the nurture campaign audiences that target that pool."),
  // cross-domain (B9 rule 2), each tagged with its APQC process (H1)
  { label: "job_posting.closed -> TLNT-INTEL", trigger: 361, src_dom: ATS, src_mod: PIPE, tgt_dom: TLNT_INTEL, tgt_mod: TLNT_MOBILITY, data_object_id: DO.job_postings, integration_pattern: "api_call", friction_level: "medium", pcf: PCF.recruit_source,
    description: "Closing the posting tells the talent intelligence layer to retire the internal-candidate recommendations and fit scores computed against it; failure mode: employees keep receiving recommendations for a closed role." },
  { label: "job_posting.published -> TLNT-INTEL", trigger: 360, src_dom: ATS, src_mod: PIPE, tgt_dom: TLNT_INTEL, tgt_mod: TLNT_MOBILITY, data_object_id: DO.job_postings, integration_pattern: "api_call", friction_level: "medium", pcf: PCF.recruit_source,
    description: "A newly published posting is sent to the talent intelligence layer, which scores internal employees against it and surfaces mobility recommendations; failure mode: matching lags the posting when the sync runs late." },
  { label: "job_requisition.canceled -> SWP", trigger: "job_requisition.canceled", src_dom: ATS, src_mod: PIPE, tgt_dom: SWP, tgt_mod: SWP_DEMAND, data_object_id: DO.job_requisitions, integration_pattern: "event_stream", friction_level: "medium", pcf: PCF.manage_requisitions,
    description: "A requisition canceled without a hire is reported back to workforce planning so the approved demand it represented is released or re-forecast; failure mode: the plan keeps counting the canceled requisition as in-flight hiring." },
  { label: "job_requisition.canceled -> HCM", trigger: "job_requisition.canceled", src_dom: ATS, src_mod: PIPE, tgt_dom: HCM, tgt_mod: HCM_ORG_POSITIONS, data_object_id: DO.job_requisitions, integration_pattern: "event_stream", friction_level: "medium", pcf: PCF.manage_requisitions,
    description: "Canceling the requisition tells position control that the linked position no longer has an active search, so its vacancy and headcount status can be updated." },
  { label: "pre_employee.canceled -> HCM", trigger: "pre_employee.canceled", src_dom: ATS, src_mod: PRE, tgt_dom: HCM, tgt_mod: HCM_LIFECYCLE, data_object_id: DO.pre_employees, integration_pattern: "event_stream", friction_level: "high", pcf: PCF.manage_new_hire,
    description: "A pre-employee canceled before activation tells HCM to withdraw the staged pre-hire record and stop any hire workflow it started; failure mode: a no-show hire is activated in HCM and provisioned downstream." },
  { label: "referral_payout.approved -> PAYROLL", trigger: "referral_payout.approved", src_dom: ATS, src_mod: REF, tgt_dom: PAYROLL, tgt_mod: PAYROLL_EARNINGS, data_object_id: DO.referral_payouts, integration_pattern: "api_call", friction_level: "medium", pcf: PCF.referral_programs,
    description: "An approved referral payout is sent to payroll as a one-time bonus earning for the referring employee, paid off-cycle or in the next regular run." },
  { label: "referral_payout.clawed_back -> PAYROLL", trigger: "referral_payout.clawed_back", src_dom: ATS, src_mod: REF, tgt_dom: PAYROLL, tgt_mod: PAYROLL_EARNINGS, data_object_id: DO.referral_payouts, integration_pattern: "api_call", friction_level: "high", pcf: PCF.referral_programs,
    description: "A clawed-back referral payout tells payroll to recover the bonus from the referring employee through a deduction; failure mode: the recovery is missed when the clawback is handled outside the payroll calendar." },
  { label: "offer_version.accepted -> CAP-TABLE", trigger: "offer_version.accepted", src_dom: ATS, src_mod: OFF, tgt_dom: CAP_TABLE, tgt_mod: CAP_GRANTS, data_object_id: DO.equity_grants, integration_pattern: "api_call", friction_level: "high", pcf: PCF.manage_new_hire,
    description: "The accepted offer version's new-hire equity terms are sent to equity administration, which drafts the grant for board approval; failure mode: grant terms drift from the signed offer when they are re-keyed." },
];

// ---------------------------------------------------------------- H1: tag the untagged inbound handoff
const EXISTING_TAGS: { handoff_id: number; process_id: number; why: string }[] = [
  { handoff_id: 1431, process_id: PCF.manage_applicant_info, why: "HCM employee.applied_internally -> ATS materializes an internal candidate record (7.2.5 Manage applicant information)" },
];

// ---------------------------------------------------------------- text guards (Rule: no em-dash, American English)
const BE = /\b(cancell(ed|ing)|organis|analys(e|ing)\b|behaviour|colour|centre|catalogue|programme|licence|defence|optimis|recognis|labelled|modelled|categoris|normalis|materialis)/i;
function guardText(where: string, s: string) {
  if (s.includes("—")) throw new Error(`em-dash in ${where}`);
  if (BE.test(s)) throw new Error(`British spelling in ${where}: ${s.match(BE)?.[0]}`);
}
for (const e of NEW_EVENTS) { guardText(e.event_name, e.event_name); guardText(e.event_name, e.description); }
for (const h of NEW_HANDOFFS) guardText(h.label, h.description);

// ---------------------------------------------------------------- read live state
console.log(`mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
const doIds = [...new Set([...NEW_EVENTS.map((e) => e.data_object_id), 1, 2, 4, 6, 8, 9, 10, 11, 13, 14, 749])];
const states = await get(`/data_object_lifecycle_states?data_object_id=in.(${doIds})&select=id,data_object_id,state_name,requires_permission,domain_module_id`);
const existingEvents = await get(`/trigger_events?data_object_id=in.(${doIds})&select=id,event_name,data_object_id,event_category,to_state,from_state`);
const evByKey = new Map<string, any>(existingEvents.map((e: any) => [`${e.event_name}|${e.data_object_id}`, e]));
const evById = new Map<number, any>(existingEvents.map((e: any) => [e.id, e]));
const stateSet = new Map<number, Set<string>>();
for (const s of states) (stateSet.get(s.data_object_id) ?? stateSet.set(s.data_object_id, new Set()).get(s.data_object_id)!).add(s.state_name);

// sanity: every new event's to_state / from_state is a real state of its entity
for (const e of NEW_EVENTS) {
  const ss = stateSet.get(e.data_object_id) ?? new Set();
  if (!ss.has(e.to_state)) throw new Error(`${e.event_name}: to_state '${e.to_state}' is not a state of #${e.data_object_id}`);
  if (e.from_state && !ss.has(e.from_state)) throw new Error(`${e.event_name}: from_state '${e.from_state}' is not a state of #${e.data_object_id}`);
}

// ---------------------------------------------------------------- Phase A: fill blank to_state
console.log("\n== Phase A: B9c fill blank to_state");
const fills: { id: number; to_state: string; event_name: string }[] = [];
for (const f of TO_STATE_FILLS) {
  const cur = evById.get(f.id);
  if (!cur) throw new Error(`event ${f.id} not found`);
  if (cur.event_name !== f.event_name) throw new Error(`event ${f.id} is '${cur.event_name}', expected '${f.event_name}'`);
  if (!(stateSet.get(cur.data_object_id) ?? new Set()).has(f.to_state)) throw new Error(`event ${f.id}: '${f.to_state}' is not a state of #${cur.data_object_id}`);
  if (cur.to_state != null && String(cur.to_state).trim() !== "") { console.log(`  skip ${f.id} ${f.event_name}: to_state already '${cur.to_state}'`); continue; }
  fills.push(f);
  console.log(`  fill ${f.id} ${f.event_name}: to_state '' -> '${f.to_state}'`);
}

// ---------------------------------------------------------------- Phase B: new events
console.log("\n== Phase B: new trigger_events");
const newEvents = NEW_EVENTS.filter((e) => {
  const hit = evByKey.get(`${e.event_name}|${e.data_object_id}`);
  if (hit) console.log(`  exists ${hit.id} ${e.event_name}`);
  return !hit;
});
for (const e of newEvents) console.log(`  new ${e.event_name} [do ${e.data_object_id}, mod ${e.domain_module_id}] ${e.event_category} ${e.from_state || "*"} -> ${e.to_state}`);

// pre-flight B9c over every event this run touches (filled + new)
const pfEvents = [
  ...fills.map((f) => ({ id: f.id, event_name: f.event_name, data_object_id: evById.get(f.id).data_object_id, event_category: evById.get(f.id).event_category, to_state: f.to_state })),
  ...newEvents.map((e) => ({ id: e.event_name, event_name: e.event_name, data_object_id: e.data_object_id, event_category: e.event_category, to_state: e.to_state })),
];
const pfE = preflightTriggerEvents(pfEvents, states);
console.log(`  preflight trigger_events: ${pfE.errors.length} errors, ${pfE.warnings.length} warnings`);
for (const w of pfE.warnings) console.log(`    warn ${w}`);
if (pfE.errors.length) { for (const x of pfE.errors) console.error(`    ERROR ${x}`); process.exit(1); }

// ---------------------------------------------------------------- Phase C: handoffs (resolve after events exist)
async function writeEvents(): Promise<Map<string, number>> {
  const ids = new Map<string, number>();
  for (const e of NEW_EVENTS) { const hit = evByKey.get(`${e.event_name}|${e.data_object_id}`); if (hit) ids.set(e.key, hit.id); }
  if (!APPLY) { newEvents.forEach((e, i) => ids.set(e.key, -(i + 1))); return ids; }
  for (const f of fills) {
    const res = await call({ method: "PATCH", path: `/trigger_events?id=eq.${f.id}&or=(to_state.is.null,to_state.eq."")`, body: { to_state: f.to_state } });
    console.log(`  patched ${f.id} -> ${f.to_state} (${Array.isArray(res) ? res.length : "?"} row)`);
  }
  const rows = newEvents.map(({ key, ...r }) => r);
  const out = await insert("/trigger_events", rows);
  for (const r of out) ids.set(String(r.event_name), Number(r.id));
  console.log(`  inserted ${out.length} trigger_events`);
  return ids;
}
const eventIds = await writeEvents();
const evId = (t: number | string): number => {
  if (typeof t === "number") return t;
  const id = eventIds.get(t);
  if (id == null) throw new Error(`unresolved event ${t}`);
  return id;
};

console.log("\n== Phase C: handoffs");
// module FK authoring rule: both module FKs must be set (every counterparty here is modularized)
for (const h of NEW_HANDOFFS) if (!h.src_mod || !h.tgt_mod) throw new Error(`NULL module FK on ${h.label}`);
const existingEvIds = NEW_HANDOFFS.map((h) => h.trigger).filter((t): t is number => typeof t === "number");
const createdEvIds = [...eventIds.values()].filter((v) => v > 0);
const shareIds = [...new Set([...existingEvIds, ...createdEvIds])];
const existingHandoffs = shareIds.length ? await get(`/handoffs?trigger_event_id=in.(${shareIds})&select=id,trigger_event_id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,data_object_id,key`) : [];
const hKeys = new Map<string, number>(existingHandoffs.map((h: any) => [h.key ?? `${h.source_domain_id}.${h.target_domain_id}.${h.source_domain_module_id}.${h.target_domain_module_id}.${h.trigger_event_id}.${h.data_object_id}`, h.id]));
const hRows: (Row & { _label: string; _pcf?: number; _key: string })[] = [];
const hExisting: { label: string; id: number; pcf?: number }[] = [];
for (const h of NEW_HANDOFFS) {
  const te = evId(h.trigger);
  const key = `${h.src_dom}.${h.tgt_dom}.${h.src_mod}.${h.tgt_mod}.${te}.${h.data_object_id}`;
  const hit = hKeys.get(key);
  if (hit) { console.log(`  exists ${hit} ${h.label}`); hExisting.push({ label: h.label, id: hit, pcf: h.pcf }); continue; }
  hRows.push({ _label: h.label, _pcf: h.pcf, _key: key, source_domain_id: h.src_dom, target_domain_id: h.tgt_dom, source_domain_module_id: h.src_mod, target_domain_module_id: h.tgt_mod, data_object_id: h.data_object_id, trigger_event_id: te, integration_pattern: h.integration_pattern, friction_level: h.friction_level, description: h.description });
  console.log(`  new ${h.label} [${key}] ${h.integration_pattern}/${h.friction_level}${h.pcf ? ` pcf ${h.pcf}` : ""}`);
}
const pfH = preflightHandoffs(
  hRows.map((r) => ({ id: r._label, trigger_event_id: r.trigger_event_id as number, source_domain_id: r.source_domain_id as number, target_domain_id: r.target_domain_id as number, source_domain_module_id: r.source_domain_module_id as number, target_domain_module_id: r.target_domain_module_id as number, data_object_id: r.data_object_id as number })),
  existingHandoffs,
);
console.log(`  preflight handoffs: ${pfH.errors.length} errors, ${pfH.warnings.length} warnings`);
for (const w of pfH.warnings) console.log(`    warn ${w}`);
if (pfH.errors.length) { for (const x of pfH.errors) console.error(`    ERROR ${x}`); process.exit(1); }

const handoffIds = new Map<string, number>(hExisting.map((h) => [h.label, h.id]));
if (APPLY && hRows.length) {
  const out = await insert("/handoffs", hRows.map(({ _label, _pcf, _key, ...r }) => r));
  const byKey = new Map<string, number>(out.map((r: any) => [String(r.key), Number(r.id)]));
  for (const r of hRows) { const id = byKey.get(r._key); if (id == null) throw new Error(`inserted handoff for ${r._label} not returned (key ${r._key})`); handoffIds.set(r._label, id); }
  console.log(`  inserted ${out.length} handoffs`);
}

// ---------------------------------------------------------------- Phase D: handoff_processes
console.log("\n== Phase D: handoff_processes (APQC, agent_curated)");
const tagWants: { handoff_id: number; process_id: number; label: string }[] = [
  ...EXISTING_TAGS.map((t) => ({ handoff_id: t.handoff_id, process_id: t.process_id, label: t.why })),
  ...NEW_HANDOFFS.filter((h) => h.pcf).map((h) => ({ handoff_id: handoffIds.get(h.label) ?? -1, process_id: h.pcf!, label: h.label })),
];
const pcfIds = [...new Set(tagWants.map((t) => t.process_id))];
const pcfRows = await get(`/business_processes?id=in.(${pcfIds})&select=id,process_code,process_name,source_framework`);
for (const p of pcfRows) if (p.source_framework !== "apqc_pcf_cross_industry") throw new Error(`process ${p.id} is not APQC cross-industry`);
const pcfName = new Map<number, string>(pcfRows.map((p: any) => [p.id, `${p.process_code} ${p.process_name}`]));
const realHandoffIds = tagWants.map((t) => t.handoff_id).filter((x) => x > 0);
const existingTags = realHandoffIds.length ? await get(`/handoff_processes?handoff_id=in.(${realHandoffIds})&select=handoff_id,process_id`) : [];
const tagKeys = new Set(existingTags.map((t: any) => `${t.handoff_id}.${t.process_id}`));
const tagRows: Row[] = [];
for (const t of tagWants) {
  if (tagKeys.has(`${t.handoff_id}.${t.process_id}`)) { console.log(`  exists ${t.handoff_id}.${t.process_id}`); continue; }
  console.log(`  new tag handoff ${t.handoff_id > 0 ? t.handoff_id : "(new)"} ${t.label} -> ${t.process_id} ${pcfName.get(t.process_id)}`);
  tagRows.push({ handoff_id: t.handoff_id, process_id: t.process_id, role: "implements", proposal_source: "agent_curated" });
}
if (APPLY && tagRows.length) {
  const out = await insert("/handoff_processes", tagRows);
  console.log(`  inserted ${out.length} handoff_processes`);
}

// ---------------------------------------------------------------- summary
console.log(`\nsummary: fills ${fills.length}, new events ${newEvents.length}, new handoffs ${hRows.length}, new tags ${tagRows.length}${APPLY ? "" : " (dry-run, nothing written)"}`);
if (APPLY) {
  const ids = [...eventIds.entries()].filter(([, v]) => v > 0).map(([k, v]) => `${k}=${v}`);
  console.log(`event ids: ${ids.join(", ")}`);
  console.log(`handoff ids: ${[...handoffIds.entries()].map(([k, v]) => `${k}=${v}`).join(", ")}`);
}
console.log("UI: https://domain-map.semantius.cloud/domain_map/trigger_events  https://domain-map.semantius.cloud/domain_map/handoffs  https://domain-map.semantius.cloud/domain_map/handoff_processes");
