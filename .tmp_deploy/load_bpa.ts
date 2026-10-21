#!/usr/bin/env bun
// Loads the Business Process Architecture (BPA) market into the domain_map module,
// plus the Essential Cloud vendor/solution backfill on the APM domain.
//
// Scope (Phase A + B + C, all in one file):
//   Phase A — Market shape:
//     - 1 new domain (BPA)
//     - 5 BPA-prefixed capabilities + 2 cross-cutting (BUSINESS-CAPABILITY-MAP, REFERENCE-FRAME-LIBRARY)
//     - capability_domains: 5 BPA-only + 2 cross-cutting × {BPA,APM}
//     - 6 new vendors (Mavim, iGrafx, Bizagi, Trisotech, BiZZdesign, EA Solutions Ltd.)
//     - 8 new solutions + 1 existing (MEGA HOPEX gets BPA link)
//     - solution_domains for all 9 solutions on BPA + secondaries on APM/PROC-MIN/LCAP
//     - solution_capabilities matrix: 9 solutions × 7 capabilities = 63 rows
//   Phase B — Data-object footprint:
//     - 4 new data_objects (BPA-mastered)
//     - 7 domain_data_objects rows (multi-master with APM/PROC-MIN/PROD-MGMT/SUPPLY-CHAIN)
//     - 5 cross_domain_handoffs rows
//   Phase C — Functional coverage:
//     - 4 business_function_domains rows for BPA
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
// DOMAIN
// ============================================================
type DomainRow = {
  domain_code: string;
  domain_name: string;
  description: string;
  crud_percentage: number;
  business_logic: string;
  min_org_size: string;
  cost_band: string;
  certification_required: boolean;
  usa_market_size_usd_m: number;
  market_size_source_year: number;
};

function validateDomainRow(d: DomainRow): void {
  const errs: string[] = [];
  if (!d.domain_code) errs.push("domain_code empty");
  if (!d.domain_name) errs.push("domain_name empty");
  if (!d.description) errs.push("description empty");
  if (d.crud_percentage === 0) errs.push("crud_percentage is 0 (must be assessed)");
  if (d.crud_percentage < 0 || d.crud_percentage > 100) errs.push("crud_percentage out of range");
  if (d.min_org_size === "") errs.push("min_org_size empty");
  if (d.cost_band === "") errs.push("cost_band empty");
  if (d.business_logic === "" && d.crud_percentage < 95) errs.push("business_logic empty but crud_percentage < 95");
  if (d.usa_market_size_usd_m === 0) errs.push("usa_market_size_usd_m is 0");
  if (d.market_size_source_year === 0) errs.push("market_size_source_year is 0");
  if (errs.length > 0) {
    throw new Error(`Domain row ${d.domain_code} failed validation: ${errs.join("; ")}`);
  }
}

const newDomains: DomainRow[] = [
  {
    domain_code: "BPA",
    domain_name: "Business Process Architecture",
    description:
      "Modelling, governance, and publication of an organisation's business processes and capabilities. Includes BPMN process authoring, business capability maps, value stream modelling, reference-framework consumption (APQC PCF, TOGAF, ArchiMate, eTOM, SCOR), process simulation, and stakeholder publication portals. Distinct from Process Mining (PROC-MIN, event-log analytics) and from Application Portfolio Management (APM, application-landscape rationalisation), though all three increasingly converge. Vendors: SAP Signavio Process Manager, Software AG ARIS, Mavim, iGrafx, Bizagi, Trisotech, BiZZdesign Horizzon, MEGA HOPEX.",
    crud_percentage: 80,
    business_logic:
      "Process simulation (Monte Carlo / discrete-event), BPMN execution semantics validation, framework-to-instance mapping (APQC PCF imports), and repository version-graph diff/merge.",
    min_org_size: "40 l <10000",
    cost_band: "$$$",
    certification_required: false,
    usa_market_size_usd_m: 400,
    market_size_source_year: 2024,
  },
];

for (const d of newDomains) validateDomainRow(d);

// ============================================================
// CAPABILITIES
// ============================================================
// Domain-prefixed (BPA-only) + 2 cross-cutting that span BPA + APM (and beyond).
type CapSpec = {
  capability_code: string;
  capability_name: string;
  description: string;
  domains: string[]; // for capability_domains junction
};

const capabilities: CapSpec[] = [
  {
    capability_code: "BPA-BPMN-MODEL",
    capability_name: "BPMN 2.0 Process Modelling",
    domains: ["BPA"],
    description:
      "Authoring of executable and non-executable BPMN 2.0 process diagrams with full notation (pools, lanes, sub-processes, events, gateways), versioning, and validation against the BPMN spec.",
  },
  {
    capability_code: "BPA-PROCESS-REPO",
    capability_name: "Process Repository and Governance",
    domains: ["BPA"],
    description:
      "Central repository for process models with check-in/check-out, version graphs, lifecycle states (draft/review/published/retired), role-based review workflows, and approval gates.",
  },
  {
    capability_code: "BPA-SIMULATION",
    capability_name: "Process Simulation",
    domains: ["BPA"],
    description:
      "Discrete-event / Monte Carlo simulation of process models with cost, time, and resource variables; bottleneck identification; scenario comparison.",
  },
  {
    capability_code: "BPA-VALUE-STREAM",
    capability_name: "Value Stream Modelling",
    domains: ["BPA"],
    description:
      "End-to-end value stream maps with lead/process time, value-add ratio, and waste categorisation; SIPOC and customer-journey overlays.",
  },
  {
    capability_code: "BPA-PUBLISH",
    capability_name: "Process Publishing and Stakeholder Distribution",
    domains: ["BPA"],
    description:
      "Web-portal generation from the repository, audience-specific (role-filtered) process portals, and embedded help / click-through navigation for end users.",
  },
  {
    capability_code: "BUSINESS-CAPABILITY-MAP",
    capability_name: "Business Capability Mapping",
    domains: ["BPA", "APM"],
    description:
      "Hierarchical capability maps with heatmaps for maturity, investment, strategic-fit, and ownership; explicit linkage to applications, processes, and value streams. Cross-cutting: LeanIX, MEGA, Ardoq, Mavim, Software AG, Essential market this across both APM and BPA tooling.",
  },
  {
    capability_code: "REFERENCE-FRAME-LIBRARY",
    capability_name: "Reference Framework Library",
    domains: ["BPA", "APM"],
    description:
      "Pre-loaded reference content from APQC PCF (cross-industry + industry variants), TOGAF, ArchiMate, eTOM, SCOR, with import/sync and the ability to extend with org-specific custom processes. Cross-cutting: shipped by BPA tools (Signavio, Mavim, iGrafx) and EA tools (Essential, LeanIX, Alfabet).",
  },
];

// ============================================================
// VENDORS (6 new; SAP SE, Software AG, MEGA International reused)
// ============================================================
const vendors = [
  {
    vendor_name: "Mavim",
    vendor_url: "https://www.mavim.com",
    headquarters_country: "Netherlands",
    description: "Business-transformation platform vendor focused on process and capability modelling on Microsoft Azure.",
    notes:
      "Founded 1990, HQ Noordwijk. Mavim platform layers process architecture, capability maps, and risk on top of Microsoft Azure / Power BI; APQC PCF content shipped as reference library.",
  },
  {
    vendor_name: "iGrafx, LLC",
    vendor_url: "https://www.igrafx.com",
    headquarters_country: "USA",
    description: "Business process management vendor (Process360 Live platform — modelling, mining, and intelligence).",
    notes:
      "Founded 1992 (spin-off from Micrografx), HQ Tualatin OR. Long-standing BPA vendor; added process mining to the suite in 2020 with the acquisition of Logpickr (now part of Process360 Live).",
  },
  {
    vendor_name: "Bizagi Limited",
    vendor_url: "https://www.bizagi.com",
    headquarters_country: "UK",
    description: "Digital process automation vendor (Bizagi Modeler — free BPMN tool; Bizagi Studio — low-code BPM platform).",
    notes:
      "Founded 1989 (originally Colombian; HQ moved to Chalfont St Peter, UK). Bizagi Modeler is one of the most widely-installed free BPMN tools; Bizagi Studio is the commercial low-code/BPM engine.",
  },
  {
    vendor_name: "Trisotech",
    vendor_url: "https://www.trisotech.com",
    headquarters_country: "Canada",
    description: "Standards-driven business automation vendor (Digital Enterprise Suite — BPMN, DMN, CMMN modelling).",
    notes:
      "Founded 1996, HQ Quebec City. Strong OMG-standards focus (BPMN/DMN/CMMN); known for decision modelling and pure-play standards compliance.",
  },
  {
    vendor_name: "BiZZdesign",
    vendor_url: "https://www.bizzdesign.com",
    headquarters_country: "Netherlands",
    description: "Enterprise architecture and process design vendor (Horizzon platform — EA, BPA, capability-based planning).",
    notes:
      "Founded 2000, HQ Enschede. Horizzon spans BPA and APM/EA; ArchiMate-native; strong in Europe and the public sector.",
  },
  {
    vendor_name: "Enterprise Architecture Solutions Ltd.",
    vendor_url: "https://www.enterprise-architecture.com",
    headquarters_country: "UK",
    description: "Enterprise architecture vendor; publisher of Essential Project (open core) and Essential Cloud (commercial SaaS).",
    notes:
      "Founded 2010 by Jonathan Carter. Essential Project was originally released as open-source EA tooling and remains free; Essential Cloud is the commercial SaaS variant with managed hosting, pre-built APQC PCF and Business Capability Model content, and reference architectures.",
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
  url?: string;
  primary?: string[];
  secondary?: string[];
  partial?: string[];
};

const solutions: SolutionSpec[] = [
  {
    solution_name: "SAP Signavio Process Manager",
    vendor: "SAP SE",
    solution_type: "saas",
    url: "https://www.signavio.com/products/process-manager/",
    description:
      "BPMN 2.0 process modelling, repository, simulation, and collaborative publishing. Part of the SAP Signavio Process Transformation Suite (distinct from Signavio Process Intelligence, the mining product).",
    notes:
      "Acquired by SAP in 2021. The Process Manager is the modelling product; Signavio Process Intelligence (id 187) is the mining product. Both are sold as part of the broader Signavio suite.",
    primary: ["BPA"],
  },
  {
    solution_name: "Software AG ARIS",
    vendor: "Software AG",
    solution_type: "hybrid",
    url: "https://www.softwareag.com/en_corporate/platform/aris.html",
    description:
      "Veteran enterprise BPA platform: BPMN/EPC modelling, repository, governance workflows, simulation, ARIS Connect publishing, and ARIS Risk & Compliance Manager.",
    notes:
      "One of the longest-standing BPA platforms (originating with IDS Scheer, acquired by Software AG in 2009). Strong in regulated industries.",
    primary: ["BPA"],
    secondary: ["APM"],
  },
  {
    solution_name: "Mavim",
    vendor: "Mavim",
    solution_type: "saas",
    url: "https://www.mavim.com/platform",
    description:
      "Process and capability-modelling platform built on Microsoft Azure / Power BI. Ships APQC PCF as reference content; covers BPA, capability maps, risk, and EA views.",
    primary: ["BPA"],
    secondary: ["APM"],
  },
  {
    solution_name: "iGrafx Process360 Live",
    vendor: "iGrafx, LLC",
    solution_type: "saas",
    url: "https://www.igrafx.com/process360-live/",
    description:
      "BPA platform with integrated process mining (via the Logpickr acquisition). Covers modelling, simulation, conformance, and publishing in one suite.",
    primary: ["BPA"],
    secondary: ["PROC-MIN"],
  },
  {
    solution_name: "Bizagi Modeler and Studio",
    vendor: "Bizagi Limited",
    solution_type: "hybrid",
    url: "https://www.bizagi.com/en/products",
    description:
      "Bizagi Modeler (free BPMN authoring) plus Bizagi Studio (commercial low-code BPM execution engine). Modeler is one of the most widely-installed BPMN tools globally.",
    primary: ["BPA"],
    secondary: ["LCAP"],
  },
  {
    solution_name: "Trisotech Digital Enterprise Suite",
    vendor: "Trisotech",
    solution_type: "saas",
    url: "https://www.trisotech.com/digital-enterprise-suite/",
    description:
      "Standards-purist BPMN/DMN/CMMN modelling suite with strong decision-modelling and executable workflow features. Used by the OMG community as a reference implementation.",
    primary: ["BPA"],
  },
  {
    solution_name: "BiZZdesign Horizzon",
    vendor: "BiZZdesign",
    solution_type: "saas",
    url: "https://www.bizzdesign.com/platform/",
    description:
      "ArchiMate-native enterprise architecture and process architecture platform. Co-flagship: equally strong on BPA (process modelling, capability mapping) and APM (application portfolio, EA).",
    primary: ["BPA", "APM"],
  },
  {
    solution_name: "Essential Cloud",
    vendor: "Enterprise Architecture Solutions Ltd.",
    solution_type: "saas",
    url: "https://www.enterprise-architecture.com/essential-cloud/",
    description:
      "Commercial SaaS variant of Essential Project (open-source EA), with managed hosting, pre-built APQC PCF and Business Capability Model content, and reference architectures. Primary positioning is APM/EA; lighter BPA coverage.",
    notes:
      "Open-core: Essential Project remains free OSS; Essential Cloud is the commercial managed product. Differentiator vs LeanIX/MEGA/Alfabet/Ardoq is pre-loaded APQC PCF + BCM content as a starting point.",
    primary: ["APM"],
    secondary: ["BPA"],
  },
];

// Existing solution that needs an extra solution_domains row (MEGA HOPEX → BPA)
const existingSolutionExtraLinks: { solution_name: string; primary?: string[]; secondary?: string[] }[] = [
  { solution_name: "MEGA HOPEX", primary: ["BPA"] },
];

// ============================================================
// SOLUTION_CAPABILITIES MATRIX (9 solutions × 7 capabilities = 63 rows)
// ============================================================
type SolCapSpec = {
  solution: string;
  capability: string;
  delivery_strength: "native" | "partial" | "via_extension" | "not_supported";
  notes?: string;
};

const solCaps: SolCapSpec[] = [
  // SAP Signavio Process Manager — broad native
  { solution: "SAP Signavio Process Manager", capability: "BPA-BPMN-MODEL", delivery_strength: "native" },
  { solution: "SAP Signavio Process Manager", capability: "BPA-PROCESS-REPO", delivery_strength: "native", notes: "Collaborative Hub is the flagship repository." },
  { solution: "SAP Signavio Process Manager", capability: "BPA-SIMULATION", delivery_strength: "native" },
  { solution: "SAP Signavio Process Manager", capability: "BPA-VALUE-STREAM", delivery_strength: "native", notes: "Value-chain and journey modelling supported." },
  { solution: "SAP Signavio Process Manager", capability: "BPA-PUBLISH", delivery_strength: "native", notes: "Process Manager portal with audience views." },
  { solution: "SAP Signavio Process Manager", capability: "BUSINESS-CAPABILITY-MAP", delivery_strength: "native" },
  { solution: "SAP Signavio Process Manager", capability: "REFERENCE-FRAME-LIBRARY", delivery_strength: "native", notes: "APQC PCF reference content shipped." },

  // Software AG ARIS — broad native
  { solution: "Software AG ARIS", capability: "BPA-BPMN-MODEL", delivery_strength: "native", notes: "BPMN + EPC + UML supported." },
  { solution: "Software AG ARIS", capability: "BPA-PROCESS-REPO", delivery_strength: "native" },
  { solution: "Software AG ARIS", capability: "BPA-SIMULATION", delivery_strength: "native" },
  { solution: "Software AG ARIS", capability: "BPA-VALUE-STREAM", delivery_strength: "native" },
  { solution: "Software AG ARIS", capability: "BPA-PUBLISH", delivery_strength: "native", notes: "ARIS Connect portal." },
  { solution: "Software AG ARIS", capability: "BUSINESS-CAPABILITY-MAP", delivery_strength: "native" },
  { solution: "Software AG ARIS", capability: "REFERENCE-FRAME-LIBRARY", delivery_strength: "native" },

  // Mavim — broad native, simulation lighter
  { solution: "Mavim", capability: "BPA-BPMN-MODEL", delivery_strength: "native" },
  { solution: "Mavim", capability: "BPA-PROCESS-REPO", delivery_strength: "native" },
  { solution: "Mavim", capability: "BPA-SIMULATION", delivery_strength: "partial", notes: "Lighter than Signavio/ARIS; analytics via Power BI." },
  { solution: "Mavim", capability: "BPA-VALUE-STREAM", delivery_strength: "native" },
  { solution: "Mavim", capability: "BPA-PUBLISH", delivery_strength: "native" },
  { solution: "Mavim", capability: "BUSINESS-CAPABILITY-MAP", delivery_strength: "native" },
  { solution: "Mavim", capability: "REFERENCE-FRAME-LIBRARY", delivery_strength: "native", notes: "APQC PCF shipped as Mavim Solutions content." },

  // iGrafx Process360 Live — mining-adjacent
  { solution: "iGrafx Process360 Live", capability: "BPA-BPMN-MODEL", delivery_strength: "native" },
  { solution: "iGrafx Process360 Live", capability: "BPA-PROCESS-REPO", delivery_strength: "native" },
  { solution: "iGrafx Process360 Live", capability: "BPA-SIMULATION", delivery_strength: "native", notes: "Long-standing iGrafx simulation engine." },
  { solution: "iGrafx Process360 Live", capability: "BPA-VALUE-STREAM", delivery_strength: "partial" },
  { solution: "iGrafx Process360 Live", capability: "BPA-PUBLISH", delivery_strength: "native" },
  { solution: "iGrafx Process360 Live", capability: "BUSINESS-CAPABILITY-MAP", delivery_strength: "partial" },
  { solution: "iGrafx Process360 Live", capability: "REFERENCE-FRAME-LIBRARY", delivery_strength: "partial" },

  // Bizagi Modeler and Studio — execution-first
  { solution: "Bizagi Modeler and Studio", capability: "BPA-BPMN-MODEL", delivery_strength: "native", notes: "Modeler is one of the most widely-installed BPMN tools." },
  { solution: "Bizagi Modeler and Studio", capability: "BPA-PROCESS-REPO", delivery_strength: "native" },
  { solution: "Bizagi Modeler and Studio", capability: "BPA-SIMULATION", delivery_strength: "native" },
  { solution: "Bizagi Modeler and Studio", capability: "BPA-VALUE-STREAM", delivery_strength: "partial" },
  { solution: "Bizagi Modeler and Studio", capability: "BPA-PUBLISH", delivery_strength: "native" },
  { solution: "Bizagi Modeler and Studio", capability: "BUSINESS-CAPABILITY-MAP", delivery_strength: "not_supported", notes: "Execution-platform focus; capability mapping is not part of the product." },
  { solution: "Bizagi Modeler and Studio", capability: "REFERENCE-FRAME-LIBRARY", delivery_strength: "partial" },

  // Trisotech DES — standards-purist
  { solution: "Trisotech Digital Enterprise Suite", capability: "BPA-BPMN-MODEL", delivery_strength: "native", notes: "OMG standards reference implementation." },
  { solution: "Trisotech Digital Enterprise Suite", capability: "BPA-PROCESS-REPO", delivery_strength: "native" },
  { solution: "Trisotech Digital Enterprise Suite", capability: "BPA-SIMULATION", delivery_strength: "partial" },
  { solution: "Trisotech Digital Enterprise Suite", capability: "BPA-VALUE-STREAM", delivery_strength: "partial" },
  { solution: "Trisotech Digital Enterprise Suite", capability: "BPA-PUBLISH", delivery_strength: "partial" },
  { solution: "Trisotech Digital Enterprise Suite", capability: "BUSINESS-CAPABILITY-MAP", delivery_strength: "not_supported" },
  { solution: "Trisotech Digital Enterprise Suite", capability: "REFERENCE-FRAME-LIBRARY", delivery_strength: "partial" },

  // BiZZdesign Horizzon — co-flagship EA/BPA
  { solution: "BiZZdesign Horizzon", capability: "BPA-BPMN-MODEL", delivery_strength: "native" },
  { solution: "BiZZdesign Horizzon", capability: "BPA-PROCESS-REPO", delivery_strength: "native" },
  { solution: "BiZZdesign Horizzon", capability: "BPA-SIMULATION", delivery_strength: "partial" },
  { solution: "BiZZdesign Horizzon", capability: "BPA-VALUE-STREAM", delivery_strength: "native" },
  { solution: "BiZZdesign Horizzon", capability: "BPA-PUBLISH", delivery_strength: "native" },
  { solution: "BiZZdesign Horizzon", capability: "BUSINESS-CAPABILITY-MAP", delivery_strength: "native", notes: "Capability-based planning is a Horizzon flagship." },
  { solution: "BiZZdesign Horizzon", capability: "REFERENCE-FRAME-LIBRARY", delivery_strength: "native" },

  // MEGA HOPEX — existing solution, BPA-side coverage
  { solution: "MEGA HOPEX", capability: "BPA-BPMN-MODEL", delivery_strength: "native" },
  { solution: "MEGA HOPEX", capability: "BPA-PROCESS-REPO", delivery_strength: "native" },
  { solution: "MEGA HOPEX", capability: "BPA-SIMULATION", delivery_strength: "partial" },
  { solution: "MEGA HOPEX", capability: "BPA-VALUE-STREAM", delivery_strength: "native" },
  { solution: "MEGA HOPEX", capability: "BPA-PUBLISH", delivery_strength: "native" },
  { solution: "MEGA HOPEX", capability: "BUSINESS-CAPABILITY-MAP", delivery_strength: "native" },
  { solution: "MEGA HOPEX", capability: "REFERENCE-FRAME-LIBRARY", delivery_strength: "native" },

  // Essential Cloud — APM-first; lighter BPA
  { solution: "Essential Cloud", capability: "BPA-BPMN-MODEL", delivery_strength: "partial", notes: "EA-tool-style process diagrams; not a BPMN-purist modeller." },
  { solution: "Essential Cloud", capability: "BPA-PROCESS-REPO", delivery_strength: "native" },
  { solution: "Essential Cloud", capability: "BPA-SIMULATION", delivery_strength: "not_supported" },
  { solution: "Essential Cloud", capability: "BPA-VALUE-STREAM", delivery_strength: "partial" },
  { solution: "Essential Cloud", capability: "BPA-PUBLISH", delivery_strength: "native" },
  { solution: "Essential Cloud", capability: "BUSINESS-CAPABILITY-MAP", delivery_strength: "native", notes: "Pre-built APQC PCF + BCM content is the flagship differentiator." },
  { solution: "Essential Cloud", capability: "REFERENCE-FRAME-LIBRARY", delivery_strength: "native", notes: "Differentiator: ships APQC PCF + TOGAF + BCM content out of the box." },
];

// ============================================================
// PHASE B — DATA OBJECTS + MULTI-MASTER + HANDOFFS
// ============================================================
type DataObjectSpec = {
  data_object_name: string;
  singular_label?: string; plural_label?: string; display_label: string;
  description: string;
};

const dataObjects: DataObjectSpec[] = [
  {
    data_object_name: "business_process_models",
    singular_label: "Business Process Model",
    plural_label: "Business Process Models",
    display_label: "Business Process Model",
    description:
      "A modelled artifact representing a business process (BPMN 2.0, EPC, or proprietary diagram), with version graph, lifecycle state, and metadata (owner, scope, framework lineage). Distinct from a process instance (runtime execution); this is the design-time definition.",
  },
  {
    data_object_name: "business_capability_maps",
    singular_label: "Business Capability Map",
    plural_label: "Business Capability Maps",
    display_label: "Business Capability Map",
    description:
      "Hierarchical map of an organisation's business capabilities (typically L1/L2/L3), with maturity/investment/strategic-fit heatmaps and linkage to applications, processes, value streams, and owners.",
  },
  {
    data_object_name: "value_streams",
    singular_label: "Value Stream",
    plural_label: "Value Streams",
    display_label: "Value Stream",
    description:
      "End-to-end value flow from customer demand to customer-realised value, with lead time, process time, value-add ratio, waste categorisation, and SIPOC/customer-journey overlays.",
  },
  {
    data_object_name: "process_simulation_runs",
    singular_label: "Process Simulation Run",
    plural_label: "Process Simulation Runs",
    display_label: "Process Simulation Run",
    description:
      "A single execution of a process simulation scenario (Monte Carlo or discrete-event) against a business_process_model, with inputs (resource pools, cost/time variables), outputs (throughput, bottleneck nodes), and run metadata.",
  },
];

type DomainDataObjectSpec = {
  domain_code: string;
  data_object_name: string;
  role: "master" | "contributor" | "consumer" | "derived";
  notes: string;
};

const domainDataObjects: DomainDataObjectSpec[] = [
  // business_process_models
  {
    domain_code: "BPA",
    data_object_name: "business_process_models",
    role: "master",
    notes:
      "Design-time modelling, governance lifecycle, and publication of process models. BPA tools (Signavio, ARIS, Mavim, iGrafx, Bizagi, Trisotech, BiZZdesign, MEGA HOPEX) own the modelled artifact.",
  },
  {
    domain_code: "PROC-MIN",
    data_object_name: "business_process_models",
    role: "contributor",
    notes:
      "Mining tools (Celonis, Signavio Process Intelligence, iGrafx) auto-discover process models from event logs; output feeds the BPA repository as a discovered or as-is variant.",
  },
  // business_capability_maps — co-master
  {
    domain_code: "BPA",
    data_object_name: "business_capability_maps",
    role: "master",
    notes:
      "Process-anchored capability decomposition: capabilities map onto modelled processes and value streams. Owned by the Process Office / Operational Excellence.",
  },
  {
    domain_code: "APM",
    data_object_name: "business_capability_maps",
    role: "master",
    notes:
      "Application-anchored capability mapping: capabilities map onto applications for rationalisation and TIME scoring. Owned by Enterprise Architecture. Co-master with BPA — both LeanIX/Ardoq/Alfabet and Signavio/ARIS/MEGA market this as their flagship artifact, with different anchors.",
  },
  // value_streams
  {
    domain_code: "BPA",
    data_object_name: "value_streams",
    role: "master",
    notes:
      "Lean / value-stream-mapping discipline anchored in process architecture. SIPOC, lead/process time, waste analysis.",
  },
  {
    domain_code: "PROD-MGMT",
    data_object_name: "value_streams",
    role: "contributor",
    notes:
      "Product orgs build delivery value streams (DevOps / Agile lens) — same artifact, different vantage point. Contributes flow-metric data and product-delivery slice.",
  },
  // process_simulation_runs
  {
    domain_code: "BPA",
    data_object_name: "process_simulation_runs",
    role: "master",
    notes: "Single master: simulation engines live inside BPA tooling.",
  },
];

type HandoffSpec = {
  source: string;
  target: string;
  data_object_name: string;
  trigger_event: string;
  integration_pattern: "event_stream" | "api_call" | "batch_sync" | "manual_handoff" | "file_drop";
  friction_level: "low" | "medium" | "high";
  description: string;
};

const handoffs: HandoffSpec[] = [
  {
    source: "BPA",
    target: "PROC-MIN",
    data_object_name: "business_process_models",
    trigger_event: "process_model.published",
    integration_pattern: "api_call",
    friction_level: "medium",
    description:
      "BPA tool publishes a to-be process model; mining tool ingests it as the conformance baseline against event-log data. Payload: BPMN XML + variant metadata. Failure modes: schema drift between modeller and miner, missing activity-to-event mappings.",
  },
  {
    source: "BPA",
    target: "APM",
    data_object_name: "business_capability_maps",
    trigger_event: "capability_map.updated",
    integration_pattern: "api_call",
    friction_level: "high",
    description:
      "Capability map changes invalidate APM application-to-capability heatmaps. Co-master friction: the same map exists on both sides with different lineage. Failure modes: out-of-sync versions, terminology drift between EA and Process Office, application bindings become stale.",
  },
  {
    source: "BPA",
    target: "APM",
    data_object_name: "business_process_models",
    trigger_event: "process_model.published",
    integration_pattern: "api_call",
    friction_level: "medium",
    description:
      "BPA tool publishes a process; EA tool maps applications that support it for TIME scoring. Payload: process metadata + linked capabilities. Failure modes: process owner mapping lags, capability bindings drift.",
  },
  {
    source: "PROC-MIN",
    target: "BPA",
    data_object_name: "business_process_models",
    trigger_event: "conformance.deviation_detected",
    integration_pattern: "manual_handoff",
    friction_level: "high",
    description:
      "Mining tool detects significant conformance deviation against the published model; process owner is alerted to redesign. Today usually a human handoff (ticket, email, PowerPoint review). Failure modes: deviations ignored, root cause attribution unclear, redesign cycle takes months.",
  },
  {
    source: "BPA",
    target: "PROD-MGMT",
    data_object_name: "value_streams",
    trigger_event: "value_stream.bottleneck_identified",
    integration_pattern: "manual_handoff",
    friction_level: "medium",
    description:
      "BPA-side value-stream analysis surfaces a delivery bottleneck; product management consumes for prioritisation. Today: meetings + slides. Failure modes: priorities not adjusted, no closed loop back to the value-stream artifact.",
  },
];

// ============================================================
// PHASE C — BUSINESS_FUNCTION_DOMAINS
// ============================================================
type BfDomainSpec = {
  business_function_name: string;
  domain_code: string;
  responsibility_type: "owner" | "contributor" | "consumer";
  notes: string;
};

const bfDomains: BfDomainSpec[] = [
  {
    business_function_name: "Business Operations",
    domain_code: "BPA",
    responsibility_type: "owner",
    notes: "Process Office / Operational Excellence / Transformation function. Owns the BPA tool, the process repository, and the capability map.",
  },
  {
    business_function_name: "IT Operations",
    domain_code: "BPA",
    responsibility_type: "contributor",
    notes: "Enterprise architecture function co-authors process models for IT-process alignment; bridges to APM.",
  },
  {
    business_function_name: "Compliance Operations",
    domain_code: "BPA",
    responsibility_type: "contributor",
    notes: "SOX / ISO 9001 / ISO 27001 process documentation lives in BPA; compliance team co-authors and audits.",
  },
  {
    business_function_name: "Executive",
    domain_code: "BPA",
    responsibility_type: "consumer",
    notes: "Transformation programs and operating-model decisions consume capability maps and value-stream analyses.",
  },
];

// ============================================================
// RUN
// ============================================================
async function main() {
  // -----------------------------
  // PHASE A — Market shape
  // -----------------------------
  console.log("\n========== PHASE A — Market shape ==========");

  console.log("\n=== Domains ===");
  const domainMap = await syncTable("/domains", newDomains.map(d => ({ ...d })), "domain_code");
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
    for (const domCode of c.domains) {
      const did = allDomainMap.get(domCode);
      if (!did) { console.warn(`  ! domain ${domCode} not found for capability ${c.capability_code}`); continue; }
      const key = `${cid}:${did}`;
      if (existingCapDomSet.has(key)) continue;
      existingCapDomSet.add(key);
      newCapDomRows.push({ capability_id: cid, domain_id: did, notes: "" });
    }
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
      solution_url: s.url ?? "",
      vendor_id: vendorId,
      solution_type: s.solution_type,
      is_active_in_market: true,
      notes: s.notes ?? "",
    };
  });
  await syncTable("/solutions", solutionRows, "solution_name");
  const fullSolutionsRaw = await get("/solutions?select=id,solution_name&limit=10000");
  const solutionMap = new Map<string, number>();
  for (const s of fullSolutionsRaw) solutionMap.set(String(s.solution_name), Number(s.id));

  console.log("\n=== solution_domains junctions ===");
  const existingSolDomLinks = await get("/solution_domains?select=solution_id,domain_id,coverage_level&limit=10000");
  const existingSolDomSet = new Set(existingSolDomLinks.map(r => `${r.solution_id}:${r.domain_id}:${r.coverage_level}`));
  const newSolDomRows: Row[] = [];
  let skippedSolDom = 0;
  const buildLink = (solutionName: string, code: string, coverage: "primary" | "secondary" | "partial") => {
    const sid = solutionMap.get(solutionName);
    if (!sid) { console.warn(`  ! solution ${solutionName} not found`); return; }
    const did = allDomainMap.get(code);
    if (!did) { console.warn(`  ! domain ${code} not found for ${solutionName}`); return; }
    const key = `${sid}:${did}:${coverage}`;
    if (existingSolDomSet.has(key)) { skippedSolDom++; return; }
    existingSolDomSet.add(key);
    newSolDomRows.push({ solution_id: sid, domain_id: did, coverage_level: coverage, notes: "" });
  };
  for (const s of solutions) {
    for (const code of s.primary ?? []) buildLink(s.solution_name, code, "primary");
    for (const code of s.secondary ?? []) buildLink(s.solution_name, code, "secondary");
    for (const code of s.partial ?? []) buildLink(s.solution_name, code, "partial");
  }
  for (const ex of existingSolutionExtraLinks) {
    for (const code of ex.primary ?? []) buildLink(ex.solution_name, code, "primary");
    for (const code of ex.secondary ?? []) buildLink(ex.solution_name, code, "secondary");
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

  // -----------------------------
  // PHASE B — Data-object footprint
  // -----------------------------
  console.log("\n========== PHASE B — Data-object footprint ==========");

  console.log("\n=== data_objects ===");
  const doRows = dataObjects.map(d => ({
    data_object_name: d.data_object_name,
    display_label: d.display_label,
    description: d.description,
  }));
  await syncTable("/data_objects", doRows, "data_object_name");
  const fullDoRaw = await get("/data_objects?select=id,data_object_name&limit=10000");
  const doMap = new Map<string, number>();
  for (const d of fullDoRaw) doMap.set(String(d.data_object_name), Number(d.id));

  console.log("\n=== domain_data_objects junctions ===");
  const existingDdoLinks = await get("/domain_data_objects?select=domain_id,data_object_id,role&limit=10000");
  const existingDdoSet = new Set(existingDdoLinks.map(r => `${r.domain_id}:${r.data_object_id}:${r.role}`));
  const newDdoRows: Row[] = [];
  let skippedDdo = 0;
  for (const ddo of domainDataObjects) {
    const did = allDomainMap.get(ddo.domain_code);
    const oid = doMap.get(ddo.data_object_name);
    if (!did) throw new Error(`Domain not found: ${ddo.domain_code}`);
    if (!oid) throw new Error(`Data object not found: ${ddo.data_object_name}`);
    const key = `${did}:${oid}:${ddo.role}`;
    if (existingDdoSet.has(key)) { skippedDdo++; continue; }
    existingDdoSet.add(key);
    newDdoRows.push({
      domain_id: did,
      data_object_id: oid,
      role: ddo.role,
      notes: ddo.notes,
    });
  }
  if (newDdoRows.length > 0) {
    console.log(`  inserting ${newDdoRows.length} domain_data_objects rows (${skippedDdo} already present)`);
    await insert("/domain_data_objects", newDdoRows);
  } else {
    console.log(`  no new domain_data_objects rows (${skippedDdo} already present)`);
  }

  console.log("\n=== cross_domain_handoffs ===");
  const existingHandoffLinks = await get(
    "/cross_domain_handoffs?select=source_domain_id,target_domain_id,data_object_id,trigger_event&limit=10000",
  );
  const existingHandoffSet = new Set(
    existingHandoffLinks.map(
      r => `${r.source_domain_id}:${r.target_domain_id}:${r.data_object_id}:${r.trigger_event}`,
    ),
  );
  const newHandoffRows: Row[] = [];
  let skippedHandoff = 0;
  for (const h of handoffs) {
    const src = allDomainMap.get(h.source);
    const tgt = allDomainMap.get(h.target);
    const oid = doMap.get(h.data_object_name);
    if (!src) throw new Error(`Source domain not found: ${h.source}`);
    if (!tgt) throw new Error(`Target domain not found: ${h.target}`);
    if (!oid) throw new Error(`Data object not found: ${h.data_object_name}`);
    const key = `${src}:${tgt}:${oid}:${h.trigger_event}`;
    if (existingHandoffSet.has(key)) { skippedHandoff++; continue; }
    existingHandoffSet.add(key);
    newHandoffRows.push({
      source_domain_id: src,
      target_domain_id: tgt,
      data_object_id: oid,
      trigger_event: h.trigger_event,
      integration_pattern: h.integration_pattern,
      friction_level: h.friction_level,
      description: h.description,
      notes: "",
    });
  }
  if (newHandoffRows.length > 0) {
    console.log(`  inserting ${newHandoffRows.length} cross_domain_handoffs rows (${skippedHandoff} already present)`);
    await insert("/cross_domain_handoffs", newHandoffRows);
  } else {
    console.log(`  no new cross_domain_handoffs rows (${skippedHandoff} already present)`);
  }

  // -----------------------------
  // PHASE C — Functional coverage
  // -----------------------------
  console.log("\n========== PHASE C — Functional coverage ==========");

  console.log("\n=== business_function_domains junctions ===");
  const bfsRaw = await get("/business_functions?select=id,business_function_name&limit=10000");
  const bfMap = new Map<string, number>();
  for (const r of bfsRaw) bfMap.set(String(r.business_function_name), Number(r.id));

  const existingBfdLinks = await get("/business_function_domains?select=business_function_id,domain_id,responsibility_type&limit=10000");
  const existingBfdSet = new Set(existingBfdLinks.map(r => `${r.business_function_id}:${r.domain_id}:${r.responsibility_type}`));
  const newBfdRows: Row[] = [];
  let skippedBfd = 0;
  for (const bf of bfDomains) {
    const fid = bfMap.get(bf.business_function_name);
    const did = allDomainMap.get(bf.domain_code);
    if (!fid) throw new Error(`Business function not found: ${bf.business_function_name}`);
    if (!did) throw new Error(`Domain not found: ${bf.domain_code}`);
    const key = `${fid}:${did}:${bf.responsibility_type}`;
    if (existingBfdSet.has(key)) { skippedBfd++; continue; }
    existingBfdSet.add(key);
    newBfdRows.push({
      business_function_id: fid,
      domain_id: did,
      responsibility_type: bf.responsibility_type,
      notes: bf.notes,
    });
  }
  if (newBfdRows.length > 0) {
    console.log(`  inserting ${newBfdRows.length} business_function_domains rows (${skippedBfd} already present)`);
    await insert("/business_function_domains", newBfdRows);
  } else {
    console.log(`  no new business_function_domains rows (${skippedBfd} already present)`);
  }

  // -----------------------------
  // POST-LOAD AUDIT
  // -----------------------------
  console.log("\n========== POST-LOAD AUDIT ==========");

  // Domain metadata audit (Phase A guardrail)
  const auditEmpty = await get(
    "/domains?domain_code=eq.BPA&select=domain_code,crud_percentage,min_org_size,cost_band,usa_market_size_usd_m,market_size_source_year,business_logic",
  );
  console.log("\n=== BPA domain metadata check ===");
  console.log(JSON.stringify(auditEmpty, null, 2));

  // Zero-metadata sweep (catches drift from any prior load)
  const zeroSweep = await get(
    "/domains?select=domain_code,crud_percentage,min_org_size,cost_band,usa_market_size_usd_m&crud_percentage=eq.0&order=id.desc&limit=50",
  );
  console.log(`\n=== Catalog-wide zero-metadata sweep: ${zeroSweep.length} row(s) at crud_percentage=0 ===`);
  if (zeroSweep.length > 0) {
    console.log(JSON.stringify(zeroSweep, null, 2));
  }

  // BPA scope counts
  const bpaId = allDomainMap.get("BPA");
  const apmId = allDomainMap.get("APM");
  const counts = {
    domains_total: (await get("/domains?select=id&limit=10000")).length,
    capabilities_total: (await get("/capabilities?select=id&limit=10000")).length,
    capability_domains_total: (await get("/capability_domains?select=capability_id&limit=10000")).length,
    vendors_total: (await get("/vendors?select=id&limit=10000")).length,
    solutions_total: (await get("/solutions?select=id&limit=10000")).length,
    solution_domains_total: (await get("/solution_domains?select=solution_id&limit=10000")).length,
    solution_capabilities_total: (await get("/solution_capabilities?select=solution_id&limit=10000")).length,
    data_objects_total: (await get("/data_objects?select=id&limit=10000")).length,
    domain_data_objects_total: (await get("/domain_data_objects?select=domain_id&limit=10000")).length,
    cross_domain_handoffs_total: (await get("/cross_domain_handoffs?select=id&limit=10000")).length,
    business_function_domains_total: (await get("/business_function_domains?select=business_function_id&limit=10000")).length,
    bpa_solution_domains: (await get(`/solution_domains?domain_id=eq.${bpaId}&select=solution_id&limit=10000`)).length,
    bpa_capability_domains: (await get(`/capability_domains?domain_id=eq.${bpaId}&select=capability_id&limit=10000`)).length,
    bpa_domain_data_objects: (await get(`/domain_data_objects?domain_id=eq.${bpaId}&select=data_object_id&limit=10000`)).length,
    bpa_cross_domain_handoffs_out: (await get(`/cross_domain_handoffs?source_domain_id=eq.${bpaId}&select=id&limit=10000`)).length,
    bpa_cross_domain_handoffs_in: (await get(`/cross_domain_handoffs?target_domain_id=eq.${bpaId}&select=id&limit=10000`)).length,
    bpa_business_function_domains: (await get(`/business_function_domains?domain_id=eq.${bpaId}&select=business_function_id&limit=10000`)).length,
    apm_solution_domains: (await get(`/solution_domains?domain_id=eq.${apmId}&select=solution_id&limit=10000`)).length,
  };
  console.log("\n=== Final counts ===");
  console.log(JSON.stringify(counts, null, 2));
}

await main();
