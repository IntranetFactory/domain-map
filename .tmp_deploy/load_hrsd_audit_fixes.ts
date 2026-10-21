// HRSD audit fixes — B4, B12, M3, B10b, F2, E1-E5, F1
// Idempotent; safe to re-run.

const DOMAIN_ID = 22;
const M_CASE = 75; // HRSD-CASE-MGMT
const M_PORTAL = 76; // HRSD-EMPLOYEE-PORTAL
const M_KB = 77; // HRSD-KNOWLEDGE
const D_HR_CASES = 192;
const D_CASE_CATEGORIES = 193;
const D_EMPLOYEES = 31;
const D_SERVICE_REQUESTS = 48;
const D_KNOWLEDGE_ARTICLES = 51;
const HRSD_FN_ID = 76;
const LEGACY_SKILL_ID = 68;

async function pg(method: string, path: string, body?: unknown): Promise<any> {
  const args: Record<string, unknown> = { method, path };
  if (body !== undefined) args.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(args)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error(`pg ${method} ${path} failed: ${err || out}`);
  }
  try {
    return out.trim() ? JSON.parse(out) : null;
  } catch {
    return out;
  }
}

async function insertReturning(path: string, rows: unknown[]): Promise<any[]> {
  if (!rows.length) return [];
  const chunks: unknown[][] = [];
  for (let i = 0; i < rows.length; i += 25) chunks.push(rows.slice(i, i + 25));
  const out: any[] = [];
  for (const c of chunks) {
    const r = await pg("POST", `${path}?select=*`, c);
    out.push(...(Array.isArray(r) ? r : []));
  }
  return out;
}

async function patch(path: string, body: unknown): Promise<void> {
  await pg("PATCH", path, body);
}

const summary: Record<string, any> = {};

// ============================================================
// Phase 1: B4 — pattern flags on hr_cases + notes on case_categories
// ============================================================
console.log("[B4] pattern flags + notes");
await patch(`/data_objects?id=eq.${D_HR_CASES}`, {
  has_personal_content: true,
  has_submit_lock: false,
  has_single_approver: false,
  notes:
    "Contains sensitive employee data (ER complaints, medical leave, comp questions). Cases can reopen after closure. No single approver: routing depends on case category (HRBP, manager, legal).",
});
await patch(`/data_objects?id=eq.${D_CASE_CATEGORIES}`, {
  notes:
    "Config-shaped; no workflow. Authored once by HRSD admin, edited inline; no per-state permissions needed. B12 exempt.",
});
summary.B4 = "patched";

// ============================================================
// Phase 2: B12 — lifecycle states for hr_cases (8 states, module 75)
// ============================================================
console.log("[B12] lifecycle states");
const existingStates = await pg(
  "GET",
  `/data_object_lifecycle_states?data_object_id=eq.${D_HR_CASES}&select=state_name`,
);
const existingStateNames = new Set((existingStates as any[]).map((r) => r.state_name));
const stateRows = [
  {
    state_name: "intake",
    state_order: 1,
    is_initial: true,
    is_terminal: false,
    requires_permission: false,
    permission_verb_override: "",
    description:
      "Case has been submitted via the self-service portal or another intake channel; awaiting triage by AI classification or HR agent.",
    notes: "",
    domain_module_id: M_CASE,
  },
  {
    state_name: "triaged",
    state_order: 2,
    is_initial: false,
    is_terminal: false,
    requires_permission: true,
    permission_verb_override: "triage_hr_case",
    description:
      "Case has been categorized and prioritized; ready for assignment to an HR agent or HRBP.",
    notes: "",
    domain_module_id: M_CASE,
  },
  {
    state_name: "assigned",
    state_order: 3,
    is_initial: false,
    is_terminal: false,
    requires_permission: true,
    permission_verb_override: "assign_hr_case",
    description:
      "Case is assigned to a named HR agent or HRBP owner. The owner is responsible for resolution within the case SLA.",
    notes: "",
    domain_module_id: M_CASE,
  },
  {
    state_name: "in_progress",
    state_order: 4,
    is_initial: false,
    is_terminal: false,
    requires_permission: false,
    permission_verb_override: "",
    description:
      "The owner is actively working the case (researching, requesting info from the employee, consulting policy).",
    notes: "",
    domain_module_id: M_CASE,
  },
  {
    state_name: "pending_approval",
    state_order: 5,
    is_initial: false,
    is_terminal: false,
    requires_permission: true,
    permission_verb_override: "approve_hr_case",
    description:
      "Case resolution requires a sign-off from manager, HRBP, legal, or compliance (policy exception, accommodation, sensitive ER outcome).",
    notes: "",
    domain_module_id: M_CASE,
  },
  {
    state_name: "resolved",
    state_order: 6,
    is_initial: false,
    is_terminal: false,
    requires_permission: true,
    permission_verb_override: "resolve_hr_case",
    description:
      "Owner has answered the employee's request or completed the workflow. Case enters the close-out review window.",
    notes: "",
    domain_module_id: M_CASE,
  },
  {
    state_name: "closed",
    state_order: 7,
    is_initial: false,
    is_terminal: true,
    requires_permission: false,
    permission_verb_override: "",
    description:
      "Case is closed. Auto-closes after the SLA-defined review window if the employee does not respond or reopen.",
    notes: "",
    domain_module_id: M_CASE,
  },
  {
    state_name: "reopened",
    state_order: 8,
    is_initial: false,
    is_terminal: false,
    requires_permission: true,
    permission_verb_override: "reopen_hr_case",
    description:
      "A closed case has been reopened by the employee, owner, or HRBP for additional work. Returns to in_progress on next update.",
    notes: "",
    domain_module_id: M_CASE,
  },
].filter((r) => !existingStateNames.has(r.state_name))
  .map((r) => ({ ...r, data_object_id: D_HR_CASES }));
const stateInserts = await insertReturning("/data_object_lifecycle_states", stateRows);
summary.B12 = { inserted: stateInserts.length, already: existingStateNames.size };

// ============================================================
// Phase 3: M3 — domain_starter_modules
// ============================================================
console.log("[M3] starter modules");
const existingStarters = await pg(
  "GET",
  `/domain_starter_modules?domain_id=eq.${DOMAIN_ID}&select=domain_module_id`,
);
const existingStarterIds = new Set((existingStarters as any[]).map((r) => r.domain_module_id));
const starterRows = [
  {
    domain_id: DOMAIN_ID,
    domain_module_id: M_CASE,
    position: 1,
    notes:
      "Start here. The case management backbone every HRSD vendor anchors on; required for any HR service operation.",
  },
  {
    domain_id: DOMAIN_ID,
    domain_module_id: M_PORTAL,
    position: 2,
    notes:
      "Add when self-service intake is needed. Routes employee requests into case mgmt; degrades gracefully if portal is deferred.",
  },
  {
    domain_id: DOMAIN_ID,
    domain_module_id: M_KB,
    position: 3,
    notes:
      "Add when an HR-audience KB is needed. Feeds back authoring suggestions on case closure; can be deferred or replaced by ITSM/KMS knowledge.",
  },
].filter((r) => !existingStarterIds.has(r.domain_module_id));
const starterInserts = await insertReturning("/domain_starter_modules", starterRows);
summary.M3 = { inserted: starterInserts.length, already: existingStarterIds.size };

// ============================================================
// Phase 4: B10b — 10 consumer DMDO rows on module 75 + 10 handoff PATCHes
// ============================================================
console.log("[B10b] consumer DMDOs + handoff patches");
const b10bPayloads = [
  { data_object_id: 286, name: "policy_attestations", handoff_id: 250 },
  { data_object_id: 152, name: "carrier_feeds", handoff_id: 420 },
  { data_object_id: 704, name: "iga_access_requests", handoff_id: 467 },
  { data_object_id: 157, name: "compensation_statements", handoff_id: 1137 },
  { data_object_id: 161, name: "work_shifts", handoff_id: 429 },
  { data_object_id: 18, name: "onboarding_tasks", handoff_id: 9 },
  { data_object_id: 410, name: "knowledge_base_articles", handoff_id: 721 },
  { data_object_id: 144, name: "garnishment_orders", handoff_id: 416 },
  { data_object_id: 173, name: "compliance_assignments", handoff_id: 1048 },
  { data_object_id: 45, name: "engagement_surveys", handoff_id: 1109 },
];
const existingDmdo = await pg(
  "GET",
  `/domain_module_data_objects?domain_module_id=eq.${M_CASE}&select=data_object_id`,
);
const existingDmdoIds = new Set((existingDmdo as any[]).map((r) => r.data_object_id));
const dmdoRows = b10bPayloads
  .filter((p) => !existingDmdoIds.has(p.data_object_id))
  .map((p) => ({
    domain_module_id: M_CASE,
    data_object_id: p.data_object_id,
    role: "consumer",
    necessity: "optional",
    notes:
      `Consumed by HRSD-CASE-MGMT when an inbound handoff escalates to an HR case. Routed via B10b 2026-05-26 audit fixes.`,
  }));
const dmdoInserts = await insertReturning("/domain_module_data_objects", dmdoRows);
for (const p of b10bPayloads) {
  await patch(`/handoffs?id=eq.${p.handoff_id}`, {
    target_domain_module_id: M_CASE,
    notes: `B10b resolved 2026-05-26: HRSD-CASE-MGMT consumes ${p.name} as the inbound payload.`,
  });
}
summary.B10b = { dmdoInserted: dmdoInserts.length, handoffsPatched: b10bPayloads.length };

// ============================================================
// Phase 5: Permissions (14 rows: 8 m75 + 3 m76 + 4 m77)
// ============================================================
console.log("[perm] HRSD module permissions");
const existingPerms = await pg(
  "GET",
  `/permissions?domain_module_id=in.(${M_CASE},${M_PORTAL},${M_KB})&select=permission_name`,
);
const existingPermNames = new Set((existingPerms as any[]).map((r) => r.permission_name));
const permRows = [
  // M_CASE — HRSD-CASE-MGMT
  { permission_name: "hrsd-case-mgmt:read", tier: "baseline-read", domain_module_id: M_CASE, description: "Read HR cases and case categories." },
  { permission_name: "hrsd-case-mgmt:manage", tier: "baseline-manage", domain_module_id: M_CASE, description: "Manage HR cases: create, update, assign, work the lifecycle short of admin actions." },
  { permission_name: "hrsd-case-mgmt:admin", tier: "baseline-admin", domain_module_id: M_CASE, description: "Full admin on HRSD case management including category taxonomy, routing rules, and SLA configuration." },
  { permission_name: "hrsd-case-mgmt:triage_hr_case", tier: "workflow-gate", domain_module_id: M_CASE, description: "Categorize and prioritize an inbound HR case (state intake -> triaged)." },
  { permission_name: "hrsd-case-mgmt:assign_hr_case", tier: "workflow-gate", domain_module_id: M_CASE, description: "Assign an HR case to an owner (state triaged -> assigned)." },
  { permission_name: "hrsd-case-mgmt:approve_hr_case", tier: "workflow-gate", domain_module_id: M_CASE, description: "Approve a case resolution that required sign-off (state pending_approval -> resolved)." },
  { permission_name: "hrsd-case-mgmt:resolve_hr_case", tier: "workflow-gate", domain_module_id: M_CASE, description: "Mark a case resolved (state in_progress -> resolved)." },
  { permission_name: "hrsd-case-mgmt:reopen_hr_case", tier: "workflow-gate", domain_module_id: M_CASE, description: "Reopen a closed case (state closed -> reopened)." },
  // M_PORTAL — HRSD-EMPLOYEE-PORTAL
  { permission_name: "hrsd-employee-portal:read", tier: "baseline-read", domain_module_id: M_PORTAL, description: "Browse self-service catalog, view own case status, search knowledge." },
  { permission_name: "hrsd-employee-portal:manage", tier: "baseline-manage", domain_module_id: M_PORTAL, description: "Manage portal entries: catalog items, intake forms, routing presentation." },
  { permission_name: "hrsd-employee-portal:admin", tier: "baseline-admin", domain_module_id: M_PORTAL, description: "Full admin on the employee self-service portal including branding, layout, and integration wiring." },
  // M_KB — HRSD-KNOWLEDGE
  { permission_name: "hrsd-knowledge:read", tier: "baseline-read", domain_module_id: M_KB, description: "Read HR-audience knowledge articles, FAQs, and policy explainers." },
  { permission_name: "hrsd-knowledge:manage", tier: "baseline-manage", domain_module_id: M_KB, description: "Author and edit HR knowledge articles short of publish authority." },
  { permission_name: "hrsd-knowledge:admin", tier: "baseline-admin", domain_module_id: M_KB, description: "Full admin on HR knowledge including publishing, retirement, and authoring workflow configuration." },
].filter((r) => !existingPermNames.has(r.permission_name));
const permInserts = await insertReturning("/permissions", permRows);
const allPerms = await pg(
  "GET",
  `/permissions?domain_module_id=in.(${M_CASE},${M_PORTAL},${M_KB})&select=id,permission_name`,
);
const permIdByName = new Map<string, number>(
  (allPerms as any[]).map((r) => [r.permission_name, r.id]),
);
summary.permissions = { inserted: permInserts.length };

// ============================================================
// Phase 6: Tools — create missing (create_hr_case, update_hr_case, create_case_category, update_case_category)
// ============================================================
console.log("[tools] missing HRSD tools");
const existingTools = await pg(
  "GET",
  `/tools?or=(tool_name.eq.create_hr_case,tool_name.eq.update_hr_case,tool_name.eq.create_case_category,tool_name.eq.update_case_category,tool_name.eq.search_knowledge_articles,tool_name.eq.publish_knowledge_article)&select=id,tool_name`,
);
const existingToolNames = new Set((existingTools as any[]).map((r) => r.tool_name));
const toolRows = [
  { tool_name: "create_hr_case", operation_kind: "mutate", coverage_tier: "platform", data_object_id: D_HR_CASES, description: "Create a new HR case row." },
  { tool_name: "update_hr_case", operation_kind: "mutate", coverage_tier: "platform", data_object_id: D_HR_CASES, description: "Update fields on an existing HR case (assignment, state, notes, category)." },
  { tool_name: "create_case_category", operation_kind: "mutate", coverage_tier: "platform", data_object_id: D_CASE_CATEGORIES, description: "Create a new case category taxonomy entry." },
  { tool_name: "update_case_category", operation_kind: "mutate", coverage_tier: "platform", data_object_id: D_CASE_CATEGORIES, description: "Update an existing case category." },
  { tool_name: "publish_knowledge_article", operation_kind: "mutate", coverage_tier: "platform", data_object_id: D_KNOWLEDGE_ARTICLES, description: "Transition a knowledge article from draft to published." },
].filter((r) => !existingToolNames.has(r.tool_name));
const toolInserts = await insertReturning("/tools", toolRows);
const allHrTools = await pg(
  "GET",
  `/tools?or=(tool_name.eq.create_hr_case,tool_name.eq.update_hr_case,tool_name.eq.create_case_category,tool_name.eq.update_case_category,tool_name.eq.publish_knowledge_article,tool_name.eq.query_hr_cases,tool_name.eq.query_case_categories,tool_name.eq.query_employees,tool_name.eq.query_knowledge_articles,tool_name.eq.query_service_requests,tool_name.eq.notify_person,tool_name.eq.notify_team,tool_name.eq.classify_text,tool_name.eq.generate_text,tool_name.eq.create_knowledge_article,tool_name.eq.update_knowledge_article)&select=id,tool_name`,
);
const toolIdByName = new Map<string, number>(
  (allHrTools as any[]).map((r) => [r.tool_name, r.id]),
);
summary.tools = { inserted: toolInserts.length };

// ============================================================
// Phase 7: F2 — 3 module-level system skills + skill_tools
// ============================================================
console.log("[F2] module-level system skills");
const existingSkills = await pg(
  "GET",
  `/skills?domain_module_id=in.(${M_CASE},${M_PORTAL},${M_KB})&skill_type=eq.system&select=id,skill_name,domain_module_id`,
);
const existingSkillByModule = new Map<number, any>();
for (const s of existingSkills as any[]) existingSkillByModule.set(s.domain_module_id, s);

const skillDefs = [
  {
    domain_module_id: M_CASE,
    skill_name: "hrsd_case_mgmt_agent",
    description:
      "Agent skill for HRSD-CASE-MGMT: triage inbound HR cases, route to the right owner, draft responses against the knowledge base, and progress the lifecycle. Reads from employees, knowledge_articles, and the inbound payload data_objects (policy attestations, garnishments, compliance assignments, etc.); writes hr_cases and case_categories.",
  },
  {
    domain_module_id: M_PORTAL,
    skill_name: "hrsd_employee_portal_agent",
    description:
      "Agent skill for HRSD-EMPLOYEE-PORTAL: greet employees, surface relevant catalog items and knowledge articles, capture intake details, and submit an HR case on the employee's behalf. Hands off to hrsd_case_mgmt_agent.",
  },
  {
    domain_module_id: M_KB,
    skill_name: "hrsd_knowledge_agent",
    description:
      "Agent skill for HRSD-KNOWLEDGE: surface HR knowledge for search and case-resolution suggestions; draft new articles or updates when a case closure indicates an authoring gap.",
  },
];

const skillByModule = new Map<number, number>();
for (const def of skillDefs) {
  const existing = existingSkillByModule.get(def.domain_module_id);
  if (existing) {
    skillByModule.set(def.domain_module_id, existing.id);
    continue;
  }
  const inserted = await insertReturning("/skills", [
    {
      domain_id: DOMAIN_ID,
      domain_module_id: def.domain_module_id,
      skill_name: def.skill_name,
      skill_type: "system",
      description: def.description,
    },
  ]);
  skillByModule.set(def.domain_module_id, inserted[0].id);
}

// skill_tools
const skillToolPlan: Array<{ module: number; tool: string; level: string; notes: string }> = [
  // hrsd_case_mgmt_agent — full case lifecycle, reads cluster context, notifies
  { module: M_CASE, tool: "query_hr_cases", level: "required", notes: "Read case state, search by category, look up history." },
  { module: M_CASE, tool: "create_hr_case", level: "required", notes: "Create case from inbound channel or escalation." },
  { module: M_CASE, tool: "update_hr_case", level: "required", notes: "Move case through triage / assign / resolve states." },
  { module: M_CASE, tool: "query_case_categories", level: "required", notes: "Resolve taxonomy for triage and routing." },
  { module: M_CASE, tool: "query_employees", level: "required", notes: "Look up requester identity, manager, department." },
  { module: M_CASE, tool: "query_knowledge_articles", level: "required", notes: "Find policy and how-to articles to attach or quote on a case." },
  { module: M_CASE, tool: "notify_person", level: "required", notes: "Notify requester and assignee on state transitions." },
  { module: M_CASE, tool: "classify_text", level: "optional", notes: "AI triage: classify free-text intake into a case category." },
  { module: M_CASE, tool: "generate_text", level: "optional", notes: "Draft a response or close-out summary referencing relevant policy." },
  // hrsd_employee_portal_agent — intake-first, read-heavy
  { module: M_PORTAL, tool: "query_hr_cases", level: "required", notes: "Show the requester's open and recent cases." },
  { module: M_PORTAL, tool: "create_hr_case", level: "required", notes: "Submit a new HR case on the employee's behalf." },
  { module: M_PORTAL, tool: "query_knowledge_articles", level: "required", notes: "Surface a deflection answer before case creation." },
  { module: M_PORTAL, tool: "query_service_requests", level: "required", notes: "Hand off IT-flavored requests to the service catalog." },
  { module: M_PORTAL, tool: "query_employees", level: "required", notes: "Identify the requesting employee and their organizational context." },
  { module: M_PORTAL, tool: "notify_person", level: "required", notes: "Confirm case submission and notify requester of state changes." },
  // hrsd_knowledge_agent — author + serve
  { module: M_KB, tool: "query_knowledge_articles", level: "required", notes: "Search HR articles by keyword, category, or audience." },
  { module: M_KB, tool: "create_knowledge_article", level: "required", notes: "Draft a new article when a case-closure pattern indicates an authoring gap." },
  { module: M_KB, tool: "update_knowledge_article", level: "required", notes: "Refine an existing article based on case feedback." },
  { module: M_KB, tool: "publish_knowledge_article", level: "required", notes: "Transition an article from draft to published once review is complete." },
  { module: M_KB, tool: "query_hr_cases", level: "required", notes: "Read recent closed cases to detect authoring opportunities." },
  { module: M_KB, tool: "query_case_categories", level: "optional", notes: "Tag articles to the case category taxonomy for routing relevance." },
  { module: M_KB, tool: "generate_text", level: "optional", notes: "Draft article copy from a cluster of resolved cases." },
];

const existingSkillTools = await pg(
  "GET",
  `/skill_tools?skill_id=in.(${Array.from(skillByModule.values()).join(",")})&select=skill_id,tool_id`,
);
const existingSkillToolPairs = new Set(
  (existingSkillTools as any[]).map((r) => `${r.skill_id}.${r.tool_id}`),
);
const skillToolRows = [];
for (const p of skillToolPlan) {
  const skillId = skillByModule.get(p.module);
  const toolId = toolIdByName.get(p.tool);
  if (!skillId || !toolId) {
    throw new Error(`Missing skill or tool id for ${p.tool} on module ${p.module}`);
  }
  if (existingSkillToolPairs.has(`${skillId}.${toolId}`)) continue;
  skillToolRows.push({
    skill_id: skillId,
    tool_id: toolId,
    requirement_level: p.level,
    notes: p.notes,
  });
}
const skillToolInserts = await insertReturning("/skill_tools", skillToolRows);
summary.F2 = {
  skillsCreated: skillDefs.length - existingSkillByModule.size,
  skillToolsInserted: skillToolInserts.length,
};

// ============================================================
// Phase 8: E1-E5 — 3 HRSD roles + role_modules + role_permissions
// ============================================================
console.log("[E1-E5] roles + role_modules + role_permissions");
const roleDefs = [
  {
    role_code: "HRSD-AGENT",
    slug: "hrsd_agent",
    role_name: "HR Service Delivery Agent",
    business_function_id: HRSD_FN_ID,
    description:
      "Tier-1 HR case handler. Owns case triage, assignment, response drafting, and resolution within SLA. Coordinates with HRBPs on sensitive cases. Uses :manage on case mgmt plus specific lifecycle gates (triage, resolve); read on portal and knowledge.",
    modules: [
      { id: M_CASE, level: "primary" },
      { id: M_PORTAL, level: "secondary" },
      { id: M_KB, level: "secondary" },
    ],
    permissions: [
      "hrsd-case-mgmt:manage",
      "hrsd-case-mgmt:triage_hr_case",
      "hrsd-case-mgmt:resolve_hr_case",
      "hrsd-employee-portal:read",
      "hrsd-knowledge:read",
    ],
  },
  {
    role_code: "HRSD-MANAGER",
    slug: "hrsd_manager",
    role_name: "HR Service Delivery Manager",
    business_function_id: HRSD_FN_ID,
    description:
      "Runs the HR Service Delivery operation: case-routing rules, SLA configuration, agent assignment policy, escalation pathways. Uses :admin on case mgmt; :manage on portal and knowledge. Permission hierarchy auto-includes all lower tiers and lifecycle gates.",
    modules: [
      { id: M_CASE, level: "primary" },
      { id: M_PORTAL, level: "secondary" },
      { id: M_KB, level: "secondary" },
    ],
    permissions: [
      "hrsd-case-mgmt:admin",
      "hrsd-employee-portal:manage",
      "hrsd-knowledge:manage",
    ],
  },
  {
    role_code: "HRSD-KNOWLEDGE-MANAGER",
    slug: "hrsd_knowledge_manager",
    role_name: "HR Knowledge Manager",
    business_function_id: HRSD_FN_ID,
    description:
      "Owns the HR knowledge base: authoring pipeline, review workflow, publication, retirement. Reads case closures to spot authoring gaps. Uses :admin on knowledge; :read on case mgmt for closure-pattern analysis.",
    modules: [
      { id: M_KB, level: "primary" },
      { id: M_CASE, level: "secondary" },
    ],
    permissions: ["hrsd-knowledge:admin", "hrsd-case-mgmt:read"],
  },
];

const existingRoles = await pg(
  "GET",
  `/roles?role_code=in.(${roleDefs.map((r) => r.role_code).join(",")})&select=id,role_code`,
);
const roleIdByCode = new Map<string, number>(
  (existingRoles as any[]).map((r) => [r.role_code, r.id]),
);
const rolesToInsert = roleDefs
  .filter((r) => !roleIdByCode.has(r.role_code))
  .map((r) => ({
    role_code: r.role_code,
    slug: r.slug,
    role_name: r.role_name,
    business_function_id: r.business_function_id,
    description: r.description,
    origin: "model",
  }));
const roleInserts = await insertReturning("/roles", rolesToInsert);
for (const r of roleInserts) roleIdByCode.set(r.role_code, r.id);

// role_modules
const existingRoleModules = await pg(
  "GET",
  `/role_modules?role_id=in.(${Array.from(roleIdByCode.values()).join(",")})&select=role_id,domain_module_id`,
);
const existingRoleModulePairs = new Set(
  (existingRoleModules as any[]).map((r) => `${r.role_id}.${r.domain_module_id}`),
);
const roleModuleRows = [];
for (const r of roleDefs) {
  const roleId = roleIdByCode.get(r.role_code)!;
  for (const m of r.modules) {
    if (existingRoleModulePairs.has(`${roleId}.${m.id}`)) continue;
    roleModuleRows.push({
      role_id: roleId,
      domain_module_id: m.id,
      interaction_level: m.level,
      notes: "",
    });
  }
}
const roleModuleInserts = await insertReturning("/role_modules", roleModuleRows);

// role_permissions (id is composite text "<role_id>.<permission_id>")
const existingRolePerms = await pg(
  "GET",
  `/role_permissions?role_id=in.(${Array.from(roleIdByCode.values()).join(",")})&select=role_id,permission_id`,
);
const existingRolePermPairs = new Set(
  (existingRolePerms as any[]).map((r) => `${r.role_id}.${r.permission_id}`),
);
const rolePermRows = [];
for (const r of roleDefs) {
  const roleId = roleIdByCode.get(r.role_code)!;
  for (const permName of r.permissions) {
    const permId = permIdByName.get(permName);
    if (!permId) throw new Error(`Missing permission id for ${permName}`);
    const key = `${roleId}.${permId}`;
    if (existingRolePermPairs.has(key)) continue;
    rolePermRows.push({
      role_id: roleId,
      permission_id: permId,
      notes: "",
    });
  }
}
const rolePermInserts = await insertReturning("/role_permissions", rolePermRows);
summary.E = {
  rolesInserted: roleInserts.length,
  roleModulesInserted: roleModuleInserts.length,
  rolePermissionsInserted: rolePermInserts.length,
};

// ============================================================
// Phase 9: F1 — retire legacy skill 68 (domain-level hrsd-system)
// ============================================================
console.log("[F1] retire legacy skill 68");
const legacySkill = await pg(
  "GET",
  `/skills?id=eq.${LEGACY_SKILL_ID}&select=id`,
);
if ((legacySkill as any[]).length) {
  await pg("DELETE", `/skill_tools?skill_id=eq.${LEGACY_SKILL_ID}`);
  await pg("DELETE", `/skills?id=eq.${LEGACY_SKILL_ID}`);
  summary.F1 = "retired";
} else {
  summary.F1 = "already retired";
}

console.log("\n=== SUMMARY ===");
console.log(JSON.stringify(summary, null, 2));
