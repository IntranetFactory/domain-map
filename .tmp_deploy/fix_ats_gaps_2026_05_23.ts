/**
 * ATS gap-fix loader (audit 2026-05-23).
 *
 * Fixes:
 *   M6  - BACKGROUND-SCREENING capability + ATS link + module 7 link
 *   B12 - pre_employees (749) lifecycle states
 *   B6  - pre_employees intra-domain relationships (offer, candidate)
 *   B7  - pre_employees users edge (hr_coordinator)
 *   B4  - pre_employees has_personal_content=true
 *   B11 - pre_employees aliases
 *   E1/E6 - Role coverage of module 8 (RECRUITER, RECRUITING-MANAGER)
 *   A6  - solution_data_objects for 9 ATS primary solutions x 8 core masters
 *   A4  - HiredScore (191) not_supported on caps 14, 15, 16
 *
 * Idempotent: reads existing rows by natural key, inserts only missing.
 * Run from project root: bun run .tmp_deploy/fix_ats_gaps_2026_05_23.ts
 */

const ATS_DOMAIN_ID = 56;
const ATS_BACKGROUND_CHECKS_MODULE_ID = 7;
const ATS_PRE_EMPLOYEE_RECORD_MODULE_ID = 8;
const PRE_EMPLOYEES_ID = 749;
const JOB_OFFERS_ID = 11;
const CANDIDATES_ID = 3;
const USERS_ID = 748;
const HIREDSCORE_ID = 191;
const RECRUITER_ROLE_ID = 10006;
const RECRUITING_MANAGER_ROLE_ID = 10010;

// Core ATS masters present in every primary-coverage ATS product.
const ATS_CORE_MASTERS = [
  { id: 1, name: "job_requisitions" },
  { id: 2, name: "job_postings" },
  { id: 3, name: "candidates" },
  { id: 4, name: "job_applications" },
  { id: 8, name: "interviews" },
  { id: 9, name: "interview_scorecards" },
  { id: 10, name: "candidate_assessments" },
  { id: 11, name: "job_offers" },
];

const ATS_PRIMARY_SOLUTION_IDS = [190, 226, 227, 228, 229, 230, 231, 232, 233];

interface CmdResult {
  ok: boolean;
  data: any;
  status: number;
}

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;

  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" }
  );

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;

  if (code !== 0) {
    console.error(`  semantius failed (${code}): ${stderr.trim() || stdout.trim()}`);
    return { ok: false, data: null, status: code };
  }

  let parsed: any = null;
  try {
    parsed = stdout.trim() ? JSON.parse(stdout) : null;
  } catch {
    parsed = stdout;
  }
  return { ok: true, data: parsed, status: 0 };
}

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed`);
  return r.data;
}

async function insert(table: string, rows: any[]): Promise<any[]> {
  if (rows.length === 0) return [];
  // Chunk to stay under Windows command-line limits.
  const CHUNK = 40;
  const out: any[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const r = await postgrest("POST", `/${table}?select=*`, chunk);
    if (!r.ok) throw new Error(`POST /${table} failed on chunk starting at ${i}`);
    if (Array.isArray(r.data)) out.push(...r.data);
  }
  return out;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await postgrest("PATCH", path, body);
  if (!r.ok) throw new Error(`PATCH ${path} failed`);
  return r.data;
}

async function step1_background_screening_capability(): Promise<number> {
  const existing = await get("/capabilities?capability_code=eq.BACKGROUND-SCREENING&select=id");
  if (existing.length > 0) {
    console.log(`  capability BACKGROUND-SCREENING already exists (id=${existing[0].id})`);
    return existing[0].id;
  }

  const inserted = await insert("capabilities", [
    {
      capability_code: "BACKGROUND-SCREENING",
      capability_name: "Background Screening",
      description:
        "Pre-employment background, identity, and reference checks: criminal history, employment verification, education verification, drug screening, credit checks where lawful. FCRA / EU GDPR adverse-action workflows. Today linked to ATS only; cross-cutting candidate (also relevant in FSM contractor onboarding, PRM/TPRM partner screening) once those domains run Phase B.",
    },
  ]);
  console.log(`  + capability BACKGROUND-SCREENING (id=${inserted[0].id})`);
  return inserted[0].id;
}

async function step2_capability_domains_link(capabilityId: number) {
  const existing = await get(
    `/capability_domains?capability_id=eq.${capabilityId}&domain_id=eq.${ATS_DOMAIN_ID}&select=id`
  );
  if (existing.length > 0) {
    console.log(`  capability_domains link already exists`);
    return;
  }
  await insert("capability_domains", [
    { capability_id: capabilityId, domain_id: ATS_DOMAIN_ID },
  ]);
  console.log(`  + capability_domains: BACKGROUND-SCREENING -> ATS`);
}

async function step3_domain_module_capability_link(capabilityId: number) {
  const existing = await get(
    `/domain_module_capabilities?capability_id=eq.${capabilityId}&domain_module_id=eq.${ATS_BACKGROUND_CHECKS_MODULE_ID}&select=id`
  );
  if (existing.length > 0) {
    console.log(`  domain_module_capabilities link already exists`);
    return;
  }
  await insert("domain_module_capabilities", [
    { capability_id: capabilityId, domain_module_id: ATS_BACKGROUND_CHECKS_MODULE_ID },
  ]);
  console.log(`  + domain_module_capabilities: ATS-BACKGROUND-CHECKS realizes BACKGROUND-SCREENING`);
}

async function step4_hiredscore_not_supported_rows() {
  const missingCaps = [14, 15, 16];
  const existing = await get(
    `/solution_capabilities?solution_id=eq.${HIREDSCORE_ID}&capability_id=in.(14,15,16)&select=capability_id`
  );
  const have = new Set(existing.map((r: any) => r.capability_id));
  const toInsert = missingCaps
    .filter((c) => !have.has(c))
    .map((c) => ({
      solution_id: HIREDSCORE_ID,
      capability_id: c,
      delivery_strength: "not_supported",
    }));
  if (toInsert.length === 0) {
    console.log(`  HiredScore not_supported rows already present`);
    return;
  }
  await insert("solution_capabilities", toInsert);
  console.log(`  + ${toInsert.length} HiredScore not_supported rows (caps ${toInsert.map(r => r.capability_id).join(", ")})`);
}

async function step5_patch_pre_employees_flag() {
  const row = await get(`/data_objects?id=eq.${PRE_EMPLOYEES_ID}&select=has_personal_content`);
  if (row[0]?.has_personal_content === true) {
    console.log(`  pre_employees.has_personal_content already true`);
    return;
  }
  await patch(`/data_objects?id=eq.${PRE_EMPLOYEES_ID}`, { has_personal_content: true });
  console.log(`  ~ pre_employees.has_personal_content = true`);
}

async function step6_pre_employee_lifecycle_states() {
  const existing = await get(
    `/data_object_lifecycle_states?data_object_id=eq.${PRE_EMPLOYEES_ID}&select=state_name`
  );
  if (existing.length > 0) {
    console.log(`  pre_employees lifecycle states already exist (${existing.length} rows)`);
    return;
  }
  const mk = (
    state_name: string,
    state_order: number,
    is_initial: boolean,
    is_terminal: boolean,
    requires_permission: boolean,
    permission_verb_override: string,
    description: string
  ) => ({
    data_object_id: PRE_EMPLOYEES_ID,
    state_name,
    state_order,
    is_initial,
    is_terminal,
    requires_permission,
    permission_verb_override,
    domain_module_id: ATS_PRE_EMPLOYEE_RECORD_MODULE_ID,
    description,
  });
  const states = [
    mk("created", 1, true, false, false, "", "Record created when an offer is accepted. Paperwork packet not yet generated."),
    mk("paperwork_in_flight", 2, false, false, false, "", "I-9 / W-4 / direct-deposit / banking forms issued; awaiting candidate completion. Background check may run in parallel."),
    mk("cleared", 3, false, false, false, "", "All paperwork received and background check completed clear. Ready for HCM activation."),
    mk("activated", 4, false, true, true, "activate_pre_employee", "Reconciliation handoff fired to HCM (pre_employee.activated event). Canonical employees row created downstream; ATS record becomes read-only."),
    mk("cancelled", 5, false, true, false, "", "Offer rescinded or candidate withdrew before activation. Record retained for audit."),
  ];
  await insert("data_object_lifecycle_states", states);
  console.log(`  + 5 lifecycle states on pre_employees (created -> paperwork_in_flight -> cleared -> activated, plus cancelled)`);
}

async function step7_pre_employee_relationships() {
  const existing = await get(
    `/data_object_relationships?or=(and(data_object_id.eq.${PRE_EMPLOYEES_ID},related_data_object_id.in.(${JOB_OFFERS_ID},${CANDIDATES_ID},${USERS_ID})),and(related_data_object_id.eq.${PRE_EMPLOYEES_ID},data_object_id.in.(${JOB_OFFERS_ID},${CANDIDATES_ID},${USERS_ID})))&select=data_object_id,related_data_object_id`
  );
  const have = new Set(existing.map((r: any) => `${r.data_object_id}->${r.related_data_object_id}`));

  const proposed = [
    {
      data_object_id: JOB_OFFERS_ID,
      related_data_object_id: PRE_EMPLOYEES_ID,
      relationship_verb: "spawns pre-employee record",
      inverse_verb: "originates from offer",
      relationship_type: "one_to_one",
      relationship_kind: "reference",
      owner_side: "source",
      is_required: true,
      notes: "Triggered on job_offer.accepted; the pre-employee record is the post-offer paperwork shell.",
    },
    {
      data_object_id: CANDIDATES_ID,
      related_data_object_id: PRE_EMPLOYEES_ID,
      relationship_verb: "becomes pre-employee",
      inverse_verb: "is candidate version of",
      relationship_type: "one_to_one",
      relationship_kind: "reference",
      owner_side: "source",
      is_required: true,
      notes: "Candidate identity continues into the pre-employee record; promoted to employees on activation.",
    },
    {
      data_object_id: PRE_EMPLOYEES_ID,
      related_data_object_id: USERS_ID,
      relationship_verb: "has owning hr_coordinator",
      inverse_verb: "owns pre-employee record",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      owner_side: "source",
      is_required: true,
      notes: "HR coordinator (Recruiting Coordinator role) drives paperwork completion and activation handoff.",
    },
  ];

  const toInsert = proposed.filter(
    (r) => !have.has(`${r.data_object_id}->${r.related_data_object_id}`)
  );
  if (toInsert.length === 0) {
    console.log(`  pre_employees relationships already present`);
    return;
  }
  await insert("data_object_relationships", toInsert);
  console.log(`  + ${toInsert.length} relationships on pre_employees`);
}

async function step8_pre_employee_aliases() {
  const existing = await get(
    `/data_object_aliases?data_object_id=eq.${PRE_EMPLOYEES_ID}&select=alias_name`
  );
  const have = new Set(existing.map((r: any) => r.alias_name));
  const proposed = [
    { data_object_id: PRE_EMPLOYEES_ID, alias_name: "Pre-Hire", alias_type: "synonym" },
    { data_object_id: PRE_EMPLOYEES_ID, alias_name: "New Hire (Pre-Start)", alias_type: "synonym" },
    { data_object_id: PRE_EMPLOYEES_ID, alias_name: "Day-Zero Record", alias_type: "synonym" },
  ];
  const toInsert = proposed.filter((r) => !have.has(r.alias_name));
  if (toInsert.length === 0) {
    console.log(`  pre_employees aliases already present`);
    return;
  }
  await insert("data_object_aliases", toInsert);
  console.log(`  + ${toInsert.length} aliases on pre_employees`);
}

async function step9_role_modules() {
  const existing = await get(
    `/role_modules?domain_module_id=eq.${ATS_PRE_EMPLOYEE_RECORD_MODULE_ID}&role_id=in.(${RECRUITER_ROLE_ID},${RECRUITING_MANAGER_ROLE_ID})&select=role_id`
  );
  const have = new Set(existing.map((r: any) => r.role_id));
  const proposed = [
    {
      role_id: RECRUITER_ROLE_ID,
      domain_module_id: ATS_PRE_EMPLOYEE_RECORD_MODULE_ID,
      interaction_level: "primary",
      notes: "Recruiter owns pre-employee paperwork completion and the activation handoff to HCM.",
    },
    {
      role_id: RECRUITING_MANAGER_ROLE_ID,
      domain_module_id: ATS_PRE_EMPLOYEE_RECORD_MODULE_ID,
      interaction_level: "primary",
      notes: "Recruiting Manager has admin authority over pre-employee records and activation override.",
    },
  ];
  const toInsert = proposed.filter((r) => !have.has(r.role_id));
  if (toInsert.length === 0) {
    console.log(`  role_modules for module 8 already present`);
    return;
  }
  await insert("role_modules", toInsert);
  console.log(`  + ${toInsert.length} role_modules rows on ATS-PRE-EMPLOYEE-RECORD`);
}

async function step10_role_permissions() {
  // RECRUITER (10006) gets :manage + :hire_candidate
  // RECRUITING-MANAGER (10010) gets :admin
  const manageId = 10050;
  const adminId = 10051;
  const hireCandidateId = 10052;

  const targetPairs = [
    { role_id: RECRUITER_ROLE_ID, permission_id: manageId },
    { role_id: RECRUITER_ROLE_ID, permission_id: hireCandidateId },
    { role_id: RECRUITING_MANAGER_ROLE_ID, permission_id: adminId },
  ];
  const ids = targetPairs.map((p) => p.permission_id).join(",");
  const existing = await get(
    `/role_permissions?permission_id=in.(${ids})&role_id=in.(${RECRUITER_ROLE_ID},${RECRUITING_MANAGER_ROLE_ID})&select=role_id,permission_id`
  );
  const have = new Set(existing.map((r: any) => `${r.role_id}:${r.permission_id}`));
  const toInsert = targetPairs.filter((p) => !have.has(`${p.role_id}:${p.permission_id}`));
  if (toInsert.length === 0) {
    console.log(`  role_permissions for module 8 already present`);
    return;
  }
  await insert("role_permissions", toInsert);
  console.log(`  + ${toInsert.length} role_permissions on ATS-PRE-EMPLOYEE-RECORD`);
}

async function step11_solution_data_objects() {
  const existing = await get(
    `/solution_data_objects?solution_id=in.(${ATS_PRIMARY_SOLUTION_IDS.join(",")})&select=solution_id,data_object_id`
  );
  const have = new Set(existing.map((r: any) => `${r.solution_id}:${r.data_object_id}`));
  const proposed: any[] = [];
  for (const sid of ATS_PRIMARY_SOLUTION_IDS) {
    for (const m of ATS_CORE_MASTERS) {
      if (!have.has(`${sid}:${m.id}`)) {
        proposed.push({
          solution_id: sid,
          data_object_id: m.id,
          ownership_role: "system_of_record",
        });
      }
    }
  }
  if (proposed.length === 0) {
    console.log(`  solution_data_objects already populated`);
    return;
  }
  await insert("solution_data_objects", proposed);
  console.log(`  + ${proposed.length} solution_data_objects rows (9 solutions x 8 core masters)`);
}

async function main() {
  console.log("ATS gap-fix loader (2026-05-23)");
  console.log("================================");

  console.log("\nM6 fix: BACKGROUND-SCREENING capability");
  const capId = await step1_background_screening_capability();
  await step2_capability_domains_link(capId);
  await step3_domain_module_capability_link(capId);

  console.log("\nA4 fix: HiredScore not_supported rows");
  await step4_hiredscore_not_supported_rows();

  console.log("\nB4 fix: pre_employees has_personal_content");
  await step5_patch_pre_employees_flag();

  console.log("\nB12 fix: pre_employees lifecycle states");
  await step6_pre_employee_lifecycle_states();

  console.log("\nB6 + B7 fix: pre_employees relationships");
  await step7_pre_employee_relationships();

  console.log("\nB11 fix: pre_employees aliases");
  await step8_pre_employee_aliases();

  console.log("\nE1/E6 fix: role coverage of module 8");
  await step9_role_modules();
  await step10_role_permissions();

  console.log("\nA6 fix: solution_data_objects for ATS primary solutions");
  await step11_solution_data_objects();

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("\nFATAL:", e?.message || e);
  process.exit(1);
});
