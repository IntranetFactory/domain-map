#!/usr/bin/env bun
// Idempotent modularization loader for domain CDP (id 72).
// Creates 4 full domain_modules, links existing capabilities (domain_module_capabilities),
// and assigns existing data_objects (domain_module_data_objects) at their existing role+necessity.
// Does NOT create data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships.
// Safe to re-run.

type Json = any;

const DOMAIN_ID = 72;

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

// ----------------------------------------------------------------
// Module definitions (natural key = domain_module_code)
// ----------------------------------------------------------------

type ModuleSpec = {
  domain_module_code: string;
  domain_module_name: string;
  description: string;
  capability_ids: number[];
  // data_object assignments: [data_object_id, role, necessity]
  data_objects: { data_object_id: number; role: string; necessity: string }[];
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_code: "CDP-INGEST-IDENTITY",
    domain_module_name: "Ingestion and Identity Resolution",
    description:
      "Real-time and batch collection of behavioral, transactional, and identifier data from sources, plus deterministic and probabilistic stitching of disparate identifiers into a unified entity graph. Houses the raw event firehose and the identity-resolution overlay that turns anonymous interactions into resolved profiles.",
    capability_ids: [254, 255], // CDP-INGEST, IDENTITY-RESOLUTION
    data_objects: [
      { data_object_id: 111, role: "master", necessity: "required" },      // customer_events
      { data_object_id: 112, role: "master", necessity: "required" },      // identity_graphs
      { data_object_id: 98, role: "contributor", necessity: "required" },  // crm_contacts
    ],
  },
  {
    domain_module_code: "CDP-UNIFIED-PROFILE",
    domain_module_name: "Unified Profile, Attributes, and Predictive Scoring",
    description:
      "Persistent golden-record profile spanning attributes, computed traits, consent flags, and lifetime engagement history, with a derived scoring layer (LTV, RFM, churn risk, propensity) and consent and privacy state on the resolved profile. The materialized profile that downstream segments and personalization read from.",
    capability_ids: [256, 260, 259], // CDP-UNIFIED-PROFILE, CDP-PREDICTIVE, CDP-CONSENT-PRIV
    data_objects: [
      { data_object_id: 97, role: "master", necessity: "required" },   // customers
      { data_object_id: 114, role: "master", necessity: "required" },  // customer_attributes
      { data_object_id: 118, role: "consumer", necessity: "required" },// lead_scores
    ],
  },
  {
    domain_module_code: "CDP-SEGMENTATION-ACTIVATION",
    domain_module_name: "Segmentation and Downstream Activation",
    description:
      "Visual rule building for static and dynamic audiences over profile attributes and behavioral events, plus pushing those audiences and traits to ad platforms, marketing tools, CRM, and ad-server destinations via reverse-ETL or native connectors, including warehouse-native zero-copy operation. Authors and activates segments outbound.",
    capability_ids: [257, 258, 261], // CDP-SEGMENTATION, CDP-ACTIVATION, CDP-COMPOSABLE-WH
    data_objects: [
      { data_object_id: 113, role: "master", necessity: "required" },   // audience_segments
      { data_object_id: 116, role: "consumer", necessity: "required" }, // marketing_campaigns
      { data_object_id: 123, role: "consumer", necessity: "required" }, // sales_emails
    ],
  },
  {
    domain_module_code: "CDP-JOURNEYS-360",
    domain_module_name: "Observed Journeys and Customer 360",
    description:
      "Observed multi-channel journey progression (the inbound view of how a customer moved through touchpoints over time) reconciled into a single queryable customer view across transactional, marketing, and operational systems. Descriptive journey history rather than orchestrated outbound sequences.",
    capability_ids: [310], // CUSTOMER-360
    data_objects: [
      { data_object_id: 115, role: "master", necessity: "required" }, // customer_journeys
    ],
  },
];

// ----------------------------------------------------------------
// Idempotent upserts
// ----------------------------------------------------------------

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
    console.log(`  +${toInsert.length} domain_modules: ${toInsert.map(r => r.domain_module_code).join(", ")}`);
  } else {
    console.log("  modules already present, no inserts");
  }
  // Re-read for code -> id map (never hard-code ids)
  const all = await semantius("GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`);
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  return map;
}

async function upsertCapabilities(moduleId: number, capabilityIds: number[]): Promise<void> {
  if (!capabilityIds.length) return;
  const existing = await semantius("GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capabilityIds.join(",")})&select=capability_id`);
  const existingIds = new Set(existing.map((r: any) => r.capability_id));
  const toInsert = capabilityIds
    .filter(id => !existingIds.has(id))
    .map(id => ({ domain_module_id: moduleId, capability_id: id }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`    +${toInsert.length} capability links on module ${moduleId}`);
  }
}

async function upsertDMDO(moduleId: number, rows: { data_object_id: number; role: string; necessity: string }[]): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map(r => r.data_object_id);
  const existing = await semantius("GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`);
  const existingIds = new Set(existing.map((r: any) => r.data_object_id));
  const toInsert = rows
    .filter(r => !existingIds.has(r.data_object_id))
    .map(r => ({ domain_module_id: moduleId, data_object_id: r.data_object_id, role: r.role, necessity: r.necessity }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`    +${toInsert.length} DMDO rows on module ${moduleId}`);
  }
}

async function main() {
  console.log("=== Modularizing CDP (domain 72) ===");
  const idMap = await upsertModules();

  for (const m of MODULES) {
    const moduleId = idMap.get(m.domain_module_code);
    if (!moduleId) throw new Error(`module id not resolved for ${m.domain_module_code}`);
    console.log(`\n--- ${m.domain_module_code} (id ${moduleId}) ---`);
    await upsertCapabilities(moduleId, m.capability_ids);
    await upsertDMDO(moduleId, m.data_objects);
  }

  console.log("\nDone.");
}

main().catch(e => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
