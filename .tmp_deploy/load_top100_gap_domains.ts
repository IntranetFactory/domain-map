#!/usr/bin/env bun
// Loads the 20 enterprise-IT gap domains identified during the "top 100" coverage check.
// Idempotent via the `domain_code` natural key. Run from project root.

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

type DomainDraft = {
  domain_code: string;
  domain_name: string;
  description: string;
  parent_code?: string;
};

const drafts: DomainDraft[] = [
  // Application & platform delivery
  { domain_code: "APIM", domain_name: "API Management", description: "Full lifecycle API design, gateways, developer portals, security, and monetisation for internal and external APIs. Vendors: Google Apigee, MuleSoft Anypoint, Kong, IBM API Connect, Axway Amplify, Boomi API Management, Tyk, Postman, Azure API Management, AWS API Gateway." },
  { domain_code: "VSDP", domain_name: "Value Stream Delivery Platform", description: "End-to-end DevOps platforms covering source control, CI/CD, build, test, release, and value-stream analytics. Vendors: GitLab, GitHub Enterprise, Atlassian (Jira + Bitbucket), Azure DevOps, JetBrains Space, JFrog Platform, CloudBees, Harness, Digital.ai." },
  { domain_code: "KUBE-PLAT", domain_name: "Kubernetes and Container Platforms", description: "Production Kubernetes distributions with day-2 operations, multi-cluster management, and integrated CI/CD. Vendors: Red Hat OpenShift, SUSE Rancher Prime, VMware Tanzu, Google Anthos, Mirantis, D2iQ, Platform9, Amazon EKS, Azure AKS, Google GKE." },
  { domain_code: "NPMD", domain_name: "Network Performance Monitoring and Diagnostics", description: "Network observability, flow analysis, path tracing, and SaaS/internet performance monitoring across WAN, LAN, and cloud. Vendors: Cisco ThousandEyes, Riverbed, Kentik, NetScout, Auvik, Catchpoint, Broadcom DX NetOps, SolarWinds NPM, LiveAction, Datadog Network Monitoring." },
  { domain_code: "DEM", domain_name: "Digital Experience Monitoring", description: "Endpoint and synthetic monitoring of the employee or customer digital experience: device health, application responsiveness, and SaaS reachability. Vendors: Nexthink, Catchpoint, ControlUp, Riverbed Aternity, 1E, SysTrack, Datadog DEM, Cisco ThousandEyes." },
  { domain_code: "DCIM", domain_name: "Data Center Infrastructure Management", description: "Asset, capacity, power, cooling, and floor-plan management for physical data centres and edge sites. Vendors: Sunbird, Nlyte, Schneider EcoStruxure IT, Vertiv Environet, FNT Command, Hyperview, Device42, Cormant-CS." },
  { domain_code: "SMP", parent_code: "ITAM", domain_name: "SaaS Management Platforms", description: "Discovery, optimisation, lifecycle management, and renewal management for the company's SaaS portfolio. Distinct from classic SAM which focuses on installed software licences. Vendors: Zylo, Productiv, Torii, BetterCloud, LeanIX SMP, Flexera One SaaS, Snow Software, Nudge Security, Josys." },
  { domain_code: "UEM", domain_name: "Unified Endpoint Management", description: "Modern device management across Windows, macOS, iOS, Android, and ChromeOS, including MDM, configuration, app distribution, and zero-touch provisioning. Vendors: Microsoft Intune, VMware Workspace ONE, Jamf, IBM MaaS360, Ivanti Neurons for UEM, ManageEngine Endpoint Central, Hexnode, Kandji, Mosyle." },

  // Data management
  { domain_code: "MDM", domain_name: "Master Data Management", description: "Authoritative golden records for shared entities (customer, supplier, product, asset) including matching, survivorship, and stewardship. Vendors: Informatica MDM, SAP Master Data Governance, Stibo Systems, Reltio, Profisee, Semarchy, Ataccama, Syndigo (Riversand)." },
  { domain_code: "DCG", domain_name: "Data Catalog and Governance", description: "Metadata management, data discovery, lineage, business glossary, and stewardship workflows for the enterprise data estate. Vendors: Collibra, Alation, Atlan, Informatica IDMC, data.world, Microsoft Purview, Google Dataplex, Acryl, Select Star, OpenMetadata." },
  { domain_code: "DI", domain_name: "Data Integration", description: "Bulk and streaming data movement, ELT/ETL, and replication for analytical workloads and data warehouses/lakehouses. Distinct from iPaaS (transactional app integration). Vendors: Informatica IDMC, Talend, Fivetran, Matillion, Airbyte, Qlik Data Integration, IBM DataStage, dbt Labs, Hevo, Rivery." },
  { domain_code: "DQ", domain_name: "Data Quality", description: "Profiling, cleansing, standardisation, matching, and ongoing monitoring of data fitness for purpose. Vendors: Informatica Cloud Data Quality, Ataccama ONE, Precisely Trillium, IBM InfoSphere QualityStage, SAP Data Services, Experian Aperture, Talend Data Quality, Monte Carlo, Bigeye, Soda." },

  // Content / experience
  { domain_code: "ECM", domain_name: "Enterprise Content Management", description: "Document repositories, records management, workflow, and information governance for internal unstructured content. Distinct from DXP (external/customer-facing). Vendors: OpenText, Hyland (OnBase, Alfresco, Nuxeo), M-Files, Box, IBM FileNet, Microsoft SharePoint, DocuWare, Laserfiche, iManage." },
  { domain_code: "DAM", domain_name: "Digital Asset Management", description: "Centralised storage, taxonomy, rights management, and distribution of brand and creative assets (images, video, design files). Vendors: Bynder, Aprimo, Acquia DAM (Widen), Adobe Experience Manager Assets, Cloudinary, Frontify, Brandfolder (Smartsheet), Canto, MediaValet, Brandworkz." },
  { domain_code: "HCMS", parent_code: "DXP", domain_name: "Headless Content Management", description: "API-first content platforms and headless CMS for omnichannel content delivery, decoupled from presentation. Complements DXP suites for teams that want best-of-breed content infrastructure. Vendors: Contentful, Sanity, Storyblok, Strapi, Hygraph, Kontent.ai, Contentstack, Prismic, ButterCMS, Payload." },
  { domain_code: "ESIGN", domain_name: "Electronic Signature", description: "Legally-binding electronic signature capture, identity verification, and audit trails for digital agreements. Vendors: DocuSign, Adobe Acrobat Sign, Dropbox Sign (HelloSign), OneSpan, Sertifi, signNow, Yousign, PandaDoc Sign, Notarize, Proof." },

  // CRM / revenue ecosystem
  { domain_code: "SALES-ENG", parent_code: "CRM", domain_name: "Sales Engagement", description: "Outbound sales cadences, multi-channel sequencing, dialler, conversation intelligence, and rep productivity. Sits alongside CRM rather than replacing it. Vendors: Salesloft, Outreach, Gong Engage, HubSpot Sales Hub Sequences, Apollo.io, Clari, ZoomInfo Engage, Mixmax, Yesware, Groove." },
  { domain_code: "PRM", parent_code: "CRM", domain_name: "Partner Relationship Management", description: "Channel partner portals, deal registration, MDF management, partner training, and indirect-revenue analytics. Vendors: Impartner, Salesforce PRM, Allbound, Channeltivity, ZINFI, Mindmatrix, PartnerStack, Crossbeam, Magentrix, Zift Solutions." },
  { domain_code: "SUB-MGMT", domain_name: "Subscription and Revenue Lifecycle Management", description: "Recurring billing, subscription lifecycle (upgrades, downgrades, suspensions), revenue recognition, and dunning for subscription and usage-based business models. Vendors: Zuora, Chargebee, Stripe Billing, Recurly, Maxio (Chargify), Aria Systems, SAP Subscription Billing, Salesforce Revenue Cloud, BillingPlatform, Sage Intacct Subscription Billing." },
  { domain_code: "CCAAS", domain_name: "Contact Center as a Service", description: "Cloud telephony, omnichannel routing, IVR, workforce engagement management, and AI agent assist for contact centres. Distinct from CSM (case-management business app). Vendors: Genesys Cloud CX, NICE CXone, Five9, Talkdesk, Amazon Connect, Cisco Webex Contact Center, Avaya Experience Platform, Zoom Contact Center, 8x8, Twilio Flex." },
];

async function main() {
  console.log(`top-100 gap loader: ${drafts.length} candidate domains`);

  // 1. Read existing domains; build code -> id map for both dedupe and parent resolution
  const existing = await call({
    method: "GET",
    path: "/domains?select=id,domain_code&limit=1000",
  });
  const codeToId = new Map<string, number>();
  for (const row of existing) codeToId.set(String(row.domain_code), Number(row.id));
  console.log(`  ${existing.length} domains already in the live catalog`);

  // 2. Verify parent codes resolve
  const missingParents = new Set<string>();
  for (const d of drafts) {
    if (d.parent_code && !codeToId.has(d.parent_code)) missingParents.add(d.parent_code);
  }
  if (missingParents.size > 0) {
    throw new Error(`unknown parent codes: ${[...missingParents].join(", ")}`);
  }

  // 3. Filter to rows that don't already exist
  const toInsert = drafts.filter(d => !codeToId.has(d.domain_code));
  const skipped = drafts.length - toInsert.length;
  if (skipped > 0) console.log(`  ${skipped} already present, skipping`);
  if (toInsert.length === 0) {
    console.log("  nothing to insert");
    return;
  }

  // 4. Shape rows for insert (record_status omitted -> defaults to "new")
  const rows = toInsert.map(d => ({
    domain_code: d.domain_code,
    domain_name: d.domain_name,
    description: d.description,
    parent_domain_id: d.parent_code ? codeToId.get(d.parent_code) : null,
  }));

  console.log(`  inserting ${rows.length} new domains...`);
  const inserted = await call({ method: "POST", path: "/domains", body: rows });
  console.log(`  inserted ${inserted.length} rows`);

  // 5. Verify via re-read
  const after = await call({
    method: "GET",
    path: "/domains?select=id,domain_code,parent_domain_id&order=id.desc&limit=" + rows.length,
  });
  console.log("\nNewly inserted (id / code / parent_id):");
  for (const r of after.reverse()) {
    console.log(`  ${String(r.id).padStart(4)}  ${String(r.domain_code).padEnd(12)}  parent=${r.parent_domain_id ?? "-"}`);
  }

  const total = await call({
    method: "GET",
    path: "/domains?select=id&limit=1",
    // We just want the count via Content-Range, but the helper doesn't expose headers.
    // Fall back to a full-list count.
  });
  // Recount full set for the summary
  const all = await call({ method: "GET", path: "/domains?select=id&limit=1000" });
  console.log(`\nTotal domains now in catalog: ${all.length}`);
}

main().catch(err => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
