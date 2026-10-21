/**
 * ATS M5 fix: set data_object_lifecycle_states.domain_module_id on the 10
 * workflow-gate states that were left NULL during the modularization pass.
 *
 * Identified by 2026-05-25 ATS audit. Mapping is deterministic from
 * domain_module_data_objects.role='master' for each state's data_object.
 *
 * Run from project root:
 *   bun run .tmp_deploy/patch_ats_m5_lifecycle_module_ids.ts
 */

interface CmdResult {
  ok: boolean;
  data: any;
  stderr: string;
  code: number;
}

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
  if (code !== 0) {
    return { ok: false, data: null, stderr: stderr.trim() || stdout.trim(), code };
  }
  const text = stdout.trim();
  return { ok: true, data: text ? JSON.parse(text) : null, stderr: "", code: 0 };
}

type Fix = {
  state_id: number;
  data_object: string;
  state_name: string;
  module_id: number;
  module_code: string;
};

const FIXES: Fix[] = [
  { state_id: 238, data_object: "job_requisitions",    state_name: "open",               module_id: 4, module_code: "ATS-RECRUITMENT-PIPELINE" },
  { state_id: 240, data_object: "job_requisitions",    state_name: "filled",             module_id: 4, module_code: "ATS-RECRUITMENT-PIPELINE" },
  { state_id: 232, data_object: "job_postings",        state_name: "published",          module_id: 4, module_code: "ATS-RECRUITMENT-PIPELINE" },
  { state_id: 206, data_object: "candidates",          state_name: "hired",              module_id: 1, module_code: "ATS-CANDIDATE-CRM" },
  { state_id: 207, data_object: "candidates",          state_name: "do_not_hire",        module_id: 1, module_code: "ATS-CANDIDATE-CRM" },
  { state_id: 201, data_object: "candidate_referrals", state_name: "bonus_payable",      module_id: 3, module_code: "ATS-REFERRALS" },
  { state_id: 210, data_object: "interview_scorecards",state_name: "submitted",          module_id: 5, module_code: "ATS-INTERVIEWS" },
  { state_id: 226, data_object: "job_offers",          state_name: "approved",           module_id: 6, module_code: "ATS-OFFERS" },
  { state_id: 230, data_object: "job_offers",          state_name: "rescinded",          module_id: 6, module_code: "ATS-OFFERS" },
  { state_id: 191, data_object: "background_checks",   state_name: "completed_consider", module_id: 7, module_code: "ATS-BACKGROUND-CHECKS" },
];

async function main() {
  console.log("ATS M5 fix: PATCH 10 workflow-gate states with domain_module_id\n");

  // Pre-flight: verify mappings against domain_module_data_objects.role='master'
  console.log("Pre-flight: verifying every state's data_object is mastered by the proposed module...");
  const stateIds = FIXES.map((f) => f.state_id).join(",");
  const states = await postgrest(
    "GET",
    `/data_object_lifecycle_states?id=in.(${stateIds})&select=id,data_object_id,state_name,domain_module_id,data_objects(data_object_name)`
  );
  if (!states.ok) {
    console.error(`  pre-flight read failed: ${states.stderr}`);
    process.exit(1);
  }
  const stateById = new Map<number, any>(states.data.map((s: any) => [s.id, s]));

  const dataObjectIds = [...new Set(FIXES.map((f) => {
    const s = stateById.get(f.state_id);
    return s?.data_object_id;
  }))].filter(Boolean);

  const dmdo = await postgrest(
    "GET",
    `/domain_module_data_objects?data_object_id=in.(${dataObjectIds.join(",")})&role=eq.master&select=domain_module_id,data_object_id,domain_modules(domain_module_code)`
  );
  if (!dmdo.ok) {
    console.error(`  DMDO read failed: ${dmdo.stderr}`);
    process.exit(1);
  }
  const masterModuleByDataObject = new Map<number, { module_id: number; module_code: string }>();
  for (const r of dmdo.data) {
    masterModuleByDataObject.set(r.data_object_id, {
      module_id: r.domain_module_id,
      module_code: r.domain_modules?.domain_module_code,
    });
  }

  let mismatches = 0;
  for (const f of FIXES) {
    const s = stateById.get(f.state_id);
    if (!s) {
      console.error(`  ! state ${f.state_id} not found`);
      mismatches++;
      continue;
    }
    if (s.domain_module_id !== null) {
      console.log(`  ~ state ${f.state_id} (${f.data_object}.${f.state_name}) already set to module ${s.domain_module_id} (was expected NULL) — will overwrite to ${f.module_id} if it matches DMDO`);
    }
    const canonical = masterModuleByDataObject.get(s.data_object_id);
    if (!canonical) {
      console.error(`  ! data_object ${s.data_object_id} (${f.data_object}) has no master DMDO row`);
      mismatches++;
      continue;
    }
    if (canonical.module_id !== f.module_id) {
      console.error(
        `  ! mismatch on state ${f.state_id}: hard-coded module_id ${f.module_id} (${f.module_code}) vs DMDO master module_id ${canonical.module_id} (${canonical.module_code})`
      );
      mismatches++;
    }
  }
  if (mismatches > 0) {
    console.error(`\n${mismatches} pre-flight mismatch(es); aborting without patching.`);
    process.exit(1);
  }
  console.log(`  ok — all ${FIXES.length} mappings agree with DMDO master rows\n`);

  // PATCH each row
  console.log("Patching...");
  let patched = 0;
  for (const f of FIXES) {
    const r = await postgrest(
      "PATCH",
      `/data_object_lifecycle_states?id=eq.${f.state_id}`,
      { domain_module_id: f.module_id }
    );
    if (!r.ok) {
      console.error(`  FAIL state ${f.state_id}: ${r.stderr}`);
      continue;
    }
    console.log(`  ok ${f.state_id}  ${f.data_object}.${f.state_name}  ->  ${f.module_code} (id ${f.module_id})`);
    patched++;
  }
  console.log(`\nPatched ${patched}/${FIXES.length}\n`);

  // Verify
  console.log("Post-flight verification: re-read and confirm zero NULL rows on the affected set...");
  const verify = await postgrest(
    "GET",
    `/data_object_lifecycle_states?id=in.(${stateIds})&select=id,domain_module_id,data_objects(data_object_name),state_name&order=id.asc`
  );
  if (!verify.ok) {
    console.error(`  verification read failed: ${verify.stderr}`);
    process.exit(1);
  }
  const nullsRemaining = verify.data.filter((r: any) => r.domain_module_id === null);
  if (nullsRemaining.length > 0) {
    console.error(`  ! ${nullsRemaining.length} row(s) still NULL:`);
    for (const r of nullsRemaining) console.error(`    ${r.id}  ${r.data_objects.data_object_name}.${r.state_name}`);
    process.exit(1);
  }
  console.log(`  ok — all ${FIXES.length} rows now have domain_module_id set`);

  // Also run the full M5 check on ATS to confirm we didn't miss anything
  console.log("\nFull M5 sweep on ATS (all 15 masters):");
  const fullCheck = await postgrest(
    "GET",
    `/data_object_lifecycle_states?requires_permission=eq.true&data_object_id=in.(1,2,3,4,5,6,7,8,9,10,11,12,13,14,749)&domain_module_id=is.null&select=id,data_objects(data_object_name),state_name`
  );
  if (!fullCheck.ok) {
    console.error(`  full sweep failed: ${fullCheck.stderr}`);
    process.exit(1);
  }
  if (fullCheck.data.length === 0) {
    console.log("  M5 PASS — zero NULL domain_module_id on ATS workflow-gate states");
  } else {
    console.log(`  M5 STILL FAILS — ${fullCheck.data.length} NULL row(s) remain:`);
    for (const r of fullCheck.data) console.log(`    ${r.id}  ${r.data_objects.data_object_name}.${r.state_name}`);
  }
}

main();
