#!/usr/bin/env bun
// Phase A-S initial build for MARINA-MGMT (Marina Management).
// Modeled on load_str_mgmt_2026_06_14.ts (modern modular single-file shape).
// Idempotent: natural-key syncTable for keyed entities, composite-key syncJunction
// for junctions. record_status omitted everywhere -> DB default 'new' (Rule #1).
// Run: bun run .tmp_deploy/load_marina_mgmt_2026_06_15.ts

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
const get = (path: string) => call({ method: "GET", path });

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
    const slice = uniformize(rows.slice(i, i + CHUNK));
    out.push(...(await call({ method: "POST", path, body: slice })));
  }
  return out;
}
async function syncTable(path: string, rows: Row[], keyField: string): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const have = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !have.has(String(r[keyField])));
  if (missing.length) { console.log(`  ${path}: inserting ${missing.length} (had ${existing.length})`); await insert(path, missing); }
  else console.log(`  ${path}: all ${existing.length} present`);
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const m = new Map<string, number>();
  for (const r of all) m.set(String(r[keyField]), Number(r.id));
  return m;
}
async function syncJunction(path: string, rows: Row[], keyCols: string[]): Promise<void> {
  const sel = keyCols.join(",");
  const existing = await get(`${path}?select=${sel}&limit=20000`);
  const have = new Set(existing.map(r => keyCols.map(c => String(r[c])).join("|")));
  const missing = rows.filter(r => !have.has(keyCols.map(c => String(r[c])).join("|")));
  if (missing.length) { console.log(`  ${path}: inserting ${missing.length} (had ${existing.length})`); await insert(path, missing); }
  else console.log(`  ${path}: all ${existing.length} present`);
}
function validateDomainRow(d: Row) {
  const cp = Number(d.crud_percentage);
  if (!(cp > 0)) throw new Error("crud_percentage must be > 0");
  if (!d.min_org_size) throw new Error("min_org_size empty");
  if (!d.cost_band) throw new Error("cost_band empty");
  if (!(Number(d.usa_market_size_usd_m) > 0)) throw new Error("usa_market_size_usd_m must be > 0");
  if (!(Number(d.market_size_source_year) > 0)) throw new Error("market_size_source_year must be > 0");
  if (cp < 95 && !String(d.business_logic ?? "").trim()) throw new Error("business_logic required when crud<95");
}

const USERS_ID = 748;
const USA_JURISDICTION_ID = 3;
const BF = { BIZOPS: 34, CUST_SVC: 24, SALES: 21, FINANCE: 4, FIELD_SVC: 51 };

// ============================================================ DOMAIN
const domain = {
  domain_code: "MARINA-MGMT",
  domain_name: "Marina Management",
  description:
    "Software market for operating marinas, boatyards, and dry-stack facilities: slip, berth, mooring, and rack inventory and assignment; transient, seasonal, and waitlisted reservations; recurring slip contracts with metered electric and water billing; boater and vessel records; boatyard service, haul-out, and launch scheduling; and fuel-dock and ship-store point of sale. Serves marina operators, yacht clubs, municipal harbors, and dry-stack storage businesses. Distinct from long-term residential property management and from hotel property management systems.",
  crud_percentage: 80,
  business_logic:
    "Slip-fit assignment matching vessel length, beam, and draft to berth dimensions and utilities; availability-calendar reconciliation across transient, seasonal, and waitlist demand to prevent double-booking of slips, moorings, and racks; metered-utility billing math turning electric and water sub-meter reads into invoice lines; seasonal, transient, and long-term rate and proration rules; fuel-dock inventory and pump reconciliation; and dry-stack launch scheduling against forklift and rack capacity.",
  min_org_size: "10 xs <50",
  cost_band: "$$",
  certification_required: false,
  usa_market_size_usd_m: 150,
  market_size_source_year: 2024,
  catalog_tagline:
    "Run your marina end to end: assign slips and storage, take reservations, bill boaters and meter utilities, schedule the boatyard, and sell fuel, all in one place.",
  catalog_description:
    "Operate a marina, boatyard, or dry-stack facility from a single system. Lay out your docks, slips, moorings, and racks, then assign each vessel by fit and keep an accurate availability calendar across transient, seasonal, and waitlisted demand. Take reservations and transient bookings, manage boater and vessel records with insurance and registration on file, and bill on recurring contracts with metered electric and water charges. Schedule haul-outs, launches, and boatyard work orders, run the fuel dock and ship store, and keep owners and boaters informed automatically.",
};

// ============================================================ CAPABILITIES
const capabilities = [
  { capability_code: "MARINA-SLIP-INVENTORY", capability_name: "Slip, Berth and Mooring Inventory", description: "Lay out and maintain the physical estate: docks, slips, moorings, and storage units, with dimensions, utilities, and slip-size classes, and assign vessels by fit." },
  { capability_code: "MARINA-DRY-STORAGE", capability_name: "Dry Stack and Boat Storage", description: "Manage dry-stack rack and land storage positions, capacity, and the launch-on-demand queue for stored vessels." },
  { capability_code: "MARINA-RESERVATIONS", capability_name: "Reservations and Transient Booking", description: "Capture, confirm, modify, and cancel transient and seasonal reservations, with check-in/out and a waitlist for full periods." },
  { capability_code: "MARINA-BOATER-CRM", capability_name: "Boater and Vessel Management", description: "Maintain boater and vessel records with contact details, vessel particulars, and insurance and registration documents on file." },
  { capability_code: "MARINA-CONTRACTS-BILLING", capability_name: "Slip Contracts and Recurring Billing", description: "Manage seasonal and annual slip contracts, recurring charges, house accounts, invoices, and metered electric and water utility billing." },
  { capability_code: "MARINA-BOATYARD-SVC", capability_name: "Boatyard Service and Haul-Out", description: "Run boatyard work orders, service estimates, haul-out and launch scheduling, and Clean Vessel Act pump-out logging." },
  { capability_code: "MARINA-FUEL-DOCK", capability_name: "Fuel Dock Management", description: "Sell marine fuel, reconcile fuel-tank inventory, and meet storage-tank record-keeping requirements." },
  { capability_code: "MARINA-RETAIL-POS", capability_name: "Ship Store and Point of Sale", description: "Sell non-fuel retail at the ship store and post charges to boater accounts." },
];

// ============================================================ VENDORS + SOLUTIONS
const vendors = [
  { vendor_name: "Dockwa", vendor_url: "https://dockwa.com", headquarters_country: "USA", description: "Marina reservation and transient-booking platform with a boater-facing marketplace and operator marina-management tools." },
  { vendor_name: "Storable", vendor_url: "https://www.storable.com", headquarters_country: "USA", description: "Storage-technology vendor; Molo is its all-in-one marina and dry-stack management platform." },
  { vendor_name: "Valsoft", vendor_url: "https://www.valsoftcorp.com", headquarters_country: "Canada", description: "Vertical-software holding company; owns DockMaster, a full marine ERP for marinas, boatyards, and dealerships." },
  { vendor_name: "IRM Pacific", vendor_url: "https://www.marina-master.com", headquarters_country: "Slovenia", description: "Developer of Marina Master, an international all-in-one berth-management, reservation, and yacht-club platform." },
  { vendor_name: "Scribble Software", vendor_url: "https://www.scribblesoftware.com", headquarters_country: "USA", description: "Developer of MarinaOffice and MARINAGO, with deep metered-utility billing and fuel point of sale." },
];
type SOL = { solution_name: string; vendor: string; description: string; solution_url: string };
const solutions: SOL[] = [
  { solution_name: "Dockwa", vendor: "Dockwa", solution_url: "https://dockwa.com", description: "Cloud marina-management and transient-reservation platform: reservations, contracts, dry stack, fuel, and a boater booking marketplace." },
  { solution_name: "Molo", vendor: "Storable", solution_url: "https://getmolo.com", description: "All-in-one marina and dry-stack space-management platform: slips, racks, contracts, billing, work orders, and fuel." },
  { solution_name: "DockMaster", vendor: "Valsoft", solution_url: "https://www.dockmaster.com", description: "Marine ERP for marinas and boatyards: reservations, service, parts inventory, accounting, fuel, and POS." },
  { solution_name: "Marina Master", vendor: "IRM Pacific", solution_url: "https://www.marina-master.com", description: "International berth-management platform: interactive reservations, CRM, accounting, boatyard, and yacht club." },
  { solution_name: "MarinaOffice", vendor: "Scribble Software", solution_url: "https://www.marinaoffice.net", description: "Marina-management suite with deep metered-utility billing, visual marina layout, and integrated fuel POS." },
];

// ============================================================ MODULES
const modules = [
  { domain_module_code: "MARINA-MGMT-INVENTORY", domain_module_name: "Slip, Berth and Storage Inventory",
    description: "Masters the physical estate: marinas, docks, slips, moorings, dry-stack racks, and storage units, plus slip-size classes and vessel-to-slip assignment. Deployable standalone for a facility that only needs to lay out and assign space.",
    catalog_tagline: "Map every dock, slip, mooring, and rack, then assign each vessel to the right space by fit.",
    catalog_description: "Build a visual layout of your marina: docks, slips, moorings, dry-stack racks, and land storage, each with dimensions, utilities, and a size class. Assign vessels to spaces by length, beam, and draft, and keep a clear picture of what is open, occupied, or out of service across the whole facility." },
  { domain_module_code: "MARINA-MGMT-RESERVATIONS", domain_module_name: "Reservations and Transient Booking",
    description: "Masters reservations, transient and seasonal bookings, and the slip waitlist. Captures demand against the inventory, runs check-in and check-out, and offers freed space to waitlisted boaters. Embeds slip, boater, and vessel shells.",
    catalog_tagline: "Take transient and seasonal bookings, check boats in and out, and offer freed slips to your waitlist.",
    catalog_description: "Capture reservations and transient bookings against your available space, confirm them, and run check-in and check-out as boats arrive and leave. When a slip frees up, offer it to the next boater on the waitlist automatically, so you fill space and keep guests moving." },
  { domain_module_code: "MARINA-MGMT-CRM", domain_module_name: "Boater and Vessel Management",
    description: "Masters boaters and vessels with insurance and registration documents. The shared customer-and-asset record other modules embed. Deployable standalone as a boater directory.",
    catalog_tagline: "Keep every boater and vessel on file, with insurance and registration current and at hand.",
    catalog_description: "Maintain a clean directory of boaters and their vessels, with contact details, vessel particulars, and the documents you are required to keep: certificates of insurance and state or federal registrations. Expiring paperwork is easy to spot, so you keep coverage current across the marina." },
  { domain_module_code: "MARINA-MGMT-BILLING", domain_module_name: "Contracts, Billing and Utilities",
    description: "Masters seasonal and annual slip contracts, recurring charges, house accounts, dockage invoices, and metered electric and water utilities. Rolls reservation and contract activity into boater billing. Embeds slip, boater, and reservation shells.",
    catalog_tagline: "Put boaters on recurring contracts, meter their electric and water, and bill it all accurately every cycle.",
    catalog_description: "Place boaters on seasonal or annual slip contracts with recurring charges and house accounts, and turn submetered electric and water readings into accurate utility lines. Generate dockage invoices for contracts, transient stays, and yard work, collect payments, and keep each boater's account balance clear." },
  { domain_module_code: "MARINA-MGMT-SERVICE", domain_module_name: "Boatyard Service and Haul-Out",
    description: "Masters boatyard work orders, service estimates, haul-out jobs, dry-stack launch requests, and Clean Vessel Act pump-out logs. Embeds vessel and slip shells. Deployable standalone for a service yard.",
    catalog_tagline: "Quote and run boatyard work, schedule haul-outs and launches, and log every pump-out.",
    catalog_description: "Estimate and approve boatyard jobs, open work orders, and track them from request through completion and billing. Schedule haul-outs, splashes, and dry-stack launches against your lift and forklift capacity, and keep the pump-out logs the Clean Vessel Act and your grants require." },
  { domain_module_code: "MARINA-MGMT-FUEL-RETAIL", domain_module_name: "Fuel Dock and Ship Store",
    description: "Masters fuel sales, fuel tanks, fuel-inventory reconciliation logs, and ship-store point-of-sale transactions. Embeds the boater shell so sales post to accounts. Deployable standalone for a fuel dock and store.",
    catalog_tagline: "Run the fuel dock and ship store, post sales to boater accounts, and keep fuel inventory reconciled.",
    catalog_description: "Sell marine fuel and ship-store retail, charge it to a boater's house account or take payment on the spot, and keep fuel-tank inventory reconciled against deliveries and pump totals so your records stand up to a storage-tank inspection." },
];
const moduleCaps: Record<string, string[]> = {
  "MARINA-MGMT-INVENTORY": ["MARINA-SLIP-INVENTORY", "MARINA-DRY-STORAGE"],
  "MARINA-MGMT-RESERVATIONS": ["MARINA-RESERVATIONS"],
  "MARINA-MGMT-CRM": ["MARINA-BOATER-CRM"],
  "MARINA-MGMT-BILLING": ["MARINA-CONTRACTS-BILLING"],
  "MARINA-MGMT-SERVICE": ["MARINA-BOATYARD-SVC"],
  "MARINA-MGMT-FUEL-RETAIL": ["MARINA-FUEL-DOCK", "MARINA-RETAIL-POS"],
};

// ============================================================ MASTERS (data_objects + DMDO master rows + lifecycle + aliases derived)
type State = { name: string; order: number; init?: boolean; term?: boolean; rp?: boolean; verb?: string };
type Master = {
  obj: string; sing: string; plur: string; et: string; module: string; nec: string;
  pc?: boolean; sl?: boolean; sa?: boolean;
  desc: string; states?: State[]; aliases?: string[];
};
const masters: Master[] = [
  // ---- INVENTORY ----
  { obj: "marina_slips", sing: "Slip", plur: "Slips", et: "operational_workflow", module: "MARINA-MGMT-INVENTORY", nec: "required",
    desc: "A wet berth at a dock: number, dock, length/beam/draft limits, utilities (power, water), and service status.",
    states: [ { name: "available", order: 1, init: true }, { name: "occupied", order: 2 }, { name: "out_of_service", order: 3, rp: true, verb: "take_slip_out_of_service" }, { name: "retired", order: 4, term: true } ],
    aliases: ["berth", "dock slip", "wet slip"] },
  { obj: "marina_moorings", sing: "Mooring", plur: "Moorings", et: "operational_record", module: "MARINA-MGMT-INVENTORY", nec: "optional",
    desc: "A mooring ball in a mooring field: position, tackle, weight rating, and assigned vessel.", aliases: ["mooring ball", "mooring"] },
  { obj: "dry_stack_racks", sing: "Dry Stack Rack", plur: "Dry Stack Racks", et: "operational_record", module: "MARINA-MGMT-INVENTORY", nec: "optional",
    desc: "A rack position in a dry-stack storage building: bay, level, and maximum vessel length and weight.", aliases: ["rack", "dry stack position"] },
  { obj: "storage_units", sing: "Storage Unit", plur: "Storage Units", et: "operational_record", module: "MARINA-MGMT-INVENTORY", nec: "optional",
    desc: "A land or trailer storage space for a vessel kept ashore: location, size, and assigned vessel.", aliases: ["land storage", "trailer storage"] },
  { obj: "slip_size_classes", sing: "Slip Size Class", plur: "Slip Size Classes", et: "catalog", module: "MARINA-MGMT-INVENTORY", nec: "optional",
    desc: "A configured size class for slips and racks (length and beam bands) used for fit rules and rate lookup.", aliases: ["size class"] },
  { obj: "slip_assignments", sing: "Slip Assignment", plur: "Slip Assignments", et: "junction", module: "MARINA-MGMT-INVENTORY", nec: "optional",
    desc: "The placement of a specific vessel in a specific slip, mooring, or rack for a period, linking inventory to a reservation or contract.", aliases: ["berth assignment"] },
  // ---- RESERVATIONS ----
  { obj: "slip_reservations", sing: "Reservation", plur: "Reservations", et: "operational_workflow", module: "MARINA-MGMT-RESERVATIONS", nec: "required",
    desc: "A request to dock or store a vessel for a transient or seasonal period: dates, vessel, requested space, rate, and check-in/out status.",
    states: [ { name: "inquiry", order: 1, init: true }, { name: "confirmed", order: 2, rp: true, verb: "confirm_reservation" }, { name: "checked_in", order: 3, rp: true, verb: "check_in_vessel" }, { name: "checked_out", order: 4 }, { name: "cancelled", order: 5, term: true } ],
    aliases: ["transient booking", "dockage reservation", "slip booking"] },
  { obj: "slip_waitlist_entries", sing: "Slip Waitlist Entry", plur: "Slip Waitlist Entries", et: "operational_workflow", module: "MARINA-MGMT-RESERVATIONS", nec: "optional",
    desc: "A boater's place in line for a slip type or period that is currently full, with offer and expiry tracking.",
    states: [ { name: "waiting", order: 1, init: true }, { name: "offered", order: 2, rp: true, verb: "offer_slip" }, { name: "accepted", order: 3, term: true }, { name: "expired", order: 4, term: true } ],
    aliases: ["slip waitlist"] },
  // ---- CRM ----
  { obj: "boaters", sing: "Boater", plur: "Boaters", et: "operational_record", module: "MARINA-MGMT-CRM", nec: "required", pc: true,
    desc: "A marina customer: contact details, communication preferences, account balance, and the vessels and contracts they hold.",
    aliases: ["customer", "member", "slip holder"] },
  { obj: "vessels", sing: "Vessel", plur: "Vessels", et: "operational_record", module: "MARINA-MGMT-CRM", nec: "required",
    desc: "A boat on file at the marina: name, type, length, beam, draft, hull identification, and owning boater.",
    aliases: ["boat", "yacht"] },
  { obj: "vessel_insurance_documents", sing: "Vessel Insurance Document", plur: "Vessel Insurance Documents", et: "operational_record", module: "MARINA-MGMT-CRM", nec: "optional",
    desc: "A certificate of insurance on file for a vessel: insurer, policy number, liability limits, and expiry, required by most slip and storage contracts.",
    aliases: ["COI", "certificate of insurance"] },
  { obj: "vessel_registrations", sing: "Vessel Registration", plur: "Vessel Registrations", et: "operational_record", module: "MARINA-MGMT-CRM", nec: "optional",
    desc: "A state, Coast Guard, or documented-vessel registration record verified for a vessel: registration number, jurisdiction, and expiry.",
    aliases: ["registration", "documentation number"] },
  // ---- BILLING ----
  { obj: "slip_contracts", sing: "Slip Contract", plur: "Slip Contracts", et: "operational_workflow", module: "MARINA-MGMT-BILLING", nec: "required",
    desc: "A seasonal or annual agreement licensing a slip, mooring, or rack to a boater: term, rate, included utilities, and renewal terms.",
    states: [ { name: "draft", order: 1, init: true }, { name: "active", order: 2, rp: true, verb: "activate_contract" }, { name: "renewed", order: 3 }, { name: "expired", order: 4, term: true }, { name: "terminated", order: 5, term: true } ],
    aliases: ["seasonal agreement", "dockage contract", "slip lease", "storage agreement"] },
  { obj: "recurring_charges", sing: "Recurring Charge", plur: "Recurring Charges", et: "operational_record", module: "MARINA-MGMT-BILLING", nec: "optional",
    desc: "A scheduled charge generated from a contract: dockage, storage, or service fees billed on a periodic cadence.", aliases: ["recurring fee"] },
  { obj: "utility_meters", sing: "Utility Meter", plur: "Utility Meters", et: "operational_record", module: "MARINA-MGMT-BILLING", nec: "optional",
    desc: "A submeter on a slip or pedestal measuring electric or water consumption for pass-through billing.", aliases: ["sub-meter", "pedestal meter"] },
  { obj: "meter_readings", sing: "Meter Reading", plur: "Meter Readings", et: "operational_record", module: "MARINA-MGMT-BILLING", nec: "optional",
    desc: "A periodic read of a utility meter, manual or wireless, that becomes a billable utility line.", aliases: ["meter read"] },
  { obj: "dockage_invoices", sing: "Dockage Invoice", plur: "Dockage Invoices", et: "operational_workflow", module: "MARINA-MGMT-BILLING", nec: "optional",
    desc: "An invoice issued to a boater for dockage, storage, utilities, fuel, or service, with payment status.",
    states: [ { name: "draft", order: 1, init: true }, { name: "issued", order: 2, rp: true, verb: "issue_invoice" }, { name: "paid", order: 3, term: true }, { name: "overdue", order: 4 } ],
    aliases: ["dockage invoice", "marina invoice"] },
  { obj: "boater_house_accounts", sing: "Boater House Account", plur: "Boater House Accounts", et: "operational_record", module: "MARINA-MGMT-BILLING", nec: "optional",
    desc: "A running on-account balance for a boater that fuel, store, and service charges post to and that is settled periodically.", aliases: ["house account", "on-account balance"] },
  // ---- SERVICE ----
  { obj: "boatyard_work_orders", sing: "Boatyard Work Order", plur: "Boatyard Work Orders", et: "operational_workflow", module: "MARINA-MGMT-SERVICE", nec: "required",
    desc: "A boatyard service job on a vessel: repairs, winterization, detailing, or commissioning, with labor, parts, and status.",
    states: [ { name: "requested", order: 1, init: true }, { name: "scheduled", order: 2, rp: true, verb: "schedule_work_order" }, { name: "in_progress", order: 3 }, { name: "completed", order: 4, rp: true, verb: "complete_work_order" }, { name: "invoiced", order: 5, term: true }, { name: "cancelled", order: 6, term: true } ],
    aliases: ["service order", "yard ticket", "repair order"] },
  { obj: "service_estimates", sing: "Service Estimate", plur: "Service Estimates", et: "operational_workflow", module: "MARINA-MGMT-SERVICE", nec: "optional",
    desc: "A quoted estimate for boatyard work: scope, labor hours, parts, and price, approved by the boater before work begins.",
    states: [ { name: "draft", order: 1, init: true }, { name: "sent", order: 2 }, { name: "approved", order: 3, rp: true, verb: "approve_estimate" }, { name: "converted", order: 4, term: true }, { name: "declined", order: 5, term: true } ],
    aliases: ["work estimate", "service quote"] },
  { obj: "haul_out_jobs", sing: "Haul-Out Job", plur: "Haul-Out Jobs", et: "operational_workflow", module: "MARINA-MGMT-SERVICE", nec: "optional",
    desc: "A scheduled lift of a vessel out of and back into the water using a travel lift or crane, with stands time on the hard.",
    states: [ { name: "scheduled", order: 1, init: true }, { name: "hauled", order: 2 }, { name: "on_stands", order: 3 }, { name: "splashed", order: 4, rp: true, verb: "splash_vessel" }, { name: "closed", order: 5, term: true } ],
    aliases: ["haul-out", "lift-out"] },
  { obj: "dry_stack_launch_requests", sing: "Dry Stack Launch Request", plur: "Dry Stack Launch Requests", et: "operational_workflow", module: "MARINA-MGMT-SERVICE", nec: "optional",
    desc: "A request to launch a dry-stacked vessel for use and return it to its rack, scheduled against forklift capacity.",
    states: [ { name: "requested", order: 1, init: true }, { name: "queued", order: 2 }, { name: "launched", order: 3, rp: true, verb: "launch_from_rack" }, { name: "returned", order: 4, term: true } ],
    aliases: ["launch request", "splash request"] },
  { obj: "pump_out_logs", sing: "Pump-Out Log", plur: "Pump-Out Logs", et: "operational_record", module: "MARINA-MGMT-SERVICE", nec: "optional",
    desc: "A record of a sewage pump-out for a vessel, kept for Clean Vessel Act grant reporting and state mandates.", aliases: ["pump-out log", "sewage pump-out record"] },
  // ---- FUEL-RETAIL ----
  { obj: "fuel_sales", sing: "Fuel Sale", plur: "Fuel Sales", et: "operational_record", module: "MARINA-MGMT-FUEL-RETAIL", nec: "optional",
    desc: "A fuel-dock transaction: product (gas or diesel), gallons, pump, price, and the boater or vessel charged.", aliases: ["fuel ticket", "fuel transaction"] },
  { obj: "fuel_tanks", sing: "Fuel Tank", plur: "Fuel Tanks", et: "operational_record", module: "MARINA-MGMT-FUEL-RETAIL", nec: "optional",
    desc: "A bulk fuel storage tank at the marina: product, capacity, and current volume, reconciled against deliveries and sales.", aliases: ["bulk tank"] },
  { obj: "fuel_inventory_logs", sing: "Fuel Inventory Log", plur: "Fuel Inventory Logs", et: "operational_record", module: "MARINA-MGMT-FUEL-RETAIL", nec: "optional",
    desc: "A reconciliation record for a fuel tank: opening volume, deliveries, pump totals, closing stick reading, and variance, kept for storage-tank compliance.", aliases: ["fuel reconciliation", "tank log"] },
  { obj: "pos_transactions", sing: "Ship Store Sale", plur: "Ship Store Sales", et: "operational_record", module: "MARINA-MGMT-FUEL-RETAIL", nec: "optional",
    desc: "A ship-store retail sale of non-fuel goods, paid at the register or posted to a boater house account.", aliases: ["ship store sale", "retail sale"] },
];

// embedded_master shells per module (role=embedded_master)
type Embed = { module: string; obj: string; nec: string };
const embeds: Embed[] = [
  { module: "MARINA-MGMT-RESERVATIONS", obj: "marina_slips", nec: "required" },
  { module: "MARINA-MGMT-RESERVATIONS", obj: "boaters", nec: "required" },
  { module: "MARINA-MGMT-RESERVATIONS", obj: "vessels", nec: "required" },
  { module: "MARINA-MGMT-BILLING", obj: "marina_slips", nec: "required" },
  { module: "MARINA-MGMT-BILLING", obj: "boaters", nec: "required" },
  { module: "MARINA-MGMT-BILLING", obj: "slip_reservations", nec: "optional" },
  { module: "MARINA-MGMT-SERVICE", obj: "vessels", nec: "required" },
  { module: "MARINA-MGMT-SERVICE", obj: "marina_slips", nec: "optional" },
  { module: "MARINA-MGMT-FUEL-RETAIL", obj: "boaters", nec: "optional" },
];

// ============================================================ RELATIONSHIPS (intra + users)
type REL = { a: string; b: string; type: string; kind: string; verb: string; inv: string; req: boolean; owner: string };
const rels: REL[] = [
  { a: "marina_slips", b: "slip_assignments", type: "one_to_many", kind: "composition", verb: "holds", inv: "is in", req: false, owner: "source" },
  { a: "vessels", b: "slip_assignments", type: "one_to_many", kind: "reference", verb: "is placed via", inv: "places", req: false, owner: "target" },
  { a: "marina_slips", b: "slip_reservations", type: "one_to_many", kind: "reference", verb: "is booked as", inv: "books", req: false, owner: "source" },
  { a: "boaters", b: "vessels", type: "one_to_many", kind: "reference", verb: "owns", inv: "is owned by", req: true, owner: "source" },
  { a: "boaters", b: "slip_reservations", type: "one_to_many", kind: "reference", verb: "makes", inv: "is made by", req: true, owner: "source" },
  { a: "vessels", b: "slip_reservations", type: "one_to_many", kind: "reference", verb: "is booked for", inv: "is for", req: true, owner: "source" },
  { a: "boaters", b: "slip_contracts", type: "one_to_many", kind: "reference", verb: "holds", inv: "is held by", req: true, owner: "source" },
  { a: "marina_slips", b: "slip_contracts", type: "one_to_many", kind: "reference", verb: "is leased as", inv: "leases", req: false, owner: "source" },
  { a: "slip_contracts", b: "recurring_charges", type: "one_to_many", kind: "composition", verb: "generates", inv: "is generated by", req: false, owner: "source" },
  { a: "boaters", b: "dockage_invoices", type: "one_to_many", kind: "reference", verb: "is invoiced", inv: "is for", req: true, owner: "source" },
  { a: "slip_contracts", b: "dockage_invoices", type: "one_to_many", kind: "reference", verb: "is billed on", inv: "bills", req: false, owner: "source" },
  { a: "boaters", b: "boater_house_accounts", type: "one_to_one", kind: "composition", verb: "has", inv: "belongs to", req: false, owner: "source" },
  { a: "marina_slips", b: "utility_meters", type: "one_to_many", kind: "composition", verb: "is metered by", inv: "meters", req: false, owner: "source" },
  { a: "utility_meters", b: "meter_readings", type: "one_to_many", kind: "composition", verb: "has", inv: "belongs to", req: true, owner: "source" },
  { a: "marina_slips", b: "slip_waitlist_entries", type: "one_to_many", kind: "reference", verb: "has waitlist", inv: "waits for", req: false, owner: "source" },
  { a: "vessels", b: "boatyard_work_orders", type: "one_to_many", kind: "reference", verb: "undergoes", inv: "is for", req: false, owner: "source" },
  { a: "boatyard_work_orders", b: "service_estimates", type: "one_to_many", kind: "reference", verb: "is quoted by", inv: "quotes", req: false, owner: "source" },
  { a: "vessels", b: "haul_out_jobs", type: "one_to_many", kind: "reference", verb: "is hauled in", inv: "hauls", req: false, owner: "source" },
  { a: "vessels", b: "dry_stack_launch_requests", type: "one_to_many", kind: "reference", verb: "is launched via", inv: "launches", req: false, owner: "source" },
  { a: "dry_stack_racks", b: "vessels", type: "one_to_many", kind: "reference", verb: "stores", inv: "is stored in", req: false, owner: "source" },
  { a: "vessels", b: "pump_out_logs", type: "one_to_many", kind: "reference", verb: "receives", inv: "is for", req: false, owner: "source" },
  { a: "vessels", b: "vessel_registrations", type: "one_to_many", kind: "composition", verb: "has", inv: "belongs to", req: false, owner: "source" },
  { a: "vessels", b: "vessel_insurance_documents", type: "one_to_many", kind: "composition", verb: "has", inv: "belongs to", req: false, owner: "source" },
  { a: "fuel_tanks", b: "fuel_sales", type: "one_to_many", kind: "reference", verb: "supplies", inv: "is drawn from", req: false, owner: "source" },
  { a: "fuel_tanks", b: "fuel_inventory_logs", type: "one_to_many", kind: "composition", verb: "is reconciled by", inv: "reconciles", req: false, owner: "source" },
  { a: "boaters", b: "fuel_sales", type: "one_to_many", kind: "reference", verb: "purchases", inv: "is purchased by", req: false, owner: "source" },
  { a: "boaters", b: "pos_transactions", type: "one_to_many", kind: "reference", verb: "makes", inv: "is made by", req: false, owner: "source" },
  // users edges (Rule #10)
  { a: "users", b: "slip_reservations", type: "one_to_many", kind: "reference", verb: "manages", inv: "is managed by", req: false, owner: "source" },
  { a: "users", b: "slip_assignments", type: "one_to_many", kind: "reference", verb: "assigns", inv: "is assigned by", req: false, owner: "source" },
  { a: "users", b: "boatyard_work_orders", type: "one_to_many", kind: "reference", verb: "is responsible for", inv: "is handled by", req: false, owner: "source" },
  { a: "users", b: "dockage_invoices", type: "one_to_many", kind: "reference", verb: "prepares", inv: "is prepared by", req: false, owner: "source" },
  { a: "users", b: "dry_stack_launch_requests", type: "one_to_many", kind: "reference", verb: "fulfills", inv: "is fulfilled by", req: false, owner: "source" },
];

// ============================================================ TRIGGER EVENTS + HANDOFFS (intra-domain)
// NOTE: event_names are entity-scoped (slip_reservation.*, slip_contract.*, boatyard_work_order.*)
// to avoid collision with foreign domains' generic events (reservation.*, work_order.* already
// belong to STR-MGMT / FSM and point at their data_objects).
const triggerEvents = [
  { event_name: "slip_reservation.confirmed", obj: "slip_reservations", from_state: "inquiry", to_state: "confirmed", event_category: "lifecycle",
    description: "A reservation is confirmed. The inventory module assigns a slip and the billing module accrues the dockage charge for the stay." },
  { event_name: "slip_reservation.checked_out", obj: "slip_reservations", from_state: "checked_in", to_state: "checked_out", event_category: "lifecycle",
    description: "A vessel checks out. The billing module finalizes utility and dockage charges and issues the invoice for the stay." },
  { event_name: "slip_contract.activated", obj: "slip_contracts", from_state: "draft", to_state: "active", event_category: "lifecycle",
    description: "A slip contract is activated. The inventory module reserves the seasonal slip and the billing module begins generating recurring charges." },
  { event_name: "boatyard_work_order.completed", obj: "boatyard_work_orders", from_state: "in_progress", to_state: "completed", event_category: "lifecycle",
    description: "A boatyard work order is completed. The billing module invoices the labor, parts, and haul-out charges to the boater." },
];
type HO = { event: string; src: string; tgt: string; payload: string; pattern: string; friction: string; description: string };
const handoffs: HO[] = [
  { event: "slip_reservation.confirmed", src: "MARINA-MGMT-RESERVATIONS", tgt: "MARINA-MGMT-INVENTORY", payload: "marina_slips", pattern: "lifecycle_progression", friction: "low",
    description: "A confirmed reservation drives a slip assignment in the inventory module so the vessel has a place to dock." },
  { event: "slip_reservation.confirmed", src: "MARINA-MGMT-RESERVATIONS", tgt: "MARINA-MGMT-BILLING", payload: "recurring_charges", pattern: "lifecycle_progression", friction: "low",
    description: "A confirmed reservation accrues the dockage charge for the stay on the boater's account." },
  { event: "slip_reservation.checked_out", src: "MARINA-MGMT-RESERVATIONS", tgt: "MARINA-MGMT-BILLING", payload: "dockage_invoices", pattern: "lifecycle_progression", friction: "medium",
    description: "Checkout finalizes utility and dockage charges and issues the invoice for the completed stay." },
  { event: "slip_contract.activated", src: "MARINA-MGMT-BILLING", tgt: "MARINA-MGMT-INVENTORY", payload: "marina_slips", pattern: "lifecycle_progression", friction: "low",
    description: "An activated seasonal contract reserves the assigned slip in the inventory module for the contract term." },
  { event: "boatyard_work_order.completed", src: "MARINA-MGMT-SERVICE", tgt: "MARINA-MGMT-BILLING", payload: "dockage_invoices", pattern: "lifecycle_progression", friction: "low",
    description: "A completed boatyard work order invoices labor, parts, and haul-out charges to the boater." },
];

// ============================================================ PHASE C
const bfDomains = [
  { bf: BF.BIZOPS, type: "owner" },
  { bf: BF.CUST_SVC, type: "contributor" },
  { bf: BF.SALES, type: "contributor" },
  { bf: BF.FINANCE, type: "consumer" },
];
const bfCaps = [
  { bf: BF.FINANCE, cap: "MARINA-CONTRACTS-BILLING", type: "owner" },
  { bf: BF.FIELD_SVC, cap: "MARINA-BOATYARD-SVC", type: "owner" },
];

// ============================================================ PHASE E personas
type PERSONA = { role_code: string; role_name: string; bf: number | null; description: string; reach: Array<{ module: string; level: string }> };
const personas: PERSONA[] = [
  { role_code: "MARINA-HARBORMASTER", role_name: "Harbormaster", bf: BF.BIZOPS,
    description: "Runs the marina end to end: oversees slip inventory and assignment, reservations, the boatyard, billing, and the fuel dock.",
    reach: [
      { module: "MARINA-MGMT-INVENTORY", level: "primary" },
      { module: "MARINA-MGMT-RESERVATIONS", level: "primary" },
      { module: "MARINA-MGMT-SERVICE", level: "secondary" },
      { module: "MARINA-MGMT-BILLING", level: "secondary" },
      { module: "MARINA-MGMT-CRM", level: "secondary" },
      { module: "MARINA-MGMT-FUEL-RETAIL", level: "secondary" },
    ] },
  { role_code: "MARINA-DOCKMASTER", role_name: "Dockmaster", bf: BF.BIZOPS,
    description: "Assigns slips, handles transient arrivals and departures, and keeps the dock and assignment board current.",
    reach: [
      { module: "MARINA-MGMT-INVENTORY", level: "primary" },
      { module: "MARINA-MGMT-RESERVATIONS", level: "primary" },
      { module: "MARINA-MGMT-CRM", level: "secondary" },
    ] },
  { role_code: "MARINA-OFFICE-MANAGER", role_name: "Marina Office Manager", bf: BF.CUST_SVC,
    description: "Handles reservations, boater and vessel records, document collection, and front-desk billing inquiries.",
    reach: [
      { module: "MARINA-MGMT-RESERVATIONS", level: "primary" },
      { module: "MARINA-MGMT-CRM", level: "primary" },
      { module: "MARINA-MGMT-BILLING", level: "secondary" },
    ] },
  { role_code: "MARINA-SERVICE-MANAGER", role_name: "Service Yard Manager", bf: BF.FIELD_SVC,
    description: "Runs the boatyard: estimates and work orders, haul-out and launch scheduling, and pump-out logging.",
    reach: [
      { module: "MARINA-MGMT-SERVICE", level: "primary" },
      { module: "MARINA-MGMT-INVENTORY", level: "secondary" },
      { module: "MARINA-MGMT-CRM", level: "secondary" },
    ] },
  { role_code: "MARINA-BOOKKEEPER", role_name: "Marina Bookkeeper", bf: BF.FINANCE,
    description: "Owns contracts, recurring and metered billing, invoicing, and fuel and store reconciliation.",
    reach: [
      { module: "MARINA-MGMT-BILLING", level: "primary" },
      { module: "MARINA-MGMT-FUEL-RETAIL", level: "secondary" },
      { module: "MARINA-MGMT-RESERVATIONS", level: "secondary" },
    ] },
];

// ============================================================ PHASE S tools (derived from masters + lifecycle + extras + shared)
type TOOL = { tool_name: string; operation_kind: string; obj?: string; description: string };
const extraMutates: TOOL[] = [
  { tool_name: "assign_slip", operation_kind: "mutate", obj: "slip_assignments", description: "Assign a vessel to a slip, mooring, or rack for a reservation or contract." },
  { tool_name: "post_recurring_charge", operation_kind: "mutate", obj: "recurring_charges", description: "Post a recurring dockage, storage, or service charge to a boater account." },
  { tool_name: "record_meter_reading", operation_kind: "mutate", obj: "meter_readings", description: "Record an electric or water submeter reading for utility billing." },
  { tool_name: "record_fuel_sale", operation_kind: "mutate", obj: "fuel_sales", description: "Record a fuel-dock sale and draw it down against tank inventory." },
  { tool_name: "record_pos_transaction", operation_kind: "mutate", obj: "pos_transactions", description: "Record a ship-store retail sale and post it to a register or boater account." },
];
const sharedTools: TOOL[] = [
  { tool_name: "notify_person", operation_kind: "side_effect", description: "Send a notification to a single recipient over whichever channel the deployment wires up." },
  { tool_name: "notify_team", operation_kind: "side_effect", description: "Broadcast a notification to a team over whichever channel the deployment wires up." },
  { tool_name: "execute_payment", operation_kind: "side_effect", description: "Execute or capture a payment via an external payment processor." },
  { tool_name: "sign_document", operation_kind: "side_effect", description: "Send a contract or agreement for electronic signature." },
  { tool_name: "receive_webhook", operation_kind: "inbound", description: "Receive an inbound webhook event from an external system." },
];
// per-module extra/shared tool attachments (requirement_level)
const moduleExtras: Array<{ module: string; tool: string; req: string }> = [
  { module: "MARINA-MGMT-INVENTORY", tool: "assign_slip", req: "required" },
  { module: "MARINA-MGMT-INVENTORY", tool: "notify_team", req: "optional" },
  { module: "MARINA-MGMT-RESERVATIONS", tool: "notify_person", req: "required" },
  { module: "MARINA-MGMT-RESERVATIONS", tool: "receive_webhook", req: "optional" },
  { module: "MARINA-MGMT-CRM", tool: "notify_person", req: "optional" },
  { module: "MARINA-MGMT-BILLING", tool: "post_recurring_charge", req: "required" },
  { module: "MARINA-MGMT-BILLING", tool: "record_meter_reading", req: "required" },
  { module: "MARINA-MGMT-BILLING", tool: "execute_payment", req: "optional" },
  { module: "MARINA-MGMT-BILLING", tool: "sign_document", req: "optional" },
  { module: "MARINA-MGMT-BILLING", tool: "notify_person", req: "optional" },
  { module: "MARINA-MGMT-SERVICE", tool: "notify_person", req: "required" },
  { module: "MARINA-MGMT-SERVICE", tool: "notify_team", req: "optional" },
  { module: "MARINA-MGMT-FUEL-RETAIL", tool: "record_fuel_sale", req: "required" },
  { module: "MARINA-MGMT-FUEL-RETAIL", tool: "record_pos_transaction", req: "required" },
  { module: "MARINA-MGMT-FUEL-RETAIL", tool: "execute_payment", req: "optional" },
];

// ============================================================ REGULATIONS (light, marina-specific)
const regulations = [
  { regulation_name: "Clean Vessel Act", regulation_code: "CVA", regulation_type: "environmental", jurisdiction_id: USA_JURISDICTION_ID,
    issuing_body: "US Fish and Wildlife Service", certification_required: false, regulation_url: "https://www.fws.gov/program/clean-vessel-act",
    description: "Federal grant program funding sewage pump-out and dump-station facilities for recreational boats. Marinas receiving CVA grants must log pump-out usage and report it; many states add their own pump-out mandates." },
  { regulation_name: "EPA SPCC Rule (40 CFR 112)", regulation_code: "SPCC", regulation_type: "environmental", jurisdiction_id: USA_JURISDICTION_ID,
    issuing_body: "US Environmental Protection Agency", certification_required: false, regulation_url: "https://www.epa.gov/oil-spills-prevention-and-preparedness-regulations",
    description: "Spill Prevention, Control, and Countermeasure rule requiring facilities storing over 1,320 gallons of aboveground oil (including marina fuel docks) to maintain a written SPCC plan, fuel-inventory and inspection records, and periodic review." },
];
const domainRegulations = [
  { regulation_code: "CVA", applicability: "conditional", condition_notes: "Applies to marinas that operate pump-out stations or receive Clean Vessel Act grant funding." },
  { regulation_code: "SPCC", applicability: "conditional", condition_notes: "Applies to marina fuel docks storing more than 1,320 gallons of aboveground fuel." },
];

// ============================================================ RUN
async function main() {
  validateDomainRow(domain);

  console.log("\n=== Phase A: domain ===");
  const domMap = await syncTable("/domains", [domain], "domain_code");
  const domainId = domMap.get("MARINA-MGMT")!;

  console.log("=== Phase A: capabilities ===");
  const capMap = await syncTable("/capabilities", capabilities, "capability_code");

  console.log("=== Phase A: capability_domains ===");
  await syncJunction("/capability_domains",
    capabilities.map(c => ({ capability_id: capMap.get(c.capability_code), domain_id: domainId, notes: "" })),
    ["capability_id", "domain_id"]);

  console.log("=== Phase A: domain_modules ===");
  const modMap = await syncTable("/domain_modules",
    modules.map(m => ({ ...m, domain_id: domainId, module_kind: "full" })), "domain_module_code");

  console.log("=== Phase A: domain_module_capabilities ===");
  await syncJunction("/domain_module_capabilities",
    Object.entries(moduleCaps).flatMap(([mod, caps]) => caps.map(c => ({ domain_module_id: modMap.get(mod), capability_id: capMap.get(c), notes: "" }))),
    ["domain_module_id", "capability_id"]);

  console.log("=== Phase A: vendors ===");
  const vendorMap = await syncTable("/vendors", vendors.map(v => ({ ...v, notes: "" })), "vendor_name");

  console.log("=== Phase A: solutions ===");
  const solMap = await syncTable("/solutions",
    solutions.map(s => ({ solution_name: s.solution_name, description: s.description, solution_url: s.solution_url,
      vendor_id: vendorMap.get(s.vendor), solution_type: "saas", is_active_in_market: true, notes: "" })), "solution_name");

  console.log("=== Phase A: solution_domains ===");
  await syncJunction("/solution_domains",
    solutions.map(s => ({ solution_id: solMap.get(s.solution_name), domain_id: domainId, coverage_level: "primary", notes: "" })),
    ["solution_id", "domain_id"]);

  console.log("=== Phase A: regulations ===");
  const regMap = await syncTable("/regulations", regulations, "regulation_code");
  console.log("=== Phase A: domain_regulations ===");
  await syncJunction("/domain_regulations",
    domainRegulations.map(r => ({ domain_id: domainId, regulation_id: regMap.get(r.regulation_code), applicability: r.applicability, condition_notes: r.condition_notes, notes: "" })),
    ["domain_id", "regulation_id"]);

  console.log("\n=== Phase B: data_objects ===");
  const doMap = await syncTable("/data_objects",
    masters.map(o => ({
      data_object_name: o.obj, singular_label: o.sing, plural_label: o.plur,
      description: o.desc, kind: "domain_owned", entity_type: o.et,
      is_canonical_bare_word: false, naming_authority_rationale: "",
      has_personal_content: !!o.pc, has_submit_lock: !!o.sl, has_single_approver: !!o.sa,
    })), "data_object_name");
  doMap.set("users", USERS_ID);

  console.log("=== Phase B: domain_module_data_objects (masters + embeds) ===");
  const dmdoRows = [
    ...masters.map(m => ({ domain_module_id: modMap.get(m.module), data_object_id: doMap.get(m.obj), role: "master", necessity: m.nec, notes: "" })),
    ...embeds.map(e => ({ domain_module_id: modMap.get(e.module), data_object_id: doMap.get(e.obj), role: "embedded_master", necessity: e.nec, notes: "" })),
  ];
  await syncJunction("/domain_module_data_objects", dmdoRows, ["domain_module_id", "data_object_id"]);

  console.log("=== Phase B: data_object_lifecycle_states ===");
  const lcRows = masters.flatMap(m => (m.states ?? []).map(s => ({
    data_object_id: doMap.get(m.obj), state_name: s.name, state_order: s.order,
    is_initial: !!s.init, is_terminal: !!s.term, requires_permission: !!s.rp,
    permission_verb_override: s.verb ?? "", domain_module_id: modMap.get(m.module),
  })));
  await syncJunction("/data_object_lifecycle_states", lcRows, ["data_object_id", "state_name"]);

  console.log("=== Phase B: trigger_events ===");
  const teMap = await syncTable("/trigger_events",
    triggerEvents.map(e => ({ event_name: e.event_name, data_object_id: doMap.get(e.obj), from_state: e.from_state, to_state: e.to_state, description: e.description, event_category: e.event_category })),
    "event_name");

  console.log("=== Phase B: handoffs ===");
  await syncJunction("/handoffs",
    handoffs.map(h => ({
      source_domain_id: domainId, target_domain_id: domainId,
      source_domain_module_id: modMap.get(h.src), target_domain_module_id: modMap.get(h.tgt),
      data_object_id: doMap.get(h.payload), trigger_event_id: teMap.get(h.event),
      integration_pattern: h.pattern, friction_level: h.friction, description: h.description, notes: "",
    })), ["source_domain_module_id", "target_domain_module_id", "data_object_id", "trigger_event_id"]);

  console.log("=== Phase B: data_object_relationships ===");
  await syncJunction("/data_object_relationships",
    rels.map(r => ({
      data_object_id: doMap.get(r.a), related_data_object_id: doMap.get(r.b),
      relationship_type: r.type, relationship_kind: r.kind, relationship_verb: r.verb,
      inverse_verb: r.inv, is_required: r.req, owner_side: r.owner, notes: "",
    })), ["data_object_id", "related_data_object_id", "relationship_verb"]);

  console.log("=== Phase B: data_object_aliases ===");
  await syncJunction("/data_object_aliases",
    masters.flatMap(m => (m.aliases ?? []).map(n => ({ data_object_id: doMap.get(m.obj), alias_name: n, alias_type: "synonym", is_preferred: false, notes: "" }))),
    ["data_object_id", "alias_name"]);

  console.log("\n=== Phase C: business_function_domains ===");
  await syncJunction("/business_function_domains",
    bfDomains.map(r => ({ business_function_id: r.bf, domain_id: domainId, responsibility_type: r.type, notes: "" })),
    ["business_function_id", "domain_id"]);
  console.log("=== Phase C: business_function_capabilities ===");
  await syncJunction("/business_function_capabilities",
    bfCaps.map(r => ({ business_function_id: r.bf, capability_id: capMap.get(r.cap), responsibility_type: r.type, notes: "" })),
    ["business_function_id", "capability_id"]);

  console.log("\n=== Phase E: domain_roles ===");
  const roleMap = await syncTable("/domain_roles",
    personas.map(p => ({ role_code: p.role_code, role_name: p.role_name, description: p.description, business_function_id: p.bf })), "role_code");
  console.log("=== Phase E: role_modules ===");
  await syncJunction("/role_modules",
    personas.flatMap(p => p.reach.map(r => ({ role_id: roleMap.get(p.role_code), domain_module_id: modMap.get(r.module), interaction_level: r.level, notes: "" }))),
    ["role_id", "domain_module_id"]);

  console.log("\n=== Phase S: tools ===");
  // derive: query_<obj> for every master; create_<obj> + gate verbs for workflow masters
  const derivedTools: TOOL[] = [];
  for (const m of masters) {
    derivedTools.push({ tool_name: `query_${m.obj.replace(/s$/, "")}s`, operation_kind: "query", obj: m.obj, description: `Read ${m.plur.toLowerCase()} and their details.` });
  }
  for (const m of masters) {
    if (!m.states) continue;
    derivedTools.push({ tool_name: `create_${m.sing.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`, operation_kind: "mutate", obj: m.obj, description: `Create a ${m.sing.toLowerCase()}.` });
    for (const s of m.states) if (s.rp && s.verb) derivedTools.push({ tool_name: s.verb, operation_kind: "mutate", obj: m.obj, description: `Transition a ${m.sing.toLowerCase()} (${s.verb.replace(/_/g, " ")}).` });
  }
  // dedupe tool defs by name (query naming could collide; use obj-based unique names instead)
  const queryTools: TOOL[] = masters.map(m => ({ tool_name: `query_${m.obj}`, operation_kind: "query", obj: m.obj, description: `Read ${m.plur.toLowerCase()} and their details.` }));
  const createGateTools: TOOL[] = [];
  for (const m of masters) {
    if (!m.states) continue;
    createGateTools.push({ tool_name: `create_${m.obj.replace(/s$/, "")}`, operation_kind: "mutate", obj: m.obj, description: `Create a ${m.sing.toLowerCase()}.` });
    for (const s of m.states) if (s.rp && s.verb) createGateTools.push({ tool_name: s.verb, operation_kind: "mutate", obj: m.obj, description: `Transition a ${m.sing.toLowerCase()}: ${s.verb.replace(/_/g, " ")}.` });
  }
  const allToolDefs = [...queryTools, ...createGateTools, ...extraMutates, ...sharedTools];
  const coverageTier = (op: string) => (op === "query" || op === "mutate" || op === "inbound" ? "platform" : "external");
  const toolMap = await syncTable("/tools",
    allToolDefs.map(t => ({ tool_name: t.tool_name, operation_kind: t.operation_kind, data_object_id: t.obj ? doMap.get(t.obj) : null, coverage_tier: coverageTier(t.operation_kind), description: t.description })),
    "tool_name");

  console.log("=== Phase S: skills (system) ===");
  await syncTable("/skills",
    [{ skill_name: "marina-mgmt-system", skill_type: "system", domain_id: domainId, domain_module_id: null, process_id: null,
       description: "System agent surface for Marina Management. Derives its toolset from the domain's six modules: slip and storage inventory, reservations, boater and vessel CRM, contracts and billing, boatyard service, and fuel dock and ship store." }],
    "skill_name");

  console.log("=== Phase S: domain_module_tools ===");
  const mtRows: Array<{ domain_module_id: number | undefined; tool_id: number | undefined; requirement_level: string; notes: string }> = [];
  const seenMT = new Set<string>();
  const addMT = (module: string, tool: string, req: string) => {
    const mid = modMap.get(module), tid = toolMap.get(tool);
    if (!mid || !tid) return;
    const k = `${mid}|${tid}`;
    if (seenMT.has(k)) return;
    seenMT.add(k);
    mtRows.push({ domain_module_id: mid, tool_id: tid, requirement_level: req, notes: "" });
  };
  // master query tools + workflow create/gates onto the master's module
  for (const m of masters) {
    addMT(m.module, `query_${m.obj}`, m.nec === "required" ? "required" : "optional");
    if (m.states) {
      addMT(m.module, `create_${m.obj.replace(/s$/, "")}`, "required");
      for (const s of m.states) if (s.rp && s.verb) addMT(m.module, s.verb, "required");
    }
  }
  for (const e of moduleExtras) addMT(e.module, e.tool, e.req);
  await syncJunction("/domain_module_tools", mtRows as Row[], ["domain_module_id", "tool_id"]);

  // ----- summary
  console.log("\n=== Summary counts (MARINA-MGMT) ===");
  const modIds = modules.map(m => modMap.get(m.domain_module_code)).join(",");
  const objIds = masters.map(m => doMap.get(m.obj)).join(",");
  const c = async (label: string, path: string) => console.log(`  ${label}: ${(await get(path)).length}`);
  await c("modules", `/domain_modules?domain_id=eq.${domainId}&select=id`);
  await c("capability_domains", `/capability_domains?domain_id=eq.${domainId}&select=capability_id`);
  await c("masters(DMDO)", `/domain_module_data_objects?domain_module_id=in.(${modIds})&role=eq.master&select=data_object_id`);
  await c("embeds(DMDO)", `/domain_module_data_objects?domain_module_id=in.(${modIds})&role=eq.embedded_master&select=data_object_id`);
  await c("lifecycle_states", `/data_object_lifecycle_states?data_object_id=in.(${objIds})&select=id`);
  await c("relationships", `/data_object_relationships?data_object_id=in.(${objIds},${USERS_ID})&select=id`);
  await c("aliases", `/data_object_aliases?data_object_id=in.(${objIds})&select=id`);
  await c("handoffs", `/handoffs?source_domain_id=eq.${domainId}&select=id`);
  await c("personas", `/domain_roles?role_code=like.MARINA-*&select=id`);
  await c("domain_module_tools", `/domain_module_tools?domain_module_id=in.(${modIds})&select=tool_id`);
  console.log("\nUI: https://tests.semantius.app/domain_map/domains");
  console.log("    https://tests.semantius.app/domain_map/domain_modules");
  console.log("    https://tests.semantius.app/domain_map/data_objects");
  console.log("Done.");
}
await main();
