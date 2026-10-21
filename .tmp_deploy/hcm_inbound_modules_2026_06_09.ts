#!/usr/bin/env bun
// B1A-INBOUND-MODULES (HCM audit 2026-06-09):
// Resolve target_domain_module_id on the 27 NULL-target inbound cross-domain handoffs into HCM.
// Per-handoff consume-vs-signal classification (state.yaml B1A buckets):
//   (a) people-lifecycle/events HCM genuinely reacts to -> consumer+optional DMDO on module 56 + target=56
//   (b) core-worker-identity payloads (pay_slips, source_records) -> consumer+optional DMDO on module 54 + target=54
//   (c) org/headcount (financial_plans) -> consumer+optional DMDO on module 55 + target=55
//   (d) pure notifications HCM does not model -> leave target NULL (domain-level signal)
//
// Additive (consumer DMDOs land record_status='new' by default; Rule #1) + corrective (FK backfill).
// No destructive step. No notes written (Rule #15). Idempotent.

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });

// data_object_id -> target HCM module id (consume buckets a/b/c)
const CONSUME: Array<{ data_object_id: number; module: number; name: string; bucket: string }> = [
  // (a) module 56 — HCM-LIFECYCLE-WORKFLOWS
  { data_object_id: 149, module: 56, name: "life_events", bucket: "a" },
  { data_object_id: 156, module: 56, name: "merit_recommendations", bucket: "a" },
  { data_object_id: 164, module: 56, name: "absence_balances", bucket: "a" },
  { data_object_id: 170, module: 56, name: "learning_records", bucket: "a" },
  { data_object_id: 176, module: 56, name: "succession_plans", bucket: "a" },
  { data_object_id: 175, module: 56, name: "performance_goals", bucket: "a" },
  { data_object_id: 44, module: 56, name: "workforce_segments", bucket: "a" },
  { data_object_id: 192, module: 56, name: "hr_cases", bucket: "a" },
  { data_object_id: 173, module: 56, name: "compliance_assignments", bucket: "a" },
  { data_object_id: 153, module: 56, name: "compensation_plans", bucket: "a" },
  { data_object_id: 912, module: 56, name: "course_completions", bucket: "a" },
  { data_object_id: 635, module: 56, name: "legal_holds", bucket: "a" },
  // (b) module 54 — HCM-CORE-WORKER
  { data_object_id: 139, module: 54, name: "pay_slips", bucket: "b" },
  { data_object_id: 320, module: 54, name: "source_records", bucket: "b" },
  // (c) module 55 — HCM-ORG-POSITIONS
  { data_object_id: 37, module: 55, name: "financial_plans", bucket: "c" },
];

// handoff id -> target module id (FK backfill). Pay_slips (139) appears in two handoffs.
const FK_BACKFILL: Array<{ handoff: number; module: number }> = [
  // -> 56
  { handoff: 418, module: 56 }, { handoff: 422, module: 56 }, { handoff: 427, module: 56 },
  { handoff: 431, module: 56 }, { handoff: 437, module: 56 }, { handoff: 438, module: 56 },
  { handoff: 441, module: 56 }, { handoff: 446, module: 56 }, { handoff: 1047, module: 56 },
  { handoff: 1125, module: 56 }, { handoff: 1311, module: 56 }, { handoff: 913, module: 56 },
  // -> 54
  { handoff: 412, module: 54 }, { handoff: 1154, module: 54 }, { handoff: 718, module: 54 },
  // -> 55
  { handoff: 601, module: 55 },
];

// (d) intentionally left NULL — domain-level signals (for the log only)
const SIGNAL_HANDOFFS = [295, 448, 451, 842, 869, 873, 935, 1032, 1111, 1313, 1314];

async function main() {
  // --- Step 1: insert consumer DMDOs idempotently ---
  const existing = await get(
    `/domain_module_data_objects?domain_module_id=in.(54,55,56)&data_object_id=in.(${CONSUME.map(c => c.data_object_id).join(",")})&select=domain_module_id,data_object_id`,
  );
  const existingPairs = new Set(existing.map(r => `${r.domain_module_id}:${r.data_object_id}`));
  const toInsert = CONSUME.filter(c => !existingPairs.has(`${c.module}:${c.data_object_id}`)).map(c => ({
    domain_module_id: c.module,
    data_object_id: c.data_object_id,
    role: "consumer",
    necessity: "optional",
  }));
  if (toInsert.length > 0) {
    await call({
      method: "POST",
      path: "/domain_module_data_objects",
      body: toInsert,
      headers: { Prefer: "return=representation" },
    });
  }
  console.log(`DMDO consumer rows: ${toInsert.length} inserted, ${CONSUME.length - toInsert.length} already present`);

  // --- Step 2: backfill handoff target_domain_module_id ---
  let patched = 0;
  for (const f of FK_BACKFILL) {
    await call({
      method: "PATCH",
      path: `/handoffs?id=eq.${f.handoff}&target_domain_module_id=is.null`,
      body: { target_domain_module_id: f.module },
    });
    patched++;
  }
  console.log(`handoff FK backfill: ${patched} PATCH calls (-> module set on NULL-target rows)`);

  // --- Step 3: verify ---
  const stillNull = await get(
    `/handoffs?target_domain_id=eq.54&source_domain_id=neq.54&target_domain_module_id=is.null&select=id&order=id.asc`,
  );
  const nullIds = stillNull.map(r => r.id as number).sort((a, b) => a - b);
  console.log(`\nStill NULL-target inbound handoffs (expected 11 signals): ${nullIds.length}`);
  console.log(`  ids: ${JSON.stringify(nullIds)}`);
  console.log(`  expected signal ids: ${JSON.stringify([...SIGNAL_HANDOFFS].sort((a, b) => a - b))}`);
  const match = JSON.stringify(nullIds) === JSON.stringify([...SIGNAL_HANDOFFS].sort((a, b) => a - b));
  console.log(`  match: ${match ? "OK" : "MISMATCH — investigate"}`);

  const dmdoNow = await get(
    `/domain_module_data_objects?domain_module_id=in.(54,55,56)&data_object_id=in.(${CONSUME.map(c => c.data_object_id).join(",")})&role=eq.consumer&select=domain_module_id,data_object_id,role,necessity,record_status&order=domain_module_id.asc`,
  );
  console.log(`\nConsumer DMDOs now present on HCM modules: ${dmdoNow.length} (expected ${CONSUME.length})`);
  console.log(JSON.stringify(dmdoNow, null, 2));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
