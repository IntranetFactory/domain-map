#!/usr/bin/env bun
// Idempotent modularization loader for the TELEMATICS domain (domains.id = 148).
// Scope: domain_modules + domain_module_capabilities + domain_module_data_objects ONLY.
// Reuses existing capabilities and data_objects; creates NO new entities.
// Safe to re-run.

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

const DOMAIN_ID = 148;

type ModuleSpec = {
  domain_module_name: string;
  domain_module_code: string;
  description: string;
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_name: "Fleet Tracking and Telemetry",
    domain_module_code: "TELEMATICS-FLEET-TRACKING",
    description:
      "Continuous vehicle-location and movement telemetry: GPS waypoint streaming, trip segmentation, idle detection, geofence crossings, and engine-diagnostic ingestion. The position-and-utilization data layer feeding live maps, route playback, and downstream fleet analytics.",
  },
  {
    domain_module_name: "Compliance and Driver Safety",
    domain_module_code: "TELEMATICS-COMPLIANCE-SAFETY",
    description:
      "The regulated and safety-facing surface: electronic hours-of-service logs, video-telematics incident capture, driver-behavior event detection, and composite safety scoring. Hosts the FMCSA hours-of-service compliance leg and the video-and-coaching workflow that turns risky-event triggers into driver safety outcomes.",
  },
];

// domain_module_capabilities: code -> capability ids
const CAPS: Record<string, number[]> = {
  "TELEMATICS-FLEET-TRACKING": [410, 414, 415], // GPS tracking, geofencing, vehicle diagnostics
  "TELEMATICS-COMPLIANCE-SAFETY": [411, 412, 413], // ELD/HOS, driver behavior, dashcam video
};

type DMDOSpec = { data_object_id: number; role: string; necessity: string };

// domain_module_data_objects: code -> rows. Masters verified single (in-domain + catalog-wide).
// fleet_vehicles (370) FLEET-MGMT-mastered; fleet_drivers (371) FLEET-MGMT-mastered => consumer here.
const DMDO: Record<string, DMDOSpec[]> = {
  "TELEMATICS-FLEET-TRACKING": [
    { data_object_id: 375, role: "master", necessity: "required" }, // vehicle_trips
    { data_object_id: 731, role: "master", necessity: "required" }, // gps_waypoints
    { data_object_id: 732, role: "master", necessity: "required" }, // idle_events
    { data_object_id: 733, role: "master", necessity: "required" }, // geofence_events
    { data_object_id: 370, role: "consumer", necessity: "required" }, // fleet_vehicles (FLEET-MGMT master)
    { data_object_id: 371, role: "consumer", necessity: "required" }, // fleet_drivers (FLEET-MGMT master)
  ],
  "TELEMATICS-COMPLIANCE-SAFETY": [
    { data_object_id: 377, role: "master", necessity: "required" }, // eld_logs
    { data_object_id: 378, role: "master", necessity: "required" }, // dashcam_events
    { data_object_id: 376, role: "master", necessity: "required" }, // driver_behavior_events
    { data_object_id: 734, role: "master", necessity: "required" }, // driver_safety_scorecards
    { data_object_id: 371, role: "consumer", necessity: "required" }, // fleet_drivers (FLEET-MGMT master)
  ],
};

async function upsertModules(): Promise<Map<string, number>> {
  const codes = MODULES.map((m) => m.domain_module_code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`
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
    console.log(`  +${toInsert.length} domain_modules: ${toInsert.map((m) => m.domain_module_code).join(", ")}`);
  }
  // Re-read to build code -> id map
  const all = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  return map;
}

async function upsertCaps(moduleId: number, capIds: number[]): Promise<void> {
  if (!capIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capIds.join(",")})&select=capability_id`
  );
  const existingIds = new Set(existing.map((r: any) => r.capability_id));
  const toInsert = capIds
    .filter((id) => !existingIds.has(id))
    .map((id) => ({ domain_module_id: moduleId, capability_id: id }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`  +${toInsert.length} DMC rows on module ${moduleId}`);
  }
}

async function upsertDMDO(moduleId: number, rows: DMDOSpec[]): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map((r) => r.data_object_id);
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`
  );
  const existingIds = new Set(existing.map((r: any) => r.data_object_id));
  const toInsert = rows
    .filter((r) => !existingIds.has(r.data_object_id))
    .map((r) => ({ ...r, domain_module_id: moduleId }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`  +${toInsert.length} DMDO rows on module ${moduleId}`);
  }
}

async function main() {
  console.log("=== Modularizing TELEMATICS (domain 148) ===");
  const idMap = await upsertModules();
  for (const m of MODULES) {
    const moduleId = idMap.get(m.domain_module_code)!;
    console.log(`\n-- ${m.domain_module_code} (id ${moduleId}) --`);
    await upsertCaps(moduleId, CAPS[m.domain_module_code]);
    await upsertDMDO(moduleId, DMDO[m.domain_module_code]);
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
