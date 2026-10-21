#!/usr/bin/env bun
// FUND-ADMIN state-driven execute (2026-06-07): additive entity work.
//   M1  : 4 new regulations + 4 domain_regulations links to domain 160
//   W1-4: 4 new master data_objects (subscription_documents, lp_kyc_records,
//         distribution_notices, capital_call_notices) + DMDO master rows +
//         cross-master reference relationships + per-actor user-edges +
//         lifecycle states
//   L1-6: lifecycle states + trigger_events on existing masters
//         (lp_subscriptions, pcap_statements, capital_calls, fund_close_periods,
//          capital_call_responses, waterfall_calculations)
//   B9b : 5 intra-domain handoffs wiring modules 12/13/14/15
//
// Idempotent: every phase reads live by natural key and inserts only what is missing.
// New rows omit record_status (defaults to 'new'). No notes writes. No em-dashes.
//
// Note: B1A-L4 (fund_close_periods) is recorded in state.yaml as blocked_by the
// B2-CLOSE-MODULE decision (module attribution flips if CLOSE-AND-AUDIT splits off).
// We author its states/event on the CURRENT module attribution (12 = FUND-LEDGER),
// which is the live shape today; if the user later splits the module, the
// domain_module_id PATCH is a follow-on. This is additive (no existing value
// overwritten), so it proceeds per Rule #21.

import { $ } from "bun";
$.throws(false);

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
    out.push(...(await call({ method: "POST", path, body: slice })));
  }
  return out;
}

function assertNoEmDash(label: string, s: string): void {
  if (s.includes("—")) throw new Error(`Em-dash in ${label}; rewrite.`);
}

const DOMAIN = 160;
const USERS = 748;

// =====================================================================
// PHASE M1 — regulations + domain_regulations
// =====================================================================
async function phaseM1() {
  console.log("\n== Phase M1: regulations + domain_regulations ==");
  const regs = [
    {
      regulation_name: "SEC Marketing Rule",
      regulation_code: "SEC-206-4-1",
      regulation_type: "financial_reporting",
      jurisdiction_id: 3, // United States
      issuing_body: "SEC",
      description:
        "Rule 206(4)-1 under the Investment Advisers Act governing adviser advertising and LP-facing performance presentation, including net-performance and book-of-record substantiation requirements.",
      applicability: "conditional", // mandatory for US-marketed funds
    },
    {
      regulation_name: "ILPA Reporting Standards",
      regulation_code: "ILPA-RS",
      regulation_type: "industry_standard",
      jurisdiction_id: 1, // International
      issuing_body: "ILPA",
      description:
        "Institutional Limited Partners Association templates and conventions for capital-call notices, distribution notices, and quarterly fee-and-expense reporting to LPs.",
      applicability: "recommended", // voluntary but de-facto-mandatory
    },
    {
      regulation_name: "Common Reporting Standard",
      regulation_code: "CRS",
      regulation_type: "financial_reporting",
      jurisdiction_id: 1, // International (OECD)
      issuing_body: "OECD",
      description:
        "OECD automatic-exchange-of-information standard requiring collection and reporting of LP tax residency and financial-account information across participating jurisdictions.",
      applicability: "conditional", // mandatory for funds accepting CRS-reportable LP capital
    },
    {
      regulation_name: "Cayman Mutual Funds Act",
      regulation_code: "KY-MFA",
      regulation_type: "financial_reporting",
      jurisdiction_id: null, // Cayman jurisdiction not in catalog
      issuing_body: "CIMA",
      description:
        "Cayman Islands Monetary Authority registration, audit, and reporting requirements applicable to Cayman-domiciled investment funds.",
      applicability: "conditional", // mandatory for Cayman-domiciled funds
    },
  ];
  for (const r of regs) assertNoEmDash(r.regulation_name, r.description);

  const existing = await get(`/regulations?select=id,regulation_name&limit=10000`);
  const byName = new Map(existing.map(r => [String(r.regulation_name), Number(r.id)]));
  const missing = regs.filter(r => !byName.has(r.regulation_name));
  if (missing.length) {
    const bodies = missing.map(({ applicability, ...rest }) => rest);
    const created = await insert("/regulations", bodies);
    console.log(`  regulations: inserted ${created.length}`);
    for (const c of created) byName.set(String(c.regulation_name), Number(c.id));
  } else console.log("  regulations: all present");

  // domain_regulations links
  const existingLinks = await get(
    `/domain_regulations?domain_id=eq.${DOMAIN}&select=regulation_id`,
  );
  const linked = new Set(existingLinks.map(r => Number(r.regulation_id)));
  const linkRows = regs
    .map(r => ({ regulation_id: byName.get(r.regulation_name)!, applicability: r.applicability }))
    .filter(r => r.regulation_id && !linked.has(r.regulation_id))
    .map(r => ({ domain_id: DOMAIN, regulation_id: r.regulation_id, applicability: r.applicability }));
  if (linkRows.length) {
    await insert("/domain_regulations", linkRows);
    console.log(`  domain_regulations: linked ${linkRows.length}`);
  } else console.log("  domain_regulations: all present");
}

// =====================================================================
// PHASE W — new master data_objects (W1-W4)
// =====================================================================
async function phaseW(): Promise<Map<string, number>> {
  console.log("\n== Phase W: new master data_objects (W1-W4) ==");
  const objs = [
    {
      data_object_name: "subscription_documents",
      singular_label: "Subscription Document",
      plural_label: "Subscription Documents",
      kind: "domain_owned",
      has_personal_content: false,
      has_submit_lock: true,
      has_single_approver: false,
      entity_type: "operational_workflow",
      description:
        "Executed legal subscription package for an LP subscription: the signed agreement, side documents, and version history that persists across amended subscriptions.",
    },
    {
      data_object_name: "lp_kyc_records",
      singular_label: "LP KYC Record",
      plural_label: "LP KYC Records",
      kind: "domain_owned",
      has_personal_content: true,
      has_submit_lock: false,
      has_single_approver: false,
      entity_type: "operational_workflow",
      description:
        "KYC and AML output for an LP, including sanction-screening results, captured at subscription time and re-screened periodically.",
    },
    {
      data_object_name: "distribution_notices",
      singular_label: "Distribution Notice",
      plural_label: "Distribution Notices",
      kind: "domain_owned",
      has_personal_content: false,
      has_submit_lock: true,
      has_single_approver: false,
      entity_type: "operational_workflow",
      description:
        "LP-facing notice document for a fund distribution, in standard reporting format, with publication timestamps; stored separately from the distribution record.",
    },
    {
      data_object_name: "capital_call_notices",
      singular_label: "Capital Call Notice",
      plural_label: "Capital Call Notices",
      kind: "domain_owned",
      has_personal_content: false,
      has_submit_lock: true,
      has_single_approver: false,
      entity_type: "operational_workflow",
      description:
        "LP-facing notice document for a capital call, in standard reporting format, with publication timestamps; stored separately from the capital-call record.",
    },
  ];
  for (const o of objs) assertNoEmDash(o.data_object_name, o.description);

  const existing = await get(`/data_objects?select=id,data_object_name&limit=10000`);
  const byName = new Map(existing.map(r => [String(r.data_object_name), Number(r.id)]));
  const missing = objs.filter(o => !byName.has(o.data_object_name));
  if (missing.length) {
    const created = await insert("/data_objects", missing);
    console.log(`  data_objects: inserted ${created.length}`);
    for (const c of created) byName.set(String(c.data_object_name), Number(c.id));
  } else console.log("  data_objects: all present");
  return byName;
}

// =====================================================================
// PHASE W2 — DMDO master links for the 4 new masters
// =====================================================================
async function phaseW_DMDO(idOf: (n: string) => number) {
  console.log("\n== Phase W2: DMDO master links ==");
  const rows = [
    { domain_module_id: 13, data_object_id: idOf("subscription_documents"), role: "master", necessity: "required" },
    { domain_module_id: 13, data_object_id: idOf("lp_kyc_records"), role: "master", necessity: "required" },
    { domain_module_id: 15, data_object_id: idOf("distribution_notices"), role: "master", necessity: "required" },
    { domain_module_id: 14, data_object_id: idOf("capital_call_notices"), role: "master", necessity: "required" },
  ];
  const existing = await get(
    `/domain_module_data_objects?domain_module_id=in.(13,14,15)&select=domain_module_id,data_object_id`,
  );
  const seen = new Set(existing.map(r => `${r.domain_module_id}|${r.data_object_id}`));
  const missing = rows.filter(r => !seen.has(`${r.domain_module_id}|${r.data_object_id}`));
  if (missing.length) {
    await insert("/domain_module_data_objects", missing);
    console.log(`  DMDO: inserted ${missing.length}`);
  } else console.log("  DMDO: all present");
}

// =====================================================================
// PHASE W3 — relationships (cross-master + user-edges) for new masters
// =====================================================================
async function phaseW_REL(idOf: (n: string) => number) {
  console.log("\n== Phase W3: relationships for new masters ==");
  const SUBDOC = idOf("subscription_documents");
  const KYC = idOf("lp_kyc_records");
  const DNOTICE = idOf("distribution_notices");
  const CNOTICE = idOf("capital_call_notices");
  // cross-master references authored parent (one) -> child (many) per catalog convention
  // (relationship_type 'many_to_one' is not a valid enum; the FK lives on the child).
  const crossRel = [
    // lp_subscriptions (758) -> subscription_documents : a subscription has many documents
    { data_object_id: 758, related_data_object_id: SUBDOC, relationship_type: "one_to_many", relationship_kind: "composition", relationship_verb: "is documented by", inverse_verb: "documents", owner_side: "source", is_required: true },
    // lp_subscriptions (758) -> lp_kyc_records : a subscription has KYC screening records
    { data_object_id: 758, related_data_object_id: KYC, relationship_type: "one_to_many", relationship_kind: "reference", relationship_verb: "is screened by", inverse_verb: "screens", owner_side: "source", is_required: false },
    // lp_commitments (759) -> lp_kyc_records : a commitment is cleared by KYC records
    { data_object_id: 759, related_data_object_id: KYC, relationship_type: "one_to_many", relationship_kind: "reference", relationship_verb: "is cleared by", inverse_verb: "clears", owner_side: "source", is_required: false },
    // fund_distributions (368) -> distribution_notices : a distribution generates notices
    { data_object_id: 368, related_data_object_id: DNOTICE, relationship_type: "one_to_many", relationship_kind: "composition", relationship_verb: "is notified by", inverse_verb: "notifies", owner_side: "source", is_required: true },
    // capital_calls (367) -> capital_call_notices : a call generates notices
    { data_object_id: 367, related_data_object_id: CNOTICE, relationship_type: "one_to_many", relationship_kind: "composition", relationship_verb: "is notified by", inverse_verb: "notifies", owner_side: "source", is_required: true },
  ];
  // per-actor user edges (Rule #10): related_data_object_id = users (748)
  const userRel = [
    { data_object_id: SUBDOC, related_data_object_id: USERS, relationship_type: "many_to_many", relationship_kind: "reference", relationship_verb: "prepared by", inverse_verb: "prepares", owner_side: "source", is_required: false },
    { data_object_id: SUBDOC, related_data_object_id: USERS, relationship_type: "many_to_many", relationship_kind: "reference", relationship_verb: "countersigned by", inverse_verb: "countersigns", owner_side: "source", is_required: false },
    { data_object_id: KYC, related_data_object_id: USERS, relationship_type: "many_to_many", relationship_kind: "reference", relationship_verb: "screened by", inverse_verb: "screens", owner_side: "source", is_required: false },
    { data_object_id: KYC, related_data_object_id: USERS, relationship_type: "many_to_many", relationship_kind: "reference", relationship_verb: "cleared by", inverse_verb: "clears", owner_side: "source", is_required: false },
    { data_object_id: DNOTICE, related_data_object_id: USERS, relationship_type: "many_to_many", relationship_kind: "reference", relationship_verb: "approved by", inverse_verb: "approves", owner_side: "source", is_required: false },
    { data_object_id: CNOTICE, related_data_object_id: USERS, relationship_type: "many_to_many", relationship_kind: "reference", relationship_verb: "approved by", inverse_verb: "approves", owner_side: "source", is_required: false },
  ];
  const all = [...crossRel, ...userRel];
  const doids = [...new Set(all.map(r => r.data_object_id))].join(",");
  const existing = await get(
    `/data_object_relationships?data_object_id=in.(${doids})&select=data_object_id,related_data_object_id,relationship_verb`,
  );
  const seen = new Set(
    existing.map(r => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`),
  );
  const missing = all.filter(
    r => !seen.has(`${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`),
  );
  if (missing.length) {
    await insert("/data_object_relationships", missing);
    console.log(`  relationships: inserted ${missing.length}`);
  } else console.log("  relationships: all present");
}

// =====================================================================
// PHASE L + W4 — lifecycle states + trigger events
// =====================================================================
type StateSpec = {
  data_object_id: number;
  domain_module_id: number;
  states: { name: string; order: number; initial?: boolean; terminal?: boolean; gate?: boolean; desc: string }[];
};

async function phaseStates(idOf: (n: string) => number) {
  console.log("\n== Phase L + W lifecycle states ==");
  const specs: StateSpec[] = [
    // L1 lp_subscriptions (758) -> module 13
    {
      data_object_id: 758, domain_module_id: 13, states: [
        { name: "drafted", order: 10, initial: true, desc: "Subscription started; documents not yet submitted." },
        { name: "submitted", order: 20, desc: "LP submitted the subscription package for review." },
        { name: "kyc_passed", order: 30, desc: "KYC and AML checks cleared." },
        { name: "executed", order: 40, gate: true, desc: "Subscription countersigned and legally binding." },
        { name: "withdrawn", order: 50, terminal: true, desc: "Subscription withdrawn before execution." },
      ],
    },
    // L2 pcap_statements (760) -> module 13
    {
      data_object_id: 760, domain_module_id: 13, states: [
        { name: "drafted", order: 10, initial: true, desc: "Statement generated from close-period figures." },
        { name: "reviewed", order: 20, desc: "Internally reviewed for accuracy." },
        { name: "published", order: 30, gate: true, terminal: true, desc: "Released to the LP." },
      ],
    },
    // L3 capital_calls (367) -> module 14
    {
      data_object_id: 367, domain_module_id: 14, states: [
        { name: "drafted", order: 10, initial: true, desc: "Call prepared; not yet issued to LPs." },
        { name: "issued", order: 20, gate: true, desc: "Call issued to LPs; notice may publish." },
        { name: "funded", order: 30, desc: "All responses received; call fully funded." },
        { name: "closed", order: 40, terminal: true, desc: "Call reconciled and closed." },
      ],
    },
    // L4 fund_close_periods (757) -> module 12 (current attribution; see header note)
    {
      data_object_id: 757, domain_module_id: 12, states: [
        { name: "open", order: 10, initial: true, desc: "Close period open; entries still posting." },
        { name: "soft_closed", order: 20, desc: "Entries cut off; figures under review." },
        { name: "reviewed", order: 30, desc: "Close reviewed and tied out." },
        { name: "locked", order: 40, gate: true, terminal: true, desc: "Period locked; no further entries." },
      ],
    },
    // L5 capital_call_responses (761) -> module 14
    {
      data_object_id: 761, domain_module_id: 14, states: [
        { name: "scheduled", order: 10, initial: true, desc: "Response line created with allocated amount and due date." },
        { name: "paid", order: 20, desc: "LP funded the allocated amount in full." },
        { name: "partial", order: 30, desc: "LP funded part of the allocated amount." },
        { name: "defaulted", order: 40, gate: true, terminal: true, desc: "LP failed to fund; default handling triggered." },
      ],
    },
    // L6 waterfall_calculations (762) -> module 15
    {
      data_object_id: 762, domain_module_id: 15, states: [
        { name: "drafted", order: 10, initial: true, desc: "Waterfall computed; not yet reviewed." },
        { name: "reviewed", order: 20, desc: "Computation reviewed against the fund agreement." },
        { name: "approved", order: 30, gate: true, terminal: true, desc: "Waterfall approved; distribution may proceed." },
      ],
    },
    // W1 subscription_documents -> module 13
    {
      data_object_id: idOf("subscription_documents"), domain_module_id: 13, states: [
        { name: "drafted", order: 10, initial: true, desc: "Document drafted for the subscription." },
        { name: "signed", order: 20, desc: "Signed by the LP." },
        { name: "countersigned", order: 30, gate: true, desc: "Countersigned by the GP; legally complete." },
        { name: "archived", order: 40, terminal: true, desc: "Filed in the document of record." },
      ],
    },
    // W2 lp_kyc_records -> module 13
    {
      data_object_id: idOf("lp_kyc_records"), domain_module_id: 13, states: [
        { name: "pending", order: 10, initial: true, desc: "Screening initiated." },
        { name: "screened", order: 20, desc: "Screening run; results captured." },
        { name: "cleared", order: 30, gate: true, desc: "Cleared for subscription." },
        { name: "requires_review", order: 40, terminal: true, desc: "Flagged for manual review or escalation." },
      ],
    },
    // W3 distribution_notices -> module 15
    {
      data_object_id: idOf("distribution_notices"), domain_module_id: 15, states: [
        { name: "drafted", order: 10, initial: true, desc: "Notice drafted from the distribution." },
        { name: "reviewed", order: 20, desc: "Reviewed for accuracy." },
        { name: "approved", order: 30, gate: true, desc: "Approved for release." },
        { name: "published", order: 40, terminal: true, desc: "Published to LPs." },
      ],
    },
    // W4 capital_call_notices -> module 14
    {
      data_object_id: idOf("capital_call_notices"), domain_module_id: 14, states: [
        { name: "drafted", order: 10, initial: true, desc: "Notice drafted from the capital call." },
        { name: "reviewed", order: 20, desc: "Reviewed for accuracy." },
        { name: "approved", order: 30, gate: true, desc: "Approved for release." },
        { name: "published", order: 40, terminal: true, desc: "Published to LPs." },
      ],
    },
  ];

  const doids = [...new Set(specs.map(s => s.data_object_id))].join(",");
  const existing = await get(
    `/data_object_lifecycle_states?data_object_id=in.(${doids})&select=data_object_id,state_name`,
  );
  const seen = new Set(existing.map(r => `${r.data_object_id}|${r.state_name}`));
  const rows: Row[] = [];
  for (const s of specs) {
    for (const st of s.states) {
      assertNoEmDash(`${s.data_object_id}.${st.name}`, st.desc);
      if (seen.has(`${s.data_object_id}|${st.name}`)) continue;
      rows.push({
        data_object_id: s.data_object_id,
        domain_module_id: s.domain_module_id,
        state_name: st.name,
        state_order: st.order,
        description: st.desc,
        is_initial: !!st.initial,
        is_terminal: !!st.terminal,
        requires_permission: !!st.gate,
      });
    }
  }
  if (rows.length) {
    await insert("/data_object_lifecycle_states", rows);
    console.log(`  lifecycle_states: inserted ${rows.length}`);
  } else console.log("  lifecycle_states: all present");
}

// =====================================================================
// PHASE EVENTS — new trigger events (L1/L2/L3/L4/L5/L6 + B9b prereqs)
// =====================================================================
async function phaseEvents() {
  console.log("\n== Phase trigger_events ==");
  const events = [
    { event_name: "lp_subscription.submitted", data_object_id: 758, event_category: "state_change", to_state: "submitted", description: "LP submitted the subscription package for review." },
    { event_name: "lp_subscription.executed", data_object_id: 758, event_category: "state_change", to_state: "executed", description: "Subscription countersigned and legally binding." },
    { event_name: "pcap_statement.published", data_object_id: 760, event_category: "state_change", to_state: "published", description: "Partner capital account statement released to the LP." },
    { event_name: "capital_call.drafted", data_object_id: 367, event_category: "lifecycle", to_state: "drafted", description: "Capital call prepared as a draft before issuance." },
    { event_name: "fund_close_period.locked", data_object_id: 757, event_category: "state_change", to_state: "locked", description: "Close period locked; no further entries permitted." },
    { event_name: "capital_call_response.paid", data_object_id: 761, event_category: "state_change", to_state: "paid", description: "LP funded the allocated capital-call amount in full." },
    { event_name: "capital_call_response.defaulted", data_object_id: 761, event_category: "state_change", to_state: "defaulted", description: "LP failed to fund a capital call; default handling triggered." },
    { event_name: "waterfall_calculation.approved", data_object_id: 762, event_category: "state_change", to_state: "approved", description: "Distribution waterfall approved; distribution may proceed." },
    // B9b prerequisite event on lp_commitments (zero events today)
    { event_name: "lp_commitment.committed", data_object_id: 759, event_category: "state_change", to_state: "committed", description: "LP commitment confirmed; first capital-call schedule may begin." },
  ];
  for (const e of events) assertNoEmDash(e.event_name, e.description);
  const existing = await get(`/trigger_events?select=id,event_name&limit=10000`);
  const byName = new Map(existing.map(r => [String(r.event_name), Number(r.id)]));
  const missing = events.filter(e => !byName.has(e.event_name));
  if (missing.length) {
    const created = await insert("/trigger_events", missing);
    console.log(`  trigger_events: inserted ${created.length}`);
    for (const c of created) byName.set(String(c.event_name), Number(c.id));
  } else console.log("  trigger_events: all present");
  return byName;
}

// =====================================================================
// PHASE B9b — intra-domain handoffs (source==target==160)
// =====================================================================
async function phaseHandoffs(evId: (n: string) => number) {
  console.log("\n== Phase B9b: intra-domain handoffs ==");
  const rows = [
    // FUND-LEDGER 12 -> LP-COMMITMENTS 13 on fund.final_close (1185), payload funds(755)
    { source_domain_module_id: 12, target_domain_module_id: 13, data_object_id: 755, trigger_event_id: 1185,
      description: "Fund final close opens LP onboarding and locks the commitment book in LP-Commitments." },
    // LP-COMMITMENTS 13 -> CAPITAL-CALLS 14 on lp_commitment.committed, payload lp_commitments(759)
    { source_domain_module_id: 13, target_domain_module_id: 14, data_object_id: 759, trigger_event_id: evId("lp_commitment.committed"),
      description: "A confirmed LP commitment seeds the first capital-call schedule in Capital-Calls." },
    // CAPITAL-CALLS 14 -> LP-COMMITMENTS 13 on capital_call.funded (1186), payload lp_commitments(759)
    { source_domain_module_id: 14, target_domain_module_id: 13, data_object_id: 759, trigger_event_id: 1186,
      description: "A funded capital call advances each LP's called-to-date balance on the commitment record." },
    // DISTRIBUTIONS 15 -> LP-COMMITMENTS 13 on fund_distribution.executed (1187), payload lp_commitments(759)
    { source_domain_module_id: 15, target_domain_module_id: 13, data_object_id: 759, trigger_event_id: 1187,
      description: "An executed distribution updates each LP's distributed-to-date balance on the commitment record." },
    // DISTRIBUTIONS 15 -> FUND-LEDGER 12 on fund_distribution.executed (1187), payload fund_ledger_entries(756)
    { source_domain_module_id: 15, target_domain_module_id: 12, data_object_id: 756, trigger_event_id: 1187,
      description: "An executed distribution posts the corresponding entries to the fund general ledger." },
  ].map(r => ({
    source_domain_id: DOMAIN,
    target_domain_id: DOMAIN,
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    ...r,
  }));
  for (const r of rows) {
    if (!r.trigger_event_id) throw new Error(`Missing trigger_event_id for handoff ${JSON.stringify(r)}`);
    assertNoEmDash("handoff", String(r.description));
  }
  const existing = await get(
    `/handoffs?source_domain_id=eq.${DOMAIN}&target_domain_id=eq.${DOMAIN}&select=source_domain_module_id,target_domain_module_id,data_object_id,trigger_event_id`,
  );
  const seen = new Set(
    existing.map(r => `${r.source_domain_module_id}|${r.target_domain_module_id}|${r.data_object_id}|${r.trigger_event_id}`),
  );
  const missing = rows.filter(
    r => !seen.has(`${r.source_domain_module_id}|${r.target_domain_module_id}|${r.data_object_id}|${r.trigger_event_id}`),
  );
  if (missing.length) {
    await insert("/handoffs", missing);
    console.log(`  handoffs: inserted ${missing.length}`);
  } else console.log("  handoffs: all present");
}

// =====================================================================
async function main() {
  await phaseM1();
  const objMap = await phaseW();
  const idOf = (n: string) => {
    const v = objMap.get(n);
    if (!v) throw new Error(`Unknown data_object ${n}`);
    return v;
  };
  await phaseW_DMDO(idOf);
  await phaseW_REL(idOf);
  await phaseStates(idOf);
  const evMap = await phaseEvents();
  const evId = (n: string) => {
    const v = evMap.get(n);
    if (!v) throw new Error(`Unknown trigger_event ${n}`);
    return v;
  };
  await phaseHandoffs(evId);

  console.log("\nDone. UI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/data_object_lifecycle_states");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/handoffs");
  console.log("  https://tests.semantius.app/domain_map/regulations");
}
await main();
