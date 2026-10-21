/**
 * EM-FUND-PLATFORM b1 technical fixes (audit 2026-05-30).
 *
 * Applies the subset of Bucket 1 findings that are truly technical:
 *   - B1-S4: M5 PATCH backfill `domain_module_id` on 6 lifecycle states
 *     across `fund_formations` (->26 EM-FUND-FORMATION) and `spvs`
 *     (->27 EM-FUND-SPV). Audit pre-specifies the per-master module
 *     mapping. State IDs verified live before authoring.
 *   - B1-M1 (partial): INSERT 2 `domain_regulations` rows linking
 *     EM-FUND-PLATFORM to the two regulations the audit names that
 *     ALREADY exist in `/regulations`: Bank Secrecy Act (id 49) and
 *     Foreign Account Tax Compliance Act (id 50). Both are universally
 *     applicable to emerging-manager GPs (BSA = KYC/AML backbone,
 *     FATCA = LP tax-status during onboarding).
 *
 * Deferred (per prompt scope):
 *   B1-M1 SEC Investment Advisers Act, Reg D, CRS, AMLD6, state
 *         blue-sky -> regulation rows do not exist in /regulations;
 *         new entities deferred.
 *   B1-W1..W5 new substrate data_objects -> "new entities" deferral.
 *   B1-S1 (A4) catalog_tagline / catalog_description -> Rule #20.
 *   B1-S2 pattern flag PATCHes -> "pattern flag flips" deferral.
 *   B1-S3 user-edges -> audit uses "verb: X or Y" and is partially
 *         gated on B1-W2/W4 entities; not pre-specified exact tuples.
 *   B1-S5 aliases -> "no bulk data_object_aliases inserts unless audit
 *         pre-specifies exact tuples" (audit lists candidate forms,
 *         not exact alias_name + alias_type tuples).
 *   B1-S6 system skills -> gated on Bucket 2 #3 starter-kit decision.
 *   B1-L1..L3 new trigger_events + new lifecycle_states -> new entities,
 *         "after states load" sequencing.
 *   B1-B6 intra-domain `data_object_relationships` -> these are
 *         master-to-master edges, not user-edges; "user-edges Rule #10"
 *         scope only.
 *   B1-B9b intra-domain `handoffs` -> new entities; no `handoff_id`
 *         pre-specified.
 *   B1-H1a APQC defer-to-Discover proposal, not a load.
 *
 * Rule #1: record_status omitted; defaults to 'new'.
 * Rule #15: notes left unset (empty by default).
 *
 * Run from project root:
 *   bun run .tmp_deploy/fix_em_fund_platform_b1_technical_2026_05_31.ts
 */

type CmdResult = { ok: boolean; data: any; stderr: string; code: number };

async function call(server: string, tool: string, payload: any): Promise<CmdResult> {
  const proc = Bun.spawn(["semantius", "call", server, tool], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) return { ok: false, data: null, stderr: err.trim() || out.trim(), code };
  return { ok: true, data: out.trim() ? JSON.parse(out.trim()) : null, stderr: "", code };
}

async function get(path: string): Promise<any> {
  const r = await call("crud", "postgrestRequest", { method: "GET", path });
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.stderr}`);
  return r.data;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await call("crud", "postgrestRequest", { method: "PATCH", path, body });
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.stderr}`);
  return r.data;
}

async function post(path: string, body: any): Promise<any> {
  const r = await call("crud", "postgrestRequest", { method: "POST", path, body });
  if (!r.ok) throw new Error(`POST ${path} failed: ${r.stderr}`);
  return r.data;
}

// Resolved IDs (verified live 2026-05-31 before authoring).
const EM_FUND_PLATFORM_DOMAIN_ID = 163;
const EM_FUND_FORMATION_MODULE_ID = 26;
const EM_FUND_SPV_MODULE_ID = 27;
const FUND_FORMATIONS_DO_ID = 781;
const SPVS_DO_ID = 782;
const BSA_REGULATION_ID = 49;             // Bank Secrecy Act (US)
const FATCA_REGULATION_ID = 50;            // Foreign Account Tax Compliance Act

// =====================================================================
// B1-S4: PATCH `domain_module_id` on 6 lifecycle-state rows.
// Audit (audits/EM-FUND-PLATFORM.md, B1-S4): fund_formations states ->
// module 26 (EM-FUND-FORMATION), spvs states -> module 27 (EM-FUND-SPV).
// Row IDs verified live: 482/483/484 (fund_formations drafted/filed/
// operational) and 479/480/481 (spvs forming/active/wound_down).
// =====================================================================
async function fixB1S4() {
  console.log("\n[B1-S4] domain_module_id backfill on EM-FUND-PLATFORM lifecycle states");

  type Plan = {
    id: number;
    expectedDataObjectId: number;
    expectedStateName: string;
    targetModuleId: number;
  };

  const plan: Plan[] = [
    { id: 482, expectedDataObjectId: FUND_FORMATIONS_DO_ID, expectedStateName: "drafted",     targetModuleId: EM_FUND_FORMATION_MODULE_ID },
    { id: 483, expectedDataObjectId: FUND_FORMATIONS_DO_ID, expectedStateName: "filed",       targetModuleId: EM_FUND_FORMATION_MODULE_ID },
    { id: 484, expectedDataObjectId: FUND_FORMATIONS_DO_ID, expectedStateName: "operational", targetModuleId: EM_FUND_FORMATION_MODULE_ID },
    { id: 479, expectedDataObjectId: SPVS_DO_ID,            expectedStateName: "forming",     targetModuleId: EM_FUND_SPV_MODULE_ID },
    { id: 480, expectedDataObjectId: SPVS_DO_ID,            expectedStateName: "active",      targetModuleId: EM_FUND_SPV_MODULE_ID },
    { id: 481, expectedDataObjectId: SPVS_DO_ID,            expectedStateName: "wound_down",  targetModuleId: EM_FUND_SPV_MODULE_ID },
  ];

  const ids = plan.map(p => p.id);
  const live = await get(
    `/data_object_lifecycle_states?id=in.(${ids.join(",")})&select=id,data_object_id,state_name,requires_permission,domain_module_id`,
  );
  if (live.length !== plan.length) {
    throw new Error(`expected ${plan.length} lifecycle-state rows, got ${live.length}`);
  }

  const byId = new Map<number, any>();
  for (const r of live) byId.set(Number(r.id), r);

  for (const p of plan) {
    const r = byId.get(p.id);
    if (!r) throw new Error(`live row missing for id=${p.id}`);
    if (r.state_name !== p.expectedStateName) {
      throw new Error(
        `state_name mismatch on id=${p.id}: live='${r.state_name}', expected='${p.expectedStateName}'`,
      );
    }
    if (Number(r.data_object_id) !== p.expectedDataObjectId) {
      throw new Error(
        `data_object_id mismatch on id=${p.id}: live=${r.data_object_id}, expected=${p.expectedDataObjectId}`,
      );
    }
    if (r.domain_module_id === p.targetModuleId) {
      console.log(`  id=${p.id} (${r.state_name}) already on module ${p.targetModuleId}, skip`);
      continue;
    }
    await patch(`/data_object_lifecycle_states?id=eq.${p.id}`, {
      domain_module_id: p.targetModuleId,
    });
    console.log(
      `  id=${p.id} (${r.state_name}) domain_module_id ${JSON.stringify(r.domain_module_id)} -> ${p.targetModuleId}`,
    );
  }
}

// =====================================================================
// B1-M1 (partial): INSERT domain_regulations rows for BSA + FATCA.
// Audit names six candidate regulations; only BSA (49) and FATCA (50)
// already exist in /regulations. The other four require new
// `regulations` rows (deferred per "new entities" exclusion).
// Applicability = 'mandatory' (catalog norm for both: BSA is the AML
// backbone, FATCA the tax-status filing on every LP onboarding).
// =====================================================================
async function fixB1M1() {
  console.log("\n[B1-M1] domain_regulations INSERT (BSA + FATCA)");

  const plan = [
    { regulation_id: BSA_REGULATION_ID,   applicability: "mandatory", label: "Bank Secrecy Act" },
    { regulation_id: FATCA_REGULATION_ID, applicability: "mandatory", label: "Foreign Account Tax Compliance Act" },
  ];

  // Pre-flight: verify both regulations exist.
  const regIds = plan.map(p => p.regulation_id);
  const regCheck = await get(`/regulations?id=in.(${regIds.join(",")})&select=id,regulation_code,regulation_name`);
  if (regCheck.length !== plan.length) {
    throw new Error(`expected ${plan.length} regulation rows, got ${regCheck.length}`);
  }
  const regNameById = new Map<number, string>();
  for (const r of regCheck) regNameById.set(Number(r.id), String(r.regulation_name));

  // Idempotency: pull existing (domain_id, regulation_id) pairs.
  const existing = await get(
    `/domain_regulations?domain_id=eq.${EM_FUND_PLATFORM_DOMAIN_ID}&regulation_id=in.(${regIds.join(",")})&select=id,regulation_id,applicability`,
  );
  const existingByRegId = new Map<number, any>();
  for (const r of existing) existingByRegId.set(Number(r.regulation_id), r);

  const toInsert = plan
    .filter(p => !existingByRegId.has(p.regulation_id))
    .map(p => ({
      domain_id: EM_FUND_PLATFORM_DOMAIN_ID,
      regulation_id: p.regulation_id,
      applicability: p.applicability,
      // record_status omitted -> 'new' (Rule #1)
      // condition_notes omitted -> ''
      // notes omitted -> '' (Rule #15)
    }));

  for (const p of plan) {
    if (existingByRegId.has(p.regulation_id)) {
      console.log(`  ${p.label} (reg ${p.regulation_id}) already linked, skip`);
    }
  }
  if (toInsert.length === 0) {
    console.log(`  nothing to insert`);
    return;
  }
  for (const row of toInsert) {
    await post(`/domain_regulations`, [row]);
    const name = regNameById.get(Number(row.regulation_id)) ?? "?";
    console.log(`  + EM-FUND-PLATFORM <- ${name} (reg ${row.regulation_id}, applicability='${row.applicability}')`);
  }
}

// =====================================================================
// MAIN
// =====================================================================
async function main() {
  const who = await call("crud", "getCurrentUser", {});
  if (!who.ok) throw new Error(`getCurrentUser failed: ${who.stderr}`);
  const email = who.data?.email ?? "<unknown>";
  console.log(`Authenticated as ${email}`);
  const dm = (who.data?.modules ?? []).find((m: any) => Number(m.id) === 1001);
  if (!dm) throw new Error(`domain_map module (1001) not in tenant scope; aborting`);

  await fixB1S4();
  await fixB1M1();

  console.log("\nDone.");
  console.log("UI: https://tests.semantius.app/domain_map/data_object_lifecycle_states");
  console.log("UI: https://tests.semantius.app/domain_map/domain_regulations");
}

await main();
