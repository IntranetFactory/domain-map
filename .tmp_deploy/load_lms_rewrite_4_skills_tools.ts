/**
 * LMS rewrite loader 4/6 - System skills + tools + skill_tools (Rule #17).
 *
 * Phase A: 4 new system skills (1 per new module) - lms_ilt_delivery_agent, lms_credentials_agent,
 *          lms_privacy_agent, lms_automation_agent. Each domain_module_id set; skill_type='system'.
 * Phase B: New tools for the 58 new data_objects (query for every master, mutate for masters with
 *          workflow gates). All coverage_tier='platform' per current LMS pattern.
 * Phase C: skill_tools links - new skills get their full tool set; existing 3 skills get the new
 *          tools for entities they now own/embed (LMS-CD picks up course_versions etc.; LMS-CT picks
 *          up compliance_training_campaigns etc.; LMS-PATHS picks up curricula etc.).
 *
 * record_status defaults to 'new'.
 * Idempotent: keyed on (skill_type, domain_module_id) for skills; tool_name for tools; (skill_id, tool_id) for skill_tools.
 *
 * Run: bun run "c:/dev/domain-map/.tmp_deploy/load_lms_rewrite_4_skills_tools.ts"
 */

const LMS_DOMAIN_ID = 57;
const LMS_CD_MOD = 32;
const LMS_CT_MOD = 33;
const LMS_PATHS_MOD = 34;

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
  for (const v of vals) if (v && FORBIDDEN.test(v)) throw new Error(`em-dash found in ${label}: ${v.slice(0, 80)}`);
}

// Resolve modules + DOs
const modRows = (await get(`/domain_modules?domain_module_code=in.(LMS-ILT-DELIVERY,LMS-CREDENTIALS,LMS-CT-GDPR,LMS-AUTOMATION)&select=id,domain_module_code`)) ?? [];
const M: Record<string, number> = {};
for (const r of modRows) M[String(r.domain_module_code)] = Number(r.id);
const LMS_ILT_MOD = M["LMS-ILT-DELIVERY"];
const LMS_CRED_MOD = M["LMS-CREDENTIALS"];
const LMS_GDPR_MOD = M["LMS-CT-GDPR"];
const LMS_AUTO_MOD = M["LMS-AUTOMATION"];

const ALL_NEW_DOS = ["course_versions","course_modules","lessons","learning_content_assets","scorm_packages","xapi_statements","course_completions","course_assessments","assessment_questions","assessment_attempts","quiz_responses","course_categories","course_tags","course_catalogs","course_discussions","course_reviews","course_ratings","course_offerings","course_sessions","instructors","instructor_assignments","session_attendances","waitlist_entries","virtual_classroom_meetings","course_resources","certification_definitions","certificate_templates","credential_badges","learner_badges","continuing_education_credits","ceu_records","finra_ce_records","compliance_training_campaigns","compliance_audit_records","training_evidence_records","harassment_training_acknowledgements","recertification_schedules","regulator_filing_exports","hipaa_training_records","osha_training_records","sox_training_evidence","ferpa_training_records","fda_part11_audit_trails","bsa_aml_training_records","gdpr_consent_records","subject_access_requests","data_deletion_requests","learning_path_steps","curricula","learning_path_assignments","learning_plans","prerequisite_rules","audiences","automated_enrollment_rules","learner_notifications","notification_templates","manager_nudges","escalation_rules"];
const doRows = (await get(`/data_objects?data_object_name=in.(${ALL_NEW_DOS.join(",")})&select=id,data_object_name`)) ?? [];
const D: Record<string, number> = {};
for (const r of doRows) D[String(r.data_object_name)] = Number(r.id);

// =========================================================================
// PHASE A - new skills (4)
// =========================================================================
console.log("=== PHASE A: 4 new system skills ===");

type SkillSpec = { skill_name: string; description: string; module_id: number };

const NEW_SKILLS: SkillSpec[] = [
  { skill_name: "lms_ilt_delivery_agent", module_id: LMS_ILT_MOD,
    description: "Agent for instructor-led and virtual-instructor-led training delivery: offerings, sessions, instructor assignments, attendance capture, waitlist management." },
  { skill_name: "lms_credentials_agent", module_id: LMS_CRED_MOD,
    description: "Agent for certification and badge management: catalog definitions, certificate issuance, badge awards, CEU and FINRA CE record management." },
  { skill_name: "lms_privacy_agent", module_id: LMS_GDPR_MOD,
    description: "Agent for learner data privacy: GDPR consent capture, subject access requests, and right-to-erasure processing." },
  { skill_name: "lms_automation_agent", module_id: LMS_AUTO_MOD,
    description: "Agent for learning automation: dynamic audiences, automated enrollment rules, notification templates, learner notifications, manager nudges, and escalation policies." },
];

for (const s of NEW_SKILLS) checkText(`skill ${s.skill_name}`, s.description);

const skillNames = NEW_SKILLS.map(s => s.skill_name).join(",");
const existingSkills = (await get(`/skills?skill_name=in.(${skillNames})&select=id,skill_name`)) ?? [];
const existingSkillNames = new Set(existingSkills.map((r: any) => String(r.skill_name)));
const newSkillPayload = NEW_SKILLS
  .filter(s => !existingSkillNames.has(s.skill_name))
  .map(s => ({
    skill_name: s.skill_name,
    description: s.description,
    skill_type: "system",
    domain_id: LMS_DOMAIN_ID,
    domain_module_id: s.module_id,
  }));

if (newSkillPayload.length > 0) {
  console.log(`  inserting ${newSkillPayload.length} new skills`);
  await post("/skills", newSkillPayload);
}

const allLmsSkills = (await get(`/skills?or=(domain_id.eq.${LMS_DOMAIN_ID},domain_module_id.in.(${LMS_ILT_MOD},${LMS_CRED_MOD},${LMS_GDPR_MOD},${LMS_AUTO_MOD}))&select=id,skill_name,domain_module_id`)) ?? [];
const SK: Record<string, number> = {};
for (const r of allLmsSkills) SK[String(r.skill_name)] = Number(r.id);
console.log(`  resolved ${Object.keys(SK).length} LMS skills:`, SK);

// =========================================================================
// PHASE B - tools (new, one query per master + workflow-gate mutates)
// =========================================================================
console.log("\n=== PHASE B: tools ===");

type ToolSpec = { tool_name: string; operation_kind: string; data_object: string | null; description: string; coverage_tier: string };

// Helper: generate query + mutate set for a master
function basicTools(do_name: string, mutateVerbs: string[] = []): ToolSpec[] {
  const out: ToolSpec[] = [
    { tool_name: `query_${do_name}`, operation_kind: "query", data_object: do_name, description: `Query ${do_name.replace(/_/g, " ")} records.`, coverage_tier: "platform" },
  ];
  for (const v of mutateVerbs) {
    const tn = v.endsWith("_") ? `${v}${do_name}` : `${v}_${do_name.replace(/s$/, "")}`;
    out.push({ tool_name: tn, operation_kind: "mutate", data_object: do_name, description: `${v.replace(/_/g, " ")} a ${do_name.replace(/_/g, " ").replace(/s$/, "")}.`, coverage_tier: "platform" });
  }
  return out;
}

const NEW_TOOLS: ToolSpec[] = [
  // LMS-COURSE-DELIVERY new tools
  ...basicTools("course_versions", ["create", "publish", "retire"]),
  ...basicTools("course_modules", ["create"]),
  ...basicTools("lessons", ["create"]),
  ...basicTools("learning_content_assets", ["upload"]),
  ...basicTools("scorm_packages", ["upload", "validate"]),
  { tool_name: "ingest_xapi_statement", operation_kind: "inbound", data_object: null, description: "Ingest an xAPI statement from external LMS or content source.", coverage_tier: "platform" },
  ...basicTools("xapi_statements"),
  ...basicTools("course_completions", ["record", "void"]),
  ...basicTools("course_assessments", ["create", "publish"]),
  ...basicTools("assessment_questions"),
  ...basicTools("assessment_attempts", ["submit", "grade"]),
  ...basicTools("quiz_responses"),
  ...basicTools("course_categories"),
  ...basicTools("course_tags"),
  ...basicTools("course_catalogs"),
  ...basicTools("course_discussions"),
  ...basicTools("course_reviews"),
  ...basicTools("course_ratings"),

  // LMS-ILT-DELIVERY tools
  ...basicTools("course_offerings", ["schedule", "open", "complete", "cancel"]),
  ...basicTools("course_sessions", ["complete", "cancel"]),
  ...basicTools("instructors", ["activate", "deactivate"]),
  ...basicTools("instructor_assignments", ["assign", "confirm"]),
  ...basicTools("session_attendances", ["record", "validate"]),
  ...basicTools("waitlist_entries", ["promote"]),
  ...basicTools("virtual_classroom_meetings", ["schedule", "cancel"]),
  ...basicTools("course_resources"),

  // LMS-CREDENTIALS tools
  ...basicTools("certification_definitions", ["create", "publish", "retire"]),
  ...basicTools("certificate_templates"),
  ...basicTools("credential_badges", ["create", "publish"]),
  ...basicTools("learner_badges", ["award", "revoke"]),
  ...basicTools("continuing_education_credits"),
  ...basicTools("ceu_records", ["record", "validate", "file"]),
  ...basicTools("finra_ce_records", ["record", "validate", "file"]),

  // LMS-COMPLIANCE-TRAINING new tools
  ...basicTools("compliance_training_campaigns", ["launch", "complete"]),
  ...basicTools("compliance_audit_records", ["record", "submit"]),
  ...basicTools("training_evidence_records", ["finalize", "submit"]),
  ...basicTools("harassment_training_acknowledgements", ["sign"]),
  ...basicTools("recertification_schedules"),
  ...basicTools("regulator_filing_exports", ["file"]),
  ...basicTools("hipaa_training_records", ["record"]),
  ...basicTools("osha_training_records", ["record"]),
  ...basicTools("sox_training_evidence", ["record"]),
  ...basicTools("ferpa_training_records", ["record"]),
  ...basicTools("fda_part11_audit_trails", ["record"]),
  ...basicTools("bsa_aml_training_records", ["record"]),

  // LMS-CT-GDPR tools
  ...basicTools("gdpr_consent_records", ["grant", "withdraw"]),
  ...basicTools("subject_access_requests", ["receive", "fulfill", "close"]),
  ...basicTools("data_deletion_requests", ["receive", "fulfill", "decline"]),

  // LMS-PATHS new tools
  ...basicTools("learning_path_steps"),
  ...basicTools("curricula", ["create", "publish"]),
  ...basicTools("learning_path_assignments", ["assign", "complete"]),
  ...basicTools("learning_plans", ["activate", "complete"]),
  ...basicTools("prerequisite_rules"),

  // LMS-AUTOMATION tools
  ...basicTools("audiences", ["create"]),
  ...basicTools("automated_enrollment_rules", ["create", "activate", "pause"]),
  ...basicTools("learner_notifications", ["send"]),
  ...basicTools("notification_templates", ["create"]),
  ...basicTools("manager_nudges", ["send", "acknowledge"]),
  ...basicTools("escalation_rules", ["create", "activate"]),
];

for (const t of NEW_TOOLS) checkText(`tool ${t.tool_name}`, t.description);

// Sanity: invariant checks per Rule #17
for (const t of NEW_TOOLS) {
  const needsDo = t.operation_kind === "query" || t.operation_kind === "mutate";
  const mustNotHaveDo = t.operation_kind === "side_effect" || t.operation_kind === "compute";
  if (needsDo && !t.data_object) throw new Error(`tool ${t.tool_name} ${t.operation_kind} missing data_object`);
  if (mustNotHaveDo && t.data_object) throw new Error(`tool ${t.tool_name} ${t.operation_kind} must not set data_object`);
}

// Build name list, dedupe (basicTools may have generated dupes for plurals like 'queries')
const toolNames = Array.from(new Set(NEW_TOOLS.map(t => t.tool_name)));
const dedupedTools: ToolSpec[] = [];
const seen = new Set<string>();
for (const t of NEW_TOOLS) {
  if (seen.has(t.tool_name)) continue;
  seen.add(t.tool_name);
  dedupedTools.push(t);
}

const existingToolRows = (await get(`/tools?tool_name=in.(${toolNames.join(",")})&select=id,tool_name`)) ?? [];
const existingToolNames = new Set(existingToolRows.map((r: any) => String(r.tool_name)));
const newToolPayload = dedupedTools
  .filter(t => !existingToolNames.has(t.tool_name))
  .map(t => ({
    tool_name: t.tool_name,
    operation_kind: t.operation_kind,
    data_object_id: t.data_object ? D[t.data_object] : null,
    description: t.description,
    coverage_tier: t.coverage_tier,
  }));

console.log(`  tools total drafted: ${dedupedTools.length}; new to insert: ${newToolPayload.length}`);
if (newToolPayload.length > 0) await post("/tools", newToolPayload);

const allToolRows = (await get(`/tools?tool_name=in.(${toolNames.join(",")})&select=id,tool_name`)) ?? [];
const T: Record<string, number> = {};
for (const r of allToolRows) T[String(r.tool_name)] = Number(r.id);
console.log(`  resolved ${Object.keys(T).length} tool ids`);

// Also resolve the shared abstraction tool
const notifyTool = (await get(`/tools?tool_name=eq.notify_person&select=id`))?.[0];
const NOTIFY_PERSON_ID = notifyTool?.id;
if (!NOTIFY_PERSON_ID) throw new Error("notify_person tool not found");

// =========================================================================
// PHASE C - skill_tools
// =========================================================================
console.log("\n=== PHASE C: skill_tools ===");

const SKILL_TOOL_MAP: Record<string, string[]> = {
  // Existing lms_course_delivery_agent extended with CD tools
  lms_course_delivery_agent: [
    "query_course_versions","create_course_version","publish_course_version","retire_course_version",
    "query_course_modules","create_course_module",
    "query_lessons","create_lesson",
    "query_learning_content_assets","upload_learning_content_asset",
    "query_scorm_packages","upload_scorm_package","validate_scorm_package",
    "query_xapi_statements","ingest_xapi_statement",
    "query_course_completions","record_course_completion","void_course_completion",
    "query_course_assessments","create_course_assessment","publish_course_assessment",
    "query_assessment_questions",
    "query_assessment_attempts","submit_assessment_attempt","grade_assessment_attempt",
    "query_quiz_responses",
    "query_course_categories","query_course_tags","query_course_catalogs",
    "query_course_discussions","query_course_reviews","query_course_ratings",
  ],
  // Existing lms_compliance_training_agent extended
  lms_compliance_training_agent: [
    "query_compliance_training_campaigns","launch_compliance_training_campaign","complete_compliance_training_campaign",
    "query_compliance_audit_records","record_compliance_audit_record","submit_compliance_audit_record",
    "query_training_evidence_records","finalize_training_evidence_record","submit_training_evidence_record",
    "query_harassment_training_acknowledgements","sign_harassment_training_acknowledgement",
    "query_recertification_schedules",
    "query_regulator_filing_exports","file_regulator_filing_export",
    "query_hipaa_training_records","record_hipaa_training_record",
    "query_osha_training_records","record_osha_training_record",
    "query_sox_training_evidence","record_sox_training_evidence",
    "query_ferpa_training_records","record_ferpa_training_record",
    "query_fda_part11_audit_trails","record_fda_part11_audit_trail",
    "query_bsa_aml_training_records","record_bsa_aml_training_record",
  ],
  // Existing lms_skills_agent (LMS-PATHS) extended
  lms_skills_agent: [
    "query_learning_path_steps",
    "query_curricula","create_curriculum","publish_curriculum",
    "query_learning_path_assignments","assign_learning_path_assignment","complete_learning_path_assignment",
    "query_learning_plans","activate_learning_plan","complete_learning_plan",
    "query_prerequisite_rules",
  ],
  // NEW: lms_ilt_delivery_agent
  lms_ilt_delivery_agent: [
    "query_course_offerings","schedule_course_offering","open_course_offering","complete_course_offering","cancel_course_offering",
    "query_course_sessions","complete_course_session","cancel_course_session",
    "query_instructors","activate_instructor","deactivate_instructor",
    "query_instructor_assignments","assign_instructor_assignment","confirm_instructor_assignment",
    "query_session_attendances","record_session_attendance","validate_session_attendance",
    "query_waitlist_entries","promote_waitlist_entry",
    "query_virtual_classroom_meetings","schedule_virtual_classroom_meeting","cancel_virtual_classroom_meeting",
    "query_course_resources",
  ],
  // NEW: lms_credentials_agent
  lms_credentials_agent: [
    "query_certification_definitions","create_certification_definition","publish_certification_definition","retire_certification_definition",
    "query_certificate_templates",
    "query_credential_badges","create_credential_badge","publish_credential_badge",
    "query_learner_badges","award_learner_badge","revoke_learner_badge",
    "query_continuing_education_credits",
    "query_ceu_records","record_ceu_record","validate_ceu_record","file_ceu_record",
    "query_finra_ce_records","record_finra_ce_record","validate_finra_ce_record","file_finra_ce_record",
  ],
  // NEW: lms_privacy_agent
  lms_privacy_agent: [
    "query_gdpr_consent_records","grant_gdpr_consent_record","withdraw_gdpr_consent_record",
    "query_subject_access_requests","receive_subject_access_request","fulfill_subject_access_request","close_subject_access_request",
    "query_data_deletion_requests","receive_data_deletion_request","fulfill_data_deletion_request","decline_data_deletion_request",
  ],
  // NEW: lms_automation_agent
  lms_automation_agent: [
    "query_audiences","create_audience",
    "query_automated_enrollment_rules","create_automated_enrollment_rule","activate_automated_enrollment_rule","pause_automated_enrollment_rule",
    "query_learner_notifications","send_learner_notification",
    "query_notification_templates","create_notification_template",
    "query_manager_nudges","send_manager_nudge","acknowledge_manager_nudge",
    "query_escalation_rules","create_escalation_rule","activate_escalation_rule",
  ],
};

const skillToolPayload: any[] = [];
let missingTools = 0;
for (const [skill_name, toolNames] of Object.entries(SKILL_TOOL_MAP)) {
  const skillId = SK[skill_name];
  if (!skillId) { console.log(`  WARN: skill ${skill_name} not found, skipping its tools`); continue; }
  for (const tn of toolNames) {
    const toolId = T[tn];
    if (!toolId) { console.log(`  WARN: tool ${tn} not found, skipping (skill=${skill_name})`); missingTools++; continue; }
    skillToolPayload.push({ skill_id: skillId, tool_id: toolId, requirement_level: "required" });
  }
  // Also link notify_person on each new skill
  if (["lms_ilt_delivery_agent","lms_credentials_agent","lms_privacy_agent","lms_automation_agent"].includes(skill_name)) {
    skillToolPayload.push({ skill_id: skillId, tool_id: NOTIFY_PERSON_ID, requirement_level: "required" });
  }
}

console.log(`  skill_tools drafted: ${skillToolPayload.length} (${missingTools} tools missing)`);

const allSkillIds = Array.from(new Set(skillToolPayload.map(r => r.skill_id))).join(",");
const existingSt = (await get(`/skill_tools?skill_id=in.(${allSkillIds})&select=skill_id,tool_id`)) ?? [];
const existingStKeys = new Set(existingSt.map((r: any) => `${r.skill_id}|${r.tool_id}`));
const newStPayload = skillToolPayload.filter(r => !existingStKeys.has(`${r.skill_id}|${r.tool_id}`));

console.log(`  new skill_tools to insert: ${newStPayload.length} (skipping ${skillToolPayload.length - newStPayload.length} existing)`);
if (newStPayload.length > 0) await post("/skill_tools", newStPayload);

// =========================================================================
// SUMMARY + Semantius score per skill
// =========================================================================
console.log("\n=== SUMMARY ===");

for (const [name, skillId] of Object.entries(SK)) {
  const links = (await get(`/skill_tools?skill_id=eq.${skillId}&select=tools(coverage_tier)`)) ?? [];
  const total = links.length;
  const platform = links.filter((l: any) => l.tools?.coverage_tier === "platform").length;
  const pct = total > 0 ? Math.round((platform / total) * 100) : 0;
  console.log(`  ${name}: ${platform}/${total} platform = ${pct}%`);
}

console.log("\n  UI links:");
console.log("    https://adenin.semantius.app/domain_map/skills");
console.log("    https://adenin.semantius.app/domain_map/tools");
console.log("    https://adenin.semantius.app/domain_map/skill_tools");

console.log("\n=== DONE: loader 4/6 (skills + tools + skill_tools) ===");
console.log("Next: loader 5/6 - role rebundling (role_modules + role_permissions for 4 existing LMS roles)");
