#!/usr/bin/env bun
// LEGAL-PRACT-MGMT Phase E (roles) + Phase S (system skills + tools).
//
// Scope:
//   - Permissions: 5 modules x 3 baseline + 17 workflow-gate = 32 permissions
//   - Tools: 23 new mutate primitives (existing queries reused)
//   - Skills: 5 system skills (one per module), retire legacy skill #80
//   - skill_tools: ~60 rows
//   - Roles: 5 + role_modules + role_permissions
//
// PostgREST quirk: rows in a single batch must share the same JSON shape. All
// row arrays here are normalized to identical keys per table.

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(body)], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius failed (${code}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
const post = (p: string, b: Row | Row[]) => call({ method: "POST", path: p, body: b });
const del = (p: string) => call({ method: "DELETE", path: p });
async function insert(p: string, rows: Row[]): Promise<Row[]> {
  if (!rows.length) return [];
  const CHUNK = 50; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(...await post(p, rows.slice(i, i + CHUNK)));
  return out;
}

// ----- constants -----
const DOMAIN_MAP_MODULE_ID = 1001;
const FUNC_LEGAL = 7;
const FUNC_AR = 45;

const M_MATTER = 132, M_INTAKE = 133, M_BILLING = 134, M_TRUST = 135, M_COURT = 136;
const moduleCodes: Record<number, string> = {
  [M_MATTER]:  "legal-matter-mgmt",
  [M_INTAKE]:  "legal-intake-conflict",
  [M_BILLING]: "legal-time-billing",
  [M_TRUST]:   "legal-trust-acct",
  [M_COURT]:   "legal-court-docketing",
};
const moduleDisplay: Record<number, string> = {
  [M_MATTER]:  "LEGAL-MATTER-MGMT",
  [M_INTAKE]:  "LEGAL-INTAKE-CONFLICT",
  [M_BILLING]: "LEGAL-TIME-BILLING",
  [M_TRUST]:   "LEGAL-TRUST-ACCT",
  [M_COURT]:   "LEGAL-COURT-DOCKETING",
};

const DO_MATTERS = 391, DO_TRUST = 392, DO_CONFLICT = 393, DO_ENG_LETTER = 394;
const DO_COURT_FILING = 738, DO_CLIENT_INVOICE = 739;
const DO_TIME_ENTRIES = 162, DO_CRM_CONTACTS = 98, DO_LEGAL_CONTRACTS = 66;

// ============================================================
// 1. Permissions: baseline + workflow-gate per module
// ============================================================
console.log("[1/8] permissions");

type PermRow = {
  permission_name: string;
  description: string;
  module_id: number;
  domain_module_id: number;
  tier: string;
};

const baselinePerms: PermRow[] = [];
for (const [mid, code] of Object.entries(moduleCodes)) {
  baselinePerms.push(
    { permission_name: `${code}:read`,    description: `Read access to every entity in the ${moduleDisplay[Number(mid)]} module.`,                                              module_id: DOMAIN_MAP_MODULE_ID, domain_module_id: Number(mid), tier: "baseline-read" },
    { permission_name: `${code}:manage`,  description: `Edit operational records in the ${moduleDisplay[Number(mid)]} module.`,                                                  module_id: DOMAIN_MAP_MODULE_ID, domain_module_id: Number(mid), tier: "baseline-manage" },
    { permission_name: `${code}:admin`,   description: `Edit reference data in the ${moduleDisplay[Number(mid)]} module and inherit every workflow gate below via permission_hierarchy.`, module_id: DOMAIN_MAP_MODULE_ID, domain_module_id: Number(mid), tier: "baseline-admin" },
  );
}

// Pull workflow-gate verbs from the loaded lifecycle states
const lifeStates = await get(`/data_object_lifecycle_states?data_object_id=in.(${DO_MATTERS},${DO_TRUST},${DO_CONFLICT},${DO_ENG_LETTER},${DO_COURT_FILING},${DO_CLIENT_INVOICE})&requires_permission=eq.true&select=state_name,permission_verb_override,domain_module_id,data_object_id&order=domain_module_id.asc,state_order.asc`);

const dataObjectNames: Record<number, string> = {
  [DO_MATTERS]: "matter", [DO_TRUST]: "trust_account", [DO_CONFLICT]: "conflict_check",
  [DO_ENG_LETTER]: "engagement_letter", [DO_COURT_FILING]: "court_filing", [DO_CLIENT_INVOICE]: "client_invoice",
};

const workflowGates: PermRow[] = lifeStates.map(s => {
  const mid = Number(s.domain_module_id);
  const code = moduleCodes[mid];
  const verb = (s.permission_verb_override as string) || `transition_${s.state_name}`;
  const doName = dataObjectNames[Number(s.data_object_id)];
  return {
    permission_name: `${code}:${verb}`,
    description: `Transition \`${doName}\` into state \`${s.state_name}\`.`,
    module_id: DOMAIN_MAP_MODULE_ID,
    domain_module_id: mid,
    tier: "workflow-gate",
  };
});

const allDesiredPerms = [...baselinePerms, ...workflowGates];
const moduleIdList = Object.keys(moduleCodes).join(",");
const existingPerms = await get(`/permissions?domain_module_id=in.(${moduleIdList})&select=id,permission_name`);
const existingPermNames = new Set(existingPerms.map(p => String(p.permission_name)));
const missingPerms = allDesiredPerms.filter(p => !existingPermNames.has(p.permission_name));
if (missingPerms.length) await insert("/permissions", missingPerms);
console.log(`  ${missingPerms.length} permissions inserted (${existingPerms.length} pre-existing). target: ${allDesiredPerms.length} baseline+gates.`);

const allPerms = await get(`/permissions?domain_module_id=in.(${moduleIdList})&select=id,permission_name,tier,domain_module_id`);
const permId = new Map<string, number>();
for (const p of allPerms) permId.set(String(p.permission_name), Number(p.id));

// ============================================================
// 2. Tools: 23 new mutate primitives (queries reused; channels reused)
// ============================================================
console.log("\n[2/8] tools");

type ToolRow = { tool_name: string; operation_kind: string; coverage_tier: string; data_object_id: number | null; description: string };
const desiredTools: ToolRow[] = [
  // Matter module
  { tool_name: "create_legal_matter",        operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_MATTERS,        description: "Create a new legal matter row in intake state." },
  { tool_name: "update_legal_matter",        operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_MATTERS,        description: "Update mutable fields on an existing legal matter (parties, descriptions, billing setup)." },
  { tool_name: "open_matter",                operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_MATTERS,        description: "Transition a matter from engagement_pending to active. Workflow gate." },
  { tool_name: "hold_matter",                operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_MATTERS,        description: "Transition a matter to on_hold. Workflow gate. Suspends billing." },
  { tool_name: "close_matter",               operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_MATTERS,        description: "Transition a matter to closed. Workflow gate. Triggers final invoicing and retention clock." },
  // Intake / conflict module
  { tool_name: "create_conflict_check",      operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_CONFLICT,       description: "Create a conflict-check request for a new matter or party set." },
  { tool_name: "approve_conflict_check",     operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_CONFLICT,       description: "Mark a conflict-check cleared; releases the matter to engagement_pending. Workflow gate." },
  { tool_name: "flag_conflict",              operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_CONFLICT,       description: "Flag a conflict-check requiring partner review. Workflow gate." },
  { tool_name: "waive_conflict",             operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_CONFLICT,       description: "Record a written client waiver and clear the conflict. Workflow gate." },
  { tool_name: "decline_matter",             operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_CONFLICT,       description: "Decline representation due to unwaivable conflict. Workflow gate." },
  { tool_name: "create_engagement_letter",   operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_ENG_LETTER,     description: "Draft a new engagement letter from a template." },
  { tool_name: "send_engagement_letter",     operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_ENG_LETTER,     description: "Send a drafted engagement letter to the client for e-signature. Workflow gate." },
  { tool_name: "sign_engagement_letter",     operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_ENG_LETTER,     description: "Record client e-signature on the engagement letter. Workflow gate." },
  // Trust module
  { tool_name: "create_trust_account",       operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_TRUST,          description: "Create an IOLTA trust account for a client or matter." },
  { tool_name: "open_trust_account",         operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_TRUST,          description: "Transition a trust account into the active operating state. Workflow gate." },
  { tool_name: "post_trust_transaction",     operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_TRUST,          description: "Post a deposit, disbursement, or transfer against a trust account ledger." },
  { tool_name: "reconcile_trust_account",    operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_TRUST,          description: "Perform three-way reconciliation (bank, ledger, client balances) and record the result. Workflow gate." },
  { tool_name: "flag_trust_exception",       operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_TRUST,          description: "Flag a reconciliation discrepancy or low-balance event. Workflow gate. May trigger state-bar reporting." },
  { tool_name: "close_trust_account",        operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_TRUST,          description: "Close a trust account once balance is fully disbursed. Workflow gate." },
  // Billing module
  { tool_name: "create_client_invoice",      operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_CLIENT_INVOICE, description: "Assemble a draft client invoice from time and expense entries." },
  { tool_name: "review_prebill",             operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_CLIENT_INVOICE, description: "Mark a prebill reviewed by the billing partner with any write-downs and annotations. Workflow gate." },
  { tool_name: "issue_client_invoice",       operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_CLIENT_INVOICE, description: "Issue a reviewed prebill as a final client invoice. Workflow gate. Triggers AR posting." },
  { tool_name: "write_off_invoice",          operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_CLIENT_INVOICE, description: "Mark a client invoice uncollectible and write it off. Workflow gate." },
  // Court module
  { tool_name: "create_external_court_filing", operation_kind: "mutate",   coverage_tier: "platform", data_object_id: DO_COURT_FILING,   description: "Create a court-filing draft tied to a matter." },
  { tool_name: "submit_court_filing",        operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_COURT_FILING,   description: "Submit a drafted court filing via ECF or in person. Workflow gate." },
];

const existingTools = await get(`/tools?tool_name=in.(${desiredTools.map(t => t.tool_name).join(",")})&select=id,tool_name`);
const existingToolNames = new Set(existingTools.map(t => String(t.tool_name)));
const missingTools = desiredTools.filter(t => !existingToolNames.has(t.tool_name));
if (missingTools.length) await insert("/tools", missingTools);
console.log(`  ${missingTools.length} tools inserted (${existingTools.length} pre-existing). target: ${desiredTools.length}.`);

// Resolve all tool IDs needed for skill_tools (including reused queries)
const allLegalTools = await get(`/tools?tool_name=in.(${[...desiredTools.map(t => t.tool_name), "query_legal_matters","query_trust_accounts","query_conflict_checks","query_engagement_letters","query_external_court_filings","query_client_invoices","query_time_entries","query_contacts","query_legal_contracts","notify_person","notify_team","sign_document","receive_webhook"].join(",")})&select=id,tool_name`);
const toolId = new Map<string, number>();
for (const t of allLegalTools) toolId.set(String(t.tool_name), Number(t.id));

// ============================================================
// 3. Retire legacy skill #80 (and its skill_tools) before creating new ones
// ============================================================
console.log("\n[3/8] retire legacy skill #80");
const legacy = await get(`/skills?id=eq.80&select=id,skill_name`);
if (legacy.length > 0) {
  await del(`/skill_tools?skill_id=eq.80`);
  await del(`/skills?id=eq.80`);
  console.log("  deleted legacy skill #80 + its skill_tools");
} else {
  console.log("  legacy already absent");
}

// ============================================================
// 4. System skills: one per module
// ============================================================
console.log("\n[4/8] system skills");
const LEGAL_PRACT_MGMT_DOMAIN_ID = 150;
type SkillRow = { skill_name: string; skill_type: string; domain_module_id: number; domain_id: number; description: string };
const skillRows: SkillRow[] = [
  { skill_name: "legal_matter_mgmt_agent",    skill_type: "system", domain_module_id: M_MATTER,  domain_id: LEGAL_PRACT_MGMT_DOMAIN_ID, description: "Operates the matter lifecycle: intake-to-active-to-closed, parties, key dates, matter-scoped documents. Owns the central record every other legal-practice module attaches to." },
  { skill_name: "legal_intake_conflict_agent", skill_type: "system", domain_module_id: M_INTAKE, domain_id: LEGAL_PRACT_MGMT_DOMAIN_ID, description: "Runs client intake: conflict-of-interest checks, engagement-letter drafting and e-signature, retainer collection, and intake-to-matter conversion." },
  { skill_name: "legal_time_billing_agent",   skill_type: "system", domain_module_id: M_BILLING, domain_id: LEGAL_PRACT_MGMT_DOMAIN_ID, description: "Captures time entries against ABA UTBMS codes, assembles prebills, processes partner review, issues invoices, and posts AR. Wires to LEDES e-bill export." },
  { skill_name: "legal_trust_acct_agent",     skill_type: "system", domain_module_id: M_TRUST,   domain_id: LEGAL_PRACT_MGMT_DOMAIN_ID, description: "Manages IOLTA trust accounts: deposits, disbursements, three-way reconciliation, exception detection, and state-bar reporting." },
  { skill_name: "legal_court_docketing_agent", skill_type: "system", domain_module_id: M_COURT,  domain_id: LEGAL_PRACT_MGMT_DOMAIN_ID, description: "Captures court filings, applies jurisdiction-specific deadline rules, alerts on statute-of-limitations and key dates, and integrates with ECF systems." },
];

const existingSkills = await get(`/skills?domain_module_id=in.(${moduleIdList})&skill_type=eq.system&select=id,domain_module_id,skill_name`);
const existingSkillModules = new Set(existingSkills.map(s => Number(s.domain_module_id)));
const missingSkills = skillRows.filter(s => !existingSkillModules.has(s.domain_module_id));
if (missingSkills.length) await insert("/skills", missingSkills);
console.log(`  ${missingSkills.length} skills inserted (${existingSkills.length} pre-existing).`);

const allSkills = await get(`/skills?domain_module_id=in.(${moduleIdList})&skill_type=eq.system&select=id,domain_module_id`);
const skillId = new Map<number, number>();
for (const s of allSkills) skillId.set(Number(s.domain_module_id), Number(s.id));

// ============================================================
// 5. skill_tools: per-module tool bundle
// ============================================================
console.log("\n[5/8] skill_tools");

type ST = { skill_id: number; tool_id: number; requirement_level: string; notes: string };
function st(skill_id: number, toolName: string, requirement_level: "required" | "optional", notes: string): ST {
  const tid = toolId.get(toolName);
  if (!tid) throw new Error(`tool not resolved: ${toolName}`);
  return { skill_id, tool_id: tid, requirement_level, notes };
}

const stRows: ST[] = [
  // LEGAL-MATTER-MGMT
  ...[
    st(skillId.get(M_MATTER)!, "query_legal_matters",         "required", ""),
    st(skillId.get(M_MATTER)!, "create_legal_matter",         "required", ""),
    st(skillId.get(M_MATTER)!, "update_legal_matter",         "required", ""),
    st(skillId.get(M_MATTER)!, "open_matter",                 "required", "Matter activation gate after engagement letter signs and conflict clears."),
    st(skillId.get(M_MATTER)!, "hold_matter",                 "required", ""),
    st(skillId.get(M_MATTER)!, "close_matter",                "required", "Triggers final invoicing and retention clock."),
    st(skillId.get(M_MATTER)!, "query_engagement_letters",    "required", "Reads gate: matter cannot open without signed engagement letter."),
    st(skillId.get(M_MATTER)!, "query_conflict_checks",       "required", "Reads gate: matter cannot open without cleared/waived conflict check."),
    st(skillId.get(M_MATTER)!, "query_contacts",              "required", "Parties on matter (clients, opposing, co-counsel) read from CRM contacts."),
    st(skillId.get(M_MATTER)!, "query_time_entries",          "optional", "Aggregate matter-level WIP."),
    st(skillId.get(M_MATTER)!, "notify_person",               "required", "Deadline and key-date alerts to lead attorney and supervising partner."),
  ],
  // LEGAL-INTAKE-CONFLICT
  ...[
    st(skillId.get(M_INTAKE)!, "query_conflict_checks",       "required", ""),
    st(skillId.get(M_INTAKE)!, "create_conflict_check",       "required", ""),
    st(skillId.get(M_INTAKE)!, "approve_conflict_check",      "required", ""),
    st(skillId.get(M_INTAKE)!, "flag_conflict",               "required", ""),
    st(skillId.get(M_INTAKE)!, "waive_conflict",              "required", ""),
    st(skillId.get(M_INTAKE)!, "decline_matter",              "required", ""),
    st(skillId.get(M_INTAKE)!, "query_engagement_letters",    "required", ""),
    st(skillId.get(M_INTAKE)!, "create_engagement_letter",    "required", ""),
    st(skillId.get(M_INTAKE)!, "send_engagement_letter",      "required", ""),
    st(skillId.get(M_INTAKE)!, "sign_engagement_letter",      "required", ""),
    st(skillId.get(M_INTAKE)!, "sign_document",               "required", "E-signature for engagement letters and retainer agreements. Channel-specific: e-signature IS the contract execution mechanism per ABA Model Rule 1.5(b) and most state bar rules."),
    st(skillId.get(M_INTAKE)!, "query_contacts",              "required", "Conflict-search graph traversal includes all CRM contacts (clients, prospects, opposing parties)."),
    st(skillId.get(M_INTAKE)!, "query_legal_contracts",       "optional", "Cross-domain read on CLM master agreements that may govern outside-counsel engagements."),
    st(skillId.get(M_INTAKE)!, "notify_person",               "required", "Intake confirmation, conflict-review request to partners, signed-engagement-letter receipt."),
  ],
  // LEGAL-TIME-BILLING
  ...[
    st(skillId.get(M_BILLING)!, "query_client_invoices",      "required", ""),
    st(skillId.get(M_BILLING)!, "create_client_invoice",      "required", ""),
    st(skillId.get(M_BILLING)!, "review_prebill",             "required", ""),
    st(skillId.get(M_BILLING)!, "issue_client_invoice",       "required", ""),
    st(skillId.get(M_BILLING)!, "write_off_invoice",          "required", ""),
    st(skillId.get(M_BILLING)!, "query_time_entries",         "required", ""),
    st(skillId.get(M_BILLING)!, "query_legal_matters",        "required", ""),
    st(skillId.get(M_BILLING)!, "notify_person",              "required", "Prebill-ready notifications to billing partners; invoice notifications to clients."),
  ],
  // LEGAL-TRUST-ACCT
  ...[
    st(skillId.get(M_TRUST)!, "query_trust_accounts",         "required", ""),
    st(skillId.get(M_TRUST)!, "create_trust_account",         "required", ""),
    st(skillId.get(M_TRUST)!, "open_trust_account",           "required", ""),
    st(skillId.get(M_TRUST)!, "post_trust_transaction",       "required", ""),
    st(skillId.get(M_TRUST)!, "reconcile_trust_account",      "required", ""),
    st(skillId.get(M_TRUST)!, "flag_trust_exception",         "required", "State-bar reportable; cannot be silently delayed."),
    st(skillId.get(M_TRUST)!, "close_trust_account",          "required", ""),
    st(skillId.get(M_TRUST)!, "query_client_invoices",        "required", "Reads invoices to apply trust-to-operating transfers on earned fees."),
    st(skillId.get(M_TRUST)!, "notify_person",                "required", "Exception alerts to managing bookkeeper and compliance partner."),
    st(skillId.get(M_TRUST)!, "notify_team",                  "optional", "Broadcast monthly reconciliation completion to billing and finance leadership."),
  ],
  // LEGAL-COURT-DOCKETING
  ...[
    st(skillId.get(M_COURT)!, "query_external_court_filings", "required", ""),
    st(skillId.get(M_COURT)!, "create_external_court_filing", "required", ""),
    st(skillId.get(M_COURT)!, "submit_court_filing",          "required", ""),
    st(skillId.get(M_COURT)!, "query_legal_matters",          "required", "Filing must be attached to a matter."),
    st(skillId.get(M_COURT)!, "receive_webhook",              "required", "ECF system callbacks (court acceptance / rejection / service confirmation)."),
    st(skillId.get(M_COURT)!, "notify_person",                "required", "Deadline alerts and rejection notifications to filing attorney."),
  ],
];

const allSkillIds = [...skillId.values()].join(",");
const existingSt = await get(`/skill_tools?skill_id=in.(${allSkillIds})&select=skill_id,tool_id`);
const stKey = (r: Row) => `${r.skill_id}|${r.tool_id}`;
const existingStKeys = new Set(existingSt.map(stKey));
const missingSt = stRows.filter(r => !existingStKeys.has(stKey(r)));
if (missingSt.length) await insert("/skill_tools", missingSt);
console.log(`  ${missingSt.length} skill_tools inserted (${existingSt.length} pre-existing). target: ${stRows.length}.`);

// ============================================================
// 6. Roles
// ============================================================
console.log("\n[6/8] roles");

type RoleRow = { role_code: string; role_name: string; slug: string; description: string; business_function_id: number };
const roleRows: RoleRow[] = [
  {
    role_code: "LEGAL-ATTORNEY",
    role_name: "Attorney",
    slug: "legal_attorney",
    description: "Practices law on assigned matters. Owns the matter's substantive direction, drafts pleadings, conducts negotiations, captures time, reviews prebills for assigned matters. `:manage` tier on primary modules; specific workflow gates for opening matters and signing engagement letters as billing partner.",
    business_function_id: FUNC_LEGAL,
  },
  {
    role_code: "LEGAL-PARALEGAL",
    role_name: "Paralegal",
    slug: "legal_paralegal",
    description: "Supports attorneys on assigned matters. Drafts court filings, manages docket and key-date calendar, captures party data at intake, organizes matter documents. `:manage` tier on operational modules but no workflow-gate approvals.",
    business_function_id: FUNC_LEGAL,
  },
  {
    role_code: "AR-LEGAL-BOOKKEEPER",
    role_name: "Legal Bookkeeper",
    slug: "ar_legal_bookkeeper",
    description: "Owns IOLTA trust accounting and AR operations at the firm. Posts trust deposits and disbursements, runs three-way reconciliation, files state-bar exception reports. `:admin` tier on TRUST-ACCT and `:manage` on TIME-BILLING. Reports to the firm's controller (Accounts Receivable function).",
    business_function_id: FUNC_AR,
  },
  {
    role_code: "LEGAL-CONFLICTS-PARTNER",
    role_name: "Conflicts Partner",
    slug: "legal_conflicts_partner",
    description: "Reviews flagged conflict checks, approves waivers, declines representation, maintains ethics-wall configuration. `:admin` tier on INTAKE-CONFLICT and read-only across the rest of the practice.",
    business_function_id: FUNC_LEGAL,
  },
  {
    role_code: "LEGAL-OFFICE-MGR",
    role_name: "Office Manager",
    slug: "legal_office_mgr",
    description: "Runs daily operations of the firm. Broad operational read across all modules; `:manage` on intake-conflict and matter-mgmt for case opening / closing administrative work. No approval authority on prebills or trust exceptions.",
    business_function_id: FUNC_LEGAL,
  },
];

const existingRoles = await get(`/roles?role_code=in.(${roleRows.map(r => r.role_code).join(",")})&select=id,role_code`);
const existingRoleCodes = new Set(existingRoles.map(r => String(r.role_code)));
const missingRoles = roleRows.filter(r => !existingRoleCodes.has(r.role_code));
if (missingRoles.length) await insert("/roles", missingRoles);
console.log(`  ${missingRoles.length} roles inserted (${existingRoles.length} pre-existing).`);

const allRoles = await get(`/roles?role_code=in.(${roleRows.map(r => r.role_code).join(",")})&select=id,role_code`);
const roleId = new Map<string, number>();
for (const r of allRoles) roleId.set(String(r.role_code), Number(r.id));

// ============================================================
// 7. role_modules
// ============================================================
console.log("\n[7/8] role_modules");

type RM = { role_id: number; domain_module_id: number; interaction_level: string; notes: string };
const rmRows: RM[] = [
  // LEGAL-ATTORNEY: practices law on matters; primary on matter, billing, court; secondary on intake-conflict; no trust
  { role_id: roleId.get("LEGAL-ATTORNEY")!, domain_module_id: M_MATTER,  interaction_level: "primary",   notes: "Owns matter substantive direction; opens matters as billing partner." },
  { role_id: roleId.get("LEGAL-ATTORNEY")!, domain_module_id: M_BILLING, interaction_level: "primary",   notes: "Captures time, reviews prebills on assigned matters." },
  { role_id: roleId.get("LEGAL-ATTORNEY")!, domain_module_id: M_COURT,   interaction_level: "primary",   notes: "Files pleadings; receives deadline alerts." },
  { role_id: roleId.get("LEGAL-ATTORNEY")!, domain_module_id: M_INTAKE,  interaction_level: "secondary", notes: "Signs engagement letters as billing partner." },
  // LEGAL-PARALEGAL: operational support across matter, intake, court; secondary on billing for time entry capture
  { role_id: roleId.get("LEGAL-PARALEGAL")!, domain_module_id: M_MATTER, interaction_level: "primary",   notes: "Drafts matter parties, key dates, document organization." },
  { role_id: roleId.get("LEGAL-PARALEGAL")!, domain_module_id: M_INTAKE, interaction_level: "primary",   notes: "Captures intake data, runs initial conflict searches before partner review." },
  { role_id: roleId.get("LEGAL-PARALEGAL")!, domain_module_id: M_COURT,  interaction_level: "primary",   notes: "Drafts filings, manages docket and deadline calendar." },
  { role_id: roleId.get("LEGAL-PARALEGAL")!, domain_module_id: M_BILLING, interaction_level: "secondary", notes: "Captures own time entries; no prebill review authority." },
  // AR-LEGAL-BOOKKEEPER: primary on billing + trust
  { role_id: roleId.get("AR-LEGAL-BOOKKEEPER")!, domain_module_id: M_TRUST,   interaction_level: "primary",   notes: "Owns IOLTA reconciliation and exception reporting." },
  { role_id: roleId.get("AR-LEGAL-BOOKKEEPER")!, domain_module_id: M_BILLING, interaction_level: "primary",   notes: "Processes prebill issuance, AR aging, write-offs (with partner sign-off)." },
  // LEGAL-CONFLICTS-PARTNER: primary on intake-conflict; secondary read on matter
  { role_id: roleId.get("LEGAL-CONFLICTS-PARTNER")!, domain_module_id: M_INTAKE, interaction_level: "primary",   notes: "Reviews flagged conflicts; approves waivers; maintains ethics-wall config." },
  { role_id: roleId.get("LEGAL-CONFLICTS-PARTNER")!, domain_module_id: M_MATTER, interaction_level: "secondary", notes: "Read-only on matter to verify post-clearance routing." },
  // LEGAL-OFFICE-MGR: broad secondary
  { role_id: roleId.get("LEGAL-OFFICE-MGR")!, domain_module_id: M_MATTER, interaction_level: "primary",   notes: "Administrative matter opening / closing." },
  { role_id: roleId.get("LEGAL-OFFICE-MGR")!, domain_module_id: M_INTAKE, interaction_level: "primary",   notes: "Administrative intake support." },
  { role_id: roleId.get("LEGAL-OFFICE-MGR")!, domain_module_id: M_BILLING, interaction_level: "secondary", notes: "Read access for AR aging reports." },
  { role_id: roleId.get("LEGAL-OFFICE-MGR")!, domain_module_id: M_TRUST,   interaction_level: "secondary", notes: "Read access only; no posting authority." },
  { role_id: roleId.get("LEGAL-OFFICE-MGR")!, domain_module_id: M_COURT,   interaction_level: "secondary", notes: "Read access for docket reporting." },
];

const existingRm = await get(`/role_modules?role_id=in.(${[...roleId.values()].join(",")})&select=role_id,domain_module_id`);
const rmKey = (r: Row) => `${r.role_id}|${r.domain_module_id}`;
const existingRmKeys = new Set(existingRm.map(rmKey));
const missingRm = rmRows.filter(r => !existingRmKeys.has(rmKey(r)));
if (missingRm.length) await insert("/role_modules", missingRm);
console.log(`  ${missingRm.length} role_modules inserted (${existingRm.length} pre-existing). target: ${rmRows.length}.`);

// ============================================================
// 8. role_permissions: function-scoped bundles
// ============================================================
console.log("\n[8/8] role_permissions");

type RP = { role_id: number; permission_id: number };
function rp(roleCode: string, permName: string): RP {
  const rid = roleId.get(roleCode);
  const pid = permId.get(permName);
  if (!rid || !pid) throw new Error(`unresolved role/permission: ${roleCode}/${permName}`);
  return { role_id: rid, permission_id: pid };
}

const rpRows: RP[] = [
  // LEGAL-ATTORNEY: :manage on matter/billing/court (primary), :read on intake-conflict + trust, workflow gates needed
  rp("LEGAL-ATTORNEY", "legal-matter-mgmt:manage"),
  rp("LEGAL-ATTORNEY", "legal-matter-mgmt:open_matter"),
  rp("LEGAL-ATTORNEY", "legal-matter-mgmt:hold_matter"),
  rp("LEGAL-ATTORNEY", "legal-matter-mgmt:close_matter"),
  rp("LEGAL-ATTORNEY", "legal-time-billing:manage"),
  rp("LEGAL-ATTORNEY", "legal-time-billing:review_prebill"),
  rp("LEGAL-ATTORNEY", "legal-court-docketing:manage"),
  rp("LEGAL-ATTORNEY", "legal-court-docketing:submit_court_filing"),
  rp("LEGAL-ATTORNEY", "legal-intake-conflict:read"),
  rp("LEGAL-ATTORNEY", "legal-intake-conflict:sign_engagement_letter"),
  rp("LEGAL-ATTORNEY", "legal-trust-acct:read"),

  // LEGAL-PARALEGAL: :manage on matter/intake/court but NO workflow-gate approvals; :read on billing
  rp("LEGAL-PARALEGAL", "legal-matter-mgmt:manage"),
  rp("LEGAL-PARALEGAL", "legal-intake-conflict:manage"),
  rp("LEGAL-PARALEGAL", "legal-court-docketing:manage"),
  rp("LEGAL-PARALEGAL", "legal-time-billing:read"),

  // AR-LEGAL-BOOKKEEPER: :admin on trust, :manage on billing with write-off gate
  rp("AR-LEGAL-BOOKKEEPER", "legal-trust-acct:admin"),
  rp("AR-LEGAL-BOOKKEEPER", "legal-time-billing:manage"),
  rp("AR-LEGAL-BOOKKEEPER", "legal-time-billing:issue_client_invoice"),
  rp("AR-LEGAL-BOOKKEEPER", "legal-time-billing:write_off_invoice"),
  rp("AR-LEGAL-BOOKKEEPER", "legal-matter-mgmt:read"),

  // LEGAL-CONFLICTS-PARTNER: :admin on intake-conflict, :read on matter
  rp("LEGAL-CONFLICTS-PARTNER", "legal-intake-conflict:admin"),
  rp("LEGAL-CONFLICTS-PARTNER", "legal-matter-mgmt:read"),

  // LEGAL-OFFICE-MGR: :manage on matter/intake; :read on billing/trust/court
  rp("LEGAL-OFFICE-MGR", "legal-matter-mgmt:manage"),
  rp("LEGAL-OFFICE-MGR", "legal-intake-conflict:manage"),
  rp("LEGAL-OFFICE-MGR", "legal-time-billing:read"),
  rp("LEGAL-OFFICE-MGR", "legal-trust-acct:read"),
  rp("LEGAL-OFFICE-MGR", "legal-court-docketing:read"),
];

const existingRp = await get(`/role_permissions?role_id=in.(${[...roleId.values()].join(",")})&select=role_id,permission_id`);
const rpKey = (r: Row) => `${r.role_id}|${r.permission_id}`;
const existingRpKeys = new Set(existingRp.map(rpKey));
const missingRp = rpRows.filter(r => !existingRpKeys.has(rpKey(r)));
if (missingRp.length) await insert("/role_permissions", missingRp);
console.log(`  ${missingRp.length} role_permissions inserted (${existingRp.length} pre-existing). target: ${rpRows.length}.`);

// ============================================================
// Verification
// ============================================================
console.log("\n--- verification ---");
const finalPerms = await get(`/permissions?domain_module_id=in.(${moduleIdList})&select=id`);
const finalSkills = await get(`/skills?domain_module_id=in.(${moduleIdList})&skill_type=eq.system&select=id`);
const finalSt = await get(`/skill_tools?skill_id=in.(${[...skillId.values()].join(",")})&select=id`);
const finalRoles = await get(`/roles?role_code=in.(${roleRows.map(r => r.role_code).join(",")})&select=id`);
const finalRm = await get(`/role_modules?role_id=in.(${[...roleId.values()].join(",")})&select=id`);
const finalRp = await get(`/role_permissions?role_id=in.(${[...roleId.values()].join(",")})&select=id`);
console.log(`  permissions=${finalPerms.length} (target 32), skills=${finalSkills.length}/5, skill_tools=${finalSt.length}, roles=${finalRoles.length}/5, role_modules=${finalRm.length}, role_permissions=${finalRp.length}`);
console.log("\nPhase E + S load complete.");
console.log("UI:");
console.log("  Roles: https://tests.semantius.app/domain_map/roles");
console.log("  Skills: https://tests.semantius.app/domain_map/skills");
console.log("  Permissions: https://tests.semantius.app/domain_map/permissions");
