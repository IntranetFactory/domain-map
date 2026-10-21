#!/usr/bin/env bun
// CRM cluster capability backfill (CRM, CDP, MA, CPQ, SALES-ENG, LOYALTY, SUB-MGMT, B2C-COMM).
// All 8 domains had zero capabilities before this load.
//   - 64 new caps (8 per domain)
//   - 7 new vendors
//   - 29 new solutions
//   - solution_domains for new solutions + backfills for existing solutions
//   - solution_capabilities matrix (~280 positive cells across the cluster)
// Idempotent; run from project root.

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(), new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
async function get(path: string) { return call({ method: "GET", path }); }
async function insert(path: string, rows: Row[]) {
  if (rows.length === 0) return [];
  const CHUNK = 50; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    out.push(...(await call({ method: "POST", path, body: slice })));
  }
  return out;
}
async function syncTable<T extends Row>(path: string, rows: T[], key: keyof T & string) {
  const existing = await get(`${path}?select=id,${key}&limit=10000`);
  const existingKeys = new Set(existing.map(r => String(r[key])));
  const missing = rows.filter(r => !existingKeys.has(String(r[key])));
  if (missing.length > 0) { console.log(`  insert ${missing.length} into ${path}`); await insert(path, missing); }
  else console.log(`  ${path}: nothing new`);
  const all = await get(`${path}?select=id,${key}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[key]), Number(r.id));
  return map;
}

// ============================================================
// CAPABILITIES (64 across 8 domains)
// ============================================================
const capabilities = [
  // CRM (8)
  { capability_code: "CRM-LEAD-MGT", capability_name: "Lead Management", domain: "CRM",
    description: "Capture, scoring, routing, and conversion of inbound and outbound leads to opportunities." },
  { capability_code: "CRM-ACCT-CONTACT", capability_name: "Account and Contact Management", domain: "CRM",
    description: "Master record for B2B accounts and their associated contacts, hierarchies, and relationship history." },
  { capability_code: "CRM-OPPTY-PIPELINE", capability_name: "Opportunity and Pipeline Management", domain: "CRM",
    description: "Deal records, stages, probability, forecast category, and pipeline visualisation." },
  { capability_code: "CRM-FORECAST", capability_name: "Sales Forecasting", domain: "CRM",
    description: "Roll-up of pipeline into time-bucketed forecasts with commit/best-case/upside categorisation and rep/manager overrides." },
  { capability_code: "CRM-ACTIVITY-MGT", capability_name: "Activity and Task Management", domain: "CRM",
    description: "Calls, emails, meetings, tasks logged against records with timeline view and follow-up reminders." },
  { capability_code: "CRM-MOBILE-OFFLINE", capability_name: "Mobile and Offline Access", domain: "CRM",
    description: "Native mobile apps with offline record edits and sync on reconnect; field-sales staple." },
  { capability_code: "CRM-WORKFLOW-AUTO", capability_name: "Workflow Automation and Approvals", domain: "CRM",
    description: "Declarative if-this-then-that rules, approval chains, and process orchestration on CRM records." },
  { capability_code: "CRM-AI-COPILOT", capability_name: "Generative AI Sales Copilot", domain: "CRM",
    description: "Embedded GenAI assistant for email drafting, call summaries, next-best-action suggestions (Einstein/Copilot/Breeze class)." },

  // CDP (8)
  { capability_code: "CDP-INGEST", capability_name: "Event and Profile Ingestion", domain: "CDP",
    description: "Real-time and batch collection of behavioural, transactional, and PII data from sources via SDKs, server-side APIs, and connectors." },
  { capability_code: "CDP-IDENT-RES", capability_name: "Identity Resolution", domain: "CDP",
    description: "Deterministic and probabilistic stitching of disparate identifiers (email, device, cookie, CRM ID) into a unified person/household graph." },
  { capability_code: "CDP-UNIFIED-PROFILE", capability_name: "Unified Customer Profile", domain: "CDP",
    description: "Persistent golden-record profile spanning attributes, computed traits, consent flags, and lifetime engagement history." },
  { capability_code: "CDP-SEGMENTATION", capability_name: "Audience Segmentation", domain: "CDP",
    description: "Visual rule builder for static and dynamic audiences with predicate logic over profile attributes and behavioural events." },
  { capability_code: "CDP-ACTIVATION", capability_name: "Downstream Activation", domain: "CDP",
    description: "Push audiences and traits to ad platforms, MA tools, CRM, and ad-server destinations via reverse-ETL or native connectors." },
  { capability_code: "CDP-CONSENT-PRIV", capability_name: "Consent and Privacy Management", domain: "CDP",
    description: "Source-of-truth tracking of opt-ins/opt-outs by channel and jurisdiction; honoring DSARs and right-to-delete." },
  { capability_code: "CDP-PREDICTIVE", capability_name: "Predictive Scoring and Propensity", domain: "CDP",
    description: "Pre-built and custom ML models for churn risk, LTV, propensity-to-buy on top of unified profiles." },
  { capability_code: "CDP-COMPOSABLE-WH", capability_name: "Warehouse-Native (Composable CDP)", domain: "CDP",
    description: "Operate on the customer's lakehouse/warehouse rather than copy data; zero-copy ingestion and activation." },

  // MA (8)
  { capability_code: "MA-EMAIL-CAMPAIGN", capability_name: "Email Campaign Authoring and Send", domain: "MA",
    description: "Drag-drop email design, template library, send-time optimisation, deliverability tooling." },
  { capability_code: "MA-JOURNEY-ORCH", capability_name: "Cross-Channel Journey Orchestration", domain: "MA",
    description: "Visual canvas for multi-step, multi-channel journeys spanning email, push, SMS, in-app, ads." },
  { capability_code: "MA-LEAD-SCORING", capability_name: "Lead Scoring and Nurturing", domain: "MA",
    description: "Behavioural + demographic scoring with grading and nurture-stream triggers; B2B-flavoured." },
  { capability_code: "MA-LANDING-FORMS", capability_name: "Landing Pages and Forms", domain: "MA",
    description: "Hosted page builder, embeddable forms, progressive profiling, A/B variants." },
  { capability_code: "MA-MOBILE-PUSH", capability_name: "Mobile Push and In-App Messaging", domain: "MA",
    description: "SDK-driven push notifications and in-app modals with segmentation and frequency capping." },
  { capability_code: "MA-AB-OPTIMIZATION", capability_name: "A/B Testing and Send-Time Optimisation", domain: "MA",
    description: "Multivariate testing of subject lines, content, send times; ML-driven optimal-time send." },
  { capability_code: "MA-ATTRIB-MEASURE", capability_name: "Attribution and Multi-Touch Measurement", domain: "MA",
    description: "First-touch / last-touch / multi-touch attribution models and engagement reporting against pipeline." },
  { capability_code: "MA-GEN-AI-CONTENT", capability_name: "Generative AI Content and Subject Lines", domain: "MA",
    description: "GenAI assistants for email copy, subject line variants, image generation; Einstein/Sensei tier." },

  // CPQ (8)
  { capability_code: "CPQ-PRODUCT-CFG", capability_name: "Product Configuration", domain: "CPQ",
    description: "Guided configuration of bundles, dependencies, constraints, and compatibility rules." },
  { capability_code: "CPQ-PRICING-DISCOUNT", capability_name: "Pricing and Discount Management", domain: "CPQ",
    description: "Price books, list/contract/promotional pricing, tiered/volume/segment discounts." },
  { capability_code: "CPQ-GUIDED-SELL", capability_name: "Guided Selling", domain: "CPQ",
    description: "Questionnaire-driven product recommendation flows for complex catalogs." },
  { capability_code: "CPQ-APPROVAL", capability_name: "Discount and Deal Approvals", domain: "CPQ",
    description: "Multi-level approval workflows with thresholds on margin, discount %, and non-standard terms." },
  { capability_code: "CPQ-QUOTE-DOC", capability_name: "Quote Document Generation", domain: "CPQ",
    description: "Branded PDF/Word output with line items, terms, signature block; merge templates." },
  { capability_code: "CPQ-CONTRACT-AMEND", capability_name: "Contract Amendments and Renewals", domain: "CPQ",
    description: "Co-terming, mid-term upgrades/downgrades, renewal forecasting against contract base." },
  { capability_code: "CPQ-PRICE-OPTIM", capability_name: "AI Price Optimisation", domain: "CPQ",
    description: "Win-rate models, deal benchmarking, AI-recommended price points (PROS/Vendavo flagship)." },
  { capability_code: "CPQ-SUBSCRIPTION-MODELS", capability_name: "Subscription Pricing Models", domain: "CPQ",
    description: "Recurring fees, ramp deals, usage-based meters, multi-year terms with escalators." },

  // SALES-ENG (8)
  { capability_code: "SE-CADENCE-SEQ", capability_name: "Multi-Step Cadence Sequences", domain: "SALES-ENG",
    description: "Pre-built and custom touch sequences combining email, call, social, video, SMS over days/weeks." },
  { capability_code: "SE-AUTO-DIALER", capability_name: "Auto-Dialler and Click-to-Call", domain: "SALES-ENG",
    description: "Power/parallel dialler with local-presence numbers and call disposition logging." },
  { capability_code: "SE-EMAIL-TRACKING", capability_name: "Email Tracking and Templates", domain: "SALES-ENG",
    description: "Open/click/reply tracking, mail-merge templates, snippets, send-on-behalf-of." },
  { capability_code: "SE-CONV-INTEL", capability_name: "Conversation Intelligence", domain: "SALES-ENG",
    description: "Call/meeting recording, transcription, AI-extracted talk ratios, objections, next steps." },
  { capability_code: "SE-MEETING-SCHED", capability_name: "Prospect Meeting Scheduler", domain: "SALES-ENG",
    description: "Booking links with calendar availability, round-robin routing, qualifier forms." },
  { capability_code: "SE-INTENT-DATA", capability_name: "Intent and Buyer Signals", domain: "SALES-ENG",
    description: "Third-party intent signals (Bombora/G2), website-visitor de-anonymisation, account engagement scoring." },
  { capability_code: "SE-AI-EMAIL-DRAFT", capability_name: "AI Email and Reply Drafting", domain: "SALES-ENG",
    description: "GenAI-assisted personalised outbound drafting and one-click replies from prospect context." },
  { capability_code: "SE-REP-COACHING", capability_name: "Rep Coaching and Performance", domain: "SALES-ENG",
    description: "Scorecard-driven coaching workflows, A/B comparison of rep cadences, manager 1:1 prep." },

  // LOYALTY (8)
  { capability_code: "LOY-PROGRAM-MGT", capability_name: "Loyalty Program and Rules Engine", domain: "LOYALTY",
    description: "Configure points-earn, tier thresholds, expiry, multi-program logic, partner programs." },
  { capability_code: "LOY-MEMBER-MGT", capability_name: "Member Enrollment and Profile", domain: "LOYALTY",
    description: "Member onboarding, profile, identity linkage to customer record, account hub." },
  { capability_code: "LOY-POINTS-LEDGER", capability_name: "Points Accrual and Ledger", domain: "LOYALTY",
    description: "Double-entry ledger of accrual, redemption, adjustment, expiry events with auditable balance per member." },
  { capability_code: "LOY-REWARDS-CAT", capability_name: "Rewards Catalog and Redemption", domain: "LOYALTY",
    description: "Catalog of redeemable items (discounts, products, experiences, third-party vouchers) with stock and entitlement rules." },
  { capability_code: "LOY-TIER-MGT", capability_name: "Tier Management and Progression", domain: "LOYALTY",
    description: "Tier definitions, qualification windows, retention/demotion logic, tier-specific benefits." },
  { capability_code: "LOY-PROMOTION-ENG", capability_name: "Promotions and Bonus Campaigns", domain: "LOYALTY",
    description: "Time-bound bonus-point and multiplier promotions, surprise-and-delight, gamified challenges." },
  { capability_code: "LOY-PARTNER-ECO", capability_name: "Partner and Coalition Programs", domain: "LOYALTY",
    description: "Multi-brand coalitions, partner-issued points, redemption settlement (airline/credit-card patterns)." },
  { capability_code: "LOY-MEMBER-PORTAL", capability_name: "Member Portal and Mobile App", domain: "LOYALTY",
    description: "Branded member self-service for balance, history, redemption, tier status, referrals." },

  // SUB-MGMT (8)
  { capability_code: "SUB-LIFECYCLE", capability_name: "Subscription Lifecycle Management", domain: "SUB-MGMT",
    description: "Provision, change, suspend, resume, cancel subscriptions with proration and effective-dated changes." },
  { capability_code: "SUB-BILLING-INVOICE", capability_name: "Recurring Billing and Invoicing", domain: "SUB-MGMT",
    description: "Generate invoices on subscription terms (monthly, annual, anniversary) with consolidated billing." },
  { capability_code: "SUB-USAGE-METER", capability_name: "Usage Metering and Rating", domain: "SUB-MGMT",
    description: "Ingest usage events, rate against pricing tables, output billable usage; metered/consumption pricing." },
  { capability_code: "SUB-PAYMENT-DUNNING", capability_name: "Payment Processing and Dunning", domain: "SUB-MGMT",
    description: "Gateway integration, retry logic on declines, automated dunning emails, involuntary-churn recovery." },
  { capability_code: "SUB-REV-REC", capability_name: "Revenue Recognition (ASC 606/IFRS 15)", domain: "SUB-MGMT",
    description: "Recognise revenue across performance obligations and contract modifications; bridge to GL." },
  { capability_code: "SUB-TAX-CALC", capability_name: "Sales Tax and VAT Calculation", domain: "SUB-MGMT",
    description: "Real-time tax calc (often via Avalara/TaxJar) on invoices including jurisdiction- and product-specific rules." },
  { capability_code: "SUB-CHURN-ANALYTICS", capability_name: "Subscription Analytics and SaaS Metrics", domain: "SUB-MGMT",
    description: "MRR/ARR, churn, expansion, cohort LTV, retention curves; CFO-grade SaaS-metric reporting." },
  { capability_code: "SUB-ENT-MGT", capability_name: "Entitlement Management", domain: "SUB-MGMT",
    description: "Translate sold subscriptions into product/feature entitlements consumed by app gating and provisioning." },

  // B2C-COMM (8)
  { capability_code: "COMM-CATALOG-MERCH", capability_name: "Catalog and Merchandising", domain: "B2C-COMM",
    description: "Product catalog, taxonomy, attributes, variants, search/sort, category curation, badging." },
  { capability_code: "COMM-CART-CHECKOUT", capability_name: "Cart and Checkout", domain: "B2C-COMM",
    description: "Cart persistence, multi-step/express checkout, guest checkout, multi-currency/payment-method support." },
  { capability_code: "COMM-STOREFRONT", capability_name: "Storefront Presentation Layer", domain: "B2C-COMM",
    description: "Themable storefront frameworks (headless and templated) with mobile-first responsive design." },
  { capability_code: "COMM-ORDER-CAPTURE", capability_name: "Order Capture and Promise", domain: "B2C-COMM",
    description: "Order placement, validation, inventory reservation, promised-delivery calc; hand-off to OMS/ERP for fulfilment." },
  { capability_code: "COMM-PROMOTIONS", capability_name: "Promotions and Pricing Rules", domain: "B2C-COMM",
    description: "Coupons, BOGO, automatic promotions, cart-level discounts, qualifier rules engine." },
  { capability_code: "COMM-SEARCH-DISC", capability_name: "Search and Product Discovery", domain: "B2C-COMM",
    description: "Faceted search, autocomplete, synonyms, AI-personalised ranking and recommendations." },
  { capability_code: "COMM-B2B-COMM", capability_name: "B2B Commerce Features", domain: "B2C-COMM",
    description: "Account hierarchies, contract pricing, quote-to-order, requisition lists, role-based purchasing." },
  { capability_code: "COMM-HEADLESS-API", capability_name: "Headless Commerce APIs", domain: "B2C-COMM",
    description: "API-first commerce backend decoupled from presentation (commercetools, Salesforce Composable Storefront)." },
];

// ============================================================
// VENDORS (7 new)
// ============================================================
const newVendors = [
  { vendor_name: "Intuit Mailchimp", vendor_url: "https://mailchimp.com", headquarters_country: "USA",
    description: "All-in-one email marketing and SMB CRM platform.",
    notes: "Atlanta GA; parent Intuit (Mountain View CA). Acquired by Intuit in 2021." },
  { vendor_name: "ActiveCampaign", vendor_url: "https://www.activecampaign.com", headquarters_country: "USA",
    description: "SMB / mid-market marketing automation and customer-experience automation vendor.",
    notes: "HQ Chicago IL. Founded 2003." },
  { vendor_name: "BlueConic", vendor_url: "https://www.blueconic.com", headquarters_country: "USA",
    description: "Pure-play CDP focused on privacy-by-design and first-party data activation.",
    notes: "HQ Boston MA. Vista-backed." },
  { vendor_name: "Hightouch", vendor_url: "https://hightouch.com", headquarters_country: "USA",
    description: "Composable / warehouse-native CDP and reverse-ETL.",
    notes: "HQ San Francisco CA. Snowflake/Databricks/BigQuery-native." },
  { vendor_name: "Insightly", vendor_url: "https://www.insightly.com", headquarters_country: "USA",
    description: "SMB CRM with marketing, service, and project modules.",
    notes: "HQ San Francisco CA. Ownership status as of 2024-2025 pending verification." },
  { vendor_name: "Reply.io", vendor_url: "https://reply.io", headquarters_country: "USA",
    description: "AI-driven sales engagement and multichannel outbound automation.",
    notes: "Redwood City CA / Lviv UA." },
  { vendor_name: "OneBill", vendor_url: "https://onebillsoftware.com", headquarters_country: "USA",
    description: "Subscription, billing, and revenue management for telecoms / IoT / SaaS.",
    notes: "HQ San Jose CA." },
];

// ============================================================
// SOLUTIONS (29 new)
// ============================================================
type SolutionSpec = {
  solution_name: string; vendor: string;
  solution_type: "saas"|"on_prem"|"hybrid"|"open_source"|"internal_build"|"manual_process";
  solution_url: string; description: string; notes?: string;
  primary?: string[]; secondary?: string[]; partial?: string[];
};
const newSolutions: SolutionSpec[] = [
  // CDP / MA additions
  { solution_name: "Microsoft Dynamics 365 Customer Insights", vendor: "Microsoft", solution_type: "saas",
    solution_url: "https://www.microsoft.com/en-us/dynamics-365/products/customer-insights",
    description: "Unified SKU combining the former Customer Insights – Data (CDP) and Customer Insights – Journeys (formerly Dynamics 365 Marketing) into one product as of 2024.",
    primary: ["CDP", "MA"] },
  { solution_name: "Oracle Unity CDP", vendor: "Oracle", solution_type: "saas",
    solution_url: "https://www.oracle.com/cx/marketing/unity-customer-data-platform/",
    description: "Oracle's enterprise CDP: identity resolution, unified profiles, segmentation, activation across the Oracle CX stack.",
    primary: ["CDP"] },
  { solution_name: "SAP Subscription Billing", vendor: "SAP SE", solution_type: "saas",
    solution_url: "https://www.sap.com/products/financial-management/subscription-billing.html",
    description: "SAP's cloud subscription and consumption-billing platform; complements SAP CPQ on the quote-to-cash spine.",
    primary: ["SUB-MGMT"] },
  { solution_name: "SAP Emarsys Customer Engagement", vendor: "SAP SE", solution_type: "saas",
    solution_url: "https://emarsys.com",
    description: "B2C marketing automation: cross-channel journeys, AI-recommended audiences, mobile + web personalisation. Acquired by SAP in 2020.",
    primary: ["MA"], partial: ["CDP"] },
  { solution_name: "BlueConic CDP", vendor: "BlueConic", solution_type: "saas",
    solution_url: "https://www.blueconic.com",
    description: "Privacy-first CDP for B2C: real-time profile unification, consent-aware activation, marketer-friendly UI.",
    primary: ["CDP"] },
  { solution_name: "Hightouch", vendor: "Hightouch", solution_type: "saas",
    solution_url: "https://hightouch.com",
    description: "Composable / warehouse-native CDP and reverse-ETL: operates on Snowflake/Databricks/BigQuery without copying data.",
    primary: ["CDP"] },
  { solution_name: "Klaviyo CDP", vendor: "Klaviyo", solution_type: "saas",
    solution_url: "https://www.klaviyo.com/cdp",
    description: "Ecom-focused CDP add-on launched 2023; complements Klaviyo's MA core for retailers wanting unified profiles.",
    primary: ["CDP"] },
  { solution_name: "Insightly CRM", vendor: "Insightly", solution_type: "saas",
    solution_url: "https://www.insightly.com",
    description: "SMB CRM combining sales, marketing, service, and project modules.",
    primary: ["CRM"] },
  { solution_name: "ActiveCampaign", vendor: "ActiveCampaign", solution_type: "saas",
    solution_url: "https://www.activecampaign.com",
    description: "SMB marketing automation and customer-experience automation platform with lightweight CRM.",
    primary: ["MA"], partial: ["CRM"] },
  { solution_name: "Mailchimp", vendor: "Intuit Mailchimp", solution_type: "saas",
    solution_url: "https://mailchimp.com",
    description: "Email-led SMB marketing automation with lightweight CRM, landing pages, and SMS marketing.",
    primary: ["MA"] },
  { solution_name: "Reply.io", vendor: "Reply.io", solution_type: "saas",
    solution_url: "https://reply.io",
    description: "AI-driven multichannel sales engagement: email/LinkedIn/calls/SMS cadences with AI personalisation.",
    primary: ["SALES-ENG"] },
  { solution_name: "OneBill", vendor: "OneBill", solution_type: "saas",
    solution_url: "https://onebillsoftware.com",
    description: "Subscription, billing, and revenue management for telecoms / IoT / SaaS verticals.",
    primary: ["SUB-MGMT"] },
  { solution_name: "ServiceNow CPQ", vendor: "ServiceNow Inc", solution_type: "saas",
    solution_url: "https://www.servicenow.com/products/cpq.html",
    description: "Native CPQ on the ServiceNow Now Platform: product configuration, pricing, approvals, quoting for industries with strong workflow needs.",
    primary: ["CPQ"] },

  // SALES-ENG solutions (vendors exist; solution rows missing)
  { solution_name: "Outreach", vendor: "Outreach", solution_type: "saas",
    solution_url: "https://www.outreach.io",
    description: "Sales engagement platform: cadences, dialler, email tracking, conversation intelligence, AI rep coaching.",
    primary: ["SALES-ENG"] },
  { solution_name: "Salesloft", vendor: "Salesloft", solution_type: "saas",
    solution_url: "https://salesloft.com",
    description: "Sales engagement platform: cadences, dialler, conversation intelligence (Drift acquisition 2024), forecasting (post-InsightSquared).",
    primary: ["SALES-ENG"] },
  { solution_name: "Apollo.io", vendor: "Apollo.io", solution_type: "saas",
    solution_url: "https://www.apollo.io",
    description: "Sales engagement + B2B prospecting database in one: cadences, dialler, embedded intent data, contact discovery.",
    primary: ["SALES-ENG"] },
  { solution_name: "Gong Engage", vendor: "Gong", solution_type: "saas",
    solution_url: "https://www.gong.io/products/engage/",
    description: "Sales engagement layer on top of Gong's conversation-intelligence flagship; cadences powered by call insights.",
    notes: "Second Gong solution row — distinct from Gong Revenue Intelligence.",
    primary: ["SALES-ENG"] },
  { solution_name: "Groove", vendor: "Groove", solution_type: "saas",
    solution_url: "https://groove.co",
    description: "Salesforce-native sales engagement: cadences, dialler, email tracking, deeply integrated with SFDC. Owned by Clari since 2024.",
    notes: "Vendor row retained as 'Groove' to preserve point-solution identity; Clari ownership noted in description.",
    primary: ["SALES-ENG"] },
  { solution_name: "Mixmax", vendor: "Mixmax", solution_type: "saas",
    solution_url: "https://mixmax.com",
    description: "Gmail-first sales engagement: sequences, templates, scheduler, polls, surveys for SMB reps living in Gmail.",
    primary: ["SALES-ENG"] },
  { solution_name: "Yesware", vendor: "Yesware", solution_type: "saas",
    solution_url: "https://www.yesware.com",
    description: "Email-centric sales engagement: tracking, templates, mail merge, lightweight cadences for individual reps and small teams.",
    primary: ["SALES-ENG"] },
  { solution_name: "ZoomInfo Engage", vendor: "ZoomInfo", solution_type: "saas",
    solution_url: "https://www.zoominfo.com/engage",
    description: "Sales engagement layered on ZoomInfo's B2B contact/intent database: cadences, dialler, intent-triggered workflows.",
    primary: ["SALES-ENG"] },

  // SUB-MGMT solutions (vendors exist)
  { solution_name: "Zuora Billing", vendor: "Zuora", solution_type: "saas",
    solution_url: "https://www.zuora.com/products/billing/",
    description: "Enterprise subscription billing and revenue platform: complex pricing, usage rating, invoicing, revenue recognition (Zuora Revenue).",
    primary: ["SUB-MGMT"] },
  { solution_name: "Chargebee", vendor: "Chargebee", solution_type: "saas",
    solution_url: "https://www.chargebee.com",
    description: "Mid-market subscription billing and revenue management; popular with B2B SaaS for fast time-to-billing.",
    primary: ["SUB-MGMT"] },
  { solution_name: "Stripe Billing", vendor: "Stripe", solution_type: "saas",
    solution_url: "https://stripe.com/billing",
    description: "Subscription and metered billing layered on Stripe's payments stack; developer-friendly, strong global tax/payments coverage.",
    primary: ["SUB-MGMT"] },
  { solution_name: "Recurly", vendor: "Recurly", solution_type: "saas",
    solution_url: "https://recurly.com",
    description: "Subscription billing and recurring revenue platform for consumer SaaS and media; dunning automation focus.",
    primary: ["SUB-MGMT"] },
  { solution_name: "Maxio", vendor: "Maxio", solution_type: "saas",
    solution_url: "https://www.maxio.com",
    description: "Merger of Chargify + SaaSOptics: subscription billing + SaaS finance metrics under one brand.",
    primary: ["SUB-MGMT"] },
  { solution_name: "Aria Systems", vendor: "Aria Systems", solution_type: "saas",
    solution_url: "https://www.ariasystems.com",
    description: "Enterprise monetisation platform for complex recurring revenue: hierarchies, partner billing, telco/media verticals.",
    primary: ["SUB-MGMT"] },
  { solution_name: "BillingPlatform", vendor: "BillingPlatform", solution_type: "saas",
    solution_url: "https://billingplatform.com",
    description: "Cloud monetisation platform for complex billing scenarios: usage rating, mediation, AR, revenue management.",
    primary: ["SUB-MGMT"] },

  // CRM additions
  { solution_name: "Zoho CRM Plus", vendor: "Zoho Corporation", solution_type: "saas",
    solution_url: "https://www.zoho.com/crmplus/",
    description: "Bundled Zoho CRM suite combining Sales (CRM), Marketing (Campaigns), Customer Service, Social, and Analytics under one UI/license.",
    primary: ["CRM"], partial: ["MA", "SALES-ENG"] },
];

// solution_domains backfill for existing solutions
const backfillSolDom: { solution: string; coverage: "primary"|"secondary"|"partial"; domain: string }[] = [
  { solution: "Bloomreach Engagement", coverage: "primary", domain: "MA" },
  { solution: "HubSpot Sales Hub", coverage: "partial", domain: "SALES-ENG" },
];

// ============================================================
// SOLUTION_CAPABILITIES MATRIX
// ============================================================
type S = "native"|"partial"|"via_extension"|"not_supported";
type SolCap = { solution: string; capability: string; delivery_strength: S; notes?: string };
function row8(sol: string, capCodes: string[], vals: S[]): SolCap[] {
  return vals.map((s, i) => ({ solution: sol, capability: capCodes[i], delivery_strength: s }))
             .filter(r => r.delivery_strength !== "not_supported");
}

const crmCaps = ["CRM-LEAD-MGT","CRM-ACCT-CONTACT","CRM-OPPTY-PIPELINE","CRM-FORECAST","CRM-ACTIVITY-MGT","CRM-MOBILE-OFFLINE","CRM-WORKFLOW-AUTO","CRM-AI-COPILOT"];
const cdpCaps = ["CDP-INGEST","CDP-IDENT-RES","CDP-UNIFIED-PROFILE","CDP-SEGMENTATION","CDP-ACTIVATION","CDP-CONSENT-PRIV","CDP-PREDICTIVE","CDP-COMPOSABLE-WH"];
const maCaps  = ["MA-EMAIL-CAMPAIGN","MA-JOURNEY-ORCH","MA-LEAD-SCORING","MA-LANDING-FORMS","MA-MOBILE-PUSH","MA-AB-OPTIMIZATION","MA-ATTRIB-MEASURE","MA-GEN-AI-CONTENT"];
const cpqCaps = ["CPQ-PRODUCT-CFG","CPQ-PRICING-DISCOUNT","CPQ-GUIDED-SELL","CPQ-APPROVAL","CPQ-QUOTE-DOC","CPQ-CONTRACT-AMEND","CPQ-PRICE-OPTIM","CPQ-SUBSCRIPTION-MODELS"];
const seCaps  = ["SE-CADENCE-SEQ","SE-AUTO-DIALER","SE-EMAIL-TRACKING","SE-CONV-INTEL","SE-MEETING-SCHED","SE-INTENT-DATA","SE-AI-EMAIL-DRAFT","SE-REP-COACHING"];
const loyCaps = ["LOY-PROGRAM-MGT","LOY-MEMBER-MGT","LOY-POINTS-LEDGER","LOY-REWARDS-CAT","LOY-TIER-MGT","LOY-PROMOTION-ENG","LOY-PARTNER-ECO","LOY-MEMBER-PORTAL"];
const subCaps = ["SUB-LIFECYCLE","SUB-BILLING-INVOICE","SUB-USAGE-METER","SUB-PAYMENT-DUNNING","SUB-REV-REC","SUB-TAX-CALC","SUB-CHURN-ANALYTICS","SUB-ENT-MGT"];
const commCaps= ["COMM-CATALOG-MERCH","COMM-CART-CHECKOUT","COMM-STOREFRONT","COMM-ORDER-CAPTURE","COMM-PROMOTIONS","COMM-SEARCH-DISC","COMM-B2B-COMM","COMM-HEADLESS-API"];

const N: S = "native", P: S = "partial", X: S = "via_extension", _: S = "not_supported";

const solCaps: SolCap[] = [
  // CRM
  ...row8("Salesforce Sales Cloud",            crmCaps, [N,N,N,N,N,N,N,N]),
  ...row8("Microsoft Dynamics 365 Sales",      crmCaps, [N,N,N,N,N,N,N,N]),
  ...row8("HubSpot Sales Hub",                 crmCaps, [N,N,N,N,N,N,P,N]),
  ...row8("Zoho CRM",                          crmCaps, [N,N,N,P,N,N,N,P]),
  ...row8("Pipedrive",                         crmCaps, [N,N,N,P,N,P,P,P]),

  // CDP
  ...row8("Salesforce Data Cloud",             cdpCaps, [N,N,N,N,N,P,N,P]),
  ...row8("Adobe Real-Time CDP",               cdpCaps, [N,N,N,N,N,N,P,P]),
  ...row8("Twilio Segment",                    cdpCaps, [N,N,N,N,N,N,X,P]),
  ...row8("Treasure Data CDP",                 cdpCaps, [N,N,N,N,N,N,N,_]),
  ...row8("mParticle CDP",                     cdpCaps, [N,N,N,N,N,N,P,_]),

  // MA
  ...row8("Salesforce Marketing Cloud Engagement", maCaps, [N,N,P,N,N,N,P,N]),
  ...row8("Adobe Marketo Engage",              maCaps, [N,N,N,N,P,N,N,N]),
  ...row8("HubSpot Marketing Hub",             maCaps, [N,P,N,N,X,N,N,N]),
  ...row8("Braze",                             maCaps, [N,N,P,P,N,N,P,N]),
  ...row8("Klaviyo",                           maCaps, [N,N,P,N,N,N,P,N]),

  // CPQ
  ...row8("Salesforce Revenue Cloud",          cpqCaps, [N,N,N,N,N,N,P,N]),
  ...row8("Oracle CPQ",                        cpqCaps, [N,N,N,N,N,P,P,P]),
  ...row8("SAP CPQ",                           cpqCaps, [N,N,N,N,N,P,P,N]),
  ...row8("Conga CPQ",                         cpqCaps, [N,N,N,N,N,N,P,N]),
  ...row8("DealHub CPQ",                       cpqCaps, [N,N,N,N,N,P,P,N]),

  // SALES-ENG
  ...row8("Outreach",                          seCaps, [N,N,N,N,N,P,N,N]),
  ...row8("Salesloft",                         seCaps, [N,N,N,N,N,P,N,N]),
  ...row8("Apollo.io",                         seCaps, [N,N,N,P,N,N,N,P]),
  ...row8("Gong Engage",                       seCaps, [N,N,N,N,P,P,N,N]),
  ...row8("HubSpot Sales Hub",                 seCaps, [N,P,N,P,N,P,N,P]),

  // LOYALTY
  ...row8("Salesforce Loyalty Management",     loyCaps, [N,N,N,N,N,N,N,P]),
  ...row8("SAP Emarsys Loyalty",               loyCaps, [N,N,N,N,N,N,P,P]),
  ...row8("Marigold Loyalty",                  loyCaps, [N,N,N,N,N,N,N,N]),
  ...row8("Antavo Loyalty Cloud",              loyCaps, [N,N,N,N,N,N,N,N]),
  ...row8("LoyaltyLion",                       loyCaps, [N,N,N,N,N,N,P,N]),

  // SUB-MGMT
  ...row8("Zuora Billing",                     subCaps, [N,N,N,N,N,X,N,N]),
  ...row8("Chargebee",                         subCaps, [N,N,N,N,P,N,N,N]),
  ...row8("Stripe Billing",                    subCaps, [N,N,N,N,P,N,P,P]),
  ...row8("Recurly",                           subCaps, [N,N,P,N,P,X,N,P]),
  ...row8("Salesforce Revenue Cloud",          subCaps, [N,N,P,P,N,X,P,P]),

  // B2C-COMM
  ...row8("Shopify Plus",                      commCaps, [N,N,N,N,N,P,N,N]),
  ...row8("Salesforce Commerce Cloud",         commCaps, [N,N,N,N,N,N,N,N]),
  ...row8("Adobe Commerce",                    commCaps, [N,N,N,N,N,N,N,P]),
  ...row8("SAP Commerce Cloud",                commCaps, [N,N,N,N,N,N,N,P]),
  ...row8("commercetools Composable Commerce", commCaps, [N,N,P,N,N,X,N,N]),
];

// ============================================================
// RUN
// ============================================================
async function main() {
  const allDomains = await get("/domains?select=id,domain_code&limit=10000");
  const domainMap = new Map<string, number>();
  for (const d of allDomains) domainMap.set(String(d.domain_code), Number(d.id));

  console.log("\n=== Capabilities ===");
  const capRows = capabilities.map(c => ({
    capability_code: c.capability_code, capability_name: c.capability_name, description: c.description,
  }));
  await syncTable("/capabilities", capRows, "capability_code");
  const allCaps = await get("/capabilities?select=id,capability_code&limit=10000");
  const capMap = new Map<string, number>();
  for (const r of allCaps) capMap.set(String(r.capability_code), Number(r.id));

  console.log("\n=== capability_domains ===");
  const existingCd = await get("/capability_domains?select=capability_id,domain_id&limit=10000");
  const existingCdSet = new Set(existingCd.map(r => `${r.capability_id}:${r.domain_id}`));
  const newCdRows: Row[] = [];
  for (const c of capabilities) {
    const cid = capMap.get(c.capability_code)!;
    const did = domainMap.get(c.domain);
    if (!did) { console.warn(`  ! domain ${c.domain} missing for ${c.capability_code}`); continue; }
    if (existingCdSet.has(`${cid}:${did}`)) continue;
    newCdRows.push({ capability_id: cid, domain_id: did, notes: "" });
  }
  if (newCdRows.length > 0) {
    console.log(`  insert ${newCdRows.length}`); await insert("/capability_domains", newCdRows);
  } else console.log("  none");

  console.log("\n=== Vendors ===");
  await syncTable("/vendors", newVendors.map(v => ({ ...v })), "vendor_name");
  const allVendors = await get("/vendors?select=id,vendor_name&limit=10000");
  const vendorMap = new Map<string, number>();
  for (const v of allVendors) vendorMap.set(String(v.vendor_name), Number(v.id));

  console.log("\n=== Solutions ===");
  const solRows = newSolutions.map(s => {
    const vid = vendorMap.get(s.vendor);
    if (!vid) throw new Error(`Vendor not found: ${s.vendor}`);
    return {
      solution_name: s.solution_name, description: s.description,
      solution_url: s.solution_url, vendor_id: vid,
      solution_type: s.solution_type, is_active_in_market: true, notes: s.notes ?? "",
    };
  });
  await syncTable("/solutions", solRows, "solution_name");
  const allSols = await get("/solutions?select=id,solution_name&limit=10000");
  const solMap = new Map<string, number>();
  for (const r of allSols) solMap.set(String(r.solution_name), Number(r.id));

  console.log("\n=== solution_domains (new + backfill) ===");
  const existingSd = await get("/solution_domains?select=solution_id,domain_id,coverage_level&limit=10000");
  const existingSdSet = new Set(existingSd.map(r => `${r.solution_id}:${r.domain_id}:${r.coverage_level}`));
  const newSdRows: Row[] = [];
  let skippedSd = 0, sdMiss = 0;
  function addSd(solName: string, code: string, coverage: "primary"|"secondary"|"partial") {
    const sid = solMap.get(solName); const did = domainMap.get(code);
    if (!sid || !did) { console.warn(`  ! sol_dom FK miss ${solName}/${code}`); sdMiss++; return; }
    const key = `${sid}:${did}:${coverage}`;
    if (existingSdSet.has(key)) { skippedSd++; return; }
    existingSdSet.add(key);
    newSdRows.push({ solution_id: sid, domain_id: did, coverage_level: coverage, notes: "" });
  }
  for (const s of newSolutions) {
    for (const c of s.primary ?? []) addSd(s.solution_name, c, "primary");
    for (const c of s.secondary ?? []) addSd(s.solution_name, c, "secondary");
    for (const c of s.partial ?? []) addSd(s.solution_name, c, "partial");
  }
  for (const b of backfillSolDom) addSd(b.solution, b.domain, b.coverage);
  if (newSdRows.length > 0) {
    console.log(`  insert ${newSdRows.length} (${skippedSd} skipped, ${sdMiss} miss)`);
    await insert("/solution_domains", newSdRows);
  } else console.log(`  none (${skippedSd} skipped, ${sdMiss} miss)`);

  console.log("\n=== solution_capabilities matrix ===");
  const existingSc = await get("/solution_capabilities?select=solution_id,capability_id&limit=10000");
  const existingScSet = new Set(existingSc.map(r => `${r.solution_id}:${r.capability_id}`));
  const newScRows: Row[] = [];
  let skippedSc = 0, scMiss = 0;
  for (const sc of solCaps) {
    const sid = solMap.get(sc.solution); const cid = capMap.get(sc.capability);
    if (!sid || !cid) { console.warn(`  ! sol_cap FK miss ${sc.solution}/${sc.capability}`); scMiss++; continue; }
    if (existingScSet.has(`${sid}:${cid}`)) { skippedSc++; continue; }
    existingScSet.add(`${sid}:${cid}`);
    newScRows.push({ solution_id: sid, capability_id: cid, delivery_strength: sc.delivery_strength, notes: sc.notes ?? "" });
  }
  if (newScRows.length > 0) {
    console.log(`  insert ${newScRows.length} (${skippedSc} skipped, ${scMiss} miss)`);
    await insert("/solution_capabilities", newScRows);
  } else console.log(`  none (${skippedSc} skipped, ${scMiss} miss)`);

  console.log("\n=== Cluster scope counts ===");
  const codes = ["CRM","CDP","MA","CPQ","SALES-ENG","LOYALTY","SUB-MGMT","B2C-COMM"];
  const counts: any = { _totals: {
    capabilities_total: (await get("/capabilities?select=id&limit=10000")).length,
    solutions_total: (await get("/solutions?select=id&limit=10000")).length,
    solution_capabilities_total: (await get("/solution_capabilities?select=solution_id&limit=10000")).length,
  } };
  for (const c of codes) {
    const did = domainMap.get(c);
    if (!did) continue;
    counts[c] = {
      caps: (await get(`/capability_domains?domain_id=eq.${did}&select=capability_id&limit=10000`)).length,
      solutions: (await get(`/solution_domains?domain_id=eq.${did}&select=solution_id&limit=10000`)).length,
    };
  }
  console.log(JSON.stringify(counts, null, 2));
}
await main();
