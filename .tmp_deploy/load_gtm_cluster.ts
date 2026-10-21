#!/usr/bin/env bun
// Loads the GTM-planning cluster into the domain_map module:
// 4 new domains (SALES-PERF, REV-INTEL, GTM-PLAN, ACCT-PLAN),
// 33 new capabilities for those domains + 6 PMM-flavor capabilities backfilled under PROD-MGMT,
// ~16 new vendors (the rest are reused by name),
// 26 solutions, and the supporting junctions
// (capability_domains, solution_domains with coverage_level, solution_capabilities with delivery_strength).
// Idempotent: reads natural keys first, only inserts missing rows.

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

// ============================================================
// DOMAINS
// ============================================================
const newDomains = [
  {
    domain_code: "SALES-PERF",
    domain_name: "Sales Performance Management",
    description:
      "Territory design, quota allocation, sales-capacity planning, incentive compensation management (ICM), commission calculation, plan modeling, payee statements, and SPIF programs for the sales organisation. Code is SALES-PERF rather than the analyst-standard SPM because SPM is already used in this catalog for Strategic Portfolio Management (the IT/agile-delivery flavour). Distinct from COMP-MGMT (broad employee compensation: pay equity, bonus, equity admin) and from EPM (finance-led planning). Pure-play vendors: Varicent, Xactly, Salesforce Spiff, CaptivateIQ, Performio, beqom Pay, QuotaPath. Connected-planning platforms (Anaplan Sales Planning, SAP Commissions) also compete here.",
  },
  {
    domain_code: "REV-INTEL",
    domain_name: "Revenue Intelligence",
    description:
      "AI-driven analytics on sales activity, deal signals, and customer conversations to produce pipeline health, forecast accuracy, deal scoring, and rep coaching insights. Combines conversation intelligence (call/email recording and transcription) with auto-activity capture and revenue forecasting. Distinct from SALES-ENG (outbound cadence execution; Salesloft/Outreach/Apollo flagships) and CRM (system-of-record for opportunities). Pure-play vendors: Gong, Clari, Chorus (ZoomInfo), People.ai, BoostUp.ai, Aviso. Salesforce competes via Einstein Conversation Insights.",
  },
  {
    domain_code: "GTM-PLAN",
    domain_name: "Go-to-Market Planning",
    description:
      "Cross-functional planning of how to enter and grow markets — ICP and segmentation, territory carving, account scoring, channel mix, sales capacity modeling, and launch orchestration. Sits across Sales Ops, Marketing Ops, and Customer Success Ops. Distinct from SALES-PERF (which executes the territory/quota design once decided), EPM (finance-led), and SWP (workforce-led). Emerging pure-play vendors: Fullcast.io, Salesforce Sales Planning, Atrium.ai. Connected-planning platforms (Anaplan, Pigment, Board) deliver it alongside finance and workforce planning, and Varicent has a dedicated Sales Planning module.",
  },
  {
    domain_code: "ACCT-PLAN",
    domain_name: "Strategic Account Planning",
    description:
      "Structured planning and orchestration for strategic and key accounts — relationship mapping (org charts, influence and sentiment tracking), white-space mapping (which products bought vs available), joint account plans, mutual close/onboarding plans, QBR automation, and key-account metrics. Distinct from CRM (transactional opportunity record), MA (programmatic engagement), and CPQ (quoting). Pure-play vendors: Upland Altify, Revegy, DemandFarm, Prolifiq CRUSH, Demandbase Account Planning.",
  },
];

// ============================================================
// CAPABILITIES
// ============================================================
type CapSpec = {
  capability_code: string;
  capability_name: string;
  domain: string;
  description: string;
};

const capabilities: CapSpec[] = [
  // SALES-PERF (8)
  {
    capability_code: "TERRITORY-DESIGN",
    capability_name: "Territory Design and Balancing",
    domain: "SALES-PERF",
    description:
      "Geographic, vertical, and account-based territory carving with balance optimization across pipeline, revenue potential, and rep capacity. Includes mid-year territory rebalancing workflows.",
  },
  {
    capability_code: "QUOTA-ALLOCATION",
    capability_name: "Quota Setting and Allocation",
    domain: "SALES-PERF",
    description:
      "Top-down and bottom-up quota assignment to territories, teams, and individual reps; mid-year adjustments; quota relief workflows; ramp quotas for new hires.",
  },
  {
    capability_code: "INCENTIVE-COMP-MGMT",
    capability_name: "Incentive Compensation Management",
    domain: "SALES-PERF",
    description:
      "ICM — design and administration of variable compensation plans, including plan templates, rule engines, eligibility, accelerators, decelerators, draws, and clawbacks.",
  },
  {
    capability_code: "COMMISSION-CALCULATION",
    capability_name: "Commission Calculation and Settlement",
    domain: "SALES-PERF",
    description:
      "Period-end commission computation, dispute and adjustment workflows, manager approval routing, and payment hand-off to payroll/AP.",
  },
  {
    capability_code: "COMP-PLAN-MODELING",
    capability_name: "Compensation Plan Modeling",
    domain: "SALES-PERF",
    description:
      "Scenario modeling for plan changes — impact on cost-of-sale, rep motivation, and behavior shift. Used during annual plan design and re-design events.",
  },
  {
    capability_code: "PAYEE-STATEMENTS",
    capability_name: "Payee Statements and Visibility",
    domain: "SALES-PERF",
    description:
      "Rep-facing earnings statements, real-time commission visibility, leaderboards, deal-level attribution, and dispute initiation.",
  },
  {
    capability_code: "SALES-CAPACITY-PLANNING",
    capability_name: "Sales Capacity Planning",
    domain: "SALES-PERF",
    description:
      "Headcount-to-quota coverage modeling for the sales organisation, ramp curves, productivity assumptions, and quota-attainment forecasts.",
  },
  {
    capability_code: "SPIF-MGMT",
    capability_name: "SPIF Program Management",
    domain: "SALES-PERF",
    description:
      "Short-term incentive program (SPIF) creation, eligibility rules, time-boxed execution, leaderboards, and effectiveness analysis.",
  },

  // REV-INTEL (7)
  {
    capability_code: "CONVERSATION-INTEL",
    capability_name: "Conversation Intelligence",
    domain: "REV-INTEL",
    description:
      "Call and meeting recording, transcription, speaker separation, topic detection, sentiment analysis, and keyword/competitor tracking across sales and customer-success conversations.",
  },
  {
    capability_code: "DEAL-SCORING",
    capability_name: "AI Deal Scoring",
    domain: "REV-INTEL",
    description:
      "AI-driven scoring of opportunity health using activity signals, engagement patterns, stakeholder coverage, and historical win patterns.",
  },
  {
    capability_code: "REVENUE-FORECASTING",
    capability_name: "AI Revenue Forecasting",
    domain: "REV-INTEL",
    description:
      "Roll-up forecasting with AI-adjusted confidence and variance against rep-submitted commits; gap-to-quota analysis and call-down recommendations.",
  },
  {
    capability_code: "PIPELINE-INSPECTION",
    capability_name: "Pipeline Inspection and Reviews",
    domain: "REV-INTEL",
    description:
      "Pipeline review workflows, deal-room visibility, manager-rep coaching surfaces, mutual close plan visibility, and exception flagging.",
  },
  {
    capability_code: "COACHING-CALL-REVIEW",
    capability_name: "Coaching and Call Review",
    domain: "REV-INTEL",
    description:
      "Snippet sharing, comment threads on call moments, scorecard-driven coaching, and aggregate skill analytics across rep populations.",
  },
  {
    capability_code: "ACTIVITY-CAPTURE",
    capability_name: "Auto Activity Capture",
    domain: "REV-INTEL",
    description:
      "Automatic logging of emails, meetings, and calls into CRM without rep manual entry; contact and account auto-association; engagement metric aggregation.",
  },
  {
    capability_code: "MARKET-SIGNAL-EXTRACTION",
    capability_name: "Market and Competitive Signal Extraction",
    domain: "REV-INTEL",
    description:
      "Mining of conversations for competitor mentions, pricing objections, feature requests, and product feedback; structured aggregation back to product and marketing teams.",
  },

  // GTM-PLAN (8)
  {
    capability_code: "MARKET-SEGMENTATION",
    capability_name: "Market Segmentation and ICP Definition",
    domain: "GTM-PLAN",
    description:
      "Ideal Customer Profile (ICP) definition, account tiering, vertical/industry strategy, ABM (account-based marketing) target list construction, and firmographic/technographic enrichment.",
  },
  {
    capability_code: "TERRITORY-CARVING-PLAN",
    capability_name: "Territory Carving (Planning Phase)",
    domain: "GTM-PLAN",
    description:
      "Initial territory design as part of annual GTM planning — geographies, accounts, segments — produced once and handed to SALES-PERF for ongoing execution and rebalancing.",
  },
  {
    capability_code: "ACCOUNT-SCORING",
    capability_name: "Account Propensity and Fit Scoring",
    domain: "GTM-PLAN",
    description:
      "Propensity-to-buy and fit scoring at account level; white-space mapping across segments; prioritization of named-account lists for sales coverage.",
  },
  {
    capability_code: "GTM-CAPACITY-PLANNING",
    capability_name: "GTM Capacity and Coverage Planning",
    domain: "GTM-PLAN",
    description:
      "Sales/CS/partner headcount-to-coverage modeling against the target market; ramp assumptions; quota-coverage ratio modeling; investment trade-offs across regions and segments.",
  },
  {
    capability_code: "CHANNEL-MIX-PLANNING",
    capability_name: "Channel Mix Planning",
    domain: "GTM-PLAN",
    description:
      "Allocation of revenue and pipeline targets across direct, partner, digital self-serve, and PLG channels; channel-conflict policy modeling.",
  },
  {
    capability_code: "LAUNCH-ORCHESTRATION",
    capability_name: "GTM Launch Orchestration",
    domain: "GTM-PLAN",
    description:
      "Cross-functional sequencing of product and segment launches across Product, PMM, Sales, Marketing, Support, and Success — including milestone tracking and readiness gating.",
  },
  {
    capability_code: "GTM-SCENARIO-MODELING",
    capability_name: "GTM What-If Scenario Modeling",
    domain: "GTM-PLAN",
    description:
      "Plan-vs-actual visibility and scenario forecasting (downturn, segment pivot, geography expansion, channel mix shift) across the GTM plan.",
  },
  {
    capability_code: "PLAN-TO-EXECUTION-HANDOFF",
    capability_name: "Plan-to-Execution Handoff",
    domain: "GTM-PLAN",
    description:
      "Locking the approved GTM plan and pushing artifacts downstream — territories to SALES-PERF, target accounts to CRM/MA, capacity numbers to Finance/EPM.",
  },

  // ACCT-PLAN (7)
  {
    capability_code: "RELATIONSHIP-MAPPING",
    capability_name: "Relationship and Stakeholder Mapping",
    domain: "ACCT-PLAN",
    description:
      "Stakeholder maps and org charts at strategic accounts; influence, sentiment, and access tracking; buying-committee visualization.",
  },
  {
    capability_code: "WHITESPACE-MAPPING",
    capability_name: "White-Space and Cross-Sell Mapping",
    domain: "ACCT-PLAN",
    description:
      "Product-to-account gap analysis — which products and modules an account currently owns versus what is available — used to identify cross-sell and up-sell opportunities.",
  },
  {
    capability_code: "ACCOUNT-PLAN-AUTHORING",
    capability_name: "Account Plan Authoring",
    domain: "ACCT-PLAN",
    description:
      "Structured account plan documents with shared goals, target metrics, action items, and stakeholder ownership; templates for tiered account programs.",
  },
  {
    capability_code: "MUTUAL-ACTION-PLANS",
    capability_name: "Mutual Action Plans",
    domain: "ACCT-PLAN",
    description:
      "Joint customer-vendor close, onboarding, or value-realisation plans, shared digitally with the buyer; milestone tracking with both-side visibility.",
  },
  {
    capability_code: "QBR-AUTOMATION",
    capability_name: "QBR Preparation and Automation",
    domain: "ACCT-PLAN",
    description:
      "Quarterly business review preparation: usage and outcome data assembly, content automation, agenda building, and post-QBR follow-up tracking.",
  },
  {
    capability_code: "KEY-ACCOUNT-METRICS",
    capability_name: "Key Account Health and Growth Metrics",
    domain: "ACCT-PLAN",
    description:
      "Health, growth, retention, and expansion metrics per strategic account; portfolio-level rollups across the named-account list.",
  },
  {
    capability_code: "POLITICAL-MAP-VISUALIZATION",
    capability_name: "Political Map Visualization",
    domain: "ACCT-PLAN",
    description:
      "Power/influence diagrams for buying committees, including champion, blocker, economic-buyer, and technical-buyer roles; coverage gap visualization.",
  },

  // PMM/launch backfill under PROD-MGMT (6)
  {
    capability_code: "LAUNCH-PLANNING",
    capability_name: "Product Launch Planning",
    domain: "PROD-MGMT",
    description:
      "Multi-week launch plans for product releases — launch tiers, milestone tracking, readiness gating across product, engineering, marketing, sales, support, and success.",
  },
  {
    capability_code: "GTM-LAUNCH-COORDINATION",
    capability_name: "GTM Launch Coordination",
    domain: "PROD-MGMT",
    description:
      "Cross-functional launch orchestration owned by Product Marketing — PMM, marketing, sales, support, and success workstream alignment and dependency tracking for launches.",
  },
  {
    capability_code: "MESSAGING-AND-POSITIONING",
    capability_name: "Messaging and Positioning",
    domain: "PROD-MGMT",
    description:
      "Customer-facing messaging frameworks, positioning matrices versus competitors, value-proposition documentation, and persona-specific messaging variants.",
  },
  {
    capability_code: "SALES-ENABLEMENT-CONTENT",
    capability_name: "Sales Enablement Content Production",
    domain: "PROD-MGMT",
    description:
      "Pitch decks, battle cards, demo scripts, one-pagers, ROI calculators, and other sales-enablement collateral authored by Product Marketing to support reps.",
  },
  {
    capability_code: "COMPETITIVE-INTELLIGENCE",
    capability_name: "Competitive Intelligence",
    domain: "PROD-MGMT",
    description:
      "Competitor tracking, structured battle cards, win/loss intelligence aggregation, and competitor-move alerting for the field.",
  },
  {
    capability_code: "WIN-LOSS-INTERVIEWS",
    capability_name: "Structured Win/Loss Interview Programs",
    domain: "PROD-MGMT",
    description:
      "Programmatic post-deal win/loss interviews (internal or third-party), structured data capture, root-cause analysis, and feedback to product, pricing, and sales coaching.",
  },
];

// ============================================================
// VENDORS (reuse by name; only new ones listed below)
// ============================================================
const vendors = [
  {
    vendor_name: "Varicent",
    vendor_url: "https://www.varicent.com",
    headquarters_country: "Canada",
    description: "Sales Performance Management vendor — incentive compensation, territory and quota, sales planning.",
    notes:
      "HQ Toronto. Spun out of IBM in 2019 (IBM Cognos Incentive Compensation Management originated as Varicent prior to a 2012 IBM acquisition). Now backed by Great Hill Partners and Spectrum Equity. Independent SPM pure-play.",
  },
  {
    vendor_name: "Xactly Corporation",
    vendor_url: "https://www.xactlycorp.com",
    headquarters_country: "USA",
    description: "Cloud-based Sales Performance Management vendor — incentive compensation, sales planning, intelligence.",
    notes:
      "Founded 2005, HQ San Jose. Went public 2015 (NYSE: XTLY), taken private by Vista Equity Partners in 2017. Long-standing ICM pure-play.",
  },
  {
    vendor_name: "CaptivateIQ",
    vendor_url: "https://www.captivateiq.com",
    headquarters_country: "USA",
    description: "Modern incentive compensation management vendor designed for ops-led plan modelling.",
    notes:
      "Founded 2017, HQ San Francisco. Backed by ICONIQ, Sequoia, Y Combinator. Spreadsheet-style modelling experience differentiator vs traditional ICM tools.",
  },
  {
    vendor_name: "Performio",
    vendor_url: "https://www.performio.co",
    headquarters_country: "USA",
    description: "Incentive compensation management vendor focused on mid-market sales teams.",
    notes:
      "Founded in Australia (2006), HQ now Newport Beach CA. Backed by Banneker Partners (since 2019). Mid-market ICM pure-play.",
  },
  {
    vendor_name: "QuotaPath",
    vendor_url: "https://www.quotapath.com",
    headquarters_country: "USA",
    description: "Commission tracking and ICM platform aimed at SMB and mid-market sales teams.",
    notes:
      "Founded 2018, HQ Austin / Philadelphia. Backed by Insight Partners, Tribe Capital, ATX. Self-serve commission tracking; expanded into full ICM.",
  },
  {
    vendor_name: "People.ai",
    vendor_url: "https://www.people.ai",
    headquarters_country: "USA",
    description: "Revenue Intelligence and activity-capture vendor.",
    notes:
      "Founded 2016, HQ San Francisco. Backed by Andreessen Horowitz, Iconiq Growth, Lightspeed. Originally focused on activity capture, expanded into AI-driven revenue intelligence and forecasting.",
  },
  {
    vendor_name: "BoostUp.ai",
    vendor_url: "https://boostup.ai",
    headquarters_country: "USA",
    description: "Revenue Intelligence and pipeline-management vendor.",
    notes:
      "Founded 2018, HQ Santa Clara. Backed by Canaan Partners, Emergent Ventures. Competes with Clari in mid-market revenue intelligence.",
  },
  {
    vendor_name: "Aviso",
    vendor_url: "https://www.aviso.com",
    headquarters_country: "USA",
    description: "AI-driven revenue intelligence and forecasting vendor.",
    notes:
      "Founded 2012, HQ Redwood City. Backed by Shasta Ventures, Scale Venture Partners, Next47. One of the earliest AI-forecasting entrants alongside Clari.",
  },
  {
    vendor_name: "Fullcast.io",
    vendor_url: "https://www.fullcast.com",
    headquarters_country: "USA",
    description: "Go-to-Market Planning platform — territory design, quota, and capacity planning integrated with Salesforce.",
    notes:
      "Founded 2017, HQ Bellevue WA. Backed by Epic Ventures, Vertical Venture Partners. Salesforce-native GTM planning pure-play; bridges GTM-PLAN and SALES-PERF.",
  },
  {
    vendor_name: "Atrium.ai",
    vendor_url: "https://www.atriumhq.com",
    headquarters_country: "USA",
    description: "RevOps analytics and AI-driven sales-data insights vendor.",
    notes:
      "Founded 2018, HQ Austin. Backed by Bonfire Ventures, Vertex Ventures. Thin revenue-intelligence overlay focused on Salesforce data quality and rep performance analytics; lighter than Gong/Clari.",
  },
  {
    vendor_name: "Upland Software",
    vendor_url: "https://uplandsoftware.com",
    headquarters_country: "USA",
    description: "Cloud-software acquirer with a portfolio spanning enterprise sales, marketing, project, and document management products.",
    notes:
      "HQ Austin TX, listed on Nasdaq (UPLD). Acquired Altify (account planning) in 2019, plus dozens of other products across PSA, marketing, document workflow, and contact center. Vendor of record for Altify.",
  },
  {
    vendor_name: "Revegy",
    vendor_url: "https://www.revegy.com",
    headquarters_country: "USA",
    description: "Strategic account planning and opportunity management platform vendor.",
    notes:
      "Founded 2005, HQ Atlanta. Independent; account-planning pure-play with relationship mapping, opportunity strategy, and white-space mapping.",
  },
  {
    vendor_name: "DemandFarm",
    vendor_url: "https://www.demandfarm.com",
    headquarters_country: "India",
    description: "Salesforce-native key-account management and account planning vendor.",
    notes:
      "Founded 2008, HQ Pune India with US presence. Independent; AppExchange-native; focused on key-account management for B2B enterprise sales.",
  },
  {
    vendor_name: "Prolifiq",
    vendor_url: "https://www.prolifiq.ai",
    headquarters_country: "USA",
    description: "Account-based selling and account planning vendor (CRUSH, DOCS, ACE).",
    notes:
      "HQ Beaverton OR. Salesforce-native suite for account planning (CRUSH), document collaboration (DOCS), and content engagement (ACE).",
  },
  {
    vendor_name: "Demandbase",
    vendor_url: "https://www.demandbase.com",
    headquarters_country: "USA",
    description: "Account-based marketing and sales intelligence platform vendor.",
    notes:
      "Founded 2006, HQ San Francisco. Acquired Engagio (2020), InsideView (2021), DemandMatrix (2021). Pivoted from pure ABM advertising into a broader ABX platform that includes Account Planning and Sales Intelligence.",
  },
  {
    vendor_name: "monday.com",
    vendor_url: "https://monday.com",
    headquarters_country: "Israel",
    description: "Work-management platform vendor — boards, workflows, dashboards across project and operational use cases.",
    notes:
      "Founded 2012, HQ Tel Aviv. Public (NASDAQ: MNDY). Generic work-management platform commonly used for launch operations and GTM launch tracking.",
  },
];

// ============================================================
// SOLUTIONS
// ============================================================
type SolutionSpec = {
  solution_name: string;
  vendor: string;
  solution_type: "saas" | "on_prem" | "hybrid" | "open_source" | "internal_build" | "manual_process";
  description: string;
  notes?: string;
  primary?: string[];
  secondary?: string[];
  partial?: string[];
};

const solutions: SolutionSpec[] = [
  // ===== SALES-PERF =====
  {
    solution_name: "Varicent SPM",
    vendor: "Varicent",
    solution_type: "saas",
    description:
      "Sales Performance Management platform spanning incentive compensation, territory and quota planning, sales-capacity modelling, and revenue intelligence overlays.",
    primary: ["SALES-PERF"],
    secondary: ["GTM-PLAN"],
  },
  {
    solution_name: "Xactly Incent",
    vendor: "Xactly Corporation",
    solution_type: "saas",
    description:
      "Xactly's flagship incentive-compensation-management product — plan administration, commission calculation, and payee statements. Paired with Xactly Forecasting and Xactly Sales Planning in the broader suite.",
    primary: ["SALES-PERF"],
    secondary: ["GTM-PLAN"],
  },
  {
    solution_name: "Salesforce Spiff",
    vendor: "Salesforce Inc",
    solution_type: "saas",
    description:
      "Commission management product acquired by Salesforce in 2023, now integrated into the Sales Cloud and Revenue Cloud portfolio. Modern UI for commission visibility and plan administration.",
    notes: "Acquired by Salesforce in February 2023; positioned alongside Sales Cloud.",
    primary: ["SALES-PERF"],
  },
  {
    solution_name: "CaptivateIQ",
    vendor: "CaptivateIQ",
    solution_type: "saas",
    description:
      "Modern incentive compensation management platform with a spreadsheet-style modelling experience for RevOps and finance teams.",
    primary: ["SALES-PERF"],
  },
  {
    solution_name: "Performio",
    vendor: "Performio",
    solution_type: "saas",
    description:
      "Mid-market incentive compensation management platform with prebuilt plan templates and rapid implementation.",
    primary: ["SALES-PERF"],
  },
  {
    solution_name: "SAP Commissions",
    vendor: "SAP SE",
    solution_type: "saas",
    description:
      "SAP's cloud incentive compensation management product (formerly SAP Callidus Commissions / CallidusCloud). Plan modelling, calculation, dispute and payee statements.",
    notes: "SAP acquired CallidusCloud in 2018; product rebranded to SAP Commissions.",
    primary: ["SALES-PERF"],
  },
  {
    solution_name: "Anaplan Sales Planning",
    vendor: "Anaplan",
    solution_type: "saas",
    description:
      "Anaplan's connected-planning application focused on sales — territory and quota, sales forecasting, incentive comp modeling, and capacity planning, modelled on the Anaplan calculation engine.",
    primary: ["SALES-PERF", "GTM-PLAN"],
    secondary: ["EPM"],
  },
  {
    solution_name: "beqom Pay",
    vendor: "beqom",
    solution_type: "saas",
    description:
      "Total compensation platform covering both sales incentive compensation and broader employee compensation (salary, bonus, equity, pay equity).",
    primary: ["SALES-PERF", "COMP-MGMT"],
  },
  {
    solution_name: "QuotaPath",
    vendor: "QuotaPath",
    solution_type: "saas",
    description:
      "Commission tracking and ICM platform optimised for SMB and mid-market sales teams; rep-facing commission visibility and self-serve plan setup.",
    primary: ["SALES-PERF"],
  },

  // ===== REV-INTEL =====
  {
    solution_name: "Gong Revenue Intelligence",
    vendor: "Gong",
    solution_type: "saas",
    description:
      "Conversation intelligence-led revenue intelligence platform: call recording and transcription, deal warnings, pipeline inspection, AI forecasting, and coaching surfaces.",
    notes: "Gong's flagship product; Gong Engage is a more recent sales-engagement add-on.",
    primary: ["REV-INTEL"],
    secondary: ["SALES-ENG"],
  },
  {
    solution_name: "Clari Revenue Platform",
    vendor: "Clari",
    solution_type: "saas",
    description:
      "Forecasting-led revenue platform: AI forecast, pipeline inspection, deal scoring, revenue cadences, and (via Wingman acquisition) conversation intelligence.",
    notes: "Acquired Wingman in 2022 to add conversation intelligence to its forecasting flagship.",
    primary: ["REV-INTEL"],
    secondary: ["SALES-ENG"],
  },
  {
    solution_name: "Chorus by ZoomInfo",
    vendor: "ZoomInfo",
    solution_type: "saas",
    description:
      "Conversation intelligence product — call recording, transcription, deal momentum, and coaching — integrated into the broader ZoomInfo go-to-market platform.",
    notes: "Chorus.ai was acquired by ZoomInfo in 2021 for ~$575M.",
    primary: ["REV-INTEL"],
  },
  {
    solution_name: "People.ai",
    vendor: "People.ai",
    solution_type: "saas",
    description:
      "Activity-capture-led revenue intelligence platform — auto-logs sales activity into CRM, surfaces account engagement, deal risk, and forecasting insights.",
    primary: ["REV-INTEL"],
  },
  {
    solution_name: "BoostUp.ai",
    vendor: "BoostUp.ai",
    solution_type: "saas",
    description:
      "Revenue intelligence platform — pipeline inspection, AI forecasting, deal scoring, and renewals management for mid-market revenue teams.",
    primary: ["REV-INTEL"],
  },
  {
    solution_name: "Aviso AI",
    vendor: "Aviso",
    solution_type: "saas",
    description:
      "AI-driven revenue intelligence platform — predictive forecasting, deal-level signal aggregation, and CRM-augmenting analytics.",
    primary: ["REV-INTEL"],
  },
  {
    solution_name: "Salesforce Einstein Conversation Insights",
    vendor: "Salesforce Inc",
    solution_type: "saas",
    description:
      "Salesforce's native conversation intelligence and revenue intelligence overlay for Sales Cloud — call insights, deal signals, and forecasting augmentation.",
    notes: "Replaces and extends the earlier Sales Analytics / High Velocity Sales Einstein insights; positioned against Gong and Clari for Salesforce-standardised shops.",
    primary: ["REV-INTEL"],
  },
  {
    solution_name: "Atrium",
    vendor: "Atrium.ai",
    solution_type: "saas",
    description:
      "RevOps analytics platform with rep-performance insights and Salesforce data-quality monitoring; lighter-weight than Gong/Clari.",
    primary: ["REV-INTEL"],
  },

  // ===== GTM-PLAN =====
  {
    solution_name: "Fullcast",
    vendor: "Fullcast.io",
    solution_type: "saas",
    description:
      "Salesforce-native GTM planning platform — territory design, segmentation, account-to-rep assignment, quota, and continuous rebalancing. Bridges GTM-PLAN and SALES-PERF.",
    primary: ["GTM-PLAN"],
    secondary: ["SALES-PERF"],
  },
  {
    solution_name: "Salesforce Sales Planning",
    vendor: "Salesforce Inc",
    solution_type: "saas",
    description:
      "Salesforce's native sales-planning application — segmentation, territory carving, quota allocation, capacity planning — integrated with Sales Cloud and Salesforce Spiff.",
    notes: "Productized starting 2023 as part of the Sales Cloud planning suite.",
    primary: ["GTM-PLAN"],
  },
  {
    solution_name: "Pigment",
    vendor: "Pigment",
    solution_type: "saas",
    description:
      "Modern business-planning platform covering finance, sales, and workforce planning on a unified model — competes with Anaplan and Workday Adaptive at the platform layer.",
    primary: ["GTM-PLAN", "EPM"],
    secondary: ["SALES-PERF", "SWP"],
  },
  {
    solution_name: "Board",
    vendor: "Board International",
    solution_type: "saas",
    description:
      "Integrated planning platform spanning financial planning, sales planning, supply-chain planning, and analytics on a single model and BI layer.",
    primary: ["EPM"],
    secondary: ["GTM-PLAN", "SALES-PERF"],
  },

  // ===== ACCT-PLAN =====
  {
    solution_name: "Upland Altify",
    vendor: "Upland Software",
    solution_type: "saas",
    description:
      "Salesforce-native strategic account planning, opportunity management, and relationship mapping suite. Established in B2B enterprise sales (MEDDIC/MEDDPICC-aligned methodology support).",
    notes: "Acquired by Upland Software from The TAS Group in 2019. Marketed as Upland Altify within the Upland portfolio.",
    primary: ["ACCT-PLAN"],
  },
  {
    solution_name: "Revegy",
    vendor: "Revegy",
    solution_type: "saas",
    description:
      "Strategic account planning, opportunity strategy, and relationship-mapping platform — supports key-account, opportunity, and territory plans with visual whitespace maps.",
    primary: ["ACCT-PLAN"],
  },
  {
    solution_name: "DemandFarm",
    vendor: "DemandFarm",
    solution_type: "saas",
    description:
      "Salesforce-native key-account management and account planning — org charts, white-space, account plans, and stakeholder management for B2B enterprise sales.",
    primary: ["ACCT-PLAN"],
  },
  {
    solution_name: "Prolifiq CRUSH",
    vendor: "Prolifiq",
    solution_type: "saas",
    description:
      "Salesforce-native account-based selling and key-account planning module — account plans, stakeholder maps, and white-space tracking.",
    primary: ["ACCT-PLAN"],
  },
  {
    solution_name: "Demandbase Account Planning",
    vendor: "Demandbase",
    solution_type: "saas",
    description:
      "Account planning and ABM execution module within the broader Demandbase ABX platform — combines firmographic and intent data with structured account plans.",
    primary: ["ACCT-PLAN"],
    partial: ["MA"],
  },
];

// ============================================================
// SOLUTION_CAPABILITIES (delivery_strength per solution × capability)
// ============================================================
type SolCapSpec = {
  solution: string;
  capability: string;
  delivery_strength: "native" | "partial" | "via_extension" | "not_supported";
  notes?: string;
};

const solCaps: SolCapSpec[] = [
  // ----- SALES-PERF solutions vs SALES-PERF capabilities -----
  // Varicent (full SPM suite)
  { solution: "Varicent SPM", capability: "TERRITORY-DESIGN", delivery_strength: "native" },
  { solution: "Varicent SPM", capability: "QUOTA-ALLOCATION", delivery_strength: "native" },
  { solution: "Varicent SPM", capability: "INCENTIVE-COMP-MGMT", delivery_strength: "native", notes: "Original ICM heritage." },
  { solution: "Varicent SPM", capability: "COMMISSION-CALCULATION", delivery_strength: "native" },
  { solution: "Varicent SPM", capability: "COMP-PLAN-MODELING", delivery_strength: "native" },
  { solution: "Varicent SPM", capability: "PAYEE-STATEMENTS", delivery_strength: "native" },
  { solution: "Varicent SPM", capability: "SALES-CAPACITY-PLANNING", delivery_strength: "native" },
  { solution: "Varicent SPM", capability: "SPIF-MGMT", delivery_strength: "native" },

  // Xactly Incent (ICM core; T&Q via separate modules)
  { solution: "Xactly Incent", capability: "TERRITORY-DESIGN", delivery_strength: "via_extension", notes: "Available via Xactly Sales Planning / AlignStar." },
  { solution: "Xactly Incent", capability: "QUOTA-ALLOCATION", delivery_strength: "via_extension", notes: "Xactly Sales Planning module." },
  { solution: "Xactly Incent", capability: "INCENTIVE-COMP-MGMT", delivery_strength: "native" },
  { solution: "Xactly Incent", capability: "COMMISSION-CALCULATION", delivery_strength: "native" },
  { solution: "Xactly Incent", capability: "COMP-PLAN-MODELING", delivery_strength: "native" },
  { solution: "Xactly Incent", capability: "PAYEE-STATEMENTS", delivery_strength: "native" },
  { solution: "Xactly Incent", capability: "SALES-CAPACITY-PLANNING", delivery_strength: "via_extension" },
  { solution: "Xactly Incent", capability: "SPIF-MGMT", delivery_strength: "native" },

  // Salesforce Spiff (ICM only)
  { solution: "Salesforce Spiff", capability: "TERRITORY-DESIGN", delivery_strength: "not_supported", notes: "Use Salesforce Sales Planning sibling product." },
  { solution: "Salesforce Spiff", capability: "QUOTA-ALLOCATION", delivery_strength: "partial" },
  { solution: "Salesforce Spiff", capability: "INCENTIVE-COMP-MGMT", delivery_strength: "native" },
  { solution: "Salesforce Spiff", capability: "COMMISSION-CALCULATION", delivery_strength: "native" },
  { solution: "Salesforce Spiff", capability: "COMP-PLAN-MODELING", delivery_strength: "native" },
  { solution: "Salesforce Spiff", capability: "PAYEE-STATEMENTS", delivery_strength: "native" },
  { solution: "Salesforce Spiff", capability: "SALES-CAPACITY-PLANNING", delivery_strength: "not_supported" },
  { solution: "Salesforce Spiff", capability: "SPIF-MGMT", delivery_strength: "native" },

  // CaptivateIQ (ICM)
  { solution: "CaptivateIQ", capability: "TERRITORY-DESIGN", delivery_strength: "not_supported" },
  { solution: "CaptivateIQ", capability: "QUOTA-ALLOCATION", delivery_strength: "partial" },
  { solution: "CaptivateIQ", capability: "INCENTIVE-COMP-MGMT", delivery_strength: "native" },
  { solution: "CaptivateIQ", capability: "COMMISSION-CALCULATION", delivery_strength: "native" },
  { solution: "CaptivateIQ", capability: "COMP-PLAN-MODELING", delivery_strength: "native", notes: "Spreadsheet-style modelling is a flagship." },
  { solution: "CaptivateIQ", capability: "PAYEE-STATEMENTS", delivery_strength: "native" },
  { solution: "CaptivateIQ", capability: "SALES-CAPACITY-PLANNING", delivery_strength: "partial" },
  { solution: "CaptivateIQ", capability: "SPIF-MGMT", delivery_strength: "native" },

  // Performio (ICM)
  { solution: "Performio", capability: "TERRITORY-DESIGN", delivery_strength: "not_supported" },
  { solution: "Performio", capability: "QUOTA-ALLOCATION", delivery_strength: "partial" },
  { solution: "Performio", capability: "INCENTIVE-COMP-MGMT", delivery_strength: "native" },
  { solution: "Performio", capability: "COMMISSION-CALCULATION", delivery_strength: "native" },
  { solution: "Performio", capability: "COMP-PLAN-MODELING", delivery_strength: "native" },
  { solution: "Performio", capability: "PAYEE-STATEMENTS", delivery_strength: "native" },
  { solution: "Performio", capability: "SALES-CAPACITY-PLANNING", delivery_strength: "not_supported" },
  { solution: "Performio", capability: "SPIF-MGMT", delivery_strength: "native" },

  // SAP Commissions (ICM)
  { solution: "SAP Commissions", capability: "TERRITORY-DESIGN", delivery_strength: "partial", notes: "Via SAP Territory and Quota module." },
  { solution: "SAP Commissions", capability: "QUOTA-ALLOCATION", delivery_strength: "via_extension", notes: "Via SAP Territory and Quota module." },
  { solution: "SAP Commissions", capability: "INCENTIVE-COMP-MGMT", delivery_strength: "native" },
  { solution: "SAP Commissions", capability: "COMMISSION-CALCULATION", delivery_strength: "native" },
  { solution: "SAP Commissions", capability: "COMP-PLAN-MODELING", delivery_strength: "native" },
  { solution: "SAP Commissions", capability: "PAYEE-STATEMENTS", delivery_strength: "native" },
  { solution: "SAP Commissions", capability: "SALES-CAPACITY-PLANNING", delivery_strength: "partial" },
  { solution: "SAP Commissions", capability: "SPIF-MGMT", delivery_strength: "native" },

  // Anaplan Sales Planning
  { solution: "Anaplan Sales Planning", capability: "TERRITORY-DESIGN", delivery_strength: "native" },
  { solution: "Anaplan Sales Planning", capability: "QUOTA-ALLOCATION", delivery_strength: "native" },
  { solution: "Anaplan Sales Planning", capability: "INCENTIVE-COMP-MGMT", delivery_strength: "partial", notes: "Plan design and modelling yes; commission calc engine is not the flagship." },
  { solution: "Anaplan Sales Planning", capability: "COMMISSION-CALCULATION", delivery_strength: "partial" },
  { solution: "Anaplan Sales Planning", capability: "COMP-PLAN-MODELING", delivery_strength: "native" },
  { solution: "Anaplan Sales Planning", capability: "PAYEE-STATEMENTS", delivery_strength: "partial" },
  { solution: "Anaplan Sales Planning", capability: "SALES-CAPACITY-PLANNING", delivery_strength: "native", notes: "Capacity modelling is a flagship Anaplan use case." },
  { solution: "Anaplan Sales Planning", capability: "SPIF-MGMT", delivery_strength: "partial" },

  // beqom Pay
  { solution: "beqom Pay", capability: "TERRITORY-DESIGN", delivery_strength: "not_supported" },
  { solution: "beqom Pay", capability: "QUOTA-ALLOCATION", delivery_strength: "partial" },
  { solution: "beqom Pay", capability: "INCENTIVE-COMP-MGMT", delivery_strength: "native" },
  { solution: "beqom Pay", capability: "COMMISSION-CALCULATION", delivery_strength: "native" },
  { solution: "beqom Pay", capability: "COMP-PLAN-MODELING", delivery_strength: "native" },
  { solution: "beqom Pay", capability: "PAYEE-STATEMENTS", delivery_strength: "native" },
  { solution: "beqom Pay", capability: "SALES-CAPACITY-PLANNING", delivery_strength: "not_supported" },
  { solution: "beqom Pay", capability: "SPIF-MGMT", delivery_strength: "native" },

  // QuotaPath
  { solution: "QuotaPath", capability: "TERRITORY-DESIGN", delivery_strength: "not_supported" },
  { solution: "QuotaPath", capability: "QUOTA-ALLOCATION", delivery_strength: "partial" },
  { solution: "QuotaPath", capability: "INCENTIVE-COMP-MGMT", delivery_strength: "native" },
  { solution: "QuotaPath", capability: "COMMISSION-CALCULATION", delivery_strength: "native" },
  { solution: "QuotaPath", capability: "COMP-PLAN-MODELING", delivery_strength: "partial" },
  { solution: "QuotaPath", capability: "PAYEE-STATEMENTS", delivery_strength: "native" },
  { solution: "QuotaPath", capability: "SALES-CAPACITY-PLANNING", delivery_strength: "not_supported" },
  { solution: "QuotaPath", capability: "SPIF-MGMT", delivery_strength: "partial" },

  // ----- REV-INTEL solutions -----
  // Gong
  { solution: "Gong Revenue Intelligence", capability: "CONVERSATION-INTEL", delivery_strength: "native", notes: "Flagship surface." },
  { solution: "Gong Revenue Intelligence", capability: "DEAL-SCORING", delivery_strength: "native" },
  { solution: "Gong Revenue Intelligence", capability: "REVENUE-FORECASTING", delivery_strength: "native" },
  { solution: "Gong Revenue Intelligence", capability: "PIPELINE-INSPECTION", delivery_strength: "native" },
  { solution: "Gong Revenue Intelligence", capability: "COACHING-CALL-REVIEW", delivery_strength: "native" },
  { solution: "Gong Revenue Intelligence", capability: "ACTIVITY-CAPTURE", delivery_strength: "native" },
  { solution: "Gong Revenue Intelligence", capability: "MARKET-SIGNAL-EXTRACTION", delivery_strength: "native" },

  // Clari
  { solution: "Clari Revenue Platform", capability: "CONVERSATION-INTEL", delivery_strength: "native", notes: "Via Wingman acquisition." },
  { solution: "Clari Revenue Platform", capability: "DEAL-SCORING", delivery_strength: "native" },
  { solution: "Clari Revenue Platform", capability: "REVENUE-FORECASTING", delivery_strength: "native", notes: "Flagship surface." },
  { solution: "Clari Revenue Platform", capability: "PIPELINE-INSPECTION", delivery_strength: "native" },
  { solution: "Clari Revenue Platform", capability: "COACHING-CALL-REVIEW", delivery_strength: "partial" },
  { solution: "Clari Revenue Platform", capability: "ACTIVITY-CAPTURE", delivery_strength: "native" },
  { solution: "Clari Revenue Platform", capability: "MARKET-SIGNAL-EXTRACTION", delivery_strength: "partial" },

  // Chorus by ZoomInfo
  { solution: "Chorus by ZoomInfo", capability: "CONVERSATION-INTEL", delivery_strength: "native" },
  { solution: "Chorus by ZoomInfo", capability: "DEAL-SCORING", delivery_strength: "partial" },
  { solution: "Chorus by ZoomInfo", capability: "REVENUE-FORECASTING", delivery_strength: "partial" },
  { solution: "Chorus by ZoomInfo", capability: "PIPELINE-INSPECTION", delivery_strength: "partial" },
  { solution: "Chorus by ZoomInfo", capability: "COACHING-CALL-REVIEW", delivery_strength: "native" },
  { solution: "Chorus by ZoomInfo", capability: "ACTIVITY-CAPTURE", delivery_strength: "partial" },
  { solution: "Chorus by ZoomInfo", capability: "MARKET-SIGNAL-EXTRACTION", delivery_strength: "native" },

  // People.ai
  { solution: "People.ai", capability: "CONVERSATION-INTEL", delivery_strength: "partial" },
  { solution: "People.ai", capability: "DEAL-SCORING", delivery_strength: "native" },
  { solution: "People.ai", capability: "REVENUE-FORECASTING", delivery_strength: "native" },
  { solution: "People.ai", capability: "PIPELINE-INSPECTION", delivery_strength: "native" },
  { solution: "People.ai", capability: "COACHING-CALL-REVIEW", delivery_strength: "partial" },
  { solution: "People.ai", capability: "ACTIVITY-CAPTURE", delivery_strength: "native", notes: "Original activity-capture heritage; flagship surface." },
  { solution: "People.ai", capability: "MARKET-SIGNAL-EXTRACTION", delivery_strength: "partial" },

  // BoostUp.ai
  { solution: "BoostUp.ai", capability: "CONVERSATION-INTEL", delivery_strength: "partial" },
  { solution: "BoostUp.ai", capability: "DEAL-SCORING", delivery_strength: "native" },
  { solution: "BoostUp.ai", capability: "REVENUE-FORECASTING", delivery_strength: "native" },
  { solution: "BoostUp.ai", capability: "PIPELINE-INSPECTION", delivery_strength: "native" },
  { solution: "BoostUp.ai", capability: "COACHING-CALL-REVIEW", delivery_strength: "partial" },
  { solution: "BoostUp.ai", capability: "ACTIVITY-CAPTURE", delivery_strength: "native" },
  { solution: "BoostUp.ai", capability: "MARKET-SIGNAL-EXTRACTION", delivery_strength: "partial" },

  // Aviso AI
  { solution: "Aviso AI", capability: "CONVERSATION-INTEL", delivery_strength: "partial" },
  { solution: "Aviso AI", capability: "DEAL-SCORING", delivery_strength: "native" },
  { solution: "Aviso AI", capability: "REVENUE-FORECASTING", delivery_strength: "native", notes: "Original predictive-forecasting heritage." },
  { solution: "Aviso AI", capability: "PIPELINE-INSPECTION", delivery_strength: "native" },
  { solution: "Aviso AI", capability: "COACHING-CALL-REVIEW", delivery_strength: "partial" },
  { solution: "Aviso AI", capability: "ACTIVITY-CAPTURE", delivery_strength: "native" },
  { solution: "Aviso AI", capability: "MARKET-SIGNAL-EXTRACTION", delivery_strength: "partial" },

  // Salesforce Einstein Conversation Insights
  { solution: "Salesforce Einstein Conversation Insights", capability: "CONVERSATION-INTEL", delivery_strength: "native" },
  { solution: "Salesforce Einstein Conversation Insights", capability: "DEAL-SCORING", delivery_strength: "native" },
  { solution: "Salesforce Einstein Conversation Insights", capability: "REVENUE-FORECASTING", delivery_strength: "native", notes: "Via Sales Cloud forecasting + Einstein." },
  { solution: "Salesforce Einstein Conversation Insights", capability: "PIPELINE-INSPECTION", delivery_strength: "native" },
  { solution: "Salesforce Einstein Conversation Insights", capability: "COACHING-CALL-REVIEW", delivery_strength: "partial" },
  { solution: "Salesforce Einstein Conversation Insights", capability: "ACTIVITY-CAPTURE", delivery_strength: "native" },
  { solution: "Salesforce Einstein Conversation Insights", capability: "MARKET-SIGNAL-EXTRACTION", delivery_strength: "partial" },

  // Atrium
  { solution: "Atrium", capability: "CONVERSATION-INTEL", delivery_strength: "not_supported" },
  { solution: "Atrium", capability: "DEAL-SCORING", delivery_strength: "partial" },
  { solution: "Atrium", capability: "REVENUE-FORECASTING", delivery_strength: "partial" },
  { solution: "Atrium", capability: "PIPELINE-INSPECTION", delivery_strength: "partial" },
  { solution: "Atrium", capability: "COACHING-CALL-REVIEW", delivery_strength: "not_supported" },
  { solution: "Atrium", capability: "ACTIVITY-CAPTURE", delivery_strength: "partial" },
  { solution: "Atrium", capability: "MARKET-SIGNAL-EXTRACTION", delivery_strength: "not_supported" },

  // ----- GTM-PLAN solutions vs GTM-PLAN capabilities -----
  // Fullcast
  { solution: "Fullcast", capability: "MARKET-SEGMENTATION", delivery_strength: "native" },
  { solution: "Fullcast", capability: "TERRITORY-CARVING-PLAN", delivery_strength: "native", notes: "Flagship surface." },
  { solution: "Fullcast", capability: "ACCOUNT-SCORING", delivery_strength: "partial" },
  { solution: "Fullcast", capability: "GTM-CAPACITY-PLANNING", delivery_strength: "native" },
  { solution: "Fullcast", capability: "CHANNEL-MIX-PLANNING", delivery_strength: "partial" },
  { solution: "Fullcast", capability: "LAUNCH-ORCHESTRATION", delivery_strength: "not_supported" },
  { solution: "Fullcast", capability: "GTM-SCENARIO-MODELING", delivery_strength: "native" },
  { solution: "Fullcast", capability: "PLAN-TO-EXECUTION-HANDOFF", delivery_strength: "native", notes: "Salesforce-native; continuous push to CRM." },

  // Salesforce Sales Planning
  { solution: "Salesforce Sales Planning", capability: "MARKET-SEGMENTATION", delivery_strength: "native" },
  { solution: "Salesforce Sales Planning", capability: "TERRITORY-CARVING-PLAN", delivery_strength: "native" },
  { solution: "Salesforce Sales Planning", capability: "ACCOUNT-SCORING", delivery_strength: "via_extension" },
  { solution: "Salesforce Sales Planning", capability: "GTM-CAPACITY-PLANNING", delivery_strength: "native" },
  { solution: "Salesforce Sales Planning", capability: "CHANNEL-MIX-PLANNING", delivery_strength: "partial" },
  { solution: "Salesforce Sales Planning", capability: "LAUNCH-ORCHESTRATION", delivery_strength: "not_supported" },
  { solution: "Salesforce Sales Planning", capability: "GTM-SCENARIO-MODELING", delivery_strength: "native" },
  { solution: "Salesforce Sales Planning", capability: "PLAN-TO-EXECUTION-HANDOFF", delivery_strength: "native", notes: "Native push to Sales Cloud and Spiff." },

  // Anaplan Sales Planning (also covers GTM-PLAN capabilities)
  { solution: "Anaplan Sales Planning", capability: "MARKET-SEGMENTATION", delivery_strength: "native" },
  { solution: "Anaplan Sales Planning", capability: "TERRITORY-CARVING-PLAN", delivery_strength: "native" },
  { solution: "Anaplan Sales Planning", capability: "ACCOUNT-SCORING", delivery_strength: "partial" },
  { solution: "Anaplan Sales Planning", capability: "GTM-CAPACITY-PLANNING", delivery_strength: "native" },
  { solution: "Anaplan Sales Planning", capability: "CHANNEL-MIX-PLANNING", delivery_strength: "partial" },
  { solution: "Anaplan Sales Planning", capability: "LAUNCH-ORCHESTRATION", delivery_strength: "not_supported" },
  { solution: "Anaplan Sales Planning", capability: "GTM-SCENARIO-MODELING", delivery_strength: "native" },
  { solution: "Anaplan Sales Planning", capability: "PLAN-TO-EXECUTION-HANDOFF", delivery_strength: "partial" },

  // Varicent SPM (also covers GTM-PLAN capabilities)
  { solution: "Varicent SPM", capability: "MARKET-SEGMENTATION", delivery_strength: "partial" },
  { solution: "Varicent SPM", capability: "TERRITORY-CARVING-PLAN", delivery_strength: "native" },
  { solution: "Varicent SPM", capability: "ACCOUNT-SCORING", delivery_strength: "partial" },
  { solution: "Varicent SPM", capability: "GTM-CAPACITY-PLANNING", delivery_strength: "native" },
  { solution: "Varicent SPM", capability: "CHANNEL-MIX-PLANNING", delivery_strength: "partial" },
  { solution: "Varicent SPM", capability: "LAUNCH-ORCHESTRATION", delivery_strength: "not_supported" },
  { solution: "Varicent SPM", capability: "GTM-SCENARIO-MODELING", delivery_strength: "partial" },
  { solution: "Varicent SPM", capability: "PLAN-TO-EXECUTION-HANDOFF", delivery_strength: "partial" },

  // Pigment (cross-functional planning platform)
  { solution: "Pigment", capability: "MARKET-SEGMENTATION", delivery_strength: "partial" },
  { solution: "Pigment", capability: "TERRITORY-CARVING-PLAN", delivery_strength: "partial" },
  { solution: "Pigment", capability: "ACCOUNT-SCORING", delivery_strength: "not_supported" },
  { solution: "Pigment", capability: "GTM-CAPACITY-PLANNING", delivery_strength: "native" },
  { solution: "Pigment", capability: "CHANNEL-MIX-PLANNING", delivery_strength: "partial" },
  { solution: "Pigment", capability: "LAUNCH-ORCHESTRATION", delivery_strength: "not_supported" },
  { solution: "Pigment", capability: "GTM-SCENARIO-MODELING", delivery_strength: "native" },
  { solution: "Pigment", capability: "PLAN-TO-EXECUTION-HANDOFF", delivery_strength: "partial" },

  // Board (cross-functional planning platform)
  { solution: "Board", capability: "MARKET-SEGMENTATION", delivery_strength: "partial" },
  { solution: "Board", capability: "TERRITORY-CARVING-PLAN", delivery_strength: "partial" },
  { solution: "Board", capability: "ACCOUNT-SCORING", delivery_strength: "not_supported" },
  { solution: "Board", capability: "GTM-CAPACITY-PLANNING", delivery_strength: "native" },
  { solution: "Board", capability: "CHANNEL-MIX-PLANNING", delivery_strength: "partial" },
  { solution: "Board", capability: "LAUNCH-ORCHESTRATION", delivery_strength: "not_supported" },
  { solution: "Board", capability: "GTM-SCENARIO-MODELING", delivery_strength: "native" },
  { solution: "Board", capability: "PLAN-TO-EXECUTION-HANDOFF", delivery_strength: "partial" },

  // ----- ACCT-PLAN solutions vs ACCT-PLAN capabilities -----
  // Upland Altify
  { solution: "Upland Altify", capability: "RELATIONSHIP-MAPPING", delivery_strength: "native", notes: "Relationship maps are a flagship." },
  { solution: "Upland Altify", capability: "WHITESPACE-MAPPING", delivery_strength: "native" },
  { solution: "Upland Altify", capability: "ACCOUNT-PLAN-AUTHORING", delivery_strength: "native" },
  { solution: "Upland Altify", capability: "MUTUAL-ACTION-PLANS", delivery_strength: "partial" },
  { solution: "Upland Altify", capability: "QBR-AUTOMATION", delivery_strength: "partial" },
  { solution: "Upland Altify", capability: "KEY-ACCOUNT-METRICS", delivery_strength: "native" },
  { solution: "Upland Altify", capability: "POLITICAL-MAP-VISUALIZATION", delivery_strength: "native" },

  // Revegy
  { solution: "Revegy", capability: "RELATIONSHIP-MAPPING", delivery_strength: "native" },
  { solution: "Revegy", capability: "WHITESPACE-MAPPING", delivery_strength: "native" },
  { solution: "Revegy", capability: "ACCOUNT-PLAN-AUTHORING", delivery_strength: "native" },
  { solution: "Revegy", capability: "MUTUAL-ACTION-PLANS", delivery_strength: "partial" },
  { solution: "Revegy", capability: "QBR-AUTOMATION", delivery_strength: "partial" },
  { solution: "Revegy", capability: "KEY-ACCOUNT-METRICS", delivery_strength: "native" },
  { solution: "Revegy", capability: "POLITICAL-MAP-VISUALIZATION", delivery_strength: "native" },

  // DemandFarm
  { solution: "DemandFarm", capability: "RELATIONSHIP-MAPPING", delivery_strength: "native", notes: "Org charts are a flagship surface." },
  { solution: "DemandFarm", capability: "WHITESPACE-MAPPING", delivery_strength: "native" },
  { solution: "DemandFarm", capability: "ACCOUNT-PLAN-AUTHORING", delivery_strength: "native" },
  { solution: "DemandFarm", capability: "MUTUAL-ACTION-PLANS", delivery_strength: "partial" },
  { solution: "DemandFarm", capability: "QBR-AUTOMATION", delivery_strength: "partial" },
  { solution: "DemandFarm", capability: "KEY-ACCOUNT-METRICS", delivery_strength: "native" },
  { solution: "DemandFarm", capability: "POLITICAL-MAP-VISUALIZATION", delivery_strength: "native" },

  // Prolifiq CRUSH
  { solution: "Prolifiq CRUSH", capability: "RELATIONSHIP-MAPPING", delivery_strength: "native" },
  { solution: "Prolifiq CRUSH", capability: "WHITESPACE-MAPPING", delivery_strength: "native" },
  { solution: "Prolifiq CRUSH", capability: "ACCOUNT-PLAN-AUTHORING", delivery_strength: "native" },
  { solution: "Prolifiq CRUSH", capability: "MUTUAL-ACTION-PLANS", delivery_strength: "partial" },
  { solution: "Prolifiq CRUSH", capability: "QBR-AUTOMATION", delivery_strength: "partial" },
  { solution: "Prolifiq CRUSH", capability: "KEY-ACCOUNT-METRICS", delivery_strength: "partial" },
  { solution: "Prolifiq CRUSH", capability: "POLITICAL-MAP-VISUALIZATION", delivery_strength: "native" },

  // Demandbase Account Planning
  { solution: "Demandbase Account Planning", capability: "RELATIONSHIP-MAPPING", delivery_strength: "partial" },
  { solution: "Demandbase Account Planning", capability: "WHITESPACE-MAPPING", delivery_strength: "native" },
  { solution: "Demandbase Account Planning", capability: "ACCOUNT-PLAN-AUTHORING", delivery_strength: "native" },
  { solution: "Demandbase Account Planning", capability: "MUTUAL-ACTION-PLANS", delivery_strength: "partial" },
  { solution: "Demandbase Account Planning", capability: "QBR-AUTOMATION", delivery_strength: "partial" },
  { solution: "Demandbase Account Planning", capability: "KEY-ACCOUNT-METRICS", delivery_strength: "native" },
  { solution: "Demandbase Account Planning", capability: "POLITICAL-MAP-VISUALIZATION", delivery_strength: "partial" },
];

// ============================================================
// RUN
// ============================================================
async function main() {
  console.log("\n=== Domains ===");
  await syncTable("/domains", newDomains.map(d => ({ ...d })), "domain_code");
  // Full domain map (we need ids for PROD-MGMT, EPM, SWP, COMP-MGMT, SALES-ENG, MA too)
  const allDomainsRaw = await get("/domains?select=id,domain_code&limit=10000");
  const allDomainMap = new Map<string, number>();
  for (const d of allDomainsRaw) allDomainMap.set(String(d.domain_code), Number(d.id));

  console.log("\n=== Capabilities ===");
  const capRows = capabilities.map(c => ({
    capability_code: c.capability_code,
    capability_name: c.capability_name,
    description: c.description,
  }));
  const capMap = await syncTable("/capabilities", capRows, "capability_code");

  console.log("\n=== capability_domains junctions ===");
  const existingCapDomLinks = await get("/capability_domains?select=capability_id,domain_id&limit=10000");
  const existingCapDomSet = new Set(existingCapDomLinks.map(r => `${r.capability_id}:${r.domain_id}`));
  const newCapDomRows: Row[] = [];
  for (const c of capabilities) {
    const cid = capMap.get(c.capability_code)!;
    const did = allDomainMap.get(c.domain);
    if (!did) { console.warn(`  ! domain ${c.domain} not found for capability ${c.capability_code}`); continue; }
    const key = `${cid}:${did}`;
    if (existingCapDomSet.has(key)) continue;
    newCapDomRows.push({ capability_id: cid, domain_id: did, notes: "" });
  }
  if (newCapDomRows.length > 0) {
    console.log(`  inserting ${newCapDomRows.length} capability_domains rows`);
    await insert("/capability_domains", newCapDomRows);
  } else {
    console.log("  no new capability_domains rows");
  }

  console.log("\n=== Vendors ===");
  await syncTable("/vendors", vendors.map(v => ({ ...v })), "vendor_name");
  // Full vendor map (we need to reuse names like Anaplan/Pigment/Salesforce Inc/SAP SE/beqom/Gong/Clari/ZoomInfo/Board International)
  const fullVendorsRaw = await get("/vendors?select=id,vendor_name&limit=10000");
  const vendorMap = new Map<string, number>();
  for (const v of fullVendorsRaw) vendorMap.set(String(v.vendor_name), Number(v.id));

  console.log("\n=== Solutions ===");
  const solutionRows = solutions.map(s => {
    const vendorId = vendorMap.get(s.vendor);
    if (!vendorId) throw new Error(`Vendor not found for solution ${s.solution_name}: ${s.vendor}`);
    return {
      solution_name: s.solution_name,
      description: s.description,
      solution_url: "",
      vendor_id: vendorId,
      solution_type: s.solution_type,
      is_active_in_market: true,
      notes: s.notes ?? "",
    };
  });
  const solutionMap = await syncTable("/solutions", solutionRows, "solution_name");

  console.log("\n=== solution_domains junctions ===");
  const existingSolDomLinks = await get("/solution_domains?select=solution_id,domain_id,coverage_level&limit=10000");
  const existingSolDomSet = new Set(existingSolDomLinks.map(r => `${r.solution_id}:${r.domain_id}:${r.coverage_level}`));
  const newSolDomRows: Row[] = [];
  let skippedSolDom = 0;
  for (const s of solutions) {
    const sid = solutionMap.get(s.solution_name)!;
    const buildLink = (code: string, coverage: "primary" | "secondary" | "partial") => {
      const did = allDomainMap.get(code);
      if (!did) { console.warn(`  ! domain ${code} not found for ${s.solution_name}`); return; }
      const key = `${sid}:${did}:${coverage}`;
      if (existingSolDomSet.has(key)) { skippedSolDom++; return; }
      existingSolDomSet.add(key);
      newSolDomRows.push({ solution_id: sid, domain_id: did, coverage_level: coverage, notes: "" });
    };
    for (const code of s.primary ?? []) buildLink(code, "primary");
    for (const code of s.secondary ?? []) buildLink(code, "secondary");
    for (const code of s.partial ?? []) buildLink(code, "partial");
  }
  if (newSolDomRows.length > 0) {
    console.log(`  inserting ${newSolDomRows.length} solution_domains rows (${skippedSolDom} already present)`);
    await insert("/solution_domains", newSolDomRows);
  } else {
    console.log(`  no new solution_domains rows (${skippedSolDom} already present)`);
  }

  console.log("\n=== solution_capabilities junctions ===");
  const existingSolCapLinks = await get("/solution_capabilities?select=solution_id,capability_id&limit=10000");
  const existingSolCapSet = new Set(existingSolCapLinks.map(r => `${r.solution_id}:${r.capability_id}`));
  const newSolCapRows: Row[] = [];
  let skippedSolCap = 0;
  for (const sc of solCaps) {
    const sid = solutionMap.get(sc.solution);
    const cid = capMap.get(sc.capability);
    if (!sid) throw new Error(`Solution not found: ${sc.solution}`);
    if (!cid) throw new Error(`Capability not found: ${sc.capability}`);
    const key = `${sid}:${cid}`;
    if (existingSolCapSet.has(key)) { skippedSolCap++; continue; }
    existingSolCapSet.add(key);
    newSolCapRows.push({
      solution_id: sid,
      capability_id: cid,
      delivery_strength: sc.delivery_strength,
      notes: sc.notes ?? "",
    });
  }
  if (newSolCapRows.length > 0) {
    console.log(`  inserting ${newSolCapRows.length} solution_capabilities rows (${skippedSolCap} already present)`);
    await insert("/solution_capabilities", newSolCapRows);
  } else {
    console.log(`  no new solution_capabilities rows (${skippedSolCap} already present)`);
  }

  // ===== Final counts (cluster scope) =====
  const clusterCodes = ["SALES-PERF", "REV-INTEL", "GTM-PLAN", "ACCT-PLAN"];
  const clusterIds = clusterCodes.map(c => allDomainMap.get(c)).filter(Boolean) as number[];
  const inIds = clusterIds.join(",");
  const counts = {
    domains_total: (await get("/domains?select=id&limit=10000")).length,
    capabilities_total: (await get("/capabilities?select=id&limit=10000")).length,
    capability_domains_total: (await get("/capability_domains?select=capability_id&limit=10000")).length,
    vendors_total: (await get("/vendors?select=id&limit=10000")).length,
    solutions_total: (await get("/solutions?select=id&limit=10000")).length,
    solution_domains_total: (await get("/solution_domains?select=solution_id&limit=10000")).length,
    solution_capabilities_total: (await get("/solution_capabilities?select=solution_id&limit=10000")).length,
    cluster_solution_domains: (await get(`/solution_domains?domain_id=in.(${inIds})&select=solution_id&limit=10000`)).length,
    cluster_capability_domains: (await get(`/capability_domains?domain_id=in.(${inIds})&select=capability_id&limit=10000`)).length,
  };
  console.log("\n=== Final counts ===");
  console.log(JSON.stringify(counts, null, 2));
}

await main();
