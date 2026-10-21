#!/usr/bin/env bun
// Phase B — Data-object footprint for ACTIVITY-BOOKING (domain 193).
// Modules: CORE=418, SCHED=419, WAIVERS=420, DIST=421. Reused: customers=97, users=748.
// Loads: data_objects, domain_module_data_objects, data_object_aliases,
// data_object_lifecycle_states, trigger_events, handoffs, data_object_relationships.
// Idempotent throughout.
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

const DOM = 193, CORE = 418, SCHED = 419, WAIVERS = 420, DIST = 421, CUSTOMERS = 97, USERS = 748;
const CRM = 69, ESIGN = 94, FIN = 65;

// ============================================================ 1. DATA OBJECTS
type DO = {
  data_object_name: string; singular_label: string; plural_label: string;
  description: string; catalog_description: string; entity_type: string;
  has_personal_content?: boolean; has_submit_lock?: boolean; has_single_approver?: boolean;
};
const dataObjects: DO[] = [
  { data_object_name: "activity_products", singular_label: "Activity Product", plural_label: "Activity Products", entity_type: "catalog",
    description: "The sellable tour, activity, experience, or rental that an operator offers. Defines duration, capacity, what is included, pricing structure, location, and the resources it draws on. Published to the booking site and to distribution channels.",
    catalog_description: "Sellable tours, activities, experiences, and rentals an operator offers, with duration, capacity, inclusions, and pricing." },
  { data_object_name: "activity_departures", singular_label: "Activity Departure", plural_label: "Activity Departures", entity_type: "operational_workflow",
    description: "A specific scheduled instance of an activity product (a time slot, session, or trip date) with its own capacity, assigned resources, and roster. The unit guests actually book onto.",
    catalog_description: "Scheduled instances of an activity product, each with its own date, capacity, and roster that guests book onto." },
  { data_object_name: "rate_options", singular_label: "Rate Option", plural_label: "Rate Options", entity_type: "catalog",
    description: "A priced option on an activity product (adult, child, group, season, or member rate), defining price, applicable participant type, and any seasonal or dynamic adjustment rules.",
    catalog_description: "Priced options on an activity product, such as adult, child, group, and seasonal rates with their adjustment rules." },
  { data_object_name: "activity_bookings", singular_label: "Activity Booking", plural_label: "Activity Bookings", entity_type: "operational_workflow",
    description: "A reservation a customer makes against one or more departures, holding the booked rate options, participant count, total price, payment status, channel of origin, and the full lifecycle from pending through completed, cancelled, or no-show.",
    catalog_description: "Reservations customers make against departures, holding rate options, participants, price, and booking status." },
  { data_object_name: "booking_participants", singular_label: "Booking Participant", plural_label: "Booking Participants", entity_type: "operational_record",
    description: "An individual guest on a booking, carrying name, contact, rate type, any per-person requirements (weight, experience level, dietary), and the link to that guest's signed waiver.",
    catalog_description: "Individual guests on a booking, with rate type, per-person requirements, and a link to each guest's waiver." },
  { data_object_name: "booking_extras", singular_label: "Booking Extra", plural_label: "Booking Extras", entity_type: "operational_record",
    description: "An add-on or upsell attached to a booking (gear rental, transport, photos, meals, permits), with its own price and quantity.",
    catalog_description: "Add-ons and upsells attached to a booking, such as gear, transport, meals, or permits, with price and quantity." },
  { data_object_name: "discount_codes", singular_label: "Discount Code", plural_label: "Discount Codes", entity_type: "catalog",
    description: "A promotional or coupon code that reduces booking price, with redemption rules (validity window, usage caps, applicable products, percentage or fixed amount).",
    catalog_description: "Promotional and coupon codes that reduce booking price, with validity windows, usage caps, and applicable products." },
  { data_object_name: "gift_cards", singular_label: "Gift Card", plural_label: "Gift Cards", entity_type: "operational_record",
    description: "A stored-value gift card or voucher purchased by one customer and redeemable against future bookings, tracking issued value, remaining balance, and expiry.",
    catalog_description: "Stored-value gift cards and vouchers redeemable against future bookings, tracking balance and expiry." },
  { data_object_name: "booking_payments", singular_label: "Booking Payment", plural_label: "Booking Payments", entity_type: "operational_record",
    description: "A payment event against a booking (deposit, balance, tip, or surcharge), holding the tokenized processor reference, amount, method, and captured or failed status. Card data is tokenized, never stored.",
    catalog_description: "Payment events against a booking, holding tokenized processor references, amounts, methods, and capture status." },
  { data_object_name: "booking_refunds", singular_label: "Booking Refund", plural_label: "Booking Refunds", entity_type: "operational_workflow",
    description: "A refund or credit issued against a booking on cancellation or adjustment, moving from requested through approved to processed or denied, with amount, reason, and the approver.",
    catalog_description: "Refunds and credits issued against a booking, moving from requested through approval to processed or denied.",
    has_single_approver: true },
  { data_object_name: "activity_reviews", singular_label: "Activity Review", plural_label: "Activity Reviews", entity_type: "operational_record",
    description: "A post-trip rating and comment a guest leaves about an activity or guide, with the operator's optional response, used for marketing and reputation.",
    catalog_description: "Post-trip ratings and comments guests leave about an activity or guide, with the operator's optional response." },
  { data_object_name: "customer_notifications", singular_label: "Customer Notification", plural_label: "Customer Notifications", entity_type: "operational_record",
    description: "An automated message sent to a customer about a booking (confirmation, reminder, what-to-bring, weather alert, review request), recording channel, template, and delivery status.",
    catalog_description: "Automated messages sent to customers about a booking, recording channel, template, and delivery status." },
  { data_object_name: "booking_manifests", singular_label: "Booking Manifest", plural_label: "Booking Manifests", entity_type: "computed",
    description: "The generated roster for a departure: all participants, their requirements, waiver status, assigned guides, and equipment, compiled for the staff running the trip.",
    catalog_description: "Generated rosters for a departure, compiling participants, requirements, waiver status, guides, and equipment." },
  { data_object_name: "bookable_resources", singular_label: "Bookable Resource", plural_label: "Bookable Resources", entity_type: "catalog",
    description: "A finite resource that constrains availability and is assigned to departures: guides, vehicles, boats, equipment sets, or rooms. Defines capacity, type, and scheduling rules.",
    catalog_description: "Finite resources that constrain availability and are assigned to departures, such as guides, vehicles, boats, and gear." },
  { data_object_name: "guide_assignments", singular_label: "Guide Assignment", plural_label: "Guide Assignments", entity_type: "operational_workflow",
    description: "The assignment of a guide or staff member to a departure, tracking proposed, confirmed, declined, or completed status, the guide's certifications for that activity, and the confirmation message sent.",
    catalog_description: "Assignments of guides and staff to departures, tracking confirmation status and the guide's certifications." },
  { data_object_name: "equipment_rentals", singular_label: "Equipment Rental", plural_label: "Equipment Rentals", entity_type: "operational_workflow",
    description: "A rental of gear or equipment to a customer for a booking or standalone, moving from reserved through checked-out to returned, overdue, or damaged, with deposit and condition tracking.",
    catalog_description: "Rentals of gear and equipment to customers, moving from reserved through checked-out to returned or damaged." },
  { data_object_name: "lodging_units", singular_label: "Lodging Unit", plural_label: "Lodging Units", entity_type: "catalog",
    description: "A bookable room, cabin, bunk, or campsite an adventure or multi-day operator offers alongside activities, with capacity and nightly availability.",
    catalog_description: "Bookable rooms, cabins, bunks, or campsites offered alongside activities, with capacity and nightly availability." },
  { data_object_name: "activity_itineraries", singular_label: "Activity Itinerary", plural_label: "Activity Itineraries", entity_type: "catalog",
    description: "The day-by-day plan for a multi-day trip or guided expedition: stops, activities, lodging, meals, and logistics, attached to a multi-day activity product.",
    catalog_description: "Day-by-day plans for multi-day trips and guided expeditions, covering stops, lodging, meals, and logistics." },
  { data_object_name: "liability_waivers", singular_label: "Liability Waiver", plural_label: "Liability Waivers", entity_type: "operational_workflow",
    description: "A signed liability release and assumption-of-risk agreement tied to a booking and participant, capturing the template, electronic signature, signer (or guardian for a minor), timestamp, and IP, and locking once signed.",
    catalog_description: "Signed liability releases tied to a booking and participant, capturing template, signature, signer, and timestamp.",
    has_personal_content: true, has_submit_lock: true },
  { data_object_name: "waiver_templates", singular_label: "Waiver Template", plural_label: "Waiver Templates", entity_type: "catalog",
    description: "A reusable waiver document definition with custom clauses, questions, and acknowledgements an operator requires for an activity, published for guests to sign.",
    catalog_description: "Reusable waiver definitions with custom clauses, questions, and acknowledgements an operator requires for an activity." },
  { data_object_name: "channel_listings", singular_label: "Channel Listing", plural_label: "Channel Listings", entity_type: "catalog",
    description: "The mapping of an activity product to an external online travel agency or reseller channel, holding channel-specific content, the pushed availability, and the commission terms.",
    catalog_description: "Mappings of activity products to online travel agency or reseller channels, with channel content and availability." },
  { data_object_name: "reseller_partners", singular_label: "Reseller Partner", plural_label: "Reseller Partners", entity_type: "catalog",
    description: "An online travel agency, agent, or reseller that distributes an operator's products, with contact, payout details, and the marketplace they represent.",
    catalog_description: "Online travel agencies, agents, and resellers that distribute an operator's products, with payout and contact details." },
  { data_object_name: "partner_contracts", singular_label: "Partner Contract", plural_label: "Partner Contracts", entity_type: "operational_record",
    description: "The negotiated commercial agreement with a reseller partner: commission or net-rate terms, which products are distributed, and payment settlement rules.",
    catalog_description: "Negotiated agreements with reseller partners, covering commission or net-rate terms and which products are distributed." },
];

// role assignments per module: [module_id, data_object_name, role, necessity]
const dmdo: [number, string, string, string][] = [
  // CORE masters
  [CORE, "activity_products", "master", "required"],
  [CORE, "activity_departures", "master", "required"],
  [CORE, "rate_options", "master", "required"],
  [CORE, "activity_bookings", "master", "required"],
  [CORE, "booking_participants", "master", "required"],
  [CORE, "booking_extras", "master", "optional"],
  [CORE, "discount_codes", "master", "optional"],
  [CORE, "gift_cards", "master", "optional"],
  [CORE, "booking_payments", "master", "required"],
  [CORE, "booking_refunds", "master", "required"],
  [CORE, "activity_reviews", "master", "optional"],
  [CORE, "customer_notifications", "master", "required"],
  [CORE, "booking_manifests", "master", "optional"],
  [CORE, "customers", "embedded_master", "required"],
  // SCHED masters
  [SCHED, "bookable_resources", "master", "required"],
  [SCHED, "guide_assignments", "master", "required"],
  [SCHED, "equipment_rentals", "master", "optional"],
  [SCHED, "lodging_units", "master", "optional"],
  [SCHED, "activity_itineraries", "master", "optional"],
  [SCHED, "activity_departures", "embedded_master", "required"],
  [SCHED, "activity_bookings", "embedded_master", "required"],
  // WAIVERS masters
  [WAIVERS, "liability_waivers", "master", "required"],
  [WAIVERS, "waiver_templates", "master", "required"],
  [WAIVERS, "activity_bookings", "embedded_master", "required"],
  [WAIVERS, "booking_participants", "embedded_master", "required"],
  // CHANNEL-DIST masters (all optional, Rule #16 case C: Origin/Flybook don't model OTA)
  [DIST, "channel_listings", "master", "optional"],
  [DIST, "reseller_partners", "master", "optional"],
  [DIST, "partner_contracts", "master", "optional"],
  [DIST, "activity_products", "embedded_master", "optional"],
  [DIST, "activity_departures", "embedded_master", "optional"],
  [DIST, "activity_bookings", "embedded_master", "optional"],
];

// ============================================================ 2. ALIASES (non-self-explanatory masters)
type Alias = { data_object_name: string; alias_name: string; alias_type: string };
const aliases: Alias[] = [
  { data_object_name: "activity_products", alias_name: "experiences", alias_type: "synonym" },
  { data_object_name: "activity_products", alias_name: "tours", alias_type: "synonym" },
  { data_object_name: "activity_departures", alias_name: "sessions", alias_type: "synonym" },
  { data_object_name: "activity_departures", alias_name: "time slots", alias_type: "synonym" },
  { data_object_name: "activity_departures", alias_name: "availabilities", alias_type: "synonym" },
  { data_object_name: "activity_bookings", alias_name: "reservations", alias_type: "synonym" },
  { data_object_name: "rate_options", alias_name: "price options", alias_type: "synonym" },
  { data_object_name: "bookable_resources", alias_name: "assets", alias_type: "synonym" },
  { data_object_name: "guide_assignments", alias_name: "crew assignments", alias_type: "synonym" },
  { data_object_name: "liability_waivers", alias_name: "release forms", alias_type: "synonym" },
  { data_object_name: "liability_waivers", alias_name: "assumption of risk agreements", alias_type: "synonym" },
  { data_object_name: "booking_manifests", alias_name: "trip rosters", alias_type: "synonym" },
  { data_object_name: "reseller_partners", alias_name: "OTAs", alias_type: "synonym" },
  { data_object_name: "channel_listings", alias_name: "channel mappings", alias_type: "synonym" },
];

// ============================================================ 3. LIFECYCLE STATES (operational_workflow masters)
type LCS = { data_object_name: string; state_name: string; state_order: number; is_initial?: boolean; is_terminal?: boolean; requires_permission?: boolean; permission_verb_override?: string; domain_module_id: number };
const lifecycle: LCS[] = [
  // activity_departures (CORE)
  { data_object_name: "activity_departures", state_name: "scheduled", state_order: 1, is_initial: true, domain_module_id: CORE },
  { data_object_name: "activity_departures", state_name: "open", state_order: 2, domain_module_id: CORE },
  { data_object_name: "activity_departures", state_name: "full", state_order: 3, domain_module_id: CORE },
  { data_object_name: "activity_departures", state_name: "departed", state_order: 4, domain_module_id: CORE },
  { data_object_name: "activity_departures", state_name: "completed", state_order: 5, is_terminal: true, domain_module_id: CORE },
  { data_object_name: "activity_departures", state_name: "cancelled", state_order: 6, is_terminal: true, requires_permission: true, permission_verb_override: "cancel_departure", domain_module_id: CORE },
  // activity_bookings (CORE)
  { data_object_name: "activity_bookings", state_name: "pending", state_order: 1, is_initial: true, domain_module_id: CORE },
  { data_object_name: "activity_bookings", state_name: "confirmed", state_order: 2, requires_permission: true, permission_verb_override: "confirm_booking", domain_module_id: CORE },
  { data_object_name: "activity_bookings", state_name: "completed", state_order: 3, is_terminal: true, domain_module_id: CORE },
  { data_object_name: "activity_bookings", state_name: "cancelled", state_order: 4, is_terminal: true, requires_permission: true, permission_verb_override: "cancel_booking", domain_module_id: CORE },
  { data_object_name: "activity_bookings", state_name: "no_show", state_order: 5, is_terminal: true, domain_module_id: CORE },
  // booking_refunds (CORE)
  { data_object_name: "booking_refunds", state_name: "requested", state_order: 1, is_initial: true, domain_module_id: CORE },
  { data_object_name: "booking_refunds", state_name: "approved", state_order: 2, requires_permission: true, permission_verb_override: "approve_refund", domain_module_id: CORE },
  { data_object_name: "booking_refunds", state_name: "processed", state_order: 3, is_terminal: true, domain_module_id: CORE },
  { data_object_name: "booking_refunds", state_name: "denied", state_order: 4, is_terminal: true, domain_module_id: CORE },
  // guide_assignments (SCHED)
  { data_object_name: "guide_assignments", state_name: "proposed", state_order: 1, is_initial: true, domain_module_id: SCHED },
  { data_object_name: "guide_assignments", state_name: "confirmed", state_order: 2, requires_permission: true, permission_verb_override: "confirm_guide_assignment", domain_module_id: SCHED },
  { data_object_name: "guide_assignments", state_name: "declined", state_order: 3, is_terminal: true, domain_module_id: SCHED },
  { data_object_name: "guide_assignments", state_name: "completed", state_order: 4, is_terminal: true, domain_module_id: SCHED },
  // equipment_rentals (SCHED)
  { data_object_name: "equipment_rentals", state_name: "reserved", state_order: 1, is_initial: true, domain_module_id: SCHED },
  { data_object_name: "equipment_rentals", state_name: "checked_out", state_order: 2, requires_permission: true, permission_verb_override: "check_out_rental", domain_module_id: SCHED },
  { data_object_name: "equipment_rentals", state_name: "returned", state_order: 3, is_terminal: true, domain_module_id: SCHED },
  { data_object_name: "equipment_rentals", state_name: "damaged", state_order: 4, is_terminal: true, domain_module_id: SCHED },
  // liability_waivers (WAIVERS)
  { data_object_name: "liability_waivers", state_name: "pending", state_order: 1, is_initial: true, domain_module_id: WAIVERS },
  { data_object_name: "liability_waivers", state_name: "sent", state_order: 2, domain_module_id: WAIVERS },
  { data_object_name: "liability_waivers", state_name: "signed", state_order: 3, is_terminal: true, requires_permission: true, permission_verb_override: "sign_waiver", domain_module_id: WAIVERS },
  { data_object_name: "liability_waivers", state_name: "expired", state_order: 4, is_terminal: true, domain_module_id: WAIVERS },
];

// ============================================================ 4. TRIGGER EVENTS
type TE = { event_name: string; data_object_name: string; from_state: string; to_state: string; event_category: string; description: string };
const triggerEvents: TE[] = [
  { event_name: "booking.confirmed", data_object_name: "activity_bookings", from_state: "pending", to_state: "confirmed", event_category: "lifecycle",
    description: "A booking is confirmed (payment captured or hold accepted). Drives guide assignment, waiver dispatch, manifest update, and channel availability sync." },
  { event_name: "booking.cancelled", data_object_name: "activity_bookings", from_state: "confirmed", to_state: "cancelled", event_category: "lifecycle",
    description: "A booking is cancelled by guest or operator. Releases capacity, may trigger a refund, and frees assigned guides and equipment." },
  { event_name: "booking.completed", data_object_name: "activity_bookings", from_state: "confirmed", to_state: "completed", event_category: "lifecycle",
    description: "A booking is completed after the activity takes place. Feeds the customer record and history downstream and prompts a review request." },
  { event_name: "refund.processed", data_object_name: "booking_refunds", from_state: "approved", to_state: "processed", event_category: "lifecycle",
    description: "A refund is processed back to the customer. Exports the financial adjustment to accounting." },
  { event_name: "payment.captured", data_object_name: "booking_payments", from_state: "pending", to_state: "captured", event_category: "state_change",
    description: "A booking payment is captured by the processor. Recognized as revenue and exported to accounting." },
  { event_name: "waiver.sent", data_object_name: "liability_waivers", from_state: "pending", to_state: "sent", event_category: "lifecycle",
    description: "A waiver is dispatched to a participant for electronic signature via the e-signature provider." },
  { event_name: "waiver.signed", data_object_name: "liability_waivers", from_state: "sent", to_state: "signed", event_category: "lifecycle",
    description: "A participant signs their liability waiver. Marks the participant ready and attaches the signed release to the booking." },
  { event_name: "guide.assigned", data_object_name: "guide_assignments", from_state: "proposed", to_state: "confirmed", event_category: "lifecycle",
    description: "A guide confirms assignment to a departure. Updates the departure manifest and notifies the customer." },
  { event_name: "departure.completed", data_object_name: "activity_departures", from_state: "departed", to_state: "completed", event_category: "lifecycle",
    description: "A departure is completed. Closes out its bookings, releases resources, and triggers review requests." },
];

// ============================================================ 5. HANDOFFS
// [src_dom, tgt_dom, src_mod|null, tgt_mod|null, data_object_name, event_name, pattern, friction, description]
type HO = [number, number, number | null, number | null, string, string, string, string, string];
const handoffs: HO[] = [
  // Cross-domain outbound (target module left null; target domain's B10b sets it)
  [DOM, CRM, CORE, null, "customers", "booking.completed", "api_call", "medium",
    "On booking completion, the customer and trip history are pushed to CRM so the operator builds a guest relationship beyond the single booking."],
  [DOM, ESIGN, WAIVERS, null, "liability_waivers", "waiver.sent", "api_call", "medium",
    "A waiver is sent to the e-signature provider for the participant to sign; the signed release is returned and attached to the booking."],
  [DOM, FIN, CORE, null, "booking_payments", "payment.captured", "api_call", "medium",
    "Captured booking payments are exported to accounting for revenue recognition and reconciliation."],
  // Intra-domain (both modules known)
  [DOM, DOM, CORE, SCHED, "activity_bookings", "booking.confirmed", "lifecycle_progression", "low",
    "A confirmed booking prompts guide and resource scheduling to assign staff and equipment to the departure."],
  [DOM, DOM, CORE, WAIVERS, "liability_waivers", "booking.confirmed", "lifecycle_progression", "low",
    "A confirmed booking generates pending waivers for each participant to sign before the activity."],
  [DOM, DOM, CORE, DIST, "activity_departures", "booking.confirmed", "lifecycle_progression", "low",
    "A confirmed booking reduces remaining capacity and syncs updated availability out to distribution channels."],
  [DOM, DOM, WAIVERS, CORE, "activity_bookings", "waiver.signed", "lifecycle_progression", "low",
    "When all participants have signed, the booking is marked ready for the departure."],
  [DOM, DOM, SCHED, CORE, "booking_manifests", "guide.assigned", "lifecycle_progression", "low",
    "A confirmed guide assignment updates the departure manifest the core module presents to staff."],
  [DOM, DOM, CORE, SCHED, "activity_departures", "departure.completed", "lifecycle_progression", "low",
    "A completed departure releases its assigned guides and equipment back to the scheduling pool."],
];

// ============================================================ 6. RELATIONSHIPS
// [from, to, type, kind, verb, inverse, is_required, owner_side]
type REL = [string, string, string, string, string, string, boolean, string];
const rels: REL[] = [
  // intra-domain composition / reference
  ["activity_products", "activity_departures", "one_to_many", "composition", "schedules", "is scheduled for", true, "source"],
  ["activity_products", "rate_options", "one_to_many", "composition", "prices via", "prices", true, "source"],
  ["activity_products", "activity_itineraries", "one_to_many", "composition", "details", "details", false, "source"],
  ["activity_departures", "activity_bookings", "one_to_many", "reference", "receives", "is for", true, "source"],
  ["activity_bookings", "booking_participants", "one_to_many", "composition", "includes", "is part of", true, "source"],
  ["activity_bookings", "booking_extras", "one_to_many", "composition", "adds", "is added to", false, "source"],
  ["activity_bookings", "booking_payments", "one_to_many", "composition", "is paid by", "pays", true, "source"],
  ["activity_bookings", "booking_refunds", "one_to_many", "composition", "is refunded by", "refunds", false, "source"],
  ["activity_bookings", "discount_codes", "many_to_many", "reference", "applies", "is applied to", false, "target"],
  ["activity_bookings", "gift_cards", "many_to_many", "reference", "redeems", "is redeemed on", false, "target"],
  ["activity_bookings", "customers", "many_to_many", "reference", "is booked by", "books", true, "target"],
  ["activity_departures", "booking_manifests", "one_to_one", "composition", "produces", "is produced for", false, "source"],
  ["activity_departures", "guide_assignments", "one_to_many", "reference", "is staffed by", "staffs", true, "source"],
  ["activity_departures", "bookable_resources", "many_to_many", "reference", "consumes", "is consumed by", true, "target"],
  ["bookable_resources", "guide_assignments", "one_to_many", "reference", "is scheduled via", "schedules", false, "source"],
  ["bookable_resources", "equipment_rentals", "one_to_many", "reference", "is rented as", "rents", true, "source"],
  ["activity_bookings", "equipment_rentals", "one_to_many", "reference", "carries", "is attached to", false, "source"],
  ["bookable_resources", "lodging_units", "one_to_many", "reference", "represents", "is offered as", false, "source"],
  ["waiver_templates", "liability_waivers", "one_to_many", "reference", "instantiates", "is built from", true, "source"],
  ["activity_bookings", "liability_waivers", "one_to_many", "reference", "is covered by", "covers", true, "source"],
  ["liability_waivers", "booking_participants", "one_to_one", "reference", "is signed by", "signs", true, "target"],
  ["activity_products", "channel_listings", "one_to_many", "reference", "is listed as", "lists", true, "source"],
  ["reseller_partners", "channel_listings", "one_to_many", "reference", "distributes", "distributes via", true, "source"],
  ["reseller_partners", "partner_contracts", "one_to_many", "composition", "is governed by", "governs", true, "source"],
  ["reseller_partners", "activity_bookings", "one_to_many", "reference", "sources", "is sourced from", false, "source"],
  // users edges (Rule #10)
  ["users", "guide_assignments", "one_to_many", "reference", "is assigned as guide", "assigns guide", true, "source"],
  ["users", "activity_bookings", "one_to_many", "reference", "books as staff", "is booked by staff", false, "source"],
  ["users", "booking_refunds", "one_to_many", "reference", "approves", "is approved by", false, "source"],
];

// ============================================================ RUN
async function main() {
  // ---- data_objects
  console.log("=== data_objects ===");
  const existDO = await get("/data_objects?select=id,data_object_name&limit=20000");
  const doMap = new Map<string, number>(); for (const r of existDO) doMap.set(String(r.data_object_name), Number(r.id));
  const missingDO = dataObjects.filter(d => !doMap.has(d.data_object_name));
  if (missingDO.length) {
    console.log(`  inserting ${missingDO.length} data_objects`);
    await insert("/data_objects", missingDO.map(d => ({
      data_object_name: d.data_object_name, singular_label: d.singular_label, plural_label: d.plural_label,
      description: d.description, catalog_description: d.catalog_description,
      kind: "domain_owned", entity_type: d.entity_type,
      has_personal_content: d.has_personal_content ?? false, has_submit_lock: d.has_submit_lock ?? false, has_single_approver: d.has_single_approver ?? false,
    })));
  } else console.log("  all present");
  const allDO = await get("/data_objects?select=id,data_object_name&limit=20000");
  doMap.clear(); for (const r of allDO) doMap.set(String(r.data_object_name), Number(r.id));
  doMap.set("customers", CUSTOMERS); doMap.set("users", USERS);
  const doid = (n: string) => { const id = doMap.get(n); if (!id) throw new Error(`no data_object ${n}`); return id; };

  // ---- domain_module_data_objects
  console.log("=== domain_module_data_objects ===");
  const modIds = [CORE, SCHED, WAIVERS, DIST].join(",");
  const existDMDO = await get(`/domain_module_data_objects?domain_module_id=in.(${modIds})&select=domain_module_id,data_object_id,role&limit=10000`);
  const dmdoSet = new Set(existDMDO.map(r => `${r.domain_module_id}:${r.data_object_id}`));
  const newDMDO = dmdo.filter(([m, n]) => !dmdoSet.has(`${m}:${doid(n)}`))
    .map(([m, n, role, nec]) => ({ domain_module_id: m, data_object_id: doid(n), role, necessity: nec, notes: "" }));
  if (newDMDO.length) { console.log(`  inserting ${newDMDO.length}`); await insert("/domain_module_data_objects", newDMDO); } else console.log("  all present");

  // ---- aliases
  console.log("=== data_object_aliases ===");
  const aDoIds = [...new Set(aliases.map(a => doid(a.data_object_name)))].join(",");
  const existAl = await get(`/data_object_aliases?data_object_id=in.(${aDoIds})&select=data_object_id,alias_name&limit=10000`);
  const alSet = new Set(existAl.map(r => `${r.data_object_id}:${String(r.alias_name).toLowerCase()}`));
  const newAl = aliases.filter(a => !alSet.has(`${doid(a.data_object_name)}:${a.alias_name.toLowerCase()}`))
    .map(a => ({ data_object_id: doid(a.data_object_name), alias_name: a.alias_name, alias_type: a.alias_type, is_preferred: false, notes: "" }));
  if (newAl.length) { console.log(`  inserting ${newAl.length}`); await insert("/data_object_aliases", newAl); } else console.log("  all present");

  // ---- lifecycle states
  console.log("=== data_object_lifecycle_states ===");
  const lcDoIds = [...new Set(lifecycle.map(l => doid(l.data_object_name)))].join(",");
  const existLC = await get(`/data_object_lifecycle_states?data_object_id=in.(${lcDoIds})&select=data_object_id,state_name&limit=10000`);
  const lcSet = new Set(existLC.map(r => `${r.data_object_id}:${r.state_name}`));
  const newLC = lifecycle.filter(l => !lcSet.has(`${doid(l.data_object_name)}:${l.state_name}`))
    .map(l => ({ data_object_id: doid(l.data_object_name), state_name: l.state_name, state_order: l.state_order,
      is_initial: l.is_initial ?? false, is_terminal: l.is_terminal ?? false, requires_permission: l.requires_permission ?? false,
      permission_verb_override: l.permission_verb_override ?? "", domain_module_id: l.domain_module_id }));
  if (newLC.length) { console.log(`  inserting ${newLC.length}`); await insert("/data_object_lifecycle_states", newLC); } else console.log("  all present");

  // ---- trigger_events
  console.log("=== trigger_events ===");
  const existTE = await get(`/trigger_events?select=id,event_name&limit=20000`);
  const teMap = new Map<string, number>(); for (const r of existTE) teMap.set(String(r.event_name), Number(r.id));
  const newTE = triggerEvents.filter(t => !teMap.has(t.event_name))
    .map(t => ({ event_name: t.event_name, data_object_id: doid(t.data_object_name), from_state: t.from_state, to_state: t.to_state, event_category: t.event_category, description: t.description }));
  if (newTE.length) { console.log(`  inserting ${newTE.length}`); await insert("/trigger_events", newTE); } else console.log("  all present");
  const allTE = await get(`/trigger_events?select=id,event_name&limit=20000`);
  teMap.clear(); for (const r of allTE) teMap.set(String(r.event_name), Number(r.id));

  // ---- handoffs
  console.log("=== handoffs ===");
  const existHO = await get(`/handoffs?source_domain_id=eq.${DOM}&select=source_domain_id,target_domain_id,data_object_id,trigger_event_id&limit=10000`);
  const hoSet = new Set(existHO.map(r => `${r.source_domain_id}|${r.target_domain_id}|${r.data_object_id}|${r.trigger_event_id}`));
  const newHO = handoffs.filter(([s, t, , , dn, en]) => !hoSet.has(`${s}|${t}|${doid(dn)}|${teMap.get(en)}`))
    .map(([s, t, sm, tm, dn, en, pat, fr, desc]) => ({ source_domain_id: s, target_domain_id: t, source_domain_module_id: sm, target_domain_module_id: tm,
      data_object_id: doid(dn), trigger_event_id: teMap.get(en)!, integration_pattern: pat, friction_level: fr, description: desc, notes: "" }));
  if (newHO.length) { console.log(`  inserting ${newHO.length}`); await insert("/handoffs", newHO); } else console.log("  all present");

  // ---- relationships
  console.log("=== data_object_relationships ===");
  const relDoIds = [...new Set(rels.flatMap(r => [doid(r[0]), doid(r[1])]))].join(",");
  const existREL = await get(`/data_object_relationships?data_object_id=in.(${relDoIds})&select=data_object_id,related_data_object_id,relationship_verb&limit=20000`);
  const relSet = new Set(existREL.map(r => `${r.data_object_id}:${r.related_data_object_id}:${r.relationship_verb}`));
  const newREL = rels.filter(([f, t, , , v]) => !relSet.has(`${doid(f)}:${doid(t)}:${v}`))
    .map(([f, t, type, kind, verb, inv, req, own]) => ({ data_object_id: doid(f), related_data_object_id: doid(t),
      relationship_type: type, relationship_kind: kind, relationship_verb: verb, inverse_verb: inv, is_required: req, owner_side: own, notes: "" }));
  if (newREL.length) { console.log(`  inserting ${newREL.length}`); await insert("/data_object_relationships", newREL); } else console.log("  all present");

  // ---- summary
  console.log("\n=== Phase B counts ===");
  const masters = await get(`/domain_module_data_objects?domain_module_id=in.(${modIds})&role=eq.master&select=data_object_id&limit=10000`);
  console.log(JSON.stringify({
    data_objects_total: allDO.length,
    masters_in_domain: new Set(masters.map(m => m.data_object_id)).size,
    dmdo_rows: (await get(`/domain_module_data_objects?domain_module_id=in.(${modIds})&select=id&limit=10000`)).length,
    aliases: (await get(`/data_object_aliases?data_object_id=in.(${aDoIds})&select=id&limit=10000`)).length,
    lifecycle_states: (await get(`/data_object_lifecycle_states?data_object_id=in.(${lcDoIds})&select=id&limit=10000`)).length,
    trigger_events_domain: triggerEvents.length,
    handoffs_outbound: (await get(`/handoffs?source_domain_id=eq.${DOM}&select=id&limit=10000`)).length,
  }, null, 2));
}
await main();
