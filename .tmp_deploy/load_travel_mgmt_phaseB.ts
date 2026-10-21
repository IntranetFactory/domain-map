#!/usr/bin/env bun
// TRAVEL-MGMT Phase B loader.
// data_objects + domain_module_data_objects + data_object_relationships +
// data_object_aliases + data_object_lifecycle_states + trigger_events + handoffs.
// Idempotent via natural keys. record_status omitted on every insert (DB default 'new').

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
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += 50) {
    const result = await call({ method: "POST", path, body: uniformize(rows.slice(i, i + 50)) });
    out.push(...result);
  }
  return out;
}

// FK constants from Phase A + live queries.
const DOMAIN_ID = 172;
const MOD = {
  BOOKING: 346,   // TRAVEL-MGMT-BOOKING-SOURCING
  ITINERARY: 347, // TRAVEL-MGMT-TRIP-ITINERARY
  PROFILE: 348,   // TRAVEL-MGMT-PROFILE-POLICY
  DUTY: 349,      // TRAVEL-MGMT-DUTY-OF-CARE
};
const NEIGHBOR = { EXPENSE: 67, SPEND_MGMT: 133, HCM: 54 };
const NEIGHBOR_MOD = {
  EXPENSE_CAPTURE: null as number | null,   // resolved live
};
const USERS_ID = 748;            // platform_builtin users
const EMPLOYEES_ID = 31;         // HCM master
const EXPENSE_REPORTS_ID = 210;  // EXPENSE master (handoff target payload)
const EXPENSE_TRAVEL_BOOKINGS_ID = 215; // EXPENSE master (reconciliation shell)
const SPEND_REQUESTS_ID = 240;   // SPEND-MGMT master

// ============================================================
// data_objects (masters)
// ============================================================
type DObj = {
  data_object_name: string;
  singular_label: string;
  plural_label: string;
  description: string;
  entity_type: "operational_workflow" | "operational_record" | "catalog" | "junction" | "computed";
  has_personal_content?: boolean;
  has_submit_lock?: boolean;
  has_single_approver?: boolean;
  module: number;
  necessity: "required" | "optional";
};

const masters: DObj[] = [
  {
    data_object_name: "business_trips", singular_label: "Business Trip", plural_label: "Business Trips",
    description: "The container for a single corporate journey: the purpose, dates, traveler, and the set of booked segments that make it up. The unit that is approved, tracked, reconciled, and handed to expense and spend.",
    entity_type: "operational_workflow", module: MOD.ITINERARY, necessity: "required",
  },
  {
    data_object_name: "trip_itineraries", singular_label: "Trip Itinerary", plural_label: "Trip Itineraries",
    description: "The ordered set of travel segments (air, hotel, rail, car, ground) for a trip, assembled from individual reservations and kept synchronized as segments are added, changed, or disrupted.",
    entity_type: "operational_workflow", module: MOD.ITINERARY, necessity: "required",
  },
  {
    data_object_name: "trip_bookings", singular_label: "Trip Booking", plural_label: "Trip Bookings",
    description: "A single reservation at the reservation-record level: a flight, hotel stay, rail journey, or car rental with its confirmation, fare or rate, ancillaries, and ticketing status. The bookable unit a segment is created from.",
    entity_type: "operational_workflow", has_submit_lock: true, module: MOD.BOOKING, necessity: "required",
  },
  {
    data_object_name: "trip_search_results", singular_label: "Trip Search Result", plural_label: "Trip Search Results",
    description: "A returned set of bookable options for a shopping request, aggregated from GDS, NDC, and direct-supplier content and ranked against travel policy. Derived from a search query against live inventory; the basis from which a booking is made.",
    entity_type: "computed", module: MOD.BOOKING, necessity: "optional",
  },
  {
    data_object_name: "unused_ticket_credits", singular_label: "Unused-Ticket Credit", plural_label: "Unused-Ticket Credits",
    description: "Residual value from an unused or partially used ticket that can be reapplied to a future booking, tracked through its available, reapplied, and expired states so prepaid value is recovered.",
    entity_type: "operational_workflow", module: MOD.BOOKING, necessity: "optional",
  },
  {
    data_object_name: "traveler_profiles", singular_label: "Traveler Profile", plural_label: "Traveler Profiles",
    description: "The per-traveler record holding seat and meal preferences, loyalty and frequent-traveler memberships, travel documents (passport, visa, known-traveler numbers), and emergency contacts that personalize shopping and satisfy identity and duty-of-care requirements.",
    entity_type: "operational_record", has_personal_content: true, module: MOD.PROFILE, necessity: "required",
  },
  {
    data_object_name: "travel_policies", singular_label: "Travel Policy", plural_label: "Travel Policies",
    description: "The configured set of rules that govern what travelers may book: fare classes, advance-purchase windows, preferred suppliers, spend caps, and out-of-policy handling. Drives policy-aware shopping and approval routing.",
    entity_type: "catalog", module: MOD.PROFILE, necessity: "required",
  },
  {
    data_object_name: "trip_approvals", singular_label: "Trip Approval", plural_label: "Trip Approvals",
    description: "A pre-trip authorization request and its decision, routed when a trip is out of policy, over a cost threshold, or bound for a high-risk destination, capturing the approver, the decision, and any exception justification.",
    entity_type: "operational_workflow", has_single_approver: true, module: MOD.PROFILE, necessity: "optional",
  },
  {
    data_object_name: "duty_of_care_alerts", singular_label: "Duty-of-Care Alert", plural_label: "Duty-of-Care Alerts",
    description: "A raised notification that a traveler may be exposed to an emerging risk at their destination, correlating traveler location from active trips against destination risk intelligence, and tracked through acknowledged and resolved states during assistance.",
    entity_type: "operational_workflow", module: MOD.DUTY, necessity: "optional",
  },
];

// ============================================================
// lifecycle states (operational_workflow masters)
// ============================================================
type LState = { master: string; state_name: string; state_order: number; is_initial?: boolean; is_terminal?: boolean; requires_permission?: boolean; permission_verb_override?: string; module: number };
const lifecycleStates: LState[] = [
  // business_trips
  { master: "business_trips", state_name: "planned", state_order: 1, is_initial: true, module: MOD.ITINERARY },
  { master: "business_trips", state_name: "booked", state_order: 2, module: MOD.ITINERARY },
  { master: "business_trips", state_name: "in_progress", state_order: 3, module: MOD.ITINERARY },
  { master: "business_trips", state_name: "completed", state_order: 4, is_terminal: true, module: MOD.ITINERARY },
  { master: "business_trips", state_name: "cancelled", state_order: 5, is_terminal: true, module: MOD.ITINERARY },
  // trip_itineraries
  { master: "trip_itineraries", state_name: "draft", state_order: 1, is_initial: true, module: MOD.ITINERARY },
  { master: "trip_itineraries", state_name: "confirmed", state_order: 2, module: MOD.ITINERARY },
  { master: "trip_itineraries", state_name: "amended", state_order: 3, module: MOD.ITINERARY },
  { master: "trip_itineraries", state_name: "disrupted", state_order: 4, module: MOD.ITINERARY },
  { master: "trip_itineraries", state_name: "closed", state_order: 5, is_terminal: true, module: MOD.ITINERARY },
  // trip_bookings
  { master: "trip_bookings", state_name: "held", state_order: 1, is_initial: true, module: MOD.BOOKING },
  { master: "trip_bookings", state_name: "ticketed", state_order: 2, requires_permission: true, permission_verb_override: "ticket_trip_booking", module: MOD.BOOKING },
  { master: "trip_bookings", state_name: "changed", state_order: 3, module: MOD.BOOKING },
  { master: "trip_bookings", state_name: "cancelled", state_order: 4, is_terminal: true, requires_permission: true, permission_verb_override: "cancel_trip_booking", module: MOD.BOOKING },
  { master: "trip_bookings", state_name: "refunded", state_order: 5, is_terminal: true, module: MOD.BOOKING },
  // unused_ticket_credits
  { master: "unused_ticket_credits", state_name: "available", state_order: 1, is_initial: true, module: MOD.BOOKING },
  { master: "unused_ticket_credits", state_name: "reapplied", state_order: 2, is_terminal: true, requires_permission: true, permission_verb_override: "reapply_credit", module: MOD.BOOKING },
  { master: "unused_ticket_credits", state_name: "expired", state_order: 3, is_terminal: true, module: MOD.BOOKING },
  // trip_approvals
  { master: "trip_approvals", state_name: "requested", state_order: 1, is_initial: true, module: MOD.PROFILE },
  { master: "trip_approvals", state_name: "approved", state_order: 2, is_terminal: true, requires_permission: true, permission_verb_override: "approve_trip", module: MOD.PROFILE },
  { master: "trip_approvals", state_name: "rejected", state_order: 3, is_terminal: true, requires_permission: true, permission_verb_override: "reject_trip", module: MOD.PROFILE },
  // duty_of_care_alerts
  { master: "duty_of_care_alerts", state_name: "raised", state_order: 1, is_initial: true, module: MOD.DUTY },
  { master: "duty_of_care_alerts", state_name: "acknowledged", state_order: 2, requires_permission: true, permission_verb_override: "acknowledge_alert", module: MOD.DUTY },
  { master: "duty_of_care_alerts", state_name: "resolved", state_order: 3, is_terminal: true, module: MOD.DUTY },
];

// ============================================================
// aliases
// ============================================================
type Alias = { master: string; alias_name: string; alias_type: "synonym" | "industry_term" | "solution_term"; is_preferred?: boolean };
const aliases: Alias[] = [
  { master: "business_trips", alias_name: "trip", alias_type: "synonym" },
  { master: "business_trips", alias_name: "journey", alias_type: "synonym" },
  { master: "trip_bookings", alias_name: "reservation", alias_type: "synonym" },
  { master: "trip_bookings", alias_name: "PNR", alias_type: "synonym" },
  { master: "trip_itineraries", alias_name: "itinerary", alias_type: "synonym" },
  { master: "traveler_profiles", alias_name: "traveler", alias_type: "synonym" },
  { master: "traveler_profiles", alias_name: "travel arranger profile", alias_type: "synonym" },
  { master: "travel_policies", alias_name: "travel program rules", alias_type: "synonym" },
  { master: "trip_approvals", alias_name: "pre-trip authorization", alias_type: "synonym" },
  { master: "duty_of_care_alerts", alias_name: "traveler risk alert", alias_type: "synonym" },
  { master: "duty_of_care_alerts", alias_name: "travel risk notification", alias_type: "synonym" },
  { master: "unused_ticket_credits", alias_name: "travel credit", alias_type: "synonym" },
  { master: "unused_ticket_credits", alias_name: "unused ticket", alias_type: "synonym" },
  { master: "trip_search_results", alias_name: "fare and rate options", alias_type: "synonym" },
];

// ============================================================
// trigger_events (state-transition events on masters)
// ============================================================
type TEvent = { master: string; event_name: string; from_state: string; to_state: string; event_category: "lifecycle" | "state_change" | "threshold" | "signal"; description: string };
const triggerEvents: TEvent[] = [
  { master: "trip_bookings", event_name: "trip_booking.ticketed", from_state: "held", to_state: "ticketed", event_category: "lifecycle", description: "A held reservation is ticketed and confirmed. The segment becomes a firm part of the itinerary and a charge is generated for downstream expense and spend reconciliation." },
  { master: "trip_bookings", event_name: "trip_booking.cancelled", from_state: "ticketed", to_state: "cancelled", event_category: "state_change", description: "A ticketed reservation is cancelled, removing the segment from the itinerary and potentially creating unused-ticket credit." },
  { master: "business_trips", event_name: "business_trip.booked", from_state: "planned", to_state: "booked", event_category: "lifecycle", description: "A planned trip has all segments booked. The trip record and its charges become available to expense and spend, and the traveler's location footprint becomes monitorable for duty of care." },
  { master: "business_trips", event_name: "business_trip.completed", from_state: "in_progress", to_state: "completed", event_category: "lifecycle", description: "The traveler has returned and the trip is complete. The final trip record is ready for expense reconciliation and program reporting." },
  { master: "trip_itineraries", event_name: "trip_itinerary.disrupted", from_state: "confirmed", to_state: "disrupted", event_category: "signal", description: "A confirmed itinerary is disrupted (cancellation, delay, schedule change). Triggers rebooking and may raise a duty-of-care concern for the affected traveler." },
  { master: "trip_approvals", event_name: "trip_approval.approved", from_state: "requested", to_state: "approved", event_category: "lifecycle", description: "A pre-trip authorization is approved, releasing the trip for booking or confirming an out-of-policy exception." },
  { master: "trip_approvals", event_name: "trip_approval.rejected", from_state: "requested", to_state: "rejected", event_category: "lifecycle", description: "A pre-trip authorization is rejected; the trip may not proceed as proposed." },
  { master: "duty_of_care_alerts", event_name: "duty_of_care_alert.raised", from_state: "", to_state: "raised", event_category: "threshold", description: "Traveler location from an active trip correlates with destination risk intelligence above the alerting threshold; an alert is raised so the program can locate and assist the traveler." },
  { master: "unused_ticket_credits", event_name: "unused_ticket_credit.expired", from_state: "available", to_state: "expired", event_category: "threshold", description: "A travel credit reaches its supplier-imposed expiry without being reapplied; residual prepaid value is lost." },
];

// ============================================================
// handoffs (outbound) — (sourceModule, targetDomain, targetModuleResolveKey, event, payloadDataObject, pattern, friction, description)
// ============================================================
type Handoff = {
  source_module: number;
  target_domain: number;
  target_module_code: string | null; // resolve live; null if counterparty module unknown
  event: string;
  payload_id: number;
  integration_pattern: "event_stream" | "api_call" | "batch_sync" | "manual_handoff" | "file_drop" | "lifecycle_progression";
  friction_level: "low" | "medium" | "high";
  description: string;
};
const handoffs: Handoff[] = [
  {
    source_module: MOD.BOOKING, target_domain: NEIGHBOR.EXPENSE, target_module_code: "EXPENSE-CAPTURE-AND-REPORTING",
    event: "trip_booking.ticketed", payload_id: EXPENSE_REPORTS_ID,
    integration_pattern: "api_call", friction_level: "high",
    description: "A ticketed reservation generates a travel charge that lands in the expense domain as expense-report lines for post-trip reimbursement. Classic high-friction integration: the booking system and the expense system are usually different platforms with bespoke matching of charges to reservations.",
  },
  {
    source_module: MOD.ITINERARY, target_domain: NEIGHBOR.EXPENSE, target_module_code: "EXPENSE-TRAVEL-AND-PER-DIEM",
    event: "business_trip.booked", payload_id: EXPENSE_TRAVEL_BOOKINGS_ID,
    integration_pattern: "api_call", friction_level: "medium",
    description: "A booked trip's itinerary is pushed to the expense domain as the imported travel-booking record it reconciles charges against, so the expense side does not re-key the trip.",
  },
  {
    source_module: MOD.PROFILE, target_domain: NEIGHBOR.SPEND_MGMT, target_module_code: "SPEND-MGMT-POLICY-APPROVAL",
    event: "trip_approval.approved", payload_id: SPEND_REQUESTS_ID,
    integration_pattern: "api_call", friction_level: "medium",
    description: "An approved pre-trip authorization with an estimated cost is handed to the spend domain as a pre-committed spend request, so the projected travel spend is visible before the charges land.",
  },
];

async function main() {
  console.log("=== TRAVEL-MGMT Phase B ===\n");

  // resolve EXPENSE-CAPTURE module id and the per-handoff target module ids
  const targetModuleCodes = [...new Set(handoffs.map(h => h.target_module_code).filter(Boolean))] as string[];
  const targModRows = await get(`/domain_modules?domain_module_code=in.(${targetModuleCodes.map(encodeURIComponent).join(",")})&select=id,domain_module_code`);
  const targModMap = new Map(targModRows.map(r => [String(r.domain_module_code), Number(r.id)]));

  // --- data_objects ---
  console.log("data_objects:");
  const existingDO = await get(`/data_objects?data_object_name=in.(${masters.map(m => m.data_object_name).join(",")})&select=id,data_object_name`);
  const existingDOnames = new Set(existingDO.map(r => String(r.data_object_name)));
  const newDO = masters
    .filter(m => !existingDOnames.has(m.data_object_name))
    .map(m => ({
      data_object_name: m.data_object_name,
      singular_label: m.singular_label,
      plural_label: m.plural_label,
      description: m.description,
      entity_type: m.entity_type,
      has_personal_content: m.has_personal_content ?? false,
      has_submit_lock: m.has_submit_lock ?? false,
      has_single_approver: m.has_single_approver ?? false,
    }));
  if (newDO.length) await insert("/data_objects", newDO);
  console.log(`  inserted ${newDO.length} (${existingDO.length} existed)`);
  const allDO = await get(`/data_objects?data_object_name=in.(${masters.map(m => m.data_object_name).join(",")})&select=id,data_object_name`);
  const doMap = new Map<string, number>(allDO.map(r => [String(r.data_object_name), Number(r.id)]));

  // --- domain_module_data_objects ---
  console.log("domain_module_data_objects:");
  const allModIds = Object.values(MOD);
  const existingDMDO = await get(`/domain_module_data_objects?domain_module_id=in.(${allModIds.join(",")})&select=domain_module_id,data_object_id,role`);
  const dmdoSet = new Set(existingDMDO.map(r => `${r.domain_module_id}:${r.data_object_id}`));
  const dmdoRows: Row[] = [];
  // master rows
  for (const m of masters) {
    const did = doMap.get(m.data_object_name)!;
    const key = `${m.module}:${did}`;
    if (!dmdoSet.has(key)) { dmdoSet.add(key); dmdoRows.push({ domain_module_id: m.module, data_object_id: did, role: "master", necessity: m.necessity }); }
  }
  // embedded_master: employees (HCM) feeds traveler identity into PROFILE module
  {
    const key = `${MOD.PROFILE}:${EMPLOYEES_ID}`;
    if (!dmdoSet.has(key)) { dmdoSet.add(key); dmdoRows.push({ domain_module_id: MOD.PROFILE, data_object_id: EMPLOYEES_ID, role: "embedded_master", necessity: "optional" }); }
  }
  // duty-of-care reads employees too (locate workers); consumer
  {
    const key = `${MOD.DUTY}:${EMPLOYEES_ID}`;
    if (!dmdoSet.has(key)) { dmdoSet.add(key); dmdoRows.push({ domain_module_id: MOD.DUTY, data_object_id: EMPLOYEES_ID, role: "embedded_master", necessity: "optional" }); }
  }
  // users consumer rows on each module (platform_builtin)
  for (const mid of allModIds) {
    const key = `${mid}:${USERS_ID}`;
    if (!dmdoSet.has(key)) { dmdoSet.add(key); dmdoRows.push({ domain_module_id: mid, data_object_id: USERS_ID, role: "consumer", necessity: "required" }); }
  }
  if (dmdoRows.length) await insert("/domain_module_data_objects", dmdoRows);
  console.log(`  inserted ${dmdoRows.length}`);

  // --- data_object_lifecycle_states ---
  console.log("data_object_lifecycle_states:");
  const masterIds = masters.map(m => doMap.get(m.data_object_name)!);
  const existingLS = await get(`/data_object_lifecycle_states?data_object_id=in.(${masterIds.join(",")})&select=data_object_id,state_name`);
  const lsSet = new Set(existingLS.map(r => `${r.data_object_id}:${r.state_name}`));
  const lsRows: Row[] = [];
  for (const s of lifecycleStates) {
    const did = doMap.get(s.master)!;
    const key = `${did}:${s.state_name}`;
    if (!lsSet.has(key)) {
      lsSet.add(key);
      lsRows.push({
        data_object_id: did, state_name: s.state_name, state_order: s.state_order,
        is_initial: s.is_initial ?? false, is_terminal: s.is_terminal ?? false,
        requires_permission: s.requires_permission ?? false,
        permission_verb_override: s.permission_verb_override ?? "",
        domain_module_id: s.module,
      });
    }
  }
  if (lsRows.length) await insert("/data_object_lifecycle_states", lsRows);
  console.log(`  inserted ${lsRows.length}`);

  // --- data_object_aliases ---
  console.log("data_object_aliases:");
  const existingAL = await get(`/data_object_aliases?data_object_id=in.(${masterIds.join(",")})&select=data_object_id,alias_name`);
  const alSet = new Set(existingAL.map(r => `${r.data_object_id}:${r.alias_name}`));
  const alRows: Row[] = [];
  for (const a of aliases) {
    const did = doMap.get(a.master)!;
    const key = `${did}:${a.alias_name}`;
    if (!alSet.has(key)) { alSet.add(key); alRows.push({ data_object_id: did, alias_name: a.alias_name, alias_type: a.alias_type, is_preferred: a.is_preferred ?? false }); }
  }
  if (alRows.length) await insert("/data_object_aliases", alRows);
  console.log(`  inserted ${alRows.length}`);

  // --- trigger_events ---
  console.log("trigger_events:");
  const existingTE = await get(`/trigger_events?data_object_id=in.(${masterIds.join(",")})&select=id,event_name`);
  const teNames = new Set(existingTE.map(r => String(r.event_name)));
  const newTE = triggerEvents
    .filter(e => !teNames.has(e.event_name))
    .map(e => ({ data_object_id: doMap.get(e.master)!, event_name: e.event_name, from_state: e.from_state, to_state: e.to_state, event_category: e.event_category, description: e.description }));
  if (newTE.length) await insert("/trigger_events", newTE);
  const allTE = await get(`/trigger_events?data_object_id=in.(${masterIds.join(",")})&select=id,event_name`);
  const teMap = new Map<string, number>(allTE.map(r => [String(r.event_name), Number(r.id)]));
  console.log(`  inserted ${newTE.length} (${existingTE.length} existed)`);

  // --- data_object_relationships ---
  console.log("data_object_relationships:");
  // intra-domain + users + cross-domain
  type Rel = { from: number; to: number; type: "one_to_one" | "one_to_many" | "many_to_many"; kind: "composition" | "reference" | "association" | "inheritance"; verb: string; inverse: string; is_required: boolean; owner_side: "source" | "target" };
  const d = (name: string) => doMap.get(name)!;
  const rels: Rel[] = [
    // intra-domain
    { from: d("business_trips"), to: d("trip_itineraries"), type: "one_to_one", kind: "composition", verb: "has", inverse: "belongs to", is_required: true, owner_side: "source" },
    { from: d("trip_itineraries"), to: d("trip_bookings"), type: "one_to_many", kind: "composition", verb: "is composed of", inverse: "is a segment of", is_required: false, owner_side: "source" },
    { from: d("trip_search_results"), to: d("trip_bookings"), type: "one_to_many", kind: "reference", verb: "is booked into", inverse: "is created from", is_required: false, owner_side: "target" },
    { from: d("travel_policies"), to: d("trip_search_results"), type: "one_to_many", kind: "reference", verb: "filters", inverse: "is filtered by", is_required: false, owner_side: "source" },
    { from: d("business_trips"), to: d("trip_approvals"), type: "one_to_many", kind: "reference", verb: "is authorized by", inverse: "authorizes", is_required: false, owner_side: "target" },
    { from: d("travel_policies"), to: d("trip_approvals"), type: "one_to_many", kind: "reference", verb: "triggers", inverse: "is triggered by", is_required: false, owner_side: "source" },
    { from: d("traveler_profiles"), to: d("business_trips"), type: "one_to_many", kind: "reference", verb: "takes", inverse: "is taken by", is_required: true, owner_side: "source" },
    { from: d("trip_bookings"), to: d("unused_ticket_credits"), type: "one_to_many", kind: "reference", verb: "produces", inverse: "comes from", is_required: false, owner_side: "source" },
    { from: d("business_trips"), to: d("duty_of_care_alerts"), type: "one_to_many", kind: "reference", verb: "is monitored by", inverse: "monitors", is_required: false, owner_side: "target" },
    { from: d("traveler_profiles"), to: d("duty_of_care_alerts"), type: "one_to_many", kind: "reference", verb: "is the subject of", inverse: "concerns", is_required: false, owner_side: "source" },
    // users edges (Rule #10)
    { from: USERS_ID, to: d("traveler_profiles"), type: "one_to_one", kind: "reference", verb: "is the traveler of", inverse: "is held by", is_required: false, owner_side: "source" },
    { from: USERS_ID, to: d("business_trips"), type: "one_to_many", kind: "reference", verb: "arranges", inverse: "is arranged by", is_required: false, owner_side: "source" },
    { from: USERS_ID, to: d("trip_approvals"), type: "one_to_many", kind: "reference", verb: "approves", inverse: "is approved by", is_required: false, owner_side: "source" },
    { from: USERS_ID, to: d("trip_bookings"), type: "one_to_many", kind: "reference", verb: "books", inverse: "is booked by", is_required: false, owner_side: "source" },
    { from: USERS_ID, to: d("duty_of_care_alerts"), type: "one_to_many", kind: "reference", verb: "responds to", inverse: "is handled by", is_required: false, owner_side: "source" },
    { from: USERS_ID, to: d("travel_policies"), type: "one_to_many", kind: "reference", verb: "owns", inverse: "is owned by", is_required: false, owner_side: "source" },
    // employees -> traveler_profiles (identity source, embedded HCM master)
    { from: EMPLOYEES_ID, to: d("traveler_profiles"), type: "one_to_one", kind: "reference", verb: "is the worker behind", inverse: "identifies", is_required: false, owner_side: "source" },
    // cross-domain outbound (mirror handoffs)
    { from: d("trip_bookings"), to: EXPENSE_REPORTS_ID, type: "one_to_many", kind: "reference", verb: "generates charges for", inverse: "reconciles", is_required: false, owner_side: "source" },
    { from: d("business_trips"), to: EXPENSE_TRAVEL_BOOKINGS_ID, type: "one_to_one", kind: "reference", verb: "is imported as", inverse: "is the trip record for", is_required: false, owner_side: "source" },
    { from: d("trip_approvals"), to: SPEND_REQUESTS_ID, type: "one_to_one", kind: "reference", verb: "pre-commits", inverse: "is pre-committed by", is_required: false, owner_side: "source" },
  ];
  const existingRel = await get(`/data_object_relationships?data_object_id=in.(${[...masterIds, USERS_ID, EMPLOYEES_ID].join(",")})&select=data_object_id,related_data_object_id,relationship_verb`);
  const relSet = new Set(existingRel.map(r => `${r.data_object_id}:${r.related_data_object_id}:${r.relationship_verb}`));
  const relRows = rels
    .filter(r => !relSet.has(`${r.from}:${r.to}:${r.verb}`))
    .map(r => ({ data_object_id: r.from, related_data_object_id: r.to, relationship_type: r.type, relationship_kind: r.kind, relationship_verb: r.verb, inverse_verb: r.inverse, is_required: r.is_required, owner_side: r.owner_side }));
  if (relRows.length) await insert("/data_object_relationships", relRows);
  console.log(`  inserted ${relRows.length}`);

  // --- handoffs ---
  console.log("handoffs:");
  const existingHO = await get(`/handoffs?source_domain_id=eq.${DOMAIN_ID}&select=trigger_event_id,target_domain_id,data_object_id`);
  const hoSet = new Set(existingHO.map(r => `${r.target_domain_id}:${r.data_object_id}:${r.trigger_event_id}`));
  const hoRows: Row[] = [];
  for (const h of handoffs) {
    const teid = teMap.get(h.event)!;
    const tmid = h.target_module_code ? (targModMap.get(h.target_module_code) ?? null) : null;
    const key = `${h.target_domain}:${h.payload_id}:${teid}`;
    if (!hoSet.has(key)) {
      hoSet.add(key);
      hoRows.push({
        source_domain_id: DOMAIN_ID, target_domain_id: h.target_domain,
        source_domain_module_id: h.source_module, target_domain_module_id: tmid,
        data_object_id: h.payload_id, trigger_event_id: teid,
        integration_pattern: h.integration_pattern, friction_level: h.friction_level,
        description: h.description,
      });
    }
  }
  if (hoRows.length) await insert("/handoffs", hoRows);
  console.log(`  inserted ${hoRows.length}`);

  // --- counts ---
  console.log("\n=== Phase B counts ===");
  console.log({
    data_objects: allDO.length,
    domain_module_data_objects: (await get(`/domain_module_data_objects?domain_module_id=in.(${allModIds.join(",")})&select=id`)).length,
    lifecycle_states: (await get(`/data_object_lifecycle_states?data_object_id=in.(${masterIds.join(",")})&select=id`)).length,
    aliases: (await get(`/data_object_aliases?data_object_id=in.(${masterIds.join(",")})&select=id`)).length,
    trigger_events: allTE.length,
    relationships_touching_masters: (await get(`/data_object_relationships?data_object_id=in.(${masterIds.join(",")})&select=id`)).length,
    handoffs_outbound: (await get(`/handoffs?source_domain_id=eq.${DOMAIN_ID}&select=id`)).length,
  });
  console.log("master ids:", Object.fromEntries(masters.map(m => [m.data_object_name, doMap.get(m.data_object_name)])));
}
await main();
console.log("Phase B done.");
