#!/usr/bin/env bun
// HR cluster Phase B: data_objects + domain_data_objects + cross_domain_handoffs
// for PAYROLL (55), BEN-ADMIN (61), COMP-MGMT (60), WFM (59), LMS (57),
// TALENT-MGMT (58), EMP-EXP (62), VMS (64), HRSD (22).
// All record_status defaults to "new".
// Idempotent: natural-key guarded.

import { $ } from "bun";
$.throws(false);

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
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

// Domain IDs
const HCM = 54, PAYROLL = 55, ATS = 56, LMS = 57, TALENT = 58, WFM = 59,
      COMP = 60, BEN = 61, EMPEXP = 62, PA = 63, VMS = 64,
      ERPFIN = 65, EPM = 66, EXPENSE = 67, PSA = 68,
      ONBOARDING = 99, SWP = 100, HRSD = 22, IGA = 35, ITSM = 1, ITAM = 3, SMP = 85,
      CLM = 26, S2P = 27, SUP_LIFE = 28, AP_AUTO = 29;

const dataObjects = [
  // PAYROLL (8)
  { data_object_name: "pay_runs", singular_label: "Pay Run", plural_label: "Pay Runs", display_label: "Pay Run", description: "A single payroll cycle execution, scoped to pay group, country, and pay period. Drives gross-to-net calculation across the eligible employee population and produces pay_slips, payroll_journal_entries, and tax_filings. The atomic unit of payroll operations." },
  { data_object_name: "pay_slips", singular_label: "Pay Slip", plural_label: "Pay Slips", display_label: "Pay Slip", description: "Per-employee per-cycle gross-to-net statement: earnings, pre/post-tax deductions, employer contributions, tax withholdings, net pay, YTD totals. Called Pay Stub (US), Payslip (UK/AU/IE), Bulletin de Paie (FR), Lohnzettel (DE), Holerite (BR). Worker-portal accessible; legally retained per jurisdiction." },
  { data_object_name: "earning_codes", singular_label: "Earning Code", plural_label: "Earning Codes", display_label: "Earning Code", description: "Configurable definition of an earning type (regular, overtime, bonus, commission, severance, retro-pay) with tax treatment, GL mapping, accumulator rules, and country localisation. Foundation of the payroll calculation engine." },
  { data_object_name: "deduction_codes", singular_label: "Deduction Code", plural_label: "Deduction Codes", display_label: "Deduction Code", description: "Configurable definition of a deduction (pre-tax 401k, post-tax Roth, medical premium, HSA, garnishment, union dues) with priority, ceiling, and GL mapping. Drives net-pay arithmetic and benefits-payroll integration." },
  { data_object_name: "tax_authorities", singular_label: "Tax Authority", plural_label: "Tax Authorities", display_label: "Tax Authority", description: "Federal, state, provincial, or local taxing jurisdiction with rate tables, deposit schedules, and reporting forms. Includes US IRS/state/locals, UK HMRC, German Finanzamt, French URSSAF, Australian ATO." },
  { data_object_name: "tax_filings", singular_label: "Tax Filing", plural_label: "Tax Filings", display_label: "Tax Filing", description: "Periodic statutory submission to a tax authority (US 941/W-2, UK FPS/EPS, German DEUEV/Lohnsteueranmeldung, French DSN, Australian STP). Includes payment and reporting; failure carries penalties." },
  { data_object_name: "garnishment_orders", singular_label: "Garnishment Order", plural_label: "Garnishment Orders", display_label: "Garnishment Order", description: "Court-ordered or agency-issued instruction to withhold from an employee's wages (child support, tax levy, bankruptcy, student loan, creditor). Carries priority, ceiling, remit-to instructions, and lifecycle (active, released, exhausted)." },
  { data_object_name: "payroll_journal_entries", singular_label: "Payroll Journal Entry", plural_label: "Payroll Journal Entries", display_label: "Payroll Journal Entry", description: "GL posting produced by a pay_run, decomposed by cost_center / department / earning_code / deduction_code into debit and credit lines. The payroll-to-finance handoff payload." },

  // BEN-ADMIN (7)
  { data_object_name: "benefit_plans", singular_label: "Benefit Plan", plural_label: "Benefit Plans", display_label: "Benefit Plan", description: "Configurable employer-sponsored benefit offering: medical, dental, vision, life, disability, 401(k), HSA/FSA, voluntary. Carries eligibility rules, contribution structure, plan year, carrier and coverage tiers." },
  { data_object_name: "benefit_enrollments", singular_label: "Benefit Enrollment", plural_label: "Benefit Enrollments", display_label: "Benefit Enrollment", description: "Per-employee per-plan elected coverage record with effective dates, covered dependents, contribution amounts, and beneficiary designations. The source of truth for deduction calculation in payroll." },
  { data_object_name: "benefit_dependents", singular_label: "Benefit Dependent", plural_label: "Benefit Dependents", display_label: "Benefit Dependent", description: "Person covered under an employee's benefit plan (spouse, domestic partner, child, disabled adult). Carries relationship, DOB, SSN, dependent-eligibility documents." },
  { data_object_name: "life_events", singular_label: "Life Event", plural_label: "Life Events", display_label: "Life Event", description: "Qualifying event (marriage, birth, adoption, divorce, dependent loss-of-coverage, employment change) that opens a mid-year enrollment window. Triggers benefit_enrollments changes outside open enrollment." },
  { data_object_name: "benefit_open_enrollments", singular_label: "Open Enrollment Window", plural_label: "Open Enrollment Windows", display_label: "Open Enrollment Window", description: "Annual employer-defined window during which employees may elect or change benefit_plans for the next plan year. Drives mass campaign communications, decision-support tooling, and a synchronous load on the carrier_feeds layer at close." },
  { data_object_name: "benefit_carriers", singular_label: "Benefit Carrier", plural_label: "Benefit Carriers", display_label: "Benefit Carrier", description: "Insurance provider, 401(k) recordkeeper, or COBRA administrator that fulfils a benefit_plan. Drives the carrier_feeds integration." },
  { data_object_name: "carrier_feeds", singular_label: "Carrier Feed", plural_label: "Carrier Feeds", display_label: "Carrier Feed", description: "Outbound integration to a benefit_carrier (EDI 834 enrolment, 820 remittance, custom API, file_drop). Mostly weekly batch; failures cause coverage discrepancies between HR system of record and carrier of record." },

  // COMP-MGMT (7)
  { data_object_name: "compensation_plans", singular_label: "Compensation Plan", plural_label: "Compensation Plans", display_label: "Compensation Plan", description: "Total-rewards package definition per role, level, location: base structure, bonus target, equity guideline, allowances. Distinct from sales-incentive plans (those live in Sales Performance Management)." },
  { data_object_name: "salary_bands", singular_label: "Salary Band", plural_label: "Salary Bands", display_label: "Salary Band", description: "Pay-range structure by grade and geographic zone with minimum, midpoint, maximum, and benchmarking source. Drives offer guidance, merit eligibility, and pay-equity gap analysis." },
  { data_object_name: "merit_cycles", singular_label: "Merit Cycle", plural_label: "Merit Cycles", display_label: "Merit Cycle", description: "Periodic compensation review cycle (annual, semi-annual, focal): budget pool, eligibility, calibration step, approval chain, effective date. The recurring operating model of comp management." },
  { data_object_name: "merit_recommendations", singular_label: "Merit Recommendation", plural_label: "Merit Recommendations", display_label: "Merit Recommendation", description: "Per-employee per-cycle proposed merit increase, bonus, and equity refresh from manager, with calibration adjustments and final approval. Approved values become the pay-rate change posted to payroll." },
  { data_object_name: "compensation_statements", singular_label: "Compensation Statement", plural_label: "Compensation Statements", display_label: "Compensation Statement", description: "Personalised total-rewards letter delivered to a worker showing the value of base, bonus, equity, benefits, and perks. Generated on hire, merit cycle close, and annually." },
  { data_object_name: "equity_grants", singular_label: "Equity Grant", plural_label: "Equity Grants", display_label: "Equity Grant", description: "RSU, option, or PSU award tied to a vesting schedule. Carries grant date, type, share count, strike (if option), vesting cadence, performance metrics, and forfeiture rules. Integrates with equity-administration platforms (Carta, Shareworks)." },
  { data_object_name: "compensation_benchmarks", singular_label: "Compensation Benchmark", plural_label: "Compensation Benchmarks", display_label: "Compensation Benchmark", description: "Imported market salary data for a job-level-geography combination, sourced from a survey provider (Radford, Mercer, Willis Towers Watson, Payscale). Drives salary_bands maintenance." },

  // WFM (7)
  { data_object_name: "work_schedules", singular_label: "Work Schedule", plural_label: "Work Schedules", display_label: "Work Schedule", description: "Published shift schedule for a department / location / week, derived from labour-demand forecasts and worker-availability constraints. The product of a scheduling-optimisation run." },
  { data_object_name: "shifts", singular_label: "Shift", plural_label: "Shifts", display_label: "Shift", description: "A scheduled work block assigned to a worker: start, end, position, location, break plan, premium pay flags. The atomic scheduling unit." },
  { data_object_name: "time_entries", singular_label: "Time Entry", plural_label: "Time Entries", display_label: "Time Entry", description: "Recorded clock-in / clock-out / break event from a time-collection device, mobile app, or manual entry. Approved time entries are the WFM↔PAYROLL handoff payload." },
  { data_object_name: "absence_requests", singular_label: "Absence Request", plural_label: "Absence Requests", display_label: "Absence Request", description: "Worker-initiated request for time away: PTO, sick, parental, bereavement, jury duty, FMLA. Carries policy, eligibility check, approval chain, and accrual deduction. Called Leave Request (UK), Vacation Request (US), PTO Request." },
  { data_object_name: "absence_balances", singular_label: "Absence Balance", plural_label: "Absence Balances", display_label: "Absence Balance", description: "Per-worker per-leave-type running balance: accrued, taken, scheduled, available. Calculated against time_off_policies and reset per accrual cycle." },
  { data_object_name: "time_off_policies", singular_label: "Time-Off Policy", plural_label: "Time-Off Policies", display_label: "Time-Off Policy", description: "Accrual / entitlement rule definition for a leave type: by country, role, tenure tier, with caps, carry-over, and conversion rules. Country-specific by statute (US PTO, UK statutory leave, German Urlaub, French Congés Payés)." },
  { data_object_name: "meal_break_records", singular_label: "Meal Break Record", plural_label: "Meal Break Records", display_label: "Meal Break Record", description: "Recorded meal and rest-break event evidencing compliance with labour-law break requirements (US state mandates, EU Working Time Directive). Carries waiver attestation where applicable." },

  // LMS (7)
  { data_object_name: "courses", singular_label: "Course", plural_label: "Courses", display_label: "Course", description: "Atomic learning unit: e-learning module, video, live session, blended programme, external content. Carries content reference, duration, format, language, prerequisites, certification award." },
  { data_object_name: "learning_paths", singular_label: "Learning Path", plural_label: "Learning Paths", display_label: "Learning Path", description: "Curated sequence of courses targeting a role, skill, or certification. Drives ordered enrolment and progress tracking across multiple courses." },
  { data_object_name: "course_enrollments", singular_label: "Course Enrollment", plural_label: "Course Enrollments", display_label: "Course Enrollment", description: "Per-learner per-course state record: assigned date, due date, attempts, status (not_started, in_progress, completed, expired), score. The operational unit of learning tracking." },
  { data_object_name: "learning_records", singular_label: "Learning Record", plural_label: "Learning Records", display_label: "Learning Record", description: "Granular completion event for a course or activity, often xAPI / SCORM / cmi5 statement: actor, verb, object, result, timestamp. Feeds skill_profiles and certifications." },
  { data_object_name: "certifications", singular_label: "Certification", plural_label: "Certifications", display_label: "Certification", description: "Issued credential against a worker (internal certification, vendor cert, regulatory cert) with issue date, expiry, issuing body, and renewal rules. Drives recertification campaigns." },
  { data_object_name: "skill_profiles", singular_label: "Skill Profile", plural_label: "Skill Profiles", display_label: "Skill Profile", description: "Per-worker collection of skills with self-assessed and validated proficiency levels, derived from completed courses, certifications, performance signals, and inferred peer-comparison. The Workday Skills Cloud central artifact and equivalents (SuccessFactors Skills, Cornerstone Capabilities, Eightfold Talent DNA)." },
  { data_object_name: "compliance_assignments", singular_label: "Compliance Training Assignment", plural_label: "Compliance Training Assignments", display_label: "Compliance Training Assignment", description: "Mandatory training assignment tied to a regulation, role, location, or hire-event (anti-harassment, AML, GDPR, OSHA, HIPAA). Carries due date, escalation policy, audit log." },

  // TALENT-MGMT (7)
  { data_object_name: "performance_reviews", singular_label: "Performance Review", plural_label: "Performance Reviews", display_label: "Performance Review", description: "Per-cycle per-worker review artifact: self-assessment, manager assessment, ratings, narrative, calibration outcome. Drives merit_recommendations and succession_plans." },
  { data_object_name: "performance_goals", singular_label: "Performance Goal", plural_label: "Performance Goals", display_label: "Performance Goal", description: "Individual goal or OKR with owner, period, metric, weight, status, alignment to organisational objectives. Reviewed within performance_reviews cycles." },
  { data_object_name: "succession_plans", singular_label: "Succession Plan", plural_label: "Succession Plans", display_label: "Succession Plan", description: "Bench plan for a critical position: identified successors, readiness ratings (ready_now, 1-2_years, 3+_years), development plans, risk-of-loss assessment." },
  { data_object_name: "talent_calibrations", singular_label: "Talent Calibration", plural_label: "Talent Calibrations", display_label: "Talent Calibration", description: "Group session where managers normalise ratings across populations to remove rater bias and fit forced-distribution constraints. Produces calibrated performance_reviews outcomes." },
  { data_object_name: "nine_box_placements", singular_label: "Nine-Box Placement", plural_label: "Nine-Box Placements", display_label: "Nine-Box Placement", description: "Performance × Potential 3x3 grid placement per worker per cycle. Drives succession_plans, high-potential identification, and differentiated investment." },
  { data_object_name: "career_aspirations", singular_label: "Career Aspiration", plural_label: "Career Aspirations", display_label: "Career Aspiration", description: "Worker-declared career interest: target roles, mobility preferences (geographic, functional), aspired timeline. Drives internal-mobility matching." },
  { data_object_name: "feedback_records", singular_label: "Feedback Record", plural_label: "Feedback Records", display_label: "Feedback Record", description: "Continuous-feedback artifact: kudos, 1-on-1 notes, requested feedback, peer comments. Independent of formal cycle structure; aggregated into performance_reviews summaries." },

  // EMP-EXP (5)
  { data_object_name: "survey_campaigns", singular_label: "Survey Campaign", plural_label: "Survey Campaigns", display_label: "Survey Campaign", description: "Listening cadence definition: annual engagement, pulse, lifecycle (onboarding, 30/60/90-day, exit), 360-feedback. Carries audience, question set, frequency, anonymity floor." },
  { data_object_name: "survey_responses", singular_label: "Survey Response", plural_label: "Survey Responses", display_label: "Survey Response", description: "Individual employee response to a survey_campaign instance. Aggregated under anonymity thresholds to engagement_drivers; never exposed at individual level to managers below floor." },
  { data_object_name: "engagement_drivers", singular_label: "Engagement Driver", plural_label: "Engagement Drivers", display_label: "Engagement Driver", description: "Calculated driver score (e.g. Strategy, Growth, Recognition, Wellbeing, Leadership) at a team/department/segment grain. The action layer of engagement listening." },
  { data_object_name: "action_plans", singular_label: "Engagement Action Plan", plural_label: "Engagement Action Plans", display_label: "Engagement Action Plan", description: "Team or manager action commitment in response to engagement_drivers result. Tracked to closure; recurring failure to act is itself an engagement signal." },
  { data_object_name: "pulse_questions", singular_label: "Pulse Question Library", plural_label: "Pulse Question Libraries", display_label: "Pulse Question Library", description: "Bank of survey items rotated through pulse cadence with research-backed driver mapping, anti-fatigue rotation, and benchmarking." },

  // VMS (6)
  { data_object_name: "contingent_workers", singular_label: "Contingent Worker", plural_label: "Contingent Workers", display_label: "Contingent Worker", description: "Non-employee resource: 1099 contractor, agency staff, statement-of-work consultant, intern. Carries supplier, role, rate, end date, classification basis. Distinct from employees by lifecycle, payment path, and benefits eligibility." },
  { data_object_name: "work_orders", singular_label: "Work Order", plural_label: "Work Orders", display_label: "Work Order", description: "Staff-augmentation or statement-of-work requisition: scope, role, rate range, duration, location, hiring manager, supplier-tier rules. Drives supplier distribution and candidate submission." },
  { data_object_name: "staffing_suppliers", singular_label: "Staffing Supplier", plural_label: "Staffing Suppliers", display_label: "Staffing Supplier", description: "Agency or managed-service provider relationship with tiered preference, performance scorecard, master service agreement, and certified-recruiter roster." },
  { data_object_name: "rate_cards", singular_label: "Rate Card", plural_label: "Rate Cards", display_label: "Rate Card", description: "Pre-agreed bill rate by role, geography, and supplier tier. Drives consistent work_order pricing and AP-side three-way match." },
  { data_object_name: "contingent_timesheets", singular_label: "Contingent Timesheet", plural_label: "Contingent Timesheets", display_label: "Contingent Timesheet", description: "Hours-worked timesheet from a contingent_worker against a work_order: approved hours, expenses, project codes. Feeds contingent_invoices for supplier billing." },
  { data_object_name: "contingent_invoices", singular_label: "Contingent Invoice", plural_label: "Contingent Invoices", display_label: "Contingent Invoice", description: "Supplier-issued invoice for contingent labour, computed from contingent_timesheets × rate_cards. Routed through AP-AUTO for three-way match and payment." },

  // HRSD (2 new + reuse knowledge_articles)
  { data_object_name: "hr_cases", singular_label: "HR Case", plural_label: "HR Cases", display_label: "HR Case", description: "Employee inquiry or service request routed to HR Operations (pay question, benefits change, policy clarification, leave request, complaint). The HRSD analogue of ITSM service_requests, scoped to HR-owned workflows." },
  { data_object_name: "case_categories", singular_label: "HR Case Category", plural_label: "HR Case Categories", display_label: "HR Case Category", description: "Taxonomy of HR ask types (Pay, Benefits, Leave, Policy, Time, Compensation, Performance, Employee Relations, Compliance). Drives routing, SLA, knowledge-article lookup, and trend analytics." },
];

type DomDoSpec = {
  domain_id: number;
  data_object_name: string;
  role: "master" | "contributor" | "consumer" | "derived";
  notes: string;
};

const domainDataObjects: DomDoSpec[] = [
  // PAYROLL masters
  { domain_id: PAYROLL, data_object_name: "pay_runs", role: "master", notes: "" },
  { domain_id: PAYROLL, data_object_name: "pay_slips", role: "master", notes: "" },
  { domain_id: PAYROLL, data_object_name: "earning_codes", role: "master", notes: "" },
  { domain_id: PAYROLL, data_object_name: "deduction_codes", role: "master", notes: "" },
  { domain_id: PAYROLL, data_object_name: "tax_authorities", role: "master", notes: "" },
  { domain_id: PAYROLL, data_object_name: "tax_filings", role: "master", notes: "" },
  { domain_id: PAYROLL, data_object_name: "garnishment_orders", role: "master", notes: "" },
  { domain_id: PAYROLL, data_object_name: "payroll_journal_entries", role: "master", notes: "" },
  // PAYROLL contributors/consumers cross-cluster
  { domain_id: BEN, data_object_name: "deduction_codes", role: "contributor", notes: "BEN-ADMIN defines the benefit deduction codes that PAYROLL operationalises in gross-to-net calculation." },
  { domain_id: COMP, data_object_name: "earning_codes", role: "contributor", notes: "COMP-MGMT defines compensation-driven earning codes (bonus, equity vest, allowance) that PAYROLL operationalises." },
  { domain_id: ERPFIN, data_object_name: "payroll_journal_entries", role: "consumer", notes: "ERP-FIN consumes payroll_journal_entries from pay_runs to post personnel cost to the GL." },
  { domain_id: PA, data_object_name: "pay_slips", role: "consumer", notes: "Pay-equity analytics and total-rewards reporting derive from aggregated pay_slip data." },

  // BEN-ADMIN masters
  { domain_id: BEN, data_object_name: "benefit_plans", role: "master", notes: "" },
  { domain_id: BEN, data_object_name: "benefit_enrollments", role: "master", notes: "" },
  { domain_id: BEN, data_object_name: "benefit_dependents", role: "master", notes: "" },
  { domain_id: BEN, data_object_name: "life_events", role: "master", notes: "" },
  { domain_id: BEN, data_object_name: "benefit_open_enrollments", role: "master", notes: "" },
  { domain_id: BEN, data_object_name: "benefit_carriers", role: "master", notes: "" },
  { domain_id: BEN, data_object_name: "carrier_feeds", role: "master", notes: "" },
  // BEN contributors/consumers
  { domain_id: BEN, data_object_name: "employees", role: "contributor", notes: "BEN-ADMIN writes the benefit-eligibility slice (coverage tier, dependent linkage, beneficiary designation) on the worker record." },
  { domain_id: PAYROLL, data_object_name: "benefit_enrollments", role: "consumer", notes: "PAYROLL consumes benefit_enrollments to compute pre/post-tax benefit deductions per pay_cycle." },
  { domain_id: ERPFIN, data_object_name: "benefit_enrollments", role: "consumer", notes: "ERP-FIN accrues employer benefit cost based on active benefit_enrollments." },

  // COMP-MGMT masters
  { domain_id: COMP, data_object_name: "compensation_plans", role: "master", notes: "" },
  { domain_id: COMP, data_object_name: "salary_bands", role: "master", notes: "" },
  { domain_id: COMP, data_object_name: "merit_cycles", role: "master", notes: "" },
  { domain_id: COMP, data_object_name: "merit_recommendations", role: "master", notes: "" },
  { domain_id: COMP, data_object_name: "compensation_statements", role: "master", notes: "" },
  { domain_id: COMP, data_object_name: "equity_grants", role: "master", notes: "" },
  { domain_id: COMP, data_object_name: "compensation_benchmarks", role: "master", notes: "" },
  // COMP contributors/consumers
  { domain_id: COMP, data_object_name: "employees", role: "contributor", notes: "COMP-MGMT writes compensation-state fields (current base, bonus target, equity guideline, salary band placement) on the worker record." },
  { domain_id: PAYROLL, data_object_name: "merit_recommendations", role: "consumer", notes: "PAYROLL consumes approved merit_recommendations as the source of pay-rate changes effective the next pay_cycle." },
  { domain_id: ATS, data_object_name: "salary_bands", role: "consumer", notes: "ATS consumes salary_bands to enforce offer-guidance ranges and surface pay-transparency disclosures in job postings." },

  // WFM masters
  { domain_id: WFM, data_object_name: "work_schedules", role: "master", notes: "" },
  { domain_id: WFM, data_object_name: "shifts", role: "master", notes: "" },
  { domain_id: WFM, data_object_name: "time_entries", role: "master", notes: "" },
  { domain_id: WFM, data_object_name: "absence_requests", role: "master", notes: "" },
  { domain_id: WFM, data_object_name: "absence_balances", role: "master", notes: "" },
  { domain_id: WFM, data_object_name: "time_off_policies", role: "master", notes: "" },
  { domain_id: WFM, data_object_name: "meal_break_records", role: "master", notes: "" },
  // WFM consumers
  { domain_id: PAYROLL, data_object_name: "time_entries", role: "consumer", notes: "PAYROLL consumes approved time_entries from WFM as the source of variable-pay hours (regular, overtime, premium, on-call) per pay_cycle." },
  { domain_id: PSA, data_object_name: "time_entries", role: "consumer", notes: "PSA consumes project-tagged time_entries for billable-hours calculation and utilisation reporting." },
  { domain_id: PA, data_object_name: "absence_requests", role: "consumer", notes: "PA derives leave-trend, burnout-risk, and absenteeism metrics from absence_requests aggregated over time." },

  // LMS masters
  { domain_id: LMS, data_object_name: "courses", role: "master", notes: "" },
  { domain_id: LMS, data_object_name: "learning_paths", role: "master", notes: "" },
  { domain_id: LMS, data_object_name: "course_enrollments", role: "master", notes: "" },
  { domain_id: LMS, data_object_name: "learning_records", role: "master", notes: "" },
  { domain_id: LMS, data_object_name: "certifications", role: "master", notes: "" },
  { domain_id: LMS, data_object_name: "skill_profiles", role: "master", notes: "Skills-cloud central artifact. TALENT-MGMT and ATS co-contribute via assessment / interview-rating signals; HCM consumes for worker-profile surfaces." },
  { domain_id: LMS, data_object_name: "compliance_assignments", role: "master", notes: "" },
  // LMS contributors / consumers
  { domain_id: TALENT, data_object_name: "skill_profiles", role: "contributor", notes: "TALENT-MGMT contributes performance-derived skill signals (calibrated ratings, succession assessments) into the skill_profile aggregate." },
  { domain_id: ATS, data_object_name: "skill_profiles", role: "contributor", notes: "ATS contributes hire-time skill assessments and interview scorecards as initial skill-profile data points." },
  { domain_id: HCM, data_object_name: "skill_profiles", role: "consumer", notes: "HCM surfaces skill_profile data on the worker record for self-service and manager views." },
  { domain_id: PA, data_object_name: "learning_records", role: "consumer", notes: "PA consumes aggregated learning_records for L&D ROI, skill-gap closure, and compliance-completion analytics." },

  // TALENT-MGMT masters
  { domain_id: TALENT, data_object_name: "performance_reviews", role: "master", notes: "" },
  { domain_id: TALENT, data_object_name: "performance_goals", role: "master", notes: "" },
  { domain_id: TALENT, data_object_name: "succession_plans", role: "master", notes: "" },
  { domain_id: TALENT, data_object_name: "talent_calibrations", role: "master", notes: "" },
  { domain_id: TALENT, data_object_name: "nine_box_placements", role: "master", notes: "" },
  { domain_id: TALENT, data_object_name: "career_aspirations", role: "master", notes: "" },
  { domain_id: TALENT, data_object_name: "feedback_records", role: "master", notes: "" },
  // TALENT consumers / contributors cross-cluster
  { domain_id: COMP, data_object_name: "performance_reviews", role: "consumer", notes: "COMP-MGMT consumes calibrated performance_reviews ratings as the primary input to merit_recommendations during cycle planning." },
  { domain_id: PA, data_object_name: "performance_reviews", role: "consumer", notes: "PA consumes calibrated performance_reviews for rater-bias analysis, distribution analytics, and high-potential cohort tracking." },
  { domain_id: ATS, data_object_name: "career_aspirations", role: "consumer", notes: "ATS consumes career_aspirations to populate internal-mobility recommendations and surface candidates for open requisitions." },

  // EMP-EXP masters
  { domain_id: EMPEXP, data_object_name: "survey_campaigns", role: "master", notes: "" },
  { domain_id: EMPEXP, data_object_name: "survey_responses", role: "master", notes: "" },
  { domain_id: EMPEXP, data_object_name: "engagement_drivers", role: "master", notes: "" },
  { domain_id: EMPEXP, data_object_name: "action_plans", role: "master", notes: "" },
  { domain_id: EMPEXP, data_object_name: "pulse_questions", role: "master", notes: "" },
  // EMP-EXP consumers
  { domain_id: PA, data_object_name: "engagement_drivers", role: "consumer", notes: "PA consumes engagement_drivers at team/department grain for cross-cutting people-analytics dashboards and attrition modelling features." },
  { domain_id: HCM, data_object_name: "engagement_drivers", role: "consumer", notes: "HCM surfaces team engagement scores in manager dashboards to inform people-management decisions." },

  // VMS masters
  { domain_id: VMS, data_object_name: "contingent_workers", role: "master", notes: "" },
  { domain_id: VMS, data_object_name: "work_orders", role: "master", notes: "" },
  { domain_id: VMS, data_object_name: "staffing_suppliers", role: "master", notes: "" },
  { domain_id: VMS, data_object_name: "rate_cards", role: "master", notes: "" },
  { domain_id: VMS, data_object_name: "contingent_timesheets", role: "master", notes: "" },
  { domain_id: VMS, data_object_name: "contingent_invoices", role: "master", notes: "" },
  // VMS consumers / contributors
  { domain_id: S2P, data_object_name: "contingent_invoices", role: "consumer", notes: "S2P consumes contingent_invoices for supplier-payment processing on the staff-augmentation channel." },
  { domain_id: HCM, data_object_name: "contingent_workers", role: "consumer", notes: "HCM consumes contingent_workers for unified workforce visibility (employees + contingent) at the manager/org-unit layer." },

  // HRSD masters
  { domain_id: HRSD, data_object_name: "hr_cases", role: "master", notes: "" },
  { domain_id: HRSD, data_object_name: "case_categories", role: "master", notes: "" },
  { domain_id: HRSD, data_object_name: "knowledge_articles", role: "consumer", notes: "HRSD consumes the shared knowledge_articles object (mastered by ITSM/CSM) for HR knowledge base content, filtered to HR audience." },
  { domain_id: HRSD, data_object_name: "employees", role: "consumer", notes: "HRSD consumes the worker record as the principal authentication / authorisation context for case visibility and routing." },
];

type HandoffSpec = {
  source_domain_id: number;
  target_domain_id: number;
  data_object_name: string;
  trigger_event: string;
  integration_pattern: "event_stream" | "api_call" | "batch_sync" | "manual_handoff" | "file_drop";
  friction_level: "high" | "medium" | "low";
  description: string;
};

const handoffs: HandoffSpec[] = [
  // PAYROLL outbound
  { source_domain_id: PAYROLL, target_domain_id: ERPFIN, data_object_name: "payroll_journal_entries", trigger_event: "pay_cycle.posted", integration_pattern: "event_stream", friction_level: "medium", description: "Pay run closure produces decomposed GL postings (gross wages debit by cost_center / earning_code; employer tax + benefits accrual; net pay credit to cash clearing) that flow to ERP-FIN. Canonical payroll-to-finance handoff. Failure modes: unmapped earning_codes; cost_center mid-cycle reorgs; multi-entity intercompany cost allocations." },
  { source_domain_id: PAYROLL, target_domain_id: BEN, data_object_name: "benefit_enrollments", trigger_event: "pay_cycle.closed", integration_pattern: "batch_sync", friction_level: "medium", description: "Per-employee deduction totals reconciled against active benefit_enrollments to detect election drift. Discrepancies require manual carrier_feed correction and retro-pay calculation." },
  { source_domain_id: PAYROLL, target_domain_id: EXPENSE, data_object_name: "pay_slips", trigger_event: "expense.reimbursable", integration_pattern: "api_call", friction_level: "low", description: "Approved expense_reports flagged for payroll reimbursement (rather than card-cleared) feed into the next pay_run as a non-taxable earning_code." },
  { source_domain_id: PAYROLL, target_domain_id: PA, data_object_name: "pay_slips", trigger_event: "pay_cycle.closed", integration_pattern: "batch_sync", friction_level: "low", description: "Closed pay_run cohort feeds people-analytics pay-equity, total-rewards, and labor-cost analyses." },

  // WFM outbound
  { source_domain_id: WFM, target_domain_id: PAYROLL, data_object_name: "time_entries", trigger_event: "pay_period.closed", integration_pattern: "batch_sync", friction_level: "medium", description: "Approved time_entries flow to PAYROLL as the source of variable-pay hours. Failure modes: late approvals trigger retro pay; rounded vs unrounded reconciliation; multi-WFM/multi-PAYROLL stacks with worker-id misalignment." },
  { source_domain_id: WFM, target_domain_id: PSA, data_object_name: "time_entries", trigger_event: "time_entry.approved", integration_pattern: "event_stream", friction_level: "low", description: "Project-tagged time_entries feed PSA for utilisation and billable-hours calculation." },

  // COMP-MGMT outbound
  { source_domain_id: COMP, target_domain_id: PAYROLL, data_object_name: "merit_recommendations", trigger_event: "merit_cycle.approved", integration_pattern: "event_stream", friction_level: "medium", description: "Approved merit, bonus, and equity refresh values become effective-dated pay-rate changes and one-time payments in payroll. Cycle-close timing must align with pay_run boundaries; mid-cycle promotions arrive as off-cycle adjustments." },
  { source_domain_id: COMP, target_domain_id: HCM, data_object_name: "employees", trigger_event: "merit_cycle.approved", integration_pattern: "event_stream", friction_level: "low", description: "Cycle-close pay-rate changes post to the worker record (base salary, bonus target, equity guideline)." },
  { source_domain_id: COMP, target_domain_id: PA, data_object_name: "compensation_statements", trigger_event: "merit_cycle.closed", integration_pattern: "batch_sync", friction_level: "low", description: "Cycle-close dataset feeds pay-equity gap analysis and compa-ratio distribution analytics." },

  // BEN-ADMIN outbound
  { source_domain_id: BEN, target_domain_id: PAYROLL, data_object_name: "benefit_enrollments", trigger_event: "enrollment.changed", integration_pattern: "event_stream", friction_level: "medium", description: "Election change (life event or open-enrollment) triggers mid-cycle deduction adjustment in payroll. Failure modes: retro adjustments crossing pay-period boundaries; tax-treatment changes (pre-tax vs post-tax) requiring W-2 corrections." },
  { source_domain_id: BEN, target_domain_id: ERPFIN, data_object_name: "payroll_journal_entries", trigger_event: "enrollment.changed", integration_pattern: "batch_sync", friction_level: "low", description: "Employer-side benefit cost accrual posts to GL as part of personnel-cost rollup." },
  { source_domain_id: BEN, target_domain_id: PAYROLL, data_object_name: "benefit_carriers", trigger_event: "open_enrollment.closed", integration_pattern: "file_drop", friction_level: "high", description: "Open-enrollment close produces large carrier_feed batches (834 EDI) plus mass payroll deduction-code updates. Identity-reconciliation pattern: per-carrier member-id schemes diverge from HRIS employee-id; failure modes are silent coverage gaps discovered weeks later." },

  // LMS outbound
  { source_domain_id: LMS, target_domain_id: TALENT, data_object_name: "skill_profiles", trigger_event: "certification.earned", integration_pattern: "event_stream", friction_level: "medium", description: "Cert / course completion updates the worker skill_profile (Skills Cloud), which feeds talent-mobility matching and succession bench analysis. Friction: cross-vendor LMS↔TALENT stacks have brittle skill-taxonomy reconciliation." },
  { source_domain_id: LMS, target_domain_id: HCM, data_object_name: "employees", trigger_event: "compliance_training.lapsed", integration_pattern: "manual_handoff", friction_level: "high", description: "Lapsed compliance certifications (anti-harassment, AML, OSHA) often require role-block or access-block enforcement that crosses LMS, HCM, and IGA — rarely event-driven; commonly discovered at audit. High-friction pattern: probabilistic signal (training expired) requires deterministic action (revoke access / pull from rotation)." },

  // TALENT-MGMT outbound
  { source_domain_id: TALENT, target_domain_id: COMP, data_object_name: "performance_reviews", trigger_event: "calibration.complete", integration_pattern: "api_call", friction_level: "medium", description: "Calibrated performance ratings feed the merit_recommendation matrix at cycle planning. Failure modes: cycle-cadence mismatch (annual review vs semi-annual merit); late calibration delays merit cycle." },
  { source_domain_id: TALENT, target_domain_id: ATS, data_object_name: "career_aspirations", trigger_event: "successor.tagged", integration_pattern: "api_call", friction_level: "low", description: "Successors identified in succession_plans surface in ATS as pre-qualified internal candidates for matched requisitions." },

  // EMP-EXP outbound
  { source_domain_id: EMPEXP, target_domain_id: PA, data_object_name: "engagement_drivers", trigger_event: "survey.cycle_closed", integration_pattern: "event_stream", friction_level: "low", description: "Cycle-close driver scores feed people-analytics cohorts for cross-cutting analyses (engagement × attrition, engagement × DEI, engagement × performance)." },
  { source_domain_id: EMPEXP, target_domain_id: HCM, data_object_name: "employees", trigger_event: "attrition_risk.high", integration_pattern: "api_call", friction_level: "high", description: "Attrition-risk inference from engagement signals surfaces to managers via HCM dashboards. Probabilistic-signal → deterministic-action pattern: a risk score is not a directive; intervention is gated by manager judgement, data-privacy rules (anonymity floor), and DEI-bias concerns." },

  // VMS outbound
  { source_domain_id: VMS, target_domain_id: S2P, data_object_name: "contingent_invoices", trigger_event: "work_order.invoiced", integration_pattern: "event_stream", friction_level: "medium", description: "Approved contingent_timesheets × rate_cards produce contingent_invoices that flow into S2P / AP-AUTO for three-way match and payment to the staffing supplier." },
  { source_domain_id: VMS, target_domain_id: HCM, data_object_name: "contingent_workers", trigger_event: "worker.tenure_threshold", integration_pattern: "manual_handoff", friction_level: "high", description: "Contingent worker crossing co-employment-risk tenure threshold (typically 18-24 months) must be reclassified, off-boarded, or converted. Cross-vendor stack with same logical entity: VMS and HCM rarely share identity; the watch-list is built by exception report and processed manually." },

  // HRSD outbound
  { source_domain_id: HRSD, target_domain_id: IGA, data_object_name: "hr_cases", trigger_event: "case.access_required", integration_pattern: "api_call", friction_level: "high", description: "HR cases requiring app or system access (e.g. role change, special-project access) escalate to IGA. Identity-reconciliation pattern: HR case context (employee_id, role, department) must map to IGA identity-graph keys; cross-vendor stacks lack canonical resolver." },

  // ATS / HCM additional outbound (to fill cluster)
  { source_domain_id: ATS, target_domain_id: BEN, data_object_name: "benefit_enrollments", trigger_event: "offer.accepted", integration_pattern: "event_stream", friction_level: "medium", description: "Offer acceptance opens the new-hire benefit-enrollment window in BEN-ADMIN, gated by the actual employee.created event from HCM." },
  { source_domain_id: ATS, target_domain_id: COMP, data_object_name: "compensation_statements", trigger_event: "offer.signed", integration_pattern: "event_stream", friction_level: "medium", description: "Offer signature instantiates the new-hire compensation plan (base, target bonus, equity grant, sign-on) in COMP-MGMT." },
  { source_domain_id: HCM, target_domain_id: BEN, data_object_name: "benefit_enrollments", trigger_event: "employee.terminated", integration_pattern: "event_stream", friction_level: "medium", description: "Termination triggers COBRA event handling in BEN-ADMIN (US) or local statutory leaver process. Failure modes: late termination dates cause overpayment of employer premium." },
  { source_domain_id: HCM, target_domain_id: COMP, data_object_name: "employees", trigger_event: "employee.promoted", integration_pattern: "event_stream", friction_level: "low", description: "Promotion event triggers off-cycle compensation review (eligibility, band placement, increase recommendation) in COMP-MGMT." },

  // ERP-FIN consume
  { source_domain_id: ERPFIN, target_domain_id: EPM, data_object_name: "payroll_journal_entries", trigger_event: "period.closed", integration_pattern: "batch_sync", friction_level: "medium", description: "Period close pushes actual personnel cost into EPM for variance reporting against headcount_plans and workforce_cost_projections." },
];

async function main() {
  console.log("\n=== data_objects ===");
  const existingDO = await get("/data_objects?select=id,data_object_name&limit=10000");
  const existingDONames = new Set(existingDO.map(r => String(r.data_object_name)));
  const missingDO = dataObjects.filter(d => !existingDONames.has(d.data_object_name));
  if (missingDO.length > 0) {
    console.log(`  inserting ${missingDO.length} new data_objects (${existingDO.length} existed)`);
    await insert("/data_objects", missingDO);
  } else {
    console.log("  all data_objects already present");
  }
  const allDO = await get("/data_objects?select=id,data_object_name&limit=10000");
  const doIdByName = new Map<string, number>();
  for (const r of allDO) doIdByName.set(String(r.data_object_name), Number(r.id));

  console.log("\n=== domain_data_objects ===");
  const existingDDO = await get("/domain_data_objects?select=domain_id,data_object_id,role&limit=10000");
  const ddoKey = (d: number, o: number, r: string) => `${d}:${o}:${r}`;
  const existingDDOSet = new Set(existingDDO.map(r => ddoKey(Number(r.domain_id), Number(r.data_object_id), String(r.role))));
  const newDDORows: Row[] = [];
  for (const spec of domainDataObjects) {
    const oid = doIdByName.get(spec.data_object_name);
    if (!oid) throw new Error(`data_object missing: ${spec.data_object_name}`);
    const k = ddoKey(spec.domain_id, oid, spec.role);
    if (existingDDOSet.has(k)) { continue; }
    newDDORows.push({ domain_id: spec.domain_id, data_object_id: oid, role: spec.role, notes: spec.notes });
  }
  if (newDDORows.length > 0) {
    console.log(`  inserting ${newDDORows.length} new domain_data_objects rows`);
    await insert("/domain_data_objects", newDDORows);
  } else {
    console.log("  no new domain_data_objects rows");
  }

  console.log("\n=== cross_domain_handoffs ===");
  const existingCDH = await get("/cross_domain_handoffs?select=source_domain_id,target_domain_id,data_object_id,trigger_event&limit=10000");
  const cdhKey = (s: number, t: number, o: number, e: string) => `${s}:${t}:${o}:${e}`;
  const existingCDHSet = new Set(existingCDH.map(r => cdhKey(Number(r.source_domain_id), Number(r.target_domain_id), Number(r.data_object_id), String(r.trigger_event))));
  const newCDHRows: Row[] = [];
  for (const h of handoffs) {
    const oid = doIdByName.get(h.data_object_name);
    if (!oid) throw new Error(`data_object missing for handoff: ${h.data_object_name}`);
    const k = cdhKey(h.source_domain_id, h.target_domain_id, oid, h.trigger_event);
    if (existingCDHSet.has(k)) { continue; }
    newCDHRows.push({
      source_domain_id: h.source_domain_id,
      target_domain_id: h.target_domain_id,
      data_object_id: oid,
      trigger_event: h.trigger_event,
      integration_pattern: h.integration_pattern,
      friction_level: h.friction_level,
      description: h.description,
      notes: "",
    });
  }
  if (newCDHRows.length > 0) {
    console.log(`  inserting ${newCDHRows.length} new cross_domain_handoffs rows`);
    await insert("/cross_domain_handoffs", newCDHRows);
  } else {
    console.log("  no new cross_domain_handoffs rows");
  }

  // Final counts
  const payrollMasters = await get(`/domain_data_objects?domain_id=eq.${PAYROLL}&role=eq.master&select=data_object_id`);
  const benMasters = await get(`/domain_data_objects?domain_id=eq.${BEN}&role=eq.master&select=data_object_id`);
  const compMasters = await get(`/domain_data_objects?domain_id=eq.${COMP}&role=eq.master&select=data_object_id`);
  const wfmMasters = await get(`/domain_data_objects?domain_id=eq.${WFM}&role=eq.master&select=data_object_id`);
  const lmsMasters = await get(`/domain_data_objects?domain_id=eq.${LMS}&role=eq.master&select=data_object_id`);
  const talentMasters = await get(`/domain_data_objects?domain_id=eq.${TALENT}&role=eq.master&select=data_object_id`);
  const empExpMasters = await get(`/domain_data_objects?domain_id=eq.${EMPEXP}&role=eq.master&select=data_object_id`);
  const vmsMasters = await get(`/domain_data_objects?domain_id=eq.${VMS}&role=eq.master&select=data_object_id`);
  const hrsdMasters = await get(`/domain_data_objects?domain_id=eq.${HRSD}&role=eq.master&select=data_object_id`);
  console.log("\n=== Master counts per domain ===");
  console.log(JSON.stringify({
    PAYROLL: payrollMasters.length,
    BEN_ADMIN: benMasters.length,
    COMP_MGMT: compMasters.length,
    WFM: wfmMasters.length,
    LMS: lmsMasters.length,
    TALENT_MGMT: talentMasters.length,
    EMP_EXP: empExpMasters.length,
    VMS: vmsMasters.length,
    HRSD: hrsdMasters.length,
  }, null, 2));
}

await main();
