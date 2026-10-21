// BEN-ADMIN F2 — module-level system skills + tools (Rule #17).
// 4 skills (one per module), authors ~23 new mutate/compute/side_effect tools,
// links skill_tools, then retires legacy domain-level skill 32.
// Idempotent; record_status defaults to 'new' on every insert.

async function semantius(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<unknown> {
  const args = { method, path, ...(body !== undefined ? { body } : {}) };
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(args));
  await proc.stdin.end();
  const [stdout, stderr, exit] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exit !== 0) {
    throw new Error(`semantius ${method} ${path} failed (${exit}): ${stderr || stdout}`);
  }
  return stdout.trim() ? JSON.parse(stdout) : null;
}

type ToolSpec = {
  tool_name: string;
  description: string;
  operation_kind: "query" | "mutate" | "side_effect" | "compute" | "inbound";
  coverage_tier: "platform" | "external" | "integration";
  data_object_id: number | null;
};

const NEW_TOOLS: ToolSpec[] = [
  // Module 71 mutates
  { tool_name: "activate_benefit_plan",           description: "Activate a benefit plan, making it available for enrollment.",     operation_kind: "mutate", coverage_tier: "platform", data_object_id: 146 },
  { tool_name: "deactivate_benefit_plan",         description: "Deactivate a benefit plan, retiring it from new enrollments.",    operation_kind: "mutate", coverage_tier: "platform", data_object_id: 146 },
  { tool_name: "open_benefit_open_enrollment",    description: "Open an annual or special enrollment window.",                    operation_kind: "mutate", coverage_tier: "platform", data_object_id: 150 },
  { tool_name: "close_benefit_open_enrollment",   description: "Close an enrollment window; elections lock.",                     operation_kind: "mutate", coverage_tier: "platform", data_object_id: 150 },
  { tool_name: "process_benefit_open_enrollment", description: "Finalize a closed enrollment window: generate feeds, update payroll.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: 150 },
  // Module 72 mutates
  { tool_name: "elect_benefit_enrollment",        description: "Record an employee's plan election.",                              operation_kind: "mutate", coverage_tier: "platform", data_object_id: 147 },
  { tool_name: "activate_benefit_enrollment",     description: "Activate an elected enrollment on its effective date.",            operation_kind: "mutate", coverage_tier: "platform", data_object_id: 147 },
  { tool_name: "terminate_benefit_enrollment",    description: "Terminate an active enrollment (separation, qualifying event).",    operation_kind: "mutate", coverage_tier: "platform", data_object_id: 147 },
  { tool_name: "verify_benefit_dependent",        description: "Mark a dependent verified after documentation review.",            operation_kind: "mutate", coverage_tier: "platform", data_object_id: 148 },
  { tool_name: "deactivate_benefit_dependent",    description: "Deactivate a dependent (aged out, divorce, voluntary removal).",   operation_kind: "mutate", coverage_tier: "platform", data_object_id: 148 },
  { tool_name: "submit_life_event",               description: "Submit a declared life event for review.",                          operation_kind: "mutate", coverage_tier: "platform", data_object_id: 149 },
  { tool_name: "approve_life_event",              description: "Approve a submitted life event; opens special-enrollment window.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: 149 },
  { tool_name: "reject_life_event",               description: "Reject a submitted life event (insufficient documentation, etc.).", operation_kind: "mutate", coverage_tier: "platform", data_object_id: 149 },
  { tool_name: "process_life_event",              description: "Finalize an approved life event: apply enrollment changes.",        operation_kind: "mutate", coverage_tier: "platform", data_object_id: 149 },
  // Module 73 mutates
  { tool_name: "contract_benefit_carrier",        description: "Move a prospect carrier to contracted status.",                    operation_kind: "mutate", coverage_tier: "platform", data_object_id: 151 },
  { tool_name: "activate_benefit_carrier",        description: "Activate a contracted carrier; plans can reference it.",            operation_kind: "mutate", coverage_tier: "platform", data_object_id: 151 },
  { tool_name: "suspend_benefit_carrier",         description: "Suspend an active carrier (compliance issue, contract dispute).",    operation_kind: "mutate", coverage_tier: "platform", data_object_id: 151 },
  { tool_name: "terminate_benefit_carrier",       description: "Terminate a carrier relationship; existing enrollments wind down.",  operation_kind: "mutate", coverage_tier: "platform", data_object_id: 151 },
  { tool_name: "transmit_carrier_feed",           description: "Transmit a generated eligibility/enrollment feed to the carrier.",   operation_kind: "mutate", coverage_tier: "platform", data_object_id: 152 },
  { tool_name: "fail_carrier_feed",               description: "Mark a carrier feed failed after transmission or reconciliation error.", operation_kind: "mutate", coverage_tier: "platform", data_object_id: 152 },
  // Module 74 compute / side_effect
  { tool_name: "generate_1095c_form",             description: "Generate per-employee 1095-C ACA disclosure forms.",                operation_kind: "compute",     coverage_tier: "external", data_object_id: null },
  { tool_name: "generate_1094c_form",             description: "Generate employer-aggregate 1094-C ACA transmittal form.",          operation_kind: "compute",     coverage_tier: "external", data_object_id: null },
  { tool_name: "file_aca_returns",                description: "File 1094-C/1095-C electronic returns with the IRS AIR system.",     operation_kind: "side_effect", coverage_tier: "external", data_object_id: null },
];

type SkillSpec = {
  skill_name: string;
  skill_type: "system";
  domain_module_id: number;
  description: string;
  tools: Array<{ tool_name: string; requirement_level: "required" | "optional"; notes: string }>;
};

const SKILLS: SkillSpec[] = [
  {
    skill_name: "ben_plan_design_agent",
    skill_type: "system",
    domain_module_id: 71,
    description: "Agent for Plan Design and Enrollment Setup: maintain benefit plan catalog, configure enrollment windows, attach carriers, map deduction codes.",
    tools: [
      { tool_name: "query_benefit_plans",            requirement_level: "required", notes: "Plan catalog read." },
      { tool_name: "query_benefit_open_enrollments", requirement_level: "required", notes: "Enrollment window state." },
      { tool_name: "query_benefit_carriers",         requirement_level: "required", notes: "Attach carrier to plan." },
      { tool_name: "query_deduction_codes",          requirement_level: "required", notes: "Plan-to-deduction mapping." },
      { tool_name: "query_legal_entities",           requirement_level: "required", notes: "Plan sponsor scoping by legal entity." },
      { tool_name: "activate_benefit_plan",          requirement_level: "required", notes: "Workflow gate: publish plan to catalog." },
      { tool_name: "deactivate_benefit_plan",        requirement_level: "required", notes: "Workflow gate: retire plan." },
      { tool_name: "open_benefit_open_enrollment",   requirement_level: "required", notes: "Workflow gate: open OE window." },
      { tool_name: "close_benefit_open_enrollment",  requirement_level: "required", notes: "Workflow gate: close OE window." },
      { tool_name: "process_benefit_open_enrollment", requirement_level: "required", notes: "Workflow gate: finalize closed OE (feeds, payroll)." },
      { tool_name: "notify_team",                    requirement_level: "optional", notes: "OE-window announcements to HR / Benefits team." },
    ],
  },
  {
    skill_name: "ben_enrollment_agent",
    skill_type: "system",
    domain_module_id: 72,
    description: "Agent for Enrollment and Life Events: process elections, manage dependents, handle life-event-driven enrollment changes.",
    tools: [
      { tool_name: "query_benefit_enrollments",     requirement_level: "required", notes: "Enrollment lifecycle." },
      { tool_name: "query_benefit_dependents",      requirement_level: "required", notes: "Dependent lifecycle." },
      { tool_name: "query_life_events",             requirement_level: "required", notes: "Life-event review surface." },
      { tool_name: "query_benefit_plans",           requirement_level: "required", notes: "Read plan catalog at election time." },
      { tool_name: "query_benefit_open_enrollments", requirement_level: "required", notes: "Validate window is open." },
      { tool_name: "query_employees",               requirement_level: "required", notes: "Enrollee identity and employment slice." },
      { tool_name: "query_employment_events",       requirement_level: "required", notes: "Employment events trigger eligibility reevaluation." },
      { tool_name: "query_candidates",              requirement_level: "optional", notes: "Pre-hire enrollment setup (offer-accept → enrollment)." },
      { tool_name: "query_hr_cases",                requirement_level: "optional", notes: "HRSD-escalated benefits questions land here." },
      { tool_name: "query_org_units",               requirement_level: "optional", notes: "Eligibility by org unit when integration absent." },
      { tool_name: "elect_benefit_enrollment",      requirement_level: "required", notes: "Workflow gate: record election." },
      { tool_name: "activate_benefit_enrollment",   requirement_level: "required", notes: "Workflow gate: activate on effective date." },
      { tool_name: "terminate_benefit_enrollment",  requirement_level: "required", notes: "Workflow gate: terminate (separation, QLE)." },
      { tool_name: "verify_benefit_dependent",      requirement_level: "required", notes: "Workflow gate: mark dependent verified after documentation." },
      { tool_name: "deactivate_benefit_dependent",  requirement_level: "required", notes: "Workflow gate: aged-out / divorce / voluntary removal." },
      { tool_name: "submit_life_event",             requirement_level: "required", notes: "Workflow gate: submit declared life event for review." },
      { tool_name: "approve_life_event",            requirement_level: "required", notes: "Workflow gate: approve life event; opens enrollment window." },
      { tool_name: "reject_life_event",             requirement_level: "required", notes: "Workflow gate: reject life event (insufficient docs)." },
      { tool_name: "process_life_event",            requirement_level: "required", notes: "Workflow gate: finalize approved life event." },
      { tool_name: "notify_person",                 requirement_level: "required", notes: "Enrollment confirmations, life-event approvals, dependent verification outcomes." },
    ],
  },
  {
    skill_name: "ben_carrier_integ_agent",
    skill_type: "system",
    domain_module_id: 73,
    description: "Agent for Carrier Connectivity: manage carrier relationships, generate and transmit eligibility feeds, reconcile carrier acknowledgements.",
    tools: [
      { tool_name: "query_benefit_carriers",     requirement_level: "required", notes: "Carrier catalog." },
      { tool_name: "query_carrier_feeds",        requirement_level: "required", notes: "Feed transmission and reconciliation state." },
      { tool_name: "query_benefit_enrollments", requirement_level: "required", notes: "Feed payload source." },
      { tool_name: "query_benefit_plans",       requirement_level: "required", notes: "Plan-to-carrier mapping at feed assembly." },
      { tool_name: "contract_benefit_carrier",  requirement_level: "required", notes: "Workflow gate: move prospect to contracted." },
      { tool_name: "activate_benefit_carrier",  requirement_level: "required", notes: "Workflow gate: activate contracted carrier." },
      { tool_name: "suspend_benefit_carrier",   requirement_level: "required", notes: "Workflow gate: suspend (compliance / dispute)." },
      { tool_name: "terminate_benefit_carrier", requirement_level: "required", notes: "Workflow gate: terminate relationship." },
      { tool_name: "transmit_carrier_feed",     requirement_level: "required", notes: "Workflow gate: transmit feed file to carrier." },
      { tool_name: "fail_carrier_feed",         requirement_level: "required", notes: "Workflow gate: mark feed failed after transmission / reconciliation error." },
      { tool_name: "sign_document",             requirement_level: "optional", notes: "Carrier contract execution at onboarding." },
      { tool_name: "notify_team",               requirement_level: "required", notes: "Failed-feed alerts to feed-ops owner." },
    ],
  },
  {
    skill_name: "ben_aca_compliance_agent",
    skill_type: "system",
    domain_module_id: 74,
    description: "Agent for ACA Compliance Reporting: generate 1094-C/1095-C forms, perform affordability calculations, file annual returns.",
    tools: [
      { tool_name: "query_benefit_enrollments", requirement_level: "required", notes: "Coverage offered data for 1095-C lines 14-16." },
      { tool_name: "query_employees",           requirement_level: "required", notes: "Full-time status, hire/termination dates." },
      { tool_name: "query_legal_entities",      requirement_level: "required", notes: "ALE membership and EIN per legal entity." },
      { tool_name: "query_pay_slips",           requirement_level: "required", notes: "Affordability calculation (1095-C line 15)." },
      { tool_name: "query_benefit_plans",       requirement_level: "required", notes: "Lowest-cost self-only minimum-value plan identification." },
      { tool_name: "generate_1095c_form",       requirement_level: "required", notes: "Per-employee disclosure forms." },
      { tool_name: "generate_1094c_form",       requirement_level: "required", notes: "Employer-aggregate transmittal form." },
      { tool_name: "file_aca_returns",          requirement_level: "required", notes: "Electronic filing with IRS AIR system." },
      { tool_name: "notify_person",             requirement_level: "required", notes: "Furnish 1095-C forms to employees by statutory deadline." },
    ],
  },
];

async function upsertTools(): Promise<Map<string, number>> {
  console.log("\n[Step 1] Upsert tools");
  const existing = (await semantius(
    "GET",
    `/tools?tool_name=in.(${NEW_TOOLS.map((t) => t.tool_name).join(",")})&select=id,tool_name`,
  )) as Array<{ id: number; tool_name: string }>;
  const have = new Map(existing.map((r) => [r.tool_name, r.id]));
  const missing = NEW_TOOLS.filter((t) => !have.has(t.tool_name));
  if (missing.length === 0) {
    console.log("  all new tools already present; skipping insert");
  } else {
    const inserted = (await semantius("POST", "/tools?select=id,tool_name", missing)) as Array<{ id: number; tool_name: string }>;
    console.log(`  INSERT tools: ${inserted.length}`);
    for (const r of inserted) have.set(r.tool_name, r.id);
  }
  // Build complete tool_name -> id map for everything any skill references
  const allReferenced = new Set<string>();
  for (const s of SKILLS) for (const t of s.tools) allReferenced.add(t.tool_name);
  const allTools = (await semantius(
    "GET",
    `/tools?tool_name=in.(${Array.from(allReferenced).join(",")})&select=id,tool_name`,
  )) as Array<{ id: number; tool_name: string }>;
  const map = new Map(allTools.map((r) => [r.tool_name, r.id]));
  const stillMissing = Array.from(allReferenced).filter((n) => !map.has(n));
  if (stillMissing.length > 0) throw new Error(`tools missing after upsert: ${stillMissing.join(", ")}`);
  return map;
}

async function upsertSkills(): Promise<Map<number, number>> {
  console.log("\n[Step 2] Upsert module-level system skills");
  const existing = (await semantius(
    "GET",
    `/skills?domain_module_id=in.(71,72,73,74)&skill_type=eq.system&select=id,skill_name,domain_module_id`,
  )) as Array<{ id: number; skill_name: string; domain_module_id: number }>;
  const have = new Map(existing.map((r) => [r.domain_module_id, r.id]));
  const missing = SKILLS.filter((s) => !have.has(s.domain_module_id)).map((s) => ({
    skill_name: s.skill_name,
    skill_type: s.skill_type,
    domain_module_id: s.domain_module_id,
    domain_id: 61,
    description: s.description,
  }));
  if (missing.length === 0) {
    console.log("  all module skills already present; skipping insert");
  } else {
    const inserted = (await semantius("POST", "/skills?select=id,skill_name,domain_module_id", missing)) as Array<{
      id: number;
      skill_name: string;
      domain_module_id: number;
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
    const existing = (await semantius(
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
      console.log(`  ${spec.skill_name} (skill ${skillId}): all skill_tools present`);
      continue;
    }
    const inserted = await semantius("POST", "/skill_tools?select=tool_id", rows);
    console.log(`  ${spec.skill_name} (skill ${skillId}): INSERT skill_tools ${Array.isArray(inserted) ? inserted.length : 0}`);
  }
}

async function retireLegacySkill(): Promise<void> {
  console.log("\n[Step 4] Retire legacy domain-level skill 32");
  const legacy = (await semantius(
    "GET",
    "/skills?id=eq.32&select=id,skill_name,domain_module_id",
  )) as Array<{ id: number; skill_name: string; domain_module_id: number | null }>;
  if (legacy.length === 0) {
    console.log("  legacy skill 32 already retired; skipping");
    return;
  }
  // Confirm all 4 module skills exist before retiring
  const moduleSkills = (await semantius(
    "GET",
    "/skills?domain_module_id=in.(71,72,73,74)&skill_type=eq.system&select=id,domain_module_id",
  )) as Array<{ id: number; domain_module_id: number }>;
  const modulesCovered = new Set(moduleSkills.map((r) => r.domain_module_id));
  for (const m of [71, 72, 73, 74]) {
    if (!modulesCovered.has(m)) {
      throw new Error(`refusing to retire skill 32: module ${m} has no system skill yet`);
    }
  }
  await semantius("DELETE", "/skill_tools?skill_id=eq.32");
  console.log("  DELETE skill_tools for skill 32");
  await semantius("DELETE", "/skills?id=eq.32");
  console.log("  DELETE skill 32");
}

async function verify(): Promise<void> {
  console.log("\nPost-load verification");
  const skills = (await semantius(
    "GET",
    "/skills?or=(domain_id.eq.61,domain_module_id.in.(71,72,73,74))&select=id,skill_name,skill_type,domain_module_id&order=domain_module_id.asc",
  )) as Array<{ id: number; skill_name: string; skill_type: string; domain_module_id: number | null }>;
  console.log(`  skills: ${skills.length} (${skills.map((s) => `${s.skill_name}@${s.domain_module_id}`).join(", ")})`);
  for (const s of skills) {
    const st = (await semantius(
      "GET",
      `/skill_tools?skill_id=eq.${s.id}&select=requirement_level,tools(coverage_tier,operation_kind)`,
    )) as Array<{ requirement_level: string; tools: { coverage_tier: string; operation_kind: string } }>;
    const total = st.length;
    const platform = st.filter((r) => r.tools.coverage_tier === "platform").length;
    const operational = st.filter((r) => ["platform", "integration"].includes(r.tools.coverage_tier)).length;
    if (total === 0) {
      console.log(`  ${s.skill_name}: 0 tools`);
      continue;
    }
    const strict = ((platform / total) * 100).toFixed(0);
    const op = ((operational / total) * 100).toFixed(0);
    console.log(`  ${s.skill_name}: ${total} tools, strict=${strict}%, operational=${op}%`);
  }
}

async function main(): Promise<void> {
  console.log("BEN-ADMIN F2 module-skills loader (2026-05-26)");
  const toolMap = await upsertTools();
  const skillMap = await upsertSkills();
  await upsertSkillTools(toolMap, skillMap);
  await retireLegacySkill();
  await verify();
}

await main();
