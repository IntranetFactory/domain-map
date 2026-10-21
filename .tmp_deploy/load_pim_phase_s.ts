#!/usr/bin/env bun
// PIM Phase S: 3 system skills (one per module) + new tools + skill_tools.
// Tools that already exist (query_suppliers, generate_text, translate_text, classify_text,
// notify_person, send_email) are reused; tools that don't exist are inserted.
//
// Idempotent.

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const tmpPath = `c:\\tmp\\sem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.json`;
  await Bun.write(tmpPath, JSON.stringify(body));
  const proc = Bun.spawn(["bash", "-c", `semantius call crud postgrestRequest < "${tmpPath.replace(/\\/g, "/")}"`], {
    stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(), new Response(proc.stderr).text(),
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

const PIM_ID = 167;
const M_CONTENT = 141;
const M_ASSETS = 142;
const M_SYND = 143;
const DO_PIM_PRODUCTS = 811;
const DO_PIM_ATTRIBUTES = 812;
const DO_PIM_VARIANTS = 813;
const DO_PIM_CATEGORIES = 814;
const DO_PIM_TRANS = 815;
const DO_PIM_ASSETS = 816;
const DO_PIM_CHANNELS = 817;
const DO_PIM_JOBS = 818;
const DO_SUPPLIERS = 206;
const DO_ENGINEERING_PARTS = 796;
const DO_PRODUCT_COMPLIANCE = 805;

// =========================================================================
// 1. Tools (new + reuse existing)
// =========================================================================
console.log("[1/3] tools");

const newTools: Array<{ tool_name: string; description: string; operation_kind: string; coverage_tier: string; data_object_id: number | null }> = [
  // PIM master CRUD (platform query/mutate)
  { tool_name: "query_pim_products",      description: "Read PIM-mastered products with attribute, variant, translation, and category joins.",        operation_kind: "query",       coverage_tier: "platform", data_object_id: DO_PIM_PRODUCTS },
  { tool_name: "create_pim_product",      description: "Create a new PIM product in draft state with seed attributes.",                                 operation_kind: "mutate",      coverage_tier: "platform", data_object_id: DO_PIM_PRODUCTS },
  { tool_name: "update_pim_product",      description: "Patch attributes, descriptions, variants, or category memberships on a PIM product.",            operation_kind: "mutate",      coverage_tier: "platform", data_object_id: DO_PIM_PRODUCTS },
  { tool_name: "submit_pim_product_for_review", description: "Workflow gate: transition pim_products from in_enrichment to pending_review (submit-lock kicks in).", operation_kind: "mutate", coverage_tier: "platform", data_object_id: DO_PIM_PRODUCTS },
  { tool_name: "approve_pim_product",     description: "Workflow gate: merchandiser approves pim_products for publish.",                                operation_kind: "mutate",      coverage_tier: "platform", data_object_id: DO_PIM_PRODUCTS },
  { tool_name: "publish_pim_product",     description: "Workflow gate: queue a syndication job to publish pim_products to configured channels.",         operation_kind: "mutate",      coverage_tier: "platform", data_object_id: DO_PIM_PRODUCTS },
  { tool_name: "discontinue_pim_product", description: "Workflow gate: mark pim_products as discontinued, pull from active feeds.",                      operation_kind: "mutate",      coverage_tier: "platform", data_object_id: DO_PIM_PRODUCTS },
  { tool_name: "query_pim_attributes",    description: "Read PIM attribute definitions (type, validation, attribute group, locale-awareness).",          operation_kind: "query",       coverage_tier: "platform", data_object_id: DO_PIM_ATTRIBUTES },
  { tool_name: "update_pim_attribute",    description: "Patch a PIM attribute definition (type, validation rules, locale-awareness).",                   operation_kind: "mutate",      coverage_tier: "platform", data_object_id: DO_PIM_ATTRIBUTES },
  { tool_name: "query_pim_variants",      description: "Read PIM SKU variants under a parent product.",                                                  operation_kind: "query",       coverage_tier: "platform", data_object_id: DO_PIM_VARIANTS },
  { tool_name: "create_pim_variant",      description: "Create a new variant under a parent pim_products row.",                                          operation_kind: "mutate",      coverage_tier: "platform", data_object_id: DO_PIM_VARIANTS },
  { tool_name: "query_pim_categories",    description: "Read PIM taxonomy nodes across merchandising, channel, and ERP trees.",                          operation_kind: "query",       coverage_tier: "platform", data_object_id: DO_PIM_CATEGORIES },
  { tool_name: "query_pim_translations",  description: "Read locale-keyed translation rows for PIM products and attributes.",                            operation_kind: "query",       coverage_tier: "platform", data_object_id: DO_PIM_TRANS },
  { tool_name: "create_pim_translation",  description: "Create a translation row (often pre-filled by translate_text).",                                 operation_kind: "mutate",      coverage_tier: "platform", data_object_id: DO_PIM_TRANS },
  { tool_name: "approve_pim_translation", description: "Workflow gate: editor approves a translation for publishing.",                                   operation_kind: "mutate",      coverage_tier: "platform", data_object_id: DO_PIM_TRANS },

  // PIM-DIGITAL-ASSETS
  { tool_name: "query_pim_digital_assets",   description: "Read PIM-managed images, videos, and document assets with rights and rendition metadata.",   operation_kind: "query",       coverage_tier: "platform", data_object_id: DO_PIM_ASSETS },
  { tool_name: "create_pim_digital_asset",   description: "Register a new digital asset (image, video, 3D model, document) with rights metadata.",      operation_kind: "mutate",      coverage_tier: "platform", data_object_id: DO_PIM_ASSETS },
  { tool_name: "update_pim_digital_asset",   description: "Patch asset metadata, link to additional products, update rights / renditions.",              operation_kind: "mutate",      coverage_tier: "platform", data_object_id: DO_PIM_ASSETS },
  { tool_name: "approve_pim_digital_asset",  description: "Workflow gate: rights / brand reviewer approves an asset for product feeds.",                operation_kind: "mutate",      coverage_tier: "platform", data_object_id: DO_PIM_ASSETS },
  { tool_name: "publish_pim_digital_asset",  description: "Workflow gate: publish an approved asset to CDN distribution.",                              operation_kind: "mutate",      coverage_tier: "platform", data_object_id: DO_PIM_ASSETS },

  // PIM-SYNDICATION (platform side)
  { tool_name: "query_pim_syndication_channels", description: "Read configured syndication channels and their per-channel mapping rules.",              operation_kind: "query",       coverage_tier: "platform", data_object_id: DO_PIM_CHANNELS },
  { tool_name: "query_pim_syndication_jobs",     description: "Read syndication-job status, validation results, and rejection reasons.",                operation_kind: "query",       coverage_tier: "platform", data_object_id: DO_PIM_JOBS },
  { tool_name: "create_pim_syndication_job",     description: "Queue a syndication job that publishes a batch of products to a channel.",               operation_kind: "mutate",      coverage_tier: "platform", data_object_id: DO_PIM_JOBS },
  { tool_name: "update_pim_syndication_job",     description: "Patch syndication-job state (typically re-queue after a failure or admin intervention).", operation_kind: "mutate",     coverage_tier: "platform", data_object_id: DO_PIM_JOBS },

  // Cross-domain query tools (platform — Semantius reads other modules' masters via the same DB)
  { tool_name: "query_engineering_parts",                description: "Read PLM engineering parts (revisions, materials, dimensions) referenced from PIM merchandising records.", operation_kind: "query", coverage_tier: "platform", data_object_id: DO_ENGINEERING_PARTS },
  { tool_name: "query_product_compliance_declarations",  description: "Read PLM-mastered compliance declarations (REACH, RoHS, Prop 65, FDA) feeding PIM attributes.",            operation_kind: "query", coverage_tier: "platform", data_object_id: DO_PRODUCT_COMPLIANCE },

  // External channel-syndication (the score-killers)
  { tool_name: "syndicate_to_amazon",          description: "Push product listings to Amazon Seller Central / Amazon Marketplace via the SP-API.",        operation_kind: "side_effect", coverage_tier: "external", data_object_id: null },
  { tool_name: "syndicate_to_google_merchant", description: "Push product listings to Google Merchant Center feed.",                                     operation_kind: "side_effect", coverage_tier: "external", data_object_id: null },
  { tool_name: "syndicate_to_shopify",         description: "Push product listings and updates to Shopify's product API.",                               operation_kind: "side_effect", coverage_tier: "external", data_object_id: null },
  { tool_name: "syndicate_to_retailer_feed",   description: "Push product feeds to a retailer-specific endpoint (Walmart, Target, Carrefour, Kroger, etc).", operation_kind: "side_effect", coverage_tier: "external", data_object_id: null },
  { tool_name: "validate_against_gdsn",        description: "Validate product records against GS1 GDSN datapool schemas for B2B retail / consumer goods sync.", operation_kind: "compute",   coverage_tier: "external", data_object_id: null },

  // External enrichment helpers
  { tool_name: "classify_image",          description: "Classify a product image for content type, brand-safety, or attribute extraction.", operation_kind: "compute", coverage_tier: "external", data_object_id: null },
  { tool_name: "extract_text_from_image", description: "OCR a supplier spec sheet or product image to extract attribute values.",            operation_kind: "compute", coverage_tier: "external", data_object_id: null },
];

const existingNamed = await get(`/tools?tool_name=in.(${newTools.map(t => t.tool_name).join(",")})&select=id,tool_name`);
const existingToolNames = new Set(existingNamed.map(r => String(r.tool_name)));
const missingTools = newTools.filter(t => !existingToolNames.has(t.tool_name));
if (missingTools.length > 0) await insert("/tools", missingTools);

// Build id map for ALL tools the skills will link to (new + already-existing)
const allToolNames = [
  ...newTools.map(t => t.tool_name),
  "query_suppliers", "generate_text", "translate_text", "classify_text", "notify_person", "send_email",
];
const toolLookup = await get(`/tools?tool_name=in.(${allToolNames.join(",")})&select=id,tool_name`);
const toolId = new Map<string, number>();
for (const r of toolLookup) toolId.set(String(r.tool_name), Number(r.id));
console.log(`  ${missingTools.length} new tools inserted (${existingNamed.length} pre-existing in script set). Total tool map size=${toolId.size}`);

// =========================================================================
// 2. skills (one per module, skill_type='system')
// =========================================================================
console.log("\n[2/3] skills");

const skillDefs = [
  {
    domain_module_id: M_CONTENT, skill_name: "pim_product_content_agent", skill_type: "system", domain_id: PIM_ID,
    description: "Agent capable of authoring, enriching, classifying, and gating PIM product content. Reads engineering parts and compliance declarations from PLM; reads supplier data from S2P. Drives the draft -> review -> approve workflow on pim_products and the translation lifecycle on pim_translations.",
  },
  {
    domain_module_id: M_ASSETS, skill_name: "pim_digital_assets_agent", skill_type: "system", domain_id: PIM_ID,
    description: "Agent for managing digital assets attached to PIM products: upload, classify, approve, and publish. Handles rights review queue, brand-compliance checks, and CDN-distribution orchestration.",
  },
  {
    domain_module_id: M_SYND, skill_name: "pim_syndication_agent", skill_type: "system", domain_id: PIM_ID,
    description: "Agent for publishing PIM products to syndication channels (Amazon, Google Merchant, Shopify, retailer feeds, GDSN datapools). Owns the syndication-job state machine, validates against destination schemas, and surfaces rejected-listing remediation work.",
  },
];

const existingSkills = await get(`/skills?domain_module_id=in.(${M_CONTENT},${M_ASSETS},${M_SYND})&skill_type=eq.system&select=id,skill_name,domain_module_id`);
const existingSkillNames = new Set(existingSkills.map(r => String(r.skill_name)));
const missingSkills = skillDefs.filter(s => !existingSkillNames.has(s.skill_name));
if (missingSkills.length > 0) await insert("/skills", missingSkills);
const allSkills = await get(`/skills?domain_module_id=in.(${M_CONTENT},${M_ASSETS},${M_SYND})&skill_type=eq.system&select=id,skill_name,domain_module_id`);
const skillId = new Map<string, number>();
for (const r of allSkills) skillId.set(String(r.skill_name), Number(r.id));
console.log(`  ${missingSkills.length} inserted (${existingSkills.length} pre-existing). Skills: ${[...skillId.entries()].map(([n, i]) => `${n}=${i}`).join(", ")}`);

const SKILL_CONTENT = skillId.get("pim_product_content_agent")!;
const SKILL_ASSETS  = skillId.get("pim_digital_assets_agent")!;
const SKILL_SYND    = skillId.get("pim_syndication_agent")!;

// =========================================================================
// 3. skill_tools
// =========================================================================
console.log("\n[3/3] skill_tools");

const skillToolRows: Array<{ skill_id: number; tool_name: string; requirement_level: string; notes: string }> = [
  // PIM-PRODUCT-CONTENT (16 tools)
  { skill_id: SKILL_CONTENT, tool_name: "query_pim_products",      requirement_level: "required", notes: "Core read." },
  { skill_id: SKILL_CONTENT, tool_name: "create_pim_product",      requirement_level: "required", notes: "Author new products." },
  { skill_id: SKILL_CONTENT, tool_name: "update_pim_product",      requirement_level: "required", notes: "Edit attributes, descriptions, category memberships." },
  { skill_id: SKILL_CONTENT, tool_name: "submit_pim_product_for_review", requirement_level: "required", notes: "Workflow gate: in_enrichment -> pending_review." },
  { skill_id: SKILL_CONTENT, tool_name: "approve_pim_product",     requirement_level: "required", notes: "Workflow gate: pending_review -> approved." },
  { skill_id: SKILL_CONTENT, tool_name: "discontinue_pim_product", requirement_level: "required", notes: "Workflow gate: published -> discontinued." },
  { skill_id: SKILL_CONTENT, tool_name: "query_pim_attributes",    requirement_level: "required", notes: "Read attribute definitions for validation and UI rendering." },
  { skill_id: SKILL_CONTENT, tool_name: "update_pim_attribute",    requirement_level: "required", notes: "Edit attribute definitions; rare but core for schema evolution." },
  { skill_id: SKILL_CONTENT, tool_name: "query_pim_variants",      requirement_level: "required", notes: "Read variants under each product." },
  { skill_id: SKILL_CONTENT, tool_name: "create_pim_variant",      requirement_level: "required", notes: "Create variants of a parent product." },
  { skill_id: SKILL_CONTENT, tool_name: "query_pim_categories",    requirement_level: "required", notes: "Read taxonomy for classification." },
  { skill_id: SKILL_CONTENT, tool_name: "query_pim_translations",  requirement_level: "required", notes: "Read locale variants." },
  { skill_id: SKILL_CONTENT, tool_name: "create_pim_translation",  requirement_level: "required", notes: "Create translation rows (typically pre-filled by translate_text)." },
  { skill_id: SKILL_CONTENT, tool_name: "approve_pim_translation", requirement_level: "required", notes: "Workflow gate for translation review." },
  { skill_id: SKILL_CONTENT, tool_name: "query_suppliers",         requirement_level: "required", notes: "Read supplier data driving supplier-onboarding ingestion." },
  { skill_id: SKILL_CONTENT, tool_name: "query_engineering_parts", requirement_level: "required", notes: "Read PLM-mastered engineering parts for merchandising-shell creation." },
  { skill_id: SKILL_CONTENT, tool_name: "query_product_compliance_declarations", requirement_level: "required", notes: "Read PLM-mastered compliance declarations driving regulatory attributes on PIM products." },
  { skill_id: SKILL_CONTENT, tool_name: "generate_text",           requirement_level: "required", notes: "AI-generated marketing copy and descriptions. Table-stakes in modern PIM (Akeneo Catalyst, Salsify GenAI)." },
  { skill_id: SKILL_CONTENT, tool_name: "translate_text",          requirement_level: "required", notes: "Machine translation for multi-locale content workflows." },
  { skill_id: SKILL_CONTENT, tool_name: "notify_person",           requirement_level: "required", notes: "Notify reviewers / merchandisers on submit-for-review and on rejection. Abstraction routes to whichever channel is wired up." },
  { skill_id: SKILL_CONTENT, tool_name: "classify_text",           requirement_level: "optional", notes: "Auto-classify products into taxonomies based on description." },

  // PIM-DIGITAL-ASSETS (8 tools)
  { skill_id: SKILL_ASSETS, tool_name: "query_pim_digital_assets",   requirement_level: "required", notes: "Core read." },
  { skill_id: SKILL_ASSETS, tool_name: "create_pim_digital_asset",   requirement_level: "required", notes: "Register newly-uploaded assets." },
  { skill_id: SKILL_ASSETS, tool_name: "update_pim_digital_asset",   requirement_level: "required", notes: "Patch asset metadata and product linkages." },
  { skill_id: SKILL_ASSETS, tool_name: "approve_pim_digital_asset",  requirement_level: "required", notes: "Rights / brand approval gate." },
  { skill_id: SKILL_ASSETS, tool_name: "publish_pim_digital_asset",  requirement_level: "required", notes: "Publish-to-CDN gate." },
  { skill_id: SKILL_ASSETS, tool_name: "query_pim_products",         requirement_level: "required", notes: "Read product context for the asset (which product it depicts)." },
  { skill_id: SKILL_ASSETS, tool_name: "notify_person",              requirement_level: "required", notes: "Notify rights reviewers and product owners on upload / approval." },
  { skill_id: SKILL_ASSETS, tool_name: "classify_image",             requirement_level: "optional", notes: "Auto-tag images for brand-safety and asset-type discrimination." },
  { skill_id: SKILL_ASSETS, tool_name: "extract_text_from_image",    requirement_level: "optional", notes: "OCR supplier spec sheets and product image overlays." },

  // PIM-SYNDICATION (10 tools)
  { skill_id: SKILL_SYND, tool_name: "query_pim_syndication_jobs",     requirement_level: "required", notes: "Read job status, validation results, rejections." },
  { skill_id: SKILL_SYND, tool_name: "create_pim_syndication_job",     requirement_level: "required", notes: "Queue a publish run." },
  { skill_id: SKILL_SYND, tool_name: "update_pim_syndication_job",     requirement_level: "required", notes: "Re-queue or transition job state." },
  { skill_id: SKILL_SYND, tool_name: "query_pim_syndication_channels", requirement_level: "required", notes: "Read channel-specific mapping rules and credentials." },
  { skill_id: SKILL_SYND, tool_name: "query_pim_products",             requirement_level: "required", notes: "Read product content to shape the outbound feed." },
  { skill_id: SKILL_SYND, tool_name: "query_pim_translations",         requirement_level: "required", notes: "Read locale variants for the feed locale." },
  { skill_id: SKILL_SYND, tool_name: "syndicate_to_amazon",            requirement_level: "required", notes: "Publish to Amazon Seller Central via SP-API. Voice IS the channel; not substitutable." },
  { skill_id: SKILL_SYND, tool_name: "syndicate_to_google_merchant",   requirement_level: "required", notes: "Publish to Google Merchant Center. Channel-specific feed format." },
  { skill_id: SKILL_SYND, tool_name: "syndicate_to_shopify",           requirement_level: "required", notes: "Publish to Shopify storefronts. Channel-specific contract." },
  { skill_id: SKILL_SYND, tool_name: "validate_against_gdsn",          requirement_level: "required", notes: "GS1 GDSN datapool validation for B2B retail / consumer-goods sync. Trading-partner contract requires it." },
  { skill_id: SKILL_SYND, tool_name: "notify_person",                  requirement_level: "required", notes: "Notify on job failure or partial-success rejections requiring remediation." },
  { skill_id: SKILL_SYND, tool_name: "syndicate_to_retailer_feed",     requirement_level: "optional", notes: "Push to per-retailer feeds (Walmart, Target, Carrefour, etc) when configured." },
];

const skillToolPayload = skillToolRows.map(r => ({
  skill_id: r.skill_id,
  tool_id: toolId.get(r.tool_name) ?? (() => { throw new Error(`Missing tool id for ${r.tool_name}`); })(),
  requirement_level: r.requirement_level,
  notes: r.notes,
}));

const existingSt = await get(`/skill_tools?skill_id=in.(${SKILL_CONTENT},${SKILL_ASSETS},${SKILL_SYND})&select=skill_id,tool_id`);
const stKey = (r: Row) => `${r.skill_id}|${r.tool_id}`;
const existingStKeys = new Set(existingSt.map(stKey));
const missingSt = skillToolPayload.filter(r => !existingStKeys.has(stKey(r)));
if (missingSt.length > 0) await insert("/skill_tools", missingSt);
console.log(`  ${missingSt.length} inserted (${existingSt.length} pre-existing). Total intended=${skillToolPayload.length}`);

// =========================================================================
// Verification + Semantius score
// =========================================================================
console.log("\nVerification");
const allSt = await get(`/skill_tools?skill_id=in.(${SKILL_CONTENT},${SKILL_ASSETS},${SKILL_SYND})&select=skill_id,requirement_level,tool:tools(tool_name,coverage_tier)`);
const perSkill = new Map<number, { total: number; platform: number; ops: number; required: number }>();
for (const sid of [SKILL_CONTENT, SKILL_ASSETS, SKILL_SYND]) perSkill.set(sid, { total: 0, platform: 0, ops: 0, required: 0 });
for (const r of allSt) {
  const s = perSkill.get(Number(r.skill_id))!;
  s.total++;
  const tier = (r.tool as Row).coverage_tier;
  if (tier === "platform") { s.platform++; s.ops++; }
  if (tier === "integration") s.ops++;
  if (r.requirement_level === "required") s.required++;
}
console.log(`  CONTENT (${SKILL_CONTENT}): total=${perSkill.get(SKILL_CONTENT)!.total} required=${perSkill.get(SKILL_CONTENT)!.required} strict=${(perSkill.get(SKILL_CONTENT)!.platform / perSkill.get(SKILL_CONTENT)!.total * 100).toFixed(0)}% operational=${(perSkill.get(SKILL_CONTENT)!.ops / perSkill.get(SKILL_CONTENT)!.total * 100).toFixed(0)}%`);
console.log(`  ASSETS  (${SKILL_ASSETS}):  total=${perSkill.get(SKILL_ASSETS)!.total} required=${perSkill.get(SKILL_ASSETS)!.required} strict=${(perSkill.get(SKILL_ASSETS)!.platform / perSkill.get(SKILL_ASSETS)!.total * 100).toFixed(0)}% operational=${(perSkill.get(SKILL_ASSETS)!.ops / perSkill.get(SKILL_ASSETS)!.total * 100).toFixed(0)}%`);
console.log(`  SYND    (${SKILL_SYND}):    total=${perSkill.get(SKILL_SYND)!.total} required=${perSkill.get(SKILL_SYND)!.required} strict=${(perSkill.get(SKILL_SYND)!.platform / perSkill.get(SKILL_SYND)!.total * 100).toFixed(0)}% operational=${(perSkill.get(SKILL_SYND)!.ops / perSkill.get(SKILL_SYND)!.total * 100).toFixed(0)}%`);

// Per-domain rollup: union numerators / denominators
const totals = { total: 0, platform: 0, ops: 0 };
for (const s of perSkill.values()) { totals.total += s.total; totals.platform += s.platform; totals.ops += s.ops; }
console.log(`  PIM domain rollup: strict=${(totals.platform / totals.total * 100).toFixed(1)}% operational=${(totals.ops / totals.total * 100).toFixed(1)}% (${totals.platform}/${totals.ops}/${totals.total})`);

console.log("\nPhase S complete.");
console.log("UI: https://tests.semantius.app/domain_map/skills");
