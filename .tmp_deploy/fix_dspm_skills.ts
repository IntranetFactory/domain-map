#!/usr/bin/env bun
// B1A-SKILLS-PER-MODULE (DSPM, domains.id=140) — Phase S / Rule #17.
//
// Each of the 3 DSPM modules (233 DSPM-DISCOVERY-CLASSIFICATION, 234 DSPM-ACCESS-RISK,
// 235 DSPM-INCIDENT-REMEDIATION) needs exactly one skill_type='system' skill carrying
// >=1 skill_tools row. The pre-existing orphan skill id=51 ('dspm-system',
// domain_module_id=NULL) cannot satisfy the rule across 3 modules.
//
// This loader:
//   1. DELETEs orphan skill 51 (its 8 skill_tools 484-491 cascade / are removed first).
//   2. Creates domain-specific mutate / workflow-gate tools (deduped by tool_name; the
//      generic query_* tools 418-425, 100/101/103 and mutates 171/172 already exist and
//      are reused, never recreated).
//   3. INSERTs one system skill per module (domain_id=140, domain_module_id=233/234/235).
//   4. INSERTs skill_tools linking each skill to its query + mutate + gate tools.
//
// Conventions: record_status OMITTED on every insert (DB default 'new'). No `notes`
// writes. American English, no em-dashes. Idempotent: re-reads natural keys, inserts
// only the missing rows.

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });
const post = (path: string, body: Row[] | Row) => call({ method: "POST", path, body });
const del = (path: string) => call({ method: "DELETE", path });

const DOMAIN_ID = 140;

// ---------------------------------------------------------------------------
// STEP 1 — DELETE orphan skill 51 (+ its skill_tools).
// ---------------------------------------------------------------------------
const orphan = await get("/skills?id=eq.51&select=id,skill_name,domain_module_id");
if (orphan.length > 0) {
  const orphanTools = await get("/skill_tools?skill_id=eq.51&select=id");
  if (orphanTools.length > 0) {
    console.log(`  deleting ${orphanTools.length} skill_tools rows for orphan skill 51`);
    await del("/skill_tools?skill_id=eq.51");
  }
  console.log("  deleting orphan skill id=51 (dspm-system)");
  await del("/skills?id=eq.51");
} else {
  console.log("  orphan skill 51 already absent");
}

// ---------------------------------------------------------------------------
// STEP 2 — Tools. Reuse existing rows by tool_name; create only the missing
// domain-specific mutate / workflow-gate primitives.
// ---------------------------------------------------------------------------
// New domain-specific tools (all platform-tier CRUD / state transitions on
// platform-owned masters; operation_kind='mutate' => data_object_id required).
const newTools: Row[] = [
  // Module 233 — discovery + shadow-data workflow gates + store updates
  { tool_name: "update_cloud_storage_bucket", operation_kind: "mutate", data_object_id: 336, coverage_tier: "platform", description: "Update a cloud storage bucket inventory record (mark inventoried, decommissioned, or amend metadata)." },
  { tool_name: "update_cloud_database", operation_kind: "mutate", data_object_id: 337, coverage_tier: "platform", description: "Update a cloud database inventory record (mark inventoried, decommissioned, or amend metadata)." },
  { tool_name: "update_data_warehouse", operation_kind: "mutate", data_object_id: 338, coverage_tier: "platform", description: "Update a data warehouse inventory record (mark inventoried, decommissioned, or amend metadata)." },
  { tool_name: "update_saas_app_instance", operation_kind: "mutate", data_object_id: 339, coverage_tier: "platform", description: "Update a SaaS app instance inventory record (mark inventoried, decommissioned, or amend metadata)." },
  { tool_name: "triage_shadow_data_finding", operation_kind: "mutate", data_object_id: 343, coverage_tier: "platform", description: "Advance a shadow data finding into triage and set its disposition." },
  { tool_name: "assign_shadow_data_finding", operation_kind: "mutate", data_object_id: 343, coverage_tier: "platform", description: "Assign a triaged shadow data finding to a data owner for resolution." },
  // Module 234 — access policy gates + risk recompute
  { tool_name: "flag_iam_access_policy", operation_kind: "mutate", data_object_id: 340, coverage_tier: "platform", description: "Flag an IAM access policy for review when over-privilege or a toxic combination is detected." },
  { tool_name: "remediate_iam_access_policy", operation_kind: "mutate", data_object_id: 340, coverage_tier: "platform", description: "Apply an IAM access policy correction and record the remediation outcome." },
  { tool_name: "recalculate_data_risk_score", operation_kind: "mutate", data_object_id: 342, coverage_tier: "platform", description: "Recompute a data risk score from current sensitivity, access breadth, and exposure signals." },
  // Module 235 — incident workflow gates
  { tool_name: "triage_sensitive_data_incident", operation_kind: "mutate", data_object_id: 341, coverage_tier: "platform", description: "Advance a sensitive data incident into triage and assign an investigator." },
  { tool_name: "contain_sensitive_data_incident", operation_kind: "mutate", data_object_id: 341, coverage_tier: "platform", description: "Mark a sensitive data incident contained after access is revoked or exposure is closed." },
  { tool_name: "resolve_sensitive_data_incident", operation_kind: "mutate", data_object_id: 341, coverage_tier: "platform", description: "Resolve or close out a sensitive data incident with its final disposition." },
];

// Dedup against the catalog-wide tools table by natural key (tool_name).
const existingTools = await get("/tools?select=id,tool_name&limit=20000");
const toolIdByName = new Map<string, number>();
for (const t of existingTools) toolIdByName.set(String(t.tool_name), Number(t.id));

const toolsToInsert = newTools.filter(t => !toolIdByName.has(String(t.tool_name)));
if (toolsToInsert.length > 0) {
  console.log(`  inserting ${toolsToInsert.length} new tools (${newTools.length - toolsToInsert.length} already present)`);
  await post("/tools", toolsToInsert);
  const refreshed = await get("/tools?select=id,tool_name&limit=20000");
  toolIdByName.clear();
  for (const t of refreshed) toolIdByName.set(String(t.tool_name), Number(t.id));
} else {
  console.log("  all 12 new tools already present, nothing to insert");
}

function toolId(name: string): number {
  const id = toolIdByName.get(name);
  if (id === undefined) throw new Error(`tool not found by name: ${name}`);
  return id;
}

// ---------------------------------------------------------------------------
// STEP 3 — System skills, one per module. Dedup by (domain_module_id, skill_type=system).
// ---------------------------------------------------------------------------
const skillDefs = [
  {
    skill_name: "dspm_discovery_classification_agent",
    domain_module_id: 233,
    description: "System skill for the DSPM discovery and classification module. Enumerates cloud data stores, classifies the sensitivity of the data they hold, traces lineage, and triages shadow or unmanaged data findings.",
  },
  {
    skill_name: "dspm_access_risk_agent",
    domain_module_id: 234,
    description: "System skill for the DSPM access and risk module. Audits identity permissions on data stores, flags over-privilege and toxic combinations, and recomputes per-asset risk scores to prioritize remediation.",
  },
  {
    skill_name: "dspm_incident_remediation_agent",
    domain_module_id: 235,
    description: "System skill for the DSPM incident and remediation module. Triages detected sensitive-data incidents through investigation and containment and drives policy enforcement to resolution.",
  },
];

const existingSkills = await get("/skills?domain_module_id=in.(233,234,235)&skill_type=eq.system&select=id,skill_name,domain_module_id");
const skillIdByModule = new Map<number, number>();
for (const s of existingSkills) skillIdByModule.set(Number(s.domain_module_id), Number(s.id));

const skillsToInsert = skillDefs
  .filter(s => !skillIdByModule.has(s.domain_module_id))
  .map(s => ({
    skill_name: s.skill_name,
    skill_type: "system",
    domain_id: DOMAIN_ID,
    domain_module_id: s.domain_module_id,
    description: s.description,
    // record_status omitted -> DB default 'new'
  }));

if (skillsToInsert.length > 0) {
  console.log(`  inserting ${skillsToInsert.length} system skills`);
  await post("/skills", skillsToInsert);
  const refreshed = await get("/skills?domain_module_id=in.(233,234,235)&skill_type=eq.system&select=id,skill_name,domain_module_id");
  skillIdByModule.clear();
  for (const s of refreshed) skillIdByModule.set(Number(s.domain_module_id), Number(s.id));
} else {
  console.log("  system skills for 233/234/235 already present");
}

const skill233 = skillIdByModule.get(233)!;
const skill234 = skillIdByModule.get(234)!;
const skill235 = skillIdByModule.get(235)!;

// ---------------------------------------------------------------------------
// STEP 4 — skill_tools. requirement_level: required for the irreducible workflow
// surface (query + mutate + gate of the module's own masters), optional for
// degraded / cross-module reads. record_status omitted. notes left empty (Rule #15).
// ---------------------------------------------------------------------------
type ST = { skill_id: number; tool: string; requirement_level: "required" | "optional" };

const skillToolDefs: ST[] = [
  // ---- Module 233: DSPM-DISCOVERY-CLASSIFICATION ----
  // masters: 336/337/338/339 (cloud stores), 343 (shadow_data_findings)
  // contributors: 300 data_assets, 303 data_classifications; consumer: 301 lineage
  { skill_id: skill233, tool: "query_cloud_storage_buckets", requirement_level: "required" },
  { skill_id: skill233, tool: "query_cloud_databases", requirement_level: "required" },
  { skill_id: skill233, tool: "query_data_warehouses", requirement_level: "required" },
  { skill_id: skill233, tool: "query_saas_app_instances", requirement_level: "required" },
  { skill_id: skill233, tool: "query_shadow_data_findings", requirement_level: "required" },
  { skill_id: skill233, tool: "update_cloud_storage_bucket", requirement_level: "required" },
  { skill_id: skill233, tool: "update_cloud_database", requirement_level: "required" },
  { skill_id: skill233, tool: "update_data_warehouse", requirement_level: "optional" },
  { skill_id: skill233, tool: "update_saas_app_instance", requirement_level: "optional" },
  { skill_id: skill233, tool: "triage_shadow_data_finding", requirement_level: "required" },
  { skill_id: skill233, tool: "assign_shadow_data_finding", requirement_level: "required" },
  { skill_id: skill233, tool: "classify_data_asset", requirement_level: "required" },
  { skill_id: skill233, tool: "certify_data_asset", requirement_level: "optional" },
  { skill_id: skill233, tool: "query_data_assets", requirement_level: "optional" },
  { skill_id: skill233, tool: "query_data_classifications", requirement_level: "optional" },
  { skill_id: skill233, tool: "query_data_lineage_relationships", requirement_level: "optional" },
  { skill_id: skill233, tool: "notify_person", requirement_level: "optional" },

  // ---- Module 234: DSPM-ACCESS-RISK ----
  // masters: 340 iam_access_policies, 342 data_risk_scores
  { skill_id: skill234, tool: "query_iam_access_policies", requirement_level: "required" },
  { skill_id: skill234, tool: "query_data_risk_scores", requirement_level: "required" },
  { skill_id: skill234, tool: "flag_iam_access_policy", requirement_level: "required" },
  { skill_id: skill234, tool: "remediate_iam_access_policy", requirement_level: "required" },
  { skill_id: skill234, tool: "recalculate_data_risk_score", requirement_level: "required" },
  { skill_id: skill234, tool: "query_sensitive_data_incidents", requirement_level: "optional" },
  { skill_id: skill234, tool: "query_shadow_data_findings", requirement_level: "optional" },
  { skill_id: skill234, tool: "query_data_assets", requirement_level: "optional" },
  { skill_id: skill234, tool: "notify_person", requirement_level: "optional" },

  // ---- Module 235: DSPM-INCIDENT-REMEDIATION ----
  // master: 341 sensitive_data_incidents
  { skill_id: skill235, tool: "query_sensitive_data_incidents", requirement_level: "required" },
  { skill_id: skill235, tool: "triage_sensitive_data_incident", requirement_level: "required" },
  { skill_id: skill235, tool: "contain_sensitive_data_incident", requirement_level: "required" },
  { skill_id: skill235, tool: "resolve_sensitive_data_incident", requirement_level: "required" },
  { skill_id: skill235, tool: "remediate_iam_access_policy", requirement_level: "required" },
  { skill_id: skill235, tool: "query_iam_access_policies", requirement_level: "optional" },
  { skill_id: skill235, tool: "query_data_risk_scores", requirement_level: "optional" },
  { skill_id: skill235, tool: "notify_person", requirement_level: "required" },
];

// Dedup against existing skill_tools by (skill_id, tool_id).
const allSkillIds = [skill233, skill234, skill235];
const existingST = await get(`/skill_tools?skill_id=in.(${allSkillIds.join(",")})&select=skill_id,tool_id`);
const existingPairs = new Set(existingST.map(r => `${r.skill_id}:${r.tool_id}`));

const stRows = skillToolDefs
  .map(d => ({ skill_id: d.skill_id, tool_id: toolId(d.tool), requirement_level: d.requirement_level }))
  .filter(r => !existingPairs.has(`${r.skill_id}:${r.tool_id}`));

if (stRows.length > 0) {
  console.log(`  inserting ${stRows.length} skill_tools rows (${skillToolDefs.length - stRows.length} already present)`);
  // chunk to stay well under request-size limits
  const CHUNK = 50;
  for (let i = 0; i < stRows.length; i += CHUNK) {
    await post("/skill_tools", stRows.slice(i, i + CHUNK));
  }
} else {
  console.log("  all skill_tools rows already present");
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------
const verifySkills = await get("/skills?domain_module_id=in.(233,234,235)&skill_type=eq.system&select=id,skill_name,domain_module_id&order=domain_module_id.asc");
console.log("\nSystem skills per module:");
for (const s of verifySkills) console.log(`  ${s.domain_module_id} -> skill ${s.id} ${s.skill_name}`);

for (const sid of allSkillIds) {
  const rows = await get(`/skill_tools?skill_id=eq.${sid}&select=requirement_level`);
  const req = rows.filter(r => r.requirement_level === "required").length;
  const opt = rows.filter(r => r.requirement_level === "optional").length;
  console.log(`  skill ${sid}: ${rows.length} skill_tools (${req} required, ${opt} optional)`);
}

const orphanCheck = await get("/skills?domain_id=eq.140&skill_type=eq.system&domain_module_id=is.null&select=id");
console.log(`\nF1 orphan check (should be 0): ${orphanCheck.length}`);

console.log("\nDone.");
