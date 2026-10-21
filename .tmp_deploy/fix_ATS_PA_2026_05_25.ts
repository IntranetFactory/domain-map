/**
 * Fix loader from the 2026-05-25 ATS<->PA pairwise reconciliation.
 *
 * Three S2 NULL-FK handoffs to fix:
 *
 *  1. handoff 23  (ATS-RECRUITMENT-PIPELINE -> PA, event `requisition.filled`,
 *     payload `people_kpis` id=43)
 *     - payload is MASTERED by PA-WORKFORCE-METRICS (id 81). Per pairwise
 *       reconciliation rule, the master suffices as the consumer leg, no DMDO
 *       insert needed. Just PATCH target_domain_module_id = 81.
 *
 *  2. handoff 403 (ATS-CANDIDATE-CRM -> PA, event `recruitment_source.attributed`,
 *     payload `recruitment_sources` id=5)
 *     - payload is mastered by ATS-CANDIDATE-CRM. PA does NOT yet hold a DMDO
 *       on it. PA-WORKFORCE-METRICS (id 81) is the workforce-analytics module that
 *       would compute source attribution / recruiting velocity. INSERT a consumer
 *       DMDO row (necessity=required, PA's core recruiting-analytics workflow
 *       needs the read), then PATCH target_domain_module_id = 81.
 *
 *  3. handoff 453 (PA-PREDICTIVE-MODELS -> ATS, event `predictive_model.scored`,
 *     payload `predictive_models` id=46)
 *     - payload is mastered by PA-PREDICTIVE-MODELS (id 83). ATS does NOT yet
 *       hold a DMDO on it. ATS-RECRUITMENT-PIPELINE (id 4) consumes predictive
 *       scores to triage / rank candidates in the pipeline. INSERT a consumer
 *       DMDO row (necessity=optional, predictive scoring is an enhancement to
 *       pipeline workflows, not a hard gate), then PATCH target_domain_module_id = 4.
 *
 * Idempotent: existence-checks before every INSERT; PATCH only when current
 * target_domain_module_id is NULL.
 *
 * record_status is OMITTED on INSERTs (default 'new' per Rule #1).
 *
 * Run from project root:
 *   bun run .tmp_deploy/fix_ATS_PA_2026_05_25.ts
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

const PA_WORKFORCE_METRICS = 81;
const PA_PREDICTIVE_MODELS = 83;
const ATS_RECRUITMENT_PIPELINE = 4;
const ATS_CANDIDATE_CRM = 1;

type DmdoRow = {
  domain_module_id: number;
  data_object_id: number;
  role: "consumer";
  necessity: "required" | "optional";
  label: string;
};

const DMDO_INSERTS: DmdoRow[] = [
  { domain_module_id: PA_WORKFORCE_METRICS,    data_object_id: 5,  role: "consumer", necessity: "required", label: "PA-WORKFORCE-METRICS consumes recruitment_sources" },
  { domain_module_id: ATS_RECRUITMENT_PIPELINE, data_object_id: 46, role: "consumer", necessity: "optional", label: "ATS-RECRUITMENT-PIPELINE consumes predictive_models" },
];

const HANDOFF_PATCHES: { handoff_id: number; target_module_id: number; event_name: string; payload: string; rationale: string }[] = [
  { handoff_id: 23,  target_module_id: PA_WORKFORCE_METRICS,    event_name: "requisition.filled",          payload: "people_kpis",         rationale: "PA-WORKFORCE-METRICS masters people_kpis (master suffices, no consumer DMDO needed)" },
  { handoff_id: 403, target_module_id: PA_WORKFORCE_METRICS,    event_name: "recruitment_source.attributed", payload: "recruitment_sources", rationale: "PA-WORKFORCE-METRICS computes source attribution; consumer DMDO inserted above" },
  { handoff_id: 453, target_module_id: ATS_RECRUITMENT_PIPELINE, event_name: "predictive_model.scored",      payload: "predictive_models",   rationale: "ATS-RECRUITMENT-PIPELINE consumes scores for candidate ranking; consumer DMDO inserted above" },
];

function preflight() {
  console.log("PRE-FLIGHT — proposed fixes:\n");
  console.log("  DMDO INSERTS (after existence check):");
  for (const r of DMDO_INSERTS) {
    console.log(`    + module=${r.domain_module_id}  data_object=${r.data_object_id}  role=${r.role}  necessity=${r.necessity}  // ${r.label}`);
  }
  console.log("\n  HANDOFF PATCHES (only when current target_domain_module_id IS NULL):");
  for (const p of HANDOFF_PATCHES) {
    console.log(`    ~ handoff ${p.handoff_id}  event=${p.event_name}  payload=${p.payload}  ->  target_domain_module_id=${p.target_module_id}`);
    console.log(`      rationale: ${p.rationale}`);
  }
  console.log("");
}

async function main() {
  console.log("Fix loader: ATS <-> PA pairwise reconciliation 2026-05-25\n");
  preflight();

  // ---------- Phase A: idempotent DMDO inserts ----------
  console.log("Phase A: pre-flight read existing DMDO rows on affected pairs...");
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
  console.log(`  ${existing.data?.length ?? 0} existing rows`);

  const toInsert = DMDO_INSERTS.filter((r) => !existingKeys.has(`${r.domain_module_id}:${r.data_object_id}`));
  if (toInsert.length === 0) {
    console.log("  all DMDO rows already present; skipping insert\n");
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
    console.log("  ok\n");
  }

  // ---------- Phase B: PATCH handoffs (only NULL targets) ----------
  console.log("Phase B: patching handoffs with target_domain_module_id...");
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
      } else {
        console.log(`  ! ${p.handoff_id} has UNEXPECTED non-null value ${cur} (expected NULL or ${p.target_module_id}); skip — investigate manually`);
      }
      skipped++;
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

  // ---------- Verify ----------
  console.log("Verification: re-read DMDO + handoffs...");
  const dmdoVerify = await postgrest(
    "GET",
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds})&data_object_id=in.(${dataObjectIds})&select=domain_module_id,data_object_id,role,necessity,domain_modules(domain_module_code),data_objects(data_object_name)&order=domain_module_id.asc,data_object_id.asc`
  );
  if (!dmdoVerify.ok) { console.error(`  verify dmdo failed: ${dmdoVerify.stderr}`); process.exit(1); }
  console.log(`  ${dmdoVerify.data.length} DMDO rows on affected (module, data_object) pairs:`);
  for (const r of dmdoVerify.data) {
    console.log(`    ${r.domain_modules.domain_module_code}  ${r.role}  ${r.data_objects.data_object_name}  (${r.necessity})`);
  }

  const handoffVerify = await postgrest(
    "GET",
    `/handoffs?id=in.(${handoffIds})&select=id,target_domain_module_id,trigger_events(event_name),target_module:domain_modules!target_domain_module_id(domain_module_code)&order=id.asc`
  );
  if (!handoffVerify.ok) { console.error(`  verify handoffs failed: ${handoffVerify.stderr}`); process.exit(1); }
  const stillNull = handoffVerify.data.filter((h: any) => h.target_domain_module_id === null);
  for (const h of handoffVerify.data) {
    console.log(`    handoff ${h.id}  ${h.trigger_events?.event_name}  ->  ${h.target_module?.domain_module_code ?? "NULL"}`);
  }
  if (stillNull.length === 0) {
    console.log("  ok — all 3 handoffs now have target_domain_module_id set");
  } else {
    console.log(`  ! ${stillNull.length} handoff(s) still NULL`);
    process.exit(1);
  }
}

main();
