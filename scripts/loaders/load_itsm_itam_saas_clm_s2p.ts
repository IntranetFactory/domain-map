#!/usr/bin/env bun
// Combined load of ITSM, ITAM-umbrella, HAM, SAM, SMP, CLM, S2P data_objects
// — plus multi-master signals (Signal 1) and cross-domain handoffs (Signal 2)
// for the SaaS spend lifecycle and the ITSM cluster.
//
// Reshape note: software_titles / software_licenses / software_installations
// master at SAM (the sub-domain) rather than ITAM-umbrella. hardware_assets
// masters at HAM. ITAM-umbrella retains only the genuinely cross-cutting
// objects (asset_contracts, asset_lifecycle_events).
//
// Idempotent throughout: each step reads current state before writing.

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function semCall(body: Row): Promise<Row[]> {
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
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius call failed (exit ${code}): ${stderr}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}

const get = (path: string) => semCall({ method: "GET", path });
const post = (path: string, body: Row | Row[]) => semCall({ method: "POST", path, body });

async function insertChunked(path: string, rows: Row[]): Promise<void> {
  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    if (slice.length > 0) await post(path, slice);
  }
}

async function syncByKey<T extends Row>(
  path: string,
  rows: T[],
  keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=20000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  ${path}: inserting ${missing.length} new (${existing.length} existed)`);
    await insertChunked(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} already present`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=20000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// Resolve domain ids
const domainRows = await get(
  "/domains?domain_code=in.(ITSM,ITAM,HAM,SAM,SMP,CLM,S2P,CMDB,DISCOVERY,ITOM,SECOPS,VULN-MGMT,HRSD,ONBOARDING,HCM,IGA,EXPENSE,PA,FINOPS,LSD,GRC,SUP-LIFE)&select=id,domain_code",
);
const did = (code: string) => {
  const r = domainRows.find(d => d.domain_code === code);
  if (!r) throw new Error(`domain ${code} not in catalog`);
  return Number(r.id);
};

// =============================================================================
// PHASE 1 — data_objects (29 new)
// =============================================================================
console.log("\n=== Phase 1: data_objects ===");

type ObjSpec = { data_object_name: string; singular_label?: string; plural_label?: string; display_label: string; description: string; master_domain: string };

const allObjects: ObjSpec[] = [
  // ----- ITSM -----
  {
    data_object_name: "incidents",
    singular_label: "Incident",
    plural_label: "Incidents",
    display_label: "Incident",
    description: "Unplanned interruption of, or quality reduction to, a service. Carries severity, priority, category, assignee, affected CI(s), and the MTTR clock. The flagship ITSM work item. ITOM and SECOPS feed in (events become incidents, security alerts become incidents).",
    master_domain: "ITSM",
  },
  {
    data_object_name: "service_requests",
    singular_label: "Service Request",
    plural_label: "Service Requests",
    display_label: "Service Request",
    description: "Planned, catalog-driven request: access, hardware, software, information. Distinct from incidents — incidents are reactive, service requests are proactive. The fulfilment for many requests crosses domains (provisioning ↔ IGA, asset assignment ↔ ITAM, HR exception ↔ HRSD).",
    master_domain: "ITSM",
  },
  {
    data_object_name: "problems",
    singular_label: "Problem",
    plural_label: "Problems",
    display_label: "Problem",
    description: "Root-cause record for one or more incidents that recur or share a pattern. Carries known-error workaround, permanent fix candidate, and links to the change that will resolve it. Problem management is a discipline mature ITSM tools support but most orgs underuse.",
    master_domain: "ITSM",
  },
  {
    data_object_name: "changes",
    singular_label: "Change",
    plural_label: "Changes",
    display_label: "Change",
    description: "Planned modification to a service or configuration item. Carries change type (standard, normal, emergency), risk score, CAB approval state, implementation window, and back-out plan. The boundary object between ITSM and CMDB — CIs are updated as a result of an executed change.",
    master_domain: "ITSM",
  },
  {
    data_object_name: "knowledge_articles",
    singular_label: "Knowledge Article",
    plural_label: "Knowledge Articles",
    display_label: "Knowledge Article",
    description: "KB content backing both self-service portals and agent-assist tooling. Lifecycle: draft → review → published → retired. Quality and freshness are the silent ITSM KPIs that drive deflection rate.",
    master_domain: "ITSM",
  },
  {
    data_object_name: "service_catalog_items",
    singular_label: "Service Catalog Item",
    plural_label: "Service Catalog Items",
    display_label: "Service Catalog Item",
    description: "Definition of what can be requested: the form schema, fulfilment workflow, approval routing, SLA, and the price/charge-back rules. Each service request instance references a catalog item.",
    master_domain: "ITSM",
  },
  {
    data_object_name: "slas",
    singular_label: "SLA",
    plural_label: "SLAs",
    display_label: "SLA",
    description: "Service-level agreement record: response-time, resolution-time, and availability targets per priority / category / customer tier. SLAs attach to incidents, service requests, and changes; breach metrics roll up to operational KPIs.",
    master_domain: "ITSM",
  },
  // ----- ITAM umbrella (cross-cutting only) -----
  {
    data_object_name: "asset_contracts",
    singular_label: "Asset Contract",
    plural_label: "Asset Contracts",
    display_label: "Asset Contract",
    description: "Lease, maintenance, support, or warranty contract governing an asset or pool of assets. Distinct from contract templates / signature artifacts (CLM-mastered): this is the ITAM-side index of contracts attached to physical or software assets. ITAM contributes the asset-pool linkage; CLM masters the contract document itself.",
    master_domain: "ITAM",
  },
  {
    data_object_name: "asset_lifecycle_events",
    singular_label: "Asset Lifecycle Event",
    plural_label: "Asset Lifecycle Events",
    display_label: "Asset Lifecycle Event",
    description: "Cross-cutting lifecycle audit log applicable to hardware, software, and SaaS assets: procurement, deployment, transfer, retirement, disposal. ITSM (incident-driven failure events), HCM (employee termination → recall), and Onboarding (provisioning) all contribute events.",
    master_domain: "ITAM",
  },
  // ----- HAM -----
  {
    data_object_name: "hardware_assets",
    singular_label: "Hardware Asset",
    plural_label: "Hardware Assets",
    display_label: "Hardware Asset",
    description: "Physical IT asset: laptop, desktop, server, mobile, network gear, peripheral. Carries serial number, MAC/asset tag, current user / location / room, lifecycle state, depreciation schedule, and procurement reference. The HAM master; CMDB models the same physical thing as a CI for the operational/topology view.",
    master_domain: "HAM",
  },
  // ----- SAM -----
  {
    data_object_name: "software_titles",
    singular_label: "Software Title",
    plural_label: "Software Titles",
    display_label: "Software Title",
    description: "Canonical software product in the catalog: Adobe Creative Cloud, Microsoft 365, AutoCAD, Visual Studio. Carries vendor, edition, family, version range. Distinct from installations (which reference a title) and from licenses (which entitle a count of users to a title).",
    master_domain: "SAM",
  },
  {
    data_object_name: "software_licenses",
    singular_label: "Software License",
    plural_label: "Software Licenses",
    display_label: "Software License",
    description: "License entitlement: vendor, title, purchased count, license model (per-user, per-device, concurrent, site, subscription), term, renewal date, governing contract. The legal right-to-use, distinct from actual installations.",
    master_domain: "SAM",
  },
  {
    data_object_name: "software_installations",
    singular_label: "Software Installation",
    plural_label: "Software Installations",
    display_label: "Software Installation",
    description: "Discovered install of a software title on a specific device or for a specific user. The operational fact, distinct from the licensing right. Discovery feeds; VULN-MGMT reads to scope vulnerability scans.",
    master_domain: "SAM",
  },
  {
    data_object_name: "license_audits",
    singular_label: "License Audit",
    plural_label: "License Audits",
    display_label: "License Audit",
    description: "Audit / true-up record: entitled count, installed count, the resulting gap, true-up cost, and audit-defence evidence. Triggered by vendor audit or proactive internal review. The artifact that justifies a SAM tool's ROI.",
    master_domain: "SAM",
  },
  // ----- SMP -----
  {
    data_object_name: "saas_applications",
    singular_label: "SaaS Application",
    plural_label: "SaaS Applications",
    display_label: "SaaS Application",
    description: "Canonical SaaS app in the portfolio: Slack, Salesforce, Notion, Figma, Asana. Carries vendor, category, criticality tier, sanctioned/shadow flag, and links to the active subscription. Distinct from SAM's software_titles which are typically installed (or hybrid). The flagship SMP entity.",
    master_domain: "SMP",
  },
  {
    data_object_name: "saas_subscriptions",
    singular_label: "SaaS Subscription",
    plural_label: "SaaS Subscriptions",
    display_label: "SaaS Subscription",
    description: "The contractual instance for a SaaS app: plan / tier, seat count, MRR or ARR, billing cadence, renewal date, primary owner. One app may have multiple subscriptions (BU, region, M&A-inherited free tier). Linked to a contract (CLM) and a PO (S2P).",
    master_domain: "SMP",
  },
  {
    data_object_name: "saas_app_assignments",
    singular_label: "SaaS App Assignment",
    plural_label: "SaaS App Assignments",
    display_label: "SaaS App Assignment",
    description: "User-to-app entitlement: who has access to which app at which tier, granted when, by whom, last used when. Multi-master with IGA: SMP knows the cost/seat side, IGA knows the identity/access side, and the two views frequently disagree.",
    master_domain: "SMP",
  },
  {
    data_object_name: "saas_usage_metrics",
    singular_label: "SaaS Usage Metric",
    plural_label: "SaaS Usage Metrics",
    display_label: "SaaS Usage Metric",
    description: "Per-app per-user activity metrics: logins, time-in-app, feature usage, last-active date. The basis for license right-sizing, renewal-tier decisions, and shadow-IT vs sanctioned-app analysis.",
    master_domain: "SMP",
  },
  {
    data_object_name: "shadow_it_apps",
    singular_label: "Shadow IT App",
    plural_label: "Shadow IT Apps",
    display_label: "Shadow IT App",
    description: "SaaS app discovered in use but not officially sanctioned. Found via expense data (corporate card SaaS charges), SSO logs (unsanctioned login), browser extensions, network traffic, or signup-with-corporate-email detection. The thing finance, security, IT, and SMP all want to see but historically nobody owns end-to-end.",
    master_domain: "SMP",
  },
  // ----- CLM -----
  {
    data_object_name: "contracts",
    singular_label: "Contract",
    plural_label: "Contracts",
    display_label: "Contract",
    description: "Canonical contract record: counterparty / supplier, contract type (MSA, SOW, NDA, DPA, subscription, lease), effective and expiry dates, total value, governing law, status (draft, in-negotiation, signed, active, expired, terminated). The most multi-mastered SaaS-related object — CLM owns the document, S2P and SMP contribute context.",
    master_domain: "CLM",
  },
  {
    data_object_name: "contract_obligations",
    singular_label: "Contract Obligation",
    plural_label: "Contract Obligations",
    display_label: "Contract Obligation",
    description: "Specific performance, payment, delivery, reporting, or compliance commitment extracted from a contract — each with its own owner, due date, and status. Post-signature obligation tracking is where contracts deliver (or fail to deliver) value.",
    master_domain: "CLM",
  },
  {
    data_object_name: "contract_clauses",
    singular_label: "Contract Clause",
    plural_label: "Contract Clauses",
    display_label: "Contract Clause",
    description: "Reusable clause library: preferred and fallback language for indemnification, IP, termination, SLA, payment terms, data-protection, AI-use, audit rights. Drives consistency in authoring and accelerates negotiation.",
    master_domain: "CLM",
  },
  {
    data_object_name: "contract_templates",
    singular_label: "Contract Template",
    plural_label: "Contract Templates",
    display_label: "Contract Template",
    description: "Pre-approved drafts (NDA, MSA, DPA, SOW, order form) assembled from the clause library, used to author new contracts. Carries versioning, approval state, and risk-tier classification.",
    master_domain: "CLM",
  },
  {
    data_object_name: "signature_records",
    singular_label: "Signature Record",
    plural_label: "Signature Records",
    display_label: "Signature Record",
    description: "E-signature envelope: signing audit trail, IP addresses, provider-reference IDs (DocuSign / Adobe Sign / OneSpan envelope and document IDs), and the signed PDF artifact. Distinct from contracts — one contract may have many signature events (counterpart, amendment, renewal).",
    master_domain: "CLM",
  },
  // ----- S2P -----
  {
    data_object_name: "sourcing_events",
    singular_label: "Sourcing Event",
    plural_label: "Sourcing Events",
    display_label: "Sourcing Event",
    description: "RFx process record: RFI, RFQ, RFP, or reverse auction. Carries scope, supplier list, scorecard / weighting, responses, and the awarded supplier. The pre-contract stage that produces a sourcing decision feeding CLM.",
    master_domain: "S2P",
  },
  {
    data_object_name: "purchase_requisitions",
    singular_label: "Purchase Requisition",
    plural_label: "Purchase Requisitions",
    display_label: "Purchase Requisition",
    description: "Internal demand for a purchase: what's needed, who's requesting, justification, budget reference, approval state. The origination point of a procurement workflow; SMP-triggered shadow-IT sanctioning lands here.",
    master_domain: "S2P",
  },
  {
    data_object_name: "purchase_orders",
    singular_label: "Purchase Order",
    plural_label: "Purchase Orders",
    display_label: "Purchase Order",
    description: "Issued PO to a supplier: line items, agreed prices, delivery terms, payment terms, ship-to / bill-to. Authorises the supplier to deliver. PO creation is a primary trigger for downstream system updates — ITAM gets the asset reference, SMP gets the SaaS subscription anchor.",
    master_domain: "S2P",
  },
  {
    data_object_name: "goods_receipts",
    singular_label: "Goods Receipt",
    plural_label: "Goods Receipts",
    display_label: "Goods Receipt",
    description: "Confirmation that ordered goods or services were received as expected: receipt date, quantity received, condition. The basis for 3-way matching against PO + invoice that AP runs before payment.",
    master_domain: "S2P",
  },
  {
    data_object_name: "invoices",
    singular_label: "Invoice",
    plural_label: "Invoices",
    display_label: "Invoice",
    description: "Supplier-issued invoice for goods or services delivered. AP runs 3-way match (PO + receipt + invoice) before approving for payment. Multi-domain consumption: EXPENSE consumes when a corporate card path overlaps, FINOPS consumes the cloud-invoice slice for cost allocation.",
    master_domain: "S2P",
  },
];

// Strip master_domain (script-internal, not a column) before insert
const insertableObjects = allObjects.map(({ master_domain, ...rest }) => rest);
const dataObjMap = await syncByKey("/data_objects", insertableObjects, "data_object_name");

// =============================================================================
// PHASE 2 — master links
// =============================================================================
console.log("\n=== Phase 2: master links ===");

const allDDO = await get("/domain_data_objects?select=domain_id,data_object_id&limit=20000");
const existingDDOKey = new Set(allDDO.map(r => `${r.domain_id}|${r.data_object_id}`));

const masterRows = allObjects
  .map(o => ({
    domain_id: did(o.master_domain),
    data_object_id: dataObjMap.get(o.data_object_name)!,
    role: "master",
    notes: "",
  }))
  .filter(r => !existingDDOKey.has(`${r.domain_id}|${r.data_object_id}`));

if (masterRows.length > 0) {
  console.log(`  /domain_data_objects: inserting ${masterRows.length} master links`);
  await insertChunked("/domain_data_objects", masterRows);
} else {
  console.log(`  /domain_data_objects: all master links already present`);
}

// =============================================================================
// PHASE 3 — multi-master / contributor / consumer rows
// =============================================================================
console.log("\n=== Phase 3: multi-master / contributor / consumer rows ===");

type SignalRow = { data_object: string; domain: string; role: "master" | "contributor" | "consumer" | "derived"; notes: string };

const signals: SignalRow[] = [
  // ITSM — incidents: cross-feed from ITOM and SECOPS
  { data_object: "incidents", domain: "ITOM", role: "contributor", notes: "Alerts and events from ITOM auto-create incidents in ITSM via the event.alert_triggered handoff." },
  { data_object: "incidents", domain: "SECOPS", role: "contributor", notes: "Security incidents that require operational coordination land as ITSM incidents (or are mirrored)." },
  // ITSM — service_requests: HRSD consumes, Onboarding contributes
  { data_object: "service_requests", domain: "HRSD", role: "consumer", notes: "When an HR case requires IT assistance (access, hardware, app), it routes a service request into ITSM and consumes status updates back." },
  { data_object: "service_requests", domain: "ONBOARDING", role: "contributor", notes: "Onboarding provisioning tasks open ITSM service requests for IT fulfilment (laptop, accounts, access)." },
  // ITSM — changes: CMDB contributor
  { data_object: "changes", domain: "CMDB", role: "contributor", notes: "Configuration drift detected against the CMDB triggers change records; approved changes write back to the CMDB on completion." },

  // HAM — hardware_assets: CMDB and DISCOVERY contributors
  { data_object: "hardware_assets", domain: "CMDB", role: "contributor", notes: "The same physical thing is a CI in CMDB (operational/topology view) and a hardware asset in HAM (financial/lifecycle view). Separate masters, separate data objects, intentional cross-reference." },
  { data_object: "hardware_assets", domain: "DISCOVERY", role: "contributor", notes: "Auto-discovered devices feed the HAM catalog via the device.discovered handoff." },

  // ITAM umbrella — asset_lifecycle_events: ITSM, HCM, Onboarding contributors
  { data_object: "asset_lifecycle_events", domain: "ITSM", role: "contributor", notes: "Incident.asset_failure events generate lifecycle entries (replacement, retirement, RMA)." },
  { data_object: "asset_lifecycle_events", domain: "HCM", role: "contributor", notes: "employee.terminated triggers asset-recall lifecycle events — the canonical leaver pain." },
  { data_object: "asset_lifecycle_events", domain: "ONBOARDING", role: "contributor", notes: "Onboarding provisioning tasks generate asset-assignment lifecycle events." },

  // SAM — software_installations: DISCOVERY, VULN-MGMT
  { data_object: "software_installations", domain: "DISCOVERY", role: "contributor", notes: "Auto-discovered installs from scanning feed SAM via the software.discovered handoff." },
  { data_object: "software_installations", domain: "VULN-MGMT", role: "consumer", notes: "The install footprint defines the vulnerability scan scope — VULN-MGMT reads SAM's installations to know what to assess." },
  // SAM — software_licenses: CLM contributor (the license contract terms)
  { data_object: "software_licenses", domain: "CLM", role: "contributor", notes: "The licence terms (allowed use, audit clauses, true-up rules) live in CLM; SAM holds the operational count and metering view." },

  // SMP — saas_applications: ITAM consumer
  { data_object: "saas_applications", domain: "ITAM", role: "consumer", notes: "ITAM umbrella surfaces SaaS apps alongside hardware and installed-software assets for unified asset reporting." },
  // SMP — saas_subscriptions: CLM and S2P contributors, EXPENSE consumer
  { data_object: "saas_subscriptions", domain: "CLM", role: "contributor", notes: "The underlying subscription contract lives in CLM; SMP indexes the active subscription against portfolio decisions." },
  { data_object: "saas_subscriptions", domain: "S2P", role: "contributor", notes: "The PO that originally purchased the subscription lives in S2P; SMP holds the operational subscription state." },
  { data_object: "saas_subscriptions", domain: "EXPENSE", role: "consumer", notes: "Corporate-card SaaS charges are matched against subscriptions to reconcile expensed-vs-procured SaaS." },
  // SMP — saas_app_assignments: IGA master (multi-master with SMP)
  { data_object: "saas_app_assignments", domain: "IGA", role: "master", notes: "IGA masters the identity-access slice (account, group membership, role assignment, entitlement); SMP masters the cost/seat slice (which plan, which seat, last used). Two true masters on the same row — the SaaS-era equivalent of the employees multi-master." },
  // SMP — saas_usage_metrics: PA consumer
  { data_object: "saas_usage_metrics", domain: "PA", role: "consumer", notes: "Tool-adoption metrics roll into people analytics for productivity and engagement dashboards." },

  // CLM — contracts: S2P and SMP contributors, LSD consumer
  { data_object: "contracts", domain: "S2P", role: "contributor", notes: "Procurement context (PO ref, sourcing event, supplier) is captured during contracting; S2P contributes that context, CLM masters the document." },
  { data_object: "contracts", domain: "SMP", role: "contributor", notes: "For SaaS contracts, SMP contributes portfolio context — current usage, recommended seat count, renewal recommendation — that informs negotiation and approval." },
  { data_object: "contracts", domain: "LSD", role: "consumer", notes: "Legal Service Delivery reviews and advises on contracts; surfaces review state and risk classification back." },
  // CLM — contract_obligations: GRC consumer
  { data_object: "contract_obligations", domain: "GRC", role: "consumer", notes: "Regulatory and audit-trackable obligations feed GRC for compliance evidence." },

  // S2P — invoices: EXPENSE and FINOPS consumers
  { data_object: "invoices", domain: "EXPENSE", role: "consumer", notes: "When the procurement path overlaps with corporate-card spend, EXPENSE reconciles the duplicate paths." },
  { data_object: "invoices", domain: "FINOPS", role: "consumer", notes: "Cloud-provider invoices feed FINOPS for cost allocation across business units and projects." },
  // S2P — purchase_orders: ITAM consumer (acquired assets), SMP consumer (SaaS subscriptions)
  { data_object: "purchase_orders", domain: "ITAM", role: "consumer", notes: "PO line items link to acquired hardware/software assets in ITAM/HAM/SAM via the asset.acquired lifecycle event." },
  { data_object: "purchase_orders", domain: "SMP", role: "consumer", notes: "A PO for a SaaS subscription creates the corresponding saas_subscription record in SMP via the po.saas_subscription_created handoff." },
  // S2P — sourcing_events: CLM consumer (resulting contract)
  { data_object: "sourcing_events", domain: "CLM", role: "consumer", notes: "Awarded sourcing events flow into CLM as draft contracts." },
];

const signalRows = signals
  .map(s => ({
    domain_id: did(s.domain),
    data_object_id: dataObjMap.get(s.data_object)!,
    role: s.role,
    notes: s.notes,
  }))
  .filter(r => !existingDDOKey.has(`${r.domain_id}|${r.data_object_id}`));

if (signalRows.length > 0) {
  console.log(`  /domain_data_objects: inserting ${signalRows.length} multi-master / contributor / consumer rows`);
  await insertChunked("/domain_data_objects", signalRows);
} else {
  console.log(`  /domain_data_objects: all signal rows already present`);
}

// =============================================================================
// PHASE 4 — cross_domain_handoffs
// =============================================================================
console.log("\n=== Phase 4: cross_domain_handoffs ===");

const doid = (name: string) => {
  const id = dataObjMap.get(name);
  if (!id) throw new Error(`data_object ${name} not loaded`);
  return id;
};

const handoffs = [
  // --- ITSM cluster ---
  {
    source_domain_id: did("ITOM"),
    target_domain_id: did("ITSM"),
    data_object_id: doid("incidents"),
    trigger_event: "event.alert_triggered",
    integration_pattern: "event_stream",
    friction_level: "high",
    description: "Monitoring/alerting events from ITOM auto-create incidents in ITSM when severity and correlation rules match. High friction in practice — alert storms create incident floods, correlation rules drift, and dedupe logic between systems is rarely good enough. The classic 'NOC-floods-the-helpdesk' problem.",
    notes: "",
  },
  {
    source_domain_id: did("HRSD"),
    target_domain_id: did("ITSM"),
    data_object_id: doid("service_requests"),
    trigger_event: "case.it_assistance_required",
    integration_pattern: "api_call",
    friction_level: "medium",
    description: "HR case that needs IT action (lost laptop replacement, app access for a new role, account lockout) routes a service request into ITSM. Friction sits in the case-to-SR field mapping and status synchronisation back to HRSD.",
    notes: "",
  },
  {
    source_domain_id: did("ITSM"),
    target_domain_id: did("CMDB"),
    data_object_id: doid("changes"),
    trigger_event: "change.completed",
    integration_pattern: "api_call",
    friction_level: "medium",
    description: "Completed change in ITSM updates the affected CIs in CMDB (software version, configuration state, relationship topology). Friction is medium — most ITSM/CMDB pairs are same-vendor and reasonably integrated; cross-vendor combos drift.",
    notes: "",
  },
  {
    source_domain_id: did("ITSM"),
    target_domain_id: did("ITAM"),
    data_object_id: doid("asset_lifecycle_events"),
    trigger_event: "incident.asset_failure",
    integration_pattern: "api_call",
    friction_level: "medium",
    description: "Incident resolved by replacing or retiring an asset generates a lifecycle event in ITAM. Friction sits in the asset-id resolution (incidents are filed against users or symptoms, asset IDs come later).",
    notes: "",
  },
  // --- DISCOVERY → HAM / SAM ---
  {
    source_domain_id: did("DISCOVERY"),
    target_domain_id: did("HAM"),
    data_object_id: doid("hardware_assets"),
    trigger_event: "device.discovered",
    integration_pattern: "event_stream",
    friction_level: "low",
    description: "Auto-discovered devices (laptops, network gear, servers) flow to HAM as new hardware_assets candidates. Low friction when the discovery and HAM tool are same-vendor; medium when separate. Manual reconciliation needed for devices behind NAT or off-network.",
    notes: "",
  },
  {
    source_domain_id: did("DISCOVERY"),
    target_domain_id: did("SAM"),
    data_object_id: doid("software_installations"),
    trigger_event: "software.discovered",
    integration_pattern: "event_stream",
    friction_level: "low",
    description: "Auto-discovered software installs flow to SAM as software_installations records. Drives the install-vs-entitled reconciliation that justifies SAM's existence.",
    notes: "",
  },
  // --- HCM → ITAM termination ---
  {
    source_domain_id: did("HCM"),
    target_domain_id: did("ITAM"),
    data_object_id: doid("asset_lifecycle_events"),
    trigger_event: "employee.terminated",
    integration_pattern: "api_call",
    friction_level: "high",
    description: "Employee termination triggers asset-recall events: assigned laptops, mobile devices, badges, software licences must be reclaimed. High friction — recall rates rarely hit 100%, and the cost of unrecovered SaaS seats / laptops shows up in financial leakage reports.",
    notes: "",
  },
  // --- SAM ↔ ITSM ---
  {
    source_domain_id: did("SAM"),
    target_domain_id: did("ITSM"),
    data_object_id: doid("service_requests"),
    trigger_event: "license.expiry_warning",
    integration_pattern: "api_call",
    friction_level: "low",
    description: "Upcoming license expiry creates a renewal-action service request in ITSM. Low friction because the trigger is calendar-based and well-defined; routing to the right owner is the only nuance.",
    notes: "",
  },
  {
    source_domain_id: did("SAM"),
    target_domain_id: did("VULN-MGMT"),
    data_object_id: doid("software_installations"),
    trigger_event: "software_install.detected",
    integration_pattern: "event_stream",
    friction_level: "low",
    description: "New software install detected by SAM feeds VULN-MGMT's scan scope — the install set defines what needs to be assessed for known CVEs.",
    notes: "",
  },
  {
    source_domain_id: did("SAM"),
    target_domain_id: did("ITSM"),
    data_object_id: doid("service_requests"),
    trigger_event: "license_audit.required",
    integration_pattern: "api_call",
    friction_level: "medium",
    description: "Vendor-initiated audit or proactive internal review triggers an audit workflow service request. Friction sits in evidence collection across SAM + CLM + S2P data.",
    notes: "",
  },

  // --- SaaS spend lifecycle ---
  {
    source_domain_id: did("EXPENSE"),
    target_domain_id: did("SMP"),
    data_object_id: doid("shadow_it_apps"),
    trigger_event: "card.saas_charge_detected",
    integration_pattern: "event_stream",
    friction_level: "high",
    description: "Corporate-card SaaS charge detected by the expense system surfaces a candidate shadow-IT app in SMP. High friction: finance sees the charge, IT/SMP sees (or doesn't see) the app — reconciling vendor-name-on-card with app-name-in-portfolio is messy and is one of the highest-value SMP-to-EXPENSE integrations.",
    notes: "",
  },
  {
    source_domain_id: did("SMP"),
    target_domain_id: did("S2P"),
    data_object_id: doid("purchase_requisitions"),
    trigger_event: "shadow_app.requires_sanctioning",
    integration_pattern: "api_call",
    friction_level: "medium",
    description: "Shadow-IT app that passes the threshold for sanctioning (recurring use, multiple users, business-critical) triggers a procurement requisition in S2P to formalise the relationship.",
    notes: "",
  },
  {
    source_domain_id: did("S2P"),
    target_domain_id: did("CLM"),
    data_object_id: doid("contracts"),
    trigger_event: "sourcing.contract_drafted",
    integration_pattern: "api_call",
    friction_level: "medium",
    description: "Sourcing decision in S2P hands off to CLM to author the contract. Friction sits in clause selection, redline coordination with the counterparty, and the legal-review loop with LSD.",
    notes: "",
  },
  {
    source_domain_id: did("CLM"),
    target_domain_id: did("S2P"),
    data_object_id: doid("purchase_orders"),
    trigger_event: "contract.signed",
    integration_pattern: "api_call",
    friction_level: "low",
    description: "Signed contract in CLM triggers PO creation in S2P. Low friction when the CLM and S2P stack are integrated (Coupa CLM ↔ Coupa P2P), higher when separate.",
    notes: "",
  },
  {
    source_domain_id: did("S2P"),
    target_domain_id: did("SMP"),
    data_object_id: doid("saas_subscriptions"),
    trigger_event: "po.saas_subscription_created",
    integration_pattern: "event_stream",
    friction_level: "medium",
    description: "PO for a SaaS subscription creates the corresponding subscription record in SMP. Friction sits in matching the PO line items to a known SaaS app in the SMP catalog; new vendors require manual creation.",
    notes: "",
  },
  {
    source_domain_id: did("SMP"),
    target_domain_id: did("IGA"),
    data_object_id: doid("saas_app_assignments"),
    trigger_event: "app.sanctioned",
    integration_pattern: "api_call",
    friction_level: "high",
    description: "Sanctioning a SaaS app triggers IGA to import existing app assignments and bring them under birthright/access-policy governance. High friction: SMP knows who's paying for seats, IGA knows who can log in via SSO; the two views routinely disagree on the actual user set.",
    notes: "",
  },
  {
    source_domain_id: did("SMP"),
    target_domain_id: did("CLM"),
    data_object_id: doid("contracts"),
    trigger_event: "renewal.30_day_warning",
    integration_pattern: "api_call",
    friction_level: "low",
    description: "SMP's renewal-watch surfaces a 30-day expiry warning to CLM so the contract document workflow (amendment, renegotiation) can start in time.",
    notes: "",
  },
  {
    source_domain_id: did("SMP"),
    target_domain_id: did("S2P"),
    data_object_id: doid("purchase_requisitions"),
    trigger_event: "seat_demand.exceeded",
    integration_pattern: "api_call",
    friction_level: "medium",
    description: "When SaaS usage forecasts predict seat-count overrun before renewal, SMP triggers a mid-term expansion requisition in S2P to add seats proactively (avoiding emergency procurement at over-pricing).",
    notes: "",
  },
  {
    source_domain_id: did("CLM"),
    target_domain_id: did("SMP"),
    data_object_id: doid("saas_subscriptions"),
    trigger_event: "contract.renewed",
    integration_pattern: "api_call",
    friction_level: "low",
    description: "Renewed SaaS contract in CLM updates the corresponding subscription in SMP with new term, new seat count, new pricing.",
    notes: "",
  },
  {
    source_domain_id: did("DISCOVERY"),
    target_domain_id: did("SMP"),
    data_object_id: doid("shadow_it_apps"),
    trigger_event: "sso_login.unsanctioned_app",
    integration_pattern: "event_stream",
    friction_level: "medium",
    description: "SSO logs reveal a login to a SaaS app that's not in the sanctioned catalog — flagged as shadow IT. Complements the EXPENSE-side detection: SSO catches apps that use corporate SSO but aren't tracked; expense catches credit-card paid apps that don't.",
    notes: "",
  },
];

const allHandoffs = await get(
  "/cross_domain_handoffs?select=source_domain_id,target_domain_id,data_object_id,trigger_event&limit=20000",
);
const handoffKey = (r: Row) =>
  `${r.source_domain_id}|${r.target_domain_id}|${r.data_object_id}|${r.trigger_event}`;
const existingHoSet = new Set(allHandoffs.map(handoffKey));
const handoffsToInsert = handoffs.filter(h => !existingHoSet.has(handoffKey(h)));

if (handoffsToInsert.length > 0) {
  console.log(`  /cross_domain_handoffs: inserting ${handoffsToInsert.length} new handoffs`);
  await insertChunked("/cross_domain_handoffs", handoffsToInsert);
} else {
  console.log(`  /cross_domain_handoffs: all already present`);
}

// =============================================================================
// SUMMARY + leaderboards
// =============================================================================
console.log("\n=== Summary ===");
const totalDO = (await get("/data_objects?select=id")).length;
const totalDDO = (await get("/domain_data_objects?select=id&limit=20000")).length;
const totalHO = (await get("/cross_domain_handoffs?select=id&limit=20000")).length;
console.log(`  total data_objects:           ${totalDO}`);
console.log(`  total domain_data_objects:    ${totalDDO}`);
console.log(`  total cross_domain_handoffs:  ${totalHO}`);

console.log("\nMulti-master leaderboard (data_objects with role=master count > 1):");
const allMasterRows = await get("/domain_data_objects?role=eq.master&select=data_object_id&limit=20000");
const masterCount = new Map<number, number>();
for (const r of allMasterRows) {
  const id = Number(r.data_object_id);
  masterCount.set(id, (masterCount.get(id) ?? 0) + 1);
}
const multi = [...masterCount.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);
if (multi.length > 0) {
  const objNames = await get(`/data_objects?id=in.(${multi.map(([id]) => id).join(",")})&select=id,data_object_name`);
  const nameById = new Map(objNames.map(r => [Number(r.id), String(r.data_object_name)]));
  for (const [id, c] of multi) console.log(`  ${c}×  ${nameById.get(id)}`);
}

console.log("\nHandoff hotspots (top domains by total handoff degree):");
const allHo = await get("/cross_domain_handoffs?select=source_domain_id,target_domain_id&limit=20000");
const degree = new Map<number, number>();
for (const r of allHo) {
  degree.set(Number(r.source_domain_id), (degree.get(Number(r.source_domain_id)) ?? 0) + 1);
  degree.set(Number(r.target_domain_id), (degree.get(Number(r.target_domain_id)) ?? 0) + 1);
}
const topDeg = [...degree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
const allDoms = await get(`/domains?id=in.(${topDeg.map(([id]) => id).join(",")})&select=id,domain_code`);
const codeById = new Map(allDoms.map(r => [Number(r.id), String(r.domain_code)]));
for (const [id, c] of topDeg) console.log(`  ${c}×  ${codeById.get(id)}`);

console.log("\nUI:");
console.log("  https://tests.semantius.app/domain_map/data_objects");
console.log("  https://tests.semantius.app/domain_map/domain_data_objects");
console.log("  https://tests.semantius.app/domain_map/cross_domain_handoffs");
