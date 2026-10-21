/**
 * Fix loader from the 2026-05-25 ATS<->PAYROLL pairwise reconciliation.
 *
 * Scope (S2 NULL-FK without partner DMDO, both ATS->PAYROLL):
 *   1. INSERT PAYROLL consumer DMDO row on background_checks (data_object_id 12)
 *      at PAYROLL-RUN (module 90): gates new-hire payroll initialization.
 *   2. INSERT PAYROLL consumer DMDO row on candidate_referrals (data_object_id 6)
 *      at PAYROLL-EARNINGS-DEDUCTIONS (module 92): bonus disbursement via earning codes.
 *   3. PATCH handoff 401 target_domain_module_id = 90 (PAYROLL-RUN).
 *   4. PATCH handoff 404 target_domain_module_id = 92 (PAYROLL-EARNINGS-DEDUCTIONS).
 *
 * Idempotent (existence-checked, NULL-only PATCH). record_status omitted (default 'new').
 *
 * Run from project root:
 *   bun run .tmp_deploy/fix_ATS_PAYROLL_2026_05_25.ts
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

const PAYROLL_RUN = 90;
const PAYROLL_EARNINGS_DEDUCTIONS = 92;

type DmdoRow = {
  domain_module_id: number;
  data_object_id: number;
  role: "consumer";
  necessity: "required";
  label: string;
};

const DMDO_INSERTS: DmdoRow[] = [
  { domain_module_id: PAYROLL_RUN,                 data_object_id: 12, role: "consumer", necessity: "required", label: "PAYROLL-RUN consumes background_checks (gates new-hire payroll initialization on cleared signal)" },
  { domain_module_id: PAYROLL_EARNINGS_DEDUCTIONS, data_object_id: 6,  role: "consumer", necessity: "required", label: "PAYROLL-EARNINGS-DEDUCTIONS consumes candidate_referrals (bonus disbursement via earning codes)" },
];

const HANDOFF_PATCHES: { handoff_id: number; target_module_id: number; event_name: string; payload: string }[] = [
  { handoff_id: 401, target_module_id: PAYROLL_RUN,                 event_name: "background_check.cleared",     payload: "background_checks" },
  { handoff_id: 404, target_module_id: PAYROLL_EARNINGS_DEDUCTIONS, event_name: "candidate_referral.bonus_earned", payload: "candidate_referrals" },
];

async function main() {
  console.log("Fix loader: ATS<->PAYROLL 2026-05-25\n");

  // Pre-flight: print every proposed action BEFORE applying
  console.log("=== PRE-FLIGHT: proposed actions ===");
  console.log("DMDO inserts (record_status omitted, defaults to 'new'):");
  for (const r of DMDO_INSERTS) {
    console.log(`  + module=${r.domain_module_id} data_object=${r.data_object_id} role=${r.role} necessity=${r.necessity}  -- ${r.label}`);
  }
  console.log("Handoff PATCHes (only when target_domain_module_id IS NULL):");
  for (const p of HANDOFF_PATCHES) {
    console.log(`  ~ handoff ${p.handoff_id}  ${p.event_name}  payload=${p.payload}  ->  target_module ${p.target_module_id}`);
  }
  console.log("=== END PRE-FLIGHT ===\n");

  // Phase A: DMDO inserts
  console.log("Phase A: idempotent DMDO inserts...");
  const moduleIds = [...new Set(DMDO_INSERTS.map((r) => r.domain_module_id))].join(",");
  const dataObjectIds = [...new Set(DMDO_INSERTS.map((r) => r.data_object_id))].join(",");
  const existing = await postgrest(
    "GET",
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds})&data_object_id=in.(${dataObjectIds})&select=domain_module_id,data_object_id,role,necessity`
  );
  if (!existing.ok) { console.error(`  pre-read failed: ${existing.stderr}`); process.exit(1); }
  const existingKeys = new Set<string>(
    (existing.data ?? []).map((r: any) => `${r.domain_module_id}:${r.data_object_id}`)
  );
  console.log(`  existing rows on affected pairs: ${existing.data?.length ?? 0}`);

  const toInsert = DMDO_INSERTS.filter((r) => !existingKeys.has(`${r.domain_module_id}:${r.data_object_id}`));
  let insertedCount = 0;
  if (toInsert.length === 0) {
    console.log("  all DMDO rows already present; skip insert");
  } else {
    console.log(`  inserting ${toInsert.length} row(s):`);
    for (const r of toInsert) console.log(`    + ${r.label}`);
    const insertRows = toInsert.map((r) => ({
      domain_module_id: r.domain_module_id,
      data_object_id: r.data_object_id,
      role: r.role,
      necessity: r.necessity,
      // record_status intentionally omitted: defaults to 'new' per Rule #1
    }));
    const ins = await postgrest("POST", "/domain_module_data_objects", insertRows);
    if (!ins.ok) { console.error(`  INSERT failed: ${ins.stderr}`); process.exit(1); }
    insertedCount = toInsert.length;
    console.log(`  ok, inserted ${insertedCount}`);
  }

  // Phase B: handoff PATCH (NULL-only)
  console.log("\nPhase B: PATCH handoffs (NULL-only)...");
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
        console.log(`  ~ ${p.handoff_id} already = ${p.target_module_id}; skip`);
      } else {
        console.log(`  ! ${p.handoff_id} has UNEXPECTED non-NULL value ${cur} (expected NULL or ${p.target_module_id}); SKIP — investigate manually`);
      }
      skipped++;
      continue;
    }
    const r = await postgrest(
      "PATCH",
      `/handoffs?id=eq.${p.handoff_id}&target_domain_module_id=is.null`,
      { target_domain_module_id: p.target_module_id }
    );
    if (!r.ok) { console.error(`  FAIL ${p.handoff_id}: ${r.stderr}`); skipped++; continue; }
    console.log(`  ok ${p.handoff_id}  ${p.event_name}  ->  target_module ${p.target_module_id}`);
    patched++;
  }
  console.log(`  patched ${patched}, skipped ${skipped}`);

  // Verify
  console.log("\n=== POST-VERIFY ===");
  const dmdoVerify = await postgrest(
    "GET",
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds})&data_object_id=in.(${dataObjectIds})&select=domain_module_id,data_object_id,role,necessity,domain_modules(domain_module_code),data_objects(data_object_name)&order=domain_module_id.asc`
  );
  if (!dmdoVerify.ok) { console.error(`  verify DMDO failed: ${dmdoVerify.stderr}`); process.exit(1); }
  console.log(`DMDO rows on (PAYROLL modules, ATS masters): ${dmdoVerify.data.length}`);
  for (const r of dmdoVerify.data) {
    console.log(`  ${r.domain_modules.domain_module_code}  ${r.role}  ${r.data_objects.data_object_name}  (${r.necessity})`);
  }

  const handoffVerify = await postgrest(
    "GET",
    `/handoffs?id=in.(${handoffIds})&select=id,source_domain_module_id,target_domain_module_id,trigger_events(event_name),target_module:domain_modules!target_domain_module_id(domain_module_code)&order=id.asc`
  );
  if (!handoffVerify.ok) { console.error(`  verify handoffs failed: ${handoffVerify.stderr}`); process.exit(1); }
  const stillNull = handoffVerify.data.filter((h: any) => h.target_domain_module_id === null);
  console.log(`\nHandoffs touched: ${handoffVerify.data.length}; still NULL: ${stillNull.length}`);
  for (const h of handoffVerify.data) {
    console.log(`  ${h.id}  ${h.trigger_events?.event_name}  src_module=${h.source_domain_module_id}  tgt_module=${h.target_domain_module_id} (${h.target_module?.domain_module_code ?? "-"})`);
  }
  if (stillNull.length === 0) console.log("\nOK: all touched handoffs have non-NULL target_domain_module_id");
  else { console.log("\nWARN: some handoffs still NULL"); process.exit(1); }
}

main();
