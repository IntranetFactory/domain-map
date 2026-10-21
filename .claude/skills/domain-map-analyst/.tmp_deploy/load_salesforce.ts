#!/usr/bin/env bun
// Idempotent loader for Salesforce platform expansion of the domain_map module.
// - Reads existing rows by natural key (domain_code / vendor_name / solution_name)
// - Inserts only what's missing
// - Re-reads to build name->id maps
// - Inserts solution_domains edges, skipping existing pairs
// Uses stdin to avoid Windows command-line length limits.

type Row = Record<string, unknown>;

async function pg(body: object): Promise<Row[]> {
  // Use Bun.spawn with explicit env passthrough; on Windows we resolve the .cmd shim.
  const isWin = process.platform === "win32";
  const cmd = isWin
    ? ["cmd", "/c", "semantius", "call", "crud", "postgrestRequest"]
    : ["semantius", "call", "crud", "postgrestRequest"];
  const proc = Bun.spawn(cmd, {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env },
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdoutTxt, stderrTxt, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) {
    throw new Error(`semantius exit ${code}: ${stderrTxt.trim()}`);
  }
  const txt = stdoutTxt.trim();
  if (!txt) return [];
  try {
    return JSON.parse(txt);
  } catch {
    throw new Error(`bad json from semantius: ${txt.slice(0, 500)}`);
  }
}

async function get(path: string) {
  return pg({ method: "GET", path });
}

async function post(path: string, rows: Row[]) {
  if (rows.length === 0) return [];
  // Chunk to keep individual stdin bodies safe and easier to debug.
  const CHUNK = 50;
  const all: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const res = await pg({
      method: "POST",
      path,
      body: chunk,
      headers: { Prefer: "return=representation" },
    });
    all.push(...res);
  }
  return all;
}

// ------------------------------ DATA ------------------------------

// 10 new domains
const DOMAINS: Array<{ domain_code: string; domain_name: string; description: string }> = [
  {
    domain_code: "CRM",
    domain_name: "Customer Relationship Management",
    description: "Sales force automation, opportunity and pipeline management, account/contact management, and B2B/B2C customer lifecycle. Distinct from CSM (post-sale service) and MA (marketing). Vendors: Salesforce Sales Cloud, HubSpot Sales Hub, Microsoft Dynamics 365 Sales, Oracle Sales, SAP Sales Cloud, Zoho CRM, Pipedrive, SugarCRM, Creatio.",
  },
  {
    domain_code: "MA",
    domain_name: "Marketing Automation",
    description: "Email/SMS/cross-channel campaign orchestration, lead nurturing, and journey management. Includes B2B (account-based marketing) and B2C (consumer engagement) variants. Vendors: Salesforce Marketing Cloud, Adobe Marketo Engage, Oracle Eloqua, HubSpot Marketing Hub, Braze, Iterable, Klaviyo.",
  },
  {
    domain_code: "B2C-COMM",
    domain_name: "Digital Commerce",
    description: "Storefront, catalog, cart, checkout, and order capture for B2C and B2B digital commerce. Distinct from OMS (post-order distributed fulfillment). Vendors: Salesforce Commerce Cloud, Shopify, Adobe Commerce, BigCommerce, SAP Commerce Cloud, commercetools, Oracle Commerce, VTEX.",
  },
  {
    domain_code: "CDP",
    domain_name: "Customer Data Platform",
    description: "Real-time identity resolution and unified customer profiles across marketing, service, and commerce data. Activates segments to downstream channels. Vendors: Salesforce Data Cloud, Adobe Real-Time CDP, Treasure Data, Tealium AudienceStream, Twilio Segment, mParticle, ActionIQ.",
  },
  {
    domain_code: "CPQ",
    domain_name: "Configure-Price-Quote",
    description: "Product configuration, guided selling, pricing, discount approvals, and quote generation. Often packaged with subscription billing under 'Revenue Cloud' or 'Quote-to-Cash'. Vendors: Salesforce Revenue Cloud (CPQ), Conga CPQ, PROS Smart CPQ, Oracle CPQ, SAP CPQ, DealHub, Vendavo.",
  },
  {
    domain_code: "BI",
    domain_name: "Business Intelligence and Analytics",
    description: "Interactive data exploration, dashboards, governed self-service analytics, and embedded analytics. Distinct from observability (OBS) and process mining (PROC-MIN). Vendors: Tableau, Microsoft Power BI, Qlik Sense, Looker, ThoughtSpot, Sigma Computing, Sisense, Domo, MicroStrategy, AWS QuickSight, IBM Cognos.",
  },
  {
    domain_code: "WSC",
    domain_name: "Workstream Collaboration",
    description: "Persistent channel-based messaging, threaded conversations, voice/video huddles, and external collaboration. Distinct from KMS (knowledge artifacts). Vendors: Slack, Microsoft Teams, Google Chat, Mattermost, Rocket.Chat, Cisco Webex, Zoom Team Chat.",
  },
  {
    domain_code: "APP-PAAS",
    domain_name: "Application Platform-as-a-Service",
    description: "Code-first managed runtime for deploying web apps, APIs, and background workers. Distinct from LCAP (low-code) and IPAAS (integration). Vendors: Heroku, AWS Elastic Beanstalk, Azure App Service, GCP App Engine, Vercel, Render, Railway, Fly.io, DigitalOcean App Platform, Netlify.",
  },
  {
    domain_code: "DXP",
    domain_name: "Digital Experience Platform",
    description: "Web content management, personalisation, customer portals, and headless content delivery for branded digital experiences. Vendors: Salesforce Experience Cloud, Adobe Experience Manager, Sitecore XM Cloud, Liferay DXP, Acquia DXP, Optimizely, Bloomreach, OpenText TeamSite, Magnolia.",
  },
  {
    domain_code: "LOYALTY",
    domain_name: "Customer Loyalty Management",
    description: "Points/tiers, rewards programs, member portals, and partner ecosystems for B2C and B2B2C loyalty. Vendors: Salesforce Loyalty Management, SAP Emarsys Loyalty, Marigold Loyalty (Cheetah Digital), Antavo, Annex Cloud, LoyaltyLion, Yotpo.",
  },
];

// New vendors. headquarters_country left as best-known canonical.
const VENDORS: Array<{ vendor_name: string; description: string; vendor_url: string; headquarters_country: string; notes: string }> = [
  { vendor_name: "HubSpot", description: "Inbound marketing, sales, and service platform.", vendor_url: "https://www.hubspot.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Adobe", description: "Digital media, marketing, and experience software.", vendor_url: "https://www.adobe.com", headquarters_country: "USA", notes: "Marketo acquired 2018. Magento acquired 2018." },
  { vendor_name: "Zoho Corporation", description: "Business software suite spanning CRM, finance, HR, and IT.", vendor_url: "https://www.zoho.com", headquarters_country: "India", notes: "" },
  { vendor_name: "Pipedrive", description: "Sales CRM for small and mid-market businesses.", vendor_url: "https://www.pipedrive.com", headquarters_country: "Estonia", notes: "" },
  { vendor_name: "SugarCRM", description: "Sales, marketing, and service automation platform.", vendor_url: "https://www.sugarcrm.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Creatio", description: "No-code platform with CRM and BPM applications.", vendor_url: "https://www.creatio.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Braze", description: "Customer engagement and cross-channel messaging platform.", vendor_url: "https://www.braze.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Iterable", description: "Cross-channel marketing engagement platform.", vendor_url: "https://www.iterable.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Klaviyo", description: "Email and SMS marketing automation for e-commerce.", vendor_url: "https://www.klaviyo.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Shopify", description: "Multi-channel commerce platform.", vendor_url: "https://www.shopify.com", headquarters_country: "Canada", notes: "" },
  { vendor_name: "BigCommerce", description: "SaaS commerce platform for B2C and B2B.", vendor_url: "https://www.bigcommerce.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "commercetools", description: "Headless, composable commerce platform.", vendor_url: "https://commercetools.com", headquarters_country: "Germany", notes: "" },
  { vendor_name: "VTEX", description: "Composable commerce platform with OMS and marketplace capabilities.", vendor_url: "https://vtex.com", headquarters_country: "Brazil", notes: "" },
  { vendor_name: "Treasure Data", description: "Enterprise customer data platform.", vendor_url: "https://www.treasuredata.com", headquarters_country: "USA", notes: "Subsidiary of SoftBank-backed Arm." },
  { vendor_name: "Tealium", description: "Customer data platform and tag management.", vendor_url: "https://tealium.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Twilio", description: "Customer engagement platform; owner of Segment CDP.", vendor_url: "https://www.twilio.com", headquarters_country: "USA", notes: "Segment acquired 2020." },
  { vendor_name: "mParticle", description: "Customer data platform.", vendor_url: "https://www.mparticle.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "ActionIQ", description: "Customer data platform for enterprise marketing.", vendor_url: "https://www.actioniq.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Conga", description: "Revenue lifecycle management: CPQ, CLM, document automation.", vendor_url: "https://conga.com", headquarters_country: "USA", notes: "Merged with Apttus 2020." },
  { vendor_name: "PROS", description: "Pricing optimisation and CPQ software.", vendor_url: "https://pros.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "DealHub", description: "Quote-to-revenue and CPQ platform.", vendor_url: "https://dealhub.io", headquarters_country: "Israel", notes: "" },
  { vendor_name: "Vendavo", description: "B2B pricing and CPQ software.", vendor_url: "https://www.vendavo.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Qlik", description: "Analytics and data integration platform.", vendor_url: "https://www.qlik.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Google", description: "Internet services and cloud platform.", vendor_url: "https://about.google", headquarters_country: "USA", notes: "Looker acquired 2019." },
  { vendor_name: "ThoughtSpot", description: "AI-augmented analytics and search-driven BI.", vendor_url: "https://www.thoughtspot.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Sigma Computing", description: "Cloud-native BI built on cloud data warehouses.", vendor_url: "https://www.sigmacomputing.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Sisense", description: "Embedded analytics and BI platform.", vendor_url: "https://www.sisense.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Domo", description: "Business cloud and BI platform.", vendor_url: "https://www.domo.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Strategy", description: "Analytics and BI vendor (formerly MicroStrategy).", vendor_url: "https://www.strategy.com", headquarters_country: "USA", notes: "Rebranded from MicroStrategy 2025." },
  { vendor_name: "Amazon Web Services", description: "Cloud computing services provider.", vendor_url: "https://aws.amazon.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Mattermost", description: "Open-source workstream collaboration platform.", vendor_url: "https://mattermost.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Rocket.Chat", description: "Open-source team chat and collaboration platform.", vendor_url: "https://www.rocket.chat", headquarters_country: "USA", notes: "" },
  { vendor_name: "Cisco", description: "Networking, security, and collaboration vendor.", vendor_url: "https://www.cisco.com", headquarters_country: "USA", notes: "Splunk acquired 2024 (Splunk continues to operate as the vendor)." },
  { vendor_name: "Zoom", description: "Video and team communications platform.", vendor_url: "https://www.zoom.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Vercel", description: "Frontend cloud platform for Next.js and modern web apps.", vendor_url: "https://vercel.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Render", description: "Cloud application platform for web services and workers.", vendor_url: "https://render.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Railway", description: "Infrastructure platform for application deployment.", vendor_url: "https://railway.app", headquarters_country: "USA", notes: "" },
  { vendor_name: "Fly.io", description: "Distributed application platform.", vendor_url: "https://fly.io", headquarters_country: "USA", notes: "" },
  { vendor_name: "DigitalOcean", description: "Cloud infrastructure provider with PaaS App Platform.", vendor_url: "https://www.digitalocean.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Netlify", description: "Frontend cloud platform for static sites and edge functions.", vendor_url: "https://www.netlify.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Sitecore", description: "Digital experience platform vendor.", vendor_url: "https://www.sitecore.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Liferay", description: "Open-source enterprise digital experience platform.", vendor_url: "https://www.liferay.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Acquia", description: "Digital experience platform built on Drupal.", vendor_url: "https://www.acquia.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Optimizely", description: "Digital experience platform and experimentation vendor.", vendor_url: "https://www.optimizely.com", headquarters_country: "USA", notes: "Episerver rebrand." },
  { vendor_name: "Bloomreach", description: "Commerce experience platform with CDP, CMS, and search.", vendor_url: "https://www.bloomreach.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "OpenText", description: "Enterprise information management vendor.", vendor_url: "https://www.opentext.com", headquarters_country: "Canada", notes: "" },
  { vendor_name: "Magnolia", description: "Headless CMS and digital experience platform.", vendor_url: "https://www.magnolia-cms.com", headquarters_country: "Switzerland", notes: "" },
  { vendor_name: "Marigold", description: "Cross-channel marketing and loyalty vendor.", vendor_url: "https://meetmarigold.com", headquarters_country: "USA", notes: "Formed from Cheetah Digital, Selligent, Campaign Monitor merger 2023." },
  { vendor_name: "Antavo", description: "Enterprise loyalty management platform.", vendor_url: "https://antavo.com", headquarters_country: "United Kingdom", notes: "" },
  { vendor_name: "Annex Cloud", description: "Customer loyalty platform.", vendor_url: "https://www.annexcloud.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "LoyaltyLion", description: "E-commerce loyalty and engagement platform.", vendor_url: "https://loyaltylion.com", headquarters_country: "United Kingdom", notes: "" },
  { vendor_name: "Yotpo", description: "E-commerce marketing platform with reviews, SMS, and loyalty.", vendor_url: "https://www.yotpo.com", headquarters_country: "USA", notes: "" },
];

// Vendors that already exist in the catalog and we just need to map by name when wiring solutions.
// (Salesforce Inc, Microsoft, Oracle, SAP SE, IBM, Freshworks, Splunk, etc.)

// Solutions. vendor_name is resolved at runtime.
type SolDef = {
  solution_name: string;
  vendor_name: string;
  description: string;
  solution_url: string;
  solution_type: "saas" | "on_prem" | "hybrid" | "open_source" | "internal_build" | "manual_process";
  is_active_in_market: boolean;
  notes: string;
  // domain_code -> coverage_level
  domains: Record<string, "primary" | "secondary" | "partial">;
};

const SF = "Salesforce Inc";

const SOLUTIONS: SolDef[] = [
  // -------- New Salesforce platform solutions --------
  { solution_name: "Salesforce Sales Cloud", vendor_name: SF, description: "Sales force automation: accounts, contacts, opportunities, forecasting, sales engagement.", solution_url: "https://www.salesforce.com/sales/", solution_type: "saas", is_active_in_market: true, notes: "", domains: { CRM: "primary", KMS: "secondary", CPQ: "partial" } },
  { solution_name: "Salesforce Marketing Cloud Engagement", vendor_name: SF, description: "B2C cross-channel marketing, journey orchestration, email/SMS/push, and analytics. Formerly ExactTarget.", solution_url: "https://www.salesforce.com/marketing/", solution_type: "saas", is_active_in_market: true, notes: "ExactTarget acquired 2013.", domains: { MA: "primary", CDP: "partial", LOYALTY: "partial" } },
  { solution_name: "Salesforce Marketing Cloud Account Engagement", vendor_name: SF, description: "B2B marketing automation, lead scoring, nurture programs. Formerly Pardot.", solution_url: "https://www.salesforce.com/marketing/b2b-automation/", solution_type: "saas", is_active_in_market: true, notes: "Pardot acquired 2013 (via ExactTarget).", domains: { MA: "primary", CRM: "partial" } },
  { solution_name: "Salesforce Commerce Cloud", vendor_name: SF, description: "B2C and B2B digital commerce: storefront, catalog, cart, checkout. Built on Demandware foundation.", solution_url: "https://www.salesforce.com/commerce/", solution_type: "saas", is_active_in_market: true, notes: "Demandware acquired 2016.", domains: { "B2C-COMM": "primary", OMS: "partial" } },
  { solution_name: "Salesforce Data Cloud", vendor_name: SF, description: "Real-time customer data platform unifying profiles and activating segments across Salesforce clouds.", solution_url: "https://www.salesforce.com/data/", solution_type: "saas", is_active_in_market: true, notes: "Formerly Customer 360 Audiences / CDP.", domains: { CDP: "primary", BI: "partial" } },
  { solution_name: "Salesforce Revenue Cloud", vendor_name: SF, description: "CPQ, billing, and revenue lifecycle management on the Salesforce platform.", solution_url: "https://www.salesforce.com/revenue/", solution_type: "saas", is_active_in_market: true, notes: "Includes Salesforce CPQ (formerly Steelbrick) and Billing.", domains: { CPQ: "primary", CLM: "partial" } },
  { solution_name: "Salesforce Experience Cloud", vendor_name: SF, description: "Digital experience platform for customer portals, partner communities, and branded sites.", solution_url: "https://www.salesforce.com/experience-cloud/", solution_type: "saas", is_active_in_market: true, notes: "Formerly Community Cloud.", domains: { DXP: "primary", KMS: "secondary" } },
  { solution_name: "Tableau", vendor_name: SF, description: "Self-service analytics and visual data exploration platform.", solution_url: "https://www.tableau.com", solution_type: "saas", is_active_in_market: true, notes: "Acquired by Salesforce 2019.", domains: { BI: "primary" } },
  { solution_name: "Salesforce CRM Analytics", vendor_name: SF, description: "Embedded analytics for Salesforce data, with Einstein AI insights. Formerly Tableau CRM / Einstein Analytics / Wave.", solution_url: "https://www.salesforce.com/analytics/crm-analytics/", solution_type: "saas", is_active_in_market: true, notes: "Renamed from Tableau CRM in 2022.", domains: { BI: "primary", CRM: "partial" } },
  { solution_name: "Slack", vendor_name: SF, description: "Channel-based messaging, huddles, and external collaboration for teams.", solution_url: "https://slack.com", solution_type: "saas", is_active_in_market: true, notes: "Acquired by Salesforce 2021.", domains: { WSC: "primary", KMS: "partial" } },
  { solution_name: "Heroku", vendor_name: SF, description: "Managed application platform for deploying apps via Git, with add-on marketplace.", solution_url: "https://www.heroku.com", solution_type: "saas", is_active_in_market: true, notes: "Acquired by Salesforce 2010.", domains: { "APP-PAAS": "primary" } },
  { solution_name: "Salesforce Financial Services Cloud", vendor_name: SF, description: "Vertical CRM for banking, wealth, and insurance with industry data model.", solution_url: "https://www.salesforce.com/financial-services/", solution_type: "saas", is_active_in_market: true, notes: "", domains: { CRM: "primary", "BANK-OPS": "secondary", "INS-CLAIMS": "secondary" } },
  { solution_name: "Salesforce Manufacturing Cloud", vendor_name: SF, description: "Vertical CRM for manufacturers: sales agreements, account-based forecasting, partner visibility.", solution_url: "https://www.salesforce.com/manufacturing/", solution_type: "saas", is_active_in_market: true, notes: "", domains: { CRM: "primary", "MFG-OPS": "secondary" } },
  { solution_name: "Salesforce Consumer Goods Cloud", vendor_name: SF, description: "Vertical CRM for CPG companies: retail execution, trade promotions, store visits.", solution_url: "https://www.salesforce.com/consumer-goods/", solution_type: "saas", is_active_in_market: true, notes: "", domains: { CRM: "primary", "RET-STORE": "secondary" } },
  { solution_name: "Salesforce Automotive Cloud", vendor_name: SF, description: "Vertical CRM for automotive OEMs, dealers, and captive finance: vehicle, driver, and lifecycle data.", solution_url: "https://www.salesforce.com/automotive/", solution_type: "saas", is_active_in_market: true, notes: "", domains: { CRM: "primary" } },
  { solution_name: "Salesforce Nonprofit Cloud", vendor_name: SF, description: "Vertical CRM for nonprofits: fundraising, programs, case management, grants.", solution_url: "https://www.salesforce.org/nonprofit/", solution_type: "saas", is_active_in_market: true, notes: "Built on the Nonprofit Success Pack legacy.", domains: { CRM: "primary" } },
  { solution_name: "Salesforce Education Cloud", vendor_name: SF, description: "Vertical CRM for higher-ed and K-12: recruitment, admissions, student success, alumni.", solution_url: "https://www.salesforce.org/education/", solution_type: "saas", is_active_in_market: true, notes: "Built on Education Data Architecture legacy.", domains: { CRM: "primary" } },
  { solution_name: "Salesforce Public Sector Solutions", vendor_name: SF, description: "Vertical CRM for government: licensing, permits, inspections, grants, case management.", solution_url: "https://www.salesforce.com/public-sector/", solution_type: "saas", is_active_in_market: true, notes: "", domains: { CRM: "primary", "PS-LIC": "secondary" } },
  { solution_name: "Salesforce Net Zero Cloud", vendor_name: SF, description: "Carbon accounting, ESG data management, and sustainability reporting on the Salesforce platform.", solution_url: "https://www.salesforce.com/sustainability/net-zero-cloud/", solution_type: "saas", is_active_in_market: true, notes: "", domains: { ESG: "primary" } },
  { solution_name: "Salesforce Loyalty Management", vendor_name: SF, description: "B2B and B2C loyalty programs: points, tiers, vouchers, member portals.", solution_url: "https://www.salesforce.com/marketing/loyalty/", solution_type: "saas", is_active_in_market: true, notes: "", domains: { LOYALTY: "primary", CRM: "partial" } },
  { solution_name: "Salesforce Agentforce", vendor_name: SF, description: "Autonomous AI agent platform on Salesforce, with Einstein generative AI across clouds.", solution_url: "https://www.salesforce.com/agentforce/", solution_type: "saas", is_active_in_market: true, notes: "Successor framing for Einstein 1 / Einstein Copilot 2024-2025.", domains: { "CONV-AI": "primary", CRM: "partial", CSM: "partial" } },

  // -------- CRM competitors --------
  { solution_name: "HubSpot Sales Hub", vendor_name: "HubSpot", description: "CRM and sales engagement for SMB and mid-market.", solution_url: "https://www.hubspot.com/products/sales", solution_type: "saas", is_active_in_market: true, notes: "", domains: { CRM: "primary" } },
  { solution_name: "Microsoft Dynamics 365 Sales", vendor_name: "Microsoft", description: "Sales force automation in the Dynamics 365 suite, tightly integrated with Microsoft 365.", solution_url: "https://www.microsoft.com/dynamics-365/products/sales", solution_type: "saas", is_active_in_market: true, notes: "", domains: { CRM: "primary" } },
  { solution_name: "Oracle Sales", vendor_name: "Oracle", description: "Sales force automation in the Oracle CX suite.", solution_url: "https://www.oracle.com/cx/sales/", solution_type: "saas", is_active_in_market: true, notes: "Formerly Oracle Sales Cloud / Siebel lineage.", domains: { CRM: "primary" } },
  { solution_name: "SAP Sales Cloud", vendor_name: "SAP SE", description: "Sales force automation in the SAP Customer Experience suite.", solution_url: "https://www.sap.com/products/crm/sales-cloud.html", solution_type: "saas", is_active_in_market: true, notes: "Formerly C4C / Hybris Cloud for Customer.", domains: { CRM: "primary" } },
  { solution_name: "Zoho CRM", vendor_name: "Zoho Corporation", description: "Sales force automation in the Zoho One suite.", solution_url: "https://www.zoho.com/crm/", solution_type: "saas", is_active_in_market: true, notes: "", domains: { CRM: "primary" } },
  { solution_name: "Pipedrive", vendor_name: "Pipedrive", description: "Visual sales pipeline CRM for SMB.", solution_url: "https://www.pipedrive.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { CRM: "primary" } },
  { solution_name: "SugarCRM", vendor_name: "SugarCRM", description: "Sales, marketing, and service automation.", solution_url: "https://www.sugarcrm.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { CRM: "primary" } },
  { solution_name: "Creatio Sales", vendor_name: "Creatio", description: "No-code CRM with BPM workflow.", solution_url: "https://www.creatio.com/sales", solution_type: "saas", is_active_in_market: true, notes: "", domains: { CRM: "primary" } },
  { solution_name: "Freshsales", vendor_name: "Freshworks", description: "AI-assisted sales CRM in the Freshworks suite.", solution_url: "https://www.freshworks.com/crm/sales/", solution_type: "saas", is_active_in_market: true, notes: "", domains: { CRM: "primary" } },

  // -------- MA competitors --------
  { solution_name: "Adobe Marketo Engage", vendor_name: "Adobe", description: "Enterprise B2B marketing automation.", solution_url: "https://business.adobe.com/products/marketo/adobe-marketo.html", solution_type: "saas", is_active_in_market: true, notes: "Marketo acquired by Adobe 2018.", domains: { MA: "primary" } },
  { solution_name: "Oracle Eloqua", vendor_name: "Oracle", description: "B2B marketing automation in the Oracle CX suite.", solution_url: "https://www.oracle.com/cx/marketing/automation/", solution_type: "saas", is_active_in_market: true, notes: "", domains: { MA: "primary" } },
  { solution_name: "HubSpot Marketing Hub", vendor_name: "HubSpot", description: "Inbound marketing automation for SMB and mid-market.", solution_url: "https://www.hubspot.com/products/marketing", solution_type: "saas", is_active_in_market: true, notes: "", domains: { MA: "primary" } },
  { solution_name: "Braze", vendor_name: "Braze", description: "Cross-channel customer engagement platform for B2C.", solution_url: "https://www.braze.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { MA: "primary" } },
  { solution_name: "Iterable", vendor_name: "Iterable", description: "Cross-channel marketing engagement platform.", solution_url: "https://iterable.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { MA: "primary" } },
  { solution_name: "Klaviyo", vendor_name: "Klaviyo", description: "Email and SMS marketing automation for e-commerce.", solution_url: "https://www.klaviyo.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { MA: "primary" } },

  // -------- B2C-COMM competitors --------
  { solution_name: "Shopify Plus", vendor_name: "Shopify", description: "Enterprise multi-channel commerce platform.", solution_url: "https://www.shopify.com/plus", solution_type: "saas", is_active_in_market: true, notes: "", domains: { "B2C-COMM": "primary" } },
  { solution_name: "Adobe Commerce", vendor_name: "Adobe", description: "B2C and B2B commerce platform.", solution_url: "https://business.adobe.com/products/magento/magento-commerce.html", solution_type: "saas", is_active_in_market: true, notes: "Magento acquired by Adobe 2018.", domains: { "B2C-COMM": "primary" } },
  { solution_name: "BigCommerce", vendor_name: "BigCommerce", description: "SaaS commerce platform for B2C and B2B.", solution_url: "https://www.bigcommerce.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { "B2C-COMM": "primary" } },
  { solution_name: "SAP Commerce Cloud", vendor_name: "SAP SE", description: "Enterprise B2B and B2C commerce platform.", solution_url: "https://www.sap.com/products/crm/e-commerce-platforms.html", solution_type: "saas", is_active_in_market: true, notes: "Hybris lineage.", domains: { "B2C-COMM": "primary" } },
  { solution_name: "commercetools Composable Commerce", vendor_name: "commercetools", description: "Headless, API-first commerce platform.", solution_url: "https://commercetools.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { "B2C-COMM": "primary" } },
  { solution_name: "Oracle Commerce", vendor_name: "Oracle", description: "B2C and B2B commerce platform in the Oracle CX suite.", solution_url: "https://www.oracle.com/cx/ecommerce/", solution_type: "saas", is_active_in_market: true, notes: "", domains: { "B2C-COMM": "primary" } },
  { solution_name: "VTEX Commerce Platform", vendor_name: "VTEX", description: "Composable commerce platform with OMS and marketplace.", solution_url: "https://vtex.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { "B2C-COMM": "primary", OMS: "partial" } },

  // -------- CDP competitors --------
  { solution_name: "Adobe Real-Time CDP", vendor_name: "Adobe", description: "Customer data platform with real-time profile and activation.", solution_url: "https://business.adobe.com/products/real-time-customer-data-platform/rtcdp.html", solution_type: "saas", is_active_in_market: true, notes: "", domains: { CDP: "primary" } },
  { solution_name: "Treasure Data CDP", vendor_name: "Treasure Data", description: "Enterprise customer data platform.", solution_url: "https://www.treasuredata.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { CDP: "primary" } },
  { solution_name: "Tealium AudienceStream", vendor_name: "Tealium", description: "Real-time customer data platform.", solution_url: "https://tealium.com/products/audiencestream-cdp/", solution_type: "saas", is_active_in_market: true, notes: "", domains: { CDP: "primary" } },
  { solution_name: "Twilio Segment", vendor_name: "Twilio", description: "Customer data platform for event collection and activation.", solution_url: "https://segment.com", solution_type: "saas", is_active_in_market: true, notes: "Acquired by Twilio 2020.", domains: { CDP: "primary" } },
  { solution_name: "mParticle CDP", vendor_name: "mParticle", description: "Customer data platform for mobile and digital products.", solution_url: "https://www.mparticle.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { CDP: "primary" } },
  { solution_name: "ActionIQ CX Hub", vendor_name: "ActionIQ", description: "Composable CDP for enterprise marketing.", solution_url: "https://www.actioniq.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { CDP: "primary" } },

  // -------- CPQ competitors --------
  { solution_name: "Conga CPQ", vendor_name: "Conga", description: "Configure-price-quote for complex selling.", solution_url: "https://conga.com/products/conga-cpq", solution_type: "saas", is_active_in_market: true, notes: "Apttus CPQ lineage.", domains: { CPQ: "primary" } },
  { solution_name: "PROS Smart CPQ", vendor_name: "PROS", description: "AI-driven CPQ and price optimisation.", solution_url: "https://pros.com/products/cpq-software/", solution_type: "saas", is_active_in_market: true, notes: "", domains: { CPQ: "primary" } },
  { solution_name: "Oracle CPQ", vendor_name: "Oracle", description: "Configure-price-quote in the Oracle CX suite.", solution_url: "https://www.oracle.com/cx/sales/cpq/", solution_type: "saas", is_active_in_market: true, notes: "BigMachines lineage.", domains: { CPQ: "primary" } },
  { solution_name: "SAP CPQ", vendor_name: "SAP SE", description: "Configure-price-quote in SAP Customer Experience.", solution_url: "https://www.sap.com/products/crm/cpq.html", solution_type: "saas", is_active_in_market: true, notes: "CallidusCloud lineage.", domains: { CPQ: "primary" } },
  { solution_name: "DealHub CPQ", vendor_name: "DealHub", description: "Quote-to-revenue CPQ and CLM.", solution_url: "https://dealhub.io", solution_type: "saas", is_active_in_market: true, notes: "", domains: { CPQ: "primary", CLM: "partial" } },
  { solution_name: "Vendavo CPQ", vendor_name: "Vendavo", description: "B2B CPQ and price management.", solution_url: "https://www.vendavo.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { CPQ: "primary" } },

  // -------- BI competitors --------
  { solution_name: "Microsoft Power BI", vendor_name: "Microsoft", description: "Self-service BI and embedded analytics in the Microsoft Fabric stack.", solution_url: "https://www.microsoft.com/power-platform/products/power-bi", solution_type: "saas", is_active_in_market: true, notes: "", domains: { BI: "primary" } },
  { solution_name: "Qlik Sense", vendor_name: "Qlik", description: "Associative analytics and BI platform.", solution_url: "https://www.qlik.com/products/qlik-sense", solution_type: "saas", is_active_in_market: true, notes: "", domains: { BI: "primary" } },
  { solution_name: "Looker", vendor_name: "Google", description: "Modeled BI platform on cloud data warehouses.", solution_url: "https://cloud.google.com/looker", solution_type: "saas", is_active_in_market: true, notes: "Acquired by Google 2019.", domains: { BI: "primary" } },
  { solution_name: "ThoughtSpot", vendor_name: "ThoughtSpot", description: "AI-augmented search-driven analytics.", solution_url: "https://www.thoughtspot.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { BI: "primary" } },
  { solution_name: "Sigma", vendor_name: "Sigma Computing", description: "Cloud-native BI on data warehouses with spreadsheet UX.", solution_url: "https://www.sigmacomputing.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { BI: "primary" } },
  { solution_name: "Sisense", vendor_name: "Sisense", description: "Embedded analytics and BI.", solution_url: "https://www.sisense.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { BI: "primary" } },
  { solution_name: "Domo", vendor_name: "Domo", description: "Business cloud and BI platform.", solution_url: "https://www.domo.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { BI: "primary" } },
  { solution_name: "Strategy One", vendor_name: "Strategy", description: "Enterprise analytics and BI platform.", solution_url: "https://www.strategy.com", solution_type: "saas", is_active_in_market: true, notes: "Formerly MicroStrategy.", domains: { BI: "primary" } },
  { solution_name: "AWS QuickSight", vendor_name: "Amazon Web Services", description: "Serverless BI service.", solution_url: "https://aws.amazon.com/quicksight/", solution_type: "saas", is_active_in_market: true, notes: "", domains: { BI: "primary" } },
  { solution_name: "IBM Cognos Analytics", vendor_name: "IBM", description: "Enterprise BI and reporting.", solution_url: "https://www.ibm.com/products/cognos-analytics", solution_type: "saas", is_active_in_market: true, notes: "", domains: { BI: "primary" } },

  // -------- WSC competitors --------
  { solution_name: "Microsoft Teams", vendor_name: "Microsoft", description: "Chat, meetings, calling, and collaboration in Microsoft 365.", solution_url: "https://www.microsoft.com/microsoft-teams/", solution_type: "saas", is_active_in_market: true, notes: "", domains: { WSC: "primary" } },
  { solution_name: "Google Chat", vendor_name: "Google", description: "Channel-based messaging in Google Workspace.", solution_url: "https://workspace.google.com/products/chat/", solution_type: "saas", is_active_in_market: true, notes: "", domains: { WSC: "primary" } },
  { solution_name: "Mattermost", vendor_name: "Mattermost", description: "Self-hosted open-source workstream collaboration.", solution_url: "https://mattermost.com", solution_type: "hybrid", is_active_in_market: true, notes: "", domains: { WSC: "primary" } },
  { solution_name: "Rocket.Chat", vendor_name: "Rocket.Chat", description: "Open-source team chat and collaboration.", solution_url: "https://www.rocket.chat", solution_type: "hybrid", is_active_in_market: true, notes: "", domains: { WSC: "primary" } },
  { solution_name: "Cisco Webex", vendor_name: "Cisco", description: "Calling, meetings, and team messaging.", solution_url: "https://www.webex.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { WSC: "primary" } },
  { solution_name: "Zoom Team Chat", vendor_name: "Zoom", description: "Persistent chat alongside Zoom meetings.", solution_url: "https://www.zoom.com/products/team-chat", solution_type: "saas", is_active_in_market: true, notes: "", domains: { WSC: "primary" } },

  // -------- APP-PAAS competitors --------
  { solution_name: "AWS Elastic Beanstalk", vendor_name: "Amazon Web Services", description: "Managed application platform on AWS.", solution_url: "https://aws.amazon.com/elasticbeanstalk/", solution_type: "saas", is_active_in_market: true, notes: "", domains: { "APP-PAAS": "primary" } },
  { solution_name: "Azure App Service", vendor_name: "Microsoft", description: "Managed application platform on Azure.", solution_url: "https://azure.microsoft.com/products/app-service/", solution_type: "saas", is_active_in_market: true, notes: "", domains: { "APP-PAAS": "primary" } },
  { solution_name: "Google App Engine", vendor_name: "Google", description: "Managed application platform on Google Cloud.", solution_url: "https://cloud.google.com/appengine", solution_type: "saas", is_active_in_market: true, notes: "", domains: { "APP-PAAS": "primary" } },
  { solution_name: "Vercel", vendor_name: "Vercel", description: "Frontend cloud platform for Next.js and modern web apps.", solution_url: "https://vercel.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { "APP-PAAS": "primary" } },
  { solution_name: "Render", vendor_name: "Render", description: "Cloud platform for web services, workers, and databases.", solution_url: "https://render.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { "APP-PAAS": "primary" } },
  { solution_name: "Railway", vendor_name: "Railway", description: "Infrastructure-as-a-service for application deployment.", solution_url: "https://railway.app", solution_type: "saas", is_active_in_market: true, notes: "", domains: { "APP-PAAS": "primary" } },
  { solution_name: "Fly.io", vendor_name: "Fly.io", description: "Distributed application platform with global deployment.", solution_url: "https://fly.io", solution_type: "saas", is_active_in_market: true, notes: "", domains: { "APP-PAAS": "primary" } },
  { solution_name: "DigitalOcean App Platform", vendor_name: "DigitalOcean", description: "Managed PaaS for application deployment.", solution_url: "https://www.digitalocean.com/products/app-platform", solution_type: "saas", is_active_in_market: true, notes: "", domains: { "APP-PAAS": "primary" } },
  { solution_name: "Netlify", vendor_name: "Netlify", description: "Frontend cloud platform for static sites and edge functions.", solution_url: "https://www.netlify.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { "APP-PAAS": "primary" } },

  // -------- DXP competitors --------
  { solution_name: "Adobe Experience Manager", vendor_name: "Adobe", description: "Web content management and digital asset management.", solution_url: "https://business.adobe.com/products/experience-manager/adobe-experience-manager.html", solution_type: "saas", is_active_in_market: true, notes: "", domains: { DXP: "primary" } },
  { solution_name: "Sitecore XM Cloud", vendor_name: "Sitecore", description: "Composable headless DXP.", solution_url: "https://www.sitecore.com/products/xm-cloud", solution_type: "saas", is_active_in_market: true, notes: "", domains: { DXP: "primary" } },
  { solution_name: "Liferay DXP", vendor_name: "Liferay", description: "Enterprise digital experience platform with portal heritage.", solution_url: "https://www.liferay.com/products/dxp", solution_type: "hybrid", is_active_in_market: true, notes: "", domains: { DXP: "primary" } },
  { solution_name: "Acquia DXP", vendor_name: "Acquia", description: "DXP built on Drupal with CDP and personalisation.", solution_url: "https://www.acquia.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { DXP: "primary" } },
  { solution_name: "Optimizely DXP", vendor_name: "Optimizely", description: "DXP with CMS, commerce, and experimentation.", solution_url: "https://www.optimizely.com", solution_type: "saas", is_active_in_market: true, notes: "Episerver lineage.", domains: { DXP: "primary" } },
  { solution_name: "Bloomreach Engagement", vendor_name: "Bloomreach", description: "Commerce experience cloud with CDP, content, and search.", solution_url: "https://www.bloomreach.com", solution_type: "saas", is_active_in_market: true, notes: "Exponea lineage.", domains: { DXP: "primary", CDP: "partial" } },
  { solution_name: "OpenText TeamSite", vendor_name: "OpenText", description: "Enterprise web content management.", solution_url: "https://www.opentext.com/products/teamsite", solution_type: "hybrid", is_active_in_market: true, notes: "", domains: { DXP: "primary" } },
  { solution_name: "Magnolia DXP", vendor_name: "Magnolia", description: "Headless CMS and DXP.", solution_url: "https://www.magnolia-cms.com", solution_type: "hybrid", is_active_in_market: true, notes: "", domains: { DXP: "primary" } },

  // -------- LOYALTY competitors --------
  { solution_name: "SAP Emarsys Loyalty", vendor_name: "SAP SE", description: "Customer loyalty within SAP Emarsys customer engagement.", solution_url: "https://emarsys.com/learn/blog/loyalty/", solution_type: "saas", is_active_in_market: true, notes: "", domains: { LOYALTY: "primary" } },
  { solution_name: "Marigold Loyalty", vendor_name: "Marigold", description: "Loyalty and engagement platform (Cheetah Digital lineage).", solution_url: "https://meetmarigold.com/loyalty/", solution_type: "saas", is_active_in_market: true, notes: "", domains: { LOYALTY: "primary" } },
  { solution_name: "Antavo Loyalty Cloud", vendor_name: "Antavo", description: "Enterprise loyalty management.", solution_url: "https://antavo.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { LOYALTY: "primary" } },
  { solution_name: "Annex Cloud Loyalty Experience", vendor_name: "Annex Cloud", description: "Loyalty experience platform.", solution_url: "https://www.annexcloud.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { LOYALTY: "primary" } },
  { solution_name: "LoyaltyLion", vendor_name: "LoyaltyLion", description: "E-commerce loyalty and engagement.", solution_url: "https://loyaltylion.com", solution_type: "saas", is_active_in_market: true, notes: "", domains: { LOYALTY: "primary" } },
  { solution_name: "Yotpo Loyalty & Referrals", vendor_name: "Yotpo", description: "E-commerce loyalty and referrals platform.", solution_url: "https://www.yotpo.com/platform/loyalty/", solution_type: "saas", is_active_in_market: true, notes: "", domains: { LOYALTY: "primary" } },
];

// ------------------------------ MAIN ------------------------------

async function main() {
  console.log("=== Salesforce platform expansion loader ===");

  // 1. Domains
  console.log("\n[1/4] Domains");
  const existingDomains = await get("/domains?select=id,domain_code");
  const domainByCode = new Map<string, number>();
  for (const r of existingDomains) domainByCode.set(r.domain_code as string, r.id as number);
  const missingDomains = DOMAINS.filter((d) => !domainByCode.has(d.domain_code));
  console.log(`  existing=${domainByCode.size}, to insert=${missingDomains.length}`);
  if (missingDomains.length) {
    const inserted = await post("/domains", missingDomains);
    for (const r of inserted) domainByCode.set(r.domain_code as string, r.id as number);
    console.log(`  inserted ${inserted.length} domains`);
  }

  // 2. Vendors
  console.log("\n[2/4] Vendors");
  const existingVendors = await get("/vendors?select=id,vendor_name");
  const vendorByName = new Map<string, number>();
  for (const r of existingVendors) vendorByName.set(r.vendor_name as string, r.id as number);
  const missingVendors = VENDORS.filter((v) => !vendorByName.has(v.vendor_name));
  console.log(`  existing=${vendorByName.size}, to insert=${missingVendors.length}`);
  if (missingVendors.length) {
    const inserted = await post("/vendors", missingVendors);
    for (const r of inserted) vendorByName.set(r.vendor_name as string, r.id as number);
    console.log(`  inserted ${inserted.length} vendors`);
  }

  // 3. Solutions
  console.log("\n[3/4] Solutions");
  const existingSolutions = await get("/solutions?select=id,solution_name");
  const solByName = new Map<string, number>();
  for (const r of existingSolutions) solByName.set(r.solution_name as string, r.id as number);
  const missingSolutions = SOLUTIONS.filter((s) => !solByName.has(s.solution_name));
  console.log(`  existing=${solByName.size}, to insert=${missingSolutions.length}`);
  // Resolve vendor_id; fail loudly if vendor missing
  const solRows = missingSolutions.map((s) => {
    const vid = vendorByName.get(s.vendor_name);
    if (!vid) throw new Error(`unknown vendor: ${s.vendor_name} for solution ${s.solution_name}`);
    const { domains, vendor_name, ...rest } = s;
    return { ...rest, vendor_id: vid };
  });
  if (solRows.length) {
    const inserted = await post("/solutions", solRows);
    for (const r of inserted) solByName.set(r.solution_name as string, r.id as number);
    console.log(`  inserted ${inserted.length} solutions`);
  }

  // 4. solution_domains edges
  console.log("\n[4/4] solution_domains edges");
  const desiredEdges: Array<{ solution_id: number; domain_id: number; coverage_level: string; notes: string }> = [];
  for (const s of SOLUTIONS) {
    const sid = solByName.get(s.solution_name);
    if (!sid) throw new Error(`missing solution id for ${s.solution_name}`);
    for (const [code, lvl] of Object.entries(s.domains)) {
      const did = domainByCode.get(code);
      if (!did) throw new Error(`missing domain ${code} for solution ${s.solution_name}`);
      desiredEdges.push({ solution_id: sid, domain_id: did, coverage_level: lvl, notes: "" });
    }
  }

  // Fetch existing edges only for the solutions we touch
  const solIds = Array.from(new Set(desiredEdges.map((e) => e.solution_id)));
  const existingEdges = await get(
    `/solution_domains?solution_id=in.(${solIds.join(",")})&select=solution_id,domain_id`,
  );
  const haveEdge = new Set<string>();
  for (const e of existingEdges) haveEdge.add(`${e.solution_id}|${e.domain_id}`);

  const missingEdges = desiredEdges.filter((e) => !haveEdge.has(`${e.solution_id}|${e.domain_id}`));
  console.log(`  desired=${desiredEdges.length}, existing=${existingEdges.length}, to insert=${missingEdges.length}`);
  if (missingEdges.length) {
    const inserted = await post("/solution_domains", missingEdges);
    console.log(`  inserted ${inserted.length} edges`);
  }

  console.log("\n=== Done ===");
  console.log("UI:");
  console.log("  https://tests.semantius.app/domain_map/domains");
  console.log("  https://tests.semantius.app/domain_map/vendors");
  console.log("  https://tests.semantius.app/domain_map/solutions");
  console.log("  https://tests.semantius.app/domain_map/solution_domains");
}

main().catch((e) => {
  console.error("LOADER FAILED:", e.message);
  process.exit(1);
});
