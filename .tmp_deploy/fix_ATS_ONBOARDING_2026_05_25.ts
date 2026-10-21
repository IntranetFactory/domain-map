/**
 * Fix loader from 2026-05-25 ATS<->ONBOARDING pairwise reconciliation.
 *
 * Applies the two S2 NULL-FK seed handoffs:
 *  - handoff 2   (job_offer.accepted, payload=onboarding_journeys)
 *      target_module_id = 35 (ONB-JOURNEY-MGMT) which masters onboarding_journeys.
 *      No DMDO insert needed; PATCH only.
 *  - handoff 394 (candidate.hired, payload=candidates [ATS-mastered])
 *      ONBOARDING has no DMDO on candidates yet. Insert
 *        (module=35 ONB-JOURNEY-MGMT, data_object=3 candidates, role=consumer, necessity=required)
 *      then PATCH handoff 394 target_domain_module_id = 35.
 *      Rationale: ONB-JOURNEY-MGMT is the joiner workflow originator; the hired
 *      candidate identity feeds directly into the onboarding journey.
 *
 * Constraints:
 *  - omit record_status on inserts (Rule #1, default 'new')
 *  - idempotent: check before insert/patch
 *  - PATCH only when current value is NULL
 *
 * Run from project root:
 *   bun run .tmp_deploy/fix_ATS_ONBOARDING_2026_05_25.ts
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

const ONB_JOURNEY_MGMT = 35;
const ONB_DOCUMENT_INTAKE = 36;
const ONB_WELCOME = 37;

// data_object ids
const DO_ONBOARDING_JOURNEYS = 16;
const DO_CANDIDATES = 3;

type DmdoRow = {
  domain_module_id: number;
  data_object_id: number;
  role: "consumer";
  necessity: "required";
  label: string;
};

const DMDO_INSERTS: DmdoRow[] = [
  {
    domain_module_id: ONB_JOURNEY_MGMT,
    data_object_id: DO_CANDIDATES,
    role: "consumer",
    necessity: "required",
    label: "ONB-JOURNEY-MGMT consumes candidates (hired-candidate identity feeds joiner workflow)",
  },
];

type HandoffPatch = {
  handoff_id: number;
  target_module_id: number;
  event_name: string;
  payload: string;
};

const HANDOFF_PATCHES: HandoffPatch[] = [
  { handoff_id: 2,   target_module_id: ONB_JOURNEY_MGMT, event_name: "job_offer.accepted", payload: "onboarding_journeys" },
  { handoff_id: 394, target_module_id: ONB_JOURNEY_MGMT, event_name: "candidate.hired",    payload: "candidates" },
];

async function main() {
  console.log("Fix loader: ATS <-> ONBOARDING reconciliation 2026-05-25\n");

  // Pre-flight: print every proposed action BEFORE applying
  console.log("=== PRE-FLIGHT: proposed actions ===");
  console.log(`DMDO inserts (${DMDO_INSERTS.length}):`);
  for (const r of DMDO_INSERTS) {
    console.log(`  + module=${r.domain_module_id} data_object=${r.data_object_id} role=${r.role} necessity=${r.necessity}`);
    console.log(`    ${r.label}`);
  }
  console.log(`\nHandoff PATCHes (${HANDOFF_PATCHES.length}):`);
  for (const p of HANDOFF_PATCHES) {
    console.log(`  ~ handoff ${p.handoff_id}  ${p.event_name}  payload=${p.payload}  ->  target_domain_module_id=${p.target_module_id}`);
  }
  console.log("");

  // Phase A: DMDO inserts (idempotent)
  console.log("=== Phase A: DMDO inserts ===");
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
  console.log(`  existing rows on affected (module,data_object) pairs: ${existing.data?.length ?? 0}`);

  const toInsert = DMDO_INSERTS.filter((r) => !existingKeys.has(`${r.domain_module_id}:${r.data_object_id}`));
  if (toInsert.length === 0) {
    console.log("  all DMDO rows already present; skip insert");
  } else {
    console.log(`  inserting ${toInsert.length} new row(s):`);
    for (const r of toInsert) console.log(`    + ${r.label}`);
    const insertRows = toInsert.map((r) => ({
      domain_module_id: r.domain_module_id,
      data_object_id: r.data_object_id,
      role: r.role,
      necessity: r.necessity,
      // record_status intentionally omitted (default 'new', per Rule #1)
    }));
    const ins = await postgrest("POST", "/domain_module_data_objects", insertRows);
    if (!ins.ok) { console.error(`  INSERT failed: ${ins.stderr}`); process.exit(1); }
    console.log(`  ok`);
  }

  // Phase B: handoff PATCHes (idempotent, NULL-only)
  console.log("\n=== Phase B: handoff PATCHes ===");
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
      `/handoffs?id=eq.${p.handoff_id}&target_domain_module_id=is.null`,
      { target_domain_module_id: p.target_module_id }
    );
    if (!r.ok) { console.error(`  FAIL ${p.handoff_id}: ${r.stderr}`); continue; }
    console.log(`  ok ${p.handoff_id}  ${p.event_name}  payload=${p.payload}  ->  module ${p.target_module_id}`);
    patched++;
  }
  console.log(`  patched ${patched}, skipped ${skipped}`);

  // Verify
  console.log("\n=== Verification ===");
  const dmdoVerify = await postgrest(
    "GET",
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds})&data_object_id=in.(${dataObjectIds})&select=domain_module_id,data_object_id,role,necessity,domain_modules(domain_module_code),data_objects(data_object_name)&order=domain_module_id.asc,data_object_id.asc`
  );
  if (!dmdoVerify.ok) { console.error(`  verify dmdo failed: ${dmdoVerify.stderr}`); process.exit(1); }
  console.log(`  ${dmdoVerify.data.length} DMDO row(s) on the affected pairs:`);
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
    console.log(`  ok, all ${HANDOFF_PATCHES.length} touched handoffs have target_domain_module_id set`);
    console.log(`\nPOST-VERIFY: PASS`);
  } else {
    console.log(`  ! ${stillNull.length} handoff(s) still NULL:`);
    for (const h of stillNull) console.log(`    ${h.id}  ${h.trigger_events?.event_name}`);
    console.log(`\nPOST-VERIFY: FAIL`);
    process.exit(2);
  }
}

main();
