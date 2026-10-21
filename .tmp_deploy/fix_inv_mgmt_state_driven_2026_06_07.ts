#!/usr/bin/env bun
// State-driven execute pass for INV-MGMT (domain 164), 2026-06-07.
// Works only the EXECUTE-classified open items in audits/INV-MGMT/state.yaml:
//   1. B1A-ENTITY-TYPE  PATCH entity_type on 10 INV masters (currently 'unclassified').
//   2. Catalog UX (Rule #20)  author catalog_tagline + catalog_description on the
//      INV-MGMT domain row + 3 modules (all currently empty strings).
//   3. B1A-S3  insert 1 new trigger_event (inv_kit.assembled) + 5 intra-domain handoffs.
// Idempotent: reads live before each write, inserts only what is missing, never
// overwrites a non-empty catalog value. record_status omitted (DB default 'new').
// No em-dashes, American English. cwd must be c:/dev/domain-map.

import { } from "bun";

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
// 1. entity_type classification (B1A-ENTITY-TYPE)
// ============================================================
const ENTITY_TYPES: Record<number, string> = {
  785: "catalog",              // inv_stock_items: SKU master, config-shape
  786: "catalog",              // inv_stock_locations: location master, config-shape
  787: "computed",             // inv_stock_balances: derived on-hand/allocated aggregate
  788: "operational_workflow", // inv_stock_movements: posted/reversed ledger gates
  789: "operational_workflow", // inv_stock_transfers: approved/reconciled gates
  790: "operational_workflow", // inv_cycle_counts: variance_review gate + approver
  791: "operational_record",   // inv_inventory_lots: tracked batch record, recall gate
  792: "operational_record",   // inv_serialized_units: tracked unit record, scrap gate
  793: "catalog",              // inv_reorder_rules: policy/config rule, config-shape
  794: "catalog",              // inv_kit_definitions: BOM definition, config-shape
};

async function fixEntityTypes() {
  console.log("\n== 1. entity_type classification ==");
  const ids = Object.keys(ENTITY_TYPES).map(Number);
  const live = await get(
    `/data_objects?id=in.(${ids.join(",")})&select=id,data_object_name,entity_type`,
  );
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const want = ENTITY_TYPES[id];
    const cur = String(r.entity_type ?? "");
    if (cur === "unclassified" || cur === "" || cur === "null") {
      await patch(`/data_objects?id=eq.${id}`, { entity_type: want });
      console.log(`  PATCH ${r.data_object_name} (${id}) -> ${want}`);
      patched++;
    } else if (cur !== want) {
      // Non-empty, non-unclassified existing value: never overwrite.
      console.log(`  SKIP ${r.data_object_name} (${id}) already '${cur}' (would-be '${want}', not overwriting)`);
    } else {
      console.log(`  OK   ${r.data_object_name} (${id}) already '${cur}'`);
    }
  }
  console.log(`  entity_type patched: ${patched}`);
}

// ============================================================
// 2. Catalog UX (Rule #20): domain + 3 modules
// ============================================================
type CatalogCopy = { tagline: string; description: string };

const DOMAIN_COPY: CatalogCopy = {
  tagline: "Know exactly what you have, where it is, and when to reorder.",
  description:
    "Run accurate multi-location stock control without the weight of a full warehouse or planning suite. Track every item, lot, and serial number across warehouses, branches, and bins; let reorder rules and ABC classification tell you what to buy before you run out; and keep the books honest with cycle counts, stock transfers, and movement reconciliation. Built for growing businesses that have outgrown spreadsheets but are not ready for enterprise WMS or MRP, so your team commits accurate promise dates, avoids dead stock, and closes the month with inventory that ties out.",
};

const MODULE_COPY: Record<string, CatalogCopy> = {
  "INV-CORE-STOCK": {
    tagline: "The accurate, auditable single source of truth for every item you hold.",
    description:
      "Establish the foundation of inventory control: items, locations, and live on-hand balances across every warehouse and bin. Capture each receipt, issue, adjustment, and transfer as a posted stock movement so balances are always defensible, and track lots and serial numbers for traceability, expiry, and recall. Run scheduled cycle counts to catch shrinkage early and reconcile variances before they reach the general ledger, giving operations and finance one trusted stock record they can both stand behind.",
  },
  "INV-REPLENISHMENT": {
    tagline: "Stop guessing what to buy. Let reorder rules and demand signals decide.",
    description:
      "Turn stock data into buying decisions. Set reorder points, safety stock, and supplier preferences per item and location, then let the system flag what to replenish the moment on-hand falls below threshold. Classify items by value and demand variability with ABC and XYZ analysis so attention goes where it matters, and surface accurate available-to-promise figures so sales commits dates it can keep. The result is fewer stockouts, less cash tied up in dead inventory, and replenishment that runs on rules instead of firefighting.",
  },
  "INV-KITTING": {
    tagline: "Sell bundles and build assemblies without losing track of components.",
    description:
      "Define kits and bundles once, then let component stock deplete automatically as kits are assembled or sold. Maintain finished-kit on-hand alongside raw components, explode bills of materials at order or production time, and post the resulting component-consumption movements straight into your stock record. Ideal for sellers shipping bundled SKUs and shops running light manufacturing, so bundle availability stays accurate and component counts never drift.",
  },
};

async function fixCatalogUX() {
  console.log("\n== 2. Catalog UX (Rule #20) ==");
  // Domain row
  const [dom] = await get(
    "/domains?id=eq.164&select=id,catalog_tagline,catalog_description",
  );
  const dTag = String(dom?.catalog_tagline ?? "");
  const dDesc = String(dom?.catalog_description ?? "");
  const domBody: Row = {};
  if (dTag === "") domBody.catalog_tagline = DOMAIN_COPY.tagline;
  if (dDesc === "") domBody.catalog_description = DOMAIN_COPY.description;
  if (Object.keys(domBody).length > 0) {
    await patch("/domains?id=eq.164", domBody);
    console.log(`  PATCH domain 164 catalog UX (${Object.keys(domBody).join(", ")})`);
  } else {
    console.log("  domain 164 catalog UX already populated, skip");
  }

  // Modules
  const mods = await get(
    "/domain_modules?domain_id=eq.164&select=id,domain_module_code,catalog_tagline,catalog_description&order=id",
  );
  let modPatched = 0;
  for (const m of mods) {
    const code = String(m.domain_module_code);
    const copy = MODULE_COPY[code];
    if (!copy) continue;
    const tag = String(m.catalog_tagline ?? "");
    const desc = String(m.catalog_description ?? "");
    const body: Row = {};
    if (tag === "") body.catalog_tagline = copy.tagline;
    if (desc === "") body.catalog_description = copy.description;
    if (Object.keys(body).length > 0) {
      await patch(`/domain_modules?id=eq.${m.id}`, body);
      console.log(`  PATCH module ${code} (${m.id}) catalog UX (${Object.keys(body).join(", ")})`);
      modPatched++;
    } else {
      console.log(`  module ${code} (${m.id}) catalog UX already populated, skip`);
    }
  }
  console.log(`  catalog UX rows touched: domain + ${modPatched} module(s)`);
}

// ============================================================
// 3. B1A-S3: new trigger_event + 5 intra-domain handoffs
// ============================================================
async function fixIntraDomainHandoffs() {
  console.log("\n== 3. B1A-S3 intra-domain handoffs ==");

  // 3a. Ensure inv_kit.assembled trigger_event exists.
  let kitEventId: number;
  const existingKit = await get(
    "/trigger_events?event_name=eq.inv_kit.assembled&select=id",
  );
  if (existingKit.length > 0) {
    kitEventId = Number(existingKit[0].id);
    console.log(`  trigger_event inv_kit.assembled already exists (id ${kitEventId})`);
  } else {
    const [created] = await post("/trigger_events", [
      {
        event_name: "inv_kit.assembled",
        data_object_id: 794, // inv_kit_definitions
        event_category: "lifecycle",
        from_state: "",
        to_state: "assembled",
        description:
          "A kit has been assembled from its component items. Triggers component-consumption stock movements so component on-hand depletes and finished-kit on-hand increases.",
        domain_module_id: 63, // INV-KITTING
      },
    ]);
    kitEventId = Number(created.id);
    console.log(`  INSERT trigger_event inv_kit.assembled -> id ${kitEventId}`);
  }

  // 3b. Intra-domain handoffs. source_domain_id = target_domain_id = 164.
  type HSpec = {
    source_module: number;
    target_module: number;
    data_object_id: number;
    trigger_event_id: number;
    description: string;
  };
  const specs: HSpec[] = [
    {
      // (a) REPLENISHMENT -> CORE-STOCK on movement posted (receipt posting propagation)
      source_module: 62,
      target_module: 61,
      data_object_id: 788, // inv_stock_movements
      trigger_event_id: 1478, // inv_stock_movement.posted
      description:
        "A replenishment receipt posts a stock movement; Core Stock applies it to on-hand balances so the item record reflects the inbound quantity.",
    },
    {
      // (b) CORE-STOCK -> REPLENISHMENT on below_reorder_point
      source_module: 61,
      target_module: 62,
      data_object_id: 785, // inv_stock_items
      trigger_event_id: 1199, // inv_stock_item.below_reorder_point
      description:
        "On-hand for an item-location pair falls below its reorder point; Replenishment evaluates reorder rules and raises a replenishment or transfer suggestion.",
    },
    {
      // (c) CORE-STOCK -> REPLENISHMENT on on_hand_changed
      source_module: 61,
      target_module: 62,
      data_object_id: 787, // inv_stock_balances
      trigger_event_id: 1200, // inv_stock_balance.on_hand_changed
      description:
        "A stock balance changes; Replenishment recomputes available-to-promise and reorder candidates so planning stays current.",
    },
    {
      // (d) KITTING -> CORE-STOCK on kit assembled (new event)
      source_module: 63,
      target_module: 61,
      data_object_id: 788, // inv_stock_movements (component-consumption posts)
      trigger_event_id: kitEventId, // inv_kit.assembled
      description:
        "A kit is assembled; Core Stock posts component-consumption movements so component on-hand depletes and finished-kit on-hand is maintained.",
    },
    {
      // (e) CORE-STOCK -> KITTING on balance allocated (kit reservations)
      source_module: 61,
      target_module: 63,
      data_object_id: 787, // inv_stock_balances
      trigger_event_id: 1201, // inv_stock_balance.allocated
      description:
        "Stock is allocated; Kitting sees component reservations so assembly availability reflects committed quantities.",
    },
  ];

  // Idempotency key matches the live generated `key` shape:
  //   source_domain.target_domain.source_module.target_module.trigger_event.data_object
  const live = await get(
    "/handoffs?source_domain_id=eq.164&target_domain_id=eq.164&select=trigger_event_id,data_object_id,source_domain_module_id,target_domain_module_id",
  );
  const liveSet = new Set(
    live.map(
      (r) =>
        `${r.source_domain_module_id}|${r.target_domain_module_id}|${r.trigger_event_id}|${r.data_object_id}`,
    ),
  );

  const toInsert = specs
    .filter(
      (s) =>
        !liveSet.has(
          `${s.source_module}|${s.target_module}|${s.trigger_event_id}|${s.data_object_id}`,
        ),
    )
    .map((s) => ({
      source_domain_id: 164,
      target_domain_id: 164,
      source_domain_module_id: s.source_module,
      target_domain_module_id: s.target_module,
      data_object_id: s.data_object_id,
      trigger_event_id: s.trigger_event_id,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      description: s.description,
      notes: "",
    }));

  if (toInsert.length > 0) {
    const created = await post("/handoffs", toInsert);
    console.log(`  INSERT ${created.length} intra-domain handoff(s):`);
    for (const c of created) console.log(`    handoff ${c.id}: ${c.handoff_label}`);
  } else {
    console.log("  all intra-domain handoffs already present, nothing to insert");
  }
}

// ============================================================
async function main() {
  await fixEntityTypes();
  await fixCatalogUX();
  await fixIntraDomainHandoffs();
  console.log("\n== DONE ==");
  console.log("UI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/domains");
  console.log("  https://tests.semantius.app/domain_map/domain_modules");
  console.log("  https://tests.semantius.app/domain_map/handoffs");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
}

await main();
