// SEM b1 residual technical fixes, 2026-05-31.
//
// Scope: ONLY items the orchestrator authorized as "truly-technical":
//   - INSERT `handoff_processes` for cross-domain SEM handoffs where the
//     audit pre-specifies handoff_id + resolvable PCF row (B1-H1).
//
// Deferred (per orchestrator spec):
//   - B1-S1, S2 (new handoffs): gated on B2-S2 / B2-S4 user judgment.
//   - B1-S3 (new trigger_events): gated on B2-S4.
//   - B1-S4, S5, S6: report-only, target domains have no modules.
//   - B1-S7 (notes='' reverts): gated on B2-S1 user confirm.
//   - B1-S8 (event_category PATCH): gated on user confirm.
//
// CLI cwd note (CLAUDE.md / SKILL.md rule #6): run from project root.
//   bun run "c:/dev/domain-map/.tmp_deploy/fix_sem_b1_technical_2026_05_31.ts"
// Do NOT `cd` into .tmp_deploy first; the CLI reads .env from cwd.

type HandoffProcessRow = {
  handoff_id: number;
  process_id: number;
  proposal_source: "agent_curated";
  role: "implements";
  // record_status omitted: DB default 'new' applies (SKILL.md rule #1).
};

const rows: HandoffProcessRow[] = [
  // SEM-EXECUTION-TRACKING (106) -> SPM, strategic_initiative.approved.
  // PCF 104 (external_id 10059) "Select strategic initiatives".
  { handoff_id: 1205, process_id: 104, proposal_source: "agent_curated", role: "implements" },
  // SEM-EXECUTION-TRACKING (106) -> SPM, strategic_initiative.cancelled.
  // PCF 108 (external_id 21423) "Refine strategic initiatives and project plans as needed".
  { handoff_id: 1206, process_id: 108, proposal_source: "agent_curated", role: "implements" },
  // SEM-EXECUTION-TRACKING (106) -> EPM, strategic_initiative.approved.
  // PCF 1652 (external_id 16402) "Establish portfolio strategy".
  { handoff_id: 1207, process_id: 1652, proposal_source: "agent_curated", role: "implements" },
  // SEM-STRATEGY-DEFINITION (105) -> EPM, strategic_objective.cascaded.
  // PCF 98 (external_id 10042) "Develop and set organizational objectives".
  { handoff_id: 1208, process_id: 98, proposal_source: "agent_curated", role: "implements" },
];

async function callSemantius(method: string, path: string, body?: unknown): Promise<string> {
  const args: Record<string, unknown> = { method, path };
  if (body !== undefined) args.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(args)],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) {
    if (err.includes("JWT") && err.includes("required audience not found")) {
      console.error("JWT-AUDIENCE ERROR, STOPPING per SKILL.md rule #6:");
      console.error(err);
      process.exit(1);
    }
    throw new Error(`semantius failed (exit ${code}): ${err || out}`);
  }
  return out;
}

// Pre-flight: verify handoffs and PCF rows exist; verify no existing tags collide.
const handoffIds = rows.map((r) => r.handoff_id).join(",");
const processIds = rows.map((r) => r.process_id).join(",");

const handoffsRaw = await callSemantius(
  "GET",
  `/handoffs?id=in.(${handoffIds})&select=id`,
);
const handoffs = JSON.parse(handoffsRaw) as Array<{ id: number }>;
const missingHandoffs = rows
  .map((r) => r.handoff_id)
  .filter((id) => !handoffs.some((h) => h.id === id));
if (missingHandoffs.length > 0) {
  throw new Error(`Missing handoff IDs: ${missingHandoffs.join(",")}`);
}

const processesRaw = await callSemantius(
  "GET",
  `/processes?id=in.(${processIds})&select=id`,
);
const processes = JSON.parse(processesRaw) as Array<{ id: number }>;
const missingProcesses = rows
  .map((r) => r.process_id)
  .filter((id) => !processes.some((p) => p.id === id));
if (missingProcesses.length > 0) {
  throw new Error(`Missing process IDs: ${missingProcesses.join(",")}`);
}

const existingRaw = await callSemantius(
  "GET",
  `/handoff_processes?handoff_id=in.(${handoffIds})&select=handoff_id,process_id`,
);
const existing = JSON.parse(existingRaw) as Array<{ handoff_id: number; process_id: number }>;
const toInsert = rows.filter(
  (r) =>
    !existing.some(
      (e) => e.handoff_id === r.handoff_id && e.process_id === r.process_id,
    ),
);

console.log(
  `Pre-flight: ${rows.length} candidate rows, ${existing.length} already present, ${toInsert.length} to insert.`,
);

if (toInsert.length === 0) {
  console.log("Nothing to insert. Exiting cleanly.");
  process.exit(0);
}

const insertedRaw = await callSemantius(
  "POST",
  "/handoff_processes?select=id,handoff_id,process_id",
  toInsert,
);
const inserted = JSON.parse(insertedRaw) as Array<{
  id: number;
  handoff_id: number;
  process_id: number;
}>;

console.log(`Inserted ${inserted.length} handoff_processes rows:`);
for (const row of inserted) {
  console.log(`  id=${row.id} handoff=${row.handoff_id} process=${row.process_id}`);
}

console.log(
  "\nUI: https://tests.semantius.app/domain_map/handoff_processes",
);
