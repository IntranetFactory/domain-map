#!/usr/bin/env bun
/**
 * Load PSA (domain id=68) modules + handoffs.
 *
 * Phase M: 4 domain_modules + capability links + module_data_objects + 3 starter modules
 *          + M5 lifecycle PATCH (revenue_recognition_records.recognized -> PROJECT-FINANCIALS)
 *
 * Handoffs:
 *   B9  outbound new rows (PSA -> ERP-FIN cost posting, PSA -> CRM project completed, PSA -> PA utilization)
 *   B9b intra-domain cross-module (5 rows)
 *   B10b backfill source/target module FKs on existing PSA handoffs
 *
 * Idempotent: every insert is preceded by a natural-key read. Re-runs are free.
 * Run from project root:  bun run "c:/dev/domain-map/.tmp_deploy/load_psa_modules_handoffs.ts"
 */

type Row = Record<string, any>;

async function call(body: Row): Promise<any> {
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
  if (exitCode !== 0) {
    const err = (stderr.trim() || stdout.trim()).toString();
    if (err.includes("JWT") || err.includes("aud") || err.includes("tenant://")) {
      throw new Error(`JWT/audience error: ${err}`);
    }
    throw new Error(`semantius failed (exit ${exitCode}): ${err}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

const get = (path: string) => call({ method: "GET", path });
const post = (path: string, rows: Row[]) => call({ method: "POST", path, body: rows });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });

function assertNoEmDash(s: string, ctx: string): void {
  if (s.includes("—")) throw new Error(`em-dash in ${ctx}: ${s}`);
}

async function insertChunked(path: string, rows: Row[]): Promise<any[]> {
  if (rows.length === 0) return [];
  for (const r of rows) {
    for (const [k, v] of Object.entries(r)) {
      if (typeof v === "string") assertNoEmDash(v, `${path}.${k}`);
    }
  }
  const CHUNK = 50;
  const out: any[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const result = await post(path, rows.slice(i, i + CHUNK));
    if (Array.isArray(result)) out.push(...result);
  }
  return out;
}

// ---- constants ----
const PSA = 68;
const D = { PSA: 68, CRM: 69, ERP_FIN: 65, PA: 63, SWP: 100, HCM: 54, WORK_MGMT: 135, CLM: 26, EXPENSE: 67, WFM: 59, VMS: 64, AGENCY: 153, ATS: 56 };
const OBJ = {
  service_projects: 216,
  project_tasks: 217,
  project_assignments: 218,
  project_billing_milestones: 219,
  resource_skill_inventories: 725,
  project_resource_allocations: 726,
  revenue_recognition_records: 109,
  time_entries: 162,
  expense_reports: 210,
  employees: 31,
  job_profiles: 33,
  crm_opportunities: 100,
  legal_contracts: 66,
  work_projects: 244,
};
const CAP = {
  RESOURCE_PLAN: 77,
  PROJECT_ACCT: 78,
  TIME_EXPENSE_PROJ: 79,
  BILLING_PROJ: 80,
  UTILIZATION: 81,
  PROJ_PORTFOLIO: 244,
  ENGAGE_CPQ: 245,
  REVENUE_RECOG: 65,
  SLA_MGMT: 185,
  TIME_TRACKING: 30,
};

interface ModuleSpec {
  code: string;
  name: string;
  description: string;
  capabilities: number[];
  data_objects: { id: number; role: string; necessity: string; notes?: string }[];
}

const MODULES: ModuleSpec[] = [
  {
    code: "PSA-PROJECT-DELIVERY",
    name: "Project Delivery",
    description: "Engagement scoping, project structure, tasks, milestones, deliverables, SLAs. The master of service_projects and project_tasks; consumes opportunities, contracts, and external work projects to ground the engagement.",
    capabilities: [CAP.PROJ_PORTFOLIO, CAP.ENGAGE_CPQ, CAP.SLA_MGMT],
    data_objects: [
      { id: OBJ.service_projects, role: "master", necessity: "required" },
      { id: OBJ.project_tasks, role: "master", necessity: "required" },
      { id: OBJ.crm_opportunities, role: "consumer", necessity: "required", notes: "Closed-won opportunity converts to engagement scope." },
      { id: OBJ.legal_contracts, role: "consumer", necessity: "required", notes: "MSA / SOW grounds engagement terms." },
      { id: OBJ.work_projects, role: "consumer", necessity: "optional", notes: "External work-mgmt projects feed delivery state when used as parallel execution surface." },
      { id: OBJ.employees, role: "consumer", necessity: "required" },
      { id: OBJ.job_profiles, role: "consumer", necessity: "required" },
    ],
  },
  {
    code: "PSA-RESOURCE-MGMT",
    name: "Resource Management",
    description: "Resource pool, skills, demand-supply matching, project assignments and resource allocations, utilization forecasting. Masters project_assignments, resource_skill_inventories, project_resource_allocations.",
    capabilities: [CAP.RESOURCE_PLAN, CAP.UTILIZATION],
    data_objects: [
      { id: OBJ.project_assignments, role: "master", necessity: "required" },
      { id: OBJ.resource_skill_inventories, role: "master", necessity: "required" },
      { id: OBJ.project_resource_allocations, role: "master", necessity: "required" },
      { id: OBJ.employees, role: "consumer", necessity: "required" },
      { id: OBJ.job_profiles, role: "consumer", necessity: "required" },
    ],
  },
  {
    code: "PSA-TIME-EXPENSE",
    name: "Time and Expense",
    description: "Timesheet capture, expense reporting, approval workflows for project work. Consumes time_entries and expense_reports owned by WFM and EXPENSE respectively; produces approved data for billing and cost posting.",
    capabilities: [CAP.TIME_EXPENSE_PROJ, CAP.TIME_TRACKING],
    data_objects: [
      { id: OBJ.time_entries, role: "consumer", necessity: "required", notes: "Captured against project_tasks; PSA approves before billing or cost posting." },
      { id: OBJ.expense_reports, role: "consumer", necessity: "required", notes: "Project-coded expense reports flow through PSA for billable / reimbursable classification." },
    ],
  },
  {
    code: "PSA-PROJECT-FINANCIALS",
    name: "Project Financials",
    description: "Project budgets, billing-rate cards, invoice generation against milestones and time, revenue recognition tied to performance obligations. Masters project_billing_milestones; contributes to revenue_recognition_records ahead of the ERP GL post.",
    capabilities: [CAP.PROJECT_ACCT, CAP.BILLING_PROJ, CAP.REVENUE_RECOG],
    data_objects: [
      { id: OBJ.project_billing_milestones, role: "master", necessity: "required" },
      { id: OBJ.revenue_recognition_records, role: "contributor", necessity: "required", notes: "PSA produces milestone-driven recognition events; ERP-FIN finalizes the GL post." },
    ],
  },
];

const STARTER_MODULES = [
  { code: "PSA-PROJECT-DELIVERY", position: 1, notes: "Engagements are the backbone of PSA, start here. Provides service_projects, project_tasks, the cross-vendor consumer links from CRM/CLM." },
  { code: "PSA-RESOURCE-MGMT", position: 2, notes: "Resource pool and assignments. Layer once delivery exists to enable staffing and utilization." },
  { code: "PSA-TIME-EXPENSE", position: 3, notes: "Capture mechanism feeding both delivery progress and finance." },
];

interface TriggerEventSpec {
  event_name: string;
  data_object_id: number;
  event_category: string;
  from_state?: string;
  to_state?: string;
  description: string;
}

const NEW_EVENTS: TriggerEventSpec[] = [
  {
    event_name: "service_project.completed",
    data_object_id: OBJ.service_projects,
    event_category: "lifecycle",
    from_state: "active",
    to_state: "completed",
    description: "Fired when an engagement is delivery-complete. CRM and account-team systems react; PSA financials closes out residual billing.",
  },
];

interface HandoffSpec {
  source_domain_id: number;
  target_domain_id: number;
  data_object_id: number;
  trigger_event_name: string; // resolved at run time
  source_module_code?: string;
  target_module_code?: string;
  integration_pattern: string;
  friction_level: string;
  description: string;
  notes?: string;
  handoff_label: string;
}

const NEW_OUTBOUND_HANDOFFS: HandoffSpec[] = [
  {
    source_domain_id: D.PSA,
    target_domain_id: D.ERP_FIN,
    data_object_id: OBJ.time_entries,
    trigger_event_name: "time_entry.approved",
    source_module_code: "PSA-TIME-EXPENSE",
    integration_pattern: "event_stream",
    friction_level: "low",
    description: "Approved project time hours post as cost to the project GL account in ERP-FIN.",
    handoff_label: "Professional Services Automation -> Core ERP Financial Management : time_entry.approved",
  },
  {
    source_domain_id: D.PSA,
    target_domain_id: D.ERP_FIN,
    data_object_id: OBJ.expense_reports,
    trigger_event_name: "expense.approved",
    source_module_code: "PSA-TIME-EXPENSE",
    integration_pattern: "event_stream",
    friction_level: "low",
    description: "Approved project expenses post as cost to the project GL account in ERP-FIN.",
    handoff_label: "Professional Services Automation -> Core ERP Financial Management : expense.approved",
  },
  {
    source_domain_id: D.PSA,
    target_domain_id: D.CRM,
    data_object_id: OBJ.service_projects,
    trigger_event_name: "service_project.completed",
    source_module_code: "PSA-PROJECT-DELIVERY",
    integration_pattern: "api_call",
    friction_level: "low",
    description: "Engagement completion notifies the account team so success milestones, references, and renewal motions can be triggered.",
    handoff_label: "Professional Services Automation -> Customer Relationship Management : service_project.completed",
  },
  {
    source_domain_id: D.PSA,
    target_domain_id: D.PA,
    data_object_id: OBJ.project_assignments,
    trigger_event_name: "project_assignment.utilization_low",
    source_module_code: "PSA-RESOURCE-MGMT",
    integration_pattern: "event_stream",
    friction_level: "medium",
    description: "Below-target utilization on confirmed assignments feeds people analytics for bench reporting and intervention.",
    handoff_label: "Professional Services Automation -> People Analytics : project_assignment.utilization_low",
  },
];

const NEW_INTRA_HANDOFFS: HandoffSpec[] = [
  {
    source_domain_id: D.PSA,
    target_domain_id: D.PSA,
    data_object_id: OBJ.project_assignments,
    trigger_event_name: "project_assignment.confirmed",
    source_module_code: "PSA-RESOURCE-MGMT",
    target_module_code: "PSA-PROJECT-DELIVERY",
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "Confirmed staffing transitions the engagement to a deliverable state inside PSA project delivery.",
    handoff_label: "PSA intra : resource-mgmt -> project-delivery : project_assignment.confirmed",
  },
  {
    source_domain_id: D.PSA,
    target_domain_id: D.PSA,
    data_object_id: OBJ.time_entries,
    trigger_event_name: "time_entry.approved",
    source_module_code: "PSA-TIME-EXPENSE",
    target_module_code: "PSA-PROJECT-FINANCIALS",
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "Approved time becomes billable inventory for invoice generation in project financials.",
    handoff_label: "PSA intra : time-expense -> project-financials : time_entry.approved",
  },
  {
    source_domain_id: D.PSA,
    target_domain_id: D.PSA,
    data_object_id: OBJ.expense_reports,
    trigger_event_name: "expense.approved",
    source_module_code: "PSA-TIME-EXPENSE",
    target_module_code: "PSA-PROJECT-FINANCIALS",
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "Approved expenses become billable / pass-through inventory for invoice generation in project financials.",
    handoff_label: "PSA intra : time-expense -> project-financials : expense.approved",
  },
  {
    source_domain_id: D.PSA,
    target_domain_id: D.PSA,
    data_object_id: OBJ.project_billing_milestones,
    trigger_event_name: "project_billing_milestone.reached",
    source_module_code: "PSA-PROJECT-DELIVERY",
    target_module_code: "PSA-PROJECT-FINANCIALS",
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "Milestone completion in delivery triggers invoice creation in project financials.",
    handoff_label: "PSA intra : project-delivery -> project-financials : project_billing_milestone.reached",
  },
  {
    source_domain_id: D.PSA,
    target_domain_id: D.PSA,
    data_object_id: OBJ.service_projects,
    trigger_event_name: "service_project.staffing_required",
    source_module_code: "PSA-PROJECT-DELIVERY",
    target_module_code: "PSA-RESOURCE-MGMT",
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "Engagement scope identifies a staffing requirement that resource management must fulfill.",
    handoff_label: "PSA intra : project-delivery -> resource-mgmt : service_project.staffing_required",
  },
];

// ---- B10b backfill rule for PSA-side existing handoffs ----
// For each existing handoff where PSA is source/target:
//   source-side: find PSA module that masters/contributes/consumes the trigger_event's data_object
//   target-side: find PSA module that holds the handoff's payload data_object
// Strongest role wins (master > contributor > consumer). If tie or no candidate -> NULL+notes.

const ROLE_RANK: Record<string, number> = { master: 0, embedded_master: 1, contributor: 2, consumer: 3, derived: 4 };

async function main() {
  console.log("PSA modules + handoffs loader");
  console.log("===============================\n");

  // Pre-flight: verify domain
  const psaDomain = await get(`/domains?domain_code=eq.PSA&select=id,domain_name`);
  if (!psaDomain || psaDomain.length === 0) {
    console.error("PSA domain not found");
    process.exit(1);
  }
  console.log(`PSA domain id=${psaDomain[0].id}`);

  // ============================================================
  // STEP 1 — domain_modules (idempotent by domain_module_code)
  // ============================================================
  console.log("\nSTEP 1: domain_modules");
  const existingModules: Row[] = await get(`/domain_modules?domain_id=eq.${PSA}&select=id,domain_module_code,domain_module_name,description`);
  const modByCode = new Map<string, number>();
  for (const m of existingModules) modByCode.set(m.domain_module_code, m.id);

  const toInsertModules = MODULES.filter((m) => !modByCode.has(m.code)).map((m) => ({
    domain_id: PSA,
    domain_module_code: m.code,
    domain_module_name: m.name,
    description: m.description,
  }));
  if (toInsertModules.length > 0) {
    const inserted = await insertChunked(`/domain_modules`, toInsertModules);
    for (const r of inserted) modByCode.set(r.domain_module_code, r.id);
    console.log(`  inserted ${inserted.length} modules`);
  } else {
    console.log("  all 4 modules already present");
  }
  for (const m of MODULES) console.log(`    ${m.code} -> id ${modByCode.get(m.code)}`);

  // ============================================================
  // STEP 2 — domain_module_capabilities (idempotent by (module, capability))
  // ============================================================
  console.log("\nSTEP 2: domain_module_capabilities");
  const moduleIds = MODULES.map((m) => modByCode.get(m.code)!).filter(Boolean);
  const existingCapLinks: Row[] = await get(
    `/domain_module_capabilities?domain_module_id=in.(${moduleIds.join(",")})&select=domain_module_id,capability_id`
  );
  const capLinkSet = new Set(existingCapLinks.map((r) => `${r.domain_module_id}|${r.capability_id}`));
  const toInsertCapLinks: Row[] = [];
  for (const m of MODULES) {
    const mid = modByCode.get(m.code)!;
    for (const cid of m.capabilities) {
      const key = `${mid}|${cid}`;
      if (!capLinkSet.has(key)) {
        toInsertCapLinks.push({ domain_module_id: mid, capability_id: cid, notes: "" });
      }
    }
  }
  if (toInsertCapLinks.length > 0) {
    await insertChunked(`/domain_module_capabilities`, toInsertCapLinks);
    console.log(`  inserted ${toInsertCapLinks.length} capability links`);
  } else {
    console.log("  all capability links already present");
  }

  // ============================================================
  // STEP 3 — domain_module_data_objects (idempotent by (module, data_object))
  // ============================================================
  console.log("\nSTEP 3: domain_module_data_objects");
  const existingDmdo: Row[] = await get(
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds.join(",")})&select=domain_module_id,data_object_id`
  );
  const dmdoSet = new Set(existingDmdo.map((r) => `${r.domain_module_id}|${r.data_object_id}`));
  const toInsertDmdo: Row[] = [];
  for (const m of MODULES) {
    const mid = modByCode.get(m.code)!;
    for (const d of m.data_objects) {
      const key = `${mid}|${d.id}`;
      if (!dmdoSet.has(key)) {
        toInsertDmdo.push({
          domain_module_id: mid,
          data_object_id: d.id,
          role: d.role,
          necessity: d.necessity,
          notes: d.notes ?? "",
        });
      }
    }
  }
  if (toInsertDmdo.length > 0) {
    await insertChunked(`/domain_module_data_objects`, toInsertDmdo);
    console.log(`  inserted ${toInsertDmdo.length} module-data-object links`);
  } else {
    console.log("  all module-data-object links already present");
  }

  // ============================================================
  // STEP 4 — domain_starter_modules (idempotent by (domain, module))
  // ============================================================
  console.log("\nSTEP 4: domain_starter_modules");
  const existingStarter: Row[] = await get(
    `/domain_starter_modules?domain_id=eq.${PSA}&select=domain_module_id,position`
  );
  const starterSet = new Set(existingStarter.map((r) => `${r.domain_module_id}`));
  const toInsertStarter: Row[] = [];
  for (const s of STARTER_MODULES) {
    const mid = modByCode.get(s.code)!;
    if (!starterSet.has(`${mid}`)) {
      toInsertStarter.push({
        domain_id: PSA,
        domain_module_id: mid,
        position: s.position,
        notes: s.notes,
      });
    }
  }
  if (toInsertStarter.length > 0) {
    await insertChunked(`/domain_starter_modules`, toInsertStarter);
    console.log(`  inserted ${toInsertStarter.length} starter-module rows`);
  } else {
    console.log("  all starter-module rows already present");
  }

  // ============================================================
  // STEP 5 — M5 lifecycle PATCH (revenue_recognition_records.recognized -> FINANCIALS)
  // ============================================================
  console.log("\nSTEP 5: lifecycle state module attribution (M5)");
  const finId = modByCode.get("PSA-PROJECT-FINANCIALS")!;
  const states: Row[] = await get(
    `/data_object_lifecycle_states?data_object_id=eq.${OBJ.revenue_recognition_records}&requires_permission=eq.true&select=id,state_name,domain_module_id`
  );
  for (const s of states) {
    if (s.domain_module_id === null) {
      await patch(`/data_object_lifecycle_states?id=eq.${s.id}`, { domain_module_id: finId });
      console.log(`  PATCH lifecycle_state ${s.id} (${s.state_name}) -> module ${finId}`);
    } else {
      console.log(`  lifecycle_state ${s.id} (${s.state_name}) already module ${s.domain_module_id}`);
    }
  }

  // ============================================================
  // STEP 6 — trigger_events: insert new + fill missing event_category
  // ============================================================
  console.log("\nSTEP 6: trigger_events");
  const existingEvents: Row[] = await get(
    `/trigger_events?event_name=in.(${NEW_EVENTS.map((e) => `"${e.event_name}"`).join(",")})&select=id,event_name`
  );
  const eventByName = new Map<string, number>();
  for (const e of existingEvents) eventByName.set(e.event_name, e.id);

  const toInsertEvents = NEW_EVENTS.filter((e) => !eventByName.has(e.event_name)).map((e) => ({
    event_name: e.event_name,
    data_object_id: e.data_object_id,
    event_category: e.event_category,
    from_state: e.from_state ?? "",
    to_state: e.to_state ?? "",
    description: e.description,
  }));
  if (toInsertEvents.length > 0) {
    const inserted = await insertChunked(`/trigger_events`, toInsertEvents);
    for (const r of inserted) eventByName.set(r.event_name, r.id);
    console.log(`  inserted ${inserted.length} new trigger_events`);
  } else {
    console.log("  all new trigger_events already present");
  }

  // Backfill event_category on PSA-owned events that have empty value
  const psaOwnedEventNames = [
    "project_assignment.confirmed", "project_assignment.released", "project_assignment.utilization_low",
    "project_billing_milestone.reached", "project_milestone.invoiced", "project_billing_milestone.slipped",
    "project_resource_allocation.committed", "project_resource_allocation.conflict_detected", "project_resource_allocation.demand_unmet",
    "project_task.completed", "project_task.overdue", "project_task.dependency_blocked",
    "resource_skill_inventory.updated", "resource_skill_inventory.gap_identified",
    "service_project.staffing_required", "revenue.recognised",
  ];
  const psaEvents: Row[] = await get(
    `/trigger_events?event_name=in.(${psaOwnedEventNames.map((n) => `"${n}"`).join(",")})&select=id,event_name,event_category,data_object_id,from_state,to_state`
  );
  for (const e of psaEvents) {
    eventByName.set(e.event_name, e.id);
    if (!e.event_category || e.event_category.trim() === "") {
      const fix: Row = { event_category: "state_change" };
      if (e.event_name.endsWith(".completed")) fix.event_category = "lifecycle";
      if (e.event_name.endsWith(".reached") || e.event_name.endsWith(".slipped") || e.event_name.endsWith(".overdue") || e.event_name.endsWith(".gap_identified") || e.event_name.endsWith(".conflict_detected") || e.event_name.endsWith(".demand_unmet") || e.event_name.endsWith(".utilization_low") || e.event_name.endsWith(".dependency_blocked")) {
        fix.event_category = "signal";
      }
      await patch(`/trigger_events?id=eq.${e.id}`, fix);
      console.log(`  PATCH trigger_event ${e.id} (${e.event_name}) event_category -> ${fix.event_category}`);
    }
  }

  // Pre-load IDs for events we reference in handoffs
  const handoffEventNames = new Set<string>();
  for (const h of [...NEW_OUTBOUND_HANDOFFS, ...NEW_INTRA_HANDOFFS]) handoffEventNames.add(h.trigger_event_name);
  const refEvents: Row[] = await get(
    `/trigger_events?event_name=in.(${[...handoffEventNames].map((n) => `"${n}"`).join(",")})&select=id,event_name`
  );
  for (const e of refEvents) eventByName.set(e.event_name, e.id);

  // ============================================================
  // STEP 7 — NEW outbound handoffs (B9) + intra-domain (B9b)
  // ============================================================
  console.log("\nSTEP 7: new handoffs (B9 outbound + B9b intra)");
  const allNewHandoffs = [...NEW_OUTBOUND_HANDOFFS, ...NEW_INTRA_HANDOFFS];
  const handoffNK = (h: { source_domain_id: number; target_domain_id: number; data_object_id: number; trigger_event_id: number; source_domain_module_id: number | null; target_domain_module_id: number | null }) =>
    `${h.source_domain_id}|${h.target_domain_id}|${h.data_object_id}|${h.trigger_event_id}|${h.source_domain_module_id ?? ""}|${h.target_domain_module_id ?? ""}`;

  // Read existing PSA handoffs for collision detection (key includes module FKs)
  const existingHandoffs: Row[] = await get(
    `/handoffs?or=(source_domain_id.eq.${PSA},target_domain_id.eq.${PSA})&select=id,source_domain_id,target_domain_id,data_object_id,trigger_event_id,source_domain_module_id,target_domain_module_id,handoff_label`
  );
  const handoffKeySet = new Set(existingHandoffs.map(handoffNK));

  const toInsertHandoffs: Row[] = [];
  for (const h of allNewHandoffs) {
    const teid = eventByName.get(h.trigger_event_name);
    if (!teid) {
      console.warn(`  SKIP ${h.handoff_label}: trigger_event '${h.trigger_event_name}' not found`);
      continue;
    }
    const srcMod = h.source_module_code ? modByCode.get(h.source_module_code) ?? null : null;
    const tgtMod = h.target_module_code ? modByCode.get(h.target_module_code) ?? null : null;
    const row: Row = {
      source_domain_id: h.source_domain_id,
      target_domain_id: h.target_domain_id,
      data_object_id: h.data_object_id,
      trigger_event_id: teid,
      source_domain_module_id: srcMod,
      target_domain_module_id: tgtMod,
      integration_pattern: h.integration_pattern,
      friction_level: h.friction_level,
      handoff_label: h.handoff_label,
      description: h.description,
      notes: h.notes ?? "",
    };
    const key = handoffNK({
      source_domain_id: row.source_domain_id,
      target_domain_id: row.target_domain_id,
      data_object_id: row.data_object_id,
      trigger_event_id: row.trigger_event_id,
      source_domain_module_id: row.source_domain_module_id,
      target_domain_module_id: row.target_domain_module_id,
    });
    if (!handoffKeySet.has(key)) {
      toInsertHandoffs.push(row);
      handoffKeySet.add(key);
    }
  }
  if (toInsertHandoffs.length > 0) {
    await insertChunked(`/handoffs`, toInsertHandoffs);
    console.log(`  inserted ${toInsertHandoffs.length} handoffs`);
  } else {
    console.log("  all new handoffs already present");
  }

  // ============================================================
  // STEP 8 — B10b backfill module FKs on existing PSA-side handoffs
  // ============================================================
  console.log("\nSTEP 8: B10b backfill source/target module FKs");
  // Re-pull current PSA-side handoffs (includes those we just inserted, but those already have module FKs)
  const psaHandoffs: Row[] = await get(
    `/handoffs?or=(source_domain_id.eq.${PSA},target_domain_id.eq.${PSA})&select=id,source_domain_id,target_domain_id,data_object_id,trigger_event_id,source_domain_module_id,target_domain_module_id,handoff_label,trigger_events(data_object_id,event_name),notes`
  );

  // Index of PSA modules by data_object holdings
  type Holding = { module_id: number; role: string };
  const psaHoldings = new Map<number, Holding[]>();
  for (const m of MODULES) {
    const mid = modByCode.get(m.code)!;
    for (const d of m.data_objects) {
      if (!psaHoldings.has(d.id)) psaHoldings.set(d.id, []);
      psaHoldings.get(d.id)!.push({ module_id: mid, role: d.role });
    }
  }

  function derive(dataObjectId: number): { id: number | null; reason: string } {
    const cands = psaHoldings.get(dataObjectId) ?? [];
    if (cands.length === 0) return { id: null, reason: `no PSA module holds data_object ${dataObjectId}` };
    const minRank = Math.min(...cands.map((c) => ROLE_RANK[c.role] ?? 99));
    const top = cands.filter((c) => (ROLE_RANK[c.role] ?? 99) === minRank);
    if (top.length === 1) return { id: top[0].module_id, reason: `${top[0].role} role` };
    return { id: null, reason: `tie among ${top.length} modules at role ${top[0].role}` };
  }

  let patched = 0;
  let leftNull = 0;
  for (const h of psaHandoffs) {
    const updates: Row = {};
    const noteParts: string[] = [];
    if (h.source_domain_id === PSA && h.source_domain_module_id === null) {
      const eventDoId = h.trigger_events?.data_object_id ?? h.data_object_id;
      const d = derive(eventDoId);
      if (d.id !== null) {
        updates.source_domain_module_id = d.id;
      } else {
        noteParts.push(`source NULL: ${d.reason} (event ${h.trigger_events?.event_name ?? "?"})`);
        leftNull++;
      }
    }
    if (h.target_domain_id === PSA && h.target_domain_module_id === null) {
      const d = derive(h.data_object_id);
      if (d.id !== null) {
        updates.target_domain_module_id = d.id;
      } else {
        noteParts.push(`target NULL: ${d.reason} (data_object ${h.data_object_id})`);
        leftNull++;
      }
    }
    if (Object.keys(updates).length > 0 || noteParts.length > 0) {
      if (noteParts.length > 0) {
        const existingNotes = (h.notes ?? "").toString();
        const merged = existingNotes ? `${existingNotes} | ${noteParts.join("; ")}` : noteParts.join("; ");
        // Only update notes if our text isn't already present
        if (!existingNotes.includes(noteParts[0].slice(0, 40))) {
          updates.notes = merged;
        }
      }
      if (Object.keys(updates).length > 0) {
        await patch(`/handoffs?id=eq.${h.id}`, updates);
        patched++;
        const desc = Object.entries(updates).filter(([k]) => k !== "notes").map(([k, v]) => `${k}=${v}`).join(",");
        console.log(`  PATCH handoff ${h.id} (${h.handoff_label}): ${desc || "notes only"}`);
      }
    }
  }
  console.log(`  patched ${patched} handoffs; ${leftNull} side(s) left NULL with reason in notes`);

  // ============================================================
  // STEP 9 — Verification
  // ============================================================
  console.log("\nSTEP 9: post-load verification");
  const finalModules: Row[] = await get(`/domain_modules?domain_id=eq.${PSA}&select=id,domain_module_code`);
  console.log(`  domain_modules: ${finalModules.length}`);
  const finalCapLinks: Row[] = await get(
    `/domain_module_capabilities?domain_module_id=in.(${finalModules.map((m) => m.id).join(",")})&select=capability_id`
  );
  const uniqueCaps = new Set(finalCapLinks.map((r) => r.capability_id));
  console.log(`  capabilities covered: ${uniqueCaps.size} / 10`);
  const finalDmdo: Row[] = await get(
    `/domain_module_data_objects?domain_module_id=in.(${finalModules.map((m) => m.id).join(",")})&select=id`
  );
  console.log(`  domain_module_data_objects: ${finalDmdo.length}`);
  const finalStarter: Row[] = await get(`/domain_starter_modules?domain_id=eq.${PSA}&select=id`);
  console.log(`  domain_starter_modules: ${finalStarter.length}`);
  const finalHandoffs: Row[] = await get(
    `/handoffs?or=(source_domain_id.eq.${PSA},target_domain_id.eq.${PSA})&select=id,source_domain_module_id,target_domain_module_id,source_domain_id,target_domain_id`
  );
  const outbound = finalHandoffs.filter((h) => h.source_domain_id === PSA && h.target_domain_id !== PSA).length;
  const inbound = finalHandoffs.filter((h) => h.target_domain_id === PSA && h.source_domain_id !== PSA).length;
  const intra = finalHandoffs.filter((h) => h.source_domain_id === PSA && h.target_domain_id === PSA).length;
  const psaSrcStillNull = finalHandoffs.filter((h) => h.source_domain_id === PSA && h.source_domain_module_id === null).length;
  const psaTgtStillNull = finalHandoffs.filter((h) => h.target_domain_id === PSA && h.target_domain_module_id === null).length;
  console.log(`  handoffs: outbound=${outbound}, intra=${intra}, inbound=${inbound}`);
  console.log(`  PSA-side NULL module FKs: source=${psaSrcStillNull}, target=${psaTgtStillNull}`);

  console.log("\nUI:");
  console.log("  https://tests.semantius.app/domain_map/domain_modules");
  console.log("  https://tests.semantius.app/domain_map/handoffs");
  console.log("  https://tests.semantius.app/domain_map/domain_module_data_objects");
  console.log("  https://tests.semantius.app/domain_map/domain_starter_modules");
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("\nFATAL:", e?.message || e);
  process.exit(1);
});
