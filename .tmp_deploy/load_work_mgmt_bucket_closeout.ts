// WORK-MGMT closeout: structural completeness for the new masters and INTAKE module.
//
// The Bucket 1+2 load left these dangling:
//   - 15 lifecycle-gate states (workflow gates marked requires_permission=true) without
//     matching trigger_events
//   - 18 permissions to materialize (TASK-EXEC + GOALS-OKR new gates + full INTAKE
//     baseline triad and gates)
//   - INTAKE module has 0 role_modules entries (E1 fail on multi-module domain)
//   - INTAKE module has 0 system skill (F2 fail per Rule #17)
//
// This loader closes them all. Idempotent.

const MODULE_ID = 1001;
const DOMAIN_WM = 135;
const MOD_TASK_EXEC = 149;
const MOD_GOALS_OKR = 150;
const MOD_INTAKE = 183;

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

// Resolve data_object IDs by name.
const newDoNames = [
  "okr_key_results", "okr_check_ins",
  "work_milestones", "work_approval_steps", "work_approval_chains",
  "work_project_templates", "work_task_templates",
  "work_forms", "work_form_submissions",
];
const doRows = await get<{ id: number; data_object_name: string }>(
  `/data_objects?data_object_name=in.(${newDoNames.map((n) => `%22${n}%22`).join(",")})&select=id,data_object_name`,
);
const doId: Record<string, number> = {};
for (const r of doRows) doId[r.data_object_name] = r.id;

// ============ Phase 1: trigger_events ============

console.log("\n=== Phase 1: trigger events for workflow gates ===");

const eventSpec: Array<{ name: string; do: string; mod: number; from: string; to: string; desc: string }> = [
  { name: "work_milestone.reached", do: "work_milestones", mod: MOD_TASK_EXEC, from: "open", to: "reached",
    desc: "A work_milestone has been reached. Downstream subscribers (dashboards, reports, PSA billable-milestone recognition when WORK-MGMT runs services delivery) react to milestone closure." },
  { name: "work_milestone.missed", do: "work_milestones", mod: MOD_TASK_EXEC, from: "open", to: "missed",
    desc: "A work_milestone passed its date without being reached. Signals schedule slip; portfolio rollup and program review should re-baseline." },
  { name: "work_approval_step.approved", do: "work_approval_steps", mod: MOD_TASK_EXEC, from: "pending", to: "approved",
    desc: "A single approver has approved this step. Approval chain advances to the next step or completes." },
  { name: "work_approval_step.rejected", do: "work_approval_steps", mod: MOD_TASK_EXEC, from: "pending", to: "rejected",
    desc: "A single approver has rejected this step. Chain typically short-circuits to chain-level rejected." },
  { name: "work_approval_chain.approved", do: "work_approval_chains", mod: MOD_TASK_EXEC, from: "in_progress", to: "approved",
    desc: "All steps in the chain are approved; the gated work_item or work_project transition is now authorized." },
  { name: "work_approval_chain.rejected", do: "work_approval_chains", mod: MOD_TASK_EXEC, from: "in_progress", to: "rejected",
    desc: "At least one step rejected; the gated transition is denied and downstream subscribers should halt." },
  { name: "work_approval_chain.cancelled", do: "work_approval_chains", mod: MOD_TASK_EXEC, from: "initiated", to: "cancelled",
    desc: "The initiator or admin cancelled the approval chain before completion. Distinct from rejected (rescinded vs denied)." },
  { name: "work_project_template.published", do: "work_project_templates", mod: MOD_TASK_EXEC, from: "drafted", to: "published",
    desc: "A work_project_template is now usable for seeding new projects across the workspace." },
  { name: "work_task_template.published", do: "work_task_templates", mod: MOD_TASK_EXEC, from: "drafted", to: "published",
    desc: "A work_task_template is now usable for seeding new work_items." },
  { name: "work_form.published", do: "work_forms", mod: MOD_INTAKE, from: "drafted", to: "published",
    desc: "A work_form is now accepting submissions. Routing rules are active." },
  { name: "work_form_submission.converted", do: "work_form_submissions", mod: MOD_INTAKE, from: "triaged", to: "converted",
    desc: "A work_form_submission has been converted to a work_item in the target project. The submission record stays for audit trail; downstream work happens on the spawned work_item." },
  { name: "work_form_submission.rejected", do: "work_form_submissions", mod: MOD_INTAKE, from: "triaged", to: "rejected",
    desc: "A work_form_submission was rejected by the triage step (out of scope, duplicate, insufficient info). Submitter is typically notified." },
  { name: "okr_key_result.committed", do: "okr_key_results", mod: MOD_GOALS_OKR, from: "drafted", to: "committed",
    desc: "A key_result is committed: target value, owner, and measurement cadence are finalized. Downstream KR-to-task linking can now happen." },
  { name: "okr_key_result.achieved", do: "okr_key_results", mod: MOD_GOALS_OKR, from: "in_progress", to: "achieved",
    desc: "A key_result reached its target value. End-of-cycle scoring on the parent okr_objective uses this signal." },
  { name: "okr_key_result.missed", do: "okr_key_results", mod: MOD_GOALS_OKR, from: "in_progress", to: "missed",
    desc: "A key_result ended the cycle below target. Scoring on the parent okr_objective reflects miss." },
];

interface TriggerEvent { id: number; event_name: string; }

const existingEvents = await get<TriggerEvent>(
  `/trigger_events?event_name=in.(${eventSpec.map((e) => `%22${e.name}%22`).join(",")})&select=id,event_name`,
);
const existingEventNames = new Set(existingEvents.map((e) => e.event_name));
const newEvents = eventSpec
  .filter((e) => !existingEventNames.has(e.name))
  .map((e) => ({
    event_name: e.name,
    data_object_id: doId[e.do],
    from_state: e.from,
    to_state: e.to,
    event_category: "lifecycle",
    description: e.desc,
    domain_module_id: e.mod,
  }));
if (newEvents.length > 0) {
  const inserted = await postReturning<TriggerEvent>("/trigger_events", newEvents);
  console.log(`Inserted ${inserted.length} trigger_events`);
} else {
  console.log("All trigger events already present");
}

// ============ Phase 2: Permissions ============

console.log("\n=== Phase 2: permissions ===");

const permSpec: Array<{ name: string; tier: string; mod: number; desc: string }> = [
  // TASK-EXEC workflow gates
  { name: "work-mgmt-task-exec:reach_work_milestone", tier: "workflow-gate", mod: MOD_TASK_EXEC,
    desc: "Marks a work_milestone reached. Gates the open -> reached terminal transition." },
  { name: "work_mgmt_task_exec:miss_work_milestone".replace(/_mgmt_task_exec/, "-mgmt-task-exec"), tier: "workflow-gate", mod: MOD_TASK_EXEC,
    desc: "Marks a work_milestone missed (terminal). Distinct from reached." },
  { name: "work-mgmt-task-exec:approve_step", tier: "workflow-gate", mod: MOD_TASK_EXEC,
    desc: "Approves a single work_approval_step." },
  { name: "work-mgmt-task-exec:reject_step", tier: "workflow-gate", mod: MOD_TASK_EXEC,
    desc: "Rejects a single work_approval_step." },
  { name: "work-mgmt-task-exec:approve_chain", tier: "workflow-gate", mod: MOD_TASK_EXEC,
    desc: "Marks a work_approval_chain complete after all steps approved." },
  { name: "work-mgmt-task-exec:reject_chain", tier: "workflow-gate", mod: MOD_TASK_EXEC,
    desc: "Marks a work_approval_chain terminally rejected." },
  { name: "work-mgmt-task-exec:cancel_approval_chain", tier: "workflow-gate", mod: MOD_TASK_EXEC,
    desc: "Cancels an in-flight work_approval_chain. Distinct from rejected (rescinded vs denied)." },
  { name: "work-mgmt-task-exec:publish_project_template", tier: "workflow-gate", mod: MOD_TASK_EXEC,
    desc: "Publishes a work_project_template for workspace use." },
  { name: "work-mgmt-task-exec:publish_task_template", tier: "workflow-gate", mod: MOD_TASK_EXEC,
    desc: "Publishes a work_task_template for use." },
  // GOALS-OKR workflow gates
  { name: "work-mgmt-goals-okr:commit_okr_key_result", tier: "workflow-gate", mod: MOD_GOALS_OKR,
    desc: "Commits a key_result, locking target and cadence." },
  { name: "work-mgmt-goals-okr:achieve_okr_key_result", tier: "workflow-gate", mod: MOD_GOALS_OKR,
    desc: "Marks a key_result achieved (terminal). End-of-cycle scoring uses this." },
  { name: "work-mgmt-goals-okr:miss_okr_key_result", tier: "workflow-gate", mod: MOD_GOALS_OKR,
    desc: "Marks a key_result missed (terminal). Distinct from achieved." },
  // INTAKE baseline triad
  { name: "work-mgmt-intake:read", tier: "baseline-read", mod: MOD_INTAKE,
    desc: "Read access to work_forms and work_form_submissions." },
  { name: "work-mgmt-intake:manage", tier: "baseline-manage", mod: MOD_INTAKE,
    desc: "Author and edit work_forms, triage and convert work_form_submissions. Default IC tier on intake." },
  { name: "work-mgmt-intake:admin", tier: "baseline-admin", mod: MOD_INTAKE,
    desc: "Administer the request intake surface; expands to all workflow gates." },
  // INTAKE workflow gates
  { name: "work-mgmt-intake:publish_work_form", tier: "workflow-gate", mod: MOD_INTAKE,
    desc: "Publishes a work_form (makes it accept submissions)." },
  { name: "work-mgmt-intake:convert_form_submission", tier: "workflow-gate", mod: MOD_INTAKE,
    desc: "Converts a work_form_submission to a work_item in the target project." },
  { name: "work-mgmt-intake:reject_form_submission", tier: "workflow-gate", mod: MOD_INTAKE,
    desc: "Terminally rejects a work_form_submission at triage." },
];

// Note: one entry has a hack to keep the string literal stable; sanity check via assertion.
for (const p of permSpec) {
  if (!p.name.startsWith("work-mgmt-")) throw new Error(`Invalid permission name: ${p.name}`);
}

interface Permission { id: number; permission_name: string; }

const existingPerms = await get<Permission>(
  `/permissions?domain_module_id=in.(${MOD_TASK_EXEC},${MOD_GOALS_OKR},${MOD_INTAKE})&select=id,permission_name`,
);
const existingPermNames = new Set(existingPerms.map((p) => p.permission_name));
const newPerms = permSpec
  .filter((p) => !existingPermNames.has(p.name))
  .map((p) => ({
    permission_name: p.name,
    tier: p.tier,
    domain_module_id: p.mod,
    module_id: MODULE_ID,
    description: p.desc,
  }));
if (newPerms.length > 0) {
  const inserted = await postReturning<Permission>("/permissions", newPerms);
  console.log(`Inserted ${inserted.length} permissions`);
} else {
  console.log("All permissions already present");
}

// Refresh permission map for the bundle step.
const allPerms = await get<Permission>(
  `/permissions?domain_module_id=in.(${MOD_TASK_EXEC},${MOD_GOALS_OKR},${MOD_INTAKE})&select=id,permission_name`,
);
const permIdByName = new Map<string, number>();
for (const p of allPerms) permIdByName.set(p.permission_name, p.id);

// ============ Phase 3: INTAKE role coverage ============

console.log("\n=== Phase 3: INTAKE role coverage ===");

const roleRows = await get<{ id: number; role_code: string }>(
  `/roles?role_code=in.(%22OPERATIONS-WORK-PROGRAM-LEAD%22,%22OPERATIONS-WORK-CONTRIBUTOR%22)&select=id,role_code`,
);
const roleId = new Map<string, number>();
for (const r of roleRows) roleId.set(r.role_code, r.id);

const newRoleModules = [
  { role_id: roleId.get("OPERATIONS-WORK-PROGRAM-LEAD")!, domain_module_id: MOD_INTAKE, interaction_level: "secondary" },
  { role_id: roleId.get("OPERATIONS-WORK-CONTRIBUTOR")!, domain_module_id: MOD_INTAKE, interaction_level: "secondary" },
];

const existingRoleModules = await get<{ role_id: number; domain_module_id: number }>(
  `/role_modules?and=(role_id.in.(${Array.from(roleId.values()).join(",")}),domain_module_id.eq.${MOD_INTAKE})&select=role_id,domain_module_id`,
);
const existingRMKeys = new Set(existingRoleModules.map((r) => `${r.role_id}:${r.domain_module_id}`));
const toAddRM = newRoleModules.filter((r) => !existingRMKeys.has(`${r.role_id}:${r.domain_module_id}`));
if (toAddRM.length > 0) {
  await postReturning("/role_modules", toAddRM);
  console.log(`Inserted ${toAddRM.length} role_modules for INTAKE`);
} else {
  console.log("INTAKE role_modules already present");
}

const newRolePermissions = [
  { role_id: roleId.get("OPERATIONS-WORK-PROGRAM-LEAD")!, permission_id: permIdByName.get("work-mgmt-intake:manage")! },
  { role_id: roleId.get("OPERATIONS-WORK-CONTRIBUTOR")!, permission_id: permIdByName.get("work-mgmt-intake:read")! },
];

const existingRolePerms = await get<{ role_id: number; permission_id: number }>(
  `/role_permissions?and=(role_id.in.(${Array.from(roleId.values()).join(",")}),permission_id.in.(${newRolePermissions.map((r) => r.permission_id).join(",")}))&select=role_id,permission_id`,
);
const existingRPKeys = new Set(existingRolePerms.map((r) => `${r.role_id}:${r.permission_id}`));
const toAddRP = newRolePermissions.filter((r) => !existingRPKeys.has(`${r.role_id}:${r.permission_id}`));
if (toAddRP.length > 0) {
  await postReturning("/role_permissions", toAddRP);
  console.log(`Inserted ${toAddRP.length} role_permissions for INTAKE`);
} else {
  console.log("INTAKE role_permissions already present");
}

// ============ Phase 4: INTAKE system skill (Rule #17) ============

console.log("\n=== Phase 4: INTAKE system skill ===");

interface Skill { id: number; skill_name: string; }

const existingSkill = await get<Skill>(
  `/skills?and=(domain_module_id.eq.${MOD_INTAKE},skill_type.eq.system)&select=id,skill_name`,
);
let skillId: number;
if (existingSkill.length === 0) {
  const inserted = await postReturning<Skill>("/skills", [{
    skill_name: "work_mgmt_intake_agent",
    skill_type: "system",
    domain_id: DOMAIN_WM,
    domain_module_id: MOD_INTAKE,
    description: "Agent skill for the WORK-MGMT-INTAKE module. Reads work_forms and work_form_submissions; can author new forms, ingest submissions, and convert to work_items in the target project.",
  }]);
  skillId = inserted[0].id;
  console.log(`Inserted skill work_mgmt_intake_agent id=${skillId}`);
} else {
  skillId = existingSkill[0].id;
  console.log(`Skill work_mgmt_intake_agent already exists, id=${skillId}`);
}

// Tools for INTAKE skill.
interface Tool { id: number; tool_name: string; }

const toolSpec: Array<{ name: string; op: string; do: string | null; desc: string }> = [
  { name: "query_work_forms", op: "query", do: "work_forms",
    desc: "Read work_forms by id or filter (status, target project, owner)." },
  { name: "create_work_form", op: "mutate", do: "work_forms",
    desc: "Author a new work_form with field schema, routing rules, and target project." },
  { name: "query_work_form_submissions", op: "query", do: "work_form_submissions",
    desc: "Read work_form_submissions by id or filter (form, status, submitter, date range)." },
  { name: "convert_form_submission_to_work_item", op: "mutate", do: "work_form_submissions",
    desc: "Convert a triaged work_form_submission into a work_item in the routed target project." },
];

const existingTools = await get<Tool>(
  `/tools?tool_name=in.(${toolSpec.map((t) => `%22${t.name}%22`).join(",")})&select=id,tool_name`,
);
const existingToolNames = new Set(existingTools.map((t) => t.tool_name));
const newTools = toolSpec
  .filter((t) => !existingToolNames.has(t.name))
  .map((t) => ({
    tool_name: t.name,
    operation_kind: t.op,
    data_object_id: t.do ? doId[t.do] : null,
    coverage_tier: "platform",
    description: t.desc,
  }));
if (newTools.length > 0) {
  const inserted = await postReturning<Tool>("/tools", newTools);
  console.log(`Inserted ${inserted.length} tools`);
}
const allRelevantTools = await get<Tool>(
  `/tools?tool_name=in.(${toolSpec.map((t) => `%22${t.name}%22`).join(",")})&select=id,tool_name`,
);
const toolIdByName = new Map<string, number>();
for (const t of allRelevantTools) toolIdByName.set(t.tool_name, t.id);

// skill_tools links.
const skillToolSpec = toolSpec.map((t) => ({
  skill_id: skillId,
  tool_id: toolIdByName.get(t.name)!,
  requirement_level: "required",
}));

const existingSkillTools = await get<{ skill_id: number; tool_id: number }>(
  `/skill_tools?and=(skill_id.eq.${skillId},tool_id.in.(${Array.from(toolIdByName.values()).join(",")}))&select=skill_id,tool_id`,
);
const existingSTKeys = new Set(existingSkillTools.map((r) => `${r.skill_id}:${r.tool_id}`));
const toAddST = skillToolSpec.filter((r) => !existingSTKeys.has(`${r.skill_id}:${r.tool_id}`));
if (toAddST.length > 0) {
  await postReturning("/skill_tools", toAddST);
  console.log(`Inserted ${toAddST.length} skill_tools`);
} else {
  console.log("INTAKE skill_tools already present");
}

// ============ Verification ============

console.log("\n=== Verification ===");
const finalPerms = await get<unknown>(`/permissions?domain_module_id=in.(${MOD_TASK_EXEC},${MOD_GOALS_OKR},${MOD_INTAKE})&select=id`);
const finalSkills = await get<{ id: number; skill_name: string; domain_module_id: number | null }>(
  `/skills?domain_id=eq.${DOMAIN_WM}&skill_type=eq.system&select=id,skill_name,domain_module_id`,
);
const finalRoleModules = await get<{ domain_module_id: number }>(
  `/role_modules?domain_module_id=in.(${MOD_TASK_EXEC},${MOD_GOALS_OKR},${MOD_INTAKE})&select=domain_module_id`,
);

const rmByMod: Record<number, number> = {};
for (const r of finalRoleModules) rmByMod[r.domain_module_id] = (rmByMod[r.domain_module_id] ?? 0) + 1;

console.log(`Total permissions on WM modules: ${finalPerms.length}`);
console.log(`System skills (one per module): ${finalSkills.length}`);
for (const s of finalSkills) console.log(`  mod ${s.domain_module_id}: ${s.skill_name}`);
console.log(`role_modules per module:`);
console.log(`  TASK-EXEC (149): ${rmByMod[MOD_TASK_EXEC] ?? 0}`);
console.log(`  GOALS-OKR (150): ${rmByMod[MOD_GOALS_OKR] ?? 0}`);
console.log(`  INTAKE (183):    ${rmByMod[MOD_INTAKE] ?? 0}`);
