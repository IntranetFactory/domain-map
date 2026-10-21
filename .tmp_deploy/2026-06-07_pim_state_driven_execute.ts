#!/usr/bin/env bun
// 2026-06-07 PIM state-driven Validate execute (SKILL.md Rule #21, bulk batch).
// Additive/corrective only; PATCH of empty/NULL fields. Idempotent: re-reads live
// before every write and skips work already done.
//
// PIM (domain 167) is BUILT: 3 full modules (141 PIM-PRODUCT-CONTENT,
// 142 PIM-DIGITAL-ASSETS, 143 PIM-SYNDICATION), 8 PIM-owned masters.
//
// EXECUTE (this loader):
//   1. B1A-ENTITY-TYPE (B13): all 8 masters carry entity_type 'unclassified'.
//        Classify per Rule #12, confirmed deterministically against live lifecycle
//        states (data_object_lifecycle_states):
//        - 5 workflow-bearing masters (carry lifecycle state machines today):
//            pim_products 811, pim_variants 813, pim_translations 815,
//            pim_digital_assets 816, pim_syndication_jobs 818 -> operational_workflow
//        - 3 config/reference masters (zero lifecycle states; definition-shaped):
//            pim_attributes 812 (attribute definitions / validation rules),
//            pim_categories 814 (taxonomy nodes),
//            pim_syndication_channels 817 (channel config: mapping, credentials)
//          -> catalog
//   2. Catalog UX (Rule #20 / B2-S8 / A4 / M8): author EMPTY
//      catalog_tagline/catalog_description on domain 167 and on all 3 modules.
//      Buyer voice (workflow + value), no vendor names, no em-dash, American English.
//      Never overwrites a non-empty value.
//
// NO-OP (already complete live, verified before run):
//   C1 business_function_domains: 5 coherent rows present (owner Marketing;
//      contributors Product Management/Supply Chain/Procurement; consumer Sales).
//   H1 handoff_processes: all 7 cross-domain handoffs already tagged agent_curated.
//   B11 aliases: every master carries >=1 synonym alias (13 total).
//
// SURFACED, not executed (returned to user): B2-S1 (M7 DELETE/PROMOTE, destructive),
//   B2-S2 (DAM overlap), B2-S4 (pattern flags), B2-S6 (regulation ownership),
//   B2-S7 (PIM->PLM discontinued handoff), B2-S9 (capability ownership override).
//   B1A-PHASE-P personas/RACI: DEFERRED (not authored).
//   B1B-M7-DELETE-SIBLINGS: destructive, gated on B2-S1.
// LEFT: B1B-* blocked on other domains' audits / B2 decisions; b3 backlog.
// SUPERSEDED (retired skill_tools model, 2026-06-06): B2-S3 (F7 skill_tools.notes),
//   B2-S5 (F5 score basis / coverage_tier). PIM now has ONE domain-grain system
//   skill (id 453 'pim-system'); old per-module skills + 41 skill_tools are gone.

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const err = stderr.trim();
    if (err.includes("required audience not found")) {
      console.error(
        "\n*** JWT AUDIENCE ERROR - STOPPING per SKILL Rule #6 ***\n" +
          err +
          "\nCommand body: " +
          JSON.stringify(body) +
          "\n",
      );
      process.exit(2);
    }
    throw new Error(`semantius call failed (exit ${exitCode}): ${err}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });

// ============================================================
// 1. entity_type classification (B13 / Rule #12)
// ============================================================
const PIM_MASTER_IDS = [811, 812, 813, 814, 815, 816, 817, 818];
const entityTypes: { id: number; name: string; entity_type: string }[] = [
  // 5 workflow-bearing masters (carry lifecycle state machines today)
  { id: 811, name: "pim_products", entity_type: "operational_workflow" },
  { id: 813, name: "pim_variants", entity_type: "operational_workflow" },
  { id: 815, name: "pim_translations", entity_type: "operational_workflow" },
  { id: 816, name: "pim_digital_assets", entity_type: "operational_workflow" },
  { id: 818, name: "pim_syndication_jobs", entity_type: "operational_workflow" },
  // 3 config/reference masters (zero lifecycle states; definition-shaped)
  { id: 812, name: "pim_attributes", entity_type: "catalog" },
  { id: 814, name: "pim_categories", entity_type: "catalog" },
  { id: 817, name: "pim_syndication_channels", entity_type: "catalog" },
];

async function classifyEntityTypes() {
  console.log("\n== 1. entity_type classification (B13) ==");
  const live = await get(
    `/data_objects?id=in.(${PIM_MASTER_IDS.join(",")})&select=id,data_object_name,entity_type`,
  );
  const cur = new Map(live.map(r => [Number(r.id), String(r.entity_type ?? "")]));
  let n = 0;
  for (const e of entityTypes) {
    const c = cur.get(e.id);
    if (c && c !== "unclassified") {
      console.log(`  skip ${e.name}: already '${c}'`);
      continue;
    }
    await patch(`/data_objects?id=eq.${e.id}`, { entity_type: e.entity_type });
    console.log(`  set  ${e.name} -> ${e.entity_type}`);
    n++;
  }
  console.log(`  entity_type updated: ${n}`);
  return n;
}

// ============================================================
// 2. Catalog UX (Rule #20) - writes EMPTY fields only, never overwrites
// ============================================================
const domainCopy = {
  catalog_tagline:
    "Enrich every product once, then publish it to every channel that sells it.",
  catalog_description:
    "Bring all of your product content into one trusted place: descriptions, attributes, variants, categories, translations, and the images and videos that sell each item. Move products through a clear enrichment workflow, from draft to enriched to reviewed and approved, so nothing reaches a shopper half-finished. Manage many languages and many channel-specific versions of the same product without duplicating work, and publish to marketplaces, storefronts, retailer feeds, and partner endpoints from a single approved master. When a destination rejects a listing, see why and fix it in one place instead of chasing errors across systems. The result is faster time to market, fewer listing errors, and consistent, on-brand product information everywhere you sell.",
};

type ModCopy = { id: number; code: string; tagline: string; description: string };
const moduleCopy: ModCopy[] = [
  {
    id: 141,
    code: "PIM-PRODUCT-CONTENT",
    tagline: "Author, enrich, and approve rich product content in one workspace.",
    description:
      "Build complete, accurate product records and keep them that way. Define the attributes and validation rules each product type needs, organize items into the taxonomies your channels expect, and manage size, color, and pack variants under a single parent. Take every product through a structured enrichment workflow, from draft through enrichment, review, and approval, so only complete, on-brand content moves forward. Manage translations for every market in step with the source content, so a product launches in all of its languages at once instead of trickling out market by market.",
  },
  {
    id: 142,
    code: "PIM-DIGITAL-ASSETS",
    tagline: "Manage the images, video, and rich media that bring products to life.",
    description:
      "Keep every image, video, 3D model, and document tied to the products they depict, with rights and usage metadata so you always know what you can publish where. Upload, review, and approve assets through a clear workflow, generate the renditions each channel needs, and deliver them from one managed source. No more hunting through shared folders for the latest hero shot or publishing an asset you do not have the rights to use.",
  },
  {
    id: 143,
    code: "PIM-SYNDICATION",
    tagline: "Publish approved products to every channel and fix rejections fast.",
    description:
      "Define each destination once: marketplaces, storefronts, retailer feeds, and datapools, with the field mapping and rules each one requires. Push approved products and their assets out on demand or on a schedule, then watch each publish run from queued through running to succeeded, partial, or failed. When a channel rejects a listing, see the exact reason and remediate it in one queue, so products stay live and sellable across every place you do business instead of silently dropping off a feed.",
  },
];

async function authorCatalogUX() {
  console.log("\n== 2. Catalog UX (Rule #20) ==");
  let n = 0;
  // domain
  const [dom] = await get("/domains?id=eq.167&select=catalog_tagline,catalog_description");
  const dBody: Row = {};
  if (!String(dom?.catalog_tagline ?? "").trim()) dBody.catalog_tagline = domainCopy.catalog_tagline;
  if (!String(dom?.catalog_description ?? "").trim())
    dBody.catalog_description = domainCopy.catalog_description;
  if (Object.keys(dBody).length) {
    await patch("/domains?id=eq.167", dBody);
    console.log(`  domain 167: wrote ${Object.keys(dBody).join(", ")}`);
    n++;
  } else {
    console.log("  domain 167: already populated, skip");
  }
  // modules
  const mods = await get(
    "/domain_modules?domain_id=eq.167&select=id,domain_module_code,catalog_tagline,catalog_description",
  );
  const modById = new Map(mods.map(m => [Number(m.id), m]));
  for (const mc of moduleCopy) {
    const live = modById.get(mc.id);
    if (!live) {
      console.log(`  WARN: module ${mc.code} (${mc.id}) not found live, skip`);
      continue;
    }
    const body: Row = {};
    if (!String(live.catalog_tagline ?? "").trim()) body.catalog_tagline = mc.tagline;
    if (!String(live.catalog_description ?? "").trim()) body.catalog_description = mc.description;
    if (Object.keys(body).length) {
      await patch(`/domain_modules?id=eq.${mc.id}`, body);
      console.log(`  module ${mc.code} (${mc.id}): wrote ${Object.keys(body).join(", ")}`);
      n++;
    } else {
      console.log(`  module ${mc.code} (${mc.id}): already populated, skip`);
    }
  }
  console.log(`  catalog UX rows updated: ${n}`);
  return n;
}

// ============================================================
async function main() {
  console.log("=== PIM state-driven Validate execute - 2026-06-07 ===");
  const counts = {
    entity_type: await classifyEntityTypes(),
    catalog_ux: await authorCatalogUX(),
  };
  console.log("\n== SUMMARY ==");
  console.log(JSON.stringify(counts, null, 2));
  console.log("\nUI links:");
  console.log(
    "  https://tests.semantius.app/domain_map/data_objects?id=in.(811,812,813,814,815,816,817,818)",
  );
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.167");
  console.log("  https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.167");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
