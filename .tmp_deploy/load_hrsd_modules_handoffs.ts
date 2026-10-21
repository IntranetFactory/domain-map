// HRSD audit fix (2026-05-24): Phase M + B9 + B9b + B10b.
// Domain: HR Service Delivery (id 22).
//
// Scope (per agent brief):
//   - M1-M4, M6: create 3 modules, link 4 capabilities, link 5 data_objects,
//     populate domain_starter_modules.
//   - M5: N/A (no lifecycle_states rows exist for hr_cases / case_categories).
//   - B9: author new trigger_events + outbound handoffs to PAYROLL, BEN-ADMIN, KMS, LMS.
//   - B9b: 3 intra-domain cross-module handoffs (portal->case-mgmt, case->knowledge x2).
//   - B10b: PATCH source_domain_module_id / target_domain_module_id on existing handoffs
//           where a HRSD module owns the payload.
// Idempotent. Run from project root:
//   bun run "c:/dev/domain-map/.tmp_deploy/load_hrsd_modules_handoffs.ts"

type Json = unknown;

const DOMAIN_ID = 22; // HRSD

async function pg(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: Json): Promise<any> {
  const args: Record<string, unknown> = { method, path };
  if (body !== undefined) args.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(args)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) {
    throw new Error(`pg ${method} ${path} failed (${code}): ${err || out}`);
  }
  const trimmed = out.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed);
}

// ---------------- em-dash / English sanity pre-flight ----------------

function assertNoEmDash(label: string, s: string) {
  if (s.includes("—")) {
    throw new Error(`em-dash found in ${label}: ${s}`);
  }
}

// ---------------- helpers ----------------

async function ensureModule(code: string, name: string, description: string): Promise<number> {
  assertNoEmDash(`module ${code} description`, description);
  const existing = await pg("GET", `/domain_modules?domain_module_code=eq.${encodeURIComponent(code)}&select=id`);
  if (existing && existing.length) return existing[0].id;
  await pg("POST", "/domain_modules", [
    { domain_module_code: code, domain_module_name: name, description, domain_id: DOMAIN_ID },
  ]);
  const reread = await pg("GET", `/domain_modules?domain_module_code=eq.${encodeURIComponent(code)}&select=id`);
  return reread[0].id;
}

async function ensureModuleCapability(moduleId: number, capabilityId: number, notes: string): Promise<void> {
  assertNoEmDash(`module-cap ${moduleId}/${capabilityId} notes`, notes);
  const existing = await pg(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=eq.${capabilityId}&select=id`,
  );
  if (existing && existing.length) return;
  await pg("POST", "/domain_module_capabilities", [
    { domain_module_id: moduleId, capability_id: capabilityId, notes },
  ]);
}

type Role = "master" | "embedded_master" | "contributor" | "consumer" | "derived";
type Necessity = "required" | "optional";

async function ensureModuleDataObject(
  moduleId: number,
  dataObjectId: number,
  role: Role,
  necessity: Necessity,
  notes: string,
): Promise<void> {
  assertNoEmDash(`mdo ${moduleId}/${dataObjectId} notes`, notes);
  const existing = await pg(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=eq.${dataObjectId}&select=id`,
  );
  if (existing && existing.length) return;
  await pg("POST", "/domain_module_data_objects", [
    { domain_module_id: moduleId, data_object_id: dataObjectId, role, necessity, notes },
  ]);
}

async function ensureStarter(moduleId: number, position: number, notes: string): Promise<void> {
  assertNoEmDash(`starter ${moduleId} notes`, notes);
  const existing = await pg(
    "GET",
    `/domain_starter_modules?domain_id=eq.${DOMAIN_ID}&domain_module_id=eq.${moduleId}&select=id`,
  );
  if (existing && existing.length) return;
  await pg("POST", "/domain_starter_modules", [
    { domain_id: DOMAIN_ID, domain_module_id: moduleId, position, notes },
  ]);
}

async function ensureTriggerEvent(
  eventName: string,
  dataObjectId: number,
  eventCategory: string,
  fromState: string,
  toState: string,
  description: string,
): Promise<number> {
  assertNoEmDash(`trigger ${eventName} description`, description);
  const existing = await pg(
    "GET",
    `/trigger_events?event_name=eq.${encodeURIComponent(eventName)}&data_object_id=eq.${dataObjectId}&select=id`,
  );
  if (existing && existing.length) return existing[0].id;
  await pg("POST", "/trigger_events", [
    {
      event_name: eventName,
      data_object_id: dataObjectId,
      event_category: eventCategory,
      from_state: fromState,
      to_state: toState,
      description,
    },
  ]);
  const reread = await pg(
    "GET",
    `/trigger_events?event_name=eq.${encodeURIComponent(eventName)}&data_object_id=eq.${dataObjectId}&select=id`,
  );
  return reread[0].id;
}

type HandoffSpec = {
  source_domain_id: number;
  target_domain_id: number;
  data_object_id: number;
  trigger_event_id: number;
  source_domain_module_id: number | null;
  target_domain_module_id: number | null;
  integration_pattern: string;
  friction_level: string;
  description: string;
  notes: string;
};

async function ensureHandoff(h: HandoffSpec): Promise<void> {
  assertNoEmDash(`handoff description`, h.description);
  assertNoEmDash(`handoff notes`, h.notes);
  // Natural key for handoffs: (source, target, trigger_event_id, data_object_id).
  const existing = await pg(
    "GET",
    `/handoffs?source_domain_id=eq.${h.source_domain_id}&target_domain_id=eq.${h.target_domain_id}&trigger_event_id=eq.${h.trigger_event_id}&data_object_id=eq.${h.data_object_id}&select=id`,
  );
  if (existing && existing.length) {
    return;
  }
  await pg("POST", "/handoffs", [h]);
}

async function patchHandoff(id: number, body: Record<string, unknown>): Promise<void> {
  await pg("PATCH", `/handoffs?id=eq.${id}`, body);
}

// ---------------- Module specs ----------------

const CASE_MGMT_DESC =
  "Core HR case management surface: HR cases, case taxonomy, triage, approval routing, and AI-assisted classification. Masters hr_cases and case_categories. The execution backbone every HRSD vendor (ServiceNow HRSD, Workday Help, Salesforce Employee Service, AppDynamics) anchors on.";
const PORTAL_DESC =
  "Employee self-service intake surface: catalog browse, request submission, knowledge search, and case status. Workflow layer on top of HRSD-CASE-MGMT, no masters of its own. Hands intake off to case-mgmt and can route IT-flavored requests through to ITSM.";
const KNOWLEDGE_DESC =
  "HR knowledge surface: HR-audience articles, FAQs, and policy explainers. Consumes the cross-cutting knowledge_articles entity (mastered by ITSM/KMS) and feeds back authoring suggestions when cases are resolved.";

const MODULES = [
  { code: "HRSD-CASE-MGMT", name: "HR Case Management", description: CASE_MGMT_DESC },
  { code: "HRSD-EMPLOYEE-PORTAL", name: "Employee Self-Service Portal", description: PORTAL_DESC },
  { code: "HRSD-KNOWLEDGE", name: "HR Knowledge", description: KNOWLEDGE_DESC },
];

// capability ids (HRSD)
const CAP = {
  KNOWLEDGE_MGMT: 187,
  AI_TRIAGE: 193,
  SELF_SERVICE: 188,
  APPROVAL_WORKFLOW: 311,
};

// data_object ids (HRSD-relevant)
const DO = {
  hr_cases: 192,
  case_categories: 193,
  service_requests: 48,
  knowledge_articles: 51,
  employees: 31,
};

// downstream / upstream domain ids
const D = {
  HRSD: 22,
  ITSM: 1,
  HCM: 54,
  IGA: 35,
  ATS: 56,
  KMS: 33,
  PAYROLL: 55,
  BEN_ADMIN: 61,
  LMS: 57,
  WFM: 59,
  ONBOARDING: 99,
  GRC: 15,
};

// ---------------- Phase M ----------------

async function loadModules(): Promise<Record<string, number>> {
  const ids: Record<string, number> = {};
  for (const m of MODULES) {
    ids[m.code] = await ensureModule(m.code, m.name, m.description);
    console.log(`module ${m.code} -> id ${ids[m.code]}`);
  }
  return ids;
}

async function loadModuleCapabilities(ids: Record<string, number>): Promise<void> {
  const CASE = ids["HRSD-CASE-MGMT"];
  const PORTAL = ids["HRSD-EMPLOYEE-PORTAL"];
  const KNOW = ids["HRSD-KNOWLEDGE"];
  const rows: Array<[number, number, string]> = [
    [CASE, CAP.AI_TRIAGE, "Predictive case categorisation, priority scoring, suggested-response drafting, and auto-routing on incoming HR cases."],
    [CASE, CAP.APPROVAL_WORKFLOW, "Approval chains for HR case actions: leave approvals, exception requests, sensitive disclosures, manager sign-offs."],
    [PORTAL, CAP.SELF_SERVICE, "Employee-facing intake portal: catalog browse, request submission, status tracking, knowledge search across HR content."],
    [KNOW, CAP.KNOWLEDGE_MGMT, "HR-audience article lifecycle: draft, review, publish, retire. Deflection-rate analytics back into the portal."],
  ];
  for (const [m, c, n] of rows) await ensureModuleCapability(m, c, n);
  console.log(`module-capabilities: ${rows.length} ensured`);
}

async function loadModuleDataObjects(ids: Record<string, number>): Promise<void> {
  const CASE = ids["HRSD-CASE-MGMT"];
  const PORTAL = ids["HRSD-EMPLOYEE-PORTAL"];
  const KNOW = ids["HRSD-KNOWLEDGE"];
  type Row = [number, number, Role, Necessity, string];
  const rows: Row[] = [
    // HRSD-CASE-MGMT
    [CASE, DO.hr_cases, "master", "required", "Canonical HR case record: ticket id, category, priority, status, assignment, audit trail."],
    [CASE, DO.case_categories, "master", "required", "HR case taxonomy used for routing, SLAs, and knowledge mapping."],
    [CASE, DO.employees, "consumer", "required", "Reads worker record to drive case context, manager chain, and routing rules."],
    [CASE, DO.knowledge_articles, "consumer", "optional", "Reads HR knowledge in the agent cockpit for resolution assistance."],

    // HRSD-EMPLOYEE-PORTAL
    [PORTAL, DO.service_requests, "consumer", "required", "Catalog of intake forms; IT-flavored requests submitted in the HR portal can route through to ITSM."],
    [PORTAL, DO.hr_cases, "consumer", "required", "Reads cases the employee owns or follows for status visibility."],
    [PORTAL, DO.knowledge_articles, "consumer", "required", "End-user search across HR knowledge for deflection before case creation."],
    [PORTAL, DO.employees, "consumer", "required", "Reads worker record to drive portal personalization, manager actions, and entitlement."],

    // HRSD-KNOWLEDGE
    [KNOW, DO.knowledge_articles, "consumer", "required", "HR slice of the cross-cutting knowledge_articles entity (mastered by ITSM/KMS); HR authors maintain the HR audience."],
    [KNOW, DO.case_categories, "consumer", "optional", "Reads taxonomy to keep knowledge categorisation aligned with case routing."],
  ];
  for (const [m, d, r, n, notes] of rows) await ensureModuleDataObject(m, d, r, n, notes);
  console.log(`module-data_objects: ${rows.length} ensured`);
}

async function loadStarterModules(ids: Record<string, number>): Promise<void> {
  await ensureStarter(
    ids["HRSD-CASE-MGMT"],
    1,
    "Start here. The case record, taxonomy, triage, and approval routing are the execution backbone of every HRSD product. ServiceNow HRSD, Workday Help, Salesforce Employee Service all anchor on this.",
  );
  await ensureStarter(
    ids["HRSD-EMPLOYEE-PORTAL"],
    2,
    "Add the self-service portal once case-mgmt is operational. Catalog intake plus knowledge search drive deflection and reduce HR-agent load.",
  );
  await ensureStarter(
    ids["HRSD-KNOWLEDGE"],
    3,
    "HR-audience knowledge management. Folds into the portal for deflection and into the case cockpit for agent assist; depends on a working case loop to harvest improvement signals.",
  );
  console.log("starter-modules: 3 ensured");
}

// ---------------- B9 + B9b: trigger_events + handoffs ----------------

async function loadTriggerEventsAndHandoffs(ids: Record<string, number>): Promise<void> {
  const CASE = ids["HRSD-CASE-MGMT"];
  const PORTAL = ids["HRSD-EMPLOYEE-PORTAL"];
  const KNOW = ids["HRSD-KNOWLEDGE"];

  // ---- New trigger_events on hr_cases (192) ----
  const teResolved = await ensureTriggerEvent(
    "hr_case.resolved",
    DO.hr_cases,
    "lifecycle",
    "open",
    "resolved",
    "HR case is resolved and closed by the HR agent. Downstream consumers (knowledge authoring, learning analytics, audit) react to the closure signal.",
  );
  const teEscPayroll = await ensureTriggerEvent(
    "hr_case.escalated_to_payroll",
    DO.hr_cases,
    "state_change",
    "",
    "escalated",
    "HR case requires Payroll Operations follow-up (off-cycle pay, W-2 reissue, garnishment question). Routes the case to PAYROLL.",
  );
  const teEscBenefits = await ensureTriggerEvent(
    "hr_case.escalated_to_benefits",
    DO.hr_cases,
    "state_change",
    "",
    "escalated",
    "HR case requires Benefits Administration follow-up (enrollment, qualifying-event update, carrier dispute). Routes the case to BEN-ADMIN.",
  );
  const teIntake = await ensureTriggerEvent(
    "hr_case.intake_submitted",
    DO.hr_cases,
    "lifecycle",
    "",
    "submitted",
    "Employee submits an HR request via the self-service portal. Case-mgmt picks it up, applies AI triage, and starts the case lifecycle.",
  );

  console.log(`trigger_events new: resolved=${teResolved} esc_payroll=${teEscPayroll} esc_benefits=${teEscBenefits} intake=${teIntake}`);

  // ---- B9 outbound new handoffs ----
  const outboundB9: HandoffSpec[] = [
    {
      source_domain_id: D.HRSD,
      target_domain_id: D.PAYROLL,
      data_object_id: DO.hr_cases,
      trigger_event_id: teEscPayroll,
      source_domain_module_id: CASE,
      target_domain_module_id: null,
      integration_pattern: "api_call",
      friction_level: "medium",
      description: "HR-case escalation to Payroll Operations. Payroll-related HR cases (off-cycle pay, W-2 reissue, garnishment questions) require Payroll Ops to take the next action; medium friction because PAYROLL and HRSD are usually different vendor stacks (Workday HRSD + ADP Payroll, etc.).",
      notes: "",
    },
    {
      source_domain_id: D.HRSD,
      target_domain_id: D.BEN_ADMIN,
      data_object_id: DO.hr_cases,
      trigger_event_id: teEscBenefits,
      source_domain_module_id: CASE,
      target_domain_module_id: null,
      integration_pattern: "api_call",
      friction_level: "medium",
      description: "HR-case escalation to Benefits Administration. Benefits enrollment, qualifying-event updates, and carrier disputes route to BEN-ADMIN. Medium friction: vendor split is common (HRSD vs. dedicated BEN-ADMIN like Empyrean or bswift).",
      notes: "",
    },
    {
      source_domain_id: D.HRSD,
      target_domain_id: D.KMS,
      data_object_id: DO.hr_cases,
      trigger_event_id: teResolved,
      source_domain_module_id: CASE,
      target_domain_module_id: null,
      integration_pattern: "event_stream",
      friction_level: "low",
      description: "Case resolution feeds the knowledge-base authoring loop: KMS receives resolution signal to suggest new articles, update existing ones, or improve deflection.",
      notes: "",
    },
    {
      source_domain_id: D.HRSD,
      target_domain_id: D.LMS,
      data_object_id: DO.case_categories,
      trigger_event_id: 454, // existing case_category.updated
      source_domain_module_id: CASE,
      target_domain_module_id: null,
      integration_pattern: "event_stream",
      friction_level: "low",
      description: "Case taxonomy update propagates to LMS so compliance-assignment categories and HR-case categories stay aligned for training-targeting and remediation-routing logic.",
      notes: "",
    },
  ];
  for (const h of outboundB9) await ensureHandoff(h);
  console.log(`outbound B9 handoffs: ${outboundB9.length} ensured`);

  // ---- B9b intra-domain cross-module ----
  const intraB9b: HandoffSpec[] = [
    {
      source_domain_id: D.HRSD,
      target_domain_id: D.HRSD,
      data_object_id: DO.hr_cases,
      trigger_event_id: teIntake,
      source_domain_module_id: PORTAL,
      target_domain_module_id: CASE,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      description: "Portal intake submission progresses into the case-management workflow. In-process state transition, same vendor stack, no message moves.",
      notes: "",
    },
    {
      source_domain_id: D.HRSD,
      target_domain_id: D.HRSD,
      data_object_id: DO.hr_cases,
      trigger_event_id: teResolved,
      source_domain_module_id: CASE,
      target_domain_module_id: KNOW,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      description: "Case resolution feeds the HR-knowledge improvement loop. Resolution notes and root-cause tags drive article authoring and refinement.",
      notes: "",
    },
    {
      source_domain_id: D.HRSD,
      target_domain_id: D.HRSD,
      data_object_id: DO.case_categories,
      trigger_event_id: 454,
      source_domain_module_id: CASE,
      target_domain_module_id: KNOW,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      description: "Case taxonomy updates re-categorise the HR knowledge base so deflection and agent-assist suggestions stay aligned with the routing model.",
      notes: "",
    },
  ];
  for (const h of intraB9b) await ensureHandoff(h);
  console.log(`intra-domain B9b handoffs: ${intraB9b.length} ensured`);
}

// ---------------- B10b backfill ----------------

async function backfillHandoffModules(ids: Record<string, number>): Promise<void> {
  const CASE = ids["HRSD-CASE-MGMT"];
  const PORTAL = ids["HRSD-EMPLOYEE-PORTAL"];
  const KNOW = ids["HRSD-KNOWLEDGE"];

  // payload data_object -> HRSD module (strongest-role wins).
  const dataObjectToModule: Record<number, number> = {
    [DO.hr_cases]: CASE,
    [DO.case_categories]: CASE,
    [DO.service_requests]: PORTAL,
    [DO.knowledge_articles]: KNOW,
    [DO.employees]: CASE,
  };

  // Outbound (source = HRSD): set source_domain_module_id.
  // For outbound, the source module is derived from trigger_events.data_object_id
  // (event's publishing data_object), which equals the payload here for current rows.
  const outbound = await pg(
    "GET",
    `/handoffs?source_domain_id=eq.${DOMAIN_ID}&source_domain_module_id=is.null&select=id,data_object_id,trigger_event_id,trigger_events(data_object_id,event_name)`,
  );
  let outPatched = 0;
  let outNullNoted = 0;
  for (const h of outbound || []) {
    const eventDoId = h.trigger_events?.data_object_id ?? h.data_object_id;
    const modId = dataObjectToModule[eventDoId];
    if (modId) {
      await patchHandoff(h.id, { source_domain_module_id: modId });
      outPatched++;
    } else {
      await patchHandoff(h.id, {
        notes: `B10b: no HRSD module masters event data_object ${eventDoId} (${h.trigger_events?.event_name ?? "?"}); left NULL pending taxonomy review`,
      });
      outNullNoted++;
    }
  }
  console.log(`outbound B10b: ${outPatched} patched, ${outNullNoted} left null with notes`);

  // Inbound (target = HRSD): set target_domain_module_id from payload data_object.
  const inbound = await pg(
    "GET",
    `/handoffs?target_domain_id=eq.${DOMAIN_ID}&target_domain_module_id=is.null&select=id,data_object_id,trigger_events(event_name)`,
  );
  let inPatched = 0;
  let inNullNoted = 0;
  for (const h of inbound || []) {
    const modId = dataObjectToModule[h.data_object_id];
    if (modId) {
      await patchHandoff(h.id, { target_domain_module_id: modId });
      inPatched++;
    } else {
      await patchHandoff(h.id, {
        notes: `B10b: payload data_object ${h.data_object_id} (${h.trigger_events?.event_name ?? "?"}) is not held by any HRSD module; left NULL pending taxonomy review`,
      });
      inNullNoted++;
    }
  }
  console.log(`inbound B10b: ${inPatched} patched, ${inNullNoted} left null with notes`);
}

// ---------------- Post-load verification ----------------

async function verify(ids: Record<string, number>): Promise<void> {
  console.log("\n=== verification ===");

  const modules = await pg("GET", `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`);
  console.log(`modules: ${modules.length} -> ${modules.map((m: any) => m.domain_module_code).join(", ")}`);

  const mc = await pg("GET", `/domain_module_capabilities?domain_module_id=in.(${Object.values(ids).join(",")})&select=domain_module_id,capability_id`);
  console.log(`module-capabilities: ${mc.length}`);

  const mdo = await pg("GET", `/domain_module_data_objects?domain_module_id=in.(${Object.values(ids).join(",")})&select=domain_module_id,data_object_id,role`);
  console.log(`module-data_objects: ${mdo.length}`);

  const starters = await pg("GET", `/domain_starter_modules?domain_id=eq.${DOMAIN_ID}&select=domain_module_id,position`);
  console.log(`starter-modules: ${starters.length}`);

  const handoffs = await pg(
    "GET",
    `/handoffs?or=(source_domain_id.eq.${DOMAIN_ID},target_domain_id.eq.${DOMAIN_ID})&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id`,
  );
  const outbound = handoffs.filter((h: any) => h.source_domain_id === DOMAIN_ID);
  const inbound = handoffs.filter((h: any) => h.target_domain_id === DOMAIN_ID && h.source_domain_id !== DOMAIN_ID);
  const intra = handoffs.filter((h: any) => h.source_domain_id === DOMAIN_ID && h.target_domain_id === DOMAIN_ID);
  const outboundNullSrc = outbound.filter((h: any) => h.source_domain_module_id === null).length;
  const inboundNullTgt = inbound.filter((h: any) => h.target_domain_module_id === null).length;
  console.log(`handoffs: ${handoffs.length} total = ${outbound.length} out (incl. ${intra.length} intra) + ${inbound.length} in`);
  console.log(`  outbound NULL source_module: ${outboundNullSrc}`);
  console.log(`  inbound  NULL target_module: ${inboundNullTgt}`);
}

// ---------------- main ----------------

async function main() {
  console.log("=== HRSD audit fix: Phase M + B9 + B9b + B10b ===\n");

  console.log("--- Phase M ---");
  const ids = await loadModules();
  await loadModuleCapabilities(ids);
  await loadModuleDataObjects(ids);
  await loadStarterModules(ids);

  console.log("\n--- B9 + B9b: trigger_events + handoffs ---");
  await loadTriggerEventsAndHandoffs(ids);

  console.log("\n--- B10b: handoff module backfill ---");
  await backfillHandoffModules(ids);

  await verify(ids);

  console.log("\nHRSD load complete.");
  console.log("UI:");
  console.log("  https://tests.semantius.app/domain_map/domain_modules");
  console.log("  https://tests.semantius.app/domain_map/handoffs");
}

await main();
