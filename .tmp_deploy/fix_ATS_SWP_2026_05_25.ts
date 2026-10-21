/**
 * Fix loader for 2026-05-25 ATS<->SWP pairwise reconciliation.
 *
 * Source diff: c:/tmp/reconcile_ATS_SWP_2026_05_25.md
 *
 * Apply scope:
 *   - S2 NULL-FK without partner DMDO (handoff 455):
 *       INSERT ATS-RECRUITMENT-PIPELINE (id 4) consumer DMDO on
 *       position_demand_forecasts (id 25), then PATCH handoff 455
 *       target_domain_module_id = 4.
 *   - S3a (event 62 ATS->SWP, event 106 SWP->ATS): SKIP — both are
 *       co-master artifacts on job_requisitions (ATS and SWP both
 *       master it). Handoff 14 (SWP->ATS on 62) and handoff 12
 *       (ATS->SWP on 106) already exist; the reverse "missing" edges
 *       are phantom edges produced by the publisher-side trigger_events
 *       list including any master.
 *   - S3b, S4: REPORT ONLY (also co-master artifacts on
 *       job_requisitions.open).
 *
 * Both operations are idempotent.
 *
 * Run from project root (NEVER cd into .tmp_deploy):
 *   bun run .tmp_deploy/fix_ATS_SWP_2026_05_25.ts
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

const ATS_RECRUITMENT_PIPELINE = 4;
const POSITION_DEMAND_FORECASTS = 25;
const HANDOFF_455 = 455;

type DmdoRow = {
  domain_module_id: number;
  data_object_id: number;
  role: "consumer";
  necessity: "required";
  label: string;
};

const DMDO_INSERTS: DmdoRow[] = [
  {
    domain_module_id: ATS_RECRUITMENT_PIPELINE,
    data_object_id: POSITION_DEMAND_FORECASTS,
    role: "consumer",
    necessity: "required",
    label: "ATS-RECRUITMENT-PIPELINE consumes position_demand_forecasts (drives requisition creation expectations)",
  },
];

type HandoffPatch = {
  handoff_id: number;
  target_module_id: number;
  event_name: string;
  payload: string;
};

const HANDOFF_PATCHES: HandoffPatch[] = [
  {
    handoff_id: HANDOFF_455,
    target_module_id: ATS_RECRUITMENT_PIPELINE,
    event_name: "position_demand_forecast.updated",
    payload: "position_demand_forecasts",
  },
];

async function main() {
  console.log("Fix loader: ATS<->SWP pairwise reconciliation 2026-05-25\n");
  console.log("=== Pre-flight: proposed fixes ===");
  console.log("DMDO inserts (1):");
  for (const r of DMDO_INSERTS) {
    console.log(`  + module=${r.domain_module_id} data_object=${r.data_object_id} role=${r.role} necessity=${r.necessity}`);
    console.log(`    ${r.label}`);
  }
  console.log("Handoff PATCHes (1):");
  for (const p of HANDOFF_PATCHES) {
    console.log(`  ~ handoff ${p.handoff_id}  ${p.event_name}  payload=${p.payload}  ->  target_domain_module_id=${p.target_module_id}`);
  }
  console.log("");

  // --- Phase A: idempotent DMDO inserts ---
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
  console.log(`  ${existing.data?.length ?? 0} existing row(s) on the affected (module, data_object) pairs`);

  const toInsert = DMDO_INSERTS.filter((r) => !existingKeys.has(`${r.domain_module_id}:${r.data_object_id}`));
  if (toInsert.length === 0) {
    console.log("  all DMDO rows already present; skipping insert\n");
  } else {
    console.log(`  inserting ${toInsert.length} new row(s):`);
    for (const r of toInsert) console.log(`    + ${r.label}`);
    const insertRows = toInsert.map((r) => ({
      domain_module_id: r.domain_module_id,
      data_object_id: r.data_object_id,
      role: r.role,
      necessity: r.necessity,
      // NOTE: record_status omitted intentionally — relies on default 'new' (Rule #1).
    }));
    const ins = await postgrest("POST", "/domain_module_data_objects", insertRows);
    if (!ins.ok) { console.error(`  INSERT failed: ${ins.stderr}`); process.exit(1); }
    console.log("  ok\n");
  }

  // --- Phase B: idempotent handoff PATCHes (only when current value is NULL) ---
  console.log("Phase B: patching handoffs (NULL-only)...");
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

  // --- Verify ---
  console.log("Verification: re-read DMDO + handoff...");
  const dmdoVerify = await postgrest(
    "GET",
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds})&data_object_id=in.(${dataObjectIds})&select=domain_module_id,data_object_id,role,necessity,record_status,domain_modules(domain_module_code),data_objects(data_object_name)`
  );
  if (!dmdoVerify.ok) { console.error(`  verify dmdo failed: ${dmdoVerify.stderr}`); process.exit(1); }
  console.log(`  ${dmdoVerify.data.length} DMDO row(s) now on ATS-RECRUITMENT-PIPELINE x position_demand_forecasts:`);
  for (const r of dmdoVerify.data) {
    console.log(`    ${r.domain_modules.domain_module_code}  ${r.role}  ${r.data_objects.data_object_name}  (${r.necessity}, status=${r.record_status})`);
  }

  const handoffVerify = await postgrest(
    "GET",
    `/handoffs?id=in.(${handoffIds})&select=id,target_domain_module_id,trigger_events(event_name),tgt_mod:domain_modules!target_domain_module_id(domain_module_code)&order=id.asc`
  );
  if (!handoffVerify.ok) { console.error(`  verify handoffs failed: ${handoffVerify.stderr}`); process.exit(1); }
  for (const h of handoffVerify.data) {
    console.log(`  handoff ${h.id}  ${h.trigger_events?.event_name}  target_module=${h.tgt_mod?.domain_module_code ?? "NULL"} (id=${h.target_domain_module_id})`);
  }
  const stillNull = handoffVerify.data.filter((h: any) => h.target_domain_module_id === null);
  if (stillNull.length === 0) {
    console.log("  ok — all targeted handoffs now have target_domain_module_id set");
  } else {
    console.log(`  ! ${stillNull.length} handoff(s) still NULL`);
  }
}

main();
