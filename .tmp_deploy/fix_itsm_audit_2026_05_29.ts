#!/usr/bin/env bun
// ITSM audit fixes from audits/ITSM.md Bucket 1 (2026-05-29)
//
// S6 + S3 already executed via CLI before this loader.
// This loader does the bulk of Bucket 1:
//   Phase P — author 24 baseline + 7 workflow-gate permissions (31 rows)
//   Phase R — author 4 roles + role_modules + role_permissions
//   Phase B10b — bulk PATCH ~52 NULL-target inbound handoffs to (data_object=47, target_module=38)
//                (with a small surface-for-followup list noted in the audit)
//   Phase H — author 10 high-confidence APQC tags
//
// Run idempotently; never auto-marks `record_status='approved'` (Rule #1).
// Rule #15: no `notes` populated on any new row.

const ITSM_DOMAIN_ID = 1;
const CATALOG_MODULE_ID = 1001;
const SERVICE_INCIDENTS_DO = 47;
const ITSM_INCIDENT_MGMT_MOD = 38;

interface Module {
  id: number;
  code: string;
  display: string;
}

const ITSM_MODULES: Module[] = [
  { id: 38, code: "itsm-incident-mgmt",  display: "Incident Management" },
  { id: 39, code: "itsm-service-request", display: "Service Request Fulfillment" },
  { id: 40, code: "itsm-problem-mgmt",   display: "Problem Management" },
  { id: 41, code: "itsm-change-mgmt",    display: "Change and Release Management" },
  { id: 42, code: "itsm-event-mgmt",     display: "Event and Alert Handling" },
  { id: 43, code: "itsm-knowledge",      display: "Knowledge Management" },
  { id: 44, code: "itsm-agent-workspace", display: "Agent Workspace and Reporting" },
  { id: 45, code: "itsm-sla-mgmt",       display: "SLA and Chargeback Management" },
];

async function pgrest(method: string, path: string, body?: unknown): Promise<any> {
  const args: Record<string, unknown> = { method, path };
  if (body !== undefined) args.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(args)],
    { stdout: "pipe", stderr: "pipe" }
  );
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`postgrestRequest FAIL ${method} ${path}: ${err}`);
    throw new Error(`postgrestRequest failed (${code})`);
  }
  return out.trim() ? JSON.parse(out) : [];
}

async function insertMany(table: string, rows: unknown[]): Promise<any[]> {
  if (rows.length === 0) return [];
  const args = {
    method: "POST",
    path: `/${table}`,
    body: rows,
    headers: { Prefer: "return=representation,resolution=ignore-duplicates" },
  };
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest"],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" }
  );
  proc.stdin.write(JSON.stringify(args));
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`insertMany ${table} FAIL: ${err}`);
    throw new Error(`insertMany failed (${code})`);
  }
  return out.trim() ? JSON.parse(out) : [];
}

// ─── Phase P — permissions ────────────────────────────────────────────────

async function phaseP() {
  console.log("\n=== Phase P — permissions ===");

  // Pre-check what already exists
  const existing: { permission_name: string; id: number }[] = await pgrest(
    "GET",
    `/permissions?domain_module_id=in.(${ITSM_MODULES.map(m => m.id).join(",")})&select=id,permission_name`
  );
  const existingNames = new Set(existing.map(p => p.permission_name));
  console.log(`  pre-existing ITSM permissions: ${existingNames.size}`);

  // 24 baseline (3 per module) + 7 workflow-gate
  const baseline: any[] = [];
  for (const m of ITSM_MODULES) {
    for (const t of [
      { suffix: "read",   tier: "baseline-read",   desc: `Read access to ${m.code} module data.` },
      { suffix: "manage", tier: "baseline-manage", desc: `Create / update / soft-delete on ${m.code} records.` },
      { suffix: "admin",  tier: "baseline-admin",  desc: `Full administrative access to ${m.code} module, including delete and configuration.` },
    ]) {
      const name = `${m.code}:${t.suffix}`;
      if (existingNames.has(name)) continue;
      baseline.push({
        permission_name: name,
        description: t.desc,
        domain_module_id: m.id,
        tier: t.tier,
      });
    }
  }

  // 7 workflow-gate permissions, mirroring lifecycle states with requires_permission=true
  const gates: any[] = [
    { mod: 38, suffix: "resolve_incident",        desc: "Mark a service_incident as resolved (workflow gate)." },
    { mod: 38, suffix: "close_incident",          desc: "Close a service_incident (terminal workflow gate)." },
    { mod: 39, suffix: "approve_service_request", desc: "Approve a service_request to begin fulfillment." },
    { mod: 39, suffix: "publish_catalog_item",    desc: "Publish a service_catalog_item to the portal." },
    { mod: 39, suffix: "retire_catalog_item",     desc: "Retire a service_catalog_item from the portal." },
    { mod: 40, suffix: "resolve_problem",         desc: "Mark a service_problem as resolved (workflow gate)." },
    { mod: 41, suffix: "approve_change",          desc: "CAB approval of a service_change." },
    { mod: 43, suffix: "publish_article",         desc: "Publish a knowledge_article to the live KB." },
  ].map(g => {
    const m = ITSM_MODULES.find(x => x.id === g.mod)!;
    return {
      permission_name: `${m.code}:${g.suffix}`,
      description: g.desc,
      domain_module_id: g.mod,
      tier: "workflow-gate",
    };
  }).filter(g => !existingNames.has(g.permission_name));

  const allNew = [...baseline, ...gates];
  console.log(`  inserting baseline=${baseline.length}, gates=${gates.length}, total=${allNew.length}`);
  const created = await insertMany("permissions", allNew);
  console.log(`  ✓ created ${created.length} permissions`);
}

// ─── Phase R — roles, role_modules, role_permissions ────────────────────────

interface RoleSpec {
  role_code: string;
  role_name: string;
  slug: string;
  description: string;
  business_function_id: number; // 57 = IT Service Desk, 27 = IT Operations
  modules: { code: string; level: "primary" | "secondary" }[];
  bundle: string[]; // permission_names this role gets
}

const ROLES: RoleSpec[] = [
  {
    role_code: "IT-SERVICE-DESK-AGENT",
    role_name: "Service Desk Agent",
    slug: "it_service_desk_agent",
    description:
      "Frontline operator on the IT Service Desk. Triages incidents and service requests, " +
      "consults the knowledge base, and routes work to engineers. Bundle uses :manage on primary modules.",
    business_function_id: 57,
    modules: [
      { code: "itsm-incident-mgmt", level: "primary" },
      { code: "itsm-service-request", level: "primary" },
      { code: "itsm-agent-workspace", level: "primary" },
      { code: "itsm-knowledge", level: "secondary" },
      { code: "itsm-sla-mgmt", level: "secondary" },
    ],
    bundle: [
      "itsm-incident-mgmt:manage",
      "itsm-incident-mgmt:resolve_incident",
      "itsm-service-request:manage",
      "itsm-service-request:approve_service_request",
      "itsm-agent-workspace:manage",
      "itsm-knowledge:read",
      "itsm-sla-mgmt:read",
    ],
  },
  {
    role_code: "IT-SERVICE-DESK-MANAGER",
    role_name: "Service Desk Manager",
    slug: "it_service_desk_manager",
    description:
      "Manages the Service Desk function. Admin-tier on operational ITSM modules, oversees SLA " +
      "compliance and queue health, approves escalations and major-incident bridges.",
    business_function_id: 57,
    modules: [
      { code: "itsm-incident-mgmt", level: "primary" },
      { code: "itsm-service-request", level: "primary" },
      { code: "itsm-agent-workspace", level: "primary" },
      { code: "itsm-sla-mgmt", level: "primary" },
      { code: "itsm-event-mgmt", level: "secondary" },
      { code: "itsm-knowledge", level: "secondary" },
    ],
    bundle: [
      "itsm-incident-mgmt:admin",
      "itsm-service-request:admin",
      "itsm-agent-workspace:admin",
      "itsm-sla-mgmt:admin",
      "itsm-event-mgmt:manage",
      "itsm-knowledge:manage",
    ],
  },
  {
    role_code: "IT-CHANGE-MANAGER",
    role_name: "Change Manager",
    slug: "it_change_manager",
    description:
      "Owns change-and-release management. Chairs the CAB, approves changes, coordinates " +
      "change windows with incident and problem owners.",
    business_function_id: 27,
    modules: [
      { code: "itsm-change-mgmt", level: "primary" },
      { code: "itsm-incident-mgmt", level: "secondary" },
      { code: "itsm-problem-mgmt", level: "secondary" },
      { code: "itsm-sla-mgmt", level: "secondary" },
    ],
    bundle: [
      "itsm-change-mgmt:admin",
      "itsm-change-mgmt:approve_change",
      "itsm-incident-mgmt:read",
      "itsm-problem-mgmt:read",
      "itsm-sla-mgmt:read",
    ],
  },
  {
    role_code: "IT-KNOWLEDGE-AUTHOR",
    role_name: "Knowledge Author",
    slug: "it_knowledge_author",
    description:
      "Curates the IT knowledge base. Drafts and publishes articles, retires stale content, " +
      "reads incident / problem context to harvest new KB candidates.",
    business_function_id: 27,
    modules: [
      { code: "itsm-knowledge", level: "primary" },
      { code: "itsm-incident-mgmt", level: "secondary" },
      { code: "itsm-problem-mgmt", level: "secondary" },
      { code: "itsm-service-request", level: "secondary" },
    ],
    bundle: [
      "itsm-knowledge:admin",
      "itsm-knowledge:publish_article",
      "itsm-incident-mgmt:read",
      "itsm-problem-mgmt:read",
      "itsm-service-request:read",
    ],
  },
];

async function phaseR() {
  console.log("\n=== Phase R — roles + role_modules + role_permissions ===");

  // Pre-check existing roles
  const existingRoles: { id: number; role_code: string }[] = await pgrest(
    "GET",
    `/roles?role_code=in.(${ROLES.map(r => r.role_code).join(",")})&select=id,role_code`
  );
  const existingMap = new Map(existingRoles.map(r => [r.role_code, r.id]));
  console.log(`  pre-existing roles: ${existingMap.size}`);

  // Insert missing roles
  const toInsert = ROLES.filter(r => !existingMap.has(r.role_code)).map(r => ({
    role_code: r.role_code,
    role_name: r.role_name,
    slug: r.slug,
    description: r.description,
    business_function_id: r.business_function_id,
    module_id: CATALOG_MODULE_ID,
    origin: "model",
    record_status: "new",
  }));
  console.log(`  inserting ${toInsert.length} new roles`);
  const inserted: { id: number; role_code: string }[] = await insertMany("roles", toInsert);
  for (const r of inserted) existingMap.set(r.role_code, r.id);

  // Build module-code -> id and permission-name -> id maps
  const moduleByCode = new Map(ITSM_MODULES.map(m => [m.code, m.id]));
  const perms: { id: number; permission_name: string }[] = await pgrest(
    "GET",
    `/permissions?domain_module_id=in.(${ITSM_MODULES.map(m => m.id).join(",")})&select=id,permission_name`
  );
  const permByName = new Map(perms.map(p => [p.permission_name, p.id]));

  // Author role_modules
  const rmRows: any[] = [];
  for (const r of ROLES) {
    const roleId = existingMap.get(r.role_code)!;
    for (const m of r.modules) {
      const modId = moduleByCode.get(m.code)!;
      rmRows.push({
        role_id: roleId,
        domain_module_id: modId,
        interaction_level: m.level,
      });
    }
  }
  console.log(`  authoring ${rmRows.length} role_modules`);
  const rmCreated = await insertMany("role_modules", rmRows);
  console.log(`  ✓ ${rmCreated.length} role_modules created`);

  // Author role_permissions
  const rpRows: any[] = [];
  for (const r of ROLES) {
    const roleId = existingMap.get(r.role_code)!;
    for (const pname of r.bundle) {
      const pid = permByName.get(pname);
      if (!pid) {
        console.warn(`  ⚠️  bundle permission not found: ${pname}`);
        continue;
      }
      rpRows.push({
        role_id: roleId,
        permission_id: pid,
      });
    }
  }
  console.log(`  authoring ${rpRows.length} role_permissions`);
  const rpCreated = await insertMany("role_permissions", rpRows);
  console.log(`  ✓ ${rpCreated.length} role_permissions created`);
}

// ─── Phase B10b — bulk re-payload + module-attribute ────────────────────────

// All ~52 NULL-target inbound handoffs follow the "X.failed/alerted/breached → incident" pattern.
// The catalog's correct shape (cf. handoff 28 ITOM→ITSM as the reference): payload is
// service_incidents (47), target_module is ITSM-INCIDENT-MGMT (38). Set both.
//
// Surface-for-followup list (likely scope creep, not just attribution gaps): the user can
// decide separately whether to keep, re-target, or delete these. They're INCLUDED in the
// bulk PATCH but flagged in the audit Decisions section.
const B10B_HANDOFF_IDS = [
  177, 239, 248, 257, 266, 267, 461, 463, 466, 603, 604, 611, 624, 626, 642,
  644, 646, 650, 652, 655, 660, 663, 664, 674, 675, 677, 678, 682, 686, 689,
  703, 706, 714, 727, 736, 739, 757, 763, 765, 774, 779, 788, 834, 841, 843,
  866, 878, 893, 898, 901, 927, 928, 932, 943, 952,
];

async function phaseB10b() {
  console.log("\n=== Phase B10b — bulk re-payload + module-attribute ===");
  console.log(`  patching ${B10B_HANDOFF_IDS.length} handoffs to (data_object=47, target_module=38)`);

  const ids = B10B_HANDOFF_IDS.join(",");
  const result = await pgrest("PATCH", `/handoffs?id=in.(${ids})`, {
    data_object_id: SERVICE_INCIDENTS_DO,
    target_domain_module_id: ITSM_INCIDENT_MGMT_MOD,
  });
  console.log(`  ✓ ${Array.isArray(result) ? result.length : "n/a"} handoffs updated`);
}

// ─── Phase H — APQC tagging (10 high-confidence rows) ──────────────────────

interface ApqcTag {
  handoff_id: number;
  process_external_id: string;
  note: string; // for reviewer context, not for DB
}

const APQC_BATCH: ApqcTag[] = [
  // Outbound ITSM publishers
  { handoff_id: 30,  process_external_id: "20829", note: "service_change.completed → CMDB; PCF L4 Define IT change/release standards (closest cross-industry IT-change anchor)" },
  { handoff_id: 630, process_external_id: "20898", note: "knowledge_article.published → KMS; PCF L4 Maintain service support knowledge repository" },
  { handoff_id: 631, process_external_id: "20756", note: "service_catalog_item.published → IGA; PCF L3 Manage IT user identity and authorization" },
  // Inbound ITSM subscribers (high-confidence)
  { handoff_id: 28,  process_external_id: "20903", note: "ITOM monitoring_event.alert_triggered → ITSM-INCIDENT-MGMT; PCF L4 Triage IT service delivery incidents" },
  { handoff_id: 55,  process_external_id: "20903", note: "OBS slo.breached → ITSM-INCIDENT-MGMT; PCF L4 Triage IT service delivery incidents" },
  { handoff_id: 57,  process_external_id: "20903", note: "AIOPS correlation.identified → ITSM-INCIDENT-MGMT; PCF L4 Triage IT service delivery incidents" },
  { handoff_id: 142, process_external_id: "20829", note: "RMM patch_job.scheduled → ITSM-CHANGE-MGMT; PCF L4 Define IT change/release standards" },
  { handoff_id: 143, process_external_id: "20847", note: "RMM patch_job.completed → ITSM-CHANGE-MGMT; PCF L4 Document IT change/release outcome" },
  { handoff_id: 186, process_external_id: "20599", note: "HCM employee.terminated → ITSM-SERVICE-REQUEST; PCF L2 Manage employee onboarding, training, and development (employee separation umbrella)" },
  { handoff_id: 162, process_external_id: "20921", note: "REMOTE-ACCESS support_session.completed → ITSM-INCIDENT-MGMT; PCF L3 Operate IT user support" },
];

async function phaseH() {
  console.log("\n=== Phase H — APQC tagging (10 high-confidence) ===");

  // Resolve process external_ids → ids
  const externalIds = [...new Set(APQC_BATCH.map(t => t.process_external_id))];
  const processes: { id: number; external_id: string }[] = await pgrest(
    "GET",
    `/processes?source_framework=eq.apqc_pcf_cross_industry&external_id=in.(${externalIds.join(",")})&select=id,external_id`
  );
  const procByExt = new Map(processes.map(p => [p.external_id, p.id]));
  for (const e of externalIds) if (!procByExt.has(e)) console.warn(`  ⚠️  PCF ${e} not found`);

  // Pre-check existing tags
  const handoffIds = APQC_BATCH.map(t => t.handoff_id).join(",");
  const existing: { handoff_id: number; process_id: number }[] = await pgrest(
    "GET",
    `/handoff_processes?handoff_id=in.(${handoffIds})&select=handoff_id,process_id`
  );
  const existingKey = new Set(existing.map(e => `${e.handoff_id}.${e.process_id}`));

  const rows = APQC_BATCH.flatMap(t => {
    const pid = procByExt.get(t.process_external_id);
    if (!pid) return [];
    const key = `${t.handoff_id}.${pid}`;
    if (existingKey.has(key)) {
      console.log(`  (skip) ${t.handoff_id} → PCF ${t.process_external_id} already tagged`);
      return [];
    }
    return [{
      handoff_id: t.handoff_id,
      process_id: pid,
      proposal_source: "human_curated",
      record_status: "new",
    }];
  });
  console.log(`  inserting ${rows.length} handoff_processes`);
  const created = await insertMany("handoff_processes", rows);
  console.log(`  ✓ ${created.length} APQC tags created`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

await phaseP();
await phaseR();
await phaseB10b();
await phaseH();

console.log("\n✓ all phases complete");
console.log("\nUI:");
console.log("  https://adenin.semantius.app/domain_map/permissions");
console.log("  https://adenin.semantius.app/domain_map/roles");
console.log("  https://adenin.semantius.app/domain_map/handoffs");
console.log("  https://adenin.semantius.app/domain_map/handoff_processes");
