#!/usr/bin/env bun
// load_crm_phase_s_2026_05_26.ts
//
// Closes CRM's F-band gap (Rule #17): 5 modules, 0 module-level system skills today.
// Also cures B12 gaps (sales_activities lifecycle, pipeline_stages config-shape note)
// and the M/B gap on CRM-AI-COPILOT (no DMDO rows).
//
// Idempotent: every step reads first, only writes what's missing.
// Run from project root: bun run c:/dev/domain-map/.tmp_deploy/load_crm_phase_s_2026_05_26.ts
//
// Legacy `crm-system` skill (id=41) is left in place. Retiring is a separate pass per Rule #1.

export {};

type Row = Record<string, unknown>;

async function postgrest(method: string, path: string, body?: unknown): Promise<any> {
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
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path} (exit ${code}): ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

const CRM_DOMAIN_ID = 69;
const MODULE = {
  ACCT_MGT: 46,
  LEAD_MGT: 47,
  PIPELINE_MGT: 48,
  ACTIVITY: 49,
  AI_COPILOT: 50,
};
const MASTER = {
  customers: 97,
  crm_contacts: 98,
  crm_leads: 99,
  crm_opportunities: 100,
  pipeline_stages: 101,
  sales_activities: 102,
};

// ============================================================
// PART 1 — B-band fixes
// ============================================================

// 1A. CRM-AI-COPILOT (module 50) DMDO rows: contributor + required on all 6 masters
console.log("=== 1A. domain_module_data_objects for CRM-AI-COPILOT ===");

const existingAiDmdo: Row[] = await postgrest(
  "GET",
  `/domain_module_data_objects?domain_module_id=eq.${MODULE.AI_COPILOT}&select=data_object_id,role`,
) ?? [];
const seenAiDmdo = new Set(existingAiDmdo.map((r) => `${r.data_object_id}:${r.role}`));

const aiDmdoRows = Object.values(MASTER).map((doid) => ({
  domain_module_id: MODULE.AI_COPILOT,
  data_object_id: doid,
  role: "contributor",
  necessity: "required",
  notes: "",
}));

let aiDmdoAdded = 0;
for (const r of aiDmdoRows) {
  if (seenAiDmdo.has(`${r.data_object_id}:${r.role}`)) continue;
  await postgrest("POST", "/domain_module_data_objects", r);
  aiDmdoAdded++;
}
console.log(`  ${aiDmdoAdded} new / ${aiDmdoRows.length - aiDmdoAdded} existing`);

// 1B. pipeline_stages (101) config-shape exemption note
console.log("\n=== 1B. pipeline_stages config-shape note ===");

const psExemption = "Config-shaped; admin-edited stage definitions, no per-record workflow. Pattern flags considered false-by-default after audit; record_status is the only state worth tracking. B12 exemption per Rule #12.";
const psRow: Row[] = await postgrest(
  "GET",
  `/data_objects?id=eq.${MASTER.pipeline_stages}&select=notes`,
) ?? [];
const currentNotes = String((psRow[0] as Row | undefined)?.notes ?? "");
if (currentNotes === psExemption) {
  console.log("  already set");
} else {
  await postgrest("PATCH", `/data_objects?id=eq.${MASTER.pipeline_stages}`, { notes: psExemption });
  console.log("  patched");
}

// 1C. sales_activities (102) lifecycle states (5 rows, no gates)
console.log("\n=== 1C. sales_activities lifecycle states ===");

const existingSaStates: Row[] = await postgrest(
  "GET",
  `/data_object_lifecycle_states?data_object_id=eq.${MASTER.sales_activities}&select=state_name`,
) ?? [];
const seenSaStates = new Set(existingSaStates.map((r) => String(r.state_name)));

const saStates = [
  { state_name: "scheduled",   state_order: 1, is_initial: true,  is_terminal: false, requires_permission: false },
  { state_name: "in_progress", state_order: 2, is_initial: false, is_terminal: false, requires_permission: false },
  { state_name: "completed",   state_order: 3, is_initial: false, is_terminal: true,  requires_permission: false },
  { state_name: "no_show",     state_order: 3, is_initial: false, is_terminal: true,  requires_permission: false },
  { state_name: "cancelled",   state_order: 4, is_initial: false, is_terminal: true,  requires_permission: false },
];

let saStatesAdded = 0;
for (const s of saStates) {
  if (seenSaStates.has(s.state_name)) continue;
  await postgrest("POST", "/data_object_lifecycle_states", {
    data_object_id: MASTER.sales_activities,
    ...s,
    permission_verb_override: "",
    domain_module_id: null,
  });
  saStatesAdded++;
}
console.log(`  ${saStatesAdded} new / ${saStates.length - saStatesAdded} existing`);

// ============================================================
// PART 2 — Phase S
// ============================================================

// 2A. 13 new tools
console.log("\n=== 2A. tools (13 new) ===");

const newToolSpecs = [
  { tool_name: "create_customer",          data_object_id: MASTER.customers,         description: "Create a customer/account record." },
  { tool_name: "update_customer",          data_object_id: MASTER.customers,         description: "Update fields on an existing customer/account." },
  { tool_name: "create_contact",           data_object_id: MASTER.crm_contacts,      description: "Create a contact record under an account." },
  { tool_name: "update_contact",           data_object_id: MASTER.crm_contacts,      description: "Update fields on an existing contact." },
  { tool_name: "create_lead",              data_object_id: MASTER.crm_leads,         description: "Create a CRM lead record." },
  { tool_name: "update_lead",              data_object_id: MASTER.crm_leads,         description: "Update fields on an existing lead." },
  { tool_name: "convert_lead",             data_object_id: MASTER.crm_leads,         description: "Convert a qualified lead into an account, contact, and optionally an opportunity. Workflow gate for the lead.converted terminal state." },
  { tool_name: "create_opportunity",       data_object_id: MASTER.crm_opportunities, description: "Create a sales opportunity." },
  { tool_name: "update_opportunity",       data_object_id: MASTER.crm_opportunities, description: "Update fields on an existing opportunity (amount, close date, contact roles, etc.)." },
  { tool_name: "close_opportunity_won",    data_object_id: MASTER.crm_opportunities, description: "Mark an opportunity as won; terminal-state transition. Workflow gate for opportunity.closed_won." },
  { tool_name: "close_opportunity_lost",   data_object_id: MASTER.crm_opportunities, description: "Mark an opportunity as lost; terminal-state transition." },
  { tool_name: "create_sales_activity",    data_object_id: MASTER.sales_activities,  description: "Log a sales activity (call, email, meeting, task) against an account, contact, lead, or opportunity." },
  { tool_name: "update_sales_activity",    data_object_id: MASTER.sales_activities,  description: "Update an existing sales activity (state change, outcome, notes)." },
];

const existingNewTools: Row[] = await postgrest(
  "GET",
  `/tools?tool_name=in.(${newToolSpecs.map((t) => t.tool_name).join(",")})&select=id,tool_name`,
) ?? [];
const newToolId: Record<string, number> = {};
for (const r of existingNewTools) newToolId[String(r.tool_name)] = Number(r.id);

let toolsAdded = 0;
for (const t of newToolSpecs) {
  if (newToolId[t.tool_name]) continue;
  const res = await postgrest("POST", "/tools", {
    tool_name: t.tool_name,
    description: t.description,
    operation_kind: "mutate",
    coverage_tier: "platform",
    data_object_id: t.data_object_id,
  });
  newToolId[t.tool_name] = Number((res?.[0] ?? res)?.id);
  toolsAdded++;
}
console.log(`  ${toolsAdded} new / ${newToolSpecs.length - toolsAdded} existing`);

// Resolve every tool we will reference (existing + new) into one map.
const ALL_TOOL_NAMES = [
  // platform queries (existing)
  "query_customers", "query_contacts", "query_leads", "query_opportunities",
  "query_pipeline_stages", "query_sales_activities",
  "query_customer_subscriptions", "query_customer_invoices",
  "query_audience_segments", "query_customer_attributes", "query_customer_cases",
  "query_customer_golden_records", "query_customer_journeys", "query_customer_events",
  "query_lead_scores", "query_intent_detections", "score_lead",
  "query_conversation_intelligence_records", "query_call_recordings",
  // platform mutates (existing)
  "update_opportunity_stage",
  // platform mutates (new this loader)
  ...newToolSpecs.map((t) => t.tool_name),
  // external / abstraction (existing)
  "send_email", "notify_person", "create_calendar_event",
  "transcribe_audio", "detect_sentiment", "classify_text", "generate_text",
];

const allToolRows: Row[] = await postgrest(
  "GET",
  `/tools?tool_name=in.(${ALL_TOOL_NAMES.join(",")})&select=id,tool_name,operation_kind,coverage_tier`,
) ?? [];
const toolId: Record<string, number> = {};
const toolKind: Record<string, string> = {};
const toolTier: Record<string, string> = {};
for (const r of allToolRows) {
  toolId[String(r.tool_name)] = Number(r.id);
  toolKind[String(r.tool_name)] = String(r.operation_kind);
  toolTier[String(r.tool_name)] = String(r.coverage_tier);
}
for (const n of ALL_TOOL_NAMES) {
  if (!toolId[n]) throw new Error(`Tool missing after resolve: ${n}`);
}

// 2B. 5 skills (idempotent on skill_name)
console.log("\n=== 2B. skills (5 rows) ===");

type SkillSpec = {
  name: string;
  module: number;
  description: string;
  required: string[];
  optional: string[];
};

const skills: SkillSpec[] = [
  {
    name: "crm_acct_mgt_agent",
    module: MODULE.ACCT_MGT,
    description:
      "Per-module system skill for Account and Contact Management — create, read, and edit accounts and contacts; surface subscription, invoice, segment, attribute, and case context; notify owners on account changes.",
    required: [
      "query_customers", "query_contacts",
      "create_customer", "update_customer",
      "create_contact", "update_contact",
      "query_customer_subscriptions", "query_customer_invoices",
      "query_audience_segments", "query_customer_attributes", "query_customer_cases",
      "notify_person",
    ],
    optional: [
      "query_customer_golden_records", "query_customer_journeys", "query_customer_events",
    ],
  },
  {
    name: "crm_lead_mgt_agent",
    module: MODULE.LEAD_MGT,
    description:
      "Per-module system skill for Lead Capture and Qualification — capture leads, score and qualify them, convert to account/contact/opportunity; outbound lead-nurture email.",
    required: [
      "query_leads",
      "create_lead", "update_lead", "convert_lead",
      "query_lead_scores",
      "notify_person", "send_email",
    ],
    optional: [
      "classify_text", "query_intent_detections", "score_lead",
    ],
  },
  {
    name: "crm_pipeline_mgt_agent",
    module: MODULE.PIPELINE_MGT,
    description:
      "Per-module system skill for Opportunity and Pipeline Management — opportunity CRUD, stage transitions, won/lost closure, deal-risk escalation; pulls conversation-intelligence signals.",
    required: [
      "query_opportunities", "query_pipeline_stages",
      "create_opportunity", "update_opportunity",
      "update_opportunity_stage", "close_opportunity_won", "close_opportunity_lost",
      "query_conversation_intelligence_records",
      "notify_person",
    ],
    optional: [
      "detect_sentiment", "generate_text",
    ],
  },
  {
    name: "crm_activity_agent",
    module: MODULE.ACTIVITY,
    description:
      "Per-module system skill for Sales Activity and Task Management — log calls, emails, meetings; outbound email, calendar scheduling, meeting reminders; optional call-recording / transcript surfacing.",
    required: [
      "query_sales_activities",
      "create_sales_activity", "update_sales_activity",
      "send_email", "create_calendar_event",
      "notify_person",
    ],
    optional: [
      "query_call_recordings", "transcribe_audio",
    ],
  },
  {
    name: "crm_ai_copilot_agent",
    module: MODULE.AI_COPILOT,
    description:
      "Per-module system skill for the AI Sales Copilot — reads across the full CRM surface (accounts, contacts, leads, opportunities, stages, activities) and applies copilot-suggested edits; LLM-driven drafting and outbound comms.",
    required: [
      "query_customers", "query_contacts", "query_leads", "query_opportunities",
      "query_pipeline_stages", "query_sales_activities",
      "update_customer", "update_contact", "update_lead", "update_opportunity",
      "update_opportunity_stage", "create_sales_activity",
      "generate_text", "send_email", "notify_person",
    ],
    optional: [
      "classify_text", "detect_sentiment",
    ],
  },
];

const existingSkills: Row[] = await postgrest(
  "GET",
  `/skills?skill_name=in.(${skills.map((s) => s.name).join(",")})&select=id,skill_name`,
) ?? [];
const skillId: Record<string, number> = {};
for (const r of existingSkills) skillId[String(r.skill_name)] = Number(r.id);

let skillsAdded = 0;
for (const s of skills) {
  if (skillId[s.name]) continue;
  const res = await postgrest("POST", "/skills", {
    skill_name: s.name,
    description: s.description,
    skill_type: "system",
    domain_id: CRM_DOMAIN_ID,
    domain_module_id: s.module,
  });
  skillId[s.name] = Number((res?.[0] ?? res)?.id);
  skillsAdded++;
}
console.log(`  ${skillsAdded} new / ${skills.length - skillsAdded} existing`);

// 2C. skill_tools junctions (idempotent on (skill_id, tool_id))
console.log("\n=== 2C. skill_tools ===");

const skillIds = Object.values(skillId);
const existingST: Row[] = await postgrest(
  "GET",
  `/skill_tools?skill_id=in.(${skillIds.join(",")})&select=skill_id,tool_id`,
) ?? [];
const seenST = new Set(existingST.map((r) => `${r.skill_id}:${r.tool_id}`));

let stAdded = 0;
let stSkipped = 0;
for (const s of skills) {
  const sid = skillId[s.name];
  if (!sid) continue;
  const pairs: Array<{ toolName: string; level: "required" | "optional" }> = [
    ...s.required.map((t) => ({ toolName: t, level: "required" as const })),
    ...s.optional.map((t) => ({ toolName: t, level: "optional" as const })),
  ];
  for (const p of pairs) {
    const tid = toolId[p.toolName];
    if (!tid) throw new Error(`tool unresolved: ${p.toolName} for skill ${s.name}`);
    const key = `${sid}:${tid}`;
    if (seenST.has(key)) { stSkipped++; continue; }
    await postgrest("POST", "/skill_tools", {
      skill_id: sid,
      tool_id: tid,
      requirement_level: p.level,
    });
    stAdded++;
  }
}
console.log(`  ${stAdded} new / ${stSkipped} existing`);

// ============================================================
// PART 3 — Verification: per-module Semantius scores (coverage_tier-based)
// ============================================================
console.log("\n=== 3. Semantius score verification ===");
console.log();
console.log("  module                    | strict (platform/all) | operational (+integration) ");
console.log("  --------------------------|-----------------------|----------------------------");

let allUnionPlatform = 0;
let allUnionOperational = 0;
let allUnionTotal = 0;

for (const s of skills) {
  const allTools = [...s.required, ...s.optional];
  const tiers = allTools.map((t) => toolTier[t] ?? "?");
  const platform = tiers.filter((k) => k === "platform").length;
  const operational = tiers.filter((k) => k === "platform" || k === "integration").length;
  const total = tiers.length;

  const strict = total === 0 ? 0 : Math.round((platform / total) * 100);
  const opPct = total === 0 ? 0 : Math.round((operational / total) * 100);

  allUnionPlatform += platform;
  allUnionOperational += operational;
  allUnionTotal += total;

  const left = `${platform}/${total}=${strict}%`;
  const right = `${operational}/${total}=${opPct}%`;
  console.log(`  ${s.name.padEnd(25)} | ${left.padEnd(21)} | ${right}`);
}

const domStrict = Math.round((allUnionPlatform / allUnionTotal) * 100);
const domOp = Math.round((allUnionOperational / allUnionTotal) * 100);
console.log(`  ${"DOMAIN ROLLUP (union)".padEnd(25)} | ${`${allUnionPlatform}/${allUnionTotal}=${domStrict}%`.padEnd(21)} | ${allUnionOperational}/${allUnionTotal}=${domOp}%`);

// ============================================================
// PART 4 — Tail: F-band re-audit
// ============================================================
console.log("\n=== 4. F-band re-audit ===");

const f2Skills: Row[] = await postgrest(
  "GET",
  `/skills?domain_module_id=in.(46,47,48,49,50)&skill_type=eq.system&select=domain_module_id,skill_name`,
) ?? [];
const f2Counts = new Map<number, number>();
for (const r of f2Skills) {
  const mid = Number(r.domain_module_id);
  f2Counts.set(mid, (f2Counts.get(mid) ?? 0) + 1);
}
console.log(`  F2 (one system skill per module): ${Object.values(MODULE).every((m) => f2Counts.get(m) === 1) ? "PASS" : "FAIL"}`);

const f3Pairs: Row[] = await postgrest(
  "GET",
  `/skill_tools?skill_id=in.(${skillIds.join(",")})&select=skill_id`,
) ?? [];
const f3Counts = new Map<number, number>();
for (const r of f3Pairs) {
  const sid = Number(r.skill_id);
  f3Counts.set(sid, (f3Counts.get(sid) ?? 0) + 1);
}
console.log(`  F3 (>=1 skill_tools per skill): ${skillIds.every((sid) => (f3Counts.get(sid) ?? 0) >= 1) ? "PASS" : "FAIL"}`);
for (const s of skills) {
  console.log(`    ${s.name}: ${f3Counts.get(skillId[s.name]) ?? 0} tools`);
}

console.log("\nload_crm_phase_s_2026_05_26.ts complete.");
console.log("\nVerify in the UI:");
console.log(`  https://tests.semantius.app/domain_map/skills?domain_id=eq.${CRM_DOMAIN_ID}`);
console.log(`  https://tests.semantius.app/domain_map/skill_tools`);
console.log(`  https://tests.semantius.app/domain_map/tools`);
console.log(`  https://tests.semantius.app/domain_map/domain_module_data_objects?domain_module_id=eq.${MODULE.AI_COPILOT}`);
console.log(`  https://tests.semantius.app/domain_map/data_object_lifecycle_states?data_object_id=eq.${MASTER.sales_activities}`);
console.log("\nFollow-ups (not handled by this loader):");
console.log("  - F1: legacy `crm-system` skill (id=41) is intentionally left in place. Retiring is a separate loader.");
console.log("  - record_status on all new rows defaults to `new` (per Rule #1). Bulk-approve only after review.");
