// EMP-EXP B10b backfill: per-module attribution on existing handoffs.
// Run AFTER load_emp_exp_fixes.ts. Sets source_domain_module_id / target_domain_module_id
// on the 6 outbound + 2 inbound handoff rows that pre-dated EMP-EXP modularization.

type Row = Record<string, unknown>;

async function call(args: { method: string; path: string; body?: unknown }): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(args));
  proc.stdin.end();
  await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  if (proc.exitCode !== 0) {
    throw new Error(`semantius ${args.method} ${args.path} failed: ${stderr || stdout}`);
  }
  const trimmed = stdout.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

async function get(path: string) { return call({ method: "GET", path }); }
async function patchById(table: string, id: number, body: Row) {
  return call({ method: "PATCH", path: `/${table}?id=eq.${id}`, body });
}
async function insert(path: string, rows: Row[]) {
  if (rows.length === 0) return [];
  return call({ method: "POST", path, body: rows });
}

async function main() {
  console.log("=== EMP-EXP B10b backfill ===\n");

  // Resolve the freshly-loaded module ids.
  const modules = await get(
    "/domain_modules?domain_id=eq.62&select=id,domain_module_code",
  );
  const byCode = new Map<string, number>();
  for (const m of modules) byCode.set(String(m.domain_module_code), Number(m.id));
  const CONTINUOUS = byCode.get("EMP-EXP-CONTINUOUS-LISTEN")!;
  const ACTION = byCode.get("EMP-EXP-ACTION-PLANNING")!;
  if (!CONTINUOUS || !ACTION) throw new Error("module resolution failed");
  console.log(`CONTINUOUS-LISTEN id : ${CONTINUOUS}`);
  console.log(`ACTION-PLANNING id   : ${ACTION}\n`);

  // ---- Outbound source_domain_module_id ----
  // Derivation: module that masters the trigger_event's data_object (strongest role wins).
  const outboundPatches: Array<{ id: number; source_module: number; notes?: string }> = [
    // engagement_drivers (CONTINUOUS-LISTEN master)
    { id: 115, source_module: CONTINUOUS }, // survey.cycle_closed -> PA
    { id: 442, source_module: CONTINUOUS }, // survey.cycle_closed -> HCM
    // employees (tie: both modules embedded_master); signal provenance is listening data.
    {
      id: 116,
      source_module: CONTINUOUS,
      notes:
        "B10b tie resolution: trigger_events.data_object_id=employees is embedded_master on both EMP-EXP modules. attrition_risk.high is derived from survey_responses + engagement_drivers analysis, so CONTINUOUS-LISTEN is the signal publisher.",
    },
    // survey_responses (CONTINUOUS-LISTEN master)
    { id: 443, source_module: CONTINUOUS }, // survey_response.received -> TALENT-MGMT
    { id: 444, source_module: CONTINUOUS }, // survey_response.received -> PA
    // action_plans (ACTION-PLANNING master)
    { id: 445, source_module: ACTION }, // action_plan.created -> WORK-MGMT
  ];
  console.log("Phase A: outbound source_domain_module_id");
  for (const p of outboundPatches) {
    const body: Row = { source_domain_module_id: p.source_module };
    if (p.notes) body.notes = p.notes;
    await patchById("handoffs", p.id, body);
    console.log(`  patched handoffs.id=${p.id}: source_domain_module_id=${p.source_module}`);
  }

  // ---- Inbound target_domain_module_id ----
  console.log("\nPhase B: inbound target_domain_module_id");

  // Inbound 409: journey.day_one_reached from ONBOARDING. Payload = onboarding_journeys (16),
  // which EMP-EXP does not currently model. Add a consumer row on CONTINUOUS-LISTEN
  // (the listening surface that consumes the day-1 signal to trigger lifecycle surveys),
  // then set target_domain_module_id.
  const onboardingJourneysDoid = 16;
  const existingDmdo = await get(
    `/domain_module_data_objects?domain_module_id=eq.${CONTINUOUS}&data_object_id=eq.${onboardingJourneysDoid}&select=id`,
  );
  if (existingDmdo.length === 0) {
    await insert("/domain_module_data_objects", [
      {
        domain_module_id: CONTINUOUS,
        data_object_id: onboardingJourneysDoid,
        role: "consumer",
        necessity: "required",
        notes:
          "CONTINUOUS-LISTEN consumes onboarding_journeys as the signal source for lifecycle-listening surveys (day-1, 30-day, 90-day). ONBOARDING canonical.",
      },
    ]);
    console.log("  inserted domain_module_data_objects: CONTINUOUS-LISTEN consumer onboarding_journeys");
  } else {
    console.log("  domain_module_data_objects: consumer row already present");
  }
  await patchById("handoffs", 409, { target_domain_module_id: CONTINUOUS });
  console.log(`  patched handoffs.id=409: target_domain_module_id=${CONTINUOUS}`);

  // Inbound 405: candidate_referral.submitted from ATS. Payload = candidate_referrals (6),
  // which EMP-EXP does not model. Flagged in the audit as semantically odd.
  // Leave target_domain_module_id NULL with explicit notes pointing at ATS's B9 audit.
  await patchById("handoffs", 405, {
    notes:
      "target_domain_module_id NULL: payload candidate_referrals not modeled in EMP-EXP. This inbound is semantically unclear (ATS -> EMP-EXP on referral submission is not a standard engagement-platform workflow). Flagged for ATS B9 audit verification.",
  });
  console.log("  patched handoffs.id=405: notes annotation (ATS B9 verify)");

  // ---- Verification ----
  console.log("\n=== Verification ===");
  const remainingOut = await get(
    `/handoffs?source_domain_id=eq.62&source_domain_module_id=is.null&select=id`,
  );
  const remainingIn = await get(
    `/handoffs?target_domain_id=eq.62&target_domain_module_id=is.null&select=id,source_domain_id`,
  );
  console.log(`Outbound rows still NULL : ${remainingOut.length} (expect 0)`);
  console.log(`Inbound rows still NULL  : ${remainingIn.length} (expect 1 = handoff 405 ATS verify)`);
  for (const r of remainingIn) {
    console.log(`  inbound NULL: handoff id=${r.id}, source_domain_id=${r.source_domain_id}`);
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
