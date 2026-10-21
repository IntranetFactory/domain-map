#!/usr/bin/env bun
// Fix HCM audit findings (2026-05-25):
//   - B9b: 7 intra-domain (cross-module) handoffs across HCM-CORE-WORKER (54),
//     HCM-ORG-POSITIONS (55), HCM-LIFECYCLE-WORKFLOWS (56).
//   - B10b: 1 outbound handoff (id=11, headcount.actuals_updated) missing
//     source_domain_module_id; patch to 54 HCM-CORE-WORKER.
//
// Idempotent: existing intra-HCM rows keyed by (trigger_event_id, src_module, tgt_module).

type Row = Record<string, unknown>;

async function call(body: Row): Promise<unknown> {
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
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const HCM_DOMAIN_ID = 54;

const INTRA_HANDOFFS: Row[] = [
  {
    trigger_event_id: 47, // employee.created
    source_domain_id: HCM_DOMAIN_ID,
    source_domain_module_id: 54,
    target_domain_id: HCM_DOMAIN_ID,
    target_domain_module_id: 56,
    data_object_id: 31,
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "New worker record surfaces in self-service: manager dashboard, new-hire welcome surface, lifecycle task inbox. In-process state read; no message bus.",
    notes: "",
  },
  {
    trigger_event_id: 49, // employee.terminated
    source_domain_id: HCM_DOMAIN_ID,
    source_domain_module_id: 54,
    target_domain_id: HCM_DOMAIN_ID,
    target_domain_module_id: 56,
    data_object_id: 31,
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "Termination drives the offboarding self-service flow: exit-interview prompt, equipment-return task, knowledge-handoff surfaces in the lifecycle workflow module.",
    notes: "",
  },
  {
    trigger_event_id: 49,
    source_domain_id: HCM_DOMAIN_ID,
    source_domain_module_id: 54,
    target_domain_id: HCM_DOMAIN_ID,
    target_domain_module_id: 55,
    data_object_id: 32,
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "Position transitions from filled to open as the incumbent terminates; org-position module recomputes vacancy and span-of-control rollups.",
    notes: "",
  },
  {
    trigger_event_id: 98, // hcm_position.approved_for_creation
    source_domain_id: HCM_DOMAIN_ID,
    source_domain_module_id: 55,
    target_domain_id: HCM_DOMAIN_ID,
    target_domain_module_id: 54,
    data_object_id: 32,
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "Approved position becomes hireable; worker-record module can attach a new employee once the requisition closes.",
    notes: "",
  },
  {
    trigger_event_id: 50, // employment_event.recorded
    source_domain_id: HCM_DOMAIN_ID,
    source_domain_module_id: 54,
    target_domain_id: HCM_DOMAIN_ID,
    target_domain_module_id: 56,
    data_object_id: 36,
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "Posted employment event (transfer, FTE change, leave, promotion) surfaces on employee and manager dashboards and feeds lifecycle approval routing.",
    notes: "",
  },
  {
    trigger_event_id: 392, // org_unit.merged
    source_domain_id: HCM_DOMAIN_ID,
    source_domain_module_id: 55,
    target_domain_id: HCM_DOMAIN_ID,
    target_domain_module_id: 54,
    data_object_id: 34,
    integration_pattern: "lifecycle_progression",
    friction_level: "medium",
    description: "Org-unit consolidation cascades employee re-assignment, manager and dotted-line reassignment, and reporting-line recompute on the worker record.",
    notes: "",
  },
  {
    trigger_event_id: 393, // org_unit.disbanded
    source_domain_id: HCM_DOMAIN_ID,
    source_domain_module_id: 55,
    target_domain_id: HCM_DOMAIN_ID,
    target_domain_module_id: 54,
    data_object_id: 34,
    integration_pattern: "lifecycle_progression",
    friction_level: "high",
    description: "Disbanded org unit requires every incumbent employee to be re-placed before close; worker-record module blocks the close until reassignment completes.",
    notes: "",
  },
];

async function main() {
  console.log("Reading existing intra-HCM handoffs ...");
  const existing = (await call({
    method: "GET",
    path: `/handoffs?and=(source_domain_id.eq.${HCM_DOMAIN_ID},target_domain_id.eq.${HCM_DOMAIN_ID})&select=trigger_event_id,source_domain_module_id,target_domain_module_id`,
  })) as Array<{
    trigger_event_id: number;
    source_domain_module_id: number | null;
    target_domain_module_id: number | null;
  }>;
  const existingKeys = new Set(
    existing.map(
      (r) => `${r.trigger_event_id}|${r.source_domain_module_id}|${r.target_domain_module_id}`,
    ),
  );
  console.log(`Existing: ${existingKeys.size}`);

  const toInsert = INTRA_HANDOFFS.filter(
    (r) =>
      !existingKeys.has(
        `${r.trigger_event_id}|${r.source_domain_module_id}|${r.target_domain_module_id}`,
      ),
  );
  console.log(`B9b rows to insert: ${toInsert.length} of ${INTRA_HANDOFFS.length}`);

  if (toInsert.length > 0) {
    const inserted = await call({ method: "POST", path: "/handoffs", body: toInsert });
    console.log(`Inserted: ${Array.isArray(inserted) ? inserted.length : "?"} rows`);
  }

  console.log("\nPatching handoff id=11 source_domain_module_id = 54 ...");
  const patched = await call({
    method: "PATCH",
    path: "/handoffs?id=eq.11&source_domain_module_id=is.null",
    body: { source_domain_module_id: 54 },
  });
  console.log(`Patched:`, JSON.stringify(patched).slice(0, 200));

  console.log("\nDone.");
}

await main();
