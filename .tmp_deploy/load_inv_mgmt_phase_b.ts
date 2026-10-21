#!/usr/bin/env bun
// INV-MGMT Phase B (data-object footprint).
//
// Loads:
//   - 10 new inv_* data_objects (with pattern flags + config-shape exemption notes)
//   - 23 domain_module_data_objects rows (across INV-CORE-STOCK, INV-REPLENISHMENT, INV-KITTING)
//   - domain_data_objects rollup (derived from module-level junction, strongest role wins)
//   - 9 trigger_events (recall fans out to 2 subscribers sharing one event id)
//   - 10 cross_domain_handoffs (outbound from INV-MGMT)
//   - ~27 data_object_relationships (intra + users + cross-domain payload->target)
//   - ~24 data_object_aliases
//   - ~18 data_object_lifecycle_states across 5 workflow-shaped masters
//
// Idempotent. record_status defaults to "new" by omission.

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const json = JSON.stringify(body);
  // Pass inline as CLI arg; safe under Windows 32KB command-line limit for our chunk sizes.
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", json], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const exit = await proc.exited;
  if (exit !== 0) throw new Error(`semantius call failed (exit ${exit}, payload ${json.length}B): ${stderr}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
async function get(path: string): Promise<Row[]> { return call({ method: "GET", path }); }
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 1;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    try {
      const result = await call({ method: "POST", path, body: slice });
      out.push(...result);
    } catch (e) {
      console.error(`  insert chunk ${i} failed. Body keys: ${JSON.stringify(slice[0] && Object.keys(slice[0]))}; first row preview: ${JSON.stringify(slice[0]).slice(0, 300)}`);
      throw e;
    }
  }
  return out;
}

// =============================================================
// Anchors
// =============================================================
const INV_MGMT_ID = 164;
const MODULES = { CORE: 61, REPL: 62, KIT: 63 };
const ADJ = { OMS: 32, B2C: 71, S2P: 27, MFG: 47, ERP_FIN: 65, CSM: 30, GRC: 15 };

// Existing platform / adjacent-domain data_object ids
const X = {
  commerce_products: 384,   // B2C-COMM master
  inventory_locations: 425, // OMS master
  goods_receipts: 74,       // S2P master
  commerce_orders: 381,     // B2C-COMM master
  commerce_shipments: 389,  // B2C-COMM master
  production_orders: 595,   // MFG-OPS master
  suppliers: 206,           // SUP-LIFE master
  purchase_orders: 73,      // S2P master
  fulfillments: 388,        // B2C-COMM master
  order_allocations: 424,   // OMS master
  users: 748,               // platform_builtin
};

// =============================================================
// Step 1: data_objects (10 new INV-MGMT masters)
// =============================================================
async function step1_dataObjects(): Promise<Map<string, number>> {
  console.log("\n=== Step 1: data_objects ===");
  const newDOs = [
    {
      data_object_name: "inv_stock_items",
      singular_label: "Stock Item",
      plural_label: "Stock Items",
      description: "Inventory-scoped item record: SKU, unit of measure, lot/serial-controlled flag, ABC/XYZ class, default cost method (FIFO, LIFO, weighted-average), weight, and dimensions. INV-MGMT-mastered for standalone deployments; embedded-masters `commerce_products` when B2C-COMM is canonical.",
      kind: "domain_owned",
      notes: "Config-shape master. SKU is created and edited inline through admin UI. No per-state permissions needed beyond create/edit/delete; lifecycle states are not modeled per Rule #12 config-shape exemption.",
    },
    {
      data_object_name: "inv_stock_locations",
      singular_label: "Stock Location",
      plural_label: "Stock Locations",
      description: "INV-MGMT's finer-grain location catalog: warehouse, store, bin, zone, or hub. Defers to OMS `inventory_locations` (canonical) when present; deployable standalone otherwise.",
      kind: "domain_owned",
      notes: "Config-shape master. Locations are authored once and edited rarely; no workflow.",
    },
    {
      data_object_name: "inv_stock_balances",
      singular_label: "Stock Balance",
      plural_label: "Stock Balances",
      description: "Per-item by per-location quantity record: on_hand, reserved, in_transit, available_for_allocation. Real-time maintained by stock_movements; not directly edited.",
      kind: "domain_owned",
      notes: "Derived state, not workflow. Maintained by `inv_stock_movements` posting; no lifecycle states modeled.",
    },
    {
      data_object_name: "inv_stock_movements",
      singular_label: "Stock Movement",
      plural_label: "Stock Movements",
      description: "Append-only event ledger of inventory transactions: receipt, issue, transfer-in, transfer-out, adjustment-positive, adjustment-negative. Underlies stock_balances; posted movements are immutable.",
      kind: "domain_owned",
      has_submit_lock: true,
      notes: "Submit-lock applies: a posted movement is immutable; reversal is a new compensating movement, not an edit.",
    },
    {
      data_object_name: "inv_stock_transfers",
      singular_label: "Stock Transfer",
      plural_label: "Stock Transfers",
      description: "Inter-location transfer header with lines: source location, destination location, requested-by user, status (requested, approved, in_transit, received, discrepancy, reconciled), expected arrival date.",
      kind: "domain_owned",
    },
    {
      data_object_name: "inv_cycle_counts",
      singular_label: "Cycle Count",
      plural_label: "Cycle Counts",
      description: "Scheduled or ad-hoc inventory count session: location, item-filter scope (ABC class, last-counted-before, all), assigned counter, status (scheduled, counting, variance_review, posted), per-line variances.",
      kind: "domain_owned",
      has_submit_lock: true,
      has_single_approver: true,
      notes: "Single-approver pattern: variance review is gated by a designated approver who signs off on the adjustment before posting.",
    },
    {
      data_object_name: "inv_inventory_lots",
      singular_label: "Inventory Lot",
      plural_label: "Inventory Lots",
      description: "INV-MGMT-scoped lot or batch identifier: lot_code, item, supplier, manufacture_date, expiry_date, originating receipt. Distinct from FDS `traceability_lots` (FSMA-204 food-traceability scope).",
      kind: "domain_owned",
    },
    {
      data_object_name: "inv_serialized_units",
      singular_label: "Serialized Unit",
      plural_label: "Serialized Units",
      description: "Individually-tracked unit with a unique serial: item, current location, current status (in_stock, reserved, issued, returned, scrapped), warranty_start.",
      kind: "domain_owned",
    },
    {
      data_object_name: "inv_reorder_rules",
      singular_label: "Reorder Rule",
      plural_label: "Reorder Rules",
      description: "Item by location replenishment policy: reorder_point, reorder_quantity, safety_stock, lead_time_days, preferred_supplier, auto_generate_po flag.",
      kind: "domain_owned",
      notes: "Config-shape master. Authored by inventory planners; no workflow gates.",
    },
    {
      data_object_name: "inv_kit_definitions",
      singular_label: "Kit Definition",
      plural_label: "Kit Definitions",
      description: "Bill-of-kit for sellable bundles: parent item, list of component items with quantities, assembly_required flag (vs. explode-at-order).",
      kind: "domain_owned",
      notes: "Config-shape master. Kit BOMs are authored by merchandisers; no workflow.",
    },
  ];

  const existing = await get(`/data_objects?data_object_name=in.(${newDOs.map(d => d.data_object_name).join(",")})&select=id,data_object_name`);
  const existingNames = new Set(existing.map(r => String(r.data_object_name)));
  const missing = newDOs.filter(d => !existingNames.has(d.data_object_name));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new data_objects`);
    await insert("/data_objects", missing);
  } else {
    console.log(`  ${newDOs.length} already present`);
  }
  const all = await get(`/data_objects?data_object_name=in.(${newDOs.map(d => d.data_object_name).join(",")})&select=id,data_object_name`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r.data_object_name), Number(r.id));
  return map;
}

// =============================================================
// Step 2: domain_module_data_objects (23 rows)
// =============================================================
async function step2_moduleDOs(invDO: Map<string, number>) {
  console.log("\n=== Step 2: domain_module_data_objects ===");

  type Entry = { module: number; doName?: string; doId?: number; role: "master" | "embedded_master" | "contributor" | "consumer" | "derived"; necessity: "required" | "optional"; notes?: string };
  const entries: Entry[] = [
    // INV-CORE-STOCK — own masters
    { module: MODULES.CORE, doName: "inv_stock_items",      role: "master", necessity: "required" },
    { module: MODULES.CORE, doName: "inv_stock_locations",  role: "master", necessity: "required" },
    { module: MODULES.CORE, doName: "inv_stock_balances",   role: "master", necessity: "required" },
    { module: MODULES.CORE, doName: "inv_stock_movements",  role: "master", necessity: "required" },
    { module: MODULES.CORE, doName: "inv_stock_transfers",  role: "master", necessity: "required" },
    { module: MODULES.CORE, doName: "inv_cycle_counts",     role: "master", necessity: "required" },
    { module: MODULES.CORE, doName: "inv_inventory_lots",   role: "master", necessity: "required" },
    { module: MODULES.CORE, doName: "inv_serialized_units", role: "master", necessity: "required" },
    // INV-CORE-STOCK — cross-domain dependencies
    { module: MODULES.CORE, doId: X.commerce_products,    role: "embedded_master", necessity: "required",
      notes: "INV-MGMT point-solution vendors hold their own item catalog when no PIM/B2C-COMM is deployed. Demotes to consumer in a holistic deployment with B2C-COMM present." },
    { module: MODULES.CORE, doId: X.inventory_locations,  role: "embedded_master", necessity: "required",
      notes: "Local location catalog when no OMS is deployed. Defers to OMS canonical when present." },
    { module: MODULES.CORE, doId: X.goods_receipts,       role: "consumer",        necessity: "required",
      notes: "Receipt postings from S2P drive inbound stock_movements." },

    // INV-REPLENISHMENT — own master
    { module: MODULES.REPL, doName: "inv_reorder_rules", role: "master", necessity: "required" },
    // INV-REPLENISHMENT — consumes core
    { module: MODULES.REPL, doName: "inv_stock_balances", role: "consumer", necessity: "required",
      notes: "Read for reorder-trigger evaluation and ATP calculation." },
    { module: MODULES.REPL, doName: "inv_stock_items",    role: "consumer", necessity: "required",
      notes: "Read for ABC/XYZ class and cost method." },
    // INV-REPLENISHMENT — cross-domain dependencies
    { module: MODULES.REPL, doId: X.purchase_orders,    role: "consumer", necessity: "required",
      notes: "Reads pending and open POs to know what is already on order." },
    { module: MODULES.REPL, doId: X.suppliers,          role: "consumer", necessity: "required",
      notes: "Preferred supplier per item drives PO suggestion." },
    { module: MODULES.REPL, doId: X.commerce_orders,    role: "consumer", necessity: "required",
      notes: "Demand input for ATP calculation." },
    { module: MODULES.REPL, doId: X.order_allocations,  role: "consumer", necessity: "required",
      notes: "Reserved quantity for ATP calculation." },

    // INV-KITTING — own master
    { module: MODULES.KIT, doName: "inv_kit_definitions", role: "master", necessity: "required" },
    // INV-KITTING — consumes core
    { module: MODULES.KIT, doName: "inv_stock_items",    role: "consumer",    necessity: "required",
      notes: "Component item lookup for kit explosion." },
    { module: MODULES.KIT, doName: "inv_stock_balances", role: "consumer",    necessity: "required",
      notes: "Component on-hand check before kit explosion." },
    { module: MODULES.KIT, doName: "inv_stock_movements", role: "contributor", necessity: "required",
      notes: "Writes kit-explosion movements (component issue + finished-kit receipt)." },
    // INV-KITTING — cross-domain
    { module: MODULES.KIT, doId: X.commerce_orders,    role: "consumer", necessity: "required",
      notes: "Kit explosion is triggered when a kit SKU is ordered." },
    { module: MODULES.KIT, doId: X.production_orders,  role: "consumer", necessity: "optional",
      notes: "When light-manufacturing flavor is enabled; MFG-OPS is canonical for full production." },
  ];

  // Resolve doName -> id
  const rows: Row[] = entries.map(e => {
    const doId = e.doId ?? invDO.get(e.doName!);
    if (!doId) throw new Error(`Cannot resolve data_object id for ${JSON.stringify(e)}`);
    return { domain_module_id: e.module, data_object_id: doId, role: e.role, necessity: e.necessity, notes: e.notes ?? "" };
  });

  const existing = await get(`/domain_module_data_objects?domain_module_id=in.(${Object.values(MODULES).join(",")})&select=domain_module_id,data_object_id`);
  const existingKeys = new Set(existing.map(r => `${r.domain_module_id}:${r.data_object_id}`));
  const missing = rows.filter(r => !existingKeys.has(`${r.domain_module_id}:${r.data_object_id}`));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new domain_module_data_objects (${existing.length} existed)`);
    await insert("/domain_module_data_objects", missing);
  } else {
    console.log(`  all ${rows.length} present`);
  }
}

// =============================================================
// Step 3: domain_data_objects rollup
//   Derive from domain_module_data_objects: strongest role wins per data_object.
// =============================================================
async function step3_rollup() {
  console.log("\n=== Step 3: domain_data_objects rollup ===");
  const moduleRows = await get(`/domain_module_data_objects?domain_module_id=in.(${Object.values(MODULES).join(",")})&select=data_object_id,role,necessity`);
  const roleRank: Record<string, number> = { master: 5, embedded_master: 4, contributor: 3, consumer: 2, derived: 1 };

  const best = new Map<number, { role: string; necessity: string }>();
  for (const r of moduleRows) {
    const id = Number(r.data_object_id);
    const role = String(r.role);
    const necessity = String(r.necessity);
    const cur = best.get(id);
    if (!cur || roleRank[role] > roleRank[cur.role]) {
      best.set(id, { role, necessity });
    } else if (roleRank[role] === roleRank[cur.role] && necessity === "required" && cur.necessity === "optional") {
      best.set(id, { role, necessity });
    }
  }

  const existing = await get(`/domain_data_objects?domain_id=eq.${INV_MGMT_ID}&select=data_object_id,role,necessity`);
  const existingMap = new Map<number, { role: string; necessity: string }>();
  for (const r of existing) existingMap.set(Number(r.data_object_id), { role: String(r.role), necessity: String(r.necessity) });

  const toInsert: Row[] = [];
  for (const [doId, v] of best) {
    if (!existingMap.has(doId)) {
      toInsert.push({ domain_id: INV_MGMT_ID, data_object_id: doId, role: v.role, necessity: v.necessity });
    }
  }
  if (toInsert.length > 0) {
    console.log(`  inserting ${toInsert.length} rollup rows`);
    await insert("/domain_data_objects", toInsert);
  } else {
    console.log(`  rollup already complete`);
  }
}

// =============================================================
// Step 4: trigger_events (9)
// =============================================================
async function step4_triggerEvents(invDO: Map<string, number>): Promise<Map<string, number>> {
  console.log("\n=== Step 4: trigger_events ===");
  const events = [
    { event_name: "inv_stock_item.below_reorder_point", event_category: "threshold",    data_object_id: invDO.get("inv_stock_items")!,      domain_module_id: MODULES.REPL, from_state: "",       to_state: "below_rop",
      description: "Stock-on-hand for an item-location pair has fallen below its configured reorder point. Triggers replenishment suggestion against the preferred supplier (or transfer suggestion against a sister warehouse)." },
    { event_name: "inv_stock_balance.on_hand_changed",  event_category: "state_change", data_object_id: invDO.get("inv_stock_balances")!,   domain_module_id: MODULES.CORE, from_state: "",       to_state: "",
      description: "Any net change to on_hand quantity for an item-location pair: receipt, issue, transfer, or adjustment. High-frequency event consumed by OMS for ATP refresh." },
    { event_name: "inv_stock_balance.allocated",         event_category: "state_change", data_object_id: invDO.get("inv_stock_balances")!,   domain_module_id: MODULES.CORE, from_state: "available", to_state: "reserved",
      description: "On-hand quantity has been reserved against a sales order or pending fulfillment. Drives the available_for_allocation column down." },
    { event_name: "inv_cycle_count.variance_posted",     event_category: "state_change", data_object_id: invDO.get("inv_cycle_counts")!,     domain_module_id: MODULES.CORE, from_state: "variance_review", to_state: "posted",
      description: "Cycle count variance has been reviewed, approved, and posted as inventory adjustment movements. Drives a GL journal in ERP-FIN for inventory revaluation." },
    { event_name: "inv_stock_transfer.received",         event_category: "state_change", data_object_id: invDO.get("inv_stock_transfers")!,  domain_module_id: MODULES.CORE, from_state: "in_transit", to_state: "received",
      description: "Inter-location transfer has been received at destination. May trigger an inter-company cost move in ERP-FIN when the locations belong to different legal entities." },
    { event_name: "inv_inventory_lot.expiry_warning",    event_category: "threshold",    data_object_id: invDO.get("inv_inventory_lots")!,   domain_module_id: MODULES.CORE, from_state: "active", to_state: "expiry_warning",
      description: "Lot is approaching its configured expiry threshold. Triggers proactive customer communication for perishable goods or controlled-substance compliance signaling." },
    { event_name: "inv_inventory_lot.recall_initiated",  event_category: "lifecycle",    data_object_id: invDO.get("inv_inventory_lots")!,   domain_module_id: MODULES.CORE, from_state: "",       to_state: "recalled",
      description: "Lot has been flagged for recall (supplier defect, contamination, regulatory notice). Fans out to customer service for shipped-lot tracing and to compliance for regulatory evidence." },
    { event_name: "inv_serialized_unit.warranty_activated", event_category: "lifecycle", data_object_id: invDO.get("inv_serialized_units")!, domain_module_id: MODULES.CORE, from_state: "in_stock", to_state: "issued",
      description: "Serialized unit has been issued (sold or installed) and its warranty start date has been registered. Triggers warranty registration in CSM." },
    { event_name: "inv_stock_item.created",              event_category: "lifecycle",    data_object_id: invDO.get("inv_stock_items")!,      domain_module_id: MODULES.CORE, from_state: "",       to_state: "active",
      description: "New SKU has been authored in the inventory catalog. Syncs to storefront-facing PIM-like catalogs (B2C-COMM) for product publication." },
  ];

  const existing = await get(`/trigger_events?event_name=in.(${events.map(e => e.event_name).join(",")})&select=id,event_name`);
  const existingNames = new Set(existing.map(r => String(r.event_name)));
  const missing = events.filter(e => !existingNames.has(e.event_name));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new trigger_events`);
    await insert("/trigger_events", missing);
  } else {
    console.log(`  all ${events.length} present`);
  }
  const all = await get(`/trigger_events?event_name=in.(${events.map(e => e.event_name).join(",")})&select=id,event_name`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r.event_name), Number(r.id));
  return map;
}

// =============================================================
// Step 5: cross_domain_handoffs (10 outbound)
// =============================================================
async function step5_handoffs(events: Map<string, number>) {
  console.log("\n=== Step 5: cross_domain_handoffs ===");
  type H = { eventName: string; target: number; pattern: string; friction: string; payload: number; sourceModule: number; description: string; notes?: string };
  const hs: H[] = [
    { eventName: "inv_stock_item.below_reorder_point", target: ADJ.S2P,    pattern: "api_call",    friction: "high",   payload: X.purchase_orders, sourceModule: MODULES.REPL,
      description: "INV-MGMT publishes a replenishment signal; S2P is expected to raise a purchase requisition (or auto-PO if configured). Failure mode: alert without ack, no retry policy.",
      notes: "Shape: alert-without-feedback-loop. INV publishes the alert; no confirmation that the PO was raised. Manual follow-up when missed." },
    { eventName: "inv_stock_balance.on_hand_changed",  target: ADJ.OMS,    pattern: "event_stream", friction: "medium", payload: X.order_allocations, sourceModule: MODULES.CORE,
      description: "High-frequency push of on_hand deltas to OMS so ATP recalculates and order allocations refresh. Volume is the dominant operational concern.",
      notes: "" },
    { eventName: "inv_stock_balance.allocated",        target: ADJ.OMS,    pattern: "event_stream", friction: "medium", payload: X.order_allocations, sourceModule: MODULES.CORE,
      description: "Reservation event when an order line locks inventory; OMS updates the order allocation record and reduces available_for_allocation.",
      notes: "" },
    { eventName: "inv_cycle_count.variance_posted",    target: ADJ.ERP_FIN, pattern: "api_call",    friction: "high",   payload: 0,                 sourceModule: MODULES.CORE,
      description: "Posted variance from a cycle count needs to land as an inventory adjustment journal in ERP-FIN.",
      notes: "Shape: cross-vendor-stack (INV and GL frequently different vendors) plus period-cycle-close coupling (backdated entries arriving after close cascade)." },
    { eventName: "inv_stock_transfer.received",        target: ADJ.ERP_FIN, pattern: "api_call",    friction: "medium", payload: 0,                 sourceModule: MODULES.CORE,
      description: "Inter-location transfer receipt triggers an inter-company or inter-warehouse cost move journal.",
      notes: "Shape: cross-vendor-stack." },
    { eventName: "inv_inventory_lot.expiry_warning",   target: ADJ.CSM,    pattern: "api_call",    friction: "high",   payload: 0,                 sourceModule: MODULES.CORE,
      description: "Pending-expiry alert for perishable lots; CSM uses this to proactively notify customers of soon-to-expire shipments.",
      notes: "Shape: probabilistic signal becomes deterministic action. Threshold is subjective; false-positive volume is the failure mode." },
    { eventName: "inv_inventory_lot.recall_initiated", target: ADJ.CSM,    pattern: "api_call",    friction: "high",   payload: 0,                 sourceModule: MODULES.CORE,
      description: "Recall trigger; CSM traces shipped lots to affected customers and initiates outreach.",
      notes: "Shape: leaver / cancellation recall (going-away is harder than arriving). Fan-out to CSM and GRC shares one trigger_event." },
    { eventName: "inv_inventory_lot.recall_initiated", target: ADJ.GRC,    pattern: "api_call",    friction: "high",   payload: 0,                 sourceModule: MODULES.CORE,
      description: "Recall evidence for compliance: regulator filings (FDA recall classification), ISO traceability audit trail, supplier notification.",
      notes: "Shape: leaver / cancellation recall. Second subscriber on same trigger_event." },
    { eventName: "inv_serialized_unit.warranty_activated", target: ADJ.CSM, pattern: "api_call",   friction: "low",    payload: 0,                 sourceModule: MODULES.CORE,
      description: "Issued serialized unit registers warranty start in CSM for future claim handling.",
      notes: "" },
    { eventName: "inv_stock_item.created",             target: ADJ.B2C,    pattern: "api_call",    friction: "medium", payload: X.commerce_products, sourceModule: MODULES.CORE,
      description: "New SKU sync to storefront-facing catalog; B2C-COMM creates or updates the `commerce_products` record.",
      notes: "" },
  ];

  // Resolve payload=0 to the appropriate INV master id (recall payload = inv_inventory_lots, etc.)
  const invDOs = await get(`/data_objects?data_object_name=in.(inv_cycle_counts,inv_stock_transfers,inv_inventory_lots,inv_serialized_units)&select=id,data_object_name`);
  const invDOMap = new Map<string, number>();
  for (const r of invDOs) invDOMap.set(String(r.data_object_name), Number(r.id));
  const eventToPayloadDoName: Record<string, string> = {
    "inv_cycle_count.variance_posted": "inv_cycle_counts",
    "inv_stock_transfer.received": "inv_stock_transfers",
    "inv_inventory_lot.expiry_warning": "inv_inventory_lots",
    "inv_inventory_lot.recall_initiated": "inv_inventory_lots",
    "inv_serialized_unit.warranty_activated": "inv_serialized_units",
  };
  for (const h of hs) {
    if (h.payload === 0) {
      const name = eventToPayloadDoName[h.eventName];
      if (!name) throw new Error(`Cannot resolve payload for ${h.eventName}`);
      h.payload = invDOMap.get(name)!;
    }
  }

  const rows: Row[] = hs.map(h => {
    const eid = events.get(h.eventName);
    if (!eid) throw new Error(`Unknown trigger_event ${h.eventName}`);
    return {
      source_domain_id: INV_MGMT_ID,
      target_domain_id: h.target,
      data_object_id: h.payload,
      trigger_event_id: eid,
      integration_pattern: h.pattern,
      friction_level: h.friction,
      source_domain_module_id: h.sourceModule,
      // target_domain_module_id left NULL; adjacent domains aren't modularized yet.
      description: h.description,
      notes: h.notes ?? "",
    };
  });

  // Idempotency: (source, target, trigger_event_id, data_object_id) is the natural key
  const existing = await get(`/cross_domain_handoffs?source_domain_id=eq.${INV_MGMT_ID}&select=target_domain_id,trigger_event_id,data_object_id`);
  const existingKeys = new Set(existing.map(r => `${r.target_domain_id}:${r.trigger_event_id}:${r.data_object_id}`));
  const missing = rows.filter(r => !existingKeys.has(`${r.target_domain_id}:${r.trigger_event_id}:${r.data_object_id}`));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} handoffs (${existing.length} existed)`);
    await insert("/cross_domain_handoffs", missing);
  } else {
    console.log(`  all ${rows.length} present`);
  }
}

// =============================================================
// Step 6: data_object_relationships
// =============================================================
async function step6_relationships(invDO: Map<string, number>) {
  console.log("\n=== Step 6: data_object_relationships ===");
  const D = (name: string) => invDO.get(name)!;

  type R = { src: number; tgt: number; verb: string; inv: string; type: "one_to_many" | "one_to_one" | "many_to_many"; kind: "reference" | "composition" | "association"; required: boolean; owner: "source" | "target"; notes: string };
  const rs: R[] = [
    // ---------- Intra-domain ----------
    { src: D("inv_stock_balances"),   tgt: D("inv_stock_items"),     verb: "balance_of",     inv: "has_balance",        type: "one_to_many", kind: "reference",   required: true,  owner: "target",
      notes: "intra | INV-MGMT | per-item-per-location balance row" },
    { src: D("inv_stock_balances"),   tgt: D("inv_stock_locations"), verb: "located_at",     inv: "holds_balances",     type: "one_to_many", kind: "reference",   required: true,  owner: "target",
      notes: "intra | INV-MGMT | balance is anchored to a location" },
    { src: D("inv_stock_movements"),  tgt: D("inv_stock_items"),     verb: "moves",          inv: "is_moved_by",        type: "one_to_many", kind: "reference",   required: true,  owner: "target",
      notes: "intra | INV-MGMT | movement always references an item" },
    { src: D("inv_stock_movements"),  tgt: D("inv_stock_locations"), verb: "from_or_to",     inv: "movements",          type: "one_to_many", kind: "reference",   required: true,  owner: "target",
      notes: "intra | INV-MGMT | movement has from-location or to-location (both columns; one row representing the relation)" },
    { src: D("inv_stock_movements"),  tgt: D("inv_inventory_lots"),  verb: "for_lot",        inv: "has_movements",      type: "one_to_many", kind: "reference",   required: false, owner: "target",
      notes: "intra | INV-MGMT | optional lot ref on lot-tracked items" },
    { src: D("inv_stock_movements"),  tgt: D("inv_serialized_units"), verb: "for_serial",    inv: "has_movements",      type: "one_to_many", kind: "reference",   required: false, owner: "target",
      notes: "intra | INV-MGMT | optional serial ref on serialized items" },
    { src: D("inv_stock_transfers"),  tgt: D("inv_stock_movements"), verb: "consists_of",    inv: "belongs_to_transfer", type: "one_to_many", kind: "composition", required: true,  owner: "source",
      notes: "intra | INV-MGMT | transfer header to line-movements; cascade-delete shape" },
    { src: D("inv_cycle_counts"),     tgt: D("inv_stock_movements"), verb: "produces",       inv: "produced_by_count",  type: "one_to_many", kind: "composition", required: true,  owner: "source",
      notes: "intra | INV-MGMT | posted count produces adjustment movements" },
    { src: D("inv_cycle_counts"),     tgt: D("inv_stock_locations"), verb: "counts",         inv: "has_counts",         type: "one_to_many", kind: "reference",   required: true,  owner: "target",
      notes: "intra | INV-MGMT | count session scoped to one location" },
    { src: D("inv_inventory_lots"),   tgt: D("inv_stock_items"),     verb: "of_item",        inv: "has_lots",           type: "one_to_many", kind: "reference",   required: true,  owner: "target",
      notes: "intra | INV-MGMT | lot belongs to an item" },
    { src: D("inv_serialized_units"), tgt: D("inv_stock_items"),     verb: "of_item",        inv: "has_serials",        type: "one_to_many", kind: "reference",   required: true,  owner: "target",
      notes: "intra | INV-MGMT | serial belongs to an item" },
    { src: D("inv_serialized_units"), tgt: D("inv_stock_locations"), verb: "located_at",     inv: "holds_serials",      type: "one_to_many", kind: "reference",   required: true,  owner: "target",
      notes: "intra | INV-MGMT | serial current location" },
    { src: D("inv_reorder_rules"),    tgt: D("inv_stock_items"),     verb: "rule_for",       inv: "has_reorder_rules",  type: "one_to_many", kind: "reference",   required: true,  owner: "target",
      notes: "intra | INV-MGMT | rule indexed by item" },
    { src: D("inv_reorder_rules"),    tgt: D("inv_stock_locations"), verb: "at_location",    inv: "has_reorder_rules",  type: "one_to_many", kind: "reference",   required: true,  owner: "target",
      notes: "intra | INV-MGMT | rule indexed by location" },
    { src: D("inv_kit_definitions"),  tgt: D("inv_stock_items"),     verb: "kit_for",        inv: "kits",               type: "one_to_one",  kind: "reference",   required: true,  owner: "target",
      notes: "intra | INV-MGMT | parent kit SKU is itself an item" },
    { src: D("inv_kit_definitions"),  tgt: D("inv_stock_items"),     verb: "composed_of",    inv: "is_component_of",    type: "many_to_many", kind: "reference",  required: true,  owner: "source",
      notes: "intra | INV-MGMT | components of a kit; M:N expressed implicitly in kit_definition's structure (no separate junction master)" },

    // ---------- users edges (Rule #10) ----------
    { src: D("inv_stock_movements"),  tgt: X.users, verb: "recorded_by",        inv: "records",               type: "one_to_many", kind: "reference", required: true,  owner: "target",
      notes: "users-edge | INV-MGMT | movement records who posted it" },
    { src: D("inv_stock_transfers"),  tgt: X.users, verb: "requested_by",       inv: "requests_transfers",    type: "one_to_many", kind: "reference", required: true,  owner: "target",
      notes: "users-edge | INV-MGMT | transfer initiator" },
    { src: D("inv_stock_transfers"),  tgt: X.users, verb: "approved_by",        inv: "approves_transfers",    type: "one_to_many", kind: "reference", required: false, owner: "target",
      notes: "users-edge | INV-MGMT | transfer approver (only when policy requires)" },
    { src: D("inv_cycle_counts"),     tgt: X.users, verb: "counted_by",         inv: "counts_inventory",      type: "one_to_many", kind: "reference", required: true,  owner: "target",
      notes: "users-edge | INV-MGMT | assigned counter" },
    { src: D("inv_cycle_counts"),     tgt: X.users, verb: "variance_approved_by", inv: "approves_count_variances", type: "one_to_many", kind: "reference", required: true,  owner: "target",
      notes: "users-edge | INV-MGMT | single-approver pattern; variance review gate" },
    { src: D("inv_reorder_rules"),    tgt: X.users, verb: "owned_by",           inv: "owns_reorder_rules",    type: "one_to_many", kind: "reference", required: false, owner: "target",
      notes: "users-edge | INV-MGMT | rule owner / planner" },

    // ---------- Cross-domain (B8 payload->target maps for outbound handoffs) ----------
    { src: D("inv_stock_items"),      tgt: X.commerce_products, verb: "mirrors",           inv: "is_mirrored_by",    type: "one_to_one",  kind: "association", required: false, owner: "source",
      notes: "cross | INV-MGMT -> B2C-COMM | embedded local-item mirrors the canonical commerce product; sync via stock_item.created" },
    { src: D("inv_stock_balances"),   tgt: X.order_allocations, verb: "informs_atp_of",    inv: "atp_derived_from",  type: "one_to_many", kind: "association", required: false, owner: "source",
      notes: "cross | INV-MGMT -> OMS | balance change recomputes order_allocation availability" },
    { src: D("inv_stock_items"),      tgt: X.purchase_orders,   verb: "triggers_po_for",   inv: "fulfills_demand_for", type: "many_to_many", kind: "association", required: false, owner: "source",
      notes: "cross | INV-MGMT -> S2P | below_reorder_point spawns PO request" },
    { src: D("inv_inventory_lots"),   tgt: X.commerce_shipments, verb: "may_recall_shipments_of", inv: "carries_lot", type: "many_to_many", kind: "association", required: false, owner: "source",
      notes: "cross | INV-MGMT -> B2C-COMM | recall cascade traces lots to historical shipments" },
    { src: D("inv_serialized_units"), tgt: X.commerce_orders,   verb: "registers_warranty_against", inv: "has_serialized_units", type: "one_to_many", kind: "association", required: false, owner: "source",
      notes: "cross | INV-MGMT -> B2C-COMM/CSM | serial-warranty registration on issue" },
  ];

  const rows: Row[] = rs.map(r => ({
    data_object_id: r.src, related_data_object_id: r.tgt,
    relationship_verb: r.verb, inverse_verb: r.inv,
    relationship_type: r.type, relationship_kind: r.kind,
    is_required: r.required, owner_side: r.owner, notes: r.notes,
  }));

  // Idempotency: (data_object_id, related_data_object_id, relationship_verb) is the practical key.
  const dosInScope = [...new Set(rs.flatMap(r => [r.src, r.tgt]))];
  const existing = await get(`/data_object_relationships?data_object_id=in.(${dosInScope.join(",")})&select=data_object_id,related_data_object_id,relationship_verb`);
  const existingKeys = new Set(existing.map(r => `${r.data_object_id}:${r.related_data_object_id}:${r.relationship_verb}`));
  const missing = rows.filter(r => !existingKeys.has(`${r.data_object_id}:${r.related_data_object_id}:${r.relationship_verb}`));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} relationships (${existing.length} existed in scope)`);
    await insert("/data_object_relationships", missing);
  } else {
    console.log(`  all ${rs.length} present`);
  }
}

// =============================================================
// Step 7: data_object_aliases
// =============================================================
async function step7_aliases(invDO: Map<string, number>) {
  console.log("\n=== Step 7: data_object_aliases ===");
  type A = { do: string; alias: string };
  const aliases: A[] = [
    { do: "inv_stock_items", alias: "SKU" },
    { do: "inv_stock_items", alias: "Item Master" },
    { do: "inv_stock_items", alias: "Material" },
    { do: "inv_stock_items", alias: "Article" },
    { do: "inv_stock_balances", alias: "On-Hand" },
    { do: "inv_stock_balances", alias: "Inventory Position" },
    { do: "inv_stock_balances", alias: "Stock Level" },
    { do: "inv_stock_movements", alias: "Inventory Transaction" },
    { do: "inv_stock_movements", alias: "Stock Ledger Entry" },
    { do: "inv_stock_transfers", alias: "Transfer Order" },
    { do: "inv_stock_transfers", alias: "Inter-Branch Transfer" },
    { do: "inv_stock_transfers", alias: "Stock Transport Order" },
    { do: "inv_cycle_counts", alias: "Stock Take" },
    { do: "inv_cycle_counts", alias: "Physical Count" },
    { do: "inv_cycle_counts", alias: "Inventory Count" },
    { do: "inv_inventory_lots", alias: "Batch" },
    { do: "inv_inventory_lots", alias: "Lot Code" },
    { do: "inv_serialized_units", alias: "Serial Number Record" },
    { do: "inv_serialized_units", alias: "Serialized Item" },
    { do: "inv_reorder_rules", alias: "Replenishment Rule" },
    { do: "inv_reorder_rules", alias: "Min/Max Rule" },
    { do: "inv_reorder_rules", alias: "Reorder Point Setting" },
    { do: "inv_kit_definitions", alias: "Bill of Kit" },
    { do: "inv_kit_definitions", alias: "Bundle Definition" },
    { do: "inv_kit_definitions", alias: "Kit BOM" },
  ];

  const rows: Row[] = aliases.map(a => ({ data_object_id: invDO.get(a.do)!, alias_name: a.alias, alias_type: "synonym" }));
  const doIds = [...new Set(rows.map(r => r.data_object_id))];
  const existing = await get(`/data_object_aliases?data_object_id=in.(${doIds.join(",")})&select=data_object_id,alias_name`);
  const existingKeys = new Set(existing.map(r => `${r.data_object_id}:${r.alias_name}`));
  const missing = rows.filter(r => !existingKeys.has(`${r.data_object_id}:${r.alias_name}`));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} aliases`);
    await insert("/data_object_aliases", missing);
  } else {
    console.log(`  all ${aliases.length} present`);
  }
}

// =============================================================
// Step 8: data_object_lifecycle_states (5 masters with states)
// =============================================================
async function step8_lifecycleStates(invDO: Map<string, number>) {
  console.log("\n=== Step 8: data_object_lifecycle_states ===");
  type S = { do: string; state_name: string; state_order: number; is_initial?: boolean; is_terminal?: boolean; requires_permission?: boolean; permission_verb_override?: string; domain_module_id?: number; description: string };
  const states: S[] = [
    // inv_stock_movements
    { do: "inv_stock_movements", state_name: "pending",   state_order: 10, is_initial: true,  description: "Draft movement, not yet posted to stock_balances." },
    { do: "inv_stock_movements", state_name: "posted",    state_order: 20, requires_permission: true, permission_verb_override: "post_stock_movement", description: "Movement applied to stock_balances; immutable." },
    { do: "inv_stock_movements", state_name: "reversed",  state_order: 30, is_terminal: true, requires_permission: true, permission_verb_override: "reverse_stock_movement", description: "Compensating reversal posted; original movement retains its history." },
    // inv_stock_transfers
    { do: "inv_stock_transfers", state_name: "requested",   state_order: 10, is_initial: true, description: "Transfer drafted by source location; pending approval." },
    { do: "inv_stock_transfers", state_name: "approved",    state_order: 20, requires_permission: true, permission_verb_override: "approve_stock_transfer", description: "Source location authorized to release stock to in_transit." },
    { do: "inv_stock_transfers", state_name: "in_transit",  state_order: 30, description: "Released from source; awaiting receipt at destination." },
    { do: "inv_stock_transfers", state_name: "received",    state_order: 40, description: "Received at destination; balances updated." },
    { do: "inv_stock_transfers", state_name: "discrepancy", state_order: 50, description: "Received quantity does not match dispatched; awaiting reconciliation." },
    { do: "inv_stock_transfers", state_name: "reconciled",  state_order: 60, is_terminal: true, requires_permission: true, permission_verb_override: "reconcile_stock_transfer", description: "Discrepancy resolved (write-off or recovery)." },
    // inv_cycle_counts
    { do: "inv_cycle_counts", state_name: "scheduled",        state_order: 10, is_initial: true, description: "Count session created; counter not yet started." },
    { do: "inv_cycle_counts", state_name: "counting",         state_order: 20, description: "Counter actively recording counts." },
    { do: "inv_cycle_counts", state_name: "variance_review",  state_order: 30, requires_permission: true, permission_verb_override: "approve_cycle_count_variance", description: "Variances surfaced for approver review before adjustment posting." },
    { do: "inv_cycle_counts", state_name: "posted",           state_order: 40, is_terminal: true, description: "Variances approved and posted as adjustment movements." },
    // inv_inventory_lots
    { do: "inv_inventory_lots", state_name: "active",          state_order: 10, is_initial: true, description: "Lot available for issue." },
    { do: "inv_inventory_lots", state_name: "expiry_warning",  state_order: 20, description: "Lot approaching expiry threshold; prioritize for issue." },
    { do: "inv_inventory_lots", state_name: "expired",         state_order: 30, is_terminal: true, description: "Past expiry; cannot be issued." },
    { do: "inv_inventory_lots", state_name: "recalled",        state_order: 40, is_terminal: true, requires_permission: true, permission_verb_override: "initiate_lot_recall", description: "Lot flagged for recall (regulatory or quality)." },
    // inv_serialized_units
    { do: "inv_serialized_units", state_name: "in_stock", state_order: 10, is_initial: true, description: "Available for reservation or issue." },
    { do: "inv_serialized_units", state_name: "reserved", state_order: 20, description: "Reserved against an order line." },
    { do: "inv_serialized_units", state_name: "issued",   state_order: 30, description: "Sold or installed; warranty active." },
    { do: "inv_serialized_units", state_name: "returned", state_order: 40, description: "Returned by customer; pending refurbishment or restock decision." },
    { do: "inv_serialized_units", state_name: "scrapped", state_order: 50, is_terminal: true, requires_permission: true, permission_verb_override: "scrap_serialized_unit", description: "Disposed; no longer trackable." },
  ];

  const rows: Row[] = states.map(s => ({
    data_object_id: invDO.get(s.do)!,
    state_name: s.state_name,
    state_order: s.state_order,
    is_initial: s.is_initial ?? false,
    is_terminal: s.is_terminal ?? false,
    requires_permission: s.requires_permission ?? false,
    permission_verb_override: s.permission_verb_override ?? "",
    domain_module_id: s.domain_module_id ?? null,
    description: s.description,
  }));

  const doIds = [...new Set(rows.map(r => r.data_object_id))];
  const existing = await get(`/data_object_lifecycle_states?data_object_id=in.(${doIds.join(",")})&select=data_object_id,state_name`);
  const existingKeys = new Set(existing.map(r => `${r.data_object_id}:${r.state_name}`));
  const missing = rows.filter(r => !existingKeys.has(`${r.data_object_id}:${r.state_name}`));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} lifecycle states`);
    await insert("/data_object_lifecycle_states", missing);
  } else {
    console.log(`  all ${states.length} present`);
  }
}

// =============================================================
// Main
// =============================================================
async function main() {
  const invDO = await step1_dataObjects();
  await step2_moduleDOs(invDO);
  await step3_rollup();
  const events = await step4_triggerEvents(invDO);
  await step5_handoffs(events);
  await step6_relationships(invDO);
  await step7_aliases(invDO);
  await step8_lifecycleStates(invDO);

  console.log("\n=== Done. UI spot-checks ===");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/domain_module_data_objects");
  console.log("  https://tests.semantius.app/domain_map/cross_domain_handoffs");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases");
  console.log("  https://tests.semantius.app/domain_map/data_object_lifecycle_states");
}

await main();
