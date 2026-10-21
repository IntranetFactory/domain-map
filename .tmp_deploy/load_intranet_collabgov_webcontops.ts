#!/usr/bin/env bun
// Loads three new markets into the domain_map module:
//   INTRANET     Employee Communications & Intranet Platforms
//   COLLAB-GOV   Collaboration Governance (child of ECM)
//   WEB-CONTOPS  Web Content Operations & Governance
// Plus capability backfill for the adjacent pre-existing DXP and ECM domains.
//
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
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> { return call({ method: "GET", path }); }

// PostgREST bulk insert requires every row to have the SAME keys.
// Heterogeneous arrays are rejected with "PGRST102 Empty or invalid json".
// Normalize: every row in the batch gets the union of keys, with null filling gaps.
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
type DomainSpec = { domain_code: string; domain_name: string; description: string; parent_domain_code?: string };

const newDomains: DomainSpec[] = [
  {
    domain_code: "INTRANET",
    domain_name: "Employee Communications & Intranet",
    description:
      "Modern intranet platforms, internal news and announcement broadcasting, targeted employee communications, frontline / deskless worker engagement, federated employee search, and onboarding / journey orchestration. Buyer is Internal Comms or HR. Distinct from Knowledge Management (knowledge artifacts), Workstream Collaboration (chat), HR Service Delivery (case management), and Employee Experience (engagement listening / surveys). Vendors: Staffbase, Simpplr, Firstup, Unily, LumApps, Akumina, Igloo, Workgrid, Sociabble, Haiilo, Interact, Happeo, Poppulo, ContactMonkey, Workshop, Microsoft Viva Connections.",
  },
  {
    domain_code: "COLLAB-GOV",
    domain_name: "Collaboration Governance",
    description:
      "Inventory, ownership, lifecycle policy, permissions audit, external-sharing controls, sprawl detection, and stale-content remediation across Microsoft 365 (SharePoint, Teams, OneDrive, Microsoft 365 Groups) and adjacent collaboration platforms (Google Workspace where applicable). Buyer is the Microsoft 365 / collaboration administrator (IT operations). Distinct from ECM (the underlying repository market) and from DSPM (data security posture). Vendors: AvePoint, ShareGate (Workleap), Syskit, Rencore, Quest Software, CoreView, ENow, Orchestry, ProvisionPoint, Microsoft Syntex, Microsoft Purview Information Protection.",
    parent_domain_code: "ECM",
  },
  {
    domain_code: "WEB-CONTOPS",
    domain_name: "Web Content Operations & Governance",
    description:
      "Editorial workflow, content audit and inventory, accessibility scanning, content quality / brand-voice enforcement, technical SEO governance, broken-link monitoring, and content-lifecycle planning for external / customer-facing web properties. The people-and-process layer over DXP and HCMS. Buyer is Marketing or the Web team. Distinct from INTRANET (internal audience), DXP (the delivery platform), and DAM (the asset store). Vendors: Siteimprove, GatherContent (Bynder), Acrolinx, Conductor, Lumar, Optimizely Content Marketing Platform, AudioEye, Acquia Optimize, plus partial coverage from DXP suites like Adobe Experience Manager and Sitecore XM Cloud.",
  },
];

// ============================================================
// CAPABILITIES (new domains + DXP/ECM backfill)
// ============================================================
type CapSpec = { capability_code: string; capability_name: string; domain: string; description: string };

const capabilities: CapSpec[] = [
  // ----- INTRANET (8) -----
  { capability_code: "INTRANET-PUBLISH", capability_name: "Intranet Content Publishing", domain: "INTRANET",
    description: "Authoring, page layout, and publishing workflow for internal pages, hubs, and topic spaces, with role-based contribution and approval flows." },
  { capability_code: "INTRANET-NEWS", capability_name: "Targeted Employee News and Announcements", domain: "INTRANET",
    description: "Broadcast and audience-targeted distribution of news, announcements, and CEO comms, with mandatory-read tracking and acknowledgement." },
  { capability_code: "INTRANET-ANALYTICS", capability_name: "Internal Communications Analytics", domain: "INTRANET",
    description: "Reach, open, click-through, dwell-time, and sentiment measurement of internal communications across channels and audience segments." },
  { capability_code: "INTRANET-MOBILE", capability_name: "Mobile Employee App", domain: "INTRANET",
    description: "Branded mobile application surface for content, news, push notifications, and lightweight transactions, available on personal and corporate devices." },
  { capability_code: "INTRANET-SEARCH", capability_name: "Federated Employee Search", domain: "INTRANET",
    description: "Federated search across the intranet plus connected systems (HR, IT service, document stores, chat) returning unified results for employees." },
  { capability_code: "INTRANET-JOURNEY", capability_name: "Employee Journey Orchestration", domain: "INTRANET",
    description: "Multi-step content and task journeys for onboarding, transitions, returns-from-leave, and offboarding, with progress tracking per employee." },
  { capability_code: "INTRANET-FRONTLINE", capability_name: "Frontline and Deskless Worker Communications", domain: "INTRANET",
    description: "Communications reach for workers without corporate email or workstations, including kiosk mode, SMS / mobile-first delivery, and supervisor cascade tools." },
  { capability_code: "INTRANET-ADVOCACY", capability_name: "Employee Advocacy and Social Sharing", domain: "INTRANET",
    description: "Curated content for employees to share to external social networks, with attribution, gamification, and reach measurement." },

  // ----- COLLAB-GOV (7) -----
  { capability_code: "COLLAB-GOV-INVENTORY", capability_name: "Site and Workspace Inventory", domain: "COLLAB-GOV",
    description: "Continuously updated inventory of SharePoint sites, Teams, Microsoft 365 Groups, OneDrive accounts, and channels with owner, sensitivity, activity, and storage attributes." },
  { capability_code: "COLLAB-GOV-LIFECYCLE", capability_name: "Workspace Lifecycle and Provisioning", domain: "COLLAB-GOV",
    description: "Templated provisioning of new sites / Teams / Groups, ownership re-attestation, expiry, archive, and decommission policies enforced across the tenant." },
  { capability_code: "COLLAB-GOV-PERMS", capability_name: "Permissions Audit and Access Review", domain: "COLLAB-GOV",
    description: "Discovery of effective permissions across sites, libraries, files, and channels, surfacing over-shared content, orphaned permissions, and broken inheritance for periodic review." },
  { capability_code: "COLLAB-GOV-EXTSHARE", capability_name: "External Sharing Governance", domain: "COLLAB-GOV",
    description: "Inventory and policy enforcement for guest users, anonymous links, and external-domain sharing, with expiry, allow-lists, and revoke-on-leaver workflows." },
  { capability_code: "COLLAB-GOV-STALE", capability_name: "Stale Content Detection and Remediation", domain: "COLLAB-GOV",
    description: "Detection of dormant sites, abandoned Teams, stale documents, and inactive channels with owner notification, attestation, and automated archival or deletion." },
  { capability_code: "COLLAB-GOV-BACKUP", capability_name: "Microsoft 365 Backup and Recovery", domain: "COLLAB-GOV",
    description: "Point-in-time backup and item-level restore for SharePoint, OneDrive, Teams, Exchange Online, and Microsoft 365 Groups beyond the platform's native retention windows." },
  { capability_code: "COLLAB-GOV-MIGRATE", capability_name: "Tenant Migration and Content Moves", domain: "COLLAB-GOV",
    description: "Migration of SharePoint sites, Teams, OneDrive, mailboxes, and Groups between tenants (M&A, divestiture, consolidation) preserving permissions, metadata, and links." },

  // ----- WEB-CONTOPS (8) -----
  { capability_code: "WCO-AUDIT", capability_name: "Web Content Audit and Inventory", domain: "WEB-CONTOPS",
    description: "Crawl-based inventory of web content across one or more sites, with metadata, ownership, freshness, and topical classification surfaced for audit." },
  { capability_code: "WCO-EDITORIAL", capability_name: "Editorial Workflow and Assignments", domain: "WEB-CONTOPS",
    description: "Editorial calendar, briefs, assignments, draft / review / approval workflows, and stakeholder review across web content production." },
  { capability_code: "WCO-QUALITY", capability_name: "Content Quality Scanning", domain: "WEB-CONTOPS",
    description: "Automated scanning of web content for spelling, grammar, readability, broken structure, missing alt text, and policy compliance, with prioritised remediation queues." },
  { capability_code: "WCO-ACCESS", capability_name: "Accessibility Scanning and Remediation", domain: "WEB-CONTOPS",
    description: "WCAG / ADA / EN 301 549 accessibility scanning, issue prioritisation, remediation tracking, and reporting for legal and procurement evidence." },
  { capability_code: "WCO-SEO-GOV", capability_name: "Technical SEO Governance", domain: "WEB-CONTOPS",
    description: "Continuous monitoring of crawlability, indexation, schema markup, canonical tags, and structured-data health across large web estates." },
  { capability_code: "WCO-LINKS", capability_name: "Broken Link and Freshness Monitoring", domain: "WEB-CONTOPS",
    description: "Detection of broken internal and external links, outdated content, and stale pages, with owner notification and ticketing into editorial workflow." },
  { capability_code: "WCO-CALENDAR", capability_name: "Content Planning and Calendaring", domain: "WEB-CONTOPS",
    description: "Multi-channel content calendar across campaigns, channels, audiences, and personas, with capacity / workload visibility for editorial teams." },
  { capability_code: "WCO-BRAND-VOICE", capability_name: "Brand Voice and Style Governance", domain: "WEB-CONTOPS",
    description: "Linguistic governance: terminology management, brand voice / tone enforcement, inclusive-language checks, and consistency across writers and locales." },

  // ----- DXP backfill (6) -----
  { capability_code: "DXP-WCM", capability_name: "Web Content Management and Authoring", domain: "DXP",
    description: "Page-level authoring, component composition, content modelling, and publishing for branded customer-facing web experiences." },
  { capability_code: "DXP-PERSONALIZE", capability_name: "Personalization and Audience Targeting", domain: "DXP",
    description: "Rule-based and ML-driven personalization of content, components, and journeys based on identified audiences, segments, and behavioural signals." },
  { capability_code: "DXP-PORTAL", capability_name: "Customer Portal Experiences", domain: "DXP",
    description: "Authenticated customer / partner portal experiences with self-service, account data, case access, and community surfaces." },
  { capability_code: "DXP-AB-TEST", capability_name: "Experimentation and A/B Testing", domain: "DXP",
    description: "On-platform A/B and multivariate experimentation across content variants, components, and journeys with statistical reporting." },
  { capability_code: "DXP-MULTISITE", capability_name: "Multi-Site and Multi-Brand Management", domain: "DXP",
    description: "Centralised management of multiple sites, brands, locales, and channels with shared component libraries and federated authoring." },
  { capability_code: "DXP-FORM-JOURNEY", capability_name: "Form and Journey Orchestration", domain: "DXP",
    description: "Form authoring, progressive profiling, and multi-step customer journeys integrated with content and personalization." },

  // ----- ECM backfill (7) -----
  { capability_code: "ECM-REPO", capability_name: "Document Repository and Versioning", domain: "ECM",
    description: "Hierarchical / metadata-driven document repository with check-in / check-out, version history, and full-text indexing of unstructured content." },
  { capability_code: "ECM-RECORDS", capability_name: "Records Management", domain: "ECM",
    description: "DoD 5015.2 / VERS / MoReq2010-style records management with retention schedules, holds, dispositions, and chain-of-custody evidence." },
  { capability_code: "ECM-WORKFLOW", capability_name: "Document Workflow Automation", domain: "ECM",
    description: "Routing, approval, and content-centric process automation tied to documents (contracts, claims, invoices, case files) with auditable transitions." },
  { capability_code: "ECM-INFOGOV", capability_name: "Information Governance and Retention", domain: "ECM",
    description: "Policy authoring, retention enforcement, legal-hold orchestration, and defensible disposition across the unstructured-content estate." },
  { capability_code: "ECM-CAPTURE", capability_name: "Document Capture and OCR", domain: "ECM",
    description: "Scan, capture, OCR, classification, and metadata extraction from paper, email, and inbound digital documents into the repository." },
  { capability_code: "ECM-AUDIT", capability_name: "Compliance Audit Trails", domain: "ECM",
    description: "Immutable audit trails of access, change, share, and disposition events on records and documents, surfaced for regulators and internal audit." },
  { capability_code: "ECM-CLASSIFY", capability_name: "Content Classification and Metadata", domain: "ECM",
    description: "Manual and ML-driven classification, tagging, and metadata enrichment of documents to drive retention, security labels, and discovery." },
];

// ============================================================
// VENDORS (new only; existing reused by name)
// ============================================================
type VendorSpec = {
  vendor_name: string; vendor_url: string; headquarters_country: string;
  description: string; notes?: string;
};

const vendors: VendorSpec[] = [
  // ----- INTRANET vendors -----
  { vendor_name: "Staffbase GmbH", vendor_url: "https://staffbase.com", headquarters_country: "Germany",
    description: "Employee communications platform vendor.",
    notes: "Founded 2014, HQ Chemnitz/Berlin. Acquired Bananatag (2021), Dirico (2020), tchop (2024). Independent." },
  { vendor_name: "Simpplr Inc", vendor_url: "https://www.simpplr.com", headquarters_country: "USA",
    description: "Modern intranet and employee experience platform vendor.",
    notes: "Founded 2014, HQ Redwood Shores CA. Independent, backed by Norwest, Sapphire, Salesforce Ventures." },
  { vendor_name: "Firstup Inc", vendor_url: "https://firstup.io", headquarters_country: "USA",
    description: "Employee communications and experience platform vendor.",
    notes: "Formed by the 2021 merger of SocialChorus and Dynamic Signal. HQ San Francisco. Independent." },
  { vendor_name: "Unily Ltd", vendor_url: "https://www.unily.com", headquarters_country: "UK",
    description: "Enterprise employee experience and intranet platform vendor.",
    notes: "HQ Surrey UK. Majority investment from CVC Growth in 2021; independently operated." },
  { vendor_name: "LumApps SAS", vendor_url: "https://www.lumapps.com", headquarters_country: "France",
    description: "Employee experience and intranet platform vendor.",
    notes: "Founded 2015, HQ Lyon. Independent, backed by Goldman Sachs, Bpifrance, IDInvest." },
  { vendor_name: "Akumina Inc", vendor_url: "https://akumina.com", headquarters_country: "USA",
    description: "Employee experience platform built on Microsoft 365 / SharePoint.",
    notes: "Founded 2014, HQ Nashua NH. Independent; tight Microsoft 365 alignment." },
  { vendor_name: "Igloo Software", vendor_url: "https://www.igloosoftware.com", headquarters_country: "Canada",
    description: "Digital workplace and intranet platform vendor.",
    notes: "HQ Kitchener, Ontario. Independent." },
  { vendor_name: "Workgrid Software", vendor_url: "https://www.workgrid.com", headquarters_country: "USA",
    description: "Employee assistant and digital workplace overlay vendor.",
    notes: "Spun out of Liberty Mutual; HQ Boston. Independent." },
  { vendor_name: "Sociabble", vendor_url: "https://www.sociabble.com", headquarters_country: "France",
    description: "Employee communications, advocacy, and engagement platform vendor.",
    notes: "Founded 2014, HQ Paris. Independent." },
  { vendor_name: "Haiilo GmbH", vendor_url: "https://haiilo.com", headquarters_country: "Germany",
    description: "Employee communications platform vendor.",
    notes: "Formed in 2022 by the merger of COYO, Smarp, and Jubiwee. HQ Hamburg. Independent." },
  { vendor_name: "Interact Software", vendor_url: "https://www.interactsoftware.com", headquarters_country: "UK",
    description: "Intranet platform vendor.",
    notes: "HQ Manchester. Independent (Vista Equity Partners investment 2017)." },
  { vendor_name: "Happeo Oy", vendor_url: "https://www.happeo.com", headquarters_country: "Finland",
    description: "Intranet platform built primarily on Google Workspace.",
    notes: "HQ Helsinki / Amsterdam. Independent." },
  { vendor_name: "Poppulo Limited", vendor_url: "https://www.poppulo.com", headquarters_country: "Ireland",
    description: "Employee communications platform vendor (email, mobile, digital signage).",
    notes: "HQ Cork. Acquired Four Winds Interactive in 2022 to add digital signage to the comms stack." },
  { vendor_name: "ContactMonkey Inc", vendor_url: "https://www.contactmonkey.com", headquarters_country: "Canada",
    description: "Internal email communications and analytics platform vendor.",
    notes: "HQ Toronto. Independent; Outlook / Gmail-native internal email tooling." },
  { vendor_name: "Workshop, Inc.", vendor_url: "https://www.useworkshop.com", headquarters_country: "USA",
    description: "Internal communications email and platform vendor.",
    notes: "HQ Omaha NE. Independent. Distinct from Workleap's Workshop brand." },

  // ----- COLLAB-GOV vendors -----
  { vendor_name: "AvePoint Inc", vendor_url: "https://www.avepoint.com", headquarters_country: "USA",
    description: "Microsoft 365 governance, security, and lifecycle management vendor.",
    notes: "Public (Nasdaq: AVPT). HQ Jersey City NJ. Independent." },
  { vendor_name: "Workleap", vendor_url: "https://workleap.com", headquarters_country: "Canada",
    description: "Workplace experience and Microsoft 365 management platform group (formerly GSoft); parent of ShareGate, Officevibe, Workleap LMS365.",
    notes: "Rebranded from GSoft to Workleap in 2023. HQ Montreal. Independent." },
  { vendor_name: "Syskit", vendor_url: "https://www.syskit.com", headquarters_country: "Croatia",
    description: "Microsoft 365 governance, reporting, and lifecycle vendor.",
    notes: "Founded 2012, HQ Zagreb. Independent." },
  { vendor_name: "Rencore", vendor_url: "https://rencore.com", headquarters_country: "Germany",
    description: "Microsoft 365 and Power Platform governance and code-quality vendor.",
    notes: "HQ Munich. Independent." },
  { vendor_name: "Quest Software", vendor_url: "https://www.quest.com", headquarters_country: "USA",
    description: "IT management software vendor (M365 management via On Demand / Metalogix / Cogmotive).",
    notes: "HQ Aliso Viejo CA. Owned by Clearlake Capital and Francisco Partners since 2016 (divested from Dell). Acquired Metalogix and Cogmotive to consolidate M365 governance." },
  { vendor_name: "CoreView", vendor_url: "https://www.coreview.com", headquarters_country: "USA",
    description: "Microsoft 365 management and governance platform vendor.",
    notes: "HQ Reston VA / Milan. Acquired Simeon Cloud (M365 tenant configuration baselining) in 2023." },
  { vendor_name: "ENow Software", vendor_url: "https://www.enowsoftware.com", headquarters_country: "USA",
    description: "Microsoft 365 and Exchange monitoring, reporting, and licensing vendor.",
    notes: "HQ San Juan Capistrano CA. Independent." },
  { vendor_name: "Orchestry Software", vendor_url: "https://orchestry.com", headquarters_country: "Canada",
    description: "Microsoft 365 provisioning, lifecycle, and adoption-management vendor.",
    notes: "HQ Toronto. Independent." },
  { vendor_name: "ProvisionPoint", vendor_url: "https://www.provisionpoint.com", headquarters_country: "UK",
    description: "Microsoft 365 site / Team provisioning, lifecycle, and governance vendor.",
    notes: "HQ Reading UK. Independent." },

  // ----- WEB-CONTOPS vendors (Bynder, Acquia, Optimizely, Adobe, Sitecore already in catalog) -----
  { vendor_name: "Siteimprove A/S", vendor_url: "https://www.siteimprove.com", headquarters_country: "Denmark",
    description: "Web governance, accessibility, content quality, and SEO platform vendor.",
    notes: "HQ Copenhagen. Acquired by Nordic Capital in 2022." },
  { vendor_name: "Acrolinx GmbH", vendor_url: "https://www.acrolinx.com", headquarters_country: "Germany",
    description: "Enterprise content governance and editorial AI platform vendor.",
    notes: "HQ Berlin. Independent." },
  { vendor_name: "Conductor LLC", vendor_url: "https://www.conductor.com", headquarters_country: "USA",
    description: "Organic marketing and content intelligence platform vendor.",
    notes: "HQ New York. Acquired ContentKing (real-time SEO monitoring) in 2021. Bregal Sagemount-backed." },
  { vendor_name: "Lumar", vendor_url: "https://www.lumar.io", headquarters_country: "UK",
    description: "Technical SEO and website intelligence platform vendor.",
    notes: "Formerly DeepCrawl; rebranded to Lumar in 2022. HQ London." },
  { vendor_name: "AudioEye Inc", vendor_url: "https://www.audioeye.com", headquarters_country: "USA",
    description: "Digital accessibility platform vendor.",
    notes: "Public (Nasdaq: AEYE). HQ Tucson AZ." },
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
  // ----- INTRANET (16) -----
  { solution_name: "Staffbase", vendor: "Staffbase GmbH", solution_type: "saas",
    description: "Multi-channel employee communications platform (intranet, mobile app, email, frontline) with strong analytics and audience targeting.",
    primary: ["INTRANET"] },
  { solution_name: "Simpplr", vendor: "Simpplr Inc", solution_type: "saas",
    description: "AI-driven intranet and employee experience platform with content publishing, news, and federated search.",
    primary: ["INTRANET"] },
  { solution_name: "Firstup", vendor: "Firstup Inc", solution_type: "saas",
    description: "Cross-channel employee communications and journeys platform (formed from SocialChorus + Dynamic Signal merger).",
    primary: ["INTRANET"], secondary: ["EMP-EXP"] },
  { solution_name: "Unily", vendor: "Unily Ltd", solution_type: "saas",
    description: "Enterprise employee experience platform with intranet hubs, news, federated search, and integrations with Microsoft 365 and Workday.",
    primary: ["INTRANET"] },
  { solution_name: "LumApps", vendor: "LumApps SAS", solution_type: "saas",
    description: "Employee experience platform with intranet, journeys, and AI assistant; tight integration with Google Workspace and Microsoft 365.",
    primary: ["INTRANET"] },
  { solution_name: "Akumina", vendor: "Akumina Inc", solution_type: "saas",
    description: "Employee experience platform built natively on Microsoft 365 and SharePoint, with intranet hubs and journey orchestration.",
    primary: ["INTRANET"] },
  { solution_name: "Igloo", vendor: "Igloo Software", solution_type: "saas",
    description: "Digital workplace intranet platform combining content, news, and collaboration spaces.",
    primary: ["INTRANET"] },
  { solution_name: "Workgrid", vendor: "Workgrid Software", solution_type: "saas",
    description: "Employee assistant overlay that aggregates notifications, tasks, and federated search across enterprise systems into a unified employee surface.",
    primary: ["INTRANET"], secondary: ["HRSD"] },
  { solution_name: "Sociabble", vendor: "Sociabble", solution_type: "saas",
    description: "Employee communications, advocacy, and engagement platform with strong mobile / frontline focus.",
    primary: ["INTRANET"] },
  { solution_name: "Haiilo", vendor: "Haiilo GmbH", solution_type: "saas",
    description: "Employee communications and engagement platform (intranet, multi-channel news, employee advocacy) formed from the COYO + Smarp + Jubiwee merger.",
    primary: ["INTRANET"], secondary: ["EMP-EXP"] },
  { solution_name: "Interact Intranet", vendor: "Interact Software", solution_type: "saas",
    description: "Intranet platform with content publishing, news targeting, mandatory-read tracking, and forms.",
    primary: ["INTRANET"] },
  { solution_name: "Happeo", vendor: "Happeo Oy", solution_type: "saas",
    description: "Intranet platform built primarily on Google Workspace with channels, pages, and federated search.",
    primary: ["INTRANET"] },
  { solution_name: "Poppulo Harmony", vendor: "Poppulo Limited", solution_type: "saas",
    description: "Omnichannel employee communications platform (email, mobile, digital signage) with strong analytics.",
    primary: ["INTRANET"] },
  { solution_name: "ContactMonkey", vendor: "ContactMonkey Inc", solution_type: "saas",
    description: "Internal email communications platform with Outlook / Gmail native sending, drag-and-drop templates, and analytics.",
    primary: ["INTRANET"] },
  { solution_name: "Workshop", vendor: "Workshop, Inc.", solution_type: "saas",
    description: "Multi-channel internal communications platform (email, Slack, MS Teams, SMS) with newsletter authoring and analytics.",
    primary: ["INTRANET"] },
  { solution_name: "Microsoft Viva Connections", vendor: "Microsoft", solution_type: "saas",
    description: "Microsoft 365 intranet experience surfaced through SharePoint home sites, the Viva Connections dashboard, and the Teams app.",
    notes: "Built on SharePoint Online; part of the Microsoft Viva employee experience suite.",
    primary: ["INTRANET"], secondary: ["EMP-EXP"], partial: ["WSC"] },

  // ----- COLLAB-GOV (11) -----
  { solution_name: "AvePoint Confidence Platform", vendor: "AvePoint Inc", solution_type: "saas",
    description: "Microsoft 365 governance, lifecycle, security, and migration suite with Cloud Governance, Policies & Insights, and Opus modules.",
    notes: "AvePoint Cloud Backup is a sibling backup product, kept out of this domain by scope.",
    primary: ["COLLAB-GOV"] },
  { solution_name: "ShareGate", vendor: "Workleap", solution_type: "saas",
    description: "Microsoft 365 migration, management, and reporting platform; strong tenant-to-tenant moves and SharePoint reporting.",
    primary: ["COLLAB-GOV"] },
  { solution_name: "Syskit Point", vendor: "Syskit", solution_type: "saas",
    description: "Microsoft 365 governance platform: inventory, ownership, access review, lifecycle, and external-sharing controls.",
    primary: ["COLLAB-GOV"] },
  { solution_name: "Rencore Governance", vendor: "Rencore", solution_type: "saas",
    description: "Microsoft 365 and Power Platform governance with policy authoring, automated inventory, and code-quality checks for citizen-developed apps.",
    primary: ["COLLAB-GOV"] },
  { solution_name: "Quest On Demand for Microsoft 365", vendor: "Quest Software", solution_type: "saas",
    description: "SaaS Microsoft 365 management suite (migration, reporting, audit, recovery, license optimisation) consolidating the Metalogix and Cogmotive lineages.",
    primary: ["COLLAB-GOV"] },
  { solution_name: "CoreView", vendor: "CoreView", solution_type: "saas",
    description: "Microsoft 365 management platform with delegated administration, license optimisation, configuration baselining (via Simeon Cloud), and reporting.",
    primary: ["COLLAB-GOV"] },
  { solution_name: "ENow Application Insights", vendor: "ENow Software", solution_type: "saas",
    description: "Microsoft 365 and Exchange monitoring, reporting, and license-optimisation platform.",
    primary: ["COLLAB-GOV"] },
  { solution_name: "Orchestry", vendor: "Orchestry Software", solution_type: "saas",
    description: "Microsoft 365 provisioning, lifecycle, and adoption-management platform with templates, workspace directory, and naming/policy enforcement.",
    primary: ["COLLAB-GOV"] },
  { solution_name: "ProvisionPoint 365", vendor: "ProvisionPoint", solution_type: "saas",
    description: "Microsoft 365 site / Team provisioning, lifecycle, and governance platform with templated workspaces and policy enforcement.",
    primary: ["COLLAB-GOV"] },
  { solution_name: "Microsoft Syntex", vendor: "Microsoft", solution_type: "saas",
    description: "Microsoft 365 content services: AI-driven content classification, metadata extraction, content assembly, and SharePoint Advanced Management.",
    notes: "Microsoft's first-party content-services / governance overlay on top of SharePoint and OneDrive.",
    primary: ["COLLAB-GOV"], secondary: ["ECM"] },
  { solution_name: "Microsoft Purview Information Protection", vendor: "Microsoft", solution_type: "saas",
    description: "Microsoft 365 sensitivity labels, data classification, DLP, and information-protection controls across SharePoint, OneDrive, Teams, and Exchange.",
    notes: "Part of the broader Microsoft Purview suite which spans DSPM, eDiscovery, and compliance.",
    partial: ["COLLAB-GOV"], secondary: ["ECM"] },

  // ----- WEB-CONTOPS (10) -----
  { solution_name: "Siteimprove", vendor: "Siteimprove A/S", solution_type: "saas",
    description: "Web governance platform combining accessibility, quality, SEO, and analytics for large web estates.",
    primary: ["WEB-CONTOPS"] },
  { solution_name: "GatherContent", vendor: "Bynder", solution_type: "saas",
    description: "Editorial workflow, content briefs, and structured-content production platform; acquired by Bynder.",
    primary: ["WEB-CONTOPS"] },
  { solution_name: "Acrolinx", vendor: "Acrolinx GmbH", solution_type: "saas",
    description: "Enterprise content governance: linguistic guidance, brand voice, terminology, and consistency enforcement across writing teams and channels.",
    primary: ["WEB-CONTOPS"] },
  { solution_name: "Conductor", vendor: "Conductor LLC", solution_type: "saas",
    description: "Organic-marketing and content-intelligence platform with SEO governance, content audits, and real-time monitoring (incl. former ContentKing).",
    primary: ["WEB-CONTOPS"] },
  { solution_name: "Lumar", vendor: "Lumar", solution_type: "saas",
    description: "Technical SEO and website intelligence platform: crawl-based audits, monitoring, and remediation tracking (formerly DeepCrawl).",
    primary: ["WEB-CONTOPS"] },
  { solution_name: "Optimizely Content Marketing Platform", vendor: "Optimizely", solution_type: "saas",
    description: "Editorial workflow, calendar, and content-production platform (formerly Welcome by NewsCred) inside the Optimizely DXP family.",
    primary: ["WEB-CONTOPS"], secondary: ["DXP"] },
  { solution_name: "AudioEye", vendor: "AudioEye Inc", solution_type: "saas",
    description: "Digital accessibility platform combining automated remediation, manual audits, and legal-evidence reporting.",
    primary: ["WEB-CONTOPS"] },
  { solution_name: "Acquia Optimize", vendor: "Acquia", solution_type: "saas",
    description: "Web governance platform for accessibility, quality, SEO, and analytics across Acquia DXP and external sites (formerly Monsido).",
    primary: ["WEB-CONTOPS"], secondary: ["DXP"] },
  { solution_name: "Adobe Experience Manager", vendor: "Adobe", solution_type: "saas",
    description: "Adobe's web content management and digital experience platform (Sites + Assets) for branded customer-facing experiences.",
    notes: "Available as AEM as a Cloud Service and on-prem; combines WCM with DAM.",
    primary: ["DXP"], secondary: ["DAM"], partial: ["WEB-CONTOPS"] },
  { solution_name: "Sitecore XM Cloud", vendor: "Sitecore", solution_type: "saas",
    description: "Sitecore's cloud-native composable DXP / WCM with headless content delivery, personalization, and experience composition.",
    primary: ["DXP"], partial: ["WEB-CONTOPS", "HCMS"] },
];

// ============================================================
// SOLUTION_CAPABILITIES (delivery_strength)
// ============================================================
type SolCapSpec = {
  solution: string;
  capability: string;
  delivery_strength: "native" | "partial" | "via_extension" | "not_supported";
  notes?: string;
};

const INTRANET_CAPS = ["INTRANET-PUBLISH", "INTRANET-NEWS", "INTRANET-ANALYTICS", "INTRANET-MOBILE", "INTRANET-SEARCH", "INTRANET-JOURNEY", "INTRANET-FRONTLINE", "INTRANET-ADVOCACY"];
const COLLAB_GOV_CAPS = ["COLLAB-GOV-INVENTORY", "COLLAB-GOV-LIFECYCLE", "COLLAB-GOV-PERMS", "COLLAB-GOV-EXTSHARE", "COLLAB-GOV-STALE", "COLLAB-GOV-BACKUP", "COLLAB-GOV-MIGRATE"];
const WCO_CAPS = ["WCO-AUDIT", "WCO-EDITORIAL", "WCO-QUALITY", "WCO-ACCESS", "WCO-SEO-GOV", "WCO-LINKS", "WCO-CALENDAR", "WCO-BRAND-VOICE"];

// Helper: build a row per (solution, capability) with archetype default + overrides
type Archetype = Record<string, "native" | "partial" | "via_extension" | "not_supported">;

function matrix(solution: string, caps: string[], defaults: Archetype, overrides: Record<string, { strength: "native" | "partial" | "via_extension" | "not_supported"; notes?: string }> = {}): SolCapSpec[] {
  return caps.map(c => {
    if (overrides[c]) return { solution, capability: c, delivery_strength: overrides[c].strength, notes: overrides[c].notes };
    return { solution, capability: c, delivery_strength: defaults[c] ?? "partial" };
  });
}

// Archetypes for the three markets
const intranetFull: Archetype = { "INTRANET-PUBLISH": "native", "INTRANET-NEWS": "native", "INTRANET-ANALYTICS": "native", "INTRANET-MOBILE": "native", "INTRANET-SEARCH": "native", "INTRANET-JOURNEY": "partial", "INTRANET-FRONTLINE": "partial", "INTRANET-ADVOCACY": "partial" };
const intranetEmailLed: Archetype = { "INTRANET-PUBLISH": "partial", "INTRANET-NEWS": "native", "INTRANET-ANALYTICS": "native", "INTRANET-MOBILE": "partial", "INTRANET-SEARCH": "not_supported", "INTRANET-JOURNEY": "not_supported", "INTRANET-FRONTLINE": "partial", "INTRANET-ADVOCACY": "not_supported" };
const intranetAdvocacyFrontline: Archetype = { "INTRANET-PUBLISH": "partial", "INTRANET-NEWS": "native", "INTRANET-ANALYTICS": "native", "INTRANET-MOBILE": "native", "INTRANET-SEARCH": "partial", "INTRANET-JOURNEY": "partial", "INTRANET-FRONTLINE": "native", "INTRANET-ADVOCACY": "native" };

const collabGovFull: Archetype = { "COLLAB-GOV-INVENTORY": "native", "COLLAB-GOV-LIFECYCLE": "native", "COLLAB-GOV-PERMS": "native", "COLLAB-GOV-EXTSHARE": "native", "COLLAB-GOV-STALE": "native", "COLLAB-GOV-BACKUP": "partial", "COLLAB-GOV-MIGRATE": "native" };
const collabGovLifecycle: Archetype = { "COLLAB-GOV-INVENTORY": "native", "COLLAB-GOV-LIFECYCLE": "native", "COLLAB-GOV-PERMS": "partial", "COLLAB-GOV-EXTSHARE": "partial", "COLLAB-GOV-STALE": "native", "COLLAB-GOV-BACKUP": "not_supported", "COLLAB-GOV-MIGRATE": "not_supported" };
const collabGovReporting: Archetype = { "COLLAB-GOV-INVENTORY": "native", "COLLAB-GOV-LIFECYCLE": "partial", "COLLAB-GOV-PERMS": "native", "COLLAB-GOV-EXTSHARE": "partial", "COLLAB-GOV-STALE": "partial", "COLLAB-GOV-BACKUP": "not_supported", "COLLAB-GOV-MIGRATE": "not_supported" };

const wcoFull: Archetype = { "WCO-AUDIT": "native", "WCO-EDITORIAL": "partial", "WCO-QUALITY": "native", "WCO-ACCESS": "native", "WCO-SEO-GOV": "native", "WCO-LINKS": "native", "WCO-CALENDAR": "not_supported", "WCO-BRAND-VOICE": "partial" };
const wcoEditorial: Archetype = { "WCO-AUDIT": "partial", "WCO-EDITORIAL": "native", "WCO-QUALITY": "partial", "WCO-ACCESS": "not_supported", "WCO-SEO-GOV": "not_supported", "WCO-LINKS": "not_supported", "WCO-CALENDAR": "native", "WCO-BRAND-VOICE": "partial" };
const wcoSeo: Archetype = { "WCO-AUDIT": "native", "WCO-EDITORIAL": "not_supported", "WCO-QUALITY": "partial", "WCO-ACCESS": "partial", "WCO-SEO-GOV": "native", "WCO-LINKS": "native", "WCO-CALENDAR": "not_supported", "WCO-BRAND-VOICE": "not_supported" };
const wcoAccess: Archetype = { "WCO-AUDIT": "partial", "WCO-EDITORIAL": "not_supported", "WCO-QUALITY": "partial", "WCO-ACCESS": "native", "WCO-SEO-GOV": "not_supported", "WCO-LINKS": "partial", "WCO-CALENDAR": "not_supported", "WCO-BRAND-VOICE": "not_supported" };
const wcoBrandVoice: Archetype = { "WCO-AUDIT": "not_supported", "WCO-EDITORIAL": "partial", "WCO-QUALITY": "native", "WCO-ACCESS": "not_supported", "WCO-SEO-GOV": "not_supported", "WCO-LINKS": "not_supported", "WCO-CALENDAR": "not_supported", "WCO-BRAND-VOICE": "native" };

const solCaps: SolCapSpec[] = [
  // ----- INTRANET solutions -----
  ...matrix("Staffbase", INTRANET_CAPS, intranetFull, { "INTRANET-FRONTLINE": { strength: "native", notes: "Mobile-first frontline reach is a flagship strength." }, "INTRANET-JOURNEY": { strength: "native" } }),
  ...matrix("Simpplr", INTRANET_CAPS, intranetFull, { "INTRANET-SEARCH": { strength: "native", notes: "AI-driven federated search is a flagship surface." } }),
  ...matrix("Firstup", INTRANET_CAPS, intranetAdvocacyFrontline, { "INTRANET-PUBLISH": { strength: "partial" }, "INTRANET-JOURNEY": { strength: "native", notes: "Campaign journeys are a flagship from the Dynamic Signal lineage." } }),
  ...matrix("Unily", INTRANET_CAPS, intranetFull),
  ...matrix("LumApps", INTRANET_CAPS, intranetFull, { "INTRANET-JOURNEY": { strength: "native" } }),
  ...matrix("Akumina", INTRANET_CAPS, intranetFull),
  ...matrix("Igloo", INTRANET_CAPS, intranetFull, { "INTRANET-FRONTLINE": { strength: "partial" } }),
  ...matrix("Workgrid", INTRANET_CAPS, { "INTRANET-PUBLISH": "partial", "INTRANET-NEWS": "partial", "INTRANET-ANALYTICS": "partial", "INTRANET-MOBILE": "native", "INTRANET-SEARCH": "native", "INTRANET-JOURNEY": "partial", "INTRANET-FRONTLINE": "partial", "INTRANET-ADVOCACY": "not_supported" }, { "INTRANET-SEARCH": { strength: "native", notes: "Assistant + federated search is the flagship surface." } }),
  ...matrix("Sociabble", INTRANET_CAPS, intranetAdvocacyFrontline),
  ...matrix("Haiilo", INTRANET_CAPS, intranetAdvocacyFrontline, { "INTRANET-PUBLISH": { strength: "native" }, "INTRANET-SEARCH": { strength: "partial" } }),
  ...matrix("Interact Intranet", INTRANET_CAPS, intranetFull),
  ...matrix("Happeo", INTRANET_CAPS, intranetFull, { "INTRANET-FRONTLINE": { strength: "not_supported", notes: "Google Workspace-centric; weaker for true deskless workers." }, "INTRANET-ADVOCACY": { strength: "not_supported" } }),
  ...matrix("Poppulo Harmony", INTRANET_CAPS, { "INTRANET-PUBLISH": "partial", "INTRANET-NEWS": "native", "INTRANET-ANALYTICS": "native", "INTRANET-MOBILE": "native", "INTRANET-SEARCH": "not_supported", "INTRANET-JOURNEY": "partial", "INTRANET-FRONTLINE": "native", "INTRANET-ADVOCACY": "partial" }, { "INTRANET-FRONTLINE": { strength: "native", notes: "Digital signage (Four Winds) extends reach to frontline." } }),
  ...matrix("ContactMonkey", INTRANET_CAPS, intranetEmailLed),
  ...matrix("Workshop", INTRANET_CAPS, intranetEmailLed, { "INTRANET-MOBILE": { strength: "partial" } }),
  ...matrix("Microsoft Viva Connections", INTRANET_CAPS, { "INTRANET-PUBLISH": "native", "INTRANET-NEWS": "native", "INTRANET-ANALYTICS": "partial", "INTRANET-MOBILE": "native", "INTRANET-SEARCH": "native", "INTRANET-JOURNEY": "partial", "INTRANET-FRONTLINE": "partial", "INTRANET-ADVOCACY": "not_supported" }, { "INTRANET-ANALYTICS": { strength: "partial", notes: "Viva Connections analytics is lighter than dedicated comms platforms." }, "INTRANET-SEARCH": { strength: "native", notes: "Microsoft Search across SharePoint and Microsoft 365." } }),

  // ----- COLLAB-GOV solutions -----
  ...matrix("AvePoint Confidence Platform", COLLAB_GOV_CAPS, collabGovFull, { "COLLAB-GOV-BACKUP": { strength: "via_extension", notes: "AvePoint Cloud Backup is a sibling product, sold separately." } }),
  ...matrix("ShareGate", COLLAB_GOV_CAPS, collabGovFull, { "COLLAB-GOV-MIGRATE": { strength: "native", notes: "Tenant-to-tenant migration is the flagship strength." }, "COLLAB-GOV-BACKUP": { strength: "not_supported" } }),
  ...matrix("Syskit Point", COLLAB_GOV_CAPS, collabGovFull, { "COLLAB-GOV-MIGRATE": { strength: "not_supported" }, "COLLAB-GOV-BACKUP": { strength: "not_supported" } }),
  ...matrix("Rencore Governance", COLLAB_GOV_CAPS, collabGovLifecycle),
  ...matrix("Quest On Demand for Microsoft 365", COLLAB_GOV_CAPS, collabGovFull, { "COLLAB-GOV-BACKUP": { strength: "native", notes: "Recovery Manager / On Demand Recovery covers M365 backup natively." } }),
  ...matrix("CoreView", COLLAB_GOV_CAPS, collabGovReporting, { "COLLAB-GOV-LIFECYCLE": { strength: "native" } }),
  ...matrix("ENow Application Insights", COLLAB_GOV_CAPS, collabGovReporting),
  ...matrix("Orchestry", COLLAB_GOV_CAPS, collabGovLifecycle, { "COLLAB-GOV-INVENTORY": { strength: "native" } }),
  ...matrix("ProvisionPoint 365", COLLAB_GOV_CAPS, collabGovLifecycle),
  ...matrix("Microsoft Syntex", COLLAB_GOV_CAPS, { "COLLAB-GOV-INVENTORY": "partial", "COLLAB-GOV-LIFECYCLE": "partial", "COLLAB-GOV-PERMS": "partial", "COLLAB-GOV-EXTSHARE": "partial", "COLLAB-GOV-STALE": "partial", "COLLAB-GOV-BACKUP": "not_supported", "COLLAB-GOV-MIGRATE": "not_supported" }, { "COLLAB-GOV-STALE": { strength: "partial", notes: "SharePoint Advanced Management ships site-lifecycle insights." } }),
  ...matrix("Microsoft Purview Information Protection", COLLAB_GOV_CAPS, { "COLLAB-GOV-INVENTORY": "not_supported", "COLLAB-GOV-LIFECYCLE": "not_supported", "COLLAB-GOV-PERMS": "partial", "COLLAB-GOV-EXTSHARE": "partial", "COLLAB-GOV-STALE": "not_supported", "COLLAB-GOV-BACKUP": "not_supported", "COLLAB-GOV-MIGRATE": "not_supported" }, { "COLLAB-GOV-PERMS": { strength: "partial", notes: "Sensitivity labels and DLP control sharing surfaces; not inventory/owner-centric." } }),

  // ----- WEB-CONTOPS solutions -----
  ...matrix("Siteimprove", WCO_CAPS, wcoFull),
  ...matrix("GatherContent", WCO_CAPS, wcoEditorial),
  ...matrix("Acrolinx", WCO_CAPS, wcoBrandVoice, { "WCO-QUALITY": { strength: "native", notes: "Linguistic quality is the core analytic surface." } }),
  ...matrix("Conductor", WCO_CAPS, wcoSeo),
  ...matrix("Lumar", WCO_CAPS, wcoSeo, { "WCO-QUALITY": { strength: "partial" } }),
  ...matrix("Optimizely Content Marketing Platform", WCO_CAPS, wcoEditorial),
  ...matrix("AudioEye", WCO_CAPS, wcoAccess),
  ...matrix("Acquia Optimize", WCO_CAPS, wcoFull, { "WCO-EDITORIAL": { strength: "not_supported" }, "WCO-CALENDAR": { strength: "not_supported" } }),
  ...matrix("Adobe Experience Manager", WCO_CAPS, { "WCO-AUDIT": "partial", "WCO-EDITORIAL": "native", "WCO-QUALITY": "partial", "WCO-ACCESS": "partial", "WCO-SEO-GOV": "partial", "WCO-LINKS": "partial", "WCO-CALENDAR": "partial", "WCO-BRAND-VOICE": "partial" }, { "WCO-EDITORIAL": { strength: "native", notes: "AEM authoring workflow is built into the platform." } }),
  ...matrix("Sitecore XM Cloud", WCO_CAPS, { "WCO-AUDIT": "partial", "WCO-EDITORIAL": "native", "WCO-QUALITY": "partial", "WCO-ACCESS": "partial", "WCO-SEO-GOV": "partial", "WCO-LINKS": "partial", "WCO-CALENDAR": "partial", "WCO-BRAND-VOICE": "not_supported" }),
];

// ============================================================
// RUN
// ============================================================
async function main() {
  console.log("\n=== Pre-flight: existing domain ids ===");
  const allDomainsRaw = await get("/domains?select=id,domain_code&limit=10000");
  const allDomainMap = new Map<string, number>();
  for (const d of allDomainsRaw) allDomainMap.set(String(d.domain_code), Number(d.id));

  console.log("\n=== Domains ===");
  // Resolve parent ids before insert
  const domainRows = newDomains.map(d => {
    const row: Row = { domain_code: d.domain_code, domain_name: d.domain_name, description: d.description };
    if (d.parent_domain_code) {
      const pid = allDomainMap.get(d.parent_domain_code);
      if (!pid) throw new Error(`Parent domain ${d.parent_domain_code} not found for ${d.domain_code}`);
      row.parent_domain_id = pid;
    }
    return row;
  });
  const domainMap = await syncTable("/domains", domainRows, "domain_code");
  // Merge into allDomainMap
  for (const [k, v] of domainMap) allDomainMap.set(k, v);

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
  await syncTable("/vendors", vendors.map(v => ({ ...v })), "vendor_name");
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

  // ===== Final counts (scoped to the three new domains) =====
  const counts: Record<string, number> = {
    domains_total: (await get("/domains?select=id&limit=10000")).length,
    capabilities_total: (await get("/capabilities?select=id&limit=10000")).length,
    capability_domains_total: (await get("/capability_domains?select=capability_id&limit=10000")).length,
    vendors_total: (await get("/vendors?select=id&limit=10000")).length,
    solutions_total: (await get("/solutions?select=id&limit=10000")).length,
    solution_domains_total: (await get("/solution_domains?select=solution_id&limit=10000")).length,
    solution_capabilities_total: (await get("/solution_capabilities?select=solution_id&limit=10000")).length,
  };
  for (const code of ["INTRANET", "COLLAB-GOV", "WEB-CONTOPS", "DXP", "ECM"]) {
    const did = allDomainMap.get(code);
    if (!did) continue;
    counts[`${code}__solution_domains`] = (await get(`/solution_domains?domain_id=eq.${did}&select=solution_id&limit=10000`)).length;
    counts[`${code}__capability_domains`] = (await get(`/capability_domains?domain_id=eq.${did}&select=capability_id&limit=10000`)).length;
  }
  console.log("\n=== Final counts ===");
  console.log(JSON.stringify(counts, null, 2));
}

await main();
