#!/usr/bin/env bun
// B2C-COMM Phase-B backfill + b2c-comm-system skill (closes the P2.5A.ii gap).
//
// Inserts:
//   - 10 new master data_objects (orders, order_lines, carts, products, storefronts, checkouts,
//     payment_transactions, fulfillments, shipments, coupons)
//   - 5 new domain_data_objects (B2C-COMM consumer/contributor rows on existing entities)
//   - 16 new trigger_events
//   - 10 new cross_domain_handoffs
//   - ~30 new query+mutate tools
//   - 1 new skill (b2c-comm-system)
//   - ~15 skill_tools rows
//
//   bun run load_b2ccomm_phase_b_and_skill.ts          -> DRY RUN
//   bun run load_b2ccomm_phase_b_and_skill.ts --apply  -> Live

import { $ } from "bun";

$.throws(false);

const APPLY = process.argv.includes("--apply");

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
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius call failed (exit ${code}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  if (!APPLY) { console.log(`  [DRY] POST ${rows.length} → ${path}`); return []; }
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const r = await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) });
    out.push(...r);
  }
  return out;
}

console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}\n`);

// Resolvers
let domainId = new Map<string, number>();
let doId = new Map<string, number>();
let teId = new Map<string, number>();
let toolId = new Map<string, number>();
let skillId = new Map<string, number>();

async function refresh() {
  const [d, o, t, tl, s] = await Promise.all([
    get(`/domains?select=id,domain_code&limit=10000`),
    get(`/data_objects?select=id,data_object_name&limit=10000`),
    get(`/trigger_events?select=id,event_name&limit=10000`),
    get(`/tools?select=id,tool_name&limit=10000`),
    get(`/skills?select=id,skill_name&limit=10000`),
  ]);
  domainId = new Map(d.map(x => [String(x.domain_code), Number(x.id)]));
  doId = new Map(o.map(x => [String(x.data_object_name), Number(x.id)]));
  teId = new Map(t.map(x => [String(x.event_name), Number(x.id)]));
  toolId = new Map(tl.map(x => [String(x.tool_name), Number(x.id)]));
  skillId = new Map(s.map(x => [String(x.skill_name), Number(x.id)]));
}
await refresh();

const existingDdoRows = await get(`/domain_data_objects?select=domain_id,data_object_id,role&limit=20000`);
const ddoKey = (d: number, o: number, r: string) => `${d}:${o}:${r}`;
const existingDdos = new Set(existingDdoRows.map(r => ddoKey(Number(r.domain_id), Number(r.data_object_id), String(r.role))));

const existingHandoffRows = await get(`/cross_domain_handoffs?select=source_domain_id,target_domain_id,trigger_event_id,data_object_id&limit=20000`);
const hoKey = (s: number, t: number, e: number, d: number) => `${s}:${t}:${e}:${d}`;
const existingHandoffs = new Set(existingHandoffRows.map(r => hoKey(Number(r.source_domain_id), Number(r.target_domain_id), Number(r.trigger_event_id), Number(r.data_object_id))));

const existingSkillToolRows = await get(`/skill_tools?select=skill_id,tool_id&limit=20000`);
const stKey = (s: number, t: number) => `${s}:${t}`;
const existingSkillTools = new Set(existingSkillToolRows.map(r => stKey(Number(r.skill_id), Number(r.tool_id))));

console.log(`Resolved: ${domainId.size} domains, ${doId.size} DOs, ${teId.size} TEs, ${toolId.size} tools, ${skillId.size} skills.\n`);

// --- B2C-COMM data_objects ---
type DataObjectDraft = { data_object_name: string; singular_label?: string; plural_label?: string; display_label: string; description: string };
const newDataObjects: DataObjectDraft[] = [
  { data_object_name: "orders", singular_label: "Order", plural_label: "Orders", display_label: "Order", description: "Customer purchase order created at checkout, tracked through fulfillment and completion. B2C seller-side; distinct from S2P `purchase_orders` (supplier-issued buyer-side)." },
  { data_object_name: "order_lines", singular_label: "Order Line", plural_label: "Order Lines", display_label: "Order Line", description: "Individual product line within an order: quantity, price, discount, tax breakdown. Parent = orders (cascade delete)." },
  { data_object_name: "carts", singular_label: "Shopping Cart", plural_label: "Shopping Carts", display_label: "Shopping Cart", description: "Session-scoped cart holding products before checkout; item quantities, pricing, promotions. Abandoned carts feed MA nurture." },
  { data_object_name: "products", singular_label: "Product", plural_label: "Products", display_label: "Product", description: "Sellable product: name, description, SKU, pricing, inventory references. B2C-COMM-mastered v1; future PIM domain will co-master when loaded." },
  { data_object_name: "storefronts", singular_label: "Storefront", plural_label: "Storefronts", display_label: "Storefront", description: "B2C brand / channel storefront (web store, mobile app, marketplace listing) with catalog mapping. One seller may have N storefronts." },
  { data_object_name: "checkouts", singular_label: "Checkout Session", plural_label: "Checkout Sessions", display_label: "Checkout Session", description: "Transactional checkout session capturing customer identity, payment method, shipping address, and final order conversion." },
  { data_object_name: "payment_transactions", singular_label: "Payment Transaction", plural_label: "Payment Transactions", display_label: "Payment Transaction", description: "Payment attempt / authorisation on an order (charge, decline, refund, capture). Multi-state lifecycle; ERP-FIN AR sees settled payments via handoff." },
  { data_object_name: "fulfillments", singular_label: "Fulfillment", plural_label: "Fulfillments", display_label: "Fulfillment", description: "Fulfillment instruction group created from order_lines; assigned to warehouse/location, tracked to shipment." },
  { data_object_name: "shipments", singular_label: "Shipment", plural_label: "Shipments", display_label: "Shipment", description: "Physical or digital shipment associated with a fulfillment; carrier, tracking, delivery status. Includes RMA returns." },
  { data_object_name: "coupons", singular_label: "Coupon / Promotion", plural_label: "Coupon / Promotions", display_label: "Coupon / Promotion", description: "Promotion code or campaign offer (discount, BOGO, free-shipping) applicable to cart/order. Storefront-scoped or global." },
];

// --- B2C-COMM domain_data_objects (master rows + new contributor/consumer additions) ---
type DdoDraft = { domain_code: string; data_object_name: string; role: string; notes: string };
const newDdos: DdoDraft[] = [
  ...newDataObjects.map(d => ({ domain_code: "B2C-COMM", data_object_name: d.data_object_name, role: "master", notes: "" })),
  // contributor/consumer additions (don't repeat the 3 that already exist)
  { domain_code: "B2C-COMM", data_object_name: "customer_subscriptions", role: "consumer", notes: "Reads SUB-MGMT subscriptions for replenish-style recurring-purchase coordination" },
  { domain_code: "B2C-COMM", data_object_name: "customer_invoices", role: "consumer", notes: "Reads SUB-MGMT customer invoices for AR reconciliation on recurring orders" },
  { domain_code: "B2C-COMM", data_object_name: "campaigns", role: "consumer", notes: "Reads MA campaign targeting for cart-abandonment follow-up + promotional messaging" },
  { domain_code: "B2C-COMM", data_object_name: "leads", role: "contributor", notes: "Contributes first-party purchase-intent signals (high-value abandons, product views, wishlist adds) back to CRM" },
];

// --- B2C-COMM trigger_events ---
type TEDraft = { event_name: string; data_object_name: string; from_state: string; to_state: string; event_category: string; description: string };
const newTEs: TEDraft[] = [
  { event_name: "cart.created", data_object_name: "carts", from_state: "", to_state: "active", event_category: "lifecycle", description: "Shopping-cart session initiated." },
  { event_name: "cart.item_added", data_object_name: "carts", from_state: "active", to_state: "active", event_category: "state_change", description: "Product added to cart; inventory reserved." },
  { event_name: "cart.abandoned", data_object_name: "carts", from_state: "active", to_state: "abandoned", event_category: "lifecycle", description: "Cart inactivity timeout or explicit session close without conversion; triggers MA nurture." },
  { event_name: "checkout.started", data_object_name: "checkouts", from_state: "", to_state: "pending", event_category: "lifecycle", description: "Customer entered checkout flow; cart locked, shipping quoted." },
  { event_name: "checkout.payment_authorized", data_object_name: "checkouts", from_state: "pending", to_state: "payment_authorized", event_category: "state_change", description: "Payment method validated and pre-authorised." },
  { event_name: "order.placed", data_object_name: "orders", from_state: "", to_state: "submitted", event_category: "lifecycle", description: "Order created from checkout; cart → order_lines conversion complete." },
  { event_name: "order.confirmed", data_object_name: "orders", from_state: "submitted", to_state: "confirmed", event_category: "state_change", description: "Payment captured; order moves to fulfillment queue; ERP-FIN AR posts." },
  { event_name: "order.fulfilled", data_object_name: "orders", from_state: "confirmed", to_state: "fulfilled", event_category: "state_change", description: "All order_lines picked, packed, shipped." },
  { event_name: "order.completed", data_object_name: "orders", from_state: "fulfilled", to_state: "completed", event_category: "lifecycle", description: "Final delivery confirmed; post-purchase window closed." },
  { event_name: "order.refunded", data_object_name: "orders", from_state: "completed", to_state: "refunded", event_category: "state_change", description: "Refund issued on entire order; ERP-FIN AR reversal; CSM notified." },
  { event_name: "payment.authorized", data_object_name: "payment_transactions", from_state: "", to_state: "authorized", event_category: "state_change", description: "Payment method authorised but not yet captured." },
  { event_name: "payment.captured", data_object_name: "payment_transactions", from_state: "authorized", to_state: "captured", event_category: "state_change", description: "Payment amount debited from customer account." },
  { event_name: "payment.declined", data_object_name: "payment_transactions", from_state: "authorized", to_state: "declined", event_category: "state_change", description: "Payment method rejected." },
  { event_name: "shipment.created", data_object_name: "shipments", from_state: "", to_state: "pending", event_category: "lifecycle", description: "Carrier assigned, label generated, tracking number issued." },
  { event_name: "shipment.delivered", data_object_name: "shipments", from_state: "pending", to_state: "delivered", event_category: "lifecycle", description: "Delivery confirmed by carrier; triggers order.completed workflow." },
  { event_name: "storefront.created", data_object_name: "storefronts", from_state: "", to_state: "active", event_category: "lifecycle", description: "New storefront launched; product catalog mapped, checkout enabled, payment processor connected." },
];

// --- B2C-COMM cross_domain_handoffs ---
type HoDraft = { event_name: string; source_domain_code: string; target_domain_code: string; data_object_name: string; integration_pattern: string; friction_level: string; description: string };
const newHandoffs: HoDraft[] = [
  { event_name: "order.placed", source_domain_code: "B2C-COMM", target_domain_code: "OMS", data_object_name: "orders", integration_pattern: "event_stream", friction_level: "medium", description: "OMS receives order creation for omnichannel orchestration (inventory allocation, backorder mgmt)." },
  { event_name: "order.placed", source_domain_code: "B2C-COMM", target_domain_code: "CRM", data_object_name: "orders", integration_pattern: "api_call", friction_level: "low", description: "CRM records new customer order in account context; revenue metrics + CSM visibility." },
  { event_name: "order.placed", source_domain_code: "B2C-COMM", target_domain_code: "LOYALTY", data_object_name: "orders", integration_pattern: "api_call", friction_level: "medium", description: "LOYALTY increments customer points, applies tier benefits, triggers reward offers." },
  { event_name: "order.confirmed", source_domain_code: "B2C-COMM", target_domain_code: "ERP-FIN", data_object_name: "payment_transactions", integration_pattern: "api_call", friction_level: "high", description: "ERP-FIN AR posts captured payment to GL + A/R ledger. Reconciliation key is order_id + payment_transaction_id. Friction: GL account mapping, multi-currency conversion." },
  { event_name: "order.refunded", source_domain_code: "B2C-COMM", target_domain_code: "ERP-FIN", data_object_name: "orders", integration_pattern: "batch_sync", friction_level: "high", description: "ERP-FIN AR reverses original sales GL entry and posts refund liability. Friction: partial-refund accounting + GL variance root-cause." },
  { event_name: "cart.abandoned", source_domain_code: "B2C-COMM", target_domain_code: "MA", data_object_name: "carts", integration_pattern: "event_stream", friction_level: "medium", description: "MA receives abandoned-cart triggers for segmented email nurture. Payload: product list, total value, customer contact." },
  { event_name: "checkout.started", source_domain_code: "B2C-COMM", target_domain_code: "MA", data_object_name: "checkouts", integration_pattern: "event_stream", friction_level: "low", description: "MA records checkout-funnel step for analytics + attribution." },
  { event_name: "payment.declined", source_domain_code: "B2C-COMM", target_domain_code: "CRM", data_object_name: "payment_transactions", integration_pattern: "api_call", friction_level: "low", description: "CRM records payment failure in customer case for CS follow-up." },
  { event_name: "order.completed", source_domain_code: "B2C-COMM", target_domain_code: "CSM", data_object_name: "orders", integration_pattern: "api_call", friction_level: "medium", description: "CSM creates post-purchase case for support + returns routing." },
  { event_name: "order.placed", source_domain_code: "B2C-COMM", target_domain_code: "SUB-MGMT", data_object_name: "orders", integration_pattern: "event_stream", friction_level: "medium", description: "SUB-MGMT consumes one-off orders that are part of subscription replenishment rhythm." },
];

// --- B2C-COMM tools (queries + mutates) ---
type ToolDraft = { tool_name: string; operation_kind: "query" | "mutate"; data_object_name: string; description: string };
const newTools: ToolDraft[] = [
  // queries — one per master
  { tool_name: "query_orders", operation_kind: "query", data_object_name: "orders", description: "Read B2C orders via Semantius CRUD." },
  { tool_name: "query_order_lines", operation_kind: "query", data_object_name: "order_lines", description: "Read order line items via Semantius CRUD." },
  { tool_name: "query_carts", operation_kind: "query", data_object_name: "carts", description: "Read shopping cart sessions via Semantius CRUD." },
  { tool_name: "query_products", operation_kind: "query", data_object_name: "products", description: "Read product catalog records via Semantius CRUD." },
  { tool_name: "query_storefronts", operation_kind: "query", data_object_name: "storefronts", description: "Read storefront configurations via Semantius CRUD." },
  { tool_name: "query_checkouts", operation_kind: "query", data_object_name: "checkouts", description: "Read checkout sessions via Semantius CRUD." },
  { tool_name: "query_payment_transactions", operation_kind: "query", data_object_name: "payment_transactions", description: "Read payment transaction records via Semantius CRUD." },
  { tool_name: "query_fulfillments", operation_kind: "query", data_object_name: "fulfillments", description: "Read fulfillment records via Semantius CRUD." },
  { tool_name: "query_shipments", operation_kind: "query", data_object_name: "shipments", description: "Read shipment records via Semantius CRUD." },
  { tool_name: "query_coupons", operation_kind: "query", data_object_name: "coupons", description: "Read promotion / coupon definitions via Semantius CRUD." },
  // mutates — selective
  { tool_name: "create_order", operation_kind: "mutate", data_object_name: "orders", description: "Create a new B2C order from a checkout." },
  { tool_name: "update_order_status", operation_kind: "mutate", data_object_name: "orders", description: "Advance an order through its lifecycle (submitted/confirmed/fulfilled/completed/refunded)." },
  { tool_name: "refund_order", operation_kind: "mutate", data_object_name: "orders", description: "Issue a refund on an order; cascades payment reversal + ERP-FIN handoff." },
  { tool_name: "create_cart", operation_kind: "mutate", data_object_name: "carts", description: "Create a new shopping cart session." },
  { tool_name: "create_checkout", operation_kind: "mutate", data_object_name: "checkouts", description: "Open a new checkout session from a cart." },
  { tool_name: "create_product", operation_kind: "mutate", data_object_name: "products", description: "Add a new product to the catalog." },
  { tool_name: "update_product", operation_kind: "mutate", data_object_name: "products", description: "Update a product's attributes / pricing / status." },
  { tool_name: "create_shipment", operation_kind: "mutate", data_object_name: "shipments", description: "Create a shipment from a fulfillment; assign carrier and tracking." },
  { tool_name: "create_coupon", operation_kind: "mutate", data_object_name: "coupons", description: "Create a new promotion / coupon." },
];

// --- b2c-comm-system skill ---
const newSkill = { skill_name: "b2c-comm-system", domain_code: "B2C-COMM", description: "System skill for Digital Commerce — storefront, product, cart, checkout, order, payment, fulfillment, shipment workflows. Payment captures executed externally; order-confirmation + cart-abandonment cascades via email." };

type SkillToolTuple = [string, "required" | "optional" | "fallback"] | [string, "required" | "optional" | "fallback", string];
const skillToolMatrix: SkillToolTuple[] = [
  // queries (10 masters)
  ["query_orders", "required"], ["query_order_lines", "required"], ["query_carts", "required"],
  ["query_products", "required"], ["query_storefronts", "required"], ["query_checkouts", "required"],
  ["query_payment_transactions", "required"], ["query_fulfillments", "required"], ["query_shipments", "required"],
  ["query_coupons", "required"],
  // mutates
  ["create_order", "required"], ["update_order_status", "required"], ["refund_order", "required"],
  ["create_cart", "required"], ["create_checkout", "required"],
  ["create_product", "required"], ["update_product", "required"],
  ["create_shipment", "required"], ["create_coupon", "required"],
  // external
  ["execute_payment", "required", "Payment capture is external (Stripe / Adyen / similar)"],
  ["send_email", "required", "Order confirmations, shipment notifications, cart-abandonment cascades"],
  ["query_customers", "required", "Cross-reads CRM/CDP customer master"],
  ["query_customer_subscriptions", "optional", "Replenish-style recurring-purchase coordination"],
];

// ============================================================================
// EXECUTION
// ============================================================================

// Section 1: data_objects
const missingDOs = newDataObjects.filter(d => !doId.has(d.data_object_name));
console.log(`Section 1 — data_objects: ${newDataObjects.length} planned, ${missingDOs.length} to insert.`);
if (missingDOs.length > 0) {
  await insert("/data_objects", missingDOs);
  if (APPLY) await refresh();
}

// Section 2: domain_data_objects
const ddoPayload: Row[] = [];
let ddoSkipped = 0;
for (const r of newDdos) {
  const d = domainId.get(r.domain_code);
  const o = doId.get(r.data_object_name);
  if (d === undefined || o === undefined) { ddoSkipped++; continue; }
  if (existingDdos.has(ddoKey(d, o, r.role))) continue;
  ddoPayload.push({ domain_id: d, data_object_id: o, role: r.role, notes: r.notes });
}
console.log(`Section 2 — domain_data_objects: ${newDdos.length} planned, ${ddoPayload.length} to insert, ${ddoSkipped} skipped.`);
if (ddoPayload.length > 0) await insert("/domain_data_objects", ddoPayload);

// Section 3: trigger_events
const tePayload: Row[] = [];
let teSkipped = 0;
for (const r of newTEs) {
  if (teId.has(r.event_name)) continue;
  const o = doId.get(r.data_object_name);
  if (o === undefined) { teSkipped++; continue; }
  tePayload.push({ event_name: r.event_name, data_object_id: o, from_state: r.from_state, to_state: r.to_state, event_category: r.event_category, description: r.description });
}
console.log(`Section 3 — trigger_events: ${newTEs.length} planned, ${tePayload.length} to insert, ${teSkipped} skipped.`);
if (tePayload.length > 0) {
  await insert("/trigger_events", tePayload);
  if (APPLY) await refresh();
}

// Section 4: cross_domain_handoffs
const hoPayload: Row[] = [];
let hoSkipped = 0;
for (const r of newHandoffs) {
  const s = domainId.get(r.source_domain_code);
  const t = domainId.get(r.target_domain_code);
  const e = teId.get(r.event_name);
  const o = doId.get(r.data_object_name);
  if (s === undefined || t === undefined || e === undefined || o === undefined) { hoSkipped++; continue; }
  if (existingHandoffs.has(hoKey(s, t, e, o))) continue;
  hoPayload.push({ source_domain_id: s, target_domain_id: t, trigger_event_id: e, data_object_id: o, integration_pattern: r.integration_pattern, friction_level: r.friction_level, description: r.description });
}
console.log(`Section 4 — cross_domain_handoffs: ${newHandoffs.length} planned, ${hoPayload.length} to insert, ${hoSkipped} skipped.`);
if (hoPayload.length > 0) await insert("/cross_domain_handoffs", hoPayload);

// Section 5: tools
const missingTools = newTools.filter(t => !toolId.has(t.tool_name));
console.log(`Section 5 — tools: ${newTools.length} planned, ${missingTools.length} to insert.`);
if (missingTools.length > 0) {
  const payload = missingTools.map(t => ({
    tool_name: t.tool_name, description: t.description, operation_kind: t.operation_kind,
    data_object_id: doId.get(t.data_object_name),
  }));
  await insert("/tools", payload);
  if (APPLY) await refresh();
}

// Section 6: skill
if (!skillId.has(newSkill.skill_name)) {
  const did = domainId.get(newSkill.domain_code);
  if (did === undefined) throw new Error(`Domain not found: ${newSkill.domain_code}`);
  console.log(`Section 6 — skills: 1 planned, 1 to insert.`);
  await insert("/skills", [{ skill_name: newSkill.skill_name, description: newSkill.description, skill_type: "system", domain_id: did }]);
  if (APPLY) await refresh();
} else {
  console.log(`Section 6 — skills: ${newSkill.skill_name} already exists.`);
}

// Section 7: skill_tools
const stPayload: Row[] = [];
let stPlanned = 0;
let stSkipped = 0;
const sid = skillId.get(newSkill.skill_name);
for (const t of skillToolMatrix) {
  stPlanned++;
  const [toolName, level, notes] = t.length === 3 ? t : [t[0], t[1], ""] as [string, string, string];
  const tid = toolId.get(toolName);
  if (sid === undefined || tid === undefined) { stSkipped++; continue; }
  if (existingSkillTools.has(stKey(sid, tid))) continue;
  stPayload.push({ skill_id: sid, tool_id: tid, requirement_level: level, notes });
}
console.log(`Section 7 — skill_tools: ${stPlanned} planned, ${stPayload.length} to insert, ${stSkipped} skipped.`);
if (stPayload.length > 0) await insert("/skill_tools", stPayload);

// Hypothesis test
if (APPLY) {
  const allTools = await get(`/tools?select=id,tool_name,operation_kind&limit=10000`);
  const opByTool = new Map(allTools.map(t => [String(t.tool_name), String(t.operation_kind)]));
  const required = skillToolMatrix.filter(t => t[1] === "required");
  const semCov = required.filter(t => {
    const op = opByTool.get(t[0]);
    return op === "query" || op === "mutate";
  });
  const pct = (semCov.length / required.length) * 100;
  console.log(`\n=== b2c-comm-system hypothesis test ===`);
  console.log(`  ${pct === 100 ? "✅" : "⬇"} ${pct.toFixed(0)}%  ${semCov.length}/${required.length} required tools Semantius-covered`);
  if (pct < 100) {
    for (const r of required) {
      const op = opByTool.get(r[0]);
      if (!(op === "query" || op === "mutate")) console.log(`    ↳ NOT covered: ${r[0]} (${op})`);
    }
  }
}

console.log(`\nDone (${APPLY ? "live" : "dry run"}).`);
