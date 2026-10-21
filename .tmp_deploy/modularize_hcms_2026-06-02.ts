#!/usr/bin/env bun
// Idempotent loader: modularize HCMS (domain_id 93, Headless Content Management).
// Creates 3 full domain_modules, links the 8 capabilities, assigns the 7 existing
// data_objects (6 masters + 1 contributor) at their existing in-domain role+necessity.
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

const DOMAIN_ID = 93;

// ---- Module definitions -------------------------------------------------
type ModuleSpec = {
  domain_module_code: string;
  domain_module_name: string;
  description: string;
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_code: "HCMS-MODELING",
    domain_module_name: "Content Modeling and Environments",
    description: "Define content types, fields, references, and validation rules exposed automatically as REST and GraphQL endpoints, and manage isolated content environments (dev, staging, production) for safe schema and content migrations.",
  },
  {
    domain_module_code: "HCMS-AUTHORING",
    domain_module_name: "Content Authoring and Localization",
    description: "Non-technical authoring of content entries with rich text, references, draft and publish, scheduling, role-based editorial workflows, multi-locale translations, inline and visual editing, version history, and content-bound media assets.",
  },
  {
    domain_module_code: "HCMS-DELIVERY",
    domain_module_name: "Content Delivery and Integration",
    description: "Serve a single content source to many channels through cached, low-latency delivery APIs, coordinate scheduled content releases, and trigger downstream actions through outbound webhooks and integration hooks on content state changes.",
  },
];

// capability_id placement per module code
const CAPS: Record<string, number[]> = {
  "HCMS-MODELING": [132], // HCMS-MODEL
  "HCMS-AUTHORING": [134, 135, 136, 137, 139], // AUTHORING, I18N, DAM, VERSIONING, VISUAL
  "HCMS-DELIVERY": [133, 138], // DELIVERY, WEBHOOKS
};

// data_object assignments per module code: {data_object_id, role, necessity}
type DMDO = { data_object_id: number; role: string; necessity: string };
const DOS: Record<string, DMDO[]> = {
  "HCMS-MODELING": [
    { data_object_id: 131, role: "master", necessity: "required" }, // content_types
    { data_object_id: 136, role: "master", necessity: "required" }, // content_environments
  ],
  "HCMS-AUTHORING": [
    { data_object_id: 132, role: "master", necessity: "required" }, // content_entries
    { data_object_id: 134, role: "master", necessity: "required" }, // editorial_workflows
    { data_object_id: 135, role: "master", necessity: "required" }, // content_locales
    { data_object_id: 137, role: "contributor", necessity: "required" }, // digital_assets (DAM master)
  ],
  "HCMS-DELIVERY": [
    { data_object_id: 133, role: "master", necessity: "required" }, // content_releases
  ],
};

async function upsertModules(): Promise<Map<string, number>> {
  const codes = MODULES.map(m => m.domain_module_code);
  const existing = await semantius("GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`);
  const existingCodes = new Set(existing.map((r: any) => r.domain_module_code));
  const toInsert = MODULES
    .filter(m => !existingCodes.has(m.domain_module_code))
    .map(m => ({
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
    console.log("  modules already present");
  }
  // Re-read for code->id map
  const all = await semantius("GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`);
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  return map;
}

async function upsertCaps(moduleId: number, capIds: number[]): Promise<void> {
  if (!capIds.length) return;
  const existing = await semantius("GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capIds.join(",")})&select=capability_id`);
  const existingIds = new Set(existing.map((r: any) => r.capability_id));
  const toInsert = capIds
    .filter(id => !existingIds.has(id))
    .map(id => ({ domain_module_id: moduleId, capability_id: id }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`    +${toInsert.length} capability links on module ${moduleId}`);
  }
}

async function upsertDMDO(moduleId: number, rows: DMDO[]): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map(r => r.data_object_id);
  const existing = await semantius("GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`);
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
    console.log(`    +${toInsert.length} DMDO rows on module ${moduleId}`);
  }
}

async function main() {
  console.log("=== Modularize HCMS (domain 93) ===");
  const moduleMap = await upsertModules();

  for (const m of MODULES) {
    const id = moduleMap.get(m.domain_module_code);
    if (!id) throw new Error(`module id not found after insert: ${m.domain_module_code}`);
    console.log(`  ${m.domain_module_code} -> ${id}`);
    await upsertCaps(id, CAPS[m.domain_module_code] || []);
    await upsertDMDO(id, DOS[m.domain_module_code] || []);
  }

  console.log("\nDone.");
}

main().catch(e => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
