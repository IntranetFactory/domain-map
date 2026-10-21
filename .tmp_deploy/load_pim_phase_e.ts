#!/usr/bin/env bun
// PIM Phase E: roles + role_modules + permissions (derived) + role_permissions.
//
// 5 roles (4 Marketing + 1 Procurement cross-functional). Per-module permissions
// derived from lifecycle states with requires_permission=true plus the baseline
// read/manage/admin tier set per module.
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

const M_CONTENT = 141;
const M_ASSETS  = 142;
const M_SYND    = 143;
const FN_MARKETING = 22;
const FN_PROCUREMENT = 19;

// =========================================================================
// 1. permissions (baseline tier + workflow gates)
// =========================================================================
console.log("[1/4] permissions");

const permDefs = [
  // pim-product-content baselines + workflow gates
  { permission_name: "pim-product-content:read",                 domain_module_id: M_CONTENT, tier: "baseline-read",   description: "Read access to PIM products, attributes, variants, categories, translations." },
  { permission_name: "pim-product-content:manage",               domain_module_id: M_CONTENT, tier: "baseline-manage", description: "Create / edit / draft-state-transition PIM products, attributes, variants, categories, translations." },
  { permission_name: "pim-product-content:admin",                domain_module_id: M_CONTENT, tier: "baseline-admin",  description: "Full administrative control over the PIM Product Content module: all workflow gates, attribute-schema edits, deletes." },
  { permission_name: "pim-product-content:submit_for_review",    domain_module_id: M_CONTENT, tier: "workflow-gate",   description: "Workflow gate: transition pim_products from in_enrichment to pending_review." },
  { permission_name: "pim-product-content:approve",              domain_module_id: M_CONTENT, tier: "workflow-gate",   description: "Workflow gate: approve pim_products to advance from pending_review to approved." },
  { permission_name: "pim-product-content:discontinue",          domain_module_id: M_CONTENT, tier: "workflow-gate",   description: "Workflow gate: discontinue a published pim_products record." },
  { permission_name: "pim-product-content:archive",              domain_module_id: M_CONTENT, tier: "workflow-gate",   description: "Workflow gate: archive a discontinued pim_products record beyond the retention window." },
  { permission_name: "pim-product-content:publish_variant",      domain_module_id: M_CONTENT, tier: "workflow-gate",   description: "Workflow gate: publish a variant on at least one channel." },
  { permission_name: "pim-product-content:discontinue_variant",  domain_module_id: M_CONTENT, tier: "workflow-gate",   description: "Workflow gate: discontinue a single variant while the parent stays live." },
  { permission_name: "pim-product-content:review_translation",   domain_module_id: M_CONTENT, tier: "workflow-gate",   description: "Workflow gate: route a pim_translations row from in_translation to review." },
  { permission_name: "pim-product-content:approve_translation",  domain_module_id: M_CONTENT, tier: "workflow-gate",   description: "Workflow gate: approve a pim_translations row for publishing." },

  // pim-digital-assets baselines + workflow gates
  { permission_name: "pim-digital-assets:read",                  domain_module_id: M_ASSETS, tier: "baseline-read",   description: "Read access to PIM digital assets and their product linkages." },
  { permission_name: "pim-digital-assets:manage",                domain_module_id: M_ASSETS, tier: "baseline-manage", description: "Create / edit pim_digital_assets, metadata, renditions, and product linkages." },
  { permission_name: "pim-digital-assets:admin",                 domain_module_id: M_ASSETS, tier: "baseline-admin",  description: "Full administrative control over the PIM Digital Assets module including approval / publish gates and deletes." },
  { permission_name: "pim-digital-assets:submit_asset_for_approval", domain_module_id: M_ASSETS, tier: "workflow-gate", description: "Workflow gate: submit an uploaded asset to pending_approval." },
  { permission_name: "pim-digital-assets:approve_asset",         domain_module_id: M_ASSETS, tier: "workflow-gate",   description: "Workflow gate: rights / brand reviewer approves an asset." },
  { permission_name: "pim-digital-assets:publish_asset",         domain_module_id: M_ASSETS, tier: "workflow-gate",   description: "Workflow gate: publish an approved asset to CDN distribution." },
  { permission_name: "pim-digital-assets:retire_asset",          domain_module_id: M_ASSETS, tier: "workflow-gate",   description: "Workflow gate: pull an asset from active feeds." },

  // pim-syndication baselines + workflow gates
  { permission_name: "pim-syndication:read",                     domain_module_id: M_SYND, tier: "baseline-read",   description: "Read access to syndication channels, jobs, validation results." },
  { permission_name: "pim-syndication:manage",                   domain_module_id: M_SYND, tier: "baseline-manage", description: "Create / re-queue / cancel pim_syndication_jobs; edit pim_syndication_channels." },
  { permission_name: "pim-syndication:admin",                    domain_module_id: M_SYND, tier: "baseline-admin",  description: "Full administrative control over PIM Syndication including credential management and channel provisioning." },
  { permission_name: "pim-syndication:publish",                  domain_module_id: M_SYND, tier: "workflow-gate",   description: "Workflow gate: publish an approved pim_products row to one or more configured channels." },
];

const existingPerms = await get(`/permissions?domain_module_id=in.(${M_CONTENT},${M_ASSETS},${M_SYND})&select=id,permission_name`);
const existingPermNames = new Set(existingPerms.map(r => String(r.permission_name)));
const missingPerms = permDefs.filter(p => !existingPermNames.has(p.permission_name));
if (missingPerms.length > 0) await insert("/permissions", missingPerms);
const allPerms = await get(`/permissions?domain_module_id=in.(${M_CONTENT},${M_ASSETS},${M_SYND})&select=id,permission_name`);
const permId = new Map<string, number>();
for (const r of allPerms) permId.set(String(r.permission_name), Number(r.id));
console.log(`  ${missingPerms.length} inserted (${existingPerms.length} pre-existing). Total: ${permId.size}`);

// =========================================================================
// 2. roles
// =========================================================================
console.log("\n[2/4] roles");

const roleDefs = [
  {
    role_code: "MARKETING-PIM-ADMIN",
    role_name: "PIM Administrator",
    slug: "marketing_pim_admin",
    business_function_id: FN_MARKETING,
    origin: "model",
    description: "Cross-module administrator for the PIM rollout. Owns module provisioning, attribute-schema evolution, channel configuration, credential rotation, and emergency interventions across all three PIM modules.",
  },
  {
    role_code: "MARKETING-MERCHANDISING-MGR",
    role_name: "Merchandising Manager",
    slug: "marketing_merchandising_mgr",
    business_function_id: FN_MARKETING,
    origin: "model",
    description: "Owns merchandising decisions across content and syndication: which products go live, on which channels, with which translations approved. Approves publish gates and drives the prioritization of catalog work.",
  },
  {
    role_code: "MARKETING-PRODUCT-CONTENT-EDITOR",
    role_name: "Product Content Editor",
    slug: "marketing_product_content_editor",
    business_function_id: FN_MARKETING,
    origin: "model",
    description: "Day-to-day content author working across product attributes, descriptions, variants, translations, and the assets attached to them. Submits work for review; rarely owns the approve gate.",
  },
  {
    role_code: "MARKETING-SYNDICATION-OPS",
    role_name: "Syndication Operations",
    slug: "marketing_syndication_ops",
    business_function_id: FN_MARKETING,
    origin: "model",
    description: "Operates the channel-syndication pipelines: queues publish runs, triages rejected listings, monitors job health, and coordinates remediation with Product Content Editors when validation fails.",
  },
  {
    role_code: "PROCUREMENT-PIM-SUPPLIER-LIAISON",
    role_name: "Supplier Data Liaison",
    slug: "procurement_pim_supplier_liaison",
    business_function_id: FN_PROCUREMENT,
    origin: "model",
    description: "Procurement-anchored role bridging supplier-onboarding flows into PIM. Ingests supplier data sheets, maps supplier vocabularies to internal attributes, and submits supplier-sourced content for merchandising review.",
  },
];

const existingRoles = await get(`/roles?role_code=in.(${roleDefs.map(r => r.role_code).join(",")})&select=id,role_code`);
const existingRoleCodes = new Set(existingRoles.map(r => String(r.role_code)));
const missingRoles = roleDefs.filter(r => !existingRoleCodes.has(r.role_code));
if (missingRoles.length > 0) await insert("/roles", missingRoles);
const allRoles = await get(`/roles?role_code=in.(${roleDefs.map(r => r.role_code).join(",")})&select=id,role_code`);
const roleId = new Map<string, number>();
for (const r of allRoles) roleId.set(String(r.role_code), Number(r.id));
console.log(`  ${missingRoles.length} inserted (${existingRoles.length} pre-existing). Roles: ${[...roleId.entries()].map(([c, i]) => `${c}=${i}`).join(", ")}`);

const R_ADMIN   = roleId.get("MARKETING-PIM-ADMIN")!;
const R_MERCH   = roleId.get("MARKETING-MERCHANDISING-MGR")!;
const R_EDITOR  = roleId.get("MARKETING-PRODUCT-CONTENT-EDITOR")!;
const R_SYND_OP = roleId.get("MARKETING-SYNDICATION-OPS")!;
const R_SUP_LIA = roleId.get("PROCUREMENT-PIM-SUPPLIER-LIAISON")!;

// =========================================================================
// 3. role_modules
// =========================================================================
console.log("\n[3/4] role_modules");

const rmRows = [
  // ADMIN: primary across all three
  { role_id: R_ADMIN, domain_module_id: M_CONTENT, interaction_level: "primary",   notes: "Cross-module admin." },
  { role_id: R_ADMIN, domain_module_id: M_ASSETS,  interaction_level: "primary",   notes: "Cross-module admin." },
  { role_id: R_ADMIN, domain_module_id: M_SYND,    interaction_level: "primary",   notes: "Cross-module admin." },
  // MERCH: content + syndication primary, assets secondary
  { role_id: R_MERCH, domain_module_id: M_CONTENT, interaction_level: "primary",   notes: "Owns approve gate on products and translations." },
  { role_id: R_MERCH, domain_module_id: M_SYND,    interaction_level: "primary",   notes: "Owns publish gate to channels." },
  { role_id: R_MERCH, domain_module_id: M_ASSETS,  interaction_level: "secondary", notes: "Reads asset state when approving products; does not own asset gates." },
  // EDITOR: content + assets primary, syndication secondary
  { role_id: R_EDITOR, domain_module_id: M_CONTENT, interaction_level: "primary",   notes: "Day-to-day content authoring." },
  { role_id: R_EDITOR, domain_module_id: M_ASSETS,  interaction_level: "primary",   notes: "Uploads and links assets to products." },
  { role_id: R_EDITOR, domain_module_id: M_SYND,    interaction_level: "secondary", notes: "Read-only visibility on syndication outcomes to triage rejected listings." },
  // SYND-OPS: syndication primary, content secondary
  { role_id: R_SYND_OP, domain_module_id: M_SYND,    interaction_level: "primary",   notes: "Owns the syndication-pipeline operations." },
  { role_id: R_SYND_OP, domain_module_id: M_CONTENT, interaction_level: "secondary", notes: "Read-only access to product content to coordinate remediation." },
  // SUPPLIER-LIAISON: content primary, assets secondary
  { role_id: R_SUP_LIA, domain_module_id: M_CONTENT, interaction_level: "primary",   notes: "Submits supplier-sourced product content." },
  { role_id: R_SUP_LIA, domain_module_id: M_ASSETS,  interaction_level: "secondary", notes: "Read-only visibility on assets attached to supplier-sourced products." },
];

const existingRm = await get(`/role_modules?role_id=in.(${R_ADMIN},${R_MERCH},${R_EDITOR},${R_SYND_OP},${R_SUP_LIA})&select=role_id,domain_module_id`);
const rmKey = (r: Row) => `${r.role_id}|${r.domain_module_id}`;
const existingRmKeys = new Set(existingRm.map(rmKey));
const missingRm = rmRows.filter(r => !existingRmKeys.has(rmKey(r)));
if (missingRm.length > 0) await insert("/role_modules", missingRm);
console.log(`  ${missingRm.length} inserted (${existingRm.length} pre-existing)`);

// =========================================================================
// 4. role_permissions
// =========================================================================
console.log("\n[4/4] role_permissions");

type Bundle = { role: number; perms: string[]; note?: string };
const bundles: Bundle[] = [
  {
    role: R_ADMIN,
    perms: ["pim-product-content:admin", "pim-digital-assets:admin", "pim-syndication:admin"],
  },
  {
    role: R_MERCH,
    perms: [
      "pim-product-content:manage", "pim-product-content:approve", "pim-product-content:approve_translation", "pim-product-content:discontinue",
      "pim-syndication:manage", "pim-syndication:publish",
      "pim-digital-assets:read",
    ],
  },
  {
    role: R_EDITOR,
    perms: [
      "pim-product-content:manage", "pim-product-content:submit_for_review", "pim-product-content:review_translation",
      "pim-digital-assets:manage", "pim-digital-assets:submit_asset_for_approval",
      "pim-syndication:read",
    ],
  },
  {
    role: R_SYND_OP,
    perms: [
      "pim-syndication:manage", "pim-syndication:publish",
      "pim-product-content:read",
      "pim-digital-assets:read",
    ],
  },
  {
    role: R_SUP_LIA,
    perms: [
      "pim-product-content:manage", "pim-product-content:submit_for_review",
      "pim-digital-assets:read",
    ],
  },
];

const rpRows: Array<{ role_id: number; permission_id: number }> = [];
for (const b of bundles) {
  for (const p of b.perms) {
    const pid = permId.get(p);
    if (!pid) throw new Error(`Missing permission: ${p}`);
    rpRows.push({ role_id: b.role, permission_id: pid });
  }
}

const existingRp = await get(`/role_permissions?role_id=in.(${R_ADMIN},${R_MERCH},${R_EDITOR},${R_SYND_OP},${R_SUP_LIA})&select=role_id,permission_id`);
const rpKey = (r: Row) => `${r.role_id}|${r.permission_id}`;
const existingRpKeys = new Set(existingRp.map(rpKey));
const missingRp = rpRows.filter(r => !existingRpKeys.has(rpKey(r)));
if (missingRp.length > 0) await insert("/role_permissions", missingRp);
console.log(`  ${missingRp.length} inserted (${existingRp.length} pre-existing). Total intended=${rpRows.length}`);

console.log("\nPhase E complete.");
console.log("UI: https://tests.semantius.app/domain_map/roles");
