#!/usr/bin/env bun
// Phase A-S load for STR-MGMT (Short-Term and Vacation Rental Management).
// Idempotent: natural-key syncTable for keyed entities, composite-key syncJunction
// for junctions. record_status omitted everywhere -> DB default 'new' (Rule #1).
// Run: bun run .tmp_deploy/load_str_mgmt_2026_06_14.ts

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
  if (missing.length) {
    console.log(`  ${path}: inserting ${missing.length} (had ${existing.length})`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: all ${existing.length} present`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const m = new Map<string, number>();
  for (const r of all) m.set(String(r[keyField]), Number(r.id));
  return m;
}

// Insert only junction rows whose composite key isn't already present.
async function syncJunction(path: string, rows: Row[], keyCols: string[]): Promise<void> {
  const sel = keyCols.join(",");
  const existing = await get(`${path}?select=${sel}&limit=20000`);
  const have = new Set(existing.map(r => keyCols.map(c => String(r[c])).join("|")));
  const missing = rows.filter(r => !have.has(keyCols.map(c => String(r[c])).join("|")));
  if (missing.length) {
    console.log(`  ${path}: inserting ${missing.length} (had ${existing.length})`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: all ${existing.length} present`);
  }
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
const BF = { BIZOPS: 34, CUST_SVC: 24, MARKETING: 22, FINANCE: 4 };

// ============================================================ DATA
const domain = {
  domain_code: "STR-MGMT",
  domain_name: "Short-Term and Vacation Rental Management",
  description:
    "Software market for managing short-term and vacation rental properties: listing setup and distribution across booking channels and online travel agencies, reservation and guest management, dynamic nightly pricing, housekeeping and turnover coordination, and owner trust accounting. Distinct from long-term residential property management (lease-and-tenant shaped) and from hotel property management systems; serves individual hosts, professional short-term rental managers, and hospitality operators.",
  crud_percentage: 80,
  business_logic:
    "Dynamic nightly pricing (demand, seasonality, lead-time, and competitor-set rules), availability-calendar reconciliation across channels to prevent double-booking, channel-specific rate and fee mapping (cleaning fees, channel commissions, taxes), owner-statement commission math (management percentage and pass-through expense allocation), and occupancy/lodging-tax calculation and remittance per jurisdiction.",
  min_org_size: "10 xs <50",
  cost_band: "$$",
  certification_required: false,
  usa_market_size_usd_m: 600,
  market_size_source_year: 2024,
  catalog_tagline:
    "Distribute listings across every booking channel, manage reservations and guests, automate pricing and turnovers, and account for each owner, in one short-term rental platform.",
  catalog_description:
    "Run a short-term and vacation rental business end to end. Publish and sync listings across the major booking channels from a single calendar, capture reservations and message guests in a unified inbox, and let dynamic pricing set the right nightly rate. Coordinate cleaning and turnovers between checkouts, collect payments, and keep guests and owners informed automatically. Owner trust accounting produces commission-based statements and payouts, with optional lodging-tax remittance and local permit tracking for regulated markets.",
};

const capabilities = [
  { capability_code: "STR-LISTING-MGMT", capability_name: "Listing Management", description: "Set up and maintain rental listings: property details, amenities, capacity, house rules, photos, and availability calendars." },
  { capability_code: "STR-CHANNEL-MGR", capability_name: "Channel Management and OTA Distribution", description: "Publish and synchronize listings, rates, and availability across booking channels and online travel agencies, preventing double-bookings." },
  { capability_code: "STR-DYNAMIC-PRICING", capability_name: "Dynamic Nightly Pricing", description: "Set nightly rates from demand, seasonality, lead-time, and competitor-set signals, with min/max-stay and gap-night rules." },
  { capability_code: "STR-RESERVATION-MGMT", capability_name: "Reservation and Booking Management", description: "Capture, confirm, modify, and cancel reservations across channels with check-in/check-out and payment status." },
  { capability_code: "STR-GUEST-MESSAGING", capability_name: "Unified Guest Messaging", description: "Consolidate guest conversations across channels into a single inbox with templated and automated messages." },
  { capability_code: "STR-GUEST-REVIEWS", capability_name: "Guest Reviews and Reputation", description: "Collect, respond to, and analyze guest and host reviews across channels." },
  { capability_code: "STR-TURNOVER-OPS", capability_name: "Housekeeping and Turnover Coordination", description: "Schedule, assign, and track cleaning and turnover tasks between checkouts and the next arrival." },
  { capability_code: "STR-OWNER-ACCOUNTING", capability_name: "Owner Trust Accounting", description: "Produce commission-based owner statements and payouts, allocating revenue and pass-through expenses per managed property." },
  { capability_code: "STR-TAX-COMPLIANCE", capability_name: "Lodging Tax and Permit Compliance", description: "Calculate, file, and remit occupancy/lodging taxes and track local short-term-rental registration and permits per jurisdiction." },
];

const vendors = [
  { vendor_name: "Guesty Inc", vendor_url: "https://www.guesty.com", headquarters_country: "USA", description: "Short-term and vacation rental property-management platform vendor for professional managers." },
  { vendor_name: "Hostaway", vendor_url: "https://www.hostaway.com", headquarters_country: "USA", description: "Vacation rental management software and channel-manager vendor for mid-market property managers." },
  { vendor_name: "Lodgify", vendor_url: "https://www.lodgify.com", headquarters_country: "Spain", description: "Vacation rental software vendor focused on direct-booking websites and channel management." },
  { vendor_name: "OwnerRez", vendor_url: "https://www.ownerrez.com", headquarters_country: "USA", description: "Vacation rental management vendor with strong owner trust accounting and channel management." },
  { vendor_name: "Hospitable", vendor_url: "https://hospitable.com", headquarters_country: "USA", description: "Short-term rental automation vendor focused on guest messaging and team task automation." },
  { vendor_name: "Streamline VRS", vendor_url: "https://www.streamlinevrs.com", headquarters_country: "USA", description: "Enterprise vacation rental management vendor with trust accounting and contact center." },
  { vendor_name: "TRACK Hospitality Software", vendor_url: "https://tracksoftwaresuite.com", headquarters_country: "USA", description: "Enterprise vacation rental and hospitality management vendor with CRM and call center." },
];

type SOL = { solution_name: string; vendor: string; description: string; solution_url: string };
const solutions: SOL[] = [
  { solution_name: "Guesty", vendor: "Guesty Inc", solution_url: "https://www.guesty.com", description: "Property-management platform for short-term and vacation rentals: channel manager, unified inbox, automation, and accounting." },
  { solution_name: "Hostaway", vendor: "Hostaway", solution_url: "https://www.hostaway.com", description: "Vacation rental management system with channel manager, automation, and a marketplace of integrations." },
  { solution_name: "Lodgify", vendor: "Lodgify", solution_url: "https://www.lodgify.com", description: "Vacation rental software with a direct-booking website builder, booking engine, and channel manager." },
  { solution_name: "OwnerRez", vendor: "OwnerRez", solution_url: "https://www.ownerrez.com", description: "Vacation rental management software with channel management and detailed owner trust accounting." },
  { solution_name: "Hospitable", vendor: "Hospitable", solution_url: "https://hospitable.com", description: "Short-term rental automation for guest messaging, team tasks, and direct bookings." },
  { solution_name: "Streamline VRS", vendor: "Streamline VRS", solution_url: "https://www.streamlinevrs.com", description: "Enterprise vacation rental platform with reservations, trust accounting, and call-center tooling." },
  { solution_name: "TRACK PMS", vendor: "TRACK Hospitality Software", solution_url: "https://tracksoftwaresuite.com", description: "Enterprise vacation rental and hospitality PMS with CRM, distribution, and call center." },
];

const modules = [
  { domain_module_code: "STR-MGMT-LISTINGS-CHANNELS", domain_module_name: "Listings and Channel Distribution",
    description: "Masters rental listings, channel connections, and rate plans. Sets up properties, distributes them across booking channels and OTAs, and runs dynamic nightly pricing. Deployable standalone for a host who only needs distribution and pricing.",
    catalog_tagline: "Set up your listings once and sync them, with the right nightly price, to every booking channel.",
    catalog_description: "Build rich listings with amenities, photos, and house rules, then publish them across the major booking channels from one calendar. Channel sync keeps rates and availability aligned so you never double-book, and dynamic pricing adjusts nightly rates to demand and season." },
  { domain_module_code: "STR-MGMT-RESERVATIONS-GUEST", domain_module_name: "Reservations and Guest Experience",
    description: "Masters reservations, guests, guest messages, and reviews. Captures bookings from every channel, runs a unified guest inbox, and manages reviews. Embeds the listing shell.",
    catalog_tagline: "Take bookings from every channel and talk to guests in one inbox, from inquiry through review.",
    catalog_description: "Capture reservations from all your channels into one place, with check-in and check-out tracking and payment status at a glance. A unified inbox consolidates guest messages across channels with templates and automation, and review management helps you collect and respond to feedback that builds your reputation." },
  { domain_module_code: "STR-MGMT-OPERATIONS", domain_module_name: "Turnover and Field Operations",
    description: "Masters housekeeping and turnover tasks scheduled off reservation checkouts. Embeds listing and reservation shells. Deployable standalone for cleaning/ops teams.",
    catalog_tagline: "Schedule, assign, and verify every turnover clean so the next guest walks into a spotless unit.",
    catalog_description: "Turn each checkout into a scheduled turnover task, assign it to the right cleaner or team, and track it through completion and inspection. Operations stays in sync with the booking calendar so cleans land in the gap between guests, every time." },
  { domain_module_code: "STR-MGMT-TRUST-ACCOUNTING", domain_module_name: "Owner Trust Accounting and Compliance",
    description: "Masters property owners, owner statements, and (jurisdiction-conditional) lodging-tax records and short-term-rental permits. Embeds listing and reservation shells; rolls up booking revenue into commission-based statements.",
    catalog_tagline: "Pay your owners accurately every cycle and stay on top of lodging taxes and local permits.",
    catalog_description: "Roll booking revenue and pass-through expenses into commission-based owner statements, finalize them, and pay out. For regulated markets, collect and remit occupancy and lodging taxes and keep local short-term-rental permits and registrations current." },
];

// module -> capability codes
const moduleCaps: Record<string, string[]> = {
  "STR-MGMT-LISTINGS-CHANNELS": ["STR-LISTING-MGMT", "STR-CHANNEL-MGR", "STR-DYNAMIC-PRICING"],
  "STR-MGMT-RESERVATIONS-GUEST": ["STR-RESERVATION-MGMT", "STR-GUEST-MESSAGING", "STR-GUEST-REVIEWS"],
  "STR-MGMT-OPERATIONS": ["STR-TURNOVER-OPS"],
  "STR-MGMT-TRUST-ACCOUNTING": ["STR-OWNER-ACCOUNTING", "STR-TAX-COMPLIANCE"],
};

type DO = { data_object_name: string; singular_label: string; plural_label: string; description: string;
  entity_type: string; has_personal_content?: boolean; has_submit_lock?: boolean; has_single_approver?: boolean };
const dataObjects: DO[] = [
  { data_object_name: "str_listings", singular_label: "Short-Term Rental Listing", plural_label: "Short-Term Rental Listings", entity_type: "operational_workflow",
    description: "A rental unit as marketed and published to booking channels: address, amenities, capacity, house rules, photos, and availability." },
  { data_object_name: "str_reservations", singular_label: "Reservation", plural_label: "Reservations", entity_type: "operational_workflow",
    description: "A guest stay booked against a listing: dates, channel of origin, party size, pricing, and payment and check-in/out status." },
  { data_object_name: "str_guests", singular_label: "Guest", plural_label: "Guests", entity_type: "operational_record",
    description: "A guest profile: contact details, identity/verification status, and stay history across reservations." },
  { data_object_name: "str_channel_connections", singular_label: "Channel Connection", plural_label: "Channel Connections", entity_type: "operational_workflow",
    description: "The mapping between a listing and an external booking channel or OTA, with sync status for rates and availability." },
  { data_object_name: "str_rate_plans", singular_label: "Rate Plan", plural_label: "Rate Plans", entity_type: "catalog",
    description: "Pricing configuration for a listing: base and seasonal rates, dynamic-pricing rules, fees, and min/max-stay constraints." },
  { data_object_name: "str_guest_messages", singular_label: "Guest Message", plural_label: "Guest Messages", entity_type: "operational_record",
    description: "A message in the unified guest inbox tied to a reservation, inbound or outbound across any channel." },
  { data_object_name: "str_housekeeping_tasks", singular_label: "Housekeeping Task", plural_label: "Housekeeping Tasks", entity_type: "operational_workflow",
    description: "A cleaning or turnover task scheduled against a listing, typically fired by a checkout, assigned to a cleaner or team." },
  { data_object_name: "str_owner_statements", singular_label: "Owner Statement", plural_label: "Owner Statements", entity_type: "operational_workflow", has_submit_lock: true,
    description: "A periodic trust-accounting statement for a property owner: booking revenue, commissions, pass-through expenses, and the net payout." },
  { data_object_name: "str_property_owners", singular_label: "Property Owner", plural_label: "Property Owners", entity_type: "operational_record",
    description: "An owner whose properties a manager operates: contact details, management agreement, commission terms, and payout details." },
  { data_object_name: "str_reviews", singular_label: "Guest Review", plural_label: "Guest Reviews", entity_type: "operational_record",
    description: "A review left after a stay, by a guest about a listing or by a host about a guest, synced across channels." },
  { data_object_name: "str_permits", singular_label: "Short-Term Rental Permit", plural_label: "Short-Term Rental Permits", entity_type: "operational_record",
    description: "A local short-term-rental registration or permit for a listing: permit number, jurisdiction, issue and expiry dates, and status." },
  { data_object_name: "str_lodging_tax_records", singular_label: "Lodging Tax Record", plural_label: "Lodging Tax Records", entity_type: "operational_workflow",
    description: "A record of occupancy/lodging tax collected on a reservation and its filing and remittance to the taxing jurisdiction." },
];

// module -> data_object role rows. role: master|embedded_master; necessity: required|optional
type DMDO = { module: string; obj: string; role: string; necessity: string };
const dmdo: DMDO[] = [
  // LISTINGS-CHANNELS masters
  { module: "STR-MGMT-LISTINGS-CHANNELS", obj: "str_listings", role: "master", necessity: "required" },
  { module: "STR-MGMT-LISTINGS-CHANNELS", obj: "str_channel_connections", role: "master", necessity: "required" },
  { module: "STR-MGMT-LISTINGS-CHANNELS", obj: "str_rate_plans", role: "master", necessity: "required" },
  // RESERVATIONS-GUEST masters + embedded listing
  { module: "STR-MGMT-RESERVATIONS-GUEST", obj: "str_reservations", role: "master", necessity: "required" },
  { module: "STR-MGMT-RESERVATIONS-GUEST", obj: "str_guests", role: "master", necessity: "optional" },
  { module: "STR-MGMT-RESERVATIONS-GUEST", obj: "str_guest_messages", role: "master", necessity: "optional" },
  { module: "STR-MGMT-RESERVATIONS-GUEST", obj: "str_reviews", role: "master", necessity: "optional" },
  { module: "STR-MGMT-RESERVATIONS-GUEST", obj: "str_listings", role: "embedded_master", necessity: "required" },
  // OPERATIONS master + embedded listing/reservation
  { module: "STR-MGMT-OPERATIONS", obj: "str_housekeeping_tasks", role: "master", necessity: "optional" },
  { module: "STR-MGMT-OPERATIONS", obj: "str_listings", role: "embedded_master", necessity: "required" },
  { module: "STR-MGMT-OPERATIONS", obj: "str_reservations", role: "embedded_master", necessity: "required" },
  // TRUST-ACCOUNTING masters + embedded listing/reservation
  { module: "STR-MGMT-TRUST-ACCOUNTING", obj: "str_owner_statements", role: "master", necessity: "optional" },
  { module: "STR-MGMT-TRUST-ACCOUNTING", obj: "str_property_owners", role: "master", necessity: "optional" },
  { module: "STR-MGMT-TRUST-ACCOUNTING", obj: "str_permits", role: "master", necessity: "optional" },
  { module: "STR-MGMT-TRUST-ACCOUNTING", obj: "str_lodging_tax_records", role: "master", necessity: "optional" },
  { module: "STR-MGMT-TRUST-ACCOUNTING", obj: "str_listings", role: "embedded_master", necessity: "required" },
  { module: "STR-MGMT-TRUST-ACCOUNTING", obj: "str_reservations", role: "embedded_master", necessity: "required" },
];

// lifecycle states: obj -> [{state_name, order, initial, terminal, requires_permission, verb_override, module}]
type LS = { obj: string; state_name: string; order: number; initial?: boolean; terminal?: boolean; rp?: boolean; verb?: string; module: string };
const lifecycle: LS[] = [
  { obj: "str_listings", state_name: "draft", order: 1, initial: true, module: "STR-MGMT-LISTINGS-CHANNELS" },
  { obj: "str_listings", state_name: "active", order: 2, rp: true, verb: "publish_listing", module: "STR-MGMT-LISTINGS-CHANNELS" },
  { obj: "str_listings", state_name: "snoozed", order: 3, module: "STR-MGMT-LISTINGS-CHANNELS" },
  { obj: "str_listings", state_name: "archived", order: 4, terminal: true, module: "STR-MGMT-LISTINGS-CHANNELS" },

  { obj: "str_channel_connections", state_name: "pending", order: 1, initial: true, module: "STR-MGMT-LISTINGS-CHANNELS" },
  { obj: "str_channel_connections", state_name: "active", order: 2, rp: true, verb: "activate_channel", module: "STR-MGMT-LISTINGS-CHANNELS" },
  { obj: "str_channel_connections", state_name: "error", order: 3, module: "STR-MGMT-LISTINGS-CHANNELS" },
  { obj: "str_channel_connections", state_name: "disconnected", order: 4, terminal: true, module: "STR-MGMT-LISTINGS-CHANNELS" },

  { obj: "str_reservations", state_name: "inquiry", order: 1, initial: true, module: "STR-MGMT-RESERVATIONS-GUEST" },
  { obj: "str_reservations", state_name: "confirmed", order: 2, rp: true, verb: "confirm_reservation", module: "STR-MGMT-RESERVATIONS-GUEST" },
  { obj: "str_reservations", state_name: "checked_in", order: 3, rp: true, verb: "check_in_guest", module: "STR-MGMT-RESERVATIONS-GUEST" },
  { obj: "str_reservations", state_name: "checked_out", order: 4, module: "STR-MGMT-RESERVATIONS-GUEST" },
  { obj: "str_reservations", state_name: "cancelled", order: 5, terminal: true, module: "STR-MGMT-RESERVATIONS-GUEST" },

  { obj: "str_housekeeping_tasks", state_name: "scheduled", order: 1, initial: true, module: "STR-MGMT-OPERATIONS" },
  { obj: "str_housekeeping_tasks", state_name: "assigned", order: 2, module: "STR-MGMT-OPERATIONS" },
  { obj: "str_housekeeping_tasks", state_name: "in_progress", order: 3, module: "STR-MGMT-OPERATIONS" },
  { obj: "str_housekeeping_tasks", state_name: "completed", order: 4, rp: true, verb: "complete_turnover", module: "STR-MGMT-OPERATIONS" },
  { obj: "str_housekeeping_tasks", state_name: "inspected", order: 5, terminal: true, module: "STR-MGMT-OPERATIONS" },

  { obj: "str_owner_statements", state_name: "draft", order: 1, initial: true, module: "STR-MGMT-TRUST-ACCOUNTING" },
  { obj: "str_owner_statements", state_name: "finalized", order: 2, rp: true, verb: "finalize_statement", module: "STR-MGMT-TRUST-ACCOUNTING" },
  { obj: "str_owner_statements", state_name: "paid", order: 3, terminal: true, module: "STR-MGMT-TRUST-ACCOUNTING" },

  { obj: "str_lodging_tax_records", state_name: "collected", order: 1, initial: true, module: "STR-MGMT-TRUST-ACCOUNTING" },
  { obj: "str_lodging_tax_records", state_name: "filed", order: 2, rp: true, verb: "file_lodging_tax", module: "STR-MGMT-TRUST-ACCOUNTING" },
  { obj: "str_lodging_tax_records", state_name: "remitted", order: 3, terminal: true, module: "STR-MGMT-TRUST-ACCOUNTING" },
];

// trigger events (event_name -> obj + states + category)
const triggerEvents = [
  { event_name: "listing.published", obj: "str_listings", from_state: "draft", to_state: "active", event_category: "lifecycle",
    description: "A listing is activated and becomes bookable. The reservations module can accept inquiries and bookings against it; channel connections push it live to OTAs." },
  { event_name: "reservation.confirmed", obj: "str_reservations", from_state: "inquiry", to_state: "confirmed", event_category: "lifecycle",
    description: "A reservation is confirmed. Fires turnover scheduling in operations and a revenue accrual on the owner statement in trust accounting." },
  { event_name: "reservation.checked_out", obj: "str_reservations", from_state: "checked_in", to_state: "checked_out", event_category: "lifecycle",
    description: "A guest checks out. Fires the turnover-clean task and finalizes the occupancy/lodging-tax record for the stay." },
];

// intra-domain handoffs (source=target=STR-MGMT). keyed by (src_mod,tgt_mod,payload_obj,event)
type HO = { event: string; src: string; tgt: string; payload: string; pattern: string; friction: string; description: string };
const handoffs: HO[] = [
  { event: "listing.published", src: "STR-MGMT-LISTINGS-CHANNELS", tgt: "STR-MGMT-RESERVATIONS-GUEST", payload: "str_listings", pattern: "lifecycle_progression", friction: "low",
    description: "An activated listing becomes available to the reservations module to accept inquiries and bookings." },
  { event: "reservation.confirmed", src: "STR-MGMT-RESERVATIONS-GUEST", tgt: "STR-MGMT-OPERATIONS", payload: "str_housekeeping_tasks", pattern: "lifecycle_progression", friction: "low",
    description: "A confirmed reservation schedules the pre-arrival and turnover housekeeping tasks for the listing." },
  { event: "reservation.confirmed", src: "STR-MGMT-RESERVATIONS-GUEST", tgt: "STR-MGMT-TRUST-ACCOUNTING", payload: "str_owner_statements", pattern: "lifecycle_progression", friction: "low",
    description: "A confirmed reservation accrues a booking-revenue line on the owner's trust-accounting statement." },
  { event: "reservation.checked_out", src: "STR-MGMT-RESERVATIONS-GUEST", tgt: "STR-MGMT-OPERATIONS", payload: "str_housekeeping_tasks", pattern: "lifecycle_progression", friction: "low",
    description: "Checkout fires the turnover-clean task so the unit is ready for the next guest." },
  { event: "reservation.checked_out", src: "STR-MGMT-RESERVATIONS-GUEST", tgt: "STR-MGMT-TRUST-ACCOUNTING", payload: "str_lodging_tax_records", pattern: "lifecycle_progression", friction: "medium",
    description: "Checkout finalizes the occupancy/lodging-tax record for the stay so it can be filed and remitted per jurisdiction." },
];

// data_object_relationships (intra-domain + users edges). owner_side names the parent.
type REL = { a: string; b: string; type: string; kind: string; verb: string; inv: string; req: boolean; owner: string };
const rels: REL[] = [
  { a: "str_listings", b: "str_reservations", type: "one_to_many", kind: "reference", verb: "is booked as", inv: "books", req: true, owner: "source" },
  { a: "str_guests", b: "str_reservations", type: "one_to_many", kind: "reference", verb: "makes", inv: "is made by", req: true, owner: "source" },
  { a: "str_reservations", b: "str_guest_messages", type: "one_to_many", kind: "composition", verb: "has", inv: "belongs to", req: true, owner: "source" },
  { a: "str_listings", b: "str_housekeeping_tasks", type: "one_to_many", kind: "reference", verb: "has work at", inv: "is for", req: true, owner: "source" },
  { a: "str_reservations", b: "str_housekeeping_tasks", type: "one_to_many", kind: "reference", verb: "triggers", inv: "is triggered by", req: false, owner: "source" },
  { a: "str_listings", b: "str_rate_plans", type: "one_to_many", kind: "composition", verb: "is priced by", inv: "prices", req: true, owner: "source" },
  { a: "str_listings", b: "str_channel_connections", type: "one_to_many", kind: "composition", verb: "is distributed via", inv: "distributes", req: true, owner: "source" },
  { a: "str_property_owners", b: "str_listings", type: "one_to_many", kind: "reference", verb: "owns", inv: "is owned by", req: false, owner: "source" },
  { a: "str_property_owners", b: "str_owner_statements", type: "one_to_many", kind: "composition", verb: "receives", inv: "is for", req: true, owner: "source" },
  { a: "str_owner_statements", b: "str_reservations", type: "one_to_many", kind: "reference", verb: "itemizes", inv: "is itemized on", req: false, owner: "source" },
  { a: "str_reservations", b: "str_reviews", type: "one_to_many", kind: "reference", verb: "yields", inv: "is for", req: false, owner: "source" },
  { a: "str_reservations", b: "str_lodging_tax_records", type: "one_to_many", kind: "reference", verb: "incurs", inv: "is for", req: false, owner: "source" },
  // users edges (Rule #10)
  { a: "users", b: "str_reservations", type: "one_to_many", kind: "reference", verb: "manages", inv: "is managed by", req: false, owner: "source" },
  { a: "users", b: "str_housekeeping_tasks", type: "one_to_many", kind: "reference", verb: "is assigned", inv: "is assigned to", req: false, owner: "source" },
  { a: "users", b: "str_guest_messages", type: "one_to_many", kind: "reference", verb: "authors", inv: "is authored by", req: false, owner: "source" },
  { a: "users", b: "str_owner_statements", type: "one_to_many", kind: "reference", verb: "prepares", inv: "is prepared by", req: false, owner: "source" },
];

// aliases: obj -> [name,...] (alias_type synonym)
const aliases: Record<string, string[]> = {
  str_listings: ["property", "rental"],
  str_reservations: ["booking", "stay"],
  str_guests: ["renter"],
  str_channel_connections: ["channel listing", "OTA connection"],
  str_rate_plans: ["pricing rules"],
  str_housekeeping_tasks: ["turnover", "cleaning task"],
  str_owner_statements: ["owner payout"],
  str_property_owners: ["homeowner"],
  str_permits: ["STR license", "rental registration"],
  str_lodging_tax_records: ["occupancy tax", "transient occupancy tax"],
};

// Phase C
const bfDomains = [
  { bf: BF.BIZOPS, type: "owner" },
  { bf: BF.CUST_SVC, type: "contributor" },
  { bf: BF.MARKETING, type: "contributor" },
  { bf: BF.FINANCE, type: "consumer" },
];
const bfCaps = [
  { bf: BF.FINANCE, cap: "STR-OWNER-ACCOUNTING", type: "owner" },
  { bf: BF.FINANCE, cap: "STR-TAX-COMPLIANCE", type: "owner" },
];

// Phase E personas
type PERSONA = { role_code: string; role_name: string; bf: number | null; description: string; reach: Array<{ module: string; level: string }> };
const personas: PERSONA[] = [
  { role_code: "STR-PROPERTY-MANAGER", role_name: "Short-Term Rental Manager", bf: BF.BIZOPS,
    description: "Runs the short-term rental operation end to end: listings, bookings, guest experience, turnovers, and owner reporting.",
    reach: [
      { module: "STR-MGMT-LISTINGS-CHANNELS", level: "primary" },
      { module: "STR-MGMT-RESERVATIONS-GUEST", level: "primary" },
      { module: "STR-MGMT-OPERATIONS", level: "secondary" },
      { module: "STR-MGMT-TRUST-ACCOUNTING", level: "secondary" },
    ] },
  { role_code: "STR-REVENUE-MANAGER", role_name: "Revenue Manager", bf: BF.BIZOPS,
    description: "Owns listing distribution and nightly pricing: channel connections, rate plans, and dynamic-pricing rules.",
    reach: [
      { module: "STR-MGMT-LISTINGS-CHANNELS", level: "primary" },
      { module: "STR-MGMT-RESERVATIONS-GUEST", level: "secondary" },
    ] },
  { role_code: "STR-GUEST-EXPERIENCE-AGENT", role_name: "Guest Experience Agent", bf: BF.CUST_SVC,
    description: "Handles guest communication and bookings and coordinates turnovers so each guest has a smooth stay.",
    reach: [
      { module: "STR-MGMT-RESERVATIONS-GUEST", level: "primary" },
      { module: "STR-MGMT-OPERATIONS", level: "secondary" },
    ] },
  { role_code: "STR-FIELD-OPS-COORDINATOR", role_name: "Field Operations Coordinator", bf: BF.BIZOPS,
    description: "Schedules and verifies housekeeping and turnover work against the booking calendar.",
    reach: [
      { module: "STR-MGMT-OPERATIONS", level: "primary" },
      { module: "STR-MGMT-RESERVATIONS-GUEST", level: "secondary" },
    ] },
  { role_code: "STR-TRUST-ACCOUNTANT", role_name: "Trust Accountant", bf: BF.FINANCE,
    description: "Produces owner statements and payouts and handles lodging-tax filing and permit compliance.",
    reach: [
      { module: "STR-MGMT-TRUST-ACCOUNTING", level: "primary" },
      { module: "STR-MGMT-RESERVATIONS-GUEST", level: "secondary" },
    ] },
];

// Phase S tools
type TOOL = { tool_name: string; operation_kind: string; obj?: string; description: string };
const tools: TOOL[] = [
  { tool_name: "query_str_listings", operation_kind: "query", obj: "str_listings", description: "Read short-term rental listings and their details and availability." },
  { tool_name: "create_str_listing", operation_kind: "mutate", obj: "str_listings", description: "Create a new short-term rental listing." },
  { tool_name: "update_str_listing", operation_kind: "mutate", obj: "str_listings", description: "Update a listing's details, amenities, or availability." },
  { tool_name: "publish_str_listing", operation_kind: "mutate", obj: "str_listings", description: "Activate and publish a listing so it becomes bookable." },
  { tool_name: "query_str_channel_connections", operation_kind: "query", obj: "str_channel_connections", description: "Read channel connections and their sync status." },
  { tool_name: "sync_str_channel", operation_kind: "mutate", obj: "str_channel_connections", description: "Push rates and availability to a connected booking channel and reconcile its state." },
  { tool_name: "query_str_rate_plans", operation_kind: "query", obj: "str_rate_plans", description: "Read rate plans and pricing rules for listings." },
  { tool_name: "update_str_rate_plan", operation_kind: "mutate", obj: "str_rate_plans", description: "Update base, seasonal, or dynamic pricing rules on a rate plan." },
  { tool_name: "optimize_nightly_rate", operation_kind: "compute", description: "Compute a recommended nightly rate from demand, seasonality, lead-time, and competitor-set signals." },
  { tool_name: "fetch_competitor_rates", operation_kind: "fetch", description: "Fetch comparable-listing nightly rates and market demand signals from external pricing data sources." },
  { tool_name: "query_str_reservations", operation_kind: "query", obj: "str_reservations", description: "Read reservations and their status across channels." },
  { tool_name: "create_str_reservation", operation_kind: "mutate", obj: "str_reservations", description: "Create a reservation against a listing." },
  { tool_name: "confirm_str_reservation", operation_kind: "mutate", obj: "str_reservations", description: "Confirm a reservation." },
  { tool_name: "cancel_str_reservation", operation_kind: "mutate", obj: "str_reservations", description: "Cancel a reservation." },
  { tool_name: "query_str_guests", operation_kind: "query", obj: "str_guests", description: "Read guest profiles and stay history." },
  { tool_name: "query_str_guest_messages", operation_kind: "query", obj: "str_guest_messages", description: "Read the unified guest message inbox for a reservation." },
  { tool_name: "send_str_guest_message", operation_kind: "mutate", obj: "str_guest_messages", description: "Record and send a message to a guest in the unified inbox." },
  { tool_name: "query_str_reviews", operation_kind: "query", obj: "str_reviews", description: "Read guest and host reviews across channels." },
  { tool_name: "query_str_housekeeping_tasks", operation_kind: "query", obj: "str_housekeeping_tasks", description: "Read housekeeping and turnover tasks and their status." },
  { tool_name: "create_str_housekeeping_task", operation_kind: "mutate", obj: "str_housekeeping_tasks", description: "Create or schedule a housekeeping or turnover task." },
  { tool_name: "complete_str_housekeeping_task", operation_kind: "mutate", obj: "str_housekeeping_tasks", description: "Mark a housekeeping or turnover task complete." },
  { tool_name: "query_str_owner_statements", operation_kind: "query", obj: "str_owner_statements", description: "Read owner trust-accounting statements." },
  { tool_name: "finalize_str_owner_statement", operation_kind: "mutate", obj: "str_owner_statements", description: "Finalize an owner statement for payout." },
  { tool_name: "query_str_property_owners", operation_kind: "query", obj: "str_property_owners", description: "Read property-owner records and management terms." },
  { tool_name: "file_str_lodging_tax", operation_kind: "mutate", obj: "str_lodging_tax_records", description: "File and record remittance of an occupancy/lodging-tax record." },
];
// shared/abstraction tools (reused if already present; created if not)
const sharedTools: TOOL[] = [
  { tool_name: "notify_person", operation_kind: "side_effect", description: "Send a notification to a single recipient over whichever channel the deployment wires up." },
  { tool_name: "notify_team", operation_kind: "side_effect", description: "Broadcast a notification to a team over whichever channel the deployment wires up." },
  { tool_name: "execute_payment", operation_kind: "side_effect", description: "Execute an outbound payment (e.g. an owner payout) via an external payment processor." },
  { tool_name: "receive_webhook", operation_kind: "inbound", description: "Receive an inbound webhook event from an external system." },
];

// module -> tools with requirement_level
type MT = { module: string; tool: string; req: string };
const moduleTools: MT[] = [
  // LISTINGS-CHANNELS
  ...["query_str_listings","create_str_listing","update_str_listing","publish_str_listing","query_str_channel_connections","sync_str_channel","query_str_rate_plans","update_str_rate_plan"].map(t => ({ module: "STR-MGMT-LISTINGS-CHANNELS", tool: t, req: "required" })),
  ...["optimize_nightly_rate","fetch_competitor_rates","receive_webhook"].map(t => ({ module: "STR-MGMT-LISTINGS-CHANNELS", tool: t, req: "optional" })),
  // RESERVATIONS-GUEST
  ...["query_str_reservations","create_str_reservation","confirm_str_reservation","cancel_str_reservation","query_str_guests","query_str_guest_messages","send_str_guest_message","notify_person"].map(t => ({ module: "STR-MGMT-RESERVATIONS-GUEST", tool: t, req: "required" })),
  ...["query_str_reviews","receive_webhook"].map(t => ({ module: "STR-MGMT-RESERVATIONS-GUEST", tool: t, req: "optional" })),
  // OPERATIONS
  ...["query_str_housekeeping_tasks","create_str_housekeeping_task","complete_str_housekeeping_task","notify_team"].map(t => ({ module: "STR-MGMT-OPERATIONS", tool: t, req: "required" })),
  // TRUST-ACCOUNTING
  ...["query_str_owner_statements","finalize_str_owner_statement","query_str_property_owners"].map(t => ({ module: "STR-MGMT-TRUST-ACCOUNTING", tool: t, req: "required" })),
  ...["file_str_lodging_tax","execute_payment","notify_person"].map(t => ({ module: "STR-MGMT-TRUST-ACCOUNTING", tool: t, req: "optional" })),
];

// ============================================================ RUN
async function main() {
  validateDomainRow(domain);

  console.log("\n=== Phase A: domain ===");
  const domMap = await syncTable("/domains", [domain], "domain_code");
  const domainId = domMap.get("STR-MGMT")!;

  console.log("=== Phase A: capabilities ===");
  const capMap = await syncTable("/capabilities", capabilities, "capability_code");

  console.log("=== Phase A: capability_domains ===");
  await syncJunction("/capability_domains",
    capabilities.map(c => ({ capability_id: capMap.get(c.capability_code), domain_id: domainId, notes: "" })),
    ["capability_id", "domain_id"]);

  console.log("=== Phase A: domain_modules ===");
  const modMap = await syncTable("/domain_modules",
    modules.map(m => ({ ...m, domain_id: domainId, module_kind: "full" })),
    "domain_module_code");

  console.log("=== Phase A: domain_module_capabilities ===");
  await syncJunction("/domain_module_capabilities",
    Object.entries(moduleCaps).flatMap(([mod, caps]) =>
      caps.map(c => ({ domain_module_id: modMap.get(mod), capability_id: capMap.get(c), notes: "" }))),
    ["domain_module_id", "capability_id"]);

  console.log("=== Phase A: vendors ===");
  const vendorMap = await syncTable("/vendors", vendors.map(v => ({ ...v, notes: "" })), "vendor_name");

  console.log("=== Phase A: solutions ===");
  const solMap = await syncTable("/solutions",
    solutions.map(s => ({ solution_name: s.solution_name, description: s.description, solution_url: s.solution_url,
      vendor_id: vendorMap.get(s.vendor), solution_type: "saas", is_active_in_market: true, notes: "" })),
    "solution_name");

  console.log("=== Phase A: solution_domains ===");
  await syncJunction("/solution_domains",
    solutions.map(s => ({ solution_id: solMap.get(s.solution_name), domain_id: domainId, coverage_level: "primary", notes: "" })),
    ["solution_id", "domain_id"]);

  console.log("\n=== Phase B: data_objects ===");
  const doMap = await syncTable("/data_objects",
    dataObjects.map(o => ({
      data_object_name: o.data_object_name, singular_label: o.singular_label, plural_label: o.plural_label,
      description: o.description, kind: "domain_owned",
      entity_type: o.entity_type, is_canonical_bare_word: false, naming_authority_rationale: "",
      has_personal_content: !!o.has_personal_content, has_submit_lock: !!o.has_submit_lock, has_single_approver: !!o.has_single_approver,
    })), "data_object_name");
  doMap.set("users", USERS_ID);

  console.log("=== Phase B: domain_module_data_objects ===");
  await syncJunction("/domain_module_data_objects",
    dmdo.map(r => ({ domain_module_id: modMap.get(r.module), data_object_id: doMap.get(r.obj), role: r.role, necessity: r.necessity, notes: "" })),
    ["domain_module_id", "data_object_id"]);

  console.log("=== Phase B: data_object_lifecycle_states ===");
  await syncJunction("/data_object_lifecycle_states",
    lifecycle.map(s => ({
      data_object_id: doMap.get(s.obj), state_name: s.state_name, state_order: s.order,
      is_initial: !!s.initial, is_terminal: !!s.terminal, requires_permission: !!s.rp,
      permission_verb_override: s.verb ?? "", domain_module_id: modMap.get(s.module),
    })), ["data_object_id", "state_name"]);

  console.log("=== Phase B: trigger_events ===");
  const teMap = await syncTable("/trigger_events",
    triggerEvents.map(e => ({
      event_name: e.event_name, data_object_id: doMap.get(e.obj), from_state: e.from_state,
      to_state: e.to_state, description: e.description, event_category: e.event_category,
    })), "event_name");

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
    Object.entries(aliases).flatMap(([obj, names]) =>
      names.map(n => ({ data_object_id: doMap.get(obj), alias_name: n, alias_type: "synonym", is_preferred: false, notes: "" }))),
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
    personas.map(p => ({ role_code: p.role_code, role_name: p.role_name, description: p.description, business_function_id: p.bf })),
    "role_code");

  console.log("=== Phase E: role_modules ===");
  await syncJunction("/role_modules",
    personas.flatMap(p => p.reach.map(r => ({ role_id: roleMap.get(p.role_code), domain_module_id: modMap.get(r.module), interaction_level: r.level, notes: "" }))),
    ["role_id", "domain_module_id"]);

  console.log("\n=== Phase S: tools ===");
  const allToolDefs = [...tools, ...sharedTools];
  // coverage_tier check constraint: query/mutate must be 'platform'; receive/inbound is platform too;
  // external actions/compute/fetch are 'external' until the platform ships them natively.
  const coverageTier = (op: string) =>
    op === "query" || op === "mutate" || op === "inbound" ? "platform" : "external";
  const toolMap = await syncTable("/tools",
    allToolDefs.map(t => ({ tool_name: t.tool_name, operation_kind: t.operation_kind, data_object_id: t.obj ? doMap.get(t.obj) : null, coverage_tier: coverageTier(t.operation_kind), description: t.description })),
    "tool_name");

  console.log("=== Phase S: skills (system) ===");
  await syncTable("/skills",
    [{ skill_name: "str-mgmt-system", skill_type: "system", domain_id: domainId, domain_module_id: null, process_id: null,
       description: "System agent surface for Short-Term and Vacation Rental Management. Derives its toolset from the domain's four modules: listing/channel/pricing, reservations/guest, turnover operations, and owner trust accounting." }],
    "skill_name");

  console.log("=== Phase S: domain_module_tools ===");
  await syncJunction("/domain_module_tools",
    moduleTools.map(mt => ({ domain_module_id: modMap.get(mt.module), tool_id: toolMap.get(mt.tool), requirement_level: mt.req, notes: "" })),
    ["domain_module_id", "tool_id"]);

  // ----- summary
  console.log("\n=== Summary counts (STR-MGMT) ===");
  const c = async (label: string, path: string) => console.log(`  ${label}: ${(await get(path)).length}`);
  await c("modules", `/domain_modules?domain_id=eq.${domainId}&select=id`);
  await c("capability_domains", `/capability_domains?domain_id=eq.${domainId}&select=capability_id`);
  await c("masters(DMDO)", `/domain_module_data_objects?domain_module_id=in.(${modules.map(m => modMap.get(m.domain_module_code)).join(",")})&role=eq.master&select=data_object_id`);
  await c("lifecycle_states", `/data_object_lifecycle_states?data_object_id=in.(${dataObjects.map(o => doMap.get(o.data_object_name)).join(",")})&select=id`);
  await c("handoffs", `/handoffs?source_domain_id=eq.${domainId}&select=id`);
  await c("personas", `/domain_roles?role_code=like.STR-*&select=id`);
  await c("domain_module_tools", `/domain_module_tools?domain_module_id=in.(${modules.map(m => modMap.get(m.domain_module_code)).join(",")})&select=tool_id`);
  console.log("\nUI: https://tests.semantius.app/domain_map/domains");
  console.log("    https://tests.semantius.app/domain_map/domain_modules");
  console.log("    https://tests.semantius.app/domain_map/data_objects");
  console.log("Done.");
}
await main();
