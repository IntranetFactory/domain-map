#!/usr/bin/env bun
// Phase C (functional ownership) + Phase S (domain skill + tools) for ACTIVITY-BOOKING (193).
// Modules: CORE=418, SCHED=419, WAIVERS=420, DIST=421.
import { $ } from "bun";
$.throws(false);
type Row = Record<string, unknown>;
async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`semantius failed: ${stderr}`);
  const t = stdout.trim(); return t ? JSON.parse(t) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>(); for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => { const o: Row = {}; for (const k of keys) o[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null; return o; });
}
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (!rows.length) return [];
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += 50) out.push(...await call({ method: "POST", path, body: uniformize(rows.slice(i, i + 50)) }));
  return out;
}

const DOM = 193, CORE = 418, SCHED = 419, WAIVERS = 420, DIST = 421;

// ============================================================ PHASE C
const bfd: [number, string][] = [
  [34, "owner"],        // Business Operations
  [21, "contributor"],  // Sales
  [22, "contributor"],  // Marketing
  [24, "consumer"],     // Customer Service
];

// ============================================================ PHASE S — skill
const skill = {
  skill_name: "activity-booking", skill_type: "domain", domain_id: DOM,
  description:
    "Manage a tour or activity operator end to end: publish bookable products and scheduled departures, take and confirm bookings, capture payments and issue refunds, assign guides and equipment to each trip, send and track liability waivers, message guests about their trips, and optionally distribute availability to online travel agencies.",
  trigger_keywords:
    "tour operator, activity booking, reservation system, online booking, restech, guided trip, outfitter, adventure booking, day tour, attraction ticketing, capacity management, availability calendar, e-waiver, manifest, OTA distribution, channel manager, rental booking, guide scheduling, no-show, walk-up, point of sale",
};

// ============================================================ PHASE S — tools
// name, operation_kind, data_object_name|null, description
type ToolSpec = { tool_name: string; operation_kind: string; data_object_name: string | null; description: string };
const newTools: ToolSpec[] = [
  { tool_name: "query_activity_products", operation_kind: "query", data_object_name: "activity_products", description: "Read activity products, their inclusions, capacity, and pricing structure." },
  { tool_name: "create_activity_product", operation_kind: "mutate", data_object_name: "activity_products", description: "Create or update a bookable activity product." },
  { tool_name: "query_activity_departures", operation_kind: "query", data_object_name: "activity_departures", description: "Read scheduled departures with their dates, remaining capacity, and assigned resources." },
  { tool_name: "query_activity_bookings", operation_kind: "query", data_object_name: "activity_bookings", description: "Read bookings with participants, rate options, price, and status." },
  { tool_name: "create_activity_booking", operation_kind: "mutate", data_object_name: "activity_bookings", description: "Create a booking against one or more departures." },
  { tool_name: "confirm_booking", operation_kind: "mutate", data_object_name: "activity_bookings", description: "Confirm a pending booking once payment or hold is accepted." },
  { tool_name: "cancel_booking", operation_kind: "mutate", data_object_name: "activity_bookings", description: "Cancel a booking, releasing capacity and assigned resources." },
  { tool_name: "approve_refund", operation_kind: "mutate", data_object_name: "booking_refunds", description: "Approve a requested refund or credit against a booking." },
  { tool_name: "query_booking_payments", operation_kind: "query", data_object_name: "booking_payments", description: "Read payment events against bookings, including capture and failure status." },
  { tool_name: "query_activity_reviews", operation_kind: "query", data_object_name: "activity_reviews", description: "Read post-trip guest reviews and operator responses." },
  { tool_name: "query_bookable_resources", operation_kind: "query", data_object_name: "bookable_resources", description: "Read guides, vehicles, boats, equipment, and rooms available to schedule." },
  { tool_name: "query_guide_assignments", operation_kind: "query", data_object_name: "guide_assignments", description: "Read which guides are assigned to which departures and their confirmation status." },
  { tool_name: "assign_guide", operation_kind: "mutate", data_object_name: "guide_assignments", description: "Propose or assign a guide or staff member to a departure." },
  { tool_name: "confirm_guide_assignment", operation_kind: "mutate", data_object_name: "guide_assignments", description: "Confirm a guide's assignment to a departure." },
  { tool_name: "query_equipment_rentals", operation_kind: "query", data_object_name: "equipment_rentals", description: "Read equipment and gear rentals and their checkout status." },
  { tool_name: "check_out_rental", operation_kind: "mutate", data_object_name: "equipment_rentals", description: "Check out rented equipment to a customer." },
  { tool_name: "query_liability_waivers", operation_kind: "query", data_object_name: "liability_waivers", description: "Read liability waivers and their signature status per participant." },
  { tool_name: "query_waiver_templates", operation_kind: "query", data_object_name: "waiver_templates", description: "Read the operator's waiver template definitions." },
  { tool_name: "query_channel_listings", operation_kind: "query", data_object_name: "channel_listings", description: "Read which products are listed on which distribution channels." },
  { tool_name: "query_reseller_partners", operation_kind: "query", data_object_name: "reseller_partners", description: "Read reseller and online-travel-agency partners and their terms." },
  { tool_name: "sync_channel_availability", operation_kind: "side_effect", data_object_name: null, description: "Push updated product availability out to connected distribution channels." },
];
// reused existing tools (do NOT recreate): query_customers=9, notify_person=913, sign_document=42

// domain_module_tools: [module, tool_name, requirement_level]
const dmt: [number, string, string][] = [
  // CORE
  [CORE, "query_activity_products", "required"],
  [CORE, "query_activity_departures", "required"],
  [CORE, "query_activity_bookings", "required"],
  [CORE, "create_activity_booking", "required"],
  [CORE, "confirm_booking", "required"],
  [CORE, "cancel_booking", "required"],
  [CORE, "approve_refund", "required"],
  [CORE, "query_booking_payments", "required"],
  [CORE, "query_customers", "required"],
  [CORE, "notify_person", "required"],
  [CORE, "create_activity_product", "optional"],
  [CORE, "query_activity_reviews", "optional"],
  // SCHED
  [SCHED, "query_bookable_resources", "required"],
  [SCHED, "query_guide_assignments", "required"],
  [SCHED, "assign_guide", "required"],
  [SCHED, "confirm_guide_assignment", "required"],
  [SCHED, "notify_person", "required"],
  [SCHED, "query_equipment_rentals", "optional"],
  [SCHED, "check_out_rental", "optional"],
  // WAIVERS
  [WAIVERS, "query_liability_waivers", "required"],
  [WAIVERS, "sign_document", "required"],
  [WAIVERS, "notify_person", "required"],
  [WAIVERS, "query_waiver_templates", "optional"],
  // DIST (optional module)
  [DIST, "query_channel_listings", "optional"],
  [DIST, "query_reseller_partners", "optional"],
  [DIST, "sync_channel_availability", "optional"],
];

async function main() {
  // ---- Phase C
  console.log("=== business_function_domains ===");
  const existBFD = await get(`/business_function_domains?domain_id=eq.${DOM}&select=business_function_id,responsibility_type&limit=100`);
  const bfdSet = new Set(existBFD.map(r => `${r.business_function_id}:${r.responsibility_type}`));
  const newBFD = bfd.filter(([f, r]) => !bfdSet.has(`${f}:${r}`)).map(([f, r]) => ({ business_function_id: f, domain_id: DOM, responsibility_type: r, notes: "" }));
  if (newBFD.length) { console.log(`  inserting ${newBFD.length}`); await insert("/business_function_domains", newBFD); } else console.log("  all present");

  // ---- Phase S: skill
  console.log("=== skills ===");
  const existSkill = await get(`/skills?domain_id=eq.${DOM}&skill_type=eq.domain&select=id,skill_name`);
  if (!existSkill.length) { console.log("  inserting domain skill"); await insert("/skills", [skill]); }
  else console.log(`  skill present (${existSkill[0].skill_name})`);

  // ---- Phase S: tools (resolve data_object ids)
  console.log("=== tools ===");
  const doNames = newTools.filter(t => t.data_object_name).map(t => t.data_object_name);
  const doRows = await get(`/data_objects?data_object_name=in.(${doNames.join(",")})&select=id,data_object_name`);
  const doMap = new Map<string, number>(); for (const r of doRows) doMap.set(String(r.data_object_name), Number(r.id));
  const existTools = await get(`/tools?select=id,tool_name&limit=20000`);
  const toolMap = new Map<string, number>(); for (const r of existTools) toolMap.set(String(r.tool_name), Number(r.id));
  const missingTools = newTools.filter(t => !toolMap.has(t.tool_name));
  if (missingTools.length) {
    console.log(`  inserting ${missingTools.length} tools`);
    await insert("/tools", missingTools.map(t => ({
      tool_name: t.tool_name, operation_kind: t.operation_kind, description: t.description,
      data_object_id: t.data_object_name ? doMap.get(t.data_object_name)! : null,
      coverage_tier: (t.operation_kind === "query" || t.operation_kind === "mutate") ? "platform" : "external",
    })));
  } else console.log("  all tools present");
  const allTools = await get(`/tools?select=id,tool_name&limit=20000`);
  toolMap.clear(); for (const r of allTools) toolMap.set(String(r.tool_name), Number(r.id));
  const tid = (n: string) => { const id = toolMap.get(n); if (!id) throw new Error(`no tool ${n}`); return id; };

  // ---- Phase S: domain_module_tools
  console.log("=== domain_module_tools ===");
  const modIds = [CORE, SCHED, WAIVERS, DIST].join(",");
  const existDMT = await get(`/domain_module_tools?domain_module_id=in.(${modIds})&select=domain_module_id,tool_id&limit=10000`);
  const dmtSet = new Set(existDMT.map(r => `${r.domain_module_id}:${r.tool_id}`));
  const newDMT = dmt.filter(([m, n]) => !dmtSet.has(`${m}:${tid(n)}`)).map(([m, n, lvl]) => ({ domain_module_id: m, tool_id: tid(n), requirement_level: lvl, notes: "" }));
  if (newDMT.length) { console.log(`  inserting ${newDMT.length}`); await insert("/domain_module_tools", newDMT); } else console.log("  all present");

  // ---- summary
  console.log("\n=== Phase C+S counts ===");
  console.log(JSON.stringify({
    business_function_domains: (await get(`/business_function_domains?domain_id=eq.${DOM}&select=id`)).length,
    skill: (await get(`/skills?domain_id=eq.${DOM}&skill_type=eq.domain&select=id`)).length,
    domain_module_tools: (await get(`/domain_module_tools?domain_module_id=in.(${modIds})&select=id&limit=10000`)).length,
    distinct_tools: new Set((await get(`/domain_module_tools?domain_module_id=in.(${modIds})&select=tool_id&limit=10000`)).map(r => r.tool_id)).size,
  }, null, 2));
}
await main();
