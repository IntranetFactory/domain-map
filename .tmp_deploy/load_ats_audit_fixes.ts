#!/usr/bin/env bun
// ATS audit fix loader — closes the five in-jurisdiction blockers from the 2026-05-23 review:
//   A4  — solution_capabilities matrix fill (48 cells, 8 vendors × 6 capabilities)
//   B6  — intra-domain data_object_relationships (14 edges)
//   B7  — users edges on ATS masters (6 edges)
//   B8  — outbound cross-domain payload→target edges (7 edges)
//   B11 — data_object_aliases (31 rows across all 14 masters)
//   B4  — pattern flag PATCHes (5 PATCHes, 6 flag transitions)
//
// All inserts omit record_status → defaults to "new" (Rule #1; bulk-approve happens later).
// Idempotent: each table is read first and only the missing rows are inserted.

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });

async function insertChunked(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

async function patchById(table: string, id: number, body: Row): Promise<void> {
  await call({ method: "PATCH", path: `/${table}?id=eq.${id}`, body });
}

// ============================================================
// A4 — solution_capabilities (48 rows)
// Subagent draft at c:/tmp/ats_solution_capabilities_draft.json
// ============================================================
const A4: Array<{ solution_id: number; capability_id: number; delivery_strength: string }> = [
  // Greenhouse (226)
  { solution_id: 226, capability_id: 12, delivery_strength: "native" },
  { solution_id: 226, capability_id: 13, delivery_strength: "native" },
  { solution_id: 226, capability_id: 14, delivery_strength: "native" },
  { solution_id: 226, capability_id: 15, delivery_strength: "native" },
  { solution_id: 226, capability_id: 16, delivery_strength: "native" },
  { solution_id: 226, capability_id: 17, delivery_strength: "partial" },
  // Lever (227)
  { solution_id: 227, capability_id: 12, delivery_strength: "native" },
  { solution_id: 227, capability_id: 13, delivery_strength: "native" },
  { solution_id: 227, capability_id: 14, delivery_strength: "native" },
  { solution_id: 227, capability_id: 15, delivery_strength: "native" },
  { solution_id: 227, capability_id: 16, delivery_strength: "native" },
  { solution_id: 227, capability_id: 17, delivery_strength: "partial" },
  // iCIMS (228)
  { solution_id: 228, capability_id: 12, delivery_strength: "native" },
  { solution_id: 228, capability_id: 13, delivery_strength: "native" },
  { solution_id: 228, capability_id: 14, delivery_strength: "native" },
  { solution_id: 228, capability_id: 15, delivery_strength: "native" },
  { solution_id: 228, capability_id: 16, delivery_strength: "native" },
  { solution_id: 228, capability_id: 17, delivery_strength: "partial" },
  // SmartRecruiters (229)
  { solution_id: 229, capability_id: 12, delivery_strength: "native" },
  { solution_id: 229, capability_id: 13, delivery_strength: "native" },
  { solution_id: 229, capability_id: 14, delivery_strength: "native" },
  { solution_id: 229, capability_id: 15, delivery_strength: "native" },
  { solution_id: 229, capability_id: 16, delivery_strength: "native" },
  { solution_id: 229, capability_id: 17, delivery_strength: "partial" },
  // Ashby (230)
  { solution_id: 230, capability_id: 12, delivery_strength: "native" },
  { solution_id: 230, capability_id: 13, delivery_strength: "native" },
  { solution_id: 230, capability_id: 14, delivery_strength: "native" },
  { solution_id: 230, capability_id: 15, delivery_strength: "native" },
  { solution_id: 230, capability_id: 16, delivery_strength: "native" },
  { solution_id: 230, capability_id: 17, delivery_strength: "partial" },
  // Eightfold (231) — AI-first; classic ATS functions partial
  { solution_id: 231, capability_id: 12, delivery_strength: "partial" },
  { solution_id: 231, capability_id: 13, delivery_strength: "native" },
  { solution_id: 231, capability_id: 14, delivery_strength: "partial" },
  { solution_id: 231, capability_id: 15, delivery_strength: "partial" },
  { solution_id: 231, capability_id: 16, delivery_strength: "partial" },
  { solution_id: 231, capability_id: 17, delivery_strength: "native" },
  // Phenom (232) — TX/experience-first
  { solution_id: 232, capability_id: 12, delivery_strength: "partial" },
  { solution_id: 232, capability_id: 13, delivery_strength: "native" },
  { solution_id: 232, capability_id: 14, delivery_strength: "native" },
  { solution_id: 232, capability_id: 15, delivery_strength: "native" },
  { solution_id: 232, capability_id: 16, delivery_strength: "partial" },
  { solution_id: 232, capability_id: 17, delivery_strength: "native" },
  // SAP SF Recruiting (233)
  { solution_id: 233, capability_id: 12, delivery_strength: "native" },
  { solution_id: 233, capability_id: 13, delivery_strength: "native" },
  { solution_id: 233, capability_id: 14, delivery_strength: "native" },
  { solution_id: 233, capability_id: 15, delivery_strength: "native" },
  { solution_id: 233, capability_id: 16, delivery_strength: "native" },
  { solution_id: 233, capability_id: 17, delivery_strength: "partial" },
];

// ============================================================
// B6 + B7 + B8 — data_object_relationships (27 edges)
// Master ids: 1=job_requisitions 2=job_postings 3=candidates 4=job_applications
//             5=recruitment_sources 6=candidate_referrals 7=talent_pools 8=interviews
//             9=interview_scorecards 10=candidate_assessments 11=job_offers
//             12=background_checks 13=recruitment_agencies 14=recruitment_events
// External:   16=onboarding_journeys 25=position_demand_forecasts 31=employees
//             43=people_kpis 147=benefit_enrollments 157=compensation_statements
//             291=risk_assessments 748=users (platform_builtin)
// ============================================================
type RelRow = {
  data_object_id: number;
  related_data_object_id: number;
  relationship_verb: string;
  inverse_verb: string;
  relationship_type: "one_to_many" | "many_to_many" | "one_to_one";
  relationship_kind: "reference" | "parent";
  is_required: boolean;
  owner_side: "source" | "target";
  notes: string;
};

const REL: RelRow[] = [
  // B6 — intra-domain (14). All workflow-critical; all reference/one_to_many.
  { data_object_id: 1,  related_data_object_id: 2,  relationship_verb: "is advertised through", inverse_verb: "advertises",              relationship_type: "one_to_many",  relationship_kind: "reference", is_required: true, owner_side: "source", notes: "intra | ATS | req opens, postings are children" },
  { data_object_id: 1,  related_data_object_id: 4,  relationship_verb: "receives",              inverse_verb: "is received by",          relationship_type: "one_to_many",  relationship_kind: "reference", is_required: true, owner_side: "source", notes: "intra | ATS | apps target a specific req" },
  { data_object_id: 2,  related_data_object_id: 4,  relationship_verb: "is applied to via",     inverse_verb: "is an application to",    relationship_type: "one_to_many",  relationship_kind: "reference", is_required: true, owner_side: "source", notes: "intra | ATS | app inflow is anchored on a posting" },
  { data_object_id: 3,  related_data_object_id: 4,  relationship_verb: "submits",               inverse_verb: "is submitted by",         relationship_type: "one_to_many",  relationship_kind: "reference", is_required: true, owner_side: "target", notes: "intra | ATS | candidate persists across applications" },
  { data_object_id: 6,  related_data_object_id: 3,  relationship_verb: "introduces",            inverse_verb: "was introduced by",       relationship_type: "one_to_many",  relationship_kind: "reference", is_required: true, owner_side: "target", notes: "intra | ATS | referral is the introduction event; candidate is durable" },
  { data_object_id: 5,  related_data_object_id: 3,  relationship_verb: "attributes",            inverse_verb: "was attributed from",     relationship_type: "one_to_many",  relationship_kind: "reference", is_required: true, owner_side: "target", notes: "intra | ATS | source-of-hire dimension on candidate" },
  { data_object_id: 13, related_data_object_id: 3,  relationship_verb: "sources",               inverse_verb: "was sourced by",          relationship_type: "one_to_many",  relationship_kind: "reference", is_required: true, owner_side: "target", notes: "intra | ATS | agency is the channel; candidate persists" },
  { data_object_id: 14, related_data_object_id: 3,  relationship_verb: "attracts",              inverse_verb: "was attracted at",        relationship_type: "one_to_many",  relationship_kind: "reference", is_required: true, owner_side: "target", notes: "intra | ATS | event is the touchpoint; candidate persists" },
  { data_object_id: 7,  related_data_object_id: 3,  relationship_verb: "groups",                inverse_verb: "is a member of",          relationship_type: "many_to_many", relationship_kind: "reference", is_required: true, owner_side: "target", notes: "intra | ATS | pool is a membership shell; candidate lives outside it" },
  { data_object_id: 4,  related_data_object_id: 8,  relationship_verb: "schedules",             inverse_verb: "is scheduled for",        relationship_type: "one_to_many",  relationship_kind: "reference", is_required: true, owner_side: "source", notes: "intra | ATS | interview belongs to the application's pipeline" },
  { data_object_id: 8,  related_data_object_id: 9,  relationship_verb: "is scored via",         inverse_verb: "scores",                  relationship_type: "one_to_many",  relationship_kind: "reference", is_required: true, owner_side: "source", notes: "intra | ATS | scorecards are children of the interview" },
  { data_object_id: 4,  related_data_object_id: 10, relationship_verb: "requires",              inverse_verb: "is required by",          relationship_type: "one_to_many",  relationship_kind: "reference", is_required: true, owner_side: "source", notes: "intra | ATS | assessment invitation belongs to the app's pipeline" },
  { data_object_id: 4,  related_data_object_id: 11, relationship_verb: "results in",            inverse_verb: "results from",            relationship_type: "one_to_many",  relationship_kind: "reference", is_required: true, owner_side: "source", notes: "intra | ATS | offer is the conversion of the application" },
  { data_object_id: 11, related_data_object_id: 12, relationship_verb: "is contingent on",      inverse_verb: "gates",                   relationship_type: "one_to_many",  relationship_kind: "reference", is_required: true, owner_side: "source", notes: "intra | ATS | background check gates offer-to-firm conversion" },

  // B7 — users edges (6) — master → users(748). All many_to_many (roles are per-user, multiple users per master).
  { data_object_id: 1,  related_data_object_id: 748, relationship_verb: "has recruiter and hiring manager", inverse_verb: "is assigned to as recruiter or hiring manager", relationship_type: "many_to_many", relationship_kind: "reference", is_required: true, owner_side: "source", notes: "users | ATS | recruiter + hiring_manager roles on the req" },
  { data_object_id: 4,  related_data_object_id: 748, relationship_verb: "has owning recruiter",             inverse_verb: "owns as recruiter",                            relationship_type: "many_to_many", relationship_kind: "reference", is_required: true, owner_side: "source", notes: "users | ATS | recruiter role on the application" },
  { data_object_id: 8,  related_data_object_id: 748, relationship_verb: "has coordinator and panelists",    inverse_verb: "participates in",                              relationship_type: "many_to_many", relationship_kind: "reference", is_required: true, owner_side: "source", notes: "users | ATS | coordinator + panelist roles on the interview" },
  { data_object_id: 9,  related_data_object_id: 748, relationship_verb: "has interviewer as author",        inverse_verb: "authors",                                      relationship_type: "many_to_many", relationship_kind: "reference", is_required: true, owner_side: "source", notes: "users | ATS | interviewer is the scorecard author" },
  { data_object_id: 11, related_data_object_id: 748, relationship_verb: "has approver",                     inverse_verb: "approves",                                     relationship_type: "many_to_many", relationship_kind: "reference", is_required: true, owner_side: "source", notes: "users | ATS | approver role on offer" },
  { data_object_id: 6,  related_data_object_id: 748, relationship_verb: "has referring employee",           inverse_verb: "submits",                                      relationship_type: "many_to_many", relationship_kind: "reference", is_required: true, owner_side: "source", notes: "users | ATS | referring_employee role on referral" },

  // B8 — outbound cross-domain payload→target (7). is_required = true when downstream materializes a record; false for analytical projections.
  { data_object_id: 11, related_data_object_id: 16,  relationship_verb: "spawns",   inverse_verb: "originates from",     relationship_type: "one_to_one",  relationship_kind: "reference", is_required: true,  owner_side: "source", notes: "cross | ATS→ONBOARDING | offer.accepted creates onboarding journey (high friction)" },
  { data_object_id: 11, related_data_object_id: 147, relationship_verb: "triggers", inverse_verb: "follows from",        relationship_type: "one_to_one",  relationship_kind: "reference", is_required: true,  owner_side: "source", notes: "cross | ATS→BEN-ADMIN | offer.accepted opens benefit enrollment" },
  { data_object_id: 11, related_data_object_id: 157, relationship_verb: "seeds",    inverse_verb: "starts with",         relationship_type: "one_to_one",  relationship_kind: "reference", is_required: true,  owner_side: "source", notes: "cross | ATS→COMP-MGMT | offer.signed seeds first compensation statement" },
  { data_object_id: 3,  related_data_object_id: 31,  relationship_verb: "becomes",  inverse_verb: "was hired as",        relationship_type: "one_to_one",  relationship_kind: "reference", is_required: true,  owner_side: "source", notes: "cross | ATS→HCM | candidate.hired creates employee record; identity handoff" },
  { data_object_id: 1,  related_data_object_id: 25,  relationship_verb: "updates",  inverse_verb: "is updated by",       relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "target", notes: "cross | ATS→SWP | requisition.filled feeds the demand-forecast actualization (analytical)" },
  { data_object_id: 1,  related_data_object_id: 43,  relationship_verb: "feeds",    inverse_verb: "is fed by",           relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "target", notes: "cross | ATS→PA | requisition.filled rolls into time-to-fill / hire-velocity KPIs (analytical)" },
  { data_object_id: 10, related_data_object_id: 291, relationship_verb: "informs",  inverse_verb: "is informed by",      relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "target", notes: "cross | ATS→TALENT-MGMT | assessment.completed contributes to talent risk assessment (analytical)" },
];

// ============================================================
// B11 — data_object_aliases (31 rows)
// Subagent draft at c:/tmp/ats_aliases_draft.json
// ============================================================
type AliasRow = { data_object_id: number; alias_name: string; alias_type: string; notes: string };

// alias_type enum is {synonym, industry_term, solution_term}. industry_term and
// solution_term require an industry_id/solution_id pointer respectively (DB check).
// For pan-industry / pan-vendor terms we use `synonym` and preserve provenance in notes.
const ALIASES: AliasRow[] = [
  // job_requisitions (1)
  { data_object_id: 1, alias_name: "Open Position",       alias_type: "synonym", notes: "industry shorthand for approved-and-funded role" },
  { data_object_id: 1, alias_name: "Job Req",             alias_type: "synonym", notes: "universal recruiter shorthand" },
  { data_object_id: 1, alias_name: "Headcount Request",   alias_type: "synonym", notes: "finance / HRBP framing emphasizing budget approval" },
  // job_postings (2)
  { data_object_id: 2, alias_name: "Job Ad",              alias_type: "synonym", notes: "externally-published version of a requisition" },
  { data_object_id: 2, alias_name: "Job Listing",         alias_type: "synonym", notes: "standard on aggregator boards (Indeed, LinkedIn)" },
  { data_object_id: 2, alias_name: "Career Site Posting", alias_type: "synonym", notes: "vendor-specific: iCIMS, SmartRecruiters distinguish branded career-site placements" },
  // candidates (3)
  { data_object_id: 3, alias_name: "Applicant",           alias_type: "synonym", notes: "generic; used by EEOC and OFCCP" },
  { data_object_id: 3, alias_name: "Prospect",            alias_type: "synonym", notes: "sourcing-CRM term before formal application" },
  { data_object_id: 3, alias_name: "Person",              alias_type: "synonym", notes: "vendor-specific: Workday Recruiting unified internal/external person record" },
  // job_applications (4)
  { data_object_id: 4, alias_name: "Submission",          alias_type: "synonym", notes: "vendor-specific: Bullhorn (staffing-oriented ATS)" },
  { data_object_id: 4, alias_name: "Candidacy",           alias_type: "synonym", notes: "practitioner term for the candidate-to-req relationship" },
  { data_object_id: 4, alias_name: "Job Application",     alias_type: "synonym", notes: "long-form; candidate-facing flows and EEOC reporting" },
  // recruitment_sources (5)
  { data_object_id: 5, alias_name: "Source of Hire",      alias_type: "synonym", notes: "standard recruiting-metrics term" },
  { data_object_id: 5, alias_name: "Source Channel",      alias_type: "synonym", notes: "marketing-influenced framing" },
  // candidate_referrals (6)
  { data_object_id: 6, alias_name: "Employee Referral",   alias_type: "synonym", notes: "most common variant; matches referral-bonus program language" },
  { data_object_id: 6, alias_name: "Refer-a-Friend",      alias_type: "synonym", notes: "informal; candidate-facing referral landing pages" },
  // talent_pools (7)
  { data_object_id: 7, alias_name: "Talent Community",    alias_type: "synonym", notes: "vendor-specific: Oracle Taleo, SuccessFactors brand opt-in pools" },
  { data_object_id: 7, alias_name: "Talent Pipeline",     alias_type: "synonym", notes: "sourcing-team term for curated nurture pool" },
  { data_object_id: 7, alias_name: "Candidate Pool",      alias_type: "synonym", notes: "generic; also OFCCP applicant-pool analyses" },
  // interviews (8)
  { data_object_id: 8, alias_name: "Interview Schedule",  alias_type: "synonym", notes: "emphasizes the session / loop / slot framing" },
  { data_object_id: 8, alias_name: "Onsite",              alias_type: "synonym", notes: "informal; tech-industry shorthand for full-day final loop" },
  // interview_scorecards (9)
  { data_object_id: 9, alias_name: "Interview Feedback",  alias_type: "synonym", notes: "vendor-specific: Lever, SmartRecruiters use 'Feedback'" },
  { data_object_id: 9, alias_name: "Evaluation Form",     alias_type: "synonym", notes: "structured-hiring rubric framing" },
  // candidate_assessments (10)
  { data_object_id: 10, alias_name: "Pre-Hire Assessment", alias_type: "synonym", notes: "I-O-psych / assessment-vendor standard term (HireVue, Criteria)" },
  { data_object_id: 10, alias_name: "Skills Test",         alias_type: "synonym", notes: "informal; common candidate-facing label" },
  { data_object_id: 10, alias_name: "Selection Procedure", alias_type: "synonym", notes: "regulatory: EEOC UGESP term for any hiring-criterion assessment" },
  // job_offers (11)
  { data_object_id: 11, alias_name: "Offer Letter",        alias_type: "synonym", notes: "most common candidate-facing term; emphasizes the documentary artifact" },
  { data_object_id: 11, alias_name: "Job Offer",           alias_type: "synonym", notes: "long-form; legal / comp / candidate communications" },
  // background_checks (12)
  { data_object_id: 12, alias_name: "Pre-Employment Screening", alias_type: "synonym", notes: "umbrella for criminal, credit, employment, education verification" },
  { data_object_id: 12, alias_name: "Consumer Report",          alias_type: "synonym", notes: "regulatory: FCRA term for reports from a consumer reporting agency" },
  { data_object_id: 12, alias_name: "Vetting",                  alias_type: "synonym", notes: "informal; UK/EMEA and security-cleared hiring shorthand" },
  // recruitment_agencies (13)
  { data_object_id: 13, alias_name: "Staffing Agency",     alias_type: "synonym", notes: "US term, particularly contingent/temp placements" },
  { data_object_id: 13, alias_name: "Search Firm",         alias_type: "synonym", notes: "executive search / retained recruiting framing" },
  { data_object_id: 13, alias_name: "Recruitment Vendor",  alias_type: "synonym", notes: "procurement / VMS framing under MSA governance" },
  // recruitment_events (14)
  { data_object_id: 14, alias_name: "Hiring Event",        alias_type: "synonym", notes: "umbrella for career fairs, open houses, hackathons, virtual hiring days" },
];

// ============================================================
// B4 — pattern-flag PATCHes (5 rows; 6 flag transitions)
// ============================================================
type PatchRow = { id: number; name: string; body: Row };

const B4: PatchRow[] = [
  { id: 3,  name: "candidates",            body: { has_personal_content: true } },
  { id: 4,  name: "job_applications",      body: { has_personal_content: true } },
  { id: 11, name: "job_offers",            body: { has_personal_content: true } },
  { id: 12, name: "background_checks",     body: { has_personal_content: true, has_submit_lock: true } },
  { id: 10, name: "candidate_assessments", body: { has_submit_lock: true } },
];

// ============================================================
// Main
// ============================================================
async function main() {
  console.log("ATS audit fix loader — starting");
  console.log("==================================");

  // --- A4 ---
  console.log("\n[A4] solution_capabilities — vendor × capability matrix fill");
  const exA4 = await get(
    "/solution_capabilities?solution_id=in.(190,191,226,227,228,229,230,231,232,233)&capability_id=in.(12,13,14,15,16,17)&select=solution_id,capability_id",
  );
  const exA4Keys = new Set(exA4.map(r => `${r.solution_id}|${r.capability_id}`));
  const newA4 = A4.filter(r => !exA4Keys.has(`${r.solution_id}|${r.capability_id}`));
  console.log(`  existing: ${exA4.length}; proposed: ${A4.length}; to insert: ${newA4.length}`);
  if (newA4.length > 0) await insertChunked("/solution_capabilities", newA4);

  // --- REL (B6 + B7 + B8) ---
  console.log("\n[B6+B7+B8] data_object_relationships — 27 edges across intra/users/cross-domain");
  const relIds = Array.from(new Set(REL.flatMap(r => [r.data_object_id, r.related_data_object_id]))).join(",");

  // CLEANUP — earlier runs created placeholder rows with empty relationship_verb.
  // Delete only rows whose pair is in our exact in-scope set AND verb is empty.
  // Pre-existing edges in the catalog (e.g. "org_units groups employees") have non-empty
  // verbs and are untouched. We re-query each pair set to keep the DELETE filter narrow.
  const placeholders = await get(
    `/data_object_relationships?data_object_id=in.(${relIds})&related_data_object_id=in.(${relIds})&relationship_verb=eq.&select=id`,
  );
  if (placeholders.length > 0) {
    const placeholderIds = placeholders.map(r => r.id).join(",");
    console.log(`  cleanup: deleting ${placeholders.length} placeholder rows (empty relationship_verb) by id`);
    await call({ method: "DELETE", path: `/data_object_relationships?id=in.(${placeholderIds})` });
  }

  const exREL = await get(
    `/data_object_relationships?data_object_id=in.(${relIds})&related_data_object_id=in.(${relIds})&select=data_object_id,related_data_object_id,relationship_verb`,
  );
  const exRELKeys = new Set(
    exREL.map(r => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`),
  );
  const newREL = REL.filter(
    r => !exRELKeys.has(`${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`),
  );
  console.log(`  existing (in this id set, post-cleanup): ${exREL.length}; proposed: ${REL.length}; to insert: ${newREL.length}`);
  if (newREL.length > 0) await insertChunked("/data_object_relationships", newREL);

  // --- B11 ---
  console.log("\n[B11] data_object_aliases — 31 aliases across 14 masters");
  const exB11 = await get(
    "/data_object_aliases?data_object_id=in.(1,2,3,4,5,6,7,8,9,10,11,12,13,14)&select=data_object_id,alias_name",
  );
  const exB11Keys = new Set(exB11.map(r => `${r.data_object_id}|${r.alias_name}`));
  const newB11 = ALIASES.filter(r => !exB11Keys.has(`${r.data_object_id}|${r.alias_name}`));
  console.log(`  existing: ${exB11.length}; proposed: ${ALIASES.length}; to insert: ${newB11.length}`);
  if (newB11.length > 0) await insertChunked("/data_object_aliases", newB11);

  // --- B4 ---
  console.log("\n[B4] data_objects — pattern flag PATCHes");
  for (const p of B4) {
    const flags = Object.entries(p.body).map(([k, v]) => `${k}=${v}`).join(", ");
    console.log(`  PATCH id=${p.id} (${p.name}): ${flags}`);
    await patchById("data_objects", p.id, p.body);
  }

  // --- Verification ---
  console.log("\n==================================");
  console.log("Verification");
  console.log("==================================");

  const verA4 = await get(
    "/solution_capabilities?solution_id=in.(190,191,226,227,228,229,230,231,232,233)&capability_id=in.(12,13,14,15,16,17)&select=solution_id,capability_id",
  );
  console.log(`  A4 matrix cells now present: ${verA4.length} (target: 60 [10 solutions × 6 capabilities]; pre-load workday rows count as already covered if their cells were filled)`);

  const verREL = await get(
    `/data_object_relationships?data_object_id=in.(${relIds})&related_data_object_id=in.(${relIds})&select=data_object_id,related_data_object_id`,
  );
  console.log(`  B6+B7+B8 edges in scope: ${verREL.length} (target: ≥ 27)`);

  const verB11 = await get(
    "/data_object_aliases?data_object_id=in.(1,2,3,4,5,6,7,8,9,10,11,12,13,14)&select=data_object_id,alias_name",
  );
  console.log(`  B11 alias rows in scope: ${verB11.length} (target: ≥ 31)`);

  const verB4 = await get(
    "/data_objects?id=in.(3,4,10,11,12)&select=id,data_object_name,has_personal_content,has_submit_lock",
  );
  console.log("  B4 flag state after PATCH:");
  for (const r of verB4) {
    console.log(`    id=${r.id} ${r.data_object_name}: personal_content=${r.has_personal_content}, submit_lock=${r.has_submit_lock}`);
  }

  console.log("\n==================================");
  console.log("UI links for spot-check");
  console.log("==================================");
  console.log("  https://tests.semantius.app/domain_map/solution_capabilities");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("\nDone.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
