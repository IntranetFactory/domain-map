#!/usr/bin/env bun
// Loads the Private Capital / VC software cluster:
//   - 1 top-level industry (Financial Services) + 2 children (Venture Capital, Private Equity)
//   - Re-parents existing Banking under Financial Services (user-approved 2026-05-23)
//   - 1 new business_function (Investment Management, child of Finance)
//   - 5 domains: INV-CRM, FUND-ADMIN, PORT-MONIT, CAP-TABLE, EM-FUND-PLATFORM
//   - 33 capabilities (domain-prefixed, plus 3 cross-cutting links to existing capabilities)
//   - 17 new vendors (existing reused: Carta, Juniper Square)
//   - 23 solutions
//   - solution_domains matrix (primary/secondary)
//   - solution_capabilities matrix (sane defaults: primary->native, secondary->partial)
//   - business_function_domains (Phase C, 11 rows)
//   - industry_business_functions (4 rows)
//
// Idempotent. Reads by natural key, inserts only missing rows. Per SKILL.md Rule #1,
// freshly-loaded research gets record_status default ('new') by omitting the field.

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

// Rule #8: validate every domain row before insert.
function validateDomainRow(d: Row): void {
  if (!d.crud_percentage || d.min_org_size === "" || d.cost_band === "" ||
      (d.business_logic === "" && (d.crud_percentage as number) < 95) ||
      !d.usa_market_size_usd_m || !d.market_size_source_year) {
    throw new Error(`Incomplete domain payload: ${JSON.stringify(d)}`);
  }
}

// ============================================================
// INDUSTRIES
// ============================================================
const topIndustry = {
  industry_name: "Financial Services",
  description: "Banking, asset management, private capital (VC/PE), insurance, and wealth management.",
  parent_industry_id: null as number | null,
};

const childIndustries = [
  { industry_name: "Venture Capital", description: "Early-stage and growth-stage equity investment in private companies, typically with fund lifespans of 7-10 years and LP commitments from institutional and individual investors.", parent: "Financial Services" },
  { industry_name: "Private Equity", description: "Buyout, growth equity, and credit strategies in private companies, characterised by control or significant minority stakes and longer holding periods.", parent: "Financial Services" },
];

// ============================================================
// BUSINESS FUNCTION (sub of Finance)
// ============================================================
const newFunction = {
  business_function_name: "Investment Management",
  description: "Front-office investment activities: deal sourcing, due diligence, portfolio construction, and fund management. Distinct from corporate Finance (CFO-side); applies to GP-side teams at VC/PE firms and to in-house investment teams at corporates.",
  parent_business_function_name: "Finance",
};

// ============================================================
// DOMAINS (5 rows, full Rule #8 metadata)
// ============================================================
const domains = [
  {
    domain_code: "INV-CRM",
    domain_name: "Investor Relationship and Deal Flow Management",
    description: "Relationship-intelligence CRM and deal-pipeline software for investors (VC, PE, family offices). Tracks founders, executives, deals, portfolio companies, and LP relationships with auto-network inference from email and calendar metadata.",
    crud_percentage: 85,
    business_logic: "Email and calendar metadata graph-mining for relationship strength scoring; founder and executive ownership graph reconciliation across deal stages; warm-introduction path computation.",
    min_org_size: "10 xs <50",
    cost_band: "$$",
    certification_required: false,
    usa_market_size_usd_m: 350,
    market_size_source_year: 2024,
  },
  {
    domain_code: "FUND-ADMIN",
    domain_name: "Private Capital Fund Administration",
    description: "Fund accounting, capital calls, distribution waterfalls, LP onboarding (KYC/AML), partner capital account (PCAP) statements, and LP-facing reporting for private capital funds (VC, PE, private credit, real estate).",
    crud_percentage: 75,
    business_logic: "European/American/hybrid waterfall calculations with catchup, clawback, and hurdle rates; multi-class equity allocations; PCAP statement generation; GAAP/IFRS partnership accounting; multi-currency consolidation.",
    min_org_size: "10 xs <50",
    cost_band: "$$$",
    certification_required: false,
    usa_market_size_usd_m: 1200,
    market_size_source_year: 2024,
  },
  {
    domain_code: "PORT-MONIT",
    domain_name: "Portfolio Monitoring for Private Capital",
    description: "KPI collection from portfolio companies, valuation tracking, performance metric computation (IRR/MOIC/TVPI/DPI), and LP-facing performance reporting for private capital funds.",
    crud_percentage: 80,
    business_logic: "Time-weighted IRR/MOIC/TVPI/DPI computation across multi-vintage funds; PME (public market equivalent) benchmarking; J-curve normalization for early-stage funds; ASC 820 fair-value mark methodology.",
    min_org_size: "10 xs <50",
    cost_band: "$$",
    certification_required: false,
    usa_market_size_usd_m: 250,
    market_size_source_year: 2024,
  },
  {
    domain_code: "CAP-TABLE",
    domain_name: "Cap Table Management and Equity Administration",
    description: "Shareholder ledger, option-pool management, 409A valuations, RSU/option grant workflows, exit waterfall modeling, and ASC 718 stock-based compensation accounting. Primary buyer is the portfolio-company CFO, not the VC firm.",
    crud_percentage: 70,
    business_logic: "409A valuation calculation per methodology (income, market, asset, OPM backsolve); ASC 718 stock-based compensation expense recognition with Black-Scholes/lattice models; exit waterfall scenario modeling with multiple preferred-class participation rights; vesting acceleration logic (single-trigger, double-trigger); dilution modeling for new financing rounds.",
    min_org_size: "10 xs <50",
    cost_band: "$",
    certification_required: false,
    usa_market_size_usd_m: 800,
    market_size_source_year: 2024,
  },
  {
    domain_code: "EM-FUND-PLATFORM",
    domain_name: "Emerging Manager Fund Platform",
    description: "Bundled fund formation, administration, light cap-table, and LP portal as a single architectural product targeting solo GPs and 1-5 partner microfunds. Architecturally bundle-only (components not separately purchasable). Competes against the assembled point-solution stack at order-of-magnitude lower price. Recognized as a distinct market via the 5-criterion bundle-as-market test (see SKILL.md rule #2 amendment 2026-05-23).",
    crud_percentage: 88,
    business_logic: "Simplified fund-formation workflow (entity setup + EIN + banking onboarding); single-fund, single-class waterfall (no European-tier catchup complexity); KYC orchestration for small LP bases; SPV scaffolding with templated docs. Deliberately less complex than FUND-ADMIN, which is the value engineering.",
    min_org_size: "10 xs <50",
    cost_band: "$",
    certification_required: false,
    usa_market_size_usd_m: 180,
    market_size_source_year: 2024,
  },
];

// ============================================================
// CAPABILITIES (33: domain-prefixed)
// ============================================================
type CapDef = { capability_code: string; capability_name: string; description: string; home_domain: string };

const capabilities: CapDef[] = [
  // INV-CRM (6)
  { capability_code: "INVCRM-RELATIONSHIP-INTEL", capability_name: "Relationship Intelligence", description: "Auto-network inference from email and calendar metadata to score relationship strength and identify warm-introduction paths to founders, executives, and LPs.", home_domain: "INV-CRM" },
  { capability_code: "INVCRM-DEAL-PIPELINE", capability_name: "Deal Pipeline Management", description: "Stage-based pipeline (sourcing, screening, diligence, IC, term sheet, closed) with deal-team collaboration, notes, and documents.", home_domain: "INV-CRM" },
  { capability_code: "INVCRM-PORTCO-TRACKING", capability_name: "Portfolio Company Tracking (CRM-side)", description: "Lightweight CRM-side view of portfolio companies for deal-team awareness, distinct from full portfolio monitoring.", home_domain: "INV-CRM" },
  { capability_code: "INVCRM-LP-RELATIONSHIP-MGMT", capability_name: "LP Relationship Management", description: "Fundraising-side CRM for LP outreach, meetings, and capital-commitment pipeline.", home_domain: "INV-CRM" },
  { capability_code: "INVCRM-INTRODUCTION-ROUTING", capability_name: "Warm-Introduction Routing", description: "Path computation across the firm's relationship graph to identify the strongest warm-intro path to a target person.", home_domain: "INV-CRM" },
  { capability_code: "INVCRM-DEAL-MEMO-COLLAB", capability_name: "Deal Memo Collaboration", description: "Shared investment memos, IC documents, and deal-team commentary tied to specific opportunities.", home_domain: "INV-CRM" },

  // FUND-ADMIN (7)
  { capability_code: "FUNDADMIN-CAPITAL-CALLS", capability_name: "Capital Call Processing", description: "Capital-call notice generation, LP payment tracking, and call schedule management across funds.", home_domain: "FUND-ADMIN" },
  { capability_code: "FUNDADMIN-DISTRIBUTION-WATERFALLS", capability_name: "Distribution Waterfalls", description: "European/American/hybrid waterfall calculations with catchup, clawback, and hurdle-rate handling.", home_domain: "FUND-ADMIN" },
  { capability_code: "FUNDADMIN-LP-ONBOARDING-KYC", capability_name: "LP Onboarding and KYC/AML", description: "LP subscription document collection, KYC/AML checks, and accreditation verification.", home_domain: "FUND-ADMIN" },
  { capability_code: "FUNDADMIN-PCAP-STATEMENTS", capability_name: "PCAP Statement Generation", description: "Partner capital account statements per LP with contributions, distributions, gains/losses, and fees.", home_domain: "FUND-ADMIN" },
  { capability_code: "FUNDADMIN-FUND-ACCOUNTING", capability_name: "Fund Accounting", description: "GP books for the fund vehicle with multi-currency support and GAAP/IFRS partnership-accounting compliance.", home_domain: "FUND-ADMIN" },
  { capability_code: "FUNDADMIN-AUDIT-SUPPORT", capability_name: "Audit Support", description: "Document and trail packaging for annual fund audits.", home_domain: "FUND-ADMIN" },
  { capability_code: "FUNDADMIN-LP-PORTAL", capability_name: "LP Portal", description: "Secure portal for LPs to access statements, capital-call notices, distribution notices, and fund documents.", home_domain: "FUND-ADMIN" },

  // PORT-MONIT (6)
  { capability_code: "PORTMONIT-KPI-COLLECTION", capability_name: "Portfolio KPI Collection", description: "Structured collection of portfolio-company KPIs via portal upload, email parsing, or accounting connectors.", home_domain: "PORT-MONIT" },
  { capability_code: "PORTMONIT-VALUATION-TRACKING", capability_name: "Valuation Tracking", description: "Fair-value marks per ASC 820 with methodology-tagged audit trail across reporting cycles.", home_domain: "PORT-MONIT" },
  { capability_code: "PORTMONIT-PERFORMANCE-METRICS", capability_name: "Performance Metric Computation", description: "Time-weighted IRR/MOIC/TVPI/DPI computation across multi-vintage funds with PME benchmarking.", home_domain: "PORT-MONIT" },
  { capability_code: "PORTMONIT-FUND-DASHBOARDS", capability_name: "Fund-Level Dashboards", description: "Aggregate performance and concentration dashboards across portfolio holdings.", home_domain: "PORT-MONIT" },
  { capability_code: "PORTMONIT-LP-REPORTS", capability_name: "LP Performance Reports", description: "Quarterly LP-facing performance reports with fund and individual position metrics.", home_domain: "PORT-MONIT" },
  { capability_code: "PORTMONIT-ESG-DIVERSITY-TRACKING", capability_name: "ESG and Diversity Tracking", description: "Portfolio-company ESG and diversity metric collection for LP disclosure and SFDR compliance.", home_domain: "PORT-MONIT" },

  // CAP-TABLE (8)
  { capability_code: "CAPTABLE-SHAREHOLDER-LEDGER", capability_name: "Shareholder Ledger", description: "Authoritative record of equity holders, classes, and historical transactions for the issuing company.", home_domain: "CAP-TABLE" },
  { capability_code: "CAPTABLE-OPTION-POOL-MGMT", capability_name: "Option Pool Management", description: "Pool size tracking, available headroom, and reservation workflows for board-approved equity grants.", home_domain: "CAP-TABLE" },
  { capability_code: "CAPTABLE-409A-VALUATIONS", capability_name: "409A Valuations", description: "IRS 409A fair-market-value determination per methodology (income, market, asset, OPM backsolve).", home_domain: "CAP-TABLE" },
  { capability_code: "CAPTABLE-GRANT-WORKFLOWS", capability_name: "Equity Grant Workflows", description: "RSU and option grant issuance with board approval, grant acceptance, and vesting-schedule administration.", home_domain: "CAP-TABLE" },
  { capability_code: "CAPTABLE-EXIT-WATERFALL-MODELING", capability_name: "Exit Waterfall Modeling", description: "Scenario modeling for exit proceeds distribution with multiple preferred-class participation rights, liquidation preferences, and conversion economics.", home_domain: "CAP-TABLE" },
  { capability_code: "CAPTABLE-ASC718-EXPENSE", capability_name: "ASC 718 Stock-Based Compensation Expense", description: "Stock-based compensation expense recognition per ASC 718 using Black-Scholes or lattice models, with forfeiture and modification accounting.", home_domain: "CAP-TABLE" },
  { capability_code: "CAPTABLE-EMPLOYEE-EQUITY-PORTAL", capability_name: "Employee Equity Portal", description: "Employee-facing portal for grant acceptance, vesting visibility, exercise workflows, and tax-document access.", home_domain: "CAP-TABLE" },
  { capability_code: "CAPTABLE-SECONDARY-TRANSACTIONS", capability_name: "Secondary Transactions", description: "Tender offers, employee liquidity programs, and shareholder-initiated secondary transfers with board-approval workflow.", home_domain: "CAP-TABLE" },

  // EM-FUND-PLATFORM (6, all with -LITE suffix or formation-specific)
  { capability_code: "EMFUND-FUND-FORMATION", capability_name: "Fund Formation", description: "End-to-end fund-vehicle setup: entity formation, EIN application, banking onboarding, templated LPA. Unique to bundled emerging-manager platforms; not present in modular FUND-ADMIN.", home_domain: "EM-FUND-PLATFORM" },
  { capability_code: "EMFUND-LP-ONBOARDING-LITE", capability_name: "Lite LP Onboarding", description: "Simplified KYC/AML and subscription document workflow for small LP bases (typically <50 LPs).", home_domain: "EM-FUND-PLATFORM" },
  { capability_code: "EMFUND-CAPITAL-CALLS-LITE", capability_name: "Lite Capital Calls", description: "Simplified capital-call workflow for single-fund, single-class structures without European-tier catchup complexity.", home_domain: "EM-FUND-PLATFORM" },
  { capability_code: "EMFUND-SPV-FORMATION", capability_name: "SPV Formation and Administration", description: "Single-deal special-purpose-vehicle creation, templated docs, and ongoing admin. Dominant vehicle below ~$25M deal size.", home_domain: "EM-FUND-PLATFORM" },
  { capability_code: "EMFUND-CAPTABLE-LITE", capability_name: "Lite Cap Table", description: "Basic shareholder ledger and grant tracking for the GP entity and portfolio cap-table awareness; not the full ASC 718 / 409A / exit-waterfall machinery of standalone CAP-TABLE.", home_domain: "EM-FUND-PLATFORM" },
  { capability_code: "EMFUND-LP-PORTAL-LITE", capability_name: "Lite LP Portal", description: "Simplified LP-facing portal for statements and notices, scoped to single-fund structures.", home_domain: "EM-FUND-PLATFORM" },
];

// Cross-cutting links to existing capabilities (these capabilities already exist in catalog)
const crossCuttingCapabilityLinks = [
  { capability_code: "IDENTITY-RESOLUTION", domain_code: "INV-CRM", notes: "Founder and executive identity reconciliation across deal stages and across the firm's relationship graph." },
  { capability_code: "APPROVAL-WORKFLOW", domain_code: "FUND-ADMIN", notes: "Capital-call and distribution approval workflows requiring GP / IC sign-off." },
  { capability_code: "APPROVAL-WORKFLOW", domain_code: "CAP-TABLE", notes: "Board-approval workflow for equity grants, 409A re-valuations, and secondary transactions." },
];

// ============================================================
// VENDORS (existing reused: Carta, Juniper Square)
// ============================================================
const vendors = [
  { vendor_name: "Affinity", vendor_url: "https://www.affinity.co", headquarters_country: "USA", description: "Relationship intelligence CRM for investors and dealmakers." },
  { vendor_name: "Intapp", vendor_url: "https://www.intapp.com", headquarters_country: "USA", description: "Professional and financial services platform vendor (DealCloud, OnePlace). DealCloud was acquired in 2018." },
  { vendor_name: "4Degrees", vendor_url: "https://www.4degrees.ai", headquarters_country: "USA", description: "Relationship intelligence and deal-flow CRM for VC, PE, and investment banking." },
  { vendor_name: "Attio", vendor_url: "https://attio.com", headquarters_country: "UK", description: "Modern CRM with vertical templates including VC and dealmaking." },
  { vendor_name: "Allvue Systems", vendor_url: "https://www.allvuesystems.com", headquarters_country: "USA", description: "Alternative-investment software platform spanning fund accounting, portfolio monitoring, investor relations, and investment data management." },
  { vendor_name: "BlackRock", vendor_url: "https://www.blackrock.com", headquarters_country: "USA", description: "Asset management firm; eFront alternative-investment platform (acquired 2019)." },
  { vendor_name: "AngelList", vendor_url: "https://www.angellist.com", headquarters_country: "USA", description: "Platform for startup investing, fund management, and SPVs (AngelList Stack)." },
  { vendor_name: "Sydecar", vendor_url: "https://sydecar.io", headquarters_country: "USA", description: "Fund administration platform for emerging managers and SPV-focused investing." },
  { vendor_name: "Allocations", vendor_url: "https://allocations.com", headquarters_country: "USA", description: "SPV formation and administration platform for syndicate leads and emerging managers." },
  { vendor_name: "Chronograph", vendor_url: "https://www.chronograph.pe", headquarters_country: "USA", description: "Portfolio monitoring and LP-facing reporting for PE and VC funds." },
  { vendor_name: "Vestberry", vendor_url: "https://www.vestberry.com", headquarters_country: "Slovakia", description: "Portfolio monitoring and reporting platform for VC and PE." },
  { vendor_name: "Visible.vc", vendor_url: "https://visible.vc", headquarters_country: "USA", description: "Portfolio monitoring and LP-update platform with free tier targeting emerging managers." },
  { vendor_name: "Standard Metrics", vendor_url: "https://www.standardmetrics.io", headquarters_country: "USA", description: "Portfolio KPI collection and analytics for VC (formerly Quaestor)." },
  { vendor_name: "Tactyc", vendor_url: "https://www.tactyc.io", headquarters_country: "USA", description: "Fund construction and portfolio modeling platform for VC." },
  { vendor_name: "Hamilton Lane", vendor_url: "https://www.hamiltonlane.com", headquarters_country: "USA", description: "Private markets investment firm; Cobalt LP analytics platform (acquired 2021)." },
  { vendor_name: "Pulley", vendor_url: "https://pulley.com", headquarters_country: "USA", description: "Cap-table management and equity administration for startups." },
  { vendor_name: "Ledgy", vendor_url: "https://ledgy.com", headquarters_country: "Switzerland", description: "European-focused cap-table and equity management platform." },
  { vendor_name: "Fidelity", vendor_url: "https://www.fidelity.com", headquarters_country: "USA", description: "Financial services firm; Shoobx cap-table and equity-administration platform (acquired 2023)." },
  { vendor_name: "Eqvista", vendor_url: "https://eqvista.com", headquarters_country: "USA", description: "Cap-table management and 409A valuation platform for startups." },
];

// ============================================================
// SOLUTIONS (23)
// ============================================================
type SolDef = {
  solution_name: string;
  vendor: string;
  solution_type: "saas" | "on_prem" | "hybrid";
  solution_url?: string;
  description: string;
  primary: string[];
  secondary?: string[];
};

const solutions: SolDef[] = [
  // INV-CRM market
  { solution_name: "Affinity", vendor: "Affinity", solution_type: "saas", solution_url: "https://www.affinity.co", description: "Relationship-intelligence CRM with auto-inferred network graph from email and calendar metadata.", primary: ["INV-CRM"] },
  { solution_name: "DealCloud", vendor: "Intapp", solution_type: "saas", description: "Deal and relationship management for PE, VC, investment banking, and capital markets. Combined into Intapp 2018.", primary: ["INV-CRM"], secondary: ["PORT-MONIT"] },
  { solution_name: "4Degrees", vendor: "4Degrees", solution_type: "saas", description: "Relationship intelligence CRM for VC, PE, and investment banking.", primary: ["INV-CRM"] },
  { solution_name: "Attio for VC", vendor: "Attio", solution_type: "saas", description: "Modern CRM with VC-vertical template configuration.", primary: ["INV-CRM"] },

  // FUND-ADMIN market (some also serve PORT-MONIT or other adjacents)
  { solution_name: "Allvue Platform", vendor: "Allvue Systems", solution_type: "saas", description: "Multi-asset alternative-investment platform: fund accounting, portfolio monitoring, investor portal, investment data management.", primary: ["FUND-ADMIN", "PORT-MONIT"], secondary: ["INV-CRM"] },
  { solution_name: "Carta Fund Admin", vendor: "Carta", solution_type: "saas", description: "Fund administration and LP-facing operations for emerging-to-mid-tier VC and PE funds. Carta acquired Vauban (2022) and absorbed its emerging-manager fund-formation product line.", primary: ["FUND-ADMIN"], secondary: ["PORT-MONIT"] },
  { solution_name: "Juniper Square", vendor: "Juniper Square", solution_type: "saas", description: "Investor portal, fund administration, and CRM, with real-estate and private-capital footprints.", primary: ["FUND-ADMIN"], secondary: ["INV-CRM"] },
  { solution_name: "eFront", vendor: "BlackRock", solution_type: "saas", description: "Alternative-investment platform spanning fund accounting, portfolio monitoring, risk, and analytics. Acquired by BlackRock in 2019.", primary: ["FUND-ADMIN", "PORT-MONIT"] },

  // EM-FUND-PLATFORM market (architectural bundles)
  { solution_name: "Sydecar", vendor: "Sydecar", solution_type: "saas", description: "Emerging-manager-focused architectural bundle: fund formation, administration, capital calls, SPVs, and LP portal as one product. Target segment: 1-5 partner microfunds, AUM <$50M.", primary: ["EM-FUND-PLATFORM"] },
  { solution_name: "AngelList Stack", vendor: "AngelList", solution_type: "saas", description: "Bundled stack (fund formation, admin, light cap table, SPVs) targeting emerging managers; effectively replaces 3+ point-solution vendors at the boutique tier.", primary: ["EM-FUND-PLATFORM"], secondary: ["CAP-TABLE"] },
  { solution_name: "Allocations", vendor: "Allocations", solution_type: "saas", description: "SPV-focused architectural bundle: single-deal vehicle formation, administration, and LP onboarding. Competes with Sydecar and AngelList SPV in the angel/microfund SPV space.", primary: ["EM-FUND-PLATFORM"] },
  { solution_name: "Vauban", vendor: "Carta", solution_type: "saas", description: "Fund-formation and admin platform for emerging managers, acquired by Carta in 2022 and now powered by Carta. Brand retained transitionally; new customers route through Carta Fund Admin.", primary: ["EM-FUND-PLATFORM"] },

  // PORT-MONIT market
  { solution_name: "Chronograph", vendor: "Chronograph", solution_type: "saas", description: "Portfolio monitoring and LP-facing reporting platform for PE and VC funds.", primary: ["PORT-MONIT"] },
  { solution_name: "Vestberry", vendor: "Vestberry", solution_type: "saas", description: "Portfolio monitoring and reporting for VC and PE; mid-tier-and-up focus.", primary: ["PORT-MONIT"] },
  { solution_name: "Visible.vc", vendor: "Visible.vc", solution_type: "saas", description: "Portfolio KPI collection and LP-update platform with free tier explicitly targeting emerging managers.", primary: ["PORT-MONIT"] },
  { solution_name: "Standard Metrics", vendor: "Standard Metrics", solution_type: "saas", description: "Portfolio KPI collection and analytics for VC (formerly Quaestor).", primary: ["PORT-MONIT"] },
  { solution_name: "Tactyc", vendor: "Tactyc", solution_type: "saas", description: "Fund construction and portfolio modeling platform for VC; reserve modeling and J-curve scenario analysis.", primary: ["PORT-MONIT"] },
  { solution_name: "Cobalt LP", vendor: "Hamilton Lane", solution_type: "saas", description: "Private-markets analytics platform for LPs and GPs (acquired by Hamilton Lane 2021).", primary: ["PORT-MONIT"] },

  // CAP-TABLE market
  { solution_name: "Carta Cap Table", vendor: "Carta", solution_type: "saas", description: "Cap-table management, 409A valuations, ASC 718 expense, and equity administration for startups. Market leader by revenue.", primary: ["CAP-TABLE"], secondary: ["FUND-ADMIN"] },
  { solution_name: "Pulley", vendor: "Pulley", solution_type: "saas", description: "Cap-table management with strong scenario-modeling and exit-waterfall tooling.", primary: ["CAP-TABLE"] },
  { solution_name: "Ledgy", vendor: "Ledgy", solution_type: "saas", description: "European-focused cap-table and equity management platform with multi-jurisdiction support.", primary: ["CAP-TABLE"] },
  { solution_name: "Shoobx", vendor: "Fidelity", solution_type: "saas", description: "Cap-table and equity-administration platform, acquired by Fidelity in 2023.", primary: ["CAP-TABLE"] },
  { solution_name: "Eqvista", vendor: "Eqvista", solution_type: "saas", description: "Cap-table management with bundled 409A valuation services for startups.", primary: ["CAP-TABLE"] },
];

// ============================================================
// PHASE C — business_function_domains (responsibility mapping)
// ============================================================
const bfdRows = [
  // INV-CRM
  { domain_code: "INV-CRM", function_name: "Investment Management", responsibility_type: "owner", notes: "Deal teams and IC are the primary users." },
  { domain_code: "INV-CRM", function_name: "Executive", responsibility_type: "consumer", notes: "Investment-committee reviews pipeline; managing partner reads aggregated deal flow." },
  // FUND-ADMIN
  { domain_code: "FUND-ADMIN", function_name: "Investment Management", responsibility_type: "owner", notes: "Fund-operations team within the GP." },
  { domain_code: "FUND-ADMIN", function_name: "Legal", responsibility_type: "consumer", notes: "Reads PCAP statements and capital-call notices for LPA compliance verification." },
  // PORT-MONIT
  { domain_code: "PORT-MONIT", function_name: "Investment Management", responsibility_type: "owner", notes: "Portfolio team owns KPI collection and valuation cycles." },
  { domain_code: "PORT-MONIT", function_name: "Executive", responsibility_type: "consumer", notes: "Managing partner and IC consume aggregated portfolio performance." },
  // CAP-TABLE (portco-side buyer is Finance)
  { domain_code: "CAP-TABLE", function_name: "Finance", responsibility_type: "owner", notes: "Portfolio-company CFO is the primary buyer and operator." },
  { domain_code: "CAP-TABLE", function_name: "Legal", responsibility_type: "contributor", notes: "Securities filings, board-approval flows, and grant documentation." },
  { domain_code: "CAP-TABLE", function_name: "Investment Management", responsibility_type: "contributor", notes: "VC firms use Carta as portfolio cap-table visibility overlay; not the primary buyer but the secondary user." },
  { domain_code: "CAP-TABLE", function_name: "Human Resources", responsibility_type: "consumer", notes: "Equity grants for employees flow through HR-Finance coordination." },
  // EM-FUND-PLATFORM
  { domain_code: "EM-FUND-PLATFORM", function_name: "Investment Management", responsibility_type: "owner", notes: "Solo GP / emerging-manager team uses the bundle for all GP-side operations." },
];

// ============================================================
// industry_business_functions
// ============================================================
const ibfRows = [
  { industry_name: "Venture Capital", function_name: "Investment Management", notes: "Primary function for VC firms; deal sourcing through portfolio management." },
  { industry_name: "Venture Capital", function_name: "Finance", notes: "Fund-level GP accounting and corporate finance of the management company." },
  { industry_name: "Private Equity", function_name: "Investment Management", notes: "Primary function for PE firms; deal teams and portfolio operations." },
  { industry_name: "Private Equity", function_name: "Finance", notes: "Fund-level GP accounting and corporate finance of the management company." },
];

// ============================================================
// RUN
// ============================================================
async function main() {
  // 1. Industries — top level first
  console.log("\n=== Industries (top-level) ===");
  const topIndMap = await syncTable("/industries", [topIndustry], "industry_name");
  const fsId = topIndMap.get("Financial Services")!;

  console.log("\n=== Industries (children) ===");
  const childIndRows = childIndustries.map(i => ({
    industry_name: i.industry_name,
    description: i.description,
    parent_industry_id: fsId,
  }));
  const allIndMap = await syncTable("/industries", childIndRows, "industry_name");

  // 2. Banking re-parent under Financial Services
  console.log("\n=== Re-parent Banking under Financial Services ===");
  const banking = await get("/industries?industry_name=eq.Banking&select=id,parent_industry_id");
  if (banking.length === 1 && banking[0].parent_industry_id !== fsId) {
    await call({ method: "PATCH", path: `/industries?id=eq.${banking[0].id}`, body: { parent_industry_id: fsId } });
    console.log(`  patched Banking (id=${banking[0].id}) -> parent_industry_id=${fsId}`);
  } else {
    console.log(`  Banking already correctly parented (or not found)`);
  }

  // 3. Business function — Investment Management under Finance
  console.log("\n=== Business function (Investment Management) ===");
  const finance = await get(`/business_functions?business_function_name=eq.${encodeURIComponent("Finance")}&select=id`);
  if (finance.length !== 1) throw new Error(`Finance function not found`);
  const financeId = Number(finance[0].id);
  const bfMap = await syncTable(
    "/business_functions",
    [{
      business_function_name: newFunction.business_function_name,
      description: newFunction.description,
      parent_business_function_id: financeId,
    }],
    "business_function_name",
  );

  // 4. Domains
  console.log("\n=== Domains ===");
  const domainRows = domains.map(d => {
    const row = { ...d };
    validateDomainRow(row);
    return row;
  });
  const domainMap = await syncTable("/domains", domainRows, "domain_code");

  // 5. Capabilities
  console.log("\n=== Capabilities ===");
  const capRows = capabilities.map(c => ({
    capability_code: c.capability_code,
    capability_name: c.capability_name,
    description: c.description,
  }));
  const capMap = await syncTable("/capabilities", capRows, "capability_code");

  // 6. capability_domains — domain-prefixed + cross-cutting links
  console.log("\n=== capability_domains ===");
  // Look up cross-cutting capability ids (existing in catalog)
  const crossCutCaps = await get(`/capabilities?capability_code=in.(IDENTITY-RESOLUTION,APPROVAL-WORKFLOW)&select=id,capability_code`);
  const crossCutMap = new Map<string, number>();
  for (const c of crossCutCaps) crossCutMap.set(String(c.capability_code), Number(c.id));
  for (const c of capabilities) crossCutMap.set(c.capability_code, capMap.get(c.capability_code)!);

  const existingCD = await get("/capability_domains?select=capability_id,domain_id&limit=10000");
  const existingCDSet = new Set(existingCD.map(r => `${r.capability_id}:${r.domain_id}`));

  const newCDs: Row[] = [];
  // Domain-prefixed: each capability -> its home_domain
  for (const c of capabilities) {
    const capId = capMap.get(c.capability_code)!;
    const domId = domainMap.get(c.home_domain);
    if (!domId) throw new Error(`Home domain ${c.home_domain} not found`);
    const key = `${capId}:${domId}`;
    if (!existingCDSet.has(key)) {
      existingCDSet.add(key);
      newCDs.push({ capability_id: capId, domain_id: domId, notes: "" });
    }
  }
  // Cross-cutting links
  for (const link of crossCuttingCapabilityLinks) {
    const capId = crossCutMap.get(link.capability_code);
    const domId = domainMap.get(link.domain_code);
    if (!capId || !domId) throw new Error(`Cross-cut missing: ${link.capability_code} / ${link.domain_code}`);
    const key = `${capId}:${domId}`;
    if (!existingCDSet.has(key)) {
      existingCDSet.add(key);
      newCDs.push({ capability_id: capId, domain_id: domId, notes: link.notes });
    }
  }
  if (newCDs.length > 0) {
    console.log(`  inserting ${newCDs.length} new capability_domains rows`);
    await insert("/capability_domains", newCDs);
  } else {
    console.log(`  capability_domains: nothing to insert`);
  }

  // 7. Vendors
  console.log("\n=== Vendors ===");
  const vendorMap = await syncTable(
    "/vendors",
    vendors.map(v => ({ ...v, notes: "" })),
    "vendor_name",
  );
  // Existing Carta and Juniper Square should already be in the map
  if (!vendorMap.get("Carta") || !vendorMap.get("Juniper Square")) {
    throw new Error(`Expected pre-existing vendors Carta and Juniper Square not found`);
  }

  // 8. Solutions
  console.log("\n=== Solutions ===");
  const solRows = solutions.map(s => {
    const vid = vendorMap.get(s.vendor);
    if (!vid) throw new Error(`Vendor ${s.vendor} not found for solution ${s.solution_name}`);
    return {
      solution_name: s.solution_name,
      description: s.description,
      solution_url: s.solution_url ?? "",
      vendor_id: vid,
      solution_type: s.solution_type,
      is_active_in_market: true,
      notes: "",
    };
  });
  const solMap = await syncTable("/solutions", solRows, "solution_name");

  // 9. solution_domains
  console.log("\n=== solution_domains ===");
  const existingSD = await get("/solution_domains?select=solution_id,domain_id,coverage_level&limit=10000");
  const existingSDSet = new Set(existingSD.map(r => `${r.solution_id}:${r.domain_id}:${r.coverage_level}`));
  const newSDs: Row[] = [];
  for (const s of solutions) {
    const sid = solMap.get(s.solution_name)!;
    const link = (code: string, level: "primary" | "secondary") => {
      const did = domainMap.get(code);
      if (!did) throw new Error(`Domain ${code} not found for solution_domains`);
      const key = `${sid}:${did}:${level}`;
      if (!existingSDSet.has(key)) {
        existingSDSet.add(key);
        newSDs.push({ solution_id: sid, domain_id: did, coverage_level: level, notes: "" });
      }
    };
    for (const c of s.primary) link(c, "primary");
    for (const c of s.secondary ?? []) link(c, "secondary");
  }
  if (newSDs.length > 0) {
    console.log(`  inserting ${newSDs.length} new solution_domains rows`);
    await insert("/solution_domains", newSDs);
  } else {
    console.log(`  solution_domains: nothing to insert`);
  }

  // 10. solution_capabilities — sane defaults derived from solution_domains x capability_domains
  console.log("\n=== solution_capabilities (sane defaults: primary->native, secondary->partial) ===");
  // Build domain -> [capability_id] for home capabilities only (skip cross-cutting links)
  const domainHomeCaps = new Map<string, number[]>();
  for (const c of capabilities) {
    const arr = domainHomeCaps.get(c.home_domain) ?? [];
    arr.push(capMap.get(c.capability_code)!);
    domainHomeCaps.set(c.home_domain, arr);
  }
  const existingSC = await get("/solution_capabilities?select=solution_id,capability_id&limit=20000");
  const existingSCSet = new Set(existingSC.map(r => `${r.solution_id}:${r.capability_id}`));
  const newSCs: Row[] = [];
  for (const s of solutions) {
    const sid = solMap.get(s.solution_name)!;
    const addCells = (codes: string[], strength: "native" | "partial") => {
      for (const code of codes) {
        const capIds = domainHomeCaps.get(code) ?? [];
        for (const cid of capIds) {
          const key = `${sid}:${cid}`;
          if (!existingSCSet.has(key)) {
            existingSCSet.add(key);
            newSCs.push({ solution_id: sid, capability_id: cid, delivery_strength: strength, notes: "" });
          }
        }
      }
    };
    addCells(s.primary, "native");
    addCells(s.secondary ?? [], "partial");
  }
  if (newSCs.length > 0) {
    console.log(`  inserting ${newSCs.length} new solution_capabilities rows`);
    await insert("/solution_capabilities", newSCs);
  } else {
    console.log(`  solution_capabilities: nothing to insert`);
  }

  // 11. business_function_domains — Phase C
  console.log("\n=== business_function_domains (Phase C) ===");
  // Look up function ids
  const fnNames = Array.from(new Set(bfdRows.map(r => r.function_name)));
  const fnLookup = await get(`/business_functions?business_function_name=in.(${fnNames.map(n => `"${n}"`).join(",")})&select=id,business_function_name`);
  const fnMap = new Map<string, number>();
  for (const f of fnLookup) fnMap.set(String(f.business_function_name), Number(f.id));
  // Investment Management came from bfMap above
  if (!fnMap.get("Investment Management")) fnMap.set("Investment Management", bfMap.get("Investment Management")!);

  const existingBFD = await get("/business_function_domains?select=business_function_id,domain_id&limit=10000");
  const existingBFDSet = new Set(existingBFD.map(r => `${r.business_function_id}:${r.domain_id}`));
  const newBFDs: Row[] = [];
  for (const r of bfdRows) {
    const fid = fnMap.get(r.function_name);
    const did = domainMap.get(r.domain_code);
    if (!fid) throw new Error(`Function ${r.function_name} not found`);
    if (!did) throw new Error(`Domain ${r.domain_code} not found`);
    const key = `${fid}:${did}`;
    if (!existingBFDSet.has(key)) {
      existingBFDSet.add(key);
      newBFDs.push({
        business_function_id: fid,
        domain_id: did,
        responsibility_type: r.responsibility_type,
        notes: r.notes,
      });
    }
  }
  if (newBFDs.length > 0) {
    console.log(`  inserting ${newBFDs.length} new business_function_domains rows`);
    await insert("/business_function_domains", newBFDs);
  } else {
    console.log(`  business_function_domains: nothing to insert`);
  }

  // 12. industry_business_functions
  console.log("\n=== industry_business_functions ===");
  const existingIBF = await get("/industry_business_functions?select=industry_id,business_function_id&limit=10000");
  const existingIBFSet = new Set(existingIBF.map(r => `${r.industry_id}:${r.business_function_id}`));
  const newIBFs: Row[] = [];
  for (const r of ibfRows) {
    const iid = allIndMap.get(r.industry_name);
    const fid = fnMap.get(r.function_name);
    if (!iid) throw new Error(`Industry ${r.industry_name} not found`);
    if (!fid) throw new Error(`Function ${r.function_name} not found`);
    const key = `${iid}:${fid}`;
    if (!existingIBFSet.has(key)) {
      existingIBFSet.add(key);
      newIBFs.push({ industry_id: iid, business_function_id: fid, notes: r.notes });
    }
  }
  if (newIBFs.length > 0) {
    console.log(`  inserting ${newIBFs.length} new industry_business_functions rows`);
    await insert("/industry_business_functions", newIBFs);
  } else {
    console.log(`  industry_business_functions: nothing to insert`);
  }

  // Final counts
  console.log("\n=== Final row counts (overall catalog) ===");
  const counts = {
    industries: (await get("/industries?select=id&limit=10000")).length,
    business_functions: (await get("/business_functions?select=id&limit=10000")).length,
    domains: (await get("/domains?select=id&limit=10000")).length,
    capabilities: (await get("/capabilities?select=id&limit=10000")).length,
    capability_domains: (await get("/capability_domains?select=capability_id&limit=10000")).length,
    vendors: (await get("/vendors?select=id&limit=10000")).length,
    solutions: (await get("/solutions?select=id&limit=10000")).length,
    solution_domains: (await get("/solution_domains?select=solution_id&limit=20000")).length,
    solution_capabilities: (await get("/solution_capabilities?select=solution_id&limit=20000")).length,
    business_function_domains: (await get("/business_function_domains?select=domain_id&limit=10000")).length,
    industry_business_functions: (await get("/industry_business_functions?select=industry_id&limit=10000")).length,
  };
  console.log(counts);

  // Domain-specific counts for the 5 new domains
  console.log("\n=== Per-domain row counts (5 new domains) ===");
  const newDomainIds = domains.map(d => domainMap.get(d.domain_code)!);
  const newDomainCodes = domains.map(d => d.domain_code);
  const cdCount = (await get(`/capability_domains?domain_id=in.(${newDomainIds.join(",")})&select=capability_id`)).length;
  const sdCount = (await get(`/solution_domains?domain_id=in.(${newDomainIds.join(",")})&select=solution_id`)).length;
  const bfdCount = (await get(`/business_function_domains?domain_id=in.(${newDomainIds.join(",")})&select=domain_id`)).length;
  console.log({
    new_domain_codes: newDomainCodes,
    capability_domains_rows: cdCount,
    solution_domains_rows: sdCount,
    business_function_domains_rows: bfdCount,
  });

  // Rule #8 audit query — should return empty for new rows
  console.log("\n=== Rule #8 audit: zero-metadata domains ===");
  const audit = await get(`/domains?select=domain_code,crud_percentage,min_org_size,cost_band,usa_market_size_usd_m&crud_percentage=eq.0&order=id.desc&limit=50`);
  if (audit.length === 0) {
    console.log(`  PASS: no zero-crud-percentage domains.`);
  } else {
    console.log(`  WARNING: ${audit.length} domains with crud_percentage=0:`);
    console.log(audit);
  }
}

await main();
console.log("\nDone.");
