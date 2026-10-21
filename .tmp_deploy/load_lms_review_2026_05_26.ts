#!/usr/bin/env bun
// load_lms_review_2026_05_26.ts
//
// Three-phase LMS catalog update triggered by user audit 2026-05-26.
//
// Phase 1: Add Microsoft Viva Learning + Learn365 (formerly LMS365 by Zensai)
//          to solutions, plus new vendor `Zensai`, plus solution_domains rows.
// Phase 2: Backfill 11 mutate tools across the 3 LMS system skills so the
//          agents can drive lifecycles, not just read.
// Phase 3: Wire tool_solutions for the three vendors the user asked about
//          (TalentLMS, Viva Learning, Learn365). Promotes those solutions
//          to solution_kind='external_connector'.
//
// Idempotent: every step reads first, only writes what's missing.
// All record_status fields omitted; DB default 'new' applies (Rule #1).
//
// Run from project root: bun run c:/dev/domain-map/.tmp_deploy/load_lms_review_2026_05_26.ts

export {};

type Row = Record<string, unknown>;

async function postgrest(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path} (exit ${code}): ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

const LMS_DOMAIN_ID = 57;
const VENDOR_MICROSOFT = 25;

const MODULE = {
  COURSE_DELIVERY: 32,
  COMPLIANCE_TRAINING: 33,
  SKILLS: 34,
};

const DO = {
  courses: 167,
  learning_paths: 168,
  course_enrollments: 169,
  learning_records: 170,
  learner_certifications: 171,
  skill_profiles: 172,
  compliance_assignments: 173,
};

// Existing system skills (one per module, ids known from audit)
const SKILL = {
  course_delivery: 152,
  compliance: 153,
  skills: 154,
};

// Existing TalentLMS solution
const SOL_TALENTLMS = 238;

// ============================================================
// PHASE 1 — Vendors + Solutions + solution_domains
// ============================================================
console.log("=== PHASE 1: Viva Learning + Learn365 ===\n");

// 1A. Vendor Zensai (Microsoft already exists at id 25)
console.log("1A. vendor Zensai");
let vendorZensaiId: number;
{
  const existing: Row[] = await postgrest(
    "GET",
    `/vendors?vendor_name=eq.Zensai&select=id`,
  ) ?? [];
  if (existing.length > 0) {
    vendorZensaiId = Number(existing[0].id);
    console.log(`  existing id=${vendorZensaiId}`);
  } else {
    const res = await postgrest("POST", "/vendors", {
      vendor_name: "Zensai",
      description: "Danish ed-tech vendor (Copenhagen-headquartered). Rebranded from LMS365 ApS in 2023. Builds SharePoint/Microsoft 365-native learning and engagement tools; flagship product Learn365 (formerly LMS365).",
    });
    vendorZensaiId = Number((res?.[0] ?? res)?.id);
    console.log(`  created id=${vendorZensaiId}`);
  }
}

// 1B. Solutions (Viva Learning, Learn365)
console.log("\n1B. solutions");
type SolSpec = {
  solution_name: string;
  vendor_id: number;
  description: string;
  solution_url: string;
  solution_type: string;
  cost_band: string;
};
const solSpecs: SolSpec[] = [
  {
    solution_name: "Microsoft Viva Learning",
    vendor_id: VENDOR_MICROSOFT,
    description: "Microsoft 365-native learning experience surfaced inside Microsoft Teams and the broader Viva employee-experience suite. Aggregates content from LinkedIn Learning, Microsoft Learn, third-party LMS partners (Cornerstone, Skillsoft, Coursera, edX, Pluralsight), and an organisation's own SharePoint/SCORM content. Strongest fit for M365-stack employers wanting in-the-flow-of-work learning recommendations; thinner than a full-blown LMS on compliance training and certifications.",
    solution_url: "https://www.microsoft.com/en-us/microsoft-viva/learning",
    solution_type: "saas",
    cost_band: "$$",
  },
  {
    solution_name: "Learn365",
    vendor_id: vendorZensaiId,
    description: "SharePoint- and Microsoft 365-native LMS. Formerly LMS365; rebranded under parent Zensai in 2023 when the vendor consolidated its learning + engagement product line. Runs inside Microsoft Teams, SharePoint, and Outlook; targets mid-market and enterprise M365 shops that want the LMS embedded in the existing collaboration stack rather than a standalone portal.",
    solution_url: "https://www.zensai.com/products/learn365",
    solution_type: "saas",
    cost_band: "$$$",
  },
];

const solIdByName: Record<string, number> = {};
for (const s of solSpecs) {
  const existing: Row[] = await postgrest(
    "GET",
    `/solutions?solution_name=eq.${encodeURIComponent(s.solution_name)}&select=id`,
  ) ?? [];
  if (existing.length > 0) {
    solIdByName[s.solution_name] = Number(existing[0].id);
    console.log(`  ${s.solution_name}: existing id=${solIdByName[s.solution_name]}`);
  } else {
    const res = await postgrest("POST", "/solutions", s);
    solIdByName[s.solution_name] = Number((res?.[0] ?? res)?.id);
    console.log(`  ${s.solution_name}: created id=${solIdByName[s.solution_name]}`);
  }
}

const SOL_VIVA = solIdByName["Microsoft Viva Learning"];
const SOL_LEARN365 = solIdByName["Learn365"];

// 1C. solution_domains — primary on LMS for both
console.log("\n1C. solution_domains (LMS primary)");
{
  const existing: Row[] = await postgrest(
    "GET",
    `/solution_domains?domain_id=eq.${LMS_DOMAIN_ID}&solution_id=in.(${SOL_VIVA},${SOL_LEARN365})&select=solution_id`,
  ) ?? [];
  const seen = new Set(existing.map((r) => Number(r.solution_id)));
  let added = 0;
  for (const sid of [SOL_VIVA, SOL_LEARN365]) {
    if (seen.has(sid)) continue;
    await postgrest("POST", "/solution_domains", {
      solution_id: sid,
      domain_id: LMS_DOMAIN_ID,
      coverage_level: "primary",
    });
    added++;
  }
  console.log(`  ${added} new / ${2 - added} existing`);
}

// ============================================================
// PHASE 2 — Backfill mutate tools + skill_tools
// ============================================================
console.log("\n=== PHASE 2: mutate tools for LMS skills ===\n");

// 2A. 11 new tools (all coverage_tier='platform' — CRUD on Semantius-mastered data_objects)
type ToolSpec = {
  tool_name: string;
  data_object_id: number;
  description: string;
};
const newToolSpecs: ToolSpec[] = [
  // Course delivery
  { tool_name: "create_course",                 data_object_id: DO.courses,                description: "Create a course record (title, modality, content references, target audience)." },
  { tool_name: "update_course",                 data_object_id: DO.courses,                description: "Update fields on an existing course (content, prerequisites, expiry policy, archival)." },
  { tool_name: "cancel_enrollment",             data_object_id: DO.course_enrollments,     description: "Cancel an active course enrollment before completion. Workflow gate for the cancelled terminal state." },
  // Compliance training
  { tool_name: "complete_compliance_training",  data_object_id: DO.compliance_assignments, description: "Mark a compliance training assignment complete with evidence (score, attempt timestamp, certificate ref). Workflow gate for the completed terminal state." },
  { tool_name: "waive_compliance_assignment",   data_object_id: DO.compliance_assignments, description: "Waive an outstanding compliance assignment with documented justification (medical leave, role change, regulator-approved exception). Workflow gate for the waived terminal state." },
  { tool_name: "issue_certification",           data_object_id: DO.learner_certifications, description: "Issue a learner certification on successful course or compliance completion (effective and expiry dates, credential number)." },
  { tool_name: "expire_certification",          data_object_id: DO.learner_certifications, description: "Mark a learner certification expired when the expiry date is reached or the credential is revoked. Workflow gate for the expired terminal state." },
  // Skills + paths
  { tool_name: "create_learning_path",          data_object_id: DO.learning_paths,         description: "Create a learning path (ordered set of courses or activities aimed at closing a skill gap or fulfilling a role-readiness curriculum)." },
  { tool_name: "assign_learning_path",          data_object_id: DO.learning_paths,         description: "Assign a learning path to an employee or cohort with target completion dates." },
  { tool_name: "update_skill_profile",          data_object_id: DO.skill_profiles,         description: "Update an employee's skill profile (add/remove skills, update proficiency level, attach evidence)." },
  { tool_name: "record_skill_assessment",       data_object_id: DO.skill_profiles,         description: "Record a skill assessment outcome against an employee's skill profile (assessor, score, rubric ref)." },
];

const newToolId: Record<string, number> = {};
{
  const existing: Row[] = await postgrest(
    "GET",
    `/tools?tool_name=in.(${newToolSpecs.map((t) => t.tool_name).join(",")})&select=id,tool_name`,
  ) ?? [];
  for (const r of existing) newToolId[String(r.tool_name)] = Number(r.id);

  let added = 0;
  for (const t of newToolSpecs) {
    if (newToolId[t.tool_name]) continue;
    const res = await postgrest("POST", "/tools", {
      tool_name: t.tool_name,
      description: t.description,
      operation_kind: "mutate",
      coverage_tier: "platform",
      data_object_id: t.data_object_id,
    });
    newToolId[t.tool_name] = Number((res?.[0] ?? res)?.id);
    added++;
  }
  console.log(`  ${added} new / ${newToolSpecs.length - added} existing`);
}

// 2B. Resolve all tools we will reference into one id map (existing + new)
const ALL_TOOL_NAMES = [
  // existing platform queries
  "query_courses", "query_course_enrollments", "query_learning_records",
  "query_learning_paths", "query_skill_profiles",
  "query_certifications", "query_compliance_assignments",
  // existing platform mutates
  "enroll_in_course", "complete_course", "assign_compliance_training",
  // new platform mutates
  ...newToolSpecs.map((t) => t.tool_name),
  // existing external
  "send_email",
];

const toolId: Record<string, number> = {};
const toolTier: Record<string, string> = {};
{
  const allToolRows: Row[] = await postgrest(
    "GET",
    `/tools?tool_name=in.(${ALL_TOOL_NAMES.join(",")})&select=id,tool_name,coverage_tier`,
  ) ?? [];
  for (const r of allToolRows) {
    toolId[String(r.tool_name)] = Number(r.id);
    toolTier[String(r.tool_name)] = String(r.coverage_tier);
  }
  for (const n of ALL_TOOL_NAMES) {
    if (!toolId[n]) throw new Error(`Tool missing after resolve: ${n}`);
  }
}

// 2C. skill_tools additions (idempotent on (skill_id, tool_id))
console.log("\n2B. skill_tools (new mutate links)");
type Addition = { skillId: number; toolName: string; level: "required" | "optional" };
const additions: Addition[] = [
  // Course delivery (skill 152) — add 3 mutates
  { skillId: SKILL.course_delivery, toolName: "create_course",                level: "required" },
  { skillId: SKILL.course_delivery, toolName: "update_course",                level: "required" },
  { skillId: SKILL.course_delivery, toolName: "cancel_enrollment",            level: "required" },
  // Compliance (skill 153) — add 4 mutates
  { skillId: SKILL.compliance,      toolName: "complete_compliance_training", level: "required" },
  { skillId: SKILL.compliance,      toolName: "waive_compliance_assignment",  level: "required" },
  { skillId: SKILL.compliance,      toolName: "issue_certification",          level: "required" },
  { skillId: SKILL.compliance,      toolName: "expire_certification",         level: "required" },
  // Skills (skill 154) — add 4 mutates
  { skillId: SKILL.skills,          toolName: "create_learning_path",         level: "required" },
  { skillId: SKILL.skills,          toolName: "assign_learning_path",         level: "required" },
  { skillId: SKILL.skills,          toolName: "update_skill_profile",         level: "required" },
  { skillId: SKILL.skills,          toolName: "record_skill_assessment",      level: "optional" },
];

{
  const skillIds = [SKILL.course_delivery, SKILL.compliance, SKILL.skills];
  const existing: Row[] = await postgrest(
    "GET",
    `/skill_tools?skill_id=in.(${skillIds.join(",")})&select=skill_id,tool_id`,
  ) ?? [];
  const seen = new Set(existing.map((r) => `${r.skill_id}:${r.tool_id}`));
  let added = 0;
  let skipped = 0;
  for (const a of additions) {
    const tid = toolId[a.toolName];
    const key = `${a.skillId}:${tid}`;
    if (seen.has(key)) { skipped++; continue; }
    await postgrest("POST", "/skill_tools", {
      skill_id: a.skillId,
      tool_id: tid,
      requirement_level: a.level,
    });
    added++;
  }
  console.log(`  ${added} new / ${skipped} existing`);
}

// ============================================================
// PHASE 3 — tool_solutions wiring for TalentLMS / Viva / Learn365
// ============================================================
console.log("\n=== PHASE 3: tool_solutions ===\n");

// 3A. Promote the three solutions to external_connector (they will deliver tools)
console.log("3A. promote solution_kind to external_connector");
{
  const targets = [SOL_TALENTLMS, SOL_VIVA, SOL_LEARN365];
  const rows: Row[] = await postgrest(
    "GET",
    `/solutions?id=in.(${targets.join(",")})&select=id,solution_name,solution_kind`,
  ) ?? [];
  let patched = 0;
  for (const r of rows) {
    if (String(r.solution_kind) === "external_connector") continue;
    await postgrest("PATCH", `/solutions?id=eq.${r.id}`, { solution_kind: "external_connector" });
    console.log(`  ${r.solution_name}: ${r.solution_kind} -> external_connector`);
    patched++;
  }
  console.log(`  ${patched} patched / ${rows.length - patched} already external_connector`);
}

// 3B. Per-solution tool delivery mapping
type ToolDelivery = {
  toolName: string;
  delivery_strength: "native" | "partial" | "via_extension" | "not_supported";
  notes: string;
};

// TalentLMS — focused SMB LMS; strong native course + enrollment + completion + certification APIs.
// No skill_profiles / learning_paths surface in the SMB tier.
const talentlmsTools: ToolDelivery[] = [
  { toolName: "query_courses",                delivery_strength: "native",  notes: "GET /courses via TalentLMS REST API." },
  { toolName: "query_course_enrollments",     delivery_strength: "native",  notes: "GET /users/{id}/courses or /courses/{id}/users." },
  { toolName: "query_learning_records",       delivery_strength: "native",  notes: "GET /reports/completions or per-user progress endpoints." },
  { toolName: "query_certifications",         delivery_strength: "native",  notes: "Native certificate template + issuance endpoints." },
  { toolName: "create_course",                delivery_strength: "native",  notes: "POST /courses." },
  { toolName: "update_course",                delivery_strength: "native",  notes: "PUT /courses/{id}." },
  { toolName: "enroll_in_course",             delivery_strength: "native",  notes: "POST /users/{id}/courses or POST /courses/{id}/users." },
  { toolName: "complete_course",              delivery_strength: "native",  notes: "Completion is set automatically; manual override via course progress API." },
  { toolName: "cancel_enrollment",            delivery_strength: "native",  notes: "DELETE enrollment endpoint." },
  { toolName: "issue_certification",          delivery_strength: "native",  notes: "Auto-issued on completion when course has a certificate template; manual issue via API." },
  { toolName: "expire_certification",         delivery_strength: "partial", notes: "Expiry tracked via course-level certification validity; explicit revocation requires API + admin workflow." },
];

// Microsoft Viva Learning — surfaces a learning catalog in Teams; aggregates content from
// many sources. Strong on catalog + recommendations + learning records via Microsoft Graph;
// weaker on enrollment/completion mutation since most content is delivered by partner LMSs.
const vivaTools: ToolDelivery[] = [
  { toolName: "query_courses",                delivery_strength: "native",   notes: "Microsoft Graph employeeLearning APIs return aggregated catalog (LinkedIn Learning, Microsoft Learn, partner LMSs, SharePoint content)." },
  { toolName: "query_learning_records",       delivery_strength: "native",   notes: "Microsoft Graph employeeLearning learningContentRecord/learningCourseActivities." },
  { toolName: "query_learning_paths",         delivery_strength: "partial",  notes: "Curated collections / playlists exposed via Graph; not full LMS-style sequenced paths." },
  { toolName: "query_skill_profiles",         delivery_strength: "partial",  notes: "Surfaced via Viva Skills (Skills in Microsoft 365), separate Graph endpoints; Viva Learning consumes for recommendations." },
  { toolName: "query_course_enrollments",     delivery_strength: "partial",  notes: "Assignment + recommendation records exposed; completion attribution flows back from source LMS." },
  { toolName: "enroll_in_course",             delivery_strength: "via_extension", notes: "Viva surfaces a launch link; enrollment happens in the partner LMS that hosts the content." },
  { toolName: "complete_course",              delivery_strength: "via_extension", notes: "Completion is recorded by the source LMS and propagated back to Viva via the LRS/xAPI bridge." },
  { toolName: "assign_learning_path",         delivery_strength: "native",   notes: "Manager-to-employee assignment + Teams notifications." },
];

// Learn365 (Zensai) — SharePoint/M365-native LMS. Full LMS surface (course, enrollment,
// compliance, certifications, learning paths). Skills graph is partial — Zensai integrates
// with Viva Skills rather than maintaining its own deep skills cloud.
const learn365Tools: ToolDelivery[] = [
  { toolName: "query_courses",                delivery_strength: "native",  notes: "REST API + SharePoint list backing store." },
  { toolName: "query_course_enrollments",     delivery_strength: "native",  notes: "Native enrollment objects exposed via REST." },
  { toolName: "query_learning_records",       delivery_strength: "native",  notes: "Native completion + progress records." },
  { toolName: "query_learning_paths",         delivery_strength: "native",  notes: "Native learning path object (Training Plans in product UI)." },
  { toolName: "query_certifications",         delivery_strength: "native",  notes: "Native certification issuance with expiry policy." },
  { toolName: "query_compliance_assignments", delivery_strength: "native",  notes: "Mandatory training assignment with regulator-evidence retention is a core differentiator." },
  { toolName: "create_course",                delivery_strength: "native",  notes: "POST course endpoint." },
  { toolName: "update_course",                delivery_strength: "native",  notes: "PATCH course endpoint." },
  { toolName: "enroll_in_course",             delivery_strength: "native",  notes: "Enrollment API + bulk import." },
  { toolName: "complete_course",              delivery_strength: "native",  notes: "Completion API." },
  { toolName: "cancel_enrollment",            delivery_strength: "native",  notes: "Enrollment lifecycle API." },
  { toolName: "assign_compliance_training",   delivery_strength: "native",  notes: "Mandatory-training assignment with policy + reminder cadence." },
  { toolName: "complete_compliance_training", delivery_strength: "native",  notes: "Completion with evidence captured natively." },
  { toolName: "waive_compliance_assignment",  delivery_strength: "partial", notes: "Admin override available; programmatic waiver workflow requires PowerAutomate flow." },
  { toolName: "issue_certification",          delivery_strength: "native",  notes: "Auto-issue on completion + manual issue endpoints." },
  { toolName: "expire_certification",         delivery_strength: "native",  notes: "Expiry policy native; renewal cycle reminders configurable." },
  { toolName: "create_learning_path",         delivery_strength: "native",  notes: "Training Plan creation." },
  { toolName: "assign_learning_path",         delivery_strength: "native",  notes: "Training Plan assignment to employee or M365 group." },
  { toolName: "update_skill_profile",         delivery_strength: "partial", notes: "Skills metadata managed on certifications + training plans; full skills cloud delegated to Viva Skills." },
];

const allDeliveries: Array<{ solutionId: number; solutionName: string; delivery: ToolDelivery }> = [
  ...talentlmsTools.map((t) => ({ solutionId: SOL_TALENTLMS, solutionName: "TalentLMS", delivery: t })),
  ...vivaTools.map((t) => ({ solutionId: SOL_VIVA, solutionName: "Microsoft Viva Learning", delivery: t })),
  ...learn365Tools.map((t) => ({ solutionId: SOL_LEARN365, solutionName: "Learn365", delivery: t })),
];

console.log(`3B. tool_solutions (${allDeliveries.length} target rows)`);
{
  const solIds = [SOL_TALENTLMS, SOL_VIVA, SOL_LEARN365];
  const existing: Row[] = await postgrest(
    "GET",
    `/tool_solutions?solution_id=in.(${solIds.join(",")})&select=solution_id,tool_id`,
  ) ?? [];
  const seen = new Set(existing.map((r) => `${r.solution_id}:${r.tool_id}`));
  let added = 0;
  let skipped = 0;
  for (const d of allDeliveries) {
    const tid = toolId[d.delivery.toolName];
    if (!tid) throw new Error(`Unresolved tool: ${d.delivery.toolName}`);
    const key = `${d.solutionId}:${tid}`;
    if (seen.has(key)) { skipped++; continue; }
    await postgrest("POST", "/tool_solutions", {
      solution_id: d.solutionId,
      tool_id: tid,
      delivery_strength: d.delivery.delivery_strength,
      delivery_method: "rest_api",
      notes: d.delivery.notes,
    });
    added++;
  }
  console.log(`  ${added} new / ${skipped} existing`);
}

// ============================================================
// VERIFICATION
// ============================================================
console.log("\n=== Verification ===\n");

// Semantius score per LMS skill
const skillsToScore = [
  { id: SKILL.course_delivery, name: "lms_course_delivery_agent" },
  { id: SKILL.compliance,      name: "lms_compliance_training_agent" },
  { id: SKILL.skills,          name: "lms_skills_agent" },
];

let unionPlat = 0;
let unionTotal = 0;
console.log("  skill                              | platform / total   |  %");
console.log("  -----------------------------------|--------------------|------");
for (const s of skillsToScore) {
  const rows: Row[] = await postgrest(
    "GET",
    `/skill_tools?skill_id=eq.${s.id}&select=tools(coverage_tier)`,
  ) ?? [];
  const tiers = rows.map((r) => String((r.tools as Row | undefined)?.coverage_tier ?? "?"));
  const platform = tiers.filter((t) => t === "platform").length;
  const total = tiers.length;
  unionPlat += platform;
  unionTotal += total;
  const pct = total === 0 ? 0 : Math.round((platform / total) * 100);
  console.log(`  ${s.name.padEnd(34)} | ${`${platform} / ${total}`.padEnd(18)} | ${pct}%`);
}
const domPct = unionTotal === 0 ? 0 : Math.round((unionPlat / unionTotal) * 100);
console.log(`  ${"LMS DOMAIN ROLLUP".padEnd(34)} | ${`${unionPlat} / ${unionTotal}`.padEnd(18)} | ${domPct}%`);

console.log("\nUI links:");
console.log(`  https://tests.semantius.app/domain_map/solutions?solution_name=eq.Microsoft%20Viva%20Learning`);
console.log(`  https://tests.semantius.app/domain_map/solutions?solution_name=eq.Learn365`);
console.log(`  https://tests.semantius.app/domain_map/vendors?vendor_name=eq.Zensai`);
console.log(`  https://tests.semantius.app/domain_map/solution_domains?domain_id=eq.${LMS_DOMAIN_ID}`);
console.log(`  https://tests.semantius.app/domain_map/skill_tools`);
console.log(`  https://tests.semantius.app/domain_map/tools`);
console.log(`  https://tests.semantius.app/domain_map/tool_solutions`);

console.log("\nNotes:");
console.log("  - All new rows default to record_status='new' (Rule #1). Bulk-approve only after review.");
console.log("  - Phase 3 only covers TalentLMS, Viva Learning, Learn365 (the three the user asked about).");
console.log("    Wiring the other LMS solutions (Docebo, Cornerstone, Workday, etc.) is a separate pass.");
