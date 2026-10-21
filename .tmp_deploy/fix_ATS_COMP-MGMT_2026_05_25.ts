/**
 * Pairwise reconciliation fix loader: ATS (56) <-> COMP-MGMT (60)
 * Date: 2026-05-25
 *
 * Closes two S2 NULL-FK handoffs by inserting deterministically-implied
 * consumer DMDO rows on the partner side, then patching the handoff
 * target_domain_module_id to the new consumer module.
 *
 * Both operations are idempotent. record_status omitted on inserts
 * (default 'new' per SKILL.md Rule #1). NEVER sets 'approved'.
 *
 * Run from project root:
 *   bun run .tmp_deploy/fix_ATS_COMP-MGMT_2026_05_25.ts
 *
 * --- Decisions ---
 *
 * Handoff 398: ATS-OFFERS (6) -> COMP-MGMT, event `job_offer.signed`,
 *   payload `job_offers` (11). Target was NULL because no COMP-MGMT module
 *   declared DMDO on job_offers. Fan-out parallel of existing handoff 121
 *   (same trigger_event 81, payload `compensation_statements` to module 85
 *   COMP-STATEMENTS). Closing the loop, COMP-STATEMENTS consumes the
 *   signed offer to seed the new-hire total-rewards statement.
 *   INSERT: COMP-STATEMENTS (85) consumer/required on job_offers (11)
 *   PATCH:  handoff 398.target_domain_module_id = 85
 *
 * Handoff 1139: COMP-BENCHMARKING (80) -> ATS, event
 *   `compensation_benchmark.refreshed`, payload `compensation_benchmarks`
 *   (159). Target was NULL because no ATS module declared DMDO on
 *   compensation_benchmarks. ATS-OFFERS (6) constructs offer packages and
 *   already receives handoff 425 (`salary_band.updated` -> ATS-OFFERS);
 *   benchmark refreshes are the natural sibling input on the same shape.
 *   INSERT: ATS-OFFERS (6) consumer/required on compensation_benchmarks (159)
 *   PATCH:  handoff 1139.target_domain_module_id = 6
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
  label: string;
};

const COMP_STATEMENTS = 85;
const ATS_OFFERS = 6;
const JOB_OFFERS = 11;
const COMP_BENCHMARKS = 159;

const DMDO_INSERTS: DmdoRow[] = [
  { domain_module_id: COMP_STATEMENTS, data_object_id: JOB_OFFERS,      role: "consumer", necessity: "required", label: "COMP-STATEMENTS consumes job_offers (seed new-hire statement on signing)" },
  { domain_module_id: ATS_OFFERS,      data_object_id: COMP_BENCHMARKS, role: "consumer", necessity: "required", label: "ATS-OFFERS consumes compensation_benchmarks (offer-construction reference)" },
];

const HANDOFF_PATCHES: { handoff_id: number; target_module_id: number; event_name: string; payload: string }[] = [
  { handoff_id: 398,  target_module_id: COMP_STATEMENTS, event_name: "job_offer.signed",                payload: "job_offers" },
  { handoff_id: 1139, target_module_id: ATS_OFFERS,      event_name: "compensation_benchmark.refreshed", payload: "compensation_benchmarks" },
];

async function main() {
  console.log("Fix loader: ATS <-> COMP-MGMT pairwise reconciliation (2026-05-25)\n");

  // -------- Pre-flight: print every proposed fix BEFORE applying --------
  console.log("=== Pre-flight: proposed fixes ===");
  console.log("DMDO inserts:");
  for (const r of DMDO_INSERTS) {
    console.log(`  + module=${r.domain_module_id}  data_object=${r.data_object_id}  ${r.role}/${r.necessity}  -- ${r.label}`);
  }
  console.log("Handoff PATCHes:");
  for (const p of HANDOFF_PATCHES) {
    console.log(`  ~ handoff ${p.handoff_id} (${p.event_name}, payload=${p.payload}) -> target_domain_module_id = ${p.target_module_id}`);
  }
  console.log("");

  // -------- Phase A: idempotent DMDO inserts --------
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
    console.log("  all rows already present; skipping insert\n");
  } else {
    console.log(`  inserting ${toInsert.length} new rows:`);
    for (const r of toInsert) console.log(`    + ${r.label}`);
    // Omit record_status -- rely on default 'new' (Rule #1)
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

  // -------- Phase B: PATCH handoffs (only when current value is NULL) --------
  console.log("Phase B: patching handoffs with target_domain_module_id (PATCH only NULL)...");
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
        console.log(`  ! ${p.handoff_id} has UNEXPECTED non-null value ${cur} (expected NULL or ${p.target_module_id}); skip - investigate manually`);
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

  // -------- Verify --------
  console.log("Verification: re-read DMDO + handoffs...");
  const dmdoVerify = await postgrest(
    "GET",
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds})&data_object_id=in.(${dataObjectIds})&select=domain_module_id,data_object_id,role,necessity,domain_modules(domain_module_code),data_objects(data_object_name)&order=domain_module_id.asc,data_object_id.asc`
  );
  if (!dmdoVerify.ok) { console.error(`  verify dmdo failed: ${dmdoVerify.stderr}`); process.exit(1); }
  console.log(`  ${dmdoVerify.data.length} DMDO rows on affected (module, data_object) pairs:`);
  for (const r of dmdoVerify.data) {
    console.log(`    ${r.domain_modules.domain_module_code}  ${r.role}/${r.necessity}  ${r.data_objects.data_object_name}`);
  }

  const handoffVerify = await postgrest(
    "GET",
    `/handoffs?id=in.(${handoffIds})&select=id,target_domain_module_id,trigger_events(event_name)&order=id.asc`
  );
  if (!handoffVerify.ok) { console.error(`  verify handoffs failed: ${handoffVerify.stderr}`); process.exit(1); }
  const stillNull = handoffVerify.data.filter((h: any) => h.target_domain_module_id === null);
  if (stillNull.length === 0) {
    console.log(`  ok - all ${HANDOFF_PATCHES.length} handoffs now have target_domain_module_id set\n`);
  } else {
    console.log(`  ! ${stillNull.length} handoff(s) still NULL:`);
    for (const h of stillNull) console.log(`    ${h.id}  ${h.trigger_events?.event_name}`);
  }
}

main();
