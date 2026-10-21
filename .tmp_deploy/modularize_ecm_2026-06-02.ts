#!/usr/bin/env bun
// Idempotent modularization loader for domain ECM (Enterprise Content Management, domain_id=91).
// Scope: domain_modules + domain_module_capabilities + domain_module_data_objects ONLY.
// Reuses existing capabilities (169-175) and existing data_objects (429-433).
// Creates NO new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships.
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

const DOMAIN_ID = 91;

// ---- Module specifications -------------------------------------------------

type ModuleSpec = {
  domain_module_code: string;
  domain_module_name: string;
  description: string;
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_code: "ECM-REPOSITORY",
    domain_module_name: "Content Repository and Capture",
    description:
      "Metadata-driven document repository with check-in / check-out, version history, hierarchical folders, full-text indexing, scan / OCR capture, and manual plus ML-driven classification of inbound unstructured content.",
  },
  {
    domain_module_code: "ECM-RECORDS-GOV",
    domain_module_name: "Records Management and Information Governance",
    description:
      "Retention schedules, legal holds, defensible disposition, policy authoring, and immutable compliance audit trails of access, change, share, and disposition events across the unstructured-content estate.",
  },
  {
    domain_module_code: "ECM-WORKFLOW",
    domain_module_name: "Document Workflow Automation",
    description:
      "Routing, approval, and content-centric process automation tied to documents and their versions, with auditable transitions for contracts, claims, invoices, and case files.",
  },
];

// capability_id lists per module code
const MODULE_CAPABILITIES: Record<string, number[]> = {
  "ECM-REPOSITORY": [169, 173, 175], // ECM-REPO, ECM-CAPTURE, ECM-CLASSIFY
  "ECM-RECORDS-GOV": [170, 172, 174], // ECM-RECORDS, ECM-INFOGOV, ECM-AUDIT
  "ECM-WORKFLOW": [171], // ECM-WORKFLOW
};

// data_object assignments per module code: { data_object_id, role, necessity }
type DMDO = { data_object_id: number; role: string; necessity: string };
const MODULE_DATA_OBJECTS: Record<string, DMDO[]> = {
  "ECM-REPOSITORY": [
    { data_object_id: 429, role: "master", necessity: "required" }, // content_documents
    { data_object_id: 430, role: "master", necessity: "required" }, // document_versions
    { data_object_id: 431, role: "master", necessity: "required" }, // document_folders
    { data_object_id: 432, role: "master", necessity: "required" }, // document_classifications
  ],
  "ECM-RECORDS-GOV": [
    { data_object_id: 433, role: "master", necessity: "required" }, // records_retention_policies
    { data_object_id: 429, role: "consumer", necessity: "required" }, // content_documents (holds/disposition act on docs)
  ],
  "ECM-WORKFLOW": [
    { data_object_id: 429, role: "consumer", necessity: "required" }, // content_documents (routed/approved)
    { data_object_id: 430, role: "consumer", necessity: "optional" }, // document_versions
  ],
};

// ---- Phase 1: upsert modules ----------------------------------------------

async function upsertModules(): Promise<Map<string, number>> {
  const codes = MODULES.map(m => m.domain_module_code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const existingCodes = new Set((existing ?? []).map((r: any) => r.domain_module_code));
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
    console.log("  domain_modules already present; skipping insert");
  }
  // Re-read for code -> id map
  const all = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  return map;
}

// ---- Phase 2: upsert module capabilities ----------------------------------

async function upsertCapabilities(moduleId: number, capIds: number[]): Promise<void> {
  if (!capIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capIds.join(",")})&select=capability_id`,
  );
  const existingIds = new Set((existing ?? []).map((r: any) => r.capability_id));
  const toInsert = capIds
    .filter(id => !existingIds.has(id))
    .map(id => ({ domain_module_id: moduleId, capability_id: id }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`    +${toInsert.length} capability links on module ${moduleId}`);
  }
}

// ---- Phase 3: upsert module data objects ----------------------------------

async function upsertDataObjects(moduleId: number, rows: DMDO[]): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map(r => r.data_object_id);
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`,
  );
  const existingIds = new Set((existing ?? []).map((r: any) => r.data_object_id));
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

// ---- Catalog-wide master pre-check guard ----------------------------------

async function masterPreCheck(): Promise<void> {
  // For every intended master row, confirm no OTHER module already masters it catalog-wide.
  const intendedMasters: { code: string; data_object_id: number }[] = [];
  for (const [code, rows] of Object.entries(MODULE_DATA_OBJECTS)) {
    for (const r of rows) if (r.role === "master") intendedMasters.push({ code, data_object_id: r.data_object_id });
  }
  const ids = [...new Set(intendedMasters.map(m => m.data_object_id))];
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?data_object_id=in.(${ids.join(",")})&role=eq.master&select=domain_module_id,data_object_id,domain_modules(domain_module_code,domain_id)`,
  );
  // Allow rows belonging to our own ECM modules (idempotent re-run); fail on foreign masters.
  const foreign = (existing ?? []).filter((r: any) => r.domain_modules?.domain_id !== DOMAIN_ID);
  if (foreign.length) {
    console.error("MASTER PRE-CHECK FAILURE: foreign module already masters an intended ECM master:");
    for (const r of foreign) console.error(`  data_object ${r.data_object_id} mastered by ${r.domain_modules?.domain_module_code} (domain ${r.domain_modules?.domain_id})`);
    throw new Error("Aborting: would create a second catalog-wide master. Demote to embedded_master instead.");
  }
  console.log("  master pre-check passed: no foreign masters on 429,430,431,432,433");
}

// ---- Main -----------------------------------------------------------------

async function main() {
  console.log("=== Modularize ECM (domain_id=91) ===");
  await masterPreCheck();

  const idMap = await upsertModules();
  for (const code of Object.keys(MODULE_CAPABILITIES)) {
    const mid = idMap.get(code);
    if (!mid) throw new Error(`module id not found for ${code}`);
    console.log(`\n  Module ${code} (id ${mid})`);
    await upsertCapabilities(mid, MODULE_CAPABILITIES[code]);
    await upsertDataObjects(mid, MODULE_DATA_OBJECTS[code]);
  }

  // ---- Verification ----
  console.log("\n=== Verification ===");
  const mods = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code,domain_module_capabilities(capability_id),domain_module_data_objects(data_object_id,role,necessity)`,
  );
  const placedCaps = new Set<number>();
  for (const m of mods) {
    const caps = (m.domain_module_capabilities ?? []).map((c: any) => c.capability_id);
    const dos = m.domain_module_data_objects ?? [];
    caps.forEach((c: number) => placedCaps.add(c));
    console.log(`  ${m.domain_module_code}: ${caps.length} caps, ${dos.length} DMDO`);
    if (caps.length < 1) console.error(`    !! M6 FAIL: module has no capability`);
    if (dos.length < 1) console.error(`    !! EMPTY MODULE: no data_object`);
  }
  const allCaps = [169, 170, 171, 172, 173, 174, 175];
  const missing = allCaps.filter(c => !placedCaps.has(c));
  if (missing.length) console.error(`  !! M4 FAIL: capabilities not placed: ${missing.join(",")}`);
  else console.log(`  M4 OK: all 7 capabilities placed`);

  // Master uniqueness (in-domain + catalog-wide)
  for (const doId of [429, 430, 431, 432, 433]) {
    const masters = await semantius(
      "GET",
      `/domain_module_data_objects?data_object_id=eq.${doId}&role=eq.master&select=domain_module_id,domain_modules(domain_module_code,domain_id)`,
    );
    const n = (masters ?? []).length;
    const where = (masters ?? []).map((r: any) => r.domain_modules?.domain_module_code).join(",");
    if (n !== 1) console.error(`  !! M7 FAIL: data_object ${doId} mastered by ${n} modules (${where})`);
    else console.log(`  M7 OK: data_object ${doId} mastered once by ${where}`);
  }

  console.log("\nDone.");
}

main().catch(e => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
