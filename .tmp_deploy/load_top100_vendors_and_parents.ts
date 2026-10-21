#!/usr/bin/env bun
// Phase 2 of the "top 100" gap load:
//   1. Set parents on NPMD/DCIM/DEM -> ITOM and KUBE-PLAT -> APP-PAAS.
//   2. Backfill ~131 vendor rows referenced in the 20 new domain descriptions,
//      idempotently by `vendor_name`.
// Run from project root.

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

// ----------------------------------------------------------------
// Step 1: parent assignments
// ----------------------------------------------------------------
const parentAssignments: Array<{ child: string; parent: string }> = [
  { child: "NPMD", parent: "ITOM" },
  { child: "DCIM", parent: "ITOM" },
  { child: "DEM", parent: "ITOM" },
  { child: "KUBE-PLAT", parent: "APP-PAAS" },
];

// ----------------------------------------------------------------
// Step 2: vendor rows
// Conventions match existing rows in this catalog:
//   - vendor_name: market-facing brand (note acquisitions in description)
//   - headquarters_country: full country name (e.g. "USA", "UK", "Germany")
//   - one-sentence description
// Skipped from this list because already in `vendors`:
//   Microsoft, IBM, Broadcom, Google, AWS, Cisco, SAP SE, Salesforce Inc,
//   Adobe, Boomi, Atlassian, Datadog, DocuSign, Splunk, Acquia, Smartsheet,
//   Sitecore, Zoom, Twilio, Sage Group, Qlik, Zoho Corporation, Wiz, Flexera,
//   Snow Software, Workato, Device42, iManage, OpenText, Oracle, PTC, etc.
// ----------------------------------------------------------------
const newVendors: Array<{
  vendor_name: string;
  vendor_url: string;
  headquarters_country: string;
  description: string;
}> = [
  // APIM
  { vendor_name: "Kong", vendor_url: "https://konghq.com", headquarters_country: "USA", description: "API gateway, service mesh, and API platform vendor." },
  { vendor_name: "Axway", vendor_url: "https://www.axway.com", headquarters_country: "France", description: "Integration and API management vendor (Amplify Platform)." },
  { vendor_name: "Tyk", vendor_url: "https://tyk.io", headquarters_country: "UK", description: "Open-source API management and gateway vendor." },
  { vendor_name: "Postman", vendor_url: "https://www.postman.com", headquarters_country: "USA", description: "API development, testing, and platform vendor." },

  // VSDP
  { vendor_name: "GitLab", vendor_url: "https://about.gitlab.com", headquarters_country: "USA", description: "DevSecOps platform vendor covering source, CI/CD, and security." },
  { vendor_name: "JetBrains", vendor_url: "https://www.jetbrains.com", headquarters_country: "Czech Republic", description: "Developer tools vendor (IntelliJ, TeamCity, Space)." },
  { vendor_name: "JFrog", vendor_url: "https://jfrog.com", headquarters_country: "USA", description: "DevOps and software supply chain vendor (Artifactory, Xray)." },
  { vendor_name: "CloudBees", vendor_url: "https://www.cloudbees.com", headquarters_country: "USA", description: "Enterprise Jenkins and software delivery platform vendor." },
  { vendor_name: "Harness", vendor_url: "https://www.harness.io", headquarters_country: "USA", description: "Software delivery platform vendor (CD, FF, CCM)." },
  { vendor_name: "Digital.ai", vendor_url: "https://digital.ai", headquarters_country: "USA", description: "Value stream and enterprise DevOps platform vendor." },

  // KUBE-PLAT
  { vendor_name: "Red Hat", vendor_url: "https://www.redhat.com", headquarters_country: "USA", description: "Open source software vendor (IBM subsidiary; OpenShift, RHEL, Ansible)." },
  { vendor_name: "SUSE", vendor_url: "https://www.suse.com", headquarters_country: "Germany", description: "Open source vendor (SLES, Rancher Kubernetes Engine, NeuVector)." },
  { vendor_name: "Mirantis", vendor_url: "https://www.mirantis.com", headquarters_country: "USA", description: "Cloud native infrastructure and Kubernetes platform vendor." },
  { vendor_name: "Platform9", vendor_url: "https://platform9.com", headquarters_country: "USA", description: "Managed Kubernetes and private cloud platform vendor." },

  // NPMD
  { vendor_name: "Riverbed", vendor_url: "https://www.riverbed.com", headquarters_country: "USA", description: "Network and digital experience observability vendor (Aternity, SteelCentral)." },
  { vendor_name: "Kentik", vendor_url: "https://www.kentik.com", headquarters_country: "USA", description: "Network observability and analytics vendor." },
  { vendor_name: "NetScout", vendor_url: "https://www.netscout.com", headquarters_country: "USA", description: "Service assurance and network performance vendor." },
  { vendor_name: "Auvik", vendor_url: "https://www.auvik.com", headquarters_country: "Canada", description: "Network monitoring and management vendor." },
  { vendor_name: "Catchpoint", vendor_url: "https://www.catchpoint.com", headquarters_country: "USA", description: "Internet performance and digital experience monitoring vendor." },
  { vendor_name: "SolarWinds", vendor_url: "https://www.solarwinds.com", headquarters_country: "USA", description: "IT management vendor (NPM, Hybrid Cloud Observability)." },
  { vendor_name: "LiveAction", vendor_url: "https://www.liveaction.com", headquarters_country: "USA", description: "Network performance and security monitoring vendor." },

  // DEM
  { vendor_name: "Nexthink", vendor_url: "https://www.nexthink.com", headquarters_country: "Switzerland", description: "Digital employee experience platform vendor." },
  { vendor_name: "ControlUp", vendor_url: "https://www.controlup.com", headquarters_country: "USA", description: "Digital experience monitoring vendor for end-user computing." },
  { vendor_name: "1E", vendor_url: "https://www.1e.com", headquarters_country: "UK", description: "Digital employee experience and endpoint automation vendor." },
  { vendor_name: "Lakeside Software", vendor_url: "https://www.lakesidesoftware.com", headquarters_country: "USA", description: "Digital experience intelligence vendor (SysTrack)." },

  // DCIM
  { vendor_name: "Sunbird Software", vendor_url: "https://www.sunbirddcim.com", headquarters_country: "USA", description: "Data center infrastructure management vendor." },
  { vendor_name: "Nlyte Software", vendor_url: "https://www.nlyte.com", headquarters_country: "USA", description: "DCIM vendor (Carrier subsidiary)." },
  { vendor_name: "Schneider Electric", vendor_url: "https://www.se.com", headquarters_country: "France", description: "Energy and automation vendor (EcoStruxure IT, APC)." },
  { vendor_name: "Vertiv", vendor_url: "https://www.vertiv.com", headquarters_country: "USA", description: "Critical infrastructure vendor (Environet DCIM, power, cooling)." },
  { vendor_name: "FNT Software", vendor_url: "https://www.fntsoftware.com", headquarters_country: "Germany", description: "DCIM and IT documentation vendor (FNT Command)." },
  { vendor_name: "Hyperview", vendor_url: "https://www.hyperviewhq.com", headquarters_country: "Canada", description: "Cloud-native DCIM vendor." },
  { vendor_name: "Cormant", vendor_url: "https://www.cormant.com", headquarters_country: "USA", description: "Infrastructure management vendor (Cormant-CS DCIM)." },

  // SMP
  { vendor_name: "Zylo", vendor_url: "https://zylo.com", headquarters_country: "USA", description: "SaaS management platform vendor." },
  { vendor_name: "Productiv", vendor_url: "https://productiv.com", headquarters_country: "USA", description: "SaaS management platform vendor." },
  { vendor_name: "Torii", vendor_url: "https://www.toriihq.com", headquarters_country: "USA", description: "SaaS management platform vendor." },
  { vendor_name: "BetterCloud", vendor_url: "https://www.bettercloud.com", headquarters_country: "USA", description: "SaaS operations and management platform vendor." },
  { vendor_name: "Nudge Security", vendor_url: "https://www.nudgesecurity.com", headquarters_country: "USA", description: "SaaS security and governance vendor." },
  { vendor_name: "Josys", vendor_url: "https://josys.com", headquarters_country: "Japan", description: "SaaS and device management platform vendor." },

  // UEM
  { vendor_name: "Jamf", vendor_url: "https://www.jamf.com", headquarters_country: "USA", description: "Apple device management vendor (Jamf Pro)." },
  { vendor_name: "Hexnode", vendor_url: "https://www.hexnode.com", headquarters_country: "USA", description: "Unified endpoint management vendor." },
  { vendor_name: "Kandji", vendor_url: "https://www.kandji.io", headquarters_country: "USA", description: "Apple device management platform vendor." },
  { vendor_name: "Mosyle", vendor_url: "https://mosyle.com", headquarters_country: "USA", description: "Apple device management vendor for education and enterprise." },

  // MDM (Master Data Management)
  { vendor_name: "Informatica", vendor_url: "https://www.informatica.com", headquarters_country: "USA", description: "Enterprise data management vendor (MDM, IDMC, data quality, governance)." },
  { vendor_name: "Stibo Systems", vendor_url: "https://www.stibosystems.com", headquarters_country: "Denmark", description: "Master data management and PIM vendor." },
  { vendor_name: "Reltio", vendor_url: "https://www.reltio.com", headquarters_country: "USA", description: "Cloud master data management vendor." },
  { vendor_name: "Profisee", vendor_url: "https://profisee.com", headquarters_country: "USA", description: "Master data management vendor." },
  { vendor_name: "Semarchy", vendor_url: "https://www.semarchy.com", headquarters_country: "USA", description: "Master data management and data integration vendor (xDM)." },
  { vendor_name: "Ataccama", vendor_url: "https://www.ataccama.com", headquarters_country: "Czech Republic", description: "Data management vendor (MDM, data quality, governance)." },
  { vendor_name: "Syndigo", vendor_url: "https://www.syndigo.com", headquarters_country: "USA", description: "Product information and master data vendor (Riversand)." },

  // DCG
  { vendor_name: "Collibra", vendor_url: "https://www.collibra.com", headquarters_country: "Belgium", description: "Data governance and catalog vendor." },
  { vendor_name: "Alation", vendor_url: "https://www.alation.com", headquarters_country: "USA", description: "Data catalog and governance vendor." },
  { vendor_name: "Atlan", vendor_url: "https://atlan.com", headquarters_country: "USA", description: "Active metadata and data catalog vendor." },
  { vendor_name: "data.world", vendor_url: "https://data.world", headquarters_country: "USA", description: "Cloud data catalog and governance vendor." },
  { vendor_name: "Acryl Data", vendor_url: "https://www.acryldata.io", headquarters_country: "USA", description: "Managed DataHub data catalog and observability vendor." },
  { vendor_name: "Select Star", vendor_url: "https://www.selectstar.com", headquarters_country: "USA", description: "Automated data discovery and lineage vendor." },

  // DI
  { vendor_name: "Talend", vendor_url: "https://www.talend.com", headquarters_country: "France", description: "Data integration and data quality vendor (Qlik subsidiary)." },
  { vendor_name: "Fivetran", vendor_url: "https://www.fivetran.com", headquarters_country: "USA", description: "Managed ELT data integration vendor." },
  { vendor_name: "Matillion", vendor_url: "https://www.matillion.com", headquarters_country: "UK", description: "Cloud data integration and ELT vendor." },
  { vendor_name: "Airbyte", vendor_url: "https://airbyte.com", headquarters_country: "USA", description: "Open-source data integration vendor." },
  { vendor_name: "dbt Labs", vendor_url: "https://www.getdbt.com", headquarters_country: "USA", description: "Analytics engineering and transformation vendor (dbt)." },
  { vendor_name: "Hevo Data", vendor_url: "https://hevodata.com", headquarters_country: "USA", description: "Automated data pipeline vendor." },
  { vendor_name: "Rivery", vendor_url: "https://rivery.io", headquarters_country: "USA", description: "Cloud data integration vendor." },

  // DQ
  { vendor_name: "Precisely", vendor_url: "https://www.precisely.com", headquarters_country: "USA", description: "Data integrity vendor (Trillium, Spectrum)." },
  { vendor_name: "Experian", vendor_url: "https://www.experian.com", headquarters_country: "Ireland", description: "Information services and data quality vendor (Aperture Data Studio)." },
  { vendor_name: "Monte Carlo", vendor_url: "https://www.montecarlodata.com", headquarters_country: "USA", description: "Data observability and quality vendor." },
  { vendor_name: "Bigeye", vendor_url: "https://www.bigeye.com", headquarters_country: "USA", description: "Data observability and monitoring vendor." },
  { vendor_name: "Soda", vendor_url: "https://www.soda.io", headquarters_country: "Belgium", description: "Data quality and observability vendor." },

  // ECM
  { vendor_name: "Hyland", vendor_url: "https://www.hyland.com", headquarters_country: "USA", description: "Content services and document management vendor (OnBase, Alfresco, Nuxeo)." },
  { vendor_name: "M-Files", vendor_url: "https://www.m-files.com", headquarters_country: "Finland", description: "Intelligent information management and ECM vendor." },
  { vendor_name: "Box", vendor_url: "https://www.box.com", headquarters_country: "USA", description: "Cloud content management and collaboration vendor." },
  { vendor_name: "DocuWare", vendor_url: "https://start.docuware.com", headquarters_country: "Germany", description: "Document management and workflow automation vendor (Ricoh subsidiary)." },
  { vendor_name: "Laserfiche", vendor_url: "https://www.laserfiche.com", headquarters_country: "USA", description: "ECM and process automation vendor." },

  // DAM
  { vendor_name: "Bynder", vendor_url: "https://www.bynder.com", headquarters_country: "Netherlands", description: "Digital asset management vendor." },
  { vendor_name: "Aprimo", vendor_url: "https://www.aprimo.com", headquarters_country: "USA", description: "Marketing operations and DAM vendor." },
  { vendor_name: "Cloudinary", vendor_url: "https://cloudinary.com", headquarters_country: "USA", description: "Image and video management API vendor." },
  { vendor_name: "Frontify", vendor_url: "https://www.frontify.com", headquarters_country: "Switzerland", description: "Brand management and DAM vendor." },
  { vendor_name: "Canto", vendor_url: "https://www.canto.com", headquarters_country: "USA", description: "Digital asset management vendor." },
  { vendor_name: "MediaValet", vendor_url: "https://www.mediavalet.com", headquarters_country: "Canada", description: "Cloud DAM vendor." },
  { vendor_name: "Brandworkz", vendor_url: "https://www.brandworkz.com", headquarters_country: "UK", description: "Brand management and DAM vendor." },

  // HCMS
  { vendor_name: "Contentful", vendor_url: "https://www.contentful.com", headquarters_country: "Germany", description: "Headless content management platform vendor." },
  { vendor_name: "Sanity", vendor_url: "https://www.sanity.io", headquarters_country: "Norway", description: "Headless content platform vendor (Sanity Studio)." },
  { vendor_name: "Storyblok", vendor_url: "https://www.storyblok.com", headquarters_country: "Austria", description: "Headless CMS with visual editor vendor." },
  { vendor_name: "Strapi", vendor_url: "https://strapi.io", headquarters_country: "France", description: "Open-source headless CMS vendor." },
  { vendor_name: "Hygraph", vendor_url: "https://hygraph.com", headquarters_country: "Germany", description: "GraphQL-native headless CMS vendor (formerly GraphCMS)." },
  { vendor_name: "Kontent.ai", vendor_url: "https://kontent.ai", headquarters_country: "Czech Republic", description: "Headless content management vendor (Kentico spin-off)." },
  { vendor_name: "Contentstack", vendor_url: "https://www.contentstack.com", headquarters_country: "USA", description: "Composable digital experience and headless CMS vendor." },
  { vendor_name: "Prismic", vendor_url: "https://prismic.io", headquarters_country: "France", description: "Headless CMS vendor for marketing teams." },
  { vendor_name: "ButterCMS", vendor_url: "https://buttercms.com", headquarters_country: "USA", description: "Headless CMS vendor for developers." },
  { vendor_name: "Payload", vendor_url: "https://payloadcms.com", headquarters_country: "USA", description: "Open-source headless CMS and application framework vendor." },

  // ESIGN
  { vendor_name: "Dropbox", vendor_url: "https://www.dropbox.com", headquarters_country: "USA", description: "Cloud collaboration and e-signature vendor (Dropbox Sign, formerly HelloSign)." },
  { vendor_name: "OneSpan", vendor_url: "https://www.onespan.com", headquarters_country: "Canada", description: "Digital agreement security and e-signature vendor." },
  { vendor_name: "Sertifi", vendor_url: "https://www.sertifi.com", headquarters_country: "USA", description: "E-signature and payment automation vendor for hospitality." },
  { vendor_name: "airSlate", vendor_url: "https://www.airslate.com", headquarters_country: "USA", description: "Workflow and e-signature vendor (signNow, PDFfiller)." },
  { vendor_name: "Yousign", vendor_url: "https://yousign.com", headquarters_country: "France", description: "European e-signature vendor." },
  { vendor_name: "PandaDoc", vendor_url: "https://www.pandadoc.com", headquarters_country: "USA", description: "Document automation and e-signature vendor." },
  { vendor_name: "Proof", vendor_url: "https://www.proof.com", headquarters_country: "USA", description: "Remote online notarisation and identity-assured e-signature vendor (formerly Notarize)." },

  // SALES-ENG
  { vendor_name: "Salesloft", vendor_url: "https://salesloft.com", headquarters_country: "USA", description: "Sales engagement platform vendor." },
  { vendor_name: "Outreach", vendor_url: "https://www.outreach.io", headquarters_country: "USA", description: "Sales execution and engagement platform vendor." },
  { vendor_name: "Gong", vendor_url: "https://www.gong.io", headquarters_country: "USA", description: "Revenue intelligence and sales engagement vendor." },
  { vendor_name: "Apollo.io", vendor_url: "https://www.apollo.io", headquarters_country: "USA", description: "Sales engagement and intelligence platform vendor." },
  { vendor_name: "Clari", vendor_url: "https://www.clari.com", headquarters_country: "USA", description: "Revenue operations and forecasting vendor." },
  { vendor_name: "ZoomInfo", vendor_url: "https://www.zoominfo.com", headquarters_country: "USA", description: "B2B sales intelligence and engagement vendor." },
  { vendor_name: "Mixmax", vendor_url: "https://mixmax.com", headquarters_country: "USA", description: "Sales engagement vendor for Gmail and Outlook." },
  { vendor_name: "Yesware", vendor_url: "https://www.yesware.com", headquarters_country: "USA", description: "Email tracking and sales engagement vendor." },
  { vendor_name: "Groove", vendor_url: "https://groove.co", headquarters_country: "USA", description: "Sales engagement platform vendor (Clari subsidiary)." },

  // PRM
  { vendor_name: "Impartner", vendor_url: "https://impartner.com", headquarters_country: "USA", description: "Partner relationship management vendor." },
  { vendor_name: "Allbound", vendor_url: "https://www.allbound.com", headquarters_country: "USA", description: "Partner enablement and PRM vendor." },
  { vendor_name: "Channeltivity", vendor_url: "https://www.channeltivity.com", headquarters_country: "USA", description: "PRM vendor for technology channels." },
  { vendor_name: "ZINFI", vendor_url: "https://www.zinfi.com", headquarters_country: "USA", description: "Unified channel management and PRM vendor." },
  { vendor_name: "Mindmatrix", vendor_url: "https://www.mindmatrix.net", headquarters_country: "USA", description: "Channel sales enablement and PRM vendor." },
  { vendor_name: "PartnerStack", vendor_url: "https://partnerstack.com", headquarters_country: "Canada", description: "Partner ecosystem and PRM platform vendor." },
  { vendor_name: "Crossbeam", vendor_url: "https://www.crossbeam.com", headquarters_country: "USA", description: "Partner ecosystem and account-mapping platform vendor." },
  { vendor_name: "Magentrix", vendor_url: "https://www.magentrix.com", headquarters_country: "Canada", description: "Partner portal and PRM vendor." },
  { vendor_name: "Zift Solutions", vendor_url: "https://www.ziftsolutions.com", headquarters_country: "USA", description: "Channel marketing and PRM vendor." },

  // SUB-MGMT
  { vendor_name: "Zuora", vendor_url: "https://www.zuora.com", headquarters_country: "USA", description: "Subscription management and billing vendor." },
  { vendor_name: "Chargebee", vendor_url: "https://www.chargebee.com", headquarters_country: "USA", description: "Recurring billing and subscription management vendor." },
  { vendor_name: "Stripe", vendor_url: "https://stripe.com", headquarters_country: "USA", description: "Payments, billing, and revenue platform vendor." },
  { vendor_name: "Recurly", vendor_url: "https://recurly.com", headquarters_country: "USA", description: "Subscription billing platform vendor." },
  { vendor_name: "Maxio", vendor_url: "https://www.maxio.com", headquarters_country: "USA", description: "B2B SaaS billing platform vendor (Chargify + SaaSOptics)." },
  { vendor_name: "Aria Systems", vendor_url: "https://www.ariasystems.com", headquarters_country: "USA", description: "Enterprise subscription billing platform vendor." },
  { vendor_name: "BillingPlatform", vendor_url: "https://billingplatform.com", headquarters_country: "USA", description: "Enterprise revenue lifecycle management vendor." },

  // CCAAS
  { vendor_name: "Genesys", vendor_url: "https://www.genesys.com", headquarters_country: "USA", description: "Cloud contact center and customer experience platform vendor." },
  { vendor_name: "NICE", vendor_url: "https://www.nice.com", headquarters_country: "Israel", description: "Customer experience and contact center vendor (CXone)." },
  { vendor_name: "Five9", vendor_url: "https://www.five9.com", headquarters_country: "USA", description: "Cloud contact center vendor." },
  { vendor_name: "Talkdesk", vendor_url: "https://www.talkdesk.com", headquarters_country: "USA", description: "Cloud contact center and customer experience vendor." },
  { vendor_name: "Avaya", vendor_url: "https://www.avaya.com", headquarters_country: "USA", description: "Contact center and unified communications vendor." },
  { vendor_name: "8x8", vendor_url: "https://www.8x8.com", headquarters_country: "USA", description: "Cloud contact center and UCaaS vendor." },
];

async function main() {
  // ---------- Step 1: parent assignments ----------
  console.log(`Step 1: parent assignments (${parentAssignments.length})`);
  const allDomains = await call({
    method: "GET",
    path: "/domains?select=id,domain_code,parent_domain_id&limit=1000",
  });
  const codeToDomain = new Map<string, { id: number; parent: number | null }>();
  for (const r of allDomains) {
    codeToDomain.set(String(r.domain_code), {
      id: Number(r.id),
      parent: r.parent_domain_id === null ? null : Number(r.parent_domain_id),
    });
  }
  let parentChanges = 0;
  for (const { child, parent } of parentAssignments) {
    const c = codeToDomain.get(child);
    const p = codeToDomain.get(parent);
    if (!c) {
      console.warn(`  skip ${child}: not in catalog`);
      continue;
    }
    if (!p) {
      console.warn(`  skip ${child}: parent ${parent} not in catalog`);
      continue;
    }
    if (c.parent === p.id) {
      console.log(`  ${child} already under ${parent}, no change`);
      continue;
    }
    await call({
      method: "PATCH",
      path: `/domains?id=eq.${c.id}`,
      body: { parent_domain_id: p.id },
    });
    console.log(`  set ${child}.parent_domain_id = ${p.id} (${parent})`);
    parentChanges += 1;
  }
  console.log(`  ${parentChanges} parent change(s) applied`);

  // ---------- Step 2: vendor backfill ----------
  console.log(`\nStep 2: vendor backfill (${newVendors.length} candidates)`);
  const existingVendors = await call({
    method: "GET",
    path: "/vendors?select=id,vendor_name&limit=1000",
  });
  const existingNames = new Set(existingVendors.map(v => String(v.vendor_name)));
  console.log(`  ${existingVendors.length} vendors already in the live catalog`);

  const toInsert = newVendors.filter(v => !existingNames.has(v.vendor_name));
  const skipped = newVendors.length - toInsert.length;
  if (skipped > 0) {
    const skippedNames = newVendors
      .filter(v => existingNames.has(v.vendor_name))
      .map(v => v.vendor_name);
    console.log(`  ${skipped} already present, skipping: ${skippedNames.join(", ")}`);
  }
  if (toInsert.length === 0) {
    console.log("  nothing to insert");
  } else {
    const CHUNK = 50;
    let insertedCount = 0;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const slice = toInsert.slice(i, i + CHUNK);
      const result = await call({ method: "POST", path: "/vendors", body: slice });
      insertedCount += result.length;
      console.log(`  inserted batch ${i / CHUNK + 1}: +${result.length} rows`);
    }
    console.log(`  inserted ${insertedCount} new vendor rows`);
  }

  // ---------- Verification ----------
  const allVendors = await call({
    method: "GET",
    path: "/vendors?select=id&limit=1000",
  });
  console.log(`\nTotal vendors now in catalog: ${allVendors.length}`);
}

main().catch(err => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
