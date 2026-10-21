/**
 * LMS audit fix - Phase 1 (deterministic + recommended).
 *
 * Scope authorized by user `fix all` after the 2026-05-24 audit:
 *   A) B10b backfill - per-module attribution on existing handoffs.
 *   B) Retire 3 legacy handoffs (24, 112, 436) + 2 legacy trigger_events
 *      (31 compliance_training.lapsed, 144 training.completed).
 *      Pre-verified: events 31 + 144 are referenced only by these 3 handoffs.
 *   C) Add 4 `consumer + required` rows on domain_module_data_objects for the
 *      NO-CANDIDATE inbound handoffs, then patch their target_module.
 *   D) Add 4 B9b intra-domain handoffs to capture cross-module lifecycle
 *      progressions inside LMS.
 *
 * Out of scope (Phase 2, needs user OK):
 *   - LMS module permission materialization
 *   - E1-E6 role authoring
 *
 * Idempotency:
 *   - PATCHes only fire when the target column is still NULL or differs.
 *   - INSERTs are pre-checked: domain_module_data_objects on (module, data_object);
 *     handoffs on (trigger_event_id, source_module, target_module).
 *   - DELETEs skip if the row is already gone.
 *
 * Run from project root:
 *   bun run .tmp_deploy/lms_audit_fix_phase1.ts
 */

const LMS_DOMAIN_ID = 57;
const MOD_COURSE_DELIVERY = 32;
const MOD_COMPLIANCE = 33;
const MOD_SKILLS = 34;

interface CmdResult { ok: boolean; data: any; status: number; stderr: string; }

async function postgrest(method: string, path: string, body?: any, prefer?: string): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  if (prefer) payload.headers = { Prefer: prefer };
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" }
  );
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    return { ok: false, data: null, status: code, stderr: stderr.trim() || stdout.trim() };
  }
  const text = stdout.trim();
  return { ok: true, data: text ? JSON.parse(text) : null, status: 0, stderr: "" };
}

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.stderr}`);
  return r.data;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await postgrest("PATCH", path, body, "return=representation");
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.stderr}`);
  return r.data;
}

async function insert(path: string, body: any): Promise<any> {
  const r = await postgrest("POST", path, body, "return=representation");
  if (!r.ok) throw new Error(`POST ${path} failed: ${r.stderr}`);
  return r.data;
}

async function del(path: string): Promise<void> {
  const r = await postgrest("DELETE", path);
  if (!r.ok) throw new Error(`DELETE ${path} failed: ${r.stderr}`);
}

type HandoffRow = {
  id: number;
  source_domain_id: number;
  target_domain_id: number;
  source_domain_module_id: number | null;
  target_domain_module_id: number | null;
  trigger_event_id: number;
  data_object_id: number;
};

async function main() {
  console.log("LMS audit fix - Phase 1");
  console.log("========================\n");

  // ---------------------------------------------------------------------------
  // A. B10b backfill on existing handoffs
  // ---------------------------------------------------------------------------
  const sourceModulePatches: Array<{ id: number; module: number; label: string }> = [
    { id: 111, module: MOD_COMPLIANCE, label: "learner_certification.earned" },
    { id: 430, module: MOD_COURSE_DELIVERY, label: "course_enrollment.completed" },
    { id: 431, module: MOD_COURSE_DELIVERY, label: "learning_record.posted" },
    { id: 432, module: MOD_SKILLS, label: "skill_profile.updated -> TALENT-MGMT" },
    { id: 433, module: MOD_SKILLS, label: "skill_profile.updated -> ATS" },
    { id: 434, module: MOD_COMPLIANCE, label: "compliance_assignment.overdue -> GRC" },
    { id: 435, module: MOD_COMPLIANCE, label: "compliance_assignment.overdue -> IGA" },
  ];

  const targetModulePatches: Array<{ id: number; module: number; label: string }> = [
    { id: 388, module: MOD_SKILLS, label: "HCM job_profile.published -> LMS-SKILLS" },
    { id: 373, module: MOD_COURSE_DELIVERY, label: "HCM employee.created -> LMS-COURSE-DELIVERY" },
  ];

  console.log("A.1 source_domain_module_id backfill:");
  for (const p of sourceModulePatches) {
    const cur: HandoffRow[] = await get(`/handoffs?id=eq.${p.id}&select=id,source_domain_module_id`);
    if (cur.length === 0) {
      console.log(`  - handoff ${p.id} not found (skipped)`);
      continue;
    }
    if (cur[0].source_domain_module_id === p.module) {
      console.log(`  = handoff ${p.id} already set to ${p.module} (${p.label})`);
      continue;
    }
    await patch(`/handoffs?id=eq.${p.id}`, { source_domain_module_id: p.module });
    console.log(`  + handoff ${p.id} source_module = ${p.module} (${p.label})`);
  }

  console.log("\nA.2 target_domain_module_id backfill:");
  for (const p of targetModulePatches) {
    const cur: HandoffRow[] = await get(`/handoffs?id=eq.${p.id}&select=id,target_domain_module_id`);
    if (cur.length === 0) {
      console.log(`  - handoff ${p.id} not found (skipped)`);
      continue;
    }
    if (cur[0].target_domain_module_id === p.module) {
      console.log(`  = handoff ${p.id} already set to ${p.module} (${p.label})`);
      continue;
    }
    await patch(`/handoffs?id=eq.${p.id}`, { target_domain_module_id: p.module });
    console.log(`  + handoff ${p.id} target_module = ${p.module} (${p.label})`);
  }

  // ---------------------------------------------------------------------------
  // B. Retire legacy handoffs + trigger_events
  // ---------------------------------------------------------------------------
  console.log("\nB.1 retire legacy handoffs (24, 112, 436):");
  for (const id of [24, 112, 436]) {
    const cur = await get(`/handoffs?id=eq.${id}&select=id`);
    if (cur.length === 0) {
      console.log(`  = handoff ${id} already gone`);
      continue;
    }
    await del(`/handoffs?id=eq.${id}`);
    console.log(`  - handoff ${id} deleted`);
  }

  console.log("\nB.2 retire legacy trigger_events (31 compliance_training.lapsed, 144 training.completed):");
  for (const id of [31, 144]) {
    const cur = await get(`/trigger_events?id=eq.${id}&select=id,event_name`);
    if (cur.length === 0) {
      console.log(`  = trigger_event ${id} already gone`);
      continue;
    }
    // Safety re-check: confirm no handoff still references it.
    const refs = await get(`/handoffs?trigger_event_id=eq.${id}&select=id`);
    if (refs.length > 0) {
      console.log(`  ! trigger_event ${id} still has ${refs.length} handoff(s) - aborting delete`);
      continue;
    }
    await del(`/trigger_events?id=eq.${id}`);
    console.log(`  - trigger_event ${id} (${cur[0].event_name}) deleted`);
  }

  // ---------------------------------------------------------------------------
  // C. Add consumer rows + backfill target_module for NO-CANDIDATE inbounds
  // ---------------------------------------------------------------------------
  console.log("\nC.1 add consumer rows on LMS modules for inbound payload data_objects:");
  const consumers: Array<{ module: number; data_object: number; do_name: string; notes: string; handoff_id: number }> = [
    {
      module: MOD_COMPLIANCE,
      data_object: 18,
      do_name: "onboarding_tasks",
      notes: "Inbound from ONBOARDING task.compliance_training_required: LMS-COMPLIANCE-TRAINING consumes the task payload to drive enrollment.",
      handoff_id: 8,
    },
    {
      module: MOD_COMPLIANCE,
      data_object: 286,
      do_name: "policy_attestations",
      notes: "Inbound from GRC compliance_policy.updated: LMS-COMPLIANCE-TRAINING consumes policy attestations to derive mandated training assignments.",
      handoff_id: 249,
    },
    {
      module: MOD_SKILLS,
      data_object: 26,
      do_name: "skills_gap_analyses",
      notes: "Inbound from SWP skills_gap_analysis.completed: LMS-SKILLS consumes gap analyses to drive learning-path recommendation.",
      handoff_id: 456,
    },
    {
      module: MOD_SKILLS,
      data_object: 175,
      do_name: "performance_goals",
      notes: "Inbound from TALENT-MGMT performance_goal.set: LMS-SKILLS consumes goals to recommend dev-paths.",
      handoff_id: 440,
    },
  ];

  for (const c of consumers) {
    const cur = await get(
      `/domain_module_data_objects?domain_module_id=eq.${c.module}&data_object_id=eq.${c.data_object}&select=domain_module_id,role,necessity`
    );
    if (cur.length > 0) {
      console.log(`  = consumer row (module ${c.module}, ${c.do_name}) already present as ${cur[0].role}/${cur[0].necessity}`);
    } else {
      await insert("/domain_module_data_objects", {
        domain_module_id: c.module,
        data_object_id: c.data_object,
        role: "consumer",
        necessity: "required",
        notes: c.notes,
      });
      console.log(`  + consumer row added: module ${c.module} <- ${c.do_name}`);
    }
  }

  console.log("\nC.2 backfill target_domain_module_id on NO-CANDIDATE inbound handoffs:");
  for (const c of consumers) {
    const cur: HandoffRow[] = await get(
      `/handoffs?id=eq.${c.handoff_id}&select=id,target_domain_module_id`
    );
    if (cur.length === 0) {
      console.log(`  - handoff ${c.handoff_id} not found (skipped)`);
      continue;
    }
    if (cur[0].target_domain_module_id === c.module) {
      console.log(`  = handoff ${c.handoff_id} target_module already ${c.module}`);
      continue;
    }
    await patch(`/handoffs?id=eq.${c.handoff_id}`, { target_domain_module_id: c.module });
    console.log(`  + handoff ${c.handoff_id} target_module = ${c.module} (${c.do_name})`);
  }

  // ---------------------------------------------------------------------------
  // D. Add 4 intra-domain handoffs (B9b)
  // ---------------------------------------------------------------------------
  console.log("\nD. add intra-domain handoffs (B9b):");
  const intra: Array<{
    trigger_event_id: number;
    source_module: number;
    target_module: number;
    data_object_id: number;
    integration_pattern: string;
    friction_level: string;
    notes: string;
    label: string;
  }> = [
    {
      trigger_event_id: 438, // course_enrollment.completed
      source_module: MOD_COURSE_DELIVERY,
      target_module: MOD_SKILLS,
      data_object_id: 169, // course_enrollments
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      notes: "Intra-LMS: completion of an enrollment refreshes the learner's skill_profile in LMS-SKILLS.",
      label: "course_enrollment.completed: COURSE-DELIVERY -> SKILLS",
    },
    {
      trigger_event_id: 26, // learner_certification.earned
      source_module: MOD_COMPLIANCE,
      target_module: MOD_SKILLS,
      data_object_id: 171, // learner_certifications
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      notes: "Intra-LMS: an earned certification updates skill_profile in LMS-SKILLS.",
      label: "learner_certification.earned: COMPLIANCE -> SKILLS",
    },
    {
      trigger_event_id: 435, // course.published
      source_module: MOD_COURSE_DELIVERY,
      target_module: MOD_COMPLIANCE,
      data_object_id: 167, // courses
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      notes: "Intra-LMS: a published course can be referenced by new compliance_assignments in LMS-COMPLIANCE-TRAINING.",
      label: "course.published: COURSE-DELIVERY -> COMPLIANCE",
    },
    {
      trigger_event_id: 437, // learning_path.assigned
      source_module: MOD_SKILLS,
      target_module: MOD_COURSE_DELIVERY,
      data_object_id: 168, // learning_paths
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      notes: "Intra-LMS: a path assignment in LMS-SKILLS cascades into course enrollments in LMS-COURSE-DELIVERY.",
      label: "learning_path.assigned: SKILLS -> COURSE-DELIVERY",
    },
  ];

  for (const h of intra) {
    const cur = await get(
      `/handoffs?source_domain_id=eq.${LMS_DOMAIN_ID}&target_domain_id=eq.${LMS_DOMAIN_ID}&trigger_event_id=eq.${h.trigger_event_id}&source_domain_module_id=eq.${h.source_module}&target_domain_module_id=eq.${h.target_module}&select=id`
    );
    if (cur.length > 0) {
      console.log(`  = ${h.label} already present (handoff ${cur[0].id})`);
      continue;
    }
    const created = await insert("/handoffs", {
      source_domain_id: LMS_DOMAIN_ID,
      target_domain_id: LMS_DOMAIN_ID,
      source_domain_module_id: h.source_module,
      target_domain_module_id: h.target_module,
      trigger_event_id: h.trigger_event_id,
      data_object_id: h.data_object_id,
      integration_pattern: h.integration_pattern,
      friction_level: h.friction_level,
      notes: h.notes,
    });
    console.log(`  + handoff ${created[0].id} - ${h.label}`);
  }

  // ---------------------------------------------------------------------------
  // E. Post-fix audit
  // ---------------------------------------------------------------------------
  console.log("\nPost-fix audit:");
  const outboundNulls = await get(
    `/handoffs?source_domain_id=eq.${LMS_DOMAIN_ID}&source_domain_module_id=is.null&select=id,trigger_events(event_name)`
  );
  console.log(`  LMS outbound with NULL source_module: ${outboundNulls.length}`);
  for (const r of outboundNulls) {
    console.log(`    handoff ${r.id} (${r.trigger_events?.event_name})`);
  }

  const inboundNulls = await get(
    `/handoffs?target_domain_id=eq.${LMS_DOMAIN_ID}&target_domain_module_id=is.null&select=id,trigger_events(event_name)`
  );
  console.log(`  LMS inbound with NULL target_module: ${inboundNulls.length}`);
  for (const r of inboundNulls) {
    console.log(`    handoff ${r.id} (${r.trigger_events?.event_name})`);
  }

  const intraCount = await get(
    `/handoffs?source_domain_id=eq.${LMS_DOMAIN_ID}&target_domain_id=eq.${LMS_DOMAIN_ID}&select=id`
  );
  console.log(`  LMS intra-domain handoffs: ${intraCount.length}`);

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("\nFATAL:", e?.message || e);
  process.exit(1);
});
