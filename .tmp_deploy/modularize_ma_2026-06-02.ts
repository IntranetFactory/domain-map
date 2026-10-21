#!/usr/bin/env bun
// Modularize MA (Marketing Automation, domain_id=70).
// Creates 4 full domain_modules, links every capability to a realizing module,
// and assigns every existing data_object to its module(s) preserving role + necessity.
// Scope: modules + entity assignment ONLY. No new data_objects / capabilities / lifecycle / skills.
// Idempotent: reads existing by natural key before each insert. Safe to re-run.

type Json = any;

const DOMAIN_ID = 70;

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

// ----- Module definitions (R18: described by capability shape, no vendor/product names) -----

type ModuleDef = {
  domain_module_code: string;
  domain_module_name: string;
  description: string;
  capabilities: number[];      // capability ids realized here (M4/M6)
  dataObjects: { id: number; role: string; necessity: string }[]; // DMDO rows
};

const MODULES: ModuleDef[] = [
  {
    domain_module_code: "MA-CAMPAIGN-AUTHORING",
    domain_module_name: "Campaign Authoring and Send",
    description:
      "Authors marketing campaigns and email content, runs the send pipeline, performs A/B and send-time optimization, applies generative content assistance, and measures multi-touch attribution against engagement.",
    capabilities: [262, 267, 269, 268], // EMAIL-CAMPAIGN, AB-OPTIMIZATION, GEN-AI-CONTENT, ATTRIB-MEASURE
    dataObjects: [
      { id: 116, role: "master", necessity: "required" },      // marketing_campaigns
      { id: 117, role: "master", necessity: "required" },      // marketing_emails
      { id: 98, role: "contributor", necessity: "required" },  // crm_contacts
      { id: 111, role: "contributor", necessity: "required" }, // customer_events
      { id: 113, role: "consumer", necessity: "required" },    // audience_segments
      { id: 114, role: "consumer", necessity: "required" },    // customer_attributes
    ],
  },
  {
    domain_module_code: "MA-JOURNEY-ORCH",
    domain_module_name: "Cross-Channel Journey Orchestration",
    description:
      "Designs and runs multi-step, multi-channel nurture journeys spanning email, mobile push, in-app, and SMS, with branching, wait conditions, and frequency capping.",
    capabilities: [263, 266], // JOURNEY-ORCH, MOBILE-PUSH
    dataObjects: [
      { id: 119, role: "master", necessity: "required" },      // nurture_journeys
      { id: 97, role: "contributor", necessity: "required" },  // customers
      { id: 111, role: "contributor", necessity: "required" }, // customer_events
      { id: 113, role: "consumer", necessity: "required" },    // audience_segments
      { id: 114, role: "consumer", necessity: "required" },    // customer_attributes
    ],
  },
  {
    domain_module_code: "MA-LEAD-SCORING",
    domain_module_name: "Lead Scoring and Nurturing",
    description:
      "Computes behavioral and demographic lead scores from explicit and implicit signals, applies grading and decay rules, and triggers nurture enrollment and qualified-lead routing.",
    capabilities: [264], // LEAD-SCORING
    dataObjects: [
      { id: 118, role: "master", necessity: "required" },      // lead_scores
      { id: 98, role: "contributor", necessity: "required" },  // crm_contacts
      { id: 111, role: "contributor", necessity: "required" }, // customer_events
      { id: 114, role: "consumer", necessity: "required" },    // customer_attributes
    ],
  },
  {
    domain_module_code: "MA-LANDING-FORMS",
    domain_module_name: "Landing Pages and Forms",
    description:
      "Builds hosted landing pages and embeddable lead-capture forms with progressive profiling, conditional logic, and post-submit routing into scoring and nurture.",
    capabilities: [265], // LANDING-FORMS
    dataObjects: [
      { id: 120, role: "master", necessity: "required" },      // marketing_forms
      { id: 98, role: "contributor", necessity: "required" },  // crm_contacts
      { id: 97, role: "contributor", necessity: "required" },  // customers
    ],
  },
];

// ----- Phase 1: upsert domain_modules (key = domain_module_code) -----

async function upsertModules(): Promise<Map<string, number>> {
  const codes = MODULES.map(m => m.domain_module_code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const existingCodes = new Set((existing ?? []).map((r: any) => r.domain_module_code));
  const toInsert = MODULES.filter(m => !existingCodes.has(m.domain_module_code)).map(m => ({
    domain_module_name: m.domain_module_name,
    domain_module_code: m.domain_module_code,
    description: m.description,
    domain_id: DOMAIN_ID,
    module_kind: "full",
    // R1: omit record_status. M8/A4: omit catalog_tagline / catalog_description.
  }));
  if (toInsert.length) {
    await semantius("POST", "/domain_modules", toInsert);
    console.log(`  +${toInsert.length} domain_modules: ${toInsert.map(r => r.domain_module_code).join(", ")}`);
  } else {
    console.log("  domain_modules: all present, none inserted");
  }
  // Re-read to build code -> id map (never hard-code ids).
  const all = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  for (const code of codes) {
    if (!map.has(code)) throw new Error(`module not found after upsert: ${code}`);
  }
  return map;
}

// ----- Phase 2: upsert domain_module_capabilities (key = (domain_module_id, capability_id)) -----

async function upsertCapabilities(moduleId: number, capIds: number[]): Promise<number> {
  if (!capIds.length) return 0;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capIds.join(",")})&select=capability_id`,
  );
  const existingIds = new Set((existing ?? []).map((r: any) => r.capability_id));
  const toInsert = capIds
    .filter(id => !existingIds.has(id))
    .map(id => ({ domain_module_id: moduleId, capability_id: id })); // R15: omit notes; omit label
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`    +${toInsert.length} capability links on module ${moduleId}`);
  }
  return toInsert.length;
}

// ----- Phase 3: upsert domain_module_data_objects (key = (domain_module_id, data_object_id)) -----

async function upsertDMDO(
  moduleId: number,
  rows: { id: number; role: string; necessity: string }[],
): Promise<number> {
  if (!rows.length) return 0;
  const ids = rows.map(r => r.id);
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`,
  );
  const existingIds = new Set((existing ?? []).map((r: any) => r.data_object_id));
  const toInsert = rows
    .filter(r => !existingIds.has(r.id))
    .map(r => ({
      domain_module_id: moduleId,
      data_object_id: r.id,
      role: r.role,
      necessity: r.necessity,
      // R15: omit notes; omit label (auto-computed)
    }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`    +${toInsert.length} DMDO rows on module ${moduleId}`);
  }
  return toInsert.length;
}

async function main() {
  console.log("=== Modularize MA (domain_id=70) ===");

  console.log("\nPhase 1: domain_modules");
  const moduleMap = await upsertModules();
  for (const [code, id] of moduleMap) console.log(`  ${code} -> ${id}`);

  console.log("\nPhase 2: domain_module_capabilities");
  let capCount = 0;
  for (const m of MODULES) {
    capCount += await upsertCapabilities(moduleMap.get(m.domain_module_code)!, m.capabilities);
  }

  console.log("\nPhase 3: domain_module_data_objects");
  let dmdoCount = 0;
  for (const m of MODULES) {
    dmdoCount += await upsertDMDO(moduleMap.get(m.domain_module_code)!, m.dataObjects);
  }

  console.log(`\nInserted this run: ${capCount} capability links, ${dmdoCount} DMDO rows.`);
  console.log("Done.");
}

main().catch(e => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
