#!/usr/bin/env bun
// State-driven Validate execute for FARMER-DIRECT-SALES (domain id 158).
// Executes the two EXECUTE-class open state items:
//   1. B1A-ENTITY-TYPE: PATCH entity_type on the 9 FDS masters (currently unclassified) per Rule #12.
//   2. Rule #20 / A4 / M8 catalog UX: author buyer-voice catalog_tagline + catalog_description on the
//      domain row + 7 full modules + 1 starter, all currently empty.
//
// Idempotent: reads live first; only PATCHes a master whose entity_type is still unclassified/null,
// and only fills a catalog field that is still empty. Never overwrites a non-empty value.
// No em-dashes; American English. record_status untouched (PATCHes carry no status flip).

import { $ } from "bun";
$.throws(false);

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
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });

// ============================================================
// 1. entity_type classifications (Rule #12 enum)
// ============================================================
const ENTITY_TYPES: Record<number, string> = {
  514: "operational_workflow", // csa_memberships: draft->active->paused->cancelled->completed
  515: "operational_workflow", // csa_share_packs: planned->packed->out_for_delivery->delivered->missed
  516: "operational_workflow", // farmers_market_sales: open->paid->voided->reconciled (reconciliation flow)
  517: "operational_workflow", // wholesale_orders: draft->submitted->confirmed->fulfilled->invoiced->cancelled
  518: "operational_workflow", // delivery_routes: planned->dispatched->in_progress->completed
  519: "catalog",              // pickup_locations: reference/config site (operating hours, capacity)
  520: "operational_workflow", // butcher_orders: reserved->cut_sheet_*->processing->ready->delivered->cancelled
  521: "operational_workflow", // harvest_forecasts: draft->published->revised->actualized (publishing flow)
  522: "catalog",              // farm_storefronts: storefront configuration (catalog scope, pricing tiers)
};

// ============================================================
// 2. Catalog UX copy (Rule #20): buyer-voice, workflow + value, no vendor names, no em-dash.
// ============================================================
const DOMAIN_TAGLINE =
  "Sell every harvest direct, from CSA shares to the farmers market stall to wholesale chefs, on one farm-built platform.";
const DOMAIN_DESCRIPTION =
  "Run direct-to-consumer and farm-to-wholesale sales for a small or mid-scale farm without stitching together generic e-commerce, spreadsheets, and a card reader. Manage CSA memberships and weekly share customization, take payments at the market stall, route your own deliveries, and capture B2B orders from restaurants and food hubs, all tied back to what the field will actually yield. You see members, market days, wholesale buyers, and harvest forecasts in one place, so you can plan plantings against demand, cut packing-day chaos, and get paid across every channel you sell through.";

// module_id -> [tagline, description]
const MODULE_COPY: Record<number, [string, string]> = {
  118: [
    "Run your CSA from signup to the last share of the season without the spreadsheet juggling.",
    "Enroll members, take full-season or installment payments, and let subscribers manage their own swaps, pauses, and dietary preferences from a self-service portal. Compose each week's share, track who gets what, and keep billing and pickup choices in sync so packing day runs clean and members stay enrolled season after season.",
  ],
  119: [
    "Open a branded farm store online and on the farm, with pickup and delivery windows built in.",
    "Stand up an e-commerce storefront with member-only pricing tiers and gift cards, sell at the farmstand, and let customers choose pickup locations or delivery windows at checkout. Keep on-farm inventory and online catalog aligned so you never oversell, and turn every visitor into a repeat buyer without paying for a generic shopping cart that does not understand how a farm sells.",
  ],
  120: [
    "Plan tight delivery days that get every order to the door on time.",
    "Build optimized multi-stop routes for direct-to-consumer delivery, hand drivers a clear manifest, and send customers ETA notifications so they are home for the drop. Sequence stops to save fuel and hours, see which CSA shares, wholesale orders, and butcher pickups ride along on each route, and turn delivery from a daily scramble into a repeatable plan.",
  ],
  121: [
    "Ring up market-day sales fast and reconcile the till before you pack the truck.",
    "Take card, cash, and EBT-SNAP at the stall, capture SKU-level sales across every market you work, and reconcile the day's tender mix on the spot. Roll multi-market performance into one view so you know which markets, products, and days actually pay, and close out each market day without a shoebox of receipts.",
  ],
  122: [
    "Sell to chefs, restaurants, and food hubs with a wholesale catalog and clean order-to-invoice flow.",
    "Publish a wholesale catalog with buyer-specific pricing tiers, capture B2B orders, and move them from submitted to confirmed, fulfilled, and net-30 invoiced. Aggregate product across multiple farms and split producer payouts so a food hub can run on the same platform, giving the smallholder operator a wholesale channel that bills as cleanly as the storefront does.",
  ],
  123: [
    "Take whole, half, and quarter-animal pre-orders with deposits, cut sheets, and processor dates handled.",
    "Reserve animal shares, collect deposits and balances, and capture each customer's cut-sheet preferences before the animal goes to the processor. Coordinate the processing date and pickup, track every order from reserved through ready to delivered, and run whole-animal pre-sales without losing a deposit or a cut sheet in your inbox.",
  ],
  124: [
    "Forecast what the field will yield so you can sell shares and SKUs you can actually deliver.",
    "Project harvest by crop and field, translate yield into available shares and SKU planning, and publish member-facing previews of what is coming. Drive reserve lists and dynamic pricing from the forecast, revise as conditions change, and stop overselling or underplanting by matching demand across every channel to what the ground will produce.",
  ],
  172: [
    "Start a CSA in a day: memberships, weekly shares, pickups, and member billing in one lightweight kit.",
    "Run a single direct-to-member CSA channel without standing up the full platform. Enroll members, compose and fulfill weekly shares, coordinate pickup sites, and bill subscribers, all from a compact starter. When the operation grows into a storefront, routed delivery, wholesale, market days, or harvest forecasting, install the matching full modules and keep your data.",
  ],
};

// ============================================================
// RUN
// ============================================================
async function main() {
  // ---- 1. entity_type ----
  console.log("\n=== entity_type (B1A-ENTITY-TYPE) ===");
  const ids = Object.keys(ENTITY_TYPES).map(Number);
  const masters = await get(
    `/data_objects?id=in.(${ids.join(",")})&select=id,data_object_name,entity_type`,
  );
  let etPatched = 0;
  for (const m of masters) {
    const id = Number(m.id);
    const target = ENTITY_TYPES[id];
    const current = m.entity_type;
    if (current === "unclassified" || current === null) {
      await patch(`/data_objects?id=eq.${id}`, { entity_type: target });
      console.log(`  PATCH ${m.data_object_name} (${id}): ${current} -> ${target}`);
      etPatched++;
    } else {
      console.log(`  skip ${m.data_object_name} (${id}): already '${current}'`);
    }
  }
  console.log(`  entity_type PATCHes: ${etPatched}`);

  // ---- 2. domain catalog UX ----
  console.log("\n=== domain catalog UX (Rule #20 / A4) ===");
  const [domain] = await get(
    "/domains?id=eq.158&select=id,catalog_tagline,catalog_description",
  );
  const domainBody: Row = {};
  if (!domain.catalog_tagline) domainBody.catalog_tagline = DOMAIN_TAGLINE;
  if (!domain.catalog_description) domainBody.catalog_description = DOMAIN_DESCRIPTION;
  if (Object.keys(domainBody).length > 0) {
    await patch("/domains?id=eq.158", domainBody);
    console.log(`  PATCH domain 158: ${Object.keys(domainBody).join(", ")}`);
  } else {
    console.log("  domain 158: catalog fields already populated, skip");
  }

  // ---- 3. module catalog UX (M8) ----
  console.log("\n=== module catalog UX (Rule #20 / M8) ===");
  const moduleIds = Object.keys(MODULE_COPY).map(Number);
  const modules = await get(
    `/domain_modules?id=in.(${moduleIds.join(",")})&select=id,domain_module_code,catalog_tagline,catalog_description`,
  );
  let modTagline = 0;
  let modDesc = 0;
  for (const mod of modules) {
    const id = Number(mod.id);
    const [tagline, description] = MODULE_COPY[id];
    const body: Row = {};
    if (!mod.catalog_tagline) {
      body.catalog_tagline = tagline;
      modTagline++;
    }
    if (!mod.catalog_description) {
      body.catalog_description = description;
      modDesc++;
    }
    if (Object.keys(body).length > 0) {
      await patch(`/domain_modules?id=eq.${id}`, body);
      console.log(`  PATCH ${mod.domain_module_code} (${id}): ${Object.keys(body).join(", ")}`);
    } else {
      console.log(`  skip ${mod.domain_module_code} (${id}): catalog fields already populated`);
    }
  }
  console.log(`  module taglines filled: ${modTagline}; module descriptions filled: ${modDesc}`);

  // ---- verification ----
  console.log("\n=== verification ===");
  const verifyMasters = await get(
    `/data_objects?id=in.(${ids.join(",")})&entity_type=eq.unclassified&select=id`,
  );
  console.log(`  masters still unclassified: ${verifyMasters.length} (expect 0)`);
  const verifyDomain = await get(
    "/domains?id=eq.158&catalog_tagline=eq.&select=id",
  );
  console.log(`  domain empty tagline rows: ${verifyDomain.length} (expect 0)`);
  const verifyMods = await get(
    `/domain_modules?id=in.(${moduleIds.join(",")})&catalog_tagline=eq.&select=id`,
  );
  console.log(`  modules empty tagline rows: ${verifyMods.length} (expect 0)`);
}

await main();
console.log("\nDone.");
