#!/usr/bin/env bun
// Idempotent modularization loader for the RMM domain (domains.id = 130).
// Creates 4 full domain_modules, links capabilities, assigns existing data_objects.
// Reuses existing entities only. Safe to re-run.
//
// Master pre-check (run 2026-06-02): monitoring_alerts (85) and monitoring_policies (86)
// are already mastered by ITOM-INFRA-MON (module 267). Per M7 catalog-wide rule they are
// assigned embedded_master here, NOT a second master. RMM masters only the three
// RMM-owned data_objects: rmm_agents (223), patch_jobs (224), automation_scripts (225).

type Json = any;

async function semantius(method: string, path: string, body?: Json): Promise<Json> {
  const arg: Json = { method, path };
  if (body !== undefined) arg.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(arg)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius ${method} ${path} failed: ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

const DOMAIN_ID = 130;

// ------------------------------------------------------------------
// Module specs
// ------------------------------------------------------------------

type ModuleSpec = {
  domain_module_name: string;
  domain_module_code: string;
  description: string;
  capability_ids: number[];
  // data_objects: [data_object_id, role, necessity]
  data_objects: [number, string, string][];
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_name: "Agent and Endpoint Management",
    domain_module_code: "RMM-AGENT-MGMT",
    description:
      "Deploys, tracks, and governs the installed agent fleet across multi-tenant endpoint estates: agent liveness and health, hardware and software inventory, network discovery of unmanaged hosts, and per-customer logical isolation of the managed estate.",
    capability_ids: [203, 209, 206, 207], // EPM, MT, DISC, INV
    data_objects: [
      [223, "master", "required"], // rmm_agents
      [82, "contributor", "required"], // discovered_devices
      [76, "contributor", "required"], // configuration_items
      [56, "contributor", "required"], // hardware_assets
      [59, "contributor", "required"], // software_installations
    ],
  },
  {
    domain_module_name: "Monitoring and Alerting",
    domain_module_code: "RMM-MONITORING",
    description:
      "Collects real-time telemetry from managed endpoints, evaluates it against thresholds and policies, generates de-duplicated alerts with notification routing, and applies AI assistance for triage, root-cause hints, and natural-language operations queries. Reads the alert and policy masters owned by the broader IT operations monitoring layer.",
    capability_ids: [203, 208, 210], // EPM, ALERT, AI
    data_objects: [
      [86, "embedded_master", "required"], // monitoring_policies (canonical master: ITOM-INFRA-MON)
      [85, "embedded_master", "required"], // monitoring_alerts (canonical master: ITOM-INFRA-MON)
      [47, "consumer", "required"], // service_incidents
      [48, "consumer", "required"], // service_requests
    ],
  },
  {
    domain_module_name: "Patch Management",
    domain_module_code: "RMM-PATCH-MGMT",
    description:
      "Discovers, approves, schedules, and deploys OS and third-party patches across endpoint groups within maintenance windows, with per-endpoint execution status and rollback on failure. Emits change records into the service-change pipeline.",
    capability_ids: [204], // PATCH
    data_objects: [
      [224, "master", "required"], // patch_jobs
      [50, "contributor", "required"], // service_changes
    ],
  },
  {
    domain_module_name: "Remote Scripting and Automation",
    domain_module_code: "RMM-AUTOMATION",
    description:
      "Authors, versions, schedules, and executes scripts against managed endpoints from a reusable script library, with secure parameter passing and per-target execution history. The remediation and bulk-operation engine driven by alerts and patch outcomes.",
    capability_ids: [205], // SCRIPT
    data_objects: [
      [225, "master", "required"], // automation_scripts
    ],
  },
];

// ------------------------------------------------------------------
// Phase 1: domain_modules
// ------------------------------------------------------------------

async function upsertModules(): Promise<Map<string, number>> {
  const codes = MODULES.map((m) => m.domain_module_code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const existingCodes = new Set(existing.map((r: any) => r.domain_module_code));
  const toInsert = MODULES.filter((m) => !existingCodes.has(m.domain_module_code)).map((m) => ({
    domain_module_name: m.domain_module_name,
    domain_module_code: m.domain_module_code,
    description: m.description,
    domain_id: DOMAIN_ID,
    module_kind: "full",
  }));
  if (toInsert.length) {
    await semantius("POST", "/domain_modules", toInsert);
    console.log(`  +${toInsert.length} domain_modules: ${toInsert.map((r) => r.domain_module_code).join(", ")}`);
  } else {
    console.log("  domain_modules already present; skipping insert");
  }
  // Re-read for code -> id map
  const all = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  return map;
}

// ------------------------------------------------------------------
// Phase 2: domain_module_capabilities
// ------------------------------------------------------------------

async function upsertCapabilities(moduleId: number, capabilityIds: number[]): Promise<void> {
  if (!capabilityIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capabilityIds.join(",")})&select=capability_id`,
  );
  const existingIds = new Set(existing.map((r: any) => r.capability_id));
  const toInsert = capabilityIds
    .filter((id) => !existingIds.has(id))
    .map((id) => ({ domain_module_id: moduleId, capability_id: id }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`  +${toInsert.length} capability links on module ${moduleId}`);
  }
}

// ------------------------------------------------------------------
// Phase 3: domain_module_data_objects
// ------------------------------------------------------------------

async function upsertDataObjects(moduleId: number, rows: [number, string, string][]): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map((r) => r[0]);
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`,
  );
  const existingIds = new Set(existing.map((r: any) => r.data_object_id));
  const toInsert = rows
    .filter((r) => !existingIds.has(r[0]))
    .map((r) => ({
      domain_module_id: moduleId,
      data_object_id: r[0],
      role: r[1],
      necessity: r[2],
    }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`  +${toInsert.length} DMDO rows on module ${moduleId}`);
  }
}

// ------------------------------------------------------------------
// Master pre-check guard (catalog-wide M7)
// ------------------------------------------------------------------

async function precheckMasters(): Promise<void> {
  const masterRows: { id: number; module: string }[] = [];
  for (const m of MODULES) {
    for (const [id, role] of m.data_objects) {
      if (role === "master") masterRows.push({ id, module: m.domain_module_code });
    }
  }
  for (const { id, module } of masterRows) {
    const existing = await semantius(
      "GET",
      `/domain_module_data_objects?data_object_id=eq.${id}&role=eq.master&select=domain_module_id,domain_modules(domain_module_code,domain_id)`,
    );
    const foreign = (existing || []).filter(
      (r: any) => r.domain_modules && !MODULES.some((m) => m.domain_module_code === r.domain_modules.domain_module_code),
    );
    if (foreign.length) {
      throw new Error(
        `PRE-CHECK FAIL: data_object ${id} intended master in ${module} but already mastered catalog-wide by ` +
          foreign.map((r: any) => r.domain_modules.domain_module_code).join(", ") +
          ". Demote to embedded_master.",
      );
    }
  }
  console.log("  master pre-check OK: rmm_agents, patch_jobs, automation_scripts have no existing catalog-wide master");
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------

async function main() {
  console.log("=== Modularize RMM (domain 130) ===");

  console.log("\n[pre-check] catalog-wide master guard");
  await precheckMasters();

  console.log("\n[phase 1] domain_modules");
  const moduleMap = await upsertModules();

  for (const m of MODULES) {
    const moduleId = moduleMap.get(m.domain_module_code);
    if (!moduleId) throw new Error(`module id not found for ${m.domain_module_code}`);
    console.log(`\n[${m.domain_module_code}] id=${moduleId}`);
    await upsertCapabilities(moduleId, m.capability_ids);
    await upsertDataObjects(moduleId, m.data_objects);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
