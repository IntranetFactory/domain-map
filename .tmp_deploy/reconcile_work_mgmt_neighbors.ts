// Pairwise reconciliation: WORK-MGMT against PROD-MGMT, SPM, PSA, EMP-EXP.
//
// Four-leg analysis summary:
//
//   PROD-MGMT (101)  — bidirectional, 8 existing handoffs all fully wired
//     Section 3 missing (A->B): 3 (work_item.completed, okr_objective.committed,
//                                  okr_objective.scored -> PM-ROADMAP-DELIVERY)
//     Section 3 missing (B->A): 0 (PROD-MGMT owes us nothing new beyond what's
//                                  already in handoffs; feature_request.shipped
//                                  is candidate but report-only on PROD-MGMT's B9)
//
//   PSA (68)         — 4 existing handoffs (3 fully wired, 1 NULL target on PSA side)
//     Section 3 missing (A->B): 1 (work_item.completed -> PSA-PROJECT-DELIVERY)
//     Section 2 NULL FK: handoff 787 (WM -> PSA work_automation.triggered, target NULL).
//                        PSA IS modularized so this is fix-able, but the row's value is
//                        speculative — work_automation.triggered firing into PSA is too
//                        broad. Leaving for PSA's own audit to drop or scope.
//
//   SPM (9)          — 6 existing handoffs ALL with NULL module FK on SPM side
//     SPM not modularized; all FK nulls are SPM B10b debt, NOT this domain's responsibility
//     Section 3 missing (A->B): 2 (okr_objective.committed, work_project.completed
//                                  -> SPM, target_mod NULL per the SKILL.md "legitimate
//                                  NULL when counterparty not modularized" exception)
//
//   EMP-EXP (62)     — 2 existing handoffs fully wired
//     Section 3 missing: 0
//
// Total: 6 new outbound handoffs.
// All B->A inbound gaps (PROD-MGMT.feature_request.shipped, SPM strategic_initiative.*,
// PSA service_project.completed, etc.) are owed by the source domains' own B9 audits.

const DOMAIN_WM = 135;
const DOMAIN_PROD_MGMT = 101;
const DOMAIN_PSA = 68;
const DOMAIN_SPM = 9;

const MOD_TASK_EXEC = 149;
const MOD_GOALS_OKR = 150;
const MOD_PM_ROADMAP = 131;
const MOD_PSA_DELIVERY = 86;

const DO_WORK_ITEMS = 243;
const DO_WORK_PROJECTS = 244;
const DO_OKR_OBJECTIVES = 245;

const EVENT_WORK_ITEM_COMPLETED = 148;
const EVENT_WORK_PROJECT_COMPLETED = 151;
const EVENT_OKR_OBJECTIVE_COMMITTED = 1374;
const EVENT_OKR_OBJECTIVE_SCORED = 1375;

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
  if (body.length === 0) return [];
  const payload = JSON.stringify({ method: "POST", path, body });
  const tmpFile = `c:/tmp/_semantius_payload_${Date.now()}_${Math.random().toString(36).slice(2)}.json`;
  await Bun.write(tmpFile, payload);
  const proc = Bun.spawn(
    ["bash", "-c", `cat "${tmpFile}" | semantius call crud postgrestRequest && rm -f "${tmpFile}"`],
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

interface Handoff { id: number; source_domain_module_id: number | null; target_domain_module_id: number | null; trigger_event_id: number; data_object_id: number; }

const proposed: Array<Omit<Handoff, "id"> & {
  source_domain_id: number;
  target_domain_id: number;
  integration_pattern: string;
  friction_level: string;
  description: string;
  notes: string;
}> = [
  // PROD-MGMT (3)
  {
    source_domain_id: DOMAIN_WM, target_domain_id: DOMAIN_PROD_MGMT,
    source_domain_module_id: MOD_TASK_EXEC, target_domain_module_id: MOD_PM_ROADMAP,
    trigger_event_id: EVENT_WORK_ITEM_COMPLETED, data_object_id: DO_WORK_ITEMS,
    integration_pattern: "api_call", friction_level: "medium",
    description: "WM work_item completion updates PROD-MGMT roadmap progress when items are linked to feature_requests or product_releases. Most product-mgmt tools (Aha, Productboard, Roadmunk) integrate via this signal but each integration is bespoke — friction is the mapping between work_item id and roadmap_item id.",
    notes: "",
  },
  {
    source_domain_id: DOMAIN_WM, target_domain_id: DOMAIN_PROD_MGMT,
    source_domain_module_id: MOD_GOALS_OKR, target_domain_module_id: MOD_PM_ROADMAP,
    trigger_event_id: EVENT_OKR_OBJECTIVE_COMMITTED, data_object_id: DO_OKR_OBJECTIVES,
    integration_pattern: "api_call", friction_level: "medium",
    description: "Team OKR commits in WM; PROD-MGMT roadmaps that align to OKR cycles pick up the committed objective for alignment scoring. Aha, Productboard, and similar tools maintain OKR sync as a paid feature.",
    notes: "",
  },
  {
    source_domain_id: DOMAIN_WM, target_domain_id: DOMAIN_PROD_MGMT,
    source_domain_module_id: MOD_GOALS_OKR, target_domain_module_id: MOD_PM_ROADMAP,
    trigger_event_id: EVENT_OKR_OBJECTIVE_SCORED, data_object_id: DO_OKR_OBJECTIVES,
    integration_pattern: "api_call", friction_level: "medium",
    description: "End-of-cycle OKR score feeds PROD-MGMT retrospective and next-cycle roadmap prioritization. Distinct from committed (kickoff) and aligned to roadmap delivery KPIs.",
    notes: "",
  },
  // PSA (1)
  {
    source_domain_id: DOMAIN_WM, target_domain_id: DOMAIN_PSA,
    source_domain_module_id: MOD_TASK_EXEC, target_domain_module_id: MOD_PSA_DELIVERY,
    trigger_event_id: EVENT_WORK_ITEM_COMPLETED, data_object_id: DO_WORK_ITEMS,
    integration_pattern: "api_call", friction_level: "low",
    description: "When WM is the work tracker for a PSA-managed delivery, work_item completion closes the loop on PSA-side time / utilization accounting. Pairs with the existing PSA -> WM project_task.completed inbound for the bidirectional sync pattern.",
    notes: "",
  },
  // SPM (2) — target_mod NULL: SPM is not modularized, legitimate NULL per SKILL.md
  {
    source_domain_id: DOMAIN_WM, target_domain_id: DOMAIN_SPM,
    source_domain_module_id: MOD_GOALS_OKR, target_domain_module_id: null,
    trigger_event_id: EVENT_OKR_OBJECTIVE_COMMITTED, data_object_id: DO_OKR_OBJECTIVES,
    integration_pattern: "api_call", friction_level: "medium",
    description: "Team-level OKR commits in WM cascade upward into SPM portfolio rollup. SPM tracks corporate / strategic OKRs and aggregates team commits for portfolio reporting. target_domain_module_id NULL because SPM is not yet modularized.",
    notes: "",
  },
  {
    source_domain_id: DOMAIN_WM, target_domain_id: DOMAIN_SPM,
    source_domain_module_id: MOD_TASK_EXEC, target_domain_module_id: null,
    trigger_event_id: EVENT_WORK_PROJECT_COMPLETED, data_object_id: DO_WORK_PROJECTS,
    integration_pattern: "api_call", friction_level: "medium",
    description: "WM work_project completion feeds SPM portfolio rollup (project closure as a milestone in the strategic portfolio). target_domain_module_id NULL because SPM is not yet modularized.",
    notes: "",
  },
];

// Idempotency by (source_module, target_domain, trigger_event, data_object).
const triggerEventIds = Array.from(new Set(proposed.map((p) => p.trigger_event_id))).join(",");
const targetDomains = Array.from(new Set(proposed.map((p) => p.target_domain_id))).join(",");

const existing = await get<Handoff>(
  `/handoffs?and=(source_domain_id.eq.${DOMAIN_WM},target_domain_id.in.(${targetDomains}),trigger_event_id.in.(${triggerEventIds}))&select=id,source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id,target_domain_id`,
);
const key = (h: { trigger_event_id: number; source_domain_module_id: number | null; target_domain_id: number; data_object_id: number }) =>
  `${h.trigger_event_id}:${h.source_domain_module_id}:${h.target_domain_id}:${h.data_object_id}`;
const existingKeys = new Set(existing.map((h) => key({ ...h, target_domain_id: (h as { target_domain_id: number }).target_domain_id })));
const toInsert = proposed.filter((h) => !existingKeys.has(key(h)));

if (toInsert.length > 0) {
  const inserted = await postReturning<Handoff>("/handoffs", toInsert);
  console.log(`Inserted ${inserted.length} cross-domain handoffs:`);
  for (const h of inserted) console.log(`  id=${h.id} trigger=${h.trigger_event_id} src_mod=${h.source_domain_module_id} tgt_mod=${h.target_domain_module_id}`);
} else {
  console.log("All 6 reconciliation handoffs already present.");
}

// Final verification: list outbound from WM to the 4 neighbors.
console.log("\n=== Final outbound from WM to 4 neighbors ===");
const finalOut = await get<Handoff & { trigger_event: { event_name: string }; target_domain_id: number }>(
  `/handoffs?and=(source_domain_id.eq.${DOMAIN_WM},target_domain_id.in.(${DOMAIN_PROD_MGMT},${DOMAIN_PSA},${DOMAIN_SPM},62))&select=id,target_domain_id,source_domain_module_id,target_domain_module_id,data_object_id,integration_pattern,friction_level,trigger_event:trigger_events(event_name)&order=target_domain_id.asc,trigger_event_id.asc`,
);
for (const h of finalOut) {
  console.log(`  -> dom ${h.target_domain_id} mod ${h.target_domain_module_id ?? "null"}: ${h.trigger_event.event_name} ${h.integration_pattern}/${h.friction_level}`);
}
