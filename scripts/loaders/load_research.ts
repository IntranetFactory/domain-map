#!/usr/bin/env bun
// Loads the enterprise-domain research (domains, vendors, solutions, solution_domains)
// into the live Semantius `domain_map` module via the semantius CLI.
//
// Idempotent: for each table, reads existing rows by natural key and only inserts
// the missing ones, then re-reads to build a full natural-key -> id map.

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  // Pass JSON via stdin to avoid Windows command-line length limits.
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
  // Chunk to keep individual requests modest (PostgREST request size limits apply too).
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
// DOMAINS — top-level
// ============================================================
const topDomains = [
  { domain_code: "ITSM", domain_name: "IT Service Management", description: "Workflows for managing IT requests, incidents, problems, changes, and knowledge in support of internal business users." },
  { domain_code: "ITOM", domain_name: "IT Operations Management", description: "Monitoring, event management, and operational control of IT infrastructure and services." },
  { domain_code: "ITAM", domain_name: "IT Asset Management", description: "Umbrella domain covering hardware, software, cloud-cost, and enterprise-asset management." },
  { domain_code: "CMDB", domain_name: "Configuration Management Database", description: "Authoritative record of configuration items and their relationships, underpinning ITSM and ITOM." },
  { domain_code: "DISCOVERY", domain_name: "Discovery and Service Mapping", description: "Automated identification of IT infrastructure and the mapping of components into business services." },
  { domain_code: "AIOPS", domain_name: "AIOps", description: "Machine-learning-driven event correlation, anomaly detection, and noise reduction for IT operations." },
  { domain_code: "OBS", domain_name: "Observability", description: "Unified metrics, logs, and traces for distributed systems, primarily targeting engineering teams." },
  { domain_code: "TEST-MGMT", domain_name: "Test Management", description: "Authoring, execution, and tracking of manual and automated software tests." },
  { domain_code: "SPM", domain_name: "Strategic Portfolio Management", description: "Top-down planning of investments, demand, resources, and agile delivery across portfolios." },
  { domain_code: "APM", domain_name: "Application Portfolio Management", description: "Inventory and rationalisation of the enterprise application landscape, including business capabilities, technology fit, and lifecycle." },
  { domain_code: "SECOPS", domain_name: "Security Operations", description: "Detection, response, and remediation of security incidents, vulnerabilities, and threats." },
  { domain_code: "SOAR", domain_name: "Security Orchestration, Automation and Response", description: "Playbook-driven automation of security operations workflows across alerts and case management." },
  { domain_code: "VULN-MGMT", domain_name: "Vulnerability Management", description: "Identification, prioritisation, and remediation of security vulnerabilities across endpoints, cloud, and applications." },
  { domain_code: "THREAT-INTEL", domain_name: "Threat Intelligence", description: "Collection, curation, and operationalisation of indicators and adversary intelligence." },
  { domain_code: "GRC", domain_name: "Governance, Risk and Compliance", description: "Integrated risk management spanning policy, controls, risk assessment, and compliance evidence." },
  { domain_code: "AUDIT", domain_name: "Audit Management", description: "Planning, fieldwork, evidence, and issue tracking for internal and external audits." },
  { domain_code: "BCM", domain_name: "Business Continuity Management", description: "Business impact analysis, continuity planning, and exercise execution for resilience." },
  { domain_code: "OP-RES", domain_name: "Operational Resilience", description: "Mapping of important business services to people, processes, technology, and third parties, with tolerance setting." },
  { domain_code: "TPRM", domain_name: "Third-Party Risk Management", description: "Onboarding, due diligence, and ongoing risk monitoring of vendors and third parties." },
  { domain_code: "PRIV-MGMT", domain_name: "Privacy Management", description: "Data subject rights, consent, processing inventory, and privacy assessments." },
  { domain_code: "ESG", domain_name: "ESG Management", description: "Environmental, social, and governance data collection, disclosure, and reporting." },
  { domain_code: "HRSD", domain_name: "HR Service Delivery", description: "Employee case management, knowledge, journeys, and document management for the HR function." },
  { domain_code: "IWMS", domain_name: "Workplace and Space Management", description: "Workplace booking, space optimisation, real-estate management, and visitor handling." },
  { domain_code: "VIS-MGMT", domain_name: "Visitor Management", description: "Pre-registration, check-in, badging, and tracking of physical-site visitors." },
  { domain_code: "LSD", domain_name: "Legal Service Delivery", description: "Intake, matter management, and operational workflows for the in-house legal function." },
  { domain_code: "CLM", domain_name: "Contract Lifecycle Management", description: "Authoring, negotiation, execution, and post-signature management of contracts." },
  { domain_code: "S2P", domain_name: "Source-to-Pay", description: "End-to-end procurement workflows from sourcing through purchase order to payment." },
  { domain_code: "SUP-LIFE", domain_name: "Supplier Lifecycle Management", description: "Supplier onboarding, master data, performance, and relationship management." },
  { domain_code: "AP-AUTO", domain_name: "Accounts Payable Automation", description: "Invoice capture, matching, approval, and payment execution for accounts payable." },
  { domain_code: "CSM", domain_name: "Customer Service Management", description: "Case management, omnichannel engagement, and self-service for external customer support." },
  { domain_code: "FSM", domain_name: "Field Service Management", description: "Dispatch, scheduling, mobile work order, and parts management for on-site service technicians." },
  { domain_code: "OMS", domain_name: "Order Management", description: "Order capture, orchestration, and fulfilment across channels and inventory pools." },
  { domain_code: "KMS", domain_name: "Knowledge Management", description: "Authoring, governance, and retrieval of organisational knowledge for internal and external audiences." },
  { domain_code: "CONV-AI", domain_name: "Conversational AI", description: "Virtual agents, chatbots, and voice bots for customer and employee self-service." },
  { domain_code: "IGA", domain_name: "Identity Governance and Administration", description: "Joiner-mover-leaver workflows, access reviews, segregation-of-duties, and entitlement governance." },
  { domain_code: "IPAAS", domain_name: "Integration Platform as a Service", description: "Cloud-native iPaaS for integrating SaaS and on-prem applications via prebuilt connectors and flows." },
  { domain_code: "LCAP", domain_name: "Low-Code Application Platform", description: "Visual and model-driven development of custom enterprise applications with managed runtime." },
  { domain_code: "RPA", domain_name: "Robotic Process Automation", description: "UI-level automation of repetitive, rule-based tasks across legacy and modern applications." },
  { domain_code: "IDP", domain_name: "Intelligent Document Processing", description: "Capture, classification, extraction, and validation of structured and unstructured documents." },
  { domain_code: "PROC-MIN", domain_name: "Process Mining", description: "Event-log-driven discovery, conformance, and enhancement of business processes." },
  { domain_code: "FINOPS", domain_name: "Cloud Financial Operations", description: "Visibility, allocation, optimisation, and accountability for cloud spending across business units." },
  { domain_code: "TELCO-BSS", domain_name: "Telecommunications OSS/BSS", description: "Operations and business support systems for service providers: catalog, order, inventory, billing." },
  { domain_code: "BANK-OPS", domain_name: "Banking Operations", description: "Origination, onboarding, servicing, and case-management workflows for retail and commercial banking." },
  { domain_code: "INS-CLAIMS", domain_name: "Insurance Claims Management", description: "First notice of loss, adjudication, settlement, and recovery workflows for P&C and life insurance." },
  { domain_code: "HC-PATIENT", domain_name: "Healthcare Patient Operations", description: "Patient scheduling, care coordination, and clinical workflow management for providers." },
  { domain_code: "PS-LIC", domain_name: "Public-Sector Licensing and Permitting", description: "Application, review, issuance, inspection, and renewal of licenses and permits for governments." },
  { domain_code: "MFG-OPS", domain_name: "Manufacturing Connected Operations", description: "Shop-floor execution, work-instruction delivery, and operator-case management for manufacturers." },
  { domain_code: "RET-STORE", domain_name: "Retail Store Operations", description: "Task management, labour scheduling, and store-associate workflows for retail." },
  { domain_code: "UTIL-OPS", domain_name: "Utilities Operations", description: "Meter-to-cash, outage, work, and asset workflows for electric, gas, and water utilities." },
  { domain_code: "CLIN-DEV", domain_name: "Clinical Device Management", description: "Medical-device inventory, preventive maintenance, recalls, and clinical engineering workflows." },
];

// ============================================================
// DOMAINS — sub-domains (need parent lookup after first insert)
// ============================================================
const subDomains: Array<{ domain_code: string; domain_name: string; description: string; parent: string }> = [
  { domain_code: "HAM", parent: "ITAM", domain_name: "Hardware Asset Management", description: "Inventory, lifecycle, and disposal management of physical IT hardware assets." },
  { domain_code: "SAM", parent: "ITAM", domain_name: "Software Asset Management", description: "Discovery, normalisation, entitlement reconciliation, and audit defence for software licences." },
  { domain_code: "EAM", parent: "ITAM", domain_name: "Enterprise Asset Management", description: "Maintenance, work order, and lifecycle management for physical plant, equipment, and infrastructure." },
];

// ============================================================
// VENDORS
// ============================================================
const vendors = [
  { vendor_name: "ServiceNow Inc", vendor_url: "https://www.servicenow.com", headquarters_country: "USA", description: "Workflow platform vendor spanning IT, employee, customer, and risk workflows." },
  { vendor_name: "Salesforce Inc", vendor_url: "https://www.salesforce.com", headquarters_country: "USA", description: "Customer-relationship management and applications platform vendor." },
  { vendor_name: "Atlassian", vendor_url: "https://www.atlassian.com", headquarters_country: "Australia", description: "Vendor of developer, IT-service, and team-collaboration tools (Jira, Confluence)." },
  { vendor_name: "Freshworks", vendor_url: "https://www.freshworks.com", headquarters_country: "USA", description: "Vendor of IT-service, customer-support, and HR-service applications." },
  { vendor_name: "Ivanti", vendor_url: "https://www.ivanti.com", headquarters_country: "USA", description: "Endpoint, security, and IT-service-management vendor." },
  { vendor_name: "BMC Software", vendor_url: "https://www.bmc.com", headquarters_country: "USA", description: "IT-service-management and operations vendor (Helix, Discovery)." },
  { vendor_name: "Datadog", vendor_url: "https://www.datadoghq.com", headquarters_country: "USA", description: "Cloud-native observability and monitoring vendor." },
  { vendor_name: "Dynatrace", vendor_url: "https://www.dynatrace.com", headquarters_country: "USA", description: "Application performance monitoring and observability vendor." },
  { vendor_name: "BigPanda", vendor_url: "https://www.bigpanda.io", headquarters_country: "USA", description: "AIOps event correlation and incident management vendor." },
  { vendor_name: "Device42", vendor_url: "https://www.device42.com", headquarters_country: "USA", description: "Discovery, CMDB, and IT-asset-management vendor." },
  { vendor_name: "Flexera", vendor_url: "https://www.flexera.com", headquarters_country: "USA", description: "ITAM, SAM, and cloud-financial-management vendor." },
  { vendor_name: "Snow Software", vendor_url: "https://www.snowsoftware.com", headquarters_country: "Sweden", description: "Software-asset-management vendor." },
  { vendor_name: "Lansweeper", vendor_url: "https://www.lansweeper.com", headquarters_country: "Belgium", description: "IT-asset-discovery and management vendor." },
  { vendor_name: "USU Software", vendor_url: "https://www.usu.com", headquarters_country: "Germany", description: "Software-asset-management and knowledge-management vendor." },
  { vendor_name: "IBM", vendor_url: "https://www.ibm.com", headquarters_country: "USA", description: "Technology vendor (Apptio, Maximo, Sterling, Envizi)." },
  { vendor_name: "Broadcom", vendor_url: "https://www.broadcom.com", headquarters_country: "USA", description: "Enterprise-software conglomerate (Clarity, CloudHealth, AppNeta)." },
  { vendor_name: "Finout", vendor_url: "https://www.finout.io", headquarters_country: "USA", description: "FinOps and cloud-cost-management vendor." },
  { vendor_name: "SAP SE", vendor_url: "https://www.sap.com", headquarters_country: "Germany", description: "Enterprise applications vendor (S/4HANA, Ariba, SuccessFactors, LeanIX, Signavio)." },
  { vendor_name: "MEGA International", vendor_url: "https://www.mega.com", headquarters_country: "France", description: "Enterprise-architecture and APM vendor (HOPEX)." },
  { vendor_name: "Software AG", vendor_url: "https://www.softwareag.com", headquarters_country: "Germany", description: "Enterprise-architecture and integration vendor (Alfabet, webMethods)." },
  { vendor_name: "Ardoq", vendor_url: "https://www.ardoq.com", headquarters_country: "Norway", description: "Enterprise-architecture and application-portfolio vendor." },
  { vendor_name: "Planview", vendor_url: "https://www.planview.com", headquarters_country: "USA", description: "Strategic portfolio and work-management vendor." },
  { vendor_name: "Asana", vendor_url: "https://asana.com", headquarters_country: "USA", description: "Work-management and project-collaboration vendor." },
  { vendor_name: "Smartsheet", vendor_url: "https://www.smartsheet.com", headquarters_country: "USA", description: "Work-management and portfolio-planning vendor." },
  { vendor_name: "Microsoft", vendor_url: "https://www.microsoft.com", headquarters_country: "USA", description: "Platform vendor (Azure DevOps, Project, Power Platform, Dynamics)." },
  { vendor_name: "Idera", vendor_url: "https://www.idera.com", headquarters_country: "USA", description: "Developer-tools vendor (TestRail/Gurock)." },
  { vendor_name: "Xpand IT", vendor_url: "https://www.xpand-it.com", headquarters_country: "Portugal", description: "Test-management vendor (Xray for Jira)." },
  { vendor_name: "SmartBear", vendor_url: "https://smartbear.com", headquarters_country: "USA", description: "Test and API tooling vendor (Zephyr)." },
  { vendor_name: "Tricentis", vendor_url: "https://www.tricentis.com", headquarters_country: "Austria", description: "Continuous-testing platform vendor (qTest, Tosca)." },
  { vendor_name: "Splunk", vendor_url: "https://www.splunk.com", headquarters_country: "USA", description: "Security and observability platform vendor (Cisco-owned)." },
  { vendor_name: "Palo Alto Networks", vendor_url: "https://www.paloaltonetworks.com", headquarters_country: "USA", description: "Network and cloud-security vendor (Cortex, Prisma)." },
  { vendor_name: "Tines", vendor_url: "https://www.tines.com", headquarters_country: "Ireland", description: "No-code security and IT automation vendor." },
  { vendor_name: "Tenable", vendor_url: "https://www.tenable.com", headquarters_country: "USA", description: "Vulnerability-management vendor (Nessus, Tenable One)." },
  { vendor_name: "Qualys", vendor_url: "https://www.qualys.com", headquarters_country: "USA", description: "Vulnerability and compliance vendor (VMDR)." },
  { vendor_name: "Rapid7", vendor_url: "https://www.rapid7.com", headquarters_country: "USA", description: "Vulnerability, detection, and response vendor." },
  { vendor_name: "Wiz", vendor_url: "https://www.wiz.io", headquarters_country: "USA", description: "Cloud-native application protection platform vendor." },
  { vendor_name: "Recorded Future", vendor_url: "https://www.recordedfuture.com", headquarters_country: "USA", description: "Threat-intelligence vendor." },
  { vendor_name: "Anomali", vendor_url: "https://www.anomali.com", headquarters_country: "USA", description: "Threat-intelligence and SIEM vendor (ThreatStream)." },
  { vendor_name: "ThreatConnect", vendor_url: "https://www.threatconnect.com", headquarters_country: "USA", description: "Threat-intelligence and SOAR vendor." },
  { vendor_name: "Archer", vendor_url: "https://www.archerirm.com", headquarters_country: "USA", description: "Integrated-risk-management vendor (RSA spin-off)." },
  { vendor_name: "MetricStream", vendor_url: "https://www.metricstream.com", headquarters_country: "USA", description: "GRC and integrated-risk-management vendor." },
  { vendor_name: "OneTrust", vendor_url: "https://www.onetrust.com", headquarters_country: "USA", description: "Privacy, GRC, and third-party-risk vendor." },
  { vendor_name: "LogicGate", vendor_url: "https://www.logicgate.com", headquarters_country: "USA", description: "Risk Cloud GRC platform vendor." },
  { vendor_name: "Diligent", vendor_url: "https://www.diligent.com", headquarters_country: "USA", description: "Governance and audit vendor (Diligent One)." },
  { vendor_name: "AuditBoard", vendor_url: "https://www.auditboard.com", headquarters_country: "USA", description: "Audit, risk, and compliance platform vendor." },
  { vendor_name: "Workiva", vendor_url: "https://www.workiva.com", headquarters_country: "USA", description: "Financial, ESG, and audit reporting platform vendor." },
  { vendor_name: "Wolters Kluwer", vendor_url: "https://www.wolterskluwer.com", headquarters_country: "Netherlands", description: "Information-services vendor (TeamMate, CCH)." },
  { vendor_name: "Fusion Risk Management", vendor_url: "https://www.fusionrm.com", headquarters_country: "USA", description: "Business-continuity and operational-resilience vendor." },
  { vendor_name: "Castellan Solutions", vendor_url: "https://castellanbc.com", headquarters_country: "USA", description: "Business-continuity-management vendor." },
  { vendor_name: "Riskonnect", vendor_url: "https://riskonnect.com", headquarters_country: "USA", description: "Integrated risk-management and resilience vendor." },
  { vendor_name: "ProcessUnity", vendor_url: "https://www.processunity.com", headquarters_country: "USA", description: "Third-party-risk-management vendor." },
  { vendor_name: "Prevalent", vendor_url: "https://www.prevalent.net", headquarters_country: "USA", description: "Third-party-risk-management vendor." },
  { vendor_name: "Whistic", vendor_url: "https://www.whistic.com", headquarters_country: "USA", description: "Vendor security assessment and TPRM vendor." },
  { vendor_name: "TrustArc", vendor_url: "https://trustarc.com", headquarters_country: "USA", description: "Privacy-management vendor." },
  { vendor_name: "Securiti", vendor_url: "https://securiti.ai", headquarters_country: "USA", description: "Data privacy and AI-governance vendor." },
  { vendor_name: "Persefoni", vendor_url: "https://www.persefoni.com", headquarters_country: "USA", description: "Climate-management and ESG vendor." },
  { vendor_name: "Sphera", vendor_url: "https://sphera.com", headquarters_country: "USA", description: "ESG and operational-risk vendor." },
  { vendor_name: "Workday", vendor_url: "https://www.workday.com", headquarters_country: "USA", description: "HCM and financial-management cloud vendor." },
  { vendor_name: "Applaud HR", vendor_url: "https://www.applaudhr.com", headquarters_country: "UK", description: "Employee-experience and HR-service-delivery vendor." },
  { vendor_name: "Enboarder", vendor_url: "https://enboarder.com", headquarters_country: "USA", description: "Employee-onboarding and journey vendor." },
  { vendor_name: "Kallidus", vendor_url: "https://www.kallidus.com", headquarters_country: "UK", description: "Talent and HR-service vendor (Sapling)." },
  { vendor_name: "Leena AI", vendor_url: "https://leena.ai", headquarters_country: "USA", description: "Generative-AI-driven employee experience vendor." },
  { vendor_name: "Eptura", vendor_url: "https://eptura.com", headquarters_country: "USA", description: "Workplace and asset-management vendor (Condeco, iOffice)." },
  { vendor_name: "Robin", vendor_url: "https://robinpowered.com", headquarters_country: "USA", description: "Workplace experience and desk-booking vendor." },
  { vendor_name: "Envoy", vendor_url: "https://envoy.com", headquarters_country: "USA", description: "Workplace and visitor-management vendor." },
  { vendor_name: "Proxyclick", vendor_url: "https://www.proxyclick.com", headquarters_country: "Belgium", description: "Visitor-management vendor." },
  { vendor_name: "SwipedOn", vendor_url: "https://swipedon.com", headquarters_country: "New Zealand", description: "Visitor and workplace-sign-in vendor." },
  { vendor_name: "Litera", vendor_url: "https://www.litera.com", headquarters_country: "USA", description: "Legal-technology vendor (drafting, workflow)." },
  { vendor_name: "iManage", vendor_url: "https://imanage.com", headquarters_country: "USA", description: "Legal document and knowledge-management vendor." },
  { vendor_name: "LawVu", vendor_url: "https://lawvu.com", headquarters_country: "New Zealand", description: "In-house legal-operations platform vendor." },
  { vendor_name: "Onit", vendor_url: "https://www.onit.com", headquarters_country: "USA", description: "Enterprise legal-management and CLM vendor." },
  { vendor_name: "Icertis", vendor_url: "https://www.icertis.com", headquarters_country: "USA", description: "Contract-lifecycle-management vendor." },
  { vendor_name: "Ironclad", vendor_url: "https://ironcladapp.com", headquarters_country: "USA", description: "Digital-contracting CLM vendor." },
  { vendor_name: "Agiloft", vendor_url: "https://www.agiloft.com", headquarters_country: "USA", description: "No-code CLM and process-automation vendor." },
  { vendor_name: "DocuSign", vendor_url: "https://www.docusign.com", headquarters_country: "USA", description: "Electronic signature and CLM vendor." },
  { vendor_name: "Coupa", vendor_url: "https://www.coupa.com", headquarters_country: "USA", description: "Business spend-management platform vendor." },
  { vendor_name: "Ivalua", vendor_url: "https://www.ivalua.com", headquarters_country: "France", description: "Source-to-pay procurement vendor." },
  { vendor_name: "Jaggaer", vendor_url: "https://www.jaggaer.com", headquarters_country: "USA", description: "Source-to-pay procurement vendor." },
  { vendor_name: "HICX", vendor_url: "https://www.hicx.com", headquarters_country: "UK", description: "Supplier-experience and master-data vendor." },
  { vendor_name: "Tipalti", vendor_url: "https://tipalti.com", headquarters_country: "USA", description: "Accounts-payable and global-payments vendor." },
  { vendor_name: "AvidXchange", vendor_url: "https://www.avidxchange.com", headquarters_country: "USA", description: "AP-automation and payment vendor." },
  { vendor_name: "Stampli", vendor_url: "https://www.stampli.com", headquarters_country: "USA", description: "AP-automation vendor with collaboration on invoices." },
  { vendor_name: "BILL", vendor_url: "https://www.bill.com", headquarters_country: "USA", description: "AP/AR automation and spend-management vendor." },
  { vendor_name: "Zendesk", vendor_url: "https://www.zendesk.com", headquarters_country: "USA", description: "Customer-service and support vendor." },
  { vendor_name: "Intercom", vendor_url: "https://www.intercom.com", headquarters_country: "USA", description: "AI-first customer-support and messaging vendor." },
  { vendor_name: "IFS", vendor_url: "https://www.ifs.com", headquarters_country: "Sweden", description: "ERP, EAM, and field-service vendor." },
  { vendor_name: "PTC", vendor_url: "https://www.ptc.com", headquarters_country: "USA", description: "Industrial software vendor (ServiceMax, ThingWorx, Windchill)." },
  { vendor_name: "Jobber", vendor_url: "https://getjobber.com", headquarters_country: "Canada", description: "Field-service software vendor for home services." },
  { vendor_name: "Praxedo", vendor_url: "https://www.praxedo.com", headquarters_country: "France", description: "Field-service-management vendor." },
  { vendor_name: "Netcracker", vendor_url: "https://www.netcracker.com", headquarters_country: "USA", description: "Telco BSS/OSS vendor." },
  { vendor_name: "Ada", vendor_url: "https://www.ada.cx", headquarters_country: "Canada", description: "Conversational-AI and customer-service automation vendor." },
  { vendor_name: "Kore.ai", vendor_url: "https://kore.ai", headquarters_country: "USA", description: "Conversational AI and contact-center automation vendor." },
  { vendor_name: "Cognigy", vendor_url: "https://www.cognigy.com", headquarters_country: "Germany", description: "Conversational AI and contact-center automation vendor." },
  { vendor_name: "Amdocs", vendor_url: "https://www.amdocs.com", headquarters_country: "USA", description: "Telco BSS/OSS and customer-experience vendor." },
  { vendor_name: "Ciena", vendor_url: "https://www.ciena.com", headquarters_country: "USA", description: "Networking vendor; Blue Planet for telco automation." },
  { vendor_name: "nCino", vendor_url: "https://www.ncino.com", headquarters_country: "USA", description: "Banking operating system and loan-origination vendor." },
  { vendor_name: "Backbase", vendor_url: "https://www.backbase.com", headquarters_country: "Netherlands", description: "Engagement banking platform vendor." },
  { vendor_name: "Guidewire", vendor_url: "https://www.guidewire.com", headquarters_country: "USA", description: "P&C insurance core-system vendor (ClaimCenter, PolicyCenter)." },
  { vendor_name: "Duck Creek Technologies", vendor_url: "https://www.duckcreek.com", headquarters_country: "USA", description: "P&C insurance core-system vendor." },
  { vendor_name: "Sapiens", vendor_url: "https://sapiens.com", headquarters_country: "Israel", description: "Insurance core-system vendor (P&C, Life)." },
  { vendor_name: "Epic Systems", vendor_url: "https://www.epic.com", headquarters_country: "USA", description: "Electronic-health-record and healthcare-platform vendor." },
  { vendor_name: "Innovaccer", vendor_url: "https://innovaccer.com", headquarters_country: "USA", description: "Healthcare data and patient-experience platform vendor." },
  { vendor_name: "Accela", vendor_url: "https://www.accela.com", headquarters_country: "USA", description: "Government-software vendor (licensing, permitting)." },
  { vendor_name: "Tyler Technologies", vendor_url: "https://www.tylertech.com", headquarters_country: "USA", description: "Public-sector software vendor (Munis, Enterprise ERP)." },
  { vendor_name: "OpenGov", vendor_url: "https://opengov.com", headquarters_country: "USA", description: "Government-software vendor (budgeting, permitting)." },
  { vendor_name: "Tulip Interfaces", vendor_url: "https://tulip.co", headquarters_country: "USA", description: "Frontline-operations platform vendor for manufacturing." },
  { vendor_name: "Rockwell Automation", vendor_url: "https://www.rockwellautomation.com", headquarters_country: "USA", description: "Industrial-automation vendor (Plex MES)." },
  { vendor_name: "Zebra Technologies", vendor_url: "https://www.zebra.com", headquarters_country: "USA", description: "Enterprise asset intelligence vendor (Reflexis store ops)." },
  { vendor_name: "NewStore", vendor_url: "https://www.newstore.com", headquarters_country: "USA", description: "Mobile store and omnichannel vendor for retail." },
  { vendor_name: "Oracle", vendor_url: "https://www.oracle.com", headquarters_country: "USA", description: "Database, application, and infrastructure vendor (Opower, NetSuite, Fusion)." },
  { vendor_name: "Itron", vendor_url: "https://www.itron.com", headquarters_country: "USA", description: "Utility-software and metering vendor." },
  { vendor_name: "Celonis", vendor_url: "https://www.celonis.com", headquarters_country: "Germany", description: "Process-mining and execution-management vendor." },
  { vendor_name: "UiPath", vendor_url: "https://www.uipath.com", headquarters_country: "USA", description: "RPA, IDP, and automation-platform vendor." },
  { vendor_name: "Automation Anywhere", vendor_url: "https://www.automationanywhere.com", headquarters_country: "USA", description: "Robotic-process-automation vendor." },
  { vendor_name: "SS&C Blue Prism", vendor_url: "https://www.blueprism.com", headquarters_country: "UK", description: "RPA vendor (Blue Prism)." },
  { vendor_name: "ABBYY", vendor_url: "https://www.abbyy.com", headquarters_country: "USA", description: "Intelligent-document-processing and process-intelligence vendor." },
  { vendor_name: "Hyperscience", vendor_url: "https://www.hyperscience.com", headquarters_country: "USA", description: "Intelligent-document-processing vendor." },
  { vendor_name: "Rossum", vendor_url: "https://rossum.ai", headquarters_country: "Czech Republic", description: "AI-powered document processing vendor." },
  { vendor_name: "Instabase", vendor_url: "https://instabase.com", headquarters_country: "USA", description: "Unstructured-data and document-processing platform vendor." },
  { vendor_name: "New Relic", vendor_url: "https://newrelic.com", headquarters_country: "USA", description: "Observability and APM vendor." },
  { vendor_name: "SailPoint", vendor_url: "https://www.sailpoint.com", headquarters_country: "USA", description: "Identity-governance and administration vendor." },
  { vendor_name: "Saviynt", vendor_url: "https://saviynt.com", headquarters_country: "USA", description: "Cloud identity-governance vendor." },
  { vendor_name: "Hexagon", vendor_url: "https://hexagon.com", headquarters_country: "Sweden", description: "Asset-management and clinical-engineering vendor (Hexagon EAM, formerly Infor EAM)." },
  { vendor_name: "Boomi", vendor_url: "https://boomi.com", headquarters_country: "USA", description: "iPaaS integration vendor." },
  { vendor_name: "Workato", vendor_url: "https://www.workato.com", headquarters_country: "USA", description: "iPaaS and enterprise-automation vendor." },
  { vendor_name: "OutSystems", vendor_url: "https://www.outsystems.com", headquarters_country: "Portugal", description: "Low-code application-platform vendor." },
  { vendor_name: "Siemens", vendor_url: "https://www.siemens.com", headquarters_country: "Germany", description: "Industrial conglomerate; Mendix low-code platform." },
];

// ============================================================
// SOLUTIONS — by vendor; one row per market-facing product
// fields: solution_name, vendor (vendor_name), solution_type, solution_url, description, primary_domains[], secondary_domains[], partial_domains[]
// ============================================================

type SolutionDef = {
  solution_name: string;
  vendor: string;
  solution_type: "saas" | "on_prem" | "hybrid" | "open_source" | "internal_build" | "manual_process";
  solution_url?: string;
  description: string;
  primary?: string[];
  secondary?: string[];
  partial?: string[];
};

const solutions: SolutionDef[] = [
  // ====== ServiceNow product lines ======
  { solution_name: "ServiceNow Now Platform", vendor: "ServiceNow Inc", solution_type: "saas", solution_url: "https://www.servicenow.com/now-platform.html", description: "Workflow application platform underpinning all ServiceNow products.", primary: ["LCAP"] },
  { solution_name: "ServiceNow IT Service Management", vendor: "ServiceNow Inc", solution_type: "saas", description: "ITIL-aligned incident, problem, change, request, and knowledge management.", primary: ["ITSM"] },
  { solution_name: "ServiceNow IT Operations Management", vendor: "ServiceNow Inc", solution_type: "saas", description: "Discovery, service mapping, event management, and operations intelligence.", primary: ["ITOM"], secondary: ["DISCOVERY", "AIOPS", "CMDB"] },
  { solution_name: "ServiceNow CMDB", vendor: "ServiceNow Inc", solution_type: "saas", description: "Configuration management database, CSDM-aligned.", primary: ["CMDB"] },
  { solution_name: "ServiceNow IT Asset Management", vendor: "ServiceNow Inc", solution_type: "saas", description: "Unified hardware, software, and cloud asset management on the Now Platform.", primary: ["ITAM"], secondary: ["HAM", "SAM"] },
  { solution_name: "ServiceNow Software Asset Management Pro", vendor: "ServiceNow Inc", solution_type: "saas", description: "SAM Pro for entitlement reconciliation and licence optimisation.", primary: ["SAM"] },
  { solution_name: "ServiceNow Hardware Asset Management", vendor: "ServiceNow Inc", solution_type: "saas", description: "HAM Pro for lifecycle and stockroom management of physical assets.", primary: ["HAM"] },
  { solution_name: "ServiceNow Cloud Insights", vendor: "ServiceNow Inc", solution_type: "saas", description: "Cloud-cost visibility and FinOps capabilities on the Now Platform.", primary: ["FINOPS"] },
  { solution_name: "ServiceNow Enterprise Asset Management", vendor: "ServiceNow Inc", solution_type: "saas", description: "EAM for physical-asset maintenance and operations.", primary: ["EAM"] },
  { solution_name: "ServiceNow Strategic Portfolio Management", vendor: "ServiceNow Inc", solution_type: "saas", description: "SPM for demand, project, agile, resource, and portfolio planning.", primary: ["SPM"] },
  { solution_name: "ServiceNow Application Portfolio Management", vendor: "ServiceNow Inc", solution_type: "saas", description: "Application inventory, rationalisation, and TIME analysis.", primary: ["APM"] },
  { solution_name: "ServiceNow Test Management", vendor: "ServiceNow Inc", solution_type: "saas", description: "Test cases, suites, and execution tied to change and stories.", primary: ["TEST-MGMT"] },
  { solution_name: "ServiceNow Security Incident Response", vendor: "ServiceNow Inc", solution_type: "saas", description: "SOAR-style security incident response on the Now Platform.", primary: ["SOAR"], secondary: ["SECOPS"] },
  { solution_name: "ServiceNow Vulnerability Response", vendor: "ServiceNow Inc", solution_type: "saas", description: "Vulnerability ingestion, prioritisation, and remediation workflows.", primary: ["VULN-MGMT"], secondary: ["SECOPS"] },
  { solution_name: "ServiceNow Threat Intelligence", vendor: "ServiceNow Inc", solution_type: "saas", description: "Threat intelligence enrichment and case-management workflows.", primary: ["THREAT-INTEL"] },
  { solution_name: "ServiceNow Integrated Risk Management", vendor: "ServiceNow Inc", solution_type: "saas", description: "Policy, controls, risk, vendor, audit, BCM, and resilience on the Now Platform.", primary: ["GRC"], secondary: ["AUDIT", "BCM", "OP-RES", "TPRM", "PRIV-MGMT", "ESG"] },
  { solution_name: "ServiceNow HR Service Delivery", vendor: "ServiceNow Inc", solution_type: "saas", description: "Employee case management, knowledge, journeys, and document management.", primary: ["HRSD"] },
  { solution_name: "ServiceNow Workplace Service Delivery", vendor: "ServiceNow Inc", solution_type: "saas", description: "Workplace booking, space planning, visitor management, and case management.", primary: ["IWMS"], secondary: ["VIS-MGMT"] },
  { solution_name: "ServiceNow Legal Service Delivery", vendor: "ServiceNow Inc", solution_type: "saas", description: "Legal intake, matter management, and request workflows.", primary: ["LSD"] },
  { solution_name: "ServiceNow Contract Management Pro", vendor: "ServiceNow Inc", solution_type: "saas", description: "Contract repository and lifecycle workflows on the Now Platform.", primary: ["CLM"] },
  { solution_name: "ServiceNow Source-to-Pay Operations", vendor: "ServiceNow Inc", solution_type: "saas", description: "Procurement service desk, sourcing, supplier, and AP workflows.", primary: ["S2P"], secondary: ["SUP-LIFE", "AP-AUTO"] },
  { solution_name: "ServiceNow Customer Service Management", vendor: "ServiceNow Inc", solution_type: "saas", description: "Omnichannel customer-service case and knowledge management.", primary: ["CSM"] },
  { solution_name: "ServiceNow Field Service Management", vendor: "ServiceNow Inc", solution_type: "saas", description: "Dispatch, scheduling, mobile, and parts for field technicians.", primary: ["FSM"] },
  { solution_name: "ServiceNow Order Management for Industries", vendor: "ServiceNow Inc", solution_type: "saas", description: "Order capture and orchestration for telco and other industries.", primary: ["OMS"] },
  { solution_name: "ServiceNow Knowledge Management", vendor: "ServiceNow Inc", solution_type: "saas", description: "Knowledge bases for IT, HR, and customer use.", primary: ["KMS"] },
  { solution_name: "ServiceNow Virtual Agent", vendor: "ServiceNow Inc", solution_type: "saas", description: "NLU-based virtual agent and conversational interfaces.", primary: ["CONV-AI"] },
  { solution_name: "ServiceNow Integration Hub", vendor: "ServiceNow Inc", solution_type: "saas", description: "iPaaS-style integration capabilities on the Now Platform.", primary: ["IPAAS"] },
  { solution_name: "ServiceNow App Engine", vendor: "ServiceNow Inc", solution_type: "saas", description: "Low-code application development on the Now Platform.", primary: ["LCAP"] },
  { solution_name: "ServiceNow RPA Hub", vendor: "ServiceNow Inc", solution_type: "saas", description: "Robotic process automation natively on the Now Platform.", primary: ["RPA"] },
  { solution_name: "ServiceNow Document Intelligence", vendor: "ServiceNow Inc", solution_type: "saas", description: "Document classification and extraction for unstructured input.", primary: ["IDP"] },
  { solution_name: "ServiceNow Process Mining", vendor: "ServiceNow Inc", solution_type: "saas", description: "Event-log-based process discovery and conformance.", primary: ["PROC-MIN"] },
  { solution_name: "ServiceNow Telecommunications Workflows", vendor: "ServiceNow Inc", solution_type: "saas", description: "TMT industry workflows: service, order, and inventory.", primary: ["TELCO-BSS"] },
  { solution_name: "ServiceNow Financial Services Operations", vendor: "ServiceNow Inc", solution_type: "saas", description: "Banking and insurance workflow accelerators.", primary: ["BANK-OPS"], secondary: ["INS-CLAIMS"] },
  { solution_name: "ServiceNow Healthcare and Life Sciences", vendor: "ServiceNow Inc", solution_type: "saas", description: "Patient operations, clinical-device management workflows.", primary: ["HC-PATIENT"], secondary: ["CLIN-DEV"] },
  { solution_name: "ServiceNow Public Sector Digital Services", vendor: "ServiceNow Inc", solution_type: "saas", description: "Citizen services, licensing, and case management for government.", primary: ["PS-LIC"] },
  { solution_name: "ServiceNow Manufacturing Connected Operations", vendor: "ServiceNow Inc", solution_type: "saas", description: "Production case management and operator workflows.", primary: ["MFG-OPS"] },
  { solution_name: "ServiceNow Retail Operations", vendor: "ServiceNow Inc", solution_type: "saas", description: "Store-associate workflows and retail-task management.", primary: ["RET-STORE"] },
  { solution_name: "ServiceNow Clinical Device Management", vendor: "ServiceNow Inc", solution_type: "saas", description: "Medical-device asset, maintenance, and recall workflows.", primary: ["CLIN-DEV"] },
  { solution_name: "ServiceNow Cloud Observability", vendor: "ServiceNow Inc", solution_type: "saas", description: "Lightstep-based observability for distributed systems.", primary: ["OBS"] },
  { solution_name: "ServiceNow AIOps", vendor: "ServiceNow Inc", solution_type: "saas", description: "ML-driven event correlation and predictive operations.", primary: ["AIOPS"] },

  // ====== ITSM competitors ======
  { solution_name: "Jira Service Management", vendor: "Atlassian", solution_type: "saas", solution_url: "https://www.atlassian.com/software/jira/service-management", description: "ITSM and ESM on the Atlassian platform.", primary: ["ITSM"], secondary: ["KMS"] },
  { solution_name: "Freshservice", vendor: "Freshworks", solution_type: "saas", solution_url: "https://www.freshworks.com/freshservice/", description: "ITSM and ESM platform.", primary: ["ITSM"] },
  { solution_name: "Ivanti Neurons for ITSM", vendor: "Ivanti", solution_type: "saas", description: "Cloud-native ITSM platform.", primary: ["ITSM"] },
  { solution_name: "BMC Helix ITSM", vendor: "BMC Software", solution_type: "saas", description: "Service management on BMC Helix.", primary: ["ITSM"] },

  // ====== ITOM / Discovery / AIOps / Observability ======
  { solution_name: "BMC Helix Discovery", vendor: "BMC Software", solution_type: "saas", description: "Agentless discovery and dependency mapping.", primary: ["DISCOVERY"], secondary: ["CMDB"] },
  { solution_name: "Device42 Discovery and CMDB", vendor: "Device42", solution_type: "hybrid", description: "Discovery, dependency mapping, and CMDB.", primary: ["DISCOVERY", "CMDB"] },
  { solution_name: "Datadog Platform", vendor: "Datadog", solution_type: "saas", description: "Observability across infrastructure, APM, logs, and security.", primary: ["OBS"], secondary: ["AIOPS"] },
  { solution_name: "Dynatrace Platform", vendor: "Dynatrace", solution_type: "saas", description: "AI-driven observability and application performance.", primary: ["OBS"], secondary: ["AIOPS"] },
  { solution_name: "BigPanda AIOps", vendor: "BigPanda", solution_type: "saas", description: "Event correlation and incident management for IT operations.", primary: ["AIOPS"] },
  { solution_name: "New Relic One", vendor: "New Relic", solution_type: "saas", description: "Full-stack observability platform.", primary: ["OBS"] },
  { solution_name: "Splunk Observability Cloud", vendor: "Splunk", solution_type: "saas", description: "Splunk APM, infrastructure monitoring, and log observability.", primary: ["OBS"] },

  // ====== ITAM / SAM / HAM / FinOps / EAM ======
  { solution_name: "Flexera One", vendor: "Flexera", solution_type: "saas", description: "ITAM, SAM, and FinOps platform.", primary: ["ITAM", "SAM"], secondary: ["FINOPS", "HAM"] },
  { solution_name: "Snow License Manager", vendor: "Snow Software", solution_type: "saas", description: "Software-asset management and entitlement reconciliation.", primary: ["SAM"] },
  { solution_name: "USU Software Asset Management", vendor: "USU Software", solution_type: "saas", description: "SAM with audit-defence focus.", primary: ["SAM"] },
  { solution_name: "Lansweeper", vendor: "Lansweeper", solution_type: "saas", description: "Network discovery, hardware and software asset inventory.", primary: ["HAM"], secondary: ["DISCOVERY", "SAM"] },
  { solution_name: "Apptio Cloudability", vendor: "IBM", solution_type: "saas", description: "Cloud-financial management and FinOps platform.", primary: ["FINOPS"] },
  { solution_name: "CloudHealth", vendor: "Broadcom", solution_type: "saas", description: "Cloud-cost-management platform.", primary: ["FINOPS"] },
  { solution_name: "Finout", vendor: "Finout", solution_type: "saas", description: "Unified FinOps platform across cloud and SaaS spend.", primary: ["FINOPS"] },
  { solution_name: "IBM Maximo Application Suite", vendor: "IBM", solution_type: "saas", description: "Enterprise asset management for plant, fleet, and infrastructure.", primary: ["EAM"] },
  { solution_name: "Hexagon EAM", vendor: "Hexagon", solution_type: "hybrid", description: "Enterprise asset management for asset-intensive industries.", primary: ["EAM"] },
  { solution_name: "IFS Cloud EAM", vendor: "IFS", solution_type: "saas", description: "Enterprise asset management module of IFS Cloud.", primary: ["EAM"], secondary: ["FSM"] },

  // ====== APM / SPM ======
  { solution_name: "LeanIX Enterprise Architecture", vendor: "SAP SE", solution_type: "saas", description: "Application-portfolio and enterprise-architecture management.", primary: ["APM"] },
  { solution_name: "MEGA HOPEX", vendor: "MEGA International", solution_type: "saas", description: "Enterprise architecture, IT portfolio, and GRC suite.", primary: ["APM"], secondary: ["GRC"] },
  { solution_name: "Software AG Alfabet", vendor: "Software AG", solution_type: "hybrid", description: "IT-portfolio and enterprise-architecture management.", primary: ["APM"] },
  { solution_name: "Ardoq", vendor: "Ardoq", solution_type: "saas", description: "Data-driven enterprise architecture and APM.", primary: ["APM"] },
  { solution_name: "Apptio IT Planning Foundation", vendor: "IBM", solution_type: "saas", description: "Technology business management and IT portfolio planning.", primary: ["APM"], secondary: ["SPM"] },
  { solution_name: "Planview Portfolios", vendor: "Planview", solution_type: "saas", description: "Strategic portfolio and resource management.", primary: ["SPM"] },
  { solution_name: "Clarity PPM", vendor: "Broadcom", solution_type: "saas", description: "Project and portfolio management platform.", primary: ["SPM"] },
  { solution_name: "Asana", vendor: "Asana", solution_type: "saas", description: "Work and portfolio management platform.", primary: ["SPM"] },
  { solution_name: "Smartsheet", vendor: "Smartsheet", solution_type: "saas", description: "Work and portfolio management on a familiar grid metaphor.", primary: ["SPM"] },
  { solution_name: "Microsoft Project for the Web", vendor: "Microsoft", solution_type: "saas", description: "Project and portfolio management on Microsoft 365.", primary: ["SPM"] },
  { solution_name: "Jira Align", vendor: "Atlassian", solution_type: "saas", description: "Enterprise-agile and SAFe portfolio planning.", primary: ["SPM"] },

  // ====== Test Management ======
  { solution_name: "TestRail", vendor: "Idera", solution_type: "saas", description: "Test-case management for QA teams.", primary: ["TEST-MGMT"] },
  { solution_name: "Xray for Jira", vendor: "Xpand IT", solution_type: "saas", description: "Test management deeply integrated with Jira.", primary: ["TEST-MGMT"] },
  { solution_name: "Zephyr Scale", vendor: "SmartBear", solution_type: "saas", description: "Enterprise test management for Jira.", primary: ["TEST-MGMT"] },
  { solution_name: "Tricentis qTest", vendor: "Tricentis", solution_type: "saas", description: "Enterprise test-management platform.", primary: ["TEST-MGMT"] },

  // ====== SOAR / SecOps / Vuln / Threat Intel ======
  { solution_name: "Splunk SOAR", vendor: "Splunk", solution_type: "saas", description: "Security orchestration, automation, and response.", primary: ["SOAR"] },
  { solution_name: "Palo Alto Cortex XSOAR", vendor: "Palo Alto Networks", solution_type: "saas", description: "SOAR and threat-intelligence platform.", primary: ["SOAR"], secondary: ["THREAT-INTEL"] },
  { solution_name: "Tines", vendor: "Tines", solution_type: "saas", description: "No-code automation for security operations.", primary: ["SOAR"] },
  { solution_name: "Tenable One", vendor: "Tenable", solution_type: "saas", description: "Exposure-management platform across IT, OT, cloud.", primary: ["VULN-MGMT"] },
  { solution_name: "Qualys VMDR", vendor: "Qualys", solution_type: "saas", description: "Vulnerability management, detection, and response.", primary: ["VULN-MGMT"] },
  { solution_name: "Rapid7 InsightVM", vendor: "Rapid7", solution_type: "saas", description: "Vulnerability management and risk prioritisation.", primary: ["VULN-MGMT"] },
  { solution_name: "Wiz Cloud Security Platform", vendor: "Wiz", solution_type: "saas", description: "Cloud-native application protection (CNAPP).", primary: ["VULN-MGMT"] },
  { solution_name: "Recorded Future Intelligence Cloud", vendor: "Recorded Future", solution_type: "saas", description: "Threat-intelligence platform.", primary: ["THREAT-INTEL"] },
  { solution_name: "Anomali ThreatStream", vendor: "Anomali", solution_type: "saas", description: "Threat-intelligence management platform.", primary: ["THREAT-INTEL"] },
  { solution_name: "ThreatConnect Platform", vendor: "ThreatConnect", solution_type: "saas", description: "Threat-intelligence and SOAR platform.", primary: ["THREAT-INTEL"], secondary: ["SOAR"] },

  // ====== GRC / Audit / BCM / Resilience / TPRM / Privacy / ESG ======
  { solution_name: "Archer Suite", vendor: "Archer", solution_type: "hybrid", description: "Integrated risk management suite.", primary: ["GRC"], secondary: ["AUDIT", "TPRM", "BCM"] },
  { solution_name: "MetricStream Connected GRC", vendor: "MetricStream", solution_type: "saas", description: "Enterprise GRC and IRM platform.", primary: ["GRC"], secondary: ["AUDIT", "TPRM"] },
  { solution_name: "OneTrust GRC", vendor: "OneTrust", solution_type: "saas", description: "GRC and policy management module of OneTrust.", primary: ["GRC"] },
  { solution_name: "LogicGate Risk Cloud", vendor: "LogicGate", solution_type: "saas", description: "No-code GRC and IRM platform.", primary: ["GRC"] },
  { solution_name: "Diligent One Platform", vendor: "Diligent", solution_type: "saas", description: "Governance, risk, audit, and ESG platform.", primary: ["GRC"], secondary: ["AUDIT", "ESG"] },
  { solution_name: "AuditBoard", vendor: "AuditBoard", solution_type: "saas", description: "Audit, risk, and compliance platform.", primary: ["AUDIT"], secondary: ["GRC"] },
  { solution_name: "Workiva Platform", vendor: "Workiva", solution_type: "saas", description: "Connected reporting for financial, ESG, audit, and risk.", primary: ["AUDIT"], secondary: ["ESG", "GRC"] },
  { solution_name: "Wolters Kluwer TeamMate+", vendor: "Wolters Kluwer", solution_type: "saas", description: "Audit-management platform.", primary: ["AUDIT"] },
  { solution_name: "Fusion Framework System", vendor: "Fusion Risk Management", solution_type: "saas", description: "Business-continuity and operational-resilience platform.", primary: ["BCM"], secondary: ["OP-RES"] },
  { solution_name: "Castellan", vendor: "Castellan Solutions", solution_type: "saas", description: "Business-continuity-management platform.", primary: ["BCM"] },
  { solution_name: "Riskonnect Platform", vendor: "Riskonnect", solution_type: "saas", description: "Integrated risk and resilience platform.", primary: ["GRC"], secondary: ["BCM", "OP-RES"] },
  { solution_name: "OneTrust Third-Party Risk", vendor: "OneTrust", solution_type: "saas", description: "Vendor and TPRM module of OneTrust.", primary: ["TPRM"] },
  { solution_name: "ProcessUnity Vendor Risk", vendor: "ProcessUnity", solution_type: "saas", description: "Third-party-risk-management platform.", primary: ["TPRM"] },
  { solution_name: "Prevalent TPRM", vendor: "Prevalent", solution_type: "saas", description: "Third-party-risk-management platform.", primary: ["TPRM"] },
  { solution_name: "Whistic", vendor: "Whistic", solution_type: "saas", description: "Vendor security assessment exchange and TPRM.", primary: ["TPRM"] },
  { solution_name: "OneTrust Privacy", vendor: "OneTrust", solution_type: "saas", description: "Privacy management, DSAR, and consent.", primary: ["PRIV-MGMT"] },
  { solution_name: "TrustArc", vendor: "TrustArc", solution_type: "saas", description: "Privacy management and consent platform.", primary: ["PRIV-MGMT"] },
  { solution_name: "Securiti Data Command Center", vendor: "Securiti", solution_type: "saas", description: "Data privacy, security, and AI governance.", primary: ["PRIV-MGMT"] },
  { solution_name: "Persefoni Climate Platform", vendor: "Persefoni", solution_type: "saas", description: "Carbon accounting and climate reporting.", primary: ["ESG"] },
  { solution_name: "Sphera ESG", vendor: "Sphera", solution_type: "saas", description: "ESG management and EHS reporting.", primary: ["ESG"] },
  { solution_name: "IBM Envizi ESG Suite", vendor: "IBM", solution_type: "saas", description: "ESG and sustainability data and reporting platform.", primary: ["ESG"] },

  // ====== HRSD / Workplace / Visitor ======
  { solution_name: "Workday Help", vendor: "Workday", solution_type: "saas", description: "Employee case management embedded in Workday HCM.", primary: ["HRSD"] },
  { solution_name: "Applaud", vendor: "Applaud HR", solution_type: "saas", description: "Employee-experience and HRSD platform.", primary: ["HRSD"] },
  { solution_name: "Enboarder", vendor: "Enboarder", solution_type: "saas", description: "Employee onboarding and journey orchestration.", primary: ["HRSD"] },
  { solution_name: "Sapling", vendor: "Kallidus", solution_type: "saas", description: "Onboarding and HR-operations platform.", primary: ["HRSD"] },
  { solution_name: "Leena AI", vendor: "Leena AI", solution_type: "saas", description: "AI-driven employee experience and HR case automation.", primary: ["HRSD"], secondary: ["CONV-AI"] },
  { solution_name: "Eptura Workplace", vendor: "Eptura", solution_type: "saas", description: "Workplace, asset, and visitor management.", primary: ["IWMS"] },
  { solution_name: "Robin", vendor: "Robin", solution_type: "saas", description: "Workplace experience and hybrid office.", primary: ["IWMS"] },
  { solution_name: "Envoy Workplace", vendor: "Envoy", solution_type: "saas", description: "Visitor, workplace, and desk management.", primary: ["VIS-MGMT"], secondary: ["IWMS"] },
  { solution_name: "Proxyclick", vendor: "Proxyclick", solution_type: "saas", description: "Enterprise visitor-management platform.", primary: ["VIS-MGMT"] },
  { solution_name: "SwipedOn", vendor: "SwipedOn", solution_type: "saas", description: "Workplace sign-in and visitor management.", primary: ["VIS-MGMT"] },

  // ====== Legal / CLM ======
  { solution_name: "Litera", vendor: "Litera", solution_type: "saas", description: "Legal drafting, workflow, and transactions platform.", primary: ["LSD"] },
  { solution_name: "iManage Cloud", vendor: "iManage", solution_type: "saas", description: "Legal document and knowledge management.", primary: ["LSD"], secondary: ["KMS"] },
  { solution_name: "LawVu", vendor: "LawVu", solution_type: "saas", description: "In-house legal operations and matter management.", primary: ["LSD"] },
  { solution_name: "Onit Enterprise Legal Management", vendor: "Onit", solution_type: "saas", description: "Legal-operations and CLM platform.", primary: ["LSD"], secondary: ["CLM"] },
  { solution_name: "Icertis Contract Intelligence", vendor: "Icertis", solution_type: "saas", description: "Enterprise CLM platform.", primary: ["CLM"] },
  { solution_name: "Ironclad", vendor: "Ironclad", solution_type: "saas", description: "Digital contracting CLM platform.", primary: ["CLM"] },
  { solution_name: "Agiloft CLM", vendor: "Agiloft", solution_type: "saas", description: "No-code CLM platform.", primary: ["CLM"] },
  { solution_name: "DocuSign CLM", vendor: "DocuSign", solution_type: "saas", description: "Contract lifecycle management built on DocuSign.", primary: ["CLM"] },

  // ====== Procurement / S2P / Supplier / AP ======
  { solution_name: "Coupa Business Spend Management", vendor: "Coupa", solution_type: "saas", description: "Source-to-pay and travel-and-expense platform.", primary: ["S2P"], secondary: ["SUP-LIFE", "AP-AUTO"] },
  { solution_name: "SAP Ariba", vendor: "SAP SE", solution_type: "saas", description: "Source-to-pay and supplier-network platform.", primary: ["S2P"], secondary: ["SUP-LIFE"] },
  { solution_name: "Ivalua Platform", vendor: "Ivalua", solution_type: "saas", description: "Source-to-pay procurement platform.", primary: ["S2P"], secondary: ["SUP-LIFE"] },
  { solution_name: "Jaggaer ONE", vendor: "Jaggaer", solution_type: "saas", description: "Source-to-pay procurement platform.", primary: ["S2P"], secondary: ["SUP-LIFE"] },
  { solution_name: "HICX Supplier Experience Platform", vendor: "HICX", solution_type: "saas", description: "Supplier master data and lifecycle management.", primary: ["SUP-LIFE"] },
  { solution_name: "Tipalti", vendor: "Tipalti", solution_type: "saas", description: "Accounts-payable automation and global payments.", primary: ["AP-AUTO"] },
  { solution_name: "AvidXchange", vendor: "AvidXchange", solution_type: "saas", description: "AP automation for mid-market.", primary: ["AP-AUTO"] },
  { solution_name: "Stampli", vendor: "Stampli", solution_type: "saas", description: "AP automation with collaboration on invoices.", primary: ["AP-AUTO"] },
  { solution_name: "BILL AP", vendor: "BILL", solution_type: "saas", description: "AP and spend management for SMB and mid-market.", primary: ["AP-AUTO"] },

  // ====== CSM / FSM / OMS / Conv AI ======
  { solution_name: "Salesforce Service Cloud", vendor: "Salesforce Inc", solution_type: "saas", description: "Customer-service case and engagement platform.", primary: ["CSM"], secondary: ["KMS"] },
  { solution_name: "Zendesk Suite", vendor: "Zendesk", solution_type: "saas", description: "Customer-service and support platform.", primary: ["CSM"] },
  { solution_name: "Freshdesk", vendor: "Freshworks", solution_type: "saas", description: "Customer-support platform.", primary: ["CSM"] },
  { solution_name: "Intercom", vendor: "Intercom", solution_type: "saas", description: "AI-first customer-support and engagement.", primary: ["CSM"], secondary: ["CONV-AI"] },
  { solution_name: "Salesforce Field Service", vendor: "Salesforce Inc", solution_type: "saas", description: "Field-service-management on the Salesforce platform.", primary: ["FSM"] },
  { solution_name: "IFS Cloud Field Service", vendor: "IFS", solution_type: "saas", description: "Enterprise field-service management.", primary: ["FSM"] },
  { solution_name: "PTC ServiceMax", vendor: "PTC", solution_type: "saas", description: "Field-service-management for asset-centric industries.", primary: ["FSM"] },
  { solution_name: "Jobber", vendor: "Jobber", solution_type: "saas", description: "Field-service-management for home-service businesses.", primary: ["FSM"] },
  { solution_name: "Praxedo", vendor: "Praxedo", solution_type: "saas", description: "Field-service-management platform.", primary: ["FSM"] },
  { solution_name: "Salesforce Order Management", vendor: "Salesforce Inc", solution_type: "saas", description: "Distributed order management on Salesforce.", primary: ["OMS"] },
  { solution_name: "IBM Sterling Order Management", vendor: "IBM", solution_type: "hybrid", description: "Enterprise distributed order management.", primary: ["OMS"] },
  { solution_name: "Ada", vendor: "Ada", solution_type: "saas", description: "Generative-AI customer-service automation.", primary: ["CONV-AI"], secondary: ["CSM"] },
  { solution_name: "Kore.ai XO Platform", vendor: "Kore.ai", solution_type: "saas", description: "Enterprise conversational and generative-AI platform.", primary: ["CONV-AI"] },
  { solution_name: "Cognigy.AI", vendor: "Cognigy", solution_type: "saas", description: "Conversational AI for contact centers.", primary: ["CONV-AI"] },

  // ====== Telco / Banking / Insurance / Healthcare / Public / Mfg / Retail / Utilities / Clinical ======
  { solution_name: "Amdocs CES", vendor: "Amdocs", solution_type: "hybrid", description: "Customer experience and BSS suite for telcos.", primary: ["TELCO-BSS"] },
  { solution_name: "Netcracker Digital BSS", vendor: "Netcracker", solution_type: "hybrid", description: "BSS suite for service providers.", primary: ["TELCO-BSS"] },
  { solution_name: "Blue Planet", vendor: "Ciena", solution_type: "saas", description: "Telco automation and inventory platform.", primary: ["TELCO-BSS"] },
  { solution_name: "nCino Bank Operating System", vendor: "nCino", solution_type: "saas", description: "Cloud-native banking operating system.", primary: ["BANK-OPS"] },
  { solution_name: "Backbase Engagement Banking", vendor: "Backbase", solution_type: "saas", description: "Customer-engagement platform for banks.", primary: ["BANK-OPS"] },
  { solution_name: "Guidewire ClaimCenter", vendor: "Guidewire", solution_type: "saas", description: "P&C insurance claims core system.", primary: ["INS-CLAIMS"] },
  { solution_name: "Duck Creek Claims", vendor: "Duck Creek Technologies", solution_type: "saas", description: "P&C insurance claims core system.", primary: ["INS-CLAIMS"] },
  { solution_name: "Sapiens IDIT", vendor: "Sapiens", solution_type: "saas", description: "Insurance claims and policy administration.", primary: ["INS-CLAIMS"] },
  { solution_name: "Epic Electronic Health Record", vendor: "Epic Systems", solution_type: "on_prem", description: "Electronic health record and patient platform.", primary: ["HC-PATIENT"] },
  { solution_name: "Salesforce Health Cloud", vendor: "Salesforce Inc", solution_type: "saas", description: "Patient relationship and care management platform.", primary: ["HC-PATIENT"] },
  { solution_name: "Innovaccer Health Cloud", vendor: "Innovaccer", solution_type: "saas", description: "Healthcare data activation and patient experience.", primary: ["HC-PATIENT"] },
  { solution_name: "Accela Civic Platform", vendor: "Accela", solution_type: "saas", description: "Licensing, permitting, and citizen-services for government.", primary: ["PS-LIC"] },
  { solution_name: "Tyler Enterprise ERP", vendor: "Tyler Technologies", solution_type: "saas", description: "ERP and permitting for state and local government.", primary: ["PS-LIC"] },
  { solution_name: "OpenGov Permitting and Licensing", vendor: "OpenGov", solution_type: "saas", description: "Cloud government platform for permitting and licensing.", primary: ["PS-LIC"] },
  { solution_name: "PTC ThingWorx", vendor: "PTC", solution_type: "hybrid", description: "Industrial IoT and connected-operations platform.", primary: ["MFG-OPS"] },
  { solution_name: "Tulip Frontline Operations", vendor: "Tulip Interfaces", solution_type: "saas", description: "Frontline-operations platform for manufacturing.", primary: ["MFG-OPS"] },
  { solution_name: "Plex Smart Manufacturing Platform", vendor: "Rockwell Automation", solution_type: "saas", description: "Cloud MES and ERP for manufacturing.", primary: ["MFG-OPS"] },
  { solution_name: "Reflexis ONE", vendor: "Zebra Technologies", solution_type: "saas", description: "Store execution, task, and workforce management.", primary: ["RET-STORE"] },
  { solution_name: "NewStore Omnichannel Platform", vendor: "NewStore", solution_type: "saas", description: "Mobile store and omnichannel platform for retailers.", primary: ["RET-STORE"], secondary: ["OMS"] },
  { solution_name: "Oracle Utilities Opower", vendor: "Oracle", solution_type: "saas", description: "Customer-engagement and energy-efficiency platform for utilities.", primary: ["UTIL-OPS"] },
  { solution_name: "Itron Enterprise Edition", vendor: "Itron", solution_type: "hybrid", description: "Meter data management and utility operations.", primary: ["UTIL-OPS"] },
  { solution_name: "SAP S/4HANA Utilities", vendor: "SAP SE", solution_type: "hybrid", description: "ERP for utilities (former IS-U).", primary: ["UTIL-OPS"] },

  // ====== Identity Governance ======
  { solution_name: "SailPoint Identity Security Cloud", vendor: "SailPoint", solution_type: "saas", description: "Identity-governance and administration platform.", primary: ["IGA"] },
  { solution_name: "Saviynt Enterprise Identity Cloud", vendor: "Saviynt", solution_type: "saas", description: "Cloud identity-governance and access management.", primary: ["IGA"] },

  // ====== Integration / iPaaS / Low-Code / RPA / IDP / Process Mining ======
  { solution_name: "MuleSoft Anypoint Platform", vendor: "Salesforce Inc", solution_type: "saas", description: "iPaaS integration and API platform.", primary: ["IPAAS"] },
  { solution_name: "Boomi Platform", vendor: "Boomi", solution_type: "saas", description: "iPaaS integration and automation platform.", primary: ["IPAAS"] },
  { solution_name: "Workato", vendor: "Workato", solution_type: "saas", description: "iPaaS and enterprise automation platform.", primary: ["IPAAS"] },
  { solution_name: "OutSystems", vendor: "OutSystems", solution_type: "saas", description: "Low-code application platform.", primary: ["LCAP"] },
  { solution_name: "Mendix", vendor: "Siemens", solution_type: "saas", description: "Low-code application platform.", primary: ["LCAP"] },
  { solution_name: "Microsoft Power Platform", vendor: "Microsoft", solution_type: "saas", description: "Low-code apps, automation, and AI on Microsoft 365.", primary: ["LCAP"], secondary: ["RPA"] },
  { solution_name: "UiPath Business Automation Platform", vendor: "UiPath", solution_type: "saas", description: "RPA, IDP, and process-mining platform.", primary: ["RPA"], secondary: ["IDP", "PROC-MIN"] },
  { solution_name: "Automation Anywhere 360", vendor: "Automation Anywhere", solution_type: "saas", description: "RPA and intelligent automation platform.", primary: ["RPA"] },
  { solution_name: "SS&C Blue Prism", vendor: "SS&C Blue Prism", solution_type: "hybrid", description: "RPA and enterprise automation.", primary: ["RPA"] },
  { solution_name: "ABBYY Vantage", vendor: "ABBYY", solution_type: "saas", description: "Intelligent-document-processing platform.", primary: ["IDP"] },
  { solution_name: "Hyperscience", vendor: "Hyperscience", solution_type: "saas", description: "Document automation platform.", primary: ["IDP"] },
  { solution_name: "Rossum", vendor: "Rossum", solution_type: "saas", description: "AI-powered transactional-document processing.", primary: ["IDP"] },
  { solution_name: "Instabase Platform", vendor: "Instabase", solution_type: "saas", description: "Unstructured-data and document-processing platform.", primary: ["IDP"] },
  { solution_name: "Celonis Execution Management System", vendor: "Celonis", solution_type: "saas", description: "Process mining and execution management.", primary: ["PROC-MIN"] },
  { solution_name: "SAP Signavio Process Intelligence", vendor: "SAP SE", solution_type: "saas", description: "Process mining and business-process management.", primary: ["PROC-MIN"] },
];

// ============================================================
// RUN
// ============================================================

async function main() {
  console.log("\n=== Domains (top-level) ===");
  const topDomainMap = await syncTable(
    "/domains",
    topDomains.map(d => ({ ...d, record_status: "new" })),
    "domain_code",
  );

  console.log("\n=== Domains (sub) ===");
  const subRows = subDomains.map(d => {
    const parentId = topDomainMap.get(d.parent);
    if (!parentId) throw new Error(`Parent domain ${d.parent} not found for ${d.domain_code}`);
    return {
      domain_code: d.domain_code,
      domain_name: d.domain_name,
      description: d.description,
      parent_domain_id: parentId,
      record_status: "new",
    };
  });
  const allDomainMap = await syncTable("/domains", subRows, "domain_code");
  // merge: syncTable already reads all rows, so allDomainMap contains both top and sub
  // but our sync did the read on /domains so it has everything

  console.log("\n=== Vendors ===");
  const vendorMap = await syncTable(
    "/vendors",
    vendors.map(v => ({ ...v, record_status: "approved", notes: "" })),
    "vendor_name",
  );

  console.log("\n=== Solutions ===");
  const solutionRows = solutions.map(s => {
    const vendorId = vendorMap.get(s.vendor);
    if (!vendorId) throw new Error(`Vendor not found for solution ${s.solution_name}: ${s.vendor}`);
    return {
      solution_name: s.solution_name,
      description: s.description,
      solution_url: s.solution_url ?? "",
      vendor_id: vendorId,
      solution_type: s.solution_type,
      is_active_in_market: true,
      record_status: "new",
      notes: "",
    };
  });
  const solutionMap = await syncTable("/solutions", solutionRows, "solution_name");

  console.log("\n=== Solution Domains ===");
  // Read existing junctions so we don't duplicate
  const existingLinks = await get("/solution_domains?select=solution_id,domain_id,coverage_level&limit=10000");
  const existingLinkSet = new Set(
    existingLinks.map(r => `${r.solution_id}:${r.domain_id}:${r.coverage_level}`),
  );

  const newLinks: Row[] = [];
  let skipped = 0;
  for (const s of solutions) {
    const sid = solutionMap.get(s.solution_name);
    if (!sid) throw new Error(`Solution id missing for ${s.solution_name}`);
    const buildLink = (code: string, coverage: "primary" | "secondary" | "partial") => {
      const did = allDomainMap.get(code);
      if (!did) { console.warn(`  ! domain ${code} not found for ${s.solution_name}`); return; }
      const key = `${sid}:${did}:${coverage}`;
      if (existingLinkSet.has(key)) { skipped++; return; }
      existingLinkSet.add(key);
      newLinks.push({
        solution_id: sid,
        domain_id: did,
        coverage_level: coverage,
        record_status: "new",
        notes: "",
      });
    };
    for (const code of s.primary ?? []) buildLink(code, "primary");
    for (const code of s.secondary ?? []) buildLink(code, "secondary");
    for (const code of s.partial ?? []) buildLink(code, "partial");
  }
  if (newLinks.length > 0) {
    console.log(`  inserting ${newLinks.length} new solution_domains rows (${skipped} already present)`);
    await insert("/solution_domains", newLinks);
  } else {
    console.log(`  no new solution_domains links to insert (${skipped} already present)`);
  }

  // Final counts
  const counts = {
    domains: (await get("/domains?select=id&limit=10000")).length,
    vendors: (await get("/vendors?select=id&limit=10000")).length,
    solutions: (await get("/solutions?select=id&limit=10000")).length,
    solution_domains: (await get("/solution_domains?select=solution_id&limit=10000")).length,
  };
  console.log("\n=== Final row counts ===");
  console.log(counts);
}

await main();
console.log("Done.");
