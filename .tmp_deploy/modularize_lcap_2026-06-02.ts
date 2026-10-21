#!/usr/bin/env bun
// Idempotent modularization loader for the LCAP domain (id 37).
// Creates 2 full domain_modules, links existing capabilities, assigns existing
// data_objects at their existing master role + necessity. Reuses entities only.
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

const DOMAIN_ID = 37;

type ModuleSpec = {
  domain_module_name: string;
  domain_module_code: string;
  description: string;
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_name: "Visual Composition and Data Modeling",
    domain_module_code: "LCAP-VISUAL-COMPOSITION",
    description:
      "Design-time authoring surface for low-code applications: visual page composition, custom business-object schema, bound external data sources, and AI-assisted generation. The build-side of the platform that produces deployable application artifacts.",
  },
  {
    domain_module_name: "Runtime and Application Lifecycle",
    domain_module_code: "LCAP-RUNTIME-LIFECYCLE",
    description:
      "Managed execution of built applications: process and workflow orchestration on a vendor-operated runtime, environment promotion across dev/test/prod, versioning, rollback, and observability. The run-side governance layer that keeps deployed apps enterprise-credible.",
  },
];

// capability_id -> module_code
const CAPABILITY_PLACEMENT: Record<number, string> = {
  332: "LCAP-VISUAL-COMPOSITION", // LCAP-VISUAL-MODELING
  334: "LCAP-VISUAL-COMPOSITION", // LCAP-INTEGRATION-CONNECTORS
  337: "LCAP-VISUAL-COMPOSITION", // LCAP-AI-ASSIST
  201: "LCAP-VISUAL-COMPOSITION", // OPERATIONAL-DATA-APPS (cross-cutting)
  333: "LCAP-RUNTIME-LIFECYCLE", // LCAP-MANAGED-RUNTIME
  335: "LCAP-RUNTIME-LIFECYCLE", // LCAP-WORKFLOW-AUTO
  336: "LCAP-RUNTIME-LIFECYCLE", // LCAP-LIFECYCLE-MGMT
};

// data_object_id -> {module_code, role, necessity}
// Roles + necessity preserved from existing domain_data_objects (all master/required).
// Catalog-wide master pre-check (2026-06-02): all 5 unmastered anywhere -> master is safe.
const DATA_OBJECT_PLACEMENT: Array<{
  data_object_id: number;
  module_code: string;
  role: string;
  necessity: string;
}> = [
  { data_object_id: 220, module_code: "LCAP-VISUAL-COMPOSITION", role: "master", necessity: "required" }, // lcap_apps
  { data_object_id: 715, module_code: "LCAP-VISUAL-COMPOSITION", role: "master", necessity: "required" }, // lcap_pages
  { data_object_id: 221, module_code: "LCAP-VISUAL-COMPOSITION", role: "master", necessity: "required" }, // lcap_business_objects
  { data_object_id: 716, module_code: "LCAP-VISUAL-COMPOSITION", role: "master", necessity: "required" }, // lcap_data_sources
  { data_object_id: 222, module_code: "LCAP-RUNTIME-LIFECYCLE", role: "master", necessity: "required" }, // lcap_workflows
];

async function masterPreCheck(): Promise<void> {
  for (const row of DATA_OBJECT_PLACEMENT) {
    if (row.role !== "master") continue;
    const existing = await semantius(
      "GET",
      `/domain_module_data_objects?data_object_id=eq.${row.data_object_id}&role=eq.master&select=domain_module_id`
    );
    const foreign = (existing ?? []).filter((r: any) => r.domain_module_id != null);
    if (foreign.length) {
      // Only acceptable if it is one of THIS run's modules (idempotent re-run).
      const ourIds = new Set(Object.values(moduleIdByCode));
      const allOurs = foreign.every((r: any) => ourIds.has(r.domain_module_id));
      if (!allOurs) {
        throw new Error(
          `MASTER PRE-CHECK FAILED for data_object_id=${row.data_object_id}: already mastered in module(s) ${foreign
            .map((r: any) => r.domain_module_id)
            .join(",")}. Demote to embedded_master.`
        );
      }
    }
  }
}

let moduleIdByCode: Record<string, number> = {};

async function upsertModules(): Promise<void> {
  const codes = MODULES.map((m) => m.domain_module_code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`
  );
  const existingCodes = new Set((existing ?? []).map((r: any) => r.domain_module_code));
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
  } else {
    console.log("  modules already present");
  }
  // Re-read for code -> id map.
  const all = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`
  );
  moduleIdByCode = {};
  for (const r of all) moduleIdByCode[r.domain_module_code] = r.id;
  for (const code of codes) {
    if (!moduleIdByCode[code]) throw new Error(`module not found after upsert: ${code}`);
  }
}

async function upsertCapabilities(): Promise<void> {
  for (const [capIdStr, code] of Object.entries(CAPABILITY_PLACEMENT)) {
    const capId = Number(capIdStr);
    const moduleId = moduleIdByCode[code];
    const existing = await semantius(
      "GET",
      `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=eq.${capId}&select=id`
    );
    if (existing?.length) continue;
    await semantius("POST", "/domain_module_capabilities", [
      { domain_module_id: moduleId, capability_id: capId },
    ]);
    console.log(`  +DMC capability ${capId} -> ${code}`);
  }
}

async function upsertDataObjects(): Promise<void> {
  for (const row of DATA_OBJECT_PLACEMENT) {
    const moduleId = moduleIdByCode[row.module_code];
    const existing = await semantius(
      "GET",
      `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=eq.${row.data_object_id}&select=id`
    );
    if (existing?.length) continue;
    await semantius("POST", "/domain_module_data_objects", [
      {
        domain_module_id: moduleId,
        data_object_id: row.data_object_id,
        role: row.role,
        necessity: row.necessity,
      },
    ]);
    console.log(`  +DMDO data_object ${row.data_object_id} (${row.role}/${row.necessity}) -> ${row.module_code}`);
  }
}

async function main() {
  console.log("=== Modularize LCAP (domain 37) ===");
  await upsertModules();
  await masterPreCheck();
  await upsertCapabilities();
  await upsertDataObjects();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
