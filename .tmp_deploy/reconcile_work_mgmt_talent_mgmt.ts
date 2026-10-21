// WORK-MGMT <-> TALENT-MGMT pairwise reconciliation, fix loads.
//
// Reconciliation summary:
//   - Existing handoffs between 135 and 58: 0 (in either direction)
//   - Boundary integrity: OK post-2026-05-29 M7 cure (TALENT-PERFORMANCE-MGMT
//     embedded_master on okr_objectives points at canonical master in WORK-MGMT-GOALS-OKR)
//   - Cross-domain relationships already in place: performance_reviews evaluates okr_objectives,
//     performance_goals aligns_to okr_objectives. No new relationships needed.
//
// Missing handoffs (Section 3 of the four-leg diff), 2 rows, both A->B direction:
//   1. okr_objective.committed (mod 150) -> TALENT-PERFORMANCE-MGMT (mod 51) on okr_objectives.
//      api_call + medium. Lattice/15Five-style perf platforms read committed OKRs to seed
//      per-employee performance_goals.
//   2. okr_objective.scored (mod 150) -> TALENT-PERFORMANCE-MGMT (mod 51) on okr_objectives.
//      api_call + high. End-of-cycle OKR score feeds the perf review compensation discussion;
//      this is the most-cited integration pain point across Lattice/15Five/Culture Amp user
//      surveys when the OKR tool is separate from the perf tool.
//
// B->A (TALENT-MGMT -> WORK-MGMT) produces no missing rows by design:
//   - WORK-MGMT has no consumer / contributor DMDO rows on any TALENT-MGMT master.
//   - Perf data is HR-confidential; cross-pushing into a team-execution surface is not a
//     vendor-modeled pattern.
//
// TALENT-MGMT B10b debt (report-only, not fixed from this loader):
//   - handoff id=113 (calibration.complete) has source_domain_module_id=51 but the
//     trigger_event is a legacy duplicate of id=446 talent_calibration.completed.
//   - Workflow-gate states on performance_reviews (self_assessment / manager_assessment /
//     submitted / calibrated / published) have requires_permission=true but no matching
//     trigger_events. Same for performance_goals (approved, cancelled) and
//     talent_calibrations (scheduled, ratings_locked, published).
//   - Surfaces in TALENT-MGMT's own B9 audit, not addressable from this reconciliation.

const DOMAIN_WORK_MGMT = 135;
const DOMAIN_TALENT_MGMT = 58;
const MOD_GOALS_OKR = 150;
const MOD_TALENT_PERF = 51;
const DO_OKR_OBJECTIVES = 245;
const EVENT_COMMITTED = 1374;
const EVENT_SCORED = 1375;

async function call(method: string, path: string, body?: unknown): Promise<unknown> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius ${method} ${path} exit ${code}\n${stderr}\n${stdout}`);
  return stdout ? JSON.parse(stdout) : null;
}

async function get<T>(path: string): Promise<T[]> {
  return (await call("GET", path)) as T[];
}

async function postReturning<T>(path: string, body: unknown[]): Promise<T[]> {
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify({ method: "POST", path, body, headers: { Prefer: "return=representation" } })],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`POST ${path} exit ${code}\n${stderr}\n${stdout}`);
  return JSON.parse(stdout) as T[];
}

interface Handoff {
  id: number;
  source_domain_module_id: number;
  target_domain_module_id: number;
  trigger_event_id: number;
  data_object_id: number;
}

const proposed: Array<Omit<Handoff, "id"> & {
  source_domain_id: number;
  target_domain_id: number;
  integration_pattern: string;
  friction_level: string;
  description: string;
  notes: string;
}> = [
  {
    source_domain_id: DOMAIN_WORK_MGMT, target_domain_id: DOMAIN_TALENT_MGMT,
    source_domain_module_id: MOD_GOALS_OKR, target_domain_module_id: MOD_TALENT_PERF,
    trigger_event_id: EVENT_COMMITTED, data_object_id: DO_OKR_OBJECTIVES,
    integration_pattern: "api_call", friction_level: "medium",
    description: "Team OKR commits in WORK-MGMT-GOALS-OKR; TALENT-PERFORMANCE-MGMT reads the committed objective so per-employee performance_goals can align to its KRs. Most modern perf platforms (Lattice, 15Five, Culture Amp) ship OKR-tool sync; non-trivial when the OKR tool is separate from the perf tool because employee-to-KR mapping is manual.",
    notes: "",
  },
  {
    source_domain_id: DOMAIN_WORK_MGMT, target_domain_id: DOMAIN_TALENT_MGMT,
    source_domain_module_id: MOD_GOALS_OKR, target_domain_module_id: MOD_TALENT_PERF,
    trigger_event_id: EVENT_SCORED, data_object_id: DO_OKR_OBJECTIVES,
    integration_pattern: "api_call", friction_level: "high",
    description: "End-of-cycle OKR score feeds directly into per-employee performance review compensation discussion. High friction: most-cited integration pain point across Lattice/15Five/Culture Amp user surveys when the team OKR tool is a separate vendor from the perf review tool — managers re-derive scores manually, often after late-bound corrections to the OKR-side scoring.",
    notes: "",
  },
];

const existing = await get<Handoff>(
  `/handoffs?and=(source_domain_id.eq.${DOMAIN_WORK_MGMT},target_domain_id.eq.${DOMAIN_TALENT_MGMT})&trigger_event_id=in.(${EVENT_COMMITTED},${EVENT_SCORED})&select=id,source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id`,
);
const key = (h: Pick<Handoff, "trigger_event_id" | "source_domain_module_id" | "target_domain_module_id">) =>
  `${h.trigger_event_id}:${h.source_domain_module_id}:${h.target_domain_module_id}`;
const existingKeys = new Set(existing.map(key));
const toInsert = proposed.filter((h) => !existingKeys.has(key(h)));

if (toInsert.length > 0) {
  const inserted = await postReturning<Handoff>("/handoffs", toInsert);
  console.log(`Inserted ${inserted.length} WORK-MGMT -> TALENT-MGMT handoffs:`);
  for (const h of inserted) console.log(`  id=${h.id} trigger_event=${h.trigger_event_id} mods ${h.source_domain_module_id}->${h.target_domain_module_id}`);
} else {
  console.log("Both handoffs already present.");
}

// Verification.
const after = await get<Handoff & { trigger_event: { event_name: string } }>(
  `/handoffs?and=(source_domain_id.eq.${DOMAIN_WORK_MGMT},target_domain_id.eq.${DOMAIN_TALENT_MGMT})&select=id,trigger_event_id,source_domain_module_id,target_domain_module_id,data_object_id,integration_pattern,friction_level,trigger_event:trigger_events(event_name)`,
);
console.log(`\nFinal WORK-MGMT -> TALENT-MGMT handoff count: ${after.length}`);
for (const h of after) console.log(`  ${h.trigger_event.event_name} : mods ${h.source_domain_module_id}->${h.target_domain_module_id} ${h.integration_pattern}/${h.friction_level}`);
