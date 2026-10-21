#!/usr/bin/env bun
// PIM Phase B: data_objects, DMDO, derived domain_data_objects, aliases,
// lifecycle_states, trigger_events, intra/cross-domain relationships, handoffs.
//
// Idempotent: re-reads natural keys, safe to re-run.

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

// =========================================================================
// Constants from Phase A+M
// =========================================================================
const PIM_ID    = 167;
const M_CONTENT = 141;
const M_ASSETS  = 142;
const M_SYND    = 143;

const PLM_ID            = 165;
const PLM_ENG_CORE      = 66;
const PLM_COMPLIANCE_M  = 69;
const B2C_COMM_ID       = 71;
const INV_MGMT_ID       = 164;
const INV_CORE_STOCK    = 61;
const CPQ_ID            = 73;

const DO_USERS                = 748;
const DO_SUPPLIERS            = 206;
const DO_ENGINEERING_PARTS    = 796;
const DO_PRODUCT_COMPLIANCE   = 805;
const DO_COMMERCE_PRODUCTS    = 384;
const DO_INV_STOCK_ITEMS      = 785;
const DO_PRODUCT_CONFIGS      = 418;

const TE_ECO_RELEASED         = 1210;
const TE_ENG_PART_RELEASED    = 1211;
const TE_COMPLIANCE_APPROVED  = 1214;

// =========================================================================
// 1. data_objects (8 PIM masters)
// =========================================================================
console.log("[1/8] data_objects");

const doDefs = [
  {
    data_object_name: "pim_products", singular_label: "PIM Product", plural_label: "PIM Products",
    description: "The merchandising-master record for a sellable SKU as PIM models it: a hub of attributes, descriptions, variants, categorizations, translations, digital assets, and channel-specific overrides. Distinct from B2C-COMM commerce_products (storefront runtime view) and PLM engineering_parts (engineering record). Authoritative for marketing / catalog content; consumed by commerce, inventory, CPQ, and marketplaces.",
    has_personal_content: false, has_submit_lock: true, has_single_approver: false,
    notes: "Workflow-bearing master. Submit-lock applies once submitted for review until approved or rejected.",
  },
  {
    data_object_name: "pim_attributes", singular_label: "PIM Attribute", plural_label: "PIM Attributes",
    description: "Definition of a single attribute available to PIM products: data type, validation rules, attribute group, locale-awareness, and channel-specific overrides. Distinct from runtime attribute values on a product instance.",
    has_personal_content: false, has_submit_lock: false, has_single_approver: false,
    notes: "Config-shaped master. Authored by merchandising admin; record_status is the only workflow signal. Edits flow through the standard CRUD lifecycle without per-state permissions.",
  },
  {
    data_object_name: "pim_variants", singular_label: "PIM Variant", plural_label: "PIM Variants",
    description: "Specific size / color / locale / pack-size variant of a parent PIM product. Each variant has its own SKU, can have its own publish state, and inherits attribute defaults from the parent.",
    has_personal_content: false, has_submit_lock: true, has_single_approver: false,
    notes: "Lifecycle inherits from parent pim_products in most vendors, but variant-level publish state is supported.",
  },
  {
    data_object_name: "pim_categories", singular_label: "PIM Category", plural_label: "PIM Categories",
    description: "Hierarchical taxonomy node used to classify PIM products. Multiple parallel taxonomies coexist (merchandising tree, channel-specific trees, ERP category tree); each one's tree lives in this table with a parent_category_id self-reference.",
    has_personal_content: false, has_submit_lock: false, has_single_approver: false,
    notes: "Config-shaped master. Taxonomy edits flow through record_status; no per-state workflow needed.",
  },
  {
    data_object_name: "pim_translations", singular_label: "PIM Translation", plural_label: "PIM Translations",
    description: "Locale-keyed string variant of an attribute or description on a PIM product or attribute. Drives multi-language publishing; can be machine-generated, human-translated, or a hybrid pipeline.",
    has_personal_content: false, has_submit_lock: true, has_single_approver: false,
    notes: "Lightweight workflow: pending -> in_translation -> review -> approved. Translation memory and machine-translation suggestions feed in_translation.",
  },
  {
    data_object_name: "pim_digital_assets", singular_label: "PIM Digital Asset", plural_label: "PIM Digital Assets",
    description: "Image, video, 3D model, or document asset tied to one or more PIM products. Carries rights metadata, renditions / derivatives, and CDN-delivery URLs. The DAM slice that lives inside PIM in v1; can be split out to a DAM domain when warranted.",
    has_personal_content: false, has_submit_lock: true, has_single_approver: false,
    notes: "Workflow: uploaded -> pending_approval -> approved -> published -> retired. Approval is one-or-many depending on rights review.",
  },
  {
    data_object_name: "pim_syndication_channels", singular_label: "PIM Syndication Channel", plural_label: "PIM Syndication Channels",
    description: "Definition of an outbound publishing channel: Amazon Seller, Google Merchant, Shopify, retailer feeds, GDSN datapools, or a custom partner endpoint. Holds destination-schema mapping rules, credentials, and per-channel attribute overrides.",
    has_personal_content: false, has_submit_lock: false, has_single_approver: false,
    notes: "Config-shaped master. Channel configuration; provisioned at deployment, edited rarely.",
  },
  {
    data_object_name: "pim_syndication_jobs", singular_label: "PIM Syndication Job", plural_label: "PIM Syndication Jobs",
    description: "A single publish run of a product (or batch) to a syndication channel. Carries queue position, run status, per-record validation results, and rejection reasons from the destination.",
    has_personal_content: false, has_submit_lock: false, has_single_approver: false,
    notes: "System-driven workflow: queued -> running -> partial_success / succeeded / failed. No human approval gates; admins re-queue from failed.",
  },
];

const existingDo = await get(`/data_objects?data_object_name=in.(${doDefs.map(d => d.data_object_name).join(",")})&select=id,data_object_name`);
const existingDoNames = new Set(existingDo.map(r => String(r.data_object_name)));
const missingDo = doDefs.filter(d => !existingDoNames.has(d.data_object_name));
if (missingDo.length > 0) await insert("/data_objects", missingDo);
const allDo = await get(`/data_objects?data_object_name=in.(${doDefs.map(d => d.data_object_name).join(",")})&select=id,data_object_name`);
const doId = new Map<string, number>();
for (const r of allDo) doId.set(String(r.data_object_name), Number(r.id));
console.log(`  ${missingDo.length} inserted (${existingDo.length} pre-existing). Map size=${doId.size}`);

const DO_PIM_PRODUCTS   = doId.get("pim_products")!;
const DO_PIM_ATTRIBUTES = doId.get("pim_attributes")!;
const DO_PIM_VARIANTS   = doId.get("pim_variants")!;
const DO_PIM_CATEGORIES = doId.get("pim_categories")!;
const DO_PIM_TRANS      = doId.get("pim_translations")!;
const DO_PIM_ASSETS     = doId.get("pim_digital_assets")!;
const DO_PIM_CHANNELS   = doId.get("pim_syndication_channels")!;
const DO_PIM_JOBS       = doId.get("pim_syndication_jobs")!;

// =========================================================================
// 2. domain_module_data_objects (DMDO) + derived domain_data_objects
// =========================================================================
console.log("\n[2/8] DMDO + derived domain_data_objects");

const dmdoRows = [
  // PIM-PRODUCT-CONTENT (141)
  { domain_module_id: M_CONTENT, data_object_id: DO_PIM_PRODUCTS,   role: "master",      necessity: "required" },
  { domain_module_id: M_CONTENT, data_object_id: DO_PIM_ATTRIBUTES, role: "master",      necessity: "required" },
  { domain_module_id: M_CONTENT, data_object_id: DO_PIM_VARIANTS,   role: "master",      necessity: "required" },
  { domain_module_id: M_CONTENT, data_object_id: DO_PIM_CATEGORIES, role: "master",      necessity: "required" },
  { domain_module_id: M_CONTENT, data_object_id: DO_PIM_TRANS,      role: "master",      necessity: "required" },
  { domain_module_id: M_CONTENT, data_object_id: DO_SUPPLIERS,              role: "contributor", necessity: "optional" },
  { domain_module_id: M_CONTENT, data_object_id: DO_ENGINEERING_PARTS,      role: "consumer",    necessity: "optional" },
  { domain_module_id: M_CONTENT, data_object_id: DO_PRODUCT_COMPLIANCE,     role: "consumer",    necessity: "optional" },
  // PIM-DIGITAL-ASSETS (142)
  { domain_module_id: M_ASSETS, data_object_id: DO_PIM_ASSETS,    role: "master",   necessity: "required" },
  { domain_module_id: M_ASSETS, data_object_id: DO_PIM_PRODUCTS,  role: "consumer", necessity: "required" },
  // PIM-SYNDICATION (143)
  { domain_module_id: M_SYND, data_object_id: DO_PIM_CHANNELS, role: "master",   necessity: "required" },
  { domain_module_id: M_SYND, data_object_id: DO_PIM_JOBS,     role: "master",   necessity: "required" },
  { domain_module_id: M_SYND, data_object_id: DO_PIM_PRODUCTS, role: "consumer", necessity: "required" },
  { domain_module_id: M_SYND, data_object_id: DO_PIM_TRANS,    role: "consumer", necessity: "required" },
  { domain_module_id: M_SYND, data_object_id: DO_PIM_ASSETS,   role: "consumer", necessity: "optional" },
];

const existingDmdo = await get(`/domain_module_data_objects?domain_module_id=in.(${M_CONTENT},${M_ASSETS},${M_SYND})&select=domain_module_id,data_object_id`);
const dmdoKey = (r: Row) => `${r.domain_module_id}|${r.data_object_id}`;
const existingDmdoKeys = new Set(existingDmdo.map(dmdoKey));
const missingDmdo = dmdoRows.filter(r => !existingDmdoKeys.has(dmdoKey(r)));
if (missingDmdo.length > 0) await insert("/domain_module_data_objects", missingDmdo);
console.log(`  DMDO: ${missingDmdo.length} inserted (${existingDmdo.length} pre-existing)`);

// derived domain_data_objects (one row per data_object, strongest role wins)
// Strongest-role precedence: master > embedded_master > contributor > consumer > derived
const rolePrio: Record<string, number> = { master: 5, embedded_master: 4, contributor: 3, consumer: 2, derived: 1 };
const ddoByDataObject = new Map<number, { role: string; necessity: string }>();
for (const r of dmdoRows) {
  const cur = ddoByDataObject.get(r.data_object_id);
  if (!cur || rolePrio[r.role] > rolePrio[cur.role]) {
    ddoByDataObject.set(r.data_object_id, { role: r.role, necessity: r.necessity });
  }
}
const ddoRows = [...ddoByDataObject.entries()].map(([data_object_id, { role, necessity }]) => ({
  domain_id: PIM_ID, data_object_id, role, necessity,
}));

const existingDdo = await get(`/domain_data_objects?domain_id=eq.${PIM_ID}&select=data_object_id`);
const existingDdoIds = new Set(existingDdo.map(r => Number(r.data_object_id)));
const missingDdo = ddoRows.filter(r => !existingDdoIds.has(r.data_object_id));
if (missingDdo.length > 0) await insert("/domain_data_objects", missingDdo);
console.log(`  derived domain_data_objects: ${missingDdo.length} inserted (${existingDdo.length} pre-existing)`);

// =========================================================================
// 3. data_object_aliases
// =========================================================================
console.log("\n[3/8] data_object_aliases");

const aliasRows = [
  { data_object_id: DO_PIM_PRODUCTS, alias_name: "Merchandising Product", alias_type: "synonym", notes: "Common internal term for the PIM-owned product record." },
  { data_object_id: DO_PIM_PRODUCTS, alias_name: "Catalog Item",          alias_type: "synonym", notes: "Generic merchandising term used by retail and CPG." },
  { data_object_id: DO_PIM_PRODUCTS, alias_name: "Master SKU",            alias_type: "synonym", notes: "Industry shorthand emphasizing PIM's master-data role for the SKU." },
  { data_object_id: DO_PIM_ATTRIBUTES, alias_name: "Product Attribute",   alias_type: "synonym", notes: "Common merchandising term." },
  { data_object_id: DO_PIM_ATTRIBUTES, alias_name: "Attribute Definition", alias_type: "synonym", notes: "Definition-vs-value distinction relevant to schema-driven PIM tools." },
  { data_object_id: DO_PIM_VARIANTS, alias_name: "SKU Variant",           alias_type: "synonym", notes: "Often referred to as just SKU in flat-catalog vendors." },
  { data_object_id: DO_PIM_CATEGORIES, alias_name: "Product Category",    alias_type: "synonym", notes: "Generic merchandising term." },
  { data_object_id: DO_PIM_CATEGORIES, alias_name: "Taxonomy Node",       alias_type: "synonym", notes: "Inverse phrasing emphasizing tree structure." },
  { data_object_id: DO_PIM_TRANS, alias_name: "Localized Content",        alias_type: "synonym", notes: "Common term when the workflow includes machine translation." },
  { data_object_id: DO_PIM_ASSETS, alias_name: "Product Image",           alias_type: "synonym", notes: "Most common asset type; many smaller PIMs use this label for the whole table." },
  { data_object_id: DO_PIM_ASSETS, alias_name: "Media Asset",             alias_type: "synonym", notes: "Vendor-neutral DAM term." },
  { data_object_id: DO_PIM_CHANNELS, alias_name: "Sales Channel Config",  alias_type: "synonym", notes: "Common term in omni-channel deployments." },
  { data_object_id: DO_PIM_JOBS, alias_name: "Publish Run",               alias_type: "synonym", notes: "Less-formal term for a single syndication execution." },
];

const existingAliases = await get(`/data_object_aliases?data_object_id=in.(${[...doId.values()].join(",")})&select=data_object_id,alias_name`);
const aliasKey = (r: Row) => `${r.data_object_id}|${r.alias_name}`;
const existingAliasKeys = new Set(existingAliases.map(aliasKey));
const missingAliases = aliasRows.filter(r => !existingAliasKeys.has(aliasKey(r)));
if (missingAliases.length > 0) await insert("/data_object_aliases", missingAliases);
console.log(`  ${missingAliases.length} inserted (${existingAliases.length} pre-existing)`);

// =========================================================================
// 4. data_object_lifecycle_states
// =========================================================================
console.log("\n[4/8] lifecycle_states");

const lifecycleRows = [
  // pim_products (workflow-bearing, lives in PIM-PRODUCT-CONTENT)
  { data_object_id: DO_PIM_PRODUCTS, state_name: "draft",          state_order: 10, is_initial: true,  is_terminal: false, requires_permission: false, domain_module_id: M_CONTENT, description: "New PIM product created; attributes being captured. Visible only to authors." },
  { data_object_id: DO_PIM_PRODUCTS, state_name: "in_enrichment",  state_order: 20, is_initial: false, is_terminal: false, requires_permission: false, domain_module_id: M_CONTENT, description: "Content team is filling attribute completeness; AI enrichment may run here. No publish until review passes." },
  { data_object_id: DO_PIM_PRODUCTS, state_name: "pending_review", state_order: 30, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "submit_for_review", domain_module_id: M_CONTENT, description: "Author has submitted for merchandising review; submit-lock holds attribute changes." },
  { data_object_id: DO_PIM_PRODUCTS, state_name: "approved",       state_order: 40, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "approve", domain_module_id: M_CONTENT, description: "Merchandiser has approved the record; ready for publish to channels." },
  { data_object_id: DO_PIM_PRODUCTS, state_name: "published",      state_order: 50, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "publish", domain_module_id: M_SYND,    description: "Published to one or more syndication channels. Storefronts and marketplaces read this state." },
  { data_object_id: DO_PIM_PRODUCTS, state_name: "discontinued",   state_order: 60, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "discontinue", domain_module_id: M_CONTENT, description: "No longer offered; remains visible for historical orders but pulled from active feeds." },
  { data_object_id: DO_PIM_PRODUCTS, state_name: "archived",       state_order: 70, is_initial: false, is_terminal: true,  requires_permission: true, permission_verb_override: "archive", domain_module_id: M_CONTENT, description: "Long-term archive after the retention window for discontinued SKUs." },

  // pim_variants (lightweight, lives in PIM-PRODUCT-CONTENT)
  { data_object_id: DO_PIM_VARIANTS, state_name: "draft",        state_order: 10, is_initial: true,  is_terminal: false, requires_permission: false, domain_module_id: M_CONTENT, description: "Variant created under a parent product; not yet published." },
  { data_object_id: DO_PIM_VARIANTS, state_name: "published",    state_order: 20, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "publish_variant", domain_module_id: M_CONTENT, description: "Variant is live on at least one channel. Inherits parent's category and most attributes." },
  { data_object_id: DO_PIM_VARIANTS, state_name: "discontinued", state_order: 30, is_initial: false, is_terminal: true,  requires_permission: true, permission_verb_override: "discontinue_variant", domain_module_id: M_CONTENT, description: "Variant no longer offered; parent product may still have other live variants." },

  // pim_translations (lightweight workflow, lives in PIM-PRODUCT-CONTENT)
  { data_object_id: DO_PIM_TRANS, state_name: "pending",        state_order: 10, is_initial: true,  is_terminal: false, requires_permission: false, domain_module_id: M_CONTENT, description: "Translation requested; not yet in any pipeline." },
  { data_object_id: DO_PIM_TRANS, state_name: "in_translation", state_order: 20, is_initial: false, is_terminal: false, requires_permission: false, domain_module_id: M_CONTENT, description: "Machine translation has run and/or a human translator has the assignment." },
  { data_object_id: DO_PIM_TRANS, state_name: "review",         state_order: 30, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "review_translation", domain_module_id: M_CONTENT, description: "Translation queued for editorial review before being marked approved." },
  { data_object_id: DO_PIM_TRANS, state_name: "approved",       state_order: 40, is_initial: false, is_terminal: true,  requires_permission: true, permission_verb_override: "approve_translation", domain_module_id: M_CONTENT, description: "Translation cleared for publishing; consumed by syndication jobs in that locale." },

  // pim_digital_assets (workflow, lives in PIM-DIGITAL-ASSETS)
  { data_object_id: DO_PIM_ASSETS, state_name: "uploaded",         state_order: 10, is_initial: true,  is_terminal: false, requires_permission: false, domain_module_id: M_ASSETS, description: "Asset uploaded; metadata pending. Not yet linked to any product feed." },
  { data_object_id: DO_PIM_ASSETS, state_name: "pending_approval", state_order: 20, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "submit_asset_for_approval", domain_module_id: M_ASSETS, description: "Rights review or brand-compliance check in progress." },
  { data_object_id: DO_PIM_ASSETS, state_name: "approved",         state_order: 30, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "approve_asset", domain_module_id: M_ASSETS, description: "Cleared for use on products; available to syndication." },
  { data_object_id: DO_PIM_ASSETS, state_name: "published",        state_order: 40, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "publish_asset", domain_module_id: M_ASSETS, description: "Live on at least one channel feed; CDN URL active." },
  { data_object_id: DO_PIM_ASSETS, state_name: "retired",          state_order: 50, is_initial: false, is_terminal: true,  requires_permission: true, permission_verb_override: "retire_asset", domain_module_id: M_ASSETS, description: "Pulled from active use (rights expired, brand refresh, or content rotation)." },

  // pim_syndication_jobs (system-driven, lives in PIM-SYNDICATION)
  { data_object_id: DO_PIM_JOBS, state_name: "queued",          state_order: 10, is_initial: true,  is_terminal: false, requires_permission: false, domain_module_id: M_SYND, description: "Job accepted; waiting for a worker." },
  { data_object_id: DO_PIM_JOBS, state_name: "running",         state_order: 20, is_initial: false, is_terminal: false, requires_permission: false, domain_module_id: M_SYND, description: "Worker actively shaping the feed and pushing to the destination channel." },
  { data_object_id: DO_PIM_JOBS, state_name: "partial_success", state_order: 30, is_initial: false, is_terminal: false, requires_permission: false, domain_module_id: M_SYND, description: "Some records published; others rejected by destination validation. Admins triage from this state." },
  { data_object_id: DO_PIM_JOBS, state_name: "succeeded",       state_order: 40, is_initial: false, is_terminal: true,  requires_permission: false, domain_module_id: M_SYND, description: "All records accepted by destination; channel feed in sync." },
  { data_object_id: DO_PIM_JOBS, state_name: "failed",          state_order: 50, is_initial: false, is_terminal: true,  requires_permission: false, domain_module_id: M_SYND, description: "Job aborted before any records succeeded; usually destination outage or credential failure. Re-queue via admin tooling." },
];

// Normalize: PostgREST bulk POST requires homogeneous keys across all rows.
const lifecycleNormalized = lifecycleRows.map(r => ({
  data_object_id: r.data_object_id,
  state_name: r.state_name,
  state_order: r.state_order,
  is_initial: r.is_initial,
  is_terminal: r.is_terminal,
  requires_permission: r.requires_permission,
  permission_verb_override: (r as { permission_verb_override?: string }).permission_verb_override ?? "",
  domain_module_id: r.domain_module_id,
  description: r.description,
}));
const existingLifecycle = await get(`/data_object_lifecycle_states?data_object_id=in.(${[...doId.values()].join(",")})&select=data_object_id,state_name`);
const lcKey = (r: Row) => `${r.data_object_id}|${r.state_name}`;
const existingLcKeys = new Set(existingLifecycle.map(lcKey));
const missingLc = lifecycleNormalized.filter(r => !existingLcKeys.has(lcKey(r)));
if (missingLc.length > 0) await insert("/data_object_lifecycle_states", missingLc);
console.log(`  ${missingLc.length} inserted (${existingLifecycle.length} pre-existing)`);

// =========================================================================
// 5. trigger_events
// =========================================================================
console.log("\n[5/8] trigger_events");

const eventDefs = [
  { event_name: "pim_product.created",              data_object_id: DO_PIM_PRODUCTS, event_category: "lifecycle",    from_state: "",             to_state: "draft",           description: "A new PIM product has been authored in draft state." },
  { event_name: "pim_product.submitted_for_review", data_object_id: DO_PIM_PRODUCTS, event_category: "state_change", from_state: "in_enrichment", to_state: "pending_review",  description: "Author has submitted the product for merchandising review; attribute submit-lock now active." },
  { event_name: "pim_product.approved",             data_object_id: DO_PIM_PRODUCTS, event_category: "state_change", from_state: "pending_review",to_state: "approved",        description: "Merchandiser has approved the record; ready to be published to any configured channel." },
  { event_name: "pim_product.published",            data_object_id: DO_PIM_PRODUCTS, event_category: "state_change", from_state: "approved",      to_state: "published",       description: "Product is now live on one or more syndication channels; storefronts, inventory, and CPQ become eligible to read." },
  { event_name: "pim_product.unpublished",          data_object_id: DO_PIM_PRODUCTS, event_category: "state_change", from_state: "published",     to_state: "approved",        description: "Product has been pulled from all channels but remains in approved state for later re-publishing." },
  { event_name: "pim_product.discontinued",         data_object_id: DO_PIM_PRODUCTS, event_category: "state_change", from_state: "published",     to_state: "discontinued",    description: "Product is no longer offered; downstream systems must stop fulfillment for net-new orders." },
  { event_name: "pim_digital_asset.approved",       data_object_id: DO_PIM_ASSETS,   event_category: "state_change", from_state: "pending_approval", to_state: "approved",     description: "Asset has cleared rights / brand-compliance review and is available to PIM products." },
  { event_name: "pim_digital_asset.published",      data_object_id: DO_PIM_ASSETS,   event_category: "state_change", from_state: "approved",      to_state: "published",       description: "Asset is live on a channel feed; CDN URL is in active use." },
  { event_name: "pim_translation.approved",         data_object_id: DO_PIM_TRANS,    event_category: "state_change", from_state: "review",        to_state: "approved",        description: "Translation cleared for publishing; the locale variant is consumable by syndication jobs." },
  { event_name: "pim_syndication_job.queued",       data_object_id: DO_PIM_JOBS,     event_category: "lifecycle",    from_state: "",              to_state: "queued",          description: "A syndication job has been created and is awaiting a worker." },
  { event_name: "pim_syndication_job.succeeded",    data_object_id: DO_PIM_JOBS,     event_category: "state_change", from_state: "running",       to_state: "succeeded",       description: "All records on the run were accepted by the destination channel." },
  { event_name: "pim_syndication_job.failed",       data_object_id: DO_PIM_JOBS,     event_category: "state_change", from_state: "running",       to_state: "failed",          description: "Job aborted before any records succeeded; usually destination outage or credentials." },
];

const existingEvents = await get(`/trigger_events?event_name=in.(${eventDefs.map(e => e.event_name).join(",")})&select=id,event_name`);
const existingEventNames = new Set(existingEvents.map(r => String(r.event_name)));
const missingEvents = eventDefs.filter(e => !existingEventNames.has(e.event_name));
if (missingEvents.length > 0) await insert("/trigger_events", missingEvents);
const allEvents = await get(`/trigger_events?event_name=in.(${eventDefs.map(e => e.event_name).join(",")})&select=id,event_name`);
const eventId = new Map<string, number>();
for (const r of allEvents) eventId.set(String(r.event_name), Number(r.id));
console.log(`  ${missingEvents.length} inserted (${existingEvents.length} pre-existing). Map size=${eventId.size}`);

// =========================================================================
// 6. data_object_relationships
// =========================================================================
console.log("\n[6/8] data_object_relationships");

const relRows = [
  // Intra-PIM (modeled from the "one" side per the one_to_many convention)
  { data_object_id: DO_PIM_PRODUCTS,  related_data_object_id: DO_PIM_VARIANTS,   relationship_verb: "has_variants",      inverse_verb: "varies",            relationship_type: "one_to_many", relationship_kind: "composition", is_required: true,  owner_side: "source", notes: "A product can have many variants (size/color/locale); each variant has exactly one parent." },
  { data_object_id: DO_PIM_PRODUCTS,  related_data_object_id: DO_PIM_TRANS,      relationship_verb: "has_translations",  inverse_verb: "localizes",         relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source", notes: "Locale-specific overrides on product-level fields." },
  { data_object_id: DO_PIM_ATTRIBUTES, related_data_object_id: DO_PIM_TRANS,     relationship_verb: "has_translations",  inverse_verb: "localizes",         relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source", notes: "Locale-specific overrides on attribute definitions (labels, descriptions, validation messages)." },
  { data_object_id: DO_PIM_ASSETS,    related_data_object_id: DO_PIM_PRODUCTS,   relationship_verb: "depicts",           inverse_verb: "has_assets",        relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source", notes: "An asset can be linked to many products (campaign hero shot) and a product can have many assets (image gallery)." },
  { data_object_id: DO_PIM_PRODUCTS,  related_data_object_id: DO_PIM_CATEGORIES, relationship_verb: "classified_in",     inverse_verb: "classifies",        relationship_type: "many_to_many", relationship_kind: "association", is_required: true,  owner_side: "source", notes: "Multi-taxonomy: a product can sit in one merchandising tree node plus one or more channel-tree nodes." },
  { data_object_id: DO_PIM_ATTRIBUTES, related_data_object_id: DO_PIM_CATEGORIES, relationship_verb: "scoped_to",         inverse_verb: "scopes_attributes", relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source", notes: "Attribute groups bound to category subtrees (electronics gets screen-size; apparel gets size + color)." },
  { data_object_id: DO_PIM_CHANNELS,  related_data_object_id: DO_PIM_JOBS,       relationship_verb: "has_jobs",          inverse_verb: "targets",           relationship_type: "one_to_many", relationship_kind: "reference",   is_required: true,  owner_side: "source", notes: "Each job pushes to exactly one channel destination; a channel accumulates many jobs over time." },
  { data_object_id: DO_PIM_JOBS,      related_data_object_id: DO_PIM_PRODUCTS,   relationship_verb: "publishes",         inverse_verb: "published_by",      relationship_type: "many_to_many", relationship_kind: "association", is_required: true,  owner_side: "source", notes: "A job publishes a batch of products to its channel." },

  // Cross-domain (PIM masters publishing to / reading from other domains)
  { data_object_id: DO_PIM_PRODUCTS,  related_data_object_id: DO_COMMERCE_PRODUCTS, relationship_verb: "syndicates_to", inverse_verb: "syndicated_from",        relationship_type: "one_to_one",   relationship_kind: "association", is_required: false, owner_side: "source", notes: "PIM is source of truth for content; B2C-COMM commerce_products is the storefront runtime cache. One-to-one keyed by SKU." },
  { data_object_id: DO_PIM_PRODUCTS,  related_data_object_id: DO_INV_STOCK_ITEMS,   relationship_verb: "stocks_as",     inverse_verb: "carries_content_from",   relationship_type: "one_to_one",   relationship_kind: "reference",   is_required: false, owner_side: "source", notes: "Inventory keeps stock against the same SKU PIM publishes; loose coupling." },
  { data_object_id: DO_PIM_PRODUCTS,  related_data_object_id: DO_PRODUCT_CONFIGS,   relationship_verb: "configured_as", inverse_verb: "configures_content_from", relationship_type: "one_to_many", relationship_kind: "reference",   is_required: false, owner_side: "source", notes: "CPQ pulls PIM attribute schemas to drive configurator UI." },
  { data_object_id: DO_PIM_PRODUCTS,  related_data_object_id: DO_ENGINEERING_PARTS, relationship_verb: "derives_from",  inverse_verb: "released_as",            relationship_type: "many_to_many", relationship_kind: "reference",   is_required: false, owner_side: "source", notes: "When a PLM engineering part hits release-to-market, PIM creates a merchandising shell; one PIM product can combine multiple engineering parts (bundles)." },
  { data_object_id: DO_PIM_PRODUCTS,  related_data_object_id: DO_PRODUCT_COMPLIANCE, relationship_verb: "incorporates", inverse_verb: "constrains",            relationship_type: "many_to_many", relationship_kind: "reference",   is_required: false, owner_side: "source", notes: "Region-specific compliance declarations flow into PIM attributes (REACH, RoHS, Prop 65)." },
  { data_object_id: DO_PIM_PRODUCTS,  related_data_object_id: DO_SUPPLIERS,         relationship_verb: "sourced_from",  inverse_verb: "supplies_content_for",   relationship_type: "many_to_many", relationship_kind: "reference",   is_required: false, owner_side: "source", notes: "Supplier onboarding feeds attribute data into PIM; the product can have one primary supplier and many alternates." },

  // users edges (Rule #10)
  { data_object_id: DO_USERS, related_data_object_id: DO_PIM_PRODUCTS,  relationship_verb: "authors",   inverse_verb: "authored_by",  relationship_type: "one_to_many", relationship_kind: "reference", is_required: true,  owner_side: "source", notes: "PIM author / content editor of the product record." },
  { data_object_id: DO_USERS, related_data_object_id: DO_PIM_PRODUCTS,  relationship_verb: "approves",  inverse_verb: "approved_by",  relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source", notes: "Merchandiser who gates publish." },
  { data_object_id: DO_USERS, related_data_object_id: DO_PIM_ASSETS,    relationship_verb: "uploads",   inverse_verb: "uploaded_by",  relationship_type: "one_to_many", relationship_kind: "reference", is_required: true,  owner_side: "source", notes: "DAM contributor who uploaded the asset." },
  { data_object_id: DO_USERS, related_data_object_id: DO_PIM_ASSETS,    relationship_verb: "approves",  inverse_verb: "approved_by",  relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source", notes: "Brand / rights reviewer who clears the asset." },
  { data_object_id: DO_USERS, related_data_object_id: DO_PIM_TRANS,     relationship_verb: "translates", inverse_verb: "translated_by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source", notes: "Human translator or post-edit reviewer." },
  { data_object_id: DO_USERS, related_data_object_id: DO_PIM_JOBS,      relationship_verb: "initiates", inverse_verb: "initiated_by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source", notes: "Admin / merchandising-ops user who launched the publish run (where not auto-triggered)." },
];

const allRelevantDoIds = [...doId.values(), DO_USERS, DO_SUPPLIERS, DO_ENGINEERING_PARTS, DO_PRODUCT_COMPLIANCE, DO_COMMERCE_PRODUCTS, DO_INV_STOCK_ITEMS, DO_PRODUCT_CONFIGS];
const existingRels = await get(`/data_object_relationships?and=(data_object_id.in.(${allRelevantDoIds.join(",")}),related_data_object_id.in.(${allRelevantDoIds.join(",")}))&select=data_object_id,related_data_object_id,relationship_verb`);
const relKey = (r: Row) => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`;
const existingRelKeys = new Set(existingRels.map(relKey));
const missingRels = relRows.filter(r => !existingRelKeys.has(relKey(r)));
if (missingRels.length > 0) await insert("/data_object_relationships", missingRels);
console.log(`  ${missingRels.length} inserted (${existingRels.length} pre-existing)`);

// =========================================================================
// 7. handoffs (outbound + intra-domain + inbound from PLM)
// =========================================================================
console.log("\n[7/8] handoffs");

const handoffRows = [
  // Outbound: pim_product.published fan-out
  {
    trigger_event_id: eventId.get("pim_product.published")!,
    source_domain_id: PIM_ID, source_domain_module_id: M_SYND,
    target_domain_id: B2C_COMM_ID, target_domain_module_id: null,
    data_object_id: DO_COMMERCE_PRODUCTS,
    integration_pattern: "api_call", friction_level: "high",
    description: "PIM publishes a product release; B2C-COMM refreshes its storefront-runtime cache (commerce_products). Failure modes: cross-vendor cache invalidation (PIM and commerce often different vendors), partial-publish where some attributes propagate before others, CDN URL mismatch between PIM-managed assets and storefront media library.",
    notes: "target NULL until B2C-COMM is modularized. Multi-shape: cross-vendor stack + alert-without-feedback-loop (rejected publishes routinely need manual remediation in PIM).",
  },
  {
    trigger_event_id: eventId.get("pim_product.published")!,
    source_domain_id: PIM_ID, source_domain_module_id: M_SYND,
    target_domain_id: INV_MGMT_ID, target_domain_module_id: INV_CORE_STOCK,
    data_object_id: DO_INV_STOCK_ITEMS,
    integration_pattern: "event_stream", friction_level: "medium",
    description: "New SKU appears in stock master so inventory tracking can begin. Routine sync; medium friction because new-SKU first-stock-receipt timing has to coordinate with vendor receiving.",
    notes: "",
  },
  {
    trigger_event_id: eventId.get("pim_product.published")!,
    source_domain_id: PIM_ID, source_domain_module_id: M_SYND,
    target_domain_id: CPQ_ID, target_domain_module_id: null,
    data_object_id: DO_PRODUCT_CONFIGS,
    integration_pattern: "api_call", friction_level: "medium",
    description: "CPQ pulls the attribute schema and option dependencies for a newly-published product so the configurator UI can offer it. Medium friction: attribute-shape changes break existing CPQ rules.",
    notes: "target NULL until CPQ is modularized.",
  },

  // Outbound: pim_product.unpublished / discontinued
  {
    trigger_event_id: eventId.get("pim_product.discontinued")!,
    source_domain_id: PIM_ID, source_domain_module_id: M_CONTENT,
    target_domain_id: B2C_COMM_ID, target_domain_module_id: null,
    data_object_id: DO_COMMERCE_PRODUCTS,
    integration_pattern: "api_call", friction_level: "high",
    description: "Discontinued SKU must be pulled from storefront and marketplace listings. Multi-shape high-friction: leaver pattern (going-away signal often arrives via different channel than original arrival) + cross-vendor stack.",
    notes: "target NULL until B2C-COMM is modularized. Leaver-pattern handoff.",
  },

  // Intra-domain: pim_product.approved triggers syndication (lifecycle_progression)
  {
    trigger_event_id: eventId.get("pim_product.approved")!,
    source_domain_id: PIM_ID, source_domain_module_id: M_CONTENT,
    target_domain_id: PIM_ID, target_domain_module_id: M_SYND,
    data_object_id: DO_PIM_JOBS,
    integration_pattern: "lifecycle_progression", friction_level: "low",
    description: "Approved product enters the syndication queue; one pim_syndication_jobs row is created per configured channel target. In-process; no message moves between modules.",
    notes: "",
  },

  // Intra-domain: pim_digital_asset.approved feeds syndication (lifecycle_progression)
  {
    trigger_event_id: eventId.get("pim_digital_asset.approved")!,
    source_domain_id: PIM_ID, source_domain_module_id: M_ASSETS,
    target_domain_id: PIM_ID, target_domain_module_id: M_SYND,
    data_object_id: DO_PIM_ASSETS,
    integration_pattern: "lifecycle_progression", friction_level: "low",
    description: "Approved asset becomes available to in-flight syndication jobs that need its CDN URL. Lifecycle progression; no message moves.",
    notes: "",
  },

  // Intra-domain: pim_translation.approved unlocks syndication for that locale
  {
    trigger_event_id: eventId.get("pim_translation.approved")!,
    source_domain_id: PIM_ID, source_domain_module_id: M_CONTENT,
    target_domain_id: PIM_ID, target_domain_module_id: M_SYND,
    data_object_id: DO_PIM_TRANS,
    integration_pattern: "lifecycle_progression", friction_level: "low",
    description: "Approved translation becomes consumable by locale-specific syndication jobs. Lifecycle progression.",
    notes: "",
  },

  // Inbound from PLM (re-uses existing PLM trigger_events; this is PIM's consumer leg of the fan-out)
  {
    trigger_event_id: TE_ECO_RELEASED,
    source_domain_id: PLM_ID, source_domain_module_id: PLM_ENG_CORE,
    target_domain_id: PIM_ID, target_domain_module_id: M_CONTENT,
    data_object_id: DO_PIM_PRODUCTS,
    integration_pattern: "api_call", friction_level: "high",
    description: "PLM engineering-change-order release rev-bumps the engineering part; PIM must refresh merchandising attributes that mirror engineering revisions (dimensions, material, compliance flags). Multi-shape high-friction: cross-vendor stack (PLM and PIM often different vendors) + period-cycle-close coupling (mid-launch-window ECOs cascade through merchandising approvals).",
    notes: "Joining PLM ECO fan-out alongside MES (handoff 1087), ERP-FIN (1088), S2P (1089).",
  },
  {
    trigger_event_id: TE_ENG_PART_RELEASED,
    source_domain_id: PLM_ID, source_domain_module_id: PLM_ENG_CORE,
    target_domain_id: PIM_ID, target_domain_module_id: M_CONTENT,
    data_object_id: DO_PIM_PRODUCTS,
    integration_pattern: "api_call", friction_level: "medium",
    description: "New engineering part released to market; PIM creates the merchandising shell with engineering-attribute seeds. Medium friction: engineering and merchandising vocabularies diverge, so attribute mapping is rarely 1:1.",
    notes: "",
  },
  {
    trigger_event_id: TE_COMPLIANCE_APPROVED,
    source_domain_id: PLM_ID, source_domain_module_id: PLM_COMPLIANCE_M,
    target_domain_id: PIM_ID, target_domain_module_id: M_CONTENT,
    data_object_id: DO_PIM_PRODUCTS,
    integration_pattern: "api_call", friction_level: "medium",
    description: "Approved product-compliance declaration updates region-specific PIM attributes (REACH / RoHS / Prop 65 / FDA). Medium friction: compliance vocabularies are jurisdiction-specific and rarely map cleanly to PIM channel-feed shapes.",
    notes: "",
  },
];

// Idempotency: use the natural-key handoffs.key field as a uniqueness signal.
// Build local key client-side, matching the DB's 6-tuple key format.
const handoffKey = (r: Row) => [r.source_domain_id, r.target_domain_id, r.source_domain_module_id ?? "", r.target_domain_module_id ?? "", r.trigger_event_id, r.data_object_id].join(".");
const existingHandoffs = await get(`/handoffs?or=(and(source_domain_id.eq.${PIM_ID}),and(target_domain_id.eq.${PIM_ID}),and(trigger_event_id.in.(${TE_ECO_RELEASED},${TE_ENG_PART_RELEASED},${TE_COMPLIANCE_APPROVED}),target_domain_id.eq.${PIM_ID}))&select=key,trigger_event_id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,data_object_id`);
const existingHandoffKeys = new Set(existingHandoffs.map(handoffKey));
const missingHandoffs = handoffRows.filter(r => !existingHandoffKeys.has(handoffKey(r)));
if (missingHandoffs.length > 0) await insert("/handoffs", missingHandoffs);
console.log(`  ${missingHandoffs.length} inserted (${existingHandoffs.length} pre-existing)`);

// =========================================================================
// 8. Verification summary
// =========================================================================
console.log("\n[8/8] verification");
const masterCount = await get(`/domain_data_objects?domain_id=eq.${PIM_ID}&role=eq.master&select=data_object_id`);
const handoffOutCount = await get(`/handoffs?source_domain_id=eq.${PIM_ID}&select=id`);
const handoffInCount = await get(`/handoffs?target_domain_id=eq.${PIM_ID}&source_domain_id=neq.${PIM_ID}&select=id`);
const handoffIntraCount = await get(`/handoffs?source_domain_id=eq.${PIM_ID}&target_domain_id=eq.${PIM_ID}&select=id`);
console.log(`  masters=${masterCount.length}, outbound handoffs=${handoffOutCount.length}, inbound=${handoffInCount.length}, intra-domain=${handoffIntraCount.length}`);
console.log(`  DO ids: products=${DO_PIM_PRODUCTS} attributes=${DO_PIM_ATTRIBUTES} variants=${DO_PIM_VARIANTS} categories=${DO_PIM_CATEGORIES}`);
console.log(`  DO ids: translations=${DO_PIM_TRANS} assets=${DO_PIM_ASSETS} channels=${DO_PIM_CHANNELS} jobs=${DO_PIM_JOBS}`);
console.log("\nPhase B complete.");
console.log("UI: https://tests.semantius.app/domain_map/data_objects");
