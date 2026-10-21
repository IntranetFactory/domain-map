// HCM B9 fix surfaced by PSA reconciliation (2026-05-26):
// Add 9 outbound handoffs from HCM (54) to PSA (68) on `employees` and `job_profiles`,
// the two HCM masters PSA's RESOURCE-MGMT and PROJECT-DELIVERY modules consume.
//
// Scope decision (per recommendation in the reconciliation summary):
// - 8 events fan out to PSA-RESOURCE-MGMT (87) only — it owns the resource pool, skills
//   inventory and assignment lifecycle, so it is the consumer of record for every
//   HCM event that affects staffing.
// - 1 event (employee.terminated) ALSO fans out to PSA-PROJECT-DELIVERY (86) because
//   terminated employees may be project / task assignees and PROJECT-DELIVERY needs
//   to surface the continuity gap.
// - job_profile.approved is omitted: job_profile.activated is the gate event that
//   makes a profile assignable; the prior `approved` transition is consumed
//   internally by HCM only.
// - employee.created / employee.promoted are NOT fanned to PROJECT-DELIVERY:
//   projects don't care about HR pool churn until a resource is assigned; the
//   assignment event chain handles that.
//
// Friction levels:
// - attrition_risk.high: high (probabilistic→deterministic action pattern;
//   ML attrition score requires staffing-side reaction; false-positive volume
//   is the failure mode).
// - employee.terminated: medium (leaver/cancellation recall pattern; the
//   going-away signal is harder to catch than the arriving one).
// - everything else: low (well-known HR event streams).
//
// Idempotent on (trigger_event_id, source_domain_module_id, target_domain_module_id,
// data_object_id). Safe to re-run.

async function pg(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<unknown> {
  const args = { method, path, ...(body !== undefined ? { body } : {}) };
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(args));
  await proc.stdin.end();
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`pg ${method} ${path} failed (${code}): ${err || out}`);
  const t = out.trim();
  return t ? JSON.parse(t) : null;
}

const HCM_ID = 54;
const PSA_ID = 68;
const HCM_CORE_WORKER = 54;     // HCM-CORE-WORKER module
const HCM_ORG_POSITIONS = 55;   // HCM-ORG-POSITIONS module
const PSA_RESOURCE_MGMT = 87;
const PSA_PROJECT_DELIVERY = 86;
const D_EMPLOYEES = 31;
const D_JOB_PROFILES = 33;

type HandoffSpec = {
  trigger_event_id: number;
  event_name: string;  // for log only
  source_domain_module_id: number;
  target_domain_module_id: number;
  data_object_id: number;
  integration_pattern: "event_stream" | "api_call" | "batch_sync" | "manual_handoff" | "file_drop" | "lifecycle_progression";
  friction_level: "low" | "medium" | "high";
  description: string;
};

const HANDOFFS: HandoffSpec[] = [
  // employee events -> PSA-RESOURCE-MGMT
  {
    trigger_event_id: 47, event_name: "employee.created",
    source_domain_module_id: HCM_CORE_WORKER, target_domain_module_id: PSA_RESOURCE_MGMT,
    data_object_id: D_EMPLOYEES,
    integration_pattern: "event_stream", friction_level: "low",
    description: "New consultant hired. PSA resource pool adds the employee as available capacity; skill inventory record is seeded for downstream certifications.",
  },
  {
    trigger_event_id: 48, event_name: "employee.promoted",
    source_domain_module_id: HCM_CORE_WORKER, target_domain_module_id: PSA_RESOURCE_MGMT,
    data_object_id: D_EMPLOYEES,
    integration_pattern: "event_stream", friction_level: "low",
    description: "Consultant promoted (level / job profile change). PSA reevaluates billable rate band and skill inventory; existing project_assignments may need rate revision.",
  },
  {
    trigger_event_id: 49, event_name: "employee.terminated",
    source_domain_module_id: HCM_CORE_WORKER, target_domain_module_id: PSA_RESOURCE_MGMT,
    data_object_id: D_EMPLOYEES,
    integration_pattern: "event_stream", friction_level: "medium",
    description: "Consultant terminated. PSA must release any active project_assignments, return capacity to bench and re-allocate forecast. Medium friction: leaver-event timing varies (immediate vs notice period) and active assignments may need urgent rebalancing.",
  },
  {
    trigger_event_id: 10, event_name: "attrition_risk.high",
    source_domain_module_id: HCM_CORE_WORKER, target_domain_module_id: PSA_RESOURCE_MGMT,
    data_object_id: D_EMPLOYEES,
    integration_pattern: "event_stream", friction_level: "high",
    description: "ML attrition score crosses high threshold. PSA resource managers may proactively rebalance assignments away from at-risk consultants on critical engagements. High friction: probabilistic→deterministic pattern (score requires judgement call), false-positive volume can swamp the staffing queue.",
  },

  // employee.terminated also -> PSA-PROJECT-DELIVERY (task assignee continuity)
  {
    trigger_event_id: 49, event_name: "employee.terminated (delivery cross-cut)",
    source_domain_module_id: HCM_CORE_WORKER, target_domain_module_id: PSA_PROJECT_DELIVERY,
    data_object_id: D_EMPLOYEES,
    integration_pattern: "event_stream", friction_level: "medium",
    description: "Terminated employee may be the assignee on open project_tasks. PROJECT-DELIVERY needs to surface affected tasks for reassignment or completion handover.",
  },

  // job_profile events -> PSA-RESOURCE-MGMT
  {
    trigger_event_id: 389, event_name: "job_profile.published",
    source_domain_module_id: HCM_ORG_POSITIONS, target_domain_module_id: PSA_RESOURCE_MGMT,
    data_object_id: D_JOB_PROFILES,
    integration_pattern: "event_stream", friction_level: "low",
    description: "New job profile published. PSA picks up the role definition (competencies, level) as a new shape for skill-based demand modeling and resource_skill_inventories matching.",
  },
  {
    trigger_event_id: 390, event_name: "job_profile.updated",
    source_domain_module_id: HCM_ORG_POSITIONS, target_domain_module_id: PSA_RESOURCE_MGMT,
    data_object_id: D_JOB_PROFILES,
    integration_pattern: "event_stream", friction_level: "low",
    description: "Job profile updated (competencies, level, responsibilities). PSA revalidates the resource pool's skill matches and surfaces gaps via existing resource_skill_inventory.gap_identified signal.",
  },
  {
    trigger_event_id: 1258, event_name: "job_profile.activated",
    source_domain_module_id: HCM_ORG_POSITIONS, target_domain_module_id: PSA_RESOURCE_MGMT,
    data_object_id: D_JOB_PROFILES,
    integration_pattern: "event_stream", friction_level: "low",
    description: "Job profile activated for production. PSA makes the role assignable on new project_assignments and project_resource_allocations.",
  },
  {
    trigger_event_id: 1259, event_name: "job_profile.retired",
    source_domain_module_id: HCM_ORG_POSITIONS, target_domain_module_id: PSA_RESOURCE_MGMT,
    data_object_id: D_JOB_PROFILES,
    integration_pattern: "event_stream", friction_level: "low",
    description: "Job profile retired. PSA blocks new assignments to the role and surfaces a migration list for any existing project_assignments still referencing it.",
  },
];

async function ensureHandoff(spec: HandoffSpec): Promise<{ skipped: boolean }> {
  const existing = (await pg(
    "GET",
    `/handoffs?trigger_event_id=eq.${spec.trigger_event_id}&source_domain_module_id=eq.${spec.source_domain_module_id}&target_domain_module_id=eq.${spec.target_domain_module_id}&data_object_id=eq.${spec.data_object_id}&select=id`,
  )) as Array<{ id: number }>;
  if (existing.length) return { skipped: true };
  await pg("POST", "/handoffs", [
    {
      trigger_event_id: spec.trigger_event_id,
      source_domain_id: HCM_ID,
      source_domain_module_id: spec.source_domain_module_id,
      target_domain_id: PSA_ID,
      target_domain_module_id: spec.target_domain_module_id,
      data_object_id: spec.data_object_id,
      integration_pattern: spec.integration_pattern,
      friction_level: spec.friction_level,
      description: spec.description,
      notes: "",
    },
  ]);
  return { skipped: false };
}

async function verify(): Promise<void> {
  console.log("\nPost-load verification");
  const rows = (await pg(
    "GET",
    "/handoffs?source_domain_id=eq.54&target_domain_id=eq.68&select=id,trigger_event_id,source_domain_module_id,target_domain_module_id,friction_level,trigger_events(event_name)&order=trigger_event_id.asc,target_domain_module_id.asc",
  )) as Array<{
    id: number; trigger_event_id: number; source_domain_module_id: number;
    target_domain_module_id: number; friction_level: string;
    trigger_events: { event_name: string };
  }>;
  console.log(`  HCM->PSA handoffs: ${rows.length}`);
  for (const r of rows) {
    console.log(`    handoff ${r.id}: ${r.trigger_events.event_name} (mod ${r.source_domain_module_id}->${r.target_domain_module_id}, friction=${r.friction_level})`);
  }
}

async function main(): Promise<void> {
  console.log("HCM->PSA handoffs loader (B9 fix surfaced by PSA reconciliation)");
  let inserted = 0;
  let skipped = 0;
  for (const spec of HANDOFFS) {
    const { skipped: s } = await ensureHandoff(spec);
    if (s) {
      skipped++;
      console.log(`  SKIP ${spec.event_name} -> module ${spec.target_domain_module_id}`);
    } else {
      inserted++;
      console.log(`  INSERT ${spec.event_name} -> module ${spec.target_domain_module_id} (friction=${spec.friction_level})`);
    }
  }
  console.log(`\n${inserted} inserted, ${skipped} already present (total ${HANDOFFS.length})`);
  await verify();
}

await main();
