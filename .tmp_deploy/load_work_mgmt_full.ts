#!/usr/bin/env bun
// Consolidated WORK-MGMT load (2026-05-27):
//  1. Strip vendor names + em-dashes from domains.description / business_logic
//  2. Insert 2 full modules (WORK-MGMT-TASK-EXEC, WORK-MGMT-GOALS-OKR)
//  3. Link 9 domain_module_capabilities
//  4. Insert 5 domain_module_data_objects (3 TASK-EXEC + 2 GOALS-OKR)
//  5. Insert lifecycle states for work_items / work_projects / work_automations / okr_objectives (GOALS-OKR scope)
//  6. Insert 5 missing mutate tools
//  7. Insert 2 system skills (one per module)
//  8. Link skill_tools
//  9. B10b backfill on the 25 WORK-MGMT handoffs
// 10. F1 cleanup: delete legacy work-mgmt-system skill (id=122) + its skill_tools
//
// Idempotent. Re-runnable. No notes (Rule #15). No vendor names (Rule #18). No em-dashes (CLAUDE.md).

const SEMANTIUS = "semantius";

async function api(path: string, method: "GET" | "POST" | "PATCH" | "DELETE" = "GET", body?: any) {
  const args: any = { method, path };
  if (body !== undefined) args.body = body;
  const payload = JSON.stringify(args);
  const proc = Bun.spawn([SEMANTIUS, "call", "crud", "postgrestRequest"], {
    stdin: new TextEncoder().encode(payload),
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const errOut = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error(`semantius failed: ${errOut}\n${out}`);
  return out.trim() ? JSON.parse(out) : null;
}

async function insertMissing<T extends Record<string, any>>(
  table: string,
  rows: T[],
  naturalKeyCol: keyof T,
  existingFilter: string,
): Promise<void> {
  if (rows.length === 0) return;
  const existing: any[] = await api(`/${table}?${existingFilter}`);
  const have = new Set(existing.map((r) => r[naturalKeyCol as string]));
  const missing = rows.filter((r) => !have.has(r[naturalKeyCol as string]));
  if (missing.length === 0) {
    console.log(`  ${table}: all ${rows.length} rows already present`);
    return;
  }
  console.log(`  ${table}: inserting ${missing.length} of ${rows.length} rows`);
  // chunk to avoid Windows command-line limits
  const CHUNK = 50;
  for (let i = 0; i < missing.length; i += CHUNK) {
    await api(`/${table}`, "POST", missing.slice(i, i + CHUNK));
  }
}

// ============================================================
// STEP 1: PATCH WORK-MGMT domain row (strip vendor names + em-dashes)
// ============================================================
console.log("Step 1: PATCH WORK-MGMT domain description + business_logic");

const CLEAN_DESCRIPTION =
  "Task, project, and workflow management for cross-functional work: assignments with owners and due dates, dependencies, statuses, dashboards, automations, and goal/OKR tracking. Bought by PMOs, BizOps, marketing, and any team running structured work that isn't engineering-specific. Distinct from SPM (top-down portfolio investment decision, CIO/EPMO buyer), from PSA (services billing/utilization for revenue-generating projects), and from dedicated software-engineering sprint tooling (developer-specific dev workflow).";

const CLEAN_BUSINESS_LOGIC =
  "Cross-project resource leveling and capacity calculations; critical-path and dependency scheduling on linked tasks; OKR-to-task progress rollup with weighted contribution; recurring-task generation rules; AI-assisted task summarization, status drafting, and risk flagging.";

await api("/domains?id=eq.135", "PATCH", {
  description: CLEAN_DESCRIPTION,
  business_logic: CLEAN_BUSINESS_LOGIC,
});
console.log("  done");

// ============================================================
// STEP 2: Insert 2 full modules
// ============================================================
console.log("Step 2: Insert WORK-MGMT modules");

const moduleRows = [
  {
    domain_module_code: "WORK-MGMT-TASK-EXEC",
    domain_module_name: "Task and Project Execution",
    domain_id: 135,
    module_kind: "full",
    description:
      "Cross-functional task and project execution surface: work items with owners, due dates, dependencies, statuses, and assignments; project containers with timelines, dashboards, and board views; user-authored automation rules that fire on item state changes. The deployable substrate every team-based work-management product orbits.",
  },
  {
    domain_module_code: "WORK-MGMT-GOALS-OKR",
    domain_module_name: "Team-Execution Goals and OKRs",
    domain_id: 135,
    module_kind: "full",
    description:
      "Team-execution OKR tracking surface: objectives with key results that link to work items for automatic progress rollup, weekly check-in cadences, scoring, and closure. Deploys alongside the task-execution module for full integration, or standalone with a thin embedded work-item shell for KR linking.",
  },
];

await insertMissing("domain_modules", moduleRows, "domain_module_code", "domain_id=eq.135");

const modules: any[] = await api("/domain_modules?domain_id=eq.135&select=id,domain_module_code");
const moduleIdByCode = new Map<string, number>(modules.map((m: any) => [m.domain_module_code, m.id]));
const TASK_EXEC_ID = moduleIdByCode.get("WORK-MGMT-TASK-EXEC")!;
const GOALS_OKR_ID = moduleIdByCode.get("WORK-MGMT-GOALS-OKR")!;
console.log(`  TASK-EXEC id=${TASK_EXEC_ID}, GOALS-OKR id=${GOALS_OKR_ID}`);

// ============================================================
// STEP 3: domain_module_capabilities (9 rows)
// ============================================================
console.log("Step 3: Link capabilities to modules");

const dmcRows = [
  // TASK-EXEC (7 capabilities)
  { domain_module_id: TASK_EXEC_ID, capability_id: 326 }, // WORK-TASK-MGMT
  { domain_module_id: TASK_EXEC_ID, capability_id: 327 }, // WORK-DEPS-SCHED
  { domain_module_id: TASK_EXEC_ID, capability_id: 328 }, // WORK-CAPACITY
  { domain_module_id: TASK_EXEC_ID, capability_id: 330 }, // WORK-WORKFLOW-AUTO
  { domain_module_id: TASK_EXEC_ID, capability_id: 331 }, // WORK-DASHBOARDS
  { domain_module_id: TASK_EXEC_ID, capability_id: 311 }, // APPROVAL-WORKFLOW
  { domain_module_id: TASK_EXEC_ID, capability_id: 446 }, // CREATIVE-REVIEW
  // GOALS-OKR (2 capabilities)
  { domain_module_id: GOALS_OKR_ID, capability_id: 329 }, // WORK-GOALS-OKR
  { domain_module_id: GOALS_OKR_ID, capability_id: 25 },  // GOAL-MGMT
];

const dmcExisting: any[] = await api(
  `/domain_module_capabilities?domain_module_id=in.(${TASK_EXEC_ID},${GOALS_OKR_ID})&select=domain_module_id,capability_id`,
);
const dmcKey = (r: any) => `${r.domain_module_id}:${r.capability_id}`;
const dmcHave = new Set(dmcExisting.map(dmcKey));
const dmcMissing = dmcRows.filter((r) => !dmcHave.has(dmcKey(r)));
if (dmcMissing.length) {
  console.log(`  inserting ${dmcMissing.length} of ${dmcRows.length} dmc rows`);
  await api("/domain_module_capabilities", "POST", dmcMissing);
} else {
  console.log("  all 9 dmc rows already present");
}

// ============================================================
// STEP 4: domain_module_data_objects (5 rows)
// ============================================================
console.log("Step 4: Link data_objects to modules");

const dmdoRows = [
  // TASK-EXEC masters
  { domain_module_id: TASK_EXEC_ID, data_object_id: 243, role: "master", necessity: "required" }, // work_items
  { domain_module_id: TASK_EXEC_ID, data_object_id: 244, role: "master", necessity: "required" }, // work_projects
  { domain_module_id: TASK_EXEC_ID, data_object_id: 246, role: "master", necessity: "required" }, // work_automations
  // GOALS-OKR
  { domain_module_id: GOALS_OKR_ID, data_object_id: 245, role: "master", necessity: "required" }, // okr_objectives
  { domain_module_id: GOALS_OKR_ID, data_object_id: 243, role: "embedded_master", necessity: "required" }, // work_items shell for KR linking
];

const dmdoExisting: any[] = await api(
  `/domain_module_data_objects?domain_module_id=in.(${TASK_EXEC_ID},${GOALS_OKR_ID})&select=domain_module_id,data_object_id`,
);
const dmdoKey = (r: any) => `${r.domain_module_id}:${r.data_object_id}`;
const dmdoHave = new Set(dmdoExisting.map(dmdoKey));
const dmdoMissing = dmdoRows.filter((r) => !dmdoHave.has(dmdoKey(r)));
if (dmdoMissing.length) {
  console.log(`  inserting ${dmdoMissing.length} of ${dmdoRows.length} dmdo rows`);
  await api("/domain_module_data_objects", "POST", dmdoMissing);
} else {
  console.log("  all 5 dmdo rows already present");
}

// ============================================================
// STEP 5: Lifecycle states
// ============================================================
console.log("Step 5: Insert lifecycle states");

// All states scoped to a specific module (Rule #14 permission materialization).
const lifecycleRows = [
  // work_items (243), TASK-EXEC: open team tool, no workflow gates
  { data_object_id: 243, state_name: "open", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: null, domain_module_id: TASK_EXEC_ID },
  { data_object_id: 243, state_name: "in_progress", state_order: 2, is_initial: false, is_terminal: false, requires_permission: false, domain_module_id: TASK_EXEC_ID },
  { data_object_id: 243, state_name: "blocked", state_order: 3, is_initial: false, is_terminal: false, requires_permission: false, domain_module_id: TASK_EXEC_ID },
  { data_object_id: 243, state_name: "done", state_order: 4, is_initial: false, is_terminal: true, requires_permission: false, domain_module_id: TASK_EXEC_ID },
  { data_object_id: 243, state_name: "cancelled", state_order: 5, is_initial: false, is_terminal: true, requires_permission: false, domain_module_id: TASK_EXEC_ID },
  // work_projects (244), TASK-EXEC
  { data_object_id: 244, state_name: "planning", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, domain_module_id: TASK_EXEC_ID },
  { data_object_id: 244, state_name: "active", state_order: 2, is_initial: false, is_terminal: false, requires_permission: false, domain_module_id: TASK_EXEC_ID },
  { data_object_id: 244, state_name: "on_hold", state_order: 3, is_initial: false, is_terminal: false, requires_permission: false, domain_module_id: TASK_EXEC_ID },
  { data_object_id: 244, state_name: "completed", state_order: 4, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "complete_work_project", domain_module_id: TASK_EXEC_ID },
  { data_object_id: 244, state_name: "archived", state_order: 5, is_initial: false, is_terminal: true, requires_permission: false, domain_module_id: TASK_EXEC_ID },
  // work_automations (246), TASK-EXEC
  { data_object_id: 246, state_name: "drafted", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, domain_module_id: TASK_EXEC_ID },
  { data_object_id: 246, state_name: "enabled", state_order: 2, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "enable_work_automation", domain_module_id: TASK_EXEC_ID },
  { data_object_id: 246, state_name: "disabled", state_order: 3, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "disable_work_automation", domain_module_id: TASK_EXEC_ID },
  { data_object_id: 246, state_name: "archived", state_order: 4, is_initial: false, is_terminal: true, requires_permission: false, domain_module_id: TASK_EXEC_ID },
  // okr_objectives (245), GOALS-OKR: team-execution cadence (mirrors performance pattern but module-scoped per Rule #14)
  { data_object_id: 245, state_name: "drafted", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, domain_module_id: GOALS_OKR_ID },
  { data_object_id: 245, state_name: "committed", state_order: 2, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "commit_okr_objective", domain_module_id: GOALS_OKR_ID },
  { data_object_id: 245, state_name: "in_progress", state_order: 3, is_initial: false, is_terminal: false, requires_permission: false, domain_module_id: GOALS_OKR_ID },
  { data_object_id: 245, state_name: "scored", state_order: 4, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "score_okr_objective", domain_module_id: GOALS_OKR_ID },
  { data_object_id: 245, state_name: "closed", state_order: 5, is_initial: false, is_terminal: true, requires_permission: false, domain_module_id: GOALS_OKR_ID },
];

const lifecycleExisting: any[] = await api(
  `/data_object_lifecycle_states?domain_module_id=in.(${TASK_EXEC_ID},${GOALS_OKR_ID})&select=data_object_id,state_name,domain_module_id`,
);
const lifecycleKey = (r: any) => `${r.data_object_id}:${r.state_name}:${r.domain_module_id}`;
const lifecycleHave = new Set(lifecycleExisting.map(lifecycleKey));
const lifecycleMissing = lifecycleRows.filter((r) => !lifecycleHave.has(lifecycleKey(r)));
if (lifecycleMissing.length) {
  console.log(`  inserting ${lifecycleMissing.length} of ${lifecycleRows.length} lifecycle rows`);
  // PostgREST bulk-insert requires uniform column shape across rows. Normalize permission_verb_override to null where absent.
  const lifecycleNormalized = lifecycleMissing.map((r: any) => ({
    data_object_id: r.data_object_id,
    state_name: r.state_name,
    state_order: r.state_order,
    is_initial: r.is_initial,
    is_terminal: r.is_terminal,
    requires_permission: r.requires_permission,
    permission_verb_override: r.permission_verb_override ?? "",
    domain_module_id: r.domain_module_id,
  }));
  await api("/data_object_lifecycle_states", "POST", lifecycleNormalized);
} else {
  console.log(`  all ${lifecycleRows.length} lifecycle rows already present`);
}

// ============================================================
// STEP 6: Insert missing mutate tools
// ============================================================
console.log("Step 6: Insert missing mutate tools");

const toolRows = [
  { tool_name: "create_work_item", description: "Create a new work-management item (task, ticket, story, or card).", operation_kind: "mutate", coverage_tier: "platform", data_object_id: 243 },
  { tool_name: "update_work_item", description: "Update fields or state on an existing work-management item.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: 243 },
  { tool_name: "create_work_project", description: "Open a new project, board, or workspace container.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: 244 },
  { tool_name: "update_work_project", description: "Update fields or state on an existing project container.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: 244 },
  { tool_name: "update_work_automation", description: "Update an automation rule (enable, disable, or modify trigger and action).", operation_kind: "mutate", coverage_tier: "platform", data_object_id: 246 },
];

await insertMissing(
  "tools",
  toolRows,
  "tool_name",
  `tool_name=in.(${toolRows.map((r) => r.tool_name).join(",")})`,
);

// Build the full tool-id map we need for skill_tools
const toolNamesNeeded = [
  "query_work_items", "query_work_projects", "query_work_automations", "query_okr_objectives",
  "create_work_item", "update_work_item", "create_work_project", "update_work_project", "update_work_automation",
  "create_okr_objective", "update_okr_objective",
  "notify_person",
];
const toolList: any[] = await api(`/tools?tool_name=in.(${toolNamesNeeded.join(",")})&select=id,tool_name`);
const toolIdByName = new Map<string, number>(toolList.map((t: any) => [t.tool_name, t.id]));

// ============================================================
// STEP 7: Insert 2 system skills
// ============================================================
console.log("Step 7: Insert system skills");

const skillRows = [
  {
    skill_name: "work_mgmt_task_exec_agent",
    skill_type: "system",
    domain_id: 135,
    domain_module_id: TASK_EXEC_ID,
    description:
      "System skill for the WORK-MGMT-TASK-EXEC module. Operates on work_items, work_projects, and work_automations: queries the work substrate, creates and updates items and projects, manages automation rule state, surfaces blockers and overdue work.",
  },
  {
    skill_name: "work_mgmt_goals_okr_agent",
    skill_type: "system",
    domain_id: 135,
    domain_module_id: GOALS_OKR_ID,
    description:
      "System skill for the WORK-MGMT-GOALS-OKR module. Operates on okr_objectives with work_items as the KR-linking substrate: queries OKRs and their progress, creates and updates objectives across the team-execution lifecycle, surfaces stalled or under-scored objectives.",
  },
];

await insertMissing(
  "skills",
  skillRows,
  "skill_name",
  `skill_name=in.(${skillRows.map((r) => r.skill_name).join(",")})`,
);

const skillList: any[] = await api(
  `/skills?skill_name=in.(${skillRows.map((r) => r.skill_name).join(",")})&select=id,skill_name`,
);
const skillIdByName = new Map<string, number>(skillList.map((s: any) => [s.skill_name, s.id]));
const TASK_EXEC_SKILL = skillIdByName.get("work_mgmt_task_exec_agent")!;
const GOALS_OKR_SKILL = skillIdByName.get("work_mgmt_goals_okr_agent")!;

// ============================================================
// STEP 8: skill_tools
// ============================================================
console.log("Step 8: Link skill_tools");

const stRows = [
  // TASK-EXEC skill
  { skill_id: TASK_EXEC_SKILL, tool_id: toolIdByName.get("query_work_items")!, requirement_level: "required" },
  { skill_id: TASK_EXEC_SKILL, tool_id: toolIdByName.get("query_work_projects")!, requirement_level: "required" },
  { skill_id: TASK_EXEC_SKILL, tool_id: toolIdByName.get("query_work_automations")!, requirement_level: "required" },
  { skill_id: TASK_EXEC_SKILL, tool_id: toolIdByName.get("create_work_item")!, requirement_level: "required" },
  { skill_id: TASK_EXEC_SKILL, tool_id: toolIdByName.get("update_work_item")!, requirement_level: "required" },
  { skill_id: TASK_EXEC_SKILL, tool_id: toolIdByName.get("create_work_project")!, requirement_level: "required" },
  { skill_id: TASK_EXEC_SKILL, tool_id: toolIdByName.get("update_work_project")!, requirement_level: "required" },
  { skill_id: TASK_EXEC_SKILL, tool_id: toolIdByName.get("update_work_automation")!, requirement_level: "required" },
  { skill_id: TASK_EXEC_SKILL, tool_id: toolIdByName.get("notify_person")!, requirement_level: "optional" },
  // GOALS-OKR skill
  { skill_id: GOALS_OKR_SKILL, tool_id: toolIdByName.get("query_okr_objectives")!, requirement_level: "required" },
  { skill_id: GOALS_OKR_SKILL, tool_id: toolIdByName.get("create_okr_objective")!, requirement_level: "required" },
  { skill_id: GOALS_OKR_SKILL, tool_id: toolIdByName.get("update_okr_objective")!, requirement_level: "required" },
  { skill_id: GOALS_OKR_SKILL, tool_id: toolIdByName.get("query_work_items")!, requirement_level: "required" },
  { skill_id: GOALS_OKR_SKILL, tool_id: toolIdByName.get("notify_person")!, requirement_level: "optional" },
];

const stExisting: any[] = await api(
  `/skill_tools?skill_id=in.(${TASK_EXEC_SKILL},${GOALS_OKR_SKILL})&select=skill_id,tool_id`,
);
const stKey = (r: any) => `${r.skill_id}:${r.tool_id}`;
const stHave = new Set(stExisting.map(stKey));
const stMissing = stRows.filter((r) => !stHave.has(stKey(r)));
if (stMissing.length) {
  console.log(`  inserting ${stMissing.length} of ${stRows.length} skill_tools rows`);
  await api("/skill_tools", "POST", stMissing);
} else {
  console.log(`  all ${stRows.length} skill_tools rows already present`);
}

// ============================================================
// STEP 9: B10b handoff backfill
// ============================================================
console.log("Step 9: B10b handoff module-FK backfill");

// Map data_object_id -> WORK-MGMT module that holds it
const woMgmtModuleForDataObject = new Map<number, number>([
  [243, TASK_EXEC_ID], // work_items
  [244, TASK_EXEC_ID], // work_projects
  [246, TASK_EXEC_ID], // work_automations
  [245, GOALS_OKR_ID], // okr_objectives
]);

// Pull all WORK-MGMT-touching handoffs with their trigger_event's data_object_id
const handoffs: any[] = await api(
  `/handoffs?or=(source_domain_id.eq.135,target_domain_id.eq.135)&select=id,source_domain_id,target_domain_id,data_object_id,source_domain_module_id,target_domain_module_id,trigger_events(data_object_id)`,
);

let patchedSrc = 0;
let patchedTgt = 0;
let skippedTgt = 0;
for (const h of handoffs) {
  const patch: any = {};
  // Outbound: source=135, set source_domain_module_id from trigger_event's data_object
  if (h.source_domain_id === 135 && !h.source_domain_module_id) {
    const eventDoId = h.trigger_events?.data_object_id;
    const mid = eventDoId != null ? woMgmtModuleForDataObject.get(eventDoId) : undefined;
    if (mid) {
      patch.source_domain_module_id = mid;
      patchedSrc++;
    }
  }
  // Inbound: target=135, set target_domain_module_id from handoff's payload data_object
  if (h.target_domain_id === 135 && !h.target_domain_module_id) {
    const mid = woMgmtModuleForDataObject.get(h.data_object_id);
    if (mid) {
      patch.target_domain_module_id = mid;
      patchedTgt++;
    } else {
      skippedTgt++;
    }
  }
  if (Object.keys(patch).length > 0) {
    await api(`/handoffs?id=eq.${h.id}`, "PATCH", patch);
  }
}
console.log(`  patched source_domain_module_id on ${patchedSrc} outbound rows`);
console.log(`  patched target_domain_module_id on ${patchedTgt} inbound rows`);
console.log(`  ${skippedTgt} inbound rows left NULL (payload not modeled by any WORK-MGMT module; surface as follow-up)`);

// ============================================================
// STEP 10: F1 cleanup — retire legacy work-mgmt-system skill (id=122)
// ============================================================
console.log("Step 10: Retire legacy work-mgmt-system skill (id=122)");

// Delete its skill_tools first (FK constraint)
await api(`/skill_tools?skill_id=eq.122`, "DELETE");
await api(`/skills?id=eq.122`, "DELETE");
console.log("  done");

// ============================================================
// Done
// ============================================================
console.log("\nWORK-MGMT consolidated load complete.");
console.log("Spot-check:");
console.log("  https://tests.semantius.app/domain_map/domain_modules");
console.log("  https://tests.semantius.app/domain_map/domain_module_capabilities");
console.log("  https://tests.semantius.app/domain_map/domain_module_data_objects");
console.log("  https://tests.semantius.app/domain_map/data_object_lifecycle_states");
console.log("  https://tests.semantius.app/domain_map/skills");
console.log("  https://tests.semantius.app/domain_map/skill_tools");
