#!/usr/bin/env bun
// Modularize WEB-CONTOPS (domain 128): author 4 full modules, link 8 capabilities,
// assign 7 existing master data_objects at their existing role+necessity.
// Scope: modules + entity assignment ONLY. Reuses existing entities. No new data_objects,
// capabilities, lifecycle states, skills, tools, handoffs, or relationships.
// Idempotent. Safe to re-run.

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

const DOMAIN_ID = 128;

// ---- Module definitions ----
type ModuleSpec = {
  code: string;
  name: string;
  description: string;
  capability_ids: number[];
  // data_object assignments at existing role+necessity (all 7 are master/required today)
  data_objects: { data_object_id: number; role: string; necessity: string }[];
};

const MODULES: ModuleSpec[] = [
  {
    code: "WEB-CONTOPS-AUDIT-INVENTORY",
    name: "Content Audit and Inventory",
    description:
      "Crawl-based inventory and scheduled audit of web content across one or more sites. Surfaces page-level metadata, ownership, freshness, health scoring, and orphaned-page detection so the web team can govern the full content estate.",
    capability_ids: [155], // WCO-AUDIT
    data_objects: [
      { data_object_id: 684, role: "master", necessity: "required" }, // content_audits
      { data_object_id: 685, role: "master", necessity: "required" }, // web_content_inventory_records
    ],
  },
  {
    code: "WEB-CONTOPS-EDITORIAL-PLANNING",
    name: "Editorial Workflow and Planning",
    description:
      "Editorial calendar, briefs, assignments, and draft / review / approval workflow over web content production, plus content-lifecycle governance: review cadence, refresh frequency, retirement, and successor planning across campaigns, channels, audiences, and personas.",
    capability_ids: [156, 161], // WCO-EDITORIAL, WCO-CALENDAR
    data_objects: [
      { data_object_id: 690, role: "master", necessity: "required" }, // content_lifecycle_plans
    ],
  },
  {
    code: "WEB-CONTOPS-QUALITY-ACCESS",
    name: "Content Quality and Accessibility Scanning",
    description:
      "Automated scanning of web content for accessibility conformance, brand voice and style adherence, readability, and policy compliance, with prioritized remediation queues, severity scoring, and evidence reporting for legal and procurement.",
    capability_ids: [157, 158, 162], // WCO-QUALITY, WCO-ACCESS, WCO-BRAND-VOICE
    data_objects: [
      { data_object_id: 686, role: "master", necessity: "required" }, // accessibility_scan_findings
      { data_object_id: 689, role: "master", necessity: "required" }, // brand_voice_violations
    ],
  },
  {
    code: "WEB-CONTOPS-SEO-LINKS",
    name: "Technical SEO and Link Governance",
    description:
      "Continuous monitoring of crawlability, indexation, canonical and structured-data health, and broken internal / external links across large web estates, with owner notification and remediation tracking into editorial workflow.",
    capability_ids: [159, 160], // WCO-SEO-GOV, WCO-LINKS
    data_objects: [
      { data_object_id: 688, role: "master", necessity: "required" }, // technical_seo_findings
      { data_object_id: 687, role: "master", necessity: "required" }, // broken_link_findings
    ],
  },
];

async function ensureModules(): Promise<Map<string, number>> {
  const codes = MODULES.map((m) => m.code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`
  );
  const existingCodes = new Set(existing.map((r: any) => r.domain_module_code));
  const toInsert = MODULES.filter((m) => !existingCodes.has(m.code)).map((m) => ({
    domain_module_name: m.name,
    domain_module_code: m.code,
    description: m.description,
    domain_id: DOMAIN_ID,
    module_kind: "full",
  }));
  if (toInsert.length) {
    await semantius("POST", "/domain_modules", toInsert);
    console.log(`  +${toInsert.length} domain_modules: ${toInsert.map((r) => r.domain_module_code).join(", ")}`);
  } else {
    console.log("  all 4 domain_modules already present");
  }
  // re-read for code->id map
  const all = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  return map;
}

async function ensureCapabilities(moduleId: number, capIds: number[]): Promise<void> {
  if (!capIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capIds.join(",")})&select=capability_id`
  );
  const existingIds = new Set(existing.map((r: any) => r.capability_id));
  const toInsert = capIds
    .filter((id) => !existingIds.has(id))
    .map((capability_id) => ({ domain_module_id: moduleId, capability_id }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`    +${toInsert.length} capability links on module ${moduleId}`);
  }
}

async function ensureDMDO(
  moduleId: number,
  rows: { data_object_id: number; role: string; necessity: string }[]
): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map((r) => r.data_object_id);
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`
  );
  const existingIds = new Set(existing.map((r: any) => r.data_object_id));
  const toInsert = rows
    .filter((r) => !existingIds.has(r.data_object_id))
    .map((r) => ({
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
  console.log("=== Modularize WEB-CONTOPS (domain 128) ===");

  // Catalog-wide master pre-check (M7): none of the 7 masters may already be mastered elsewhere.
  const masterIds = [684, 685, 686, 687, 688, 689, 690];
  const preCheck = await semantius(
    "GET",
    `/domain_module_data_objects?data_object_id=in.(${masterIds.join(",")})&role=eq.master&select=domain_module_id,data_object_id,domain_modules(domain_module_code,domain_id)`
  );
  const foreignMasters = (preCheck || []).filter(
    (r: any) => r.domain_modules?.domain_id !== DOMAIN_ID
  );
  if (foreignMasters.length) {
    console.error("PRE-CHECK FAIL: data_objects already mastered in another domain:");
    for (const r of foreignMasters) {
      console.error(`  data_object ${r.data_object_id} mastered by ${r.domain_modules?.domain_module_code}`);
    }
    throw new Error("Catalog-wide master collision detected. Resolve before assigning master here.");
  }
  console.log("  pre-check passed: no foreign master rows for the 7 WEB-CONTOPS data_objects");

  const moduleMap = await ensureModules();

  for (const m of MODULES) {
    const moduleId = moduleMap.get(m.code);
    if (!moduleId) throw new Error(`module id not found after insert: ${m.code}`);
    console.log(`  module ${m.code} -> id ${moduleId}`);
    await ensureCapabilities(moduleId, m.capability_ids);
    await ensureDMDO(moduleId, m.data_objects);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
