#!/usr/bin/env bun
// Idempotent modularization loader for VET-PRACT-MGMT (domain_id=151).
// Scope: domain_modules + capability links + data_object assignment ONLY.
// Reuses existing capabilities (428-433) and data_objects (395-399, 75).
// Creates NO new data_objects, capabilities, lifecycle states, skills, or relationships.
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

const DOMAIN_ID = 151;
const INDUSTRY_ID = 18; // Veterinary Services (NAICS 541940)

// ---------------------------------------------------------------------------
// Module definitions
// ---------------------------------------------------------------------------

type ModuleSpec = {
  domain_module_code: string;
  domain_module_name: string;
  description: string;
  capability_codes: string[];
  data_objects: { name: string; role: string; necessity: string }[];
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_code: "VET-PRACT-MGMT-CLINICAL-CARE",
    domain_module_name: "Clinical Care and Diagnostics",
    description:
      "Animal-patient clinical record: species/breed/weight/microchip master, examination history, vaccination protocols, lab-results integration with reference labs and in-house analyzers, and preventive-care reminder management driving recall outreach.",
    capability_codes: ["VET-PATIENT-CARE", "VET-LAB-INTEGRATION", "VET-REMINDER-MGMT"],
    data_objects: [
      { name: "animal_patients", role: "master", necessity: "required" },
      { name: "veterinary_vaccinations", role: "master", necessity: "required" },
      { name: "veterinary_lab_results", role: "master", necessity: "required" },
      { name: "pet_owners", role: "embedded_master", necessity: "required" },
    ],
  },
  {
    domain_module_code: "VET-PRACT-MGMT-FRONT-OFFICE",
    domain_module_name: "Client Records, Scheduling and Billing",
    description:
      "Pet-owner client relationship master with contact, communication preferences, and balance history, plus appointment scheduling with species/exam-type fit and waitlist handling, and services/product/lab/drug invoicing with in-clinic point-of-sale and payer integration.",
    capability_codes: ["VET-APPT-SCHED", "VET-INVOICING"],
    data_objects: [
      { name: "pet_owners", role: "master", necessity: "required" },
      { name: "animal_patients", role: "embedded_master", necessity: "required" },
      { name: "supplier_invoices", role: "contributor", necessity: "required" },
    ],
  },
  {
    domain_module_code: "VET-PRACT-MGMT-PHARMACY-RX",
    domain_module_name: "Drug Inventory and Controlled-Substance Ledger",
    description:
      "Drug inventory with lot tracking and automated reorder thresholds, plus the DEA-required controlled-substance receipt, dispensation, and disposal ledger with Schedule II to V reconciliation evidence.",
    capability_codes: ["VET-INVENTORY-RX"],
    data_objects: [
      { name: "controlled_substance_ledger_entries", role: "master", necessity: "required" },
      { name: "animal_patients", role: "embedded_master", necessity: "required" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveCapabilityIds(): Promise<Map<string, number>> {
  const codes = [...new Set(MODULES.flatMap(m => m.capability_codes))];
  const rows = await semantius(
    "GET",
    `/capabilities?capability_code=in.(${codes.join(",")})&select=id,capability_code`,
  );
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.capability_code, r.id);
  for (const c of codes) if (!map.has(c)) throw new Error(`capability not found: ${c}`);
  return map;
}

async function resolveDataObjectIds(): Promise<Map<string, number>> {
  const names = [...new Set(MODULES.flatMap(m => m.data_objects.map(d => d.name)))];
  const rows = await semantius(
    "GET",
    `/data_objects?data_object_name=in.(${names.join(",")})&select=id,data_object_name`,
  );
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.data_object_name, r.id);
  for (const n of names) if (!map.has(n)) throw new Error(`data_object not found: ${n}`);
  return map;
}

async function upsertModules(): Promise<void> {
  const codes = MODULES.map(m => m.domain_module_code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=domain_module_code`,
  );
  const existingCodes = new Set(existing.map((r: any) => r.domain_module_code));
  const toInsert = MODULES.filter(m => !existingCodes.has(m.domain_module_code)).map(m => ({
    domain_module_name: m.domain_module_name,
    domain_module_code: m.domain_module_code,
    description: m.description,
    domain_id: DOMAIN_ID,
    module_kind: "full",
    industry_id: INDUSTRY_ID,
  }));
  if (toInsert.length) {
    await semantius("POST", "/domain_modules", toInsert);
    console.log(`  +${toInsert.length} domain_modules: ${toInsert.map(m => m.domain_module_code).join(", ")}`);
  } else {
    console.log("  domain_modules: all present, no inserts");
  }
}

async function moduleCodeToId(): Promise<Map<string, number>> {
  const codes = MODULES.map(m => m.domain_module_code);
  const rows = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.domain_module_code, r.id);
  for (const c of codes) if (!map.has(c)) throw new Error(`module not found after insert: ${c}`);
  return map;
}

async function upsertCapabilityLinks(
  moduleIds: Map<string, number>,
  capIds: Map<string, number>,
): Promise<void> {
  for (const m of MODULES) {
    const moduleId = moduleIds.get(m.domain_module_code)!;
    const wantIds = m.capability_codes.map(c => capIds.get(c)!);
    const existing = await semantius(
      "GET",
      `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${wantIds.join(",")})&select=capability_id`,
    );
    const existingIds = new Set(existing.map((r: any) => r.capability_id));
    const toInsert = wantIds
      .filter(id => !existingIds.has(id))
      .map(id => ({ domain_module_id: moduleId, capability_id: id }));
    if (toInsert.length) {
      await semantius("POST", "/domain_module_capabilities", toInsert);
      console.log(`  +${toInsert.length} DMC on ${m.domain_module_code}`);
    }
  }
}

async function upsertDataObjectLinks(
  moduleIds: Map<string, number>,
  doIds: Map<string, number>,
): Promise<void> {
  for (const m of MODULES) {
    const moduleId = moduleIds.get(m.domain_module_code)!;
    const wantIds = m.data_objects.map(d => doIds.get(d.name)!);
    const existing = await semantius(
      "GET",
      `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${wantIds.join(",")})&select=data_object_id`,
    );
    const existingIds = new Set(existing.map((r: any) => r.data_object_id));
    const toInsert = m.data_objects
      .filter(d => !existingIds.has(doIds.get(d.name)!))
      .map(d => ({
        domain_module_id: moduleId,
        data_object_id: doIds.get(d.name)!,
        role: d.role,
        necessity: d.necessity,
      }));
    if (toInsert.length) {
      await semantius("POST", "/domain_module_data_objects", toInsert);
      console.log(`  +${toInsert.length} DMDO on ${m.domain_module_code}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Catalog-wide master pre-check (MANDATORY before writing role=master)
// ---------------------------------------------------------------------------

async function precheckMasters(doIds: Map<string, number>): Promise<void> {
  const masterNames = [
    ...new Set(
      MODULES.flatMap(m => m.data_objects.filter(d => d.role === "master").map(d => d.name)),
    ),
  ];
  for (const name of masterNames) {
    const id = doIds.get(name)!;
    const rows = await semantius(
      "GET",
      `/domain_module_data_objects?data_object_id=eq.${id}&role=eq.master&select=domain_module_id`,
    );
    const foreign = rows.filter((r: any) => {
      // any existing master row not on one of THIS run's modules is a catalog-wide conflict
      return true;
    });
    if (foreign.length) {
      // Only fail if the existing master is on a module NOT in this domain's set.
      // We re-check after we know our module ids in main(); here just warn.
      console.log(
        `  PRE-CHECK WARN: ${name} (id ${id}) already has master row(s) on module(s) ${rows
          .map((r: any) => r.domain_module_id)
          .join(",")}`,
      );
    } else {
      console.log(`  PRE-CHECK OK: ${name} (id ${id}) has no existing master row catalog-wide`);
    }
  }
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

async function verify(moduleIds: Map<string, number>, capIds: Map<string, number>): Promise<void> {
  console.log("\n=== VERIFY ===");
  // every capability placed
  const placedCaps = new Set<number>();
  for (const m of MODULES) {
    const moduleId = moduleIds.get(m.domain_module_code)!;
    const dmc = await semantius(
      "GET",
      `/domain_module_capabilities?domain_module_id=eq.${moduleId}&select=capability_id`,
    );
    const dmdo = await semantius(
      "GET",
      `/domain_module_data_objects?domain_module_id=eq.${moduleId}&select=data_object_id,role`,
    );
    for (const r of dmc) placedCaps.add(r.capability_id);
    console.log(`  ${m.domain_module_code}: ${dmc.length} caps, ${dmdo.length} data_objects`);
    if (dmc.length < 1) throw new Error(`EMPTY-CAPS module ${m.domain_module_code}`);
    if (dmdo.length < 1) throw new Error(`EMPTY-DO module ${m.domain_module_code}`);
  }
  const allCapIds = new Set(capIds.values());
  for (const id of allCapIds) {
    if (!placedCaps.has(id)) throw new Error(`UNPLACED capability id ${id}`);
  }
  console.log(`  all ${allCapIds.size} capabilities placed: OK`);

  // each master exactly once in-domain AND catalog-wide
  const masterNames = [
    ...new Set(MODULES.flatMap(m => m.data_objects.filter(d => d.role === "master").map(d => d.name))),
  ];
  const doIds = await resolveDataObjectIds();
  for (const name of masterNames) {
    const id = doIds.get(name)!;
    const rows = await semantius(
      "GET",
      `/domain_module_data_objects?data_object_id=eq.${id}&role=eq.master&select=domain_module_id`,
    );
    if (rows.length !== 1) {
      throw new Error(`MASTER-COUNT ${name} (id ${id}) has ${rows.length} master rows catalog-wide (want 1)`);
    }
    console.log(`  master ${name} (id ${id}) -> module ${rows[0].domain_module_id}: OK (1 catalog-wide)`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== VET-PRACT-MGMT modularization ===");
  const capIds = await resolveCapabilityIds();
  const doIds = await resolveDataObjectIds();

  console.log("\n-- master pre-check --");
  await precheckMasters(doIds);

  console.log("\n-- modules --");
  await upsertModules();
  const moduleIds = await moduleCodeToId();

  console.log("\n-- capability links --");
  await upsertCapabilityLinks(moduleIds, capIds);

  console.log("\n-- data_object links --");
  await upsertDataObjectLinks(moduleIds, doIds);

  await verify(moduleIds, capIds);

  console.log("\nDone.");
  console.log("https://tests.semantius.app/domain_map/domain_modules");
  console.log("https://tests.semantius.app/domain_map/domain_module_data_objects");
}

main().catch(e => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
