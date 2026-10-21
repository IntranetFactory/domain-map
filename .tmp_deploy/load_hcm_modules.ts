// HCM audit fix (2026-05-24): M-band load + B10b backfill + E-band roles.
// 1. Creates 3 HCM modules, links capabilities, attaches data_objects, builds starter junction.
// 2. PATCHes lifecycle states with domain_module_id (M5).
// 3. Materializes baseline + workflow-gate permissions for the 3 modules.
// 4. Backfills cross_domain_handoffs.source_domain_module_id and target_domain_module_id (B10b).
// 5. Authors HR roles + role_modules + role_permissions (E1-E6).
// Idempotent throughout: re-reads by natural key before inserting.

type Json = unknown;

const DOMAIN_ID = 54; // HCM
const APP_MODULE_ID = 1001; // domain_map

async function pg(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: Json): Promise<any> {
  const args: Record<string, unknown> = { method, path };
  if (body !== undefined) args.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(args)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) {
    throw new Error(`pg ${method} ${path} failed (${code}): ${err || out}`);
  }
  const trimmed = out.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed);
}

async function ensureModule(code: string, name: string, description: string): Promise<number> {
  const existing = await pg("GET", `/domain_modules?domain_module_code=eq.${encodeURIComponent(code)}&select=id`);
  if (existing && existing.length) return existing[0].id;
  await pg("POST", "/domain_modules", [
    { domain_module_code: code, domain_module_name: name, description, domain_id: DOMAIN_ID },
  ]);
  const reread = await pg("GET", `/domain_modules?domain_module_code=eq.${encodeURIComponent(code)}&select=id`);
  return reread[0].id;
}

async function ensureModuleCapability(moduleId: number, capabilityId: number, notes: string): Promise<void> {
  const existing = await pg(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=eq.${capabilityId}&select=id`,
  );
  if (existing && existing.length) return;
  await pg("POST", "/domain_module_capabilities", [
    { domain_module_id: moduleId, capability_id: capabilityId, notes },
  ]);
}

type Role = "master" | "embedded_master" | "contributor" | "consumer" | "derived";
type Necessity = "required" | "optional";

async function ensureModuleDataObject(
  moduleId: number,
  dataObjectId: number,
  role: Role,
  necessity: Necessity,
  notes: string,
): Promise<void> {
  const existing = await pg(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=eq.${dataObjectId}&select=id`,
  );
  if (existing && existing.length) return;
  await pg("POST", "/domain_module_data_objects", [
    { domain_module_id: moduleId, data_object_id: dataObjectId, role, necessity, notes },
  ]);
}

async function ensureStarter(moduleId: number, position: number, notes: string): Promise<void> {
  const existing = await pg(
    "GET",
    `/domain_starter_modules?domain_id=eq.${DOMAIN_ID}&domain_module_id=eq.${moduleId}&select=id`,
  );
  if (existing && existing.length) return;
  await pg("POST", "/domain_starter_modules", [
    { domain_id: DOMAIN_ID, domain_module_id: moduleId, position, notes },
  ]);
}

async function ensurePermission(
  permName: string,
  description: string,
  tier: "baseline-read" | "baseline-manage" | "baseline-admin" | "workflow-gate" | "override",
  moduleId: number,
): Promise<number> {
  const existing = await pg(
    "GET",
    `/permissions?permission_name=eq.${encodeURIComponent(permName)}&select=id`,
  );
  if (existing && existing.length) return existing[0].id;
  await pg("POST", "/permissions", [
    {
      permission_name: permName,
      description,
      tier,
      domain_module_id: moduleId,
      module_id: APP_MODULE_ID,
    },
  ]);
  const reread = await pg(
    "GET",
    `/permissions?permission_name=eq.${encodeURIComponent(permName)}&select=id`,
  );
  return reread[0].id;
}

async function ensureRole(
  roleCode: string,
  roleName: string,
  slug: string,
  description: string,
  businessFunctionId: number | null,
): Promise<number> {
  const existing = await pg(
    "GET",
    `/roles?role_code=eq.${encodeURIComponent(roleCode)}&select=id`,
  );
  if (existing && existing.length) return existing[0].id;
  const body: Record<string, unknown> = {
    role_code: roleCode,
    role_name: roleName,
    slug,
    description,
    origin: "model",
    module_id: APP_MODULE_ID,
  };
  if (businessFunctionId !== null) body.business_function_id = businessFunctionId;
  await pg("POST", "/roles", [body]);
  const reread = await pg(
    "GET",
    `/roles?role_code=eq.${encodeURIComponent(roleCode)}&select=id`,
  );
  return reread[0].id;
}

async function ensureRoleModule(
  roleId: number,
  moduleId: number,
  interactionLevel: "primary" | "secondary",
  notes: string,
): Promise<void> {
  const existing = await pg(
    "GET",
    `/role_modules?role_id=eq.${roleId}&domain_module_id=eq.${moduleId}&select=id`,
  );
  if (existing && existing.length) return;
  await pg("POST", "/role_modules", [
    { role_id: roleId, domain_module_id: moduleId, interaction_level: interactionLevel, notes },
  ]);
}

async function ensureRolePermission(roleId: number, permissionId: number, notes: string): Promise<void> {
  const existing = await pg(
    "GET",
    `/role_permissions?role_id=eq.${roleId}&permission_id=eq.${permissionId}&select=id`,
  );
  if (existing && existing.length) return;
  await pg("POST", "/role_permissions", [{ role_id: roleId, permission_id: permissionId, notes }]);
}

// ---------------- Module specs ----------------

const CORE_WORKER_DESC =
  "Core worker record: identity, employment lifecycle, contracts, and effective-dated employment events. The system-of-record layer for every employee. Standalone vendors flagship-active here: Workday HCM, SAP SuccessFactors Employee Central, Oracle Cloud HCM, UKG Pro, ADP Workforce Now.";
const ORG_POSITIONS_DESC =
  "Organisation design: org units, positions, and job profiles. Effective-dated org structure with position approval workflow, job-profile authority, and the hierarchical backbone every downstream HR system reads. Foundation for workforce planning and span-of-control analytics.";
const LIFECYCLE_DESC =
  "Employee and manager self-service portal coordinating cross-domain lifecycle: onboarding intake from ATS, lifecycle change requests, leave/absence visibility, and offboarding handoffs to ITSM/IGA/PAYROLL. Workflow surface on top of HCM-CORE-WORKER and HCM-ORG-POSITIONS, no masters of its own.";

const MODULES = [
  { code: "HCM-CORE-WORKER", name: "Core Worker Record", description: CORE_WORKER_DESC },
  { code: "HCM-ORG-POSITIONS", name: "Organisation and Position Management", description: ORG_POSITIONS_DESC },
  { code: "HCM-LIFECYCLE-WORKFLOWS", name: "Employee Lifecycle Workflows", description: LIFECYCLE_DESC },
];

// capability id map (HCM)
const CAP = {
  CORE_HR: 1,
  ORG_MGMT: 2,
  SELF_SERVICE_HR: 3,
  WORKFORCE_PLAN: 4,
  ONBOARDING: 5,
  HR_COMPLIANCE: 6,
  OFFBOARDING: 82,
  APPROVAL_WORKFLOW: 311,
};

// data_object id map
const DO = {
  employees: 31,
  hcm_positions: 32,
  job_profiles: 33,
  org_units: 34,
  employment_contracts: 35,
  employment_events: 36,
  people_kpis: 43,
  asset_lifecycle_events: 55,
  cost_centers: 196,
  skill_profiles: 172,
  engagement_drivers: 183,
  contingent_workers: 186,
  absence_requests: 163,
  users: 748,
};

async function loadModules(): Promise<Record<string, number>> {
  const ids: Record<string, number> = {};
  for (const m of MODULES) {
    ids[m.code] = await ensureModule(m.code, m.name, m.description);
    console.log(`module ${m.code} -> id ${ids[m.code]}`);
  }
  return ids;
}

async function loadModuleCapabilities(ids: Record<string, number>): Promise<void> {
  const CORE = ids["HCM-CORE-WORKER"];
  const ORGP = ids["HCM-ORG-POSITIONS"];
  const LIFE = ids["HCM-LIFECYCLE-WORKFLOWS"];
  const rows: Array<[number, number, string]> = [
    [CORE, CAP.CORE_HR, "Canonical worker record, employment contracts, and effective-dated employment events."],
    [CORE, CAP.HR_COMPLIANCE, "Mandatory worker-level data points for statutory compliance (work auth, tax IDs, contract type)."],
    [ORGP, CAP.ORG_MGMT, "Org units, positions, and job profiles with effective-dated hierarchy and position approval workflow."],
    [ORGP, CAP.WORKFORCE_PLAN, "Position-level capacity and headcount that SWP and FP&A consume for planning."],
    [LIFE, CAP.SELF_SERVICE_HR, "Employee and manager self-service portal: personal data, time-off, life events, manager actions."],
    [LIFE, CAP.ONBOARDING, "HCM-side coordination of onboarding intake from ATS: new-hire stub, document collection trigger, day-one handoff."],
    [LIFE, CAP.OFFBOARDING, "Termination workflows that fan out asset recall, IGA deprovisioning, payroll final-pay, and benefits COBRA."],
    [LIFE, CAP.APPROVAL_WORKFLOW, "Generic approval engine for life events, transfers, and manager-initiated changes."],
  ];
  for (const [m, c, n] of rows) await ensureModuleCapability(m, c, n);
  console.log(`module-capabilities: ${rows.length} ensured`);
}

async function loadModuleDataObjects(ids: Record<string, number>): Promise<void> {
  const CORE = ids["HCM-CORE-WORKER"];
  const ORGP = ids["HCM-ORG-POSITIONS"];
  const LIFE = ids["HCM-LIFECYCLE-WORKFLOWS"];
  type Row = [number, number, Role, Necessity, string];
  const rows: Row[] = [
    // HCM-CORE-WORKER
    [CORE, DO.employees, "master", "required", "Canonical employee record: identity, employment status, manager, position assignment."],
    [CORE, DO.employment_contracts, "master", "required", "Effective-dated contracts: terms, comp basis, work auth, term dates."],
    [CORE, DO.employment_events, "master", "required", "Effective-dated lifecycle events: hire, promotion, transfer, leave, termination."],
    [CORE, DO.cost_centers, "contributor", "required", "HCM contributes the org-unit alignment slice: which workers roll up to which cost_center."],
    [CORE, DO.contingent_workers, "consumer", "optional", "Reads non-employee workforce for unified worker visibility."],
    [CORE, DO.people_kpis, "consumer", "optional", "Surfaces operational HR KPIs on the worker record for managers and HR-business-partners."],
    [CORE, DO.users, "consumer", "required", "Identity link: each employee record is linked to a platform user account."],

    // HCM-ORG-POSITIONS
    [ORGP, DO.hcm_positions, "master", "required", "Position records with approval workflow, FTE, comp band, and effective-dated incumbency."],
    [ORGP, DO.job_profiles, "master", "required", "Catalog of job profiles: title, competencies, family, level, comp range."],
    [ORGP, DO.org_units, "master", "required", "Effective-dated org-unit hierarchy with manager, span of control, and cost-center mapping."],
    [ORGP, DO.cost_centers, "contributor", "required", "ORG-POSITIONS contributes the org-unit-to-cost-center mapping that ERP-FIN consumes."],

    // HCM-LIFECYCLE-WORKFLOWS
    [LIFE, DO.employees, "consumer", "required", "Reads worker record to drive self-service views, manager workflows, and lifecycle handoffs."],
    [LIFE, DO.employment_events, "consumer", "required", "Reads lifecycle events to drive offboarding fan-out (ITSM, IGA, PAYROLL, BEN-ADMIN)."],
    [LIFE, DO.absence_requests, "consumer", "optional", "Reads approved absence_requests to update PTO balances and tenure accruals on the worker record."],
    [LIFE, DO.skill_profiles, "consumer", "optional", "Surfaces skill_profile data on the worker record for self-service and manager views."],
    [LIFE, DO.engagement_drivers, "consumer", "optional", "Surfaces team engagement scores in manager dashboards."],
    [LIFE, DO.asset_lifecycle_events, "contributor", "required", "employee.terminated triggers asset-recall lifecycle events: the canonical leaver pain."],
  ];
  for (const [m, d, r, n, notes] of rows) await ensureModuleDataObject(m, d, r, n, notes);
  console.log(`module-data_objects: ${rows.length} ensured`);
}

async function loadStarterModules(ids: Record<string, number>): Promise<void> {
  await ensureStarter(
    ids["HCM-CORE-WORKER"],
    1,
    "Start here. The worker record, contracts, and employment events are the foundation every other HCM module and downstream HR system depends on. Workday HCM, SAP SuccessFactors, Oracle Cloud HCM, BambooHR all anchor on this.",
  );
  await ensureStarter(
    ids["HCM-ORG-POSITIONS"],
    2,
    "Layered immediately after the worker record. Org units, positions, and job profiles complete the structural model that SWP, COMP-MGMT, and ATS all expect HCM to provide.",
  );
  await ensureStarter(
    ids["HCM-LIFECYCLE-WORKFLOWS"],
    3,
    "Added once core + org are stable. Self-service portal plus onboarding/offboarding orchestration turns the system-of-record into a daily-use surface for employees and managers.",
  );
  console.log("starter-modules: 3 ensured");
}

// ---------------- M5: lifecycle state module assignment ----------------

async function assignLifecycleStateModules(ids: Record<string, number>): Promise<void> {
  const CORE = ids["HCM-CORE-WORKER"];
  const ORGP = ids["HCM-ORG-POSITIONS"];
  const dataObjectToModule: Record<number, number> = {
    [DO.employees]: CORE,
    [DO.employment_contracts]: CORE,
    [DO.employment_events]: CORE,
    [DO.hcm_positions]: ORGP,
    [DO.job_profiles]: ORGP,
    [DO.org_units]: ORGP,
  };
  let patched = 0;
  for (const [doId, modId] of Object.entries(dataObjectToModule)) {
    const states = await pg(
      "GET",
      `/data_object_lifecycle_states?data_object_id=eq.${doId}&domain_module_id=is.null&select=id`,
    );
    for (const s of states || []) {
      await pg("PATCH", `/data_object_lifecycle_states?id=eq.${s.id}`, { domain_module_id: modId });
      patched++;
    }
  }
  console.log(`lifecycle-states: ${patched} patched with domain_module_id`);
}

// ---------------- Permissions ----------------

type PermSpec = { name: string; description: string; tier: "baseline-read" | "baseline-manage" | "baseline-admin" | "workflow-gate"; };

const PERMS_BY_MODULE: Record<string, PermSpec[]> = {
  "HCM-CORE-WORKER": [
    { name: "hcm-core-worker:read", description: "Read access to worker records, contracts, and employment events in HCM-CORE-WORKER.", tier: "baseline-read" },
    { name: "hcm-core-worker:manage", description: "Edit access to worker records, contracts, and events in HCM-CORE-WORKER.", tier: "baseline-manage" },
    { name: "hcm-core-worker:admin", description: "Full admin on HCM-CORE-WORKER including configuration and workflow gates.", tier: "baseline-admin" },
    { name: "hcm-core-worker:activate_employee", description: "Promote a draft employee record to active.", tier: "workflow-gate" },
    { name: "hcm-core-worker:place_on_leave", description: "Move an active employee to on_leave.", tier: "workflow-gate" },
    { name: "hcm-core-worker:suspend_employee", description: "Move an active employee to suspended.", tier: "workflow-gate" },
    { name: "hcm-core-worker:terminate_employee", description: "Move an employee to terminated.", tier: "workflow-gate" },
    { name: "hcm-core-worker:approve_employment_contract", description: "Approve a submitted employment_contract.", tier: "workflow-gate" },
    { name: "hcm-core-worker:sign_employment_contract", description: "Mark an approved employment_contract as signed.", tier: "workflow-gate" },
    { name: "hcm-core-worker:terminate_employment_contract", description: "Terminate an active employment_contract.", tier: "workflow-gate" },
    { name: "hcm-core-worker:approve_employment_event", description: "Approve a submitted employment_event.", tier: "workflow-gate" },
    { name: "hcm-core-worker:post_employment_event", description: "Post an approved employment_event to the worker timeline.", tier: "workflow-gate" },
    { name: "hcm-core-worker:reject_employment_event", description: "Reject a submitted employment_event.", tier: "workflow-gate" },
    { name: "hcm-core-worker:reverse_employment_event", description: "Reverse a posted employment_event.", tier: "workflow-gate" },
  ],
  "HCM-ORG-POSITIONS": [
    { name: "hcm-org-positions:read", description: "Read access to org units, positions, and job profiles in HCM-ORG-POSITIONS.", tier: "baseline-read" },
    { name: "hcm-org-positions:manage", description: "Edit access to org units, positions, and job profiles.", tier: "baseline-manage" },
    { name: "hcm-org-positions:admin", description: "Full admin on HCM-ORG-POSITIONS including workflow gates.", tier: "baseline-admin" },
    { name: "hcm-org-positions:approve_position", description: "Approve a proposed position.", tier: "workflow-gate" },
    { name: "hcm-org-positions:open_position", description: "Move an approved position to open (ready for requisition).", tier: "workflow-gate" },
    { name: "hcm-org-positions:fill_position", description: "Mark a position as filled.", tier: "workflow-gate" },
    { name: "hcm-org-positions:freeze_position", description: "Freeze a position (no hire, no backfill).", tier: "workflow-gate" },
    { name: "hcm-org-positions:eliminate_position", description: "Permanently eliminate a position.", tier: "workflow-gate" },
    { name: "hcm-org-positions:approve_job_profile", description: "Approve a draft job_profile.", tier: "workflow-gate" },
    { name: "hcm-org-positions:activate_job_profile", description: "Activate an approved job_profile (available for posting).", tier: "workflow-gate" },
    { name: "hcm-org-positions:retire_job_profile", description: "Retire an active job_profile.", tier: "workflow-gate" },
    { name: "hcm-org-positions:activate_org_unit", description: "Activate a draft org_unit.", tier: "workflow-gate" },
    { name: "hcm-org-positions:reorganize_org_unit", description: "Move an active org_unit through a reorg.", tier: "workflow-gate" },
    { name: "hcm-org-positions:close_org_unit", description: "Close an org_unit.", tier: "workflow-gate" },
  ],
  "HCM-LIFECYCLE-WORKFLOWS": [
    { name: "hcm-lifecycle-workflows:read", description: "Read access to lifecycle workflow surface in HCM-LIFECYCLE-WORKFLOWS.", tier: "baseline-read" },
    { name: "hcm-lifecycle-workflows:manage", description: "Edit and submit lifecycle workflow actions on behalf of self or reports.", tier: "baseline-manage" },
    { name: "hcm-lifecycle-workflows:admin", description: "Full admin on the lifecycle workflow surface including approval routing.", tier: "baseline-admin" },
  ],
};

async function loadPermissions(ids: Record<string, number>): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  let total = 0;
  for (const [code, specs] of Object.entries(PERMS_BY_MODULE)) {
    const modId = ids[code];
    for (const s of specs) {
      out[s.name] = await ensurePermission(s.name, s.description, s.tier, modId);
      total++;
    }
  }
  console.log(`permissions: ${total} ensured`);
  return out;
}

// ---------------- B10b: cross_domain_handoffs backfill ----------------

async function backfillHandoffModules(ids: Record<string, number>): Promise<void> {
  const CORE = ids["HCM-CORE-WORKER"];
  const ORGP = ids["HCM-ORG-POSITIONS"];
  const LIFE = ids["HCM-LIFECYCLE-WORKFLOWS"];

  // Source side: HCM publishes via trigger_events that live on HCM masters.
  // Derive source module = module holding trigger_events.data_object_id as master.
  const triggerEventToModule: Record<number, number> = {
    [DO.employees]: CORE,
    [DO.employment_contracts]: CORE,
    [DO.employment_events]: CORE,
    [DO.hcm_positions]: ORGP,
    [DO.job_profiles]: ORGP,
    [DO.org_units]: ORGP,
  };

  const outbound = await pg(
    "GET",
    `/cross_domain_handoffs?source_domain_id=eq.${DOMAIN_ID}&source_domain_module_id=is.null&select=id,trigger_event_id,trigger_events(data_object_id)`,
  );
  let outPatched = 0;
  let outAmbiguous = 0;
  for (const h of outbound || []) {
    const eventDoId = h.trigger_events?.data_object_id;
    const modId = triggerEventToModule[eventDoId];
    if (modId) {
      await pg("PATCH", `/cross_domain_handoffs?id=eq.${h.id}`, { source_domain_module_id: modId });
      outPatched++;
    } else {
      outAmbiguous++;
    }
  }
  console.log(`handoffs outbound: ${outPatched} patched, ${outAmbiguous} left null (event data_object not in any HCM module)`);

  // Target side: HCM receives via handoffs whose payload data_object lives in an HCM module.
  // Strongest-role map: master > embedded_master > contributor > consumer > derived.
  const dataObjectToHcmModule: Record<number, number> = {
    [DO.employees]: CORE,
    [DO.employment_contracts]: CORE,
    [DO.employment_events]: CORE,
    [DO.hcm_positions]: ORGP,
    [DO.job_profiles]: ORGP,
    [DO.org_units]: ORGP,
    [DO.cost_centers]: CORE, // contributor in both CORE and ORGP; pick CORE (canonical worker-side cost-center alignment)
    [DO.absence_requests]: LIFE,
    [DO.skill_profiles]: LIFE,
    [DO.engagement_drivers]: LIFE,
    [DO.contingent_workers]: CORE,
    [DO.asset_lifecycle_events]: LIFE,
    [DO.people_kpis]: CORE,
  };

  const inbound = await pg(
    "GET",
    `/cross_domain_handoffs?target_domain_id=eq.${DOMAIN_ID}&target_domain_module_id=is.null&select=id,data_object_id`,
  );
  let inPatched = 0;
  let inUnowned = 0;
  for (const h of inbound || []) {
    const modId = dataObjectToHcmModule[h.data_object_id];
    if (modId) {
      await pg("PATCH", `/cross_domain_handoffs?id=eq.${h.id}`, { target_domain_module_id: modId });
      inPatched++;
    } else {
      inUnowned++;
    }
  }
  console.log(`handoffs inbound: ${inPatched} patched, ${inUnowned} left null (payload data_object not in any HCM module)`);
}

// ---------------- E-band: roles, role_modules, role_permissions ----------------

type RoleSpec = {
  code: string;
  name: string;
  slug: string;
  description: string;
  business_function_id: number | null;
  modules: Array<{ code: string; interaction: "primary" | "secondary"; notes: string }>;
  permissions: string[];
};

const HR_TOP = 3;
const HR_SERVICE_DELIVERY = 76;
const HR_WORKFORCE_PLAN = 81;

const ROLES: RoleSpec[] = [
  {
    code: "HR-HRIS-ADMIN",
    name: "HRIS Administrator",
    slug: "hr_hris_admin",
    description: "Full administrative access across the HCM stack. Owns configuration, security, and workflow routing for the worker record, org design, and the self-service surface.",
    business_function_id: HR_TOP,
    modules: [
      { code: "HCM-CORE-WORKER", interaction: "primary", notes: "Owns the worker record system." },
      { code: "HCM-ORG-POSITIONS", interaction: "primary", notes: "Owns org structure and position governance." },
      { code: "HCM-LIFECYCLE-WORKFLOWS", interaction: "primary", notes: "Owns self-service routing and lifecycle automation." },
    ],
    permissions: [
      "hcm-core-worker:admin",
      "hcm-org-positions:admin",
      "hcm-lifecycle-workflows:admin",
    ],
  },
  {
    code: "HR-PEOPLE-OPS-SPECIALIST",
    name: "People Operations Specialist",
    slug: "hr_people_ops_specialist",
    description: "Day-to-day HR operations: process new hires, lifecycle events, contract changes, and offboarding. Manages the worker record and runs the lifecycle workflow surface for cases that need HR intervention.",
    business_function_id: HR_SERVICE_DELIVERY,
    modules: [
      { code: "HCM-CORE-WORKER", interaction: "primary", notes: "Operational owner of worker-record changes and contract execution." },
      { code: "HCM-LIFECYCLE-WORKFLOWS", interaction: "primary", notes: "Processes lifecycle requests and offboarding fan-outs." },
      { code: "HCM-ORG-POSITIONS", interaction: "secondary", notes: "Reads positions to validate placement decisions; does not own structural changes." },
    ],
    permissions: [
      "hcm-core-worker:manage",
      "hcm-core-worker:activate_employee",
      "hcm-core-worker:place_on_leave",
      "hcm-core-worker:terminate_employee",
      "hcm-core-worker:approve_employment_contract",
      "hcm-core-worker:sign_employment_contract",
      "hcm-core-worker:approve_employment_event",
      "hcm-core-worker:post_employment_event",
      "hcm-lifecycle-workflows:manage",
      "hcm-org-positions:read",
    ],
  },
  {
    code: "HR-BUSINESS-PARTNER",
    name: "HR Business Partner",
    slug: "hr_business_partner",
    description: "Business-aligned HR partner advising leaders on workforce decisions. Has manage rights on the worker record for their scope, reads org and lifecycle data to inform manager coaching, and approves employment events for their client group.",
    business_function_id: HR_TOP,
    modules: [
      { code: "HCM-CORE-WORKER", interaction: "primary", notes: "Manages worker data for their client group." },
      { code: "HCM-ORG-POSITIONS", interaction: "secondary", notes: "Reads org structure and position context to advise leaders." },
      { code: "HCM-LIFECYCLE-WORKFLOWS", interaction: "secondary", notes: "Reviews and routes lifecycle requests within their scope." },
    ],
    permissions: [
      "hcm-core-worker:manage",
      "hcm-core-worker:approve_employment_event",
      "hcm-core-worker:approve_employment_contract",
      "hcm-org-positions:read",
      "hcm-lifecycle-workflows:read",
    ],
  },
  {
    code: "HR-ORG-DESIGN-ANALYST",
    name: "Organisation Design Analyst",
    slug: "hr_org_design_analyst",
    description: "Manages the org structure: designs org units, approves positions, owns job-profile catalog, and supports workforce planning cycles. Reads the worker record for incumbency context but does not edit it.",
    business_function_id: HR_WORKFORCE_PLAN,
    modules: [
      { code: "HCM-ORG-POSITIONS", interaction: "primary", notes: "Owns org-unit design, position approvals, and job-profile catalog." },
      { code: "HCM-CORE-WORKER", interaction: "secondary", notes: "Reads worker record for incumbency context only." },
    ],
    permissions: [
      "hcm-org-positions:manage",
      "hcm-org-positions:approve_position",
      "hcm-org-positions:open_position",
      "hcm-org-positions:freeze_position",
      "hcm-org-positions:eliminate_position",
      "hcm-org-positions:approve_job_profile",
      "hcm-org-positions:activate_job_profile",
      "hcm-org-positions:retire_job_profile",
      "hcm-org-positions:activate_org_unit",
      "hcm-org-positions:reorganize_org_unit",
      "hcm-org-positions:close_org_unit",
      "hcm-core-worker:read",
    ],
  },
  {
    code: "PEOPLE-MANAGER",
    name: "People Manager",
    slug: "people_manager",
    description: "Cross-functional line manager. Reads their team's worker data, raises and approves manager-initiated changes through the self-service surface, and reviews position incumbency. Not HR; lives in any business function.",
    business_function_id: null,
    modules: [
      { code: "HCM-CORE-WORKER", interaction: "secondary", notes: "Reads worker data and lifecycle history for direct reports." },
      { code: "HCM-LIFECYCLE-WORKFLOWS", interaction: "primary", notes: "Initiates and approves lifecycle requests for direct reports via self-service." },
    ],
    permissions: [
      "hcm-core-worker:read",
      "hcm-lifecycle-workflows:manage",
    ],
  },
];

async function loadRoles(modIds: Record<string, number>, permIds: Record<string, number>): Promise<void> {
  for (const r of ROLES) {
    const roleId = await ensureRole(r.code, r.name, r.slug, r.description, r.business_function_id);
    console.log(`role ${r.code} -> id ${roleId}`);
    for (const m of r.modules) {
      const modId = modIds[m.code];
      if (!modId) throw new Error(`unknown module code ${m.code} on role ${r.code}`);
      await ensureRoleModule(roleId, modId, m.interaction, m.notes);
    }
    for (const p of r.permissions) {
      const pid = permIds[p];
      if (!pid) throw new Error(`unknown permission ${p} on role ${r.code}`);
      await ensureRolePermission(roleId, pid, "");
    }
  }
  console.log(`roles: ${ROLES.length} ensured, role_modules + role_permissions linked`);
}

// ---------------- main ----------------

async function main() {
  console.log("=== HCM fix: modules + capabilities + data_objects + starter ===");
  const ids = await loadModules();
  await loadModuleCapabilities(ids);
  await loadModuleDataObjects(ids);
  await loadStarterModules(ids);

  console.log("\n=== M5: lifecycle state module assignment ===");
  await assignLifecycleStateModules(ids);

  console.log("\n=== Permissions ===");
  const permIds = await loadPermissions(ids);

  console.log("\n=== B10b: cross_domain_handoffs backfill ===");
  await backfillHandoffModules(ids);

  console.log("\n=== E-band: roles, role_modules, role_permissions ===");
  await loadRoles(ids, permIds);

  console.log("\nHCM audit fix complete.");
}

await main();
