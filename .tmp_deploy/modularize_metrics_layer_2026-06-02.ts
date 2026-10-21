#!/usr/bin/env bun
// Idempotent modularization loader for METRICS-LAYER (domains.id = 137).
// Creates 3 full domain_modules, links 8 capabilities, assigns 5 master data_objects.
// Reuses existing entities only. Safe to re-run.
//
// Module split (carried from the 2026-05-30 / 2026-05-31 audits, B2-MODULE-SPLIT recommended 3-way):
//   METRICS-LAYER-DEFINITIONS  masters 252, 253   caps 345, 346, 197, 347
//   METRICS-LAYER-COMPUTE      masters 709, 710   caps 348, 349
//   METRICS-LAYER-DELIVERY     master  711        caps 350, 351
//
// Catalog-wide master pre-check (2026-06-02): no master DMDO row exists for any of
// 252, 253, 709, 710, 711 -> all 5 may be mastered here. Only existing DMDO row is
// metric_definitions (252) as consumer in DATA-AI-PLAT-SEMANTIC-CATALOG, which does
// not block mastering.

type Json = any;

const DOMAIN_ID = 137;

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

type ModuleSpec = {
  domain_module_code: string;
  domain_module_name: string;
  description: string;
  capability_ids: number[];
  // data_object_id -> {role, necessity}
  data_objects: { data_object_id: number; role: string; necessity: string }[];
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_code: "METRICS-LAYER-DEFINITIONS",
    domain_module_name: "Metric and Dimensional Definitions",
    description:
      "Canonical registry where business metrics and the logical dimensional model are authored once and reused everywhere. Captures numerator, denominator, filters, dimensions, time grain, ownership, certification status, and lineage to physical sources, plus entity, hierarchy, conformed-dimension, and slowly-changing-dimension structure decoupled from physical tables. Governs metric and model changes through approval, certification, deprecation, and impact analysis on downstream consumers.",
    capability_ids: [345, 346, 197, 347],
    data_objects: [
      { data_object_id: 252, role: "master", necessity: "required" },
      { data_object_id: 253, role: "master", necessity: "required" },
    ],
  },
  {
    domain_module_code: "METRICS-LAYER-COMPUTE",
    domain_module_name: "Federation, Caching, and Lineage",
    description:
      "The execution tier that resolves the semantic model against physical sources and accelerates reads. Plans federated joins and pushes computation down to each backend across warehouses, relational databases, object storage, and APIs, then serves cached and pre-aggregated rollups from columnar storage with query rewriting and automatic invalidation. Captures an executed-query audit trail linking every metric read back to source tables, transformations, and the requesting identity.",
    capability_ids: [348, 349],
    data_objects: [
      { data_object_id: 709, role: "master", necessity: "required" },
      { data_object_id: 710, role: "master", necessity: "required" },
    ],
  },
  {
    domain_module_code: "METRICS-LAYER-DELIVERY",
    domain_module_name: "Multi-Protocol Delivery and Access",
    description:
      "Exposes the governed semantic model through many consumption surfaces at once: SQL for analytics tools, REST and GraphQL for applications, MDX for spreadsheet and legacy clients, and JDBC and ODBC for enterprise integration, alongside natural-language and tool-use access for AI agents grounded on certified metrics. Enforces row-level and metric-level access policy at the semantic-definition tier so every consumer reads the same governed numbers under the same rules.",
    capability_ids: [350, 351],
    data_objects: [
      { data_object_id: 711, role: "master", necessity: "required" },
    ],
  },
];

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
  if (!created?.length) throw new Error(`module not found after insert: ${m.domain_module_code}`);
  console.log(`  +module ${m.domain_module_code} (id ${created[0].id})`);
  return created[0].id;
}

async function upsertCapabilities(moduleId: number, capIds: number[]): Promise<void> {
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
    console.log(`  +${toInsert.length} capability link(s) on module ${moduleId}`);
  }
}

async function upsertDMDO(
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
    console.log(`  +${toInsert.length} DMDO row(s) on module ${moduleId}`);
  }
}

async function precheckMasters(): Promise<void> {
  const masterIds = MODULES.flatMap((m) =>
    m.data_objects.filter((d) => d.role === "master").map((d) => d.data_object_id),
  );
  const rows = await semantius(
    "GET",
    `/domain_module_data_objects?data_object_id=in.(${masterIds.join(",")})&role=eq.master&select=data_object_id,domain_module_id,domain_modules(domain_module_code,domain_id)`,
  );
  if (rows?.length) {
    for (const r of rows) {
      const dm = r.domain_modules;
      if (dm && dm.domain_id !== DOMAIN_ID) {
        throw new Error(
          `PRE-CHECK FAIL: data_object ${r.data_object_id} already mastered by ${dm.domain_module_code} (domain ${dm.domain_id}). Demote to embedded_master before writing master here.`,
        );
      }
    }
    console.log(`  pre-check: ${rows.length} existing in-domain master row(s) (idempotent re-run)`);
  } else {
    console.log("  pre-check: no existing master rows catalog-wide for any of the 5 data_objects. All may be mastered here.");
  }
}

async function main() {
  console.log("=== Modularize METRICS-LAYER (domain 137) ===");
  console.log("\n-- catalog-wide master pre-check --");
  await precheckMasters();

  const codeToId = new Map<string, number>();
  for (const m of MODULES) {
    console.log(`\n=== ${m.domain_module_code} ===`);
    const id = await upsertModule(m);
    codeToId.set(m.domain_module_code, id);
    await upsertCapabilities(id, m.capability_ids);
    await upsertDMDO(id, m.data_objects);
  }

  // Verification
  console.log("\n=== Verification ===");
  const mods = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code,domain_module_capabilities(capability_id),domain_module_data_objects(data_object_id,role,necessity)`,
  );
  let allCaps = new Set<number>();
  for (const mod of mods) {
    const caps = (mod.domain_module_capabilities ?? []).map((c: any) => c.capability_id);
    const dos = (mod.domain_module_data_objects ?? []);
    caps.forEach((c: number) => allCaps.add(c));
    console.log(
      `  ${mod.domain_module_code}: ${caps.length} cap(s), ${dos.length} DMDO row(s) ` +
        `[${dos.map((d: any) => `${d.data_object_id}:${d.role}`).join(", ")}]`,
    );
    if (caps.length === 0) console.error(`  !! EMPTY-CAPS module ${mod.domain_module_code}`);
    if (dos.length === 0) console.error(`  !! EMPTY-DATA module ${mod.domain_module_code}`);
  }
  const expectedCaps = [345, 346, 347, 348, 349, 350, 351, 197];
  const missing = expectedCaps.filter((c) => !allCaps.has(c));
  console.log(`\n  capabilities placed: ${[...allCaps].sort((a, b) => a - b).join(", ")}`);
  if (missing.length) console.error(`  !! UNPLACED capabilities: ${missing.join(", ")}`);
  else console.log("  all 8 capabilities placed.");

  // Catalog-wide single-master check per master
  for (const did of [252, 253, 709, 710, 711]) {
    const rows = await semantius(
      "GET",
      `/domain_module_data_objects?data_object_id=eq.${did}&role=eq.master&select=domain_module_id`,
    );
    const n = rows?.length ?? 0;
    console.log(`  master ${did}: ${n} master row(s) catalog-wide ${n === 1 ? "OK" : "!! VIOLATION"}`);
  }

  console.log("\nUI: https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.137");
  console.log("Done.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
