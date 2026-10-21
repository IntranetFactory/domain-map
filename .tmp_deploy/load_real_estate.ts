#!/usr/bin/env bun
// Loads the Real Estate vertical (industry + 4 domains + caps + vendors + solutions
// + Phase B data_objects/handoffs + Phase C function RACI) into the live `domain_map`
// module via the semantius CLI. Idempotent: reads by natural key before inserting.

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
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}\nbody=${JSON.stringify(body).slice(0, 500)}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });

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

function validateDomainRow(d: Row): void {
  if (!d.crud_percentage || d.min_org_size === "" || d.cost_band === "" ||
      (d.business_logic === "" && (d.crud_percentage as number) < 95) ||
      !d.usa_market_size_usd_m || !d.market_size_source_year) {
    throw new Error(`Incomplete domain payload: ${JSON.stringify(d)}`);
  }
}

// ============================================================
// INDUSTRY
// ============================================================
const industry = {
  industry_name: "Real Estate",
  naics_code: "531000",
  description: "Brokerages, property-management firms, commercial-real-estate operators, and real-estate investment vehicles. Distinct vendor stack per sub-segment (residential brokerage CRM, multifamily property mgmt, CRE leasing/asset mgmt, fund accounting). Sub-segments share property-as-asset model but diverge on revenue model (commission vs rent vs distributions). Vendors active across segments: Yardi, MRI, AppFolio, RealPage, Entrata, Lone Wolf, Inside Real Estate, VTS, CoStar, Altus, Juniper Square.",
  parent_industry_id: null,
};

// ============================================================
// DOMAINS (all four pinned to Real Estate industry)
// ============================================================
const domains = [
  {
    domain_code: "RE-BROKERAGE",
    domain_name: "Real Estate Brokerage and Agent Operations",
    description: "Lead capture, transaction management (offer→close), MLS syndication, commission splits, tour scheduling, and broker CRM for residential and commercial brokerages. Buyer is the brokerage / individual agent (per-seat pricing) or the franchise (enterprise pricing). Distinct from generic CRM (deal model is the property transaction, not the sales opportunity; commissions are split across cooperating brokerages by MLS rules). Vendors: Lone Wolf, Inside Real Estate (kvCORE, BoomTown), Follow Up Boss, Dotloop (Zillow), SkySlope, CINC, Liondesk.",
    business_logic: "Commission-split engines (listing-side vs buyer-side, franchise overrides, agent caps), MLS-rule conformance (timestamps, mandatory fields, photo limits), transaction-document compliance per state (disclosure forms, agency disclosures), brokerage trust-accounting (escrow).",
    crud_percentage: 80,
    min_org_size: "10 xs <50",
    cost_band: "$$",
    certification_required: false,
    usa_market_size_usd_m: 1200,
    market_size_source_year: 2024,
  },
  {
    domain_code: "RE-PROP-MGMT",
    domain_name: "Residential Property Management",
    description: "Tenant screening, rent collection, maintenance-request portal, leasing pipeline, vacancy marketing, and per-property general ledger for residential landlords (single-family-rental managers, multifamily operators, condo/HOA management). Buyer is the property-management firm or self-managing landlord. Distinct from REAL-EST/IWMS (corporate-tenant view); this is the landlord-of-residential-units view. Vendors: AppFolio, Yardi Breeze, Buildium (RealPage), Entrata, RealPage IMS, Rent Manager.",
    business_logic: "Prorated rent calculation (move-in/move-out), late-fee assessment per lease terms, rent-escalation schedules (CPI, fixed %), security-deposit accounting (state-by-state holding-period rules), tenant-screening score composition (credit + criminal + eviction history), eviction-process timing per jurisdiction.",
    crud_percentage: 85,
    min_org_size: "10 xs <50",
    cost_band: "$$",
    certification_required: false,
    usa_market_size_usd_m: 2500,
    market_size_source_year: 2024,
  },
  {
    domain_code: "RE-CRE",
    domain_name: "Commercial Real Estate Operations",
    description: "CRE leasing pipeline (LOI→executed lease), CAM (common-area-maintenance) reconciliation, rent escalations, stacking plans, market-comp data, and tenant relations for commercial landlords and asset managers (office, retail, industrial, mixed-use). Buyer is the CRE owner/operator or third-party property manager. Distinct from RE-PROP-MGMT (residential lifecycle is operationally different — shorter leases, simpler accounting, no CAM). Vendors: Yardi Voyager, MRI Commercial, VTS, CoStar Suite, Lucernex (Accruent), Reonomy (Altus).",
    business_logic: "CAM-reconciliation engines (gross-up, exclusions, audit caps), percentage-rent calculations (sales-driven retail), escalation schedules (CPI, stepped, market-reset), tenant-improvement allowance amortization, free-rent abatement, stacking-plan optimization, rent-roll-to-NOI calculations.",
    crud_percentage: 70,
    min_org_size: "30 m <2500",
    cost_band: "$$$$",
    certification_required: false,
    usa_market_size_usd_m: 1800,
    market_size_source_year: 2024,
  },
  {
    domain_code: "RE-INVEST",
    domain_name: "Real Estate Investment Management",
    description: "Fund accounting (carry, waterfall distributions), investor reporting (capital calls, statements), portfolio valuation (cap rates, DCF, NAV), acquisition underwriting, and NOI/IRR modeling for REITs, RE private-equity funds, and institutional asset managers. Buyer is the REIT or fund manager. Distinct from generic fund-accounting platforms by RE-specific asset modeling (cap rates, rent rolls, property-level cash flow) and partner accounting structures (LP/GP waterfalls). Vendors: ARGUS Enterprise (Altus), Yardi Investment Management, MRI Investment Modules, Juniper Square, AppFolio Investment Manager, Chatham Financial.",
    business_logic: "Waterfall distribution calculations (preferred return, catch-up, carried interest tiers), capital-call apportionment by LP commitment, DCF valuation with cap-rate sensitivity, NOI normalization (one-time vs recurring), portfolio rollup with currency/entity translation, GAAP/IFRS lease-accounting at fund level.",
    crud_percentage: 60,
    min_org_size: "30 m <2500",
    cost_band: "$$$$",
    certification_required: false,
    usa_market_size_usd_m: 1400,
    market_size_source_year: 2024,
  },
];

domains.forEach(validateDomainRow);

// ============================================================
// CAPABILITIES (24, 6 per domain)
// ============================================================
const capabilities = [
  // RE-BROKERAGE
  { capability_code: "RE-BROK-LEAD-CAPTURE", capability_name: "Real Estate Lead Capture and Routing", description: "Capture buyer and seller leads from listing portals (Zillow, Realtor.com), brokerage websites, and inbound calls; route to agents by territory, listing assignment, or round-robin." },
  { capability_code: "RE-BROK-TRANS-MGMT", capability_name: "Real Estate Transaction Management", description: "Manage the offer-to-close transaction pipeline: offer drafting, counter-offer negotiation, contingency tracking (inspection, financing, appraisal), escrow timeline, and document compliance." },
  { capability_code: "RE-BROK-MLS-SYNDICATION", capability_name: "MLS and Listing Syndication", description: "Author MLS-compliant listings (mandatory fields, photo limits, timestamps), syndicate to Zillow/Realtor.com/Trulia, and reconcile listing-status changes back to source MLS." },
  { capability_code: "RE-BROK-COMMISSION", capability_name: "Brokerage Commission Splits", description: "Calculate commission splits across listing-side vs buyer-side brokerages, agent splits per franchise rules and agent caps, referral fees, and team overrides." },
  { capability_code: "RE-BROK-TOUR-SCHED", capability_name: "Showing and Tour Scheduling", description: "Coordinate property showings (lock-box codes, scheduled access windows), agent calendar integration, and buyer-tour itineraries." },
  { capability_code: "RE-BROK-AGENT-CRM", capability_name: "Real Estate Agent CRM", description: "Agent-centric contact management for past clients, sphere-of-influence, drip campaigns, anniversary touches, and referral tracking." },
  // RE-PROP-MGMT
  { capability_code: "RE-PM-TENANT-SCREENING", capability_name: "Tenant Screening", description: "Credit, criminal-background, and eviction-history checks for prospective tenants; income verification; composite scoring per landlord criteria." },
  { capability_code: "RE-PM-RENT-COLLECTION", capability_name: "Rent Collection and Payments", description: "Tenant-facing rent payment portals (ACH, card, cash via retail partners), recurring-payment setup, late-fee assessment per lease terms, partial-payment handling." },
  { capability_code: "RE-PM-MAINT-REQUEST", capability_name: "Tenant Maintenance Request Portal", description: "Tenant-submitted maintenance tickets with photos, urgency triage, vendor dispatch, work-order tracking, and tenant-facing status updates." },
  { capability_code: "RE-PM-LEASING-PIPELINE", capability_name: "Residential Leasing Pipeline", description: "Vacancy advertising, lead-to-application conversion, application-to-lease workflow, e-signature on residential leases, move-in scheduling and condition documentation." },
  { capability_code: "RE-PM-PROP-ACCOUNTING", capability_name: "Property-Level Accounting", description: "Per-property general ledger with portfolio rollup, owner statements, trust-account separation, accrual vs cash methods, and 1099 reporting for owners and contractors." },
  { capability_code: "RE-PM-VACANCY-MARKETING", capability_name: "Vacancy Marketing and Syndication", description: "Listing creation for vacant units, syndication to Zillow Rental Network / Apartments.com / Realtor.com Rentals, performance analytics by source." },
  // RE-CRE
  { capability_code: "RE-CRE-LEASING-PIPELINE", capability_name: "Commercial Leasing Pipeline", description: "Manage CRE deals from prospect through letter-of-intent to executed lease: tour tracking, LOI versioning, lease-clause negotiation, broker-cooperation tracking." },
  { capability_code: "RE-CRE-CAM-RECONCILE", capability_name: "CAM Reconciliation", description: "Annual reconciliation of common-area-maintenance expenses across tenants, gross-up to occupancy, exclusion of capital items, true-up billing, and audit support." },
  { capability_code: "RE-CRE-STACKING-PLANS", capability_name: "Stacking Plans and Space Inventory", description: "Visualize building stacking plans by floor and suite, track vacant/leased/expiring space, and identify combinable suites for prospective tenants." },
  { capability_code: "RE-CRE-MARKET-COMPS", capability_name: "CRE Market Comparables", description: "Lease and sale comparables sourced from public records, broker submissions, and proprietary data (CoStar, Reonomy); rent-PSF benchmarking by submarket." },
  { capability_code: "RE-CRE-TENANT-RELATIONS", capability_name: "Commercial Tenant Relations", description: "Tenant-portal for COIs, service requests, billing inquiries, and lease-document access; tenant-satisfaction surveys; lease-renewal pipeline." },
  { capability_code: "RE-CRE-RENT-ESCALATIONS", capability_name: "Rent Escalation Calculations", description: "CPI-indexed, fixed-percent, stepped, and market-reset escalation schedules; percentage-rent on retail tenants; calculation against breakpoints and overages." },
  // RE-INVEST
  { capability_code: "RE-INV-FUND-ACCOUNTING", capability_name: "Real Estate Fund Accounting", description: "GP/LP partnership accounting with carried interest, preferred returns, catch-up tiers, and waterfall distributions; partner capital accounts maintained per fund." },
  { capability_code: "RE-INV-INVESTOR-REPORTING", capability_name: "Investor Reporting and Portal", description: "Quarterly statements, K-1 distribution, capital-account roll-forwards, and investor-facing portal for documents, performance, and tax forms." },
  { capability_code: "RE-INV-PORTFOLIO-VALUATION", capability_name: "Real Estate Portfolio Valuation", description: "Property and portfolio valuation via cap rate, DCF, and direct-comparison methods; sensitivity analysis on key drivers (cap rate, rent growth, exit assumptions)." },
  { capability_code: "RE-INV-ACQ-UNDERWRITING", capability_name: "Acquisition Underwriting", description: "Pro-forma cash flows for prospective acquisitions, debt-sizing, sponsor returns (LIRR, MOIC), sensitivity tables; investment committee memo generation." },
  { capability_code: "RE-INV-CAPITAL-CALLS", capability_name: "Capital Call and Distribution Management", description: "Issue capital calls to LPs per commitment percentages, track funding receipt, calculate and distribute waterfall payouts on disposition or refinance events." },
  { capability_code: "RE-INV-NAV-NOI-MODELING", capability_name: "NAV and NOI Modeling", description: "Compute and roll up net operating income at property, portfolio, and fund levels; net asset value calculations with debt at fair value; periodic mark-to-model revaluation." },
];

const capabilityDomains: Array<{ capability_code: string; domain_code: string }> = [
  ...["RE-BROK-LEAD-CAPTURE", "RE-BROK-TRANS-MGMT", "RE-BROK-MLS-SYNDICATION", "RE-BROK-COMMISSION", "RE-BROK-TOUR-SCHED", "RE-BROK-AGENT-CRM"].map(c => ({ capability_code: c, domain_code: "RE-BROKERAGE" })),
  ...["RE-PM-TENANT-SCREENING", "RE-PM-RENT-COLLECTION", "RE-PM-MAINT-REQUEST", "RE-PM-LEASING-PIPELINE", "RE-PM-PROP-ACCOUNTING", "RE-PM-VACANCY-MARKETING"].map(c => ({ capability_code: c, domain_code: "RE-PROP-MGMT" })),
  ...["RE-CRE-LEASING-PIPELINE", "RE-CRE-CAM-RECONCILE", "RE-CRE-STACKING-PLANS", "RE-CRE-MARKET-COMPS", "RE-CRE-TENANT-RELATIONS", "RE-CRE-RENT-ESCALATIONS"].map(c => ({ capability_code: c, domain_code: "RE-CRE" })),
  ...["RE-INV-FUND-ACCOUNTING", "RE-INV-INVESTOR-REPORTING", "RE-INV-PORTFOLIO-VALUATION", "RE-INV-ACQ-UNDERWRITING", "RE-INV-CAPITAL-CALLS", "RE-INV-NAV-NOI-MODELING"].map(c => ({ capability_code: c, domain_code: "RE-INVEST" })),
];

// ============================================================
// VENDORS (15 new — Yardi (564) and MRI Software (563) already exist)
// ============================================================
const vendors = [
  { vendor_name: "Lone Wolf Technologies", vendor_url: "https://www.lwolf.com", headquarters_country: "Canada", description: "Real-estate transaction-management and brokerage back-office vendor (Foundation, Transactions/Authentisign).", notes: "" },
  { vendor_name: "Inside Real Estate", vendor_url: "https://www.insiderealestate.com", headquarters_country: "USA", description: "Brokerage-facing real-estate CRM and lead-gen platform vendor (kvCORE, BoomTown, BrokerSumo).", notes: "BoomTown acquired 2021; CORE BackOffice / BrokerSumo acquired 2022." },
  { vendor_name: "Follow Up Boss", vendor_url: "https://www.followupboss.com", headquarters_country: "USA", description: "Real-estate-agent CRM vendor focused on lead follow-up cadence and team accountability.", notes: "Acquired by Zillow Group 2023." },
  { vendor_name: "Zillow Group", vendor_url: "https://www.zillow.com", headquarters_country: "USA", description: "Real-estate portal and tooling vendor (Zillow, Trulia, Dotloop, Follow Up Boss, ShowingTime).", notes: "Dotloop acquired 2015; ShowingTime 2021; Follow Up Boss 2023." },
  { vendor_name: "SkySlope", vendor_url: "https://skyslope.com", headquarters_country: "USA", description: "Real-estate transaction-management and compliance-tracking vendor for brokerages.", notes: "" },
  { vendor_name: "AppFolio", vendor_url: "https://www.appfolio.com", headquarters_country: "USA", description: "Property-management and real-estate-investment-management cloud vendor (Property Manager, Investment Manager).", notes: "" },
  { vendor_name: "RealPage", vendor_url: "https://www.realpage.com", headquarters_country: "USA", description: "Multifamily property-management, revenue-management, and investment-management platform vendor (Buildium, OneSite, IMS, AI Revenue Management).", notes: "Buildium acquired 2019; taken private by Thoma Bravo 2021." },
  { vendor_name: "Entrata", vendor_url: "https://www.entrata.com", headquarters_country: "USA", description: "Multifamily property-management platform vendor (Core/Ops, Resident-facing portals, marketing).", notes: "" },
  { vendor_name: "London Computer Systems", vendor_url: "https://www.rentmanager.com", headquarters_country: "USA", description: "Property-management software vendor (Rent Manager).", notes: "" },
  { vendor_name: "VTS", vendor_url: "https://www.vts.com", headquarters_country: "USA", description: "Commercial-real-estate leasing and asset-management platform vendor (VTS Platform, Lane).", notes: "Lane acquired 2021." },
  { vendor_name: "CoStar Group", vendor_url: "https://www.costargroup.com", headquarters_country: "USA", description: "Commercial-real-estate information, marketplace, and analytics vendor (CoStar Suite, LoopNet, Apartments.com).", notes: "" },
  { vendor_name: "Altus Group", vendor_url: "https://www.altusgroup.com", headquarters_country: "Canada", description: "Commercial-real-estate intelligence and valuation vendor (ARGUS Enterprise, Reonomy, Altus Analytics).", notes: "ARGUS acquired 2011; Reonomy acquired 2021." },
  { vendor_name: "Accruent", vendor_url: "https://www.accruent.com", headquarters_country: "USA", description: "Real-estate, facilities, and asset-management vendor (Lucernex, Maintenance Connection, FAMIS, Resolute).", notes: "Owned by Fortive." },
  { vendor_name: "Juniper Square", vendor_url: "https://www.junipersquare.com", headquarters_country: "USA", description: "Real-estate investment-management and investor-portal vendor for GPs.", notes: "" },
  { vendor_name: "Chatham Financial", vendor_url: "https://www.chathamfinancial.com", headquarters_country: "USA", description: "Financial-risk-management vendor (debt, derivatives, hedging) with strong CRE practice.", notes: "" },
];

// ============================================================
// SOLUTIONS (22 new; Yardi Voyager (id 682) already exists, extended via solution_domains)
// ============================================================
type SolutionRow = {
  solution_name: string;
  vendor_name: string;
  description: string;
  solution_url: string;
  solution_type: string;
  is_active_in_market: boolean;
  min_org_size: string;
  max_org_size: string;
  cost_band: string;
  solution_kind: string;
  notes: string;
};
const solutions: SolutionRow[] = [
  // Brokerage
  { solution_name: "Lone Wolf Foundation", vendor_name: "Lone Wolf Technologies", description: "Brokerage back-office and transaction-management suite covering compliance, accounting, commissions, and CRM for residential brokerages.", solution_url: "https://www.lwolf.com/foundation", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "40 l <10000", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "kvCORE", vendor_name: "Inside Real Estate", description: "All-in-one brokerage and agent platform: lead gen, IDX websites, CRM, marketing automation, and brokerage business intelligence.", solution_url: "https://www.insiderealestate.com/kvcore", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "40 l <10000", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Follow Up Boss", vendor_name: "Follow Up Boss", description: "Real-estate agent CRM with calling, texting, drip campaigns, and team-accountability features; integrates with major lead sources.", solution_url: "https://www.followupboss.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "BoomTown", vendor_name: "Inside Real Estate", description: "Brokerage lead-generation and CRM platform with predictive lead-scoring and team workflow.", solution_url: "https://boomtownroi.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Dotloop", vendor_name: "Zillow Group", description: "Real-estate transaction-management and e-signature platform: forms library, document workflow, compliance audit trail.", solution_url: "https://www.dotloop.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "40 l <10000", cost_band: "$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "SkySlope", vendor_name: "SkySlope", description: "Transaction-management, digital signing (DigiSign), and broker-compliance review platform.", solution_url: "https://skyslope.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  // Residential Property Management
  { solution_name: "AppFolio Property Manager", vendor_name: "AppFolio", description: "End-to-end residential property-management platform: leasing, rent collection, maintenance, accounting, owner reporting.", solution_url: "https://www.appfolio.com/property-manager", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "40 l <10000", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Buildium", vendor_name: "RealPage", description: "Property-management software targeting small-to-mid landlords and HOA managers: leasing, rent collection, accounting, communications.", solution_url: "https://www.buildium.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Yardi Breeze", vendor_name: "Yardi", description: "Cloud-native property-management platform for SMB landlords; subset of Voyager functionality with simpler setup.", solution_url: "https://www.yardibreeze.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Entrata Platform", vendor_name: "Entrata", description: "Multifamily operating-system: leasing, resident services, accounting, marketing, and revenue management on a single platform.", solution_url: "https://www.entrata.com", solution_type: "saas", is_active_in_market: true, min_org_size: "20 s <500", max_org_size: "50 xl 10000+", cost_band: "$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "RealPage Property Management", vendor_name: "RealPage", description: "Enterprise multifamily property-management platform (OneSite) with revenue management and resident-services modules.", solution_url: "https://www.realpage.com/property-management", solution_type: "saas", is_active_in_market: true, min_org_size: "30 m <2500", max_org_size: "50 xl 10000+", cost_band: "$$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Rent Manager", vendor_name: "London Computer Systems", description: "Property-management platform serving residential, commercial, and mixed portfolios with extensive customization.", solution_url: "https://www.rentmanager.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "40 l <10000", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  // Commercial Real Estate
  { solution_name: "MRI Commercial", vendor_name: "MRI Software", description: "Commercial real-estate management suite: lease administration, CAM, accounting, investment modeling.", solution_url: "https://www.mrisoftware.com/solutions/commercial/", solution_type: "saas", is_active_in_market: true, min_org_size: "30 m <2500", max_org_size: "50 xl 10000+", cost_band: "$$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "VTS Platform", vendor_name: "VTS", description: "CRE leasing-and-asset-management platform: pipeline tracking from prospect to executed lease, portfolio analytics, tenant experience (Lane).", solution_url: "https://www.vts.com", solution_type: "saas", is_active_in_market: true, min_org_size: "30 m <2500", max_org_size: "50 xl 10000+", cost_band: "$$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "CoStar Suite", vendor_name: "CoStar Group", description: "CRE information platform with property records, lease and sale comps, tenant intelligence, and marketing (LoopNet).", solution_url: "https://www.costar.com", solution_type: "saas", is_active_in_market: true, min_org_size: "20 s <500", max_org_size: "50 xl 10000+", cost_band: "$$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Lucernex", vendor_name: "Accruent", description: "Real-estate lifecycle management for tenants and corporate occupiers: site selection, transaction management, lease administration (ASC 842 / IFRS 16), portfolio analytics.", solution_url: "https://www.accruent.com/products/lucernex", solution_type: "saas", is_active_in_market: true, min_org_size: "30 m <2500", max_org_size: "50 xl 10000+", cost_band: "$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Reonomy", vendor_name: "Altus Group", description: "Commercial-real-estate property intelligence and prospecting data platform; ownership records, debt info, sales history.", solution_url: "https://www.reonomy.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "40 l <10000", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  // Real Estate Investment Management
  { solution_name: "ARGUS Enterprise", vendor_name: "Altus Group", description: "Industry-standard CRE cash-flow projection and valuation platform; DCF modeling, debt sizing, sensitivity analysis, portfolio rollup.", solution_url: "https://www.altusgroup.com/argus/", solution_type: "saas", is_active_in_market: true, min_org_size: "20 s <500", max_org_size: "50 xl 10000+", cost_band: "$$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Yardi Investment Management", vendor_name: "Yardi", description: "Real-estate investment-management platform: fund accounting, investor reporting, debt management, asset management.", solution_url: "https://www.yardi.com/solutions/investment-management/", solution_type: "saas", is_active_in_market: true, min_org_size: "30 m <2500", max_org_size: "50 xl 10000+", cost_band: "$$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "MRI Investment Management", vendor_name: "MRI Software", description: "Real-estate fund administration, investor accounting, and waterfall calculation platform.", solution_url: "https://www.mrisoftware.com/solutions/investment-management/", solution_type: "saas", is_active_in_market: true, min_org_size: "30 m <2500", max_org_size: "50 xl 10000+", cost_band: "$$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Juniper Square", vendor_name: "Juniper Square", description: "Investment-management platform for real-estate GPs: investor portal, capital calls, distributions, fundraising CRM.", solution_url: "https://www.junipersquare.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "40 l <10000", cost_band: "$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "AppFolio Investment Manager", vendor_name: "AppFolio", description: "Real-estate investment-management platform: investor portal, fund accounting, capital calls, K-1 distribution.", solution_url: "https://www.appfolio.com/investment-management", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
];

// ============================================================
// SOLUTION_DOMAINS (coverage_level per solution × domain)
// ============================================================
type SolDomain = { solution_name: string; domain_code: string; coverage_level: string };
const solutionDomains: SolDomain[] = [
  // Brokerage
  ...["Lone Wolf Foundation", "kvCORE", "Follow Up Boss", "BoomTown", "Dotloop", "SkySlope"].map(s => ({ solution_name: s, domain_code: "RE-BROKERAGE", coverage_level: "primary" })),
  // Residential PM
  ...["AppFolio Property Manager", "Buildium", "Yardi Breeze", "Entrata Platform", "RealPage Property Management", "Rent Manager"].map(s => ({ solution_name: s, domain_code: "RE-PROP-MGMT", coverage_level: "primary" })),
  // Yardi Voyager already linked secondary to REAL-EST; add primary to RE-CRE and primary to RE-PROP-MGMT
  { solution_name: "Yardi Voyager", domain_code: "RE-CRE", coverage_level: "primary" },
  { solution_name: "Yardi Voyager", domain_code: "RE-PROP-MGMT", coverage_level: "primary" },
  // CRE
  ...["MRI Commercial", "VTS Platform", "CoStar Suite", "Lucernex"].map(s => ({ solution_name: s, domain_code: "RE-CRE", coverage_level: "primary" })),
  { solution_name: "Reonomy", domain_code: "RE-CRE", coverage_level: "secondary" },
  // Investment Management
  ...["ARGUS Enterprise", "Yardi Investment Management", "MRI Investment Management", "Juniper Square", "AppFolio Investment Manager"].map(s => ({ solution_name: s, domain_code: "RE-INVEST", coverage_level: "primary" })),
  // Cross-segment secondary coverage
  { solution_name: "Lucernex", domain_code: "RE-INVEST", coverage_level: "secondary" }, // lease admin feeds investor reporting
  { solution_name: "Rent Manager", domain_code: "RE-CRE", coverage_level: "secondary" },
  { solution_name: "AppFolio Property Manager", domain_code: "RE-INVEST", coverage_level: "secondary" },
];

// ============================================================
// SOLUTION_CAPABILITIES (focused matrix — only meaningful cells)
// ============================================================
type SolCap = { solution_name: string; capability_code: string; delivery_strength: string; notes: string };
const SC = (sol: string, capCode: string, strength: string, notes = ""): SolCap =>
  ({ solution_name: sol, capability_code: capCode, delivery_strength: strength, notes });

const solutionCapabilities: SolCap[] = [
  // Lone Wolf Foundation — brokerage back office
  SC("Lone Wolf Foundation", "RE-BROK-TRANS-MGMT", "native"),
  SC("Lone Wolf Foundation", "RE-BROK-COMMISSION", "native"),
  SC("Lone Wolf Foundation", "RE-BROK-AGENT-CRM", "partial"),
  SC("Lone Wolf Foundation", "RE-BROK-MLS-SYNDICATION", "via_extension"),
  SC("Lone Wolf Foundation", "RE-BROK-LEAD-CAPTURE", "partial"),
  // kvCORE — agent/broker platform
  SC("kvCORE", "RE-BROK-LEAD-CAPTURE", "native"),
  SC("kvCORE", "RE-BROK-AGENT-CRM", "native"),
  SC("kvCORE", "RE-BROK-MLS-SYNDICATION", "native"),
  SC("kvCORE", "RE-BROK-TRANS-MGMT", "partial"),
  SC("kvCORE", "RE-BROK-COMMISSION", "not_supported"),
  // Follow Up Boss — CRM only
  SC("Follow Up Boss", "RE-BROK-AGENT-CRM", "native"),
  SC("Follow Up Boss", "RE-BROK-LEAD-CAPTURE", "native"),
  SC("Follow Up Boss", "RE-BROK-TRANS-MGMT", "not_supported"),
  SC("Follow Up Boss", "RE-BROK-COMMISSION", "not_supported"),
  // BoomTown
  SC("BoomTown", "RE-BROK-LEAD-CAPTURE", "native"),
  SC("BoomTown", "RE-BROK-AGENT-CRM", "native"),
  // Dotloop — transactions
  SC("Dotloop", "RE-BROK-TRANS-MGMT", "native"),
  SC("Dotloop", "RE-BROK-AGENT-CRM", "not_supported"),
  // SkySlope — transactions
  SC("SkySlope", "RE-BROK-TRANS-MGMT", "native"),
  SC("SkySlope", "RE-BROK-COMMISSION", "partial"),

  // AppFolio Property Manager — full residential PM
  SC("AppFolio Property Manager", "RE-PM-TENANT-SCREENING", "native"),
  SC("AppFolio Property Manager", "RE-PM-RENT-COLLECTION", "native"),
  SC("AppFolio Property Manager", "RE-PM-MAINT-REQUEST", "native"),
  SC("AppFolio Property Manager", "RE-PM-LEASING-PIPELINE", "native"),
  SC("AppFolio Property Manager", "RE-PM-PROP-ACCOUNTING", "native"),
  SC("AppFolio Property Manager", "RE-PM-VACANCY-MARKETING", "native"),
  // Buildium
  SC("Buildium", "RE-PM-TENANT-SCREENING", "via_extension"),
  SC("Buildium", "RE-PM-RENT-COLLECTION", "native"),
  SC("Buildium", "RE-PM-MAINT-REQUEST", "native"),
  SC("Buildium", "RE-PM-LEASING-PIPELINE", "partial"),
  SC("Buildium", "RE-PM-PROP-ACCOUNTING", "native"),
  // Yardi Breeze
  SC("Yardi Breeze", "RE-PM-RENT-COLLECTION", "native"),
  SC("Yardi Breeze", "RE-PM-MAINT-REQUEST", "native"),
  SC("Yardi Breeze", "RE-PM-LEASING-PIPELINE", "partial"),
  SC("Yardi Breeze", "RE-PM-PROP-ACCOUNTING", "native"),
  // Entrata
  SC("Entrata Platform", "RE-PM-TENANT-SCREENING", "native"),
  SC("Entrata Platform", "RE-PM-RENT-COLLECTION", "native"),
  SC("Entrata Platform", "RE-PM-MAINT-REQUEST", "native"),
  SC("Entrata Platform", "RE-PM-LEASING-PIPELINE", "native"),
  SC("Entrata Platform", "RE-PM-PROP-ACCOUNTING", "native"),
  SC("Entrata Platform", "RE-PM-VACANCY-MARKETING", "native"),
  // RealPage Property Management
  SC("RealPage Property Management", "RE-PM-TENANT-SCREENING", "native"),
  SC("RealPage Property Management", "RE-PM-RENT-COLLECTION", "native"),
  SC("RealPage Property Management", "RE-PM-MAINT-REQUEST", "native"),
  SC("RealPage Property Management", "RE-PM-LEASING-PIPELINE", "native"),
  SC("RealPage Property Management", "RE-PM-PROP-ACCOUNTING", "native"),
  SC("RealPage Property Management", "RE-PM-VACANCY-MARKETING", "native"),
  // Rent Manager
  SC("Rent Manager", "RE-PM-RENT-COLLECTION", "native"),
  SC("Rent Manager", "RE-PM-MAINT-REQUEST", "native"),
  SC("Rent Manager", "RE-PM-LEASING-PIPELINE", "native"),
  SC("Rent Manager", "RE-PM-PROP-ACCOUNTING", "native"),

  // Yardi Voyager — broad CRE+PM coverage
  SC("Yardi Voyager", "RE-CRE-LEASING-PIPELINE", "native"),
  SC("Yardi Voyager", "RE-CRE-CAM-RECONCILE", "native"),
  SC("Yardi Voyager", "RE-CRE-RENT-ESCALATIONS", "native"),
  SC("Yardi Voyager", "RE-CRE-STACKING-PLANS", "native"),
  SC("Yardi Voyager", "RE-CRE-TENANT-RELATIONS", "native"),
  SC("Yardi Voyager", "RE-PM-RENT-COLLECTION", "native"),
  SC("Yardi Voyager", "RE-PM-PROP-ACCOUNTING", "native"),
  SC("Yardi Voyager", "RE-PM-LEASING-PIPELINE", "native"),

  // MRI Commercial
  SC("MRI Commercial", "RE-CRE-LEASING-PIPELINE", "native"),
  SC("MRI Commercial", "RE-CRE-CAM-RECONCILE", "native"),
  SC("MRI Commercial", "RE-CRE-RENT-ESCALATIONS", "native"),
  SC("MRI Commercial", "RE-CRE-TENANT-RELATIONS", "native"),
  SC("MRI Commercial", "RE-CRE-STACKING-PLANS", "partial"),
  // VTS Platform
  SC("VTS Platform", "RE-CRE-LEASING-PIPELINE", "native"),
  SC("VTS Platform", "RE-CRE-STACKING-PLANS", "native"),
  SC("VTS Platform", "RE-CRE-TENANT-RELATIONS", "native", "via Lane"),
  SC("VTS Platform", "RE-CRE-CAM-RECONCILE", "not_supported"),
  // CoStar Suite
  SC("CoStar Suite", "RE-CRE-MARKET-COMPS", "native"),
  SC("CoStar Suite", "RE-CRE-LEASING-PIPELINE", "partial", "via LoopNet"),
  SC("CoStar Suite", "RE-CRE-CAM-RECONCILE", "not_supported"),
  // Lucernex (tenant/occupier-side)
  SC("Lucernex", "RE-CRE-LEASING-PIPELINE", "native", "tenant side — site selection / transaction"),
  SC("Lucernex", "RE-CRE-CAM-RECONCILE", "native", "lease-audit / overcharge recovery"),
  SC("Lucernex", "RE-CRE-RENT-ESCALATIONS", "native"),
  // Reonomy
  SC("Reonomy", "RE-CRE-MARKET-COMPS", "native"),

  // ARGUS Enterprise
  SC("ARGUS Enterprise", "RE-INV-PORTFOLIO-VALUATION", "native"),
  SC("ARGUS Enterprise", "RE-INV-ACQ-UNDERWRITING", "native"),
  SC("ARGUS Enterprise", "RE-INV-NAV-NOI-MODELING", "native"),
  SC("ARGUS Enterprise", "RE-INV-FUND-ACCOUNTING", "not_supported"),
  // Yardi Investment Management
  SC("Yardi Investment Management", "RE-INV-FUND-ACCOUNTING", "native"),
  SC("Yardi Investment Management", "RE-INV-INVESTOR-REPORTING", "native"),
  SC("Yardi Investment Management", "RE-INV-CAPITAL-CALLS", "native"),
  SC("Yardi Investment Management", "RE-INV-PORTFOLIO-VALUATION", "native"),
  // MRI Investment Management
  SC("MRI Investment Management", "RE-INV-FUND-ACCOUNTING", "native"),
  SC("MRI Investment Management", "RE-INV-INVESTOR-REPORTING", "native"),
  SC("MRI Investment Management", "RE-INV-CAPITAL-CALLS", "native"),
  SC("MRI Investment Management", "RE-INV-PORTFOLIO-VALUATION", "partial"),
  // Juniper Square
  SC("Juniper Square", "RE-INV-FUND-ACCOUNTING", "native"),
  SC("Juniper Square", "RE-INV-INVESTOR-REPORTING", "native"),
  SC("Juniper Square", "RE-INV-CAPITAL-CALLS", "native"),
  // AppFolio Investment Manager
  SC("AppFolio Investment Manager", "RE-INV-FUND-ACCOUNTING", "native"),
  SC("AppFolio Investment Manager", "RE-INV-INVESTOR-REPORTING", "native"),
  SC("AppFolio Investment Manager", "RE-INV-CAPITAL-CALLS", "native"),
];

// ============================================================
// PHASE B — DATA OBJECTS (16 new) + domain_data_objects + cross_domain_handoffs
// ============================================================
const dataObjects = [
  // Brokerage
  { data_object_name: "real_estate_listings", singular_label: "Real Estate Listing", plural_label: "Real Estate Listings", display_label: "Real Estate Listing", description: "Property offered for sale or rent on an MLS or brokerage marketplace; carries pricing, photos, descriptive text, agent representation, and listing-status lifecycle (active/contingent/pending/sold/withdrawn)." },
  { data_object_name: "real_estate_transactions", singular_label: "Real Estate Transaction", plural_label: "Real Estate Transactions", display_label: "Real Estate Transaction", description: "Deal pipeline from offer through close: parties, terms, contingencies, escrow timeline, and document compliance. One transaction per accepted offer; survives the listing once the offer is bound." },
  { data_object_name: "commission_splits", singular_label: "Commission Split", plural_label: "Commission Splits", display_label: "Commission Split", description: "Per-transaction commission distribution across listing-side and buyer-side brokerages, then internal agent splits per franchise rules; referenced by accounting and 1099 processes." },
  { data_object_name: "tour_appointments", singular_label: "Tour Appointment", plural_label: "Tour Appointments", display_label: "Tour Appointment", description: "Scheduled property showings with lock-box codes, access windows, agent attendance, and follow-up tracking." },
  { data_object_name: "disclosure_documents", singular_label: "Disclosure Document", plural_label: "Disclosure Documents", display_label: "Disclosure Document", description: "State-mandated and brokerage-policy disclosure forms attached to transactions (agency disclosure, property condition, lead paint, HOA documents); required for compliance audit." },
  // Property Mgmt
  { data_object_name: "rental_units", singular_label: "Rental Unit", plural_label: "Rental Units", display_label: "Rental Unit", description: "Lettable unit within a residential property (apartment, single-family rental, condo); carries amenities, sq-ft, current rent, lease status." },
  { data_object_name: "tenants", singular_label: "Tenant", plural_label: "Tenants", display_label: "Tenant", description: "Person or household occupying a rental unit under a lease; carries contact info, lease history, payment history, screening result." },
  { data_object_name: "rental_applications", singular_label: "Rental Application", plural_label: "Rental Applications", display_label: "Rental Application", description: "Prospective-tenant application with personal/financial details, employer info, references, and screening results; precedes lease execution." },
  { data_object_name: "rent_payments", singular_label: "Rent Payment", plural_label: "Rent Payments", display_label: "Rent Payment", description: "Tenant payment of rent (or other lease charges) via ACH, card, or cash; carries amount, allocation across charges, late fees, and reconciliation status." },
  { data_object_name: "tenant_maintenance_requests", singular_label: "Tenant Maintenance Request", plural_label: "Tenant Maintenance Requests", display_label: "Tenant Maintenance Request", description: "Tenant-submitted issue tracked from intake through vendor dispatch to resolution; carries photos, urgency, communication thread. Distinct from FM/EAM work orders in that the requester is a paying tenant, not an internal employee." },
  { data_object_name: "rental_leases", singular_label: "Rental Lease", plural_label: "Rental Leases", display_label: "Rental Lease", description: "Residential lease agreement between landlord and tenant covering a specific rental unit; carries term, rent schedule, security deposit, addenda. Distinct from REAL-EST tenant-of-corporate-office leases (ASC 842 angle) and from commercial leases (different document structure, shorter term)." },
  // CRE
  { data_object_name: "commercial_leases", singular_label: "Commercial Lease", plural_label: "Commercial Leases", display_label: "Commercial Lease", description: "Commercial real-estate lease (office/retail/industrial) carrying base rent, CAM, escalations, percentage rent, tenant improvements, free-rent abatement, and renewal options. Operationally distinct from residential leases and from tenant-of-corporate-office accounting-only leases." },
  { data_object_name: "stacking_plans", singular_label: "Stacking Plan", plural_label: "Stacking Plans", display_label: "Stacking Plan", description: "Visual representation of building floors and suites showing current occupants, lease-expiration dates, vacant suites, and combinability options; the working tool of CRE leasing." },
  { data_object_name: "cam_charges", singular_label: "CAM Charge", plural_label: "CAM Charges", display_label: "CAM Charge", description: "Common-area-maintenance expense pool tracked annually, allocated to tenants based on pro-rata share with gross-up to occupancy, audit caps, and exclusion of capital items." },
  // Investment
  { data_object_name: "investment_properties", singular_label: "Investment Property", plural_label: "Investment Properties", display_label: "Investment Property", description: "Real-estate asset held for investment return (acquired/operated/disposed for cash flow and appreciation); carries acquisition basis, debt structure, current valuation, NOI history. Distinct from REAL-EST `real_estate_properties` (the corporate-tenant occupancy view) — same physical asset can underlie both rows in different domains." },
  { data_object_name: "capital_calls", singular_label: "Capital Call", plural_label: "Capital Calls", display_label: "Capital Call", description: "Notice issued by GP to LPs requesting funding per commitment percentages; carries call amount, allocation, due date, funding receipt tracking." },
  { data_object_name: "fund_distributions", singular_label: "Fund Distribution", plural_label: "Fund Distributions", display_label: "Fund Distribution", description: "Waterfall payout from a real-estate fund to LPs and GP (preferred return, return-of-capital, catch-up, carried interest); calculated on income, sale, or refinancing events." },
  { data_object_name: "property_valuations", singular_label: "Property Valuation", plural_label: "Property Valuations", display_label: "Property Valuation", description: "Periodic property or portfolio valuation via cap rate, DCF, or direct-comparison method; carries valuation date, method, assumptions, sensitivity outputs. Drives NAV for fund-level reporting." },
];

// domain_data_objects — master + contributor + consumer + derived
type DDO = { domain_code: string; data_object_name: string; role: string; notes: string };
const domainDataObjects: DDO[] = [
  // RE-BROKERAGE masters
  { domain_code: "RE-BROKERAGE", data_object_name: "real_estate_listings", role: "master", notes: "Listing lifecycle owned at the brokerage; syndicated to MLS and portals." },
  { domain_code: "RE-BROKERAGE", data_object_name: "real_estate_transactions", role: "master", notes: "Offer-to-close transaction pipeline; broker-of-record compliance." },
  { domain_code: "RE-BROKERAGE", data_object_name: "commission_splits", role: "master", notes: "Per-transaction commission distribution; feeds brokerage accounting." },
  { domain_code: "RE-BROKERAGE", data_object_name: "tour_appointments", role: "master", notes: "Showing schedule for active listings." },
  { domain_code: "RE-BROKERAGE", data_object_name: "disclosure_documents", role: "master", notes: "Per-transaction compliance documents per state and brokerage policy." },
  { domain_code: "RE-BROKERAGE", data_object_name: "contacts", role: "contributor", notes: "Buyer/seller leads and past-client contacts; CRM cluster masters." },
  { domain_code: "RE-BROKERAGE", data_object_name: "leads", role: "contributor", notes: "Real-estate inbound leads enrich the CRM-mastered leads pool." },
  // RE-PROP-MGMT masters
  { domain_code: "RE-PROP-MGMT", data_object_name: "rental_units", role: "master", notes: "Lettable-unit inventory per property." },
  { domain_code: "RE-PROP-MGMT", data_object_name: "tenants", role: "master", notes: "Tenant master per rental unit; lease and payment history." },
  { domain_code: "RE-PROP-MGMT", data_object_name: "rental_applications", role: "master", notes: "Prospective-tenant applications and screening results." },
  { domain_code: "RE-PROP-MGMT", data_object_name: "rent_payments", role: "master", notes: "Rent collection records; reconciled to per-property GL." },
  { domain_code: "RE-PROP-MGMT", data_object_name: "tenant_maintenance_requests", role: "master", notes: "Tenant-submitted maintenance lifecycle." },
  { domain_code: "RE-PROP-MGMT", data_object_name: "rental_leases", role: "master", notes: "Residential lease agreements; landlord side." },
  { domain_code: "RE-PROP-MGMT", data_object_name: "invoices", role: "contributor", notes: "Rent invoicing contributes to AR-cluster invoices view." },
  // RE-CRE masters
  { domain_code: "RE-CRE", data_object_name: "commercial_leases", role: "master", notes: "Commercial leases; landlord side. Co-existence with REAL-EST leases is intentional — REAL-EST holds the tenant-of-corporate-office accounting view." },
  { domain_code: "RE-CRE", data_object_name: "stacking_plans", role: "master", notes: "Building-level space inventory and lease-expiration heatmap." },
  { domain_code: "RE-CRE", data_object_name: "cam_charges", role: "master", notes: "Annual CAM reconciliation and tenant true-up." },
  { domain_code: "RE-CRE", data_object_name: "investment_properties", role: "contributor", notes: "CRE-operations layer feeds rent rolls and NOI to RE-INVEST-mastered valuations." },
  // RE-INVEST masters
  { domain_code: "RE-INVEST", data_object_name: "investment_properties", role: "master", notes: "Investor view of the asset: acquisition basis, debt, valuation, NOI history. Distinct from REAL-EST real_estate_properties (corporate-tenant occupancy view of same physical asset)." },
  { domain_code: "RE-INVEST", data_object_name: "capital_calls", role: "master", notes: "GP-to-LP capital-call issuance and funding tracking." },
  { domain_code: "RE-INVEST", data_object_name: "fund_distributions", role: "master", notes: "Waterfall payouts to LPs and GP." },
  { domain_code: "RE-INVEST", data_object_name: "property_valuations", role: "master", notes: "Periodic valuations driving NAV." },
  { domain_code: "RE-INVEST", data_object_name: "commercial_leases", role: "consumer", notes: "Read rent rolls and lease-economics for valuation models." },
  { domain_code: "RE-INVEST", data_object_name: "rental_leases", role: "consumer", notes: "Read residential rent rolls for multifamily-fund valuation." },
];

// trigger_events (deduplicated, referenced by handoffs)
type TriggerEvent = {
  event_name: string;
  data_object_name: string;
  event_category: string;
  from_state: string;
  to_state: string;
  description: string;
};
const triggerEvents: TriggerEvent[] = [
  { event_name: "real_estate_transaction.closed", data_object_name: "real_estate_transactions", event_category: "lifecycle", from_state: "pending", to_state: "closed", description: "Real estate transaction has closed (deed recorded, funds disbursed). New owner becomes the landlord-of-record; brokerage commission is earned and disbursable." },
  { event_name: "rental_application.approved", data_object_name: "rental_applications", event_category: "state_change", from_state: "screening", to_state: "approved", description: "Rental application has cleared screening and been approved by the landlord; triggers lease drafting and security-deposit collection." },
  { event_name: "rent_payment.received", data_object_name: "rent_payments", event_category: "lifecycle", from_state: "", to_state: "received", description: "Tenant rent payment has been received and reconciled; posts to per-property GL and triggers owner-distribution calculation." },
  { event_name: "rent_payment.delinquent", data_object_name: "rent_payments", event_category: "threshold", from_state: "", to_state: "delinquent", description: "Rent payment has crossed the late-fee threshold; triggers late-fee assessment, notice, and potentially eviction-process initiation." },
  { event_name: "tenant_maintenance_request.created", data_object_name: "tenant_maintenance_requests", event_category: "lifecycle", from_state: "", to_state: "created", description: "Tenant has submitted a maintenance request; triggers vendor dispatch via FSM or in-house team work order." },
  { event_name: "tenant.evicted", data_object_name: "tenants", event_category: "lifecycle", from_state: "active", to_state: "evicted", description: "Tenant eviction proceedings have completed; triggers asset-recovery, deposit-disposition, and legal-matter closure." },
  { event_name: "commercial_lease.executed", data_object_name: "commercial_leases", event_category: "lifecycle", from_state: "loi", to_state: "executed", description: "Commercial lease has been signed by both parties; triggers rent-roll update, NOI recalculation, and CAM-allocation update." },
  { event_name: "cam_charge.reconciled", data_object_name: "cam_charges", event_category: "lifecycle", from_state: "estimated", to_state: "reconciled", description: "Annual CAM reconciliation has been completed; triggers tenant true-up billing or refund and audit-trail finalization." },
  { event_name: "property_valuation.refreshed", data_object_name: "property_valuations", event_category: "signal", from_state: "", to_state: "refreshed", description: "Property or portfolio valuation has been refreshed; triggers NAV update, investor-reporting refresh, and potentially debt-covenant compliance check." },
  { event_name: "capital_call.issued", data_object_name: "capital_calls", event_category: "lifecycle", from_state: "draft", to_state: "issued", description: "Capital call has been issued to LPs; triggers funding receipt tracking and reminder cadence." },
  { event_name: "fund_distribution.declared", data_object_name: "fund_distributions", event_category: "lifecycle", from_state: "draft", to_state: "declared", description: "Fund distribution has been declared per the waterfall calculation; triggers payment processing to LPs and tax-form preparation." },
  { event_name: "real_estate_listing.qualified", data_object_name: "leads", event_category: "signal", from_state: "", to_state: "qualified", description: "Real-estate buyer or seller lead has been qualified by the agent; transitions probabilistic intent into a deterministic next-action queue." },
  { event_name: "investment_property.acquired", data_object_name: "investment_properties", event_category: "lifecycle", from_state: "underwriting", to_state: "acquired", description: "Investment property has closed acquisition; triggers asset onboarding into the operating PM platform and fund-accounting basis setup." },
];

type Handoff = {
  source_domain_code: string;
  target_domain_code: string;
  data_object_name: string;
  trigger_event_name: string;
  integration_pattern: string;
  friction_level: string;
  description: string;
  notes: string;
};
const handoffs: Handoff[] = [
  {
    source_domain_code: "RE-BROKERAGE", target_domain_code: "RE-PROP-MGMT", data_object_name: "real_estate_transactions",
    trigger_event_name: "real_estate_transaction.closed", integration_pattern: "manual_handoff", friction_level: "high",
    description: "Closed sale of a rental property results in a new landlord-of-record; the new owner's property-management platform must be configured (often manual handoff via email; the buyer's PM and the seller's brokerage are different vendors).",
    notes: "Cross-vendor stack with same logical entity (the property); identifier reconciliation between brokerage transaction id and PM property id is typically manual.",
  },
  {
    source_domain_code: "RE-BROKERAGE", target_domain_code: "RE-CRE", data_object_name: "real_estate_transactions",
    trigger_event_name: "real_estate_transaction.closed", integration_pattern: "manual_handoff", friction_level: "high",
    description: "Closed sale of a CRE asset transfers operations to the new owner's CRE platform; rent-roll, leases, and CAM history must be carried over (typically manual).",
    notes: "Cross-vendor stack; same physical asset, different operator and different system.",
  },
  {
    source_domain_code: "RE-PROP-MGMT", target_domain_code: "AP-AUTO", data_object_name: "rent_payments",
    trigger_event_name: "rent_payment.received", integration_pattern: "batch_sync", friction_level: "medium",
    description: "Reconciled rent payments post to property-level GL and roll up via batch into the AP-AUTO and ERP-FIN consolidated AR view; period-close timing must match.",
    notes: "Period/cycle-close coupling — monthly close depends on rent-collection batch arriving on time.",
  },
  {
    source_domain_code: "RE-PROP-MGMT", target_domain_code: "FSM", data_object_name: "tenant_maintenance_requests",
    trigger_event_name: "tenant_maintenance_request.created", integration_pattern: "api_call", friction_level: "medium",
    description: "Tenant maintenance request is dispatched as an FSM work order to in-house technician or third-party vendor; status updates flow back to tenant portal.",
    notes: "Frequent failure mode: vendor confirms in their own system but doesn't update the tenant portal; tenant calls in.",
  },
  {
    source_domain_code: "RE-PROP-MGMT", target_domain_code: "LSD", data_object_name: "tenants",
    trigger_event_name: "tenant.evicted", integration_pattern: "manual_handoff", friction_level: "high",
    description: "Eviction initiation triggers a legal matter (filing, notice service, court date tracking); typical legal workflow runs in a separate matter-management system.",
    notes: "Multi-shape: cross-vendor-stack (PM + legal-matter system) + alert-without-feedback (eviction status updates rarely flow back to PM). Plus jurisdiction-specific timing complexity.",
  },
  {
    source_domain_code: "RE-PROP-MGMT", target_domain_code: "RE-INVEST", data_object_name: "rental_leases",
    trigger_event_name: "rent_payment.received", integration_pattern: "batch_sync", friction_level: "medium",
    description: "Realized rental income feeds multifamily-fund NOI calculations and ultimately property valuations and investor reporting.",
    notes: "Batched monthly; misses on residential-PM-to-investment-mgmt timing cascade to NAV-refresh delays.",
  },
  {
    source_domain_code: "RE-CRE", target_domain_code: "AP-AUTO", data_object_name: "cam_charges",
    trigger_event_name: "cam_charge.reconciled", integration_pattern: "batch_sync", friction_level: "high",
    description: "Annual CAM reconciliation produces tenant true-up invoices (or refunds) that must post to AR; downstream cash collection cycle.",
    notes: "Period/cycle-close coupling + cross-vendor stack (CRE platform reconciles, ERP-FIN bills). Tenant disputes drive frequent retro-adjustments.",
  },
  {
    source_domain_code: "RE-CRE", target_domain_code: "RE-INVEST", data_object_name: "commercial_leases",
    trigger_event_name: "commercial_lease.executed", integration_pattern: "api_call", friction_level: "high",
    description: "New executed lease updates rent roll and NOI for the property; flows into RE-INVEST valuation models (often via separate ARGUS file refresh, since CRE-ops and ARGUS rarely share schema).",
    notes: "Multi-shape: cross-vendor-stack (Yardi/MRI/VTS on ops side, ARGUS on investment side) + identifier reconciliation (suite-level rent-roll keys differ across systems). The classic 'high-friction' RE handoff.",
  },
  {
    source_domain_code: "RE-CRE", target_domain_code: "FSM", data_object_name: "tenant_maintenance_requests",
    trigger_event_name: "tenant_maintenance_request.created", integration_pattern: "api_call", friction_level: "medium",
    description: "Commercial-tenant service request (HVAC, janitorial, building access) dispatches a work order to the property's FM/FSM platform.",
    notes: "",
  },
  {
    source_domain_code: "RE-INVEST", target_domain_code: "FINOPS", data_object_name: "property_valuations",
    trigger_event_name: "property_valuation.refreshed", integration_pattern: "batch_sync", friction_level: "medium",
    description: "Refreshed property/portfolio valuations roll into corporate FP&A or fund-treasury for NAV reporting, debt-covenant compliance, and investor statements.",
    notes: "Period/cycle-close coupling — quarterly NAV requires all property valuations to refresh within a fixed window.",
  },
  {
    source_domain_code: "RE-INVEST", target_domain_code: "ERP-FIN", data_object_name: "fund_distributions",
    trigger_event_name: "fund_distribution.declared", integration_pattern: "api_call", friction_level: "medium",
    description: "Declared LP distributions flow to treasury for payment execution and to GL for fund-level posting.",
    notes: "",
  },
  {
    source_domain_code: "RE-INVEST", target_domain_code: "ERP-FIN", data_object_name: "capital_calls",
    trigger_event_name: "capital_call.issued", integration_pattern: "api_call", friction_level: "medium",
    description: "Capital-call funding receipt records in treasury and posts to fund-accounting GL; partial-funding and late-payment scenarios trigger reminder workflows.",
    notes: "Alert/escalation without feedback loop — chasing un-funded calls is largely manual.",
  },
  {
    source_domain_code: "RE-BROKERAGE", target_domain_code: "CRM", data_object_name: "leads",
    trigger_event_name: "real_estate_listing.qualified", integration_pattern: "api_call", friction_level: "medium",
    description: "Qualified buyer/seller leads flow into CRM-cluster contacts and the agent's CRM for nurture and conversion tracking.",
    notes: "Probabilistic-to-deterministic — lead-scoring from portal traffic vs hard-qualified buyer intent.",
  },
  {
    source_domain_code: "RE-CRE", target_domain_code: "CLM", data_object_name: "commercial_leases",
    trigger_event_name: "commercial_lease.executed", integration_pattern: "api_call", friction_level: "medium",
    description: "Executed commercial lease document flows into CLM repository for clause-level search, obligation tracking (TI completion, free-rent expiry), and renewal-window alerts.",
    notes: "Bridge between CRE-ops (rent roll) and CLM (document obligations); commonly disconnected in practice.",
  },
  {
    source_domain_code: "RE-PROP-MGMT", target_domain_code: "GRC", data_object_name: "tenants",
    trigger_event_name: "rental_application.approved", integration_pattern: "batch_sync", friction_level: "low",
    description: "Fair-housing-compliance evidence (denial reasons, screening criteria application, disparate-impact monitoring) feeds GRC audit.",
    notes: "",
  },
  {
    source_domain_code: "RE-BROKERAGE", target_domain_code: "GRC", data_object_name: "disclosure_documents",
    trigger_event_name: "real_estate_transaction.closed", integration_pattern: "batch_sync", friction_level: "low",
    description: "Disclosure-document completeness per closed transaction feeds brokerage-compliance audit and state-real-estate-commission requirements.",
    notes: "",
  },
  {
    source_domain_code: "RE-INVEST", target_domain_code: "RE-INVEST", data_object_name: "investment_properties",
    trigger_event_name: "investment_property.acquired", integration_pattern: "manual_handoff", friction_level: "high",
    description: "INTRA-DOMAIN — not loaded. Placeholder to signal acquisition-to-operations handoff happens internally to RE-INVEST/RE-CRE in many shops.",
    notes: "SKIP — same source and target domain violates cross_domain_only validation; included here to mark we considered it.",
  },
];
// Drop intra-domain placeholders before insert
const validHandoffs = handoffs.filter(h => h.source_domain_code !== h.target_domain_code);

// ============================================================
// PHASE C — business_function_domains
// ============================================================
type BFD = { domain_code: string; business_function_name: string; responsibility_type: string; notes: string };
const businessFunctionDomains: BFD[] = [
  // RE-BROKERAGE
  { domain_code: "RE-BROKERAGE", business_function_name: "Sales", responsibility_type: "owner", notes: "Brokerage owners and managing brokers run the business; agents are the deal-makers." },
  { domain_code: "RE-BROKERAGE", business_function_name: "Marketing", responsibility_type: "contributor", notes: "Brokerage marketing drives lead capture and listing promotion." },
  { domain_code: "RE-BROKERAGE", business_function_name: "Accounting", responsibility_type: "consumer", notes: "Commission accounting and trust-account reconciliation downstream." },
  // RE-PROP-MGMT
  { domain_code: "RE-PROP-MGMT", business_function_name: "Business Operations", responsibility_type: "owner", notes: "Property managers and operations leads run residential portfolios; no dedicated 'property mgmt' function in the enterprise spine — closest fit is Business Operations." },
  { domain_code: "RE-PROP-MGMT", business_function_name: "Accounts Receivable", responsibility_type: "contributor", notes: "Rent collection and tenant billing." },
  { domain_code: "RE-PROP-MGMT", business_function_name: "Customer Service", responsibility_type: "contributor", notes: "Tenant-facing support intakes maintenance requests and lease-question calls." },
  { domain_code: "RE-PROP-MGMT", business_function_name: "Finance", responsibility_type: "consumer", notes: "Owner statements, fund-level rollup." },
  // RE-CRE
  { domain_code: "RE-CRE", business_function_name: "Business Operations", responsibility_type: "owner", notes: "Asset managers and CRE operations leads run commercial portfolios." },
  { domain_code: "RE-CRE", business_function_name: "Sales", responsibility_type: "contributor", notes: "Leasing reps act as sellers of commercial space." },
  { domain_code: "RE-CRE", business_function_name: "Accounting", responsibility_type: "contributor", notes: "CAM reconciliation, rent-escalation billing, percentage-rent calculations." },
  { domain_code: "RE-CRE", business_function_name: "Financial Planning and Analysis", responsibility_type: "consumer", notes: "FP&A consumes NOI and rent-roll data for forecasting." },
  // RE-INVEST
  { domain_code: "RE-INVEST", business_function_name: "Finance", responsibility_type: "owner", notes: "Fund accounting and investor reporting sit in Finance." },
  { domain_code: "RE-INVEST", business_function_name: "Financial Planning and Analysis", responsibility_type: "contributor", notes: "FP&A contributes valuation modelling and underwriting analysis." },
  { domain_code: "RE-INVEST", business_function_name: "Treasury", responsibility_type: "contributor", notes: "Treasury executes capital-call collection and distribution payment." },
  { domain_code: "RE-INVEST", business_function_name: "Executive", responsibility_type: "consumer", notes: "Investment committee and fund leadership consume NAV and portfolio KPIs." },
];

// ============================================================
// EXECUTE
// ============================================================
async function main() {
  console.log("=== Real Estate vertical load ===\n");

  // --- INDUSTRY ---
  console.log("Industry...");
  const indMap = await syncTable("/industries", [industry], "industry_name");
  const realEstateIndustryId = indMap.get("Real Estate")!;
  console.log(`  Real Estate industry id=${realEstateIndustryId}`);

  // --- DOMAINS ---
  console.log("\nDomains...");
  const domainPayload = domains.map(d => ({ ...d, industry_id: realEstateIndustryId }));
  const domMap = await syncTable("/domains", domainPayload, "domain_code");
  // Patch industry_id on any that already existed without it
  for (const d of domains) {
    const id = domMap.get(d.domain_code)!;
    await call({
      method: "PATCH",
      path: `/domains?id=eq.${id}`,
      body: { industry_id: realEstateIndustryId },
    });
  }

  // --- CAPABILITIES ---
  console.log("\nCapabilities...");
  const capMap = await syncTable("/capabilities", capabilities, "capability_code");

  // --- CAPABILITY_DOMAINS ---
  console.log("\nCapability-domain links...");
  const existingCapDomains = await get("/capability_domains?select=capability_id,domain_id&limit=10000");
  const cdKey = (cid: number, did: number) => `${cid}:${did}`;
  const existingCdKeys = new Set(existingCapDomains.map(r => cdKey(Number(r.capability_id), Number(r.domain_id))));
  const newCd = capabilityDomains
    .map(cd => ({ capability_id: capMap.get(cd.capability_code)!, domain_id: domMap.get(cd.domain_code)! }))
    .filter(cd => !existingCdKeys.has(cdKey(cd.capability_id, cd.domain_id)));
  console.log(`  inserting ${newCd.length} capability_domains (${existingCdKeys.size} already existed)`);
  await insert("/capability_domains", newCd);

  // --- VENDORS ---
  console.log("\nVendors...");
  const vendorMap = await syncTable("/vendors", vendors, "vendor_name");

  // --- SOLUTIONS ---
  console.log("\nSolutions...");
  const solutionPayload = solutions.map(s => {
    const { vendor_name, ...rest } = s;
    return { ...rest, vendor_id: vendorMap.get(vendor_name)! };
  });
  const solMap = await syncTable("/solutions", solutionPayload, "solution_name");

  // --- SOLUTION_DOMAINS ---
  console.log("\nSolution-domain links...");
  const existingSolDomains = await get("/solution_domains?select=solution_id,domain_id&limit=10000");
  const sdKey = (sid: number, did: number) => `${sid}:${did}`;
  const existingSdKeys = new Set(existingSolDomains.map(r => sdKey(Number(r.solution_id), Number(r.domain_id))));
  const newSd = solutionDomains
    .map(sd => ({
      solution_id: solMap.get(sd.solution_name)!,
      domain_id: domMap.get(sd.domain_code)!,
      coverage_level: sd.coverage_level,
      notes: "",
    }))
    .filter(sd => !existingSdKeys.has(sdKey(sd.solution_id, sd.domain_id)));
  console.log(`  inserting ${newSd.length} solution_domains`);
  await insert("/solution_domains", newSd);

  // --- SOLUTION_CAPABILITIES ---
  console.log("\nSolution-capability matrix...");
  const existingSolCaps = await get("/solution_capabilities?select=solution_id,capability_id&limit=20000");
  const scKey = (sid: number, cid: number) => `${sid}:${cid}`;
  const existingScKeys = new Set(existingSolCaps.map(r => scKey(Number(r.solution_id), Number(r.capability_id))));
  const newSc = solutionCapabilities
    .map(sc => ({
      solution_id: solMap.get(sc.solution_name)!,
      capability_id: capMap.get(sc.capability_code)!,
      delivery_strength: sc.delivery_strength,
      notes: sc.notes,
    }))
    .filter(sc => !existingScKeys.has(scKey(sc.solution_id, sc.capability_id)));
  console.log(`  inserting ${newSc.length} solution_capabilities`);
  await insert("/solution_capabilities", newSc);

  // ====================================================
  // PHASE B
  // ====================================================
  console.log("\n=== PHASE B: data_objects ===");
  const dataObjMap = await syncTable("/data_objects", dataObjects, "data_object_name");

  // Need full data_object map including pre-existing ones we reference
  const fullDoLookup = await get("/data_objects?select=id,data_object_name&limit=10000");
  const fullDoMap = new Map<string, number>();
  for (const r of fullDoLookup) fullDoMap.set(String(r.data_object_name), Number(r.id));

  console.log("\nDomain-data-object links...");
  const existingDdo = await get("/domain_data_objects?select=domain_id,data_object_id,role&limit=20000");
  const ddoKey = (did: number, oid: number, role: string) => `${did}:${oid}:${role}`;
  const existingDdoKeys = new Set(existingDdo.map(r => ddoKey(Number(r.domain_id), Number(r.data_object_id), String(r.role))));
  const newDdo = domainDataObjects
    .map(ddo => {
      const did = domMap.get(ddo.domain_code)!;
      const oid = fullDoMap.get(ddo.data_object_name);
      if (!oid) throw new Error(`Missing data_object: ${ddo.data_object_name}`);
      return { domain_id: did, data_object_id: oid, role: ddo.role, notes: ddo.notes };
    })
    .filter(r => !existingDdoKeys.has(ddoKey(r.domain_id, r.data_object_id, r.role)));
  console.log(`  inserting ${newDdo.length} domain_data_objects`);
  await insert("/domain_data_objects", newDdo);

  console.log("\nTrigger events...");
  const teMap = await syncTable(
    "/trigger_events",
    triggerEvents.map(te => ({
      event_name: te.event_name,
      data_object_id: fullDoMap.get(te.data_object_name)!,
      event_category: te.event_category,
      from_state: te.from_state,
      to_state: te.to_state,
      description: te.description,
    })),
    "event_name",
  );

  console.log("\nCross-domain handoffs...");
  // No clean natural key; dedupe by (source, target, data_object, trigger_event)
  const existingHandoffs = await get("/cross_domain_handoffs?select=source_domain_id,target_domain_id,data_object_id,trigger_event&limit=20000");
  const hoKey = (s: number, t: number, o: number, ev: string) => `${s}:${t}:${o}:${ev}`;
  const existingHoKeys = new Set(existingHandoffs.map(r => hoKey(Number(r.source_domain_id), Number(r.target_domain_id), Number(r.data_object_id), String(r.trigger_event))));

  // Need domain map that also includes pre-existing domains we reference (AP-AUTO, FSM, LSD, CLM, GRC, CRM, FINOPS, ERP-FIN)
  const fullDomainLookup = await get("/domains?select=id,domain_code&limit=10000");
  const fullDomainMap = new Map<string, number>();
  for (const r of fullDomainLookup) fullDomainMap.set(String(r.domain_code), Number(r.id));

  const newHo = [];
  for (const h of validHandoffs) {
    const sid = fullDomainMap.get(h.source_domain_code);
    const tid = fullDomainMap.get(h.target_domain_code);
    const oid = fullDoMap.get(h.data_object_name);
    const teId = teMap.get(h.trigger_event_name);
    if (!sid) { console.warn(`  skip — missing source domain ${h.source_domain_code}`); continue; }
    if (!tid) { console.warn(`  skip — missing target domain ${h.target_domain_code}`); continue; }
    if (!oid) { console.warn(`  skip — missing data_object ${h.data_object_name}`); continue; }
    if (!teId) { console.warn(`  skip — missing trigger_event ${h.trigger_event_name}`); continue; }
    if (existingHoKeys.has(hoKey(sid, tid, oid, h.trigger_event_name))) continue;
    newHo.push({
      source_domain_id: sid,
      target_domain_id: tid,
      data_object_id: oid,
      trigger_event: h.trigger_event_name,
      trigger_event_id: teId,
      integration_pattern: h.integration_pattern,
      friction_level: h.friction_level,
      description: h.description,
      notes: h.notes,
    });
  }
  console.log(`  inserting ${newHo.length} cross_domain_handoffs`);
  await insert("/cross_domain_handoffs", newHo);

  // ====================================================
  // PHASE C
  // ====================================================
  console.log("\n=== PHASE C: business_function_domains ===");
  const bfLookup = await get("/business_functions?select=id,business_function_name&limit=1000");
  const bfMap = new Map<string, number>();
  for (const r of bfLookup) bfMap.set(String(r.business_function_name), Number(r.id));

  const existingBfd = await get("/business_function_domains?select=domain_id,business_function_id,responsibility_type&limit=20000");
  const bfdKey = (did: number, fid: number, role: string) => `${did}:${fid}:${role}`;
  const existingBfdKeys = new Set(existingBfd.map(r => bfdKey(Number(r.domain_id), Number(r.business_function_id), String(r.responsibility_type))));
  const newBfd = businessFunctionDomains
    .map(bfd => {
      const did = domMap.get(bfd.domain_code)!;
      const fid = bfMap.get(bfd.business_function_name);
      if (!fid) throw new Error(`Missing business_function: ${bfd.business_function_name}`);
      return { domain_id: did, business_function_id: fid, responsibility_type: bfd.responsibility_type, notes: bfd.notes };
    })
    .filter(r => !existingBfdKeys.has(bfdKey(r.domain_id, r.business_function_id, r.responsibility_type)));
  console.log(`  inserting ${newBfd.length} business_function_domains`);
  await insert("/business_function_domains", newBfd);

  // ====================================================
  // SUMMARY + AUDIT
  // ====================================================
  console.log("\n=== Audit ===");
  for (const d of domains) {
    const did = domMap.get(d.domain_code)!;
    const [solCount, capCount, doCount, hoOutCount] = await Promise.all([
      get(`/solution_domains?domain_id=eq.${did}&select=id`),
      get(`/capability_domains?domain_id=eq.${did}&select=id`),
      get(`/domain_data_objects?domain_id=eq.${did}&select=id`),
      get(`/cross_domain_handoffs?source_domain_id=eq.${did}&select=id`),
    ]);
    console.log(`  ${d.domain_code}: ${solCount.length} solutions, ${capCount.length} caps, ${doCount.length} data_objects, ${hoOutCount.length} outbound handoffs`);
  }

  console.log("\n=== UI links ===");
  console.log(`  Industries:    https://tests.semantius.app/domain_map/industries?id=eq.${realEstateIndustryId}`);
  console.log(`  Domains:       https://tests.semantius.app/domain_map/domains?industry_id=eq.${realEstateIndustryId}`);
  console.log(`  Capabilities:  https://tests.semantius.app/domain_map/capabilities`);
  console.log(`  Solutions:     https://tests.semantius.app/domain_map/solutions`);
  console.log(`  Data objects:  https://tests.semantius.app/domain_map/data_objects`);
  console.log(`  Handoffs:      https://tests.semantius.app/domain_map/cross_domain_handoffs`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
