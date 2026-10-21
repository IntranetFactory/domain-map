// Fix 1 (TALENT-MGMT audit, 2026-05-24): M-band load.
// Creates 3 modules, links capabilities, attaches data_objects, builds starter junction.
// Idempotent: re-reads by natural key before inserting.

type Json = unknown;

const DOMAIN_ID = 58; // TALENT-MGMT

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
  const created = await pg("POST", "/domain_modules", [
    {
      domain_module_code: code,
      domain_module_name: name,
      description,
      domain_id: DOMAIN_ID,
    },
  ]);
  // PostgREST POST returns inserted rows when Prefer: return=representation; default returns minimal.
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

async function ensureModuleDataObject(
  moduleId: number,
  dataObjectId: number,
  role: "master" | "embedded_master" | "contributor" | "consumer" | "derived",
  necessity: "required" | "optional",
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

// ---------------- Module specs ----------------

const PERF_MGMT_DESC =
  "Annual / semi-annual / continuous performance review cycles plus goal-setting (OKRs, KPIs) and rating calibration. The foundation module of any talent-management deployment; review cycles produce the calibrated rating that COMP-MGMT consumes for merit cycles and that downstream succession planning relies on. Standalone vendors: Lattice, 15Five, Betterworks, Leapsome.";
const SUCCESSION_CAREER_DESC =
  "Succession planning, 9-box talent grid, and employee career aspirations / development planning. Layered on top of Performance Management because it consumes calibrated ratings and goal-completion outcomes. Used standalone in large enterprises with formal succession programs (Workday Talent Optimization, SAP SuccessFactors Succession, Cornerstone Succession).";
const FEEDBACK_DESC =
  "Continuous feedback, 1-on-1 notes, peer recognition / praise / kudos, and 360-degree feedback collection. The lightweight always-on companion to the annual review cycle. Often the first module customers adopt before a full review cycle (15Five, Lattice Feedback, Leapsome Praise).";

const MODULES = [
  { code: "TALENT-PERFORMANCE-MGMT", name: "Performance and Goal Management", description: PERF_MGMT_DESC },
  { code: "TALENT-SUCCESSION-CAREER", name: "Succession and Career Planning", description: SUCCESSION_CAREER_DESC },
  { code: "TALENT-CONTINUOUS-FEEDBACK", name: "Continuous Feedback and Recognition", description: FEEDBACK_DESC },
];

// capability id map
const CAP = {
  PERF_REVIEW: 24,
  GOAL_MGMT: 25,
  CONTINUOUS_FEEDBACK: 26,
  SUCCESSION_PLAN: 27,
  CAREER_DEV: 28,
  TALENT_CALIBRATION: 29,
};

// data_object id map
const DO = {
  employees: 31,
  hcm_positions: 32,
  job_profiles: 33,
  org_units: 34,
  skill_profiles: 172,
  performance_reviews: 174,
  performance_goals: 175,
  succession_plans: 176,
  talent_calibrations: 177,
  nine_box_placements: 178,
  career_aspirations: 179,
  feedback_records: 180,
  okr_objectives: 245,
};

async function main() {
  // 1. modules
  const ids: Record<string, number> = {};
  for (const m of MODULES) {
    ids[m.code] = await ensureModule(m.code, m.name, m.description);
    console.log(`module ${m.code} -> id ${ids[m.code]}`);
  }

  const PM = ids["TALENT-PERFORMANCE-MGMT"];
  const SC = ids["TALENT-SUCCESSION-CAREER"];
  const CF = ids["TALENT-CONTINUOUS-FEEDBACK"];

  // 2. capabilities
  const moduleCapabilities: Array<[number, number, string]> = [
    [PM, CAP.PERF_REVIEW, "Annual and continuous performance review cycles are this module's core."],
    [PM, CAP.GOAL_MGMT, "Performance goals and OKRs are managed here as the goal-setting half of the cycle."],
    [PM, CAP.TALENT_CALIBRATION, "Rating calibration sessions normalise scores before the cycle locks."],
    [SC, CAP.SUCCESSION_PLAN, "Succession bench, 9-box placement, and successor identification."],
    [SC, CAP.CAREER_DEV, "Career aspirations and individual development plans."],
    [CF, CAP.CONTINUOUS_FEEDBACK, "Continuous feedback, 1-on-1 notes, peer praise / kudos, and 360 feedback."],
  ];
  for (const [mId, cId, notes] of moduleCapabilities) {
    await ensureModuleCapability(mId, cId, notes);
  }
  console.log(`module-capabilities: ${moduleCapabilities.length} ensured`);

  // 3. data_objects per module
  type DORow = [number, number, "master" | "embedded_master" | "contributor" | "consumer" | "derived", "required" | "optional", string];
  const moduleDataObjects: DORow[] = [
    // TALENT-PERFORMANCE-MGMT
    [PM, DO.performance_reviews, "master", "required", "Canonical review cycle records (cycle, rating, manager, reviewee, calibration outcome)."],
    [PM, DO.performance_goals, "master", "required", "Goal records tied to a cycle; outcomes feed calibration and succession."],
    [PM, DO.okr_objectives, "master", "required", "Individual employee OKRs as the goal-setting half of the performance cycle."],
    [PM, DO.talent_calibrations, "master", "required", "Calibration sessions normalising ratings across managers / populations."],
    [PM, DO.employees, "embedded_master", "required", "Local shell for review-participant identity; demotes to consumer when HCM is installed."],
    [PM, DO.org_units, "embedded_master", "required", "Local manager-hierarchy shell for calibration scoping and rating roll-ups; demotes to consumer when HCM is installed."],
    [PM, DO.skill_profiles, "contributor", "required", "Performance-derived skill signals (calibrated ratings, demonstrated competencies) feed back into the skill profile."],

    // TALENT-SUCCESSION-CAREER
    [SC, DO.succession_plans, "master", "required", "Per-role succession bench: incumbent, ready-now / 1-2yr / 3-5yr successors."],
    [SC, DO.nine_box_placements, "master", "required", "Performance x potential grid placement per employee per cycle."],
    [SC, DO.career_aspirations, "master", "required", "Employee-declared aspirations, mobility preferences, target roles."],
    [SC, DO.employees, "embedded_master", "required", "Local shell for the planned-on individual; demotes when HCM is installed."],
    [SC, DO.hcm_positions, "embedded_master", "required", "Local positions shell for the role-being-planned-for; demotes when HCM is installed."],
    [SC, DO.org_units, "embedded_master", "required", "Local org-unit shell for succession-scope cuts and hierarchy navigation; demotes when HCM is installed."],
    [SC, DO.job_profiles, "contributor", "optional", "Skills / competencies slice on the job profile, used for successor-matching. HCM masters the operational profile."],
    [SC, DO.performance_reviews, "consumer", "required", "Reads calibrated ratings to drive 9-box placement and successor readiness."],
    [SC, DO.talent_calibrations, "consumer", "required", "Reads calibration outcomes to confirm 9-box placement is valid."],

    // TALENT-CONTINUOUS-FEEDBACK
    [CF, DO.feedback_records, "master", "required", "Continuous feedback notes: peer, manager, upward, 360-degree."],
    [CF, DO.employees, "embedded_master", "required", "Local shell for feedback giver / recipient / subject identity; demotes when HCM is installed."],
    [CF, DO.performance_reviews, "consumer", "optional", "Aggregates feedback into the formal review cycle when both modules are installed."],
  ];
  for (const [mId, dId, role, nec, notes] of moduleDataObjects) {
    await ensureModuleDataObject(mId, dId, role, nec, notes);
  }
  console.log(`module-data_objects: ${moduleDataObjects.length} ensured`);

  // 4. starter modules
  await ensureStarter(
    PM,
    1,
    "Start here. Performance reviews, goals, and calibration are the foundational cycle every other talent-management module hangs off. Lattice, 15Five, Workday Talent Optimization, and SAP SuccessFactors Performance all anchor on this.",
  );
  await ensureStarter(
    CF,
    2,
    "Low-friction add-on: continuous feedback and 1-on-1 notes lift the review cycle from annual ceremony to year-round practice without changing the cycle mechanics.",
  );
  await ensureStarter(
    SC,
    3,
    "Layered on top after a couple of review cycles have produced trustworthy calibrated ratings. Succession planning and 9-box placement only work once you have credible performance data to drive them.",
  );

  console.log("Fix 1 complete.");
}

await main();
