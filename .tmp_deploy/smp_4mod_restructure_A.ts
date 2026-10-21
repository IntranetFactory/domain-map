#!/usr/bin/env bun
// SMP 4-module restructure — Loader A (module restructure only, no new entities).
//
// Splits the current 2-module SMP shape:
//   SMP-DISCOVERY-OPT (id=30)  → SMP-DISCOVERY (renames id=30)
//                              + SMP-OPTIMIZATION (NEW)
//   SMP-RENEWAL (id=31)        → SMP-RENEWAL-VENDOR (renames id=31)
//   + SMP-AUTOMATION (NEW)
//
// Current entity allocation after restructure:
//   SMP-DISCOVERY:        saas_applications, shadow_it_apps  (stay in module 30)
//   SMP-OPTIMIZATION:     smp_license_seat_assignments, saas_usage_metrics  (MOVE from 30)
//   SMP-RENEWAL-VENDOR:   saas_subscriptions  (stays in 31)
//   SMP-AUTOMATION:       (empty until Loader B+C lands)
//
// Loader B+C (next pass) loads the 12 new Bucket 3 entities into the new module shape.
//
// Run:    bun run .tmp_deploy/smp_4mod_restructure_A.ts --dry-run
// Apply:  bun run .tmp_deploy/smp_4mod_restructure_A.ts --apply

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

const APPLY = process.argv.includes("--apply");
const DRY_RUN = !APPLY;

const SMP_DOMAIN_ID = 85;

// Existing module ids — modules being RENAMED in place
const MOD_DISCOVERY_OLD_OPT = 30;  // SMP-DISCOVERY-OPT → SMP-DISCOVERY
const MOD_RENEWAL_OLD = 31;        // SMP-RENEWAL → SMP-RENEWAL-VENDOR

// data_objects being moved to new modules
const DO_SMP_LICENSE_SEAT_ASSIGNMENTS = 63;
const DO_SAAS_USAGE_METRICS = 64;

// Existing roles
const ROLE_IT_SAAS_ADMIN = 10118;
const ROLE_PROC_RENEWAL_OWNER = 10119;
const ROLE_ITAM_SMP_ADMIN = 10120;

// Existing system skills being renamed (kept at same id, anchored module stays the same after rename)
const SKILL_OLD_DISCOVERY_OPT = 135;  // renamed → smp_discovery_agent, anchored to MOD_DISCOVERY (30)
const SKILL_OLD_RENEWAL = 136;        // renamed → smp_renewal_vendor_agent, anchored to MOD_RENEWAL_OLD (31)

// Tools to re-wire (those that target data_objects moving to OPTIMIZATION)
const TOOLS_TO_MOVE_TO_OPTIMIZATION: number[] = [
  522, // query_smp_license_seat_assignments (data_object 63)
  697, // query_saas_usage_metrics (data_object 64)
  874, // reclaim_seat_assignment (data_object 63)
];

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud/postgrestRequest"], {
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

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function patch(path: string, body: Row, label: string): Promise<void> {
  if (DRY_RUN) {
    console.log(`  [DRY] ${label}  PATCH ${path}  ${JSON.stringify(body)}`);
    return;
  }
  await call({ method: "PATCH", path, body });
  console.log(`  ${label}  PATCH ${path}`);
}

async function insertRows(path: string, rows: Row[], label: string): Promise<Row[]> {
  if (rows.length === 0) {
    console.log(`  ${label}  skip (0 rows)`);
    return [];
  }
  if (DRY_RUN) {
    console.log(`  [DRY] ${label}  POST ${path}  ${rows.length} rows`);
    for (const r of rows) console.log(`        ${JSON.stringify(r)}`);
    return [];
  }
  const result = await call({ method: "POST", path, body: rows });
  console.log(`  ${label}  POST ${path}  ${rows.length} rows`);
  return result;
}

// ============================================================
// PHASE A1 — Rename existing modules
// ============================================================

async function phaseA1(): Promise<void> {
  console.log("\n=== Phase A1: rename existing SMP modules ===");

  const m30 = await get(`/domain_modules?id=eq.${MOD_DISCOVERY_OLD_OPT}&select=domain_module_code`);
  if (m30[0]?.domain_module_code !== "SMP-DISCOVERY") {
    await patch(`/domain_modules?id=eq.${MOD_DISCOVERY_OLD_OPT}`, {
      domain_module_code: "SMP-DISCOVERY",
      domain_module_name: "SMP Discovery and Catalog",
      description: "Discovery of sanctioned and shadow SaaS, app inventory, ownership, integrations, lifecycle staging, catalog publication, and operational signal/alerts. The discovery substrate of an SMP deployment.",
    }, "SMP-DISCOVERY-OPT → SMP-DISCOVERY");
  } else {
    console.log("  skip: module 30 already renamed");
  }

  const m31 = await get(`/domain_modules?id=eq.${MOD_RENEWAL_OLD}&select=domain_module_code`);
  if (m31[0]?.domain_module_code !== "SMP-RENEWAL-VENDOR") {
    await patch(`/domain_modules?id=eq.${MOD_RENEWAL_OLD}`, {
      domain_module_code: "SMP-RENEWAL-VENDOR",
      domain_module_name: "SMP Renewal and Vendor Management",
      description: "Renewal pipeline tracking, vendor relationship management, contract coordination with procurement and legal, spend allocation, and per-SaaS vendor-risk attestation. The commercial layer of an SMP deployment.",
    }, "SMP-RENEWAL → SMP-RENEWAL-VENDOR");
  } else {
    console.log("  skip: module 31 already renamed");
  }
}

// ============================================================
// PHASE A2 — Create new modules
// ============================================================

async function phaseA2(): Promise<{ optimizationId: number; automationId: number }> {
  console.log("\n=== Phase A2: create new SMP modules ===");

  let optimizationId: number;
  const existingOpt = await get(`/domain_modules?domain_module_code=eq.SMP-OPTIMIZATION&select=id`);
  if (existingOpt.length > 0) {
    optimizationId = Number(existingOpt[0]!.id);
    console.log(`  skip: SMP-OPTIMIZATION already exists (id=${optimizationId})`);
  } else {
    await insertRows("/domain_modules", [{
      domain_module_code: "SMP-OPTIMIZATION",
      domain_module_name: "SMP License Optimization",
      module_kind: "full",
      domain_id: SMP_DOMAIN_ID,
      description: "Usage analytics, license rightsizing, reclamation actions, per-app cost benchmarks, and optimization recommendations. The cost-and-utilization substrate of an SMP deployment.",
    }], "create SMP-OPTIMIZATION");
    if (!DRY_RUN) {
      const fresh = await get(`/domain_modules?domain_module_code=eq.SMP-OPTIMIZATION&select=id`);
      optimizationId = Number(fresh[0]!.id);
      console.log(`  SMP-OPTIMIZATION id=${optimizationId}`);
    } else {
      optimizationId = -1;
    }
  }

  let automationId: number;
  const existingAuto = await get(`/domain_modules?domain_module_code=eq.SMP-AUTOMATION&select=id`);
  if (existingAuto.length > 0) {
    automationId = Number(existingAuto[0]!.id);
    console.log(`  skip: SMP-AUTOMATION already exists (id=${automationId})`);
  } else {
    await insertRows("/domain_modules", [{
      domain_module_code: "SMP-AUTOMATION",
      domain_module_name: "SMP Automation and Self-Service Requests",
      module_kind: "full",
      domain_id: SMP_DOMAIN_ID,
      description: "Declarative automation workflows, workflow run history, and employee-facing self-service app-access requests. The automation surface of an SMP deployment (BetterCloud / Torii flagship shape).",
    }], "create SMP-AUTOMATION");
    if (!DRY_RUN) {
      const fresh = await get(`/domain_modules?domain_module_code=eq.SMP-AUTOMATION&select=id`);
      automationId = Number(fresh[0]!.id);
      console.log(`  SMP-AUTOMATION id=${automationId}`);
    } else {
      automationId = -2;
    }
  }

  return { optimizationId, automationId };
}

// ============================================================
// PHASE A3 — Move DMDOs for entities going to OPTIMIZATION
// ============================================================

async function phaseA3(optimizationId: number): Promise<void> {
  console.log("\n=== Phase A3: move DMDOs to SMP-OPTIMIZATION ===");

  const moves: Array<{ dataObjectId: number; label: string }> = [
    { dataObjectId: DO_SMP_LICENSE_SEAT_ASSIGNMENTS, label: "smp_license_seat_assignments" },
    { dataObjectId: DO_SAAS_USAGE_METRICS,           label: "saas_usage_metrics" },
  ];

  for (const m of moves) {
    const existing = await get(`/domain_module_data_objects?data_object_id=eq.${m.dataObjectId}&domain_module_id=eq.${MOD_DISCOVERY_OLD_OPT}&select=id`);
    if (existing.length === 0) {
      console.log(`  skip ${m.label}: no DMDO at module 30 (already moved or never present)`);
      continue;
    }
    await patch(`/domain_module_data_objects?id=eq.${existing[0]!.id}`,
      { domain_module_id: optimizationId },
      `DMDO ${m.label} → SMP-OPTIMIZATION`);
  }
}

// ============================================================
// PHASE A4 — Re-anchor lifecycle_states for OPTIMIZATION masters
// ============================================================

async function phaseA4(optimizationId: number): Promise<void> {
  console.log("\n=== Phase A4: re-anchor lifecycle_states ===");

  // smp_license_seat_assignments (63) — 4 states currently anchored to module 30
  const states = await get(`/data_object_lifecycle_states?data_object_id=eq.${DO_SMP_LICENSE_SEAT_ASSIGNMENTS}&domain_module_id=eq.${MOD_DISCOVERY_OLD_OPT}&select=id,state_name`);
  for (const s of states) {
    await patch(`/data_object_lifecycle_states?id=eq.${s.id}`,
      { domain_module_id: optimizationId },
      `lifecycle_state smp_license_seat_assignments/${s.state_name} → SMP-OPTIMIZATION`);
  }

  // Also align permission_verb_override on the reclaim state with the renamed tool name.
  const reclaim = await get(`/data_object_lifecycle_states?data_object_id=eq.${DO_SMP_LICENSE_SEAT_ASSIGNMENTS}&state_name=eq.reclaimed&select=id,permission_verb_override`);
  if (reclaim.length > 0 && reclaim[0]!.permission_verb_override !== "reclaim_seat_assignment") {
    await patch(`/data_object_lifecycle_states?id=eq.${reclaim[0]!.id}`,
      { permission_verb_override: "reclaim_seat_assignment" },
      "lifecycle_state reclaim verb → reclaim_seat_assignment");
  }
}

// ============================================================
// PHASE A5 — Re-anchor trigger_events on OPTIMIZATION masters
// ============================================================

async function phaseA5(optimizationId: number): Promise<void> {
  console.log("\n=== Phase A5: re-anchor trigger_events ===");

  // trigger_events on data_objects 63 + 64 (now OPTIMIZATION) currently anchored to module 30
  const events = await get(`/trigger_events?data_object_id=in.(${DO_SMP_LICENSE_SEAT_ASSIGNMENTS},${DO_SAAS_USAGE_METRICS})&domain_module_id=eq.${MOD_DISCOVERY_OLD_OPT}&select=id,event_name`);
  for (const e of events) {
    await patch(`/trigger_events?id=eq.${e.id}`,
      { domain_module_id: optimizationId },
      `trigger_event ${e.event_name} → SMP-OPTIMIZATION`);
  }
}

// ============================================================
// PHASE A6 — Rename permissions + add new baselines
// ============================================================

async function phaseA6(optimizationId: number, automationId: number): Promise<void> {
  console.log("\n=== Phase A6: rename permissions + add new baselines ===");

  // 6.1 — Rename existing permissions.
  // smp-discovery-opt:* split:
  //   - reclaim_assignment   → smp-optimization:reclaim_seat_assignment, anchored to OPTIMIZATION
  //   - everything else      → smp-discovery:* (anchored stays at module 30)
  // smp-renewal:* → smp-renewal-vendor:* (anchored stays at module 31)
  const renames: Array<{ oldName: string; newName: string; newModuleId?: number }> = [
    { oldName: "smp-discovery-opt:read",                    newName: "smp-discovery:read" },
    { oldName: "smp-discovery-opt:manage",                  newName: "smp-discovery:manage" },
    { oldName: "smp-discovery-opt:admin",                   newName: "smp-discovery:admin" },
    { oldName: "smp-discovery-opt:sanction_application",    newName: "smp-discovery:sanction_application" },
    { oldName: "smp-discovery-opt:deprecate_application",   newName: "smp-discovery:deprecate_application" },
    { oldName: "smp-discovery-opt:deprovision_application", newName: "smp-discovery:deprovision_application" },
    { oldName: "smp-discovery-opt:reclaim_assignment",      newName: "smp-optimization:reclaim_seat_assignment", newModuleId: optimizationId },
    { oldName: "smp-discovery-opt:promote_shadow_app",      newName: "smp-discovery:promote_shadow_app" },
    { oldName: "smp-discovery-opt:block_shadow_app",        newName: "smp-discovery:block_shadow_app" },
    { oldName: "smp-renewal:read",                          newName: "smp-renewal-vendor:read" },
    { oldName: "smp-renewal:manage",                        newName: "smp-renewal-vendor:manage" },
    { oldName: "smp-renewal:admin",                         newName: "smp-renewal-vendor:admin" },
    { oldName: "smp-renewal:initiate_renewal",              newName: "smp-renewal-vendor:initiate_renewal" },
    { oldName: "smp-renewal:approve_renewal",               newName: "smp-renewal-vendor:approve_renewal" },
    { oldName: "smp-renewal:cancel_subscription",           newName: "smp-renewal-vendor:cancel_subscription" },
  ];
  for (const r of renames) {
    const existing = await get(`/permissions?permission_name=eq.${encodeURIComponent(r.oldName)}&select=id`);
    if (existing.length === 0) {
      // Maybe already renamed.
      const renamed = await get(`/permissions?permission_name=eq.${encodeURIComponent(r.newName)}&select=id`);
      if (renamed.length > 0) {
        console.log(`  skip ${r.oldName}: already renamed to ${r.newName}`);
        continue;
      }
      console.log(`  warn ${r.oldName}: not found and no renamed equivalent`);
      continue;
    }
    const body: Row = { permission_name: r.newName };
    if (r.newModuleId !== undefined) body.domain_module_id = r.newModuleId;
    await patch(`/permissions?id=eq.${existing[0]!.id}`, body, `permission ${r.oldName} → ${r.newName}`);
  }

  // 6.2 — Add 3 baselines for SMP-OPTIMIZATION + 3 for SMP-AUTOMATION.
  const newBaselines: Row[] = [
    { permission_name: "smp-optimization:read",   tier: "baseline-read",   domain_module_id: optimizationId, description: "Baseline read access to SMP optimization (utilization, seat assignments, recommendations, benchmarks)." },
    { permission_name: "smp-optimization:manage", tier: "baseline-manage", domain_module_id: optimizationId, description: "Manage SMP optimization records (create/update/delete non-gated)." },
    { permission_name: "smp-optimization:admin",  tier: "baseline-admin",  domain_module_id: optimizationId, description: "Full admin access to SMP optimization including all workflow gates." },
    { permission_name: "smp-automation:read",     tier: "baseline-read",   domain_module_id: automationId,   description: "Baseline read access to SMP automation workflows, runs, requests, and the app catalog." },
    { permission_name: "smp-automation:manage",   tier: "baseline-manage", domain_module_id: automationId,   description: "Manage SMP automation records (create/update/delete non-gated)." },
    { permission_name: "smp-automation:admin",    tier: "baseline-admin",  domain_module_id: automationId,   description: "Full admin access to SMP automation including all workflow gates." },
  ];
  const baselinesToInsert: Row[] = [];
  for (const b of newBaselines) {
    const exists = await get(`/permissions?permission_name=eq.${encodeURIComponent(b.permission_name as string)}&select=id`);
    if (exists.length === 0) {
      baselinesToInsert.push(b);
    }
  }
  await insertRows("/permissions", baselinesToInsert, `${baselinesToInsert.length} new baseline permissions`);
}

// ============================================================
// PHASE A7 — Rename + retire system skills, create new
// ============================================================

async function phaseA7(optimizationId: number, automationId: number): Promise<{ skillOptId: number; skillAutoId: number }> {
  console.log("\n=== Phase A7: rename existing system skills + create 2 new ===");

  // Rename skill 135 → smp_discovery_agent (stays at module 30 / SMP-DISCOVERY)
  const s135 = await get(`/skills?id=eq.${SKILL_OLD_DISCOVERY_OPT}&select=skill_name`);
  if (s135.length > 0 && s135[0]!.skill_name !== "smp_discovery_agent") {
    await patch(`/skills?id=eq.${SKILL_OLD_DISCOVERY_OPT}`,
      { skill_name: "smp_discovery_agent" },
      "skill 135 → smp_discovery_agent");
  } else {
    console.log("  skip: skill 135 already renamed");
  }

  // Rename skill 136 → smp_renewal_vendor_agent (stays at module 31 / SMP-RENEWAL-VENDOR)
  const s136 = await get(`/skills?id=eq.${SKILL_OLD_RENEWAL}&select=skill_name`);
  if (s136.length > 0 && s136[0]!.skill_name !== "smp_renewal_vendor_agent") {
    await patch(`/skills?id=eq.${SKILL_OLD_RENEWAL}`,
      { skill_name: "smp_renewal_vendor_agent" },
      "skill 136 → smp_renewal_vendor_agent");
  } else {
    console.log("  skip: skill 136 already renamed");
  }

  // Create smp_optimization_agent
  let skillOptId: number;
  const optSkill = await get(`/skills?skill_name=eq.smp_optimization_agent&select=id`);
  if (optSkill.length > 0) {
    skillOptId = Number(optSkill[0]!.id);
    console.log(`  skip: smp_optimization_agent already exists (id=${skillOptId})`);
  } else {
    await insertRows("/skills", [{
      skill_name: "smp_optimization_agent",
      skill_type: "system",
      domain_module_id: optimizationId,
      domain_id: SMP_DOMAIN_ID,
      description: "System agent for SMP-OPTIMIZATION: utilization analysis, idle-license reclamation, optimization recommendations, app benchmarking.",
    }], "create smp_optimization_agent");
    if (!DRY_RUN) {
      const fresh = await get(`/skills?skill_name=eq.smp_optimization_agent&select=id`);
      skillOptId = Number(fresh[0]!.id);
    } else {
      skillOptId = -3;
    }
  }

  // Create smp_automation_agent
  let skillAutoId: number;
  const autoSkill = await get(`/skills?skill_name=eq.smp_automation_agent&select=id`);
  if (autoSkill.length > 0) {
    skillAutoId = Number(autoSkill[0]!.id);
    console.log(`  skip: smp_automation_agent already exists (id=${skillAutoId})`);
  } else {
    await insertRows("/skills", [{
      skill_name: "smp_automation_agent",
      skill_type: "system",
      domain_module_id: automationId,
      domain_id: SMP_DOMAIN_ID,
      description: "System agent for SMP-AUTOMATION: automation workflow execution, employee-facing app-request fulfillment routing through approval and IGA provisioning.",
    }], "create smp_automation_agent");
    if (!DRY_RUN) {
      const fresh = await get(`/skills?skill_name=eq.smp_automation_agent&select=id`);
      skillAutoId = Number(fresh[0]!.id);
    } else {
      skillAutoId = -4;
    }
  }

  return { skillOptId, skillAutoId };
}

// ============================================================
// PHASE A8 — Re-wire skill_tools for OPTIMIZATION tools
// ============================================================

async function phaseA8(skillOptId: number): Promise<void> {
  console.log("\n=== Phase A8: re-wire skill_tools (move OPTIMIZATION tools from skill 135 to new skill) ===");

  for (const toolId of TOOLS_TO_MOVE_TO_OPTIMIZATION) {
    const existing = await get(`/skill_tools?skill_id=eq.${SKILL_OLD_DISCOVERY_OPT}&tool_id=eq.${toolId}&select=id,requirement_level`);
    if (existing.length === 0) {
      // Maybe already on the new skill.
      if (skillOptId > 0) {
        const onNew = await get(`/skill_tools?skill_id=eq.${skillOptId}&tool_id=eq.${toolId}&select=id`);
        if (onNew.length > 0) {
          console.log(`  skip tool ${toolId}: already linked to smp_optimization_agent`);
          continue;
        }
      }
      console.log(`  warn tool ${toolId}: not linked to skill 135 anymore`);
      continue;
    }
    await patch(`/skill_tools?id=eq.${existing[0]!.id}`,
      { skill_id: skillOptId },
      `skill_tool tool=${toolId} → smp_optimization_agent`);
  }
}

// ============================================================
// PHASE A9 — Extend role_modules + role_permissions
// ============================================================

async function phaseA9(optimizationId: number, automationId: number): Promise<void> {
  console.log("\n=== Phase A9: extend role_modules + role_permissions ===");

  // Resolve the new permission ids (post-rename and post-baseline-creation).
  const newPermNames = [
    "smp-optimization:read", "smp-optimization:admin",
    "smp-automation:read",   "smp-automation:admin",
  ];
  const permRows = await get(`/permissions?permission_name=in.(${newPermNames.map(encodeURIComponent).join(",")})&select=id,permission_name`);
  const permIdMap = new Map<string, number>();
  for (const r of permRows) permIdMap.set(r.permission_name as string, Number(r.id));

  // 9.1 — Role × new module assignments
  const roleModulesToInsert: Array<{ role_id: number; domain_module_id: number; interaction_level: "primary" | "secondary"; label: string }> = [
    { role_id: ROLE_IT_SAAS_ADMIN,        domain_module_id: optimizationId, interaction_level: "primary",   label: "IT-SAAS-ADMIN × SMP-OPTIMIZATION (primary)" },
    { role_id: ROLE_IT_SAAS_ADMIN,        domain_module_id: automationId,   interaction_level: "primary",   label: "IT-SAAS-ADMIN × SMP-AUTOMATION (primary)" },
    { role_id: ROLE_PROC_RENEWAL_OWNER,   domain_module_id: optimizationId, interaction_level: "secondary", label: "PROCUREMENT × SMP-OPTIMIZATION (secondary)" },
    { role_id: ROLE_ITAM_SMP_ADMIN,       domain_module_id: optimizationId, interaction_level: "primary",   label: "ITAM-SMP-ADMIN × SMP-OPTIMIZATION (primary)" },
    { role_id: ROLE_ITAM_SMP_ADMIN,       domain_module_id: automationId,   interaction_level: "primary",   label: "ITAM-SMP-ADMIN × SMP-AUTOMATION (primary)" },
  ];
  const rmToInsert: Row[] = [];
  for (const rm of roleModulesToInsert) {
    const moduleId = rm.domain_module_id;
    if (moduleId < 0) {
      rmToInsert.push({ role_id: rm.role_id, domain_module_id: moduleId, interaction_level: rm.interaction_level });
      continue;
    }
    const existing = await get(`/role_modules?role_id=eq.${rm.role_id}&domain_module_id=eq.${moduleId}&select=id`);
    if (existing.length === 0) {
      rmToInsert.push({ role_id: rm.role_id, domain_module_id: moduleId, interaction_level: rm.interaction_level });
    }
  }
  await insertRows("/role_modules", rmToInsert, `${rmToInsert.length} new role_modules`);

  // 9.2 — Role × new permission bundles
  // IT-SAAS-ADMIN: add optimization:admin + automation:admin
  // PROCUREMENT: add optimization:read
  // ITAM-SMP-ADMIN: add optimization:admin + automation:admin
  const rolePermsToInsert: Array<{ roleId: number; permName: string; label: string }> = [
    { roleId: ROLE_IT_SAAS_ADMIN,      permName: "smp-optimization:admin", label: "IT-SAAS-ADMIN × smp-optimization:admin" },
    { roleId: ROLE_IT_SAAS_ADMIN,      permName: "smp-automation:admin",   label: "IT-SAAS-ADMIN × smp-automation:admin" },
    { roleId: ROLE_PROC_RENEWAL_OWNER, permName: "smp-optimization:read",  label: "PROCUREMENT × smp-optimization:read" },
    { roleId: ROLE_ITAM_SMP_ADMIN,     permName: "smp-optimization:admin", label: "ITAM-SMP-ADMIN × smp-optimization:admin" },
    { roleId: ROLE_ITAM_SMP_ADMIN,     permName: "smp-automation:admin",   label: "ITAM-SMP-ADMIN × smp-automation:admin" },
  ];
  const rpToInsert: Row[] = [];
  for (const rp of rolePermsToInsert) {
    const permId = permIdMap.get(rp.permName);
    if (permId === undefined) {
      console.log(`  warn: permission ${rp.permName} not in id map (dry-run sentinel?)`);
      if (DRY_RUN) {
        rpToInsert.push({ role_id: rp.roleId, permission_id: -999 });
      }
      continue;
    }
    const existing = await get(`/role_permissions?role_id=eq.${rp.roleId}&permission_id=eq.${permId}&select=id`);
    if (existing.length === 0) {
      rpToInsert.push({ role_id: rp.roleId, permission_id: permId });
    }
  }
  await insertRows("/role_permissions", rpToInsert, `${rpToInsert.length} new role_permissions`);
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  console.log(DRY_RUN
    ? "MODE: dry-run (no writes). Re-run with --apply to execute."
    : "MODE: apply (writes will execute).");

  await phaseA1();
  const { optimizationId, automationId } = await phaseA2();
  await phaseA3(optimizationId);
  await phaseA4(optimizationId);
  await phaseA5(optimizationId);
  await phaseA6(optimizationId, automationId);
  const { skillOptId, skillAutoId } = await phaseA7(optimizationId, automationId);
  await phaseA8(skillOptId);
  await phaseA9(optimizationId, automationId);

  console.log("\n=== Summary ===");
  console.log("  Phase A1: renamed SMP-DISCOVERY-OPT → SMP-DISCOVERY, SMP-RENEWAL → SMP-RENEWAL-VENDOR.");
  console.log(`  Phase A2: created SMP-OPTIMIZATION (id=${optimizationId}), SMP-AUTOMATION (id=${automationId}).`);
  console.log("  Phase A3: moved 2 DMDOs (smp_license_seat_assignments, saas_usage_metrics) to SMP-OPTIMIZATION.");
  console.log("  Phase A4: re-anchored 4 lifecycle_states for smp_license_seat_assignments + aligned reclaim verb override.");
  console.log("  Phase A5: re-anchored OPTIMIZATION-master trigger_events.");
  console.log("  Phase A6: renamed 15 permissions, added 6 new baseline permissions.");
  console.log(`  Phase A7: renamed skills 135→smp_discovery_agent and 136→smp_renewal_vendor_agent; created smp_optimization_agent (id=${skillOptId}), smp_automation_agent (id=${skillAutoId}).`);
  console.log("  Phase A8: moved 3 skill_tools to smp_optimization_agent.");
  console.log("  Phase A9: 5 new role_modules + 5 new role_permissions.");
  console.log("\nUI:");
  console.log("  https://tests.semantius.app/domain_map/domain_modules");
  console.log("  https://tests.semantius.app/domain_map/permissions");
  console.log("  https://tests.semantius.app/domain_map/skills");
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
