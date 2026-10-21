#!/usr/bin/env bun
// SMP (domain id=85) Phase F: skill-layer cleanup
//   - Create 10 new tools (1 query + 8 mutate + 1 cross-domain query for CLM)
//   - Create 2 module-level system skills (one per domain_module)
//   - Link skill_tools per system-skill derivation procedure
//   - DELETE legacy domain-level smp-system (skill id=106) and its skill_tools
//
// Idempotent on tools / skills / skill_tools (natural keys). The DELETE of legacy
// skill id=106 is guarded: only runs if both new module-level skills exist.

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => {
    const out: Row = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

const SMP_DOMAIN_ID = 85;
const MOD_DISCOVERY_OPT = 30;
const MOD_RENEWAL = 31;
const LEGACY_SKILL_ID = 106;

// data_object ids
const DO_SAAS_APPS = 61;
const DO_SAAS_SUBS = 62;
const DO_SAAS_ASSIGN = 63;
const DO_SHADOW = 65;
const DO_LEGAL_CONTRACTS = 66;

// ============================================================
// 1. TOOLS to create (10 new)
// ============================================================
const newTools = [
  // Cross-domain query for the renewal module
  { tool_name: "query_saas_subscriptions", operation_kind: "query", data_object_id: DO_SAAS_SUBS, description: "Read the buyer-side SaaS contract ledger: terms, renewal calendar, quantity, tier." },
  { tool_name: "query_legal_contracts", operation_kind: "query", data_object_id: DO_LEGAL_CONTRACTS, description: "Read CLM-mastered contract records: clauses, obligations, signatures." },
  // Workflow-gate mutates on saas_applications
  { tool_name: "sanction_application", operation_kind: "mutate", data_object_id: DO_SAAS_APPS, description: "Promote a discovered SaaS app to sanctioned status. Activates IGA provisioning, FINOPS tracking, ITAM registration." },
  { tool_name: "deprovision_application", operation_kind: "mutate", data_object_id: DO_SAAS_APPS, description: "Remove a sanctioned SaaS app tenant-wide. Cascades to ITSM ticket closure, IGA revocation, FINOPS spend termination." },
  // Workflow-gate mutate on saas_app_assignments
  { tool_name: "reclaim_assignment", operation_kind: "mutate", data_object_id: DO_SAAS_ASSIGN, description: "Return an idle license to the pool. Notifies the user and revokes access via IGA." },
  // Workflow-gate mutates on shadow_it_apps
  { tool_name: "promote_shadow_app", operation_kind: "mutate", data_object_id: DO_SHADOW, description: "Promote a shadow IT app to the sanctioned catalog; creates a corresponding saas_applications record." },
  { tool_name: "block_shadow_app", operation_kind: "mutate", data_object_id: DO_SHADOW, description: "Block a shadow IT app at the network and SSO layer; notify affected users." },
  // Workflow-gate mutates on saas_subscriptions
  { tool_name: "initiate_renewal", operation_kind: "mutate", data_object_id: DO_SAAS_SUBS, description: "Move a saas_subscription into the renewing state; surface to procurement and legal." },
  { tool_name: "approve_renewal", operation_kind: "mutate", data_object_id: DO_SAAS_SUBS, description: "Execute renewal of a saas_subscription; start the new active term." },
  { tool_name: "cancel_subscription", operation_kind: "mutate", data_object_id: DO_SAAS_SUBS, description: "Terminate a saas_subscription. Triggers deprovisioning across IGA, FINOPS, ITAM." },
];

// ============================================================
// 2. SKILLS to create (2 module-level system skills)
// ============================================================
const newSkills = [
  { skill_name: "smp-discovery-opt-system", skill_type: "system", domain_id: SMP_DOMAIN_ID, domain_module_id: MOD_DISCOVERY_OPT, description: "System skill for the SMP Discovery and Optimization module. Surfaces SaaS app inventory, shadow IT, usage telemetry, and license rightsizing; gates sanction, deprovisioning, reclamation, and shadow-app promotion / block decisions." },
  { skill_name: "smp-renewal-system", skill_type: "system", domain_id: SMP_DOMAIN_ID, domain_module_id: MOD_RENEWAL, description: "System skill for the SMP Renewal and Vendor Management module. Surfaces upcoming renewals, vendor positions, and contract terms; gates renewal initiation, execution, and cancellation." },
];

// ============================================================
// 3. SKILL_TOOLS links
// ============================================================
// Each entry: skill_name -> tool_name -> requirement_level
const skillToolLinks: Array<{ skill: string; tool: string; requirement_level: string; notes?: string }> = [
  // SMP-DISCOVERY-OPT (10 tools)
  { skill: "smp-discovery-opt-system", tool: "query_saas_applications",   requirement_level: "required" },
  { skill: "smp-discovery-opt-system", tool: "query_saas_app_assignments", requirement_level: "required" },
  { skill: "smp-discovery-opt-system", tool: "query_saas_usage_metrics",   requirement_level: "required" },
  { skill: "smp-discovery-opt-system", tool: "query_shadow_it_apps",       requirement_level: "required" },
  { skill: "smp-discovery-opt-system", tool: "sanction_application",       requirement_level: "required" },
  { skill: "smp-discovery-opt-system", tool: "deprovision_application",    requirement_level: "required" },
  { skill: "smp-discovery-opt-system", tool: "reclaim_assignment",         requirement_level: "required" },
  { skill: "smp-discovery-opt-system", tool: "promote_shadow_app",         requirement_level: "required" },
  { skill: "smp-discovery-opt-system", tool: "block_shadow_app",           requirement_level: "required" },
  { skill: "smp-discovery-opt-system", tool: "send_email",                 requirement_level: "required", notes: "Reclamation, sanctioning, and shadow-IT block decisions drive user-facing notifications." },

  // SMP-RENEWAL (9 tools)
  { skill: "smp-renewal-system", tool: "query_saas_subscriptions", requirement_level: "required" },
  { skill: "smp-renewal-system", tool: "query_saas_applications",  requirement_level: "required", notes: "Renewal pipeline surfaces upcoming renewals grouped by app." },
  { skill: "smp-renewal-system", tool: "query_legal_contracts",    requirement_level: "required", notes: "Reads CLM-mastered contract clauses and obligations to surface in renewal context." },
  { skill: "smp-renewal-system", tool: "query_purchase_orders",    requirement_level: "optional", notes: "Reads S2P purchase orders to correlate spend history at renewal time. Optional because not every deployment has S2P loaded." },
  { skill: "smp-renewal-system", tool: "initiate_renewal",         requirement_level: "required" },
  { skill: "smp-renewal-system", tool: "approve_renewal",          requirement_level: "required" },
  { skill: "smp-renewal-system", tool: "cancel_subscription",      requirement_level: "required" },
  { skill: "smp-renewal-system", tool: "send_email",               requirement_level: "required", notes: "Renewal-window alerts to subscription owners drive the workflow." },
  { skill: "smp-renewal-system", tool: "sign_document",            requirement_level: "required", notes: "Renewal contract execution requires e-signature." },
];

// ============================================================
// LOADER
// ============================================================
async function main() {
  console.log("=== SMP Phase F loader ===");

  // --- 1. Tools ---
  console.log("\n[1/5] tools");
  const toolNames = newTools.map(t => t.tool_name);
  const existingTools = await get(`/tools?tool_name=in.("${toolNames.join('","')}")&select=id,tool_name`);
  const existingToolNames = new Set(existingTools.map(r => r.tool_name as string));
  const toolsToInsert = newTools.filter(t => !existingToolNames.has(t.tool_name));
  if (toolsToInsert.length) await insert("/tools", toolsToInsert);
  console.log(`  inserted ${toolsToInsert.length}, ${existingTools.length} pre-existing`);

  // --- 2. Skills ---
  console.log("\n[2/5] skills");
  const skillNames = newSkills.map(s => s.skill_name);
  const existingSkills = await get(`/skills?skill_name=in.("${skillNames.join('","')}")&select=id,skill_name`);
  const existingSkillNames = new Set(existingSkills.map(r => r.skill_name as string));
  const skillsToInsert = newSkills.filter(s => !existingSkillNames.has(s.skill_name));
  if (skillsToInsert.length) await insert("/skills", skillsToInsert);
  console.log(`  inserted ${skillsToInsert.length}, ${existingSkills.length} pre-existing`);

  // Resolve all skill + tool ids
  const allSkills = await get(`/skills?skill_name=in.("${skillNames.join('","')}")&select=id,skill_name`);
  const skillIdByName = new Map<string, number>();
  for (const r of allSkills) skillIdByName.set(r.skill_name as string, r.id as number);

  const allToolNames = Array.from(new Set(skillToolLinks.map(l => l.tool)));
  const allToolsRows = await get(`/tools?tool_name=in.("${allToolNames.join('","')}")&select=id,tool_name`);
  const toolIdByName = new Map<string, number>();
  for (const r of allToolsRows) toolIdByName.set(r.tool_name as string, r.id as number);

  // --- 3. skill_tools ---
  console.log("\n[3/5] skill_tools");
  const desiredLinks: Row[] = skillToolLinks.map(l => ({
    skill_id: skillIdByName.get(l.skill)!,
    tool_id: toolIdByName.get(l.tool)!,
    requirement_level: l.requirement_level,
    notes: l.notes ?? "",
  }));
  const skillIds = Array.from(skillIdByName.values());
  const existingLinks = await get(`/skill_tools?skill_id=in.(${skillIds.join(",")})&select=skill_id,tool_id`);
  const existingLinkKey = new Set(existingLinks.map(r => `${r.skill_id}|${r.tool_id}`));
  const newLinks = desiredLinks.filter(r => !existingLinkKey.has(`${r.skill_id}|${r.tool_id}`));
  if (newLinks.length) await insert("/skill_tools", newLinks);
  console.log(`  inserted ${newLinks.length}, ${existingLinks.length} pre-existing`);

  // --- 4. Retire legacy smp-system (skill id 106) ---
  console.log("\n[4/5] retire legacy smp-system (skill 106)");
  if (skillIdByName.get("smp-discovery-opt-system") && skillIdByName.get("smp-renewal-system")) {
    // First delete the legacy skill_tools rows
    const legacyLinks = await get(`/skill_tools?skill_id=eq.${LEGACY_SKILL_ID}&select=id`);
    if (legacyLinks.length) {
      await call({ method: "DELETE", path: `/skill_tools?skill_id=eq.${LEGACY_SKILL_ID}` });
      console.log(`  deleted ${legacyLinks.length} legacy skill_tools rows`);
    } else {
      console.log(`  no legacy skill_tools rows to delete`);
    }
    // Then delete the skill row
    const legacySkill = await get(`/skills?id=eq.${LEGACY_SKILL_ID}&select=id,skill_name`);
    if (legacySkill.length) {
      await call({ method: "DELETE", path: `/skills?id=eq.${LEGACY_SKILL_ID}` });
      console.log(`  deleted legacy skill ${LEGACY_SKILL_ID} (${legacySkill[0].skill_name})`);
    } else {
      console.log(`  legacy skill ${LEGACY_SKILL_ID} already gone`);
    }
  } else {
    console.log(`  SKIPPED: new module-level skills not both present; refusing to delete legacy.`);
  }

  // --- 5. Coverage rollup ---
  console.log("\n[5/5] Semantius coverage rollup");
  for (const skillName of skillNames) {
    const skillId = skillIdByName.get(skillName)!;
    const rows = await get(`/skill_tools?skill_id=eq.${skillId}&requirement_level=eq.required&select=tools(tool_name,operation_kind)`);
    const total = rows.length;
    const covered = rows.filter(r => {
      const op = (r.tools as Row).operation_kind as string;
      return op === "query" || op === "mutate";
    }).length;
    const pct = total === 0 ? 0 : Math.round((covered / total) * 100);
    console.log(`  ${skillName}: ${covered}/${total} required tools Semantius-covered (${pct}%)`);
  }

  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/skills");
  console.log("  https://tests.semantius.app/domain_map/tools");
  console.log("  https://tests.semantius.app/domain_map/skill_tools");
}

await main();
