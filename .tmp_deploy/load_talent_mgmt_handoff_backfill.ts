// Fix 5 (TALENT-MGMT audit, 2026-05-24): B10b handoff per-module attribution.
// Two steps:
//   1) Add 6 consumer rows on TALENT-MGMT modules so payloads inbound from other
//      domains resolve cleanly to a target_domain_module_id.
//   2) PATCH source_domain_module_id (outbound) and target_domain_module_id (inbound)
//      on every handoff touching TALENT-MGMT (id 58), per the B10b derivation rule.
// Leaves NULL in three cases (documented):
//   - handoffs 22 / 376 / 450 carrying employees as payload: 3-way tie across
//     PM / SC / CF (all embedded_master).
//   - handoff 441 source side: event 64 fires on workforce_segments which no
//     TALENT-MGMT module models — mis-pointed handoff, deeper data-quality issue.

type Json = unknown;

async function pg(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: Json): Promise<any> {
  const args: Record<string, unknown> = { method, path };
  if (body !== undefined) args.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(args)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`pg ${method} ${path} failed (${code}): ${err || out}`);
  const trimmed = out.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed);
}

const MODULES = { PM: 51, SC: 52, CF: 53 };

type Consumer = { module: number; data_object: number; notes: string };
const consumers: Consumer[] = [
  { module: MODULES.SC, data_object: 44,  notes: "Hi-potential workforce-segment membership drives succession-slate selection and accelerated development planning." },
  { module: MODULES.SC, data_object: 155, notes: "Merit-cycle close finalises pay-for-performance linkage; SC updates 9-box placements and development plans against the closed cycle." },
  { module: MODULES.SC, data_object: 169, notes: "Course completion reflects in development plans and informs successor readiness." },
  { module: MODULES.SC, data_object: 182, notes: "Negative-sentiment survey responses can trigger flight-risk review on the succession bench." },
  { module: MODULES.PM, data_object: 276, notes: "Portfolio-assessment outcomes drive OKR and goal cascading into delivery teams." },
  { module: MODULES.PM, data_object: 10,  notes: "Candidate-assessment scores seed the talent-management skill profile for hired candidates and a structured talent pool for non-hires." },
];

type Patch = { id: number; column: "source_domain_module_id" | "target_domain_module_id"; module_id: number };
const patches: Patch[] = [
  // Inbound (target_domain_module_id)
  { id: 26,   column: "target_domain_module_id", module_id: MODULES.SC }, // payload 44 -> SC consumer
  { id: 111,  column: "target_domain_module_id", module_id: MODULES.PM }, // payload 172 -> PM contributor
  { id: 421,  column: "target_domain_module_id", module_id: MODULES.SC }, // payload 155 -> SC consumer
  { id: 430,  column: "target_domain_module_id", module_id: MODULES.SC }, // payload 169 -> SC consumer
  { id: 432,  column: "target_domain_module_id", module_id: MODULES.PM }, // payload 172 -> PM contributor
  { id: 443,  column: "target_domain_module_id", module_id: MODULES.SC }, // payload 182 -> SC consumer
  { id: 793,  column: "target_domain_module_id", module_id: MODULES.PM }, // payload 276 -> PM consumer
  { id: 1034, column: "target_domain_module_id", module_id: MODULES.PM }, // payload 10  -> PM consumer
  // Outbound (source_domain_module_id) — derived from trigger_events.data_object_id
  { id: 113,  column: "source_domain_module_id", module_id: MODULES.PM }, // event 14 fires on 174 (perf_reviews) -> PM master
  { id: 114,  column: "source_domain_module_id", module_id: MODULES.SC }, // event 130 on 179 (career_aspirations) -> SC master
  { id: 437,  column: "source_domain_module_id", module_id: MODULES.SC }, // event 445 on 176 (succession_plans) -> SC master
  { id: 438,  column: "source_domain_module_id", module_id: MODULES.PM }, // event 444 on 175 (performance_goals) -> PM master
  { id: 439,  column: "source_domain_module_id", module_id: MODULES.SC }, // event 447 on 178 (nine_box_placements) -> SC master
  { id: 440,  column: "source_domain_module_id", module_id: MODULES.PM }, // event 443 on 175 (performance_goals) -> PM master
];

async function ensureConsumer(c: Consumer) {
  const existing = await pg(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${c.module}&data_object_id=eq.${c.data_object}&select=id`,
  );
  if (existing && existing.length) return false;
  await pg("POST", "/domain_module_data_objects", [
    {
      domain_module_id: c.module,
      data_object_id: c.data_object,
      role: "consumer",
      necessity: "optional",
      notes: c.notes,
    },
  ]);
  return true;
}

async function main() {
  let consumerInserted = 0, consumerSkipped = 0;
  for (const c of consumers) {
    if (await ensureConsumer(c)) consumerInserted++;
    else consumerSkipped++;
  }
  console.log(`consumers: ${consumerInserted} inserted, ${consumerSkipped} already present`);

  let patched = 0, alreadyOk = 0;
  for (const p of patches) {
    const row = await pg("GET", `/cross_domain_handoffs?id=eq.${p.id}&select=${p.column}`);
    if (row && row.length && row[0][p.column] === p.module_id) {
      alreadyOk++;
      continue;
    }
    await pg("PATCH", `/cross_domain_handoffs?id=eq.${p.id}`, { [p.column]: p.module_id });
    patched++;
  }
  console.log(`handoff patches: ${patched} updated, ${alreadyOk} already correct`);
}

await main();
