/**
 * PAYROLL Phase M + B-band loader
 *
 * Idempotent loader for PAYROLL (domain 55):
 *  - INSERT 4 domain_modules, host links, capability links, starter rows
 *  - INSERT domain_module_data_objects (mirrors live domain_data_objects)
 *  - INSERT new trigger_events for permissioned lifecycle states
 *  - INSERT new outbound + intra-domain (B9 + B9b) handoffs
 *  - PATCH domain_module_id on PAYROLL-master lifecycle states
 *  - PATCH source_domain_module_id / target_domain_module_id (B10b) where deterministic
 *
 * Run from project root: bun run "c:/dev/domain-map/.tmp_deploy/load_payroll_modules_handoffs.ts"
 */

const PAYROLL_ID = 55;

const ROLE_RANK: Record<string, number> = {
  master: 0,
  embedded_master: 1,
  contributor: 2,
  consumer: 3,
  derived: 4,
};

interface CmdResult {
  ok: boolean;
  data: any;
  status: number;
  stderr: string;
}

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const json = JSON.stringify(payload);
  // em-dash pre-flight on outgoing payloads
  if (json.includes("—")) {
    throw new Error(`em-dash detected in payload for ${method} ${path}`);
  }
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest"],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" },
  );
  proc.stdin.write(json);
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    return { ok: false, data: null, status: code, stderr: stderr.trim() || stdout.trim() };
  }
  const text = stdout.trim();
  return { ok: true, data: text ? JSON.parse(text) : null, status: 0, stderr: "" };
}

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.stderr}`);
  return r.data;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await postgrest("PATCH", path, body);
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.stderr}`);
  return r.data;
}

function uniformize(rows: any[]): any[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const out: any = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}

async function insert(path: string, rows: any[]): Promise<any[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: any[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const r = await postgrest("POST", path + "?select=*", slice);
    if (!r.ok) throw new Error(`POST ${path} failed: ${r.stderr}\nbody: ${JSON.stringify(slice).slice(0, 500)}`);
    out.push(...(r.data ?? []));
  }
  return out;
}

function emCheck(s: string, label: string) {
  if (s.includes("—")) throw new Error(`em-dash in ${label}: ${s}`);
}

async function main() {
  console.log("PAYROLL modules + handoffs loader");
  console.log("=================================\n");

  // ---------- 1. MODULES ----------
  const moduleSpecs = [
    {
      domain_module_code: "PAYROLL-RUN",
      domain_module_name: "Payroll Run Execution",
      description:
        "Core pay-cycle execution: opens runs, ingests inputs (time, comp, benefits, expenses), performs gross-to-net calculation, books payroll journal entries, and triggers disbursement. Masters pay_runs and payroll_journal_entries.",
    },
    {
      domain_module_code: "PAYROLL-TAX-COMPLIANCE",
      domain_module_name: "Statutory Tax Compliance",
      description:
        "Tax authority configuration, periodic statutory filings, year-end forms, and multi-jurisdiction tax rate management. Masters tax_authorities and tax_filings; consumes pay_runs for filing inputs.",
    },
    {
      domain_module_code: "PAYROLL-EARNINGS-DEDUCTIONS",
      domain_module_name: "Earnings, Deductions and Garnishments",
      description:
        "Catalog of earning codes, deduction codes, and court/agency garnishment orders that drive payroll calculation. Masters earning_codes, deduction_codes, garnishment_orders.",
    },
    {
      domain_module_code: "PAYROLL-EMPLOYEE-PAY-STATEMENTS",
      domain_module_name: "Pay Slips and Self-Service Statements",
      description:
        "Generation, publishing, and employee self-service of pay slips, W2/1099/equivalent year-end statements. Masters pay_slips; reads from pay_runs.",
    },
  ];
  for (const m of moduleSpecs) emCheck(m.description, m.domain_module_code);

  console.log("Phase M1: domain_modules");
  const existingModules: any[] = await get(
    `/domain_modules?domain_id=eq.${PAYROLL_ID}&select=id,domain_module_code,domain_module_name`,
  );
  const moduleByCode = new Map<string, number>();
  for (const m of existingModules) moduleByCode.set(m.domain_module_code, m.id);

  const newModules = moduleSpecs.filter((m) => !moduleByCode.has(m.domain_module_code));
  if (newModules.length > 0) {
    const inserted = await insert(
      "/domain_modules",
      newModules.map((m) => ({ ...m, domain_id: PAYROLL_ID })),
    );
    for (const r of inserted) moduleByCode.set(r.domain_module_code, r.id);
    console.log(`  inserted ${inserted.length} new modules`);
  } else {
    console.log("  all modules already present");
  }
  for (const [code, id] of moduleByCode) console.log(`    ${code} -> id ${id}`);

  // ---------- 2. HOST DOMAIN LINKS ----------
  console.log("\nPhase M1b: domain_module_host_domains");
  const existingHosts: any[] = await get(
    `/domain_module_host_domains?domain_id=eq.${PAYROLL_ID}&select=domain_module_id,domain_id`,
  );
  const hostKey = (mid: number, did: number) => `${mid}:${did}`;
  const hostSet = new Set<string>(existingHosts.map((h) => hostKey(h.domain_module_id, h.domain_id)));
  const newHosts: any[] = [];
  for (const code of moduleByCode.keys()) {
    const mid = moduleByCode.get(code)!;
    if (!hostSet.has(hostKey(mid, PAYROLL_ID))) {
      newHosts.push({ domain_module_id: mid, domain_id: PAYROLL_ID });
    }
  }
  if (newHosts.length > 0) {
    await insert("/domain_module_host_domains", newHosts);
    console.log(`  inserted ${newHosts.length} host links`);
  } else {
    console.log("  no new host links");
  }

  // ---------- 3. CAPABILITY LINKS ----------
  console.log("\nPhase M4: domain_module_capabilities");
  const caps: any[] = await get(
    `/capability_domains?domain_id=eq.${PAYROLL_ID}&select=capability_id,capabilities(capability_code)`,
  );
  const capByCode = new Map<string, number>();
  for (const c of caps) capByCode.set(c.capabilities.capability_code, c.capability_id);

  const capSpecs: { module: string; cap: string; notes: string }[] = [
    { module: "PAYROLL-RUN", cap: "GROSS-TO-NET", notes: "Gross-to-net calculation is the core of the run module." },
    { module: "PAYROLL-RUN", cap: "PAYROLL-GLOBAL", notes: "Multi-country runs and calculation engines live here." },
    { module: "PAYROLL-RUN", cap: "PAY-DISTRIBUTION", notes: "Disbursement bank-file generation and ACH integration." },
    { module: "PAYROLL-TAX-COMPLIANCE", cap: "TAX-FILING", notes: "Statutory filings and year-end forms." },
    { module: "PAYROLL-TAX-COMPLIANCE", cap: "PAYROLL-GLOBAL", notes: "Multi-jurisdiction tax authority and rate management." },
    { module: "PAYROLL-EMPLOYEE-PAY-STATEMENTS", cap: "PAY-DISTRIBUTION", notes: "Employee-facing pay slip delivery and self-service." },
    { module: "PAYROLL-EARNINGS-DEDUCTIONS", cap: "GARNISHMENTS", notes: "Garnishment order intake, application, lifecycle." },
  ];
  for (const c of capSpecs) emCheck(c.notes, `cap ${c.cap}`);

  const existingCaps: any[] = await get(
    `/domain_module_capabilities?domain_module_id=in.(${[...moduleByCode.values()].join(",")})&select=domain_module_id,capability_id`,
  );
  const capLinkSet = new Set<string>(existingCaps.map((c) => `${c.domain_module_id}:${c.capability_id}`));
  const newCaps: any[] = [];
  for (const spec of capSpecs) {
    const mid = moduleByCode.get(spec.module)!;
    const cid = capByCode.get(spec.cap)!;
    if (!mid || !cid) {
      console.log(`  SKIP ${spec.module}/${spec.cap} -- missing id`);
      continue;
    }
    const k = `${mid}:${cid}`;
    if (!capLinkSet.has(k)) newCaps.push({ domain_module_id: mid, capability_id: cid, notes: spec.notes });
  }
  if (newCaps.length > 0) {
    await insert("/domain_module_capabilities", newCaps);
    console.log(`  inserted ${newCaps.length} module-capability links`);
  } else {
    console.log("  no new capability links");
  }

  // ---------- 4. STARTER MODULES ----------
  console.log("\nPhase M3: domain_starter_modules");
  const starterSpecs = [
    { module: "PAYROLL-RUN", position: 1, notes: "Pay-run execution is the heart of payroll. Start here." },
    { module: "PAYROLL-EARNINGS-DEDUCTIONS", position: 2, notes: "Earning and deduction code library feeds the run." },
    { module: "PAYROLL-TAX-COMPLIANCE", position: 3, notes: "Statutory tax filings depend on run output." },
  ];
  for (const s of starterSpecs) emCheck(s.notes, `starter ${s.module}`);
  const existingStarters: any[] = await get(
    `/domain_starter_modules?domain_id=eq.${PAYROLL_ID}&select=domain_module_id,position`,
  );
  const starterSet = new Set<number>(existingStarters.map((s) => s.domain_module_id));
  const newStarters: any[] = [];
  for (const s of starterSpecs) {
    const mid = moduleByCode.get(s.module)!;
    if (!starterSet.has(mid)) {
      newStarters.push({ domain_id: PAYROLL_ID, domain_module_id: mid, position: s.position, notes: s.notes });
    }
  }
  if (newStarters.length > 0) {
    await insert("/domain_starter_modules", newStarters);
    console.log(`  inserted ${newStarters.length} starter rows`);
  } else {
    console.log("  starter rows already present");
  }

  // ---------- 5. MODULE DATA OBJECTS ----------
  console.log("\nPhase M6: domain_module_data_objects");
  const ddObjs: any[] = await get(
    `/domain_data_objects?domain_id=eq.${PAYROLL_ID}&select=data_object_id,role,necessity`,
  );
  const ddByDoid = new Map<number, { role: string; necessity: string }>();
  for (const r of ddObjs) ddByDoid.set(r.data_object_id, { role: r.role, necessity: r.necessity });

  // Per-module data-object plan. role/necessity defaults from domain_data_objects when not specified.
  type DMSpec = { module: string; doid: number; role?: string; necessity?: string };
  const dmSpecs: DMSpec[] = [
    // PAYROLL-RUN
    { module: "PAYROLL-RUN", doid: 138 }, // pay_runs - master
    { module: "PAYROLL-RUN", doid: 145 }, // payroll_journal_entries - master
    { module: "PAYROLL-RUN", doid: 31, role: "embedded_master", necessity: "required" }, // employees
    { module: "PAYROLL-RUN", doid: 32 }, // hcm_positions - embedded_master
    { module: "PAYROLL-RUN", doid: 34 }, // org_units - embedded_master
    { module: "PAYROLL-RUN", doid: 196 }, // cost_centers - embedded_master
    { module: "PAYROLL-RUN", doid: 162 }, // time_entries - consumer
    { module: "PAYROLL-RUN", doid: 163 }, // absence_requests - consumer
    { module: "PAYROLL-RUN", doid: 156 }, // merit_recommendations - consumer
    { module: "PAYROLL-RUN", doid: 147 }, // benefit_enrollments - consumer
    { module: "PAYROLL-RUN", doid: 210 }, // expense_reports - consumer
    { module: "PAYROLL-RUN", doid: 197 }, // legal_entities - consumer
    { module: "PAYROLL-RUN", doid: 140, role: "consumer", necessity: "required" }, // earning_codes
    { module: "PAYROLL-RUN", doid: 141, role: "consumer", necessity: "required" }, // deduction_codes
    { module: "PAYROLL-RUN", doid: 144, role: "consumer", necessity: "required" }, // garnishment_orders
    { module: "PAYROLL-RUN", doid: 142, role: "consumer", necessity: "required" }, // tax_authorities
    { module: "PAYROLL-RUN", doid: 139, role: "consumer", necessity: "required" }, // pay_slips (drafted from runs)
    // PAYROLL-TAX-COMPLIANCE
    { module: "PAYROLL-TAX-COMPLIANCE", doid: 142 }, // tax_authorities - master
    { module: "PAYROLL-TAX-COMPLIANCE", doid: 143 }, // tax_filings - master
    { module: "PAYROLL-TAX-COMPLIANCE", doid: 31, role: "embedded_master", necessity: "required" },
    { module: "PAYROLL-TAX-COMPLIANCE", doid: 197 }, // legal_entities
    { module: "PAYROLL-TAX-COMPLIANCE", doid: 138, role: "consumer", necessity: "required" }, // pay_runs
    { module: "PAYROLL-TAX-COMPLIANCE", doid: 145, role: "consumer", necessity: "required" }, // payroll_journal_entries
    { module: "PAYROLL-TAX-COMPLIANCE", doid: 141, role: "consumer", necessity: "required" }, // deduction_codes
    // PAYROLL-EARNINGS-DEDUCTIONS
    { module: "PAYROLL-EARNINGS-DEDUCTIONS", doid: 140 }, // earning_codes - master
    { module: "PAYROLL-EARNINGS-DEDUCTIONS", doid: 141 }, // deduction_codes - master
    { module: "PAYROLL-EARNINGS-DEDUCTIONS", doid: 144 }, // garnishment_orders - master
    { module: "PAYROLL-EARNINGS-DEDUCTIONS", doid: 31, role: "embedded_master", necessity: "required" },
    { module: "PAYROLL-EARNINGS-DEDUCTIONS", doid: 147 }, // benefit_enrollments - consumer
    { module: "PAYROLL-EARNINGS-DEDUCTIONS", doid: 156 }, // merit_recommendations - consumer
    // PAYROLL-EMPLOYEE-PAY-STATEMENTS
    { module: "PAYROLL-EMPLOYEE-PAY-STATEMENTS", doid: 139 }, // pay_slips - master
    { module: "PAYROLL-EMPLOYEE-PAY-STATEMENTS", doid: 31, role: "embedded_master", necessity: "required" },
    { module: "PAYROLL-EMPLOYEE-PAY-STATEMENTS", doid: 148 }, // benefit_dependents - consumer
    { module: "PAYROLL-EMPLOYEE-PAY-STATEMENTS", doid: 138, role: "consumer", necessity: "required" }, // pay_runs
  ];

  const allModuleIds = [...moduleByCode.values()];
  const existingDmdo: any[] = await get(
    `/domain_module_data_objects?domain_module_id=in.(${allModuleIds.join(",")})&select=domain_module_id,data_object_id`,
  );
  const dmdoSet = new Set<string>(existingDmdo.map((r) => `${r.domain_module_id}:${r.data_object_id}`));

  const newDmdo: any[] = [];
  for (const s of dmSpecs) {
    const mid = moduleByCode.get(s.module)!;
    if (!mid) continue;
    const key = `${mid}:${s.doid}`;
    if (dmdoSet.has(key)) continue;
    const fallback = ddByDoid.get(s.doid);
    const role = s.role ?? fallback?.role ?? "consumer";
    const necessity = s.necessity ?? fallback?.necessity ?? "optional";
    newDmdo.push({
      domain_module_id: mid,
      data_object_id: s.doid,
      role,
      necessity,
      notes: "",
    });
  }
  if (newDmdo.length > 0) {
    await insert("/domain_module_data_objects", newDmdo);
    console.log(`  inserted ${newDmdo.length} module-data_object rows`);
  } else {
    console.log("  no new module-data_object rows");
  }

  // ---------- 6. TRIGGER EVENTS ----------
  console.log("\nPhase B9: trigger_events");
  const masterDoIds = [138, 139, 140, 141, 142, 143, 144, 145];
  const existingTe: any[] = await get(
    `/trigger_events?data_object_id=in.(${masterDoIds.join(",")})&select=id,event_name,data_object_id`,
  );
  const teByName = new Map<string, number>(existingTe.map((t) => [t.event_name, t.id]));

  type TeSpec = {
    event_name: string;
    data_object_id: number;
    event_category: string;
    to_state: string;
    from_state: string;
    description: string;
    module: string;
  };
  const teSpecs: TeSpec[] = [
    {
      event_name: "pay_run.cancelled",
      data_object_id: 138,
      event_category: "lifecycle",
      to_state: "cancelled",
      from_state: "",
      description: "Pay run cancelled before disbursement. Downstream stages reset; tax filing prep is rolled back.",
      module: "PAYROLL-RUN",
    },
    {
      event_name: "pay_slip.published",
      data_object_id: 139,
      event_category: "state_change",
      to_state: "published",
      from_state: "",
      description: "Pay slip published to employee self-service. HCM YTD balances refresh; statement available for download.",
      module: "PAYROLL-EMPLOYEE-PAY-STATEMENTS",
    },
    {
      event_name: "pay_slip.amended",
      data_object_id: 139,
      event_category: "state_change",
      to_state: "amended",
      from_state: "",
      description: "Pay slip amended after publication. Original retained; supersession recorded; downstream YTD adjustments cascade.",
      module: "PAYROLL-EMPLOYEE-PAY-STATEMENTS",
    },
    {
      event_name: "payroll_journal.reversed",
      data_object_id: 145,
      event_category: "state_change",
      to_state: "reversed",
      from_state: "",
      description: "Payroll journal entry reversed (mid-period correction or error). ERP-FIN posts counter-entry; benefits accruals reverse.",
      module: "PAYROLL-RUN",
    },
    {
      event_name: "tax_filing.rejected",
      data_object_id: 143,
      event_category: "state_change",
      to_state: "rejected",
      from_state: "",
      description: "Tax authority rejected the filing. Compliance status flips; remediation case opened.",
      module: "PAYROLL-TAX-COMPLIANCE",
    },
    {
      event_name: "tax_filing.amended",
      data_object_id: 143,
      event_category: "state_change",
      to_state: "amended",
      from_state: "",
      description: "Tax filing amended after submission. Supersedes original; GRC evidence refreshed.",
      module: "PAYROLL-TAX-COMPLIANCE",
    },
    {
      event_name: "garnishment_order.exhausted",
      data_object_id: 144,
      event_category: "lifecycle",
      to_state: "exhausted",
      from_state: "",
      description: "Garnishment order satisfied in full. Withholding stops; HRSD closes case; audit trail retained.",
      module: "PAYROLL-EARNINGS-DEDUCTIONS",
    },
    {
      event_name: "earning_code.deactivated",
      data_object_id: 140,
      event_category: "state_change",
      to_state: "inactive",
      from_state: "",
      description: "Earning code deactivated. PAYROLL-RUN excludes from future calculations; historic records preserved.",
      module: "PAYROLL-EARNINGS-DEDUCTIONS",
    },
    {
      event_name: "deduction_code.deactivated",
      data_object_id: 141,
      event_category: "state_change",
      to_state: "inactive",
      from_state: "",
      description: "Deduction code deactivated. PAYROLL-RUN and BEN-ADMIN integrations refresh mappings.",
      module: "PAYROLL-EARNINGS-DEDUCTIONS",
    },
  ];
  for (const t of teSpecs) emCheck(t.description, t.event_name);

  const newTe = teSpecs.filter((t) => !teByName.has(t.event_name));
  if (newTe.length > 0) {
    const inserted = await insert(
      "/trigger_events",
      newTe.map((t) => ({
        event_name: t.event_name,
        data_object_id: t.data_object_id,
        event_category: t.event_category,
        to_state: t.to_state,
        from_state: t.from_state,
        description: t.description,
        domain_module_id: moduleByCode.get(t.module) ?? null,
      })),
    );
    for (const r of inserted) teByName.set(r.event_name, r.id);
    console.log(`  inserted ${inserted.length} trigger_events`);
  } else {
    console.log("  all new trigger_events already present");
  }

  // Preload referenced existing trigger event ids
  const referencedEvents = [
    "pay_cycle.closed", "pay_cycle.posted", "pay_run.opened", "pay_run.calculated",
    "pay_run.approved", "pay_run.disbursed", "tax_authority.rate_changed",
    "garnishment_order.received",
  ];
  const extraTe: any[] = await get(
    `/trigger_events?event_name=in.(${referencedEvents.join(",")})&select=id,event_name`,
  );
  for (const t of extraTe) teByName.set(t.event_name, t.id);

  // ---------- 7. M5: lifecycle state -> module ----------
  console.log("\nPhase M5: lifecycle state domain_module_id backfill");
  const lifeStates: any[] = await get(
    `/data_object_lifecycle_states?data_object_id=in.(138,139,140,141,142,143,144,145)&select=id,data_object_id,state_name,requires_permission,domain_module_id`,
  );
  const doToModule: Record<number, string> = {
    138: "PAYROLL-RUN",
    145: "PAYROLL-RUN",
    140: "PAYROLL-EARNINGS-DEDUCTIONS",
    141: "PAYROLL-EARNINGS-DEDUCTIONS",
    144: "PAYROLL-EARNINGS-DEDUCTIONS",
    142: "PAYROLL-TAX-COMPLIANCE",
    143: "PAYROLL-TAX-COMPLIANCE",
    139: "PAYROLL-EMPLOYEE-PAY-STATEMENTS",
  };
  let stateFixCount = 0;
  for (const s of lifeStates) {
    if (!s.requires_permission) continue;
    if (s.domain_module_id !== null) continue;
    const code = doToModule[s.data_object_id];
    if (!code) continue;
    const mid = moduleByCode.get(code);
    if (!mid) continue;
    await patch(`/data_object_lifecycle_states?id=eq.${s.id}`, { domain_module_id: mid });
    stateFixCount++;
  }
  console.log(`  patched ${stateFixCount} lifecycle states`);

  // ---------- 8. B9 outbound new handoffs ----------
  console.log("\nPhase B9: outbound handoffs (new)");
  type HandoffSpec = {
    source_domain_id: number;
    target_domain_id: number;
    source_module: string | null;
    target_module: string | null;
    event_name: string;
    data_object_id: number;
    integration_pattern: string;
    friction_level: string;
    description: string;
    notes: string;
  };

  const newOutbound: HandoffSpec[] = [
    {
      source_domain_id: PAYROLL_ID, target_domain_id: 65,
      source_module: "PAYROLL-RUN", target_module: null,
      event_name: "pay_run.disbursed", data_object_id: 145,
      integration_pattern: "event_stream", friction_level: "medium",
      description: "Pay run net disbursed to bank/ACH; ERP-FIN must post payroll journal lines (gross wages, employer taxes, deductions, net cash). Cross-vendor stack typical (ADP/Workday PAY <> Oracle/SAP FIN).",
      notes: "",
    },
    {
      source_domain_id: PAYROLL_ID, target_domain_id: 65,
      source_module: "PAYROLL-RUN", target_module: null,
      event_name: "payroll_journal.reversed", data_object_id: 145,
      integration_pattern: "event_stream", friction_level: "high",
      description: "Mid-period journal reversal forces ERP-FIN counter-posting and re-close. Backdated reversals into closed periods are the canonical period/cycle-close friction case.",
      notes: "High friction: backdated GL posting into closed period regularly requires manual intervention.",
    },
    {
      source_domain_id: PAYROLL_ID, target_domain_id: 15,
      source_module: "PAYROLL-EARNINGS-DEDUCTIONS", target_module: null,
      event_name: "garnishment_order.received", data_object_id: 144,
      integration_pattern: "api_call", friction_level: "medium",
      description: "Garnishment order received: GRC opens a legal-compliance obligation alongside HRSD case for confidential handling. Two parallel downstream targets is normal.",
      notes: "Companion to handoff 416 (PAYROLL -> HRSD). GRC tracks legal exposure; HRSD owns employee comms.",
    },
    {
      source_domain_id: PAYROLL_ID, target_domain_id: 54,
      source_module: "PAYROLL-EMPLOYEE-PAY-STATEMENTS", target_module: null,
      event_name: "pay_slip.published", data_object_id: 139,
      integration_pattern: "event_stream", friction_level: "low",
      description: "Pay slip published: HCM worker record refreshes YTD earnings, taxes, and deductions for self-service display and downstream comp analytics.",
      notes: "",
    },
    {
      source_domain_id: PAYROLL_ID, target_domain_id: 63,
      source_module: "PAYROLL-RUN", target_module: null,
      event_name: "pay_run.disbursed", data_object_id: 138,
      integration_pattern: "batch_sync", friction_level: "low",
      description: "Pay run disbursed: people-analytics ingests labor-cost actuals for headcount, cost-per-head, and overtime dashboards.",
      notes: "",
    },
    {
      source_domain_id: PAYROLL_ID, target_domain_id: 61,
      source_module: "PAYROLL-RUN", target_module: null,
      event_name: "payroll_journal.reversed", data_object_id: 147,
      integration_pattern: "event_stream", friction_level: "high",
      description: "Mid-cycle payroll reversal forces benefit-deduction accrual reversal in BEN-ADMIN. Cross-vendor stack typical; reconciliation often manual.",
      notes: "High friction: deduction accruals span periods; reversal cascades into employer-match calculations.",
    },
    {
      source_domain_id: PAYROLL_ID, target_domain_id: 67,
      source_module: "PAYROLL-RUN", target_module: null,
      event_name: "pay_run.disbursed", data_object_id: 210,
      integration_pattern: "event_stream", friction_level: "low",
      description: "Reimbursable expense lines settled via payroll; EXPENSE marks expense_reports paid and closes reimbursement workflow.",
      notes: "",
    },
  ];

  // ---------- 9. B9b intra-domain handoffs ----------
  console.log("\nPhase B9b: intra-domain cross-module handoffs");
  const newIntra: HandoffSpec[] = [
    {
      source_domain_id: PAYROLL_ID, target_domain_id: PAYROLL_ID,
      source_module: "PAYROLL-EARNINGS-DEDUCTIONS", target_module: "PAYROLL-RUN",
      event_name: "earning_code.deactivated", data_object_id: 140,
      integration_pattern: "lifecycle_progression", friction_level: "low",
      description: "Earning code deactivated in EARNINGS-DEDUCTIONS; PAYROLL-RUN drops it from future pay-run calculations.",
      notes: "",
    },
    {
      source_domain_id: PAYROLL_ID, target_domain_id: PAYROLL_ID,
      source_module: "PAYROLL-EARNINGS-DEDUCTIONS", target_module: "PAYROLL-RUN",
      event_name: "deduction_code.deactivated", data_object_id: 141,
      integration_pattern: "lifecycle_progression", friction_level: "low",
      description: "Deduction code deactivated; PAYROLL-RUN refreshes deduction set for next pay run.",
      notes: "",
    },
    {
      source_domain_id: PAYROLL_ID, target_domain_id: PAYROLL_ID,
      source_module: "PAYROLL-EARNINGS-DEDUCTIONS", target_module: "PAYROLL-RUN",
      event_name: "garnishment_order.received", data_object_id: 144,
      integration_pattern: "lifecycle_progression", friction_level: "low",
      description: "Garnishment order received and active; PAYROLL-RUN must apply withholding starting next applicable cycle.",
      notes: "",
    },
    {
      source_domain_id: PAYROLL_ID, target_domain_id: PAYROLL_ID,
      source_module: "PAYROLL-RUN", target_module: "PAYROLL-EMPLOYEE-PAY-STATEMENTS",
      event_name: "pay_run.calculated", data_object_id: 139,
      integration_pattern: "lifecycle_progression", friction_level: "low",
      description: "Pay run calculated; pay slips drafted in PAY-STATEMENTS module awaiting approval and publish.",
      notes: "",
    },
    {
      source_domain_id: PAYROLL_ID, target_domain_id: PAYROLL_ID,
      source_module: "PAYROLL-RUN", target_module: "PAYROLL-EMPLOYEE-PAY-STATEMENTS",
      event_name: "pay_run.disbursed", data_object_id: 139,
      integration_pattern: "lifecycle_progression", friction_level: "low",
      description: "Pay run disbursed; pay slips transition to published state and become visible in employee self-service.",
      notes: "",
    },
    {
      source_domain_id: PAYROLL_ID, target_domain_id: PAYROLL_ID,
      source_module: "PAYROLL-RUN", target_module: "PAYROLL-TAX-COMPLIANCE",
      event_name: "pay_run.approved", data_object_id: 143,
      integration_pattern: "lifecycle_progression", friction_level: "low",
      description: "Pay run approved; TAX-COMPLIANCE prepares periodic statutory filings from run outputs.",
      notes: "",
    },
    {
      source_domain_id: PAYROLL_ID, target_domain_id: PAYROLL_ID,
      source_module: "PAYROLL-TAX-COMPLIANCE", target_module: "PAYROLL-RUN",
      event_name: "tax_authority.rate_changed", data_object_id: 138,
      integration_pattern: "lifecycle_progression", friction_level: "medium",
      description: "Tax authority rate changed; PAYROLL-RUN refreshes calculation tables and re-evaluates open pay-runs in that jurisdiction.",
      notes: "Medium friction: rate effective-dating and retroactive recalculation can cascade across multiple in-flight runs.",
    },
  ];

  // INSERT outbound + intra
  const allNewHandoffs = [...newOutbound, ...newIntra];
  for (const h of allNewHandoffs) {
    emCheck(h.description, h.event_name);
    emCheck(h.notes, h.event_name + " notes");
  }

  // Idempotent natural key: (source, target, source_module, target_module, trigger_event_id, data_object_id)
  const existingAll: any[] = await get(
    `/handoffs?or=(source_domain_id.eq.${PAYROLL_ID},target_domain_id.eq.${PAYROLL_ID})&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id`,
  );
  const handoffKey = (sd: number, td: number, sm: number | null, tm: number | null, te: number, dop: number) =>
    `${sd}|${td}|${sm ?? "_"}|${tm ?? "_"}|${te}|${dop}`;
  const existingHoSet = new Set<string>(
    existingAll.map((r) =>
      handoffKey(r.source_domain_id, r.target_domain_id, r.source_domain_module_id, r.target_domain_module_id, r.trigger_event_id, r.data_object_id),
    ),
  );

  const rowsToInsert: any[] = [];
  for (const h of allNewHandoffs) {
    const teid = teByName.get(h.event_name);
    if (!teid) {
      console.log(`  SKIP ${h.event_name} -- trigger_event not found`);
      continue;
    }
    const sm = h.source_module ? moduleByCode.get(h.source_module) ?? null : null;
    const tm = h.target_module ? moduleByCode.get(h.target_module) ?? null : null;
    const k = handoffKey(h.source_domain_id, h.target_domain_id, sm, tm, teid, h.data_object_id);
    if (existingHoSet.has(k)) continue;
    rowsToInsert.push({
      source_domain_id: h.source_domain_id,
      target_domain_id: h.target_domain_id,
      source_domain_module_id: sm,
      target_domain_module_id: tm,
      trigger_event_id: teid,
      data_object_id: h.data_object_id,
      integration_pattern: h.integration_pattern,
      friction_level: h.friction_level,
      description: h.description,
      notes: h.notes,
    });
  }
  if (rowsToInsert.length > 0) {
    await insert("/handoffs", rowsToInsert);
    console.log(`  inserted ${rowsToInsert.length} handoffs (B9 + B9b)`);
  } else {
    console.log("  no new handoffs to insert");
  }

  // ---------- 10. B10b backfill on existing handoffs ----------
  console.log("\nPhase B10b: backfill module FKs on existing handoffs");
  // Build domain_module_data_objects index for PAYROLL
  const payrollDmdo: any[] = await get(
    `/domain_module_data_objects?domain_module_id=in.(${allModuleIds.join(",")})&select=domain_module_id,data_object_id,role`,
  );
  const dmdoIndex = new Map<number, { mid: number; role: string }[]>();
  for (const r of payrollDmdo) {
    if (!dmdoIndex.has(r.data_object_id)) dmdoIndex.set(r.data_object_id, []);
    dmdoIndex.get(r.data_object_id)!.push({ mid: r.domain_module_id, role: r.role });
  }
  function strongestModule(doid: number): { mid: number | null; reason: string } {
    const cands = dmdoIndex.get(doid) ?? [];
    if (cands.length === 0) return { mid: null, reason: `data_object ${doid} not in any PAYROLL module` };
    const minRank = Math.min(...cands.map((c) => ROLE_RANK[c.role] ?? 99));
    const top = cands.filter((c) => (ROLE_RANK[c.role] ?? 99) === minRank);
    if (top.length === 1) return { mid: top[0].mid, reason: `${top[0].role} on data_object ${doid}` };
    return { mid: null, reason: `tie: ${top.length} modules at role ${top[0].role}` };
  }

  // Pull all PAYROLL-touching handoffs with trigger_event payload
  const ho: any[] = await get(
    `/handoffs?or=(source_domain_id.eq.${PAYROLL_ID},target_domain_id.eq.${PAYROLL_ID})&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id,notes,trigger_events(data_object_id,event_name)`,
  );

  let srcFixed = 0, tgtFixed = 0, notesPatched = 0;
  for (const h of ho) {
    // SOURCE side: only PAYROLL-side rows
    if (h.source_domain_id === PAYROLL_ID && h.source_domain_module_id === null) {
      const eventDoid = h.trigger_events?.data_object_id;
      if (eventDoid) {
        const d = strongestModule(eventDoid);
        if (d.mid !== null) {
          await patch(`/handoffs?id=eq.${h.id}`, { source_domain_module_id: d.mid });
          srcFixed++;
        } else if (!h.notes || h.notes.length === 0) {
          await patch(`/handoffs?id=eq.${h.id}`, {
            notes: `source_domain_module_id left NULL: ${d.reason}.`,
          });
          notesPatched++;
        }
      }
    }
    // TARGET side: only PAYROLL-side rows
    if (h.target_domain_id === PAYROLL_ID && h.target_domain_module_id === null) {
      const d = strongestModule(h.data_object_id);
      if (d.mid !== null) {
        await patch(`/handoffs?id=eq.${h.id}`, { target_domain_module_id: d.mid });
        tgtFixed++;
      } else if (!h.notes || h.notes.length === 0) {
        await patch(`/handoffs?id=eq.${h.id}`, {
          notes: `target_domain_module_id left NULL: ${d.reason}.`,
        });
        notesPatched++;
      }
    }
  }
  console.log(`  source-side patched: ${srcFixed}`);
  console.log(`  target-side patched: ${tgtFixed}`);
  console.log(`  notes-only patched: ${notesPatched}`);

  // ---------- 11. SUMMARY ----------
  console.log("\n=================================");
  console.log("FINAL VERIFICATION");
  console.log("=================================\n");
  const finalModules: any[] = await get(`/domain_modules?domain_id=eq.${PAYROLL_ID}&select=id,domain_module_code`);
  console.log(`  modules: ${finalModules.length}`);
  const finalStarters: any[] = await get(`/domain_starter_modules?domain_id=eq.${PAYROLL_ID}&select=id`);
  console.log(`  starter rows: ${finalStarters.length}`);
  const finalCapsJoin: any[] = await get(`/domain_module_capabilities?domain_module_id=in.(${allModuleIds.join(",")})&select=capability_id`);
  console.log(`  module-capability links: ${finalCapsJoin.length}`);
  const finalDmdo: any[] = await get(`/domain_module_data_objects?domain_module_id=in.(${allModuleIds.join(",")})&select=id`);
  console.log(`  module-data_object rows: ${finalDmdo.length}`);
  const outboundCount: any[] = await get(`/handoffs?source_domain_id=eq.${PAYROLL_ID}&select=id`);
  const inboundCount: any[] = await get(`/handoffs?target_domain_id=eq.${PAYROLL_ID}&select=id`);
  const intraCount: any[] = await get(`/handoffs?source_domain_id=eq.${PAYROLL_ID}&target_domain_id=eq.${PAYROLL_ID}&select=id`);
  console.log(`  outbound handoffs (incl intra): ${outboundCount.length}`);
  console.log(`  inbound handoffs (incl intra): ${inboundCount.length}`);
  console.log(`  intra-domain handoffs: ${intraCount.length}`);

  const stillNullSrc: any[] = await get(`/handoffs?source_domain_id=eq.${PAYROLL_ID}&source_domain_module_id=is.null&select=id`);
  const stillNullTgt: any[] = await get(`/handoffs?target_domain_id=eq.${PAYROLL_ID}&target_domain_module_id=is.null&select=id`);
  console.log(`  outbound rows still missing source_module_id: ${stillNullSrc.length}`);
  console.log(`  inbound rows still missing target_module_id: ${stillNullTgt.length}`);

  const stillNullStates: any[] = await get(
    `/data_object_lifecycle_states?data_object_id=in.(138,139,140,141,142,143,144,145)&requires_permission=eq.true&domain_module_id=is.null&select=id,state_name,data_object_id`,
  );
  console.log(`  lifecycle states (permissioned, payroll-master) still missing module: ${stillNullStates.length}`);

  console.log("\nUI:");
  console.log("  https://tests.semantius.app/domain_map/domain_modules");
  console.log("  https://tests.semantius.app/domain_map/handoffs");
  console.log("\nDONE.");
}

main().catch((e) => {
  console.error("\nFATAL:", e?.message || e);
  process.exit(1);
});
