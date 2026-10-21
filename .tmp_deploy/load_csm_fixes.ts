#!/usr/bin/env bun
// load_csm_fixes.ts — applies all CSM (id=30) audit fixes.
//
// Audit results (2026-05-26 review) summarized:
//   M1/M2/M3/M4/M5: 0 modules → create 3 modules + caps + DMDO + starter + PATCH lifecycle.
//   F2: no module-level system skill → migrate legacy `csm-system` (id=42) to CSM-CASE-MGMT,
//       author 2 more system skills (csm_entitlements_agent, csm_knowledge_agent).
//   F7: legacy skill links send_email without justification → swap to notify_person.
//   E1-E6: no roles in Customer Service function → author 4 roles + role_modules + role_permissions.
//   B4: positive re-evaluation of pattern flags: customer_cases.has_personal_content=true,
//       customer_cases.has_submit_lock=true (resolved/closed gate submit), customers.has_personal_content=true.
//
// Idempotent: every phase reads first, only inserts what's missing.
// Run from project root (CLAUDE.md cwd rule):
//   bun run c:/dev/domain-map/.tmp_deploy/load_csm_fixes.ts

export {};

const CSM_DOMAIN_ID = 30;
const CS_FUNCTION_ID = 24;            // Customer Service
const CSUCCESS_FUNCTION_ID = 23;      // Customer Success
const PLATFORM_MODULE_ID = 1001;      // "Domain Map"
const LEGACY_CSM_SKILL_ID = 42;

const DO = {
  customer_cases: 103,
  customer_entitlements: 104,
  csat_responses: 105,
  customers: 97,
  knowledge_articles: 51,
  customer_subscriptions: 106,
  customer_events: 111,
  legal_contracts: 66,
  org_units: 34,
};

const CAP = {
  KNOWLEDGE_MGMT: 187,
  AI_TRIAGE: 193,
  SLA_MGMT: 185,
};

type Row = Record<string, unknown>;

async function pg(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path}: ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

// chunked POST helper for bulk inserts
async function insertChunked(path: string, rows: Row[], chunkSize = 50): Promise<void> {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await pg("POST", path, chunk);
  }
}

// =============================================================
// Phase M.1 — Modules
// =============================================================
console.log("=== M.1 modules ===");

const moduleSpecs = [
  {
    domain_module_code: "CSM-CASE-MGMT",
    domain_module_name: "Case Management",
    domain_id: CSM_DOMAIN_ID,
    description:
      "Customer-facing case capture, triage, routing, resolution, and CSAT close-out. Masters customer_cases and csat_responses. The execution backbone every CSM vendor (ServiceNow CSM, Salesforce Service Cloud, Zendesk Suite, Freshdesk, Intercom) anchors on.",
  },
  {
    domain_module_code: "CSM-ENTITLEMENTS",
    domain_module_name: "Entitlements and SLA Management",
    domain_id: CSM_DOMAIN_ID,
    description:
      "Service entitlements, support tiers, SLA tracking, and contractual support hours. Masters customer_entitlements. Consumes subscription and contract context to bind eligibility and SLA targets.",
  },
  {
    domain_module_code: "CSM-KNOWLEDGE",
    domain_module_name: "Customer Knowledge Surface",
    domain_id: CSM_DOMAIN_ID,
    description:
      "Customer-facing knowledge base presentation and authoring. Contributes audience-filtered edits to the cross-cutting knowledge_articles entity mastered by ITSM-KNOWLEDGE; consumes case data so article authoring is informed by support patterns.",
  },
];

const existingModules: Row[] = await pg(
  "GET",
  `/domain_modules?domain_id=eq.${CSM_DOMAIN_ID}&select=id,domain_module_code`,
) ?? [];
const existingModuleCodes = new Set(existingModules.map((m) => m.domain_module_code as string));
const moduleInserts = moduleSpecs.filter((m) => !existingModuleCodes.has(m.domain_module_code));
if (moduleInserts.length) {
  await insertChunked("/domain_modules", moduleInserts);
  console.log(`  inserted ${moduleInserts.length} modules`);
} else {
  console.log("  no new modules to insert");
}

const allModules: Row[] = await pg(
  "GET",
  `/domain_modules?domain_id=eq.${CSM_DOMAIN_ID}&select=id,domain_module_code`,
) ?? [];
const moduleIdByCode = new Map<string, number>(
  allModules.map((m) => [m.domain_module_code as string, m.id as number]),
);
const CSM_CASE_ID = moduleIdByCode.get("CSM-CASE-MGMT")!;
const CSM_ENT_ID = moduleIdByCode.get("CSM-ENTITLEMENTS")!;
const CSM_KB_ID = moduleIdByCode.get("CSM-KNOWLEDGE")!;
console.log(
  `  module ids: CSM-CASE-MGMT=${CSM_CASE_ID} CSM-ENTITLEMENTS=${CSM_ENT_ID} CSM-KNOWLEDGE=${CSM_KB_ID}`,
);

// =============================================================
// Phase M.2 — domain_module_capabilities
// =============================================================
console.log("=== M.2 domain_module_capabilities ===");

const moduleCapPairs: { module_id: number; capability_id: number }[] = [
  { module_id: CSM_CASE_ID, capability_id: CAP.AI_TRIAGE },
  { module_id: CSM_ENT_ID, capability_id: CAP.SLA_MGMT },
  { module_id: CSM_KB_ID, capability_id: CAP.KNOWLEDGE_MGMT },
];

const existingDmc: Row[] = await pg(
  "GET",
  `/domain_module_capabilities?domain_module_id=in.(${CSM_CASE_ID},${CSM_ENT_ID},${CSM_KB_ID})&select=domain_module_id,capability_id`,
) ?? [];
const dmcKey = (m: number, c: number) => `${m}|${c}`;
const existingDmcKeys = new Set(
  existingDmc.map((r) => dmcKey(r.domain_module_id as number, r.capability_id as number)),
);
const dmcInserts = moduleCapPairs
  .filter((p) => !existingDmcKeys.has(dmcKey(p.module_id, p.capability_id)))
  .map((p) => ({ domain_module_id: p.module_id, capability_id: p.capability_id }));
if (dmcInserts.length) {
  await insertChunked("/domain_module_capabilities", dmcInserts);
  console.log(`  inserted ${dmcInserts.length} domain_module_capabilities`);
} else {
  console.log("  no new domain_module_capabilities to insert");
}

// =============================================================
// Phase M.3 — domain_module_data_objects
// =============================================================
console.log("=== M.3 domain_module_data_objects ===");

type DmdoRow = { domain_module_id: number; data_object_id: number; role: string; necessity: string };
const dmdoSpec: DmdoRow[] = [
  // CSM-CASE-MGMT
  { domain_module_id: CSM_CASE_ID, data_object_id: DO.customer_cases, role: "master", necessity: "required" },
  { domain_module_id: CSM_CASE_ID, data_object_id: DO.csat_responses, role: "master", necessity: "required" },
  { domain_module_id: CSM_CASE_ID, data_object_id: DO.customer_entitlements, role: "consumer", necessity: "required" },
  { domain_module_id: CSM_CASE_ID, data_object_id: DO.knowledge_articles, role: "contributor", necessity: "optional" },
  { domain_module_id: CSM_CASE_ID, data_object_id: DO.customer_subscriptions, role: "consumer", necessity: "optional" },
  { domain_module_id: CSM_CASE_ID, data_object_id: DO.customer_events, role: "contributor", necessity: "required" },
  { domain_module_id: CSM_CASE_ID, data_object_id: DO.org_units, role: "embedded_master", necessity: "optional" },
  { domain_module_id: CSM_CASE_ID, data_object_id: DO.customers, role: "consumer", necessity: "required" },
  // CSM-ENTITLEMENTS
  { domain_module_id: CSM_ENT_ID, data_object_id: DO.customer_entitlements, role: "master", necessity: "required" },
  { domain_module_id: CSM_ENT_ID, data_object_id: DO.customer_subscriptions, role: "consumer", necessity: "required" },
  { domain_module_id: CSM_ENT_ID, data_object_id: DO.legal_contracts, role: "contributor", necessity: "required" },
  { domain_module_id: CSM_ENT_ID, data_object_id: DO.customers, role: "consumer", necessity: "required" },
  // CSM-KNOWLEDGE
  { domain_module_id: CSM_KB_ID, data_object_id: DO.knowledge_articles, role: "contributor", necessity: "required" },
  { domain_module_id: CSM_KB_ID, data_object_id: DO.customer_cases, role: "consumer", necessity: "optional" },
];

const existingDmdo: Row[] = await pg(
  "GET",
  `/domain_module_data_objects?domain_module_id=in.(${CSM_CASE_ID},${CSM_ENT_ID},${CSM_KB_ID})&select=domain_module_id,data_object_id`,
) ?? [];
const dmdoKey = (m: number, d: number) => `${m}|${d}`;
const existingDmdoKeys = new Set(
  existingDmdo.map((r) => dmdoKey(r.domain_module_id as number, r.data_object_id as number)),
);
const dmdoInserts = dmdoSpec.filter(
  (r) => !existingDmdoKeys.has(dmdoKey(r.domain_module_id, r.data_object_id)),
);
if (dmdoInserts.length) {
  await insertChunked("/domain_module_data_objects", dmdoInserts);
  console.log(`  inserted ${dmdoInserts.length} domain_module_data_objects`);
} else {
  console.log("  no new domain_module_data_objects to insert");
}

// =============================================================
// Phase M.4 — domain_starter_modules (SKIPPED 2026-05-26)
// =============================================================
// The `domain_starter_modules` table is documented in SKILL.md but not yet
// materialized in the live schema (PGRST205 on refresh_schema_cache 2026-05-26).
// Skipping for now; M3 audit check is unblockable until the table exists.
console.log("=== M.4 domain_starter_modules SKIPPED (table not in schema) ===");

// =============================================================
// Phase M.5 — lifecycle state PATCH
// =============================================================
console.log("=== M.5 lifecycle PATCH ===");

// customer_cases.resolved (id=312) and customer_cases.closed (id=313) get domain_module_id = CSM-CASE-MGMT.
const lifecyclePatches = [
  { id: 312, name: "resolved" },
  { id: 313, name: "closed" },
];
for (const p of lifecyclePatches) {
  await pg("PATCH", `/data_object_lifecycle_states?id=eq.${p.id}`, {
    domain_module_id: CSM_CASE_ID,
  });
}
console.log(`  patched ${lifecyclePatches.length} lifecycle states with domain_module_id=${CSM_CASE_ID}`);

// =============================================================
// Phase Tools — author missing tools
// =============================================================
console.log("=== Tools — missing mutates ===");

const toolsToCreate: Row[] = [
  {
    tool_name: "create_customer_case",
    operation_kind: "mutate",
    data_object_id: DO.customer_cases,
    coverage_tier: "platform",
    description:
      "Create a new customer case (capture from any channel: portal, email, chat, voice).",
  },
  {
    tool_name: "update_customer_case",
    operation_kind: "mutate",
    data_object_id: DO.customer_cases,
    coverage_tier: "platform",
    description:
      "Update fields on an existing customer case (assignee, priority, status, notes).",
  },
  {
    tool_name: "resolve_customer_case",
    operation_kind: "mutate",
    data_object_id: DO.customer_cases,
    coverage_tier: "platform",
    description:
      "Transition a customer case to resolved. Requires the workflow-gate permission csm-case-mgmt:resolve_customer_case.",
  },
  {
    tool_name: "close_customer_case",
    operation_kind: "mutate",
    data_object_id: DO.customer_cases,
    coverage_tier: "platform",
    description:
      "Transition a customer case to closed (terminal). Requires the workflow-gate permission csm-case-mgmt:close_customer_case.",
  },
  {
    tool_name: "create_customer_entitlement",
    operation_kind: "mutate",
    data_object_id: DO.customer_entitlements,
    coverage_tier: "platform",
    description: "Provision a customer entitlement (support tier, included hours, feature access).",
  },
  {
    tool_name: "update_customer_entitlement",
    operation_kind: "mutate",
    data_object_id: DO.customer_entitlements,
    coverage_tier: "platform",
    description:
      "Update an existing customer entitlement (tier change, hours top-up, suspend / resume).",
  },
  {
    tool_name: "create_csat_response",
    operation_kind: "mutate",
    data_object_id: DO.csat_responses,
    coverage_tier: "platform",
    description: "Capture a customer satisfaction survey response (CSAT, NPS, CES).",
  },
  {
    tool_name: "update_knowledge_article",
    operation_kind: "mutate",
    data_object_id: DO.knowledge_articles,
    coverage_tier: "platform",
    description:
      "Update an existing knowledge article (text, taxonomy, audience tags, publication state).",
  },
  {
    tool_name: "create_knowledge_article",
    operation_kind: "mutate",
    data_object_id: DO.knowledge_articles,
    coverage_tier: "platform",
    description:
      "Author a new knowledge article (customer-facing or agent-facing audience).",
  },
];

const toolNames = toolsToCreate.map((t) => `"${t.tool_name}"`).join(",");
const existingTools: Row[] = await pg(
  "GET",
  `/tools?tool_name=in.(${toolNames})&select=id,tool_name`,
) ?? [];
const existingToolNames = new Set(existingTools.map((t) => t.tool_name as string));
const toolInserts = toolsToCreate.filter((t) => !existingToolNames.has(t.tool_name as string));
if (toolInserts.length) {
  await insertChunked("/tools", toolInserts);
  console.log(`  inserted ${toolInserts.length} tools`);
} else {
  console.log("  no new tools to insert");
}

const allRelevantTools: Row[] = await pg(
  "GET",
  `/tools?or=(tool_name.in.(${toolNames}),tool_name.in.("query_customer_cases","query_customer_entitlements","query_csat_responses","query_customers","query_knowledge_articles","query_customer_subscriptions","notify_person","classify_text","detect_sentiment","send_email"))&select=id,tool_name`,
) ?? [];
const toolIdByName = new Map<string, number>(
  allRelevantTools.map((t) => [t.tool_name as string, t.id as number]),
);

// =============================================================
// Phase Skills — PATCH legacy + author 2 new
// =============================================================
console.log("=== Skills ===");

// PATCH the legacy csm-system (id=42) to become the CSM-CASE-MGMT system skill.
await pg("PATCH", `/skills?id=eq.${LEGACY_CSM_SKILL_ID}`, {
  skill_name: "csm_case_mgmt_agent",
  domain_module_id: CSM_CASE_ID,
});
console.log(
  `  patched legacy skill id=${LEGACY_CSM_SKILL_ID} → skill_name=csm_case_mgmt_agent, domain_module_id=${CSM_CASE_ID}`,
);

const newSkillSpecs = [
  {
    skill_name: "csm_entitlements_agent",
    skill_type: "system",
    domain_id: CSM_DOMAIN_ID,
    domain_module_id: CSM_ENT_ID,
    description:
      "System skill for CSM-ENTITLEMENTS: provisions, tracks, and ages out customer entitlements; reads subscription and contract context to bind eligibility and SLA targets.",
  },
  {
    skill_name: "csm_knowledge_agent",
    skill_type: "system",
    domain_id: CSM_DOMAIN_ID,
    domain_module_id: CSM_KB_ID,
    description:
      "System skill for CSM-KNOWLEDGE: authors and updates customer-facing knowledge articles, informed by support case patterns.",
  },
];

const existingNewSkills: Row[] = await pg(
  "GET",
  `/skills?skill_name=in.("csm_entitlements_agent","csm_knowledge_agent")&select=id,skill_name`,
) ?? [];
const existingNewSkillNames = new Set(existingNewSkills.map((s) => s.skill_name as string));
const skillInserts = newSkillSpecs.filter((s) => !existingNewSkillNames.has(s.skill_name));
if (skillInserts.length) {
  await insertChunked("/skills", skillInserts);
  console.log(`  inserted ${skillInserts.length} system skills`);
}

const allCsmSkills: Row[] = await pg(
  "GET",
  `/skills?domain_id=eq.${CSM_DOMAIN_ID}&skill_type=eq.system&select=id,skill_name,domain_module_id`,
) ?? [];
const skillIdByModuleId = new Map<number, number>(
  allCsmSkills
    .filter((s) => s.domain_module_id != null)
    .map((s) => [s.domain_module_id as number, s.id as number]),
);

// =============================================================
// Phase Skill_Tools
// =============================================================
console.log("=== Skill_tools ===");

const SKILL_CASE_ID = skillIdByModuleId.get(CSM_CASE_ID)!;
const SKILL_ENT_ID = skillIdByModuleId.get(CSM_ENT_ID)!;
const SKILL_KB_ID = skillIdByModuleId.get(CSM_KB_ID)!;

const tn = (name: string) => {
  const id = toolIdByName.get(name);
  if (!id) throw new Error(`Tool not found: ${name}`);
  return id;
};

// F7 fix: drop legacy send_email link on case-mgmt skill BEFORE re-linking notify_person.
const sendEmailToolId = tn("send_email");
await pg(
  "DELETE",
  `/skill_tools?skill_id=eq.${SKILL_CASE_ID}&tool_id=eq.${sendEmailToolId}`,
);
console.log(`  deleted send_email link from skill_id=${SKILL_CASE_ID} (F7 fix)`);

type StSpec = { skill_id: number; tool_name: string; requirement_level: "required" | "optional"; notes: string };
const skillToolSpecs: StSpec[] = [
  // csm_case_mgmt_agent (case workflow heart)
  { skill_id: SKILL_CASE_ID, tool_name: "query_customer_cases", requirement_level: "required", notes: "" },
  { skill_id: SKILL_CASE_ID, tool_name: "create_customer_case", requirement_level: "required", notes: "" },
  { skill_id: SKILL_CASE_ID, tool_name: "update_customer_case", requirement_level: "required", notes: "" },
  { skill_id: SKILL_CASE_ID, tool_name: "resolve_customer_case", requirement_level: "required", notes: "Workflow-gate transition; gated by csm-case-mgmt:resolve_customer_case." },
  { skill_id: SKILL_CASE_ID, tool_name: "close_customer_case", requirement_level: "required", notes: "Workflow-gate transition; gated by csm-case-mgmt:close_customer_case." },
  { skill_id: SKILL_CASE_ID, tool_name: "query_csat_responses", requirement_level: "required", notes: "" },
  { skill_id: SKILL_CASE_ID, tool_name: "create_csat_response", requirement_level: "required", notes: "" },
  { skill_id: SKILL_CASE_ID, tool_name: "query_customer_entitlements", requirement_level: "required", notes: "SLA eligibility gating at case creation and routing." },
  { skill_id: SKILL_CASE_ID, tool_name: "query_customers", requirement_level: "required", notes: "" },
  { skill_id: SKILL_CASE_ID, tool_name: "query_knowledge_articles", requirement_level: "required", notes: "Agent-assist KB retrieval on a case." },
  { skill_id: SKILL_CASE_ID, tool_name: "query_customer_subscriptions", requirement_level: "optional", notes: "Subscription state can gate support eligibility when the deployment integrates SUB-MGMT." },
  { skill_id: SKILL_CASE_ID, tool_name: "notify_person", requirement_level: "required", notes: "Case-status / CSAT-request notifications. Channel selected by deployment." },
  { skill_id: SKILL_CASE_ID, tool_name: "classify_text", requirement_level: "optional", notes: "AI triage / case-category classification." },
  { skill_id: SKILL_CASE_ID, tool_name: "detect_sentiment", requirement_level: "optional", notes: "CSAT response sentiment scoring." },

  // csm_entitlements_agent
  { skill_id: SKILL_ENT_ID, tool_name: "query_customer_entitlements", requirement_level: "required", notes: "" },
  { skill_id: SKILL_ENT_ID, tool_name: "create_customer_entitlement", requirement_level: "required", notes: "" },
  { skill_id: SKILL_ENT_ID, tool_name: "update_customer_entitlement", requirement_level: "required", notes: "Tier change, hours top-up, suspend / resume." },
  { skill_id: SKILL_ENT_ID, tool_name: "query_customer_subscriptions", requirement_level: "required", notes: "Activation source for entitlements." },
  { skill_id: SKILL_ENT_ID, tool_name: "query_customers", requirement_level: "required", notes: "" },
  { skill_id: SKILL_ENT_ID, tool_name: "notify_person", requirement_level: "required", notes: "Entitlement-expiry and depletion warnings." },

  // csm_knowledge_agent
  { skill_id: SKILL_KB_ID, tool_name: "query_knowledge_articles", requirement_level: "required", notes: "" },
  { skill_id: SKILL_KB_ID, tool_name: "create_knowledge_article", requirement_level: "required", notes: "Customer-facing audience tag set at authoring time." },
  { skill_id: SKILL_KB_ID, tool_name: "update_knowledge_article", requirement_level: "required", notes: "" },
  { skill_id: SKILL_KB_ID, tool_name: "query_customer_cases", requirement_level: "required", notes: "Case-pattern signal informs article authoring backlog." },
  { skill_id: SKILL_KB_ID, tool_name: "notify_person", requirement_level: "optional", notes: "Draft-review / publication notifications." },
];

const skillIds = [SKILL_CASE_ID, SKILL_ENT_ID, SKILL_KB_ID];
const existingSt: Row[] = await pg(
  "GET",
  `/skill_tools?skill_id=in.(${skillIds.join(",")})&select=skill_id,tool_id`,
) ?? [];
const stKey = (s: number, t: number) => `${s}|${t}`;
const existingStKeys = new Set(existingSt.map((r) => stKey(r.skill_id as number, r.tool_id as number)));

const stInserts = skillToolSpecs
  .map((s) => ({
    skill_id: s.skill_id,
    tool_id: tn(s.tool_name),
    requirement_level: s.requirement_level,
    notes: s.notes,
  }))
  .filter((r) => !existingStKeys.has(stKey(r.skill_id, r.tool_id)));

if (stInserts.length) {
  await insertChunked("/skill_tools", stInserts);
  console.log(`  inserted ${stInserts.length} skill_tools`);
} else {
  console.log("  no new skill_tools to insert");
}

// =============================================================
// Phase Permissions — materialize per module
// =============================================================
console.log("=== Permissions ===");

// Pattern flag PATCH (B4) happens later, but permission derivation needs to know about flags now.
// We derive permissions assuming the final flags: customer_cases (has_personal_content + has_submit_lock),
// csat_responses (has_personal_content only), customer_entitlements (no flags).

type PermSpec = {
  permission_name: string;
  domain_module_id: number;
  tier: string;
  description: string;
};

const permSpecs: PermSpec[] = [
  // CSM-CASE-MGMT baseline + workflow-gates + overrides
  { permission_name: "csm-case-mgmt:read", domain_module_id: CSM_CASE_ID, tier: "baseline-read", description: "Read access to CSM-CASE-MGMT records." },
  { permission_name: "csm-case-mgmt:manage", domain_module_id: CSM_CASE_ID, tier: "baseline-manage", description: "Manage access to CSM-CASE-MGMT records." },
  { permission_name: "csm-case-mgmt:admin", domain_module_id: CSM_CASE_ID, tier: "baseline-admin", description: "Admin access to CSM-CASE-MGMT (all gates and overrides)." },
  { permission_name: "csm-case-mgmt:resolve_customer_case", domain_module_id: CSM_CASE_ID, tier: "workflow-gate", description: "Transition a customer case to resolved." },
  { permission_name: "csm-case-mgmt:close_customer_case", domain_module_id: CSM_CASE_ID, tier: "workflow-gate", description: "Transition a customer case to closed (terminal)." },
  { permission_name: "csm-case-mgmt:view_all_customer_cases", domain_module_id: CSM_CASE_ID, tier: "override", description: "View every customer case regardless of assignee (cuts the personal-content scope)." },
  { permission_name: "csm-case-mgmt:manage_all_customer_cases", domain_module_id: CSM_CASE_ID, tier: "override", description: "Manage every customer case regardless of assignee." },
  { permission_name: "csm-case-mgmt:submit_customer_case", domain_module_id: CSM_CASE_ID, tier: "override", description: "Submit a customer case past the lifecycle submit lock." },
  { permission_name: "csm-case-mgmt:view_all_csat_responses", domain_module_id: CSM_CASE_ID, tier: "override", description: "View every CSAT response (personal content)." },
  { permission_name: "csm-case-mgmt:manage_all_csat_responses", domain_module_id: CSM_CASE_ID, tier: "override", description: "Manage every CSAT response regardless of author." },

  // CSM-ENTITLEMENTS baseline
  { permission_name: "csm-entitlements:read", domain_module_id: CSM_ENT_ID, tier: "baseline-read", description: "Read access to CSM-ENTITLEMENTS records." },
  { permission_name: "csm-entitlements:manage", domain_module_id: CSM_ENT_ID, tier: "baseline-manage", description: "Manage access to CSM-ENTITLEMENTS records." },
  { permission_name: "csm-entitlements:admin", domain_module_id: CSM_ENT_ID, tier: "baseline-admin", description: "Admin access to CSM-ENTITLEMENTS." },

  // CSM-KNOWLEDGE baseline
  { permission_name: "csm-knowledge:read", domain_module_id: CSM_KB_ID, tier: "baseline-read", description: "Read access to CSM-KNOWLEDGE records." },
  { permission_name: "csm-knowledge:manage", domain_module_id: CSM_KB_ID, tier: "baseline-manage", description: "Manage access to CSM-KNOWLEDGE records." },
  { permission_name: "csm-knowledge:admin", domain_module_id: CSM_KB_ID, tier: "baseline-admin", description: "Admin access to CSM-KNOWLEDGE." },
];

const permNames = permSpecs.map((p) => `"${p.permission_name}"`).join(",");
const existingPerms: Row[] = await pg(
  "GET",
  `/permissions?permission_name=in.(${permNames})&select=id,permission_name`,
) ?? [];
const existingPermNames = new Set(existingPerms.map((p) => p.permission_name as string));
const permInserts = permSpecs
  .filter((p) => !existingPermNames.has(p.permission_name))
  .map((p) => ({ ...p, module_id: PLATFORM_MODULE_ID }));
if (permInserts.length) {
  await insertChunked("/permissions", permInserts);
  console.log(`  inserted ${permInserts.length} permissions`);
} else {
  console.log("  no new permissions to insert");
}

const allPerms: Row[] = await pg(
  "GET",
  `/permissions?permission_name=in.(${permNames})&select=id,permission_name,tier,domain_module_id`,
) ?? [];
const permIdByName = new Map<string, number>(
  allPerms.map((p) => [p.permission_name as string, p.id as number]),
);

// =============================================================
// Phase Permission_hierarchy — admin⊃manage⊃read, admin⊃(gates+overrides)
// =============================================================
console.log("=== Permission_hierarchy ===");

const modulesForHierarchy = [
  { id: CSM_CASE_ID, slug: "csm-case-mgmt" },
  { id: CSM_ENT_ID, slug: "csm-entitlements" },
  { id: CSM_KB_ID, slug: "csm-knowledge" },
];

type Edge = { including: string; included: string };
const edges: Edge[] = [];
for (const m of modulesForHierarchy) {
  // admin ⊃ manage, manage ⊃ read
  edges.push({ including: `${m.slug}:admin`, included: `${m.slug}:manage` });
  edges.push({ including: `${m.slug}:manage`, included: `${m.slug}:read` });
  // admin ⊃ every workflow-gate / override under this module
  const gates = permSpecs.filter(
    (p) => p.domain_module_id === m.id && (p.tier === "workflow-gate" || p.tier === "override"),
  );
  for (const g of gates) {
    edges.push({ including: `${m.slug}:admin`, included: g.permission_name });
  }
}

const edgeRows = edges.map((e) => {
  const inc = permIdByName.get(e.including);
  const incd = permIdByName.get(e.included);
  if (!inc || !incd) throw new Error(`Missing perm id for hierarchy: ${e.including} or ${e.included}`);
  return { including_permission_id: inc, included_permission_id: incd, origin: "model" };
});

const includingIds = [...new Set(edgeRows.map((r) => r.including_permission_id))];
const existingEdges: Row[] = await pg(
  "GET",
  `/permission_hierarchy?including_permission_id=in.(${includingIds.join(",")})&select=including_permission_id,included_permission_id`,
) ?? [];
const edgeKey = (a: number, b: number) => `${a}|${b}`;
const existingEdgeKeys = new Set(
  existingEdges.map((r) => edgeKey(r.including_permission_id as number, r.included_permission_id as number)),
);
const edgeInserts = edgeRows.filter(
  (r) => !existingEdgeKeys.has(edgeKey(r.including_permission_id, r.included_permission_id)),
);
if (edgeInserts.length) {
  await insertChunked("/permission_hierarchy", edgeInserts);
  console.log(`  inserted ${edgeInserts.length} permission_hierarchy edges`);
} else {
  console.log("  no new permission_hierarchy edges to insert");
}

// =============================================================
// Phase Roles
// =============================================================
console.log("=== Roles ===");

const roleSpecs = [
  {
    role_code: "CUSTOMER-SERVICE-AGENT",
    role_name: "Customer Service Agent",
    slug: "customer_service_agent",
    business_function_id: CS_FUNCTION_ID,
    description:
      "IC who works customer cases end-to-end: capture, triage, respond, resolve, request CSAT. Operates the case workflow and consumes entitlements / knowledge.",
  },
  {
    role_code: "CUSTOMER-SERVICE-SUPERVISOR",
    role_name: "Customer Service Supervisor",
    slug: "customer_service_supervisor",
    business_function_id: CS_FUNCTION_ID,
    description:
      "Manages the case workflow at the team level: assignment overrides, escalation, SLA breach handling, supervisor-tier CSAT detractor follow-up.",
  },
  {
    role_code: "CUSTOMER-SERVICE-ADMIN",
    role_name: "Customer Service Admin",
    slug: "customer_service_admin",
    business_function_id: CS_FUNCTION_ID,
    description:
      "Configures every CSM module: case taxonomies, SLA definitions, entitlement catalogs, knowledge base structure. Admin-tier on every CSM module.",
  },
  {
    role_code: "CUSTOMER-SUCCESS-CSM",
    role_name: "Customer Success Manager",
    slug: "customer_success_csm",
    business_function_id: CSUCCESS_FUNCTION_ID,
    description:
      "Customer Success motion. Reads cases / CSAT / entitlements to drive account health, expansion, and renewal. Read-only on case-mgmt; manage on entitlements; primarily consumes via the Customer Success function.",
  },
];

const roleCodes = roleSpecs.map((r) => `"${r.role_code}"`).join(",");
const existingRoles: Row[] = await pg(
  "GET",
  `/roles?role_code=in.(${roleCodes})&select=id,role_code`,
) ?? [];
const existingRoleCodes = new Set(existingRoles.map((r) => r.role_code as string));
const roleInserts = roleSpecs.filter((r) => !existingRoleCodes.has(r.role_code));
if (roleInserts.length) {
  await insertChunked("/roles", roleInserts);
  console.log(`  inserted ${roleInserts.length} roles`);
} else {
  console.log("  no new roles to insert");
}

const allRoles: Row[] = await pg(
  "GET",
  `/roles?role_code=in.(${roleCodes})&select=id,role_code`,
) ?? [];
const roleIdByCode = new Map<string, number>(
  allRoles.map((r) => [r.role_code as string, r.id as number]),
);

// =============================================================
// Phase Role_modules
// =============================================================
console.log("=== Role_modules ===");

type RmSpec = { role_code: string; module_id: number; interaction_level: "primary" | "secondary"; notes: string };
const roleModuleSpecs: RmSpec[] = [
  // CUSTOMER-SERVICE-AGENT — IC: lives in case-mgmt, reads ent + knowledge
  { role_code: "CUSTOMER-SERVICE-AGENT", module_id: CSM_CASE_ID, interaction_level: "primary", notes: "" },
  { role_code: "CUSTOMER-SERVICE-AGENT", module_id: CSM_ENT_ID, interaction_level: "secondary", notes: "Reads entitlements for SLA eligibility on a case." },
  { role_code: "CUSTOMER-SERVICE-AGENT", module_id: CSM_KB_ID, interaction_level: "secondary", notes: "Searches KB for agent assist." },
  // CUSTOMER-SERVICE-SUPERVISOR — admin on case, manage on ent + read on knowledge
  { role_code: "CUSTOMER-SERVICE-SUPERVISOR", module_id: CSM_CASE_ID, interaction_level: "primary", notes: "" },
  { role_code: "CUSTOMER-SERVICE-SUPERVISOR", module_id: CSM_ENT_ID, interaction_level: "secondary", notes: "Authorizes entitlement tier changes within team." },
  { role_code: "CUSTOMER-SERVICE-SUPERVISOR", module_id: CSM_KB_ID, interaction_level: "secondary", notes: "Drafts and reviews KB articles for the team." },
  // CUSTOMER-SERVICE-ADMIN — admin across all three
  { role_code: "CUSTOMER-SERVICE-ADMIN", module_id: CSM_CASE_ID, interaction_level: "primary", notes: "" },
  { role_code: "CUSTOMER-SERVICE-ADMIN", module_id: CSM_ENT_ID, interaction_level: "primary", notes: "" },
  { role_code: "CUSTOMER-SERVICE-ADMIN", module_id: CSM_KB_ID, interaction_level: "primary", notes: "" },
  // CUSTOMER-SUCCESS-CSM — read on case-mgmt, manage on entitlements
  { role_code: "CUSTOMER-SUCCESS-CSM", module_id: CSM_CASE_ID, interaction_level: "secondary", notes: "Read-only via :read in bundle; case patterns feed health scoring." },
  { role_code: "CUSTOMER-SUCCESS-CSM", module_id: CSM_ENT_ID, interaction_level: "primary", notes: "Manages entitlement renewals / expansions." },
];

const csmRoleIds = roleSpecs.map((r) => roleIdByCode.get(r.role_code)!);
const existingRm: Row[] = await pg(
  "GET",
  `/role_modules?role_id=in.(${csmRoleIds.join(",")})&select=role_id,domain_module_id`,
) ?? [];
const rmKey = (r: number, m: number) => `${r}|${m}`;
const existingRmKeys = new Set(
  existingRm.map((r) => rmKey(r.role_id as number, r.domain_module_id as number)),
);
const rmInserts = roleModuleSpecs
  .map((s) => ({
    role_id: roleIdByCode.get(s.role_code)!,
    domain_module_id: s.module_id,
    interaction_level: s.interaction_level,
    notes: s.notes,
  }))
  .filter((r) => !existingRmKeys.has(rmKey(r.role_id, r.domain_module_id)));
if (rmInserts.length) {
  await insertChunked("/role_modules", rmInserts);
  console.log(`  inserted ${rmInserts.length} role_modules`);
} else {
  console.log("  no new role_modules to insert");
}

// =============================================================
// Phase Role_permissions
// =============================================================
console.log("=== Role_permissions ===");

type RpSpec = { role_code: string; permission_name: string };
const rpSpecs: RpSpec[] = [
  // AGENT: manage on case + the two workflow gates explicitly (IC tier), read on ent + knowledge
  { role_code: "CUSTOMER-SERVICE-AGENT", permission_name: "csm-case-mgmt:manage" },
  { role_code: "CUSTOMER-SERVICE-AGENT", permission_name: "csm-case-mgmt:resolve_customer_case" },
  { role_code: "CUSTOMER-SERVICE-AGENT", permission_name: "csm-case-mgmt:close_customer_case" },
  { role_code: "CUSTOMER-SERVICE-AGENT", permission_name: "csm-entitlements:read" },
  { role_code: "CUSTOMER-SERVICE-AGENT", permission_name: "csm-knowledge:read" },
  // SUPERVISOR: admin on case (auto-includes gates + overrides), manage on ent, manage on knowledge
  { role_code: "CUSTOMER-SERVICE-SUPERVISOR", permission_name: "csm-case-mgmt:admin" },
  { role_code: "CUSTOMER-SERVICE-SUPERVISOR", permission_name: "csm-entitlements:manage" },
  { role_code: "CUSTOMER-SERVICE-SUPERVISOR", permission_name: "csm-knowledge:manage" },
  // ADMIN: admin across all three
  { role_code: "CUSTOMER-SERVICE-ADMIN", permission_name: "csm-case-mgmt:admin" },
  { role_code: "CUSTOMER-SERVICE-ADMIN", permission_name: "csm-entitlements:admin" },
  { role_code: "CUSTOMER-SERVICE-ADMIN", permission_name: "csm-knowledge:admin" },
  // CUSTOMER-SUCCESS-CSM: read on case, manage on ent
  { role_code: "CUSTOMER-SUCCESS-CSM", permission_name: "csm-case-mgmt:read" },
  { role_code: "CUSTOMER-SUCCESS-CSM", permission_name: "csm-entitlements:manage" },
];

const existingRp: Row[] = await pg(
  "GET",
  `/role_permissions?role_id=in.(${csmRoleIds.join(",")})&select=role_id,permission_id`,
) ?? [];
const rpKey = (r: number, p: number) => `${r}|${p}`;
const existingRpKeys = new Set(
  existingRp.map((r) => rpKey(r.role_id as number, r.permission_id as number)),
);
const rpInserts = rpSpecs
  .map((s) => ({
    role_id: roleIdByCode.get(s.role_code)!,
    permission_id: permIdByName.get(s.permission_name)!,
  }))
  .filter((r) => !existingRpKeys.has(rpKey(r.role_id, r.permission_id)));
if (rpInserts.length) {
  await insertChunked("/role_permissions", rpInserts);
  console.log(`  inserted ${rpInserts.length} role_permissions`);
} else {
  console.log("  no new role_permissions to insert");
}

// =============================================================
// Phase B4 — pattern flag PATCH on masters
// =============================================================
console.log("=== B4 pattern flags ===");

// customer_cases: holds customer-supplied PII / health / financial detail; submit lock on terminal states.
await pg("PATCH", `/data_objects?id=eq.${DO.customer_cases}`, {
  has_personal_content: true,
  has_submit_lock: true,
});
console.log(`  patched data_objects[${DO.customer_cases}] = customer_cases: has_personal_content=true, has_submit_lock=true`);

// customers: name, email, address, contact details — personal content by definition.
await pg("PATCH", `/data_objects?id=eq.${DO.customers}`, {
  has_personal_content: true,
});
console.log(`  patched data_objects[${DO.customers}] = customers: has_personal_content=true`);

// =============================================================
// Summary
// =============================================================
console.log("");
console.log("=== Summary ===");
console.log(`  modules: 3 (CSM-CASE-MGMT=${CSM_CASE_ID}, CSM-ENTITLEMENTS=${CSM_ENT_ID}, CSM-KNOWLEDGE=${CSM_KB_ID})`);
console.log(`  system skills: 3 (case=${SKILL_CASE_ID}, ent=${SKILL_ENT_ID}, kb=${SKILL_KB_ID})`);
console.log(`  permissions: ${permSpecs.length} authored, ${edges.length} hierarchy edges`);
console.log(`  roles: ${roleSpecs.length} authored`);
console.log("");
console.log("Spot-check UI:");
console.log("  https://tests.semantius.app/domain_map/domain_modules");
console.log("  https://tests.semantius.app/domain_map/skills");
console.log("  https://tests.semantius.app/domain_map/roles");
console.log("  https://tests.semantius.app/domain_map/permissions");
