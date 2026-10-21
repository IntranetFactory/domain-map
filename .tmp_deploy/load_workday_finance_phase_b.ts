#!/usr/bin/env bun
// Finance cluster Phase B: data_objects + domain_data_objects + handoffs for
// ERP-FIN (65), EPM (66), AP-AUTO (29), SUP-LIFE (28), EXPENSE (67), PSA (68), LCAP (37).
// Idempotent. All record_status defaults to "new".

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

const ERPFIN = 65, EPM = 66, AP_AUTO = 29, SUP_LIFE = 28, EXPENSE = 67, PSA = 68, LCAP = 37,
      PAYROLL = 55, COMP = 60, BEN = 61, S2P = 27, CLM = 26, HCM = 54, SWP = 100;

const dataObjects = [
  // ERP-FIN (10)
  { data_object_name: "journal_entries", singular_label: "Journal Entry", plural_label: "Journal Entries", display_label: "Journal Entry", description: "Individual posting to the general ledger: header (date, source, period) plus balanced debit / credit lines tagged with GL account, cost center, dimension members. The atomic accounting unit." },
  { data_object_name: "general_ledger_accounts", singular_label: "GL Account", plural_label: "GL Accounts", display_label: "GL Account", description: "Account in the chart of accounts: code, name, type (asset/liability/equity/revenue/expense), normal balance, statutory mapping. The schema of the books." },
  { data_object_name: "cost_centers", singular_label: "Cost Center", plural_label: "Cost Centers", display_label: "Cost Center", description: "Organisational unit for cost allocation: name, code, manager, hierarchy, currency. Drives variance reporting and project / departmental P&L. A near-universal foreign key in finance and payroll." },
  { data_object_name: "legal_entities", singular_label: "Legal Entity", plural_label: "Legal Entities", display_label: "Legal Entity", description: "Statutory company: legal name, registration, jurisdiction, currency, fiscal calendar. Books are kept per legal entity; consolidation rolls them up." },
  { data_object_name: "accounting_periods", singular_label: "Accounting Period", plural_label: "Accounting Periods", display_label: "Accounting Period", description: "Time bucket within a fiscal year: status (open / soft_close / closed / locked), period dates, calendar/fiscal alignment. Drives period-end close orchestration." },
  { data_object_name: "bank_accounts", singular_label: "Bank Account", plural_label: "Bank Accounts", display_label: "Bank Account", description: "Owned cash or operating account at a bank: institution, account number, IBAN/routing, currency, intended use (operating, payroll, AP, trust). Drives cash management and payment runs." },
  { data_object_name: "cash_transactions", singular_label: "Cash Transaction", plural_label: "Cash Transactions", display_label: "Cash Transaction", description: "Posting to a bank_account: incoming receipt, outgoing payment, transfer, fee. Drives reconciliation against journal_entries and bank statements." },
  { data_object_name: "fixed_assets", singular_label: "Fixed Asset", plural_label: "Fixed Assets", display_label: "Fixed Asset", description: "Capitalised property/plant/equipment record: acquisition date, cost basis, useful life, depreciation method, location, status. Distinct from operational hardware_assets (CMDB/HAM)." },
  { data_object_name: "asset_depreciation_schedules", singular_label: "Depreciation Schedule", plural_label: "Depreciation Schedules", display_label: "Depreciation Schedule", description: "Per-fixed_asset per-book depreciation calculation timeline: period-by-period depreciation expense and accumulated depreciation. Drives the monthly depreciation journal_entries." },
  { data_object_name: "intercompany_transactions", singular_label: "Intercompany Transaction", plural_label: "Intercompany Transactions", display_label: "Intercompany Transaction", description: "Transaction between two legal_entities of the same group: intercompany invoice, transfer, allocation. Drives elimination entries at consolidation." },

  // AP-AUTO (2 new — invoices already exists, mastered by S2P)
  { data_object_name: "invoice_matches", singular_label: "Invoice Match", plural_label: "Invoice Matches", display_label: "Invoice Match", description: "Three-way-match outcome record: invoice, purchase_order, goods_receipt with line-level match status (matched / quantity_variance / price_variance / no_po / exception). Drives auto-post or exception-queue routing." },
  { data_object_name: "payment_runs", singular_label: "Payment Run", plural_label: "Payment Runs", display_label: "Payment Run", description: "Scheduled batch of supplier payments grouped by bank_account, currency, payment method (ACH, wire, check, SEPA). Drives the AP payment cycle." },

  // SUP-LIFE (4)
  { data_object_name: "suppliers", singular_label: "Supplier", plural_label: "Suppliers", display_label: "Supplier", description: "Vendor master record: legal name, tax id, addresses, payment terms, contacts, currency, statuses, risk profile. The supplier-side analogue to the customer master." },
  { data_object_name: "supplier_onboardings", singular_label: "Supplier Onboarding", plural_label: "Supplier Onboardings", display_label: "Supplier Onboarding", description: "Onboarding workflow instance for a new supplier: invitation, registration form, document collection (W-9, banking, insurance, compliance attestations), approval chain." },
  { data_object_name: "supplier_qualifications", singular_label: "Supplier Qualification", plural_label: "Supplier Qualifications", display_label: "Supplier Qualification", description: "Risk and compliance profile for an active supplier: sanctions screening, financial-health rating, ESG scoring, ISO/SOC certifications, cyber-risk assessment. Periodically reassessed." },
  { data_object_name: "supplier_scorecards", singular_label: "Supplier Scorecard", plural_label: "Supplier Scorecards", display_label: "Supplier Scorecard", description: "KPI-weighted performance rating of a supplier over a period: on-time delivery, quality, responsiveness, savings delivered. Drives tier preference in sourcing decisions." },

  // EXPENSE (6)
  { data_object_name: "expense_reports", singular_label: "Expense Report", plural_label: "Expense Reports", display_label: "Expense Report", description: "Employee-submitted bundle of expense_lines for a trip, project, or period. Carries submission status, approval chain, reimbursement / payroll-payback routing." },
  { data_object_name: "expense_lines", singular_label: "Expense Line", plural_label: "Expense Lines", display_label: "Expense Line", description: "Individual line on an expense_report: date, merchant, category, amount, tax, billable flag, receipt reference. The atomic expense unit feeding GL coding." },
  { data_object_name: "corporate_cards", singular_label: "Corporate Card", plural_label: "Corporate Cards", display_label: "Corporate Card", description: "Issued corporate card record: issuer, last four, cardholder, account, status, controls (per-transaction limits, MCC blocks). Feeds the card_transactions stream." },
  { data_object_name: "card_transactions", singular_label: "Card Transaction", plural_label: "Card Transactions", display_label: "Card Transaction", description: "Authorisation / settlement record from a corporate_card feed: merchant, MCC, amount, FX, posting date. Matched to expense_lines for full audit trail." },
  { data_object_name: "expense_policies", singular_label: "Expense Policy", plural_label: "Expense Policies", display_label: "Expense Policy", description: "Configurable rule: per-diem caps, category limits, mandatory receipts, mileage rates, FX rounding. Applied at expense_line entry to flag violations." },
  { data_object_name: "travel_bookings", singular_label: "Travel Booking", plural_label: "Travel Bookings", display_label: "Travel Booking", description: "Imported itinerary from a travel-booking partner (TravelPerk, Egencia, BCD) — air, hotel, ground. Pre-trip approval and post-trip expense reconciliation." },

  // PSA (5)
  { data_object_name: "projects", singular_label: "Project", plural_label: "Projects", display_label: "Project", description: "Client-facing engagement: scope, contract, start/end, billing type (T&M / fixed_fee / milestone / retainer), revenue recognition method, project manager, billing entity." },
  { data_object_name: "project_tasks", singular_label: "Project Task", plural_label: "Project Tasks", display_label: "Project Task", description: "Decomposed unit of work inside a project: scope, dependencies, estimated hours, status. Drives time entry tagging and Earned Value calculation." },
  { data_object_name: "project_assignments", singular_label: "Project Assignment", plural_label: "Project Assignments", display_label: "Project Assignment", description: "Worker-to-project allocation with role, bill rate, cost rate, planned hours, period. Drives utilisation and resource-availability reporting." },
  { data_object_name: "project_billing_milestones", singular_label: "Project Billing Milestone", plural_label: "Project Billing Milestones", display_label: "Project Billing Milestone", description: "Discrete billing trigger inside a project: milestone definition, amount, trigger condition, status. Drives revenue recognition and customer invoicing on fixed-fee engagements." },
  { data_object_name: "revenue_recognition_records", singular_label: "Revenue Recognition Record", plural_label: "Revenue Recognition Records", display_label: "Revenue Recognition Record", description: "Per-period rev-rec calculation per performance obligation under ASC 606 / IFRS 15: deferred revenue, recognised revenue, contract-asset / -liability movement. Drives the rev-rec journal_entries." },

  // LCAP (3)
  { data_object_name: "extend_apps", singular_label: "Low-Code App", plural_label: "Low-Code Apps", display_label: "Low-Code App", description: "User-built application on the low-code platform: name, owner, deployment, permissions, status. The unit of LCAP delivery." },
  { data_object_name: "extend_business_objects", singular_label: "Low-Code Business Object", plural_label: "Low-Code Business Objects", display_label: "Low-Code Business Object", description: "Custom domain object defined within an LCAP app: schema, fields, references, validation rules, security model. The data layer of the LCAP delivery." },
  { data_object_name: "extend_workflows", singular_label: "Low-Code Workflow", plural_label: "Low-Code Workflows", display_label: "Low-Code Workflow", description: "Business process definition inside an LCAP app: states, transitions, role-based steps, integrations, escalations. The behaviour layer of the LCAP delivery." },
];

// NOTE: revenue_recognition_records already exists in catalog. The dedupe in main() handles this.

type DDOSpec = { domain_id: number; data_object_name: string; role: "master" | "contributor" | "consumer" | "derived"; notes: string };
const domainDataObjects: DDOSpec[] = [
  // ERP-FIN masters
  { domain_id: ERPFIN, data_object_name: "journal_entries", role: "master", notes: "" },
  { domain_id: ERPFIN, data_object_name: "general_ledger_accounts", role: "master", notes: "" },
  { domain_id: ERPFIN, data_object_name: "cost_centers", role: "master", notes: "ERP-FIN masters the canonical cost-center hierarchy; HCM and EPM contribute org-alignment and budget-mapping slices respectively." },
  { domain_id: ERPFIN, data_object_name: "legal_entities", role: "master", notes: "" },
  { domain_id: ERPFIN, data_object_name: "accounting_periods", role: "master", notes: "" },
  { domain_id: ERPFIN, data_object_name: "bank_accounts", role: "master", notes: "" },
  { domain_id: ERPFIN, data_object_name: "cash_transactions", role: "master", notes: "" },
  { domain_id: ERPFIN, data_object_name: "fixed_assets", role: "master", notes: "Financial-asset master; distinct from operational hardware_assets in ITAM/CMDB." },
  { domain_id: ERPFIN, data_object_name: "asset_depreciation_schedules", role: "master", notes: "" },
  { domain_id: ERPFIN, data_object_name: "intercompany_transactions", role: "master", notes: "" },
  { domain_id: ERPFIN, data_object_name: "revenue_recognition_records", role: "master", notes: "" },
  // ERP-FIN contributors / consumers
  { domain_id: HCM, data_object_name: "cost_centers", role: "contributor", notes: "HCM contributes the org-unit alignment slice — which workers / positions roll up to which cost_center." },
  { domain_id: EPM, data_object_name: "cost_centers", role: "contributor", notes: "EPM contributes the planning-dimension alignment slice — how cost_centers map to planning hierarchies for variance reporting." },

  // EPM additions (already has masters)
  { domain_id: EPM, data_object_name: "journal_entries", role: "consumer", notes: "EPM consumes period-actuals from ERP-FIN for variance reporting against budgets / forecasts." },

  // AP-AUTO masters
  { domain_id: AP_AUTO, data_object_name: "invoice_matches", role: "master", notes: "" },
  { domain_id: AP_AUTO, data_object_name: "payment_runs", role: "master", notes: "" },
  { domain_id: AP_AUTO, data_object_name: "invoices", role: "contributor", notes: "AP-AUTO contributes the AP-side processing slice (OCR, three-way-match outcome, exception state) on supplier invoices mastered by S2P." },

  // SUP-LIFE masters
  { domain_id: SUP_LIFE, data_object_name: "suppliers", role: "master", notes: "" },
  { domain_id: SUP_LIFE, data_object_name: "supplier_onboardings", role: "master", notes: "" },
  { domain_id: SUP_LIFE, data_object_name: "supplier_qualifications", role: "master", notes: "" },
  { domain_id: SUP_LIFE, data_object_name: "supplier_scorecards", role: "master", notes: "" },
  // SUP-LIFE consumers from cross-cluster
  { domain_id: S2P, data_object_name: "suppliers", role: "consumer", notes: "S2P consumes the supplier master to drive sourcing, purchasing, and AP." },
  { domain_id: AP_AUTO, data_object_name: "suppliers", role: "consumer", notes: "AP-AUTO consumes the supplier master for invoice routing and payment." },

  // EXPENSE masters
  { domain_id: EXPENSE, data_object_name: "expense_reports", role: "master", notes: "" },
  { domain_id: EXPENSE, data_object_name: "expense_lines", role: "master", notes: "" },
  { domain_id: EXPENSE, data_object_name: "corporate_cards", role: "master", notes: "" },
  { domain_id: EXPENSE, data_object_name: "card_transactions", role: "master", notes: "" },
  { domain_id: EXPENSE, data_object_name: "expense_policies", role: "master", notes: "" },
  { domain_id: EXPENSE, data_object_name: "travel_bookings", role: "master", notes: "" },
  // EXPENSE consumers
  { domain_id: ERPFIN, data_object_name: "expense_reports", role: "consumer", notes: "ERP-FIN consumes approved expense_reports for journal entry posting and reimbursement routing." },
  { domain_id: PAYROLL, data_object_name: "expense_reports", role: "consumer", notes: "PAYROLL consumes payroll-routed reimbursable expense_reports for the next pay_run." },

  // PSA masters
  { domain_id: PSA, data_object_name: "projects", role: "master", notes: "" },
  { domain_id: PSA, data_object_name: "project_tasks", role: "master", notes: "" },
  { domain_id: PSA, data_object_name: "project_assignments", role: "master", notes: "" },
  { domain_id: PSA, data_object_name: "project_billing_milestones", role: "master", notes: "" },
  { domain_id: PSA, data_object_name: "revenue_recognition_records", role: "contributor", notes: "PSA contributes project-level rev-rec records under ASC 606 percentage-of-completion or milestone billing; ERP-FIN consolidates into the books." },
  // PSA consumers
  { domain_id: ERPFIN, data_object_name: "projects", role: "consumer", notes: "ERP-FIN consumes project codes for cost allocation, billing, and rev-rec." },

  // LCAP masters
  { domain_id: LCAP, data_object_name: "extend_apps", role: "master", notes: "" },
  { domain_id: LCAP, data_object_name: "extend_business_objects", role: "master", notes: "" },
  { domain_id: LCAP, data_object_name: "extend_workflows", role: "master", notes: "" },
];

type HandoffSpec = {
  source_domain_id: number; target_domain_id: number;
  data_object_name: string; trigger_event: string;
  integration_pattern: "event_stream" | "api_call" | "batch_sync" | "manual_handoff" | "file_drop";
  friction_level: "high" | "medium" | "low";
  description: string;
};
const handoffs: HandoffSpec[] = [
  { source_domain_id: AP_AUTO, target_domain_id: ERPFIN, data_object_name: "payment_runs", trigger_event: "payment_run.executed", integration_pattern: "event_stream", friction_level: "low", description: "Payment run produces cash_transactions and clearing journal_entries that post to ERP-FIN GL." },
  { source_domain_id: AP_AUTO, target_domain_id: ERPFIN, data_object_name: "invoice_matches", trigger_event: "invoice.matched", integration_pattern: "event_stream", friction_level: "low", description: "Three-way match success posts the supplier invoice to AP subledger; exceptions queue for review." },
  { source_domain_id: SUP_LIFE, target_domain_id: S2P, data_object_name: "suppliers", trigger_event: "supplier.approved", integration_pattern: "event_stream", friction_level: "low", description: "Supplier onboarding completion makes the supplier eligible for sourcing events and purchase orders." },
  { source_domain_id: SUP_LIFE, target_domain_id: AP_AUTO, data_object_name: "suppliers", trigger_event: "supplier.bank_changed", integration_pattern: "api_call", friction_level: "high", description: "Supplier bank-account changes carry significant fraud risk; identity-reconciliation pattern. Strong vendor-master controls and out-of-band verification gate the propagation to AP-AUTO." },
  { source_domain_id: EXPENSE, target_domain_id: ERPFIN, data_object_name: "expense_reports", trigger_event: "expense_report.approved", integration_pattern: "event_stream", friction_level: "low", description: "Approved expense_reports post accrual journal_entries to ERP-FIN; reimbursement routed via AP or payroll based on policy." },
  { source_domain_id: EXPENSE, target_domain_id: AP_AUTO, data_object_name: "expense_reports", trigger_event: "expense_report.approved", integration_pattern: "event_stream", friction_level: "low", description: "Expense reimbursement via AP rather than payroll: the approved expense_report becomes a supplier_invoice paid in the next payment_run." },
  { source_domain_id: PSA, target_domain_id: ERPFIN, data_object_name: "revenue_recognition_records", trigger_event: "revenue.recognised", integration_pattern: "event_stream", friction_level: "low", description: "Project rev-rec posts to GL via journal_entries; percentage-of-completion or milestone trigger dependent." },
  { source_domain_id: PSA, target_domain_id: S2P, data_object_name: "purchase_requisitions", trigger_event: "project.staffing_required", integration_pattern: "api_call", friction_level: "low", description: "Project staff-augmentation demand triggers a contingent-worker requisition routed through S2P / VMS." },
  { source_domain_id: ERPFIN, target_domain_id: EPM, data_object_name: "journal_entries", trigger_event: "period.closed", integration_pattern: "batch_sync", friction_level: "medium", description: "Period close pushes actuals into EPM for variance analysis against budgets / forecasts / scenarios. Mapping between GL accounts and planning hierarchies often drifts cycle-to-cycle." },
];

async function main() {
  console.log("=== data_objects ===");
  const existingDO = await get("/data_objects?select=id,data_object_name&limit=10000");
  const existingNames = new Set(existingDO.map(r => String(r.data_object_name)));
  const missingDO = dataObjects.filter(d => !existingNames.has(d.data_object_name));
  if (missingDO.length > 0) {
    console.log(`  inserting ${missingDO.length} new data_objects`);
    await insert("/data_objects", missingDO);
  } else console.log("  none missing");
  const allDO = await get("/data_objects?select=id,data_object_name&limit=10000");
  const doIdByName = new Map<string, number>();
  for (const r of allDO) doIdByName.set(String(r.data_object_name), Number(r.id));

  console.log("\n=== domain_data_objects ===");
  const existingDDO = await get("/domain_data_objects?select=domain_id,data_object_id,role&limit=10000");
  const ddoKey = (d: number, o: number, r: string) => `${d}:${o}:${r}`;
  const existDDOSet = new Set(existingDDO.map(r => ddoKey(Number(r.domain_id), Number(r.data_object_id), String(r.role))));
  const newDDORows: Row[] = [];
  for (const spec of domainDataObjects) {
    const oid = doIdByName.get(spec.data_object_name);
    if (!oid) throw new Error(`data_object missing: ${spec.data_object_name}`);
    const k = ddoKey(spec.domain_id, oid, spec.role);
    if (existDDOSet.has(k)) continue;
    newDDORows.push({ domain_id: spec.domain_id, data_object_id: oid, role: spec.role, notes: spec.notes });
  }
  if (newDDORows.length > 0) {
    console.log(`  inserting ${newDDORows.length} new domain_data_objects`);
    await insert("/domain_data_objects", newDDORows);
  } else console.log("  none new");

  console.log("\n=== cross_domain_handoffs ===");
  const existingCDH = await get("/cross_domain_handoffs?select=source_domain_id,target_domain_id,data_object_id,trigger_event&limit=10000");
  const cdhKey = (s: number, t: number, o: number, e: string) => `${s}:${t}:${o}:${e}`;
  const existCDHSet = new Set(existingCDH.map(r => cdhKey(Number(r.source_domain_id), Number(r.target_domain_id), Number(r.data_object_id), String(r.trigger_event))));
  const newCDHRows: Row[] = [];
  for (const h of handoffs) {
    const oid = doIdByName.get(h.data_object_name);
    if (!oid) throw new Error(`data_object missing for handoff: ${h.data_object_name}`);
    const k = cdhKey(h.source_domain_id, h.target_domain_id, oid, h.trigger_event);
    if (existCDHSet.has(k)) continue;
    newCDHRows.push({
      source_domain_id: h.source_domain_id, target_domain_id: h.target_domain_id,
      data_object_id: oid, trigger_event: h.trigger_event,
      integration_pattern: h.integration_pattern, friction_level: h.friction_level,
      description: h.description, notes: "",
    });
  }
  if (newCDHRows.length > 0) {
    console.log(`  inserting ${newCDHRows.length} new cross_domain_handoffs`);
    await insert("/cross_domain_handoffs", newCDHRows);
  } else console.log("  none new");

  // Final
  const counts: Record<string, number> = {};
  for (const [name, id] of Object.entries({ ERPFIN, EPM, AP_AUTO, SUP_LIFE, EXPENSE, PSA, LCAP })) {
    const r = await get(`/domain_data_objects?domain_id=eq.${id}&role=eq.master&select=data_object_id`);
    counts[name] = r.length;
  }
  console.log("\n=== Master counts ===");
  console.log(JSON.stringify(counts, null, 2));
}

await main();
