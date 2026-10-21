#!/usr/bin/env bun
// 2026-06-07 OMS state-driven Validate execute (SKILL.md Rule #21, bulk batch).
// Additive/corrective only; everything lands record_status='new' (or PATCH of empty/NULL fields).
// Idempotent: re-reads live before every write and skips work already done.
//
// OMS is an UNBUILT domain (0 domain_modules, 0 capability_domains; M1 hard fail).
// Per the HARD RULES, the build itself (B1A-S1 modules, B1A-S2 capabilities) is SURFACED,
// not scaffolded. Only execute the additive/corrective items that do NOT depend on modules
// and operate on data_objects / the domain row directly.
//
// Scope (EXECUTE-classified, module-independent items):
//   1. entity_type      : classify 5 OMS masters (entity_type unclassified -> Rule #12 enum)
//   2. Catalog UX (#20) : author empty catalog_tagline/description on domain 32 (no modules exist)
//   3. B1A-S6 (B11)     : insert data_object_aliases generic synonyms on the 5 OMS masters
//
// NOT touched here (surfaced / left to cascade):
//   - B1A-S1 / B1A-S2 / B1A-BUILD  : the build (gated by user decision B2-S4)
//   - B1A-S4 / B1A-S5              : data_object_relationships (not in execute allow-list; dependency-gated)
//   - B1A-S8                       : lifecycle_state domain_module_id PATCH (gated by B1A-S1)
//   - B1A-S9                       : skill_tools PATCH (RETIRED per 2026-06-06 supersession)
//   - B1A-S10                      : owed by other domains (report-only)
//   - all b2 (user decisions / destructive), all b3 (backlog)

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
const post = (path: string, body: Row[]) => call({ method: "POST", path, body });

// ============================================================
// 1. entity_type classification (Rule #12)
// ============================================================
// order_allocations     (424) operational_workflow : created -> ... -> released; 4 lifecycle states
// inventory_locations   (425) catalog              : config/reference node register, no workflow states
// sourcing_decisions    (426) operational_workflow : computed -> overridden -> fulfilled; 3 lifecycle states
// return_authorizations (427) operational_workflow : issued -> received -> approved -> ...; 6 states, single approver
// store_pickup_orders   (428) operational_workflow : created -> ready -> expired; 4 lifecycle states
const entityTypes: { id: number; name: string; entity_type: string }[] = [
  { id: 424, name: "order_allocations", entity_type: "operational_workflow" },
  { id: 425, name: "inventory_locations", entity_type: "catalog" },
  { id: 426, name: "sourcing_decisions", entity_type: "operational_workflow" },
  { id: 427, name: "return_authorizations", entity_type: "operational_workflow" },
  { id: 428, name: "store_pickup_orders", entity_type: "operational_workflow" },
];

async function classifyEntityTypes() {
  console.log("\n== 1. entity_type classification ==");
  const live = await get(
    "/data_objects?id=in.(424,425,426,427,428)&select=id,entity_type",
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
// 2. Catalog UX (Rule #20) - only writes EMPTY fields, never overwrites
//    Buyer-voice (workflow + value); no vendor names; no em-dash; American English.
//    Domain only: OMS has zero domain_modules, so there are no module rows to author.
// ============================================================
const domainCopy = {
  catalog_tagline:
    "Capture orders from any channel, route them to the right inventory node, and orchestrate everything from sourcing to returns in one place.",
  catalog_description:
    "Take in orders from web, store, marketplace, and call center, then decide how each one gets fulfilled. Rate-shop and source every line against the inventory you actually have, split shipments when that is cheaper or faster, and commit a delivery promise the customer can count on. One view shows where each order is, what is allocated, and what still needs attention.\n\nRun the omnichannel paths that buyers expect. Reserve stock for buy-online-pickup-in-store and curbside, hand pick lists to the right location, and keep the customer posted from confirmation to ready-for-pickup. When inventory shifts or an allocation fails, reroute the order instead of letting it stall.\n\nClose the loop after the sale. Issue return authorizations, route items back to the right node for inspection and restock, and trigger the refund and credit so finance, support, and the storefront all stay in sync. The payoff is fewer split-cost surprises, faster fulfillment, and orders that follow through from capture to return without falling through the cracks.",
};

async function authorCatalogUX() {
  console.log("\n== 2. Catalog UX (Rule #20) ==");
  let n = 0;
  const [dom] = await get(
    "/domains?id=eq.32&select=catalog_tagline,catalog_description",
  );
  const dBody: Row = {};
  if (!String(dom?.catalog_tagline ?? "").trim())
    dBody.catalog_tagline = domainCopy.catalog_tagline;
  if (!String(dom?.catalog_description ?? "").trim())
    dBody.catalog_description = domainCopy.catalog_description;
  if (Object.keys(dBody).length) {
    await patch("/domains?id=eq.32", dBody);
    console.log(`  domain 32: wrote ${Object.keys(dBody).join(", ")}`);
    n++;
  } else {
    console.log("  domain 32: already populated, skip");
  }
  console.log(`  catalog UX rows updated: ${n}`);
  return n;
}

// ============================================================
// 3. data_object_aliases (B1A-S6 / B11) - generic vendor synonyms, alias_type='synonym'
//    No vendor/product names (Rule #18); generic category nouns only.
//    Idempotent on (data_object_id, alias_name).
// ============================================================
const aliases: { data_object_id: number; alias_name: string }[] = [
  // order_allocations (424)
  { data_object_id: 424, alias_name: "Order Reservation" },
  { data_object_id: 424, alias_name: "Inventory Reservation" },
  { data_object_id: 424, alias_name: "Commitment" },
  { data_object_id: 424, alias_name: "Allocation Line" },
  // inventory_locations (425)
  { data_object_id: 425, alias_name: "Node" },
  { data_object_id: 425, alias_name: "Network Node" },
  { data_object_id: 425, alias_name: "Facility" },
  { data_object_id: 425, alias_name: "Fulfillment Node" },
  { data_object_id: 425, alias_name: "Dark Store" },
  // sourcing_decisions (426)
  { data_object_id: 426, alias_name: "Routing Decision" },
  { data_object_id: 426, alias_name: "Allocation Plan" },
  { data_object_id: 426, alias_name: "Fulfillment Plan" },
  { data_object_id: 426, alias_name: "Sourcing Trail" },
  // return_authorizations (427)
  { data_object_id: 427, alias_name: "RMA" },
  { data_object_id: 427, alias_name: "RA" },
  { data_object_id: 427, alias_name: "Return Order" },
  // store_pickup_orders (428)
  { data_object_id: 428, alias_name: "BOPIS Order" },
  { data_object_id: 428, alias_name: "Click and Collect" },
  { data_object_id: 428, alias_name: "Curbside Order" },
  { data_object_id: 428, alias_name: "In-Store Pickup" },
];

async function insertAliases() {
  console.log("\n== 3. data_object_aliases (B1A-S6 / B11) ==");
  const existing = await get(
    "/data_object_aliases?data_object_id=in.(424,425,426,427,428)&select=data_object_id,alias_name",
  );
  const seen = new Set(
    existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`),
  );
  const toInsert = aliases
    .filter(a => !seen.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`))
    .map(a => ({
      data_object_id: a.data_object_id,
      alias_name: a.alias_name,
      alias_type: "synonym",
    }));
  if (toInsert.length) {
    const CHUNK = 50;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      await post("/data_object_aliases", toInsert.slice(i, i + CHUNK));
    }
    for (const a of toInsert) console.log(`  +${a.data_object_id}  ${a.alias_name}`);
  } else {
    console.log("  all alias rows already present, nothing to insert");
  }
  console.log(`  aliases inserted: ${toInsert.length}`);
  return toInsert.length;
}

// ============================================================
async function main() {
  const counts = {
    entity_type: await classifyEntityTypes(),
    catalog_ux: await authorCatalogUX(),
    aliases: await insertAliases(),
  };
  console.log("\n== SUMMARY ==");
  console.log(JSON.stringify(counts, null, 2));
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(424,425,426,427,428)");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.32");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases?data_object_id=in.(424,425,426,427,428)");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
