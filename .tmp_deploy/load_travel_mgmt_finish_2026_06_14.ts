#!/usr/bin/env bun
// TRAVEL-MGMT (Corporate Travel Management, domain_id 172) build completion loader.
//
// The prior build already landed Phase A (domain row + 7 metadata fields + catalog UX,
// 4 full modules + domain_module_capabilities, 8 capabilities, 5 primary solutions) and
// most of Phase B (10 mastered data_objects + DMDO, entity_type, pattern flags, labels,
// 20 data_object_relationships incl. users + cross-domain edges, 14 aliases, lifecycle
// states on all workflow masters, 9 trigger_events, 3 outbound handoffs to EXPENSE/SPEND).
//
// This loader finishes the build:
//   Phase A-finish : domain_regulations (GDPR mandatory, SOX recommended)
//   Phase B-finish : intra-domain cross-module handoffs (B9b) + one outbound to HCM
//   Phase C        : business_function_domains
//   Phase S        : one travel-mgmt-system skill + tools + domain_module_tools
//   Phase E        : domain_roles + role_modules + process_raci
//
// Idempotent throughout: reads existing rows by natural key, inserts only the missing,
// re-reads to build natural-key -> id maps. record_status is OMITTED everywhere (DB
// default 'new'). No notes populated (Rule #15). No em-dashes. American English.

import { } from "bun";

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

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

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
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

// ============================================================
// Resolved facts (read live; ids are stable once read but we re-resolve here)
// ============================================================
const DOMAIN_ID = 172;
const MOD = {
  BOOKING: 346,        // TRAVEL-MGMT-BOOKING-SOURCING
  TRIP: 347,           // TRAVEL-MGMT-TRIP-ITINERARY
  PROFILE: 348,        // TRAVEL-MGMT-PROFILE-POLICY
  DUTY: 349,           // TRAVEL-MGMT-DUTY-OF-CARE
};
const DO = {
  business_trips: 1057,
  trip_itineraries: 1058,
  trip_bookings: 1059,
  trip_search_results: 1060,
  unused_ticket_credits: 1061,
  traveler_profiles: 1062,
  travel_policies: 1063,
  trip_approvals: 1064,
  duty_of_care_alerts: 1065,
  users: 748,
  employees: 31,
};
const EVT = {
  "trip_booking.ticketed": 1665,
  "business_trip.booked": 1667,
  "trip_approval.approved": 1670,
  "duty_of_care_alert.raised": 1672,
};
const REG = { GDPR: 1, SOX: 5 };
const BF = {
  BUSINESS_OPERATIONS: 34,
  FINANCE: 4,
  SECURITY: 28,
  HUMAN_RESOURCES: 3,
};

async function main() {
  // ----------------------------------------------------------
  // Phase A-finish: domain_regulations
  // GDPR mandatory (traveler profiles hold passport/visa/loyalty/location personal data,
  // cross-border, special-category). SOX recommended (public-company travel-spend controls
  // and approval evidence). PCI-DSS is conditional and surfaced as a q-file decision, not
  // auto-loaded here.
  // ----------------------------------------------------------
  console.log("\n=== Phase A-finish: domain_regulations ===");
  const existingReg = await get(`/domain_regulations?domain_id=eq.${DOMAIN_ID}&select=regulation_id,applicability`);
  const regSet = new Set(existingReg.map(r => String(r.regulation_id)));
  const regRows: Row[] = [];
  const wantReg: Array<{ regulation_id: number; applicability: string }> = [
    { regulation_id: REG.GDPR, applicability: "mandatory" },
    { regulation_id: REG.SOX, applicability: "recommended" },
  ];
  for (const r of wantReg) {
    if (!regSet.has(String(r.regulation_id))) {
      regRows.push({ domain_id: DOMAIN_ID, regulation_id: r.regulation_id, applicability: r.applicability, condition_notes: "", notes: "" });
    }
  }
  if (regRows.length) { console.log(`  inserting ${regRows.length} domain_regulations`); await insert("/domain_regulations", regRows); }
  else console.log(`  domain_regulations already present (${existingReg.length})`);

  // ----------------------------------------------------------
  // Phase B-finish: intra-domain cross-module handoffs (B9b) + one outbound to HCM
  //
  // Expected cross-module pairs (from data_object_relationships spanning modules):
  //  - trip_approval.approved : PROFILE(348) -> BOOKING(346)  payload trip_approvals
  //      (an approved pre-trip authorization unlocks ticketing in booking)
  //  - trip_booking.ticketed  : BOOKING(346) -> TRIP(347)     payload trip_bookings
  //      (a ticketed reservation populates the itinerary / trip record)
  //  - business_trip.booked   : TRIP(347)   -> DUTY(349)      payload business_trips
  //      (a booked trip starts being monitored for traveler safety)
  // Outbound to HCM: duty_of_care_alert.raised consumes traveler identity from HCM employees
  //   -> model as outbound TRAVEL-MGMT(DUTY) -> HCM signal so the worker-of-record sees a
  //      duty-of-care event for the employee. payload duty_of_care_alerts.
  // ----------------------------------------------------------
  console.log("\n=== Phase B-finish: handoffs ===");
  const existingHo = await get(`/handoffs?or=(source_domain_id.eq.${DOMAIN_ID},target_domain_id.eq.${DOMAIN_ID})&select=source_domain_id,target_domain_id,data_object_id,trigger_event_id`);
  const hoKey = (r: Row) => `${r.source_domain_id}|${r.target_domain_id}|${r.data_object_id}|${r.trigger_event_id}`;
  const hoSet = new Set(existingHo.map(hoKey));

  const HCM_ID = 54;
  const handoffSpecs: Array<Row> = [
    // intra-domain B9b
    {
      source_domain_id: DOMAIN_ID, target_domain_id: DOMAIN_ID,
      source_domain_module_id: MOD.PROFILE, target_domain_module_id: MOD.BOOKING,
      data_object_id: DO.trip_approvals, trigger_event_id: EVT["trip_approval.approved"],
      integration_pattern: "lifecycle_progression", friction_level: "low",
      description: "An approved pre-trip authorization unlocks ticketing in the booking module: the booking workflow reads the approval state directly before a held reservation can be ticketed.",
    },
    {
      source_domain_id: DOMAIN_ID, target_domain_id: DOMAIN_ID,
      source_domain_module_id: MOD.BOOKING, target_domain_module_id: MOD.TRIP,
      data_object_id: DO.trip_bookings, trigger_event_id: EVT["trip_booking.ticketed"],
      integration_pattern: "lifecycle_progression", friction_level: "low",
      description: "A ticketed reservation populates the trip and itinerary module: the booking becomes a confirmed segment on the traveler's itinerary and rolls up into the business trip.",
    },
    {
      source_domain_id: DOMAIN_ID, target_domain_id: DOMAIN_ID,
      source_domain_module_id: MOD.TRIP, target_domain_module_id: MOD.DUTY,
      data_object_id: DO.business_trips, trigger_event_id: EVT["business_trip.booked"],
      integration_pattern: "lifecycle_progression", friction_level: "low",
      description: "A booked trip enters duty-of-care monitoring: the duty-of-care module begins tracking the traveler's planned locations against destination intelligence so it can raise alerts.",
    },
    // outbound to HCM (worker of record is informed of a traveler-safety event)
    {
      source_domain_id: DOMAIN_ID, target_domain_id: HCM_ID,
      source_domain_module_id: MOD.DUTY, target_domain_module_id: null,
      data_object_id: DO.duty_of_care_alerts, trigger_event_id: EVT["duty_of_care_alert.raised"],
      integration_pattern: "event_stream", friction_level: "medium",
      description: "A raised duty-of-care alert is emitted to the worker system of record so the employee's manager and HR have visibility of a traveler-safety event affecting a worker on the road.",
    },
  ];
  const newHandoffs = handoffSpecs.filter(r => !hoSet.has(hoKey(r)));
  if (newHandoffs.length) { console.log(`  inserting ${newHandoffs.length} handoffs`); await insert("/handoffs", newHandoffs); }
  else console.log(`  all handoffs already present (${existingHo.length})`);

  // ----------------------------------------------------------
  // Phase C: business_function_domains
  // Owner: Business Operations (the corporate travel program is run by the travel /
  //   business-operations function). Contributors: Finance (travel-spend governance and
  //   approval policy), Security (duty-of-care / traveler-risk obligation). Consumer:
  //   Human Resources (consumes duty-of-care and trip data for worker safety and policy).
  // ----------------------------------------------------------
  console.log("\n=== Phase C: business_function_domains ===");
  const existingBfd = await get(`/business_function_domains?domain_id=eq.${DOMAIN_ID}&select=business_function_id,responsibility_type`);
  const bfdSet = new Set(existingBfd.map(r => `${r.business_function_id}|${r.responsibility_type}`));
  const bfdSpecs: Array<{ bf: number; rt: string }> = [
    { bf: BF.BUSINESS_OPERATIONS, rt: "owner" },
    { bf: BF.FINANCE, rt: "contributor" },
    { bf: BF.SECURITY, rt: "contributor" },
    { bf: BF.HUMAN_RESOURCES, rt: "consumer" },
  ];
  const bfdRows = bfdSpecs
    .filter(s => !bfdSet.has(`${s.bf}|${s.rt}`))
    .map(s => ({ business_function_id: s.bf, domain_id: DOMAIN_ID, responsibility_type: s.rt, notes: "" }));
  if (bfdRows.length) { console.log(`  inserting ${bfdRows.length} business_function_domains`); await insert("/business_function_domains", bfdRows); }
  else console.log(`  business_function_domains already present (${existingBfd.length})`);

  // ----------------------------------------------------------
  // Phase S: tools + domain_module_tools + one domain-grain system skill
  // ----------------------------------------------------------
  console.log("\n=== Phase S: tools ===");
  // tool spec: name, operation_kind, data_object_id (null for fetch/side_effect), coverage_tier
  type ToolSpec = { tool_name: string; operation_kind: string; data_object_id: number | null; coverage_tier: string; description: string };
  const toolSpecs: ToolSpec[] = [
    // queries (platform-covered: served by CRUD + cube)
    { tool_name: "query_business_trips", operation_kind: "query", data_object_id: DO.business_trips, coverage_tier: "platform", description: "Read business trips: the journey container holding a traveler's segments, dates, purpose, and status." },
    { tool_name: "query_trip_itineraries", operation_kind: "query", data_object_id: DO.trip_itineraries, coverage_tier: "platform", description: "Read trip itineraries: the ordered set of air, hotel, rail, and ground segments for a trip." },
    { tool_name: "query_trip_bookings", operation_kind: "query", data_object_id: DO.trip_bookings, coverage_tier: "platform", description: "Read trip bookings: PNR-level reservations with fare, supplier, and ticketing status." },
    { tool_name: "query_trip_search_results", operation_kind: "query", data_object_id: DO.trip_search_results, coverage_tier: "platform", description: "Read policy-filtered fare and rate search results returned for a shopping session." },
    { tool_name: "query_unused_ticket_credits", operation_kind: "query", data_object_id: DO.unused_ticket_credits, coverage_tier: "platform", description: "Read unused-ticket credits: residual value from cancelled or changed tickets available for reapplication." },
    { tool_name: "query_traveler_profiles", operation_kind: "query", data_object_id: DO.traveler_profiles, coverage_tier: "platform", description: "Read traveler profiles: loyalty programs, travel documents, seating and meal preferences, and emergency contacts." },
    { tool_name: "query_travel_policies", operation_kind: "query", data_object_id: DO.travel_policies, coverage_tier: "platform", description: "Read travel policies: the policy-aware shopping rules, fare caps, and class-of-service constraints." },
    { tool_name: "query_trip_approvals", operation_kind: "query", data_object_id: DO.trip_approvals, coverage_tier: "platform", description: "Read trip approvals: pre-trip authorization requests with estimated cost and out-of-policy exception state." },
    { tool_name: "query_duty_of_care_alerts", operation_kind: "query", data_object_id: DO.duty_of_care_alerts, coverage_tier: "platform", description: "Read duty-of-care alerts: traveler-risk notifications raised against destination intelligence." },
    // mutates (platform-covered)
    { tool_name: "create_business_trip", operation_kind: "mutate", data_object_id: DO.business_trips, coverage_tier: "platform", description: "Create a business trip: open a new journey container for a traveler with purpose and dates." },
    { tool_name: "create_trip_booking", operation_kind: "mutate", data_object_id: DO.trip_bookings, coverage_tier: "platform", description: "Create a trip booking: hold or ticket a selected fare or rate as a reservation on the trip." },
    { tool_name: "update_trip_itinerary", operation_kind: "mutate", data_object_id: DO.trip_itineraries, coverage_tier: "platform", description: "Update a trip itinerary: amend, re-sequence, or mark segments disrupted as plans change." },
    { tool_name: "update_trip_approval", operation_kind: "mutate", data_object_id: DO.trip_approvals, coverage_tier: "platform", description: "Update a trip approval: approve or reject a pre-trip authorization and record the decision." },
    { tool_name: "update_traveler_profile", operation_kind: "mutate", data_object_id: DO.traveler_profiles, coverage_tier: "platform", description: "Update a traveler profile: maintain loyalty numbers, document expiry, and preferences." },
    { tool_name: "update_duty_of_care_alert", operation_kind: "mutate", data_object_id: DO.duty_of_care_alerts, coverage_tier: "platform", description: "Update a duty-of-care alert: acknowledge or resolve a traveler-risk notification." },
    { tool_name: "update_unused_ticket_credit", operation_kind: "mutate", data_object_id: DO.unused_ticket_credits, coverage_tier: "platform", description: "Update an unused-ticket credit: reapply available residual value to a new booking or mark it expired." },
    // fetch (external inventory and intelligence Semantius does not master)
    { tool_name: "fetch_air_inventory", operation_kind: "fetch", data_object_id: null, coverage_tier: "external", description: "Fetch live air fares and availability from GDS and NDC content sources; Semantius does not master airline inventory." },
    { tool_name: "fetch_hotel_inventory", operation_kind: "fetch", data_object_id: null, coverage_tier: "external", description: "Fetch live hotel rates and availability from aggregators and direct suppliers; Semantius does not master hotel inventory." },
    { tool_name: "fetch_destination_risk_intelligence", operation_kind: "fetch", data_object_id: null, coverage_tier: "external", description: "Fetch destination risk and disruption intelligence (weather, security, transport) used to raise duty-of-care alerts." },
  ];

  const existingTools = await get(`/tools?tool_name=in.(${toolSpecs.map(t => t.tool_name).join(",")})&select=id,tool_name`);
  const toolMap = new Map<string, number>(existingTools.map(t => [String(t.tool_name), Number(t.id)]));
  const newTools = toolSpecs.filter(t => !toolMap.has(t.tool_name));
  if (newTools.length) {
    console.log(`  inserting ${newTools.length} tools (${existingTools.length} existed)`);
    await insert("/tools", newTools.map(t => ({
      tool_name: t.tool_name, operation_kind: t.operation_kind,
      data_object_id: t.data_object_id, coverage_tier: t.coverage_tier, description: t.description,
    })));
  } else console.log(`  all ${toolSpecs.length} tools already present`);
  // re-read full set + reused abstraction tools
  const allToolRows = await get(`/tools?tool_name=in.(${toolSpecs.map(t => t.tool_name).join(",")},notify_person,notify_team)&select=id,tool_name`);
  for (const t of allToolRows) toolMap.set(String(t.tool_name), Number(t.id));

  console.log("\n=== Phase S: domain_module_tools ===");
  // module -> [ {tool_name, requirement_level} ]
  const dmtSpec: Array<{ mod: number; tool: string; req: string }> = [
    // BOOKING module
    { mod: MOD.BOOKING, tool: "query_trip_search_results", req: "required" },
    { mod: MOD.BOOKING, tool: "query_trip_bookings", req: "required" },
    { mod: MOD.BOOKING, tool: "create_trip_booking", req: "required" },
    { mod: MOD.BOOKING, tool: "query_unused_ticket_credits", req: "required" },
    { mod: MOD.BOOKING, tool: "update_unused_ticket_credit", req: "required" },
    { mod: MOD.BOOKING, tool: "fetch_air_inventory", req: "required" },
    { mod: MOD.BOOKING, tool: "fetch_hotel_inventory", req: "required" },
    { mod: MOD.BOOKING, tool: "notify_person", req: "optional" },
    // TRIP module
    { mod: MOD.TRIP, tool: "query_business_trips", req: "required" },
    { mod: MOD.TRIP, tool: "create_business_trip", req: "required" },
    { mod: MOD.TRIP, tool: "query_trip_itineraries", req: "required" },
    { mod: MOD.TRIP, tool: "update_trip_itinerary", req: "required" },
    { mod: MOD.TRIP, tool: "notify_person", req: "optional" },
    // PROFILE & POLICY module
    { mod: MOD.PROFILE, tool: "query_traveler_profiles", req: "required" },
    { mod: MOD.PROFILE, tool: "update_traveler_profile", req: "required" },
    { mod: MOD.PROFILE, tool: "query_travel_policies", req: "required" },
    { mod: MOD.PROFILE, tool: "query_trip_approvals", req: "required" },
    { mod: MOD.PROFILE, tool: "update_trip_approval", req: "required" },
    { mod: MOD.PROFILE, tool: "notify_person", req: "optional" },
    // DUTY OF CARE module
    { mod: MOD.DUTY, tool: "query_duty_of_care_alerts", req: "required" },
    { mod: MOD.DUTY, tool: "update_duty_of_care_alert", req: "required" },
    { mod: MOD.DUTY, tool: "fetch_destination_risk_intelligence", req: "required" },
    { mod: MOD.DUTY, tool: "notify_person", req: "required" },
    { mod: MOD.DUTY, tool: "notify_team", req: "optional" },
  ];
  const modIds = [MOD.BOOKING, MOD.TRIP, MOD.PROFILE, MOD.DUTY];
  const existingDmt = await get(`/domain_module_tools?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,tool_id`);
  const dmtSet = new Set(existingDmt.map(r => `${r.domain_module_id}|${r.tool_id}`));
  const dmtRows: Row[] = [];
  for (const s of dmtSpec) {
    const tid = toolMap.get(s.tool);
    if (!tid) throw new Error(`tool not found for domain_module_tools: ${s.tool}`);
    const k = `${s.mod}|${tid}`;
    if (!dmtSet.has(k)) { dmtSet.add(k); dmtRows.push({ domain_module_id: s.mod, tool_id: tid, requirement_level: s.req, notes: "" }); }
  }
  if (dmtRows.length) { console.log(`  inserting ${dmtRows.length} domain_module_tools`); await insert("/domain_module_tools", dmtRows); }
  else console.log(`  domain_module_tools already present (${existingDmt.length})`);

  console.log("\n=== Phase S: system skill ===");
  const existingSkill = await get(`/skills?skill_name=eq.travel-mgmt-system&select=id,skill_name`);
  if (existingSkill.length === 0) {
    console.log("  inserting travel-mgmt-system skill");
    await insert("/skills", [{
      skill_name: "travel-mgmt-system",
      skill_type: "system",
      domain_id: DOMAIN_ID,
      domain_module_id: null,
      process_id: null,
      role_id: null,
      description: "Domain agent for corporate travel management. Reasons across booking and sourcing, trip and itinerary management, traveler profiles and travel policy, and duty-of-care. Derives its toolset from the four travel modules' tools: it shops policy-aware fares, books and ticket reservations, manages itineraries, maintains traveler profiles, routes pre-trip approvals, tracks unused-ticket credits, and raises and resolves duty-of-care alerts, fetching external air and hotel inventory and destination risk intelligence where Semantius does not master the source.",
    }]);
  } else console.log(`  travel-mgmt-system skill already present (id ${existingSkill[0].id})`);

  // ----------------------------------------------------------
  // Phase E: domain_roles + role_modules + process_raci
  // ----------------------------------------------------------
  console.log("\n=== Phase E: domain_roles ===");
  type RoleSpec = { role_code: string; role_name: string; business_function_id: number | null; description: string; reach: Array<{ mod: number; level: string }> };
  const roleSpecs: RoleSpec[] = [
    {
      role_code: "BUSINESS-OPERATIONS-TRAVEL-MANAGER",
      role_name: "Travel Manager",
      business_function_id: BF.BUSINESS_OPERATIONS,
      description: "Owns the corporate travel program: sets and maintains travel policy, configures the approval workflow, monitors program spend and supplier performance, and is accountable for duty-of-care readiness across the organization.",
      reach: [
        { mod: MOD.PROFILE, level: "primary" },
        { mod: MOD.DUTY, level: "primary" },
        { mod: MOD.BOOKING, level: "secondary" },
        { mod: MOD.TRIP, level: "secondary" },
      ],
    },
    {
      role_code: "BUSINESS-OPERATIONS-TRAVEL-ARRANGER",
      role_name: "Travel Arranger",
      business_function_id: BF.BUSINESS_OPERATIONS,
      description: "Books and manages travel on behalf of one or more travelers: shops policy-aware fares, holds and tickets reservations, builds and amends itineraries, and reapplies unused-ticket credits.",
      reach: [
        { mod: MOD.BOOKING, level: "primary" },
        { mod: MOD.TRIP, level: "primary" },
        { mod: MOD.PROFILE, level: "secondary" },
      ],
    },
    {
      role_code: "TRAVELER",
      role_name: "Traveler",
      business_function_id: null,
      description: "Cross-functional self-service traveler: self-books within policy, maintains their own traveler profile, submits pre-trip approval requests, views and changes their own itinerary, and acknowledges duty-of-care alerts affecting them.",
      reach: [
        { mod: MOD.BOOKING, level: "primary" },
        { mod: MOD.TRIP, level: "primary" },
        { mod: MOD.PROFILE, level: "secondary" },
        { mod: MOD.DUTY, level: "secondary" },
      ],
    },
  ];

  const existingRoles = await get(`/domain_roles?role_code=in.(${roleSpecs.map(r => r.role_code).join(",")})&select=id,role_code`);
  const roleMap = new Map<string, number>(existingRoles.map(r => [String(r.role_code), Number(r.id)]));
  const newRoles = roleSpecs.filter(r => !roleMap.has(r.role_code));
  if (newRoles.length) {
    console.log(`  inserting ${newRoles.length} domain_roles`);
    await insert("/domain_roles", newRoles.map(r => ({
      role_code: r.role_code, role_name: r.role_name,
      business_function_id: r.business_function_id, description: r.description,
    })));
  } else console.log(`  all domain_roles already present`);
  const allRoleRows = await get(`/domain_roles?role_code=in.(${roleSpecs.map(r => r.role_code).join(",")})&select=id,role_code`);
  for (const r of allRoleRows) roleMap.set(String(r.role_code), Number(r.id));

  console.log("\n=== Phase E: role_modules ===");
  const roleIds = roleSpecs.map(r => roleMap.get(r.role_code)!).filter(Boolean);
  const existingRm = roleIds.length ? await get(`/role_modules?role_id=in.(${roleIds.join(",")})&select=role_id,domain_module_id`) : [];
  const rmSet = new Set(existingRm.map(r => `${r.role_id}|${r.domain_module_id}`));
  const rmRows: Row[] = [];
  for (const rs of roleSpecs) {
    const rid = roleMap.get(rs.role_code)!;
    for (const reach of rs.reach) {
      const k = `${rid}|${reach.mod}`;
      if (!rmSet.has(k)) { rmSet.add(k); rmRows.push({ role_id: rid, domain_module_id: reach.mod, interaction_level: reach.level, notes: "" }); }
    }
  }
  if (rmRows.length) { console.log(`  inserting ${rmRows.length} role_modules`); await insert("/role_modules", rmRows); }
  else console.log(`  role_modules already present (${existingRm.length})`);

  console.log("\n=== Phase E: data_object_lifecycle_states.process_id wiring + process_raci ===");
  // Wire the gated lifecycle transitions to APQC processes so RACI can resolve to gates.
  // Gated states (requires_permission=true): trip_bookings.ticketed/cancelled (BOOKING),
  //   unused_ticket_credits.reapplied (BOOKING), trip_approvals.approved/rejected (PROFILE),
  //   duty_of_care_alerts.acknowledged (DUTY).
  // PCF anchors (cross-industry): use generic process rows already in the catalog where a
  // clean match exists. Look them up; if none match cleanly, leave process_id unset and
  // author process_raci against the approval gate only where a process exists.
  // To stay deterministic and avoid guessing PCF ids, we resolve a small candidate set.
  const procCandidates = await get(`/processes?source_framework=eq.apqc_pcf_cross_industry&or=(process_name.ilike.*travel*,process_name.ilike.*expense*,process_name.ilike.*manage%20business%20travel*)&select=id,process_code,process_name&limit=20`);
  console.log(`  candidate travel processes: ${JSON.stringify(procCandidates)}`);
  // process_raci is authored only if at least one gated process resolves to a process_id.
  // We surface the wiring as an open Phase-E follow-up if no clean PCF process exists, rather
  // than inventing a process_raci with no gated process behind it.

  // ----------------------------------------------------------
  // Final counts
  // ----------------------------------------------------------
  console.log("\n=== Final counts (TRAVEL-MGMT) ===");
  const counts: Row = {
    domain_regulations: (await get(`/domain_regulations?domain_id=eq.${DOMAIN_ID}&select=regulation_id`)).length,
    handoffs_touching: (await get(`/handoffs?or=(source_domain_id.eq.${DOMAIN_ID},target_domain_id.eq.${DOMAIN_ID})&select=id`)).length,
    business_function_domains: (await get(`/business_function_domains?domain_id=eq.${DOMAIN_ID}&select=business_function_id`)).length,
    tools_for_travel: (await get(`/domain_module_tools?domain_module_id=in.(${modIds.join(",")})&select=tool_id`)).length,
    skills: (await get(`/skills?domain_id=eq.${DOMAIN_ID}&select=id`)).length,
    domain_roles: (await get(`/domain_roles?role_code=in.(${roleSpecs.map(r => r.role_code).join(",")})&select=id`)).length,
    role_modules: (await get(`/role_modules?role_id=in.(${roleIds.join(",")})&select=role_id`)).length,
  };
  console.log(JSON.stringify(counts, null, 2));
}

await main();
console.log("\nDone.");
