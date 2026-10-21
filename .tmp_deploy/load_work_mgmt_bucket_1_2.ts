// WORK-MGMT Bucket 1 + Bucket 2 (excluding CREATIVE-OPS) load.
//
// Phases:
//   1. SCOPE-CREEP cleanup — DELETE 6 DMDO consumer rows + matching legacy DDO consumer rows
//   2. INTAKE module scaffolding — new capability WORK-INTAKE-FORMS + new module WORK-MGMT-INTAKE
//   3. New data_objects (17 total)
//   4. DMDO master rows for all 17
//   5. Lifecycle states on workflow-bearing masters (~7 masters, ~30 state rows)
//   6. Aliases (B11)
//   7. Pattern flags (B4 positive re-evaluation on new + existing)
//   8. work_items cancellation gate — new trigger event, new permission, PATCH lifecycle state
//   9. Intra-domain relationships (~18 rows)
//  10. users edges (Rule #10, ~13 rows)
//  11. work_projects.has_submit_lock = true (Bucket 2 carryover)
//
// All inserts omit record_status so DB default ("new") wins per Rule #1.
// Capability dedup skipped — GOAL-MGMT (cap 25) realizes in 4 domains so it's a legit
// cross-cutting capability per SKILL.md convention, not a dup of WORK-GOALS-OKR.

const MODULE_ID = 1001;
const DOMAIN_WM = 135;
const MOD_TASK_EXEC = 149;
const MOD_GOALS_OKR = 150;
const MOD_TALENT_PERF = 51; // for awareness; not written from here

const DO_USERS = 748;
const DO_WORK_ITEMS = 243;
const DO_WORK_PROJECTS = 244;
const DO_OKR_OBJECTIVES = 245;
const DO_WORK_AUTOMATIONS = 246;

// SCOPE-CREEP DMDO targets (consumer rows on TASK-EXEC to drop).
const SCOPE_CREEP_DO_IDS = [
  678, // pull_requests
  576, // test_defects
  472, // webhook_subscriptions
  250, // process_simulation_runs
  584, // business_rules_extracted
  714, // nocode_automations
];

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
  // Write JSON to temp file and pipe via shell — Bun's stdin FileSink on Windows
  // races with semantius before the buffer flushes; the temp-file shim is the
  // canonical workaround (Rule #5).
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

async function chunk<T>(path: string, items: T[], size = 30): Promise<unknown[]> {
  const out: unknown[] = [];
  for (let i = 0; i < items.length; i += size) {
    const slice = items.slice(i, i + size);
    const res = await postReturning<unknown>(path, slice as unknown[]);
    out.push(...res);
  }
  return out;
}

// ============ Phase 1: SCOPE-CREEP cleanup ============

console.log("\n=== Phase 1: SCOPE-CREEP cleanup ===");

const creepDmdo = await get<{ id: number; data_object_id: number; data_objects: { data_object_name: string } }>(
  `/domain_module_data_objects?and=(domain_module_id.eq.${MOD_TASK_EXEC},data_object_id.in.(${SCOPE_CREEP_DO_IDS.join(",")}))&select=id,data_object_id,data_objects(data_object_name)`,
);
console.log(`Found ${creepDmdo.length} SCOPE-CREEP DMDO consumer rows to delete:`);
for (const r of creepDmdo) {
  console.log(`  DMDO ${r.id}: ${r.data_objects.data_object_name}`);
  await call("DELETE", `/domain_module_data_objects?id=eq.${r.id}`);
}

// Matching legacy DDO consumer rows.
const creepDdo = await get<{ id: number; data_object_id: number; data_objects: { data_object_name: string } }>(
  `/domain_data_objects?and=(domain_id.eq.${DOMAIN_WM},data_object_id.in.(${SCOPE_CREEP_DO_IDS.join(",")}))&select=id,data_object_id,data_objects(data_object_name)`,
);
console.log(`Found ${creepDdo.length} matching legacy DDO consumer rows to delete:`);
for (const r of creepDdo) {
  console.log(`  DDO ${r.id}: ${r.data_objects.data_object_name}`);
  await call("DELETE", `/domain_data_objects?id=eq.${r.id}`);
}

// ============ Phase 2: INTAKE module scaffolding ============

console.log("\n=== Phase 2: INTAKE module scaffolding ===");

interface Capability {
  id: number;
  capability_code: string;
  capability_name: string;
  description: string;
}

const existingCap = await get<Capability>("/capabilities?capability_code=eq.WORK-INTAKE-FORMS&select=id,capability_code");
let intakeCap: Capability;
if (existingCap.length === 0) {
  const inserted = await postReturning<Capability>("/capabilities", [
    {
      capability_code: "WORK-INTAKE-FORMS",
      capability_name: "Request Intake and Form Routing",
      description: "Structured request intake via forms that produce work_items in the target queue with field-mapping, triage rules, and conditional routing. Asana Forms, Monday Forms, ClickUp Forms, Workfront Request Queues, Smartsheet Forms.",
    },
  ]);
  intakeCap = inserted[0];
  console.log(`Inserted capability WORK-INTAKE-FORMS id=${intakeCap.id}`);
} else {
  intakeCap = (await get<Capability>("/capabilities?capability_code=eq.WORK-INTAKE-FORMS&select=id,capability_code,capability_name,description"))[0];
  console.log(`Capability WORK-INTAKE-FORMS already present, id=${intakeCap.id}`);
}

const existingCapDom = await get<{ id: number }>(`/capability_domains?and=(capability_id.eq.${intakeCap.id},domain_id.eq.${DOMAIN_WM})&select=id`);
if (existingCapDom.length === 0) {
  await postReturning("/capability_domains", [{ capability_id: intakeCap.id, domain_id: DOMAIN_WM }]);
  console.log("Inserted capability_domains link WORK-INTAKE-FORMS -> WORK-MGMT");
} else {
  console.log("capability_domains link already present");
}

interface Module {
  id: number;
  domain_module_code: string;
  domain_module_name: string;
  description: string;
  module_kind: string;
  domain_id: number;
}

const existingMod = await get<Module>("/domain_modules?domain_module_code=eq.WORK-MGMT-INTAKE&select=id,domain_module_code,domain_module_name,description,module_kind,domain_id");
let modIntake: Module;
if (existingMod.length === 0) {
  const inserted = await postReturning<Module>("/domain_modules", [
    {
      domain_module_code: "WORK-MGMT-INTAKE",
      domain_module_name: "Request Intake",
      description: "Structured request-intake surface: form definitions, form submissions, routing rules. Pre-task surface that converts a submission into a work_item in the target TASK-EXEC project. Backs the WORK-INTAKE-FORMS capability with entities. Vendor reference: Asana Forms, Monday Forms, ClickUp Forms, Workfront Request Queues, Smartsheet Forms.",
      module_kind: "full",
      domain_id: DOMAIN_WM,
    },
  ]);
  modIntake = inserted[0];
  console.log(`Inserted module WORK-MGMT-INTAKE id=${modIntake.id}`);
} else {
  modIntake = existingMod[0];
  console.log(`Module WORK-MGMT-INTAKE already present, id=${modIntake.id}`);
}

const existingModCap = await get<{ id: number }>(`/domain_module_capabilities?and=(domain_module_id.eq.${modIntake.id},capability_id.eq.${intakeCap.id})&select=id`);
if (existingModCap.length === 0) {
  await postReturning("/domain_module_capabilities", [{ domain_module_id: modIntake.id, capability_id: intakeCap.id }]);
  console.log("Inserted domain_module_capabilities link");
}

const MOD_INTAKE = modIntake.id;

// ============ Phase 3: New data_objects ============

console.log("\n=== Phase 3: New data_objects ===");

interface DataObject {
  id: number;
  data_object_name: string;
}

const proposedDOs: Array<{
  data_object_name: string;
  singular_label: string;
  plural_label: string;
  description: string;
  kind: string;
  has_personal_content?: boolean;
  has_submit_lock?: boolean;
  has_single_approver?: boolean;
}> = [
  // OKR module (mod 150)
  { data_object_name: "okr_key_results", singular_label: "Key Result", plural_label: "Key Results",
    description: "Measurable result attached to an okr_objective. The unit of scoring on OKR programs — vendors universally model KR as first-class (Asana, Monday, ClickUp, Workfront).",
    kind: "domain_owned" },
  { data_object_name: "okr_check_ins", singular_label: "OKR Check-in", plural_label: "OKR Check-ins",
    description: "Periodic status update on an okr_objective or key_result during the active cycle. Cadence-of-record (weekly/bi-weekly) for OKR programs. May discuss individual performance — flagged as personal content.",
    kind: "domain_owned", has_personal_content: true },

  // TASK-EXEC module (mod 149) — workflow substrate
  { data_object_name: "work_dependencies", singular_label: "Work Dependency", plural_label: "Work Dependencies",
    description: "Typed dependency between two work_items: predecessor/successor with type (FS finish-to-start, SS start-to-start, FF finish-to-finish, SF start-to-finish). Backs the WORK-DEPS-SCHED capability. Modeled by Asana, Monday, ClickUp, Workfront, Smartsheet.",
    kind: "domain_owned" },
  { data_object_name: "work_milestones", singular_label: "Milestone", plural_label: "Milestones",
    description: "Zero-duration gate within a work_project marking a meaningful transition. Distinct from a regular work_item by gate semantics (passed/missed). Asana, Monday, ClickUp, Workfront, Smartsheet all model.",
    kind: "domain_owned" },
  { data_object_name: "work_approval_steps", singular_label: "Approval Step", plural_label: "Approval Steps",
    description: "Single approval gate on a work_item or work_project, performed by a designated approver. Belongs to a work_approval_chain. Per-step states: pending / approved / rejected / expired.",
    kind: "domain_owned", has_single_approver: true },
  { data_object_name: "work_approval_chains", singular_label: "Approval Chain", plural_label: "Approval Chains",
    description: "Ordered or parallel set of work_approval_steps gating a work_item or work_project transition. Backs the APPROVAL-WORKFLOW capability (cross-cutting; this is the WORK-MGMT realization).",
    kind: "domain_owned" },
  { data_object_name: "work_user_workloads", singular_label: "Workload", plural_label: "Workloads",
    description: "Per-user, per-period sum of allocated effort on work_items, with capacity ceiling. Backs the WORK-CAPACITY capability. Continuous-numeric, not state-driven. May expose individual workload.",
    kind: "domain_owned", has_personal_content: true },
  { data_object_name: "work_custom_fields", singular_label: "Custom Field", plural_label: "Custom Fields",
    description: "User-defined field attached to a work_project or workspace, typed (text, number, date, select, etc.). Applies to all work_items in scope. Monday columns / Asana custom fields / ClickUp custom fields / Workfront / Smartsheet column types.",
    kind: "domain_owned" },
  { data_object_name: "work_custom_field_values", singular_label: "Custom Field Value", plural_label: "Custom Field Values",
    description: "Per-work_item value for a work_custom_field. Junction-style master: tuple (work_item, work_custom_field, value). Monday column_values, Asana custom_field_values, Smartsheet cells.",
    kind: "domain_owned" },
  { data_object_name: "work_sections", singular_label: "Section", plural_label: "Sections",
    description: "Container within a work_project that groups work_items for board/list views. Asana sections / Monday groups / ClickUp statuses-as-columns / Workfront statuses / Smartsheet parent rows.",
    kind: "domain_owned" },
  { data_object_name: "work_project_templates", singular_label: "Project Template", plural_label: "Project Templates",
    description: "Reusable work_project blueprint with seeded sections, items, custom fields, and automations. Universal across all 5 flagships; central to enterprise rollout patterns.",
    kind: "domain_owned" },
  { data_object_name: "work_task_templates", singular_label: "Task Template", plural_label: "Task Templates",
    description: "Reusable work_item blueprint with seeded assignee role, due-date offset, subtasks, and custom field defaults. Used for recurring or templated work creation.",
    kind: "domain_owned" },
  { data_object_name: "work_tags", singular_label: "Tag", plural_label: "Tags",
    description: "Free-form label attached to work_items for cross-cutting categorization (priority, theme, status). Many-to-many to work_items via work_item_tags.",
    kind: "domain_owned" },
  { data_object_name: "work_item_tags", singular_label: "Item Tag Assignment", plural_label: "Item Tag Assignments",
    description: "Junction master between work_items and work_tags. Carries no qualifier of its own; existence asserts the tag is applied.",
    kind: "domain_owned" },
  { data_object_name: "work_item_comments", singular_label: "Item Comment", plural_label: "Item Comments",
    description: "Threaded comment on a work_item. Asana stories / Monday updates / ClickUp comments / Workfront updates / Smartsheet conversations. May include personal or sensitive content.",
    kind: "domain_owned", has_personal_content: true },
  { data_object_name: "work_item_attachments", singular_label: "Item Attachment", plural_label: "Item Attachments",
    description: "File or external link attached to a work_item. May reference embedded content or platform-managed storage.",
    kind: "domain_owned" },

  // INTAKE module (new)
  { data_object_name: "work_forms", singular_label: "Form", plural_label: "Forms",
    description: "Structured intake form definition: schema (fields, validation), target project, routing rules. Asana Forms, Monday Forms, ClickUp Forms, Workfront Request Queues, Smartsheet Forms.",
    kind: "domain_owned" },
  { data_object_name: "work_form_submissions", singular_label: "Form Submission", plural_label: "Form Submissions",
    description: "Submitted instance of a work_form. Carries field values, submitter, timestamp. Converts to a work_item via routing rules. May contain personal content from form fields (requester name/email).",
    kind: "domain_owned", has_personal_content: true },
];

// PostgREST bulk insert requires uniform column shape. Normalize defaults.
for (const d of proposedDOs) {
  d.has_personal_content = d.has_personal_content ?? false;
  d.has_submit_lock = d.has_submit_lock ?? false;
  d.has_single_approver = d.has_single_approver ?? false;
}
const proposedNames = proposedDOs.map((p) => p.data_object_name);
const existingDOs = await get<DataObject>(`/data_objects?data_object_name=in.(${proposedNames.map((n) => `%22${n}%22`).join(",")})&select=id,data_object_name`);
const existingNames = new Set(existingDOs.map((d) => d.data_object_name));
const newDOs = proposedDOs.filter((d) => !existingNames.has(d.data_object_name));
let insertedDOs: DataObject[] = [];
if (newDOs.length > 0) {
  insertedDOs = (await chunk("/data_objects", newDOs, 20)) as DataObject[];
  console.log(`Inserted ${insertedDOs.length} data_objects`);
} else {
  console.log("All proposed data_objects already exist");
}

const doByName = new Map<string, number>();
for (const d of [...existingDOs, ...insertedDOs]) doByName.set(d.data_object_name, d.id);

// ============ Phase 4: DMDO master rows ============

console.log("\n=== Phase 4: DMDO masters ===");

const dmdoSpec: Array<[string, number]> = [
  // [data_object_name, domain_module_id]
  ["okr_key_results", MOD_GOALS_OKR],
  ["okr_check_ins", MOD_GOALS_OKR],
  ["work_dependencies", MOD_TASK_EXEC],
  ["work_milestones", MOD_TASK_EXEC],
  ["work_approval_steps", MOD_TASK_EXEC],
  ["work_approval_chains", MOD_TASK_EXEC],
  ["work_user_workloads", MOD_TASK_EXEC],
  ["work_custom_fields", MOD_TASK_EXEC],
  ["work_custom_field_values", MOD_TASK_EXEC],
  ["work_sections", MOD_TASK_EXEC],
  ["work_project_templates", MOD_TASK_EXEC],
  ["work_task_templates", MOD_TASK_EXEC],
  ["work_tags", MOD_TASK_EXEC],
  ["work_item_tags", MOD_TASK_EXEC],
  ["work_item_comments", MOD_TASK_EXEC],
  ["work_item_attachments", MOD_TASK_EXEC],
  ["work_forms", MOD_INTAKE],
  ["work_form_submissions", MOD_INTAKE],
];

const dmdoDoIds = dmdoSpec.map(([n]) => doByName.get(n)!);
const existingDmdo = await get<{ data_object_id: number; domain_module_id: number }>(
  `/domain_module_data_objects?and=(data_object_id.in.(${dmdoDoIds.join(",")}),role.eq.master)&select=data_object_id,domain_module_id`,
);
const existingDmdoKeys = new Set(existingDmdo.map((r) => `${r.data_object_id}:${r.domain_module_id}`));
const newDmdo = dmdoSpec
  .filter(([n, mod]) => !existingDmdoKeys.has(`${doByName.get(n)}:${mod}`))
  .map(([n, mod]) => ({
    data_object_id: doByName.get(n)!,
    domain_module_id: mod,
    role: "master",
    necessity: "required",
  }));
if (newDmdo.length > 0) {
  await chunk("/domain_module_data_objects", newDmdo, 20);
  console.log(`Inserted ${newDmdo.length} DMDO master rows`);
} else {
  console.log("All DMDO master rows already exist");
}

// ============ Phase 5: Lifecycle states ============

console.log("\n=== Phase 5: Lifecycle states ===");

const lifecycleSpec: Array<{
  data_object_name: string;
  domain_module_id: number;
  states: Array<{ name: string; order: number; initial?: boolean; terminal?: boolean; gate?: boolean; verb?: string }>;
}> = [
  {
    data_object_name: "okr_key_results", domain_module_id: MOD_GOALS_OKR,
    states: [
      { name: "drafted", order: 1, initial: true },
      { name: "committed", order: 2, gate: true, verb: "commit_okr_key_result" },
      { name: "in_progress", order: 3 },
      { name: "at_risk", order: 4 },
      { name: "achieved", order: 5, terminal: true, gate: true, verb: "achieve_okr_key_result" },
      { name: "missed", order: 6, terminal: true, gate: true, verb: "miss_okr_key_result" },
    ],
  },
  {
    data_object_name: "work_milestones", domain_module_id: MOD_TASK_EXEC,
    states: [
      { name: "open", order: 1, initial: true },
      { name: "reached", order: 2, terminal: true, gate: true, verb: "reach_work_milestone" },
      { name: "missed", order: 3, terminal: true, gate: true, verb: "miss_work_milestone" },
    ],
  },
  {
    data_object_name: "work_approval_steps", domain_module_id: MOD_TASK_EXEC,
    states: [
      { name: "pending", order: 1, initial: true },
      { name: "approved", order: 2, terminal: true, gate: true, verb: "approve_step" },
      { name: "rejected", order: 3, terminal: true, gate: true, verb: "reject_step" },
      { name: "expired", order: 4, terminal: true },
    ],
  },
  {
    data_object_name: "work_approval_chains", domain_module_id: MOD_TASK_EXEC,
    states: [
      { name: "initiated", order: 1, initial: true },
      { name: "in_progress", order: 2 },
      { name: "approved", order: 3, terminal: true, gate: true, verb: "approve_chain" },
      { name: "rejected", order: 4, terminal: true, gate: true, verb: "reject_chain" },
      { name: "cancelled", order: 5, terminal: true, gate: true, verb: "cancel_approval_chain" },
    ],
  },
  {
    data_object_name: "work_project_templates", domain_module_id: MOD_TASK_EXEC,
    states: [
      { name: "drafted", order: 1, initial: true },
      { name: "published", order: 2, gate: true, verb: "publish_project_template" },
      { name: "archived", order: 3, terminal: true },
    ],
  },
  {
    data_object_name: "work_task_templates", domain_module_id: MOD_TASK_EXEC,
    states: [
      { name: "drafted", order: 1, initial: true },
      { name: "published", order: 2, gate: true, verb: "publish_task_template" },
      { name: "archived", order: 3, terminal: true },
    ],
  },
  {
    data_object_name: "work_forms", domain_module_id: MOD_INTAKE,
    states: [
      { name: "drafted", order: 1, initial: true },
      { name: "published", order: 2, gate: true, verb: "publish_work_form" },
      { name: "archived", order: 3, terminal: true },
    ],
  },
  {
    data_object_name: "work_form_submissions", domain_module_id: MOD_INTAKE,
    states: [
      { name: "submitted", order: 1, initial: true },
      { name: "triaged", order: 2 },
      { name: "converted", order: 3, terminal: true, gate: true, verb: "convert_form_submission" },
      { name: "rejected", order: 4, terminal: true, gate: true, verb: "reject_form_submission" },
    ],
  },
];

const lifecycleRows: Array<Record<string, unknown>> = [];
for (const spec of lifecycleSpec) {
  const doId = doByName.get(spec.data_object_name)!;
  for (const s of spec.states) {
    lifecycleRows.push({
      data_object_id: doId,
      state_name: s.name,
      state_order: s.order,
      is_initial: s.initial ?? false,
      is_terminal: s.terminal ?? false,
      requires_permission: s.gate ?? false,
      permission_verb_override: s.verb ?? "",
      domain_module_id: spec.domain_module_id,
    });
  }
}

// Idempotent: skip rows that already exist.
const lifecycleDoIds = lifecycleSpec.map((s) => doByName.get(s.data_object_name)!);
const existingLifecycle = await get<{ data_object_id: number; state_name: string; domain_module_id: number }>(
  `/data_object_lifecycle_states?data_object_id=in.(${lifecycleDoIds.join(",")})&select=data_object_id,state_name,domain_module_id`,
);
const lcKey = (r: { data_object_id: number; state_name: string; domain_module_id: number | null }) =>
  `${r.data_object_id}:${r.state_name}:${r.domain_module_id ?? "null"}`;
const existingLcKeys = new Set(existingLifecycle.map(lcKey));
const newLifecycle = lifecycleRows.filter((r) => !existingLcKeys.has(lcKey(r as { data_object_id: number; state_name: string; domain_module_id: number | null })));
if (newLifecycle.length > 0) {
  await chunk("/data_object_lifecycle_states", newLifecycle, 25);
  console.log(`Inserted ${newLifecycle.length} lifecycle state rows`);
} else {
  console.log("All lifecycle states already exist");
}

// ============ Phase 6: Aliases ============

console.log("\n=== Phase 6: Aliases ===");

const aliasSpec: Array<[string, string[]]> = [
  ["okr_key_results", ["KR", "key_result", "subgoal", "target"]],
  ["okr_check_ins", ["check_in", "status_check_in", "goal_update"]],
  ["work_dependencies", ["dependency", "task_dependency", "predecessor", "successor"]],
  ["work_milestones", ["milestone", "gate"]],
  ["work_approval_steps", ["approval_step", "approval_node"]],
  ["work_approval_chains", ["approval_chain", "approval_workflow", "approval_route"]],
  ["work_user_workloads", ["workload", "capacity_allocation"]],
  ["work_custom_fields", ["custom_field", "column", "column_type"]],
  ["work_custom_field_values", ["custom_value", "column_value", "cell"]],
  ["work_sections", ["section", "group", "status_column"]],
  ["work_project_templates", ["project_template", "template"]],
  ["work_task_templates", ["task_template"]],
  ["work_tags", ["tag", "label"]],
  ["work_item_tags", ["tag_assignment"]],
  ["work_item_comments", ["comment", "story", "update", "conversation"]],
  ["work_item_attachments", ["attachment", "file", "document"]],
  ["work_forms", ["form", "request_queue", "intake_form"]],
  ["work_form_submissions", ["form_submission", "request", "submission"]],
];

const aliasRows: Array<{ data_object_id: number; alias_name: string; alias_type: string }> = [];
for (const [name, aliases] of aliasSpec) {
  const doId = doByName.get(name)!;
  for (const a of aliases) aliasRows.push({ data_object_id: doId, alias_name: a, alias_type: "synonym" });
}

const aliasDoIds = aliasSpec.map(([n]) => doByName.get(n)!);
const existingAliases = await get<{ data_object_id: number; alias_name: string }>(
  `/data_object_aliases?data_object_id=in.(${aliasDoIds.join(",")})&select=data_object_id,alias_name`,
);
const aliasKey = (r: { data_object_id: number; alias_name: string }) => `${r.data_object_id}:${r.alias_name}`;
const existingAliasKeys = new Set(existingAliases.map(aliasKey));
const newAliases = aliasRows.filter((r) => !existingAliasKeys.has(aliasKey(r)));
if (newAliases.length > 0) {
  await chunk("/data_object_aliases", newAliases, 25);
  console.log(`Inserted ${newAliases.length} aliases`);
} else {
  console.log("All aliases already exist");
}

// ============ Phase 7: Pattern flags PATCH ============
// (Already set on new data_objects at insert via has_personal_content / has_submit_lock / has_single_approver.
// Bucket 2 carryover: PATCH work_projects.has_submit_lock=true.)

console.log("\n=== Phase 7: Pattern flag PATCH on work_projects ===");
await call("PATCH", "/data_objects?id=eq." + DO_WORK_PROJECTS, { has_submit_lock: true });
console.log("PATCH work_projects.has_submit_lock=true");

// ============ Phase 8: work_items cancellation gate ============

console.log("\n=== Phase 8: work_items cancellation gate ===");

// 8a. New trigger event work_item.cancelled.
const existingCancelledEvent = await get<{ id: number }>("/trigger_events?event_name=eq.work_item.cancelled&select=id");
let cancelledEventId: number;
if (existingCancelledEvent.length === 0) {
  const inserted = await postReturning<{ id: number }>("/trigger_events", [{
    event_name: "work_item.cancelled",
    data_object_id: DO_WORK_ITEMS,
    from_state: "",
    to_state: "cancelled",
    event_category: "lifecycle",
    description: "A work_item is cancelled. Distinct terminal from done (cancelled signals rescinded scope; done signals completed scope). Gated by cancel_work_item permission so the cancellation is intentional and traceable.",
    domain_module_id: MOD_TASK_EXEC,
  }]);
  cancelledEventId = inserted[0].id;
  console.log(`Inserted trigger_event work_item.cancelled id=${cancelledEventId}`);
} else {
  cancelledEventId = existingCancelledEvent[0].id;
  console.log(`trigger_event work_item.cancelled already exists, id=${cancelledEventId}`);
}

// 8b. New permission work-mgmt-task-exec:cancel_work_item.
const existingCancelPerm = await get<{ id: number }>("/permissions?permission_name=eq.work-mgmt-task-exec:cancel_work_item&select=id");
if (existingCancelPerm.length === 0) {
  await postReturning("/permissions", [{
    permission_name: "work-mgmt-task-exec:cancel_work_item",
    tier: "workflow-gate",
    domain_module_id: MOD_TASK_EXEC,
    module_id: MODULE_ID,
    description: "Cancels a work_item before completion (distinct terminal from done). Gates the * -> cancelled transition; lower tiers can mark done but not rescind scope.",
  }]);
  console.log("Inserted permission work-mgmt-task-exec:cancel_work_item");
} else {
  console.log("Permission work-mgmt-task-exec:cancel_work_item already exists");
}

// 8c. PATCH existing work_items.cancelled lifecycle state -> requires_permission=true.
await call("PATCH", `/data_object_lifecycle_states?and=(data_object_id.eq.${DO_WORK_ITEMS},state_name.eq.cancelled,domain_module_id.eq.${MOD_TASK_EXEC})`, {
  requires_permission: true,
  permission_verb_override: "cancel_work_item",
});
console.log("PATCH work_items.cancelled requires_permission=true");

// ============ Phase 9: Intra-domain relationships ============

console.log("\n=== Phase 9: Intra-domain relationships ===");

const RT_ONE_TO_MANY = "one_to_many";
const RT_MANY_TO_MANY = "many_to_many";
const RK_REFERENCE = "reference";
const RK_COMPOSITION = "composition";
const RK_ASSOCIATION = "association";

const relSpec: Array<{
  source: string; verb: string; inverse: string; target: string;
  type: string; kind: string; required: boolean; owner: "source" | "target";
}> = [
  // OKR module
  { source: "okr_key_results", verb: "belongs_to", inverse: "has_key_results", target: "okr_objectives", type: RT_ONE_TO_MANY, kind: RK_COMPOSITION, required: true, owner: "target" },
  { source: "okr_check_ins", verb: "belongs_to", inverse: "has_check_ins", target: "okr_objectives", type: RT_ONE_TO_MANY, kind: RK_COMPOSITION, required: true, owner: "target" },
  { source: "okr_check_ins", verb: "references", inverse: "referenced_by_check_ins", target: "okr_key_results", type: RT_ONE_TO_MANY, kind: RK_REFERENCE, required: false, owner: "target" },
  // TASK-EXEC module
  { source: "work_dependencies", verb: "blocks", inverse: "blocked_by", target: "work_items", type: RT_MANY_TO_MANY, kind: RK_ASSOCIATION, required: true, owner: "source" },
  { source: "work_milestones", verb: "belongs_to", inverse: "has_milestones", target: "work_projects", type: RT_ONE_TO_MANY, kind: RK_COMPOSITION, required: true, owner: "target" },
  { source: "work_approval_steps", verb: "belongs_to", inverse: "has_steps", target: "work_approval_chains", type: RT_ONE_TO_MANY, kind: RK_COMPOSITION, required: true, owner: "target" },
  { source: "work_approval_chains", verb: "gates", inverse: "gated_by", target: "work_items", type: RT_MANY_TO_MANY, kind: RK_REFERENCE, required: false, owner: "source" },
  { source: "work_approval_chains", verb: "gates_project", inverse: "gated_by_chain", target: "work_projects", type: RT_MANY_TO_MANY, kind: RK_REFERENCE, required: false, owner: "source" },
  { source: "work_user_workloads", verb: "rolls_up", inverse: "feeds_workload", target: "work_items", type: RT_MANY_TO_MANY, kind: RK_REFERENCE, required: true, owner: "source" },
  { source: "work_custom_fields", verb: "applies_to", inverse: "has_custom_fields", target: "work_projects", type: RT_ONE_TO_MANY, kind: RK_REFERENCE, required: false, owner: "source" },
  { source: "work_custom_field_values", verb: "valued_for", inverse: "has_values", target: "work_custom_fields", type: RT_ONE_TO_MANY, kind: RK_COMPOSITION, required: true, owner: "target" },
  { source: "work_custom_field_values", verb: "set_on", inverse: "has_field_values", target: "work_items", type: RT_ONE_TO_MANY, kind: RK_COMPOSITION, required: true, owner: "target" },
  { source: "work_sections", verb: "belongs_to", inverse: "has_sections", target: "work_projects", type: RT_ONE_TO_MANY, kind: RK_COMPOSITION, required: true, owner: "target" },
  { source: "work_items", verb: "placed_in", inverse: "holds_items", target: "work_sections", type: RT_ONE_TO_MANY, kind: RK_REFERENCE, required: false, owner: "target" },
  { source: "work_project_templates", verb: "seeds", inverse: "derived_from_template", target: "work_projects", type: RT_ONE_TO_MANY, kind: RK_REFERENCE, required: false, owner: "source" },
  { source: "work_task_templates", verb: "seeds_item", inverse: "derived_from_task_template", target: "work_items", type: RT_ONE_TO_MANY, kind: RK_REFERENCE, required: false, owner: "source" },
  { source: "work_item_tags", verb: "references_tag", inverse: "applied_via", target: "work_tags", type: RT_ONE_TO_MANY, kind: RK_COMPOSITION, required: true, owner: "target" },
  { source: "work_item_tags", verb: "tagged_on", inverse: "has_tag_assignments", target: "work_items", type: RT_ONE_TO_MANY, kind: RK_COMPOSITION, required: true, owner: "target" },
  { source: "work_item_comments", verb: "belongs_to", inverse: "has_comments", target: "work_items", type: RT_ONE_TO_MANY, kind: RK_COMPOSITION, required: true, owner: "target" },
  { source: "work_item_attachments", verb: "belongs_to", inverse: "has_attachments", target: "work_items", type: RT_ONE_TO_MANY, kind: RK_COMPOSITION, required: true, owner: "target" },
  // INTAKE module
  { source: "work_form_submissions", verb: "submitted_against", inverse: "has_submissions", target: "work_forms", type: RT_ONE_TO_MANY, kind: RK_COMPOSITION, required: true, owner: "target" },
  { source: "work_form_submissions", verb: "converts_to", inverse: "spawned_from_submission", target: "work_items", type: RT_ONE_TO_MANY, kind: RK_REFERENCE, required: false, owner: "source" },
  { source: "work_forms", verb: "routes_to", inverse: "intake_form_for", target: "work_projects", type: RT_ONE_TO_MANY, kind: RK_REFERENCE, required: false, owner: "source" },
];

// Combined lookup: new data_objects (doByName) + existing WORK-MGMT masters + users.
const existingLookup: Record<string, number> = {
  work_items: DO_WORK_ITEMS,
  work_projects: DO_WORK_PROJECTS,
  okr_objectives: DO_OKR_OBJECTIVES,
  work_automations: DO_WORK_AUTOMATIONS,
  users: DO_USERS,
};
const resolveDO = (name: string): number => {
  const id = doByName.get(name) ?? existingLookup[name];
  if (id === undefined) throw new Error(`Cannot resolve data_object: ${name}`);
  return id;
};
const relRows = relSpec.map((r) => ({
  data_object_id: resolveDO(r.source),
  relationship_verb: r.verb,
  inverse_verb: r.inverse,
  related_data_object_id: resolveDO(r.target),
  relationship_type: r.type,
  relationship_kind: r.kind,
  is_required: r.required,
  owner_side: r.owner,
}));

const relDoIds = Array.from(new Set([...relRows.map((r) => r.data_object_id), ...relRows.map((r) => r.related_data_object_id)]));
const existingRels = await get<{ data_object_id: number; relationship_verb: string; related_data_object_id: number }>(
  `/data_object_relationships?and=(data_object_id.in.(${relDoIds.join(",")}),related_data_object_id.in.(${relDoIds.join(",")}))&select=data_object_id,relationship_verb,related_data_object_id`,
);
const relKey = (r: { data_object_id: number; relationship_verb: string; related_data_object_id: number }) =>
  `${r.data_object_id}:${r.relationship_verb}:${r.related_data_object_id}`;
const existingRelKeys = new Set(existingRels.map(relKey));
const newRels = relRows.filter((r) => !existingRelKeys.has(relKey(r)));
if (newRels.length > 0) {
  await chunk("/data_object_relationships", newRels, 20);
  console.log(`Inserted ${newRels.length} intra-domain relationships`);
} else {
  console.log("All intra-domain relationships already exist");
}

// ============ Phase 10: users edges (Rule #10) ============

console.log("\n=== Phase 10: users edges ===");

const usersEdgeSpec: Array<[string, string, string]> = [
  // [target_data_object, verb (users -> target), inverse_verb (target -> users)]
  ["okr_key_results", "owns_key_results", "is_owned_by"],
  ["okr_check_ins", "authored_check_ins", "is_authored_by"],
  ["work_milestones", "owns_milestones", "is_owned_by"],
  ["work_approval_steps", "approves_steps", "is_approver_for"],
  ["work_approval_chains", "initiated_chains", "is_initiated_by"],
  ["work_custom_fields", "created_custom_fields", "is_created_by"],
  ["work_sections", "created_sections", "is_created_by"],
  ["work_project_templates", "authored_project_templates", "is_authored_by"],
  ["work_task_templates", "authored_task_templates", "is_authored_by"],
  ["work_item_comments", "authored_comments", "is_authored_by"],
  ["work_item_attachments", "uploaded_attachments", "is_uploaded_by"],
  ["work_forms", "created_forms", "is_created_by"],
  ["work_form_submissions", "submitted_forms", "is_submitted_by"],
];

const usersEdgeRows = usersEdgeSpec.map(([name, verb, inv]) => ({
  data_object_id: DO_USERS,
  relationship_verb: verb,
  inverse_verb: inv,
  related_data_object_id: doByName.get(name)!,
  relationship_type: RT_ONE_TO_MANY,
  relationship_kind: RK_REFERENCE,
  is_required: false,
  owner_side: "source",
}));

const existingUsersEdges = await get<{ data_object_id: number; relationship_verb: string; related_data_object_id: number }>(
  `/data_object_relationships?and=(data_object_id.eq.${DO_USERS},related_data_object_id.in.(${usersEdgeRows.map((r) => r.related_data_object_id).join(",")}))&select=data_object_id,relationship_verb,related_data_object_id`,
);
const existingUEKeys = new Set(existingUsersEdges.map(relKey));
const newUserEdges = usersEdgeRows.filter((r) => !existingUEKeys.has(relKey(r)));
if (newUserEdges.length > 0) {
  await chunk("/data_object_relationships", newUserEdges, 20);
  console.log(`Inserted ${newUserEdges.length} users edges`);
} else {
  console.log("All users edges already exist");
}

// ============ Verification summary ============

console.log("\n=== Verification ===");

const finalDoCount = await get<unknown>(`/data_objects?data_object_name=in.(${proposedNames.map((n) => `%22${n}%22`).join(",")})&select=id`);
const finalDmdoCount = await get<unknown>(`/domain_module_data_objects?and=(domain_module_id.in.(${MOD_TASK_EXEC},${MOD_GOALS_OKR},${MOD_INTAKE}),role.eq.master)&select=id`);
const finalCapDoms = await get<unknown>(`/capability_domains?domain_id.eq.${DOMAIN_WM}&select=id`);
const finalModules = await get<unknown>(`/domain_modules?domain_id=eq.${DOMAIN_WM}&select=id,domain_module_code`);
const finalLifecycleCount = await get<unknown>(`/data_object_lifecycle_states?data_object_id=in.(${dmdoDoIds.join(",")})&select=id`);
const finalRels = await get<unknown>(`/data_object_relationships?or=(data_object_id.in.(${relDoIds.join(",")}),related_data_object_id.in.(${relDoIds.join(",")}))&select=id`);

console.log(`new data_objects:       ${finalDoCount.length}/17`);
console.log(`master DMDO (WM mods):  ${finalDmdoCount.length} (was 4 work_items+projects+okrs+autos + 17 new = 21 expected after dedupe of work_items embedded_master)`);
console.log(`modules under WM:       ${finalModules.length}`);
console.log(`lifecycle states (new): ${finalLifecycleCount.length}`);
console.log(`relationships:          ${finalRels.length}`);
console.log("\nModules:");
for (const m of finalModules as Array<{ domain_module_code: string }>) console.log(`  ${m.domain_module_code}`);
