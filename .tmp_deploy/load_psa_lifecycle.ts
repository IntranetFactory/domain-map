// PSA audit phase 3: B12 lifecycle states for 5 workflow-bearing masters.
// resource_skill_inventories (725) is config-shape exempt (note loaded in phase 1).
// Idempotent on (data_object_id, state_name).

async function pg(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<any> {
  const args: Record<string, unknown> = { method, path };
  if (body !== undefined) args.body = body;
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

const MODULES = {
  PROJECT_DELIVERY: 86,
  RESOURCE_MGMT: 87,
  TIME_EXPENSE: 88,
  PROJECT_FINANCIALS: 89,
};

const D = {
  service_projects: 216,
  project_tasks: 217,
  project_assignments: 218,
  project_billing_milestones: 219,
  project_resource_allocations: 726,
};

type State = {
  data_object_id: number;
  name_singular: string;
  state_name: string;
  state_order: number;
  description: string;
  is_initial?: boolean;
  is_terminal?: boolean;
  requires_permission?: boolean;
  permission_verb_override?: string;
  domain_module_id: number;
};

const states: State[] = [
  // service_projects — PROJECT_DELIVERY
  { data_object_id: D.service_projects, name_singular: "Project", state_name: "draft", state_order: 1, is_initial: true,
    description: "Engagement scope authored; commercial terms captured; not yet staffed.",
    domain_module_id: MODULES.PROJECT_DELIVERY },
  { data_object_id: D.service_projects, name_singular: "Project", state_name: "staffing_required", state_order: 2,
    requires_permission: true, permission_verb_override: "request_staffing_service_project",
    description: "Project approved for delivery; staffing demand published to resource managers.",
    domain_module_id: MODULES.PROJECT_DELIVERY },
  { data_object_id: D.service_projects, name_singular: "Project", state_name: "in_flight", state_order: 3,
    requires_permission: true, permission_verb_override: "start_service_project",
    description: "Project actively being delivered: tasks underway, time and expense flowing in, milestones tracking.",
    domain_module_id: MODULES.PROJECT_DELIVERY },
  { data_object_id: D.service_projects, name_singular: "Project", state_name: "delivery_complete", state_order: 4,
    requires_permission: true, permission_verb_override: "complete_service_project",
    description: "All scoped tasks delivered and accepted by customer. Residual billing and revenue close-out may still post.",
    domain_module_id: MODULES.PROJECT_DELIVERY },
  { data_object_id: D.service_projects, name_singular: "Project", state_name: "closed", state_order: 5, is_terminal: true,
    requires_permission: true, permission_verb_override: "close_service_project",
    description: "Financials closed, revenue fully recognised, project archived. Read-only.",
    domain_module_id: MODULES.PROJECT_DELIVERY },
  { data_object_id: D.service_projects, name_singular: "Project", state_name: "cancelled", state_order: 6, is_terminal: true,
    requires_permission: true, permission_verb_override: "cancel_service_project",
    description: "Engagement terminated before completion (customer cancellation, scope withdrawal). Any incurred WIP follows contract terms.",
    domain_module_id: MODULES.PROJECT_DELIVERY },

  // project_tasks — PROJECT_DELIVERY
  { data_object_id: D.project_tasks, name_singular: "Project Task", state_name: "not_started", state_order: 1, is_initial: true,
    description: "Task created on the project plan; not yet picked up.",
    domain_module_id: MODULES.PROJECT_DELIVERY },
  { data_object_id: D.project_tasks, name_singular: "Project Task", state_name: "in_progress", state_order: 2,
    requires_permission: true, permission_verb_override: "start_project_task",
    description: "Assignee has begun work on the task.",
    domain_module_id: MODULES.PROJECT_DELIVERY },
  { data_object_id: D.project_tasks, name_singular: "Project Task", state_name: "blocked", state_order: 3,
    requires_permission: true, permission_verb_override: "block_project_task",
    description: "Task cannot proceed: upstream dependency, approval, or external input outstanding.",
    domain_module_id: MODULES.PROJECT_DELIVERY },
  { data_object_id: D.project_tasks, name_singular: "Project Task", state_name: "completed", state_order: 4, is_terminal: true,
    requires_permission: true, permission_verb_override: "complete_project_task",
    description: "Task delivered; rolls into milestone progress.",
    domain_module_id: MODULES.PROJECT_DELIVERY },
  { data_object_id: D.project_tasks, name_singular: "Project Task", state_name: "cancelled", state_order: 5, is_terminal: true,
    requires_permission: true, permission_verb_override: "cancel_project_task",
    description: "Task abandoned (scope change, descope, redundancy).",
    domain_module_id: MODULES.PROJECT_DELIVERY },

  // project_assignments — RESOURCE_MGMT
  { data_object_id: D.project_assignments, name_singular: "Project Assignment", state_name: "proposed", state_order: 1, is_initial: true,
    description: "Resource manager has nominated a consultant for a role on the project; awaiting confirmation.",
    domain_module_id: MODULES.RESOURCE_MGMT },
  { data_object_id: D.project_assignments, name_singular: "Project Assignment", state_name: "confirmed", state_order: 2,
    requires_permission: true, permission_verb_override: "confirm_project_assignment",
    description: "Resource committed to the project at a stated allocation; HCM capacity decremented; WORK-MGMT seat created.",
    domain_module_id: MODULES.RESOURCE_MGMT },
  { data_object_id: D.project_assignments, name_singular: "Project Assignment", state_name: "active", state_order: 3,
    description: "Resource is actively delivering on the assignment; hours flowing through time entries.",
    domain_module_id: MODULES.RESOURCE_MGMT },
  { data_object_id: D.project_assignments, name_singular: "Project Assignment", state_name: "released", state_order: 4, is_terminal: true,
    requires_permission: true, permission_verb_override: "release_project_assignment",
    description: "Resource has rolled off (planned end, early release, scope change). Capacity returned to HCM bench.",
    domain_module_id: MODULES.RESOURCE_MGMT },

  // project_billing_milestones — PROJECT_FINANCIALS
  { data_object_id: D.project_billing_milestones, name_singular: "Project Billing Milestone", state_name: "planned", state_order: 1, is_initial: true,
    description: "Milestone scheduled per contract; target date and amount captured; not yet delivered.",
    domain_module_id: MODULES.PROJECT_FINANCIALS },
  { data_object_id: D.project_billing_milestones, name_singular: "Project Billing Milestone", state_name: "reached", state_order: 2,
    requires_permission: true, permission_verb_override: "reach_project_billing_milestone",
    description: "Deliverable signed off by customer; milestone becomes billable.",
    domain_module_id: MODULES.PROJECT_FINANCIALS },
  { data_object_id: D.project_billing_milestones, name_singular: "Project Billing Milestone", state_name: "invoiced", state_order: 3,
    requires_permission: true, permission_verb_override: "invoice_project_billing_milestone",
    description: "Customer invoice raised in ERP-FIN against this milestone; AR clock starts.",
    domain_module_id: MODULES.PROJECT_FINANCIALS },
  { data_object_id: D.project_billing_milestones, name_singular: "Project Billing Milestone", state_name: "paid", state_order: 4, is_terminal: true,
    requires_permission: true, permission_verb_override: "mark_project_billing_milestone_paid",
    description: "Payment received; revenue fully realised against this milestone.",
    domain_module_id: MODULES.PROJECT_FINANCIALS },
  { data_object_id: D.project_billing_milestones, name_singular: "Project Billing Milestone", state_name: "slipped", state_order: 5,
    requires_permission: true, permission_verb_override: "mark_project_billing_milestone_slipped",
    description: "Target date passed without delivery; cash forecast adjusts; CLM may flag contract penalty exposure.",
    domain_module_id: MODULES.PROJECT_FINANCIALS },
  { data_object_id: D.project_billing_milestones, name_singular: "Project Billing Milestone", state_name: "written_off", state_order: 6, is_terminal: true,
    requires_permission: true, permission_verb_override: "write_off_project_billing_milestone",
    description: "Milestone cannot be billed (contract change, customer dispute, scope retirement). Revenue reversed.",
    domain_module_id: MODULES.PROJECT_FINANCIALS },

  // project_resource_allocations — RESOURCE_MGMT
  { data_object_id: D.project_resource_allocations, name_singular: "Project Resource Allocation", state_name: "tentative", state_order: 1, is_initial: true,
    description: "Forecast allocation drafted by resource manager; not yet committed.",
    domain_module_id: MODULES.RESOURCE_MGMT },
  { data_object_id: D.project_resource_allocations, name_singular: "Project Resource Allocation", state_name: "committed", state_order: 2,
    requires_permission: true, permission_verb_override: "commit_project_resource_allocation",
    description: "Allocation firmed up: HCM treats the named hours as booked capacity; CLM links the allocation to the underlying engagement contract.",
    domain_module_id: MODULES.RESOURCE_MGMT },
  { data_object_id: D.project_resource_allocations, name_singular: "Project Resource Allocation", state_name: "fulfilled", state_order: 3, is_terminal: true,
    description: "Allocation period elapsed and corresponding assignments closed.",
    domain_module_id: MODULES.RESOURCE_MGMT },
  { data_object_id: D.project_resource_allocations, name_singular: "Project Resource Allocation", state_name: "cancelled", state_order: 4, is_terminal: true,
    requires_permission: true, permission_verb_override: "cancel_project_resource_allocation",
    description: "Allocation withdrawn before commitment (forecast change, project delayed or descoped).",
    domain_module_id: MODULES.RESOURCE_MGMT },
];

async function ensureState(s: State): Promise<{ skipped: boolean }> {
  const existing = await pg(
    "GET",
    `/data_object_lifecycle_states?data_object_id=eq.${s.data_object_id}&state_name=eq.${encodeURIComponent(s.state_name)}&select=id`,
  );
  if (existing && existing.length) return { skipped: true };
  const label = `${s.name_singular}: ${s.state_name}`;
  await pg("POST", "/data_object_lifecycle_states", [
    {
      data_object_lifecycle_state_label: label,
      data_object_id: s.data_object_id,
      state_name: s.state_name,
      state_order: s.state_order,
      description: s.description,
      is_initial: s.is_initial ?? false,
      is_terminal: s.is_terminal ?? false,
      requires_permission: s.requires_permission ?? false,
      permission_verb_override: s.permission_verb_override ?? "",
      domain_module_id: s.domain_module_id,
      notes: "",
    },
  ]);
  return { skipped: false };
}

async function main(): Promise<void> {
  console.log("PSA lifecycle states loader (B12)");
  let inserted = 0;
  let skipped = 0;
  for (const s of states) {
    const { skipped: sk } = await ensureState(s);
    if (sk) skipped++;
    else inserted++;
  }
  console.log(`\n${inserted} inserted, ${skipped} already present (total ${states.length})`);
}

await main();
