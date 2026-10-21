#!/usr/bin/env bun
// fix_b2c_comm_b1a_2026_06_05.ts
//
// Executes the two agent-solvable b1a items for B2C-COMM (domains.id=71):
//
//   B1A-MODULE-SKILLS-UX (skills/tools half only — the catalog-UX half is Rule #20
//                         user-gated and stays OPEN; drafted in the report):
//     1. Create 3 module-level system skills (Rule #17 / F2), one per module
//        213 (CATALOG-MERCH) / 214 (ORDER-CAPTURE) / 215 (FULFILL-SHIP).
//     2. Redistribute the 23 skill_tools rows from legacy domain-level skill 24
//        across the 3 new skills per the B1B-S10 partition (F3).
//     3. Swap send_email (tool 37) for notify_person (tool 913) on the
//        order-capture agent (B1B-S11 / F7 channel-vs-capability rule).
//     4. DELETE legacy skill 24 and its skill_tools rows (F1).
//
//   B1A-H1-CORE (H1 APQC tagging):
//     5. INSERT 6 confident agent_curated handoff_processes rows, idempotent on
//        the natural key (handoff_id, process_id).
//
// All inserts omit record_status (DB default 'new'). role='implements',
// proposal_source='agent_curated' on handoff_processes. No `notes` written
// anywhere (Rule #15). Idempotent: every step reads first, writes only what is
// missing; the legacy-skill teardown is guarded on existence.
//
//   bun run c:/dev/domain-map/.tmp_deploy/fix_b2c_comm_b1a_2026_06_05.ts          -> DRY RUN
//   bun run c:/dev/domain-map/.tmp_deploy/fix_b2c_comm_b1a_2026_06_05.ts --apply  -> LIVE

export {};

const APPLY = process.argv.includes("--apply");
type Row = Record<string, unknown>;

async function call(body: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(body)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius ${body.method} ${body.path} (exit ${code}): ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}
const get = (path: string) => call({ method: "GET", path });
async function post(path: string, rows: Row[]): Promise<any[]> {
  if (rows.length === 0) return [];
  if (!APPLY) { console.log(`  [DRY] POST ${rows.length} -> ${path}`); return []; }
  const CHUNK = 50;
  const out: any[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const r = await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) });
    if (Array.isArray(r)) out.push(...r);
  }
  return out;
}
async function del(path: string): Promise<void> {
  if (!APPLY) { console.log(`  [DRY] DELETE ${path}`); return; }
  await call({ method: "DELETE", path });
}

console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}\n`);

const DOMAIN_ID = 71;
const LEGACY_SKILL_ID = 24;

// ----------------------------------------------------------------------------
// Module ids (re-read live; never hard-code)
// ----------------------------------------------------------------------------
const modRows: Row[] = (await get(`/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`)) ?? [];
const modId: Record<string, number> = {};
for (const r of modRows) modId[String(r.domain_module_code)] = Number(r.id);
console.log(`Modules: ${Object.entries(modId).map(([k, v]) => `${k}=${v}`).join(", ")}`);

const CATALOG = modId["B2C-COMM-CATALOG-MERCH"];
const ORDER = modId["B2C-COMM-ORDER-CAPTURE"];
const FULFILL = modId["B2C-COMM-FULFILL-SHIP"];
if (!CATALOG || !ORDER || !FULFILL) throw new Error("Module ids not all resolved; aborting.");

// ----------------------------------------------------------------------------
// Tool ids by name (re-read live)
// ----------------------------------------------------------------------------
const toolNames = [
  "query_customers", "query_customer_subscriptions",
  "query_orders", "query_order_lines", "query_carts", "query_products",
  "query_storefronts", "query_checkouts", "query_payment_transactions",
  "query_fulfillments", "query_shipments", "query_coupons",
  "create_order", "update_order_status", "refund_order", "create_cart",
  "create_checkout", "create_product", "update_product", "create_shipment",
  "create_coupon", "execute_payment", "notify_person", "send_email",
];
const toolRows: Row[] = (await get(`/tools?tool_name=in.(${toolNames.join(",")})&select=id,tool_name`)) ?? [];
const toolId: Record<string, number> = {};
for (const r of toolRows) toolId[String(r.tool_name)] = Number(r.id);
for (const n of toolNames) if (!toolId[n]) console.log(`  WARN tool unresolved: ${n}`);

// ----------------------------------------------------------------------------
// 1+2+3. Skills + skill_tools partition (B1B-S10 + B1B-S11)
// ----------------------------------------------------------------------------
type Pair = { tool: string; level: "required" | "optional" };
type SkillSpec = {
  name: string;
  module: number;
  description: string;
  tools: Pair[];
};
const skills: SkillSpec[] = [
  {
    name: "b2c-comm-catalog-merch-system",
    module: CATALOG,
    description:
      "Per-module system skill for the catalog and merchandising backbone of Digital Commerce. Masters products, storefronts, and coupons; covers product authoring, catalog publication, storefront configuration, and promotion setup.",
    tools: [
      { tool: "query_products", level: "required" },
      { tool: "query_storefronts", level: "required" },
      { tool: "query_coupons", level: "required" },
      { tool: "create_product", level: "required" },
      { tool: "update_product", level: "required" },
      { tool: "create_coupon", level: "required" },
    ],
  },
  {
    name: "b2c-comm-order-capture-system",
    module: ORDER,
    description:
      "Per-module system skill for the order-capture spine of Digital Commerce: cart, checkout, order, order line, and payment workflows. Reads the shared customer and subscription masters; payment capture is executed via an external gateway.",
    tools: [
      { tool: "query_orders", level: "required" },
      { tool: "query_order_lines", level: "required" },
      { tool: "query_carts", level: "required" },
      { tool: "query_checkouts", level: "required" },
      { tool: "query_payment_transactions", level: "required" },
      { tool: "query_customers", level: "required" },
      { tool: "query_customer_subscriptions", level: "optional" },
      { tool: "create_order", level: "required" },
      { tool: "update_order_status", level: "required" },
      { tool: "refund_order", level: "required" },
      { tool: "create_cart", level: "required" },
      { tool: "create_checkout", level: "required" },
      { tool: "execute_payment", level: "required" },
      // B1B-S11: notify_person replaces send_email for the generic
      // order/cart/payment notification surface (channel-vs-capability default).
      { tool: "notify_person", level: "required" },
    ],
  },
  {
    name: "b2c-comm-fulfill-ship-system",
    module: FULFILL,
    description:
      "Per-module system skill for the fulfillment and shipping slice of Digital Commerce. Masters fulfillments and shipments; covers pick/pack/ship orchestration and carrier shipment creation.",
    tools: [
      { tool: "query_fulfillments", level: "required" },
      { tool: "query_shipments", level: "required" },
      { tool: "create_shipment", level: "required" },
    ],
  },
];

// Partition completeness self-check against the 23 legacy tools (22 carried +
// send_email which becomes notify_person). execute_payment(43) and the two
// customer reads (9,24) live on order-capture.
const carried = new Set<string>();
for (const s of skills) for (const p of s.tools) carried.add(p.tool);
const expectCarried = [
  "query_products", "query_storefronts", "query_coupons", "create_product", "update_product", "create_coupon",
  "query_orders", "query_order_lines", "query_carts", "query_checkouts", "query_payment_transactions",
  "query_customers", "query_customer_subscriptions", "create_order", "update_order_status", "refund_order",
  "create_cart", "create_checkout", "execute_payment", "notify_person",
  "query_fulfillments", "query_shipments", "create_shipment",
];
for (const t of expectCarried) if (!carried.has(t)) throw new Error(`Partition missing ${t}`);
console.log(`Partition: ${carried.size} distinct tools across 3 skills (expected 23).`);

console.log("\n=== 1. skills (3 module-level system skills) ===");
const existingSkills: Row[] = (await get(`/skills?skill_name=in.(${skills.map((s) => s.name).join(",")})&select=id,skill_name`)) ?? [];
const skillId: Record<string, number> = {};
for (const r of existingSkills) skillId[String(r.skill_name)] = Number(r.id);

for (const s of skills) {
  if (skillId[s.name]) { console.log(`  recycle ${s.name} (id=${skillId[s.name]})`); continue; }
  console.log(`  insert ${s.name} -> module ${s.module}`);
  const res = await post("/skills", [{
    skill_name: s.name,
    description: s.description,
    skill_type: "system",
    domain_id: DOMAIN_ID,
    domain_module_id: s.module,
  }]);
  if (APPLY && res[0]) skillId[s.name] = Number(res[0].id);
}
// re-read to resolve ids after insert
if (APPLY) {
  const after: Row[] = (await get(`/skills?skill_name=in.(${skills.map((s) => s.name).join(",")})&select=id,skill_name`)) ?? [];
  for (const r of after) skillId[String(r.skill_name)] = Number(r.id);
}

console.log("\n=== 2. skill_tools (redistribution) ===");
const sids = skills.map((s) => skillId[s.name]).filter(Boolean);
const existingST: Row[] = sids.length
  ? (await get(`/skill_tools?skill_id=in.(${sids.join(",")})&select=skill_id,tool_id`)) ?? []
  : [];
const seenST = new Set(existingST.map((r) => `${r.skill_id}:${r.tool_id}`));

const stPayload: Row[] = [];
for (const s of skills) {
  const sid = skillId[s.name];
  if (!sid) { console.log(`  skip ${s.name} (skill id unresolved in dry run)`); continue; }
  for (const p of s.tools) {
    const tid = toolId[p.tool];
    if (!tid) { console.log(`  WARN ${s.name} -> ${p.tool} unresolved`); continue; }
    if (seenST.has(`${sid}:${tid}`)) continue;
    stPayload.push({ skill_id: sid, tool_id: tid, requirement_level: p.level });
  }
}
console.log(`  ${stPayload.length} skill_tools rows to insert.`);
await post("/skill_tools", stPayload);

// ----------------------------------------------------------------------------
// 4. Retire legacy skill 24 (F1). Snapshot already captured in history.md.
//    Delete its skill_tools first (reversible/explicit), then the skill.
// ----------------------------------------------------------------------------
console.log("\n=== 3. retire legacy skill 24 ===");
const legacy: Row[] = (await get(`/skills?id=eq.${LEGACY_SKILL_ID}&select=id`)) ?? [];
if (legacy.length === 0) {
  console.log("  legacy skill 24 already gone.");
} else {
  console.log("  deleting skill_tools for skill 24");
  await del(`/skill_tools?skill_id=eq.${LEGACY_SKILL_ID}`);
  console.log("  deleting skill 24");
  await del(`/skills?id=eq.${LEGACY_SKILL_ID}`);
}

// ----------------------------------------------------------------------------
// 5. B1A-H1-CORE: 6 handoff_processes rows
// ----------------------------------------------------------------------------
console.log("\n=== 4. handoff_processes (B1A-H1-CORE) ===");
const hpSpecs: Array<{ handoff_id: number; process_id: number }> = [
  { handoff_id: 326, process_id: 1422 }, // commerce_order.refunded -> Process and distribute payments
  { handoff_id: 331, process_id: 150 },  // commerce_order.placed -> Manage sales orders
  { handoff_id: 504, process_id: 115 },  // commerce_product.published -> Manage product/service master data
  { handoff_id: 93, process_id: 115 },   // content_entry.published -> Manage product/service master data
  { handoff_id: 96, process_id: 113 },   // content_release.published -> Manage product/service life cycle
  { handoff_id: 492, process_id: 1422 }, // customer_invoice.issued -> Process and distribute payments
];
const hpExisting: Row[] = (await get(
  `/handoff_processes?handoff_id=in.(${hpSpecs.map((h) => h.handoff_id).join(",")})&select=handoff_id,process_id`,
)) ?? [];
const hpSeen = new Set(hpExisting.map((r) => `${r.handoff_id}:${r.process_id}`));
const hpPayload: Row[] = [];
for (const h of hpSpecs) {
  if (hpSeen.has(`${h.handoff_id}:${h.process_id}`)) { console.log(`  recycle h${h.handoff_id} -> ${h.process_id}`); continue; }
  hpPayload.push({
    handoff_id: h.handoff_id,
    process_id: h.process_id,
    role: "implements",
    proposal_source: "agent_curated",
    // record_status omitted -> DB default 'new'
  });
}
console.log(`  ${hpPayload.length} handoff_processes rows to insert.`);
await post("/handoff_processes", hpPayload);

console.log(`\nDone (${APPLY ? "live" : "dry run"}).`);
