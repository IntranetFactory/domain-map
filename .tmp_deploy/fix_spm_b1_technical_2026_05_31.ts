/**
 * SPM audit B1 technical fixes, 2026-05-31.
 *
 * Scope: only the truly-technical B1 items from audits/SPM.md whose resolution
 * is fully derivable from the audit and not gated on a Bucket-2 judgment call.
 *
 * Applied:
 *   - B1-S2: PATCH event_category enum backfill on 4 SPM-owned trigger_events:
 *       872 business_value_assessment.completed -> lifecycle
 *       873 dependency_chain.identified         -> signal
 *       874 benefits_tracking_record.realized   -> lifecycle
 *       875 benefits_tracking_record.at_risk    -> threshold
 *
 * Deferred (gated on B2-S1 duplication decision or pre-Phase-0 vendor research):
 *   B1-S1 (M1 modules), B1-S3 (users edges), B1-S4 (aliases), B1-S5 (legacy skill),
 *   B1-S6 (lifecycle states), B1-S7 (pattern flags), B1-S8 (B10b FK derivation),
 *   B1-S9 (B9b intra-domain handoffs), APQC handoff_processes (per audit, ships with B1-S1).
 */

type PatchSpec = { id: number; event_name: string; event_category: string };

const patches: PatchSpec[] = [
  { id: 872, event_name: "business_value_assessment.completed", event_category: "lifecycle" },
  { id: 873, event_name: "dependency_chain.identified", event_category: "signal" },
  { id: 874, event_name: "benefits_tracking_record.realized", event_category: "lifecycle" },
  { id: 875, event_name: "benefits_tracking_record.at_risk", event_category: "threshold" },
];

async function callSemantius(args: string[], stdin?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["semantius", ...args], {
    stdin: stdin ? "pipe" : "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  if (stdin) {
    proc.stdin.write(stdin);
    proc.stdin.end();
  }
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { stdout, stderr, exitCode };
}

async function preflightCheck(): Promise<void> {
  const ids = patches.map((p) => p.id).join(",");
  const path = `/trigger_events?id=in.(${ids})&select=id,event_name,event_category`;
  const body = JSON.stringify({ method: "GET", path });
  const res = await callSemantius(["call", "crud", "postgrestRequest"], body);
  if (res.exitCode !== 0) {
    if (res.stderr.includes("JWT does not have authorization")) {
      console.error("JWT-AUDIENCE ERROR:");
      console.error(res.stderr);
      process.exit(2);
    }
    console.error("Preflight failed:", res.stderr);
    process.exit(1);
  }
  const rows = JSON.parse(res.stdout) as Array<{ id: number; event_name: string; event_category: string }>;
  const byId = new Map(rows.map((r) => [r.id, r] as const));
  for (const spec of patches) {
    const live = byId.get(spec.id);
    if (!live) {
      console.error(`Preflight: event ${spec.id} not found live, aborting.`);
      process.exit(1);
    }
    if (live.event_name !== spec.event_name) {
      console.error(`Preflight: event ${spec.id} event_name mismatch, audit=${spec.event_name} live=${live.event_name}, aborting.`);
      process.exit(1);
    }
    if (live.event_category !== "") {
      console.warn(`Preflight: event ${spec.id} already has event_category='${live.event_category}', skipping.`);
    }
  }
  console.log(`Preflight OK: ${rows.length}/${patches.length} events resolved.`);
}

async function applyPatches(): Promise<void> {
  for (const spec of patches) {
    const path = `/trigger_events?id=eq.${spec.id}`;
    const body = JSON.stringify({
      method: "PATCH",
      path,
      body: { event_category: spec.event_category },
      preferReturn: "representation",
    });
    const res = await callSemantius(["call", "crud", "postgrestRequest"], body);
    if (res.exitCode !== 0) {
      if (res.stderr.includes("JWT does not have authorization")) {
        console.error("JWT-AUDIENCE ERROR during PATCH:");
        console.error(res.stderr);
        process.exit(2);
      }
      console.error(`PATCH failed for event ${spec.id}:`, res.stderr);
      process.exit(1);
    }
    console.log(`PATCHed event ${spec.id} (${spec.event_name}) -> event_category='${spec.event_category}'`);
  }
}

async function postflightVerify(): Promise<void> {
  const ids = patches.map((p) => p.id).join(",");
  const path = `/trigger_events?id=in.(${ids})&select=id,event_name,event_category`;
  const body = JSON.stringify({ method: "GET", path });
  const res = await callSemantius(["call", "crud", "postgrestRequest"], body);
  if (res.exitCode !== 0) {
    console.error("Postflight read failed:", res.stderr);
    process.exit(1);
  }
  const rows = JSON.parse(res.stdout) as Array<{ id: number; event_name: string; event_category: string }>;
  const want = new Map(patches.map((p) => [p.id, p.event_category] as const));
  let allMatch = true;
  for (const row of rows) {
    const expected = want.get(row.id);
    const ok = row.event_category === expected;
    if (!ok) allMatch = false;
    console.log(`  ${row.id} ${row.event_name}: event_category='${row.event_category}' ${ok ? "OK" : `WANT='${expected}'`}`);
  }
  if (!allMatch) {
    console.error("Postflight: at least one event did not match the intended value.");
    process.exit(1);
  }
  console.log("Postflight OK.");
}

await preflightCheck();
await applyPatches();
await postflightVerify();
