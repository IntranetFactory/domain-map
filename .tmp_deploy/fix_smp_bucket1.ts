#!/usr/bin/env bun
// Fixes remaining SMP Bucket 1 items from audits/SMP.md (2026-05-28 audit).
//
// B1-S1 (M7 split)  already done in split_saas_app_assignments.ts.
// B1-S5 (TE 8)      already done in split_saas_app_assignments.ts.
// B1-B1 partial     already done in split_saas_app_assignments.ts (handoff 43).
//
// This loader does the rest:
//   Phase 1 — B1-S5 remaining: re-point 3 mis-pointed trigger_events
//             (TE 97, 110, 114). TE 127 deferred (cross-domain dependency).
//   Phase 2 — B1-S3 + B1-S4: backfill source_/target_domain_module_id on
//             outbound + inbound handoffs where the SMP-side resolves.
//   Phase 3 — B1-S8: re-model handoff 174 (SPEND-MGMT→SMP) — change payload
//             from card_transactions (213) to shadow_it_apps (65), set
//             target_module=30. Option (b) from the audit.
//   Phase 4 — B1-S7: F7 channel rule — re-point send_email link on both SMP
//             system skills to notify_person.
//   Phase 5 — B1-S6: materialize permissions (6 baseline + 9 workflow-gate).
//   Phase 6 — B1-S2: author 3 roles + role_modules + role_permissions.
//
// Run:    bun run .tmp_deploy/fix_smp_bucket1.ts --dry-run
// Apply:  bun run .tmp_deploy/fix_smp_bucket1.ts --apply

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

const APPLY = process.argv.includes("--apply");
const DRY_RUN = !APPLY;

// SMP ids
const SMP_DOMAIN_ID = 85;
const SMP_DISCOVERY_OPT_MODULE_ID = 30;
const SMP_RENEWAL_MODULE_ID = 31;

// data_objects
const PURCHASE_ORDERS_ID = 73;
const SAAS_USAGE_METRICS_ID = 64;
const SHADOW_IT_APPS_ID = 65;

// tools
const TOOL_SEND_EMAIL = 37;
const TOOL_NOTIFY_PERSON = 913;

// skills
const SKILL_SMP_DISCOVERY_OPT = 135;
const SKILL_SMP_RENEWAL = 136;

// business_functions
const BF_IT_OPERATIONS = 27;
const BF_PROCUREMENT = 19;
const BF_ITAM = 84;

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

async function del(path: string, label: string): Promise<void> {
  if (DRY_RUN) {
    console.log(`  [DRY] ${label}  DELETE ${path}`);
    return;
  }
  await call({ method: "DELETE", path });
  console.log(`  ${label}  DELETE ${path}`);
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
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  console.log(`  ${label}  POST ${path}  ${rows.length} rows`);
  return out;
}

// ============================================================
// PHASE 1 — B1-S5 remaining trigger_event re-points
// ============================================================

async function phase1(): Promise<void> {
  console.log("\n=== Phase 1: re-point 3 mis-pointed trigger_events (B1-S5) ===");

  const repoints: Array<{ teId: number; eventName: string; newDataObjectId: number; rationale: string }> = [
    { teId: 97,  eventName: "po.saas_subscription_created",   newDataObjectId: PURCHASE_ORDERS_ID,     rationale: "Publisher is S2P's purchase_orders, not the SMP payload subscriptions." },
    { teId: 110, eventName: "seat_demand.exceeded",           newDataObjectId: SAAS_USAGE_METRICS_ID,  rationale: "Event fires on SMP's usage metrics (idle/overage signal), not on S2P purchase_requisitions." },
    { teId: 114, eventName: "shadow_app.requires_sanctioning", newDataObjectId: SHADOW_IT_APPS_ID,     rationale: "Event name names shadow_app; publisher is SMP's shadow_it_apps." },
  ];

  for (const r of repoints) {
    const rows = await get(`/trigger_events?id=eq.${r.teId}&select=id,event_name,data_object_id`);
    if (rows.length === 0) {
      console.log(`  skip TE ${r.teId}: not found`);
      continue;
    }
    const current = rows[0]!;
    if (current.event_name !== r.eventName) {
      console.log(`  warn TE ${r.teId}: name "${current.event_name}" != expected "${r.eventName}" — skipping`);
      continue;
    }
    if (Number(current.data_object_id) === r.newDataObjectId) {
      console.log(`  skip TE ${r.teId}: already re-pointed`);
      continue;
    }
    await patch(`/trigger_events?id=eq.${r.teId}`,
      { data_object_id: r.newDataObjectId },
      `TE ${r.teId} (${r.eventName})`);
  }
}

// ============================================================
// PHASE 2 — B1-S3 + B1-S4 handoff module-FK backfill
// ============================================================

async function phase2(): Promise<void> {
  console.log("\n=== Phase 2: backfill handoff source_/target_domain_module_id (B1-S3, B1-S4) ===");

  // Outbound from SMP — every handoff whose trigger_event data_object is SMP-mastered.
  // After Phase 1's re-points, all SMP-published events fire on:
  //   - data_object 61 (saas_applications)        → SMP-DISCOVERY-OPT (30)
  //   - data_object 64 (saas_usage_metrics)       → SMP-DISCOVERY-OPT (30)
  //   - data_object 65 (shadow_it_apps)            → SMP-DISCOVERY-OPT (30)
  //   - data_object 63 (smp_license_seat_assignments) → SMP-DISCOVERY-OPT (30) [no handoffs currently]
  //   - data_object 62 (saas_subscriptions)       → SMP-RENEWAL (31)
  //   - data_object 66 (legal_contracts)          → SMP-RENEWAL (31) [handoff 44 already wired]
  const outboundBackfills: Array<{ handoffId: number; sourceModuleId: number; reason: string }> = [
    { handoffId: 39,  sourceModuleId: SMP_DISCOVERY_OPT_MODULE_ID, reason: "TE 114 (re-pointed to shadow_it_apps) — SMP-DISCOVERY-OPT masters" },
    { handoffId: 45,  sourceModuleId: SMP_DISCOVERY_OPT_MODULE_ID, reason: "TE 110 (re-pointed to saas_usage_metrics) — SMP-DISCOVERY-OPT masters" },
    { handoffId: 639, sourceModuleId: SMP_DISCOVERY_OPT_MODULE_ID, reason: "TE 621 (saas_application.discovered) — SMP-DISCOVERY-OPT masters saas_applications" },
    { handoffId: 640, sourceModuleId: SMP_DISCOVERY_OPT_MODULE_ID, reason: "TE 622 (saas_application.sanctioned) — SMP-DISCOVERY-OPT masters saas_applications" },
    { handoffId: 641, sourceModuleId: SMP_DISCOVERY_OPT_MODULE_ID, reason: "TE 622 (saas_application.sanctioned) — SMP-DISCOVERY-OPT masters saas_applications" },
    { handoffId: 642, sourceModuleId: SMP_DISCOVERY_OPT_MODULE_ID, reason: "TE 623 (saas_application.deprovisioned) — SMP-DISCOVERY-OPT masters saas_applications" },
    { handoffId: 643, sourceModuleId: SMP_DISCOVERY_OPT_MODULE_ID, reason: "TE 625 (saas_usage_metric.idle_threshold) — SMP-DISCOVERY-OPT masters saas_usage_metrics" },
  ];

  for (const b of outboundBackfills) {
    const rows = await get(`/handoffs?id=eq.${b.handoffId}&select=id,source_domain_module_id`);
    if (rows.length === 0) {
      console.log(`  skip handoff ${b.handoffId}: not found`);
      continue;
    }
    if (rows[0]!.source_domain_module_id !== null) {
      console.log(`  skip handoff ${b.handoffId}: source_module already set to ${rows[0]!.source_domain_module_id}`);
      continue;
    }
    await patch(`/handoffs?id=eq.${b.handoffId}`,
      { source_domain_module_id: b.sourceModuleId },
      `outbound handoff ${b.handoffId} (${b.reason})`);
  }

  // Inbound to SMP — every handoff whose payload is SMP-mastered.
  const inboundBackfills: Array<{ handoffId: number; targetModuleId: number; reason: string }> = [
    { handoffId: 38, targetModuleId: SMP_DISCOVERY_OPT_MODULE_ID, reason: "payload=shadow_it_apps — SMP-DISCOVERY-OPT masters" },
    { handoffId: 42, targetModuleId: SMP_RENEWAL_MODULE_ID,       reason: "payload=saas_subscriptions — SMP-RENEWAL masters" },
    { handoffId: 47, targetModuleId: SMP_DISCOVERY_OPT_MODULE_ID, reason: "payload=shadow_it_apps — SMP-DISCOVERY-OPT masters" },
  ];

  for (const b of inboundBackfills) {
    const rows = await get(`/handoffs?id=eq.${b.handoffId}&select=id,target_domain_module_id`);
    if (rows.length === 0) {
      console.log(`  skip handoff ${b.handoffId}: not found`);
      continue;
    }
    if (rows[0]!.target_domain_module_id !== null) {
      console.log(`  skip handoff ${b.handoffId}: target_module already set to ${rows[0]!.target_domain_module_id}`);
      continue;
    }
    await patch(`/handoffs?id=eq.${b.handoffId}`,
      { target_domain_module_id: b.targetModuleId },
      `inbound handoff ${b.handoffId} (${b.reason})`);
  }
}

// ============================================================
// PHASE 3 — B1-S8: handoff 174 re-model
// ============================================================

async function phase3(): Promise<void> {
  console.log("\n=== Phase 3: re-model handoff 174 (SPEND-MGMT card_transactions → SMP shadow_it_apps) (B1-S8) ===");

  const rows = await get(`/handoffs?id=eq.174&select=id,data_object_id,target_domain_module_id`);
  if (rows.length === 0) {
    console.log("  skip: handoff 174 not found");
    return;
  }
  const cur = rows[0]!;
  if (Number(cur.data_object_id) === SHADOW_IT_APPS_ID && Number(cur.target_domain_module_id) === SMP_DISCOVERY_OPT_MODULE_ID) {
    console.log("  skip: handoff 174 already re-modeled");
    return;
  }
  await patch(`/handoffs?id=eq.174`,
    { data_object_id: SHADOW_IT_APPS_ID, target_domain_module_id: SMP_DISCOVERY_OPT_MODULE_ID },
    "handoff 174 (payload card_transactions→shadow_it_apps, target_module=30)");
}

// ============================================================
// PHASE 4 — B1-S7: F7 channel rule — send_email → notify_person
// ============================================================

async function phase4(): Promise<void> {
  console.log("\n=== Phase 4: F7 channel rule — re-point send_email to notify_person on SMP skills (B1-S7) ===");

  for (const skillId of [SKILL_SMP_DISCOVERY_OPT, SKILL_SMP_RENEWAL]) {
    const existingNotify = await get(`/skill_tools?skill_id=eq.${skillId}&tool_id=eq.${TOOL_NOTIFY_PERSON}&select=id`);
    const existingEmail = await get(`/skill_tools?skill_id=eq.${skillId}&tool_id=eq.${TOOL_SEND_EMAIL}&select=id,requirement_level`);

    if (existingEmail.length === 0) {
      console.log(`  skip skill ${skillId}: no send_email link`);
      continue;
    }
    const reqLevel = existingEmail[0]!.requirement_level as string;

    if (existingNotify.length === 0) {
      await insertRows("/skill_tools",
        [{ skill_id: skillId, tool_id: TOOL_NOTIFY_PERSON, requirement_level: reqLevel }],
        `skill ${skillId} add notify_person (${reqLevel})`);
    } else {
      console.log(`  skill ${skillId}: notify_person already linked, will drop send_email only`);
    }
    await del(`/skill_tools?skill_id=eq.${skillId}&tool_id=eq.${TOOL_SEND_EMAIL}`, `skill ${skillId} drop send_email`);
  }
}

// ============================================================
// PHASE 5 — B1-S6: materialize permissions for SMP modules
// ============================================================

interface PermissionSpec {
  permission_name: string;
  tier: "baseline-read" | "baseline-manage" | "baseline-admin" | "workflow-gate";
  domain_module_id: number;
  description: string;
}

async function phase5(): Promise<Map<string, number>> {
  console.log("\n=== Phase 5: materialize 15 permissions for SMP modules (B1-S6) ===");

  const perms: PermissionSpec[] = [
    // SMP-DISCOVERY-OPT baseline
    { permission_name: "smp-discovery-opt:read",                  tier: "baseline-read",   domain_module_id: SMP_DISCOVERY_OPT_MODULE_ID, description: "Baseline read access to SMP discovery and optimization records." },
    { permission_name: "smp-discovery-opt:manage",                tier: "baseline-manage", domain_module_id: SMP_DISCOVERY_OPT_MODULE_ID, description: "Manage records in SMP discovery and optimization (create/update/delete non-gated)." },
    { permission_name: "smp-discovery-opt:admin",                 tier: "baseline-admin",  domain_module_id: SMP_DISCOVERY_OPT_MODULE_ID, description: "Full admin access to SMP discovery and optimization, including all workflow gates." },
    // SMP-DISCOVERY-OPT workflow gates (from lifecycle states)
    { permission_name: "smp-discovery-opt:sanction_application",  tier: "workflow-gate",   domain_module_id: SMP_DISCOVERY_OPT_MODULE_ID, description: "Sanction a discovered SaaS application (saas_applications discovered→sanctioned)." },
    { permission_name: "smp-discovery-opt:deprecate_application", tier: "workflow-gate",   domain_module_id: SMP_DISCOVERY_OPT_MODULE_ID, description: "Deprecate a sanctioned SaaS application (saas_applications sanctioned→deprecated)." },
    { permission_name: "smp-discovery-opt:deprovision_application", tier: "workflow-gate", domain_module_id: SMP_DISCOVERY_OPT_MODULE_ID, description: "Deprovision a deprecated SaaS application tenant-wide (saas_applications deprecated→deprovisioned)." },
    { permission_name: "smp-discovery-opt:reclaim_assignment",    tier: "workflow-gate",   domain_module_id: SMP_DISCOVERY_OPT_MODULE_ID, description: "Reclaim an idle license seat (smp_license_seat_assignments idle→reclaimed)." },
    { permission_name: "smp-discovery-opt:promote_shadow_app",    tier: "workflow-gate",   domain_module_id: SMP_DISCOVERY_OPT_MODULE_ID, description: "Promote a triaged shadow_it_apps row to a sanctioned saas_application." },
    { permission_name: "smp-discovery-opt:block_shadow_app",      tier: "workflow-gate",   domain_module_id: SMP_DISCOVERY_OPT_MODULE_ID, description: "Block a shadow_it_apps row from further use across the tenant." },

    // SMP-RENEWAL baseline
    { permission_name: "smp-renewal:read",                        tier: "baseline-read",   domain_module_id: SMP_RENEWAL_MODULE_ID,       description: "Baseline read access to SMP renewal and vendor records." },
    { permission_name: "smp-renewal:manage",                      tier: "baseline-manage", domain_module_id: SMP_RENEWAL_MODULE_ID,       description: "Manage records in SMP renewal and vendor management (create/update/delete non-gated)." },
    { permission_name: "smp-renewal:admin",                       tier: "baseline-admin",  domain_module_id: SMP_RENEWAL_MODULE_ID,       description: "Full admin access to SMP renewal and vendor management, including all workflow gates." },
    // SMP-RENEWAL workflow gates
    { permission_name: "smp-renewal:initiate_renewal",            tier: "workflow-gate",   domain_module_id: SMP_RENEWAL_MODULE_ID,       description: "Initiate the renewal workflow for a saas_subscription (active→renewing)." },
    { permission_name: "smp-renewal:approve_renewal",             tier: "workflow-gate",   domain_module_id: SMP_RENEWAL_MODULE_ID,       description: "Approve the renewal of a saas_subscription (renewing→renewed)." },
    { permission_name: "smp-renewal:cancel_subscription",         tier: "workflow-gate",   domain_module_id: SMP_RENEWAL_MODULE_ID,       description: "Cancel a saas_subscription (any state→cancelled)." },
  ];

  const idMap = new Map<string, number>();

  // Idempotent: read existing by natural key (permission_name), insert missing only.
  const existing = await get(`/permissions?permission_name=in.(${perms.map(p => p.permission_name).join(",")})&select=id,permission_name`);
  const existingByName = new Map<string, number>();
  for (const r of existing) existingByName.set(r.permission_name as string, Number(r.id));

  const toInsert: Row[] = [];
  for (const p of perms) {
    const existingId = existingByName.get(p.permission_name);
    if (existingId !== undefined) {
      idMap.set(p.permission_name, existingId);
    } else {
      toInsert.push({ ...p });
    }
  }

  if (toInsert.length > 0) {
    await insertRows("/permissions", toInsert, `${toInsert.length} new permissions`);
    if (!DRY_RUN) {
      const refresh = await get(`/permissions?permission_name=in.(${perms.map(p => p.permission_name).join(",")})&select=id,permission_name`);
      for (const r of refresh) idMap.set(r.permission_name as string, Number(r.id));
    } else {
      // sentinel ids for downstream dry-run logging
      let i = -1;
      for (const p of toInsert) idMap.set(p.permission_name as string, i--);
    }
  } else {
    console.log("  skip: all 15 permissions already present");
  }

  return idMap;
}

// ============================================================
// PHASE 6 — B1-S2: author 3 SMP roles + role_modules + role_permissions
// ============================================================

interface RoleSpec {
  role_code: string;
  role_name: string;
  slug: string;
  description: string;
  business_function_id: number;
  module_assignments: Array<{ module_id: number; interaction_level: "primary" | "secondary" }>;
  permissions: string[]; // permission_name list (resolved to ids via idMap)
}

async function phase6(permIdMap: Map<string, number>): Promise<void> {
  console.log("\n=== Phase 6: author 3 SMP roles + role_modules + role_permissions (B1-S2) ===");

  const roles: RoleSpec[] = [
    {
      role_code: "IT-SAAS-ADMIN",
      role_name: "IT SaaS Administrator",
      slug: "it_saas_admin",
      description: "IT operations persona responsible for SaaS discovery, sanctioning, optimization, and reclamation across the SMP-DISCOVERY-OPT module. Reads renewal context from SMP-RENEWAL.",
      business_function_id: BF_IT_OPERATIONS,
      module_assignments: [
        { module_id: SMP_DISCOVERY_OPT_MODULE_ID, interaction_level: "primary" },
        { module_id: SMP_RENEWAL_MODULE_ID, interaction_level: "secondary" },
      ],
      permissions: ["smp-discovery-opt:admin", "smp-renewal:read"],
    },
    {
      role_code: "PROCUREMENT-SAAS-RENEWAL-OWNER",
      role_name: "Procurement SaaS Renewal Owner",
      slug: "procurement_saas_renewal_owner",
      description: "Procurement persona responsible for the SaaS renewal pipeline, vendor relationships, and contract coordination in SMP-RENEWAL. Reads the application/usage view from SMP-DISCOVERY-OPT to size renewals.",
      business_function_id: BF_PROCUREMENT,
      module_assignments: [
        { module_id: SMP_RENEWAL_MODULE_ID, interaction_level: "primary" },
        { module_id: SMP_DISCOVERY_OPT_MODULE_ID, interaction_level: "secondary" },
      ],
      permissions: ["smp-renewal:admin", "smp-discovery-opt:read"],
    },
    {
      role_code: "ITAM-SMP-ADMIN",
      role_name: "ITAM SMP Administrator",
      slug: "itam_smp_admin",
      description: "Cross-module SMP administrator under ITAM. Full admin on both SMP-DISCOVERY-OPT and SMP-RENEWAL; owns the SaaS portfolio holistically.",
      business_function_id: BF_ITAM,
      module_assignments: [
        { module_id: SMP_DISCOVERY_OPT_MODULE_ID, interaction_level: "primary" },
        { module_id: SMP_RENEWAL_MODULE_ID, interaction_level: "primary" },
      ],
      permissions: ["smp-discovery-opt:admin", "smp-renewal:admin"],
    },
  ];

  // Insert roles by natural key (role_code), idempotent.
  const codes = roles.map(r => r.role_code).join(",");
  const existing = await get(`/roles?role_code=in.(${codes})&select=id,role_code`);
  const existingByCode = new Map<string, number>();
  for (const r of existing) existingByCode.set(r.role_code as string, Number(r.id));

  const rolesToInsert: Row[] = [];
  for (const r of roles) {
    if (!existingByCode.has(r.role_code)) {
      rolesToInsert.push({
        role_code: r.role_code,
        role_name: r.role_name,
        slug: r.slug,
        description: r.description,
        origin: "model",
        business_function_id: r.business_function_id,
      });
    }
  }
  if (rolesToInsert.length > 0) {
    await insertRows("/roles", rolesToInsert, `${rolesToInsert.length} new roles`);
  } else {
    console.log("  skip: all 3 roles already present");
  }

  // Resolve role ids after insert.
  const roleIdMap = new Map<string, number>();
  if (!DRY_RUN) {
    const refresh = await get(`/roles?role_code=in.(${codes})&select=id,role_code`);
    for (const r of refresh) roleIdMap.set(r.role_code as string, Number(r.id));
  } else {
    let i = -100;
    for (const [code, id] of existingByCode) roleIdMap.set(code, id);
    for (const r of roles) if (!roleIdMap.has(r.role_code)) roleIdMap.set(r.role_code, i--);
  }

  // Insert role_modules.
  const moduleAssignmentsToInsert: Row[] = [];
  for (const r of roles) {
    const roleId = roleIdMap.get(r.role_code)!;
    for (const ma of r.module_assignments) {
      if (DRY_RUN && roleId < 0) {
        moduleAssignmentsToInsert.push({ role_id: roleId, domain_module_id: ma.module_id, interaction_level: ma.interaction_level });
        continue;
      }
      const existingRm = await get(`/role_modules?role_id=eq.${roleId}&domain_module_id=eq.${ma.module_id}&select=id`);
      if (existingRm.length === 0) {
        moduleAssignmentsToInsert.push({ role_id: roleId, domain_module_id: ma.module_id, interaction_level: ma.interaction_level });
      }
    }
  }
  if (moduleAssignmentsToInsert.length > 0) {
    await insertRows("/role_modules", moduleAssignmentsToInsert, `${moduleAssignmentsToInsert.length} new role_modules rows`);
  } else {
    console.log("  skip: all role_modules already present");
  }

  // Insert role_permissions. id is text-format "<role_id>.<permission_id>".
  const permRowsToInsert: Row[] = [];
  for (const r of roles) {
    const roleId = roleIdMap.get(r.role_code)!;
    for (const permName of r.permissions) {
      const permId = permIdMap.get(permName);
      if (permId === undefined) {
        console.log(`  warn: permission ${permName} not in id map`);
        continue;
      }
      if (DRY_RUN && (roleId < 0 || permId < 0)) {
        permRowsToInsert.push({ role_id: roleId, permission_id: permId });
        continue;
      }
      const existingRp = await get(`/role_permissions?role_id=eq.${roleId}&permission_id=eq.${permId}&select=id`);
      if (existingRp.length === 0) {
        permRowsToInsert.push({ role_id: roleId, permission_id: permId });
      }
    }
  }
  if (permRowsToInsert.length > 0) {
    await insertRows("/role_permissions", permRowsToInsert, `${permRowsToInsert.length} new role_permissions rows`);
  } else {
    console.log("  skip: all role_permissions already present");
  }
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  console.log(DRY_RUN
    ? "MODE: dry-run (no writes). Re-run with --apply to execute."
    : "MODE: apply (writes will execute).");

  await phase1();
  await phase2();
  await phase3();
  await phase4();
  const permIdMap = await phase5();
  await phase6(permIdMap);

  console.log("\n=== Summary ===");
  console.log("  Phase 1: 3 trigger_event re-points (B1-S5 partial — TE 127 deferred).");
  console.log("  Phase 2: 7 outbound + 3 inbound handoff module-FK backfills (B1-S3, B1-S4).");
  console.log("  Phase 3: handoff 174 re-modeled to shadow_it_apps payload (B1-S8 option b).");
  console.log("  Phase 4: send_email → notify_person on both SMP system skills (B1-S7).");
  console.log("  Phase 5: 15 permissions materialized (6 baseline + 9 workflow-gate) (B1-S6).");
  console.log("  Phase 6: 3 roles + 6 role_modules + 6 role_permissions authored (B1-S2).");
  console.log("\nUI:");
  console.log("  https://tests.semantius.app/domain_map/permissions");
  console.log("  https://tests.semantius.app/domain_map/roles");
  console.log("  https://tests.semantius.app/domain_map/handoffs");
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
