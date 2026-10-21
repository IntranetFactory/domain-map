/**
 * LMS rewrite loader 6/6 - TRAINING-RECORDS-STARTER kit.
 *
 * Rule #19 starter kit shape:
 *  - module_kind='starter', primary host LMS (57)
 *  - DMDO restricted to embedded_master on domain_owned + consumer on platform_builtin
 *  - No lifecycle states authored
 *  - Exactly 3 baseline permissions
 *  - One realized capability
 *  - Exactly 1 system skill with >=1 skill_tools
 *
 * Phase A: pre-flight validators (Rule #19 invariants 1-6).
 * Phase B: insert the starter module row.
 * Phase C: 1 inbound tool added to catalog (ingest_external_completion).
 * Phase D: domain_module_capabilities (LMS-CREDENTIAL-MGMT realized).
 * Phase E: DMDO rows (10 embedded_master + 1 consumer on users).
 * Phase F: 3 baseline permissions.
 * Phase G: 1 system skill + skill_tools.
 *
 * Run: bun run "c:/dev/domain-map/.tmp_deploy/load_lms_rewrite_6_starter.ts"
 */

const LMS_DOMAIN_ID = 57;
const DO_USERS = 748;

const FORBIDDEN = /—/;

interface CmdResult { ok: boolean; data: any; status: number; stderr: string; }

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) return { ok: false, data: null, status: code, stderr: stderr.trim() || stdout.trim() };
  const text = stdout.trim();
  try { return { ok: true, data: text ? JSON.parse(text) : null, status: 0, stderr: "" }; }
  catch (e) { return { ok: false, data: text, status: code, stderr: "JSON parse failed: " + text }; }
}

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.stderr}`);
  return r.data;
}

async function post(path: string, rows: any[]): Promise<any[]> {
  if (rows.length === 0) return [];
  const r = await postgrest("POST", path, rows);
  if (!r.ok) throw new Error(`POST ${path} failed: ${r.stderr}`);
  return Array.isArray(r.data) ? r.data : [r.data];
}

function checkText(label: string, ...vals: (string | null | undefined)[]) {
  for (const v of vals) if (v && FORBIDDEN.test(v)) throw new Error(`em-dash found in ${label}: ${v.slice(0, 80)}`);
}

// =========================================================================
// PHASE A - pre-flight validators
// =========================================================================
console.log("=== PHASE A: Rule #19 pre-flight validators ===");

// Embedded entities required to have a canonical master somewhere
const EMBEDDED_ENTITIES = [
  // required
  "compliance_assignments", "training_evidence_records", "signature_records", "learner_certifications",
  // optional - statutory training records (orgs deploy whichever apply to them)
  "harassment_training_acknowledgements", "hipaa_training_records", "osha_training_records",
  "sox_training_evidence", "ferpa_training_records", "fda_part11_audit_trails", "bsa_aml_training_records",
];

const embRows = (await get(`/data_objects?data_object_name=in.(${EMBEDDED_ENTITIES.join(",")})&select=id,data_object_name,kind`)) ?? [];
const DO: Record<string, { id: number; kind: string }> = {};
for (const r of embRows) DO[String(r.data_object_name)] = { id: Number(r.id), kind: String(r.kind) };

// Verify all embedded targets exist
for (const n of EMBEDDED_ENTITIES) {
  if (!DO[n]) throw new Error(`Pre-flight: data_object ${n} not found`);
}

// Verify each has a canonical master somewhere
for (const n of EMBEDDED_ENTITIES) {
  if (DO[n].kind === "platform_builtin") continue;
  const masters = (await get(`/domain_module_data_objects?data_object_id=eq.${DO[n].id}&role=eq.master&select=id&limit=1`)) ?? [];
  if (masters.length === 0) throw new Error(`Pre-flight Rule #11: ${n} has no canonical master`);
}
console.log(`  all ${EMBEDDED_ENTITIES.length} embedded entities have canonical masters`);

// Confirm users is platform_builtin
const usersRow = (await get(`/data_objects?id=eq.${DO_USERS}&select=kind`))?.[0];
if (!usersRow || usersRow.kind !== "platform_builtin") throw new Error("Pre-flight: users (748) is not platform_builtin");
console.log(`  users (748) confirmed platform_builtin`);

// =========================================================================
// PHASE B - starter module row
// =========================================================================
console.log("\n=== PHASE B: TRAINING-RECORDS-STARTER module ===");

const STARTER_CODE = "TRAINING-RECORDS-STARTER";
const STARTER_NAME = "Training Records (Compliance Documentation Starter)";
const STARTER_DESC = "Deployable starter kit for small and mid-market organizations that outsource training delivery to external vendors (EasyLlama, Traliant, Ethena, NAVEX, KnowBe4) and need to retain audit-ready evidence in their own catalog. Embeds compliance assignments, training evidence records, learner certifications, signature records, and per-regulation training records from the full LMS-COMPLIANCE-TRAINING and LMS-CREDENTIALS modules; deploys standalone without requiring the full LMS substrate. Buyer persona: HR Director or Compliance Officer at a 50 to 500 person organization. When the org later adopts the full LMS, embedded shells deterministically demote to consumer.";

checkText("starter module", STARTER_NAME, STARTER_DESC);

let starter = (await get(`/domain_modules?domain_module_code=eq.${STARTER_CODE}&select=id,module_kind`))?.[0];
if (starter) {
  console.log(`  starter already exists id=${starter.id} kind=${starter.module_kind}`);
  if (starter.module_kind !== "starter") throw new Error(`Existing row id=${starter.id} has wrong module_kind=${starter.module_kind}`);
} else {
  console.log(`  inserting starter module`);
  const inserted = await post("/domain_modules", [{
    domain_module_code: STARTER_CODE,
    domain_module_name: STARTER_NAME,
    description: STARTER_DESC,
    domain_id: LMS_DOMAIN_ID,
    module_kind: "starter",
  }]);
  starter = inserted[0];
}
const STARTER_ID = Number(starter.id);
console.log(`  STARTER_ID = ${STARTER_ID}`);

// =========================================================================
// PHASE C - inbound tool
// =========================================================================
console.log("\n=== PHASE C: ingest_external_completion tool ===");

const existingIngest = (await get(`/tools?tool_name=eq.ingest_external_completion&select=id`))?.[0];
let INGEST_TOOL_ID: number;
if (existingIngest) {
  INGEST_TOOL_ID = Number(existingIngest.id);
  console.log(`  ingest_external_completion already exists id=${INGEST_TOOL_ID}`);
} else {
  const inserted = await post("/tools", [{
    tool_name: "ingest_external_completion",
    operation_kind: "inbound",
    data_object_id: null,
    description: "Inbound webhook to receive training-completion records from external training vendors (EasyLlama, Traliant, Ethena, NAVEX, KnowBe4). Lands as compliance_assignments + training_evidence_records.",
    coverage_tier: "platform",
  }]);
  INGEST_TOOL_ID = Number(inserted[0].id);
  console.log(`  inserted ingest_external_completion id=${INGEST_TOOL_ID}`);
}

const notifyTool = (await get(`/tools?tool_name=eq.notify_person&select=id`))?.[0];
const NOTIFY_PERSON_ID = Number(notifyTool.id);

// =========================================================================
// PHASE D - domain_module_capabilities
// =========================================================================
console.log("\n=== PHASE D: domain_module_capabilities ===");

const credCap = (await get(`/capabilities?capability_code=eq.LMS-CREDENTIAL-MGMT&select=id`))?.[0];
const ctCap = (await get(`/capabilities?capability_code=eq.COMPLIANCE-TRAIN&select=id`))?.[0];
if (!credCap || !ctCap) throw new Error("Required capabilities not found");

const DMCS = [
  { domain_module_id: STARTER_ID, capability_id: Number(credCap.id) },
  { domain_module_id: STARTER_ID, capability_id: Number(ctCap.id) },
];
const existingDmc = (await get(`/domain_module_capabilities?domain_module_id=eq.${STARTER_ID}&select=capability_id`)) ?? [];
const existingDmcSet = new Set(existingDmc.map((r: any) => Number(r.capability_id)));
const newDmc = DMCS.filter(r => !existingDmcSet.has(r.capability_id));
if (newDmc.length > 0) await post("/domain_module_capabilities", newDmc);
console.log(`  domain_module_capabilities: inserted ${newDmc.length} (skipping ${DMCS.length - newDmc.length})`);

// =========================================================================
// PHASE E - DMDO (embedded shells + consumer on users)
// =========================================================================
console.log("\n=== PHASE E: DMDO ===");

type J = { data_object_id: number; role: string; necessity: string };
const JUNCTIONS: J[] = [
  // Required embedded shells
  { data_object_id: DO["compliance_assignments"].id, role: "embedded_master", necessity: "required" },
  { data_object_id: DO["training_evidence_records"].id, role: "embedded_master", necessity: "required" },
  { data_object_id: DO["signature_records"].id, role: "embedded_master", necessity: "required" },
  { data_object_id: DO["learner_certifications"].id, role: "embedded_master", necessity: "required" },
  // Optional embedded shells (per-regulation; deploy picks)
  { data_object_id: DO["harassment_training_acknowledgements"].id, role: "embedded_master", necessity: "optional" },
  { data_object_id: DO["hipaa_training_records"].id, role: "embedded_master", necessity: "optional" },
  { data_object_id: DO["osha_training_records"].id, role: "embedded_master", necessity: "optional" },
  { data_object_id: DO["sox_training_evidence"].id, role: "embedded_master", necessity: "optional" },
  { data_object_id: DO["ferpa_training_records"].id, role: "embedded_master", necessity: "optional" },
  { data_object_id: DO["fda_part11_audit_trails"].id, role: "embedded_master", necessity: "optional" },
  { data_object_id: DO["bsa_aml_training_records"].id, role: "embedded_master", necessity: "optional" },
  // Consumer on platform_builtin users
  { data_object_id: DO_USERS, role: "consumer", necessity: "required" },
];

// Rule #19 invariant 1 enforce: role must be embedded_master on domain_owned or consumer on platform_builtin
for (const j of JUNCTIONS) {
  if (j.role === "embedded_master") continue;
  if (j.role === "consumer") {
    const kind = (await get(`/data_objects?id=eq.${j.data_object_id}&select=kind`))?.[0]?.kind;
    if (kind !== "platform_builtin") throw new Error(`Rule #19 invariant 1: consumer on non-platform_builtin ${j.data_object_id} not allowed`);
    continue;
  }
  throw new Error(`Rule #19 invariant 1: role '${j.role}' forbidden on starter`);
}

const existingJ = (await get(`/domain_module_data_objects?domain_module_id=eq.${STARTER_ID}&select=data_object_id`)) ?? [];
const existingJSet = new Set(existingJ.map((r: any) => Number(r.data_object_id)));
const newJ = JUNCTIONS
  .filter(j => !existingJSet.has(j.data_object_id))
  .map(j => ({ ...j, domain_module_id: STARTER_ID, notes: "" }));

if (newJ.length > 0) await post("/domain_module_data_objects", newJ);
console.log(`  DMDO rows inserted: ${newJ.length} (skipping ${JUNCTIONS.length - newJ.length} existing)`);

// =========================================================================
// PHASE F - 3 baseline permissions
// =========================================================================
console.log("\n=== PHASE F: baseline permissions ===");

const STARTER_KEBAB = STARTER_CODE.toLowerCase();
const PERMS = [
  { permission_name: `${STARTER_KEBAB}:read`,   tier: "baseline-read",   description: "Read training records and evidence retained by the starter." },
  { permission_name: `${STARTER_KEBAB}:manage`, tier: "baseline-manage", description: "Manage training records: ingest external completions, file evidence." },
  { permission_name: `${STARTER_KEBAB}:admin`,  tier: "baseline-admin",  description: "Full administration of the training records starter." },
];

for (const p of PERMS) checkText(`permission ${p.permission_name}`, p.description);

const permNames = PERMS.map(p => p.permission_name).join(",");
const existingP = (await get(`/permissions?permission_name=in.(${permNames})&select=permission_name`)) ?? [];
const existingPSet = new Set(existingP.map((r: any) => String(r.permission_name)));
const newP = PERMS
  .filter(p => !existingPSet.has(p.permission_name))
  .map(p => ({ ...p, domain_module_id: STARTER_ID }));

if (newP.length > 0) await post("/permissions", newP);
console.log(`  baseline permissions inserted: ${newP.length} (skipping ${PERMS.length - newP.length} existing)`);

// Rule #19 invariant 4 check
const allStarterPerms = (await get(`/permissions?domain_module_id=eq.${STARTER_ID}&select=tier`)) ?? [];
const baselineCount = allStarterPerms.filter((p: any) => String(p.tier).startsWith("baseline-")).length;
const gateCount = allStarterPerms.filter((p: any) => p.tier === "workflow-gate").length;
if (baselineCount !== 3) throw new Error(`Rule #19 invariant 4: expected 3 baseline permissions, got ${baselineCount}`);
if (gateCount !== 0) throw new Error(`Rule #19 invariant 4: starter must not ship workflow-gate permissions, got ${gateCount}`);
console.log(`  Rule #19 invariant 4 holds: 3 baseline, 0 workflow-gate`);

// =========================================================================
// PHASE G - 1 system skill + skill_tools
// =========================================================================
console.log("\n=== PHASE G: system skill + skill_tools ===");

const SKILL_NAME = "training_records_starter_agent";
const SKILL_DESC = "Lite agent for the Training Records starter: query compliance assignments, training evidence, and certifications; ingest external training-vendor completions via webhook; notify employees and managers about evidence requests and expirations.";

checkText("starter skill", SKILL_DESC);

let starterSkill = (await get(`/skills?skill_name=eq.${SKILL_NAME}&select=id`))?.[0];
if (!starterSkill) {
  const inserted = await post("/skills", [{
    skill_name: SKILL_NAME,
    description: SKILL_DESC,
    skill_type: "system",
    domain_id: LMS_DOMAIN_ID,
    domain_module_id: STARTER_ID,
  }]);
  starterSkill = inserted[0];
}
const STARTER_SKILL_ID = Number(starterSkill.id);
console.log(`  STARTER_SKILL_ID = ${STARTER_SKILL_ID}`);

// Resolve query_<entity> tools that were added in loaders 1-4
const queryToolNames = [
  "query_compliance_assignments",
  "query_training_evidence_records",
  "query_learner_certifications",
  "query_harassment_training_acknowledgements",
  "query_hipaa_training_records",
  "query_osha_training_records",
  "query_sox_training_evidence",
  "query_ferpa_training_records",
  "query_fda_part11_audit_trails",
  "query_bsa_aml_training_records",
];
const qtRows = (await get(`/tools?tool_name=in.(${queryToolNames.join(",")})&select=id,tool_name`)) ?? [];
const QT: Record<string, number> = {};
for (const r of qtRows) QT[String(r.tool_name)] = Number(r.id);

const STARTER_TOOL_IDS: number[] = [];
for (const tn of queryToolNames) {
  if (QT[tn]) STARTER_TOOL_IDS.push(QT[tn]);
  else console.log(`  WARN: tool ${tn} not found, skipping`);
}
STARTER_TOOL_IDS.push(INGEST_TOOL_ID);
STARTER_TOOL_IDS.push(NOTIFY_PERSON_ID);

const existingSt = (await get(`/skill_tools?skill_id=eq.${STARTER_SKILL_ID}&select=tool_id`)) ?? [];
const existingStSet = new Set(existingSt.map((r: any) => Number(r.tool_id)));
const newSt = STARTER_TOOL_IDS
  .filter(tid => !existingStSet.has(tid))
  .map(tid => ({ skill_id: STARTER_SKILL_ID, tool_id: tid, requirement_level: "required" }));

if (newSt.length > 0) await post("/skill_tools", newSt);
console.log(`  skill_tools inserted: ${newSt.length} (total tools: ${STARTER_TOOL_IDS.length})`);

// Rule #19 invariant 6 check
const totalSt = (await get(`/skill_tools?skill_id=eq.${STARTER_SKILL_ID}&select=id`)).length;
if (totalSt < 1) throw new Error(`Rule #19 invariant 6: starter system skill needs >=1 skill_tools, has ${totalSt}`);
console.log(`  Rule #19 invariant 6 holds: ${totalSt} skill_tools on starter system skill`);

// =========================================================================
// SUMMARY
// =========================================================================
console.log("\n=== SUMMARY ===");

const starterSummary = {
  module_kind: starter.module_kind,
  dmdo: (await get(`/domain_module_data_objects?domain_module_id=eq.${STARTER_ID}&select=id`)).length,
  capabilities: (await get(`/domain_module_capabilities?domain_module_id=eq.${STARTER_ID}&select=id`)).length,
  permissions: (await get(`/permissions?domain_module_id=eq.${STARTER_ID}&select=id`)).length,
  skill_id: STARTER_SKILL_ID,
  skill_tools: totalSt,
};
console.log(`  ${STARTER_CODE} (id=${STARTER_ID})`);
console.log(`    module_kind:    ${starterSummary.module_kind}`);
console.log(`    DMDO:           ${starterSummary.dmdo} rows`);
console.log(`    capabilities:   ${starterSummary.capabilities}`);
console.log(`    permissions:    ${starterSummary.permissions} (3 baseline, 0 gate per Rule #19)`);
console.log(`    system skill:   id=${starterSummary.skill_id}`);
console.log(`    skill_tools:    ${starterSummary.skill_tools}`);

// Semantius coverage
const stCoverage = (await get(`/skill_tools?skill_id=eq.${STARTER_SKILL_ID}&select=tools(coverage_tier)`)) ?? [];
const platformCount = stCoverage.filter((r: any) => r.tools?.coverage_tier === "platform").length;
const totalCount = stCoverage.length;
console.log(`    Semantius score: ${platformCount}/${totalCount} platform = ${Math.round((platformCount/totalCount)*100)}%`);

console.log("\n  UI:");
console.log(`    https://adenin.semantius.app/domain_map/domain_modules?domain_module_code=eq.${STARTER_CODE}`);
console.log(`    https://adenin.semantius.app/domain_map/domain_module_data_objects?domain_module_id=eq.${STARTER_ID}`);

console.log("\n=== DONE: loader 6/6 (TRAINING-RECORDS-STARTER) ===");
console.log("LMS rewrite complete. Run a fresh structural audit when ready.");
