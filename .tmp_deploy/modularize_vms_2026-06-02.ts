#!/usr/bin/env bun
// Idempotent modularization of the VMS domain (Vendor Management System,
// contingent-workforce). Creates 2 full domain_modules, links the 5 existing
// capabilities, and assigns the 6 existing master data_objects at their roles.
// Reuses existing entities only. Safe to re-run.

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

const DOMAIN_ID = 64;

// ---------------------------------------------------------------------------
// Module specs
// ---------------------------------------------------------------------------
type ModuleSpec = {
  domain_module_name: string;
  domain_module_code: string;
  description: string;
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_name: "Worker Sourcing and Supplier Management",
    domain_module_code: "VMS-WORKER-SOURCING",
    description:
      "Raise staffing requisitions, distribute them to tiered staffing suppliers, govern pre-agreed rate cards, and onboard contingent workers with a typed classification basis. Procurement governs the supplier panel and rate cards; HR governs worker classification.",
  },
  {
    domain_module_name: "Contingent Time and Invoicing",
    domain_module_code: "VMS-TIME-INVOICING",
    description:
      "Capture and approve contingent timesheets against assignments, then compute and reconcile supplier invoices from approved hours and rate cards for downstream three-way match and payment.",
  },
];

// capability_id list per module code (every capability placed in >=1 module)
const MODULE_CAPS: Record<string, number[]> = {
  "VMS-WORKER-SOURCING": [54, 55, 56, 58], // WORKER-REQ, STAFFING-SUPPLIER, RATE-MGMT, WORKER-CLASS
  "VMS-TIME-INVOICING": [57], // CONTINGENT-TIME
};

// data_object assignments per module code.
// role in {master, embedded_master, contributor, consumer, derived}
// necessity in {required, optional}
// Each master assigned in EXACTLY ONE module (M7); catalog-wide pre-check
// confirmed none of these 6 is mastered anywhere else.
type DMDORow = { data_object_id: number; role: string; necessity: string };
const MODULE_DMDO: Record<string, DMDORow[]> = {
  "VMS-WORKER-SOURCING": [
    { data_object_id: 187, role: "master", necessity: "required" }, // pm_work_orders (staffing requisition / SOW per description)
    { data_object_id: 188, role: "master", necessity: "required" }, // staffing_suppliers
    { data_object_id: 189, role: "master", necessity: "required" }, // rate_cards
    { data_object_id: 186, role: "master", necessity: "required" }, // contingent_workers
  ],
  "VMS-TIME-INVOICING": [
    { data_object_id: 190, role: "master", necessity: "required" }, // contingent_timesheets
    { data_object_id: 191, role: "master", necessity: "required" }, // contingent_invoices
    { data_object_id: 186, role: "consumer", necessity: "required" }, // contingent_workers (whose time)
    { data_object_id: 189, role: "consumer", necessity: "required" }, // rate_cards (bill-rate basis)
  ],
};

async function upsertModules(): Promise<Map<string, number>> {
  const codes = MODULES.map(m => m.domain_module_code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const existingCodes = new Set(existing.map((r: any) => r.domain_module_code));
  const toInsert = MODULES.filter(m => !existingCodes.has(m.domain_module_code)).map(m => ({
    domain_module_name: m.domain_module_name,
    domain_module_code: m.domain_module_code,
    description: m.description,
    domain_id: DOMAIN_ID,
    module_kind: "full",
  }));
  if (toInsert.length) {
    await semantius("POST", "/domain_modules", toInsert);
    console.log(`  +${toInsert.length} domain_modules: ${toInsert.map(m => m.domain_module_code).join(", ")}`);
  } else {
    console.log("  domain_modules already present");
  }
  // Re-read for code -> id map
  const all = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  return map;
}

async function upsertCaps(moduleId: number, capIds: number[]): Promise<void> {
  if (!capIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capIds.join(",")})&select=capability_id`,
  );
  const existingIds = new Set(existing.map((r: any) => r.capability_id));
  const toInsert = capIds
    .filter(id => !existingIds.has(id))
    .map(id => ({ domain_module_id: moduleId, capability_id: id }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`  +${toInsert.length} capability links on module ${moduleId}`);
  }
}

async function upsertDMDO(moduleId: number, rows: DMDORow[]): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map(r => r.data_object_id);
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`,
  );
  const existingIds = new Set(existing.map((r: any) => r.data_object_id));
  const toInsert = rows
    .filter(r => !existingIds.has(r.data_object_id))
    .map(r => ({ ...r, domain_module_id: moduleId }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`  +${toInsert.length} DMDO rows on module ${moduleId}`);
  }
}

async function main() {
  console.log("=== VMS modularization ===");

  // Catalog-wide master pre-check (mandatory): re-confirm none of the 6 masters
  // is already mastered in any module before we write role=master.
  const masterIds = [186, 187, 188, 189, 190, 191];
  const clash = await semantius(
    "GET",
    `/domain_module_data_objects?data_object_id=in.(${masterIds.join(",")})&role=eq.master&select=domain_module_id,data_object_id`,
  );
  const clashByObj = new Map<number, number[]>();
  for (const r of clash) {
    if (!clashByObj.has(r.data_object_id)) clashByObj.set(r.data_object_id, []);
    clashByObj.get(r.data_object_id)!.push(r.domain_module_id);
  }

  const codeToId = await upsertModules();
  const vmsModuleIds = new Set([...codeToId.values()]);

  // Demote any intended master that is already mastered OUTSIDE this domain's modules.
  for (const [code, rows] of Object.entries(MODULE_DMDO)) {
    for (const row of rows) {
      if (row.role !== "master") continue;
      const owners = (clashByObj.get(row.data_object_id) ?? []).filter(mid => !vmsModuleIds.has(mid));
      if (owners.length) {
        console.log(
          `  PRE-CHECK demotion: data_object ${row.data_object_id} already mastered in module(s) ${owners.join(",")}; assigning embedded_master in ${code}`,
        );
        row.role = "embedded_master";
      }
    }
  }

  for (const m of MODULES) {
    const id = codeToId.get(m.domain_module_code);
    if (!id) throw new Error(`module id missing for ${m.domain_module_code}`);
    console.log(`\n-- ${m.domain_module_code} (id ${id}) --`);
    await upsertCaps(id, MODULE_CAPS[m.domain_module_code] ?? []);
    await upsertDMDO(id, MODULE_DMDO[m.domain_module_code] ?? []);
  }

  // Verification
  console.log("\n=== Verify ===");
  const placedCaps = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=in.(${[...vmsModuleIds].join(",")})&select=capability_id`,
  );
  const placedCapSet = new Set(placedCaps.map((r: any) => r.capability_id));
  const allCaps = [54, 55, 56, 57, 58];
  const missing = allCaps.filter(c => !placedCapSet.has(c));
  console.log(`  capabilities placed: ${[...placedCapSet].sort((a, b) => a - b).join(",")}  (missing: ${missing.length ? missing.join(",") : "none"})`);

  for (const m of MODULES) {
    const id = codeToId.get(m.domain_module_code)!;
    const dmdo = await semantius(
      "GET",
      `/domain_module_data_objects?domain_module_id=eq.${id}&select=data_object_id,role,necessity`,
    );
    console.log(`  ${m.domain_module_code}: ${dmdo.length} DMDO rows -> ${dmdo.map((r: any) => `${r.data_object_id}:${r.role}`).join(", ")}`);
  }

  // catalog-wide single-master check on the 6 masters
  for (const did of masterIds) {
    const owners = await semantius(
      "GET",
      `/domain_module_data_objects?data_object_id=eq.${did}&role=eq.master&select=domain_module_id`,
    );
    const flag = owners.length === 1 ? "ok" : `WARN(${owners.length})`;
    console.log(`  master ${did}: ${owners.length} master module(s) [${flag}]`);
  }

  console.log("\nDone.");
}

main().catch(e => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
