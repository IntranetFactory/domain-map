#!/usr/bin/env bun
// LEGAL-PRACT-MGMT Phase A delta + Phase M + B4 pattern flags + cleanup.
//
// Scope:
//   - Add capability LEGAL-COURT-DOCKETING + capability_domains link
//   - Delete spurious supplier_invoices contributor row (data_object_id=75)
//   - PATCH B4 pattern flags on 6 masters
//   - Insert 5 modules + DMC + DMDO + starter junction
// Idempotent: re-reads natural keys, safe to re-run.

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const tmpPath = `c:\\tmp\\sem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.json`;
  await Bun.write(tmpPath, JSON.stringify(body));
  const proc = Bun.spawn(["bash", "-c", `semantius call crud postgrestRequest < "${tmpPath.replace(/\\/g, "/")}"`], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`Temp file kept for debug: ${tmpPath}`);
    throw new Error(`semantius call failed (exit ${code}): ${stderr}`);
  }
  try { await Bun.file(tmpPath).unlink?.(); } catch {}
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });
const post = (path: string, body: Row | Row[]) => call({ method: "POST", path, body });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });
const del = (path: string) => call({ method: "DELETE", path });

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    out.push(...await post(path, rows.slice(i, i + CHUNK)));
  }
  return out;
}

const DOMAIN_ID = 150;
const DO_MATTERS = 391;
const DO_TRUST = 392;
const DO_CONFLICT = 393;
const DO_ENG_LETTER = 394;
const DO_COURT_FILING = 738;
const DO_CLIENT_INVOICE = 739;
const DO_TIME_ENTRIES = 162;
const DO_CRM_CONTACTS = 98;
const DO_SUPPLIER_INV = 75;

// ============================================================
// 1. Cleanup: remove spurious supplier_invoices contributor
// ============================================================
console.log("[1/6] cleanup: drop supplier_invoices contributor");
const existingBadDmdo = await get(`/domain_data_objects?domain_id=eq.${DOMAIN_ID}&data_object_id=eq.${DO_SUPPLIER_INV}&select=id`);
if (existingBadDmdo.length > 0) {
  await del(`/domain_data_objects?domain_id=eq.${DOMAIN_ID}&data_object_id=eq.${DO_SUPPLIER_INV}`);
  console.log(`  deleted ${existingBadDmdo.length} row(s)`);
} else {
  console.log("  already absent");
}

// ============================================================
// 2. Phase A delta: capability LEGAL-COURT-DOCKETING
// ============================================================
console.log("\n[2/6] capability LEGAL-COURT-DOCKETING");
let capCourt = await get(`/capabilities?capability_code=eq.LEGAL-COURT-DOCKETING&select=id`);
if (capCourt.length === 0) {
  await post("/capabilities", {
    capability_code: "LEGAL-COURT-DOCKETING",
    capability_name: "Court Calendaring and Docketing",
    description: "Court date capture from electronic court records, jurisdiction-specific deadline calculation, statute-of-limitations alerting, and electronic filing (ECF) integration. Often a separate enterprise module in litigation practice (Aderant Compulaw, ProLaw Court Rules, BestCase).",
  });
  capCourt = await get(`/capabilities?capability_code=eq.LEGAL-COURT-DOCKETING&select=id`);
  console.log(`  inserted capability id=${capCourt[0].id}`);
} else {
  console.log(`  exists id=${capCourt[0].id}`);
}
const CAP_COURT_ID = Number(capCourt[0].id);

const capDomainExisting = await get(`/capability_domains?capability_id=eq.${CAP_COURT_ID}&domain_id=eq.${DOMAIN_ID}&select=id`);
if (capDomainExisting.length === 0) {
  await post("/capability_domains", { capability_id: CAP_COURT_ID, domain_id: DOMAIN_ID });
  console.log("  linked LEGAL-COURT-DOCKETING -> LEGAL-PRACT-MGMT");
} else {
  console.log("  capability_domains link exists");
}

// Capability id map for DMC
const allCaps = await get(`/capability_domains?domain_id=eq.${DOMAIN_ID}&select=capability_id,capabilities(capability_code)`);
const capId = new Map<string, number>();
for (const r of allCaps) capId.set(String((r.capabilities as Row).capability_code), Number(r.capability_id));

// ============================================================
// 3. B4: pattern flags on data_objects
// ============================================================
console.log("\n[3/6] B4 pattern flag patches");
const patternFlagUpdates: Array<{ id: number; flags: Row }> = [
  { id: DO_MATTERS,        flags: { has_personal_content: true } },
  { id: DO_TRUST,          flags: { has_personal_content: true, has_submit_lock: true } },
  { id: DO_CONFLICT,       flags: { has_personal_content: true } },
  { id: DO_ENG_LETTER,     flags: { has_submit_lock: true, has_single_approver: true } },
  { id: DO_COURT_FILING,   flags: { has_submit_lock: true } },
  { id: DO_CLIENT_INVOICE, flags: { has_submit_lock: true, has_single_approver: true } },
];
for (const u of patternFlagUpdates) {
  await patch(`/data_objects?id=eq.${u.id}`, u.flags);
}
console.log(`  patched ${patternFlagUpdates.length} data_objects`);

// ============================================================
// 4. Modules
// ============================================================
console.log("\n[4/6] modules");
const moduleDefs = [
  {
    domain_module_code: "LEGAL-MATTER-MGMT",
    domain_module_name: "Matter Management",
    description: "Central matter lifecycle: intake-to-active-to-closed-to-archived, parties (clients, opposing, co-counsel, courts), key-date and statute-of-limitations alerting, matter status reporting, and matter-scoped document storage. The hub every other legal-practice module attaches to.",
  },
  {
    domain_module_code: "LEGAL-INTAKE-CONFLICT",
    domain_module_name: "Client Intake and Conflict Clearance",
    description: "Intake forms, conflict-of-interest graph search across existing matters and adversaries, conflict-waiver and ethics-wall tracking, engagement-letter drafting from templates, retainer-payment collection, and intake-to-matter conversion.",
  },
  {
    domain_module_code: "LEGAL-TIME-BILLING",
    domain_module_name: "Time Capture and Client Billing",
    description: "Timekeeper time-entry capture against ABA UTBMS task and expense codes, hourly versus flat-fee versus contingency versus alternative-fee-arrangement billing, prebill review and partner approval, e-bill submission in LEDES 1998B and 2000 formats, and AR aging on client invoices.",
  },
  {
    domain_module_code: "LEGAL-TRUST-ACCT",
    domain_module_name: "IOLTA Trust Accounting",
    description: "Separated IOLTA trust-account ledger per client and matter, three-way reconciliation (bank versus ledger versus client-balance), state-specific retention rules, retainer-to-trust deposit and trust-to-operating transfer on earned fees, and state-bar reporting on exceptions.",
  },
  {
    domain_module_code: "LEGAL-COURT-DOCKETING",
    domain_module_name: "Court Calendaring and Docketing",
    description: "Court filing capture and submission, jurisdiction-specific deadline rule application, statute-of-limitations and key-date alerting, service-of-process tracking, and electronic court filing (ECF) integration.",
  },
].map(m => ({ ...m, domain_id: DOMAIN_ID }));

const existingModules = await get(`/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`);
const existingCodes = new Set(existingModules.map(r => String(r.domain_module_code)));
const missingModules = moduleDefs.filter(m => !existingCodes.has(m.domain_module_code));
if (missingModules.length > 0) {
  await insert("/domain_modules", missingModules);
  console.log(`  inserted ${missingModules.length} modules`);
} else {
  console.log("  all 5 modules present");
}
const allModules = await get(`/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`);
const moduleId = new Map<string, number>();
for (const m of allModules) moduleId.set(String(m.domain_module_code), Number(m.id));
console.log(`  modules: ${[...moduleId.entries()].map(([c, i]) => `${c}=${i}`).join(", ")}`);

const M_MATTER  = moduleId.get("LEGAL-MATTER-MGMT")!;
const M_INTAKE  = moduleId.get("LEGAL-INTAKE-CONFLICT")!;
const M_BILLING = moduleId.get("LEGAL-TIME-BILLING")!;
const M_TRUST   = moduleId.get("LEGAL-TRUST-ACCT")!;
const M_COURT   = moduleId.get("LEGAL-COURT-DOCKETING")!;

// ============================================================
// 5. domain_module_capabilities + domain_module_data_objects + starter
// ============================================================
console.log("\n[5/6] DMC + DMDO + starter");

const dmcRows = [
  { domain_module_id: M_MATTER,  capability_id: capId.get("LEGAL-MATTER-MGMT") },
  { domain_module_id: M_MATTER,  capability_id: capId.get("LEGAL-DOC-MGMT") },
  { domain_module_id: M_INTAKE,  capability_id: capId.get("LEGAL-CLIENT-INTAKE") },
  { domain_module_id: M_INTAKE,  capability_id: capId.get("LEGAL-CONFLICT-CHECK") },
  { domain_module_id: M_BILLING, capability_id: capId.get("LEGAL-TIME-BILLING") },
  { domain_module_id: M_TRUST,   capability_id: capId.get("LEGAL-TRUST-ACCT") },
  { domain_module_id: M_COURT,   capability_id: CAP_COURT_ID },
];

const existingDmc = await get(`/domain_module_capabilities?domain_module_id=in.(${M_MATTER},${M_INTAKE},${M_BILLING},${M_TRUST},${M_COURT})&select=domain_module_id,capability_id`);
const dmcKey = (r: Row) => `${r.domain_module_id}|${r.capability_id}`;
const existingDmcKeys = new Set(existingDmc.map(dmcKey));
const missingDmc = dmcRows.filter(r => !existingDmcKeys.has(dmcKey(r)));
if (missingDmc.length > 0) await insert("/domain_module_capabilities", missingDmc);
console.log(`  DMC: ${missingDmc.length} inserted (${existingDmc.length} pre-existing)`);

const dmdoRows = [
  // LEGAL-MATTER-MGMT
  { domain_module_id: M_MATTER, data_object_id: DO_MATTERS,        role: "master",      necessity: "required" },
  { domain_module_id: M_MATTER, data_object_id: DO_TIME_ENTRIES,   role: "contributor", necessity: "required" },
  { domain_module_id: M_MATTER, data_object_id: DO_CRM_CONTACTS,   role: "contributor", necessity: "required" },
  // LEGAL-INTAKE-CONFLICT
  { domain_module_id: M_INTAKE, data_object_id: DO_CONFLICT,       role: "master",      necessity: "required" },
  { domain_module_id: M_INTAKE, data_object_id: DO_ENG_LETTER,     role: "master",      necessity: "required" },
  { domain_module_id: M_INTAKE, data_object_id: DO_CRM_CONTACTS,   role: "contributor", necessity: "required" },
  // LEGAL-TIME-BILLING
  { domain_module_id: M_BILLING, data_object_id: DO_CLIENT_INVOICE, role: "master",      necessity: "required" },
  { domain_module_id: M_BILLING, data_object_id: DO_TIME_ENTRIES,   role: "contributor", necessity: "required" },
  { domain_module_id: M_BILLING, data_object_id: DO_MATTERS,        role: "consumer",    necessity: "required" },
  // LEGAL-TRUST-ACCT
  { domain_module_id: M_TRUST, data_object_id: DO_TRUST,            role: "master",      necessity: "required" },
  { domain_module_id: M_TRUST, data_object_id: DO_CLIENT_INVOICE,   role: "consumer",    necessity: "required" },
  { domain_module_id: M_TRUST, data_object_id: DO_MATTERS,          role: "consumer",    necessity: "required" },
  // LEGAL-COURT-DOCKETING
  { domain_module_id: M_COURT, data_object_id: DO_COURT_FILING,     role: "master",      necessity: "required" },
  { domain_module_id: M_COURT, data_object_id: DO_MATTERS,          role: "consumer",    necessity: "required" },
];
const existingDmdo = await get(`/domain_module_data_objects?domain_module_id=in.(${M_MATTER},${M_INTAKE},${M_BILLING},${M_TRUST},${M_COURT})&select=domain_module_id,data_object_id`);
const dmdoKey = (r: Row) => `${r.domain_module_id}|${r.data_object_id}`;
const existingDmdoKeys = new Set(existingDmdo.map(dmdoKey));
const missingDmdo = dmdoRows.filter(r => !existingDmdoKeys.has(dmdoKey(r)));
if (missingDmdo.length > 0) await insert("/domain_module_data_objects", missingDmdo);
console.log(`  DMDO: ${missingDmdo.length} inserted (${existingDmdo.length} pre-existing)`);

const starterRows = [
  { domain_id: DOMAIN_ID, domain_module_id: M_MATTER,  position: 1, notes: "Start here. Matter is the central record every other module attaches to (parties, time entries, invoices, trust ledger, court filings)." },
  { domain_id: DOMAIN_ID, domain_module_id: M_INTAKE,  position: 2, notes: "Add intake and conflict-check before opening a matter. Engagement letters and the conflict graph live here, both regulated by ABA Model Rules 1.7 and 1.9." },
  { domain_id: DOMAIN_ID, domain_module_id: M_BILLING, position: 3, notes: "Add time capture and client billing once matters are flowing. Drives realization and timekeeper utilization metrics." },
  { domain_id: DOMAIN_ID, domain_module_id: M_TRUST,   position: 4, notes: "Add IOLTA trust accounting last in the core kit. State-bar regulated; needs reconciliation and exception reporting wired before live use." },
];
const existingStarter = await get(`/domain_starter_modules?domain_id=eq.${DOMAIN_ID}&select=domain_module_id`);
const existingStarterIds = new Set(existingStarter.map(r => Number(r.domain_module_id)));
const missingStarter = starterRows.filter(r => !existingStarterIds.has(r.domain_module_id));
if (missingStarter.length > 0) await insert("/domain_starter_modules", missingStarter);
console.log(`  starter: ${missingStarter.length} inserted (${existingStarter.length} pre-existing). COURT-DOCKETING intentionally excluded (litigation-specific).`);

// ============================================================
// 6. Verification summary
// ============================================================
console.log("\n[6/6] verification");
const moduleCount = await get(`/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id`);
const dmdoCount = await get(`/domain_module_data_objects?domain_module_id=in.(${M_MATTER},${M_INTAKE},${M_BILLING},${M_TRUST},${M_COURT})&select=id`);
const starterCount = await get(`/domain_starter_modules?domain_id=eq.${DOMAIN_ID}&select=id`);
console.log(`  modules=${moduleCount.length}, DMDO rows=${dmdoCount.length}, starter rows=${starterCount.length}`);
console.log("\nPhase A delta + Phase M + B4 cleanup complete.");
console.log("UI: https://tests.semantius.app/domain_map/domain_modules");
