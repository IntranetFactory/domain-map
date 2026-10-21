#!/usr/bin/env bun
// Idempotent modularization loader for the REMOTE-ACCESS domain (domains.id = 132).
// Creates EXACTLY 2 full domain_modules, links the 6 existing capabilities, and
// assigns the existing data_objects (2 masters + 2 consumers) at their roles.
// Scope: modules + capability links + DMDO assignment ONLY. No new entities.
// Safe to re-run (idempotent on domain_module_code, (module,capability), (module,data_object)).

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

const DOMAIN_ID = 132;

// ---- Module definitions ------------------------------------------------------
type ModuleSpec = {
  domain_module_code: string;
  domain_module_name: string;
  description: string;
  capability_ids: number[];
  // data_object assignments: [data_object_id, role, necessity]
  data_objects: Array<{ data_object_id: number; role: string; necessity: string }>;
};

// Capability ids: RA-ATTENDED 217, RA-UNATTENDED 218, RA-RECORD 219,
//                 RA-XFER 220, RA-ELEVATE 221, RA-NAT 222.
// Master data_objects: remote_sessions 238, session_recordings 239.
// Consumer data_objects (preserve role+necessity): rmm_agents 223, service_incidents 47.
const MODULES: ModuleSpec[] = [
  {
    domain_module_code: "REMOTE-ACCESS-SESSION",
    domain_module_name: "Remote Session Control",
    description:
      "Establish and operate attended and unattended remote-control sessions over workstations and servers: code or agent based connection, NAT-traversal relay, in-session file transfer and clipboard sharing, and just-in-time privilege elevation. Owns the remote session as the unit of work and reads the operational agent liveness view plus the linked service incident.",
    capability_ids: [217, 218, 220, 221, 222], // RA-ATTENDED, RA-UNATTENDED, RA-XFER, RA-ELEVATE, RA-NAT
    data_objects: [
      { data_object_id: 238, role: "master", necessity: "required" }, // remote_sessions
      { data_object_id: 223, role: "consumer", necessity: "required" }, // rmm_agents (preserve)
      { data_object_id: 47, role: "consumer", necessity: "required" }, // service_incidents (preserve)
    ],
  },
  {
    domain_module_code: "REMOTE-ACCESS-RECORDING-AUDIT",
    domain_module_name: "Session Recording and Audit",
    description:
      "Capture, store, and govern session recordings and audit logs from remote-control sessions: full-session video, keystroke and command audit, tamper-evident retention, redaction state, and downstream compliance evidence. Owns the recording artifact with its own lifecycle distinct from the parent session.",
    capability_ids: [219], // RA-RECORD
    data_objects: [
      { data_object_id: 239, role: "master", necessity: "required" }, // session_recordings
    ],
  },
];

// ---- Master pre-check (catalog-wide) ----------------------------------------
// Idempotent-safe: an existing master row owned by one of THIS loader's own
// modules (matched by code) is fine on re-run. A master row owned by any OTHER
// module is a genuine catalog-wide single-master violation and aborts.
async function precheckMasters(): Promise<void> {
  const ownCodes = new Set(MODULES.map(m => m.domain_module_code));
  const masterIds = MODULES.flatMap(m =>
    m.data_objects.filter(d => d.role === "master").map(d => d.data_object_id)
  );
  for (const id of masterIds) {
    const rows = await semantius(
      "GET",
      `/domain_module_data_objects?data_object_id=eq.${id}&role=eq.master&select=domain_modules(domain_module_code)`
    );
    const foreign = (rows ?? []).filter(
      (r: any) => !ownCodes.has(r.domain_modules?.domain_module_code)
    );
    if (foreign.length) {
      throw new Error(
        `MASTER PRE-CHECK FAILED: data_object ${id} already mastered by foreign module(s) ` +
          `${foreign.map((r: any) => r.domain_modules?.domain_module_code).join(", ")}. ` +
          `Assign embedded_master here instead. Aborting before any write.`
      );
    }
  }
  console.log("Master pre-check passed: 238 and 239 not mastered by any foreign module.");
}

// ---- Upsert helpers ----------------------------------------------------------
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
    console.log(`  +${toInsert.length} domain_modules: ${toInsert.map(r => r.domain_module_code).join(", ")}`);
  } else {
    console.log("  domain_modules already present; no insert.");
  }
  // Re-read for code -> id map.
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
    console.log(`  module ${moduleId}: +${toInsert.length} capability links`);
  }
}

async function upsertDMDO(
  moduleId: number,
  rows: Array<{ data_object_id: number; role: string; necessity: string }>
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
    console.log(`  module ${moduleId}: +${toInsert.length} DMDO rows`);
  }
}

async function main() {
  console.log("=== Modularize REMOTE-ACCESS (domain 132) ===");
  await precheckMasters();
  const idByCode = await upsertModules();

  for (const m of MODULES) {
    const moduleId = idByCode.get(m.domain_module_code);
    if (!moduleId) throw new Error(`module id not found after upsert: ${m.domain_module_code}`);
    console.log(`\n--- ${m.domain_module_code} (id ${moduleId}) ---`);
    await upsertCapabilities(moduleId, m.capability_ids);
    await upsertDMDO(moduleId, m.data_objects);
  }

  // ---- Verification --------------------------------------------------------
  console.log("\n=== Verification ===");
  const mods = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code,module_kind`
  );
  console.log(`modules in domain: ${mods.length}`);
  const placedCaps = new Set<number>();
  for (const mod of mods) {
    const caps = await semantius(
      "GET",
      `/domain_module_capabilities?domain_module_id=eq.${mod.id}&select=capability_id`
    );
    const dmdos = await semantius(
      "GET",
      `/domain_module_data_objects?domain_module_id=eq.${mod.id}&select=data_object_id,role,necessity`
    );
    caps.forEach((c: any) => placedCaps.add(c.capability_id));
    console.log(
      `  ${mod.domain_module_code} [${mod.module_kind}]: ${caps.length} caps, ${dmdos.length} DMDOs ` +
        `(${dmdos.map((d: any) => `${d.data_object_id}:${d.role}/${d.necessity}`).join(", ")})`
    );
    if (caps.length < 1) console.error(`  !! M6 VIOLATION: ${mod.domain_module_code} has 0 capabilities`);
    if (dmdos.length < 1) console.error(`  !! EMPTY MODULE: ${mod.domain_module_code} has 0 data_objects`);
  }
  const allCaps = [217, 218, 219, 220, 221, 222];
  const missing = allCaps.filter(c => !placedCaps.has(c));
  if (missing.length) console.error(`  !! M4 VIOLATION: capabilities not placed: ${missing.join(", ")}`);
  else console.log("  M4 OK: all 6 capabilities placed.");

  // Catalog-wide single-master re-check.
  for (const id of [238, 239]) {
    const masters = await semantius(
      "GET",
      `/domain_module_data_objects?data_object_id=eq.${id}&role=eq.master&select=domain_module_id`
    );
    if (masters.length !== 1)
      console.error(`  !! M7 VIOLATION: data_object ${id} mastered by ${masters.length} modules`);
    else console.log(`  M7 OK: data_object ${id} mastered exactly once (module ${masters[0].domain_module_id}).`);
  }

  console.log("\nDone.");
}

main().catch(e => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
