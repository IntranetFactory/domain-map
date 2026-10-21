#!/usr/bin/env bun
// Phase A — Market shape for ACTIVITY-BOOKING (Tours, Activities & Experiences Booking).
// 1 domain, 7 capabilities, 4 full modules, 8 vendors, 10 solutions, plus junctions
// (capability_domains, domain_module_capabilities, solution_domains).
// Idempotent: reads natural keys first, only inserts missing rows.

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
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
async function get(path: string): Promise<Row[]> { return call({ method: "GET", path }); }

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => {
    const out: Row = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const result = await call({ method: "POST", path, body: uniformize(rows.slice(i, i + CHUNK)) });
    out.push(...result);
  }
  return out;
}
async function syncTable<T extends Row>(path: string, rows: T[], keyField: keyof T & string): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new rows into ${path} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} present, nothing to insert`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// ============================================================ DOMAIN
const domainRow = {
  domain_code: "ACTIVITY-BOOKING",
  domain_name: "Tours, Activities & Experiences Booking",
  description:
    "Software market for operator-side reservation and operations management of tours, activities, attractions, rentals, and guided adventure trips. Covers real-time availability and capacity, online and counter booking, resource and guide scheduling, digital liability waivers, integrated payments, gift cards and refunds, customer communications and reviews, and optional distribution to online travel agencies. Distinct from Corporate Travel Management (the corporate buyer side of trip sourcing) and from Short-Term and Vacation Rental Management (lodging inventory): this domain owns the sale and delivery of a scheduled, capacity-limited experience and the people and equipment that fulfill it.",
  crud_percentage: 80,
  business_logic:
    "Real-time availability and capacity allocation across shared resources, overbooking prevention, seasonal and dynamic rate rules, guide and equipment assignment against availability, and channel-availability synchronization go beyond plain CRUD plus state workflows.",
  min_org_size: "10 xs <50",
  cost_band: "$",
  certification_required: false,
  usa_market_size_usd_m: 300,
  market_size_source_year: 2025,
  catalog_tagline:
    "Sell, schedule, and run your tours and activities: take bookings, manage availability and guides, collect waivers, and get paid, all in one place.",
  catalog_description:
    "Run your entire tour or activity business from one system. Publish your trips and experiences, show real-time availability online, and let customers book and pay from your website or at the counter. Prevent overbookings, assign guides and equipment to each departure, and collect signed liability waivers before guests arrive. Process payments, issue gift cards, and handle refunds and cancellations without juggling separate tools. Built for day-tour operators, attractions, rental shops, and guided-adventure outfitters alike, with optional distribution to online travel agencies when you want to reach more customers.",
};

function validateDomainRow(d: typeof domainRow): void {
  const bad =
    d.crud_percentage === 0 || d.min_org_size === "" || d.cost_band === "" ||
    (d.business_logic === "" && d.crud_percentage < 95) ||
    d.usa_market_size_usd_m === 0 || d.market_size_source_year === 0;
  if (bad) throw new Error(`Domain row ${d.domain_code} fails metadata validation (Rule #8)`);
}

// ============================================================ CAPABILITIES
const capabilities = [
  { capability_code: "AB-RESERVATIONS", capability_name: "Online Reservation and Booking Management",
    description: "Publishing of bookable products and scheduled departures, capture of bookings from web, phone, and counter, management of participants, add-ons, and promo codes, and the full booking lifecycle through cancellation and rebooking." },
  { capability_code: "AB-AVAILABILITY", capability_name: "Real-Time Availability and Capacity Management",
    description: "Real-time availability calendars, capacity limits per departure, shared-resource constraints, and overbooking prevention across products that draw on the same guides, equipment, or rooms." },
  { capability_code: "AB-GUIDE-SCHED", capability_name: "Guide and Resource Scheduling",
    description: "Scheduling and assignment of guides, staff, equipment, vehicles, and lodging to departures, tracking availability and certifications, and confirming assignments with the people involved." },
  { capability_code: "AB-WAIVERS", capability_name: "Digital Waiver and Liability Management",
    description: "Authoring of activity-specific liability waivers, electronic signature capture on any device, guardian signing for minors, and retention of signed releases tied to each booking and participant." },
  { capability_code: "AB-PAYMENTS", capability_name: "Booking Payments, Refunds and Gift Cards",
    description: "Collection of deposits and full payments, tokenized card processing, gift cards and vouchers, promo and discount handling, and refunds and chargebacks on cancellation." },
  { capability_code: "AB-DISTRIBUTION", capability_name: "Channel and OTA Distribution",
    description: "Listing of products and availability on online travel agencies and reseller marketplaces, management of reseller partners and commission agreements, and synchronization of channel bookings back to a single calendar." },
  { capability_code: "AB-ENGAGE", capability_name: "Customer Communications, Reviews and Marketing",
    description: "Automated booking confirmations and reminders, post-trip review solicitation, customer records and history, and abandoned-cart and conversion marketing for direct bookings." },
];

// ============================================================ MODULES
const modules = [
  { domain_module_code: "AB-RESERVATION-CORE", domain_module_name: "Reservation and Booking Core",
    description: "The core booking engine: products, departures, rate options, bookings, participants, add-ons, promo codes, gift cards, payments, refunds, customers, manifests, notifications, reviews, and reports. Deployable standalone for simple operators; embeds guide/resource assignments and waiver status when those modules are present.",
    catalog_tagline: "Take and manage bookings online and at the counter, with real-time availability, payments, gift cards, and guest messaging.",
    catalog_description: "The heart of your booking operation. Publish products and departures, show live availability, and capture bookings from your website, the phone, or a walk-up counter. Collect payments, sell gift cards, apply promo codes, and process refunds and cancellations. Keep a roster for every departure, message guests automatically, and see how the business is performing. Works on its own for simple operators and pairs with scheduling and waivers when you need them." },
  { domain_module_code: "AB-RESOURCE-SCHED", domain_module_name: "Resource and Guide Scheduling",
    description: "Schedules the people and equipment behind each departure: bookable resources, guide assignments, equipment rentals, lodging units, and trip itineraries. The adventure and multi-day differentiator; separable so general day-tour operators can run the core without it.",
    catalog_tagline: "Assign guides, equipment, vehicles, and lodging to every trip, and prevent double-booking your resources.",
    catalog_description: "Schedule the people and gear behind each departure. Track guide availability and certifications, auto-assign or hand-pick guides for each trip, and confirm them by text. Manage rentable equipment, vehicles, and rooms as bookable resources so you never double-book a raft, a van, or a bunk. Built for multi-day and guided-adventure operators who sell an experience, not just a seat." },
  { domain_module_code: "AB-WAIVERS", domain_module_name: "Waivers and Liability",
    description: "Captures and stores signed liability releases tied to bookings and participants, with custom waiver templates, electronic signature, and guardian signing for minors. A clean regulated boundary, often a separately licensed integration in this market.",
    catalog_tagline: "Send, collect, and store signed liability waivers tied to every booking and participant.",
    catalog_description: "Capture the legal paperwork every guest needs to sign before they take part. Build custom waivers with the questions and acknowledgements your activity requires, send them ahead of time, and let guests sign on any device. Handle minors with guardian signatures, and keep every signed release stored against the right booking and participant so it is there if you ever need it." },
  { domain_module_code: "AB-CHANNEL-DIST", domain_module_name: "Channel and OTA Distribution",
    description: "Distributes products and availability to online travel agencies and reseller marketplaces, manages reseller partners and commission agreements, and syncs channel bookings back to the operator calendar. Optional: many operators sell direct only, so its masters are optional-necessity.",
    catalog_tagline: "List your activities on online travel agencies and reseller marketplaces, and keep availability in sync.",
    catalog_description: "Reach more customers by selling through online travel agencies and reseller partners. Push your products and live availability out to the channels you choose, manage reseller agreements and commission rates, and pull channel bookings back into one calendar so availability stays accurate everywhere. Run it only when you want to grow beyond direct bookings." },
];

// capability -> module(s) that realize it
const capModule: Record<string, string[]> = {
  "AB-RESERVATIONS": ["AB-RESERVATION-CORE"],
  "AB-AVAILABILITY": ["AB-RESERVATION-CORE"],
  "AB-PAYMENTS": ["AB-RESERVATION-CORE"],
  "AB-ENGAGE": ["AB-RESERVATION-CORE"],
  "AB-GUIDE-SCHED": ["AB-RESOURCE-SCHED"],
  "AB-WAIVERS": ["AB-WAIVERS"],
  "AB-DISTRIBUTION": ["AB-CHANNEL-DIST"],
};

// ============================================================ VENDORS
const vendors = [
  { vendor_name: "FareHarbor", vendor_url: "https://fareharbor.com", headquarters_country: "USA",
    description: "Booking and business-management software for tours, activities, rentals, and attractions. A subsidiary of Booking Holdings.", notes: "" },
  { vendor_name: "Peek Travel Inc.", vendor_url: "https://www.peek.com", headquarters_country: "USA",
    description: "Experiences booking and operations platform (Peek Pro) for tours, activities, rentals, and attractions, with a marketplace at Peek.com.", notes: "" },
  { vendor_name: "Expedition Software Holding", vendor_url: "https://www.rezdy.com", headquarters_country: "USA",
    description: "Holding company for the merged tour-and-activity reservation brands Rezdy, Checkfront, and Regiondo, serving operators across Oceania, North America, and Europe.", notes: "" },
  { vendor_name: "Tripadvisor, Inc.", vendor_url: "https://www.bokun.io", headquarters_country: "USA",
    description: "Travel-guidance company; parent of the Viator experiences marketplace and the Bokun booking-and-channel-management platform for operators.", notes: "" },
  { vendor_name: "Xola, Inc.", vendor_url: "https://www.xola.com", headquarters_country: "USA",
    description: "All-in-one booking, operations, and marketing platform for tour, activity, and attraction operators.", notes: "" },
  { vendor_name: "Fullsteam", vendor_url: "https://www.theflybook.com", headquarters_country: "USA",
    description: "Payments-and-software holding company; parent of The Flybook, a reservation platform purpose-built for outdoor-recreation and adventure operators.", notes: "" },
  { vendor_name: "Resmark Systems", vendor_url: "https://www.resmarksystems.com", headquarters_country: "USA",
    description: "Tour-booking and reservation software for adventure operators, an early entrant in modeling multi-day trips as a first-class product.", notes: "" },
  { vendor_name: "Origin", vendor_url: "https://exploreorigin.com", headquarters_country: "USA",
    description: "All-in-one operating system for outdoor experience businesses, built for guiding companies and outfitters, with guide scheduling, bookings, and free digital waivers. Founded in Denver in 2020.", notes: "" },
];

// ============================================================ SOLUTIONS
type SolutionSpec = { solution_name: string; vendor: string; description: string; notes?: string; primary?: string[]; secondary?: string[]; partial?: string[]; };
const solutions: SolutionSpec[] = [
  { solution_name: "FareHarbor", vendor: "FareHarbor", description: "Reservation and business-management software for tours, activities, rentals, and attractions, with online booking, dashboard operations, and OTA distribution.", primary: ["ACTIVITY-BOOKING"] },
  { solution_name: "Peek Pro", vendor: "Peek Travel Inc.", description: "Operator platform for booking, point of sale, automation, waivers, and marketing for experiences, with distribution to the Peek.com marketplace.", primary: ["ACTIVITY-BOOKING"] },
  { solution_name: "Rezdy", vendor: "Expedition Software Holding", description: "Distribution-first reservation system with a large B2B agent marketplace for tour and activity operators.", primary: ["ACTIVITY-BOOKING"] },
  { solution_name: "Checkfront", vendor: "Expedition Software Holding", description: "Flexible reservation software for mixed inventory across tours, rentals, and accommodation.", primary: ["ACTIVITY-BOOKING"], secondary: ["STR-MGMT"] },
  { solution_name: "Regiondo", vendor: "Expedition Software Holding", description: "All-in-one booking and channel-distribution platform for European leisure and attraction operators, with gift-voucher commerce.", primary: ["ACTIVITY-BOOKING"] },
  { solution_name: "Bokun", vendor: "Tripadvisor, Inc.", description: "Booking engine and channel manager for operators, with deep distribution through Viator and other online travel agencies.", primary: ["ACTIVITY-BOOKING"] },
  { solution_name: "Xola", vendor: "Xola, Inc.", description: "All-in-one booking, operations, and conversion-marketing platform for tours, activities, and attractions.", primary: ["ACTIVITY-BOOKING"] },
  { solution_name: "The Flybook", vendor: "Fullsteam", description: "Reservation, rentals, and ticketing platform purpose-built for adventure parks, outfitters, lodges, and outdoor-recreation operators.", primary: ["ACTIVITY-BOOKING"], secondary: ["STR-MGMT"] },
  { solution_name: "Resmark", vendor: "Resmark Systems", description: "Adventure and tour booking suite covering single-day and multi-day trips, with itinerary management, waivers, and customer communications.", primary: ["ACTIVITY-BOOKING"] },
  { solution_name: "Origin", vendor: "Origin", description: "All-in-one operating system for outdoor businesses: bookings, real-time availability, purpose-built guide scheduling with automated text confirmations, and free custom digital waivers.", primary: ["ACTIVITY-BOOKING"] },
];

// ============================================================ RUN
async function main() {
  validateDomainRow(domainRow);

  console.log("\n=== Domain ===");
  await syncTable("/domains", [domainRow], "domain_code");
  const allDomainsRaw = await get("/domains?select=id,domain_code&limit=10000");
  const domId = new Map<string, number>();
  for (const d of allDomainsRaw) domId.set(String(d.domain_code), Number(d.id));
  const abId = domId.get("ACTIVITY-BOOKING")!;

  console.log("\n=== Capabilities ===");
  const capMap = await syncTable("/capabilities", capabilities.map(c => ({ capability_code: c.capability_code, capability_name: c.capability_name, description: c.description })), "capability_code");

  console.log("\n=== capability_domains ===");
  const existingCD = await get("/capability_domains?select=capability_id,domain_id&limit=10000");
  const cdSet = new Set(existingCD.map(r => `${r.capability_id}:${r.domain_id}`));
  const newCD: Row[] = [];
  for (const c of capabilities) {
    const cid = capMap.get(c.capability_code)!;
    if (cdSet.has(`${cid}:${abId}`)) continue;
    newCD.push({ capability_id: cid, domain_id: abId, notes: "" });
  }
  if (newCD.length) { console.log(`  inserting ${newCD.length} capability_domains`); await insert("/capability_domains", newCD); }
  else console.log("  no new capability_domains");

  console.log("\n=== Modules ===");
  const modMap = await syncTable("/domain_modules", modules.map(m => ({ ...m, domain_id: abId, module_kind: "full" })), "domain_module_code");

  console.log("\n=== domain_module_capabilities ===");
  const existingDMC = await get("/domain_module_capabilities?select=domain_module_id,capability_id&limit=10000");
  const dmcSet = new Set(existingDMC.map(r => `${r.domain_module_id}:${r.capability_id}`));
  const newDMC: Row[] = [];
  for (const [capCode, modCodes] of Object.entries(capModule)) {
    const cid = capMap.get(capCode)!;
    for (const mc of modCodes) {
      const mid = modMap.get(mc)!;
      if (dmcSet.has(`${mid}:${cid}`)) continue;
      newDMC.push({ domain_module_id: mid, capability_id: cid, notes: "" });
    }
  }
  if (newDMC.length) { console.log(`  inserting ${newDMC.length} domain_module_capabilities`); await insert("/domain_module_capabilities", newDMC); }
  else console.log("  no new domain_module_capabilities");

  console.log("\n=== Vendors ===");
  const vendorMap = await syncTable("/vendors", vendors.map(v => ({ ...v })), "vendor_name");

  console.log("\n=== Solutions ===");
  const solutionRows = solutions.map(s => {
    const vid = vendorMap.get(s.vendor);
    if (!vid) throw new Error(`Vendor not found for solution ${s.solution_name}: ${s.vendor}`);
    return { solution_name: s.solution_name, description: s.description, solution_url: "", vendor_id: vid, solution_type: "saas", is_active_in_market: true, solution_kind: "standard_solution", notes: s.notes ?? "" };
  });
  const solMap = await syncTable("/solutions", solutionRows, "solution_name");

  console.log("\n=== solution_domains ===");
  const existingSD = await get("/solution_domains?select=solution_id,domain_id,coverage_level&limit=10000");
  const sdSet = new Set(existingSD.map(r => `${r.solution_id}:${r.domain_id}:${r.coverage_level}`));
  const newSD: Row[] = [];
  for (const s of solutions) {
    const sid = solMap.get(s.solution_name)!;
    const link = (code: string, cov: string) => {
      const did = domId.get(code);
      if (!did) { console.warn(`  ! domain ${code} not found for ${s.solution_name}`); return; }
      const key = `${sid}:${did}:${cov}`;
      if (sdSet.has(key)) return;
      sdSet.add(key);
      newSD.push({ solution_id: sid, domain_id: did, coverage_level: cov, notes: "" });
    };
    for (const c of s.primary ?? []) link(c, "primary");
    for (const c of s.secondary ?? []) link(c, "secondary");
    for (const c of s.partial ?? []) link(c, "partial");
  }
  if (newSD.length) { console.log(`  inserting ${newSD.length} solution_domains`); await insert("/solution_domains", newSD); }
  else console.log("  no new solution_domains");

  console.log("\n=== Counts (ACTIVITY-BOOKING) ===");
  const counts = {
    domain: (await get(`/domains?domain_code=eq.ACTIVITY-BOOKING&select=id`)).length,
    capability_domains: (await get(`/capability_domains?domain_id=eq.${abId}&select=capability_id`)).length,
    modules: (await get(`/domain_modules?domain_id=eq.${abId}&select=id`)).length,
    domain_module_capabilities: (await get(`/domain_module_capabilities?domain_module_id=in.(${[...modMap.values()].join(",")})&select=id`)).length,
    solution_domains: (await get(`/solution_domains?domain_id=eq.${abId}&select=solution_id`)).length,
  };
  console.log(JSON.stringify(counts, null, 2));
  console.log("\nModule ids:", JSON.stringify(Object.fromEntries(modMap)));
  console.log("Domain id:", abId);
}
await main();
