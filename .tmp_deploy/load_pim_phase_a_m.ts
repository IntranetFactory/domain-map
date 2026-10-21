#!/usr/bin/env bun
// PIM (Product Information Management) Phase A + Phase M.
//
// Phase A: domain row + 8 capabilities + capability_domains + 6 new vendors + 10 solutions + solution_domains.
// Phase M: 3 modules + DMC + starter junction.
//
// Idempotent: re-reads natural keys, safe to re-run.

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const tmpPath = `c:\\tmp\\sem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.json`;
  await Bun.write(tmpPath, JSON.stringify(body));
  const proc = Bun.spawn(["bash", "-c", `semantius call crud postgrestRequest < "${tmpPath.replace(/\\/g, "/")}"`], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`Temp file kept for debug: ${tmpPath}`);
    throw new Error(`semantius call failed (exit ${code}): ${stderr}`);
  }
  try { await Bun.file(tmpPath).unlink?.(); } catch {}
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });
const post = (path: string, body: Row | Row[]) => call({ method: "POST", path, body });

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    out.push(...await post(path, rows.slice(i, i + CHUNK)));
  }
  return out;
}

// =========================================================================
// 1. Validate + insert domain
// =========================================================================
console.log("[1/7] domain PIM");

const domainRow = {
  domain_code: "PIM",
  domain_name: "Product Information Management",
  description: "Centralized merchandising master for product attributes, descriptions, digital assets, taxonomies, translations, and channel-specific syndication. Distinct from PLM (engineering record), MDM (cross-entity golden records), and the commerce-platform-native catalog (runtime storefront view). Vendors: Akeneo, Salsify, inRiver, Stibo Systems STEP, Informatica Product 360, Syndigo (Riversand), Contentserv, Pimcore, SAP MDG for Product, Plytix.",
  crud_percentage: 75,
  min_org_size: "30 m <2500",
  cost_band: "$$$",
  certification_required: false,
  usa_market_size_usd_m: 1800,
  market_size_source_year: 2024,
  business_logic: "AI-driven attribute generation and translation, per-channel feed-shape validation (Amazon, Google Merchant, GDSN datapools), golden-record survivorship across supplier data sources, locale-specific overrides, and approval workflows before publish.",
};

// validateDomainRow inline
function validateDomainRow(r: Row) {
  if (Number(r.crud_percentage) === 0) throw new Error("crud_percentage missing");
  if (!r.min_org_size) throw new Error("min_org_size missing");
  if (!r.cost_band) throw new Error("cost_band missing");
  if (!r.business_logic && Number(r.crud_percentage) < 95) throw new Error("business_logic required when crud_percentage<95");
  if (!r.usa_market_size_usd_m) throw new Error("usa_market_size_usd_m missing");
  if (!r.market_size_source_year) throw new Error("market_size_source_year missing");
}
validateDomainRow(domainRow);

let domain = await get(`/domains?domain_code=eq.PIM&select=id`);
if (domain.length === 0) {
  await post("/domains", domainRow);
  domain = await get(`/domains?domain_code=eq.PIM&select=id`);
  console.log(`  inserted domain id=${domain[0].id}`);
} else {
  console.log(`  exists id=${domain[0].id}`);
}
const PIM_ID = Number(domain[0].id);

// =========================================================================
// 2. Capabilities
// =========================================================================
console.log("\n[2/7] capabilities");

const capDefs = [
  { capability_code: "PIM-PRODUCT-ENRICHMENT", capability_name: "Product Content Enrichment", description: "Attribute completion, marketing copy generation, description authoring (often AI-augmented), spec-sheet ingestion, and brand-voice consistency across the merchandising catalog." },
  { capability_code: "PIM-DIGITAL-ASSET-MGMT", capability_name: "Digital Asset Management for Products", description: "Image, video, 3D model, and document asset linking to products with rights metadata, renditions, and CDN distribution. The DAM slice that lives inside PIM in v1; can be promoted to its own domain later." },
  { capability_code: "PIM-TAXONOMY-MGMT", capability_name: "Product Taxonomy and Classification", description: "Multi-tree taxonomy management (merchandising tree, channel-specific trees, ERP category tree), attribute-group definitions, and faceted-navigation classification used by storefronts and feeds." },
  { capability_code: "PIM-CHANNEL-SYNDICATION", capability_name: "Channel Syndication", description: "Per-channel feed shaping (Amazon Seller, Google Merchant, Shopify, retailer feeds, GDSN datapools), validation against destination schemas, syndication-job orchestration, and publish-result tracking." },
  { capability_code: "PIM-LOCALIZATION", capability_name: "Product Localization", description: "Locale-specific attribute and description variants, translation workflow (machine + human), region-specific imagery overrides, and locale-aware publishing." },
  { capability_code: "PIM-SUPPLIER-ONBOARDING", capability_name: "Supplier Product Onboarding", description: "Supplier data-sheet ingestion (spreadsheets, GS1 GDSN feeds, supplier portals), schema mapping from supplier vocabularies to internal attributes, and supplier-data quality scoring." },
  { capability_code: "PIM-PRODUCT-COMPLIANCE", capability_name: "Product Compliance Attributes", description: "Region-specific regulatory attribute management (REACH, RoHS, Prop 65, FDA, CE), compliance declaration tracking, and gating of publish on regulatory completeness." },
  { capability_code: "PIM-WORKFLOW-APPROVAL", capability_name: "Merchandising Workflow and Approval", description: "Review-and-approve gates before publish, role-based work queues for content editors and merchandisers, and audit trail of attribute changes for regulated merchandising." },
];

const existingCaps = await get(`/capabilities?capability_code=in.(${capDefs.map(c => c.capability_code).join(",")})&select=id,capability_code`);
const existingCapCodes = new Set(existingCaps.map(r => String(r.capability_code)));
const missingCaps = capDefs.filter(c => !existingCapCodes.has(c.capability_code));
if (missingCaps.length > 0) await insert("/capabilities", missingCaps);
const allCaps = await get(`/capabilities?capability_code=in.(${capDefs.map(c => c.capability_code).join(",")})&select=id,capability_code`);
const capId = new Map<string, number>();
for (const r of allCaps) capId.set(String(r.capability_code), Number(r.id));
console.log(`  ${missingCaps.length} inserted (${existingCaps.length} pre-existing). Map size=${capId.size}`);

// capability_domains
const cdRows = capDefs.map(c => ({ capability_id: capId.get(c.capability_code)!, domain_id: PIM_ID }));
const existingCd = await get(`/capability_domains?domain_id=eq.${PIM_ID}&select=capability_id`);
const existingCdIds = new Set(existingCd.map(r => Number(r.capability_id)));
const missingCd = cdRows.filter(r => !existingCdIds.has(r.capability_id));
if (missingCd.length > 0) await insert("/capability_domains", missingCd);
console.log(`  capability_domains: ${missingCd.length} inserted (${existingCd.length} pre-existing)`);

// =========================================================================
// 3. Vendors (insert missing)
// =========================================================================
console.log("\n[3/7] vendors");

const vendorDefs = [
  { vendor_name: "Akeneo", description: "Open-source-rooted PIM vendor headquartered in Nantes, France. Akeneo PIM (Community + Enterprise) is one of the catalog's flagship products." },
  { vendor_name: "Salsify", description: "Boston-headquartered PIM and ProductXM vendor. Strong on syndication-first product experience management, particularly for omni-channel CPG and retail." },
  { vendor_name: "inRiver", description: "Swedish PIM vendor; flagship is inRiver PIM. Strong on B2B manufacturing distributors and complex-attribute industrial catalogs." },
  { vendor_name: "Contentserv", description: "German PIM vendor focused on mid-market omnichannel merchandising. Acquired by Centric Software / Dassault Systemes in 2024." },
  { vendor_name: "Pimcore", description: "Austrian open-source PIM + DAM + MDM platform with community and enterprise tiers. Strong for orgs that want a single combined PIM+DAM+MDM stack." },
  { vendor_name: "Plytix", description: "Copenhagen-based SMB-focused PIM with a strong free / low-cost tier. Below the typical mid-market PIM cost band; canary for the cheapest-tier band." },
];

const existingVendors = await get(`/vendors?vendor_name=in.(${vendorDefs.map(v => `"${v.vendor_name}"`).join(",")})&select=id,vendor_name`);
const existingVendorNames = new Set(existingVendors.map(r => String(r.vendor_name)));
const missingVendors = vendorDefs.filter(v => !existingVendorNames.has(v.vendor_name));
if (missingVendors.length > 0) await insert("/vendors", missingVendors);
const allVendorNames = [...vendorDefs.map(v => v.vendor_name), "SAP SE", "Informatica", "Stibo Systems", "Syndigo"];
const vendorLookup = await get(`/vendors?vendor_name=in.(${allVendorNames.map(n => `"${n}"`).join(",")})&select=id,vendor_name`);
const vendorId = new Map<string, number>();
for (const r of vendorLookup) vendorId.set(String(r.vendor_name), Number(r.id));
console.log(`  ${missingVendors.length} new vendors (${existingVendors.length} pre-existing). All-vendor map size=${vendorId.size}`);

// =========================================================================
// 4. Solutions
// =========================================================================
console.log("\n[4/7] solutions");

const solutionDefs = [
  { solution_name: "Akeneo PIM", vendor: "Akeneo", description: "Akeneo's flagship PIM. Community edition (open-source) + Enterprise (SaaS / on-prem) + Growth (SMB). Akeneo Catalyst layers GenAI for attribute completion and copy generation." },
  { solution_name: "Salsify PXM", vendor: "Salsify", description: "Salsify's Product Experience Management platform: PIM + DAM + syndication + commerce-anywhere activation. Strong on omni-channel CPG / retail digital shelf." },
  { solution_name: "inRiver PIM", vendor: "inRiver", description: "inRiver's flagship PIM. Strong on industrial / B2B manufacturing distributor scenarios with complex attribute hierarchies." },
  { solution_name: "Stibo Systems STEP", vendor: "Stibo Systems", description: "STEP master-data platform with strong product-domain coverage. Covers PIM and MDM jointly; one of the few vendors that genuinely straddles both markets." },
  { solution_name: "Informatica Product 360", vendor: "Informatica", description: "Informatica's PIM offering (formerly Heiler Software). Often deployed alongside Informatica MDM for shared identity / golden-record governance." },
  { solution_name: "Syndigo CXH", vendor: "Syndigo", description: "Syndigo's Content Experience Hub (post-Riversand acquisition). Combines PIM, syndication, and GDSN datapool services for retail / brand manufacturers." },
  { solution_name: "Contentserv PIM", vendor: "Contentserv", description: "Contentserv's PIM platform (post-Centric acquisition). Mid-market omnichannel merchandising focus." },
  { solution_name: "Pimcore Platform", vendor: "Pimcore", description: "Pimcore open-source platform delivering PIM, DAM, MDM, and digital-experience capabilities in a single combined stack. Enterprise edition adds support and managed services." },
  { solution_name: "SAP Master Data Governance for Product", vendor: "SAP SE", description: "SAP's product-mastering MDG module. Common in SAP S/4HANA shops; bridges to S/4HANA item master and to downstream commerce / channel feeds." },
  { solution_name: "Plytix PIM", vendor: "Plytix", description: "SMB-focused PIM with a free starter tier and low-cost paid tiers. Below the typical mid-market PIM cost band." },
];

const existingSols = await get(`/solutions?solution_name=in.(${solutionDefs.map(s => `"${s.solution_name}"`).join(",")})&select=id,solution_name`);
const existingSolNames = new Set(existingSols.map(r => String(r.solution_name)));
const missingSols = solutionDefs
  .filter(s => !existingSolNames.has(s.solution_name))
  .map(({ vendor, ...rest }) => ({ ...rest, vendor_id: vendorId.get(vendor)! }));
if (missingSols.length > 0) await insert("/solutions", missingSols);
const allSols = await get(`/solutions?solution_name=in.(${solutionDefs.map(s => `"${s.solution_name}"`).join(",")})&select=id,solution_name`);
const solId = new Map<string, number>();
for (const r of allSols) solId.set(String(r.solution_name), Number(r.id));
console.log(`  ${missingSols.length} inserted (${existingSols.length} pre-existing). Map size=${solId.size}`);

// =========================================================================
// 5. solution_domains
// =========================================================================
console.log("\n[5/7] solution_domains");

const sdRows = solutionDefs.map(s => ({
  solution_id: solId.get(s.solution_name)!,
  domain_id: PIM_ID,
  coverage_level: "primary",
}));
// secondary coverage for vendors that also cover MDM
const MDM_ID = 87;
const secondaryMdm = ["Stibo Systems STEP", "Informatica Product 360", "Syndigo CXH", "SAP Master Data Governance for Product", "Pimcore Platform"];
for (const name of secondaryMdm) {
  sdRows.push({ solution_id: solId.get(name)!, domain_id: MDM_ID, coverage_level: "secondary" });
}

const existingSd = await get(`/solution_domains?solution_id=in.(${[...solId.values()].join(",")})&select=solution_id,domain_id`);
const sdKey = (r: Row) => `${r.solution_id}|${r.domain_id}`;
const existingSdKeys = new Set(existingSd.map(sdKey));
const missingSd = sdRows.filter(r => !existingSdKeys.has(sdKey(r)));
if (missingSd.length > 0) await insert("/solution_domains", missingSd);
console.log(`  ${missingSd.length} inserted (${existingSd.length} pre-existing)`);

// =========================================================================
// 6. Modules (Phase M)
// =========================================================================
console.log("\n[6/7] modules");

const moduleDefs = [
  {
    domain_module_code: "PIM-PRODUCT-CONTENT",
    domain_module_name: "Product Content and Attributes",
    description: "Core merchandising master: products, attributes, variants, categories, translations, supplier onboarding, compliance attributes, and the review-and-approve workflow before publish. The deploy entry-point for any PIM rollout.",
  },
  {
    domain_module_code: "PIM-DIGITAL-ASSETS",
    domain_module_name: "Digital Assets for Products",
    description: "Image, video, 3D model, and document assets tied to products: ingestion, rights metadata, renditions, CDN distribution, and asset-to-product linking. Lives inside PIM in v1; can be split into its own DAM domain when warranted.",
  },
  {
    domain_module_code: "PIM-SYNDICATION",
    domain_module_name: "Channel Syndication",
    description: "Per-channel feed shaping and publish orchestration: Amazon Seller, Google Merchant, Shopify, retailer feeds, GDSN datapools. Validation against destination schemas; syndication-job state machine; rejected-listing remediation queue.",
  },
].map(m => ({ ...m, domain_id: PIM_ID }));

const existingModules = await get(`/domain_modules?domain_id=eq.${PIM_ID}&select=id,domain_module_code`);
const existingModuleCodes = new Set(existingModules.map(r => String(r.domain_module_code)));
const missingModules = moduleDefs.filter(m => !existingModuleCodes.has(m.domain_module_code));
if (missingModules.length > 0) await insert("/domain_modules", missingModules);
const allModules = await get(`/domain_modules?domain_id=eq.${PIM_ID}&select=id,domain_module_code`);
const moduleId = new Map<string, number>();
for (const m of allModules) moduleId.set(String(m.domain_module_code), Number(m.id));
console.log(`  ${missingModules.length} inserted (${existingModules.length} pre-existing). Modules: ${[...moduleId.entries()].map(([c, i]) => `${c}=${i}`).join(", ")}`);

const M_CONTENT = moduleId.get("PIM-PRODUCT-CONTENT")!;
const M_ASSETS  = moduleId.get("PIM-DIGITAL-ASSETS")!;
const M_SYND    = moduleId.get("PIM-SYNDICATION")!;

// =========================================================================
// 7. DMC + starter
// =========================================================================
console.log("\n[7/7] DMC + starter");

const dmcRows = [
  { domain_module_id: M_CONTENT, capability_id: capId.get("PIM-PRODUCT-ENRICHMENT")! },
  { domain_module_id: M_CONTENT, capability_id: capId.get("PIM-TAXONOMY-MGMT")! },
  { domain_module_id: M_CONTENT, capability_id: capId.get("PIM-LOCALIZATION")! },
  { domain_module_id: M_CONTENT, capability_id: capId.get("PIM-SUPPLIER-ONBOARDING")! },
  { domain_module_id: M_CONTENT, capability_id: capId.get("PIM-PRODUCT-COMPLIANCE")! },
  { domain_module_id: M_CONTENT, capability_id: capId.get("PIM-WORKFLOW-APPROVAL")! },
  { domain_module_id: M_ASSETS,  capability_id: capId.get("PIM-DIGITAL-ASSET-MGMT")! },
  { domain_module_id: M_SYND,    capability_id: capId.get("PIM-CHANNEL-SYNDICATION")! },
];

const existingDmc = await get(`/domain_module_capabilities?domain_module_id=in.(${M_CONTENT},${M_ASSETS},${M_SYND})&select=domain_module_id,capability_id`);
const dmcKey = (r: Row) => `${r.domain_module_id}|${r.capability_id}`;
const existingDmcKeys = new Set(existingDmc.map(dmcKey));
const missingDmc = dmcRows.filter(r => !existingDmcKeys.has(dmcKey(r)));
if (missingDmc.length > 0) await insert("/domain_module_capabilities", missingDmc);
console.log(`  DMC: ${missingDmc.length} inserted (${existingDmc.length} pre-existing)`);

const starterRows = [
  { domain_id: PIM_ID, domain_module_id: M_CONTENT, position: 1, notes: "Start here. Product content is the heart of any PIM rollout: attributes, descriptions, variants, taxonomies, translations, and the review-and-approve workflow. Everything else attaches to this." },
  { domain_id: PIM_ID, domain_module_id: M_SYND,    position: 2, notes: "Add syndication once content is reliably curated. Channel feed-shaping, validation against destination schemas, and rejected-listing remediation. Often the second module deployed because it is where ROI shows up." },
  { domain_id: PIM_ID, domain_module_id: M_ASSETS,  position: 3, notes: "Add digital assets when image / video volume warrants a managed CDN and rendition pipeline. Many orgs run a separate DAM and link from PIM rather than installing this module." },
];
const existingStarter = await get(`/domain_starter_modules?domain_id=eq.${PIM_ID}&select=domain_module_id`);
const existingStarterIds = new Set(existingStarter.map(r => Number(r.domain_module_id)));
const missingStarter = starterRows.filter(r => !existingStarterIds.has(r.domain_module_id));
if (missingStarter.length > 0) await insert("/domain_starter_modules", missingStarter);
console.log(`  starter: ${missingStarter.length} inserted (${existingStarter.length} pre-existing)`);

console.log("\nPhase A + M complete.");
console.log(`PIM_ID=${PIM_ID}  M_CONTENT=${M_CONTENT}  M_ASSETS=${M_ASSETS}  M_SYND=${M_SYND}`);
console.log("UI: https://tests.semantius.app/domain_map/domains");
