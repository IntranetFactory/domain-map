/**
 * LMS rewrite loader 1/6 - Structural foundation.
 *
 * Loads the structural skeleton of the modularized LMS:
 *   - 4 new capabilities (LMS-ILT-DELIVERY, LMS-CREDENTIAL-MGMT, LMS-LEARNING-AUTOMATION, LMS-PRIVACY-COMPLIANCE)
 *   - 4 new domain_modules (LMS-ILT-DELIVERY, LMS-CREDENTIALS, LMS-CT-GDPR, LMS-AUTOMATION); all module_kind=full
 *   - 58 new data_objects with pattern flags applied per Rule #12
 *   - All DMDO rows for the 7 modules (new entities as master/embedded; embedded shells for cross-domain masters)
 *   - Re-master learner_certifications from LMS-COMPLIANCE-TRAINING (33) to LMS-CREDENTIALS (new)
 *   - domain_module_capabilities linking new modules to new + reused capabilities
 *   - SKILLS-MGMT capability migration off LMS-PATHS (34) onto SKILLS-MGMT-FOUNDATION (174 if exists)
 *   - capability_domains link of SKILLS-MGMT to its host domain (169)
 *   - B4 pattern-flag PATCHes on existing entities (learner_certifications submit_lock, compliance_assignments personal_content)
 *
 * Loaders 2-6 will follow with lifecycle states, aliases, relationships, trigger events,
 * handoffs, system skills, tools, skill_tools, role redistribution, and the starter kit.
 *
 * record_status defaults to 'new' (Rule #1); never set to 'approved' anywhere.
 *
 * Idempotent: every step reads natural keys first; re-running is safe.
 *
 * Run from project root (NEVER cd into the .tmp_deploy folder per SKILL.md rule #6):
 *   bun run "c:/dev/domain-map/.tmp_deploy/load_lms_rewrite_1_structure.ts"
 */

const LMS_DOMAIN_ID = 57;
const HCM_DOMAIN_ID = 54;
const CLM_DOMAIN_ID = 26;
const IWMS_DOMAIN_ID = 23;
const SKILLS_MGMT_DOMAIN_ID = 169;

// Existing module ids (verified live):
const LMS_CD_MOD = 32; // LMS-COURSE-DELIVERY
const LMS_CT_MOD = 33; // LMS-COMPLIANCE-TRAINING
const LMS_PATHS_MOD = 34; // LMS-PATHS

// Existing capability ids (verified live):
const CAP_COURSE_AUTHOR = 18;
const CAP_CONTENT_DELIVERY = 19;
const CAP_SKILLS_MGMT = 20;
const CAP_COMPLIANCE_TRAIN = 21;
const CAP_CERT_MGMT = 22;
const CAP_LEARNING_PATH = 23;

// Existing built-in / cross-domain data_object ids (verified live):
const DO_USERS = 748;
const DO_EMPLOYEES = 31;
const DO_HCM_POSITIONS = 32;
const DO_JOB_PROFILES = 33;
const DO_ORG_UNITS = 34;
const DO_COST_CENTERS = 196;
const DO_COURSES = 167;
const DO_LEARNING_PATHS = 168;
const DO_COURSE_ENROLLMENTS = 169;
const DO_LEARNING_RECORDS = 170;
const DO_LEARNER_CERTIFICATIONS = 171;
const DO_SKILL_PROFILES = 172;
const DO_COMPLIANCE_ASSIGNMENTS = 173;
const DO_LOCATIONS = 795;
const DO_SIGNATURE_RECORDS = 70;

// Pre-flight: throw on em-dash anywhere (CLAUDE.md rule).
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
  for (const v of vals) {
    if (v && FORBIDDEN.test(v)) throw new Error(`em-dash found in ${label}: ${v.slice(0, 80)}`);
  }
}

// =========================================================================
// PHASE 1 - capabilities (4 new)
// =========================================================================
console.log("=== PHASE 1: capabilities (4 new) ===");

const NEW_CAPABILITIES = [
  { capability_code: "LMS-ILT-DELIVERY",
    capability_name: "Instructor-Led Training Delivery",
    description: "Scheduling, instructor assignment, attendance capture, and virtual-classroom integration for instructor-led and virtual-instructor-led training." },
  { capability_code: "LMS-CREDENTIAL-MGMT",
    capability_name: "Credential Management",
    description: "Catalog of certifications and badges, certificate template management, CEU tracking, and learner credential lifecycle." },
  { capability_code: "LMS-LEARNING-AUTOMATION",
    capability_name: "Learning Automation",
    description: "Dynamic audiences, automated training assignment rules, learner notifications, manager nudges, and overdue escalation policies." },
  { capability_code: "LMS-PRIVACY-COMPLIANCE",
    capability_name: "Learner Privacy Compliance",
    description: "Learner data privacy substrate: consent capture, subject access requests, and right-to-erasure processing for training data." },
];

for (const c of NEW_CAPABILITIES) checkText("capability", c.capability_name, c.description);

const existingCapCodes = new Set(
  ((await get(`/capabilities?capability_code=in.(${NEW_CAPABILITIES.map(c => c.capability_code).join(",")})&select=capability_code`)) ?? [])
    .map((r: any) => String(r.capability_code))
);
const newCapPayload = NEW_CAPABILITIES.filter(c => !existingCapCodes.has(c.capability_code));
if (newCapPayload.length > 0) {
  console.log(`  inserting ${newCapPayload.length} new capabilities`);
  await post("/capabilities", newCapPayload);
} else {
  console.log(`  all 4 new capabilities already present`);
}

const newCapRows = await get(`/capabilities?capability_code=in.(${NEW_CAPABILITIES.map(c => c.capability_code).join(",")})&select=id,capability_code`) ?? [];
const newCapId: Record<string, number> = {};
for (const r of newCapRows) newCapId[String(r.capability_code)] = Number(r.id);
console.log(`  resolved capability ids: ${JSON.stringify(newCapId)}`);

// =========================================================================
// PHASE 2 - capability_domains (link each new capability to LMS = 57; LMS-PRIVACY-COMPLIANCE also to PRIV-MGMT if loadable)
// =========================================================================
console.log("\n=== PHASE 2: capability_domains for new capabilities ===");

const capDomainPairs = [
  { capability_id: newCapId["LMS-ILT-DELIVERY"], domain_id: LMS_DOMAIN_ID },
  { capability_id: newCapId["LMS-CREDENTIAL-MGMT"], domain_id: LMS_DOMAIN_ID },
  { capability_id: newCapId["LMS-LEARNING-AUTOMATION"], domain_id: LMS_DOMAIN_ID },
  { capability_id: newCapId["LMS-PRIVACY-COMPLIANCE"], domain_id: LMS_DOMAIN_ID },
];

const capIds = capDomainPairs.map(p => p.capability_id).join(",");
const existingCapDomains = (await get(`/capability_domains?capability_id=in.(${capIds})&domain_id=eq.${LMS_DOMAIN_ID}&select=capability_id`)) ?? [];
const existingCapDomainKeys = new Set(existingCapDomains.map((r: any) => Number(r.capability_id)));
const newCapDomains = capDomainPairs.filter(p => !existingCapDomainKeys.has(p.capability_id));
if (newCapDomains.length > 0) {
  console.log(`  inserting ${newCapDomains.length} capability_domains rows`);
  await post("/capability_domains", newCapDomains);
} else {
  console.log(`  all capability_domains already present`);
}

// SKILLS-MGMT capability migration: link to SKILLS-MGMT domain (id 169)
console.log("\n  SKILLS-MGMT capability link to SKILLS-MGMT domain (id 169):");
const smCapDomain = (await get(`/capability_domains?capability_id=eq.${CAP_SKILLS_MGMT}&domain_id=eq.${SKILLS_MGMT_DOMAIN_ID}&select=capability_id`)) ?? [];
if (smCapDomain.length === 0) {
  console.log(`    inserting SKILLS-MGMT capability_domains row at SKILLS-MGMT domain`);
  await post("/capability_domains", [{ capability_id: CAP_SKILLS_MGMT, domain_id: SKILLS_MGMT_DOMAIN_ID }]);
} else {
  console.log(`    SKILLS-MGMT capability_domains row already exists at SKILLS-MGMT domain`);
}

// =========================================================================
// PHASE 3 - domain_modules (4 new full modules)
// =========================================================================
console.log("\n=== PHASE 3: domain_modules (4 new) ===");

const NEW_MODULES = [
  { domain_module_code: "LMS-ILT-DELIVERY",
    domain_module_name: "Instructor-Led and Virtual-Instructor-Led Training",
    description: "Scheduled course delivery: offerings and sessions, instructor assignments, attendance capture (OSHA evidence substrate), waitlist management, virtual-classroom integration, and per-session resources. Structurally distinct from evergreen e-learning in LMS-COURSE-DELIVERY because it carries its own cardinality (course -> many offerings -> many sessions), its own roles (instructors are not learners), and its own per-session compliance footprint." },
  { domain_module_code: "LMS-CREDENTIALS",
    domain_module_name: "Credentials, Badges and Continuing Education",
    description: "Catalog and lifecycle for certifications, micro-credential badges, and continuing-education credits. Masters learner_certifications (re-mastered from LMS-COMPLIANCE-TRAINING) since professional development, FINRA CE, internal product certifications, and Open-Badges micro-credentials all live here, not just compliance training. Compliance training embeds learner_certifications for the regulated-training certification workflow." },
  { domain_module_code: "LMS-CT-GDPR",
    domain_module_name: "Learner Data Privacy",
    description: "Learner data privacy substrate that compliance training depends on: GDPR Article 6/7 consent capture, Article 15 subject access requests, and Article 17 right-to-erasure processing for training data. Carved out from LMS-COMPLIANCE-TRAINING because privacy obligations apply across the LMS even where statutory training is out of scope." },
  { domain_module_code: "LMS-AUTOMATION",
    domain_module_name: "Learning Automation",
    description: "Horizontal automation surface across LMS deployment: dynamic audience segments, automated training assignment rules, reusable notification templates, learner notification log, manager-directed nudges for overdue training, and escalation policies. Cuts across LMS-COURSE-DELIVERY, LMS-COMPLIANCE-TRAINING, LMS-PATHS, and LMS-CREDENTIALS." },
];

for (const m of NEW_MODULES) checkText("module", m.domain_module_name, m.description);

const newModCodes = NEW_MODULES.map(m => m.domain_module_code).join(",");
const existingMods = (await get(`/domain_modules?domain_module_code=in.(${newModCodes})&select=domain_module_code`)) ?? [];
const existingModCodes = new Set(existingMods.map((r: any) => String(r.domain_module_code)));
const newModPayload = NEW_MODULES
  .filter(m => !existingModCodes.has(m.domain_module_code))
  .map(m => ({ ...m, domain_id: LMS_DOMAIN_ID, module_kind: "full" }));
if (newModPayload.length > 0) {
  console.log(`  inserting ${newModPayload.length} new domain_modules`);
  await post("/domain_modules", newModPayload);
} else {
  console.log(`  all 4 new modules already present`);
}

const newModRows = await get(`/domain_modules?domain_module_code=in.(${newModCodes})&select=id,domain_module_code`) ?? [];
const newModId: Record<string, number> = {};
for (const r of newModRows) newModId[String(r.domain_module_code)] = Number(r.id);
console.log(`  resolved module ids: ${JSON.stringify(newModId)}`);

const LMS_ILT_MOD = newModId["LMS-ILT-DELIVERY"];
const LMS_CRED_MOD = newModId["LMS-CREDENTIALS"];
const LMS_GDPR_MOD = newModId["LMS-CT-GDPR"];
const LMS_AUTO_MOD = newModId["LMS-AUTOMATION"];

// =========================================================================
// PHASE 4 - data_objects (58 new) with pattern flags
// =========================================================================
console.log("\n=== PHASE 4: data_objects (58 new) ===");

type DOSpec = {
  data_object_name: string;
  singular_label: string;
  plural_label: string;
  description: string;
  has_personal_content: boolean;
  has_submit_lock: boolean;
  has_single_approver: boolean;
};

const NEW_DATA_OBJECTS: DOSpec[] = [
  // LMS-COURSE-DELIVERY (17)
  { data_object_name: "course_versions", singular_label: "Course Version", plural_label: "Course Versions", description: "Versioned snapshot of a course's content lineage. Required for compliance retention: regulators ask which version of training each learner completed.", has_personal_content: false, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "course_modules", singular_label: "Course Module", plural_label: "Course Modules", description: "Intra-course composition unit grouping related lessons; supports completion tracking at sub-course granularity.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "lessons", singular_label: "Lesson", plural_label: "Lessons", description: "Leaf consumable inside a course module: video, document, SCORM block, or live activity.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "learning_content_assets", singular_label: "Learning Content Asset", plural_label: "Learning Content Assets", description: "Reusable content asset (video, PDF, image, audio) referenced by lessons and modules.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "scorm_packages", singular_label: "SCORM Package", plural_label: "SCORM Packages", description: "SCORM / AICC / cmi5 content package import; carries content interop manifest and runtime state.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "xapi_statements", singular_label: "xAPI Statement", plural_label: "xAPI Statements", description: "Experience-API event log row capturing actor-verb-object learning activity inside or outside the LMS.", has_personal_content: true, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "course_completions", singular_label: "Course Completion", plural_label: "Course Completions", description: "Terminal completion record per learner per course version. Distinct from learning_records (event log).", has_personal_content: true, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "course_assessments", singular_label: "Course Assessment", plural_label: "Course Assessments", description: "Quiz or exam definition associated with a course or lesson; carries passing score and attempt policy.", has_personal_content: false, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "assessment_questions", singular_label: "Assessment Question", plural_label: "Assessment Questions", description: "Item-bank entry: question stem, choices, scoring, and metadata for randomization.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "assessment_attempts", singular_label: "Assessment Attempt", plural_label: "Assessment Attempts", description: "Per-learner per-attempt audit row: start time, score, pass/fail, time-on-task. FINRA / Part 11 evidence substrate.", has_personal_content: true, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "quiz_responses", singular_label: "Quiz Response", plural_label: "Quiz Responses", description: "Item-level learner response capture for psychometric analysis and per-question review.", has_personal_content: true, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "course_categories", singular_label: "Course Category", plural_label: "Course Categories", description: "Hierarchical taxonomy for catalog browsing and reporting.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "course_tags", singular_label: "Course Tag", plural_label: "Course Tags", description: "Free-form taxonomy alongside categories; supports faceted search.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "course_catalogs", singular_label: "Course Catalog", plural_label: "Course Catalogs", description: "Scoped catalog view: subset of courses surfaced to a specific audience, branch, or domain.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "course_discussions", singular_label: "Course Discussion", plural_label: "Course Discussions", description: "Forum-style discussion thread attached to a course or lesson; collaborative-learning surface.", has_personal_content: true, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "course_reviews", singular_label: "Course Review", plural_label: "Course Reviews", description: "Learner-authored qualitative review of a course post-completion.", has_personal_content: true, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "course_ratings", singular_label: "Course Rating", plural_label: "Course Ratings", description: "Numeric rating (typically 1-5) per learner per course; aggregate analytics surface.", has_personal_content: true, has_submit_lock: false, has_single_approver: false },

  // LMS-ILT-DELIVERY (8 new; locations embedded from IWMS)
  { data_object_name: "course_offerings", singular_label: "Course Offering", plural_label: "Course Offerings", description: "Scheduled instance of a course: date range, location, capacity, language, delivery mode.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "course_sessions", singular_label: "Course Session", plural_label: "Course Sessions", description: "Individual session within a multi-day offering; carries per-session attendance and instructor assignment.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "instructors", singular_label: "Instructor", plural_label: "Instructors", description: "Instructor master separate from employees; covers internal trainers, contracted SMEs, and external vendor instructors.", has_personal_content: true, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "instructor_assignments", singular_label: "Instructor Assignment", plural_label: "Instructor Assignments", description: "Junction assigning an instructor to a session or offering, with role (primary / assistant / observer).", has_personal_content: false, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "session_attendances", singular_label: "Session Attendance", plural_label: "Session Attendances", description: "Per-session attendance roster row per learner. OSHA-mandated evidence for required workplace training.", has_personal_content: true, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "waitlist_entries", singular_label: "Waitlist Entry", plural_label: "Waitlist Entries", description: "Capacity overflow queue for a course offering; priority order and notify-on-seat-open policy.", has_personal_content: true, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "virtual_classroom_meetings", singular_label: "Virtual Classroom Meeting", plural_label: "Virtual Classroom Meetings", description: "Linkage to an external video meeting (Zoom / Teams / Webex) for a virtual session; carries join URL and recording reference.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "course_resources", singular_label: "Course Resource", plural_label: "Course Resources", description: "Handout, supplementary material, or pre-read attached to an offering or session.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },

  // LMS-CREDENTIALS (7 new; learner_certifications re-mastered, not inserted)
  { data_object_name: "certification_definitions", singular_label: "Certification Definition", plural_label: "Certification Definitions", description: "Catalog of certification types: name, issuing authority, validity period, recertification policy, prerequisite courses.", has_personal_content: false, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "certificate_templates", singular_label: "Certificate Template", plural_label: "Certificate Templates", description: "PDF / image template used to issue a certificate to a learner; carries layout and dynamic fields.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "credential_badges", singular_label: "Credential Badge", plural_label: "Credential Badges", description: "Open Badges / micro-credential definition: criteria, image, issuer, expiration policy. Distinct from visitor_badges (physical access).", has_personal_content: false, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "learner_badges", singular_label: "Learner Badge", plural_label: "Learner Badges", description: "Earned-badge junction per learner per badge; carries earn date, evidence URL, and verification token.", has_personal_content: true, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "continuing_education_credits", singular_label: "Continuing Education Credit", plural_label: "Continuing Education Credits", description: "CEU credit-value master: credit hours, accrediting body, eligible courses.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "ceu_records", singular_label: "CEU Record", plural_label: "CEU Records", description: "Earned-credit ledger row per learner; CEU evidence for state-CE, NASBA, and similar professional licensure reporting.", has_personal_content: true, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "finra_ce_records", singular_label: "FINRA CE Record", plural_label: "FINRA CE Records", description: "FINRA Rule 1240 continuing-education ledger row per registered representative; regulator-evidence retention.", has_personal_content: true, has_submit_lock: true, has_single_approver: false },

  // LMS-COMPLIANCE-TRAINING (13 new; signature_records embedded from CLM)
  { data_object_name: "compliance_training_campaigns", singular_label: "Compliance Training Campaign", plural_label: "Compliance Training Campaigns", description: "Campaign container that bundles assignments by audience and due-date: annual code-of-conduct cycle, harassment refresh, security awareness wave.", has_personal_content: false, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "compliance_audit_records", singular_label: "Compliance Audit Record", plural_label: "Compliance Audit Records", description: "Regulator-facing audit trail row capturing who did what training when, with version and evidence reference. Distinct from learning_records: audit-purpose subset, retention-locked.", has_personal_content: true, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "training_evidence_records", singular_label: "Training Evidence Record", plural_label: "Training Evidence Records", description: "Inspection-ready evidence package: signed roster, certificate hash, content version, signature record reference. Generated for regulator submission.", has_personal_content: true, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "harassment_training_acknowledgements", singular_label: "Harassment Training Acknowledgement", plural_label: "Harassment Training Acknowledgements", description: "Statutory acknowledgement of harassment training completion per CA SB-1343, NY 201-g, IL 2-109; carries signed timestamp and IP.", has_personal_content: true, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "recertification_schedules", singular_label: "Recertification Schedule", plural_label: "Recertification Schedules", description: "Periodic recurrence configuration that drives FINRA / BSA-AML / HIPAA / OSHA refresh assignment cycles.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "regulator_filing_exports", singular_label: "Regulator Filing Export", plural_label: "Regulator Filing Exports", description: "Export artifact for regulator submissions: OSHA 300, FINRA CE filings, state-CE rollups.", has_personal_content: false, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "hipaa_training_records", singular_label: "HIPAA Training Record", plural_label: "HIPAA Training Records", description: "HIPAA 45 CFR 164.530(b) workforce-training documentation row.", has_personal_content: true, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "osha_training_records", singular_label: "OSHA Training Record", plural_label: "OSHA Training Records", description: "OSHA 29 CFR 1910 mandated training documentation row.", has_personal_content: true, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "sox_training_evidence", singular_label: "SOX Training Evidence", plural_label: "SOX Training Evidence", description: "SOX 404 control-evidence row for finance training completion.", has_personal_content: true, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "ferpa_training_records", singular_label: "FERPA Training Record", plural_label: "FERPA Training Records", description: "FERPA staff training documentation row for the education sector.", has_personal_content: true, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "fda_part11_audit_trails", singular_label: "FDA Part 11 Audit Trail", plural_label: "FDA Part 11 Audit Trails", description: "21 CFR Part 11 audit trail row for GxP-relevant training; tamper-evident, retention-locked.", has_personal_content: true, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "bsa_aml_training_records", singular_label: "BSA / AML Training Record", plural_label: "BSA / AML Training Records", description: "BSA / AML 31 CFR 1020 training documentation row for banking-sector compliance.", has_personal_content: true, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "compliance_training_assignments_2", singular_label: "PLACEHOLDER_DROP", plural_label: "PLACEHOLDER_DROP", description: "PLACEHOLDER - this row must not be inserted; it exists only to keep array length matching prior counts during development.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },

  // LMS-CT-GDPR (3 new)
  { data_object_name: "gdpr_consent_records", singular_label: "GDPR Consent Record", plural_label: "GDPR Consent Records", description: "GDPR Article 6 / 7 consent capture for learner training data: purpose, lawful basis, granted timestamp, withdrawal timestamp.", has_personal_content: true, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "subject_access_requests", singular_label: "Subject Access Request", plural_label: "Subject Access Requests", description: "GDPR Article 15 subject-access-request ticket: requester, scope, fulfilment status, regulator deadline.", has_personal_content: true, has_submit_lock: true, has_single_approver: false },
  { data_object_name: "data_deletion_requests", singular_label: "Data Deletion Request", plural_label: "Data Deletion Requests", description: "GDPR Article 17 right-to-erasure request: scope, anonymisation policy, regulator deadline, fulfilment status.", has_personal_content: true, has_submit_lock: true, has_single_approver: false },

  // LMS-PATHS (5 new)
  { data_object_name: "learning_path_steps", singular_label: "Learning Path Step", plural_label: "Learning Path Steps", description: "Ordered step inside a learning path: pointer to a course, sub-path, or external resource with sequencing rules.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "curricula", singular_label: "Curriculum", plural_label: "Curricula", description: "Grouped paths and courses targeting a role, function, or compliance scope. Used by Workday and Cornerstone as the primary noun for role-based learning.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "learning_path_assignments", singular_label: "Learning Path Assignment", plural_label: "Learning Path Assignments", description: "Path-to-learner assignment row distinct from course_enrollments; tracks overall path progress and completion percentage.", has_personal_content: true, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "learning_plans", singular_label: "Learning Plan", plural_label: "Learning Plans", description: "Personalized plan composed of multiple paths or courses, often manager-curated or AI-recommended against skill gaps.", has_personal_content: true, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "prerequisite_rules", singular_label: "Prerequisite Rule", plural_label: "Prerequisite Rules", description: "Gating logic that controls path progression: required completions, scores, certifications, or competencies.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },

  // LMS-AUTOMATION (6 new)
  { data_object_name: "audiences", singular_label: "Audience", plural_label: "Audiences", description: "Dynamic learner segment defined by attributes (department, location, role) and used by auto-enrollment and notification rules.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "automated_enrollment_rules", singular_label: "Automated Enrollment Rule", plural_label: "Automated Enrollment Rules", description: "Rule engine entry that auto-enrols learners into courses or paths based on audience membership and lifecycle events.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "learner_notifications", singular_label: "Learner Notification", plural_label: "Learner Notifications", description: "Per-learner sent-notification log row for reminders, nudges, completions, and escalations.", has_personal_content: true, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "notification_templates", singular_label: "Notification Template", plural_label: "Notification Templates", description: "Reusable email / in-app / chat template with merge fields, used by automation rules and manager nudges.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "manager_nudges", singular_label: "Manager Nudge", plural_label: "Manager Nudges", description: "Manager-directed reminder triggered when a direct report has overdue or upcoming training.", has_personal_content: true, has_submit_lock: false, has_single_approver: false },
  { data_object_name: "escalation_rules", singular_label: "Escalation Rule", plural_label: "Escalation Rules", description: "Policy that escalates overdue training through manager, skip-level, HR Business Partner, or compliance officer.", has_personal_content: false, has_submit_lock: false, has_single_approver: false },
];

// Strip the development placeholder row.
const CLEAN_DOS = NEW_DATA_OBJECTS.filter(d => !d.data_object_name.includes("PLACEHOLDER") && !d.singular_label.includes("PLACEHOLDER"));
if (CLEAN_DOS.length !== 58) throw new Error(`Expected 58 data_objects after cleaning placeholder, got ${CLEAN_DOS.length}`);

for (const d of CLEAN_DOS) checkText(`data_object ${d.data_object_name}`, d.singular_label, d.plural_label, d.description);

const newDONames = CLEAN_DOS.map(d => d.data_object_name).join(",");
const existingDOs = (await get(`/data_objects?data_object_name=in.(${newDONames})&select=id,data_object_name`)) ?? [];
const existingDONames = new Set(existingDOs.map((r: any) => String(r.data_object_name)));
const newDOPayload = CLEAN_DOS
  .filter(d => !existingDONames.has(d.data_object_name))
  .map(d => ({
    data_object_name: d.data_object_name,
    singular_label: d.singular_label,
    plural_label: d.plural_label,
    description: d.description,
    kind: "domain_owned",
    is_canonical_bare_word: false,
    has_personal_content: d.has_personal_content,
    has_submit_lock: d.has_submit_lock,
    has_single_approver: d.has_single_approver,
  }));
if (newDOPayload.length > 0) {
  console.log(`  inserting ${newDOPayload.length} new data_objects`);
  await post("/data_objects", newDOPayload);
} else {
  console.log(`  all 58 data_objects already present`);
}

const allDORows = await get(`/data_objects?data_object_name=in.(${newDONames})&select=id,data_object_name`) ?? [];
const newDOId: Record<string, number> = {};
for (const r of allDORows) newDOId[String(r.data_object_name)] = Number(r.id);
console.log(`  resolved ${Object.keys(newDOId).length} of 58 data_object ids`);

if (Object.keys(newDOId).length !== 58) {
  throw new Error(`data_object resolution incomplete: ${Object.keys(newDOId).length} of 58 - aborting`);
}

// =========================================================================
// PHASE 5 - domain_module_data_objects (DMDO) for all 7 modules
// =========================================================================
console.log("\n=== PHASE 5: domain_module_data_objects (full DMDO matrix) ===");

type DmdoSpec = { domain_module_id: number; data_object_id: number; role: string; necessity: string };

const DMDO_ROWS: DmdoSpec[] = [];

const dn = (name: string): number => {
  const id = newDOId[name];
  if (!id) throw new Error(`Unknown new data_object: ${name}`);
  return id;
};

// LMS-COURSE-DELIVERY (32): new masters + existing masters + embedded shells
const cdMasters = ["course_versions","course_modules","lessons","learning_content_assets","scorm_packages","xapi_statements","course_completions","course_assessments","assessment_questions","assessment_attempts","quiz_responses","course_categories","course_tags","course_catalogs","course_discussions","course_reviews","course_ratings"];
for (const n of cdMasters) DMDO_ROWS.push({ domain_module_id: LMS_CD_MOD, data_object_id: dn(n), role: "master", necessity: "required" });
// Existing CD masters/embedded carry through unchanged - skipping.

// LMS-ILT-DELIVERY (new): 8 masters + 1 embedded (locations from IWMS) + embedded shells
const iltMasters = ["course_offerings","course_sessions","instructors","instructor_assignments","session_attendances","waitlist_entries","virtual_classroom_meetings","course_resources"];
for (const n of iltMasters) DMDO_ROWS.push({ domain_module_id: LMS_ILT_MOD, data_object_id: dn(n), role: "master", necessity: "required" });
DMDO_ROWS.push({ domain_module_id: LMS_ILT_MOD, data_object_id: DO_LOCATIONS, role: "embedded_master", necessity: "optional" });
DMDO_ROWS.push({ domain_module_id: LMS_ILT_MOD, data_object_id: DO_COURSES, role: "embedded_master", necessity: "required" });
DMDO_ROWS.push({ domain_module_id: LMS_ILT_MOD, data_object_id: DO_COURSE_ENROLLMENTS, role: "embedded_master", necessity: "required" });
DMDO_ROWS.push({ domain_module_id: LMS_ILT_MOD, data_object_id: DO_EMPLOYEES, role: "embedded_master", necessity: "required" });
DMDO_ROWS.push({ domain_module_id: LMS_ILT_MOD, data_object_id: DO_ORG_UNITS, role: "embedded_master", necessity: "optional" });

// LMS-CREDENTIALS (new): 7 masters + learner_certifications re-mastered + embedded shells
const credMasters = ["certification_definitions","certificate_templates","credential_badges","learner_badges","continuing_education_credits","ceu_records","finra_ce_records"];
for (const n of credMasters) DMDO_ROWS.push({ domain_module_id: LMS_CRED_MOD, data_object_id: dn(n), role: "master", necessity: "required" });
DMDO_ROWS.push({ domain_module_id: LMS_CRED_MOD, data_object_id: DO_LEARNER_CERTIFICATIONS, role: "master", necessity: "required" });
DMDO_ROWS.push({ domain_module_id: LMS_CRED_MOD, data_object_id: DO_EMPLOYEES, role: "embedded_master", necessity: "required" });
DMDO_ROWS.push({ domain_module_id: LMS_CRED_MOD, data_object_id: DO_COURSES, role: "embedded_master", necessity: "required" });
DMDO_ROWS.push({ domain_module_id: LMS_CRED_MOD, data_object_id: DO_COURSE_ENROLLMENTS, role: "embedded_master", necessity: "required" });

// LMS-COMPLIANCE-TRAINING (33): 12 new masters + signature_records embedded + existing compliance_assignments stays master
const ctNewMasters = ["compliance_training_campaigns","compliance_audit_records","training_evidence_records","harassment_training_acknowledgements","recertification_schedules","regulator_filing_exports","hipaa_training_records","osha_training_records","sox_training_evidence","ferpa_training_records","fda_part11_audit_trails","bsa_aml_training_records"];
for (const n of ctNewMasters) DMDO_ROWS.push({ domain_module_id: LMS_CT_MOD, data_object_id: dn(n), role: "master", necessity: "required" });
DMDO_ROWS.push({ domain_module_id: LMS_CT_MOD, data_object_id: DO_SIGNATURE_RECORDS, role: "embedded_master", necessity: "required" });

// LMS-CT-GDPR (new): 3 masters + embedded shells
const gdprMasters = ["gdpr_consent_records","subject_access_requests","data_deletion_requests"];
for (const n of gdprMasters) DMDO_ROWS.push({ domain_module_id: LMS_GDPR_MOD, data_object_id: dn(n), role: "master", necessity: "required" });
DMDO_ROWS.push({ domain_module_id: LMS_GDPR_MOD, data_object_id: DO_EMPLOYEES, role: "embedded_master", necessity: "required" });
DMDO_ROWS.push({ domain_module_id: LMS_GDPR_MOD, data_object_id: DO_USERS, role: "consumer", necessity: "required" });

// LMS-PATHS (34): 5 new masters; existing learning_paths stays master
const pathMasters = ["learning_path_steps","curricula","learning_path_assignments","learning_plans","prerequisite_rules"];
for (const n of pathMasters) DMDO_ROWS.push({ domain_module_id: LMS_PATHS_MOD, data_object_id: dn(n), role: "master", necessity: "required" });

// LMS-AUTOMATION (new): 6 masters + embedded shells
const autoMasters = ["audiences","automated_enrollment_rules","learner_notifications","notification_templates","manager_nudges","escalation_rules"];
for (const n of autoMasters) DMDO_ROWS.push({ domain_module_id: LMS_AUTO_MOD, data_object_id: dn(n), role: "master", necessity: "required" });
DMDO_ROWS.push({ domain_module_id: LMS_AUTO_MOD, data_object_id: DO_USERS, role: "consumer", necessity: "required" });
DMDO_ROWS.push({ domain_module_id: LMS_AUTO_MOD, data_object_id: DO_EMPLOYEES, role: "embedded_master", necessity: "required" });
DMDO_ROWS.push({ domain_module_id: LMS_AUTO_MOD, data_object_id: DO_COURSES, role: "embedded_master", necessity: "required" });
DMDO_ROWS.push({ domain_module_id: LMS_AUTO_MOD, data_object_id: DO_COMPLIANCE_ASSIGNMENTS, role: "embedded_master", necessity: "required" });
DMDO_ROWS.push({ domain_module_id: LMS_AUTO_MOD, data_object_id: DO_LEARNER_CERTIFICATIONS, role: "embedded_master", necessity: "required" });

console.log(`  total DMDO rows to upsert: ${DMDO_ROWS.length}`);

// Pre-flight Rule #11: every embedded_master must have a canonical master somewhere.
for (const r of DMDO_ROWS.filter(r => r.role === "embedded_master")) {
  const dobj = (await get(`/data_objects?id=eq.${r.data_object_id}&select=kind`))?.[0];
  if (!dobj) throw new Error(`Unknown data_object_id ${r.data_object_id} in DMDO row`);
  if (dobj.kind === "platform_builtin") continue;
  const masters = (await get(`/domain_module_data_objects?data_object_id=eq.${r.data_object_id}&role=eq.master&select=id&limit=1`)) ?? [];
  // Allow self-referential during this very load: if learner_certifications is being re-mastered in LMS-CRED, allow.
  if (masters.length === 0 && r.data_object_id !== DO_LEARNER_CERTIFICATIONS) {
    throw new Error(`Rule #11 violation: data_object ${r.data_object_id} embedded_master has no canonical master and is not platform_builtin`);
  }
}

// Idempotency: pull existing DMDO and skip dupes.
const moduleIdsList = [LMS_CD_MOD, LMS_CT_MOD, LMS_PATHS_MOD, LMS_ILT_MOD, LMS_CRED_MOD, LMS_GDPR_MOD, LMS_AUTO_MOD].join(",");
const existingDmdo = (await get(`/domain_module_data_objects?domain_module_id=in.(${moduleIdsList})&select=domain_module_id,data_object_id,role`)) ?? [];
const existingDmdoKeys = new Set(existingDmdo.map((r: any) => `${r.domain_module_id}|${r.data_object_id}`));
const newDmdoPayload = DMDO_ROWS
  .filter(r => !existingDmdoKeys.has(`${r.domain_module_id}|${r.data_object_id}`))
  .map(r => ({ ...r, notes: "" }));

if (newDmdoPayload.length > 0) {
  console.log(`  inserting ${newDmdoPayload.length} new DMDO rows`);
  await post("/domain_module_data_objects", newDmdoPayload);
} else {
  console.log(`  all DMDO rows already present (re-run)`);
}

// =========================================================================
// PHASE 6 - Re-master learner_certifications: PATCH role on existing (33, 171) from master -> embedded_master
// =========================================================================
console.log("\n=== PHASE 6: Re-master learner_certifications (LMS-CT -> LMS-CREDENTIALS) ===");

const cuRow = (await get(`/domain_module_data_objects?domain_module_id=eq.${LMS_CT_MOD}&data_object_id=eq.${DO_LEARNER_CERTIFICATIONS}&select=id,role`))?.[0];
if (cuRow) {
  if (cuRow.role === "master") {
    console.log(`  PATCHing DMDO row id=${cuRow.id} role master -> embedded_master`);
    await patch(`/domain_module_data_objects?id=eq.${cuRow.id}`, { role: "embedded_master", necessity: "required" });
  } else {
    console.log(`  DMDO already in role '${cuRow.role}', no change`);
  }
} else {
  console.log(`  WARNING: no existing DMDO for (LMS-CT, learner_certifications); skipping`);
}

// =========================================================================
// PHASE 7 - domain_module_capabilities
// =========================================================================
console.log("\n=== PHASE 7: domain_module_capabilities ===");

type DmcSpec = { domain_module_id: number; capability_id: number };
const DMC_ROWS: DmcSpec[] = [
  // New module realizations
  { domain_module_id: LMS_ILT_MOD, capability_id: newCapId["LMS-ILT-DELIVERY"] },
  { domain_module_id: LMS_CRED_MOD, capability_id: newCapId["LMS-CREDENTIAL-MGMT"] },
  { domain_module_id: LMS_CRED_MOD, capability_id: CAP_CERT_MGMT },
  { domain_module_id: LMS_GDPR_MOD, capability_id: newCapId["LMS-PRIVACY-COMPLIANCE"] },
  { domain_module_id: LMS_AUTO_MOD, capability_id: newCapId["LMS-LEARNING-AUTOMATION"] },
];

const existingDmc = (await get(`/domain_module_capabilities?domain_module_id=in.(${LMS_ILT_MOD},${LMS_CRED_MOD},${LMS_GDPR_MOD},${LMS_AUTO_MOD})&select=domain_module_id,capability_id`)) ?? [];
const existingDmcKeys = new Set(existingDmc.map((r: any) => `${r.domain_module_id}|${r.capability_id}`));
const newDmcPayload = DMC_ROWS.filter(r => !existingDmcKeys.has(`${r.domain_module_id}|${r.capability_id}`));
if (newDmcPayload.length > 0) {
  console.log(`  inserting ${newDmcPayload.length} domain_module_capabilities`);
  await post("/domain_module_capabilities", newDmcPayload);
} else {
  console.log(`  all domain_module_capabilities present`);
}

// SKILLS-MGMT capability migration: DELETE from LMS-PATHS, INSERT into SKILLS-MGMT-FOUNDATION (174)
console.log("\n  SKILLS-MGMT capability migration:");
const pathsCapRow = (await get(`/domain_module_capabilities?domain_module_id=eq.${LMS_PATHS_MOD}&capability_id=eq.${CAP_SKILLS_MGMT}&select=id`))?.[0];
if (pathsCapRow) {
  console.log(`    DELETING SKILLS-MGMT link from LMS-PATHS (dmc id=${pathsCapRow.id})`);
  const r = await postgrest("DELETE", `/domain_module_capabilities?id=eq.${pathsCapRow.id}`);
  if (!r.ok) throw new Error(`DELETE failed: ${r.stderr}`);
} else {
  console.log(`    SKILLS-MGMT link not present on LMS-PATHS (already removed)`);
}

const smModule = (await get(`/domain_modules?domain_id=eq.${SKILLS_MGMT_DOMAIN_ID}&select=id,domain_module_code&order=id.asc&limit=1`))?.[0];
if (smModule) {
  const existingSmCap = (await get(`/domain_module_capabilities?domain_module_id=eq.${smModule.id}&capability_id=eq.${CAP_SKILLS_MGMT}&select=id`))?.[0];
  if (!existingSmCap) {
    console.log(`    INSERTING SKILLS-MGMT link onto ${smModule.domain_module_code} (id=${smModule.id})`);
    await post("/domain_module_capabilities", [{ domain_module_id: smModule.id, capability_id: CAP_SKILLS_MGMT }]);
  } else {
    console.log(`    SKILLS-MGMT link already on ${smModule.domain_module_code}`);
  }
} else {
  console.log(`    WARNING: no module on SKILLS-MGMT domain ${SKILLS_MGMT_DOMAIN_ID}; skipping migration target`);
}

// CERT-MGMT capability migration: REMOVE from LMS-CT (33), already added to LMS-CRED above.
const ctCertRow = (await get(`/domain_module_capabilities?domain_module_id=eq.${LMS_CT_MOD}&capability_id=eq.${CAP_CERT_MGMT}&select=id`))?.[0];
if (ctCertRow) {
  console.log(`    DELETING CERT-MGMT link from LMS-COMPLIANCE-TRAINING (dmc id=${ctCertRow.id}); already on LMS-CREDENTIALS`);
  const r = await postgrest("DELETE", `/domain_module_capabilities?id=eq.${ctCertRow.id}`);
  if (!r.ok) throw new Error(`DELETE failed: ${r.stderr}`);
} else {
  console.log(`    CERT-MGMT link not present on LMS-COMPLIANCE-TRAINING (already removed)`);
}

// =========================================================================
// PHASE 8 - B4 pattern flag PATCHes on existing entities
// =========================================================================
console.log("\n=== PHASE 8: B4 pattern flag PATCHes on existing entities ===");

const lcRow = (await get(`/data_objects?id=eq.${DO_LEARNER_CERTIFICATIONS}&select=has_submit_lock`))?.[0];
if (lcRow && !lcRow.has_submit_lock) {
  console.log(`  PATCHing learner_certifications.has_submit_lock = true`);
  await patch(`/data_objects?id=eq.${DO_LEARNER_CERTIFICATIONS}`, { has_submit_lock: true });
} else {
  console.log(`  learner_certifications.has_submit_lock already true`);
}

const caRow = (await get(`/data_objects?id=eq.${DO_COMPLIANCE_ASSIGNMENTS}&select=has_personal_content`))?.[0];
if (caRow && !caRow.has_personal_content) {
  console.log(`  PATCHing compliance_assignments.has_personal_content = true`);
  await patch(`/data_objects?id=eq.${DO_COMPLIANCE_ASSIGNMENTS}`, { has_personal_content: true });
} else {
  console.log(`  compliance_assignments.has_personal_content already true`);
}

// =========================================================================
// SUMMARY
// =========================================================================
console.log("\n=== SUMMARY ===");

const summary = {
  capabilities: (await get(`/capabilities?capability_code=in.(LMS-ILT-DELIVERY,LMS-CREDENTIAL-MGMT,LMS-LEARNING-AUTOMATION,LMS-PRIVACY-COMPLIANCE)&select=id`)).length,
  modules: (await get(`/domain_modules?domain_id=eq.${LMS_DOMAIN_ID}&select=id`)).length,
  data_objects: Object.keys(newDOId).length,
  dmdo_rows: (await get(`/domain_module_data_objects?domain_module_id=in.(${moduleIdsList})&select=id`)).length,
  module_capabilities: (await get(`/domain_module_capabilities?domain_module_id=in.(${moduleIdsList})&select=id`)).length,
};

console.log("  capabilities (new): " + summary.capabilities + " / 4");
console.log("  domain_modules in LMS: " + summary.modules + " (expect 7 full)");
console.log("  data_objects (new): " + summary.data_objects + " / 58");
console.log("  DMDO rows across 7 modules: " + summary.dmdo_rows);
console.log("  module_capabilities across 7 modules: " + summary.module_capabilities);

console.log("\n  UI spot-check links:");
console.log("    https://adenin.semantius.app/domain_map/domain_modules");
console.log("    https://adenin.semantius.app/domain_map/data_objects");
console.log("    https://adenin.semantius.app/domain_map/domain_module_data_objects");
console.log("    https://adenin.semantius.app/domain_map/capabilities");
console.log("    https://adenin.semantius.app/domain_map/domain_module_capabilities");

console.log("\n=== DONE: loader 1/6 (structural foundation) complete ===");
console.log("Next: loader 2/6 - lifecycle states, aliases, relationships");
