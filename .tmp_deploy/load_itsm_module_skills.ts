#!/usr/bin/env bun
// load_itsm_module_skills.ts
//
// Creates 8 per-module `system` skills for ITSM, mirroring the ATS pattern
// (Rule #14: every domain_module gets one `skill_type=system` skill row with
// `domain_module_id` set). All 17 tools currently in scope already exist as
// `skill_tools` rows on the legacy domain-level `itsm-system` skill (id=14);
// this loader fans them out per-module per the placement table approved
// 2026-05-25. Skill 14 is left in place for now — retiring it is a separate
// pass.
//
// Idempotent: every step reads first, only writes what's missing.
// Run from project root: bun run c:/dev/domain-map/.tmp_deploy/load_itsm_module_skills.ts

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

// ============================================================
// 0. Resolve module IDs and tool IDs
// ============================================================
console.log("=== 0. Resolving FK maps ===");

const ITSM_DOMAIN_ID = 1;

const modRows: Row[] = await postgrest(
  "GET",
  `/domain_modules?domain_id=eq.${ITSM_DOMAIN_ID}&select=id,domain_module_code`,
) ?? [];
const modId: Record<string, number> = {};
for (const r of modRows) modId[String(r.domain_module_code)] = Number(r.id);
console.log(`  modules: ${Object.keys(modId).length} resolved`);

const allToolNames = [
  "query_incidents", "create_incident", "update_incident_status",
  "query_service_requests", "query_service_catalog_items", "create_service_request",
  "query_problems", "create_problem",
  "query_changes", "create_change_request",
  "query_knowledge_articles",
  "query_slas",
  "query_configuration_items",
  "send_email", "post_chat_message",
  "generate_text", "classify_text",
];

const toolRows: Row[] = await postgrest(
  "GET",
  `/tools?tool_name=in.(${allToolNames.join(",")})&select=id,tool_name,operation_kind`,
) ?? [];
const toolId: Record<string, number> = {};
const toolKind: Record<string, string> = {};
for (const r of toolRows) {
  toolId[String(r.tool_name)] = Number(r.id);
  toolKind[String(r.tool_name)] = String(r.operation_kind);
}
console.log(`  tools resolved: ${Object.keys(toolId).length} of ${allToolNames.length}`);
for (const n of allToolNames) {
  if (!toolId[n]) throw new Error(`Tool not found in catalog: ${n}. Loader cannot proceed.`);
}

// ============================================================
// 1. Define the 8 per-module skills
// ============================================================
console.log("\n=== 1. domain_module skills (8 rows) ===");

type SkillSpec = {
  name: string;
  module: string;
  description: string;
  required: string[];
  optional: string[];
  // Expected scores per the placement table approved 2026-05-25.
  // semantius_score = (q+m count) / (total count). Includes optional per
  // the score definition in domain-map-analyst/SKILL.md.
  expectedAllPct: number;
  expectedRequiredPct: number | null; // null when there are no required tools
};

const skills: SkillSpec[] = [
  {
    name: "itsm-incident-mgmt-system",
    module: "ITSM-INCIDENT-MGMT",
    description:
      "Per-module system skill for Incident Management — log, triage, route, and resolve service incidents. Required CI lookup for impact analysis; required outbound for assignment + status notifications; optional knowledge / SLA lookup and AI augmentation.",
    required: [
      "query_incidents", "create_incident", "update_incident_status",
      "query_configuration_items",
      "send_email", "post_chat_message",
    ],
    optional: [
      "query_knowledge_articles", "query_slas",
      "generate_text", "classify_text",
    ],
    expectedAllPct: 60,
    expectedRequiredPct: 67,
  },
  {
    name: "itsm-service-request-system",
    module: "ITSM-SERVICE-REQUEST",
    description:
      "Per-module system skill for Service Request Fulfillment — catalog browse, request submission, approval, fulfillment. Outbound email required for fulfillment status updates; KB + SLA + AI text drafting optional.",
    required: [
      "query_service_requests", "query_service_catalog_items", "create_service_request",
      "send_email",
    ],
    optional: [
      "query_knowledge_articles", "query_slas",
      "generate_text",
    ],
    expectedAllPct: 71,
    expectedRequiredPct: 75,
  },
  {
    name: "itsm-problem-mgmt-system",
    module: "ITSM-PROBLEM-MGMT",
    description:
      "Per-module system skill for Problem Management — root-cause analysis, known-error tracking. Required CI lookup; optional AI clustering for root-cause grouping.",
    required: [
      "query_problems", "create_problem",
      "query_configuration_items",
    ],
    optional: [
      "classify_text",
    ],
    expectedAllPct: 75,
    expectedRequiredPct: 100,
  },
  {
    name: "itsm-change-mgmt-system",
    module: "ITSM-CHANGE-MGMT",
    description:
      "Per-module system skill for Change and Release Management — change submission, CAB approval, scheduling, implementation. CI lookup required for impact; outbound email + chat required for CAB notifications; SLA lookup optional.",
    required: [
      "query_changes", "create_change_request",
      "query_configuration_items",
      "send_email", "post_chat_message",
    ],
    optional: [
      "query_slas",
    ],
    expectedAllPct: 67,
    expectedRequiredPct: 60,
  },
  {
    name: "itsm-event-mgmt-system",
    module: "ITSM-EVENT-MGMT",
    description:
      "Per-module system skill for Event and Alert Handling — monitoring alert ingestion, deduplication, correlation, escalation. NOTE: monitoring_alerts CRUD tools aren't loaded yet — this skill is intentionally thin until that gap is filled. Outbound email + chat required for paging; CI lookup + AI classification optional.",
    required: [
      "send_email", "post_chat_message",
    ],
    optional: [
      "query_configuration_items",
      "classify_text",
    ],
    expectedAllPct: 25,
    expectedRequiredPct: 0,
  },
  {
    name: "itsm-knowledge-system",
    module: "ITSM-KNOWLEDGE",
    description:
      "Per-module system skill for Knowledge Management — article authoring, review, publication, retirement. Optional AI text generation for authoring assistance.",
    required: [
      "query_knowledge_articles",
    ],
    optional: [
      "generate_text",
    ],
    expectedAllPct: 50,
    expectedRequiredPct: 100,
  },
  {
    name: "itsm-agent-workspace-system",
    module: "ITSM-AGENT-WORKSPACE",
    description:
      "Per-module system skill for Agent Workspace and Reporting — unified agent view, walk-up routing, virtual-agent surface, reporting. NOTE: workspace-view / virtual-agent CRUD tools aren't loaded yet — this skill is intentionally thin until that gap is filled. Only optional AI text generation + classification today.",
    required: [],
    optional: [
      "generate_text", "classify_text",
    ],
    expectedAllPct: 0,
    expectedRequiredPct: null,
  },
  {
    name: "itsm-sla-mgmt-system",
    module: "ITSM-SLA-MGMT",
    description:
      "Per-module system skill for SLA and Chargeback Management — SLA definition, breach evaluation, chargeback rollup. NOTE: SLA evaluation + chargeback CRUD tools beyond query_slas aren't loaded yet — this skill is intentionally thin until that gap is filled.",
    required: [
      "query_slas",
    ],
    optional: [],
    expectedAllPct: 100,
    expectedRequiredPct: 100,
  },
];

// ============================================================
// 2. Create skills rows (idempotent on skill_name)
// ============================================================
console.log("\n=== 2. skills (8 rows) ===");

const existingSkills: Row[] = await postgrest(
  "GET",
  `/skills?skill_name=in.(${skills.map((s) => s.name).join(",")})&select=id,skill_name`,
) ?? [];
const skillId: Record<string, number> = {};
for (const r of existingSkills) skillId[String(r.skill_name)] = Number(r.id);

for (const s of skills) {
  if (skillId[s.name]) {
    console.log(`  recycled ${s.name} (id=${skillId[s.name]})`);
    continue;
  }
  const moduleId = modId[s.module];
  if (!moduleId) {
    console.log(`  skipped ${s.name} (module ${s.module} unresolved)`);
    continue;
  }
  console.log(`  inserting ${s.name}`);
  await postgrest("POST", "/skills", {
    skill_name: s.name,
    description: s.description,
    skill_type: "system",
    domain_id: ITSM_DOMAIN_ID,
    domain_module_id: moduleId,
  });
}

const finalSkills: Row[] = await postgrest(
  "GET",
  `/skills?skill_name=in.(${skills.map((s) => s.name).join(",")})&select=id,skill_name`,
) ?? [];
for (const r of finalSkills) skillId[String(r.skill_name)] = Number(r.id);
console.log(`  ${Object.keys(skillId).length} skill IDs resolved`);

// ============================================================
// 3. skill_tools rows (idempotent on (skill_id, tool_id))
// ============================================================
console.log("\n=== 3. skill_tools ===");

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
    if (!tid) {
      console.log(`  missing tool: ${s.name} -> ${p.toolName}`);
      continue;
    }
    const key = `${sid}:${tid}`;
    if (seenST.has(key)) {
      stSkipped++;
      continue;
    }
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
// 4. Verify per-module Semantius scores against expected
// ============================================================
console.log("\n=== 4. Semantius score verification ===");

const SEMANTIUS_COVERED = new Set(["query", "mutate"]);

let allMatch = true;
console.log();
console.log("  module                       | all     | req-only | exp-all | exp-req | match");
console.log("  -----------------------------|---------|----------|---------|---------|------");
for (const s of skills) {
  const reqKinds = s.required.map((t) => toolKind[t] ?? "?");
  const optKinds = s.optional.map((t) => toolKind[t] ?? "?");
  const allKinds = [...reqKinds, ...optKinds];

  const reqCovered = reqKinds.filter((k) => SEMANTIUS_COVERED.has(k)).length;
  const allCovered = allKinds.filter((k) => SEMANTIUS_COVERED.has(k)).length;

  const allPct = allKinds.length === 0 ? 0 : Math.round((allCovered / allKinds.length) * 100);
  const reqPct = reqKinds.length === 0 ? null : Math.round((reqCovered / reqKinds.length) * 100);

  const allOk = Math.abs(allPct - s.expectedAllPct) <= 1;
  const reqOk = reqPct === null ? s.expectedRequiredPct === null
    : (s.expectedRequiredPct !== null && Math.abs(reqPct - s.expectedRequiredPct) <= 1);
  const match = allOk && reqOk;
  if (!match) allMatch = false;

  const allCell = `${allCovered}/${allKinds.length}=${allPct}%`;
  const reqCell = reqPct === null ? "-/-" : `${reqCovered}/${reqKinds.length}=${reqPct}%`;
  const expAll = `${s.expectedAllPct}%`;
  const expReq = s.expectedRequiredPct === null ? "-" : `${s.expectedRequiredPct}%`;

  console.log(
    `  ${s.module.padEnd(28)} | ${allCell.padEnd(7)} | ${reqCell.padEnd(8)} | ${expAll.padEnd(7)} | ${expReq.padEnd(7)} | ${match ? "ok" : "MISMATCH"}`,
  );
}

console.log();
console.log(allMatch ? "All scores match expected." : "Score mismatch detected — investigate.");
console.log("\nload_itsm_module_skills.ts complete.");
console.log("\nVerify in the UI:");
console.log(`  https://tests.semantius.app/domain_map/skills?domain_id=eq.${ITSM_DOMAIN_ID}`);
console.log(`  https://tests.semantius.app/domain_map/skill_tools`);
console.log("\nFollow-ups (not handled by this loader):");
console.log("  - monitoring_alerts (data_object_id=85) has no role=master row in domain_module_data_objects (Rule #11 violation).");
console.log("  - ITSM-EVENT-MGMT, ITSM-AGENT-WORKSPACE, ITSM-SLA-MGMT are intentionally thin until their CRUD tools are loaded.");
console.log("  - Domain-level itsm-system (skill_id=14) is left in place. Retiring it is a separate pass.");
