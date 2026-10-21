#!/usr/bin/env bun
// Updates `crud_percentage` and `business_logic` on every domain in the
// domain_map module. Values come from the "CRUD vs kernel" analysis.
// Idempotent: PATCHes by domain_code, safe to re-run.
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

const NONE = "No irreducible logic kernel — fully expressible as a semantic model with entities, state machines, role/condition-based rules, and approval routing. An AI agent operating on the semantic model can absorb essentially all of the application-tier value.";

type Update = { code: string; crud: number; logic: string };

const updates: Update[] = [
  // 95% — pure workflow / forms / records
  { code: "CMDB", crud: 95, logic: NONE },
  { code: "HRSD", crud: 95, logic: NONE },
  { code: "AUDIT", crud: 95, logic: NONE },
  { code: "LSD", crud: 95, logic: NONE },
  { code: "RET-STORE", crud: 95, logic: NONE },
  { code: "PS-LIC", crud: 95, logic: NONE },
  { code: "VIS-MGMT", crud: 95, logic: NONE },
  { code: "EMP-EXP", crud: 95, logic: NONE },
  { code: "HAM", crud: 95, logic: NONE },

  // 92% — workflow-dominant with thin scoring/calc layer
  { code: "EAM", crud: 92, logic: "Preventive-maintenance scheduling rules driven by meter readings, runtime hours, or condition data. Mostly declarative but benefits from a calculation engine for asset risk and maintenance intervals." },
  { code: "CSM", crud: 92, logic: "Skills-based routing and next-best-action recommendations are the only non-CRUD layer; both are increasingly handled by ML models invoked from declarative rules." },
  { code: "ITSM", crud: 92, logic: "Ticket classification, deduplication, and priority routing benefit from ML, but the underlying workflow remains state-machine driven." },
  { code: "ITAM", crud: 92, logic: "Normalisation tables (the same hardware/software model expressed inconsistently across feeds) are the small irreducible kernel — they require maintained reference data, not a runtime engine." },
  { code: "TEST-MGMT", crud: 92, logic: "Test runner orchestration (queuing, parallelisation, retry) is engine-like, but the test-management application itself is pure CRUD over cases, runs, and defects." },
  { code: "BCM", crud: 92, logic: "Dependency mapping between business services, applications, and infrastructure is the modest algorithmic layer; the rest is plans, BIAs, and exercise records." },
  { code: "OP-RES", crud: 92, logic: "Mapping algorithms that propagate impact across the important-business-service graph; minor compared to the workflow surface." },
  { code: "TPRM", crud: 92, logic: "Risk scoring rules over questionnaire responses; typically rule-driven and expressible in a declarative engine." },
  { code: "SUP-LIFE", crud: 92, logic: "Supplier scorecard math (KPI roll-ups, weighted ratings) — a calc layer over CRUD records." },
  { code: "PRM", crud: 92, logic: NONE },
  { code: "VMS", crud: 92, logic: NONE },
  { code: "BEN-ADMIN", crud: 92, logic: "Eligibility rules that determine which benefits a worker can elect; declarative and well-suited to a rules engine." },
  { code: "HCM", crud: 92, logic: "Org-chart and headcount calculations, FTE roll-ups, and span-of-control analytics — calc layer over master HR data." },
  { code: "DAM", crud: 92, logic: "Image and video transforms (resize, format conversion, watermark) — irreducible but commodified by cloud media services." },
  { code: "ECM", crud: 92, logic: "Full-text search and OCR; the rest is repositories, taxonomies, retention rules, and approval workflows." },

  // 90%
  { code: "CLIN-DEV", crud: 90, logic: "Preventive-maintenance schedules and recall propagation for medical devices — mostly declarative rules over inventory." },
  { code: "LMS", crud: 90, logic: "Learning-path recommendation engines; otherwise pure content, enrolment, and tracking records." },
  { code: "HCMS", crud: 90, logic: "CDN and rendering pipeline (delivery, caching, image processing) sit beneath the API — the application surface itself is content models and entries." },
  { code: "EXPENSE", crud: 90, logic: "Policy engine (per-diem caps, currency, category limits) and OCR for receipt extraction — both increasingly declarative or ML-based." },
  { code: "CLM", crud: 90, logic: "Clause-comparison and risk-detection ML during negotiation; the rest is repository, redlining workflow, and approvals." },
  { code: "APM", crud: 90, logic: "TIME (tolerate/invest/migrate/eliminate) scoring rules over portfolio attributes — a small declarative layer." },
  { code: "WSC", crud: 90, logic: "Message delivery, presence, and search — infrastructure-level, but the application surface (channels, threads, files) is straightforward CRUD." },

  // 88%
  { code: "HC-PATIENT", crud: 88, logic: "Patient scheduling optimisation (provider availability, room constraints, payer rules) is the meaningful algorithmic layer." },
  { code: "TALENT-MGMT", crud: 88, logic: "Calibration math (normalisation of ratings across populations) and 9-box placement; otherwise pure forms and workflow." },
  { code: "PRIV-MGMT", crud: 88, logic: "Data-inventory discovery (scanning sources to map personal data) is the irreducible kernel; the workflow side (DSR, consent) is declarative." },
  { code: "CRM", crud: 88, logic: "Forecasting, opportunity scoring, and lead-scoring ML models — invoked from an otherwise CRUD-and-workflow surface." },
  { code: "LOYALTY", crud: 88, logic: "Tier engine and points accrual/redemption rules — declarative but central to the product." },
  { code: "SMP", crud: 88, logic: "Usage analytics and engagement scoring to identify under-utilised licences; the rest is discovery, contracts, and renewal workflow." },
  { code: "ESIGN", crud: 88, logic: "PKI and crypto kernel for signature creation, timestamping, and validation — small in surface area but irreducible and regulated." },

  // 85%
  { code: "IWMS", crud: 85, logic: "Space-optimisation algorithms (occupancy planning, stack diagrams, scenario modelling) for real-estate teams; the rest is reservations and workflow." },
  { code: "SPM", crud: 85, logic: "Resource allocation, capacity what-if, and roadmap scenario modelling are the non-trivial engines; the rest is demand, project, and outcome records." },

  // 80%
  { code: "ATS", crud: 80, logic: "Candidate matching and resume parsing ML — significant in modern ATS products; the rest is pipeline stages, scheduling, and offers." },
  { code: "DCIM", crud: 80, logic: "Power, cooling, and capacity calculations across racks and rooms; physical-asset register and workflow form the larger surface." },
  { code: "GRC", crud: 80, logic: "Risk aggregation (Monte Carlo, qualitative-to-quantitative mapping) and control-effectiveness scoring; control libraries and assessments are CRUD." },

  // 78%
  { code: "ESG", crud: 78, logic: "Emissions calculation engine (Scope 1/2/3, conversion factors, allocation rules) — regulated and irreducible; the data-collection side is workflow." },
  { code: "S2P", crud: 78, logic: "Tax/compliance determination, savings calculation, and contract-price compliance; the rest is requisition, PO, and invoice workflow." },
  { code: "BANK-OPS", crud: 78, logic: "Risk-based decisioning rules (KYC, credit, AML) and fee/interest calculations; the rest is case management and journeys." },
  { code: "PSA", crud: 78, logic: "Resource scheduling and revenue recognition (percentage-of-completion, milestone billing) — calc-heavy but bounded." },

  // 75%
  { code: "SOAR", crud: 75, logic: "Playbook DSL runtime that executes orchestrated steps across security tools — the engine IS the product, even if individual steps are declarative." },
  { code: "DCG", crud: 75, logic: "Lineage extraction, automated tagging, and profiling — the metadata harvesting layer beneath the catalog UI." },
  { code: "DXP", crud: 75, logic: "Personalisation and recommendation engines, A/B testing infrastructure, and search ranking; the content-management side is CRUD." },
  { code: "MA", crud: 75, logic: "Journey orchestration runtime, send-time and channel optimisation, and segment evaluation at scale; campaign authoring is workflow." },
  { code: "ERP-FIN", crud: 75, logic: "Consolidation, allocation, multi-GAAP translation, and period-close orchestration — the regulated calc kernel inside an otherwise transactional ledger." },
  { code: "MFG-OPS", crud: 75, logic: "MES execution loops (work-instruction delivery, andon, downtime capture) and SPC calculations bridge the IT/OT boundary." },
  { code: "IGA", crud: 75, logic: "Segregation-of-duties engine, certification ML for outlier detection, and access analytics — the rest is joiner/mover/leaver workflow." },
  { code: "SAM", crud: 75, logic: "Entitlement reconciliation engine (matching deployed installs against complex licence metrics) — the genuinely hard kernel of SAM." },

  // 70%
  { code: "FINOPS", crud: 70, logic: "Unit-cost allocation, anomaly detection, rightsizing recommendations, and commitment optimisation — algorithm-led; the rest is reporting." },
  { code: "INS-CLAIMS", crud: 70, logic: "Adjudication rules engine, fraud detection, and reserve calculations — the irreducible insurance kernel; FNOL and case workflow are declarative." },
  { code: "OMS", crud: 70, logic: "Inventory allocation, sourcing/fulfilment rules, and split-shipment optimisation — operations-research heavy." },
  { code: "SALES-ENG", crud: 70, logic: "Conversation intelligence ML (transcription, sentiment, deal-risk signals) and dialler integration; sequencing and outreach are workflow." },
  { code: "B2C-COMM", crud: 70, logic: "Cart, promotion engine, search/merchandising ranking, and inventory-availability service — the runtime an e-commerce site depends on." },
  { code: "COMP-MGMT", crud: 70, logic: "Incentive calculation engine — quotas, accelerators, splits, draws — typically a dedicated calc layer with regulatory implications." },

  // 60%
  { code: "FSM", crud: 60, logic: "Routing and dispatch optimisation under technician skill, parts, SLA, and travel constraints — operations-research solver at the core." },
  { code: "PA", crud: 60, logic: "Predictive models (attrition, performance, DEI) and benchmarking calculations — the analytics engines beneath the report layer." },
  { code: "ITOM", crud: 60, logic: "Event management, capacity calculations, and topology-aware impact analysis — engine-led; service-mapping master data is the smaller part." },

  // 55%
  { code: "WFM", crud: 55, logic: "Demand forecasting and workforce-scheduling optimisation solvers (mixed-integer programming or heuristics) — the algorithmic core of the product." },
  { code: "THREAT-INTEL", crud: 55, logic: "Indicator correlation, enrichment pipelines, and adversary attribution — analytic substrate beneath a curation workflow." },
  { code: "CDP", crud: 55, logic: "Identity resolution (probabilistic + deterministic stitching), segmentation evaluation, and activation throughput — the engine is the differentiator." },
  { code: "UTIL-OPS", crud: 55, logic: "Meter-to-cash rating, outage prediction and crew dispatch, and demand-response calculations — utility-specific algorithmic kernels." },
  { code: "SUB-MGMT", crud: 55, logic: "Revenue recognition under ASC 606/IFRS 15, proration, dunning logic, usage rating, and tax determination — regulated and irreducible." },
  { code: "AP-AUTO", crud: 55, logic: "OCR/IDP for invoice capture, three-way match against PO and receipt, duplicate detection, and fraud rules — algorithm-heavy at the front of the workflow." },

  // 50%
  { code: "TELCO-BSS", crud: 50, logic: "Rating engine and online charging system — high-throughput algorithmic kernel; the rest is catalog, order, and customer records." },
  { code: "CCAAS", crud: 50, logic: "ACD/routing engine, IVR runtime, real-time analytics, and workforce engagement (recording, QM, WFM) — the platform IS the engine." },
  { code: "UEM", crud: 50, logic: "Policy compiler, device-agent runtime, and OS-specific MDM protocol implementations — code-dominant; admin console is CRUD over policies and groups." },
  { code: "EPM", crud: 50, logic: "Planning, modelling, and consolidation engines (multi-dimensional cubes, allocation, currency translation, eliminations) — the calc kernel is the product." },

  // 45%
  { code: "MDM", crud: 45, logic: "Matching and survivorship algorithms (deterministic + probabilistic), hierarchy management, and stewardship workflows — the irreducible kernel beneath any MDM hub." },
  { code: "IPAAS", crud: 45, logic: "Integration runtime executing connectors, transformations, error handling, and event delivery at scale — code-dominant by definition." },

  // 40%
  { code: "CPQ", crud: 40, logic: "Product-configuration constraint solver, pricing engine (rule-based + algorithmic discounting), and proposal generation — irreducible algorithmic core." },
  { code: "DISCOVERY", crud: 40, logic: "Scanning, fingerprinting, and credentialed inspection across networks, cloud APIs, and agents — code-dominant collection plane." },

  // 35%
  { code: "VULN-MGMT", crud: 35, logic: "Vulnerability scanning engines (network, host, web, container, code), CVE matching, and risk scoring — the algorithmic surface is the product." },
  { code: "SECOPS", crud: 35, logic: "Detection rules, correlation, ML-based anomaly detection, and high-volume log analytics — the SIEM/EDR core." },
  { code: "BI", crud: 35, logic: "OLAP/analytics engine, semantic layer, and query optimiser — irreducible. The report-authoring UI is declarative on top." },
  { code: "VSDP", crud: 35, logic: "CI/CD execution graph runtime, artefact management, and policy enforcement; pipelines and projects are CRUD over this." },
  { code: "DI", crud: 35, logic: "Streaming and ELT runtimes, change-data-capture engines, and schema-evolution handling — the platform IS the kernel." },
  { code: "DEM", crud: 35, logic: "Endpoint-agent runtime, synthetic transaction generation, and correlation across user/device/app/network signals — code-dominant data plane." },
  { code: "DQ", crud: 35, logic: "Profiling, matching, anomaly detection, and data observability — the algorithmic plane the workflow sits on top of." },

  // 30%
  { code: "LCAP", crud: 30, logic: "Runtime, compiler, and visual modeller — the entire platform is code. The end-user app surface is whatever the customer builds; the LCAP itself is platform." },
  { code: "PAYROLL", crud: 30, logic: "Tax tables, gross-to-net calculation, garnishment logic, statutory filings, and country-specific compliance kernels — irreducible and continuously updated." },

  // 25%
  { code: "RPA", crud: 25, logic: "Bot execution VM, UI automation (screen scraping, OCR, computer vision), and orchestration runtime — code at every layer." },
  { code: "PROC-MIN", crud: 25, logic: "Event-log algorithms (alpha miner, heuristic miner, inductive miner), conformance checking, and performance analysis — academic algorithms made commercial." },

  // 20%
  { code: "IDP", crud: 20, logic: "Document classification, key-value extraction, table extraction, and validation ML — the entire product is the model." },
  { code: "APIM", crud: 20, logic: "Gateway data plane (request routing, transformation, auth, rate limiting, observability) — a high-throughput runtime. Developer portal and policy management are CRUD." },
  { code: "AIOPS", crud: 20, logic: "Event correlation, deduplication, anomaly detection, and root-cause analysis — ML/statistical algorithms across high-volume telemetry." },
  { code: "APP-PAAS", crud: 20, logic: "Application runtime, autoscaler, build pipeline, networking, and storage abstractions — the platform IS the kernel." },
  { code: "NPMD", crud: 20, logic: "Flow analysis (NetFlow/sFlow/IPFIX), path tracing, BGP/route monitoring, and synthetic probes — stream-processing algorithms at scale." },
  { code: "CONV-AI", crud: 20, logic: "NLU/LLM stack, dialog management, intent/entity extraction, and tool-use orchestration — the model is the product." },

  // 15%
  { code: "OBS", crud: 15, logic: "Telemetry collection pipeline, trace analysis, log indexing at scale, metrics TSDB, and exemplar correlation — high-cardinality data infrastructure." },
  { code: "KUBE-PLAT", crud: 15, logic: "Kubernetes control plane, scheduler, networking (CNI), storage (CSI), and node lifecycle — distributed systems infrastructure." },
];

async function main() {
  console.log(`Applying CRUD/business-logic split to ${updates.length} domains`);

  // Resolve domain_code -> id
  const all = await call({
    method: "GET",
    path: "/domains?select=id,domain_code&limit=1000",
  });
  const codeToId = new Map<string, number>();
  for (const r of all) codeToId.set(String(r.domain_code), Number(r.id));
  console.log(`  ${all.length} domains in catalog`);

  // Sanity: every update has a target
  const orphans = updates.filter(u => !codeToId.has(u.code));
  if (orphans.length > 0) {
    throw new Error(`unknown domain codes: ${orphans.map(o => o.code).join(", ")}`);
  }

  // Sanity: every catalog domain has an update
  const updatedCodes = new Set(updates.map(u => u.code));
  const missing = [...codeToId.keys()].filter(c => !updatedCodes.has(c));
  if (missing.length > 0) {
    console.warn(`  ${missing.length} domain(s) NOT covered by this script: ${missing.join(", ")}`);
  }

  // Apply
  let applied = 0;
  for (const u of updates) {
    const id = codeToId.get(u.code)!;
    await call({
      method: "PATCH",
      path: `/domains?id=eq.${id}`,
      body: {
        crud_percentage: u.crud,
        business_logic: u.logic,
      },
    });
    applied += 1;
    if (applied % 20 === 0) console.log(`  ...${applied}/${updates.length}`);
  }
  console.log(`  applied ${applied} updates`);

  // Verify: distribution of crud_percentage
  const verified = await call({
    method: "GET",
    path: "/domains?select=domain_code,crud_percentage&order=crud_percentage.desc&limit=1000",
  });
  const buckets: Record<string, number> = {
    "95+": 0, "90-94": 0, "80-89": 0, "70-79": 0,
    "60-69": 0, "50-59": 0, "40-49": 0, "30-39": 0, "<30": 0,
  };
  for (const r of verified) {
    const p = Number(r.crud_percentage);
    if (p >= 95) buckets["95+"]++;
    else if (p >= 90) buckets["90-94"]++;
    else if (p >= 80) buckets["80-89"]++;
    else if (p >= 70) buckets["70-79"]++;
    else if (p >= 60) buckets["60-69"]++;
    else if (p >= 50) buckets["50-59"]++;
    else if (p >= 40) buckets["40-49"]++;
    else if (p >= 30) buckets["30-39"]++;
    else buckets["<30"]++;
  }
  console.log("\nDistribution of crud_percentage across the catalog:");
  for (const [band, count] of Object.entries(buckets)) {
    const bar = "#".repeat(count);
    console.log(`  ${band.padStart(6)}  ${String(count).padStart(3)}  ${bar}`);
  }

  const avg =
    verified.reduce((acc, r) => acc + Number(r.crud_percentage), 0) /
    verified.length;
  console.log(`\nMean crud_percentage: ${avg.toFixed(1)}%`);
}

main().catch(err => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
