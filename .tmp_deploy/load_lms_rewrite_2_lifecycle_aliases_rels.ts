/**
 * LMS rewrite loader 2/6 - Lifecycle states + aliases + intra-domain relationships.
 *
 * Phase A: data_object_lifecycle_states for new masters that have real workflow (Rule #12).
 *          Config-shape masters (no workflow) get NO rows here; surfaced in summary.
 * Phase B: data_object_aliases for non-self-explanatory masters (Rule #11 - B11 audit).
 * Phase C: data_object_relationships intra-LMS (course_versions -> courses, etc.).
 * Phase D: data_object_relationships LMS new masters -> users (Rule #10, B7 audit).
 *
 * record_status default 'new' (Rule #1).
 * Idempotent: each phase reads natural keys / unique tuples and inserts only what's missing.
 *
 * Run from project root:
 *   bun run "c:/dev/domain-map/.tmp_deploy/load_lms_rewrite_2_lifecycle_aliases_rels.ts"
 */

const LMS_DOMAIN_ID = 57;
const DO_USERS = 748;
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

function checkText(label: string, ...vals: (string | null | undefined)[]) {
  for (const v of vals) {
    if (v && FORBIDDEN.test(v)) throw new Error(`em-dash found in ${label}: ${v.slice(0, 80)}`);
  }
}

// =========================================================================
// Resolve module + data_object id maps
// =========================================================================
const MODULES = ["LMS-COURSE-DELIVERY","LMS-COMPLIANCE-TRAINING","LMS-PATHS","LMS-ILT-DELIVERY","LMS-CREDENTIALS","LMS-CT-GDPR","LMS-AUTOMATION"];
const modRows = (await get(`/domain_modules?domain_module_code=in.(${MODULES.join(",")})&select=id,domain_module_code`)) ?? [];
const M: Record<string, number> = {};
for (const r of modRows) M[String(r.domain_module_code)] = Number(r.id);
console.log("modules:", M);

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
if (Object.keys(D).length !== 58) throw new Error(`Expected 58 data_object ids, got ${Object.keys(D).length}`);
console.log(`resolved ${Object.keys(D).length} data_object ids`);

// =========================================================================
// PHASE A - data_object_lifecycle_states
// =========================================================================
console.log("\n=== PHASE A: data_object_lifecycle_states ===");

type StateSpec = {
  data_object: string;
  module: string;
  states: { name: string; order: number; initial?: boolean; terminal?: boolean; gate?: string }[];
};

const LIFECYCLE: StateSpec[] = [
  // LMS-COURSE-DELIVERY
  { data_object: "course_versions", module: "LMS-COURSE-DELIVERY", states: [
    { name: "draft", order: 1, initial: true },
    { name: "in_review", order: 2 },
    { name: "published", order: 3, gate: "publish" },
    { name: "retired", order: 4, terminal: true, gate: "retire" },
  ]},
  { data_object: "learning_content_assets", module: "LMS-COURSE-DELIVERY", states: [
    { name: "uploaded", order: 1, initial: true },
    { name: "active", order: 2 },
    { name: "deprecated", order: 3 },
    { name: "archived", order: 4, terminal: true, gate: "archive" },
  ]},
  { data_object: "scorm_packages", module: "LMS-COURSE-DELIVERY", states: [
    { name: "uploaded", order: 1, initial: true },
    { name: "validated", order: 2, gate: "validate" },
    { name: "active", order: 3 },
    { name: "deprecated", order: 4, terminal: true, gate: "deprecate" },
  ]},
  { data_object: "course_completions", module: "LMS-COURSE-DELIVERY", states: [
    { name: "recorded", order: 1, initial: true },
    { name: "validated", order: 2, gate: "validate" },
    { name: "voided", order: 3, terminal: true, gate: "void" },
  ]},
  { data_object: "course_assessments", module: "LMS-COURSE-DELIVERY", states: [
    { name: "draft", order: 1, initial: true },
    { name: "published", order: 2, gate: "publish" },
    { name: "retired", order: 3, terminal: true, gate: "retire" },
  ]},
  { data_object: "assessment_attempts", module: "LMS-COURSE-DELIVERY", states: [
    { name: "in_progress", order: 1, initial: true },
    { name: "submitted", order: 2, gate: "submit" },
    { name: "graded", order: 3, gate: "grade" },
    { name: "passed", order: 4, terminal: true },
    { name: "failed", order: 5, terminal: true },
  ]},
  { data_object: "course_discussions", module: "LMS-COURSE-DELIVERY", states: [
    { name: "open", order: 1, initial: true },
    { name: "closed", order: 2, gate: "close" },
    { name: "archived", order: 3, terminal: true, gate: "archive" },
  ]},
  { data_object: "course_reviews", module: "LMS-COURSE-DELIVERY", states: [
    { name: "submitted", order: 1, initial: true },
    { name: "published", order: 2, gate: "publish" },
    { name: "flagged", order: 3 },
    { name: "removed", order: 4, terminal: true, gate: "remove" },
  ]},
  // LMS-ILT-DELIVERY
  { data_object: "course_offerings", module: "LMS-ILT-DELIVERY", states: [
    { name: "scheduled", order: 1, initial: true },
    { name: "open_for_enrollment", order: 2, gate: "open" },
    { name: "in_progress", order: 3 },
    { name: "completed", order: 4, terminal: true, gate: "complete" },
    { name: "cancelled", order: 5, terminal: true, gate: "cancel" },
  ]},
  { data_object: "course_sessions", module: "LMS-ILT-DELIVERY", states: [
    { name: "scheduled", order: 1, initial: true },
    { name: "in_progress", order: 2 },
    { name: "completed", order: 3, terminal: true, gate: "complete" },
    { name: "cancelled", order: 4, terminal: true, gate: "cancel" },
  ]},
  { data_object: "instructors", module: "LMS-ILT-DELIVERY", states: [
    { name: "pending", order: 1, initial: true },
    { name: "active", order: 2, gate: "activate" },
    { name: "inactive", order: 3, terminal: true, gate: "deactivate" },
  ]},
  { data_object: "instructor_assignments", module: "LMS-ILT-DELIVERY", states: [
    { name: "assigned", order: 1, initial: true },
    { name: "confirmed", order: 2, gate: "confirm" },
    { name: "completed", order: 3, terminal: true },
    { name: "cancelled", order: 4, terminal: true, gate: "cancel" },
  ]},
  { data_object: "session_attendances", module: "LMS-ILT-DELIVERY", states: [
    { name: "recorded", order: 1, initial: true },
    { name: "validated", order: 2, terminal: true, gate: "validate" },
  ]},
  { data_object: "waitlist_entries", module: "LMS-ILT-DELIVERY", states: [
    { name: "waiting", order: 1, initial: true },
    { name: "promoted", order: 2, terminal: true, gate: "promote" },
    { name: "expired", order: 3, terminal: true },
    { name: "cancelled", order: 4, terminal: true },
  ]},
  { data_object: "virtual_classroom_meetings", module: "LMS-ILT-DELIVERY", states: [
    { name: "scheduled", order: 1, initial: true },
    { name: "in_progress", order: 2 },
    { name: "completed", order: 3, terminal: true },
    { name: "cancelled", order: 4, terminal: true, gate: "cancel" },
  ]},
  // LMS-CREDENTIALS
  { data_object: "certification_definitions", module: "LMS-CREDENTIALS", states: [
    { name: "draft", order: 1, initial: true },
    { name: "published", order: 2, gate: "publish" },
    { name: "retired", order: 3, terminal: true, gate: "retire" },
  ]},
  { data_object: "credential_badges", module: "LMS-CREDENTIALS", states: [
    { name: "draft", order: 1, initial: true },
    { name: "published", order: 2, gate: "publish" },
    { name: "retired", order: 3, terminal: true, gate: "retire" },
  ]},
  { data_object: "learner_badges", module: "LMS-CREDENTIALS", states: [
    { name: "earned", order: 1, initial: true, terminal: true },
    { name: "revoked", order: 2, terminal: true, gate: "revoke" },
  ]},
  { data_object: "ceu_records", module: "LMS-CREDENTIALS", states: [
    { name: "recorded", order: 1, initial: true },
    { name: "validated", order: 2, gate: "validate" },
    { name: "filed", order: 3, gate: "file" },
    { name: "voided", order: 4, terminal: true, gate: "void" },
  ]},
  { data_object: "finra_ce_records", module: "LMS-CREDENTIALS", states: [
    { name: "recorded", order: 1, initial: true },
    { name: "validated", order: 2, gate: "validate" },
    { name: "filed", order: 3, terminal: true, gate: "file" },
    { name: "voided", order: 4, terminal: true, gate: "void" },
  ]},
  // LMS-COMPLIANCE-TRAINING (new entities)
  { data_object: "compliance_training_campaigns", module: "LMS-COMPLIANCE-TRAINING", states: [
    { name: "draft", order: 1, initial: true },
    { name: "scheduled", order: 2, gate: "schedule" },
    { name: "running", order: 3 },
    { name: "completed", order: 4, terminal: true, gate: "complete" },
    { name: "cancelled", order: 5, terminal: true, gate: "cancel" },
  ]},
  { data_object: "compliance_audit_records", module: "LMS-COMPLIANCE-TRAINING", states: [
    { name: "recorded", order: 1, initial: true },
    { name: "validated", order: 2, gate: "validate" },
    { name: "submitted", order: 3, gate: "submit" },
    { name: "archived", order: 4, terminal: true, gate: "archive" },
  ]},
  { data_object: "training_evidence_records", module: "LMS-COMPLIANCE-TRAINING", states: [
    { name: "drafted", order: 1, initial: true },
    { name: "finalized", order: 2, gate: "finalize" },
    { name: "submitted", order: 3, gate: "submit" },
    { name: "archived", order: 4, terminal: true, gate: "archive" },
  ]},
  { data_object: "harassment_training_acknowledgements", module: "LMS-COMPLIANCE-TRAINING", states: [
    { name: "pending", order: 1, initial: true },
    { name: "acknowledged", order: 2, gate: "acknowledge" },
    { name: "archived", order: 3, terminal: true, gate: "archive" },
  ]},
  { data_object: "regulator_filing_exports", module: "LMS-COMPLIANCE-TRAINING", states: [
    { name: "drafted", order: 1, initial: true },
    { name: "finalized", order: 2, gate: "finalize" },
    { name: "filed", order: 3, gate: "file" },
    { name: "archived", order: 4, terminal: true, gate: "archive" },
  ]},
  // Per-regulation training records (8): all share the same 3-state shape
  ...["hipaa_training_records","osha_training_records","sox_training_evidence","ferpa_training_records","fda_part11_audit_trails","bsa_aml_training_records"].map(name => ({
    data_object: name, module: "LMS-COMPLIANCE-TRAINING",
    states: [
      { name: "recorded", order: 1, initial: true },
      { name: "validated", order: 2, gate: "validate" },
      { name: "archived", order: 3, terminal: true, gate: "archive" },
    ],
  })),
  // LMS-CT-GDPR
  { data_object: "gdpr_consent_records", module: "LMS-CT-GDPR", states: [
    { name: "granted", order: 1, initial: true },
    { name: "withdrawn", order: 2, terminal: true, gate: "withdraw" },
    { name: "expired", order: 3, terminal: true },
  ]},
  { data_object: "subject_access_requests", module: "LMS-CT-GDPR", states: [
    { name: "received", order: 1, initial: true },
    { name: "in_progress", order: 2 },
    { name: "fulfilled", order: 3, gate: "fulfill" },
    { name: "closed", order: 4, terminal: true, gate: "close" },
  ]},
  { data_object: "data_deletion_requests", module: "LMS-CT-GDPR", states: [
    { name: "received", order: 1, initial: true },
    { name: "in_progress", order: 2 },
    { name: "fulfilled", order: 3, terminal: true, gate: "fulfill" },
    { name: "declined", order: 4, terminal: true, gate: "decline" },
  ]},
  // LMS-PATHS
  { data_object: "curricula", module: "LMS-PATHS", states: [
    { name: "draft", order: 1, initial: true },
    { name: "published", order: 2, gate: "publish" },
    { name: "retired", order: 3, terminal: true, gate: "retire" },
  ]},
  { data_object: "learning_path_assignments", module: "LMS-PATHS", states: [
    { name: "assigned", order: 1, initial: true },
    { name: "in_progress", order: 2 },
    { name: "completed", order: 3, terminal: true, gate: "complete" },
    { name: "expired", order: 4, terminal: true },
  ]},
  { data_object: "learning_plans", module: "LMS-PATHS", states: [
    { name: "draft", order: 1, initial: true },
    { name: "active", order: 2, gate: "activate" },
    { name: "completed", order: 3, terminal: true, gate: "complete" },
    { name: "archived", order: 4, terminal: true, gate: "archive" },
  ]},
  // LMS-AUTOMATION
  { data_object: "automated_enrollment_rules", module: "LMS-AUTOMATION", states: [
    { name: "draft", order: 1, initial: true },
    { name: "active", order: 2, gate: "activate" },
    { name: "paused", order: 3, gate: "pause" },
    { name: "archived", order: 4, terminal: true, gate: "archive" },
  ]},
  { data_object: "learner_notifications", module: "LMS-AUTOMATION", states: [
    { name: "queued", order: 1, initial: true },
    { name: "sent", order: 2, gate: "send" },
    { name: "delivered", order: 3, terminal: true },
    { name: "failed", order: 4, terminal: true },
  ]},
  { data_object: "manager_nudges", module: "LMS-AUTOMATION", states: [
    { name: "pending", order: 1, initial: true },
    { name: "sent", order: 2, gate: "send" },
    { name: "acknowledged", order: 3, terminal: true },
    { name: "dismissed", order: 4, terminal: true },
  ]},
  { data_object: "escalation_rules", module: "LMS-AUTOMATION", states: [
    { name: "draft", order: 1, initial: true },
    { name: "active", order: 2, gate: "activate" },
    { name: "paused", order: 3, gate: "pause" },
    { name: "archived", order: 4, terminal: true, gate: "archive" },
  ]},
];

// Pre-flight checks on lifecycle text
for (const ls of LIFECYCLE) for (const s of ls.states) checkText(`lifecycle ${ls.data_object}.${s.name}`, s.name);

const allLcRows: { data_object_id: number; state_name: string; state_order: number; is_initial: boolean; is_terminal: boolean; requires_permission: boolean; permission_verb_override: string; domain_module_id: number; }[] = [];
for (const ls of LIFECYCLE) {
  const doId = D[ls.data_object];
  const modId = M[ls.module];
  if (!doId || !modId) throw new Error(`Unresolved data_object/module: ${ls.data_object} / ${ls.module}`);
  for (const s of ls.states) {
    allLcRows.push({
      data_object_id: doId,
      state_name: s.name,
      state_order: s.order,
      is_initial: !!s.initial,
      is_terminal: !!s.terminal,
      requires_permission: !!s.gate,
      permission_verb_override: s.gate || "",
      domain_module_id: modId,
    });
  }
}

const dobjLcKeys = LIFECYCLE.map(ls => D[ls.data_object]).join(",");
const existingLc = (await get(`/data_object_lifecycle_states?data_object_id=in.(${dobjLcKeys})&select=data_object_id,state_name`)) ?? [];
const existingLcKeys = new Set(existingLc.map((r: any) => `${r.data_object_id}|${r.state_name}`));
const newLcPayload = allLcRows.filter(r => !existingLcKeys.has(`${r.data_object_id}|${r.state_name}`));

console.log(`  lifecycle states to insert: ${newLcPayload.length} (skipping ${allLcRows.length - newLcPayload.length} existing)`);
if (newLcPayload.length > 0) await post("/data_object_lifecycle_states", newLcPayload);

// =========================================================================
// PHASE B - data_object_aliases
// =========================================================================
console.log("\n=== PHASE B: data_object_aliases ===");

type AliasSpec = { data_object: string; alias_name: string; alias_type: string };

const ALIASES: AliasSpec[] = [
  // course-side
  { data_object: "course_versions", alias_name: "course revision", alias_type: "synonym" },
  { data_object: "course_versions", alias_name: "training version", alias_type: "synonym" },
  { data_object: "course_modules", alias_name: "course unit", alias_type: "synonym" },
  { data_object: "course_modules", alias_name: "training module", alias_type: "synonym" },
  { data_object: "lessons", alias_name: "topic", alias_type: "synonym" },
  { data_object: "scorm_packages", alias_name: "AICC package", alias_type: "synonym" },
  { data_object: "scorm_packages", alias_name: "cmi5 package", alias_type: "synonym" },
  { data_object: "xapi_statements", alias_name: "experience API statement", alias_type: "synonym" },
  { data_object: "xapi_statements", alias_name: "learning record store entry", alias_type: "synonym" },
  { data_object: "course_completions", alias_name: "training completion", alias_type: "synonym" },
  { data_object: "course_assessments", alias_name: "course quiz", alias_type: "synonym" },
  { data_object: "course_assessments", alias_name: "course exam", alias_type: "synonym" },
  { data_object: "assessment_attempts", alias_name: "exam attempt", alias_type: "synonym" },
  { data_object: "course_catalogs", alias_name: "training catalog", alias_type: "synonym" },
  { data_object: "course_catalogs", alias_name: "learning catalog", alias_type: "synonym" },
  // ILT
  { data_object: "course_offerings", alias_name: "class instance", alias_type: "synonym" },
  { data_object: "course_offerings", alias_name: "training event", alias_type: "synonym" },
  { data_object: "course_sessions", alias_name: "class session", alias_type: "synonym" },
  { data_object: "instructors", alias_name: "facilitator", alias_type: "synonym" },
  { data_object: "instructors", alias_name: "trainer", alias_type: "synonym" },
  { data_object: "session_attendances", alias_name: "attendance roster", alias_type: "synonym" },
  { data_object: "virtual_classroom_meetings", alias_name: "VILT session", alias_type: "synonym" },
  { data_object: "virtual_classroom_meetings", alias_name: "webinar instance", alias_type: "synonym" },
  // Credentials
  { data_object: "certification_definitions", alias_name: "certification type", alias_type: "synonym" },
  { data_object: "certification_definitions", alias_name: "certification template", alias_type: "synonym" },
  { data_object: "credential_badges", alias_name: "Open Badge", alias_type: "synonym" },
  { data_object: "credential_badges", alias_name: "micro-credential", alias_type: "synonym" },
  { data_object: "learner_badges", alias_name: "earned badge", alias_type: "synonym" },
  { data_object: "ceu_records", alias_name: "CE credit ledger entry", alias_type: "synonym" },
  { data_object: "finra_ce_records", alias_name: "FINRA continuing education entry", alias_type: "synonym" },
  // Compliance
  { data_object: "compliance_training_campaigns", alias_name: "annual training cycle", alias_type: "synonym" },
  { data_object: "compliance_training_campaigns", alias_name: "training wave", alias_type: "synonym" },
  { data_object: "compliance_audit_records", alias_name: "training audit row", alias_type: "synonym" },
  { data_object: "training_evidence_records", alias_name: "compliance evidence package", alias_type: "synonym" },
  { data_object: "harassment_training_acknowledgements", alias_name: "SB-1343 acknowledgement", alias_type: "synonym" },
  { data_object: "regulator_filing_exports", alias_name: "compliance filing", alias_type: "synonym" },
  { data_object: "hipaa_training_records", alias_name: "164.530(b) workforce training record", alias_type: "synonym" },
  { data_object: "osha_training_records", alias_name: "OSHA 1910 training record", alias_type: "synonym" },
  { data_object: "bsa_aml_training_records", alias_name: "AML training record", alias_type: "synonym" },
  // GDPR
  { data_object: "gdpr_consent_records", alias_name: "consent receipt", alias_type: "synonym" },
  { data_object: "subject_access_requests", alias_name: "SAR ticket", alias_type: "synonym" },
  { data_object: "data_deletion_requests", alias_name: "right to erasure request", alias_type: "synonym" },
  // Paths
  { data_object: "curricula", alias_name: "curriculum program", alias_type: "synonym" },
  { data_object: "learning_path_assignments", alias_name: "path enrollment", alias_type: "synonym" },
  { data_object: "learning_plans", alias_name: "individual development plan", alias_type: "synonym" },
  // Automation
  { data_object: "audiences", alias_name: "learner segment", alias_type: "synonym" },
  { data_object: "audiences", alias_name: "dynamic group", alias_type: "synonym" },
  { data_object: "automated_enrollment_rules", alias_name: "auto-assign rule", alias_type: "synonym" },
  { data_object: "learner_notifications", alias_name: "reminder log", alias_type: "synonym" },
  { data_object: "manager_nudges", alias_name: "manager prompt", alias_type: "synonym" },
];

for (const a of ALIASES) checkText(`alias ${a.alias_name}`, a.alias_name);

const aliasDataIds = Array.from(new Set(ALIASES.map(a => D[a.data_object]))).join(",");
const existingAliases = (await get(`/data_object_aliases?data_object_id=in.(${aliasDataIds})&select=data_object_id,alias_name`)) ?? [];
const existingAliasKeys = new Set(existingAliases.map((r: any) => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`));
const aliasPayload = ALIASES
  .filter(a => !existingAliasKeys.has(`${D[a.data_object]}|${a.alias_name.toLowerCase()}`))
  .map(a => ({ data_object_id: D[a.data_object], alias_name: a.alias_name, alias_type: a.alias_type }));

console.log(`  aliases to insert: ${aliasPayload.length} (skipping ${ALIASES.length - aliasPayload.length} existing)`);
if (aliasPayload.length > 0) await post("/data_object_aliases", aliasPayload);

// =========================================================================
// PHASE C - intra-domain data_object_relationships (Rule #10 B6 + cross-master edges)
// =========================================================================
console.log("\n=== PHASE C: data_object_relationships (intra-LMS) ===");

type RelSpec = {
  source: number; target: number;
  relationship_verb: string; inverse_verb: string;
  relationship_type: string; relationship_kind: string;
  is_required: boolean; owner_side: string;
};

const RELS: RelSpec[] = [
  // courses -> course_versions
  { source: DO_COURSES, target: D["course_versions"], relationship_verb: "has_version", inverse_verb: "version_of", relationship_type: "one_to_many", relationship_kind: "composition", is_required: true, owner_side: "source" },
  // course_versions -> course_modules
  { source: D["course_versions"], target: D["course_modules"], relationship_verb: "contains", inverse_verb: "part_of", relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source" },
  // course_modules -> lessons
  { source: D["course_modules"], target: D["lessons"], relationship_verb: "contains", inverse_verb: "part_of", relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source" },
  // lessons -> learning_content_assets (many-to-many)
  { source: D["lessons"], target: D["learning_content_assets"], relationship_verb: "uses", inverse_verb: "used_by", relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
  // course_versions -> scorm_packages
  { source: D["course_versions"], target: D["scorm_packages"], relationship_verb: "imports", inverse_verb: "imported_by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  // course_completions -> course_versions
  { source: D["course_completions"], target: D["course_versions"], relationship_verb: "records_completion_of", inverse_verb: "completed_via", relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "target" },
  // course_enrollments -> course_completions
  { source: DO_COURSE_ENROLLMENTS, target: D["course_completions"], relationship_verb: "yields", inverse_verb: "results_from", relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source" },
  // course_assessments -> assessment_questions
  { source: D["course_assessments"], target: D["assessment_questions"], relationship_verb: "contains", inverse_verb: "part_of", relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source" },
  // course_assessments -> assessment_attempts
  { source: D["course_assessments"], target: D["assessment_attempts"], relationship_verb: "attempted_by", inverse_verb: "attempts", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  // assessment_attempts -> quiz_responses
  { source: D["assessment_attempts"], target: D["quiz_responses"], relationship_verb: "produces", inverse_verb: "captured_in", relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source" },
  // courses -> course_categories
  { source: DO_COURSES, target: D["course_categories"], relationship_verb: "classified_as", inverse_verb: "classifies", relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
  // courses -> course_tags
  { source: DO_COURSES, target: D["course_tags"], relationship_verb: "tagged_with", inverse_verb: "tags", relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
  // course_catalogs -> courses
  { source: D["course_catalogs"], target: DO_COURSES, relationship_verb: "lists", inverse_verb: "listed_in", relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
  // courses -> course_reviews
  { source: DO_COURSES, target: D["course_reviews"], relationship_verb: "reviewed_via", inverse_verb: "reviews", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  // courses -> course_ratings
  { source: DO_COURSES, target: D["course_ratings"], relationship_verb: "rated_via", inverse_verb: "rates", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  // courses -> course_discussions
  { source: DO_COURSES, target: D["course_discussions"], relationship_verb: "discussed_in", inverse_verb: "discusses", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },

  // ILT
  // courses -> course_offerings
  { source: DO_COURSES, target: D["course_offerings"], relationship_verb: "scheduled_as", inverse_verb: "schedules", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  // course_offerings -> course_sessions
  { source: D["course_offerings"], target: D["course_sessions"], relationship_verb: "comprises", inverse_verb: "part_of", relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source" },
  // course_sessions -> instructor_assignments
  { source: D["course_sessions"], target: D["instructor_assignments"], relationship_verb: "staffed_by", inverse_verb: "staffs", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  // instructors -> instructor_assignments
  { source: D["instructors"], target: D["instructor_assignments"], relationship_verb: "fulfills", inverse_verb: "fulfilled_by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  // course_sessions -> session_attendances
  { source: D["course_sessions"], target: D["session_attendances"], relationship_verb: "records", inverse_verb: "recorded_for", relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source" },
  // course_offerings -> waitlist_entries
  { source: D["course_offerings"], target: D["waitlist_entries"], relationship_verb: "queues", inverse_verb: "queued_for", relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source" },
  // course_sessions -> virtual_classroom_meetings
  { source: D["course_sessions"], target: D["virtual_classroom_meetings"], relationship_verb: "delivered_via", inverse_verb: "delivers", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  // course_sessions -> course_resources
  { source: D["course_sessions"], target: D["course_resources"], relationship_verb: "provides", inverse_verb: "provided_by", relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },

  // Credentials
  // certification_definitions -> learner_certifications
  { source: D["certification_definitions"], target: DO_LEARNER_CERTIFICATIONS, relationship_verb: "instantiated_as", inverse_verb: "defined_by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "target" },
  // certificate_templates -> learner_certifications
  { source: D["certificate_templates"], target: DO_LEARNER_CERTIFICATIONS, relationship_verb: "renders", inverse_verb: "rendered_via", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  // credential_badges -> learner_badges
  { source: D["credential_badges"], target: D["learner_badges"], relationship_verb: "awarded_as", inverse_verb: "defined_by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "target" },
  // continuing_education_credits -> ceu_records
  { source: D["continuing_education_credits"], target: D["ceu_records"], relationship_verb: "earned_in", inverse_verb: "earns", relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "target" },
  // courses -> certification_definitions (course can grant a cert)
  { source: DO_COURSES, target: D["certification_definitions"], relationship_verb: "grants", inverse_verb: "granted_by", relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
  // courses -> continuing_education_credits
  { source: DO_COURSES, target: D["continuing_education_credits"], relationship_verb: "yields_credits_via", inverse_verb: "yielded_by", relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },

  // Compliance training
  // compliance_training_campaigns -> compliance_assignments
  { source: D["compliance_training_campaigns"], target: DO_COMPLIANCE_ASSIGNMENTS, relationship_verb: "generates", inverse_verb: "spawned_by", relationship_type: "one_to_many", relationship_kind: "composition", is_required: true, owner_side: "source" },
  // compliance_assignments -> compliance_audit_records
  { source: DO_COMPLIANCE_ASSIGNMENTS, target: D["compliance_audit_records"], relationship_verb: "evidences", inverse_verb: "evidenced_by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  // compliance_audit_records -> training_evidence_records
  { source: D["compliance_audit_records"], target: D["training_evidence_records"], relationship_verb: "rolled_into", inverse_verb: "consolidates", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  // training_evidence_records -> regulator_filing_exports
  { source: D["training_evidence_records"], target: D["regulator_filing_exports"], relationship_verb: "supplies", inverse_verb: "draws_from", relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
  // compliance_assignments -> harassment_training_acknowledgements
  { source: DO_COMPLIANCE_ASSIGNMENTS, target: D["harassment_training_acknowledgements"], relationship_verb: "acknowledged_via", inverse_verb: "acknowledges", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  // recertification_schedules -> compliance_training_campaigns
  { source: D["recertification_schedules"], target: D["compliance_training_campaigns"], relationship_verb: "triggers", inverse_verb: "triggered_by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  // Per-regulation records all relate to compliance_assignments
  ...["hipaa_training_records","osha_training_records","sox_training_evidence","ferpa_training_records","fda_part11_audit_trails","bsa_aml_training_records"].map(name => ({
    source: DO_COMPLIANCE_ASSIGNMENTS, target: D[name],
    relationship_verb: "produces", inverse_verb: "produced_by",
    relationship_type: "one_to_many" as const, relationship_kind: "reference" as const,
    is_required: false, owner_side: "target",
  })),

  // GDPR
  // employees consume gdpr_consent_records is handled via existing employees edges; here we wire intra-LMS:
  // gdpr_consent_records -> subject_access_requests (one consent record may be revealed via many SARs over time)
  // Actually: SAR scope can reference multiple consent records; modeled as M:N
  { source: D["subject_access_requests"], target: D["gdpr_consent_records"], relationship_verb: "discloses", inverse_verb: "disclosed_in", relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
  // data_deletion_requests -> gdpr_consent_records (deletion request voids related consent records)
  { source: D["data_deletion_requests"], target: D["gdpr_consent_records"], relationship_verb: "voids", inverse_verb: "voided_by", relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },

  // Paths
  // learning_paths -> learning_path_steps
  { source: DO_LEARNING_PATHS, target: D["learning_path_steps"], relationship_verb: "contains", inverse_verb: "part_of", relationship_type: "one_to_many", relationship_kind: "composition", is_required: true, owner_side: "source" },
  // learning_path_steps -> courses (each step references a course)
  { source: D["learning_path_steps"], target: DO_COURSES, relationship_verb: "references", inverse_verb: "referenced_by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  // curricula -> learning_paths (curriculum groups paths)
  { source: D["curricula"], target: DO_LEARNING_PATHS, relationship_verb: "comprises", inverse_verb: "grouped_into", relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
  // learning_paths -> learning_path_assignments
  { source: DO_LEARNING_PATHS, target: D["learning_path_assignments"], relationship_verb: "assigned_via", inverse_verb: "assigns", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  // learning_plans -> learning_paths (a plan composes paths)
  { source: D["learning_plans"], target: DO_LEARNING_PATHS, relationship_verb: "composes", inverse_verb: "composed_in", relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
  // learning_path_steps -> prerequisite_rules
  { source: D["learning_path_steps"], target: D["prerequisite_rules"], relationship_verb: "gated_by", inverse_verb: "gates", relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },

  // Automation
  // audiences -> automated_enrollment_rules
  { source: D["audiences"], target: D["automated_enrollment_rules"], relationship_verb: "targeted_by", inverse_verb: "targets", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  // automated_enrollment_rules -> course_enrollments (rules drive enrollments)
  { source: D["automated_enrollment_rules"], target: DO_COURSE_ENROLLMENTS, relationship_verb: "creates", inverse_verb: "created_by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  // automated_enrollment_rules -> compliance_assignments
  { source: D["automated_enrollment_rules"], target: DO_COMPLIANCE_ASSIGNMENTS, relationship_verb: "creates", inverse_verb: "created_by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  // notification_templates -> learner_notifications
  { source: D["notification_templates"], target: D["learner_notifications"], relationship_verb: "renders", inverse_verb: "rendered_via", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  // compliance_assignments -> manager_nudges (overdue triggers nudge)
  { source: DO_COMPLIANCE_ASSIGNMENTS, target: D["manager_nudges"], relationship_verb: "escalates_via", inverse_verb: "escalates", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  // escalation_rules -> manager_nudges
  { source: D["escalation_rules"], target: D["manager_nudges"], relationship_verb: "produces", inverse_verb: "produced_by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
];

const allDoIds = Array.from(new Set(RELS.flatMap(r => [r.source, r.target]))).join(",");
const existingRels = (await get(`/data_object_relationships?or=(data_object_id.in.(${allDoIds}),related_data_object_id.in.(${allDoIds}))&select=data_object_id,related_data_object_id,relationship_verb`)) ?? [];
const existingRelKeys = new Set(existingRels.map((r: any) => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`));
const relPayload = RELS
  .filter(r => !existingRelKeys.has(`${r.source}|${r.target}|${r.relationship_verb}`))
  .map(r => ({
    data_object_id: r.source,
    related_data_object_id: r.target,
    relationship_verb: r.relationship_verb,
    inverse_verb: r.inverse_verb,
    relationship_type: r.relationship_type,
    relationship_kind: r.relationship_kind,
    is_required: r.is_required,
    owner_side: r.owner_side,
  }));

console.log(`  relationships to insert: ${relPayload.length} (skipping ${RELS.length - relPayload.length} existing)`);
if (relPayload.length > 0) await post("/data_object_relationships", relPayload);

// =========================================================================
// PHASE D - users edges (Rule #10, B7 audit)
// =========================================================================
console.log("\n=== PHASE D: users edges (Rule #10) ===");

type UserEdge = { other: number; verb: string; inverse: string; from_user: boolean; is_required: boolean; };

const USER_EDGES: UserEdge[] = [
  { other: D["instructors"], verb: "instructs_as", inverse: "instructed_by", from_user: true, is_required: false },
  { other: D["instructor_assignments"], verb: "fulfills_assignment", inverse: "fulfilled_by", from_user: true, is_required: false },
  { other: D["session_attendances"], verb: "attends", inverse: "attended_by", from_user: true, is_required: true },
  { other: D["waitlist_entries"], verb: "waitlisted_for", inverse: "lists", from_user: true, is_required: true },
  { other: D["assessment_attempts"], verb: "attempts", inverse: "attempted_by", from_user: true, is_required: true },
  { other: D["quiz_responses"], verb: "answers", inverse: "answered_by", from_user: true, is_required: false },
  { other: D["course_completions"], verb: "completes", inverse: "completed_by", from_user: true, is_required: true },
  { other: D["course_discussions"], verb: "posts_in", inverse: "posted_by", from_user: true, is_required: false },
  { other: D["course_reviews"], verb: "authors", inverse: "authored_by", from_user: true, is_required: false },
  { other: D["course_ratings"], verb: "rates_via", inverse: "rated_by", from_user: true, is_required: false },
  { other: D["learner_badges"], verb: "earns_badge", inverse: "earned_by", from_user: true, is_required: true },
  { other: D["ceu_records"], verb: "earns_credit", inverse: "credited_to", from_user: true, is_required: true },
  { other: D["finra_ce_records"], verb: "logs_ce", inverse: "logged_for", from_user: true, is_required: true },
  { other: D["harassment_training_acknowledgements"], verb: "acknowledges", inverse: "acknowledged_by", from_user: true, is_required: true },
  { other: D["hipaa_training_records"], verb: "evidenced_by_record_for", inverse: "evidences_for", from_user: true, is_required: false },
  { other: D["osha_training_records"], verb: "evidenced_by_record_for", inverse: "evidences_for", from_user: true, is_required: false },
  { other: D["sox_training_evidence"], verb: "evidenced_by_record_for", inverse: "evidences_for", from_user: true, is_required: false },
  { other: D["ferpa_training_records"], verb: "evidenced_by_record_for", inverse: "evidences_for", from_user: true, is_required: false },
  { other: D["fda_part11_audit_trails"], verb: "audit_trailed_in", inverse: "trails", from_user: true, is_required: false },
  { other: D["bsa_aml_training_records"], verb: "evidenced_by_record_for", inverse: "evidences_for", from_user: true, is_required: false },
  { other: D["gdpr_consent_records"], verb: "grants_consent_in", inverse: "consents_for", from_user: true, is_required: true },
  { other: D["subject_access_requests"], verb: "files_sar", inverse: "filed_by", from_user: true, is_required: true },
  { other: D["data_deletion_requests"], verb: "files_deletion_request", inverse: "filed_by", from_user: true, is_required: true },
  { other: D["learning_path_assignments"], verb: "assigned_path", inverse: "assigned_to", from_user: true, is_required: true },
  { other: D["learning_plans"], verb: "owns_plan", inverse: "owned_by", from_user: true, is_required: true },
  { other: D["learner_notifications"], verb: "notified_via", inverse: "notifies", from_user: true, is_required: false },
  { other: D["manager_nudges"], verb: "nudges", inverse: "nudged_by", from_user: true, is_required: false },
  { other: D["audiences"], verb: "member_of", inverse: "includes", from_user: true, is_required: false },
];

const userRelPayload = USER_EDGES.map(e => {
  const src = e.from_user ? DO_USERS : e.other;
  const tgt = e.from_user ? e.other : DO_USERS;
  return {
    data_object_id: src, related_data_object_id: tgt,
    relationship_verb: e.verb, inverse_verb: e.inverse,
    relationship_type: "one_to_many", relationship_kind: "reference",
    is_required: e.is_required, owner_side: "source",
  };
});

const userRelOtherIds = USER_EDGES.map(e => e.other).join(",");
const existingUserRels = (await get(`/data_object_relationships?and=(data_object_id.eq.${DO_USERS},related_data_object_id.in.(${userRelOtherIds}))&select=data_object_id,related_data_object_id,relationship_verb`)) ?? [];
const existingUserRelKeys = new Set(existingUserRels.map((r: any) => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`));
const userRelNewPayload = userRelPayload.filter((r: any) => !existingUserRelKeys.has(`${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`));

console.log(`  users edges to insert: ${userRelNewPayload.length} (skipping ${USER_EDGES.length - userRelNewPayload.length} existing)`);
if (userRelNewPayload.length > 0) await post("/data_object_relationships", userRelNewPayload);

// =========================================================================
// SUMMARY
// =========================================================================
console.log("\n=== SUMMARY ===");

const totalLc = (await get(`/data_object_lifecycle_states?data_object_id=in.(${ALL_NEW_DO_NAMES.map(n => D[n]).join(",")})&select=id`)).length;
const totalAliases = (await get(`/data_object_aliases?data_object_id=in.(${ALL_NEW_DO_NAMES.map(n => D[n]).join(",")})&select=id`)).length;

console.log(`  lifecycle_states on new entities: ${totalLc}`);
console.log(`  aliases on new entities: ${totalAliases}`);
console.log(`  config-shape (no lifecycle): course_modules, lessons, assessment_questions, quiz_responses, course_categories, course_tags, course_catalogs, course_resources, certificate_templates, continuing_education_credits, recertification_schedules, learning_path_steps, prerequisite_rules, audiences, notification_templates`);

console.log("\n  UI links:");
console.log("    https://adenin.semantius.app/domain_map/data_object_lifecycle_states");
console.log("    https://adenin.semantius.app/domain_map/data_object_aliases");
console.log("    https://adenin.semantius.app/domain_map/data_object_relationships");

console.log("\n=== DONE: loader 2/6 (lifecycle + aliases + relationships) ===");
console.log("Next: loader 3/6 - trigger events + handoffs (new + B9 backfill + B10b fixes)");
