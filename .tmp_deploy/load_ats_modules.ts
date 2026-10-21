#!/usr/bin/env bun
// load_ats_modules.ts — plan-modules.md §11 step 3 (foundation pass, no skills).
//
// Loads ATS as the first worked-example modularization:
//   1. Create pre_employees data_object (mastered by ATS-PRE-EMPLOYEE-RECORD; see §7.1 rename note)
//   2. Insert 8 domain_modules rows
//   3. Insert 7 domain_module_capabilities rows (ATS-BACKGROUND-CHECKS deliberately gets 0; §10 TODO)
//   4. Insert ~30 domain_module_data_objects rows (§7.1 table)
//   5. Insert 2 domain_starter_modules rows (§7.2)
//   6. PATCH 3 data_object_lifecycle_states.domain_module_id (§7.4: interviewing, offer_extended, hired)
//   7. PATCH 3 data_objects.minimum_embedded_shape contracts (§7.5: candidates, job_applications, job_offers)
//   8. Create pre_employee.activated trigger_event + the ATS-PRE-EMPLOYEE-RECORD → HCM handoff (§6.1)
//
// Per-module system skills (§7.7) deferred to a separate loader.
//
// Idempotent: every step reads first, only writes what's missing. Re-running is safe.
// Run from project root: bun run c:/dev/domain-map/.tmp_deploy/load_ats_modules.ts

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

// ============================================================
// 0. Resolve the maps we'll need throughout
// ============================================================
console.log("=== 0. Resolving FK maps ===");

const ATS_DOMAIN_ID = 56;
const HCM_DOMAIN_ID = 54;

const capRows: Row[] = await postgrest(
  "GET",
  "/capabilities?capability_code=in.(REQ-MGMT,SOURCING,CANDIDATE-EXP,INTERVIEW-MGMT,OFFER-MGMT,AI-RECRUIT)&select=id,capability_code",
) ?? [];
const capId: Record<string, number> = {};
for (const r of capRows) capId[String(r.capability_code)] = Number(r.id);
console.log(`  capabilities: ${Object.keys(capId).length} resolved`);

const doNames = [
  "candidates", "recruitment_sources", "recruitment_agencies", "recruitment_events",
  "talent_pools", "candidate_referrals",
  "job_requisitions", "job_postings", "job_applications",
  "hcm_positions", "org_units",
  "interviews", "interview_scorecards", "candidate_assessments",
  "job_offers", "salary_bands",
  "background_checks",
  "pre_employees",
];
const doRows: Row[] = await postgrest(
  "GET",
  `/data_objects?data_object_name=in.(${doNames.join(",")})&select=id,data_object_name`,
) ?? [];
const doId: Record<string, number> = {};
for (const r of doRows) doId[String(r.data_object_name)] = Number(r.id);
console.log(`  data_objects: ${Object.keys(doId).length} of ${doNames.length} present pre-load`);

// ============================================================
// 1. Create pre_employees data_object if missing
// ============================================================
console.log("\n=== 1. pre_employees data_object ===");

if (!doId["pre_employees"]) {
  console.log("  ✨ creating pre_employees");
  await postgrest("POST", "/data_objects", {
    data_object_name: "pre_employees",
    singular_label: "Pre-Employee",
    plural_label: "Pre-Employees",
    display_label: "Pre-Employee",
    description:
      "ATS-owned pre-employment record covering the post-offer-acceptance / pre-start-date window — paperwork in flight, background check pending, pre-boarding tasks open, start date not yet reached. At start-date the pre-employee row is reconciled into HCM-mastered `employees` (the canonical employee record). Mastered by `ATS-PRE-EMPLOYEE-RECORD` (formerly `NEW-HIRE-HANDOFF` — renamed in plan-modules.md §7.1 because HCM canonically masters `employees`; ATS owns the *pre-employee* lifecycle stage).",
    kind: "domain_owned",
    is_canonical_bare_word: false,
  });
  const [created] = await postgrest("GET", "/data_objects?data_object_name=eq.pre_employees&select=id") ?? [];
  doId["pre_employees"] = Number(created.id);
  console.log(`  ✓ pre_employees id=${doId["pre_employees"]}`);
} else {
  console.log(`  ♻ pre_employees already exists (id=${doId["pre_employees"]})`);
}

// ============================================================
// 2. Insert 8 domain_modules rows
// ============================================================
console.log("\n=== 2. domain_modules (8 rows) ===");

type ModuleSpec = {
  code: string;
  name: string;
  description: string;
};

const modules: ModuleSpec[] = [
  {
    code: "ATS-CANDIDATE-CRM",
    name: "Candidate CRM",
    description:
      "The candidate-relationship backbone of an ATS — masters candidates (including the `prospect` lifecycle state), recruitment sources, agencies, and events. Structurally the same shape as standalone candidate-CRM products (Beamery, Avature CRM). Folds the AI-RECRUIT capability (resume parsing, ML matching, screening assistants) since those tools operate on `candidates` and are tightly bound to candidate workflows.",
  },
  {
    code: "ATS-TALENT-POOLS",
    name: "Talent Pools",
    description:
      "Curated candidate groupings for nurture and pipeline-building (`talent_pools`). Embedded-masters `candidates`; deployed alone, materializes a thin candidate shell. Mirrors standalone talent-acquisition CRM products.",
  },
  {
    code: "ATS-REFERRALS",
    name: "Employee Referrals",
    description:
      "Employee-driven candidate sourcing with referral-bonus tracking (`candidate_referrals`). Embedded-masters `candidates`. Cross-domain handoffs to PAYROLL (bonus payout) and EMP-EXP (engagement signal).",
  },
  {
    code: "ATS-RECRUITMENT-PIPELINE",
    name: "Recruitment Pipeline",
    description:
      "Requisitions → postings → applications with pipeline-stage lifecycle. Realizes REQ-MGMT and CANDIDATE-EXP (application flow slice). Embedded-masters `candidates`, optionally `hcm_positions` and `org_units` for canonical position/org context.",
  },
  {
    code: "ATS-INTERVIEWS",
    name: "Interviews",
    description:
      "Interview scheduling, panel coordination, scorecards, and structured assessments. Realizes INTERVIEW-MGMT. Realizes the `interviewing` lifecycle state on `job_applications` (state pruned when this module is not installed).",
  },
  {
    code: "ATS-OFFERS",
    name: "Offers",
    description:
      "Offer drafting, approval, extension, signature, and acceptance. Realizes OFFER-MGMT. Realizes the `offer_extended` state on `job_applications`. Requires an external `sign_document` tool — drops module Semantius coverage to ~83%.",
  },
  {
    code: "ATS-BACKGROUND-CHECKS",
    name: "Background Checks",
    description:
      "Pre-employment background-check orchestration with adverse-action workflow. No current ATS capability covers compliance / background-checks — flagged as a §10 capability-layer audit gap. Requires `send_email` for adverse-action notices — drops coverage to ~75%.",
  },
  {
    code: "ATS-PRE-EMPLOYEE-RECORD",
    name: "Pre-Employee Record",
    description:
      "The bridge between offer-accepted and start-date — ATS owns the pre-employee lifecycle stage (paperwork in flight, pre-boarding tasks open, background check pending). Realizes the `hired` state on `job_applications`. Publishes the `pre_employee.activated` event that hands the canonical reconciliation to HCM-mastered `employees`. Formerly NEW-HIRE-HANDOFF — renamed per §7.1 because HCM canonically masters `employees`.",
  },
];

for (const m of modules) {
  const [existing] = await postgrest(
    "GET",
    `/domain_modules?domain_module_code=eq.${m.code}&select=id`,
  ) ?? [];
  if (existing) {
    console.log(`  ♻ ${m.code} (id=${existing.id})`);
    continue;
  }
  console.log(`  ✨ ${m.code}`);
  await postgrest("POST", "/domain_modules", {
    domain_module_code: m.code,
    domain_module_name: m.name,
    domain_id: ATS_DOMAIN_ID,
    description: m.description,
  });
}

const modRows: Row[] = await postgrest(
  "GET",
  `/domain_modules?domain_module_code=in.(${modules.map((m) => m.code).join(",")})&select=id,domain_module_code`,
) ?? [];
const modId: Record<string, number> = {};
for (const r of modRows) modId[String(r.domain_module_code)] = Number(r.id);
console.log(`  ${Object.keys(modId).length} of ${modules.length} module IDs resolved`);

// ============================================================
// 3. domain_module_capabilities (7 rows)
// ============================================================
console.log("\n=== 3. domain_module_capabilities (7 rows) ===");

type ModCap = { module: string; capability: string; notes?: string };

const moduleCapabilities: ModCap[] = [
  { module: "ATS-CANDIDATE-CRM", capability: "SOURCING", notes: "Candidate sourcing and source attribution." },
  { module: "ATS-CANDIDATE-CRM", capability: "CANDIDATE-EXP", notes: "Candidate-facing CRM touchpoints." },
  { module: "ATS-CANDIDATE-CRM", capability: "AI-RECRUIT", notes: "AI-RECRUIT folded into CANDIDATE-CRM (resume parsing, ML matching, screening assistants operate on candidates). See plan-modules.md §7.1." },
  { module: "ATS-TALENT-POOLS", capability: "SOURCING", notes: "Pool/nurture slice of sourcing." },
  { module: "ATS-REFERRALS", capability: "SOURCING", notes: "Referral-program slice of sourcing." },
  { module: "ATS-RECRUITMENT-PIPELINE", capability: "REQ-MGMT", notes: "Full requisition + posting + application workflow." },
  { module: "ATS-RECRUITMENT-PIPELINE", capability: "CANDIDATE-EXP", notes: "Application flow slice of candidate experience." },
  { module: "ATS-INTERVIEWS", capability: "INTERVIEW-MGMT" },
  { module: "ATS-OFFERS", capability: "OFFER-MGMT" },
  // ATS-BACKGROUND-CHECKS deliberately omitted — §10 capability-layer audit TODO
  // ATS-PRE-EMPLOYEE-RECORD shares OFFER-MGMT (pre-hire-workflows slice from the OFFER-MGMT description)
  { module: "ATS-PRE-EMPLOYEE-RECORD", capability: "OFFER-MGMT", notes: "Pre-hire-workflows slice of OFFER-MGMT (the post-acceptance / pre-start-date window). See plan-modules.md §7.1." },
];

const existingCaps: Row[] = await postgrest(
  "GET",
  `/domain_module_capabilities?domain_module_id=in.(${Object.values(modId).join(",")})&select=domain_module_id,capability_id`,
) ?? [];
const seenCapPairs = new Set(existingCaps.map((r) => `${r.domain_module_id}:${r.capability_id}`));

for (const mc of moduleCapabilities) {
  const moduleId = modId[mc.module];
  const capabilityId = capId[mc.capability];
  if (!moduleId || !capabilityId) {
    console.log(`  ⚠ skip ${mc.module} ↔ ${mc.capability} (unresolved)`);
    continue;
  }
  const key = `${moduleId}:${capabilityId}`;
  if (seenCapPairs.has(key)) {
    console.log(`  ♻ ${mc.module} ↔ ${mc.capability}`);
    continue;
  }
  console.log(`  ✨ ${mc.module} ↔ ${mc.capability}`);
  const body: Row = { domain_module_id: moduleId, capability_id: capabilityId };
  if (mc.notes) body.notes = mc.notes;
  await postgrest("POST", "/domain_module_capabilities", body);
}

// ============================================================
// 4. domain_module_data_objects (~30 rows)
// ============================================================
console.log("\n=== 4. domain_module_data_objects ===");

type ModDO = {
  module: string;
  dataObject: string;
  role: "master" | "embedded_master" | "contributor" | "consumer" | "derived";
  necessity?: "required" | "optional";
  notes?: string;
};

const moduleDataObjects: ModDO[] = [
  // ATS-CANDIDATE-CRM
  { module: "ATS-CANDIDATE-CRM", dataObject: "candidates", role: "master" },
  { module: "ATS-CANDIDATE-CRM", dataObject: "recruitment_sources", role: "master" },
  { module: "ATS-CANDIDATE-CRM", dataObject: "recruitment_agencies", role: "master" },
  { module: "ATS-CANDIDATE-CRM", dataObject: "recruitment_events", role: "master" },

  // ATS-TALENT-POOLS
  { module: "ATS-TALENT-POOLS", dataObject: "talent_pools", role: "master" },
  { module: "ATS-TALENT-POOLS", dataObject: "candidates", role: "embedded_master", necessity: "required" },

  // ATS-REFERRALS
  { module: "ATS-REFERRALS", dataObject: "candidate_referrals", role: "master" },
  { module: "ATS-REFERRALS", dataObject: "candidates", role: "embedded_master", necessity: "required" },

  // ATS-RECRUITMENT-PIPELINE
  { module: "ATS-RECRUITMENT-PIPELINE", dataObject: "job_requisitions", role: "master" },
  { module: "ATS-RECRUITMENT-PIPELINE", dataObject: "job_postings", role: "master" },
  { module: "ATS-RECRUITMENT-PIPELINE", dataObject: "job_applications", role: "master" },
  { module: "ATS-RECRUITMENT-PIPELINE", dataObject: "candidates", role: "embedded_master", necessity: "required" },
  { module: "ATS-RECRUITMENT-PIPELINE", dataObject: "hcm_positions", role: "embedded_master", necessity: "optional", notes: "Without HCM-WORKER-RECORD deployed, requisitions function with a local position shell." },
  { module: "ATS-RECRUITMENT-PIPELINE", dataObject: "org_units", role: "embedded_master", necessity: "optional", notes: "Without HCM org structure, requisitions function with a flat or local org-unit reference." },

  // ATS-INTERVIEWS
  { module: "ATS-INTERVIEWS", dataObject: "interviews", role: "master" },
  { module: "ATS-INTERVIEWS", dataObject: "interview_scorecards", role: "master" },
  { module: "ATS-INTERVIEWS", dataObject: "candidate_assessments", role: "master", notes: "Structured pre-/during-interview assessments. Distinct from scorecards (per-interview feedback)." },
  { module: "ATS-INTERVIEWS", dataObject: "candidates", role: "embedded_master", necessity: "required" },
  { module: "ATS-INTERVIEWS", dataObject: "job_applications", role: "embedded_master", necessity: "required" },

  // ATS-OFFERS
  { module: "ATS-OFFERS", dataObject: "job_offers", role: "master" },
  { module: "ATS-OFFERS", dataObject: "candidates", role: "embedded_master", necessity: "required" },
  { module: "ATS-OFFERS", dataObject: "job_applications", role: "embedded_master", necessity: "required" },
  { module: "ATS-OFFERS", dataObject: "salary_bands", role: "embedded_master", necessity: "optional", notes: "Without COMP-MGMT, offers go out without the guidance overlay (offers still function fine). See plan-modules.md §4.4 example." },

  // ATS-BACKGROUND-CHECKS
  { module: "ATS-BACKGROUND-CHECKS", dataObject: "background_checks", role: "master" },
  { module: "ATS-BACKGROUND-CHECKS", dataObject: "candidates", role: "embedded_master", necessity: "required" },
  { module: "ATS-BACKGROUND-CHECKS", dataObject: "job_offers", role: "embedded_master", necessity: "required" },

  // ATS-PRE-EMPLOYEE-RECORD
  { module: "ATS-PRE-EMPLOYEE-RECORD", dataObject: "pre_employees", role: "master" },
  { module: "ATS-PRE-EMPLOYEE-RECORD", dataObject: "candidates", role: "embedded_master", necessity: "required" },
  { module: "ATS-PRE-EMPLOYEE-RECORD", dataObject: "job_offers", role: "embedded_master", necessity: "required" },
];

const existingMDO: Row[] = await postgrest(
  "GET",
  `/domain_module_data_objects?domain_module_id=in.(${Object.values(modId).join(",")})&select=domain_module_id,data_object_id`,
) ?? [];
const seenMDO = new Set(existingMDO.map((r) => `${r.domain_module_id}:${r.data_object_id}`));

let mdoAdded = 0;
for (const mdo of moduleDataObjects) {
  const moduleId = modId[mdo.module];
  const dataObjectId = doId[mdo.dataObject];
  if (!moduleId || !dataObjectId) {
    console.log(`  ⚠ skip ${mdo.module} / ${mdo.dataObject} (unresolved)`);
    continue;
  }
  const key = `${moduleId}:${dataObjectId}`;
  if (seenMDO.has(key)) continue;
  const body: Row = {
    domain_module_id: moduleId,
    data_object_id: dataObjectId,
    role: mdo.role,
  };
  // necessity defaults to required (matches catalog convention); only set explicitly for optional rows
  if (mdo.necessity) body.necessity = mdo.necessity;
  if (mdo.notes) body.notes = mdo.notes;
  await postgrest("POST", "/domain_module_data_objects", body);
  mdoAdded++;
}
console.log(`  ✨ ${mdoAdded} new / ♻ ${seenMDO.size} existing (${moduleDataObjects.length} total)`);

// ============================================================
// 5. domain_starter_modules (2 rows)
// ============================================================
console.log("\n=== 5. domain_starter_modules (2 rows) ===");

type StarterRow = { module: string; position: number; notes: string };

const starter: StarterRow[] = [
  {
    module: "ATS-CANDIDATE-CRM",
    position: 1,
    notes: "The entity backbone — start here. Provides candidates, prospects, sourcing.",
  },
  {
    module: "ATS-RECRUITMENT-PIPELINE",
    position: 2,
    notes: "Adds requisitions, postings, applications, the pipeline-stage workflow. With these two installed you have a minimum recognizable ATS.",
  },
];

const existingStarter: Row[] = await postgrest(
  "GET",
  `/domain_starter_modules?domain_id=eq.${ATS_DOMAIN_ID}&select=domain_module_id,position`,
) ?? [];
const seenStarter = new Set(existingStarter.map((r) => String(r.domain_module_id)));

for (const s of starter) {
  const moduleId = modId[s.module];
  if (!moduleId) continue;
  if (seenStarter.has(String(moduleId))) {
    console.log(`  ♻ position ${s.position} ${s.module}`);
    continue;
  }
  console.log(`  ✨ position ${s.position} ${s.module}`);
  await postgrest("POST", "/domain_starter_modules", {
    domain_id: ATS_DOMAIN_ID,
    domain_module_id: moduleId,
    position: s.position,
    notes: s.notes,
  });
}

// ============================================================
// 6. Annotate lifecycle states with domain_module_id (§7.4)
// ============================================================
console.log("\n=== 6. lifecycle state annotations ===");

// job_applications lifecycle: interviewing → ATS-INTERVIEWS, offer_extended → ATS-OFFERS,
// hired → ATS-PRE-EMPLOYEE-RECORD. Other states (applied, screening, rejected, withdrawn)
// stay NULL — reachable when ATS-RECRUITMENT-PIPELINE (the master) is installed alone.
const lifecycleAnnotations: Array<{ stateName: string; module: string }> = [
  { stateName: "interviewing", module: "ATS-INTERVIEWS" },
  { stateName: "offer_extended", module: "ATS-OFFERS" },
  { stateName: "hired", module: "ATS-PRE-EMPLOYEE-RECORD" },
];

const jobApplicationsId = doId["job_applications"];
for (const a of lifecycleAnnotations) {
  const [state] = await postgrest(
    "GET",
    `/data_object_lifecycle_states?data_object_id=eq.${jobApplicationsId}&state_name=eq.${a.stateName}&select=id,domain_module_id`,
  ) ?? [];
  if (!state) {
    console.log(`  ⚠ skip ${a.stateName} (not found)`);
    continue;
  }
  if (state.domain_module_id) {
    console.log(`  ♻ job_applications.${a.stateName} already annotated (module ${state.domain_module_id})`);
    continue;
  }
  const moduleId = modId[a.module];
  console.log(`  ✨ job_applications.${a.stateName} → ${a.module}`);
  await postgrest("PATCH", `/data_object_lifecycle_states?id=eq.${state.id}`, {
    domain_module_id: moduleId,
  });
}

// ============================================================
// 7. minimum_embedded_shape contracts (§7.5)
// ============================================================
console.log("\n=== 7. minimum_embedded_shape contracts ===");

const minShapes: Array<{ name: string; markdown: string }> = [
  {
    name: "candidates",
    markdown: `Minimum embedded-shape contract for \`candidates\` — every module that embedded_masters this data_object MUST include these fields in its local-master shell. Modules may extend with additional fields; they may not omit any of these.

- \`id\` — primary key, unique within the local shell.
- \`legal_name\` — GDPR-relevant subject identifier; required for adverse-action notices and offer documents.
- \`email\` — primary contact; required for every outbound communication (offers, scorecard requests, adverse-action).
- \`phone\` — fallback contact channel; required for background-check vendor handoffs.
- \`primary_source_id\` — FK to \`recruitment_sources\` (or NULL on direct applications); required for source-attribution analytics and referral-bonus eligibility.
- \`consent_status\` — GDPR/CCPA-relevant; required to gate processing of personal data when the canonical master is not deployed (the embedded shell otherwise has no consent surface).
- \`created_at\` — required to compute time-to-* metrics consistently across modules.

When the canonical master \`ATS-CANDIDATE-CRM\` is installed, the full required set of \`candidates\` is a superset of this minimum (additional fields: middle_name, address, work_authorization, source_attribution_details, …). Modules deployed without the canonical master see only the minimum.`,
  },
  {
    name: "job_applications",
    markdown: `Minimum embedded-shape contract for \`job_applications\` — the junction record between a candidate and a requisition with the pipeline-stage lifecycle. Modules that embedded_master applications need the junction-key subset:

- \`id\` — primary key.
- \`candidate_id\` — FK to \`candidates\`; required (the "who" of the application).
- \`requisition_id\` — FK to \`job_requisitions\`; required (the "what" of the application).
- \`current_stage\` — current pipeline lifecycle state (\`applied\`, \`screening\`, \`interviewing\`, \`offer_extended\`, \`hired\`, \`rejected\`, \`withdrawn\`); required for any module-level workflow that branches on stage (ATS-INTERVIEWS reads this to know when an interview can be scheduled).
- \`applied_at\` — required for time-to-* metrics and SLA enforcement.

The canonical master \`ATS-RECRUITMENT-PIPELINE\` extends with source_attribution, screening_result, rejection_reason, etc. — modules deployed standalone see only the junction-key subset.`,
  },
  {
    name: "job_offers",
    markdown: `Minimum embedded-shape contract for \`job_offers\` — modules that embedded_master offers (\`ATS-BACKGROUND-CHECKS\`, \`ATS-PRE-EMPLOYEE-RECORD\`) need the offer-state subset:

- \`id\` — primary key.
- \`candidate_id\` — FK to \`candidates\`; required (offer addressee).
- \`application_id\` — FK to \`job_applications\`; required (the application this offer resolves).
- \`requisition_id\` — FK to \`job_requisitions\`; required for downstream reporting (offer-acceptance-rate by requisition).
- \`state\` — offer lifecycle state (\`draft\`, \`approved\`, \`extended\`, \`accepted\`, \`declined\`, \`rescinded\`); modules read this to gate their own behavior (BACKGROUND-CHECKS only runs after \`extended\` or \`accepted\`; PRE-EMPLOYEE-RECORD is only created when \`state = accepted\`).
- \`extended_at\` — required to compute time-to-accept and time-to-start metrics.

The canonical master \`ATS-OFFERS\` extends with compensation_components, signature_url, decline_reason, etc.`,
  },
];

for (const s of minShapes) {
  const objId = doId[s.name];
  if (!objId) {
    console.log(`  ⚠ skip ${s.name} (id not resolved)`);
    continue;
  }
  const [row] = await postgrest(
    "GET",
    `/data_objects?id=eq.${objId}&select=id,minimum_embedded_shape`,
  ) ?? [];
  const existing = (row?.minimum_embedded_shape as string | null) ?? "";
  if (existing.trim().length > 0) {
    console.log(`  ♻ ${s.name} already has minimum_embedded_shape (${existing.length} chars)`);
    continue;
  }
  console.log(`  ✨ ${s.name} ← minimum_embedded_shape (${s.markdown.length} chars)`);
  await postgrest("PATCH", `/data_objects?id=eq.${objId}`, {
    minimum_embedded_shape: s.markdown,
  });
}

// ============================================================
// 8. pre_employee.activated trigger_event + ATS → HCM handoff
// ============================================================
console.log("\n=== 8. pre_employee.activated trigger_event + handoff ===");

const preEmpModuleId = modId["ATS-PRE-EMPLOYEE-RECORD"];
const preEmpDOId = doId["pre_employees"];

// 8a. Create the trigger event
let triggerEventId: number | undefined;
const [existingEvt] = await postgrest(
  "GET",
  `/trigger_events?event_name=eq.pre_employee.activated&select=id,domain_module_id`,
) ?? [];
if (existingEvt) {
  triggerEventId = Number(existingEvt.id);
  console.log(`  ♻ trigger_event pre_employee.activated (id=${triggerEventId})`);
  if (!existingEvt.domain_module_id) {
    await postgrest("PATCH", `/trigger_events?id=eq.${triggerEventId}`, {
      domain_module_id: preEmpModuleId,
    });
    console.log(`    ↳ patched domain_module_id → ${preEmpModuleId}`);
  }
} else {
  console.log("  ✨ trigger_event pre_employee.activated");
  await postgrest("POST", "/trigger_events", {
    event_name: "pre_employee.activated",
    data_object_id: preEmpDOId,
    event_category: "state_change",
    from_state: "in_progress",
    to_state: "activated",
    domain_module_id: preEmpModuleId,
    description:
      "Pre-employee record reaches the activation milestone (paperwork complete, background check cleared, start date reached). Published by ATS-PRE-EMPLOYEE-RECORD; HCM consumes to create the canonical `employees` row.",
  });
  const [created] = await postgrest(
    "GET",
    "/trigger_events?event_name=eq.pre_employee.activated&select=id",
  ) ?? [];
  triggerEventId = Number(created.id);
  console.log(`    ↳ id=${triggerEventId}`);
}

// 8b. Create the handoff
const [existingHandoff] = await postgrest(
  "GET",
  `/cross_domain_handoffs?source_domain_id=eq.${ATS_DOMAIN_ID}&target_domain_id=eq.${HCM_DOMAIN_ID}&trigger_event_id=eq.${triggerEventId}&select=id,source_domain_module_id`,
) ?? [];
if (existingHandoff) {
  console.log(`  ♻ handoff exists (id=${existingHandoff.id})`);
  if (!existingHandoff.source_domain_module_id) {
    await postgrest("PATCH", `/cross_domain_handoffs?id=eq.${existingHandoff.id}`, {
      source_domain_module_id: preEmpModuleId,
    });
    console.log(`    ↳ patched source_domain_module_id → ${preEmpModuleId}`);
  }
} else {
  console.log("  ✨ handoff ATS-PRE-EMPLOYEE-RECORD → HCM");
  await postgrest("POST", "/cross_domain_handoffs", {
    source_domain_id: ATS_DOMAIN_ID,
    target_domain_id: HCM_DOMAIN_ID,
    data_object_id: preEmpDOId,
    trigger_event_id: triggerEventId,
    source_domain_module_id: preEmpModuleId,
    // target_domain_module_id stays NULL — HCM not yet modularized (backfilled later)
    integration_pattern: "event_stream",
    friction_level: "medium",
    description:
      "Pre-employee activation hands the canonical reconciliation to HCM-mastered `employees`. ATS owns the pre-employee lifecycle stage (paperwork, background check, pre-boarding); at start-date the pre_employee row is reconciled into the HCM employee record. Identifier mapping (pre_employee_id → employee_id) is the canonical reconciliation gap. Replaces / complements the older candidate.hired and job_offer.accepted handoffs by carrying the proper post-acceptance reconciliation milestone.",
    notes:
      "target_domain_module_id will be set to HCM-WORKER-RECORD once HCM is modularized (plan-modules.md §11 step 6 / Phase 2).",
  });
}

console.log("\n✓ load_ats_modules.ts complete.");
console.log("Verify via:");
console.log(`  semantius call crud postgrestRequest '{"method":"GET","path":"/domain_modules?domain_id=eq.${ATS_DOMAIN_ID}&select=id,domain_module_code,domain_module_name&order=domain_module_code.asc"}'`);
console.log(`  semantius call crud postgrestRequest '{"method":"GET","path":"/domain_module_data_objects?select=domain_module_id,data_object_id,role,necessity,domain_modules!inner(domain_module_code,domain_id),data_objects(data_object_name)&domain_modules.domain_id=eq.${ATS_DOMAIN_ID}&order=domain_module_id.asc,role.asc"}'`);
