/**
 * Load-3 from the 2026-05-25 ATS<->HCM pairwise reconciliation:
 * Insert 11 HCM trigger_events for workflow-gate states on
 * hcm_positions / job_profiles / org_units (the masters ATS-RECRUITMENT-PIPELINE
 * embedded_masters), then insert 11 handoffs from HCM-ORG-POSITIONS to
 * ATS-RECRUITMENT-PIPELINE.
 *
 * This is HCM-side Phase-B work. Belongs to HCM's audit owner; included here
 * per explicit user authorization to do both sides of the ATS<->HCM boundary
 * in one session.
 *
 * Idempotent on event_name within data_object_id.
 *
 * Run from project root:
 *   bun run .tmp_deploy/load_3_hcm_trigger_events_and_handoffs_2026_05_25.ts
 */

interface CmdResult { ok: boolean; data: any; stderr: string; code: number; }

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" }
  );
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) return { ok: false, data: null, stderr: stderr.trim() || stdout.trim(), code };
  const text = stdout.trim();
  return { ok: true, data: text ? JSON.parse(text) : null, stderr: "", code: 0 };
}

const HCM_ID = 54;
const HCM_ORG_POSITIONS = 55;
const ATS_ID = 56;
const ATS_RECRUITMENT_PIPELINE = 4;

const HCM_POSITIONS_DO = 32;
const JOB_PROFILES_DO = 33;
const ORG_UNITS_DO = 34;

type EventSpec = {
  event_name: string;
  data_object_id: number;
  description: string;
  friction: "low" | "medium" | "high";
  handoff_notes: string;
};

const EVENTS: EventSpec[] = [
  { event_name: "hcm_position.approved",   data_object_id: HCM_POSITIONS_DO, description: "Position record approved and ready for posting and recruiting.",                              friction: "medium", handoff_notes: "Approved position becomes available for requisition creation in ATS-RECRUITMENT-PIPELINE." },
  { event_name: "hcm_position.opened",     data_object_id: HCM_POSITIONS_DO, description: "Position transitioned to open status; recruiting can begin.",                                 friction: "medium", handoff_notes: "Open position signals ATS that a requisition can be activated on this position." },
  { event_name: "hcm_position.filled",     data_object_id: HCM_POSITIONS_DO, description: "Position filled by a hired employee; no further hiring on this position until vacancy.",     friction: "medium", handoff_notes: "Filled position closes the recruiting loop in ATS; pipeline closes any remaining open requisitions tied to this position." },
  { event_name: "hcm_position.frozen",     data_object_id: HCM_POSITIONS_DO, description: "Position frozen; no new requisitions or hires permitted until thawed.",                       friction: "high",   handoff_notes: "Frozen position must halt any in-flight requisition or pipeline activity; cascade is fragile when offers are mid-flight." },
  { event_name: "hcm_position.eliminated", data_object_id: HCM_POSITIONS_DO, description: "Position eliminated from the org structure; existing requisitions must be closed.",          friction: "high",   handoff_notes: "Eliminated position requires closing all active requisitions and notifying any in-pipeline candidates." },
  { event_name: "job_profile.approved",    data_object_id: JOB_PROFILES_DO,  description: "Job profile approved and available for use by positions and requisitions.",                  friction: "low",    handoff_notes: "Approved job profile available for ATS pipeline to reference in new requisitions." },
  { event_name: "job_profile.activated",   data_object_id: JOB_PROFILES_DO,  description: "Job profile activated for production use.",                                                   friction: "low",    handoff_notes: "Activated job profile signals ATS pipeline that the profile is safe to attach to live requisitions." },
  { event_name: "job_profile.retired",     data_object_id: JOB_PROFILES_DO,  description: "Job profile retired; existing references should migrate to a successor profile.",            friction: "high",   handoff_notes: "Retired job profile requires ATS pipeline to flag affected requisitions for profile migration." },
  { event_name: "org_unit.activated",      data_object_id: ORG_UNITS_DO,     description: "Org unit activated and available for use across downstream domains.",                         friction: "low",    handoff_notes: "Newly activated org unit available for requisition org tagging in ATS-RECRUITMENT-PIPELINE." },
  { event_name: "org_unit.reorganized",    data_object_id: ORG_UNITS_DO,     description: "Org unit structure changed (parent re-pointed, scope adjusted); downstream tags need refresh.", friction: "high",   handoff_notes: "Reorg requires ATS pipeline to refresh requisition org-unit tagging; cascade can be large in mid-cycle reorgs." },
  { event_name: "org_unit.closed",         data_object_id: ORG_UNITS_DO,     description: "Org unit closed; active references must be re-targeted or terminated.",                       friction: "high",   handoff_notes: "Closed org unit requires ATS pipeline to re-target or close any active requisitions still tagged to it." },
];

async function main() {
  console.log("Load-3: 11 HCM trigger_events + 11 HCM->ATS handoffs on hcm_positions / job_profiles / org_units\n");

  // Phase 1: idempotent trigger_event inserts
  console.log("Phase 1: pre-flight trigger_events...");
  const eventNames = EVENTS.map((e) => `"${e.event_name}"`).join(",");
  const existingEvents = await postgrest(
    "GET",
    `/trigger_events?data_object_id=in.(${HCM_POSITIONS_DO},${JOB_PROFILES_DO},${ORG_UNITS_DO})&event_name=in.(${eventNames})&select=id,event_name,data_object_id`
  );
  if (!existingEvents.ok) { console.error(`  read failed: ${existingEvents.stderr}`); process.exit(1); }
  const existingByName = new Map<string, number>(
    (existingEvents.data ?? []).map((r: any) => [r.event_name, r.id])
  );
  console.log(`  ${existingByName.size} of ${EVENTS.length} already exist`);

  const eventsToInsert = EVENTS.filter((e) => !existingByName.has(e.event_name));
  if (eventsToInsert.length > 0) {
    console.log(`  inserting ${eventsToInsert.length}:`);
    for (const e of eventsToInsert) console.log(`    + ${e.event_name}`);
    const insertBody = eventsToInsert.map((e) => ({
      event_name: e.event_name,
      data_object_id: e.data_object_id,
      description: e.description,
      event_category: "state_change",
    }));
    const ins = await postgrest("POST", "/trigger_events", insertBody);
    if (!ins.ok) { console.error(`  INSERT failed: ${ins.stderr}`); process.exit(1); }
    console.log("  ok\n");
  } else {
    console.log("  (all events already present)\n");
  }

  // Re-read to build the full event_name -> id map
  const allEvents = await postgrest(
    "GET",
    `/trigger_events?data_object_id=in.(${HCM_POSITIONS_DO},${JOB_PROFILES_DO},${ORG_UNITS_DO})&event_name=in.(${eventNames})&select=id,event_name`
  );
  if (!allEvents.ok) { console.error(`  re-read failed: ${allEvents.stderr}`); process.exit(1); }
  const eventIdByName = new Map<string, number>(allEvents.data.map((r: any) => [r.event_name, r.id]));

  if (eventIdByName.size !== EVENTS.length) {
    console.error(`  expected ${EVENTS.length} events, found ${eventIdByName.size}; aborting`);
    process.exit(1);
  }

  // Phase 2: idempotent handoff inserts
  console.log("Phase 2: pre-flight handoffs...");
  const allTeIds = [...eventIdByName.values()].join(",");
  const existingHandoffs = await postgrest(
    "GET",
    `/handoffs?trigger_event_id=in.(${allTeIds})&source_domain_id=eq.${HCM_ID}&target_domain_id=eq.${ATS_ID}&select=id,trigger_event_id`
  );
  if (!existingHandoffs.ok) { console.error(`  read failed: ${existingHandoffs.stderr}`); process.exit(1); }
  const handoffsByTe = new Set<number>((existingHandoffs.data ?? []).map((r: any) => r.trigger_event_id));

  const handoffsToInsert = EVENTS.filter((e) => {
    const teId = eventIdByName.get(e.event_name);
    return teId !== undefined && !handoffsByTe.has(teId);
  });
  console.log(`  ${handoffsByTe.size} handoffs already exist; ${handoffsToInsert.length} to insert\n`);

  if (handoffsToInsert.length > 0) {
    for (const e of handoffsToInsert) {
      const teId = eventIdByName.get(e.event_name)!;
      console.log(`  + handoff te=${teId} ${e.event_name} (friction=${e.friction})`);
    }
    const handoffBody = handoffsToInsert.map((e) => ({
      source_domain_id: HCM_ID,
      target_domain_id: ATS_ID,
      source_domain_module_id: HCM_ORG_POSITIONS,
      target_domain_module_id: ATS_RECRUITMENT_PIPELINE,
      trigger_event_id: eventIdByName.get(e.event_name)!,
      data_object_id: e.data_object_id,
      integration_pattern: "api_call",
      friction_level: e.friction,
      notes: e.handoff_notes,
    }));
    console.log("\n  inserting...");
    const ins = await postgrest("POST", "/handoffs", handoffBody);
    if (!ins.ok) { console.error(`  INSERT failed: ${ins.stderr}`); process.exit(1); }
    console.log("  ok\n");
  } else {
    console.log("  (all handoffs already present)\n");
  }

  // Verify
  console.log("Verification...");
  const verify = await postgrest(
    "GET",
    `/handoffs?trigger_event_id=in.(${allTeIds})&source_domain_id=eq.${HCM_ID}&target_domain_id=eq.${ATS_ID}&select=id,trigger_event_id,target_domain_module_id,source_domain_module_id,friction_level,trigger_events(event_name)&order=trigger_event_id.asc`
  );
  if (!verify.ok) { console.error(`  verify failed: ${verify.stderr}`); process.exit(1); }
  console.log(`  ${verify.data.length}/${EVENTS.length} HCM->ATS handoff rows present:`);
  for (const r of verify.data) {
    console.log(`    id ${r.id}  te ${r.trigger_event_id}  ${r.trigger_events?.event_name}  src_mod=${r.source_domain_module_id} tgt_mod=${r.target_domain_module_id} friction=${r.friction_level}`);
  }
}

main();
