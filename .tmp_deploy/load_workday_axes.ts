#!/usr/bin/env bun
// Industries + jurisdictions + regulations + domain_regulations + business_functions
// + business_function_domains. All record_status defaults to "new". Idempotent.

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
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
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 40; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    out.push(...(await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) })));
  }
  return out;
}

// ---------- INDUSTRIES ----------
const newIndustries = [
  { industry_name: "Higher Education", description: "Universities, colleges, and post-secondary institutions. Workday's foundational vertical via Workday Student. Distinct from K-12 in regulatory environment (FERPA, IPEDS) and funding model.", naics_code: "611310" },
  { industry_name: "Professional Services", description: "Services firms billing client engagements: management consulting, IT services, engineering, accounting, law. Project-economy industry where PSA is the operational backbone.", naics_code: "541" },
  { industry_name: "Life Sciences", description: "Pharmaceutical manufacturers, biotech, medical devices, and contract research organisations. Heavy regulatory burden (FDA, EMA, GxP) and global-payroll complexity.", naics_code: "3254" },
  { industry_name: "State and Local Government", description: "Sub-national government entities: states/provinces, counties, municipalities, public agencies. Distinct procurement (StateRAMP, GovCloud), labour rules, and budget cycles from federal Public Sector.", naics_code: "92" },
  { industry_name: "Non-Profit", description: "Tax-exempt organisations including charities, foundations, religious bodies, advocacy groups. Distinct grant-accounting, fund-balance, donor-restricted-fund requirements.", naics_code: "813" },
];

// ---------- JURISDICTIONS ----------
const newJurisdictions = [
  { jurisdiction_name: "Canada", jurisdiction_code: "CA", jurisdiction_type: "country", description: "Federal jurisdiction. Workday Payroll native country. Provincial variations (Quebec especially) affect payroll, tax, and language requirements.", parent_jurisdiction_id: null },
  { jurisdiction_name: "France", jurisdiction_code: "FR", jurisdiction_type: "country", description: "EU member state. Workday Payroll native country. DSN (Déclaration Sociale Nominative) is the consolidated social-security reporting; URSSAF is the principal authority.", parent_jurisdiction_id: 2 },
  { jurisdiction_name: "Australia", jurisdiction_code: "AU", jurisdiction_type: "country", description: "Federal jurisdiction. Workday Payroll native country. Single Touch Payroll (STP) and SuperStream are the principal payroll reporting regimes.", parent_jurisdiction_id: null },
  { jurisdiction_name: "Germany", jurisdiction_code: "DE", jurisdiction_type: "country", description: "EU member state. Workday Global Payroll Connect partner country. Finanzamt (tax) and DEUEV (social security) are the principal payroll-reporting endpoints. GoBD governs accounting record retention.", parent_jurisdiction_id: 2 },
  { jurisdiction_name: "Ireland", jurisdiction_code: "IE", jurisdiction_type: "country", description: "EU member state. Workday's EMEA headquarters jurisdiction. Revenue Online Service is the principal payroll endpoint.", parent_jurisdiction_id: 2 },
  { jurisdiction_name: "India", jurisdiction_code: "IN", jurisdiction_type: "country", description: "Federal jurisdiction. Major Workday delivery centre; localised payroll via partner. Complex statutory deductions (PF, ESI, professional tax, TDS) and state-level variations.", parent_jurisdiction_id: null },
  { jurisdiction_name: "Japan", jurisdiction_code: "JP", jurisdiction_type: "country", description: "Workday partner-payroll country. Complex multi-pay-period social-insurance cadence (kyousai, kenpo, koyou).", parent_jurisdiction_id: null },
  { jurisdiction_name: "Brazil", jurisdiction_code: "BR", jurisdiction_type: "country", description: "Federal jurisdiction. Workday partner-payroll country. eSocial is the consolidated statutory-reporting platform; complex 13th-month, vacation, FGTS calculations.", parent_jurisdiction_id: null },
  { jurisdiction_name: "Mexico", jurisdiction_code: "MX", jurisdiction_type: "country", description: "Federal jurisdiction. Workday partner-payroll country. CFDI de Nómina is the electronic payroll receipt standard; IMSS social-security reporting.", parent_jurisdiction_id: null },
  { jurisdiction_name: "Netherlands", jurisdiction_code: "NL", jurisdiction_type: "country", description: "EU member state. Workday partner-payroll country. Belastingdienst tax authority; loonaangifte is the wage-tax declaration.", parent_jurisdiction_id: 2 },
  { jurisdiction_name: "New York", jurisdiction_code: "US-NY", jurisdiction_type: "state_or_province", description: "US state. NYC Local Law 144 (AEDT bias audit), NY state pay-transparency law (s.194-b), state DOL labour rules.", parent_jurisdiction_id: 3 },
  { jurisdiction_name: "Colorado", jurisdiction_code: "US-CO", jurisdiction_type: "state_or_province", description: "US state. Equal Pay for Equal Work Act (salary-disclosure leader, 2021).", parent_jurisdiction_id: 3 },
  { jurisdiction_name: "Washington", jurisdiction_code: "US-WA", jurisdiction_type: "state_or_province", description: "US state. Pay-transparency requirements (SB 5761) and L&I labour rules.", parent_jurisdiction_id: 3 },
  { jurisdiction_name: "Illinois", jurisdiction_code: "US-IL", jurisdiction_type: "state_or_province", description: "US state. BIPA (Biometric Information Privacy Act); statutory paid leave (SB 208).", parent_jurisdiction_id: 3 },
];

// ---------- REGULATIONS ----------
type RegSpec = {
  regulation_name: string;
  regulation_code: string;
  regulation_type: string;
  jurisdiction_code: string;
  issuing_body: string;
  description: string;
  certification_required: boolean;
};
const newRegulations: RegSpec[] = [
  { regulation_name: "Title VII of the Civil Rights Act of 1964", regulation_code: "TITLE-VII", regulation_type: "labor_law", jurisdiction_code: "US", issuing_body: "US Congress", description: "Federal prohibition on employment discrimination based on race, color, religion, sex, or national origin. Foundation of US employment law; drives EEO-1 reporting, applicant-tracking record-keeping, and AI-fairness scrutiny in screening systems.", certification_required: false },
  { regulation_name: "Age Discrimination in Employment Act", regulation_code: "ADEA", regulation_type: "labor_law", jurisdiction_code: "US", issuing_body: "US Congress", description: "Federal prohibition on age-based employment discrimination against workers 40 and older. Drives age-anonymised candidate review and disparate-impact testing in workforce-analytics tooling.", certification_required: false },
  { regulation_name: "EEO-1 Employer Information Report", regulation_code: "EEO-1", regulation_type: "labor_law", jurisdiction_code: "US", issuing_body: "US Equal Employment Opportunity Commission", description: "Annual demographic data filing by US employers with 100+ employees and federal contractors with 50+ employees. Component 1 covers race/ethnicity, sex, and job category counts. Drives EEO-category mapping in HRIS.", certification_required: false },
  { regulation_name: "Consolidated Omnibus Budget Reconciliation Act", regulation_code: "COBRA", regulation_type: "labor_law", jurisdiction_code: "US", issuing_body: "US Congress", description: "Federal continuation of employer-sponsored health coverage after qualifying events (termination, hours reduction, divorce). Drives leaver-event triggers in benefits administration and carrier_feed flagging.", certification_required: false },
  { regulation_name: "Genetic Information Nondiscrimination Act", regulation_code: "GINA", regulation_type: "labor_law", jurisdiction_code: "US", issuing_body: "US Congress", description: "Federal prohibition on use of genetic information in employment decisions and health insurance underwriting. Drives benefits-enrolment data minimisation and wellness-program design.", certification_required: false },
  { regulation_name: "I-9 Employment Eligibility Verification", regulation_code: "I-9", regulation_type: "labor_law", jurisdiction_code: "US", issuing_body: "US Citizenship and Immigration Services", description: "Federal employment-eligibility verification requirement for every new hire. Form I-9 must be completed within three days of hire; supporting documentation retained. Drives onboarding workflow gates.", certification_required: false },
  { regulation_name: "E-Verify", regulation_code: "E-VERIFY", regulation_type: "labor_law", jurisdiction_code: "US", issuing_body: "US Department of Homeland Security", description: "Internet-based work-authorisation verification system. Mandatory for federal contractors and in several US states; voluntary elsewhere. Integrates with I-9 onboarding flow.", certification_required: false },
  { regulation_name: "IR35 (Off-Payroll Working Rules)", regulation_code: "IR35", regulation_type: "labor_law", jurisdiction_code: "UK", issuing_body: "HM Revenue and Customs", description: "UK tax legislation determining whether a contractor working through an intermediary is a disguised employee. Drives VMS worker-classification flagging, status determination statements, and PAYE deduction at source.", certification_required: false },
  { regulation_name: "California Assembly Bill 5 (Worker Classification)", regulation_code: "CA-AB5", regulation_type: "labor_law", jurisdiction_code: "US-CA", issuing_body: "California Legislature", description: "Codifies the ABC test for distinguishing employees from independent contractors. Drives VMS classification screening for California-based contingent workers.", certification_required: false },
  { regulation_name: "EU Platform Work Directive", regulation_code: "EU-PWD", regulation_type: "labor_law", jurisdiction_code: "EU", issuing_body: "European Council", description: "Directive (2024/2831) establishing rebuttable employment presumption for platform workers, algorithmic-management transparency, and data-subject rights for workforce-management algorithms.", certification_required: false },
  { regulation_name: "EU Working Time Directive", regulation_code: "EU-WTD", regulation_type: "labor_law", jurisdiction_code: "EU", issuing_body: "European Council", description: "Directive 2003/88/EC: minimum daily rest, weekly working-time cap, paid annual leave, night-work limits. Drives WFM scheduling-compliance rules across EU member states.", certification_required: false },
  { regulation_name: "Fair Workweek (Predictive Scheduling)", regulation_code: "PRED-SCHED", regulation_type: "labor_law", jurisdiction_code: "US", issuing_body: "Various US municipalities and states", description: "Aggregated category covering NYC, Seattle, Oregon, San Francisco, Chicago, Philadelphia predictive-scheduling laws: advance posting (7–14 days), premium pay for clopen/last-minute shifts, right-to-rest. Drives WFM scheduling rules for frontline workers.", certification_required: false },
  { regulation_name: "Worker Adjustment and Retraining Notification Act", regulation_code: "WARN", regulation_type: "labor_law", jurisdiction_code: "US", issuing_body: "US Department of Labor", description: "Federal advance-notice requirement for mass layoffs and plant closings (typically 60 days). Several states have stricter Mini-WARN variants. Drives HCM termination workflow gates.", certification_required: false },
  { regulation_name: "Biometric Information Privacy Act (Illinois)", regulation_code: "BIPA", regulation_type: "data_privacy", jurisdiction_code: "US-IL", issuing_body: "Illinois General Assembly", description: "Illinois statute requiring informed written consent before collecting biometric identifiers (fingerprint, retina, hand geometry). Major exposure for WFM clock-in / time-and-attendance vendors with substantial settlement history.", certification_required: false },
];

// ---------- DOMAIN_REGULATIONS additions ----------
// Junctions: domain_code → regulation_code, applicability
const domainRegulationsToAdd: { domain_code: string; regulation_code: string; applicability: string; notes: string }[] = [
  // HCM additional
  { domain_code: "HCM", regulation_code: "TITLE-VII", applicability: "mandatory", notes: "Anti-discrimination foundation across worker-record handling, promotion decisions, terminations." },
  { domain_code: "HCM", regulation_code: "ADEA", applicability: "mandatory", notes: "" },
  { domain_code: "HCM", regulation_code: "EEO-1", applicability: "mandatory", notes: "Annual reporting for US employers 100+ and federal contractors 50+." },
  { domain_code: "HCM", regulation_code: "CPRA", applicability: "mandatory", notes: "California employee data extended to consumer-equivalent rights." },
  { domain_code: "HCM", regulation_code: "EU-AI-ACT", applicability: "mandatory", notes: "Annex III high-risk AI use cases include employment, worker management, access to self-employment." },
  { domain_code: "HCM", regulation_code: "WARN", applicability: "conditional", notes: "Triggers on mass layoffs / plant closings above the WARN threshold." },
  { domain_code: "PAYROLL", regulation_code: "GDPR", applicability: "mandatory", notes: "Payroll processes Article 9 special-category data (union dues, garnishments) for EU residents." },
  { domain_code: "BEN-ADMIN", regulation_code: "HIPAA", applicability: "mandatory", notes: "Self-funded health plans and carrier_feeds carry Protected Health Information." },
  { domain_code: "BEN-ADMIN", regulation_code: "COBRA", applicability: "mandatory", notes: "" },
  { domain_code: "BEN-ADMIN", regulation_code: "GINA", applicability: "mandatory", notes: "" },
  { domain_code: "COMP-MGMT", regulation_code: "EU-PAY-TRANS", applicability: "mandatory", notes: "Pay-equity reporting and salary-range disclosure obligations." },
  { domain_code: "EMP-EXP", regulation_code: "GDPR", applicability: "mandatory", notes: "Engagement and listening data is personal data; anonymity floors required for survey processing." },
  { domain_code: "TALENT-MGMT", regulation_code: "EU-AI-ACT", applicability: "mandatory", notes: "Talent-intelligence and succession scoring fall within Annex III adjacent uses." },
  { domain_code: "PA", regulation_code: "GDPR", applicability: "mandatory", notes: "People analytics aggregates personal data; lawful-basis and DPIA required." },
  { domain_code: "PA", regulation_code: "EU-AI-ACT", applicability: "mandatory", notes: "Attrition prediction and DEI inference are Annex III adjacent." },
  { domain_code: "ATS", regulation_code: "ADA", applicability: "mandatory", notes: "Accessibility and disparate-impact obligations on screening tools." },
  { domain_code: "ATS", regulation_code: "TITLE-VII", applicability: "mandatory", notes: "" },
  { domain_code: "ATS", regulation_code: "ADEA", applicability: "mandatory", notes: "" },
  { domain_code: "ATS", regulation_code: "CPRA", applicability: "mandatory", notes: "California applicants in-scope for consumer-equivalent privacy rights." },
  { domain_code: "ATS", regulation_code: "EEO-1", applicability: "mandatory", notes: "Application-stage demographic data feeds the EEO-1 report." },
  { domain_code: "ONBOARDING", regulation_code: "GDPR", applicability: "mandatory", notes: "" },
  { domain_code: "ONBOARDING", regulation_code: "I-9", applicability: "mandatory", notes: "Day-1 workflow gate." },
  { domain_code: "ONBOARDING", regulation_code: "E-VERIFY", applicability: "conditional", notes: "Mandatory for federal contractors and several states; voluntary elsewhere." },
  { domain_code: "WFM", regulation_code: "GDPR", applicability: "mandatory", notes: "Time/attendance and schedule data is personal data." },
  { domain_code: "WFM", regulation_code: "EU-WTD", applicability: "mandatory", notes: "Working-time, rest, and annual-leave compliance across EU." },
  { domain_code: "WFM", regulation_code: "PRED-SCHED", applicability: "conditional", notes: "Triggers in covered US municipalities/states for hourly frontline workforces." },
  { domain_code: "WFM", regulation_code: "BIPA", applicability: "conditional", notes: "Triggers when biometric clock-in is used on Illinois-based workers." },
  { domain_code: "PSA", regulation_code: "ASC-606", applicability: "mandatory", notes: "Percentage-of-completion and milestone billing fall under ASC 606." },
  { domain_code: "VMS", regulation_code: "IR35", applicability: "mandatory", notes: "UK off-payroll worker status determination." },
  { domain_code: "VMS", regulation_code: "CA-AB5", applicability: "mandatory", notes: "California ABC test for worker classification." },
  { domain_code: "VMS", regulation_code: "EU-PWD", applicability: "mandatory", notes: "EU Platform Work Directive employment presumption." },
];

// ---------- BUSINESS FUNCTIONS ----------
type BFSpec = { business_function_name: string; description: string; parent: string | null };
const businessFunctions: BFSpec[] = [
  { business_function_name: "Human Resources", description: "Function responsible for the full worker lifecycle: hiring, paying, developing, supporting, and offboarding the workforce. Owns HRIS-equivalent domains and partners with Finance on workforce cost.", parent: null },
  { business_function_name: "HR Operations", description: "Sub-function inside Human Resources that runs the day-to-day worker record, payroll, benefits, time, and HR case-management.", parent: "Human Resources" },
  { business_function_name: "Talent Acquisition", description: "Sub-function inside Human Resources that runs sourcing, recruiting, candidate experience, and offer management.", parent: "Human Resources" },
  { business_function_name: "Total Rewards", description: "Sub-function inside Human Resources that runs compensation, benefits, and equity-program administration.", parent: "Human Resources" },
  { business_function_name: "Learning and Development", description: "Sub-function inside Human Resources that runs corporate learning, compliance training, and skills development.", parent: "Human Resources" },
  { business_function_name: "HR Business Partner", description: "Sub-function inside Human Resources that runs performance management, talent reviews, succession planning, and manager enablement at line-of-business grain.", parent: "Human Resources" },
  { business_function_name: "Workforce Planning", description: "Sub-function inside Human Resources that runs strategic workforce planning, headcount budgeting, and supply/demand modelling.", parent: "Human Resources" },
  { business_function_name: "People Analytics", description: "Sub-function inside Human Resources that runs HR reporting, predictive workforce analytics, DEI dashboards, and pay-equity studies.", parent: "Human Resources" },
  { business_function_name: "Finance", description: "Function responsible for the books, treasury, planning, and procurement of the business.", parent: null },
  { business_function_name: "Controllership", description: "Sub-function inside Finance that runs the general ledger, close, consolidation, and statutory reporting.", parent: "Finance" },
  { business_function_name: "FP&A", description: "Sub-function inside Finance that runs budgeting, forecasting, scenario modelling, and management reporting.", parent: "Finance" },
  { business_function_name: "Accounts Payable", description: "Sub-function inside Finance that runs invoice processing, three-way match, and supplier payment.", parent: "Finance" },
  { business_function_name: "Treasury", description: "Sub-function inside Finance that runs cash, bank-account, FX, and short-term liquidity management.", parent: "Finance" },
  { business_function_name: "Procurement", description: "Sub-function inside Finance (or independent in some orgs) that runs sourcing, supplier management, and purchase orders.", parent: "Finance" },
  { business_function_name: "Information Technology", description: "Function responsible for the technology platform, end-user devices, identity and access, and IT service management.", parent: null },
  { business_function_name: "Operations", description: "Function responsible for delivering the company's products or services to its customers. Owns project execution in services orgs.", parent: null },
  { business_function_name: "Legal", description: "Function responsible for contracts, regulatory compliance, intellectual property, and dispute management.", parent: null },
];

// ---------- BUSINESS_FUNCTION_DOMAINS ----------
type BFDSpec = { bf: string; domain_code: string; responsibility_type: "owner" | "contributor" | "consumer"; notes: string };
const bfDomains: BFDSpec[] = [
  { bf: "HR Operations", domain_code: "HCM", responsibility_type: "owner", notes: "" },
  { bf: "HR Operations", domain_code: "PAYROLL", responsibility_type: "owner", notes: "" },
  { bf: "Controllership", domain_code: "PAYROLL", responsibility_type: "contributor", notes: "Finance contributes the GL-mapping and statutory-reporting integration on the payroll boundary." },
  { bf: "Total Rewards", domain_code: "BEN-ADMIN", responsibility_type: "owner", notes: "" },
  { bf: "Total Rewards", domain_code: "COMP-MGMT", responsibility_type: "owner", notes: "" },
  { bf: "FP&A", domain_code: "COMP-MGMT", responsibility_type: "contributor", notes: "FP&A contributes the merit-budget and headcount-cost envelope into the comp cycle." },
  { bf: "Talent Acquisition", domain_code: "ATS", responsibility_type: "owner", notes: "" },
  { bf: "HR Operations", domain_code: "ONBOARDING", responsibility_type: "owner", notes: "" },
  { bf: "Information Technology", domain_code: "ONBOARDING", responsibility_type: "contributor", notes: "IT contributes the account / device / access provisioning slice of new-hire onboarding." },
  { bf: "HR Operations", domain_code: "WFM", responsibility_type: "owner", notes: "" },
  { bf: "Controllership", domain_code: "WFM", responsibility_type: "consumer", notes: "Finance consumes WFM time data for project / cost-center allocation." },
  { bf: "Learning and Development", domain_code: "LMS", responsibility_type: "owner", notes: "" },
  { bf: "Legal", domain_code: "LMS", responsibility_type: "contributor", notes: "Legal contributes the compliance-training curriculum and regulatory scope." },
  { bf: "HR Business Partner", domain_code: "TALENT-MGMT", responsibility_type: "owner", notes: "" },
  { bf: "HR Business Partner", domain_code: "EMP-EXP", responsibility_type: "owner", notes: "" },
  { bf: "Procurement", domain_code: "VMS", responsibility_type: "owner", notes: "" },
  { bf: "HR Operations", domain_code: "VMS", responsibility_type: "contributor", notes: "HR contributes the worker-classification and unified-workforce visibility slice." },
  { bf: "People Analytics", domain_code: "PA", responsibility_type: "owner", notes: "" },
  { bf: "Workforce Planning", domain_code: "SWP", responsibility_type: "owner", notes: "" },
  { bf: "FP&A", domain_code: "SWP", responsibility_type: "contributor", notes: "FP&A contributes the financial envelope that SWP plans against." },
  { bf: "HR Operations", domain_code: "HRSD", responsibility_type: "owner", notes: "" },
  { bf: "Controllership", domain_code: "ERP-FIN", responsibility_type: "owner", notes: "" },
  { bf: "FP&A", domain_code: "EPM", responsibility_type: "owner", notes: "" },
  { bf: "Accounts Payable", domain_code: "AP-AUTO", responsibility_type: "owner", notes: "" },
  { bf: "Controllership", domain_code: "EXPENSE", responsibility_type: "owner", notes: "" },
  { bf: "Procurement", domain_code: "S2P", responsibility_type: "owner", notes: "" },
  { bf: "Procurement", domain_code: "SUP-LIFE", responsibility_type: "owner", notes: "" },
  { bf: "Legal", domain_code: "SUP-LIFE", responsibility_type: "contributor", notes: "Legal contributes the supplier-risk / sanctions / contracting slice." },
  { bf: "Operations", domain_code: "PSA", responsibility_type: "owner", notes: "" },
  { bf: "Controllership", domain_code: "PSA", responsibility_type: "contributor", notes: "Finance contributes the project-accounting and rev-rec slice." },
  { bf: "Legal", domain_code: "CLM", responsibility_type: "owner", notes: "" },
  { bf: "Procurement", domain_code: "CLM", responsibility_type: "contributor", notes: "Procurement contributes the supplier-side contracting slice." },
  { bf: "Information Technology", domain_code: "LCAP", responsibility_type: "owner", notes: "" },
];

async function main() {
  // ===== 1. Industries =====
  console.log("=== industries ===");
  const existIndustries = await get("/industries?select=industry_name");
  const existIndustryNames = new Set(existIndustries.map(r => String(r.industry_name)));
  const missingIndustries = newIndustries.filter(i => !existIndustryNames.has(i.industry_name));
  if (missingIndustries.length > 0) {
    console.log(`  inserting ${missingIndustries.length} new industries`);
    await insert("/industries", missingIndustries);
  } else console.log("  none missing");

  // ===== 2. Jurisdictions =====
  console.log("\n=== jurisdictions ===");
  const existJur = await get("/jurisdictions?select=jurisdiction_code");
  const existJurCodes = new Set(existJur.map(r => String(r.jurisdiction_code)));
  const missingJur = newJurisdictions.filter(j => !existJurCodes.has(j.jurisdiction_code));
  if (missingJur.length > 0) {
    console.log(`  inserting ${missingJur.length} new jurisdictions`);
    await insert("/jurisdictions", missingJur);
  } else console.log("  none missing");

  const allJur = await get("/jurisdictions?select=id,jurisdiction_code");
  const jurIdByCode = new Map<string, number>();
  for (const r of allJur) jurIdByCode.set(String(r.jurisdiction_code), Number(r.id));

  // ===== 3. Regulations =====
  console.log("\n=== regulations ===");
  const existReg = await get("/regulations?select=regulation_code");
  const existRegCodes = new Set(existReg.map(r => String(r.regulation_code)));
  const missingReg = newRegulations.filter(r => !existRegCodes.has(r.regulation_code));
  if (missingReg.length > 0) {
    console.log(`  inserting ${missingReg.length} new regulations`);
    const rows = missingReg.map(r => ({
      regulation_name: r.regulation_name,
      regulation_code: r.regulation_code,
      regulation_type: r.regulation_type,
      jurisdiction_id: jurIdByCode.get(r.jurisdiction_code),
      issuing_body: r.issuing_body,
      description: r.description,
      certification_required: r.certification_required,
      regulation_url: "",
    }));
    await insert("/regulations", rows);
  } else console.log("  none missing");

  const allReg = await get("/regulations?select=id,regulation_code");
  const regIdByCode = new Map<string, number>();
  for (const r of allReg) regIdByCode.set(String(r.regulation_code), Number(r.id));

  // ===== 4. domain_regulations =====
  console.log("\n=== domain_regulations ===");
  const allDomains = await get("/domains?select=id,domain_code");
  const domainIdByCode = new Map<string, number>();
  for (const r of allDomains) domainIdByCode.set(String(r.domain_code), Number(r.id));

  const existDR = await get("/domain_regulations?select=domain_id,regulation_id");
  const drKey = (d: number, r: number) => `${d}:${r}`;
  const existDRSet = new Set(existDR.map(r => drKey(Number(r.domain_id), Number(r.regulation_id))));

  const newDRRows: Row[] = [];
  for (const spec of domainRegulationsToAdd) {
    const did = domainIdByCode.get(spec.domain_code);
    const rid = regIdByCode.get(spec.regulation_code);
    if (!did) { console.log(`  WARN: domain not found ${spec.domain_code}`); continue; }
    if (!rid) { console.log(`  WARN: regulation not found ${spec.regulation_code}`); continue; }
    if (existDRSet.has(drKey(did, rid))) continue;
    newDRRows.push({ domain_id: did, regulation_id: rid, applicability: spec.applicability, notes: spec.notes, condition_notes: "" });
  }
  if (newDRRows.length > 0) {
    console.log(`  inserting ${newDRRows.length} new domain_regulations rows`);
    await insert("/domain_regulations", newDRRows);
  } else console.log("  no new rows");

  // ===== 5. business_functions =====
  console.log("\n=== business_functions ===");
  const existBF = await get("/business_functions?select=id,business_function_name");
  const bfIdByName = new Map<string, number>();
  for (const r of existBF) bfIdByName.set(String(r.business_function_name), Number(r.id));

  // Insert roots first, then children
  const roots = businessFunctions.filter(b => b.parent === null && !bfIdByName.has(b.business_function_name));
  if (roots.length > 0) {
    console.log(`  inserting ${roots.length} root BFs`);
    await insert("/business_functions", roots.map(r => ({ business_function_name: r.business_function_name, description: r.description, parent_business_function_id: null })));
  }
  const refreshedBF = await get("/business_functions?select=id,business_function_name");
  for (const r of refreshedBF) bfIdByName.set(String(r.business_function_name), Number(r.id));

  const children = businessFunctions.filter(b => b.parent !== null && !bfIdByName.has(b.business_function_name));
  if (children.length > 0) {
    console.log(`  inserting ${children.length} child BFs`);
    await insert("/business_functions", children.map(c => ({
      business_function_name: c.business_function_name,
      description: c.description,
      parent_business_function_id: bfIdByName.get(c.parent!),
    })));
  }
  const allBF = await get("/business_functions?select=id,business_function_name");
  for (const r of allBF) bfIdByName.set(String(r.business_function_name), Number(r.id));

  // ===== 6. business_function_domains =====
  console.log("\n=== business_function_domains ===");
  const existBFD = await get("/business_function_domains?select=business_function_id,domain_id");
  const bfdKey = (b: number, d: number) => `${b}:${d}`;
  const existBFDSet = new Set(existBFD.map(r => bfdKey(Number(r.business_function_id), Number(r.domain_id))));

  const newBFDRows: Row[] = [];
  for (const spec of bfDomains) {
    const bfid = bfIdByName.get(spec.bf);
    const did = domainIdByCode.get(spec.domain_code);
    if (!bfid) { console.log(`  WARN: BF not found ${spec.bf}`); continue; }
    if (!did) { console.log(`  WARN: domain not found ${spec.domain_code}`); continue; }
    if (existBFDSet.has(bfdKey(bfid, did))) continue;
    newBFDRows.push({ business_function_id: bfid, domain_id: did, responsibility_type: spec.responsibility_type, notes: spec.notes });
  }
  if (newBFDRows.length > 0) {
    console.log(`  inserting ${newBFDRows.length} new BF-domain rows`);
    await insert("/business_function_domains", newBFDRows);
  } else console.log("  no new rows");

  console.log("\n=== Final counts ===");
  const finalIndustries = await get("/industries?select=count");
  const finalJurisdictions = await get("/jurisdictions?select=count");
  const finalReg = await get("/regulations?select=count");
  const finalDR = await get("/domain_regulations?select=count");
  const finalBF = await get("/business_functions?select=count");
  const finalBFD = await get("/business_function_domains?select=count");
  console.log(JSON.stringify({
    industries: finalIndustries,
    jurisdictions: finalJurisdictions,
    regulations: finalReg,
    domain_regulations: finalDR,
    business_functions: finalBF,
    business_function_domains: finalBFD,
  }, null, 2));
}

await main();
