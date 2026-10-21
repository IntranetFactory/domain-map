#!/usr/bin/env bun
// Loads the SPEND-MGMT (Corporate Spend Management) market into the domain_map module.
//
// Phase A — 1 new domain, 7 new capabilities, 4 cross-links to existing caps,
//           6 new vendors + 1 Rydoo, 6 new solutions + 1 Rydoo,
//           solution_domains (incl. reclassification of Ramp/Brex from EXPENSE-primary to EXPENSE-secondary),
//           solution_capabilities matrix.
// Phase B — 1 new data_object (spend_requests), domain_data_objects (incl. multi-master backfill for
//           corporate_cards & card_transactions), 10 cross_domain_handoffs.
// Phase C — business_function_domains (AP owner, Procurement + Treasury contributors).
//
// Idempotent. Run from project root: bun run .tmp_deploy/load_spend_mgmt.ts

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
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

async function syncTable<T extends Row>(
  path: string,
  rows: T[],
  keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new rows into ${path} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} already present, nothing to insert`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// ============================================================
// PHASE A — DOMAIN
// ============================================================
type DomainRow = {
  domain_code: string;
  domain_name: string;
  description: string;
  crud_percentage: number;
  business_logic: string;
  min_org_size: string;
  cost_band: string;
  certification_required: boolean;
  usa_market_size_usd_m: number;
  market_size_source_year: number;
};

function validateDomainRow(d: DomainRow): void {
  const errs: string[] = [];
  if (!d.domain_code) errs.push("domain_code empty");
  if (!d.domain_name) errs.push("domain_name empty");
  if (!d.description) errs.push("description empty");
  if (d.crud_percentage === 0) errs.push("crud_percentage is 0 (must be assessed)");
  if (d.crud_percentage < 0 || d.crud_percentage > 100) errs.push("crud_percentage out of range");
  if (d.min_org_size === "") errs.push("min_org_size empty");
  if (d.cost_band === "") errs.push("cost_band empty");
  if (d.business_logic === "" && d.crud_percentage < 95) errs.push("business_logic empty but crud_percentage < 95");
  if (d.usa_market_size_usd_m === 0) errs.push("usa_market_size_usd_m is 0");
  if (d.market_size_source_year === 0) errs.push("market_size_source_year is 0");
  if (errs.length > 0) {
    throw new Error(`Domain row ${d.domain_code} failed validation: ${errs.join("; ")}`);
  }
}

const newDomains: DomainRow[] = [
  {
    domain_code: "SPEND-MGMT",
    domain_name: "Corporate Spend Management",
    description:
      "Unified employee-initiated spend across corporate cards, expense reimbursement, vendor bill pay, and pre-spend approval — anchored on real-time card authorization and policy enforcement at the network layer. Distinct from EXPENSE (post-hoc reimbursement / reconciliation of bank-issued cards), S2P (sourcing-led enterprise procurement with three-way-match), and AP-AUTO (invoice OCR + match + payment). Pure-play vendors: Ramp, Brex, Airwallex, Pleo, Mesh Payments, Navan, Spendesk, BILL Spend & Expense. Modern stack collapses several previously-siloed workflows (card issuance + expense + bill pay + approval) into one platform; monetises primarily on interchange.",
    crud_percentage: 70,
    business_logic:
      "Real-time card-auth decisioning at the payment network (ms-latency decline based on MCC / vendor / amount / time / geography rules); ML-driven merchant categorization and receipt auto-matching; multi-currency FX and treasury netting; bill-pay routing (ACH / wire / card / check) with approval chains; spend anomaly detection.",
    min_org_size: "20 s <500",
    cost_band: "$",
    certification_required: false,
    usa_market_size_usd_m: 2200,
    market_size_source_year: 2024,
  },
];

for (const d of newDomains) validateDomainRow(d);

// ============================================================
// PHASE A — NEW CAPABILITIES
// ============================================================
const newCapabilities = [
  {
    capability_code: "SPEND-CARD-ISSUANCE",
    capability_name: "Corporate Card Issuance and Lifecycle",
    description:
      "Issuance, activation, freezing, and termination of physical and virtual corporate cards. Includes single-use, vendor-locked, and budget-bound virtual cards; per-cardholder limits; and integration with BIN-sponsor banks for the underlying card program.",
  },
  {
    capability_code: "SPEND-CARD-AUTH",
    capability_name: "Real-Time Card Authorization Controls",
    description:
      "Network-side rule evaluation on each card authorization request — MCC, vendor, amount, time-of-day, geography, and per-card budget — with ms-latency decline of out-of-policy transactions before settlement.",
  },
  {
    capability_code: "SPEND-REIMBURSEMENT",
    capability_name: "Out-of-Pocket Reimbursement Workflow",
    description:
      "Employee-initiated reimbursement request without an underlying corporate-card transaction — receipt upload, policy check, approval, and ACH payout. Distinct from card-driven expense lines.",
  },
  {
    capability_code: "SPEND-BILL-PAY",
    capability_name: "Vendor Bill Pay Automation",
    description:
      "Ingest vendor invoices (PDF / email / portal) for direct payment via ACH, wire, card, or check, with approval routing, bank-detail enrichment, and reconciliation to GL — without requiring PO match or sourcing workflow.",
  },
  {
    capability_code: "SPEND-PRE-APPROVAL",
    capability_name: "Pre-Spend Request and Approval",
    description:
      "Proactive employee request for spend authorization before any transaction — virtual card issuance, raised card limit, vendor bill, or reimbursement budget. Approval becomes the enforceable commitment used at card-auth or bill-pay time.",
  },
  {
    capability_code: "SPEND-FX-TREASURY",
    capability_name: "Multi-Currency Spend and FX Treasury",
    description:
      "Multi-currency cards and bill pay with bank-grade FX rates, optional currency hedging, treasury netting across entities, and local-currency disbursement to reduce cross-border fees.",
  },
  {
    capability_code: "SPEND-ANALYTICS",
    capability_name: "Spend Analytics and Anomaly Detection",
    description:
      "Aggregated spend dashboards by department / vendor / merchant / cost-center; trend and variance reporting; ML anomaly detection for unusual spend patterns; vendor consolidation insights.",
  },
];

// Existing capabilities to also link to SPEND-MGMT (already exist with other domain links).
// We do not insert these — only add capability_domains junction rows.
const existingCapsToCrossLink = [
  "CORP-CARD",          // 74 — corporate card reconciliation
  "EXPENSE-CAPTURE",    // 72 — receipt capture + expense entry
  "EXPENSE-POLICY",     // 73 — expense policy enforcement
  "APPROVAL-WORKFLOW",  // 311 — cross-cutting approval workflow
];

// ============================================================
// PHASE A — NEW VENDORS
// ============================================================
const newVendors = [
  {
    vendor_name: "Airwallex",
    vendor_url: "https://www.airwallex.com",
    headquarters_country: "Singapore",
    description: "Global payments and financial platform combining multi-currency accounts, corporate cards, spend management, FX, and embedded finance APIs.",
    notes: "Founded 2015 in Melbourne; HQ now Singapore with major presence in Australia, US, UK, China. Independent, late-stage venture-backed. Spend Management module sits alongside payments and treasury.",
  },
  {
    vendor_name: "Pleo",
    vendor_url: "https://www.pleo.io",
    headquarters_country: "Denmark",
    description: "European corporate-card and spend-management platform aimed at SMB and mid-market.",
    notes: "Founded 2015, HQ Copenhagen. Independent, venture-backed. Strong in DACH, Nordics, UK, BeNeLux.",
  },
  {
    vendor_name: "Mesh Payments",
    vendor_url: "https://www.meshpayments.com",
    headquarters_country: "USA",
    description: "Travel and spend-management platform with virtual cards, SaaS-spend optimisation, and bill-pay.",
    notes: "Founded 2018, HQ New York. Independent, venture-backed. Strong product slant toward SaaS subscription discovery via card-transaction enrichment.",
  },
  {
    vendor_name: "Navan",
    vendor_url: "https://www.navan.com",
    headquarters_country: "USA",
    description: "Combined corporate-travel and spend-management platform (formerly TripActions).",
    notes: "Founded 2015 as TripActions, rebranded Navan in 2023. HQ Palo Alto. Navan Liquid is the corporate-card + expense + bill-pay product alongside Navan Travel.",
  },
  {
    vendor_name: "Spendesk",
    vendor_url: "https://www.spendesk.com",
    headquarters_country: "France",
    description: "European spend-management platform with corporate cards, expense, bill-pay, and budget controls.",
    notes: "Founded 2016, HQ Paris. Independent, venture-backed. Targets mid-market Europe.",
  },
  {
    vendor_name: "BILL",
    vendor_url: "https://www.bill.com",
    headquarters_country: "USA",
    description: "Financial-operations platform for SMBs covering AP, AR, bill-pay, and spend & expense (formerly Divvy).",
    notes: "Public (NYSE: BILL). Acquired Divvy in 2021 (~$2.5B) to add corporate cards and spend management, now BILL Spend & Expense. HQ San Jose.",
  },
  {
    vendor_name: "Rydoo",
    vendor_url: "https://www.rydoo.com",
    headquarters_country: "Belgium",
    description: "European expense management and travel-expense platform.",
    notes: "Founded as Xpenditure (2011, Mechelen, BE); rebranded Rydoo after the 2017 merger with iAlbatros. Independent.",
  },
];

// ============================================================
// PHASE A — NEW SOLUTIONS
// ============================================================
// Note: solution_name is the natural key; vendor_id resolved at load time.
const newSolutions = [
  { solution_name: "Airwallex Spend",        vendor: "Airwallex",      url: "https://www.airwallex.com/spend-management",                 type: "saas", description: "Multi-currency corporate cards, expense management, and reimbursements within the Airwallex financial platform." },
  { solution_name: "Pleo",                   vendor: "Pleo",           url: "https://www.pleo.io",                                         type: "saas", description: "Corporate-card-led spend management with expense, reimbursement, and bill-pay for SMB and mid-market." },
  { solution_name: "Mesh Payments",          vendor: "Mesh Payments",  url: "https://www.meshpayments.com",                                type: "saas", description: "Travel and spend management with virtual cards, SaaS-spend tracking, and bill-pay." },
  { solution_name: "Navan Spend",            vendor: "Navan",          url: "https://www.navan.com/products/expense-management",           type: "saas", description: "Corporate cards, expense, and bill-pay alongside Navan's corporate-travel product (formerly Navan Liquid / TripActions Liquid)." },
  { solution_name: "Spendesk",               vendor: "Spendesk",       url: "https://www.spendesk.com",                                    type: "saas", description: "European spend management with corporate cards, expense, bill-pay, approvals, and budget controls." },
  { solution_name: "BILL Spend & Expense",   vendor: "BILL",           url: "https://www.bill.com/product/spend-and-expense",              type: "saas", description: "Corporate-card-led spend management (formerly Divvy), part of the BILL financial-operations platform." },
  { solution_name: "Rydoo",                  vendor: "Rydoo",          url: "https://www.rydoo.com",                                       type: "saas", description: "Expense management and travel-expense capture with policy enforcement, OCR, and ERP integration. Primary EU market focus." },
];

// ============================================================
// PHASE A — SOLUTION → DOMAIN COVERAGE
// (also reclassifies Ramp & Brex on EXPENSE from primary -> secondary)
// ============================================================
// Format: solution natural key, domain code, coverage_level
const solutionDomains: { solution: string; domain: string; coverage_level: string }[] = [
  // SPEND-MGMT primary (the 8 pure-plays)
  { solution: "Ramp",                  domain: "SPEND-MGMT", coverage_level: "primary" },
  { solution: "Brex",                  domain: "SPEND-MGMT", coverage_level: "primary" },
  { solution: "Airwallex Spend",       domain: "SPEND-MGMT", coverage_level: "primary" },
  { solution: "Pleo",                  domain: "SPEND-MGMT", coverage_level: "primary" },
  { solution: "Mesh Payments",         domain: "SPEND-MGMT", coverage_level: "primary" },
  { solution: "Navan Spend",           domain: "SPEND-MGMT", coverage_level: "primary" },
  { solution: "Spendesk",              domain: "SPEND-MGMT", coverage_level: "primary" },
  { solution: "BILL Spend & Expense",  domain: "SPEND-MGMT", coverage_level: "primary" },

  // SPEND-MGMT secondary — enterprise procurement crossovers
  { solution: "Coupa Business Spend Management", domain: "SPEND-MGMT", coverage_level: "secondary" },
  { solution: "Workday Spend Management",        domain: "SPEND-MGMT", coverage_level: "secondary" },

  // EXPENSE — Rydoo (new primary), plus secondary coverage of the new SPEND-MGMT players
  { solution: "Rydoo",                 domain: "EXPENSE", coverage_level: "primary" },
  { solution: "Airwallex Spend",       domain: "EXPENSE", coverage_level: "secondary" },
  { solution: "Pleo",                  domain: "EXPENSE", coverage_level: "secondary" },
  { solution: "Mesh Payments",         domain: "EXPENSE", coverage_level: "secondary" },
  { solution: "Navan Spend",           domain: "EXPENSE", coverage_level: "secondary" },
  { solution: "Spendesk",              domain: "EXPENSE", coverage_level: "secondary" },
  { solution: "BILL Spend & Expense",  domain: "EXPENSE", coverage_level: "secondary" },
];

// Reclassifications — existing rows to UPDATE from coverage_level=primary -> secondary.
// (Ramp + Brex on EXPENSE: their flagship is SPEND-MGMT; EXPENSE is a feature inside.)
const reclassifications: { solution: string; domain: string; new_coverage: string }[] = [
  { solution: "Ramp",  domain: "EXPENSE", new_coverage: "secondary" },
  { solution: "Brex",  domain: "EXPENSE", new_coverage: "secondary" },
];

// ============================================================
// PHASE A — SOLUTION × CAPABILITY MATRIX (delivery_strength)
// ============================================================
// 10 solutions × 11 capabilities = 110 rows.
// Solutions: Ramp, Brex, Airwallex Spend, Pleo, Mesh Payments, Navan Spend, Spendesk, BILL Spend & Expense, Coupa BSM, Workday Spend Management.
// Capabilities: 7 new SPEND-* + 4 existing cross-linked (CORP-CARD, EXPENSE-CAPTURE, EXPENSE-POLICY, APPROVAL-WORKFLOW).

type SCM = { solution: string; capability: string; delivery_strength: string; notes?: string };

const N = "native";
const P = "partial";
const V = "via_extension";
const X = "not_supported";

const SPEND_SOLUTIONS = [
  "Ramp",
  "Brex",
  "Airwallex Spend",
  "Pleo",
  "Mesh Payments",
  "Navan Spend",
  "Spendesk",
  "BILL Spend & Expense",
  "Coupa Business Spend Management",
  "Workday Spend Management",
];

// Each row below = matrix row per capability across the 10 solutions in SPEND_SOLUTIONS order.
const matrix: { capability: string; row: string[] }[] = [
  // Pure-plays mostly native; enterprise procurement (Coupa, Workday) partial on card issuance / FX, native on PO-driven spend.
  { capability: "SPEND-CARD-ISSUANCE",  row: [N, N, N, N, N, N, N, N, X, X] },
  { capability: "SPEND-CARD-AUTH",      row: [N, N, N, N, N, N, N, N, X, X] },
  { capability: "SPEND-REIMBURSEMENT",  row: [N, N, N, N, N, N, N, N, P, N] },
  { capability: "SPEND-BILL-PAY",       row: [N, N, P, N, P, N, N, N, N, N] },
  { capability: "SPEND-PRE-APPROVAL",   row: [N, N, P, N, P, P, N, P, N, N] },
  { capability: "SPEND-FX-TREASURY",    row: [P, P, N, P, P, P, P, P, P, P] },
  { capability: "SPEND-ANALYTICS",      row: [N, N, N, N, N, N, N, N, N, N] },
  // Cross-linked existing capabilities — modern spend platforms cover all of these natively.
  { capability: "CORP-CARD",            row: [N, N, N, N, N, N, N, N, V, P] },
  { capability: "EXPENSE-CAPTURE",      row: [N, N, N, N, N, N, N, N, P, N] },
  { capability: "EXPENSE-POLICY",       row: [N, N, N, N, N, N, N, N, N, N] },
  { capability: "APPROVAL-WORKFLOW",    row: [N, N, N, N, N, N, N, N, N, N] },
];

const solutionCapabilities: SCM[] = matrix.flatMap(({ capability, row }) =>
  row.map((strength, i) => ({
    solution: SPEND_SOLUTIONS[i],
    capability,
    delivery_strength: strength,
  })),
);

// ============================================================
// PHASE B — DATA OBJECTS
// ============================================================
const newDataObjects = [
  {
    data_object_name: "spend_requests",
    singular_label: "Spend Request",
    plural_label: "Spend Requests",
    display_label: "Spend Request",
    description:
      "Pre-spend approval request raised by an employee before a purchase — for a virtual card, raised card limit, vendor bill, or reimbursement budget. Modern spend-management platforms anchor on this proactive request workflow (Ramp Requests, Brex Spend Requests, Pleo Requests) as the entry point before any transaction occurs. Lifecycle: draft → submitted → approved/declined → spent (linked to one or more card_transactions / payment_runs).",
  },
];

// ============================================================
// PHASE B — DOMAIN_DATA_OBJECTS (Signal 1)
// ============================================================
// Format: data_object natural key, domain code, role, notes
const domainDataObjects: { data_object: string; domain: string; role: string; notes: string }[] = [
  // New master — spend_requests (single master under SPEND-MGMT)
  { data_object: "spend_requests", domain: "SPEND-MGMT", role: "master",
    notes: "Pre-spend approval workflow — request created before any card_transaction or payment_run; lifecycle: draft → submitted → approved/declined → spent. The enforceable approval becomes the policy used at card-auth or bill-pay time." },

  // Multi-master — corporate_cards and card_transactions (co-master with existing EXPENSE-master rows)
  { data_object: "corporate_cards", domain: "SPEND-MGMT", role: "master",
    notes: "Cards issued by the spend-management platform itself (virtual + physical) with real-time auth control at the payment network. Distinct from EXPENSE's slice (reconciliation of bank-issued cards in the legacy stack)." },
  { data_object: "card_transactions", domain: "SPEND-MGMT", role: "master",
    notes: "Transactions on platform-issued cards captured network-side at authorization, with merchant enrichment and policy-decision metadata attached. Distinct from EXPENSE's slice (txn-feed ingestion from bank/issuer after settlement, reconciled to expense lines)." },

  // Contributor / consumer rows
  { data_object: "expense_policies", domain: "SPEND-MGMT", role: "contributor",
    notes: "Real-time policy enforcement at card-authorization time (MCC / vendor / amount / time / geography decline). Distinct mechanism from EXPENSE's post-submission enforcement at expense-report approval — the same policy may be authored once and enforced at two layers." },
  { data_object: "expense_reports", domain: "SPEND-MGMT", role: "contributor",
    notes: "card_transaction.posted events auto-create expense report lines with merchant + amount + receipt-match candidates pre-populated; EXPENSE remains master of the expense_report record itself." },
  { data_object: "payment_runs", domain: "SPEND-MGMT", role: "contributor",
    notes: "Modern bill-pay runs initiated without three-way-match (vendor + invoice + amount only), distinct from AP-AUTO's PO-matched payment workflow. AP-AUTO remains master of the payment_run record." },
  { data_object: "invoices", domain: "SPEND-MGMT", role: "contributor",
    notes: "Direct bill-pay ingest (no PO, no sourcing) — SPEND-MGMT handles invoice-receipt → approval → pay for non-PO spend. S2P remains master of the invoice record." },
  { data_object: "suppliers", domain: "SPEND-MGMT", role: "consumer",
    notes: "Bill-pay platforms consume the supplier master for payee lookup and bank-detail enrichment. SUP-LIFE remains master." },
];

// Backfill slice notes onto two existing EXPENSE master rows (currently empty notes).
// We PATCH by composite key (domain_id, data_object_id, role='master').
const expenseMasterBackfill: { data_object: string; domain: string; notes: string }[] = [
  { data_object: "corporate_cards", domain: "EXPENSE",
    notes: "Reconciliation of bank-issued and corporate-issued cards into expense reports (legacy stack model — txn data sourced from issuer after settlement, not real-time at authorization)." },
  { data_object: "card_transactions", domain: "EXPENSE",
    notes: "Card-feed ingestion from bank/issuer and reconciliation to expense lines at expense-report submission time (legacy stack; not real-time)." },
];

// ============================================================
// PHASE B — CROSS_DOMAIN_HANDOFFS (Signal 2)
// ============================================================
const handoffs: {
  source: string;
  target: string;
  data_object: string;
  trigger_event: string;
  integration_pattern: string;
  friction_level: string;
  description: string;
}[] = [
  {
    source: "SPEND-MGMT", target: "EXPENSE", data_object: "card_transactions",
    trigger_event: "card_transaction.posted",
    integration_pattern: "api_call", friction_level: "high",
    description: "When the corporate-card platform (Ramp/Brex/Pleo) is a different vendor from the expense-reimbursement system (Concur/Expensify), settled card transactions must propagate to create expense report lines. Identifier mismatches (card_id vs employee_id), MCC remapping per chart-of-accounts, and timing drift (auth → posted → settled) routinely create duplicate or orphaned expense lines. High friction in mixed-vendor stacks; intra-platform when same vendor.",
  },
  {
    source: "SPEND-MGMT", target: "ERP-FIN", data_object: "card_transactions",
    trigger_event: "card_transaction.posted",
    integration_pattern: "batch_sync", friction_level: "medium",
    description: "Daily/weekly batch feeds card transactions to the GL with categorization mapping per chart-of-accounts; reconciliation against bank-feed at month-end. Mapping maintenance is the bulk of the integration work.",
  },
  {
    source: "SPEND-MGMT", target: "ERP-FIN", data_object: "payment_runs",
    trigger_event: "bill_payment.completed",
    integration_pattern: "api_call", friction_level: "medium",
    description: "Bill-pay completions create AP voucher and cash-disbursement entries in the GL; bank-feed reconciliation closes the loop. Manual touchpoints when payment fails or is reversed.",
  },
  {
    source: "SPEND-MGMT", target: "AP-AUTO", data_object: "invoices",
    trigger_event: "invoice.received",
    integration_pattern: "api_call", friction_level: "high",
    description: "Large orgs frequently run SPEND-MGMT (non-PO bill pay) and AP-AUTO (PO-matched three-way-match) in parallel; the same supplier-issued invoice can arrive through either path. Duplicate-invoice detection across two systems with different identifier spaces and routing rules creates ongoing reconciliation burden. Cross-vendor stack pattern with same logical entity.",
  },
  {
    source: "SPEND-MGMT", target: "ERP-FIN", data_object: "spend_requests",
    trigger_event: "spend_request.approved",
    integration_pattern: "api_call", friction_level: "low",
    description: "Approved pre-spend requests create commitment / encumbrance entries in the GL for budget tracking; later settled by the actual card_transaction or payment_run.",
  },
  {
    source: "S2P", target: "SPEND-MGMT", data_object: "suppliers",
    trigger_event: "vendor.added",
    integration_pattern: "api_call", friction_level: "high",
    description: "New supplier records in S2P (with DUNS, tax IDs, bank details) must propagate to SPEND-MGMT for bill-pay payee setup. Different identifier spaces (internal vendor_id, DUNS, supplier_code) create duplicate vendor records and routing errors. Classic identity-reconciliation pattern.",
  },
  {
    source: "EXPENSE", target: "SPEND-MGMT", data_object: "expense_policies",
    trigger_event: "expense_policy.updated",
    integration_pattern: "api_call", friction_level: "high",
    description: "Policy changes authored in EXPENSE (per-category limits, prohibited MCCs, approver thresholds) must propagate to SPEND-MGMT real-time card-auth rules. Drift between submission-time checks and authorization-time checks leads to declined valid transactions or approved out-of-policy spend. Cross-vendor stack pattern with same logical entity.",
  },
  {
    source: "SPEND-MGMT", target: "EPM", data_object: "spend_requests",
    trigger_event: "spend_commitment.created",
    integration_pattern: "batch_sync", friction_level: "medium",
    description: "Committed and actual spend feeds EPM (FP&A platforms — Anaplan, Workday Adaptive Planning) for budget-vs-actual variance reporting at the department and cost-center level.",
  },
  {
    source: "SPEND-MGMT", target: "FINOPS", data_object: "card_transactions",
    trigger_event: "card_transaction.posted",
    integration_pattern: "api_call", friction_level: "medium",
    description: "Cloud-provider charges on corporate cards (AWS, Azure, GCP) feed FINOPS for cost allocation across business units and projects. Bypasses the normal cloud-bill ingest path, requires merchant-side mapping to cloud account, and creates double-counting risk if both the card-side and bill-side flows are configured.",
  },
  {
    source: "SPEND-MGMT", target: "SMP", data_object: "card_transactions",
    trigger_event: "card_transaction.posted",
    integration_pattern: "api_call", friction_level: "high",
    description: "SaaS purchases on corporate cards reveal shadow IT to SMP — merchant categorization required to identify SaaS subscriptions vs other spend, then deduplicated against the existing SMP saas_subscription catalog. The card-side discovery path is the primary signal for off-procurement SaaS today. Shadow-data pattern.",
  },
];

// ============================================================
// PHASE C — BUSINESS_FUNCTION_DOMAINS
// ============================================================
// Owner: Accounts Payable (17); Contributor: Procurement (19), Treasury (18).
const businessFunctionDomains: { business_function_name: string; domain: string; responsibility_type: string; notes: string }[] = [
  { business_function_name: "Accounts Payable", domain: "SPEND-MGMT", responsibility_type: "owner",
    notes: "AP runs the spend-management platform — card program administration, bill-pay execution, policy authoring, and reconciliation to GL. Same owner as EXPENSE and AP-AUTO; this domain is the modern unification of those two AP-owned workflows." },
  { business_function_name: "Procurement", domain: "SPEND-MGMT", responsibility_type: "contributor",
    notes: "Vendor master alignment, sourcing input to spend categories, policy coordination on indirect-procurement card spend." },
  { business_function_name: "Treasury", domain: "SPEND-MGMT", responsibility_type: "contributor",
    notes: "Multi-currency cards, FX hedging on cross-border spend, card credit-limit allocation, cash positioning against bill-pay runs." },
];

// ============================================================
// EXECUTE
// ============================================================
async function main() {
  console.log("== SPEND-MGMT load (Phases A + B + C + EXPENSE patch) ==\n");

  // -------- Phase A : Domain --------
  console.log("=== Phase A: domains ===");
  const domainMap = await syncTable("/domains", newDomains, "domain_code");
  // Also pull in adjacent domains we need for FK resolution
  const allDomains = await get("/domains?select=id,domain_code&limit=10000");
  for (const d of allDomains) domainMap.set(String(d.domain_code), Number(d.id));

  // -------- Phase A : Capabilities --------
  console.log("\n=== Phase A: capabilities ===");
  const capMap = await syncTable("/capabilities", newCapabilities, "capability_code");
  // Pull in the cross-linked existing capability ids
  const allCaps = await get("/capabilities?select=id,capability_code&limit=10000");
  for (const c of allCaps) capMap.set(String(c.capability_code), Number(c.id));

  // -------- Phase A : capability_domains (new caps under SPEND-MGMT + cross-links) --------
  console.log("\n=== Phase A: capability_domains ===");
  const spendDomainId = domainMap.get("SPEND-MGMT")!;
  const capDomainCodes = [
    ...newCapabilities.map(c => c.capability_code),
    ...existingCapsToCrossLink,
  ];
  const existingCapDom = await get(`/capability_domains?domain_id=eq.${spendDomainId}&select=capability_id&limit=10000`);
  const existingCapDomIds = new Set(existingCapDom.map(r => Number(r.capability_id)));
  const newCapDomRows = capDomainCodes
    .map(code => capMap.get(code))
    .filter((id): id is number => id !== undefined)
    .filter(id => !existingCapDomIds.has(id))
    .map(capability_id => ({
      capability_id,
      domain_id: spendDomainId,
      notes: "",
    }));
  if (newCapDomRows.length > 0) {
    console.log(`  inserting ${newCapDomRows.length} capability_domains rows`);
    await insert("/capability_domains", newCapDomRows);
  } else {
    console.log("  no new capability_domains rows");
  }

  // -------- Phase A : Vendors --------
  console.log("\n=== Phase A: vendors ===");
  const vendorMap = await syncTable("/vendors", newVendors, "vendor_name");
  // Pull all vendors for FK resolution
  const allVendors = await get("/vendors?select=id,vendor_name&limit=10000");
  for (const v of allVendors) vendorMap.set(String(v.vendor_name), Number(v.id));

  // -------- Phase A : Solutions --------
  console.log("\n=== Phase A: solutions ===");
  const solutionsToInsert = newSolutions.map(s => ({
    solution_name: s.solution_name,
    vendor_id: vendorMap.get(s.vendor),
    solution_url: s.url,
    solution_type: s.type,
    is_active_in_market: true,
    description: s.description,
    notes: "",
  }));
  await syncTable("/solutions", solutionsToInsert, "solution_name");
  const allSolutions = await get("/solutions?select=id,solution_name&limit=10000");
  const solutionMap = new Map<string, number>();
  for (const s of allSolutions) solutionMap.set(String(s.solution_name), Number(s.id));

  // -------- Phase A : solution_domains (inserts + reclassifications) --------
  console.log("\n=== Phase A: solution_domains ===");
  const existingSolDom = await get("/solution_domains?select=solution_id,domain_id,coverage_level&limit=10000");
  const sdKey = (sid: number, did: number) => `${sid}::${did}`;
  const existingSdMap = new Map<string, string>();
  for (const r of existingSolDom) existingSdMap.set(sdKey(Number(r.solution_id), Number(r.domain_id)), String(r.coverage_level));

  const newSdRows: Row[] = [];
  let skippedSd = 0;
  for (const sd of solutionDomains) {
    const sid = solutionMap.get(sd.solution);
    const did = domainMap.get(sd.domain);
    if (sid === undefined || did === undefined) {
      console.warn(`  WARN solution_domains missing FK: ${sd.solution} / ${sd.domain}`);
      continue;
    }
    if (existingSdMap.has(sdKey(sid, did))) {
      skippedSd++;
      continue;
    }
    newSdRows.push({
      solution_id: sid,
      domain_id: did,
      coverage_level: sd.coverage_level,
      notes: "",
    });
  }
  if (newSdRows.length > 0) {
    console.log(`  inserting ${newSdRows.length} solution_domains rows (${skippedSd} already present)`);
    await insert("/solution_domains", newSdRows);
  } else {
    console.log(`  no new solution_domains rows (${skippedSd} already present)`);
  }

  // Reclassifications — PATCH existing rows
  console.log("\n=== Phase A: solution_domains reclassifications ===");
  for (const rc of reclassifications) {
    const sid = solutionMap.get(rc.solution);
    const did = domainMap.get(rc.domain);
    if (sid === undefined || did === undefined) {
      console.warn(`  WARN reclassification missing FK: ${rc.solution} / ${rc.domain}`);
      continue;
    }
    const current = existingSdMap.get(sdKey(sid, did));
    if (current === rc.new_coverage) {
      console.log(`  ${rc.solution} on ${rc.domain}: already ${rc.new_coverage}, skipping`);
      continue;
    }
    if (current === undefined) {
      console.warn(`  WARN reclassification target row not found: ${rc.solution} / ${rc.domain}`);
      continue;
    }
    console.log(`  reclassify ${rc.solution} on ${rc.domain}: ${current} -> ${rc.new_coverage}`);
    await patch(
      `/solution_domains?solution_id=eq.${sid}&domain_id=eq.${did}`,
      { coverage_level: rc.new_coverage },
    );
  }

  // -------- Phase A : solution_capabilities matrix --------
  console.log("\n=== Phase A: solution_capabilities matrix ===");
  const existingSolCap = await get("/solution_capabilities?select=solution_id,capability_id&limit=10000");
  const scKey = (sid: number, cid: number) => `${sid}::${cid}`;
  const existingScSet = new Set<string>();
  for (const r of existingSolCap) existingScSet.add(scKey(Number(r.solution_id), Number(r.capability_id)));

  const newScRows: Row[] = [];
  let skippedSc = 0;
  for (const sc of solutionCapabilities) {
    const sid = solutionMap.get(sc.solution);
    const cid = capMap.get(sc.capability);
    if (sid === undefined || cid === undefined) {
      console.warn(`  WARN solution_capabilities missing FK: ${sc.solution} / ${sc.capability}`);
      continue;
    }
    if (existingScSet.has(scKey(sid, cid))) {
      skippedSc++;
      continue;
    }
    newScRows.push({
      solution_id: sid,
      capability_id: cid,
      delivery_strength: sc.delivery_strength,
      notes: "",
    });
  }
  if (newScRows.length > 0) {
    console.log(`  inserting ${newScRows.length} solution_capabilities rows (${skippedSc} already present)`);
    await insert("/solution_capabilities", newScRows);
  } else {
    console.log(`  no new solution_capabilities rows (${skippedSc} already present)`);
  }

  // -------- Phase B : data_objects --------
  console.log("\n=== Phase B: data_objects ===");
  await syncTable("/data_objects", newDataObjects, "data_object_name");
  const allDataObjects = await get("/data_objects?select=id,data_object_name&limit=10000");
  const doMap = new Map<string, number>();
  for (const o of allDataObjects) doMap.set(String(o.data_object_name), Number(o.id));

  // -------- Phase B : domain_data_objects --------
  console.log("\n=== Phase B: domain_data_objects ===");
  const existingDdo = await get("/domain_data_objects?select=domain_id,data_object_id,role&limit=10000");
  const ddoKey = (did: number, oid: number, role: string) => `${did}::${oid}::${role}`;
  const existingDdoSet = new Set<string>();
  for (const r of existingDdo) existingDdoSet.add(ddoKey(Number(r.domain_id), Number(r.data_object_id), String(r.role)));

  const newDdoRows: Row[] = [];
  let skippedDdo = 0;
  for (const ddo of domainDataObjects) {
    const did = domainMap.get(ddo.domain);
    const oid = doMap.get(ddo.data_object);
    if (did === undefined || oid === undefined) {
      console.warn(`  WARN domain_data_objects missing FK: ${ddo.domain} / ${ddo.data_object}`);
      continue;
    }
    if (existingDdoSet.has(ddoKey(did, oid, ddo.role))) {
      skippedDdo++;
      continue;
    }
    newDdoRows.push({
      domain_id: did,
      data_object_id: oid,
      role: ddo.role,
      notes: ddo.notes,
    });
  }
  if (newDdoRows.length > 0) {
    console.log(`  inserting ${newDdoRows.length} domain_data_objects rows (${skippedDdo} already present)`);
    await insert("/domain_data_objects", newDdoRows);
  } else {
    console.log(`  no new domain_data_objects rows (${skippedDdo} already present)`);
  }

  // -------- Phase B : EXPENSE backfill notes on existing master rows --------
  console.log("\n=== Phase B: EXPENSE master-row notes backfill ===");
  for (const b of expenseMasterBackfill) {
    const did = domainMap.get(b.domain);
    const oid = doMap.get(b.data_object);
    if (did === undefined || oid === undefined) {
      console.warn(`  WARN backfill missing FK: ${b.domain} / ${b.data_object}`);
      continue;
    }
    // Only patch if notes are currently empty (avoid clobbering anything added in the meantime)
    const current = await get(`/domain_data_objects?domain_id=eq.${did}&data_object_id=eq.${oid}&role=eq.master&select=notes`);
    if (current.length === 0) {
      console.warn(`  WARN backfill target row missing: ${b.domain} / ${b.data_object}`);
      continue;
    }
    if (String(current[0].notes ?? "").trim().length > 0) {
      console.log(`  ${b.domain} / ${b.data_object}: notes already present, skipping`);
      continue;
    }
    console.log(`  backfill notes on ${b.domain} / ${b.data_object} (master)`);
    await patch(
      `/domain_data_objects?domain_id=eq.${did}&data_object_id=eq.${oid}&role=eq.master`,
      { notes: b.notes },
    );
  }

  // -------- Phase B : cross_domain_handoffs --------
  console.log("\n=== Phase B: cross_domain_handoffs ===");
  const existingHo = await get(
    "/cross_domain_handoffs?select=source_domain_id,target_domain_id,data_object_id,trigger_event&limit=10000",
  );
  const hoKey = (s: number, t: number, o: number, ev: string) => `${s}::${t}::${o}::${ev}`;
  const existingHoSet = new Set<string>();
  for (const r of existingHo) existingHoSet.add(hoKey(Number(r.source_domain_id), Number(r.target_domain_id), Number(r.data_object_id), String(r.trigger_event)));

  const newHoRows: Row[] = [];
  let skippedHo = 0;
  for (const h of handoffs) {
    const sid = domainMap.get(h.source);
    const tid = domainMap.get(h.target);
    const oid = doMap.get(h.data_object);
    if (sid === undefined || tid === undefined || oid === undefined) {
      console.warn(`  WARN handoff missing FK: ${h.source} -> ${h.target} / ${h.data_object}`);
      continue;
    }
    if (existingHoSet.has(hoKey(sid, tid, oid, h.trigger_event))) {
      skippedHo++;
      continue;
    }
    newHoRows.push({
      source_domain_id: sid,
      target_domain_id: tid,
      data_object_id: oid,
      trigger_event: h.trigger_event,
      integration_pattern: h.integration_pattern,
      friction_level: h.friction_level,
      description: h.description,
      notes: "",
    });
  }
  if (newHoRows.length > 0) {
    console.log(`  inserting ${newHoRows.length} cross_domain_handoffs rows (${skippedHo} already present)`);
    await insert("/cross_domain_handoffs", newHoRows);
  } else {
    console.log(`  no new cross_domain_handoffs rows (${skippedHo} already present)`);
  }

  // -------- Phase C : business_function_domains --------
  console.log("\n=== Phase C: business_function_domains ===");
  const allBf = await get("/business_functions?select=id,business_function_name&limit=10000");
  const bfMap = new Map<string, number>();
  for (const b of allBf) bfMap.set(String(b.business_function_name), Number(b.id));

  const existingBfd = await get("/business_function_domains?select=business_function_id,domain_id,responsibility_type&limit=10000");
  const bfdKey = (bf: number, d: number) => `${bf}::${d}`;
  const existingBfdSet = new Set<string>();
  for (const r of existingBfd) existingBfdSet.add(bfdKey(Number(r.business_function_id), Number(r.domain_id)));

  const newBfdRows: Row[] = [];
  let skippedBfd = 0;
  for (const bfd of businessFunctionDomains) {
    const bid = bfMap.get(bfd.business_function_name);
    const did = domainMap.get(bfd.domain);
    if (bid === undefined || did === undefined) {
      console.warn(`  WARN business_function_domains missing FK: ${bfd.business_function_name} / ${bfd.domain}`);
      continue;
    }
    if (existingBfdSet.has(bfdKey(bid, did))) {
      skippedBfd++;
      continue;
    }
    newBfdRows.push({
      business_function_id: bid,
      domain_id: did,
      responsibility_type: bfd.responsibility_type,
      notes: bfd.notes,
    });
  }
  if (newBfdRows.length > 0) {
    console.log(`  inserting ${newBfdRows.length} business_function_domains rows (${skippedBfd} already present)`);
    await insert("/business_function_domains", newBfdRows);
  } else {
    console.log(`  no new business_function_domains rows (${skippedBfd} already present)`);
  }

  // -------- Audit --------
  console.log("\n=== Post-load audit ===");
  const spendId = domainMap.get("SPEND-MGMT")!;
  const audit = {
    spend_mgmt_domain_id: spendId,
    capabilities_under_spend: (await get(`/capability_domains?domain_id=eq.${spendId}&select=capability_id&limit=10000`)).length,
    solutions_primary_on_spend: (await get(`/solution_domains?domain_id=eq.${spendId}&coverage_level=eq.primary&select=solution_id&limit=10000`)).length,
    solutions_any_on_spend: (await get(`/solution_domains?domain_id=eq.${spendId}&select=solution_id&limit=10000`)).length,
    solution_capabilities_under_spend_caps:
      newCapabilities.length === 0 ? 0 :
      (await get(`/solution_capabilities?capability_id=in.(${newCapabilities.map(c => capMap.get(c.capability_code)).join(",")})&select=solution_id&limit=10000`)).length,
    domain_data_objects_spend: (await get(`/domain_data_objects?domain_id=eq.${spendId}&select=data_object_id&limit=10000`)).length,
    handoffs_from_spend: (await get(`/cross_domain_handoffs?source_domain_id=eq.${spendId}&select=id&limit=10000`)).length,
    handoffs_to_spend: (await get(`/cross_domain_handoffs?target_domain_id=eq.${spendId}&select=id&limit=10000`)).length,
    business_functions_on_spend: (await get(`/business_function_domains?domain_id=eq.${spendId}&select=business_function_id&limit=10000`)).length,
  };
  console.log(JSON.stringify(audit, null, 2));

  // Rule #8 audit: domain rows with zeroed numeric metadata
  const zeroDomains = await get("/domains?select=domain_code,crud_percentage,min_org_size,cost_band,usa_market_size_usd_m&crud_percentage=eq.0&order=id.desc&limit=50");
  if (zeroDomains.length > 0) {
    console.warn(`  WARN ${zeroDomains.length} domain rows with crud_percentage=0 (backfill needed):`);
    for (const d of zeroDomains) console.warn(`    - ${d.domain_code}`);
  } else {
    console.log("  all domain rows have crud_percentage populated");
  }

  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/domains");
  console.log("  https://tests.semantius.app/domain_map/solutions");
  console.log("  https://tests.semantius.app/domain_map/capabilities");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/cross_domain_handoffs");
  console.log("\nDone.");
}

await main();
