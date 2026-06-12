#!/usr/bin/env bun
// Phase C backfill: populate the empty business_functions axis end-to-end.
// 1. business_functions spine (20 top-level + 42 sub-functions, hierarchical)
// 2. business_function_domains for all ~109 domains (owner / contributor / consumer)
// 3. industry_business_functions (industry-characteristic function presence)
// Idempotent: reads natural keys first, only inserts missing rows.

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

// ============================================================
// SPINE — 20 top-level + 42 sub-functions
// ============================================================

type FnSpec = { name: string; description: string; parent?: string };

const topLevel: FnSpec[] = [
  { name: "Sales",                            description: "Pipeline ownership, account management, quota-carrying revenue generation, and sales operations support across direct and channel motions." },
  { name: "Marketing",                        description: "Brand, demand generation, content production, internal and external communications, customer marketing, and martech operations." },
  { name: "Customer Success",                 description: "Post-sale account health, expansion, retention, customer education, and onboarding for accounts after the initial sale." },
  { name: "Customer Service",                 description: "Reactive and proactive customer support: contact centre, case management, and customer-side field service." },
  { name: "Product Management",               description: "Product strategy, discovery, prioritization, roadmap ownership, and release coordination for software and physical products." },
  { name: "Software Engineering",             description: "Application development, platform engineering, site reliability, and quality engineering for the products and internal systems the company builds." },
  { name: "IT Operations",                    description: "Infrastructure, end-user computing, service desk, and corporate IT delivery for employee-facing technology." },
  { name: "Security",                         description: "InfoSec policy, security operations, identity and access management, vulnerability management, and incident response." },
  { name: "Data and Analytics",               description: "Data engineering, business intelligence, analytics delivery, and AI/ML platform operations across the enterprise." },
  { name: "Human Resources",                  description: "All people-related functions: recruiting, payroll, learning, benefits, workforce management, employee relations, and HR operations." },
  { name: "Finance",                          description: "All money-related functions: accounting, FP&A, treasury, tax, accounts payable, accounts receivable, and internal audit." },
  { name: "Procurement",                      description: "Indirect and direct sourcing, supplier qualification, contract negotiation, and procure-to-pay operations." },
  { name: "Supply Chain",                     description: "Supply chain planning, manufacturing, warehouse operations, logistics, and field service for physical goods movement and production." },
  { name: "Legal",                            description: "Contract management, intellectual property, litigation, regulatory affairs, and legal operations." },
  { name: "Governance, Risk and Compliance",  description: "Enterprise risk, internal audit, compliance operations, privacy office, and policy management." },
  { name: "Executive",                        description: "CEO office, corporate strategy, business development, mergers and acquisitions, and corporate communications." },
  { name: "Facilities and Real Estate",       description: "Workplace operations, real estate portfolio, environmental health and safety, and physical security premises." },
  { name: "Business Operations",              description: "Cross-functional operations: revenue operations, business operations, process improvement, and shared services not specific to any single function." },
  { name: "Research and Development",         description: "Industry research and development outside software engineering: pharmaceutical, chemical, materials, hardware, and applied R&D." },
  { name: "ESG and Sustainability",           description: "Sustainability reporting, climate accounting, ESG disclosures, and environmental and social programs." },
];

const subLevel: FnSpec[] = [
  // HR
  { name: "Recruiting",                       description: "Talent acquisition, sourcing, candidate screening, interview coordination, offer management.",                                                       parent: "Human Resources" },
  { name: "Payroll",                          description: "Payroll calculation, gross-to-net, statutory filing, garnishments, pay distribution, payroll compliance.",                                          parent: "Human Resources" },
  { name: "Learning and Development",         description: "Employee learning programs, compliance training, leadership development, course authoring, learning analytics.",                                    parent: "Human Resources" },
  { name: "Benefits Administration",          description: "Health, retirement, equity, voluntary benefits enrolment, life-event handling, carrier connectivity.",                                              parent: "Human Resources" },
  { name: "Workforce Management",             description: "Shift scheduling, time and attendance, labour forecasting, frontline workforce planning.",                                                          parent: "Human Resources" },
  { name: "Employee Relations",               description: "Case management for employee concerns, investigations, performance management policy administration, employee engagement programs.",                parent: "Human Resources" },
  // Finance
  { name: "Accounting",                       description: "General ledger, period close, consolidation, statutory reporting, financial controls.",                                                              parent: "Finance" },
  { name: "Financial Planning and Analysis",  description: "Budgeting, forecasting, scenario planning, driver-based modelling, management reporting.",                                                          parent: "Finance" },
  { name: "Treasury",                         description: "Cash management, banking relationships, FX, debt, investments, liquidity planning.",                                                                parent: "Finance" },
  { name: "Tax",                              description: "Direct and indirect tax compliance, transfer pricing, tax provision, statutory tax filing.",                                                        parent: "Finance" },
  { name: "Accounts Payable",                 description: "Supplier invoice processing, three-way match, payment runs, AP automation, vendor master maintenance.",                                             parent: "Finance" },
  { name: "Accounts Receivable",              description: "Customer billing, collections, cash application, credit management, AR aging.",                                                                     parent: "Finance" },
  { name: "Internal Audit",                   description: "Internal audit planning and execution, control testing, audit findings and remediation tracking.",                                                  parent: "Finance" },
  // Supply Chain
  { name: "Supply Chain Planning",            description: "Demand planning, supply planning, sales and operations planning, inventory optimization.",                                                          parent: "Supply Chain" },
  { name: "Manufacturing Operations",         description: "Production scheduling, shop-floor execution, quality, MES integration, OEE management.",                                                            parent: "Supply Chain" },
  { name: "Warehouse Operations",             description: "Inbound receiving, putaway, pick/pack/ship, inventory accuracy, WMS execution.",                                                                    parent: "Supply Chain" },
  { name: "Logistics",                        description: "Transportation management, freight, last-mile, customs, route optimization.",                                                                       parent: "Supply Chain" },
  { name: "Field Service Operations",         description: "Internal field service for company-owned assets, plant maintenance, EH&S inspections.",                                                             parent: "Supply Chain" },
  // Sales
  { name: "Sales Operations",                 description: "Quota and territory design, forecasting cadence, deal desk, sales analytics, sales technology administration.",                                    parent: "Sales" },
  { name: "Channel Sales",                    description: "Indirect sales through partners, channel program management, partner enablement, channel incentives.",                                              parent: "Sales" },
  // Marketing
  { name: "Demand Generation",                description: "Inbound and outbound marketing campaigns, lead generation, conversion programs, marketing-sourced pipeline.",                                       parent: "Marketing" },
  { name: "Brand and Creative",               description: "Brand identity, creative production, design systems, brand voice, digital asset management.",                                                       parent: "Marketing" },
  { name: "Marketing Communications",         description: "PR, analyst relations, customer marketing communications, and internal-facing corporate communications when housed under Marketing.",               parent: "Marketing" },
  // IT
  { name: "IT Service Desk",                  description: "Employee-facing IT support: incident, request, knowledge management, walk-up and virtual agent service.",                                           parent: "IT Operations" },
  { name: "IT Infrastructure",                description: "Servers, network, cloud, data centre, integration platform, infrastructure-level platform engineering.",                                            parent: "IT Operations" },
  { name: "End-User Computing",               description: "Endpoint management, productivity tooling, unified endpoint management, mobile, identity provisioning at the device level.",                       parent: "IT Operations" },
  // Engineering
  { name: "Platform Engineering",             description: "Internal developer platform, CI/CD, golden paths, internal tooling, build and release engineering.",                                                parent: "Software Engineering" },
  { name: "Site Reliability Engineering",     description: "Production operations, on-call, observability, SLO ownership, incident response for the company's own services.",                                  parent: "Software Engineering" },
  { name: "Quality Engineering",              description: "Test strategy, test automation, performance testing, quality gates in delivery pipelines.",                                                         parent: "Software Engineering" },
  // Security
  { name: "Identity and Access Management",   description: "Identity lifecycle, access provisioning, joiner-mover-leaver, privileged access, identity governance.",                                             parent: "Security" },
  { name: "Security Operations Center",       description: "Threat detection, alert triage, security incident response, threat intelligence, vulnerability remediation coordination.",                          parent: "Security" },
  // Data
  { name: "Data Engineering",                 description: "Data pipelines, lakehouse, data integration, master data management, data catalog operations.",                                                     parent: "Data and Analytics" },
  { name: "Business Intelligence",            description: "BI tooling, dashboarding, self-service analytics, reporting standards, analytics delivery.",                                                        parent: "Data and Analytics" },
  { name: "AI and Machine Learning",          description: "ML platform, model lifecycle, AI use-case delivery, model governance, AI ethics review.",                                                            parent: "Data and Analytics" },
  // Procurement
  { name: "Indirect Procurement",             description: "Services, software, SaaS, and indirect-spend categories. Owns SaaS-spend rationalisation, supplier qualification for non-production goods.",        parent: "Procurement" },
  { name: "Direct Procurement",               description: "Raw materials, components, production inputs, supplier quality for goods that enter the product.",                                                  parent: "Procurement" },
  // Customer Service
  { name: "Contact Center Operations",        description: "Inbound and outbound contact handling, agent workforce management, ACD/IVR operations, omnichannel routing.",                                       parent: "Customer Service" },
  { name: "Customer Field Service",           description: "Customer-side field service: on-site repair, install, maintenance dispatch, technician scheduling.",                                                parent: "Customer Service" },
  // GRC
  { name: "Privacy Office",                   description: "Privacy program management, DSR fulfilment, privacy impact assessments, data subject rights operations, cross-border data flow governance.",       parent: "Governance, Risk and Compliance" },
  { name: "Compliance Operations",            description: "Regulatory compliance program execution, policy management, control testing, evidence collection, regulator reporting.",                            parent: "Governance, Risk and Compliance" },
  // Legal
  { name: "Contract Operations",              description: "Contract authoring, redlining, approval routing, signature, repository, obligation tracking. The operational side of legal contract management.", parent: "Legal" },
  { name: "Intellectual Property",            description: "Patents, trademarks, trade secrets, IP licensing, IP litigation support.",                                                                          parent: "Legal" },
];

// ============================================================
// PHASE 2 — business_function_domains
// owner (1 row) + contributors (0-2) + consumers (0-2) per domain.
// Function refs use the exact business_function_name from the spine.
// ============================================================

type DomainRACI = {
  owner: string;
  contributors?: string[];
  consumers?: string[];
};

const RACI: Record<string, DomainRACI> = {
  // IT cluster
  ITSM:         { owner: "IT Operations", contributors: ["Security"] },
  ITOM:         { owner: "IT Operations", contributors: ["Software Engineering"] },
  ITAM:         { owner: "IT Operations", contributors: ["Finance", "Procurement"] },
  HAM:          { owner: "IT Operations", contributors: ["Procurement", "Finance"] },
  SAM:          { owner: "IT Operations", contributors: ["Procurement", "Finance"] },
  SMP:          { owner: "IT Operations", contributors: ["Procurement", "Finance"] },
  FINOPS:       { owner: "Finance",       contributors: ["Software Engineering", "IT Operations"] },
  CMDB:         { owner: "IT Operations", contributors: ["Software Engineering"] },
  DISCOVERY:    { owner: "IT Operations" },
  AIOPS:        { owner: "IT Operations", contributors: ["Software Engineering"] },
  OBS:          { owner: "Software Engineering", contributors: ["IT Operations"] },
  NPMD:         { owner: "IT Operations" },
  DEM:          { owner: "IT Operations", contributors: ["Software Engineering"] },
  "KUBE-PLAT":  { owner: "Software Engineering", contributors: ["IT Operations"] },
  UEM:          { owner: "IT Operations", contributors: ["Security"] },
  DCIM:         { owner: "IT Operations", contributors: ["Facilities and Real Estate"] },
  HRSD:         { owner: "Human Resources", contributors: ["IT Operations"] },
  LSD:          { owner: "Legal", contributors: ["IT Operations"] },
  APM:          { owner: "IT Operations", contributors: ["Software Engineering"] },
  COLLAB:       { owner: "IT Operations" }, // placeholder, see COLLAB-GOV below
  "COLLAB-GOV": { owner: "IT Operations", contributors: ["Security"] },
  WSC:          { owner: "IT Operations" },
  IPAAS:        { owner: "IT Operations", contributors: ["Software Engineering"] },
  LCAP:         { owner: "IT Operations", contributors: ["Software Engineering", "Business Operations"] },
  "APP-PAAS":   { owner: "Software Engineering", contributors: ["IT Operations"] },
  APIM:         { owner: "Software Engineering", contributors: ["IT Operations"] },

  // Security cluster
  SECOPS:       { owner: "Security" },
  SOAR:         { owner: "Security" },
  "VULN-MGMT":  { owner: "Security", contributors: ["IT Operations", "Software Engineering"] },
  "THREAT-INTEL": { owner: "Security" },
  IGA:          { owner: "Security", contributors: ["IT Operations"] },
  "PRIV-MGMT":  { owner: "Governance, Risk and Compliance", contributors: ["Legal", "Security"] },

  // GRC cluster
  GRC:          { owner: "Governance, Risk and Compliance" },
  AUDIT:        { owner: "Governance, Risk and Compliance", contributors: ["Finance"] },
  BCM:          { owner: "Governance, Risk and Compliance", contributors: ["IT Operations"] },
  "OP-RES":     { owner: "Governance, Risk and Compliance", contributors: ["IT Operations", "Security"] },
  TPRM:         { owner: "Governance, Risk and Compliance", contributors: ["Procurement", "Security"] },
  ESG:          { owner: "ESG and Sustainability", contributors: ["Finance"] },

  // Legal
  CLM:          { owner: "Legal", contributors: ["Sales", "Procurement"] },
  ESIGN:        { owner: "Legal", contributors: ["Sales", "Human Resources", "Procurement"] },

  // Sales cluster
  CRM:          { owner: "Sales", contributors: ["Marketing", "Customer Success"] },
  CPQ:          { owner: "Sales", contributors: ["Finance"] },
  "SALES-PERF": { owner: "Sales", contributors: ["Finance"] },
  "SALES-ENG":  { owner: "Sales", contributors: ["Marketing"] },
  "REV-INTEL":  { owner: "Sales" },
  "ACCT-PLAN":  { owner: "Sales" },
  "GTM-PLAN":   { owner: "Sales", contributors: ["Marketing", "Product Management"] },
  PRM:          { owner: "Sales", contributors: ["Marketing"] },
  LOYALTY:      { owner: "Marketing", contributors: ["Customer Success"] },

  // Marketing cluster
  MA:           { owner: "Marketing" },
  CDP:          { owner: "Marketing", contributors: ["Data and Analytics"] },
  SMM:          { owner: "Marketing" },
  DAM:          { owner: "Marketing", contributors: ["Product Management"] },
  DXP:          { owner: "Marketing", contributors: ["Software Engineering"] },
  HCMS:         { owner: "Software Engineering", contributors: ["Marketing"] },
  "WEB-CONTOPS": { owner: "Marketing", contributors: ["Software Engineering"] },
  INTRANET:     { owner: "Marketing", contributors: ["Human Resources", "Executive"] },

  // Customer cluster
  CSM:          { owner: "Customer Service" },
  CCAAS:        { owner: "Customer Service" },
  "CONV-AI":    { owner: "Customer Service", contributors: ["Software Engineering"] },
  FSM:          { owner: "Customer Service", contributors: ["Supply Chain"] },

  // HR cluster
  HCM:          { owner: "Human Resources" },
  ATS:          { owner: "Human Resources" },
  "TALENT-MGMT": { owner: "Human Resources" },
  LMS:          { owner: "Human Resources", contributors: ["Governance, Risk and Compliance"] },
  PAYROLL:      { owner: "Human Resources", contributors: ["Finance"] },
  "BEN-ADMIN":  { owner: "Human Resources" },
  "COMP-MGMT":  { owner: "Human Resources", contributors: ["Finance"] },
  WFM:          { owner: "Human Resources" },
  PA:           { owner: "Human Resources", contributors: ["Data and Analytics"] },
  "EMP-EXP":    { owner: "Human Resources" },
  ONBOARDING:   { owner: "Human Resources", contributors: ["IT Operations"] },
  SWP:          { owner: "Human Resources", contributors: ["Finance"] },
  VMS:          { owner: "Human Resources", contributors: ["Procurement"] },

  // Finance cluster
  "FIN":    { owner: "Finance" },
  EPM:          { owner: "Finance" },
  BI:           { owner: "Data and Analytics", contributors: ["Finance"] },
  "AP-AUTO":    { owner: "Finance" },
  EXPENSE:      { owner: "Finance", contributors: ["Human Resources"] },
  "SUB-MGMT":   { owner: "Finance", contributors: ["Sales"] },
  OMS:          { owner: "Business Operations", contributors: ["Sales", "Supply Chain"] },

  // Procurement / Supply Chain
  S2P:          { owner: "Procurement", contributors: ["Finance"] },
  "SUP-LIFE":   { owner: "Procurement", contributors: ["Governance, Risk and Compliance"] },
  "MFG-OPS":    { owner: "Supply Chain" },
  EAM:          { owner: "Supply Chain", contributors: ["IT Operations"] },
  "B2C-COMM":   { owner: "Marketing", contributors: ["Sales"] },

  // Product / Engineering
  "PROD-MGMT":  { owner: "Product Management", contributors: ["Software Engineering", "Marketing"] },
  VSDP:         { owner: "Software Engineering" },
  "TEST-MGMT":  { owner: "Software Engineering" },
  RPA:          { owner: "Business Operations", contributors: ["IT Operations"] },
  IDP:          { owner: "Business Operations", contributors: ["IT Operations"] },

  // Data
  MDM:          { owner: "Data and Analytics", contributors: ["IT Operations"] },
  DCG:          { owner: "Data and Analytics", contributors: ["Governance, Risk and Compliance"] },
  DQ:           { owner: "Data and Analytics" },
  DI:           { owner: "Data and Analytics", contributors: ["Software Engineering"] },

  // Workplace
  IWMS:         { owner: "Facilities and Real Estate", contributors: ["Human Resources"] },
  "VIS-MGMT":   { owner: "Facilities and Real Estate", contributors: ["Security"] },

  // Misc
  SPM:          { owner: "Executive", contributors: ["Finance", "IT Operations"] },
  KMS:          { owner: "Business Operations", contributors: ["Customer Service"] },
  ECM:          { owner: "Business Operations", contributors: ["IT Operations"] },
  "PROC-MIN":   { owner: "Business Operations" },
  PSA:          { owner: "Business Operations", contributors: ["Finance"] },

  // Industry-specific
  "BANK-OPS":   { owner: "Business Operations", contributors: ["Finance"] },
  "INS-CLAIMS": { owner: "Business Operations", contributors: ["Finance"] },
  "TELCO-BSS":  { owner: "Business Operations", contributors: ["Finance"] },
  "HC-PATIENT": { owner: "Business Operations", contributors: ["Finance"] },
  "CLIN-DEV":   { owner: "Research and Development" },
  "UTIL-OPS":   { owner: "Business Operations" },
  "PS-LIC":     { owner: "Business Operations" },
  "RET-STORE":  { owner: "Business Operations", contributors: ["Supply Chain"] },
};

// Domain-level consumer rows (sparse — only when there's a material non-contributor user)
const CONSUMERS: Record<string, string[]> = {
  BI:           ["Sales", "Marketing", "Human Resources", "Supply Chain", "Business Operations"],
  KMS:          ["IT Operations", "Sales"],
  LMS:          ["Software Engineering", "Sales", "Manufacturing Operations"],
  ESIGN:        ["Customer Success"],
  "EMP-EXP":    ["Executive"],
  ITSM:         ["Human Resources", "Finance"],
  INTRANET:     ["IT Operations"],
  MDM:          ["Sales", "Marketing", "Finance"],
  DCG:          ["Legal"],
  CDP:          ["Sales", "Customer Success"],
};

// ============================================================
// PHASE 3 — industry_business_functions
// Industry-characteristic function presence only. Skip the universal set.
// Top-level functions appear in every industry; junction rows highlight
// the function that is DISTINCTIVELY shaped by the industry.
// ============================================================

type IndustryFnSpec = { industry: string; functions: string[]; notes?: string };

const industryFns: IndustryFnSpec[] = [
  { industry: "Banking",            functions: ["Business Operations", "Governance, Risk and Compliance", "Security", "Finance", "Customer Service"], notes: "Banking ops, regulatory compliance, and fraud are deeply industry-shaped." },
  { industry: "Insurance",          functions: ["Business Operations", "Governance, Risk and Compliance", "Customer Service", "Finance"], notes: "Claims operations and underwriting are insurance-specific shapes of Business Operations." },
  { industry: "Healthcare Providers", functions: ["Business Operations", "Governance, Risk and Compliance", "Research and Development", "Human Resources", "Facilities and Real Estate"], notes: "Clinical ops and HIPAA compliance dominate." },
  { industry: "Life Sciences",      functions: ["Research and Development", "Governance, Risk and Compliance", "Supply Chain", "Procurement"], notes: "Drug development, GxP compliance, cold-chain logistics." },
  { industry: "Manufacturing",      functions: ["Supply Chain", "Procurement", "Research and Development", "Facilities and Real Estate"], notes: "Production planning, direct procurement, plant maintenance, EH&S." },
  { industry: "Retail",             functions: ["Supply Chain", "Marketing", "Customer Service", "Business Operations", "Human Resources"], notes: "Store operations, omni-channel, frontline workforce." },
  { industry: "Utilities",          functions: ["Business Operations", "Facilities and Real Estate", "Governance, Risk and Compliance", "Supply Chain"], notes: "Grid operations, regulator-driven compliance." },
  { industry: "Telecommunications", functions: ["Business Operations", "Customer Service", "IT Operations", "Sales"], notes: "Network operations, BSS/OSS, customer churn management." },
  { industry: "Public Sector",      functions: ["Business Operations", "Governance, Risk and Compliance", "Legal", "Finance"], notes: "Licensing, permits, statutory transparency." },
  { industry: "State and Local Government", functions: ["Business Operations", "Governance, Risk and Compliance", "Finance"], notes: "Same shape as Public Sector at sub-national level." },
  { industry: "Higher Education",   functions: ["Human Resources", "Finance", "Research and Development", "Facilities and Real Estate"], notes: "Student records (HR-adjacent), grants accounting, research administration." },
  { industry: "Non-Profit",         functions: ["Finance", "Marketing", "Governance, Risk and Compliance"], notes: "Donor management, fund accounting, regulatory transparency." },
  { industry: "Professional Services", functions: ["Sales", "Human Resources", "Business Operations", "Finance"], notes: "Resource-on-engagement model, billable utilization, project accounting." },
];

// ============================================================
// RUN
// ============================================================
async function main() {
  console.log("\n=== Phase 1: business_functions spine ===");
  const allFns = [...topLevel, ...subLevel];
  const fnRowsTopLevel = topLevel.map(f => ({ business_function_name: f.name, description: f.description }));
  await syncByName("/business_functions", fnRowsTopLevel);

  // Re-read to get top-level ids for parent linking
  const allFnRows = await get("/business_functions?select=id,business_function_name&limit=10000");
  const fnIdByName = new Map<string, number>();
  for (const r of allFnRows) fnIdByName.set(String(r.business_function_name), Number(r.id));

  const fnRowsSubLevel = subLevel.map(f => ({
    business_function_name: f.name,
    description: f.description,
    parent_business_function_id: fnIdByName.get(f.parent!),
  }));
  for (const r of fnRowsSubLevel) {
    if (!r.parent_business_function_id) throw new Error(`Parent function not found for ${r.business_function_name}`);
  }
  await syncByName("/business_functions", fnRowsSubLevel);

  // Final id map (all functions)
  const finalFns = await get("/business_functions?select=id,business_function_name&limit=10000");
  fnIdByName.clear();
  for (const r of finalFns) fnIdByName.set(String(r.business_function_name), Number(r.id));
  console.log(`  total business_functions in DB: ${finalFns.length}`);

  console.log("\n=== Phase 2: business_function_domains ===");
  const allDomains = await get("/domains?select=id,domain_code&limit=10000");
  const domainIdByCode = new Map<string, number>();
  for (const r of allDomains) domainIdByCode.set(String(r.domain_code), Number(r.id));

  const existingBFD = await get("/business_function_domains?select=business_function_id,domain_id,responsibility_type&limit=10000");
  const existingBFDSet = new Set(existingBFD.map(r => `${r.business_function_id}:${r.domain_id}:${r.responsibility_type}`));

  const newBFDRows: Row[] = [];
  const missingDomains: string[] = [];
  for (const [code, raci] of Object.entries(RACI)) {
    const domainId = domainIdByCode.get(code);
    if (!domainId) { missingDomains.push(code); continue; }
    const addRow = (fnName: string, responsibility: "owner" | "contributor" | "consumer") => {
      const fnId = fnIdByName.get(fnName);
      if (!fnId) throw new Error(`Function not found: ${fnName}`);
      const key = `${fnId}:${domainId}:${responsibility}`;
      if (existingBFDSet.has(key)) return;
      existingBFDSet.add(key);
      newBFDRows.push({ business_function_id: fnId, domain_id: domainId, responsibility_type: responsibility, notes: "" });
    };
    addRow(raci.owner, "owner");
    for (const c of raci.contributors ?? []) addRow(c, "contributor");
    for (const c of CONSUMERS[code] ?? []) addRow(c, "consumer");
  }

  // Domains without explicit RACI: warn so they can be filled later
  const racKeys = new Set(Object.keys(RACI));
  const uncovered = allDomains.filter(r => !racKeys.has(String(r.domain_code))).map(r => r.domain_code);
  if (uncovered.length > 0) {
    console.log(`  ! ${uncovered.length} domains without RACI mapping (will not get function rows):`);
    console.log(`    ${uncovered.join(", ")}`);
  }
  if (missingDomains.length > 0) {
    console.log(`  ! RACI entries pointing to non-existent domain codes (skipped): ${missingDomains.join(", ")}`);
  }

  if (newBFDRows.length > 0) {
    console.log(`  inserting ${newBFDRows.length} business_function_domains rows`);
    await insert("/business_function_domains", newBFDRows);
  } else {
    console.log("  no new business_function_domains rows");
  }

  console.log("\n=== Phase 3: industry_business_functions ===");
  const allIndustries = await get("/industries?select=id,industry_name&limit=10000");
  const industryIdByName = new Map<string, number>();
  for (const r of allIndustries) industryIdByName.set(String(r.industry_name), Number(r.id));

  const existingIBF = await get("/industry_business_functions?select=industry_id,business_function_id&limit=10000");
  const existingIBFSet = new Set(existingIBF.map(r => `${r.industry_id}:${r.business_function_id}`));

  const newIBFRows: Row[] = [];
  for (const spec of industryFns) {
    const industryId = industryIdByName.get(spec.industry);
    if (!industryId) { console.log(`  ! industry not found: ${spec.industry}`); continue; }
    for (const fn of spec.functions) {
      const fnId = fnIdByName.get(fn);
      if (!fnId) throw new Error(`Function not found: ${fn}`);
      const key = `${industryId}:${fnId}`;
      if (existingIBFSet.has(key)) continue;
      existingIBFSet.add(key);
      newIBFRows.push({ industry_id: industryId, business_function_id: fnId, notes: spec.notes ?? "" });
    }
  }
  if (newIBFRows.length > 0) {
    console.log(`  inserting ${newIBFRows.length} industry_business_functions rows`);
    await insert("/industry_business_functions", newIBFRows);
  } else {
    console.log("  no new industry_business_functions rows");
  }

  // ===== Final counts =====
  const counts = {
    business_functions_total:           (await get("/business_functions?select=id&limit=10000")).length,
    business_function_domains_total:    (await get("/business_function_domains?select=id&limit=10000")).length,
    industry_business_functions_total:  (await get("/industry_business_functions?select=id&limit=10000")).length,
    domains_total:                      (await get("/domains?select=id&limit=10000")).length,
    domains_with_owner_function:        (await get("/business_function_domains?responsibility_type=eq.owner&select=domain_id&limit=10000")).length,
  };
  console.log("\n=== Final counts ===");
  console.log(JSON.stringify(counts, null, 2));
}

async function syncByName(path: string, rows: { business_function_name: string }[]): Promise<void> {
  const existing = await get(`${path}?select=id,business_function_name&limit=10000`);
  const existingNames = new Set(existing.map(r => String(r.business_function_name)));
  const missing = rows.filter(r => !existingNames.has(r.business_function_name));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new rows into ${path} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} already present, nothing to insert`);
  }
}

await main();
