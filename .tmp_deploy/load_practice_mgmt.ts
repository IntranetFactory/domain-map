#!/usr/bin/env bun
// Loads Practice Management cluster (LEGAL/VET/ACCT, excluding HIPAA/ONC-bound markets)
// + 3 industries + 7 regulations + domain_regulations + Phase A+B+C.
// Idempotent: reads by natural key before inserting.

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
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}\nbody=${JSON.stringify(body).slice(0, 500)}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });

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

function validateDomainRow(d: Row): void {
  if (!d.crud_percentage || d.min_org_size === "" || d.cost_band === "" ||
      (d.business_logic === "" && (d.crud_percentage as number) < 95) ||
      !d.usa_market_size_usd_m || !d.market_size_source_year) {
    throw new Error(`Incomplete domain payload: ${JSON.stringify(d)}`);
  }
}

const USA_JURISDICTION_ID = 3;
const PROFESSIONAL_SERVICES_INDUSTRY_ID = 10;

// ============================================================
// INDUSTRIES
// ============================================================
const industries = [
  {
    industry_name: "Legal Services",
    naics_code: "541110",
    description: "Law firms, solo practitioners, and legal-service organisations: litigation, transactional, regulatory, IP, real-estate, family, criminal defense, and in-house counsel offshoots. Buyer profile distinct from other professional services by ABA Model Rules, IOLTA trust accounting, conflict-of-interest constraints, and matter-centric workflow. Sub-segment of Professional Services in NAICS.",
    parent_industry_id: PROFESSIONAL_SERVICES_INDUSTRY_ID,
  },
  {
    industry_name: "Accounting Services",
    naics_code: "541211",
    description: "CPA firms, tax preparers, bookkeeping practices, and accounting outsourcers. Buyer profile distinct from generic professional services by tax-calendar-driven seasonality, AICPA professional-conduct constraints, IRS Pub 4557 + GLBA taxpayer-data safeguards, and engagement-letter-driven service delivery. Sub-segment of Professional Services in NAICS.",
    parent_industry_id: PROFESSIONAL_SERVICES_INDUSTRY_ID,
  },
  {
    industry_name: "Veterinary Services",
    naics_code: "541940",
    description: "Veterinary clinics and hospitals serving companion animals, livestock, and equine practices. Distinct buyer profile from human-healthcare providers: no HIPAA exposure (animals aren't covered entities), DEA-controlled-substance ledger constraints only when prescribing animal narcotics, state-veterinary-board licensing, pet-owner-as-client (vs patient) relationship. Top-level industry: regulatory and operational profile diverges enough from generic Professional Services to warrant a separate row.",
    parent_industry_id: null,
  },
];

// ============================================================
// DOMAINS
// ============================================================
const domains = [
  {
    domain_code: "LEGAL-PRACT-MGMT",
    domain_name: "Legal Practice Management",
    description: "Law-firm operational platform: matter management (case lifecycle, parties, key dates, deadlines), timekeeper time capture and billing (ABA UTBMS task codes), IOLTA trust-account ledgering, conflict-of-interest checking across matters and adversaries, client intake, engagement letters, and matter-scoped document management. Buyer is the law firm (solo to mid-size); enterprise firms (BigLaw) buy Aderant or Elite (Thomson Reuters) at a higher tier. Vendor unconstrained by formal certification — the attorney carries all regulatory weight under ABA Model Rules and state bar ethics. Vendors: Clio (flagship), MyCase, PracticePanther, Filevine, Smokeball, CosmoLex, Centerbase.",
    business_logic: "Conflict-of-interest checking via graph-search across matters, parties, and adversaries; IOLTA trust-account ledger with three-way reconciliation (bank vs ledger vs client-balance), per-state retention rules; ABA UTBMS task/expense coding on time entries; legal-billing exception rules (block billing, fee-split agreements); statute-of-limitations and key-date alerting per matter type.",
    crud_percentage: 85,
    min_org_size: "10 xs <50",
    cost_band: "$$",
    certification_required: false,
    usa_market_size_usd_m: 2200,
    market_size_source_year: 2024,
    industry_name: "Legal Services",
  },
  {
    domain_code: "VET-PRACT-MGMT",
    domain_name: "Veterinary Practice Management",
    description: "Veterinary-clinic operational platform: animal-patient records, pet-owner relationship management, appointment scheduling (species/exam-type fit), examination notes, vaccination and reminder protocols, drug inventory and controlled-substance ledger, lab-results integration, in-clinic POS, and boarding/grooming scheduling. Buyer is the veterinary clinic or hospital, solo to multi-site. No HIPAA exposure (animals aren't covered entities); DEA Controlled Substances Act applies to e-prescribing modules. Vendors: IDEXX (Cornerstone, ezyVet), Covetrus (AVImark, ImproMed, Vetspire), Provet Cloud (Nordic), Mars/Pulse, Patterson Veterinary, Hippo Manager.",
    business_logic: "Species/breed-specific weight-based drug-dosing calculations, DEA Schedule II–V controlled-substance ledger with reconciliation, preventive-care reminder protocols by species/breed/age, multi-pet household visit consolidation, lab-results trending across visits, boarding/grooming reservation overlap with exam appointments.",
    crud_percentage: 85,
    min_org_size: "10 xs <50",
    cost_band: "$$",
    certification_required: false,
    usa_market_size_usd_m: 600,
    market_size_source_year: 2024,
    industry_name: "Veterinary Services",
  },
  {
    domain_code: "ACCT-PRACT-MGMT",
    domain_name: "Accounting Practice Management",
    description: "CPA / tax-preparer practice operating platform: client and engagement management, workflow templates per service line (1040, 1120, 1065, audit, bookkeeping, advisory), recurring-task generation against tax-calendar deadlines, time and billing, engagement-letter and proposal management, secure client portal for document exchange, and capacity-vs-due-date analytics. Buyer is the CPA firm or tax-prep practice, solo to mid-size. Vendor unconstrained — IRS Pub 4557 and GLBA regulate the preparer; SOC 2 is commercially expected but voluntary. Vendors: Karbon (flagship), Canopy, TaxDome, Jetpack Workflow, CCH Axcess (Wolters Kluwer), Aiwyn, Liscio, Ignition.",
    business_logic: "Tax-calendar-driven workflow generation (Jan 31 1099/W-2, March 15 1120-S/1065, April 15 1040/1120, Oct 15 extensions, etc.), client-folder document-retention rules per IRS/state preparer requirements, engagement-letter e-signature chains with retainer-payment gating, capacity forecasting through tax season (timekeeper bandwidth vs filing deadlines), per-engagement workflow checkpoints with sign-off.",
    crud_percentage: 88,
    min_org_size: "10 xs <50",
    cost_band: "$$",
    certification_required: false,
    usa_market_size_usd_m: 800,
    market_size_source_year: 2024,
    industry_name: "Accounting Services",
  },
];
domains.forEach(validateDomainRow);

// ============================================================
// CAPABILITIES
// ============================================================
const capabilities = [
  // LEGAL
  { capability_code: "LEGAL-MATTER-MGMT", capability_name: "Legal Matter Management", description: "Matter intake, lifecycle, party tracking (clients, opposing parties, co-counsel, courts), key-date and statute-of-limitations alerting, matter-status reporting." },
  { capability_code: "LEGAL-TIME-BILLING", capability_name: "Legal Time Capture and Billing", description: "Timekeeper time-entry capture with ABA UTBMS task/expense codes, hourly-vs-flat-vs-contingency-vs-AFA billing models, prebill review, e-bill submission (LEDES 1998B/2000)." },
  { capability_code: "LEGAL-TRUST-ACCT", capability_name: "IOLTA Trust Accounting", description: "Separated trust-account ledgering per client and matter, three-way reconciliation (bank statement vs ledger vs client-balance), state-specific retention rules, transfer-to-operating-on-earned." },
  { capability_code: "LEGAL-CONFLICT-CHECK", capability_name: "Conflict-of-Interest Checking", description: "Graph-search of new matters against existing client/party/adversary relationships, conflict-waiver tracking, ethics-wall management for shielded matter teams." },
  { capability_code: "LEGAL-DOC-MGMT", capability_name: "Legal Document Management", description: "Matter-scoped document storage with version control, e-signature integration, document automation/assembly from templates, document-numbering compliance." },
  { capability_code: "LEGAL-CLIENT-INTAKE", capability_name: "Legal Client Intake and Engagement", description: "Online intake forms with conflict-check trigger, engagement-letter drafting from templates, retainer-payment collection, intake-to-matter conversion workflow." },
  // VET
  { capability_code: "VET-PATIENT-CARE", capability_name: "Animal Patient Records and Exams", description: "Animal-patient master (species, breed, age, weight, sex, microchip), examination SOAP notes, vaccination history, problem list, chronic-condition tracking." },
  { capability_code: "VET-APPT-SCHED", capability_name: "Veterinary Appointment Scheduling", description: "Appointment booking with species/exam-type fit, multi-pet household batching, online booking integration, no-show / waitlist management." },
  { capability_code: "VET-INVOICING", capability_name: "Veterinary Invoicing and POS", description: "Services + product + lab + drug invoicing with per-item taxability, in-clinic POS for retail (food, supplies), client payment plans, third-party-payer (CareCredit, Trupanion) integration." },
  { capability_code: "VET-INVENTORY-RX", capability_name: "Veterinary Drug Inventory and Controlled-Substance Ledger", description: "Drug inventory with lot tracking, controlled-substance Schedule II–V ledger reconciliation, e-prescribing (where DEA-certified), automated reorder thresholds." },
  { capability_code: "VET-LAB-INTEGRATION", capability_name: "Veterinary Lab Results Integration", description: "Bi-directional integration with reference labs (IDEXX Reference, Antech, Heska) and in-house analyzers, structured results into patient record, trending across visits." },
  { capability_code: "VET-REMINDER-MGMT", capability_name: "Veterinary Reminder and Recall Management", description: "Preventive-care reminders (vaccines, dental, geriatric exams) by species/breed/age, multi-channel outreach (SMS, email, postcard), reminder-effectiveness analytics." },
  // ACCT
  { capability_code: "ACCT-WORKFLOW", capability_name: "Accounting Engagement Workflow", description: "Per-engagement workflow templates (1040, 1120, 1065, audit, bookkeeping), task assignment, sign-off checkpoints, partner-review routing." },
  { capability_code: "ACCT-CLIENT-PORTAL", capability_name: "Accounting Client Portal and Document Exchange", description: "Secure portal for client document upload (W-2, 1099, K-1, bank statements), e-signature on tax forms (8879), client-task-list tracking." },
  { capability_code: "ACCT-TIME-BILLING", capability_name: "Accounting Time and Billing", description: "Timekeeper time-entry per engagement, value-billing vs hourly options, WIP and AR reporting, fee-quote-to-invoice workflow." },
  { capability_code: "ACCT-ENGAGEMENT-LTR", capability_name: "Engagement Letter and Proposal Management", description: "Engagement-letter templates per service line, proposal generation, e-signature with retainer-payment collection, recurring annual re-engagement workflow." },
  { capability_code: "ACCT-DEADLINE-MGMT", capability_name: "Tax Calendar and Deadline Management", description: "Tax-calendar-driven recurring deadlines (federal, state, local) per engagement type, extension-form generation, deadline-vs-capacity dashboards." },
  { capability_code: "ACCT-DOC-MGMT", capability_name: "Accounting Document Management and Retention", description: "Client-folder document storage with IRS / state preparer retention rules, prior-year carryforward, document-classification by year and form type." },
];

const capabilityDomains = [
  ...["LEGAL-MATTER-MGMT", "LEGAL-TIME-BILLING", "LEGAL-TRUST-ACCT", "LEGAL-CONFLICT-CHECK", "LEGAL-DOC-MGMT", "LEGAL-CLIENT-INTAKE"].map(c => ({ capability_code: c, domain_code: "LEGAL-PRACT-MGMT" })),
  ...["VET-PATIENT-CARE", "VET-APPT-SCHED", "VET-INVOICING", "VET-INVENTORY-RX", "VET-LAB-INTEGRATION", "VET-REMINDER-MGMT"].map(c => ({ capability_code: c, domain_code: "VET-PRACT-MGMT" })),
  ...["ACCT-WORKFLOW", "ACCT-CLIENT-PORTAL", "ACCT-TIME-BILLING", "ACCT-ENGAGEMENT-LTR", "ACCT-DEADLINE-MGMT", "ACCT-DOC-MGMT"].map(c => ({ capability_code: c, domain_code: "ACCT-PRACT-MGMT" })),
];

// ============================================================
// VENDORS (Wolters Kluwer reused)
// ============================================================
const vendors = [
  // LEGAL
  { vendor_name: "Clio", vendor_url: "https://www.clio.com", headquarters_country: "Canada", description: "Cloud legal-practice-management vendor; flagship for SMB and mid-size law firms (Clio Manage + Clio Grow).", notes: "" },
  { vendor_name: "AffiniPay", vendor_url: "https://www.affinipay.com", headquarters_country: "USA", description: "Payments and practice-management holding company; owner of MyCase, LawPay, CASEpeer, Docketwise.", notes: "MyCase acquired 2020." },
  { vendor_name: "Paradigm", vendor_url: "https://www.paradigm.com", headquarters_country: "USA", description: "Legal-tech holding (PracticePanther, Bill4Time, TrustBooks); SMB and mid-size law-firm management.", notes: "" },
  { vendor_name: "Filevine", vendor_url: "https://www.filevine.com", headquarters_country: "USA", description: "Legal-case-management and matter-workflow vendor with litigation focus.", notes: "" },
  { vendor_name: "Smokeball", vendor_url: "https://www.smokeball.com", headquarters_country: "USA", description: "Practice-management vendor for small law firms with strong document automation and time-capture.", notes: "" },
  { vendor_name: "ProfitSolv", vendor_url: "https://www.profitsolv.com", headquarters_country: "USA", description: "Legal-tech holding (CosmoLex, Rocket Matter, Tabs3, TimeSolv); spans solo to mid-size firm management.", notes: "" },
  { vendor_name: "Centerbase", vendor_url: "https://www.centerbase.com", headquarters_country: "USA", description: "Mid-size law-firm practice-management vendor (now part of Aderant).", notes: "Acquired by Aderant 2024." },
  { vendor_name: "Aderant", vendor_url: "https://www.aderant.com", headquarters_country: "USA", description: "Enterprise law-firm management platform vendor (Expert, Total Office); strong BigLaw / AmLaw footprint.", notes: "Owned by Roper Technologies." },
  // VET
  { vendor_name: "IDEXX Laboratories", vendor_url: "https://www.idexx.com", headquarters_country: "USA", description: "Veterinary diagnostics and software vendor; Cornerstone (legacy) and ezyVet (cloud) PIMS platforms.", notes: "ezyVet acquired 2018." },
  { vendor_name: "Covetrus", vendor_url: "https://www.covetrus.com", headquarters_country: "USA", description: "Animal-health technology and supply vendor; AVImark, ImproMed, Vetspire, Pulse PIMS platforms.", notes: "Pulse / Vetstoria portfolio expanding." },
  { vendor_name: "Patterson Veterinary", vendor_url: "https://www.pattersonvet.com", headquarters_country: "USA", description: "Veterinary distribution and software vendor; eVetPractice, NaVetor PIMS platforms.", notes: "Subsidiary of Patterson Companies." },
  { vendor_name: "Provet Cloud", vendor_url: "https://www.provet.cloud", headquarters_country: "Finland", description: "Cloud-native veterinary PIMS vendor; strong European footprint, expanding in North America.", notes: "Acquired by Nordic Capital portfolio." },
  { vendor_name: "Mars Veterinary Health", vendor_url: "https://www.marsveterinary.com", headquarters_country: "USA", description: "Mars Inc subsidiary operating veterinary hospitals (Banfield, BluePearl, VCA); Pulse PIMS platform for internal use and partners.", notes: "" },
  { vendor_name: "Hippo Manager", vendor_url: "https://www.hippomanager.com", headquarters_country: "USA", description: "Cloud SMB veterinary PIMS vendor.", notes: "" },
  { vendor_name: "Shepherd Veterinary Software", vendor_url: "https://www.shepherd.vet", headquarters_country: "USA", description: "Cloud veterinary PIMS vendor focused on user experience for clinic staff.", notes: "" },
  // ACCT (Wolters Kluwer reused)
  { vendor_name: "Karbon", vendor_url: "https://www.karbonhq.com", headquarters_country: "USA", description: "Practice-management and workflow vendor for accounting firms; collaboration-focused.", notes: "" },
  { vendor_name: "Canopy Tax", vendor_url: "https://www.getcanopy.com", headquarters_country: "USA", description: "Accounting practice-management vendor; client portal, document mgmt, workflow, billing.", notes: "" },
  { vendor_name: "TaxDome", vendor_url: "https://taxdome.com", headquarters_country: "USA", description: "All-in-one practice-management platform for tax preparers; client portal, e-sign, workflow, invoicing.", notes: "" },
  { vendor_name: "Jetpack Workflow", vendor_url: "https://jetpackworkflow.com", headquarters_country: "USA", description: "Workflow management vendor for accounting firms; recurring task templates.", notes: "" },
  { vendor_name: "Aiwyn", vendor_url: "https://aiwyn.ai", headquarters_country: "USA", description: "AI-driven engagement, billing, and collection platform for accounting firms.", notes: "" },
  { vendor_name: "Liscio", vendor_url: "https://www.liscio.me", headquarters_country: "USA", description: "Secure client-communication and document-exchange platform for accounting firms.", notes: "" },
  { vendor_name: "Ignition", vendor_url: "https://www.ignitionapp.com", headquarters_country: "Australia", description: "Engagement-letter, proposal, and recurring-billing platform for accounting and consulting firms.", notes: "Formerly Practice Ignition." },
];

// ============================================================
// SOLUTIONS
// ============================================================
type SolutionRow = {
  solution_name: string;
  vendor_name: string;
  description: string;
  solution_url: string;
  solution_type: string;
  is_active_in_market: boolean;
  min_org_size: string;
  max_org_size: string;
  cost_band: string;
  solution_kind: string;
  notes: string;
};
const solutions: SolutionRow[] = [
  // LEGAL
  { solution_name: "Clio Manage", vendor_name: "Clio", description: "Cloud legal-practice-management platform: matter management, time/billing, trust accounting, document management, client intake (with Clio Grow).", solution_url: "https://www.clio.com/clio-manage/", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "40 l <10000", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "MyCase", vendor_name: "AffiniPay", description: "Cloud practice-management platform: matter, time/billing, trust, client portal, with LawPay integration.", solution_url: "https://www.mycase.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "PracticePanther", vendor_name: "Paradigm", description: "Cloud practice-management for SMB law firms: matter, billing, trust, intake.", solution_url: "https://www.practicepanther.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Filevine", vendor_name: "Filevine", description: "Legal case-management platform with strong litigation-workflow customization, document automation, and lead-to-matter pipeline.", solution_url: "https://www.filevine.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "40 l <10000", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Smokeball", vendor_name: "Smokeball", description: "Practice-management for small law firms with automatic time-capture and 20,000+ legal-form library.", solution_url: "https://www.smokeball.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "CosmoLex", vendor_name: "ProfitSolv", description: "All-in-one practice-management with integrated legal-specific accounting (no QuickBooks needed); strong trust-accounting compliance.", solution_url: "https://www.cosmolex.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Centerbase", vendor_name: "Centerbase", description: "Mid-size firm practice-management platform with deep customization, BI, and time-and-billing.", solution_url: "https://www.centerbase.com", solution_type: "saas", is_active_in_market: true, min_org_size: "20 s <500", max_org_size: "40 l <10000", cost_band: "$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Aderant Expert", vendor_name: "Aderant", description: "Enterprise legal-management platform for AmLaw/BigLaw firms: matter, time, billing, accounting, conflicts, e-billing.", solution_url: "https://www.aderant.com/products/expert/", solution_type: "saas", is_active_in_market: true, min_org_size: "30 m <2500", max_org_size: "50 xl 10000+", cost_band: "$$$$", solution_kind: "standard_solution", notes: "" },
  // VET
  { solution_name: "IDEXX Cornerstone", vendor_name: "IDEXX Laboratories", description: "Legacy on-prem veterinary PIMS with deep workflow customization; large installed base.", solution_url: "https://www.idexx.com/en/veterinary/software-services/practice-management/cornerstone/", solution_type: "on_prem", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "40 l <10000", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "ezyVet", vendor_name: "IDEXX Laboratories", description: "Cloud-native veterinary PIMS with strong UX, integrations, and multi-site support.", solution_url: "https://www.ezyvet.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "40 l <10000", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "AVImark", vendor_name: "Covetrus", description: "Established on-prem veterinary PIMS with broad SMB installed base; appointment, medical records, invoicing.", solution_url: "https://software.covetrus.com/products/avimark/", solution_type: "on_prem", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "ImproMed", vendor_name: "Covetrus", description: "Veterinary PIMS for larger hospitals and multi-site practices; deep clinical workflow.", solution_url: "https://software.covetrus.com/products/impromed/", solution_type: "on_prem", is_active_in_market: true, min_org_size: "20 s <500", max_org_size: "40 l <10000", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Vetspire", vendor_name: "Covetrus", description: "Modern cloud veterinary PIMS designed for high-volume corporate veterinary groups.", solution_url: "https://www.vetspire.com", solution_type: "saas", is_active_in_market: true, min_org_size: "20 s <500", max_org_size: "50 xl 10000+", cost_band: "$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Provet Cloud", vendor_name: "Provet Cloud", description: "Cloud veterinary PIMS with strong configurability across small-animal, equine, and large-animal practices.", solution_url: "https://www.provet.cloud", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "40 l <10000", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "NaVetor", vendor_name: "Patterson Veterinary", description: "Cloud veterinary PIMS with intuitive workflow; sister product to on-prem Patterson eVetPractice.", solution_url: "https://www.navetor.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Hippo Manager", vendor_name: "Hippo Manager", description: "Affordable cloud PIMS for small veterinary practices.", solution_url: "https://www.hippomanager.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "20 s <500", cost_band: "$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Shepherd", vendor_name: "Shepherd Veterinary Software", description: "Cloud PIMS emphasizing staff usability and rapid clinic workflow.", solution_url: "https://www.shepherd.vet", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "20 s <500", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  // ACCT
  { solution_name: "Karbon", vendor_name: "Karbon", description: "Practice-management platform with email triage, client tasks, workflow, and engagement-letter integrations; built for accounting firm collaboration.", solution_url: "https://www.karbonhq.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "40 l <10000", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Canopy", vendor_name: "Canopy Tax", description: "Cloud practice-management for tax practices: client portal, document mgmt, time/billing, IRS transcripts.", solution_url: "https://www.getcanopy.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "TaxDome", vendor_name: "TaxDome", description: "All-in-one tax-practice platform: workflow, client portal, e-signature, invoicing, and document mgmt.", solution_url: "https://taxdome.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Jetpack Workflow", vendor_name: "Jetpack Workflow", description: "Recurring-task and workflow management for accounting firms; templates for repeating engagements.", solution_url: "https://jetpackworkflow.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "20 s <500", cost_band: "$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "CCH Axcess Practice", vendor_name: "Wolters Kluwer", description: "Cloud practice-management for accounting firms: workflow, time/billing, client management, document mgmt; integrates with CCH Axcess Tax suite.", solution_url: "https://www.wolterskluwer.com/en/solutions/cch-axcess/practice", solution_type: "saas", is_active_in_market: true, min_org_size: "20 s <500", max_org_size: "50 xl 10000+", cost_band: "$$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Aiwyn", vendor_name: "Aiwyn", description: "AI billing, engagement, and collections automation platform for mid-to-large accounting firms.", solution_url: "https://aiwyn.ai", solution_type: "saas", is_active_in_market: true, min_org_size: "20 s <500", max_org_size: "40 l <10000", cost_band: "$$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Liscio", vendor_name: "Liscio", description: "Secure client-communication and document-exchange platform; replaces email + portals for accounting client interactions.", solution_url: "https://www.liscio.me", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
  { solution_name: "Ignition", vendor_name: "Ignition", description: "Engagement-letter, proposal, and recurring-billing platform with payment automation.", solution_url: "https://www.ignitionapp.com", solution_type: "saas", is_active_in_market: true, min_org_size: "10 xs <50", max_org_size: "30 m <2500", cost_band: "$$", solution_kind: "standard_solution", notes: "" },
];

// ============================================================
// SOLUTION_DOMAINS
// ============================================================
type SolDomain = { solution_name: string; domain_code: string; coverage_level: string };
const solutionDomains: SolDomain[] = [
  ...["Clio Manage", "MyCase", "PracticePanther", "Filevine", "Smokeball", "CosmoLex", "Centerbase", "Aderant Expert"].map(s => ({ solution_name: s, domain_code: "LEGAL-PRACT-MGMT", coverage_level: "primary" })),
  ...["IDEXX Cornerstone", "ezyVet", "AVImark", "ImproMed", "Vetspire", "Provet Cloud", "NaVetor", "Hippo Manager", "Shepherd"].map(s => ({ solution_name: s, domain_code: "VET-PRACT-MGMT", coverage_level: "primary" })),
  ...["Karbon", "Canopy", "TaxDome", "Jetpack Workflow", "CCH Axcess Practice", "Aiwyn", "Liscio", "Ignition"].map(s => ({ solution_name: s, domain_code: "ACCT-PRACT-MGMT", coverage_level: "primary" })),
];

// ============================================================
// SOLUTION_CAPABILITIES (focused)
// ============================================================
type SolCap = { solution_name: string; capability_code: string; delivery_strength: string; notes: string };
const SC = (sol: string, capCode: string, strength: string, notes = ""): SolCap =>
  ({ solution_name: sol, capability_code: capCode, delivery_strength: strength, notes });

const solutionCapabilities: SolCap[] = [
  // Clio Manage — broad coverage
  SC("Clio Manage", "LEGAL-MATTER-MGMT", "native"),
  SC("Clio Manage", "LEGAL-TIME-BILLING", "native"),
  SC("Clio Manage", "LEGAL-TRUST-ACCT", "native"),
  SC("Clio Manage", "LEGAL-CONFLICT-CHECK", "native"),
  SC("Clio Manage", "LEGAL-DOC-MGMT", "native"),
  SC("Clio Manage", "LEGAL-CLIENT-INTAKE", "native", "Via Clio Grow add-on"),
  // MyCase
  SC("MyCase", "LEGAL-MATTER-MGMT", "native"),
  SC("MyCase", "LEGAL-TIME-BILLING", "native"),
  SC("MyCase", "LEGAL-TRUST-ACCT", "native"),
  SC("MyCase", "LEGAL-CONFLICT-CHECK", "partial"),
  SC("MyCase", "LEGAL-DOC-MGMT", "native"),
  SC("MyCase", "LEGAL-CLIENT-INTAKE", "native"),
  // PracticePanther
  SC("PracticePanther", "LEGAL-MATTER-MGMT", "native"),
  SC("PracticePanther", "LEGAL-TIME-BILLING", "native"),
  SC("PracticePanther", "LEGAL-TRUST-ACCT", "native"),
  SC("PracticePanther", "LEGAL-CONFLICT-CHECK", "partial"),
  SC("PracticePanther", "LEGAL-CLIENT-INTAKE", "native"),
  // Filevine — litigation-strong
  SC("Filevine", "LEGAL-MATTER-MGMT", "native"),
  SC("Filevine", "LEGAL-DOC-MGMT", "native"),
  SC("Filevine", "LEGAL-CLIENT-INTAKE", "native"),
  SC("Filevine", "LEGAL-TIME-BILLING", "partial"),
  SC("Filevine", "LEGAL-TRUST-ACCT", "via_extension"),
  // Smokeball
  SC("Smokeball", "LEGAL-MATTER-MGMT", "native"),
  SC("Smokeball", "LEGAL-TIME-BILLING", "native", "Automatic time capture is differentiator"),
  SC("Smokeball", "LEGAL-DOC-MGMT", "native"),
  SC("Smokeball", "LEGAL-CLIENT-INTAKE", "native"),
  SC("Smokeball", "LEGAL-TRUST-ACCT", "native"),
  // CosmoLex
  SC("CosmoLex", "LEGAL-MATTER-MGMT", "native"),
  SC("CosmoLex", "LEGAL-TIME-BILLING", "native"),
  SC("CosmoLex", "LEGAL-TRUST-ACCT", "native", "Integrated legal accounting (no QuickBooks)"),
  SC("CosmoLex", "LEGAL-DOC-MGMT", "native"),
  // Centerbase
  SC("Centerbase", "LEGAL-MATTER-MGMT", "native"),
  SC("Centerbase", "LEGAL-TIME-BILLING", "native"),
  SC("Centerbase", "LEGAL-TRUST-ACCT", "native"),
  SC("Centerbase", "LEGAL-CONFLICT-CHECK", "native"),
  // Aderant Expert
  SC("Aderant Expert", "LEGAL-MATTER-MGMT", "native"),
  SC("Aderant Expert", "LEGAL-TIME-BILLING", "native"),
  SC("Aderant Expert", "LEGAL-TRUST-ACCT", "native"),
  SC("Aderant Expert", "LEGAL-CONFLICT-CHECK", "native"),
  SC("Aderant Expert", "LEGAL-DOC-MGMT", "via_extension"),

  // VET
  SC("IDEXX Cornerstone", "VET-PATIENT-CARE", "native"),
  SC("IDEXX Cornerstone", "VET-APPT-SCHED", "native"),
  SC("IDEXX Cornerstone", "VET-INVOICING", "native"),
  SC("IDEXX Cornerstone", "VET-INVENTORY-RX", "native"),
  SC("IDEXX Cornerstone", "VET-LAB-INTEGRATION", "native", "Best-in-class with IDEXX Reference"),
  SC("IDEXX Cornerstone", "VET-REMINDER-MGMT", "native"),
  SC("ezyVet", "VET-PATIENT-CARE", "native"),
  SC("ezyVet", "VET-APPT-SCHED", "native"),
  SC("ezyVet", "VET-INVOICING", "native"),
  SC("ezyVet", "VET-INVENTORY-RX", "native"),
  SC("ezyVet", "VET-LAB-INTEGRATION", "native"),
  SC("ezyVet", "VET-REMINDER-MGMT", "native"),
  SC("AVImark", "VET-PATIENT-CARE", "native"),
  SC("AVImark", "VET-APPT-SCHED", "native"),
  SC("AVImark", "VET-INVOICING", "native"),
  SC("AVImark", "VET-INVENTORY-RX", "native"),
  SC("AVImark", "VET-REMINDER-MGMT", "native"),
  SC("ImproMed", "VET-PATIENT-CARE", "native"),
  SC("ImproMed", "VET-APPT-SCHED", "native"),
  SC("ImproMed", "VET-INVOICING", "native"),
  SC("ImproMed", "VET-INVENTORY-RX", "native"),
  SC("ImproMed", "VET-LAB-INTEGRATION", "native"),
  SC("Vetspire", "VET-PATIENT-CARE", "native"),
  SC("Vetspire", "VET-APPT-SCHED", "native"),
  SC("Vetspire", "VET-INVOICING", "native"),
  SC("Vetspire", "VET-LAB-INTEGRATION", "native"),
  SC("Vetspire", "VET-REMINDER-MGMT", "native"),
  SC("Provet Cloud", "VET-PATIENT-CARE", "native"),
  SC("Provet Cloud", "VET-APPT-SCHED", "native"),
  SC("Provet Cloud", "VET-INVOICING", "native"),
  SC("Provet Cloud", "VET-LAB-INTEGRATION", "native"),
  SC("Provet Cloud", "VET-INVENTORY-RX", "native"),
  SC("NaVetor", "VET-PATIENT-CARE", "native"),
  SC("NaVetor", "VET-APPT-SCHED", "native"),
  SC("NaVetor", "VET-INVOICING", "native"),
  SC("NaVetor", "VET-REMINDER-MGMT", "native"),
  SC("Hippo Manager", "VET-PATIENT-CARE", "native"),
  SC("Hippo Manager", "VET-APPT-SCHED", "native"),
  SC("Hippo Manager", "VET-INVOICING", "native"),
  SC("Shepherd", "VET-PATIENT-CARE", "native"),
  SC("Shepherd", "VET-APPT-SCHED", "native"),
  SC("Shepherd", "VET-INVOICING", "native"),

  // ACCT
  SC("Karbon", "ACCT-WORKFLOW", "native"),
  SC("Karbon", "ACCT-CLIENT-PORTAL", "native"),
  SC("Karbon", "ACCT-TIME-BILLING", "native"),
  SC("Karbon", "ACCT-DEADLINE-MGMT", "native"),
  SC("Karbon", "ACCT-DOC-MGMT", "partial"),
  SC("Karbon", "ACCT-ENGAGEMENT-LTR", "via_extension", "Via Ignition integration"),
  SC("Canopy", "ACCT-WORKFLOW", "native"),
  SC("Canopy", "ACCT-CLIENT-PORTAL", "native"),
  SC("Canopy", "ACCT-TIME-BILLING", "native"),
  SC("Canopy", "ACCT-DEADLINE-MGMT", "native"),
  SC("Canopy", "ACCT-DOC-MGMT", "native"),
  SC("Canopy", "ACCT-ENGAGEMENT-LTR", "partial"),
  SC("TaxDome", "ACCT-WORKFLOW", "native"),
  SC("TaxDome", "ACCT-CLIENT-PORTAL", "native"),
  SC("TaxDome", "ACCT-TIME-BILLING", "native"),
  SC("TaxDome", "ACCT-DEADLINE-MGMT", "native"),
  SC("TaxDome", "ACCT-DOC-MGMT", "native"),
  SC("TaxDome", "ACCT-ENGAGEMENT-LTR", "native"),
  SC("Jetpack Workflow", "ACCT-WORKFLOW", "native"),
  SC("Jetpack Workflow", "ACCT-DEADLINE-MGMT", "native"),
  SC("Jetpack Workflow", "ACCT-CLIENT-PORTAL", "not_supported"),
  SC("CCH Axcess Practice", "ACCT-WORKFLOW", "native"),
  SC("CCH Axcess Practice", "ACCT-TIME-BILLING", "native"),
  SC("CCH Axcess Practice", "ACCT-DOC-MGMT", "native"),
  SC("CCH Axcess Practice", "ACCT-DEADLINE-MGMT", "native"),
  SC("Aiwyn", "ACCT-ENGAGEMENT-LTR", "native"),
  SC("Aiwyn", "ACCT-TIME-BILLING", "native"),
  SC("Aiwyn", "ACCT-WORKFLOW", "partial"),
  SC("Liscio", "ACCT-CLIENT-PORTAL", "native"),
  SC("Liscio", "ACCT-DOC-MGMT", "native"),
  SC("Ignition", "ACCT-ENGAGEMENT-LTR", "native"),
  SC("Ignition", "ACCT-TIME-BILLING", "partial"),
];

// ============================================================
// REGULATIONS (7 new — HIPAA, HITECH, ONC excluded by user direction)
// ============================================================
type RegRow = {
  regulation_name: string;
  regulation_code: string;
  regulation_type: string;
  jurisdiction_id: number | null;
  issuing_body: string;
  certification_required: boolean;
  regulation_url: string;
  description: string;
};
const regulations: RegRow[] = [
  {
    regulation_name: "ABA Model Rule 1.6 (Confidentiality of Information)",
    regulation_code: "ABA-MR-1.6",
    regulation_type: "industry_standard",
    jurisdiction_id: USA_JURISDICTION_ID,
    issuing_body: "American Bar Association (adopted by state bars)",
    certification_required: false,
    regulation_url: "https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_1_6_confidentiality_of_information/",
    description: "ABA Model Rule 1.6 requires lawyers to keep client information confidential and to make reasonable efforts to prevent inadvertent or unauthorized disclosure. Adopted (with variations) by every US state bar. Regulates the attorney, not the software vendor — vendor must enable confidentiality features, but the lawyer carries liability.",
  },
  {
    regulation_name: "ABA Model Rule 1.15 (Safekeeping Property) / IOLTA",
    regulation_code: "ABA-MR-1.15-IOLTA",
    regulation_type: "industry_standard",
    jurisdiction_id: USA_JURISDICTION_ID,
    issuing_body: "American Bar Association + state IOLTA programs",
    certification_required: false,
    regulation_url: "https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_1_15_safekeeping_property/",
    description: "ABA Model Rule 1.15 and state IOLTA (Interest on Lawyers Trust Accounts) programs require lawyers to hold client funds in separate trust accounts, maintain detailed ledgers, perform three-way reconciliation, and remit interest to state-administered legal-aid programs. Practice-management vendors typically advertise 'IOLTA-compliant' features but the lawyer is the account holder and bears the regulatory burden.",
  },
  {
    regulation_name: "Federal Rules of Civil Procedure — eDiscovery (Rules 26-37)",
    regulation_code: "FRCP-EDISCOVERY",
    regulation_type: "industry_standard",
    jurisdiction_id: USA_JURISDICTION_ID,
    issuing_body: "US Judicial Conference",
    certification_required: false,
    regulation_url: "https://www.uscourts.gov/rules-policies/current-rules-practice-procedure/federal-rules-civil-procedure",
    description: "FRCP Rules 26-37 govern discovery of electronically stored information (ESI) in federal civil litigation: preservation duties, production format, proportionality, sanctions for spoliation. Constrains how law firms manage matter-scoped documents and preservation holds. State-court eDiscovery rules largely mirror.",
  },
  {
    regulation_name: "IRS Publication 4557 — Safeguarding Taxpayer Data",
    regulation_code: "IRS-PUB-4557",
    regulation_type: "data_privacy",
    jurisdiction_id: USA_JURISDICTION_ID,
    issuing_body: "Internal Revenue Service",
    certification_required: false,
    regulation_url: "https://www.irs.gov/pub/irs-pdf/p4557.pdf",
    description: "IRS Pub 4557 provides safeguarding requirements for tax preparers handling taxpayer data: written information-security plan (WISP), data encryption, access controls, breach response, and reporting. Required for any preparer with a PTIN. Enforced under GLBA Safeguards Rule (FTC) for tax preparers, who are classified as financial institutions for GLBA purposes (per IRS Pub 5293).",
  },
  {
    regulation_name: "AICPA Code of Professional Conduct",
    regulation_code: "AICPA-CODE",
    regulation_type: "industry_standard",
    jurisdiction_id: USA_JURISDICTION_ID,
    issuing_body: "American Institute of Certified Public Accountants",
    certification_required: false,
    regulation_url: "https://us.aicpa.org/research/standards/codeofconduct",
    description: "AICPA Code of Professional Conduct governs CPAs in public practice: confidential client information (Section 1.700), independence (Section 1.200), integrity and objectivity (Section 1.100), client communications, contingent fees, commissions. State CPA boards adopt with state-specific variations. Regulates the CPA, not the vendor.",
  },
  {
    regulation_name: "Controlled Substances Act (DEA Schedule II-V)",
    regulation_code: "CSA-DEA",
    regulation_type: "industry_standard",
    jurisdiction_id: USA_JURISDICTION_ID,
    issuing_body: "US Drug Enforcement Administration",
    certification_required: true,
    regulation_url: "https://www.deadiversion.usdoj.gov/21cfr/cfr/",
    description: "Controlled Substances Act requires registrants (including veterinarians) to maintain perpetual inventory of Schedule II-V controlled substances, conduct biennial reconciliations, and use DEA-certified e-prescribing platforms (EPCS). Veterinary clinics must maintain controlled-substance ledgers separately from general inventory. For e-prescribing, the vendor's EPCS module must pass third-party security audit per 21 CFR Part 1311.",
  },
  {
    regulation_name: "State Veterinary Practice Acts",
    regulation_code: "STATE-VET-PRACT",
    regulation_type: "country_localization",
    jurisdiction_id: USA_JURISDICTION_ID,
    issuing_body: "State veterinary medical boards (50+ jurisdictions)",
    certification_required: false,
    regulation_url: "https://www.aavsb.org/board-services/",
    description: "Each US state's Veterinary Practice Act governs licensure, supervision of veterinary technicians, recordkeeping (retention of patient records 3-7 years typically), informed consent for treatment, and unauthorized practice of veterinary medicine. Practice-management vendors must accommodate state-specific record-retention and signature workflows.",
  },
];

// ============================================================
// DOMAIN_REGULATIONS (applicability per domain)
// ============================================================
type DomReg = { domain_code: string; regulation_name: string; applicability: string; condition_notes: string; notes: string };
const domainRegulations: DomReg[] = [
  // LEGAL
  { domain_code: "LEGAL-PRACT-MGMT", regulation_name: "ABA Model Rule 1.6 (Confidentiality of Information)", applicability: "mandatory", condition_notes: "Applies to every licensed attorney; vendor enables but lawyer is liable.", notes: "Drives encryption, access-control, and ethics-wall feature requirements." },
  { domain_code: "LEGAL-PRACT-MGMT", regulation_name: "ABA Model Rule 1.15 (Safekeeping Property) / IOLTA", applicability: "mandatory", condition_notes: "Applies to any firm holding client funds; state-specific trust-account rules vary.", notes: "Drives separate-ledger and three-way-reconciliation feature requirements." },
  { domain_code: "LEGAL-PRACT-MGMT", regulation_name: "Federal Rules of Civil Procedure — eDiscovery (Rules 26-37)", applicability: "conditional", condition_notes: "Applies when firm engages in federal civil litigation; state rules mirror.", notes: "Drives document-preservation and matter-scoped-retention feature requirements." },
  { domain_code: "LEGAL-PRACT-MGMT", regulation_name: "Payment Card Industry Data Security Standard", applicability: "conditional", condition_notes: "Applies if firm accepts card payments (most use LawPay or similar).", notes: "Typically delegated to payment-processor partner." },
  { domain_code: "LEGAL-PRACT-MGMT", regulation_name: "SOC 2 (AICPA Trust Services Criteria)", applicability: "recommended", condition_notes: "Vendor-side voluntary attestation; expected by mid-size firms and up.", notes: "" },
  // VET
  { domain_code: "VET-PRACT-MGMT", regulation_name: "Controlled Substances Act (DEA Schedule II-V)", applicability: "conditional", condition_notes: "Applies to any veterinary practice prescribing or dispensing controlled substances; EPCS module must be DEA-certified separately.", notes: "Drives controlled-substance-ledger feature requirements; e-prescribing module is the product-cert hot-spot." },
  { domain_code: "VET-PRACT-MGMT", regulation_name: "State Veterinary Practice Acts", applicability: "mandatory", condition_notes: "Always applies; vendor must accommodate state record-retention windows (3-7 years typical).", notes: "Drives configurable retention rules per US-state." },
  { domain_code: "VET-PRACT-MGMT", regulation_name: "Payment Card Industry Data Security Standard", applicability: "mandatory", condition_notes: "All clinics process card payments.", notes: "Delegated to payment-processor partner." },
  { domain_code: "VET-PRACT-MGMT", regulation_name: "SOC 2 (AICPA Trust Services Criteria)", applicability: "optional", condition_notes: "Veterinary buyers rarely demand SOC 2; cloud vendors often have it for parent-org reasons.", notes: "" },
  // ACCT
  { domain_code: "ACCT-PRACT-MGMT", regulation_name: "IRS Publication 4557 — Safeguarding Taxpayer Data", applicability: "mandatory", condition_notes: "Applies to any tax preparer with a PTIN.", notes: "Drives encryption, WISP-template, breach-response feature requirements." },
  { domain_code: "ACCT-PRACT-MGMT", regulation_name: "Gramm-Leach-Bliley Act", applicability: "mandatory", condition_notes: "Tax preparers are 'financial institutions' under GLBA per IRS Pub 5293.", notes: "FTC Safeguards Rule enforcement applies." },
  { domain_code: "ACCT-PRACT-MGMT", regulation_name: "AICPA Code of Professional Conduct", applicability: "mandatory", condition_notes: "Applies to all CPAs in public practice (not bookkeepers without CPA designation).", notes: "Drives confidentiality, conflicts, and engagement-letter feature design." },
  { domain_code: "ACCT-PRACT-MGMT", regulation_name: "Sarbanes-Oxley Act", applicability: "conditional", condition_notes: "Applies only to firms auditing SEC-registered public companies (i.e. PCAOB-registered firms).", notes: "Mid-market and large CPA firms; not typical buyer of practice-mgmt SaaS at low end." },
  { domain_code: "ACCT-PRACT-MGMT", regulation_name: "SOC 2 (AICPA Trust Services Criteria)", applicability: "recommended", condition_notes: "Vendor-side voluntary; expected by mid-size firms and up.", notes: "" },
];

// ============================================================
// PHASE B — DATA OBJECTS
// ============================================================
const dataObjects = [
  // LEGAL
  { data_object_name: "legal_matters", singular_label: "Legal Matter", plural_label: "Legal Matters", display_label: "Legal Matter", description: "Law-firm matter (case, transaction, advisory engagement): client, opposing parties, matter type, key dates (statute of limitations, court dates), responsible attorneys, billing rates, status. The central organizing entity of law-firm operations." },
  { data_object_name: "trust_accounts", singular_label: "Trust Account", plural_label: "Trust Accounts", display_label: "Trust Account", description: "IOLTA-style trust-account ledger: per-client and per-matter balances, three-way-reconciliation evidence, state-specific retention. Distinct from operating accounts; commingling is an ethics violation." },
  { data_object_name: "conflict_checks", singular_label: "Conflict Check", plural_label: "Conflict Checks", display_label: "Conflict Check", description: "Conflict-of-interest checking record: search inputs (proposed new client, parties), matches across existing matters/clients/adversaries, resolution (cleared, waived, declined), ethics-wall configuration." },
  { data_object_name: "engagement_letters", singular_label: "Engagement Letter", plural_label: "Engagement Letters", display_label: "Engagement Letter", description: "Formal engagement letter or proposal between professional-services firm and client: scope of work, fee structure, retention period, e-signature evidence, retainer-payment receipt. Used by legal, accounting, and consulting practices." },
  // VET
  { data_object_name: "animal_patients", singular_label: "Animal Patient", plural_label: "Animal Patients", display_label: "Animal Patient", description: "Veterinary patient (companion animal, livestock, equine): species, breed, sex, date of birth, weight, microchip, color, identifying marks, ownership history. Distinct from human-patient records (no PHI scope)." },
  { data_object_name: "pet_owners", singular_label: "Pet Owner", plural_label: "Pet Owners", display_label: "Pet Owner", description: "Owner / client relationship for veterinary practice: contact info, payment method on file, communication preferences, household-pet-list, financial-balance history." },
  { data_object_name: "veterinary_vaccinations", singular_label: "Veterinary Vaccination", plural_label: "Veterinary Vaccinations", display_label: "Veterinary Vaccination", description: "Vaccination record for an animal patient: vaccine type, lot, administered date, expiry, next-due-date driving reminder workflow." },
  { data_object_name: "veterinary_lab_results", singular_label: "Veterinary Lab Result", plural_label: "Veterinary Lab Results", display_label: "Veterinary Lab Result", description: "Structured lab result for an animal patient: tests, values, reference ranges, ordering vet, reporting lab (IDEXX, Antech, in-house analyzer)." },
  { data_object_name: "controlled_substance_ledger_entries", singular_label: "Controlled Substance Ledger Entry", plural_label: "Controlled Substance Ledger Entries", display_label: "Controlled Substance Ledger Entry", description: "DEA-required controlled-substance receipt, dispensation, and disposal record: drug, schedule, quantity, dispenser, recipient (patient), reconciliation evidence." },
  // ACCT
  { data_object_name: "tax_returns", singular_label: "Tax Return", plural_label: "Tax Returns", display_label: "Tax Return", description: "Tax-return record managed by a preparer: tax year, return type (1040, 1120, 1065, etc.), client, status (in-prep, review, ready-for-signature, filed, accepted, rejected), filing method, refund/balance-due." },
  { data_object_name: "client_engagements", singular_label: "Client Engagement", plural_label: "Client Engagements", display_label: "Client Engagement", description: "Professional-services engagement record (used by ACCT primarily but generic across professional services): client, service line, scope, fee model, period, status. Distinct from `engagement_letters` (the contract artifact)." },
];

type DDO = { domain_code: string; data_object_name: string; role: string; notes: string };
const domainDataObjects: DDO[] = [
  // LEGAL
  { domain_code: "LEGAL-PRACT-MGMT", data_object_name: "legal_matters", role: "master", notes: "Matter is the central entity of legal practice management." },
  { domain_code: "LEGAL-PRACT-MGMT", data_object_name: "trust_accounts", role: "master", notes: "IOLTA trust ledgers." },
  { domain_code: "LEGAL-PRACT-MGMT", data_object_name: "conflict_checks", role: "master", notes: "Conflict-of-interest search and resolution records." },
  { domain_code: "LEGAL-PRACT-MGMT", data_object_name: "engagement_letters", role: "master", notes: "Engagement letters drive matter intake and fee structures." },
  { domain_code: "LEGAL-PRACT-MGMT", data_object_name: "time_entries", role: "contributor", notes: "Legal timekeepers log time entries; co-mastered with the legal time/billing module." },
  { domain_code: "LEGAL-PRACT-MGMT", data_object_name: "invoices", role: "contributor", notes: "Client invoicing through practice-mgmt tool feeds AR ledger." },
  { domain_code: "LEGAL-PRACT-MGMT", data_object_name: "contacts", role: "contributor", notes: "Clients, opposing parties, co-counsel as contacts; CRM cluster masters the contact entity." },
  // VET
  { domain_code: "VET-PRACT-MGMT", data_object_name: "animal_patients", role: "master", notes: "Animal patient master." },
  { domain_code: "VET-PRACT-MGMT", data_object_name: "pet_owners", role: "master", notes: "Pet owner / client relationship master." },
  { domain_code: "VET-PRACT-MGMT", data_object_name: "veterinary_vaccinations", role: "master", notes: "Vaccination event records; drive reminder workflow." },
  { domain_code: "VET-PRACT-MGMT", data_object_name: "veterinary_lab_results", role: "master", notes: "Lab-result ingestion from reference labs and in-house analyzers." },
  { domain_code: "VET-PRACT-MGMT", data_object_name: "controlled_substance_ledger_entries", role: "master", notes: "DEA-compliant controlled-substance ledger." },
  { domain_code: "VET-PRACT-MGMT", data_object_name: "invoices", role: "contributor", notes: "Clinic invoicing through PIMS." },
  // ACCT
  { domain_code: "ACCT-PRACT-MGMT", data_object_name: "tax_returns", role: "master", notes: "Tax-return work product per client per year." },
  { domain_code: "ACCT-PRACT-MGMT", data_object_name: "client_engagements", role: "master", notes: "Per-client engagement records by service line." },
  { domain_code: "ACCT-PRACT-MGMT", data_object_name: "engagement_letters", role: "contributor", notes: "Engagement letters co-mastered with LEGAL-PRACT-MGMT (shared artifact)." },
  { domain_code: "ACCT-PRACT-MGMT", data_object_name: "time_entries", role: "contributor", notes: "Accountant timekeepers log time entries; co-mastered with billing module." },
  { domain_code: "ACCT-PRACT-MGMT", data_object_name: "invoices", role: "contributor", notes: "Client invoicing through practice-mgmt." },
  { domain_code: "ACCT-PRACT-MGMT", data_object_name: "contacts", role: "contributor", notes: "Tax / accounting clients as contacts; CRM cluster masters." },
];

// trigger_events
type TriggerEvent = {
  event_name: string;
  data_object_name: string;
  event_category: string;
  from_state: string;
  to_state: string;
  description: string;
};
const triggerEvents: TriggerEvent[] = [
  { event_name: "legal_matter.opened", data_object_name: "legal_matters", event_category: "lifecycle", from_state: "intake", to_state: "open", description: "Legal matter has been formally opened after conflict-check clearance and engagement-letter execution; triggers calendar setup, trust-deposit collection, and matter-team assignment." },
  { event_name: "legal_matter.closed", data_object_name: "legal_matters", event_category: "lifecycle", from_state: "open", to_state: "closed", description: "Matter has been closed; triggers final invoicing, trust-balance disbursement, retention-rule activation, and file-archiving workflow." },
  { event_name: "conflict_check.flagged", data_object_name: "conflict_checks", event_category: "signal", from_state: "", to_state: "flagged", description: "Conflict-check search returned matches requiring partner review; triggers ethics-wall consideration or matter decline workflow." },
  { event_name: "trust_account.exception", data_object_name: "trust_accounts", event_category: "threshold", from_state: "", to_state: "exception", description: "Trust account three-way reconciliation detected a discrepancy or low-balance event; triggers bookkeeper review and potentially state-bar reporting." },
  { event_name: "engagement_letter.signed", data_object_name: "engagement_letters", event_category: "lifecycle", from_state: "draft", to_state: "signed", description: "Client has e-signed the engagement letter; triggers retainer-payment collection, matter creation, and work commencement." },
  { event_name: "controlled_substance.dispensed", data_object_name: "controlled_substance_ledger_entries", event_category: "lifecycle", from_state: "", to_state: "dispensed", description: "Controlled substance has been dispensed; triggers ledger decrement, perpetual-inventory check, and DEA-compliant audit trail." },
  { event_name: "animal_patient.appointment_due", data_object_name: "animal_patients", event_category: "threshold", from_state: "", to_state: "appointment_due", description: "Preventive-care reminder threshold reached (vaccine due, dental scheduled, geriatric exam interval); triggers multi-channel outreach to pet owner." },
  { event_name: "tax_return.filed", data_object_name: "tax_returns", event_category: "lifecycle", from_state: "ready_for_filing", to_state: "filed", description: "Tax return has been filed (e-filed or paper). Triggers client notification, invoice issuance, working-paper archival, and IRS-acceptance polling." },
  { event_name: "client_engagement.commenced", data_object_name: "client_engagements", event_category: "lifecycle", from_state: "proposed", to_state: "commenced", description: "Accounting engagement has commenced after engagement-letter signing and retainer collection; triggers workflow-template instantiation and task assignment." },
];

type Handoff = {
  source_domain_code: string;
  target_domain_code: string;
  data_object_name: string;
  trigger_event_name: string;
  integration_pattern: string;
  friction_level: string;
  description: string;
  notes: string;
};
const handoffs: Handoff[] = [
  // LEGAL outbound
  {
    source_domain_code: "LEGAL-PRACT-MGMT", target_domain_code: "CLM", data_object_name: "engagement_letters",
    trigger_event_name: "engagement_letter.signed", integration_pattern: "manual_handoff", friction_level: "medium",
    description: "Signed engagement letter is the contract artifact; corporate clients may pull it into their CLM for vendor-contract tracking. Most law firms don't push proactively; client requests on demand.",
    notes: "Cross-vendor stack; manual handoff is the norm.",
  },
  {
    source_domain_code: "LEGAL-PRACT-MGMT", target_domain_code: "GRC", data_object_name: "trust_accounts",
    trigger_event_name: "trust_account.exception", integration_pattern: "manual_handoff", friction_level: "high",
    description: "Trust-account reconciliation exceptions are state-bar-reportable events for serious cases; trigger ethics-compliance review and potentially mandatory self-reporting to state bar.",
    notes: "Multi-shape: cross-vendor-stack + alert-without-feedback. State-bar discipline risk on missed reporting.",
  },
  {
    source_domain_code: "LEGAL-PRACT-MGMT", target_domain_code: "KMS", data_object_name: "legal_matters",
    trigger_event_name: "legal_matter.closed", integration_pattern: "batch_sync", friction_level: "medium",
    description: "Closed-matter knowledge (precedents, briefs, model documents) can flow into firm KMS for future reuse; most firms do this manually.",
    notes: "Knowledge-capture is often skipped, leaving expertise stuck in closed matters.",
  },
  // VET outbound
  {
    source_domain_code: "VET-PRACT-MGMT", target_domain_code: "GRC", data_object_name: "controlled_substance_ledger_entries",
    trigger_event_name: "controlled_substance.dispensed", integration_pattern: "batch_sync", friction_level: "medium",
    description: "Controlled-substance ledger entries roll up to DEA-audit-ready logs and reconciliation reports; biennial DEA inventory reconciliation is the regulatory checkpoint.",
    notes: "Period/cycle-close coupling — biennial inventory deadline cannot slip.",
  },
  {
    source_domain_code: "VET-PRACT-MGMT", target_domain_code: "SUP-LIFE", data_object_name: "controlled_substance_ledger_entries",
    trigger_event_name: "controlled_substance.dispensed", integration_pattern: "api_call", friction_level: "low",
    description: "Drug-consumption events trigger reorder thresholds against distributor (Covetrus, Patterson, Henry Schein); automated reorder is the norm for chain clinics.",
    notes: "Same-vendor (Covetrus, Patterson) makes this low-friction; cross-distributor still mostly manual.",
  },
  {
    source_domain_code: "VET-PRACT-MGMT", target_domain_code: "CSM", data_object_name: "animal_patients",
    trigger_event_name: "animal_patient.appointment_due", integration_pattern: "api_call", friction_level: "low",
    description: "Reminder-due events trigger multi-channel outreach (SMS, email, postcard) to pet owners; PIMS-integrated channels handle this internally.",
    notes: "Within-vendor low-friction; cross-vendor when separate reminder tool (Petriage, Vet2Pet) is used.",
  },
  // ACCT outbound
  {
    source_domain_code: "ACCT-PRACT-MGMT", target_domain_code: "GRC", data_object_name: "tax_returns",
    trigger_event_name: "tax_return.filed", integration_pattern: "batch_sync", friction_level: "low",
    description: "Filed tax returns roll up to firm-level GRC reporting for IRS Pub 4557 / GLBA compliance evidence (engagement counts, breach-response readiness).",
    notes: "",
  },
  {
    source_domain_code: "ACCT-PRACT-MGMT", target_domain_code: "CLM", data_object_name: "engagement_letters",
    trigger_event_name: "engagement_letter.signed", integration_pattern: "manual_handoff", friction_level: "medium",
    description: "Signed engagement letters are the contract artifact; mid-to-large firms increasingly track them in CLM for portfolio visibility and renewal management.",
    notes: "Cross-vendor handoff between practice-mgmt and CLM; Ignition-led signing flows are bridging this.",
  },
  {
    source_domain_code: "ACCT-PRACT-MGMT", target_domain_code: "AP-AUTO", data_object_name: "invoices",
    trigger_event_name: "tax_return.filed", integration_pattern: "batch_sync", friction_level: "low",
    description: "Tax-return filing triggers invoice issuance and posting to firm AR; finance-side accounting cycle.",
    notes: "",
  },
  // Bidirectional: LEGAL also signs engagement letters → handoff to ACCT-PRACT-MGMT is via the shared data_object, not a runtime event
];

// ============================================================
// PHASE C — business_function_domains
// ============================================================
type BFD = { domain_code: string; business_function_name: string; responsibility_type: string; notes: string };
const businessFunctionDomains: BFD[] = [
  // LEGAL — the firm IS practicing law
  { domain_code: "LEGAL-PRACT-MGMT", business_function_name: "Legal", responsibility_type: "owner", notes: "Law firm: the entire business function. For corporate in-house legal departments, the buyer is also Legal." },
  { domain_code: "LEGAL-PRACT-MGMT", business_function_name: "Accounts Receivable", responsibility_type: "contributor", notes: "Firm AR / billing department runs the matter-billing cycle." },
  { domain_code: "LEGAL-PRACT-MGMT", business_function_name: "Compliance Operations", responsibility_type: "contributor", notes: "Trust-account compliance, bar ethics, state regulatory reporting." },
  // VET — operations-led; no veterinary function in spine
  { domain_code: "VET-PRACT-MGMT", business_function_name: "Business Operations", responsibility_type: "owner", notes: "Clinic operations team owns practice management; no Veterinary function in enterprise spine — closest fit is Business Operations." },
  { domain_code: "VET-PRACT-MGMT", business_function_name: "Customer Service", responsibility_type: "contributor", notes: "Front-desk receptionists handle scheduling, intake, payments." },
  { domain_code: "VET-PRACT-MGMT", business_function_name: "Accounts Receivable", responsibility_type: "contributor", notes: "Clinic AR / billing." },
  { domain_code: "VET-PRACT-MGMT", business_function_name: "Compliance Operations", responsibility_type: "consumer", notes: "DEA controlled-substance compliance evidence." },
  // ACCT — the firm IS accounting
  { domain_code: "ACCT-PRACT-MGMT", business_function_name: "Accounting", responsibility_type: "owner", notes: "Accounting firm: the entire business function." },
  { domain_code: "ACCT-PRACT-MGMT", business_function_name: "Sales", responsibility_type: "contributor", notes: "Engagement letters and proposal management is the firm's sales process." },
  { domain_code: "ACCT-PRACT-MGMT", business_function_name: "Customer Service", responsibility_type: "contributor", notes: "Client-portal communications and onboarding." },
  { domain_code: "ACCT-PRACT-MGMT", business_function_name: "Compliance Operations", responsibility_type: "consumer", notes: "IRS Pub 4557 / GLBA compliance evidence." },
];

// ============================================================
// EXECUTE
// ============================================================
async function main() {
  console.log("=== Practice Management cluster load (LEGAL/VET/ACCT) ===\n");

  // --- INDUSTRIES ---
  console.log("Industries...");
  const indMap = await syncTable("/industries", industries, "industry_name");
  // Ensure parent_industry_id set even on pre-existing rows
  for (const ind of industries) {
    const id = indMap.get(ind.industry_name)!;
    await call({
      method: "PATCH",
      path: `/industries?id=eq.${id}`,
      body: { parent_industry_id: ind.parent_industry_id },
    });
  }

  // --- DOMAINS ---
  console.log("\nDomains...");
  const domainPayload = domains.map(d => {
    const { industry_name, ...rest } = d;
    return { ...rest, industry_id: indMap.get(industry_name)!, parent_domain_id: null };
  });
  const domMap = await syncTable("/domains", domainPayload, "domain_code");
  for (const d of domains) {
    const id = domMap.get(d.domain_code)!;
    await call({
      method: "PATCH",
      path: `/domains?id=eq.${id}`,
      body: { industry_id: indMap.get(d.industry_name)! },
    });
  }

  // --- CAPABILITIES ---
  console.log("\nCapabilities...");
  const capMap = await syncTable("/capabilities", capabilities, "capability_code");

  // --- CAPABILITY_DOMAINS ---
  console.log("\nCapability-domain links...");
  const existingCapDomains = await get("/capability_domains?select=capability_id,domain_id&limit=10000");
  const cdKey = (cid: number, did: number) => `${cid}:${did}`;
  const existingCdKeys = new Set(existingCapDomains.map(r => cdKey(Number(r.capability_id), Number(r.domain_id))));
  const newCd = capabilityDomains
    .map(cd => ({ capability_id: capMap.get(cd.capability_code)!, domain_id: domMap.get(cd.domain_code)! }))
    .filter(cd => !existingCdKeys.has(cdKey(cd.capability_id, cd.domain_id)));
  console.log(`  inserting ${newCd.length} capability_domains`);
  await insert("/capability_domains", newCd);

  // --- VENDORS ---
  console.log("\nVendors...");
  const vendorMap = await syncTable("/vendors", vendors, "vendor_name");
  // Include reused Wolters Kluwer
  const allVendors = await get("/vendors?select=id,vendor_name&limit=10000");
  for (const v of allVendors) vendorMap.set(String(v.vendor_name), Number(v.id));

  // --- SOLUTIONS ---
  console.log("\nSolutions...");
  const solutionPayload = solutions.map(s => {
    const { vendor_name, ...rest } = s;
    const vid = vendorMap.get(vendor_name);
    if (!vid) throw new Error(`Missing vendor: ${vendor_name}`);
    return { ...rest, vendor_id: vid };
  });
  const solMap = await syncTable("/solutions", solutionPayload, "solution_name");

  // --- SOLUTION_DOMAINS ---
  console.log("\nSolution-domain links...");
  const existingSolDomains = await get("/solution_domains?select=solution_id,domain_id&limit=10000");
  const sdKey = (sid: number, did: number) => `${sid}:${did}`;
  const existingSdKeys = new Set(existingSolDomains.map(r => sdKey(Number(r.solution_id), Number(r.domain_id))));
  const newSd = solutionDomains
    .map(sd => ({
      solution_id: solMap.get(sd.solution_name)!,
      domain_id: domMap.get(sd.domain_code)!,
      coverage_level: sd.coverage_level,
      notes: "",
    }))
    .filter(sd => !existingSdKeys.has(sdKey(sd.solution_id, sd.domain_id)));
  console.log(`  inserting ${newSd.length} solution_domains`);
  await insert("/solution_domains", newSd);

  // --- SOLUTION_CAPABILITIES ---
  console.log("\nSolution-capability matrix...");
  const existingSolCaps = await get("/solution_capabilities?select=solution_id,capability_id&limit=20000");
  const scKey = (sid: number, cid: number) => `${sid}:${cid}`;
  const existingScKeys = new Set(existingSolCaps.map(r => scKey(Number(r.solution_id), Number(r.capability_id))));
  const newSc = solutionCapabilities
    .map(sc => ({
      solution_id: solMap.get(sc.solution_name)!,
      capability_id: capMap.get(sc.capability_code)!,
      delivery_strength: sc.delivery_strength,
      notes: sc.notes,
    }))
    .filter(sc => !existingScKeys.has(scKey(sc.solution_id, sc.capability_id)));
  console.log(`  inserting ${newSc.length} solution_capabilities`);
  await insert("/solution_capabilities", newSc);

  // --- REGULATIONS ---
  console.log("\nRegulations...");
  const regMap = await syncTable("/regulations", regulations, "regulation_name");
  // Include pre-existing regs referenced in domain_regulations
  const allRegs = await get("/regulations?select=id,regulation_name&limit=1000");
  for (const r of allRegs) regMap.set(String(r.regulation_name), Number(r.id));

  // --- DOMAIN_REGULATIONS ---
  console.log("\nDomain-regulation links...");
  const existingDr = await get("/domain_regulations?select=domain_id,regulation_id&limit=10000");
  const drKey = (did: number, rid: number) => `${did}:${rid}`;
  const existingDrKeys = new Set(existingDr.map(r => drKey(Number(r.domain_id), Number(r.regulation_id))));
  const newDr = domainRegulations
    .map(dr => {
      const did = domMap.get(dr.domain_code)!;
      const rid = regMap.get(dr.regulation_name);
      if (!rid) throw new Error(`Missing regulation: ${dr.regulation_name}`);
      return {
        domain_id: did,
        regulation_id: rid,
        applicability: dr.applicability,
        condition_notes: dr.condition_notes,
        notes: dr.notes,
      };
    })
    .filter(r => !existingDrKeys.has(drKey(r.domain_id, r.regulation_id)));
  console.log(`  inserting ${newDr.length} domain_regulations`);
  await insert("/domain_regulations", newDr);

  // ====================================================
  // PHASE B
  // ====================================================
  console.log("\n=== PHASE B: data_objects ===");
  await syncTable("/data_objects", dataObjects, "data_object_name");
  const fullDoLookup = await get("/data_objects?select=id,data_object_name&limit=10000");
  const fullDoMap = new Map<string, number>();
  for (const r of fullDoLookup) fullDoMap.set(String(r.data_object_name), Number(r.id));

  console.log("\nDomain-data-object links...");
  const existingDdo = await get("/domain_data_objects?select=domain_id,data_object_id,role&limit=20000");
  const ddoKey = (did: number, oid: number, role: string) => `${did}:${oid}:${role}`;
  const existingDdoKeys = new Set(existingDdo.map(r => ddoKey(Number(r.domain_id), Number(r.data_object_id), String(r.role))));
  const newDdo = domainDataObjects
    .map(ddo => {
      const did = domMap.get(ddo.domain_code)!;
      const oid = fullDoMap.get(ddo.data_object_name);
      if (!oid) throw new Error(`Missing data_object: ${ddo.data_object_name}`);
      return { domain_id: did, data_object_id: oid, role: ddo.role, notes: ddo.notes };
    })
    .filter(r => !existingDdoKeys.has(ddoKey(r.domain_id, r.data_object_id, r.role)));
  console.log(`  inserting ${newDdo.length} domain_data_objects`);
  await insert("/domain_data_objects", newDdo);

  console.log("\nTrigger events...");
  const teMap = await syncTable(
    "/trigger_events",
    triggerEvents.map(te => ({
      event_name: te.event_name,
      data_object_id: fullDoMap.get(te.data_object_name)!,
      event_category: te.event_category,
      from_state: te.from_state,
      to_state: te.to_state,
      description: te.description,
    })),
    "event_name",
  );

  console.log("\nCross-domain handoffs...");
  const existingHandoffs = await get("/cross_domain_handoffs?select=source_domain_id,target_domain_id,data_object_id,trigger_event&limit=20000");
  const hoKey = (s: number, t: number, o: number, ev: string) => `${s}:${t}:${o}:${ev}`;
  const existingHoKeys = new Set(existingHandoffs.map(r => hoKey(Number(r.source_domain_id), Number(r.target_domain_id), Number(r.data_object_id), String(r.trigger_event))));

  const fullDomainLookup = await get("/domains?select=id,domain_code&limit=10000");
  const fullDomainMap = new Map<string, number>();
  for (const r of fullDomainLookup) fullDomainMap.set(String(r.domain_code), Number(r.id));

  const newHo = [];
  for (const h of handoffs) {
    const sid = fullDomainMap.get(h.source_domain_code);
    const tid = fullDomainMap.get(h.target_domain_code);
    const oid = fullDoMap.get(h.data_object_name);
    const teId = teMap.get(h.trigger_event_name);
    if (!sid) { console.warn(`  skip — missing source domain ${h.source_domain_code}`); continue; }
    if (!tid) { console.warn(`  skip — missing target domain ${h.target_domain_code}`); continue; }
    if (!oid) { console.warn(`  skip — missing data_object ${h.data_object_name}`); continue; }
    if (!teId) { console.warn(`  skip — missing trigger_event ${h.trigger_event_name}`); continue; }
    if (existingHoKeys.has(hoKey(sid, tid, oid, h.trigger_event_name))) continue;
    newHo.push({
      source_domain_id: sid,
      target_domain_id: tid,
      data_object_id: oid,
      trigger_event: h.trigger_event_name,
      trigger_event_id: teId,
      integration_pattern: h.integration_pattern,
      friction_level: h.friction_level,
      description: h.description,
      notes: h.notes,
    });
  }
  console.log(`  inserting ${newHo.length} cross_domain_handoffs`);
  await insert("/cross_domain_handoffs", newHo);

  // ====================================================
  // PHASE C
  // ====================================================
  console.log("\n=== PHASE C: business_function_domains ===");
  const bfLookup = await get("/business_functions?select=id,business_function_name&limit=1000");
  const bfMap = new Map<string, number>();
  for (const r of bfLookup) bfMap.set(String(r.business_function_name), Number(r.id));

  const existingBfd = await get("/business_function_domains?select=domain_id,business_function_id,responsibility_type&limit=20000");
  const bfdKey = (did: number, fid: number, role: string) => `${did}:${fid}:${role}`;
  const existingBfdKeys = new Set(existingBfd.map(r => bfdKey(Number(r.domain_id), Number(r.business_function_id), String(r.responsibility_type))));
  const newBfd = businessFunctionDomains
    .map(bfd => {
      const did = domMap.get(bfd.domain_code)!;
      const fid = bfMap.get(bfd.business_function_name);
      if (!fid) throw new Error(`Missing business_function: ${bfd.business_function_name}`);
      return { domain_id: did, business_function_id: fid, responsibility_type: bfd.responsibility_type, notes: bfd.notes };
    })
    .filter(r => !existingBfdKeys.has(bfdKey(r.domain_id, r.business_function_id, r.responsibility_type)));
  console.log(`  inserting ${newBfd.length} business_function_domains`);
  await insert("/business_function_domains", newBfd);

  // ====================================================
  // SUMMARY + AUDIT
  // ====================================================
  console.log("\n=== Audit ===");
  for (const code of ["LEGAL-PRACT-MGMT", "VET-PRACT-MGMT", "ACCT-PRACT-MGMT"]) {
    const did = domMap.get(code)!;
    const [solCount, capCount, doCount, hoOutCount, drCount] = await Promise.all([
      get(`/solution_domains?domain_id=eq.${did}&select=id`),
      get(`/capability_domains?domain_id=eq.${did}&select=id`),
      get(`/domain_data_objects?domain_id=eq.${did}&select=id`),
      get(`/cross_domain_handoffs?source_domain_id=eq.${did}&select=id`),
      get(`/domain_regulations?domain_id=eq.${did}&select=id`),
    ]);
    console.log(`  ${code}: ${solCount.length} solutions, ${capCount.length} caps, ${doCount.length} data_objects, ${hoOutCount.length} outbound handoffs, ${drCount.length} regulations`);
  }

  console.log("\n=== UI links ===");
  console.log(`  Industries (Legal): https://tests.semantius.app/domain_map/industries?id=eq.${indMap.get("Legal Services")}`);
  console.log(`  Industries (Vet):   https://tests.semantius.app/domain_map/industries?id=eq.${indMap.get("Veterinary Services")}`);
  console.log(`  Industries (Acct):  https://tests.semantius.app/domain_map/industries?id=eq.${indMap.get("Accounting Services")}`);
  console.log(`  Domains: https://tests.semantius.app/domain_map/domains (filter by IDs ${domMap.get("LEGAL-PRACT-MGMT")}, ${domMap.get("VET-PRACT-MGMT")}, ${domMap.get("ACCT-PRACT-MGMT")})`);
  console.log(`  Regulations: https://tests.semantius.app/domain_map/regulations`);
  console.log(`  Domain regulations: https://tests.semantius.app/domain_map/domain_regulations`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
