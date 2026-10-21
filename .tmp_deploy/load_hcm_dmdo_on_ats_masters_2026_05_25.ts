/**
 * Load-1 from the 2026-05-25 ATS<->HCM pairwise reconciliation:
 * Insert HCM-side consumer DMDO rows on 5 ATS masters, then patch the
 * 7 ATS->HCM handoffs that had NULL target_domain_module_id.
 *
 * Both operations are idempotent (skip rows that already exist).
 *
 * Run from project root:
 *   bun run .tmp_deploy/load_hcm_dmdo_on_ats_masters_2026_05_25.ts
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

type DmdoRow = {
  domain_module_id: number;
  data_object_id: number;
  role: "consumer";
  necessity: "required";
  label: string; // for logging only
};

const HCM_CORE_WORKER = 54;
const HCM_ORG_POSITIONS = 55;
const HCM_LIFECYCLE_WORKFLOWS = 56;

const DMDO_INSERTS: DmdoRow[] = [
  { domain_module_id: HCM_ORG_POSITIONS,        data_object_id: 1,   role: "consumer", necessity: "required", label: "HCM-ORG-POSITIONS consumes job_requisitions" },
  { domain_module_id: HCM_LIFECYCLE_WORKFLOWS,  data_object_id: 3,   role: "consumer", necessity: "required", label: "HCM-LIFECYCLE-WORKFLOWS consumes candidates" },
  { domain_module_id: HCM_LIFECYCLE_WORKFLOWS,  data_object_id: 11,  role: "consumer", necessity: "required", label: "HCM-LIFECYCLE-WORKFLOWS consumes job_offers" },
  { domain_module_id: HCM_LIFECYCLE_WORKFLOWS,  data_object_id: 10,  role: "consumer", necessity: "required", label: "HCM-LIFECYCLE-WORKFLOWS consumes candidate_assessments" },
  { domain_module_id: HCM_LIFECYCLE_WORKFLOWS,  data_object_id: 749, role: "consumer", necessity: "required", label: "HCM-LIFECYCLE-WORKFLOWS consumes pre_employees" },
];

// handoff_id -> target_domain_module_id to set (deterministically derived from DMDO_INSERTS above)
const HANDOFF_PATCHES: { handoff_id: number; target_module_id: number; event_name: string; payload: string }[] = [
  { handoff_id: 406,  target_module_id: HCM_ORG_POSITIONS,       event_name: "headcount.approved",         payload: "job_requisitions" },
  { handoff_id: 399,  target_module_id: HCM_ORG_POSITIONS,       event_name: "requisition.filled",         payload: "job_requisitions" },
  { handoff_id: 393,  target_module_id: HCM_LIFECYCLE_WORKFLOWS, event_name: "candidate.hired",            payload: "candidates" },
  { handoff_id: 396,  target_module_id: HCM_LIFECYCLE_WORKFLOWS, event_name: "job_offer.accepted",         payload: "job_offers" },
  { handoff_id: 1033, target_module_id: HCM_LIFECYCLE_WORKFLOWS, event_name: "candidate_assessment.passed", payload: "candidate_assessments" },
  { handoff_id: 1035, target_module_id: HCM_LIFECYCLE_WORKFLOWS, event_name: "candidate_assessment.failed", payload: "candidate_assessments" },
  { handoff_id: 1037, target_module_id: HCM_LIFECYCLE_WORKFLOWS, event_name: "pre_employee.activated",     payload: "pre_employees" },
];

async function main() {
  console.log("Load-1: HCM-side DMDO consumer rows on 5 ATS masters + 7 handoff PATCHes\n");

  // Phase A: idempotent DMDO inserts
  console.log("Phase A: pre-flight read existing DMDO rows...");
  const moduleIds = [...new Set(DMDO_INSERTS.map((r) => r.domain_module_id))].join(",");
  const dataObjectIds = [...new Set(DMDO_INSERTS.map((r) => r.data_object_id))].join(",");
  const existing = await postgrest(
    "GET",
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds})&data_object_id=in.(${dataObjectIds})&select=domain_module_id,data_object_id,role,necessity`
  );
  if (!existing.ok) { console.error(`  read failed: ${existing.stderr}`); process.exit(1); }
  const existingKeys = new Set<string>(
    (existing.data ?? []).map((r: any) => `${r.domain_module_id}:${r.data_object_id}`)
  );
  console.log(`  ${existing.data?.length ?? 0} existing rows on the affected (module, data_object) pairs`);

  const toInsert = DMDO_INSERTS.filter((r) => !existingKeys.has(`${r.domain_module_id}:${r.data_object_id}`));
  if (toInsert.length === 0) {
    console.log("  all 5 rows already present; skipping insert\n");
  } else {
    console.log(`  inserting ${toInsert.length} new rows:`);
    for (const r of toInsert) console.log(`    + ${r.label}`);
    const insertRows = toInsert.map((r) => ({
      domain_module_id: r.domain_module_id,
      data_object_id: r.data_object_id,
      role: r.role,
      necessity: r.necessity,
    }));
    const ins = await postgrest("POST", "/domain_module_data_objects", insertRows);
    if (!ins.ok) { console.error(`  INSERT failed: ${ins.stderr}`); process.exit(1); }
    console.log(`  ok\n`);
  }

  // Phase B: PATCH the 7 handoffs
  console.log("Phase B: patching 7 ATS->HCM handoffs with target_domain_module_id...");
  // Pre-flight: read current state
  const handoffIds = HANDOFF_PATCHES.map((p) => p.handoff_id).join(",");
  const handoffsPre = await postgrest(
    "GET",
    `/handoffs?id=in.(${handoffIds})&select=id,target_domain_module_id,trigger_events(event_name)`
  );
  if (!handoffsPre.ok) { console.error(`  pre-read failed: ${handoffsPre.stderr}`); process.exit(1); }
  const preState = new Map<number, number | null>(
    handoffsPre.data.map((h: any) => [h.id, h.target_domain_module_id])
  );

  let patched = 0, skipped = 0;
  for (const p of HANDOFF_PATCHES) {
    const cur = preState.get(p.handoff_id);
    if (cur !== null && cur !== undefined) {
      if (cur === p.target_module_id) {
        console.log(`  ~ ${p.handoff_id} already set to ${p.target_module_id}; skip`);
        skipped++;
        continue;
      } else {
        console.log(`  ! ${p.handoff_id} has UNEXPECTED non-null value ${cur} (expected NULL or ${p.target_module_id}); skip — investigate manually`);
        skipped++;
        continue;
      }
    }
    const r = await postgrest(
      "PATCH",
      `/handoffs?id=eq.${p.handoff_id}`,
      { target_domain_module_id: p.target_module_id }
    );
    if (!r.ok) { console.error(`  FAIL ${p.handoff_id}: ${r.stderr}`); continue; }
    console.log(`  ok ${p.handoff_id}  ${p.event_name}  payload=${p.payload}  ->  module ${p.target_module_id}`);
    patched++;
  }
  console.log(`  patched ${patched}, skipped ${skipped}\n`);

  // Verify
  console.log("Verification: re-read DMDO + handoffs...");
  const dmdoVerify = await postgrest(
    "GET",
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds})&data_object_id=in.(${dataObjectIds})&select=domain_module_id,data_object_id,role,necessity,domain_modules(domain_module_code),data_objects(data_object_name)&order=domain_module_id.asc,data_object_id.asc`
  );
  if (!dmdoVerify.ok) { console.error(`  verify dmdo failed: ${dmdoVerify.stderr}`); process.exit(1); }
  console.log(`  ${dmdoVerify.data.length} DMDO rows now on HCM modules x ATS masters:`);
  for (const r of dmdoVerify.data) {
    console.log(`    ${r.domain_modules.domain_module_code}  ${r.role}  ${r.data_objects.data_object_name}  (${r.necessity})`);
  }

  const handoffVerify = await postgrest(
    "GET",
    `/handoffs?id=in.(${handoffIds})&select=id,target_domain_module_id,trigger_events(event_name)&order=id.asc`
  );
  if (!handoffVerify.ok) { console.error(`  verify handoffs failed: ${handoffVerify.stderr}`); process.exit(1); }
  const stillNull = handoffVerify.data.filter((h: any) => h.target_domain_module_id === null);
  if (stillNull.length === 0) {
    console.log(`  ok — all 7 handoffs now have target_domain_module_id set\n`);
  } else {
    console.log(`  ! ${stillNull.length} handoff(s) still NULL:`);
    for (const h of stillNull) console.log(`    ${h.id}  ${h.trigger_events?.event_name}`);
  }

  // Catalog-wide B10b sweep on ATS-source rows
  const remainingAtsB10b = await postgrest(
    "GET",
    `/handoffs?source_domain_id=eq.56&target_domain_module_id=is.null&select=id,trigger_events(event_name),target_domain:domains!target_domain_id(domain_code)&order=id.asc`
  );
  if (remainingAtsB10b.ok) {
    console.log(`ATS->* outbound rows still with NULL target_domain_module_id: ${remainingAtsB10b.data.length}`);
    for (const h of remainingAtsB10b.data) {
      console.log(`  ${h.id}  ${h.trigger_events?.event_name}  -> ${h.target_domain?.domain_code}`);
    }
  }
}

main();
