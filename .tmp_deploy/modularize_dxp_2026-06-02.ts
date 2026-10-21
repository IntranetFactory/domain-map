#!/usr/bin/env bun
// Idempotent modularization loader for DXP (Digital Experience Platform, domain_id 77).
// Creates 3 full domain_modules, links the 6 existing capabilities, and assigns the
// 7 existing master data_objects (ids 441-447) at their roles. Reuses existing entities
// only: creates NO data_objects, capabilities, lifecycle states, skills, tools, handoffs,
// or relationships. Safe to re-run.

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

const DOMAIN_ID = 77;

// Module definitions -------------------------------------------------------
type ModuleSpec = {
  domain_module_name: string;
  domain_module_code: string;
  description: string;
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_name: "Authoring and Multi-Site",
    domain_module_code: "DXP-AUTHORING",
    description:
      "Page-level and component authoring, content modeling, publishing, and centralized management of multiple sites, brands, and locales for branded customer-facing web experiences.",
  },
  {
    domain_module_name: "Experience Personalization and Experimentation",
    domain_module_code: "DXP-EXPERIENCE-PERSONALIZATION",
    description:
      "Rule-based and audience-targeted personalization of content and journeys, plus A/B and multivariate experimentation across variants with statistical reporting.",
  },
  {
    domain_module_name: "Portal and Journey Orchestration",
    domain_module_code: "DXP-PORTAL-JOURNEYS",
    description:
      "Authenticated customer and partner portal experiences with self-service, plus form authoring, progressive profiling, and multi-step journey orchestration integrated with content and personalization.",
  },
];

// Capability codes -> module codes -----------------------------------------
const CAPABILITY_LINKS: Record<string, string[]> = {
  "DXP-AUTHORING": ["DXP-WCM", "DXP-MULTISITE"],
  "DXP-EXPERIENCE-PERSONALIZATION": ["DXP-PERSONALIZE", "DXP-AB-TEST"],
  "DXP-PORTAL-JOURNEYS": ["DXP-PORTAL", "DXP-FORM-JOURNEY"],
};

// data_object assignments (by name) -> { module, role, necessity } ---------
type DMDOSpec = { data_object_name: string; role: string; necessity: string };
const DMDO_BY_MODULE: Record<string, DMDOSpec[]> = {
  "DXP-AUTHORING": [
    { data_object_name: "web_pages", role: "master", necessity: "required" },
    { data_object_name: "content_components", role: "master", necessity: "required" },
    { data_object_name: "digital_experiences", role: "master", necessity: "required" },
  ],
  "DXP-EXPERIENCE-PERSONALIZATION": [
    { data_object_name: "personalization_rules", role: "master", necessity: "required" },
    { data_object_name: "ab_tests", role: "master", necessity: "required" },
    { data_object_name: "segments_dxp", role: "master", necessity: "required" },
    { data_object_name: "digital_experiences", role: "embedded_master", necessity: "optional" },
  ],
  "DXP-PORTAL-JOURNEYS": [
    { data_object_name: "journey_steps", role: "master", necessity: "required" },
    { data_object_name: "digital_experiences", role: "embedded_master", necessity: "optional" },
  ],
};

async function main() {
  // --- Phase 1: domain_modules (idempotent on domain_module_code) ----------
  const existingMods = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`,
  );
  const existingCodes = new Set<string>(existingMods.map((m: any) => m.domain_module_code));
  const toInsert = MODULES.filter((m) => !existingCodes.has(m.domain_module_code)).map((m) => ({
    domain_module_name: m.domain_module_name,
    domain_module_code: m.domain_module_code,
    description: m.description,
    domain_id: DOMAIN_ID,
    module_kind: "full",
  }));
  if (toInsert.length) {
    await semantius("POST", "/domain_modules", toInsert);
    console.log(`+${toInsert.length} domain_modules: ${toInsert.map((m) => m.domain_module_code).join(", ")}`);
  } else {
    console.log("domain_modules already present; no inserts");
  }

  // Re-read for code -> id map
  const mods = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`,
  );
  const modId = new Map<string, number>();
  for (const m of mods) modId.set(m.domain_module_code, m.id);
  for (const spec of MODULES) {
    if (!modId.has(spec.domain_module_code)) throw new Error(`module not found after insert: ${spec.domain_module_code}`);
  }

  // Capability code -> id
  const caps = await semantius(
    "GET",
    `/capability_domains?domain_id=eq.${DOMAIN_ID}&select=capability_id,capabilities(capability_code)`,
  );
  const capId = new Map<string, number>();
  for (const c of caps) capId.set(c.capabilities.capability_code, c.capability_id);

  // data_object name -> id
  const names = [...new Set(Object.values(DMDO_BY_MODULE).flat().map((d) => d.data_object_name))];
  const dobjs = await semantius(
    "GET",
    `/data_objects?data_object_name=in.(${names.join(",")})&select=id,data_object_name`,
  );
  const dobjId = new Map<string, number>();
  for (const d of dobjs) dobjId.set(d.data_object_name, d.id);
  for (const n of names) if (!dobjId.has(n)) throw new Error(`data_object not found: ${n}`);

  // --- Phase 2: domain_module_capabilities (idempotent) --------------------
  for (const [modCode, capCodes] of Object.entries(CAPABILITY_LINKS)) {
    const mid = modId.get(modCode)!;
    const existing = await semantius(
      "GET",
      `/domain_module_capabilities?domain_module_id=eq.${mid}&select=capability_id`,
    );
    const have = new Set<number>(existing.map((r: any) => r.capability_id));
    const rows = capCodes
      .map((cc) => capId.get(cc)!)
      .filter((cid) => !have.has(cid))
      .map((cid) => ({ domain_module_id: mid, capability_id: cid }));
    if (rows.length) {
      await semantius("POST", "/domain_module_capabilities", rows);
      console.log(`+${rows.length} capability links on ${modCode}`);
    }
  }

  // --- Phase 3: domain_module_data_objects (idempotent) --------------------
  for (const [modCode, specs] of Object.entries(DMDO_BY_MODULE)) {
    const mid = modId.get(modCode)!;
    const existing = await semantius(
      "GET",
      `/domain_module_data_objects?domain_module_id=eq.${mid}&select=data_object_id`,
    );
    const have = new Set<number>(existing.map((r: any) => r.data_object_id));
    const rows = specs
      .filter((s) => !have.has(dobjId.get(s.data_object_name)!))
      .map((s) => ({
        domain_module_id: mid,
        data_object_id: dobjId.get(s.data_object_name)!,
        role: s.role,
        necessity: s.necessity,
      }));
    if (rows.length) {
      await semantius("POST", "/domain_module_data_objects", rows);
      console.log(`+${rows.length} DMDO rows on ${modCode}`);
    }
  }

  // --- Verify --------------------------------------------------------------
  console.log("\n=== Verification ===");
  // Catalog-wide master uniqueness for the 7 DXP masters
  const masterRows = await semantius(
    "GET",
    `/domain_module_data_objects?data_object_id=in.(441,442,443,444,445,446,447)&role=eq.master&select=data_object_id,domain_module_id`,
  );
  const masterCount = new Map<number, number>();
  for (const r of masterRows) masterCount.set(r.data_object_id, (masterCount.get(r.data_object_id) ?? 0) + 1);
  for (const [doid, cnt] of masterCount) {
    if (cnt !== 1) console.log(`  WARN: data_object ${doid} mastered ${cnt}x catalog-wide (expected 1)`);
  }
  console.log(`  masters (catalog-wide, ids 441-447): ${[...masterCount.entries()].map(([k, v]) => `${k}:${v}`).join(" ")}`);

  // Each module has >=1 capability and >=1 data_object
  for (const spec of MODULES) {
    const mid = modId.get(spec.domain_module_code)!;
    const c = await semantius("GET", `/domain_module_capabilities?domain_module_id=eq.${mid}&select=capability_id`);
    const d = await semantius("GET", `/domain_module_data_objects?domain_module_id=eq.${mid}&select=data_object_id,role,necessity`);
    console.log(`  ${spec.domain_module_code}: ${c.length} caps, ${d.length} data_objects -> ${d.map((x: any) => `${x.data_object_id}(${x.role})`).join(", ")}`);
    if (c.length < 1) console.log(`    WARN: ${spec.domain_module_code} has no capabilities`);
    if (d.length < 1) console.log(`    WARN: ${spec.domain_module_code} has no data_objects`);
  }

  console.log("\nDone.");
  console.log("UI: https://tests.semantius.app/domain_map/domain_modules");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
