/**
 * One-run fix for the IWMS audit (domain_id 23).
 *
 * Closes every in-scope gap from the 2026-05-25 audit:
 *   Phase M: 5 modules + 7 capability links + 5 starter-junction rows
 *   Phase B: domain_module_data_objects (masters + embedded_master + consumer)
 *   B2:      workplace_experience_feedback plural label
 *   B4:      has_personal_content flags on personal masters
 *   B6:      intra-IWMS relationships (master -> locations)
 *   B7:      users-edges (Rule #10)
 *   B11:     aliases for desk_bookings / room_reservations / workplace_service_requests
 *   B12:     lifecycle states for the three workflow masters + config-shape notes for the others
 *   B9 / B9b: two outbound + one intra-IWMS trigger_events with paired handoffs
 *   B10b:    backfill source/target domain_module_id on the 4 pre-existing handoff rows
 *   E:       4 roles + role_modules + role_permissions (tier-level bundles)
 *
 * All record_status defaults to "new" (Rule #1 - never approved without explicit review).
 * Run from project root: bun run .tmp_deploy/fix_iwms_2026_05_25.ts
 */

const IWMS_DOMAIN_ID = 23;
const DOMAIN_MAP_MODULE_ID = 1001;

// data_object IDs (resolved at audit time)
const DO = {
  desk_bookings: 590,
  room_reservations: 591,
  workplace_service_requests: 592,
  space_utilization_reports: 593,
  workplace_experience_feedback: 594,
  locations: 795,
  users: 748,
  employees: 31,
  cost_centers: 196,
  org_units: 34,
  onboarding_tasks: 18,
  floor_plans: 346,
  job_offers: 11,
};

// business_function IDs
const FN = {
  facilities: 33,
  hr: 3,
  it: 27,
  security: 28,
};

// target domain IDs for new outbound handoffs
const TARGET = {
  iga: 35,
  erp_fin: 65,
  real_est: 141,
  hcm: 54,
  onboarding: 99,
};

// Existing handoff row IDs (from audit) - for B10b backfill
const EXISTING_HANDOFFS = {
  outbound_feedback_to_hcm: 869, // src module = DESK-RESERVATION
  outbound_utilization_to_realest: 870, // src module = SPACE-ANALYTICS
  inbound_from_onboarding: 6, // tgt module = WORKPLACE-SERVICE-DESK (workplace_setup_required spawns a service request)
  inbound_floor_plan_from_realest: 858, // tgt module = SPACE-ANALYTICS (floor_plans drives utilization)
};

interface Result {
  ok: boolean;
  data: any;
  status: number;
  err?: string;
}

async function pg(method: string, path: string, body?: any): Promise<Result> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" }
  );
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    return { ok: false, data: null, status: code, err: (stderr || stdout).trim() };
  }
  const text = stdout.trim();
  try {
    return { ok: true, data: text ? JSON.parse(text) : null, status: 0 };
  } catch {
    return { ok: true, data: text, status: 0 };
  }
}

async function get<T = any>(path: string): Promise<T> {
  const r = await pg("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.err}`);
  return r.data as T;
}

async function post(path: string, body: any): Promise<any> {
  // Chunk to avoid Windows cmdline truncation (Rule #5). 8 rows per chunk is safe
  // even with verbose multi-line descriptions.
  const CHUNK = 1;
  if (Array.isArray(body) && body.length > CHUNK) {
    let results: any[] = [];
    for (let i = 0; i < body.length; i += CHUNK) {
      const slice = body.slice(i, i + CHUNK);
      const r = await pg("POST", path, slice);
      if (!r.ok) throw new Error(`POST ${path} failed (chunk ${i}-${i + slice.length}): ${r.err}`);
      if (Array.isArray(r.data)) results = results.concat(r.data);
    }
    return results;
  }
  const r = await pg("POST", path, body);
  if (!r.ok) throw new Error(`POST ${path} failed: ${r.err}\nbody=${JSON.stringify(body).slice(0, 500)}`);
  return r.data;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await pg("PATCH", path, body);
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.err}`);
  return r.data;
}

// idempotent helpers ----------------------------------------------------

async function upsertModules() {
  const modules = [
    {
      domain_module_code: "IWMS-LOCATION-MASTER",
      domain_module_name: "Location and Property Master",
      domain_id: IWMS_DOMAIN_ID,
      description:
        "Foundational location registry for an IWMS deployment. Canonically masters `locations` (sites, offices, branches, buildings, floors). Embedded-masters lease and property metadata where the IWMS holds the integrated record. Read by every other IWMS module as the spatial anchor.",
    },
    {
      domain_module_code: "IWMS-DESK-RESERVATION",
      domain_module_name: "Desk Reservation and Workplace Experience",
      domain_id: IWMS_DOMAIN_ID,
      description:
        "Hot-desking, hoteling, and desk-booking flows for hybrid-work programs. Masters `desk_bookings` and `workplace_experience_feedback`. Vendors: Robin, Envoy Workplace, Eptura Workplace, ServiceNow Workplace Service Delivery. The canonical entry-point module for return-to-office buyers.",
    },
    {
      domain_module_code: "IWMS-ROOM-RESERVATION",
      domain_module_name: "Meeting Room Reservation",
      domain_id: IWMS_DOMAIN_ID,
      description:
        "Conference room booking with calendar integration, room equipment (AV) tracking, no-show recapture, and check-in flows. Masters `room_reservations`. Often deployed alongside desk-reservation but has a distinct booking model (durations, attendees, recurring).",
    },
    {
      domain_module_code: "IWMS-WORKPLACE-SERVICE-DESK",
      domain_module_name: "Workplace Service Requests",
      domain_id: IWMS_DOMAIN_ID,
      description:
        "Facility ticket flow: light-bulb out, temperature complaint, broken chair, spill cleanup. Masters `workplace_service_requests`. Distinct from ITSM (workplace-scoped, often dispatched to in-house facilities staff or building management) and from EAM/FSM (no equipment-asset orientation).",
    },
    {
      domain_module_code: "IWMS-SPACE-ANALYTICS",
      domain_module_name: "Space Utilization and Occupancy Analytics",
      domain_id: IWMS_DOMAIN_ID,
      description:
        "Occupancy measurement, space-utilization reporting, stack diagrams, and scenario modelling for portfolio rationalization. Masters `space_utilization_reports`. Reads desk_bookings + room_reservations + sensor data; publishes utilization signals to REAL-EST and ESG.",
    },
  ];

  // Read existing
  const existing = await get<Array<{ id: number; domain_module_code: string }>>(
    `/domain_modules?domain_id=eq.${IWMS_DOMAIN_ID}&select=id,domain_module_code`
  );
  const have = new Set(existing.map((r) => r.domain_module_code));
  const toInsert = modules.filter((m) => !have.has(m.domain_module_code));
  if (toInsert.length > 0) {
    console.log(`  inserting ${toInsert.length} domain_modules`);
    await post("/domain_modules", toInsert);
  } else {
    console.log("  all domain_modules already present");
  }

  // Re-read for ID map
  const all = await get<Array<{ id: number; domain_module_code: string }>>(
    `/domain_modules?domain_id=eq.${IWMS_DOMAIN_ID}&select=id,domain_module_code`
  );
  const map: Record<string, number> = {};
  for (const r of all) map[r.domain_module_code] = r.id;
  return map;
}

async function upsertJunction<T extends Record<string, any>>(
  table: string,
  rows: T[],
  keyCols: (keyof T)[],
  filterPath: string
) {
  if (rows.length === 0) return;
  const existing = await get<Array<Record<string, any>>>(`/${table}?${filterPath}&select=${keyCols.join(",")}`);
  const keyOf = (r: Record<string, any>) => keyCols.map((c) => String(r[c])).join("|");
  const have = new Set(existing.map(keyOf));
  const toInsert = rows.filter((r) => !have.has(keyOf(r)));
  if (toInsert.length > 0) {
    console.log(`  ${table}: inserting ${toInsert.length} rows (${existing.length} already present)`);
    await post(`/${table}`, toInsert);
  } else {
    console.log(`  ${table}: all ${rows.length} rows already present`);
  }
}

// ---- main steps ------------------------------------------------------

async function main() {
  console.log("== IWMS fix pass (domain_id=23) ==");

  // Step 0: validate the domain row hasn't drifted (defensive)
  const dom = await get<Array<any>>(`/domains?id=eq.${IWMS_DOMAIN_ID}&select=domain_code,crud_percentage,min_org_size,cost_band,usa_market_size_usd_m,market_size_source_year`);
  if (!dom[0] || dom[0].domain_code !== "IWMS") throw new Error("IWMS domain id 23 missing or moved");

  // Step 1: modules
  console.log("\n[1] domain_modules");
  const MOD = await upsertModules();
  console.log("  module ids:", MOD);

  // Step 2: domain_module_capabilities (7 capability links)
  console.log("\n[2] domain_module_capabilities");
  const CAP = {
    propertyMgmt: 373,
    spaceOptim: 374,
    leaseMgmt: 375,
    maintenance: 376,
    occupancyAnalytics: 377,
    utilityTracking: 378,
    capitalProjects: 379,
  };
  const capLinks = [
    { domain_module_id: MOD["IWMS-LOCATION-MASTER"], capability_id: CAP.propertyMgmt },
    { domain_module_id: MOD["IWMS-LOCATION-MASTER"], capability_id: CAP.leaseMgmt },
    { domain_module_id: MOD["IWMS-LOCATION-MASTER"], capability_id: CAP.capitalProjects },
    { domain_module_id: MOD["IWMS-SPACE-ANALYTICS"], capability_id: CAP.spaceOptim },
    { domain_module_id: MOD["IWMS-SPACE-ANALYTICS"], capability_id: CAP.occupancyAnalytics },
    { domain_module_id: MOD["IWMS-SPACE-ANALYTICS"], capability_id: CAP.utilityTracking },
    { domain_module_id: MOD["IWMS-WORKPLACE-SERVICE-DESK"], capability_id: CAP.maintenance },
    { domain_module_id: MOD["IWMS-DESK-RESERVATION"], capability_id: CAP.spaceOptim },
  ];
  await upsertJunction(
    "domain_module_capabilities",
    capLinks,
    ["domain_module_id", "capability_id"],
    `domain_module_id=in.(${Object.values(MOD).join(",")})`
  );

  // Step 3: domain_starter_modules
  console.log("\n[3] domain_starter_modules");
  const starters = [
    {
      domain_id: IWMS_DOMAIN_ID,
      domain_module_id: MOD["IWMS-DESK-RESERVATION"],
      position: 1,
      notes: "Most common entry point: hybrid-work and return-to-office buyers begin here with hot-desking and workplace experience.",
    },
    {
      domain_id: IWMS_DOMAIN_ID,
      domain_module_id: MOD["IWMS-ROOM-RESERVATION"],
      position: 2,
      notes: "Typical second module - calendar-integrated meeting room booking once desk reservation is in place.",
    },
    {
      domain_id: IWMS_DOMAIN_ID,
      domain_module_id: MOD["IWMS-WORKPLACE-SERVICE-DESK"],
      position: 3,
      notes: "Facility ticketing rolls out once people are coming back to the office and need a way to report issues.",
    },
    {
      domain_id: IWMS_DOMAIN_ID,
      domain_module_id: MOD["IWMS-SPACE-ANALYTICS"],
      position: 4,
      notes: "Utilization analytics close the loop on hybrid-work investment, feeding portfolio rationalization decisions.",
    },
    {
      domain_id: IWMS_DOMAIN_ID,
      domain_module_id: MOD["IWMS-LOCATION-MASTER"],
      position: 5,
      notes: "Foundational location registry. Usually deployed implicitly with the first reservation module; called out separately for organizations that want a central site master before adding workflow modules.",
    },
  ];
  await upsertJunction(
    "domain_starter_modules",
    starters,
    ["domain_module_id"],
    `domain_id=eq.${IWMS_DOMAIN_ID}`
  );

  // Step 4: domain_module_data_objects (Rule #15: notes empty by default)
  console.log("\n[4] domain_module_data_objects");
  const dmdoRows = [
    // IWMS-LOCATION-MASTER
    { domain_module_id: MOD["IWMS-LOCATION-MASTER"], data_object_id: DO.locations, role: "master", necessity: "required" },
    { domain_module_id: MOD["IWMS-LOCATION-MASTER"], data_object_id: DO.floor_plans, role: "consumer", necessity: "optional" },
    { domain_module_id: MOD["IWMS-LOCATION-MASTER"], data_object_id: DO.users, role: "consumer", necessity: "required" },

    // IWMS-DESK-RESERVATION
    { domain_module_id: MOD["IWMS-DESK-RESERVATION"], data_object_id: DO.desk_bookings, role: "master", necessity: "required" },
    { domain_module_id: MOD["IWMS-DESK-RESERVATION"], data_object_id: DO.workplace_experience_feedback, role: "master", necessity: "required" },
    { domain_module_id: MOD["IWMS-DESK-RESERVATION"], data_object_id: DO.locations, role: "embedded_master", necessity: "required" },
    { domain_module_id: MOD["IWMS-DESK-RESERVATION"], data_object_id: DO.users, role: "consumer", necessity: "required" },
    { domain_module_id: MOD["IWMS-DESK-RESERVATION"], data_object_id: DO.employees, role: "consumer", necessity: "optional" },
    { domain_module_id: MOD["IWMS-DESK-RESERVATION"], data_object_id: DO.cost_centers, role: "embedded_master", necessity: "optional" },

    // IWMS-ROOM-RESERVATION
    { domain_module_id: MOD["IWMS-ROOM-RESERVATION"], data_object_id: DO.room_reservations, role: "master", necessity: "required" },
    { domain_module_id: MOD["IWMS-ROOM-RESERVATION"], data_object_id: DO.locations, role: "embedded_master", necessity: "required" },
    { domain_module_id: MOD["IWMS-ROOM-RESERVATION"], data_object_id: DO.users, role: "consumer", necessity: "required" },
    { domain_module_id: MOD["IWMS-ROOM-RESERVATION"], data_object_id: DO.employees, role: "consumer", necessity: "optional" },

    // IWMS-WORKPLACE-SERVICE-DESK
    { domain_module_id: MOD["IWMS-WORKPLACE-SERVICE-DESK"], data_object_id: DO.workplace_service_requests, role: "master", necessity: "required" },
    { domain_module_id: MOD["IWMS-WORKPLACE-SERVICE-DESK"], data_object_id: DO.locations, role: "embedded_master", necessity: "required" },
    { domain_module_id: MOD["IWMS-WORKPLACE-SERVICE-DESK"], data_object_id: DO.users, role: "consumer", necessity: "required" },
    { domain_module_id: MOD["IWMS-WORKPLACE-SERVICE-DESK"], data_object_id: DO.cost_centers, role: "embedded_master", necessity: "optional" },
    { domain_module_id: MOD["IWMS-WORKPLACE-SERVICE-DESK"], data_object_id: DO.org_units, role: "embedded_master", necessity: "optional" },

    // IWMS-SPACE-ANALYTICS
    { domain_module_id: MOD["IWMS-SPACE-ANALYTICS"], data_object_id: DO.space_utilization_reports, role: "master", necessity: "required" },
    { domain_module_id: MOD["IWMS-SPACE-ANALYTICS"], data_object_id: DO.desk_bookings, role: "consumer", necessity: "required" },
    { domain_module_id: MOD["IWMS-SPACE-ANALYTICS"], data_object_id: DO.room_reservations, role: "consumer", necessity: "required" },
    { domain_module_id: MOD["IWMS-SPACE-ANALYTICS"], data_object_id: DO.workplace_experience_feedback, role: "consumer", necessity: "optional" },
    { domain_module_id: MOD["IWMS-SPACE-ANALYTICS"], data_object_id: DO.locations, role: "embedded_master", necessity: "required" },
    { domain_module_id: MOD["IWMS-SPACE-ANALYTICS"], data_object_id: DO.floor_plans, role: "consumer", necessity: "optional" },
    { domain_module_id: MOD["IWMS-SPACE-ANALYTICS"], data_object_id: DO.org_units, role: "embedded_master", necessity: "optional" },
  ];
  await upsertJunction(
    "domain_module_data_objects",
    dmdoRows,
    ["domain_module_id", "data_object_id"],
    `domain_module_id=in.(${Object.values(MOD).join(",")})`
  );

  // Step 5: B2 + B4 - patch labels and pattern flags
  console.log("\n[5] PATCH data_objects (B2 + B4)");
  await patch(`/data_objects?id=eq.${DO.workplace_experience_feedback}`, {
    plural_label: "Workplace Experience Feedback",
    has_personal_content: true,
  });
  await patch(`/data_objects?id=eq.${DO.desk_bookings}`, { has_personal_content: true });
  await patch(`/data_objects?id=eq.${DO.room_reservations}`, { has_personal_content: true });
  await patch(`/data_objects?id=eq.${DO.workplace_service_requests}`, { has_personal_content: true });
  // config-shape notes (B12 exemption)
  await patch(`/data_objects?id=eq.${DO.space_utilization_reports}`, {
    notes: "Config-shaped; no workflow. Reports are computed projections refreshed on schedule, not stateful records — no per-state permissions needed.",
  });
  await patch(`/data_objects?id=eq.${DO.locations}`, {
    notes: "Config-shaped reference master; no workflow. Sites/offices/branches are authored once and edited inline as the portfolio changes.",
  });
  // workplace_experience_feedback: store-and-forget shape; record_status is the only state
  await patch(`/data_objects?id=eq.${DO.workplace_experience_feedback}`, {
    notes: "Store-and-forget feedback artifact. No multi-state workflow; submitted feedback rolls up into analytics. has_personal_content=true (free-text from named employees).",
  });
  console.log("  patched 4 data_objects with flags + 3 with config-shape notes");

  // Step 6: B6 + B7 - data_object_relationships
  console.log("\n[6] data_object_relationships (intra + users-edges)");
  // Convention (matches existing catalog rows like `locations houses desks`):
  // write one_to_many from the "one" side. owner_side=target means the FK lives on the
  // related_data_object side.
  const intraRels = [
    // intra-IWMS (locations is the "one" side for every reservation / report / feedback)
    {
      data_object_id: DO.locations, related_data_object_id: DO.desk_bookings,
      relationship_verb: "hosts_desk_bookings", inverse_verb: "held_at",
      relationship_type: "one_to_many", relationship_kind: "reference",
      is_required: true, owner_side: "target",
    },
    {
      data_object_id: DO.locations, related_data_object_id: DO.room_reservations,
      relationship_verb: "hosts_room_reservations", inverse_verb: "held_at",
      relationship_type: "one_to_many", relationship_kind: "reference",
      is_required: true, owner_side: "target",
    },
    {
      data_object_id: DO.locations, related_data_object_id: DO.workplace_service_requests,
      relationship_verb: "site_of_service_requests", inverse_verb: "occurs_at",
      relationship_type: "one_to_many", relationship_kind: "reference",
      is_required: true, owner_side: "target",
    },
    {
      data_object_id: DO.locations, related_data_object_id: DO.space_utilization_reports,
      relationship_verb: "measured_by_reports", inverse_verb: "measures",
      relationship_type: "one_to_many", relationship_kind: "reference",
      is_required: true, owner_side: "target",
    },
    {
      data_object_id: DO.locations, related_data_object_id: DO.workplace_experience_feedback,
      relationship_verb: "subject_of_feedback", inverse_verb: "about",
      relationship_type: "one_to_many", relationship_kind: "reference",
      is_required: false, owner_side: "target",
    },
    // users-edges (Rule #10): users is the "one" side; FK lives on the work-record
    {
      data_object_id: DO.users, related_data_object_id: DO.desk_bookings,
      relationship_verb: "books_desks", inverse_verb: "booked_by",
      relationship_type: "one_to_many", relationship_kind: "reference",
      is_required: true, owner_side: "target",
    },
    {
      data_object_id: DO.users, related_data_object_id: DO.room_reservations,
      relationship_verb: "organizes_room_reservations", inverse_verb: "organized_by",
      relationship_type: "one_to_many", relationship_kind: "reference",
      is_required: true, owner_side: "target",
    },
    {
      data_object_id: DO.users, related_data_object_id: DO.workplace_service_requests,
      relationship_verb: "requests_workplace_services", inverse_verb: "requested_by",
      relationship_type: "one_to_many", relationship_kind: "reference",
      is_required: true, owner_side: "target",
    },
    {
      data_object_id: DO.users, related_data_object_id: DO.workplace_service_requests,
      relationship_verb: "assigned_to_workplace_services", inverse_verb: "assigned_to",
      relationship_type: "one_to_many", relationship_kind: "reference",
      is_required: false, owner_side: "target",
    },
    {
      data_object_id: DO.users, related_data_object_id: DO.workplace_experience_feedback,
      relationship_verb: "authors_workplace_feedback", inverse_verb: "authored_by",
      relationship_type: "one_to_many", relationship_kind: "reference",
      is_required: true, owner_side: "target",
    },
  ];
  await upsertJunction(
    "data_object_relationships",
    intraRels,
    ["data_object_id", "related_data_object_id", "relationship_verb"],
    `data_object_id=in.(${Object.values(DO).join(",")})`
  );

  // Step 7: B11 - aliases
  console.log("\n[7] data_object_aliases");
  const aliases = [
    { data_object_id: DO.desk_bookings, alias_name: "hot_desk", alias_type: "synonym" },
    { data_object_id: DO.desk_bookings, alias_name: "hoteling", alias_type: "synonym" },
    { data_object_id: DO.desk_bookings, alias_name: "desk_reservation", alias_type: "synonym" },
    { data_object_id: DO.room_reservations, alias_name: "meeting_room_booking", alias_type: "synonym" },
    { data_object_id: DO.room_reservations, alias_name: "conference_room_reservation", alias_type: "synonym" },
    { data_object_id: DO.workplace_service_requests, alias_name: "facility_ticket", alias_type: "synonym" },
    { data_object_id: DO.workplace_service_requests, alias_name: "workplace_request", alias_type: "synonym" },
    { data_object_id: DO.workplace_service_requests, alias_name: "facility_service_request", alias_type: "synonym" },
  ];
  await upsertJunction(
    "data_object_aliases",
    aliases,
    ["data_object_id", "alias_name"],
    `data_object_id=in.(${Object.values(DO).join(",")})`
  );

  // Step 8: B12 - lifecycle states (3 workflow masters)
  console.log("\n[8] data_object_lifecycle_states");
  const lifecycleRows = [
    // desk_bookings
    { data_object_id: DO.desk_bookings, state_name: "requested", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, domain_module_id: MOD["IWMS-DESK-RESERVATION"], description: "Booking submitted by employee; pending policy and availability checks." },
    { data_object_id: DO.desk_bookings, state_name: "confirmed", state_order: 2, is_initial: false, is_terminal: false, requires_permission: false, domain_module_id: MOD["IWMS-DESK-RESERVATION"], description: "Desk reserved for the requested day(s); appears on the booker's schedule." },
    { data_object_id: DO.desk_bookings, state_name: "checked_in", state_order: 3, is_initial: false, is_terminal: false, requires_permission: false, domain_module_id: MOD["IWMS-DESK-RESERVATION"], description: "Booker arrived and confirmed presence (badge, QR, or app)." },
    { data_object_id: DO.desk_bookings, state_name: "completed", state_order: 4, is_initial: false, is_terminal: true, requires_permission: false, domain_module_id: MOD["IWMS-DESK-RESERVATION"], description: "Day finished; booking closed and ready for analytics rollup." },
    { data_object_id: DO.desk_bookings, state_name: "no_show", state_order: 5, is_initial: false, is_terminal: true, requires_permission: false, domain_module_id: MOD["IWMS-DESK-RESERVATION"], description: "Booker did not check in within the grace window; desk auto-released." },
    { data_object_id: DO.desk_bookings, state_name: "cancelled", state_order: 6, is_initial: false, is_terminal: true, requires_permission: false, domain_module_id: MOD["IWMS-DESK-RESERVATION"], description: "Booker or admin cancelled before the booked day." },

    // room_reservations
    { data_object_id: DO.room_reservations, state_name: "requested", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, domain_module_id: MOD["IWMS-ROOM-RESERVATION"], description: "Reservation requested; pending availability and approval where required." },
    { data_object_id: DO.room_reservations, state_name: "confirmed", state_order: 2, is_initial: false, is_terminal: false, requires_permission: false, domain_module_id: MOD["IWMS-ROOM-RESERVATION"], description: "Room held; calendar invitations distributed; AV / catering jobs scheduled if needed." },
    { data_object_id: DO.room_reservations, state_name: "checked_in", state_order: 3, is_initial: false, is_terminal: false, requires_permission: false, domain_module_id: MOD["IWMS-ROOM-RESERVATION"], description: "Organizer or attendee confirmed room is in use; prevents auto-release." },
    { data_object_id: DO.room_reservations, state_name: "completed", state_order: 4, is_initial: false, is_terminal: true, requires_permission: false, domain_module_id: MOD["IWMS-ROOM-RESERVATION"], description: "Meeting ended; room available for the next booking." },
    { data_object_id: DO.room_reservations, state_name: "no_show", state_order: 5, is_initial: false, is_terminal: true, requires_permission: false, domain_module_id: MOD["IWMS-ROOM-RESERVATION"], description: "No check-in within grace window; room auto-released for utilization recapture." },
    { data_object_id: DO.room_reservations, state_name: "cancelled", state_order: 6, is_initial: false, is_terminal: true, requires_permission: false, domain_module_id: MOD["IWMS-ROOM-RESERVATION"], description: "Cancelled before the meeting time; AV / catering downstream jobs cancelled." },

    // workplace_service_requests
    { data_object_id: DO.workplace_service_requests, state_name: "submitted", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, domain_module_id: MOD["IWMS-WORKPLACE-SERVICE-DESK"], description: "Ticket logged by requester; pending triage." },
    { data_object_id: DO.workplace_service_requests, state_name: "triaged", state_order: 2, is_initial: false, is_terminal: false, requires_permission: true, domain_module_id: MOD["IWMS-WORKPLACE-SERVICE-DESK"], permission_verb_override: "triage_service_request", description: "Routed and assigned to the responsible facilities staff or building-management vendor." },
    { data_object_id: DO.workplace_service_requests, state_name: "in_progress", state_order: 3, is_initial: false, is_terminal: false, requires_permission: false, domain_module_id: MOD["IWMS-WORKPLACE-SERVICE-DESK"], description: "Assignee is working the request." },
    { data_object_id: DO.workplace_service_requests, state_name: "resolved", state_order: 4, is_initial: false, is_terminal: true, requires_permission: true, domain_module_id: MOD["IWMS-WORKPLACE-SERVICE-DESK"], permission_verb_override: "resolve_service_request", description: "Issue addressed; requester notified for confirmation." },
    { data_object_id: DO.workplace_service_requests, state_name: "cancelled", state_order: 5, is_initial: false, is_terminal: true, requires_permission: false, domain_module_id: MOD["IWMS-WORKPLACE-SERVICE-DESK"], description: "Withdrawn by requester or determined out-of-scope by triage." },
  ];
  await upsertJunction(
    "data_object_lifecycle_states",
    lifecycleRows,
    ["data_object_id", "state_name"],
    `data_object_id=in.(${DO.desk_bookings},${DO.room_reservations},${DO.workplace_service_requests})`
  );

  // Step 9: B9 / B9b - new trigger_events + handoffs
  console.log("\n[9] new trigger_events + handoffs");
  const newEvents = [
    {
      event_name: "desk_booking.checked_in",
      data_object_id: DO.desk_bookings,
      event_category: "state_change",
      to_state: "checked_in",
      from_state: "confirmed",
      description: "Fired when a desk booking is checked in. Subscribers update occupancy signals (IWMS-SPACE-ANALYTICS) and badge / access systems (IGA) where physical-access provisioning is wired up.",
    },
    {
      event_name: "workplace_service_request.resolved",
      data_object_id: DO.workplace_service_requests,
      event_category: "state_change",
      to_state: "resolved",
      from_state: "in_progress",
      description: "Fired when a workplace service request is resolved. Subscribers update chargeback / cost-allocation systems (ERP-FIN) and feed completion-time SLAs back into space-analytics.",
    },
    {
      event_name: "room_reservation.no_show",
      data_object_id: DO.room_reservations,
      event_category: "state_change",
      to_state: "no_show",
      from_state: "confirmed",
      description: "Fired when a room reservation is auto-released after the grace window. Subscribers (IWMS-SPACE-ANALYTICS) recapture the time slot for utilization reporting.",
    },
  ];

  // idempotent insert by event_name
  const existingEvents = await get<Array<{ id: number; event_name: string }>>(
    `/trigger_events?event_name=in.(${newEvents.map((e) => e.event_name).join(",")})&select=id,event_name`
  );
  const haveEv = new Set(existingEvents.map((r) => r.event_name));
  const evToInsert = newEvents.filter((e) => !haveEv.has(e.event_name));
  if (evToInsert.length > 0) {
    console.log(`  inserting ${evToInsert.length} trigger_events`);
    await post("/trigger_events", evToInsert);
  } else {
    console.log("  all 3 trigger_events already present");
  }
  const allEv = await get<Array<{ id: number; event_name: string }>>(
    `/trigger_events?event_name=in.(${newEvents.map((e) => e.event_name).join(",")})&select=id,event_name`
  );
  const evMap: Record<string, number> = {};
  for (const r of allEv) evMap[r.event_name] = r.id;

  // Patch desk_booking.checked_in + workplace_service_request.resolved + room_reservation.no_show
  // with source domain module id
  await patch(`/trigger_events?event_name=eq.desk_booking.checked_in`, { domain_module_id: MOD["IWMS-DESK-RESERVATION"] });
  await patch(`/trigger_events?event_name=eq.workplace_service_request.resolved`, { domain_module_id: MOD["IWMS-WORKPLACE-SERVICE-DESK"] });
  await patch(`/trigger_events?event_name=eq.room_reservation.no_show`, { domain_module_id: MOD["IWMS-ROOM-RESERVATION"] });

  // New handoffs (paired)
  const newHandoffs = [
    // desk_booking.checked_in -> IGA (badge / physical-access)
    {
      source_domain_id: IWMS_DOMAIN_ID,
      source_domain_module_id: MOD["IWMS-DESK-RESERVATION"],
      target_domain_id: TARGET.iga,
      target_domain_module_id: null,
      data_object_id: DO.desk_bookings,
      trigger_event_id: evMap["desk_booking.checked_in"],
      integration_pattern: "api_call",
      friction_level: "high",
      description: "When a booker checks in, IGA / physical-access provisioning grants temporary badge zone (floor, building). High friction: identity reconciliation between IWMS booker_id and IGA user_id, plus revocation timing.",
      notes: "target NULL until IGA is modularized",
    },
    // workplace_service_request.resolved -> ERP-FIN (chargeback)
    {
      source_domain_id: IWMS_DOMAIN_ID,
      source_domain_module_id: MOD["IWMS-WORKPLACE-SERVICE-DESK"],
      target_domain_id: TARGET.erp_fin,
      target_domain_module_id: null,
      data_object_id: DO.workplace_service_requests,
      trigger_event_id: evMap["workplace_service_request.resolved"],
      integration_pattern: "batch_sync",
      friction_level: "medium",
      description: "Resolved workplace tickets feed cost-center chargeback (cleaning, repair labor, materials) into ERP-FIN. Medium friction: cost-center mapping drift; batch sync is fine for monthly accruals.",
      notes: "target NULL until ERP-FIN is modularized",
    },
    // room_reservation.no_show -> IWMS-SPACE-ANALYTICS (intra-domain B9b)
    {
      source_domain_id: IWMS_DOMAIN_ID,
      source_domain_module_id: MOD["IWMS-ROOM-RESERVATION"],
      target_domain_id: IWMS_DOMAIN_ID,
      target_domain_module_id: MOD["IWMS-SPACE-ANALYTICS"],
      data_object_id: DO.room_reservations,
      trigger_event_id: evMap["room_reservation.no_show"],
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      description: "No-show releases feed back into utilization analytics; intra-IWMS lifecycle progression.",
      notes: "",
    },
    // desk_booking.checked_in -> IWMS-SPACE-ANALYTICS (intra-domain B9b)
    {
      source_domain_id: IWMS_DOMAIN_ID,
      source_domain_module_id: MOD["IWMS-DESK-RESERVATION"],
      target_domain_id: IWMS_DOMAIN_ID,
      target_domain_module_id: MOD["IWMS-SPACE-ANALYTICS"],
      data_object_id: DO.desk_bookings,
      trigger_event_id: evMap["desk_booking.checked_in"],
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      description: "Check-in confirms occupancy; intra-IWMS lifecycle progression into utilization analytics.",
      notes: "",
    },
  ];

  // Idempotent: skip if already present (key on src+tgt+trigger)
  const existingNew = await get<Array<{ id: number; trigger_event_id: number; target_domain_id: number; source_domain_module_id: number; target_domain_module_id: number }>>(
    `/handoffs?source_domain_id=eq.${IWMS_DOMAIN_ID}&trigger_event_id=in.(${Object.values(evMap).join(",")})&select=id,trigger_event_id,target_domain_id,source_domain_module_id,target_domain_module_id`
  );
  const existingKeys = new Set(existingNew.map((r) => `${r.trigger_event_id}|${r.target_domain_id}|${r.target_domain_module_id ?? "x"}`));
  const hoToInsert = newHandoffs.filter((h) => !existingKeys.has(`${h.trigger_event_id}|${h.target_domain_id}|${h.target_domain_module_id ?? "x"}`));
  if (hoToInsert.length > 0) {
    console.log(`  inserting ${hoToInsert.length} new handoffs`);
    await post("/handoffs", hoToInsert);
  } else {
    console.log("  all 4 new handoffs already present");
  }

  // Step 10: B10b backfill on 4 existing rows
  console.log("\n[10] B10b backfill on existing handoff rows");
  await patch(`/handoffs?id=eq.${EXISTING_HANDOFFS.outbound_feedback_to_hcm}`, {
    source_domain_module_id: MOD["IWMS-DESK-RESERVATION"],
  });
  await patch(`/handoffs?id=eq.${EXISTING_HANDOFFS.outbound_utilization_to_realest}`, {
    source_domain_module_id: MOD["IWMS-SPACE-ANALYTICS"],
  });
  await patch(`/handoffs?id=eq.${EXISTING_HANDOFFS.inbound_from_onboarding}`, {
    target_domain_module_id: MOD["IWMS-WORKPLACE-SERVICE-DESK"],
  });
  await patch(`/handoffs?id=eq.${EXISTING_HANDOFFS.inbound_floor_plan_from_realest}`, {
    target_domain_module_id: MOD["IWMS-SPACE-ANALYTICS"],
  });
  // Also set domain_module_id on the existing trigger_events for outbound
  await patch(`/trigger_events?event_name=eq.workplace_feedback.submitted`, { domain_module_id: MOD["IWMS-DESK-RESERVATION"] });
  await patch(`/trigger_events?event_name=eq.space_utilization.measured`, { domain_module_id: MOD["IWMS-SPACE-ANALYTICS"] });
  console.log("  patched 4 handoffs + 2 trigger_events with module FKs");

  // Step 11: permissions (5 modules x 3 tiers = 15) + 2 workflow-gates
  console.log("\n[11] permissions");
  const tierRows = [];
  for (const code of Object.keys(MOD)) {
    const lc = code.toLowerCase();
    tierRows.push(
      { permission_name: `${lc}:read`, tier: "baseline-read", domain_module_id: MOD[code], module_id: DOMAIN_MAP_MODULE_ID, description: `Read access to ${code} records.` },
      { permission_name: `${lc}:manage`, tier: "baseline-manage", domain_module_id: MOD[code], module_id: DOMAIN_MAP_MODULE_ID, description: `Manage (create / update / non-destructive transitions) ${code} records.` },
      { permission_name: `${lc}:admin`, tier: "baseline-admin", domain_module_id: MOD[code], module_id: DOMAIN_MAP_MODULE_ID, description: `Full administrative authority over ${code} (includes workflow-gate and override permissions).` },
    );
  }
  // workflow gates from lifecycle states with requires_permission=true
  tierRows.push(
    { permission_name: "iwms-workplace-service-desk:triage_service_request", tier: "workflow-gate", domain_module_id: MOD["IWMS-WORKPLACE-SERVICE-DESK"], module_id: DOMAIN_MAP_MODULE_ID, description: "Triage a submitted workplace service request and assign it to the responsible facilities team or vendor." },
    { permission_name: "iwms-workplace-service-desk:resolve_service_request", tier: "workflow-gate", domain_module_id: MOD["IWMS-WORKPLACE-SERVICE-DESK"], module_id: DOMAIN_MAP_MODULE_ID, description: "Mark a workplace service request resolved and notify the requester." },
  );
  await upsertJunction(
    "permissions",
    tierRows,
    ["permission_name"],
    `domain_module_id=in.(${Object.values(MOD).join(",")})`
  );

  // Re-read permission IDs
  const allPerms = await get<Array<{ id: number; permission_name: string }>>(
    `/permissions?domain_module_id=in.(${Object.values(MOD).join(",")})&select=id,permission_name`
  );
  const PERM: Record<string, number> = {};
  for (const p of allPerms) PERM[p.permission_name] = p.id;

  // Step 12: roles (4)
  console.log("\n[12] roles");
  const roleSpec = [
    {
      role_code: "FACILITIES-WORKPLACE-MANAGER",
      role_name: "Workplace Manager",
      slug: "facilities_workplace_manager",
      business_function_id: FN.facilities,
      origin: "model",
      module_id: DOMAIN_MAP_MODULE_ID,
      description: "Owns the workplace experience across reservations, service requests, and space analytics. Admin-tier on most IWMS modules.",
    },
    {
      role_code: "FACILITIES-SPACE-PLANNER",
      role_name: "Space Planner",
      slug: "facilities_space_planner",
      business_function_id: FN.facilities,
      origin: "model",
      module_id: DOMAIN_MAP_MODULE_ID,
      description: "Owns space planning, occupancy analytics, and scenario modelling. Admin-tier on analytics; manage-tier on the location master; read on reservation modules for upstream visibility.",
    },
    {
      role_code: "FACILITIES-WORKPLACE-COORDINATOR",
      role_name: "Workplace Coordinator",
      slug: "facilities_workplace_coordinator",
      business_function_id: FN.facilities,
      origin: "model",
      module_id: DOMAIN_MAP_MODULE_ID,
      description: "Day-to-day workplace operations IC: triages service requests, oversees reservation policies, fields workplace-experience issues.",
    },
    {
      role_code: "EMPLOYEE-WORKPLACE-USER",
      role_name: "Workplace User",
      slug: "employee_workplace_user",
      business_function_id: null,
      origin: "model",
      module_id: DOMAIN_MAP_MODULE_ID,
      description: "Cross-functional self-service persona: any employee who books desks, reserves rooms, submits service requests, or gives workplace feedback.",
    },
  ];
  await upsertJunction("roles", roleSpec, ["role_code"], `role_code=in.(${roleSpec.map((r) => r.role_code).join(",")})`);
  const allRoles = await get<Array<{ id: number; role_code: string }>>(
    `/roles?role_code=in.(${roleSpec.map((r) => r.role_code).join(",")})&select=id,role_code`
  );
  const ROLE: Record<string, number> = {};
  for (const r of allRoles) ROLE[r.role_code] = r.id;

  // Step 13: role_modules
  console.log("\n[13] role_modules");
  const rm = (role: string, mod: string, level: "primary" | "secondary") => ({
    role_id: ROLE[role],
    domain_module_id: MOD[mod],
    interaction_level: level,
  });
  const roleModRows = [
    // FACILITIES-WORKPLACE-MANAGER (all 5)
    rm("FACILITIES-WORKPLACE-MANAGER", "IWMS-LOCATION-MASTER", "primary"),
    rm("FACILITIES-WORKPLACE-MANAGER", "IWMS-DESK-RESERVATION", "primary"),
    rm("FACILITIES-WORKPLACE-MANAGER", "IWMS-ROOM-RESERVATION", "primary"),
    rm("FACILITIES-WORKPLACE-MANAGER", "IWMS-WORKPLACE-SERVICE-DESK", "primary"),
    rm("FACILITIES-WORKPLACE-MANAGER", "IWMS-SPACE-ANALYTICS", "primary"),
    // FACILITIES-SPACE-PLANNER
    rm("FACILITIES-SPACE-PLANNER", "IWMS-SPACE-ANALYTICS", "primary"),
    rm("FACILITIES-SPACE-PLANNER", "IWMS-LOCATION-MASTER", "primary"),
    rm("FACILITIES-SPACE-PLANNER", "IWMS-DESK-RESERVATION", "secondary"),
    rm("FACILITIES-SPACE-PLANNER", "IWMS-ROOM-RESERVATION", "secondary"),
    // FACILITIES-WORKPLACE-COORDINATOR
    rm("FACILITIES-WORKPLACE-COORDINATOR", "IWMS-WORKPLACE-SERVICE-DESK", "primary"),
    rm("FACILITIES-WORKPLACE-COORDINATOR", "IWMS-DESK-RESERVATION", "primary"),
    rm("FACILITIES-WORKPLACE-COORDINATOR", "IWMS-ROOM-RESERVATION", "primary"),
    rm("FACILITIES-WORKPLACE-COORDINATOR", "IWMS-LOCATION-MASTER", "secondary"),
    // EMPLOYEE-WORKPLACE-USER (cross-functional self-service)
    rm("EMPLOYEE-WORKPLACE-USER", "IWMS-DESK-RESERVATION", "primary"),
    rm("EMPLOYEE-WORKPLACE-USER", "IWMS-ROOM-RESERVATION", "primary"),
    rm("EMPLOYEE-WORKPLACE-USER", "IWMS-WORKPLACE-SERVICE-DESK", "secondary"),
  ];
  await upsertJunction(
    "role_modules",
    roleModRows,
    ["role_id", "domain_module_id"],
    `role_id=in.(${Object.values(ROLE).join(",")})`
  );

  // Step 14: role_permissions (bundles)
  console.log("\n[14] role_permissions");
  const rp = (role: string, perm: string) => ({
    role_id: ROLE[role],
    permission_id: PERM[perm],
  });
  const bundles = [
    // FACILITIES-WORKPLACE-MANAGER: :admin on all 5
    rp("FACILITIES-WORKPLACE-MANAGER", "iwms-location-master:admin"),
    rp("FACILITIES-WORKPLACE-MANAGER", "iwms-desk-reservation:admin"),
    rp("FACILITIES-WORKPLACE-MANAGER", "iwms-room-reservation:admin"),
    rp("FACILITIES-WORKPLACE-MANAGER", "iwms-workplace-service-desk:admin"),
    rp("FACILITIES-WORKPLACE-MANAGER", "iwms-space-analytics:admin"),
    // FACILITIES-SPACE-PLANNER: :admin on analytics + location; :read elsewhere
    rp("FACILITIES-SPACE-PLANNER", "iwms-space-analytics:admin"),
    rp("FACILITIES-SPACE-PLANNER", "iwms-location-master:manage"),
    rp("FACILITIES-SPACE-PLANNER", "iwms-desk-reservation:read"),
    rp("FACILITIES-SPACE-PLANNER", "iwms-room-reservation:read"),
    // FACILITIES-WORKPLACE-COORDINATOR: :manage on service-desk + reservations; specific workflow gates
    rp("FACILITIES-WORKPLACE-COORDINATOR", "iwms-workplace-service-desk:manage"),
    rp("FACILITIES-WORKPLACE-COORDINATOR", "iwms-workplace-service-desk:triage_service_request"),
    rp("FACILITIES-WORKPLACE-COORDINATOR", "iwms-workplace-service-desk:resolve_service_request"),
    rp("FACILITIES-WORKPLACE-COORDINATOR", "iwms-desk-reservation:manage"),
    rp("FACILITIES-WORKPLACE-COORDINATOR", "iwms-room-reservation:manage"),
    rp("FACILITIES-WORKPLACE-COORDINATOR", "iwms-location-master:read"),
    // EMPLOYEE-WORKPLACE-USER: :read on most + targeted :manage on own bookings (handled at app layer; :read at catalog level)
    rp("EMPLOYEE-WORKPLACE-USER", "iwms-desk-reservation:manage"),
    rp("EMPLOYEE-WORKPLACE-USER", "iwms-room-reservation:manage"),
    rp("EMPLOYEE-WORKPLACE-USER", "iwms-workplace-service-desk:manage"),
  ];
  // Filter out any with undefined permission_id (defensive)
  const cleanBundles = bundles.filter((b) => b.permission_id != null && b.role_id != null);
  if (cleanBundles.length !== bundles.length) {
    console.warn(`  WARNING: dropped ${bundles.length - cleanBundles.length} role_permissions with missing FK`);
  }
  await upsertJunction(
    "role_permissions",
    cleanBundles,
    ["role_id", "permission_id"],
    `role_id=in.(${Object.values(ROLE).join(",")})`
  );

  console.log("\n== fix pass complete ==");
}

main().catch((e) => {
  console.error("FATAL:", e?.message ?? e);
  process.exit(1);
});
