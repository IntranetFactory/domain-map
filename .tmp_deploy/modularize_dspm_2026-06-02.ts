#!/usr/bin/env bun
// Idempotent modularization loader for DSPM (Data Security Posture Management, domain id=140).
// Scope: domain_modules + domain_module_capabilities + domain_module_data_objects ONLY.
// Reuses existing capabilities and data_objects. Creates NO new data_objects, capabilities,
// lifecycle states, skills, tools, handoffs, or relationships. Safe to re-run.

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

const DOMAIN_ID = 140;

type ModuleSpec = {
  domain_module_name: string;
  domain_module_code: string;
  description: string;
  capability_ids: number[];
  dmdo: { data_object_id: number; role: string; necessity: string }[];
};

// Capability ids (DSPM, domain 140):
//   366 DSPM-DATA-DISCOVERY, 367 DSPM-CLASSIFICATION, 368 DSPM-ACCESS-AUDIT,
//   369 DSPM-LINEAGE, 370 DSPM-RISK-SCORING, 371 DSPM-REMEDIATION, 372 DSPM-SHADOW-DATA
// Data_object ids:
//   336 cloud_storage_buckets (master), 337 cloud_databases (master),
//   338 data_warehouses (master), 339 saas_app_instances (master),
//   340 iam_access_policies (master), 341 sensitive_data_incidents (master),
//   342 data_risk_scores (master), 343 shadow_data_findings (master),
//   300 data_assets (contributor/required), 303 data_classifications (contributor/required),
//   301 data_lineage_relationships (consumer/required)

const MODULES: ModuleSpec[] = [
  {
    domain_module_name: "Discovery, Classification and Lineage",
    domain_module_code: "DSPM-DISCOVERY-CLASSIFICATION",
    description:
      "Enumerates cloud data stores (object storage, managed databases, warehouses, SaaS instances), classifies the sensitivity of the data they hold, traces lineage and flow across pipelines, and surfaces shadow or unmanaged stores absent from the official inventory. This is the at-rest discovery and sensitivity surface that feeds the access and risk engine.",
    capability_ids: [366, 367, 369, 372],
    dmdo: [
      { data_object_id: 336, role: "master", necessity: "required" },
      { data_object_id: 337, role: "master", necessity: "required" },
      { data_object_id: 338, role: "master", necessity: "required" },
      { data_object_id: 339, role: "master", necessity: "required" },
      { data_object_id: 343, role: "master", necessity: "required" },
      { data_object_id: 300, role: "contributor", necessity: "required" },
      { data_object_id: 303, role: "contributor", necessity: "required" },
      { data_object_id: 301, role: "consumer", necessity: "required" },
    ],
  },
  {
    domain_module_name: "Access and Risk Posture",
    domain_module_code: "DSPM-ACCESS-RISK",
    description:
      "Enumerates identity principals and their effective permissions on data stores, detects over-privilege and toxic combinations (sensitive data plus over-permissive policy), and combines sensitivity, access breadth and exposure vector into per-asset risk scores that prioritize the remediation queue.",
    capability_ids: [368, 370],
    dmdo: [
      { data_object_id: 340, role: "master", necessity: "required" },
      { data_object_id: 342, role: "master", necessity: "required" },
    ],
  },
  {
    domain_module_name: "Incident and Remediation",
    domain_module_code: "DSPM-INCIDENT-REMEDIATION",
    description:
      "Triages detected sensitive-data incidents (over-privilege, toxic combinations, unauthorized access, shadow-data exposure) through investigation and containment, and drives templated and custom policy enforcement for IAM corrections, bucket-policy updates, and entitlement reviews.",
    capability_ids: [371],
    dmdo: [
      { data_object_id: 341, role: "master", necessity: "required" },
    ],
  },
];

async function upsertModules(): Promise<Map<string, number>> {
  const codes = MODULES.map(m => m.domain_module_code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`
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
    console.log("  domain_modules already present; no inserts");
  }
  // Re-read for code -> id map
  const all = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  return map;
}

async function upsertCapabilities(moduleId: number, capabilityIds: number[]): Promise<void> {
  if (!capabilityIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capabilityIds.join(",")})&select=capability_id`
  );
  const existingIds = new Set(existing.map((r: any) => r.capability_id));
  const toInsert = capabilityIds
    .filter(id => !existingIds.has(id))
    .map(id => ({ domain_module_id: moduleId, capability_id: id }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`    +${toInsert.length} domain_module_capabilities on module ${moduleId}`);
  }
}

async function upsertDMDO(
  moduleId: number,
  rows: { data_object_id: number; role: string; necessity: string }[]
): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map(r => r.data_object_id);
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`
  );
  const existingIds = new Set(existing.map((r: any) => r.data_object_id));
  const toInsert = rows
    .filter(r => !existingIds.has(r.data_object_id))
    .map(r => ({
      domain_module_id: moduleId,
      data_object_id: r.data_object_id,
      role: r.role,
      necessity: r.necessity,
    }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`    +${toInsert.length} domain_module_data_objects on module ${moduleId}`);
  }
}

async function main() {
  console.log("=== Modularize DSPM (domain 140) ===");

  // Pre-check guard: confirm no candidate master is mastered catalog-wide already.
  const masterIds = [336, 337, 338, 339, 340, 341, 342, 343];
  const otherMasters = await semantius(
    "GET",
    `/domain_module_data_objects?data_object_id=in.(${masterIds.join(",")})&role=eq.master&select=data_object_id,domain_module_id,domain_modules(domain_id)`
  );
  const foreign = (otherMasters || []).filter(
    (r: any) => r.domain_modules?.domain_id !== DOMAIN_ID
  );
  if (foreign.length) {
    throw new Error(
      `Catalog-wide master conflict: ${JSON.stringify(foreign)}. Resolve before loading (would create a second master).`
    );
  }

  const codeToId = await upsertModules();

  for (const m of MODULES) {
    const moduleId = codeToId.get(m.domain_module_code);
    if (!moduleId) throw new Error(`module id missing for ${m.domain_module_code}`);
    console.log(`  ${m.domain_module_code} -> id ${moduleId}`);
    await upsertCapabilities(moduleId, m.capability_ids);
    await upsertDMDO(moduleId, m.dmdo);
  }

  // Verify
  console.log("\n=== Verification ===");
  const mods = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`
  );
  for (const mod of mods) {
    const caps = await semantius(
      "GET",
      `/domain_module_capabilities?domain_module_id=eq.${mod.id}&select=capability_id`
    );
    const dmdo = await semantius(
      "GET",
      `/domain_module_data_objects?domain_module_id=eq.${mod.id}&select=data_object_id,role,necessity`
    );
    console.log(
      `  ${mod.domain_module_code}: ${caps.length} caps, ${dmdo.length} dmdo (${dmdo.filter((r: any) => r.role === "master").length} master)`
    );
    if (!caps.length) console.log(`    !! WARNING: module ${mod.domain_module_code} has 0 capabilities`);
    if (!dmdo.length) console.log(`    !! WARNING: module ${mod.domain_module_code} has 0 data_objects`);
  }

  console.log("\nDone.");
}

main().catch(e => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
