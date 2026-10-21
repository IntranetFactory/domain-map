#!/usr/bin/env bun
// Load the 6 missing handoffs surfaced by the pairwise reconciliation.
// All trigger events already exist; all partner modules resolve cleanly.

const SEMANTIUS = "semantius";

async function api(path: string, method: "GET" | "POST" | "PATCH" | "DELETE" = "GET", body?: any) {
  const args: any = { method, path };
  if (body !== undefined) args.body = body;
  const proc = Bun.spawn([SEMANTIUS, "call", "crud", "postgrestRequest"], {
    stdin: new TextEncoder().encode(JSON.stringify(args)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const errOut = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error(`semantius failed: ${errOut}\n${out}`);
  return out.trim() ? JSON.parse(out) : null;
}

// (trigger_event_id, source_domain_id, source_domain_module_id, target_domain_id, target_domain_module_id, data_object_id, integration_pattern, friction_level, description)
const handoffs = [
  {
    trigger_event_id: 452, // action_plan.completed
    source_domain_id: 62,  // EMP-EXP
    source_domain_module_id: 65, // EMP-EXP-ACTION-PLANNING
    target_domain_id: 135, // WORK-MGMT
    target_domain_module_id: 149, // WORK-MGMT-TASK-EXEC
    data_object_id: 184, // action_plans
    integration_pattern: "api_call",
    friction_level: "medium",
    description:
      "An engagement action plan transitions to completed in EMP-EXP. Subscribers in WORK-MGMT close the work_items that tracked each action item and roll up completion for reporting. Failure mode: action items may be closed in EMP-EXP without the linked work_items being closed in WORK-MGMT, leaving stale tasks.",
  },
  {
    trigger_event_id: 1162, // project_assignment.released
    source_domain_id: 68,  // PSA
    source_domain_module_id: 87, // PSA-RESOURCE-MGMT
    target_domain_id: 135,
    target_domain_module_id: 149,
    data_object_id: 218, // project_assignments
    integration_pattern: "event_stream",
    friction_level: "low",
    description:
      "A project assignment is released in PSA (consultant rolls off or capacity is freed). WORK-MGMT subscribers may close or reassign the work_items that were owned by the released assignee. Failure mode: orphaned work_items if the release event is missed and no reassignment happens.",
  },
  {
    trigger_event_id: 1154, // product_release.shipped
    source_domain_id: 101, // PROD-MGMT
    source_domain_module_id: 131, // PM-ROADMAP-DELIVERY
    target_domain_id: 135,
    target_domain_module_id: 149,
    data_object_id: 404, // product_releases
    integration_pattern: "event_stream",
    friction_level: "low",
    description:
      "A product release ships in PROD-MGMT. WORK-MGMT subscribers close the work_items that tracked release-prep tasks and surface release notes against the project board.",
  },
  {
    trigger_event_id: 1155, // product_release.rolled_back
    source_domain_id: 101,
    source_domain_module_id: 131,
    target_domain_id: 135,
    target_domain_module_id: 149,
    data_object_id: 404,
    integration_pattern: "event_stream",
    friction_level: "medium",
    description:
      "A product release is rolled back in PROD-MGMT (post-ship regression or incident). WORK-MGMT subscribers reopen the work_items that tracked the release and spawn remediation tasks. Failure mode: remediation tasks may not be scoped correctly if the rollback reason isn't propagated.",
  },
  {
    trigger_event_id: 1156, // product_roadmap.published
    source_domain_id: 101,
    source_domain_module_id: 131,
    target_domain_id: 135,
    target_domain_module_id: 149,
    data_object_id: 405, // product_roadmaps
    integration_pattern: "event_stream",
    friction_level: "low",
    description:
      "A new or updated product roadmap is published in PROD-MGMT. WORK-MGMT subscribers create work_projects or sub-projects representing the new roadmap initiatives so cross-functional teams can begin execution tracking.",
  },
  {
    trigger_event_id: 871, // work_automation.disabled
    source_domain_id: 135, // WORK-MGMT
    source_domain_module_id: 149, // WORK-MGMT-TASK-EXEC
    target_domain_id: 101, // PROD-MGMT
    target_domain_module_id: 131, // PM-ROADMAP-DELIVERY
    data_object_id: 246, // work_automations
    integration_pattern: "event_stream",
    friction_level: "low",
    description:
      "A WORK-MGMT automation rule has been disabled. PROD-MGMT subscribers stop reacting to its downstream effects (e.g. auto-creation of feature_request linkages from incoming work_items).",
  },
];

console.log("Loading 6 missing handoffs...");

// Check for any existing (trigger_event_id, source_domain_id, target_domain_id) duplicates first
const triggerIds = handoffs.map((h) => h.trigger_event_id).join(",");
const existing: any[] = await api(
  `/handoffs?trigger_event_id=in.(${triggerIds})&select=id,trigger_event_id,source_domain_id,target_domain_id`,
);
const existingKey = new Set(existing.map((h: any) => `${h.trigger_event_id}:${h.source_domain_id}:${h.target_domain_id}`));
const handoffKey = (h: any) => `${h.trigger_event_id}:${h.source_domain_id}:${h.target_domain_id}`;
const missing = handoffs.filter((h) => !existingKey.has(handoffKey(h)));

if (missing.length === 0) {
  console.log("  all 6 already present");
} else {
  console.log(`  inserting ${missing.length} of ${handoffs.length}`);
  await api("/handoffs", "POST", missing);
  console.log("  done");
}

// Verify
const post: any[] = await api(
  `/handoffs?trigger_event_id=in.(${triggerIds})&select=id,trigger_event_id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id`,
);
console.log(`\nPost-load: ${post.length} rows on these trigger_events`);
for (const h of post) {
  console.log(`  id=${h.id} te=${h.trigger_event_id} ${h.source_domain_id}/${h.source_domain_module_id} -> ${h.target_domain_id}/${h.target_domain_module_id}`);
}
