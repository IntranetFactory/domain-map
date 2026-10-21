/**
 * Fix loader for the 2026-05-25 ATS<->HRSD pairwise reconciliation.
 *
 * From the diff (c:/tmp/reconcile_ATS_HRSD_2026_05_25.md):
 *   - S2 NULL-FK (1): handoff 402 `background_check.flagged` payload `background_checks`
 *     target_domain_module_id NULL because HRSD had no DMDO on background_checks (id 12).
 *
 * Plan (per user-authorized auto-apply scope, S2 NULL-FK without partner DMDO ->
 * INSERT DMDO + PATCH):
 *   1. INSERT HRSD-CASE-MGMT (id 75) consumer DMDO on background_checks (id 12).
 *      Rationale: a flagged background check is an HR escalation that materializes
 *      as an HR case (employee-relations / compliance review). HRSD-CASE-MGMT
 *      masters hr_cases + case_categories, so the consumer of the inbound payload
 *      is HRSD-CASE-MGMT. Necessity = optional (smaller orgs may not route flagged
 *      background checks through HRSD; integration is conditional on the HRSD
 *      module being deployed and on org policy treating flags as a case event).
 *   2. PATCH handoff 402 target_domain_module_id = 75.
 *   3. PATCH handoff 402 notes to reflect resolution.
 *
 * Idempotent:
 *   - DMDO insert is skipped if a row already exists for (75, 12).
 *   - Handoff PATCH only fires when target_domain_module_id IS NULL.
 *
 * record_status omitted on the DMDO insert; relies on DB default 'new' (Rule #1).
 *
 * Run from project root:
 *   bun run .tmp_deploy/fix_ATS_HRSD_2026_05_25.ts
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

const HRSD_CASE_MGMT = 75;
const BACKGROUND_CHECKS_DO = 12;
const HANDOFF_ID = 402;
const NEW_NOTE = "B10b resolved 2026-05-25: HRSD-CASE-MGMT consumes background_checks as the inbound payload. A flagged background check is escalated as an HR case (employee-relations / compliance review).";

type DmdoRow = {
  domain_module_id: number;
  data_object_id: number;
  role: "consumer";
  necessity: "optional";
  label: string;
};

const DMDO_INSERTS: DmdoRow[] = [
  {
    domain_module_id: HRSD_CASE_MGMT,
    data_object_id: BACKGROUND_CHECKS_DO,
    role: "consumer",
    necessity: "optional",
    label: "HRSD-CASE-MGMT consumes background_checks (inbound flag-escalation payload)",
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
    handoff_id: HANDOFF_ID,
    target_module_id: HRSD_CASE_MGMT,
    event_name: "background_check.flagged",
    payload: "background_checks",
  },
];

async function main() {
  console.log("Fix loader: ATS<->HRSD reconciliation (2026-05-25)\n");

  // ---- Pre-flight: print every proposed change BEFORE applying ----
  console.log("=== PRE-FLIGHT: proposed changes ===");
  console.log("DMDO inserts (skip-if-exists):");
  for (const r of DMDO_INSERTS) {
    console.log(`  + module ${r.domain_module_id} x data_object ${r.data_object_id}  role=${r.role}  necessity=${r.necessity}`);
    console.log(`    rationale: ${r.label}`);
  }
  console.log("Handoff PATCHes (only when target_domain_module_id IS NULL):");
  for (const p of HANDOFF_PATCHES) {
    console.log(`  ~ handoff ${p.handoff_id}  event=${p.event_name}  payload=${p.payload}  -> target_domain_module_id=${p.target_module_id}`);
    console.log(`    notes will be set to: "${NEW_NOTE}"`);
  }
  console.log("");

  // ---- Phase A: idempotent DMDO inserts ----
  console.log("Phase A: pre-flight read existing DMDO rows for (module, data_object) pairs...");
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
  for (const r of existing.data ?? []) {
    console.log(`    = (${r.domain_module_id}, ${r.data_object_id}) role=${r.role} necessity=${r.necessity}`);
  }

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
      // record_status deliberately OMITTED, relies on DB default 'new' (Rule #1).
    }));
    const ins = await postgrest("POST", "/domain_module_data_objects", insertRows);
    if (!ins.ok) { console.error(`  INSERT failed: ${ins.stderr}`); process.exit(1); }
    console.log(`  ok\n`);
  }

  // ---- Phase B: PATCH handoff 402 ----
  console.log("Phase B: patching handoff 402 target_domain_module_id + notes...");
  const handoffIds = HANDOFF_PATCHES.map((p) => p.handoff_id).join(",");
  const pre = await postgrest(
    "GET",
    `/handoffs?id=in.(${handoffIds})&select=id,target_domain_module_id,notes,trigger_events(event_name)`
  );
  if (!pre.ok) { console.error(`  pre-read failed: ${pre.stderr}`); process.exit(1); }
  const preState = new Map<number, { target: number | null; notes: string }>(
    pre.data.map((h: any) => [h.id, { target: h.target_domain_module_id, notes: h.notes ?? "" }])
  );

  let patched = 0, skipped = 0;
  for (const p of HANDOFF_PATCHES) {
    const cur = preState.get(p.handoff_id);
    if (!cur) { console.log(`  ! handoff ${p.handoff_id} not found; skip`); skipped++; continue; }
    if (cur.target !== null) {
      if (cur.target === p.target_module_id) {
        console.log(`  ~ ${p.handoff_id} already set to ${p.target_module_id}; skip (PATCH only NULL)`);
        skipped++;
        continue;
      } else {
        console.log(`  ! ${p.handoff_id} has UNEXPECTED non-null value ${cur.target} (expected NULL or ${p.target_module_id}); skip, investigate manually`);
        skipped++;
        continue;
      }
    }
    const r = await postgrest(
      "PATCH",
      `/handoffs?id=eq.${p.handoff_id}`,
      { target_domain_module_id: p.target_module_id, notes: NEW_NOTE }
    );
    if (!r.ok) { console.error(`  FAIL ${p.handoff_id}: ${r.stderr}`); continue; }
    console.log(`  ok ${p.handoff_id}  ${p.event_name}  payload=${p.payload}  -> module ${p.target_module_id}`);
    patched++;
  }
  console.log(`  patched ${patched}, skipped ${skipped}\n`);

  // ---- Verify ----
  console.log("Verification: re-read DMDO + handoff 402...");
  const dmdoVerify = await postgrest(
    "GET",
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds})&data_object_id=in.(${dataObjectIds})&select=domain_module_id,data_object_id,role,necessity,record_status,domain_modules(domain_module_code),data_objects(data_object_name)&order=domain_module_id.asc,data_object_id.asc`
  );
  if (!dmdoVerify.ok) { console.error(`  verify dmdo failed: ${dmdoVerify.stderr}`); process.exit(1); }
  console.log(`  ${dmdoVerify.data.length} DMDO row(s) on HRSD-CASE-MGMT x background_checks:`);
  for (const r of dmdoVerify.data) {
    console.log(`    ${r.domain_modules.domain_module_code}  ${r.role}  ${r.data_objects.data_object_name}  necessity=${r.necessity}  record_status=${r.record_status}`);
  }

  const handoffVerify = await postgrest(
    "GET",
    `/handoffs?id=in.(${handoffIds})&select=id,source_domain_module_id,target_domain_module_id,notes,trigger_events(event_name),target_module:domain_modules!target_domain_module_id(domain_module_code)&order=id.asc`
  );
  if (!handoffVerify.ok) { console.error(`  verify handoffs failed: ${handoffVerify.stderr}`); process.exit(1); }
  for (const h of handoffVerify.data) {
    console.log(`  handoff ${h.id}  ${h.trigger_events?.event_name}  src_module=${h.source_domain_module_id}  tgt_module=${h.target_domain_module_id} (${h.target_module?.domain_module_code ?? "?"})`);
    console.log(`    notes: ${h.notes}`);
  }
  const stillNull = handoffVerify.data.filter((h: any) => h.target_domain_module_id === null);
  if (stillNull.length === 0) {
    console.log(`  ok, handoff 402 target_domain_module_id is now set\n`);
  } else {
    console.log(`  ! ${stillNull.length} handoff(s) still NULL\n`);
  }
}

main();
