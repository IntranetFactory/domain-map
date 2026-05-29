#!/usr/bin/env bun
// Loads the Social Media Management (SMM) market into the domain_map module:
// 1 domain (SMM, sibling of MA under CRM), 9 new vendors (+ HubSpot, Salesforce
// Inc, Zoho Corporation reused), 12 solutions, 7 capabilities, and the
// supporting junctions (solution_domains, capability_domains, solution_capabilities).
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
// DOMAIN — SMM as a sibling of MA (id 70) under CRM (id 69)
// ============================================================
const CRM_DOMAIN_ID = 69;
const newDomains = [
  {
    domain_code: "SMM",
    domain_name: "Social Media Management",
    parent_domain_id: CRM_DOMAIN_ID,
    description:
      "Cross-channel social media publishing, scheduling, engagement (unified inbox), listening, analytics, and influencer/advocacy programs. Vendors compete around managing brand presence across Facebook, Instagram, LinkedIn, X/Twitter, TikTok, YouTube, Pinterest, and Reddit. Distinct from MA (lifecycle marketing automation), CDP (customer data unification), and SALES-ENG (1:1 outbound sales engagement). Pure-play vendors: Hootsuite, Sprout Social, Sprinklr, Khoros, Buffer, Agorapulse, Meltwater, Brandwatch (Cision), Emplifi, Zoho Social. Adjacent suites with partial coverage: HubSpot Marketing Hub, Salesforce Marketing Cloud Engagement (Social Studio largely sunset in 2024).",
  },
];

// ============================================================
// CAPABILITIES (under SMM)
// ============================================================
const capabilities = [
  {
    capability_code: "SOCIAL-PUB",
    capability_name: "Social Media Publishing",
    domain: "SMM",
    description:
      "Authoring, scheduling, and publishing posts across multiple social channels (Facebook, Instagram, LinkedIn, X/Twitter, TikTok, YouTube, Pinterest) from a unified queue or calendar, with approval workflow, post variants per channel, and bulk-upload capabilities.",
  },
  {
    capability_code: "SOCIAL-ENGAGE",
    capability_name: "Social Media Engagement",
    domain: "SMM",
    description:
      "Unified inbox for comments, mentions, direct messages, and reviews across social channels, with team assignment, SLA tracking, canned responses, and conversation history per contact.",
  },
  {
    capability_code: "SOCIAL-LISTEN",
    capability_name: "Social Listening",
    domain: "SMM",
    description:
      "Monitoring of brand mentions, keywords, competitor activity, hashtags, and sentiment across social networks, news, blogs, forums, and review sites, with topic clustering and alerting.",
  },
  {
    capability_code: "SOCIAL-ANALYTICS",
    capability_name: "Social Media Analytics",
    domain: "SMM",
    description:
      "Engagement, reach, impressions, follower growth, share-of-voice, conversion, and competitive performance reporting across channels and campaigns, with custom dashboards and scheduled exports.",
  },
  {
    capability_code: "CONTENT-CAL",
    capability_name: "Content Calendar Planning",
    domain: "SMM",
    description:
      "Editorial calendar for cross-team content planning across campaigns, channels, and content types, with asset library, multi-stage approval workflow, and stakeholder collaboration.",
  },
  {
    capability_code: "INFLUENCER-MGMT",
    capability_name: "Influencer Management",
    domain: "SMM",
    description:
      "Discovery, vetting, contracting, briefing, content review, payment, and measurement of influencer and creator partnerships, including audience-overlap analysis, fraud detection, and UGC campaign management.",
  },
  {
    capability_code: "EMPLOYEE-ADVOCACY",
    capability_name: "Employee Advocacy",
    domain: "SMM",
    description:
      "Curation of brand-safe content for employees to share on personal social channels, with gamification, leaderboards, share tracking, and earned-media valuation. A distinct micro-market (Hootsuite Amplify, Sprout Social Bambu, Sociabble, EveryoneSocial) bundled into broader SMM suites.",
  },
];

// ============================================================
// VENDORS (HubSpot, Salesforce Inc, Zoho Corporation already exist)
// ============================================================
const vendors = [
  {
    vendor_name: "Hootsuite Inc",
    vendor_url: "https://www.hootsuite.com",
    headquarters_country: "Canada",
    description: "Social media management platform vendor.",
    notes:
      "Founded 2008, HQ Vancouver. Acquired Talkwalker in 2024, folding Talkwalker's social listening into the Hootsuite suite. Owns Hootsuite Amplify (employee advocacy). Backed by Onex.",
  },
  {
    vendor_name: "Sprout Social Inc",
    vendor_url: "https://sproutsocial.com",
    headquarters_country: "USA",
    description: "Social media management and customer-experience platform vendor.",
    notes:
      "Founded 2010, HQ Chicago. NASDAQ: SPT (IPO 2019). Acquired Simply Measured (2017), Bambu (employee advocacy, integrated as a Sprout module), and Tagger Media (influencer marketing, 2023).",
  },
  {
    vendor_name: "Buffer Inc",
    vendor_url: "https://buffer.com",
    headquarters_country: "USA",
    description: "Lightweight social media publishing and analytics vendor.",
    notes:
      "Founded 2010, fully remote. Independent, profitable, bootstrapped after early VC. Publishing-led product; lighter on engagement/listening than enterprise suites.",
  },
  {
    vendor_name: "Sprinklr Inc",
    vendor_url: "https://www.sprinklr.com",
    headquarters_country: "USA",
    description: "Unified customer-experience management (Unified-CXM) platform vendor; SMM is its flagship module alongside Service, Insights, and Marketing.",
    notes:
      "Founded 2009, HQ New York. NYSE: CXM (IPO 2021). Enterprise focus; Sprinklr Social is the SMM module, alongside Sprinklr Service (CSM) and Sprinklr Insights (listening).",
  },
  {
    vendor_name: "Khoros LLC",
    vendor_url: "https://khoros.com",
    headquarters_country: "USA",
    description: "Customer-engagement platform vendor covering social media management, community, and digital customer service.",
    notes:
      "Formed in 2019 from the merger of Spredfast and Lithium under Vista Equity Partners. Headquartered in Austin. Khoros Marketing covers SMM; Khoros Care covers digital customer service; Khoros Communities runs branded community platforms.",
  },
  {
    vendor_name: "Agorapulse",
    vendor_url: "https://www.agorapulse.com",
    headquarters_country: "France",
    description: "Mid-market social media management platform vendor.",
    notes:
      "Founded 2011, HQ Paris with offices in the US. Independent. Positions on social inbox, publishing, and reporting for SMB and mid-market teams.",
  },
  {
    vendor_name: "Meltwater",
    vendor_url: "https://www.meltwater.com",
    headquarters_country: "Norway",
    description: "Media intelligence and social listening platform vendor.",
    notes:
      "Founded 2001 in Oslo, HQ now San Francisco. Acquired Klear in 2021 (influencer marketing) and Linkfluence in 2021 (social listening). Strong on listening, PR/media monitoring, and influencer; lighter on day-to-day publishing.",
  },
  {
    vendor_name: "Cision Ltd",
    vendor_url: "https://www.cision.com",
    headquarters_country: "USA",
    description: "PR, media monitoring, and social intelligence vendor; parent of Brandwatch and Falcon.io.",
    notes:
      "HQ Chicago. Acquired Brandwatch in 2021 (which had itself merged with Falcon.io in 2020). Owned by Platinum Equity. Brandwatch is Cision's flagship consumer-intelligence and SMM product.",
  },
  {
    vendor_name: "Emplifi",
    vendor_url: "https://emplifi.io",
    headquarters_country: "Czech Republic",
    description: "Customer-experience and social marketing platform vendor.",
    notes:
      "Formed in 2021 from the merger of Astute Solutions and Socialbakers under Audax Private Equity. HQ Prague and Columbus OH. Emplifi Social Marketing Cloud covers SMM; Emplifi Service covers digital CX/CSM.",
  },
];

// ============================================================
// SOLUTIONS (with primary/secondary/partial domain assignments)
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
  {
    solution_name: "Hootsuite",
    vendor: "Hootsuite Inc",
    solution_type: "saas",
    description:
      "Flagship social media management platform: publishing across channels, unified inbox, social listening (post-Talkwalker), analytics, content calendar, and employee advocacy via Hootsuite Amplify.",
    notes: "Talkwalker capabilities folded in after the 2024 acquisition; Hootsuite Amplify is the bundled advocacy module.",
    primary: ["SMM"],
  },
  {
    solution_name: "Sprout Social",
    vendor: "Sprout Social Inc",
    solution_type: "saas",
    description:
      "Full-suite SMM platform: Smart Inbox for engagement, publishing calendar, listening, reporting, influencer (via Tagger), and employee advocacy (via Bambu).",
    notes: "Tagger Media (acquired 2023) provides influencer; Bambu provides advocacy as a Sprout module.",
    primary: ["SMM"],
  },
  {
    solution_name: "Buffer",
    vendor: "Buffer Inc",
    solution_type: "saas",
    description:
      "Publishing-led SMM tool: scheduling, content calendar, basic engagement and analytics across major social channels. Strong SMB positioning.",
    primary: ["SMM"],
  },
  {
    solution_name: "Sprinklr Social",
    vendor: "Sprinklr Inc",
    solution_type: "saas",
    description:
      "Enterprise SMM module of the Sprinklr Unified-CXM platform: publishing, engagement, listening, analytics, content governance, influencer marketing, and employee advocacy.",
    notes: "Part of the broader Sprinklr suite (Service for CSM, Insights for listening, Marketing for campaigns); modeled here only on SMM coverage. Sprinklr Service and Sprinklr Insights to be added in a later load.",
    primary: ["SMM"],
  },
  {
    solution_name: "Khoros Marketing",
    vendor: "Khoros LLC",
    solution_type: "saas",
    description:
      "Enterprise SMM platform combining publishing, engagement, listening, analytics, and content governance for large-brand social-marketing teams.",
    notes: "Built on the merged Spredfast (publishing) and Lithium (engagement) lineage. Khoros Care (digital customer service) and Khoros Communities are separate products to be added later.",
    primary: ["SMM"],
  },
  {
    solution_name: "Agorapulse",
    vendor: "Agorapulse",
    solution_type: "saas",
    description:
      "Mid-market SMM platform: publishing, unified inbox, reporting, and team collaboration for SMB and mid-market social teams.",
    primary: ["SMM"],
  },
  {
    solution_name: "Meltwater",
    vendor: "Meltwater",
    solution_type: "saas",
    description:
      "Media intelligence and social listening platform with adjacent publishing, engagement, and influencer marketing (post-Klear acquisition).",
    notes: "Listening-led positioning; publishing/engagement are present but lighter than pure-play SMM suites.",
    primary: ["SMM"],
  },
  {
    solution_name: "Brandwatch",
    vendor: "Cision Ltd",
    solution_type: "saas",
    description:
      "Consumer intelligence, social listening, and social media management platform combining the legacy Brandwatch listening product with Falcon.io publishing and engagement; Brandwatch Influence covers influencer marketing.",
    notes: "Brandwatch and Falcon.io merged in 2020, then acquired by Cision in 2021. Strong on listening; competitive on publishing/engagement after the Falcon.io integration.",
    primary: ["SMM"],
  },
  {
    solution_name: "Emplifi Social Marketing Cloud",
    vendor: "Emplifi",
    solution_type: "saas",
    description:
      "Social marketing platform covering publishing, community management, listening, analytics, and influencer marketing for enterprise brands.",
    notes: "Originated as Socialbakers; rebranded under Emplifi after the Astute + Socialbakers merger in 2021.",
    primary: ["SMM"],
  },
  {
    solution_name: "Zoho Social",
    vendor: "Zoho Corporation",
    solution_type: "saas",
    description:
      "SMB and mid-market SMM tool within the Zoho suite: publishing, monitoring, basic listening, reporting, and CRM integration.",
    notes: "Strong fit for existing Zoho customers (CRM, Desk, Campaigns) at SMB/mid-market scale.",
    primary: ["SMM"],
  },
  // ===== Existing solutions — added as partial SMM coverage on top of existing primary MA coverage =====
  {
    solution_name: "HubSpot Marketing Hub",
    vendor: "HubSpot",
    solution_type: "saas",
    description:
      "HubSpot's marketing automation suite; Social Tools module provides multi-channel publishing, basic monitoring, and reporting alongside the broader MA functionality.",
    notes: "Existing solution (id 327); this load only adds the SMM partial coverage link, not a duplicate solution row.",
    partial: ["SMM"],
  },
  {
    solution_name: "Salesforce Marketing Cloud Engagement",
    vendor: "Salesforce Inc",
    solution_type: "saas",
    description:
      "Salesforce's marketing cloud platform for cross-channel campaigns. Social Studio was largely sunset by Salesforce in 2024; SMM coverage is now via partner integrations and what remains in Marketing Cloud's content/analytics tooling.",
    notes: "Existing solution (id 296); this load only adds the SMM partial coverage link.",
    partial: ["SMM"],
  },
];

// ============================================================
// SOLUTION_CAPABILITIES (delivery_strength per solution × capability)
// ============================================================
// Strength legend: native = first-class supported feature; partial = supported but lightweight;
// via_extension = via integration / marketplace add-on; not_supported = absent.
type SolCapSpec = {
  solution: string;
  capability: string;
  delivery_strength: "native" | "partial" | "via_extension" | "not_supported";
  notes?: string;
};
const solCaps: SolCapSpec[] = [
  // Hootsuite — full suite; listening reinforced by Talkwalker
  { solution: "Hootsuite", capability: "SOCIAL-PUB", delivery_strength: "native" },
  { solution: "Hootsuite", capability: "SOCIAL-ENGAGE", delivery_strength: "native" },
  { solution: "Hootsuite", capability: "SOCIAL-LISTEN", delivery_strength: "native", notes: "Talkwalker capabilities folded in after 2024 acquisition." },
  { solution: "Hootsuite", capability: "SOCIAL-ANALYTICS", delivery_strength: "native" },
  { solution: "Hootsuite", capability: "CONTENT-CAL", delivery_strength: "native" },
  { solution: "Hootsuite", capability: "INFLUENCER-MGMT", delivery_strength: "partial", notes: "Creator/UGC workflows; less depth than Tagger/Brandwatch Influence." },
  { solution: "Hootsuite", capability: "EMPLOYEE-ADVOCACY", delivery_strength: "native", notes: "Hootsuite Amplify is the bundled advocacy module." },

  // Sprout Social — full suite; influencer via Tagger; advocacy via Bambu
  { solution: "Sprout Social", capability: "SOCIAL-PUB", delivery_strength: "native" },
  { solution: "Sprout Social", capability: "SOCIAL-ENGAGE", delivery_strength: "native", notes: "Smart Inbox is the flagship surface." },
  { solution: "Sprout Social", capability: "SOCIAL-LISTEN", delivery_strength: "native" },
  { solution: "Sprout Social", capability: "SOCIAL-ANALYTICS", delivery_strength: "native" },
  { solution: "Sprout Social", capability: "CONTENT-CAL", delivery_strength: "native" },
  { solution: "Sprout Social", capability: "INFLUENCER-MGMT", delivery_strength: "native", notes: "Tagger Media (acquired 2023) integrated as the influencer module." },
  { solution: "Sprout Social", capability: "EMPLOYEE-ADVOCACY", delivery_strength: "native", notes: "Bambu by Sprout Social is the advocacy module." },

  // Buffer — publishing-first, lighter on the rest
  { solution: "Buffer", capability: "SOCIAL-PUB", delivery_strength: "native", notes: "Publishing/queue is the flagship surface." },
  { solution: "Buffer", capability: "SOCIAL-ENGAGE", delivery_strength: "partial", notes: "Replies and comment management present but limited vs full-suite inboxes." },
  { solution: "Buffer", capability: "SOCIAL-LISTEN", delivery_strength: "not_supported" },
  { solution: "Buffer", capability: "SOCIAL-ANALYTICS", delivery_strength: "native", notes: "Performance reporting available; lighter than enterprise analytics." },
  { solution: "Buffer", capability: "CONTENT-CAL", delivery_strength: "native" },
  { solution: "Buffer", capability: "INFLUENCER-MGMT", delivery_strength: "not_supported" },
  { solution: "Buffer", capability: "EMPLOYEE-ADVOCACY", delivery_strength: "not_supported" },

  // Sprinklr Social — enterprise full suite
  { solution: "Sprinklr Social", capability: "SOCIAL-PUB", delivery_strength: "native" },
  { solution: "Sprinklr Social", capability: "SOCIAL-ENGAGE", delivery_strength: "native" },
  { solution: "Sprinklr Social", capability: "SOCIAL-LISTEN", delivery_strength: "native", notes: "Tightly integrated with Sprinklr Insights." },
  { solution: "Sprinklr Social", capability: "SOCIAL-ANALYTICS", delivery_strength: "native" },
  { solution: "Sprinklr Social", capability: "CONTENT-CAL", delivery_strength: "native" },
  { solution: "Sprinklr Social", capability: "INFLUENCER-MGMT", delivery_strength: "native", notes: "Sprinklr Influencer Marketing module." },
  { solution: "Sprinklr Social", capability: "EMPLOYEE-ADVOCACY", delivery_strength: "native", notes: "Sprinklr Employee Advocacy module." },

  // Khoros Marketing — enterprise; advocacy not in scope of Marketing product
  { solution: "Khoros Marketing", capability: "SOCIAL-PUB", delivery_strength: "native" },
  { solution: "Khoros Marketing", capability: "SOCIAL-ENGAGE", delivery_strength: "native" },
  { solution: "Khoros Marketing", capability: "SOCIAL-LISTEN", delivery_strength: "native" },
  { solution: "Khoros Marketing", capability: "SOCIAL-ANALYTICS", delivery_strength: "native" },
  { solution: "Khoros Marketing", capability: "CONTENT-CAL", delivery_strength: "native" },
  { solution: "Khoros Marketing", capability: "INFLUENCER-MGMT", delivery_strength: "partial" },
  { solution: "Khoros Marketing", capability: "EMPLOYEE-ADVOCACY", delivery_strength: "not_supported" },

  // Agorapulse — mid-market
  { solution: "Agorapulse", capability: "SOCIAL-PUB", delivery_strength: "native" },
  { solution: "Agorapulse", capability: "SOCIAL-ENGAGE", delivery_strength: "native", notes: "Unified inbox is a flagship surface." },
  { solution: "Agorapulse", capability: "SOCIAL-LISTEN", delivery_strength: "partial", notes: "Brand-mention monitoring; lighter than dedicated listening tools." },
  { solution: "Agorapulse", capability: "SOCIAL-ANALYTICS", delivery_strength: "native" },
  { solution: "Agorapulse", capability: "CONTENT-CAL", delivery_strength: "native" },
  { solution: "Agorapulse", capability: "INFLUENCER-MGMT", delivery_strength: "not_supported" },
  { solution: "Agorapulse", capability: "EMPLOYEE-ADVOCACY", delivery_strength: "not_supported" },

  // Meltwater — listening-led; influencer via Klear
  { solution: "Meltwater", capability: "SOCIAL-PUB", delivery_strength: "partial" },
  { solution: "Meltwater", capability: "SOCIAL-ENGAGE", delivery_strength: "partial" },
  { solution: "Meltwater", capability: "SOCIAL-LISTEN", delivery_strength: "native", notes: "Listening + media intelligence is the flagship; reinforced by Linkfluence acquisition." },
  { solution: "Meltwater", capability: "SOCIAL-ANALYTICS", delivery_strength: "native" },
  { solution: "Meltwater", capability: "CONTENT-CAL", delivery_strength: "partial" },
  { solution: "Meltwater", capability: "INFLUENCER-MGMT", delivery_strength: "native", notes: "Klear (acquired 2021) integrated as the influencer module." },
  { solution: "Meltwater", capability: "EMPLOYEE-ADVOCACY", delivery_strength: "not_supported" },

  // Brandwatch (Cision) — listening + publishing (Falcon.io) + influencer
  { solution: "Brandwatch", capability: "SOCIAL-PUB", delivery_strength: "native", notes: "Falcon.io publishing rolled into Brandwatch after 2020 merger." },
  { solution: "Brandwatch", capability: "SOCIAL-ENGAGE", delivery_strength: "native" },
  { solution: "Brandwatch", capability: "SOCIAL-LISTEN", delivery_strength: "native", notes: "Consumer Intelligence is the flagship surface." },
  { solution: "Brandwatch", capability: "SOCIAL-ANALYTICS", delivery_strength: "native" },
  { solution: "Brandwatch", capability: "CONTENT-CAL", delivery_strength: "native" },
  { solution: "Brandwatch", capability: "INFLUENCER-MGMT", delivery_strength: "native", notes: "Brandwatch Influence module." },
  { solution: "Brandwatch", capability: "EMPLOYEE-ADVOCACY", delivery_strength: "not_supported" },

  // Emplifi Social Marketing Cloud — full-suite with advocacy partial
  { solution: "Emplifi Social Marketing Cloud", capability: "SOCIAL-PUB", delivery_strength: "native" },
  { solution: "Emplifi Social Marketing Cloud", capability: "SOCIAL-ENGAGE", delivery_strength: "native" },
  { solution: "Emplifi Social Marketing Cloud", capability: "SOCIAL-LISTEN", delivery_strength: "native" },
  { solution: "Emplifi Social Marketing Cloud", capability: "SOCIAL-ANALYTICS", delivery_strength: "native" },
  { solution: "Emplifi Social Marketing Cloud", capability: "CONTENT-CAL", delivery_strength: "native" },
  { solution: "Emplifi Social Marketing Cloud", capability: "INFLUENCER-MGMT", delivery_strength: "native", notes: "Influencer marketing module included in the cloud." },
  { solution: "Emplifi Social Marketing Cloud", capability: "EMPLOYEE-ADVOCACY", delivery_strength: "partial" },

  // Zoho Social — SMB/mid-market
  { solution: "Zoho Social", capability: "SOCIAL-PUB", delivery_strength: "native" },
  { solution: "Zoho Social", capability: "SOCIAL-ENGAGE", delivery_strength: "native" },
  { solution: "Zoho Social", capability: "SOCIAL-LISTEN", delivery_strength: "partial", notes: "Brand-mention monitoring; lighter than dedicated listening." },
  { solution: "Zoho Social", capability: "SOCIAL-ANALYTICS", delivery_strength: "native" },
  { solution: "Zoho Social", capability: "CONTENT-CAL", delivery_strength: "native" },
  { solution: "Zoho Social", capability: "INFLUENCER-MGMT", delivery_strength: "not_supported" },
  { solution: "Zoho Social", capability: "EMPLOYEE-ADVOCACY", delivery_strength: "not_supported" },

  // HubSpot Marketing Hub — partial SMM via Social Tools
  { solution: "HubSpot Marketing Hub", capability: "SOCIAL-PUB", delivery_strength: "native", notes: "Social Tools module: scheduling across major channels." },
  { solution: "HubSpot Marketing Hub", capability: "SOCIAL-ENGAGE", delivery_strength: "partial" },
  { solution: "HubSpot Marketing Hub", capability: "SOCIAL-LISTEN", delivery_strength: "partial", notes: "Keyword monitoring; lighter than dedicated listening tools." },
  { solution: "HubSpot Marketing Hub", capability: "SOCIAL-ANALYTICS", delivery_strength: "native" },
  { solution: "HubSpot Marketing Hub", capability: "CONTENT-CAL", delivery_strength: "native" },
  { solution: "HubSpot Marketing Hub", capability: "INFLUENCER-MGMT", delivery_strength: "not_supported" },
  { solution: "HubSpot Marketing Hub", capability: "EMPLOYEE-ADVOCACY", delivery_strength: "not_supported" },

  // Salesforce Marketing Cloud Engagement — Social Studio largely sunset 2024
  { solution: "Salesforce Marketing Cloud Engagement", capability: "SOCIAL-PUB", delivery_strength: "via_extension", notes: "Social Studio sunset 2024; SMM coverage via partner integrations." },
  { solution: "Salesforce Marketing Cloud Engagement", capability: "SOCIAL-ENGAGE", delivery_strength: "via_extension" },
  { solution: "Salesforce Marketing Cloud Engagement", capability: "SOCIAL-LISTEN", delivery_strength: "via_extension" },
  { solution: "Salesforce Marketing Cloud Engagement", capability: "SOCIAL-ANALYTICS", delivery_strength: "partial" },
  { solution: "Salesforce Marketing Cloud Engagement", capability: "CONTENT-CAL", delivery_strength: "partial", notes: "Content Builder calendar capabilities." },
  { solution: "Salesforce Marketing Cloud Engagement", capability: "INFLUENCER-MGMT", delivery_strength: "not_supported" },
  { solution: "Salesforce Marketing Cloud Engagement", capability: "EMPLOYEE-ADVOCACY", delivery_strength: "not_supported" },
];

// ============================================================
// RUN
// ============================================================
async function main() {
  console.log("\n=== Domains ===");
  const domainMap = await syncTable("/domains", newDomains.map(d => ({ ...d })), "domain_code");

  // Full domain map (for secondary/partial cross-domain coverage)
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
    const did = allDomainMap.get(c.domain)!;
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
  const vendorMap = await syncTable("/vendors", vendors.map(v => ({ ...v })), "vendor_name");
  // The pre-existing HubSpot / Salesforce Inc / Zoho Corporation rows are reused by name.
  const fullVendorsRaw = await get("/vendors?select=id,vendor_name&limit=10000");
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

  // ===== Final counts (SMM scope) =====
  const smmDomainId = allDomainMap.get("SMM");
  const counts = {
    domains_total: (await get("/domains?select=id&limit=10000")).length,
    capabilities_total: (await get("/capabilities?select=id&limit=10000")).length,
    capability_domains_total: (await get("/capability_domains?select=capability_id&limit=10000")).length,
    vendors_total: (await get("/vendors?select=id&limit=10000")).length,
    solutions_total: (await get("/solutions?select=id&limit=10000")).length,
    solution_domains_total: (await get("/solution_domains?select=solution_id&limit=10000")).length,
    solution_capabilities_total: (await get("/solution_capabilities?select=solution_id&limit=10000")).length,
    smm_solution_domains: (await get(`/solution_domains?domain_id=eq.${smmDomainId}&select=solution_id&limit=10000`)).length,
    smm_capability_domains: (await get(`/capability_domains?domain_id=eq.${smmDomainId}&select=capability_id&limit=10000`)).length,
  };
  console.log("\n=== Final counts ===");
  console.log(JSON.stringify(counts, null, 2));
}

await main();
