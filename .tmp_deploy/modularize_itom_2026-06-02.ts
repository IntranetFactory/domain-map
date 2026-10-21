#!/usr/bin/env bun
// Idempotent modularization loader for ITOM (IT Operations Management, domains.id = 2).
// Creates 3 full domain_modules, links existing capabilities, assigns existing data_objects
// at their existing role+necessity (reuse only, no new entities). Safe to re-run.
//
// Master pre-check (catalog-wide domain_module_data_objects, role=master) was clean on
// 2026-06-02 for monitoring_events (84), monitoring_alerts (85), monitoring_policies (86),
// capacity_records (87) - zero competing masters anywhere. ITOM masters all four.
// service_incidents (47) is mastered by ITSM-INCIDENT-MGMT (module 38), so ITOM keeps it
// as contributor (its existing domain-level role). monitoring_alerts (85) is also referenced
// by ITOM-OPS-AUTOMATION as embedded_master (NOT a second master).

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

const DOMAIN_ID = 2;

type ModuleSpec = {
  domain_module_code: string;
  domain_module_name: string;
  description: string;
  capability_ids: number[];
  data_objects: { data_object_id: number; role: string; necessity: string }[];
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_code: "ITOM-INFRA-MON",
    domain_module_name: "Infrastructure Monitoring and Event Management",
    description:
      "Server, network, storage, hypervisor, and container monitoring with metric collection, threshold policies, log aggregation, and topology-aware alerting. Ingests, normalizes, de-duplicates, and correlates the raw event stream into human-relevant alerts that page or ticket.",
    capability_ids: [223, 224, 225], // INFRA-MON, EVENT-MGT, LOG
    data_objects: [
      { data_object_id: 84, role: "master", necessity: "required" }, // monitoring_events
      { data_object_id: 85, role: "master", necessity: "required" }, // monitoring_alerts
      { data_object_id: 86, role: "master", necessity: "required" }, // monitoring_policies
      { data_object_id: 47, role: "contributor", necessity: "required" }, // service_incidents (ITSM-mastered)
    ],
  },
  {
    domain_module_code: "ITOM-CAPACITY-PLAN",
    domain_module_name: "Capacity Planning",
    description:
      "Trend analysis, forecasting, and what-if modeling of compute, storage, network, and license consumption from periodic resource utilization snapshots, supporting proactive scaling and cost allocation.",
    capability_ids: [227], // CAPACITY
    data_objects: [
      { data_object_id: 87, role: "master", necessity: "required" }, // capacity_records
    ],
  },
  {
    domain_module_code: "ITOM-OPS-AUTOMATION",
    domain_module_name: "Operations Automation and Workload Scheduling",
    description:
      "Codified operational runbooks executed with approval gates for common incidents and maintenance tasks, plus enterprise job scheduling, batch automation, and dependency-aware cross-platform workload orchestration triggered by operational alerts.",
    capability_ids: [228, 226], // RUNBOOK, JOB-SCHED
    data_objects: [
      { data_object_id: 85, role: "embedded_master", necessity: "required" }, // monitoring_alerts (canonical in ITOM-INFRA-MON)
    ],
  },
];

async function getModuleIdMap(): Promise<Map<string, number>> {
  const rows = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`
  );
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.domain_module_code, r.id);
  return m;
}

async function upsertModules(): Promise<void> {
  const existing = await getModuleIdMap();
  const toInsert = MODULES.filter((m) => !existing.has(m.domain_module_code)).map((m) => ({
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
}

async function upsertCapabilities(moduleId: number, capabilityIds: number[]): Promise<void> {
  if (!capabilityIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capabilityIds.join(",")})&select=capability_id`
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

async function upsertDMDO(
  moduleId: number,
  rows: { data_object_id: number; role: string; necessity: string }[]
): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map((r) => r.data_object_id);
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`
  );
  const existingIds = new Set(existing.map((r: any) => r.data_object_id));
  const toInsert = rows
    .filter((r) => !existingIds.has(r.data_object_id))
    .map((r) => ({
      domain_module_id: moduleId,
      data_object_id: r.data_object_id,
      role: r.role,
      necessity: r.necessity,
    }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`  +${toInsert.length} DMDO rows on module ${moduleId}`);
  }
}

async function main() {
  console.log("=== Modularize ITOM (domain 2) ===");
  await upsertModules();
  const idMap = await getModuleIdMap();

  for (const m of MODULES) {
    const moduleId = idMap.get(m.domain_module_code);
    if (!moduleId) throw new Error(`module not found after insert: ${m.domain_module_code}`);
    console.log(`\n-- ${m.domain_module_code} (id ${moduleId}) --`);
    await upsertCapabilities(moduleId, m.capability_ids);
    await upsertDMDO(moduleId, m.data_objects);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
