#!/usr/bin/env bun
// Idempotent modularization loader for the UEM domain (domains.id = 86).
// Scope: domain_modules + domain_module_capabilities + domain_module_data_objects ONLY.
// Reuses existing capabilities (239-243) and existing master data_objects (556-563).
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

const DOMAIN_ID = 86;

// ----- Module definitions (3 full modules) -----
type ModuleDef = {
  code: string;
  name: string;
  description: string;
  capability_ids: number[];
  // data_object assignments: role + necessity preserved from existing domain_data_objects (all master/required today)
  data_objects: { id: number; role: string; necessity: string }[];
};

const MODULES: ModuleDef[] = [
  {
    code: "UEM-DEVICE-LIFECYCLE",
    name: "Device Lifecycle and Enrollment",
    description:
      "Enroll, onboard, and retire managed endpoints across Windows, Apple, Android, and ChromeOS. Covers zero-touch provisioning, enrollment-token issuance and redemption, and the deployment-result log that records each onboarding and policy push outcome per device.",
    capability_ids: [239, 242], // UEM-MDM, UEM-ZTP
    data_objects: [
      { id: 556, role: "master", necessity: "required" }, // enrolled_devices
      { id: 561, role: "master", necessity: "required" }, // enrollment_tokens
      { id: 562, role: "master", necessity: "required" }, // device_deployment_results
    ],
  },
  {
    code: "UEM-CONFIG-APPS",
    name: "Configuration and Application Delivery",
    description:
      "Author and deploy OS-level configuration profiles and distribute managed applications to endpoint cohorts. Covers Wi-Fi, VPN, certificate, restriction, and encryption settings templates alongside the app catalog, silent install and update, and per-device app assignment tracking.",
    capability_ids: [240, 241], // UEM-CONFIG, UEM-APP-DIST
    data_objects: [
      { id: 557, role: "master", necessity: "required" }, // device_configuration_profiles
      { id: 559, role: "master", necessity: "required" }, // mobile_app_packages
      { id: 560, role: "master", necessity: "required" }, // device_app_assignments
    ],
  },
  {
    code: "UEM-COMPLIANCE-POSTURE",
    name: "Compliance Policy and Posture",
    description:
      "Define endpoint compliance baselines and evaluate device posture on a recurring cadence. Covers OS-version floors, encryption and password enforcement, jailbreak and root detection, and the per-device scan results that drive conditional-access decisions and remediation.",
    capability_ids: [243], // UEM-COMPLIANCE
    data_objects: [
      { id: 558, role: "master", necessity: "required" }, // device_compliance_policies
      { id: 563, role: "master", necessity: "required" }, // device_compliance_results
    ],
  },
];

async function upsertModules(): Promise<Map<string, number>> {
  // Insert missing modules (idempotent on domain_module_code).
  const codes = MODULES.map(m => m.code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const existingCodes = new Set(existing.map((r: any) => r.domain_module_code));
  const toInsert = MODULES.filter(m => !existingCodes.has(m.code)).map(m => ({
    domain_module_name: m.name,
    domain_module_code: m.code,
    description: m.description,
    domain_id: DOMAIN_ID,
    module_kind: "full",
  }));
  if (toInsert.length) {
    await semantius("POST", "/domain_modules", toInsert);
    console.log(`  +${toInsert.length} domain_modules: ${toInsert.map(r => r.domain_module_code).join(", ")}`);
  } else {
    console.log("  domain_modules already present, skipping insert");
  }
  // Re-read for code -> id map.
  const all = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  return map;
}

async function upsertCapabilities(moduleId: number, capIds: number[]): Promise<void> {
  if (!capIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capIds.join(",")})&select=capability_id`,
  );
  const existingIds = new Set(existing.map((r: any) => r.capability_id));
  const toInsert = capIds
    .filter(id => !existingIds.has(id))
    .map(id => ({ domain_module_id: moduleId, capability_id: id }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`  +${toInsert.length} domain_module_capabilities on module ${moduleId}`);
  }
}

async function upsertDMDO(
  moduleId: number,
  rows: { id: number; role: string; necessity: string }[],
): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map(r => r.id);
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`,
  );
  const existingIds = new Set(existing.map((r: any) => r.data_object_id));
  const toInsert = rows
    .filter(r => !existingIds.has(r.id))
    .map(r => ({
      domain_module_id: moduleId,
      data_object_id: r.id,
      role: r.role,
      necessity: r.necessity,
    }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`  +${toInsert.length} domain_module_data_objects on module ${moduleId}`);
  }
}

// Catalog-wide master pre-check (M7): for any data_object intended as master here,
// verify no OTHER module already masters it. Demote to embedded_master if so.
async function masterPreCheck(): Promise<void> {
  console.log("\n=== Catalog-wide master pre-check (M7) ===");
  const masterIds = MODULES.flatMap(m =>
    m.data_objects.filter(d => d.role === "master").map(d => d.id),
  );
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?data_object_id=in.(${masterIds.join(",")})&role=eq.master&select=domain_module_id,data_object_id`,
  );
  // Filter to modules NOT in this domain's about-to-be-created set is unknowable pre-insert,
  // but since this domain has zero modules at start, any existing master row is an external owner.
  if (existing.length) {
    const ours = await semantius(
      "GET",
      `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id`,
    );
    const ourModuleIds = new Set(ours.map((r: any) => r.id));
    const externalMasters = existing.filter((r: any) => !ourModuleIds.has(r.domain_module_id));
    if (externalMasters.length) {
      for (const r of externalMasters) {
        console.warn(
          `  PRE-CHECK HIT: data_object ${r.data_object_id} already mastered by module ${r.domain_module_id}. Demoting to embedded_master.`,
        );
        for (const m of MODULES) {
          for (const d of m.data_objects) {
            if (d.id === r.data_object_id && d.role === "master") d.role = "embedded_master";
          }
        }
      }
    } else {
      console.log("  All intended masters: no external master owner. Clear to master here.");
    }
  } else {
    console.log("  All intended masters: zero pre-existing master rows. Clear to master here.");
  }
}

async function main() {
  console.log("=== Modularize UEM (domain 86) ===");
  await masterPreCheck();

  const modMap = await upsertModules();

  for (const m of MODULES) {
    const moduleId = modMap.get(m.code);
    if (!moduleId) throw new Error(`module id not found after upsert: ${m.code}`);
    console.log(`\n--- ${m.code} (id ${moduleId}) ---`);
    await upsertCapabilities(moduleId, m.capability_ids);
    await upsertDMDO(moduleId, m.data_objects);
  }

  // ----- Verification -----
  console.log("\n=== Verification ===");
  const mods = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`,
  );
  console.log(`  modules: ${mods.length}`);
  const modIds = mods.map((r: any) => r.id);

  // every capability placed
  const placedCaps = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=in.(${modIds.join(",")})&select=capability_id`,
  );
  const placedCapSet = new Set(placedCaps.map((r: any) => r.capability_id));
  const allCaps = [239, 240, 241, 242, 243];
  const orphanCaps = allCaps.filter(c => !placedCapSet.has(c));
  console.log(`  capabilities placed: ${placedCapSet.size}/5 ${orphanCaps.length ? "ORPHANS=" + orphanCaps.join(",") : "(all placed)"}`);

  // every module has >=1 cap and >=1 data_object
  for (const mod of mods) {
    const caps = await semantius(
      "GET",
      `/domain_module_capabilities?domain_module_id=eq.${mod.id}&select=capability_id`,
    );
    const dos = await semantius(
      "GET",
      `/domain_module_data_objects?domain_module_id=eq.${mod.id}&select=data_object_id`,
    );
    const flag = caps.length >= 1 && dos.length >= 1 ? "OK" : "EMPTY/INVALID";
    console.log(`  ${mod.domain_module_code}: ${caps.length} caps, ${dos.length} data_objects [${flag}]`);
  }

  // each master once in-domain AND catalog-wide
  const masterIds = MODULES.flatMap(m =>
    m.data_objects.filter(d => d.role === "master").map(d => d.id),
  );
  const masterRows = await semantius(
    "GET",
    `/domain_module_data_objects?data_object_id=in.(${masterIds.join(",")})&role=eq.master&select=domain_module_id,data_object_id`,
  );
  const countById = new Map<number, number>();
  for (const r of masterRows) countById.set(r.data_object_id, (countById.get(r.data_object_id) ?? 0) + 1);
  for (const id of masterIds) {
    const c = countById.get(id) ?? 0;
    console.log(`  master ${id}: ${c} catalog-wide master row(s) ${c === 1 ? "[OK]" : "[VIOLATION]"}`);
  }

  console.log("\nDone.");
  console.log("UI: https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.86");
  console.log("UI: https://tests.semantius.app/domain_map/domain_module_data_objects");
}

main().catch(e => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
