// WORK-MGMT Phase-E + B9b + B9-gap closeout.
//
// Covers the remaining Bucket-1 items from audits/WORK-MGMT.md:
//  - 3 missing trigger events (okr_objective.committed, okr_objective.scored, work_automation.enabled)
//  - 11 permissions (baseline triad + 5 workflow gates across mods 149/150)
//  - 4 roles + 8 role_modules + 9 role_permissions
//  - 4 intra-domain handoffs (TASK-EXEC <-> GOALS-OKR cross-module flows)
//
// Idempotent: each section reads existing rows by natural key (event_name /
// permission_name / role_code / (key) for handoffs) and inserts only what's missing.
// record_status omitted on all inserts so the DB default ("new") wins. Per Rule #1
// nothing is auto-approved.

const MODULE_ID = 1001; // domain_map module
const DOMAIN_ID = 135;
const MOD_TASK_EXEC = 149;
const MOD_GOALS_OKR = 150;
const BFN_BUSINESS_OPS = 34;
const BFN_MARKETING = 22;
const DO_WORK_ITEMS = 243;
const DO_WORK_PROJECTS = 244;
const DO_OKR_OBJECTIVES = 245;
const DO_WORK_AUTOMATIONS = 246;

const EVENT_WORK_ITEM_COMPLETED = 148;
const EVENT_WORK_ITEM_STATUS_CHANGED = 149;
const EVENT_WORK_AUTOMATION_TRIGGERED = 870;

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
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify({ method: "POST", path, body, headers: { Prefer: "return=representation" } })],
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

// ---- 1. Trigger events --------------------------------------------------

interface TriggerEvent {
  id: number;
  event_name: string;
  data_object_id: number;
  from_state: string;
  to_state: string;
  event_category: string;
  description: string;
  domain_module_id: number | null;
}

const proposedEvents: Array<Omit<TriggerEvent, "id">> = [
  {
    event_name: "okr_objective.committed",
    data_object_id: DO_OKR_OBJECTIVES,
    from_state: "drafted",
    to_state: "committed",
    event_category: "lifecycle",
    description: "A team-execution OKR is committed: KRs are finalized, owners set, and downstream task-creation / KR-to-task linking may now happen. Subscribers in TASK-EXEC create placeholder work_items or link existing ones to the freshly-committed KRs.",
    domain_module_id: MOD_GOALS_OKR,
  },
  {
    event_name: "okr_objective.scored",
    data_object_id: DO_OKR_OBJECTIVES,
    from_state: "in_progress",
    to_state: "scored",
    event_category: "lifecycle",
    description: "A team-execution OKR is scored at end-of-cycle. Scoring is the cadence ritual on the WORK-MGMT side (Asana / Monday / ClickUp Goals models); distinct from TALENT-MGMT-side grading which is tied to performance review compensation. Cascades to dependent work_items closure and dashboard rollup.",
    domain_module_id: MOD_GOALS_OKR,
  },
  {
    event_name: "work_automation.enabled",
    data_object_id: DO_WORK_AUTOMATIONS,
    from_state: "drafted",
    to_state: "enabled",
    event_category: "lifecycle",
    description: "An automation rule is enabled and begins firing on matching events. Audit observers and downstream surfaces (WSC, PSA, PROD-MGMT) may subscribe to know which rules are active in a tenant.",
    domain_module_id: MOD_TASK_EXEC,
  },
];

const existingEvents = await get<TriggerEvent>(
  "/trigger_events?event_name=in.(%22okr_objective.committed%22,%22okr_objective.scored%22,%22work_automation.enabled%22)&select=id,event_name",
);
const existingEventNames = new Set(existingEvents.map((e) => e.event_name));
const newEvents = proposedEvents.filter((e) => !existingEventNames.has(e.event_name));
let insertedEvents: TriggerEvent[] = [];
if (newEvents.length > 0) {
  insertedEvents = await postReturning<TriggerEvent>("/trigger_events", newEvents);
  console.log(`Inserted ${insertedEvents.length} trigger_events: ${insertedEvents.map((e) => e.event_name).join(", ")}`);
} else {
  console.log("All 3 trigger_events already present; skipping insert.");
}

const eventIdByName = new Map<string, number>();
for (const e of [...existingEvents, ...insertedEvents]) eventIdByName.set(e.event_name, e.id);

// ---- 2. Permissions -----------------------------------------------------

interface Permission {
  id: number;
  permission_name: string;
  tier: string;
  domain_module_id: number;
}

const proposedPerms: Array<Omit<Permission, "id"> & { description: string; module_id: number }> = [
  // WORK-MGMT-TASK-EXEC (149) — baseline triad
  { permission_name: "work-mgmt-task-exec:read", tier: "baseline-read", domain_module_id: MOD_TASK_EXEC, module_id: MODULE_ID,
    description: "Read access to work items, projects, and automation rules within the Task and Project Execution module." },
  { permission_name: "work-mgmt-task-exec:manage", tier: "baseline-manage", domain_module_id: MOD_TASK_EXEC, module_id: MODULE_ID,
    description: "Create / edit work items and projects, run authored automations. Default IC tier." },
  { permission_name: "work-mgmt-task-exec:admin", tier: "baseline-admin", domain_module_id: MOD_TASK_EXEC, module_id: MODULE_ID,
    description: "Full administrative control over task / project / automation surface; expands to every workflow-gate via permission_hierarchy." },
  // WORK-MGMT-TASK-EXEC (149) — workflow gates
  { permission_name: "work-mgmt-task-exec:complete_work_project", tier: "workflow-gate", domain_module_id: MOD_TASK_EXEC, module_id: MODULE_ID,
    description: "Marks a work_project terminal (completed). Gates the active -> completed lifecycle transition; lower tiers can mark items done but not the parent project." },
  { permission_name: "work-mgmt-task-exec:enable_work_automation", tier: "workflow-gate", domain_module_id: MOD_TASK_EXEC, module_id: MODULE_ID,
    description: "Activates a drafted automation rule. Gates the drafted -> enabled transition so a rule with downstream blast radius can't fire without an authorized review." },
  { permission_name: "work-mgmt-task-exec:disable_work_automation", tier: "workflow-gate", domain_module_id: MOD_TASK_EXEC, module_id: MODULE_ID,
    description: "Disables an active automation rule. Distinct from enable (different blast-radius profile: stopping vs starting cascade)." },
  // WORK-MGMT-GOALS-OKR (150) — baseline triad
  { permission_name: "work-mgmt-goals-okr:read", tier: "baseline-read", domain_module_id: MOD_GOALS_OKR, module_id: MODULE_ID,
    description: "Read access to OKR objectives, key results, and progress rollups within the Team-Execution Goals and OKRs module." },
  { permission_name: "work-mgmt-goals-okr:manage", tier: "baseline-manage", domain_module_id: MOD_GOALS_OKR, module_id: MODULE_ID,
    description: "Draft and edit OKR objectives and KRs; record check-ins. Default IC tier for OKR contributors." },
  { permission_name: "work-mgmt-goals-okr:admin", tier: "baseline-admin", domain_module_id: MOD_GOALS_OKR, module_id: MODULE_ID,
    description: "Full administrative control over the OKR surface; expands to commit / score workflow gates via permission_hierarchy." },
  // WORK-MGMT-GOALS-OKR (150) — workflow gates
  { permission_name: "work-mgmt-goals-okr:commit_okr_objective", tier: "workflow-gate", domain_module_id: MOD_GOALS_OKR, module_id: MODULE_ID,
    description: "Commits a drafted OKR, locking KRs and unlocking downstream task linking. Gates the drafted -> committed transition; lower tiers can draft but not commit." },
  { permission_name: "work-mgmt-goals-okr:score_okr_objective", tier: "workflow-gate", domain_module_id: MOD_GOALS_OKR, module_id: MODULE_ID,
    description: "Scores an in-progress OKR at end-of-cycle. Distinct from TALENT-MGMT-side grading (which is tied to performance review). Gates the in_progress -> scored transition." },
];

const existingPerms = await get<Permission>(
  `/permissions?domain_module_id=in.(${MOD_TASK_EXEC},${MOD_GOALS_OKR})&select=id,permission_name,tier,domain_module_id`,
);
const existingPermNames = new Set(existingPerms.map((p) => p.permission_name));
const newPerms = proposedPerms.filter((p) => !existingPermNames.has(p.permission_name));
let insertedPerms: Permission[] = [];
if (newPerms.length > 0) {
  insertedPerms = await postReturning<Permission>("/permissions", newPerms);
  console.log(`Inserted ${insertedPerms.length} permissions.`);
} else {
  console.log("All 11 permissions already present; skipping insert.");
}

const permIdByName = new Map<string, number>();
for (const p of [...existingPerms, ...insertedPerms]) permIdByName.set(p.permission_name, p.id);

// ---- 3. Roles -----------------------------------------------------------

interface Role {
  id: number;
  role_code: string;
  role_name: string;
  slug: string;
  business_function_id: number | null;
}

const proposedRoles: Array<Omit<Role, "id"> & { description: string; origin: string; module_id: number }> = [
  {
    role_code: "OPERATIONS-WORK-PROGRAM-LEAD",
    role_name: "Work Program Lead",
    slug: "operations_work_program_lead",
    business_function_id: BFN_BUSINESS_OPS,
    description: "PMO / BizOps lead who owns cross-team programs in WORK-MGMT. Coordinates project portfolios, owns escalations, and rolls up OKR progress from linked work_items. Primary on TASK-EXEC, secondary on GOALS-OKR for visibility into the strategic-alignment surface.",
    origin: "model",
    module_id: MODULE_ID,
  },
  {
    role_code: "OPERATIONS-WORK-CONTRIBUTOR",
    role_name: "Work Contributor",
    slug: "operations_work_contributor",
    business_function_id: BFN_BUSINESS_OPS,
    description: "Default IC seat — assigned work_items, files updates, may author automations within their projects. Primary on TASK-EXEC, secondary read access on GOALS-OKR so they can see the OKR context for their work.",
    origin: "model",
    module_id: MODULE_ID,
  },
  {
    role_code: "MARKETING-CAMPAIGN-MANAGER",
    role_name: "Campaign Manager",
    slug: "marketing_campaign_manager",
    business_function_id: BFN_MARKETING,
    description: "Most-cited cross-functional WORK-MGMT persona (Workfront / Asana / Wrike marketing buyer). Runs campaign projects with creative review workflow. Primary on TASK-EXEC, secondary read on GOALS-OKR for campaign-to-marketing-OKR alignment.",
    origin: "model",
    module_id: MODULE_ID,
  },
  {
    role_code: "OKR-OWNER",
    role_name: "OKR Owner",
    slug: "okr_owner",
    business_function_id: null,
    description: "Owns an objective; commits KRs and links them to work_items for progress rollup. Cross-functional by construction (Sales, Marketing, Engineering, Operations leaders all do this). Primary on GOALS-OKR, secondary read on TASK-EXEC. IC-tier on the OKR module (manage + explicit commit gate) since OKR-Owners aren't OKR-module admins.",
    origin: "model",
    module_id: MODULE_ID,
  },
];

const existingRoles = await get<Role>(
  `/roles?role_code=in.(%22OPERATIONS-WORK-PROGRAM-LEAD%22,%22OPERATIONS-WORK-CONTRIBUTOR%22,%22MARKETING-CAMPAIGN-MANAGER%22,%22OKR-OWNER%22)&select=id,role_code,role_name,slug,business_function_id`,
);
const existingRoleCodes = new Set(existingRoles.map((r) => r.role_code));
const newRoles = proposedRoles.filter((r) => !existingRoleCodes.has(r.role_code));
let insertedRoles: Role[] = [];
if (newRoles.length > 0) {
  insertedRoles = await postReturning<Role>("/roles", newRoles);
  console.log(`Inserted ${insertedRoles.length} roles.`);
} else {
  console.log("All 4 roles already present; skipping insert.");
}

const roleIdByCode = new Map<string, number>();
for (const r of [...existingRoles, ...insertedRoles]) roleIdByCode.set(r.role_code, r.id);

// ---- 4. role_modules ----------------------------------------------------

interface RoleModule {
  id: number;
  role_id: number;
  domain_module_id: number;
  interaction_level: string;
}

const proposedRMs: Array<Omit<RoleModule, "id">> = [
  { role_id: roleIdByCode.get("OPERATIONS-WORK-PROGRAM-LEAD")!, domain_module_id: MOD_TASK_EXEC, interaction_level: "primary" },
  { role_id: roleIdByCode.get("OPERATIONS-WORK-PROGRAM-LEAD")!, domain_module_id: MOD_GOALS_OKR, interaction_level: "secondary" },
  { role_id: roleIdByCode.get("OPERATIONS-WORK-CONTRIBUTOR")!, domain_module_id: MOD_TASK_EXEC, interaction_level: "primary" },
  { role_id: roleIdByCode.get("OPERATIONS-WORK-CONTRIBUTOR")!, domain_module_id: MOD_GOALS_OKR, interaction_level: "secondary" },
  { role_id: roleIdByCode.get("MARKETING-CAMPAIGN-MANAGER")!, domain_module_id: MOD_TASK_EXEC, interaction_level: "primary" },
  { role_id: roleIdByCode.get("MARKETING-CAMPAIGN-MANAGER")!, domain_module_id: MOD_GOALS_OKR, interaction_level: "secondary" },
  { role_id: roleIdByCode.get("OKR-OWNER")!, domain_module_id: MOD_GOALS_OKR, interaction_level: "primary" },
  { role_id: roleIdByCode.get("OKR-OWNER")!, domain_module_id: MOD_TASK_EXEC, interaction_level: "secondary" },
];

const roleIds = Array.from(roleIdByCode.values());
const existingRMs = await get<RoleModule>(
  `/role_modules?role_id=in.(${roleIds.join(",")})&select=id,role_id,domain_module_id,interaction_level`,
);
const rmKey = (r: { role_id: number; domain_module_id: number }) => `${r.role_id}:${r.domain_module_id}`;
const existingRMKeys = new Set(existingRMs.map(rmKey));
const newRMs = proposedRMs.filter((r) => !existingRMKeys.has(rmKey(r)));
if (newRMs.length > 0) {
  const inserted = await postReturning<RoleModule>("/role_modules", newRMs);
  console.log(`Inserted ${inserted.length} role_modules.`);
} else {
  console.log("All 8 role_modules already present; skipping insert.");
}

// ---- 5. role_permissions ------------------------------------------------

interface RolePermission {
  id: number;
  role_id: number;
  permission_id: number;
}

const bundleSpec: Array<[string, string[]]> = [
  ["OPERATIONS-WORK-PROGRAM-LEAD", ["work-mgmt-task-exec:admin", "work-mgmt-goals-okr:manage"]],
  ["OPERATIONS-WORK-CONTRIBUTOR", ["work-mgmt-task-exec:manage", "work-mgmt-goals-okr:read"]],
  ["MARKETING-CAMPAIGN-MANAGER", ["work-mgmt-task-exec:admin", "work-mgmt-goals-okr:read"]],
  ["OKR-OWNER", ["work-mgmt-goals-okr:admin", "work-mgmt-task-exec:read", "work-mgmt-goals-okr:commit_okr_objective"]],
];

const proposedRPs: Array<Omit<RolePermission, "id">> = [];
for (const [roleCode, permNames] of bundleSpec) {
  const roleId = roleIdByCode.get(roleCode);
  if (!roleId) throw new Error(`Role ${roleCode} not found`);
  for (const pn of permNames) {
    const permId = permIdByName.get(pn);
    if (!permId) throw new Error(`Permission ${pn} not found`);
    proposedRPs.push({ role_id: roleId, permission_id: permId });
  }
}

const permIds = Array.from(permIdByName.values());
const existingRPs = await get<RolePermission>(
  `/role_permissions?and=(role_id.in.(${roleIds.join(",")}),permission_id.in.(${permIds.join(",")}))&select=id,role_id,permission_id`,
);
const rpKey = (r: { role_id: number; permission_id: number }) => `${r.role_id}:${r.permission_id}`;
const existingRPKeys = new Set(existingRPs.map(rpKey));
const newRPs = proposedRPs.filter((r) => !existingRPKeys.has(rpKey(r)));
if (newRPs.length > 0) {
  const inserted = await postReturning<RolePermission>("/role_permissions", newRPs);
  console.log(`Inserted ${inserted.length} role_permissions.`);
} else {
  console.log("All 9 role_permissions already present; skipping insert.");
}

// ---- 6. Intra-domain handoffs (B9b) ------------------------------------

interface Handoff {
  id: number;
  source_domain_id: number;
  target_domain_id: number;
  source_domain_module_id: number;
  target_domain_module_id: number;
  trigger_event_id: number;
  data_object_id: number;
}

const eventCommittedId = eventIdByName.get("okr_objective.committed")!;
if (!eventCommittedId) throw new Error("okr_objective.committed event id missing");

const proposedHandoffs: Array<Omit<Handoff, "id"> & { integration_pattern: string; friction_level: string; description: string; notes: string }> = [
  {
    source_domain_id: DOMAIN_ID, target_domain_id: DOMAIN_ID,
    source_domain_module_id: MOD_TASK_EXEC, target_domain_module_id: MOD_GOALS_OKR,
    trigger_event_id: EVENT_WORK_ITEM_STATUS_CHANGED, data_object_id: DO_WORK_ITEMS,
    integration_pattern: "lifecycle_progression", friction_level: "low",
    description: "Work item status change triggers KR progress recalculation in GOALS-OKR for any objective that has linked the item to a key result. In-process FK + state read; no message moves.",
    notes: "",
  },
  {
    source_domain_id: DOMAIN_ID, target_domain_id: DOMAIN_ID,
    source_domain_module_id: MOD_TASK_EXEC, target_domain_module_id: MOD_GOALS_OKR,
    trigger_event_id: EVENT_WORK_ITEM_COMPLETED, data_object_id: DO_WORK_ITEMS,
    integration_pattern: "lifecycle_progression", friction_level: "low",
    description: "Terminal completion of a work item is the strongest progress signal — drives KR closure recalculation and triggers KR-fully-met evaluations on linked objectives.",
    notes: "",
  },
  {
    source_domain_id: DOMAIN_ID, target_domain_id: DOMAIN_ID,
    source_domain_module_id: MOD_GOALS_OKR, target_domain_module_id: MOD_TASK_EXEC,
    trigger_event_id: eventCommittedId, data_object_id: DO_OKR_OBJECTIVES,
    integration_pattern: "lifecycle_progression", friction_level: "low",
    description: "Committing an OKR unlocks KR-to-work_item linking and optionally auto-creates placeholder work_items per the objective's templates. Reverse direction of the rollup flow.",
    notes: "",
  },
  {
    source_domain_id: DOMAIN_ID, target_domain_id: DOMAIN_ID,
    source_domain_module_id: MOD_TASK_EXEC, target_domain_module_id: MOD_GOALS_OKR,
    trigger_event_id: EVENT_WORK_AUTOMATION_TRIGGERED, data_object_id: DO_WORK_AUTOMATIONS,
    integration_pattern: "event_stream", friction_level: "low",
    description: "Automation rules can drive OKR check-in updates or auto-progress KRs based on work_item events. Eventful (out-of-process at runtime) because automation execution decouples from the caller.",
    notes: "",
  },
];

// Idempotency: handoffs has no obvious natural-key column for us, use composite filter.
const existingHandoffs = await get<Handoff>(
  `/handoffs?and=(source_domain_id.eq.${DOMAIN_ID},target_domain_id.eq.${DOMAIN_ID})&trigger_event_id=in.(${EVENT_WORK_ITEM_STATUS_CHANGED},${EVENT_WORK_ITEM_COMPLETED},${EVENT_WORK_AUTOMATION_TRIGGERED},${eventCommittedId})&select=id,source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id`,
);
const hoKey = (h: { source_domain_module_id: number; target_domain_module_id: number; trigger_event_id: number; data_object_id: number }) =>
  `${h.source_domain_module_id}:${h.target_domain_module_id}:${h.trigger_event_id}:${h.data_object_id}`;
const existingHoKeys = new Set(existingHandoffs.map(hoKey));
const newHandoffs = proposedHandoffs.filter((h) => !existingHoKeys.has(hoKey(h)));
if (newHandoffs.length > 0) {
  const inserted = await postReturning<Handoff>("/handoffs", newHandoffs);
  console.log(`Inserted ${inserted.length} intra-domain handoffs.`);
} else {
  console.log("All 4 intra-domain handoffs already present; skipping insert.");
}

// ---- Verification --------------------------------------------------------

console.log("\n=== Verification ===");

const finalCounts = await Promise.all([
  get<unknown>(`/trigger_events?event_name=in.(%22okr_objective.committed%22,%22okr_objective.scored%22,%22work_automation.enabled%22)&select=event_name`),
  get<unknown>(`/permissions?domain_module_id=in.(${MOD_TASK_EXEC},${MOD_GOALS_OKR})&select=permission_name`),
  get<unknown>(`/roles?role_code=in.(%22OPERATIONS-WORK-PROGRAM-LEAD%22,%22OPERATIONS-WORK-CONTRIBUTOR%22,%22MARKETING-CAMPAIGN-MANAGER%22,%22OKR-OWNER%22)&select=role_code`),
  get<unknown>(`/role_modules?role_id=in.(${roleIds.join(",")})&select=role_id`),
  get<unknown>(`/role_permissions?role_id=in.(${roleIds.join(",")})&select=role_id`),
  get<unknown>(`/handoffs?and=(source_domain_id.eq.${DOMAIN_ID},target_domain_id.eq.${DOMAIN_ID})&select=id`),
]);

console.log(`trigger_events (new 3): ${finalCounts[0].length}/3`);
console.log(`permissions (11):       ${finalCounts[1].length}/11`);
console.log(`roles (4):              ${finalCounts[2].length}/4`);
console.log(`role_modules (8):       ${finalCounts[3].length}/8`);
console.log(`role_permissions (9):   ${finalCounts[4].length}/9`);
console.log(`intra-domain handoffs:  ${finalCounts[5].length}/4`);

// Path A / Path B agreement check (E5).
const pathA = await get<{ role_id: number; domain_module_id: number }>(
  `/role_modules?role_id=in.(${roleIds.join(",")})&select=role_id,domain_module_id`,
);
const pathB = await get<{ role_id: number; permission: { domain_module_id: number } }>(
  `/role_permissions?role_id=in.(${roleIds.join(",")})&select=role_id,permission:permissions(domain_module_id)`,
);
const aSet = new Map<number, Set<number>>();
for (const r of pathA) {
  if (!aSet.has(r.role_id)) aSet.set(r.role_id, new Set());
  aSet.get(r.role_id)!.add(r.domain_module_id);
}
const bSet = new Map<number, Set<number>>();
for (const r of pathB) {
  if (!bSet.has(r.role_id)) bSet.set(r.role_id, new Set());
  if (r.permission?.domain_module_id) bSet.get(r.role_id)!.add(r.permission.domain_module_id);
}
let agreement = true;
for (const roleId of roleIds) {
  const a = aSet.get(roleId) ?? new Set();
  const b = bSet.get(roleId) ?? new Set();
  const same = a.size === b.size && [...a].every((m) => b.has(m));
  if (!same) {
    console.log(`✗ Path A != Path B for role ${roleId}: A=${[...a]} B=${[...b]}`);
    agreement = false;
  }
}
if (agreement) console.log("✓ E5 Path A / Path B agreement: every role's role_modules and bundle target the same module set.");
