#!/usr/bin/env bun
// Idempotent modularization loader for B2C-COMM (Digital Commerce, domain_id 71).
// Scope: domain_modules + domain_module_capabilities + domain_module_data_objects ONLY.
// Reuses existing capabilities and data_objects. Creates NO new data_objects,
// capabilities, lifecycle states, skills, tools, handoffs, or relationships.
// Safe to re-run: every write checks its natural key first.

type Json = any;

const DOMAIN_ID = 71;

async function semantius(method: string, path: string, body?: Json): Promise<Json> {
  const arg: Json = { method, path };
  if (body !== undefined) arg.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(arg)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius ${method} ${path} failed: ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

// ---- Module specs (R18: describe by capability shape, no vendor/product names) ----
type ModuleSpec = {
  domain_module_name: string;
  domain_module_code: string;
  description: string;
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_name: "Catalog and Merchandising",
    domain_module_code: "B2C-COMM-CATALOG-MERCH",
    description:
      "Sellable-product catalog, storefront presentation, faceted search and discovery, and the promotion / coupon rules engine. Owns the merchandised catalog and the channel storefronts a shopper browses.",
  },
  {
    domain_module_name: "Order Capture",
    domain_module_code: "B2C-COMM-ORDER-CAPTURE",
    description:
      "Cart persistence, multi-step checkout, order placement and validation, order lines, and payment authorization. Includes headless commerce APIs and B2B purchasing flows (account hierarchies, quote-to-order, requisition lists). The transactional spine from cart to placed order.",
  },
  {
    domain_module_name: "Fulfillment and Shipping",
    domain_module_code: "B2C-COMM-FULFILL-SHIP",
    description:
      "Fulfillment instruction groups derived from order lines and the shipments that carry them to the customer, including carrier tracking, delivery status, and returns. Hands off to OMS / ERP for distributed fulfillment.",
  },
];

// ---- Capability links per module (capability ids resolved live by code) ----
const MODULE_CAPABILITY_CODES: Record<string, string[]> = {
  "B2C-COMM-CATALOG-MERCH": [
    "COMM-CATALOG-MERCH", // 302
    "COMM-STOREFRONT",    // 304
    "COMM-SEARCH-DISC",   // 307
    "COMM-PROMOTIONS",    // 306
  ],
  "B2C-COMM-ORDER-CAPTURE": [
    "COMM-CART-CHECKOUT", // 303
    "COMM-ORDER-CAPTURE", // 305
    "COMM-HEADLESS-API",  // 309
    "COMM-B2B-COMM",      // 308
  ],
  "B2C-COMM-FULFILL-SHIP": [
    "COMM-ORDER-CAPTURE", // 305 (fulfill/ship slice; also realized by ORDER-CAPTURE)
  ],
};

// ---- DMDO assignments per module (roles + necessity preserved from domain_data_objects) ----
type DMDORow = { data_object_name: string; role: string; necessity: string };

const MODULE_DMDO: Record<string, DMDORow[]> = {
  "B2C-COMM-CATALOG-MERCH": [
    { data_object_name: "commerce_products", role: "master", necessity: "required" },   // 384
    { data_object_name: "commerce_storefronts", role: "master", necessity: "required" },// 385
    { data_object_name: "coupons", role: "master", necessity: "required" },             // 390
    { data_object_name: "audience_segments", role: "consumer", necessity: "required" }, // 113
    { data_object_name: "marketing_campaigns", role: "consumer", necessity: "required" },// 116
  ],
  "B2C-COMM-ORDER-CAPTURE": [
    { data_object_name: "carts", role: "master", necessity: "required" },               // 383
    { data_object_name: "checkouts", role: "master", necessity: "required" },           // 386
    { data_object_name: "commerce_orders", role: "master", necessity: "required" },     // 381
    { data_object_name: "order_lines", role: "master", necessity: "required" },         // 382
    { data_object_name: "payment_transactions", role: "master", necessity: "required" },// 387
    { data_object_name: "customers", role: "contributor", necessity: "required" },      // 97
    { data_object_name: "crm_leads", role: "contributor", necessity: "required" },      // 99
    { data_object_name: "customer_events", role: "contributor", necessity: "required" },// 111
    { data_object_name: "customer_subscriptions", role: "consumer", necessity: "required" }, // 106
    { data_object_name: "customer_invoices", role: "consumer", necessity: "required" }, // 107
  ],
  "B2C-COMM-FULFILL-SHIP": [
    { data_object_name: "fulfillments", role: "master", necessity: "required" },        // 388
    { data_object_name: "commerce_shipments", role: "master", necessity: "required" },  // 389
  ],
};

async function main() {
  // ---------- Phase 0: resolve capability + data_object ids by natural key ----------
  const capCodes = [...new Set(Object.values(MODULE_CAPABILITY_CODES).flat())];
  const caps = await semantius(
    "GET",
    `/capabilities?capability_code=in.(${capCodes.join(",")})&select=id,capability_code`,
  );
  const capId = new Map<string, number>();
  for (const c of caps) capId.set(c.capability_code, c.id);
  for (const code of capCodes) {
    if (!capId.has(code)) throw new Error(`capability not found: ${code}`);
  }

  const doNames = [...new Set(Object.values(MODULE_DMDO).flatMap(rows => rows.map(r => r.data_object_name)))];
  const dobjs = await semantius(
    "GET",
    `/data_objects?data_object_name=in.(${doNames.join(",")})&select=id,data_object_name`,
  );
  const doId = new Map<string, number>();
  for (const d of dobjs) doId.set(d.data_object_name, d.id);
  for (const n of doNames) {
    if (!doId.has(n)) throw new Error(`data_object not found: ${n}`);
  }

  // ---------- Phase 1: domain_modules (idempotent on domain_module_code) ----------
  const existingMods = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`,
  );
  const existingCodes = new Set(existingMods.map((m: any) => m.domain_module_code));
  const modsToInsert = MODULES
    .filter(m => !existingCodes.has(m.domain_module_code))
    .map(m => ({
      domain_module_name: m.domain_module_name,
      domain_module_code: m.domain_module_code,
      description: m.description,
      domain_id: DOMAIN_ID,
      module_kind: "full",
      // record_status omitted (DB default 'new')
      // catalog_tagline / catalog_description omitted (left empty -> M8/A4 gap)
    }));
  if (modsToInsert.length) {
    await semantius("POST", "/domain_modules", modsToInsert);
    console.log(`+${modsToInsert.length} domain_modules: ${modsToInsert.map(m => m.domain_module_code).join(", ")}`);
  } else {
    console.log("domain_modules: all present, none inserted");
  }

  // Re-read modules to build code -> id map (never hard-code ids)
  const allMods = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`,
  );
  const modId = new Map<string, number>();
  for (const m of allMods) modId.set(m.domain_module_code, m.id);
  for (const m of MODULES) {
    if (!modId.has(m.domain_module_code)) throw new Error(`module not found after insert: ${m.domain_module_code}`);
  }

  // ---------- Phase 2: domain_module_capabilities (idempotent on (module_id, capability_id)) ----------
  let dmcInserted = 0;
  for (const [code, capCodeList] of Object.entries(MODULE_CAPABILITY_CODES)) {
    const mId = modId.get(code)!;
    const wantCapIds = capCodeList.map(c => capId.get(c)!);
    const existing = await semantius(
      "GET",
      `/domain_module_capabilities?domain_module_id=eq.${mId}&capability_id=in.(${wantCapIds.join(",")})&select=capability_id`,
    );
    const haveCapIds = new Set(existing.map((r: any) => r.capability_id));
    const toInsert = wantCapIds
      .filter(cid => !haveCapIds.has(cid))
      .map(cid => ({ domain_module_id: mId, capability_id: cid }));
    if (toInsert.length) {
      await semantius("POST", "/domain_module_capabilities", toInsert);
      dmcInserted += toInsert.length;
      console.log(`+${toInsert.length} DMC on ${code}`);
    }
  }
  if (dmcInserted === 0) console.log("domain_module_capabilities: all present, none inserted");

  // ---------- Phase 3: domain_module_data_objects (idempotent on (module_id, data_object_id)) ----------
  let dmdoInserted = 0;
  for (const [code, rows] of Object.entries(MODULE_DMDO)) {
    const mId = modId.get(code)!;
    const wantDoIds = rows.map(r => doId.get(r.data_object_name)!);
    const existing = await semantius(
      "GET",
      `/domain_module_data_objects?domain_module_id=eq.${mId}&data_object_id=in.(${wantDoIds.join(",")})&select=data_object_id`,
    );
    const haveDoIds = new Set(existing.map((r: any) => r.data_object_id));
    const toInsert = rows
      .filter(r => !haveDoIds.has(doId.get(r.data_object_name)!))
      .map(r => ({
        domain_module_id: mId,
        data_object_id: doId.get(r.data_object_name)!,
        role: r.role,
        necessity: r.necessity,
        // auto label + notes omitted (R15: notes stays empty)
      }));
    if (toInsert.length) {
      await semantius("POST", "/domain_module_data_objects", toInsert);
      dmdoInserted += toInsert.length;
      console.log(`+${toInsert.length} DMDO on ${code}`);
    }
  }
  if (dmdoInserted === 0) console.log("domain_module_data_objects: all present, none inserted");

  console.log("\nDone.");
}

main().catch(e => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
