#!/usr/bin/env bun
// CAP-TABLE state-driven Validate execute pass (2026-06-07).
// Works ONLY the EXECUTE-classified open items from audits/CAP-TABLE/state.yaml:
//   - B1A-ENTITY-TYPE: classify 11 unclassified masters (Rule #12 enum).
//   - Catalog UX (Rule #20): backfill empty catalog_tagline/catalog_description on
//     the domain row + 6 modules (buyer voice; write only when current value empty).
//   - B1A-S3: INSERT 6 missing trigger_events.
//   - B1A-S6: INSERT lifecycle states for workflow-bearing masters whose entity_type
//     classification requires them (option_pools, employee_equity_accounts,
//     asc718_expense_periods). shareholder_records (operational_record) and
//     exit_waterfall_calculations (computed) are exempt by classification.
//   - B1B-S2: INSERT 10 intra-domain handoff rows.
//   - B1B-S9b: INSERT 6 regulations + 6 domain_regulations attaching them to CAP-TABLE.
//
// Idempotent throughout: every phase reads live state and inserts/patches only the gap.
// record_status omitted on all new rows (Rule #1 default 'new'). notes never written (Rule #15).

import {} from "bun";

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
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });

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
async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

const DOMAIN = 162;
// Master data_object ids (verified live).
const DO = {
  equity_grants: 158,
  cap_tables: 770,
  security_classes: 771,
  shareholder_records: 772,
  option_pools: 773,
  vesting_schedules: 774,
  valuations_409a: 775,
  asc718_expense_periods: 776,
  exit_scenarios: 777,
  exit_waterfall_calculations: 778,
  employee_equity_accounts: 779,
  secondary_transactions: 780,
};
// Module ids (verified live).
const MOD = {
  LEDGER: 20,
  GRANTS: 21,
  VALUATIONS: 22,
  EXIT: 23,
  PORTAL: 24,
  SECONDARY: 25,
};

const summary: string[] = [];

// ============================================================
// PHASE 1 - entity_type classification (B1A-ENTITY-TYPE, Rule #12)
// ============================================================
const entityTypes: Record<number, string> = {
  [DO.cap_tables]: "operational_workflow", // nascent->active->exit ledger lifecycle
  [DO.security_classes]: "catalog", // config: share-class definitions
  [DO.shareholder_records]: "operational_record", // per-holder ledger record
  [DO.option_pools]: "operational_workflow", // board-approval gated pool
  [DO.vesting_schedules]: "catalog", // template applied to grants
  [DO.valuations_409a]: "operational_workflow", // drafted->reviewed->final->superseded
  [DO.asc718_expense_periods]: "operational_workflow", // open->closed accounting period
  [DO.exit_scenarios]: "operational_workflow", // hypothetical->committed->executed
  [DO.exit_waterfall_calculations]: "computed", // derived from scenario + cap table
  [DO.employee_equity_accounts]: "operational_workflow", // provisioned->active->terminated
  [DO.secondary_transactions]: "operational_workflow", // drafted->approved->executed->settled
};
{
  console.log("PHASE 1: entity_type classification");
  const ids = Object.keys(entityTypes).join(",");
  const live = await get(
    `/data_objects?id=in.(${ids})&select=id,data_object_name,entity_type`,
  );
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const want = entityTypes[id];
    const cur = r.entity_type;
    if (cur === null || cur === "" || cur === "unclassified") {
      await patch(`/data_objects?id=eq.${id}`, { entity_type: want });
      console.log(`  PATCH ${r.data_object_name} (${id}) entity_type -> ${want}`);
      patched++;
    } else {
      console.log(`  skip ${r.data_object_name} (${id}) already '${cur}'`);
    }
  }
  summary.push(`entity_type classified: ${patched}`);
}

// ============================================================
// PHASE 2 - catalog UX backfill (Rule #20). Write only when empty.
// ============================================================
const domainCatalog = {
  tagline:
    "Run your company's shareholder ledger, equity grants, and 409A valuations from one source of truth.",
  description:
    "Keep a single, accurate record of who owns what across founders, investors, and employees. Issue and approve stock and option grants, manage your option pool, and track vesting through to exercise. Order 409A valuations, account for stock-based compensation under ASC 718, model exit waterfalls to see what each shareholder receives, and process secondary transfers. Give employees a self-service portal to view and accept their equity, all kept consistent as your company raises rounds and grows.",
};
const moduleCatalog: Record<string, { tagline: string; description: string }> = {
  "CAP-TABLE-LEDGER": {
    tagline:
      "Maintain an accurate, always-current shareholder ledger across every security class.",
    description:
      "Track every shareholder, share class, and certificate in one authoritative ledger. Record issuances, transfers, and ownership changes as your company evolves, and see fully-diluted ownership at a glance. The ledger stays consistent with grants, valuations, and exit scenarios so the numbers always reconcile.",
  },
  "CAP-TABLE-GRANTS": {
    tagline:
      "Issue, approve, and manage stock and option grants with the option pool always in view.",
    description:
      "Propose and approve equity grants, set strike prices against the current 409A, and apply vesting schedules. Manage your option pool so you always know what's reserved, granted, and available, and refresh it when the board approves more. Handle exercises and forfeitures, and keep grants in sync with the ledger and the employee portal throughout their life.",
  },
  "CAP-TABLE-VALUATIONS": {
    tagline:
      "Order 409A valuations and run ASC 718 stock-based compensation expense.",
    description:
      "Capture and finalize 409A fair-market-value determinations that set the strike price for new grants, with a clear review-and-approval trail. Calculate stock-based compensation expense across reporting periods under ASC 718 so finance can book the right numbers and close each period with confidence.",
  },
  "CAP-TABLE-EXIT-MODELING": {
    tagline:
      "Model acquisitions and IPOs to see exactly what each shareholder takes home.",
    description:
      "Build exit scenarios at any valuation and watch the waterfall distribute proceeds through liquidation preferences, participation, and common shares. Compare outcomes for founders, investors, and option holders, commit the scenario the board approves, and apply the result back to the ledger when the exit closes.",
  },
  "CAP-TABLE-EMPLOYEE-PORTAL": {
    tagline:
      "Give employees a clear, self-service view of their equity and vesting.",
    description:
      "Let employees see their grants, vested and unvested shares, and current value in one place. They can accept new grants, follow their vesting schedule, and start an exercise without back-and-forth emails, while every action stays reconciled with the grant records and the ledger.",
  },
  "CAP-TABLE-SECONDARY": {
    tagline:
      "Process secondary share transfers between holders with the right approvals.",
    description:
      "Handle the sale or transfer of shares between existing holders and new buyers, from drafting the transaction through approval, execution, and settlement. Enforce right-of-first-refusal and approval gates, then move the shares cleanly in the ledger and adjust affected grants once the transfer settles.",
  },
};
{
  console.log("PHASE 2: catalog UX backfill");
  let domWrites = 0;
  const [dom] = await get(
    `/domains?id=eq.${DOMAIN}&select=id,catalog_tagline,catalog_description`,
  );
  const dpatch: Row = {};
  if (!dom.catalog_tagline) dpatch.catalog_tagline = domainCatalog.tagline;
  if (!dom.catalog_description) dpatch.catalog_description = domainCatalog.description;
  if (Object.keys(dpatch).length > 0) {
    await patch(`/domains?id=eq.${DOMAIN}`, dpatch);
    console.log(`  PATCH domain ${DOMAIN} catalog UX: ${Object.keys(dpatch).join(", ")}`);
    domWrites++;
  }
  let modWrites = 0;
  const mods = await get(
    `/domain_modules?domain_id=eq.${DOMAIN}&select=id,domain_module_code,catalog_tagline,catalog_description`,
  );
  for (const m of mods) {
    const code = String(m.domain_module_code);
    const copy = moduleCatalog[code];
    if (!copy) continue;
    const mpatch: Row = {};
    if (!m.catalog_tagline) mpatch.catalog_tagline = copy.tagline;
    if (!m.catalog_description) mpatch.catalog_description = copy.description;
    if (Object.keys(mpatch).length > 0) {
      await patch(`/domain_modules?id=eq.${m.id}`, mpatch);
      console.log(`  PATCH module ${code} (${m.id}) catalog UX: ${Object.keys(mpatch).join(", ")}`);
      modWrites++;
    } else {
      console.log(`  skip module ${code} catalog UX (already populated)`);
    }
  }
  summary.push(`catalog UX written: domain ${domWrites}, modules ${modWrites}`);
}

// ============================================================
// PHASE 3 - trigger_events (B1A-S3). 6 new events, idempotent on event_name.
// ============================================================
const newEvents = [
  { event_name: "cap_table.exit_initiated", event_category: "state_change", data_object_id: DO.cap_tables, description: "Issuer enters an exit process; cap-table moves toward wind-down." },
  { event_name: "exit_scenario.committed", event_category: "state_change", data_object_id: DO.exit_scenarios, description: "Board commits to a modeled exit scenario as the operating plan." },
  { event_name: "secondary_transaction.approved", event_category: "state_change", data_object_id: DO.secondary_transactions, description: "Secondary share transfer approved and cleared to execute." },
  { event_name: "equity_grant.exercised", event_category: "state_change", data_object_id: DO.equity_grants, description: "Grantee exercises vested options; shares issue into the ledger." },
  { event_name: "secondary_transaction.settled", event_category: "state_change", data_object_id: DO.secondary_transactions, description: "Secondary transfer settled; shares move between holders." },
  { event_name: "option_pool.refreshed", event_category: "lifecycle", data_object_id: DO.option_pools, description: "Board approves additional reserved shares into the option pool." },
];
{
  console.log("PHASE 3: trigger_events");
  const names = newEvents.map(e => e.event_name).join(",");
  const live = await get(`/trigger_events?event_name=in.(${names})&select=id,event_name`);
  const have = new Set(live.map(r => String(r.event_name)));
  const missing = newEvents.filter(e => !have.has(e.event_name));
  if (missing.length) {
    await insert("/trigger_events", missing as Row[]);
    console.log(`  inserted ${missing.length} trigger_events`);
  } else {
    console.log("  all trigger_events already present");
  }
  summary.push(`trigger_events inserted: ${missing.length}`);
}

// Build event_name -> id map (after insert) for handoff wiring.
const eventMap = new Map<string, number>();
{
  const needed = [
    "equity_grant.approved", "equity_grant.granted", "equity_grant.vested",
    "valuation_409a.final", "exit_scenario.executed", "equity_grant.exercised",
    "secondary_transaction.settled", "option_pool.refreshed",
  ];
  const live = await get(
    `/trigger_events?event_name=in.(${needed.join(",")})&select=id,event_name`,
  );
  for (const r of live) eventMap.set(String(r.event_name), Number(r.id));
}

// ============================================================
// PHASE 4 - lifecycle states (B1A-S6). Only entity_type=operational_workflow
// masters that currently carry zero states. Idempotent on (data_object_id,state_name).
// ============================================================
type LcSpec = {
  data_object_id: number;
  domain_module_id: number;
  states: { state_name: string; state_order: number; description: string; is_initial?: boolean; is_terminal?: boolean; requires_permission?: boolean }[];
};
const lifecycleSpecs: LcSpec[] = [
  {
    data_object_id: DO.option_pools,
    domain_module_id: MOD.GRANTS,
    states: [
      { state_name: "proposed", state_order: 10, description: "Pool size proposed, awaiting board approval.", is_initial: true },
      { state_name: "board_approved", state_order: 20, description: "Board has authorized the reserved pool size.", requires_permission: true },
      { state_name: "active", state_order: 30, description: "Pool is open for grant reservations and exercises." },
      { state_name: "exhausted", state_order: 40, description: "Reserved shares fully allocated; no headroom remains.", is_terminal: true },
      { state_name: "refreshed", state_order: 50, description: "Board approved additional shares; pool headroom restored.", requires_permission: true },
    ],
  },
  {
    data_object_id: DO.employee_equity_accounts,
    domain_module_id: MOD.PORTAL,
    states: [
      { state_name: "provisioned", state_order: 10, description: "Portal account created for the employee.", is_initial: true },
      { state_name: "active", state_order: 20, description: "Employee can view and act on their equity." },
      { state_name: "terminated", state_order: 30, description: "Employment ended; account in post-termination window.", requires_permission: true },
      { state_name: "offboarded", state_order: 40, description: "Post-termination exercise window closed; account archived.", is_terminal: true },
    ],
  },
  {
    data_object_id: DO.asc718_expense_periods,
    domain_module_id: MOD.VALUATIONS,
    states: [
      { state_name: "open", state_order: 10, description: "Accounting period open; stock-based-comp expense accruing.", is_initial: true },
      { state_name: "closed", state_order: 20, description: "Period closed and locked; expense booked to the ledger.", is_terminal: true, requires_permission: true },
    ],
  },
];
{
  console.log("PHASE 4: lifecycle states");
  let inserted = 0;
  for (const spec of lifecycleSpecs) {
    const live = await get(
      `/data_object_lifecycle_states?data_object_id=eq.${spec.data_object_id}&select=id,state_name`,
    );
    const have = new Set(live.map(r => String(r.state_name)));
    const rows = spec.states
      .filter(s => !have.has(s.state_name))
      .map(s => ({
        data_object_id: spec.data_object_id,
        domain_module_id: spec.domain_module_id,
        state_name: s.state_name,
        state_order: s.state_order,
        description: s.description,
        is_initial: s.is_initial ?? false,
        is_terminal: s.is_terminal ?? false,
        requires_permission: s.requires_permission ?? false,
      }));
    if (rows.length) {
      await insert("/data_object_lifecycle_states", rows as Row[]);
      console.log(`  +${rows.length} states on data_object ${spec.data_object_id}`);
      inserted += rows.length;
    } else {
      console.log(`  data_object ${spec.data_object_id} states already present`);
    }
  }
  summary.push(`lifecycle states inserted: ${inserted}`);
}

// ============================================================
// PHASE 5 - intra-domain handoffs (B1B-S2). 10 rows, source=target=162.
// Idempotent on (source,target,data_object,trigger_event_id).
// ============================================================
type HoSpec = { src: number; tgt: number; data_object_id: number; event: string; description: string };
const handoffSpecs: HoSpec[] = [
  { src: MOD.GRANTS, tgt: MOD.PORTAL, data_object_id: DO.equity_grants, event: "equity_grant.approved", description: "Approved grant exposed to the employee in the equity portal." },
  { src: MOD.GRANTS, tgt: MOD.PORTAL, data_object_id: DO.equity_grants, event: "equity_grant.granted", description: "Granted award opens the acceptance workflow in the portal." },
  { src: MOD.GRANTS, tgt: MOD.PORTAL, data_object_id: DO.equity_grants, event: "equity_grant.vested", description: "Vesting checkpoint refreshes the employee's vested-share balance." },
  { src: MOD.VALUATIONS, tgt: MOD.GRANTS, data_object_id: DO.equity_grants, event: "valuation_409a.final", description: "Finalized 409A refreshes the strike-price floor on draft grants." },
  { src: MOD.VALUATIONS, tgt: MOD.LEDGER, data_object_id: DO.cap_tables, event: "valuation_409a.final", description: "Finalized 409A refreshes fair-market value on the cap table." },
  { src: MOD.EXIT, tgt: MOD.LEDGER, data_object_id: DO.cap_tables, event: "exit_scenario.executed", description: "Executed exit scenario applied to the cap table as actual." },
  { src: MOD.GRANTS, tgt: MOD.LEDGER, data_object_id: DO.shareholder_records, event: "equity_grant.exercised", description: "Exercised options issue shares into the shareholder ledger." },
  { src: MOD.SECONDARY, tgt: MOD.LEDGER, data_object_id: DO.shareholder_records, event: "secondary_transaction.settled", description: "Settled secondary transfer moves shares between holders in the ledger." },
  { src: MOD.SECONDARY, tgt: MOD.GRANTS, data_object_id: DO.equity_grants, event: "secondary_transaction.settled", description: "Settled secondary transfer cancels exercised-but-unsettled grant lines." },
  { src: MOD.LEDGER, tgt: MOD.GRANTS, data_object_id: DO.option_pools, event: "option_pool.refreshed", description: "Pool refresh updates reserved-share headroom for new grants." },
];
{
  console.log("PHASE 5: intra-domain handoffs");
  const live = await get(
    `/handoffs?source_domain_id=eq.${DOMAIN}&target_domain_id=eq.${DOMAIN}&select=id,data_object_id,trigger_event_id,source_domain_module_id,target_domain_module_id`,
  );
  const liveKey = new Set(
    live.map(r => `${r.source_domain_module_id}|${r.target_domain_module_id}|${r.data_object_id}|${r.trigger_event_id}`),
  );
  const rows: Row[] = [];
  for (const h of handoffSpecs) {
    const eid = eventMap.get(h.event);
    if (!eid) throw new Error(`missing trigger_event id for ${h.event}`);
    const key = `${h.src}|${h.tgt}|${h.data_object_id}|${eid}`;
    if (liveKey.has(key)) {
      console.log(`  skip ${h.event} ${h.src}->${h.tgt} (exists)`);
      continue;
    }
    rows.push({
      source_domain_id: DOMAIN,
      target_domain_id: DOMAIN,
      source_domain_module_id: h.src,
      target_domain_module_id: h.tgt,
      data_object_id: h.data_object_id,
      trigger_event_id: eid,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      description: h.description,
    });
  }
  if (rows.length) {
    await insert("/handoffs", rows);
    console.log(`  inserted ${rows.length} intra-domain handoffs`);
  }
  summary.push(`intra-domain handoffs inserted: ${rows.length}`);
}

// ============================================================
// PHASE 6 - regulations + domain_regulations (B1B-S9b).
// Author 6 regulations then attach to CAP-TABLE. Idempotent on regulation_code.
// ============================================================
const USA = 3;
const regSpecs = [
  { regulation_code: "IRC-409A", regulation_name: "IRS Section 409A", regulation_type: "financial_reporting", jurisdiction_id: USA, issuing_body: "Internal Revenue Service", certification_required: true, description: "Governs fair-market-value determination for deferred compensation, including the 409A valuation that sets option strike prices for private-company equity.", applicability: "mandatory" },
  { regulation_code: "ASC-718", regulation_name: "ASC 718 Stock-Based Compensation", regulation_type: "accounting_standard", jurisdiction_id: USA, issuing_body: "Financial Accounting Standards Board", certification_required: false, description: "US GAAP standard for measuring and recognizing the expense of stock-based compensation awards over the vesting period.", applicability: "mandatory" },
  { regulation_code: "SEC-RULE-701", regulation_name: "SEC Rule 701", regulation_type: "financial_reporting", jurisdiction_id: USA, issuing_body: "Securities and Exchange Commission", certification_required: false, description: "Exemption allowing private companies to issue equity compensation to employees and service providers without full securities registration, subject to disclosure thresholds.", applicability: "mandatory" },
  { regulation_code: "SEC-REG-D", regulation_name: "SEC Regulation D / Form D", regulation_type: "financial_reporting", jurisdiction_id: USA, issuing_body: "Securities and Exchange Commission", certification_required: false, description: "Private-placement exemption framework; Form D is the notice filing required after selling securities in an exempt offering.", applicability: "conditional" },
  { regulation_code: "IRS-FORM-3921", regulation_name: "IRS Form 3921", regulation_type: "financial_reporting", jurisdiction_id: USA, issuing_body: "Internal Revenue Service", certification_required: false, description: "Annual information return reporting the exercise of incentive stock options to the IRS and the optionee.", applicability: "mandatory" },
  { regulation_code: "IRS-FORM-3922", regulation_name: "IRS Form 3922", regulation_type: "financial_reporting", jurisdiction_id: USA, issuing_body: "Internal Revenue Service", certification_required: false, description: "Annual information return reporting the transfer of stock acquired through an employee stock purchase plan.", applicability: "conditional" },
];
{
  console.log("PHASE 6: regulations + domain_regulations");
  const codes = regSpecs.map(r => r.regulation_code).join(",");
  const live = await get(`/regulations?regulation_code=in.(${codes})&select=id,regulation_code`);
  const codeToId = new Map<string, number>();
  for (const r of live) codeToId.set(String(r.regulation_code), Number(r.id));
  const missing = regSpecs.filter(r => !codeToId.has(r.regulation_code));
  if (missing.length) {
    const regRows = missing.map(({ applicability, ...rest }) => rest);
    await insert("/regulations", regRows as Row[]);
    console.log(`  inserted ${missing.length} regulations`);
    const re = await get(`/regulations?regulation_code=in.(${codes})&select=id,regulation_code`);
    codeToId.clear();
    for (const r of re) codeToId.set(String(r.regulation_code), Number(r.id));
  } else {
    console.log("  all 6 regulations already exist");
  }
  // Attach via domain_regulations, idempotent on (domain_id, regulation_id).
  const liveAttach = await get(
    `/domain_regulations?domain_id=eq.${DOMAIN}&select=id,regulation_id`,
  );
  const attached = new Set(liveAttach.map(r => Number(r.regulation_id)));
  const attachRows: Row[] = [];
  for (const r of regSpecs) {
    const rid = codeToId.get(r.regulation_code);
    if (!rid) throw new Error(`no id for regulation ${r.regulation_code}`);
    if (attached.has(rid)) {
      console.log(`  skip attach ${r.regulation_code} (already attached)`);
      continue;
    }
    attachRows.push({ domain_id: DOMAIN, regulation_id: rid, applicability: r.applicability });
  }
  if (attachRows.length) {
    await insert("/domain_regulations", attachRows);
    console.log(`  inserted ${attachRows.length} domain_regulations`);
  }
  summary.push(`regulations inserted: ${missing.length}; domain_regulations attached: ${attachRows.length}`);
}

console.log("\n==== SUMMARY ====");
for (const s of summary) console.log("  " + s);
console.log("\nUI links:");
console.log("  https://tests.semantius.app/domain_map/data_objects");
console.log("  https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.162");
console.log("  https://tests.semantius.app/domain_map/trigger_events");
console.log("  https://tests.semantius.app/domain_map/data_object_lifecycle_states");
console.log("  https://tests.semantius.app/domain_map/handoffs?source_domain_id=eq.162");
console.log("  https://tests.semantius.app/domain_map/domain_regulations?domain_id=eq.162");
