/**
 * COMP-MGMT (domain_id=60) Phase M + Handoffs loader.
 *
 * Loads in this order:
 *   1. domain_modules (4)
 *   2. domain_starter_modules (2)
 *   3. domain_module_capabilities (6)
 *   4. domain_module_data_objects (~40)
 *   5. trigger_events (11 new)
 *   6. handoffs (8 cross-domain outbound + 5 intra-domain)
 *   7. PATCH data_object_lifecycle_states.domain_module_id (M5)
 *   8. PATCH handoffs.source_domain_module_id / target_domain_module_id (B10b)
 *
 * Idempotent: every insert is preceded by a natural-key read.
 *
 * Run from project root:
 *   bun run "c:/dev/domain-map/.tmp_deploy/load_comp_mgmt_modules_handoffs.ts"
 */

const DOMAIN_ID = 60;

interface CmdResult {
  ok: boolean;
  data: any;
  status: number;
  stderr: string;
}

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const json = JSON.stringify(payload);
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest"],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" }
  );
  // Pipe JSON via stdin to avoid Windows command-line length / quoting issues.
  // semantius CLI accepts the JSON arg on stdin when not provided as argv.
  // (Fall back to argv form if stdin not supported.)
  proc.stdin.write(json);
  proc.stdin.end();
  let stdout = await new Response(proc.stdout).text();
  let stderr = await new Response(proc.stderr).text();
  let code = await proc.exited;
  if (code !== 0 && stderr.includes("required") && stderr.toLowerCase().includes("argument")) {
    // Retry as argv form.
    const p2 = Bun.spawn(
      ["semantius", "call", "crud", "postgrestRequest", json],
      { stdout: "pipe", stderr: "pipe" }
    );
    stdout = await new Response(p2.stdout).text();
    stderr = await new Response(p2.stderr).text();
    code = await p2.exited;
  }
  if (code !== 0) {
    return { ok: false, data: null, status: code, stderr: stderr.trim() || stdout.trim() };
  }
  const text = stdout.trim();
  return { ok: true, data: text ? JSON.parse(text) : null, status: 0, stderr: "" };
}

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.stderr}`);
  return r.data;
}

async function postOne(path: string, row: any): Promise<any> {
  const r = await postgrest("POST", path + (path.includes("?") ? "&" : "?") + "select=*", row);
  if (!r.ok) throw new Error(`POST ${path} failed: ${r.stderr}\nBody: ${JSON.stringify(row)}`);
  return Array.isArray(r.data) ? r.data[0] : r.data;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await postgrest("PATCH", path, body);
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.stderr}`);
  return r.data;
}

const EM_DASH = String.fromCharCode(0x2014);
function assertNoEmDash(s: string, context: string) {
  if (s && s.includes(EM_DASH)) {
    throw new Error(`Em-dash forbidden in ${context}: ${s}`);
  }
}

function validate(rows: Record<string, any>[], context: string) {
  for (const r of rows) {
    for (const [k, v] of Object.entries(r)) {
      if (typeof v === "string") assertNoEmDash(v, `${context}.${k}`);
    }
  }
}

// ---------- DEFINITIONS ----------

const MODULES = [
  {
    domain_module_code: "COMP-PLANNING",
    domain_module_name: "Compensation Planning Cycles",
    description:
      "Annual merit, bonus, and equity cycles. Masters merit_cycles, merit_recommendations, and compensation_plans. Drives manager workflows, calibration, approvals, and posting of effective-dated pay changes.",
  },
  {
    domain_module_code: "COMP-INCENTIVES",
    domain_module_name: "Incentives and Equity Plans",
    description:
      "Bonus, commission, and long-term equity plan administration. Masters equity_grants and folds INCENTIVE-MGMT + EQUITY-MGMT capabilities (grant lifecycle, vesting, exercise, expense tracking).",
  },
  {
    domain_module_code: "COMP-BENCHMARKING",
    domain_module_name: "Benchmarking and Pay Equity",
    description:
      "Market data ingestion, salary band maintenance, and pay-equity analysis. Masters salary_bands and compensation_benchmarks; surfaces compa-ratio and pay-gap analytics consumed by planning and people analytics.",
  },
  {
    domain_module_code: "COMP-STATEMENTS",
    domain_module_name: "Total Rewards Statements",
    description:
      "Personalized total-rewards statement assembly, delivery, and acknowledgement. Masters compensation_statements; consumes merit_cycle outputs and equity_grant events to compose worker-visible statements.",
  },
];

// (capability_code -> [module_codes]). Multi-mapping allowed.
const MODULE_CAPABILITIES: Array<{ module: string; capability_code: string; notes: string }> = [
  { module: "COMP-PLANNING", capability_code: "COMP-PLANNING", notes: "Cycle, calibration, and approval workflows." },
  { module: "COMP-INCENTIVES", capability_code: "INCENTIVE-MGMT", notes: "Short and long-term incentive plan administration." },
  { module: "COMP-INCENTIVES", capability_code: "EQUITY-MGMT", notes: "Grant, vesting, and exercise lifecycle." },
  { module: "COMP-BENCHMARKING", capability_code: "COMP-BENCHMARK", notes: "Salary surveys and benchmark-to-internal mapping." },
  { module: "COMP-BENCHMARKING", capability_code: "PAY-EQUITY", notes: "Pay-gap and compa-ratio analytics on band data." },
  { module: "COMP-STATEMENTS", capability_code: "COMP-PLANNING", notes: "Statement output of a closed planning cycle." },
];

// data_object_name -> list of (module_code, role, necessity)
// Roles/necessities come from existing domain_data_objects rows so the module
// mappings inherit (M6 keeps source-of-truth at domain level).
const MODULE_DATA_OBJECTS: Array<{
  module: string;
  data_object_name: string;
  role: string;
  necessity: string;
}> = [
  // COMP-PLANNING ----
  { module: "COMP-PLANNING", data_object_name: "merit_cycles", role: "master", necessity: "required" },
  { module: "COMP-PLANNING", data_object_name: "merit_recommendations", role: "master", necessity: "required" },
  { module: "COMP-PLANNING", data_object_name: "compensation_plans", role: "master", necessity: "required" },
  { module: "COMP-PLANNING", data_object_name: "earning_codes", role: "contributor", necessity: "required" },
  { module: "COMP-PLANNING", data_object_name: "performance_reviews", role: "consumer", necessity: "required" },
  { module: "COMP-PLANNING", data_object_name: "financial_plans", role: "consumer", necessity: "optional" },
  { module: "COMP-PLANNING", data_object_name: "employees", role: "embedded_master", necessity: "required" },
  { module: "COMP-PLANNING", data_object_name: "hcm_positions", role: "embedded_master", necessity: "required" },
  { module: "COMP-PLANNING", data_object_name: "job_profiles", role: "embedded_master", necessity: "required" },
  { module: "COMP-PLANNING", data_object_name: "org_units", role: "embedded_master", necessity: "required" },
  { module: "COMP-PLANNING", data_object_name: "cost_centers", role: "embedded_master", necessity: "optional" },
  { module: "COMP-PLANNING", data_object_name: "locations", role: "embedded_master", necessity: "optional" },

  // COMP-INCENTIVES ----
  { module: "COMP-INCENTIVES", data_object_name: "equity_grants", role: "master", necessity: "required" },
  { module: "COMP-INCENTIVES", data_object_name: "compensation_plans", role: "contributor", necessity: "required" },
  { module: "COMP-INCENTIVES", data_object_name: "employees", role: "embedded_master", necessity: "required" },
  { module: "COMP-INCENTIVES", data_object_name: "hcm_positions", role: "embedded_master", necessity: "required" },
  { module: "COMP-INCENTIVES", data_object_name: "job_profiles", role: "embedded_master", necessity: "required" },
  { module: "COMP-INCENTIVES", data_object_name: "org_units", role: "embedded_master", necessity: "required" },
  { module: "COMP-INCENTIVES", data_object_name: "cost_centers", role: "embedded_master", necessity: "optional" },

  // COMP-BENCHMARKING ----
  { module: "COMP-BENCHMARKING", data_object_name: "salary_bands", role: "master", necessity: "required" },
  { module: "COMP-BENCHMARKING", data_object_name: "compensation_benchmarks", role: "master", necessity: "required" },
  { module: "COMP-BENCHMARKING", data_object_name: "job_profiles", role: "embedded_master", necessity: "required" },
  { module: "COMP-BENCHMARKING", data_object_name: "hcm_positions", role: "embedded_master", necessity: "optional" },
  { module: "COMP-BENCHMARKING", data_object_name: "org_units", role: "embedded_master", necessity: "required" },
  { module: "COMP-BENCHMARKING", data_object_name: "locations", role: "embedded_master", necessity: "optional" },
  { module: "COMP-BENCHMARKING", data_object_name: "employees", role: "embedded_master", necessity: "required" },

  // COMP-STATEMENTS ----
  { module: "COMP-STATEMENTS", data_object_name: "compensation_statements", role: "master", necessity: "required" },
  { module: "COMP-STATEMENTS", data_object_name: "compensation_plans", role: "contributor", necessity: "required" },
  { module: "COMP-STATEMENTS", data_object_name: "merit_recommendations", role: "contributor", necessity: "required" },
  { module: "COMP-STATEMENTS", data_object_name: "equity_grants", role: "contributor", necessity: "optional" },
  { module: "COMP-STATEMENTS", data_object_name: "employees", role: "embedded_master", necessity: "required" },
  { module: "COMP-STATEMENTS", data_object_name: "org_units", role: "embedded_master", necessity: "required" },
];

const STARTER_MODULES: Array<{ module: string; position: number; notes: string }> = [
  { module: "COMP-PLANNING", position: 1, notes: "Cycle backbone: enable masters, capabilities, and merit workflow first." },
  { module: "COMP-STATEMENTS", position: 2, notes: "Output of a closed cycle; activate once planning is live." },
];

// data_object_name to use for lookups
const MASTER_OF_MODULE: Record<string, string[]> = {
  "COMP-PLANNING": ["merit_cycles", "merit_recommendations", "compensation_plans"],
  "COMP-INCENTIVES": ["equity_grants"],
  "COMP-BENCHMARKING": ["salary_bands", "compensation_benchmarks"],
  "COMP-STATEMENTS": ["compensation_statements"],
};

// New trigger events. event_category 'state_change'.
const TRIGGER_EVENTS: Array<{
  event_name: string;
  data_object_name: string;
  from_state: string;
  to_state: string;
  description: string;
}> = [
  {
    event_name: "merit_cycle.opened",
    data_object_name: "merit_cycles",
    from_state: "planned",
    to_state: "open",
    description: "Merit cycle opened to managers for recommendation entry.",
  },
  {
    event_name: "merit_cycle.calibrated",
    data_object_name: "merit_cycles",
    from_state: "calibration",
    to_state: "approval",
    description: "Calibration complete across leadership cohorts; cycle moves into approval routing.",
  },
  {
    event_name: "merit_cycle.posted",
    data_object_name: "merit_cycles",
    from_state: "closed",
    to_state: "posted",
    description: "Effective-dated pay changes posted to HCM and payroll.",
  },
  {
    event_name: "merit_recommendation.submitted",
    data_object_name: "merit_recommendations",
    from_state: "draft",
    to_state: "submitted",
    description: "Manager submits merit, bonus, and equity-refresh recommendation for review.",
  },
  {
    event_name: "merit_recommendation.finalized",
    data_object_name: "merit_recommendations",
    from_state: "approved",
    to_state: "finalized",
    description: "Approved recommendation locked and posted as effective pay-rate change.",
  },
  {
    event_name: "compensation_plan.activated",
    data_object_name: "compensation_plans",
    from_state: "draft",
    to_state: "active",
    description: "Compensation plan moves from draft to active and becomes assignable.",
  },
  {
    event_name: "compensation_plan.archived",
    data_object_name: "compensation_plans",
    from_state: "active",
    to_state: "archived",
    description: "Compensation plan retired from new assignments and kept for historical reference.",
  },
  {
    event_name: "compensation_statement.delivered",
    data_object_name: "compensation_statements",
    from_state: "generated",
    to_state: "delivered",
    description: "Total-rewards statement released to the worker through portal or email.",
  },
  {
    event_name: "compensation_statement.acknowledged",
    data_object_name: "compensation_statements",
    from_state: "delivered",
    to_state: "acknowledged",
    description: "Worker has viewed or acknowledged the total-rewards statement.",
  },
  {
    event_name: "equity_grant.approved",
    data_object_name: "equity_grants",
    from_state: "proposed",
    to_state: "approved",
    description: "Board, compensation committee, or delegate signs off on the equity award.",
  },
  {
    event_name: "equity_grant.forfeited",
    data_object_name: "equity_grants",
    from_state: "vesting",
    to_state: "forfeited",
    description: "Equity grant cancelled due to termination or unmet performance condition.",
  },
];

// Cross-domain outbound handoffs. Uses event_name (resolved to id post-load).
const CROSS_DOMAIN_HANDOFFS: Array<{
  source_module: string;
  target_domain_code: string;
  trigger_event_name: string;
  payload_data_object_name: string;
  integration_pattern: string;
  friction_level: string;
  description: string;
}> = [
  {
    source_module: "COMP-PLANNING",
    target_domain_code: "HCM",
    trigger_event_name: "compensation_plan.published",
    payload_data_object_name: "compensation_plans",
    integration_pattern: "event_stream",
    friction_level: "low",
    description: "New compensation plan structure becomes the effective-comp basis on worker records in HCM.",
  },
  {
    source_module: "COMP-PLANNING",
    target_domain_code: "PAYROLL",
    trigger_event_name: "compensation_plan.published",
    payload_data_object_name: "compensation_plans",
    integration_pattern: "event_stream",
    friction_level: "medium",
    description: "Plan defines bonus targets and pay-rate structures payroll must mirror; reconcile codes before next run.",
  },
  {
    source_module: "COMP-STATEMENTS",
    target_domain_code: "EMP-EXP",
    trigger_event_name: "compensation_statement.issued",
    payload_data_object_name: "compensation_statements",
    integration_pattern: "event_stream",
    friction_level: "low",
    description: "Statement-delivery engagement and acknowledgement KPIs feed employee-experience analytics.",
  },
  {
    source_module: "COMP-STATEMENTS",
    target_domain_code: "HRSD",
    trigger_event_name: "compensation_statement.issued",
    payload_data_object_name: "compensation_statements",
    integration_pattern: "event_stream",
    friction_level: "low",
    description: "Statement issuance creates predictable spike of worker questions; HRSD pre-stages KB and case intake.",
  },
  {
    source_module: "COMP-BENCHMARKING",
    target_domain_code: "SWP",
    trigger_event_name: "compensation_benchmark.refreshed",
    payload_data_object_name: "compensation_benchmarks",
    integration_pattern: "batch_sync",
    friction_level: "low",
    description: "Refreshed market medians feed strategic workforce-cost models and headcount planning scenarios.",
  },
  {
    source_module: "COMP-BENCHMARKING",
    target_domain_code: "ATS",
    trigger_event_name: "compensation_benchmark.refreshed",
    payload_data_object_name: "compensation_benchmarks",
    integration_pattern: "batch_sync",
    friction_level: "low",
    description: "Updated benchmarks inform offer-range guardrails for recruiters and hiring managers.",
  },
  {
    source_module: "COMP-PLANNING",
    target_domain_code: "PAYROLL",
    trigger_event_name: "earning_code.created",
    payload_data_object_name: "earning_codes",
    integration_pattern: "api_call",
    friction_level: "medium",
    description: "New earning code must exist in payroll before any pay run references it; sync is the friction point.",
  },
  {
    source_module: "COMP-PLANNING",
    target_domain_code: "ERP-FIN",
    trigger_event_name: "earning_code.created",
    payload_data_object_name: "earning_codes",
    integration_pattern: "api_call",
    friction_level: "medium",
    description: "Earning code requires a GL mapping in ERP-FIN before expense posting works correctly.",
  },
];

// Intra-domain B9b handoffs (source_domain_id == target_domain_id == 60).
const INTRA_HANDOFFS: Array<{
  source_module: string;
  target_module: string;
  trigger_event_name: string;
  payload_data_object_name: string;
  integration_pattern: string;
  friction_level: string;
  description: string;
}> = [
  {
    source_module: "COMP-PLANNING",
    target_module: "COMP-STATEMENTS",
    trigger_event_name: "merit_cycle.approved",
    payload_data_object_name: "compensation_statements",
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "Approved merit cycle releases statement generation in COMP-STATEMENTS with the new totals.",
  },
  {
    source_module: "COMP-PLANNING",
    target_module: "COMP-STATEMENTS",
    trigger_event_name: "merit_cycle.closed",
    payload_data_object_name: "compensation_statements",
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "Cycle close locks values; statement generation finalizes printable totals.",
  },
  {
    source_module: "COMP-BENCHMARKING",
    target_module: "COMP-PLANNING",
    trigger_event_name: "compensation_benchmark.refreshed",
    payload_data_object_name: "merit_cycles",
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "Refreshed benchmarks prompt planners to recalibrate budget pools and recommendation matrices.",
  },
  {
    source_module: "COMP-BENCHMARKING",
    target_module: "COMP-PLANNING",
    trigger_event_name: "salary_band.updated",
    payload_data_object_name: "merit_cycles",
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "Band repricing recalculates compa-ratios used in the planning recommendation matrix.",
  },
  {
    source_module: "COMP-INCENTIVES",
    target_module: "COMP-STATEMENTS",
    trigger_event_name: "equity_grant.granted",
    payload_data_object_name: "compensation_statements",
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "New equity grant included in the worker's next statement assembly.",
  },
];

// Lifecycle state -> module mapping for M5 backfill.
// (We resolve by (data_object_name, state_name).)
const LIFECYCLE_STATE_MODULES: Array<{
  data_object_name: string;
  state_name: string;
  module: string;
}> = [
  // compensation_plans
  { data_object_name: "compensation_plans", state_name: "draft", module: "COMP-PLANNING" },
  { data_object_name: "compensation_plans", state_name: "active", module: "COMP-PLANNING" },
  { data_object_name: "compensation_plans", state_name: "archived", module: "COMP-PLANNING" },
  // merit_cycles
  { data_object_name: "merit_cycles", state_name: "planned", module: "COMP-PLANNING" },
  { data_object_name: "merit_cycles", state_name: "open", module: "COMP-PLANNING" },
  { data_object_name: "merit_cycles", state_name: "calibration", module: "COMP-PLANNING" },
  { data_object_name: "merit_cycles", state_name: "approval", module: "COMP-PLANNING" },
  { data_object_name: "merit_cycles", state_name: "closed", module: "COMP-PLANNING" },
  { data_object_name: "merit_cycles", state_name: "posted", module: "COMP-PLANNING" },
  // merit_recommendations
  { data_object_name: "merit_recommendations", state_name: "draft", module: "COMP-PLANNING" },
  { data_object_name: "merit_recommendations", state_name: "submitted", module: "COMP-PLANNING" },
  { data_object_name: "merit_recommendations", state_name: "approved", module: "COMP-PLANNING" },
  { data_object_name: "merit_recommendations", state_name: "finalized", module: "COMP-PLANNING" },
  { data_object_name: "merit_recommendations", state_name: "rejected", module: "COMP-PLANNING" },
  // compensation_statements
  { data_object_name: "compensation_statements", state_name: "draft", module: "COMP-STATEMENTS" },
  { data_object_name: "compensation_statements", state_name: "generated", module: "COMP-STATEMENTS" },
  { data_object_name: "compensation_statements", state_name: "delivered", module: "COMP-STATEMENTS" },
  { data_object_name: "compensation_statements", state_name: "acknowledged", module: "COMP-STATEMENTS" },
  // equity_grants
  { data_object_name: "equity_grants", state_name: "proposed", module: "COMP-INCENTIVES" },
  { data_object_name: "equity_grants", state_name: "approved", module: "COMP-INCENTIVES" },
  { data_object_name: "equity_grants", state_name: "granted", module: "COMP-INCENTIVES" },
  { data_object_name: "equity_grants", state_name: "vesting", module: "COMP-INCENTIVES" },
  { data_object_name: "equity_grants", state_name: "exercised", module: "COMP-INCENTIVES" },
  { data_object_name: "equity_grants", state_name: "forfeited", module: "COMP-INCENTIVES" },
  { data_object_name: "equity_grants", state_name: "expired", module: "COMP-INCENTIVES" },
];

// B10b backfill (handoff_id, column, derived module_code, rationale).
// module_code='' means leave NULL with notes.
const B10B_BACKFILL: Array<{
  handoff_id: number;
  column: "source_domain_module_id" | "target_domain_module_id";
  module_code: string;
  notes_if_null?: string;
}> = [
  // Outbound (set source)
  { handoff_id: 105, column: "source_domain_module_id", module_code: "COMP-PLANNING" },
  { handoff_id: 106, column: "source_domain_module_id", module_code: "COMP-PLANNING" },
  { handoff_id: 187, column: "source_domain_module_id", module_code: "COMP-PLANNING" },
  { handoff_id: 422, column: "source_domain_module_id", module_code: "COMP-PLANNING" },
  { handoff_id: 421, column: "source_domain_module_id", module_code: "COMP-PLANNING" },
  { handoff_id: 107, column: "source_domain_module_id", module_code: "COMP-PLANNING" },
  { handoff_id: 423, column: "source_domain_module_id", module_code: "COMP-INCENTIVES" },
  { handoff_id: 424, column: "source_domain_module_id", module_code: "COMP-INCENTIVES" },
  { handoff_id: 425, column: "source_domain_module_id", module_code: "COMP-BENCHMARKING" },
  // Inbound (set target where COMP-MGMT is target_domain_id and NULL)
  { handoff_id: 113, column: "target_domain_module_id", module_code: "COMP-PLANNING" },
  { handoff_id: 121, column: "target_domain_module_id", module_code: "COMP-STATEMENTS" },
  { handoff_id: 123, column: "target_domain_module_id", module_code: "COMP-PLANNING" },
  { handoff_id: 372, column: "target_domain_module_id", module_code: "COMP-PLANNING" },
  { handoff_id: 385, column: "target_domain_module_id", module_code: "COMP-PLANNING" },
  { handoff_id: 387, column: "target_domain_module_id", module_code: "COMP-BENCHMARKING" },
  { handoff_id: 439, column: "target_domain_module_id", module_code: "COMP-PLANNING" },
  { handoff_id: 460, column: "target_domain_module_id", module_code: "COMP-BENCHMARKING" },
  { handoff_id: 1076, column: "target_domain_module_id", module_code: "COMP-STATEMENTS" },
  // Leave NULL with notes
  {
    handoff_id: 381,
    column: "target_domain_module_id",
    module_code: "",
    notes_if_null:
      "COMP-MGMT does not master employment_contracts; no COMP-MGMT module is a defensible payload owner.",
  },
  {
    handoff_id: 398,
    column: "target_domain_module_id",
    module_code: "",
    notes_if_null:
      "COMP-MGMT does not master job_offers; payload sits in ATS. No defensible COMP-MGMT module pick.",
  },
];

// ---------- MAIN ----------

async function main() {
  console.log("COMP-MGMT Phase M + Handoffs loader");
  console.log("====================================\n");

  // Pre-flight em-dash check.
  validate(MODULES, "MODULES");
  validate(MODULE_CAPABILITIES, "MODULE_CAPABILITIES");
  validate(MODULE_DATA_OBJECTS, "MODULE_DATA_OBJECTS");
  validate(STARTER_MODULES, "STARTER_MODULES");
  validate(TRIGGER_EVENTS, "TRIGGER_EVENTS");
  validate(CROSS_DOMAIN_HANDOFFS, "CROSS_DOMAIN_HANDOFFS");
  validate(INTRA_HANDOFFS, "INTRA_HANDOFFS");

  // --- 1. domain_modules ---
  console.log("Step 1: domain_modules");
  const existingModules = await get(
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`
  );
  const moduleIdByCode = new Map<string, number>(
    existingModules.map((m: any) => [m.domain_module_code, m.id])
  );
  for (const m of MODULES) {
    if (moduleIdByCode.has(m.domain_module_code)) {
      console.log(`  exists: ${m.domain_module_code}`);
      continue;
    }
    const row = {
      domain_id: DOMAIN_ID,
      domain_module_code: m.domain_module_code,
      domain_module_name: m.domain_module_name,
      description: m.description,
    };
    const created = await postOne("/domain_modules", row);
    moduleIdByCode.set(m.domain_module_code, created.id);
    console.log(`  + created ${m.domain_module_code} id=${created.id}`);
  }

  // --- 2. domain_starter_modules ---
  console.log("\nStep 2: domain_starter_modules");
  const existingStarters = await get(
    `/domain_starter_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_id,position`
  );
  const starterByModuleId = new Set<number>(existingStarters.map((s: any) => s.domain_module_id));
  for (const s of STARTER_MODULES) {
    const modId = moduleIdByCode.get(s.module)!;
    if (starterByModuleId.has(modId)) {
      console.log(`  exists: ${s.module}`);
      continue;
    }
    const row = {
      domain_id: DOMAIN_ID,
      domain_module_id: modId,
      position: s.position,
      notes: s.notes,
    };
    await postOne("/domain_starter_modules", row);
    console.log(`  + created starter pos ${s.position} for ${s.module}`);
  }

  // --- 3. domain_module_capabilities ---
  console.log("\nStep 3: domain_module_capabilities");
  const capRows = await get(
    `/capabilities?capability_code=in.(COMP-PLANNING,PAY-EQUITY,INCENTIVE-MGMT,COMP-BENCHMARK,EQUITY-MGMT)&select=id,capability_code`
  );
  const capIdByCode = new Map<string, number>(capRows.map((c: any) => [c.capability_code, c.id]));
  const moduleIds = [...moduleIdByCode.values()];
  const existingMcs = await get(
    `/domain_module_capabilities?domain_module_id=in.(${moduleIds.join(",")})&select=id,domain_module_id,capability_id`
  );
  const mcKey = new Set<string>(existingMcs.map((r: any) => `${r.domain_module_id}:${r.capability_id}`));
  for (const mc of MODULE_CAPABILITIES) {
    const modId = moduleIdByCode.get(mc.module)!;
    const capId = capIdByCode.get(mc.capability_code)!;
    const k = `${modId}:${capId}`;
    if (mcKey.has(k)) {
      console.log(`  exists: ${mc.module} / ${mc.capability_code}`);
      continue;
    }
    await postOne("/domain_module_capabilities", {
      domain_module_id: modId,
      capability_id: capId,
      notes: mc.notes,
    });
    console.log(`  + created ${mc.module} / ${mc.capability_code}`);
  }

  // --- 4. domain_module_data_objects ---
  console.log("\nStep 4: domain_module_data_objects");
  const dataObjectNames = [...new Set(MODULE_DATA_OBJECTS.map((r) => r.data_object_name))];
  const doRows = await get(
    `/data_objects?data_object_name=in.(${dataObjectNames.join(",")})&select=id,data_object_name`
  );
  const doIdByName = new Map<string, number>(doRows.map((d: any) => [d.data_object_name, d.id]));
  const existingMdos = await get(
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds.join(",")})&select=id,domain_module_id,data_object_id`
  );
  const mdoKey = new Set<string>(existingMdos.map((r: any) => `${r.domain_module_id}:${r.data_object_id}`));
  for (const mdo of MODULE_DATA_OBJECTS) {
    const modId = moduleIdByCode.get(mdo.module)!;
    const doId = doIdByName.get(mdo.data_object_name);
    if (doId === undefined) {
      console.log(`  SKIP (data_object not found): ${mdo.data_object_name}`);
      continue;
    }
    const k = `${modId}:${doId}`;
    if (mdoKey.has(k)) {
      console.log(`  exists: ${mdo.module} / ${mdo.data_object_name}`);
      continue;
    }
    await postOne("/domain_module_data_objects", {
      domain_module_id: modId,
      data_object_id: doId,
      role: mdo.role,
      necessity: mdo.necessity,
      notes: "",
    });
    console.log(`  + created ${mdo.module} / ${mdo.data_object_name} (${mdo.role}/${mdo.necessity})`);
  }

  // --- 5. trigger_events ---
  console.log("\nStep 5: trigger_events");
  const teEventNames = [...new Set(TRIGGER_EVENTS.map((t) => t.event_name))];
  const existingTes = await get(
    `/trigger_events?event_name=in.(${teEventNames.join(",")})&select=id,event_name`
  );
  const teIdByName = new Map<string, number>(existingTes.map((t: any) => [t.event_name, t.id]));
  for (const te of TRIGGER_EVENTS) {
    if (teIdByName.has(te.event_name)) {
      console.log(`  exists: ${te.event_name}`);
      continue;
    }
    const doId = doIdByName.get(te.data_object_name);
    if (doId === undefined) throw new Error(`data_object not found: ${te.data_object_name}`);
    const created = await postOne("/trigger_events", {
      event_name: te.event_name,
      description: te.description,
      data_object_id: doId,
      event_category: "state_change",
      from_state: te.from_state,
      to_state: te.to_state,
    });
    teIdByName.set(te.event_name, created.id);
    console.log(`  + created ${te.event_name} id=${created.id}`);
  }

  // Also resolve existing events used by handoffs.
  const handoffEventNames = [
    ...new Set(
      [...CROSS_DOMAIN_HANDOFFS, ...INTRA_HANDOFFS].map((h) => h.trigger_event_name)
    ),
  ];
  const allHandoffTeRows = await get(
    `/trigger_events?event_name=in.(${handoffEventNames.join(",")})&select=id,event_name`
  );
  for (const r of allHandoffTeRows) {
    teIdByName.set(r.event_name, r.id);
  }

  // Resolve domain_codes -> ids for cross-domain handoff targets.
  const targetDomainCodes = [...new Set(CROSS_DOMAIN_HANDOFFS.map((h) => h.target_domain_code))];
  const targetDomainRows = await get(
    `/domains?domain_code=in.(${targetDomainCodes.join(",")})&select=id,domain_code`
  );
  const domainIdByCode = new Map<string, number>(
    targetDomainRows.map((d: any) => [d.domain_code, d.id])
  );
  for (const code of targetDomainCodes) {
    if (!domainIdByCode.has(code)) {
      console.log(`  WARN: target domain not in catalog: ${code}`);
    }
  }

  // Resolve payload data_objects for handoffs (some not in MODULE_DATA_OBJECTS).
  const allPayloadNames = [
    ...new Set(
      [...CROSS_DOMAIN_HANDOFFS, ...INTRA_HANDOFFS].map((h) => h.payload_data_object_name)
    ),
  ];
  const payloadRows = await get(
    `/data_objects?data_object_name=in.(${allPayloadNames.join(",")})&select=id,data_object_name`
  );
  for (const r of payloadRows) doIdByName.set(r.data_object_name, r.id);

  // --- 6. handoffs ---
  console.log("\nStep 6: handoffs (cross-domain + intra-domain)");
  // Existing handoff keys: (source_domain_id, target_domain_id, trigger_event_id, data_object_id, source_module_id?, target_module_id?)
  // For idempotency, query by (source_domain_id, target_domain_id, trigger_event_id, data_object_id).
  for (const h of CROSS_DOMAIN_HANDOFFS) {
    const srcModId = moduleIdByCode.get(h.source_module)!;
    const tgtDomainId = domainIdByCode.get(h.target_domain_code);
    if (tgtDomainId === undefined) {
      console.log(`  SKIP cross-domain (target domain unknown): ${h.target_domain_code}`);
      continue;
    }
    const teId = teIdByName.get(h.trigger_event_name);
    if (teId === undefined) {
      console.log(`  SKIP cross-domain (trigger event unknown): ${h.trigger_event_name}`);
      continue;
    }
    const payloadDoId = doIdByName.get(h.payload_data_object_name);
    if (payloadDoId === undefined) {
      console.log(`  SKIP cross-domain (payload unknown): ${h.payload_data_object_name}`);
      continue;
    }
    const existing = await get(
      `/handoffs?source_domain_id=eq.${DOMAIN_ID}&target_domain_id=eq.${tgtDomainId}&trigger_event_id=eq.${teId}&data_object_id=eq.${payloadDoId}&select=id`
    );
    if (existing.length > 0) {
      console.log(
        `  exists: ${h.source_module} -> ${h.target_domain_code} : ${h.trigger_event_name} (${h.payload_data_object_name}) id=${existing[0].id}`
      );
      continue;
    }
    const created = await postOne("/handoffs", {
      source_domain_id: DOMAIN_ID,
      target_domain_id: tgtDomainId,
      source_domain_module_id: srcModId,
      target_domain_module_id: null,
      trigger_event_id: teId,
      data_object_id: payloadDoId,
      integration_pattern: h.integration_pattern,
      friction_level: h.friction_level,
      description: h.description,
      notes: "",
    });
    console.log(
      `  + created cross ${h.source_module} -> ${h.target_domain_code} : ${h.trigger_event_name} id=${created.id}`
    );
  }
  for (const h of INTRA_HANDOFFS) {
    const srcModId = moduleIdByCode.get(h.source_module)!;
    const tgtModId = moduleIdByCode.get(h.target_module)!;
    const teId = teIdByName.get(h.trigger_event_name);
    if (teId === undefined) {
      console.log(`  SKIP intra (trigger event unknown): ${h.trigger_event_name}`);
      continue;
    }
    const payloadDoId = doIdByName.get(h.payload_data_object_name);
    if (payloadDoId === undefined) {
      console.log(`  SKIP intra (payload unknown): ${h.payload_data_object_name}`);
      continue;
    }
    const existing = await get(
      `/handoffs?source_domain_id=eq.${DOMAIN_ID}&target_domain_id=eq.${DOMAIN_ID}&trigger_event_id=eq.${teId}&data_object_id=eq.${payloadDoId}&source_domain_module_id=eq.${srcModId}&target_domain_module_id=eq.${tgtModId}&select=id`
    );
    if (existing.length > 0) {
      console.log(
        `  exists: intra ${h.source_module} -> ${h.target_module} : ${h.trigger_event_name} id=${existing[0].id}`
      );
      continue;
    }
    const created = await postOne("/handoffs", {
      source_domain_id: DOMAIN_ID,
      target_domain_id: DOMAIN_ID,
      source_domain_module_id: srcModId,
      target_domain_module_id: tgtModId,
      trigger_event_id: teId,
      data_object_id: payloadDoId,
      integration_pattern: h.integration_pattern,
      friction_level: h.friction_level,
      description: h.description,
      notes: "",
    });
    console.log(
      `  + created intra ${h.source_module} -> ${h.target_module} : ${h.trigger_event_name} id=${created.id}`
    );
  }

  // --- 7. PATCH lifecycle states (M5) ---
  console.log("\nStep 7: data_object_lifecycle_states.domain_module_id (M5)");
  const lifecycleDoIds = [...new Set(LIFECYCLE_STATE_MODULES.map((l) => doIdByName.get(l.data_object_name)!))];
  const lcRows = await get(
    `/data_object_lifecycle_states?data_object_id=in.(${lifecycleDoIds.join(",")})&select=id,data_object_id,state_name,domain_module_id`
  );
  let lcPatched = 0;
  for (const l of LIFECYCLE_STATE_MODULES) {
    const doId = doIdByName.get(l.data_object_name);
    const modId = moduleIdByCode.get(l.module);
    if (doId === undefined || modId === undefined) continue;
    const row = lcRows.find(
      (r: any) => r.data_object_id === doId && r.state_name === l.state_name
    );
    if (!row) {
      console.log(`  WARN: lifecycle state not found ${l.data_object_name}.${l.state_name}`);
      continue;
    }
    if (row.domain_module_id === modId) {
      // already set correctly
      continue;
    }
    await patch(`/data_object_lifecycle_states?id=eq.${row.id}`, { domain_module_id: modId });
    lcPatched++;
    console.log(`  patched ${l.data_object_name}.${l.state_name} -> ${l.module}`);
  }
  console.log(`  ${lcPatched} lifecycle states patched.`);

  // --- 8. B10b backfill PATCHes ---
  console.log("\nStep 8: B10b handoff module backfill");
  for (const b of B10B_BACKFILL) {
    if (b.module_code === "") {
      // Set notes only if currently empty.
      const cur = await get(`/handoffs?id=eq.${b.handoff_id}&select=id,notes,${b.column}`);
      if (cur.length === 0) {
        console.log(`  handoff ${b.handoff_id} not found, skipping`);
        continue;
      }
      const row = cur[0];
      if (row[b.column] !== null) {
        console.log(`  handoff ${b.handoff_id} ${b.column} already set, skipping null-with-note`);
        continue;
      }
      const newNote = row.notes && row.notes.includes(b.notes_if_null!) ? row.notes : (row.notes ? row.notes + " | " : "") + b.notes_if_null;
      await patch(`/handoffs?id=eq.${b.handoff_id}`, { notes: newNote });
      console.log(`  handoff ${b.handoff_id}: left ${b.column} NULL, appended note`);
      continue;
    }
    const modId = moduleIdByCode.get(b.module_code);
    if (modId === undefined) {
      console.log(`  ERR: unknown module ${b.module_code} for handoff ${b.handoff_id}`);
      continue;
    }
    const cur = await get(`/handoffs?id=eq.${b.handoff_id}&select=id,${b.column}`);
    if (cur.length === 0) {
      console.log(`  handoff ${b.handoff_id} not found, skipping`);
      continue;
    }
    if (cur[0][b.column] === modId) {
      console.log(`  handoff ${b.handoff_id} ${b.column} already = ${b.module_code}`);
      continue;
    }
    const body: any = {};
    body[b.column] = modId;
    await patch(`/handoffs?id=eq.${b.handoff_id}`, body);
    console.log(`  patched handoff ${b.handoff_id} ${b.column} -> ${b.module_code} (${modId})`);
  }

  // --- Verify ---
  console.log("\nStep 9: post-load verification");
  const finalModules = await get(`/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`);
  const finalMc = await get(`/domain_module_capabilities?domain_module_id=in.(${[...moduleIdByCode.values()].join(",")})&select=id`);
  const finalMdo = await get(`/domain_module_data_objects?domain_module_id=in.(${[...moduleIdByCode.values()].join(",")})&select=id`);
  const finalStarters = await get(`/domain_starter_modules?domain_id=eq.${DOMAIN_ID}&select=id`);
  const finalTes = await get(`/trigger_events?event_name=in.(${[...new Set(TRIGGER_EVENTS.map((t) => t.event_name))].join(",")})&select=id,event_name`);
  const finalCross = await get(`/handoffs?source_domain_id=eq.${DOMAIN_ID}&target_domain_id=neq.${DOMAIN_ID}&select=id,source_domain_module_id,target_domain_id,trigger_event_id`);
  const finalIntra = await get(`/handoffs?source_domain_id=eq.${DOMAIN_ID}&target_domain_id=eq.${DOMAIN_ID}&select=id`);
  const finalLifecyclesNullForOwned = await get(
    `/data_object_lifecycle_states?data_object_id=in.(${lifecycleDoIds.join(",")})&requires_permission=eq.true&domain_module_id=is.null&select=id,data_object_id,state_name`
  );

  console.log(`  domain_modules: ${finalModules.length}`);
  console.log(`  domain_starter_modules: ${finalStarters.length}`);
  console.log(`  domain_module_capabilities: ${finalMc.length}`);
  console.log(`  domain_module_data_objects: ${finalMdo.length}`);
  console.log(`  trigger_events (new set): ${finalTes.length}`);
  console.log(`  cross-domain outbound handoffs: ${finalCross.length}`);
  console.log(`  intra-domain handoffs: ${finalIntra.length}`);
  console.log(`  lifecycle states (req_perm + module NULL): ${finalLifecyclesNullForOwned.length}`);
  if (finalLifecyclesNullForOwned.length > 0) {
    for (const r of finalLifecyclesNullForOwned) {
      console.log(`    still NULL: data_object ${r.data_object_id} / ${r.state_name}`);
    }
  }
  const outboundWithoutSourceModule = finalCross.filter((c: any) => c.source_domain_module_id === null);
  console.log(`  outbound handoffs without source_domain_module_id: ${outboundWithoutSourceModule.length}`);

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("\nFATAL:", e?.message || e);
  process.exit(1);
});
