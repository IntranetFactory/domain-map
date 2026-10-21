#!/usr/bin/env bun
// Idempotent modularization loader for the NCDB domain (id 134, No-Code Database).
// Creates 3 full domain_modules, links existing capabilities, assigns existing
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

const DOMAIN_ID = 134;

type ModuleSpec = {
  domain_module_name: string;
  domain_module_code: string;
  description: string;
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_name: "Visual Schema and Linked Records",
    domain_module_code: "NCDB-SCHEMA-BUILDER",
    description:
      "The core data-modeling surface: a self-contained namespace holding user-defined tables, rich field types, linked-record relationships across tables, formula and rollup columns, and the runtime schema that downstream views, forms, and automations bind to. The reason the platform is bought: model structured data without a developer.",
  },
  {
    domain_module_name: "Views and Form Capture",
    domain_module_code: "NCDB-VIEWS-FORMS",
    description:
      "The presentation and intake surface over the data model: switchable grid, gallery, kanban, calendar, and timeline views that each filter, sort, group, and share independently, plus public or authenticated forms that write directly into a table. The everyday working surface for non-database users who read and contribute structured data.",
  },
  {
    domain_module_name: "Automation and External Sync",
    domain_module_code: "NCDB-AUTOMATION-SYNC",
    description:
      "The no-code operations layer: record-triggered workflows, scheduled jobs, and outbound API calls, together with live or scheduled bidirectional synchronization to external systems of record so the database becomes a working surface over canonical data rather than a static copy.",
  },
];

// capability_id -> module_code (M4: every capability placed in >=1 module)
const CAPABILITY_PLACEMENT: Record<number, string> = {
  320: "NCDB-SCHEMA-BUILDER", // NCDB-FLEX-SCHEMA
  321: "NCDB-SCHEMA-BUILDER", // NCDB-LINKED-RECORDS
  323: "NCDB-SCHEMA-BUILDER", // NCDB-FORMULAS
  197: "NCDB-SCHEMA-BUILDER", // SEMANTIC-MODELING (cross-cutting)
  322: "NCDB-VIEWS-FORMS",    // NCDB-VIEWS
  324: "NCDB-VIEWS-FORMS",    // NCDB-FORM-CAPTURE
  201: "NCDB-VIEWS-FORMS",    // OPERATIONAL-DATA-APPS (cross-cutting)
  325: "NCDB-AUTOMATION-SYNC", // NCDB-SYNC-EXTERNAL
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
  { data_object_id: 241, module_code: "NCDB-SCHEMA-BUILDER", role: "master", necessity: "required" }, // nocode_bases
  { data_object_id: 242, module_code: "NCDB-SCHEMA-BUILDER", role: "master", necessity: "required" }, // nocode_record_definitions
  { data_object_id: 713, module_code: "NCDB-VIEWS-FORMS", role: "master", necessity: "required" },    // nocode_views
  { data_object_id: 712, module_code: "NCDB-VIEWS-FORMS", role: "master", necessity: "required" },    // nocode_forms
  { data_object_id: 714, module_code: "NCDB-AUTOMATION-SYNC", role: "master", necessity: "required" }, // nocode_automations
];

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
  console.log("=== Modularize NCDB (domain 134, No-Code Database) ===");
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
