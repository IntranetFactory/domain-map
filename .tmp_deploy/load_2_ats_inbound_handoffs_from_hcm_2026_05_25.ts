/**
 * Load-2 from the 2026-05-25 ATS<->HCM pairwise reconciliation:
 * Insert 4 ATS-side inbound handoffs for events HCM already publishes
 * (trigger_events 390-393) that ATS-RECRUITMENT-PIPELINE consumes but
 * isn't subscribed to.
 *
 * Idempotent: skips rows that already exist on (trigger_event_id, source, target).
 *
 * Run from project root:
 *   bun run .tmp_deploy/load_2_ats_inbound_handoffs_from_hcm_2026_05_25.ts
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

const HANDOFFS = [
  {
    trigger_event_id: 390,
    event_name: "job_profile.updated",
    data_object_id: 33,
    payload: "job_profiles",
    friction: "medium",
    notes: "Job profile changes (skills, requirements, level) invalidate the embedded copy in ATS; pipeline must refresh local cache for requisitions referencing the profile.",
  },
  {
    trigger_event_id: 391,
    event_name: "org_unit.created",
    data_object_id: 34,
    payload: "org_units",
    friction: "medium",
    notes: "New org unit becomes available for requisition tagging; ATS embedded org_units copy needs the new row.",
  },
  {
    trigger_event_id: 392,
    event_name: "org_unit.merged",
    data_object_id: 34,
    payload: "org_units",
    friction: "high",
    notes: "Org unit merge requires re-pointing every active requisition tagged to the merged-from unit; cache invalidation plus reference rewrite.",
  },
  {
    trigger_event_id: 393,
    event_name: "org_unit.disbanded",
    data_object_id: 34,
    payload: "org_units",
    friction: "high",
    notes: "Org unit disbanded; active requisitions referencing it must be re-targeted or closed.",
  },
];

async function main() {
  console.log("Load-2: 4 ATS-side inbound handoffs from existing HCM trigger_events\n");

  const teIds = HANDOFFS.map((h) => h.trigger_event_id).join(",");
  const existing = await postgrest(
    "GET",
    `/handoffs?trigger_event_id=in.(${teIds})&source_domain_id=eq.${HCM_ID}&target_domain_id=eq.${ATS_ID}&select=id,trigger_event_id`
  );
  if (!existing.ok) { console.error(`  read failed: ${existing.stderr}`); process.exit(1); }
  const haveTeIds = new Set<number>((existing.data ?? []).map((r: any) => r.trigger_event_id));

  const toInsert = HANDOFFS.filter((h) => !haveTeIds.has(h.trigger_event_id));
  console.log(`  ${existing.data?.length ?? 0} already exist; ${toInsert.length} to insert\n`);
  if (toInsert.length === 0) {
    console.log("  nothing to do");
    return;
  }

  for (const h of toInsert) console.log(`  + handoff te=${h.trigger_event_id} ${h.event_name} payload=${h.payload} friction=${h.friction}`);

  const insertRows = toInsert.map((h) => ({
    source_domain_id: HCM_ID,
    target_domain_id: ATS_ID,
    source_domain_module_id: HCM_ORG_POSITIONS,
    target_domain_module_id: ATS_RECRUITMENT_PIPELINE,
    trigger_event_id: h.trigger_event_id,
    data_object_id: h.data_object_id,
    integration_pattern: "api_call",
    friction_level: h.friction,
    notes: h.notes,
  }));

  console.log("\n  inserting...");
  const ins = await postgrest("POST", "/handoffs", insertRows);
  if (!ins.ok) { console.error(`  INSERT failed: ${ins.stderr}`); process.exit(1); }
  console.log("  ok\n");

  // Verify
  const verify = await postgrest(
    "GET",
    `/handoffs?trigger_event_id=in.(${teIds})&source_domain_id=eq.${HCM_ID}&target_domain_id=eq.${ATS_ID}&select=id,trigger_event_id,target_domain_module_id,source_domain_module_id,trigger_events(event_name)&order=trigger_event_id.asc`
  );
  if (!verify.ok) { console.error(`  verify failed: ${verify.stderr}`); process.exit(1); }
  console.log(`  ${verify.data.length}/${HANDOFFS.length} HCM->ATS handoff rows present:`);
  for (const r of verify.data) {
    console.log(`    id ${r.id}  te ${r.trigger_event_id}  ${r.trigger_events?.event_name}  src_mod=${r.source_domain_module_id} tgt_mod=${r.target_domain_module_id}`);
  }
}

main();
