#!/usr/bin/env bun
// load_hiring_starter.ts — First first-class starter kit.
//
// HIRING-STARTER is the entry-tier ATS deployable: lite hiring workflow that
// embeds the canonical masters from full ATS modules (CANDIDATE-CRM,
// RECRUITMENT-PIPELINE, INTERVIEWS, OFFERS) and ships exactly three baseline
// permissions plus one system skill. No lifecycle states authored (Rule #19
// invariant 3); no workflow gates (invariant 4); no notes on any junction
// (Rule #15).
//
// Rule #19 invariant 1 (tightened — see skill-changelog 2026-05-27):
//   embedded_master on a kind='domain_owned' data_object, OR
//   consumer on a kind='platform_builtin' data_object.
//   Never master / derived / contributor / consumer+domain_owned.
//
// Idempotent. Re-running is safe.
// Run from project root (CLAUDE.md cwd rule):
//   bun run c:/dev/domain-map/.tmp_deploy/load_hiring_starter.ts

export {};

const ATS_DOMAIN_ID = 56;
const PLATFORM_MODULE_ID = 1001;
const STARTER_CODE = "HIRING-STARTER";
const STARTER_SLUG = "hiring-starter";

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
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path} (exit ${code}): ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

// ============================================================
// 0. Resolve all FK maps
// ============================================================
console.log("=== 0. Resolving FK maps ===");

const doNames = [
  "candidates", "job_postings", "job_applications",
  "interviews", "interview_scorecards", "job_offers",
  "recruitment_sources", "users",
];
const doRows: Row[] = await pg(
  "GET",
  `/data_objects?data_object_name=in.(${doNames.join(",")})&select=id,data_object_name,kind`,
) ?? [];
const doId: Record<string, number> = {};
const doKind: Record<string, string> = {};
for (const r of doRows) {
  doId[String(r.data_object_name)] = Number(r.id);
  doKind[String(r.data_object_name)] = String(r.kind);
}
console.log(`  data_objects: ${Object.keys(doId).length}/${doNames.length} resolved`);
for (const n of doNames) {
  if (!doId[n]) throw new Error(`Missing data_object: ${n}`);
}

const capCodes = ["CANDIDATE-EXP", "INTERVIEW-MGMT", "OFFER-MGMT", "SOURCING"];
const capRows: Row[] = await pg(
  "GET",
  `/capabilities?capability_code=in.(${capCodes.join(",")})&select=id,capability_code`,
) ?? [];
const capId: Record<string, number> = {};
for (const r of capRows) capId[String(r.capability_code)] = Number(r.id);
console.log(`  capabilities: ${Object.keys(capId).length}/${capCodes.length} resolved`);
for (const c of capCodes) {
  if (!capId[c]) throw new Error(`Missing capability: ${c}`);
}

// ============================================================
// 1. Validate Rule #19 invariant 1 against the design before any write
// ============================================================
console.log("\n=== 1. Pre-flight: Rule #19 invariant 1 ===");

type JunctionSpec = {
  data_object_name: string;
  role: "embedded_master" | "consumer";
  necessity: "required" | "optional";
};

const junctions: JunctionSpec[] = [
  { data_object_name: "candidates",          role: "embedded_master", necessity: "required" },
  { data_object_name: "job_postings",        role: "embedded_master", necessity: "required" },
  { data_object_name: "job_applications",    role: "embedded_master", necessity: "required" },
  { data_object_name: "interviews",          role: "embedded_master", necessity: "required" },
  { data_object_name: "interview_scorecards", role: "embedded_master", necessity: "optional" },
  { data_object_name: "job_offers",          role: "embedded_master", necessity: "required" },
  { data_object_name: "recruitment_sources", role: "embedded_master", necessity: "optional" },
  { data_object_name: "users",               role: "consumer",        necessity: "required" },
];

for (const j of junctions) {
  const kind = doKind[j.data_object_name];
  if (j.role === "consumer" && kind !== "platform_builtin") {
    throw new Error(
      `Rule #19 inv. 1 violation: consumer on ${j.data_object_name} requires kind='platform_builtin' (got '${kind}')`,
    );
  }
  if (j.role === "embedded_master") {
    if (kind === "platform_builtin") continue;
    const masters: Row[] = await pg(
      "GET",
      `/domain_module_data_objects?data_object_id=eq.${doId[j.data_object_name]}&role=eq.master&select=id&limit=1`,
    ) ?? [];
    if (masters.length === 0) {
      throw new Error(
        `Rule #19 inv. 2 violation: embedded_master on ${j.data_object_name} has no canonical master in any full module`,
      );
    }
  }
}
console.log(`  ✓ all ${junctions.length} junctions pass invariants 1 and 2`);

// ============================================================
// 2. Upsert HIRING-STARTER domain_modules row
// ============================================================
console.log("\n=== 2. domain_modules ===");

const existingStarter: Row[] = await pg(
  "GET",
  `/domain_modules?domain_module_code=eq.${STARTER_CODE}&select=id,domain_module_code,module_kind,domain_id`,
) ?? [];

let starterId: number;
if (existingStarter.length === 0) {
  console.log(`  ✨ creating ${STARTER_CODE}`);
  await pg("POST", "/domain_modules", {
    domain_module_code: STARTER_CODE,
    domain_module_name: "Hiring Starter",
    domain_id: ATS_DOMAIN_ID,
    module_kind: "starter",
    description:
      "Entry-tier deployable for a basic hiring workflow: post jobs, capture applications, run interviews, generate offers. Embeds the canonical masters from the full ATS modules and inherits their lifecycle states. Ships three baseline permissions and one system skill; no workflow gates, no requisition approvals, no background-check orchestration, no pre-employee reconciliation. Upgrades to the full ATS surface without tenant data migration via the embedded-master demotion path.",
  });
  const reread: Row[] = await pg(
    "GET",
    `/domain_modules?domain_module_code=eq.${STARTER_CODE}&select=id`,
  ) ?? [];
  starterId = Number(reread[0].id);
} else {
  const existing = existingStarter[0];
  if (existing.module_kind !== "starter") {
    throw new Error(`${STARTER_CODE} exists but module_kind='${existing.module_kind}' (expected 'starter')`);
  }
  if (existing.domain_id !== ATS_DOMAIN_ID) {
    throw new Error(`${STARTER_CODE} exists but domain_id=${existing.domain_id} (expected ${ATS_DOMAIN_ID})`);
  }
  starterId = Number(existing.id);
  console.log(`  ♻ ${STARTER_CODE} (id=${starterId})`);
}

// ============================================================
// 3. Upsert any missing tools
// ============================================================
console.log("\n=== 3. tools ===");

type ToolSpec = {
  name: string;
  operationKind: "query" | "mutate" | "side_effect" | "compute" | "inbound";
  dataObject: string | null;
  coverageTier: "platform" | "external" | "integration";
  description: string;
};

const newTools: ToolSpec[] = [
  {
    name: "create_job_posting",
    operationKind: "mutate",
    dataObject: "job_postings",
    coverageTier: "platform",
    description: "Create a job posting record (role title, location, requirements, posting channel).",
  },
  {
    name: "query_job_applications",
    operationKind: "query",
    dataObject: "job_applications",
    coverageTier: "platform",
    description: "Look up job applications filtered by posting, candidate, stage, or recruiter.",
  },
  {
    name: "create_job_application",
    operationKind: "mutate",
    dataObject: "job_applications",
    coverageTier: "platform",
    description: "Create a job application linking a candidate to a posting at an initial stage.",
  },
  {
    name: "update_job_application",
    operationKind: "mutate",
    dataObject: "job_applications",
    coverageTier: "platform",
    description: "Update a job application: advance stage, set screening outcome, attach feedback, or reject with reason.",
  },
  {
    name: "update_interview",
    operationKind: "mutate",
    dataObject: "interviews",
    coverageTier: "platform",
    description: "Update an interview record: reschedule, change panelists, or cancel.",
  },
  {
    name: "submit_interview_scorecard",
    operationKind: "mutate",
    dataObject: "interview_scorecards",
    coverageTier: "platform",
    description: "Submit a structured interview scorecard with per-competency ratings and a hire recommendation.",
  },
];

const allToolNamesNeeded = [
  // existing
  "query_candidates", "create_candidate", "update_candidate",
  "query_job_postings",
  "query_interviews", "schedule_interview",
  "query_interview_scorecards",
  "query_job_offers", "create_offer",
  "notify_person", "notify_team",
  // new
  ...newTools.map((t) => t.name),
];

const existingTools: Row[] = await pg(
  "GET",
  `/tools?tool_name=in.(${allToolNamesNeeded.join(",")})&select=id,tool_name,operation_kind,coverage_tier,data_object_id`,
) ?? [];
const toolId: Record<string, number> = {};
for (const r of existingTools) toolId[String(r.tool_name)] = Number(r.id);

let toolInserted = 0;
for (const t of newTools) {
  if (toolId[t.name]) {
    console.log(`  ♻ ${t.name} (id=${toolId[t.name]})`);
    continue;
  }
  const dataObjectId = t.dataObject ? doId[t.dataObject] : null;
  // Rule #17 sub-invariant.
  if ((t.operationKind === "query" || t.operationKind === "mutate") && dataObjectId === null) {
    throw new Error(`Tool ${t.name}: operation_kind '${t.operationKind}' requires data_object_id`);
  }
  if ((t.operationKind === "side_effect" || t.operationKind === "compute") && dataObjectId !== null) {
    throw new Error(`Tool ${t.name}: operation_kind '${t.operationKind}' requires data_object_id to be null`);
  }
  console.log(`  ✨ ${t.name}`);
  await pg("POST", "/tools", {
    tool_name: t.name,
    description: t.description,
    operation_kind: t.operationKind,
    data_object_id: dataObjectId,
    coverage_tier: t.coverageTier,
  });
  toolInserted++;
}
console.log(`  ✨ ${toolInserted} new / ♻ ${existingTools.length} existing`);

// Re-resolve.
const finalTools: Row[] = await pg(
  "GET",
  `/tools?tool_name=in.(${allToolNamesNeeded.join(",")})&select=id,tool_name,operation_kind,coverage_tier`,
) ?? [];
for (const r of finalTools) toolId[String(r.tool_name)] = Number(r.id);
const toolKind: Record<string, string> = {};
const toolCov: Record<string, string> = {};
for (const r of finalTools) {
  toolKind[String(r.tool_name)] = String(r.operation_kind);
  toolCov[String(r.tool_name)] = String(r.coverage_tier);
}
for (const n of allToolNamesNeeded) {
  if (!toolId[n]) throw new Error(`Tool unresolved after insert: ${n}`);
}

// ============================================================
// 4. domain_module_data_objects (8 rows, role + necessity; Rule #15: no notes)
// ============================================================
console.log("\n=== 4. domain_module_data_objects ===");

const existingDMDO: Row[] = await pg(
  "GET",
  `/domain_module_data_objects?domain_module_id=eq.${starterId}&select=data_object_id,role,necessity`,
) ?? [];
const dmdoByDataObject = new Map<number, Row>(existingDMDO.map((r) => [r.data_object_id as number, r]));

let dmdoInserted = 0;
let dmdoSkipped = 0;
for (const j of junctions) {
  const dId = doId[j.data_object_name];
  const existing = dmdoByDataObject.get(dId);
  if (existing) {
    if (existing.role !== j.role || existing.necessity !== j.necessity) {
      throw new Error(
        `DMDO mismatch on ${j.data_object_name}: existing role=${existing.role}/necessity=${existing.necessity}, design says ${j.role}/${j.necessity}`,
      );
    }
    dmdoSkipped++;
    continue;
  }
  await pg("POST", "/domain_module_data_objects", {
    domain_module_id: starterId,
    data_object_id: dId,
    role: j.role,
    necessity: j.necessity,
    // notes: deliberately omitted per Rule #15
  });
  dmdoInserted++;
}
console.log(`  ✨ ${dmdoInserted} new / ♻ ${dmdoSkipped} existing`);

// ============================================================
// 5. domain_module_capabilities (4 rows)
// ============================================================
console.log("\n=== 5. domain_module_capabilities ===");

const existingDMC: Row[] = await pg(
  "GET",
  `/domain_module_capabilities?domain_module_id=eq.${starterId}&select=capability_id`,
) ?? [];
const dmcSeen = new Set(existingDMC.map((r) => Number(r.capability_id)));

let dmcInserted = 0;
let dmcSkipped = 0;
for (const code of capCodes) {
  const cid = capId[code];
  if (dmcSeen.has(cid)) {
    dmcSkipped++;
    continue;
  }
  await pg("POST", "/domain_module_capabilities", {
    domain_module_id: starterId,
    capability_id: cid,
  });
  dmcInserted++;
}
console.log(`  ✨ ${dmcInserted} new / ♻ ${dmcSkipped} existing`);

// ============================================================
// 6. permissions (exactly 3 baseline rows; Rule #19 inv. 4)
// ============================================================
console.log("\n=== 6. permissions (3 baseline) ===");

type PermSpec = {
  name: string;
  tier: "baseline-read" | "baseline-manage" | "baseline-admin";
  description: string;
};
const perms: PermSpec[] = [
  {
    name: `${STARTER_SLUG}:read`,
    tier: "baseline-read",
    description: "Read access to the Hiring Starter surface (candidates, postings, applications, interviews, scorecards, offers, recruitment sources).",
  },
  {
    name: `${STARTER_SLUG}:manage`,
    tier: "baseline-manage",
    description: "Create and update access across the Hiring Starter surface; move applications through stages, schedule interviews, draft offers.",
  },
  {
    name: `${STARTER_SLUG}:admin`,
    tier: "baseline-admin",
    description: "Full administrative access to the Hiring Starter, including configuration of recruitment sources and tear-down of records.",
  },
];

const existingPerms: Row[] = await pg(
  "GET",
  `/permissions?permission_name=in.(${perms.map((p) => p.name).join(",")})&select=id,permission_name,tier,domain_module_id`,
) ?? [];
const permByName = new Map<string, Row>(existingPerms.map((r) => [String(r.permission_name), r]));

let permInserted = 0;
let permPatched = 0;
let permSkipped = 0;
for (const p of perms) {
  const existing = permByName.get(p.name);
  if (!existing) {
    await pg("POST", "/permissions", {
      permission_name: p.name,
      description: p.description,
      module_id: PLATFORM_MODULE_ID,
      domain_module_id: starterId,
      tier: p.tier,
    });
    permInserted++;
    continue;
  }
  const patch: Row = {};
  if (existing.domain_module_id !== starterId) patch.domain_module_id = starterId;
  if (existing.tier !== p.tier) patch.tier = p.tier;
  if (Object.keys(patch).length === 0) {
    permSkipped++;
    continue;
  }
  await pg("PATCH", `/permissions?id=eq.${existing.id}`, patch);
  permPatched++;
}
console.log(`  ✨ ${permInserted} new / ♻ ${permPatched} patched / ${permSkipped} unchanged`);

// permission_hierarchy: admin ⊃ manage ⊃ read (baseline chain, origin='model')
const finalPerms: Row[] = await pg(
  "GET",
  `/permissions?permission_name=in.(${perms.map((p) => p.name).join(",")})&select=id,permission_name`,
) ?? [];
const permIdByName = new Map<string, number>(finalPerms.map((r) => [String(r.permission_name), r.id as number]));
const adminId = permIdByName.get(`${STARTER_SLUG}:admin`)!;
const manageId = permIdByName.get(`${STARTER_SLUG}:manage`)!;
const readId = permIdByName.get(`${STARTER_SLUG}:read`)!;

const edges: Array<[number, number]> = [
  [adminId, manageId],
  [manageId, readId],
];
const existingEdges: Row[] = await pg(
  "GET",
  `/permission_hierarchy?including_permission_id=in.(${[adminId, manageId].join(",")})&included_permission_id=in.(${[manageId, readId].join(",")})&select=including_permission_id,included_permission_id`,
) ?? [];
const edgeSeen = new Set(existingEdges.map((r) => `${r.including_permission_id}:${r.included_permission_id}`));
let edgeInserted = 0;
let edgeSkipped = 0;
for (const [inc, incd] of edges) {
  if (edgeSeen.has(`${inc}:${incd}`)) {
    edgeSkipped++;
    continue;
  }
  await pg("POST", "/permission_hierarchy", {
    including_permission_id: inc,
    included_permission_id: incd,
    origin: "model",
  });
  edgeInserted++;
}
console.log(`  permission_hierarchy: ✨ ${edgeInserted} new / ♻ ${edgeSkipped} existing`);

// ============================================================
// 7. skills (exactly 1 system skill; Rule #19 inv. 6, Rule #17)
// ============================================================
console.log("\n=== 7. skills (1 system skill) ===");

const SKILL_NAME = "hiring_starter_agent";

const existingSkill: Row[] = await pg(
  "GET",
  `/skills?skill_name=eq.${SKILL_NAME}&select=id,skill_name,domain_module_id`,
) ?? [];

let skillId: number;
if (existingSkill.length === 0) {
  console.log(`  ✨ creating ${SKILL_NAME}`);
  await pg("POST", "/skills", {
    skill_name: SKILL_NAME,
    description:
      "Agent surface for the Hiring Starter: query and create candidates, post jobs, route applications through screening and interviews, schedule and update interviews, capture interview scorecards, draft and send job offers. Inherits lifecycle and workflow gates from the canonical ATS masters; the starter itself authors no lifecycle states.",
    skill_type: "system",
    domain_id: ATS_DOMAIN_ID,
    domain_module_id: starterId,
  });
  const reread: Row[] = await pg(
    "GET",
    `/skills?skill_name=eq.${SKILL_NAME}&select=id`,
  ) ?? [];
  skillId = Number(reread[0].id);
} else {
  skillId = Number(existingSkill[0].id);
  if (existingSkill[0].domain_module_id !== starterId) {
    throw new Error(`${SKILL_NAME} exists with domain_module_id=${existingSkill[0].domain_module_id}, expected ${starterId}`);
  }
  console.log(`  ♻ ${SKILL_NAME} (id=${skillId})`);
}

// ============================================================
// 8. skill_tools (14 required + 3 optional = 17 rows; Rule #15: no notes)
// ============================================================
console.log("\n=== 8. skill_tools ===");

const required: string[] = [
  "query_candidates", "create_candidate", "update_candidate",
  "query_job_postings", "create_job_posting",
  "query_job_applications", "create_job_application", "update_job_application",
  "query_interviews", "schedule_interview",
  "query_interview_scorecards",
  "query_job_offers", "create_offer",
  "notify_person",
];
const optional: string[] = [
  "update_interview",
  "submit_interview_scorecard",
  "notify_team",
];

const existingST: Row[] = await pg(
  "GET",
  `/skill_tools?skill_id=eq.${skillId}&select=tool_id,requirement_level`,
) ?? [];
const stByToolId = new Map<number, Row>(existingST.map((r) => [Number(r.tool_id), r]));

let stInserted = 0;
let stSkipped = 0;
const linkPairs: Array<{ name: string; level: "required" | "optional" }> = [
  ...required.map((n) => ({ name: n, level: "required" as const })),
  ...optional.map((n) => ({ name: n, level: "optional" as const })),
];
for (const p of linkPairs) {
  const tid = toolId[p.name];
  if (!tid) throw new Error(`tool unresolved: ${p.name}`);
  if (stByToolId.has(tid)) {
    stSkipped++;
    continue;
  }
  await pg("POST", "/skill_tools", {
    skill_id: skillId,
    tool_id: tid,
    requirement_level: p.level,
    // notes: deliberately omitted per Rule #15
  });
  stInserted++;
}
console.log(`  ✨ ${stInserted} new / ♻ ${stSkipped} existing`);

// ============================================================
// 9. Verify Semantius coverage score on the linked tools
// ============================================================
console.log("\n=== 9. Coverage rollup ===");

const allLinked = [...required, ...optional];
let platformCount = 0;
let operationalCount = 0;
for (const n of allLinked) {
  const cov = toolCov[n];
  if (cov === "platform") {
    platformCount++;
    operationalCount++;
  } else if (cov === "integration") {
    operationalCount++;
  }
}
const total = allLinked.length;
const strict = ((platformCount / total) * 100).toFixed(1);
const operational = ((operationalCount / total) * 100).toFixed(1);
console.log(`  linked tools: ${total} (${required.length} required, ${optional.length} optional)`);
console.log(`  strict_score (platform / total):           ${platformCount}/${total} = ${strict}%`);
console.log(`  operational_score (platform+integration):  ${operationalCount}/${total} = ${operational}%`);

const nonPlatform = allLinked.filter((n) => toolCov[n] !== "platform");
if (nonPlatform.length > 0) {
  console.log(`  non-platform tools: ${nonPlatform.join(", ")}`);
} else {
  console.log(`  ✓ every linked tool is platform-tier; score = 100%`);
}

// ============================================================
// 10. Final summary + UI links
// ============================================================
console.log("\n✓ load_hiring_starter.ts complete.");
console.log(`\nVerify the load:`);
console.log(`  https://tests.semantius.app/domain_map/domain_modules   (look for ${STARTER_CODE})`);
console.log(`  https://tests.semantius.app/domain_map/domain_module_data_objects`);
console.log(`  https://tests.semantius.app/domain_map/domain_module_capabilities`);
console.log(`  https://tests.semantius.app/domain_map/permissions   (filter ${STARTER_SLUG}:*)`);
console.log(`  https://tests.semantius.app/domain_map/skills   (filter ${SKILL_NAME})`);
console.log(`  https://tests.semantius.app/domain_map/skill_tools`);
console.log(`\nAll new rows have record_status='new' (database default); approval requires explicit user review per Rule #1.`);
