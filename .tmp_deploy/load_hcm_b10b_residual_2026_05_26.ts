/**
 * HCM B10b residual fixes (2026-05-26).
 *
 * After load_hcm_fixes_2026_05_26.ts patched 1 of 24 outbound handoffs, 23 sat
 * NULL on target_domain_module_id. Two distinct shapes:
 *
 *   (a) TIES — target domain has several modules at the same strongest role on
 *       the payload data_object; editorial pick wins (loader records the
 *       decision rationale in handoffs.notes).
 *
 *   (b) NO CANDIDATE — target domain has no module that holds the payload at all.
 *       Two sub-shapes:
 *         (i)  target domain has zero domain_modules (Phase-M gap on target).
 *              Per the SKILL.md authoring rule, the legitimate NULL gets an
 *              explicit notes annotation: "target NULL until <CODE> is
 *              modularized".
 *         (ii) target domain has modules but none hold the payload (Phase-B gap
 *              on target). Add a `consumer + required` DMDO row on the most
 *              appropriate module, then resolve the handoff.
 *
 * All catalog rationale lives in handoffs.notes so a future reviewer can
 * audit the editorial calls.
 *
 * Idempotent: every step reads first.
 * Run from project root:
 *   bun run "c:/dev/domain-map/.tmp_deploy/load_hcm_b10b_residual_2026_05_26.ts"
 */

interface CmdResult { ok: boolean; data: any; status: number; raw: string }

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
    return { ok: false, data: null, status: code, raw: stderr.trim() || stdout.trim() };
  }
  const text = stdout.trim();
  return { ok: true, data: text ? JSON.parse(text) : null, status: 0, raw: text };
}

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.raw}`);
  return r.data;
}
async function post(path: string, body: any): Promise<any> {
  const r = await postgrest("POST", path, body);
  if (!r.ok) throw new Error(`POST ${path} failed: ${r.raw}`);
  return r.data;
}
async function patch(path: string, body: any): Promise<any> {
  const r = await postgrest("PATCH", path, body);
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.raw}`);
  return r.data;
}

// ---------------------------------------------------------------------------
// Editorial decisions (rationale captured in handoffs.notes)
// ---------------------------------------------------------------------------

// Tie-breaks: target modularized, multiple modules at same role. Pick is editorial.
const TIE_BREAKS: { handoffId: number; moduleId: number; rationale: string }[] = [
  { handoffId: 21, moduleId: 81, rationale: "Tie-break: PA-WORKFORCE-METRICS is the primary raw-event sink. PA-PREDICTIVE-MODELS consumes downstream derived features rather than ingesting `employment_event.recorded` directly." },
  { handoffId: 22, moduleId: 51, rationale: "Tie-break: TALENT-PERFORMANCE-MGMT is the entry point on hire: a new perf record is created at onboarding. SUCCESSION-CAREER and CONTINUOUS-FEEDBACK consume the worker reference but are not the receiving end of `employee.created`." },
  { handoffId: 376, moduleId: 51, rationale: "Tie-break: TALENT-PERFORMANCE-MGMT receives `employee.promoted` to update the worker's role/level/goals on the perf record. Career-path and feedback modules consume the post-promotion worker but are not the receiving end of the event." },
  { handoffId: 18, moduleId: 90, rationale: "Tie-break: PAYROLL-RUN is the primary entry point: a new worker enters the next pay cycle. Tax-compliance, earnings-deductions, and pay-statements consume the worker downstream of RUN, not directly off `employee.created`." },
  { handoffId: 374, moduleId: 90, rationale: "Tie-break: PAYROLL-RUN receives `employee.promoted` because the comp/role change drives the next pay cycle. Downstream modules pick up the new comp via RUN." },
  { handoffId: 366, moduleId: 90, rationale: "Tie-break: PAYROLL-RUN processes the final pay on `employee.terminated`. Tax-compliance and pay-statements are downstream of RUN's final-pay run." },
];

// Missing-DMDO fixes: target modularized, but no module holds the payload yet.
// Add the missing DMDO row, then resolve the handoff to that module.
const DMDO_ADDS: { module: number; dataObject: number; role: string; necessity: string; rationale: string }[] = [
  { module: 90, dataObject: 36, role: "consumer", necessity: "required", rationale: "PAYROLL-RUN consumes employment_events to react to hire/promote/terminate transitions for next-cycle pay." },
  { module: 92, dataObject: 35, role: "consumer", necessity: "required", rationale: "PAYROLL-EARNINGS-DEDUCTIONS consumes employment_contracts: contract terms drive earnings rates, deductions, and garnishment setup." },
  { module: 78, dataObject: 35, role: "consumer", necessity: "required", rationale: "COMP-PLANNING consumes employment_contracts: contract is the foundation for comp planning (base, bonus eligibility, equity grants)." },
  { module: 72, dataObject: 36, role: "consumer", necessity: "required", rationale: "BEN-ENROLLMENT consumes employment_events: life-events (hire/marriage/birth/termination signaled via employment_event.recorded) trigger enrollment windows." },
];

// Handoff → (target_module, rationale) for the missing-DMDO cases.
const MISSING_DMDO_RESOLUTIONS: { handoffId: number; moduleId: number; rationale: string }[] = [
  { handoffId: 377, moduleId: 90, rationale: "Routed to PAYROLL-RUN (DMDO consumer+required added on employment_events 2026-05-26 audit)." },
  { handoffId: 380, moduleId: 92, rationale: "Routed to PAYROLL-EARNINGS-DEDUCTIONS (DMDO consumer+required added on employment_contracts 2026-05-26 audit)." },
  { handoffId: 383, moduleId: 92, rationale: "Routed to PAYROLL-EARNINGS-DEDUCTIONS (DMDO consumer+required added on employment_contracts 2026-05-26 audit)." },
  { handoffId: 381, moduleId: 78, rationale: "Routed to COMP-PLANNING (DMDO consumer+required added on employment_contracts 2026-05-26 audit)." },
  { handoffId: 379, moduleId: 72, rationale: "Routed to BEN-ENROLLMENT (DMDO consumer+required added on employment_events 2026-05-26 audit)." },
];

// Not-modularized: target domain has zero domain_modules. Legitimate NULL per SKILL.md.
const NOT_MODULARIZED: { handoffId: number; targetCode: string }[] = [
  { handoffId: 19, targetCode: "IGA" },
  { handoffId: 185, targetCode: "IGA" },
  { handoffId: 375, targetCode: "IGA" },
  { handoffId: 378, targetCode: "IGA" },
  { handoffId: 382, targetCode: "IGA" },
  { handoffId: 389, targetCode: "IGA" },
  { handoffId: 391, targetCode: "IGA" },
  { handoffId: 392, targetCode: "IGA" },
  { handoffId: 134, targetCode: "WFM" },
  { handoffId: 348, targetCode: "AGENCY-MGMT" },
  { handoffId: 390, targetCode: "ERP-FIN" },
  { handoffId: 468, targetCode: "EXPENSE" },
];

async function main() {
  console.log("HCM B10b residual fixes (2026-05-26)");
  console.log("=====================================");

  // -------------------------------------------------------------------------
  // Step 1: pre-flight — confirm not-modularized targets really are
  // -------------------------------------------------------------------------
  console.log("\nStep 1: pre-flight check on not-modularized targets");
  const notModCodes = [...new Set(NOT_MODULARIZED.map((n) => n.targetCode))];
  const targetDomains: { id: number; domain_code: string }[] = await get(
    `/domains?domain_code=in.(${notModCodes.join(",")})&select=id,domain_code`
  );
  const targetIds = targetDomains.map((d) => d.id);
  const targetMods: { domain_id: number }[] = await get(
    `/domain_modules?domain_id=in.(${targetIds.join(",")})&select=domain_id`
  );
  const moduleCountByDomain = new Map<number, number>();
  for (const m of targetMods) moduleCountByDomain.set(m.domain_id, (moduleCountByDomain.get(m.domain_id) ?? 0) + 1);
  for (const d of targetDomains) {
    const n = moduleCountByDomain.get(d.id) ?? 0;
    if (n > 0) {
      throw new Error(`Pre-flight fail: ${d.domain_code} (id ${d.id}) now has ${n} modules. Re-run load_hcm_fixes (B10b derivation will pick the module).`);
    }
  }
  console.log(`  confirmed zero modules on ${notModCodes.join(", ")}`);

  // -------------------------------------------------------------------------
  // Step 2: insert missing DMDO rows on modularized targets
  // -------------------------------------------------------------------------
  console.log("\nStep 2: insert missing DMDO rows (3 modularized target domains)");
  const dmdoModuleIds = [...new Set(DMDO_ADDS.map((d) => d.module))];
  const dmdoDataObjectIds = [...new Set(DMDO_ADDS.map((d) => d.dataObject))];
  const existing: { domain_module_id: number; data_object_id: number; role: string }[] = await get(
    `/domain_module_data_objects?domain_module_id=in.(${dmdoModuleIds.join(",")})&data_object_id=in.(${dmdoDataObjectIds.join(",")})&select=domain_module_id,data_object_id,role`
  );
  const existingKey = new Set<string>(existing.map((e) => `${e.domain_module_id}:${e.data_object_id}`));

  const toInsert = DMDO_ADDS.filter((d) => !existingKey.has(`${d.module}:${d.dataObject}`));
  console.log(`  ${DMDO_ADDS.length} declared, ${DMDO_ADDS.length - toInsert.length} already present, ${toInsert.length} new`);

  for (const d of toInsert) {
    const body = {
      domain_module_id: d.module,
      data_object_id: d.dataObject,
      role: d.role,
      necessity: d.necessity,
      notes: d.rationale,
    };
    await post("/domain_module_data_objects", body);
  }
  console.log(`  inserted ${toInsert.length} DMDO rows`);

  // -------------------------------------------------------------------------
  // Step 3: apply tie-break PATCHes
  // -------------------------------------------------------------------------
  console.log("\nStep 3: apply tie-break PATCHes (6 handoffs)");
  for (const t of TIE_BREAKS) {
    const cur: { target_domain_module_id: number | null; notes: string | null }[] = await get(
      `/handoffs?id=eq.${t.handoffId}&select=target_domain_module_id,notes`
    );
    if (cur[0]?.target_domain_module_id === t.moduleId) {
      console.log(`  handoff ${t.handoffId}: already set to module ${t.moduleId}, skip`);
      continue;
    }
    const existingNotes = cur[0]?.notes ?? "";
    const newNotes = existingNotes ? `${existingNotes}\n\n${t.rationale}` : t.rationale;
    await patch(`/handoffs?id=eq.${t.handoffId}`, {
      target_domain_module_id: t.moduleId,
      notes: newNotes,
    });
    console.log(`  handoff ${t.handoffId} -> module ${t.moduleId}`);
  }

  // -------------------------------------------------------------------------
  // Step 4: resolve missing-DMDO handoffs to their new target modules
  // -------------------------------------------------------------------------
  console.log("\nStep 4: route missing-DMDO handoffs (5 handoffs)");
  for (const r of MISSING_DMDO_RESOLUTIONS) {
    const cur: { target_domain_module_id: number | null; notes: string | null }[] = await get(
      `/handoffs?id=eq.${r.handoffId}&select=target_domain_module_id,notes`
    );
    if (cur[0]?.target_domain_module_id === r.moduleId) {
      console.log(`  handoff ${r.handoffId}: already set to module ${r.moduleId}, skip`);
      continue;
    }
    const existingNotes = cur[0]?.notes ?? "";
    const newNotes = existingNotes ? `${existingNotes}\n\n${r.rationale}` : r.rationale;
    await patch(`/handoffs?id=eq.${r.handoffId}`, {
      target_domain_module_id: r.moduleId,
      notes: newNotes,
    });
    console.log(`  handoff ${r.handoffId} -> module ${r.moduleId}`);
  }

  // -------------------------------------------------------------------------
  // Step 5: annotate not-modularized handoffs (legitimate NULL)
  // -------------------------------------------------------------------------
  console.log("\nStep 5: annotate not-modularized handoffs (12 handoffs, legitimate NULL)");
  const annotation = (code: string) => `target_domain_module_id NULL until ${code} is modularized (Phase-M gap on target domain; SKILL.md authoring rule).`;
  for (const n of NOT_MODULARIZED) {
    const cur: { notes: string | null }[] = await get(`/handoffs?id=eq.${n.handoffId}&select=notes`);
    const existing = cur[0]?.notes ?? "";
    const expected = annotation(n.targetCode);
    if (existing.includes(expected)) {
      console.log(`  handoff ${n.handoffId}: already annotated, skip`);
      continue;
    }
    const newNotes = existing ? `${existing}\n\n${expected}` : expected;
    await patch(`/handoffs?id=eq.${n.handoffId}`, { notes: newNotes });
    console.log(`  handoff ${n.handoffId} (${n.targetCode}): annotated`);
  }

  // -------------------------------------------------------------------------
  // Step 6: report
  // -------------------------------------------------------------------------
  console.log("\nStep 6: post-fix audit");
  const remainingNull: any = await get(
    `/handoffs?source_domain_id=eq.54&target_domain_module_id=is.null&select=id,target_domain_id,trigger_events(event_name)`
  );
  const expectedNull = NOT_MODULARIZED.length; // 12
  console.log(`  outbound HCM handoffs with NULL target_domain_module_id: ${remainingNull.length} (expected: ${expectedNull} = legitimate Phase-M-target-gap)`);
  if (remainingNull.length !== expectedNull) {
    console.log("  unexpected residual:");
    for (const r of remainingNull) {
      console.log(`    handoff ${r.id} (${r.trigger_events?.event_name}) -> domain ${r.target_domain_id}`);
    }
  }

  const totalOutbound: any = await get(`/handoffs?source_domain_id=eq.54&select=id`);
  const resolved: any = await get(`/handoffs?source_domain_id=eq.54&target_domain_module_id=not.is.null&select=id`);
  console.log(`  resolved / total: ${resolved.length}/${totalOutbound.length}`);

  console.log("\nUI links:");
  console.log("  handoffs:     https://tests.semantius.app/domain_map/handoffs");
  console.log("  DMDO (PAYROLL): https://tests.semantius.app/domain_map/domain_module_data_objects");
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("\nFATAL:", e?.message || e);
  process.exit(1);
});
