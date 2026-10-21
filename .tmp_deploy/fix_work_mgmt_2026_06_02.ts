#!/usr/bin/env bun
// WORK-MGMT (domain 135) Bucket-1 audit fixes — 2026-06-02 Validate run.
// Idempotent: every phase reads existing state before writing; safe to re-run.
//
// Phase 1: B13 entity_type classification on all 22 masters + lifecycle states
//          for the 2 newly-typed operational_workflow masters (970, 983).
// Phase 2: E-band personas re-author (Plan-3 regression) — domain_roles + role_modules.
// Phase 3: Phase-S skill_tools catch-up on the expanded master set.
// Phase 4: B9b intra-domain handoff (INTAKE -> TASK-EXEC) + trigger_event hygiene.
//
// record_status is left at the DB default ('new') everywhere (Rule #1).
// No `notes` column is populated (Rule #15).

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
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
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}\nbody=${JSON.stringify(body)}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    out.push(...(await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) })));
  }
  return out;
}

// ============================================================
// PHASE 1 — entity_type (B13) + lifecycle (B12) for 970, 983
// ============================================================
const ENTITY_TYPE: Record<number, string> = {
  243: "operational_workflow",
  244: "operational_workflow",
  245: "operational_workflow",
  246: "catalog",
  966: "operational_record",
  967: "operational_record",
  968: "junction",
  969: "operational_record",
  970: "operational_workflow",
  971: "catalog",
  972: "computed",
  973: "catalog",
  974: "junction",
  975: "catalog",
  976: "catalog",
  977: "catalog",
  978: "catalog",
  979: "junction",
  980: "operational_record",
  981: "operational_record",
  982: "catalog",
  983: "operational_workflow",
};

async function phase1() {
  console.log("\n=== PHASE 1: entity_type classification (B13) ===");
  const ids = Object.keys(ENTITY_TYPE).join(",");
  const before = await get(`/data_objects?id=in.(${ids})&select=id,data_object_name,entity_type`);
  let patched = 0;
  for (const r of before) {
    const id = Number(r.id);
    const want = ENTITY_TYPE[id];
    if (r.entity_type === want) continue;
    await call({ method: "PATCH", path: `/data_objects?id=eq.${id}`, body: { entity_type: want } });
    patched++;
  }
  console.log(`  entity_type: ${patched} patched, ${before.length - patched} already correct`);

  // Lifecycle states for the two newly-typed operational_workflow masters.
  // (Pattern flags already present: 970 has_single_approver=true, 983 has_personal_content=true.)
  type LC = {
    data_object_id: number;
    state_name: string;
    state_order: number;
    is_initial: boolean;
    is_terminal: boolean;
    requires_permission: boolean;
    permission_verb_override: string;
    domain_module_id: number;
  };
  const lifecycles: LC[] = [
    // work_approval_steps (970) realized in WORK-MGMT-TASK-EXEC (149)
    { data_object_id: 970, state_name: "pending", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: 149 },
    { data_object_id: 970, state_name: "approved", state_order: 2, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "approve_work_approval_step", domain_module_id: 149 },
    { data_object_id: 970, state_name: "rejected", state_order: 3, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "reject_work_approval_step", domain_module_id: 149 },
    { data_object_id: 970, state_name: "expired", state_order: 4, is_initial: false, is_terminal: true, requires_permission: false, permission_verb_override: "", domain_module_id: 149 },
    // work_form_submissions (983) realized in WORK-MGMT-INTAKE (183)
    { data_object_id: 983, state_name: "submitted", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: 183 },
    { data_object_id: 983, state_name: "triaged", state_order: 2, is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: 183 },
    { data_object_id: 983, state_name: "converted", state_order: 3, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "convert_work_form_submission", domain_module_id: 183 },
    { data_object_id: 983, state_name: "rejected", state_order: 4, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "reject_work_form_submission", domain_module_id: 183 },
  ];
  const existingLC = await get(`/data_object_lifecycle_states?data_object_id=in.(970,983)&select=data_object_id,state_name`);
  const haveLC = new Set(existingLC.map(r => `${r.data_object_id}|${r.state_name}`));
  const missingLC = lifecycles.filter(l => !haveLC.has(`${l.data_object_id}|${l.state_name}`));
  await insert("/data_object_lifecycle_states", missingLC as unknown as Row[]);
  console.log(`  lifecycle states: inserted ${missingLC.length} (${existingLC.length} already present)`);
}

// ============================================================
// PHASE 2 — personas (E1/E2/E3): domain_roles + role_modules
// ============================================================
type Persona = {
  role_code: string;
  role_name: string;
  description: string;
  business_function_id: number | null;
  reach: { module_id: number; interaction_level: "primary" | "secondary" }[];
};
const PERSONAS: Persona[] = [
  {
    role_code: "OPERATIONS-WORK-PROGRAM-LEAD",
    role_name: "Work Program Lead",
    description: "PMO / BizOps lead who owns cross-team programs, triages intake, and rolls up OKR progress from work items.",
    business_function_id: 34,
    reach: [
      { module_id: 149, interaction_level: "primary" },
      { module_id: 150, interaction_level: "secondary" },
      { module_id: 183, interaction_level: "secondary" },
    ],
  },
  {
    role_code: "OPERATIONS-WORK-CONTRIBUTOR",
    role_name: "Work Contributor",
    description: "Individual contributor who executes assigned work items, posts updates, and submits cross-team requests through intake.",
    business_function_id: 34,
    reach: [
      { module_id: 149, interaction_level: "primary" },
      { module_id: 183, interaction_level: "secondary" },
    ],
  },
  {
    role_code: "MARKETING-CAMPAIGN-MANAGER",
    role_name: "Campaign Manager",
    description: "Marketing operator who runs campaign projects with creative review and routes creative requests through intake queues.",
    business_function_id: 22,
    reach: [
      { module_id: 149, interaction_level: "primary" },
      { module_id: 183, interaction_level: "secondary" },
    ],
  },
  {
    role_code: "OKR-OWNER",
    role_name: "OKR Owner",
    description: "Cross-functional objective owner who commits and scores OKRs and links key results to executing work items.",
    business_function_id: null,
    reach: [
      { module_id: 150, interaction_level: "primary" },
      { module_id: 149, interaction_level: "secondary" },
    ],
  },
];

async function phase2() {
  console.log("\n=== PHASE 2: personas (E1/E2/E3) ===");
  const codes = PERSONAS.map(p => p.role_code);
  const existing = await get(`/domain_roles?role_code=in.(${codes.join(",")})&select=id,role_code`);
  const codeToId = new Map<string, number>(existing.map(r => [String(r.role_code), Number(r.id)]));
  const toInsert = PERSONAS.filter(p => !codeToId.has(p.role_code)).map(p => ({
    role_code: p.role_code,
    role_name: p.role_name,
    description: p.description,
    business_function_id: p.business_function_id,
  }));
  if (toInsert.length) {
    // business_function_id is null on some rows -> uniformize keys
    const ins = await insert("/domain_roles", toInsert as Row[]);
    for (const r of ins) codeToId.set(String(r.role_code), Number(r.id));
  }
  console.log(`  domain_roles: ${toInsert.length} inserted, ${existing.length} already present`);

  // role_modules reach
  const roleIds = PERSONAS.map(p => codeToId.get(p.role_code)).filter(Boolean) as number[];
  const existRM = roleIds.length
    ? await get(`/role_modules?role_id=in.(${roleIds.join(",")})&select=role_id,domain_module_id`)
    : [];
  const haveRM = new Set(existRM.map(r => `${r.role_id}|${r.domain_module_id}`));
  const rmRows: Row[] = [];
  for (const p of PERSONAS) {
    const rid = codeToId.get(p.role_code)!;
    for (const reach of p.reach) {
      const k = `${rid}|${reach.module_id}`;
      if (haveRM.has(k)) continue;
      rmRows.push({ role_id: rid, domain_module_id: reach.module_id, interaction_level: reach.interaction_level });
    }
  }
  await insert("/role_modules", rmRows);
  console.log(`  role_modules: ${rmRows.length} inserted (${existRM.length} already present)`);
}

// ============================================================
// PHASE 3 — skill_tools catch-up (Phase-S)
// ============================================================
type ToolSpec = {
  tool_name: string;
  description: string;
  operation_kind: "query" | "mutate";
  data_object_id: number;
  skill_id: number;
  requirement_level: "required" | "optional";
};
const TOOLSPECS: ToolSpec[] = [
  // TASK-EXEC skill (215), module 149 masters
  { tool_name: "query_work_milestones", description: "Read project milestones and their gate status via Semantius CRUD.", operation_kind: "query", data_object_id: 969, skill_id: 215, requirement_level: "required" },
  { tool_name: "query_work_dependencies", description: "Read typed dependencies between work items via Semantius CRUD.", operation_kind: "query", data_object_id: 968, skill_id: 215, requirement_level: "required" },
  { tool_name: "query_work_approval_chains", description: "Read approval chains gating work items and projects via Semantius CRUD.", operation_kind: "query", data_object_id: 971, skill_id: 215, requirement_level: "required" },
  { tool_name: "query_work_approval_steps", description: "Read individual approval steps and their approvers via Semantius CRUD.", operation_kind: "query", data_object_id: 970, skill_id: 215, requirement_level: "required" },
  { tool_name: "query_work_user_workloads", description: "Read per-user workload and capacity rollups via Semantius CRUD.", operation_kind: "query", data_object_id: 972, skill_id: 215, requirement_level: "required" },
  { tool_name: "approve_work_approval_step", description: "Approve a pending approval step on a work item or project via Semantius CRUD.", operation_kind: "mutate", data_object_id: 970, skill_id: 215, requirement_level: "required" },
  { tool_name: "query_work_item_comments", description: "Read threaded comments on a work item via Semantius CRUD.", operation_kind: "query", data_object_id: 980, skill_id: 215, requirement_level: "optional" },
  { tool_name: "query_work_sections", description: "Read project sections used to group work items in board/list views via Semantius CRUD.", operation_kind: "query", data_object_id: 975, skill_id: 215, requirement_level: "optional" },
  { tool_name: "query_work_custom_fields", description: "Read user-defined custom field definitions on projects via Semantius CRUD.", operation_kind: "query", data_object_id: 973, skill_id: 215, requirement_level: "optional" },
  // GOALS-OKR skill (216), module 150 masters
  { tool_name: "query_okr_key_results", description: "Read measurable key results attached to objectives via Semantius CRUD.", operation_kind: "query", data_object_id: 966, skill_id: 216, requirement_level: "required" },
  { tool_name: "query_okr_check_ins", description: "Read periodic OKR check-in updates via Semantius CRUD.", operation_kind: "query", data_object_id: 967, skill_id: 216, requirement_level: "required" },
  { tool_name: "create_okr_key_result", description: "Create a key result under an objective via Semantius CRUD.", operation_kind: "mutate", data_object_id: 966, skill_id: 216, requirement_level: "required" },
  { tool_name: "create_okr_check_in", description: "Record an OKR check-in update via Semantius CRUD.", operation_kind: "mutate", data_object_id: 967, skill_id: 216, requirement_level: "required" },
];

async function phase3() {
  console.log("\n=== PHASE 3: skill_tools catch-up (Phase-S) ===");
  const names = [...new Set(TOOLSPECS.map(t => t.tool_name))];
  const existTools = await get(`/tools?tool_name=in.(${names.join(",")})&select=id,tool_name`);
  const toolId = new Map<string, number>(existTools.map(r => [String(r.tool_name), Number(r.id)]));
  const newTools = names
    .filter(n => !toolId.has(n))
    .map(n => {
      const s = TOOLSPECS.find(t => t.tool_name === n)!;
      return { tool_name: s.tool_name, description: s.description, operation_kind: s.operation_kind, data_object_id: s.data_object_id, coverage_tier: "platform" };
    });
  if (newTools.length) {
    const ins = await insert("/tools", newTools as Row[]);
    for (const r of ins) toolId.set(String(r.tool_name), Number(r.id));
  }
  console.log(`  tools: ${newTools.length} created, ${existTools.length} already present`);

  const skillIds = [...new Set(TOOLSPECS.map(t => t.skill_id))];
  const existST = await get(`/skill_tools?skill_id=in.(${skillIds.join(",")})&select=skill_id,tool_id`);
  const haveST = new Set(existST.map(r => `${r.skill_id}|${r.tool_id}`));
  const stRows: Row[] = [];
  for (const s of TOOLSPECS) {
    const tid = toolId.get(s.tool_name)!;
    const k = `${s.skill_id}|${tid}`;
    if (haveST.has(k)) continue;
    stRows.push({ skill_id: s.skill_id, tool_id: tid, requirement_level: s.requirement_level });
  }
  await insert("/skill_tools", stRows);
  console.log(`  skill_tools: ${stRows.length} inserted (${existST.length} already present for these skills)`);
}

// ============================================================
// PHASE 4 — B9b intra-domain handoff + trigger_event hygiene
// ============================================================
async function phase4() {
  console.log("\n=== PHASE 4: B9b handoff + trigger_event hygiene ===");

  // 4a. trigger_event hygiene PATCHes (B9/B9c)
  const eventFixes: { id: number; body: Row }[] = [
    { id: 150, body: { to_state: "drafted" } }, // okr_objective.created: 'draft' -> 'drafted' (match lifecycle state_name)
    { id: 869, body: { event_category: "lifecycle", from_state: "", to_state: "drafted" } }, // work_automation.created
    { id: 871, body: { event_category: "lifecycle", from_state: "enabled", to_state: "disabled" } }, // work_automation.disabled
    { id: 870, body: { event_category: "signal" } }, // work_automation.triggered (runtime fire, not a lifecycle transition)
  ];
  for (const f of eventFixes) {
    await call({ method: "PATCH", path: `/trigger_events?id=eq.${f.id}`, body: f.body });
  }
  console.log(`  trigger_events: ${eventFixes.length} patched`);

  // 4b. new trigger_event work_form_submission.converted (on 983)
  let convertedEventId: number;
  const ev = await get(`/trigger_events?event_name=eq.work_form_submission.converted&select=id`);
  if (ev.length) {
    convertedEventId = Number(ev[0].id);
    console.log(`  trigger_event work_form_submission.converted already present (id ${convertedEventId})`);
  } else {
    const ins = await insert("/trigger_events", [
      { event_name: "work_form_submission.converted", data_object_id: 983, from_state: "triaged", to_state: "converted", event_category: "lifecycle", description: "An intake form submission is converted into a work item under the routed project." },
    ]);
    convertedEventId = Number(ins[0].id);
    console.log(`  trigger_event work_form_submission.converted created (id ${convertedEventId})`);
  }

  // 4c. intra-domain handoff INTAKE (183) -> TASK-EXEC (149), payload work_items (243)
  const hKey = `135|135|243|${convertedEventId}`;
  const existH = await get(`/handoffs?source_domain_id=eq.135&target_domain_id=eq.135&data_object_id=eq.243&trigger_event_id=eq.${convertedEventId}&select=id`);
  if (existH.length) {
    console.log(`  intra-domain handoff already present (id ${existH[0].id})`);
  } else {
    await insert("/handoffs", [
      {
        source_domain_id: 135,
        target_domain_id: 135,
        source_domain_module_id: 183,
        target_domain_module_id: 149,
        data_object_id: 243,
        trigger_event_id: convertedEventId,
        integration_pattern: "lifecycle_progression",
        friction_level: "low",
        description: "A converted intake form submission spawns a work item in the task-execution module under the routed project.",
      },
    ]);
    console.log(`  intra-domain handoff INTAKE->TASK-EXEC inserted (key ${hKey})`);
  }
}

await phase1();
await phase2();
await phase3();
await phase4();
console.log("\n=== DONE. UI: https://tests.semantius.app/domain_map/data_objects ===");
