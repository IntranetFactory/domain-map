#!/usr/bin/env bun
// Phase B for the 5 private-capital domains.
//
// Inserts:
//   - 30 new data_objects (some claim canonical bare-word per Rule #9)
//   - domain_data_objects (master / embedded_master / contributor / consumer per Rule #11)
//   - domain_module_data_objects (module-level assignment per plan-modules.md §4.4)
//   - trigger_events for outbound handoffs (controlled vocabulary)
//   - cross_domain_handoffs outbound from these 5 domains
//   - data_object_relationships (intra-domain + users edges per Rule #10 + cross-domain payload→target)
//   - data_object_aliases (≥1 per non-self-explanatory master)
//   - data_object_lifecycle_states (for master+required with non-trivial workflow per Rule #12)
//
// Multi-master coordination:
//   - capital_calls (id 367, RE-INVEST master): adds FUND-ADMIN as additional master with slice notes.
//   - equity_grants (id 158, COMP-MGMT master): adds CAP-TABLE as additional master with slice notes.
//   No PATCH on existing rows. Multi-master is the catalog's intended pattern.

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius failed (exit ${code}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (p: string) => call({ method: "GET", path: p });

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const r = await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) });
    out.push(...r);
  }
  return out;
}

async function syncTable<T extends Row>(
  path: string, rows: T[], keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=20000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new rows into ${path} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} already present, nothing to insert`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=20000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// ============================================================
// DATA OBJECTS (30 new)
// ============================================================
type DOSpec = {
  name: string;
  singular: string;
  plural: string;
  description: string;
  is_canonical_bare_word?: boolean;
  naming_authority_rationale?: string;
  minimum_embedded_shape?: string;
  has_personal_content?: boolean;
  has_submit_lock?: boolean;
  has_single_approver?: boolean;
};

const dataObjects: DOSpec[] = [
  // INV-CRM
  { name: "vc_deals", singular: "VC Deal", plural: "VC Deals",
    description: "Investment opportunity flowing through the deal pipeline (sourced → diligence → IC → term sheet → closed / declined). Domain-prefixed to avoid collision with M&A / IB deal records." },
  { name: "investment_memos", singular: "Investment Memo", plural: "Investment Memos",
    description: "Internal IC document per deal capturing thesis, financials, risks, deal-team commentary, and IC vote. Locked at final IC vote.",
    has_submit_lock: true, has_single_approver: true },
  { name: "relationship_records", singular: "Relationship Record", plural: "Relationship Records",
    description: "Graph edges between people, organizations, and the firm: founder ↔ partner introductions, co-investor relationships, board observer assignments, advisor links.",
    has_personal_content: true },
  { name: "investor_contacts", singular: "Investor Contact", plural: "Investor Contacts",
    description: "People in the firm's external network: founders, executives, co-investors, advisors, LP-side contacts. Distinct from CRM's customer-side `contacts`. The minimum-embedded-shape is the GDPR-relevant subset every module embedding this record must support.",
    has_personal_content: true,
    minimum_embedded_shape: "`id` (uuid), `legal_name` (text, required), `primary_email` (text, required), `primary_phone` (text, optional), `current_organization_id` (FK→investor_organizations, optional), `consent_status` (enum, required), `created_at` (timestamptz, required)" },
  { name: "lp_prospects", singular: "LP Prospect", plural: "LP Prospects",
    description: "Limited partners being fundraised — pre-commitment relationship stage. Distinct from `lp_commitments` which is post-close.",
    has_personal_content: true },

  // FUND-ADMIN
  { name: "funds", singular: "Fund", plural: "Funds",
    description: "Private-capital fund vehicle (LP/GP partnership structure) with vintage, strategy, target size, and current AUM. The structural backbone every other fund-admin module references.",
    is_canonical_bare_word: true,
    naming_authority_rationale: "Private-capital fund vehicles are the canonical buyer of fund-administration software; FUND-ADMIN holds the catalog-wide canonical claim. Mutual funds, hedge funds, and other fund types use distinct architectures and would be modeled as `mutual_funds` / `hedge_funds` if loaded later.",
    minimum_embedded_shape: "`id` (uuid), `fund_name` (text, required), `vintage_year` (int, required), `strategy_code` (enum, required), `fund_state` (enum, required — lifecycle state), `created_at` (timestamptz, required)" },
  { name: "fund_ledger_entries", singular: "Fund Ledger Entry", plural: "Fund Ledger Entries",
    description: "GP-side accounting entries against the fund vehicle (contributions, expenses, fee accruals, gain/loss recognitions) with GAAP/IFRS conformance." },
  { name: "fund_close_periods", singular: "Fund Close Period", plural: "Fund Close Periods",
    description: "Accounting close cycles for the fund (monthly, quarterly, annual). Drives PCAP statement generation and audit packaging." },
  { name: "lp_subscriptions", singular: "LP Subscription", plural: "LP Subscriptions",
    description: "Subscription document collected during LP onboarding: legal commitment to the fund at a stated dollar amount, KYC/AML results, accreditation attestation.",
    has_personal_content: true, has_submit_lock: true,
    minimum_embedded_shape: "`id` (uuid), `lp_party_id` (FK), `fund_id` (FK→funds), `committed_amount_usd` (numeric, required), `subscription_state` (enum, required), `executed_at` (timestamptz, required), `kyc_status` (enum, required)" },
  { name: "lp_commitments", singular: "LP Commitment", plural: "LP Commitments",
    description: "Active capital commitment from an LP to a fund: committed_amount, called-to-date, distributed-to-date, NAV. The lifecycle record that capital_calls and fund_distributions reference.",
    has_personal_content: true,
    minimum_embedded_shape: "`id` (uuid), `lp_party_id` (FK), `fund_id` (FK→funds), `subscription_id` (FK→lp_subscriptions, optional), `committed_amount_usd` (numeric, required), `called_to_date_usd` (numeric, required), `commitment_state` (enum, required)" },
  { name: "pcap_statements", singular: "PCAP Statement", plural: "PCAP Statements",
    description: "Partner Capital Account statement per LP per close period: contributions, distributions, gains/losses, fees, ending balance. Sent to LPs; submit-locked once distributed.",
    has_submit_lock: true },
  { name: "capital_call_responses", singular: "Capital Call Response", plural: "Capital Call Responses",
    description: "Per-LP line item against a capital call: allocated amount, due date, funded amount, funded date." },
  { name: "fund_distributions", singular: "Fund Distribution", plural: "Fund Distributions",
    description: "Distribution event from a fund to its LPs: declared amount, type (proceeds / gains / return-of-capital), record date, payment date. Locked when declared; single-approver (Managing Partner).",
    has_submit_lock: true, has_single_approver: true },
  { name: "waterfall_calculations", singular: "Waterfall Calculation", plural: "Waterfall Calculations",
    description: "Per-distribution waterfall computation: hurdle test, catchup, GP carry, LP returns. References the fund's distribution agreement (European / American / hybrid)." },

  // PORT-MONIT
  { name: "portfolio_companies", singular: "Portfolio Company", plural: "Portfolio Companies",
    description: "Investee company held by one or more funds. Carries headline financials, board composition, current ownership %, exit status, sector tagging.",
    is_canonical_bare_word: true,
    naming_authority_rationale: "Portfolio companies are the canonical subject of portfolio-monitoring software; PORT-MONIT holds the catalog-wide canonical claim. Other domains (INV-CRM, CAP-TABLE-LEDGER on the issuer side) reference these via embedded_master.",
    minimum_embedded_shape: "`id` (uuid), `company_legal_name` (text, required), `company_state` (enum, required — `active`/`exited`/`written_off`), `sector_code` (enum, required), `headquarters_country` (text, optional), `first_investment_date` (date, required), `created_at` (timestamptz, required)" },
  { name: "portco_kpi_periods", singular: "Portco KPI Period", plural: "Portco KPI Periods",
    description: "KPI submission cycle per portfolio company per reporting period (monthly / quarterly). Captures ARR, headcount, runway, cash, gross margin, NPS, churn." },
  { name: "portco_esg_records", singular: "Portco ESG Record", plural: "Portco ESG Records",
    description: "ESG and diversity metric submission per portfolio company per reporting period. Drives SFDR Article 8/9 disclosures and LP-side ESG reporting." },
  { name: "portco_valuations", singular: "Portco Valuation", plural: "Portco Valuations",
    description: "Fair-value mark per portfolio company per close cycle, per ASC 820 methodology. LP-side valuation distinct from issuer-side 409A valuations.",
    has_submit_lock: true, has_single_approver: true },
  { name: "fund_position_returns", singular: "Fund Position Return", plural: "Fund Position Returns",
    description: "Per-position return calculation: IRR/MOIC/TVPI/DPI on the fund's holding in a specific portfolio company, time-windowed." },
  { name: "fund_performance_periods", singular: "Fund Performance Period", plural: "Fund Performance Periods",
    description: "Fund-level performance reporting period: vintage-adjusted IRR/MOIC/TVPI/DPI with PME benchmarking, J-curve normalization." },
  { name: "lp_quarterly_reports", singular: "LP Quarterly Report", plural: "LP Quarterly Reports",
    description: "LP-facing performance report per fund per quarter: position-level marks, fund-level performance metrics, GP commentary, portfolio highlights. Locked when distributed.",
    has_submit_lock: true },

  // CAP-TABLE
  { name: "cap_tables", singular: "Cap Table", plural: "Cap Tables",
    description: "Authoritative shareholder ledger for an issuing company: securities, classes, holders, transaction history.",
    minimum_embedded_shape: "`id` (uuid), `issuer_legal_name` (text, required), `incorporation_state` (text, required), `cap_table_state` (enum, required — `nascent`/`active`/`exit`), `latest_409a_valuation_id` (FK→valuations_409a, optional), `created_at` (timestamptz, required)" },
  { name: "security_classes", singular: "Security Class", plural: "Security Classes",
    description: "Class of security in the cap table: common, preferred series (Seed/A/B/...), SAFEs, warrants. Carries liquidation preference, participation rights, conversion ratio." },
  { name: "shareholder_records", singular: "Shareholder Record", plural: "Shareholder Records",
    description: "Per-shareholder holding record across all security classes for an issuer.",
    has_personal_content: true },
  { name: "option_pools", singular: "Option Pool", plural: "Option Pools",
    description: "Equity pool reserved for employee grants. Tracks pool size, available headroom, reservation workflows, board-approved expansions." },
  { name: "vesting_schedules", singular: "Vesting Schedule", plural: "Vesting Schedules",
    description: "Vesting cadence for an equity grant: cliff, vest_frequency, total months, single-trigger / double-trigger acceleration logic." },
  { name: "valuations_409a", singular: "409A Valuation", plural: "409A Valuations",
    description: "IRS 409A fair-market-value report for an issuer: methodology (income / market / asset / OPM backsolve), per-class FMV, valuation date. Final once approved; superseded by future 409As.",
    has_submit_lock: true, has_single_approver: true },
  { name: "asc718_expense_periods", singular: "ASC 718 Expense Period", plural: "ASC 718 Expense Periods",
    description: "Stock-based compensation expense recognition per period per cohort of grants. Uses Black-Scholes or lattice models with forfeiture / modification accounting." },
  { name: "exit_scenarios", singular: "Exit Scenario", plural: "Exit Scenarios",
    description: "Hypothetical or committed exit-proceeds scenario: total deal value, structure, deal terms. Drives the exit_waterfall_calculation." },
  { name: "exit_waterfall_calculations", singular: "Exit Waterfall Calculation", plural: "Exit Waterfall Calculations",
    description: "Per-shareholder proceeds calculation under an exit_scenario, respecting liquidation preferences, participation rights, conversion economics." },
  { name: "employee_equity_accounts", singular: "Employee Equity Account", plural: "Employee Equity Accounts",
    description: "Per-employee portal account in the equity-administration product. Embedded_masters equity_grants for portal visibility.",
    has_personal_content: true },
  { name: "secondary_transactions", singular: "Secondary Transaction", plural: "Secondary Transactions",
    description: "Shareholder-initiated sale of existing equity: tender offer, employee liquidity program, or direct transfer. Board-approval workflow.",
    has_submit_lock: true, has_single_approver: true },

  // EM-FUND-PLATFORM
  { name: "fund_formations", singular: "Fund Formation", plural: "Fund Formations",
    description: "End-to-end fund-vehicle setup record: entity formation filings, EIN application, banking onboarding, templated LPA. Unique to emerging-manager bundled platforms." },
  { name: "spvs", singular: "SPV", plural: "SPVs",
    description: "Special Purpose Vehicle — single-deal investment vehicle (LLC-typed) with limited LP base. Dominant vehicle below ~$25M deal size." },
  { name: "spv_subscriptions", singular: "SPV Subscription", plural: "SPV Subscriptions",
    description: "Investor commitment to an SPV: simpler than fund-level lp_subscriptions; typically smaller LP base, single capital call at close.",
    has_personal_content: true },
];

// ============================================================
// DOMAIN-DATA-OBJECT mapping
// (existing data_objects: capital_calls, equity_grants — multi-master with notes)
// ============================================================
type DDO = {
  data_object: string;       // by name (resolved to id at runtime)
  domain: string;
  role: "master" | "embedded_master" | "contributor" | "consumer" | "derived";
  necessity: "required" | "optional";
  notes: string;
};

const ddoRows: DDO[] = [
  // INV-CRM masters
  { data_object: "vc_deals", domain: "INV-CRM", role: "master", necessity: "required", notes: "Investment-opportunity pipeline backbone." },
  { data_object: "investment_memos", domain: "INV-CRM", role: "master", necessity: "required", notes: "IC memos per deal." },
  { data_object: "relationship_records", domain: "INV-CRM", role: "master", necessity: "required", notes: "Auto-inferred graph edges between firm and external people / orgs." },
  { data_object: "investor_contacts", domain: "INV-CRM", role: "master", necessity: "required", notes: "External-network people — founders, execs, advisors, co-investors, LP-side contacts." },
  { data_object: "lp_prospects", domain: "INV-CRM", role: "master", necessity: "required", notes: "Pre-commitment LP relationships — distinct from FUND-ADMIN's post-close lp_commitments." },
  // INV-CRM embedded
  { data_object: "portfolio_companies", domain: "INV-CRM", role: "embedded_master", necessity: "required", notes: "INV-CRM holds a CRM-side awareness shell of portcos for deal-team navigation; PORT-MONIT canonically masters the full record. Demotes to consumer when PORT-MONIT is deployed." },

  // FUND-ADMIN masters
  { data_object: "funds", domain: "FUND-ADMIN", role: "master", necessity: "required", notes: "Private-capital fund vehicles. Canonical." },
  { data_object: "fund_ledger_entries", domain: "FUND-ADMIN", role: "master", necessity: "required", notes: "GP accounting entries." },
  { data_object: "fund_close_periods", domain: "FUND-ADMIN", role: "master", necessity: "required", notes: "Accounting close cycles." },
  { data_object: "lp_subscriptions", domain: "FUND-ADMIN", role: "master", necessity: "required", notes: "Onboarding subscription documents." },
  { data_object: "lp_commitments", domain: "FUND-ADMIN", role: "master", necessity: "required", notes: "Active capital commitments." },
  { data_object: "pcap_statements", domain: "FUND-ADMIN", role: "master", necessity: "required", notes: "Partner capital account statements per close." },
  { data_object: "capital_calls", domain: "FUND-ADMIN", role: "master", necessity: "required", notes: "Private-capital (VC/PE/credit) fund call slice. RE-INVEST canonically masters the same record from the real-estate-fund slice; same shape, different deployment context." },
  { data_object: "capital_call_responses", domain: "FUND-ADMIN", role: "master", necessity: "required", notes: "Per-LP call line items." },
  { data_object: "fund_distributions", domain: "FUND-ADMIN", role: "master", necessity: "required", notes: "Distribution events to LPs." },
  { data_object: "waterfall_calculations", domain: "FUND-ADMIN", role: "master", necessity: "required", notes: "Per-distribution waterfall computations." },

  // PORT-MONIT masters
  { data_object: "portfolio_companies", domain: "PORT-MONIT", role: "master", necessity: "required", notes: "Canonical investee-company record. INV-CRM embedded-masters for deal-team navigation." },
  { data_object: "portco_kpi_periods", domain: "PORT-MONIT", role: "master", necessity: "required", notes: "Per-portco per-period KPI submission cycle." },
  { data_object: "portco_esg_records", domain: "PORT-MONIT", role: "master", necessity: "required", notes: "Per-portco ESG / diversity metric stream." },
  { data_object: "portco_valuations", domain: "PORT-MONIT", role: "master", necessity: "required", notes: "LP-side fair-value marks (ASC 820)." },
  { data_object: "fund_position_returns", domain: "PORT-MONIT", role: "master", necessity: "required", notes: "Per-position IRR/MOIC/TVPI/DPI calculations." },
  { data_object: "fund_performance_periods", domain: "PORT-MONIT", role: "master", necessity: "required", notes: "Fund-level performance reporting cycles." },
  { data_object: "lp_quarterly_reports", domain: "PORT-MONIT", role: "master", necessity: "required", notes: "LP-facing quarterly performance reports." },
  // PORT-MONIT embedded
  { data_object: "funds", domain: "PORT-MONIT", role: "embedded_master", necessity: "required", notes: "PORT-MONIT references funds (FUND-ADMIN canonical) to anchor performance and position metrics. Demotes to consumer when FUND-ADMIN is deployed." },

  // CAP-TABLE masters
  { data_object: "cap_tables", domain: "CAP-TABLE", role: "master", necessity: "required", notes: "Issuer-side authoritative shareholder ledger." },
  { data_object: "security_classes", domain: "CAP-TABLE", role: "master", necessity: "required", notes: "Common / preferred series / SAFE / warrant definitions per issuer." },
  { data_object: "shareholder_records", domain: "CAP-TABLE", role: "master", necessity: "required", notes: "Per-shareholder holdings record." },
  { data_object: "equity_grants", domain: "CAP-TABLE", role: "master", necessity: "required", notes: "Cap-table-side record of truth for grants: integrates with vesting schedules, ASC 718 expense, and exit waterfalls. COMP-MGMT canonically masters from the compensation-policy slice (band alignment, performance criteria); CAP-TABLE masters the equity-administration slice (share count, strike, vesting cadence, exercise economics). Multi-master with COMP-MGMT." },
  { data_object: "option_pools", domain: "CAP-TABLE", role: "master", necessity: "required", notes: "Pool-size tracking and board-approval workflow." },
  { data_object: "vesting_schedules", domain: "CAP-TABLE", role: "master", necessity: "required", notes: "Per-grant vesting cadence and acceleration logic." },
  { data_object: "valuations_409a", domain: "CAP-TABLE", role: "master", necessity: "required", notes: "Issuer-side IRS 409A FMV. Distinct from PORT-MONIT's LP-side portco_valuations." },
  { data_object: "asc718_expense_periods", domain: "CAP-TABLE", role: "master", necessity: "required", notes: "Stock-based comp expense recognition periods." },
  { data_object: "exit_scenarios", domain: "CAP-TABLE", role: "master", necessity: "required", notes: "Hypothetical or committed exit-proceeds scenarios." },
  { data_object: "exit_waterfall_calculations", domain: "CAP-TABLE", role: "master", necessity: "required", notes: "Per-shareholder proceeds under exit scenarios." },
  { data_object: "employee_equity_accounts", domain: "CAP-TABLE", role: "master", necessity: "required", notes: "Per-employee portal accounts." },
  { data_object: "secondary_transactions", domain: "CAP-TABLE", role: "master", necessity: "required", notes: "Tender offers and employee-liquidity programs." },

  // EM-FUND-PLATFORM masters
  { data_object: "fund_formations", domain: "EM-FUND-PLATFORM", role: "master", necessity: "required", notes: "Fund-vehicle formation records — entry point for the bundled product." },
  { data_object: "spvs", domain: "EM-FUND-PLATFORM", role: "master", necessity: "required", notes: "Single-deal vehicles." },
  { data_object: "spv_subscriptions", domain: "EM-FUND-PLATFORM", role: "master", necessity: "required", notes: "Per-investor SPV subscriptions." },
  // EM-FUND-PLATFORM embedded
  { data_object: "funds", domain: "EM-FUND-PLATFORM", role: "embedded_master", necessity: "optional", notes: "EM platforms hold a lite funds shell when the customer has graduated past pure SPVs but not yet onto a full FUND-ADMIN deployment. Demotes to consumer when FUND-ADMIN is deployed." },
  { data_object: "lp_subscriptions", domain: "EM-FUND-PLATFORM", role: "embedded_master", necessity: "optional", notes: "Lite onboarding subscriptions — defers to FUND-ADMIN canonical when customer grows out of the bundle." },
  { data_object: "lp_commitments", domain: "EM-FUND-PLATFORM", role: "embedded_master", necessity: "optional", notes: "Lite commitments record — defers to FUND-ADMIN canonical." },
  { data_object: "capital_calls", domain: "EM-FUND-PLATFORM", role: "embedded_master", necessity: "optional", notes: "Lite capital-call workflow — single-fund single-class only." },
  { data_object: "cap_tables", domain: "EM-FUND-PLATFORM", role: "embedded_master", necessity: "optional", notes: "Lite cap-table for the GP entity and basic portco awareness. Defers to CAP-TABLE canonical when issuer needs full cap-table tooling." },
];

// ============================================================
// DOMAIN-MODULE-DATA-OBJECT mapping (per plan-modules.md §4.4)
// ============================================================
type DMDO = {
  data_object: string;
  module: string;
  role: "master" | "embedded_master" | "contributor" | "consumer" | "derived";
  necessity: "required" | "optional";
  notes: string;
};

const dmdoRows: DMDO[] = [
  // INV-CRM modules
  { data_object: "vc_deals", module: "INV-CRM-DEAL-PIPELINE", role: "master", necessity: "required", notes: "" },
  { data_object: "investment_memos", module: "INV-CRM-DEAL-PIPELINE", role: "master", necessity: "required", notes: "" },
  { data_object: "relationship_records", module: "INV-CRM-RELATIONSHIP-GRAPH", role: "master", necessity: "required", notes: "" },
  { data_object: "investor_contacts", module: "INV-CRM-RELATIONSHIP-GRAPH", role: "master", necessity: "required", notes: "" },
  { data_object: "investor_contacts", module: "INV-CRM-LP-CRM", role: "embedded_master", necessity: "required", notes: "LP-CRM uses the same contact record as the relationship graph; embedded with conformance to the min embedded shape." },
  { data_object: "lp_prospects", module: "INV-CRM-LP-CRM", role: "master", necessity: "required", notes: "" },
  { data_object: "portfolio_companies", module: "INV-CRM-LP-CRM", role: "embedded_master", necessity: "required", notes: "Deal-team navigation; PORT-MONIT-PORTCO-DATA canonical." },

  // FUND-ADMIN modules
  { data_object: "funds", module: "FUND-ADMIN-FUND-LEDGER", role: "master", necessity: "required", notes: "" },
  { data_object: "fund_ledger_entries", module: "FUND-ADMIN-FUND-LEDGER", role: "master", necessity: "required", notes: "" },
  { data_object: "fund_close_periods", module: "FUND-ADMIN-FUND-LEDGER", role: "master", necessity: "required", notes: "" },
  { data_object: "lp_subscriptions", module: "FUND-ADMIN-LP-COMMITMENTS", role: "master", necessity: "required", notes: "" },
  { data_object: "lp_commitments", module: "FUND-ADMIN-LP-COMMITMENTS", role: "master", necessity: "required", notes: "" },
  { data_object: "pcap_statements", module: "FUND-ADMIN-LP-COMMITMENTS", role: "master", necessity: "required", notes: "" },
  { data_object: "funds", module: "FUND-ADMIN-LP-COMMITMENTS", role: "embedded_master", necessity: "required", notes: "Subscriptions and PCAP statements reference funds; embedded with conformance." },
  { data_object: "capital_calls", module: "FUND-ADMIN-CAPITAL-CALLS", role: "master", necessity: "required", notes: "FUND-ADMIN-side master of the multi-master capital_calls record." },
  { data_object: "capital_call_responses", module: "FUND-ADMIN-CAPITAL-CALLS", role: "master", necessity: "required", notes: "" },
  { data_object: "funds", module: "FUND-ADMIN-CAPITAL-CALLS", role: "embedded_master", necessity: "required", notes: "" },
  { data_object: "lp_commitments", module: "FUND-ADMIN-CAPITAL-CALLS", role: "embedded_master", necessity: "required", notes: "" },
  { data_object: "fund_distributions", module: "FUND-ADMIN-DISTRIBUTIONS", role: "master", necessity: "required", notes: "" },
  { data_object: "waterfall_calculations", module: "FUND-ADMIN-DISTRIBUTIONS", role: "master", necessity: "required", notes: "" },
  { data_object: "funds", module: "FUND-ADMIN-DISTRIBUTIONS", role: "embedded_master", necessity: "required", notes: "" },
  { data_object: "lp_commitments", module: "FUND-ADMIN-DISTRIBUTIONS", role: "embedded_master", necessity: "required", notes: "" },

  // PORT-MONIT modules
  { data_object: "portfolio_companies", module: "PORT-MONIT-PORTCO-DATA", role: "master", necessity: "required", notes: "" },
  { data_object: "portco_kpi_periods", module: "PORT-MONIT-PORTCO-DATA", role: "master", necessity: "required", notes: "" },
  { data_object: "portco_esg_records", module: "PORT-MONIT-PORTCO-DATA", role: "master", necessity: "required", notes: "" },
  { data_object: "portco_valuations", module: "PORT-MONIT-VALUATIONS", role: "master", necessity: "required", notes: "" },
  { data_object: "portfolio_companies", module: "PORT-MONIT-VALUATIONS", role: "embedded_master", necessity: "required", notes: "" },
  { data_object: "fund_position_returns", module: "PORT-MONIT-FUND-PERF", role: "master", necessity: "required", notes: "" },
  { data_object: "fund_performance_periods", module: "PORT-MONIT-FUND-PERF", role: "master", necessity: "required", notes: "" },
  { data_object: "funds", module: "PORT-MONIT-FUND-PERF", role: "embedded_master", necessity: "required", notes: "FUND-ADMIN canonical." },
  { data_object: "portfolio_companies", module: "PORT-MONIT-FUND-PERF", role: "embedded_master", necessity: "required", notes: "" },
  { data_object: "lp_quarterly_reports", module: "PORT-MONIT-LP-REPORTING", role: "master", necessity: "required", notes: "" },
  { data_object: "funds", module: "PORT-MONIT-LP-REPORTING", role: "embedded_master", necessity: "required", notes: "" },

  // CAP-TABLE modules
  { data_object: "cap_tables", module: "CAP-TABLE-LEDGER", role: "master", necessity: "required", notes: "" },
  { data_object: "security_classes", module: "CAP-TABLE-LEDGER", role: "master", necessity: "required", notes: "" },
  { data_object: "shareholder_records", module: "CAP-TABLE-LEDGER", role: "master", necessity: "required", notes: "" },
  { data_object: "equity_grants", module: "CAP-TABLE-GRANTS", role: "master", necessity: "required", notes: "Cap-table-side multi-master alongside COMP-MGMT." },
  { data_object: "option_pools", module: "CAP-TABLE-GRANTS", role: "master", necessity: "required", notes: "" },
  { data_object: "vesting_schedules", module: "CAP-TABLE-GRANTS", role: "master", necessity: "required", notes: "" },
  { data_object: "cap_tables", module: "CAP-TABLE-GRANTS", role: "embedded_master", necessity: "required", notes: "" },
  { data_object: "valuations_409a", module: "CAP-TABLE-VALUATIONS", role: "master", necessity: "required", notes: "" },
  { data_object: "asc718_expense_periods", module: "CAP-TABLE-VALUATIONS", role: "master", necessity: "required", notes: "" },
  { data_object: "cap_tables", module: "CAP-TABLE-VALUATIONS", role: "embedded_master", necessity: "required", notes: "" },
  { data_object: "equity_grants", module: "CAP-TABLE-VALUATIONS", role: "embedded_master", necessity: "required", notes: "ASC 718 expense periods cohort grants." },
  { data_object: "exit_scenarios", module: "CAP-TABLE-EXIT-MODELING", role: "master", necessity: "required", notes: "" },
  { data_object: "exit_waterfall_calculations", module: "CAP-TABLE-EXIT-MODELING", role: "master", necessity: "required", notes: "" },
  { data_object: "cap_tables", module: "CAP-TABLE-EXIT-MODELING", role: "embedded_master", necessity: "required", notes: "" },
  { data_object: "security_classes", module: "CAP-TABLE-EXIT-MODELING", role: "embedded_master", necessity: "required", notes: "Liquidation preferences drive the waterfall." },
  { data_object: "employee_equity_accounts", module: "CAP-TABLE-EMPLOYEE-PORTAL", role: "master", necessity: "required", notes: "" },
  { data_object: "equity_grants", module: "CAP-TABLE-EMPLOYEE-PORTAL", role: "embedded_master", necessity: "required", notes: "Portal exposes grant visibility to employee." },
  { data_object: "vesting_schedules", module: "CAP-TABLE-EMPLOYEE-PORTAL", role: "embedded_master", necessity: "required", notes: "" },
  { data_object: "secondary_transactions", module: "CAP-TABLE-SECONDARY", role: "master", necessity: "required", notes: "" },
  { data_object: "cap_tables", module: "CAP-TABLE-SECONDARY", role: "embedded_master", necessity: "required", notes: "" },
  { data_object: "shareholder_records", module: "CAP-TABLE-SECONDARY", role: "embedded_master", necessity: "required", notes: "" },

  // EM-FUND-PLATFORM modules
  { data_object: "fund_formations", module: "EM-FUND-FORMATION", role: "master", necessity: "required", notes: "" },
  { data_object: "spvs", module: "EM-FUND-SPV", role: "master", necessity: "required", notes: "" },
  { data_object: "spv_subscriptions", module: "EM-FUND-SPV", role: "master", necessity: "required", notes: "" },
  { data_object: "lp_subscriptions", module: "EM-FUND-OPS-LITE", role: "embedded_master", necessity: "optional", notes: "Lite subscription workflow; demotes when FUND-ADMIN-LP-COMMITMENTS lands." },
  { data_object: "lp_commitments", module: "EM-FUND-OPS-LITE", role: "embedded_master", necessity: "optional", notes: "Lite commitments; demotes to consumer when FUND-ADMIN deployed." },
  { data_object: "capital_calls", module: "EM-FUND-OPS-LITE", role: "embedded_master", necessity: "optional", notes: "Lite single-fund single-class call workflow." },
  { data_object: "funds", module: "EM-FUND-OPS-LITE", role: "embedded_master", necessity: "optional", notes: "" },
  { data_object: "cap_tables", module: "EM-FUND-CAPTABLE-LITE", role: "embedded_master", necessity: "optional", notes: "Lite cap-table; demotes to consumer when CAP-TABLE-LEDGER deployed." },
];

// ============================================================
// LIFECYCLE STATES (Rule #12)
// ============================================================
type LCState = {
  data_object: string;
  state_name: string;
  state_order: number;
  description: string;
  is_initial?: boolean;
  is_terminal?: boolean;
  requires_permission?: boolean;
  permission_verb_override?: string;
  module?: string; // attribute the state to a specific module if applicable
};

const lifecycleStates: LCState[] = [
  // vc_deals
  { data_object: "vc_deals", state_name: "sourced", state_order: 10, description: "Deal identified, basic info captured, not yet evaluated.", is_initial: true },
  { data_object: "vc_deals", state_name: "in_diligence", state_order: 20, description: "Deal team is actively evaluating; data room access, founder meetings, reference calls." },
  { data_object: "vc_deals", state_name: "ic_review", state_order: 30, description: "Investment memo submitted, IC vote scheduled.", requires_permission: true, permission_verb_override: "submit_for_ic" },
  { data_object: "vc_deals", state_name: "term_sheet", state_order: 40, description: "Term sheet issued, in negotiation.", requires_permission: true, permission_verb_override: "issue_term_sheet" },
  { data_object: "vc_deals", state_name: "closed", state_order: 50, description: "Investment closed and funded.", requires_permission: true, permission_verb_override: "close_deal", is_terminal: false },
  { data_object: "vc_deals", state_name: "declined", state_order: 60, description: "Deal team or IC declined; not pursued.", is_terminal: true },

  // funds
  { data_object: "funds", state_name: "fundraising", state_order: 10, description: "Fund in active fundraising; commitments not yet locked.", is_initial: true },
  { data_object: "funds", state_name: "final_close", state_order: 20, description: "Final close completed; commitment book is locked.", requires_permission: true, permission_verb_override: "execute_final_close" },
  { data_object: "funds", state_name: "investment_period", state_order: 30, description: "Active investment period; new portfolio investments allowed." },
  { data_object: "funds", state_name: "harvesting", state_order: 40, description: "Investment period ended; focus on portfolio monitoring and exits." },
  { data_object: "funds", state_name: "wound_down", state_order: 50, description: "Final distributions paid; fund dissolution complete.", is_terminal: true },

  // lp_commitments
  { data_object: "lp_commitments", state_name: "committed", state_order: 10, description: "Subscription executed; commitment active.", is_initial: true },
  { data_object: "lp_commitments", state_name: "called", state_order: 20, description: "Capital partially called against the commitment." },
  { data_object: "lp_commitments", state_name: "fully_called", state_order: 30, description: "100% of commitment called." },
  { data_object: "lp_commitments", state_name: "distributed", state_order: 40, description: "Distributions exceed commitments; net positive position.", is_terminal: false },

  // fund_distributions
  { data_object: "fund_distributions", state_name: "drafted", state_order: 10, description: "Distribution scenario modeled, not yet declared.", is_initial: true },
  { data_object: "fund_distributions", state_name: "declared", state_order: 20, description: "Declared by Managing Partner; record date set; PCAP impact computed.", requires_permission: true, permission_verb_override: "declare_distribution" },
  { data_object: "fund_distributions", state_name: "executed", state_order: 30, description: "Payments executed; LP-side notices sent." },
  { data_object: "fund_distributions", state_name: "completed", state_order: 40, description: "All payments confirmed received; reconciliation complete.", is_terminal: true },

  // valuations_409a
  { data_object: "valuations_409a", state_name: "drafted", state_order: 10, description: "Valuation analysis in progress.", is_initial: true },
  { data_object: "valuations_409a", state_name: "reviewed", state_order: 20, description: "External-firm review complete; awaiting GP sign-off." },
  { data_object: "valuations_409a", state_name: "final", state_order: 30, description: "GP-signed; active 409A for grant pricing.", requires_permission: true, permission_verb_override: "approve_409a" },
  { data_object: "valuations_409a", state_name: "superseded", state_order: 40, description: "Replaced by a newer 409A.", is_terminal: true },

  // cap_tables
  { data_object: "cap_tables", state_name: "nascent", state_order: 10, description: "Issuer formed, founder shares issued, no other rounds yet.", is_initial: true },
  { data_object: "cap_tables", state_name: "active", state_order: 20, description: "Operating cap table with at least one priced or convertible round." },
  { data_object: "cap_tables", state_name: "exit", state_order: 30, description: "Exit event has occurred; cap-table in wind-down state.", is_terminal: true },

  // exit_scenarios
  { data_object: "exit_scenarios", state_name: "hypothetical", state_order: 10, description: "What-if scenario for board / planning.", is_initial: true },
  { data_object: "exit_scenarios", state_name: "committed", state_order: 20, description: "Actual transaction in negotiation or signed.", requires_permission: true, permission_verb_override: "commit_exit_scenario" },
  { data_object: "exit_scenarios", state_name: "executed", state_order: 30, description: "Transaction closed; proceeds distributed per the waterfall.", is_terminal: true },

  // secondary_transactions
  { data_object: "secondary_transactions", state_name: "drafted", state_order: 10, description: "Transaction proposed.", is_initial: true },
  { data_object: "secondary_transactions", state_name: "approved", state_order: 20, description: "Board-approved.", requires_permission: true, permission_verb_override: "approve_secondary" },
  { data_object: "secondary_transactions", state_name: "executed", state_order: 30, description: "Transfer completed; cap table updated." },
  { data_object: "secondary_transactions", state_name: "settled", state_order: 40, description: "Funds settled to selling shareholders.", is_terminal: true },

  // portfolio_companies
  { data_object: "portfolio_companies", state_name: "active", state_order: 10, description: "Held investment, currently monitored.", is_initial: true },
  { data_object: "portfolio_companies", state_name: "exited", state_order: 20, description: "Sold or IPO'd; proceeds returned.", is_terminal: true },
  { data_object: "portfolio_companies", state_name: "written_off", state_order: 30, description: "Marked to zero; no recovery expected.", is_terminal: true },

  // spvs
  { data_object: "spvs", state_name: "forming", state_order: 10, description: "SPV being created; legal documents in flight.", is_initial: true },
  { data_object: "spvs", state_name: "active", state_order: 20, description: "Investment held; ongoing administration." },
  { data_object: "spvs", state_name: "wound_down", state_order: 30, description: "Exit completed; SPV dissolved.", is_terminal: true },

  // fund_formations
  { data_object: "fund_formations", state_name: "drafted", state_order: 10, description: "Formation in planning.", is_initial: true },
  { data_object: "fund_formations", state_name: "filed", state_order: 20, description: "Entity-formation documents filed with the state." },
  { data_object: "fund_formations", state_name: "operational", state_order: 30, description: "EIN issued, banking onboarded, LPA executed; fund operational. Triggers migration to FUND-ADMIN if customer outgrows the EM bundle.", is_terminal: true },
];

// ============================================================
// TRIGGER EVENTS (controlled vocabulary on data_object state changes)
// ============================================================
type TrigEv = {
  event_name: string;
  data_object: string;
  description: string;
  event_category: "lifecycle" | "state_change" | "threshold" | "signal";
};

const triggerEvents: TrigEv[] = [
  { event_name: "vc_deal.closed", data_object: "vc_deals", description: "Deal has been signed and funded; portfolio company is now held.", event_category: "state_change" },
  { event_name: "fund.final_close", data_object: "funds", description: "Fund has reached final close; commitment book locked.", event_category: "state_change" },
  { event_name: "capital_call.issued", data_object: "capital_calls", description: "Capital call notice sent to LPs.", event_category: "state_change" },
  { event_name: "capital_call.funded", data_object: "capital_calls", description: "All call line items funded by LPs.", event_category: "state_change" },
  { event_name: "fund_distribution.declared", data_object: "fund_distributions", description: "Distribution declared by Managing Partner; record date set.", event_category: "state_change" },
  { event_name: "fund_distribution.executed", data_object: "fund_distributions", description: "Distribution payments executed.", event_category: "state_change" },
  { event_name: "portco_valuation.final", data_object: "portco_valuations", description: "Quarter-end valuation locked; impacts PCAP and LP reports.", event_category: "state_change" },
  { event_name: "valuation_409a.final", data_object: "valuations_409a", description: "New 409A approved; future grants must price against it.", event_category: "state_change" },
  { event_name: "exit_scenario.executed", data_object: "exit_scenarios", description: "Exit closed; waterfall proceeds distributed to shareholders.", event_category: "state_change" },
  { event_name: "secondary_transaction.executed", data_object: "secondary_transactions", description: "Secondary transfer completed; cap table updated.", event_category: "state_change" },
  { event_name: "fund_formation.operational", data_object: "fund_formations", description: "EM fund vehicle operational; signals potential migration path to FUND-ADMIN.", event_category: "state_change" },
];

// ============================================================
// CROSS-DOMAIN HANDOFFS (outbound only per B8)
// ============================================================
type Handoff = {
  trigger_event: string;     // event_name
  source_domain: string;
  source_module: string;     // domain_module_code
  target_domain: string;
  target_module?: string;
  data_object: string;       // payload data_object name
  integration_pattern: "event_stream" | "api_call" | "batch_sync" | "manual_handoff" | "file_drop";
  friction_level: "low" | "medium" | "high";
  description: string;
};

const handoffs: Handoff[] = [
  // vc_deal.closed → multiple subscribers
  { trigger_event: "vc_deal.closed", source_domain: "INV-CRM", source_module: "INV-CRM-DEAL-PIPELINE", target_domain: "FUND-ADMIN", target_module: "FUND-ADMIN-CAPITAL-CALLS", data_object: "capital_calls", integration_pattern: "api_call", friction_level: "medium", description: "Closed deal triggers capital-call scheduling against the deploying fund's LP commitments. Today via custom integration between deal-flow CRM and fund-admin platform; mid-friction (timing of close vs LP-side notice deadlines)." },
  { trigger_event: "vc_deal.closed", source_domain: "INV-CRM", source_module: "INV-CRM-DEAL-PIPELINE", target_domain: "PORT-MONIT", target_module: "PORT-MONIT-PORTCO-DATA", data_object: "portfolio_companies", integration_pattern: "manual_handoff", friction_level: "high", description: "Closed deal must be added to portfolio-monitoring as a portfolio_company record with sector tag, board observer assignment, and KPI cadence. Often manual: deal lead emails portfolio team. Multi-shape pattern: identity reconciliation between INV-CRM contact record and PORT-MONIT portco entity." },

  // fund.final_close → multiple
  { trigger_event: "fund.final_close", source_domain: "FUND-ADMIN", source_module: "FUND-ADMIN-FUND-LEDGER", target_domain: "INV-CRM", target_module: "INV-CRM-LP-CRM", data_object: "lp_prospects", integration_pattern: "manual_handoff", friction_level: "medium", description: "Final close converts lp_prospects to lp_commitments; CRM-side prospect records need closure / archival. Today manual; the lp_prospect → lp_commitment transition is the canonical fundraising-to-fund-admin handoff." },

  // capital_call.issued → INV-CRM
  { trigger_event: "capital_call.issued", source_domain: "FUND-ADMIN", source_module: "FUND-ADMIN-CAPITAL-CALLS", target_domain: "INV-CRM", target_module: "INV-CRM-LP-CRM", data_object: "lp_commitments", integration_pattern: "api_call", friction_level: "low", description: "Capital call notification appears in LP-CRM as a touchpoint for the LP relationship — low-friction in tools that share LP master data, higher when LP CRM is separate." },

  // fund_distribution.executed → PORT-MONIT
  { trigger_event: "fund_distribution.executed", source_domain: "FUND-ADMIN", source_module: "FUND-ADMIN-DISTRIBUTIONS", target_domain: "PORT-MONIT", target_module: "PORT-MONIT-FUND-PERF", data_object: "fund_performance_periods", integration_pattern: "batch_sync", friction_level: "low", description: "Executed distributions update fund-level performance metrics (DPI, RVPI, TVPI). Routine batch sync." },

  // portco_valuation.final → FUND-ADMIN (PCAP needs update)
  { trigger_event: "portco_valuation.final", source_domain: "PORT-MONIT", source_module: "PORT-MONIT-VALUATIONS", target_domain: "FUND-ADMIN", target_module: "FUND-ADMIN-LP-COMMITMENTS", data_object: "pcap_statements", integration_pattern: "batch_sync", friction_level: "medium", description: "Quarter-end valuations drive PCAP statement updates; timing-coupled to the close calendar. Mid-friction when valuation and fund-admin tools are different vendors." },

  // valuation_409a.final → CAP-TABLE-GRANTS (re-strike calculations for new grants)
  // SAME DOMAIN — intra-domain handoff, do NOT record (validation rule rejects)

  // exit_scenario.executed → FUND-ADMIN
  { trigger_event: "exit_scenario.executed", source_domain: "CAP-TABLE", source_module: "CAP-TABLE-EXIT-MODELING", target_domain: "FUND-ADMIN", target_module: "FUND-ADMIN-DISTRIBUTIONS", data_object: "fund_distributions", integration_pattern: "manual_handoff", friction_level: "high", description: "Portfolio exit generates fund-side proceeds requiring distribution to LPs. Cross-vendor pattern between issuer-side cap-table tools and fund-admin; multi-shape (identity reconciliation between issuer and fund's investment vehicle + timing of post-close fund mechanics)." },

  // exit_scenario.executed → PORT-MONIT (mark portco exited)
  { trigger_event: "exit_scenario.executed", source_domain: "CAP-TABLE", source_module: "CAP-TABLE-EXIT-MODELING", target_domain: "PORT-MONIT", target_module: "PORT-MONIT-PORTCO-DATA", data_object: "portfolio_companies", integration_pattern: "manual_handoff", friction_level: "medium", description: "Exit event transitions portfolio_companies to `exited` state; final position return locked. Manual in most stacks because the cap-table and portfolio-monitoring tools are different vendors and the exit signal arrives via legal close, not via integrated feed." },

  // fund_formation.operational → FUND-ADMIN (migration path)
  { trigger_event: "fund_formation.operational", source_domain: "EM-FUND-PLATFORM", source_module: "EM-FUND-FORMATION", target_domain: "FUND-ADMIN", target_module: "FUND-ADMIN-FUND-LEDGER", data_object: "funds", integration_pattern: "manual_handoff", friction_level: "medium", description: "Emerging-manager fund formed; if customer migrates from EM-bundle to a full fund-admin stack later, the fund_formation record becomes the basis for FUND-ADMIN's `funds` record. Today entirely manual — customers re-key into the new platform." },
];

// ============================================================
// DATA OBJECT RELATIONSHIPS
// ============================================================
type DOR = {
  source: string;
  target: string;
  type: "one_to_one" | "one_to_many" | "many_to_one" | "many_to_many";
  kind: "reference" | "composition" | "association" | "inheritance";
  verb: string;
  inverse_verb: string;
  required: boolean;
  owner_side: "source" | "target";
  notes: string;
};

const relationships: DOR[] = [
  // ===== INV-CRM intra =====
  { source: "vc_deals", target: "investment_memos", type: "one_to_many", kind: "composition", verb: "documented by", inverse_verb: "documents", required: false, owner_side: "source", notes: "intra | INV-CRM | each deal has one or more IC memos" },
  { source: "investor_contacts", target: "relationship_records", type: "one_to_many", kind: "reference", verb: "is referenced by", inverse_verb: "references", required: false, owner_side: "target", notes: "intra | INV-CRM | relationship_records reference contacts (originally many_to_one; flipped for enum compliance)" },
  { source: "investor_contacts", target: "lp_prospects", type: "one_to_many", kind: "reference", verb: "is represented by", inverse_verb: "represents", required: false, owner_side: "target", notes: "intra | INV-CRM | LP prospect is the relationship lens on an investor_contact" },
  { source: "vc_deals", target: "investor_contacts", type: "many_to_many", kind: "reference", verb: "involves", inverse_verb: "is involved in", required: false, owner_side: "source", notes: "intra | INV-CRM | deal team interacts with founders, co-investors, advisors" },

  // ===== FUND-ADMIN intra =====
  { source: "funds", target: "fund_ledger_entries", type: "one_to_many", kind: "composition", verb: "accumulates", inverse_verb: "is booked against", required: true, owner_side: "source", notes: "intra | FUND-ADMIN | fund ledger" },
  { source: "funds", target: "fund_close_periods", type: "one_to_many", kind: "composition", verb: "closes through", inverse_verb: "belongs to", required: true, owner_side: "source", notes: "intra | FUND-ADMIN | close cycles per fund" },
  { source: "funds", target: "lp_subscriptions", type: "one_to_many", kind: "composition", verb: "is subscribed via", inverse_verb: "subscribes to", required: true, owner_side: "source", notes: "intra | FUND-ADMIN" },
  { source: "funds", target: "lp_commitments", type: "one_to_many", kind: "composition", verb: "is committed via", inverse_verb: "commits to", required: true, owner_side: "source", notes: "intra | FUND-ADMIN" },
  { source: "funds", target: "pcap_statements", type: "one_to_many", kind: "composition", verb: "reports via", inverse_verb: "reports on", required: true, owner_side: "source", notes: "intra | FUND-ADMIN" },
  { source: "funds", target: "capital_calls", type: "one_to_many", kind: "composition", verb: "calls capital via", inverse_verb: "draws on", required: true, owner_side: "source", notes: "intra | FUND-ADMIN" },
  { source: "funds", target: "fund_distributions", type: "one_to_many", kind: "composition", verb: "distributes via", inverse_verb: "distributes from", required: true, owner_side: "source", notes: "intra | FUND-ADMIN" },
  { source: "lp_commitments", target: "lp_subscriptions", type: "one_to_one", kind: "reference", verb: "originates from", inverse_verb: "creates", required: true, owner_side: "source", notes: "intra | FUND-ADMIN | commitment created by subscription" },
  { source: "capital_calls", target: "capital_call_responses", type: "one_to_many", kind: "composition", verb: "is allocated to LPs as", inverse_verb: "responds to", required: true, owner_side: "source", notes: "intra | FUND-ADMIN" },
  { source: "fund_distributions", target: "waterfall_calculations", type: "one_to_one", kind: "composition", verb: "is computed by", inverse_verb: "computes", required: true, owner_side: "source", notes: "intra | FUND-ADMIN" },
  { source: "lp_commitments", target: "capital_call_responses", type: "one_to_many", kind: "reference", verb: "fulfills via", inverse_verb: "draws on", required: true, owner_side: "source", notes: "intra | FUND-ADMIN | LP's call obligations roll up to commitment" },

  // ===== PORT-MONIT intra =====
  { source: "portfolio_companies", target: "portco_kpi_periods", type: "one_to_many", kind: "composition", verb: "reports KPIs via", inverse_verb: "reports for", required: true, owner_side: "source", notes: "intra | PORT-MONIT" },
  { source: "portfolio_companies", target: "portco_esg_records", type: "one_to_many", kind: "composition", verb: "reports ESG via", inverse_verb: "reports for", required: false, owner_side: "source", notes: "intra | PORT-MONIT" },
  { source: "portfolio_companies", target: "portco_valuations", type: "one_to_many", kind: "composition", verb: "is valued via", inverse_verb: "marks", required: true, owner_side: "source", notes: "intra | PORT-MONIT" },
  { source: "funds", target: "fund_position_returns", type: "one_to_many", kind: "composition", verb: "produces returns via", inverse_verb: "is computed for", required: true, owner_side: "source", notes: "cross-domain | PORT-MONIT consumes FUND-ADMIN funds" },
  { source: "funds", target: "fund_performance_periods", type: "one_to_many", kind: "composition", verb: "reports performance via", inverse_verb: "reports for", required: true, owner_side: "source", notes: "cross-domain" },
  { source: "funds", target: "lp_quarterly_reports", type: "one_to_many", kind: "composition", verb: "is reported via", inverse_verb: "reports on", required: true, owner_side: "source", notes: "cross-domain | PORT-MONIT consumes FUND-ADMIN funds" },
  { source: "portfolio_companies", target: "fund_position_returns", type: "one_to_many", kind: "reference", verb: "drives returns via", inverse_verb: "is computed against", required: true, owner_side: "source", notes: "intra | PORT-MONIT | position returns reference both fund and portco" },

  // ===== CAP-TABLE intra =====
  { source: "cap_tables", target: "security_classes", type: "one_to_many", kind: "composition", verb: "defines", inverse_verb: "is defined in", required: true, owner_side: "source", notes: "intra | CAP-TABLE" },
  { source: "cap_tables", target: "shareholder_records", type: "one_to_many", kind: "composition", verb: "tracks holders via", inverse_verb: "holds in", required: true, owner_side: "source", notes: "intra | CAP-TABLE" },
  { source: "cap_tables", target: "option_pools", type: "one_to_many", kind: "composition", verb: "reserves equity via", inverse_verb: "is reserved within", required: true, owner_side: "source", notes: "intra | CAP-TABLE" },
  { source: "option_pools", target: "equity_grants", type: "one_to_many", kind: "composition", verb: "issues", inverse_verb: "is drawn from", required: true, owner_side: "source", notes: "intra | CAP-TABLE | grants debit the pool" },
  { source: "equity_grants", target: "vesting_schedules", type: "one_to_one", kind: "composition", verb: "vests on", inverse_verb: "governs", required: true, owner_side: "source", notes: "intra | CAP-TABLE" },
  { source: "cap_tables", target: "valuations_409a", type: "one_to_many", kind: "composition", verb: "is valued via", inverse_verb: "values", required: true, owner_side: "source", notes: "intra | CAP-TABLE" },
  { source: "valuations_409a", target: "asc718_expense_periods", type: "one_to_many", kind: "reference", verb: "anchors expense for", inverse_verb: "references", required: true, owner_side: "source", notes: "intra | CAP-TABLE | 409A FMV anchors ASC 718 expense math" },
  { source: "cap_tables", target: "exit_scenarios", type: "one_to_many", kind: "composition", verb: "models exits via", inverse_verb: "is modeled on", required: false, owner_side: "source", notes: "intra | CAP-TABLE" },
  { source: "exit_scenarios", target: "exit_waterfall_calculations", type: "one_to_one", kind: "composition", verb: "is computed by", inverse_verb: "computes", required: true, owner_side: "source", notes: "intra | CAP-TABLE" },
  { source: "employee_equity_accounts", target: "equity_grants", type: "one_to_many", kind: "reference", verb: "displays", inverse_verb: "is displayed in", required: true, owner_side: "source", notes: "intra | CAP-TABLE | employee portal view" },
  { source: "cap_tables", target: "secondary_transactions", type: "one_to_many", kind: "reference", verb: "is altered by", inverse_verb: "alters", required: false, owner_side: "target", notes: "intra | CAP-TABLE" },
  { source: "secondary_transactions", target: "shareholder_records", type: "many_to_many", kind: "reference", verb: "transfers between", inverse_verb: "participates in", required: true, owner_side: "source", notes: "intra | CAP-TABLE | seller and buyer shareholder rows" },

  // ===== EM-FUND-PLATFORM intra + cross-to-FUND-ADMIN =====
  { source: "spvs", target: "spv_subscriptions", type: "one_to_many", kind: "composition", verb: "is subscribed via", inverse_verb: "subscribes to", required: true, owner_side: "source", notes: "intra | EM-FUND-PLATFORM" },
  { source: "fund_formations", target: "funds", type: "one_to_one", kind: "reference", verb: "becomes", inverse_verb: "originated from", required: false, owner_side: "source", notes: "cross-domain | EM-FUND-PLATFORM → FUND-ADMIN | migration path when EM customer outgrows the bundle" },

  // ===== Cross-domain payload→target relationships =====
  { source: "vc_deals", target: "portfolio_companies", type: "one_to_one", kind: "reference", verb: "becomes", inverse_verb: "originated from", required: false, owner_side: "source", notes: "cross-domain | INV-CRM-DEAL-PIPELINE → PORT-MONIT-PORTCO-DATA | closed deal becomes portfolio company" },
  { source: "vc_deals", target: "capital_calls", type: "one_to_many", kind: "reference", verb: "triggers", inverse_verb: "is triggered by", required: false, owner_side: "source", notes: "cross-domain | INV-CRM-DEAL-PIPELINE → FUND-ADMIN-CAPITAL-CALLS | closed deal requires capital draw" },
  { source: "exit_scenarios", target: "fund_distributions", type: "one_to_many", kind: "reference", verb: "drives", inverse_verb: "is driven by", required: false, owner_side: "source", notes: "cross-domain | CAP-TABLE-EXIT-MODELING → FUND-ADMIN-DISTRIBUTIONS | executed exit triggers fund-side distribution" },
  { source: "portco_valuations", target: "pcap_statements", type: "one_to_many", kind: "reference", verb: "updates", inverse_verb: "is updated by", required: false, owner_side: "source", notes: "cross-domain | PORT-MONIT-VALUATIONS → FUND-ADMIN-LP-COMMITMENTS | quarter-end marks update PCAP" },
];

// Users edges (Rule #10). For each, two rows (one for each direction).
const usersEdges: Array<{ data_object: string; user_role: string; verb: string; inverse_verb: string }> = [
  { data_object: "vc_deals", user_role: "deal_lead", verb: "is led by", inverse_verb: "leads" },
  { data_object: "vc_deals", user_role: "partner_owner", verb: "is sponsored by", inverse_verb: "sponsors" },
  { data_object: "investment_memos", user_role: "author", verb: "is authored by", inverse_verb: "authors" },
  { data_object: "relationship_records", user_role: "owner", verb: "is owned by", inverse_verb: "owns" },
  { data_object: "funds", user_role: "gp_owner", verb: "is managed by", inverse_verb: "manages" },
  { data_object: "lp_commitments", user_role: "signer", verb: "is signed by", inverse_verb: "signs" },
  { data_object: "capital_calls", user_role: "approver", verb: "is approved by", inverse_verb: "approves" },
  { data_object: "fund_distributions", user_role: "approver", verb: "is approved by", inverse_verb: "approves" },
  { data_object: "portfolio_companies", user_role: "board_observer", verb: "is observed by", inverse_verb: "observes" },
  { data_object: "portco_valuations", user_role: "analyst", verb: "is computed by", inverse_verb: "computes" },
  { data_object: "cap_tables", user_role: "cfo_owner", verb: "is administered by", inverse_verb: "administers" },
  { data_object: "valuations_409a", user_role: "approver", verb: "is signed off by", inverse_verb: "signs off" },
  { data_object: "exit_scenarios", user_role: "modeler", verb: "is modeled by", inverse_verb: "models" },
  { data_object: "secondary_transactions", user_role: "executor", verb: "is executed by", inverse_verb: "executes" },
  { data_object: "employee_equity_accounts", user_role: "holder", verb: "is held by", inverse_verb: "holds" },
  { data_object: "fund_formations", user_role: "formation_lead", verb: "is formed by", inverse_verb: "forms" },
  { data_object: "spvs", user_role: "organizer", verb: "is organized by", inverse_verb: "organizes" },
];

// ============================================================
// ALIASES
// ============================================================
const aliases: Array<{ data_object: string; alias_name: string; alias_type: string; notes: string }> = [
  { data_object: "funds", alias_name: "investment vehicles", alias_type: "synonym", notes: "Generic alt-asset term." },
  { data_object: "funds", alias_name: "partnerships", alias_type: "synonym", notes: "Legal-form term — most VC/PE funds are limited partnerships." },
  { data_object: "vc_deals", alias_name: "investment opportunities", alias_type: "synonym", notes: "Pipeline-stage neutral term." },
  { data_object: "vc_deals", alias_name: "pipeline opportunities", alias_type: "synonym", notes: "Common in Affinity / 4Degrees terminology." },
  { data_object: "portfolio_companies", alias_name: "portcos", alias_type: "synonym", notes: "Industry shorthand." },
  { data_object: "portfolio_companies", alias_name: "investments", alias_type: "synonym", notes: "When viewed from the fund's perspective." },
  { data_object: "cap_tables", alias_name: "shareholder ledgers", alias_type: "synonym", notes: "Pre-software / legal terminology." },
  { data_object: "cap_tables", alias_name: "equity ledgers", alias_type: "synonym", notes: "Alternative term." },
  { data_object: "security_classes", alias_name: "share classes", alias_type: "synonym", notes: "More common in legal docs." },
  { data_object: "security_classes", alias_name: "preferred series", alias_type: "synonym", notes: "When the class is a priced round." },
  { data_object: "valuations_409a", alias_name: "409A valuations", alias_type: "synonym", notes: "The IRS section number is the universal name." },
  { data_object: "valuations_409a", alias_name: "FMV reports", alias_type: "synonym", notes: "Generic fair-market-value abbreviation." },
  { data_object: "pcap_statements", alias_name: "partner capital statements", alias_type: "synonym", notes: "Expanded form." },
  { data_object: "pcap_statements", alias_name: "Q-end statements", alias_type: "synonym", notes: "Common informal term." },
  { data_object: "spvs", alias_name: "special purpose vehicles", alias_type: "synonym", notes: "Expanded form." },
  { data_object: "spvs", alias_name: "syndicate deals", alias_type: "synonym", notes: "Common in AngelList / micro-VC vernacular." },
  { data_object: "lp_commitments", alias_name: "subscriptions", alias_type: "synonym", notes: "Common shorthand — overloaded with `lp_subscriptions` which is the formal document; in conversation people use these interchangeably." },
  { data_object: "investment_memos", alias_name: "IC memos", alias_type: "synonym", notes: "Investment-committee documents." },
  { data_object: "vesting_schedules", alias_name: "vesting cadences", alias_type: "synonym", notes: "Less formal." },
  { data_object: "exit_scenarios", alias_name: "exit waterfalls", alias_type: "synonym", notes: "Often used as a unit with exit_waterfall_calculations." },
];

// ============================================================
// RUN
// ============================================================
async function main() {
  // 0. Resolve known fixed ids
  const usersDOID = 748;

  // 1. Look up domain ids
  const domainCodes = ["INV-CRM", "FUND-ADMIN", "PORT-MONIT", "CAP-TABLE", "EM-FUND-PLATFORM"];
  const domainRows = await get(`/domains?domain_code=in.(${domainCodes.join(",")})&select=id,domain_code`);
  const domainMap = new Map<string, number>();
  for (const r of domainRows) domainMap.set(String(r.domain_code), Number(r.id));

  // 2. Look up module ids
  const moduleCodes = Array.from(new Set([
    ...dmdoRows.map(r => r.module),
    ...handoffs.flatMap(h => [h.source_module, h.target_module].filter(Boolean) as string[]),
  ]));
  const moduleRows = await get(`/domain_modules?domain_module_code=in.(${moduleCodes.join(",")})&select=id,domain_module_code`);
  const moduleMap = new Map<string, number>();
  for (const r of moduleRows) moduleMap.set(String(r.domain_module_code), Number(r.id));

  // 3. Insert data_objects (skip ones that already exist)
  console.log("\n=== data_objects ===");
  const doRows = dataObjects.map(d => ({
    data_object_name: d.name,
    singular_label: d.singular,
    plural_label: d.plural,
    description: d.description,
    kind: "domain_owned",
    is_canonical_bare_word: d.is_canonical_bare_word ?? false,
    naming_authority_rationale: d.naming_authority_rationale ?? "",
    minimum_embedded_shape: d.minimum_embedded_shape ?? "",
    has_personal_content: d.has_personal_content ?? false,
    has_submit_lock: d.has_submit_lock ?? false,
    has_single_approver: d.has_single_approver ?? false,
  }));
  const doMap = await syncTable("/data_objects", doRows, "data_object_name");
  // Add existing data_objects to the map for cross-references
  const existingDOs = await get(`/data_objects?data_object_name=in.(capital_calls,equity_grants)&select=id,data_object_name`);
  for (const r of existingDOs) doMap.set(String(r.data_object_name), Number(r.id));

  // 4. domain_data_objects
  console.log("\n=== domain_data_objects ===");
  const existingDDO = await get("/domain_data_objects?select=domain_id,data_object_id,role&limit=20000");
  const existingDDOSet = new Set(existingDDO.map(r => `${r.domain_id}:${r.data_object_id}:${r.role}`));
  const newDDOs: Row[] = [];
  for (const r of ddoRows) {
    const did = domainMap.get(r.domain)!;
    const oid = doMap.get(r.data_object);
    if (!oid) { console.warn(`  ! data_object ${r.data_object} not found`); continue; }
    const key = `${did}:${oid}:${r.role}`;
    if (existingDDOSet.has(key)) continue;
    existingDDOSet.add(key);
    newDDOs.push({ domain_id: did, data_object_id: oid, role: r.role, necessity: r.necessity, notes: r.notes });
  }
  if (newDDOs.length > 0) {
    console.log(`  inserting ${newDDOs.length} new domain_data_objects rows`);
    await insert("/domain_data_objects", newDDOs);
  }

  // 5. domain_module_data_objects
  console.log("\n=== domain_module_data_objects ===");
  const existingDMDO = await get("/domain_module_data_objects?select=domain_module_id,data_object_id,role&limit=20000");
  const existingDMDOSet = new Set(existingDMDO.map(r => `${r.domain_module_id}:${r.data_object_id}:${r.role}`));
  const newDMDOs: Row[] = [];
  for (const r of dmdoRows) {
    const mid = moduleMap.get(r.module);
    const oid = doMap.get(r.data_object);
    if (!mid || !oid) { console.warn(`  ! missing for ${r.module}/${r.data_object}`); continue; }
    const key = `${mid}:${oid}:${r.role}`;
    if (existingDMDOSet.has(key)) continue;
    existingDMDOSet.add(key);
    newDMDOs.push({ domain_module_id: mid, data_object_id: oid, role: r.role, necessity: r.necessity, notes: r.notes });
  }
  if (newDMDOs.length > 0) {
    console.log(`  inserting ${newDMDOs.length} new domain_module_data_objects rows`);
    await insert("/domain_module_data_objects", newDMDOs);
  }

  // 6. trigger_events
  console.log("\n=== trigger_events ===");
  const teRows = triggerEvents.map(t => ({
    event_name: t.event_name,
    data_object_id: doMap.get(t.data_object)!,
    description: t.description,
    event_category: t.event_category,
  }));
  const teMap = await syncTable("/trigger_events", teRows, "event_name");

  // 7. cross_domain_handoffs (outbound only)
  console.log("\n=== cross_domain_handoffs ===");
  const existingHO = await get("/cross_domain_handoffs?select=source_domain_id,target_domain_id,trigger_event_id&limit=10000");
  const existingHOSet = new Set(existingHO.map(r => `${r.source_domain_id}:${r.target_domain_id}:${r.trigger_event_id}`));
  const newHOs: Row[] = [];
  for (const h of handoffs) {
    const sid = domainMap.get(h.source_domain)!;
    const tid_dom = domainMap.get(h.target_domain);
    if (!tid_dom) {
      // Target domain may be an existing non-private-capital domain — look up
      const lookup = await get(`/domains?domain_code=eq.${h.target_domain}&select=id`);
      if (lookup.length === 0) { console.warn(`  ! target domain ${h.target_domain} not found`); continue; }
      domainMap.set(h.target_domain, Number(lookup[0].id));
    }
    const tid = domainMap.get(h.target_domain)!;
    const teid = teMap.get(h.trigger_event);
    if (!teid) { console.warn(`  ! trigger event ${h.trigger_event} not found`); continue; }
    const oid = doMap.get(h.data_object)!;
    const sourceModId = h.source_module ? moduleMap.get(h.source_module) ?? null : null;
    const targetModId = h.target_module ? moduleMap.get(h.target_module) ?? null : null;
    const key = `${sid}:${tid}:${teid}`;
    if (existingHOSet.has(key)) continue;
    existingHOSet.add(key);
    newHOs.push({
      source_domain_id: sid,
      target_domain_id: tid,
      data_object_id: oid,
      integration_pattern: h.integration_pattern,
      friction_level: h.friction_level,
      description: h.description,
      trigger_event_id: teid,
      source_domain_module_id: sourceModId,
      target_domain_module_id: targetModId,
    });
  }
  if (newHOs.length > 0) {
    console.log(`  inserting ${newHOs.length} new cross_domain_handoffs rows`);
    await insert("/cross_domain_handoffs", newHOs);
  }

  // 8. data_object_relationships (intra + cross-domain payload→target)
  console.log("\n=== data_object_relationships ===");
  const existingDOR = await get("/data_object_relationships?select=data_object_id,related_data_object_id,relationship_verb&limit=20000");
  const existingDORSet = new Set(existingDOR.map(r => `${r.data_object_id}:${r.related_data_object_id}:${r.relationship_verb}`));
  const newDORs: Row[] = [];
  for (const r of relationships) {
    const src = doMap.get(r.source);
    const tgt = doMap.get(r.target);
    if (!src || !tgt) { console.warn(`  ! relationship endpoints not found: ${r.source} / ${r.target}`); continue; }
    const key = `${src}:${tgt}:${r.verb}`;
    if (existingDORSet.has(key)) continue;
    existingDORSet.add(key);
    newDORs.push({
      data_object_id: src,
      related_data_object_id: tgt,
      relationship_type: r.type,
      relationship_kind: r.kind,
      relationship_verb: r.verb,
      inverse_verb: r.inverse_verb,
      is_required: r.required,
      owner_side: r.owner_side,
      notes: r.notes,
    });
  }

  // Users-edges: one user can play a role across many records; modeled as users (one) → data_object (many)
  for (const u of usersEdges) {
    const oid = doMap.get(u.data_object);
    if (!oid) continue;
    const key = `${usersDOID}:${oid}:${u.inverse_verb}`;
    if (existingDORSet.has(key)) continue;
    existingDORSet.add(key);
    newDORs.push({
      data_object_id: usersDOID,
      related_data_object_id: oid,
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      relationship_verb: u.inverse_verb,
      inverse_verb: u.verb,
      is_required: false,
      owner_side: "target",
      notes: `users-edge | actor role: ${u.user_role}`,
    });
  }
  if (newDORs.length > 0) {
    console.log(`  inserting ${newDORs.length} new data_object_relationships rows`);
    await insert("/data_object_relationships", newDORs);
  }

  // 9. data_object_aliases
  console.log("\n=== data_object_aliases ===");
  const existingAL = await get("/data_object_aliases?select=data_object_id,alias_name&limit=10000");
  const existingALSet = new Set(existingAL.map(r => `${r.data_object_id}:${r.alias_name}`));
  const newALs: Row[] = [];
  for (const a of aliases) {
    const oid = doMap.get(a.data_object);
    if (!oid) continue;
    const key = `${oid}:${a.alias_name}`;
    if (existingALSet.has(key)) continue;
    existingALSet.add(key);
    newALs.push({
      data_object_id: oid,
      alias_name: a.alias_name,
      alias_type: a.alias_type,
      is_preferred: false,
      notes: a.notes,
    });
  }
  if (newALs.length > 0) {
    console.log(`  inserting ${newALs.length} new data_object_aliases rows`);
    await insert("/data_object_aliases", newALs);
  }

  // 10. data_object_lifecycle_states
  console.log("\n=== data_object_lifecycle_states ===");
  const existingLC = await get("/data_object_lifecycle_states?select=data_object_id,state_name&limit=10000");
  const existingLCSet = new Set(existingLC.map(r => `${r.data_object_id}:${r.state_name}`));
  const newLCs: Row[] = [];
  for (const s of lifecycleStates) {
    const oid = doMap.get(s.data_object);
    if (!oid) continue;
    const key = `${oid}:${s.state_name}`;
    if (existingLCSet.has(key)) continue;
    existingLCSet.add(key);
    newLCs.push({
      data_object_id: oid,
      state_name: s.state_name,
      state_order: s.state_order,
      description: s.description,
      is_initial: s.is_initial ?? false,
      is_terminal: s.is_terminal ?? false,
      requires_permission: s.requires_permission ?? false,
      permission_verb_override: s.permission_verb_override ?? "",
      domain_module_id: s.module ? moduleMap.get(s.module) ?? null : null,
    });
  }
  if (newLCs.length > 0) {
    console.log(`  inserting ${newLCs.length} new data_object_lifecycle_states rows`);
    await insert("/data_object_lifecycle_states", newLCs);
  }

  // Summary
  console.log("\n=== Summary ===");
  console.log({
    data_objects_total: doMap.size,
    new_master_data_objects: dataObjects.length,
    domain_data_objects_new: newDDOs.length,
    domain_module_data_objects_new: newDMDOs.length,
    trigger_events_total: teMap.size,
    handoffs_new: newHOs.length,
    relationships_new: newDORs.length,
    aliases_new: newALs.length,
    lifecycle_states_new: newLCs.length,
  });
}

await main();
console.log("\nDone.");
