#!/usr/bin/env bun
// Idempotent modularization loader for RE-CRE (Commercial Real Estate Operations, domain_id=145).
// Scope: domain_modules + domain_module_capabilities + domain_module_data_objects ONLY.
// Reuses existing capabilities + data_objects. Creates no new entities.
// Safe to re-run.

type Json = any;

const DOMAIN_ID = 145;
const INDUSTRY_ID = 15; // Real Estate

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

// ---- Module specs ----
type ModuleSpec = {
  domain_module_name: string;
  domain_module_code: string;
  description: string;
  capability_ids: number[];
  data_objects: { data_object_id: number; role: string; necessity: string }[];
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_name: "Commercial Leasing Pipeline",
    domain_module_code: "RE-CRE-LEASING",
    description:
      "Manage CRE deals from prospect through letter-of-intent to executed lease, including lease-clause negotiation, sublease grants, and commercial-tenant credit underwriting that gates leasing decisions.",
    capability_ids: [392], // RE-CRE-LEASING-PIPELINE
    data_objects: [
      { data_object_id: 363, role: "master", necessity: "required" }, // commercial_leases
      { data_object_id: 719, role: "master", necessity: "required" }, // tenant_credit_records
      { data_object_id: 720, role: "master", necessity: "required" }, // sublease_transactions
      { data_object_id: 366, role: "contributor", necessity: "required" }, // investment_properties
    ],
  },
  {
    domain_module_name: "CAM Reconciliation and Rent Escalations",
    domain_module_code: "RE-CRE-CAM-OPS",
    description:
      "Annual reconciliation of common-area-maintenance expense pools across tenants with gross-up to occupancy and audit caps, plus CPI-indexed, stepped, fixed-percent, and percentage-rent escalation calculations against breakpoints.",
    capability_ids: [393, 397], // CAM-RECONCILE, RENT-ESCALATIONS
    data_objects: [
      { data_object_id: 365, role: "master", necessity: "required" }, // cam_charges
    ],
  },
  {
    domain_module_name: "Space Inventory and Market Intelligence",
    domain_module_code: "RE-CRE-SPACE-MARKET",
    description:
      "Visualize building stacking plans by floor and suite, track vacant, leased, and expiring space, benchmark lease and sale comparables by submarket, manage commercial-tenant relations, and maintain property certifications that support underwriting and tenant appeal.",
    capability_ids: [394, 395, 396], // STACKING-PLANS, MARKET-COMPS, TENANT-RELATIONS
    data_objects: [
      { data_object_id: 364, role: "master", necessity: "required" }, // stacking_plans
      { data_object_id: 721, role: "master", necessity: "required" }, // building_certifications
    ],
  },
];

// ---- Catalog-wide master pre-check ----
async function precheckMaster(dataObjectId: number): Promise<number | null> {
  const r = await semantius(
    "GET",
    `/domain_module_data_objects?data_object_id=eq.${dataObjectId}&role=eq.master&select=domain_module_id`,
  );
  if (r?.length) return r[0].domain_module_id;
  return null;
}

async function ensureModule(m: ModuleSpec): Promise<number> {
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_module_code=eq.${m.domain_module_code}&select=id`,
  );
  if (existing?.length) {
    console.log(`  module exists: ${m.domain_module_code} (id ${existing[0].id})`);
    return existing[0].id;
  }
  await semantius("POST", "/domain_modules", [
    {
      domain_module_name: m.domain_module_name,
      domain_module_code: m.domain_module_code,
      description: m.description,
      domain_id: DOMAIN_ID,
      module_kind: "full",
      industry_id: INDUSTRY_ID,
    },
  ]);
  const created = await semantius(
    "GET",
    `/domain_modules?domain_module_code=eq.${m.domain_module_code}&select=id`,
  );
  if (!created?.length) throw new Error(`module insert failed: ${m.domain_module_code}`);
  console.log(`  +module ${m.domain_module_code} (id ${created[0].id})`);
  return created[0].id;
}

async function ensureCapabilities(moduleId: number, capIds: number[]): Promise<void> {
  if (!capIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capIds.join(",")})&select=capability_id`,
  );
  const have = new Set(existing.map((r: any) => r.capability_id));
  const toInsert = capIds
    .filter((id) => !have.has(id))
    .map((capability_id) => ({ domain_module_id: moduleId, capability_id }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`  +${toInsert.length} capability links on module ${moduleId}`);
  }
}

async function ensureDataObjects(
  moduleId: number,
  rows: { data_object_id: number; role: string; necessity: string }[],
): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map((r) => r.data_object_id);
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`,
  );
  const have = new Set(existing.map((r: any) => r.data_object_id));
  const toInsert = rows
    .filter((r) => !have.has(r.data_object_id))
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
  console.log("=== RE-CRE modularization ===");

  // Pre-check: every intended master must have NO existing catalog-wide master row.
  console.log("\n-- catalog-wide master pre-check --");
  for (const m of MODULES) {
    for (const d of m.data_objects) {
      if (d.role !== "master") continue;
      const existingModule = await precheckMaster(d.data_object_id);
      if (existingModule !== null) {
        throw new Error(
          `PRE-CHECK FAIL: data_object ${d.data_object_id} already mastered by module ${existingModule}. ` +
            `Demote to embedded_master in ${m.domain_module_code} and re-run.`,
        );
      }
      console.log(`  ok: data_object ${d.data_object_id} has no existing master (clear for ${m.domain_module_code})`);
    }
  }

  for (const m of MODULES) {
    console.log(`\n-- ${m.domain_module_code} --`);
    const moduleId = await ensureModule(m);
    await ensureCapabilities(moduleId, m.capability_ids);
    await ensureDataObjects(moduleId, m.data_objects);
  }

  // ---- Verify ----
  console.log("\n=== verification ===");
  const modules = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code,module_kind,industry_id`,
  );
  console.log(`modules: ${modules.length}`);
  for (const mod of modules) {
    const caps = await semantius(
      "GET",
      `/domain_module_capabilities?domain_module_id=eq.${mod.id}&select=capability_id`,
    );
    const dos = await semantius(
      "GET",
      `/domain_module_data_objects?domain_module_id=eq.${mod.id}&select=data_object_id,role,necessity`,
    );
    console.log(
      `  ${mod.domain_module_code} (id ${mod.id}, kind=${mod.module_kind}, industry=${mod.industry_id}): ` +
        `${caps.length} caps, ${dos.length} DMDO [${dos.map((d: any) => `${d.data_object_id}:${d.role}`).join(", ")}]`,
    );
  }

  // capability coverage
  const allCapLinks = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=in.(${modules.map((m: any) => m.id).join(",")})&select=capability_id`,
  );
  const placedCaps = new Set(allCapLinks.map((r: any) => r.capability_id));
  const domainCaps = await semantius(
    "GET",
    `/capability_domains?domain_id=eq.${DOMAIN_ID}&select=capability_id`,
  );
  const missing = domainCaps.map((r: any) => r.capability_id).filter((id: number) => !placedCaps.has(id));
  console.log(`capabilities placed: ${placedCaps.size}/${domainCaps.length}; missing: [${missing.join(", ")}]`);

  // master uniqueness (catalog-wide) for our 6 masters
  console.log("master uniqueness check:");
  for (const doid of [363, 364, 365, 719, 720, 721]) {
    const masters = await semantius(
      "GET",
      `/domain_module_data_objects?data_object_id=eq.${doid}&role=eq.master&select=domain_module_id`,
    );
    const flag = masters.length === 1 ? "OK" : "VIOLATION";
    console.log(`  data_object ${doid}: ${masters.length} master row(s) [${flag}]`);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
