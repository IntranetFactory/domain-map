// PSA Phase S (Rule #17): 4 module-level system skills + ~26 new mutate/compute
// tools + skill_tools. Retires legacy domain-level skill 94 at the end.
//
// Idempotent: tools by tool_name, skills by domain_module_id, skill_tools by
// (skill_id, tool_id).

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

// --- Tools to create ---

type ToolSpec = {
  tool_name: string;
  description: string;
  operation_kind: "query" | "mutate" | "side_effect" | "compute" | "inbound";
  coverage_tier: "platform" | "external" | "integration";
  data_object_id: number | null;
};

const NEW_TOOLS: ToolSpec[] = [
  // Single missing query
  { tool_name: "query_crm_opportunities", description: "Read CRM opportunity records via Semantius CRUD.", operation_kind: "query", coverage_tier: "platform", data_object_id: 100 },

  // PROJECT-DELIVERY mutates (service_projects 216, project_tasks 217)
  { tool_name: "create_service_project",           description: "Create a service engagement project record from a closed-won opportunity or signed SOW.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: 216 },
  { tool_name: "request_staffing_service_project", description: "Mark a project as staffing_required; publishes demand to resource managers.",            operation_kind: "mutate", coverage_tier: "platform", data_object_id: 216 },
  { tool_name: "start_service_project",            description: "Transition a project to in_flight: delivery actively underway.",                          operation_kind: "mutate", coverage_tier: "platform", data_object_id: 216 },
  { tool_name: "complete_service_project",         description: "Mark a project delivery_complete: all scoped tasks delivered and customer-accepted.",      operation_kind: "mutate", coverage_tier: "platform", data_object_id: 216 },
  { tool_name: "close_service_project",            description: "Close a project: financials closed, revenue fully recognised, archive read-only.",        operation_kind: "mutate", coverage_tier: "platform", data_object_id: 216 },
  { tool_name: "cancel_service_project",           description: "Cancel a project before completion (customer cancellation, scope withdrawal).",            operation_kind: "mutate", coverage_tier: "platform", data_object_id: 216 },
  { tool_name: "create_project_task",              description: "Create a delivery task on a project plan.",                                                operation_kind: "mutate", coverage_tier: "platform", data_object_id: 217 },
  { tool_name: "start_project_task",               description: "Transition a project task to in_progress.",                                                operation_kind: "mutate", coverage_tier: "platform", data_object_id: 217 },
  { tool_name: "block_project_task",               description: "Mark a project task blocked (upstream dependency, approval, or external input).",          operation_kind: "mutate", coverage_tier: "platform", data_object_id: 217 },
  { tool_name: "complete_project_task",            description: "Complete a project task; rolls into milestone progress.",                                  operation_kind: "mutate", coverage_tier: "platform", data_object_id: 217 },
  { tool_name: "cancel_project_task",              description: "Cancel a project task (scope change, descope, redundancy).",                               operation_kind: "mutate", coverage_tier: "platform", data_object_id: 217 },

  // RESOURCE-MGMT mutates (project_assignments 218, resource_skill_inventories 725, project_resource_allocations 726)
  { tool_name: "propose_project_assignment",             description: "Nominate a consultant for a role on a project; awaits confirmation.",             operation_kind: "mutate",  coverage_tier: "platform", data_object_id: 218 },
  { tool_name: "confirm_project_assignment",             description: "Confirm a resource on a project at a stated allocation; HCM capacity decrements.", operation_kind: "mutate",  coverage_tier: "platform", data_object_id: 218 },
  { tool_name: "release_project_assignment",             description: "Release a resource from an assignment (planned end, early release, scope change).", operation_kind: "mutate",  coverage_tier: "platform", data_object_id: 218 },
  { tool_name: "update_resource_skill_inventory",        description: "Refresh a consultant's certified skills, proficiencies and certifications.",        operation_kind: "mutate",  coverage_tier: "platform", data_object_id: 725 },
  { tool_name: "propose_project_resource_allocation",    description: "Draft a forecast resource allocation against a project window; not yet committed.", operation_kind: "mutate",  coverage_tier: "platform", data_object_id: 726 },
  { tool_name: "commit_project_resource_allocation",     description: "Commit a tentative allocation; HCM treats the named hours as booked capacity.",     operation_kind: "mutate",  coverage_tier: "platform", data_object_id: 726 },
  { tool_name: "cancel_project_resource_allocation",     description: "Cancel an allocation before commitment (forecast change, project delay or descope).", operation_kind: "mutate",  coverage_tier: "platform", data_object_id: 726 },
  { tool_name: "detect_resource_allocation_conflict",    description: "Scan committed allocations for over-booking conflicts (same resource >100% in a period).", operation_kind: "compute", coverage_tier: "platform", data_object_id: null },
  { tool_name: "match_resource_to_project_demand",       description: "Score available consultants against a project's required skills, role and availability window.", operation_kind: "compute", coverage_tier: "platform", data_object_id: null },

  // TIME-EXPENSE mutates (time_entries 162, expense_reports 210)
  { tool_name: "tag_time_entry_to_project",       description: "Attach a project / task code to a time entry so PSA can roll up to billing and utilization.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: 162 },
  { tool_name: "tag_expense_to_project",          description: "Attach a project code to an expense report so PSA can roll up to billing and project cost.",  operation_kind: "mutate", coverage_tier: "platform", data_object_id: 210 },
  { tool_name: "approve_project_time_rollup",     description: "Lock the period's project-tagged time entries for billing and cost posting.",                  operation_kind: "mutate", coverage_tier: "platform", data_object_id: 162 },

  // PROJECT-FINANCIALS mutates (project_billing_milestones 219, revenue_recognition_records 109)
  { tool_name: "create_project_billing_milestone",        description: "Create a contractual billing milestone on a project (target date and amount).",           operation_kind: "mutate", coverage_tier: "platform", data_object_id: 219 },
  { tool_name: "reach_project_billing_milestone",         description: "Mark a milestone reached: deliverable signed off by customer; becomes billable.",          operation_kind: "mutate", coverage_tier: "platform", data_object_id: 219 },
  { tool_name: "invoice_project_billing_milestone",       description: "Raise a customer invoice in ERP-FIN against a reached milestone; AR clock starts.",         operation_kind: "mutate", coverage_tier: "platform", data_object_id: 219 },
  { tool_name: "mark_project_billing_milestone_paid",     description: "Mark a milestone paid; revenue fully realised.",                                            operation_kind: "mutate", coverage_tier: "platform", data_object_id: 219 },
  { tool_name: "mark_project_billing_milestone_slipped",  description: "Flag a milestone slipped: target date passed without delivery; cash forecast adjusts.",     operation_kind: "mutate", coverage_tier: "platform", data_object_id: 219 },
  { tool_name: "write_off_project_billing_milestone",     description: "Write off a milestone that cannot be billed (contract change, dispute, scope retirement).",  operation_kind: "mutate", coverage_tier: "platform", data_object_id: 219 },
  { tool_name: "recognize_project_revenue",               description: "Post a revenue-recognition record (ASC 606 percentage-of-completion or milestone billing).", operation_kind: "mutate", coverage_tier: "platform", data_object_id: 109 },
  { tool_name: "compute_project_revenue_recognition",     description: "Compute the rev-rec amount for a project period under ASC 606 (POC or milestone).",          operation_kind: "compute", coverage_tier: "platform", data_object_id: null },
];

// --- Skills ---

type SkillSpec = {
  skill_name: string;
  domain_module_id: number;
  description: string;
  tools: Array<{ tool_name: string; requirement_level: "required" | "optional"; notes: string }>;
};

const SKILLS: SkillSpec[] = [
  {
    skill_name: "psa_project_delivery_agent",
    domain_module_id: 86, // PSA-PROJECT-DELIVERY
    description: "Agent for Project Delivery: scopes engagements, structures projects and tasks, manages SLAs and milestones, drives delivery from staffing request through customer-accepted completion.",
    tools: [
      // Queries on this module's masters
      { tool_name: "query_service_projects",           requirement_level: "required", notes: "Project catalog and lifecycle." },
      { tool_name: "query_project_tasks",              requirement_level: "required", notes: "Task plan and status." },
      // Queries from dependencies
      { tool_name: "query_crm_opportunities",          requirement_level: "required", notes: "Closed-won opportunities seed new engagements." },
      { tool_name: "query_legal_contracts",            requirement_level: "required", notes: "Signed SOWs seed project scope, billing rules and milestone definitions." },
      { tool_name: "query_employees",                  requirement_level: "required", notes: "Consultant identity for project-manager and assignee references." },
      { tool_name: "query_job_profiles",               requirement_level: "required", notes: "Skill-based scoping at project framing." },
      { tool_name: "query_work_projects",              requirement_level: "optional", notes: "Services orgs running delivery in WORK-MGMT feed completion back to PSA." },
      // Workflow gates on this module
      { tool_name: "create_service_project",           requirement_level: "required", notes: "Workflow gate: scope a new engagement." },
      { tool_name: "request_staffing_service_project", requirement_level: "required", notes: "Workflow gate: publish staffing demand." },
      { tool_name: "start_service_project",            requirement_level: "required", notes: "Workflow gate: transition to in-flight delivery." },
      { tool_name: "complete_service_project",         requirement_level: "required", notes: "Workflow gate: customer-accept and mark delivery complete." },
      { tool_name: "close_service_project",            requirement_level: "required", notes: "Workflow gate: close financials and archive." },
      { tool_name: "cancel_service_project",           requirement_level: "required", notes: "Workflow gate: cancel before completion." },
      { tool_name: "create_project_task",              requirement_level: "required", notes: "Workflow gate: extend the task plan." },
      { tool_name: "start_project_task",               requirement_level: "required", notes: "Workflow gate: pick up a task." },
      { tool_name: "block_project_task",               requirement_level: "required", notes: "Workflow gate: flag blocked." },
      { tool_name: "complete_project_task",            requirement_level: "required", notes: "Workflow gate: complete a task." },
      { tool_name: "cancel_project_task",              requirement_level: "required", notes: "Workflow gate: cancel a task." },
      // Outbound notification
      { tool_name: "notify_person",                    requirement_level: "required", notes: "Milestone signoff requests, blocked-task alerts, project status updates to PM and customer sponsor." },
      { tool_name: "notify_team",                      requirement_level: "optional", notes: "Delivery-team broadcasts for staffing requests and kickoffs." },
    ],
  },
  {
    skill_name: "psa_resource_mgmt_agent",
    domain_module_id: 87, // PSA-RESOURCE-MGMT
    description: "Agent for Resource Management: maintains the resource pool and skill inventory, matches demand to supply, manages assignments and forward-looking allocations, watches utilisation and detects conflicts.",
    tools: [
      // Queries on this module's masters
      { tool_name: "query_project_assignments",          requirement_level: "required", notes: "Active and historical staffing." },
      { tool_name: "query_resource_skill_inventories",   requirement_level: "required", notes: "Skill catalog for matching." },
      { tool_name: "query_project_resource_allocations", requirement_level: "required", notes: "Forecast capacity plan." },
      // Queries from dependencies
      { tool_name: "query_service_projects",             requirement_level: "required", notes: "Project demand and dates." },
      { tool_name: "query_employees",                    requirement_level: "required", notes: "Consultant identity and HCM bench state." },
      { tool_name: "query_job_profiles",                 requirement_level: "required", notes: "Role-based skill requirements." },
      { tool_name: "query_work_schedules",               requirement_level: "optional", notes: "Availability constraints from WFM when integrated." },
      // Workflow gates
      { tool_name: "propose_project_assignment",          requirement_level: "required", notes: "Workflow gate: nominate a resource." },
      { tool_name: "confirm_project_assignment",          requirement_level: "required", notes: "Workflow gate: firm the assignment; HCM capacity decrements." },
      { tool_name: "release_project_assignment",          requirement_level: "required", notes: "Workflow gate: roll-off; capacity returns to bench." },
      { tool_name: "update_resource_skill_inventory",     requirement_level: "required", notes: "Workflow gate: refresh skills after debrief or certification." },
      { tool_name: "propose_project_resource_allocation", requirement_level: "required", notes: "Workflow gate: draft forecast allocation." },
      { tool_name: "commit_project_resource_allocation",  requirement_level: "required", notes: "Workflow gate: commit allocation; HCM books capacity." },
      { tool_name: "cancel_project_resource_allocation",  requirement_level: "required", notes: "Workflow gate: cancel allocation before commitment." },
      // Compute helpers
      { tool_name: "detect_resource_allocation_conflict", requirement_level: "required", notes: "Sniff for over-booking conflicts; surfaces signal project_resource_allocation.conflict_detected." },
      { tool_name: "match_resource_to_project_demand",    requirement_level: "required", notes: "Score consultants against required skills and availability for an upcoming demand." },
      // Outbound
      { tool_name: "notify_person",                       requirement_level: "required", notes: "Assignment proposals, conflict alerts, release notifications to consultants and managers." },
    ],
  },
  {
    skill_name: "psa_time_expense_agent",
    domain_module_id: 88, // PSA-TIME-EXPENSE
    description: "Agent for Time and Expense reconciliation: routes project-tagged time entries and expense reports from WFM and EXPENSE into PSA for billing rollup, cost posting and utilisation analytics.",
    tools: [
      // Queries on consumed objects
      { tool_name: "query_time_entries",             requirement_level: "required", notes: "Billable-hours source from WFM." },
      { tool_name: "query_expense_reports",          requirement_level: "required", notes: "Project T&E source from EXPENSE." },
      { tool_name: "query_contingent_timesheets",    requirement_level: "optional", notes: "Contingent labor hours when VMS integration present." },
      { tool_name: "query_agency_time_entries",      requirement_level: "optional", notes: "Agency-staff hours when agency-mgmt integration present." },
      { tool_name: "query_service_projects",         requirement_level: "required", notes: "Project tagging targets." },
      { tool_name: "query_project_tasks",            requirement_level: "optional", notes: "Task-level tagging for fine-grained billing." },
      { tool_name: "query_employees",                requirement_level: "required", notes: "Submitter identity for time and expense lines." },
      // Workflow gates
      { tool_name: "tag_time_entry_to_project",      requirement_level: "required", notes: "Workflow gate: attach project / task code to a time entry." },
      { tool_name: "tag_expense_to_project",         requirement_level: "required", notes: "Workflow gate: attach project code to an expense report." },
      { tool_name: "approve_project_time_rollup",    requirement_level: "required", notes: "Workflow gate: lock the period's tagged time for billing and cost posting." },
      // Outbound
      { tool_name: "notify_person",                  requirement_level: "required", notes: "Missing-timesheet reminders and rollup-approval prompts to consultants and PMs." },
    ],
  },
  {
    skill_name: "psa_project_financials_agent",
    domain_module_id: 89, // PSA-PROJECT-FINANCIALS
    description: "Agent for Project Financials: manages billing rate cards, contractual milestones, customer-invoice triggering, ASC 606 revenue recognition, and the AR feedback loop from ERP-FIN.",
    tools: [
      // Queries on this module's masters
      { tool_name: "query_project_billing_milestones",   requirement_level: "required", notes: "Milestone catalog and lifecycle." },
      { tool_name: "query_revenue_recognition_records",  requirement_level: "required", notes: "Posted rev-rec history." },
      // Queries from dependencies
      { tool_name: "query_service_projects",             requirement_level: "required", notes: "Engagement context and budget." },
      { tool_name: "query_time_entries",                 requirement_level: "required", notes: "Billable hours feed milestone progress and POC calculations." },
      { tool_name: "query_expense_reports",              requirement_level: "required", notes: "Project T&E rollup into milestones." },
      { tool_name: "query_legal_contracts",              requirement_level: "required", notes: "Milestone definitions and billing rules from signed SOWs." },
      { tool_name: "query_invoices",                     requirement_level: "required", notes: "AR-side invoice state once raised in ERP-FIN." },
      // Workflow gates
      { tool_name: "create_project_billing_milestone",          requirement_level: "required", notes: "Workflow gate: define a contractual milestone." },
      { tool_name: "reach_project_billing_milestone",           requirement_level: "required", notes: "Workflow gate: mark milestone reached; becomes billable." },
      { tool_name: "invoice_project_billing_milestone",         requirement_level: "required", notes: "Workflow gate: raise the customer invoice in ERP-FIN." },
      { tool_name: "mark_project_billing_milestone_paid",       requirement_level: "required", notes: "Workflow gate: mark paid once AR clears." },
      { tool_name: "mark_project_billing_milestone_slipped",    requirement_level: "required", notes: "Workflow gate: flag missed target; cash forecast adjusts." },
      { tool_name: "write_off_project_billing_milestone",       requirement_level: "required", notes: "Workflow gate: write off un-billable milestone." },
      { tool_name: "recognize_project_revenue",                 requirement_level: "required", notes: "Workflow gate: post rev-rec record under ASC 606." },
      { tool_name: "compute_project_revenue_recognition",       requirement_level: "required", notes: "Compute POC or milestone rev-rec amount for a project period." },
      // Outbound
      { tool_name: "notify_person",                              requirement_level: "required", notes: "Milestone signoff prompts and slip alerts to PM, customer sponsor and finance owner." },
    ],
  },
];

// --- Upserts ---

async function upsertTools(): Promise<Map<string, number>> {
  console.log("\n[Step 1] Upsert tools");
  const newNames = NEW_TOOLS.map((t) => t.tool_name);
  const existing = (await pg(
    "GET",
    `/tools?tool_name=in.(${newNames.join(",")})&select=id,tool_name`,
  )) as Array<{ id: number; tool_name: string }>;
  const have = new Map(existing.map((r) => [r.tool_name, r.id]));
  const missing = NEW_TOOLS.filter((t) => !have.has(t.tool_name));
  if (missing.length === 0) {
    console.log("  all new tools already present");
  } else {
    const inserted = (await pg("POST", "/tools?select=id,tool_name", missing)) as Array<{
      id: number; tool_name: string;
    }>;
    console.log(`  INSERT tools: ${inserted.length}`);
    for (const r of inserted) have.set(r.tool_name, r.id);
  }
  // Build full tool_name -> id map for every name any skill references
  const allReferenced = new Set<string>();
  for (const s of SKILLS) for (const t of s.tools) allReferenced.add(t.tool_name);
  const all = (await pg(
    "GET",
    `/tools?tool_name=in.(${Array.from(allReferenced).join(",")})&select=id,tool_name`,
  )) as Array<{ id: number; tool_name: string }>;
  const map = new Map(all.map((r) => [r.tool_name, r.id]));
  const stillMissing = Array.from(allReferenced).filter((n) => !map.has(n));
  if (stillMissing.length > 0) throw new Error(`tools missing after upsert: ${stillMissing.join(", ")}`);
  return map;
}

async function upsertSkills(): Promise<Map<number, number>> {
  console.log("\n[Step 2] Upsert module-level system skills");
  const moduleIds = SKILLS.map((s) => s.domain_module_id).join(",");
  const existing = (await pg(
    "GET",
    `/skills?domain_module_id=in.(${moduleIds})&skill_type=eq.system&select=id,skill_name,domain_module_id`,
  )) as Array<{ id: number; skill_name: string; domain_module_id: number }>;
  const have = new Map(existing.map((r) => [r.domain_module_id, r.id]));
  const missing = SKILLS.filter((s) => !have.has(s.domain_module_id)).map((s) => ({
    skill_name: s.skill_name,
    skill_type: "system",
    domain_module_id: s.domain_module_id,
    domain_id: 68,
    description: s.description,
  }));
  if (missing.length === 0) {
    console.log("  all module skills already present");
  } else {
    const inserted = (await pg("POST", "/skills?select=id,skill_name,domain_module_id", missing)) as Array<{
      id: number; skill_name: string; domain_module_id: number;
    }>;
    console.log(`  INSERT skills: ${inserted.length}`);
    for (const r of inserted) have.set(r.domain_module_id, r.id);
  }
  return have;
}

async function upsertSkillTools(toolMap: Map<string, number>, skillMap: Map<number, number>): Promise<void> {
  console.log("\n[Step 3] Upsert skill_tools junction");
  for (const spec of SKILLS) {
    const skillId = skillMap.get(spec.domain_module_id)!;
    const existing = (await pg(
      "GET",
      `/skill_tools?skill_id=eq.${skillId}&select=tool_id`,
    )) as Array<{ tool_id: number }>;
    const have = new Set(existing.map((r) => r.tool_id));
    const rows = spec.tools
      .map((t) => ({
        skill_id: skillId,
        tool_id: toolMap.get(t.tool_name)!,
        requirement_level: t.requirement_level,
        notes: t.notes,
      }))
      .filter((r) => !have.has(r.tool_id));
    if (rows.length === 0) {
      console.log(`  ${spec.skill_name}: all skill_tools present`);
      continue;
    }
    const inserted = await pg("POST", "/skill_tools?select=tool_id", rows);
    console.log(`  ${spec.skill_name}: INSERT skill_tools ${Array.isArray(inserted) ? inserted.length : 0}`);
  }
}

async function retireLegacySkill(): Promise<void> {
  console.log("\n[Step 4] Retire legacy domain-level skill 94 (psa-system)");
  const legacy = (await pg(
    "GET",
    "/skills?id=eq.94&select=id,skill_name,domain_module_id",
  )) as Array<{ id: number; skill_name: string; domain_module_id: number | null }>;
  if (legacy.length === 0) {
    console.log("  legacy skill 94 already retired");
    return;
  }
  // Confirm all 4 module-level skills are in place
  const moduleSkills = (await pg(
    "GET",
    "/skills?domain_module_id=in.(86,87,88,89)&skill_type=eq.system&select=domain_module_id",
  )) as Array<{ domain_module_id: number }>;
  const covered = new Set(moduleSkills.map((r) => r.domain_module_id));
  for (const m of [86, 87, 88, 89]) {
    if (!covered.has(m)) throw new Error(`refusing to retire skill 94: module ${m} has no system skill yet`);
  }
  await pg("DELETE", "/skill_tools?skill_id=eq.94");
  console.log("  DELETE skill_tools for skill 94");
  await pg("DELETE", "/skills?id=eq.94");
  console.log("  DELETE skill 94");
}

async function verify(): Promise<void> {
  console.log("\nPost-load verification");
  const skills = (await pg(
    "GET",
    "/skills?or=(domain_id.eq.68,domain_module_id.in.(86,87,88,89))&select=id,skill_name,skill_type,domain_module_id&order=domain_module_id.asc",
  )) as Array<{ id: number; skill_name: string; skill_type: string; domain_module_id: number | null }>;
  console.log(`  skills: ${skills.length}`);
  for (const s of skills) {
    const st = (await pg(
      "GET",
      `/skill_tools?skill_id=eq.${s.id}&select=requirement_level,tools(coverage_tier,operation_kind)`,
    )) as Array<{ requirement_level: string; tools: { coverage_tier: string; operation_kind: string } }>;
    const total = st.length;
    if (total === 0) {
      console.log(`    ${s.skill_name}@${s.domain_module_id}: 0 tools`);
      continue;
    }
    const platform = st.filter((r) => r.tools.coverage_tier === "platform").length;
    const operational = st.filter((r) => ["platform", "integration"].includes(r.tools.coverage_tier)).length;
    const strict = ((platform / total) * 100).toFixed(0);
    const op = ((operational / total) * 100).toFixed(0);
    console.log(`    ${s.skill_name}@${s.domain_module_id}: ${total} tools, strict=${strict}%, operational=${op}%`);
  }
}

async function main(): Promise<void> {
  console.log("PSA Phase S loader (Rule #17)");
  const toolMap = await upsertTools();
  const skillMap = await upsertSkills();
  await upsertSkillTools(toolMap, skillMap);
  await retireLegacySkill();
  await verify();
}

await main();
