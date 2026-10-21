#!/usr/bin/env bun
// Modularize ACCT-PRACT-MGMT (domain_id=152). Creates 3 full domain_modules,
// links existing capabilities and existing data_objects at their existing role+necessity.
// Does NOT create new data_objects, capabilities, lifecycle states, skills, tools, handoffs,
// or relationships. Idempotent: re-running skips already-present rows.
//
// Natural keys:
//   domain_modules                 -> domain_module_code
//   domain_module_capabilities     -> (domain_module_id, capability_id)
//   domain_module_data_objects     -> (domain_module_id, data_object_id)

type Json = any;

const DOMAIN_ID = 152;

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

// ------------------------------------------------------------------
// Module specs (full modules; buyer copy intentionally omitted -> M8/A4 gap)
// ------------------------------------------------------------------
type ModuleSpec = {
  domain_module_code: string;
  domain_module_name: string;
  description: string;
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_code: "ACCT-PRACT-MGMT-ENGAGEMENT-WORKFLOW",
    domain_module_name: "Engagement and Service-Line Workflow",
    description:
      "Per-engagement workflow templates and task assignment across service lines, sign-off checkpoints and partner-review routing, tax-calendar-driven recurring deadlines, and engagement-letter and proposal management with recurring annual re-engagement. Owns the engagement record as the workflow envelope that scopes the work.",
  },
  {
    domain_module_code: "ACCT-PRACT-MGMT-TAX-RETURN-PREP",
    domain_module_name: "Tax Return Preparation and Document Retention",
    description:
      "Tax-return preparation and filing lifecycle (in-prep, review, ready-for-signature, filed, accepted, rejected) and client-folder document storage with preparer retention rules, prior-year carryforward, and classification by year and form type. Publishes return-state transitions to downstream compliance and billing consumers.",
  },
  {
    domain_module_code: "ACCT-PRACT-MGMT-CLIENT-PORTAL-BILLING",
    domain_module_name: "Client Portal and Time and Billing",
    description:
      "Secure client portal for document upload and e-signature with client-task-list tracking, plus timekeeper time-entry per engagement, value-billing and hourly options, WIP and AR reporting, and fee-quote-to-invoice workflow. The client-facing surface and the monetization surface of the practice.",
  },
];

// ------------------------------------------------------------------
// Capability links per module (existing capabilities only)
// ------------------------------------------------------------------
const CAPABILITIES: Record<string, number[]> = {
  // ACCT-WORKFLOW=434, ACCT-DEADLINE-MGMT=438, ACCT-ENGAGEMENT-LTR=437
  "ACCT-PRACT-MGMT-ENGAGEMENT-WORKFLOW": [434, 438, 437],
  // ACCT-DOC-MGMT=439
  "ACCT-PRACT-MGMT-TAX-RETURN-PREP": [439],
  // ACCT-CLIENT-PORTAL=435, ACCT-TIME-BILLING=436
  "ACCT-PRACT-MGMT-CLIENT-PORTAL-BILLING": [435, 436],
};

// ------------------------------------------------------------------
// Data-object assignments per module (existing data_objects only,
// preserving existing role + necessity from domain_data_objects).
// Existing domain_data_objects rows (domain 152):
//   400 tax_returns         master      required
//   401 client_engagements  master      required
//   394 engagement_letters  contributor required
//   162 time_entries        contributor required
//    75 supplier_invoices   contributor required
//    98 crm_contacts        contributor required
// ------------------------------------------------------------------
type DMDOSpec = { data_object_id: number; role: string; necessity: string };

const DATA_OBJECTS: Record<string, DMDOSpec[]> = {
  "ACCT-PRACT-MGMT-ENGAGEMENT-WORKFLOW": [
    { data_object_id: 401, role: "master", necessity: "required" }, // client_engagements (single master here)
    { data_object_id: 394, role: "contributor", necessity: "required" }, // engagement_letters (LEGAL-mastered)
    { data_object_id: 98, role: "contributor", necessity: "required" }, // crm_contacts (CRM-mastered)
  ],
  "ACCT-PRACT-MGMT-TAX-RETURN-PREP": [
    { data_object_id: 400, role: "master", necessity: "required" }, // tax_returns (single master here)
    { data_object_id: 75, role: "contributor", necessity: "required" }, // supplier_invoices (S2P-mastered)
  ],
  "ACCT-PRACT-MGMT-CLIENT-PORTAL-BILLING": [
    { data_object_id: 162, role: "contributor", necessity: "required" }, // time_entries (WFM-mastered)
  ],
};

async function ensureModules(): Promise<Map<string, number>> {
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
    console.log("  domain_modules: all present, nothing to insert");
  }
  // Re-read for the code -> id map (never hard-code ids)
  const all = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  for (const code of codes) {
    if (!map.has(code)) throw new Error(`module not found after insert: ${code}`);
  }
  return map;
}

async function ensureCapabilities(moduleMap: Map<string, number>): Promise<void> {
  for (const [code, capIds] of Object.entries(CAPABILITIES)) {
    const moduleId = moduleMap.get(code)!;
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
      console.log(`  +${toInsert.length} DMC on ${code}`);
    }
  }
}

async function ensureDataObjects(moduleMap: Map<string, number>): Promise<void> {
  for (const [code, rows] of Object.entries(DATA_OBJECTS)) {
    const moduleId = moduleMap.get(code)!;
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
      console.log(`  +${toInsert.length} DMDO on ${code}`);
    }
  }
}

async function verify(moduleMap: Map<string, number>): Promise<void> {
  console.log("\n=== VERIFY ===");
  const modIds = [...moduleMap.values()];
  const dmc = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,capability_id`,
  );
  const dmdo = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id,role,necessity`,
  );
  const placedCaps = new Set((dmc ?? []).map((r: any) => r.capability_id));
  const allCaps = [434, 435, 436, 437, 438, 439];
  const missingCaps = allCaps.filter(c => !placedCaps.has(c));
  console.log(`  DMC rows: ${dmc.length}; capabilities placed: ${placedCaps.size}/6` +
    (missingCaps.length ? ` MISSING ${missingCaps.join(",")}` : " (all placed)"));

  const masterCount: Record<number, number> = {};
  for (const r of dmdo ?? []) {
    if (r.role === "master") masterCount[r.data_object_id] = (masterCount[r.data_object_id] ?? 0) + 1;
  }
  console.log(`  DMDO rows: ${dmdo.length}`);
  for (const [doid, n] of Object.entries(masterCount)) {
    console.log(`    master ${doid}: in ${n} module(s)` + (n === 1 ? " OK" : " VIOLATION (M7)"));
  }
  // Empty-module check
  for (const [code, id] of moduleMap.entries()) {
    const caps = (dmc ?? []).filter((r: any) => r.domain_module_id === id).length;
    const dos = (dmdo ?? []).filter((r: any) => r.domain_module_id === id).length;
    const flag = caps >= 1 && dos >= 1 ? "OK" : "EMPTY-MODULE VIOLATION";
    console.log(`    module ${code} (id=${id}): ${caps} caps, ${dos} data_objects -> ${flag}`);
  }
}

async function main() {
  console.log("=== Modularize ACCT-PRACT-MGMT (domain 152) ===");
  const moduleMap = await ensureModules();
  await ensureCapabilities(moduleMap);
  await ensureDataObjects(moduleMap);
  await verify(moduleMap);
  console.log("\nDone.");
}

main().catch(e => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
