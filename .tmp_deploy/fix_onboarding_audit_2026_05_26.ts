#!/usr/bin/env bun
// ONBOARDING audit fix-load (gap report c:/tmp/onboarding_audit_2026_05_26.md).
//
// Idempotent. Re-runnable. Each phase checks live state before writing.
//
// Phases:
//   1. CLAUDE.md hygiene — strip em-dashes from domain 99 description
//   2. M3        — 3 domain_starter_modules rows
//   3. B4        — pattern flags on 4 masters (has_personal_content=true)
//   4. B10b      — backfill source/target module FKs on 10 outbound handoffs
//                  + intra-domain handoff add later (phase 6)
//   5. PAIRWISE  — counterparty DMDO consumer rows on HCM (22), ITSM (18), PAYROLL (16+22)
//   6. B9b       — 4 intra-domain handoff rows
//   7. B9        — 4 missing-subscriber handoffs (events 379-382)
//   8. F2/F3     — 3 per-module system skills + tools + skill_tools
//   9. F7/F1     — retire legacy skill (id 90) after F2/F3 land

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

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

async function post(path: string, rows: Row[]): Promise<Row[]> {
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

// ============================================================
// CONSTANTS — IDs verified against live state 2026-05-26
// ============================================================
const ONBOARDING_ID = 99;
const MOD_JOURNEY = 35; // ONB-JOURNEY-MGMT
const MOD_DOC_INTAKE = 36; // ONB-DOCUMENT-INTAKE
const MOD_WELCOME = 37; // ONB-WELCOME-EXPERIENCE

const ITSM_SERVICE_REQUEST = 39;
const HCM_CORE_WORKER = 54;
const PAYROLL_RUN = 90;
const LMS_COMPLIANCE_TRAINING = 33;
const EMP_EXP_LISTEN = 64;
const IWMS_WORKPLACE_DESK = 101;
const HRSD_CASE_MGMT = 75;

// data_objects
const DO_ONBOARDING_PLANS = 15;
const DO_ONBOARDING_JOURNEYS = 16;
const DO_ONBOARDING_STAGES = 17;
const DO_ONBOARDING_TASKS = 18;
const DO_BUDDY_ASSIGNMENTS = 19;
const DO_ONBOARDING_COHORTS = 20;
const DO_WELCOME_COMMUNICATIONS = 21;
const DO_ONBOARDING_DOCUMENT_COLLECTIONS = 22;

// trigger_events
const EV_JOURNEY_DAY_ONE_REACHED = 69;
const EV_TASK_ACCESS_PROV = 135;
const EV_TASK_COMPLIANCE_TRAINING = 136;
const EV_TASK_ESCALATION = 137;
const EV_TASK_IT_PROV = 138;
const EV_TASK_WORKPLACE_SETUP = 139;
const EV_PLAN_ACTIVATED = 378;
const EV_STAGE_COMPLETED = 379;
const EV_BUDDY_ACTIVATED = 380;
const EV_COHORT_ACTIVATED = 381;
const EV_WELCOME_SENT = 382;
const EV_DOC_COLLECTION_COMPLETED = 383;

const LEGACY_SKILL_ID = 90;

// ============================================================
// PHASE 1 — CLAUDE.md hygiene: strip em-dashes from domain 99
// ============================================================
async function phase1_emdash_cleanup() {
  console.log("\n=== Phase 1: em-dash cleanup on domain 99 description ===");
  const [d] = await get(`/domains?id=eq.${ONBOARDING_ID}&select=id,description`);
  if (!d) throw new Error("Domain 99 not found");
  const before = String(d.description ?? "");
  const after = before.replace(/\s*—\s*/g, ", ");
  if (before === after) {
    console.log("  no em-dashes found, nothing to do");
    return;
  }
  console.log(`  patching description (${before.length} -> ${after.length} chars)`);
  await patch(`/domains?id=eq.${ONBOARDING_ID}`, { description: after });
}

// ============================================================
// PHASE 2 — M3: 3 domain_starter_modules rows
// ============================================================
async function phase2_starter_modules() {
  console.log("\n=== Phase 2: M3 domain_starter_modules ===");
  const existing = await get(
    `/domain_starter_modules?domain_id=eq.${ONBOARDING_ID}&select=domain_module_id,position`
  );
  const have = new Set(existing.map(r => `${r.domain_module_id}/${r.position}`));
  const desired = [
    {
      domain_id: ONBOARDING_ID,
      domain_module_id: MOD_JOURNEY,
      position: 1,
      notes:
        "Core orchestration. Install first; plans, journeys, stages, tasks, and cohorts hang off this module.",
    },
    {
      domain_id: ONBOARDING_ID,
      domain_module_id: MOD_DOC_INTAKE,
      position: 2,
      notes:
        "Add when payroll/HCM finalization is in scope (I-9, tax forms, direct deposit, NDA).",
    },
    {
      domain_id: ONBOARDING_ID,
      domain_module_id: MOD_WELCOME,
      position: 3,
      notes:
        "Add when buddy program and day-one welcome cadences are part of the onboarding program.",
    },
  ];
  const missing = desired.filter(r => !have.has(`${r.domain_module_id}/${r.position}`));
  if (missing.length === 0) {
    console.log(`  all ${desired.length} starter rows present`);
    return;
  }
  console.log(`  inserting ${missing.length} starter rows`);
  await post("/domain_starter_modules", missing);
}

// ============================================================
// PHASE 3 — B4: positively re-evaluate pattern flags
// ============================================================
async function phase3_pattern_flags() {
  console.log("\n=== Phase 3: B4 pattern flags ===");
  // has_personal_content=true on 16, 18, 19, 21
  const ids = [
    DO_ONBOARDING_JOURNEYS,
    DO_ONBOARDING_TASKS,
    DO_BUDDY_ASSIGNMENTS,
    DO_WELCOME_COMMUNICATIONS,
  ];
  const current = await get(
    `/data_objects?id=in.(${ids.join(",")})&select=id,data_object_name,has_personal_content`
  );
  const needFlag = current.filter(r => r.has_personal_content !== true);
  if (needFlag.length === 0) {
    console.log("  all 4 masters already have has_personal_content=true");
    return;
  }
  for (const r of needFlag) {
    console.log(`  PATCH data_object id=${r.id} (${r.data_object_name}) has_personal_content=true`);
    await patch(`/data_objects?id=eq.${r.id}`, { has_personal_content: true });
  }
}

// ============================================================
// PHASE 4 — B10b: backfill source_domain_module_id on 10 handoffs
// ============================================================
async function phase4_b10b_backfill() {
  console.log("\n=== Phase 4: B10b source-side backfill ===");
  // (id, source_module_id, optional target_module_id)
  const fixes: Array<{ id: number; source: number; target?: number }> = [
    { id: 4, source: MOD_JOURNEY, target: ITSM_SERVICE_REQUEST },
    { id: 5, source: MOD_JOURNEY }, // IGA: target stays NULL (IGA M1 fails)
    { id: 6, source: MOD_JOURNEY },
    { id: 7, source: MOD_JOURNEY }, // PAYROLL target resolved in phase 5
    { id: 8, source: MOD_JOURNEY },
    { id: 9, source: MOD_JOURNEY }, // already 35, no-op
    { id: 407, source: MOD_JOURNEY }, // IGA
    { id: 408, source: MOD_JOURNEY, target: ITSM_SERVICE_REQUEST },
    { id: 409, source: MOD_JOURNEY },
    { id: 410, source: MOD_DOC_INTAKE }, // HCM target resolved in phase 5
    { id: 411, source: MOD_DOC_INTAKE }, // PAYROLL target resolved in phase 5
  ];
  const current = await get(
    `/handoffs?id=in.(${fixes.map(f => f.id).join(",")})&select=id,source_domain_module_id,target_domain_module_id,notes`
  );
  const cur = new Map(current.map(r => [Number(r.id), r]));
  for (const f of fixes) {
    const row = cur.get(f.id);
    if (!row) {
      console.log(`  skip id=${f.id}: not found`);
      continue;
    }
    const body: Row = {};
    if (row.source_domain_module_id !== f.source) body.source_domain_module_id = f.source;
    if (f.target !== undefined && row.target_domain_module_id !== f.target) {
      body.target_domain_module_id = f.target;
      // also strip stale "left NULL" note when we resolve
      const note = String(row.notes ?? "");
      if (/left NULL/i.test(note)) {
        body.notes = note.replace(/(?:[^.]*left NULL[^.]*\.\s*)/g, "").trim();
      }
    }
    if (Object.keys(body).length === 0) {
      console.log(`  id=${f.id}: already correct`);
      continue;
    }
    console.log(`  PATCH handoff id=${f.id} ${JSON.stringify(body)}`);
    await patch(`/handoffs?id=eq.${f.id}`, body);
  }
}

// ============================================================
// PHASE 5 — Pairwise counterparty DMDO consumer rows
//   HCM-CORE-WORKER (54)        ← onboarding_document_collections (22)
//   ITSM-SERVICE-REQUEST (39)   ← onboarding_tasks (18)
//   PAYROLL-RUN (90)            ← onboarding_journeys (16) + onboarding_document_collections (22)
// ============================================================
async function phase5_pairwise_dmdo() {
  console.log("\n=== Phase 5: pairwise counterparty DMDO consumer rows ===");
  const rows = [
    {
      domain_module_id: HCM_CORE_WORKER,
      data_object_id: DO_ONBOARDING_DOCUMENT_COLLECTIONS,
      role: "consumer",
      necessity: "required",
      notes:
        "HCM finalizes employee record fields (tax, direct-deposit, I-9) once ONBOARDING document collection completes.",
    },
    {
      domain_module_id: ITSM_SERVICE_REQUEST,
      data_object_id: DO_ONBOARDING_TASKS,
      role: "consumer",
      necessity: "required",
      notes:
        "ITSM-SERVICE-REQUEST receives onboarding tasks (IT provisioning, workplace setup) as service-request payloads.",
    },
    {
      domain_module_id: PAYROLL_RUN,
      data_object_id: DO_ONBOARDING_JOURNEYS,
      role: "consumer",
      necessity: "required",
      notes: "PAYROLL-RUN activates the new hire's pay setup on journey.day_one_reached.",
    },
    {
      domain_module_id: PAYROLL_RUN,
      data_object_id: DO_ONBOARDING_DOCUMENT_COLLECTIONS,
      role: "consumer",
      necessity: "required",
      notes:
        "PAYROLL-RUN finalizes tax/DD/I-9 setup once ONBOARDING document collection completes.",
    },
  ];
  const existing = await get(
    `/domain_module_data_objects?domain_module_id=in.(${HCM_CORE_WORKER},${ITSM_SERVICE_REQUEST},${PAYROLL_RUN})&data_object_id=in.(${DO_ONBOARDING_JOURNEYS},${DO_ONBOARDING_TASKS},${DO_ONBOARDING_DOCUMENT_COLLECTIONS})&select=domain_module_id,data_object_id`
  );
  const have = new Set(existing.map(r => `${r.domain_module_id}/${r.data_object_id}`));
  const missing = rows.filter(r => !have.has(`${r.domain_module_id}/${r.data_object_id}`));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} DMDO consumer rows`);
    await post("/domain_module_data_objects", missing);
  } else {
    console.log("  all 4 DMDO rows already present");
  }

  // Now that the target DMDO rows exist, resolve target_domain_module_id on PAYROLL + HCM handoffs.
  const targetFixes: Array<{ id: number; target_domain_module_id: number }> = [
    { id: 7, target_domain_module_id: PAYROLL_RUN },
    { id: 410, target_domain_module_id: HCM_CORE_WORKER },
    { id: 411, target_domain_module_id: PAYROLL_RUN },
  ];
  const ho = await get(
    `/handoffs?id=in.(${targetFixes.map(f => f.id).join(",")})&select=id,target_domain_module_id,notes`
  );
  const cur = new Map(ho.map(r => [Number(r.id), r]));
  for (const f of targetFixes) {
    const row = cur.get(f.id);
    if (!row) continue;
    if (row.target_domain_module_id === f.target_domain_module_id) {
      console.log(`  id=${f.id}: target already set`);
      continue;
    }
    const body: Row = { target_domain_module_id: f.target_domain_module_id };
    const note = String(row.notes ?? "");
    if (/left NULL/i.test(note)) {
      body.notes = note.replace(/(?:[^.]*left NULL[^.]*\.\s*)/g, "").trim();
    }
    console.log(`  PATCH handoff id=${f.id} target_domain_module_id=${f.target_domain_module_id}`);
    await patch(`/handoffs?id=eq.${f.id}`, body);
  }
}

// ============================================================
// PHASE 6 — B9b: 4 intra-domain handoff rows
// ============================================================
async function phase6_intra_handoffs() {
  console.log("\n=== Phase 6: B9b intra-domain handoffs ===");
  const rows = [
    {
      trigger_event_id: EV_PLAN_ACTIVATED,
      data_object_id: DO_ONBOARDING_DOCUMENT_COLLECTIONS,
      source_domain_id: ONBOARDING_ID,
      source_domain_module_id: MOD_JOURNEY,
      target_domain_id: ONBOARDING_ID,
      target_domain_module_id: MOD_DOC_INTAKE,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      notes:
        "Plan activation seeds a document_collection for the journey; intra-domain progression, no out-of-process message.",
    },
    {
      trigger_event_id: EV_PLAN_ACTIVATED,
      data_object_id: DO_WELCOME_COMMUNICATIONS,
      source_domain_id: ONBOARDING_ID,
      source_domain_module_id: MOD_JOURNEY,
      target_domain_id: ONBOARDING_ID,
      target_domain_module_id: MOD_WELCOME,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      notes:
        "Plan activation schedules the welcome cadence and pairs a buddy; intra-domain progression.",
    },
    {
      trigger_event_id: EV_DOC_COLLECTION_COMPLETED,
      data_object_id: DO_ONBOARDING_JOURNEYS,
      source_domain_id: ONBOARDING_ID,
      source_domain_module_id: MOD_DOC_INTAKE,
      target_domain_id: ONBOARDING_ID,
      target_domain_module_id: MOD_JOURNEY,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      notes:
        "Doc collection completion unblocks day-one transition on the journey.",
    },
    {
      trigger_event_id: EV_WELCOME_SENT,
      data_object_id: DO_ONBOARDING_JOURNEYS,
      source_domain_id: ONBOARDING_ID,
      source_domain_module_id: MOD_WELCOME,
      target_domain_id: ONBOARDING_ID,
      target_domain_module_id: MOD_JOURNEY,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      notes:
        "Welcome communication sent advances the journey's pre-board stage.",
    },
  ];
  const existing = await get(
    `/handoffs?source_domain_id=eq.${ONBOARDING_ID}&target_domain_id=eq.${ONBOARDING_ID}&select=trigger_event_id,source_domain_module_id,target_domain_module_id`
  );
  const have = new Set(
    existing.map(r => `${r.trigger_event_id}/${r.source_domain_module_id}/${r.target_domain_module_id}`)
  );
  const missing = rows.filter(
    r => !have.has(`${r.trigger_event_id}/${r.source_domain_module_id}/${r.target_domain_module_id}`)
  );
  if (missing.length === 0) {
    console.log("  all 4 intra-domain handoffs already present");
    return;
  }
  console.log(`  inserting ${missing.length} intra-domain handoff rows`);
  await post("/handoffs", missing);
}

// ============================================================
// PHASE 7 — B9: 4 missing-subscriber handoff rows for events 379-382
//   379 onboarding_stage.completed     -> EMP-EXP-CONTINUOUS-LISTEN (cross, milestone surveys)
//   380 buddy_assignment.activated     -> ONB-JOURNEY-MGMT (intra, stage progress)
//   381 onboarding_cohort.activated    -> LMS-COMPLIANCE-TRAINING (cross, cohort enrollment)
//   382 welcome_communication.sent     -> already wired intra in phase 6
// ============================================================
async function phase7_missing_subscribers() {
  console.log("\n=== Phase 7: B9 missing-subscriber handoffs ===");
  const rows = [
    {
      trigger_event_id: EV_STAGE_COMPLETED,
      data_object_id: DO_ONBOARDING_JOURNEYS,
      source_domain_id: ONBOARDING_ID,
      source_domain_module_id: MOD_JOURNEY,
      target_domain_id: 62, // EMP-EXP
      target_domain_module_id: EMP_EXP_LISTEN,
      integration_pattern: "event_stream",
      friction_level: "low",
      notes:
        "Stage completion (pre-board, day-one, week-one, 30-day) fires onboarding milestone surveys via EMP-EXP continuous-listen.",
    },
    {
      trigger_event_id: EV_BUDDY_ACTIVATED,
      data_object_id: DO_ONBOARDING_JOURNEYS,
      source_domain_id: ONBOARDING_ID,
      source_domain_module_id: MOD_WELCOME,
      target_domain_id: ONBOARDING_ID,
      target_domain_module_id: MOD_JOURNEY,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      notes:
        "Buddy assignment active marks pre-board stage progress on the journey.",
    },
    {
      trigger_event_id: EV_COHORT_ACTIVATED,
      data_object_id: DO_ONBOARDING_COHORTS,
      source_domain_id: ONBOARDING_ID,
      source_domain_module_id: MOD_JOURNEY,
      target_domain_id: 57, // LMS
      target_domain_module_id: LMS_COMPLIANCE_TRAINING,
      integration_pattern: "api_call",
      friction_level: "medium",
      notes:
        "Cohort activation triggers cohort-scoped LMS compliance training enrollments for the cohort members.",
    },
  ];
  const existing = await get(
    `/handoffs?trigger_event_id=in.(${EV_STAGE_COMPLETED},${EV_BUDDY_ACTIVATED},${EV_COHORT_ACTIVATED})&select=trigger_event_id,source_domain_module_id,target_domain_module_id`
  );
  const have = new Set(
    existing.map(r => `${r.trigger_event_id}/${r.source_domain_module_id}/${r.target_domain_module_id}`)
  );
  const missing = rows.filter(
    r => !have.has(`${r.trigger_event_id}/${r.source_domain_module_id}/${r.target_domain_module_id}`)
  );
  if (missing.length === 0) {
    console.log("  all missing-subscriber handoffs already present");
    return;
  }
  console.log(`  inserting ${missing.length} missing-subscriber handoff rows`);
  await post("/handoffs", missing);
}

// ============================================================
// PHASE 8 — F2/F3: 3 per-module system skills + tools + skill_tools
// ============================================================
async function phase8_system_skills() {
  console.log("\n=== Phase 8: F2/F3 system skills + tools + skill_tools ===");

  // Step A: ensure mutate tools exist. Reuse existing where present.
  const newToolDefs: Array<{
    tool_name: string;
    operation_kind: string;
    coverage_tier: string;
    data_object_id: number | null;
    description: string;
  }> = [
    {
      tool_name: "create_onboarding_journey",
      operation_kind: "mutate",
      coverage_tier: "platform",
      data_object_id: DO_ONBOARDING_JOURNEYS,
      description: "Create an onboarding_journey row instantiating a plan template for a new hire.",
    },
    {
      tool_name: "update_onboarding_journey",
      operation_kind: "mutate",
      coverage_tier: "platform",
      data_object_id: DO_ONBOARDING_JOURNEYS,
      description: "Advance an onboarding_journey through its lifecycle states (pre_boarding, day_one, in_progress, completed, cancelled).",
    },
    {
      tool_name: "update_onboarding_task",
      operation_kind: "mutate",
      coverage_tier: "platform",
      data_object_id: DO_ONBOARDING_TASKS,
      description: "Mark an onboarding_task as in_progress, completed, skipped, or cancelled.",
    },
    {
      tool_name: "complete_onboarding_stage",
      operation_kind: "mutate",
      coverage_tier: "platform",
      data_object_id: DO_ONBOARDING_STAGES,
      description: "Mark an onboarding_stage as completed; fires onboarding_stage.completed event.",
    },
    {
      tool_name: "create_onboarding_document_collection",
      operation_kind: "mutate",
      coverage_tier: "platform",
      data_object_id: DO_ONBOARDING_DOCUMENT_COLLECTIONS,
      description: "Create the doc-collection package for a new hire (I-9, tax, DD, NDA).",
    },
    {
      tool_name: "approve_onboarding_document_collection",
      operation_kind: "mutate",
      coverage_tier: "platform",
      data_object_id: DO_ONBOARDING_DOCUMENT_COLLECTIONS,
      description: "Approve a submitted onboarding_document_collection, releasing it for HCM/Payroll finalization.",
    },
    {
      tool_name: "create_buddy_assignment",
      operation_kind: "mutate",
      coverage_tier: "platform",
      data_object_id: DO_BUDDY_ASSIGNMENTS,
      description: "Create a buddy_assignment pairing a new hire with a mentor.",
    },
    {
      tool_name: "send_welcome_communication",
      operation_kind: "mutate",
      coverage_tier: "platform",
      data_object_id: DO_WELCOME_COMMUNICATIONS,
      description: "Mark a welcome_communication as sent (deployment routes the channel via notify_person).",
    },
  ];
  const existingTools = await get(
    `/tools?tool_name=in.(${newToolDefs.map(t => t.tool_name).join(",")})&select=id,tool_name`
  );
  const toolByName = new Map<string, number>(
    existingTools.map(r => [String(r.tool_name), Number(r.id)])
  );
  const missingTools = newToolDefs.filter(t => !toolByName.has(t.tool_name));
  if (missingTools.length > 0) {
    console.log(`  inserting ${missingTools.length} new mutate tools`);
    await post("/tools", missingTools);
    const refreshed = await get(
      `/tools?tool_name=in.(${newToolDefs.map(t => t.tool_name).join(",")})&select=id,tool_name`
    );
    for (const r of refreshed) toolByName.set(String(r.tool_name), Number(r.id));
  }

  // Step B: resolve existing tool ids by name
  const reusedTools = [
    "query_onboarding_plans",
    "query_onboarding_journeys",
    "query_onboarding_stages",
    "query_onboarding_tasks",
    "query_buddy_assignments",
    "query_onboarding_cohorts",
    "query_welcome_communications",
    "query_onboarding_document_collections",
    "notify_person",
    "notify_team",
    "sign_document",
    "query_employees",
    "query_candidates",
    "query_hcm_positions",
    "query_org_units",
    "query_hardware_assets",
    "query_service_requests",
    "query_locations",
  ];
  const reused = await get(
    `/tools?tool_name=in.(${reusedTools.join(",")})&select=id,tool_name`
  );
  for (const r of reused) toolByName.set(String(r.tool_name), Number(r.id));

  function tid(name: string): number | null {
    const id = toolByName.get(name);
    if (!id) {
      console.log(`  WARN tool not found: ${name}`);
      return null;
    }
    return id;
  }

  // Step C: 3 system skills (idempotent by skill_name)
  const skills = [
    {
      skill_name: "onb_journey_mgmt_agent",
      skill_type: "system",
      domain_id: ONBOARDING_ID,
      domain_module_id: MOD_JOURNEY,
      description:
        "Orchestrates onboarding journeys: instantiates plans, advances stages and tasks, dispatches notifications, and coordinates handoffs to ITSM, IGA, IWMS, PAYROLL, LMS, HRSD, EMP-EXP.",
    },
    {
      skill_name: "onb_document_intake_agent",
      skill_type: "system",
      domain_id: ONBOARDING_ID,
      domain_module_id: MOD_DOC_INTAKE,
      description:
        "Collects, validates, and approves new-hire documents (I-9, tax forms, direct deposit, NDA); signals HCM and Payroll on completion.",
    },
    {
      skill_name: "onb_welcome_experience_agent",
      skill_type: "system",
      domain_id: ONBOARDING_ID,
      domain_module_id: MOD_WELCOME,
      description:
        "Drives pre-board communications, day-one welcome cadences, buddy pairing, and cohort intro-meeting coordination.",
    },
  ];
  const existingSkills = await get(
    `/skills?skill_name=in.(${skills.map(s => s.skill_name).join(",")})&select=id,skill_name`
  );
  const skillByName = new Map<string, number>(
    existingSkills.map(r => [String(r.skill_name), Number(r.id)])
  );
  const missingSkills = skills.filter(s => !skillByName.has(s.skill_name));
  if (missingSkills.length > 0) {
    console.log(`  inserting ${missingSkills.length} system skills`);
    await post("/skills", missingSkills);
    const refreshed = await get(
      `/skills?skill_name=in.(${skills.map(s => s.skill_name).join(",")})&select=id,skill_name`
    );
    for (const r of refreshed) skillByName.set(String(r.skill_name), Number(r.id));
  }

  const JOURNEY_SK = skillByName.get("onb_journey_mgmt_agent");
  const DOC_SK = skillByName.get("onb_document_intake_agent");
  const WELCOME_SK = skillByName.get("onb_welcome_experience_agent");
  if (!JOURNEY_SK || !DOC_SK || !WELCOME_SK) {
    throw new Error("system skill ids did not resolve");
  }

  // Step D: skill_tools rows
  type ST = { skill_id: number; tool_name: string; requirement_level: string; notes: string };
  const skillTools: ST[] = [
    // onb_journey_mgmt_agent
    { skill_id: JOURNEY_SK, tool_name: "query_onboarding_plans", requirement_level: "required", notes: "" },
    { skill_id: JOURNEY_SK, tool_name: "query_onboarding_journeys", requirement_level: "required", notes: "" },
    { skill_id: JOURNEY_SK, tool_name: "query_onboarding_stages", requirement_level: "required", notes: "" },
    { skill_id: JOURNEY_SK, tool_name: "query_onboarding_tasks", requirement_level: "required", notes: "" },
    { skill_id: JOURNEY_SK, tool_name: "query_onboarding_cohorts", requirement_level: "required", notes: "" },
    { skill_id: JOURNEY_SK, tool_name: "query_employees", requirement_level: "required", notes: "read embedded employee shell + canonical HCM employee fields" },
    { skill_id: JOURNEY_SK, tool_name: "query_candidates", requirement_level: "required", notes: "lookup ATS candidate context on candidate.hired" },
    { skill_id: JOURNEY_SK, tool_name: "query_hcm_positions", requirement_level: "required", notes: "first-day-readiness check (workstation, manager, location)" },
    { skill_id: JOURNEY_SK, tool_name: "query_service_requests", requirement_level: "required", notes: "track ITSM provisioning ticket status" },
    { skill_id: JOURNEY_SK, tool_name: "query_hardware_assets", requirement_level: "optional", notes: "confirm Day-1 laptop/peripheral readiness via ITAM" },
    { skill_id: JOURNEY_SK, tool_name: "create_onboarding_journey", requirement_level: "required", notes: "" },
    { skill_id: JOURNEY_SK, tool_name: "update_onboarding_journey", requirement_level: "required", notes: "" },
    { skill_id: JOURNEY_SK, tool_name: "update_onboarding_task", requirement_level: "required", notes: "" },
    { skill_id: JOURNEY_SK, tool_name: "complete_onboarding_stage", requirement_level: "required", notes: "" },
    { skill_id: JOURNEY_SK, tool_name: "notify_person", requirement_level: "required", notes: "new-hire / manager nudges per task" },
    { skill_id: JOURNEY_SK, tool_name: "notify_team", requirement_level: "optional", notes: "cohort and team-wide announcements" },

    // onb_document_intake_agent
    { skill_id: DOC_SK, tool_name: "query_onboarding_document_collections", requirement_level: "required", notes: "" },
    { skill_id: DOC_SK, tool_name: "query_employees", requirement_level: "required", notes: "match doc set to employee identity" },
    { skill_id: DOC_SK, tool_name: "create_onboarding_document_collection", requirement_level: "required", notes: "" },
    { skill_id: DOC_SK, tool_name: "approve_onboarding_document_collection", requirement_level: "required", notes: "" },
    { skill_id: DOC_SK, tool_name: "sign_document", requirement_level: "required", notes: "I-9, NDA, offer-letter and tax-form e-signature is the workflow for this module; channel cannot be substituted" },
    { skill_id: DOC_SK, tool_name: "notify_person", requirement_level: "required", notes: "doc-completion reminders and approval notifications" },

    // onb_welcome_experience_agent
    { skill_id: WELCOME_SK, tool_name: "query_onboarding_journeys", requirement_level: "required", notes: "read journey context for welcome scheduling" },
    { skill_id: WELCOME_SK, tool_name: "query_buddy_assignments", requirement_level: "required", notes: "" },
    { skill_id: WELCOME_SK, tool_name: "query_welcome_communications", requirement_level: "required", notes: "" },
    { skill_id: WELCOME_SK, tool_name: "query_org_units", requirement_level: "optional", notes: "scope welcome to department/location" },
    { skill_id: WELCOME_SK, tool_name: "query_locations", requirement_level: "optional", notes: "location-specific welcome content" },
    { skill_id: WELCOME_SK, tool_name: "create_buddy_assignment", requirement_level: "required", notes: "" },
    { skill_id: WELCOME_SK, tool_name: "send_welcome_communication", requirement_level: "required", notes: "" },
    { skill_id: WELCOME_SK, tool_name: "notify_person", requirement_level: "required", notes: "new-hire welcome cadence routed through the deployment's preferred channel" },
    { skill_id: WELCOME_SK, tool_name: "notify_team", requirement_level: "optional", notes: "cohort orientation broadcasts" },
  ];

  // Resolve tool_ids
  const resolved = skillTools
    .map(st => ({
      skill_id: st.skill_id,
      tool_id: tid(st.tool_name),
      requirement_level: st.requirement_level,
      notes: st.notes,
    }))
    .filter((r): r is { skill_id: number; tool_id: number; requirement_level: string; notes: string } => r.tool_id !== null);

  const existingST = await get(
    `/skill_tools?skill_id=in.(${JOURNEY_SK},${DOC_SK},${WELCOME_SK})&select=skill_id,tool_id`
  );
  const haveST = new Set(existingST.map(r => `${r.skill_id}/${r.tool_id}`));
  const missingST = resolved.filter(r => !haveST.has(`${r.skill_id}/${r.tool_id}`));
  if (missingST.length === 0) {
    console.log(`  all ${resolved.length} skill_tools present`);
    return;
  }
  console.log(`  inserting ${missingST.length} skill_tools rows`);
  await post("/skill_tools", missingST);
}

// ============================================================
// PHASE 9 — F7/F1: retire legacy skill (id 90)
//   Per Rule #17, once per-module skills exist the legacy domain-level skill is obsolete.
//   DELETE skill_tools rows first, then the skill row.
// ============================================================
async function phase9_retire_legacy() {
  console.log("\n=== Phase 9: retire legacy skill id=90 (F7/F1) ===");
  const skill = await get(`/skills?id=eq.${LEGACY_SKILL_ID}&select=id,skill_name,domain_module_id`);
  if (skill.length === 0) {
    console.log("  legacy skill already gone");
    return;
  }
  // Confirm per-module replacements exist before deleting
  const replacements = await get(
    `/skills?domain_module_id=in.(${MOD_JOURNEY},${MOD_DOC_INTAKE},${MOD_WELCOME})&skill_type=eq.system&select=id,domain_module_id`
  );
  const moduleHits = new Set(replacements.map(r => Number(r.domain_module_id)));
  if (!moduleHits.has(MOD_JOURNEY) || !moduleHits.has(MOD_DOC_INTAKE) || !moduleHits.has(MOD_WELCOME)) {
    throw new Error(
      `cannot retire legacy skill: per-module replacements missing (${[...moduleHits].join(",")})`
    );
  }
  console.log("  per-module replacements verified; deleting skill_tools then skill");
  await call({ method: "DELETE", path: `/skill_tools?skill_id=eq.${LEGACY_SKILL_ID}` });
  await call({ method: "DELETE", path: `/skills?id=eq.${LEGACY_SKILL_ID}` });
  console.log(`  deleted legacy skill ${LEGACY_SKILL_ID}`);
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("ONBOARDING audit fix-load starting", new Date().toISOString());
  await phase1_emdash_cleanup();
  await phase2_starter_modules();
  await phase3_pattern_flags();
  await phase4_b10b_backfill();
  await phase5_pairwise_dmdo();
  await phase6_intra_handoffs();
  await phase7_missing_subscribers();
  await phase8_system_skills();
  await phase9_retire_legacy();
  console.log("\nDone.");
}

await main();
