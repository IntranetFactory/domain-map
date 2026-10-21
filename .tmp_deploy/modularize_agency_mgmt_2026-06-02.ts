#!/usr/bin/env bun
// Idempotent modularization of AGENCY-MGMT (domain id 153).
// Creates 3 full domain_modules, links existing capabilities, assigns existing
// data_objects at their existing role+necessity. Reuses entities only.
// Safe to re-run: every write checks the natural key first.

type Json = any;

const DOMAIN_ID = 153;

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

// ---- Module definitions -------------------------------------------------

type ModuleSpec = {
  domain_module_name: string;
  domain_module_code: string;
  description: string;
  capability_ids: number[];
  // data_objects assigned to this module, with their EXISTING role+necessity
  data_objects: { data_object_id: number; role: string; necessity: string }[];
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_name: "Job and Traffic Management",
    domain_module_code: "AGENCY-MGMT-JOB-TRAFFIC",
    description:
      "System-of-record for the agency book of business: client jobs with traffic state and deliverable rollup, time capture against client rate cards, retainer agreements with live burn-down, pre-engagement estimating with change orders, cost-plus / markup billing logic, and per-job and per-client profitability rollups.",
    capability_ids: [440, 441, 443, 444, 445, 30, 56, 77, 80],
    data_objects: [
      { data_object_id: 478, role: "master", necessity: "required" }, // agency_jobs
      { data_object_id: 479, role: "master", necessity: "required" }, // agency_time_entries
      { data_object_id: 480, role: "master", necessity: "required" }, // agency_retainers
      { data_object_id: 485, role: "master", necessity: "required" }, // agency_estimates
      { data_object_id: 97, role: "consumer", necessity: "required" }, // customers
      { data_object_id: 31, role: "consumer", necessity: "required" }, // employees
      { data_object_id: 66, role: "consumer", necessity: "required" }, // legal_contracts
      { data_object_id: 100, role: "consumer", necessity: "required" }, // crm_opportunities
    ],
  },
  {
    domain_module_name: "Media Plan and Insertion Order Management",
    domain_module_code: "AGENCY-MGMT-MEDIA-BUY",
    description:
      "Per-campaign media planning broken down by outlet, channel, daypart, audience, and budget; conversion of approved plans into insertion orders committing budget to media outlets at negotiated rates with commission terms and make-good provisions; reconciliation of orders against media-outlet invoices.",
    capability_ids: [442],
    data_objects: [
      { data_object_id: 481, role: "master", necessity: "required" }, // media_plans
      { data_object_id: 482, role: "master", necessity: "required" }, // insertion_orders
      { data_object_id: 206, role: "consumer", necessity: "required" }, // suppliers (media outlets)
      { data_object_id: 97, role: "consumer", necessity: "required" }, // customers
    ],
  },
  {
    domain_module_name: "Creative Operations and Proofing",
    domain_module_code: "AGENCY-MGMT-CREATIVE-OPS",
    description:
      "Creative production lifecycle from the initiating brief through deliverable authoring and multi-stakeholder proofing: brief origination and client approval, deliverable version history, annotated review and approval routing, and final-version registration to the asset library.",
    capability_ids: [446],
    data_objects: [
      { data_object_id: 483, role: "master", necessity: "required" }, // creative_briefs
      { data_object_id: 484, role: "master", necessity: "required" }, // creative_deliverables
      { data_object_id: 97, role: "consumer", necessity: "required" }, // customers
    ],
  },
];

// ---- Upsert helpers (idempotent by natural key) -------------------------

async function upsertModule(m: ModuleSpec): Promise<number> {
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

async function upsertCapabilities(moduleId: number, capabilityIds: number[]): Promise<number> {
  if (!capabilityIds.length) return 0;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capabilityIds.join(",")})&select=capability_id`,
  );
  const have = new Set(existing.map((r: any) => r.capability_id));
  const toInsert = capabilityIds
    .filter((id) => !have.has(id))
    .map((capability_id) => ({ domain_module_id: moduleId, capability_id }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`    +${toInsert.length} capability links on module ${moduleId}`);
  }
  return toInsert.length;
}

async function upsertDataObjects(
  moduleId: number,
  rows: { data_object_id: number; role: string; necessity: string }[],
): Promise<number> {
  if (!rows.length) return 0;
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
    console.log(`    +${toInsert.length} DMDO rows on module ${moduleId}`);
  }
  return toInsert.length;
}

// ---- Main ---------------------------------------------------------------

async function main() {
  console.log("=== Modularize AGENCY-MGMT (domain 153) ===");

  let capLinks = 0;
  let dmdoRows = 0;
  const codeToId = new Map<string, number>();

  for (const m of MODULES) {
    console.log(`\n--- ${m.domain_module_code} ---`);
    const moduleId = await upsertModule(m);
    codeToId.set(m.domain_module_code, moduleId);
    capLinks += await upsertCapabilities(moduleId, m.capability_ids);
    dmdoRows += await upsertDataObjects(moduleId, m.data_objects);
  }

  console.log("\n=== Verify ===");
  for (const m of MODULES) {
    const moduleId = codeToId.get(m.domain_module_code)!;
    const caps = await semantius(
      "GET",
      `/domain_module_capabilities?domain_module_id=eq.${moduleId}&select=capability_id`,
    );
    const dmdo = await semantius(
      "GET",
      `/domain_module_data_objects?domain_module_id=eq.${moduleId}&select=data_object_id,role,necessity`,
    );
    const masters = dmdo.filter((r: any) => r.role === "master").map((r: any) => r.data_object_id);
    console.log(
      `  ${m.domain_module_code} (id ${moduleId}): ${caps.length} caps, ${dmdo.length} DMDO (${masters.length} masters: ${masters.join(",")})`,
    );
  }

  // Cross-module check: every capability placed, every master exactly once.
  const allModules = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`,
  );
  const moduleIds = allModules.map((r: any) => r.id);
  const allCaps = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=in.(${moduleIds.join(",")})&select=capability_id`,
  );
  const placedCaps = new Set(allCaps.map((r: any) => r.capability_id));
  const domainCaps = await semantius(
    "GET",
    `/capability_domains?domain_id=eq.${DOMAIN_ID}&select=capability_id`,
  );
  const missingCaps = domainCaps
    .map((r: any) => r.capability_id)
    .filter((id: number) => !placedCaps.has(id));
  console.log(
    `\n  capability coverage: ${placedCaps.size}/${domainCaps.length} placed; missing: [${missingCaps.join(",")}]`,
  );

  const allDmdo = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds.join(",")})&role=eq.master&select=data_object_id,domain_module_id`,
  );
  const masterCount = new Map<number, number>();
  for (const r of allDmdo) masterCount.set(r.data_object_id, (masterCount.get(r.data_object_id) ?? 0) + 1);
  const multiMastered = [...masterCount.entries()].filter(([, c]) => c > 1);
  console.log(
    `  masters: ${masterCount.size} distinct; >1 module: [${multiMastered.map(([id, c]) => `${id}x${c}`).join(",")}]`,
  );

  console.log("\nDone.");
  console.log(`Totals this run: +${capLinks} capability links, +${dmdoRows} DMDO rows.`);
  console.log("\nUI: https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.153");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
