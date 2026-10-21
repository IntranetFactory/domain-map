/**
 * Fix loader for 2026-05-25 ATS<->BEN-ADMIN pairwise reconciliation.
 *
 * Scope per user authorization (auto-apply):
 *   S2 NULL-FK without partner DMDO ->
 *     1) INSERT BEN-ENROLLMENT (module 72) consumer DMDO on candidates (data_object 3)
 *     2) PATCH handoff 395 target_domain_module_id = 72
 *   S3a, S3b, S4 -> empty, nothing to do.
 *
 * Both operations idempotent: skip rows that already exist; PATCH only when NULL.
 * record_status omitted on INSERT (defaults to 'new'); never set 'approved'.
 *
 * Run from project root:
 *   bun run .tmp_deploy/fix_ATS_BEN-ADMIN_2026_05_25.ts
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

const BEN_ENROLLMENT_ID = 72;
const CANDIDATES_DO_ID = 3;
const HANDOFF_ID = 395;

type DmdoRow = {
  domain_module_id: number;
  data_object_id: number;
  role: "consumer";
  necessity: "required";
  label: string;
};

const DMDO_INSERTS: DmdoRow[] = [
  {
    domain_module_id: BEN_ENROLLMENT_ID,
    data_object_id: CANDIDATES_DO_ID,
    role: "consumer",
    necessity: "required",
    label: "BEN-ENROLLMENT consumes candidates (new-hire eligibility window on candidate.hired)",
  },
];

const HANDOFF_PATCHES: { handoff_id: number; target_module_id: number; event_name: string; payload: string }[] = [
  { handoff_id: HANDOFF_ID, target_module_id: BEN_ENROLLMENT_ID, event_name: "candidate.hired", payload: "candidates" },
];

async function main() {
  console.log("Fix loader: ATS <-> BEN-ADMIN reconciliation 2026-05-25\n");

  // Pre-flight: print every proposed fix
  console.log("=== PRE-FLIGHT (proposed fixes) ===");
  console.log("DMDO inserts:");
  for (const r of DMDO_INSERTS) {
    console.log(`  + module=${r.domain_module_id} data_object=${r.data_object_id} role=${r.role} necessity=${r.necessity}`);
    console.log(`    ${r.label}`);
  }
  console.log("Handoff PATCHes:");
  for (const p of HANDOFF_PATCHES) {
    console.log(`  ~ handoff ${p.handoff_id}  event=${p.event_name}  payload=${p.payload}  ->  target_module=${p.target_module_id}`);
  }
  console.log("===\n");

  // Phase A: idempotent DMDO inserts
  console.log("Phase A: DMDO consumer rows on BEN-ENROLLMENT...");
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
  console.log(`  ${existing.data?.length ?? 0} existing rows on affected (module, data_object) pairs`);

  const toInsert = DMDO_INSERTS.filter((r) => !existingKeys.has(`${r.domain_module_id}:${r.data_object_id}`));
  if (toInsert.length === 0) {
    console.log("  all rows already present; skip insert\n");
  } else {
    console.log(`  inserting ${toInsert.length} new row(s):`);
    for (const r of toInsert) console.log(`    + ${r.label}`);
    // record_status OMITTED on purpose (Rule #1 -> defaults to 'new')
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

  // Phase B: PATCH handoff(s)
  console.log("Phase B: PATCH handoff target_domain_module_id...");
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
      } else {
        console.log(`  ! ${p.handoff_id} has UNEXPECTED non-null value ${cur} (expected NULL or ${p.target_module_id}); skip, investigate manually`);
        skipped++;
      }
      continue;
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
  console.log("Verification:");
  const dmdoVerify = await postgrest(
    "GET",
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds})&data_object_id=in.(${dataObjectIds})&select=domain_module_id,data_object_id,role,necessity,domain_modules(domain_module_code),data_objects(data_object_name)&order=domain_module_id.asc,data_object_id.asc`
  );
  if (!dmdoVerify.ok) { console.error(`  verify dmdo failed: ${dmdoVerify.stderr}`); process.exit(1); }
  console.log(`  ${dmdoVerify.data.length} DMDO row(s) on BEN-ENROLLMENT x candidates:`);
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
    console.log(`  ok, all touched handoffs now have target_domain_module_id set`);
  } else {
    console.log(`  ! ${stillNull.length} handoff(s) still NULL:`);
    for (const h of stillNull) console.log(`    ${h.id}  ${h.trigger_events?.event_name}`);
  }
}

main();
