#!/usr/bin/env bun
// Idempotent modularizer for the WFM domain (id 59).
// Creates the 3-module full split, links capabilities, and assigns existing
// data_objects to modules preserving their existing role + necessity.
// Scope: domain_modules + domain_module_capabilities + domain_module_data_objects ONLY.
// Safe to re-run. No record_status (R1). No notes (R15). No vendor names (R18).

type Json = any;

const DOMAIN_ID = 59;

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

// ------------------------------------------------------------------
// Module definitions (domain_module_code is the natural key)
// ------------------------------------------------------------------
type ModuleSpec = {
  domain_module_code: string;
  domain_module_name: string;
  description: string;
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_code: "WFM-TIME-ATTENDANCE",
    domain_module_name: "Time and Attendance",
    description:
      "Captures clock-in / clock-out and break events, runs time-card collection and approval, and enforces break-and-meal labor-law compliance. Approved time becomes the payroll handoff payload.",
  },
  {
    domain_module_code: "WFM-SCHEDULING",
    domain_module_name: "Workforce Scheduling",
    description:
      "Builds demand-driven shift schedules and rosters, assigns shifts with skill matching and dispatch, supports swaps and self-scheduling, and reconciles budgeted-versus-actual labor hours from labor-demand forecasts.",
  },
  {
    domain_module_code: "WFM-ABSENCE",
    domain_module_name: "Absence and Leave",
    description:
      "Manages time-off requests, statutory and discretionary leave, accrual and entitlement policies, and per-worker leave balances tracked against those policies.",
  },
];

// capability code -> realizing module code
const CAPABILITY_PLACEMENT: Record<string, string> = {
  "TIME-TRACKING": "WFM-TIME-ATTENDANCE",
  "LABOR-COMPLIANCE": "WFM-TIME-ATTENDANCE",
  "SCHEDULING": "WFM-SCHEDULING",
  "LABOR-FORECAST": "WFM-SCHEDULING",
  "WORKFORCE-SCHEDULING": "WFM-SCHEDULING",
  "ABSENCE-MGMT": "WFM-ABSENCE",
};

// data_object_name -> { module code, role, necessity }
// Roles + necessity copied from /domain_data_objects (preserved verbatim).
// Masters land in EXACTLY ONE module (M7). Embedded masters may repeat where
// genuinely consumed.
type DMDOPlacement = { module: string; role: string; necessity: string };
const DMDO_PLACEMENT: Record<string, DMDOPlacement[]> = {
  // --- WFM-owned masters (single-master, M7) ---
  time_entries: [{ module: "WFM-TIME-ATTENDANCE", role: "master", necessity: "required" }],
  meal_break_records: [{ module: "WFM-TIME-ATTENDANCE", role: "master", necessity: "required" }],
  work_schedules: [{ module: "WFM-SCHEDULING", role: "master", necessity: "required" }],
  work_shifts: [{ module: "WFM-SCHEDULING", role: "master", necessity: "required" }],
  absence_requests: [{ module: "WFM-ABSENCE", role: "master", necessity: "required" }],
  absence_balances: [{ module: "WFM-ABSENCE", role: "master", necessity: "required" }],
  time_off_policies: [{ module: "WFM-ABSENCE", role: "master", necessity: "required" }],

  // --- shared embedded masters (HCM / Finance owned; preserved role + necessity) ---
  // employees: the schedulable / timekept person; consumed by all three modules.
  employees: [
    { module: "WFM-TIME-ATTENDANCE", role: "embedded_master", necessity: "required" },
    { module: "WFM-SCHEDULING", role: "embedded_master", necessity: "required" },
    { module: "WFM-ABSENCE", role: "embedded_master", necessity: "required" },
  ],
  // org_units: location / department scoping for scheduling and time; absence by org.
  org_units: [
    { module: "WFM-TIME-ATTENDANCE", role: "embedded_master", necessity: "required" },
    { module: "WFM-SCHEDULING", role: "embedded_master", necessity: "required" },
    { module: "WFM-ABSENCE", role: "embedded_master", necessity: "required" },
  ],
  // hcm_positions: the slot a worker fills; drives schedulable headcount and time costing.
  hcm_positions: [
    { module: "WFM-TIME-ATTENDANCE", role: "embedded_master", necessity: "required" },
    { module: "WFM-SCHEDULING", role: "embedded_master", necessity: "required" },
  ],
  // job_profiles: role definition / required skills; drives skill-matched scheduling.
  job_profiles: [
    { module: "WFM-SCHEDULING", role: "embedded_master", necessity: "required" },
  ],
  // cost_centers: optional costing dimension on logged time.
  cost_centers: [
    { module: "WFM-TIME-ATTENDANCE", role: "embedded_master", necessity: "optional" },
  ],
};

async function upsertModules(): Promise<Map<string, number>> {
  console.log("\n=== domain_modules ===");
  const codes = MODULES.map((m) => m.domain_module_code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=domain_module_code`,
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
    console.log(`  +${toInsert.length} modules: ${toInsert.map((m) => m.domain_module_code).join(", ")}`);
  } else {
    console.log("  (all modules already present)");
  }
  // Re-read to build code -> id (never hard-code ids).
  const all = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  for (const code of codes) if (!map.has(code)) throw new Error(`module not found after insert: ${code}`);
  return map;
}

async function resolveCapabilityIds(): Promise<Map<string, number>> {
  const codes = Object.keys(CAPABILITY_PLACEMENT);
  const rows = await semantius(
    "GET",
    `/capabilities?capability_code=in.(${codes.join(",")})&select=id,capability_code`,
  );
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.capability_code, r.id);
  for (const code of codes) if (!map.has(code)) throw new Error(`capability not found: ${code}`);
  return map;
}

async function resolveDataObjectIds(): Promise<Map<string, number>> {
  const names = Object.keys(DMDO_PLACEMENT);
  const rows = await semantius(
    "GET",
    `/data_objects?data_object_name=in.(${names.join(",")})&select=id,data_object_name`,
  );
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.data_object_name, r.id);
  for (const name of names) if (!map.has(name)) throw new Error(`data_object not found: ${name}`);
  return map;
}

async function upsertCapabilityLinks(moduleIds: Map<string, number>, capIds: Map<string, number>) {
  console.log("\n=== domain_module_capabilities ===");
  // Build desired rows.
  const desired = Object.entries(CAPABILITY_PLACEMENT).map(([capCode, modCode]) => ({
    domain_module_id: moduleIds.get(modCode)!,
    capability_id: capIds.get(capCode)!,
  }));
  const moduleIdList = [...new Set(desired.map((d) => d.domain_module_id))];
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=in.(${moduleIdList.join(",")})&select=domain_module_id,capability_id`,
  );
  const existingKeys = new Set(existing.map((r: any) => `${r.domain_module_id}::${r.capability_id}`));
  const toInsert = desired.filter((d) => !existingKeys.has(`${d.domain_module_id}::${d.capability_id}`));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`  +${toInsert.length} capability links`);
  } else {
    console.log("  (all capability links already present)");
  }
}

async function upsertDMDO(moduleIds: Map<string, number>, doIds: Map<string, number>) {
  console.log("\n=== domain_module_data_objects ===");
  type Row = { domain_module_id: number; data_object_id: number; role: string; necessity: string };
  const desired: Row[] = [];
  for (const [name, placements] of Object.entries(DMDO_PLACEMENT)) {
    for (const p of placements) {
      desired.push({
        domain_module_id: moduleIds.get(p.module)!,
        data_object_id: doIds.get(name)!,
        role: p.role,
        necessity: p.necessity,
      });
    }
  }
  const moduleIdList = [...new Set(desired.map((d) => d.domain_module_id))];
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=in.(${moduleIdList.join(",")})&select=domain_module_id,data_object_id`,
  );
  const existingKeys = new Set(existing.map((r: any) => `${r.domain_module_id}::${r.data_object_id}`));
  const toInsert = desired.filter((d) => !existingKeys.has(`${d.domain_module_id}::${d.data_object_id}`));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`  +${toInsert.length} DMDO rows`);
  } else {
    console.log("  (all DMDO rows already present)");
  }
}

async function main() {
  const moduleIds = await upsertModules();
  const capIds = await resolveCapabilityIds();
  const doIds = await resolveDataObjectIds();
  await upsertCapabilityLinks(moduleIds, capIds);
  await upsertDMDO(moduleIds, doIds);
  console.log("\nDone.");
  console.log("module ids:", Object.fromEntries(moduleIds));
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
