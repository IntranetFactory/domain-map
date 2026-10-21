/**
 * BEN-ADMIN (domain_id 61) modules + handoffs loader.
 *
 * Phase M: 4 modules + capabilities + module-data_object junctions + 3 starters.
 * Phase B9b: 8 intra-domain cross-module handoffs.
 * Phase B10b: backfill source_domain_module_id / target_domain_module_id on existing
 *             outbound + inbound handoffs touching BEN-ADMIN.
 * Phase M5:  backfill data_object_lifecycle_states.domain_module_id for all 7 masters.
 *
 * record_status defaults to 'new' (DB default; field omitted on every row).
 *
 * Idempotent: re-running is safe. Each phase reads natural keys first and inserts
 * only missing rows. Backfills only update rows whose target column is currently NULL.
 *
 * Run from project root:
 *   bun run "c:/dev/domain-map/.tmp_deploy/load_ben_admin_modules_handoffs.ts"
 */

const BEN_ADMIN_ID = 61;

// Pre-flight: throw on any em-dash anywhere in author content.
const FORBIDDEN = /—/;

interface CmdResult {
  ok: boolean;
  data: any;
  status: number;
  stderr: string;
}

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    return { ok: false, data: null, status: code, stderr: stderr.trim() || stdout.trim() };
  }
  const text = stdout.trim();
  try {
    return { ok: true, data: text ? JSON.parse(text) : null, status: 0, stderr: "" };
  } catch (e) {
    return { ok: false, data: text, status: code, stderr: "JSON parse failed: " + text };
  }
}

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.stderr}`);
  return r.data;
}

async function post(path: string, rows: any[]): Promise<any[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: any[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const r = await postgrest("POST", path, slice);
    if (!r.ok) throw new Error(`POST ${path} failed: ${r.stderr}`);
    out.push(...(Array.isArray(r.data) ? r.data : [r.data]));
  }
  return out;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await postgrest("PATCH", path, body);
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.stderr}`);
  return r.data;
}

function checkText(label: string, ...vals: (string | null | undefined)[]) {
  for (const v of vals) {
    if (v && FORBIDDEN.test(v)) {
      throw new Error(`em-dash found in ${label}: ${v.slice(0, 80)}`);
    }
  }
}

// =========================================================================
// SPECS (single source of truth, edited in-file for review)
// =========================================================================

const MODULE_SPECS = [
  {
    domain_module_code: "BEN-PLAN-DESIGN",
    domain_module_name: "Plan Design and Enrollment Setup",
    description:
      "The catalog backbone of benefits administration: masters benefit_plans and benefit_open_enrollments, defines deduction codes used by PAYROLL, and scopes plan offerings by legal_entity. Mirrors the plan-configuration workspace in Workday Benefits, ADP Workforce Now Benefits, and bswift.",
  },
  {
    domain_module_code: "BEN-ENROLLMENT",
    domain_module_name: "Enrollment and Life Events",
    description:
      "The employee-facing workflow surface: elections, dependents, life-event handling, and decision-support tooling. Masters benefit_enrollments, benefit_dependents, life_events; embeds employees for the benefit-eligibility slice (coverage tier, dependent linkage, beneficiary designation).",
  },
  {
    domain_module_code: "BEN-CARRIER-INTEG",
    domain_module_name: "Carrier Connectivity",
    description:
      "EDI / API connectivity to insurance carriers, 401(k) record-keepers, and equity providers. Masters benefit_carriers and carrier_feeds (834 EDI, custom API, file-drop). Owns the identity-reconciliation problem between per-carrier member IDs and the HRIS employee_id.",
  },
  {
    domain_module_code: "BEN-ACA-COMPLIANCE",
    domain_module_name: "ACA Compliance Reporting",
    description:
      "1094-C / 1095-C reporting, affordability tracking, and ACA penalty avoidance. Consumes benefit_enrollments, employees, and legal_entities to produce IRS-bound filings and monthly affordability snapshots.",
  },
] as const;

type ModuleCode = (typeof MODULE_SPECS)[number]["domain_module_code"];

// Capability code -> list of module codes that realize it
const CAPABILITY_TO_MODULES: Record<string, ModuleCode[]> = {
  "BENEFITS-ENROLL": ["BEN-PLAN-DESIGN", "BEN-ENROLLMENT"],
  "BENEFITS-LIFE-EVENT": ["BEN-ENROLLMENT"],
  "CARRIER-CONNECT": ["BEN-CARRIER-INTEG"],
  "ACA-COMPLIANCE": ["BEN-ACA-COMPLIANCE"],
  "BEN-DECISION": ["BEN-ENROLLMENT"],
};

// (data_object_id, module_code) -> {role, necessity}
// Derived from existing domain_data_objects (domain_id=61) reshaped per module
type ModuleDataObjectSpec = {
  data_object_id: number;
  data_object_name: string; // for log only
  module_code: ModuleCode;
  role: string;
  necessity: string;
};

const MODULE_DATA_OBJECTS: ModuleDataObjectSpec[] = [
  // BEN-PLAN-DESIGN
  { data_object_id: 146, data_object_name: "benefit_plans", module_code: "BEN-PLAN-DESIGN", role: "master", necessity: "required" },
  { data_object_id: 150, data_object_name: "benefit_open_enrollments", module_code: "BEN-PLAN-DESIGN", role: "master", necessity: "required" },
  { data_object_id: 141, data_object_name: "deduction_codes", module_code: "BEN-PLAN-DESIGN", role: "contributor", necessity: "required" },
  { data_object_id: 197, data_object_name: "legal_entities", module_code: "BEN-PLAN-DESIGN", role: "consumer", necessity: "required" },
  { data_object_id: 34, data_object_name: "org_units", module_code: "BEN-PLAN-DESIGN", role: "embedded_master", necessity: "optional" },

  // BEN-ENROLLMENT
  { data_object_id: 147, data_object_name: "benefit_enrollments", module_code: "BEN-ENROLLMENT", role: "master", necessity: "required" },
  { data_object_id: 148, data_object_name: "benefit_dependents", module_code: "BEN-ENROLLMENT", role: "master", necessity: "required" },
  { data_object_id: 149, data_object_name: "life_events", module_code: "BEN-ENROLLMENT", role: "master", necessity: "required" },
  { data_object_id: 31, data_object_name: "employees", module_code: "BEN-ENROLLMENT", role: "embedded_master", necessity: "required" },
  { data_object_id: 34, data_object_name: "org_units", module_code: "BEN-ENROLLMENT", role: "embedded_master", necessity: "optional" },

  // BEN-CARRIER-INTEG
  { data_object_id: 151, data_object_name: "benefit_carriers", module_code: "BEN-CARRIER-INTEG", role: "master", necessity: "required" },
  { data_object_id: 152, data_object_name: "carrier_feeds", module_code: "BEN-CARRIER-INTEG", role: "master", necessity: "required" },

  // BEN-ACA-COMPLIANCE
  { data_object_id: 197, data_object_name: "legal_entities", module_code: "BEN-ACA-COMPLIANCE", role: "consumer", necessity: "required" },
  { data_object_id: 31, data_object_name: "employees", module_code: "BEN-ACA-COMPLIANCE", role: "consumer", necessity: "required" },
];

// Starter module positions
const STARTERS: { module_code: ModuleCode; position: number; notes: string }[] = [
  { module_code: "BEN-PLAN-DESIGN", position: 1, notes: "The catalog backbone. Without plan definitions and open-enrollment windows, no elections can flow." },
  { module_code: "BEN-ENROLLMENT", position: 2, notes: "Adds the elections, dependents, and life-event workflow. With these two installed you have a minimum recognizable benefits-administration system." },
  { module_code: "BEN-CARRIER-INTEG", position: 3, notes: "Adds the EDI / API carrier connectivity layer needed for downstream coverage activation." },
];

// Lifecycle-state to module mapping (M5 backfill)
// Module assignment = module that MASTERS the data_object
const LIFECYCLE_DATA_OBJECT_TO_MODULE: Record<number, ModuleCode> = {
  146: "BEN-PLAN-DESIGN",
  150: "BEN-PLAN-DESIGN",
  147: "BEN-ENROLLMENT",
  148: "BEN-ENROLLMENT",
  149: "BEN-ENROLLMENT",
  151: "BEN-CARRIER-INTEG",
  152: "BEN-CARRIER-INTEG",
};

// B9b intra-domain cross-module handoffs (new rows to insert)
type IntraHandoffSpec = {
  source_module_code: ModuleCode;
  target_module_code: ModuleCode;
  trigger_event_id: number;
  trigger_event_name: string; // log only
  data_object_id: number;
  integration_pattern: string;
  friction_level: string;
  description: string;
};

const INTRA_HANDOFFS: IntraHandoffSpec[] = [
  {
    source_module_code: "BEN-PLAN-DESIGN",
    target_module_code: "BEN-ENROLLMENT",
    trigger_event_id: 419,
    trigger_event_name: "benefit_open_enrollment.opened",
    data_object_id: 147,
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "Open-enrollment window opening exposes electable plans and rates to the enrollment workflow; no message moves, the enrollment module reads the OE state directly.",
  },
  {
    source_module_code: "BEN-PLAN-DESIGN",
    target_module_code: "BEN-ENROLLMENT",
    trigger_event_id: 413,
    trigger_event_name: "benefit_plan.published",
    data_object_id: 147,
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "Newly published plan becomes electable in the enrollment surface.",
  },
  {
    source_module_code: "BEN-PLAN-DESIGN",
    target_module_code: "BEN-CARRIER-INTEG",
    trigger_event_id: 413,
    trigger_event_name: "benefit_plan.published",
    data_object_id: 151,
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "Newly published plan triggers carrier-feed configuration (carrier mapping, plan codes, eligibility rules).",
  },
  {
    source_module_code: "BEN-ENROLLMENT",
    target_module_code: "BEN-CARRIER-INTEG",
    trigger_event_id: 51,
    trigger_event_name: "enrollment.changed",
    data_object_id: 152,
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "Election change queues a carrier feed delta for the next outbound transmission.",
  },
  {
    source_module_code: "BEN-ENROLLMENT",
    target_module_code: "BEN-CARRIER-INTEG",
    trigger_event_id: 418,
    trigger_event_name: "life_event.approved",
    data_object_id: 152,
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "Approved life event triggers an off-cycle carrier feed delta (effective date proration).",
  },
  {
    source_module_code: "BEN-ENROLLMENT",
    target_module_code: "BEN-ACA-COMPLIANCE",
    trigger_event_id: 51,
    trigger_event_name: "enrollment.changed",
    data_object_id: 147,
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "ACA reporting re-evaluates affordability and minimum-essential-coverage flags whenever an enrollment state transitions.",
  },
  {
    source_module_code: "BEN-PLAN-DESIGN",
    target_module_code: "BEN-ACA-COMPLIANCE",
    trigger_event_id: 420,
    trigger_event_name: "benefit_open_enrollment.closed",
    data_object_id: 150,
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "Open-enrollment close locks the annual cohort used for 1094-C / 1095-C reporting.",
  },
  {
    source_module_code: "BEN-ENROLLMENT",
    target_module_code: "BEN-PLAN-DESIGN",
    trigger_event_id: 416,
    trigger_event_name: "benefit_dependent.aged_out",
    data_object_id: 148,
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description: "Aging-out dependent events feed plan-utilization analytics that inform next-year plan-design decisions.",
  },
];

// B10b backfill targets
type BackfillRow = {
  handoff_id: number;
  column: "source_domain_module_id" | "target_domain_module_id";
  module_code: ModuleCode | null; // null = leave NULL + set notes
  reason: string; // becomes notes if module_code null
  event_name: string; // log only
};

const BACKFILLS: BackfillRow[] = [
  // Outbound: source_domain_module_id
  { handoff_id: 188, column: "source_domain_module_id", module_code: "BEN-ENROLLMENT", reason: "master of benefit_enrollments (data_object 147)", event_name: "enrollment.changed" },
  { handoff_id: 420, column: "source_domain_module_id", module_code: "BEN-CARRIER-INTEG", reason: "master of carrier_feeds (data_object 152)", event_name: "carrier_feed.reconciled" },
  { handoff_id: 419, column: "source_domain_module_id", module_code: "BEN-CARRIER-INTEG", reason: "master of carrier_feeds (data_object 152)", event_name: "carrier_feed.transmitted" },
  { handoff_id: 108, column: "source_domain_module_id", module_code: "BEN-ENROLLMENT", reason: "master of benefit_enrollments (data_object 147)", event_name: "enrollment.changed" },
  { handoff_id: 109, column: "source_domain_module_id", module_code: "BEN-ENROLLMENT", reason: "master of benefit_enrollments (data_object 147)", event_name: "enrollment.changed" },
  { handoff_id: 110, column: "source_domain_module_id", module_code: "BEN-CARRIER-INTEG", reason: "master of benefit_carriers (data_object 151), per trigger_event 82 data_object linkage", event_name: "open_enrollment.closed" },
  { handoff_id: 417, column: "source_domain_module_id", module_code: "BEN-ENROLLMENT", reason: "master of life_events (data_object 149)", event_name: "life_event.approved" },
  { handoff_id: 418, column: "source_domain_module_id", module_code: "BEN-ENROLLMENT", reason: "master of life_events (data_object 149)", event_name: "life_event.approved" },

  // Inbound: target_domain_module_id
  { handoff_id: 100, column: "target_domain_module_id", module_code: "BEN-ENROLLMENT", reason: "master of benefit_enrollments (data_object 147)", event_name: "pay_cycle.closed" },
  { handoff_id: 120, column: "target_domain_module_id", module_code: "BEN-ENROLLMENT", reason: "master of benefit_enrollments (data_object 147)", event_name: "job_offer.accepted" },
  { handoff_id: 122, column: "target_domain_module_id", module_code: "BEN-ENROLLMENT", reason: "master of benefit_enrollments (data_object 147)", event_name: "employee.terminated" },
  { handoff_id: 1075, column: "target_domain_module_id", module_code: "BEN-ENROLLMENT", reason: "master of benefit_enrollments (data_object 147)", event_name: "job_offer.rescinded" },
  { handoff_id: 367, column: "target_domain_module_id", module_code: "BEN-ENROLLMENT", reason: "embedded_master of employees (data_object 31), strongest role in BEN-ADMIN", event_name: "employee.terminated" },
  { handoff_id: 371, column: "target_domain_module_id", module_code: "BEN-ENROLLMENT", reason: "embedded_master of employees (data_object 31), strongest role in BEN-ADMIN", event_name: "employee.created" },
  // Leave NULL + annotate
  { handoff_id: 379, column: "target_domain_module_id", module_code: null, reason: "no module in BEN-ADMIN holds data_object 36 employment_events; eligibility re-eval is implicit on BEN-ENROLLMENT but not declared via DMDO", event_name: "employment_event.recorded" },
  { handoff_id: 395, column: "target_domain_module_id", module_code: null, reason: "no module in BEN-ADMIN holds data_object 3 candidates; implicit consumer is BEN-ENROLLMENT (eligibility window) but not declared via DMDO", event_name: "candidate.hired" },
  { handoff_id: 413, column: "target_domain_module_id", module_code: null, reason: "no module in BEN-ADMIN holds data_object 139 pay_slips; reconciliation feedback received but not held", event_name: "pay_cycle.closed" },
];

// =========================================================================
// Pre-flight em-dash scan
// =========================================================================
function preflight() {
  for (const m of MODULE_SPECS) checkText(`module ${m.domain_module_code}`, m.domain_module_name, m.description);
  for (const s of STARTERS) checkText(`starter ${s.module_code}`, s.notes);
  for (const h of INTRA_HANDOFFS) checkText(`intra handoff ${h.source_module_code}->${h.target_module_code}`, h.description);
  for (const b of BACKFILLS) checkText(`backfill handoff ${b.handoff_id}`, b.reason);
  console.log("Pre-flight: no em-dashes detected.");
}

// =========================================================================
// MAIN
// =========================================================================

async function main() {
  console.log("BEN-ADMIN modules + handoffs loader (2026-05-24)");
  console.log("================================================\n");

  preflight();

  // ---- Step 1: ensure modules exist ----
  console.log("\nStep 1: ensure domain_modules");
  const existingMods = await get(
    `/domain_modules?domain_id=eq.${BEN_ADMIN_ID}&select=id,domain_module_code`
  );
  const modByCode = new Map<string, number>(
    existingMods.map((m: any) => [m.domain_module_code as string, m.id as number])
  );
  console.log(`  existing modules: ${existingMods.length}`);

  const missingMods = MODULE_SPECS.filter((m) => !modByCode.has(m.domain_module_code));
  if (missingMods.length) {
    const rows = missingMods.map((m) => ({
      domain_id: BEN_ADMIN_ID,
      domain_module_code: m.domain_module_code,
      domain_module_name: m.domain_module_name,
      description: m.description,
    }));
    const inserted = await post("/domain_modules", rows);
    for (const r of inserted) modByCode.set(r.domain_module_code, r.id);
    console.log(`  inserted ${inserted.length} modules: ${inserted.map((r: any) => r.domain_module_code).join(", ")}`);
  } else {
    console.log("  all modules present");
  }

  const moduleId = (code: ModuleCode): number => {
    const id = modByCode.get(code);
    if (!id) throw new Error(`module ${code} missing`);
    return id;
  };

  // ---- Step 2: capabilities -> modules junction ----
  console.log("\nStep 2: domain_module_capabilities");
  const capRows = await get(
    `/capabilities?capability_code=in.(${Object.keys(CAPABILITY_TO_MODULES).join(",")})&select=id,capability_code`
  );
  const capByCode = new Map<string, number>(capRows.map((c: any) => [c.capability_code as string, c.id as number]));

  const allModuleIds = MODULE_SPECS.map((m) => moduleId(m.domain_module_code));
  const existingDmc = await get(
    `/domain_module_capabilities?domain_module_id=in.(${allModuleIds.join(",")})&select=domain_module_id,capability_id`
  );
  const dmcKey = (a: number, b: number) => `${a}:${b}`;
  const dmcExisting = new Set(existingDmc.map((r: any) => dmcKey(r.domain_module_id, r.capability_id)));

  const dmcToInsert: any[] = [];
  for (const [capCode, mods] of Object.entries(CAPABILITY_TO_MODULES)) {
    const capId = capByCode.get(capCode);
    if (!capId) throw new Error(`capability ${capCode} not found`);
    for (const modCode of mods) {
      const mid = moduleId(modCode);
      if (!dmcExisting.has(dmcKey(mid, capId))) {
        dmcToInsert.push({ domain_module_id: mid, capability_id: capId });
      }
    }
  }
  if (dmcToInsert.length) {
    await post("/domain_module_capabilities", dmcToInsert);
    console.log(`  inserted ${dmcToInsert.length} module-capability rows`);
  } else {
    console.log("  all module-capability links present");
  }

  // ---- Step 3: module data objects ----
  console.log("\nStep 3: domain_module_data_objects");
  const existingDmdo = await get(
    `/domain_module_data_objects?domain_module_id=in.(${allModuleIds.join(",")})&select=domain_module_id,data_object_id`
  );
  const dmdoKey = (a: number, b: number) => `${a}:${b}`;
  const dmdoExisting = new Set(existingDmdo.map((r: any) => dmdoKey(r.domain_module_id, r.data_object_id)));

  const dmdoToInsert: any[] = [];
  for (const s of MODULE_DATA_OBJECTS) {
    const mid = moduleId(s.module_code);
    if (!dmdoExisting.has(dmdoKey(mid, s.data_object_id))) {
      dmdoToInsert.push({
        domain_module_id: mid,
        data_object_id: s.data_object_id,
        role: s.role,
        necessity: s.necessity,
      });
    }
  }
  if (dmdoToInsert.length) {
    await post("/domain_module_data_objects", dmdoToInsert);
    console.log(`  inserted ${dmdoToInsert.length} module-data_object rows`);
  } else {
    console.log("  all module-data_object rows present");
  }

  // ---- Step 4: starter modules ----
  console.log("\nStep 4: domain_starter_modules");
  const existingStart = await get(
    `/domain_starter_modules?domain_id=eq.${BEN_ADMIN_ID}&select=domain_module_id,position`
  );
  const startExisting = new Set(existingStart.map((r: any) => `${r.domain_module_id}:${r.position}`));
  const startToInsert: any[] = [];
  for (const s of STARTERS) {
    const mid = moduleId(s.module_code);
    if (!startExisting.has(`${mid}:${s.position}`)) {
      startToInsert.push({
        domain_id: BEN_ADMIN_ID,
        domain_module_id: mid,
        position: s.position,
        notes: s.notes,
      });
    }
  }
  if (startToInsert.length) {
    await post("/domain_starter_modules", startToInsert);
    console.log(`  inserted ${startToInsert.length} starter rows`);
  } else {
    console.log("  all starters present");
  }

  // ---- Step 5: M5 lifecycle states backfill ----
  console.log("\nStep 5: lifecycle states domain_module_id backfill");
  const lifecycleRows = await get(
    `/data_object_lifecycle_states?data_object_id=in.(${Object.keys(LIFECYCLE_DATA_OBJECT_TO_MODULE).join(",")})&domain_module_id=is.null&select=id,data_object_id,state_name`
  );
  let lifecycleUpdated = 0;
  for (const r of lifecycleRows) {
    const modCode = LIFECYCLE_DATA_OBJECT_TO_MODULE[r.data_object_id as number];
    if (!modCode) continue;
    const mid = moduleId(modCode);
    await patch(`/data_object_lifecycle_states?id=eq.${r.id}`, { domain_module_id: mid });
    lifecycleUpdated++;
  }
  console.log(`  patched ${lifecycleUpdated} lifecycle state rows (${lifecycleRows.length} were NULL)`);

  // ---- Step 6: B9b intra-domain handoffs ----
  console.log("\nStep 6: intra-domain handoffs (B9b)");
  const existingIntra = await get(
    `/handoffs?source_domain_id=eq.${BEN_ADMIN_ID}&target_domain_id=eq.${BEN_ADMIN_ID}&select=trigger_event_id,data_object_id,source_domain_module_id,target_domain_module_id`
  );
  const intraKey = (h: any) =>
    `${h.source_domain_module_id}|${h.target_domain_module_id}|${h.trigger_event_id}|${h.data_object_id}`;
  const intraExisting = new Set(existingIntra.map(intraKey));

  const intraToInsert: any[] = [];
  for (const h of INTRA_HANDOFFS) {
    const srcMid = moduleId(h.source_module_code);
    const tgtMid = moduleId(h.target_module_code);
    const key = `${srcMid}|${tgtMid}|${h.trigger_event_id}|${h.data_object_id}`;
    if (intraExisting.has(key)) continue;
    intraToInsert.push({
      source_domain_id: BEN_ADMIN_ID,
      target_domain_id: BEN_ADMIN_ID,
      source_domain_module_id: srcMid,
      target_domain_module_id: tgtMid,
      trigger_event_id: h.trigger_event_id,
      data_object_id: h.data_object_id,
      integration_pattern: h.integration_pattern,
      friction_level: h.friction_level,
      description: h.description,
      notes: "",
    });
  }
  if (intraToInsert.length) {
    await post("/handoffs", intraToInsert);
    console.log(`  inserted ${intraToInsert.length} intra-domain handoffs`);
  } else {
    console.log("  all intra-domain handoffs present");
  }

  // ---- Step 7: B10b PATCH backfill on existing handoffs ----
  console.log("\nStep 7: B10b per-module attribution backfill");
  // Re-pull current state to be safe (some rows may already have module_id set).
  const handoffIds = BACKFILLS.map((b) => b.handoff_id);
  const handoffsNow = await get(
    `/handoffs?id=in.(${handoffIds.join(",")})&select=id,source_domain_module_id,target_domain_module_id,notes`
  );
  const handoffById = new Map<number, any>(handoffsNow.map((h: any) => [h.id, h]));

  let backfillApplied = 0;
  let backfillAnnotated = 0;
  for (const b of BACKFILLS) {
    const h = handoffById.get(b.handoff_id);
    if (!h) {
      console.log(`  WARN: handoff ${b.handoff_id} not found, skipping`);
      continue;
    }
    if (h[b.column] !== null && h[b.column] !== undefined) {
      // already set, skip
      continue;
    }
    if (b.module_code) {
      const mid = moduleId(b.module_code);
      const body: any = {};
      body[b.column] = mid;
      await patch(`/handoffs?id=eq.${b.handoff_id}`, body);
      backfillApplied++;
    } else {
      // leave NULL but append annotation
      const annotation = `[BEN-ADMIN B10b NULL] ${b.column}: ${b.reason}`;
      const existingNotes = (h.notes as string | null) ?? "";
      if (existingNotes.includes("[BEN-ADMIN B10b NULL]")) continue;
      const newNotes = existingNotes ? `${existingNotes}\n${annotation}` : annotation;
      checkText(`backfill notes for handoff ${b.handoff_id}`, newNotes);
      await patch(`/handoffs?id=eq.${b.handoff_id}`, { notes: newNotes });
      backfillAnnotated++;
    }
  }
  console.log(`  applied ${backfillApplied} module-id patches, annotated ${backfillAnnotated} ambiguous rows`);

  // ---- Verification ----
  console.log("\n\nVerification");
  console.log("-------------");
  const verifyMods = await get(`/domain_modules?domain_id=eq.${BEN_ADMIN_ID}&select=id,domain_module_code`);
  console.log(`Modules: ${verifyMods.length} (${verifyMods.map((m: any) => m.domain_module_code).join(", ")})`);

  const verifyDmc = await get(
    `/domain_module_capabilities?domain_module_id=in.(${allModuleIds.join(",")})&select=domain_module_id,capability_id`
  );
  console.log(`Module-capability rows: ${verifyDmc.length}`);

  const verifyDmdo = await get(
    `/domain_module_data_objects?domain_module_id=in.(${allModuleIds.join(",")})&select=domain_module_id,data_object_id,role`
  );
  console.log(`Module-data_object rows: ${verifyDmdo.length}`);

  const verifyStart = await get(`/domain_starter_modules?domain_id=eq.${BEN_ADMIN_ID}&select=position,domain_module_id`);
  console.log(`Starter modules: ${verifyStart.length}`);

  const verifyLifecycle = await get(
    `/data_object_lifecycle_states?data_object_id=in.(${Object.keys(LIFECYCLE_DATA_OBJECT_TO_MODULE).join(",")})&domain_module_id=is.null&select=id`
  );
  console.log(`Lifecycle states still NULL on domain_module_id (for BEN-ADMIN masters): ${verifyLifecycle.length}`);

  const verifyOutbound = await get(
    `/handoffs?source_domain_id=eq.${BEN_ADMIN_ID}&select=id,source_domain_module_id`
  );
  const outNull = verifyOutbound.filter((h: any) => h.source_domain_module_id === null).length;
  console.log(`Outbound handoffs: ${verifyOutbound.length} total, ${outNull} with NULL source_domain_module_id`);

  const verifyInbound = await get(
    `/handoffs?target_domain_id=eq.${BEN_ADMIN_ID}&select=id,target_domain_module_id`
  );
  const inNull = verifyInbound.filter((h: any) => h.target_domain_module_id === null).length;
  console.log(`Inbound handoffs: ${verifyInbound.length} total, ${inNull} with NULL target_domain_module_id (expect 3 annotated leftovers)`);

  const verifyIntra = await get(
    `/handoffs?source_domain_id=eq.${BEN_ADMIN_ID}&target_domain_id=eq.${BEN_ADMIN_ID}&select=id`
  );
  console.log(`Intra-domain handoffs: ${verifyIntra.length}`);

  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/domain_modules");
  console.log("  https://tests.semantius.app/domain_map/handoffs");
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("\nFATAL:", e?.message || e);
  process.exit(1);
});
