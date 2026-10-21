#!/usr/bin/env bun
// IGA follow-ups (2026-05-27):
//   #1: Retire legacy iga-system skill (id=70) and its skill_tools
//   #2: Add 20 consumer DMDO rows so B10b closes the 26 unresolved inbound handoffs
//   #3: Re-run B10b backfill on the 26 inbound rows to set target_domain_module_id

import { writeFileSync } from "node:fs";

type Row = Record<string, any>;

async function call(body: Row): Promise<Row[]> {
  const json = JSON.stringify(body);
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", json], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius failed (${code}): ${stderr}\n${json.slice(0, 400)}`);
  return stdout.trim() ? JSON.parse(stdout) : [];
}

const IGA_DOMAIN_ID = 35;

// IGA module ids (resolved at runtime, but cached here from prior run)
const MOD = {
  ACCESS_REQUEST: 144,
  ACCESS_CERTIFICATION: 145,
  SOD_MGMT: 146,
  ENTITLEMENT_CATALOG: 147,
  AUTO_PROVISIONING: 148,
};

// ============================================================
// #1: Retire legacy iga-system skill
// ============================================================

async function retireLegacySkill() {
  console.log("\n=== #1: Retire legacy iga-system skill (id=70) ===");
  const skill = await call({ method: "GET", path: "/skills?id=eq.70&select=id,skill_name,domain_module_id" });
  if (skill.length === 0) {
    console.log("  - skill id=70 already gone");
    return;
  }
  const stRows = await call({ method: "GET", path: "/skill_tools?skill_id=eq.70&select=id" });
  console.log(`  - skill_tools to delete: ${stRows.length}`);
  for (const r of stRows) {
    await call({ method: "DELETE", path: `/skill_tools?id=eq.${r.id}` });
  }
  await call({ method: "DELETE", path: "/skills?id=eq.70" });
  console.log("  - DELETED iga-system (id=70)");
}

// ============================================================
// #2: Add consumer DMDO rows
// ============================================================

type DmoDraft = {
  data_object_id: number;
  data_object_name: string;
  domain_module_id: number;
  module_code: string;
  role: "consumer";
  necessity: "optional" | "required";
  rationale: string;
};

const newDmo: DmoDraft[] = [
  // HCM masters
  { data_object_id: 36, data_object_name: "employment_events", domain_module_id: MOD.ACCESS_REQUEST, module_code: "IGA-ACCESS-REQUEST", role: "consumer", necessity: "optional", rationale: "Mover events (promotion, transfer, role change) trigger access-review requests in IGA." },
  { data_object_id: 35, data_object_name: "employment_contracts", domain_module_id: MOD.AUTO_PROVISIONING, module_code: "IGA-AUTO-PROVISIONING", role: "consumer", necessity: "optional", rationale: "Contract-end events auto-trigger access revocation via provisioning." },
  // ONBOARDING
  { data_object_id: 18, data_object_name: "onboarding_tasks", domain_module_id: MOD.ACCESS_REQUEST, module_code: "IGA-ACCESS-REQUEST", role: "consumer", necessity: "optional", rationale: "Onboarding-task progression triggers IGA access-request creation for the new hire." },
  // LMS
  { data_object_id: 173, data_object_name: "compliance_assignments", domain_module_id: MOD.AUTO_PROVISIONING, module_code: "IGA-AUTO-PROVISIONING", role: "consumer", necessity: "optional", rationale: "Overdue compliance training fires auto-revoke of gated access (e.g. PII data, regulated systems)." },
  // DCG
  { data_object_id: 307, data_object_name: "data_access_policies", domain_module_id: MOD.ACCESS_REQUEST, module_code: "IGA-ACCESS-REQUEST", role: "consumer", necessity: "optional", rationale: "DCG-approved data-access requests escalate to IGA for entitlement grant." },
  // DLP
  { data_object_id: 330, data_object_name: "dlp_incidents", domain_module_id: MOD.AUTO_PROVISIONING, module_code: "IGA-AUTO-PROVISIONING", role: "consumer", necessity: "optional", rationale: "DLP-escalated incidents trigger access suspension via auto-provisioning." },
  { data_object_id: 335, data_object_name: "dlp_user_activity_logs", domain_module_id: MOD.SOD_MGMT, module_code: "IGA-SOD-MGMT", role: "consumer", necessity: "optional", rationale: "Flagged user-activity logs feed into SoD anomaly detection and toxic-combo discovery." },
  // DSPM
  { data_object_id: 340, data_object_name: "iam_access_policies", domain_module_id: MOD.SOD_MGMT, module_code: "IGA-SOD-MGMT", role: "consumer", necessity: "optional", rationale: "DSPM-detected permission escalations on cloud IAM policies feed SoD violation queue." },
  // ITSM
  { data_object_id: 52, data_object_name: "service_catalog_items", domain_module_id: MOD.ENTITLEMENT_CATALOG, module_code: "IGA-ENTITLEMENT-CATALOG", role: "consumer", necessity: "optional", rationale: "ITSM service-catalog publications spawn corresponding entitlement-catalog entries." },
  // SMP
  { data_object_id: 61, data_object_name: "saas_applications", domain_module_id: MOD.ENTITLEMENT_CATALOG, module_code: "IGA-ENTITLEMENT-CATALOG", role: "consumer", necessity: "optional", rationale: "Newly discovered or sanctioned SaaS apps trigger entitlement registration in IGA catalog." },
  // UEM
  { data_object_id: 556, data_object_name: "enrolled_devices", domain_module_id: MOD.AUTO_PROVISIONING, module_code: "IGA-AUTO-PROVISIONING", role: "consumer", necessity: "optional", rationale: "Device enrollment/loss events drive conditional access policy changes via provisioning." },
  { data_object_id: 563, data_object_name: "device_compliance_results", domain_module_id: MOD.AUTO_PROVISIONING, module_code: "IGA-AUTO-PROVISIONING", role: "consumer", necessity: "optional", rationale: "Device-compliance state gates access provisioning (non-compliant = suspend)." },
  // APIM
  { data_object_id: 462, data_object_name: "api_consumers", domain_module_id: MOD.AUTO_PROVISIONING, module_code: "IGA-AUTO-PROVISIONING", role: "consumer", necessity: "optional", rationale: "API-consumer revocation events trigger downstream entitlement clean-up." },
  // ECM
  { data_object_id: 431, data_object_name: "document_folders", domain_module_id: MOD.ENTITLEMENT_CATALOG, module_code: "IGA-ENTITLEMENT-CATALOG", role: "consumer", necessity: "optional", rationale: "Folder-level permission changes reconcile to entitlement definitions for folder-bound roles." },
  { data_object_id: 429, data_object_name: "content_documents", domain_module_id: MOD.ACCESS_REQUEST, module_code: "IGA-ACCESS-REQUEST", role: "consumer", necessity: "optional", rationale: "Document-classification changes trigger access-request review for affected entitlements." },
  // WSC
  { data_object_id: 569, data_object_name: "external_guest_invitations", domain_module_id: MOD.ACCESS_REQUEST, module_code: "IGA-ACCESS-REQUEST", role: "consumer", necessity: "optional", rationale: "External-guest invitations spawn IGA access requests for guest entitlement provisioning." },
  { data_object_id: 568, data_object_name: "channel_members", domain_module_id: MOD.AUTO_PROVISIONING, module_code: "IGA-AUTO-PROVISIONING", role: "consumer", necessity: "optional", rationale: "Channel-membership additions feed provisioning for collaboration-tool entitlements." },
  // VIS-MGMT
  { data_object_id: 668, data_object_name: "visitor_registrations", domain_module_id: MOD.AUTO_PROVISIONING, module_code: "IGA-AUTO-PROVISIONING", role: "consumer", necessity: "optional", rationale: "Visitor-registration submissions trigger badge / temporary access provisioning." },
  // IWMS
  { data_object_id: 590, data_object_name: "desk_bookings", domain_module_id: MOD.AUTO_PROVISIONING, module_code: "IGA-AUTO-PROVISIONING", role: "consumer", necessity: "optional", rationale: "Desk-booking check-ins trigger conditional access policy evaluation (location-aware auth)." },
  // HRSD
  { data_object_id: 192, data_object_name: "hr_cases", domain_module_id: MOD.ACCESS_REQUEST, module_code: "IGA-ACCESS-REQUEST", role: "consumer", necessity: "optional", rationale: "HRSD cases of type 'access-required' escalate to IGA for access-request creation." },
];

async function addConsumerDmo() {
  console.log("\n=== #2: Add consumer DMDO rows ===");
  // Idempotent check: read existing (domain_module_id, data_object_id) pairs first
  const moduleIds = [...new Set(newDmo.map((d) => d.domain_module_id))];
  const existing = await call({ method: "GET", path: `/domain_module_data_objects?domain_module_id=in.(${moduleIds.join(",")})&select=domain_module_id,data_object_id&limit=10000` });
  const existKey = new Set(existing.map((r: any) => `${r.domain_module_id}:${r.data_object_id}`));
  const missing = newDmo.filter((d) => !existKey.has(`${d.domain_module_id}:${d.data_object_id}`));
  console.log(`  - ${missing.length} new (of ${newDmo.length} drafts; ${newDmo.length - missing.length} already present)`);
  for (const d of missing) {
    await call({
      method: "POST",
      path: "/domain_module_data_objects",
      body: [{
        domain_module_id: d.domain_module_id,
        data_object_id: d.data_object_id,
        role: d.role,
        necessity: d.necessity,
        notes: d.rationale,
      }],
    });
    console.log(`  + ${d.module_code} consumer of ${d.data_object_name} (${d.necessity})`);
  }
}

// ============================================================
// #3: Re-run B10b backfill on inbound IGA handoffs
// ============================================================

async function backfillB10b() {
  console.log("\n=== #3: Re-run B10b backfill on IGA inbound handoffs ===");
  const ROLE_STRENGTH: Record<string, number> = { master: 5, embedded_master: 4, contributor: 3, consumer: 2, derived: 1 };
  const dmoAll = await call({ method: "GET", path: `/domain_module_data_objects?select=domain_module_id,data_object_id,role,domain_module:domain_modules(id,domain_id)` });
  const bestMap = new Map<string, { module_id: number; strength: number }>();
  for (const row of dmoAll) {
    const mod = row.domain_module;
    if (!mod) continue;
    const key = `${mod.domain_id}:${row.data_object_id}`;
    const strength = ROLE_STRENGTH[String(row.role)] ?? 0;
    const existing = bestMap.get(key);
    if (!existing || strength > existing.strength) {
      bestMap.set(key, { module_id: Number(row.domain_module_id), strength });
    }
  }

  const inbound = await call({ method: "GET", path: `/handoffs?target_domain_id=eq.${IGA_DOMAIN_ID}&target_domain_module_id=is.null&select=id,data_object_id,source_domain_id` });
  let patched = 0;
  let unresolved = 0;
  for (const h of inbound) {
    const targetKey = `${IGA_DOMAIN_ID}:${h.data_object_id}`;
    const best = bestMap.get(targetKey);
    if (!best) {
      console.log(`  - id=${h.id} unresolved (data_object_id=${h.data_object_id})`);
      unresolved++;
      continue;
    }
    await call({ method: "PATCH", path: `/handoffs?id=eq.${h.id}`, body: { target_domain_module_id: best.module_id } });
    console.log(`  PATCH id=${h.id}: target_domain_module_id=${best.module_id}`);
    patched++;
  }
  console.log(`  -- patched ${patched}, unresolved ${unresolved}`);
}

async function main() {
  await retireLegacySkill();
  await addConsumerDmo();
  await backfillB10b();
  console.log("\nDone.");
}

await main();
