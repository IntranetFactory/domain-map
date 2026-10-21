#!/usr/bin/env bun
// Loads Workday's platform footprint (HR + Finance + EPM + adjacent domains) plus
// the point-solution competitors in each of those domains into the live Semantius
// `domain_map` module. Idempotent: re-reads existing rows by natural key and only
// inserts the missing ones. Omits `record_status` everywhere so the DB default
// `"new"` kicks in — AI-derived research is never auto-approved.

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

async function syncTable<T extends Row>(path: string, rows: T[], keyField: keyof T & string): Promise<Map<string, number>> {
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
// DOMAINS — Workday's footprint adds these 15 (all top-level / sibling)
// ============================================================
const newDomains = [
  { domain_code: "HCM", domain_name: "Human Capital Management", description: "Core HR system of record covering worker data, organisation and position management, self-service, and lifecycle workflows. The HRIS / system-of-record layer of the HR stack." },
  { domain_code: "PAYROLL", domain_name: "Payroll Management", description: "Gross-to-net calculation, statutory tax filing, garnishments, pay distribution, and multi-country payroll execution." },
  { domain_code: "ATS", domain_name: "Applicant Tracking and Recruiting", description: "Requisition management, candidate sourcing, interview workflows, and offer management. AI-assisted matching and screening overlays are increasingly bundled." },
  { domain_code: "LMS", domain_name: "Learning Management", description: "Course authoring, content delivery, compliance training, certifications, and learning paths for employees and extended audiences." },
  { domain_code: "TALENT-MGMT", domain_name: "Talent Management", description: "Performance reviews, goals and OKRs, continuous feedback, succession planning, and career development. Often bundled into HCM suites but a strong standalone point-solution market exists." },
  { domain_code: "WFM", domain_name: "Workforce Management", description: "Time and attendance tracking, shift scheduling, absence and leave, labour forecasting, and labour-law compliance for hourly and shift-based workforces." },
  { domain_code: "COMP-MGMT", domain_name: "Compensation Management", description: "Compensation planning cycles, pay-equity analysis, bonus and incentive plans, market benchmarking, and equity administration." },
  { domain_code: "BEN-ADMIN", domain_name: "Benefits Administration", description: "Open enrolment, life-event handling, carrier connectivity, ACA compliance, and benefits decision support." },
  { domain_code: "EMP-EXP", domain_name: "Employee Experience and Engagement", description: "Engagement and pulse surveys, 360 feedback, lifecycle (onboarding, exit) listening, and action planning. Distinct from HRSD case management." },
  { domain_code: "PA", domain_name: "People Analytics", description: "HR metrics, dashboards, workforce composition analysis, attrition prediction, and DEI analytics on top of the HR data stack." },
  { domain_code: "VMS", domain_name: "Vendor Management System", description: "Contingent-workforce sourcing, staffing-supplier management, rate cards, contingent timesheets, and worker-classification compliance. Used by procurement and HR jointly." },
  { domain_code: "ERP-FIN", domain_name: "Core ERP Financial Management", description: "General ledger, accounts payable/receivable, fixed assets, period close, multi-entity and multi-currency consolidation, and revenue recognition. The accounting system of record." },
  { domain_code: "EPM", domain_name: "Enterprise Performance Management", description: "FP&A: budgeting, rolling forecasts, driver-based modelling, scenario planning, workforce planning, and management reporting. Sits above the GL." },
  { domain_code: "EXPENSE", domain_name: "Expense Management", description: "Receipt capture, expense entry, policy enforcement, corporate card reconciliation, travel-booking integration, and reimbursement." },
  { domain_code: "PSA", domain_name: "Professional Services Automation", description: "Resource planning and allocation, project accounting, project time and expense, project billing, and utilisation tracking for services organisations." },
];

// ============================================================
// CAPABILITIES — 5-8 per new domain
// ============================================================
type Cap = { capability_code: string; capability_name: string; description: string; domain: string };
const capabilities: Cap[] = [
  // HCM
  { capability_code: "CORE-HR", capability_name: "Core HR Record", description: "Master record of worker data, employment history, and personal information.", domain: "HCM" },
  { capability_code: "ORG-MGMT", capability_name: "Organisation and Position Management", description: "Modelling of legal entities, supervisory organisations, positions, and reporting structures.", domain: "HCM" },
  { capability_code: "SELF-SERVICE-HR", capability_name: "Employee and Manager Self-Service", description: "Self-service portals for personal data, time off, team management, and HR transactions.", domain: "HCM" },
  { capability_code: "WORKFORCE-PLAN", capability_name: "Workforce Planning", description: "Headcount planning, skills-gap analysis, and supply/demand forecasting for the workforce.", domain: "HCM" },
  { capability_code: "ONBOARDING", capability_name: "Employee Onboarding", description: "New-hire data collection, document signing, equipment provisioning, and orientation workflows.", domain: "HCM" },
  { capability_code: "HR-COMPLIANCE", capability_name: "HR Regulatory Compliance", description: "EEO, OSHA, GDPR-HR, and country-specific employment reporting and recordkeeping.", domain: "HCM" },

  // PAYROLL
  { capability_code: "GROSS-TO-NET", capability_name: "Gross-to-Net Calculation", description: "Calculation of gross pay, deductions, taxes, and net pay per pay period.", domain: "PAYROLL" },
  { capability_code: "TAX-FILING", capability_name: "Statutory Tax Filing", description: "Federal, state, and local payroll tax calculation, withholding, and filing.", domain: "PAYROLL" },
  { capability_code: "PAYROLL-GLOBAL", capability_name: "Multi-Country Payroll", description: "In-country and aggregator payroll execution across multiple jurisdictions.", domain: "PAYROLL" },
  { capability_code: "PAY-DISTRIBUTION", capability_name: "Pay Distribution", description: "Direct deposit, pay cards, on-demand pay, and payslip distribution.", domain: "PAYROLL" },
  { capability_code: "GARNISHMENTS", capability_name: "Garnishment Processing", description: "Court-ordered withholdings, support orders, and creditor garnishments.", domain: "PAYROLL" },

  // ATS
  { capability_code: "REQ-MGMT", capability_name: "Requisition Management", description: "Job-requisition creation, approval, and posting to job boards.", domain: "ATS" },
  { capability_code: "SOURCING", capability_name: "Candidate Sourcing", description: "Active sourcing, talent CRM, talent pools, and referral programs.", domain: "ATS" },
  { capability_code: "CANDIDATE-EXP", capability_name: "Candidate Experience", description: "Career site, application flow, communications, and candidate self-service.", domain: "ATS" },
  { capability_code: "INTERVIEW-MGMT", capability_name: "Interview Management", description: "Interview scheduling, scorecards, and structured-interview workflows.", domain: "ATS" },
  { capability_code: "OFFER-MGMT", capability_name: "Offer Management", description: "Offer generation, approval, e-signature, and pre-hire workflows.", domain: "ATS" },
  { capability_code: "AI-RECRUIT", capability_name: "AI-Driven Matching and Screening", description: "Machine-learning candidate matching, resume parsing, and screening assistants.", domain: "ATS" },

  // LMS
  { capability_code: "COURSE-AUTHOR", capability_name: "Course Authoring", description: "Authoring of e-learning content, SCORM/xAPI, and microlearning modules.", domain: "LMS" },
  { capability_code: "CONTENT-DELIVERY", capability_name: "Content Delivery and Tracking", description: "Delivery of learning content with completion, score, and time-tracking.", domain: "LMS" },
  { capability_code: "SKILLS-MGMT", capability_name: "Skills Management", description: "Skills taxonomy, skill assessment, and skill-gap analysis.", domain: "LMS" },
  { capability_code: "COMPLIANCE-TRAIN", capability_name: "Compliance Training", description: "Mandatory training assignment, expiry tracking, and audit reporting.", domain: "LMS" },
  { capability_code: "CERT-MGMT", capability_name: "Certification Management", description: "Issuing, tracking, and renewal of certifications and credentials.", domain: "LMS" },
  { capability_code: "LEARNING-PATH", capability_name: "Learning Paths", description: "Multi-step curricula, prerequisites, and role-based learning journeys.", domain: "LMS" },

  // TALENT-MGMT
  { capability_code: "PERF-REVIEW", capability_name: "Performance Review Cycles", description: "Annual and continuous performance review workflows, calibration, and ratings.", domain: "TALENT-MGMT" },
  { capability_code: "GOAL-MGMT", capability_name: "Goals and OKR Management", description: "Cascading goals, OKRs, key results, and progress tracking.", domain: "TALENT-MGMT" },
  { capability_code: "CONTINUOUS-FEEDBACK", capability_name: "Continuous Feedback and 1-on-1s", description: "Lightweight feedback, recognition, and 1-on-1 meeting workflows.", domain: "TALENT-MGMT" },
  { capability_code: "SUCCESSION-PLAN", capability_name: "Succession Planning", description: "Successor identification, talent pools, and bench-strength analysis.", domain: "TALENT-MGMT" },
  { capability_code: "CAREER-DEV", capability_name: "Career Development", description: "Career frameworks, internal mobility, and development plans.", domain: "TALENT-MGMT" },
  { capability_code: "TALENT-CALIBRATION", capability_name: "Talent Calibration", description: "9-box, performance/potential calibration, and talent reviews.", domain: "TALENT-MGMT" },

  // WFM
  { capability_code: "TIME-TRACKING", capability_name: "Time and Attendance", description: "Clock-in/out, time-card collection, and approval workflows.", domain: "WFM" },
  { capability_code: "SCHEDULING", capability_name: "Shift Scheduling", description: "Shift creation, assignment, swap, and self-scheduling for hourly workforces.", domain: "WFM" },
  { capability_code: "ABSENCE-MGMT", capability_name: "Absence and Leave Management", description: "Time-off accruals, leave requests, FMLA/statutory leave, and balance tracking.", domain: "WFM" },
  { capability_code: "LABOR-FORECAST", capability_name: "Labour Forecasting", description: "Demand-driven labour forecasting and budgeted-vs-actual hours.", domain: "WFM" },
  { capability_code: "LABOR-COMPLIANCE", capability_name: "Labour-Law Compliance", description: "Predictive scheduling, break-and-meal compliance, and union-rule enforcement.", domain: "WFM" },

  // COMP-MGMT
  { capability_code: "COMP-PLANNING", capability_name: "Compensation Planning Cycles", description: "Annual merit, bonus, and equity cycles with manager workflows and budgets.", domain: "COMP-MGMT" },
  { capability_code: "PAY-EQUITY", capability_name: "Pay-Equity Analysis", description: "Statistical pay-gap analysis by gender, race, and other attributes.", domain: "COMP-MGMT" },
  { capability_code: "INCENTIVE-MGMT", capability_name: "Bonus and Incentive Plans", description: "Short-term and long-term incentive plan design, calculation, and approval.", domain: "COMP-MGMT" },
  { capability_code: "COMP-BENCHMARK", capability_name: "Compensation Benchmarking", description: "Market data, salary surveys, and benchmark-to-internal mapping.", domain: "COMP-MGMT" },
  { capability_code: "EQUITY-MGMT", capability_name: "Equity and Stock Plan Administration", description: "Grant management, vesting schedules, and 409A / cap-table integration.", domain: "COMP-MGMT" },

  // BEN-ADMIN
  { capability_code: "BENEFITS-ENROLL", capability_name: "Annual Benefits Enrolment", description: "Open enrolment, plan comparison, and elections workflow.", domain: "BEN-ADMIN" },
  { capability_code: "BENEFITS-LIFE-EVENT", capability_name: "Life-Event Handling", description: "Qualifying life events, mid-year changes, and dependent management.", domain: "BEN-ADMIN" },
  { capability_code: "CARRIER-CONNECT", capability_name: "Carrier Connectivity", description: "EDI / API feeds to insurance carriers, 401(k) providers, and other vendors.", domain: "BEN-ADMIN" },
  { capability_code: "ACA-COMPLIANCE", capability_name: "ACA Compliance Reporting", description: "1094/1095 reporting, affordability tracking, and ACA penalty avoidance.", domain: "BEN-ADMIN" },
  { capability_code: "BEN-DECISION", capability_name: "Benefits Decision Support", description: "Plan-recommendation tools and cost calculators for employees.", domain: "BEN-ADMIN" },

  // EMP-EXP
  { capability_code: "ENG-SURVEY", capability_name: "Engagement Surveys", description: "Annual and ad-hoc engagement surveys with benchmarking.", domain: "EMP-EXP" },
  { capability_code: "PULSE-SURVEY", capability_name: "Pulse Surveys", description: "High-frequency short-form surveys and topic-specific check-ins.", domain: "EMP-EXP" },
  { capability_code: "360-FEEDBACK", capability_name: "360-Degree Feedback", description: "Multi-rater feedback collection from peers, managers, and reports.", domain: "EMP-EXP" },
  { capability_code: "LIFECYCLE-LISTEN", capability_name: "Lifecycle Listening", description: "Onboarding, stay, and exit interviews tied to employee tenure milestones.", domain: "EMP-EXP" },
  { capability_code: "ACTION-PLAN", capability_name: "Survey Action Planning", description: "Manager action plans, follow-up tracking, and impact measurement.", domain: "EMP-EXP" },

  // PA
  { capability_code: "HR-METRICS", capability_name: "HR Metrics and Dashboards", description: "Standard HR KPIs (headcount, attrition, span of control) with self-service dashboards.", domain: "PA" },
  { capability_code: "ATTRITION-PREDICT", capability_name: "Attrition Prediction", description: "ML-based prediction of voluntary attrition and flight-risk segmentation.", domain: "PA" },
  { capability_code: "DEI-ANALYTICS", capability_name: "DEI Analytics", description: "Diversity, equity, and inclusion analytics across hiring, pay, and progression.", domain: "PA" },
  { capability_code: "WORKFORCE-COMP", capability_name: "Workforce Composition Analytics", description: "Org-shape, span and layers, contingent vs FTE, and skills-mix analytics.", domain: "PA" },

  // VMS
  { capability_code: "WORKER-REQ", capability_name: "Contingent Worker Requisition", description: "Contingent worker requisition, distribution to staffing suppliers, and bid management.", domain: "VMS" },
  { capability_code: "STAFFING-SUPPLIER", capability_name: "Staffing Supplier Management", description: "Staffing supplier scorecards, tiering, and managed-service-provider workflows.", domain: "VMS" },
  { capability_code: "RATE-MGMT", capability_name: "Rate-Card Management", description: "Contingent rate cards, mark-ups, and bill-rate vs pay-rate management.", domain: "VMS" },
  { capability_code: "CONTINGENT-TIME", capability_name: "Contingent Timesheets and Invoicing", description: "Time approval, consolidated invoicing, and SOW deliverable tracking.", domain: "VMS" },
  { capability_code: "WORKER-CLASS", capability_name: "Worker Classification Compliance", description: "Independent-contractor vs employee classification, 1099 management, and co-employment risk.", domain: "VMS" },

  // ERP-FIN
  { capability_code: "GL", capability_name: "General Ledger", description: "Chart of accounts, journals, and the financial accounting backbone.", domain: "ERP-FIN" },
  { capability_code: "AR", capability_name: "Accounts Receivable", description: "Customer invoicing, collections, and cash application.", domain: "ERP-FIN" },
  { capability_code: "AP", capability_name: "Accounts Payable", description: "Vendor invoice processing, payment runs, and disbursements.", domain: "ERP-FIN" },
  { capability_code: "FIXED-ASSETS", capability_name: "Fixed Asset Accounting", description: "Capitalisation, depreciation, and disposal of fixed assets.", domain: "ERP-FIN" },
  { capability_code: "CLOSE-CONSOL", capability_name: "Period Close and Consolidation", description: "Monthly/quarterly/annual close, intercompany elimination, and consolidation.", domain: "ERP-FIN" },
  { capability_code: "MULTI-ENTITY", capability_name: "Multi-Entity and Multi-Currency", description: "Multi-book, multi-currency translation, and statutory reporting.", domain: "ERP-FIN" },
  { capability_code: "REVENUE-RECOG", capability_name: "Revenue Recognition", description: "ASC 606 / IFRS 15 revenue recognition and contract accounting.", domain: "ERP-FIN" },

  // EPM
  { capability_code: "BUDGET-PLAN", capability_name: "Budgeting and Planning", description: "Annual operating plan, bottom-up and top-down budgeting workflows.", domain: "EPM" },
  { capability_code: "FORECAST", capability_name: "Rolling Forecasts", description: "Continuous and rolling forecasts versus plan and prior year.", domain: "EPM" },
  { capability_code: "DRIVER-MODEL", capability_name: "Driver-Based Modelling", description: "Driver-based planning, sensitivity analysis, and what-if modelling.", domain: "EPM" },
  { capability_code: "SCENARIO-MODEL", capability_name: "Scenario Planning", description: "Scenario / contingency modelling and side-by-side comparison.", domain: "EPM" },
  { capability_code: "MGMT-REPORT", capability_name: "Management Reporting", description: "Management P&L, variance, and board-pack reporting.", domain: "EPM" },
  { capability_code: "WORKFORCE-PLAN-EPM", capability_name: "Workforce and Headcount Planning", description: "Headcount and labour-cost planning in the FP&A context.", domain: "EPM" },

  // EXPENSE
  { capability_code: "EXPENSE-CAPTURE", capability_name: "Receipt Capture and Expense Entry", description: "Mobile receipt capture, OCR, and expense entry workflows.", domain: "EXPENSE" },
  { capability_code: "EXPENSE-POLICY", capability_name: "Expense Policy Enforcement", description: "Rules-based policy checks, over-limit warnings, and audit flagging.", domain: "EXPENSE" },
  { capability_code: "CORP-CARD", capability_name: "Corporate Card Reconciliation", description: "Corporate card feeds, auto-matching, and reconciliation.", domain: "EXPENSE" },
  { capability_code: "TRAVEL-BOOK", capability_name: "Travel Booking Integration", description: "Online booking tool, itinerary capture, and TMC integration.", domain: "EXPENSE" },
  { capability_code: "REIMBURSEMENT", capability_name: "Employee Reimbursement", description: "Approval workflows and reimbursement payment to employees.", domain: "EXPENSE" },

  // PSA
  { capability_code: "RESOURCE-PLAN", capability_name: "Resource Planning and Allocation", description: "Resource demand, capacity planning, and project staffing.", domain: "PSA" },
  { capability_code: "PROJECT-ACCT", capability_name: "Project Accounting", description: "Project costing, WIP, and project P&L.", domain: "PSA" },
  { capability_code: "TIME-EXPENSE-PROJ", capability_name: "Project Time and Expense", description: "Project-tagged time and expense entry and approval.", domain: "PSA" },
  { capability_code: "BILLING-PROJ", capability_name: "Project Billing", description: "Time-and-materials, fixed-price, and milestone billing of project work.", domain: "PSA" },
  { capability_code: "UTILIZATION", capability_name: "Utilisation Tracking", description: "Billable / non-billable utilisation, realisation, and profitability metrics.", domain: "PSA" },
];

// ============================================================
// VENDORS — new only; existing reused: Workday, SAP SE, Oracle, Microsoft, IBM
// ============================================================
const vendors = [
  // HCM / Payroll suite vendors
  { vendor_name: "UKG", vendor_url: "https://www.ukg.com", headquarters_country: "USA", description: "HCM and workforce-management vendor; product of the Ultimate Software / Kronos merger.", notes: "Result of 2020 Ultimate-Kronos merger (UKG = Ultimate Kronos Group)." },
  { vendor_name: "ADP", vendor_url: "https://www.adp.com", headquarters_country: "USA", description: "Payroll, HR, and HCM services vendor; one of the largest payroll providers globally.", notes: "" },
  { vendor_name: "Dayforce", vendor_url: "https://www.dayforce.com", headquarters_country: "USA", description: "HCM, payroll, and workforce-management cloud vendor.", notes: "Renamed from Ceridian to Dayforce in 2024 after its flagship platform." },
  { vendor_name: "BambooHR", vendor_url: "https://www.bamboohr.com", headquarters_country: "USA", description: "HR-information-system vendor focused on small and mid-sized businesses.", notes: "" },
  { vendor_name: "HiBob", vendor_url: "https://www.hibob.com", headquarters_country: "UK", description: "Modern HRIS vendor focused on mid-market multinationals.", notes: "Israel-founded; HQ in London." },
  { vendor_name: "Rippling", vendor_url: "https://www.rippling.com", headquarters_country: "USA", description: "Integrated HR, IT, and finance platform vendor.", notes: "" },
  { vendor_name: "Personio", vendor_url: "https://www.personio.com", headquarters_country: "Germany", description: "All-in-one HR platform for European SMBs.", notes: "" },
  { vendor_name: "Paylocity", vendor_url: "https://www.paylocity.com", headquarters_country: "USA", description: "Cloud payroll and HR vendor for mid-market.", notes: "" },
  { vendor_name: "Paychex", vendor_url: "https://www.paychex.com", headquarters_country: "USA", description: "Payroll, HR, and benefits services vendor for SMBs.", notes: "" },
  { vendor_name: "Gusto", vendor_url: "https://gusto.com", headquarters_country: "USA", description: "Cloud payroll and HR for small businesses.", notes: "" },
  { vendor_name: "CloudPay", vendor_url: "https://www.cloudpay.com", headquarters_country: "UK", description: "Global managed-payroll services vendor.", notes: "" },
  { vendor_name: "Papaya Global", vendor_url: "https://www.papayaglobal.com", headquarters_country: "Israel", description: "Global payroll and workforce-payments platform.", notes: "" },

  // ATS vendors
  { vendor_name: "Greenhouse Software", vendor_url: "https://www.greenhouse.com", headquarters_country: "USA", description: "Recruiting and applicant-tracking platform.", notes: "" },
  { vendor_name: "Lever", vendor_url: "https://www.lever.co", headquarters_country: "USA", description: "Talent acquisition / ATS platform.", notes: "Acquired by Employ Inc in 2022 (which also owns JazzHR and Jobvite)." },
  { vendor_name: "iCIMS", vendor_url: "https://www.icims.com", headquarters_country: "USA", description: "Enterprise talent-acquisition and recruiting platform.", notes: "" },
  { vendor_name: "SmartRecruiters", vendor_url: "https://www.smartrecruiters.com", headquarters_country: "USA", description: "Enterprise recruiting platform.", notes: "" },
  { vendor_name: "Ashby", vendor_url: "https://www.ashbyhq.com", headquarters_country: "USA", description: "Modern ATS with built-in analytics and scheduling.", notes: "" },
  { vendor_name: "Eightfold AI", vendor_url: "https://eightfold.ai", headquarters_country: "USA", description: "AI talent-intelligence platform for recruiting and internal mobility.", notes: "" },
  { vendor_name: "Phenom", vendor_url: "https://www.phenom.com", headquarters_country: "USA", description: "AI-driven talent-experience platform.", notes: "" },

  // LMS / Talent Mgmt vendors
  { vendor_name: "Cornerstone OnDemand", vendor_url: "https://www.cornerstoneondemand.com", headquarters_country: "USA", description: "Talent management and learning suite vendor.", notes: "Acquired Saba Software in 2020. Owned by Clearlake Capital." },
  { vendor_name: "Docebo", vendor_url: "https://www.docebo.com", headquarters_country: "Canada", description: "AI-powered enterprise learning platform.", notes: "" },
  { vendor_name: "360Learning", vendor_url: "https://360learning.com", headquarters_country: "France", description: "Collaborative learning platform.", notes: "" },
  { vendor_name: "Absorb LMS", vendor_url: "https://www.absorblms.com", headquarters_country: "Canada", description: "Cloud learning-management vendor.", notes: "" },
  { vendor_name: "Epignosis", vendor_url: "https://www.epignosishq.com", headquarters_country: "Cyprus", description: "Learning-platform vendor (TalentLMS, eFront).", notes: "" },
  { vendor_name: "Lattice", vendor_url: "https://lattice.com", headquarters_country: "USA", description: "People-success platform: performance, engagement, growth, compensation.", notes: "" },
  { vendor_name: "15Five", vendor_url: "https://www.15five.com", headquarters_country: "USA", description: "Continuous-performance and engagement platform.", notes: "" },
  { vendor_name: "Betterworks", vendor_url: "https://www.betterworks.com", headquarters_country: "USA", description: "Performance management and OKR vendor.", notes: "" },

  // Engagement / People Analytics
  { vendor_name: "Culture Amp", vendor_url: "https://www.cultureamp.com", headquarters_country: "Australia", description: "Employee-experience and engagement platform.", notes: "" },
  { vendor_name: "Qualtrics", vendor_url: "https://www.qualtrics.com", headquarters_country: "USA", description: "Experience-management platform (CX, EX, brand).", notes: "Public again 2021, taken private by Silver Lake/CPP 2023." },
  { vendor_name: "LinkedIn", vendor_url: "https://www.linkedin.com", headquarters_country: "USA", description: "Professional network and talent solutions vendor (Glint, LinkedIn Talent).", notes: "Owned by Microsoft since 2016." },
  { vendor_name: "Visier", vendor_url: "https://www.visier.com", headquarters_country: "Canada", description: "People analytics platform.", notes: "" },
  { vendor_name: "Crunchr", vendor_url: "https://www.crunchr.com", headquarters_country: "Netherlands", description: "People-analytics vendor focused on enterprise HR.", notes: "" },
  { vendor_name: "ChartHop", vendor_url: "https://www.charthop.com", headquarters_country: "USA", description: "People-analytics and org-planning platform.", notes: "" },
  { vendor_name: "OneModel", vendor_url: "https://www.onemodel.co", headquarters_country: "USA", description: "People-analytics platform.", notes: "" },

  // WFM vendors
  { vendor_name: "Quinyx", vendor_url: "https://www.quinyx.com", headquarters_country: "Sweden", description: "Workforce-management platform for frontline workforces.", notes: "" },
  { vendor_name: "Replicon", vendor_url: "https://www.replicon.com", headquarters_country: "Canada", description: "Time, attendance, and PSA vendor.", notes: "Acquired by Deltek in 2023." },
  { vendor_name: "Deputy", vendor_url: "https://www.deputy.com", headquarters_country: "Australia", description: "Employee scheduling and workforce-management platform.", notes: "" },
  { vendor_name: "WorkJam", vendor_url: "https://www.workjam.com", headquarters_country: "Canada", description: "Frontline digital workplace and WFM platform.", notes: "" },
  { vendor_name: "When I Work", vendor_url: "https://wheniwork.com", headquarters_country: "USA", description: "Employee scheduling and time-tracking for SMBs.", notes: "" },

  // Compensation vendors
  { vendor_name: "Payscale", vendor_url: "https://www.payscale.com", headquarters_country: "USA", description: "Compensation data and management platform.", notes: "" },
  { vendor_name: "beqom", vendor_url: "https://www.beqom.com", headquarters_country: "Switzerland", description: "Total-compensation and pay-equity platform.", notes: "" },
  { vendor_name: "Pave", vendor_url: "https://www.pave.com", headquarters_country: "USA", description: "Compensation-planning and benchmarking platform.", notes: "" },
  { vendor_name: "Carta", vendor_url: "https://carta.com", headquarters_country: "USA", description: "Cap-table, equity, and total-compensation platform.", notes: "" },

  // Benefits Admin
  { vendor_name: "Benefitfocus", vendor_url: "https://www.benefitfocus.com", headquarters_country: "USA", description: "Benefits administration platform.", notes: "Acquired by Voya Financial in 2023; brand continues." },
  { vendor_name: "Empyrean Benefit Solutions", vendor_url: "https://www.goempyrean.com", headquarters_country: "USA", description: "Benefits administration vendor.", notes: "Owned by Securian Financial." },
  { vendor_name: "Businessolver", vendor_url: "https://www.businessolver.com", headquarters_country: "USA", description: "Benefits administration platform (Benefitsolver).", notes: "" },
  { vendor_name: "bswift", vendor_url: "https://www.bswift.com", headquarters_country: "USA", description: "Benefits administration platform.", notes: "Previously CVS Health; sold to Francisco Partners 2024." },

  // VMS vendors
  { vendor_name: "Beeline", vendor_url: "https://www.beeline.com", headquarters_country: "USA", description: "Vendor management system / contingent-workforce platform.", notes: "" },
  { vendor_name: "Magnit", vendor_url: "https://magnitglobal.com", headquarters_country: "USA", description: "Contingent workforce and integrated workforce-management platform.", notes: "Formerly PRO Unlimited; rebranded to Magnit." },
  { vendor_name: "Utmost", vendor_url: "https://www.utmost.co", headquarters_country: "USA", description: "Extended-workforce-management platform built on Workday.", notes: "" },

  // ERP-Fin vendors
  { vendor_name: "Sage Group", vendor_url: "https://www.sage.com", headquarters_country: "UK", description: "Accounting and ERP vendor (Sage Intacct, Sage X3).", notes: "" },
  { vendor_name: "Infor", vendor_url: "https://www.infor.com", headquarters_country: "USA", description: "Industry-specific ERP vendor (CloudSuite).", notes: "Owned by Koch Industries." },
  { vendor_name: "Unit4", vendor_url: "https://www.unit4.com", headquarters_country: "Netherlands", description: "ERP vendor for people-centric services organisations.", notes: "" },

  // EPM vendors
  { vendor_name: "Anaplan", vendor_url: "https://www.anaplan.com", headquarters_country: "USA", description: "Connected-planning platform.", notes: "Taken private by Thoma Bravo in 2022." },
  { vendor_name: "OneStream Software", vendor_url: "https://www.onestream.com", headquarters_country: "USA", description: "Corporate-performance-management platform.", notes: "IPO 2024." },
  { vendor_name: "Pigment", vendor_url: "https://www.pigment.com", headquarters_country: "France", description: "Business-planning and modelling platform.", notes: "" },
  { vendor_name: "Vena Solutions", vendor_url: "https://www.venasolutions.com", headquarters_country: "Canada", description: "Excel-based corporate performance management.", notes: "" },
  { vendor_name: "Planful", vendor_url: "https://planful.com", headquarters_country: "USA", description: "FP&A and EPM platform.", notes: "Formerly Host Analytics." },
  { vendor_name: "Board International", vendor_url: "https://www.board.com", headquarters_country: "Switzerland", description: "Integrated planning and analytics platform.", notes: "" },

  // Expense Mgmt
  { vendor_name: "Expensify", vendor_url: "https://www.expensify.com", headquarters_country: "USA", description: "Expense management for SMB and mid-market.", notes: "" },
  { vendor_name: "Brex", vendor_url: "https://www.brex.com", headquarters_country: "USA", description: "Corporate cards, spend, and expense management platform.", notes: "" },
  { vendor_name: "Ramp", vendor_url: "https://ramp.com", headquarters_country: "USA", description: "Corporate-card and spend-management platform.", notes: "" },
  { vendor_name: "Navan", vendor_url: "https://navan.com", headquarters_country: "USA", description: "Travel and expense platform.", notes: "Formerly TripActions; rebranded to Navan in 2023." },

  // PSA vendors
  { vendor_name: "Kantata", vendor_url: "https://www.kantata.com", headquarters_country: "USA", description: "Professional-services automation platform.", notes: "Formed from merger of Mavenlink and Kimble in 2022." },
  { vendor_name: "Certinia", vendor_url: "https://www.certinia.com", headquarters_country: "USA", description: "Professional-services and ERP on the Salesforce platform.", notes: "Formerly FinancialForce; rebranded 2023." },
  { vendor_name: "Deltek", vendor_url: "https://www.deltek.com", headquarters_country: "USA", description: "ERP and PSA vendor for project-based businesses.", notes: "" },
];

// ============================================================
// SOLUTIONS — Workday products + competitor flagships
// ============================================================
type SolutionDef = {
  solution_name: string;
  vendor: string;
  solution_type: "saas" | "on_prem" | "hybrid" | "open_source" | "internal_build" | "manual_process";
  solution_url?: string;
  description: string;
  notes?: string;
  primary?: string[];
  secondary?: string[];
  partial?: string[];
};

const solutions: SolutionDef[] = [
  // ====== Workday products ======
  { solution_name: "Workday HCM", vendor: "Workday", solution_type: "saas", solution_url: "https://www.workday.com/en-us/products/human-capital-management/overview.html", description: "Core HR / HCM cloud — worker record, org and position management, self-service.", primary: ["HCM"], secondary: ["TALENT-MGMT"] },
  { solution_name: "Workday Payroll", vendor: "Workday", solution_type: "saas", description: "Workday-native payroll for US, Canada, UK, France, and Australia plus partner payrolls.", primary: ["PAYROLL"] },
  { solution_name: "Workday Recruiting", vendor: "Workday", solution_type: "saas", description: "Native ATS embedded in Workday HCM.", primary: ["ATS"] },
  { solution_name: "Workday HiredScore", vendor: "Workday", solution_type: "saas", description: "AI talent-intelligence and recruiting orchestration overlay.", notes: "Acquired by Workday in 2024.", primary: ["ATS"], secondary: ["TALENT-MGMT"] },
  { solution_name: "Workday Learning", vendor: "Workday", solution_type: "saas", description: "Enterprise learning and content delivery.", primary: ["LMS"] },
  { solution_name: "Workday Talent Optimization", vendor: "Workday", solution_type: "saas", description: "Performance, goals, succession, and career-development workflows.", primary: ["TALENT-MGMT"] },
  { solution_name: "Workday Compensation", vendor: "Workday", solution_type: "saas", description: "Compensation planning, total rewards, and pay-equity workflows.", primary: ["COMP-MGMT"] },
  { solution_name: "Workday Benefits", vendor: "Workday", solution_type: "saas", description: "Benefits administration, enrolment, and carrier connectivity.", primary: ["BEN-ADMIN"] },
  { solution_name: "Workday Time Tracking", vendor: "Workday", solution_type: "saas", description: "Time and attendance tracking integrated with payroll.", primary: ["WFM"] },
  { solution_name: "Workday Absence Management", vendor: "Workday", solution_type: "saas", description: "Time-off, leave, and absence balance tracking.", primary: ["WFM"] },
  { solution_name: "Workday Peakon Employee Voice", vendor: "Workday", solution_type: "saas", description: "Continuous engagement listening platform.", notes: "Acquired Peakon in 2021.", primary: ["EMP-EXP"] },
  { solution_name: "Workday VNDLY", vendor: "Workday", solution_type: "saas", description: "Vendor management system / contingent workforce platform.", notes: "Acquired VNDLY in 2021.", primary: ["VMS"] },
  { solution_name: "Workday Prism Analytics", vendor: "Workday", solution_type: "saas", description: "Bring-your-own-data analytics on the Workday data fabric.", primary: ["PA"], secondary: ["ERP-FIN"] },
  { solution_name: "Workday Financial Management", vendor: "Workday", solution_type: "saas", description: "Cloud financial management / core ERP financials.", primary: ["ERP-FIN"] },
  { solution_name: "Workday Adaptive Planning", vendor: "Workday", solution_type: "saas", description: "FP&A and connected-planning platform.", notes: "Acquired Adaptive Insights in 2018.", primary: ["EPM"] },
  { solution_name: "Workday Strategic Sourcing", vendor: "Workday", solution_type: "saas", description: "Strategic sourcing and RFP platform.", notes: "Acquired Scout RFP in 2019.", primary: ["S2P"] },
  { solution_name: "Workday Spend Management", vendor: "Workday", solution_type: "saas", description: "Procurement, supplier management, and supplier accounts.", primary: ["S2P"], secondary: ["AP-AUTO", "SUP-LIFE"] },
  { solution_name: "Workday Expenses", vendor: "Workday", solution_type: "saas", description: "Native expense management embedded in Workday Financials.", primary: ["EXPENSE"] },
  { solution_name: "Workday Projects", vendor: "Workday", solution_type: "saas", description: "Professional-services automation: resource, billing, project accounting.", primary: ["PSA"] },
  { solution_name: "Workday Extend", vendor: "Workday", solution_type: "saas", description: "Low-code application platform on top of Workday's data and security model.", primary: ["LCAP"] },
  { solution_name: "Workday Journeys", vendor: "Workday", solution_type: "saas", description: "Employee-journey workflows for onboarding, transitions, and lifecycle moments.", primary: ["HRSD"] },
  { solution_name: "Workday Evisort", vendor: "Workday", solution_type: "saas", description: "AI-native contract lifecycle management.", notes: "Acquired Evisort in 2024.", primary: ["CLM"] },

  // ====== HCM competitors ======
  { solution_name: "SAP SuccessFactors", vendor: "SAP SE", solution_type: "saas", description: "Enterprise HCM suite (Employee Central plus talent modules).", primary: ["HCM"], secondary: ["TALENT-MGMT"] },
  { solution_name: "Oracle Cloud HCM", vendor: "Oracle", solution_type: "saas", description: "Enterprise HCM cloud (Fusion).", primary: ["HCM"], secondary: ["TALENT-MGMT"] },
  { solution_name: "UKG Pro", vendor: "UKG", solution_type: "saas", description: "HCM, payroll, and workforce management for mid-market and enterprise.", primary: ["HCM"], secondary: ["PAYROLL", "WFM"] },
  { solution_name: "ADP Workforce Now", vendor: "ADP", solution_type: "saas", description: "HCM and payroll for mid-market employers.", primary: ["HCM"], secondary: ["PAYROLL"] },
  { solution_name: "Dayforce", vendor: "Dayforce", solution_type: "saas", description: "Single-platform HCM, payroll, benefits, talent, and WFM.", notes: "Formerly Ceridian Dayforce.", primary: ["HCM"], secondary: ["PAYROLL", "WFM", "BEN-ADMIN"] },
  { solution_name: "BambooHR", vendor: "BambooHR", solution_type: "saas", description: "HRIS for small and mid-sized businesses.", primary: ["HCM"] },
  { solution_name: "HiBob", vendor: "HiBob", solution_type: "saas", description: "Modern HRIS (\"bob\") for mid-market multinationals.", primary: ["HCM"] },
  { solution_name: "Rippling", vendor: "Rippling", solution_type: "saas", description: "Unified HR, IT, and finance platform.", primary: ["HCM"], secondary: ["PAYROLL"] },
  { solution_name: "Personio", vendor: "Personio", solution_type: "saas", description: "European HR platform for SMB.", primary: ["HCM"] },
  { solution_name: "Paylocity", vendor: "Paylocity", solution_type: "saas", description: "Cloud HR and payroll for mid-market.", primary: ["HCM"], secondary: ["PAYROLL"] },

  // ====== Payroll competitors ======
  { solution_name: "ADP GlobalView Payroll", vendor: "ADP", solution_type: "saas", description: "Global payroll for large multi-country enterprises.", primary: ["PAYROLL"] },
  { solution_name: "Paychex Flex", vendor: "Paychex", solution_type: "saas", description: "Payroll and HR services for small and mid-market.", primary: ["PAYROLL"], secondary: ["HCM"] },
  { solution_name: "Gusto", vendor: "Gusto", solution_type: "saas", description: "Payroll, benefits, and HR for small businesses.", primary: ["PAYROLL"], secondary: ["HCM", "BEN-ADMIN"] },
  { solution_name: "CloudPay", vendor: "CloudPay", solution_type: "saas", description: "Managed global payroll service.", primary: ["PAYROLL"] },
  { solution_name: "Papaya Global", vendor: "Papaya Global", solution_type: "saas", description: "Global payroll and workforce payments.", primary: ["PAYROLL"] },
  { solution_name: "SAP SuccessFactors Employee Central Payroll", vendor: "SAP SE", solution_type: "saas", description: "Cloud payroll built on the on-prem SAP Payroll engine.", primary: ["PAYROLL"] },

  // ====== ATS competitors ======
  { solution_name: "Greenhouse Recruiting", vendor: "Greenhouse Software", solution_type: "saas", description: "Structured-hiring recruiting platform.", primary: ["ATS"] },
  { solution_name: "Lever", vendor: "Lever", solution_type: "saas", description: "ATS and talent-relationship-management platform.", primary: ["ATS"] },
  { solution_name: "iCIMS Talent Cloud", vendor: "iCIMS", solution_type: "saas", description: "Enterprise talent-acquisition platform.", primary: ["ATS"] },
  { solution_name: "SmartRecruiters", vendor: "SmartRecruiters", solution_type: "saas", description: "Talent-acquisition platform.", primary: ["ATS"] },
  { solution_name: "Ashby", vendor: "Ashby", solution_type: "saas", description: "Modern ATS with native analytics.", primary: ["ATS"] },
  { solution_name: "Eightfold Talent Intelligence Platform", vendor: "Eightfold AI", solution_type: "saas", description: "AI talent-intelligence platform for hiring and internal mobility.", primary: ["ATS"], secondary: ["TALENT-MGMT"] },
  { solution_name: "Phenom Intelligent Talent Experience", vendor: "Phenom", solution_type: "saas", description: "AI-driven candidate-experience and recruiting platform.", primary: ["ATS"] },
  { solution_name: "SAP SuccessFactors Recruiting", vendor: "SAP SE", solution_type: "saas", description: "Recruiting module of the SuccessFactors HCM suite.", primary: ["ATS"] },

  // ====== LMS competitors ======
  { solution_name: "Cornerstone Learning", vendor: "Cornerstone OnDemand", solution_type: "saas", description: "Enterprise learning management.", primary: ["LMS"] },
  { solution_name: "Docebo Learning Platform", vendor: "Docebo", solution_type: "saas", description: "AI-powered enterprise learning platform.", primary: ["LMS"] },
  { solution_name: "360Learning", vendor: "360Learning", solution_type: "saas", description: "Collaborative learning platform.", primary: ["LMS"] },
  { solution_name: "Absorb LMS", vendor: "Absorb LMS", solution_type: "saas", description: "Cloud learning management.", primary: ["LMS"] },
  { solution_name: "TalentLMS", vendor: "Epignosis", solution_type: "saas", description: "Cloud learning platform for SMBs.", primary: ["LMS"] },
  { solution_name: "SAP SuccessFactors Learning", vendor: "SAP SE", solution_type: "saas", description: "Enterprise learning module of SuccessFactors.", primary: ["LMS"] },

  // ====== Talent Mgmt competitors ======
  { solution_name: "Lattice", vendor: "Lattice", solution_type: "saas", description: "Performance, goals, growth, and engagement platform.", primary: ["TALENT-MGMT"], secondary: ["EMP-EXP"] },
  { solution_name: "15Five", vendor: "15Five", solution_type: "saas", description: "Continuous performance and engagement platform.", primary: ["TALENT-MGMT"], secondary: ["EMP-EXP"] },
  { solution_name: "Betterworks", vendor: "Betterworks", solution_type: "saas", description: "Performance management and OKR platform.", primary: ["TALENT-MGMT"] },
  { solution_name: "Cornerstone Performance", vendor: "Cornerstone OnDemand", solution_type: "saas", description: "Performance and succession management.", primary: ["TALENT-MGMT"] },
  { solution_name: "SAP SuccessFactors Performance and Goals", vendor: "SAP SE", solution_type: "saas", description: "Performance, goals, and 360 feedback module.", primary: ["TALENT-MGMT"] },

  // ====== Engagement / EMP-EXP competitors ======
  { solution_name: "Culture Amp", vendor: "Culture Amp", solution_type: "saas", description: "Employee-experience, engagement, and performance platform.", primary: ["EMP-EXP"], secondary: ["TALENT-MGMT"] },
  { solution_name: "Glint", vendor: "LinkedIn", solution_type: "saas", description: "Engagement and people-success platform.", notes: "Acquired by LinkedIn (Microsoft) in 2018.", primary: ["EMP-EXP"] },
  { solution_name: "Qualtrics EmployeeXM", vendor: "Qualtrics", solution_type: "saas", description: "Employee-experience-management platform.", primary: ["EMP-EXP"] },

  // ====== People Analytics ======
  { solution_name: "Visier People", vendor: "Visier", solution_type: "saas", description: "People-analytics and workforce-intelligence platform.", primary: ["PA"] },
  { solution_name: "Crunchr", vendor: "Crunchr", solution_type: "saas", description: "Enterprise people-analytics platform.", primary: ["PA"] },
  { solution_name: "ChartHop", vendor: "ChartHop", solution_type: "saas", description: "People-analytics and org-planning platform.", primary: ["PA"] },
  { solution_name: "OneModel", vendor: "OneModel", solution_type: "saas", description: "People-analytics platform with bring-your-own-data modelling.", primary: ["PA"] },

  // ====== WFM competitors ======
  { solution_name: "UKG Dimensions", vendor: "UKG", solution_type: "saas", description: "Cloud workforce-management platform.", primary: ["WFM"] },
  { solution_name: "Quinyx", vendor: "Quinyx", solution_type: "saas", description: "AI-driven workforce-management for frontline.", primary: ["WFM"] },
  { solution_name: "Replicon", vendor: "Replicon", solution_type: "saas", description: "Time tracking and workforce management.", primary: ["WFM"], secondary: ["PSA"] },
  { solution_name: "Deputy", vendor: "Deputy", solution_type: "saas", description: "Shift scheduling and workforce management.", primary: ["WFM"] },
  { solution_name: "WorkJam", vendor: "WorkJam", solution_type: "saas", description: "Frontline digital workplace, communications, and WFM.", primary: ["WFM"], secondary: ["RET-STORE"] },
  { solution_name: "When I Work", vendor: "When I Work", solution_type: "saas", description: "Employee scheduling and time clock for SMBs.", primary: ["WFM"] },

  // ====== Compensation Mgmt ======
  { solution_name: "Payscale Marketpay", vendor: "Payscale", solution_type: "saas", description: "Compensation benchmarking and planning.", primary: ["COMP-MGMT"] },
  { solution_name: "beqom", vendor: "beqom", solution_type: "saas", description: "Total compensation, pay equity, and sales-performance.", primary: ["COMP-MGMT"] },
  { solution_name: "Pave", vendor: "Pave", solution_type: "saas", description: "Compensation planning, bands, and benchmarking.", primary: ["COMP-MGMT"] },
  { solution_name: "Carta Total Comp", vendor: "Carta", solution_type: "saas", description: "Total-compensation and equity management.", primary: ["COMP-MGMT"] },
  { solution_name: "SAP SuccessFactors Compensation", vendor: "SAP SE", solution_type: "saas", description: "Compensation-planning module of SuccessFactors.", primary: ["COMP-MGMT"] },

  // ====== Benefits Admin ======
  { solution_name: "Benefitfocus", vendor: "Benefitfocus", solution_type: "saas", description: "Benefits administration and engagement platform.", primary: ["BEN-ADMIN"] },
  { solution_name: "Empyrean Benefits", vendor: "Empyrean Benefit Solutions", solution_type: "saas", description: "Benefits administration for large employers.", primary: ["BEN-ADMIN"] },
  { solution_name: "Businessolver Benefitsolver", vendor: "Businessolver", solution_type: "saas", description: "Benefits administration platform.", primary: ["BEN-ADMIN"] },
  { solution_name: "bswift", vendor: "bswift", solution_type: "saas", description: "Benefits administration and enrolment platform.", primary: ["BEN-ADMIN"] },

  // ====== VMS competitors ======
  { solution_name: "SAP Fieldglass", vendor: "SAP SE", solution_type: "saas", description: "Vendor management system / external talent management.", primary: ["VMS"] },
  { solution_name: "Beeline", vendor: "Beeline", solution_type: "saas", description: "Vendor management system for contingent labour.", primary: ["VMS"] },
  { solution_name: "Magnit", vendor: "Magnit", solution_type: "saas", description: "Integrated workforce-management and VMS platform.", primary: ["VMS"] },
  { solution_name: "Utmost", vendor: "Utmost", solution_type: "saas", description: "Extended-workforce platform built on Workday.", primary: ["VMS"] },

  // ====== ERP-Fin competitors ======
  { solution_name: "SAP S/4HANA", vendor: "SAP SE", solution_type: "hybrid", description: "Enterprise ERP and financials platform.", primary: ["ERP-FIN"] },
  { solution_name: "Oracle Fusion Cloud ERP", vendor: "Oracle", solution_type: "saas", description: "Cloud ERP financials platform.", primary: ["ERP-FIN"], secondary: ["EPM"] },
  { solution_name: "Oracle NetSuite", vendor: "Oracle", solution_type: "saas", description: "Cloud ERP for mid-market.", primary: ["ERP-FIN"] },
  { solution_name: "Microsoft Dynamics 365 Finance", vendor: "Microsoft", solution_type: "saas", description: "Cloud ERP financials.", primary: ["ERP-FIN"] },
  { solution_name: "Sage Intacct", vendor: "Sage Group", solution_type: "saas", description: "Cloud financial management for services and SaaS firms.", primary: ["ERP-FIN"] },
  { solution_name: "Infor CloudSuite Financials", vendor: "Infor", solution_type: "saas", description: "Industry-vertical ERP financials.", primary: ["ERP-FIN"] },
  { solution_name: "Unit4 ERP", vendor: "Unit4", solution_type: "saas", description: "ERP for people-centric services organisations.", primary: ["ERP-FIN"], secondary: ["PSA"] },

  // ====== EPM competitors ======
  { solution_name: "Anaplan", vendor: "Anaplan", solution_type: "saas", description: "Connected planning platform spanning finance, sales, supply chain, and HR.", primary: ["EPM"] },
  { solution_name: "OneStream", vendor: "OneStream Software", solution_type: "saas", description: "Unified corporate-performance-management platform.", primary: ["EPM"] },
  { solution_name: "Pigment", vendor: "Pigment", solution_type: "saas", description: "Modern business-planning platform.", primary: ["EPM"] },
  { solution_name: "Oracle EPM Cloud", vendor: "Oracle", solution_type: "saas", description: "Cloud EPM suite (Planning, FCC, ARCS, EPRCS).", primary: ["EPM"] },
  { solution_name: "Vena", vendor: "Vena Solutions", solution_type: "saas", description: "Excel-native FP&A platform.", primary: ["EPM"] },
  { solution_name: "Planful", vendor: "Planful", solution_type: "saas", description: "FP&A and continuous-planning platform.", primary: ["EPM"] },
  { solution_name: "Board", vendor: "Board International", solution_type: "saas", description: "Integrated planning, BI, and analytics platform.", primary: ["EPM"] },
  { solution_name: "SAP Analytics Cloud Planning", vendor: "SAP SE", solution_type: "saas", description: "Planning and analytics module of SAP Analytics Cloud.", primary: ["EPM"] },

  // ====== Expense Mgmt ======
  { solution_name: "SAP Concur", vendor: "SAP SE", solution_type: "saas", description: "Travel, expense, and invoice management.", primary: ["EXPENSE"], secondary: ["AP-AUTO"] },
  { solution_name: "Expensify", vendor: "Expensify", solution_type: "saas", description: "Expense management and corporate cards.", primary: ["EXPENSE"] },
  { solution_name: "Brex", vendor: "Brex", solution_type: "saas", description: "Corporate cards plus integrated expense and spend management.", primary: ["EXPENSE"] },
  { solution_name: "Ramp", vendor: "Ramp", solution_type: "saas", description: "Corporate cards and spend management.", primary: ["EXPENSE"] },
  { solution_name: "Navan", vendor: "Navan", solution_type: "saas", description: "Travel and expense management.", primary: ["EXPENSE"] },

  // ====== PSA competitors ======
  { solution_name: "Kantata", vendor: "Kantata", solution_type: "saas", description: "Professional-services automation platform.", primary: ["PSA"] },
  { solution_name: "Certinia PS Cloud", vendor: "Certinia", solution_type: "saas", description: "PSA built on the Salesforce platform.", primary: ["PSA"] },
  { solution_name: "Deltek Vantagepoint", vendor: "Deltek", solution_type: "saas", description: "ERP and PSA for project-based services firms.", primary: ["PSA"], secondary: ["ERP-FIN"] },
  { solution_name: "Replicon PSA", vendor: "Replicon", solution_type: "saas", description: "PSA module of the Replicon time platform.", primary: ["PSA"] },
];

// ============================================================
// RUN
// ============================================================
async function main() {
  console.log("\n=== Domains ===");
  const domainMap = await syncTable(
    "/domains",
    newDomains.map(d => ({ ...d })),
    "domain_code",
  );

  console.log("\n=== Capabilities ===");
  const capRows = capabilities.map(c => {
    const domainId = domainMap.get(c.domain);
    if (!domainId) throw new Error(`Domain ${c.domain} not found for capability ${c.capability_code}`);
    return {
      capability_code: c.capability_code,
      capability_name: c.capability_name,
      description: c.description,
    };
  });
  const capMap = await syncTable("/capabilities", capRows, "capability_code");

  console.log("\n=== capability_domains junctions ===");
  const existingCapDomLinks = await get("/capability_domains?select=capability_id,domain_id&limit=10000");
  const existingCapDomSet = new Set(existingCapDomLinks.map(r => `${r.capability_id}:${r.domain_id}`));
  const newCapDomRows: Row[] = [];
  for (const c of capabilities) {
    const cid = capMap.get(c.capability_code)!;
    const did = domainMap.get(c.domain)!;
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
  const vendorMap = await syncTable(
    "/vendors",
    vendors.map(v => ({ ...v })),
    "vendor_name",
  );

  console.log("\n=== Solutions ===");
  // Need a full domain map (including pre-existing domains the script references in primary/secondary)
  const fullDomainsRaw = await get("/domains?select=id,domain_code&limit=10000");
  const fullDomainMap = new Map<string, number>();
  for (const d of fullDomainsRaw) fullDomainMap.set(String(d.domain_code), Number(d.id));

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
      notes: s.notes ?? "",
    };
  });
  const solutionMap = await syncTable("/solutions", solutionRows, "solution_name");

  console.log("\n=== solution_domains junctions ===");
  const existingLinks = await get("/solution_domains?select=solution_id,domain_id,coverage_level&limit=10000");
  const existingLinkSet = new Set(existingLinks.map(r => `${r.solution_id}:${r.domain_id}:${r.coverage_level}`));
  const newLinks: Row[] = [];
  let skipped = 0;
  for (const s of solutions) {
    const sid = solutionMap.get(s.solution_name);
    if (!sid) throw new Error(`Solution id missing for ${s.solution_name}`);
    const buildLink = (code: string, coverage: "primary" | "secondary" | "partial") => {
      const did = fullDomainMap.get(code);
      if (!did) { console.warn(`  ! domain ${code} not found for ${s.solution_name}`); return; }
      const key = `${sid}:${did}:${coverage}`;
      if (existingLinkSet.has(key)) { skipped++; return; }
      existingLinkSet.add(key);
      newLinks.push({ solution_id: sid, domain_id: did, coverage_level: coverage, notes: "" });
    };
    for (const code of s.primary ?? []) buildLink(code, "primary");
    for (const code of s.secondary ?? []) buildLink(code, "secondary");
    for (const code of s.partial ?? []) buildLink(code, "partial");
  }
  if (newLinks.length > 0) {
    console.log(`  inserting ${newLinks.length} new solution_domains rows (${skipped} already present)`);
    await insert("/solution_domains", newLinks);
  } else {
    console.log(`  no new solution_domains rows (${skipped} already present)`);
  }

  // ===== Final counts =====
  const counts = {
    domains: (await get("/domains?select=id&limit=10000")).length,
    capabilities: (await get("/capabilities?select=id&limit=10000")).length,
    capability_domains: (await get("/capability_domains?select=capability_id&limit=10000")).length,
    vendors: (await get("/vendors?select=id&limit=10000")).length,
    solutions: (await get("/solutions?select=id&limit=10000")).length,
    solution_domains: (await get("/solution_domains?select=solution_id&limit=10000")).length,
  };
  console.log("\n=== Final counts ===");
  console.log(JSON.stringify(counts, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
