/**
 * LMS rewrite loader 3/6 - Trigger events + handoffs + B9/B9b/B10b fixes.
 *
 * Phase A: trigger_events for new LMS masters with workflow states (1 per published state).
 *          Also B9 backfill: missing events for existing LMS masters (course_enrollment.failed/.expired/.withdrawn,
 *          learning_record.voided, learner_certification.revoked/.expired/.renewed, compliance_assignment.completed/.expired/.waived,
 *          learning_path.published/.retired).
 * Phase B: intra-domain handoffs (B9b) within LMS for cross-module event flows.
 * Phase C: cross-domain handoffs from new LMS entities outbound to neighbors.
 * Phase D: B10b PATCH on inbound handoff 1106 (PA -> LMS skill_gap.identified target_domain_module_id NULL).
 *          Surface handoff 1121 for review (HRSD case_category -> LMS, likely mis-modeled DELETE candidate).
 *
 * record_status defaults to 'new' (Rule #1).
 * Idempotent on the (data_object_id, event_name) tuple for trigger_events, and on the
 * (source_domain_id, target_domain_id, data_object_id, trigger_event_id) 4-tuple for handoffs.
 *
 * Run: bun run "c:/dev/domain-map/.tmp_deploy/load_lms_rewrite_3_events_handoffs.ts"
 */

const LMS_DOMAIN_ID = 57;
const HCM_DOMAIN_ID = 54;
const GRC_DOMAIN_ID = 15;
const IGA_DOMAIN_ID = 35;
const HRSD_DOMAIN_ID = 22;
const TALENT_MGMT_DOMAIN_ID = 58;
const SKILLS_MGMT_DOMAIN_ID = 169;

const LMS_CD_MOD = 32;
const LMS_CT_MOD = 33;
const LMS_PATHS_MOD = 34;

// Will resolve dynamically: LMS-ILT-DELIVERY (178), LMS-CREDENTIALS (179), LMS-CT-GDPR (180), LMS-AUTOMATION (181)

const DO_COURSES = 167;
const DO_LEARNING_PATHS = 168;
const DO_COURSE_ENROLLMENTS = 169;
const DO_LEARNING_RECORDS = 170;
const DO_LEARNER_CERTIFICATIONS = 171;
const DO_COMPLIANCE_ASSIGNMENTS = 173;

const FORBIDDEN = /—/;

interface CmdResult { ok: boolean; data: any; status: number; stderr: string; }

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) return { ok: false, data: null, status: code, stderr: stderr.trim() || stdout.trim() };
  const text = stdout.trim();
  try { return { ok: true, data: text ? JSON.parse(text) : null, status: 0, stderr: "" }; }
  catch (e) { return { ok: false, data: text, status: code, stderr: "JSON parse failed: " + text }; }
}

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.stderr}`);
  return r.data;
}

async function post(path: string, rows: any[]): Promise<any[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: any[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const r = await postgrest("POST", path, slice);
    if (!r.ok) throw new Error(`POST ${path} failed: ${r.stderr}`);
    out.push(...(Array.isArray(r.data) ? r.data : [r.data]));
  }
  return out;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await postgrest("PATCH", path, body);
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.stderr}`);
  return r.data;
}

function checkText(label: string, ...vals: (string | null | undefined)[]) {
  for (const v of vals) if (v && FORBIDDEN.test(v)) throw new Error(`em-dash found in ${label}: ${v.slice(0, 80)}`);
}

// =========================================================================
// Resolve maps
// =========================================================================
const MODULES = ["LMS-ILT-DELIVERY","LMS-CREDENTIALS","LMS-CT-GDPR","LMS-AUTOMATION"];
const modRows = (await get(`/domain_modules?domain_module_code=in.(${MODULES.join(",")})&select=id,domain_module_code`)) ?? [];
const M: Record<string, number> = {};
for (const r of modRows) M[String(r.domain_module_code)] = Number(r.id);
const LMS_ILT_MOD = M["LMS-ILT-DELIVERY"];
const LMS_CRED_MOD = M["LMS-CREDENTIALS"];
const LMS_GDPR_MOD = M["LMS-CT-GDPR"];
const LMS_AUTO_MOD = M["LMS-AUTOMATION"];

const ALL_NEW_DO_NAMES = [
  "course_versions","course_modules","lessons","learning_content_assets","scorm_packages","xapi_statements","course_completions","course_assessments","assessment_questions","assessment_attempts","quiz_responses","course_categories","course_tags","course_catalogs","course_discussions","course_reviews","course_ratings",
  "course_offerings","course_sessions","instructors","instructor_assignments","session_attendances","waitlist_entries","virtual_classroom_meetings","course_resources",
  "certification_definitions","certificate_templates","credential_badges","learner_badges","continuing_education_credits","ceu_records","finra_ce_records",
  "compliance_training_campaigns","compliance_audit_records","training_evidence_records","harassment_training_acknowledgements","recertification_schedules","regulator_filing_exports","hipaa_training_records","osha_training_records","sox_training_evidence","ferpa_training_records","fda_part11_audit_trails","bsa_aml_training_records",
  "gdpr_consent_records","subject_access_requests","data_deletion_requests",
  "learning_path_steps","curricula","learning_path_assignments","learning_plans","prerequisite_rules",
  "audiences","automated_enrollment_rules","learner_notifications","notification_templates","manager_nudges","escalation_rules",
];
const doRows = (await get(`/data_objects?data_object_name=in.(${ALL_NEW_DO_NAMES.join(",")})&select=id,data_object_name`)) ?? [];
const D: Record<string, number> = {};
for (const r of doRows) D[String(r.data_object_name)] = Number(r.id);

// =========================================================================
// PHASE A - trigger_events for new LMS masters + B9 backfill for existing
// =========================================================================
console.log("=== PHASE A: trigger_events (new + B9 backfill) ===");

type EventSpec = { do_id: number; event_name: string; event_category: string; description: string };

const EVENTS: EventSpec[] = [
  // New masters: events on workflow state transitions
  // LMS-COURSE-DELIVERY
  { do_id: D["course_versions"], event_name: "course_version.published", event_category: "lifecycle", description: "New course version published; replaces prior version for new enrollments and notifies content-delivery + paths." },
  { do_id: D["course_versions"], event_name: "course_version.retired", event_category: "lifecycle", description: "Course version retired; active enrollments referencing it are flagged for migration." },
  { do_id: D["course_completions"], event_name: "course_completion.recorded", event_category: "lifecycle", description: "Terminal completion record posted for a learner per course version; feeds transcripts, paths, talent-mgmt skill profiles." },
  { do_id: D["course_completions"], event_name: "course_completion.voided", event_category: "state_change", description: "Completion voided by admin (e.g. integrity violation discovered post-grading); cascades to learning_records, certifications." },
  { do_id: D["course_assessments"], event_name: "course_assessment.published", event_category: "lifecycle", description: "Course assessment available for attempts; assignment rules activate." },
  { do_id: D["assessment_attempts"], event_name: "assessment_attempt.submitted", event_category: "state_change", description: "Learner submitted an attempt for grading." },
  { do_id: D["assessment_attempts"], event_name: "assessment_attempt.passed", event_category: "lifecycle", description: "Attempt graded as passing; downstream certification eligibility evaluated." },
  { do_id: D["assessment_attempts"], event_name: "assessment_attempt.failed", event_category: "lifecycle", description: "Attempt graded as failing; remediation paths and retake policies engage." },
  { do_id: D["scorm_packages"], event_name: "scorm_package.validated", event_category: "lifecycle", description: "SCORM package validated and ready for course-version binding." },

  // LMS-ILT-DELIVERY
  { do_id: D["course_offerings"], event_name: "course_offering.opened", event_category: "state_change", description: "Offering opened for enrollment; audiences and waitlist promotion engage." },
  { do_id: D["course_offerings"], event_name: "course_offering.completed", event_category: "lifecycle", description: "Offering completed; rolls up session attendances and triggers evidence packaging." },
  { do_id: D["course_offerings"], event_name: "course_offering.cancelled", event_category: "lifecycle", description: "Offering cancelled; waitlisted and enrolled learners are notified and refunded where applicable." },
  { do_id: D["course_sessions"], event_name: "course_session.completed", event_category: "lifecycle", description: "Individual session completed; attendance roster finalized." },
  { do_id: D["course_sessions"], event_name: "course_session.cancelled", event_category: "lifecycle", description: "Session cancelled; attendees re-scheduled or refunded." },
  { do_id: D["instructors"], event_name: "instructor.activated", event_category: "lifecycle", description: "Instructor available for session assignment." },
  { do_id: D["instructors"], event_name: "instructor.deactivated", event_category: "lifecycle", description: "Instructor unavailable; future assignments blocked." },
  { do_id: D["session_attendances"], event_name: "session_attendance.validated", event_category: "lifecycle", description: "Attendance validated; OSHA evidence ready for evidence package." },
  { do_id: D["waitlist_entries"], event_name: "waitlist_entry.promoted", event_category: "state_change", description: "Waitlisted learner promoted to enrolled when a seat opens." },

  // LMS-CREDENTIALS
  { do_id: D["certification_definitions"], event_name: "certification_definition.published", event_category: "lifecycle", description: "New certification definition available; assignment and award workflows engage." },
  { do_id: D["certification_definitions"], event_name: "certification_definition.retired", event_category: "lifecycle", description: "Certification definition retired; new awards blocked, existing certifications grandfathered." },
  { do_id: D["credential_badges"], event_name: "credential_badge.published", event_category: "lifecycle", description: "New badge definition published; award rules and learner display engage." },
  { do_id: D["learner_badges"], event_name: "learner_badge.earned", event_category: "lifecycle", description: "Learner earned a badge; downstream talent-mgmt and learner-profile surfaces update." },
  { do_id: D["learner_badges"], event_name: "learner_badge.revoked", event_category: "state_change", description: "Badge revoked from learner; downstream profiles update." },
  { do_id: D["ceu_records"], event_name: "ceu_record.filed", event_category: "lifecycle", description: "CE record filed with accrediting body; closes the credit-reporting cycle for the learner." },
  { do_id: D["finra_ce_records"], event_name: "finra_ce_record.filed", event_category: "lifecycle", description: "FINRA Rule 1240 CE record filed; regulator evidence retained." },

  // LMS-COMPLIANCE-TRAINING new
  { do_id: D["compliance_training_campaigns"], event_name: "compliance_training_campaign.launched", event_category: "lifecycle", description: "Campaign launched; auto-enrollment rules fire and assignment cohort populates." },
  { do_id: D["compliance_training_campaigns"], event_name: "compliance_training_campaign.completed", event_category: "lifecycle", description: "Campaign window closed; final completion rollup and evidence package generated." },
  { do_id: D["compliance_audit_records"], event_name: "compliance_audit_record.submitted", event_category: "lifecycle", description: "Audit record submitted into evidence package or regulator filing." },
  { do_id: D["training_evidence_records"], event_name: "training_evidence_record.finalized", event_category: "lifecycle", description: "Evidence package finalized; ready for regulator submission." },
  { do_id: D["training_evidence_records"], event_name: "training_evidence_record.submitted", event_category: "lifecycle", description: "Evidence package submitted to regulator." },
  { do_id: D["harassment_training_acknowledgements"], event_name: "harassment_training_acknowledgement.signed", event_category: "lifecycle", description: "Statutory acknowledgement signed; signature record captured." },
  { do_id: D["regulator_filing_exports"], event_name: "regulator_filing_export.filed", event_category: "lifecycle", description: "Regulator filing submitted; receipt captured." },

  // LMS-CT-GDPR
  { do_id: D["gdpr_consent_records"], event_name: "gdpr_consent_record.granted", event_category: "lifecycle", description: "Learner granted GDPR consent for training data processing." },
  { do_id: D["gdpr_consent_records"], event_name: "gdpr_consent_record.withdrawn", event_category: "state_change", description: "Consent withdrawn; downstream LMS modules must stop processing and queue deletion." },
  { do_id: D["subject_access_requests"], event_name: "subject_access_request.received", event_category: "lifecycle", description: "SAR received from learner; regulator deadline begins." },
  { do_id: D["subject_access_requests"], event_name: "subject_access_request.fulfilled", event_category: "lifecycle", description: "SAR fulfilled; data package delivered to subject." },
  { do_id: D["data_deletion_requests"], event_name: "data_deletion_request.received", event_category: "lifecycle", description: "Erasure request received; affected modules notified to plan deletion." },
  { do_id: D["data_deletion_requests"], event_name: "data_deletion_request.fulfilled", event_category: "lifecycle", description: "Erasure completed across LMS modules; record archived as evidence." },

  // LMS-PATHS
  { do_id: D["curricula"], event_name: "curriculum.published", event_category: "lifecycle", description: "Curriculum published; available for assignment to roles or audiences." },
  { do_id: D["learning_path_assignments"], event_name: "learning_path_assignment.completed", event_category: "lifecycle", description: "Path assignment completed by learner; rollups fire to talent-mgmt and skill-profile." },
  { do_id: D["learning_path_assignments"], event_name: "learning_path_assignment.expired", event_category: "threshold", description: "Path assignment expired without completion; remediation engages." },
  { do_id: D["learning_plans"], event_name: "learning_plan.activated", event_category: "lifecycle", description: "Learning plan activated; component path assignments materialize." },
  { do_id: D["learning_plans"], event_name: "learning_plan.completed", event_category: "lifecycle", description: "Learning plan completed; talent-mgmt profile picks up the development milestone." },

  // LMS-AUTOMATION
  { do_id: D["automated_enrollment_rules"], event_name: "automated_enrollment_rule.activated", event_category: "lifecycle", description: "Enrollment rule activated; processes the current audience and fires enrollments." },
  { do_id: D["learner_notifications"], event_name: "learner_notification.sent", event_category: "lifecycle", description: "Notification sent to learner via configured channel." },
  { do_id: D["learner_notifications"], event_name: "learner_notification.failed", event_category: "lifecycle", description: "Notification send failed; escalation rule may re-route." },
  { do_id: D["manager_nudges"], event_name: "manager_nudge.sent", event_category: "lifecycle", description: "Manager nudge sent for direct report's overdue training." },
  { do_id: D["manager_nudges"], event_name: "manager_nudge.acknowledged", event_category: "state_change", description: "Manager acknowledged the nudge." },
  { do_id: D["escalation_rules"], event_name: "escalation_rule.activated", event_category: "lifecycle", description: "Escalation rule activated; eligible overdue assignments will trigger escalations." },

  // B9 backfill - missing events for existing LMS masters
  { do_id: DO_COURSE_ENROLLMENTS, event_name: "course_enrollment.failed", event_category: "lifecycle", description: "Learner failed the enrolled course; remediation paths and retake policies engage." },
  { do_id: DO_COURSE_ENROLLMENTS, event_name: "course_enrollment.expired", event_category: "threshold", description: "Enrollment expired without completion; HRSD and HCM are nudged for action." },
  { do_id: DO_COURSE_ENROLLMENTS, event_name: "course_enrollment.withdrawn", event_category: "state_change", description: "Learner withdrew from enrollment; downstream assignment trackers update." },
  { do_id: DO_LEARNING_RECORDS, event_name: "learning_record.voided", event_category: "state_change", description: "Learning record voided after audit (e.g. integrity violation); transcript and talent-mgmt profile update." },
  { do_id: DO_LEARNER_CERTIFICATIONS, event_name: "learner_certification.renewed", event_category: "lifecycle", description: "Certification renewed by learner; new validity window starts and IGA accesses retained." },
  { do_id: DO_LEARNER_CERTIFICATIONS, event_name: "learner_certification.revoked", event_category: "lifecycle", description: "Certification revoked; IGA must reassess gated accesses, GRC obligation status updates." },
  { do_id: DO_LEARNER_CERTIFICATIONS, event_name: "learner_certification.expired", event_category: "threshold", description: "Certification expired without renewal; IGA accesses requiring it are revoked or suspended." },
  { do_id: DO_COMPLIANCE_ASSIGNMENTS, event_name: "compliance_assignment.completed", event_category: "lifecycle", description: "Learner completed mandatory compliance training; GRC obligation closes; evidence package row generated." },
  { do_id: DO_COMPLIANCE_ASSIGNMENTS, event_name: "compliance_assignment.waived", event_category: "lifecycle", description: "Compliance assignment waived through documented exception; GRC obligation closes with annotation." },
  { do_id: DO_COMPLIANCE_ASSIGNMENTS, event_name: "compliance_assignment.expired", event_category: "threshold", description: "Compliance assignment expired without completion; IGA access may be suspended; GRC obligation remains open." },
  { do_id: DO_LEARNING_PATHS, event_name: "learning_path.published", event_category: "lifecycle", description: "Learning path published; available for assignment to learners and curriculum bundling." },
  { do_id: DO_LEARNING_PATHS, event_name: "learning_path.retired", event_category: "lifecycle", description: "Learning path retired; new assignments blocked; existing assignments allowed to complete." },
];

for (const e of EVENTS) checkText(`event ${e.event_name}`, e.description);

const eventDoIds = Array.from(new Set(EVENTS.map(e => e.do_id))).join(",");
const existingEvents = (await get(`/trigger_events?data_object_id=in.(${eventDoIds})&select=id,event_name,data_object_id`)) ?? [];
const existingEventKeys = new Set(existingEvents.map((r: any) => `${r.data_object_id}|${r.event_name}`));

const newEventPayload = EVENTS
  .filter(e => !existingEventKeys.has(`${e.do_id}|${e.event_name}`))
  .map(e => ({ data_object_id: e.do_id, event_name: e.event_name, event_category: e.event_category, description: e.description }));

console.log(`  events to insert: ${newEventPayload.length} (skipping ${EVENTS.length - newEventPayload.length} existing)`);
if (newEventPayload.length > 0) await post("/trigger_events", newEventPayload);

// Rebuild event id map (covers new + existing).
const allEventRows = (await get(`/trigger_events?data_object_id=in.(${eventDoIds})&select=id,event_name,data_object_id`)) ?? [];
const E: Record<string, number> = {};
for (const r of allEventRows) E[String(r.event_name)] = Number(r.id);
console.log(`  trigger_events resolved: ${Object.keys(E).length}`);

// =========================================================================
// PHASE B - intra-domain handoffs (B9b) within LMS
// =========================================================================
console.log("\n=== PHASE B: intra-domain LMS handoffs ===");

type HandoffSpec = {
  source_domain_id: number; source_module_id: number;
  target_domain_id: number; target_module_id: number;
  data_object_id: number; trigger_event: string;
  integration_pattern: string; friction_level: string;
};

const INTRA: HandoffSpec[] = [
  // course.published -> LMS-PATHS (B9b gap from Pass 1)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_CD_MOD, target_domain_id: LMS_DOMAIN_ID, target_module_id: LMS_PATHS_MOD, data_object_id: DO_COURSES, trigger_event: "course.published", integration_pattern: "lifecycle_progression", friction_level: "low" },
  // course_version.published -> LMS-ILT-DELIVERY (offerings can reference the new version)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_CD_MOD, target_domain_id: LMS_DOMAIN_ID, target_module_id: LMS_ILT_MOD, data_object_id: D["course_versions"], trigger_event: "course_version.published", integration_pattern: "lifecycle_progression", friction_level: "low" },
  // course_version.published -> LMS-PATHS (paths consume new course versions)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_CD_MOD, target_domain_id: LMS_DOMAIN_ID, target_module_id: LMS_PATHS_MOD, data_object_id: D["course_versions"], trigger_event: "course_version.published", integration_pattern: "lifecycle_progression", friction_level: "low" },
  // course_completion.recorded -> LMS-PATHS (path step progress)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_CD_MOD, target_domain_id: LMS_DOMAIN_ID, target_module_id: LMS_PATHS_MOD, data_object_id: D["course_completions"], trigger_event: "course_completion.recorded", integration_pattern: "lifecycle_progression", friction_level: "low" },
  // course_completion.recorded -> LMS-CREDENTIALS (cert eligibility)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_CD_MOD, target_domain_id: LMS_DOMAIN_ID, target_module_id: LMS_CRED_MOD, data_object_id: D["course_completions"], trigger_event: "course_completion.recorded", integration_pattern: "lifecycle_progression", friction_level: "low" },
  // course_completion.recorded -> LMS-COMPLIANCE-TRAINING (compliance assignment closure)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_CD_MOD, target_domain_id: LMS_DOMAIN_ID, target_module_id: LMS_CT_MOD, data_object_id: D["course_completions"], trigger_event: "course_completion.recorded", integration_pattern: "lifecycle_progression", friction_level: "low" },
  // assessment_attempt.passed -> LMS-CREDENTIALS (badge / cert eligibility)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_CD_MOD, target_domain_id: LMS_DOMAIN_ID, target_module_id: LMS_CRED_MOD, data_object_id: D["assessment_attempts"], trigger_event: "assessment_attempt.passed", integration_pattern: "lifecycle_progression", friction_level: "low" },
  // course_offering.completed -> LMS-COURSE-DELIVERY (rolls up completions)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_ILT_MOD, target_domain_id: LMS_DOMAIN_ID, target_module_id: LMS_CD_MOD, data_object_id: D["course_offerings"], trigger_event: "course_offering.completed", integration_pattern: "lifecycle_progression", friction_level: "low" },
  // session_attendance.validated -> LMS-COMPLIANCE-TRAINING (OSHA evidence)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_ILT_MOD, target_domain_id: LMS_DOMAIN_ID, target_module_id: LMS_CT_MOD, data_object_id: D["session_attendances"], trigger_event: "session_attendance.validated", integration_pattern: "lifecycle_progression", friction_level: "low" },
  // certification_definition.published -> LMS-COMPLIANCE-TRAINING (compliance can use new cert)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_CRED_MOD, target_domain_id: LMS_DOMAIN_ID, target_module_id: LMS_CT_MOD, data_object_id: D["certification_definitions"], trigger_event: "certification_definition.published", integration_pattern: "lifecycle_progression", friction_level: "low" },
  // learner_badge.earned -> LMS-PATHS (path step completion via badge)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_CRED_MOD, target_domain_id: LMS_DOMAIN_ID, target_module_id: LMS_PATHS_MOD, data_object_id: D["learner_badges"], trigger_event: "learner_badge.earned", integration_pattern: "lifecycle_progression", friction_level: "low" },
  // compliance_training_campaign.launched -> LMS-AUTOMATION (audience enrollment)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_CT_MOD, target_domain_id: LMS_DOMAIN_ID, target_module_id: LMS_AUTO_MOD, data_object_id: D["compliance_training_campaigns"], trigger_event: "compliance_training_campaign.launched", integration_pattern: "lifecycle_progression", friction_level: "low" },
  // compliance_assignment.overdue -> LMS-AUTOMATION (escalation engaged)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_CT_MOD, target_domain_id: LMS_DOMAIN_ID, target_module_id: LMS_AUTO_MOD, data_object_id: DO_COMPLIANCE_ASSIGNMENTS, trigger_event: "compliance_assignment.overdue", integration_pattern: "lifecycle_progression", friction_level: "low" },
  // gdpr_consent_record.withdrawn -> LMS-CT (compliance assignments must halt)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_GDPR_MOD, target_domain_id: LMS_DOMAIN_ID, target_module_id: LMS_CT_MOD, data_object_id: D["gdpr_consent_records"], trigger_event: "gdpr_consent_record.withdrawn", integration_pattern: "lifecycle_progression", friction_level: "medium" },
  // gdpr_consent_record.withdrawn -> LMS-COURSE-DELIVERY (stop processing learner data)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_GDPR_MOD, target_domain_id: LMS_DOMAIN_ID, target_module_id: LMS_CD_MOD, data_object_id: D["gdpr_consent_records"], trigger_event: "gdpr_consent_record.withdrawn", integration_pattern: "lifecycle_progression", friction_level: "medium" },
  // data_deletion_request.fulfilled -> LMS-COURSE-DELIVERY (delete learning records)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_GDPR_MOD, target_domain_id: LMS_DOMAIN_ID, target_module_id: LMS_CD_MOD, data_object_id: D["data_deletion_requests"], trigger_event: "data_deletion_request.fulfilled", integration_pattern: "lifecycle_progression", friction_level: "medium" },
  // automated_enrollment_rule.activated -> LMS-COURSE-DELIVERY (enrollments fire)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_AUTO_MOD, target_domain_id: LMS_DOMAIN_ID, target_module_id: LMS_CD_MOD, data_object_id: D["automated_enrollment_rules"], trigger_event: "automated_enrollment_rule.activated", integration_pattern: "lifecycle_progression", friction_level: "low" },
  // automated_enrollment_rule.activated -> LMS-COMPLIANCE-TRAINING (compliance assignments fire)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_AUTO_MOD, target_domain_id: LMS_DOMAIN_ID, target_module_id: LMS_CT_MOD, data_object_id: D["automated_enrollment_rules"], trigger_event: "automated_enrollment_rule.activated", integration_pattern: "lifecycle_progression", friction_level: "low" },
];

// =========================================================================
// PHASE C - cross-domain handoffs from new entities
// =========================================================================
console.log("\n=== PHASE C: cross-domain handoffs ===");

const CROSS: HandoffSpec[] = [
  // learner_certification.revoked -> IGA (revoke gated access)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_CRED_MOD, target_domain_id: IGA_DOMAIN_ID, target_module_id: 0, data_object_id: DO_LEARNER_CERTIFICATIONS, trigger_event: "learner_certification.revoked", integration_pattern: "api_call", friction_level: "high" },
  // learner_certification.expired -> IGA (suspend access requiring cert)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_CRED_MOD, target_domain_id: IGA_DOMAIN_ID, target_module_id: 0, data_object_id: DO_LEARNER_CERTIFICATIONS, trigger_event: "learner_certification.expired", integration_pattern: "api_call", friction_level: "high" },
  // learner_certification.renewed -> IGA (re-grant)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_CRED_MOD, target_domain_id: IGA_DOMAIN_ID, target_module_id: 0, data_object_id: DO_LEARNER_CERTIFICATIONS, trigger_event: "learner_certification.renewed", integration_pattern: "api_call", friction_level: "medium" },
  // learner_badge.earned -> TALENT-MGMT (skill profile update)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_CRED_MOD, target_domain_id: TALENT_MGMT_DOMAIN_ID, target_module_id: 0, data_object_id: D["learner_badges"], trigger_event: "learner_badge.earned", integration_pattern: "event_stream", friction_level: "low" },
  // learner_badge.earned -> SKILLS-MGMT (skill_profile reflects micro-credential)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_CRED_MOD, target_domain_id: SKILLS_MGMT_DOMAIN_ID, target_module_id: 0, data_object_id: D["learner_badges"], trigger_event: "learner_badge.earned", integration_pattern: "event_stream", friction_level: "low" },
  // compliance_assignment.completed -> GRC (obligation closure)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_CT_MOD, target_domain_id: GRC_DOMAIN_ID, target_module_id: 0, data_object_id: DO_COMPLIANCE_ASSIGNMENTS, trigger_event: "compliance_assignment.completed", integration_pattern: "event_stream", friction_level: "low" },
  // compliance_assignment.expired -> IGA (revoke gated access)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_CT_MOD, target_domain_id: IGA_DOMAIN_ID, target_module_id: 0, data_object_id: DO_COMPLIANCE_ASSIGNMENTS, trigger_event: "compliance_assignment.expired", integration_pattern: "api_call", friction_level: "high" },
  // compliance_assignment.expired -> GRC (obligation breach)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_CT_MOD, target_domain_id: GRC_DOMAIN_ID, target_module_id: 0, data_object_id: DO_COMPLIANCE_ASSIGNMENTS, trigger_event: "compliance_assignment.expired", integration_pattern: "event_stream", friction_level: "high" },
  // course_completion.recorded -> HCM (learning_records canonical update path)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_CD_MOD, target_domain_id: HCM_DOMAIN_ID, target_module_id: 0, data_object_id: D["course_completions"], trigger_event: "course_completion.recorded", integration_pattern: "event_stream", friction_level: "low" },
  // training_evidence_record.submitted -> GRC (audit evidence)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_CT_MOD, target_domain_id: GRC_DOMAIN_ID, target_module_id: 0, data_object_id: D["training_evidence_records"], trigger_event: "training_evidence_record.submitted", integration_pattern: "event_stream", friction_level: "low" },
  // gdpr_consent_record.withdrawn -> HCM (worker-data processing flag)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_GDPR_MOD, target_domain_id: HCM_DOMAIN_ID, target_module_id: 0, data_object_id: D["gdpr_consent_records"], trigger_event: "gdpr_consent_record.withdrawn", integration_pattern: "event_stream", friction_level: "medium" },
  // data_deletion_request.fulfilled -> HCM (delete worker training data)
  { source_domain_id: LMS_DOMAIN_ID, source_module_id: LMS_GDPR_MOD, target_domain_id: HCM_DOMAIN_ID, target_module_id: 0, data_object_id: D["data_deletion_requests"], trigger_event: "data_deletion_request.fulfilled", integration_pattern: "api_call", friction_level: "medium" },
];

const ALL_HANDOFFS = [...INTRA, ...CROSS];

// Resolve trigger_event_id for each handoff via E map.
const handoffPayload: any[] = [];
for (const h of ALL_HANDOFFS) {
  const teId = E[h.trigger_event];
  if (!teId) {
    console.log(`  WARNING: no trigger_event found for "${h.trigger_event}", skipping handoff`);
    continue;
  }
  handoffPayload.push({
    source_domain_id: h.source_domain_id,
    source_domain_module_id: h.source_module_id,
    target_domain_id: h.target_domain_id,
    target_domain_module_id: h.target_module_id || null,
    data_object_id: h.data_object_id,
    trigger_event_id: teId,
    integration_pattern: h.integration_pattern,
    friction_level: h.friction_level,
  });
}

// Idempotency: 4-tuple (source_domain, target_domain, data_object, trigger_event_id).
const sourceIds = Array.from(new Set(handoffPayload.map(h => h.source_domain_id))).join(",");
const existingHandoffs = (await get(`/handoffs?source_domain_id=in.(${sourceIds})&select=source_domain_id,target_domain_id,data_object_id,trigger_event_id`)) ?? [];
const existingHandoffKeys = new Set(existingHandoffs.map((r: any) => `${r.source_domain_id}|${r.target_domain_id}|${r.data_object_id}|${r.trigger_event_id}`));
const newHandoffPayload = handoffPayload.filter(h => !existingHandoffKeys.has(`${h.source_domain_id}|${h.target_domain_id}|${h.data_object_id}|${h.trigger_event_id}`));

console.log(`  handoffs total: intra=${INTRA.length} cross=${CROSS.length}`);
console.log(`  handoffs to insert: ${newHandoffPayload.length} (skipping ${handoffPayload.length - newHandoffPayload.length} existing)`);
if (newHandoffPayload.length > 0) await post("/handoffs", newHandoffPayload);

// =========================================================================
// PHASE D - B10b PATCH on inbound (1106), report 1121 for decision
// =========================================================================
console.log("\n=== PHASE D: B10b fixes ===");

// handoff 1106: PA (63) -> LMS on skill_gap.identified, target_domain_module_id NULL.
// Per audit: should target LMS-PATHS (34) since paths consume skill-gap signals; but LMS has no DMDO row on workforce_segments (44).
// We can either: (a) add the DMDO row + PATCH target, or (b) PATCH target only assuming the dependency is "external read from PA dashboard".
// Pragmatic choice: PATCH target_domain_module_id = LMS_PATHS_MOD; consumer DMDO can be added later as a separate decision.
const handoff1106 = (await get(`/handoffs?id=eq.1106&select=id,target_domain_module_id`))?.[0];
if (handoff1106 && handoff1106.target_domain_module_id === null) {
  console.log(`  PATCHing handoff 1106 target_domain_module_id = LMS-PATHS (${LMS_PATHS_MOD})`);
  await patch(`/handoffs?id=eq.1106`, { target_domain_module_id: LMS_PATHS_MOD });
} else if (handoff1106) {
  console.log(`  handoff 1106 target_domain_module_id already set (${handoff1106.target_domain_module_id}), skipping`);
} else {
  console.log(`  handoff 1106 not found (may have been deleted)`);
}

// handoff 1121: HRSD case_category.updated -> LMS. LMS has no DMDO on case_categories.
// Per audit: likely mis-modeled; HRSD case categories don't have a natural LMS consumer.
// Surface for user decision, do not auto-DELETE.
const handoff1121 = (await get(`/handoffs?id=eq.1121&select=id,trigger_event_id,data_object_id,target_domain_module_id`))?.[0];
if (handoff1121) {
  console.log(`  REVIEW NEEDED: handoff 1121 (HRSD case_category -> LMS) - LMS has no DMDO on case_categories (id=${handoff1121.data_object_id}).`);
  console.log(`    Decision: DELETE this row, or load a DMDO consumer row for case_categories on LMS-COMPLIANCE-TRAINING?`);
  console.log(`    No auto-action taken; user decides.`);
}

// =========================================================================
// SUMMARY
// =========================================================================
console.log("\n=== SUMMARY ===");

const eventCount = (await get(`/trigger_events?data_object_id=in.(${eventDoIds})&select=id`)).length;
const outboundCount = (await get(`/handoffs?source_domain_id=eq.${LMS_DOMAIN_ID}&select=id`)).length;
const inboundCount = (await get(`/handoffs?target_domain_id=eq.${LMS_DOMAIN_ID}&select=id`)).length;

console.log(`  trigger_events on LMS data_objects: ${eventCount}`);
console.log(`  outbound handoffs (source=LMS): ${outboundCount}`);
console.log(`  inbound handoffs (target=LMS): ${inboundCount}`);

console.log("\n  UI links:");
console.log("    https://adenin.semantius.app/domain_map/trigger_events");
console.log("    https://adenin.semantius.app/domain_map/handoffs");

console.log("\n=== DONE: loader 3/6 (trigger events + handoffs) ===");
console.log("Next: loader 4/6 - tools + skills + skill_tools for 4 new system skills");
