// SWP audit fix loader (2026-05-25)
// Fixes: A2, M6, B4, B6, B7, B8, B10b, B11, B12, E1-E6
// Idempotent: every read-by-natural-key, insert-missing-only, then re-read for FK map.

type Row = Record<string, unknown>;

async function semantius(method: string, path: string, body?: unknown): Promise<unknown> {
  const args: Record<string, unknown> = { method, path };
  if (body !== undefined) args.body = body;
  const p = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(args)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(p.stdout).text(),
    new Response(p.stderr).text(),
  ]);
  const code = await p.exited;
  if (code !== 0) {
    throw new Error(`semantius failed (exit ${code}): ${stderr || stdout}`);
  }
  if (!stdout.trim()) return [];
  return JSON.parse(stdout);
}

async function get(path: string): Promise<Row[]> {
  return (await semantius("GET", path)) as Row[];
}

async function post(table: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += 40) {
    const chunk = rows.slice(i, i + 40);
    const r = (await semantius("POST", `/${table}`, chunk)) as Row[];
    out.push(...r);
  }
  return out;
}

async function patch(path: string, body: Row): Promise<void> {
  await semantius("PATCH", path, body);
}

// ---------- Phase A: Capabilities + capability_domains + domain_module_capabilities ----------

const SWP_ID = 100;
const MOD = {
  DEMAND_FORECAST: 94,
  SUPPLY_PLANNING: 95,
  SCENARIO_MODELING: 96,
  COST_PROJECTIONS: 97,
};

const CAPABILITIES = [
  {
    capability_code: "SWP-DEMAND-PLANNING",
    capability_name: "Workforce Demand Planning",
    description: "Multi-year headcount, position, and skill demand modeling driven by business strategy, growth assumptions, and productivity targets.",
    realizing_modules: [MOD.DEMAND_FORECAST],
  },
  {
    capability_code: "SWP-SUPPLY-MODELING",
    capability_name: "Workforce Supply Modeling",
    description: "Internal-mobility, retirement curve, attrition baseline, and gap reconciliation modeling that builds the supply side of the workforce plan.",
    realizing_modules: [MOD.SUPPLY_PLANNING],
  },
  {
    capability_code: "SWP-SCENARIO-MODELING",
    capability_name: "Workforce Scenario Modeling",
    description: "What-if scenario modeling (growth, restructure, geography shift, skill pivot, cost optimization) with cascade analysis into HCM, EPM, and downstream cost projections.",
    realizing_modules: [MOD.SCENARIO_MODELING],
  },
  {
    capability_code: "SWP-SKILLS-GAP-ANALYSIS",
    capability_name: "Skills Gap Analysis",
    description: "Identify capability shortfalls between current workforce skills inventory and future-state demand, with prioritized build / buy / borrow recommendations.",
    realizing_modules: [MOD.DEMAND_FORECAST],
  },
  {
    capability_code: "SWP-LABOR-MARKET-INTELLIGENCE",
    capability_name: "Labor Market Intelligence",
    description: "External labor-market data overlay: salary medians, supply-demand index, attrition baselines, and competitive intelligence by job family and location.",
    realizing_modules: [MOD.SCENARIO_MODELING],
  },
  {
    capability_code: "SWP-ORG-DESIGN",
    capability_name: "Organizational Design",
    description: "Org-structure modeling, reporting-line alternatives, span-of-control optimization, and approved org designs that cascade into HCM org changes.",
    realizing_modules: [MOD.SCENARIO_MODELING],
  },
  {
    capability_code: "SWP-WORKFORCE-COSTING",
    capability_name: "Workforce Cost Projection",
    description: "Loaded-comp cost projections by cost_center, job_profile, and location across the planning horizon, with handoff to EPM for the consolidated budget.",
    realizing_modules: [MOD.COST_PROJECTIONS],
  },
  {
    capability_code: "SWP-PLAN-RECONCILIATION",
    capability_name: "Plan-to-Actual Reconciliation",
    description: "Reconciliation of workforce plans against actuals (HCM headcount, WFM time-and-attendance, ATS requisition fill rate) to drive plan refresh cycles.",
    realizing_modules: [MOD.SUPPLY_PLANNING],
  },
];

async function loadCapabilities(): Promise<Record<string, number>> {
  const codes = CAPABILITIES.map((c) => `"${c.capability_code}"`).join(",");
  const existing = await get(`/capabilities?capability_code=in.(${codes})&select=id,capability_code`);
  const have = new Map(existing.map((r) => [r.capability_code as string, r.id as number]));
  const toInsert = CAPABILITIES.filter((c) => !have.has(c.capability_code)).map((c) => ({
    capability_code: c.capability_code,
    capability_name: c.capability_name,
    description: c.description,
  }));
  await post("capabilities", toInsert);
  const fresh = await get(`/capabilities?capability_code=in.(${codes})&select=id,capability_code`);
  const map: Record<string, number> = {};
  for (const r of fresh) map[r.capability_code as string] = r.id as number;
  return map;
}

async function loadCapabilityDomains(capMap: Record<string, number>): Promise<void> {
  const ids = Object.values(capMap);
  const existing = await get(`/capability_domains?domain_id=eq.${SWP_ID}&capability_id=in.(${ids.join(",")})&select=capability_id`);
  const have = new Set(existing.map((r) => r.capability_id as number));
  const toInsert = ids.filter((id) => !have.has(id)).map((id) => ({ capability_id: id, domain_id: SWP_ID }));
  await post("capability_domains", toInsert);
}

async function loadDomainModuleCapabilities(capMap: Record<string, number>): Promise<void> {
  const wanted: { domain_module_id: number; capability_id: number }[] = [];
  for (const c of CAPABILITIES) {
    const cid = capMap[c.capability_code];
    for (const mid of c.realizing_modules) wanted.push({ domain_module_id: mid, capability_id: cid });
  }
  const modIds = [...new Set(wanted.map((w) => w.domain_module_id))].join(",");
  const capIds = [...new Set(wanted.map((w) => w.capability_id))].join(",");
  const existing = await get(`/domain_module_capabilities?domain_module_id=in.(${modIds})&capability_id=in.(${capIds})&select=domain_module_id,capability_id`);
  const haveKey = new Set(existing.map((r) => `${r.domain_module_id}:${r.capability_id}`));
  const toInsert = wanted.filter((w) => !haveKey.has(`${w.domain_module_id}:${w.capability_id}`));
  await post("domain_module_capabilities", toInsert);
}

// ---------- Phase B: Permissions + Lifecycle states + Pattern flags + Config-shape notes ----------

const MODULE_CODE_BY_ID: Record<number, string> = {
  [MOD.DEMAND_FORECAST]: "swp-demand-forecast",
  [MOD.SUPPLY_PLANNING]: "swp-supply-planning",
  [MOD.SCENARIO_MODELING]: "swp-scenario-modeling",
  [MOD.COST_PROJECTIONS]: "swp-cost-projections",
};

const MODULE_NAME_BY_ID: Record<number, string> = {
  [MOD.DEMAND_FORECAST]: "SWP-DEMAND-FORECAST",
  [MOD.SUPPLY_PLANNING]: "SWP-SUPPLY-PLANNING",
  [MOD.SCENARIO_MODELING]: "SWP-SCENARIO-MODELING",
  [MOD.COST_PROJECTIONS]: "SWP-COST-PROJECTIONS",
};

const BASELINE_PERMISSIONS = [
  MOD.DEMAND_FORECAST,
  MOD.SUPPLY_PLANNING,
  MOD.SCENARIO_MODELING,
  MOD.COST_PROJECTIONS,
].flatMap((mid) => {
  const code = MODULE_CODE_BY_ID[mid];
  const name = MODULE_NAME_BY_ID[mid];
  return [
    {
      permission_name: `${code}:read`,
      description: `Read access to every entity in the ${name} module.`,
      domain_module_id: mid,
      module_id: 1001,
      tier: "baseline-read",
    },
    {
      permission_name: `${code}:manage`,
      description: `Edit operational records in the ${name} module.`,
      domain_module_id: mid,
      module_id: 1001,
      tier: "baseline-manage",
    },
    {
      permission_name: `${code}:admin`,
      description: `Edit reference data in the ${name} module and inherit every workflow gate below via permission_hierarchy.`,
      domain_module_id: mid,
      module_id: 1001,
      tier: "baseline-admin",
    },
  ];
});

// data_object_id, master module, states
type StateSpec = {
  state_name: string;
  state_order: number;
  is_initial?: boolean;
  is_terminal?: boolean;
  requires_permission?: boolean;
  permission_verb_override?: string;
  description?: string;
};
type MasterStates = {
  data_object_id: number;
  data_object_name: string;
  master_module: number;
  config_shape?: false;
  states: StateSpec[];
};
type ConfigShape = {
  data_object_id: number;
  data_object_name: string;
  master_module: number;
  config_shape: true;
  exemption_note: string;
  states?: undefined;
};
type MasterSpec = MasterStates | ConfigShape;

const MASTERS: MasterSpec[] = [
  {
    data_object_id: 23,
    data_object_name: "workforce_plans",
    master_module: MOD.SCENARIO_MODELING,
    states: [
      { state_name: "draft", state_order: 10, is_initial: true, description: "Plan under construction by the workforce planner." },
      { state_name: "submitted", state_order: 20, description: "Plan submitted for executive review." },
      { state_name: "approved", state_order: 30, requires_permission: true, permission_verb_override: "approve_workforce_plan", description: "Executive approval of the plan." },
      { state_name: "adopted", state_order: 40, requires_permission: true, permission_verb_override: "adopt_workforce_plan", description: "Plan adopted as the active baseline; downstream HCM, EPM, ATS subscribe." },
      { state_name: "cancelled", state_order: 90, is_terminal: true, description: "Plan abandoned before adoption." },
    ],
  },
  {
    data_object_id: 24,
    data_object_name: "headcount_plans",
    master_module: MOD.DEMAND_FORECAST,
    states: [
      { state_name: "draft", state_order: 10, is_initial: true, description: "Headcount plan being assembled." },
      { state_name: "approved", state_order: 20, requires_permission: true, permission_verb_override: "approve_headcount_plan", description: "Plan approved; headcount.approved fires to ATS for requisition creation." },
      { state_name: "in_progress", state_order: 30, description: "Hiring against the plan is underway; requisition.filled feeds reconciliation." },
      { state_name: "closed", state_order: 40, is_terminal: true, requires_permission: true, permission_verb_override: "close_headcount_plan", description: "Plan period closed; reconciled to actuals." },
      { state_name: "cancelled", state_order: 90, is_terminal: true, description: "Plan abandoned." },
    ],
  },
  {
    data_object_id: 25,
    data_object_name: "position_demand_forecasts",
    master_module: MOD.DEMAND_FORECAST,
    config_shape: true,
    exemption_note: "Config-shaped; no workflow. Forecasts are recomputed each planning cycle from upstream signals (headcount_plans, attrition_forecasts) and republished. No per-state permissions needed; record_status alone tracks the publication state.",
  },
  {
    data_object_id: 26,
    data_object_name: "skills_gap_analyses",
    master_module: MOD.DEMAND_FORECAST,
    states: [
      { state_name: "draft", state_order: 10, is_initial: true, description: "Analysis under construction." },
      { state_name: "published", state_order: 20, requires_permission: true, permission_verb_override: "publish_skills_gap_analysis", description: "Analysis published; LMS curricula refresh, ATS sourcing prioritization shifts." },
      { state_name: "archived", state_order: 90, is_terminal: true, description: "Analysis superseded by a later cycle." },
    ],
  },
  {
    data_object_id: 27,
    data_object_name: "workforce_scenarios",
    master_module: MOD.SCENARIO_MODELING,
    states: [
      { state_name: "draft", state_order: 10, is_initial: true, description: "Scenario being authored." },
      { state_name: "modeled", state_order: 20, description: "Scenario fully populated with assumptions and outputs." },
      { state_name: "submitted", state_order: 30, description: "Scenario submitted for executive review." },
      { state_name: "approved", state_order: 40, requires_permission: true, permission_verb_override: "approve_workforce_scenario", description: "Scenario approved." },
      { state_name: "adopted", state_order: 50, requires_permission: true, permission_verb_override: "adopt_workforce_scenario", description: "Scenario adopted; HCM org changes, ATS hiring plan, EPM financial plan absorb it." },
      { state_name: "rejected", state_order: 90, is_terminal: true, description: "Scenario rejected; alternative will be modeled." },
    ],
  },
  {
    data_object_id: 28,
    data_object_name: "org_designs",
    master_module: MOD.SCENARIO_MODELING,
    states: [
      { state_name: "draft", state_order: 10, is_initial: true, description: "Org design under construction." },
      { state_name: "submitted", state_order: 20, description: "Org design submitted for executive review." },
      { state_name: "approved", state_order: 30, requires_permission: true, permission_verb_override: "approve_org_design", description: "Org design approved." },
      { state_name: "published", state_order: 40, is_terminal: true, requires_permission: true, permission_verb_override: "publish_org_design", description: "Org design published; HCM org-unit moves cascade, IGA group memberships realign." },
    ],
  },
  {
    data_object_id: 29,
    data_object_name: "labor_market_benchmarks",
    master_module: MOD.SCENARIO_MODELING,
    config_shape: true,
    exemption_note: "Config-shaped; no workflow. External labor-market data refreshed periodically (salary medians, supply-demand index, attrition baselines). No per-state permissions; record_status alone tracks the refresh state.",
  },
  {
    data_object_id: 30,
    data_object_name: "workforce_cost_projections",
    master_module: MOD.COST_PROJECTIONS,
    states: [
      { state_name: "draft", state_order: 10, is_initial: true, description: "Cost projection being assembled from headcount plan and comp assumptions." },
      { state_name: "submitted", state_order: 20, description: "Projection submitted for FP&A review." },
      { state_name: "approved", state_order: 30, requires_permission: true, permission_verb_override: "approve_cost_projection", description: "Projection approved." },
      { state_name: "handed_off", state_order: 40, is_terminal: true, requires_permission: true, permission_verb_override: "hand_off_cost_projection", description: "Projection handed off to EPM for the consolidated financial plan." },
      { state_name: "cancelled", state_order: 90, is_terminal: true, description: "Projection abandoned before approval." },
    ],
  },
];

const PATTERN_FLAGS: { id: number; has_submit_lock: boolean; has_single_approver: boolean }[] = [
  { id: 23, has_submit_lock: true, has_single_approver: true }, // workforce_plans
  { id: 24, has_submit_lock: true, has_single_approver: true }, // headcount_plans
  { id: 27, has_submit_lock: true, has_single_approver: true }, // workforce_scenarios
  { id: 28, has_submit_lock: true, has_single_approver: true }, // org_designs
  { id: 30, has_submit_lock: true, has_single_approver: true }, // workforce_cost_projections
];

async function loadBaselinePermissions(): Promise<Map<string, number>> {
  const names = BASELINE_PERMISSIONS.map((p) => `"${p.permission_name}"`).join(",");
  const existing = await get(`/permissions?permission_name=in.(${names})&select=id,permission_name`);
  const have = new Map(existing.map((r) => [r.permission_name as string, r.id as number]));
  const toInsert = BASELINE_PERMISSIONS.filter((p) => !have.has(p.permission_name));
  await post("permissions", toInsert);
  const fresh = await get(`/permissions?permission_name=in.(${names})&select=id,permission_name`);
  return new Map(fresh.map((r) => [r.permission_name as string, r.id as number]));
}

async function loadLifecycleStatesAndExemptions(): Promise<Row[]> {
  const workflowGatePermissions: Row[] = [];
  const stateRows: Row[] = [];

  for (const m of MASTERS) {
    if (m.config_shape) {
      // PATCH the data_objects.notes for config-shape exemption
      await patch(`/data_objects?id=eq.${m.data_object_id}`, { notes: m.exemption_note });
      continue;
    }

    for (const s of m.states) {
      stateRows.push({
        data_object_id: m.data_object_id,
        state_name: s.state_name,
        state_order: s.state_order,
        is_initial: s.is_initial ?? false,
        is_terminal: s.is_terminal ?? false,
        requires_permission: s.requires_permission ?? false,
        permission_verb_override: s.permission_verb_override ?? "",
        description: s.description ?? "",
        domain_module_id: m.master_module,
      });
      if (s.requires_permission) {
        const code = MODULE_CODE_BY_ID[m.master_module];
        const name = MODULE_NAME_BY_ID[m.master_module];
        const verb = s.permission_verb_override ?? `${s.state_name}_${m.data_object_name.replace(/s$/, "")}`;
        workflowGatePermissions.push({
          permission_name: `${code}:${verb}`,
          description: `Transition \`${m.data_object_name}\` into state \`${s.state_name}\` (${name} module).`,
          domain_module_id: m.master_module,
          module_id: 1001,
          tier: "workflow-gate",
        });
      }
    }
  }

  // Insert workflow-gate permissions idempotently
  const names = workflowGatePermissions.map((p) => `"${p.permission_name}"`).join(",");
  const existing = await get(`/permissions?permission_name=in.(${names})&select=id,permission_name`);
  const haveNames = new Set(existing.map((r) => r.permission_name as string));
  await post("permissions", workflowGatePermissions.filter((p) => !haveNames.has(p.permission_name as string)));

  // Insert lifecycle states idempotently (by data_object_id + state_name)
  const allDoIds = MASTERS.filter((m): m is MasterStates => !m.config_shape).map((m) => m.data_object_id);
  const existingStates = await get(`/data_object_lifecycle_states?data_object_id=in.(${allDoIds.join(",")})&select=data_object_id,state_name`);
  const haveStateKey = new Set(existingStates.map((r) => `${r.data_object_id}:${r.state_name}`));
  const newStates = stateRows.filter((r) => !haveStateKey.has(`${r.data_object_id}:${r.state_name}`));
  await post("data_object_lifecycle_states", newStates);

  return workflowGatePermissions;
}

async function patchPatternFlags(): Promise<void> {
  for (const f of PATTERN_FLAGS) {
    await patch(`/data_objects?id=eq.${f.id}`, {
      has_submit_lock: f.has_submit_lock,
      has_single_approver: f.has_single_approver,
    });
  }
}

// ---------- Phase C: data_object_relationships (B6 + B7 + B8) ----------

const REL_INTRA = [
  { src: 23, verb: "includes", inv: "rolls_up_to", tgt: 24, type: "one_to_many", kind: "composition", req: true, owner: "source", note: "Workforce plan rolls up the per-period headcount plans." },
  { src: 23, verb: "references", inv: "informs", tgt: 27, type: "one_to_one", kind: "reference", req: true, owner: "source", note: "Adopted workforce plan references its underlying scenario." },
  { src: 27, verb: "produces", inv: "produced_by", tgt: 28, type: "one_to_many", kind: "composition", req: false, owner: "source", note: "Approved scenarios produce one or more org-design alternatives." },
  { src: 27, verb: "references", inv: "informs", tgt: 29, type: "many_to_many", kind: "reference", req: false, owner: "source", note: "Scenarios reference labor-market benchmarks for compensation and supply assumptions." },
  { src: 24, verb: "rolls_up_to", inv: "aggregated_from", tgt: 25, type: "many_to_many", kind: "reference", req: true, owner: "target", note: "Headcount plan figures roll up to position-demand forecasts by job-family / location / quarter." },
  { src: 25, verb: "grounds", inv: "grounded_by", tgt: 26, type: "one_to_many", kind: "reference", req: false, owner: "source", note: "Position-demand forecasts ground skills-gap analyses (future-state demand)." },
  { src: 24, verb: "yields", inv: "based_on", tgt: 30, type: "one_to_many", kind: "composition", req: true, owner: "source", note: "Headcount plan + comp assumptions yield workforce cost projections." },
  { src: 28, verb: "informs", inv: "informed_by", tgt: 30, type: "one_to_many", kind: "reference", req: false, owner: "source", note: "Org-design changes inform the cost projection envelope (span-of-control, layer shifts)." },
];

const USERS_ID = 748;
const REL_USERS = [
  { src: USERS_ID, verb: "approves", inv: "approved_by", tgt: 23, note: "Executive approver of the workforce plan." },
  { src: USERS_ID, verb: "sponsors", inv: "sponsored_by", tgt: 24, note: "HRBP sponsor of the headcount plan." },
  { src: USERS_ID, verb: "prepares", inv: "prepared_by", tgt: 25, note: "Workforce planner who prepares the demand forecast." },
  { src: USERS_ID, verb: "prepares", inv: "prepared_by", tgt: 26, note: "Analyst who authors the skills-gap analysis." },
  { src: USERS_ID, verb: "authors", inv: "authored_by", tgt: 27, note: "Scenario author / planner." },
  { src: USERS_ID, verb: "designs", inv: "designed_by", tgt: 28, note: "Org-design practitioner who authors the design." },
  { src: USERS_ID, verb: "owns", inv: "owned_by", tgt: 30, note: "FP&A partner who owns the cost projection." },
];

const REL_CROSS = [
  { src: 24, verb: "authorizes", inv: "authorized_by", tgt: 1, type: "one_to_many", kind: "reference", req: true, owner: "source", note: "cross | SWP→ATS | headcount.approved authorizes requisition creation." },
  { src: 25, verb: "triggers", inv: "triggered_by", tgt: 1, type: "one_to_many", kind: "reference", req: false, owner: "source", note: "cross | SWP→ATS | position_demand_forecast.updated triggers requisition pipeline alignment." },
  { src: 27, verb: "drives", inv: "driven_by", tgt: 32, type: "one_to_many", kind: "reference", req: true, owner: "source", note: "cross | SWP→HCM | adopted scenario drives HCM position changes." },
  { src: 28, verb: "proposes", inv: "proposed_by", tgt: 32, type: "one_to_many", kind: "reference", req: true, owner: "source", note: "cross | SWP→HCM | org_design.published proposes new hcm_positions for creation." },
  { src: 26, verb: "prescribes", inv: "prescribed_by", tgt: 168, type: "one_to_many", kind: "reference", req: false, owner: "source", note: "cross | SWP→LMS | skills_gap_analysis.completed prescribes learning_paths for capability build." },
  { src: 30, verb: "feeds", inv: "fed_by", tgt: 37, type: "one_to_many", kind: "reference", req: true, owner: "source", note: "cross | SWP→EPM | workforce_cost_projection.approved feeds the labor-cost line of financial_plans." },
  { src: 29, verb: "calibrates", inv: "calibrated_by", tgt: 154, type: "many_to_many", kind: "reference", req: false, owner: "source", note: "cross | SWP→COMP-MGMT | labor_market_benchmark.refreshed calibrates salary_bands." },
];

async function loadRelationships(): Promise<void> {
  const allTriples = [
    ...REL_INTRA.map((r) => ({ ...r })),
    ...REL_USERS.map((r) => ({ ...r, type: "one_to_many", kind: "reference", req: false, owner: "source" })),
    ...REL_CROSS.map((r) => ({ ...r })),
  ];

  const ids = [...new Set(allTriples.flatMap((r) => [r.src, r.tgt]))].join(",");
  const existing = await get(`/data_object_relationships?or=(data_object_id.in.(${ids}),related_data_object_id.in.(${ids}))&select=data_object_id,related_data_object_id,relationship_verb`);
  const haveKey = new Set(existing.map((r) => `${r.data_object_id}:${r.relationship_verb}:${r.related_data_object_id}`));

  const rows = allTriples
    .map((r) => ({
      data_object_id: r.src,
      related_data_object_id: r.tgt,
      relationship_verb: r.verb,
      inverse_verb: r.inv,
      relationship_type: r.type,
      relationship_kind: r.kind,
      is_required: r.req,
      owner_side: r.owner,
      notes: r.note,
    }))
    .filter((r) => !haveKey.has(`${r.data_object_id}:${r.relationship_verb}:${r.related_data_object_id}`));

  await post("data_object_relationships", rows);
}

// ---------- Phase D: B10b handoff backfill ----------

const B10B_PATCHES = [
  { id: 241, target_domain_module_id: MOD.SCENARIO_MODELING },
  { id: 242, target_domain_module_id: MOD.DEMAND_FORECAST },
  { id: 136, target_domain_module_id: MOD.COST_PROJECTIONS },
  { id: 1138, target_domain_module_id: MOD.COST_PROJECTIONS },
  { id: 1112, target_domain_module_id: MOD.SUPPLY_PLANNING },
  { id: 1027, target_domain_module_id: MOD.DEMAND_FORECAST },
  { id: 1018, target_domain_module_id: MOD.SUPPLY_PLANNING },
];

async function patchHandoffs(): Promise<void> {
  for (const p of B10B_PATCHES) {
    await patch(`/handoffs?id=eq.${p.id}`, { target_domain_module_id: p.target_domain_module_id });
  }
}

// ---------- Phase E: Aliases ----------

const ALIASES = [
  { data_object_id: 29, alias_name: "Compensation Benchmarks", alias_type: "synonym", note: "Common HR / Comp & Ben usage." },
  { data_object_id: 29, alias_name: "External Comp Data", alias_type: "synonym", note: "Industry shorthand for market-comp data feeds." },
  { data_object_id: 26, alias_name: "Capability Gap Analysis", alias_type: "synonym", note: "Talent / L&D framing of the same artifact." },
  { data_object_id: 30, alias_name: "People-Cost Forecast", alias_type: "synonym", note: "FP&A-flavored phrasing." },
  { data_object_id: 30, alias_name: "Loaded-Comp Forecast", alias_type: "synonym", note: "Comp + benefits + employer-tax loaded view." },
  { data_object_id: 25, alias_name: "Hiring Demand Forecast", alias_type: "synonym", note: "Recruiting-side framing of the SWP demand signal." },
];

async function loadAliases(): Promise<void> {
  const ids = [...new Set(ALIASES.map((a) => a.data_object_id))].join(",");
  const existing = await get(`/data_object_aliases?data_object_id=in.(${ids})&select=data_object_id,alias_name`);
  const haveKey = new Set(existing.map((r) => `${r.data_object_id}:${r.alias_name}`));
  const rows = ALIASES
    .map((a) => ({
      data_object_id: a.data_object_id,
      alias_name: a.alias_name,
      alias_type: a.alias_type,
      notes: a.note,
    }))
    .filter((r) => !haveKey.has(`${r.data_object_id}:${r.alias_name}`));
  await post("data_object_aliases", rows);
}

// ---------- Phase F: Roles + role_modules + role_permissions ----------

const BF_WORKFORCE_PLANNING = 81;
const BF_FPA = 43;

type RoleSpec = {
  role_code: string;
  role_name: string;
  description: string;
  business_function_id: number | null;
  modules: { id: number; interaction_level: "primary" | "secondary"; note: string }[];
  // Permission names to grant (resolved at load time)
  permissions: string[];
};

const ROLES: RoleSpec[] = [
  {
    role_code: "WORKFORCE-PLANNING-PLANNER",
    role_name: "Workforce Planner",
    description: "Authors workforce plans, headcount plans, and skills-gap analyses. Maintains the demand-supply reconciliation cycle. Permission bundle uses `:manage` on primary modules plus the workforce-plan and headcount approval gates.",
    business_function_id: BF_WORKFORCE_PLANNING,
    modules: [
      { id: MOD.DEMAND_FORECAST, interaction_level: "primary", note: "Authors headcount_plans, position_demand_forecasts, skills_gap_analyses." },
      { id: MOD.SCENARIO_MODELING, interaction_level: "primary", note: "Authors workforce_plans and references scenarios." },
      { id: MOD.SUPPLY_PLANNING, interaction_level: "secondary", note: "Reads supply-side overlays into demand plans." },
      { id: MOD.COST_PROJECTIONS, interaction_level: "secondary", note: "Reads cost projections for plan validation." },
    ],
    permissions: [
      "swp-demand-forecast:manage",
      "swp-demand-forecast:approve_headcount_plan",
      "swp-demand-forecast:publish_skills_gap_analysis",
      "swp-scenario-modeling:manage",
      "swp-scenario-modeling:approve_workforce_plan",
      "swp-supply-planning:read",
      "swp-cost-projections:read",
    ],
  },
  {
    role_code: "WORKFORCE-PLANNING-LEAD",
    role_name: "Workforce Planning Lead",
    description: "Owns the SWP function. Final approver on workforce plans, scenarios, and org designs. Permission bundle is `:admin` across all four modules; `permission_hierarchy` auto-includes every workflow gate.",
    business_function_id: BF_WORKFORCE_PLANNING,
    modules: [
      { id: MOD.DEMAND_FORECAST, interaction_level: "primary", note: "Admin tier — approves headcount and closes plan periods." },
      { id: MOD.SCENARIO_MODELING, interaction_level: "primary", note: "Admin tier — approves workforce plans, scenarios, and org designs." },
      { id: MOD.SUPPLY_PLANNING, interaction_level: "primary", note: "Admin tier — owns reconciliation." },
      { id: MOD.COST_PROJECTIONS, interaction_level: "primary", note: "Admin tier — approves cost projection handoff to EPM." },
    ],
    permissions: [
      "swp-demand-forecast:admin",
      "swp-scenario-modeling:admin",
      "swp-supply-planning:admin",
      "swp-cost-projections:admin",
    ],
  },
  {
    role_code: "FPA-WORKFORCE-PARTNER",
    role_name: "FP&A Workforce Partner",
    description: "FP&A counterpart for workforce costs. Owns workforce_cost_projections approval and the EPM handoff. Reads demand and scenarios to validate cost build-up.",
    business_function_id: BF_FPA,
    modules: [
      { id: MOD.COST_PROJECTIONS, interaction_level: "primary", note: "Owns cost projection authoring and EPM handoff." },
      { id: MOD.DEMAND_FORECAST, interaction_level: "secondary", note: "Reads headcount plans to validate comp assumptions." },
      { id: MOD.SCENARIO_MODELING, interaction_level: "secondary", note: "Reads scenarios for what-if cost modeling." },
    ],
    permissions: [
      "swp-cost-projections:manage",
      "swp-cost-projections:approve_cost_projection",
      "swp-cost-projections:hand_off_cost_projection",
      "swp-demand-forecast:read",
      "swp-scenario-modeling:read",
    ],
  },
  {
    role_code: "ORG-DESIGN-PRACTITIONER",
    role_name: "Org Design Practitioner",
    description: "Specialist who authors and iterates org_designs. Works closely with scenarios and the labor-market overlay.",
    business_function_id: BF_WORKFORCE_PLANNING,
    modules: [
      { id: MOD.SCENARIO_MODELING, interaction_level: "primary", note: "Authors org_designs and references labor_market_benchmarks." },
      { id: MOD.DEMAND_FORECAST, interaction_level: "secondary", note: "Reads position demand to size designs." },
      { id: MOD.COST_PROJECTIONS, interaction_level: "secondary", note: "Reads cost projections to validate design feasibility." },
    ],
    permissions: [
      "swp-scenario-modeling:manage",
      "swp-scenario-modeling:approve_org_design",
      "swp-scenario-modeling:publish_org_design",
      "swp-demand-forecast:read",
      "swp-cost-projections:read",
    ],
  },
  {
    role_code: "WORKFORCE-LEADERSHIP-SPONSOR",
    role_name: "Workforce Leadership Sponsor",
    description: "Executive sponsor (CHRO / CFO / business-unit head) who reviews and adopts workforce plans, scenarios, and cost projections. Cross-functional role; not tied to a single business function.",
    business_function_id: null,
    modules: [
      { id: MOD.SCENARIO_MODELING, interaction_level: "primary", note: "Adopts plans and scenarios." },
      { id: MOD.COST_PROJECTIONS, interaction_level: "primary", note: "Reviews cost projections before EPM handoff." },
      { id: MOD.DEMAND_FORECAST, interaction_level: "secondary", note: "Reads headcount plans for executive visibility." },
    ],
    permissions: [
      "swp-scenario-modeling:adopt_workforce_plan",
      "swp-scenario-modeling:adopt_workforce_scenario",
      "swp-scenario-modeling:read",
      "swp-cost-projections:read",
      "swp-demand-forecast:read",
    ],
  },
];

function slugify(code: string): string {
  return code.toLowerCase().replace(/-/g, "_");
}

async function loadRoles(permMap: Map<string, number>): Promise<void> {
  // 1. Insert roles idempotently by role_code
  const codes = ROLES.map((r) => `"${r.role_code}"`).join(",");
  const existingRoles = await get(`/roles?role_code=in.(${codes})&select=id,role_code`);
  const roleMap = new Map(existingRoles.map((r) => [r.role_code as string, r.id as number]));

  const toInsertRoles = ROLES.filter((r) => !roleMap.has(r.role_code)).map((r) => ({
    role_code: r.role_code,
    role_name: r.role_name,
    slug: slugify(r.role_code),
    description: r.description,
    origin: "model",
    module_id: 1001,
    business_function_id: r.business_function_id,
  }));
  await post("roles", toInsertRoles);

  const freshRoles = await get(`/roles?role_code=in.(${codes})&select=id,role_code`);
  for (const r of freshRoles) roleMap.set(r.role_code as string, r.id as number);

  // 2. role_modules
  const wantedRM: Row[] = [];
  for (const r of ROLES) {
    const rid = roleMap.get(r.role_code)!;
    for (const m of r.modules) {
      wantedRM.push({ role_id: rid, domain_module_id: m.id, interaction_level: m.interaction_level, notes: m.note });
    }
  }
  const roleIds = [...new Set(wantedRM.map((w) => w.role_id))].join(",");
  const existingRM = await get(`/role_modules?role_id=in.(${roleIds})&select=role_id,domain_module_id`);
  const haveRM = new Set(existingRM.map((r) => `${r.role_id}:${r.domain_module_id}`));
  await post("role_modules", wantedRM.filter((w) => !haveRM.has(`${w.role_id}:${w.domain_module_id}`)));

  // 3. role_permissions
  const wantedRP: Row[] = [];
  for (const r of ROLES) {
    const rid = roleMap.get(r.role_code)!;
    for (const pname of r.permissions) {
      const pid = permMap.get(pname);
      if (!pid) {
        console.error(`MISSING PERMISSION: ${pname} (role ${r.role_code})`);
        continue;
      }
      wantedRP.push({ role_id: rid, permission_id: pid });
    }
  }
  const existingRP = await get(`/role_permissions?role_id=in.(${roleIds})&select=role_id,permission_id`);
  const haveRP = new Set(existingRP.map((r) => `${r.role_id}:${r.permission_id}`));
  await post("role_permissions", wantedRP.filter((w) => !haveRP.has(`${w.role_id}:${w.permission_id}`)));
}

// ---------- Orchestration ----------

async function main(): Promise<void> {
  console.log("=== Phase A: capabilities + capability_domains + domain_module_capabilities ===");
  const capMap = await loadCapabilities();
  await loadCapabilityDomains(capMap);
  await loadDomainModuleCapabilities(capMap);
  console.log(`  capabilities: ${Object.keys(capMap).length}`);

  console.log("=== Phase B: permissions + lifecycle states + pattern flags + exemption notes ===");
  await loadBaselinePermissions();
  await loadLifecycleStatesAndExemptions();
  await patchPatternFlags();

  // Build the full permission map for role bundles
  const allPermNames: string[] = [];
  for (const r of ROLES) for (const p of r.permissions) allPermNames.push(`"${p}"`);
  const permRows = await get(`/permissions?permission_name=in.(${[...new Set(allPermNames)].join(",")})&select=id,permission_name`);
  const permMap = new Map(permRows.map((r) => [r.permission_name as string, r.id as number]));
  console.log(`  permissions resolved: ${permMap.size}`);

  console.log("=== Phase C: data_object_relationships (intra + users + cross-domain) ===");
  await loadRelationships();

  console.log("=== Phase D: handoff B10b backfill ===");
  await patchHandoffs();

  console.log("=== Phase E: aliases ===");
  await loadAliases();

  console.log("=== Phase F: roles + role_modules + role_permissions ===");
  await loadRoles(permMap);

  console.log("=== Done ===");
}

await main();
