#!/usr/bin/env bun
// Idempotent loader: modularize SAM (domain_id 52).
// Scope: create domain_modules (Phase M), link capabilities (DMC), assign existing
// data_objects (DMDO) preserving role + necessity. No new data_objects / capabilities /
// lifecycle / skills / handoffs / relationships. Safe to re-run.

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

const DOMAIN_ID = 52;

// --- existing entity ids (verified live 2026-06-02) ---
// capabilities
const CAP = {
  DISCOVERY: 234,
  ENTITLEMENT: 235,
  AUDIT: 236,
  METER: 237,
  RENEWAL: 238,
};
// data_objects with their EXISTING role + necessity from domain_data_objects
const DO = {
  software_titles: { id: 57, role: "master", necessity: "required" },
  software_licenses: { id: 58, role: "master", necessity: "required" },
  software_installations: { id: 59, role: "master", necessity: "required" },
  license_audits: { id: 60, role: "master", necessity: "required" },
  configuration_items: { id: 76, role: "contributor", necessity: "required" },
  org_units: { id: 34, role: "embedded_master", necessity: "required" },
};

// --- module design (3 full modules) ---
type ModuleSpec = {
  code: string;
  name: string;
  description: string;
  capabilities: number[];
  // data_object key -> { master in this module? }. role/necessity copied from DO unless master override.
  dataObjects: { key: keyof typeof DO; role?: string; necessity?: string }[];
};

const MODULES: ModuleSpec[] = [
  {
    code: "SAM-CATALOG-DISCOVERY",
    name: "Software Catalog and Installation Discovery",
    description:
      "Maintains the normalized publisher/product software catalog and the agent-based and agent-less inventory of installed software across endpoints. Masters the canonical software product catalog and the discovered-installation record, overlaying configuration-item and org-unit context.",
    capabilities: [CAP.DISCOVERY],
    dataObjects: [
      { key: "software_titles" }, // master here (single-master)
      { key: "software_installations" }, // master here (single-master)
      { key: "configuration_items" }, // contributor (CMDB-mastered)
      { key: "org_units" }, // embedded_master (HCM-mastered)
    ],
  },
  {
    code: "SAM-ENTITLEMENT-MGMT",
    name: "Entitlement Reconciliation and Renewal",
    description:
      "Reconciles installed and used software against purchased entitlements, meters per-application usage to drive reclamation of unused licenses, and manages renewal dates, true-up windows, and co-termination decisions. Masters the license entitlement record.",
    capabilities: [CAP.ENTITLEMENT, CAP.METER, CAP.RENEWAL],
    dataObjects: [
      { key: "software_licenses" }, // master here (single-master)
    ],
  },
  {
    code: "SAM-AUDIT-DEFENSE",
    name: "Audit Defense and Compliance Reporting",
    description:
      "Collects deployment and usage evidence, attests compliance, and assembles reporting packages tailored to publisher audit demands and internal true-up reviews. Masters the audit/true-up record.",
    capabilities: [CAP.AUDIT],
    dataObjects: [
      { key: "license_audits" }, // master here (single-master)
    ],
  },
];

async function upsertModule(m: ModuleSpec): Promise<number> {
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_module_code=eq.${m.code}&select=id`,
  );
  if (existing?.length) {
    console.log(`  = module ${m.code} exists (id ${existing[0].id})`);
    return existing[0].id;
  }
  await semantius("POST", "/domain_modules", [
    {
      domain_module_name: m.name,
      domain_module_code: m.code,
      description: m.description,
      domain_id: DOMAIN_ID,
      module_kind: "full",
    },
  ]);
  const reread = await semantius(
    "GET",
    `/domain_modules?domain_module_code=eq.${m.code}&select=id`,
  );
  if (!reread?.length) throw new Error(`module insert failed: ${m.code}`);
  console.log(`  + module ${m.code} (id ${reread[0].id})`);
  return reread[0].id;
}

async function upsertDMC(moduleId: number, capabilityIds: number[]): Promise<void> {
  if (!capabilityIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capabilityIds.join(",")})&select=capability_id`,
  );
  const have = new Set(existing.map((r: any) => r.capability_id));
  const toInsert = capabilityIds
    .filter((c) => !have.has(c))
    .map((c) => ({ domain_module_id: moduleId, capability_id: c }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`    +${toInsert.length} capability link(s) on module ${moduleId}`);
  }
}

async function upsertDMDO(moduleId: number, specs: ModuleSpec["dataObjects"]): Promise<void> {
  if (!specs.length) return;
  const rows = specs.map((s) => {
    const base = DO[s.key];
    return {
      domain_module_id: moduleId,
      data_object_id: base.id,
      role: s.role ?? base.role,
      necessity: s.necessity ?? base.necessity,
    };
  });
  const ids = rows.map((r) => r.data_object_id);
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`,
  );
  const have = new Set(existing.map((r: any) => r.data_object_id));
  const toInsert = rows.filter((r) => !have.has(r.data_object_id));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`    +${toInsert.length} DMDO row(s) on module ${moduleId}`);
  }
}

async function main() {
  console.log("=== Modularize SAM (domain 52) ===");

  // M7 guard: each master data_object mastered in exactly one module across the design.
  const masterCount = new Map<number, number>();
  for (const m of MODULES) {
    for (const s of m.dataObjects) {
      const role = s.role ?? DO[s.key].role;
      if (role === "master") {
        masterCount.set(DO[s.key].id, (masterCount.get(DO[s.key].id) ?? 0) + 1);
      }
    }
  }
  for (const [id, n] of masterCount) {
    if (n !== 1) throw new Error(`M7 violation: data_object ${id} mastered in ${n} modules`);
  }

  // empty-module guard
  for (const m of MODULES) {
    if (!m.capabilities.length) throw new Error(`M6 violation: ${m.code} realizes no capability`);
    if (!m.dataObjects.length) throw new Error(`empty module: ${m.code} holds no data_object`);
  }

  const codeToId = new Map<string, number>();
  for (const m of MODULES) {
    const id = await upsertModule(m);
    codeToId.set(m.code, id);
  }

  // re-read all module ids fresh from natural key
  for (const m of MODULES) {
    const id = codeToId.get(m.code)!;
    await upsertDMC(id, m.capabilities);
    await upsertDMDO(id, m.dataObjects);
  }

  console.log("\nDone.");
  console.log("UI: https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.52");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
