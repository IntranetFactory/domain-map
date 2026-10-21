#!/usr/bin/env bun
// FARMER-DIRECT-SALES (id=158) full-audit fix pass.
// Phase M (modules + capabilities + DMDO + starter) + B fixes
// (pattern flags, aliases, lifecycle states, relationships) + B10b
// handoff module-FK backfill + permissions + Phase S (per-module
// system skills + tools + skill_tools) + Phase E (roles) +
// legacy domain-level skill retirement.
// Idempotent: every section reads existing rows by natural key
// and only inserts the missing ones.

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exit = await proc.exited;
  if (exit !== 0) throw new Error(`semantius failed (exit ${exit}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
async function post(path: string, body: Row[] | Row) {
  if (Array.isArray(body) && body.length === 0) return [];
  if (!Array.isArray(body)) return call({ method: "POST", path, body });
  // PostgREST requires uniform key sets in a batch — group by sorted-key signature
  const groups: Record<string, Row[]> = {};
  for (const r of body) {
    const sig = Object.keys(r).sort().join("|");
    (groups[sig] ??= []).push(r);
  }
  const out: Row[] = [];
  for (const g of Object.values(groups)) {
    const CHUNK = 50;
    for (let i = 0; i < g.length; i += CHUNK) {
      const slice = g.slice(i, i + CHUNK);
      const res = await call({ method: "POST", path, body: slice });
      out.push(...res);
    }
  }
  return out;
}
async function patch(path: string, body: Row) {
  return call({ method: "PATCH", path, body });
}
async function del(path: string) {
  return call({ method: "DELETE", path });
}

const DOMAIN_ID = 158;
const FIN_DOMAIN_ID = 65;       // ERP-FIN target id for handoffs
const FOOD_TRACE_DOMAIN_ID = 155;
const CRM_DOMAIN_ID = 69;
const FMIS_DOMAIN_ID = 154;

// Master data_object ids (audit'd)
const DO = {
  csa_memberships: 514,
  csa_share_packs: 515,
  farmers_market_sales: 516,
  wholesale_orders: 517,
  delivery_routes: 518,
  pickup_locations: 519,
  butcher_orders: 520,
  harvest_forecasts: 521,
  farm_storefronts: 522,
  customers: 97,
  harvest_records: 490,
  users: 748,
};

// Capability code -> id (audit'd)
const CAP = {
  "FDS-CSA-MGMT": 473,
  "FDS-SHARE-CUSTOMIZATION": 474,
  "FDS-ROUTE-OPTIMIZATION": 475,
  "FDS-DELIVERY-WINDOW-MGMT": 476,
  "FDS-FARMERS-MARKET-POS": 477,
  "FDS-FARMSTAND-INVENTORY": 478,
  "FDS-WHOLESALE-ORDERING": 479,
  "FDS-FOODHUB-AGGREGATION": 480,
  "FDS-ONLINE-FARM-STORE": 481,
  "FDS-SUBSCRIPTION-BILLING": 482,
  "FDS-BUTCHER-CUT-SHEETS": 483,
  "FDS-MEMBER-PORTAL": 484,
  "FDS-HARVEST-FORECASTING": 485,
};

// Existing query tools (audit'd, all coverage_tier=platform)
const QUERY_TOOL = {
  csa_memberships: 461,
  csa_share_packs: 462,
  farmers_market_sales: 463,
  wholesale_orders: 464,
  delivery_routes: 465,
  pickup_locations: 466,
  butcher_orders: 467,
  harvest_forecasts: 468,
  farm_storefronts: 469,
  customers: 9,
};

// Existing shared tools
const T_NOTIFY_PERSON = 913;
const T_NOTIFY_TEAM = 914;
const T_EXECUTE_PAYMENT = 43;
const T_RECEIVE_WEBHOOK = 896;
const T_GENERATE_TEXT = 49;       // compute, external (for harvest forecast narratives)

// Business function ids
const BF_SALES = 21;
const BF_MARKETING = 22;
const BF_BUSOPS = 34;
const BF_FINANCE = 4;

// ============================================================
// PHASE M — modules
// ============================================================
const MODULES = [
  { domain_module_code: "FDS-CSA-MGMT", domain_module_name: "CSA Subscriptions and Member Portal",
    description: "CSA membership lifecycle, weekly share-pack composition, member self-service portal, dietary swaps and pauses, full-season pre-pay and instalment billing." },
  { domain_module_code: "FDS-ONLINE-STORE", domain_module_name: "Online Farm Store and Pickup",
    description: "Public-facing farm e-commerce storefront, on-farm farmstand POS and inventory, pickup-location management, delivery-window catalog." },
  { domain_module_code: "FDS-DELIVERY-OPS", domain_module_name: "DTC Delivery Routing",
    description: "Route optimisation, driver manifests, ETA notifications, multi-stop sequencing for direct-to-consumer delivery." },
  { domain_module_code: "FDS-MARKET-POS", domain_module_name: "Farmers Market POS",
    description: "Stall-side POS for farmers market days, sale capture across markets, end-of-market reconciliation, multi-market reporting." },
  { domain_module_code: "FDS-WHOLESALE", domain_module_name: "Wholesale and Food Hub Orders",
    description: "Wholesale catalog, B2B order capture (chefs, restaurants, food hubs), multi-farm aggregation, producer payout splits." },
  { domain_module_code: "FDS-BUTCHER", domain_module_name: "Butcher and Whole-Animal Pre-Sales",
    description: "Cut-sheet templates, whole/half/quarter animal pre-orders, deposit and balance billing, processor coordination." },
  { domain_module_code: "FDS-HARVEST-PLANNING", domain_module_name: "Harvest Forecasting",
    description: "Yield forecasting per crop and field, projected share availability, member-facing harvest previews." },
];

// Capability allocation: capability_code -> domain_module_code (single realizing module per capability)
const CAP_MODULE: Record<string, string> = {
  "FDS-CSA-MGMT": "FDS-CSA-MGMT",
  "FDS-SHARE-CUSTOMIZATION": "FDS-CSA-MGMT",
  "FDS-SUBSCRIPTION-BILLING": "FDS-CSA-MGMT",
  "FDS-MEMBER-PORTAL": "FDS-CSA-MGMT",
  "FDS-ONLINE-FARM-STORE": "FDS-ONLINE-STORE",
  "FDS-FARMSTAND-INVENTORY": "FDS-ONLINE-STORE",
  "FDS-DELIVERY-WINDOW-MGMT": "FDS-ONLINE-STORE",
  "FDS-ROUTE-OPTIMIZATION": "FDS-DELIVERY-OPS",
  "FDS-FARMERS-MARKET-POS": "FDS-MARKET-POS",
  "FDS-WHOLESALE-ORDERING": "FDS-WHOLESALE",
  "FDS-FOODHUB-AGGREGATION": "FDS-WHOLESALE",
  "FDS-BUTCHER-CUT-SHEETS": "FDS-BUTCHER",
  "FDS-HARVEST-FORECASTING": "FDS-HARVEST-PLANNING",
};

// data_object -> realizing module (master rows)
const DO_MODULE_MASTER: Record<string, string> = {
  csa_memberships: "FDS-CSA-MGMT",
  csa_share_packs: "FDS-CSA-MGMT",
  farm_storefronts: "FDS-ONLINE-STORE",
  pickup_locations: "FDS-ONLINE-STORE",
  delivery_routes: "FDS-DELIVERY-OPS",
  farmers_market_sales: "FDS-MARKET-POS",
  wholesale_orders: "FDS-WHOLESALE",
  butcher_orders: "FDS-BUTCHER",
  harvest_forecasts: "FDS-HARVEST-PLANNING",
};

// Cross-module / contributor / consumer DMDO entries
type DmdoEntry = { module_code: string; data_object: keyof typeof DO; role: string; necessity: string };
const DMDO_EXTRA: DmdoEntry[] = [
  // CRM customers contributor on the consumer-facing modules
  { module_code: "FDS-CSA-MGMT", data_object: "customers", role: "contributor", necessity: "required" },
  { module_code: "FDS-ONLINE-STORE", data_object: "customers", role: "contributor", necessity: "required" },
  { module_code: "FDS-BUTCHER", data_object: "customers", role: "contributor", necessity: "required" },
  { module_code: "FDS-WHOLESALE", data_object: "customers", role: "contributor", necessity: "required" },
  { module_code: "FDS-DELIVERY-OPS", data_object: "customers", role: "consumer", necessity: "required" },
  { module_code: "FDS-MARKET-POS", data_object: "customers", role: "consumer", necessity: "optional" },
  // FMIS harvest_records consumed by harvest planning
  { module_code: "FDS-HARVEST-PLANNING", data_object: "harvest_records", role: "consumer", necessity: "required" },
  // CSA shares consume harvest forecasts and pickup locations
  { module_code: "FDS-CSA-MGMT", data_object: "pickup_locations", role: "consumer", necessity: "required" },
  { module_code: "FDS-CSA-MGMT", data_object: "harvest_forecasts", role: "consumer", necessity: "optional" },
  { module_code: "FDS-CSA-MGMT", data_object: "delivery_routes", role: "consumer", necessity: "optional" },
  { module_code: "FDS-DELIVERY-OPS", data_object: "csa_share_packs", role: "consumer", necessity: "required" },
  { module_code: "FDS-DELIVERY-OPS", data_object: "wholesale_orders", role: "consumer", necessity: "required" },
  { module_code: "FDS-DELIVERY-OPS", data_object: "butcher_orders", role: "consumer", necessity: "optional" },
  { module_code: "FDS-WHOLESALE", data_object: "delivery_routes", role: "consumer", necessity: "optional" },
];

const STARTER = [
  { code: "FDS-CSA-MGMT", position: 1, notes: "CSA Subscriptions and Member Portal: the canonical entry point for small CSA operators; subscription billing + share-pack management are the workflow that justifies the platform purchase." },
  { code: "FDS-ONLINE-STORE", position: 2, notes: "Online Farm Store and Pickup: add public-facing storefront and pickup-location management once CSA program is live; opens up non-subscription revenue (one-off sales, farmstand traffic)." },
  { code: "FDS-DELIVERY-OPS", position: 3, notes: "DTC Delivery Routing: add route optimisation when CSA + online-store volume justifies dedicated delivery operations rather than ad-hoc owner-driven runs." },
];

// ============================================================
// B4 pattern flag updates (per master review)
// ============================================================
const PATTERN_FLAGS: Array<{ data_object: keyof typeof DO; flags: Row }> = [
  { data_object: "csa_memberships", flags: { has_personal_content: true, notes: "Holds member contact, address, dietary preferences and substitution rules." } },
  { data_object: "butcher_orders", flags: { has_single_approver: true, notes: "Single-approver pattern: farmer/butcher signs off cut-sheet selections before processing scheduling." } },
  { data_object: "wholesale_orders", flags: { has_submit_lock: true, notes: "Submit-lock: confirmed wholesale orders are locked from line-item edits without explicit reopen by the wholesale manager." } },
  { data_object: "farmers_market_sales", flags: { has_submit_lock: true, notes: "End-of-market reconciliation locks the day's sales; corrections require manager reopen." } },
  { data_object: "harvest_forecasts", flags: { has_submit_lock: true, notes: "Published forecasts (those driving member-facing share availability) lock to a revision; revisions create new snapshots." } },
];

// ============================================================
// B11 aliases
// ============================================================
const ALIASES: Array<{ data_object: keyof typeof DO; alias_name: string; alias_type: string }> = [
  { data_object: "csa_memberships", alias_name: "CSA Subscription", alias_type: "synonym" },
  { data_object: "csa_memberships", alias_name: "Community-Supported Agriculture Membership", alias_type: "synonym" },
  { data_object: "csa_memberships", alias_name: "Box Subscription", alias_type: "industry_term" },
  { data_object: "csa_share_packs", alias_name: "Weekly Box", alias_type: "industry_term" },
  { data_object: "csa_share_packs", alias_name: "Harvest Share", alias_type: "synonym" },
  { data_object: "farmers_market_sales", alias_name: "Stall Sale", alias_type: "synonym" },
  { data_object: "farmers_market_sales", alias_name: "Market Day Transaction", alias_type: "industry_term" },
  { data_object: "wholesale_orders", alias_name: "Restaurant Order", alias_type: "synonym" },
  { data_object: "wholesale_orders", alias_name: "Food Hub Order", alias_type: "synonym" },
  { data_object: "delivery_routes", alias_name: "Delivery Run", alias_type: "synonym" },
  { data_object: "delivery_routes", alias_name: "DTC Manifest", alias_type: "industry_term" },
  { data_object: "pickup_locations", alias_name: "Pickup Site", alias_type: "synonym" },
  { data_object: "pickup_locations", alias_name: "Drop Point", alias_type: "synonym" },
  { data_object: "butcher_orders", alias_name: "Whole-Animal Pre-Order", alias_type: "synonym" },
  { data_object: "butcher_orders", alias_name: "Cut-Sheet Order", alias_type: "industry_term" },
  { data_object: "butcher_orders", alias_name: "Meat Share", alias_type: "synonym" },
  { data_object: "harvest_forecasts", alias_name: "Yield Estimate", alias_type: "synonym" },
  { data_object: "harvest_forecasts", alias_name: "Projected Harvest", alias_type: "synonym" },
  { data_object: "farm_storefronts", alias_name: "Farm Store", alias_type: "synonym" },
  { data_object: "farm_storefronts", alias_name: "Online Farm Shop", alias_type: "synonym" },
];

// ============================================================
// B12 lifecycle states (per master, with realizing module)
// ============================================================
type StateRow = {
  data_object: keyof typeof DO; state_name: string; state_order: number;
  is_initial?: boolean; is_terminal?: boolean;
  requires_permission?: boolean; permission_verb_override?: string;
  module_code: string; description?: string;
};
const STATES: StateRow[] = [
  // csa_memberships
  { data_object: "csa_memberships", state_name: "draft", state_order: 1, is_initial: true, module_code: "FDS-CSA-MGMT", description: "Member is choosing share type / pickup before checkout." },
  { data_object: "csa_memberships", state_name: "active", state_order: 2, requires_permission: true, permission_verb_override: "activate_membership", module_code: "FDS-CSA-MGMT", description: "Subscription paid (or instalment plan accepted); member receives weekly share packs." },
  { data_object: "csa_memberships", state_name: "paused", state_order: 3, requires_permission: true, permission_verb_override: "pause_membership", module_code: "FDS-CSA-MGMT", description: "Member-initiated or admin-initiated pause (vacation, dietary review)." },
  { data_object: "csa_memberships", state_name: "cancelled", state_order: 4, is_terminal: true, requires_permission: true, permission_verb_override: "cancel_membership", module_code: "FDS-CSA-MGMT", description: "Membership ended mid-season; pro-rata refund / credit issued." },
  { data_object: "csa_memberships", state_name: "completed", state_order: 5, is_terminal: true, module_code: "FDS-CSA-MGMT", description: "Season completed normally; auto-renew or seasonal close-out." },
  // csa_share_packs
  { data_object: "csa_share_packs", state_name: "planned", state_order: 1, is_initial: true, module_code: "FDS-CSA-MGMT", description: "Share composition computed from forecast and member swaps." },
  { data_object: "csa_share_packs", state_name: "packed", state_order: 2, requires_permission: true, permission_verb_override: "pack_share", module_code: "FDS-CSA-MGMT", description: "Physically packed and ready for pickup or routing." },
  { data_object: "csa_share_packs", state_name: "out_for_delivery", state_order: 3, module_code: "FDS-DELIVERY-OPS", description: "Loaded onto a delivery route or staged at pickup location." },
  { data_object: "csa_share_packs", state_name: "delivered", state_order: 4, is_terminal: true, requires_permission: true, permission_verb_override: "mark_delivered", module_code: "FDS-DELIVERY-OPS", description: "Confirmed delivered or picked up by member." },
  { data_object: "csa_share_packs", state_name: "missed", state_order: 5, is_terminal: true, requires_permission: true, permission_verb_override: "record_missed", module_code: "FDS-CSA-MGMT", description: "Member did not collect; credit / re-deliver decision applied." },
  // farmers_market_sales
  { data_object: "farmers_market_sales", state_name: "open", state_order: 1, is_initial: true, module_code: "FDS-MARKET-POS", description: "Cart open at the stall; line-items added during the market day." },
  { data_object: "farmers_market_sales", state_name: "paid", state_order: 2, requires_permission: true, permission_verb_override: "capture_payment", module_code: "FDS-MARKET-POS", description: "Cash / card / mobile-pay tendered." },
  { data_object: "farmers_market_sales", state_name: "voided", state_order: 3, is_terminal: true, requires_permission: true, permission_verb_override: "void_sale", module_code: "FDS-MARKET-POS", description: "Cancelled before close; supervisor override." },
  { data_object: "farmers_market_sales", state_name: "reconciled", state_order: 4, is_terminal: true, requires_permission: true, permission_verb_override: "reconcile_market_day", module_code: "FDS-MARKET-POS", description: "End-of-market day cash drawer and POS totals match; revenue posts to ERP-FIN." },
  // wholesale_orders
  { data_object: "wholesale_orders", state_name: "draft", state_order: 1, is_initial: true, module_code: "FDS-WHOLESALE", description: "Buyer or wholesale manager building the order." },
  { data_object: "wholesale_orders", state_name: "submitted", state_order: 2, requires_permission: true, permission_verb_override: "submit_order", module_code: "FDS-WHOLESALE", description: "Buyer has submitted; awaiting farm confirmation." },
  { data_object: "wholesale_orders", state_name: "confirmed", state_order: 3, requires_permission: true, permission_verb_override: "confirm_order", module_code: "FDS-WHOLESALE", description: "Farm has confirmed availability and pricing; inventory reserved; AR posts to ERP-FIN." },
  { data_object: "wholesale_orders", state_name: "fulfilled", state_order: 4, requires_permission: true, permission_verb_override: "fulfil_order", module_code: "FDS-DELIVERY-OPS", description: "Delivered to buyer with proof of delivery." },
  { data_object: "wholesale_orders", state_name: "invoiced", state_order: 5, is_terminal: true, module_code: "FDS-WHOLESALE", description: "Invoice issued (often net-15/30 wholesale terms)." },
  { data_object: "wholesale_orders", state_name: "cancelled", state_order: 6, is_terminal: true, requires_permission: true, permission_verb_override: "cancel_order", module_code: "FDS-WHOLESALE", description: "Cancelled before fulfilment." },
  // delivery_routes
  { data_object: "delivery_routes", state_name: "planned", state_order: 1, is_initial: true, module_code: "FDS-DELIVERY-OPS", description: "Route generated by optimiser; stops sequenced." },
  { data_object: "delivery_routes", state_name: "dispatched", state_order: 2, requires_permission: true, permission_verb_override: "dispatch_route", module_code: "FDS-DELIVERY-OPS", description: "Driver assigned, manifest handed off, vehicle loaded." },
  { data_object: "delivery_routes", state_name: "in_progress", state_order: 3, module_code: "FDS-DELIVERY-OPS", description: "Driver executing the run; ETA updates broadcast to customers." },
  { data_object: "delivery_routes", state_name: "completed", state_order: 4, is_terminal: true, requires_permission: true, permission_verb_override: "complete_route", module_code: "FDS-DELIVERY-OPS", description: "All stops attempted; exception list captured." },
  // pickup_locations
  { data_object: "pickup_locations", state_name: "draft", state_order: 1, is_initial: true, module_code: "FDS-ONLINE-STORE", description: "Pickup site under setup (capacity, hours, host agreement)." },
  { data_object: "pickup_locations", state_name: "active", state_order: 2, requires_permission: true, permission_verb_override: "activate_location", module_code: "FDS-ONLINE-STORE", description: "Open for the season; members can select at signup." },
  { data_object: "pickup_locations", state_name: "paused", state_order: 3, requires_permission: true, permission_verb_override: "pause_location", module_code: "FDS-ONLINE-STORE", description: "Temporary pause (host unavailable, holiday week)." },
  { data_object: "pickup_locations", state_name: "retired", state_order: 4, is_terminal: true, requires_permission: true, permission_verb_override: "retire_location", module_code: "FDS-ONLINE-STORE", description: "End of life for this pickup site; members re-assigned." },
  // butcher_orders
  { data_object: "butcher_orders", state_name: "reserved", state_order: 1, is_initial: true, module_code: "FDS-BUTCHER", description: "Customer has reserved a whole/half/quarter; deposit captured." },
  { data_object: "butcher_orders", state_name: "cut_sheet_pending", state_order: 2, module_code: "FDS-BUTCHER", description: "Customer to submit cut-sheet selections by deadline." },
  { data_object: "butcher_orders", state_name: "cut_sheet_approved", state_order: 3, requires_permission: true, permission_verb_override: "approve_cut_sheet", module_code: "FDS-BUTCHER", description: "Farmer / butcher signed off cut-sheet selections; processor scheduling unlocked." },
  { data_object: "butcher_orders", state_name: "processing", state_order: 4, module_code: "FDS-BUTCHER", description: "Animal at processor; cut-and-wrap underway." },
  { data_object: "butcher_orders", state_name: "ready", state_order: 5, requires_permission: true, permission_verb_override: "mark_ready", module_code: "FDS-BUTCHER", description: "Order packed and balance billed; customer notified for pickup or delivery." },
  { data_object: "butcher_orders", state_name: "delivered", state_order: 6, is_terminal: true, module_code: "FDS-BUTCHER", description: "Customer has received the order." },
  { data_object: "butcher_orders", state_name: "cancelled", state_order: 7, is_terminal: true, requires_permission: true, permission_verb_override: "cancel_butcher_order", module_code: "FDS-BUTCHER", description: "Reservation released; deposit per policy." },
  // harvest_forecasts
  { data_object: "harvest_forecasts", state_name: "draft", state_order: 1, is_initial: true, module_code: "FDS-HARVEST-PLANNING", description: "Forecast being built from field plantings and historical yields." },
  { data_object: "harvest_forecasts", state_name: "published", state_order: 2, requires_permission: true, permission_verb_override: "publish_forecast", module_code: "FDS-HARVEST-PLANNING", description: "Forecast drives member-facing share previews and pre-sale openings." },
  { data_object: "harvest_forecasts", state_name: "revised", state_order: 3, requires_permission: true, permission_verb_override: "revise_forecast", module_code: "FDS-HARVEST-PLANNING", description: "Yield expectation changed materially (weather, pest); subscribers notified." },
  { data_object: "harvest_forecasts", state_name: "actualized", state_order: 4, is_terminal: true, module_code: "FDS-HARVEST-PLANNING", description: "Season closed; actuals captured for next-year baseline." },
  // farm_storefronts
  { data_object: "farm_storefronts", state_name: "setup", state_order: 1, is_initial: true, module_code: "FDS-ONLINE-STORE", description: "Storefront under build (theme, catalog, payments)." },
  { data_object: "farm_storefronts", state_name: "open", state_order: 2, requires_permission: true, permission_verb_override: "open_storefront", module_code: "FDS-ONLINE-STORE", description: "Public-facing; accepting orders." },
  { data_object: "farm_storefronts", state_name: "seasonal_closed", state_order: 3, requires_permission: true, permission_verb_override: "close_storefront", module_code: "FDS-ONLINE-STORE", description: "Seasonally closed (winter break); preserved for re-open." },
  { data_object: "farm_storefronts", state_name: "archived", state_order: 4, is_terminal: true, module_code: "FDS-ONLINE-STORE", description: "Permanently retired (operator left platform)." },
];

// ============================================================
// B6 intra-domain relationships
// ============================================================
type RelRow = {
  source: keyof typeof DO; verb: string; target: keyof typeof DO;
  inverse: string; type: string; kind?: string;
  is_required?: boolean; owner_side?: string; notes?: string;
};
const REL_INTRA: RelRow[] = [
  { source: "csa_memberships", verb: "subscribes to", target: "csa_share_packs",
    inverse: "is delivered as part of", type: "one_to_many", kind: "reference", is_required: true, owner_side: "target", notes: "Each active membership generates N weekly share packs across the season." },
  { source: "csa_memberships", verb: "picks up at", target: "pickup_locations",
    inverse: "serves", type: "many_to_one", kind: "reference", is_required: true, owner_side: "source" },
  { source: "csa_share_packs", verb: "is routed via", target: "delivery_routes",
    inverse: "carries", type: "many_to_one", kind: "reference", is_required: false, owner_side: "source", notes: "Optional: shares can be picked up at a location instead of delivered." },
  { source: "csa_share_packs", verb: "is assembled from", target: "harvest_forecasts",
    inverse: "drives composition of", type: "many_to_one", kind: "reference", is_required: false, owner_side: "source" },
  { source: "wholesale_orders", verb: "is delivered via", target: "delivery_routes",
    inverse: "carries", type: "many_to_one", kind: "reference", is_required: false, owner_side: "source" },
  { source: "butcher_orders", verb: "is delivered via", target: "delivery_routes",
    inverse: "carries", type: "many_to_one", kind: "reference", is_required: false, owner_side: "source" },
  { source: "farm_storefronts", verb: "exposes", target: "pickup_locations",
    inverse: "is offered through", type: "one_to_many", kind: "reference", is_required: false, owner_side: "target" },
  { source: "farm_storefronts", verb: "lists", target: "csa_memberships",
    inverse: "is sold through", type: "one_to_many", kind: "reference", is_required: false, owner_side: "target" },
  { source: "farm_storefronts", verb: "lists", target: "butcher_orders",
    inverse: "is sold through", type: "one_to_many", kind: "reference", is_required: false, owner_side: "target" },
  { source: "harvest_forecasts", verb: "informs", target: "wholesale_orders",
    inverse: "draws from", type: "one_to_many", kind: "reference", is_required: false, owner_side: "target" },
  { source: "harvest_forecasts", verb: "informs", target: "farmers_market_sales",
    inverse: "draws from", type: "one_to_many", kind: "reference", is_required: false, owner_side: "target" },
];

// ============================================================
// B7 users edges (each master that has a user-typed actor)
// ============================================================
const REL_USERS: RelRow[] = [
  { source: "csa_memberships", verb: "is owned by", target: "users", inverse: "owns",
    type: "many_to_one", kind: "reference", is_required: true, owner_side: "source", notes: "Member-user; one membership per primary household user." },
  { source: "csa_share_packs", verb: "is packed by", target: "users", inverse: "packs",
    type: "many_to_one", kind: "reference", is_required: false, owner_side: "source" },
  { source: "farmers_market_sales", verb: "is rung by", target: "users", inverse: "rings",
    type: "many_to_one", kind: "reference", is_required: true, owner_side: "source", notes: "Cashier-user at the market stall." },
  { source: "wholesale_orders", verb: "is placed by", target: "users", inverse: "places",
    type: "many_to_one", kind: "reference", is_required: true, owner_side: "source", notes: "Buyer-user (chef, restaurant manager, food-hub buyer)." },
  { source: "wholesale_orders", verb: "is confirmed by", target: "users", inverse: "confirms",
    type: "many_to_one", kind: "reference", is_required: true, owner_side: "source", notes: "Farm-side wholesale manager." },
  { source: "delivery_routes", verb: "is driven by", target: "users", inverse: "drives",
    type: "many_to_one", kind: "reference", is_required: true, owner_side: "source", notes: "Assigned driver-user." },
  { source: "butcher_orders", verb: "is placed by", target: "users", inverse: "places",
    type: "many_to_one", kind: "reference", is_required: true, owner_side: "source" },
  { source: "butcher_orders", verb: "is approved by", target: "users", inverse: "approves",
    type: "many_to_one", kind: "reference", is_required: true, owner_side: "source", notes: "Single-approver pattern: farmer/butcher signs off cut-sheet selections." },
  { source: "harvest_forecasts", verb: "is published by", target: "users", inverse: "publishes",
    type: "many_to_one", kind: "reference", is_required: true, owner_side: "source" },
  { source: "farm_storefronts", verb: "is administered by", target: "users", inverse: "administers",
    type: "many_to_one", kind: "reference", is_required: true, owner_side: "source", notes: "Farm operator-user; the storefront admin." },
  { source: "pickup_locations", verb: "is hosted by", target: "users", inverse: "hosts",
    type: "many_to_one", kind: "reference", is_required: false, owner_side: "source", notes: "Optional host-user contact (often a community member volunteering their porch / shop)." },
];

// ============================================================
// B8 cross-domain relationships (outbound only)
// ============================================================
const REL_CROSS: RelRow[] = [
  { source: "csa_memberships", verb: "represents", target: "customers", inverse: "subscribes via",
    type: "many_to_one", kind: "reference", is_required: true, owner_side: "source", notes: "CRM customer is the canonical customer-relationship record; FDS membership is the subscription instance." },
  { source: "wholesale_orders", verb: "is placed by", target: "customers", inverse: "places",
    type: "many_to_one", kind: "reference", is_required: true, owner_side: "source" },
  { source: "butcher_orders", verb: "is placed by", target: "customers", inverse: "places",
    type: "many_to_one", kind: "reference", is_required: true, owner_side: "source" },
  { source: "farmers_market_sales", verb: "is attributed to", target: "customers", inverse: "buys at",
    type: "many_to_one", kind: "reference", is_required: false, owner_side: "source", notes: "Optional: walk-up market sales are anonymous; loyalty / repeat customers can be linked." },
  { source: "delivery_routes", verb: "serves", target: "customers", inverse: "is served by",
    type: "many_to_many", kind: "reference", is_required: true, owner_side: "source" },
  { source: "harvest_forecasts", verb: "is informed by", target: "harvest_records", inverse: "feeds",
    type: "many_to_many", kind: "reference", is_required: true, owner_side: "source", notes: "FMIS harvest_records feed prior-season actuals into the forecasting model." },
];

// ============================================================
// Phase S — per-module mutate tools
// ============================================================
type ToolSpec = { tool_name: string; data_object: keyof typeof DO | null; operation_kind: string; description: string };
const NEW_TOOLS: ToolSpec[] = [
  { tool_name: "create_csa_membership", data_object: "csa_memberships", operation_kind: "mutate", description: "Create a new CSA membership (subscription)." },
  { tool_name: "update_csa_membership", data_object: "csa_memberships", operation_kind: "mutate", description: "Update CSA membership state (activate, pause, cancel)." },
  { tool_name: "compose_share_pack", data_object: "csa_share_packs", operation_kind: "mutate", description: "Compose a weekly share pack from forecast + member swaps." },
  { tool_name: "create_farmers_market_sale", data_object: "farmers_market_sales", operation_kind: "mutate", description: "Open a farmers-market cart and capture line items." },
  { tool_name: "create_wholesale_order", data_object: "wholesale_orders", operation_kind: "mutate", description: "Capture a wholesale (B2B) order." },
  { tool_name: "confirm_wholesale_order", data_object: "wholesale_orders", operation_kind: "mutate", description: "Confirm a submitted wholesale order; reserves inventory and posts AR." },
  { tool_name: "plan_delivery_route", data_object: "delivery_routes", operation_kind: "mutate", description: "Generate an optimised DTC delivery route from pending share packs and wholesale orders." },
  { tool_name: "dispatch_delivery_route", data_object: "delivery_routes", operation_kind: "mutate", description: "Dispatch a planned route to a driver." },
  { tool_name: "create_pickup_location", data_object: "pickup_locations", operation_kind: "mutate", description: "Create a CSA pickup location." },
  { tool_name: "create_butcher_order", data_object: "butcher_orders", operation_kind: "mutate", description: "Create a whole/half/quarter animal pre-order." },
  { tool_name: "approve_cut_sheet", data_object: "butcher_orders", operation_kind: "mutate", description: "Approve customer cut-sheet selections; unlocks processor scheduling." },
  { tool_name: "publish_harvest_forecast", data_object: "harvest_forecasts", operation_kind: "mutate", description: "Publish a harvest forecast to drive member-facing share previews." },
  { tool_name: "create_farm_storefront", data_object: "farm_storefronts", operation_kind: "mutate", description: "Create or open a public-facing farm storefront for a season." },
];

// Per-module skill_tools wiring
type SkillToolSpec = { tool_name: string; level: "required" | "optional"; notes?: string };
const MODULE_SKILL_TOOLS: Record<string, SkillToolSpec[]> = {
  "FDS-CSA-MGMT": [
    { tool_name: "query_csa_memberships", level: "required" },
    { tool_name: "query_csa_share_packs", level: "required" },
    { tool_name: "query_pickup_locations", level: "required", notes: "Read pickup-site availability when assigning members." },
    { tool_name: "query_harvest_forecasts", level: "optional", notes: "Read forecast to drive next-week share composition." },
    { tool_name: "query_customers", level: "required", notes: "Read CRM customer for membership owner." },
    { tool_name: "create_csa_membership", level: "required" },
    { tool_name: "update_csa_membership", level: "required" },
    { tool_name: "compose_share_pack", level: "required" },
    { tool_name: "notify_person", level: "required", notes: "Pickup reminders, swap-deadline nudges, billing receipts." },
    { tool_name: "execute_payment", level: "required", notes: "Subscription charge (full-season pre-pay or instalment)." },
  ],
  "FDS-ONLINE-STORE": [
    { tool_name: "query_farm_storefronts", level: "required" },
    { tool_name: "query_pickup_locations", level: "required" },
    { tool_name: "query_customers", level: "required" },
    { tool_name: "create_farm_storefront", level: "required" },
    { tool_name: "create_pickup_location", level: "required" },
    { tool_name: "notify_person", level: "required", notes: "Order confirmations and storefront-status updates to operator." },
    { tool_name: "execute_payment", level: "required", notes: "One-off store checkout." },
    { tool_name: "receive_webhook", level: "optional", notes: "Inbound channel for storefront payment-gateway callbacks." },
  ],
  "FDS-DELIVERY-OPS": [
    { tool_name: "query_delivery_routes", level: "required" },
    { tool_name: "query_csa_share_packs", level: "required", notes: "Read packs to be routed." },
    { tool_name: "query_wholesale_orders", level: "required" },
    { tool_name: "query_customers", level: "required", notes: "Read customer addresses for routing." },
    { tool_name: "plan_delivery_route", level: "required" },
    { tool_name: "dispatch_delivery_route", level: "required" },
    { tool_name: "notify_person", level: "required", notes: "Customer-facing ETA windows and delivery notifications." },
  ],
  "FDS-MARKET-POS": [
    { tool_name: "query_farmers_market_sales", level: "required" },
    { tool_name: "create_farmers_market_sale", level: "required" },
    { tool_name: "execute_payment", level: "required", notes: "Card / mobile-pay capture at the stall." },
    { tool_name: "query_customers", level: "optional", notes: "Optional loyalty / repeat-customer attribution." },
    { tool_name: "notify_person", level: "optional", notes: "Receipt-by-email opt-in." },
  ],
  "FDS-WHOLESALE": [
    { tool_name: "query_wholesale_orders", level: "required" },
    { tool_name: "query_customers", level: "required", notes: "Buyer (chef / restaurant / food-hub) account read." },
    { tool_name: "create_wholesale_order", level: "required" },
    { tool_name: "confirm_wholesale_order", level: "required" },
    { tool_name: "notify_person", level: "required", notes: "Order confirmations and ETA notifications to buyers." },
  ],
  "FDS-BUTCHER": [
    { tool_name: "query_butcher_orders", level: "required" },
    { tool_name: "query_customers", level: "required" },
    { tool_name: "create_butcher_order", level: "required" },
    { tool_name: "approve_cut_sheet", level: "required" },
    { tool_name: "notify_person", level: "required", notes: "Cut-sheet-deadline reminders; ready-for-pickup notifications." },
    { tool_name: "execute_payment", level: "required", notes: "Deposit at reservation, balance at ready." },
  ],
  "FDS-HARVEST-PLANNING": [
    { tool_name: "query_harvest_forecasts", level: "required" },
    { tool_name: "publish_harvest_forecast", level: "required" },
    { tool_name: "notify_person", level: "optional", notes: "Forecast-published notifications to CSA members." },
  ],
};

// ============================================================
// Phase E — roles
// ============================================================
type RoleSpec = {
  role_code: string; role_name: string; slug: string;
  business_function_id: number | null; description: string;
  modules: Array<{ module_code: string; interaction_level: "primary" | "secondary" }>;
  permissions: string[]; // module_code:tier (e.g. "FDS-CSA-MGMT:admin") or full permission_name
};
const ROLES: RoleSpec[] = [
  {
    role_code: "OPERATIONS-FARM-OPERATOR", role_name: "Farm Operator", slug: "operations_farm_operator",
    business_function_id: BF_BUSOPS,
    description: "Owner-operator of the farm; admin-tier across the entire FDS surface. The single-user / small-team default in early-stage deployments.",
    modules: [
      { module_code: "FDS-CSA-MGMT", interaction_level: "primary" },
      { module_code: "FDS-ONLINE-STORE", interaction_level: "primary" },
      { module_code: "FDS-DELIVERY-OPS", interaction_level: "primary" },
      { module_code: "FDS-MARKET-POS", interaction_level: "primary" },
      { module_code: "FDS-WHOLESALE", interaction_level: "primary" },
      { module_code: "FDS-BUTCHER", interaction_level: "primary" },
      { module_code: "FDS-HARVEST-PLANNING", interaction_level: "primary" },
    ],
    permissions: [
      "FDS-CSA-MGMT:admin", "FDS-ONLINE-STORE:admin", "FDS-DELIVERY-OPS:admin",
      "FDS-MARKET-POS:admin", "FDS-WHOLESALE:admin", "FDS-BUTCHER:admin",
      "FDS-HARVEST-PLANNING:admin",
    ],
  },
  {
    role_code: "SALES-CSA-MANAGER", role_name: "CSA Manager", slug: "sales_csa_manager",
    business_function_id: BF_SALES,
    description: "Runs the CSA subscription program day-to-day: member acquisition, share-pack composition, member-facing portal, harvest-forecast integration. Cross-cuts CSA + Harvest Planning + Online Store.",
    modules: [
      { module_code: "FDS-CSA-MGMT", interaction_level: "primary" },
      { module_code: "FDS-HARVEST-PLANNING", interaction_level: "secondary" },
      { module_code: "FDS-ONLINE-STORE", interaction_level: "secondary" },
      { module_code: "FDS-DELIVERY-OPS", interaction_level: "secondary" },
    ],
    permissions: [
      "FDS-CSA-MGMT:admin", "FDS-HARVEST-PLANNING:manage",
      "FDS-ONLINE-STORE:read", "FDS-DELIVERY-OPS:read",
    ],
  },
  {
    role_code: "SALES-WHOLESALE-MANAGER", role_name: "Wholesale Manager", slug: "sales_wholesale_manager",
    business_function_id: BF_SALES,
    description: "Manages B2B accounts (restaurants, food hubs), wholesale catalog and pricing, order confirmation, and food-hub aggregation.",
    modules: [
      { module_code: "FDS-WHOLESALE", interaction_level: "primary" },
      { module_code: "FDS-BUTCHER", interaction_level: "secondary" },
      { module_code: "FDS-DELIVERY-OPS", interaction_level: "secondary" },
      { module_code: "FDS-HARVEST-PLANNING", interaction_level: "secondary" },
    ],
    permissions: [
      "FDS-WHOLESALE:admin", "FDS-BUTCHER:manage",
      "FDS-DELIVERY-OPS:read", "FDS-HARVEST-PLANNING:read",
    ],
  },
  {
    role_code: "OPERATIONS-DELIVERY-COORDINATOR", role_name: "Delivery Coordinator", slug: "operations_delivery_coordinator",
    business_function_id: BF_BUSOPS,
    description: "Plans and dispatches delivery routes, coordinates drivers, owns pickup-location operations.",
    modules: [
      { module_code: "FDS-DELIVERY-OPS", interaction_level: "primary" },
      { module_code: "FDS-ONLINE-STORE", interaction_level: "secondary" },
      { module_code: "FDS-CSA-MGMT", interaction_level: "secondary" },
      { module_code: "FDS-WHOLESALE", interaction_level: "secondary" },
    ],
    permissions: [
      "FDS-DELIVERY-OPS:admin", "FDS-ONLINE-STORE:manage",
      "FDS-CSA-MGMT:read", "FDS-WHOLESALE:read",
    ],
  },
  {
    role_code: "SALES-MARKET-CASHIER", role_name: "Market Cashier", slug: "sales_market_cashier",
    business_function_id: BF_SALES,
    description: "Stall-side cashier at farmers markets; reads catalog from online store, rings sales, reconciles day.",
    modules: [
      { module_code: "FDS-MARKET-POS", interaction_level: "primary" },
      { module_code: "FDS-ONLINE-STORE", interaction_level: "secondary" },
    ],
    permissions: [
      "FDS-MARKET-POS:manage", "FDS-ONLINE-STORE:read",
    ],
  },
];

// ============================================================
// LOADER
// ============================================================

async function main() {
  console.log("=== FARMER-DIRECT-SALES audit-fix loader ===");

  // --- Phase M: modules ---
  console.log("\n[M] domain_modules");
  const moduleRows = MODULES.map(m => ({
    ...m,
    domain_id: DOMAIN_ID,
    module_kind: "full",
  }));
  const existingMods = await get(`/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`);
  const existingModSet = new Set(existingMods.map(r => String(r.domain_module_code)));
  const missingMods = moduleRows.filter(m => !existingModSet.has(m.domain_module_code));
  if (missingMods.length) {
    console.log(`  inserting ${missingMods.length} modules`);
    await post("/domain_modules", missingMods);
  } else {
    console.log("  all modules present");
  }
  const allMods = await get(`/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`);
  const M: Record<string, number> = {};
  for (const r of allMods) M[String(r.domain_module_code)] = Number(r.id);
  console.log(`  module ids:`, M);

  // --- M4: domain_module_capabilities ---
  console.log("\n[M4] domain_module_capabilities");
  const existingDmc = await get(`/domain_module_capabilities?domain_module_id=in.(${Object.values(M).join(",")})&select=domain_module_id,capability_id`);
  const dmcSet = new Set(existingDmc.map(r => `${r.domain_module_id}-${r.capability_id}`));
  const dmcRows = Object.entries(CAP_MODULE).map(([capCode, modCode]) => ({
    domain_module_id: M[modCode],
    capability_id: CAP[capCode as keyof typeof CAP],
  })).filter(r => !dmcSet.has(`${r.domain_module_id}-${r.capability_id}`));
  if (dmcRows.length) {
    console.log(`  inserting ${dmcRows.length} dmc rows`);
    await post("/domain_module_capabilities", dmcRows);
  } else console.log("  all dmc present");

  // --- domain_module_data_objects (master rows + extras) ---
  console.log("\n[B] domain_module_data_objects");
  const existingDmdo = await get(`/domain_module_data_objects?domain_module_id=in.(${Object.values(M).join(",")})&select=domain_module_id,data_object_id,role`);
  const dmdoSet = new Set(existingDmdo.map(r => `${r.domain_module_id}-${r.data_object_id}`));
  const dmdoRows: Row[] = [];
  // master rows
  for (const [doName, modCode] of Object.entries(DO_MODULE_MASTER)) {
    const key = `${M[modCode]}-${DO[doName as keyof typeof DO]}`;
    if (!dmdoSet.has(key)) {
      dmdoRows.push({ domain_module_id: M[modCode], data_object_id: DO[doName as keyof typeof DO], role: "master", necessity: "required" });
    }
  }
  // extras
  for (const e of DMDO_EXTRA) {
    const key = `${M[e.module_code]}-${DO[e.data_object]}`;
    if (!dmdoSet.has(key)) {
      dmdoRows.push({ domain_module_id: M[e.module_code], data_object_id: DO[e.data_object], role: e.role, necessity: e.necessity });
    }
  }
  if (dmdoRows.length) {
    console.log(`  inserting ${dmdoRows.length} dmdo rows`);
    await post("/domain_module_data_objects", dmdoRows);
  } else console.log("  all dmdo present");

  // --- M3: domain_starter_modules ---
  console.log("\n[M3] domain_starter_modules");
  const existingStarter = await get(`/domain_starter_modules?domain_id=eq.${DOMAIN_ID}&select=domain_module_id`);
  const starterSet = new Set(existingStarter.map(r => Number(r.domain_module_id)));
  const starterRows = STARTER.map(s => ({
    domain_id: DOMAIN_ID, domain_module_id: M[s.code], position: s.position, notes: s.notes,
  })).filter(r => !starterSet.has(r.domain_module_id));
  if (starterRows.length) {
    console.log(`  inserting ${starterRows.length} starter rows`);
    await post("/domain_starter_modules", starterRows);
  } else console.log("  all starter rows present");

  // --- Fix trigger_events with empty event_category ---
  console.log("\n[B9 fix] trigger_events event_category");
  const badEvts = await get("/trigger_events?id=in.(1104,1105,1106,1107,1108,1109,1110)&event_category=eq.&select=id,event_name");
  for (const e of badEvts) {
    console.log(`  PATCH trigger_event id=${e.id} (${e.event_name}) -> event_category=lifecycle`);
    await patch(`/trigger_events?id=eq.${e.id}`, { event_category: "lifecycle" });
  }
  if (badEvts.length === 0) console.log("  no empty event_category rows");

  // --- B4 pattern flags ---
  console.log("\n[B4] data_objects pattern flags");
  for (const p of PATTERN_FLAGS) {
    const id = DO[p.data_object];
    console.log(`  PATCH data_object id=${id} (${p.data_object}) flags`);
    await patch(`/data_objects?id=eq.${id}`, p.flags);
  }

  // --- B11 aliases ---
  console.log("\n[B11] data_object_aliases");
  const aliasIds = ALIASES.map(a => DO[a.data_object]);
  const existingAlias = await get(`/data_object_aliases?data_object_id=in.(${[...new Set(aliasIds)].join(",")})&select=data_object_id,alias_name`);
  const aliasSet = new Set(existingAlias.map(r => `${r.data_object_id}-${r.alias_name}`));
  const aliasRows = ALIASES.map(a => {
    const row: Row = { data_object_id: DO[a.data_object], alias_name: a.alias_name, alias_type: a.alias_type };
    if (a.alias_type === "industry_term") row.industry_id = 22; // food industry
    return row;
  }).filter(r => !aliasSet.has(`${r.data_object_id}-${r.alias_name}`));
  if (aliasRows.length) {
    // PostgREST requires uniform schema across rows in one batch; split by alias_type
    const byType: Record<string, Row[]> = {};
    for (const r of aliasRows) {
      const t = String(r.alias_type);
      (byType[t] ??= []).push(r);
    }
    for (const [t, rows] of Object.entries(byType)) {
      console.log(`  inserting ${rows.length} ${t} aliases`);
      await post("/data_object_aliases", rows);
    }
  } else console.log("  all aliases present");

  // --- B12 lifecycle states ---
  console.log("\n[B12] data_object_lifecycle_states");
  const masterIds = Object.values(DO).filter((v, i) => i < 9); // 514..522
  const existingStates = await get(`/data_object_lifecycle_states?data_object_id=in.(${masterIds.join(",")})&select=data_object_id,state_name`);
  const stateSet = new Set(existingStates.map(r => `${r.data_object_id}-${r.state_name}`));
  const stateRows = STATES.map(s => ({
    data_object_id: DO[s.data_object],
    state_name: s.state_name,
    state_order: s.state_order,
    is_initial: !!s.is_initial,
    is_terminal: !!s.is_terminal,
    requires_permission: !!s.requires_permission,
    permission_verb_override: s.permission_verb_override ?? "",
    domain_module_id: M[s.module_code],
    description: s.description ?? "",
  })).filter(r => !stateSet.has(`${r.data_object_id}-${r.state_name}`));
  if (stateRows.length) {
    console.log(`  inserting ${stateRows.length} lifecycle state rows`);
    await post("/data_object_lifecycle_states", stateRows);
  } else console.log("  all lifecycle states present");

  // --- B6 + B7 + B8 relationships ---
  console.log("\n[B6/B7/B8] data_object_relationships");
  const allRels = [...REL_INTRA, ...REL_USERS, ...REL_CROSS];
  const relInvolvedIds = [...new Set([
    ...allRels.map(r => DO[r.source]),
    ...allRels.map(r => DO[r.target]),
  ])];
  const existingRels = await get(`/data_object_relationships?or=(data_object_id.in.(${relInvolvedIds.join(",")}),related_data_object_id.in.(${relInvolvedIds.join(",")}))&select=data_object_id,related_data_object_id,relationship_verb`);
  const relSet = new Set(existingRels.map(r => `${r.data_object_id}-${r.related_data_object_id}-${r.relationship_verb}`));
  // Catalog convention: relationship_type is one of {one_to_one, one_to_many, many_to_many}.
  // many_to_one is expressed as one_to_many from the "one" (parent) side; flip source/target
  // and swap verb/inverse so source always sits on the "one" side.
  const relRows = allRels.map(r => {
    if (r.type === "many_to_one") {
      return {
        data_object_id: DO[r.target],
        related_data_object_id: DO[r.source],
        relationship_verb: r.inverse,
        inverse_verb: r.verb,
        relationship_type: "one_to_many",
        relationship_kind: r.kind ?? "reference",
        is_required: r.is_required ?? false,
        owner_side: r.owner_side === "source" ? "target" : "source",
        notes: r.notes ?? "",
      };
    }
    return {
      data_object_id: DO[r.source],
      related_data_object_id: DO[r.target],
      relationship_verb: r.verb,
      inverse_verb: r.inverse,
      relationship_type: r.type,
      relationship_kind: r.kind ?? "reference",
      is_required: r.is_required ?? false,
      owner_side: r.owner_side ?? "source",
      notes: r.notes ?? "",
    };
  }).filter(r => !relSet.has(`${r.data_object_id}-${r.related_data_object_id}-${r.relationship_verb}`));
  if (relRows.length) {
    console.log(`  inserting ${relRows.length} relationship rows`);
    await post("/data_object_relationships", relRows);
  } else console.log("  all relationships present");

  // --- B10b: backfill handoff module FKs ---
  console.log("\n[B10b] handoff module-FK backfill");
  // Outbound: source_domain_module_id from publishing master
  const outHandoffs = await get(`/handoffs?source_domain_id=eq.${DOMAIN_ID}&source_domain_module_id=is.null&select=id,trigger_event_id,data_object_id,trigger_events(data_object_id)`);
  for (const h of outHandoffs) {
    const evt = h.trigger_events as any;
    const eventDoId = Number(evt?.data_object_id);
    // find which FDS master holds this data_object
    let modId: number | null = null;
    for (const [doName, modCode] of Object.entries(DO_MODULE_MASTER)) {
      if (DO[doName as keyof typeof DO] === eventDoId) { modId = M[modCode]; break; }
    }
    if (modId) {
      console.log(`  PATCH handoff id=${h.id} source_domain_module_id=${modId}`);
      await patch(`/handoffs?id=eq.${h.id}`, { source_domain_module_id: modId });
    } else {
      console.log(`  handoff id=${h.id} no FDS master for event_do=${eventDoId}, leaving NULL`);
    }
  }
  // Inbound: target_domain_module_id from payload master in FDS
  const inHandoffs = await get(`/handoffs?target_domain_id=eq.${DOMAIN_ID}&target_domain_module_id=is.null&select=id,data_object_id`);
  for (const h of inHandoffs) {
    const payloadId = Number(h.data_object_id);
    // resolve target module from DMDO with strongest role
    const dmdo = await get(`/domain_module_data_objects?domain_module_id=in.(${Object.values(M).join(",")})&data_object_id=eq.${payloadId}&select=domain_module_id,role`);
    const roleOrder = ["master", "embedded_master", "contributor", "consumer", "derived"];
    dmdo.sort((a, b) => roleOrder.indexOf(String(a.role)) - roleOrder.indexOf(String(b.role)));
    if (dmdo[0]) {
      console.log(`  PATCH inbound handoff id=${h.id} target_domain_module_id=${dmdo[0].domain_module_id} (role=${dmdo[0].role})`);
      await patch(`/handoffs?id=eq.${h.id}`, { target_domain_module_id: Number(dmdo[0].domain_module_id) });
    } else {
      console.log(`  inbound handoff id=${h.id} no DMDO match for payload=${payloadId}`);
    }
  }

  // --- Permissions: 3 baseline tiers + workflow-gates from lifecycle states ---
  console.log("\n[E] permissions");
  const existingPerms = await get(`/permissions?domain_module_id=in.(${Object.values(M).join(",")})&select=permission_name,domain_module_id,tier`);
  const permSet = new Set(existingPerms.map(p => String(p.permission_name)));
  const permRows: Row[] = [];
  for (const [code, mid] of Object.entries(M)) {
    const lc = code.toLowerCase();
    for (const tier of [["read", "baseline-read"], ["manage", "baseline-manage"], ["admin", "baseline-admin"]]) {
      const name = `${lc}:${tier[0]}`;
      if (!permSet.has(name)) {
        permRows.push({ permission_name: name, domain_module_id: mid, tier: tier[1] });
      }
    }
  }
  // workflow-gates from lifecycle states with requires_permission=true
  const wfStates = await get(`/data_object_lifecycle_states?data_object_id=in.(${masterIds.join(",")})&requires_permission=eq.true&select=data_object_id,state_name,permission_verb_override,domain_module_id`);
  for (const s of wfStates) {
    if (!s.domain_module_id) continue;
    // find module_code for this module id
    const modCode = Object.entries(M).find(([, id]) => id === s.domain_module_id)?.[0];
    if (!modCode) continue;
    const verb = s.permission_verb_override || s.state_name;
    const name = `${modCode.toLowerCase()}:${verb}`;
    if (!permSet.has(name)) {
      permRows.push({ permission_name: name, domain_module_id: s.domain_module_id, tier: "workflow-gate" });
      permSet.add(name);
    }
  }
  if (permRows.length) {
    console.log(`  inserting ${permRows.length} permissions`);
    await post("/permissions", permRows);
  } else console.log("  all permissions present");

  // --- Phase S: new mutate tools ---
  console.log("\n[S] new tools");
  const existingToolNames = new Set((await get(`/tools?tool_name=in.(${NEW_TOOLS.map(t => t.tool_name).join(",")})&select=tool_name`)).map(t => String(t.tool_name)));
  const toolRows = NEW_TOOLS.filter(t => !existingToolNames.has(t.tool_name)).map(t => ({
    tool_name: t.tool_name,
    operation_kind: t.operation_kind,
    data_object_id: t.data_object ? DO[t.data_object] : null,
    description: t.description,
    coverage_tier: "platform",
  }));
  if (toolRows.length) {
    console.log(`  inserting ${toolRows.length} new tools`);
    await post("/tools", toolRows);
  } else console.log("  all tools present");
  const toolMap: Record<string, number> = {};
  const allTools = await get(`/tools?tool_name=in.(${[...NEW_TOOLS.map(t => t.tool_name), ...Object.values(MODULE_SKILL_TOOLS).flat().map(s => s.tool_name)].join(",")})&select=id,tool_name`);
  for (const t of allTools) toolMap[String(t.tool_name)] = Number(t.id);

  // --- Phase S: system skills + skill_tools ---
  console.log("\n[F2] system skills");
  const existingSkills = await get(`/skills?domain_module_id=in.(${Object.values(M).join(",")})&skill_type=eq.system&select=id,domain_module_id,skill_name`);
  const skillByModId = new Map(existingSkills.map(s => [Number(s.domain_module_id), { id: Number(s.id), name: String(s.skill_name) }]));
  const newSkillRows: Row[] = [];
  for (const [code, mid] of Object.entries(M)) {
    if (!skillByModId.has(mid)) {
      const skillName = `${code.toLowerCase().replace(/-/g, "_")}_agent`;
      newSkillRows.push({
        skill_name: skillName,
        skill_type: "system",
        domain_module_id: mid,
        domain_id: DOMAIN_ID,
        description: `System agent for the ${MODULES.find(m => m.domain_module_code === code)?.domain_module_name} module.`,
      });
    }
  }
  if (newSkillRows.length) {
    console.log(`  inserting ${newSkillRows.length} system skills`);
    await post("/skills", newSkillRows);
  } else console.log("  all system skills present");
  const allSkills = await get(`/skills?domain_module_id=in.(${Object.values(M).join(",")})&skill_type=eq.system&select=id,domain_module_id`);
  const SKILL: Record<string, number> = {};
  for (const s of allSkills) {
    const code = Object.entries(M).find(([, mid]) => mid === Number(s.domain_module_id))?.[0];
    if (code) SKILL[code] = Number(s.id);
  }
  console.log("  skill ids:", SKILL);

  // skill_tools
  console.log("\n[F3] skill_tools");
  const existingSt = await get(`/skill_tools?skill_id=in.(${Object.values(SKILL).join(",")})&select=skill_id,tool_id`);
  const stSet = new Set(existingSt.map(s => `${s.skill_id}-${s.tool_id}`));
  const stRows: Row[] = [];
  for (const [modCode, tools] of Object.entries(MODULE_SKILL_TOOLS)) {
    const sid = SKILL[modCode];
    if (!sid) { console.log(`  WARN no skill for ${modCode}`); continue; }
    for (const tool of tools) {
      const tid = toolMap[tool.tool_name];
      if (!tid) { console.log(`  WARN no tool ${tool.tool_name}`); continue; }
      const key = `${sid}-${tid}`;
      if (stSet.has(key)) continue;
      stRows.push({
        skill_id: sid, tool_id: tid,
        requirement_level: tool.level,
        notes: tool.notes ?? "",
      });
    }
  }
  if (stRows.length) {
    console.log(`  inserting ${stRows.length} skill_tools`);
    await post("/skill_tools", stRows);
  } else console.log("  all skill_tools present");

  // --- Phase E: roles ---
  console.log("\n[E1] roles");
  const existingRoles = await get(`/roles?role_code=in.(${ROLES.map(r => r.role_code).join(",")})&select=id,role_code`);
  const roleSet = new Set(existingRoles.map(r => String(r.role_code)));
  const newRoles = ROLES.filter(r => !roleSet.has(r.role_code)).map(r => ({
    role_code: r.role_code, role_name: r.role_name, slug: r.slug,
    business_function_id: r.business_function_id,
    description: r.description,
    origin: "model",
  }));
  if (newRoles.length) {
    console.log(`  inserting ${newRoles.length} roles`);
    await post("/roles", newRoles);
  } else console.log("  all roles present");
  const allRoles = await get(`/roles?role_code=in.(${ROLES.map(r => r.role_code).join(",")})&select=id,role_code`);
  const ROLE_ID: Record<string, number> = {};
  for (const r of allRoles) ROLE_ID[String(r.role_code)] = Number(r.id);

  // role_modules
  console.log("\n[E2/E3] role_modules");
  const existingRm = await get(`/role_modules?role_id=in.(${Object.values(ROLE_ID).join(",")})&select=role_id,domain_module_id`);
  const rmSet = new Set(existingRm.map(r => `${r.role_id}-${r.domain_module_id}`));
  const rmRows: Row[] = [];
  for (const r of ROLES) {
    const rid = ROLE_ID[r.role_code];
    for (const m of r.modules) {
      const mid = M[m.module_code];
      if (rmSet.has(`${rid}-${mid}`)) continue;
      rmRows.push({ role_id: rid, domain_module_id: mid, interaction_level: m.interaction_level });
    }
  }
  if (rmRows.length) {
    console.log(`  inserting ${rmRows.length} role_modules`);
    await post("/role_modules", rmRows);
  } else console.log("  all role_modules present");

  // role_permissions
  console.log("\n[E4] role_permissions");
  // collect all permission_names we need
  const wantedPerms = new Set<string>();
  for (const r of ROLES) {
    for (const p of r.permissions) {
      // expand "MODULE:tier" form
      if (p.includes(":") && !p.includes("_")) {
        const [code, tier] = p.split(":");
        wantedPerms.add(`${code.toLowerCase()}:${tier}`);
      } else {
        wantedPerms.add(p);
      }
    }
  }
  const permLookup = await get(`/permissions?permission_name=in.(${[...wantedPerms].join(",")})&select=id,permission_name`);
  const permIdByName = new Map(permLookup.map(p => [String(p.permission_name), Number(p.id)]));
  const existingRp = await get(`/role_permissions?role_id=in.(${Object.values(ROLE_ID).join(",")})&select=role_id,permission_id`);
  const rpSet = new Set(existingRp.map(r => `${r.role_id}-${r.permission_id}`));
  const rpRows: Row[] = [];
  for (const r of ROLES) {
    const rid = ROLE_ID[r.role_code];
    for (const p of r.permissions) {
      let name: string;
      if (p.includes(":") && !p.includes("_")) {
        const [code, tier] = p.split(":");
        name = `${code.toLowerCase()}:${tier}`;
      } else name = p;
      const pid = permIdByName.get(name);
      if (!pid) { console.log(`  WARN no permission ${name}`); continue; }
      if (rpSet.has(`${rid}-${pid}`)) continue;
      rpRows.push({ role_id: rid, permission_id: pid });
    }
  }
  if (rpRows.length) {
    console.log(`  inserting ${rpRows.length} role_permissions`);
    await post("/role_permissions", rpRows);
  } else console.log("  all role_permissions present");

  // --- F1: retire legacy domain-level skill once module skills exist ---
  console.log("\n[F1] retire legacy skill id=58");
  if (Object.keys(SKILL).length === MODULES.length) {
    // first delete its skill_tools rows, then the skill
    const legacySt = await get("/skill_tools?skill_id=eq.58&select=id");
    if (legacySt.length) {
      console.log(`  deleting ${legacySt.length} legacy skill_tools rows`);
      await del("/skill_tools?skill_id=eq.58");
    }
    const legacySkill = await get("/skills?id=eq.58&select=id");
    if (legacySkill.length) {
      console.log("  deleting legacy skill id=58");
      await del("/skills?id=eq.58");
    } else console.log("  legacy skill already removed");
  } else {
    console.log("  module skill set incomplete, NOT retiring legacy");
  }

  // --- Summary counts ---
  console.log("\n=== final counts ===");
  const finalMods = await get(`/domain_modules?domain_id=eq.${DOMAIN_ID}&select=count`);
  const finalSkills = await get(`/skills?domain_module_id=in.(${Object.values(M).join(",")})&skill_type=eq.system&select=count`);
  const finalSt = await get(`/skill_tools?skill_id=in.(${Object.values(SKILL).join(",")})&select=count`);
  const finalRoles = await get(`/roles?role_code=in.(${ROLES.map(r => r.role_code).join(",")})&select=count`);
  const finalStates = await get(`/data_object_lifecycle_states?data_object_id=in.(${masterIds.join(",")})&select=count`);
  const finalAliases = await get(`/data_object_aliases?data_object_id=in.(${masterIds.join(",")})&select=count`);
  const finalRels = await get(`/data_object_relationships?data_object_id=in.(${masterIds.join(",")})&select=count`);
  const finalPerms = await get(`/permissions?domain_module_id=in.(${Object.values(M).join(",")})&select=count`);
  console.log(`  modules: ${(finalMods[0] as any)?.count}`);
  console.log(`  system skills: ${(finalSkills[0] as any)?.count}`);
  console.log(`  skill_tools: ${(finalSt[0] as any)?.count}`);
  console.log(`  roles: ${(finalRoles[0] as any)?.count}`);
  console.log(`  lifecycle states: ${(finalStates[0] as any)?.count}`);
  console.log(`  aliases: ${(finalAliases[0] as any)?.count}`);
  console.log(`  relationships: ${(finalRels[0] as any)?.count}`);
  console.log(`  permissions: ${(finalPerms[0] as any)?.count}`);
}

await main();
