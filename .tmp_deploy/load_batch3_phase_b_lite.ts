#!/usr/bin/env bun
// Batch-3 Phase-B Lite backfill — 12 domains (industry-vertical + DevOps/VIS-MGMT/WEB-CONTOPS).
//
// Sources:
//   - 8 domains from parallel Explore subagents (verified outputs only;
//     all re-runs flagged Python/MCP and were re-prompted with explicit bans).
//   - 3 domains (HC-PATIENT, PS-LIC, VSDP) drafted inline in the main thread
//     after parallel subagents failed repeatedly.
//   - LSD `legal_matters` collision with LEGAL-PRACT-MGMT (id 391) resolved
//     by scope-qualifying to `in_house_legal_matters`.
//
// Scope: data_objects + master domain_data_objects ONLY. Trigger_events and
// cross_domain_handoffs deferred (consistent with batch-1+2 approach).
// record_status='new' triggers human review.
//
//   bun run load_batch3_phase_b_lite.ts          -> DRY RUN
//   bun run load_batch3_phase_b_lite.ts --apply  -> Live

import { $ } from "bun";
$.throws(false);
const APPLY = process.argv.includes("--apply");

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius call failed (exit ${code}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  if (!APPLY) { console.log(`  [DRY] POST ${rows.length} -> ${path}`); return []; }
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(...await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) }));
  return out;
}

console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}\n`);

type Master = { name: string; label: string; desc: string };
const proposals: { code: string; masters: Master[] }[] = [
  { code: "BANK-OPS", masters: [
    { name: "loan_applications", label: "Loan Application", desc: "Borrower request to originate a loan: application date, requested amount, purpose, personal/commercial distinction, loan type (mortgage, auto, commercial line, term loan), requested tenor, collateral, guarantor status, lifecycle state (draft / submitted / approved / declined / funded)." },
    { name: "account_applications", label: "Account Application", desc: "Retail/commercial customer request to open a deposit or payment account: account type (checking, savings, money market, business), initial funding, linked services (card, online banking, mobile), identity-verification flag. Distinct from ATS recruiting applications." },
    { name: "account_openings", label: "Bank Account Opening", desc: "Completion record for a new deposit/payment account: institution, account number, IBAN/routing, account type, customer, funding method, activation date, initial balance. Derived from account_applications; drives downstream provisioning." },
    { name: "banking_kyc_reviews", label: "Banking KYC/AML Review", desc: "Know-Your-Customer / Anti-Money-Laundering assessment: customer risk classification, beneficial-ownership confirmation, source-of-funds verification, PEP screening, sanctions-list match, watchlist refresh cadence, reviewer sign-off, refresh-due date. Required for origination and annual recertification." },
    { name: "banking_cases", label: "Banking Case", desc: "Customer-banking issue / dispute / escalation: dispute type (unauthorized transaction, fraud claim, account error, complaint, regulatory concern), account involved, opened date, assigned agent, SLA, resolution status, root cause. Distinct from CSM customer_cases and ITSM incidents." },
    { name: "wire_transfers", label: "Wire Transfer", desc: "Banking-side fund-transfer instruction: originating account, destination (domestic/international), amount, currency, requested delivery, beneficiary, purpose code, compliance flags (sanctions, threshold reporting), execution status, confirmation number. Distinct from S2P supplier payments." },
    { name: "loan_disbursements", label: "Loan Disbursement", desc: "Release of approved loan funds: loan_application reference, disbursement date, amount, tranching (full / phased), destination account, conditions satisfied, regulatory reporting flags. Carries funding state." },
    { name: "banking_transactions", label: "Banking Transaction", desc: "Posted transaction on a bank account: posting date, type (debit / credit / transfer / fee / interest), amount, currency, counterparty, reference, reconciliation status vs bank statement. Distinct from ERP-FIN journal_entries (the accounting side)." },
  ]},
  { code: "CLIN-DEV", masters: [
    { name: "medical_devices", label: "Medical Device", desc: "Medical equipment in clinical use (infusion pumps, ventilators, patient monitors, imaging systems, patient transport). Specialised regulated asset (FDA/MDR, biocompatibility); distinct from EAM industrial_assets (plant) and HAM hardware_assets (IT)." },
    { name: "device_maintenance_logs", label: "Device Maintenance Log", desc: "Preventive and corrective maintenance records per medical_device: PM schedule completion, technician notes, parts replaced. Regulatory audit trail for clinical compliance." },
    { name: "device_recalls", label: "Device Recall", desc: "FDA/regulatory recall notices and clinical-facility response: recall scope, risk level (Class I/II/III), affected serial numbers, remediation, patient-safety impact assessment, regulatory reporting." },
    { name: "clinical_engineering_work_orders", label: "Clinical Engineering Work Order", desc: "Request from clinical staff for device repair, configuration, training, or incident investigation; routed via clinical-engineering team. Links to device_maintenance_logs and device_incident_reports for closed-loop traceability." },
    { name: "device_calibration_records", label: "Device Calibration Record", desc: "Accuracy verification for clinical equipment (scales, infusion pumps, diagnostic devices). Frequency mandated by FDA/accreditation; tracks calibration date, technician, tolerance acceptance." },
    { name: "device_incident_reports", label: "Device Incident Report", desc: "FDA MDR-style adverse-event report (patient injury, near-miss, unexpected behavior): root cause (user error vs device defect); links to device_recalls when patterns emerge." },
    { name: "sterilization_cycles", label: "Sterilization Cycle", desc: "Autoclave/steam-sterilization records for reusable surgical instruments: cycle parameters (time, temp, pressure), batch ID, QA certification. Validates sterile-field integrity pre-procedure." },
  ]},
  { code: "HC-PATIENT", masters: [
    { name: "patient_appointments", label: "Patient Appointment", desc: "Scheduled visit between patient and provider: provider, location, scheduled time, visit type (new / follow-up / annual / urgent), status (scheduled / confirmed / arrived / completed / no-show / cancelled), reason for visit. Drives front-of-house workflow and resource utilization." },
    { name: "clinical_encounters", label: "Clinical Encounter", desc: "Documented patient-provider clinical contact: encounter date, type (office visit / telehealth / inpatient / ED), chief complaint, vitals, ICD diagnosis codes, CPT procedure codes, provider, attending. The atomic billable clinical event; precedes patient_charts and clinical_notes." },
    { name: "care_plans", label: "Care Plan", desc: "Coordinated care document for a patient condition: goals, interventions, target dates, responsible providers, monitoring frequency, escalation triggers. Used in chronic-disease management, transitions of care, and oncology pathways. Patient-centric (distinct from project plans, treatment protocols)." },
    { name: "patient_referrals", label: "Patient Referral", desc: "Provider-initiated request for specialist consultation or external service: referring provider, target specialist/facility, clinical indication, urgency, status (requested / scheduled / completed / declined), insurance authorization status. Drives in-network coordination and revenue capture." },
    { name: "clinical_orders", label: "Clinical Order", desc: "Provider order for diagnostic test, medication, therapy, or procedure: order type (lab / imaging / prescription / referral / DME), order date, ordering provider, target facility/department, priority, result attachment. CPOE-compliant; distinct from S2P purchase orders." },
    { name: "clinical_notes", label: "Clinical Note", desc: "Provider documentation of patient encounter: SOAP-style (subjective/objective/assessment/plan), nurse notes, progress notes, discharge summaries. Patient-chart artifact; supports billing, continuity, legal record. Distinct from ECM documents (filing-cabinet view) — clinical_notes are structured clinical artifacts." },
  ]},
  { code: "INS-CLAIMS", masters: [
    { name: "insurance_claims", label: "Insurance Claim", desc: "Master record from first notice of loss through adjudication and settlement; P&C and life insurance scope. Carries claim type, loss date, reported date, claimant, adjuster, status (open / in-investigation / settled / closed / litigated), gross/net liability. Scope-qualified to avoid collision with HR claims, warranty claims, healthcare claims." },
    { name: "insurance_policies", label: "Insurance Policy", desc: "Underwritten contract defining coverage terms, limits, deductibles, exclusions, effective/expiration dates; the contractual artifact a claim is filed against. Distinct from GRC `policies` (control documents) and tenant lease policies." },
    { name: "policy_coverages", label: "Policy Coverage", desc: "Individual coverage line within an insurance_policy: line of business, coverage code, limit amount, deductible, coinsurance %, effective period. Determines claim eligibility and adjudication." },
    { name: "loss_incidents", label: "Loss Incident", desc: "FNOL event giving rise to a claim: occurrence date, location, loss description, cause, subtype (property damage, liability, injury, death), first-reported date. P&C-primary; distinct from ITSM incidents (internal IT operational events)." },
    { name: "claim_adjuster_assignments", label: "Claim Adjuster Assignment", desc: "Allocation of claims to adjusters: adjuster, assigned_date, claim_count, caseload_status, assignment_reason (intake / escalation / specialty / reassignment). Drives adjuster workload analytics." },
    { name: "claim_settlements", label: "Claim Settlement", desc: "Settlement agreement specifying approved amount, conditions, releases, and closure terms for a resolved claim: settlement_date, payee, breakdown by coverage, structured-settlement schedule, release language." },
    { name: "claim_payments", label: "Claim Payment", desc: "Disbursement to claimant, provider, or vendor: amount, payment date, check/EFT reference, reserve basis, line-item allocation to coverages. Distinct from generic payments (rent, AR, supplier)." },
    { name: "salvage_recovery_records", label: "Salvage Recovery", desc: "Recovery of salvageable property or proceeds from damaged/totaled assets following settlement: salvage vendor, recovery_amount, disposal record, applied against claim total. P&C-specific." },
    { name: "subrogation_cases", label: "Subrogation Case", desc: "Insurer pursuit of recovery from a liable third party: claim reference, third party, coverage class, demand amount, status, recovery amount, date range. Reduces net loss after a claim is paid." },
    { name: "siu_cases", label: "SIU Investigation Case", desc: "Special Investigation Unit fraud-investigation case: claim reference, indicators triggered, investigator, status (open / closed-confirmed / closed-unconfirmed), referral to law enforcement. Distinct from generic banking/compliance investigations." },
  ]},
  { code: "LSD", masters: [
    { name: "in_house_legal_matters", label: "In-House Legal Matter", desc: "In-house legal matter (dispute / transaction / advisory / IP case / regulatory response): client department, opposing parties, matter type, key dates, assigned in-house counsel + outside counsel, budget, status. Scope-qualified to distinguish from law-firm `legal_matters` (id 391, LEGAL-PRACT-MGMT-mastered)." },
    { name: "legal_intake_requests", label: "Legal Intake Request", desc: "Demand-signal record: business-unit request for legal advice or service. Carries description, priority, required-by date, requesting department, triage outcome (matter creation / policy guidance / escalation). The front door to LSD." },
    { name: "legal_holds", label: "Legal Hold", desc: "eDiscovery / litigation preservation notice: matter reference, affected record types (email, documents, messages, files), custodian scope, issued date, lifting date. Drives enforcement across data systems." },
    { name: "ediscovery_requests", label: "eDiscovery Request", desc: "Litigation data request (internal or from external counsel): matter reference, scope (custodians, date range, keywords), requested record types, production timeline, chain-of-custody." },
    { name: "outside_counsel_engagements", label: "Outside Counsel Engagement", desc: "Engagement with external law firm/counsel: firm, attorney, matter reference, scope, billing arrangement (hourly / fixed / contingent), budget, contract reference, status. Tracks spend and coordination." },
    { name: "legal_advice_records", label: "Legal Advice Record", desc: "Documented legal opinion / consultation: matter or requestor reference, advice narrative, applicability scope, confidence, expiry/review date, privilege classification." },
    { name: "regulatory_inquiries", label: "Regulatory Inquiry", desc: "Notification from regulator (SEC, FTC, GDPR authority, state AG): jurisdiction, inquiry type, subject, deadline, assigned counsel, response status. Distinct from PS-LIC inspections (regulator-as-issuer vs regulator-as-investigator)." },
    { name: "legal_case_dockets", label: "Legal Case Docket", desc: "Court-centric tracking for litigated matters: court/jurisdiction, case number, judge, calendar (filing, hearing, trial, appeal dates), opposing counsel, key documents. Subset of in_house_legal_matters with litigation metadata." },
  ]},
  { code: "PS-LIC", masters: [
    { name: "permit_applications", label: "Permit Application", desc: "Citizen or business submission requesting a license or permit: applicant, permit type (building / business / professional / event / environmental), submission date, jurisdiction, supporting documents, fees due, status (submitted / under-review / approved / denied / withdrawn). Scope-qualified to avoid collision with ATS, IDP, banking, healthcare applications." },
    { name: "license_records", label: "Issued License Record", desc: "Active issued license or permit: license number, holder, type, issue date, expiration date, conditions, jurisdiction, current status (active / suspended / expired / revoked). The post-approval authoritative record." },
    { name: "permit_inspections", label: "Permit Inspection", desc: "Field inspection tied to a permit (pre-construction, in-progress, final, complaint-driven): inspection type, scheduled date, inspector, location, outcome (pass / fail / conditional), required corrections, follow-up inspection. Scope-qualified vs CLIN-DEV / EAM / FSM inspections." },
    { name: "license_renewals", label: "License Renewal", desc: "Renewal application for an existing license: source license, renewal cycle, submission date, updated requirements, fees, conditions changes, outcome. Workflow distinct from initial issuance." },
    { name: "code_violations", label: "Code Violation / Citation", desc: "Cited non-compliance with permit conditions, building code, business regulation, or other government code: subject (property / business / individual), violation code, citation date, issuing inspector, severity, fines assessed, remediation status." },
    { name: "regulatory_fees", label: "Regulatory Fee", desc: "Government-side fee assessment for permits, licenses, inspections, citations: fee type, amount, due date, payer, payment status, allocation to fund. Distinct from S2P / billing." },
  ]},
  { code: "RET-STORE", masters: [
    { name: "store_tasks", label: "Store Task", desc: "Task assigned to retail associates (shelf stocking, planogram execution, zone cleaning, till reconciliation, safety checks). Core unit of store-level workforce execution and accountability. Scope-qualified vs onboarding_tasks, project_tasks." },
    { name: "retail_labour_schedules", label: "Retail Labour Schedule", desc: "Shift assignments, associate availability, store labour roster. RET-STORE-mastered scheduling execution; WFM masters canonical `work_schedules` for workforce-planning. Retail-specific scheduling logic (coverage bands, register staffing) lives here." },
    { name: "store_audits", label: "Store Audit", desc: "In-store compliance/operational audit (health/safety, merchandising, inventory accuracy, point-of-sale). Distinct from enterprise AUDIT (`audit_plans` / `audit_findings`)." },
    { name: "mystery_shopper_records", label: "Mystery Shopper Record", desc: "Third-party store quality assessment (customer experience, compliance, staff courtesy). Distinct from internal store_audits." },
    { name: "planogram_compliance_records", label: "Planogram Compliance Record", desc: "Shelf-layout and product-placement compliance vs corporate planogram standards: deviation, remediation, photo evidence, visual compliance verification." },
    { name: "store_associate_checklists", label: "Store Associate Checklist", desc: "Daily/shift store operational checklist (open / close / safety / cleanliness / loss-prevention). Template-driven execution and sign-off records." },
  ]},
  { code: "TELCO-BSS", masters: [
    { name: "telco_service_catalog", label: "Telco Service Catalog", desc: "Commercial service offerings with technical specifications, rate plans, and SLA terms; TM Forum eTOM catalog master. Distinct from internal IT service catalogs and SaaS pricing catalogs." },
    { name: "telco_service_orders", label: "Telco Service Order", desc: "Service provisioning order (activate / modify / suspend / deactivate). Carries customer, service catalog reference, requested date, status, fulfillment workflow reference. Distinct from B2C-COMM `orders` (commerce) and SUB-MGMT customer-subscription change orders." },
    { name: "telco_subscriptions", label: "Telco Subscription", desc: "Active service instance per subscriber (mobile line, fiber connection, leased circuit): carrier-customer relationship with the operational service. Distinct from SUB-MGMT `customer_subscriptions` (SaaS seller-side)." },
    { name: "service_provisioning_workflows", label: "Service Provisioning Workflow", desc: "Orchestration state + task list for activation / change / closure: workflow steps, dependencies, automation/manual flags, current state, errors. Operational view of how a telco_service_order is executed." },
    { name: "network_inventory_records", label: "Network Inventory Record", desc: "Logical/physical network inventory mastered by the telco operator: ports, circuits, IP address blocks, fiber routes, MSAN/DSLAM ports, allocated/free status. Distinct from NPMD network observability (`network_flow_records` etc.) and CMDB `configuration_items`." },
    { name: "telco_customer_bills", label: "Telco Customer Bill", desc: "Subscriber bill — multi-rated usage + subscription + tax lines, billing-period summary, payment status. Distinct from S2P invoices, SUB-MGMT `customer_invoices`, and rent_payments." },
    { name: "service_trouble_tickets", label: "Service Trouble Ticket", desc: "Subscriber-reported service-degradation/outage ticket: subscriber, service, severity, opened/resolved timestamps, root cause, resolution. Distinct from ITSM `incidents` (internal IT) and FSM customer field-service tickets." },
  ]},
  { code: "UTIL-OPS", masters: [
    { name: "utility_customer_accounts", label: "Utility Customer Account", desc: "Legal customer-premise record tied to a utility service territory: contract, billing profile, meter assignment, connection status. Residential, commercial, industrial scopes. Distinct from CRM `customers` (sales context)." },
    { name: "utility_meters", label: "Utility Meter", desc: "Physical meter device at a customer premise (electric/gas/water): device type, manufacturer, install date, certified accuracy class, commissioning state. Distinct from REAL-EST `utility_meter_readings` (the read) and from the meter as a corporate-buyer concept." },
    { name: "meter_reads", label: "Meter Read", desc: "Operator-collected or AMI-transmitted consumption reading: read date, consumption value, unit, read method (manual / AMR / AMI), anomaly flags. Billing-facing time-series at utility scale (millions of reads/day)." },
    { name: "service_connections", label: "Service Connection", desc: "Meter-to-grid/pipe hookup asset: pole/pedestal/pit location, conductor/pipe size, install date, maintenance history. Parent to outage-impact assessment and work-order routing." },
    { name: "utility_assets", label: "Utility Asset", desc: "Utility-owned network infrastructure (substations, transformers, poles, distribution lines, pipelines): type, location, capacity, age, operational status. Distinct from EAM `industrial_assets` (corporate plant) and HAM (IT)." },
    { name: "outage_events", label: "Outage Event", desc: "Unplanned loss-of-service affecting one or more service_connections: detection time, cause (storm / fault / equipment failure / load), estimated restoration, affected customer count. Distinct from ITSM `incidents` (IT) and EAM `eam_work_orders`." },
    { name: "utility_service_orders", label: "Utility Service Order", desc: "Work request to establish new connection / disconnect / move / modify service (not maintenance): premise, requested date, work type, fulfillment status. Distinct from EAM `eam_work_orders` and FSM customer work orders." },
    { name: "utility_bills", label: "Utility Bill", desc: "Customer invoice: aggregates meter_reads, regulatory adjustments (demand charges, time-of-use rates, tariffs), payment terms. Distinct from telco_customer_bills, S2P invoices, and rent_payments." },
  ]},
  { code: "VIS-MGMT", masters: [
    { name: "visitor_registrations", label: "Visitor Registration", desc: "Pre-visit registration: visitor arrival intent with expected access duration, host assignment, pre-screening completion. Initiates the visitor lifecycle." },
    { name: "visitor_check_ins", label: "Visitor Check-In", desc: "Arrival event: timestamped confirmation at facility entry, credential verification, badge-issuance trigger." },
    { name: "visitor_badges", label: "Visitor Badge", desc: "Physical or digital badge credential issued upon check-in: encodes visitor identity, host assignment, access scope, expiration." },
    { name: "host_assignments", label: "Visitor Host Assignment", desc: "Binding between visitor and internal employee host: access scope, duration window, responsible party for visitor supervision." },
    { name: "visitor_evacuation_lists", label: "Visitor Evacuation List", desc: "Real-time roster of visitors present on-site, correlated with spaces and emergency zones for emergency response and accountability." },
    { name: "visitor_nda_acknowledgements", label: "Visitor NDA Acknowledgement", desc: "Signed or electronically acknowledged non-disclosure agreement: legal-hold artifact per visit. Distinct from CLM `contracts` (corporate agreements)." },
    { name: "visitor_watchlist_screenings", label: "Visitor Watchlist Screening", desc: "Pre-arrival or arrival-time screening result against external watchlists (sanctions, banned-visitor, threat databases): compliance-hold record." },
    { name: "visitor_audit_logs", label: "Visitor Audit Log", desc: "Timestamped record of all visitor state transitions (registration / check-in / badge / check-out / escalations): compliance audit trail." },
  ]},
  { code: "VSDP", masters: [
    { name: "source_repositories", label: "Source Repository", desc: "Git repository hosted on the VSDP platform: name, default branch, visibility (public / internal / private), language, owner, last-activity. Distinct from KMS knowledge artifacts and DAM digital_assets." },
    { name: "code_commits", label: "Code Commit", desc: "Git commit on a source_repository: SHA, author, timestamp, message, parent SHA(s), diff summary, signed-off-by. The atomic unit for value-stream analytics (lead-time computation, change-volume tracking)." },
    { name: "pull_requests", label: "Pull / Merge Request", desc: "Code-change proposal targeting a branch in a source_repository: author, base/head branches, title, description, status (open / merged / closed), reviewers, approval count, CI status, merged-at timestamp. The review-cycle artifact." },
    { name: "ci_pipelines", label: "CI/CD Pipeline", desc: "Pipeline definition (build / test / scan / deploy): source_repository reference, trigger conditions (push / PR / scheduled / manual), stage configuration, secrets binding. Scope-qualified vs DI data-pipelines." },
    { name: "ci_pipeline_runs", label: "CI/CD Pipeline Run", desc: "Single execution of a ci_pipeline: triggering commit, start/end timestamps, duration, overall status (success / failed / cancelled), per-stage results, runner. The unit for DORA deploy-frequency and change-fail-rate metrics." },
    { name: "build_artifacts", label: "Build Artifact", desc: "Binary, container image, package, or other output produced by a ci_pipeline_run: type (docker_image / npm_package / jar / binary / archive), version, registry URL, SBOM reference, signed flag. Promotion source for deployments." },
    { name: "software_deployments", label: "Software Deployment", desc: "Release event of a build_artifact to a target environment (dev / staging / prod): deployer, started/finished timestamps, status, rollback flag, target environment, change-ticket reference. Scope-qualified vs `device_deployment_results` (UEM)." },
    { name: "value_stream_metrics", label: "Value Stream Metric", desc: "DORA-style or VSM-style measurement per repository or product: lead time for changes, deployment frequency, MTTR, change failure rate, computed over a window. Derived/computed; distinct from raw ci_pipeline_runs." },
  ]},
  { code: "WEB-CONTOPS", masters: [
    { name: "content_audits", label: "Content Audit", desc: "Inventory + quality assessment of web content: page count, health score (WCAG accessibility, SEO health, broken links, brand-voice compliance), staleness, orphaned pages. Scheduled or on-demand scan against a website corpus." },
    { name: "web_content_inventory_records", label: "Web Content Inventory Record", desc: "Per-page tracking record across web properties: URL/slug, status (published / draft / retired), last-modified, owner, publish date, review cadence, lifecycle stage. CMS-agnostic counterpart to HCMS `content_entries`." },
    { name: "accessibility_scan_findings", label: "Accessibility Scan Finding", desc: "WCAG violation detected by automated scanning (color contrast, alt text, heading hierarchy, interactive-element labels): severity, guideline reference, affected element selector, remediation steps, pages affected. Siteimprove / AudioEye / Acrolinx output." },
    { name: "broken_link_findings", label: "Broken Link Finding", desc: "HTTP 404 / timeout / redirect-chain detected by link audit: source URL, target URL, status code, first-detected date, affected content count. High-friction signal across multi-vendor properties." },
    { name: "technical_seo_findings", label: "Technical SEO Finding", desc: "Crawl-based SEO issue: meta robots block, missing canonical, duplicate content, page-speed bottleneck, sitemap misconfiguration, structured-data error. Lumar / Conductor / Siteimprove output. Distinct from keyword/topical SEO (MA-owned)." },
    { name: "brand_voice_violations", label: "Brand Voice Violation", desc: "Style/tone deviation from brand guidelines detected by AI/pattern-matching (unauthorized terminology, off-brand phrasing, regulatory language drift): violation type, recommended fix, detected date. Acrolinx primary, GatherContent secondary." },
    { name: "content_lifecycle_plans", label: "Content Lifecycle Plan", desc: "Editorial calendar + governance rule set for content retirement/refresh: content reference, review-due date, owner, refresh frequency, sunset date, successor content. Ties to editorial workflows and triggers remediation tasks when content misses deadlines." },
  ]},
];

// Resolve domain ids
const domainsRows = await get(`/domains?select=id,domain_code&limit=10000`);
const domainId = new Map(domainsRows.map(x => [String(x.domain_code), Number(x.id)]));

// Build data_object insert payload
const dataObjectPayload: Row[] = [];
const allMasterNames = new Set<string>();
for (const p of proposals) {
  for (const m of p.masters) {
    if (allMasterNames.has(m.name)) {
      throw new Error(`Duplicate name in proposals: ${m.name} appears under multiple domains`);
    }
    allMasterNames.add(m.name);
    dataObjectPayload.push({ data_object_name: m.name, display_label: m.label, description: m.desc });
  }
}

const existing = await get(`/data_objects?select=id,data_object_name&data_object_name=in.(${[...allMasterNames].join(",")})`);
const existingNames = new Set(existing.map(r => String(r.data_object_name)));
const toInsertDOs = dataObjectPayload.filter(d => !existingNames.has(String(d.data_object_name)));

console.log(`Section 1 - data_objects: ${dataObjectPayload.length} planned, ${toInsertDOs.length} to insert (${dataObjectPayload.length - toInsertDOs.length} already exist).`);
if (existingNames.size > 0) console.log(`  pre-existing (will be linked, not re-inserted): ${[...existingNames].join(", ")}`);
if (toInsertDOs.length > 0) await insert("/data_objects", toInsertDOs);

// Re-read data_object ids for ddo wiring
const allDOs = await get(`/data_objects?select=id,data_object_name&data_object_name=in.(${[...allMasterNames].join(",")})`);
const doId = new Map(allDOs.map(x => [String(x.data_object_name), Number(x.id)]));

// domain_data_objects (master rows; idempotent on (domain, data_object, role))
const existingDdoRows = await get(`/domain_data_objects?select=domain_id,data_object_id,role&limit=20000`);
const ddoKey = (d: number, o: number, r: string) => `${d}:${o}:${r}`;
const existingDdos = new Set(existingDdoRows.map(r => ddoKey(Number(r.domain_id), Number(r.data_object_id), String(r.role))));

const ddoPayload: Row[] = [];
for (const p of proposals) {
  const did = domainId.get(p.code);
  if (did === undefined) { console.log(`  skip ${p.code}: domain not found`); continue; }
  for (const m of p.masters) {
    const oid = doId.get(m.name);
    if (oid === undefined) {
      if (!APPLY) { console.log(`  [DRY] ${p.code}/${m.name} ddo: data_object pending insert`); continue; }
      throw new Error(`data_object missing after insert: ${m.name}`);
    }
    if (existingDdos.has(ddoKey(did, oid, "master"))) continue;
    ddoPayload.push({ domain_id: did, data_object_id: oid, role: "master", notes: "Phase-B Lite batch 3 - industry-vertical + DevOps/VIS/WEB; trigger_events + handoffs deferred" });
  }
}

console.log(`\nSection 2 - domain_data_objects (master): ${ddoPayload.length} to insert.`);
if (ddoPayload.length > 0) await insert("/domain_data_objects", ddoPayload);

console.log(`\nDone (${APPLY ? "live" : "dry run"}).`);
