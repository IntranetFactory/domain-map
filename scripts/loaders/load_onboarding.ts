#!/usr/bin/env bun
// Load the Onboarding domain end-to-end:
//   Phase 1: ONBOARDING domain + 3 new vendors + 6 new solutions + 14 solution_domains links
//   Phase 2: 8 onboarding data_objects + 8 domain_data_objects (role: master)
//   Phase 3: 8 cross_domain_handoffs around ONBOARDING (inbound from ATS/HCM,
//            outbound to ITSM/IWMS/PAYROLL/LMS/HRSD/IGA)
//
// Idempotent throughout: natural-key reads, insert only what's missing, re-read for id maps.

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function semCall(body: Row): Promise<Row[]> {
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
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`semantius call failed (exit ${code}): ${stderr}`);
  }
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}

const get = (path: string) => semCall({ method: "GET", path });
const post = (path: string, body: Row | Row[]) => semCall({ method: "POST", path, body });

async function insertChunked(path: string, rows: Row[]): Promise<void> {
  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    if (slice.length > 0) await post(path, slice);
  }
}

async function syncByKey<T extends Row>(
  path: string,
  rows: T[],
  keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  ${path}: inserting ${missing.length} new (${existing.length} existed)`);
    await insertChunked(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} already present`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// =============================================================================
// PHASE 1 — domain + vendors + solutions + solution_domains
// =============================================================================
console.log("\n=== Phase 1: ONBOARDING domain + vendors + solutions + solution_domains ===");

// --- Domain ---
const onboardingDomain = {
  domain_code: "ONBOARDING",
  domain_name: "Employee Onboarding",
  description:
    "Orchestration of pre-boarding, Day-1, and 30/60/90 workflows for new hires — task lists, welcome experiences, documentation, e-signature, buddy assignments, and downstream provisioning coordination. Distinct point-solution market (Enboarder, Talmundo, ClickBoarding, Appical, Kallidus/Sapling) although onboarding capabilities are commonly bundled inside ATS (iCIMS Onboard, Greenhouse Onboarding, SmartRecruiters Onboarding), HCM (Workday Journeys, BambooHR, HiBob, Rippling), and HRSD platforms. Operates primarily as a downstream-trigger pattern: offer.accepted (ATS) and employee.created (HCM) drive journey instantiation, which then fans out events to ITSM (provisioning), IWMS (facilities), Payroll (activation), LMS (compliance training), HRSD (case escalation), and IGA (access provisioning) — making it the textbook case for the cross_domain_handoffs analytic.",
  certification_required: false,
};
const domainMap = await syncByKey("/domains", [onboardingDomain], "domain_code");
const ONBOARDING_ID = domainMap.get("ONBOARDING")!;
console.log(`  ONBOARDING domain id: ${ONBOARDING_ID}`);

// Reference domain ids needed for handoffs
const refDomains = await get(
  "/domains?domain_code=in.(ATS,HCM,ITSM,IWMS,PAYROLL,LMS,HRSD,IGA,ONBOARDING)&select=id,domain_code",
);
const domainIdByCode = new Map<string, number>();
for (const r of refDomains) domainIdByCode.set(String(r.domain_code), Number(r.id));
console.log(`  referenced domains: ${[...domainIdByCode.keys()].join(", ")}`);

// --- Vendors (3 new) ---
const newVendors = [
  {
    vendor_name: "Talmundo",
    description:
      "Amsterdam-based pure-play onboarding vendor focused on new-hire engagement and pre-boarding experience. Common European/global enterprise pick alongside Appical.",
    vendor_url: "https://www.talmundo.com",
    headquarters_country: "Netherlands",
    notes: "",
  },
  {
    vendor_name: "Click Boarding",
    description:
      "US pure-play onboarding vendor with strength in compliance-heavy onboarding (regulated industries, frontline workforces).",
    vendor_url: "https://www.clickboarding.com",
    headquarters_country: "USA",
    notes: "",
  },
  {
    vendor_name: "Appical",
    description:
      "Amsterdam-based pure-play onboarding vendor focused on mobile-first new-hire experience, particularly strong in retail and frontline workforces.",
    vendor_url: "https://www.appical.net",
    headquarters_country: "Netherlands",
    notes: "",
  },
];
const vendorMap = await syncByKey("/vendors", newVendors, "vendor_name");

// Build vendor id map including already-known referenced vendors
const refVendors = await get(
  "/vendors?vendor_name=in.(Greenhouse%20Software,iCIMS,SmartRecruiters,Workday,BambooHR,HiBob,Rippling,Enboarder,Kallidus)&select=id,vendor_name",
);
const vendorIdByName = new Map<string, number>(vendorMap);
for (const r of refVendors) vendorIdByName.set(String(r.vendor_name), Number(r.id));
console.log(`  vendor ids resolved: ${[...vendorIdByName.keys()].join(", ")}`);

// --- Solutions (6 new) ---
const newSolutions = [
  {
    solution_name: "Talmundo",
    description:
      "Pre-boarding and onboarding experience platform: mobile-first task journeys, content management, analytics. Pure-play; not part of a broader HRIS or ATS suite.",
    solution_url: "https://www.talmundo.com",
    vendor_id: vendorIdByName.get("Talmundo")!,
    solution_type: "saas",
    is_active_in_market: true,
    notes: "",
  },
  {
    solution_name: "Click Boarding",
    description:
      "Onboarding orchestration platform with strong compliance-document and frontline-workforce focus (paperwork capture, e-sign, branded experience). Pure-play.",
    solution_url: "https://www.clickboarding.com",
    vendor_id: vendorIdByName.get("Click Boarding")!,
    solution_type: "saas",
    is_active_in_market: true,
    notes: "",
  },
  {
    solution_name: "Appical",
    description:
      "Mobile-first onboarding experience platform. Pure-play; particularly strong in retail, hospitality, and other frontline workforces.",
    solution_url: "https://www.appical.net",
    vendor_id: vendorIdByName.get("Appical")!,
    solution_type: "saas",
    is_active_in_market: true,
    notes: "",
  },
  {
    solution_name: "Greenhouse Onboarding",
    description:
      "Greenhouse's dedicated onboarding product, separate from Greenhouse Recruiting. Provides task workflows, welcome content, and integrations into HRIS/ITSM. Formerly Greenhouse Welcome / Mae.",
    solution_url: "https://www.greenhouse.io/onboarding",
    vendor_id: vendorIdByName.get("Greenhouse Software")!,
    solution_type: "saas",
    is_active_in_market: true,
    notes: "",
  },
  {
    solution_name: "iCIMS Onboard",
    description:
      "iCIMS's onboarding product inside the iCIMS Talent Cloud umbrella. Tightly coupled to iCIMS ATS for offer-accepted handoff; supports forms, e-sign, and tasks.",
    solution_url: "https://www.icims.com/products/onboarding/",
    vendor_id: vendorIdByName.get("iCIMS")!,
    solution_type: "saas",
    is_active_in_market: true,
    notes: "",
  },
  {
    solution_name: "SmartRecruiters Onboarding",
    description:
      "Onboarding module within the SmartRecruiters Hiring Success Platform. Bundled with the ATS rather than sold as a standalone pure-play product.",
    solution_url: "https://www.smartrecruiters.com",
    vendor_id: vendorIdByName.get("SmartRecruiters")!,
    solution_type: "saas",
    is_active_in_market: true,
    notes: "",
  },
];
const solMap = await syncByKey("/solutions", newSolutions, "solution_name");

// --- solution_domains links ---
// Build a map of solution_name -> id including existing solutions we need
const refSolutions = await get(
  "/solutions?solution_name=in.(Enboarder,Sapling,Workday%20Journeys,Workday%20HCM,BambooHR,HiBob,Rippling,iCIMS%20Talent%20Cloud)&select=id,solution_name",
);
const solIdByName = new Map<string, number>(solMap);
for (const r of refSolutions) solIdByName.set(String(r.solution_name), Number(r.id));

const solutionDomainLinks: { solution_name: string; coverage_level: "primary" | "secondary" | "partial"; notes?: string }[] = [
  // Primary — products dedicated to onboarding
  { solution_name: "Enboarder", coverage_level: "primary", notes: "Flagship onboarding product; pure-play vendor." },
  { solution_name: "Sapling", coverage_level: "primary", notes: "Kallidus's onboarding-focused product (originally pure-play, acquired by Kallidus 2021)." },
  { solution_name: "Workday Journeys", coverage_level: "primary", notes: "Workday's dedicated lifecycle/onboarding experiences product." },
  { solution_name: "Talmundo", coverage_level: "primary" },
  { solution_name: "Click Boarding", coverage_level: "primary" },
  { solution_name: "Appical", coverage_level: "primary" },
  { solution_name: "Greenhouse Onboarding", coverage_level: "primary" },
  { solution_name: "iCIMS Onboard", coverage_level: "primary" },
  { solution_name: "SmartRecruiters Onboarding", coverage_level: "primary" },
  // Secondary — bundled inside an HRIS/ATS suite, not the flagship use case
  { solution_name: "Workday HCM", coverage_level: "secondary", notes: "Hire business process includes onboarding tasks; Workday Journeys is the primary dedicated product." },
  { solution_name: "BambooHR", coverage_level: "secondary", notes: "Onboarding workflows bundled in the HRIS suite." },
  { solution_name: "HiBob", coverage_level: "secondary", notes: "Onboarding flows bundled in the HRIS suite." },
  { solution_name: "Rippling", coverage_level: "secondary", notes: "Onboarding bundled across HR, IT, and Finance modules." },
  { solution_name: "iCIMS Talent Cloud", coverage_level: "secondary", notes: "Umbrella platform; iCIMS Onboard is the dedicated onboarding module." },
];

// Idempotent insert keyed on (solution_id, domain_id)
const existingSD = await get(
  `/solution_domains?domain_id=eq.${ONBOARDING_ID}&select=solution_id&limit=10000`,
);
const existingSDSet = new Set(existingSD.map(r => Number(r.solution_id)));

const sdRows = solutionDomainLinks
  .filter(l => {
    const id = solIdByName.get(l.solution_name);
    if (!id) {
      console.warn(`  ! solution not found, skipping: ${l.solution_name}`);
      return false;
    }
    return !existingSDSet.has(id);
  })
  .map(l => ({
    solution_id: solIdByName.get(l.solution_name)!,
    domain_id: ONBOARDING_ID,
    coverage_level: l.coverage_level,
    notes: l.notes ?? "",
  }));

if (sdRows.length > 0) {
  console.log(`  /solution_domains: inserting ${sdRows.length} new ONBOARDING links`);
  await insertChunked("/solution_domains", sdRows);
} else {
  console.log(`  /solution_domains: all ONBOARDING links already present`);
}

// =============================================================================
// PHASE 2 — data_objects + domain_data_objects (role: master)
// =============================================================================
console.log("\n=== Phase 2: Onboarding data_objects ===");

const onboardingDataObjects = [
  {
    data_object_name: "onboarding_plans",
    singular_label: "Onboarding Plan",
    plural_label: "Onboarding Plans",
    display_label: "Onboarding Plan",
    description:
      "Reusable template defining the stages, tasks, timing, and assignees that make up an onboarding journey for a class of new hire (e.g. engineering, sales, executive, hourly retail, contractor). Plans are versioned and selected based on role / location / employment type when a journey is instantiated.",
  },
  {
    data_object_name: "onboarding_journeys",
    singular_label: "Onboarding Journey",
    plural_label: "Onboarding Journeys",
    display_label: "Onboarding Journey",
    description:
      "Instance of an onboarding plan applied to a specific new hire. Materialized when offer.accepted (ATS) or employee.created (HCM) fires. Carries the bound employee_id, assigned tasks, completion state, current stage, and milestone timestamps (pre-boarding start, Day-1 reached, 30/60/90 completion).",
  },
  {
    data_object_name: "onboarding_stages",
    singular_label: "Onboarding Stage",
    plural_label: "Onboarding Stages",
    display_label: "Onboarding Stage",
    description:
      "Phase within a plan or journey (pre-boarding, Day-1, week-1, month-1, 30/60/90 day). Defines task grouping, expected duration, and gate conditions. Stages can be sequenced or run in parallel.",
  },
  {
    data_object_name: "onboarding_tasks",
    singular_label: "Onboarding Task",
    plural_label: "Onboarding Tasks",
    display_label: "Onboarding Task",
    description:
      "Discrete to-do within a journey: sign I-9, attend orientation, complete compliance training, meet buddy, receive laptop. Carries assignee (new hire / manager / IT / facilities / HR), due date, completion state, evidence, and task type (form / training / meeting / provisioning / acknowledgement). Many tasks are local; a subset triggers cross-domain handoffs into ITSM, IWMS, Payroll, LMS, IGA, or HRSD.",
  },
  {
    data_object_name: "buddy_assignments",
    singular_label: "Buddy Assignment",
    plural_label: "Buddy Assignments",
    display_label: "Buddy Assignment",
    description:
      "Pairing of a new hire with an existing employee for the onboarding period — buddy, mentor, peer-coach, or sponsor depending on the program. Carries scope (peer / cross-functional), start and end dates, and meeting cadence.",
  },
  {
    data_object_name: "onboarding_cohorts",
    singular_label: "Onboarding Cohort",
    plural_label: "Onboarding Cohorts",
    display_label: "Onboarding Cohort",
    description:
      "Group of new hires onboarding together (campus intake class, training boot-camp batch, executive cohort, frontline class). Enables shared activities (group orientation, cohort meetings) and cohort-level analytics distinct from the per-journey view.",
  },
  {
    data_object_name: "welcome_communications",
    singular_label: "Welcome Communication",
    plural_label: "Welcome Communications",
    display_label: "Welcome Communication",
    description:
      "Email, video, push notification, or SMS sent to a new hire during the journey — pre-boarding nudges, Day-1 schedule, post-Day-1 check-ins, cohort announcements. Carries channel, template, scheduled send time, delivery state, and engagement metrics.",
  },
  {
    data_object_name: "onboarding_document_collections",
    singular_label: "Onboarding Document Collection",
    plural_label: "Onboarding Document Collections",
    display_label: "Onboarding Document Collection",
    description:
      "Record of paperwork collected from a new hire as part of the journey: I-9, NDA, handbook acknowledgement, direct-deposit form, country-specific tax forms, country-specific work-permit evidence. Captures signature state, provider-reference ids (DocuSign / Adobe Sign envelope ids), and audit metadata. Distinct from the canonical document templates, which would be mastered by a Document Management domain (not yet in catalog).",
  },
];
const dataObjMap = await syncByKey("/data_objects", onboardingDataObjects, "data_object_name");

// domain_data_objects (role: master)
const existingDDO = await get(
  `/domain_data_objects?domain_id=eq.${ONBOARDING_ID}&select=data_object_id&limit=10000`,
);
const existingDDOSet = new Set(existingDDO.map(r => Number(r.data_object_id)));

const ddoRows = onboardingDataObjects
  .map(o => dataObjMap.get(o.data_object_name)!)
  .filter(id => !existingDDOSet.has(id))
  .map(id => ({
    domain_id: ONBOARDING_ID,
    data_object_id: id,
    role: "master",
    notes: "",
  }));

if (ddoRows.length > 0) {
  console.log(`  /domain_data_objects: inserting ${ddoRows.length} new ONBOARDING-master links`);
  await insertChunked("/domain_data_objects", ddoRows);
} else {
  console.log(`  /domain_data_objects: all ONBOARDING links already present`);
}

// =============================================================================
// PHASE 3 — cross_domain_handoffs
// =============================================================================
console.log("\n=== Phase 3: cross_domain_handoffs around ONBOARDING ===");

function did(code: string): number {
  const id = domainIdByCode.get(code);
  if (!id) throw new Error(`domain ${code} not found — load it first`);
  return id;
}
function doid(name: string): number {
  const id = dataObjMap.get(name);
  if (!id) throw new Error(`data_object ${name} not found`);
  return id;
}

const handoffs = [
  // Inbound to ONBOARDING
  {
    source_domain_id: did("ATS"),
    target_domain_id: did("ONBOARDING"),
    data_object_id: doid("onboarding_journeys"),
    trigger_event: "offer.accepted",
    integration_pattern: "event_stream",
    friction_level: "high",
    description:
      "Candidate accepts offer in ATS; ATS publishes the offer-accepted event with offer details, position, hiring manager, location, start date. Onboarding instantiates a journey by selecting a plan based on role + location + employment type, materializes the task list, and notifies the new hire to begin pre-boarding. Failure modes: late offer-detail changes after journey instantiation (start date pushed, role re-leveled) require either journey re-materialization or manual reconciliation.",
    notes: "",
  },
  {
    source_domain_id: did("HCM"),
    target_domain_id: did("ONBOARDING"),
    data_object_id: doid("onboarding_journeys"),
    trigger_event: "employee.created",
    integration_pattern: "api_call",
    friction_level: "medium",
    description:
      "HCM creates the canonical employee record (typically on or near Day-1, or earlier for pre-boarding access). Onboarding binds the journey to the new employee_id so task ownership and reminders route to the right user portal. Lower friction when ATS and HCM are the same vendor (Workday, Rippling); higher when they're separate.",
    notes: "",
  },
  // Outbound from ONBOARDING
  {
    source_domain_id: did("ONBOARDING"),
    target_domain_id: did("ITSM"),
    data_object_id: doid("onboarding_tasks"),
    trigger_event: "task.it_provisioning_required",
    integration_pattern: "api_call",
    friction_level: "medium",
    description:
      "Onboarding emits the IT-provisioning task for a new hire (laptop, peripherals, baseline software access). ITSM creates the corresponding service request(s); ITSM masters the fulfillment work item. Failure modes: late role / location changes invalidate the original SR catalog selection; manual rework is common.",
    notes: "",
  },
  {
    source_domain_id: did("ONBOARDING"),
    target_domain_id: did("IGA"),
    data_object_id: doid("onboarding_tasks"),
    trigger_event: "task.access_provisioning_required",
    integration_pattern: "api_call",
    friction_level: "high",
    description:
      "Onboarding flags the access-provisioning task for a new hire. IGA orchestrates the role/entitlement assignment via birthright-access policies and triggers provisioning to downstream systems. High friction because role-to-entitlement mappings are commonly maintained manually per business unit and drift quickly.",
    notes: "",
  },
  {
    source_domain_id: did("ONBOARDING"),
    target_domain_id: did("IWMS"),
    data_object_id: doid("onboarding_tasks"),
    trigger_event: "task.workplace_setup_required",
    integration_pattern: "manual_handoff",
    friction_level: "high",
    description:
      "Onboarding flags physical-workplace tasks: badge issuance, desk allocation, parking, building access, ergonomic kit. IWMS systems are rarely event-driven; in practice the handoff is a ticket or an email to Facilities. High friction is the norm.",
    notes: "",
  },
  {
    source_domain_id: did("ONBOARDING"),
    target_domain_id: did("PAYROLL"),
    data_object_id: doid("onboarding_journeys"),
    trigger_event: "journey.day_one_reached",
    integration_pattern: "batch_sync",
    friction_level: "medium",
    description:
      "Day-1 milestone on the journey activates the new hire in Payroll. Direct-deposit, tax-withholding, and country-specific forms collected during the journey feed into Payroll's master record. Batch-sync because most payroll cycles run nightly; mid-cycle hires often require manual catch-up.",
    notes: "",
  },
  {
    source_domain_id: did("ONBOARDING"),
    target_domain_id: did("LMS"),
    data_object_id: doid("onboarding_tasks"),
    trigger_event: "task.compliance_training_required",
    integration_pattern: "api_call",
    friction_level: "medium",
    description:
      "Compliance training items (security awareness, anti-harassment, HIPAA, country-specific code-of-conduct, role-specific certifications) trigger LMS enrollments. LMS masters the enrollment record and completion certificate; Onboarding consumes the completion event to close out its task. Friction sits in keeping the training catalog mapped to roles/jurisdictions.",
    notes: "",
  },
  {
    source_domain_id: did("ONBOARDING"),
    target_domain_id: did("HRSD"),
    data_object_id: doid("onboarding_tasks"),
    trigger_event: "task.escalation_required",
    integration_pattern: "api_call",
    friction_level: "medium",
    description:
      "When an onboarding task is blocked, overdue, or contested (missing document, declined accommodation, pre-boarding question), an HR case is opened in HRSD. HRSD masters the case lifecycle; the case-resolution event flows back to unblock the task. Friction comes from inconsistent case-routing taxonomies between Onboarding and HRSD.",
    notes: "",
  },
];

// Idempotent: skip rows where (source, target, data_object, trigger_event) already exist
const existingHandoffs = await get(
  `/cross_domain_handoffs?target_domain_id=eq.${did("ONBOARDING")},source_domain_id=eq.${did("ONBOARDING")}&select=source_domain_id,target_domain_id,data_object_id,trigger_event&limit=10000`,
).catch(() => [] as Row[]);
// (the and/or syntax above won't work; just pull all handoffs touching ONBOARDING via two queries)
const inbound = await get(
  `/cross_domain_handoffs?target_domain_id=eq.${did("ONBOARDING")}&select=source_domain_id,target_domain_id,data_object_id,trigger_event`,
);
const outbound = await get(
  `/cross_domain_handoffs?source_domain_id=eq.${did("ONBOARDING")}&select=source_domain_id,target_domain_id,data_object_id,trigger_event`,
);
const existingHoSet = new Set(
  [...inbound, ...outbound].map(
    r => `${r.source_domain_id}|${r.target_domain_id}|${r.data_object_id}|${r.trigger_event}`,
  ),
);

const handoffsToInsert = handoffs.filter(
  h => !existingHoSet.has(`${h.source_domain_id}|${h.target_domain_id}|${h.data_object_id}|${h.trigger_event}`),
);

if (handoffsToInsert.length > 0) {
  console.log(`  /cross_domain_handoffs: inserting ${handoffsToInsert.length} new handoffs`);
  await insertChunked("/cross_domain_handoffs", handoffsToInsert);
} else {
  console.log(`  /cross_domain_handoffs: all ONBOARDING handoffs already present`);
}

// =============================================================================
// SUMMARY
// =============================================================================
console.log("\n=== Summary ===");
const domCount = (await get(`/domains?domain_code=eq.ONBOARDING&select=id`)).length;
const vendCount = (await get(`/vendors?vendor_name=in.(Talmundo,Click%20Boarding,Appical)&select=id`)).length;
const solCount = (await get(`/solutions?solution_name=in.(Talmundo,Click%20Boarding,Appical,Greenhouse%20Onboarding,iCIMS%20Onboard,SmartRecruiters%20Onboarding)&select=id`)).length;
const sdCount = (await get(`/solution_domains?domain_id=eq.${ONBOARDING_ID}&select=id`)).length;
const doCount = (await get(`/data_objects?data_object_name=in.(${onboardingDataObjects.map(o => o.data_object_name).join(",")})&select=id`)).length;
const ddoCount = (await get(`/domain_data_objects?domain_id=eq.${ONBOARDING_ID}&select=id`)).length;
const hoIn = (await get(`/cross_domain_handoffs?target_domain_id=eq.${ONBOARDING_ID}&select=id`)).length;
const hoOut = (await get(`/cross_domain_handoffs?source_domain_id=eq.${ONBOARDING_ID}&select=id`)).length;

console.log(`  ONBOARDING domain row:           ${domCount}/1`);
console.log(`  new vendors (3 pure-plays):      ${vendCount}/3`);
console.log(`  new solutions:                   ${solCount}/6`);
console.log(`  solution_domains on ONBOARDING:  ${sdCount}/14`);
console.log(`  data_objects (onboarding_*):     ${doCount}/8`);
console.log(`  domain_data_objects (master):    ${ddoCount}/8`);
console.log(`  inbound handoffs to ONBOARDING:  ${hoIn}/2`);
console.log(`  outbound handoffs from ONBOARDING: ${hoOut}/6`);

console.log("\nUI:");
console.log("  https://tests.semantius.app/domain_map/domains");
console.log("  https://tests.semantius.app/domain_map/solutions");
console.log("  https://tests.semantius.app/domain_map/solution_domains");
console.log("  https://tests.semantius.app/domain_map/data_objects");
console.log("  https://tests.semantius.app/domain_map/domain_data_objects");
console.log("  https://tests.semantius.app/domain_map/cross_domain_handoffs");
