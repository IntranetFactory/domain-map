// B2C-COMM corrective-additive audit fix pass (2026-06-13).
// Covers: B13 entity_type, B6 intra-domain rels, B7 users edges, B11 aliases,
// B12 lifecycle states, B10b outbound + inbound handoff module-FK backfill.
// All inserts land record_status='new' (DB default; omitted). Idempotent on natural keys.
// Run: bun run c:/dev/domain-map/.tmp_deploy/fix_b2c_comm_b1b_2026_06_13.ts [--write]

const WRITE = process.argv.includes("--write");

async function pg(method: string, path: string, body?: unknown): Promise<any> {
  const arg: any = { method, path };
  if (body !== undefined) arg.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(arg)],
    { stdout: "pipe", stderr: "pipe" },
  );
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error(`pg ${method} ${path} failed: ${err}\n${out}`);
  try { return JSON.parse(out); } catch { return out.trim(); }
}

const USERS = 748;

// master ids
const O = { orders: 381, lines: 382, carts: 383, products: 384, storefronts: 385,
            checkouts: 386, payments: 387, fulfillments: 388, shipments: 389, coupons: 390 };
const NAME: Record<number, string> = {
  381: "commerce_orders", 382: "order_lines", 383: "carts", 384: "commerce_products",
  385: "commerce_storefronts", 386: "checkouts", 387: "payment_transactions",
  388: "fulfillments", 389: "commerce_shipments", 390: "coupons",
};

// ---- B13: entity_type classification ----
const ENTITY_TYPE: Record<number, string> = {
  381: "operational_workflow", // commerce_orders
  382: "operational_record",   // order_lines (per-order line, no own workflow)
  383: "operational_workflow", // carts
  384: "operational_workflow", // commerce_products
  385: "catalog",              // commerce_storefronts (configured site/channel)
  386: "operational_workflow", // checkouts
  387: "operational_workflow", // payment_transactions
  388: "operational_workflow", // fulfillments
  389: "operational_workflow", // commerce_shipments
  390: "operational_workflow", // coupons
};

// ---- B6: intra-domain master->master relationships ----
// owner_side names the parent (lifecycle owner). Verb reads parent->child for one_to_many.
type Rel = { src: number; tgt: number; verb: string; inv: string;
             type: string; kind: string; required: boolean; owner: "source" | "target" };
const RELS: Rel[] = [
  // cart -> checkout (a checkout is started from a cart)
  { src: O.carts, tgt: O.checkouts, verb: "starts", inv: "originates from", type: "one_to_many", kind: "reference", required: false, owner: "source" },
  // checkout -> order (a completed checkout creates the order)
  { src: O.checkouts, tgt: O.orders, verb: "creates", inv: "originates from", type: "one_to_one", kind: "reference", required: false, owner: "source" },
  // order -> order_lines (composition: lines belong to the order)
  { src: O.orders, tgt: O.lines, verb: "contains", inv: "belongs to", type: "one_to_many", kind: "composition", required: true, owner: "source" },
  // order -> payment_transactions (order is paid by payments)
  { src: O.orders, tgt: O.payments, verb: "is paid by", inv: "pays for", type: "one_to_many", kind: "reference", required: false, owner: "source" },
  // order -> fulfillments (order is fulfilled by fulfillments)
  { src: O.orders, tgt: O.fulfillments, verb: "is fulfilled by", inv: "fulfills", type: "one_to_many", kind: "reference", required: false, owner: "source" },
  // fulfillment -> shipment (a fulfillment is shipped as shipments)
  { src: O.fulfillments, tgt: O.shipments, verb: "is shipped as", inv: "ships", type: "one_to_many", kind: "reference", required: false, owner: "source" },
  // order_lines -> commerce_products (a line references a product)
  { src: O.lines, tgt: O.products, verb: "references", inv: "is referenced by", type: "one_to_one", kind: "reference", required: true, owner: "target" },
  // storefront -> products (a product is listed on a storefront)
  { src: O.storefronts, tgt: O.products, verb: "lists", inv: "is listed on", type: "one_to_many", kind: "reference", required: false, owner: "source" },
  // coupons -> orders (a coupon is applied to an order)
  { src: O.coupons, tgt: O.orders, verb: "is applied to", inv: "applies", type: "one_to_many", kind: "reference", required: false, owner: "source" },
  // coupons -> order_lines (a coupon discounts a line)
  { src: O.coupons, tgt: O.lines, verb: "discounts", inv: "is discounted by", type: "one_to_many", kind: "reference", required: false, owner: "source" },
];

// ---- B7: users edges (Rule #10) ----
type UEdge = { master: number; verb: string; inv: string; };
const USER_EDGES: UEdge[] = [
  { master: O.orders, verb: "places", inv: "is placed by" },           // customer/shopper
  { master: O.carts, verb: "owns", inv: "is owned by" },               // shopper
  { master: O.checkouts, verb: "runs", inv: "is run by" },             // shopper
  { master: O.payments, verb: "initiates", inv: "is initiated by" },   // payer
  { master: O.storefronts, verb: "merchandises", inv: "is merchandised by" }, // merchandiser
  { master: O.products, verb: "manages", inv: "is managed by" },       // product owner
  { master: O.coupons, verb: "creates", inv: "is created by" },        // created_by
  { master: O.fulfillments, verb: "processes", inv: "is processed by" }, // fulfillment clerk
  { master: O.shipments, verb: "dispatches", inv: "is dispatched by" }, // carrier clerk
];

// ---- B11: aliases ----
const ALIASES: Record<number, string[]> = {
  381: ["Sales Order", "Web Order", "Purchase"],
  382: ["Line Item", "Order Item"],
  383: ["Basket", "Shopping Session"],
  384: ["Item", "SKU", "Catalog Item"],
  385: ["Site", "Sales Channel", "Channel"],
  386: ["Checkout Session", "Cart Session"],
  387: ["Charge", "Capture", "Authorization"],
  388: ["Pick Ticket", "Allocation"],
  389: ["Parcel", "Package"],
  390: ["Promo Code", "Voucher", "Promotion"],
};

// ---- B12: lifecycle states (8 workflow masters); module_id per realizing module ----
type LState = { name: string; order: number; initial?: boolean; terminal?: boolean;
                gate?: boolean; verb?: string };
const LIFECYCLE: Record<number, { module: number; states: LState[] }> = {
  383: { module: 214, states: [ // carts
    { name: "active", order: 10, initial: true },
    { name: "abandoned", order: 20, terminal: true },
    { name: "converted", order: 30, terminal: true },
    { name: "expired", order: 40, terminal: true },
  ]},
  386: { module: 214, states: [ // checkouts
    { name: "started", order: 10, initial: true },
    { name: "address_entered", order: 20 },
    { name: "shipping_quoted", order: 30 },
    { name: "payment_authorized", order: 40, gate: true },
    { name: "completed", order: 50, terminal: true },
    { name: "abandoned", order: 60, terminal: true },
  ]},
  381: { module: 214, states: [ // commerce_orders
    { name: "placed", order: 10, initial: true },
    { name: "confirmed", order: 20, gate: true },
    { name: "fulfilled", order: 30 },
    { name: "completed", order: 40, terminal: true },
    { name: "refunded", order: 50, gate: true, terminal: true },
    { name: "cancelled", order: 60, gate: true, terminal: true },
  ]},
  387: { module: 214, states: [ // payment_transactions
    { name: "authorized", order: 10, initial: true },
    { name: "captured", order: 20, gate: true },
    { name: "declined", order: 30, terminal: true },
    { name: "refunded", order: 40, gate: true, terminal: true },
    { name: "voided", order: 50, gate: true, terminal: true },
  ]},
  388: { module: 215, states: [ // fulfillments
    { name: "created", order: 10, initial: true },
    { name: "picked", order: 20 },
    { name: "packed", order: 30 },
    { name: "shipped", order: 40, gate: true },
    { name: "delivered", order: 50, terminal: true },
    { name: "returned", order: 60, gate: true, terminal: true },
  ]},
  389: { module: 215, states: [ // commerce_shipments
    { name: "created", order: 10, initial: true },
    { name: "in_transit", order: 20 },
    { name: "delivered", order: 30, terminal: true },
    { name: "exception", order: 40 },
    { name: "returned", order: 50, terminal: true },
  ]},
  384: { module: 213, states: [ // commerce_products
    { name: "draft", order: 10, initial: true },
    { name: "published", order: 20, gate: true },
    { name: "discontinued", order: 30, gate: true },
    { name: "archived", order: 40, terminal: true },
  ]},
  390: { module: 213, states: [ // coupons
    { name: "issued", order: 10, initial: true },
    { name: "redeemed", order: 20 },
    { name: "expired", order: 30, terminal: true },
    { name: "revoked", order: 40, gate: true, terminal: true },
  ]},
};

// ---- B10b: outbound source_domain_module_id backfill ----
// module = module that masters/holds the payload data_object
const OUT_FK: Record<number, number> = {
  66: 214, 67: 214, 75: 214, 322: 214, 323: 214, 324: 214, 325: 214, 326: 214,
  327: 214, 328: 214, 329: 214, 330: 214, 331: 214, 502: 214, 503: 215, 504: 213,
  505: 215, 506: 213,
};

// ---- B10b: inbound target_domain_module_id backfill (only where payload is in B2C-COMM DMDO) ----
const IN_FK: Record<number, number> = {
  80: 214,   // customers (contributor 214)
  492: 214,  // customer_invoices (consumer 214)
  1059: 213, // commerce_products (master 213)
  1234: 213, // commerce_products (master 213)
  1237: 213, // commerce_products (master 213)
};

async function main() {
  const log: string[] = [];
  const insert = async (table: string, rows: any[]) => {
    if (rows.length === 0) return;
    if (!WRITE) { log.push(`  [dry] would INSERT ${rows.length} -> ${table}`); return; }
    await pg("POST", `/${table}`, rows);
    log.push(`  INSERTed ${rows.length} -> ${table}`);
  };
  const patch = async (path: string, body: any, label: string) => {
    if (!WRITE) { log.push(`  [dry] would PATCH ${label}`); return; }
    await pg("PATCH", path, body);
    log.push(`  PATCHed ${label}`);
  };

  // B13 entity_type
  log.push("== B13 entity_type ==");
  for (const [id, et] of Object.entries(ENTITY_TYPE)) {
    await patch(`/data_objects?id=eq.${id}`, { entity_type: et }, `${NAME[+id]} -> ${et}`);
  }

  // B6 intra-domain relationships (idempotent: skip if a row src->tgt already exists)
  log.push("== B6 intra-domain relationships ==");
  const existingRels: any[] = await pg("GET",
    `/data_object_relationships?and=(data_object_id.in.(381,382,383,384,385,386,387,388,389,390),related_data_object_id.in.(381,382,383,384,385,386,387,388,389,390))&select=data_object_id,related_data_object_id`);
  const relKey = (a: number, b: number) => `${a}->${b}`;
  const relHave = new Set(existingRels.map((r: any) => relKey(r.data_object_id, r.related_data_object_id)));
  const relRows = RELS.filter(r => !relHave.has(relKey(r.src, r.tgt))).map(r => ({
    data_object_relationship_label: `${NAME[r.src]} ${r.verb} ${NAME[r.tgt]}`,
    data_object_id: r.src, related_data_object_id: r.tgt,
    relationship_verb: r.verb, inverse_verb: r.inv,
    relationship_type: r.type, relationship_kind: r.kind,
    is_required: r.required, owner_side: r.owner,
  }));
  await insert("data_object_relationships", relRows);

  // B7 users edges (users -> master, owner_side=source on users)
  log.push("== B7 users edges ==");
  const existingUE: any[] = await pg("GET",
    `/data_object_relationships?and=(data_object_id.eq.748,related_data_object_id.in.(381,382,383,384,385,386,387,388,389,390))&select=related_data_object_id`);
  const ueHave = new Set(existingUE.map((r: any) => r.related_data_object_id));
  const ueRows = USER_EDGES.filter(e => !ueHave.has(e.master)).map(e => ({
    data_object_relationship_label: `users ${e.verb} ${NAME[e.master]}`,
    data_object_id: USERS, related_data_object_id: e.master,
    relationship_verb: e.verb, inverse_verb: e.inv,
    relationship_type: "one_to_many", relationship_kind: "reference",
    is_required: false, owner_side: "source",
  }));
  await insert("data_object_relationships", ueRows);

  // B11 aliases
  log.push("== B11 aliases ==");
  const existingAl: any[] = await pg("GET",
    `/data_object_aliases?data_object_id=in.(381,382,383,384,385,386,387,388,389,390)&select=data_object_id,alias_name`);
  const alHave = new Set(existingAl.map((r: any) => `${r.data_object_id}|${r.alias_name.toLowerCase()}`));
  const alRows: any[] = [];
  for (const [id, names] of Object.entries(ALIASES)) {
    names.forEach((n, i) => {
      if (!alHave.has(`${id}|${n.toLowerCase()}`)) {
        alRows.push({ data_object_id: +id, alias_name: n, alias_type: "synonym", is_preferred: i === 0 });
      }
    });
  }
  await insert("data_object_aliases", alRows);

  // B12 lifecycle states
  log.push("== B12 lifecycle states ==");
  const existingLS: any[] = await pg("GET",
    `/data_object_lifecycle_states?data_object_id=in.(381,383,384,386,387,388,389,390)&select=data_object_id,state_name`);
  const lsHave = new Set(existingLS.map((r: any) => `${r.data_object_id}|${r.state_name}`));
  const lsRows: any[] = [];
  for (const [id, cfg] of Object.entries(LIFECYCLE)) {
    for (const s of cfg.states) {
      if (lsHave.has(`${id}|${s.name}`)) continue;
      lsRows.push({
        data_object_lifecycle_state_label: `${NAME[+id]}.${s.name}`,
        data_object_id: +id, state_name: s.name, state_order: s.order,
        is_initial: !!s.initial, is_terminal: !!s.terminal,
        requires_permission: !!s.gate,
        domain_module_id: cfg.module,
      });
    }
  }
  await insert("data_object_lifecycle_states", lsRows);

  // B10b outbound FK
  log.push("== B10b outbound source_domain_module_id ==");
  for (const [hid, mid] of Object.entries(OUT_FK)) {
    await patch(`/handoffs?id=eq.${hid}&source_domain_module_id=is.null`,
      { source_domain_module_id: mid }, `h${hid} source_module -> ${mid}`);
  }

  // B10b inbound FK
  log.push("== B10b inbound target_domain_module_id ==");
  for (const [hid, mid] of Object.entries(IN_FK)) {
    await patch(`/handoffs?id=eq.${hid}&target_domain_module_id=is.null`,
      { target_domain_module_id: mid }, `h${hid} target_module -> ${mid}`);
  }

  console.log(log.join("\n"));
  console.log(WRITE ? "\nAPPLIED." : "\nDRY RUN (pass --write to apply).");
}

main().catch((e) => { console.error(e); process.exit(1); });
